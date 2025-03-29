<!-- src/lib/components/LoadingSpinner.svelte -->
<script lang="ts">
    export let message: string = "Loading...";
</script>

<div class="flex flex-col justify-center items-center h-60 text-center">
    <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
    <p class="text-lg text-gray-600 dark:text-gray-300">{message}</p>
</div>