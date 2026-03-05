import { test, expect } from '@playwright/test';

test.describe('Category filter', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/');
	});

	test('clicking a category narrows search results', async ({ page }) => {
		const input = page.getByTestId('food-search-input');

		// Search without category filter first
		await input.fill('flour');
		const allResults = await page.getByTestId('food-search-option').count();

		// Close dropdown so category chips are clickable
		await input.press('Escape');

		// Click "Grains and cereals" category
		await page.getByTestId('category-chip').filter({ hasText: 'Grains and cereals' }).click();

		// Re-type to trigger search with category
		await input.fill('');
		await input.fill('flour');

		const filteredResults = await page.getByTestId('food-search-option').count();
		expect(filteredResults).toBeLessThan(allResults);
		expect(filteredResults).toBeGreaterThan(0);
	});

	test('clicking active category deselects it', async ({ page }) => {
		const chip = page.getByTestId('category-chip').filter({ hasText: 'Sweets' });
		await chip.click();
		await expect(chip).toHaveClass(/active/);
		await chip.click();
		await expect(chip).not.toHaveClass(/active/);
	});
});
