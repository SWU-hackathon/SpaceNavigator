<!-- src/lib/components/SatelliteGlobe.svelte -->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import * as THREE from 'three';
	import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
	import * as satellite from 'satellite.js';
	// --- Импорт справочника и типов ---
	import { getSatelliteDetails, type SatelliteDetails } from '$lib/satellite-info';
	import type { OrbitFilter, TypeFilter } from './SatelliteFilter.svelte'; // Импортируем типы фильтров

	// --- Props ---
	export let radiationRiskLevel: string = 'None';
	export let orbitFilter: OrbitFilter = 'ALL'; // Новый prop
	export let typeFilter: TypeFilter = 'ALL';   // Новый prop

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
	const DEFAULT_COLOR_ISS = 0xffaa00; const DEFAULT_COLOR_OTHER = 0x00aaff;
	const HAZARD_COLOR = 0xff00ff; const TRACK_COLOR = 0x888888;

	// --- Типы Данных ---
	interface FetchedTleData { name: string; tle1: string; tle2: string; }
	// Обновленный интерфейс SatelliteObject
	interface SatelliteObject {
		name: string;
		satrec: satellite.SatRec;
		mesh: THREE.Mesh;
		defaultColor: number;
		trackLine?: THREE.Line;
		details: SatelliteDetails; // Детали из справочника
		orbitType: 'LEO' | 'MEO' | 'GEO' | 'HEO' | 'Unknown'; // Тип орбиты
		isVisible: boolean; // Флаг видимости по фильтру
	}

    // Переменные для хранения объектов Three.js (объявлены здесь для доступа из applyFiltersWrapper)
    let localSatelliteObjects: SatelliteObject[] = [];

	// --- Функции ---
	async function loadTLEData(): Promise<FetchedTleData[]> { /* ... (код без изменений) ... */ }
	function calculateTrackPoints(satrec: satellite.SatRec, startTime: Date): THREE.Vector3[] { /* ... (код без изменений) ... */ }
	function classifyOrbit(satrec: satellite.SatRec): 'LEO' | 'MEO' | 'GEO' | 'HEO' | 'Unknown' { /* ... (код без изменений) ... */ }

	// --- Функция Применения Фильтров ---
    function applyFilters(satellites: SatelliteObject[], currentOrbitFilter: OrbitFilter, currentTypeFilter: TypeFilter) {
        if (!satellites || satellites.length === 0) return;
        // console.log(`[SatelliteGlobe] Applying filters - Orbit: ${currentOrbitFilter}, Type: ${currentTypeFilter}`);
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

            // Обновляем видимость 3D объектов (плавно или резко)
            const meshMaterial = sat.mesh.material as THREE.MeshBasicMaterial;
            const trackMaterial = sat.trackLine?.material as THREE.LineBasicMaterial;
            const targetOpacity = sat.isVisible ? 1.0 : 0.0; // Целевая прозрачность меша
            const targetTrackOpacity = sat.isVisible ? 0.4 : 0.0; // Целевая прозрачность трека

            if (meshMaterial) {
                meshMaterial.transparent = true;
                meshMaterial.opacity += (targetOpacity - meshMaterial.opacity) * 0.1; // Плавное изменение
                sat.mesh.visible = meshMaterial.opacity > 0.05; // Скрываем совсем, если почти прозрачно
            }
            if (trackMaterial && sat.trackLine) {
                trackMaterial.transparent = true;
                trackMaterial.opacity += (targetTrackOpacity - trackMaterial.opacity) * 0.1;
                sat.trackLine.visible = trackMaterial.opacity > 0.05;
            }
            // Резкое скрытие:
            // sat.mesh.visible = sat.isVisible;
            // if (sat.trackLine) { sat.trackLine.visible = sat.isVisible; }
        });
        // console.log(`[SatelliteGlobe] Filtering complete. Visible satellites: ${satellites.filter(s => s.isVisible).length}`);
    }
    // --- КОНЕЦ ФУНКЦИИ ФИЛЬТРОВ ---

    // --- Реактивный вызов applyFilters при изменении props ---
    $: if(localSatelliteObjects && localSatelliteObjects.length > 0) {
        // Эта проверка важна, чтобы не вызывать applyFilters до инициализации
        applyFilters(localSatelliteObjects, orbitFilter, typeFilter);
    }
    // -----------------------------------------------------


	// --- Инициализация и Очистка ---
	onMount(() => {
		if (!container) { /* ... обработка ошибки ... */ return; }

		let isMounted = true; let animationFrameId: number;
		let rendererInstance: THREE.WebGLRenderer | null = null; let sceneInstance: THREE.Scene | null = null;
		let cameraInstance: THREE.PerspectiveCamera | null = null; let controlsInstance: OrbitControls | null = null;
		// localSatelliteObjects и localSatelliteMeshes объявлены выше для доступа в реактивном блоке
        localSatelliteObjects = []; let localSatelliteMeshes: THREE.Mesh[] = [];

		const raycaster = new THREE.Raycaster(); const mouse = new THREE.Vector2(); const labelPositionVector = new THREE.Vector3();

		function disposeObject(obj: any) { /* ... */ } function disposeMaterial(material: any) { /* ... */ }
		function updateSatellitePositions(currentTime: Date) { /* ... */ }
        function handleResize() { /* ... */ }
        function onMouseMove(event: MouseEvent) { /* ... */ }
        function onMouseLeave() { /* ... */ }

		function animate() {
			if (!isMounted || !rendererInstance || !sceneInstance || !cameraInstance) { /* ... */ return; }
			animationFrameId = requestAnimationFrame(animate);
			updateSatellitePositions(new Date());
			controlsInstance?.update();
            // Обновление Позиции Метки
			if (hoveredSatelliteName && container && cameraInstance) { /* ... */ } else { labelInfo = null; }
			rendererInstance.render(sceneInstance, cameraInstance);
		}

		const init = async () => {
			try {
				const fetchedTLEs = await loadTLEData();
				if (!isMounted || !container) return;
				if (fetchedTLEs.length === 0) { /* ... */ return; }

				// Инициализация Three.js ...
                sceneInstance = new THREE.Scene();
                cameraInstance = new THREE.PerspectiveCamera(/* ... */);
                rendererInstance = new THREE.WebGLRenderer(/* ... */);
                container.appendChild(rendererInstance.domElement);
                // ... свет, земля, контролы ...
                localSatelliteObjects = []; localSatelliteMeshes = [];
                const initializationTime = new Date();
				// Создание спутников и треков с добавлением деталей и типа орбиты
				fetchedTLEs.forEach(tle => {
                    try {
                         // ... (создание satrec, geometry, material, mesh) ...
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
                         // --- Сохраняем всю информацию ---
                         localSatelliteObjects.push({ name: tle.name, satrec, mesh: satMesh, defaultColor: satColor, trackLine: trackLine, details: details, orbitType: orbitType, isVisible: true });
                         localSatelliteMeshes.push(satMesh);
                         sceneInstance?.add(satMesh);
                    } catch (e) { console.error(`Error initializing sat ${tle.name}:`, e); }
                });

                // --- ПРИМЕНЯЕМ НАЧАЛЬНЫЕ ФИЛЬТРЫ ---
                applyFilters(localSatelliteObjects, orbitFilter, typeFilter);
                // -----------------------------------

                isLoadingTLE = false;
				animate();
				window.addEventListener('resize', handleResize);
				container.addEventListener('mousemove', onMouseMove);
				container.addEventListener('mouseleave', onMouseLeave);

			} catch (error) { /* ... */ }
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
             // localSatelliteObjects и localSatelliteMeshes обнулятся при следующем монтировании
        };
		return cleanup;

	}); // Конец onMount

</script>

<!-- Шаблон -->
<div class="w-full h-96 border dark:border-gray-700 rounded-lg overflow-hidden relative bg-black">
	{#if isLoadingTLE}
        <div class="absolute inset-0 flex items-center justify-center bg-gray-500/50 text-white z-10"> /* Лоадер */ </div>
	{:else if tleError}
        <div class="absolute inset-0 flex items-center justify-center bg-red-800/80 text-white p-4 text-center z-10">Error: {tleError}</div>
	{/if}
	<div bind:this={container} class="w-full h-full cursor-grab"></div>
	{#if labelInfo}
		<div class="absolute bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded shadow-lg pointer-events-none whitespace-nowrap"
             style:left="{labelInfo.x}px" style:top="{labelInfo.y}px" style="transform: translate(-50%, -130%); z-index: 20;">
			{labelInfo.name}
		</div>
	{/if}
</div>

<style>
	div[bind\:this] { min-height: 400px; }
	.absolute { /* ... */ }
</style>