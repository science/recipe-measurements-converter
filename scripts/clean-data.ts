import type { DensityValue, FoodItem, FoodDatabase } from '../src/lib/data/types.js';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';

interface SupplementalItem {
	name: string;
	density: number;
	source: string;
	category: string;
}

export function parseDensity(value: string): DensityValue {
	const rangeMatch = value.match(/^(\d+\.?\d*)\s*-\s*(\d+\.?\d*)$/);
	if (rangeMatch) {
		const min = parseFloat(rangeMatch[1]);
		const max = parseFloat(rangeMatch[2]);
		return { min, max, avg: (min + max) / 2 };
	}

	const num = parseFloat(value);
	if (isNaN(num)) throw new Error(`Invalid density value: "${value}"`);
	return { min: num, max: num, avg: num };
}

export function slugify(name: string): string {
	return name
		.toLowerCase()
		.replace(/[/()&+:]/g, '-')
		.replace(/[^a-z0-9-\s]/g, '')
		.replace(/[\s]+/g, '-')
		.replace(/-+/g, '-')
		.replace(/^-|-$/g, '');
}

export function findDuplicates(items: FoodItem[]): string[] {
	const seen = new Map<string, number>();
	const duplicateIds: Set<string> = new Set();

	for (const item of items) {
		const count = (seen.get(item.id) ?? 0) + 1;
		seen.set(item.id, count);
		if (count > 1) duplicateIds.add(item.id);
	}

	return [...duplicateIds];
}

export function separateDuplicates(items: FoodItem[]): {
	clean: FoodItem[];
	duplicates: FoodItem[];
} {
	const duplicateIds = new Set(findDuplicates(items));
	return {
		clean: items.filter((i) => !duplicateIds.has(i.id)),
		duplicates: items.filter((i) => duplicateIds.has(i.id))
	};
}

export interface DensityWarning {
	name: string;
	density: number;
	reason: string;
}

export function validateDensities(items: FoodItem[]): DensityWarning[] {
	const warnings: DensityWarning[] = [];
	for (const item of items) {
		if (item.density.avg > 1.4) {
			warnings.push({
				name: item.name,
				density: item.density.avg,
				reason: 'density > 1.4 g/ml (suspicious unless liquid/syrup/mineral)'
			});
		}
		if (item.density.avg < 0.01) {
			warnings.push({
				name: item.name,
				density: item.density.avg,
				reason: 'density < 0.01 g/ml (likely data error)'
			});
		}
	}
	return warnings;
}

export function buildFromSupplemental(supplementalItems: SupplementalItem[]): FoodItem[] {
	return supplementalItems.map((item) => ({
		id: slugify(item.name),
		name: item.name,
		category: item.category,
		density: { min: item.density, max: item.density, avg: item.density },
		source: item.source,
		commonality: 3
	}));
}

// CLI: run as script
if (import.meta.url === `file://${process.argv[1]}`) {
	const projectRoot = resolve(dirname(import.meta.url.replace('file://', '')), '..');

	// Load OC-USDA as sole source
	const ocPath = resolve(projectRoot, 'food-density-onlineconversion.json');
	const rawItems: SupplementalItem[] = JSON.parse(readFileSync(ocPath, 'utf-8'));
	const allItems = buildFromSupplemental(rawItems);

	console.log(`Loaded ${allItems.length} items from OC-USDA`);

	// Deduplicate
	const { clean, duplicates } = separateDuplicates(allItems);
	if (duplicates.length > 0) {
		console.log(`\nRemoved ${duplicates.length} duplicate entries:`);
		for (const d of duplicates) {
			console.log(`  - ${d.name} (${d.source}): ${d.density.avg} g/ml`);
		}
	}

	// Density validation warnings
	const densityWarnings = validateDensities(clean);
	if (densityWarnings.length > 0) {
		console.log(`\nDensity warnings (${densityWarnings.length} items):`);
		for (const w of densityWarnings) {
			console.log(`  ${w.name}: ${w.density} g/ml — ${w.reason}`);
		}
	}

	const categories = [...new Set(clean.map((i) => i.category))].sort();

	const db: FoodDatabase = {
		version: '1.0.0',
		itemCount: clean.length,
		categories,
		items: clean
	};

	const outDir = resolve(projectRoot, 'src', 'lib', 'data');
	mkdirSync(outDir, { recursive: true });

	const outPath = resolve(outDir, 'food-density.json');
	writeFileSync(outPath, JSON.stringify(db, null, '\t'));
	console.log(`\nWrote ${db.itemCount} items to ${outPath}`);
	console.log(`Categories: ${categories.join(', ')}`);
}
