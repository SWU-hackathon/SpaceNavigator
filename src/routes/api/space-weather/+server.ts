// src/routes/api/space-weather/+server.ts
import { json, error as serverError } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Безопасно получаем ключ из переменных окружения
const apiKey = import.meta.env.VITE_NASA_API_KEY;

// Константы API
const NASA_DONKI_URL = 'https://api.nasa.gov/DONKI';
const DEFAULT_START_DATE_OFFSET_DAYS = 2; // Запрашиваем данные за последние N дней

// Типизация для ответа от NASA DONKI (можно расширить при необходимости)
interface DonkiNotification {
    messageType: string;
    messageID: string;
    messageURL?: string;
    messageIssueTime: string;
    messageBody: string;
}

// Вспомогательная функция для получения дат
function getQueryDates(offsetDays: number): { startDate: string; endDate: string } {
    const today = new Date();
    const pastDate = new Date(today);
    pastDate.setDate(today.getDate() - offsetDays);

    const formatDate = (date: Date): string => date.toISOString().split('T')[0];

    return {
        startDate: formatDate(pastDate),
        endDate: formatDate(today),
    };
}

// Обработчик GET-запросов к /api/space-weather
export const GET: RequestHandler = async ({ fetch, setHeaders }) => {
    // Проверка наличия API ключа
    if (!apiKey || apiKey === 'СЮДА_ВСТАВЬ_СВОЙ_РЕАЛЬНЫЙ_NASA_API_КЛЮЧ' || apiKey.length < 10) {
        console.error('ERROR: VITE_NASA_API_KEY is not configured correctly in .env');
        throw serverError(500, 'Server configuration error: NASA API Key missing or invalid.');
    }

    const { startDate, endDate } = getQueryDates(DEFAULT_START_DATE_OFFSET_DAYS);
    const apiUrl = `${NASA_DONKI_URL}/notifications?startDate=${startDate}&endDate=${endDate}&type=all&api_key=${apiKey}`;

    try {
        console.log(`[API SpaceWeather] Fetching DONKI data for ${startDate} to ${endDate}`);
        const response = await fetch(apiUrl);

        if (!response.ok) {
            let errorDetails = `Status: ${response.status} ${response.statusText}`;
            try {
                const errorBody = await response.json();
                errorDetails += ` - ${JSON.stringify(errorBody)}`;
            } catch {
                errorDetails += ` - ${await response.text()}`;
            }
            console.error(`[API SpaceWeather] NASA API Error: ${errorDetails}`);
            throw serverError(response.status, `Failed to fetch data from NASA DONKI API. ${errorDetails}`);
        }

        const notifications: DonkiNotification[] = await response.json();
        console.log(`[API SpaceWeather] Received ${notifications.length} notifications from DONKI.`);

        // --- ИНТЕРПРЕТАЦИЯ ДАННЫХ (УПРОЩЕННАЯ ВЕРСИЯ) ---
        let geoActivityLevel = 'Low';
        let radioBlackoutLevel = 'None';
        let radiationStormLevel = 'None';
        let auroraPossibility = 'Low';
        let satelliteRisk = 'Low';

        const latestGst = notifications.find(n => n.messageType === 'GST');
        if (latestGst) {
            const body = latestGst.messageBody.toLowerCase();
            if (body.includes('g5') || body.includes('kp=9')) { geoActivityLevel = 'Extreme'; auroraPossibility = 'High'; satelliteRisk = 'Severe'; }
            else if (body.includes('g4') || body.includes('kp=8')) { geoActivityLevel = 'Severe'; auroraPossibility = 'High'; satelliteRisk = 'High'; }
            else if (body.includes('g3') || body.includes('kp=7')) { geoActivityLevel = 'High'; auroraPossibility = 'Moderate'; satelliteRisk = 'High'; }
            else if (body.includes('g2') || body.includes('kp=6')) { geoActivityLevel = 'Moderate'; auroraPossibility = 'Low'; satelliteRisk = 'Moderate'; }
            else if (body.includes('g1') || body.includes('kp=5')) { geoActivityLevel = 'Moderate'; auroraPossibility = 'Low'; satelliteRisk = 'Moderate'; }
            else if (body.includes('active') || body.includes('kp=4')) { geoActivityLevel = 'Low'; satelliteRisk = 'Low'; }
            else { geoActivityLevel = 'Low'; }
        }

        const latestFlr = notifications.find(n => n.messageType === 'FLR');
        if (latestFlr) {
            const body = latestFlr.messageBody.toUpperCase();
             if (body.includes('R5')) { radioBlackoutLevel = 'Extreme'; satelliteRisk = satelliteRisk > 'Moderate' ? satelliteRisk : 'High'; }
             else if (body.includes('R4')) { radioBlackoutLevel = 'Severe'; satelliteRisk = satelliteRisk > 'Moderate' ? satelliteRisk : 'High'; }
             else if (body.includes('R3')) { radioBlackoutLevel = 'High'; satelliteRisk = satelliteRisk > 'Low' ? satelliteRisk : 'Moderate'; }
             else if (body.includes('R2')) { radioBlackoutLevel = 'Moderate'; }
             else if (body.includes('R1')) { radioBlackoutLevel = 'Low'; }
        }

         const latestSep = notifications.find(n => n.messageType === 'SEP');
         if (latestSep) {
             const body = latestSep.messageBody.toUpperCase();
             if (body.includes('S5')) { radiationStormLevel = 'Extreme'; satelliteRisk = 'Severe'; }
             else if (body.includes('S4')) { radiationStormLevel = 'Severe'; satelliteRisk = 'Severe'; }
             else if (body.includes('S3')) { radiationStormLevel = 'High'; satelliteRisk = satelliteRisk > 'High' ? satelliteRisk : 'High'; }
             else if (body.includes('S2')) { radiationStormLevel = 'Moderate'; satelliteRisk = satelliteRisk > 'Moderate' ? satelliteRisk : 'Moderate'; }
             else if (body.includes('S1')) { radiationStormLevel = 'Low'; satelliteRisk = satelliteRisk > 'Low' ? satelliteRisk : 'Low'; }
         }

        const latestCmeAnalysis = notifications.find(n => n.messageType === 'CMEAnalysis');
        let cmeForecast = 'No significant Earth-directed CME detected recently.';
        let cmeRisk = 'Low';
        if (latestCmeAnalysis && latestCmeAnalysis.messageBody.toLowerCase().includes('is expected to arrive at earth')) {
             cmeForecast = 'Earth-directed CME detected. Potential increase in geomagnetic activity possible within 1-4 days.';
             cmeRisk = 'Moderate';
        }

        const interpretation = {
             currentConditions: {
                 overallActivity: geoActivityLevel,
                 radioBlackouts: radioBlackoutLevel,
                 radiationStorm: radiationStormLevel,
                 auroraChanceMidLat: auroraPossibility,
                 cmeIncoming: cmeRisk,
                 cmeDetails: cmeForecast
             },
             potentialImpacts: {
                 satelliteOperations: `Overall Risk: ${satelliteRisk}. High activity may increase drag & cause charging issues. Radiation can damage components.`,
                 aviationCommunication: `HF Radio Risk: ${radioBlackoutLevel}. High latitude flights may experience communication/navigation issues during ${geoActivityLevel} or ${radiationStormLevel} events.`,
                 powerGrids: `Risk during ${geoActivityLevel} activity: Minor impacts possible at Moderate levels, increasing significantly at High/Severe/Extreme levels.`,
                 humanSpaceflight: `Radiation exposure risk mainly during ${radiationStormLevel} events (Levels: ${radiationStormLevel}). Monitor EVA schedules.`
             },
             explanations: {
                aurora: "Indicates the chance of seeing auroras (Northern/Southern Lights) away from the poles.",
                cme: "Coronal Mass Ejections (CMEs) are large expulsions of plasma from the Sun. If Earth-directed, they can cause geomagnetic storms 1-4 days later.",
                radiationStorm: "Increased levels of energetic particles from the Sun, posing a risk to astronauts and sensitive electronics, especially satellites.",
                radioBlackouts: "Solar flares can disrupt High Frequency (HF) radio communications on the sunlit side of Earth."
             }
        };
        // --- КОНЕЦ ИНТЕРПРЕТАЦИИ ---

        const filteredNotifications = notifications
            .filter(n => ['GST', 'FLR', 'SEP', 'CMEAnalysis', 'Report'].includes(n.messageType))
            .slice(0, 15);

        const processedData = {
            lastUpdated: new Date().toISOString(),
            notifications: filteredNotifications,
            interpretation: interpretation
        };

        // Устанавливаем заголовки кэширования (кэш на 10 минут)
        setHeaders({
            'Cache-Control': 'public, max-age=600'
        });

        return json(processedData);

    } catch (error: any) {
        console.error('[API SpaceWeather] Error processing request:', error);
        const status = error.status || 500;
        const message = error.body?.message || error.message || 'An internal server error occurred.';
        return json({ message: message, status: status }, { status: status });
    }
};