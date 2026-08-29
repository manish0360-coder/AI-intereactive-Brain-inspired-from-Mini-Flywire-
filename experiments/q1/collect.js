// ==========================================================
// Q1 EXPERIMENT RUNNER — one accepted configuration, raw evidence only
// ==========================================================
// GOVERNING SOURCE
//   research/preregistrations/Q1_PREREGISTRATION.md §3, §4, §6, §11, §14,
//   frozen at 0ad12fe2f190645d2126c9e55aef4f270f853009.
//   Collection parameters ratified by D-006.
//
// WHAT THIS DOES
//   Runs ONE accepted configuration through the committed M7 runtime with the
//   committed Q1 instrumentation attached, and returns the RAW §6 transition
//   records plus the §3 window boundaries and the run identity.
//
// WHAT THIS DOES NOT DO
//   It computes no GAP_COMPOSITION, no FIRST_DIVERGING_TRANSITION, no
//   LAST_TRANSITION_BEFORE_EVALUATION, no TRANSITION_COUNT, no ORIGIN, no AGE,
//   no mechanism frequency, no hypothesis verdict, no statistic, and no causal
//   label. Q1 §7 assigns those to an offline milestone and prohibits naming any
//   of them a cause. Raw observations are never reduced to labels here.
//
// REUSE, NOT DUPLICATION
//   The agent, environment, arms, phase switching and tick budget all come
//   from experiments/m7/run.js unchanged, and the instrumentation from
//   experiments/q1/. This file adds seed discipline, instrumentation
//   attachment, and record keeping. No M7 logic and no M8 logic is restated.
//
// SEED DISCIPLINE — the M8 hazard, carried forward
//   env.generateAccepted walks FORWARD from a rejected seed. From Q1's upper
//   bound 899499 that walk would cross directly into M8's consumed 899500.
//   The runner therefore only ever passes a seed already proven accepted by
//   protocol.enumerateCandidates, where the walk is a no-op, and asserts
//   afterwards that the run consumed exactly that seed and advanced zero.
// ==========================================================
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FROZEN, TRANSITION_FIELDS, BOUNDARY_KINDS, TRANSITION_SITES,
         assertSeedAllowed, stratumOf } from './protocol.js';

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
const I   = await import(U + '/experiments/q1/instrument.js');
const env = await import(U + '/experiments/m7/env.js');

${o.bypassInstrumentation ? '' : `register(U + '/experiments/q1/hook.mjs', import.meta.url);`}

const R = I.createRecorder();
${o.suppressRecorder ? '' : 'globalThis.__MFW_Q1__ = R;'}

const { runOnce } = await import(U + '/experiments/m7/run.js');
const rec = await runOnce({
    configSeed:  ${o.configSeed},
    configIndex: ${o.configIndex},
    agentSeed:   ${FROZEN.agentSeed},
    arm:         ${JSON.stringify(FROZEN.arm)},
    envMode: 'on', creditMode: 'on', pin: 'on', tickUnit: 'step',
    ticks: ${o.ticks}, crashAtTick: null, warmStore: false,
});

