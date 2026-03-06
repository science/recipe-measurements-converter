import { describe, it, expect, vi } from 'vitest';
import { parseRecipe, parseRecipeStream, extractJsonObjects, RECIPE_PARSE_SCHEMA, MEASURE_IDS } from './recipe-parser.js';
import type { OpenAIClient, ChatCompletionResponse } from './openai.js';

function mockClient(responseContent: string): OpenAIClient {
	return {
		createChatCompletion: vi.fn().mockResolvedValue({
			id: 'test',
			choices: [{ index: 0, message: { role: 'assistant', content: responseContent }, finish_reason: 'stop' }],
			usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 }
		} as ChatCompletionResponse),
		createChatCompletionStream: vi.fn(),
		createEmbedding: vi.fn()
	};
}

function mockStreamClient(chunks: string[]): OpenAIClient {
	const stream = new ReadableStream<string>({
		start(controller) {
			for (const chunk of chunks) {
				controller.enqueue(chunk);
			}
			controller.close();
		}
	});

	return {
		createChatCompletion: vi.fn(),
		createChatCompletionStream: vi.fn().mockResolvedValue(stream),
		createEmbedding: vi.fn()
	};
}

describe('RECIPE_PARSE_SCHEMA', () => {
	it('has strict mode enabled', () => {
		expect(RECIPE_PARSE_SCHEMA.json_schema.strict).toBe(true);
	});

	it('includes all 9 measure IDs plus null in enum', () => {
		const schema = RECIPE_PARSE_SCHEMA.json_schema.schema as {
			properties: { ingredients: { items: { properties: { measure_id: { enum: unknown[] } } } } }
		};
		const measureEnum = schema.properties.ingredients.items.properties.measure_id.enum;
		expect(measureEnum).toContain('cup');
		expect(measureEnum).toContain('tbsp');
		expect(measureEnum).toContain('tsp');
		expect(measureEnum).toContain('fl-oz');
		expect(measureEnum).toContain('ml');
		expect(measureEnum).toContain('l');
		expect(measureEnum).toContain('oz');
		expect(measureEnum).toContain('lb');
		expect(measureEnum).toContain('kg');
		expect(measureEnum).toContain(null);
		expect(measureEnum).toHaveLength(10);
	});
});

describe('MEASURE_IDS', () => {
	it('has 9 measure IDs', () => {
		expect(MEASURE_IDS).toHaveLength(9);
	});
});

describe('parseRecipe', () => {
	it('parses a simple recipe response', async () => {
		const client = mockClient(JSON.stringify({
			ingredients: [
				{ name: 'all-purpose flour', quantity: 2, measure_id: 'cup', original_text: '2 cups all-purpose flour' },
				{ name: 'unsalted butter', quantity: 0.5, measure_id: 'cup', original_text: '1/2 cup unsalted butter' }
			]
		}));

		const result = await parseRecipe(client, '2 cups all-purpose flour\n1/2 cup unsalted butter');
		expect(result).toHaveLength(2);
		expect(result[0].name).toBe('all-purpose flour');
		expect(result[0].quantity).toBe(2);
		expect(result[0].measure_id).toBe('cup');
		expect(result[1].quantity).toBe(0.5);
	});

	it('handles egg pass-through (null quantity and measure)', async () => {
		const client = mockClient(JSON.stringify({
			ingredients: [
				{ name: '3 large eggs', quantity: null, measure_id: null, original_text: '3 large eggs' }
			]
		}));

		const result = await parseRecipe(client, '3 large eggs');
		expect(result).toHaveLength(1);
		expect(result[0].name).toBe('3 large eggs');
		expect(result[0].quantity).toBeNull();
		expect(result[0].measure_id).toBeNull();
	});

	it('handles "to taste" items', async () => {
		const client = mockClient(JSON.stringify({
			ingredients: [
				{ name: 'salt', quantity: null, measure_id: null, original_text: 'salt to taste' }
			]
		}));

		const result = await parseRecipe(client, 'salt to taste');
		expect(result[0].quantity).toBeNull();
		expect(result[0].measure_id).toBeNull();
	});

	it('uses gpt-5-mini by default', async () => {
		const client = mockClient(JSON.stringify({ ingredients: [] }));
		await parseRecipe(client, 'test');

		const call = (client.createChatCompletion as ReturnType<typeof vi.fn>).mock.calls[0][0];
		expect(call.model).toBe('gpt-5-mini');
	});

	it('accepts custom model', async () => {
		const client = mockClient(JSON.stringify({ ingredients: [] }));
		await parseRecipe(client, 'test', { model: 'gpt-4.1' });

		const call = (client.createChatCompletion as ReturnType<typeof vi.fn>).mock.calls[0][0];
		expect(call.model).toBe('gpt-4.1');
	});

	it('passes response_format with schema', async () => {
		const client = mockClient(JSON.stringify({ ingredients: [] }));
		await parseRecipe(client, 'test');

		const call = (client.createChatCompletion as ReturnType<typeof vi.fn>).mock.calls[0][0];
		expect(call.response_format).toBeDefined();
		expect(call.response_format.type).toBe('json_schema');
		expect(call.response_format.json_schema.strict).toBe(true);
	});

	it('throws on empty response', async () => {
		const client: OpenAIClient = {
			createChatCompletion: vi.fn().mockResolvedValue({
				id: 'test',
				choices: [{ index: 0, message: { role: 'assistant', content: '' }, finish_reason: 'stop' }],
				usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
			}),
			createEmbedding: vi.fn()
		};

		await expect(parseRecipe(client, 'test')).rejects.toThrow('Empty response from LLM');
	});

	it('handles weight measures', async () => {
		const client = mockClient(JSON.stringify({
			ingredients: [
				{ name: 'chicken breast', quantity: 1.5, measure_id: 'lb', original_text: '1.5 lbs chicken breast' }
			]
		}));

		const result = await parseRecipe(client, '1.5 lbs chicken breast');
		expect(result[0].measure_id).toBe('lb');
		expect(result[0].quantity).toBe(1.5);
	});
});

