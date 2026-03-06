/**
 * One-time experiment to determine the best prefix strategy for food embeddings.
 *
 * Tests informal recipe terms against canonical DB names with different prefixes.
 * Run: OPENAI_API_KEY=... npx tsx scripts/embedding-prefix-experiment.ts
 */

import { createOpenAIClient } from '../src/lib/services/openai.js';
import { cosineSimilarity } from '../src/lib/services/embedding-matcher.js';

const MODEL = 'text-embedding-3-small';
const DIMENSIONS = 256;

// Informal recipe term → expected canonical DB name
const TEST_PAIRS: [string, string][] = [
	['evoo', 'Olive oil, extra virgin'],
	['AP flour', 'Flour, all-purpose'],
	['powdered sugar', 'Sugar, powdered'],
	['brown sugar', 'Sugar, brown'],
	['unsalted butter', 'Butter, unsalted'],
	['heavy cream', 'Cream, heavy'],
	['baking soda', 'Baking soda'],
	['baking powder', 'Baking powder'],
	['vanilla extract', 'Vanilla extract'],
	['sour cream', 'Sour cream'],
	['cream cheese', 'Cream cheese'],
	['peanut butter', 'Peanut butter'],
	['maple syrup', 'Maple syrup'],
	['coconut oil', 'Coconut oil'],
	['olive oil', 'Olive oil'],
	['vegetable oil', 'Oil, vegetable'],
	['white sugar', 'Sugar, white'],
	['whole milk', 'Milk, whole'],
	['corn starch', 'Cornstarch'],
	['bread flour', 'Flour, bread'],
];

const PREFIXES = [
	{ name: 'no prefix', prefix: '' },
	{ name: 'cooking ingredient:', prefix: 'cooking ingredient: ' },
	{ name: 'recipe ingredient:', prefix: 'recipe ingredient: ' },
	{ name: 'food item:', prefix: 'food item: ' },
];

async function main() {
	const apiKey = process.env.OPENAI_API_KEY;
	if (!apiKey) {
		console.error('Set OPENAI_API_KEY environment variable');
		process.exit(1);
	}

	const client = createOpenAIClient({ apiKey });

	// Collect all unique strings to embed across all prefix strategies
	for (const { name: prefixName, prefix } of PREFIXES) {
		const informalTerms = TEST_PAIRS.map(([informal]) => prefix + informal);
		const canonicalTerms = TEST_PAIRS.map(([, canonical]) => prefix + canonical);
		const allTerms = [...informalTerms, ...canonicalTerms];

		const response = await client.createEmbedding({
			model: MODEL,
			input: allTerms,
			dimensions: DIMENSIONS
		});

		const vectors = response.data
			.sort((a, b) => a.index - b.index)
			.map((d) => d.embedding);

		const informalVectors = vectors.slice(0, TEST_PAIRS.length);
		const canonicalVectors = vectors.slice(TEST_PAIRS.length);

		let totalSim = 0;
		let worstSim = 1;
		let rank1Count = 0;

		const results: { pair: string; similarity: number; rank: number }[] = [];

		for (let i = 0; i < TEST_PAIRS.length; i++) {
			const sim = cosineSimilarity(informalVectors[i], canonicalVectors[i]);
			totalSim += sim;
			if (sim < worstSim) worstSim = sim;

			// Check rank: is the canonical the closest to the informal among all canonicals?
			const allScores = canonicalVectors.map((cv, j) => ({
				index: j,
				score: cosineSimilarity(informalVectors[i], cv)
			}));
			allScores.sort((a, b) => b.score - a.score);
			const rank = allScores.findIndex((s) => s.index === i) + 1;
			if (rank === 1) rank1Count++;

			results.push({
				pair: `"${TEST_PAIRS[i][0]}" → "${TEST_PAIRS[i][1]}"`,
				similarity: sim,
				rank
			});
		}

		const meanSim = totalSim / TEST_PAIRS.length;

		console.log(`\n=== ${prefixName} ===`);
		console.log(`Mean similarity: ${meanSim.toFixed(4)}`);
		console.log(`Worst similarity: ${worstSim.toFixed(4)}`);
		console.log(`Rank-1 accuracy: ${rank1Count}/${TEST_PAIRS.length} (${((rank1Count / TEST_PAIRS.length) * 100).toFixed(1)}%)`);
		console.log('\nPer-pair results:');
		for (const r of results) {
			const flag = r.rank > 1 ? ` ⚠ rank=${r.rank}` : '';
			console.log(`  ${r.similarity.toFixed(4)} ${r.pair}${flag}`);
		}
	}
}

main().catch(console.error);
