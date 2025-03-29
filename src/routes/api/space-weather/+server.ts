// src/routes/api/space-weather/+server.ts
// This is a SvelteKit API route that fetches data from NASA DONKI, interprets it, and serves it to the frontend.
import { json, error as serverError } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// IMPORTANT: Load the NASA API key from environment variables for security.
// Create a .env file in your project root and add:
// VITE_NASA_API_KEY=YOUR_ACTUAL_NASA_API_KEY
const apiKey = import.meta.env.VITE_NASA_API_KEY;

// Constants for the NASA DONKI API
const NASA_DONKI_URL = 'https://api.nasa.gov/DONKI';
// Fetch notifications from the last N days to get a recent picture of activity.
const DEFAULT_START_DATE_OFFSET_DAYS = 2;

// Basic type definition for NASA DONKI notifications. Can be expanded if more fields are needed.
interface DonkiNotification {
    messageType: string;        // e.g., "FLR", "GST", "CMEAnalysis", "Report"
    messageID: string;          // Unique ID for the notification
    messageURL?: string;        // Link to the full report on NASA's site
    messageIssueTime: string;   // ISO 8601 timestamp
    messageBody: string;        // Text content of the notification
}

// Helper function to calculate start and end dates for the API query.
function getQueryDates(offsetDays: number): { startDate: string; endDate: string } {
    const today = new Date();
    const pastDate = new Date(today);
    pastDate.setDate(today.getDate() - offsetDays);

    // Format date as YYYY-MM-DD, which DONKI API expects
    const formatDate = (date: Date): string => date.toISOString().split('T')[0];

    return {
        startDate: formatDate(pastDate),
        endDate: formatDate(today),
    };
}

