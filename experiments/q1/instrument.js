// ==========================================================
// Q1 MEASUREMENT INFRASTRUCTURE — transition capture only, no science
// ==========================================================
// GOVERNING SOURCE
//   research/preregistrations/Q1_PREREGISTRATION.md §3 (observation window),
//   §4 (closed transition taxonomy), §5 (completeness gate), §6 (closed raw
//   schema), §11 (intervention-free requirements), frozen at
//   0ad12fe2f190645d2126c9e55aef4f270f853009.
//   Collection parameters ratified by D-006 (research/09_decisions.md).
//
// WHAT THIS FILE IS
//   Two pure pieces, deliberately separated so each is testable alone:
//     transform(source)   main.js source text -> instrumented source text
//     createRecorder()    the __MFW_Q1__ sink the probes call
//
// WHAT THIS FILE IS NOT
//   It runs no experiment, enumerates no seed, consumes no configuration seed
//   from the D-006 range 899000-899499, never touches the held-out block
//   >= 900500, computes no GAP_COMPOSITION, no FIRST_DIVERGING_TRANSITION, no
//   LAST_TRANSITION_BEFORE_EVALUATION and no TRANSITION_COUNT. Those are §7
//   DERIVED observables, computed offline by a later authorised milestone.
//   Nothing here classifies a transition and nothing here names a cause; the
//   term "proximate cause" is prohibited by §7 and appears nowhere.
//
// NEUTRALITY CONTRACT (§11)
//   * every probe is `globalThis.__MFW_Q1__ && globalThis.__MFW_Q1__.fn(...)`
//     — one falsy global read when disabled, evaluated before any argument
//     would be touched;
//   * probes are INSERTED, never substituted: no existing line is edited, no
//     value is changed, no branch is introduced into agent logic;
//   * no probe reads or draws from any RNG stream;
//   * no probe writes to agent, environment, DOM or persistence state;
//   * with the loader unregistered, main.js is byte-identical to HEAD.
//
// REUSE, NOT DUPLICATION
//   The cap, pool and goalReset anchors and the write/read window boundaries
//   are NOT restated here. They are read out of experiments/m8/instrument.js
//   through m8Anchor(), so there is exactly one textual definition of each in
//   the repository. If an M8 anchor is renamed or removed, Q1 fails closed at
//   module load rather than silently instrumenting a different line.
// ==========================================================
import { SITES as M8_SITES } from '../m8/instrument.js';

// ---- reused anchors ------------------------------------------------------
// Fails closed: a missing M8 site id is a load-time throw, never a fallback.
function m8Anchor(id) {
    const s = M8_SITES.find(x => x.id === id);
    if (!s) throw new Error(`Q1: M8 capture site "${id}" no longer exists; anchors cannot be reused`);
    return s.anchor;
}

// ---- §4 closed transition taxonomy --------------------------------------
// Exactly the four reachable `agentCurrent` assignment sites. The wipe at
// main.js:5209 is deliberately ABSENT, not forgotten: it sits inside the
// `e.code === "KeyR" && e.shiftKey` branch of the keydown listener, and the
// headless harness dispatches only `{code:'Space', shiftKey:false}`. §4
// records the reason rather than omitting the site, and §5 makes an
// additional REACHABLE assignment a halting condition — enforced by the
// completeness gate in verify_q1_instrument.js, not by this file.
export const TRANSITION_SITES = Object.freeze(['cap', 'pool', 'goalReset', 'advance']);

// ---- capture sites -------------------------------------------------------
// Each anchor is asserted UNIQUE at transform time, and each carries
// structural `neighbors` pins: exact trimmed line content at a fixed offset.
// Uniqueness alone would not catch an anchor that survived textually but moved
// into a different enclosing block; the pins do. `where` is 'after' or
// 'before' the anchor line.
//
// A transition needs BOTH sides. fromPos is read from `agentCurrent` BEFORE
// the assignment and toPos AFTER it, so both are observed at the source. They
// are deliberately NOT reconstructed from the previous record's toPos: §6
// keeps fromPos precisely so a dropped record shows up as a discontinuity, and
// a recorder-remembered fromPos would be continuous by construction and would
// destroy that integrity property.
const G = 'globalThis.__MFW_Q1__ && globalThis.__MFW_Q1__.';

function transitionProbes({ site, anchor, indent, neighbors }) {
    return [
        { id: `${site}:begin`, site, where: 'before', anchor, neighbors,
          probe: `${indent}${G}onTransitionBegin(${JSON.stringify(site)}, agentCurrent);` },
        { id: `${site}:end`,   site, where: 'after',  anchor, neighbors,
          probe: `${indent}${G}onTransitionEnd(${JSON.stringify(site)}, agentCurrent);` },
    ];
}

