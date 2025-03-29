<!-- src/lib/components/SatInfoPanel.svelte -->
<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	// Импортируем тип из SatelliteGlobe (убедись, что он экспортирован там)
	import type { SatelliteObject } from './SatelliteGlobe.svelte';

    // Используем импортированный или определим локально, если экспорт не удался
    // (В последней версии SatelliteGlobe.svelte тип SatelliteObject экспортируется)
	export let satellite: SatelliteObject; // Принимаем ПОЛНЫЙ объект SatelliteObject

	const dispatch = createEventDispatcher<{ close: void }>();

	function closePanel() {
		dispatch('close');
	}

    // Функция для генерации ссылки на NASA Worldview
    function generateWorldviewLink(): string | null {
        if (satellite.currentLatRad === undefined || satellite.currentLonRad === undefined) return null;
        const latDeg = satellite.currentLatRad * (180 / Math.PI);
        const lonDeg = satellite.currentLonRad * (180 / Math.PI);
        // Пример ссылки на Worldview (можно настроить дату, слои и т.д.)
        // Добавляем параметр &sm=true для боковой панели с информацией о слоях
        return `https://worldview.earthdata.nasa.gov/?p=geographic&l=VIIRS_SNPP_CorrectedReflectance_TrueColor(hidden),MODIS_Aqua_CorrectedReflectance_TrueColor(hidden),MODIS_Terra_CorrectedReflectance_TrueColor&t=today&z=5&lat=${latDeg.toFixed(4)}&lon=${lonDeg.toFixed(4)}&sm=true`;
    }

    // Рассчитаем высоту для отображения
    let altitudeKm: number | null = null;
    if (satellite.currentLatRad !== undefined && satellite.currentLonRad !== undefined) {
        // Пересчитаем высоту из ECI или возьмем из geodetic, если сохранили
        // Проще всего взять из satrec (это средняя высота, но достаточно для инфо)
        const meanMotionRadPerMin = satellite.satrec.no;
        if (meanMotionRadPerMin > 0) {
            const mu = 398600.4418; // km^3/s^2
            const meanMotionRadPerSec = meanMotionRadPerMin / 60;
            const semiMajorAxisKm = Math.cbrt(mu / (meanMotionRadPerSec * meanMotionRadPerSec));
            altitudeKm = semiMajorAxisKm - 6371; // Приблизительный реальный радиус Земли
        }
    }

</script>

<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40" on:click|self={closePanel}>
	<div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md m-4 relative">
		<button
			on:click={closePanel}
			class="absolute top-2 right-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full"
			aria-label="Close"
		>
			<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
				<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
			</svg>
		</button>

		<h3 class="text-xl font-semibold mb-3 text-gray-900 dark:text-gray-100">{satellite.name}</h3>
		<div class="text-sm space-y-2 text-gray-700 dark:text-gray-300">
			<p><strong>Type:</strong> <span class="font-medium">{satellite.details.type}</span></p>
			<p><strong>Orbit:</strong> <span class="font-medium">{satellite.orbitType}</span></p>
            {#if altitudeKm !== null}
                <p><strong>Approx. Altitude:</strong> <span class="font-medium">{altitudeKm.toFixed(0)} km</span></p>
            {/if}
			<p><strong>Description:</strong> {satellite.details.description || 'N/A'}</p>
            {#if satellite.details.hasCamera}
                <p class="text-green-600 dark:text-green-400"><strong>Camera Equipped</strong></p>
            {/if}
		</div>

        <!-- Кнопки действий -->
        <div class="mt-4 pt-4 border-t dark:border-gray-700 space-y-2">
            {#if satellite.details.type === 'ISS' && satellite.details.liveFeedUrl}
                <a
                    href={satellite.details.liveFeedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="block w-full text-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                    View ISS Live Stream (External)
                </a>
            {:else if satellite.details.hasCamera && satellite.details.type === 'Earth Observation'}
                 {@const worldviewLink = generateWorldviewLink()}
                 {#if worldviewLink}
                    <a
                        href={worldviewLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        class="block w-full text-center px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm font-medium"
                    >
                        Browse Imagery near Location (NASA Worldview)
                    </a>
                 {:else}
                      <p class="text-xs text-gray-500">Could not get current location for imagery link.</p>
                 {/if}
            {:else if satellite.details.type === 'Telescope'}
                 <p class="text-xs text-gray-500 italic">This is a space telescope, observing outwards.</p>
             {:else if satellite.details.hasCamera && satellite.details.type !== 'ISS'}
                 <p class="text-xs text-gray-500 italic">Specific live feed/imagery browser not available for this type.</p>
            {/if}
             <button
                on:click={closePanel}
                class="block w-full text-center px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-100 rounded hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors text-sm"
            >
                Close
            </button>
        </div>
	</div>
</div>