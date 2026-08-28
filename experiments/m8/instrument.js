// ==========================================================
// M8 MEASUREMENT INFRASTRUCTURE — capture only, no science
// ==========================================================
// GOVERNING SOURCE
//   research/preregistrations/M8_PREREGISTRATION.md §8 (closed observable
//   tuple), §9 (derived predicates), §15 (instrumentation requirements),
//   frozen at commit 8fb0bec13bb2940fa2e7e7f823c632427a28fae3.
//
// WHAT THIS FILE IS
//   Three pure pieces, deliberately separated so each is testable alone:
//     transform(source)   main.js source text -> instrumented source text
//     createRecorder()    the __MFW_M8__ sink the probes call
//     derive(ev, edges)   the frozen derived predicates, computed OFFLINE
//
// WHAT THIS FILE IS NOT
//   It runs no experiment, consumes no configuration seed, computes no
//   mechanism frequency, and reaches no H1-H5 verdict. Classification is
//   reconstructed offline from raw fields by whatever future milestone is
//   authorised to do so.
//
// NEUTRALITY CONTRACT (§15)
//   * every probe is `globalThis.__MFW_M8__ && globalThis.__MFW_M8__.fn(...)`
//     — one falsy global read when disabled, and the guard is evaluated
//     before any argument would be touched;
//   * probes are INSERTED, never substituted: no existing line is edited,
//     no value is changed, no branch is introduced into agent logic;
//   * no probe reads or draws from any RNG stream;
//   * no probe writes to agent, environment, DOM or persistence state;
//   * with the loader unregistered, main.js is byte-identical to HEAD.
// ==========================================================

// ---- capture sites -------------------------------------------------------
// Each anchor is asserted UNIQUE at transform time. `where` is 'after' or
// 'before' the anchor line. The pre-registration's capture points map here:
//   §8 field 11 tickIndex .................. tick
//   §8 fields 6,7 teleport ................. telCap / telPool / telGoal
//   §8 fields 5,8 selection ................ write
//   §8 fields 1,2,3,4,10 read .............. read
//   §8 field 9 goal at evaluation .......... eval
export const SITES = [
    { id: 'tick',    where: 'after',  anchor: 'function runAgent() {',
      probe: '  globalThis.__MFW_M8__ && globalThis.__MFW_M8__.onTick();' },

    { id: 'telCap',  where: 'after',  anchor: 'agentCurrent = _capIds[Math.floor(liveRng() * _capIds.length)];',
      probe: '          globalThis.__MFW_M8__ && globalThis.__MFW_M8__.onTeleport("cap");' },

    { id: 'telPool', where: 'after',  anchor: 'agentCurrent = _pool[Math.floor(liveRng() * _pool.length)];',
      probe: '    globalThis.__MFW_M8__ && globalThis.__MFW_M8__.onTeleport("pool");' },

    { id: 'telGoal', where: 'after',  anchor: 'agentCurrent = allIds[Math.floor(liveRng() * allIds.length)];',
      probe: '    globalThis.__MFW_M8__ && globalThis.__MFW_M8__.onTeleport("goalReset");' },

    // BEFORE the write: `currentKey` is still the position the selection was
    // made from, and `goalNeuronId` is still the goal in force at selection.
    { id: 'write',   where: 'before', anchor: 'window.lastReasoning = {',
      probe: '    globalThis.__MFW_M8__ && globalThis.__MFW_M8__.onWrite(currentKey, nextKey, goalNeuronId);' },

    { id: 'read',    where: 'after',  anchor: 'next = window.lastReasoning.to;',
      probe: '  globalThis.__MFW_M8__ && globalThis.__MFW_M8__.onRead(window.lastReasoning.from, agentCurrent, next);' },

    // BEFORE the comparison: captures the goal identity the comparison uses,
    // on every tick that reaches it, not only on goal reaches.
    { id: 'eval',    where: 'before', anchor: 'if (next === goalNeuronId) {',
      probe: '  globalThis.__MFW_M8__ && globalThis.__MFW_M8__.onEval(goalNeuronId);' },
];

export const TELEPORT_SOURCES = ['cap', 'pool', 'goalReset', 'none'];

// ---- source transform ----------------------------------------------------
// Pure. Throws on a missing or ambiguous anchor rather than guessing: a
// silently skipped probe would produce a measurement with a hole in it.
export function transform(source) { return transformWith(source, SITES); }

