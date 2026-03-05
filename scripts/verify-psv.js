#!/usr/bin/env node

// Verify that food-density.psv accurately represents the raw data in food-density-precleaned.txt
// Checks: density values match, food names match, no entries missing/added

const { readFileSync } = require('fs');
const { resolve } = require('path');
const ROOT = resolve(__dirname, '..');

const rawText = readFileSync(resolve(ROOT, 'food-density-precleaned.txt'), 'utf8');
const psvText = readFileSync(resolve(ROOT, 'food-density.psv'), 'utf8');

// --- Parse the PSV file ---
const psvLines = psvText.split('\n').filter(l => l.trim());
const psvHeader = psvLines[0];
const psvEntries = psvLines.slice(1).map((line, i) => {
  const parts = line.split('|');
  return {
    lineNum: i + 2,
    category: parts[0],
    name: parts[1],
    density: parts[2],
    specificGravity: parts[3] || '',
    source: parts[4],
  };
});

// --- Parse the raw file ---
// Strategy: extract all density-bearing lines from raw, handling multi-line entries and page headers

const rawLines = rawText.split('\n');

// Page header pattern: a bare number line followed by "Food name and description"
function isPageHeaderStart(lines, i) {
  return /^\d+$/.test(lines[i]?.trim()) &&
    lines[i + 1]?.trim() === 'Food name and description Density in g/ml';
}

// Category-only lines (no density value)
const CATEGORIES = [
  'Tubers and products', 'Nuts and seeds', 'Fruits', 'Vegetables',
  'Legumes', 'Herbes and spices', 'Fish and fish products',
  'Egg and egg products', 'Meat and meat products', 'Snacks',
  'Sweets', 'Miscellaneous foods', 'Soups', 'Mixed dishes'
];

function isCategoryLine(line) {
  return CATEGORIES.includes(line.trim());
}

// Density pattern: a decimal or integer number, optionally a range
const DENSITY_RE = /(\d+\.?\d*(?:-\d+\.?\d*)?)/;

// Full entry line: food name, then density (+ optional specific gravity), then source at end
// We parse from the right: find the source code suffix, then work backwards for density
const KNOWN_SOURCES_RE = /\s+(ASI\s*x?|KEN\s*x?|RC|TB|USDA\s*x?|FNDDS\s*4\.1|S&W|CSG\s*x?|CG\s*x?|UK\s*6\s*th)\s*$/;

function parseEntryLine(text) {
  const sourceMatch = text.match(KNOWN_SOURCES_RE);
  if (!sourceMatch) return null;

  const source = sourceMatch[1].trim();
  const beforeSource = text.slice(0, sourceMatch.index).trim();

  // From beforeSource, the last number(s) are density (and optional specific gravity)
  // Match: name ... density [specificGravity]
  const numMatch = beforeSource.match(/^(.+?)\s+(\d+\.?\d*(?:-\d+\.?\d*)?)\s+(\d+\.\d+)\s*$/) ||
                   beforeSource.match(/^(.+?)\s+(\d+\.?\d*(?:-\d+\.?\d*)?)\s*$/);
  if (!numMatch) return null;

  return {
    name: numMatch[1].trim(),
    density: numMatch[2],
    specificGravity: numMatch[3] || '',
    source: source.replace(/\s*x$/, '').trim(),
  };
}

// For checking if a line is a complete entry
function isCompleteLine(text) {
  return parseEntryLine(text.trim()) !== null;
}

// Step 1: Remove file header (lines 1-5, 0-indexed 0-4, plus blank line 5)
let dataLines = [];
let i = 6; // skip first 6 lines (header block)

// Step 2: Filter out page headers and category lines, join multi-line entries
while (i < rawLines.length) {
  const line = rawLines[i];

  // Skip page headers (9 lines: page number + 6 header lines + "Version" + "2")
  if (isPageHeaderStart(rawLines, i)) {
    i += 9;
    continue;
  }

  // Skip category-only lines
  if (isCategoryLine(line)) {
    i++;
    continue;
  }

  // Skip blank lines
  if (!line.trim()) {
    i++;
    continue;
  }

  dataLines.push({ text: line, rawLineNum: i + 1 }); // 1-indexed
  i++;
}

// Step 3: Reassemble multi-line entries
const assembledLines = [];
let buffer = null;

