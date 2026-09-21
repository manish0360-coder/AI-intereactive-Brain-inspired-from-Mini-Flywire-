// ==========================================================
// STUDY-2 ANALYSIS — post-run only; the ONLY Study-2 code that evaluates the oracle
// ==========================================================
// Implements the frozen design text, nothing more:
//   §J  U*(k) = −expectedCostToGoal(p, goal)(k), candidate-onward; p = pPhase1 for the primary window
//   §O  Delta(e) = tau_b(FS_FULL(e), U*(e)) − tau_b(FS_GEO(e), U*(e)) over K(e)
//   §P  tau-b with the 1e-9 tie convention; undefined tau-b => 0 (primary); m < 2 => excluded;
//       sensitivity: events with an undefined tau-b in either arm excluded; undefined counts reported per arm
//   §K  primary window tau <= 1500 (includes the boundary event at tau = 1500)
//   §Q  Delta_r = median over the run's eligible events; theta = median over runs (PRIMARY); mean secondary;
//       per-run sign pattern and the exact sign test, reported without any alpha
//   §W  exact bootstrap 95% percentile interval of the median (taub.mjs, count-vector form)
//   §M  R5 = cfg.checks.r5Differing, a descriptive moderator: per-run table + Spearman(R5, Delta_r); no filter
//   §L  secondary post-shift (tau > 1500, pPhase2): separate, never pooled, never changes the primary result
//   §T  crashed runs recorded and excluded; no other run-level exclusion; the run set must equal the plan
// Diagnostics nAugmented / executedInK / executedAugmented are summarised, never used as validity conditions.
//
//   node experiments/study2/analyze_study2.mjs <block output dir>
// ==========================================================
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { tauB, deltaEvent, median, exactBootstrapMedianCI } from './taub.mjs';
import { decScore } from './capture.mjs';
import { computeManifest } from './manifest.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
export const PRIMARY_TAU_MAX = 1500;                           // §K

const mean = (v) => v.reduce((a, b) => a + b, 0) / v.length;

// exact two-sided sign test over the non-zero run values (reported, never thresholded)
export function exactSignTest(values) {
  const pos = values.filter((x) => x > 0).length, neg = values.filter((x) => x < 0).length;
  const n = pos + neg;
  if (n === 0) return { pos, neg, zero: values.length, n, pTwoSided: null };
  const k = Math.min(pos, neg);
  let c = 1n, tail = 0n;
  for (let i = 0; i <= k; i++) { if (i > 0) c = (c * BigInt(n - i + 1)) / BigInt(i); tail += c; }
  const p = Math.min(1, (2 * Number(tail)) / 2 ** n);
  return { pos, neg, zero: values.length - n, n, pTwoSided: p };
}

const ranks = (v) => {
  const idx = v.map((x, i) => [x, i]).sort((a, b) => a[0] - b[0]);
  const r = new Array(v.length);
  for (let i = 0; i < idx.length;) {
    let j = i; while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++;
    for (let t = i; t <= j; t++) r[idx[t][1]] = (i + j) / 2 + 1;
    i = j + 1;
  }
  return r;
};
export function spearman(x, y) {
  if (x.length < 2) return null;
  const a = ranks(x), b = ranks(y), ma = mean(a), mb = mean(b);
  let sab = 0, saa = 0, sbb = 0;
  for (let i = 0; i < a.length; i++) { sab += (a[i] - ma) * (b[i] - mb); saa += (a[i] - ma) ** 2; sbb += (b[i] - mb) ** 2; }
  return saa === 0 || sbb === 0 ? null : sab / Math.sqrt(saa * sbb);
}

