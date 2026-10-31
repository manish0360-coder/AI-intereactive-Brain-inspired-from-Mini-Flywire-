// ==========================================================
// ACQ-1 — the frozen analysis (dev gates and the confirmatory analysis share this code)
// ==========================================================
//   node experiments/coga/acq1/analyze.mjs --dev <dir P> [--dev-repeat <dir>] --out <dev_gates.json> --rows <dev_rows.json>       development gates
//   node experiments/coga/acq1/analyze.mjs --confirmatory <dir> --out <results.json>                                              confirmatory
// A world is void if any of its sessions crashed, did not complete, failed the map audit, had a refusal, a clock violation, or failed
// the RNG instance check.  Void worlds leave the analysis for every agent, are listed with reasons, and are not replaced.
// ==========================================================
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { generateAccepted, generateAcceptedStream } from '../../m7/env.js';
import { STUDY_STREAM_START, DEV_INDICES } from '../config.mjs';
import { describeAcq } from './states.mjs';
import { runAcq } from './baselines.mjs';
import { worldMetric, rawMetrics } from './metric.mjs';
import { interval, bootstrapInterval, contrast, decideAcq } from './analysis.mjs';
import { STEPS, WINDOW, CURVE_WINDOW, DELTA, DELTA_SENSITIVITY, QB1_PARAMS, BOOTSTRAP, VOID_SHARE_MAX, MFW_VARIANTS } from './config.mjs';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const hash = (x) => crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
const [LO, HI] = WINDOW;
const BASE = ['RW', 'QB1', 'DYNA'];

export function sessionProblems(s, steps) {
  const p = [];
  if (s.outcome.crashed || !s.outcome.completed) p.push('crash'); if (s.outcome.ticksExecuted !== steps) p.push('ticks'); if (!s.mapAudit.ok) p.push('map audit');
  if (s.envCounters.refused !== 0) p.push('refused'); if (s.clock.violations !== 0) p.push('clock'); if (s.rng.seededBeforeBoot !== false || s.rng.seededAtFirstStep !== true) p.push('rng');
  return p;
}
const metricOf = (w, a, b) => { const m = worldMetric(w, a, b, LO, HI); const h = m.states.filter(x => x.psi !== null).map(x => ({ h: x.n1 * x.n2 / (x.n1 + x.n2), psi: x.psi })); const H = h.reduce((t, x) => t + x.h, 0); return { psi: m.psi, R: m.R, usable: m.usable, psiH: H ? h.reduce((t, x) => t + x.h * x.psi, 0) / H : null }; };
const curveOf = (w, a, b) => { const out = []; for (let lo = 0; lo < STEPS; lo += CURVE_WINDOW) out.push(worldMetric(w, a, b, lo, lo + CURVE_WINDOW).psi); return out; };

/** rows and session audit from a directory of MFW sessions, for a list of worlds and a label function */
export function buildRows(worlds, variants, loadLog) {
  const rows = [], voids = [], audit = { sessions: 0, blockedIllegal: 0, self: 0, refused: 0 };
  for (const w of worlds) {
    const psi = {}, R = {}, psiH = {}, curve = {}, raw = {}, usable = {}, reasons = [];
    for (const v of variants) {
      const s = { E1: loadLog(w, v, 'E1'), E2: loadLog(w, v, 'E2') };
      for (const e of ['E1', 'E2']) { if (!s[e]) { reasons.push(`${v}/${e}: missing`); continue; } audit.sessions++; audit.blockedIllegal += s[e].guard.blockedIllegal; audit.self += s[e].envCounters.self; audit.refused += s[e].envCounters.refused; for (const q of sessionProblems(s[e], STEPS)) reasons.push(`${v}/${e}: ${q}`); }
      if (!s.E1 || !s.E2) continue;
      const m = metricOf(w, s.E1.log, s.E2.log); psi[v] = m.psi; R[v] = m.R; psiH[v] = m.psiH; usable[v] = m.usable; curve[v] = curveOf(w, s.E1.log, s.E2.log);
      raw[v] = { E1: rawMetrics(w, s.E1.log, 'E1', LO, HI), E2: rawMetrics(w, s.E2.log, 'E2', LO, HI) };
    }
    if (reasons.length) { voids.push({ world: w.id, reasons }); continue; }
    for (const b of BASE) {
      const a = runAcq({ world: w, agent: b, env: 'E1', params: QB1_PARAMS, steps: STEPS }).log, c = runAcq({ world: w, agent: b, env: 'E2', params: QB1_PARAMS, steps: STEPS }).log;
      const m = metricOf(w, a, c); psi[b] = m.psi; R[b] = m.R; psiH[b] = m.psiH; usable[b] = m.usable; curve[b] = curveOf(w, a, c); raw[b] = { E1: rawMetrics(w, a, 'E1', LO, HI), E2: rawMetrics(w, c, 'E2', LO, HI) };
    }
    rows.push({ world: w.id, goal: w.goal, psi, R, psiH, usable, curve, raw, delta: psi.P - psi.RW });
  }
  return { rows, voids, audit };
}
const ci = (rows, f, seed, level = BOOTSTRAP.level) => interval(rows, f, { level });

