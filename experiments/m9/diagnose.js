// ==========================================================
// M9 — GOAL16/STATE3 FAILURE DIAGNOSTIC
// ==========================================================
// Answers ONE binary question and stops:
//   at goal 16 / state 3, is allCandidates EMPTY, or non-empty but FILTERED?
//
// NOT AN EXPERIMENT
//   No estimand, no statistic, no arm comparison, no registered seed. It runs a
//   small non-registered fixture set, reads a counting ledger, and reports.
//
// FAIL-CLOSED
//   Every fixture seed passes UQ-B's assertSeedAllowed (which refuses the
//   registered block, every consumed range and the held-out floor) AND must lie
//   in the M9 fixture whitelist. Both conditions, before any child is spawned.
// ==========================================================
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import * as env from '../m7/env.js';
import { FROZEN, assertSeedAllowed, inRegisteredBlock } from '../uqb/protocol.js';
import { STAGE_NAMES, FILTER_STAGES } from './probe.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const U = 'file:///' + ROOT.replace(/\\/g, '/');

// ---------------------------------------------------------------------------
// THE FIXTURE SET — deliberately tiny.
//
// goal 16 is configIndex 2. These seeds are drawn from 896000-896099, the block
// already verified clean for the instrument stress gate: below the registered
// block, below every consumed range, far below the held-out floor 900500.
//
// Three fixtures, not one: a single fixture could not distinguish a
// configuration-specific quirk from the goal-generic behaviour that UQ-B's
// 24/24 failure rate implies.
//
// NOTE ON ACCEPTANCE: these configurations need not be UQ-B-ACCEPTED. Acceptance
// (R1-R5, G11) is a STUDY criterion about environment properties; the question
// here is a RUNTIME one about candidate generation. Using unaccepted fixtures is
// therefore valid, and is disclosed rather than hidden.
// ---------------------------------------------------------------------------
// EVERY FIXTURE MUST BE AN *ACCEPTED* CONFIGURATION, and that is a safety
// requirement, not a stylistic one.
//
//   runOnce does not run makeConfig(seed, idx). It runs
//   generateAccepted(seed, idx), which walks STRICTLY ASCENDING from `seed`
//   until it finds an accepted configuration. On an UNACCEPTED start seed the
//   walk is unbounded in principle: a fixture near 896900 could walk across
//   897000 and touch the registered block. A guard that checks only the start
//   seed would not see that happen.
//
//   Starting from an already-accepted seed makes the walk terminate on its
//   first try, so the configuration that runs is exactly the configuration
//   named, and no seed beyond the fixture is ever evaluated. assertNoWalk
//   below proves that per fixture rather than assuming it.
//
//   (UQ-B was never exposed to this: enumerateCandidates hands collectOne only
//   accepted seeds, where the walk is a no-op.)
export const M9_FIXTURES = Object.freeze([
    Object.freeze({ configSeed: 896238, configIndex: 2 }),
    Object.freeze({ configSeed: 896329, configIndex: 2 }),
    Object.freeze({ configSeed: 896403, configIndex: 2 }),
]);
// One accepted goal-12 control fixture: if the probe reported an empty ledger
// everywhere, the probe would be broken rather than goal 16 being special.
export const M9_CONTROL = Object.freeze({ configSeed: 896066, configIndex: 1 });

const WHITELIST = new Set([...M9_FIXTURES, M9_CONTROL]
    .map(f => `${f.configSeed}:${f.configIndex}`));

/** Proves the acceptance walk is a no-op, so the run cannot leave the fixture. */
export function assertNoWalk(f) {
    const g = env.generateAccepted(f.configSeed, f.configIndex);
    if (g.provenance.acceptedSeed !== f.configSeed || g.tries !== 1) {
        throw new Error(`M9: fixture ${f.configSeed}:${f.configIndex} is not accepted at its own ` +
            `seed — generateAccepted walked to ${g.provenance.acceptedSeed} in ${g.tries} tries. ` +
            `An unaccepted fixture lets the walk run past the fixture and, in principle, into the ` +
            `registered block. Refused.`);
    }
    return g;
}

export function assertFixtureAllowed(f) {
    assertSeedAllowed(f.configSeed, { collection: false });   // registered/consumed/held-out
    if (!WHITELIST.has(`${f.configSeed}:${f.configIndex}`)) {
        throw new Error(`M9: ${f.configSeed}:${f.configIndex} is not in the M9 fixture ` +
            `whitelist. The diagnostic set is fixed; widening it would make this an experiment.`);
    }
    assertNoWalk(f);
    return f;
}

