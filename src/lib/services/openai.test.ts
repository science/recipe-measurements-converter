import { describe, it, expect, vi } from 'vitest';
import { sanitizeApiKey, isRetryableError, createOpenAIClient, fetchChatModels, DEFAULT_MODEL } from './openai.js';
import type { OpenAIError } from './openai.js';

function makeSSEStream(chunks: string[]): ReadableStream<Uint8Array> {
	const encoder = new TextEncoder();
	return new ReadableStream({
		start(controller) {
			for (const chunk of chunks) {
				controller.enqueue(encoder.encode(chunk));
			}
			controller.close();
		}
	});
}

describe('sanitizeApiKey', () => {
	it('trims whitespace', () => {
		expect(sanitizeApiKey('  sk-abc123  ')).toBe('sk-abc123');
	});

	it('strips surrounding double quotes', () => {
		expect(sanitizeApiKey('"sk-abc123"')).toBe('sk-abc123');
	});

	it('strips surrounding single quotes', () => {
		expect(sanitizeApiKey("'sk-abc123'")).toBe('sk-abc123');
	});

	it('leaves unquoted keys unchanged', () => {
		expect(sanitizeApiKey('sk-abc123')).toBe('sk-abc123');
	});

	it('handles whitespace around quotes', () => {
		expect(sanitizeApiKey('  "sk-abc123"  ')).toBe('sk-abc123');
	});
});

describe('isRetryableError', () => {
	it('returns true for 429 rate limit', () => {
		const error = new Error('rate limit') as OpenAIError;
		error.status = 429;
		expect(isRetryableError(error)).toBe(true);
	});

	it('returns true for 500 server error', () => {
		const error = new Error('server error') as OpenAIError;
		error.status = 500;
		expect(isRetryableError(error)).toBe(true);
	});

	it('returns true for 502 bad gateway', () => {
		const error = new Error('bad gateway') as OpenAIError;
		error.status = 502;
		expect(isRetryableError(error)).toBe(true);
	});

	it('returns false for 401 unauthorized', () => {
		const error = new Error('unauthorized') as OpenAIError;
		error.status = 401;
		expect(isRetryableError(error)).toBe(false);
	});

	it('returns false for 400 bad request', () => {
		const error = new Error('bad request') as OpenAIError;
		error.status = 400;
		expect(isRetryableError(error)).toBe(false);
	});

	it('returns true for network error codes', () => {
		const error = new Error('connection reset') as OpenAIError;
		error.code = 'ECONNRESET';
		expect(isRetryableError(error)).toBe(true);
	});

	it('returns false for unknown errors', () => {
		const error = new Error('something weird') as OpenAIError;
		expect(isRetryableError(error)).toBe(false);
	});
});

describe('createOpenAIClient', () => {
	it('throws if API key is empty', () => {
		expect(() => createOpenAIClient({ apiKey: '' })).toThrow('API key is required');
	});

	it('throws if API key is whitespace', () => {
		expect(() => createOpenAIClient({ apiKey: '   ' })).toThrow('API key is required');
	});

	it('creates a client with valid key', () => {
		const client = createOpenAIClient({ apiKey: 'sk-test123' });
		expect(client.createChatCompletion).toBeTypeOf('function');
		expect(client.createEmbedding).toBeTypeOf('function');
	});
});

describe('DEFAULT_MODEL', () => {
	it('is gpt-5-mini', () => {
		expect(DEFAULT_MODEL).toBe('gpt-5-mini');
	});
});

