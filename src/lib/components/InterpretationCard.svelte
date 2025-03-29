<!-- src/lib/components/InterpretationCard.svelte -->
<!-- Displays the summary of current space weather conditions using RiskIndicator components. -->
<script lang="ts">
	import RiskIndicator from '$lib/components/RiskIndicator.svelte'; // Component to show colored risk level badges
	import Tooltip from './Tooltip.svelte'; // Component for displaying hover tooltips

	// Define the expected structure for the 'data' prop, based on the API response's interpretation section.
	export let data: {
		currentConditions: {
			overallActivity: string; // e.g., Low, Moderate, High
			radioBlackouts: string; // e.g., None, R1-R5
			radiationStorm: string; // e.g., None, S1-S5
			auroraChanceMidLat: string; // e.g., Low, Moderate, High
			cmeIncoming: string; // e.g., Low, Moderate
			cmeDetails: string; // Text description
		};
		explanations: {
			// Tooltip texts fetched from the API
			aurora: string;
			cme: string;
			radiationStorm: string;
			radioBlackouts: string;
		};
	};

	/**
	 * Determines the highest risk level among several conditions to set an overall emphasis color.
	 * @param conditions The currentConditions object from the data prop.
	 * @returns The highest risk level found ('Extreme', 'Severe', 'High', 'Moderate', 'Low', or 'None').
	 */
	function getOverallRiskLevel(conditions: typeof data.currentConditions): string {
		// List of relevant risk levels to compare
		const levels = [
			conditions.overallActivity,
			conditions.radioBlackouts,
			conditions.radiationStorm,
			conditions.cmeIncoming // Include CME forecast risk
		];

		// Check for the highest risk level in order of severity
		if (levels.some((l) => l === 'Extreme')) return 'Extreme';
		if (levels.some((l) => l === 'Severe')) return 'Severe';
		if (levels.some((l) => l === 'High')) return 'High';
		if (levels.some((l) => l === 'Moderate')) return 'Moderate';
		if (levels.some((l) => l === 'Low')) return 'Low';
		return 'None'; // Default if no specific risk level found
	}

	/**
	 * Gets the Tailwind CSS class for the left border color based on the overall risk level.
	 * @param level The overall risk level string.
	 * @returns A Tailwind border color class (e.g., 'border-red-600').
	 */
	function getBorderColorClass(level: string): string {
		switch (
			level?.toLowerCase() // Use optional chaining and lowercase for robustness
		) {
			case 'extreme':
				return 'border-red-600';
			case 'severe':
				return 'border-red-500';
			case 'high':
				return 'border-orange-500';
			case 'moderate':
				return 'border-yellow-400';
			case 'low':
				return 'border-green-500';
			case 'none':
			default:
				return 'border-gray-400 dark:border-gray-600'; // Default neutral border
		}
	}

	// Reactive declarations: Calculate overall risk and border color whenever 'data' changes.
	$: overallRisk = getOverallRiskLevel(data.currentConditions);
	$: borderColorClass = getBorderColorClass(overallRisk);
</script>

<!-- Card container with dynamic left border color based on overall risk -->
<div
	class="overflow-hidden rounded-lg border-l-4 bg-white shadow-lg dark:bg-gray-800 {borderColorClass}"
>
	<div class="p-5 sm:p-6">
		<!-- Card Title -->
		<h2 class="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-100">
			Current Space Weather Conditions
		</h2>

		<!-- Grid layout for displaying individual condition indicators -->
		<div class="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
			<!-- Geomagnetic Activity -->
			<div class="flex items-center justify-between border-b pb-2 dark:border-gray-700">
				<span class="font-medium text-gray-700 dark:text-gray-300">
					Geomagnetic Activity
					<!-- Tooltip explaining the term -->
					<Tooltip
						text="Disturbance level of Earth's magnetic field, affecting power grids and causing auroras."
					/>
				</span>
				<!-- Risk level indicator badge -->
				<RiskIndicator level={data.currentConditions.overallActivity} />
			</div>

			<!-- Radio Blackout Risk -->
			<div class="flex items-center justify-between border-b pb-2 dark:border-gray-700">
				<span class="font-medium text-gray-700 dark:text-gray-300">
					Radio Blackout Risk
					<Tooltip text={data.explanations.radioBlackouts} />
				</span>
				<RiskIndicator level={data.currentConditions.radioBlackouts} />
			</div>

			<!-- Radiation Storm Risk -->
			<div class="flex items-center justify-between border-b pb-2 dark:border-gray-700">
				<span class="font-medium text-gray-700 dark:text-gray-300">
					Radiation Storm Risk
					<Tooltip text={data.explanations.radiationStorm} />
				</span>
				<RiskIndicator level={data.currentConditions.radiationStorm} />
			</div>

			<!-- Aurora Chance (Mid-Latitudes) -->
			<div class="flex items-center justify-between border-b pb-2 dark:border-gray-700">
				<span class="font-medium text-gray-700 dark:text-gray-300">
					Aurora Chance (Mid-Lat)
					<Tooltip text={data.explanations.aurora} />
				</span>
				<RiskIndicator level={data.currentConditions.auroraChanceMidLat} />
			</div>
		</div>

		<!-- Incoming CME Forecast Section -->
		<div class="mt-4 border-t pt-3 dark:border-gray-700">
			<h3 class="mb-1 flex items-center text-sm font-medium text-gray-600 dark:text-gray-400">
				Incoming CME Forecast
				<Tooltip text={data.explanations.cme} iconClass="ml-1 w-4 h-4" />
				<!-- Show small risk indicator for CME risk on the right -->
				<span class="ml-auto"
					><RiskIndicator level={data.currentConditions.cmeIncoming} size="small" /></span
				>
			</h3>
			<!-- Display the textual details of the CME forecast -->
			<p class="text-sm text-gray-700 dark:text-gray-300">
				{data.currentConditions.cmeDetails || 'No specific details available.'}
			</p>
		</div>
	</div>
</div>
