import { test, expect } from '@playwright/test';

test.describe('Edge cases', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/');
	});

	test('no search results shows helpful message', async ({ page }) => {
		await page.getByTestId('food-search-input').fill('xyznonexistent');
		await expect(page.getByTestId('no-results')).toBeVisible();
		await expect(page.getByTestId('no-results')).toContainText('No ingredients found');
	});

	test('zero quantity shows 0g', async ({ page }) => {
		const input = page.getByTestId('food-search-input');
		await input.fill('Barley, flour');
		await page.getByTestId('food-search-option').first().click();

		await page.getByTestId('quantity-input').fill('0');
		const grams = page.getByTestId('grams-value');
		await expect(grams).toHaveText('0');
	});

	test('page loads with clean empty state', async ({ page }) => {
		await expect(page.getByTestId('no-conversion')).toBeVisible();
		await expect(page.getByTestId('no-conversion')).toContainText('Select an ingredient');
	});
});
