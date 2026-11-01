// ==========================================================
// AC38 harness prototype — hash-locked in-memory transformation (test-only, disposable process)
// ==========================================================
// Nothing on disk changes.  Every tree module is checked against the rewrite table before it is
// loaded; each rewrite must find its exact anchor at its exact line, and line numbers are kept.
// Any mismatch refuses, which aborts the process before or during application load.
// ==========================================================
import crypto from 'node:crypto';
import fs from 'node:fs';
import { registerHooks } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const EXPECT = Object.freeze({ wrapper: 1, probe: 5, let: 6 });
const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');
const refuse = (m) => { throw new Error(`AC38 REFUSED: ${m}`); };

const IN = JSON.parse(process.argv[2]);
const tableBytes = fs.readFileSync(IN.tablePath);
if (sha256(tableBytes) !== IN.tableSha256) refuse('the rewrite table does not match its pinned hash');
const TABLE = JSON.parse(tableBytes.toString('utf8'));
const TREE = path.resolve(IN.tree);

const byFile = new Map();
for (const r of TABLE.rewrites) { if (!byFile.has(r.file)) byFile.set(r.file, []); byFile.get(r.file).push(r); }
const targets = new Set([...byFile.keys(), ...Object.keys(TABLE.appends)]);
const loaded = new Set();
const applied = { wrapper: 0, probe: 0, let: 0, append: 0 };

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
      applied[r.kind]++;
    }
    if (lines.length !== count) refuse(`line count changed in ${file}`);
    if (TABLE.appends[file]) { lines.push(TABLE.appends[file]); applied.append++; }
    return { format: 'module', source: lines.join('\n'), shortCircuit: true };
  },
});

const handlers = { seal: null, let: null, probe: null };
globalThis.__AC38_SEAL__ = (inner, reason) => (handlers.seal ? handlers.seal(inner, reason) : inner(reason));
globalThis.__AC38_LET__ = (name, site) => { if (handlers.let) handlers.let(name, site); };
globalThis.__AC38_PROBE__ = (name) => { if (handlers.probe) handlers.probe(name); };
Object.defineProperty(globalThis, '__AC38_CTL__', { value: Object.freeze({
  handlers,
  table: TABLE,
  preloadSha256: sha256(fs.readFileSync(fileURLToPath(import.meta.url))),
  status: () => ({ applied: { ...applied }, loaded: loaded.size, targets: targets.size }),
  assertComplete() {
    for (const t of targets) if (!loaded.has(t)) refuse(`instrumentation target ${t} was never loaded`);
    for (const [k, v] of Object.entries(EXPECT)) if (applied[k] !== v) refuse(`expected ${v} ${k} rewrites, applied ${applied[k]}`);
    if (applied.append !== Object.keys(TABLE.appends).length) refuse('not every accessor was appended');
  },
}) });
