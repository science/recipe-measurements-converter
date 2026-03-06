<script lang="ts">
	import BulkConverter from '$lib/components/BulkConverter.svelte';
</script>

<div class="app">
	<h1>Bulk Recipe Converter</h1>
	<p class="subtitle">Paste a full recipe ingredient list — get everything converted to grams at once</p>

	<BulkConverter />
</div>

<style>
	.app {
		max-width: 700px;
		margin: 0 auto;
		padding: 2rem 1rem;
		font-family: system-ui, -apple-system, sans-serif;
	}

	h1 {
		margin-bottom: 0.25rem;
	}

	.subtitle {
		color: var(--color-text-secondary);
		margin-top: 0;
	}
</style>
