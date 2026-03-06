/**
 * One-time scraper for onlineconversion.com cooking density data.
 * Parses <option value="density">Name</option> from the HTML.
 * Assigns categories via keyword mapping.
 * Output: food-density-onlineconversion.json
 *
 * Usage: npx tsx scripts/scrape-onlineconversion.ts
 */

import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';

interface ScrapedItem {
	name: string;
	density: number;
	source: string;
	category: string;
}

const CATEGORY_MAP: [RegExp, string][] = [
	[/\bflour\b|\bbran\b|\bwheat\b|\boats?\b|\brice\b|\bcorn\s?meal\b|\bbarley\b|\bsemolina\b|\brye\b|\bbread\s?crumb|\bbulgur\b|\bcouscous\b|\bquinoa\b|\bspelt\b|\bteff\b|\btriticale\b|\bmillet\b|\bsorghum\b|\bamaranth\b|\bkamut\b|\bhominy\b|\bnoodle\b|\bpasta\b|\bbuckwheat\b/i, 'Grains and cereals'],
	[/\bbutter\b|\bmilk\b|\bcream\b|\bcheese\b|\byogurt\b|\bwhey\b|\bcurd|\beggnog\b|\bsoymilk\b/i, 'Dairy'],
	[/\bsugar\b|\bhoney\b|\bsyrup\b|\bmolasses\b|\bjam\b|\bjelly\b|\bmarmalade\b|\bicing\b|\bfrosting\b|\bcandy\b|\bcandie\b|\bcaramel\b|\bchocolate\b|\bcocoa\b|\bfudge\b|\bsweetener\b|\bfructose\b/i, 'Sweets'],
	[/\boil\b|\bshortening\b|\blard\b|\bmargarine\b/i, 'Fats and oils'],
	[/\bsalt\b|\bpepper\b|\bcinnamon\b|\bgarlic\b|\bonion.*(powder|flake|dehydrat)|\bspice\b|\bherb\b|\bsage\b|\bthyme\b|\brosemary\b|\bbasil\b|\bcumin\b|\bturmeric\b|\bpaprika\b|\bcurry\b|\bginger\b|\bnutmeg\b|\bclove\b|\bmustard\b|\bsesame\b|\bvanilla\b|\bextract\b|\bcoriander\b|\bchive\b|\bshallot/i, 'Herbs and spices'],
	[/\bbean\b|\blentil\b|\bpeas?\b(?!nut)|\bchickpea\b|\bgarbanzo\b|\bsoy\b|\btofu\b|\bedamame\b|\btempeh\b|\bnatto\b|\blupin\b|\bmung\b|\bcowpea\b|\bbroadbean\b|\bfava\b|\blima\b|\bhummus\b|\bwinged bean\b|\bmothbean\b|\bhyacinth\b|\bmungo\b/i, 'Legumes'],
	[/\bnut\b|\balmond\b|\bcashew\b|\bpecan\b|\bwalnut\b|\bpeanut\b|\bpistachio\b|\bmacadamia\b|\bhazelnut\b|\bcoconut\b|\bflax\b|\bseed\b|\bchestnut\b|\bpine nut\b|\btrail mix\b/i, 'Nuts and seeds'],
	[/\bapple\b|\bberry\b|\bblueberr|\braspberr|\bstrawberr|\bcherry\b|\bbanana\b|\bpeach\b|\bpear\b|\bplum\b|\bgrape\b|\braisin\b|\bdate\b|\bfig\b|\bcranberr|\bcurrant\b|\bfruit\b|\bpineapple\b|\bmango\b|\bpapaya\b|\bcitrus\b|\blemon\b|\blime\b|\borange\b|\bgrapefruit\b|\bapricot\b|\bgooseberr|\belderberr|\blitchi\b|\bmulberr|\bprune\b|\bprickly\b|\brose\s?hip\b|\bblackberr/i, 'Fruits'],
	[/\bpotato\b|\byam\b|\bcassava\b|\bsweet\s?potato\b|\btaro\b|\barrowroot\b|\bjicama\b|\byambean\b|\bbeet\b|\bceleriac\b/i, 'Root vegetables and tubers'],
	[/\bcarrot\b|\bcelery\b|\bonion\b(?!.*(powder|flake|dehydrat))|\btomato\b|\bcabbage\b|\bbroccoli\b|\bcauliflower\b|\bspinach\b|\blettuce\b|\bcorn\b|\bpumpkin\b|\bsquash\b|\bzucchini\b|\beggplant\b|\bpepper\b|\bcucumber\b|\bmushroom\b|\basparagus\b|\bartichoke\b|\bkale\b|\bturnip\b|\bradish\b|\bokra\b|\bbrussel|\bchard\b|\bpurslane\b|\bleek\b|\barugula\b|\bcress\b|\bkohlrabi\b|\bsauerkraut\b|\bhearts of palm\b|\bpokeberry\b|\bjute\b|\bbutterbur\b/i, 'Vegetables'],
	[/\begg\b/i, 'Eggs'],
	[/\bchicken\b|\bbeef\b|\bpork\b|\bturkey\b|\bham\b|\bsausage\b|\bbacon\b|\bfish\b|\btuna\b|\bsalmon\b|\bshrimp\b|\bcrab\b|\blobster\b|\bclam\b|\boyster\b|\bmeat\b|\bmussel\b|\bjellyfish\b/i, 'Meats and seafood'],
	[/\bsoup\b|\bbroth\b|\bstock\b|\bbouillon\b/i, 'Soups'],
	[/\bbaking\s?powder\b|\bbaking\s?soda\b|\byeast\b|\bgelatin\b|\bcornstarch\b|\btapioca\b|\bpectin\b|\bbread\s?fruit\b/i, 'Baking ingredients'],
	[/\bsauce\b|\bketchup\b|\bcatsup\b|\bmayonnaise\b|\bvinegar\b|\bdressing\b|\bmustard\b|\bmiso\b|\bpoi\b|\badobo\b/i, 'Condiments'],
	[/\bjuice\b|\bwater\b|\bcoffee\b|\btea\b|\bbeverage\b|\bensure\b/i, 'Beverages'],
	[/\bcereal\b|\bgranola\b|\bpancake\b|\bwaffle\b|\bcake\b|\bcookie\b|\bcracker\b|\bpie\b|\bpastry\b|\bmuffin\b|\bstuffing\b|\bcrouton\b/i, 'Baked goods'],
	[/\balfalfa\b|\bsprout/i, 'Vegetables'],
	[/\bseaweed\b|\bspirulina\b|\bkelp\b|\bdried gourd\b|\bkanpyo\b|\bpepeao\b|\bcloud ear\b|\bfungi\b/i, 'Vegetables'],
	// Catch remaining — plural forms, "Beans,", "Nuts,", etc.
	[/\bbeans?\b/i, 'Legumes'],
	[/\bapplesauce|\bapricots?\b|\bapples?\b|\bcherr|\bgrapes?\b|\bguava|\blitchi|\bmelon|\boranges?\b|\bpeach|\bplums?\b|\bprune|\bcurrant|\bfigs?\b|\brose\s?hip|\bberr/i, 'Fruits'],
	[/\bnuts?\b|\bseeds?\b|\bpeanuts?\b|\balmonds?\b/i, 'Nuts and seeds'],
	[/\btomato|\bleeks?\b|\bmushroom|\bartichoke|\bbeets?\b|\bchives?\b|\bcrouton/i, 'Vegetables'],
	[/\bsyrups?\b|\bcandies?\b|\bcandy\b/i, 'Sweets'],
	[/\bsoybeans?\b|\blupins?\b|\blentils?\b|\bmothbean|\byardlong|\bwinged\b|\bbaked bean|\bbroadbean/i, 'Legumes'],
	[/\bwhip/i, 'Dairy'],
	[/\bnoodle/i, 'Grains and cereals'],
];

