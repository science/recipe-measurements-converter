import { describe, it, expect } from 'vitest';
import {
	parsePsvLine,
	parseDensity,
	slugify,
	fixTypos,
	findDuplicates,
	separateDuplicates,
	buildDatabase
} from './clean-data.js';

describe('parsePsvLine', () => {
	it('parses a standard line', () => {
		const result = parsePsvLine('Grains and cereals|Barley, flour|0.61||ASI');
		expect(result).toEqual({
			category: 'Grains and cereals',
			name: 'Barley, flour',
			density: '0.61',
			specificGravity: '',
			source: 'ASI'
		});
	});

	it('parses a line with specific gravity', () => {
		const result = parsePsvLine('Sweets|Syrup, corn, light|1.40|1.41|USDA');
		expect(result).toEqual({
			category: 'Sweets',
			name: 'Syrup, corn, light',
			density: '1.40',
			specificGravity: '1.41',
			source: 'USDA'
		});
	});

	it('parses a line with density range', () => {
		const result = parsePsvLine('Grains and cereals|Barley, ground|0.38-0.42||ASI');
		expect(result.density).toBe('0.38-0.42');
	});

	it('returns null for header line', () => {
		const result = parsePsvLine('Category|Food Name|Density (g/ml)|Specific Gravity|Source');
		expect(result).toBeNull();
	});

	it('returns null for empty line', () => {
		expect(parsePsvLine('')).toBeNull();
	});
});

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

describe('fixTypos', () => {
	it('fixes "Herbes" to "Herbs"', () => {
		expect(fixTypos('Herbes and spices')).toBe('Herbs and spices');
	});

	it('fixes "Bulrush mille" to "Bulrush millet"', () => {
		expect(fixTypos('Bulrush mille, fermented flour')).toBe(
			'Bulrush millet, fermented flour'
		);
	});

	it('fixes missing space after comma', () => {
		expect(fixTypos('Cassava,flour')).toBe('Cassava, flour');
	});

	it('fixes missing space in "Alfalfa,meal"', () => {
		expect(fixTypos('Alfalfa,meal, dehydrated 13%')).toBe(
			'Alfalfa, meal, dehydrated 13%'
		);
	});

	it('leaves correct text unchanged', () => {
		expect(fixTypos('Barley, flour')).toBe('Barley, flour');
	});
});

describe('findDuplicates', () => {
	it('detects items with same name', () => {
		const items = [
			{ id: 'corn-ear', name: 'Corn, ear', category: 'Grains', density: { min: 0.9, max: 0.9, avg: 0.9 }, source: 'TB' },
			{ id: 'corn-ear', name: 'Corn, ear', category: 'Grains', density: { min: 0.9, max: 0.9, avg: 0.9 }, source: 'ASI' }
		];
		const dupes = findDuplicates(items);
		expect(dupes.length).toBeGreaterThan(0);
	});

	it('returns empty for unique items', () => {
		const items = [
			{ id: 'a', name: 'A', category: 'X', density: { min: 1, max: 1, avg: 1 }, source: 'S' },
			{ id: 'b', name: 'B', category: 'X', density: { min: 2, max: 2, avg: 2 }, source: 'S' }
		];
		expect(findDuplicates(items)).toEqual([]);
	});
});

describe('separateDuplicates', () => {
	it('separates duplicate items from clean items', () => {
		const items = [
			{ id: 'a', name: 'A', category: 'X', density: { min: 1, max: 1, avg: 1 }, source: 'S1' },
			{ id: 'a', name: 'A', category: 'X', density: { min: 2, max: 2, avg: 2 }, source: 'S2' },
			{ id: 'b', name: 'B', category: 'X', density: { min: 3, max: 3, avg: 3 }, source: 'S1' }
		];
		const { clean, duplicates } = separateDuplicates(items);
		expect(clean).toHaveLength(1);
		expect(clean[0].id).toBe('b');
		expect(duplicates).toHaveLength(2);
	});
});

describe('buildDatabase (integration)', () => {
	it('produces a valid database from the PSV file', async () => {
		const fs = await import('fs');
		const path = await import('path');
		const psvPath = path.resolve(import.meta.dirname, '..', 'food-density.psv');
		const psvContent = fs.readFileSync(psvPath, 'utf-8');

		const db = buildDatabase(psvContent);

		// 375 data rows in PSV, minus duplicates
		expect(db.itemCount).toBeGreaterThan(340);
		expect(db.itemCount).toBeLessThan(376);
		expect(db.items.length).toBe(db.itemCount);

		// All items have required fields
		for (const item of db.items) {
			expect(item.id).toBeTruthy();
			expect(item.name).toBeTruthy();
			expect(item.category).toBeTruthy();
			expect(item.density.avg).toBeGreaterThan(0);
			expect(item.density.min).toBeLessThanOrEqual(item.density.max);
			expect(item.source).toBeTruthy();
		}

		// Categories present
		expect(db.categories.length).toBeGreaterThanOrEqual(13);

		// Typo fixes applied
		expect(db.categories).not.toContain('Herbes and spices');
		expect(db.categories).toContain('Herbs and spices');

		// No duplicate IDs in clean data
		const ids = db.items.map((i) => i.id);
		const uniqueIds = new Set(ids);
		expect(uniqueIds.size).toBe(ids.length);

		// Spot check: Barley flour exists
		const barleyFlour = db.items.find((i) => i.name === 'Barley, flour');
		expect(barleyFlour).toBeDefined();
		expect(barleyFlour!.density.avg).toBe(0.61);
		expect(barleyFlour!.category).toBe('Grains and cereals');
	});
});
