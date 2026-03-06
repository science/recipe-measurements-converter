import { describe, it, expect } from 'vitest';
import { cosineSimilarity, getConfidence, findMatches, findBestMatch, THRESHOLDS } from './embedding-matcher.js';
import type { EmbeddingEntry } from '../bulk-types.js';

describe('cosineSimilarity', () => {
	it('returns 1 for identical vectors', () => {
		expect(cosineSimilarity([1, 0, 0], [1, 0, 0])).toBeCloseTo(1.0);
	});

	it('returns 0 for orthogonal vectors', () => {
		expect(cosineSimilarity([1, 0, 0], [0, 1, 0])).toBeCloseTo(0.0);
	});

	it('returns -1 for opposite vectors', () => {
		expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1.0);
	});

	it('handles non-unit vectors', () => {
		// [3, 4] and [6, 8] are parallel, should be 1.0
		expect(cosineSimilarity([3, 4], [6, 8])).toBeCloseTo(1.0);
	});

	it('computes known value', () => {
		// cos([1,2,3], [4,5,6]) = 32 / (sqrt(14) * sqrt(77)) ≈ 0.9746
		expect(cosineSimilarity([1, 2, 3], [4, 5, 6])).toBeCloseTo(0.9746, 3);
	});

	it('returns 0 for zero vectors', () => {
		expect(cosineSimilarity([0, 0, 0], [1, 2, 3])).toBe(0);
	});

	it('throws for different-length vectors', () => {
		expect(() => cosineSimilarity([1, 2], [1, 2, 3])).toThrow('same length');
	});

	it('throws for empty vectors', () => {
		expect(() => cosineSimilarity([], [])).toThrow('not be empty');
	});
});

describe('getConfidence', () => {
	it('returns high for scores >= 0.85', () => {
		expect(getConfidence(0.85)).toBe('high');
		expect(getConfidence(0.95)).toBe('high');
		expect(getConfidence(1.0)).toBe('high');
	});

	it('returns uncertain for scores in [0.70, 0.85)', () => {
		expect(getConfidence(0.70)).toBe('uncertain');
		expect(getConfidence(0.80)).toBe('uncertain');
		expect(getConfidence(0.849)).toBe('uncertain');
	});

	it('returns none for scores < 0.70', () => {
		expect(getConfidence(0.69)).toBe('none');
		expect(getConfidence(0.5)).toBe('none');
		expect(getConfidence(0.0)).toBe('none');
	});
});

describe('findMatches', () => {
	const embeddings: EmbeddingEntry[] = [
		{ id: 'flour', vector: [1, 0, 0] },
		{ id: 'sugar', vector: [0, 1, 0] },
		{ id: 'butter', vector: [0, 0, 1] },
		{ id: 'wheat-flour', vector: [0.95, 0.05, 0] }
	];

	it('returns top-K matches sorted by score descending', () => {
		const query = [1, 0, 0]; // should match flour best
		const matches = findMatches(query, embeddings, 3);

		expect(matches).toHaveLength(3);
		expect(matches[0].itemId).toBe('flour');
		expect(matches[0].score).toBeCloseTo(1.0);
		expect(matches[1].itemId).toBe('wheat-flour');
		expect(matches[1].score).toBeGreaterThan(0.9);
	});

	it('defaults to top 3', () => {
		const matches = findMatches([1, 0, 0], embeddings);
		expect(matches).toHaveLength(3);
	});

	it('returns all if fewer than topK', () => {
		const small: EmbeddingEntry[] = [{ id: 'a', vector: [1, 0] }];
		const matches = findMatches([1, 0], small, 5);
		expect(matches).toHaveLength(1);
	});

	it('ranks correctly for mixed similarity', () => {
		const query = [0.5, 0.5, 0]; // between flour and sugar
		const matches = findMatches(query, embeddings, 4);

		// flour and sugar should both score ~0.707, wheat-flour ~0.743
		expect(matches[0].itemId).toBe('wheat-flour');
	});
});

describe('findBestMatch', () => {
	const embeddings: EmbeddingEntry[] = [
		{ id: 'flour', vector: [1, 0] },
		{ id: 'sugar', vector: [0, 1] }
	];

	it('returns best match with confidence', () => {
		const result = findBestMatch([1, 0], embeddings);
		expect(result).not.toBeNull();
		expect(result!.match.itemId).toBe('flour');
		expect(result!.match.score).toBeCloseTo(1.0);
		expect(result!.confidence).toBe('high');
	});

	it('returns null for empty embeddings', () => {
		const result = findBestMatch([1, 0], []);
		expect(result).toBeNull();
	});

	it('returns uncertain confidence for medium similarity', () => {
		// Create a vector that's somewhat similar but not great
		const query = [0.8, 0.6]; // normalized: ~[0.8, 0.6], cos with [1,0] = 0.8
		const result = findBestMatch(query, embeddings);
		expect(result).not.toBeNull();
		expect(result!.confidence).toBe('uncertain');
	});
});

describe('THRESHOLDS', () => {
	it('has high at 0.85', () => {
		expect(THRESHOLDS.high).toBe(0.85);
	});

	it('has uncertain at 0.70', () => {
		expect(THRESHOLDS.uncertain).toBe(0.70);
	});
});
