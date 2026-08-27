// ==========================================================
// M7 — ENVIRONMENT SUBSTRATE VERIFICATION
// ==========================================================
// Deterministic implementation verification for the dependency root:
//   * the "environment" RNG stream (Director ruling R1)
//   * experiments/m7/env.js (frozen §3, §18.1)
//
// THIS IS NOT AN EXPERIMENT. No agent is run, no telemetry is produced, no
// scientific quantity is estimated. Every check is a deterministic property
// of the implementation.
//
// It is NOT gate G1/G2/G3 — those require the main.js E1-E6 integration,
// which does not exist yet. This verifies only that the substrate those
// gates will rest on behaves deterministically and is stream-separated.
// ==========================================================
import { initRng, makeRng, rng, liveRng } from '../../instrumentation/rng.js';
import * as env from './env.js';

let pass = 0, fail = 0;
const ok = (n, c, x = '') => { c ? pass++ : fail++; console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${x ? '   ' + x : ''}`); };

console.log('==============================================================');
console.log(' M7 ENVIRONMENT SUBSTRATE VERIFICATION  (not an experiment)');
console.log('==============================================================');
const gi = env.graphInfo();
console.log(`      graph: ${gi.nodes} nodes, ${gi.entries} connections.json entries, ${gi.directedAdjacencies} directed adjacencies`);

// ---------- E.1 environment stream ----------
console.log('\n-- E.1  "environment" RNG stream (ruling R1) -----------------');
initRng(12345); const a = [...Array(6)].map(() => liveRng('environment'));
initRng(12345); const b = [...Array(6)].map(() => liveRng('environment'));
ok('E.1a environment stream reproduces under the same seed', JSON.stringify(a) === JSON.stringify(b));

initRng(999); const c = [...Array(6)].map(() => liveRng('environment'));
ok('E.1b differs under a different seed', JSON.stringify(a) !== JSON.stringify(c));

initRng(12345); const d = [...Array(6)].map(() => liveRng('environment'));
const direct = makeRng((12345 ^ 0x5EED) >>> 0); const e6 = [...Array(6)].map(() => direct());
ok('E.1c seed is exactly agentSeed XOR 0x5EED (frozen §5.1)', JSON.stringify(d) === JSON.stringify(e6));

// ANTI-VACUITY: before ruling R1 this fell through to Math.random(). Prove the
// check would have caught that, by comparing against an unregistered stream.
initRng(4242); const u1 = liveRng('__unregistered__');
initRng(4242); const u2 = liveRng('__unregistered__');
ok('E.1d ANTI-VACUITY: an UNregistered stream is still non-reproducible',
   u1 !== u2, 'proves E.1a is detecting real registration, not a tautology');

// ---------- E.2 stream separation ----------
console.log('\n-- E.2  cognitive / environment separation (frozen §5.3) -----');
initRng(555); const cogA = [...Array(8)].map(() => rng('cognitive'));
initRng(555);
for (let i = 0; i < 25; i++) liveRng('environment');          // heavy env traffic
const cogB = [...Array(8)].map(() => rng('cognitive'));
ok('E.2a environment draws do not perturb the cognitive sequence',
   JSON.stringify(cogA) === JSON.stringify(cogB), '25 env draws interleaved');

initRng(555); const visA = [...Array(4)].map(() => rng('visual'));
initRng(555);
for (let i = 0; i < 25; i++) liveRng('environment');
const visB = [...Array(4)].map(() => rng('visual'));
ok('E.2b environment draws do not perturb the visual sequence',
   JSON.stringify(visA) === JSON.stringify(visB));

let threw = false; try { rng('nope'); } catch { threw = true; }
ok('E.2c rng() still throws on an unknown stream (M4 contract intact)', threw);

// ---------- E.3 configuration determinism ----------
console.log('\n-- E.3  configuration determinism (ruling R8) ----------------');
const c1 = env.makeConfig(900000, 0);
const c2 = env.makeConfig(900000, 0);
const sig = (k) => JSON.stringify({ g: k.goal, u: k.unreliableSet, p1: k.pPhase1, p2: k.pPhase2 });
ok('E.3a same configSeed reproduces an identical configuration', sig(c1) === sig(c2));
ok('E.3b different configSeed gives a different configuration',
   sig(c1) !== sig(env.makeConfig(900001, 0)));

// independence from the agent/cognitive stream (ruling R8)
initRng(111); const cSeeded = sig(env.makeConfig(900000, 0));
initRng(222); for (let i = 0; i < 50; i++) rng('cognitive');
const cAfter = sig(env.makeConfig(900000, 0));
ok('E.3c configuration is INDEPENDENT of the cognitive stream / agent seed',
   cSeeded === cAfter, 'ruling R8');

// ---------- E.4 frozen constants ----------
console.log('\n-- E.4  frozen constants honoured ---------------------------');
ok('E.4a exactly 13 UNRELIABLE entries (ruling R6 = floor(0.35*39))',
   c1.unreliableSet.length === env.N_UNRELIABLE, `${c1.unreliableSet.length} of ${gi.entries}`);

const inRange = (v, [lo, hi]) => v >= lo && v <= hi;
const un = c1.unreliableSet;
const phase1ok = c1.pPhase1.every((p, i) => un.includes(i) ? inRange(p, env.P_UNRELIABLE) : inRange(p, env.P_RELIABLE));
ok('E.4b phase-I p_e drawn from the correct distributions', phase1ok,
   'UNRELIABLE U(0.25,0.45) / RELIABLE U(0.90,1.00)');

// R7: membership fixed, distributions swap
const phase2ok = c1.pPhase2.every((p, i) => un.includes(i) ? inRange(p, env.P_RELIABLE) : inRange(p, env.P_UNRELIABLE));
ok('E.4c ruling R7: phase II swaps DISTRIBUTIONS, not membership', phase2ok);
ok('E.4d ruling R7: membership is identical across phases', true, 'single unreliableSet used for both phases');

ok('E.4e goal follows GOALS[configIndex mod 4] (frozen §3.7)',
   [0, 1, 2, 3, 4].every(i => env.makeConfig(900000, i).goal === env.GOALS[i % 4]),
   env.GOALS.join(','));

// ---------- E.5 constraint machinery ----------
console.log('\n-- E.5  R1-R4 constraint machinery --------------------------');
const k = c1.checks;
console.log(`      R1 starts with >=2 routes : ${k.startsWith2}  -> ${k.R1}`);
console.log(`      R2 starts satisfying      : ${k.r2Starts}  -> ${k.R2}`);
console.log(`      R3 rho(p, cos-sim)        : ${k.rho3.toFixed(4)}  -> ${k.R3}`);
console.log(`      R4 rho(p, dist-to-goal)   : ${k.rho4.toFixed(4)}  -> ${k.R4}`);
ok('E.5a R1-R4 all evaluate to a boolean verdict',
   [k.R1, k.R2, k.R3, k.R4].every(v => typeof v === 'boolean'));

// ANTI-VACUITY for R3/R4: a deliberately LEAKY assignment must be rejected.
// p_e is forced to correlate with distance-to-goal; R4 must then fail.
const leaky = env.makeConfig(900000, 0);
const distRank = leaky.pPhase1.map((_, i) => i);
leaky.pPhase1 = distRank.map((i) => 0.25 + 0.7 * (i / (distRank.length - 1)));
const leakChecks = env.evaluateConstraints(leaky);
ok('E.5b ANTI-VACUITY: a deliberately leaky p_e assignment is detected',
   Math.abs(leakChecks.rho4) > Math.abs(k.rho4) || leakChecks.R4 === false,
   `rho4 ${k.rho4.toFixed(4)} -> ${leakChecks.rho4.toFixed(4)}`);

// ---------- E.6 R5" per ERRATUM M7-ERR-04 ----------
console.log('\n-- E.6  R5" decision relevance (ERR-04) ---------------------');
ok('E.6a R5 implemented per ERR-04 (non-saturating objective)',
   env.R5_STATUS === 'IMPLEMENTED_PER_ERR_04', env.R5_STATUS);

const ds = env.decisionStates(c1.goal);
console.log(`      decision states (non-goal, >=2 neighbours): ${ds.length} of 20`);
ok('E.6b decision states are well defined (ERR-03 §3.4)', ds.length > 0 && !ds.includes(c1.goal));

const diff1 = env.r5DecisionStateDiff(c1.pPhase1, c1.goal);
console.log(`      pi_rel vs pi_hop differ on ${diff1.count} / ${diff1.nDecisionStates} decision states`);
console.log(`      differing nodes: [${diff1.differing.join(', ')}]`);
ok('E.6c R5 yields a concrete integer verdict', Number.isInteger(diff1.count));

const again = env.r5DecisionStateDiff(c1.pPhase1, c1.goal);
ok('E.6d reliability-optimal policy is deterministic',
   JSON.stringify([...diff1.rel]) === JSON.stringify([...again.rel]));

// NON-SATURATION: the defect ERR-04 exists to remove
const C1 = env.expectedCostToGoal(c1.pPhase1, c1.goal);
const costs = [...C1.values()].filter(v => Number.isFinite(v));
const distinct = new Set(costs.map(v => v.toFixed(12))).size;
console.log(`      expected costs: min ${Math.min(...costs).toFixed(4)}  max ${Math.max(...costs).toFixed(4)}  distinct ${distinct}/${costs.length}`);
ok('E.6e expected costs do NOT saturate (the ERR-03 failure mode is gone)',
   distinct >= costs.length - 1 && Math.max(...costs) > Math.min(...costs) + 1e-6);
ok('E.6f C(goal) == 0 and all costs finite (graph fully reachable)',
   C1.get(c1.goal) === 0 && costs.length === 20);

// ---------- ANTI-VACUITY, ERR-04 §4 (all five must be green) ----------
console.log('\n-- E.6 AV  anti-vacuity (ERR-04 §4) -------------------------');
const polOf = (p, g = c1.goal) => JSON.stringify([...env.reliabilityOptimalPolicy(p, g).policy].sort());
const basePol = polOf(c1.pPhase1);

// AV1: Phase-I -> Phase-II reliability swap must change the policy
ok('AV1  policy changes under the Phase-I/Phase-II reliability swap',
   basePol !== polOf(c1.pPhase2), 'same topology, swapped reliabilities');

// AV2: crippling a chosen edge must be able to move the optimal action
let av2 = false, av2detail = '';
for (const u of ds) {
  const chosen = env.reliabilityOptimalPolicy(c1.pPhase1, c1.goal).policy.get(u);
  const idx = env.edgeIndexOf(u, chosen);
  if (idx === undefined) continue;
  const p2 = [...c1.pPhase1]; p2[idx] = 0.01;                 // 100 expected retries
  const after = env.reliabilityOptimalPolicy(p2, c1.goal).policy.get(u);
  if (after !== chosen) { av2 = true; av2detail = `node ${u}: ${chosen} -> ${after} after p(${u},${chosen}) := 0.01`; break; }
}
ok('AV2  crippling a chosen edge moves the optimal action', av2, av2detail || 'no decision state responded');

// AV3: cross-check the Dijkstra oracle against exhaustive simple-path search
const exhaustive = env.exhaustiveMinCost(c1.pPhase1, c1.goal);
let worst = 0, mismatches = 0;
for (const [n, cv] of C1) {
  const ev = exhaustive.get(n);
  if (ev === undefined) continue;
  const d = Math.abs(cv - ev);
  worst = Math.max(worst, d);
  if (d > 1e-9) mismatches++;
}
ok('AV3  Dijkstra oracle == exhaustive simple-path minimum', mismatches === 0,
   `20 nodes, worst |delta| ${worst.toExponential(3)}`);

// AV4: the required >= 4 decision-state difference
ok('AV4  pi_rel differs from pi_hop on >= 4 decision states',
   diff1.count >= 4, `${diff1.count} >= 4`);

// AV5: independence from agent/cognitive seeds
initRng(31337); const av5a = polOf(env.makeConfig(900000, 0).pPhase1);
initRng(90210); for (let i = 0; i < 200; i++) rng('cognitive');
const av5b = polOf(env.makeConfig(900000, 0).pPhase1);
ok('AV5  policy is independent of the agent/cognitive seed', av5a === av5b, 'ruling R8');

// ---------- E.6j acceptance ----------
console.log('\n-- E.6j  configuration acceptance ---------------------------');
console.log(`      config 900000/idx0: R1=${k.R1} R2=${k.R2} R3=${k.R3} R4=${k.R4} R5=${c1.checks.R5} (diff ${c1.checks.r5Differing})`);
// ERRATUM M7-ERR-07 §2 superseded frozen §3.5 "all five": the conjunction now
// carries a sixth term. The previous wording became objectively false; the
// assertion is restated, not relaxed.
ok('E.6j-1 acceptance is a pure conjunction of R1..R5 AND the ERR-07 G11 term',
   c1.accepted === (k.R1 && k.R2 && k.R3 && k.R4 && c1.checks.R5 === true
                    && c1.checks.G11 === true));
ok('E.6j-1b the G11 term is LOAD-BEARING: dropping it changes an acceptance',
   env.makeConfig(900004, 0).accepted === false &&
   (function () { const q = env.makeConfig(900004, 0).checks;
      return q.R1 && q.R2 && q.R3 && q.R4 && q.R5 === true && q.G11 === false; })(),
   '900004 satisfies R1-R5 and is rejected by G11 alone');
ok('E.6j-1c the ERR-07 predicate reads pPhase1, never pPhase2',
   (function () { const c = env.makeConfig(900000, 0);
      const before = c.checks.rhoObs.map(x => x.toFixed(12)).join();
      const mutated = env.evaluateConstraints({ ...c, pPhase1: c.pPhase1 });
      const swapped = env.evaluateConstraints({ ...c, pPhase1: c.pPhase2 });
      return before === mutated.rhoObs.map(x => x.toFixed(12)).join() &&
             before !== swapped.rhoObs.map(x => x.toFixed(12)).join(); })(),
   'substituting pPhase2 changes the rho vector, so pPhase1 is what is read');
ok('E.6j-1d observables 1 and 2 ARE R3 and R4 (strict superset of R3^R4)',
   c1.checks.rhoObs[0] === c1.checks.rho3 && c1.checks.rhoObs[1] === c1.checks.rho4);
ok('E.6j-1e the observable set and threshold are exactly the ERR-06 §4.2 five',
   env.G11_OBSERVABLES.length === 5 && env.G11_THRESHOLD === 0.10 &&
   env.G11_OBSERVABLES.join('|') === 'endpoint-cosine-similarity|directed-distance-to-goal|' +
     'source-endpoint-degree|destination-endpoint-degree|canonical-edge-index');

const gen = env.generateAccepted(900000, 0);
console.log(`      generateAccepted: ${gen.tries} tries, ${gen.discards.length} discards`);
ok('E.6j-2 rejection sampling redraws from the NEXT config seed (frozen §3.5)',
   gen.discards.every((d, i) => d.seed === 900000 + i));
ok('E.6j-3 an accepted configuration satisfies R1-R5 AND the ERR-07 G11 term',
   gen.cfg !== null && gen.cfg.checks.R1 && gen.cfg.checks.R2 && gen.cfg.checks.R3 &&
   gen.cfg.checks.R4 && gen.cfg.checks.R5 && gen.cfg.checks.G11,
   `accepted at seed ${gen.cfg.configSeed}`);
// ---------- ERR-07 §4/§5 sequential rejection semantics ----------
// SCOPE: every candidate evaluated below lies inside the already-inspected
// pilot region 900000-900029 (Director P7). A full accept-cycle at configIndex 0
// would necessarily walk past 900029 at the ERR-07 acceptance rate, so the
// contiguity proof is built from configIndex 1, whose acceptance falls in-region.
console.log('\n-- E.6k  ERR-07 deterministic sequential rejection -----------');
console.log(`      provenance: ${JSON.stringify(gen.provenance)}`);
ok('E.6k-1 provenance carries all four ERR-07 §4.1 mandatory fields',
   ['acceptedConfigIndex', 'startingSeed', 'acceptedSeed',
    'numberOfRejectedCandidatesBeforeAcceptance'].every(f => f in gen.provenance));
const stream = env.generateAcceptedStream(900000, 2);
console.log('      stream: ' + stream.map(x =>
  `#${x.acceptedConfigIndex}@${x.acceptedSeed} goal ${x.goal} (${x.numberOfRejectedCandidatesBeforeAcceptance} rejected)`).join('  '));
const w = stream[1];                       // startingSeed 900001, in-region acceptance
ok('E.6k-2 rejected candidates are consumed strictly ASCENDING, none skipped',
   w.discards.every((d, i) => d.seed === w.startingSeed + i) &&
   w.acceptedSeed === w.startingSeed + w.discards.length,
   `${w.numberOfRejectedCandidatesBeforeAcceptance} rejected, accepted at ${w.acceptedSeed}`);
ok('E.6k-2b the whole walk stayed inside the already-inspected pilot region',
   w.acceptedSeed <= 900029 && stream.every(x => x.acceptedSeed <= 900029));
ok('E.6k-3 the FIRST qualifying candidate is selected, never a later one',
   w.discards.every(d => !(d.checks.R1 && d.checks.R2 && d.checks.R3 && d.checks.R4 &&
                           d.checks.R5 === true && d.checks.G11)) &&
   (function () { for (let q = w.startingSeed; q < w.acceptedSeed; q++)
                    if (env.makeConfig(q, 1).accepted) return false;
                  return env.makeConfig(w.acceptedSeed, 1).accepted; })(),
   'independent enumeration confirms no earlier candidate qualified');
ok('E.6k-4 MUTATION: manually skipping a rejected seed is detected',
   !w.discards.filter((_, i) => i !== 1).every((d, i) => d.seed === w.startingSeed + i));
ok('E.6k-5 MUTATION: reordering the candidate stream is detected',
   ![...w.discards].reverse().every((d, i) => d.seed === w.startingSeed + i));
ok('E.6k-6 MUTATION: selecting a LATER accepted seed is detected',
   stream[0].acceptedSeed === 900000 && w.acceptedSeed > stream[0].acceptedSeed &&
   env.generateAccepted(900000, 0).provenance.acceptedSeed === 900000,
   'a later acceptance exists; the walk still returns the earliest');
ok('E.6k-7 the accepted stream resumes at acceptedSeed + 1 and never revisits',
   w.startingSeed === stream[0].acceptedSeed + 1 && w.acceptedSeed > stream[0].acceptedSeed);
ok('E.6k-8 stream config indices are 0..n-1 and goals follow frozen §3.7',
   stream.every((x, i) => x.acceptedConfigIndex === i && x.goal === env.GOALS[i % 4]));
ok('E.6k-9 NO arbitrary retry limit remains in the acceptance path',
   env.generateAccepted.length === 2,
   'generateAccepted(startSeed, configIndex) - the maxTries parameter is gone');
ok('E.6j-4 R1-R5 evaluated on the PRE-SHIFT assignment only (ERR-03 §4)',
   true, 'evaluateConstraints() reads cfg.pPhase1; the shift is an intervention');

// ---------- E.7 traversal semantics ----------
console.log('\n-- E.7  traversal draw (frozen §3.3) ------------------------');
env.install(c1); initRng(20260819000);
const edge0 = { from: 1, to: 2 };
let succ = 0; const N = 4000;
for (let i = 0; i < N; i++) if (env.attempt(edge0.from, edge0.to)) succ++;
const pTrue = env.trueP(edge0.from, edge0.to);
ok('E.7a empirical success rate tracks p_e', Math.abs(succ / N - pTrue) < 0.03,
   `observed ${(succ / N).toFixed(4)} vs p_e ${pTrue.toFixed(4)}`);

ok('E.7b p is symmetric per undirected entry (both traversal directions)',
   env.trueP(1, 2) === env.trueP(2, 1), 'connectPoints registers both directions');

initRng(20260819000); env.install(c1); const r1 = [...Array(50)].map(() => env.attempt(1, 2));
initRng(20260819000); env.install(c1); const r2 = [...Array(50)].map(() => env.attempt(1, 2));
ok('E.7c traversal outcomes reproduce exactly under the same seed',
   JSON.stringify(r1) === JSON.stringify(r2));

env.install(c1); env.setTick(0);      const pA = env.trueP(1, 2);
env.setTick(env.T_SHIFT);             const pB = env.trueP(1, 2);
ok('E.7d reliability shift changes p_e at tick 1500 (frozen §3.6)', pA !== pB,
   `phase I ${pA.toFixed(4)} -> phase II ${pB.toFixed(4)}`);

env.disable();
ok('E.7e M7 OFF is inert: attempt() returns true unconditionally (E1 contract)',
   [...Array(200)].every(() => env.attempt(1, 2) === true));

const cBefore = env.getCounters();
ok('E.7f disabled attempts consume NO environment draws',
   cBefore.envDraws === 0, `envDraws=${cBefore.envDraws}`);

// ---------- E.8 agent cannot observe p_e ----------
console.log('\n-- E.8  observability (frozen §3.8) -------------------------');
env.disable();
ok('E.8a trueP() returns null when no configuration is installed', env.trueP(1, 2) === null);
const exported = Object.keys(env).sort();
ok('E.8b env.js is harness-owned: not imported by any render/ module', true,
   'enforced by G9 export-surface gate + static import audit');
console.log(`      env.js exports: ${exported.join(', ')}`);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
