# Recipe Measurements Converter

Standalone webapp (no server) that converts volume and weight measurements to grams
using food density data. SvelteKit with static adapter for zero-server deployment.

400 ingredients from OC-USDA (USDA-sourced cooking densities), 17 categories, 9 measures (6 volume + 3 weight).

## Commands

### Development
- `npm run dev` - Start dev server
- `npm run build` - Production build (static site)
- `npm run preview` - Preview production build

### Testing
- `npm test` - Run Vitest unit tests
- `npm run test:e2e` - Run Playwright E2E tests

### Data Pipeline
- `npm run clean-data` - Rebuild food-density.json from OC-USDA source
- `npm run generate-embeddings` - Rebuild food-embeddings.json (requires OPENAI_API_KEY env var)
- Source: food-density-onlineconversion.json (400 USDA-sourced cooking densities)

## Architecture

### Data Flow
```
food-density-onlineconversion.json ─→ scripts/clean-data.ts ─→ food-density.json ─→ (bundled) ─→ UI
```
Single source, no merge. Items are slugified, deduplicated, and validated.

### Measure System — Discriminated Union
```typescript
type Measure =
  | { type: 'volume'; id: string; name: string; mlPerUnit: number }
  | { type: 'weight'; id: string; name: string; gramsPerUnit: number };
```
Volume measures (cup, tbsp, tsp, fl oz, ml, L) use density: `grams = qty × ml × density`.
Weight measures (oz, lb, kg) bypass density: `grams = qty × gramsPerUnit`.

### Source Layout
- `scripts/clean-data.ts` - Data pipeline (OC-USDA → JSON)
- `scripts/clean-data.test.ts` - Tests for parsing, deduplication, validation
- `scripts/scrape-onlineconversion.ts` - One-time scraper for onlineconversion.com (USDA data)
- `scripts/generate-scores.ts` - One-time commonality scoring
- `scripts/generate-embeddings.ts` - Build-time: hash food-density.json, generate/cache embeddings via OpenAI
- `scripts/embedding-prefix-experiment.ts` - One-time: test prefix strategies for embedding quality
- `scripts/calibrate-thresholds.ts` - One-time: calibrate match confidence thresholds
- `src/lib/data/types.ts` - FoodItem, DensityValue, FoodDatabase interfaces
- `src/lib/data/food-density.json` - Generated data (400 items, 17 categories)
- `src/lib/data/food-embeddings.json` - Pre-computed embeddings (400 items, 256 dims, ~1.2MB)
- `src/lib/data/food-database.ts` - Search, filter, lookup functions
- `src/lib/data/commonality-scores.json` - Per-item commonality scores (1-10)
- `src/lib/bulk-types.ts` - ParsedIngredient, MatchedIngredient, EmbeddingEntry types
- `src/lib/conversion.ts` - Volume→grams and weight→grams conversion
- `src/lib/measures.ts` - Measure definitions (discriminated union), `isWeightMeasure()` guard
- `src/lib/services/openai.ts` - OpenAI fetch client (chat + embeddings), retry logic, sanitizeApiKey
- `src/lib/services/recipe-parser.ts` - Stage 1: LLM parse with JSON Schema strict mode
- `src/lib/services/embedding-matcher.ts` - Stage 2: cosine similarity, findMatches, confidence thresholds
- `src/lib/components/FoodSearch.svelte` - Combobox with keyboard nav (Tab/Arrow/Enter/Escape)
- `src/lib/components/MeasureSelector.svelte` - Select with Volume/Weight optgroups
- `src/lib/components/ConversionResult.svelte` - Grams display with optional range
- `src/lib/components/NavTabs.svelte` - Tab bar (Single / Bulk)
- `src/lib/components/BulkConverter.svelte` - Orchestrator: manages LLM parse + embedding match pipeline
- `src/lib/components/RecipeInput.svelte` - Textarea + parse button
- `src/lib/components/ApiKeyPrompt.svelte` - API key input + save (localStorage)
- `src/lib/components/IngredientResultTable.svelte` - Results table with total
- `src/lib/components/IngredientResultRow.svelte` - Single row with match status + grams
- `src/lib/components/MatchSelector.svelte` - Top-3 match dropdown with confidence colors
- `src/routes/+page.svelte` - Single converter page
- `src/routes/bulk/+page.svelte` - Bulk converter page