const childSource = (o) => `
import { register } from 'node:module';
const U = ${JSON.stringify(U)};
globalThis.__UQB_EXPOSE__ = {};
register(U + '/experiments/m9/hook.mjs', import.meta.url);

const env = await import(U + '/experiments/m7/env.js');
const { runOnce } = await import(U + '/experiments/m7/run.js');
const { initRng, liveRng } = await import(U + '/instrumentation/rng.js');
const P = await import(U + '/experiments/uqb/permute.js');
const M9 = await import(U + '/experiments/m9/probe.js');
const { readoutSeed } = await import(U + '/experiments/uqb/collect.js');

// The fixture must be accepted at its OWN seed, or runOnce's acceptance walk
// would run a different configuration than the one named — and could walk
// beyond the fixture entirely. Checked in the child too, so a child launched
// by any other path is still safe.
{
    const c0 = env.makeConfig(${o.configSeed}, ${o.configIndex});
    if (!c0.accepted) {
        throw new Error('M9: fixture ${o.configSeed}:${o.configIndex} is not accepted at its ' +
            'own seed; the acceptance walk would leave the fixture. Refused.');
    }
}

// ---- the run: committed behaviour, probe DISARMED throughout ---------------
// The ledger is armed only for the diagnostic readouts. During the run the
// agent must live exactly the history it would otherwise live.
const rec = await runOnce({
    configSeed: ${o.configSeed}, configIndex: ${o.configIndex},
    agentSeed: ${FROZEN.agentSeed}, arm: ${JSON.stringify(FROZEN.m7Arm)},
    envMode: 'on', creditMode: 'on', pin: 'on', tickUnit: 'step',
    ticks: ${o.ticks}, crashAtTick: null, warmStore: false,
});

const runPrediction = globalThis.__UQB_EXPOSE__.runPrediction;
if (typeof runPrediction !== 'function') {
    throw new Error('M9: the runPrediction handle did not bind; main.js was not transformed.');
}

const cfg = env.makeConfig(${o.configSeed}, ${o.configIndex});
const states = env.decisionStates(cfg.goal).slice().sort((a, b) => a - b);

// The exact UQ-B readout conditions in which the failure was observed:
// both persistence controls on, RNG reseeded per state, identity arrangement.
function probe(u) {
    const ledger = M9.makeLedger();
    let best = null, probeCalls = 0;
    globalThis.__UQB_FREEZE__ = true;
    globalThis.__UQB_FREEZE_BIO__ = true;
    globalThis.__UQB__ = P.makeGuard({ arm: 'ARMED', sigmaFor: (n) => [...Array(n).keys()] });
    globalThis.__UQB_PROBE__ = (from, key, step) => {
        probeCalls++;
        if (step === 0 && best === null) best = key;
    };
    globalThis.__M9__ = ledger;
    initRng(readoutSeed(${o.configSeed}, 'ARMED', u));
    runPrediction(u);
    globalThis.__M9__ = null;
    globalThis.__UQB_PROBE__ = null;
    globalThis.__UQB__ = null;
    globalThis.__UQB_FREEZE__ = false;
    globalThis.__UQB_FREEZE_BIO__ = false;
    // The step-0 record is the decision the readout actually measured.
    return { state: u, best, probeCalls, first: ledger.records[0] || null,
             records: ledger.records.length };
}

const out = states.map(probe);
process.stdout.write('@@M9@@' + JSON.stringify({
    configSeed: ${o.configSeed}, configIndex: ${o.configIndex}, goal: cfg.goal,
    states, fingerprint: rec.fingerprint, artifacts: rec.artifacts,
    evaluatedSeeds: env.evaluatedSeeds(), probes: out,
}));
`;

export function runFixture(o) {
    assertFixtureAllowed(o);
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'm9-'));
    try {
        const f = path.join(tmp, 'child.mjs');
        fs.writeFileSync(f, childSource({ ...o, ticks: o.ticks ?? FROZEN.ticks }));
        const out = execFileSync(process.execPath, [f], { encoding: 'utf8', maxBuffer: 1 << 28 });
        const i = out.indexOf('@@M9@@');
        if (i < 0) throw new Error('M9: child produced no result marker.\n' + out);
        const r = JSON.parse(out.slice(i + 6));
        for (const s of r.evaluatedSeeds) {
            if (inRegisteredBlock(s)) throw new Error(`M9: child evaluated registered seed ${s}.`);
        }
        // With an accepted fixture the walk is a no-op, so the child must not
        // have evaluated anything ABOVE its own seed. This is the runtime proof
        // that the acceptance walk never left the fixture.
        const above = r.evaluatedSeeds.filter(s => s > o.configSeed);
        if (above.length) {
            throw new Error(`M9: the child evaluated ${above.length} seed(s) above the fixture ` +
                `${o.configSeed} (max ${Math.max(...above)}). The acceptance walk left the ` +
                `fixture; the diagnostic is not the configuration it claims to be.`);
        }
        return r;
    } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}

