// Runs the whole test suite: every file scripts/test.mjs runs, plus the test files added after M13.
// scripts/test.mjs is left as it is: M13 pinned it (experiments/m13_generalization/PINS.json), and its suite test
// "M13 PINS" requires it unchanged. This runner reads its LATER_GATES list from the file itself, so the two lists can
// never drift, and appends the later files.
//   node scripts/test_all.mjs        exit 0 iff every test passes
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TEST_FILES } from '../cognitive/tests/run_all.mjs';
import { runTestFiles } from '../cognitive/tests/run_list.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const m = fs.readFileSync(path.join(HERE, 'test.mjs'), 'utf8').match(/const LATER_GATES = \[([^\]]*)\]/);
if (!m) throw new Error('scripts/test.mjs has no LATER_GATES list');
const LATER_GATES = [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
const AFTER_M13 = Object.freeze(['test_m14_schema.mjs']);
const files = [...TEST_FILES, ...LATER_GATES, ...AFTER_M13];

const r = await runTestFiles(files);
for (const f of files) {
  const rows = r.results.filter((x) => x.file === f);
  console.log(`${f.padEnd(22)} ${rows.filter((x) => x.pass).length}/${rows.length}`);
}
for (const f of r.failed) console.log(`FAIL ${f.file} :: ${f.name} :: ${f.error}`);
console.log(`TOTAL ${r.passed}/${r.total}`);
process.exit(r.failed.length ? 1 : 0);
