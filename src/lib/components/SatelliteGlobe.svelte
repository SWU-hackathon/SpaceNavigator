<!-- src/lib/components/SatelliteGlobe.svelte -->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import * as THREE from 'three';
	import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
	import * as satellite from 'satellite.js';

	// --- Props ---
	export let radiationRiskLevel: string = 'None';

	// --- Состояния Компонента ---
	let isLoadingTLE = true;
	let tleError: string | null = null;
	let hoveredSatelliteName: string | null = null;
	let labelInfo: { name: string; x: number; y: number } | null = null;

	// --- Переменная для DOM-контейнера ---
	let container: HTMLDivElement;

	// --- Константы и Настройки ---
	const EARTH_RADIUS_SCENE = 5;
	const REAL_EARTH_RADIUS_KM = 6371;
	const SCALE_FACTOR = REAL_EARTH_RADIUS_KM / EARTH_RADIUS_SCENE;
	const DEFAULT_COLOR_ISS = 0xffaa00; // Orange
	const DEFAULT_COLOR_OTHER = 0x00aaff; // Blue
	const HAZARD_COLOR = 0xff00ff; // Purple
	const TRACK_COLOR = 0x888888; // Grey

	// --- Типы Данных ---
	interface FetchedTleData { name: string; tle1: string; tle2: string; }
	interface SatelliteObject {
		name: string;
		satrec: satellite.SatRec;
		mesh: THREE.Mesh; // Снова используем Mesh
		defaultColor: number;
		trackLine?: THREE.Line;
	}

	// --- Функции ---
	async function loadTLEData(): Promise<FetchedTleData[]> {
		console.log('[SatelliteGlobe] Fetching TLE from API...');
		try {
			const apiUrl = '/api/tle?t=' + Date.now();
			const response = await fetch(apiUrl);
			if (!response.ok) {
				 let errorMsg = `Failed to fetch TLE: ${response.status}`;
				 try { const errorData = await response.json(); errorMsg = errorData.message || errorMsg; }
				 catch { /* ignore */ }
				 throw new Error(errorMsg);
			}
			const data: FetchedTleData[] = await response.json();
			 if (!Array.isArray(data)) { throw new Error('Invalid TLE data format received from API.'); }
			console.log('[SatelliteGlobe] TLE data fetched successfully:', data.length);
			return data;
		} catch (error: any) {
			console.error('[SatelliteGlobe] Error fetching TLE data:', error);
			tleError = error.message || "Unknown error fetching TLE.";
			isLoadingTLE = false;
			throw error;
		}
	}

	function calculateTrackPoints(satrec: satellite.SatRec, startTime: Date): THREE.Vector3[] {
        const points: THREE.Vector3[] = [];
        const minutesBefore = 45; const minutesAfter = 45; const stepSeconds = 60;
        const startTimeMs = startTime.getTime();
        for (let i = -minutesBefore * (60 / stepSeconds); i <= minutesAfter * (60 / stepSeconds); i++) {
            const trackTime = new Date(startTimeMs + i * stepSeconds * 1000);
            try {
                const gmst = satellite.gstime(trackTime);
                const posVel = satellite.propagate(satrec, trackTime);
                const posEci = posVel.position as satellite.EciVec3<number>;
                if (posEci) {
                    const geo = satellite.eciToGeodetic(posEci, gmst);
                    const r = EARTH_RADIUS_SCENE + geo.height / SCALE_FACTOR;
                    const x = r * Math.cos(geo.latitude) * Math.cos(geo.longitude);
                    const y = r * Math.sin(geo.latitude);
                    const z = -r * Math.cos(geo.latitude) * Math.sin(geo.longitude);
                    points.push(new THREE.Vector3(x, y, z));
                }
            } catch (e) { /* ignore */ }
        }
        return points;
    }

	// --- Инициализация и Очистка ---
	onMount(() => {
		if (!container) {
			console.error("[SatelliteGlobe] onMount: Container div not found!");
			isLoadingTLE = false;
			tleError = "Initialization error: Container not found.";
			return;
		}

		let isMounted = true;
		let animationFrameId: number;
		let rendererInstance: THREE.WebGLRenderer | null = null;
		let sceneInstance: THREE.Scene | null = null;
		let cameraInstance: THREE.PerspectiveCamera | null = null;
		let controlsInstance: OrbitControls | null = null;
		let localSatelliteObjects: SatelliteObject[] = [];
		let localSatelliteMeshes: THREE.Mesh[] = [];

		const raycaster = new THREE.Raycaster();
		const mouse = new THREE.Vector2();
		const labelPositionVector = new THREE.Vector3();

		function disposeObject(obj: any) {
			 if (!obj) return;
			 if (obj.geometry?.dispose) obj.geometry.dispose();
			 if (obj.material) {
				 if (Array.isArray(obj.material)) {
					 obj.material.forEach((material: any) => disposeMaterial(material));
				 } else {
					 disposeMaterial(obj.material);
				 }
			 }
		}

		function disposeMaterial(material: any) {
			 if (!material) return;
			 if (material.map?.dispose) material.map.dispose();
			 if (material.dispose) material.dispose();
		}

		function updateSatellitePositions(currentTime: Date) {
			if (!isMounted || !localSatelliteObjects || localSatelliteObjects.length === 0) return;
			const gmst = satellite.gstime(currentTime);
			const highLat = 50 * (Math.PI / 180);
			const isHazard = ['High', 'Severe', 'Extreme'].includes(radiationRiskLevel);

			localSatelliteObjects.forEach(sat => {
				if (!sat.mesh.visible) return;
				try {
					const posVel = satellite.propagate(sat.satrec, currentTime);
					const posEci = posVel.position as satellite.EciVec3<number>;
					if (!posEci) return;
					const geo = satellite.eciToGeodetic(posEci, gmst);
					const r = EARTH_RADIUS_SCENE + geo.height / SCALE_FACTOR;
					const x = r * Math.cos(geo.latitude) * Math.cos(geo.longitude);
					const y = r * Math.sin(geo.latitude);
					const z = -r * Math.cos(geo.latitude) * Math.sin(geo.longitude);
					sat.mesh.position.set(x, y, z);
					let targetColor = sat.defaultColor;
					if (isHazard && Math.abs(geo.latitude) > highLat) { targetColor = HAZARD_COLOR; }
					const material = sat.mesh.material as THREE.MeshBasicMaterial;
					if (material?.color && material.color.getHex() !== targetColor) {
						 material.color.setHex(targetColor);
					}
				} catch (error: any) {
					 if (error.message.includes('decay')) {
						 if(sat.mesh.visible) console.warn(`Satellite ${sat.name} orbit decayed.`);
						 sat.mesh.visible = false; if(sat.trackLine) sat.trackLine.visible = false;
					 } else {
						 console.error(`Error propagating sat ${sat.name}:`, error);
						 sat.mesh.visible = false; if(sat.trackLine) sat.trackLine.visible = false;
					 }
				 }
			});
		}

		function animate() {
			if (!isMounted || !rendererInstance || !sceneInstance || !cameraInstance) {
				 if(animationFrameId) cancelAnimationFrame(animationFrameId); animationFrameId = 0; return;
			}
			animationFrameId = requestAnimationFrame(animate);
			updateSatellitePositions(new Date());
			controlsInstance?.update();

            // Обновление Позиции Метки
			if (hoveredSatelliteName && container && cameraInstance) {
				const satObject = localSatelliteObjects.find(s => s.name === hoveredSatelliteName);
				if (satObject?.mesh.visible) { // Добавил проверку видимости
					labelPositionVector.copy(satObject.mesh.position);
					labelPositionVector.project(cameraInstance);
					if (labelPositionVector.z < 1) {
						const screenX = (labelPositionVector.x + 1) / 2 * container.clientWidth;
						const screenY = (-labelPositionVector.y + 1) / 2 * container.clientHeight;
						labelInfo = { name: hoveredSatelliteName, x: screenX, y: screenY };
					} else { labelInfo = null; }
				} else { labelInfo = null; }
			} else { labelInfo = null; }

			rendererInstance.render(sceneInstance, cameraInstance);
		}

		function handleResize() {
			 if (!isMounted || !container || !rendererInstance || !cameraInstance) return;
			 cameraInstance.aspect = container.clientWidth / container.clientHeight;
			 cameraInstance.updateProjectionMatrix();
			 rendererInstance.setSize(container.clientWidth, container.clientHeight);
		 }

		 function onMouseMove(event: MouseEvent) {
			 if (!isMounted || !container || !cameraInstance) return;
			 const rect = container.getBoundingClientRect();
			 mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
			 mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
			 raycaster.setFromCamera(mouse, cameraInstance);
			 const visibleMeshes = localSatelliteMeshes.filter(m => m.visible);
			 const intersects = raycaster.intersectObjects(visibleMeshes);
			 if (intersects.length > 0 && intersects[0].object instanceof THREE.Mesh) {
				 const mesh = intersects[0].object;
				 const sat = localSatelliteObjects.find(s => s.mesh === mesh);
				 hoveredSatelliteName = sat ? sat.name : null;
			 } else {
				 hoveredSatelliteName = null;
			 }
		 }

		 function onMouseLeave() {
			 hoveredSatelliteName = null;
			 labelInfo = null;
		 }

		// Основная асинхронная часть инициализации
		const init = async () => {
			try {
				const fetchedTLEs = await loadTLEData();
				if (!isMounted || !container) return;
				if (fetchedTLEs.length === 0) {
					 tleError = tleError || "No satellite TLE data loaded or found.";
					 isLoadingTLE = false; return;
				}

				// Инициализация Three.js
				sceneInstance = new THREE.Scene();
				cameraInstance = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
				cameraInstance.position.z = EARTH_RADIUS_SCENE * 3;
				rendererInstance = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
				rendererInstance.setSize(container.clientWidth, container.clientHeight);
				rendererInstance.setPixelRatio(window.devicePixelRatio);
				while (container.firstChild) { container.removeChild(container.firstChild); }
				container.appendChild(rendererInstance.domElement);
				const ambientLight = new THREE.AmbientLight(0x808080); sceneInstance.add(ambientLight);
				const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0); directionalLight.position.set(5, 5, 5); sceneInstance.add(directionalLight);

				// Земля
				const earthGeometry = new THREE.SphereGeometry(EARTH_RADIUS_SCENE, 64, 32);
				const textureLoader = new THREE.TextureLoader();
				// --- Добавим обработку ошибок загрузки текстуры ---
				const earthTexture = textureLoader.load(
				    '/textures/earth_daymap.jpg',
				    // onLoad callback (необязательно)
				    () => { console.log("[SatelliteGlobe] Earth texture loaded."); },
				    // onProgress callback (необязательно)
				    undefined,
				    // onError callback
				    (errorEvent) => {
				        console.error("[SatelliteGlobe] Error loading Earth texture!", errorEvent);
				        tleError = "Failed to load Earth texture. Check path and file."; // Показываем ошибку
				        isLoadingTLE = false; // Убираем лоадер
				    }
				);
				const earthMaterial = new THREE.MeshPhongMaterial({ map: earthTexture, specular: 0x111111, shininess: 5 });
                // ---------------------------------------------
				const earthMesh = new THREE.Mesh(earthGeometry, earthMaterial);
				sceneInstance.add(earthMesh);

				// Контролы
				controlsInstance = new OrbitControls(cameraInstance, rendererInstance.domElement);
				controlsInstance.enableDamping = true; controlsInstance.minDistance = EARTH_RADIUS_SCENE * 1.1; controlsInstance.maxDistance = EARTH_RADIUS_SCENE * 15;
                controlsInstance.rotateSpeed = 0.5; controlsInstance.zoomSpeed = 0.8; controlsInstance.panSpeed = 0.5;

				localSatelliteObjects = [];
				localSatelliteMeshes = [];
				const initializationTime = new Date();

				// Создание спутников и треков
				fetchedTLEs.forEach(tle => {
					 try {
						 const satrec = satellite.twoline2satrec(tle.tle1, tle.tle2);
                         // --- ВОЗВРАЩАЕМ Mesh (маленькую сферу) ---
						 const satGeometry = new THREE.SphereGeometry(0.08, 6, 6); // Упрощенная сфера
						 const satColor = tle.name.includes('ISS') ? DEFAULT_COLOR_ISS : DEFAULT_COLOR_OTHER;
						 const satMaterial = new THREE.MeshBasicMaterial({ color: satColor });
						 const satMesh = new THREE.Mesh(satGeometry, satMaterial); // Создаем Mesh
                         // --------------------------------------
						 let trackLine: THREE.Line | undefined;
						 const trackPoints = calculateTrackPoints(satrec, initializationTime);
						 if (trackPoints.length > 1 && sceneInstance) {
							 const trackGeometry = new THREE.BufferGeometry().setFromPoints(trackPoints);
							 const trackMaterial = new THREE.LineBasicMaterial({ color: TRACK_COLOR, transparent: true, opacity: 0.4 });
							 trackLine = new THREE.Line(trackGeometry, trackMaterial);
							 sceneInstance.add(trackLine);
						 }
						 localSatelliteObjects.push({ name: tle.name, satrec, mesh: satMesh, defaultColor: satColor, trackLine: trackLine });
						 localSatelliteMeshes.push(satMesh); // Добавляем Mesh в массив для Raycaster
						 sceneInstance?.add(satMesh); // Добавляем Mesh в сцену
					 } catch (e) { console.error(`Error initializing sat ${tle.name}:`, e); }
				 });

				 isLoadingTLE = false;
				 animate();
				 window.addEventListener('resize', handleResize);
				 container.addEventListener('mousemove', onMouseMove);
				 container.addEventListener('mouseleave', onMouseLeave);

			} catch (error) {
				 console.error('[SatelliteGlobe] Initialization failed:', error);
				 if (!tleError) tleError = "Failed to initialize 3D scene.";
				 isLoadingTLE = false;
			}
		};

		init(); // Запускаем

		// Возвращаем функцию очистки
		return () => {
			isMounted = false;
			console.log('[SatelliteGlobe] Cleanup function running...');
			if (animationFrameId) cancelAnimationFrame(animationFrameId);
			window.removeEventListener('resize', handleResize);
			if (container) {
				container.removeEventListener('mousemove', onMouseMove);
				container.removeEventListener('mouseleave', onMouseLeave);
			}
			controlsInstance?.dispose();
			sceneInstance?.traverse(object => disposeObject(object));
			sceneInstance?.clear();
			rendererInstance?.dispose();
			if (container && rendererInstance?.domElement?.parentNode === container) {
				container.removeChild(rendererInstance.domElement);
			}
			 console.log('[SatelliteGlobe] Cleanup complete.');
			 rendererInstance = null; sceneInstance = null; cameraInstance = null; controlsInstance = null;
			 localSatelliteObjects = []; localSatelliteMeshes = [];
		};
	}); // Конец onMount

</script>

<!-- Шаблон -->
<div class="w-full h-96 border dark:border-gray-700 rounded-lg overflow-hidden relative bg-black">
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
			Error: {tleError}
		</div>
	{/if}

	<!-- Основной контейнер для рендерера -->
	<div bind:this={container} class="w-full h-full cursor-grab">
		<!-- Canvas Three.js будет здесь -->
	</div>

	<!-- HTML МЕТКА ДЛЯ ИМЕНИ -->
	{#if labelInfo}
		<div
			class="absolute bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded shadow-lg pointer-events-none whitespace-nowrap"
			style:left="{labelInfo.x}px"
			style:top="{labelInfo.y}px"
			style="transform: translate(-50%, -130%); z-index: 20;"
		>
			{labelInfo.name}
		</div>
	{/if}

</div>

<style>
	div[bind\:this] { min-height: 400px; }
	.absolute { /* Стили для сообщений и метки */ }
</style>