<script lang="ts">
	import type { PageData } from './$types';
	import InterpretationCard from '$lib/components/InterpretationCard.svelte';
	import AerospaceImpact from '$lib/components/AerospaceImpact.svelte';
	import NotificationList from '$lib/components/NotificationList.svelte';
	import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
	import ErrorMessage from '$lib/components/ErrorMessage.svelte';
	import SatelliteGlobe, { type SatelliteObject } from '$lib/components/SatelliteGlobe.svelte';
	import SatelliteFilter from '$lib/components/SatelliteFilter.svelte';
	import type { OrbitFilter, TypeFilter } from '$lib/components/SatelliteFilter.svelte';
    import SatInfoPanel from '$lib/components/SatInfoPanel.svelte';

	export let data: PageData;
	$: weather = data.weatherData;
	$: error = data.error;
	$: interpretation = data.weatherData?.interpretation;
	$: notifications = data.weatherData?.notifications;
	$: lastUpdated = data.weatherData?.lastUpdated;

	let activeOrbitFilter: OrbitFilter = 'ALL';
	let activeTypeFilter: TypeFilter = 'ALL';
    let selectedSatelliteInfo: SatelliteObject | null = null;

	function handleFilterUpdate(event: CustomEvent<{ orbit: OrbitFilter; type: TypeFilter }>) {
		activeOrbitFilter = event.detail.orbit;
		activeTypeFilter = event.detail.type;
        selectedSatelliteInfo = null;
	}
    function handleSatelliteClick(event: CustomEvent<SatelliteObject>) {
        selectedSatelliteInfo = event.detail;
    }

    function formatDateTime(isoString: string | undefined): string {
		if (!isoString) return 'N/A';
		try {
			return new Date(isoString).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
		} catch (e) { console.error("Error formatting date:", e); return 'Invalid Date'; }
	}
</script>

<main class="w-full">
	{#if error}
         <div class="px-4 sm:px-6 lg:px-8 pt-4"><ErrorMessage message={error} /></div>
	{:else if weather && interpretation}
		<div class="relative w-full">
			<div class="h-[calc(100vh-3rem)] w-full bg-black">
				<SatelliteGlobe
					radiationRiskLevel={interpretation.currentConditions.radiationStorm}
					orbitFilter={activeOrbitFilter}
					typeFilter={activeTypeFilter}
                    on:satelliteclick={handleSatelliteClick}
				/>
			</div>
            <div class="absolute top-4 left-4 z-10 opacity-90 hover:opacity-100 transition-opacity">
                <SatelliteFilter on:filterchange={handleFilterUpdate} />
            </div>
		</div>
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 px-4 sm:px-6 lg:px-8 py-6">
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
		<div class="px-4 sm:px-6 lg:px-8 pt-4"><LoadingSpinner message="Loading space weather data..." /></div>
	{/if}
    {#if selectedSatelliteInfo}
        <SatInfoPanel satellite={selectedSatelliteInfo} on:close={() => selectedSatelliteInfo = null} />
    {/if}
</main>

<style lang="postcss">
     :global(.relative > div > div[bind\:this] > canvas) {
         @apply block w-full h-full;
     }
</style>