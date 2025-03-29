// src/routes/+page.ts
import type { PageLoad } from './$types';

// --- ОБНОВЛЕННЫЕ ТИПЫ ДАННЫХ ---
interface CurrentConditions {
    overallActivity: string;
    radioBlackouts: string;
    radiationStorm: string;
    auroraChanceMidLat: string;
    cmeIncoming: string;
    cmeDetails: string;
}

interface PotentialImpacts {
    satelliteOperations: string;
    aviationCommunication: string;
    powerGrids: string;
    humanSpaceflight: string;
}

interface Explanations {
     aurora: string;
     cme: string;
     radiationStorm: string;
     radioBlackouts: string;
}

interface InterpretationData {
    currentConditions: CurrentConditions;
    potentialImpacts: PotentialImpacts;
    explanations: Explanations;
}

interface NotificationData {
    messageType: string;
    messageID: string;
    messageURL?: string;
    messageIssueTime: string;
    messageBody: string; // Оставляем body для NotificationList
}

interface WeatherApiResponse {
    lastUpdated: string;
    notifications: NotificationData[];
    interpretation: InterpretationData;
}

interface LoadOutput {
    weatherData: WeatherApiResponse | null;
    error: string | null;
}
// --- КОНЕЦ ОБНОВЛЕННЫХ ТИПОВ ---


export const load: PageLoad<LoadOutput> = async ({ fetch }) => {
    console.log('[Page Load] Fetching data from /api/space-weather...');
    try {
        // Вызываем наш собственный бэкенд-эндпоинт
        const response = await fetch('/api/space-weather');

        if (!response.ok) {
             // Пытаемся прочитать сообщение об ошибке из JSON ответа сервера
             let errorMessage = `HTTP error! status: ${response.status}`;
             try {
                 const errorBody = await response.json();
                 errorMessage = errorBody.message || errorMessage;
             } catch {
                 // Если тело ответа не JSON, используем стандартное сообщение
             }
             console.error('[Page Load] API fetch error:', errorMessage);
             throw new Error(errorMessage);
        }

        const weatherData: WeatherApiResponse = await response.json();
        console.log('[Page Load] Data loaded successfully.');

        return {
            weatherData: weatherData,
            error: null
        };
    } catch (error: any) {
        console.error("[Page Load] Failed to load space weather data:", error);
        return {
            weatherData: null,
            error: error.message || "Could not load space weather data due to an unknown error."
        };
    }
};