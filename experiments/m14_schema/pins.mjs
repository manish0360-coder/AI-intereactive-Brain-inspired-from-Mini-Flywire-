// ==========================================================
// M14 — pins: the SHA-256 of every file the run executes, found by following its static imports
// ==========================================================
//   node experiments/m14_schema/pins.mjs           writes PINS.json
//   node experiments/m14_schema/pins.mjs --check   exits 1 unless PINS.json matches the files on disk
// The closure starts at run_m14.mjs and follows every relative import / export-from (node: built-ins are not
// repository files): the adopted agent and model v6, the schema learner and agent, task E6, the environment, the
// statistics and M14's own modules. Pinned beside them: the admission record (it fixes the margin and n) and the two
// test runners the driver executes as child processes. Adapted from experiments/m13_generalization/pins.mjs.
// Unlike M13, no suite test asserts these pins: the driver checks them before the run, and the independent check after
// it, so later work on other files is not blocked by a closed study.
// ==========================================================
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
// Content hash with CRLF read as LF (the agents' code has no exact-bytes rule; see M13's pins.mjs).
const sha = (b) => crypto.createHash('sha256').update(Buffer.from(b.toString('utf8').replace(/\r\n/g, '\n'), 'utf8')).digest('hex');
const rel = (p) => path.relative(ROOT, p).split(path.sep).join('/');
const IMPORT = /(?:^|[\s;])(?:import|export)\s[^'"`]*?from\s*['"]([^'"]+)['"]|(?:^|[\s;])import\s*['"]([^'"]+)['"]/gm;
export const ENTRY = path.join(HERE, 'run_m14.mjs');
export const DATA = Object.freeze(['experiments/m14_schema/admission/admission.json', 'scripts/test_all.mjs', 'scripts/test.mjs']);

export function closure(entry = ENTRY) {
  const seen = new Set(), stack = [entry];
  while (stack.length) {
    const f = stack.pop();
    if (seen.has(f)) continue;
    seen.add(f);
    for (const m of fs.readFileSync(f, 'utf8').matchAll(IMPORT)) {
      const spec = m[1] ?? m[2];
      if (spec.startsWith('.')) stack.push(path.resolve(path.dirname(f), spec));
    }
  }
  return [...seen].map(rel).sort();
}

export function pinsNow() {
  const files = [...closure(), ...DATA].sort();
  return Object.fromEntries(files.map((f) => [f, sha(fs.readFileSync(path.join(ROOT, f)))]));
}

export function pinDifferences() {
  const file = path.join(HERE, 'PINS.json');
  if (!fs.existsSync(file)) return ['PINS.json is missing'];
  const frozen = JSON.parse(fs.readFileSync(file, 'utf8')).files, now = pinsNow(), diff = [];
  for (const f of new Set([...Object.keys(frozen), ...Object.keys(now)])) {
    if (!(f in now)) diff.push(`${f}: pinned but no longer imported`);
    else if (!(f in frozen)) diff.push(`${f}: imported but not pinned`);
    else if (frozen[f] !== now[f]) diff.push(`${f}: hash ${now[f].slice(0, 12)} differs from the pinned ${frozen[f].slice(0, 12)}`);
  }
  return diff;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--check')) {
    const d = pinDifferences();
    console.log(d.length ? `PINS MISMATCH:\n${d.join('\n')}` : 'PINS.json matches every pinned file');
    process.exit(d.length ? 1 : 0);
  }
  const files = pinsNow();
  fs.writeFileSync(path.join(HERE, 'PINS.json'), JSON.stringify({ note: 'SHA-256 (content, CRLF read as LF) of every file run_m14.mjs executes (static import closure), of the admission record and of the two test runners it runs; checked by the driver before the run', files }, null, 1) + '\n');
  console.log(`PINS.json: ${Object.keys(files).length} files`);
}
