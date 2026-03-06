import { describe, it, expect } from 'vitest';
import { measures, getMeasureById, isWeightMeasure } from './measures.js';

describe('measures', () => {
	it('has 9 measures', () => {
		expect(measures).toHaveLength(9);
	});

	it('has 6 volume measures', () => {
		expect(measures.filter((m) => m.type === 'volume')).toHaveLength(6);
	});

	it('has 3 weight measures', () => {
		expect(measures.filter((m) => m.type === 'weight')).toHaveLength(3);
	});

	it('all volume measures have positive ml values', () => {
		for (const m of measures) {
			if (m.type === 'volume') {
				expect(m.mlPerUnit).toBeGreaterThan(0);
			}
		}
	});

	it('all weight measures have positive gram values', () => {
		for (const m of measures) {
			if (m.type === 'weight') {
				expect(m.gramsPerUnit).toBeGreaterThan(0);
			}
		}
	});
});

describe('getMeasureById', () => {
	it('finds cup', () => {
		const cup = getMeasureById('cup');
		expect(cup).toBeDefined();
		expect(cup!.type).toBe('volume');
		if (cup!.type === 'volume') {
			expect(cup!.mlPerUnit).toBe(236.588);
		}
	});

	it('finds oz', () => {
		const oz = getMeasureById('oz');
		expect(oz).toBeDefined();
		expect(oz!.type).toBe('weight');
		if (oz!.type === 'weight') {
			expect(oz!.gramsPerUnit).toBe(28.3495);
		}
	});

	it('returns undefined for unknown id', () => {
		expect(getMeasureById('unknown')).toBeUndefined();
	});
});

describe('isWeightMeasure', () => {
	it('returns true for weight measures', () => {
		const oz = getMeasureById('oz')!;
		expect(isWeightMeasure(oz)).toBe(true);
	});

	it('returns false for volume measures', () => {
		const cup = getMeasureById('cup')!;
		expect(isWeightMeasure(cup)).toBe(false);
	});
});
