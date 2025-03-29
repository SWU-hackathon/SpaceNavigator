<!-- src/lib/components/ThemeToggle.svelte -->
<!-- A simple button component to toggle between light and dark themes. -->
<!-- It uses localStorage to remember the user's preference and respects system preference initially. -->
<script lang="ts">
	import { onMount } from 'svelte';

	// Define the possible theme states
	type Theme = 'light' | 'dark';

	// Reactive variable to hold the current theme. Initialized to null until determined in onMount.
	let currentTheme: Theme | null = null;

	/**
	 * Toggles the theme between light and dark.
	 */
	function toggleTheme() {
		const newTheme = currentTheme === 'light' ? 'dark' : 'light';
		applyTheme(newTheme);
	}

	/**
	 * Applies the specified theme:
	 * - Adds/removes the 'dark' class to the HTML document element.
	 * - Saves the preference to localStorage.
	 * - Updates the component's `currentTheme` state.
	 * @param theme The theme to apply ('light' or 'dark').
	 */
	function applyTheme(theme: Theme) {
		// Ensure this code runs only in the browser where `document` and `localStorage` are available.
		if (typeof document !== 'undefined' && typeof localStorage !== 'undefined') {
			// Add or remove the 'dark' class from the root <html> element
			if (theme === 'dark') {
				document.documentElement.classList.add('dark');
			} else {
				document.documentElement.classList.remove('dark');
			}
			// Store the chosen theme in localStorage for persistence
			localStorage.setItem('theme', theme);
			// Update the local state to reflect the change (triggers UI update)
			currentTheme = theme;
			console.log('Theme applied:', theme);
		}
	}

	// `onMount` runs only in the browser after the component has been added to the DOM.
	onMount(() => {
		// Check if running in a browser context
		if (
			typeof window !== 'undefined' &&
			typeof localStorage !== 'undefined' &&
			typeof document !== 'undefined'
		) {
			// 1. Check localStorage for a previously saved theme preference.
			const storedTheme = localStorage.getItem('theme') as Theme | null;

			// 2. Check the user's system preference (prefers-color-scheme media query).
			const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

			// Determine the initial theme based on priority: stored > system > default (light)
			if (storedTheme) {
				applyTheme(storedTheme); // Apply saved theme
			} else if (prefersDark) {
				applyTheme('dark'); // Apply system preference if dark
			} else {
				applyTheme('light'); // Default to light theme
			}

			// --- Optional: Listen for system theme changes ---
			// If the user hasn't explicitly chosen a theme (no 'theme' in localStorage),
			// this allows the site to automatically switch if the system theme changes.
			const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
			const systemThemeChangeHandler = (e: MediaQueryListEvent) => {
				// Only change if the user hasn't manually set a theme via the button
				if (!localStorage.getItem('theme')) {
					applyTheme(e.matches ? 'dark' : 'light');
				}
			};
			mediaQuery.addEventListener('change', systemThemeChangeHandler);

			// Cleanup function: Remove the event listener when the component is destroyed.
			return () => {
				mediaQuery.removeEventListener('change', systemThemeChangeHandler);
			};
		}
		// Return undefined if not in browser (SSR) or listener setup failed
		return undefined;
	});
</script>

<!-- Only render the button once the theme has been determined -->
{#if currentTheme}
	<button
		on:click={toggleTheme}
		class="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:text-gray-400 dark:hover:bg-gray-700 dark:focus:ring-offset-gray-900"
		aria-label="Toggle dark mode"
		title="Toggle light/dark theme"
	>
		{#if currentTheme === 'light'}
			<!-- Moon Icon for switching to Dark Mode -->
			<svg
				xmlns="http://www.w3.org/2000/svg"
				fill="none"
				viewBox="0 0 24 24"
				stroke-width="1.5"
				stroke="currentColor"
				class="h-5 w-5"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"
				/>
			</svg>
		{:else}
			<!-- Sun Icon for switching to Light Mode -->
			<svg
				xmlns="http://www.w3.org/2000/svg"
				fill="none"
				viewBox="0 0 24 24"
				stroke-width="1.5"
				stroke="currentColor"
				class="h-5 w-5"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M12 5.25V3"
				/>
				<!-- Simple solid sun center -->
				<path fill="currentColor" d="M12 15.75a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z" />
			</svg>
		{/if}
	</button>
{:else}
	<!-- Placeholder: Render an empty div with the same size while the theme is being determined. -->
	<!-- This prevents layout shift during initial load. -->
	<div class="h-9 w-9" aria-hidden="true"></div>
{/if}
