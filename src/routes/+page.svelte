<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	// Import browser check from SvelteKit environment
	import { browser } from '$app/environment';
	// Import components and data
	import SolarSystemScene from '$lib/components/SolarSystemScene.svelte';
	import TimeControls from '$lib/components/TimeControls.svelte';
	// Import the data array AS solarSystemData (lowercase 's')
	import { solarSystemData } from '$lib/solarSystem/celestialData';
	// We are NOT using HORIZONS anymore in this version
	// import { getHorizonsVectors } from '$lib/solarSystem/horizonsUtils';
	// import type { HorizonsVector } from '$lib/solarSystem/celestialData';

	// --- Time State Variables ---
	let simulationTime = new Date(); // Holds the current date/time of the simulation
	let timeScale = 1000 * 60 * 60;   // Initial speed: 1 simulation hour per real second
	let isPaused = false;             // Flag to pause/resume the time progression
	let formattedDate = '';           // String to display the current simulation date
	// We don't fetch positions externally in this version
	// let celestialPositions: { [name: string]: HorizonsVector } | null = null;
	// let isLoadingPositions = false;

	// --- Variables for the time update loop ---
	let timeUpdateLoopId: number | null = null; // ID for canceling the requestAnimationFrame loop, initialized to null
	// We don't need a separate interval for positions in this version
	// let positionUpdateIntervalId: number | null = null;
	let lastTimestamp = 0;          // Timestamp of the previous frame for delta time calculation

	/** Updates the formattedDate string based on the current simulationTime */
	function updateFormattedDate() {
		formattedDate =
			simulationTime.toLocaleString('ru-RU', {
				// Use Russian locale for formatting
				year: 'numeric',
				month: 'long',
				day: 'numeric',
				hour: '2-digit',
				minute: '2-digit',
				second: '2-digit',
				timeZone: 'UTC' // IMPORTANT: Use UTC for calculations and display consistency
			}) + ' UTC';
	}

	/**
	 * The main loop for updating the simulation time using requestAnimationFrame.
	 * Runs independently of the Three.js render loop.
	 * @param timestamp - The timestamp provided by requestAnimationFrame.
	 */
	function timeUpdateLoop(timestamp: number) {
		// Only update time if not paused
		if (!isPaused) {
			// Calculate delta time since the last frame (in seconds)
			// Ensure lastTimestamp was set to avoid NaN on the first run after resuming
			const deltaTime = lastTimestamp > 0 ? (timestamp - lastTimestamp) / 1000 : 0;

			// Only calculate time increment if deltaTime is valid (not the first frame)
			if (deltaTime > 0) {
				const timeIncrement = deltaTime * timeScale; // milliseconds
				// Update the simulationTime state variable
				// This reactive change will be passed down to SolarSystemScene
				simulationTime = new Date(simulationTime.getTime() + timeIncrement);
				// Update the displayed date string
				updateFormattedDate();
			}
		}
		// Always update lastTimestamp for the next frame's calculation
		lastTimestamp = timestamp;

		// Request the next frame for this loop only if the loop ID is still valid (not cancelled)
		if (timeUpdateLoopId !== null) {
			timeUpdateLoopId = requestAnimationFrame(timeUpdateLoop);
		}
	}

	// --- Event Handlers from TimeControls component ---

	/** Toggles the paused state and manages the time update loop */
	function handleTogglePause() {
		isPaused = !isPaused;
		if (!isPaused) {
			// Reset timestamp when resuming to avoid large jump in deltaTime
			lastTimestamp = performance.now();
			// Ensure the loop is running if it was stopped (only in browser)
			if (browser && timeUpdateLoopId === null) {
				timeUpdateLoopId = requestAnimationFrame(timeUpdateLoop);
			}
		}
		// Optional: Stop the loop completely when paused to save resources,
		// but need to restart it in the !isPaused block above.
		// else {
		//     if (browser && timeUpdateLoopId !== null) {
		//        cancelAnimationFrame(timeUpdateLoopId);
		//        timeUpdateLoopId = null;
		//     }
		// }
	}

	/** Changes the timeScale based on button clicks (factor) or special codes */
	function handleChangeSpeed(event: CustomEvent<number>) {
		const factorOrCode = event.detail;
		switch (factorOrCode) {
			case 0: // Special code for 1x Real Time
				timeScale = 1;
				break;
			case 1: // Special code for 1 Hour/Sec
				timeScale = 1000 * 60 * 60;
				break;
			case 2: // Special code for 1 Day/Sec
				timeScale = 1000 * 60 * 60 * 24;
				break;
			default: // Apply multiplication factor
				timeScale *= factorOrCode;
				break;
		}
		// Clamp the timeScale to prevent extremely small or large values (optional)
		timeScale = Math.max(0.001, Math.min(timeScale, 10 ** 10));
	}

	/** Sets the simulationTime to a specific date (e.g., "Now" button) */
	function handleSetTime(event: CustomEvent<Date>) {
		simulationTime = event.detail;
		if (isPaused) {
			// Update the displayed date immediately if paused
			updateFormattedDate();
		}
		// Reset timestamp to prevent time jump after setting time, especially when resuming pause
		lastTimestamp = performance.now();
	}

	/** Handles changes from the speed slider (expects log10 value) */
	function handleSetSpeedLog(event: CustomEvent<number>) {
		const logValue = event.detail;
		timeScale = Math.pow(10, logValue); // Convert log10 value back to linear scale
		timeScale = Math.max(0.001, Math.min(timeScale, 10 ** 10)); // Clamp the result
	}

	// --- Svelte Lifecycle Functions ---

	/** Runs when the component is first added to the DOM */
	onMount(() => {
		// Ensure this code runs only in the browser environment
		if (browser) {
			updateFormattedDate(); // Set the initial date string display
			lastTimestamp = performance.now(); // Set the initial timestamp for the loop
			// Start the time update loop if it's not already running
			if (timeUpdateLoopId === null) {
				timeUpdateLoopId = requestAnimationFrame(timeUpdateLoop);
			}
		}
	});

	/** Runs when the component is about to be removed from the DOM */
	onDestroy(() => {
		// Ensure this code runs only in the browser environment
		if (browser && timeUpdateLoopId !== null) {
			// Stop the time update loop to prevent memory leaks and unnecessary processing
			cancelAnimationFrame(timeUpdateLoopId);
			timeUpdateLoopId = null; // Reset the ID
		}
	});
