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
}

// Используем Record<string, SatelliteDetails> для лучшей типизации
export const knownSatellites: Record<string, SatelliteDetails> = {
	'25544': { // ISS (ZARYA)
		type: 'ISS',
		description: 'International Space Station',
		hasCamera: true
	},
	'20580': { // HUBBLE SPACE TELESCOPE (HST)
		type: 'Telescope',
		description: 'Hubble Space Telescope (observes space)',
		hasCamera: true // Технически это камера/телескоп
	},
	// --- Добавь сюда АКТУАЛЬНЫЕ ID и данные для других спутников с Celestrak ---
	// Пример (проверь ID!):
	// '43689': { // Sentinel-2B
	//     type: 'Earth Observation',
	//     description: 'Copernicus EO Satellite (Optical)',
	//     hasCamera: true
	// },
	// '46984': { // Landsat 9
	//      type: 'Earth Observation',
	//      description: 'Landsat Program EO Satellite',
	//      hasCamera: true
	//  },
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