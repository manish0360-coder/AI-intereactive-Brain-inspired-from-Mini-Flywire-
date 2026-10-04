// ==========================================================
// H1-R — M7 CONFORMANCE TRANSFORM (applied to the B2 agent sources)
// ==========================================================
// H1-R tests the M7 design AS FROZEN (research/cognitive-audit/M7_PREREGISTRATION.md,
// SHA-256 2f12e309…f6b9). B2 = 707cb1e is the M7 instrument build; it departs from the
// frozen text in measured ways (B2 characterization, 2026-10-04). This module rewrites
// exactly the lines needed to make the runtime conform, and nothing else.
//
// RULES
//   * Every edit is GUARDED by `globalThis.__H1R__ && globalThis.__H1R__.on`. With no
//     H1-R runtime attached the transformed tree behaves bit-identically to B2 (gate G1').
//   * Every anchor must match EXACTLY the expected number of times, or the build refuses.
//   * No production file in the repository is modified: the transform is applied to a
//     materialised copy of the B2 blobs (see build_tree.mjs).
//
// EDITS (tag → frozen authority → change)
//   N1-MASK   §3.1/§3.3   a candidate that is not a graph neighbour is never admitted (memory/
//                         neighbour loop and, as N1-MASK-SEM, the goal-free semantic loop)
//   N1-GUARD  §3.1/§3.3   an executed move must be a graph edge (or the no-op self re-execution)
//   N1-SEAL   §3.1/§6.1   a consecutive episode pair that is not a graph edge never becomes an
//                         episode transition (so it cannot reach transitions/Q/replay/trust)
//   N2        §6.1        under M7 credit, trust success is recorded iff the traversal succeeded:
//                         the episode-level success writer is suppressed (mode 'traversal')
//   A3        §4          RANDOM: the executed (step-0) action is uniform over graph neighbours
//   A4-Q      §4          FROZEN: no Q-table write (updateQ choke point + Q decay)
//   A4-T      §4          FROZEN: no trust-store write (E2 credit + trust decay)
//   GOAL      §3.4/G15'   every goal reach pays the existing +12 (eligibility no longer read)
//   P4        §3.7        at every episode reset (goal, cap) the pre-reset reasoning is cleared
//   CRG       (0f47d7b)   canReachGoal backtracking — the existing HEAD correctness fix, guarded
//   R1        §3.3/§3.4   realised-outcome learning order (Director ruling R1, 2026-10-04): the
//                         decision's ONE environment draw is taken BEFORE the self-learning section,
//                         which then reads the realised transition (from = the decision position,
//                         to = the realised node); the E1' traversal block still performs the move.
//                         Learning rules, reward constants, Q equation and parameters unchanged.
// ==========================================================

export const B2_COMMIT = '707cb1e5205a7e9979f81092ee1ebfa0fe28922e';
const G = 'globalThis.__H1R__ && globalThis.__H1R__.on';

function refuse(file, tag, msg) { throw new Error(`H1R conformance transform [${file}:${tag}] ${msg}`); }

function findAll(L, pred) { const o = []; L.forEach((l, i) => { if (pred(l)) o.push(i); }); return o; }

function one(file, tag, L, pred, expected = 1) {
  const idx = findAll(L, pred);
  if (idx.length !== expected) refuse(file, tag, `anchor matched ${idx.length} times, expected ${expected}`);
  return idx;
}

function replaceLine(file, tag, L, exact, replacement) {
  const [i] = one(file, tag, L, l => l === exact);
  L[i] = replacement;
}

