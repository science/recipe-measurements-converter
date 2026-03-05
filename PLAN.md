# Recipe Measurements Converter - Implementation Plan

## Context

We have a raw pipe delimited data file (`food-density.psv`, ~375 food items with density in g/ml) that needs to become a standalone webapp for converting volume measures (cups, tbsp, etc.) to grams. The project will eventually support LLM-powered ingredient list parsing and conversion (paste the entire plain text ingredient list in, and it will convert all measures).

Product name: **recipe-measurements-converter**

---

## Phase 0: Project Setup

1. **Create CLAUDE.md** in project root (content below)
2. **`git init`**, add Apache 2.0 LICENSE, basic README.md
3. **Create GitHub remote**: `gh repo create science/recipe-measurements-converter --public --source=. --remote=origin`
4. **Scaffold project**: SvelteKit with static adapter (`npx sv create`), Svelte 5 with runes
5. Add vitest, playwright, tsx (for running cleaner script)
6. Initial commit + push

### CLAUDE.md Content

```markdown
# Recipe Measurements Converter

Standalone webapp (no server) that converts volume measures (cups, tbsp, tsp, etc.)
to grams using food density data. SvelteKit with static adapter for zero-server deployment.

## Commands

### Development
- `npm run dev` - Start dev server
- `npm run build` - Production build (static site)
- `npm run preview` - Preview production build

### Testing
- `npm test` - Run Vitest unit tests
- `npm run test:e2e` - Run Playwright E2E tests
- `npm run test` -- runs all tests

### Data Pipeline
- `npm run clean-data` - Parse raw PSV into src/lib/data/food-density.json
- Raw data: food-density-precleaned.txt (original dirty source)
- Cleaned data: food-density.psv (pipe-delimited, verified against raw)

## Architecture

### Data Flow
Raw text → food-density.psv → scripts/clean-data.ts → food-density.json → food-database.ts → UI

### Source Layout
- `scripts/clean-data.ts` - PSV → structured JSON converter
- `scripts/verify-psv.js` - Verifies PSV accuracy against raw text
- `src/lib/data/types.ts` - FoodItem, DensityValue, FoodDatabase interfaces
- `src/lib/data/food-density.json` - Generated clean data (~375 items)
- `src/lib/data/food-database.ts` - Search, filter, lookup functions
- `src/lib/conversion.ts` - Pure volume→grams conversion math
- `src/lib/measures.ts` - Volume measure definitions (cup, tbsp, tsp, etc.)
- `src/routes/` - SvelteKit pages
- `src/lib/components/` - Svelte UI components

### Key Design Decisions
1. SvelteKit with static adapter (extensible, community standard for Svelte 5)
2. JSON data bundled at build time (no runtime fetch/localStorage)
3. Density ranges stored as {min, max, avg}
4. All conversion logic is pure functions with full test coverage
5. Categories preserved from source data for filtering
6. Duplicates flagged for manual review, excluded from main database until resolved

## Testing & TDD
Red/green/refactor. Write failing test first, then implement.
All pure logic (conversion, parsing, search) has unit tests.
E2E tests cover the main user flow.

## Data Source
food-density-precleaned.txt contains ~375 food density values (g/ml)
from various sources (ASI, KEN, RC, USDA, etc.). The PSV was AI-generated
from this raw file and verified with scripts/verify-psv.js (375/375 match).
```

---

## Phase 1: Data Cleaner (`scripts/clean-data.ts`)

Since we now have a verified PSV file, the cleaner is much simpler — it parses the
pipe-delimited file rather than the messy raw text.

### Data Schema

```typescript
interface DensityValue { min: number; max: number; avg: number; }

interface FoodItem {
  id: string;           // slug: "barley-flour"
  name: string;         // "Barley, flour"
  category: string;     // "Grains and cereals"
  density: DensityValue; // g/ml
  source: string;       // "ASI", "KEN", etc.
}

interface FoodDatabase {
  version: string;
  itemCount: number;
  categories: string[];
  items: FoodItem[];
}
```

### Parsing pipeline (each step is a tested function)

