<script lang="ts">
	import { measures } from '$lib/measures.js';

	let {
		selectedMeasureId = $bindable('cup')
	}: {
		selectedMeasureId: string;
	} = $props();

	const volumeMeasures = measures.filter((m) => m.type === 'volume');
	const weightMeasures = measures.filter((m) => m.type === 'weight');
</script>

<select bind:value={selectedMeasureId} data-testid="measure-select">
	<optgroup label="Volume">
		{#each volumeMeasures as measure}
			<option value={measure.id}>{measure.name}</option>
		{/each}
	</optgroup>
	<optgroup label="Weight">
		{#each weightMeasures as measure}
			<option value={measure.id}>{measure.name}</option>
		{/each}
	</optgroup>
</select>

<style>
	select {
		padding: 0.5rem 0.75rem;
		font-size: 1rem;
		border: 1px solid var(--color-border);
		border-radius: 4px;
		background: var(--color-input-bg);
		color: var(--color-text);
	}
</style>
