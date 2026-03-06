<script lang="ts">
	import { getItemById } from '$lib/data/food-database.js';
	import type { MatchResult } from '$lib/bulk-types.js';

	let {
		matches,
		selectedItemId = $bindable(null as string | null),
		confidence
	}: {
		matches: MatchResult[];
		selectedItemId: string | null;
		confidence: 'high' | 'uncertain' | 'none';
	} = $props();

	function itemName(id: string): string {
		const item = getItemById(id);
		return item?.displayName ?? item?.name ?? id;
	}
</script>

<select
	class="match-selector"
	class:high={confidence === 'high'}
	class:uncertain={confidence === 'uncertain'}
	class:none={confidence === 'none'}
	bind:value={selectedItemId}
	data-testid="match-selector"
>
	{#if matches.length === 0}
		<option value={null}>No match</option>
	{:else}
		{#each matches as match}
			<option value={match.itemId}>
				{itemName(match.itemId)}
			</option>
		{/each}
		<option value={null}>None of these</option>
	{/if}
</select>

<style>
	.match-selector {
		width: 100%;
		padding: 0.25rem 0.5rem;
		font-size: 0.85rem;
		border: 1px solid var(--color-border);
		border-radius: 4px;
		background: var(--color-input-bg);
		color: var(--color-text);
	}

	.high {
		border-color: #a6e22e;
	}

	.uncertain {
		border-color: #e6db74;
	}

	.none {
		border-color: #f92672;
	}
</style>
