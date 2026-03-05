<script lang="ts">
	import { measures } from '$lib/measures.js';

	let {
		selectedMeasureId = $bindable('cup')
	}: {
		selectedMeasureId: string;
	} = $props();
</script>

<select bind:value={selectedMeasureId} data-testid="measure-select">
	{#each measures as measure}
		<option value={measure.id}>{measure.name}</option>
	{/each}
</select>

<style>
	select {
		padding: 0.5rem 0.75rem;
		font-size: 1rem;
		border: 1px solid #ccc;
		border-radius: 4px;
		background: white;
	}
</style>
