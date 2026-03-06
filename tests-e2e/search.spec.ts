import { test, expect } from '@playwright/test';

test.describe('Food search', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/');
	});

	test('typing "flour" shows all flour items', async ({ page }) => {
		await page.getByTestId('food-search-input').fill('flour');
		const dropdown = page.getByTestId('food-search-dropdown');
		await expect(dropdown).toBeVisible();

		const options = dropdown.getByTestId('food-search-option');
		const count = await options.count();
		expect(count).toBeGreaterThan(10);

		// All visible options contain "flour"
		for (let i = 0; i < Math.min(count, 5); i++) {
			const text = await options.nth(i).textContent();
			expect(text!.toLowerCase()).toContain('flour');
		}
	});

	test('typing "corn" shows corn items across categories', async ({ page }) => {
		await page.getByTestId('food-search-input').fill('corn');
		const options = page.getByTestId('food-search-option');
		const count = await options.count();
		expect(count).toBeGreaterThan(5);
	});

	test('clearing search closes dropdown', async ({ page }) => {
		const input = page.getByTestId('food-search-input');
		await input.fill('flour');
		await expect(page.getByTestId('food-search-dropdown')).toBeVisible();
		await input.fill('');
		await expect(page.getByTestId('food-search-dropdown')).not.toBeVisible();
	});

	test('arrow keys navigate dropdown, Enter selects', async ({ page }) => {
		const input = page.getByTestId('food-search-input');
		await input.fill('barley');
		await expect(page.getByTestId('food-search-dropdown')).toBeVisible();

		// Arrow down to first item
		await input.press('ArrowDown');
		const firstOption = page.getByTestId('food-search-option').first();
		await expect(firstOption).toHaveClass(/highlighted/);

		// Press Enter to select
		await input.press('Enter');
		await expect(page.getByTestId('food-search-dropdown')).not.toBeVisible();

		// Input now shows the selected item name
		const value = await input.inputValue();
		expect(value.toLowerCase()).toContain('barley');
	});

	test('Escape closes dropdown', async ({ page }) => {
		const input = page.getByTestId('food-search-input');
		await input.fill('flour');
		await expect(page.getByTestId('food-search-dropdown')).toBeVisible();
		await input.press('Escape');
		await expect(page.getByTestId('food-search-dropdown')).not.toBeVisible();
	});

	test('dropdown shows friendly display names', async ({ page }) => {
		const input = page.getByTestId('food-search-input');
		await input.fill('maple syrup');
		const dropdown = page.getByTestId('food-search-dropdown');
		await expect(dropdown).toBeVisible();
		// "Syrup, maple" has displayName "Maple syrup" — dropdown should show the friendly name
		const firstOption = dropdown.getByTestId('food-search-option').first();
		await expect(firstOption).toContainText('Maple syrup');
	});

	test('selecting a friendly-named item fills input with friendly name', async ({ page }) => {
		const input = page.getByTestId('food-search-input');
		await input.fill('maple syrup');
		const dropdown = page.getByTestId('food-search-dropdown');
		await expect(dropdown).toBeVisible();
		await dropdown.getByTestId('food-search-option').first().click();
		const value = await input.inputValue();
		expect(value).toBe('Maple syrup');
	});
});
