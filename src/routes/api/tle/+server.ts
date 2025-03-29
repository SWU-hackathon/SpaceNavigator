// src/routes/api/tle/+server.ts
// API route to fetch Two-Line Element (TLE) data for satellites from Celestrak.
import { json, error as serverError } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// URL for Celestrak's TLE data for all *active* satellites.
// This is a large file, so we'll parse only what we need.
const CELESTRAK_ACTIVE_URL = 'https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle';

// --- Configuration: Target number of satellites ---
// Define how many satellites we want to parse and send to the client.
// Reducing this number significantly improves frontend performance (rendering, physics).
const TARGET_SATELLITE_COUNT = 500; // Fetch TLEs for the first 500 active satellites found in the file.
// -------------------------------------------------------

// Interface for the structured TLE data we will return.
interface TleData {
    name: string;    // Satellite name (Line 0)
    tle1: string;    // TLE Line 1
    tle2: string;    // TLE Line 2
    noradId: string; // NORAD Catalog ID extracted from Line 1
}

/**
 * Parses the raw TLE text data from Celestrak and extracts data for the first N valid satellites.
 * @param tleText The full text content from the Celestrak TLE file.
 * @param count The maximum number of satellites to parse.
 * @returns An array of TleData objects.
 */
function parseFirstNTleData(tleText: string, count: number): TleData[] {
    const lines = tleText.trim().split(/\r?\n/); // Split into lines, handling different line endings
    const satellites: TleData[] = [];

    console.log(`[API TLE Parse] Attempting to parse first ${count} satellites from ${lines.length} lines...`);

    // Iterate through the lines in blocks of 3 (Name, Line1, Line2)
    for (let i = 0; i + 2 < lines.length; i += 3) {
        // Stop parsing if we've reached the target count
        if (satellites.length >= count) {
            console.log(`[API TLE Parse] Reached target count of ${count}. Stopping parse.`);
            break;
        }

        // Get the potential TLE lines, trimming whitespace
        const nameLine = lines[i]?.trim();
        const line1 = lines[i + 1]?.trim();
        const line2 = lines[i + 2]?.trim();

        // --- Basic TLE Validity Checks ---
        // Ensure all three lines exist and Lines 1 & 2 start with '1 ' and '2 ' respectively.
        if (nameLine && line1 && line2 && line1.startsWith('1 ') && line2.startsWith('2 ')) {
            // Extract NORAD ID from Line 1 (columns 3-7)
            const noradIdFromLine1 = line1.substring(2, 7).trim(); // Typically 5 digits

            // Validate the extracted NORAD ID (should be digits, usually 5 chars)
            // This is a simple check; more robust validation exists but might be overkill here.
            if (noradIdFromLine1.length > 0 && /^\d+$/.test(noradIdFromLine1)) {
                // If valid, create the TleData object and add it to the results
                satellites.push({
                    name: nameLine,
                    tle1: line1,
                    tle2: line2,
                    noradId: noradIdFromLine1
                });
                 // console.debug(`[API TLE Parse] Parsed satellite ${satellites.length}/${count}: ${nameLine} (ID: ${noradIdFromLine1})`);
            } else {
                 console.warn(`[API TLE Parse] Invalid or empty NORAD ID found for potential satellite "${nameLine}" (ID: "${noradIdFromLine1}"). Skipping block starting at line ${i}.`);
            }
        } else {
             // Log skipped blocks if they don't match the expected format
             // Avoid logging this for the end of the file if lines.length is not a multiple of 3
             if (i + 2 < lines.length - 3) { // Avoid logging incomplete final block
                 console.warn(`[API TLE Parse] Skipping invalid/incomplete TLE block at index ${i}. Name: "${nameLine}", L1: "${line1}", L2: "${line2}"`);
             }
        }
    }

    console.log(`[API TLE Parse] Finished parsing. Successfully parsed ${satellites.length} satellites.`);
    return satellites;
}


// Request handler for GET requests to /api/tle
export const GET: RequestHandler = async ({ fetch, setHeaders }) => {
    console.log(`[API TLE] Fetching TLE data from Celestrak for up to ${TARGET_SATELLITE_COUNT} satellites...`);
    try {
        // Fetch the TLE data from Celestrak.
        // Add a timestamp query param to potentially bypass intermediate caches if needed during debugging.
        // const fetchUrl = `${CELESTRAK_ACTIVE_URL}?t=${Date.now()}`; // Uncomment for cache busting
        const response = await fetch(CELESTRAK_ACTIVE_URL);

        // --- Handle Celestrak Response ---
        if (!response.ok) {
             let errorDetails = `Status: ${response.status} ${response.statusText}`;
             try {
                 // Try to get text body for more context on the error
                 const errorBody = await response.text();
                 errorDetails += ` - ${errorBody}`;
             } catch { /* ignore if reading body fails */ }
             console.error(`[API TLE] Celestrak fetch error: ${errorDetails}`);
             throw serverError(response.status, `Failed to fetch TLE data from Celestrak: ${response.statusText}`);
        }

        // Get the raw TLE data as text
        const tleText = await response.text();

        // --- Parse the TLE Data ---
        const parsedSatellites = parseFirstNTleData(tleText, TARGET_SATELLITE_COUNT);

        if (parsedSatellites.length === 0) {
             // This could happen if the file is empty or parsing fails completely
             console.warn('[API TLE] No satellites were successfully parsed from the Celestrak data.');
             // Consider returning an error or an empty array based on requirements
             // Returning empty array might be better for the frontend to handle gracefully.
        } else {
             console.log(`[API TLE] Successfully parsed ${parsedSatellites.length} satellite(s). Sending data to client.`);
             // console.log(parsedSatellites); // Uncomment to log the parsed satellite list on the server
        }

        // --- Set Cache Headers ---
        // Cache the TLE data for 1 hour (3600 seconds) as it doesn't update extremely frequently.
        setHeaders({ 'Cache-Control': 'public, max-age=3600' });
        // Use 'no-store' for debugging to always get fresh data:
        // setHeaders({ 'Cache-Control': 'no-store' });

        // Return the array of parsed satellite data as JSON.
        return json(parsedSatellites);

    } catch (error: any) {
         // Catch any errors during the fetch or parsing process.
         console.error('[API TLE] Error processing TLE request:', error);
         const status = error.status || 500;
         const message = error.body?.message || error.message || 'Failed to process TLE request.';
         return json({ message: message, status: status }, { status: status });
    }
};