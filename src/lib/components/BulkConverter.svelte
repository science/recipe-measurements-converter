<script lang="ts">
	import { browser } from '$app/environment';
	import { createOpenAIClient } from '$lib/services/openai.js';
	import { parseRecipeStream } from '$lib/services/recipe-parser.js';
	import { findMatches, getConfidence } from '$lib/services/embedding-matcher.js';
	import { isPassthrough } from '$lib/bulk-types.js';
	import type { ParsedIngredient, MatchedIngredient, EmbeddingData } from '$lib/bulk-types.js';
	import type { OpenAIClient } from '$lib/services/openai.js';
	import ApiKeyPrompt from './ApiKeyPrompt.svelte';
	import RecipeInput from './RecipeInput.svelte';
	import IngredientResultTable from './IngredientResultTable.svelte';

	type Progress =
		| null
		| { stage: 'parsing'; items: string[] }
		| { stage: 'matching'; total: number };

	let progress = $state<Progress>(null);
	let loading = $derived(progress !== null);
	let error = $state<string | null>(null);
	let results = $state<MatchedIngredient[]>([]);
	let embeddingData = $state<EmbeddingData | null>(null);
	let embeddingLoading = $state(true);
	let apiKeyPrompt = $state<ReturnType<typeof ApiKeyPrompt> | null>(null);
	let apiKeyConfigured = $state(false);

	// Check localStorage on mount to set initial state
	if (browser) {
		apiKeyConfigured = !!localStorage.getItem('openai_api_key');
		loadEmbeddings();
	}

	// Once configured, stay out of onboarding (don't re-show if user clicks "Change")
	$effect(() => {
		if (apiKeyPrompt && !apiKeyConfigured && apiKeyPrompt.isConfigured()) {
			apiKeyConfigured = true;
		}
	});

	async function loadEmbeddings() {
		try {
			const mod = await import('$lib/data/food-embeddings.json');
			embeddingData = mod.default as EmbeddingData;
		} catch (e) {
			console.error('Failed to load embeddings:', e);
			error = 'Failed to load embedding data. Run: npm run generate-embeddings';
		} finally {
			embeddingLoading = false;
		}
	}

	async function embedQuery(client: OpenAIClient, names: string[]): Promise<number[][]> {
		const prefix = embeddingData?.prefix ?? 'cooking ingredient: ';
		const prefixedNames = names.map((n) => prefix + n);

		const response = await client.createEmbedding({
			model: embeddingData?.model ?? 'text-embedding-3-small',
			input: prefixedNames,
			dimensions: embeddingData?.dimensions ?? 256
		});

		return response.data
			.sort((a, b) => a.index - b.index)
			.map((d) => d.embedding);
	}

	async function handleParse(recipeText: string) {
		if (!apiKeyPrompt) return;

		const apiKey = apiKeyPrompt.getApiKey();
		const model = apiKeyPrompt.getModel();

		if (!apiKey) {
			error = 'Please enter your OpenAI API key first.';
			return;
		}

		if (!embeddingData) {
			error = 'Embeddings not loaded. Run: npm run generate-embeddings';
			return;
		}

		progress = { stage: 'parsing', items: [] };
		error = null;
		results = [];

		try {
			const client = createOpenAIClient({ apiKey });

			// Stage 1: Streaming LLM Parse
			const parsed: ParsedIngredient[] = [];
			for await (const ingredient of parseRecipeStream(client, recipeText, { model })) {
				parsed.push(ingredient);
				progress = { stage: 'parsing', items: parsed.map((p) => p.name) };
			}

			// Stage 2: Embedding Match (only for non-passthrough items)
			const needsMatch = parsed.filter((p) => !isPassthrough(p));
			const matchNames = needsMatch.map((p) => p.name);
			progress = { stage: 'matching', total: matchNames.length };

			let queryVectors: number[][] = [];
			if (matchNames.length > 0) {
				queryVectors = await embedQuery(client, matchNames);
			}

			// Build results
			let matchIdx = 0;
			const matched: MatchedIngredient[] = parsed.map((p) => {
				if (isPassthrough(p)) {
					return {
						parsed: p,
						matches: [],
						confidence: 'none' as const,
						selectedItemId: null,
						grams: null
					};
				}

				const vec = queryVectors[matchIdx++];
				const matches = findMatches(vec, embeddingData!.embeddings, 3);
				const confidence = matches.length > 0 ? getConfidence(matches[0].score) : 'none' as const;
				const selectedItemId = confidence !== 'none' && matches.length > 0 ? matches[0].itemId : null;

				return {
					parsed: p,
					matches,
					confidence,
					selectedItemId,
					grams: null // computed reactively by IngredientResultRow
				};
			});

			results = matched;
		} catch (e) {
			const msg = e instanceof Error ? e.message : 'Unknown error';
			error = `Failed to parse recipe: ${msg}`;
		} finally {
			progress = null;
		}
	}
</script>

