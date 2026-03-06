import { test, expect } from '@playwright/test';

test.describe('Weight conversion', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/');
	});

	test('1 oz → 28.3g regardless of food density', async ({ page }) => {
		const input = page.getByTestId('food-search-input');
		await input.fill('Millet flour');
		await page.getByTestId('food-search-option').first().click();

		await page.getByTestId('measure-select').selectOption('oz');

		const gramsValue = page.getByTestId('grams-value');
		const grams = parseFloat(await gramsValue.textContent() ?? '0');
		expect(grams).toBeCloseTo(28.3, 0);
	});

	test('1 lb → 453.6g', async ({ page }) => {
		const input = page.getByTestId('food-search-input');
		await input.fill('Millet flour');
		await page.getByTestId('food-search-option').first().click();

		await page.getByTestId('measure-select').selectOption('lb');

		const gramsValue = page.getByTestId('grams-value');
		const grams = parseFloat(await gramsValue.textContent() ?? '0');
		expect(grams).toBeCloseTo(453.6, 0);
	});

	test('weight measure hides density info', async ({ page }) => {
		const input = page.getByTestId('food-search-input');
		await input.fill('Millet flour');
		await page.getByTestId('food-search-option').first().click();

		// With volume measure, density info is shown
		await expect(page.getByTestId('selected-info')).toBeVisible();

		// Switch to weight measure
		await page.getByTestId('measure-select').selectOption('oz');
		await expect(page.getByTestId('selected-info')).not.toBeVisible();
	});

	test('measure selector has Volume and Weight optgroups', async ({ page }) => {
		const select = page.getByTestId('measure-select');
		const volumeGroup = select.locator('optgroup[label="Volume"]');
		const weightGroup = select.locator('optgroup[label="Weight"]');

		// optgroups exist in the DOM (they're hidden because the select is closed)
		await expect(volumeGroup).toBeAttached();
		await expect(weightGroup).toBeAttached();

		// Volume has 6 options, Weight has 3
		expect(await volumeGroup.locator('option').count()).toBe(6);
		expect(await weightGroup.locator('option').count()).toBe(3);
	});
});
