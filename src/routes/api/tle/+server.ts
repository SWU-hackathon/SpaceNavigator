// src/routes/api/tle/+server.ts
import { json, error as serverError } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// URL для получения TLE активных спутников с Celestrak
const CELESTRAK_ACTIVE_URL = 'https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle';

// --- ИЗМЕНЕНО: Указываем желаемое количество спутников ---
const TARGET_SATELLITE_COUNT = 500;
// -------------------------------------------------------

interface TleData {
    name: string;
    tle1: string;
    tle2: string;
    noradId: string; // Оставим ID, может пригодиться
}

// --- НОВАЯ ФУНКЦИЯ: Парсим первые N спутников ---
function parseFirstNTleData(tleText: string, count: number): TleData[] {
    const lines = tleText.trim().split(/\r?\n/);
    const satellites: TleData[] = [];

    console.log(`[API TLE Parse] Attempting to parse first ${count} satellites...`);

    for (let i = 0; i + 2 < lines.length; i += 3) {
        // Проверяем, набрали ли уже нужное количество
        if (satellites.length >= count) {
            console.log(`[API TLE Parse] Reached target count of ${count}. Stopping parse.`);
            break;
        }

        const nameLine = lines[i]?.trim();
        const line1 = lines[i + 1]?.trim();
        const line2 = lines[i + 2]?.trim();

        // Проверяем валидность блока TLE (базово)
        if (nameLine && line1 && line2 && line1.startsWith('1 ') && line2.startsWith('2 ')) {
            const noradIdFromLine1 = line1.substring(2, 7).trim();
            // Простая проверка, что ID похож на число (хотя он строка)
            if (noradIdFromLine1.length === 5 && /^\d+$/.test(noradIdFromLine1)) {
                satellites.push({
                    name: nameLine,
                    tle1: line1,
                    tle2: line2,
                    noradId: noradIdFromLine1
                });
                // console.log(`[DEBUG] Parsed satellite ${satellites.length}/${count}: ${nameLine} (ID: ${noradIdFromLine1})`); // Детальный лог, если нужно
            } else {
                // console.warn(`[API TLE Parse] Invalid NORAD ID found for ${nameLine}: "${noradIdFromLine1}". Skipping.`);
            }
        } else {
            // console.warn(`[API TLE Parse] Skipping invalid/incomplete TLE block at index ${i}`);
        }
    }

    console.log(`[API TLE Parse] Finished parsing. Successfully parsed ${satellites.length} satellites.`);
    return satellites;
}
// --- КОНЕЦ НОВОЙ ФУНКЦИИ ---

export const GET: RequestHandler = async ({ fetch, setHeaders }) => {
    console.log(`[API TLE] Fetching TLE data from Celestrak for up to ${TARGET_SATELLITE_COUNT} satellites...`);
    try {
        const response = await fetch(CELESTRAK_ACTIVE_URL);

        if (!response.ok) {
             let errorDetails = `Status: ${response.status} ${response.statusText}`;
             try {
                 const errorBody = await response.text();
                 errorDetails += ` - ${errorBody}`;
             } catch { /* ignore */ }
             console.error(`[API TLE] Celestrak fetch error: ${errorDetails}`);
             throw serverError(response.status, `Failed to fetch TLE data from Celestrak: ${response.statusText}`);
        }

        const tleText = await response.text();

        // --- Используем НОВУЮ функцию парсинга ---
        const parsedSatellites = parseFirstNTleData(tleText, TARGET_SATELLITE_COUNT);

        if (parsedSatellites.length === 0) {
             console.warn('[API TLE] No satellites parsed.');
        } else {
             console.log(`[API TLE] Successfully parsed ${parsedSatellites.length} satellite(s). Data sent to client.`);
             // console.log(parsedSatellites); // Раскомментируй, чтобы увидеть список в логе сервера
        }

        // Возвращаем кэширование (или оставляем no-store для отладки)
        setHeaders({ 'Cache-Control': 'public, max-age=3600' });
        // setHeaders({ 'Cache-Control': 'no-store' }); // Если все еще отлаживаем

        return json(parsedSatellites);

    } catch (error: any) {
         console.error('[API TLE] Error processing TLE request:', error);
         const status = error.status || 500;
         const message = error.body?.message || error.message || 'Failed to process TLE request.';
         return json({ message: message, status: status }, { status: status });
    }
};