import type { DensityValue } from './data/types.js';
import { getMeasureById } from './measures.js';

export interface ConversionResult {
	grams: number;
	gramsMin?: number;
	gramsMax?: number;
}

export interface ConversionInput {
	quantity: number;
	measureId: string;
	density: DensityValue;
}

export function volumeToMl(quantity: number, measureId: string): number {
	const measure = getMeasureById(measureId);
	if (!measure) throw new Error(`Unknown measure: "${measureId}"`);
	return quantity * measure.mlPerUnit;
}

export function mlToGrams(ml: number, density: number): number {
	return ml * density;
}

export function convert(input: ConversionInput): ConversionResult {
	const { quantity, measureId, density } = input;
	const ml = volumeToMl(quantity, measureId);
	const grams = Math.round(mlToGrams(ml, density.avg) * 10) / 10;

	const result: ConversionResult = { grams };

	if (density.min !== density.max) {
		result.gramsMin = Math.round(mlToGrams(ml, density.min) * 10) / 10;
		result.gramsMax = Math.round(mlToGrams(ml, density.max) * 10) / 10;
	}

	return result;
}
