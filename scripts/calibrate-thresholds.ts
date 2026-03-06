/**
 * Calibrate embedding match thresholds using real embeddings and API calls.
 *
 * Tests true positives, true negatives, and boundary cases to determine
 * optimal green/yellow/red threshold values.
 *
 * Run: OPENAI_API_KEY=... npx tsx scripts/calibrate-thresholds.ts
 */

import { readFileSync } from 'fs';
import { createOpenAIClient } from '../src/lib/services/openai.js';
import { cosineSimilarity } from '../src/lib/services/embedding-matcher.js';
import type { EmbeddingData } from '../src/lib/bulk-types.js';

const MODEL = 'text-embedding-3-small';
const DIMENSIONS = 256;
const PREFIX = 'cooking ingredient: ';

// True positives: recipe terms that SHOULD match a specific DB item
const TRUE_POSITIVES: [string, string][] = [
	['all-purpose flour', 'flour-all-purpose'],
	['brown sugar', 'sugar-brown'],
	['unsalted butter', 'butter-unsalted'],
	['heavy cream', 'cream-heavy'],
	['baking soda', 'baking-soda'],
	['baking powder', 'baking-powder'],
	['vanilla extract', 'vanilla-extract'],
	['sour cream', 'sour-cream'],
	['cream cheese', 'cream-cheese'],
	['peanut butter', 'peanut-butter'],
	['maple syrup', 'maple-syrup'],
	['coconut oil', 'coconut-oil'],
	['olive oil', 'olive-oil'],
	['white sugar', 'sugar-white'],
	['whole milk', 'milk-whole'],
	['corn starch', 'cornstarch'],
	['bread flour', 'flour-bread'],
	['vegetable oil', 'oil-vegetable'],
	['powdered sugar', 'sugar-powdered'],
	['honey', 'honey'],
	['cocoa powder', 'cocoa'],
	['cinnamon', 'cinnamon-ground'],
	['kosher salt', 'salt-table'],
	['white flour', 'flour-all-purpose'],
	['granulated sugar', 'sugar-white'],
	['light brown sugar', 'sugar-brown'],
	['salted butter', 'butter-salted'],
	['2% milk', 'milk-2-percent'],
	['skim milk', 'milk-skim'],
	['canola oil', 'oil-canola'],
];

// True negatives: terms that should NOT match anything well
const TRUE_NEGATIVES: string[] = [
	'unicorn tears',
	'sourdough starter',
	'MSG',
	'liquid nitrogen',
	'truffle oil',
	'fish sauce',
	'tofu',
	'tempeh',
	'miso paste',
	'gochujang',
];

// Boundary cases: tricky matches
const BOUNDARY_CASES: [string, string][] = [
	['chocolate chips', 'chocolate-chip'],
	['AP flour', 'flour-all-purpose'],
	['confectioners sugar', 'sugar-powdered'],
	['whipping cream', 'cream-heavy'],
	['shortening', 'shortening'],
	['lard', 'lard'],
	['corn meal', 'cornmeal'],
	['rolled oats', 'oats'],
	['self-rising flour', 'flour-self-rising'],
	['evoo', 'olive-oil-extra-virgin'],
];

