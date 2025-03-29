<!-- src/routes/+page.svelte -->
<script lang="ts">
    import type { PageData } from './$types'; // Типы приходят из +page.ts

    // Импортируем компоненты
    import InterpretationCard from '$lib/components/InterpretationCard.svelte';
    import AerospaceImpact from '$lib/components/AerospaceImpact.svelte';
    import NotificationList from '$lib/components/NotificationList.svelte';
    import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
    import ErrorMessage from '$lib/components/ErrorMessage.svelte';
    import SatelliteGlobe from '$lib/components/SatelliteGlobe.svelte'; // Импортируем новый компонент

    // Получаем данные (weatherData и error) из функции load в +page.ts
    export let data: PageData;

    // Реактивные переменные для удобства доступа к данным
    $: weather = data.weatherData;
    $: error = data.error;
    $: interpretation = data.weatherData?.interpretation;
    $: notifications = data.weatherData?.notifications;
    $: lastUpdated = data.weatherData?.lastUpdated;

    // Вспомогательная функция для форматирования даты/времени
    function formatDateTime(isoString: string | undefined): string {
        if (!isoString) return 'N/A';
        try {
            return new Date(isoString).toLocaleString(undefined, {
                dateStyle: 'medium',
                timeStyle: 'short'
            });
        } catch (e) {
            console.error("Error formatting date:", e);
            return 'Invalid Date';
        }
    }
</script>

<main class="container mx-auto p-4 sm:p-6 lg:p-8 max-w-7xl">
    <header class="mb-6">
        <h1 class="text-3xl md:text-4xl font-bold mb-2 text-gray-900 dark:text-gray-100">
            Space Weather & Satellite Tracker
        </h1>
        {#if lastUpdated}
            <p class="text-sm text-gray-500 dark:text-gray-400">
                Weather data last updated: {formatDateTime(lastUpdated)} (Data may be slightly delayed from source)
            </p>
        {/if}
    </header>

    {#if error}
        <!-- Отображение ошибки загрузки данных о погоде -->
        <ErrorMessage message={error} />
    {:else if weather && interpretation}
        <!-- Основной контент, если данные о погоде успешно загружены -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Левая колонка (или верхняя на мобильных) -->
            <div class="lg:col-span-2 space-y-6">
                <!-- Карточка с основной интерпретацией погоды -->
                <InterpretationCard data={interpretation} />

                <!-- Карточка с влиянием погоды -->
                <AerospaceImpact data={interpretation.potentialImpacts} />

                <!-- Секция с 3D Глобусом Спутников -->
                <div class="mt-8">
                    <h2 class="text-2xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
                        Live Satellite Tracker (3D View)
                    </h2>
                    <!-- Передаем уровень радиационного риска в компонент глобуса -->
                    <SatelliteGlobe
                        radiationRiskLevel={interpretation.currentConditions.radiationStorm}
                        
                    />
                </div>

            </div>

            <!-- Правая колонка (или нижняя на мобильных) -->
            <div class="lg:col-span-1">
                <!-- Список последних уведомлений о погоде -->
                 <!-- Обертка для контроля высоты и прокрутки -->
                <div class="max-h-[80vh] lg:max-h-none sticky top-6"> <!-- Делаем блок уведомлений "липким" на больших экранах -->
                    <NotificationList notifications={notifications} />
                </div>
            </div>
        </div>

        <!-- Секция для отладки (можно закомментировать/удалить для финальной версии) -->
        <!--
        <details class="mt-10 bg-gray-50 dark:bg-gray-800 p-4 rounded border dark:border-gray-700">
            <summary class="cursor-pointer text-sm font-medium text-gray-600 dark:text-gray-400">
                Show Raw Weather Data (for Debugging)
            </summary>
            <pre class="mt-2 text-xs overflow-x-auto text-gray-800 dark:text-gray-200">
                {@html JSON.stringify(weather, null, 2)}
            </pre>
        </details>
        -->
    {:else}
        <!-- Состояние загрузки данных о погоде -->
        <LoadingSpinner message="Loading space weather data..." />
    {/if}
</main>

<footer class="text-center text-xs text-gray-400 dark:text-gray-500 py-4 mt-8">
    Weather data from NASA DONKI API. TLE data from Celestrak. Interpretation is illustrative. Consult official sources.
</footer>

<!-- Стили Tailwind применяются автоматически, но можно добавить глобальные стили ниже -->
<style lang="postcss">
     /* Стили для улучшения вида */
    :global(body) {
        @apply bg-gray-100 dark:bg-gray-900 transition-colors duration-200;
    }
    /* Стили для "липкого" блока уведомлений (только для больших экранов) */
    @screen lg {
        .sticky {
             /* Можно добавить max-height, если блок уведомлений слишком длинный */
             /* max-height: calc(100vh - 4rem); */
             /* overflow-y: auto; */ /* Добавить, если нужен скролл внутри блока */
         }
     }

</style>