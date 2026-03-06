import { test, expect } from '@playwright/test';

test.describe('Tab navigation', () => {
	test('shows Single and Bulk tabs', async ({ page }) => {
		await page.goto('/');
		const nav = page.getByTestId('nav-tabs');
		await expect(nav).toBeVisible();
		await expect(nav.getByTestId('nav-tab-single')).toHaveText('Single Lookup');
		await expect(nav.getByTestId('nav-tab-bulk')).toHaveText('Bulk Convert');
	});

	test('Single tab is active on home page', async ({ page }) => {
		await page.goto('/');
		await expect(page.getByTestId('nav-tab-single')).toHaveClass(/active/);
		await expect(page.getByTestId('nav-tab-bulk')).not.toHaveClass(/active/);
	});

	test('Bulk tab is active on /bulk page', async ({ page }) => {
		await page.goto('/bulk');
		await expect(page.getByTestId('nav-tab-bulk')).toHaveClass(/active/);
		await expect(page.getByTestId('nav-tab-single')).not.toHaveClass(/active/);
	});

	test('clicking Bulk tab navigates to /bulk', async ({ page }) => {
		await page.goto('/');
		await page.getByTestId('nav-tab-bulk').click();
		await expect(page).toHaveURL(/\/bulk$/);
	});

	test('clicking Single tab navigates back', async ({ page }) => {
		await page.goto('/bulk');
		await page.getByTestId('nav-tab-single').click();
		await expect(page).toHaveURL(/\/$/);
	});
});

test.describe('Bulk converter onboarding', () => {
	test('shows onboarding panel when no API key configured', async ({ page }) => {
		await page.goto('/bulk');
		const onboarding = page.getByTestId('bulk-onboarding');
		await expect(onboarding).toBeVisible();
		await expect(onboarding).toContainText('Bulk Recipe Converter');
		await expect(onboarding).toContainText('Why an API key?');
		await expect(onboarding).toContainText('Cost');
		await expect(onboarding).toContainText('Privacy');
	});

	test('onboarding contains the 3 steps', async ({ page }) => {
		await page.goto('/bulk');
		const onboarding = page.getByTestId('bulk-onboarding');
		await expect(onboarding).toContainText('Paste your OpenAI API key');
		await expect(onboarding).toContainText('Paste a recipe ingredient list');
		await expect(onboarding).toContainText('Get gram weights');
	});

	test('onboarding hides after API key is saved', async ({ page }) => {
		await page.goto('/bulk');
		await expect(page.getByTestId('bulk-onboarding')).toBeVisible();

		// Save an API key
		await page.getByTestId('api-key-input').fill('sk-test123');
		await page.getByTestId('save-key-btn').click();

		// Onboarding should disappear
		await expect(page.getByTestId('bulk-onboarding')).not.toBeVisible();
		// API key configured status should show
		await expect(page.getByText('API key configured')).toBeVisible();
	});

	test('returning user with stored key skips onboarding', async ({ page }) => {
		// Set key in localStorage before navigating
		await page.goto('/bulk');
		await page.evaluate(() => localStorage.setItem('openai_api_key', 'sk-stored'));
		await page.reload();

		await expect(page.getByTestId('bulk-onboarding')).not.toBeVisible();
		await expect(page.getByText('API key configured')).toBeVisible();
	});
});

test.describe('Bulk converter page', () => {
	test('shows API key prompt when unconfigured', async ({ page }) => {
		await page.goto('/bulk');
		const prompt = page.getByTestId('api-key-prompt');
		await expect(prompt).toBeVisible();
		await expect(page.getByTestId('api-key-input')).toBeVisible();
	});

	test('API key save/change flow', async ({ page }) => {
		await page.goto('/bulk');

		// Enter and save key
		await page.getByTestId('api-key-input').fill('sk-test123');
		await page.getByTestId('save-key-btn').click();

		// Should show configured state
		await expect(page.getByText('API key configured')).toBeVisible();
		await expect(page.getByTestId('change-key-btn')).toBeVisible();

		// Click change to show input again
		await page.getByTestId('change-key-btn').click();
		await expect(page.getByTestId('api-key-input')).toBeVisible();
	});

	test('shows embedding status', async ({ page }) => {
		await page.goto('/bulk');
		const status = page.getByTestId('embedding-status');
		await expect(status).toBeVisible();
		await expect(status).toContainText('ingredients loaded');
	});

	test('recipe textarea and parse button present', async ({ page }) => {
		await page.goto('/bulk');
		await expect(page.getByTestId('recipe-textarea')).toBeVisible();
		await expect(page.getByTestId('parse-btn')).toBeVisible();
	});

	test('parse button disabled when textarea empty', async ({ page }) => {
		await page.goto('/bulk');
		await expect(page.getByTestId('parse-btn')).toBeDisabled();
	});

	test('parse button enabled when text entered', async ({ page }) => {
		await page.goto('/bulk');
		await page.getByTestId('recipe-textarea').fill('2 cups flour');
		await expect(page.getByTestId('parse-btn')).toBeEnabled();
	});

	test('shows models loading state after API key saved', async ({ page }) => {
		await page.goto('/bulk');
		await page.getByTestId('api-key-input').fill('sk-test123');
		await page.getByTestId('save-key-btn').click();
		// With a fake key, models fetch will fail — should show error or loading
		await expect(page.getByText(/Loading models|Models unavailable/)).toBeVisible();
	});
});
