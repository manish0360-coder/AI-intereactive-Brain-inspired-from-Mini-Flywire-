// ==========================================================
// H1-R — conformance runtime (globalThis.__H1R__)
// ==========================================================
// Consulted only by the guarded edits of conformance_transform.mjs. It owns no learning
// state, draws no random number, and reads the arm semantics from the frozen predicates in
// experiments/m7/arms.js (the same module instance run.js configures).
//
// Programmatic:  await installH1R({ tree, trustMode })
// Preload:       NODE_OPTIONS="--import=<file URL of this module>" with
//                H1R=on  H1R_TREE=<conformed tree dir>  [H1R_TRUST_MODE=traversal|attemptGated]
//
// R1: `noteR1` receives the realised transition of each tick from the R1-DRAW-EARLY edit (the draw
// itself is the unchanged `__M7_ENV__.attempt` call; this module only records).
//
// TRUST MODES (N2)
//   traversal     (H1-R)  frozen §6.1: trust success iff the traversal succeeded; the
//                         episode-level success writer is suppressed. Guarantees s <= a.
//   attemptGated  (diagnostic only) episode credit allowed for keys attempted in the current
//                         episode. Kept to measure the reconciliation conflict; NOT for H1-R.
// ==========================================================
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export async function installH1R({ tree, trustMode = 'traversal' } = {}) {
  if (!tree) throw new Error('installH1R: tree directory required');
  if (!['traversal', 'attemptGated'].includes(trustMode)) throw new Error(`installH1R: unknown trustMode ${trustMode}`);
  const arms = await import(pathToFileURL(path.join(tree, 'experiments', 'm7', 'arms.js')).href);
  const edges = JSON.parse(fs.readFileSync(path.join(tree, 'connections.json'), 'utf8'));
  const ADJ = new Set();
  for (const e of edges) { const a = Number(e.from), b = Number(e.to); ADJ.add(a + '|' + b); ADJ.add(b + '|' + a); }
  const isEdge = (a, b) => a != null && b != null && Number(a) !== Number(b) && ADJ.has(Number(a) + '|' + Number(b));
  const attempts = new Set();
  const counters = { blockedIllegal: 0, resets: { goal: 0, cap: 0 }, uniformDecisions: 0, armsSeen: new Set() };
  // R1 bookkeeping (records only; nothing here alters behaviour or draws a random number)
  const r1stats = { decisions: 0, noDecision: 0, edgeAttempts: 0, slips: 0, realised: 0, selfNoop: 0 };   // realised includes goal entries
  const H = {
    on: true,
    trustMode,
    counters,
    isEdge,
    legalMove: (a, b) => (a != null && b != null && Number(a) === Number(b)) || isEdge(a, b),
    uniform() { counters.armsSeen.add(arms.current().arm); const u = arms.usesUniformActionSelection(); if (u) counters.uniformDecisions++; return u; },
    qFrozen() { return !arms.allowsQUpdate(); },
    trustFrozen() { return !arms.allowsTrustUpdate(); },
    episodeCreditAllowed(key) { return trustMode === 'attemptGated' ? attempts.has(String(key)) : false; },
    noteAttempt(from, to) { if (trustMode === 'attemptGated') attempts.add(from + '->' + to); },
    episodeBoundary(kind) { attempts.clear(); if (kind in counters.resets) counters.resets[kind]++; },
    // R1: called once per tick at R1-DRAW-EARLY with the decision position, the intended node and
    // the outcome of the single environment draw. `r1` is the realised transition of this tick.
    r1: null,
    r1stats,
    noteR1(from, intended, traversed) {
      const f = from == null ? null : Number(from), v = intended == null ? null : Number(intended);
      const realised = (v === null || !traversed) ? f : v;
      const kind = v === null ? 'none' : (f === v ? 'self' : (!traversed ? 'slip' : 'move'));
      H.r1 = { from: f, intended: v, traversed: !!traversed, realised, kind };
      if (kind === 'none') { r1stats.noDecision++; return; }
      r1stats.decisions++;
      if (kind === 'self') r1stats.selfNoop++;
      else { if (isEdge(f, v)) r1stats.edgeAttempts++; if (kind === 'slip') r1stats.slips++; else r1stats.realised++; }
    },
  };
  globalThis.__H1R__ = H;
  return H;
}

if (process.env.H1R === 'on' && process.env.H1R_TREE) {
  await installH1R({ tree: process.env.H1R_TREE, trustMode: process.env.H1R_TRUST_MODE || 'traversal' });
}
