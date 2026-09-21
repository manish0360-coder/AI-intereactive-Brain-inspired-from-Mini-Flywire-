// FS-OQ1-F2-FEAS analysis — raw evidence-population distributions. NO THRESHOLD IS INVENTED:
// every count is reported as a raw number; "material separation from 1" is deliberately not
// operationalised because no specification for it exists.
//
// Two distinct kinds of decision-state coverage are reported, because they answer different
// questions and are easy to conflate:
//   (a) candidate-EDGE evidence  — evidence on the decision edge u->k itself. V2.3 FutureScore for
//       candidate k starts AT k (render/planning.js: explore(start, H, {start})), so this edge is
//       NOT part of k's FutureScore.
//   (b) FS-RELEVANT evidence    — evidence on edges reachable by the V2.3 recursion from k:
//       simple paths seeded {k}, at most H = 3 edges, absorbing at the goal. This is what
//       S-SHADOW would actually exercise.
// The oracle (true p) is used ONLY in the clearly separated staleness diagnostic (section 5).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const env = await import(pathToFileURL(ROOT).href + '/experiments/m7/env.js');
const H = 3;
const conns = JSON.parse(fs.readFileSync(path.join(ROOT, 'connections.json'), 'utf8'));
const adj = new Map();
for (const c of conns) {
  (adj.get(c.from) || adj.set(c.from, []).get(c.from)).push(c.to);
  (adj.get(c.to) || adj.set(c.to, []).get(c.to)).push(c.from);
}

const q = (arr, p) => { if (!arr.length) return null; const b = [...arr].sort((x, y) => x - y); return Number(b[Math.min(b.length - 1, Math.floor(p * b.length))].toFixed(4)); };
const dist = (arr) => arr.length ? `n=${arr.length} min ${q(arr, 0)} p25 ${q(arr, 0.25)} med ${q(arr, 0.5)} p75 ${q(arr, 0.75)} max ${q(arr, 1)}` : 'n=0';

// edges the V2.3 recursion can reach from candidate k (simple, seeded {k}, <= H edges, goal-absorbing)
function fsNeighbourhood(k, goal) {
  const edges = new Set();
  (function walk(v, depth, pathSet) {
    if (v === goal || depth === 0) return;
    for (const w of adj.get(v)) {
      if (pathSet.has(w)) continue;
      edges.add(`${v}->${w}`);
      pathSet.add(w); walk(w, depth - 1, pathSet); pathSet.delete(w);
    }
  })(k, H, new Set([k]));
  return edges;
}

const files = fs.readdirSync(path.join(HERE, 'evidence')).filter((f) => f.endsWith('_hook.json')).sort();
const report = [];
for (const f of files) {
  const R = JSON.parse(fs.readFileSync(path.join(HERE, 'evidence', f), 'utf8'));
  const goal = R.goal;
  const states = env.decisionStates(goal);
  console.log(`\n${'='.repeat(78)}\n  fixture ${R.fixture}  goal ${goal}  decision states ${states.length}\n${'='.repeat(78)}`);
  const neigh = new Map();
  for (const u of states) for (const k of adj.get(u)) neigh.set(`${u}|${k}`, fsNeighbourhood(k, goal));

  const rows = [];
  for (const snap of R.snapshots) {
    const rec = new Map(snap.edges.map(([u, v, a, s]) => [`${u}->${v}`, { a, s, c: (a + 1) / (s + 1) }]));
    const all = [...rec.values()];
    const observed = all.filter((e) => e.a > 0);
    const nonUnit = all.filter((e) => e.s < e.a);            // c_hat > 1 exactly
    const nonUnitKey = (key) => { const e = rec.get(key); return e && e.s < e.a; };

    let dsEdgeObs = 0, dsEdgeNU = 0, dsFsNU = 0, dsDiffer = 0;
    for (const u of states) {
      const cands = adj.get(u);
      if (cands.some((k) => (rec.get(`${u}->${k}`) || {}).a > 0)) dsEdgeObs++;
      if (cands.some((k) => nonUnitKey(`${u}->${k}`))) dsEdgeNU++;
      const footprints = cands.map((k) => [...neigh.get(`${u}|${k}`)].filter(nonUnitKey)
        .map((key) => `${key}:${rec.get(key).c.toFixed(6)}`).sort().join('|'));
      if (footprints.some((fp) => fp.length > 0)) dsFsNU++;
      if (new Set(footprints).size > 1) dsDiffer++;
    }
    rows.push({ t: snap.t, phase: snap.t <= 1500 ? 'pre' : 'post', observed: observed.length, nonUnit: nonUnit.length,
      aTotal: all.reduce((x, e) => x + e.a, 0), dsEdgeObs, dsEdgeNU, dsFsNU, dsDiffer,
      cObserved: observed.map((e) => e.c), cNonUnit: nonUnit.map((e) => e.c) });
  }

  console.log('   t     phase  edges a>0  c_hat>1  attempts  | decision states: cand-edge a>0  cand-edge c>1  FS-relevant c>1  differing footprints');
  for (const r of rows) console.log(`   ${String(r.t).padStart(4)}  ${r.phase.padEnd(5)}  ${String(r.observed).padStart(5)}/78   ${String(r.nonUnit).padStart(4)}/78   ${String(r.aTotal).padStart(6)}  |  ${String(r.dsEdgeObs).padStart(8)}/${states.length}  ${String(r.dsEdgeNU).padStart(10)}/${states.length}  ${String(r.dsFsNU).padStart(12)}/${states.length}  ${String(r.dsDiffer).padStart(14)}/${states.length}`);
  const pre = rows.find((r) => r.t === 1500), end = rows.find((r) => r.t === 3000);
  console.log(`   c_hat among OBSERVED edges  @1500: ${dist(pre.cObserved)}`);
  console.log(`   c_hat among OBSERVED edges  @3000: ${dist(end.cObserved)}`);
  console.log(`   c_hat among c_hat>1 edges   @1500: ${dist(pre.cNonUnit)}`);
  console.log(`   c_hat among c_hat>1 edges   @3000: ${dist(end.cNonUnit)}`);

  // ---- 5. staleness diagnostic (analysis-only p; never entered the run) ----
  const cfg = env.makeConfig(R.configSeed, R.configIndex);
  const errAt = (t) => {
    const snap = R.snapshots.find((s) => s.t === t);
    const pNow = t < 1500 ? cfg.pPhase1 : cfg.pPhase2;
    return snap.edges.filter(([, , a]) => a > 0).map(([u, v, a, s]) => Math.abs((a + 1) / (s + 1) - 1 / pNow[env.edgeIndexOf(u, v)]));
  };
  console.log(`   [diagnostic] |c_hat - 1/p_current| over observed edges  @1250 (pre): ${dist(errAt(1250))}`);
  console.log(`   [diagnostic] |c_hat - 1/p_current| over observed edges  @1750 (post): ${dist(errAt(1750))}`);
  console.log(`   [diagnostic] |c_hat - 1/p_current| over observed edges  @3000 (post): ${dist(errAt(3000))}`);
  report.push({ fixture: R.fixture, goal, rows: rows.map(({ cObserved, cNonUnit, ...r }) => r) });
}
fs.writeFileSync(path.join(HERE, 'evidence', 'SUMMARY.json'), JSON.stringify(report, null, 2));
console.log(`\nwrote evidence/SUMMARY.json`);
