<!-- src/lib/components/RiskIndicator.svelte -->
<!-- A reusable component to display a colored badge indicating a risk level. -->
<script lang="ts">
	// Prop defining the risk level. Accepts specific strings or any string (falls back to 'None').
	export let level: 'None' | 'Low' | 'Moderate' | 'High' | 'Severe' | 'Extreme' | string = 'None';
	// Prop to control the size of the badge ('small' or 'normal').
	export let size: 'small' | 'normal' = 'normal';

	// Reactive calculation: Determine the appropriate Tailwind CSS classes based on the level and size props.
	// This recalculates automatically whenever `level` or `size` changes.
	$: indicatorClasses = (() => {
		// Base classes common to both sizes (padding, text size, rounding)
		const base =
			size === 'small'
				? 'px-2 py-0.5 text-xs rounded' // Smaller padding, text, and rounding
				: 'px-3 py-1 text-sm rounded-md'; // Larger padding, text, and rounding

		// Determine color and font weight based on the risk level (case-insensitive)
		switch (
			level?.toLowerCase() // Use optional chaining and lowercase for robustness
		) {
			case 'extreme':
				return `${base} bg-red-600 text-white font-bold`; // Darkest red, white text, bold
			case 'severe':
				return `${base} bg-red-500 text-white font-semibold`; // Bright red, white text, semi-bold
			case 'high':
				return `${base} bg-orange-500 text-white font-medium`; // Orange, white text, medium weight
			case 'moderate':
				return `${base} bg-yellow-400 text-gray-800 font-medium`; // Yellow, dark text, medium weight
			case 'low':
				return `${base} bg-green-400 text-gray-800`; // Green, dark text, normal weight
			case 'none':
			default:
				return `${base} bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-100`; // Neutral gray, adjusts for dark mode
		}
	})(); // Immediately invoke the function to assign the result to indicatorClasses
</script>

<!-- The badge element itself, applying the dynamically calculated classes -->
<span class={indicatorClasses}>
	<!-- Display the level text, or 'N/A' if level is null/undefined -->
	{level || 'N/A'}
</span>
