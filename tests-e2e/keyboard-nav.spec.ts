import { test, expect } from '@playwright/test';

test.describe('Keyboard navigation', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/');
	});

	test('Tab from input focuses first dropdown item', async ({ page }) => {
		const input = page.getByTestId('food-search-input');
		await input.fill('barley');
		await expect(page.getByTestId('food-search-dropdown')).toBeVisible();

		await input.press('Tab');

		// First option should be focused and highlighted
		const firstOption = page.getByTestId('food-search-option').first();
		await expect(firstOption).toBeFocused();
		await expect(firstOption).toHaveClass(/highlighted/);
	});

	test('Enter on focused dropdown item selects it', async ({ page }) => {
		const input = page.getByTestId('food-search-input');
		await input.fill('barley');
		await expect(page.getByTestId('food-search-dropdown')).toBeVisible();

		// Tab to first item, then Enter to select
		await input.press('Tab');
		const firstOption = page.getByTestId('food-search-option').first();
		await expect(firstOption).toBeFocused();

		await firstOption.press('Enter');

		// Dropdown closes, input has the selected name
		await expect(page.getByTestId('food-search-dropdown')).not.toBeVisible();
		const value = await input.inputValue();
		expect(value.toLowerCase()).toContain('barley');
	});

	test('Space on focused dropdown item selects it', async ({ page }) => {
		const input = page.getByTestId('food-search-input');
		await input.fill('barley');
		await expect(page.getByTestId('food-search-dropdown')).toBeVisible();

		await input.press('Tab');
		const firstOption = page.getByTestId('food-search-option').first();
		await expect(firstOption).toBeFocused();

		await firstOption.press(' ');

		await expect(page.getByTestId('food-search-dropdown')).not.toBeVisible();
		const value = await input.inputValue();
		expect(value.toLowerCase()).toContain('barley');
	});

	test('Shift-Tab from dropdown returns focus to input', async ({ page }) => {
		const input = page.getByTestId('food-search-input');
		await input.fill('barley');
		await expect(page.getByTestId('food-search-dropdown')).toBeVisible();

		// Tab to first item
		await input.press('Tab');
		const firstOption = page.getByTestId('food-search-option').first();
		await expect(firstOption).toBeFocused();

		// Shift-Tab back to input
		await firstOption.press('Shift+Tab');
		await expect(input).toBeFocused();
	});

	test('after selection, input text is fully selected for replacement', async ({ page }) => {
		const input = page.getByTestId('food-search-input');
		await input.fill('barley');
		await input.press('ArrowDown');
		await input.press('Enter');

		// Input should have selected text — typing should replace it
		const valueBefore = await input.inputValue();
		expect(valueBefore.toLowerCase()).toContain('barley');

		// Focus should be on the input
		await expect(input).toBeFocused();

		// Type a new search — should replace the entire selected text
		await input.pressSequentially('choc');

		const valueAfter = await input.inputValue();
		expect(valueAfter).toBe('choc');
	});

	test('arrow keys navigate within dropdown items', async ({ page }) => {
		const input = page.getByTestId('food-search-input');
		await input.fill('barley');
		await expect(page.getByTestId('food-search-dropdown')).toBeVisible();

		// Tab to first item
		await input.press('Tab');
		const options = page.getByTestId('food-search-option');
		await expect(options.first()).toBeFocused();

		// Arrow down to second item
		await options.first().press('ArrowDown');
		await expect(options.nth(1)).toBeFocused();

		// Arrow up back to first
		await options.nth(1).press('ArrowUp');
		await expect(options.first()).toBeFocused();
	});

	test('ArrowUp from first dropdown item returns focus to input', async ({ page }) => {
		const input = page.getByTestId('food-search-input');
		await input.fill('barley');
		await input.press('Tab');

		const firstOption = page.getByTestId('food-search-option').first();
		await expect(firstOption).toBeFocused();

		await firstOption.press('ArrowUp');
		await expect(input).toBeFocused();
	});

	test('Escape from dropdown item closes dropdown and returns to input', async ({ page }) => {
		const input = page.getByTestId('food-search-input');
		await input.fill('barley');
		await input.press('Tab');

		const firstOption = page.getByTestId('food-search-option').first();
		await expect(firstOption).toBeFocused();

		await firstOption.press('Escape');
		await expect(page.getByTestId('food-search-dropdown')).not.toBeVisible();
		await expect(input).toBeFocused();
	});

	test('existing arrow+enter flow still works', async ({ page }) => {
		const input = page.getByTestId('food-search-input');
		await input.fill('barley');
		await expect(page.getByTestId('food-search-dropdown')).toBeVisible();

		// Arrow down highlights (focus stays on input)
		await input.press('ArrowDown');
		const firstOption = page.getByTestId('food-search-option').first();
		await expect(firstOption).toHaveClass(/highlighted/);
		await expect(input).toBeFocused();

		// Enter from input selects highlighted item
		await input.press('Enter');
		await expect(page.getByTestId('food-search-dropdown')).not.toBeVisible();
		const value = await input.inputValue();
		expect(value.toLowerCase()).toContain('barley');
	});
});
