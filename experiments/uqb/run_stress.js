// ==========================================================
// UQ-B INSTRUMENT GENERALIZATION STRESS TEST — the gate
// ==========================================================
// ONE QUESTION
//   Does the frozen UQ-B measurement machinery behave correctly on trajectories
//   other than fixture 100026?
//
// NOT A UQ-B EXPERIMENT
//   No estimand computed here may interpret, tune or reinterpret UQ-B. C1, C2,
//   K = 19, alpha = 1/20, the registered block and the acceptance criteria are
//   untouched. This file computes NO alignment count, NO C1 difference and NO
//   C2 verdict — deliberately, so that no stress outcome can leak into the
//   scientific reading of the study.
//
// WHAT IT DOES COMPUTE — instrument gates only
//   J1    repeated full-population readouts of the same post-run state are
//         identical                                       (acceptance: 0/19)
//   AE    ARMED measurement machinery is equivalent to the uninstrumented
//         committed behaviour                             (fingerprint, RNG draws)
//   RN    R2/R3 readout controls leave no persistent state behind
//   DET   an independent process reproduces every readout byte-identically
//   PROD  no production source is modified
//   SEED  no registered UQ-B seed is touched
//
// Runs on the COMPLETE accepted set of the stress block — no selection.
// ==========================================================
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import * as env from '../m7/env.js';
import { FROZEN, inRegisteredBlock } from './protocol.js';
import { STRESS, OPERATIVE_RULE, SELECTION_RULE, stressBlockIsClean,
         enumerateStressCandidates, selectStressConfigurations,
         structuralKey, keyString } from './stress.js';
import { collectOne } from './collect.js';
import { j1Drift } from './analyze.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const U = 'file:///' + ROOT.replace(/\\/g, '/');

const log = (s = '') => process.stdout.write(s + '\n');
let pass = 0, fail = 0;
const P = (id, cond, msg) => {
    if (cond) { pass++; log(`PASS  ${id.padEnd(8)} ${msg}`); }
    else { fail++; log(`FAIL  ${id.padEnd(8)} ${msg}`); }
    return cond;
};

log('='.repeat(78));
log('  UQ-B INSTRUMENT GENERALIZATION STRESS TEST');
log(`  stress block ${STRESS.seedLo}-${STRESS.seedHi}   registered block ` +
    `${FROZEN.seedLo}-${FROZEN.seedHi} (UNTOUCHED)`);
log('='.repeat(78));

// -- 0. the block ----------------------------------------------------------
log('\n-- 0. stress block safety ------------------------------------------------');
const clean = stressBlockIsClean();
P('B1', clean.clean, `the stress block overlaps no registered, consumed or held-out seed ` +
    `(held-out floor ${clean.heldOutFloor})`);

// -- 1. enumeration and the operative rule ---------------------------------
log('\n-- 1. enumeration ---------------------------------------------------------');
const e = enumerateStressCandidates(env);
log(`      ${e.candidates} candidates -> ${e.accepted.length} accepted, ${e.rejected.length} rejected`);
const sel = selectStressConfigurations(env, e.accepted);
const targets = e.accepted.slice().sort((a, b) =>
    a.configSeed - b.configSeed || a.configIndex - b.configIndex)
    .map(c => ({ ...c, key: structuralKey(env, c) }));

P('B2', targets.length >= OPERATIVE_RULE.minimum,
    `${targets.length} accepted configurations, at or above the required minimum of ` +
    `${OPERATIVE_RULE.minimum}`);
const landscapes = new Set(targets.map(t => t.configSeed));
const keys = new Set(targets.map(t => keyString(t.key)));
P('B3', landscapes.size >= 2,
    `the set spans ${landscapes.size} distinct reliability landscapes (distinct configSeed)`);
P('B4', keys.size >= 2, `and ${keys.size} distinct pre-run oracle profiles`);
log(`      operative rule: ${OPERATIVE_RULE.id} — ${OPERATIVE_RULE.rule}`);
log(`      supersedes    : ${SELECTION_RULE.id} (would have picked ` +
    `${sel.chosen.map(c => c.configSeed + '/' + c.configIndex).join(', ')})`);