// ---------------- main.js ----------------
function transformMain(text) {
  const F = 'main.js';
  const L = text.split('\n');

  // N1-MASK — inside the candidate loop of runPrediction, before the admission test.
  {
    const [i] = one(F, 'N1-MASK', L, l => l === '    if (!isGraphNeighbor && !isEpisodeTrained && !isHumanTrained) {');
    L.splice(i, 0, `    if (${G} && !isGraphNeighbor) return; // H1R N1-MASK: graph-neighbour candidates only`);
  }

  // N1-MASK-SEM — the semantic candidate loop (active only when no goal is set) can also
  // push non-neighbour candidates into `choices`; mask it the same way. (The third candidate
  // path, structureMap, is graph neighbours by construction.)
  {
    const [i] = one(F, 'N1-MASK-SEM', L, l => l === '    return; // episodic planning mode: no semantic candidates');
    if (L[i + 1] !== '  }') refuse(F, 'N1-MASK-SEM', 'closing brace of the goal guard not found');
    L.splice(i + 2, 0, `  if (${G} && !globalThis.__H1R__.isEdge(currentKey, k)) return; // H1R N1-MASK-SEM: graph-neighbour semantic candidates only`);
  }

  // A3 — RANDOM. Immediately before the step-0 write of window.lastReasoning.
  {
    const [w] = one(F, 'A3', L, l => l === '  window.lastReasoning = {');
    if (L[w - 1] !== 'if (step === 0) {') refuse(F, 'A3', 'step-0 guard not found above the lastReasoning write');
    L.splice(w - 1, 0,
      `if (step === 0 && ${G} && globalThis.__H1R__.uniform()) { const _h1rNb = startNeuron.userData.neighbors; nextKey = _h1rNb[Math.floor(liveRng() * _h1rNb.length)]; } // H1R A3 RANDOM`);
  }

  // N1-GUARD — runAgent, right after the executed reasoning is read.
  {
    const [i] = one(F, 'N1-GUARD', L, l => l === '  let nextStep = reasoning.to;');
    if (!L.slice(i - 4, i).includes('  if (!reasoning) return;')) refuse(F, 'N1-GUARD', 'reasoning null-check not found within 4 lines above');
    L.splice(i, 0,
      `  if (${G} && !globalThis.__H1R__.legalMove(agentCurrent, reasoning.to)) { globalThis.__H1R__.counters.blockedIllegal++; return; } // H1R N1-GUARD`);
  }

  // GOAL — flat +12 on every goal reach.
  replaceLine(F, 'GOAL', L, '      if (episodeUnique >= 3) {',
    `      if (episodeUnique >= 3 || (${G})) { // H1R GOAL: flat +12, eligibility not read`);

  // A4-Q — FROZEN: Q decay.
  replaceLine(F, 'A4-Q-decay', L, '      Q.set(key, value * rate);',
    `      if (!(${G} && globalThis.__H1R__.qFrozen())) Q.set(key, value * rate); // H1R A4-Q`);

  // A4-T — FROZEN: trust decay.
  replaceLine(F, 'A4-T-decay', L, '      decayTrust(0.9997);',
    `      if (!(${G} && globalThis.__H1R__.trustFrozen())) decayTrust(0.9997); // H1R A4-T`);

  // A4-T — FROZEN: E2 traversal credit (the only trust writer active under M7 besides N2's).
  replaceLine(F, 'A4-T-credit', L, 'if (next !== null && !_goalResetJustHappened && _m7cred) {',
    `if (next !== null && !_goalResetJustHappened && _m7cred && !(${G} && globalThis.__H1R__.trustFrozen())) { // H1R A4-T`);
  {
    const [i] = one(F, 'N2-note', L, l => l === '    _m7cred.recordTraversal(_m7From, _m7To, _m7Traversed);');
    L.splice(i + 1, 0, `    if (${G}) globalThis.__H1R__.noteAttempt(_m7From, _m7To); // H1R N2 bookkeeping (diagnostic mode only)`);
  }

  // CRG — canReachGoal backtracking, exactly the three changes of HEAD commit 0f47d7b
  // (whose base blob 113fa47 IS the B2 main.js), guarded. Without it N1 turns the B2 false
  // negatives into a decision trap (state 3 / goal 16 has no admissible neighbour).
  replaceLine(F, 'CRG-1', L, '    if (!neuron) return false;',
    `    if (!neuron) { if (${G}) visited.delete(currentId); return false; } // H1R CRG (0f47d7b)`);
  replaceLine(F, 'CRG-2', L, '      if (dfs(nextId, depth - 1)) return true;',
    `      if (dfs(nextId, depth - 1)) { if (${G}) visited.delete(currentId); return true; } // H1R CRG (0f47d7b)`);
  {
    const [i] = one(F, 'CRG-3', L, l => l === '    return false; // no path found');
    L.splice(i, 0, `    if (${G}) visited.delete(currentId);   // H1R CRG (0f47d7b): backtrack, release for sibling branches`);
  }

  // R1 — REALISED-OUTCOME LEARNING ORDER (Director ruling R1, 2026-10-04; frozen §3.3/§3.4).
  // B2 runs the whole self-learning section (reward, emotion, prediction error, Q, curiosity,
  // transitions, success episodes, goal reset, explore step) BEFORE the environment draw, on the
  // INTENDED move, with `agentLast` still holding the previous tick's position. The section is
  // written in post-move terms (`prev = agentLast // where we were before`, `current = next //
  // where we moved now`, Q state = agentLast, action = next, nextState = agentCurrent).
  // Under H1R:
  //   R1-DRAW-EARLY  the decision's one environment draw is taken immediately before the section:
  //                  the same call `__M7_ENV__.attempt(u, v)` with the same arguments the E1 site
  //                  uses (u = agentCurrent, to which agentLast is synced before E1; v = next), the
  //                  same exclusions (no decision; goal-entering move), the same stream.
  //   R1-VIEW        the section reads the REALISED transition: from = u (agentLast = u);
  //                  success -> to = v (agentCurrent = v); slip -> the realised node is u (next = u),
  //                  i.e. a realised self-transition, which the section's existing entry guard
  //                  ("prevents corrupt self-loop learning") excludes: no reward, PE or Q update;
  //                  the slip costs only the elapsed tick (§3.4; ERR-05 E1').
  //   R1-RESTORE     after the section the pre-move view is restored (agentCurrent = u unless the
  //                  goal reset ran; next = the intended v), so the E1' traversal block performs
  //                  the move and E2 credits the INTENDED edge u->v (§3.3, §6.1).
  //   R1-DRAW        the E1 site reuses the outcome drawn by R1-DRAW-EARLY (no second draw).
  // B2's original updateQ, recordAutonomousStep and recordAutonomousSuccess calls are unchanged:
  // in the realised view their own arguments are the realised transition.
  {
    const [c] = one(F, 'R1-VIEW', L, l => l === '    agentLast !== goalNeuronId');
    const i = c - 8;
    if (L[i] !== 'if (' || L[i + 2] !== '    agentLast !== null &&' || L[i + 4] !== '    next !== null &&' || L[i + 6] !== '    agentLast !== next &&' || L[i + 10] !== ') {')
      refuse(F, 'R1-VIEW', 'self-learning entry guard not found in the expected shape');
    if (!L.slice(i - 6, i).some(l => l.includes('SAFE SELF LEARNING'))) refuse(F, 'R1-VIEW', 'SAFE SELF LEARNING header not found above the guard');
    L.splice(i, 0,
      `let _h1rTrav = true, _h1rU = agentCurrent, _h1rV = next, _h1rGoalResets = 0; // H1R R1 state`,
      `if (${G}) { _h1rTrav = (next !== null && !(goalNeuronId !== null && Number(next) === Number(goalNeuronId)) && globalThis.__M7_ENV__) ? globalThis.__M7_ENV__.attempt(agentCurrent, next) : true; _h1rGoalResets = globalThis.__H1R__.counters.resets.goal; globalThis.__H1R__.noteR1(agentCurrent, next, _h1rTrav); } // H1R R1-DRAW-EARLY: the one environment draw of this decision, before learning`,
      `if (${G}) { agentLast = agentCurrent; if (!_h1rTrav) next = agentCurrent; else if (next !== null) agentCurrent = next; } // H1R R1-VIEW: the section below reads the realised transition`);
  }
  {
    const [s] = one(F, 'R1-RESTORE', L, l => l === 'agentLast = agentCurrent;                       // 👉 store current as "previous" for next step');
    let k = s - 1; while (k > 0 && (L[k].trim() === '' || L[k].trim().startsWith('//'))) k--;
    if (L[k] !== '}') refuse(F, 'R1-RESTORE', 'end of the self-learning section not found above the sync');
    L.splice(s, 0, `if (${G}) { if (globalThis.__H1R__.counters.resets.goal === _h1rGoalResets) agentCurrent = _h1rU; next = _h1rV; } // H1R R1-RESTORE: pre-move view for the E1' traversal block and E2`);
  }
  {
    const [d] = one(F, 'R1-DRAW', L, l => l === '    (next !== null && !_goalResetJustHappened && _m7env)');
    if (L[d - 1] !== 'const _m7Traversed =' || L[d + 1] !== '        ? _m7env.attempt(_m7From, _m7To)' || L[d + 2] !== '        : true;') refuse(F, 'R1-DRAW', 'E1 draw expression not found in the expected shape');
    L[d] = `    (${G}) ? _h1rTrav : (next !== null && !_goalResetJustHappened && _m7env) // H1R R1-DRAW: reuse the outcome drawn before learning`;
  }

  // P4 — clear the pre-reset reasoning at both episode-reset sites.
  {
    const [g] = one(F, 'P4-goal', L, l => l === '    agentCurrent = allIds[Math.floor(liveRng() * allIds.length)];');
    L.splice(g + 1, 0, `    if (${G}) { window.lastReasoning = null; globalThis.__H1R__.episodeBoundary('goal'); } // H1R P4`);
    const [c] = one(F, 'P4-cap', L, l => l === '          agentCurrent = _capIds[Math.floor(liveRng() * _capIds.length)];');
    L.splice(c + 1, 0, `          if (${G}) { window.lastReasoning = null; globalThis.__H1R__.episodeBoundary('cap'); } // H1R P4`);
  }
  return L.join('\n');
}

