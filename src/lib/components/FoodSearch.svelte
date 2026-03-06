<script lang="ts">
	import type { FoodItem } from '$lib/data/types.js';
	import { searchItems } from '$lib/data/food-database.js';

	let {
		selectedFood = $bindable<FoodItem | null>(null)
	}: {
		selectedFood: FoodItem | null;
	} = $props();

	let query = $state('');
	let isOpen = $state(false);
	let highlightIndex = $state(-1);
	let suppressNextOpen = $state(false);
	let inputEl: HTMLInputElement | undefined = $state();
	let listEl: HTMLUListElement | undefined = $state();

	let results = $derived(searchItems(query));

	function selectItem(item: FoodItem) {
		selectedFood = item;
		query = item.displayName ?? item.name;
		isOpen = false;
		highlightIndex = -1;
		// Select all text so typing immediately replaces it
		requestAnimationFrame(() => {
			inputEl?.focus();
			inputEl?.select();
		});
	}

	function handleInput() {
		isOpen = query.length > 0;
		highlightIndex = -1;
		if (selectedFood && query !== (selectedFood.displayName ?? selectedFood.name)) {
			selectedFood = null;
		}
	}

	function focusItem(index: number) {
		highlightIndex = index;
		const items = listEl?.querySelectorAll<HTMLElement>('[role="option"]');
		items?.[index]?.focus();
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
			case 'Tab':
				if (!e.shiftKey && results.length > 0) {
					e.preventDefault();
					focusItem(highlightIndex < 0 ? 0 : highlightIndex);
				}
				break;
			case 'Escape':
				isOpen = false;
				highlightIndex = -1;
				break;
		}
	}

	function handleItemKeydown(e: KeyboardEvent, index: number) {
		switch (e.key) {
			case 'Enter':
			case ' ':
				e.preventDefault();
				selectItem(results[index]);
				break;
			case 'ArrowDown':
				e.preventDefault();
				if (index < results.length - 1) {
					focusItem(index + 1);
				}
				break;
			case 'ArrowUp':
				e.preventDefault();
				if (index > 0) {
					focusItem(index - 1);
				} else {
					highlightIndex = -1;
					inputEl?.focus();
				}
				break;
			case 'Tab':
				if (e.shiftKey) {
					e.preventDefault();
					highlightIndex = -1;
					inputEl?.focus();
				} else if (index < results.length - 1) {
					e.preventDefault();
					focusItem(index + 1);
				} else {
					// Last item: let Tab leave naturally, close dropdown
					isOpen = false;
					highlightIndex = -1;
				}
				break;
			case 'Escape':
				e.preventDefault();
				isOpen = false;
				highlightIndex = -1;
				suppressNextOpen = true;
				inputEl?.focus();
				break;
		}
	}

	function handleFocus() {
		if (suppressNextOpen) {
			suppressNextOpen = false;
			return;
		}
		if (selectedFood) {
			// Re-select all text so typing replaces the current selection
			inputEl?.select();
		} else if (query.length > 0) {
			isOpen = true;
		}
	}

	function handleBlur(e: FocusEvent) {
		// Don't close if focus is moving to a dropdown item
		const related = e.relatedTarget as HTMLElement | null;
		if (related && listEl?.contains(related)) return;
		setTimeout(() => { isOpen = false; }, 200);
	}

	function handleListBlur(e: FocusEvent) {
		// Close dropdown when focus leaves the list entirely
		const related = e.relatedTarget as HTMLElement | null;
		if (related && (listEl?.contains(related) || related === inputEl)) return;
		setTimeout(() => {
			isOpen = false;
			highlightIndex = -1;
		}, 200);
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
		aria-activedescendant={highlightIndex >= 0 ? `food-search-option-${highlightIndex}` : undefined}
	/>

	{#if isOpen && results.length > 0}
		<ul
			bind:this={listEl}
			id="food-search-listbox"
			class="dropdown"
			role="listbox"
			data-testid="food-search-dropdown"
			onblur={handleListBlur}
		>
			{#each results as item, i}
				<li
					id="food-search-option-{i}"
					role="option"
					tabindex="-1"
					aria-selected={i === highlightIndex}
					class:highlighted={i === highlightIndex}
					onmousedown={() => selectItem(item)}
					onkeydown={(e) => handleItemKeydown(e, i)}
					data-testid="food-search-option"
				>
					<span class="item-name">{item.displayName ?? item.name}</span>
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
		border: 1px solid var(--color-border);
		border-radius: 4px;
		box-sizing: border-box;
		background: var(--color-input-bg);
		color: var(--color-text);
	}

	input:focus {
		outline: 2px solid var(--color-accent);
		border-color: var(--color-accent);
	}

	.dropdown {
		position: absolute;
		top: 100%;
		left: 0;
		right: 0;
		max-height: 300px;
		overflow-y: auto;
		background: var(--color-dropdown-bg);
		border: 1px solid var(--color-border);
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
	.dropdown li.highlighted,
	.dropdown li:focus {
		background: var(--color-highlight);
		outline: none;
	}

	.item-category {
		font-size: 0.8rem;
		color: var(--color-text-muted);
	}

	.no-results {
		padding: 0.75rem;
		color: var(--color-text-secondary);
		font-style: italic;
	}
</style>
