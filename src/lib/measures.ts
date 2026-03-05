export interface Measure {
	id: string;
	name: string;
	mlPerUnit: number;
}

export const measures: Measure[] = [
	{ id: 'cup', name: 'Cup', mlPerUnit: 236.588 },
	{ id: 'tbsp', name: 'Tablespoon', mlPerUnit: 14.787 },
	{ id: 'tsp', name: 'Teaspoon', mlPerUnit: 4.929 },
	{ id: 'fl-oz', name: 'Fluid ounce', mlPerUnit: 29.574 },
	{ id: 'ml', name: 'Milliliter', mlPerUnit: 1 },
	{ id: 'l', name: 'Liter', mlPerUnit: 1000 }
];

export function getMeasureById(id: string): Measure | undefined {
	return measures.find((m) => m.id === id);
}
