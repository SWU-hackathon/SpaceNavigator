
<script lang="ts">
	import type { PageData } from './$types';
	import InterpretationCard from '$lib/components/InterpretationCard.svelte';
	import AerospaceImpact from '$lib/components/AerospaceImpact.svelte';
	import NotificationList from '$lib/components/NotificationList.svelte';
	import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
	import ErrorMessage from '$lib/components/ErrorMessage.svelte';
	import SatelliteGlobe, { type SatelliteObject } from '$lib/components/SatelliteGlobe.svelte'; // Импортируем тип SatelliteObject
	import SatelliteFilter from '$lib/components/SatelliteFilter.svelte';
	import type { OrbitFilter, TypeFilter } from '$lib/components/SatelliteFilter.svelte';
    // --- ИМПОРТ ПАНЕЛИ ИНФОРМАЦИИ ---
    import SatInfoPanel from '$lib/components/SatInfoPanel.svelte';
    // --------------------------------

	export let data: PageData;
	$: weather = data.weatherData; $: error = data.error; $: interpretation = data.weatherData?.interpretation;
	$: notifications = data.weatherData?.notifications; $: lastUpdated = data.weatherData?.lastUpdated;

	let activeOrbitFilter: OrbitFilter = 'ALL';
	let activeTypeFilter: TypeFilter = 'ALL';

	// --- СОСТОЯНИЕ ДЛЯ ВЫБРАННОГО СПУТНИКА ---
    let selectedSatelliteInfo: SatelliteObject | null = null;
    // -----------------------------------------

	function handleFilterUpdate(event: CustomEvent<{ orbit: OrbitFilter; type: TypeFilter }>) {
		activeOrbitFilter = event.detail.orbit;
		activeTypeFilter = event.detail.type;
        selectedSatelliteInfo = null; // Сбрасываем выбор при смене фильтра
	}

    // --- ОБРАБОТЧИК КЛИКА НА СПУТНИК ---
    function handleSatelliteClick(event: CustomEvent<SatelliteObject>) {
        selectedSatelliteInfo = event.detail;
    }
    // ---------------------------------

	function formatDateTime(isoString: string | undefined): string { /* ... */ }
</script>

<!-- Убрали padding из main, чтобы глобус был шире -->
<main class="container mx-auto max-w-none px-0 sm:px-0 lg:px-0 relative">
	<header class="mb-2 px-4 sm:px-6 lg:px-8"> <!-- Вернули padding для заголовка -->
		<h1 class="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">
			Space Weather & Satellite Tracker
		</h1>
		{#if lastUpdated}
			<p class="text-xs text-gray-500 dark:text-gray-400">
				Weather data last updated: {formatDateTime(lastUpdated)}
			</p>
		{/if}
	</header>

	{#if error}
         <div class="px-4 sm:px-6 lg:px-8"><ErrorMessage message={error} /></div>
	{:else if weather && interpretation}
		<!-- Секция с глобусом и фильтром -->
		<div class="relative mb-6">
			<!-- 3D Глобус (увеличена высота) -->
			<div class="h-[65vh] md:h-[75vh] lg:h-[80vh] bg-black"> <!-- Добавил bg-black на случай просвечивания -->
				<SatelliteGlobe
					radiationRiskLevel={interpretation.currentConditions.radiationStorm}
					orbitFilter={activeOrbitFilter}
					typeFilter={activeTypeFilter}
                    on:satelliteclick={handleSatelliteClick}
				/>
			</div>
             <!-- Фильтр (позиционируется абсолютно над глобусом) -->
            <div class="absolute top-4 left-4 z-10 opacity-90 hover:opacity-100 transition-opacity">
                <SatelliteFilter on:filterchange={handleFilterUpdate} />
            </div>
		</div>

        <!-- Секция с информацией о погоде и уведомлениями (под глобусом, с padding) -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 px-4 sm:px-6 lg:px-8">
             <div class="lg:col-span-2 space-y-6">
				<InterpretationCard data={interpretation} />
				<AerospaceImpact data={interpretation.potentialImpacts} />
			</div>
            <div class="lg:col-span-1">
                 <div class="max-h-[80vh] lg:max-h-none sticky top-6">
					<NotificationList notifications={notifications} />
				</div>
            </div>
        </div>

	{:else}
		<div class="px-4 sm:px-6 lg:px-8"><LoadingSpinner message="Loading space weather data..." /></div>
	{/if}

    <!-- --- УСЛОВНОЕ ОТОБРАЖЕНИЕ ПАНЕЛИ ИНФОРМАЦИИ --- -->
    {#if selectedSatelliteInfo}
        <SatInfoPanel
            satellite={selectedSatelliteInfo}
            on:close={() => selectedSatelliteInfo = null}
        />
    {/if}
    <!-- ------------------------------------------- -->

</main>

<footer class="text-center text-xs text-gray-400 dark:text-gray-500 py-4 mt-8"> Weather data from NASA DONKI API. TLE data from Celestrak. Interpretation is illustrative. Consult official sources. </footer>

<style lang="postcss">
	 :global(body) { @apply bg-gray-100 dark:bg-gray-900 transition-colors duration-200; }
	 @screen lg { .sticky { /* ... */ } }
     /* Убедимся, что canvas растягивается */
     :global(.relative > div > canvas) {
         @apply w-full h-full;
     }
</style>