1. **`parsePsvLine(line)`** - Split pipe-delimited line into fields
2. **`parseDensity(value)`** - Handle single values (`0.61`), ranges (`0.38-0.42`), integers (`1`)
3. **`slugify(name)`** - Generate IDs
4. **`fixTypos(text)`** - Known fixes: "Herbes" → "Herbs", "Bulrush mille" → "Bulrush millet", missing spaces after commas
5. **`findDuplicates(items)`** - Detect entries with same/very similar names but different densities
6. **`separateDuplicates(items)`** - Output clean items to `food-density.json`, duplicates to `duplicates-review.json` for manual resolution

### TDD sequence
- Write `scripts/clean-data.test.ts` with tests for each function (RED)
- Implement each function, making tests pass (GREEN)
- Integration test: full pipeline produces expected item count
- Run script to generate `src/lib/data/food-density.json`

---

## Phase 2: Food Database Module

**File**: `src/lib/data/food-database.ts`

Functions:
- `getAllItems(): FoodItem[]`
- `getCategories(): string[]`
- `getItemById(id: string): FoodItem | undefined`
- `searchItems(query: string): FoodItem[]` - case-insensitive substring match
- `getItemsByCategory(category: string): FoodItem[]`

Tests: item count, categories present, search correctness, no invalid densities.

---

## Phase 3: Conversion Logic

**Files**: `src/lib/measures.ts`, `src/lib/conversion.ts`

### Measures (volume → ml)
| Measure | ml/unit |
|---------|---------|
| Cup | 236.588 |
| Tablespoon | 14.787 |
| Teaspoon | 4.929 |
| Fluid ounce | 29.574 |
| Milliliter | 1 |
| Liter | 1000 |

### Conversion: `grams = quantity × ml_per_unit × density_g_per_ml`

Functions:
- `volumeToMl(quantity, measureId): number`
- `mlToGrams(ml, density): number`
- `convert({ quantity, measureId, density }): ConversionResult` - returns `{ grams, gramsMin?, gramsMax? }`

Tests: known conversions, edge cases (0, negative, unknown measure), range densities.

---

## Phase 4: UI

Single-page app with:
1. **FoodSearch** - text input with autocomplete dropdown, keyboard nav
2. **MeasureSelector** - `<select>` for the 6 measures
3. **Quantity input** - number field (default 1)
4. **ConversionResult** - displays grams, shows range when applicable
5. **CategoryFilter** - optional chips to narrow food list

Svelte 5 runes: `$state` for `selectedFood`, `quantity`, `selectedMeasure`; `$derived` for computed `result`.

E2E tests: search + select food, change quantity, switch measure, verify results.

---

## Future: LLM Ingredient Parser

Second page/route where users paste an ingredient list + API key (OpenAI or Claude).
The LLM parses ingredient measures and feeds them to the conversion functions.
SvelteKit's routing makes adding this page straightforward.

---

## File Structure

```
recipe-measurements-converter/
  CLAUDE.md
  PLAN.md                              # This file
  LICENSE                              # Apache 2.0
  README.md
  package.json
  svelte.config.js                     # SvelteKit + static adapter
  vite.config.ts
  food-density-precleaned.txt          # Raw source (kept in repo)
  food-density.psv                     # Cleaned PSV (verified against raw)
  scripts/
    clean-data.ts                      # PSV → JSON converter
    clean-data.test.ts
    verify-psv.js                      # Raw vs PSV verification
  src/
    routes/
      +page.svelte                     # Main converter page
      +layout.svelte                   # App layout
    lib/
      data/
        types.ts
        food-density.json              # Generated from PSV
        food-database.ts
        food-database.test.ts
      conversion.ts
      conversion.test.ts
      measures.ts
      measures.test.ts
      components/
        FoodSearch.svelte
        ConversionResult.svelte
        MeasureSelector.svelte
        CategoryFilter.svelte
  tests-e2e/
    conversion-flow.spec.ts
```

---

## Verification

After each phase:
- `npm test` - all unit tests pass
- After Phase 1: spot-check 10+ entries in generated JSON against PSV
- After Phase 3: verify known conversion (e.g., 1 cup wheat flour ≈ 123g at density 0.521)
- After Phase 4: `npm run test:e2e` - full user flow works
- `npm run build` - production build succeeds (static output)
