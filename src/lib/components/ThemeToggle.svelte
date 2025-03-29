<!-- src/lib/components/ThemeToggle.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';

	// Тип для темы
	type Theme = 'light' | 'dark';

	// Состояние темы, начальное значение будет установлено в onMount
	let currentTheme: Theme | null = null;

	// Функция для переключения темы
	function toggleTheme() {
		const newTheme = currentTheme === 'light' ? 'dark' : 'light';
		applyTheme(newTheme);
	}

	// Функция для применения темы (устанавливает класс и сохраняет в localStorage)
	function applyTheme(theme: Theme) {
		if (typeof document !== 'undefined') {
			if (theme === 'dark') {
				document.documentElement.classList.add('dark');
			} else {
				document.documentElement.classList.remove('dark');
			}
			localStorage.setItem('theme', theme);
			currentTheme = theme; // Обновляем состояние компонента
            console.log('Theme applied:', theme);
		}
	}

	// При монтировании компонента проверяем localStorage или системные настройки
	onMount(() => {
        if (typeof window !== 'undefined') {
            const storedTheme = localStorage.getItem('theme') as Theme | null;
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

            if (storedTheme) {
                applyTheme(storedTheme);
            } else if (prefersDark) {
                applyTheme('dark');
            } else {
                applyTheme('light'); // По умолчанию светлая тема
            }

            // Слушаем изменения системной темы (опционально)
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            const systemThemeChangeHandler = (e: MediaQueryListEvent) => {
                // Переключаем только если тема не была выбрана пользователем вручную
                if (!localStorage.getItem('theme')) {
                    applyTheme(e.matches ? 'dark' : 'light');
                }
            };
            mediaQuery.addEventListener('change', systemThemeChangeHandler);

            // Очистка слушателя при размонтировании
            return () => {
                 mediaQuery.removeEventListener('change', systemThemeChangeHandler);
            }
        }
	});

</script>

{#if currentTheme}
	<button
		on:click={toggleTheme}
		class="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-900"
		aria-label="Toggle dark mode"
	>
		{#if currentTheme === 'light'}
			<!-- Иконка луны (Dark Mode) -->
			<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
				<path stroke-linecap="round" stroke-linejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
			</svg>
		{:else}
			<!-- Иконка солнца (Light Mode) -->
			<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
				<path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M12 5.25V3" />
                <path fill="currentColor" d="M12 15.75a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z" />
			</svg>
		{/if}
	</button>
{:else}
    <!-- Можно показать плейсхолдер пока тема не определена -->
     <div class="w-9 h-9"></div>
{/if}