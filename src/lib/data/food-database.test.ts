import { describe, it, expect } from 'vitest';
import {
	getAllItems,
	getCategories,
	getItemById,
	searchItems,
	getItemsByCategory
} from './food-database.js';

describe('getAllItems', () => {
	it('returns all items', () => {
		const items = getAllItems();
		expect(items.length).toBe(400);
	});

	it('items have valid structure', () => {
		for (const item of getAllItems()) {
			expect(item.id).toBeTruthy();
			expect(item.name).toBeTruthy();
			expect(item.category).toBeTruthy();
			expect(item.density.avg).toBeGreaterThan(0);
			expect(item.density.min).toBeLessThanOrEqual(item.density.max);
			expect(item.commonality).toBeGreaterThanOrEqual(1);
			expect(item.commonality).toBeLessThanOrEqual(10);
		}
	});
});

describe('getCategories', () => {
	it('returns all categories', () => {
		const cats = getCategories();
		expect(cats.length).toBeGreaterThanOrEqual(13);
	});

	it('includes expected categories', () => {
		const cats = getCategories();
		expect(cats).toContain('Grains and cereals');
		expect(cats).toContain('Herbs and spices');
		expect(cats).toContain('Sweets');
	});
});

describe('getItemById', () => {
	it('finds an item by id', () => {
		const item = getItemById('millet-flour');
		expect(item).toBeDefined();
		expect(item!.name).toBe('Millet flour');
	});

	it('returns undefined for unknown id', () => {
		expect(getItemById('nonexistent-item')).toBeUndefined();
	});
});

describe('searchItems', () => {
	it('finds items containing "flour" (substring match)', () => {
		const results = searchItems('flour');
		expect(results.length).toBeGreaterThan(10);
		for (const item of results) {
			const nameMatch = item.name.toLowerCase().includes('flour');
			const displayMatch = item.displayName?.toLowerCase().includes('flour') ?? false;
			expect(nameMatch || displayMatch).toBe(true);
		}
	});

	it('is case-insensitive', () => {
		const lower = searchItems('flour');
		const upper = searchItems('FLOUR');
		expect(lower.length).toBe(upper.length);
	});

	it('filters by category', () => {
		const results = searchItems('flour', 'Grains and cereals');
		expect(results.length).toBeGreaterThan(3);
		for (const item of results) {
			expect(item.category).toBe('Grains and cereals');
		}
	});

	it('returns fewer results with category filter', () => {
		const all = searchItems('oil');
		const filtered = searchItems('oil', 'Fats and oils');
		expect(filtered.length).toBeLessThan(all.length);
	});

	it('returns empty array for no matches', () => {
		expect(searchItems('xyz')).toEqual([]);
	});

	it('returns all items for empty query', () => {
		expect(searchItems('').length).toBe(400);
	});

	it('sorts results by commonality (most common first)', () => {
		const results = searchItems('flour');
		// First result should be a high-commonality item
		expect(results[0].commonality).toBeGreaterThanOrEqual(8);
		// Commonality should be non-increasing (within tolerance of alphabetical tiebreaks)
		for (let i = 1; i < results.length; i++) {
			expect(results[i].commonality).toBeLessThanOrEqual(results[i - 1].commonality);
		}
	});

	it('sorts alphabetically within same commonality score', () => {
		const results = searchItems('flour');
		for (let i = 1; i < results.length; i++) {
			if (results[i].commonality === results[i - 1].commonality) {
				expect(results[i - 1].name.localeCompare(results[i].name)).toBeLessThanOrEqual(0);
			}
		}
	});
});

describe('displayName', () => {
	it('adds displayName to items with friendly names', () => {
		const flour = getItemById('flour-wheat-white-all-purpose');
		expect(flour).toBeDefined();
		expect(flour!.displayName).toBe('Flour, all-purpose');
	});

	it('does not add displayName to items without friendly names', () => {
		const millet = getItemById('millet-flour');
		expect(millet).toBeDefined();
		expect(millet!.displayName).toBeUndefined();
	});

	it('searchItems matches on displayName', () => {
		const results = searchItems('unsalted');
		const butterIds = results.map((r) => r.id);
		expect(butterIds).toContain('butter-without-salt');
	});

	it('searchItems matches on displayName for sugar', () => {
		// sugar-granulated has displayName "Sugar" but original name "Sugar, granulated"
		const results = searchItems('granulated');
		const ids = results.map((r) => r.id);
		expect(ids).toContain('sugar-granulated');
	});
});

describe('getItemsByCategory', () => {
	it('returns items in a category', () => {
		const items = getItemsByCategory('Sweets');
		expect(items.length).toBeGreaterThan(5);
		for (const item of items) {
			expect(item.category).toBe('Sweets');
		}
	});

	it('returns empty for unknown category', () => {
		expect(getItemsByCategory('Nonexistent')).toEqual([]);
	});
});
