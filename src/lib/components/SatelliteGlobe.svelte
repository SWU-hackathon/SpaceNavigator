<!-- src/lib/components/SatelliteGlobe.svelte -->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import * as THREE from 'three';
	import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
	import * as satellite from 'satellite.js';
	// Импорт справочника и типов
	import { getSatelliteDetails, type SatelliteDetails } from '$lib/satellite-info';
	// Импортируем типы фильтров ИЗ ФАЙЛА ФИЛЬТРА
	import type { OrbitFilter, TypeFilter } from './SatelliteFilter.svelte';

	// --- Props ---
	export let radiationRiskLevel: string = 'None';
	export let orbitFilter: OrbitFilter = 'ALL';
	export let typeFilter: TypeFilter = 'ALL';

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
	const DEFAULT_COLOR_ISS = 0xffaa00;
	const DEFAULT_COLOR_OTHER = 0x00aaff;
	const HAZARD_COLOR = 0xff00ff;
	const TRACK_COLOR = 0x888888;

	// --- Типы Данных ---
	interface FetchedTleData {
		name: string;
		tle1: string;
		tle2: string;
	}

    type OrbitClassification = 'LEO' | 'MEO' | 'GEO' | 'HEO' | 'Unknown';

	interface SatelliteObject {
		name: string;
		satrec: satellite.SatRec;
		mesh: THREE.Mesh; // Используем Mesh
		defaultColor: number;
		trackLine?: THREE.Line;
		details: SatelliteDetails; // Детали из справочника
		orbitType: OrbitClassification; // Используем определенный тип
		isVisible: boolean; // Флаг видимости по фильтру
	}
    // ------------------------------------

    // Переменные для хранения объектов Three.js (доступны в onMount и замыканиях)
    let localSatelliteObjects: SatelliteObject[] = []; // Объявлена здесь для доступа из реактивного блока $:, если он будет нужен

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

	function classifyOrbit(satrec: satellite.SatRec): OrbitClassification {
        const meanMotionRadPerMin = satrec.no;
        const periodMinutes = (2 * Math.PI) / meanMotionRadPerMin;
        const mu = 398600.4418; // km^3/s^2
        const meanMotionRadPerSec = meanMotionRadPerMin / 60;
        if (meanMotionRadPerSec === 0) return 'Unknown';
        const semiMajorAxisKm = Math.cbrt(mu / (meanMotionRadPerSec * meanMotionRadPerSec));
        const altitudeKm = semiMajorAxisKm - REAL_EARTH_RADIUS_KM;
        const eccentricity = satrec.ecco;

        if (isNaN(periodMinutes) || isNaN(altitudeKm)) return 'Unknown';

        if (eccentricity > 0.25) { return 'HEO'; }
        else if (Math.abs(periodMinutes - 1436.1) < 30) { return 'GEO'; }
        else if (altitudeKm < 2000) { return 'LEO'; }
        else if (altitudeKm >= 2000 && altitudeKm < 35700) { return 'MEO'; }
        else { return altitudeKm >= 35700 ? 'GEO' : 'MEO'; }
    }

	// --- Функция Применения Фильтров ---
    function applyFilters(satellites: SatelliteObject[], currentOrbitFilter: OrbitFilter, currentTypeFilter: TypeFilter) {
        if (!satellites || satellites.length === 0) return;
        satellites.forEach(sat => {
            let orbitMatch = false; let typeMatch = false;
            // Проверка фильтра орбиты
            if (currentOrbitFilter === 'ALL') { orbitMatch = true; }
            else if (currentOrbitFilter === 'LEO') { orbitMatch = sat.orbitType === 'LEO'; }
            else if (currentOrbitFilter === 'MEO_GEO_HEO') { orbitMatch = ['MEO', 'GEO', 'HEO'].includes(sat.orbitType); }
            // Проверка фильтра типа/камеры
            if (currentTypeFilter === 'ALL') { typeMatch = true; }
            else if (currentTypeFilter === 'ISS') { typeMatch = sat.details.type === 'ISS'; }
            else if (currentTypeFilter === 'OBSERVATION') { typeMatch = sat.details.type === 'Earth Observation'; }
            else if (currentTypeFilter === 'CAMERA') { typeMatch = !!sat.details.hasCamera; }
            // Спутник видим, если соответствует обоим фильтрам
            sat.isVisible = orbitMatch && typeMatch;

            // Обновляем видимость 3D объектов (плавно)
            const meshMaterial = sat.mesh.material as THREE.MeshBasicMaterial;
            const trackMaterial = sat.trackLine?.material as THREE.LineBasicMaterial;
            const targetOpacity = sat.isVisible ? 1.0 : 0.0;
            const targetTrackOpacity = sat.isVisible ? 0.4 : 0.0;

            if (meshMaterial) {
                meshMaterial.transparent = true;
                // Используем lerp для более плавной анимации прозрачности
                meshMaterial.opacity = THREE.MathUtils.lerp(meshMaterial.opacity, targetOpacity, 0.1);
                // Скрываем меш совсем, если он почти прозрачен
                sat.mesh.visible = meshMaterial.opacity > 0.05;
            }
            if (trackMaterial && sat.trackLine) {
                trackMaterial.transparent = true;
                trackMaterial.opacity = THREE.MathUtils.lerp(trackMaterial.opacity, targetTrackOpacity, 0.1);
                sat.trackLine.visible = trackMaterial.opacity > 0.05;
            }
        });
    }
    // --- КОНЕЦ ФУНКЦИИ ФИЛЬТРОВ ---

    // --- Реактивный вызов applyFilters при изменении props ---
    // Этот блок будет вызываться при изменении orbitFilter или typeFilter
    // Мы проверяем localSatelliteObjects, чтобы убедиться, что сцена инициализирована
    $: if(localSatelliteObjects && localSatelliteObjects.length > 0 && !isLoadingTLE) {
        applyFilters(localSatelliteObjects, orbitFilter, typeFilter);
    }
    // -----------------------------------------------------


	// --- Инициализация и Очистка ---
	onMount(() => {
		if (!container) {
			console.error("[SatelliteGlobe] onMount: Container div not found!");
			isLoadingTLE = false;
			tleError = "Initialization error: Container not found.";
			return;
		}

		let isMounted = true; let animationFrameId: number;
		let rendererInstance: THREE.WebGLRenderer | null = null; let sceneInstance: THREE.Scene | null = null;
		let cameraInstance: THREE.PerspectiveCamera | null = null; let controlsInstance: OrbitControls | null = null;
		// Массив мешей нужен только локально
        let localSatelliteMeshes: THREE.Mesh[] = [];

		const raycaster = new THREE.Raycaster(); const mouse = new THREE.Vector2(); const labelPositionVector = new THREE.Vector3();

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
				// Пропускаем спутники, которые не должны быть видимы по фильтру
                // (проверка !sat.isVisible здесь не обязательна, т.к. applyFilters управляет mesh.visible)
				if (!sat.mesh.visible && !sat.trackLine?.visible) return; // Пропускаем если и меш и трек невидимы

				try {
					const posVel = satellite.propagate(sat.satrec, currentTime);
					const posEci = posVel.position as satellite.EciVec3<number>;
					if (!posEci) return;
					const geo = satellite.eciToGeodetic(posEci, gmst);
					const r = EARTH_RADIUS_SCENE + geo.height / SCALE_FACTOR;
					const x = r * Math.cos(geo.latitude) * Math.cos(geo.longitude);
					const y = r * Math.sin(geo.latitude);
					const z = -r * Math.cos(geo.latitude) * Math.sin(geo.longitude);

                    // Обновляем позицию меша только если он видим
                    if (sat.mesh.visible) {
					    sat.mesh.position.set(x, y, z);
                    }

					let targetColor = sat.defaultColor;
					if (isHazard && Math.abs(geo.latitude) > highLat) { targetColor = HAZARD_COLOR; }
					const material = sat.mesh.material as THREE.MeshBasicMaterial;
					if (material?.color && material.color.getHex() !== targetColor) {
						 material.color.setHex(targetColor);
					}
				} catch (error: any) {
					 if (error.message.includes('decay')) {
						 if(sat.mesh.visible) console.warn(`Satellite ${sat.name} orbit decayed.`);
						 sat.mesh.visible = false; if(sat.trackLine) sat.trackLine.visible = false; sat.isVisible = false;
					 } else {
						 console.error(`Error propagating sat ${sat.name}:`, error);
						 sat.mesh.visible = false; if(sat.trackLine) sat.trackLine.visible = false; sat.isVisible = false;
					 }
				 }
			});
		}

		function animate() {
			if (!isMounted || !rendererInstance || !sceneInstance || !cameraInstance) {
				 if(animationFrameId) cancelAnimationFrame(animationFrameId); animationFrameId = 0; return;
			}
			animationFrameId = requestAnimationFrame(animate);

            // Вызываем applyFilters здесь для плавной анимации прозрачности
            applyFilters(localSatelliteObjects, orbitFilter, typeFilter);

			updateSatellitePositions(new Date()); // Обновляем позиции после фильтрации
			controlsInstance?.update();

            // Обновление Позиции Метки
			if (hoveredSatelliteName && container && cameraInstance) {
				const satObject = localSatelliteObjects.find(s => s.name === hoveredSatelliteName);
				// Метка показывается только для видимых спутников
                if (satObject?.isVisible && satObject.mesh.visible) {
					labelPositionVector.copy(satObject.mesh.position);
					labelPositionVector.project(cameraInstance);
					if (labelPositionVector.z < 1) {
						const screenX = (labelPositionVector.x + 1) / 2 * container.clientWidth;
						const screenY = (-labelPositionVector.y + 1) / 2 * container.clientHeight;
						labelInfo = { name: hoveredSatelliteName, x: screenX, y: screenY };
					} else { labelInfo = null; }
				} else { labelInfo = null; } // Скрываем метку, если спутник отфильтрован
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
             // Ищем пересечения ТОЛЬКО с видимыми мешами
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
				const earthGeometry = new THREE.SphereGeometry(EARTH_RADIUS_SCENE, 64, 32);
				const textureLoader = new THREE.TextureLoader();
				const earthMaterial = new THREE.MeshPhongMaterial({ map: textureLoader.load('/textures/earth_daymap.jpg', undefined, undefined, (err) => { console.error("Failed to load earth texture!", err); tleError="Texture load failed."; isLoadingTLE=false; }), specular: 0x111111, shininess: 5 });
				const earthMesh = new THREE.Mesh(earthGeometry, earthMaterial);
				sceneInstance.add(earthMesh);
				controlsInstance = new OrbitControls(cameraInstance, rendererInstance.domElement);
				controlsInstance.enableDamping = true; controlsInstance.minDistance = EARTH_RADIUS_SCENE * 1.1; controlsInstance.maxDistance = EARTH_RADIUS_SCENE * 15;
                controlsInstance.rotateSpeed = 0.5; controlsInstance.zoomSpeed = 0.8; controlsInstance.panSpeed = 0.5;

				localSatelliteObjects = []; // Очищаем перед заполнением
				localSatelliteMeshes = []; // Очищаем перед заполнением
				const initializationTime = new Date();

				// Создание спутников и треков
				fetchedTLEs.forEach(tle => {
					 try {
						 const satrec = satellite.twoline2satrec(tle.tle1, tle.tle2);
						 const satGeometry = new THREE.SphereGeometry(0.08, 6, 6);
						 const satColor = tle.name.includes('ISS') ? DEFAULT_COLOR_ISS : DEFAULT_COLOR_OTHER;
						 const satMaterial = new THREE.MeshBasicMaterial({ color: satColor, transparent: true, opacity: 1 });
						 const satMesh = new THREE.Mesh(satGeometry, satMaterial);
						 const noradId = tle.tle1.substring(2, 7).trim();
						 const details = getSatelliteDetails(noradId);
						 const orbitType = classifyOrbit(satrec);
						 let trackLine: THREE.Line | undefined;
						 const trackPoints = calculateTrackPoints(satrec, initializationTime);
						 if (trackPoints.length > 1 && sceneInstance) {
							const trackGeometry = new THREE.BufferGeometry().setFromPoints(trackPoints);
							const trackMaterial = new THREE.LineBasicMaterial({ color: TRACK_COLOR, transparent: true, opacity: 0.4 });
							trackLine = new THREE.Line(trackGeometry, trackMaterial);
							sceneInstance.add(trackLine);
						 }
                         // Добавляем в локальные массивы
						 localSatelliteObjects.push({ name: tle.name, satrec, mesh: satMesh, defaultColor: satColor, trackLine: trackLine, details: details, orbitType: orbitType, isVisible: true });
						 localSatelliteMeshes.push(satMesh);
						 sceneInstance?.add(satMesh);
					 } catch (e) { console.error(`Error initializing sat ${tle.name}:`, e); }
				 });

				// Применяем начальные фильтры ДО первого рендера
				applyFilters(localSatelliteObjects, orbitFilter, typeFilter);

				isLoadingTLE = false; // Убираем лоадер
				animate(); // Запускаем главный цикл
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

		// Функция очистки
		const cleanup = () => {
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
			 localSatelliteObjects = []; // Очищаем массив объектов при размонтировании
		};
		return cleanup; // Возвращаем функцию очистки для onDestroy

	}); // Конец onMount

</script>

<!-- Шаблон (без изменений) -->
<div class="w-full h-96 border dark:border-gray-700 rounded-lg overflow-hidden relative bg-black">
	{#if isLoadingTLE}
        <!-- ВОЗВРАЩАЕМ КОД ЛОАДЕРА -->
		<div class="absolute inset-0 flex items-center justify-center bg-gray-500/50 text-white z-10">
			 <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
				 <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
				 <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
			 </svg>
			Loading TLE Data...
		</div>
	{:else if tleError}
        <!-- ВОЗВРАЩАЕМ КОД ОШИБКИ -->
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