export const SITES = Object.freeze([
    // Tick boundary. Supplies tickIndex, which is what makes §3 window
    // membership decidable per record.
    { id: 'tick', where: 'after', anchor: m8Anchor('tick'),
      neighbors: [{ offset: 0, text: 'function runAgent() {' }],
      probe: `  ${G}onTick();` },

    // ---- §4 taxonomy: the four reachable transitions --------------------
    ...transitionProbes({
        site: 'cap', anchor: m8Anchor('telCap'), indent: ' '.repeat(10),
        neighbors: [
            { offset: -2, text: 'const _capIds = Array.from(neuronMap.keys())' },
            { offset: +1, text: 'agentLast    = agentCurrent;' },
        ],
    }),
    ...transitionProbes({
        site: 'pool', anchor: m8Anchor('telPool'), indent: ' '.repeat(4),
        neighbors: [
            { offset: -1, text: 'const _pool = _startIds.length > 0 ? _startIds : Array.from(neuronMap.keys());' },
        ],
    }),
    ...transitionProbes({
        site: 'goalReset', anchor: m8Anchor('telGoal'), indent: ' '.repeat(4),
        neighbors: [
            { offset: -2, text: '.filter(id => Number(id) !== Number(goalNeuronId));' },
            { offset: +1, text: 'agentLast    = agentCurrent;' },
        ],
    }),
    // The one NEW instrumentation point this milestone adds: the ordinary
    // advance at main.js:4917. Its -1 pin is the exact guard that makes it the
    // ordinary advance rather than any other assignment.
    ...transitionProbes({
        site: 'advance', anchor: 'agentCurrent = next;', indent: ' '.repeat(2),
        neighbors: [
            { offset: -1, text: 'if (next !== null && !_goalResetJustHappened && _m7Traversed) {' },
        ],
    }),

    // ---- §3 window boundaries -------------------------------------------
    // BEFORE the write: `currentKey` is still the position the selection was
    // made from. This is the OPENING edge of the gap (main.js:2635).
    { id: 'write', where: 'before', anchor: m8Anchor('write'),
      neighbors: [{ offset: -1, text: 'if (step === 0) {' }],
      probe: `    ${G}onWrite(currentKey, nextKey);` },

    // AFTER the read: the CLOSING edge of the gap (main.js:3819).
    { id: 'read', where: 'after', anchor: m8Anchor('read'),
      neighbors: [{ offset: -1, text: 'if (window.lastReasoning) {' }],
      probe: `  ${G}onRead(window.lastReasoning.from, agentCurrent, next);` },
]);

// ---- source transform ----------------------------------------------------
// Pure. Fails closed on a missing, duplicated or structurally moved anchor
// rather than guessing: a silently skipped probe would produce a transition
// log with a hole in it, and §6's whole integrity argument assumes losslessness.
export function transform(source) { return transformWith(source, SITES); }

// Same splice, over an explicit site list. Exists so a test harness can corrupt
// a capture site and prove the corruption is detected, without the production
// path ever consulting anything but SITES.
export function transformWith(source, sites) {
    const lines = String(source).split('\n');

    // Pass 1 — locate every anchor against the ORIGINAL, unmodified lines.
    // Locating up front (rather than re-scanning a progressively spliced
    // array) means an inserted probe can never become the match for a later
    // anchor, and makes the result independent of site order.
    const plan = [];
    for (const site of sites) {
        const hits = [];
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes(site.anchor)) hits.push(i);
        }
        if (hits.length !== 1) {
            throw new Error(
                `Q1 anchor "${site.id}" matched ${hits.length} lines, expected exactly 1: ${site.anchor}`);
        }
        const at = hits[0];
        for (const n of (site.neighbors || [])) {
            const j = at + n.offset;
            const got = (j >= 0 && j < lines.length) ? lines[j].trim() : null;
            if (got !== n.text) {
                throw new Error(
                    `Q1 site "${site.id}" structural pin failed at offset ${n.offset}: ` +
                    `expected ${JSON.stringify(n.text)}, found ${JSON.stringify(got)}`);
            }
        }
        plan.push({ id: site.id, index: site.where === 'after' ? at + 1 : at, probe: site.probe });
    }

    // Pass 2 — a probe must never itself be an anchor for any site.
    for (const p of plan) {
        for (const s of sites) {
            if (p.probe.includes(s.anchor)) {
                throw new Error(`Q1 probe "${p.id}" contains the anchor of site "${s.id}"`);
            }
        }
    }

    // Pass 3 — splice descending so earlier indices stay valid. The id
    // tie-break keeps the result deterministic if two probes ever share an
    // insertion index.
    plan.sort((a, b) => (b.index - a.index) || (a.id < b.id ? 1 : -1));
    for (const p of plan) lines.splice(p.index, 0, p.probe);
    return lines.join('\n');
}

