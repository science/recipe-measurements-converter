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
		expect(items.length).toBe(357);
	});

	it('items have valid structure', () => {
		for (const item of getAllItems()) {
			expect(item.id).toBeTruthy();
			expect(item.name).toBeTruthy();
			expect(item.category).toBeTruthy();
			expect(item.density.avg).toBeGreaterThan(0);
			expect(item.density.min).toBeLessThanOrEqual(item.density.max);
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
		expect(cats).toContain('Mixed dishes');
	});

	it('does not include typo category', () => {
		expect(getCategories()).not.toContain('Herbes and spices');
	});
});

describe('getItemById', () => {
	it('finds an item by id', () => {
		const item = getItemById('barley-flour');
		expect(item).toBeDefined();
		expect(item!.name).toBe('Barley, flour');
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
			expect(item.name.toLowerCase()).toContain('flour');
		}
	});

	it('is case-insensitive', () => {
		const lower = searchItems('flour');
		const upper = searchItems('FLOUR');
		expect(lower.length).toBe(upper.length);
	});

	it('filters by category', () => {
		const results = searchItems('flour', 'Grains and cereals');
		expect(results.length).toBeGreaterThan(5);
		for (const item of results) {
			expect(item.category).toBe('Grains and cereals');
			expect(item.name.toLowerCase()).toContain('flour');
		}
	});

	it('returns fewer results with category filter', () => {
		const all = searchItems('flour');
		const filtered = searchItems('flour', 'Grains and cereals');
		expect(filtered.length).toBeLessThan(all.length);
	});

	it('returns empty array for no matches', () => {
		expect(searchItems('xyz')).toEqual([]);
	});

	it('returns all items for empty query', () => {
		expect(searchItems('').length).toBe(357);
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
