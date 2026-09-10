// ==========================================================
// C1 — ONE CONFIGURATION, ONE ARM
// ==========================================================
// Captures the DECISION-TIME candidate pool (§3): the contents of `choices` at
// main.js:2373, immediately BEFORE the in-place sort, using the probe M14
// validated and M19 exercised. Candidates pushed at :2423 / :2453 — after
// bestChoice is fixed at :2378 — never enter the E6 population.
//
// ONE PROCESS PER RUN. main.js is a singleton ESM module, so the two arms must
// not share a process; and a fresh process is what makes the run reproducible.
// ==========================================================
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { FROZEN, assertSeedAllowed, inRegisteredBlock } from './protocol.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const U = 'file:///' + ROOT.replace(/\\/g, '/');

const childSource = (o) => `
import { register } from 'node:module';
const U = ${JSON.stringify(U)};
globalThis.__UQB_EXPOSE__ = {};
register(U + '/experiments/m14/hook.mjs', import.meta.url);
const env = await import(U + '/experiments/m7/env.js');
const { runOnce } = await import(U + '/experiments/m7/run.js');
const { initRng } = await import(U + '/instrumentation/rng.js');
const P = await import(U + '/experiments/uqb/permute.js');
const M14 = await import(U + '/experiments/m14/probe.js');
const { readoutSeed } = await import(U + '/experiments/uqb/collect.js');

const ARM = ${JSON.stringify(o.arm)};
const cfg0 = env.makeConfig(${o.configSeed}, ${o.configIndex});
if (!cfg0.accepted) throw new Error('C1: configuration is not accepted at its own seed.');

// §4 — the exposure applies to the RUN, so the two arms live two different
// experiential histories. ARMED delivers the committed futureBonus values;
// ABLATED delivers exactly 0 to every candidate.
globalThis.__UQB__ = P.makeGuard({ arm: ARM, sigmaFor: (n) => [...Array(n).keys()] });
const rec = await runOnce({
    configSeed: ${o.configSeed}, configIndex: ${o.configIndex},
    agentSeed: ${FROZEN.agentSeed}, arm: ${JSON.stringify(FROZEN.m7Arm)},
    envMode: 'on', creditMode: 'on', pin: 'on', tickUnit: 'step',
    ticks: ${FROZEN.ticks}, crashAtTick: null, warmStore: false,
});
globalThis.__UQB__ = null;

const runPrediction = globalThis.__UQB_EXPOSE__.runPrediction;
if (typeof runPrediction !== 'function') {
    throw new Error('C1: the runPrediction handle did not bind; main.js was not transformed.');
}
const states = env.decisionStates(cfg0.goal).slice().sort((a, b) => a - b);
if (states.length !== ${FROZEN.decisionStates}) {
    throw new Error('C1: population is ' + states.length + ', frozen at ${FROZEN.decisionStates}.');
}
const out = [];
for (const u of states) {
    const r = M14.makePoolRecorder();
    let best = null;
    globalThis.__UQB_FREEZE__ = true; globalThis.__UQB_FREEZE_BIO__ = true;
    globalThis.__UQB__ = P.makeGuard({ arm: ARM, sigmaFor: (n) => [...Array(n).keys()] });
    globalThis.__UQB_PROBE__ = (from, key, step) => { if (step === 0 && best === null) best = key; };
    globalThis.__M14__ = r;
    initRng(readoutSeed(${o.configSeed}, ARM, u));
    runPrediction(u);
    globalThis.__M14__ = null; globalThis.__UQB_PROBE__ = null; globalThis.__UQB__ = null;
    globalThis.__UQB_FREEZE__ = false; globalThis.__UQB_FREEZE_BIO__ = false;
    out.push({ state: u, best, pool: r.snapshots.length ? r.snapshots[0].pairs : [] });
}
process.stdout.write('@@C1@@' + JSON.stringify({
    arm: ARM, goal: cfg0.goal, states, fingerprint: rec.fingerprint,
    artifacts: rec.artifacts, evaluatedSeeds: env.evaluatedSeeds(), readouts: out,
}));
`;

export function collectOne(o) {
    const collection = o.collection === true;
    assertSeedAllowed(o.configSeed, { collection });      // before any child exists
    if (!FROZEN.arms.includes(o.arm)) throw new Error(`C1: arm ${JSON.stringify(o.arm)} unknown.`);
    if (!FROZEN.goalIndices.includes(o.configIndex)) {
        throw new Error(`C1: configIndex ${o.configIndex} is outside the frozen goal schedule.`);
    }
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'c1run-'));
    try {
        const f = path.join(tmp, 'run.mjs');
        fs.writeFileSync(f, childSource(o));
        const out = execFileSync(process.execPath, [f], { encoding: 'utf8', maxBuffer: 1 << 28 });
        const i = out.indexOf('@@C1@@');
        if (i < 0) throw new Error('C1: child produced no result marker.\n' + out.slice(0, 4000));
        const raw = JSON.parse(out.slice(i + 6));
        for (const s of raw.evaluatedSeeds) assertSeedAllowed(s, { collection });
        const above = raw.evaluatedSeeds.filter(s => s > o.configSeed);
        if (above.length) {
            throw new Error(`C1: the child evaluated ${above.length} seed(s) above the ` +
                `configuration seed ${o.configSeed}; an acceptance walk left the configuration.`);
        }
        for (const r of raw.readouts) {
            if (!Array.isArray(r.pool)) throw new Error(`C1: no pool captured at state ${r.state}.`);
        }
        return {
            runIdentity: {
                configSeed: o.configSeed, configIndex: o.configIndex, goal: raw.goal,
                arm: o.arm, agentSeed: FROZEN.agentSeed, m7Arm: FROZEN.m7Arm,
                ticks: FROZEN.ticks, preregistration: FROZEN.preregistration, collection,
            },
            states: raw.states, readouts: raw.readouts,
            provenance: { fingerprint: raw.fingerprint, artifacts: raw.artifacts,
                          evaluatedSeeds: raw.evaluatedSeeds },
        };
    } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}
