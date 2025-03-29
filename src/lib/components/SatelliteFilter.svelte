<!-- src/lib/components/SatelliteFilter.svelte -->

<!-- Блок для экспорта типов и констант -->
<script context="module" lang="ts">
	// Определяем и ЭКСПОРТИРУЕМ типы фильтров здесь
	export type OrbitFilter = 'ALL' | 'LEO' | 'MEO_GEO_HEO';
	export type TypeFilter = 'ALL' | 'ISS' | 'OBSERVATION' | 'CAMERA';
</script>

<!-- Основной блок скрипта для логики компонента -->
<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	// Типы OrbitFilter и TypeFilter доступны здесь из context="module"

	// Состояние фильтров
	let selectedOrbitFilter: OrbitFilter = 'ALL';
	let selectedTypeFilter: TypeFilter = 'ALL';

	// Диспетчер событий
	const dispatch = createEventDispatcher<{
		filterchange: { orbit: OrbitFilter; type: TypeFilter };
	}>();

	// Обработка изменений
	function handleFilterChange() {
		dispatch('filterchange', {
			orbit: selectedOrbitFilter,
			type: selectedTypeFilter
		});
	}

	// Реактивность
	$: selectedOrbitFilter, selectedTypeFilter, handleFilterChange();

    // Стили кнопок
    const baseClass = "px-3 py-1 text-sm rounded-md border transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800";
    const activeClass = "bg-blue-600 text-white border-blue-700 dark:bg-blue-500 dark:border-blue-600 focus:ring-blue-500";
    const inactiveClass = "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 focus:ring-gray-400";

</script>

<!-- Шаблон (HTML) -->
<div class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md mb-6">
	<h3 class="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">Satellite Filters</h3>
	<div class="space-y-4">
		<!-- Фильтр по типу орбиты -->
		<div>
			<label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Orbit Type:</label>
			<div class="flex flex-wrap gap-2">
				<button class="{baseClass} {selectedOrbitFilter === 'ALL' ? activeClass : inactiveClass}" on:click={() => selectedOrbitFilter = 'ALL'}>All Orbits</button>
				<button class="{baseClass} {selectedOrbitFilter === 'LEO' ? activeClass : inactiveClass}" on:click={() => selectedOrbitFilter = 'LEO'}>LEO</button>
				<button class="{baseClass} {selectedOrbitFilter === 'MEO_GEO_HEO' ? activeClass : inactiveClass}" on:click={() => selectedOrbitFilter = 'MEO_GEO_HEO'}>MEO/GEO/HEO</button>
			</div>
		</div>
		<!-- Фильтр по типу/камере -->
		<div>
			<label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Satellite Type / Feature:</label>
			<div class="flex flex-wrap gap-2">
				<button class="{baseClass} {selectedTypeFilter === 'ALL' ? activeClass : inactiveClass}" on:click={() => selectedTypeFilter = 'ALL'}>All Types</button>
                <button class="{baseClass} {selectedTypeFilter === 'ISS' ? activeClass : inactiveClass}" on:click={() => selectedTypeFilter = 'ISS'}>ISS</button>
				<button class="{baseClass} {selectedTypeFilter === 'OBSERVATION' ? activeClass : inactiveClass}" on:click={() => selectedTypeFilter = 'OBSERVATION'}>Earth Observation</button>
                <button class="{baseClass} {selectedTypeFilter === 'CAMERA' ? activeClass : inactiveClass}" on:click={() => selectedTypeFilter = 'CAMERA'}>With Camera</button>
			</div>
		</div>
	</div>
</div>