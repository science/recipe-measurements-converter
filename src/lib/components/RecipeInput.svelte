<script lang="ts">
	let {
		onparse,
		loading = false
	}: {
		onparse: (text: string) => void;
		loading?: boolean;
	} = $props();

	let recipeText = $state('');

	function handleParse() {
		const trimmed = recipeText.trim();
		if (trimmed && !loading) {
			onparse(trimmed);
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
			handleParse();
		}
	}
</script>

<div class="recipe-input" data-testid="recipe-input">
	<label for="recipe-textarea">Paste recipe ingredients</label>
	<textarea
		id="recipe-textarea"
		bind:value={recipeText}
		placeholder="2 cups all-purpose flour
1/2 cup unsalted butter
3 large eggs
1 tsp vanilla extract
..."
		rows="8"
		onkeydown={handleKeydown}
		data-testid="recipe-textarea"
	></textarea>
	<div class="actions">
		<button
			class="parse-btn"
			onclick={handleParse}
			disabled={!recipeText.trim() || loading}
			data-testid="parse-btn"
		>
			{#if loading}
				Parsing...
			{:else}
				Parse Recipe
			{/if}
		</button>
		<span class="hint">Ctrl+Enter to parse</span>
	</div>
</div>

<style>
	.recipe-input {
		margin-bottom: 1rem;
	}

	label {
		display: block;
		font-weight: 600;
		margin-bottom: 0.25rem;
		font-size: 0.9rem;
		color: var(--color-text);
	}

	textarea {
		width: 100%;
		padding: 0.75rem;
		font-size: 0.9rem;
		font-family: system-ui, -apple-system, sans-serif;
		border: 1px solid var(--color-border);
		border-radius: 4px;
		background: var(--color-input-bg);
		color: var(--color-text);
		resize: vertical;
		box-sizing: border-box;
	}

	textarea::placeholder {
		color: var(--color-text-muted);
	}

	.actions {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-top: 0.5rem;
	}

	.parse-btn {
		padding: 0.5rem 1.25rem;
		font-size: 0.9rem;
		background: var(--color-accent);
		color: var(--color-accent-fg);
		border: none;
		border-radius: 4px;
		cursor: pointer;
		font-weight: 600;
	}

	.parse-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.hint {
		font-size: 0.8rem;
		color: var(--color-text-muted);
	}
</style>