// ---------------- render/qlearning.js ----------------
function transformQ(text) {
  const F = 'render/qlearning.js';
  const L = text.split('\n');
  const [s] = one(F, 'A4-Q', L, l => l === 'export function updateQ({');
  let close = -1;
  for (let k = s + 1; k < s + 30; k++) if (L[k] === '}) {') { close = k; break; }
  if (close < 0) refuse(F, 'A4-Q', 'updateQ parameter list close not found');
  L.splice(close + 1, 0, `    if (${G} && globalThis.__H1R__.qFrozen()) return; // H1R A4-Q: single choke point for every updateQ caller`);
  return L.join('\n');
}

// ---------------- render/episodeManager.js ----------------
function transformEM(text) {
  const F = 'render/episodeManager.js';
  const L = text.split('\n');
  replaceLine(F, 'N1-SEAL', L, '        if (nodes[i] !== nodes[i + 1]) {  // extra self-loop guard',
    `        if (nodes[i] !== nodes[i + 1] && !(${G} && !globalThis.__H1R__.isEdge(nodes[i], nodes[i + 1]))) {  // extra self-loop guard + H1R N1-SEAL`);
  replaceLine(F, 'N2', L, '        sys.recordSuccess(key);',
    `        if (!(${G} && globalThis.__M7_CREDIT__ && !globalThis.__H1R__.episodeCreditAllowed(key))) sys.recordSuccess(key); // H1R N2 (scope: M7 credit, §6.1)`);
  return L.join('\n');
}

export const TRANSFORMS = Object.freeze({
  'main.js': transformMain,
  'render/qlearning.js': transformQ,
  'render/episodeManager.js': transformEM,
});

export const EDIT_TAGS = Object.freeze(['N1-MASK', 'N1-MASK-SEM', 'A3', 'N1-GUARD', 'GOAL', 'A4-Q-decay', 'A4-T-decay', 'A4-T-credit',
  'N2-note', 'P4-goal', 'P4-cap', 'CRG-1', 'CRG-2', 'CRG-3', 'R1-VIEW', 'R1-RESTORE', 'R1-DRAW', 'A4-Q', 'N1-SEAL', 'N2']);
