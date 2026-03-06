<script lang="ts">
	import { browser } from '$app/environment';
	import { sanitizeApiKey, fetchChatModels, DEFAULT_MODEL } from '$lib/services/openai.js';

	let apiKey = $state('');
	let showKey = $state(false);
	let status = $state<'unconfigured' | 'saved'>('unconfigured');
	let model = $state(DEFAULT_MODEL);
	let availableModels = $state<string[]>([]);
	let modelsLoading = $state(false);
	let modelsError = $state<string | null>(null);

	if (browser) {
		const stored = localStorage.getItem('openai_api_key');
		if (stored) {
			apiKey = stored;
			status = 'saved';
			loadModels(stored);
		}
		const storedModel = localStorage.getItem('bulk_converter_model');
		if (storedModel) model = storedModel;
	}

	async function loadModels(key: string) {
		modelsLoading = true;
		modelsError = null;
		try {
			availableModels = await fetchChatModels(key);
			// If stored model isn't in the list, reset to default
			if (availableModels.length > 0 && !availableModels.includes(model)) {
				model = availableModels.includes(DEFAULT_MODEL) ? DEFAULT_MODEL : availableModels[0];
				saveModel();
			}
		} catch (e) {
			modelsError = e instanceof Error ? e.message : 'Failed to load models';
		} finally {
			modelsLoading = false;
		}
	}

	function save() {
		if (!browser || !apiKey.trim()) return;
		const sanitized = sanitizeApiKey(apiKey);
		localStorage.setItem('openai_api_key', sanitized);
		apiKey = sanitized;
		status = 'saved';
		loadModels(sanitized);
	}

	function saveModel() {
		if (browser) localStorage.setItem('bulk_converter_model', model);
	}

	export function getApiKey(): string {
		return apiKey;
	}

	export function getModel(): string {
		return model;
	}

	export function isConfigured(): boolean {
		return status === 'saved';
	}
</script>

<div class="api-key-prompt" data-testid="api-key-prompt">
	{#if status === 'saved'}
		<div class="configured">
			<span class="status-ok">API key configured</span>
			<button class="link-btn" onclick={() => { status = 'unconfigured'; }} data-testid="change-key-btn">
				Change
			</button>
			{#if modelsLoading}
				<span class="models-loading">Loading models...</span>
			{:else if modelsError}
				<span class="models-error" title={modelsError}>Models unavailable</span>
			{:else if availableModels.length > 0}
				<select
					class="model-select"
					bind:value={model}
					onchange={saveModel}
					data-testid="model-select"
				>
					{#each availableModels as m}
						<option value={m}>{m}</option>
					{/each}
				</select>
			{/if}
		</div>
	{:else}
		<div class="key-form">
			<label for="api-key-input">OpenAI API Key</label>
			<div class="input-row">
				<input
					id="api-key-input"
					type={showKey ? 'text' : 'password'}
					bind:value={apiKey}
					placeholder="sk-..."
					data-testid="api-key-input"
				/>
				<button class="toggle-btn" onclick={() => { showKey = !showKey; }}>
					{showKey ? 'Hide' : 'Show'}
				</button>
				<button class="save-btn" onclick={save} disabled={!apiKey.trim()} data-testid="save-key-btn">
					Save
				</button>
			</div>
			<p class="help-text">
				<a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener">
					Get an API key
				</a>
				— used for recipe parsing only. Key stays in your browser.
			</p>
		</div>
	{/if}
</div>

<style>
	.api-key-prompt {
		padding: 0.75rem;
		background: var(--color-surface);
		border-radius: 4px;
		margin-bottom: 1rem;
	}

	.configured {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.status-ok {
		color: #a6e22e;
		font-size: 0.9rem;
	}

	.link-btn {
		background: none;
		border: none;
		color: var(--color-text-secondary);
		cursor: pointer;
		text-decoration: underline;
		font-size: 0.85rem;
		padding: 0;
	}

	.model-select {
		margin-left: auto;
		padding: 0.25rem 0.5rem;
		background: var(--color-input-bg);
		color: var(--color-text);
		border: 1px solid var(--color-border);
		border-radius: 4px;
		font-size: 0.85rem;
	}

	.models-loading {
		margin-left: auto;
		font-size: 0.8rem;
		color: var(--color-text-muted);
	}

	.models-error {
		margin-left: auto;
		font-size: 0.8rem;
		color: #f92672;
		cursor: help;
	}

	.key-form label {
		display: block;
		font-weight: 600;
		margin-bottom: 0.25rem;
		font-size: 0.9rem;
	}

	.input-row {
		display: flex;
		gap: 0.5rem;
	}

	.input-row input {
		flex: 1;
		padding: 0.5rem 0.75rem;
		font-size: 0.9rem;
		border: 1px solid var(--color-border);
		border-radius: 4px;
		background: var(--color-input-bg);
		color: var(--color-text);
	}

	.toggle-btn, .save-btn {
		padding: 0.5rem 0.75rem;
		border: 1px solid var(--color-border);
		border-radius: 4px;
		background: var(--color-surface);
		color: var(--color-text);
		cursor: pointer;
		font-size: 0.85rem;
	}

	.save-btn {
		background: var(--color-accent);
		color: var(--color-accent-fg);
		border-color: var(--color-accent);
	}

	.save-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.help-text {
		margin: 0.5rem 0 0;
		font-size: 0.8rem;
		color: var(--color-text-muted);
	}

	.help-text a {
		color: var(--color-accent);
	}
</style>