describe('fetchChatModels', () => {
	it('filters to gpt- models and sorts alphabetically', async () => {
		const mockResponse = {
			data: [
				{ id: 'dall-e-3', owned_by: 'openai' },
				{ id: 'gpt-4.1', owned_by: 'openai' },
				{ id: 'gpt-5-mini', owned_by: 'openai' },
				{ id: 'gpt-4.1-mini', owned_by: 'openai' },
				{ id: 'text-embedding-3-small', owned_by: 'openai' },
				{ id: 'whisper-1', owned_by: 'openai' },
				{ id: 'gpt-5.2', owned_by: 'openai' },
			]
		};

		vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve(mockResponse)
		}));

		const models = await fetchChatModels('sk-test');
		expect(models).toEqual(['gpt-4.1', 'gpt-4.1-mini', 'gpt-5-mini', 'gpt-5.2']);

		vi.unstubAllGlobals();
	});

	it('throws on HTTP error', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
			ok: false,
			status: 401
		}));

		await expect(fetchChatModels('sk-bad')).rejects.toThrow('HTTP 401');

		vi.unstubAllGlobals();
	});

	it('returns empty array when no gpt models exist', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({ data: [
				{ id: 'dall-e-3', owned_by: 'openai' },
				{ id: 'whisper-1', owned_by: 'openai' },
			]})
		}));

		const models = await fetchChatModels('sk-test');
		expect(models).toEqual([]);

		vi.unstubAllGlobals();
	});

	it('sanitizes API key before making request', async () => {
		const mockFetch = vi.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({ data: [] })
		});
		vi.stubGlobal('fetch', mockFetch);

		await fetchChatModels('  "sk-test123"  ');

		const authHeader = mockFetch.mock.calls[0][1].headers.Authorization;
		expect(authHeader).toBe('Bearer sk-test123');

		vi.unstubAllGlobals();
	});

	it('excludes non-gpt model prefixes like gpt2', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({ data: [
				{ id: 'gpt-4.1', owned_by: 'openai' },
				{ id: 'gpt-5-mini', owned_by: 'openai' },
			]})
		}));

		const models = await fetchChatModels('sk-test');
		expect(models).toEqual(['gpt-4.1', 'gpt-5-mini']);

		vi.unstubAllGlobals();
	});
});

describe('createChatCompletionStream', () => {
	it('parses SSE chunks into content strings', async () => {
		const sseData = [
			'data: {"choices":[{"delta":{"content":"hello"}}]}\n\n',
			'data: {"choices":[{"delta":{"content":" world"}}]}\n\n',
			'data: [DONE]\n\n'
		];

		vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
			ok: true,
			body: makeSSEStream(sseData)
		}));

		const client = createOpenAIClient({ apiKey: 'sk-test' });
		const stream = await client.createChatCompletionStream({
			model: 'gpt-5-mini',
			messages: [{ role: 'user', content: 'test' }]
		});

		const reader = stream.getReader();
		const chunks: string[] = [];
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			chunks.push(value);
		}

		expect(chunks).toEqual(['hello', ' world']);

		vi.unstubAllGlobals();
	});

	it('skips chunks without content', async () => {
		const sseData = [
			'data: {"choices":[{"delta":{"role":"assistant"}}]}\n\n',
			'data: {"choices":[{"delta":{"content":"hi"}}]}\n\n',
			'data: [DONE]\n\n'
		];

		vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
			ok: true,
			body: makeSSEStream(sseData)
		}));

		const client = createOpenAIClient({ apiKey: 'sk-test' });
		const stream = await client.createChatCompletionStream({
			model: 'gpt-5-mini',
			messages: [{ role: 'user', content: 'test' }]
		});

		const reader = stream.getReader();
		const chunks: string[] = [];
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			chunks.push(value);
		}

		expect(chunks).toEqual(['hi']);

		vi.unstubAllGlobals();
	});

	it('throws on HTTP error', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
			ok: false,
			status: 401,
			json: () => Promise.resolve({ error: { message: 'Invalid API key' } })
		}));

		const client = createOpenAIClient({ apiKey: 'sk-bad' });
		await expect(
			client.createChatCompletionStream({
				model: 'gpt-5-mini',
				messages: [{ role: 'user', content: 'test' }]
			})
		).rejects.toThrow('Invalid API key');

		vi.unstubAllGlobals();
	});

	it('handles split SSE lines across chunks', async () => {
		// SSE line split across two chunks
		const sseData = [
			'data: {"choices":[{"delta":{"con',
			'tent":"split"}}]}\n\ndata: [DONE]\n\n'
		];

		vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
			ok: true,
			body: makeSSEStream(sseData)
		}));

		const client = createOpenAIClient({ apiKey: 'sk-test' });
		const stream = await client.createChatCompletionStream({
			model: 'gpt-5-mini',
			messages: [{ role: 'user', content: 'test' }]
		});

		const reader = stream.getReader();
		const chunks: string[] = [];
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			chunks.push(value);
		}

		expect(chunks).toEqual(['split']);

		vi.unstubAllGlobals();
	});
});
