// ==========================================================
// XFER-1 — analysis of one orchestrated run
// ==========================================================
//   node analyze.mjs --in <run dir> [--out <summary.json>]
// Reads the run's MANIFEST.json, REFUSES if any recorded hash or session is missing or altered, then builds the
// per-world table and the declared paired contrasts (config.mjs CONTRASTS).  Descriptive only; see stats.mjs.
// ==========================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ARMS, ARM_ORDER, ENDPOINTS, CONTRASTS, BOOTSTRAP, sha256, hashObject } from './config.mjs';
import { pairedSummary, mean } from './stats.mjs';
import { deliveryProblems, provenanceProblems, pairingProblems } from './checks.mjs';

/** pure: build the per-world table and contrasts from session records (an array of test-session result objects) */
export function summarize(tests, plan) {
  const byWorld = new Map();
  for (const r of tests) {
    const w = r.input.world;
    if (!byWorld.has(w)) byWorld.set(w, {});
    byWorld.get(w)[r.input.arm] = r;
  }
  const worlds = [...byWorld.keys()].sort((a, b) => a - b);
  const goalOf = new Map((plan || []).map(p => [p.world, p.goal]));
  const perWorld = {};
  for (const w of worlds) {
    perWorld[w] = { goal: goalOf.has(w) ? goalOf.get(w) : byWorld.get(w)[Object.keys(byWorld.get(w))[0]].input.goal, arms: {} };
    for (const [a, r] of Object.entries(byWorld.get(w))) perWorld[w].arms[a] = ENDPOINTS.map(e => r.endpoints[e]);
  }
  const armNames = ARM_ORDER.filter(a => worlds.some(w => perWorld[w].arms[a]));
  const armMeans = {};
  for (const a of armNames) {
    armMeans[a] = {};
    ENDPOINTS.forEach((e, k) => {
      const xs = worlds.map(w => perWorld[w].arms[a] && perWorld[w].arms[a][k]).filter(x => typeof x === 'number');
      armMeans[a][e] = { n: xs.length, mean: mean(xs) };
    });
  }
  const contrasts = [];
  for (const [name, t, ref] of CONTRASTS) {
    if (!armNames.includes(t) || !armNames.includes(ref)) continue;
    const row = { name, treatment: t, reference: ref, endpoints: {} };
    ENDPOINTS.forEach((e, k) => {
      const diffs = [];
      for (const w of worlds) { const a = perWorld[w].arms[t], b = perWorld[w].arms[ref]; if (a && b && typeof a[k] === 'number' && typeof b[k] === 'number') diffs.push(a[k] - b[k]); }
      row.endpoints[e] = pairedSummary(diffs, BOOTSTRAP);
    });
    contrasts.push(row);
  }
  // behavioural concentration of executed moves, per arm (diagnostic only)
  const concentration = {};
  for (const a of armNames) {
    const xs = [], rp = [];
    for (const r of tests) if (r.input.arm === a && r.diagnostics) { if (typeof r.diagnostics.top3UndirectedShare === 'number') xs.push(r.diagnostics.top3UndirectedShare); rp.push(r.diagnostics.replayCalls); }
    concentration[a] = { top3UndirectedShareMean: mean(xs), replayCallsMean: mean(rp), n: xs.length };
  }
  // per-goal means of the primary endpoint's paired differences (descriptive heterogeneity check)
  const byGoal = {};
  for (const [name, t, ref] of CONTRASTS) {
    if (!armNames.includes(t) || !armNames.includes(ref)) continue;
    for (const w of worlds) {
      const a = perWorld[w].arms[t], b = perWorld[w].arms[ref];
      if (!a || !b) continue;
      const g = perWorld[w].goal;
      byGoal[g] = byGoal[g] || {};
      (byGoal[g][name] = byGoal[g][name] || []).push(a[0] - b[0]);
    }
  }
  for (const g of Object.keys(byGoal)) for (const n of Object.keys(byGoal[g])) { const xs = byGoal[g][n]; byGoal[g][n] = { n: xs.length, mean: mean(xs), positive: xs.filter(x => x > 0).length, negative: xs.filter(x => x < 0).length }; }
  return { worlds, endpoints: ENDPOINTS, armOrder: armNames, perWorld, armMeans, contrasts, concentration, byGoal };
}