process.stdout.write('@@Q1DATA@@' + JSON.stringify({
    transitions: R.transitions(),
    boundaries:  R.boundaries(),
    diagnostics: R.diagnostics(),
    fingerprint: rec.fingerprint,
    artifacts: { cogDraws: rec.artifacts.cogDraws, visDraws: rec.artifacts.visDraws,
                 qEntries: rec.artifacts.qEntries },
    envCounters: env.getCounters(),
    // Runtime proof of exactly which configuration seeds this process touched.
    evaluatedSeeds: env.evaluatedSeeds(),
    // Runtime proof of the parameters actually used, read back from the child
    // rather than assumed from the parent's intent.
    used: { agentSeed: ${FROZEN.agentSeed}, arm: ${JSON.stringify(FROZEN.arm)},
            ticks: ${o.ticks}, configSeed: ${o.configSeed}, configIndex: ${o.configIndex} },
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
        throw new Error(`Q1: tick budget ${ticks} is not the frozen ${FROZEN.ticks} (D-006 §1 D). ` +
            `A reduced budget is permitted only for an out-of-range implementation fixture.`);
    }
    if (!FROZEN.goalIndices.includes(o.configIndex)) {
        throw new Error(`Q1: configIndex ${o.configIndex} is outside the frozen §3.7 schedule.`);
    }

    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'q1run-'));
    const f = path.join(tmp, `c_${o.configSeed}_${o.configIndex}.mjs`);
    try {
        fs.writeFileSync(f, childSource({ ...o, ticks }));
        const out = execFileSync(process.execPath, [f],
            { cwd: HERE, encoding: 'utf8', maxBuffer: 1 << 30 });
        const raw = JSON.parse(out.slice(out.indexOf('@@Q1DATA@@') + 10));

        // ---- post-run seed proof -----------------------------------------
        // env records every configSeed makeConfig ever saw in this process. A
        // forward acceptance walk would show up here as a second seed.
        for (const s of raw.evaluatedSeeds) assertSeedAllowed(s, { fixture });
        if (raw.evaluatedSeeds.length !== 1 || raw.evaluatedSeeds[0] !== o.configSeed) {
            throw new Error(`Q1: the run touched seeds [${raw.evaluatedSeeds}] but was given ` +
                `${o.configSeed}. A forward acceptance walk occurred; the configuration was not ` +
                `pre-verified accepted.`);
        }

        // ---- parameter proof ---------------------------------------------
        // Read back from the child, so a parent-side mistake cannot pass.
        if (!fixture && (raw.used.agentSeed !== FROZEN.agentSeed || raw.used.arm !== FROZEN.arm
                         || raw.used.ticks !== FROZEN.ticks)) {
            throw new Error(`Q1: run used agentSeed ${raw.used.agentSeed}, arm ${raw.used.arm}, ` +
                `ticks ${raw.used.ticks}; frozen values are ${FROZEN.agentSeed}, ${FROZEN.arm}, ` +
                `${FROZEN.ticks}.`);
        }

        // ---- schema proof -------------------------------------------------
        // §6 is a CLOSED set. Both directions are checked: a dropped observable
        // and an added one are equally a protocol deviation.
        for (const t of raw.transitions) {
            const keys = Object.keys(t);
            if (keys.length !== TRANSITION_FIELDS.length || !TRANSITION_FIELDS.every(k => k in t)) {
                throw new Error(`Q1: transition schema deviates from the frozen §6 record: ` +
                    `[${keys.join(',')}]`);
            }
            if (!TRANSITION_SITES.includes(t.site)) {
                throw new Error(`Q1: site "${t.site}" is outside the frozen §4 taxonomy.`);
            }
        }
        for (const b of raw.boundaries) {
            if (!BOUNDARY_KINDS.includes(b.kind)) {
                throw new Error(`Q1: boundary kind "${b.kind}" is not a §3 window boundary.`);
            }
        }

        // ---- integrity proof ----------------------------------------------
        // Losslessness is asserted here, at the collection boundary, so corrupt
        // evidence is a thrown error rather than a silently stored artifact.
        if (raw.diagnostics.pairingViolations !== 0 || raw.diagnostics.openTransition !== false) {
            throw new Error(`Q1: recorder reported ${raw.diagnostics.pairingViolations} pairing ` +
                `violations, openTransition=${raw.diagnostics.openTransition}.`);
        }
        const union = [...raw.transitions, ...raw.boundaries].sort((a, b) => a.seq - b.seq);
        if (!union.every((r, k) => r.seq === k)) {
            throw new Error(`Q1: the sequence is not contiguous over ${union.length} records; ` +
                `a record was dropped or duplicated.`);
        }
        for (let k = 1; k < raw.transitions.length; k++) {
            if (raw.transitions[k].fromPos !== raw.transitions[k - 1].toPos) {
                throw new Error(`Q1: position chain breaks at seq ${raw.transitions[k].seq}: ` +
                    `fromPos ${raw.transitions[k].fromPos} != previous toPos ` +
                    `${raw.transitions[k - 1].toPos}.`);
            }
        }

        return {
            runIdentity: {
                configSeed: o.configSeed, configIndex: o.configIndex,
                goal: o.goal, stratum: stratumOf(o.goal),
                agentSeed: FROZEN.agentSeed, arm: FROZEN.arm, ticks,
                preregistration: FROZEN.preregistration,
                decision: FROZEN.decision,
                fixture,
            },
            transitions: raw.transitions,
            boundaries: raw.boundaries,
            diagnostics: raw.diagnostics,
            provenance: {
                fingerprint: raw.fingerprint,
                artifacts: raw.artifacts,
                envCounters: raw.envCounters,
                evaluatedSeeds: raw.evaluatedSeeds,
                used: raw.used,
            },
        };
    } finally {
        fs.rmSync(tmp, { recursive: true, force: true });
    }
}

// One JSON object per line: append-only, diffable, and streamable. Raw records
// are written verbatim; no reduction, no labelling, no filtering.
export function toJsonl(result, key) {
    const rows = result[key];
    return rows.map(r => JSON.stringify({ ...result.runIdentity, ...r })).join('\n') +
           (rows.length ? '\n' : '');
}
