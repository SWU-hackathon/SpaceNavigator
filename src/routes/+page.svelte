<!-- src/routes/+page.svelte -->
<script lang="ts">
	import type { PageData } from './$types'; // Типы приходят из +page.ts

	// Импортируем компоненты
	import InterpretationCard from '$lib/components/InterpretationCard.svelte';
	import AerospaceImpact from '$lib/components/AerospaceImpact.svelte';
	import NotificationList from '$lib/components/NotificationList.svelte';
	import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
	import ErrorMessage from '$lib/components/ErrorMessage.svelte';
	import SatelliteGlobe from '$lib/components/SatelliteGlobe.svelte';
	import SatelliteFilter from '$lib/components/SatelliteFilter.svelte'; // Импортируем Фильтр
	// Импортируем типы фильтров ИЗ МОДУЛЯ ФИЛЬТРА
	import type { OrbitFilter, TypeFilter } from '$lib/components/SatelliteFilter.svelte';

	// Получаем данные (weatherData и error) из функции load в +page.ts
	export let data: PageData;

	// Реактивные переменные для удобства доступа к данным
	$: weather = data.weatherData;
	$: error = data.error;
	$: interpretation = data.weatherData?.interpretation;
	$: notifications = data.weatherData?.notifications;
	$: lastUpdated = data.weatherData?.lastUpdated;

	// --- Переменные для хранения активных фильтров ---
	let activeOrbitFilter: OrbitFilter = 'ALL';
	let activeTypeFilter: TypeFilter = 'ALL';

	// Функция для обновления фильтров при получении события от SatelliteFilter
	function handleFilterUpdate(event: CustomEvent<{ orbit: OrbitFilter; type: TypeFilter }>) {
		activeOrbitFilter = event.detail.orbit;
		activeTypeFilter = event.detail.type;
	}
    // ---------------------------------------------

	// Вспомогательная функция для форматирования даты/времени
	function formatDateTime(isoString: string | undefined): string {
		if (!isoString) return 'N/A';
		try {
			return new Date(isoString).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
		} catch (e) { console.error("Error formatting date:", e); return 'Invalid Date'; }
	}
</script>

<main class="container mx-auto p-4 sm:p-6 lg:p-8 max-w-7xl">
	<header class="mb-6">
		<h1 class="text-3xl md:text-4xl font-bold mb-2 text-gray-900 dark:text-gray-100">
			Space Weather & Satellite Tracker
		</h1>
		{#if lastUpdated}
			<p class="text-sm text-gray-500 dark:text-gray-400">
				Weather data last updated: {formatDateTime(lastUpdated)} (Data may be slightly delayed from source)
			</p>
		{/if}
	</header>

	{#if error}
		<ErrorMessage message={error} />
	{:else if weather && interpretation}
		<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
			<!-- Левая колонка -->
			<div class="lg:col-span-2 space-y-6">
				<InterpretationCard data={interpretation} />
				<AerospaceImpact data={interpretation.potentialImpacts} />

				<!-- --- ДОБАВЛЕН ФИЛЬТР --- -->
				<SatelliteFilter on:filterchange={handleFilterUpdate} />
				<!-- ------------------------ -->

				<!-- Секция с 3D Глобусом (передаем фильтры) -->
				<div class="mt-2">
					<h2 class="text-2xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
						Live Satellite Tracker (3D View)
					</h2>
					<!-- Используем #key для принудительного пересоздания глобуса при смене фильтра -->
                    <!-- Это гарантирует, что applyFilters сработает с новым prop ДО первой анимации -->
					<!-- {#key activeOrbitFilter + activeTypeFilter}-->
						<SatelliteGlobe
							radiationRiskLevel={interpretation.currentConditions.radiationStorm}
							orbitFilter={activeOrbitFilter}
							typeFilter={activeTypeFilter}
						/>
					<!-- {/key}-->
				</div>
			</div>

			<!-- Правая колонка -->
			<div class="lg:col-span-1">
				<div class="max-h-[80vh] lg:max-h-none sticky top-6">
					<NotificationList notifications={notifications} />
				</div>
			</div>
		</div>
	{:else}
		<LoadingSpinner message="Loading space weather data..." />
	{/if}
</main>

<footer class="text-center text-xs text-gray-400 dark:text-gray-500 py-4 mt-8">
	Weather data from NASA DONKI API. TLE data from Celestrak. Interpretation is illustrative. Consult official sources.
</footer>

<style lang="postcss">
	 :global(body) { @apply bg-gray-100 dark:bg-gray-900 transition-colors duration-200; }
	 @screen lg { .sticky { /* Стили для липкого блока */ } }
</style>