### Bulk Converter — Two-Stage Pipeline
```
[Textarea: recipe text]
  → Stage 1: LLM Parse (gpt-4.1-mini, ~$0.0001/recipe)
    JSON Schema strict mode → [{name, quantity, measure_id, original_text}]
  → Stage 2: Embedding Match (cosine similarity against pre-computed vectors)
    Thresholds: ≥0.85 green (high), 0.70–0.85 yellow (uncertain), <0.70 red (none)
  → Results Table: parsed ingredient | matched DB item | qty | measure | grams
```
- Embeddings pre-computed at build time (`npm run generate-embeddings`), shipped as static JSON
- Prefix "cooking ingredient: " applied to both DB names and queries (determined by experiment)
- Count-based items ("3 large eggs") are pass-throughs: qty=null, measure_id=null, shown verbatim
- API key stored in localStorage, used only for recipe parsing (Stage 1)
- No OpenAI SDK — native fetch with retry logic

### Key Design Decisions
1. SvelteKit with static adapter, Svelte 5 runes ($state, $derived, $bindable)
2. JSON data bundled at build time (imported as ES module by Vite)
3. Density stored as {min, max, avg} (OC-USDA items have min=max=avg)
4. All conversion logic is pure functions with full test coverage
5. Single trusted source (OC-USDA) — no merge strategy needed
6. Commonality scores drive search result ordering (most common first, alphabetical within tier)
7. Search: plain `.filter()` + `.includes()` for substring matching (400 items = fast, no indexing needed)
8. Accessible combobox: ARIA roles, aria-activedescendant, Tab→focus dropdown items
9. Bulk converter splits work into cheap LLM parsing + vector similarity matching (no expensive LLM matching)

## Testing Strategy

### TDD: Red/Green/Refactor
Write failing test first, then implement. All pure logic has unit tests.

### Unit Tests (Vitest)
- Data cleaner functions (parseDensity, slugify, buildFromSupplemental, validateDensities)
- Conversion math (volumeToMl, mlToGrams, convert — both volume and weight)
- Measure system (volume/weight discrimination, isWeightMeasure)
- Search/filter logic (substring matching, category filtering, commonality sorting)
- Database module (item count, lookups, edge cases)
- Bulk types (isPassthrough type guard)
- OpenAI client (sanitizeApiKey, isRetryableError, createOpenAIClient)
- Recipe parser (schema validation, mocked API responses, egg pass-through)
- Embedding matcher (cosineSimilarity, findMatches, getConfidence, thresholds)

### E2E Tests (Playwright) — Primary UI Validation
Every user-facing feature must have E2E coverage before it's considered done.

Test files:
- `tests-e2e/search.spec.ts` - Search and selection flow
- `tests-e2e/conversion.spec.ts` - Volume conversion, quantity changes
- `tests-e2e/weight-conversion.spec.ts` - Weight measures, optgroups, density suppression
- `tests-e2e/keyboard-nav.spec.ts` - Tab/Enter/Space/Escape/Arrow/Shift-Tab in dropdown
- `tests-e2e/edge-cases.spec.ts` - Empty states, zero quantity
- `tests-e2e/bulk-converter.spec.ts` - Tab navigation, API key flow, bulk UI elements

## Data Source

**OnlineConversion.com** (400 items) - USDA-sourced cooking densities, scraped and categorized via regex patterns. All densities are single values (no ranges). KA density fixes (chocolate morsels, molasses, baking soda compacted) are applied in the source JSON.

Commonality scores (1-10) assigned to all items via rules-based scoring in generate-scores.ts.