// Same splice, over an explicit site list. Exists so a test harness can corrupt a
// capture site and prove the corruption is detected, without the production path
// ever consulting anything but SITES.
export function transformWith(source, sites) {
    let lines = String(source).split('\n');
    for (const site of sites) {
        const hits = [];
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes(site.anchor)) hits.push(i);
        }
        if (hits.length !== 1) {
            throw new Error(
                `M8 anchor "${site.id}" matched ${hits.length} lines, expected exactly 1: ${site.anchor}`);
        }
        lines.splice(site.where === 'after' ? hits[0] + 1 : hits[0], 0, site.probe);
    }
    return lines.join('\n');
}

// ---- recorder ------------------------------------------------------------
// The sink the probes call. Run-level context (phase, configSeed, goalNode)
// is supplied by the caller; the runtime never provides it, so no probe has
// to reach into the environment.
//
// Bookkeeping fields (tickIndex, writeTick, teleportTick, teleportSource,
// agentCurrentAtWrite) are INTERNAL MEASUREMENT INFRASTRUCTURE. They exist
// only to produce frozen observables 4, 6, 7 and 10 and are never read by
// agent code.
export function createRecorder(ctx = {}) {
    const events = [];
    const diag = { ticks: 0, writes: 0, reads: 0, evals: 0, teleports: 0, unpairedReads: 0 };

    let tickIndex = -1;
    let selectionRanThisTick = false;
    let writeTick = null;
    let agentCurrentAtWrite = null;
    let goalIdAtSelection = null;
    let teleportTick = null;
    let teleportSource = 'none';
    let pending = null;                       // read awaiting its evaluation

    const rec = {
        onTick() {
            if (pending) { diag.unpairedReads++; pending = null; }
            tickIndex++;
            diag.ticks++;
            selectionRanThisTick = false;
        },
        onTeleport(source) {
            diag.teleports++;
            teleportTick = tickIndex;
            teleportSource = source;
        },
        onWrite(currentKey, nextKey, goalId) {
            diag.writes++;
            selectionRanThisTick = true;
            writeTick = tickIndex;
            agentCurrentAtWrite = currentKey;
            goalIdAtSelection = goalId;
        },
        onRead(from, agentCurrent, next) {
            diag.reads++;
            pending = {
                from, agentCurrent, next,
                ticksSinceWrite: writeTick === null ? null : tickIndex - writeTick,
                selectionRanThisTick,
                ticksSinceTeleport: teleportTick === null ? null : tickIndex - teleportTick,
                teleportSource,
                goalIdAtSelection,
                agentCurrentChangedSinceLastWrite: agentCurrentAtWrite !== null
                    && agentCurrent !== agentCurrentAtWrite,
                tickIndex,
                phase:      ctx.phase      === undefined ? null : ctx.phase,
                configSeed: ctx.configSeed === undefined ? null : ctx.configSeed,
                goalNode:   ctx.goalNode   === undefined ? null : ctx.goalNode,
            };
        },
        onEval(goalId) {
            diag.evals++;
            if (!pending) return;             // evaluation without a paired read
            pending.goalIdAtEvaluation = goalId;
            events.push(pending);
            pending = null;
        },
        events: () => events,
        diagnostics: () => ({ ...diag }),
    };
    return rec;
}

// ---- derived predicates (§9) — OFFLINE ONLY ------------------------------
// The runtime never calls this. Nothing here can influence execution.
export function derive(ev, edgeSet) {
    const pair = (a, b) => (Number(a) < Number(b) ? `${a}|${b}` : `${b}|${a}`);
    return {
        DESYNC:          ev.from !== ev.agentCurrent,
        NO_FRESH_SEL:    ev.selectionRanThisTick === false,
        STALE_AGE:       ev.ticksSinceWrite,
        TELEPORT_IN_GAP: ev.ticksSinceTeleport !== null && ev.ticksSinceWrite !== null
                             && ev.ticksSinceTeleport <= ev.ticksSinceWrite,
        // §9 / Director decision E: STRICT identity. No Number() coercion.
        GOAL_MISMATCH:   ev.goalIdAtSelection !== ev.goalIdAtEvaluation,
        S_PAIR:          ev.agentCurrent === ev.next,
        // §9: secondary derived label, offline, from connections.json only.
        NON_CANONICAL:   !edgeSet.has(pair(ev.agentCurrent, ev.next)),
    };
}

// Builds the undirected edge set from connections.json entries. Mirrors the
// undirected key used by the canonical graph; consumes nothing else.
export function buildEdgeSet(entries) {
    const s = new Set();
    for (const e of entries) {
        const a = Number(e.from), b = Number(e.to);
        s.add(a < b ? `${a}|${b}` : `${b}|${a}`);
    }
    return s;
}
