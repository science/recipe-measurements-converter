<script lang="ts">
	import { base } from '$app/paths';
	import { page } from '$app/stores';

	const tabs = [
		{ path: '/', label: 'Single Lookup', testId: 'nav-tab-single' },
		{ path: '/bulk', label: 'Bulk Convert', testId: 'nav-tab-bulk' }
	];
</script>

<nav class="nav-tabs" data-testid="nav-tabs">
	{#each tabs as tab}
		<a
			href="{base}{tab.path}"
			class="tab"
			class:active={$page.url.pathname === base + tab.path || (tab.path === '/' && $page.url.pathname === base)}
			data-testid={tab.testId}
		>
			{tab.label}
		</a>
	{/each}
</nav>

<style>
	.nav-tabs {
		display: flex;
		gap: 0;
		margin-bottom: 1.5rem;
		border-bottom: 1px solid var(--color-border);
	}

	.tab {
		padding: 0.5rem 1.25rem;
		text-decoration: none;
		color: var(--color-text-secondary);
		border-bottom: 2px solid transparent;
		font-size: 0.95rem;
		transition: color 0.15s, border-color 0.15s;
	}

	.tab:hover {
		color: var(--color-text);
	}

	.tab.active {
		color: var(--color-accent);
		border-bottom-color: var(--color-accent);
	}
</style>
