import { describe, it, expect } from 'vitest';
import {
	parseDensity,
	slugify,
	findDuplicates,
	separateDuplicates,
	validateDensities,
	buildFromSupplemental
} from './clean-data.js';

describe('parseDensity', () => {
	it('parses single decimal value', () => {
		expect(parseDensity('0.61')).toEqual({ min: 0.61, max: 0.61, avg: 0.61 });
	});

	it('parses range value', () => {
		const result = parseDensity('0.38-0.42');
		expect(result.min).toBe(0.38);
		expect(result.max).toBe(0.42);
		expect(result.avg).toBeCloseTo(0.4);
	});

	it('parses integer value', () => {
		expect(parseDensity('1')).toEqual({ min: 1, max: 1, avg: 1 });
	});

	it('parses three-decimal value', () => {
		expect(parseDensity('0.117')).toEqual({ min: 0.117, max: 0.117, avg: 0.117 });
	});

	it('throws on invalid value', () => {
		expect(() => parseDensity('abc')).toThrow();
	});
});

describe('slugify', () => {
	it('converts name to lowercase slug', () => {
		expect(slugify('Barley, flour')).toBe('barley-flour');
	});

	it('handles slashes', () => {
		expect(slugify('Corn/maize flour, white')).toBe('corn-maize-flour-white');
	});

	it('handles parentheses and special chars', () => {
		expect(slugify('Breakfast cereal, cornflakes (dry cereal)')).toBe(
			'breakfast-cereal-cornflakes-dry-cereal'
		);
	});

	it('collapses multiple dashes', () => {
		expect(slugify('Alfalfa, meal, dehydrated 13%')).toBe('alfalfa-meal-dehydrated-13');
	});

	it('removes trailing dashes', () => {
		expect(slugify('Test item, ')).toBe('test-item');
	});
});

describe('findDuplicates', () => {
	it('detects items with same id', () => {
		const items = [
			{ id: 'corn-ear', name: 'Corn, ear', category: 'Grains', density: { min: 0.9, max: 0.9, avg: 0.9 }, source: 'OC-USDA', commonality: 3 },
			{ id: 'corn-ear', name: 'Corn, ear', category: 'Grains', density: { min: 0.9, max: 0.9, avg: 0.9 }, source: 'OC-USDA', commonality: 3 }
		];
		const dupes = findDuplicates(items);
		expect(dupes.length).toBeGreaterThan(0);
	});

	it('returns empty for unique items', () => {
		const items = [
			{ id: 'a', name: 'A', category: 'X', density: { min: 1, max: 1, avg: 1 }, source: 'S', commonality: 3 },
			{ id: 'b', name: 'B', category: 'X', density: { min: 2, max: 2, avg: 2 }, source: 'S', commonality: 3 }
		];
		expect(findDuplicates(items)).toEqual([]);
	});
});

describe('separateDuplicates', () => {
	it('separates duplicate items from clean items', () => {
		const items = [
			{ id: 'a', name: 'A', category: 'X', density: { min: 1, max: 1, avg: 1 }, source: 'S1', commonality: 3 },
			{ id: 'a', name: 'A', category: 'X', density: { min: 2, max: 2, avg: 2 }, source: 'S2', commonality: 3 },
			{ id: 'b', name: 'B', category: 'X', density: { min: 3, max: 3, avg: 3 }, source: 'S1', commonality: 3 }
		];
		const { clean, duplicates } = separateDuplicates(items);
		expect(clean).toHaveLength(1);
		expect(clean[0].id).toBe('b');
		expect(duplicates).toHaveLength(2);
	});
});

describe('validateDensities', () => {
	it('warns about items with density > 1.4', () => {
		const items = [
			{ id: 'honey', name: 'Honey', category: 'Sweets', density: { min: 1.42, max: 1.42, avg: 1.42 }, source: 'OC-USDA', commonality: 3 },
			{ id: 'flour', name: 'Flour', category: 'Grains', density: { min: 0.6, max: 0.6, avg: 0.6 }, source: 'OC-USDA', commonality: 3 }
		];
		const warnings = validateDensities(items);
		expect(warnings).toHaveLength(1);
		expect(warnings[0].name).toBe('Honey');
		expect(warnings[0].reason).toContain('> 1.4');
	});

	it('warns about items with density < 0.01', () => {
		const items = [
			{ id: 'bad-item', name: 'Bad Item', category: 'Other', density: { min: 0.005, max: 0.005, avg: 0.005 }, source: 'OC-USDA', commonality: 3 }
		];
		const warnings = validateDensities(items);
		expect(warnings).toHaveLength(1);
		expect(warnings[0].reason).toContain('< 0.01');
	});

	it('returns empty for items in normal range', () => {
		const items = [
			{ id: 'sugar', name: 'Sugar', category: 'Sweets', density: { min: 0.85, max: 0.85, avg: 0.85 }, source: 'OC-USDA', commonality: 3 },
			{ id: 'water', name: 'Water', category: 'Liquids', density: { min: 1.0, max: 1.0, avg: 1.0 }, source: 'OC-USDA', commonality: 3 }
		];
		expect(validateDensities(items)).toHaveLength(0);
	});
});

describe('buildFromSupplemental', () => {
	it('converts supplemental items to FoodItems', () => {
		const items = buildFromSupplemental([
			{ name: 'Honey', density: 1.42, source: 'OC-USDA', category: 'Sweets' },
			{ name: 'Corn/maize flour, white', density: 0.5, source: 'OC-USDA', category: 'Grains' }
		]);
		expect(items).toHaveLength(2);
		expect(items[0].id).toBe('honey');
		expect(items[0].density).toEqual({ min: 1.42, max: 1.42, avg: 1.42 });
		expect(items[0].commonality).toBe(3);
		expect(items[1].id).toBe('corn-maize-flour-white');
	});
});

describe('OC-USDA integration', () => {
	it('builds a valid database from OC-USDA JSON', async () => {
		const fs = await import('fs');
		const path = await import('path');
		const ocPath = path.resolve(import.meta.dirname, '..', 'food-density-onlineconversion.json');
		const rawItems = JSON.parse(fs.readFileSync(ocPath, 'utf-8'));
		const allItems = buildFromSupplemental(rawItems);
		const { clean } = separateDuplicates(allItems);

		// 400 items in OC-USDA, minus any duplicates
		expect(clean.length).toBeGreaterThan(380);
		expect(clean.length).toBeLessThanOrEqual(400);

		// All items have required fields
		for (const item of clean) {
			expect(item.id).toBeTruthy();
			expect(item.name).toBeTruthy();
			expect(item.category).toBeTruthy();
			expect(item.density.avg).toBeGreaterThan(0);
			expect(item.density.min).toBeLessThanOrEqual(item.density.max);
			expect(item.source).toBe('OC-USDA');
			expect(item.commonality).toBe(3);
		}

		// No duplicate IDs in clean data
		const ids = clean.map((i) => i.id);
		const uniqueIds = new Set(ids);
		expect(uniqueIds.size).toBe(ids.length);

		// Categories present
		const categories = [...new Set(clean.map((i) => i.category))];
		expect(categories.length).toBeGreaterThanOrEqual(5);
	});
});
