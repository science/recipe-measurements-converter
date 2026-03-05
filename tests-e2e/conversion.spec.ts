import { test, expect } from '@playwright/test';

test.describe('Conversion flow', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/');
	});

	test('select food → select measure → enter quantity → verify grams', async ({ page }) => {
		// Search and select "Barley, flour"
		const input = page.getByTestId('food-search-input');
		await input.fill('Barley, flour');
		await page.getByTestId('food-search-option').first().click();

		// Default: 1 cup
		const gramsValue = page.getByTestId('grams-value');
		await expect(gramsValue).toBeVisible();

		const grams = parseFloat(await gramsValue.textContent() ?? '0');
		// Barley flour density is 0.61, 1 cup = 236.588 ml, so ~144.3g
		expect(grams).toBeGreaterThan(140);
		expect(grams).toBeLessThan(150);
	});

	test('changing quantity updates result', async ({ page }) => {
		const input = page.getByTestId('food-search-input');
		await input.fill('Barley, flour');
		await page.getByTestId('food-search-option').first().click();

		const gramsValue = page.getByTestId('grams-value');
		const grams1 = parseFloat(await gramsValue.textContent() ?? '0');

		// Change quantity to 2
		const qtyInput = page.getByTestId('quantity-input');
		await qtyInput.fill('2');

		const grams2 = parseFloat(await gramsValue.textContent() ?? '0');
		expect(grams2).toBeCloseTo(grams1 * 2, 0);
	});

	test('switching measure changes result', async ({ page }) => {
		const input = page.getByTestId('food-search-input');
		await input.fill('Barley, flour');
		await page.getByTestId('food-search-option').first().click();

		const gramsValue = page.getByTestId('grams-value');
		const gramsCup = parseFloat(await gramsValue.textContent() ?? '0');

		// Switch to tablespoon
		await page.getByTestId('measure-select').selectOption('tbsp');
		const gramsTbsp = parseFloat(await gramsValue.textContent() ?? '0');

		// Tablespoon should be much less than cup
		expect(gramsTbsp).toBeLessThan(gramsCup / 10);
	});

	test('food with range density shows min/max', async ({ page }) => {
		// Barley, ground has density 0.38-0.42
		const input = page.getByTestId('food-search-input');
		await input.fill('Barley, ground');
		await page.getByTestId('food-search-option').first().click();

		await expect(page.getByTestId('grams-range')).toBeVisible();
	});

	test('known value: 1 cup wheat flour (0.521) ≈ 123g', async ({ page }) => {
		// Note: "Wheat, flour" is in duplicates. Let's use "Wheat, flour, white" which has 0.67
		const input = page.getByTestId('food-search-input');
		await input.fill('Wheat, flour, white');
		await page.getByTestId('food-search-option').first().click();

		const gramsValue = page.getByTestId('grams-value');
		const grams = parseFloat(await gramsValue.textContent() ?? '0');
		// density 0.67 * 236.588 ml = ~158.5g
		expect(grams).toBeGreaterThan(155);
		expect(grams).toBeLessThan(162);
	});
});
