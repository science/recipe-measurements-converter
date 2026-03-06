import type { EmbeddingData, EmbeddingEntry, MatchResult, MatchConfidence } from '../bulk-types.js';

export const THRESHOLDS = {
	high: 0.85,
	uncertain: 0.70
} as const;

export function cosineSimilarity(a: number[], b: number[]): number {
	if (a.length !== b.length) throw new Error('Vectors must have same length');
	if (a.length === 0) throw new Error('Vectors must not be empty');

	let dot = 0;
	let normA = 0;
	let normB = 0;
	for (let i = 0; i < a.length; i++) {
		dot += a[i] * b[i];
		normA += a[i] * a[i];
		normB += b[i] * b[i];
	}

	const denominator = Math.sqrt(normA) * Math.sqrt(normB);
	if (denominator === 0) return 0;
	return dot / denominator;
}

export function getConfidence(score: number): MatchConfidence {
	if (score >= THRESHOLDS.high) return 'high';
	if (score >= THRESHOLDS.uncertain) return 'uncertain';
	return 'none';
}

export function findMatches(
	queryVector: number[],
	embeddings: EmbeddingEntry[],
	topK: number = 3
): MatchResult[] {
	const scored = embeddings.map((entry) => ({
		itemId: entry.id,
		score: cosineSimilarity(queryVector, entry.vector)
	}));

	scored.sort((a, b) => b.score - a.score);
	return scored.slice(0, topK);
}

export function findBestMatch(
	queryVector: number[],
	embeddings: EmbeddingEntry[]
): { match: MatchResult; confidence: MatchConfidence } | null {
	const matches = findMatches(queryVector, embeddings, 1);
	if (matches.length === 0) return null;

	return {
		match: matches[0],
		confidence: getConfidence(matches[0].score)
	};
}
