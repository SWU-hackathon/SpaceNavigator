<script lang="ts">
	import { createEventDispatcher } from 'svelte';

    // Props received from the parent component
	export let formattedDate: string = '';
	export let isPaused: boolean = false;
	export let timeScale: number = 1; // Current time scale

    // Event dispatcher to send events up to the parent
	const dispatch = createEventDispatcher<{
		togglepause: void;          // Event when play/pause is clicked
		changespeed: number;      // Event to change speed (sends a factor or special code)
        settime: Date;            // Event to set the simulation time to a specific date
        setspeedlog: number;      // Event when the speed slider value changes (sends log10 value)
	}>();

    /** Handles input from the speed slider */
    function handleSpeedSlider(event: Event) {
        const target = event.target as HTMLInputElement;
        dispatch('setspeedlog', parseFloat(target.value));
    }

</script>

<div class="time-controls">
	<!-- Display the formatted date -->
	<div class="date-display">{formattedDate}</div>
	<!-- Buttons for controlling time -->
	<div class="buttons">
		<button on:click={() => dispatch('togglepause')}>{isPaused ? '▶️ Play' : '⏸️ Pause'}</button>
		<button on:click={() => dispatch('changespeed', 0.1)} title="Slower (x0.1)">⏪</button>
		<!-- Send 0 as a special code for 1x (real-time) -->
		<button on:click={() => dispatch('changespeed', 0)} title="Real time">1x</button>
		<!-- Send 1 as a special code for 1 hour/sec -->
		<button on:click={() => dispatch('changespeed', 1)} title="1 hour/sec">Hour</button>
		<!-- Send 2 as a special code for 1 day/sec -->
		<button on:click={() => dispatch('changespeed', 2)} title="1 day/sec">Day</button>
		<button on:click={() => dispatch('changespeed', 10)} title="Faster (x10)">⏩</button>
		<!-- Send the current real date -->
		<button on:click={() => dispatch('settime', new Date())} title="Current time">Now</button>
	</div>
	<!-- Slider for fine-grained speed control -->
	<div class="slider-container">
		<label for="speed-slider">Speed (log):</label>
		<input
			type="range"
			id="speed-slider"
			min="-2"
			max="9" 
			step="0.1"
            value={Math.log10(timeScale)}
			on:input={handleSpeedSlider}
            title={`~${(timeScale / (1000*60*60*24*365)).toFixed(1)} years/sec`}
		/>
		<!-- Display the current timeScale -->
		<span>{timeScale < 1000 ? timeScale.toFixed(2) : timeScale.toExponential(1)}x</span>
	</div>
</div>

<style>
	/* Styles copied from the previous +page.svelte */
    .time-controls {
        position: absolute;
        bottom: 10px;
        left: 50%;
        transform: translateX(-50%);
        background-color: rgba(0, 0, 0, 0.7); /* Slightly more transparent */
        color: white;
        padding: 8px 12px; /* Slightly smaller padding */
        border-radius: 8px;
        display: flex;
        flex-direction: column;
        align-items: center;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif; /* System font stack */
        font-size: 13px; /* Slightly smaller font */
        max-width: 95%;
        box-sizing: border-box;
        z-index: 10; /* Ensure it's above the canvas */
        box-shadow: 0 2px 5px rgba(0,0,0,0.3); /* Subtle shadow */
    }
    .date-display {
        margin-bottom: 6px;
        font-weight: 600; /* Semi-bold */
        min-width: 240px;
        text-align: center;
        background-color: rgba(255, 255, 255, 0.1); /* Slight background */
        padding: 3px 6px;
        border-radius: 4px;
    }
    .buttons button {
        background-color: #555; /* Darker gray */
        color: white;
        border: none;
        padding: 6px 10px;
        margin: 0 3px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 13px; /* Match container font */
        transition: background-color 0.2s ease; /* Smooth hover */
    }
    .buttons button:hover {
        background-color: #777;
    }
    .buttons button:active {
        background-color: #444;
    }
    .slider-container {
        display: flex;
        align-items: center;
        margin-top: 6px;
        width: 100%;
        max-width: 350px;
        justify-content: center;
    }
    .slider-container label {
        margin-right: 8px;
        white-space: nowrap;
    }
    .slider-container input[type="range"] {
       flex-grow: 1;
       margin: 0 8px;
       cursor: pointer;
       height: 5px; /* Make slider track thinner */
       background: #888; /* Track color */
       border-radius: 3px;
       accent-color: #eee; /* Thumb color */
    }
     .slider-container span {
        min-width: 65px; /* Adjust width */
        text-align: right;
        font-size: 12px; /* Smaller speed display */
        font-family: monospace; /* Monospace font for numbers */
     }
</style>