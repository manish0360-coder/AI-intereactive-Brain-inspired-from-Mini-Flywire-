// ==========================================================
// M8 EXPERIMENT RUNNER AND COLLECTION PIPELINE
// ==========================================================
// GOVERNING SOURCE
//   research/preregistrations/M8_PREREGISTRATION.md §8, §9, §13, §14, §15,
//   frozen at 8fb0bec13bb2940fa2e7e7f823c632427a28fae3.
//
// WHAT THIS DOES
//   Runs ONE accepted configuration through the committed M7 runtime with the
//   committed M8 instrumentation attached, and returns the RAW §8 tuple for
//   every captured event plus the run identity needed to reconstruct every
//   §9 predicate offline.
//
// WHAT THIS DOES NOT DO
//   It computes no derived predicate, no mechanism flag, no frequency, and no
//   H1-H5 verdict. Classification is offline and is a later milestone. Raw
//   observations are never reduced to labels here — §10 requires the complete
//   joint distribution to be reconstructible, which a label cannot support.
//
// REUSE, NOT DUPLICATION
//   The agent, environment, arms, phase switching and tick budget all come
//   from experiments/m7/run.js unchanged. This file adds seed discipline, the
//   instrumentation attachment, and record keeping. No M7 logic is restated.
//
// SEED DISCIPLINE
//   env.generateAccepted walks FORWARD from a rejected seed, which from 899999
//   would cross into the consumed 900000-900029 block. The runner therefore
//   only ever passes a seed already proven accepted by protocol.enumerate-
//   Candidates, where the walk is a no-op, and asserts afterwards that the run
//   consumed exactly that seed and advanced zero.
// ==========================================================
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FROZEN, TUPLE_FIELDS, assertSeedAllowed, stratumOf } from './protocol.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const U = 'file:///' + ROOT.split(path.sep).join('/');

// Builds the child program. One configuration per process: run.js claims the
// process (claimProcess) and main.js is a singleton module, so a fresh process
// per configuration is the only correct isolation.
function childSource(o) {
    return `
import { register } from 'node:module';
const U = ${JSON.stringify(U)};
const I   = await import(U + '/experiments/m8/instrument.js');
const env = await import(U + '/experiments/m7/env.js');

${o.bypassInstrumentation ? '' : `register(U + '/experiments/m8/hook.mjs', import.meta.url);`}

const R = I.createRecorder({
    // §8 field 12: PER EVENT. env.getPhase is a pure read of the phase the
    // frozen protocol switches at T_SHIFT; it consumes nothing.
    phase:      () => env.getPhase(),
    configSeed: ${o.configSeed},
    goalNode:   ${o.goal},
});
${o.suppressRecorder ? '' : 'globalThis.__MFW_M8__ = R;'}

const { runOnce } = await import(U + '/experiments/m7/run.js');
const rec = await runOnce({
    configSeed:  ${o.configSeed},
    configIndex: ${o.configIndex},
    agentSeed:   ${FROZEN.agentSeed},
    arm:         ${JSON.stringify(FROZEN.arm)},
    envMode: 'on', creditMode: 'on', pin: 'on', tickUnit: 'step',
    ticks: ${o.ticks}, crashAtTick: null, warmStore: false,
});

process.stdout.write('@@M8DATA@@' + JSON.stringify({
    events: R.events(),
    diagnostics: R.diagnostics(),
    fingerprint: rec.fingerprint,
    artifacts: { cogDraws: rec.artifacts.cogDraws, visDraws: rec.artifacts.visDraws,
                 qEntries: rec.artifacts.qEntries },
    envCounters: env.getCounters(),
    // Runtime proof of exactly which configuration seeds this process touched.
    evaluatedSeeds: env.evaluatedSeeds(),
}));`;
}

/**
 * Collect one configuration.
 *
 * @param {object} o
 *   configSeed, configIndex, goal   pre-verified accepted configuration
 *   ticks                           defaults to the frozen 3000
 *   fixture                         true only for implementation fixtures, which
 *                                   must lie outside every registered block
 *   bypassInstrumentation           mutation control: do not register the hook
 *   suppressRecorder                mutation control: leave the guard unset
 */
export function collectOne(o) {
    const fixture = o.fixture === true;
    assertSeedAllowed(o.configSeed, { fixture });

    const ticks = o.ticks === undefined ? FROZEN.ticks : o.ticks;
    if (!fixture && ticks !== FROZEN.ticks) {
        throw new Error(`M8: tick budget ${ticks} is not the frozen ${FROZEN.ticks} (§14.2). ` +
            `A reduced budget is permitted only for an out-of-range implementation fixture.`);
    }
    if (!FROZEN.goalIndices.includes(o.configIndex)) {
        throw new Error(`M8: configIndex ${o.configIndex} is outside the frozen §3.7 schedule.`);
    }

    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'm8run-'));
    const f = path.join(tmp, `c_${o.configSeed}_${o.configIndex}.mjs`);
    try {
        fs.writeFileSync(f, childSource({ ...o, ticks }));
        const out = execFileSync(process.execPath, [f],
            { cwd: HERE, encoding: 'utf8', maxBuffer: 1 << 28 });
        const raw = JSON.parse(out.slice(out.indexOf('@@M8DATA@@') + 10));

        // ---- post-run seed proof -----------------------------------------
        // env records every configSeed makeConfig ever saw in this process.
        for (const s of raw.evaluatedSeeds) assertSeedAllowed(s, { fixture });
        if (raw.evaluatedSeeds.length !== 1 || raw.evaluatedSeeds[0] !== o.configSeed) {
            throw new Error(`M8: the run touched seeds [${raw.evaluatedSeeds}] but was given ` +
                `${o.configSeed}. A forward acceptance walk occurred; the configuration was not ` +
                `pre-verified accepted.`);
        }

        // ---- schema proof -------------------------------------------------
        // §8 is a CLOSED set. Both directions are checked: a dropped observable
        // and an added one are equally a protocol deviation.
        for (const e of raw.events) {
            const keys = Object.keys(e);
            if (keys.length !== TUPLE_FIELDS.length || !TUPLE_FIELDS.every(k => k in e)) {
                throw new Error(`M8: event schema deviates from the frozen §8 tuple: ` +
                    `[${keys.join(',')}]`);
            }
        }

        return {
            runIdentity: {
                configSeed: o.configSeed, configIndex: o.configIndex,
                goal: o.goal, stratum: stratumOf(o.goal),
                agentSeed: FROZEN.agentSeed, arm: FROZEN.arm, ticks,
                preregistration: '8fb0bec13bb2940fa2e7e7f823c632427a28fae3',
                fixture,
            },
            events: raw.events,
            diagnostics: raw.diagnostics,
            provenance: {
                fingerprint: raw.fingerprint,
                artifacts: raw.artifacts,
                envCounters: raw.envCounters,
                evaluatedSeeds: raw.evaluatedSeeds,
            },
        };
    } finally {
        fs.rmSync(tmp, { recursive: true, force: true });
    }
}

// One JSON object per line: append-only, diffable, and streamable. Raw events
// are written verbatim; no reduction, no labelling.
export function toJsonl(result) {
    return result.events
        .map(e => JSON.stringify({ ...result.runIdentity, ...e }))
        .join('\n') + (result.events.length ? '\n' : '');
}
