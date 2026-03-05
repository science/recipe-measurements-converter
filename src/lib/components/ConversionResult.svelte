<script lang="ts">
	import type { ConversionResult } from '$lib/conversion.js';

	let {
		result
	}: {
		result: ConversionResult | null;
	} = $props();
</script>

<div class="conversion-result" data-testid="conversion-result">
	{#if result}
		<div class="grams">
			<span class="value" data-testid="grams-value">{result.grams}</span>
			<span class="unit">g</span>
		</div>
		{#if result.gramsMin != null && result.gramsMax != null}
			<div class="range" data-testid="grams-range">
				{result.gramsMin} – {result.gramsMax} g
			</div>
		{/if}
	{:else}
		<div class="empty" data-testid="no-conversion">
			Select an ingredient to see the conversion
		</div>
	{/if}
</div>

<style>
	.conversion-result {
		padding: 1rem;
		text-align: center;
	}

	.grams {
		font-size: 2rem;
		font-weight: bold;
	}

	.unit {
		font-size: 1.2rem;
		color: #666;
	}

	.range {
		font-size: 0.9rem;
		color: #666;
		margin-top: 0.25rem;
	}

	.empty {
		color: #999;
		font-style: italic;
	}
</style>
