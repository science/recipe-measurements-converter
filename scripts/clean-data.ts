import type { DensityValue, FoodItem, FoodDatabase } from '../src/lib/data/types.js';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';

interface PsvRow {
	category: string;
	name: string;
	density: string;
	specificGravity: string;
	source: string;
}

export function parsePsvLine(line: string): PsvRow | null {
	const trimmed = line.trim();
	if (!trimmed || trimmed.startsWith('Category|')) return null;

	const parts = trimmed.split('|');
	if (parts.length < 5) return null;

	return {
		category: parts[0],
		name: parts[1],
		density: parts[2],
		specificGravity: parts[3],
		source: parts[4]
	};
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

export function fixTypos(text: string): string {
	let fixed = text;
	// Fix "Herbes" → "Herbs"
	fixed = fixed.replace(/\bHerbes\b/g, 'Herbs');
	// Fix "Bulrush mille," → "Bulrush millet,"
	fixed = fixed.replace(/\bBulrush mille\b/g, 'Bulrush millet');
	// Fix missing space after comma (e.g., "Cassava,flour" → "Cassava, flour")
	fixed = fixed.replace(/,([^ ])/g, ', $1');
	return fixed;
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

export function buildDatabase(psvContent: string): FoodDatabase {
	const lines = psvContent.split('\n');
	const allItems: FoodItem[] = [];

	for (const line of lines) {
		const row = parsePsvLine(line);
		if (!row) continue;

		const fixedName = fixTypos(row.name);
		const fixedCategory = fixTypos(row.category);

		allItems.push({
			id: slugify(fixedName),
			name: fixedName,
			category: fixedCategory,
			density: parseDensity(row.density),
			source: row.source
		});
	}

	const { clean, duplicates } = separateDuplicates(allItems);

	if (duplicates.length > 0) {
		console.log(`Found ${duplicates.length} duplicate entries (excluded from main database):`);
		for (const d of duplicates) {
			console.log(`  - ${d.name} (${d.source}): ${d.density.avg} g/ml`);
		}
	}

	const categories = [...new Set(clean.map((i) => i.category))].sort();

	return {
		version: '1.0.0',
		itemCount: clean.length,
		categories,
		items: clean
	};
}

// CLI: run as script
if (import.meta.url === `file://${process.argv[1]}`) {
	const psvPath = resolve(dirname(import.meta.url.replace('file://', '')), '..', 'food-density.psv');
	const psvContent = readFileSync(psvPath, 'utf-8');

	const db = buildDatabase(psvContent);

	const outDir = resolve(dirname(import.meta.url.replace('file://', '')), '..', 'src', 'lib', 'data');
	mkdirSync(outDir, { recursive: true });

	const outPath = resolve(outDir, 'food-density.json');
	writeFileSync(outPath, JSON.stringify(db, null, '\t'));
	console.log(`Wrote ${db.itemCount} items to ${outPath}`);

	// Also write duplicates for review
	const { duplicates } = separateDuplicates(
		psvContent.split('\n')
			.map(parsePsvLine)
			.filter((r): r is PsvRow => r !== null)
			.map((row) => ({
				id: slugify(fixTypos(row.name)),
				name: fixTypos(row.name),
				category: fixTypos(row.category),
				density: parseDensity(row.density),
				source: row.source
			}))
	);

	if (duplicates.length > 0) {
		const dupPath = resolve(outDir, 'duplicates-review.json');
		writeFileSync(dupPath, JSON.stringify(duplicates, null, '\t'));
		console.log(`Wrote ${duplicates.length} duplicates to ${dupPath}`);
	}
}
