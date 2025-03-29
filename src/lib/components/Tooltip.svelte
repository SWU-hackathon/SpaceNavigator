<!-- src/lib/components/Tooltip.svelte -->
<!-- A reusable component to display a simple tooltip on hover over an icon. -->
<script lang="ts">
	// Prop for the text content of the tooltip.
	export let text: string;
	// Prop for customizing the styling of the tooltip trigger icon (optional).
	export let iconClass: string =
		'w-4 h-4 inline-block ml-1 text-gray-400 dark:text-gray-500 cursor-help';
</script>

<!-- The container span uses relative positioning for the absolute positioned tooltip. -->
<!-- `group` class enables `group-hover:` variants for the tooltip content. -->
<span class="group relative">
	<!-- Tooltip Trigger: Question Mark Icon -->
	<svg
		xmlns="http://www.w3.org/2000/svg"
		fill="none"
		viewBox="0 0 24 24"
		stroke-width="1.5"
		stroke="currentColor"
		class={iconClass}
	>
		<path
			stroke-linecap="round"
			stroke-linejoin="round"
			d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z"
		/>
	</svg>

	<!-- Tooltip Content: Hidden by default, appears on hover -->
	<span
		class="
      /* Positioning: above the icon, centered */ /* Fixed width for the
      tooltip */ /* Center horizontally using translate */
      /* Background and rounding */ /* Padding, text
      styling */ /* Fade-in effect on hover */
      /* Prevent tooltip from interfering with mouse events */ pointer-events-none absolute
      bottom-full left-1/2 z-20 mb-2 w-64 -translate-x-1/2 transform rounded-md bg-gray-800
      px-3 py-2 text-center text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100 dark:bg-gray-900
  "
	>
		{text}
		<!-- The tooltip text content -->

		<!-- Tooltip Arrow/Pointer -->
		<svg
			class="absolute left-1/2 top-full -ml-2 h-2 w-4 text-gray-800 dark:text-gray-900"
			x="0px"
			y="0px"
			viewBox="0 0 255 255"
			xml:space="preserve"
		>
			<polygon class="fill-current" points="0,0 127.5,127.5 255,0" />
			<!-- Simple triangle shape -->
		</svg>
	</span>
</span>
