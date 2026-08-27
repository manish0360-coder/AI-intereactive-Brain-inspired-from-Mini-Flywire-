// ==========================================================
// PHASE 1.0 — MILESTONE 2, Q4 SUBSET (getQAny) GATE : Q4.1 – Q4.15
// ==========================================================
// SCOPE, AND WHY THIS FILE EXISTS SEPARATELY FROM verify_S2.js
// ------------------------------------------------------------
// verify_S2.js gates MILESTONE 2 as a whole, which is D1 + Q4. Its D1 half
// (S2.4b/c/d) asserts that episodeManager.js writes composite Q keys through
// an injected makeStateKey — a change that belongs to the episodeManager
// milestone and is NOT part of this commit. Run against this tree, verify_S2
// reports 11 passed / 3 failed, and all three failures are D1, none are Q4.
//
// This file is the Q4 half alone: the smallest closure that gates exactly the
// property this commit establishes, so the committed tree carries no red gate.
// When the episodeManager milestone lands, verify_S2.js becomes green and
// supersedes this file as the milestone-2 gate.
//
// PROPERTY UNDER TEST
//   A Q-value read exists that resolves BOTH legacy bare "pos->action" keys
//   AND goal-namespaced composite "pos#goal->action" keys, and the embedding
//   path actually uses it.
//
// DEPENDENCY CLOSURE: qlearning.js and embeddings.js (this commit) plus
// search.js, helpers.js and instrumentation/rng.js (unchanged at HEAD).
// episodeManager.js is deliberately NOT imported.
//
// No threshold, seed, sample size or scientific parameter of the frozen M7
// pre-registration is introduced or touched. The expected export list is a
// recorded observation, following the M6.7 precedent in verify_S6.js.
// ==========================================================
import { Q, getQ, getQAny, setQ, dampQ, makeStateKey, GOAL_NONE }
    from '../../render/qlearning.js';
import { createEmbedding, trainEmbedding, similarity, setEmbeddingNeuronMap }
    from '../../render/embeddings.js';
import { setNeuronMap } from '../../render/search.js';
import { initRng } from '../../instrumentation/rng.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');

