// ==========================================================
// UQ-B PREFLIGHT — the gate on collection authorisation
// ==========================================================
// SOLE SCIENTIFIC AUTHORITY
//   UQB_PREREGISTRATION.md v1.0 (3b3d195), UQB-ERR-01 (84c738e),
//   UQB-ERR-02 (59c2750).
//
// WHAT THIS IS
//   A deterministic exercise of the ACTUAL frozen collection path — the same
//   collect.js, the same hook, the same permutation machinery, the same
//   analysis — at the frozen 3,000-tick budget, on a NON-REGISTERED fixture.
//
// WHY THE FIXTURE AND NOT A REGISTERED SEED
//   §17's block 897000-897999 is the study's evidence. Consuming one to test the
//   driver would spend evidence on engineering. The fixture is configuration
//   seed 100026, outside the registered block, outside every consumed block, and
//   far below the held-out floor. protocol.assertSeedAllowed refuses a
//   registered seed on this path before it can reach any run.
//
// THE MANDATORY GATE
//   J1 = exactly 0/19 at the frozen 3,000-tick configuration. UQB-ERR-01 §8
//   fixes that criterion and forbids weakening it. If it fails, this file exits
//   non-zero and collection is not authorised.
// ==========================================================
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as env from '../m7/env.js';
import * as P from './permute.js';
import { FROZEN, assertSeedAllowed, inRegisteredBlock,
         processAuthorisedForCollection } from './protocol.js';
import { collectOne } from './collect.js';
import { analyzeConfiguration, analyzeArm, j1Drift, oracles } from './analyze.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');

// The fixture. Chosen once, recorded, never searched over.
const FIXTURE = Object.freeze({ configSeed: 100026, configIndex: 0, goal: 8 });
// The sentinel used ONLY to prove the seed protection fires. It is never run.
const SENTINEL_REGISTERED_SEED = 897000;

