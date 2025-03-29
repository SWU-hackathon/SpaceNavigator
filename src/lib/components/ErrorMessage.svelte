<!-- src/lib/components/ErrorMessage.svelte -->
<!-- A simple component to display error messages in a styled alert box. -->
<script lang="ts">
	// Prop for the error message text. Defaults to a generic message.
	export let message: string = 'An unknown error occurred.';
</script>

<!-- Alert box styling using Tailwind CSS -->
<div class="rounded-md border-l-4 border-red-500 bg-red-100 p-4 text-red-700 shadow" role="alert">
	<!-- Optional title for the error message -->
	<p class="mb-1 font-bold">Error Loading Data</p>
	<!-- The actual error message passed via the prop -->
	<p>{message}</p>
</div>
