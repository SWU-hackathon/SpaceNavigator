<!-- src/routes/+layout.svelte -->
<!-- This layout applies to all pages in the application. -->
<script lang="ts">
	// Import global styles defined in app.postcss
	import '../app.postcss';
	// Import the theme toggle component
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
</script>

<!--
  Root layout container:
  - min-h-screen: Ensures the layout takes at least the full viewport height.
  - flex flex-col: Arranges header, main, and footer vertically.
  - bg-gray-100 dark:bg-gray-900: Sets light/dark background colors.
  - transition-colors duration-300 ease-in-out: Smooth background color transition on theme change.
-->
<div
	class="flex min-h-screen flex-col bg-gray-100 transition-colors duration-300 ease-in-out dark:bg-gray-900"
>
	<!-- Sticky Header -->
	<header
		class="sticky top-0 z-30 bg-white px-4 shadow-sm transition-colors duration-300 ease-in-out dark:bg-gray-800 sm:px-6 lg:px-8"
	>
		<div class="flex h-12 items-center justify-end">
			<!-- Theme toggle button positioned to the right -->
			<ThemeToggle />
		</div>
	</header>

	<!-- Main content area where page content will be slotted in -->
	<main class="flex-grow">
		<slot />
		<!-- SvelteKit slots the current page component here -->
	</main>

	<!-- Footer section -->
	<footer
		class="mt-auto py-4 text-center text-xs text-gray-400 transition-colors duration-300 ease-in-out dark:text-gray-500"
	>
		<!-- Disclaimer about data sources -->
		Weather data from NASA DONKI API. TLE data from Celestrak. Interpretation is illustrative. Consult
		official sources.
	</footer>
</div>
