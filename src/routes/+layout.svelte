<script>
	import { base } from '$app/paths';
	import NavTabs from '$lib/components/NavTabs.svelte';
	let { children } = $props();
</script>

<main>
	<div class="layout-container">
		<NavTabs />
	</div>
	{@render children()}
</main>

<footer class="site-footer">
	<div class="footer-content">
		<a href="{base}/food-density.json" download>Download ingredient data (JSON)</a>
		<span class="sep">|</span>
		<a href="https://github.com/science/recipe-measurements-converter">Source on GitHub</a>
		<span class="sep">|</span>
		<span>&copy; {new Date().getFullYear()} Stephen Midgley — Apache 2.0 License</span>
	</div>
</footer>

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

	.site-footer {
		max-width: 700px;
		margin: 3rem auto 1rem;
		padding: 1rem;
		border-top: 1px solid var(--color-border);
		font-size: 0.75rem;
		color: var(--color-text-muted);
		font-family: system-ui, -apple-system, sans-serif;
	}

	.footer-content {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
		align-items: center;
		justify-content: center;
	}

	.site-footer a {
		color: var(--color-text-secondary);
		text-decoration: none;
	}

	.site-footer a:hover {
		color: var(--color-accent);
	}

	.sep {
		color: var(--color-border);
	}
</style>