// Score one run's events in one window against one oracle. Pure.
function scoreWindow(events, inWindow, U) {
  const out = { nEvents: 0, excludedMlt2: 0, undefinedFULL: 0, undefinedGEO: 0, deltas: [], sensitivityDeltas: [] };
  for (const e of events) {
    if (!inWindow(e.tau)) continue;
    out.nEvents++;
    if (e.k.length < 2) { out.excludedMlt2++; continue; }
    const full = e.full.map(decScore), geo = e.geo.map(decScore), u = e.k.map((k) => U(k));
    const sf = tauB(full, u).status, sg = tauB(geo, u).status;
    if (sf === 'undefined') out.undefinedFULL++;
    if (sg === 'undefined') out.undefinedGEO++;
    const d = deltaEvent(full, geo, u);
    out.deltas.push(d);
    if (sf === 'ok' && sg === 'ok') out.sensitivityDeltas.push(d);
  }
  return out;
}

const summarise = (values) => (values.length ? {
  n: values.length, theta: median(values), meanOfRuns: mean(values),
  interval: exactBootstrapMedianCI(values), signPattern: values.map((x) => (x > 0 ? '+' : x < 0 ? '-' : '0')).join(''),
  signTest: exactSignTest(values),
} : { n: 0 });

// runs: [{ slot, goal, r5Differing, status, events: [{tau, k, full, geo}], U1: k => U*, U2: k => U* }]
export function analyzeStudy(runs) {
  const completed = runs.filter((r) => r.status === 'completed');
  const perRun = completed.map((r) => {
    const pri = scoreWindow(r.events, (t) => t <= PRIMARY_TAU_MAX, r.U1);
    const post = scoreWindow(r.events, (t) => t > PRIMARY_TAU_MAX, r.U2);
    if (!pri.deltas.length) throw new Error(`STOP: run ${r.slot} has no eligible primary event; no rule covers this — report to the Director`);
    return { slot: r.slot, goal: r.goal, r5Differing: r.r5Differing,
      primary: { nEvents: pri.nEvents, excludedMlt2: pri.excludedMlt2, undefinedFULL: pri.undefinedFULL, undefinedGEO: pri.undefinedGEO,
        deltaR: median(pri.deltas), meanDeltaR: mean(pri.deltas) },
      sensitivity: { nEvents: pri.sensitivityDeltas.length, deltaR: pri.sensitivityDeltas.length ? median(pri.sensitivityDeltas) : null },
      postShift: { nEvents: post.nEvents, excludedMlt2: post.excludedMlt2, deltaR: post.deltas.length ? median(post.deltas) : null } };
  });
  const primaryValues = perRun.map((r) => r.primary.deltaR);
  const sensValues = perRun.map((r) => r.sensitivity.deltaR).filter((x) => x !== null);
  const postValues = perRun.map((r) => r.postShift.deltaR).filter((x) => x !== null);
  return {
    runs: { planned: runs.length, completed: completed.length, crashed: runs.filter((r) => r.status === 'crashed').map((r) => r.slot) },
    primary: { window: `tau <= ${PRIMARY_TAU_MAX}`, oracle: 'U* = -expectedCostToGoal(pPhase1, goal)', ...summarise(primaryValues) },
    sensitivityUndefinedExcluded: { runsWithEvents: sensValues.length, runsWithoutEvents: perRun.length - sensValues.length, ...summarise(sensValues) },
    r5Moderator: { table: perRun.map((r) => ({ slot: r.slot, goal: r.goal, r5Differing: r.r5Differing, deltaR: r.primary.deltaR })),
      spearmanR5vsDeltaR: spearman(perRun.map((r) => r.r5Differing), primaryValues), note: 'descriptive only; no threshold, no subgroup test, no exclusion' },
    secondaryPostShift: { window: `tau > ${PRIMARY_TAU_MAX}`, oracle: 'U* = -expectedCostToGoal(pPhase2, goal)',
      note: 'secondary and exploratory; never pooled with, and never used to change, the primary result', ...summarise(postValues) },
    perRun,
  };
}