function categorize(name: string): string {
	for (const [pattern, category] of CATEGORY_MAP) {
		if (pattern.test(name)) return category;
	}
	return 'Uncategorized';
}

async function scrape(): Promise<void> {
	const url = 'https://www.onlineconversion.com/weight_volume_cooking.htm';
	console.log(`Fetching ${url}...`);
	const response = await fetch(url);
	if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
	const html = await response.text();
	console.log(`Fetched ${html.length} bytes`);

	// Parse <option value="density">Name</option>
	const optionRegex = /<option\s+value="([^"]+)"\s*>([^<]+)<\/option>/gi;
	const items: ScrapedItem[] = [];
	const uncategorized: string[] = [];
	let match: RegExpExecArray | null;

	// Unit conversion options to skip (not food items)
	const skipPatterns = /^(grams\/cup|g\/ml|kg\/L|kg\/m|oz\/gal|lb\/ft|lb\/in|gram|kilogram|milligram|ounce \[weight\]|pound)$/i;
	const skipGarbled = /^(kg\/m|oz\/gal|lb\/ft|lb\/in)/i;

	while ((match = optionRegex.exec(html)) !== null) {
		const densityStr = match[1];
		const name = match[2].trim();

		// Skip non-numeric values (e.g., "select" placeholder)
		const density = parseFloat(densityStr);
		if (isNaN(density) || density <= 0) continue;

		// Skip unit conversion options
		if (skipPatterns.test(name) || skipGarbled.test(name)) continue;

		const category = categorize(name);
		if (category === 'Uncategorized') {
			uncategorized.push(name);
		}

		items.push({ name, density, source: 'OC-USDA', category });
	}

	console.log(`Parsed ${items.length} items`);
	if (uncategorized.length > 0) {
		console.log(`\n${uncategorized.length} uncategorized items:`);
		for (const name of uncategorized) {
			console.log(`  - ${name}`);
		}
	}

	const categoryCounts = new Map<string, number>();
	for (const item of items) {
		categoryCounts.set(item.category, (categoryCounts.get(item.category) ?? 0) + 1);
	}
	console.log('\nCategory breakdown:');
	for (const [cat, count] of [...categoryCounts.entries()].sort()) {
		console.log(`  ${cat}: ${count}`);
	}

	const outPath = resolve(dirname(import.meta.url.replace('file://', '')), '..', 'food-density-onlineconversion.json');
	writeFileSync(outPath, JSON.stringify(items, null, '\t'));
	console.log(`\nWrote ${items.length} items to ${outPath}`);
}

scrape().catch((err) => {
	console.error('Scrape failed:', err);
	process.exit(1);
});
