<script lang="ts">
	import type { PageData } from './$types';
	import InterpretationCard from '$lib/components/InterpretationCard.svelte';
	import AerospaceImpact from '$lib/components/AerospaceImpact.svelte';
	import NotificationList from '$lib/components/NotificationList.svelte';
	import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
	import ErrorMessage from '$lib/components/ErrorMessage.svelte';
	import SatelliteGlobe, { type SatelliteObject } from '$lib/components/SatelliteGlobe.svelte';
	// УБИРАЕМ ИМПОРТ ФИЛЬТРА ЗДЕСЬ
	// import SatelliteFilter from '$lib/components/SatelliteFilter.svelte';
	// import type { OrbitFilter, TypeFilter } from '$lib/components/SatelliteFilter.svelte';
    import SatInfoPanel from '$lib/components/SatInfoPanel.svelte';

	export let data: PageData;
	$: weather = data.weatherData; $: error = data.error; $: interpretation = data.weatherData?.interpretation;
	$: notifications = data.weatherData?.notifications; $: lastUpdated = data.weatherData?.lastUpdated;

    // УБИРАЕМ СОСТОЯНИЕ ФИЛЬТРОВ ЗДЕСЬ (управляется внутри SatelliteGlobe)
	// let activeOrbitFilter: OrbitFilter = 'ALL';
	// let activeTypeFilter: TypeFilter = 'ALL';
    let selectedSatelliteInfo: SatelliteObject | null = null;

    // УБИРАЕМ handleFilterUpdate
	// function handleFilterUpdate(event: CustomEvent<{ orbit: OrbitFilter; type: TypeFilter }>) { ... }

    function handleSatelliteClick(event: CustomEvent<SatelliteObject>) {
        selectedSatelliteInfo = event.detail;
    }

    function formatDateTime(isoString: string | undefined): string {
		if (!isoString) return 'N/A';
		try { return new Date(isoString).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }); }
        catch (e) { console.error("Error formatting date:", e); return 'Invalid Date'; }
	}
</script>

<!-- Добавили padding обратно -->
<main class="container mx-auto p-4 sm:p-6 lg:p-8 max-w-7xl relative">
	<header class="mb-6">
		<h1 class="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100">
			Space Weather & Satellite Tracker
		</h1>
		{#if lastUpdated} <p class="text-sm text-gray-500 dark:text-gray-400"> Weather data last updated: {formatDateTime(lastUpdated)} </p> {/if}
	</header>

	{#if error}
         <ErrorMessage message={error} />
	{:else if weather && interpretation}
        <!-- Блок с глобусом (фиксированная высота) -->
		<div class="relative mb-6">
            <!-- Высота ЗАДАНА ЗДЕСЬ, а не внутри глобуса -->
			<div class="h-[75vh] w-full bg-black rounded-lg overflow-hidden shadow-lg border dark:border-gray-700">
				<SatelliteGlobe
					radiationRiskLevel={interpretation.currentConditions.radiationStorm}
                    on:satelliteclick={handleSatelliteClick}
				/>
			</div>
             <!-- ФИЛЬТР УБРАН ОТСЮДА -->
		</div>

        <!-- Секция с контентом (прокручивается под глобусом) -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
             <div class="lg:col-span-2 space-y-6">
				<InterpretationCard data={interpretation} />
				<AerospaceImpact data={interpretation.potentialImpacts} />
			</div>
            <div class="lg:col-span-1">
                 <div>
					<NotificationList notifications={notifications} />
				</div>
            </div>
        </div>

	{:else}
		<LoadingSpinner message="Loading space weather data..." />
	{/if}

    {#if selectedSatelliteInfo}
        <SatInfoPanel satellite={selectedSatelliteInfo} on:close={() => selectedSatelliteInfo = null} />
    {/if}

</main>

<style lang="postcss">
     :global(body) {
         overflow-y: scroll; /* Всегда показываем скроллбар */
     }
     /* Убедимся, что canvas растягивается */
     :global(.relative > div > div[bind\:this] > canvas) {
         @apply block w-full h-full;
     }
</style>