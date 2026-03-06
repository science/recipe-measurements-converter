import type { FoodItem, FoodDatabase } from './types.js';
import data from './food-density.json';
import scores from './commonality-scores.json';
import friendlyNames from './friendly-names.json';

const db = data as FoodDatabase;
const scoresMap = scores as Record<string, number>;
const friendlyMap = friendlyNames as Record<string, string>;
const DEFAULT_COMMONALITY = 3;

const items: FoodItem[] = db.items.map((item) => ({
	...item,
	commonality: scoresMap[item.id] ?? DEFAULT_COMMONALITY,
	...(friendlyMap[item.id] ? { displayName: friendlyMap[item.id] } : {})
}));

export function getAllItems(): FoodItem[] {
	return items;
}

export function getCategories(): string[] {
	return db.categories;
}

export function getItemById(id: string): FoodItem | undefined {
	return items.find((item) => item.id === id);
}

export function searchItems(query: string, category?: string): FoodItem[] {
	const q = query.toLowerCase();
	return items
		.filter((item) => {
			if (category && item.category !== category) return false;
			if (q) {
				const nameMatch = item.name.toLowerCase().includes(q);
				const displayMatch = item.displayName?.toLowerCase().includes(q) ?? false;
				if (!nameMatch && !displayMatch) return false;
			}
			return true;
		})
		.sort((a, b) => b.commonality - a.commonality || a.name.localeCompare(b.name));
}

export function getItemsByCategory(category: string): FoodItem[] {
	return items.filter((item) => item.category === category);
}
