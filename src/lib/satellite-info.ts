// src/lib/satellite-info.ts
// Provides additional details (type, description, capabilities) for known satellites based on their NORAD ID.

/**
 * Interface defining the structure for satellite details.
 */
export interface SatelliteDetails {
	// Categorization of the satellite's primary purpose.
	type: 'ISS' | 'Telescope' | 'Earth Observation' | 'Weather' | 'Communication' | 'Navigation' | 'Unknown';
	// A brief description of the satellite.
	description: string;
	// Flag indicating if the satellite is known to have imaging capabilities (Earth-facing or otherwise).
	hasCamera?: boolean;
	// Specific URL for live video feed (currently only relevant for ISS).
	liveFeedUrl?: string;
}

// A record mapping NORAD IDs (as strings) to their corresponding SatelliteDetails.
// Add more satellites here as needed.
// IMPORTANT: Verify NORAD IDs against reliable sources like Celestrak, as they can change or may differ slightly based on the specific element set (e.g., ISS modules).
export const knownSatellites: Record<string, SatelliteDetails> = {
	// International Space Station (using Zarya module's typical ID)
	// Check Celestrak for the most current primary ID if needed.
	'25544': {
		type: 'ISS',
		description: 'International Space Station - primary habitable artificial satellite.',
		hasCamera: true, // ISS has external cameras providing live feeds.
		// Example NASA HDEV stream URL. Check for current official stream links.
		liveFeedUrl: 'https://eol.jsc.nasa.gov/ESRS/HDEV/'
        // Alternative: NASA TV page often shows ISS views: 'https://www.nasa.gov/nasatv'
	},
	// Hubble Space Telescope (HST)
	'20580': {
		type: 'Telescope',
		description: 'Hubble Space Telescope - observing distant stars and galaxies.',
		hasCamera: true // It's a telescope, so fundamentally an imaging device (not Earth-facing).
	},
    // Example: Landsat 9 (Earth Observation)
    // VERIFY THIS ID! IDs change, check Celestrak for active satellites. This is likely correct as of late 2023/early 2024.
	'56147': {
         type: 'Earth Observation',
         description: 'Landsat 9 - Earth observation satellite (USGS/NASA).',
         hasCamera: true // Primary function is imaging Earth.
     },
    // Example: Sentinel-2B (Earth Observation - Copernicus Programme)
    // VERIFY THIS ID! Check Celestrak. This is likely correct.
    '43689': {
        type: 'Earth Observation',
        description: 'Copernicus Sentinel-2B - Multispectral optical imaging satellite (ESA).',
        hasCamera: true // Primary function is imaging Earth.
    },
    // Example: NOAA-20 (Weather)
    // VERIFY THIS ID! Check Celestrak. Likely correct.
    '48274': {
        type: 'Weather',
        description: 'NOAA-20 (JPSS-1) - Polar-orbiting weather satellite.',
        hasCamera: true // Carries VIIRS imager.
    },
    // Add more known satellites here...
    // GOES satellites (Geostationary Weather): GOES-16 (41866?), GOES-17(43226?), GOES-18(51812?) - IDs need verification!
    // 'xxxxx': { type: 'Weather', description: 'GOES-18 Weather Satellite', hasCamera: true },
    // Starlink satellites (Communication): Many IDs, maybe group them or highlight prominent ones.
    // GPS/Galileo/GLONASS (Navigation): Many IDs.
};

/**
 * Retrieves details for a given satellite NORAD ID.
 * @param noradId The NORAD Catalog ID (as a string).
 * @returns A SatelliteDetails object. If the ID is not found in `knownSatellites`,
 *          it returns a default 'Unknown' type object.
 */
export function getSatelliteDetails(noradId: string): SatelliteDetails {
	// Look up the ID in our known satellites record.
	const details = knownSatellites[noradId];
	// If found, return the details.
	if (details) {
		return details;
	}
	// If not found, return a default object indicating the satellite is unknown or unclassified.
	return {
		type: 'Unknown',
		description: 'Unknown or unclassified satellite.',
		hasCamera: false // Assume no camera unless specified.
	};
}