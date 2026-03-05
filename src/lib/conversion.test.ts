import { describe, it, expect } from 'vitest';
import { volumeToMl, mlToGrams, convert } from './conversion.js';

describe('volumeToMl', () => {
	it('converts 1 cup to ~236.588 ml', () => {
		expect(volumeToMl(1, 'cup')).toBeCloseTo(236.588);
	});

	it('converts 2 tbsp to ~29.574 ml', () => {
		expect(volumeToMl(2, 'tbsp')).toBeCloseTo(29.574);
	});

	it('converts 1 ml to 1 ml', () => {
		expect(volumeToMl(1, 'ml')).toBe(1);
	});

	it('converts 0 quantity to 0', () => {
		expect(volumeToMl(0, 'cup')).toBe(0);
	});

	it('throws on unknown measure', () => {
		expect(() => volumeToMl(1, 'unknown')).toThrow('Unknown measure');
	});
});

describe('mlToGrams', () => {
	it('converts ml to grams with density', () => {
		expect(mlToGrams(100, 0.5)).toBeCloseTo(50);
	});

	it('returns 0 for 0 ml', () => {
		expect(mlToGrams(0, 0.5)).toBe(0);
	});
});

describe('convert', () => {
	it('converts 1 cup wheat flour (density 0.521) to ~123.2g', () => {
		const result = convert({
			quantity: 1,
			measureId: 'cup',
			density: { min: 0.521, max: 0.521, avg: 0.521 }
		});
		expect(result.grams).toBeCloseTo(123.3, 0);
		expect(result.gramsMin).toBeUndefined();
		expect(result.gramsMax).toBeUndefined();
	});

	it('shows range for range density', () => {
		const result = convert({
			quantity: 1,
			measureId: 'cup',
			density: { min: 0.38, max: 0.42, avg: 0.4 }
		});
		expect(result.grams).toBeCloseTo(94.6, 0);
		expect(result.gramsMin).toBeDefined();
		expect(result.gramsMax).toBeDefined();
		expect(result.gramsMin!).toBeLessThan(result.gramsMax!);
	});

	it('handles 0 quantity', () => {
		const result = convert({
			quantity: 0,
			measureId: 'cup',
			density: { min: 0.5, max: 0.5, avg: 0.5 }
		});
		expect(result.grams).toBe(0);
	});

	it('converts tablespoons correctly', () => {
		const result = convert({
			quantity: 1,
			measureId: 'tbsp',
			density: { min: 0.9, max: 0.9, avg: 0.9 }
		});
		// 14.787 * 0.9 ≈ 13.3
		expect(result.grams).toBeCloseTo(13.3, 0);
	});
});