let pass = 0, fail = 0;
const P_ = (id, ok, detail = '') => {
    if (ok) pass++; else fail++;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${id.padEnd(8)} ${detail}`);
};
const throws = (fn) => { try { fn(); return null; } catch (e) { return e; } };

console.log('UQ-B PREFLIGHT — collection-readiness gate');
console.log('='.repeat(80));

// ==========================================================================
console.log('\n-- 0. frozen documents intact --------------------------------------------');
// ==========================================================================
for (const [id, file, digest] of [
    ['P1', 'research/preregistrations/UQB_PREREGISTRATION.md', FROZEN.preregistration],
    ['P2', 'research/preregistrations/UQB_PREREGISTRATION_ERRATUM_01.md', FROZEN.erratum01],
    ['P3', 'research/preregistrations/UQB_PREREGISTRATION_ERRATUM_02.md', FROZEN.erratum02],
]) {
    P_(id, sha(fs.readFileSync(path.join(ROOT, file))) === digest,
       `${path.basename(file)} digest matches`);
}

// ==========================================================================
console.log('\n-- 1. SEED PROTECTION — refuses before anything can run -------------------');
// ==========================================================================
{
    const e = throws(() => assertSeedAllowed(SENTINEL_REGISTERED_SEED));
    P_('S1', e !== null && /SEED PROTECTION/.test(e.message),
       `a registered sentinel (${SENTINEL_REGISTERED_SEED}) is REFUSED off the collection path`);
    P_('S2', inRegisteredBlock(SENTINEL_REGISTERED_SEED),
       'and the sentinel really is inside the registered block, so S1 is not vacuous');

    // The collector must refuse BEFORE spawning a child. If it did not, the
    // sentinel would run — so this assertion is what makes "never touched" a
    // fact rather than an intention.
    const e2 = throws(() => collectOne({ configSeed: SENTINEL_REGISTERED_SEED, configIndex: 0,
                                         goal: 8, arm: 'ARMED', ticks: 1 }));
    P_('S3', e2 !== null && /SEED PROTECTION/.test(e2.message),
       'collectOne REFUSES the sentinel before any child process is spawned');

    // Requesting collection mode without the process flag must also be refused.
    const e3 = throws(() => assertSeedAllowed(SENTINEL_REGISTERED_SEED, { collection: true }));
    P_('S4', e3 !== null && /UQB_COLLECTION_AUTHORISED/.test(e3.message),
       'collection mode alone is not enough: the process flag is also required');
    P_('S5', !processAuthorisedForCollection(),
       'this preflight process is NOT authorised for collection');

    P_('S6', assertSeedAllowed(FIXTURE.configSeed) === FIXTURE.configSeed,
       `the fixture seed ${FIXTURE.configSeed} is permitted off the collection path`);
    P_('S7', throws(() => assertSeedAllowed(898500)) !== null
          && throws(() => assertSeedAllowed(899200)) !== null
          && throws(() => assertSeedAllowed(900600)) !== null,
       'consumed blocks and the held-out floor are refused independently');
}

// ==========================================================================
console.log('\n-- 2. frozen constants ----------------------------------------------------');
// ==========================================================================
P_('F1', FROZEN.seedLo === 897000 && FROZEN.seedHi === 897999, 'seed block 897000-897999 (§17)');
P_('F2', FROZEN.ticks === 3000 && FROZEN.agentSeed === 20260819000 && FROZEN.m7Arm === 'A1',
   'tick budget, agent seed and M7 arm inherited unchanged');
P_('F3', FROZEN.K === 19 && FROZEN.arrangements === 20 && FROZEN.alpha === 1 / 20,
   'K = 19, 20 arrangements, alpha = 1/20 (§25)');
P_('F4', FROZEN.decisionStates === 19 && FROZEN.minConfigurations === 20,
   '19-state population (§7), minimum 20 configurations (§18)');
P_('F5', (FROZEN.seedHi - FROZEN.seedLo + 1) * FROZEN.goalIndices.length === 4000,
   '1000 seeds x 4 goal indices = 4000 candidates (§17)');
P_('F6', FROZEN.seedHi < 898000, `disjoint from UQ-A: ${FROZEN.seedHi} < 898000`);

// ==========================================================================
console.log('\n-- 3. the frozen collection path, at 3000 ticks, on the fixture -----------');
console.log('     (two 3000-tick runs plus 2 x 20 x 19 readouts; this takes a few minutes)');
// ==========================================================================
const t0 = Date.now();
const armed = collectOne({ ...FIXTURE, arm: 'ARMED' });
const ablated = collectOne({ ...FIXTURE, arm: 'ABLATED' });
console.log(`     elapsed ${(Date.now() - t0) / 1000 | 0}s`);

P_('C1', armed.runIdentity.ticks === FROZEN.ticks && ablated.runIdentity.ticks === FROZEN.ticks,
   `TICK BUDGET — both arms ran the frozen ${FROZEN.ticks} ticks`);
P_('C2', armed.runIdentity.arm === 'ARMED' && ablated.runIdentity.arm === 'ABLATED'
      && armed.runIdentity.configSeed === ablated.runIdentity.configSeed
      && armed.runIdentity.configIndex === ablated.runIdentity.configIndex,
   'C1 STRUCTURE — the same configuration under both arms, paired exactly');
P_('C3', JSON.stringify(armed.environment) === JSON.stringify(ablated.environment),
   'C1 STRUCTURE — both arms ran against an identical environment');
P_('C4', armed.provenance.fingerprint !== ablated.provenance.fingerprint,
   'C1 STRUCTURE — and the arms produced different runs, so the exposure reached the agent');

for (const [id, arm, name] of [['C5', armed, 'ARMED'], ['C6', ablated, 'ABLATED']]) {
    P_(id, arm.states.length === 19 && arm.readouts.length === 20
        && arm.readouts[0].identity
        && arm.readouts.every(r => arm.states.every(u => r.best[u] !== null)),
       `C2 STRUCTURE ${name} — 19 states x 20 arrangements, identity first, no missing readout`);
}
P_('C7', armed.provenance.arrangementsDistinct && ablated.provenance.arrangementsDistinct
      && armed.provenance.arrangementSeeds.length === FROZEN.K,
   `PERMUTATION COUNT — identity plus exactly ${FROZEN.K} distinct non-identity arrangements`);

// ==========================================================================
console.log('\n-- 4. J1 AT THE FROZEN 3000-TICK CONFIGURATION — the mandatory gate -------');
// ==========================================================================
const j1a = j1Drift(armed), j1b = j1Drift(ablated);
P_('J1a', j1a.pass, `J1 ARMED   — ${j1a.count}/${j1a.total} drifted. ACCEPTANCE REQUIRES 0/19.`);
P_('J1b', j1b.pass, `J1 ABLATED — ${j1b.count}/${j1b.total} drifted. ACCEPTANCE REQUIRES 0/19.`);

// J4 — no uncontrolled cognitive-state writer remains reachable.
{
    const LINE_COMMENT = new RegExp('//[^' + String.fromCharCode(92) + 'n]*$');
    const L = fs.readFileSync(path.join(ROOT, 'main.js'), 'utf8').split('\r\n').join('\n')
        .replace(/\/\*[\s\S]*?\*\//g, ' ').split('\n').map(l => l.replace(LINE_COMMENT, ''));
    const start = L.findIndex(l => /^function runPrediction\(startKey\)/.test(l));
    let d = 0, seen = false, end = -1;
    for (let i = start; i < L.length; i++) {
        for (const ch of L[i]) { if (ch === '{') { d++; seen = true; } else if (ch === '}') d--; }
        if (seen && d === 0) { end = i; break; }
    }
    const span = L.slice(start, end + 1).join('\n');
    const CONTROLLED = ['regulateBiology'];
    const writers = ['regulateBiology', 'updateBehavior', 'changeStress', 'changeFatigue',
                     'applyPredictionErrorToBehavior']
        .filter(f => new RegExp('(?<![A-Za-z0-9_$.])' + f + '\\s*\\(').test(span));
    const uncontrolled = writers.filter(f => !CONTROLLED.includes(f));
    P_('J4', uncontrolled.length === 0 && start + 1 === 1390 && end + 1 === 3033,
       `J4 — runPrediction spans ${start + 1}..${end + 1}; writers ${writers.join(', ') || 'none'}; ` +
       `uncontrolled ${uncontrolled.join(', ') || 'none'}`);
}

// ==========================================================================
console.log('\n-- 5. controls active, RNG, ABLATED wiring --------------------------------');
// ==========================================================================
{
    // R2 and R3 must be ACTIVE during the readout. If either were inert, J1
    // could not have been 0/19 with the drift the audit measured — but assert
    // the mechanism directly rather than inferring it from the outcome.
    // BEHAVIOURAL, not textual. A regex over the hook's own source is fragile —
    // the router patterns contain escaped dots, so a naive literal test fails for
    // the wrong reason. Driving the real `load` with a stub `next` proves the
    // routing instead of describing it.
    const hook = await import('./hook.mjs');
    const drive = async (rel) => {
        const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
        const out = await hook.load(
            'file:///' + ROOT.split(path.sep).join('/') + '/' + rel, {},
            async () => ({ source: src }));
        return { src, out: String(out.source) };
    };
    const pe = await drive('render/predictionError.js');
    P_('R2', pe.out !== pe.src && /__UQB_FREEZE__/.test(pe.out),
       'R2 — the hook transforms render/predictionError.js and installs the uncertainty guard');
    const be = await drive('render/behavior.js');
    P_('R3', be.out !== be.src && /__UQB_FREEZE_BIO__/.test(be.out),
       'R3 — the hook transforms render/behavior.js and installs the biology guard');
    const un = await drive('render/scoring.js');
    P_('R3b', un.out === un.src,
       'and an unrelated render module passes through UNTRANSFORMED, so R2/R3 are targeted');
    const collectSrc = fs.readFileSync(path.join(HERE, 'collect.js'), 'utf8');
    P_('R4', /__UQB_FREEZE__ = true/.test(collectSrc) && /__UQB_FREEZE_BIO__ = true/.test(collectSrc),
       'and the collector sets BOTH guards for every readout');
    P_('R5', /__UQB_FREEZE__ = false/.test(collectSrc) && /__UQB_FREEZE_BIO__ = false/.test(collectSrc),
       'and clears them afterwards, so no guard is left set');
}
{
    // bestChoice must be sampled before the epsilon override.
    const L = fs.readFileSync(path.join(ROOT, 'main.js'), 'utf8').split('\r\n').join('\n').split('\n');
    const sort = L.findIndex(l => /const sorted = choices\.sort/.test(l));
    const bc = L.findIndex(l => /const bestChoice = sorted\[0\];/.test(l));
    const eps = L.findIndex(l => /if \(liveRng\(\) < epsilon/.test(l));
    const rb = L.findIndex(l => /regulateBiology\(\{/.test(l));
    P_('O1', eps < sort && sort < bc,
       `ORDERING — the epsilon draw (:${eps + 1}) precedes the sort (:${sort + 1}) and bestChoice ` +
       `(:${bc + 1}), so the readout is taken BEFORE the override`);
    P_('O2', bc < rb,
       `ORDERING — bestChoice (:${bc + 1}) precedes regulateBiology (:${rb + 1})`);
}
{
    // Every arrangement must consume identical randomness at the step-0 decision
    // when it reaches the same decision, and probe counts must be well-formed.
    const byOutcome = new Map();
    for (const u of armed.states) for (const r of armed.readouts) {
        const k = u + '|' + r.best[u];
        if (!byOutcome.has(k)) byOutcome.set(k, []);
        byOutcome.get(k).push(r.canary0[u]);
    }
    const bad = [...byOutcome.values()].filter(g => g.some(c => c !== g[0]));
    P_('N1', bad.length === 0,
       `RNG — across ${byOutcome.size} (state, decision) groups, arrangements reaching the same ` +
       'decision consumed identical randomness: the permutation draws none of its own');
    P_('N2', armed.readouts.every(r => armed.states.every(u => r.probeCalls[u] > 0)),
       'RNG — the probe fired at every (state, arrangement)');
}

const analysis = analyzeConfiguration({ armed, ablated });
for (const ph of [1, 2]) {
    P_(`W${ph}`, analysis.ablatedWiringControl[ph].pass,
       `ABLATED WIRING (phase ${ph}) — all 20 arrangements identical and NOT-REJECTED ` +
       `(A = ${analysis.c2.ABLATED[ph].observed})`);
}
P_('A1', analysis.alignmentTable.ARMED[1].length === 20
      && analysis.alignmentTable.ARMED[1].every(x => Number.isInteger(x) && x >= 0 && x <= 19),
   'the §10 statistic is an integer in 0..19 for all 20 arrangements');
P_('A2', analysis.c1[1].difference === analysis.c1[1].armed - analysis.c1[1].ablated
      && analysis.c1[2].difference === analysis.c1[2].armed - analysis.c1[2].ablated,
   'C1 is the per-configuration difference, computed per phase and never pooled');

// ==========================================================================
console.log('\n-- 6. determinism ---------------------------------------------------------');
// ==========================================================================
{
    const again = collectOne({ ...FIXTURE, arm: 'ARMED' });
    const strip = (x) => JSON.stringify({ r: x.readouts, j: x.j1, f: x.provenance.fingerprint,
                                          s: x.provenance.arrangementSeeds });
    P_('D1', strip(again) === strip(armed),
       'an independent PROCESS reproduces every readout, every arrangement seed and the run ' +
       'fingerprint byte-identically');
}

// ==========================================================================
console.log('\n-- 7. no registered seed was touched --------------------------------------');
// ==========================================================================
{
    const touched = [...armed.provenance.evaluatedSeeds, ...ablated.provenance.evaluatedSeeds];
    P_('Z1', touched.every(s => !inRegisteredBlock(s)),
       `env evaluated seeds [${[...new Set(touched)].join(', ')}] — none inside 897000-897999`);
    P_('Z2', touched.every(s => s === FIXTURE.configSeed),
       'and every evaluated seed is the fixture itself');
}

console.log('\n' + '='.repeat(80));
const ready = fail === 0;
console.log(`  ${pass} passed, ${fail} failed`);
console.log(`  J1 at ${FROZEN.ticks} ticks: ARMED ${j1a.count}/19, ABLATED ${j1b.count}/19`);
console.log(`  COLLECTION READINESS: ${ready ? 'PREFLIGHT GREEN' : 'BLOCKED'}`);
console.log('  This preflight does NOT authorise collection. That is a separate Director ruling.');
if (!ready) process.exit(1);