if (arg('--dev')) {
  const dir = arg('--dev');
  const worlds = generateAcceptedStream(STUDY_STREAM_START, DEV_INDICES.hi + 1).map(w => describeAcq({ cfg: w.cfg, acceptedSeed: w.acceptedSeed, configIndex: w.acceptedConfigIndex, stream: 'study' }));
  const load = (w, v, e) => { const f = path.join(dir, `MFW${v}-study${w.index}-${e}.json`); return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null; };
  const { rows, voids, audit } = buildRows(worlds, ['P'], load);
  let determinism = { compared: 0, different: 0 };
  if (arg('--dev-repeat')) for (const w of worlds) for (const e of ['E1', 'E2']) { const a = load(w, 'P', e), f = path.join(arg('--dev-repeat'), `MFWP-study${w.index}-${e}.json`); if (fs.existsSync(f)) { determinism.compared++; if (hash(JSON.parse(fs.readFileSync(f, 'utf8')).log) !== hash(a.log)) determinism.different++; } }
  const gates = { schema: 'coga/acq1.dev-gates', worlds: rows.length, voids, audit, delta: DELTA, window: WINDOW, positiveControl: ci(rows, contrast('psi', 'QB1', null), 1), nullRW: ci(rows, contrast('psi', 'RW', null), 2), dyna: ci(rows, contrast('psi', 'DYNA', null), 3), instrumentsOk: voids.length === 0, determinism, determinismOk: determinism.compared > 0 && determinism.different === 0 };
  fs.writeFileSync(arg('--out'), JSON.stringify(gates, null, 1));
  if (arg('--rows')) fs.writeFileSync(arg('--rows'), JSON.stringify({ schema: 'coga/acq1.dev-rows', rows: rows.map(r => ({ world: r.world, goal: r.goal, delta: r.delta })) }, null, 1));
  console.log(JSON.stringify({ worlds: rows.length, voids: voids.length, pc: [gates.positiveControl.est, gates.positiveControl.lo, gates.positiveControl.hi], rw: [gates.nullRW.est, gates.nullRW.lo, gates.nullRW.hi], determinism }));
}

