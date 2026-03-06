import type { OpenAIClient, ChatCompletionOptions } from './openai.js';
import { DEFAULT_MODEL } from './openai.js';
import type { ParsedIngredient } from '../bulk-types.js';

const MEASURE_IDS = ['cup', 'tbsp', 'tsp', 'fl-oz', 'ml', 'l', 'oz', 'lb', 'kg'] as const;

const RECIPE_PARSE_SCHEMA = {
	type: 'json_schema' as const,
	json_schema: {
		name: 'recipe_ingredients',
		strict: true,
		schema: {
			type: 'object',
			properties: {
				ingredients: {
					type: 'array',
					items: {
						type: 'object',
						properties: {
							name: { type: 'string' },
							quantity: { type: ['number', 'null'] },
							measure_id: {
								type: ['string', 'null'],
								enum: [...MEASURE_IDS, null]
							},
							original_text: { type: 'string' }
						},
						required: ['name', 'quantity', 'measure_id', 'original_text'],
						additionalProperties: false
					}
				}
			},
			required: ['ingredients'],
			additionalProperties: false
		}
	}
};

const SYSTEM_PROMPT = `You parse recipe ingredient lists into structured data.

For each line, extract:
- name: the ingredient name (e.g., "all-purpose flour", "unsalted butter")
- quantity: numeric amount (convert fractions: "1 1/2" → 1.5, "1/4" → 0.25). null if no amount.
- measure_id: one of: cup, tbsp, tsp, fl-oz, ml, l, oz, lb, kg. Map common abbreviations:
  "T"/"Tbsp"/"tablespoon(s)" → "tbsp"
  "t"/"tsp"/"teaspoon(s)" → "tsp"
  "c"/"cup(s)" → "cup"
  "fluid ounce(s)"/"fl oz" → "fl-oz"
  "ounce(s)" → "oz"
  "pound(s)"/"lbs" → "lb"
  "kilogram(s)" → "kg"
  "milliliter(s)" → "ml"
  "liter(s)" → "l"
  null if no standard measure.
- original_text: the exact line from the recipe, verbatim

For count-based items with no measure (e.g., "3 large eggs", "2 AA eggs, room temp", "1 bunch parsley"):
- Set quantity: null, measure_id: null
- Set name to the exact original text
- These are pass-through items that won't be converted

For items like "a pinch of salt" or "salt to taste":
- Set quantity: null, measure_id: null
- Set name to the ingredient name

Skip blank lines and section headers (like "For the sauce:").`;

export interface RecipeParserOptions {
	model?: string;
}

export async function parseRecipe(
	client: OpenAIClient,
	recipeText: string,
	options: RecipeParserOptions = {}
): Promise<ParsedIngredient[]> {
	const model = options.model ?? DEFAULT_MODEL;

	const completionOptions: ChatCompletionOptions = {
		model,
		messages: [
			{ role: 'system', content: SYSTEM_PROMPT },
			{ role: 'user', content: recipeText }
		],
		response_format: RECIPE_PARSE_SCHEMA
	};

	const response = await client.createChatCompletion(completionOptions);
	const content = response.choices[0]?.message?.content;

	if (!content) {
		throw new Error('Empty response from LLM');
	}

	const parsed = JSON.parse(content) as { ingredients: ParsedIngredient[] };
	return parsed.ingredients;
}

/**
 * Extract complete JSON objects from a partial buffer containing a JSON array.
 * Tracks bracket depth to find complete {...} objects, skipping braces inside strings.
 * Returns [extractedObjects, remainingBuffer].
 *
 * The buffer may be mid-array (no leading `[`) if previous calls already consumed
 * the array start. In that case we start scanning for `{` objects directly.
 */
export function extractJsonObjects(buffer: string): [ParsedIngredient[], string] {
	const results: ParsedIngredient[] = [];

	// Find the start of the ingredients array, or start from 0 if we're mid-array
	const arrayStart = buffer.indexOf('[');
	let i = arrayStart === -1 ? 0 : arrayStart + 1;
	while (i < buffer.length) {
		// Skip whitespace and commas between objects
		while (i < buffer.length && (buffer[i] === ' ' || buffer[i] === '\n' || buffer[i] === '\r' || buffer[i] === '\t' || buffer[i] === ',')) {
			i++;
		}

		if (i >= buffer.length || buffer[i] !== '{') break;

		// Track depth to find the matching closing brace
		const objStart = i;
		let depth = 0;
		let inString = false;
		let escaped = false;

		for (; i < buffer.length; i++) {
			const ch = buffer[i];
			if (escaped) {
				escaped = false;
				continue;
			}
			if (ch === '\\' && inString) {
				escaped = true;
				continue;
			}
			if (ch === '"') {
				inString = !inString;
				continue;
			}
			if (inString) continue;

			if (ch === '{') depth++;
			else if (ch === '}') {
				depth--;
				if (depth === 0) {
					// Complete object found
					const objStr = buffer.slice(objStart, i + 1);
					try {
						results.push(JSON.parse(objStr) as ParsedIngredient);
					} catch {
						// Malformed object, skip
					}
					i++;
					break;
				}
			}
		}

		// If we exited the loop without closing the object, it's incomplete
		if (depth > 0) {
			// Return everything from objStart onwards as remaining buffer
			return [results, buffer.slice(objStart)];
		}
	}

	// Everything was consumed (or we're between objects waiting for more)
	return [results, buffer.slice(i)];
}

export async function* parseRecipeStream(
	client: OpenAIClient,
	recipeText: string,
	options: RecipeParserOptions = {}
): AsyncGenerator<ParsedIngredient> {
	const model = options.model ?? DEFAULT_MODEL;

	const completionOptions: ChatCompletionOptions = {
		model,
		messages: [
			{ role: 'system', content: SYSTEM_PROMPT },
			{ role: 'user', content: recipeText }
		],
		response_format: RECIPE_PARSE_SCHEMA
	};

	const stream = await client.createChatCompletionStream(completionOptions);
	const reader = stream.getReader();

	let fullText = '';
	let buffer = '';
	let yieldedCount = 0;

	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;

			fullText += value;
			buffer += value;

			const [objects, remaining] = extractJsonObjects(buffer);
			buffer = remaining;

			for (const obj of objects) {
				yieldedCount++;
				yield obj;
			}
		}
	} finally {
		reader.releaseLock();
	}

	// Fallback: if we didn't yield anything, try parsing the full accumulated text
	if (yieldedCount === 0 && fullText.trim()) {
		try {
			const parsed = JSON.parse(fullText) as { ingredients: ParsedIngredient[] };
			for (const item of parsed.ingredients) {
				yield item;
			}
		} catch {
			throw new Error('Failed to parse streamed response');
		}
	}
}

export { RECIPE_PARSE_SCHEMA, SYSTEM_PROMPT, MEASURE_IDS };
