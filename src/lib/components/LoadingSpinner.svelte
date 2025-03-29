<!-- src/lib/components/LoadingSpinner.svelte -->
<!-- A simple loading indicator component. -->
<script lang="ts">
	// Prop for the message displayed below the spinner. Defaults to "Loading...".
	export let message: string = 'Loading...';
</script>

<!-- Centered container for the spinner and message -->
<div class="flex h-60 flex-col items-center justify-center p-4 text-center">
	<!-- Animated spinning circle using Tailwind CSS classes -->
	<div
		class="mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-blue-500"
		role="status"
		aria-label="Loading"
	></div>
	<!-- Loading message text -->
	<p class="text-lg text-gray-600 dark:text-gray-300">{message}</p>
</div>
