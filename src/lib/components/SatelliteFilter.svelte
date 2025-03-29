<!-- src/lib/components/SatelliteFilter.svelte -->
<!-- Provides dropdown filters for satellite orbit type and category/capability. -->
<!-- This component is intended to be used *inside* SatelliteGlobe. -->

<!-- Use context="module" to export types that can be imported by other components -->
<script context="module" lang="ts">
	// Define the possible values for the Orbit Type filter dropdown.
	// Aligned with classifications used in SatelliteGlobe's classifyOrbit function.
	export type OrbitFilter = 'ALL' | 'LEO' | 'MEO' | 'GEO' | 'HEO' | 'SSO' | 'OTHER';

	// Define the possible values for the Satellite Type/Capability filter dropdown.
	// Aligned with SatelliteDetails types from satellite-info.ts.
	export type TypeFilter = 'ALL' | 'ISS' | 'OBSERVATION' | 'CAMERA';
</script>

<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	// State variables bound to the select dropdowns
	let selectedOrbitFilter: OrbitFilter = 'ALL'; // Default to showing all orbits
	let selectedTypeFilter: TypeFilter = 'ALL'; // Default to showing all types

	// Event dispatcher to notify the parent component (SatelliteGlobe) of filter changes
	const dispatch = createEventDispatcher<{
		// Event named 'filterchange' carrying the selected orbit and type filters
		filterchange: { orbit: OrbitFilter; type: TypeFilter };
	}>();

	/**
	 * Called whenever a filter selection changes. Dispatches the 'filterchange' event.
	 */
	function handleFilterChange() {
		dispatch('filterchange', { orbit: selectedOrbitFilter, type: selectedTypeFilter });
	}

	// Reactive statement: Whenever selectedOrbitFilter or selectedTypeFilter changes, call handleFilterChange.
	$: selectedOrbitFilter, selectedTypeFilter, handleFilterChange();

	// --- Dropdown Options ---
	// Define the options for the Orbit Type dropdown
	const orbitOptions: { value: OrbitFilter; label: string }[] = [
		{ value: 'ALL', label: 'All Orbits' },
		{ value: 'LEO', label: 'Low Earth (LEO)' },
		{ value: 'MEO', label: 'Medium Earth (MEO)' },
		{ value: 'GEO', label: 'Geostationary (GEO)' },
		{ value: 'HEO', label: 'Highly Elliptical (HEO)' },
		{ value: 'SSO', label: 'Sun-Synchronous (SSO)' },
		{ value: 'OTHER', label: 'Other/Unknown' } // Corresponds to 'Unknown' classification
	];

	// Define the options for the Satellite Type/Capability dropdown
	const typeOptions: { value: TypeFilter; label: string }[] = [
		{ value: 'ALL', label: 'All Types' },
		{ value: 'ISS', label: 'ISS' }, // Matches 'ISS' type in satellite-info
		{ value: 'OBSERVATION', label: 'Earth Observation' }, // Matches 'Earth Observation' type
		{ value: 'CAMERA', label: 'With Camera' } // Matches `hasCamera: true` in satellite-info
	];

	// Base Tailwind CSS classes for styling the select elements consistently
	const selectBaseClass =
		'mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md shadow-sm appearance-none'; // Added appearance-none for better custom styling potential
</script>

<!-- Filter Panel Container -->
<!-- Semi-transparent background with blur effect, rounded corners, shadow -->
<div
	class="w-64 rounded-lg bg-white bg-opacity-80 p-3 shadow-md backdrop-blur-sm dark:bg-gray-800 dark:bg-opacity-80"
>
	<h3 class="text-md mb-2 font-semibold text-gray-900 dark:text-gray-100">Filters</h3>
	<div class="space-y-3">
		<!-- Orbit Type Filter Dropdown -->
		<div>
			<label for="orbit-filter" class="block text-xs font-medium text-gray-600 dark:text-gray-300"
				>Orbit Type:</label
			>
			<div class="relative">
				<select id="orbit-filter" bind:value={selectedOrbitFilter} class={selectBaseClass}>
					{#each orbitOptions as option (option.value)}
						<option value={option.value}>{option.label}</option>
					{/each}
				</select>
				<!-- Custom dropdown arrow (optional, requires appearance-none) -->
				<div
					class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-gray-300"
				>
					<svg class="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"
						><path
							d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"
						/></svg
					>
				</div>
			</div>
		</div>

		<!-- Satellite Type/Capability Filter Dropdown -->
		<div>
			<label for="type-filter" class="block text-xs font-medium text-gray-600 dark:text-gray-300"
				>Satellite Type:</label
			>
			<div class="relative">
				<select id="type-filter" bind:value={selectedTypeFilter} class={selectBaseClass}>
					{#each typeOptions as option (option.value)}
						<option value={option.value}>{option.label}</option>
					{/each}
				</select>
				<!-- Custom dropdown arrow -->
				<div
					class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-gray-300"
				>
					<svg class="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"
						><path
							d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"
						/></svg
					>
				</div>
			</div>
		</div>
	</div>
</div>
