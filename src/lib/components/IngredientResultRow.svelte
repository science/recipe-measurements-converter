<script lang="ts">
	import { getItemById } from '$lib/data/food-database.js';
	import { convert } from '$lib/conversion.js';
	import { isPassthrough } from '$lib/bulk-types.js';
	import { formatQuantity } from '$lib/format.js';
	import { measures, isWeightMeasure } from '$lib/measures.js';
	import MatchSelector from './MatchSelector.svelte';
	import type { MatchedIngredient } from '$lib/bulk-types.js';

	let { ingredient }: { ingredient: MatchedIngredient } = $props();

	let editingQty = $state(false);
	let editingMeasure = $state(false);
	let editQtyValue = $state('');

	const volumeMeasures = measures.filter(m => !isWeightMeasure(m));
	const weightMeasures = measures.filter(m => isWeightMeasure(m));

	let grams = $derived.by(() => {
		if (isPassthrough(ingredient.parsed)) return null;
		if (!ingredient.selectedItemId) return null;
		if (ingredient.parsed.quantity === null) return null;
		if (ingredient.parsed.measure_id === null) return null;

		const item = getItemById(ingredient.selectedItemId);
		if (!item) return null;

		try {
			const result = convert({
				quantity: ingredient.parsed.quantity,
				measureId: ingredient.parsed.measure_id,
				density: item.density
			});
			return result.grams;
		} catch {
			return null;
		}
	});

	let confidenceClass = $derived(
		ingredient.confidence === 'high' ? 'conf-high' :
		ingredient.confidence === 'uncertain' ? 'conf-uncertain' : 'conf-none'
	);

	function startEditQty() {
		if (ingredient.parsed.quantity === null) return;
		editQtyValue = formatQuantity(ingredient.parsed.quantity);
		editingQty = true;
	}

	function saveQty() {
		const parsed = parseFloat(editQtyValue);
		if (!isNaN(parsed) && parsed >= 0) {
			ingredient.parsed.quantity = parsed;
		}
		editingQty = false;
	}

	function cancelQty() {
		editingQty = false;
	}

	function handleQtyKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') saveQty();
		if (e.key === 'Escape') cancelQty();
	}

	function startEditMeasure() {
		editingMeasure = true;
	}

	function handleMeasureChange(e: Event) {
		const select = e.target as HTMLSelectElement;
		ingredient.parsed.measure_id = select.value;
		editingMeasure = false;
	}

	function autofocusSelect(node: HTMLInputElement | HTMLSelectElement) {
		node.focus();
		if (node instanceof HTMLInputElement) {
			node.select();
		}
	}
</script>

<tr class="result-row" class:passthrough={isPassthrough(ingredient.parsed)} data-testid="ingredient-row">
	<td class="original-text">{ingredient.parsed.original_text}</td>
	{#if isPassthrough(ingredient.parsed)}
		<td colspan="3" class="passthrough-label">
			<span class="passthrough-text">{ingredient.parsed.name}</span>
		</td>
	{:else}
		<td class="match-cell">
			<MatchSelector
				matches={ingredient.matches}
				bind:selectedItemId={ingredient.selectedItemId}
				confidence={ingredient.confidence}
			/>
		</td>
		<td class="qty-cell">
			{#if ingredient.parsed.quantity !== null}
				{#if editingQty}
					<input
						type="number"
						class="edit-qty-input"
						bind:value={editQtyValue}
						onblur={saveQty}
						onkeydown={handleQtyKeydown}
						use:autofocusSelect
						step="any"
						min="0"
					/>
				{:else}
					<span class="editable-qty" onclick={startEditQty} role="button" tabindex="0" onkeydown={(e) => e.key === 'Enter' && startEditQty()}>
						{formatQuantity(ingredient.parsed.quantity)}
					</span>
				{/if}
				{#if ingredient.parsed.measure_id}
					{' '}
					{#if editingMeasure}
						<select
							class="edit-measure-select"
							value={ingredient.parsed.measure_id}
							onchange={handleMeasureChange}
							onblur={() => editingMeasure = false}
							use:autofocusSelect
						>
							<optgroup label="Volume">
								{#each volumeMeasures as m}
									<option value={m.id}>{m.name}</option>
								{/each}
							</optgroup>
							<optgroup label="Weight">
								{#each weightMeasures as m}
									<option value={m.id}>{m.name}</option>
								{/each}
							</optgroup>
						</select>
					{:else}
						<span class="editable-measure" onclick={startEditMeasure} role="button" tabindex="0" onkeydown={(e) => e.key === 'Enter' && startEditMeasure()}>
							{ingredient.parsed.measure_id}
						</span>
					{/if}
				{/if}
			{:else}
				—
			{/if}
		</td>
		<td class="grams-cell {confidenceClass}" data-testid="grams-result">
			{#if grams !== null}
				{grams}g
			{:else}
				—
			{/if}
		</td>
	{/if}
</tr>

<style>
	.result-row td {
		padding: 0.4rem 0.5rem;
		border-bottom: 1px solid var(--color-border);
		font-size: 0.85rem;
		vertical-align: middle;
	}

	.original-text {
		max-width: 200px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		color: var(--color-text-secondary);
	}

	.match-cell {
		min-width: 200px;
	}

	.qty-cell {
		white-space: nowrap;
		text-align: center;
	}

	.grams-cell {
		text-align: right;
		font-weight: 600;
		white-space: nowrap;
	}

	.conf-high {
		color: #a6e22e;
	}

	.conf-uncertain {
		color: #e6db74;
	}

	.conf-none {
		color: #f92672;
	}

	.passthrough td {
		color: var(--color-text-muted);
	}

	.passthrough-text {
		font-style: italic;
	}

	.passthrough-label {
		text-align: center;
	}

	.editable-qty,
	.editable-measure {
		cursor: pointer;
		border-bottom: 1px dashed transparent;
	}

	.editable-qty:hover,
	.editable-measure:hover {
		border-bottom-color: var(--color-text-secondary);
	}

	.edit-qty-input {
		width: 4rem;
		padding: 0.1rem 0.25rem;
		font-size: 0.85rem;
		border: 1px solid var(--color-border);
		border-radius: 3px;
		background: var(--color-bg-secondary, #2a2a2a);
		color: inherit;
	}

	.edit-measure-select {
		padding: 0.1rem 0.25rem;
		font-size: 0.85rem;
		border: 1px solid var(--color-border);
		border-radius: 3px;
		background: var(--color-bg-secondary, #2a2a2a);
		color: inherit;
	}
</style>
