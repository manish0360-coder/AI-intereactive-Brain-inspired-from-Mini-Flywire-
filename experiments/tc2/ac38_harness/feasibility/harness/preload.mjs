// ==========================================================
// AC38 limited feasibility study — hash-locked in-memory transformation with selectable variants
// ==========================================================
// Derived from ../../preload.mjs at 3dc0082, which stays unchanged.  Differences: several variants
// may be selected at once, a variant may append a helper to a module, two selected rewrites may
// never touch one line, and the expected counts come from a profile fixed in this file and chosen
// by the table's schema.  Nothing on disk changes, and any mismatch refuses.
// ==========================================================
import crypto from 'node:crypto';
import fs from 'node:fs';
import { registerHooks } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MUTANTS = ['N-0', 'MV-2a', 'MV-2b', 'MV-2c', 'MV-3', 'MV-4', 'MV-5a', 'MV-5b', 'MV-6a', 'MV-6b', 'MV-6c', 'MV-7a', 'MV-7b'];
const ONE_EACH = Object.fromEntries(MUTANTS.map((m) => [m, 1]));
const HELPERS = { 'MV-2a': 1, 'MV-2b': 1, 'MV-2c': 1 };
export const PROFILES = Object.freeze({
  'tc2/ac38.feasibility_table/1': Object.freeze({ base: { wrapper: 1, probe: 5, let: 6 }, variantRewrites: { bridge_off: 1, site_probes: 29, ...ONE_EACH }, variantAppends: HELPERS }),
  'tc2/ac38.rehearsal_table/1': Object.freeze({ base: { wrapper: 1, probe: 1, let: 1 }, variantRewrites: { bridge_off: 1, ...ONE_EACH }, variantAppends: HELPERS }),
});
const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');
const refuse = (m) => { throw new Error(`AC38 REFUSED: ${m}`); };

const IN = JSON.parse(process.argv[2]);
const tableBytes = fs.readFileSync(IN.tablePath);
if (sha256(tableBytes) !== IN.tableSha256) refuse('the rewrite table does not match its pinned hash');
const TABLE = JSON.parse(tableBytes.toString('utf8'));
const PROFILE = PROFILES[TABLE.schema];
if (!PROFILE) refuse(`unknown table schema ${TABLE.schema}`);
const TREE = path.resolve(IN.tree);

const VARIANTS = [...new Set(IN.variants ?? [])];
for (const v of VARIANTS) {
  if (!(v in PROFILE.variantRewrites)) refuse(`variant ${v} is not known`);
  if (!TABLE.rewrites.some((r) => r.variant === v)) refuse(`variant ${v} has no rewrite in the table`);
}
const selected = TABLE.rewrites.filter((r) => !r.variant || VARIANTS.includes(r.variant));
const seen = new Set();
for (const r of selected) { const k = `${r.file}:${r.line}`; if (seen.has(k)) refuse(`two rewrites on ${k}`); seen.add(k); }
const byFile = new Map();
for (const r of selected) { if (!byFile.has(r.file)) byFile.set(r.file, []); byFile.get(r.file).push(r); }
const helpers = new Map();
for (const v of VARIANTS) for (const [file, h] of Object.entries(TABLE.variantAppends?.[v] ?? {})) { if (!helpers.has(file)) helpers.set(file, []); helpers.get(file).push({ variant: v, code: h.code }); }
const targets = new Set([...byFile.keys(), ...Object.keys(TABLE.appends), ...helpers.keys()]);
const loaded = new Set();
const applied = { wrapper: 0, probe: 0, let: 0, append: 0 };
const variantRewrites = Object.fromEntries(VARIANTS.map((v) => [v, 0]));
const variantAppends = Object.fromEntries(VARIANTS.map((v) => [v, 0]));
const transformed = {};

registerHooks({
  load(url, context, nextLoad) {
    if (!url.startsWith('file:')) return nextLoad(url, context);
    const rel = path.relative(TREE, fileURLToPath(url.split('?')[0]));
    if (rel.startsWith('..') || path.isAbsolute(rel)) return nextLoad(url, context);
    const file = rel.split(path.sep).join('/');
    const bytes = fs.readFileSync(path.join(TREE, rel));
    if (!(file in TABLE.sources)) refuse(`tree module ${file} is not in the rewrite table`);
    if (sha256(bytes) !== TABLE.sources[file]) refuse(`source hash mismatch on ${file}`);
    if (loaded.has(file)) refuse(`module ${file} loaded twice`);
    loaded.add(file);
    if (!targets.has(file)) return nextLoad(url, context);
    const lines = bytes.toString('utf8').split('\n');
    const count = lines.length;
    for (const r of byFile.get(file) ?? []) {
      if (lines[r.line - 1] !== r.anchor) refuse(`anchor mismatch at ${file}:${r.line}`);
      lines[r.line - 1] = r.replace;
      if (r.variant) variantRewrites[r.variant]++; else applied[r.kind]++;
    }
    if (lines.length !== count) refuse(`line count changed in ${file}`);
    if (TABLE.appends[file]) { lines.push(TABLE.appends[file]); applied.append++; }
    for (const h of helpers.get(file) ?? []) { lines.push(h.code); variantAppends[h.variant]++; }
    const source = lines.join('\n');
    transformed[file] = sha256(source);
    return { format: 'module', source, shortCircuit: true };
  },
});

const handlers = { seal: null, let: null, probe: null, site: null, mutant: null };
globalThis.__AC38_SEAL__ = (inner, reason) => (handlers.seal ? handlers.seal(inner, reason) : inner(reason));
globalThis.__AC38_LET__ = (name, site) => { if (handlers.let) handlers.let(name, site); };
globalThis.__AC38_PROBE__ = (name) => { if (handlers.probe) handlers.probe(name); };
globalThis.__AC38_SITE__ = (site, target) => { if (handlers.site) handlers.site(site, target); };
globalThis.__AC38_MUTANT__ = (id, sealed) => (handlers.mutant ? handlers.mutant(id, sealed) : undefined);
Object.defineProperty(globalThis, '__AC38_CTL__', { value: Object.freeze({
  handlers,
  table: TABLE,
  preloadSha256: sha256(fs.readFileSync(fileURLToPath(import.meta.url))),
  status: () => ({ applied: { ...applied }, variants: VARIANTS, variantRewrites: { ...variantRewrites }, variantAppends: { ...variantAppends }, loaded: loaded.size, targets: targets.size, transformed: { ...transformed } }),
  assertComplete() {
    for (const t of targets) if (!loaded.has(t)) refuse(`instrumentation target ${t} was never loaded`);
    for (const [k, v] of Object.entries(PROFILE.base)) if (applied[k] !== v) refuse(`expected ${v} ${k} rewrites, applied ${applied[k]}`);
    if (applied.append !== Object.keys(TABLE.appends).length) refuse('not every accessor was appended');
    for (const v of VARIANTS) {
      if (variantRewrites[v] !== PROFILE.variantRewrites[v]) refuse(`expected ${PROFILE.variantRewrites[v]} variant rewrites for ${v}, applied ${variantRewrites[v]}`);
      const want = PROFILE.variantAppends[v] ?? 0;
      if (variantAppends[v] !== want) refuse(`expected ${want} variant appends for ${v}, applied ${variantAppends[v]}`);
    }
  },
}) });
