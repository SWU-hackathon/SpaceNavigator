<!-- src/lib/components/NotificationList.svelte -->
<!-- Displays a list of recent space weather notifications from the NASA DONKI API. -->
<script lang="ts">
	// Define the expected structure for each notification object in the input array.
	export let notifications:
		| {
				messageType: string; // e.g., "FLR", "GST"
				messageID: string; // Unique ID
				messageURL?: string; // Optional link to NASA report
				messageIssueTime: string; // ISO 8601 timestamp string
				messageBody: string; // Raw notification text
		  }[]
		| undefined
		| null; // Can be an array, undefined (loading), or null (error/no data)

	/**
	 * Formats an ISO 8601 date string into a short, locale-aware date/time format.
	 * @param isoString The ISO date string.
	 * @returns A formatted string (e.g., "Sep 4, 2:30 PM") or 'N/A'/'Invalid Date'.
	 */
	function formatDateTime(isoString: string | undefined): string {
		if (!isoString) return 'N/A';
		try {
			// Use toLocaleString for automatic locale-based formatting.
			return new Date(isoString).toLocaleString(undefined, {
				month: 'short', // e.g., "Sep"
				day: 'numeric', // e.g., "4"
				hour: 'numeric', // e.g., "2"
				minute: '2-digit' // e.g., "30"
				// timeZoneName: 'short' // Optional: Add timezone abbreviation (e.g., "PDT")
			});
		} catch (e) {
			console.error('Error formatting date in NotificationList:', isoString, e);
			return 'Invalid Date';
		}
	}

	/**
	 * Determines the Tailwind CSS background and text color classes for the notification type tag.
	 * @param type The messageType string (e.g., "FLR", "GST").
	 * @returns Tailwind color classes string.
	 */
	function getTypeColor(type: string): string {
		// Assign colors based on common DONKI message types
		switch (
			type?.toUpperCase() // Use uppercase for case-insensitive matching
		) {
			case 'FLR':
				return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'; // Flares
			case 'SEP':
				return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'; // Radiation Storms
			case 'GST':
				return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'; // Geomagnetic Storms
			case 'CMEANALYSIS':
				return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'; // CME Analysis
			case 'REPORT':
				return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'; // General Reports
			default:
				return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'; // Other types
		}
	}

	/**
	 * Cleans the raw message body and attempts to extract a concise summary.
	 * Removes common boilerplate text and tries to identify key information.
	 * @param body The raw messageBody string.
	 * @param type The messageType string.
	 * @returns An object containing a cleaned `summary` and the `full` cleaned text.
	 */
	function cleanMessageBody(body: string, type: string): { summary: string; full: string } {
		let cleaned = body;

		// --- Initial Cleaning Steps ---
		// Remove common trailing sections (Summary, Disclaimer, etc.) often marked with ##
		cleaned = cleaned.replace(/##\s*(Summary|Disclaimer|Notes|Potential\sImpacts)[\s\S]*/gi, '');
		// Remove header lines like "## Activity ID: ... ##" or "## Message Issue Time: ... ##"
		cleaned = cleaned.replace(/^##\s*.*?##\s*$/gm, '').trim();
		// Remove other lines starting with ## (might be section headers)
		cleaned = cleaned.replace(/^##\s*.*?$/gm, '').trim();
		// Remove leading/trailing blank lines
		cleaned = cleaned.replace(/^\s*\n+/gm, '').trim();

		// --- Summary Extraction (Type-Specific Logic) ---
		let summary = cleaned; // Default summary is the initially cleaned text
		try {
			if (type === 'FLR') {
				// Look for flare class designation (e.g., X1.2 flare)
				const flareMatch = body.match(/(X|M|C|B|A)\d+(\.\d+)?\s*flare/i);
				if (flareMatch) summary = `Solar Flare Detected: ${flareMatch[0]}`;
				else summary = cleaned.split('\n')[0]; // Fallback to the first line
			} else if (type === 'GST') {
				// Look for storm level (e.g., Geomagnetic storm G3, Kp=7)
				const stormMatch = body.match(
					/Geomagnetic storm\s*(?:reaching|expected|observed)\s*(G\d+|Kp=\d+)/i
				);
				if (stormMatch) summary = `Geomagnetic Storm: ${stormMatch[1]}`;
				else summary = cleaned.split('\n')[0]; // Fallback to the first line
			} else if (type === 'SEP') {
				// Look for radiation storm level (e.g., Solar radiation storm S2)
				const sepMatch = body.match(
					/Solar radiation storm\s*(?:reaching|expected|observed)\s*(S\d+)/i
				);
				if (sepMatch) summary = `Radiation Storm: ${sepMatch[1]}`;
				else summary = cleaned.split('\n')[0]; // Fallback to the first line
			} else {
				// For other types, just use the first line as the summary
				summary = cleaned.split('\n')[0];
			}
		} catch (e) {
			console.error(`Error extracting summary for type ${type}:`, e);
			summary = cleaned.split('\n')[0] || body.split('\n')[0]; // Safely fallback to first line
		}

		// --- Final Summary Cleanup ---
		// Truncate very long summaries for preview purposes
		summary = summary.length > 150 ? summary.substring(0, 147) + '...' : summary;
		// Remove any trailing ## that might have been left
		summary = summary.replace(/##\s*$/, '').trim();

		// Return both the concise summary and the more complete cleaned text
		return {
			summary: summary || 'See original report for details.', // Fallback summary text
			full: cleaned || body // Fallback full text is the original body if cleaning failed
		};
	}
</script>

<!-- Card container for the notification list -->
<!-- h-full and flex flex-col ensure it tries to fill available vertical space -->
<div class="h-full overflow-hidden rounded-lg bg-white shadow-lg dark:bg-gray-800">
	<div class="flex h-full flex-col p-5 sm:p-6">
		<!-- Card Title -->
		<h2 class="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-100">
			Recent Notifications
		</h2>

		<!-- Conditional rendering based on the state of the notifications prop -->
		{#if notifications && notifications.length > 0}
			<!-- List container: Allows vertical scrolling if content overflows -->
			<ul class="custom-scrollbar flex-grow space-y-4 overflow-y-auto">
				<!-- Iterate over each notification -->
				{#each notifications as notification (notification.messageID)}
					<!-- Process the message body for display -->
					{@const cleaned = cleanMessageBody(notification.messageBody, notification.messageType)}
					<!-- List item for a single notification -->
					<li class="border-b border-gray-200 pb-3 last:border-b-0 dark:border-gray-700">
						<!-- Header row: Type tag and timestamp -->
						<div class="mb-1 flex items-start justify-between gap-2">
							<!-- Type tag with dynamic color -->
							<span
								class="rounded-full px-2 py-0.5 text-xs font-semibold {getTypeColor(
									notification.messageType
								)}"
							>
								{notification.messageType}
							</span>
							<!-- Formatted timestamp, shrinks if needed -->
							<span
								class="flex-shrink-0 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400"
							>
								{formatDateTime(notification.messageIssueTime)}
							</span>
						</div>
						<!-- Notification summary text -->
						<p class="mb-1 text-sm leading-snug text-gray-700 dark:text-gray-300">
							{cleaned.summary}
							<!-- Display the extracted summary -->
						</p>
						<!-- Link to the original NASA report, if available -->
						{#if notification.messageURL}
							<a
								href={notification.messageURL}
								target="_blank"
								rel="noopener noreferrer"
								class="inline-block text-xs text-blue-500 hover:text-blue-700 hover:underline dark:hover:text-blue-300"
								title="View full report on NASA DONKI website"
							>
								Original Report →
							</a>
							<!-- Optional: Button to show the full cleaned text in a modal/alert -->
							<!-- <button on:click={() => alert(cleaned.full)} class="text-xs ml-2 text-gray-500 hover:underline">[Details]</button> -->
						{/if}
					</li>
				{/each}
			</ul>
		{:else if notifications === undefined || notifications === null}
			<!-- Show loading message if notifications are not yet loaded -->
			<p class="mt-4 text-gray-500 dark:text-gray-400">Loading notifications...</p>
		{:else}
			<!-- Show message if notifications array is empty -->
			<p class="mt-4 text-gray-500 dark:text-gray-400">
				No relevant notifications found in the selected period.
			</p>
		{/if}
	</div>
</div>

<style>
	/* Basic custom scrollbar for the notification list (optional) */
	.custom-scrollbar::-webkit-scrollbar {
		width: 6px;
	}
	.custom-scrollbar::-webkit-scrollbar-track {
		background: transparent;
	}
	.custom-scrollbar::-webkit-scrollbar-thumb {
		background-color: rgba(156, 163, 175, 0.5); /* gray-400 with opacity */
		border-radius: 3px;
	}
	.dark .custom-scrollbar::-webkit-scrollbar-thumb {
		background-color: rgba(75, 85, 99, 0.6); /* gray-600 with opacity */
	}
</style>
