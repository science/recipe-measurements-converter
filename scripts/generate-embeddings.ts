/**
 * Generate embeddings for all food items in the database.
 *
 * Hash-based rebuild: skips if food-density.json hasn't changed.
 * Run: OPENAI_API_KEY=... npx tsx scripts/generate-embeddings.ts
 * Or: npm run generate-embeddings
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { createHash } from 'crypto';
import { createOpenAIClient } from '../src/lib/services/openai.js';
import type { EmbeddingData } from '../src/lib/bulk-types.js';
import type { FoodDatabase } from '../src/lib/data/types.js';

const MODEL = 'text-embedding-3-small';
const DIMENSIONS = 256;
const EMBEDDING_PREFIX = 'cooking ingredient: '; // Winner from prefix experiment (update after running)
const FOOD_DATA_PATH = 'src/lib/data/food-density.json';
const EMBEDDINGS_PATH = 'src/lib/data/food-embeddings.json';
const BATCH_SIZE = 2048; // OpenAI embedding API limit per request

function computeHash(content: string): string {
	return createHash('sha256').update(content).digest('hex');
}

async function main() {
	const apiKey = process.env.OPENAI_API_KEY;
	if (!apiKey) {
		console.error('Set OPENAI_API_KEY environment variable');
		process.exit(1);
	}

	// Read and hash food data
	const foodDataRaw = readFileSync(FOOD_DATA_PATH, 'utf-8');
	const currentHash = computeHash(foodDataRaw);

	// Check if existing embeddings are up to date
	if (existsSync(EMBEDDINGS_PATH)) {
		try {
			const existing: EmbeddingData = JSON.parse(readFileSync(EMBEDDINGS_PATH, 'utf-8'));
			if (existing.hash === currentHash && existing.model === MODEL && existing.dimensions === DIMENSIONS) {
				console.log('Embeddings up to date (hash matches). Skipping.');
				return;
			}
			console.log('Food data changed or model/dimensions differ. Regenerating...');
		} catch {
			console.log('Existing embeddings file invalid. Regenerating...');
		}
	} else {
		console.log('No embeddings file found. Generating...');
	}

	const foodData: FoodDatabase = JSON.parse(foodDataRaw);
	const items = foodData.items;
	console.log(`Generating embeddings for ${items.length} items (model: ${MODEL}, dims: ${DIMENSIONS}, prefix: "${EMBEDDING_PREFIX}")...`);

	const client = createOpenAIClient({ apiKey, maxRetries: 3 });

	// Batch the embedding requests
	const allEmbeddings: { id: string; vector: number[] }[] = [];
	const names = items.map((item) => EMBEDDING_PREFIX + item.name);

	for (let i = 0; i < names.length; i += BATCH_SIZE) {
		const batch = names.slice(i, i + BATCH_SIZE);
		const batchItems = items.slice(i, i + BATCH_SIZE);

		console.log(`  Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length} items...`);

		const response = await client.createEmbedding({
			model: MODEL,
			input: batch,
			dimensions: DIMENSIONS
		});

		const sorted = response.data.sort((a, b) => a.index - b.index);
		for (let j = 0; j < sorted.length; j++) {
			allEmbeddings.push({
				id: batchItems[j].id,
				vector: sorted[j].embedding
			});
		}

		console.log(`    Tokens used: ${response.usage.prompt_tokens}`);
	}

	const output: EmbeddingData = {
		hash: currentHash,
		model: MODEL,
		dimensions: DIMENSIONS,
		prefix: EMBEDDING_PREFIX,
		embeddings: allEmbeddings
	};

	writeFileSync(EMBEDDINGS_PATH, JSON.stringify(output));
	console.log(`\nWrote ${allEmbeddings.length} embeddings to ${EMBEDDINGS_PATH}`);
	console.log(`File size: ${(Buffer.byteLength(JSON.stringify(output)) / 1024).toFixed(0)} KB`);
}

main().catch(console.error);
