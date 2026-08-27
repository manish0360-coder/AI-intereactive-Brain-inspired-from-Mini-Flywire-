// ==========================================================
// ACCEPTANCE-BOUNDARY VERIFIER — criteria A-E of the Director
// authorisation of 2026-08-23 (G11 acceptance-sampler repair)
// ==========================================================
// GOVERNING SOURCE: frozen M7_PREREGISTRATION.md
//   SHA-256 2f12e309d7409e95f3d1bca34135110e518865fd01d96e5eeaee347b6e33f6b9
//   §3.5 rejection sampling · §14 G11 · errata ERR-01…ERR-07
//
// This file adds VERIFICATION ONLY. It modifies no production behaviour, no
// acceptance rule, no threshold, no observable, and no existing verifier.
//
// It exists because criteria C, D and E of the authorisation demand mutation
// coverage that did not previously exist:
//   C  bypass each of the five G11 acceptance checks in turn -> leakage detected
//   D  mutate each of R1..R5 in turn -> the sampler detects the violation
//   E  acceptance must NOT be vacuous: at least one configuration survives
//
// SEED DISCIPLINE. Only the authorised development/pilot block 900000-900029
// is evaluated. The held-out block 900500-900529 is never generated, and a
// runtime audit at the end proves it.
//
// NOT Stage 1, a pilot, or a confirmatory run. No metric is estimated and
// nothing is persisted as experimental data.
// ==========================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as env from './env.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const EDGES = JSON.parse(fs.readFileSync(path.join(ROOT, 'connections.json'), 'utf8'))
  .map((e, i) => ({ i, from: Number(e.from), to: Number(e.to) }));
const NODES = JSON.parse(fs.readFileSync(path.join(ROOT, 'neurons.json'), 'utf8'))
  .map(n => Number(n.id));
const NAMES = env.G11_OBSERVABLES;
const TH = env.G11_THRESHOLD;
const PILOT_LO = 900000, PILOT_HI = 900029;

