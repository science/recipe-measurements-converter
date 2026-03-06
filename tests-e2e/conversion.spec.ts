import { test, expect } from '@playwright/test';

test.describe('Conversion flow', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/');
	});

	test('select food → select measure → enter quantity → verify grams', async ({ page }) => {
		// Search and select "Millet flour"
		const input = page.getByTestId('food-search-input');
		await input.fill('Millet flour');
		await page.getByTestId('food-search-option').first().click();

		// Default: 1 cup
		const gramsValue = page.getByTestId('grams-value');
		await expect(gramsValue).toBeVisible();

		const grams = parseFloat(await gramsValue.textContent() ?? '0');
		// Millet flour density is 0.503, 1 cup = 236.588 ml, so ~119g
		expect(grams).toBeGreaterThan(115);
		expect(grams).toBeLessThan(123);
	});

	test('changing quantity updates result', async ({ page }) => {
		const input = page.getByTestId('food-search-input');
		await input.fill('Millet flour');
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
		await input.fill('Millet flour');
		await page.getByTestId('food-search-option').first().click();

		const gramsValue = page.getByTestId('grams-value');
		const gramsCup = parseFloat(await gramsValue.textContent() ?? '0');

		// Switch to tablespoon
		await page.getByTestId('measure-select').selectOption('tbsp');
		const gramsTbsp = parseFloat(await gramsValue.textContent() ?? '0');

		// Tablespoon should be much less than cup
		expect(gramsTbsp).toBeLessThan(gramsCup / 10);
	});

	test('known value: 1 cup all-purpose flour (0.528) ≈ 125g', async ({ page }) => {
		const input = page.getByTestId('food-search-input');
		await input.fill('Flour, wheat, white, all-purpose');
		await page.getByTestId('food-search-option').first().click();

		const gramsValue = page.getByTestId('grams-value');
		const grams = parseFloat(await gramsValue.textContent() ?? '0');
		// density 0.528 * 236.588 ml = ~124.9g
		expect(grams).toBeGreaterThan(122);
		expect(grams).toBeLessThan(128);
	});
});
