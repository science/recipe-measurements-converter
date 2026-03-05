export interface DensityValue {
	min: number;
	max: number;
	avg: number;
}

export interface FoodItem {
	id: string;
	name: string;
	category: string;
	density: DensityValue;
	source: string;
}

export interface FoodDatabase {
	version: string;
	itemCount: number;
	categories: string[];
	items: FoodItem[];
}