/** load and integrity-check a run directory; throws on any problem */
export function loadRun(dir) {
  const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'MANIFEST.json'), 'utf8'));
  if (manifest.failures !== 0) throw new Error(`run has ${manifest.failures} failed session(s)`);
  const tests = [], trains = [];
  for (const [file, h] of Object.entries(manifest.sessions)) {
    const text = fs.readFileSync(path.join(dir, 'sessions', file));
    if (sha256(text) !== h) throw new Error(`session record altered: ${file}`);
    const rec = JSON.parse(text);
    if (rec.outcome.crashed || !rec.outcome.completed) throw new Error(`session did not complete: ${file}`);
    (rec.role === 'test' ? tests : trains).push(rec);
  }
  const plan = JSON.parse(fs.readFileSync(path.join(dir, 'plan.json'), 'utf8'));
  const expected = plan.plan.length * plan.arms.length;
  if (tests.length !== expected) throw new Error(`expected ${expected} test sessions, found ${tests.length}`);
  if (trains.length !== plan.plan.length) throw new Error(`expected ${plan.plan.length} training sessions, found ${trains.length}`);
  const recomputed = hashObject({ sessions: manifest.sessions, brains: manifest.brains, planSha256: manifest.planSha256, tree: manifest.tree });
  if (recomputed !== manifest.digest) throw new Error('manifest digest does not match its contents');
  // design integrity: delivery exactness, provenance of every delivered brain, pairing of the arms of each world
  const trainByWorld = new Map(trains.map(t => [t.input.world, t]));
  const problems = [];
  for (const r of tests) problems.push(...deliveryProblems(r).map(x => `${r.label}: ${x}`), ...provenanceProblems(r, trainByWorld).map(x => `${r.label}: ${x}`));
  problems.push(...pairingProblems(tests, plan.arms));
  if (problems.length) throw new Error(`design integrity violated (${problems.length}): ${problems.slice(0, 5).join(' | ')}`);
  return { manifest, plan, tests, trains };
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  const argv = process.argv.slice(2);
  const flag = (n) => { const i = argv.indexOf(n); return i === -1 ? null : argv[i + 1]; };
  if (!flag('--in')) { console.error('--in is required'); process.exit(2); }
  const run = loadRun(path.resolve(flag('--in')));
  const s = summarize(run.tests, run.plan.plan);
  const trainGoal = run.trains.map(t => t.endpoints.goalReaches);
  const summary = { schema: 'xfer1.summary/1', status: 'DEVELOPMENT_EXPLORATORY', manifestDigest: run.manifest.digest, tree: run.manifest.tree, ticks: run.plan.ticks,
    worlds: s.worlds, trainGoalReachesMean: mean(trainGoal), ...s };
  const text = JSON.stringify(summary, null, 1);
  if (flag('--out')) fs.writeFileSync(path.resolve(flag('--out')), text);
  // concise table on stdout
  const f = (x, d = 2) => (x === null || x === undefined ? 'n/a' : x.toFixed(d));
  console.log(`worlds ${s.worlds.length}, arms ${s.armOrder.length}; manifest ${run.manifest.digest.slice(0, 12)}`);
  console.log('arm            goalReaches  early  attemptSucc  slips/call  top3share');
  for (const a of s.armOrder) {
    const m = s.armMeans[a], c = s.concentration[a];
    console.log(`${a.padEnd(18)} ${f(m.goalReaches.mean, 1).padStart(8)} ${f(m.earlyReaches.mean, 1).padStart(7)} ${f(m.attemptSuccess.mean, 3).padStart(11)} ${f(m.slipsPerCall.mean, 3).padStart(10)} ${f(c.top3UndirectedShareMean, 3).padStart(9)}`);
  }
  console.log('\ncontrast (treatment - reference) on goalReaches: mean [95% boot CI]  median  +/-/0');
  for (const c of s.contrasts) {
    const g = c.endpoints.goalReaches;
    console.log(`${c.treatment.padEnd(15)} - ${c.reference.padEnd(5)} ${f(g.mean, 1).padStart(8)} [${f(g.ci && g.ci.lower, 1)}, ${f(g.ci && g.ci.upper, 1)}]  ${f(g.median, 1).padStart(7)}  ${g.positive}/${g.negative}/${g.zero}`);
  }
}
