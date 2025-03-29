<!-- src/lib/components/RiskIndicator.svelte -->
<script lang="ts">
    export let level: 'None' | 'Low' | 'Moderate' | 'High' | 'Severe' | 'Extreme' | string = 'None'; // Принимаем уровень риска
    export let size: 'small' | 'normal' = 'normal'; // Размер индикатора

    // Определяем Tailwind классы для цвета фона и текста
    $: indicatorClasses = (() => {
        const base = size === 'small' ? 'px-2 py-0.5 text-xs rounded' : 'px-3 py-1 text-sm rounded-md';
        switch (level?.toLowerCase()) {
            case 'extreme': return `${base} bg-red-600 text-white font-bold`;
            case 'severe': return `${base} bg-red-500 text-white font-semibold`;
            case 'high': return `${base} bg-orange-500 text-white font-medium`;
            case 'moderate': return `${base} bg-yellow-400 text-gray-800 font-medium`;
            case 'low': return `${base} bg-green-400 text-gray-800`;
            case 'none':
            default: return `${base} bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-100`;
        }
    })();
</script>

<span class={indicatorClasses}>
    {level || 'N/A'}
</span>