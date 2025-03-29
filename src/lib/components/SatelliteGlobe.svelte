<!-- src/lib/components/SatelliteGlobe.svelte -->
<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import * as THREE from 'three';
    import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
    import * as satellite from 'satellite.js';

    export let radiationRiskLevel: string = 'None';

    let isLoadingTLE = true;
    let tleError: string | null = null;
    let satelliteObjects: SatelliteObject[] = [];

    let container: HTMLDivElement;
    let animationFrameId: number;
    let cleanupScene: () => void = () => {};

    const EARTH_RADIUS_SCENE = 5;
    const REAL_EARTH_RADIUS_KM = 6371;
    const SCALE_FACTOR = REAL_EARTH_RADIUS_KM / EARTH_RADIUS_SCENE;

    const DEFAULT_COLOR_ISS = 0xffaa00;
    const DEFAULT_COLOR_OTHER = 0x00aaff;
    const HAZARD_COLOR = 0xff00ff;
    const TRACK_COLOR = 0x888888; // Цвет для линии трека (серый)

    interface FetchedTleData {
        name: string;
        tle1: string;
        tle2: string;
    }

    interface SatelliteObject {
        name: string;
        satrec: satellite.SatRec;
        mesh: THREE.Mesh;
        defaultColor: number;
        trackLine?: THREE.Line; // --- ДОБАВЛЕНО: Поле для линии трека ---
    }

    async function loadTLEData(): Promise<FetchedTleData[]> {
        console.log('[SatelliteGlobe] Fetching TLE from API...');
        try {
            const apiUrl = '/api/tle?t=' + Date.now(); // Добавляем cache-busting
            const response = await fetch(apiUrl);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Failed to fetch TLE: ${response.status}`);
            }
            const data: FetchedTleData[] = await response.json();
             if (!Array.isArray(data)) {
                throw new Error('Invalid TLE data format received from API.');
             }
            console.log('[SatelliteGlobe] TLE data fetched successfully:', data);
            return data;
        } catch (error: any) {
            console.error('[SatelliteGlobe] Error fetching TLE data:', error);
            tleError = error.message;
            isLoadingTLE = false;
            throw error;
        }
    }

    // --- НОВАЯ ФУНКЦИЯ: Расчет точек для трека ---
    function calculateTrackPoints(satrec: satellite.SatRec, startTime: Date): THREE.Vector3[] {
        const points: THREE.Vector3[] = [];
        const minutesBefore = 45; // Сколько минут назад
        const minutesAfter = 45;  // Сколько минут вперед
        const stepSeconds = 60;   // Шаг расчета в секундах (1 минута)

        const totalSteps = (minutesBefore + minutesAfter) * (60 / stepSeconds);
        const startTimeMs = startTime.getTime();

        for (let i = -minutesBefore * (60 / stepSeconds); i <= minutesAfter * (60 / stepSeconds); i++) {
            const trackTime = new Date(startTimeMs + i * stepSeconds * 1000);
            try {
                const gmst = satellite.gstime(trackTime);
                const positionAndVelocity = satellite.propagate(satrec, trackTime);
                const positionEci = positionAndVelocity.position as satellite.EciVec3<number>;

                if (positionEci) {
                    const geodetic = satellite.eciToGeodetic(positionEci, gmst);
                    const latitude = geodetic.latitude;
                    const longitude = geodetic.longitude;
                    const heightKm = geodetic.height;
                    const radiusScene = EARTH_RADIUS_SCENE + heightKm / SCALE_FACTOR;

                    const sceneX = radiusScene * Math.cos(latitude) * Math.cos(longitude);
                    const sceneY = radiusScene * Math.sin(latitude);
                    const sceneZ = -radiusScene * Math.cos(latitude) * Math.sin(longitude);

                    points.push(new THREE.Vector3(sceneX, sceneY, sceneZ));
                }
            } catch (e) {
                // Игнорируем ошибки пропагации для точек трека (например, decay)
            }
        }
        return points;
    }
    // --- КОНЕЦ НОВОЙ ФУНКЦИИ ---


    function initializeScene(tleData: FetchedTleData[]) {
        if (!container) return;
        console.log('[SatelliteGlobe] Initializing Three.js scene...');
        isLoadingTLE = false;

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
        camera.position.z = EARTH_RADIUS_SCENE * 3;

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        container.appendChild(renderer.domElement);

        scene.add(new THREE.AmbientLight(0x666666));
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 10, 10);
        scene.add(directionalLight);

        const earthGeometry = new THREE.SphereGeometry(EARTH_RADIUS_SCENE, 64, 32);
        const textureLoader = new THREE.TextureLoader();
        const earthMaterial = new THREE.MeshPhongMaterial({
             map: textureLoader.load('/textures/earth_daymap.jpg'),
        });
        const earthMesh = new THREE.Mesh(earthGeometry, earthMaterial);
        scene.add(earthMesh);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.minDistance = EARTH_RADIUS_SCENE * 1.2;
        controls.maxDistance = EARTH_RADIUS_SCENE * 10;

        satelliteObjects = [];
        const initializationTime = new Date(); // Фиксируем время для расчета трека

        tleData.forEach(tle => {
             try {
                 const satrec = satellite.twoline2satrec(tle.tle1, tle.tle2);
                 const satGeometry = new THREE.SphereGeometry(0.08, 10, 10);
                 const satColor = tle.name.includes('ISS') ? DEFAULT_COLOR_ISS : DEFAULT_COLOR_OTHER;
                 const satMaterial = new THREE.MeshBasicMaterial({ color: satColor });
                 const satMesh = new THREE.Mesh(satGeometry, satMaterial);

                 // --- СОЗДАНИЕ ТРЕКА ---
                 let trackLine: THREE.Line | undefined;
                 const trackPoints = calculateTrackPoints(satrec, initializationTime);
                 if (trackPoints.length > 1) {
                     const trackGeometry = new THREE.BufferGeometry().setFromPoints(trackPoints);
                     const trackMaterial = new THREE.LineBasicMaterial({
                         color: TRACK_COLOR,
                         transparent: true,
                         opacity: 0.5 // Делаем трек полупрозрачным
                        });
                     trackLine = new THREE.Line(trackGeometry, trackMaterial);
                     scene.add(trackLine);
                     console.log(`[SatelliteGlobe] Created track for: ${tle.name} with ${trackPoints.length} points.`);
                 } else {
                    console.warn(`[SatelliteGlobe] Could not generate enough track points for: ${tle.name}`);
                 }
                 // --- КОНЕЦ СОЗДАНИЯ ТРЕКА ---

                 satelliteObjects.push({
                      name: tle.name,
                      satrec,
                      mesh: satMesh,
                      defaultColor: satColor,
                      trackLine: trackLine // Сохраняем ссылку на линию трека
                    });
                 scene.add(satMesh);
                 console.log(`[SatelliteGlobe] Created 3D object for: ${tle.name}`);
             } catch (error) {
                 console.error(`[SatelliteGlobe] Error initializing satellite ${tle.name}:`, error);
             }
         });

        function updateSatellitePositions() {
            const now = new Date();
            const gmst = satellite.gstime(now);
            const highLatitudeThreshold = 50 * (Math.PI / 180); // Сниженный порог
            const isRadiationHazardous = ['High', 'Severe', 'Extreme'].includes(radiationRiskLevel);

            satelliteObjects.forEach(sat => {
                if (!sat.mesh.visible) return;
                try {
                    const positionAndVelocity = satellite.propagate(sat.satrec, now);
                    const positionEci = positionAndVelocity.position as satellite.EciVec3<number>;
                    if (!positionEci) return;

                    const geodetic = satellite.eciToGeodetic(positionEci, gmst);
                    const latitude = geodetic.latitude;
                    const longitude = geodetic.longitude;
                    const heightKm = geodetic.height;
                    const radiusScene = EARTH_RADIUS_SCENE + heightKm / SCALE_FACTOR;
                    const sceneX = radiusScene * Math.cos(latitude) * Math.cos(longitude);
                    const sceneY = radiusScene * Math.sin(latitude);
                    const sceneZ = -radiusScene * Math.cos(latitude) * Math.sin(longitude);
                    sat.mesh.position.set(sceneX, sceneY, sceneZ);

                    let targetColorHex = sat.defaultColor;
                    const currentLatitudeAbs = Math.abs(latitude);
                    if (isRadiationHazardous && currentLatitudeAbs > highLatitudeThreshold) {
                         targetColorHex = HAZARD_COLOR;
                    }
                    if (sat.mesh.material instanceof THREE.MeshBasicMaterial) {
                         if (sat.mesh.material.color.getHex() !== targetColorHex) {
                             sat.mesh.material.color.setHex(targetColorHex);
                         }
                    }
                } catch (error: any) {
                    if (error.message.includes('decay')) {
                         if(sat.mesh.visible) console.warn(`Satellite ${sat.name} orbit decayed.`);
                         sat.mesh.visible = false;
                         if(sat.trackLine) sat.trackLine.visible = false; // Скрываем и трек
                    } else {
                        console.error(`Error propagating satellite ${sat.name}:`, error);
                        sat.mesh.visible = false;
                        if(sat.trackLine) sat.trackLine.visible = false; // Скрываем и трек
                    }
                }
            });
        }

        const animate = () => {
            animationFrameId = requestAnimationFrame(animate);
            updateSatellitePositions();
            controls.update();
            renderer.render(scene, camera);
        };
        animate();

         const handleResize = () => {
             if (!container || !renderer) return;
             camera.aspect = container.clientWidth / container.clientHeight;
             camera.updateProjectionMatrix();
             renderer.setSize(container.clientWidth, container.clientHeight);
         };
         window.addEventListener('resize', handleResize);

        // --- ОБНОВЛЕННАЯ Функция Очистки ---
        cleanupScene = () => {
            console.log('[SatelliteGlobe] Cleaning up Three.js scene...');
             if (animationFrameId) {
                 cancelAnimationFrame(animationFrameId);
                 animationFrameId = 0;
             }
             window.removeEventListener('resize', handleResize);
             controls?.dispose();

             earthGeometry?.dispose();
             earthMaterial?.map?.dispose();
             earthMaterial?.dispose();

             satelliteObjects.forEach(sat => {
                 sat.mesh?.geometry?.dispose();
                 if (sat.mesh?.material) {
                     if (Array.isArray(sat.mesh.material)) {
                         sat.mesh.material.forEach(material => material.dispose());
                     } else {
                         sat.mesh.material.dispose();
                     }
                 }
                 // --- ДОБАВЛЕНО: Очистка трека ---
                 if (sat.trackLine) {
                     sat.trackLine.geometry?.dispose();
                     if (Array.isArray(sat.trackLine.material)) {
                        sat.trackLine.material.forEach(material => material.dispose());
                     } else {
                         sat.trackLine.material?.dispose();
                     }
                     scene?.remove(sat.trackLine);
                 }
                 // --- КОНЕЦ ОЧИСТКИ ТРЕКА ---
                 scene?.remove(sat.mesh);
             });

             if (scene) {
                 scene.remove(earthMesh);
                 scene.remove(directionalLight);
                 const ambientLight = scene.children.find(c => c instanceof THREE.AmbientLight);
                 if (ambientLight) {
                      scene.remove(ambientLight);
                 }
             }

             renderer?.dispose();
             if (container && renderer?.domElement?.parentNode === container) {
                 container.removeChild(renderer.domElement);
             }

             satelliteObjects = [];
             console.log('Three.js scene cleanup appears complete.');
        };
        // --- КОНЕЦ ОБНОВЛЕННОЙ ФУНКЦИИ ОЧИСТКИ ---

    } // Конец initializeScene

    onMount(async () => {
        try {
            const fetchedTLEs = await loadTLEData();
            if (container && fetchedTLEs.length > 0) {
                initializeScene(fetchedTLEs);
            } else if(fetchedTLEs.length === 0 && !tleError) {
                tleError = "Target satellites TLE not found. Check API route logs.";
                isLoadingTLE = false;
            } else if (container && fetchedTLEs.length === 0 && tleError) {
                 isLoadingTLE = false;
            }
        } catch (error) {
            console.log('[SatelliteGlobe] onMount caught error from loadTLEData.');
        }
    });

    onDestroy(() => {
        cleanupScene();
    });

</script>

<!-- Шаблон остается прежним -->
<div bind:this={container} class="w-full h-96 border dark:border-gray-700 rounded-lg overflow-hidden relative bg-black">
    {#if isLoadingTLE}
        <div class="absolute inset-0 flex items-center justify-center bg-gray-500/50 text-white z-10">
             <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
             </svg>
            Loading TLE Data...
        </div>
    {:else if tleError}
        <div class="absolute inset-0 flex items-center justify-center bg-red-800/80 text-white p-4 text-center z-10">
            Error loading TLE: {tleError}
        </div>
    {/if}
    <!-- Canvas Three.js будет здесь -->
</div>

<style>
    div[bind\:this] {
         min-height: 400px;
     }
     .absolute { }
</style>