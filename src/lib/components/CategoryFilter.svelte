<script lang="ts">
	import { getCategories } from '$lib/data/food-database.js';

	let {
		selectedCategory = $bindable('')
	}: {
		selectedCategory: string;
	} = $props();

	const categories = getCategories();
</script>

<div class="category-filter" data-testid="category-filter">
	<button
		class:active={selectedCategory === ''}
		onclick={() => selectedCategory = ''}
	>
		All
	</button>
	{#each categories as category}
		<button
			class:active={selectedCategory === category}
			onclick={() => selectedCategory = selectedCategory === category ? '' : category}
			data-testid="category-chip"
		>
			{category}
		</button>
	{/each}
</div>

<style>
	.category-filter {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	button {
		padding: 0.25rem 0.75rem;
		border: 1px solid #ccc;
		border-radius: 16px;
		background: white;
		cursor: pointer;
		font-size: 0.85rem;
		transition: background 0.15s;
	}

	button:hover {
		background: #f0f0f0;
	}

	button.active {
		background: #4a90d9;
		color: white;
		border-color: #4a90d9;
	}
</style>