for (const dl of dataLines) {
  const trimmed = dl.text.trim();

  if (buffer) {
    // We're accumulating a multi-line entry
    buffer.text += ' ' + trimmed;
    buffer.endLineNum = dl.rawLineNum;

    if (isCompleteLine(buffer.text)) {
      assembledLines.push(buffer);
      buffer = null;
    }
    continue;
  }

  if (isCompleteLine(trimmed)) {
    assembledLines.push({ text: trimmed, rawLineNum: dl.rawLineNum, endLineNum: dl.rawLineNum });
  } else {
    // Start of a multi-line entry
    buffer = { text: trimmed, rawLineNum: dl.rawLineNum, endLineNum: dl.rawLineNum };
  }
}

if (buffer) {
  console.warn(`WARNING: Unresolved multi-line buffer at raw line ${buffer.rawLineNum}: "${buffer.text}"`);
}

// Step 4: Parse each assembled line to extract name + density
const rawEntries = [];
for (const al of assembledLines) {
  const parsed = parseEntryLine(al.text);
  if (parsed) {
    rawEntries.push({
      rawLineNum: al.rawLineNum,
      endLineNum: al.endLineNum,
      name: parsed.name,
      density: parsed.density,
      specificGravity: parsed.specificGravity,
      source: parsed.source,
      fullText: al.text,
    });
  } else {
    console.warn(`WARNING: Could not parse assembled line (raw line ${al.rawLineNum}): "${al.text}"`);
  }
}

// --- Compare ---
console.log(`\n=== Verification Report ===`);
console.log(`PSV entries: ${psvEntries.length}`);
console.log(`Raw entries: ${rawEntries.length}`);
console.log('');

let errors = 0;
let warnings = 0;

// Compare entry by entry (both should be in the same order)
const maxLen = Math.max(psvEntries.length, rawEntries.length);

for (let j = 0; j < maxLen; j++) {
  const psv = psvEntries[j];
  const raw = rawEntries[j];

  if (!psv && raw) {
    console.error(`ERROR [raw line ${raw.rawLineNum}]: Entry in raw but MISSING from PSV: "${raw.name}" density=${raw.density}`);
    errors++;
    continue;
  }
  if (psv && !raw) {
    console.error(`ERROR [psv line ${psv.lineNum}]: Entry in PSV but MISSING from raw: "${psv.name}" density=${psv.density}`);
    errors++;
    continue;
  }

  // Compare density values
  if (psv.density !== raw.density) {
    console.error(`ERROR [psv line ${psv.lineNum}, raw line ${raw.rawLineNum}]: DENSITY MISMATCH for "${psv.name}": PSV=${psv.density} vs RAW=${raw.density}`);
    errors++;
  }

  // Compare specific gravity (if present in either)
  if (psv.specificGravity && raw.specificGravity && psv.specificGravity !== raw.specificGravity) {
    console.error(`ERROR [psv line ${psv.lineNum}, raw line ${raw.rawLineNum}]: SPECIFIC GRAVITY MISMATCH for "${psv.name}": PSV=${psv.specificGravity} vs RAW=${raw.specificGravity}`);
    errors++;
  }

  // Compare food names (normalize whitespace for comparison)
  const psvName = psv.name.replace(/\s+/g, ' ').trim();
  const rawName = raw.name.replace(/\s+/g, ' ').trim();
  if (psvName !== rawName) {
    // Check if it's a minor difference (the PSV may have cleaned up multi-line joins)
    // Only warn if the names are substantially different
    const psvWords = psvName.toLowerCase().split(/\W+/).filter(Boolean);
    const rawWords = rawName.toLowerCase().split(/\W+/).filter(Boolean);
    const allRawInPsv = rawWords.every(w => psvWords.includes(w));
    const allPsvInRaw = psvWords.every(w => rawWords.includes(w));

    if (!allRawInPsv || !allPsvInRaw) {
      console.warn(`WARNING [psv line ${psv.lineNum}, raw line ${raw.rawLineNum}]: Name difference:\n  PSV: "${psvName}"\n  RAW: "${rawName}"`);
      warnings++;
    }
  }
}

console.log('');
console.log(`=== Summary ===`);
console.log(`Errors: ${errors}`);
console.log(`Warnings: ${warnings}`);
console.log(`Total entries compared: ${Math.min(psvEntries.length, rawEntries.length)}`);

if (errors === 0 && warnings === 0) {
  console.log('\n✓ All entries match!');
}

process.exit(errors > 0 ? 1 : 0);
