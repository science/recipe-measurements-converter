# Recipe Measurements Converter

A standalone webapp that converts recipe measurements to grams using food density data for 400 USDA-sourced cooking ingredients across 17 categories.

**Live:** [science.github.io/recipe-measurements-converter](https://science.github.io/recipe-measurements-converter/)

## Features

- **400 ingredients** from USDA cooking density data (via OnlineConversion.com)
- **9 measures**: 6 volume (cup, tbsp, tsp, fl oz, ml, L) + 3 weight (oz, lb, kg)
- **17 food categories** with filtering
- **Bulk Converter** — paste an entire recipe, get grams for every ingredient
  - Stage 1: LLM parses recipe text into structured ingredients (OpenAI, ~$0.0001/recipe)
  - Stage 2: Pre-computed embeddings match parsed names to the ingredient database (no API call)
  - Converted recipe preserves original ingredient names from the source recipe
  - Requires an OpenAI API key (stored in browser only)
- Search with commonality-ranked results (most common ingredients first)
- Friendly display names for common items (e.g., "Butter, without salt" → "Butter, unsalted")
- Accessible keyboard navigation (Tab, Arrow keys, Enter/Space, Escape)
- Zero-server deployment (static site via SvelteKit)

## Quick Start

```bash
npm install
npm run dev
```

## Development

```bash
npm test                    # Unit tests (Vitest)
npm run test:e2e            # E2E tests (Playwright)
npm run build               # Production build
npm run clean-data          # Regenerate food-density.json from OC-USDA source
npm run generate-embeddings # Rebuild food-embeddings.json (requires OPENAI_API_KEY)
```

## How It Works

For **volume measures** (cup, tbsp, etc.), the conversion uses food density:
```
grams = quantity × ml_per_unit × density_g_per_ml
```

For **weight measures** (oz, lb, kg), density is not needed:
```
grams = quantity × grams_per_unit
```

## Data Source

All 400 ingredients come from [OnlineConversion.com](https://www.onlineconversion.com/)'s USDA-sourced cooking density data. All density values are in g/ml. Commonality scores (1–10) rank search results so everyday ingredients appear first.

## Data Pipeline

```
food-density-onlineconversion.json ─→ clean-data.ts ─→ food-density.json ─→ bundled in app
```

Single source, no merge. Run `npm run clean-data` to rebuild.

## License

Apache 2.0
