# Recipe Measurements Converter

A standalone webapp that converts recipe volume measurements (cups, tablespoons, teaspoons, etc.) to grams using food density data for ~375 common ingredients.

## Features

- Search ingredients by name (substring matching across 375+ foods)
- Convert between 6 volume measures and grams
- Density ranges shown when data includes min/max values
- Filter by food category (14 categories)
- Zero-server deployment (static site)

## Quick Start

```bash
npm install
npm run dev
```

## Development

```bash
npm test          # Unit tests (Vitest)
npm run test:e2e  # E2E tests (Playwright)
npm run build     # Production build
npm run clean-data # Regenerate food-density.json from PSV
```

## Data Source

Food density data (~375 items) sourced from ASI, KEN, RC, USDA, FNDDS, and other references. See `food-density-precleaned.txt` for the original data.

## License

Apache 2.0