for (const t of targets) {
    log(`      target ${t.configSeed}/${t.configIndex}  goal=${t.key.goal} ` +
        `deg=${t.key.goalDegree} disagree=${t.key.disagreePhase1}/${t.key.disagreePhase2}`);
}

// -- 2. J1 on every configuration and arm ----------------------------------
log('\n-- 2. J1 — readout state closure on unseen trajectories --------------------');
const collected = [];
for (const t of targets) {
    for (const arm of FROZEN.arms) {
        const rec = collectOne({
            configSeed: t.configSeed, configIndex: t.configIndex, goal: t.goal,
            arm, collection: false,          // never the authorised path
        });
        const d = j1Drift(rec);
        collected.push({ t, arm, rec, d });
        P(`J1-${t.configSeed}/${t.configIndex}-${arm === 'ARMED' ? 'A' : 'B'}`,
            d.pass, `${t.configSeed}/${t.configIndex} ${arm} — ${d.count}/${d.total} drifted ` +
            `(acceptance requires 0)`);
    }
}

// -- 3. ARMED equivalence on every configuration ---------------------------
// Three modes, one child process each:
//   baseline     no loader hook at all — the committed runtime
//   hooked-off   all three transforms applied, every guard global unset
//   armed-guard  transforms applied, identity-arrangement guard set as the
//                collector sets it for the ARMED run
// All three must agree on fingerprint, Q-table size, Q sum AND RNG draw count.
log('\n-- 3. ARMED equivalence — instrumented ARMED vs uninstrumented committed ---');
const aeSource = (o) => `
import { register } from 'node:module';
const U = ${JSON.stringify(U)};
const MODE = ${JSON.stringify(o.mode)};
if (MODE !== 'baseline') { globalThis.__UQB_EXPOSE__ = {}; register(U + '/experiments/uqb/hook.mjs', import.meta.url); }
const env = await import(U + '/experiments/m7/env.js');
const { runOnce } = await import(U + '/experiments/m7/run.js');
if (MODE === 'armed-guard') {
    const P = await import(U + '/experiments/uqb/permute.js');
    globalThis.__UQB__ = P.makeGuard({ arm: 'ARMED', sigmaFor: (n) => [...Array(n).keys()] });
}
const rec = await runOnce({
    configSeed: ${o.configSeed}, configIndex: ${o.configIndex},
    agentSeed: ${FROZEN.agentSeed}, arm: ${JSON.stringify(FROZEN.m7Arm)},
    envMode: 'on', creditMode: 'on', pin: 'on', tickUnit: 'step',
    ticks: ${STRESS.ticks}, crashAtTick: null, warmStore: false,
});
globalThis.__UQB__ = null;
process.stdout.write('@@R@@' + JSON.stringify({
    mode: MODE, fingerprint: rec.fingerprint, artifacts: rec.artifacts,
    evaluatedSeeds: env.evaluatedSeeds(),
}));
`;
const runMode = (o) => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'uqbstress-'));
    try {
        const f = path.join(tmp, 'ae.mjs');
        fs.writeFileSync(f, aeSource(o));
        const out = execFileSync(process.execPath, [f], { encoding: 'utf8', maxBuffer: 1 << 28 });
        const i = out.indexOf('@@R@@');
        if (i < 0) throw new Error('UQ-B stress: child produced no result marker.\n' + out);
        return JSON.parse(out.slice(i + 5));
    } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
};
const sig = (r) => JSON.stringify({
    fp: r.fingerprint,
    qEntries: r.artifacts && r.artifacts.qEntries,
    qSum: r.artifacts && r.artifacts.qSum,
    cogDraws: r.artifacts && r.artifacts.cogDraws,
});
const aeSeeds = [];
for (const t of targets) {
    const base = runMode({ mode: 'baseline',    ...t });
    const off  = runMode({ mode: 'hooked-off',  ...t });
    const arm  = runMode({ mode: 'armed-guard', ...t });
    aeSeeds.push(...base.evaluatedSeeds, ...off.evaluatedSeeds, ...arm.evaluatedSeeds);
    const id = `${t.configSeed}/${t.configIndex}`;
    P(`AE-${id}`, sig(base) === sig(arm),
        `${id} — ARMED-with-guard is byte-identical to the uninstrumented committed run ` +
        `(fp, qEntries, qSum, RNG draws)`);
    P(`RN-${id}`, sig(base) === sig(off),
        `${id} — R2/R3 transforms with guards unset leave the committed run unchanged`);
    if (sig(base) !== sig(arm) || sig(base) !== sig(off)) {
        log('      baseline    ' + sig(base));
        log('      hooked-off  ' + sig(off));
        log('      armed-guard ' + sig(arm));
    }
}

