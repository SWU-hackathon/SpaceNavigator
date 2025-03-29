// src/routes/+page.ts
import type { PageLoad } from './$types';

// --- Data Structure Definitions ---
// These interfaces define the expected structure of the data fetched from our backend API (/api/space-weather)

// Current space weather conditions derived from NASA DONKI notifications
interface CurrentConditions {
    overallActivity: string;    // General geomagnetic activity level (e.g., Low, Moderate, High)
    radioBlackouts: string;     // Risk level for HF radio blackouts (e.g., None, R1-R5)
    radiationStorm: string;     // Risk level for solar radiation storms (e.g., None, S1-S5)
    auroraChanceMidLat: string; // Estimated chance of seeing aurora at mid-latitudes (e.g., Low, Moderate, High)
    cmeIncoming: string;        // Indication if a Coronal Mass Ejection impact is likely (e.g., Low, Moderate)
    cmeDetails: string;         // Textual summary of CME forecast/status
}

// Potential impacts on various systems based on current conditions
interface PotentialImpacts {
    satelliteOperations: string; // Description of risks to satellites
    aviationCommunication: string; // Description of risks to aviation (HF comms, GPS)
    powerGrids: string;         // Description of risks to power grids
    humanSpaceflight: string;   // Description of risks to astronauts (radiation)
}

// Explanations for key space weather terms
interface Explanations {
     aurora: string;
     cme: string;
     radiationStorm: string;
     radioBlackouts: string;
}

// Structure of the interpretation section derived from raw notifications
interface InterpretationData {
    currentConditions: CurrentConditions;
    potentialImpacts: PotentialImpacts;
    explanations: Explanations;
}

// Structure for individual notifications from NASA DONKI
interface NotificationData {
    messageType: string;        // Type of notification (e.g., FLR, CME, GST)
    messageID: string;          // Unique identifier for the message
    messageURL?: string;        // Optional URL to the full report on NASA's site
    messageIssueTime: string;   // ISO 8601 timestamp when the message was issued
    messageBody: string;        // The raw text content of the notification
}

// The overall structure of the response from our /api/space-weather endpoint
interface WeatherApiResponse {
    lastUpdated: string;           // ISO 8601 timestamp of when the data was processed by our backend
    notifications: NotificationData[]; // Array of recent relevant notifications
    interpretation: InterpretationData; // Processed interpretation of the conditions
}

// Type for the data returned by the load function to the page component
interface LoadOutput {
    weatherData: WeatherApiResponse | null; // Holds the fetched weather data, or null on error
    error: string | null;                   // Holds an error message if fetching failed, or null on success
}
// --- End of Data Structure Definitions ---


// SvelteKit load function: Fetches data before the page component mounts on the client or server.
export const load: PageLoad<LoadOutput> = async ({ fetch }) => {
    console.log('[Page Load] Fetching data from /api/space-weather...');
    try {
        // Use the SvelteKit `fetch` wrapper to call our internal API endpoint.
        // This works seamlessly during both server-side rendering (SSR) and client-side navigation.
        const response = await fetch('/api/space-weather');

        if (!response.ok) {
             // Attempt to read a JSON error message from the API response body
             let errorMessage = `HTTP error! status: ${response.status}`;
             try {
                 const errorBody = await response.json();
                 // Use the message from the API response if available
                 errorMessage = errorBody.message || errorMessage;
             } catch {
                 // If the response body isn't JSON or doesn't contain a message, use the default HTTP status message
                 console.warn('[Page Load] Could not parse error response body as JSON.');
             }
             console.error('[Page Load] API fetch error:', errorMessage);
             // Throw an error to be caught by the catch block below
             throw new Error(errorMessage);
        }

        // Parse the successful JSON response
        const weatherData: WeatherApiResponse = await response.json();
        console.log('[Page Load] Data loaded successfully.');

        // Return the fetched data and null for the error
        return {
            weatherData: weatherData,
            error: null
        };
    } catch (error: any) {
        // Catch any errors during the fetch process (network errors, API errors, parsing errors)
        console.error("[Page Load] Failed to load space weather data:", error);
        // Return null for the data and the error message
        return {
            weatherData: null,
            error: error.message || "Could not load space weather data due to an unknown error."
        };
    }
};