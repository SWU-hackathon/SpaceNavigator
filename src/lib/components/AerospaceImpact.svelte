<!-- src/lib/components/AerospaceImpact.svelte -->
<script lang="ts">
    import RiskIndicator from './RiskIndicator.svelte'; // Импортируем индикатор (хотя здесь пока не используется напрямую)
    import Tooltip from './Tooltip.svelte'; // Импортируем тултип (здесь пока не используется напрямую)

    // Ожидаем обновленную структуру данных
    export let data: {
        satelliteOperations: string;
        aviationCommunication: string;
        powerGrids: string; // Добавили влияние на энергосети для общего пользователя
        humanSpaceflight: string;
    };

     // Функция для поиска и выделения уровня риска в тексте
     function highlightRisk(text: string): string {
         if (!text) return 'N/A';
         // Выделяем все уровни риска жирным шрифтом с цветом
         return text.replace(/(Extreme|Severe|High|Moderate|Low|None)/gi,
             (match) => {
                 const lowerMatch = match.toLowerCase();
                 let colorClass = 'text-green-600 dark:text-green-400 font-normal'; // Default: None
                 if (lowerMatch === 'low') colorClass = 'text-green-500 dark:text-green-400 font-medium';
                 else if (lowerMatch === 'moderate') colorClass = 'text-yellow-500 dark:text-yellow-400 font-semibold';
                 else if (lowerMatch === 'high') colorClass = 'text-orange-500 dark:text-orange-400 font-semibold';
                 else if (lowerMatch === 'severe') colorClass = 'text-red-500 dark:text-red-400 font-bold';
                 else if (lowerMatch === 'extreme') colorClass = 'text-red-600 dark:text-red-500 font-bold';
                 return `<strong class="${colorClass}">${match}</strong>`;
             }
         );
     }

     // Иконки (можно использовать SVG или библиотеку иконок)
     const icons = {
        satellite: '🛰️',
        aviation: '✈️',
        power: '⚡',
        astronaut: '👩‍🚀'
     }
</script>

<div class="bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden">
    <div class="p-5 sm:p-6">
        <h2 class="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
            Potential Impacts Explained
        </h2>
        <div class="space-y-5">
            <!-- Спутники -->
            <div class="flex items-start">
                 <span class="text-2xl mr-3 mt-1 flex-shrink-0">{icons.satellite}</span>
                 <div>
                     <h3 class="font-medium text-gray-700 dark:text-gray-200 mb-1">Satellite Operations</h3>
                     <p class="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{@html highlightRisk(data.satelliteOperations)}</p>
                 </div>
            </div>
             <!-- Авиация -->
             <div class="flex items-start">
                 <span class="text-2xl mr-3 mt-1 flex-shrink-0">{icons.aviation}</span>
                 <div>
                     <h3 class="font-medium text-gray-700 dark:text-gray-200 mb-1">Aviation & GPS</h3>
                     <p class="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{@html highlightRisk(data.aviationCommunication)}</p>
                 </div>
            </div>
             <!-- Энергосети -->
             <div class="flex items-start">
                  <span class="text-2xl mr-3 mt-1 flex-shrink-0">{icons.power}</span>
                 <div>
                     <h3 class="font-medium text-gray-700 dark:text-gray-200 mb-1">Power Grids</h3>
                     <p class="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{@html highlightRisk(data.powerGrids)}</p>
                 </div>
            </div>
             <!-- Космонавты -->
             <div class="flex items-start">
                 <span class="text-2xl mr-3 mt-1 flex-shrink-0">{icons.astronaut}</span>
                 <div>
                     <h3 class="font-medium text-gray-700 dark:text-gray-200 mb-1">Human Spaceflight</h3>
                     <p class="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{@html highlightRisk(data.humanSpaceflight)}</p>
                 </div>
            </div>
        </div>
    </div>
</div>