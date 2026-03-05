import type { FoodItem, FoodDatabase } from './types.js';
import data from './food-density.json';

const db = data as FoodDatabase;

export function getAllItems(): FoodItem[] {
	return db.items;
}

export function getCategories(): string[] {
	return db.categories;
}

export function getItemById(id: string): FoodItem | undefined {
	return db.items.find((item) => item.id === id);
}

export function searchItems(query: string, category?: string): FoodItem[] {
	const q = query.toLowerCase();
	return db.items.filter((item) => {
		if (category && item.category !== category) return false;
		if (q && !item.name.toLowerCase().includes(q)) return false;
		return true;
	});
}

export function getItemsByCategory(category: string): FoodItem[] {
	return db.items.filter((item) => item.category === category);
}