// Request handler for GET requests to /api/space-weather
export const GET: RequestHandler = async ({ fetch, setHeaders }) => {
    // --- API Key Validation ---
    // Check if the API key is loaded correctly from the .env file.
    // Provide a clear error if it's missing or looks like the default placeholder.
    if (!apiKey || apiKey === 'YOUR_ACTUAL_NASA_API_KEY' || apiKey.length < 10) { // Basic check
        console.error('ERROR: VITE_NASA_API_KEY is not configured correctly in .env file.');
        // Use SvelteKit's serverError helper to throw a 500 Internal Server Error.
        // Avoid leaking the actual key status to the client.
        throw serverError(500, 'Server configuration error: NASA API Key is missing or invalid.');
    }

    // --- Fetch Data from NASA DONKI ---
    const { startDate, endDate } = getQueryDates(DEFAULT_START_DATE_OFFSET_DAYS);
    // Construct the API URL with dates, type=all, and the API key.
    const apiUrl = `${NASA_DONKI_URL}/notifications?startDate=${startDate}&endDate=${endDate}&type=all&api_key=${apiKey}`;

    try {
        console.log(`[API SpaceWeather] Fetching DONKI data for ${startDate} to ${endDate}`);
        // Use SvelteKit's fetch wrapper to make the request to the external API.
        const response = await fetch(apiUrl);

        // --- Handle NASA API Response ---
        if (!response.ok) {
            // If the request failed, try to get more details from the response body.
            let errorDetails = `Status: ${response.status} ${response.statusText}`;
            try {
                // Assume the error response might be JSON
                const errorBody = await response.json();
                errorDetails += ` - ${JSON.stringify(errorBody)}`;
            } catch {
                // If not JSON, try to get the raw text body
                errorDetails += ` - ${await response.text()}`;
            }
            console.error(`[API SpaceWeather] NASA API Error: ${errorDetails}`);
            // Throw a server error with the status code from the NASA API response.
            throw serverError(response.status, `Failed to fetch data from NASA DONKI API. Details: ${errorDetails}`);
        }

        // Parse the successful JSON response from NASA DONKI
        const notifications: DonkiNotification[] = await response.json();
        console.log(`[API SpaceWeather] Received ${notifications.length} notifications from DONKI.`);

        // --- Data Interpretation Logic (Simplified) ---
        // This section interprets the raw notifications to generate human-readable summaries and risk levels.
        // It looks for the latest relevant notification types (GST, FLR, SEP, CMEAnalysis).

        let geoActivityLevel = 'Low';      // Kp index based level (G-scale approximation)
        let radioBlackoutLevel = 'None';   // R-scale level from flares
        let radiationStormLevel = 'None';  // S-scale level from SEP events
        let auroraPossibility = 'Low';     // Simplified aurora chance based on geo-activity
        let satelliteRisk = 'Low';         // Overall combined risk assessment for satellites
        let cmeForecast = 'No significant Earth-directed CME detected recently.'; // CME status
        let cmeRisk = 'Low';               // CME impact risk

        // Find the most recent Geomagnetic Storm (GST) notification
        const latestGst = notifications.find(n => n.messageType === 'GST');
        if (latestGst) {
            const body = latestGst.messageBody.toLowerCase();
            // Simple keyword/level matching to estimate G-scale and associated risks
            // More sophisticated parsing could extract precise Kp values.
            if (body.includes('g5') || body.includes('kp=9')) { geoActivityLevel = 'Extreme'; auroraPossibility = 'High'; satelliteRisk = 'Severe'; }
            else if (body.includes('g4') || body.includes('kp=8')) { geoActivityLevel = 'Severe'; auroraPossibility = 'High'; satelliteRisk = 'High'; }
            else if (body.includes('g3') || body.includes('kp=7')) { geoActivityLevel = 'High'; auroraPossibility = 'Moderate'; satelliteRisk = 'High'; }
            else if (body.includes('g2') || body.includes('kp=6')) { geoActivityLevel = 'Moderate'; auroraPossibility = 'Low'; satelliteRisk = 'Moderate'; }
            else if (body.includes('g1') || body.includes('kp=5')) { geoActivityLevel = 'Moderate'; auroraPossibility = 'Low'; satelliteRisk = 'Moderate'; }
            else if (body.includes('active') || body.includes('kp=4')) { geoActivityLevel = 'Low'; satelliteRisk = 'Low'; }
            // Default is 'Low' if no specific high levels are mentioned
        }

        // Find the most recent Solar Flare (FLR) notification
        const latestFlr = notifications.find(n => n.messageType === 'FLR');
        if (latestFlr) {
            const body = latestFlr.messageBody.toUpperCase();
            // Simple matching for R-scale levels (Radio Blackouts)
            if (body.includes('R5')) { radioBlackoutLevel = 'Extreme'; satelliteRisk = Math.max(parseInt(satelliteRisk, 10) || 0, 3) === 3 ? 'Severe' : 'High'; } // Simplified risk aggregation
            else if (body.includes('R4')) { radioBlackoutLevel = 'Severe'; satelliteRisk = Math.max(parseInt(satelliteRisk, 10) || 0, 2) === 2 ? 'High' : 'High'; }
            else if (body.includes('R3')) { radioBlackoutLevel = 'High'; satelliteRisk = Math.max(parseInt(satelliteRisk, 10) || 0, 1) === 1 ? 'Moderate' : 'Moderate'; }
            else if (body.includes('R2')) { radioBlackoutLevel = 'Moderate'; } // Moderate blackouts less likely to elevate overall satellite risk significantly alone
            else if (body.includes('R1')) { radioBlackoutLevel = 'Low'; }
             // Update satelliteRisk based on severity, ensuring it doesn't decrease.
             // This logic is very basic and could be refined.
             if (radioBlackoutLevel === 'Extreme' || radioBlackoutLevel === 'Severe') { satelliteRisk = satelliteRisk === 'Severe' ? 'Severe' : 'High'; }
             else if (radioBlackoutLevel === 'High') { satelliteRisk = ['Severe', 'High'].includes(satelliteRisk) ? satelliteRisk : 'Moderate'; }
        }

         // Find the most recent Solar Energetic Particle (SEP) event notification
         const latestSep = notifications.find(n => n.messageType === 'SEP');
         if (latestSep) {
             const body = latestSep.messageBody.toUpperCase();
             // Simple matching for S-scale levels (Radiation Storms)
             if (body.includes('S5')) { radiationStormLevel = 'Extreme'; satelliteRisk = 'Severe'; } // High radiation is a major satellite risk
             else if (body.includes('S4')) { radiationStormLevel = 'Severe'; satelliteRisk = 'Severe'; }
             else if (body.includes('S3')) { radiationStormLevel = 'High'; satelliteRisk = ['Severe', 'High'].includes(satelliteRisk) ? satelliteRisk : 'High'; }
             else if (body.includes('S2')) { radiationStormLevel = 'Moderate'; satelliteRisk = ['Severe', 'High', 'Moderate'].includes(satelliteRisk) ? satelliteRisk : 'Moderate'; }
             else if (body.includes('S1')) { radiationStormLevel = 'Low'; satelliteRisk = ['Severe', 'High', 'Moderate', 'Low'].includes(satelliteRisk) ? satelliteRisk : 'Low'; }
         }

        // Find the most recent Coronal Mass Ejection (CME) Analysis
        const latestCmeAnalysis = notifications.find(n => n.messageType === 'CMEAnalysis');
        if (latestCmeAnalysis && latestCmeAnalysis.messageBody.toLowerCase().includes('is expected to arrive at earth')) {
             // Basic check if analysis mentions Earth impact. More parsing needed for timing/intensity.
             cmeForecast = 'Earth-directed CME detected. Potential increase in geomagnetic activity possible within 1-4 days.';
             cmeRisk = 'Moderate'; // Assume moderate risk if an Earth-directed CME is mentioned
             // Update overall satellite risk if CME poses a threat
             satelliteRisk = ['Severe', 'High'].includes(satelliteRisk) ? satelliteRisk : 'Moderate';
        }

        // --- Assemble Interpretation Object ---
        // Structure the interpreted data for the frontend.
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
                 // Combine risk levels into descriptive text strings
                 satelliteOperations: `Overall Risk: ${satelliteRisk}. High activity may increase drag & cause charging issues. Radiation can damage components (${radiationStormLevel}).`,
                 aviationCommunication: `HF Radio Risk: ${radioBlackoutLevel}. High latitude flights may experience communication/navigation issues during ${geoActivityLevel} or ${radiationStormLevel} events.`,
                 powerGrids: `Risk during ${geoActivityLevel} activity: Minor impacts possible at Moderate levels, increasing significantly at High/Severe/Extreme levels.`,
                 humanSpaceflight: `Radiation exposure risk mainly during ${radiationStormLevel} events (Level: ${radiationStormLevel}). Monitor EVA schedules.`
             },
             // Provide static explanations for key terms
             explanations: {
                aurora: "Indicates the chance of seeing auroras (Northern/Southern Lights) away from the poles, linked to geomagnetic activity.",
                cme: "Coronal Mass Ejections (CMEs) are large expulsions of plasma from the Sun. If Earth-directed, they can cause geomagnetic storms 1-4 days later.",
                radiationStorm: "Increased levels of energetic particles from the Sun (SEP events), posing a risk to astronauts and sensitive electronics, especially satellites.",
                radioBlackouts: "Solar flares can emit X-rays that ionize Earth's upper atmosphere, disrupting High Frequency (HF) radio communications on the sunlit side."
             }
        };
        // --- End of Interpretation ---

        // --- Prepare Final Response ---
        // Filter notifications to include only the most relevant types for display and limit the count.
        const filteredNotifications = notifications
            .filter(n => ['GST', 'FLR', 'SEP', 'CMEAnalysis', 'Report'].includes(n.messageType)) // Keep these types
            .slice(0, 15); // Limit to the 15 most recent relevant notifications

        // Combine interpretation and filtered notifications into the final data object.
        const processedData = {
            lastUpdated: new Date().toISOString(), // Record when *our* server processed the data
            notifications: filteredNotifications,
            interpretation: interpretation
        };

        // --- Set Cache Headers ---
        // Instruct browsers and CDNs to cache this response for 10 minutes (600 seconds).
        // This reduces load on our server and the NASA API.
        setHeaders({
            'Cache-Control': 'public, max-age=600'
        });

        // Return the processed data as a JSON response.
        return json(processedData);

    } catch (error: any) {
        // Catch any errors that occurred during the process (including thrown serverErrors).
        console.error('[API SpaceWeather] Error processing request:', error);
        // Determine the status code and message to return.
        const status = error.status || 500; // Use error status or default to 500
        const message = error.body?.message || error.message || 'An internal server error occurred.';
        // Return a JSON error response.
        // Note: SvelteKit's serverError already formats the response, but this handles other potential errors.
        return json({ message: message, status: status }, { status: status });
    }
};