// ---- recorder ------------------------------------------------------------
// The append-only sink the probes call.
//
// TWO LOGS, ONE ORDER. `transitions` carries EXACTLY the §6 closed schema
// {seq, tickIndex, site, fromPos, toPos} and nothing else — 'write' and 'read'
// are not §4 taxonomy members and may not appear as `site` values. The window
// boundaries therefore live in a SEPARATE `boundaries` log, which is
// measurement infrastructure in the same sense as M8's bookkeeping fields.
//
// Both logs draw from ONE monotonic `seq` counter. That is deliberate: it
// makes "did this transition fall between the write and the read" an
// OBSERVED total order rather than an inference from tickIndex plus an assumed
// in-tick source layout — which is exactly the role §6 assigns to `seq`. The
// counter is monotonic, not contiguous within either log; contiguity holds
// over the UNION, and verify_q1_instrument.js asserts it there.
//
// §3 SEMANTICS PRESERVED: nothing here assumes an AGE=k gap contains k
// transitions. Records are appended as they happen, so a gap may contain a
// post-evaluation transition on the write tick, transitions on intermediate
// ticks, and a pre-read transition on the read tick — up to 2k at age k, and
// two even at age 1. The recorder imposes no per-tick or per-gap limit.
//
// NOTHING IS CLASSIFIED HERE. No gap is assembled, no ordering is interpreted,
// no §7 derived observable is computed, no causal label is attached.
export function createRecorder() {
    const transitions = [];
    const boundaries  = [];
    const diag = { ticks: 0, writes: 0, reads: 0, transitions: 0, pairingViolations: 0 };

    let seq = 0;
    let tickIndex = -1;
    let open = null;                          // the begin awaiting its end

    const norm = (v) => (v === undefined ? null : v);

    return {
        onTick() {
            tickIndex++;
            diag.ticks++;
        },

        // FAIL CLOSED. The begin/end probes are adjacent statements in the
        // same block with no branch, call or throw between them, so neither
        // violation below is reachable under the intended insertion — which is
        // precisely why a violation means the insertion is wrong and the log
        // is already corrupt. Recording a half-transition, or silently
        // dropping one, would corrupt the chain §6 relies on. Under intended
        // operation no throw is reachable, so control flow is unaltered; the
        // gate asserts pairingViolations === 0 over a full run.
        onTransitionBegin(site, fromPos) {
            if (!TRANSITION_SITES.includes(site)) {
                diag.pairingViolations++;
                throw new Error(`Q1: site "${site}" is outside the frozen §4 taxonomy`);
            }
            if (open !== null) {
                diag.pairingViolations++;
                throw new Error(`Q1: transition "${site}" began while "${open.site}" was still open`);
            }
            open = { site, fromPos: norm(fromPos) };
        },

        onTransitionEnd(site, toPos) {
            if (open === null) {
                diag.pairingViolations++;
                throw new Error(`Q1: transition "${site}" ended with none open`);
            }
            if (open.site !== site) {
                diag.pairingViolations++;
                throw new Error(`Q1: transition "${site}" ended while "${open.site}" was open`);
            }
            // Append-only. Nothing already in the array is ever rewritten.
            transitions.push({
                seq: seq++,
                tickIndex,
                site: open.site,
                fromPos: open.fromPos,
                toPos: norm(toPos),
            });
            diag.transitions++;
            open = null;
        },

        onWrite(fromKey, toKey) {
            diag.writes++;
            boundaries.push({ seq: seq++, tickIndex, kind: 'write',
                              from: norm(fromKey), to: norm(toKey) });
        },

        onRead(from, agentCurrent, next) {
            diag.reads++;
            boundaries.push({ seq: seq++, tickIndex, kind: 'read',
                              from: norm(from), agentCurrent: norm(agentCurrent), next: norm(next) });
        },

        transitions:  () => transitions,
        boundaries:   () => boundaries,
        diagnostics:  () => ({ ...diag, seq, openTransition: open !== null }),
    };
}