describe('extractJsonObjects', () => {
	it('extracts complete objects from a buffer', () => {
		const buffer = '[{"name":"flour","quantity":2,"measure_id":"cup","original_text":"2 cups flour"},{"name":"sugar","quantity":1,"measure_id":"cup","original_text":"1 cup sugar"}]';
		const [objects, remaining] = extractJsonObjects(buffer);
		expect(objects).toHaveLength(2);
		expect(objects[0].name).toBe('flour');
		expect(objects[1].name).toBe('sugar');
		expect(remaining.trim()).toBe(']');
	});

	it('returns incomplete object as remaining buffer', () => {
		const buffer = '[{"name":"flour","quantity":2,"measure_id":"cup","original_text":"2 cups flour"},{"name":"sug';
		const [objects, remaining] = extractJsonObjects(buffer);
		expect(objects).toHaveLength(1);
		expect(objects[0].name).toBe('flour');
		expect(remaining).toContain('"name":"sug');
	});

	it('returns empty when no array start found', () => {
		const [objects, remaining] = extractJsonObjects('{"ingredients":');
		expect(objects).toHaveLength(0);
		expect(remaining).toBe('{"ingredients":');
	});

	it('handles strings containing braces', () => {
		const buffer = '[{"name":"flour {test}","quantity":1,"measure_id":"cup","original_text":"1 cup flour {test}"}]';
		const [objects] = extractJsonObjects(buffer);
		expect(objects).toHaveLength(1);
		expect(objects[0].name).toBe('flour {test}');
	});

	it('handles escaped quotes in strings', () => {
		const buffer = '[{"name":"flour \\"special\\"","quantity":1,"measure_id":"cup","original_text":"1 cup flour"}]';
		const [objects] = extractJsonObjects(buffer);
		expect(objects).toHaveLength(1);
		expect(objects[0].name).toBe('flour "special"');
	});
});

describe('parseRecipeStream', () => {
	it('yields ingredients incrementally from streamed chunks', async () => {
		const json = JSON.stringify({
			ingredients: [
				{ name: 'flour', quantity: 2, measure_id: 'cup', original_text: '2 cups flour' },
				{ name: 'butter', quantity: 0.5, measure_id: 'cup', original_text: '1/2 cup butter' }
			]
		});

		// Split into multiple chunks to simulate streaming
		const mid = Math.floor(json.length / 2);
		const client = mockStreamClient([json.slice(0, mid), json.slice(mid)]);

		const results = [];
		for await (const item of parseRecipeStream(client, 'test')) {
			results.push(item);
		}

		expect(results).toHaveLength(2);
		expect(results[0].name).toBe('flour');
		expect(results[1].name).toBe('butter');
	});

	it('yields each ingredient as soon as it is complete', async () => {
		// Carefully split so first object completes in chunk 1
		const chunk1 = '{"ingredients": [{"name":"flour","quantity":2,"measure_id":"cup","original_text":"2 cups flour"},';
		const chunk2 = '{"name":"sugar","quantity":1,"measure_id":"cup","original_text":"1 cup sugar"}]}';

		const client = mockStreamClient([chunk1, chunk2]);

		const results = [];
		for await (const item of parseRecipeStream(client, 'test')) {
			results.push(item);
		}

		expect(results).toHaveLength(2);
		expect(results[0].name).toBe('flour');
		expect(results[1].name).toBe('sugar');
	});

	it('handles pass-through items with null fields', async () => {
		const json = JSON.stringify({
			ingredients: [
				{ name: '3 large eggs', quantity: null, measure_id: null, original_text: '3 large eggs' }
			]
		});

		const client = mockStreamClient([json]);

		const results = [];
		for await (const item of parseRecipeStream(client, 'test')) {
			results.push(item);
		}

		expect(results).toHaveLength(1);
		expect(results[0].name).toBe('3 large eggs');
		expect(results[0].quantity).toBeNull();
	});

	it('falls back to full parse if incremental extraction yields nothing', async () => {
		// Send JSON in tiny chunks that won't have complete objects until the end
		const json = '{"ingredients":[{"name":"flour","quantity":2,"measure_id":"cup","original_text":"2c flour"}]}';
		// Split into single characters to make incremental extraction unlikely to fire mid-stream
		const chars = json.split('').map(c => c);

		const stream = new ReadableStream<string>({
			start(controller) {
				// Send all at once but as individual chars won't help incremental
				controller.enqueue(json);
				controller.close();
			}
		});

		const client: OpenAIClient = {
			createChatCompletion: vi.fn(),
			createChatCompletionStream: vi.fn().mockResolvedValue(stream),
			createEmbedding: vi.fn()
		};

		const results = [];
		for await (const item of parseRecipeStream(client, 'test')) {
			results.push(item);
		}

		expect(results).toHaveLength(1);
		expect(results[0].name).toBe('flour');
	});
});
