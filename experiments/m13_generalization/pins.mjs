// ==========================================================
// M13 — pins: the SHA-256 of every file the run executes, found by following its static imports
// ==========================================================
//   node experiments/m13_generalization/pins.mjs           writes PINS.json
//   node experiments/m13_generalization/pins.mjs --check   exits 1 unless PINS.json matches the files on disk
// The closure starts at run_m13.mjs and follows every relative `import ... from '...'` / `export ... from '...'`
// (node: built-ins are not files of the repository). The agents' code (cognitive/mind, cognitive/agents,
// cognitive/testbed), task E5, the recorder and M13's own modules are all in it. The graph bank and the structural
// record are pinned beside them. The driver refuses to run unless the closure and every hash equal PINS.json.
// ==========================================================
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
// Content hash with CRLF read as LF: the agents' code has no exact-bytes rule, so a checkout with core.autocrlf=true
// writes CRLF. That conversion is not a change of the code; any change of its content is.
const sha = (b) => crypto.createHash('sha256').update(Buffer.from(b.toString('utf8').replace(/\r\n/g, '\n'), 'utf8')).digest('hex');
const rel = (p) => path.relative(ROOT, p).split(path.sep).join('/');
const IMPORT = /(?:^|[\s;])(?:import|export)\s[^'"`]*?from\s*['"]([^'"]+)['"]|(?:^|[\s;])import\s*['"]([^'"]+)['"]/gm;
export const ENTRY = path.join(HERE, 'run_m13.mjs');
// Pinned beside the closure: the frozen data, and the two scripts the driver runs as child processes (not imports).
export const DATA = Object.freeze(['experiments/m13_generalization/graph_bank.json', 'experiments/m13_generalization/structure.json', 'experiments/m13_generalization/make_bank.mjs', 'scripts/test.mjs']);

export function closure(entry = ENTRY) {
  const seen = new Set(), stack = [entry];
  while (stack.length) {
    const f = stack.pop();
    if (seen.has(f)) continue;
    seen.add(f);
    const text = fs.readFileSync(f, 'utf8');
    for (const m of text.matchAll(IMPORT)) {
      const spec = m[1] ?? m[2];
      if (!spec.startsWith('.')) continue;
      stack.push(path.resolve(path.dirname(f), spec));
    }
  }
  return [...seen].map(rel).sort();
}

export function pinsNow() {
  const files = [...closure(), ...DATA].sort();
  return Object.fromEntries(files.map((f) => [f, sha(fs.readFileSync(path.join(ROOT, f)))]));
}

/** Differences between PINS.json and the files on disk ([] when they agree). */
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
  fs.writeFileSync(path.join(HERE, 'PINS.json'), JSON.stringify({ note: 'SHA-256 (content, CRLF read as LF) of every file run_m13.mjs executes (static import closure), of the frozen data and of the two scripts it runs; checked by the driver before the run', files }, null, 1) + '\n');
  console.log(`PINS.json: ${Object.keys(files).length} files`);
}