if (arg('--confirmatory')) {
  const { ACQ_AUTHORIZATION: LOCK } = await import('./lock.mjs');
  const dir = arg('--confirmatory');
  const worlds = LOCK.allocation.map(a => { const g = generateAccepted(a.configSeed, a.index); return describeAcq({ cfg: g.cfg, acceptedSeed: a.configSeed, configIndex: a.index, stream: 'study' }); });
  const load = (w, v, e) => { const f = path.join(dir, `MFW${v}-w${w.index}-${e}.json`); return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null; };
  const { rows, voids, audit } = buildRows(worlds, MFW_VARIANTS, load);
  let compared = 0, different = 0;
  for (const f of fs.readdirSync(dir).filter(x => x.endsWith('-repeat.json'))) { compared++; const a = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')), b = JSON.parse(fs.readFileSync(path.join(dir, f.replace('-repeat', '')), 'utf8')); if (hash(a.log) !== hash(b.log)) different++; }
  const P = ci(rows, contrast('psi', 'P', 'RW'), 101), rw = ci(rows, contrast('psi', 'RW', null), 102), qb = ci(rows, contrast('psi', 'QB1', null), 103), dyna = ci(rows, contrast('psi', 'DYNA', null), 104);
  const voidShare = voids.length / worlds.length, determinismOk = compared > 0 && different === 0, nullOk = rw.lo > -DELTA && rw.hi < DELTA, pcOk = qb.lo > DELTA;
  const decision = decideAcq({ L: P.lo, U: P.hi, delta: DELTA, voidShare, determinismOk, nullOk, pcOk });
  const lvl = BOOTSTRAP.secondaryLevel;
  const out = { schema: 'coga/acq1.results', window: WINDOW, steps: STEPS, delta: DELTA, worldsAllocated: worlds.length, worldsAnalysed: rows.length, voids, audit, determinism: { compared, different },
    primary: { estimand: 'mean over worlds of psi_w(MFW-P) - psi_w(RW)', ...P }, decision, instruments: { nullRW: rw, positiveControlQB1: qb, nullOk, pcOk },
    levels: Object.fromEntries([...MFW_VARIANTS, ...BASE].map((a, i) => [a, ci(rows, contrast('psi', a, null), 200 + i)])),
    secondary: { A_minus_P: ci(rows, contrast('psi', 'A', 'P'), 301, lvl), H_minus_P: ci(rows, contrast('psi', 'H', 'P'), 302, lvl), P_minus_QB1: ci(rows, contrast('psi', 'P', 'QB1'), 303), R_P_minus_RW: ci(rows, contrast('R', 'P', 'RW'), 304), R_QB1_minus_RW: ci(rows, contrast('R', 'QB1', 'RW'), 305) },
    sensitivity: { bootstrapPrimary: bootstrapInterval(rows, contrast('psi', 'P', 'RW'), { replicates: BOOTSTRAP.replicates, seed: BOOTSTRAP.seed, level: BOOTSTRAP.level }), harmonicWeights: ci(rows, contrast('psiH', 'P', 'RW'), 401), againstZero: ci(rows, contrast('psi', 'P', null), 402), marginRows: Object.fromEntries(DELTA_SENSITIVITY.map(d => [d, decideAcq({ L: P.lo, U: P.hi, delta: d, voidShare, determinismOk, nullOk: rw.lo > -d && rw.hi < d, pcOk: qb.lo > d })])),
      byGoal: Object.fromEntries([8, 12, 16, 19].map((g, i) => [g, ci(rows.filter(r => r.goal === g), contrast('psi', 'P', 'RW'), 410 + i)])) },
    curve: Object.fromEntries([...MFW_VARIANTS, ...BASE].map(a => [a, (rows[0] ? rows[0].curve[a] : []).map((_, k) => rows.reduce((t, r) => t + r.curve[a][k], 0) / rows.length)])),
    rawLastWindow: Object.fromEntries([...MFW_VARIANTS, ...BASE].map(a => [a, { meanP_E1: rows.reduce((t, r) => t + r.raw[a].E1.meanP, 0) / rows.length, meanP_E2: rows.reduce((t, r) => t + r.raw[a].E2.meanP, 0) / rows.length, ownAgreement_E1: rows.reduce((t, r) => t + r.raw[a].E1.ownAgreement, 0) / rows.length, ownAgreement_E2: rows.reduce((t, r) => t + r.raw[a].E2.ownAgreement, 0) / rows.length }])),
    voidShareMax: VOID_SHARE_MAX };
  fs.writeFileSync(arg('--out'), JSON.stringify({ ...out, rows: rows.map(r => ({ world: r.world, goal: r.goal, psi: r.psi, R: r.R, usable: r.usable })) }, null, 1));
  console.log(JSON.stringify({ worlds: rows.length, voids: voids.length, primary: [P.est, P.lo, P.hi], decision, nullOk, pcOk, determinism: { compared, different } }));
}
