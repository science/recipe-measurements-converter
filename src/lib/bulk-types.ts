export interface ParsedIngredient {
	name: string;
	quantity: number | null;
	measure_id: string | null;
	original_text: string;
}

export interface EmbeddingEntry {
	id: string;
	vector: number[];
}

export interface EmbeddingData {
	hash: string;
	model: string;
	dimensions: number;
	prefix: string;
	embeddings: EmbeddingEntry[];
}

export interface MatchResult {
	itemId: string;
	score: number;
}

export type MatchConfidence = 'high' | 'uncertain' | 'none';

export interface MatchedIngredient {
	parsed: ParsedIngredient;
	matches: MatchResult[];
	confidence: MatchConfidence;
	selectedItemId: string | null;
	grams: number | null;
}

export function isPassthrough(parsed: ParsedIngredient): boolean {
	return parsed.quantity === null && parsed.measure_id === null;
}
