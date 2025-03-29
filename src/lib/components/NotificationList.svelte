<!-- src/lib/components/NotificationList.svelte -->
<script lang="ts">
    // Типизация входных данных
    export let notifications: {
        messageType: string;
        messageID: string;
        messageURL?: string;
        messageIssueTime: string;
        messageBody: string;
    }[] | undefined | null;

     // Функция форматирования даты
     function formatDateTime(isoString: string | undefined): string {
        if (!isoString) return 'N/A';
        try {
            // Краткий формат времени и даты
            return new Date(isoString).toLocaleString(undefined, {
                month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'//, timeZoneName: 'short'
            });
        } catch (e) { return 'Invalid Date'; }
    }

    // Функция для получения цвета тега в зависимости от типа сообщения
    function getTypeColor(type: string): string {
        switch(type) {
            case 'FLR': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
            case 'SEP': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
            case 'GST': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
            case 'CMEAnalysis': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
            case 'Report': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
            default: return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
        }
    }

    // Обновленная функция для очистки тела сообщения
    function cleanMessageBody(body: string, type: string): { summary: string, full: string } {
        let cleaned = body;
        // Удаляем стандартные заголовки, которые часто есть в конце
        cleaned = cleaned.replace(/##\s*(Summary|Disclaimer|Notes|Potential\sImpacts)[\s\S]*/gi, '');
        // Удаляем начальные ## и заголовки типа "Activity ID" и т.д.
        cleaned = cleaned.replace(/^##\s*.*?##\s*$/gm, '').trim(); // Удаляет строки типа ## Activity ID: ... ##
        cleaned = cleaned.replace(/^##\s*.*?$/gm, '').trim(); // Удаляет остальные строки с ## в начале

        // Удаляем лишние переносы строк в начале и конце
        cleaned = cleaned.replace(/^\s*\n+/gm, '').trim();

        // Пытаемся извлечь ключевую информацию для некоторых типов
        let summary = cleaned;
        if (type === 'FLR') {
            const flareMatch = body.match(/(X|M|C|B|A)\d+(\.\d+)?\s*flare/i); // Ищем класс вспышки
            if (flareMatch) summary = `Solar Flare Detected: ${flareMatch[0]}`;
            else summary = cleaned.split('\n')[0]; // Если не нашли класс, берем первую строку
        } else if (type === 'GST') {
            const stormMatch = body.match(/Geomagnetic storm\s*(?:reaching|expected|observed)\s*(G\d+|Kp=\d+)/i); // Ищем уровень бури
             if (stormMatch) summary = `Geomagnetic Storm: ${stormMatch[1]}`;
             else summary = cleaned.split('\n')[0];
        } else if (type === 'SEP') {
             const sepMatch = body.match(/Solar radiation storm\s*(?:reaching|expected|observed)\s*(S\d+)/i); // Ищем уровень рад. шторма
             if (sepMatch) summary = `Radiation Storm: ${sepMatch[1]}`;
             else summary = cleaned.split('\n')[0];
        } else {
            // Для других типов берем первую строку
            summary = cleaned.split('\n')[0];
        }

        // Ограничиваем длину основного текста для превью
        summary = summary.length > 150 ? summary.substring(0, 147) + '...' : summary; // Обрезаем длинные строки

        // Убираем завершающие ## если они остались
        summary = summary.replace(/##\s*$/, '').trim();

        return { summary: summary || "See original report for details.", full: cleaned || body }; // Возвращаем и краткую и полную версию
    }
</script>

<div class="bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden h-full">
     <div class="p-5 sm:p-6 h-full flex flex-col">
        <h2 class="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
            Recent Notifications
        </h2>
        {#if notifications && notifications.length > 0}
            <ul class="space-y-4 overflow-y-auto flex-grow">
                {#each notifications as notification (notification.messageID)}
                    {@const cleaned = cleanMessageBody(notification.messageBody, notification.messageType)}
                    <li class="border-b border-gray-200 dark:border-gray-700 pb-3 last:border-b-0">
                        <div class="flex justify-between items-start mb-1 gap-2">
                            <span class="text-xs font-semibold px-2 py-0.5 rounded-full {getTypeColor(notification.messageType)}">
                                {notification.messageType}
                            </span>
                            <span class="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 whitespace-nowrap">
                                {formatDateTime(notification.messageIssueTime)}
                            </span>
                        </div>
                        <p class="text-sm text-gray-700 dark:text-gray-300 leading-snug mb-1">
                             {cleaned.summary} <!-- Отображаем краткую версию -->
                        </p>
                        {#if notification.messageURL}
                            <a href={notification.messageURL} target="_blank" rel="noopener noreferrer" class="text-xs text-blue-500 hover:underline hover:text-blue-700 dark:hover:text-blue-300 inline-block">
                                Original Report →
                            </a>
                            <!-- Можно добавить кнопку для показа полного текста cleaned.full, если нужно -->
                            <!-- <button on:click={() => alert(cleaned.full)} class="text-xs ml-2">[Details]</button> -->
                        {/if}
                    </li>
                {/each}
            </ul>
        {:else if notifications === null || notifications === undefined} <!-- Уточнено условие -->
             <p class="text-gray-500 dark:text-gray-400">Loading notifications...</p>
        {:else}
            <p class="text-gray-500 dark:text-gray-400">No relevant notifications found in the selected period.</p>
        {/if}
    </div>
</div>