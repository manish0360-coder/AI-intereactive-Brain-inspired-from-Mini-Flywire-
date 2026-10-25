// ==========================================================
// CREDIT-1 — census of the LEARN-0 block-L training stores (READ-ONLY; design evidence, not an experiment)
// ==========================================================
//   node experiments/credit1/tools/census_learn0_stores.mjs [--run <run_blockL dir>] [--out <json>]
// For every persisted relational store of the 360 map-off training exports (legacy credit site):
//   * edge share   - share of keys (and of absolute value mass) whose pair is a graph edge, i.e. readable by the scorer as a
//                    legal candidate from the key's first node;
//   * lag classes  - the I7 provenance classes already computed by LEARN-0 (controls.json): LAG1 = the pair occurs as two
//                    consecutive positions of the session (an executed move), LAG2 = it occurs only two positions apart,
//                    SELF = a self pair. Minimal lag wins (experiments/learn0/provenance.mjs).
// Input: the git-ignored LEARN-0 raw run directory (verify it first with experiments/learn0/verify_archive_blockL.mjs --dir).
// Runs no agent; writes nothing unless --out is given.
// ==========================================================
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..', '..', '..');
const arg = (n) => { const i = process.argv.indexOf(n); return i === -1 ? null : process.argv[i + 1]; };
const RUN = arg('--run') || path.join(ROOT, 'experiments', 'learn0', 'data', 'run_blockL');
const OUT = arg('--out');
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');

const edges = JSON.parse(fs.readFileSync(path.join(ROOT, 'connections.json'), 'utf8'));
const E = new Set(); for (const e of edges) { E.add(`${Number(e.from)}|${Number(e.to)}`); E.add(`${Number(e.to)}|${Number(e.from)}`); }
const isEdge = (a, b) => E.has(`${Number(a)}|${Number(b)}`);
const manifest = JSON.parse(fs.readFileSync(path.join(RUN, 'MANIFEST.json'), 'utf8'));
const controlsBytes = fs.readFileSync(path.join(RUN, 'controls.json'));
const controls = JSON.parse(controlsBytes.toString('utf8')).controls;
const dir = path.join(RUN, 'brains');
const files = fs.readdirSync(dir).filter(f => /^T_w\d+\.json$/.test(f)).sort();

const edge = {}, lag = {}, perWorld = { QedgeKeyShare: [], QlagTwoShare: [] };
const addE = (s, ed, mass) => { const a = (edge[s] ||= { keys: 0, edgeKeys: 0, mass: 0, edgeMass: 0 }); a.keys++; a.mass += mass; if (ed) { a.edgeKeys++; a.edgeMass += mass; } };
for (const f of files) {
  const w = f.match(/\d+/)[0];
  const b = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  for (const s of ['rewards', 'penalties', 'signals', 'curiosity', 'confidence']) for (const [k, v] of Object.entries(b[s] || {})) { const [x, y] = k.split('->'); addE(s, isEdge(x, y), Math.abs(Number(v) || 0)); }
  let qe = 0, qn = 0;
  for (const [k, v] of Object.entries(b.Q || {})) { const m = /^(\d+)#(\d+)->(\d+)$/.exec(k); if (!m) throw new Error(`unparsed Q key ${k} in ${f}`); const ed = isEdge(m[1], m[3]); addE('Q', ed, Math.abs(Number(v) || 0)); qn++; if (ed) qe++; }
  if (qn) perWorld.QedgeKeyShare.push(qe / qn);
  for (const [x, ys] of Object.entries(b.transitions || {})) for (const [y, v] of Object.entries(ys)) addE('transitions', isEdge(x, y), Math.abs(Number(v) || 0));
  const c = controls[w];
  if (!c || !c.provenance || c.provenance.ok !== true) throw new Error(`world ${w}: no passing provenance control`);
  for (const [s, cls] of Object.entries(c.provenance.byComponent || {})) { const t = (lag[s] ||= {}); for (const [k, v] of Object.entries(cls)) t[k] = (t[k] || 0) + v; }
  const q = c.provenance.byComponent.Q || {}; const n = Object.values(q).reduce((a, v) => a + v, 0); if (n) perWorld.QlagTwoShare.push((q.LAG2 || 0) / n);
}
const q = (xs, p) => { const s = xs.slice().sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
const r3 = (x) => Math.round(x * 1000) / 1000;
const stores = [...new Set([...Object.keys(edge), ...Object.keys(lag)])];
const table = stores.map(s => { const e = edge[s], l = lag[s] || {}; const n = Object.values(l).reduce((a, v) => a + v, 0);
  return { store: s, keys: e ? e.keys : null, edgeKeyShare: e ? r3(e.edgeKeys / e.keys) : null, edgeMassShare: e && e.mass ? r3(e.edgeMass / e.mass) : null,
    LAG1: l.LAG1 || 0, LAG2: l.LAG2 || 0, SELF: l.SELF || 0, lagTwoShare: n ? r3((l.LAG2 || 0) / n) : null }; });
const out = { schema: 'credit1/1.store-census', source: { run: path.relative(ROOT, RUN), manifestDigest: manifest.digest, controlsSha256: sha(controlsBytes), trainingExports: files.length },
  table, perWorld: { QedgeKeyShare: { min: r3(q(perWorld.QedgeKeyShare, 0)), median: r3(q(perWorld.QedgeKeyShare, 0.5)), max: r3(q(perWorld.QedgeKeyShare, 1)) },
    QlagTwoShare: { min: r3(q(perWorld.QlagTwoShare, 0)), median: r3(q(perWorld.QlagTwoShare, 0.5)), max: r3(q(perWorld.QlagTwoShare, 1)) } } };
if (OUT) fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(`exports ${files.length}; manifest ${String(manifest.digest).slice(0, 16)}…; controls ${out.source.controlsSha256.slice(0, 16)}…`);
console.log('store'.padEnd(12) + 'keys'.padStart(8) + 'edge-key'.padStart(10) + 'edge-mass'.padStart(11) + 'LAG1'.padStart(8) + 'LAG2'.padStart(8) + 'SELF'.padStart(7) + 'LAG2 share'.padStart(12));
for (const t of table) console.log(t.store.padEnd(12) + String(t.keys ?? '-').padStart(8) + String(t.edgeKeyShare ?? '-').padStart(10) + String(t.edgeMassShare ?? '-').padStart(11) + String(t.LAG1).padStart(8) + String(t.LAG2).padStart(8) + String(t.SELF).padStart(7) + String(t.lagTwoShare ?? '-').padStart(12));
console.log(`per world: Q edge-key share ${JSON.stringify(out.perWorld.QedgeKeyShare)}; Q LAG2 share ${JSON.stringify(out.perWorld.QlagTwoShare)}`);
