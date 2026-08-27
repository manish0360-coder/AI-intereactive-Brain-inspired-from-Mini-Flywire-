// ==========================================================
// M7 — ARM SUBSTRATE VERIFICATION
// ==========================================================
// Deterministic implementation verification for experiments/m7/arms.js
// against frozen M7_PREREGISTRATION.md §4, §4.1, §4.2, §4.3, §5.1 and the
// G4/G5/G6 acceptance criteria.
//
// THIS IS NOT AN EXPERIMENT. No agent is run, no telemetry is produced, no
// scientific quantity is estimated. It is NOT gate G4/G5/G6 -- those require
// the main.js E3/E4 integration, which does not exist yet. This verifies only
// that the switch substrate behaves as the frozen arm table specifies.
// ==========================================================
import { initRng } from '../../instrumentation/rng.js';
import * as env from './env.js';
import * as arms from './arms.js';

let pass = 0, fail = 0;
const ok = (n, c, x = '') => { c ? pass++ : fail++; console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${x ? '   ' + x : ''}`); };

console.log('==============================================================');
console.log(' M7 ARM SUBSTRATE VERIFICATION  (not an experiment)');
console.log('==============================================================');

// deterministic stand-in for getPathTrust: distinct value per edge, so a
// shuffled lookup is always distinguishable from the un-shuffled one.
const trustOf = (a, b) => {
  const i = arms.edgeIndex(a, b);
  return i === undefined ? 0.5 : 0.01 + i * 0.02;      // 0.01 .. 0.77, all distinct
};
const RAW = 0.9137;                                     // arbitrary raw trust probe value
const AGG = 0.6421;                                     // arbitrary raw aggregate probe value
const E = { from: 1, to: 2 };

// ---------- A.1 edge indexing agrees with env.js ----------
console.log('\n-- A.1  edge indexing agrees with env.js --------------------');
let idxMismatch = 0;
for (let i = 0; i < arms.edgeCount(); i++) {
  const e = arms.edgeAt(i);
  if (env.edgeIndexOf(e.from, e.to) !== i || arms.edgeIndex(e.from, e.to) !== i) idxMismatch++;
}
ok('A.1a arms.js edge indices == env.js edge indices', idxMismatch === 0,
   `${arms.edgeCount()} entries, connections.json file order`);
ok('A.1b edge count is the frozen 39', arms.edgeCount() === 39);

// ---------- A.2 default OFF ----------
console.log('\n-- A.2  default OFF state (frozen §18.1 "all default-off") --');
arms.reset();
ok('A.2a default arm is OFF', arms.current().arm === arms.OFF, JSON.stringify(arms.current()));
ok('A.2b OFF: bayesianTrust is an identity passthrough',
   arms.bayesianTrustFor(E.from, E.to, RAW) === RAW);
ok('A.2c OFF: aggregateTrust is an identity passthrough', arms.aggregateTrustFor(AGG) === AGG);
ok('A.2d OFF: Q updates allowed', arms.allowsQUpdate() === true);
ok('A.2e OFF: trust updates allowed', arms.allowsTrustUpdate() === true);
ok('A.2f OFF: action selection unchanged', arms.usesUniformActionSelection() === false);
ok('A.2g OFF: prediction-error pathway NOT pinned (not an M7 run)',
   arms.pinsPredictionErrorPathway() === false);
ok('A.2h OFF: no sigma exists', arms.sigma() === null);

// ---------- A.3 the seven arms exist and activate independently ----------
console.log('\n-- A.3  all seven switches activate independently -----------');
ok('A.3a exactly seven arms are defined', arms.ARMS.length === 7, arms.ARMS.join(','));
ok('A.3b frozen §4.2 locked arms are present',
   arms.LOCKED_ARMS.every(a => arms.ARMS.includes(a)), arms.LOCKED_ARMS.join(','));

let activated = 0;
for (const a of arms.ARMS) {
  arms.reset();
  arms.configure({ arm: a, agentSeed: 20260819000, trustOf });
  if (arms.current().arm === a) activated++;
}
ok('A.3c every arm can be activated independently', activated === 7, `${activated}/7`);

// ---------- A.4 each arm alters ONLY its authorised mechanism ----------
console.log('\n-- A.4  per-arm mechanism isolation (frozen §4) --------------');
const probe = (a) => {
  arms.reset();
  arms.configure({ arm: a, agentSeed: 20260819000, trustOf });
  return {
    bt:   arms.bayesianTrustFor(E.from, E.to, RAW),
    agg:  arms.aggregateTrustFor(AGG),
    q:    arms.allowsQUpdate(),
    tu:   arms.allowsTrustUpdate(),
    uni:  arms.usesUniformActionSelection(),
    pin:  arms.pinsPredictionErrorPathway()
  };
};

// install a configuration so A7 ORACLE has a p_e to read
const cfg = env.makeConfig(900000, 0);
env.install(cfg);
const trueP = env.trueP(E.from, E.to);

const P = Object.fromEntries(arms.ARMS.map(a => [a, probe(a)]));
console.log(`      raw trust ${RAW}   raw aggregate ${AGG}   true p_e ${trueP.toFixed(6)}`);
for (const a of arms.ARMS)
  console.log(`      ${a} ${String(arms.ARM_NAMES[a]).padEnd(15)} bt=${String(P[a].bt).padEnd(20)} agg=${String(P[a].agg).padEnd(8)} q=${P[a].q} trust=${P[a].tu} uni=${P[a].uni}`);

// A1 BELIEF — full passthrough on both routes
ok('A.4-A1 BELIEF: both trust routes live (identity passthrough)',
   P.A1.bt === RAW && P.A1.agg === AGG && P.A1.q && P.A1.tu && !P.A1.uni);

// A2 ABLATION — BOTH routes severed (frozen §4.1), Q intact
ok('A.4-A2 ABLATION: bayesianTrust = 0.5 AND aggregateTrust = null',
   P.A2.bt === 0.5 && P.A2.agg === null, 'frozen §4.1 requires BOTH routes cut');
ok('A.4-A2b ABLATION: Q-learning fully intact', P.A2.q === true && P.A2.tu === true);

// A3 RANDOM — only action selection
ok('A.4-A3 RANDOM: uniform action selection, trust routes untouched',
   P.A3.uni === true && P.A3.bt === RAW && P.A3.agg === AGG);
ok('A.4-A3b RANDOM: it is the ONLY arm using uniform selection',
   arms.ARMS.filter(a => P[a].uni).length === 1);

// A4 FROZEN — only learning disabled
ok('A.4-A4 FROZEN: Q and trust updates disabled',
   P.A4.q === false && P.A4.tu === false);
ok('A.4-A4b FROZEN: scoring heuristics intact (trust routes passthrough)',
   P.A4.bt === RAW && P.A4.agg === AGG);
ok('A.4-A4c FROZEN: it is the ONLY arm disabling learning',
   arms.ARMS.filter(a => !P[a].q || !P[a].tu).length === 1);

// A5 AGGREGATE-ONLY — per-edge severed, aggregate live
ok('A.4-A5 AGGREGATE-ONLY: per-edge severed, aggregate LIVE',
   P.A5.bt === 0.5 && P.A5.agg === AGG, 'the A2/A5 contrast isolates per-edge discrimination');

// A6 SHUFFLED — trust(sigma(e))
arms.reset(); arms.configure({ arm: 'A6', agentSeed: 20260819000, trustOf });
const i0 = arms.edgeIndex(E.from, E.to);
const s = arms.sigma();
const tgt = arms.edgeAt(s[i0]);
ok('A.4-A6 SHUFFLED: bayesianTrust = trust(sigma(e))',
   P.A6.bt === trustOf(tgt.from, tgt.to),
   `edge ${i0} -> sigma ${s[i0]} (${tgt.from}->${tgt.to}) = ${P.A6.bt}`);
ok('A.4-A6b SHUFFLED: the delivered value differs from the raw one',
   P.A6.bt !== RAW && P.A6.bt !== trustOf(E.from, E.to));
ok('A.4-A6c SHUFFLED: aggregate route untouched', P.A6.agg === AGG);

// A7 ORACLE — the true hidden value
ok('A.4-A7 ORACLE: bayesianTrust = p_e exactly', P.A7.bt === trueP, `${P.A7.bt} === ${trueP}`);
ok('A.4-A7b ORACLE: aggregate route untouched', P.A7.agg === AGG);

// ---------- A.5 G6 sigma validity ----------
console.log('\n-- A.5  sigma validity (frozen G6, §5.1) --------------------');
const sg = arms.makeSigma(20260819000);
ok('A.5a sigma is a bijection over all 39 edges',
   new Set(sg).size === 39 && sg.every(v => v >= 0 && v < 39));
ok('A.5b sigma has NO fixed point (a derangement)', sg.every((v, i) => v !== i));
ok('A.5c sigma is deterministic from agentSeed XOR 0xBEEF (frozen §5.1)',
   JSON.stringify(arms.makeSigma(20260819000)) === JSON.stringify(sg));
ok('A.5d different agent seeds give different sigma',
   JSON.stringify(arms.makeSigma(20260819001)) !== JSON.stringify(sg));

// G6: "delivered value multiset equals A1's at every tick"
const allEdges = [...Array(39).keys()].map(i => arms.edgeAt(i));
arms.reset(); arms.configure({ arm: 'A1', agentSeed: 20260819000, trustOf });
const a1Vals = allEdges.map(e => arms.bayesianTrustFor(e.from, e.to, trustOf(e.from, e.to))).sort((x, y) => x - y);
arms.reset(); arms.configure({ arm: 'A6', agentSeed: 20260819000, trustOf });
const a6Vals = allEdges.map(e => arms.bayesianTrustFor(e.from, e.to, trustOf(e.from, e.to))).sort((x, y) => x - y);
ok('A.5e G6: delivered value MULTISET equals A1 (distribution preserved)',
   JSON.stringify(a1Vals) === JSON.stringify(a6Vals));
arms.reset(); arms.configure({ arm: 'A6', agentSeed: 20260819000, trustOf });
const a6Order = allEdges.map(e => arms.bayesianTrustFor(e.from, e.to, trustOf(e.from, e.to)));
const a1Order = allEdges.map(e => trustOf(e.from, e.to));
ok('A.5f G6: per-edge CORRESPONDENCE is destroyed (order differs)',
   JSON.stringify(a6Order) !== JSON.stringify(a1Order), 'same values, wrong edges — the C5 control');

// ---------- A.6 unrelated switches unaffected ----------
console.log('\n-- A.6  unrelated switches remain unaffected ----------------');
let crossTalk = [];
for (const a of arms.ARMS) {
  const p = P[a];
  if (a !== 'A3' && p.uni) crossTalk.push(`${a} set uniform selection`);
  if (a !== 'A4' && (!p.q || !p.tu)) crossTalk.push(`${a} disabled learning`);
  if (!['A2', 'A5', 'A6', 'A7'].includes(a) && p.bt !== RAW) crossTalk.push(`${a} altered bayesianTrust`);
  if (a !== 'A2' && p.agg !== AGG) crossTalk.push(`${a} altered aggregateTrust`);
}
ok('A.6a no arm alters a mechanism it does not own', crossTalk.length === 0,
   crossTalk.length ? crossTalk.join('; ') : '7 arms x 6 mechanisms checked');

ok('A.6b frozen §4.3: the PE pathway is pinned identically for all seven arms',
   arms.ARMS.every(a => P[a].pin === true), 'learningAuthority = 1.0, dampQ off — not an arm switch');

// ---------- A.7 no state mutation across activations ----------
console.log('\n-- A.7  repeated / interleaved activation is clean -----------');
const first = JSON.stringify(P);
const replay = JSON.stringify(Object.fromEntries(arms.ARMS.map(a => [a, probe(a)])));
ok('A.7a re-activating every arm reproduces identical behaviour', first === replay);

// interleave in a different order, then re-probe
for (const a of ['A7', 'A3', 'A6', 'A2', 'A5', 'A4', 'A1']) probe(a);
const afterInterleave = JSON.stringify(Object.fromEntries(arms.ARMS.map(a => [a, probe(a)])));
ok('A.7b activating arms in a different order mutates no arm state', first === afterInterleave);

arms.reset(); arms.configure({ arm: 'A6', agentSeed: 20260819000, trustOf });
const sigA = JSON.stringify(arms.sigma());
arms.configure({ arm: 'A2' });
arms.configure({ arm: 'A6', agentSeed: 20260819000, trustOf });
ok('A.7c sigma is rebuilt identically after switching away and back',
   JSON.stringify(arms.sigma()) === sigA);
arms.configure({ arm: 'A2' });
ok('A.7d leaving A6 clears sigma', arms.sigma() === null);

arms.reset();
ok('A.7e reset() returns the module to OFF', arms.current().arm === arms.OFF && arms.sigma() === null);

// ---------- A.8 invalid identifiers fail loudly ----------
console.log('\n-- A.8  invalid arm identifiers fail loudly -----------------');
const throws = (fn) => { try { fn(); return false; } catch { return true; } };
ok('A.8a unknown arm id throws', throws(() => arms.configure({ arm: 'A8' })));
ok('A.8b lowercase arm id throws (no silent coercion)', throws(() => arms.configure({ arm: 'a1' })));
ok('A.8c empty-string arm id throws', throws(() => arms.configure({ arm: '' })));
ok('A.8d numeric arm id throws', throws(() => arms.configure({ arm: 1 })));
ok('A.8e A6 without an agentSeed throws (frozen §5.1)',
   throws(() => arms.configure({ arm: 'A6', trustOf })));
ok('A.8f A6 without a trustOf lookup throws',
   throws(() => arms.configure({ arm: 'A6', agentSeed: 20260819000 })));
arms.reset();
ok('A.8g a rejected configure() leaves the module OFF', arms.current().arm === arms.OFF);

// ---------- A.9 ANTI-VACUITY ----------
// The verifier must REJECT a mutated switch definition. Mutations are applied
// to in-memory copies of the observed behaviour; arms.js is never written to.
console.log('\n-- A.9  ANTI-VACUITY: mutated definitions must be rejected --');

// the exact predicates A.4 relies on, restated as a checkable spec
const spec = {
  A1: p => p.bt === RAW && p.agg === AGG && p.q && p.tu && !p.uni,
  A2: p => p.bt === 0.5 && p.agg === null && p.q && p.tu,
  A3: p => p.uni === true && p.bt === RAW && p.agg === AGG,
  A4: p => p.q === false && p.tu === false && p.bt === RAW,
  A5: p => p.bt === 0.5 && p.agg === AGG,
  A7: p => p.bt === trueP && p.agg === AGG
};
const mutate = (a, patch) => ({ ...P[a], ...patch });

ok('A.9a rejects A2 severing only the per-edge route (the §4.1 trap)',
   spec.A2(P.A2) && !spec.A2(mutate('A2', { agg: AGG })),
   'A2 with a live aggregate must FAIL');
ok('A.9b rejects A5 if the aggregate were also severed',
   spec.A5(P.A5) && !spec.A5(mutate('A5', { agg: null })));
ok('A.9c rejects A7 delivering raw trust instead of p_e',
   spec.A7(P.A7) && !spec.A7(mutate('A7', { bt: RAW })));
ok('A.9d rejects A4 leaving learning enabled',
   spec.A4(P.A4) && !spec.A4(mutate('A4', { q: true })));
ok('A.9e rejects A3 failing to set uniform selection',
   spec.A3(P.A3) && !spec.A3(mutate('A3', { uni: false })));
ok('A.9f rejects A1 silently severing a route',
   spec.A1(P.A1) && !spec.A1(mutate('A1', { bt: 0.5 })));

// sigma anti-vacuity: an identity permutation must be rejected as invalid
const identity = [...Array(39).keys()];
const isDerangement = (x) => new Set(x).size === 39 && x.every((v, i) => v !== i);
ok('A.9g rejects an identity permutation as sigma (fixed points)',
   isDerangement(sg) && !isDerangement(identity));
const withFixed = [...sg]; const swapAt = withFixed.indexOf(0); withFixed[swapAt] = withFixed[0]; withFixed[0] = 0;
ok('A.9h rejects a permutation with a single fixed point',
   !isDerangement(withFixed), 'one fixed point is enough to fail G6');

// ---------- A.10 full default vector == baseline semantics ----------
console.log('\n-- A.10  default vector reproduces baseline semantics --------');
arms.reset();
const probes = [[1, 2], [2, 3], [5, 6], [16, 12], [19, 20]];
const passthroughOK = probes.every(([f, t]) => arms.bayesianTrustFor(f, t, trustOf(f, t)) === trustOf(f, t));
ok('A.10a OFF passes every per-edge trust through unchanged', passthroughOK, `${probes.length} edges`);
ok('A.10b OFF passes the aggregate through unchanged',
   [null, 0, 0.5, AGG, 1].every(v => arms.aggregateTrustFor(v) === v));
ok('A.10c OFF leaves learning, selection and the PE pathway untouched',
   arms.allowsQUpdate() && arms.allowsTrustUpdate() &&
   !arms.usesUniformActionSelection() && !arms.pinsPredictionErrorPathway(),
   'observationally identical to the current M7-off build');
ok('A.10d OFF is not a member of the arm set', !arms.ARMS.includes(arms.OFF));

env.disable();
console.log(`\n${pass} passed, ${fail} failed`);
if (fail === 0) console.log('ARM SUBSTRATE GREEN.');
process.exit(fail ? 1 : 0);
