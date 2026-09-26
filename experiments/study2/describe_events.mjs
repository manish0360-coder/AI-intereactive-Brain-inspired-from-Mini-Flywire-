// ==========================================================
// STUDY-2 POST-HOC EVENT DESCRIPTIVES — NOT PRE-REGISTERED, NOT PART OF THE FROZEN ANALYSIS
// ==========================================================
// Written AFTER the frozen analysis (ANALYSIS.json) was produced. It changes no estimand, no classification and no
// frozen output. Purpose: explain the frozen result's form (many runs have a within-run median Delta of exactly 0)
// by counting, per window, how often Delta(e) is positive, negative or exactly zero, and how often the FULL and GEO
// step-0 rankings are identical. Uses the frozen primitives (taub.mjs) and the frozen oracle definition.
//
//   node experiments/study2/describe_events.mjs experiments/study2/execution
// ==========================================================
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { deltaEvent, cmpScore } from './taub.mjs';
import { decScore } from './capture.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const dir = path.resolve(process.argv[2] || path.join(HERE, 'execution'));
const env = await import(pathToFileURL(path.join(ROOT, 'experiments/m7/env.js')).href);
const plan = JSON.parse(fs.readFileSync(path.join(dir, 'PLAN.json'), 'utf8'));
const ledger = JSON.parse(fs.readFileSync(path.join(dir, 'LEDGER.json'), 'utf8'));

// same ordering relation as tau-b: two rankings are identical when every pair has the same sign in both
const sameOrdering = (x, y) => { for (let i = 0; i < x.length; i++) for (let j = i + 1; j < x.length; j++) if (cmpScore(x[i], x[j]) !== cmpScore(y[i], y[j])) return false; return true; };
const blank = () => ({ events: 0, scored: 0, pos: 0, neg: 0, zero: 0, identicalOrdering: 0, sumDelta: 0 });
const perRun = [];
const pooled = { primary: blank(), postShift: blank() };
for (const [i, s] of plan.slots.entries()) {
  const art = JSON.parse(fs.readFileSync(path.join(dir, ledger[i].summary.artifact), 'utf8'));
  const cfg = env.makeConfig(s.acceptedSeed, s.configIndex);
  const C1 = env.expectedCostToGoal(cfg.pPhase1, cfg.goal), C2 = env.expectedCostToGoal(cfg.pPhase2, cfg.goal);
  const row = { slot: s.slot, goal: s.goal, primary: blank(), postShift: blank() };
  for (const v of art.vectors) {
    const w = v.tau <= 1500 ? 'primary' : 'postShift';
    const C = w === 'primary' ? C1 : C2;
    for (const acc of [row[w], pooled[w]]) acc.events++;
    if (v.k.length < 2) continue;
    const full = v.full.map(decScore), geo = v.geo.map(decScore), u = v.k.map((k) => -C.get(k));
    const d = deltaEvent(full, geo, u);
    const same = sameOrdering(full, geo);
    for (const acc of [row[w], pooled[w]]) {
      acc.scored++; acc.sumDelta += d;
      if (d > 0) acc.pos++; else if (d < 0) acc.neg++; else acc.zero++;
      if (same) acc.identicalOrdering++;
    }
  }
  perRun.push(row);
}
const fin = (a) => ({ ...a, meanDelta: a.scored ? a.sumDelta / a.scored : null, shareZero: a.scored ? a.zero / a.scored : null,
  shareIdenticalOrdering: a.scored ? a.identicalOrdering / a.scored : null });
const out = { schema: 'study2-posthoc-event-descriptives/1', preregistered: false,
  note: 'post-hoc descriptive only; written after the frozen analysis; does not change any frozen result or classification',
  pooled: { primary: fin(pooled.primary), postShift: fin(pooled.postShift) },
  perRun: perRun.map((r) => ({ slot: r.slot, goal: r.goal, primary: fin(r.primary), postShift: fin(r.postShift) })) };
fs.writeFileSync(path.join(dir, 'POSTHOC_EVENT_DESCRIPTIVES.json'), JSON.stringify(out, null, 1) + '\n');
console.log(JSON.stringify(out.pooled, null, 1));
