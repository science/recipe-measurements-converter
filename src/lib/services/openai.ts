export interface ChatMessage {
	role: 'system' | 'user' | 'assistant';
	content: string;
}

export interface ChatCompletionOptions {
	model: string;
	messages: ChatMessage[];
	response_format?: {
		type: 'json_schema';
		json_schema: {
			name: string;
			strict: boolean;
			schema: object;
		};
	};
}

export interface ChatCompletionResponse {
	id: string;
	choices: {
		index: number;
		message: { role: string; content: string };
		finish_reason: string;
	}[];
	usage: {
		prompt_tokens: number;
		completion_tokens: number;
		total_tokens: number;
	};
}

export interface EmbeddingOptions {
	model: string;
	input: string[];
	dimensions?: number;
}

export interface EmbeddingResponse {
	data: { index: number; embedding: number[] }[];
	usage: { prompt_tokens: number; total_tokens: number };
}

export interface OpenAIClientOptions {
	apiKey: string;
	maxRetries?: number;
}

export interface OpenAIError extends Error {
	status?: number;
	code?: string;
}

export interface OpenAIClient {
	createChatCompletion: (options: ChatCompletionOptions) => Promise<ChatCompletionResponse>;
	createChatCompletionStream: (options: ChatCompletionOptions) => Promise<ReadableStream<string>>;
	createEmbedding: (options: EmbeddingOptions) => Promise<EmbeddingResponse>;
}

const OPENAI_API_BASE = 'https://api.openai.com/v1';
const OPENAI_CHAT_URL = `${OPENAI_API_BASE}/chat/completions`;
const OPENAI_EMBEDDING_URL = `${OPENAI_API_BASE}/embeddings`;
const OPENAI_MODELS_URL = `${OPENAI_API_BASE}/models`;

export const DEFAULT_MODEL = 'gpt-5-mini';

export interface ModelInfo {
	id: string;
	owned_by: string;
}

/**
 * Fetch available chat models from the OpenAI API.
 * Filters to GPT models suitable for chat completions.
 */
export async function fetchChatModels(apiKey: string): Promise<string[]> {
	const sanitized = sanitizeApiKey(apiKey);
	const response = await fetch(OPENAI_MODELS_URL, {
		headers: { Authorization: `Bearer ${sanitized}` }
	});

	if (!response.ok) {
		throw new Error(`Failed to fetch models: HTTP ${response.status}`);
	}

	const data = (await response.json()) as { data: ModelInfo[] };
	return data.data
		.map((m) => m.id)
		.filter((id) => /^gpt-/.test(id))
		.sort((a, b) => a.localeCompare(b));
}

export function sanitizeApiKey(key: string): string {
	let sanitized = key.trim();
	if (sanitized.startsWith('"') && sanitized.endsWith('"')) {
		sanitized = sanitized.slice(1, -1);
	}
	if (sanitized.startsWith("'") && sanitized.endsWith("'")) {
		sanitized = sanitized.slice(1, -1);
	}
	return sanitized;
}

export function isRetryableError(error: OpenAIError): boolean {
	const retryableStatusCodes = [429, 500, 502, 503, 504];
	const retryableErrorCodes = ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNREFUSED'];

	if (error.status && retryableStatusCodes.includes(error.status)) return true;
	if (error.code && retryableErrorCodes.includes(error.code)) return true;
	return false;
}

export function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createOpenAIClient(options: OpenAIClientOptions): OpenAIClient {
	if (!options.apiKey || options.apiKey.trim() === '') {
		throw new Error('API key is required');
	}

	const apiKey = sanitizeApiKey(options.apiKey);
	const maxRetries = options.maxRetries ?? 2;

	async function fetchWithRetry(url: string, body: Record<string, unknown>): Promise<unknown> {
		const maxAttempts = maxRetries + 1;

		for (let attempt = 1; attempt <= maxAttempts; attempt++) {
			try {
				const response = await fetch(url, {
					method: 'POST',
					headers: {
						Authorization: `Bearer ${apiKey}`,
						'Content-Type': 'application/json'
					},
					body: JSON.stringify(body)
				});

				if (!response.ok) {
					const errorBody = await response.json().catch(() => ({}));
					const error: OpenAIError = new Error(
						(errorBody as { error?: { message?: string } })?.error?.message ||
							`HTTP ${response.status}`
					);
					error.status = response.status;
					throw error;
				}

				return await response.json();
			} catch (error) {
				const isLastAttempt = attempt === maxAttempts;
				const shouldRetry = isRetryableError(error as OpenAIError);

				if (!isLastAttempt && shouldRetry) {
					await sleep(Math.pow(2, attempt - 1) * 1000);
				} else {
					throw error;
				}
			}
		}

		throw new Error('Unexpected end of retry loop');
	}

	async function createChatCompletion(
		completionOptions: ChatCompletionOptions
	): Promise<ChatCompletionResponse> {
		const body: Record<string, unknown> = {
			model: completionOptions.model,
			messages: completionOptions.messages
		};
		if (completionOptions.response_format) {
			body.response_format = completionOptions.response_format;
		}
		return (await fetchWithRetry(OPENAI_CHAT_URL, body)) as ChatCompletionResponse;
	}

	async function createEmbedding(
		embeddingOptions: EmbeddingOptions
	): Promise<EmbeddingResponse> {
		const body: Record<string, unknown> = {
			model: embeddingOptions.model,
			input: embeddingOptions.input
		};
		if (embeddingOptions.dimensions) {
			body.dimensions = embeddingOptions.dimensions;
		}
		return (await fetchWithRetry(OPENAI_EMBEDDING_URL, body)) as EmbeddingResponse;
	}

	async function createChatCompletionStream(
		completionOptions: ChatCompletionOptions
	): Promise<ReadableStream<string>> {
		const body: Record<string, unknown> = {
			model: completionOptions.model,
			messages: completionOptions.messages,
			stream: true
		};
		if (completionOptions.response_format) {
			body.response_format = completionOptions.response_format;
		}

		const response = await fetch(OPENAI_CHAT_URL, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${apiKey}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(body)
		});

		if (!response.ok) {
			const errorBody = await response.json().catch(() => ({}));
			const error: OpenAIError = new Error(
				(errorBody as { error?: { message?: string } })?.error?.message ||
					`HTTP ${response.status}`
			);
			error.status = response.status;
			throw error;
		}

		if (!response.body) {
			throw new Error('No response body for stream');
		}

		return response.body.pipeThrough(new TextDecoderStream()).pipeThrough(
			new TransformStream<string, string>({
				buffer: '',
				transform(chunk, controller) {
					this.buffer += chunk;
					const lines = this.buffer.split('\n');
					// Keep the last (possibly incomplete) line in the buffer
					this.buffer = lines.pop() ?? '';
					for (const line of lines) {
						const trimmed = line.trim();
						if (!trimmed || trimmed === 'data: [DONE]') continue;
						if (!trimmed.startsWith('data: ')) continue;
						try {
							const json = JSON.parse(trimmed.slice(6));
							const content = json.choices?.[0]?.delta?.content;
							if (content) {
								controller.enqueue(content);
							}
						} catch {
							// Skip malformed chunks
						}
					}
				}
			} as Transformer<string, string> & { buffer: string })
		);
	}

	return { createChatCompletion, createChatCompletionStream, createEmbedding };
}