<div class="bulk-converter" data-testid="bulk-converter">
	{#if !apiKeyConfigured}
		<div class="onboarding" data-testid="bulk-onboarding">
			<h3 class="onboarding-title">Bulk Recipe Converter</h3>

			<div class="onboarding-steps">
				<div class="step">
					<span class="step-num">1</span>
					<span>Paste your OpenAI API key below</span>
				</div>
				<div class="step">
					<span class="step-num">2</span>
					<span>Paste a recipe ingredient list</span>
				</div>
				<div class="step">
					<span class="step-num">3</span>
					<span>Get gram weights for every ingredient</span>
				</div>
			</div>

			<ApiKeyPrompt bind:this={apiKeyPrompt} />

			<div class="onboarding-details">
				<div class="detail">
					<strong>Why an API key?</strong>
					<span>Recipe text is parsed by OpenAI. Ingredient matching uses pre-computed embeddings and is free.</span>
				</div>
				<div class="detail">
					<strong>Cost</strong>
					<span>~$0.0001 per recipe (fractions of a penny).</span>
				</div>
				<div class="detail">
					<strong>Privacy</strong>
					<span>Your key stays in your browser and is only sent to OpenAI.</span>
				</div>
			</div>
		</div>
	{:else}
		<ApiKeyPrompt bind:this={apiKeyPrompt} />
	{/if}

	{#if embeddingLoading}
		<p class="status">Loading embeddings...</p>
	{:else if !embeddingData}
		<p class="status error-status">Embeddings not available.</p>
	{:else}
		<p class="status embedding-status" data-testid="embedding-status">
			{embeddingData.embeddings.length} ingredients loaded
		</p>
	{/if}

	<RecipeInput onparse={handleParse} {loading} />

	{#if progress}
		<div class="progress-panel" data-testid="progress-panel">
			{#if progress.stage === 'parsing'}
				<p class="progress-label">Parsing recipe<span class="ellipsis"></span></p>
				{#if progress.items.length > 0}
					<div class="progress-items" data-testid="progress-items">
						{#each progress.items as name}
							<span class="progress-chip">{name} ✓</span>
						{/each}
					</div>
				{/if}
			{:else if progress.stage === 'matching'}
				<p class="progress-label">Matching {progress.total} ingredient{progress.total !== 1 ? 's' : ''}<span class="ellipsis"></span></p>
			{/if}
		</div>
	{/if}

	{#if error}
		<div class="error" data-testid="bulk-error">{error}</div>
	{/if}

	{#if results.length > 0}
		<IngredientResultTable ingredients={results} />
	{/if}
</div>

<style>
	.bulk-converter {
		margin-top: 0.5rem;
	}

	.onboarding {
		padding: 1.25rem;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 6px;
		margin-bottom: 1rem;
	}

	.onboarding-title {
		margin: 0 0 1rem;
		font-size: 1.1rem;
		color: var(--color-text);
	}

	.onboarding-steps {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-bottom: 1.25rem;
	}

	.step {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		font-size: 0.9rem;
	}

	.step-num {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.5rem;
		height: 1.5rem;
		border-radius: 50%;
		background: var(--color-accent);
		color: var(--color-accent-fg);
		font-size: 0.75rem;
		font-weight: 700;
		flex-shrink: 0;
	}

	.onboarding-details {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		margin-top: 1rem;
		font-size: 0.8rem;
		color: var(--color-text-muted);
	}

	.detail strong {
		color: var(--color-text-secondary);
		margin-right: 0.35rem;
	}

	.status {
		font-size: 0.8rem;
		color: var(--color-text-muted);
		margin: 0 0 0.75rem;
	}

	.embedding-status {
		color: #a6e22e;
	}

	.error-status {
		color: #f92672;
	}

	.error {
		padding: 0.75rem;
		background: rgba(249, 38, 114, 0.15);
		border: 1px solid #f92672;
		border-radius: 4px;
		color: #f92672;
		font-size: 0.85rem;
		margin-bottom: 1rem;
	}

	.progress-panel {
		padding: 0.75rem;
		background: rgba(166, 226, 46, 0.08);
		border: 1px solid rgba(166, 226, 46, 0.3);
		border-radius: 4px;
		margin-bottom: 1rem;
	}

	.progress-label {
		font-size: 0.85rem;
		color: #a6e22e;
		margin: 0 0 0.5rem;
		font-weight: 600;
	}

	.progress-items {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
	}

	.progress-chip {
		display: inline-block;
		padding: 0.2rem 0.5rem;
		background: rgba(166, 226, 46, 0.15);
		border-radius: 12px;
		font-size: 0.8rem;
		color: #a6e22e;
	}

	.ellipsis::after {
		content: '';
		animation: ellipsis 1.2s steps(4, end) infinite;
	}

	@keyframes ellipsis {
		0% { content: ''; }
		25% { content: '.'; }
		50% { content: '..'; }
		75% { content: '...'; }
	}
</style>
