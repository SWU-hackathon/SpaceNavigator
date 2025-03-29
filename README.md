# Space Weather & Satellite Tracker Dashboard

## Project Description

This web application provides a combined dashboard for monitoring current space weather conditions and visualizing the real-time positions and orbital tracks of active satellites around Earth. Built with SvelteKit, TypeScript, and Three.js, it aims to make complex space data more accessible and understandable.

The dashboard fetches near real-time space weather notifications from the NASA DONKI API, interprets them to assess risk levels (geomagnetic activity, radio blackouts, radiation storms), and explains potential impacts on satellite operations, aviation, power grids, and human spaceflight.

The integrated 3D globe visualizes the positions of approximately 50 active satellites (fetched dynamically from Celestrak TLE data), calculated using the SGP4 propagation model via `satellite.js`. It includes orbital tracks and allows users to identify satellites by hovering over them.

A key feature is the **link between space weather and the 3D visualization**: the color of a satellite on the globe changes if the current radiation storm risk is high and the satellite is traversing high-latitude regions, visually indicating potential hazards. Interactive filters allow users to display satellites based on orbit type (LEO, MEO/GEO/HEO) or specific types/features (ISS, Earth Observation, Satellites with Cameras).

This project was developed for the [Name of Hackathon - Optional] hackathon under the theme "Space and aerospace innovation".

## Features

*   **Space Weather Dashboard:**
    *   Fetches latest notifications from NASA DONKI.
    *   Interprets data into easy-to-understand risk levels (Low, Moderate, High, etc.) for Geomagnetic Activity, Radio Blackouts, and Radiation Storms.
    *   Calculates potential Aurora visibility chance for mid-latitudes.
    *   Provides summaries of potential impacts on satellites, aviation, power grids, and human spaceflight.
    *   Includes tooltips explaining key space weather terms.
*   **Live 3D Satellite Tracker:**
    *   Fetches TLE data dynamically for ~50 active satellites from Celestrak.
    *   Displays satellites orbiting a 3D Earth model using Three.js.
    *   Calculates and renders orbital tracks for each satellite (~90-minute window).
    *   Updates satellite positions in near real-time based on SGP4 propagation.
    *   Interactive `OrbitControls` for rotating and zooming the globe.
    *   Displays satellite name on hover using HTML labels positioned via raycasting and screen projection.
*   **Space Weather & Visualization Link:**
    *   Satellite color changes in the 3D view based on the current Radiation Storm risk level and the satellite's latitude.
*   **Satellite Filtering:**
    *   Filter satellites displayed on the globe by orbit type (LEO, MEO/GEO/HEO).
    *   Filter satellites by type or feature (ISS, Earth Observation, With Camera - based on a predefined list).
    *   Filters apply with a smooth fade-in/fade-out effect.
*   **Tech Stack:** SvelteKit, TypeScript, Three.js, satellite.js, Tailwind CSS, pnpm.

## Getting Started

### Prerequisites

*   Node.js (LTS version recommended)
*   pnpm (`npm install -g pnpm`)
*   A NASA API Key: Get one for free at [https://api.nasa.gov/](https://api.nasa.gov/)

### Installation & Running

1.  **Clone the repository (or download the source code):**
    ```bash
    git clone <your-repo-url>
    cd <repository-folder-name>
    ```

2.  **Install dependencies:**
    ```bash
    pnpm install
    ```

3.  **Set up Environment Variables:**
    *   Create a file named `.env` in the root directory of the project.
    *   Add your NASA API key to the `.env` file:
        ```dotenv
        VITE_NASA_API_KEY="YOUR_ACTUAL_NASA_API_KEY_HERE"
        ```
        (Replace `"YOUR_ACTUAL_NASA_API_KEY_HERE"` with your real key).

4.  **Run the development server:**
    ```bash
    pnpm run dev -- --open
    ```
    This will start the application, usually on `http://localhost:5173`, and automatically open it in your default web browser.

5.  **Build for production (Optional):**
    ```bash
    pnpm run build
    pnpm run preview # To preview the production build locally
    ```

## How It Works

*   **Backend (API Routes in SvelteKit):**
    *   `/api/space-weather`: Fetches notification data from NASA DONKI, processes it, determines risk levels, and provides interpretations.
    *   `/api/tle`: Fetches the general perturbations TLE data for active satellites from Celestrak, parses it, and returns the TLE sets for the first 50 satellites.
*   **Frontend (Svelte Components):**
    *   **Weather:** Components like `InterpretationCard`, `AerospaceImpact`, `NotificationList` display the processed space weather data.
    *   **3D Globe:** `SatelliteGlobe.svelte` uses Three.js to create the scene, loads TLE data from the `/api/tle` route, calculates satellite positions and tracks using `satellite.js`, handles user interaction (orbit controls, mouse hover), applies filters, and visualizes radiation risk.
    *   **Filtering:** `SatelliteFilter.svelte` provides the UI for selecting filters and emits events handled by the main page (`+page.svelte`) to update the props passed to `SatelliteGlobe`.

## Potential Improvements / Future Work

*   **Add More Data Sources:** Integrate NOAA SWPC data (real-time Kp index, solar wind parameters).
*   **Historical Data & Graphs:** Display historical Kp index or other relevant metrics using charting libraries (e.g., Chart.js).
*   **More Sophisticated Satellite Info:** Fetch/display more details upon clicking a satellite (orbital elements, launch date, purpose - requires a better data source).
*   **Enhanced 3D Visuals:**
    *   Add a skybox with stars.
    *   Use more realistic 3D models for specific satellites (ISS, Hubble).
    *   Visualize radiation belts or the magnetosphere (complex).
    *   Improve aurora visualization.
*   **Performance Optimization:** Optimize 3D rendering for a large number of satellites, potentially using InstancedMesh or optimizing track calculations.
*   **User Location Features:** Allow users to input their location for calculating satellite visibility passes (like ISS passes).
*   **Refined Filtering/Search:** Add text search for satellites, more granular filtering options.
*   **Deployment:** Configure for deployment to platforms like Vercel, Netlify, etc.

## Acknowledgements

*   NASA DONKI API for space weather data.
*   Celestrak for providing TLE data.
*   `satellite.js` library for orbital propagation.
*   Three.js library for 3D rendering.
*   SvelteKit & Svelte framework.
*   Tailwind CSS for styling.