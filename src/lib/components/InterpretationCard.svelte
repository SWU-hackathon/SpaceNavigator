<!-- src/lib/components/InterpretationCard.svelte -->
<script lang="ts">
    import RiskIndicator from '$lib/components/RiskIndicator.svelte';
    import Tooltip from './Tooltip.svelte';

    // Типизация ожидаемых данных (обновленная структура)
    export let data: {
        currentConditions: {
            overallActivity: string;
            radioBlackouts: string;
            radiationStorm: string;
            auroraChanceMidLat: string;
            cmeIncoming: string;
            cmeDetails: string;
        };
        explanations: { // Добавляем пояснения
            aurora: string;
            cme: string;
            radiationStorm: string;
            radioBlackouts: string;
        }
    };

    // Определяем общий акцентный цвет карточки по самому высокому риску
    function getOverallRiskLevel(conditions: typeof data.currentConditions): string {
        const levels = [
            conditions.overallActivity,
            conditions.radioBlackouts,
            conditions.radiationStorm,
            conditions.cmeIncoming, // Учитываем и прогноз CME
        ];
        // Приоритет рисков от Extreme к None
        if (levels.some(l => l === 'Extreme')) return 'Extreme';
        if (levels.some(l => l === 'Severe')) return 'Severe';
        if (levels.some(l => l === 'High')) return 'High';
        if (levels.some(l => l === 'Moderate')) return 'Moderate';
        if (levels.some(l => l === 'Low')) return 'Low';
        return 'None';
    }

     function getBorderColorClass(level: string): string {
         switch (level?.toLowerCase()) {
            case 'extreme': return 'border-red-600';
            case 'severe': return 'border-red-500';
            case 'high': return 'border-orange-500';
            case 'moderate': return 'border-yellow-400';
            case 'low': return 'border-green-500';
            case 'none':
            default: return 'border-gray-400 dark:border-gray-600';
         }
     }

    $: overallRisk = getOverallRiskLevel(data.currentConditions);
    $: borderColorClass = getBorderColorClass(overallRisk);

</script>

<div class="bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden border-l-4 {borderColorClass}">
    <div class="p-5 sm:p-6">
        <h2 class="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
            Current Space Weather Conditions
        </h2>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
            <!-- Общая активность -->
            <div class="flex justify-between items-center border-b dark:border-gray-700 pb-2">
                <span class="text-gray-700 dark:text-gray-300 font-medium">
                    Geomagnetic Activity
                    <Tooltip text="Disturbance level of Earth's magnetic field, affecting power grids and causing auroras." />
                </span>
                <RiskIndicator level={data.currentConditions.overallActivity} />
            </div>

            <!-- Радиопомехи -->
            <div class="flex justify-between items-center border-b dark:border-gray-700 pb-2">
                 <span class="text-gray-700 dark:text-gray-300 font-medium">
                     Radio Blackout Risk
                     <Tooltip text={data.explanations.radioBlackouts} />
                 </span>
                <RiskIndicator level={data.currentConditions.radioBlackouts} />
            </div>

             <!-- Радиационный шторм -->
             <div class="flex justify-between items-center border-b dark:border-gray-700 pb-2">
                 <span class="text-gray-700 dark:text-gray-300 font-medium">
                     Radiation Storm Risk
                     <Tooltip text={data.explanations.radiationStorm} />
                 </span>
                <RiskIndicator level={data.currentConditions.radiationStorm} />
            </div>

            <!-- Шанс Авроры -->
            <div class="flex justify-between items-center border-b dark:border-gray-700 pb-2">
                <span class="text-gray-700 dark:text-gray-300 font-medium">
                    Aurora Chance (Mid-Lat)
                    <Tooltip text={data.explanations.aurora} />
                </span>
                <RiskIndicator level={data.currentConditions.auroraChanceMidLat} />
            </div>
        </div>

        <!-- Прогноз CME -->
        <div class="mt-4 pt-3 border-t dark:border-gray-700">
             <h3 class="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 flex items-center">
                 Incoming CME Forecast
                 <Tooltip text={data.explanations.cme} iconClass="ml-1 w-4 h-4"/>
                 <span class="ml-auto"><RiskIndicator level={data.currentConditions.cmeIncoming} size="small"/></span>
             </h3>
             <p class="text-sm text-gray-700 dark:text-gray-300">
                 {data.currentConditions.cmeDetails}
             </p>
        </div>
    </div>
</div>