import { describe, it, expect } from 'vitest';
import { formatQuantity, formatRecipeLine } from './format.js';

describe('formatQuantity', () => {
	it('returns integers without decimals', () => {
		expect(formatQuantity(2)).toBe('2');
		expect(formatQuantity(100)).toBe('100');
	});

	it('preserves meaningful decimals up to 2 places', () => {
		expect(formatQuantity(0.5)).toBe('0.5');
		expect(formatQuantity(1.25)).toBe('1.25');
	});

	it('rounds long decimals to 2 places', () => {
		expect(formatQuantity(0.6666666667)).toBe('0.67');
		expect(formatQuantity(0.3333333333)).toBe('0.33');
		expect(formatQuantity(1.006)).toBe('1.01');
	});

	it('strips trailing zeros', () => {
		expect(formatQuantity(1.10)).toBe('1.1');
		expect(formatQuantity(2.00)).toBe('2');
		expect(formatQuantity(3.50)).toBe('3.5');
	});

	it('handles zero', () => {
		expect(formatQuantity(0)).toBe('0');
	});
});

describe('formatRecipeLine', () => {
	it('formats a standard volume conversion: grams first, name, then measure in parens', () => {
		const result = formatRecipeLine({
			name: 'Flour, all-purpose',
			grams: 120,
			quantity: 1,
			measureName: 'cup'
		});
		expect(result).toBe('120g Flour, all-purpose (1 cup)');
	});

	it('formats fractional quantities', () => {
		const result = formatRecipeLine({
			name: 'Flour, all-purpose',
			grams: 83.3,
			quantity: 0.67,
			measureName: 'cup'
		});
		expect(result).toBe('83.3g Flour, all-purpose (0.67 cup)');
	});

	it('returns just the name for passthrough items', () => {
		const result = formatRecipeLine({
			name: '3 large eggs',
			grams: null,
			quantity: null,
			measureName: null
		});
		expect(result).toBe('3 large eggs');
	});

	it('shows name with measure when grams is null (no match)', () => {
		const result = formatRecipeLine({
			name: 'Mystery spice',
			grams: null,
			quantity: 2,
			measureName: 'tsp'
		});
		expect(result).toBe('Mystery spice (2 tsp)');
	});

	it('handles weight measures the same way', () => {
		const result = formatRecipeLine({
			name: 'Butter, unsalted',
			grams: 113.4,
			quantity: 4,
			measureName: 'oz'
		});
		expect(result).toBe('113.4g Butter, unsalted (4 oz)');
	});

	it('handles quantity without measure', () => {
		const result = formatRecipeLine({
			name: 'Bananas',
			grams: null,
			quantity: 3,
			measureName: null
		});
		expect(result).toBe('Bananas (3)');
	});
});
