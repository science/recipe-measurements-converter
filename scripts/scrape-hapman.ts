/**
 * One-time scraper for Hapman bulk density guide.
 * Parses wpDataTable with columns: wdt_ID | Bulk Material | lb/ft3 | g/cm3
 * Outputs raw data, then a curated kitchen-relevant subset.
 *
 * Usage: npx tsx scripts/scrape-hapman.ts
 */

import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';

interface HapmanItem {
	name: string;
	bulkDensityLbFt3: number;
	densityGml: number;
}

interface CuratedItem {
	name: string;
	density: number;
	source: string;
	category: string;
}

async function scrape(): Promise<void> {
	const url = 'https://www.hapman.com/resources/bulk-material-density-guide';
	console.log(`Fetching ${url}...`);
	const response = await fetch(url);
	if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
	const html = await response.text();
	console.log(`Fetched ${html.length} bytes`);

	const items: HapmanItem[] = [];

	// Parse table rows: <td>ID</td><td>Name</td><td class="numdata">lb/ft3</td><td class="numdata">g/cm3</td>
	const rowRegex = /<tr[^>]*>\s*<td[^>]*>\d+<\/td>\s*<td[^>]*>([^<]+)<\/td>\s*<td[^>]*>([^<]+)<\/td>\s*<td[^>]*>([^<]+)<\/td>\s*<\/tr>/gi;
	let match: RegExpExecArray | null;

	while ((match = rowRegex.exec(html)) !== null) {
		const name = match[1].trim();
		const lbFt3Str = match[2].trim();
		const gmlStr = match[3].trim();

		const gml = parseFloat(gmlStr);
		const lbFt3 = parseFloat(lbFt3Str);

		if (isNaN(gml) || gml <= 0) continue;

		items.push({
			name,
			bulkDensityLbFt3: isNaN(lbFt3) ? 0 : lbFt3,
			densityGml: Math.round(gml * 1000) / 1000
		});
	}

	console.log(`Parsed ${items.length} raw items`);

	const rawPath = resolve(dirname(import.meta.url.replace('file://', '')), '..', 'food-density-hapman-raw.json');
	writeFileSync(rawPath, JSON.stringify(items, null, '\t'));
	console.log(`Wrote raw data to ${rawPath}`);

	// Whitelist: specific Hapman items useful for cooking, not covered by onlineconversion.com.
	// Exact case-insensitive match on Hapman name → clean name + category.
	const whitelist: Array<{ pattern: string; name: string; category: string }> = [
		{ pattern: 'chocolate chipsm, mini', name: 'Chocolate chips, mini', category: 'Sweets' },
		{ pattern: 'miniature chocolate chips', name: 'Chocolate chips, miniature', category: 'Sweets' },
		{ pattern: 'chunk chocolate', name: 'Chocolate, chunk', category: 'Sweets' },
		{ pattern: 'cocoa nibs', name: 'Cocoa nibs', category: 'Sweets' },
		{ pattern: 'cocoa powder', name: 'Cocoa powder', category: 'Sweets' },
		{ pattern: 'coconut chips', name: 'Coconut chips', category: 'Nuts and seeds' },
		{ pattern: 'coconut flakes', name: 'Coconut flakes', category: 'Nuts and seeds' },
		{ pattern: 'xanthan', name: 'Xanthan gum', category: 'Baking ingredients' },
		{ pattern: 'pectin', name: 'Pectin', category: 'Baking ingredients' },
		{ pattern: 'brown sugar', name: 'Brown sugar', category: 'Sweets' },
		{ pattern: 'demerara sugar', name: 'Demerara sugar', category: 'Sweets' },
		{ pattern: 'chopped peanuts', name: 'Peanuts, chopped', category: 'Nuts and seeds' },
		{ pattern: 'chopped walnuts', name: 'Walnuts, chopped', category: 'Nuts and seeds' },
		{ pattern: 'whole walnuts', name: 'Walnuts, whole', category: 'Nuts and seeds' },
		{ pattern: 'pecan halves', name: 'Pecan halves', category: 'Nuts and seeds' },
		{ pattern: 'pecan pieces', name: 'Pecan pieces', category: 'Nuts and seeds' },
		{ pattern: 'sliced almonds', name: 'Almonds, sliced', category: 'Nuts and seeds' },
		{ pattern: 'ground almonds', name: 'Almonds, ground', category: 'Nuts and seeds' },
		{ pattern: 'peppercorns', name: 'Peppercorns', category: 'Herbs and spices' },
		{ pattern: 'ground cinnamon', name: 'Cinnamon, ground', category: 'Herbs and spices' },
		{ pattern: 'white pepper', name: 'White pepper', category: 'Herbs and spices' },
		{ pattern: 'tapioca starch (binosol)', name: 'Tapioca starch', category: 'Baking ingredients' },
		{ pattern: 'wild rice', name: 'Wild rice', category: 'Grains and cereals' },
	];

	const curated: CuratedItem[] = [];

	for (const item of items) {
		const nameLower = item.name.toLowerCase();
		const wl = whitelist.find((w) => nameLower === w.pattern);
		if (!wl) continue;

		curated.push({
			name: wl.name,
			density: item.densityGml,
			source: 'HAP',
			category: wl.category
		});
	}

	console.log(`\nCurated ${curated.length} kitchen-relevant items:`);
	for (const item of curated) {
		console.log(`  ${item.name}: ${item.density} g/ml [${item.category}]`);
	}

	const curatedPath = resolve(dirname(import.meta.url.replace('file://', '')), '..', 'food-density-hapman.json');
	writeFileSync(curatedPath, JSON.stringify(curated, null, '\t'));
	console.log(`\nWrote curated data to ${curatedPath}`);
}

scrape().catch((err) => {
	console.error('Scrape failed:', err);
	process.exit(1);
});
