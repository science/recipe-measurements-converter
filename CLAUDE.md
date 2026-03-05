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

### Data Pipeline
- `npm run clean-data` - Parse PSV into src/lib/data/food-density.json
- Raw data: food-density-precleaned.txt (original dirty source)
- Cleaned data: food-density.psv (pipe-delimited, verified against raw)

## Architecture

### Data Flow
food-density.psv → scripts/clean-data.ts → food-density.json → (bundled at build) → UI

### Source Layout
- `scripts/clean-data.ts` - PSV → JSON converter
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
2. JSON data bundled at build time (imported as ES module by Vite)
3. Density ranges stored as {min, max, avg}
4. All conversion logic is pure functions with full test coverage
5. Categories preserved from source data for filtering
6. Duplicates flagged for manual review, excluded from main database until resolved
7. Search: plain `.filter()` + `.includes()` for substring matching (375 items = <5ms,
   no indexing library needed). Upgrade path: Fuse.js (~7KB) if fuzzy/typo-tolerant
   search is desired later.

## Testing Strategy

### TDD: Red/Green/Refactor
Write failing test first, then implement. All pure logic has unit tests.

### Unit Tests (Vitest)
- Data cleaner functions (parseDensity, slugify, fixTypos, etc.)
- Conversion math (volumeToMl, mlToGrams, convert)
- Search/filter logic (substring matching, category filtering)
- Database module (item count, lookups, edge cases)

### E2E Tests (Playwright) — Primary UI Validation
Playwright E2E tests are the primary method for validating UI behavior.
Every user-facing feature must have E2E coverage before it's considered done.

Key E2E scenarios:
- Search: type partial term ("flour"), verify all matching items appear
- Search: type exact name, select item, verify selection
- Conversion: select food + measure + quantity, verify gram output
- Conversion: change quantity, verify result updates
- Conversion: switch measure (cup → tbsp), verify result changes
- Range display: select range-density food, verify min/max shown
- Category filter: filter by category, verify list narrows
- Keyboard nav: arrow keys + enter in search dropdown
- Empty/error states: no results, zero quantity

## Data Source
food-density-precleaned.txt contains ~375 food density values (g/ml)
from various sources (ASI, KEN, RC, USDA, etc.). The PSV was AI-generated
from this raw file and verified with scripts/verify-psv.js (375/375 match).
