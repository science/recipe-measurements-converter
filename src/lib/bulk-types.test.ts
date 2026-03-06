import { describe, it, expect } from 'vitest';
import { isPassthrough } from './bulk-types.js';
import type { ParsedIngredient } from './bulk-types.js';

describe('isPassthrough', () => {
	it('returns true when both quantity and measure_id are null', () => {
		const egg: ParsedIngredient = {
			name: '3 large eggs',
			quantity: null,
			measure_id: null,
			original_text: '3 large eggs'
		};
		expect(isPassthrough(egg)).toBe(true);
	});

	it('returns false when quantity is set', () => {
		const flour: ParsedIngredient = {
			name: 'all-purpose flour',
			quantity: 2,
			measure_id: 'cup',
			original_text: '2 cups all-purpose flour'
		};
		expect(isPassthrough(flour)).toBe(false);
	});

	it('returns false when only measure_id is null (has quantity)', () => {
		const salt: ParsedIngredient = {
			name: 'salt',
			quantity: 1,
			measure_id: null,
			original_text: '1 pinch salt'
		};
		expect(isPassthrough(salt)).toBe(false);
	});

	it('returns false when only quantity is null (has measure)', () => {
		const item: ParsedIngredient = {
			name: 'water',
			quantity: null,
			measure_id: 'cup',
			original_text: 'water, as needed'
		};
		expect(isPassthrough(item)).toBe(false);
	});
});
