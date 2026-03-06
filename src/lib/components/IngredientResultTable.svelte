<script lang="ts">
	import { getItemById } from '$lib/data/food-database.js';
	import { convert } from '$lib/conversion.js';
	import { isPassthrough } from '$lib/bulk-types.js';
	import { formatRecipeLine } from '$lib/format.js';
	import { getMeasureById } from '$lib/measures.js';
	import IngredientResultRow from './IngredientResultRow.svelte';
	import type { MatchedIngredient } from '$lib/bulk-types.js';

	let { ingredients }: { ingredients: MatchedIngredient[] } = $props();

	let copied = $state(false);
	let memoText = $state('');

	function computeGrams(ing: MatchedIngredient): number | null {
		if (isPassthrough(ing.parsed)) return null;
		if (!ing.selectedItemId) return null;
		if (ing.parsed.quantity === null || ing.parsed.measure_id === null) return null;

		const item = getItemById(ing.selectedItemId);
		if (!item) return null;

		try {
			const result = convert({
				quantity: ing.parsed.quantity,
				measureId: ing.parsed.measure_id,
				density: item.density
			});
			return result.grams;
		} catch {
			return null;
		}
	}

	let totalGrams = $derived.by(() => {
		let total = 0;
		for (const ing of ingredients) {
			const g = computeGrams(ing);
			if (g !== null) total += g;
		}
		return Math.round(total * 10) / 10;
	});

	function formatRecipeText(ings: MatchedIngredient[]): string {
		return ings.map(ing => {
			const g = computeGrams(ing);
			const name = ing.parsed.name;
			const measure = ing.parsed.measure_id ? getMeasureById(ing.parsed.measure_id) : null;

			return formatRecipeLine({
				name,
				grams: g,
				quantity: ing.parsed.quantity,
				measureName: measure?.name.toLowerCase() ?? null
			});
		}).join('\n');
	}

	$effect(() => {
		memoText = formatRecipeText(ingredients);
	});

	async function copyToClipboard() {
		await navigator.clipboard.writeText(memoText);
		copied = true;
		setTimeout(() => copied = false, 2000);
	}
</script>

<div class="result-table-wrapper" data-testid="ingredient-result-table">
	<div class="table-actions">
		<button class="copy-btn" onclick={copyToClipboard} data-testid="copy-recipe-btn">
			{copied ? 'Copied!' : 'Copy to Clipboard'}
		</button>
	</div>
	<table class="result-table">
		<thead>
			<tr>
				<th>Original</th>
				<th>Matched Item</th>
				<th>Amount</th>
				<th>Grams</th>
			</tr>
		</thead>
		<tbody>
			{#each ingredients as ingredient (ingredient.parsed.original_text)}
				<IngredientResultRow {ingredient} />
			{/each}
		</tbody>
		<tfoot>
			<tr>
				<td colspan="3" class="total-label">Total</td>
				<td class="total-grams" data-testid="total-grams">{totalGrams}g</td>
			</tr>
		</tfoot>
	</table>

	<div class="memo-section">
		<label class="memo-label" for="converted-recipe">Converted Recipe</label>
		<textarea
			id="converted-recipe"
			class="memo-textarea"
			bind:value={memoText}
			data-testid="converted-recipe-memo"
			rows="8"
		></textarea>
	</div>
</div>

<style>
	.result-table-wrapper {
		overflow-x: auto;
		margin-top: 1rem;
	}

	.table-actions {
		display: flex;
		justify-content: flex-end;
		margin-bottom: 0.5rem;
	}

	.copy-btn {
		padding: 0.3rem 0.75rem;
		font-size: 0.8rem;
		border: 1px solid var(--color-border);
		border-radius: 4px;
		background: var(--color-bg-secondary, #2a2a2a);
		color: var(--color-text);
		cursor: pointer;
		transition: background 0.15s;
	}

	.copy-btn:hover {
		background: var(--color-border);
	}

	.result-table {
		width: 100%;
		border-collapse: collapse;
	}

	th {
		text-align: left;
		padding: 0.5rem;
		font-size: 0.8rem;
		color: var(--color-text-muted);
		border-bottom: 2px solid var(--color-border);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	th:last-child {
		text-align: right;
	}

	.total-label {
		text-align: right;
		padding: 0.5rem;
		font-weight: 600;
		font-size: 0.9rem;
		border-top: 2px solid var(--color-border);
	}

	.total-grams {
		text-align: right;
		padding: 0.5rem;
		font-weight: 700;
		font-size: 1rem;
		color: var(--color-accent);
		border-top: 2px solid var(--color-border);
	}

	.memo-section {
		margin-top: 1.25rem;
	}

	.memo-label {
		display: block;
		font-size: 0.8rem;
		color: var(--color-text-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: 0.35rem;
	}

	.memo-textarea {
		width: 100%;
		padding: 0.5rem;
		font-size: 0.85rem;
		font-family: inherit;
		border: 1px solid var(--color-border);
		border-radius: 4px;
		background: var(--color-bg-secondary, #2a2a2a);
		color: var(--color-text);
		resize: vertical;
	}
</style>
