<script>
	import NavTabs from '$lib/components/NavTabs.svelte';
	let { children } = $props();
</script>

<main>
	<div class="layout-container">
		<NavTabs />
	</div>
	{@render children()}
</main>

<style>
	:global(:root) {
		--color-bg: #272822;
		--color-surface: #3e3e3e;
		--color-input-bg: #3e3e3e;
		--color-border: #555;
		--color-text: #d4d4d4;
		--color-text-secondary: #999;
		--color-text-muted: #75715e;
		--color-accent: #e6db74;
		--color-accent-fg: #272822;
		--color-hover: rgba(255, 255, 255, 0.07);
		--color-dropdown-bg: #323232;
		--color-highlight: rgba(230, 219, 116, 0.15);
	}

	:global(html, body) {
		background: var(--color-bg);
		color: var(--color-text);
		margin: 0;
	}

	main {
		color: var(--color-text);
	}

	.layout-container {
		max-width: 700px;
		margin: 0 auto;
		padding: 1rem 1rem 0;
		font-family: system-ui, -apple-system, sans-serif;
	}
</style>
