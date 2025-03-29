<!-- src/routes/+page.svelte -->
<!-- This is the main page component that displays the weather data and satellite globe. -->
<script lang="ts">
	import type { PageData } from './$types'; // Type for the data received from the load function
	import InterpretationCard from '$lib/components/InterpretationCard.svelte';
	import AerospaceImpact from '$lib/components/AerospaceImpact.svelte';
	import NotificationList from '$lib/components/NotificationList.svelte';
	import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
	import ErrorMessage from '$lib/components/ErrorMessage.svelte';
	import SatelliteGlobe, { type SatelliteObject } from '$lib/components/SatelliteGlobe.svelte';
	import SatInfoPanel from '$lib/components/SatInfoPanel.svelte'; // Panel to show details on click

	// Receive data from the load function in +page.ts
	export let data: PageData;

	// Reactive declarations: these variables update automatically when `data` changes
	$: weather = data.weatherData; // The main weather data object
	$: error = data.error; // Any error message from loading
	$: interpretation = data.weatherData?.interpretation; // Extracted interpretation data
	$: notifications = data.weatherData?.notifications; // Array of notifications
	$: lastUpdated = data.weatherData?.lastUpdated; // Timestamp of last update

	// State for the satellite information panel
	let selectedSatelliteInfo: SatelliteObject | null = null; // Holds the data of the clicked satellite

	// Event handler for when a satellite is clicked on the globe
	function handleSatelliteClick(event: CustomEvent<SatelliteObject>) {
		selectedSatelliteInfo = event.detail; // Set the selected satellite to show the info panel
	}

	// Helper function to format ISO date strings into a readable local format
	function formatDateTime(isoString: string | undefined): string {
		if (!isoString) return 'N/A'; // Handle undefined input
		try {
			// Use Intl.DateTimeFormat via toLocaleString for locale-aware formatting
			return new Date(isoString).toLocaleString(undefined, {
				dateStyle: 'medium', // e.g., "Sep 4, 2023"
				timeStyle: 'short' // e.g., "2:30 PM"
			});
		} catch (e) {
			console.error('Error formatting date:', isoString, e);
			return 'Invalid Date'; // Handle potential errors during date parsing/formatting
		}
	}
</script>

<!-- Main container for the page content -->
<!-- mx-auto centers the container, p-* adds padding, max-w-7xl limits width -->
<main class="container relative mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
	<!-- Page Header -->
	<header class="mb-6">
		<h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100 md:text-4xl">
			Space Weather & Satellite Tracker
		</h1>
		<!-- Display last updated time if available -->
		{#if lastUpdated}
			<p class="text-sm text-gray-500 dark:text-gray-400">
				Weather data last updated: {formatDateTime(lastUpdated)}
			</p>
		{/if}
	</header>

	<!-- Conditional rendering based on loading state and errors -->
	{#if error}
		<!-- Show error message if data loading failed -->
		<ErrorMessage message={error} />
	{:else if weather && interpretation}
		<!-- Display content if data loaded successfully -->

		<!-- Section for the Satellite Globe -->
		<div class="relative mb-6">
			<!-- Container for the globe: fixed height, full width, styling -->
			<div
				class="h-[75vh] w-full overflow-hidden rounded-lg border bg-black shadow-lg dark:border-gray-700"
			>
				<SatelliteGlobe
					radiationRiskLevel={interpretation.currentConditions.radiationStorm}
					on:satelliteclick={handleSatelliteClick}
				/>
			</div>
			<!-- Satellite Filter component is now INSIDE SatelliteGlobe -->
		</div>

		<!-- Section for displaying weather interpretation and notifications -->
		<!-- Uses a grid layout: 1 column on small screens, 3 columns on large screens -->
		<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
			<!-- Left column(s) for interpretation and impacts -->
			<div class="space-y-6 lg:col-span-2">
				<InterpretationCard data={interpretation} />
				<AerospaceImpact data={interpretation.potentialImpacts} />
			</div>
			<!-- Right column for notifications -->
			<div class="lg:col-span-1">
				<div>
					<NotificationList {notifications} />
				</div>
			</div>
		</div>
	{:else}
		<!-- Show loading spinner while data is being fetched -->
		<LoadingSpinner message="Loading space weather data..." />
	{/if}

	<!-- Satellite Info Panel (conditionally rendered) -->
	{#if selectedSatelliteInfo}
		<SatInfoPanel
			satellite={selectedSatelliteInfo}
			on:close={() => (selectedSatelliteInfo = null)}
		/>
	{/if}
</main>

<!-- Global styles using PostCSS syntax within <style> block -->
<style lang="postcss">
	/* Ensure the body always has a scrollbar to prevent layout shifts */
	:global(body) {
		overflow-y: scroll;
	}
	/* Target the canvas element inside SatelliteGlobe to ensure it fills its container */
	/* This might be brittle if the DOM structure changes significantly */
	:global(.relative > div > div[bind\:this] > canvas) {
		@apply block h-full w-full;
	}
</style>
