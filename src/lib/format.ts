/**
 * Format a quantity for display: max 2 decimal places, no trailing zeros.
 */
export function formatQuantity(n: number): string {
	return parseFloat(n.toFixed(2)).toString();
}

export interface RecipeLineInput {
	name: string;
	grams: number | null;
	quantity: number | null;
	measureName: string | null;
}

/**
 * Format a single recipe line for clipboard/memo output.
 *
 * With grams:    "120g Flour, all-purpose (1 cup)"
 * No grams:      "Mystery spice (2 tsp)"
 * Passthrough:   "3 large eggs"
 */
export function formatRecipeLine(input: RecipeLineInput): string {
	const { name, grams, quantity, measureName } = input;

	// Passthrough: no quantity and no measure
	if (quantity === null && measureName === null) {
		return name;
	}

	// Build the parenthetical measure part
	const measureParts: string[] = [];
	if (quantity !== null) measureParts.push(formatQuantity(quantity));
	if (measureName !== null) measureParts.push(measureName);
	const measure = measureParts.length > 0 ? ` (${measureParts.join(' ')})` : '';

	if (grams !== null) {
		return `${grams}g ${name}${measure}`;
	}

	return `${name}${measure}`;
}
