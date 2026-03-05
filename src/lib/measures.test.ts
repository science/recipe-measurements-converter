import { describe, it, expect } from 'vitest';
import { measures, getMeasureById } from './measures.js';

describe('measures', () => {
	it('has 6 measures', () => {
		expect(measures).toHaveLength(6);
	});

	it('all measures have positive ml values', () => {
		for (const m of measures) {
			expect(m.mlPerUnit).toBeGreaterThan(0);
		}
	});
});

describe('getMeasureById', () => {
	it('finds cup', () => {
		const cup = getMeasureById('cup');
		expect(cup).toBeDefined();
		expect(cup!.mlPerUnit).toBe(236.588);
	});

	it('returns undefined for unknown id', () => {
		expect(getMeasureById('unknown')).toBeUndefined();
	});
});