// ---------------------------------------------------------------------------
if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
    const log = (s = '') => process.stdout.write(s + '\n');
    log('='.repeat(78));
    log('  M9 — GOAL16/STATE3 FAILURE DIAGNOSTIC');
    log(`  registered block ${FROZEN.seedLo}-${FROZEN.seedHi} UNTOUCHED`);
    log('='.repeat(78));

    const results = [];
    for (const f of [...M9_FIXTURES, M9_CONTROL]) {
        const r = runFixture(f);
        results.push(r);
        const isControl = f === M9_CONTROL;
        log(`\n-- ${r.configSeed}:${r.configIndex}  goal ${r.goal}` +
            `${isControl ? '   [CONTROL, non-goal-16]' : ''} ` + '-'.repeat(20));
        const dead = r.probes.filter(p => p.best === null);
        log(`   states with NO decision: ${dead.length}/${r.states.length}` +
            (dead.length ? `  -> ${dead.map(p => p.state).join(', ')}` : ''));
        for (const p of r.probes) {
            if (p.best !== null && p.state !== 3) continue;      // show state 3 + failures
            const f0 = p.first;
            const led = f0
                ? `size=${f0.allCandidatesSize} rejected=[${f0.rejected.join(',')}] ` +
                  `choices=${f0.choicesLength}`
                : '(no ledger record)';
            log(`   state ${String(p.state).padStart(2)}  best=${p.best === null ? 'NULL' : p.best}` +
                `  ${led}`);
        }
    }

    // ---- the binary verdict, for the goal-16 fixtures only ------------------
    log('\n' + '='.repeat(78));
    const verdicts = [];
    for (const r of results.filter(x => x.goal === 16)) {
        const p3 = r.probes.find(p => p.state === 3);
        if (!p3 || !p3.first) { verdicts.push('NO-LEDGER'); continue; }
        if (p3.best !== null) { verdicts.push('NOT-REPRODUCED'); continue; }
        const f0 = p3.first;
        const total = f0.rejected.reduce((a, b) => a + b, 0);
        const closes = f0.allCandidatesSize === total + f0.choicesLength;
        if (!closes) { verdicts.push('LEDGER-INCONSISTENT'); continue; }
        verdicts.push(f0.allCandidatesSize === 0 ? 'EMPTY'
            : (f0.choicesLength === 0 ? 'FILTERED' : 'NOT-REPRODUCED'));
        if (f0.allCandidatesSize > 0 && f0.choicesLength === 0) {
            const domIdx = f0.rejected.indexOf(Math.max(...f0.rejected));
            log(`  ${r.configSeed}:2 state 3 — FILTERED. ledger closes ` +
                `${f0.allCandidatesSize} = ${f0.rejected.join(' + ')} + ${f0.choicesLength}`);
            f0.rejected.forEach((n, i) => {
                if (n > 0) log(`      ${STAGE_NAMES[i]}: rejected ${n}`);
            });
            log(`      dominant stage: ${STAGE_NAMES[domIdx]}`);
        } else if (f0.allCandidatesSize === 0) {
            log(`  ${r.configSeed}:2 state 3 — EMPTY at candidate-generation time.`);
        }
    }
    const unanimous = verdicts.length > 0 && verdicts.every(v => v === verdicts[0]);
    log('');
    log(`  verdicts across goal-16 fixtures: ${JSON.stringify(verdicts)}`);
    log(unanimous && (verdicts[0] === 'EMPTY' || verdicts[0] === 'FILTERED')
        ? `  M9 VERDICT: ${verdicts[0]}`
        : '  M9 VERDICT: INCONCLUSIVE — see verdict list above; scope NOT expanded');
    log('='.repeat(78));

    fs.writeFileSync(path.join(HERE, 'm9_diagnostic.json'),
        JSON.stringify({ fixtures: M9_FIXTURES, control: M9_CONTROL, results, verdicts }, null, 2));
}
