<!-- src/routes/+layout.svelte -->
<script lang="ts">
	import '../app.postcss';
    import ThemeToggle from '$lib/components/ThemeToggle.svelte';
</script>

<!-- Добавляем классы для плавного перехода цвета фона -->
<div class="min-h-screen flex flex-col bg-gray-100 dark:bg-gray-900 transition-colors duration-300 ease-in-out">
	<header class="sticky top-0 z-30 bg-white dark:bg-gray-800 shadow-sm px-4 sm:px-6 lg:px-8 transition-colors duration-300 ease-in-out">
		<div class="flex justify-end items-center h-12">
			<ThemeToggle />
		</div>
	</header>

	<main class="flex-grow">
		<slot />
	</main>

	<footer class="text-center text-xs text-gray-400 dark:text-gray-500 py-4 mt-auto transition-colors duration-300 ease-in-out">
		Weather data from NASA DONKI API. TLE data from Celestrak. Interpretation is illustrative. Consult official sources.
	</footer>
</div>