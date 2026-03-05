<script lang="ts">
	import type { FoodItem } from '$lib/data/types.js';
	import { searchItems, getCategories } from '$lib/data/food-database.js';

	let {
		selectedFood = $bindable<FoodItem | null>(null),
		selectedCategory = $bindable('')
	}: {
		selectedFood: FoodItem | null;
		selectedCategory: string;
	} = $props();

	let query = $state('');
	let isOpen = $state(false);
	let highlightIndex = $state(-1);
	let inputEl: HTMLInputElement | undefined = $state();

	let results = $derived(searchItems(query, selectedCategory || undefined));

	function selectItem(item: FoodItem) {
		selectedFood = item;
		query = item.name;
		isOpen = false;
		highlightIndex = -1;
	}

	function handleInput() {
		isOpen = query.length > 0;
		highlightIndex = -1;
		if (selectedFood && query !== selectedFood.name) {
			selectedFood = null;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (!isOpen) {
			if (e.key === 'ArrowDown' && query.length > 0) {
				isOpen = true;
				highlightIndex = 0;
				e.preventDefault();
			}
			return;
		}

		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				highlightIndex = Math.min(highlightIndex + 1, results.length - 1);
				break;
			case 'ArrowUp':
				e.preventDefault();
				highlightIndex = Math.max(highlightIndex - 1, 0);
				break;
			case 'Enter':
				e.preventDefault();
				if (highlightIndex >= 0 && highlightIndex < results.length) {
					selectItem(results[highlightIndex]);
				}
				break;
			case 'Escape':
				isOpen = false;
				highlightIndex = -1;
				break;
		}
	}

	function handleFocus() {
		if (query.length > 0) isOpen = true;
	}

	function handleBlur() {
		// Delay to allow click on dropdown items
		setTimeout(() => { isOpen = false; }, 200);
	}
</script>

<div class="food-search">
	<input
		bind:this={inputEl}
		bind:value={query}
		oninput={handleInput}
		onkeydown={handleKeydown}
		onfocus={handleFocus}
		onblur={handleBlur}
		type="text"
		placeholder="Search ingredients..."
		data-testid="food-search-input"
		role="combobox"
		aria-expanded={isOpen}
		aria-autocomplete="list"
		aria-controls="food-search-listbox"
	/>

	{#if isOpen && results.length > 0}
		<ul id="food-search-listbox" class="dropdown" role="listbox" data-testid="food-search-dropdown">
			{#each results as item, i}
				<li
					role="option"
					aria-selected={i === highlightIndex}
					class:highlighted={i === highlightIndex}
					onmousedown={() => selectItem(item)}
					data-testid="food-search-option"
				>
					<span class="item-name">{item.name}</span>
					<span class="item-category">{item.category}</span>
				</li>
			{/each}
		</ul>
	{/if}

	{#if isOpen && query.length > 0 && results.length === 0}
		<div class="dropdown no-results" data-testid="no-results">
			No ingredients found for "{query}"
		</div>
	{/if}
</div>

<style>
	.food-search {
		position: relative;
	}

	input {
		width: 100%;
		padding: 0.5rem 0.75rem;
		font-size: 1rem;
		border: 1px solid #ccc;
		border-radius: 4px;
		box-sizing: border-box;
	}

	input:focus {
		outline: 2px solid #4a90d9;
		border-color: #4a90d9;
	}

	.dropdown {
		position: absolute;
		top: 100%;
		left: 0;
		right: 0;
		max-height: 300px;
		overflow-y: auto;
		background: white;
		border: 1px solid #ccc;
		border-top: none;
		border-radius: 0 0 4px 4px;
		z-index: 10;
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.dropdown li {
		padding: 0.5rem 0.75rem;
		cursor: pointer;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.dropdown li:hover,
	.dropdown li.highlighted {
		background: #e8f0fe;
	}

	.item-category {
		font-size: 0.8rem;
		color: #666;
	}

	.no-results {
		padding: 0.75rem;
		color: #666;
		font-style: italic;
	}
</style>
