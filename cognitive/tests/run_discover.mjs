// ==========================================================
// Test discovery (M15): CF-01's list (run_all.mjs, in its order), then every other test_*.mjs file in this directory in
// name order. A module of its own, with no top-level await, so that a test file can import it while the suite runs.
// ==========================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TEST_FILES } from './run_all.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));

export function discoveredFiles() {
  const found = fs.readdirSync(HERE).filter((f) => /^test_[A-Za-z0-9_]+\.mjs$/.test(f)).sort();
  return [...TEST_FILES, ...found.filter((f) => !TEST_FILES.includes(f))];
}