let pass = 0, fail = 0;
const ok = (n, c, x = '') => { c ? pass++ : fail++;
    console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${x ? '   ' + x : ''}`); };

const GOAL = 16, SEED = 20260819000;

// ==========================================================
console.log('\n── Q4.1–Q4.6  the read resolves BOTH namespaces ──');
// ==========================================================

Q.clear(); setQ(3, 4, 7.5);                       // legacy bare key only
ok('Q4.1  bare "3->4" resolves', getQAny(3, 4) === 7.5, `${getQAny(3, 4)}`);

Q.clear(); setQ(makeStateKey(1, GOAL), 2, 12);    // composite key only
ok('Q4.2  composite "1#16->2" resolves where the bare read returns 0',
   getQ(1, 2) === 0 && getQAny(1, 2) === 12,
   `getQ=${getQ(1, 2)}  getQAny=${getQAny(1, 2)}`);

Q.clear();
setQ(makeStateKey(5, 16), 6, 3);
setQ(makeStateKey(5, 9), 6, 11);
setQ(makeStateKey(5, GOAL_NONE), 6, 1);
ok('Q4.3  returns the MAX across goal contexts', getQAny(5, 6) === 11,
   `3, 11, 1 -> ${getQAny(5, 6)}`);

Q.clear(); setQ(5, 6, 4); setQ(makeStateKey(5, GOAL), 6, 9);
ok('Q4.4  maximises over the bare AND composite namespaces together',
   getQAny(5, 6) === 9, `bare 4, composite 9 -> ${getQAny(5, 6)}`);

Q.clear(); setQ(makeStateKey(5, GOAL), 16, 9); setQ(makeStateKey(15, GOAL), 6, 4);
ok('Q4.5  no false positive: action 6 vs 16, pos 5 vs 15',
   getQAny(5, 6) === 0 && getQAny(5, 16) === 9 && getQAny(15, 6) === 4,
   `(5,6)=${getQAny(5, 6)} (5,16)=${getQAny(5, 16)} (15,6)=${getQAny(15, 6)}`);

Q.clear();
ok('Q4.6  an absent transition reads 0, not undefined/NaN',
   getQAny(7, 8) === 0, `${getQAny(7, 8)}`);

// ==========================================================
console.log('\n── Q4.7–Q4.8  the read is PURE ──');
// ==========================================================

Q.clear();
for (let p = 1; p <= 20; p++) setQ(makeStateKey(p, GOAL), p + 1, p * 0.37);
for (let p = 1; p <= 10; p++) setQ(p, p + 1, p * 0.11);
const before = JSON.stringify([...Q.entries()].sort());
for (let i = 0; i < 50000; i++) getQAny(1 + (i % 25), 2 + (i % 25));
const after = JSON.stringify([...Q.entries()].sort());
ok('Q4.7  50,000 reads leave the Q map byte-identical',
   before === after && Q.size === 30, `${Q.size} entries`);

initRng(SEED);
const draws = []; for (let i = 0; i < 5; i++) draws.push(createEmbedding(1)[0]);
initRng(SEED);
for (let i = 0; i < 1000; i++) getQAny(3, 4);
const draws2 = []; for (let i = 0; i < 5; i++) draws2.push(createEmbedding(1)[0]);
ok('Q4.8  1,000 reads consume no RNG (stream position untouched)',
   JSON.stringify(draws) === JSON.stringify(draws2));

// ==========================================================
console.log('\n── Q4.9–Q4.10  export surface / call-site migration (static) ──');
// ==========================================================

const QSRC = fs.readFileSync(path.join(ROOT, 'render/qlearning.js'), 'utf8');
const ESRC = fs.readFileSync(path.join(ROOT, 'render/embeddings.js'), 'utf8');
const strip = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const surface = [...strip(QSRC).matchAll(/^export\s+(?:function|const|let|var)\s+([A-Za-z_$][\w$]*)/gm)]
    .map(m => m[1]).sort();
const EXPECTED = ['GOAL_NONE', 'Q', 'dampQ', 'getQ', 'getQAny',
                  'makeStateKey', 'setQ', 'updateQ'];   // pre-Q4 set + getQAny
ok('Q4.9  qlearning.js exports exactly the pre-Q4 set + getQAny',
   JSON.stringify(surface) === JSON.stringify(EXPECTED), surface.join(','));

const eStripped = strip(ESRC);
const anySites  = (eStripped.match(/getQAny\s*\(/g) || []).length;
const bareSites = (eStripped.match(/(?<!getQ)(?<![\w$])getQ\s*\(/g) || []).length;
const importsAny = /getQAny\s*\n\s*\}\s*from\s*"\.\/qlearning\.js"/.test(eStripped);
ok('Q4.10 embeddings.js: every Q read migrated (6 getQAny, 0 bare getQ)',
   anySites === 6 && bareSites === 0 && importsAny,
   `getQAny=${anySites}  getQ=${bareSites}  imports getQAny=${importsAny}`);

// ==========================================================
console.log('\n── Q4.11–Q4.13  the EMBEDDING PATH actually uses the capability ──');
// ==========================================================
// One deterministic pair (1,2) with an identical starting geometry in every
// case; only the Q state differs. Displacement = 1 - cos(before, after) of
// neuron 1, so a larger learning rate is a strictly larger displacement.

const nodes = JSON.parse(fs.readFileSync(path.join(ROOT, 'neurons.json'), 'utf8'));
const conns = JSON.parse(fs.readFileSync(path.join(ROOT, 'connections.json'), 'utf8'));

function scene() {
    initRng(SEED);                                   // identical geometry every case
    const m = new Map();
    nodes.forEach(n => m.set(n.id, { id: n.id,
        userData: { id: n.id, label: n.label, neighbors: [], embedding: createEmbedding() } }));
    conns.forEach(c => { const A = m.get(c.from), B = m.get(c.to);
        if (A && B) { if (!A.userData.neighbors.includes(c.to)) A.userData.neighbors.push(c.to);
                      if (!B.userData.neighbors.includes(c.from)) B.userData.neighbors.push(c.from); } });
    setNeuronMap(m); setEmbeddingNeuronMap(m);
    return m;
}

function displace(seedQ) {
    const m = scene();
    Q.clear(); seedQ();
    const b1 = [...m.get(1).userData.embedding];
    const others = [...m.keys()].filter(id => id !== 1 && id !== 2)
        .map(id => [id, [...m.get(id).userData.embedding]]);
    trainEmbedding(1, 2);
    const pushed = others.filter(([id, v]) =>
        1 - similarity(v, m.get(id).userData.embedding) > 1e-12).length;
    return { d: 1 - similarity(b1, m.get(1).userData.embedding), pushed };
}

const EMPTY     = displace(() => {});
const BARE      = displace(() => setQ(1, 2, 12));
const COMPOSITE = displace(() => setQ(makeStateKey(1, GOAL), 2, 12));

console.log(`      displacement of neuron 1:  empty ${EMPTY.d.toExponential(4)}` +
            `   bare Q=12 ${BARE.d.toExponential(4)}   composite Q=12 ${COMPOSITE.d.toExponential(4)}`);

ok('Q4.11 a composite-only Q entry drives the learning rate identically to a bare one',
   COMPOSITE.d === BARE.d && COMPOSITE.d > 0, `${COMPOSITE.d.toExponential(6)}`);
ok('Q4.12 and that rate is strictly above the Q=0 floor',
   COMPOSITE.d > EMPTY.d * 1.5, `ratio ${(COMPOSITE.d / EMPTY.d).toFixed(4)} (lr 0.036 vs 0.015 = 2.4x)`);

// Protection B: push-away suppression is also driven by the composite read
const PROT_BARE = displace(() => { for (let i = 3; i <= 26; i++) setQ(1, i, 9); });
const PROT_COMP = displace(() => { for (let i = 3; i <= 26; i++) setQ(makeStateKey(1, GOAL), i, 9); });
console.log(`      neurons pushed away:  empty ${EMPTY.pushed}   Q>3 bare ${PROT_BARE.pushed}` +
            `   Q>3 composite ${PROT_COMP.pushed}`);
ok('Q4.13 push-away protection (Q > 3.0) is driven by the composite read too',
   PROT_COMP.pushed === PROT_BARE.pushed && PROT_COMP.pushed < EMPTY.pushed,
   `${EMPTY.pushed} -> ${PROT_COMP.pushed}`);

// ==========================================================
console.log('\n── Q4.14–Q4.15  ANTI-VACUITY: the getQ-only build cannot do this ──');
// ==========================================================
// The counterfactual is stated in the only terms that matter: a getQ-only
// build reads the SAME Q map through getQ. On a composite-only Q state that
// read is 0 — numerically indistinguishable from a brain that never learned
// the transition at all. Q4.12 already showed those two states must produce
// DIFFERENT embedding dynamics, so the getQ-only build is provably wrong in
// this case, not merely less informative.

Q.clear(); setQ(makeStateKey(1, GOAL), 2, 12);
const seenByGetQ_composite = getQ(1, 2);
Q.clear();
const seenByGetQ_empty = getQ(1, 2);
Q.clear(); setQ(1, 2, 12);
const seenByGetQ_bare = getQ(1, 2);

ok('Q4.14 getQ conflates "learned under a goal" with "never learned" (both 0)',
   seenByGetQ_composite === 0 && seenByGetQ_empty === 0 && COMPOSITE.d !== EMPTY.d,
   `getQ: composite=${seenByGetQ_composite} empty=${seenByGetQ_empty}; ` +
   `required dynamics differ: ${COMPOSITE.d.toExponential(4)} vs ${EMPTY.d.toExponential(4)}`);

ok('Q4.15 control is specific: getQ is NOT simply broken — it reads bare keys',
   seenByGetQ_bare === 12, `getQ(1,2) on a bare key = ${seenByGetQ_bare}`);

// D1 namespace hygiene is unchanged by this commit — recorded, not re-litigated
Q.clear(); setQ(makeStateKey(5, GOAL), 6, 10); setQ(5, 6, 10);
dampQ(makeStateKey(5, GOAL), 6, 0.10);
console.log(`      (unchanged) dampQ composite ${Q.get('5#' + GOAL + '->6')} , bare ${Q.get('5->6')}`);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
