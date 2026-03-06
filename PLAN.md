# Recipe Measurements Converter — Plan

## Current State

The app is functional with 772 ingredients, 9 measures (volume + weight), multi-source data pipeline, commonality-ranked search, and accessible keyboard navigation. All unit and E2E tests pass.

---

## Planned: LLM Bulk Ingredient Conversion

**Goal**: Paste a full recipe ingredient list, get all measurements converted at once.

### Approach

New route (`/bulk` or `/paste`) with:
1. **Textarea input** — user pastes plain-text ingredient list (e.g., from a recipe)
2. **LLM parsing** — send the list to an LLM (Claude or OpenAI) with a structured output prompt:
   - Extract each line into `{ quantity, unit, ingredient, original_text }`
   - Handle natural language variations: "2 cups flour", "1/2 tsp vanilla", "a pinch of salt", "3 large eggs"
3. **Matching** — fuzzy-match parsed ingredient names against the 772-item database
   - Exact substring match first, then consider Fuse.js for fuzzy fallback
   - Show match confidence; let user correct mismatches
4. **Batch conversion** — run each matched item through `convert()` and display results table
5. **API key handling** — user provides their own API key (stored in localStorage, never sent to a server)
   - Or: use a lightweight proxy with rate limiting if we add a server component

### UX Flow
```
[Paste ingredient list] → [Parse with LLM] → [Review matches] → [See all conversions]
```

### Key Decisions to Make
- Which LLM provider(s) to support (Claude API, OpenAI, both?)
  - Start with OpenAI. Use OpenAI's JS SDK: incorporate that into the app
  - You can refer to the ~/dev/book-translate project for a simple example of API management and SDK use. You can borrow code from that project if you want or just use it as reference.
- Client-side API calls vs. lightweight server proxy
  - Client side API calls, with API keys being user-provided and stored securely in Browser LocalStorage
  - Create a simple settings menu for setting up the LLM interaction: provide the API key, choose the model to use (default to gpt-5-mini)
- How to handle ingredients not in the database (show "not found" vs. ask LLM to estimate density)
  - "Not found" for ingredients which are not found in the DB.
  - However, fuzzy matching for intention is allowed by the LLM. So in a recipe "70% dark chocolate baking squares" should be matched by the LLM to "Chocolate, chunk" -- so "not found" is a grey subject, and the LLM must be given good latitude to make probablistic guesses. Consider whether we should build a RAG for the user in OpenAI for our ingredient database and just make calls to that, and set a "cosine radius" match for an ingredient, instead of having a full LLM do the matching.
- Structured output format (tool_use / function calling vs. JSON mode)
  - Analyze these options during further planning and make recommendations.

### Implementation Steps
1. Design the structured output schema for ingredient parsing
2. Build the LLM integration module (API call + response parsing)
3. Build fuzzy matching between LLM output and food database
4. Build the bulk conversion UI (textarea → results table)
5. Add review/correction step for ambiguous matches
6. E2E tests for the full flow (mock LLM responses)

---

## Planned: Density & Metadata Display

**Goal**: Show users the density value and source used for each conversion, increasing transparency and trust.

### Features
- After selecting a food and measure, display:
  - Density value used (e.g., "0.521 g/ml")
  - Density range if applicable (e.g., "0.38–0.42 g/ml")
  - Data source tag (e.g., "USDA", "ASI", "OC-USDA", "HAP")
  - Category
- Collapsible or secondary display so it doesn't clutter the primary conversion result
- Useful for bakers who want to verify or cross-reference density values

### Implementation Steps
1. Add `data-testid="density-detail"` section to ConversionResult or +page.svelte
2. Show density avg (and range if min ≠ max), source, category
3. Only display for volume measures (weight measures don't use density)
4. Style as secondary/muted info below the main grams result
5. E2E test: select food, verify density/source displayed

---

## Planned: Downloadable Density Data

**Goal**: Let users download the full density dataset (open data principle).

### Features
- Link/button on the page: "Download density data (JSON)"
- Serves `food-density.json` directly (already generated, 772 items)
- Brief description of the data format and fields
- Consider also offering CSV export for spreadsheet users

### Implementation Steps
1. Add download link to the UI (footer or info section)
2. Point to `/food-density.json` (copy to static/ during build, or serve from lib/data/)
3. Add a small `/data` or `/about` section describing the dataset schema
4. Optional: add a CSV export button (generate client-side from JSON)
5. E2E test: verify download link exists and points to valid JSON

---

## File Structure

```
recipe-measurements-converter/
  CLAUDE.md                              # Developer reference
  PLAN.md                               # This file
  README.md                             # User-facing docs
  LICENSE                               # Apache 2.0
  package.json
  svelte.config.js                      # SvelteKit + static adapter
  vite.config.ts
  food-density-precleaned.txt           # Raw source data
  food-density.psv                      # Primary cleaned data (357 items)
  food-density-onlineconversion.json    # Supplemental: 400 USDA items
  food-density-hapman.json              # Supplemental: 23 curated items
  food-density-hapman-raw.json          # Raw Hapman scrape (1685 items)
  scripts/
    clean-data.ts                       # Multi-source merge → JSON
    clean-data.test.ts
    verify-psv.js                       # Raw vs PSV verification
    scrape-onlineconversion.ts          # One-time scraper
    scrape-hapman.ts                    # One-time scraper
    generate-scores.ts                  # One-time commonality scoring
  src/
    routes/
      +page.svelte                      # Main converter page
      +layout.svelte                    # App layout
    lib/
      data/
        types.ts                        # FoodItem, DensityValue, FoodDatabase
        food-density.json               # Generated (772 items, 25 categories)
        food-database.ts                # Search, filter, lookup
        food-database.test.ts
        commonality-scores.json         # Per-item scores (1-10)
      conversion.ts                     # Volume + weight → grams
      conversion.test.ts
      measures.ts                       # Discriminated union measures
      measures.test.ts
      components/
        FoodSearch.svelte               # Combobox with keyboard nav
        ConversionResult.svelte
        MeasureSelector.svelte          # Volume/Weight optgroups
  tests-e2e/
    search.spec.ts
    conversion.spec.ts
    weight-conversion.spec.ts
    keyboard-nav.spec.ts
    edge-cases.spec.ts
```
