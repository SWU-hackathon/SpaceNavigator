<!-- src/lib/components/ErrorMessage.svelte -->
<script lang="ts">
    export let message: string = "An unknown error occurred.";
</script>

<div class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md shadow" role="alert">
    <p class="font-bold mb-1">Error Loading Data</p>
    <p>{message}</p>
</div>