// ---- CLI: verify the block record, attach the oracle, analyse ----
async function main() {
  const dir = path.resolve(process.argv[2] || '');
  const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
  const stop = (m) => { process.stderr.write(`ANALYSIS REFUSED: ${m}\n`); process.exit(1); };
  if (!fs.existsSync(path.join(dir, 'PLAN.json'))) stop('no PLAN.json');
  if (fs.existsSync(path.join(dir, 'HALT.json'))) stop('the block was halted; no analysis without a Director ruling');
  for (const l of fs.readFileSync(path.join(dir, 'INTEGRITY.sha256'), 'utf8').trim().split('\n')) {
    const [h, f] = l.split(/\s+/); if (sha(fs.readFileSync(path.join(dir, f))) !== h) stop(`integrity mismatch: ${f}`);
  }
  const plan = JSON.parse(fs.readFileSync(path.join(dir, 'PLAN.json'), 'utf8'));
  const ledger = JSON.parse(fs.readFileSync(path.join(dir, 'LEDGER.json'), 'utf8'));
  if (JSON.stringify(ledger.map((e) => e.slot)) !== JSON.stringify(plan.slots.map((s) => s.slot))) stop('ledger does not equal the plan (deletion/extension)');
  const analysisSha256 = computeManifest().analysisSha256;
  const env = await import(pathToFileURL(path.join(ROOT, 'experiments/m7/env.js')).href);
  const runs = [];
  const diagnostics = { events: 0, executedInK: 0, executedAugmented: 0, eventsWithAugmentation: 0 };
  for (const [i, s] of plan.slots.entries()) {
    const entry = ledger[i];
    const status = entry.reexecution ? entry.reexecution.summary.status : entry.status;
    const summary = entry.reexecution ? entry.reexecution.summary : entry.summary;
    const body = fs.readFileSync(path.join(dir, summary.artifact));
    if (sha(body) !== summary.artifactSha256) stop(`artifact hash mismatch: ${summary.artifact}`);
    const art = JSON.parse(body);
    const p = art.provenance;
    if (p.analysisScriptSha256 !== analysisSha256) stop(`run ${s.slot} was registered with a different analysis script`);
    if (p.acceptedSeed !== s.acceptedSeed || p.configIndex !== s.configIndex || p.goal !== s.goal) stop(`run ${s.slot} provenance differs from the plan`);
    if (status !== 'completed') { runs.push({ slot: s.slot, goal: s.goal, status }); continue; }
    const recomputed = crypto.createHash('sha256').update(JSON.stringify({ events: art.events, vectors: art.vectors, tickLog: art.tickLog, fingerprint: art.fingerprint })).digest('hex');
    if (recomputed !== p.evidenceIntegritySha256) stop(`run ${s.slot} evidence hash mismatch`);
    const cfg = env.makeConfig(s.acceptedSeed, s.configIndex);
    if (!cfg.accepted || cfg.goal !== s.goal) stop(`run ${s.slot}: configuration does not regenerate`);
    const C1 = env.expectedCostToGoal(cfg.pPhase1, cfg.goal), C2 = env.expectedCostToGoal(cfg.pPhase2, cfg.goal);
    runs.push({ slot: s.slot, goal: s.goal, status, r5Differing: cfg.checks.r5Differing, events: art.vectors,
      U1: (k) => -C1.get(k), U2: (k) => -C2.get(k) });
    for (const e of art.events) { diagnostics.events++; if (e.executedInK) diagnostics.executedInK++; if (e.executedAugmented) diagnostics.executedAugmented++; if (e.nAugmented > 0) diagnostics.eventsWithAugmentation++; }
  }
  const result = { schema: 'study2-analysis/1', analysisScriptSha256: analysisSha256, planSha256: sha(fs.readFileSync(path.join(dir, 'PLAN.json'))),
    ...analyzeStudy(runs), monitoredDiagnostics: { ...diagnostics, note: 'monitored diagnostics, not validity conditions (§G)' } };
  fs.writeFileSync(path.join(dir, 'ANALYSIS.json'), JSON.stringify(result, null, 1) + '\n');
  process.stdout.write(`analysis written: ${path.join(dir, 'ANALYSIS.json')}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
