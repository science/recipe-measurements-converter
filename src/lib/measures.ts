export type Measure =
	| { type: 'volume'; id: string; name: string; mlPerUnit: number }
	| { type: 'weight'; id: string; name: string; gramsPerUnit: number };

export function isWeightMeasure(m: Measure): m is Extract<Measure, { type: 'weight' }> {
	return m.type === 'weight';
}

export const measures: Measure[] = [
	{ type: 'volume', id: 'cup', name: 'Cup', mlPerUnit: 236.588 },
	{ type: 'volume', id: 'tbsp', name: 'Tablespoon', mlPerUnit: 14.787 },
	{ type: 'volume', id: 'tsp', name: 'Teaspoon', mlPerUnit: 4.929 },
	{ type: 'volume', id: 'fl-oz', name: 'Fluid ounce', mlPerUnit: 29.574 },
	{ type: 'volume', id: 'ml', name: 'Milliliter', mlPerUnit: 1 },
	{ type: 'volume', id: 'l', name: 'Liter', mlPerUnit: 1000 },
	{ type: 'weight', id: 'oz', name: 'Ounce', gramsPerUnit: 28.3495 },
	{ type: 'weight', id: 'lb', name: 'Pound', gramsPerUnit: 453.592 },
	{ type: 'weight', id: 'kg', name: 'Kilogram', gramsPerUnit: 1000 }
];

export function getMeasureById(id: string): Measure | undefined {
	return measures.find((m) => m.id === id);
}