// -- 4. R2/R3 leave no guard set -------------------------------------------
log('\n-- 4. R2/R3 neutrality in this process ------------------------------------');
P('RN1', !globalThis.__UQB_FREEZE__ && !globalThis.__UQB_FREEZE_BIO__ && !globalThis.__UQB__,
    'after every collection no readout guard is left set in this process');

// -- 5. determinism --------------------------------------------------------
log('\n-- 5. determinism ---------------------------------------------------------');
for (const c of collected) {
    const again = collectOne({
        configSeed: c.t.configSeed, configIndex: c.t.configIndex, goal: c.t.goal,
        arm: c.arm, collection: false,
    });
    const same = JSON.stringify(again.readouts) === JSON.stringify(c.rec.readouts) &&
                 again.provenance.fingerprint === c.rec.provenance.fingerprint &&
                 JSON.stringify(again.provenance.arrangementSeeds) === JSON.stringify(c.rec.provenance.arrangementSeeds);
    P(`DET-${c.t.configSeed}/${c.t.configIndex}-${c.arm === 'ARMED' ? 'A' : 'B'}`, same,
        `${c.t.configSeed}/${c.t.configIndex} ${c.arm} — an independent process reproduces ` +
        `every readout, arrangement seed and the run fingerprint`);
}

// -- 6. production safety --------------------------------------------------
log('\n-- 6. production safety ---------------------------------------------------');
const diff = execFileSync('git', ['diff', '--stat', 'HEAD', '--',
    'main.js', 'render/', 'instrumentation/', 'experiments/m7/'],
    { cwd: ROOT, encoding: 'utf8' }).trim();
P('PROD1', diff === '', 'no production source is modified (main.js, render/, ' +
    'instrumentation/, experiments/m7/)');
const frozenDiff = execFileSync('git', ['diff', '--stat', 'HEAD', '--',
    'research/preregistrations/'], { cwd: ROOT, encoding: 'utf8' }).trim();
P('PROD2', frozenDiff === '', 'no frozen preregistration document is modified');

// -- 7. seed accounting ----------------------------------------------------
log('\n-- 7. seed accounting -----------------------------------------------------');
const seen = env.evaluatedSeeds();
const childSeeds = [...new Set([...aeSeeds, ...collected.flatMap(c => c.rec.provenance.evaluatedSeeds || [])])];
const all = [...new Set([...seen, ...childSeeds])].sort((a, b) => a - b);
const registered = all.filter(inRegisteredBlock);
P('SEED1', registered.length === 0,
    `no registered seed was evaluated in this process or any child ` +
    `(${all.length} distinct seeds seen, range ${all[0]}-${all[all.length - 1]})`);
const outside = all.filter(s => s < STRESS.seedLo || s > STRESS.seedHi);
P('SEED2', outside.length === 0,
    'and every evaluated seed lies inside the stress block');

log('\n' + '='.repeat(78));
log(`  ${pass} passed, ${fail} failed`);
log(`  configurations exercised: ${targets.length} (complete accepted set)`);
log(`  registered seeds touched: ${registered.length}`);
log(fail === 0
    ? '  STRESS GATE: GREEN — the instrument reproduced on every unseen trajectory tested'
    : '  STRESS GATE: RED — do NOT begin the registered collection');
log('  This gate does NOT authorise collection. That is a separate Director ruling.');
log('='.repeat(78));
process.exit(fail === 0 ? 0 : 1);