async function main() {
	const apiKey = process.env.OPENAI_API_KEY;
	if (!apiKey) {
		console.error('Set OPENAI_API_KEY environment variable');
		process.exit(1);
	}

	// Load pre-computed embeddings
	const embeddingData: EmbeddingData = JSON.parse(
		readFileSync('src/lib/data/food-embeddings.json', 'utf-8')
	);
	const dbEmbeddings = embeddingData.embeddings;
	const embeddingMap = new Map(dbEmbeddings.map((e) => [e.id, e.vector]));

	const client = createOpenAIClient({ apiKey });

	// Embed all query terms
	const allQueries = [
		...TRUE_POSITIVES.map(([q]) => q),
		...TRUE_NEGATIVES,
		...BOUNDARY_CASES.map(([q]) => q),
	];
	const prefixedQueries = allQueries.map((q) => PREFIX + q);

	const response = await client.createEmbedding({
		model: MODEL,
		input: prefixedQueries,
		dimensions: DIMENSIONS,
	});

	const queryVectors = response.data
		.sort((a, b) => a.index - b.index)
		.map((d) => d.embedding);

	let idx = 0;

	// TRUE POSITIVES
	console.log('=== TRUE POSITIVES ===');
	console.log('(Recipe term → expected DB item: score)');
	const tpScores: number[] = [];
	for (const [query, expectedId] of TRUE_POSITIVES) {
		const qVec = queryVectors[idx++];
		const expectedVec = embeddingMap.get(expectedId);
		if (!expectedVec) {
			console.log(`  ⚠ DB item "${expectedId}" not found! Skipping.`);
			continue;
		}
		const score = cosineSimilarity(qVec, expectedVec);
		tpScores.push(score);

		// Also find best match to see if it's rank-1
		let bestId = '';
		let bestScore = -1;
		for (const entry of dbEmbeddings) {
			const s = cosineSimilarity(qVec, entry.vector);
			if (s > bestScore) {
				bestScore = s;
				bestId = entry.id;
			}
		}
		const rank1 = bestId === expectedId;
		const flag = rank1 ? '' : ` ⚠ best=${bestId} (${bestScore.toFixed(4)})`;
		console.log(`  ${score.toFixed(4)} "${query}" → ${expectedId}${flag}`);
	}

	// TRUE NEGATIVES
	console.log('\n=== TRUE NEGATIVES ===');
	console.log('(Term → best match: score)');
	const tnScores: number[] = [];
	for (const query of TRUE_NEGATIVES) {
		const qVec = queryVectors[idx++];
		let bestId = '';
		let bestScore = -1;
		for (const entry of dbEmbeddings) {
			const s = cosineSimilarity(qVec, entry.vector);
			if (s > bestScore) {
				bestScore = s;
				bestId = entry.id;
			}
		}
		tnScores.push(bestScore);
		console.log(`  ${bestScore.toFixed(4)} "${query}" → ${bestId}`);
	}

	// BOUNDARY CASES
	console.log('\n=== BOUNDARY CASES ===');
	const bcScores: number[] = [];
	for (const [query, expectedId] of BOUNDARY_CASES) {
		const qVec = queryVectors[idx++];
		const expectedVec = embeddingMap.get(expectedId);
		if (!expectedVec) {
			console.log(`  ⚠ DB item "${expectedId}" not found! Skipping.`);
			continue;
		}
		const score = cosineSimilarity(qVec, expectedVec);
		bcScores.push(score);

		let bestId = '';
		let bestScore = -1;
		for (const entry of dbEmbeddings) {
			const s = cosineSimilarity(qVec, entry.vector);
			if (s > bestScore) {
				bestScore = s;
				bestId = entry.id;
			}
		}
		const rank1 = bestId === expectedId;
		const flag = rank1 ? '' : ` ⚠ best=${bestId} (${bestScore.toFixed(4)})`;
		console.log(`  ${score.toFixed(4)} "${query}" → ${expectedId}${flag}`);
	}

	// SUMMARY
	console.log('\n=== SUMMARY ===');
	tpScores.sort((a, b) => a - b);
	tnScores.sort((a, b) => b - a);

	console.log(`True positives: min=${tpScores[0]?.toFixed(4)}, p5=${tpScores[Math.floor(tpScores.length * 0.05)]?.toFixed(4)}, mean=${(tpScores.reduce((a, b) => a + b, 0) / tpScores.length).toFixed(4)}`);
	console.log(`True negatives (best match): max=${tnScores[0]?.toFixed(4)}, p95=${tnScores[Math.floor(tnScores.length * 0.05)]?.toFixed(4)}, mean=${(tnScores.reduce((a, b) => a + b, 0) / tnScores.length).toFixed(4)}`);
	console.log(`Boundary cases: min=${Math.min(...bcScores).toFixed(4)}, mean=${(bcScores.reduce((a, b) => a + b, 0) / bcScores.length).toFixed(4)}`);

	// Threshold recommendations
	const p5TP = tpScores[Math.floor(tpScores.length * 0.05)];
	const maxTN = tnScores[0];
	console.log(`\nRecommended green threshold (95% TP above): ${p5TP?.toFixed(4)}`);
	console.log(`Recommended red threshold (95% TN below): ${maxTN?.toFixed(4)}`);
}

main().catch(console.error);
