// src/lib/satellite-info.ts

/**
 * Базовая информация о некоторых известных спутниках.
 * Ключ - NORAD ID (в виде строки).
 * Значение - объект с типом и описанием.
 */

export interface SatelliteDetails {
	type: 'ISS' | 'Telescope' | 'Earth Observation' | 'Weather' | 'Communication' | 'Navigation' | 'Unknown';
	description: string;
	hasCamera?: boolean; // Флаг наличия камеры
	liveFeedUrl?: string; // Поле для прямой ссылки на стрим (только для МКС)
}

// Используем Record<string, SatelliteDetails> для лучшей типизации
export const knownSatellites: Record<string, SatelliteDetails> = {
	'25544': { // ISS (ZARYA)
		type: 'ISS',
		description: 'International Space Station',
		hasCamera: true,
		// Пример URL HDEV (проверь актуальность!)
		liveFeedUrl: 'https://eol.jsc.nasa.gov/ESRS/HDEV/'
        // Или ссылка на NASA TV: 'https://www.nasa.gov/nasatv'
	},
	'20580': { // HUBBLE SPACE TELESCOPE (HST)
		type: 'Telescope',
		description: 'Hubble Space Telescope (observes space)',
		hasCamera: true // Не земная камера
	},
	// --- Добавь сюда АКТУАЛЬНЫЕ ID и данные для других спутников с Celestrak ---
    // Пример Landsat 9 (проверь ID!)
	'56147': { // Примерный ID для Landsat 9, УТОЧНИ!
         type: 'Earth Observation',
         description: 'Landsat 9 EO Satellite',
         hasCamera: true
     },
    // Пример Sentinel-2B (проверь ID!)
    '43689': { // ID может быть неверным
        type: 'Earth Observation',
        description: 'Copernicus Sentinel-2B (Optical)',
        hasCamera: true
    },
    // Добавь еще... NOAA-20, GOES-16/17/18, etc.
    // 'xxxxx': { type: 'Weather', description: 'GOES-18 Weather Satellite', hasCamera: true },
};

// Функция для получения деталей спутника по ID
export function getSatelliteDetails(noradId: string): SatelliteDetails {
	// Возвращаем детали если найдены, иначе объект 'Unknown'
	return knownSatellites[noradId] || {
		type: 'Unknown',
		description: 'Unknown or unclassified satellite',
		hasCamera: false // По умолчанию камеры нет
	};
}