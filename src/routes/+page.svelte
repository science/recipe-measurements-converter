<script lang="ts">
	import type { FoodItem } from '$lib/data/types.js';
	import type { ConversionResult } from '$lib/conversion.js';
	import { convert } from '$lib/conversion.js';
	import FoodSearch from '$lib/components/FoodSearch.svelte';
	import MeasureSelector from '$lib/components/MeasureSelector.svelte';
	import ConversionResultDisplay from '$lib/components/ConversionResult.svelte';
	import CategoryFilter from '$lib/components/CategoryFilter.svelte';

	let selectedFood = $state<FoodItem | null>(null);
	let selectedMeasureId = $state('cup');
	let quantity = $state(1);
	let selectedCategory = $state('');

	let result = $derived<ConversionResult | null>(
		selectedFood
			? convert({ quantity, measureId: selectedMeasureId, density: selectedFood.density })
			: null
	);
</script>

<div class="app">
	<h1>Recipe Measurements Converter</h1>
	<p class="subtitle">Convert volume measurements to grams using food density data</p>

	<section class="converter">
		<div class="search-section">
			<label for="food-search">Ingredient</label>
			<FoodSearch bind:selectedFood bind:selectedCategory />
		</div>

		<div class="controls">
			<div class="quantity-section">
				<label for="quantity-input">Quantity</label>
				<input
					id="quantity-input"
					type="number"
					min="0"
					step="0.25"
					bind:value={quantity}
					data-testid="quantity-input"
				/>
			</div>

			<div class="measure-section">
				<label for="measure-select">Measure</label>
				<MeasureSelector bind:selectedMeasureId />
			</div>
		</div>

		<ConversionResultDisplay {result} />

		{#if selectedFood}
			<div class="selected-info" data-testid="selected-info">
				<strong>{selectedFood.name}</strong> — density: {selectedFood.density.avg} g/ml
				{#if selectedFood.density.min !== selectedFood.density.max}
					({selectedFood.density.min}–{selectedFood.density.max})
				{/if}
				<span class="source">Source: {selectedFood.source}</span>
			</div>
		{/if}
	</section>

	<section class="categories">
		<h2>Filter by category</h2>
		<CategoryFilter bind:selectedCategory />
	</section>
</div>

<style>
	.app {
		max-width: 600px;
		margin: 0 auto;
		padding: 2rem 1rem;
		font-family: system-ui, -apple-system, sans-serif;
	}

	h1 {
		margin-bottom: 0.25rem;
	}

	.subtitle {
		color: #666;
		margin-top: 0;
	}

	.converter {
		margin: 2rem 0;
	}

	.search-section {
		margin-bottom: 1rem;
	}

	label {
		display: block;
		font-weight: 600;
		margin-bottom: 0.25rem;
		font-size: 0.9rem;
	}

	.controls {
		display: flex;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.quantity-section {
		flex: 1;
	}

	.measure-section {
		flex: 1;
	}

	#quantity-input {
		width: 100%;
		padding: 0.5rem 0.75rem;
		font-size: 1rem;
		border: 1px solid #ccc;
		border-radius: 4px;
		box-sizing: border-box;
	}

	.selected-info {
		font-size: 0.85rem;
		color: #555;
		padding: 0.75rem;
		background: #f8f8f8;
		border-radius: 4px;
		margin-top: 0.5rem;
	}

	.source {
		display: block;
		margin-top: 0.25rem;
		color: #888;
	}

	.categories {
		margin-top: 2rem;
	}

	h2 {
		font-size: 1.1rem;
		margin-bottom: 0.75rem;
	}
</style>
