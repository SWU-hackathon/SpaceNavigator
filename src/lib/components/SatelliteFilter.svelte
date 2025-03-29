<!-- src/lib/components/SatelliteFilter.svelte -->
<script context="module" lang="ts">
	// --- ОБНОВЛЕННЫЕ ТИПЫ ОРБИТ ---
	export type OrbitFilter = 'ALL' | 'LEO' | 'MEO' | 'GEO' | 'HEO' | 'SSO' | 'OTHER'; // Добавили SSO, разделили MEO/GEO/HEO
	// --------------------------------

	export type TypeFilter = 'ALL' | 'ISS' | 'OBSERVATION' | 'CAMERA';
</script>

<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	// Типы доступны из context="module"

	// Состояние фильтров
	let selectedOrbitFilter: OrbitFilter = 'ALL';
	let selectedTypeFilter: TypeFilter = 'ALL';

	const dispatch = createEventDispatcher<{ filterchange: { orbit: OrbitFilter; type: TypeFilter }; }>();

	function handleFilterChange() { dispatch('filterchange', { orbit: selectedOrbitFilter, type: selectedTypeFilter }); }

	// Реактивность
	$: selectedOrbitFilter, selectedTypeFilter, handleFilterChange();

    // Опции для выпадающих списков
    const orbitOptions: { value: OrbitFilter, label: string }[] = [
        { value: 'ALL', label: 'All Orbits' },
        { value: 'LEO', label: 'Low Earth (LEO)' },
        { value: 'MEO', label: 'Medium Earth (MEO)' },
        { value: 'GEO', label: 'Geostationary (GEO)' },
        { value: 'HEO', label: 'Highly Elliptical (HEO)' },
        { value: 'SSO', label: 'Sun-Synchronous (SSO)' },
        { value: 'OTHER', label: 'Other/Unknown' }
    ];

     const typeOptions: { value: TypeFilter, label: string }[] = [
         { value: 'ALL', label: 'All Types' },
         { value: 'ISS', label: 'ISS' },
         { value: 'OBSERVATION', label: 'Earth Observation' },
         { value: 'CAMERA', label: 'With Camera' }
     ];

     // Базовые стили для select
     const selectBaseClass = "mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md shadow-sm";

</script>

<!-- ИСПОЛЬЗУЕМ <select> ВМЕСТО КНОПОК -->
<div class="bg-white dark:bg-gray-800 bg-opacity-80 dark:bg-opacity-80 backdrop-blur-sm p-3 rounded-lg shadow-md w-64"> <!-- Сделали компактнее и полупрозрачным -->
	<h3 class="text-md font-semibold mb-2 text-gray-900 dark:text-gray-100">Filters</h3>
	<div class="space-y-3">
		<!-- Фильтр по типу орбиты -->
		<div>
			<label for="orbit-filter" class="block text-xs font-medium text-gray-600 dark:text-gray-300">Orbit Type:</label>
			<select id="orbit-filter" bind:value={selectedOrbitFilter} class={selectBaseClass}>
                {#each orbitOptions as option (option.value)}
                    <option value={option.value}>{option.label}</option>
                {/each}
			</select>
		</div>

		<!-- Фильтр по типу спутника/камере -->
		<div>
			<label for="type-filter" class="block text-xs font-medium text-gray-600 dark:text-gray-300">Satellite Type:</label>
			<select id="type-filter" bind:value={selectedTypeFilter} class={selectBaseClass}>
                {#each typeOptions as option (option.value)}
                    <option value={option.value}>{option.label}</option>
                {/each}
			</select>
		</div>
	</div>
</div>