</script>

<main>
	<!-- The SolarSystemScene component handles the 3D rendering -->
	<!-- bind:simulationTime passes the current time down -->
	<!-- Pass the imported solarSystemData array to the component -->
	<!-- enableRotation is reactively controlled by the isPaused state -->
	<SolarSystemScene
		bind:simulationTime
		celestialData={solarSystemData}
		enableRotation={!isPaused}
	/>

	<!-- The TimeControls component displays the UI for time manipulation -->
	<!-- Pass current state values down as props -->
	<!-- Listen for events emitted from the component using on:eventname -->
	<TimeControls
		{formattedDate}
		{isPaused}
		{timeScale}
		on:togglepause={handleTogglePause}
		on:changespeed={handleChangeSpeed}
		on:settime={handleSetTime}
		on:setspeedlog={handleSetSpeedLog}
	/>

	<!-- Removed loading indicators related to HORIZONS -->
	<!-- {#if isLoadingPositions}
        <div class="loading-indicator">Updating positions...</div>
    {/if} -->
</main>

<style>
	main {
		position: relative; /* Establishes a positioning context for absolutely positioned children */
		width: 100%;
		height: 100dvh; /* Use dynamic viewport height for better mobile support */
		overflow: hidden; /* Prevent scrollbars if content overflows */
		background-color: #000; /* Base background color */
	}
	/* Removed loading indicator styles */
</style>