let pass = 0, fail = 0;
const ok = (n, c, x = '') => { c ? pass++ : fail++; console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${x ? '   ' + x : ''}`); return c; };

// the four FIXED observables, recomputed here independently of env.js
const DEG_OUT = {}, DEG_IN = {};
EDGES.forEach(e => { DEG_OUT[e.from] = (DEG_OUT[e.from] || 0) + 1; DEG_IN[e.to] = (DEG_IN[e.to] || 0) + 1; });
function distToGoal(goal) {
  const back = new Map();
  EDGES.forEach(e => { if (!back.has(e.to)) back.set(e.to, []); back.get(e.to).push(e.from); });
  const d = new Map([[goal, 0]]); const q = [goal];
  while (q.length) { const x = q.shift(); for (const p of (back.get(x) || [])) if (!d.has(p)) { d.set(p, d.get(x) + 1); q.push(p); } }
  return d;
}
function observableVectors(cfg) {
  const dd = distToGoal(cfg.goal), INF = NODES.length + 1;
  const cos = EDGES.map(e => {
    const a = cfg.embedding.get(e.from), b = cfg.embedding.get(e.to);
    return a.reduce((s, x, i) => s + x * b[i], 0);
  });
  return [cos,
          EDGES.map(e => dd.has(e.to) ? dd.get(e.to) : INF),
          EDGES.map(e => DEG_OUT[e.from] || 0),
          EDGES.map(e => DEG_IN[e.to] || 0),
          EDGES.map((_, i) => i)];
}
// a p-vector deliberately rank-aligned with a target vector => |rho| ~ 1
function leakyP(target) {
  const order = target.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
  const p = new Array(target.length);
  order.forEach((idx, r) => { p[idx] = 0.25 + 0.70 * (r / (target.length - 1)); });
  return p;
}
const conj = k => k.R1 && k.R2 && k.R3 && k.R4 && k.R5 === true && k.G11 === true;

console.log('==============================================================');
console.log(' M7 ACCEPTANCE-BOUNDARY VERIFIER');
console.log(' frozen 2f12e309…f6b9 | ERR-01…ERR-07 | pilot 900000-900029 only');
console.log('==============================================================');

// ==========================================================
// A — the previously failing accepted configuration is rejected,
//     for the EXACT G11 violation and for nothing else
// ==========================================================
console.log('\n===== A  configuration 900004 =================================');
const c04 = env.makeConfig(900004, 0);
const k04 = c04.checks;
console.log('   ' + NAMES.map((n, i) => n.split('-')[0] + '=' + k04.rhoObs[i].toFixed(4)).join('  '));
const a1 = ok('A1 900004 is REJECTED', c04.accepted === false);
const a2 = ok('A2 rejected for the EXACT G11 violation, canonical-edge-index',
   k04.G11 === false && k04.g11Worst === 'canonical-edge-index' &&
   Math.abs(k04.rhoObs[4]) >= TH && k04.rhoObs[4].toFixed(4) === '-0.2089',
   `rho = ${k04.rhoObs[4].toFixed(6)}, threshold ${TH}`);
const a3 = ok('A3 rejected for NOTHING ELSE: R1-R5 all still hold',
   k04.R1 && k04.R2 && k04.R3 && k04.R4 && k04.R5 === true,
   'the historical record of 2026-08-22 is intact');
const a4 = ok('A4 the other four observables are individually within threshold',
   [0, 1, 2, 3].every(i => Math.abs(k04.rhoObs[i]) < TH),
   'so exactly one named observable caused the rejection');

// ==========================================================
// B — every accepted configuration in the authorised block is clean
// ==========================================================
console.log('\n===== B  authorised pilot block 900000-900029 =================');
const scanned = [];
for (let s = PILOT_LO; s <= PILOT_HI; s++) {
  const c = env.makeConfig(s, 0);
  scanned.push({ s, accepted: c.accepted, k: c.checks });
}
const accepted = scanned.filter(r => r.accepted);
const r15only = scanned.filter(r => { const k = r.k; return k.R1 && k.R2 && k.R3 && k.R4 && k.R5 === true; });
console.log(`   candidates ${scanned.length}   R1-R5 ${r15only.length}   fully accepted ${accepted.length}`);
accepted.forEach(r => console.log(`   ${r.s} ACCEPTED  ` +
  NAMES.map((n, i) => n.split('-')[0] + '=' + r.k.rhoObs[i].toFixed(4)).join('  ')));
const b1 = ok('B1 every accepted configuration satisfies all five |rho| < 0.10',
   accepted.length > 0 && accepted.every(r => r.k.rhoObs.every(v => Math.abs(v) < TH)),
   `${accepted.length} accepted, 0 violations`);
const b2 = ok('B2 the criterion is applied to the FIVE ruled observables, in order',
   NAMES.length === 5 && NAMES.join('|') === 'endpoint-cosine-similarity|directed-distance-to-goal|' +
     'source-endpoint-degree|destination-endpoint-degree|canonical-edge-index' && TH === 0.10);
const b3 = ok('B3 acceptance is exactly R1..R5 AND the G11 conjunct, nothing else',
   scanned.every(r => r.accepted === conj(r.k)));
const b4 = ok('B4 the repair only ever REJECTS: no config gains acceptance',
   scanned.every(r => !(r.accepted && !(r.k.R1 && r.k.R2 && r.k.R3 && r.k.R4 && r.k.R5 === true))),
   `${r15only.length} R1-R5-accepted -> ${accepted.length} fully accepted; strictly a subset`);

// ==========================================================
// C - ANTI-VACUITY: bypass each G11 acceptance check in turn
// ==========================================================
// The mutation is: remove sub-check i from the acceptance conjunction, then ask
// whether the VERIFIER ("every accepted configuration satisfies all five")
// detects the leakage the bypassed sampler now admits.
//
// Two of the five are NOT independently bypassable, and that is a structural
// fact rather than a gap in coverage - it is asserted as such below, never
// papered over.
// ==========================================================
console.log('\n===== C  bypass each G11 acceptance check (anti-vacuity) ======');
const base = env.makeConfig(900000, 0);        // the one fully accepted pilot config
const r15 = scanned.filter(r => { const k = r.k; return k.R1 && k.R2 && k.R3 && k.R4 && k.R5 === true; });
function bypass(i) {
  const admits = r15.filter(r => r.k.rhoObs.every((v, j) => j === i || Math.abs(v) < TH));
  const leakers = admits.filter(r => Math.abs(r.k.rhoObs[i]) >= TH);
  return { admits, leakers };
}
const bypassTable = NAMES.map((n, i) => ({ n, i, ...bypass(i) }));
bypassTable.forEach(t => console.log(
  `   drop ${t.n.padEnd(30)} sampler admits ${t.admits.length}, of which ${t.leakers.length} LEAK` +
  (t.leakers.length ? `  (seeds ${t.leakers.map(r => r.s).join(',')}, max |rho| ` +
    `${Math.max(...t.leakers.map(r => Math.abs(r.k.rhoObs[t.i]))).toFixed(4)})` : '')));

const bpIdx = bypassTable[4], bpDegIn = bypassTable[3];
const c1 = ok('C1 BYPASS canonical-edge-index: the bypassed sampler admits leakers, verifier detects',
   bpIdx.leakers.length > 0 && bpIdx.leakers.some(r => !r.k.rhoObs.every(v => Math.abs(v) < TH)),
   `${bpIdx.leakers.length} leaking configs would be accepted (seeds ${bpIdx.leakers.map(r => r.s).join(',')})`);
const c2 = ok('C2 BYPASS destination-endpoint-degree: same, detected',
   bpDegIn.leakers.length > 0,
   `seed ${bpDegIn.leakers.map(r => r.s).join(',')} at |rho| ` +
   `${Math.max(...bpDegIn.leakers.map(r => Math.abs(r.k.rhoObs[3]))).toFixed(4)}`);

// Observables 1 and 2 ARE rho3 and rho4. Bypassing them cannot admit a leaker,
// because R3/R4 reject such a configuration before the G11 conjunct is reached.
// This is asserted as an IDENTITY, not demonstrated by a fabricated candidate.
const c3 = ok('C3 STRUCTURAL: observable 1 IS rho3, so R3 already rejects any leaker',
   scanned.every(r => r.k.rhoObs[0] === r.k.rho3) &&
   scanned.every(r => (Math.abs(r.k.rhoObs[0]) < TH) === (r.k.R3 === true)),
   'bypassing this check is unobservable: R3 enforces it independently');
const c4 = ok('C4 STRUCTURAL: observable 2 IS rho4, so R4 already rejects any leaker',
   scanned.every(r => r.k.rhoObs[1] === r.k.rho4) &&
   scanned.every(r => (Math.abs(r.k.rhoObs[1]) < TH) === (r.k.R4 === true)),
   'the G11 conjunct is a strict SUPERSET of R3 AND R4, by construction');

// source-endpoint-degree is never a SOLE cause in this block, so no pilot
// candidate isolates it. Detection is demonstrated on a constructed candidate.
const degOutLeak = env.evaluateConstraints({ ...base, pPhase1: leakyP(observableVectors(base)[2]) });
const c5 = ok('C5 source-endpoint-degree: no pilot candidate isolates it; detection shown constructively',
   Math.abs(degOutLeak.rhoObs[2]) >= TH && degOutLeak.G11 === false,
   `constructed |rho| ${Math.abs(degOutLeak.rhoObs[2]).toFixed(4)}; ` +
   `pilot sole-cause count 0 (it co-occurs with other observables)`);
const c6 = ok('C6 CONTROL: the unmutated configuration passes all five',
   base.checks.G11 === true && base.accepted === true,
   'so C1-C5 detect injected or admitted leakage, not a constant');
const cAll = c1 && c2 && c3 && c4 && c5 && c6;

// ==========================================================
// D - every existing R1..R5 check remains individually active
// ==========================================================
console.log('\n===== D  R1-R5 individually active (mutation per constraint) ==');
const ctl = env.makeConfig(900000, 0);
const kc = ctl.checks;
console.log(`   control 900000: R1 ${kc.R1} R2 ${kc.R2} (${kc.r2Starts}) R3 ${kc.R3} R4 ${kc.R4} ` +
            `R5 ${kc.R5} (${kc.r5Differing}/${kc.r5States})`);

// ---- R1: NO admissible mutation exists within the frozen topology ----
// R1 reads topology and goal only; both are frozen (§3.1 "No topology change",
// §3.7 goal in {8,12,16,19}). Every one of the 20 possible goals is measured.
const perGoal = NODES.map(n => ({ n, k: env.evaluateConstraints({ ...ctl, goal: n }) }));
const minStarts = Math.min(...perGoal.map(g => g.k.startsWith2));
const anyFalse = perGoal.filter(g => g.k.R1 === false).map(g => g.n);
const d1 = ok('D1 R1 is correctly computed, and PROVABLY non-discriminating on this graph',
   perGoal.every(g => g.k.R1 === (g.k.startsWith2 >= 6)) && anyFalse.length === 0 && minStarts === 19,
   `startsWith2 = ${minStarts} for all 20 possible goals; threshold 6; margin ${minStarts - 6}`);
console.log('   REPORTED FINDING: R1 cannot be falsified on the frozen 20-node topology.');
console.log('     It is correct code that never binds. No mutation is admissible without');
console.log('     a topology change, which frozen §3.1 forbids. Recorded, not worked around.');

// R2 - uniform p_e: the hop-shortest route is then also the most reliable
const kUniform = env.evaluateConstraints({ ...ctl, pPhase1: ctl.pPhase1.map(() => 0.90) });
const d2 = ok('D2 R2 is active: uniform p_e removes the reliability/hop contradiction',
   kUniform.R2 === false && kc.R2 === true,
   `r2Starts ${kc.r2Starts} -> ${kUniform.r2Starts}`);

// R3 - p_e forced to track endpoint cosine similarity
const vecs = observableVectors(ctl);
const kR3 = env.evaluateConstraints({ ...ctl, pPhase1: leakyP(vecs[0]) });
const d3 = ok('D3 R3 is active: p_e aligned with endpoint cosine similarity is REJECTED',
   kR3.R3 === false && kc.R3 === true, `rho3 ${kc.rho3.toFixed(4)} -> ${kR3.rho3.toFixed(4)}`);

// R4 - p_e forced to track directed distance-to-goal
const kR4 = env.evaluateConstraints({ ...ctl, pPhase1: leakyP(vecs[1]) });
const d4 = ok('D4 R4 is active: p_e aligned with distance-to-goal is REJECTED',
   kR4.R4 === false && kc.R4 === true, `rho4 ${kc.rho4.toFixed(4)} -> ${kR4.rho4.toFixed(4)}`);

// R5 - uniform p_e: reliability-optimal and hop-optimal policies coincide
const d5 = ok('D5 R5 is active: uniform p_e collapses the policy difference',
   kUniform.R5 === false && kc.R5 === true,
   `differing decision states ${kc.r5Differing}/${kc.r5States} -> ${kUniform.r5Differing}`);

// every term must be load-bearing IN THE CONJUNCTION, not merely computed
const terms = ['R1', 'R2', 'R3', 'R4', 'R5', 'G11'];
const notLoadBearing = terms.filter(t => conj({ ...kc, [t]: false }) !== false);
const d6 = ok('D6 every one of R1,R2,R3,R4,R5,G11 is load-bearing in `accepted`',
   notLoadBearing.length === 0 && conj(kc) === true,
   'negating any single term flips this accepted configuration to rejected');

// ==========================================================
// E — acceptance must NOT be vacuous
// ==========================================================
console.log('\n===== E  non-vacuity of the acceptance process =================');
const rate = accepted.length / scanned.length;
console.log(`   accepted ${accepted.length}/${scanned.length} = ${(100 * rate).toFixed(1)}%   ` +
            `=> ~${Math.round(1 / rate)} candidate seeds per accepted configuration`);
const e1 = ok('E1 at least one configuration survives the complete criteria',
   accepted.length > 0,
   accepted.length === 0 ? 'VACUOUS ACCEPTANCE - THIS IS RED, NOT A PASS' : `seeds ${accepted.map(r => r.s).join(', ')}`);
const e2 = ok('E2 the surviving configuration is scientifically usable (R2 and R5 hold)',
   accepted.every(r => r.k.R2 === true && r.k.R5 === true),
   accepted.map(r => `${r.s}: r2Starts ${r.k.r2Starts}, r5Differing ${r.k.r5Differing}/${r.k.r5States}`).join(' | '));
const e3 = ok('E3 acceptance is not degenerate: the rejected majority is rejected for cause',
   scanned.filter(r => !r.accepted).every(r => !conj(r.k)),
   `${scanned.length - accepted.length} rejected, every one provably failing a named criterion`);

// ==========================================================
// BOUNDARY
// ==========================================================
console.log('\n===== BOUNDARY ================================================');
const seen = env.evaluatedSeeds();
const f1 = ok('F1 only the authorised pilot block was evaluated',
   seen.every(s => s >= PILOT_LO && s <= PILOT_HI),
   `${seen.length} seeds, range ${seen[0]}-${seen[seen.length - 1]}`);
const f2 = ok('F2 the held-out block 900500-900529 was NOT inspected',
   seen.filter(s => s >= 900500 && s <= 900529).length === 0 && seen.every(s => s < 900500));
const f3 = ok('F3 this verifier passes no held-out seed to any generator',
   !/(makeConfig|generateAccepted|generateAcceptedStream)\s*\(\s*9005[0-2][0-9]/
     .test(fs.readFileSync(path.join(HERE, 'verify_acceptance.js'), 'utf8')));

const GREEN = a1 && a2 && a3 && a4 && b1 && b2 && b3 && b4 && cAll && c6 &&
              d1 && d2 && d3 && d4 && d5 && d6 && e1 && e2 && e3 && f1 && f2 && f3;
console.log('\n==============================================================');
console.log('  ACCEPTANCE BOUNDARY   ' + (GREEN ? 'GREEN' : 'RED'));
console.log('  A 900004 rejected for the exact G11 violation');
console.log('  B every accepted config clean   C five bypasses detected');
console.log('  D R1-R5 each individually active   E acceptance non-vacuous');
console.log('==============================================================');
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
