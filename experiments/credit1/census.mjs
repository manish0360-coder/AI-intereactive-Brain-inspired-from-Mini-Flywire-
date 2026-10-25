// ==========================================================
// CREDIT-1 — census of the credit block (pure; READ-ONLY; DESIGN r2 section 2)
// ==========================================================
// Locates the self-learning (credit) block of runAgent by exact anchors, finds every line inside it that names
// `agentLast`, `prev` or `agentCurrent`, and matches the lines, in order, against the classification below.
//   censusBlock(text)               production main.js: 46 lines
//   censusBlock(text, {tree: true}) the LEARN-0 experiment tree: 47 lines (the GATE-FLOOR-B2 goal-reset probe is INSTRUMENT)
// Each row carries its action in arm A and in arm A+:
//   FROM  agentLast -> __c1o     TO  agentCurrent -> __c1n     FROM+TO  both     PREV  prev -> __c1o
//   PREV_P (A+ only)  prev -> __c1p        KEEP  unchanged
// ==========================================================

export const IDENT = /(^|[^A-Za-z0-9_$])(agentLast|prev|agentCurrent)(?=[^A-Za-z0-9_$]|$)/g;
export const GFB2_PROBE_TEXT = 'if (globalThis.__GFB2__) globalThis.__GFB2__.goalReset(agentCurrent, current, goalNeuronId); // GATEFLOOR-B2 probe: goal reset (observational, call-only)';
const trim = (s) => s.replace(/^\s+|\s+$/g, '');

// [exact trimmed text, class, action A, action A+, site]
export const CLASSIFICATION = Object.freeze([
  ['agentLast !== null &&', 'GUARD', 'KEEP', 'KEEP', 'block guard (when credit happens)'],
  ['agentLast !== next &&', 'GUARD', 'KEEP', 'KEEP', 'block guard'],
  ['agentLast !== goalNeuronId', 'GUARD', 'KEEP', 'KEEP', 'block guard'],
  ['if (agentLast === next) {', 'DEAD', 'KEEP', 'KEEP', 'energy cost; never true inside the guard'],
  ['agentLast + "->" + next;', 'REKEY', 'FROM', 'FROM', 'repeatKey: curiosity read -> repetition penalty in rewardSignal'],
  ['fromId: agentLast,', 'REKEY', 'FROM', 'FROM', 'updateLocalEmotion (render/emotionMap.js; session-only)'],
  ['state:     makeStateKey(agentLast,    goalNeuronId),', 'REKEY', 'FROM', 'FROM', 'TD Q update, state (persisted Q)'],
  ['nextState: makeStateKey(agentCurrent, goalNeuronId),', 'REKEY', 'TO', 'TO', 'TD Q update, bootstrap state (persisted Q)'],
  ['agentLast,', 'REKEY', 'FROM', 'FROM', 'updateTransitionUncertainty (render/predictionError.js; session-only)'],
  ['updateSequenceError(agentCurrent);', 'POSITION', 'KEEP', 'KEEP', 'position-level sequence error (no pair)'],
  ['makeStateKey(agentLast, goalNeuronId),', 'REKEY', 'FROM', 'FROM', 'dampQ (persisted Q)'],
  ['const fromNeuronSemExp = neuronMap.get(Number(agentLast));', 'REKEY', 'FROM', 'FROM', 'semantic expectation outcome (session-only); legacy pair = previous move'],
  ['const toNeuronSemExp   = neuronMap.get(Number(agentCurrent));', 'REKEY', 'TO', 'TO', 'semantic expectation outcome (session-only)'],
  ['updateProceduralUncertainty(agentLast, agentCurrent, proceduralOutcome);', 'REKEY', 'FROM+TO', 'FROM+TO', 'procedural uncertainty ledger (session-only)'],
  ['propagateUncertainty(agentLast, agentCurrent, neuronMap);', 'REKEY', 'FROM+TO', 'FROM+TO', 'uncertainty propagation (session-only)'],
  ['const curKey = agentLast + "->" + next;', 'REKEY', 'FROM', 'FROM', 'curiosity write from prediction error (persisted curiosity)'],
  ['"| transUnc:", getTransitionUncertainty(agentLast, next).toFixed(3),', 'LOG', 'KEEP', 'KEEP', 'console log only'],
  ['state:     makeStateKey(agentLast,    goalNeuronId),', 'REKEY', 'FROM', 'FROM', 'fallback TD Q update, state (persisted Q)'],
  ['nextState: makeStateKey(agentCurrent, goalNeuronId),', 'REKEY', 'TO', 'TO', 'fallback TD Q update, bootstrap state (persisted Q)'],
  ['const fromNeuronSem  = findNeuronById(agentLast);', 'REKEY', 'FROM', 'FROM', 'semantic memory layer (fallback branch; session-only)'],
  ['agentLast,', 'REKEY', 'FROM', 'FROM', 'recordSemanticEdge (fallback; session-only)'],
  ['agentLast,', 'REKEY', 'FROM', 'FROM', 'reinforcePath (fallback; session-only; feeds the consolidation registry)'],
  ['weakenPath(agentLast, next, Math.abs(rewardSignal) * 0.3);', 'REKEY', 'FROM', 'FROM', 'weakenPath (fallback; session-only; feeds the consolidation registry)'],
  ['agentLast + "->" + next;', 'REKEY', 'FROM', 'FROM', 'stepPathKey: uncertainty engine + semantic vitality (fallback; session-only)'],
  ['getQ(makeStateKey(agentLast, goalNeuronId), next);   // D1', 'REKEY', 'FROM', 'FROM', 'predictedQ read for the uncertainty engine (fallback)'],
  ['updateSequenceError(agentCurrent);', 'POSITION', 'KEEP', 'KEEP', 'position-level sequence error (no pair)'],
  ['agentLast !== null && next !== null && agentLast !== next) {', 'GUARD', 'KEEP', 'KEEP', 'trust-attempt guard'],
  ['const attemptKey = agentLast + "->" + next;', 'REKEY', 'FROM', 'FROM', 'trust attempt (render/trustMemory.js; session-only; live in scoring)'],
  ['const prev = agentLast; // 👉 where we were before', 'HELD', 'KEEP', 'KEEP', '`prev` keeps its legacy value'],
  ['if (current !== null && current !== prev) {', 'HELD', 'KEEP', 'KEEP', 'recentMemory push condition (path buffer, not a credit key)'],
  ['const key = prev + "->" + current;', 'REKEY', 'PREV', 'PREV', 'key: curiosity write, goal reward, penalty, confidence penalty (persisted)'],
  ['// prev→current where eat(9) is not a graph neighbor of milk(7)', 'COMMENT', 'KEEP', 'KEEP', 'comment'],
  ['const prevNeuronForMem = findNeuronById(prev);', 'HELD', 'KEEP', 'PREV_P', 'transitions write, edge-filtered'],
  ['const map = transitions.get(prev) || new Map();', 'HELD', 'KEEP', 'PREV_P', 'transitions write, edge-filtered'],
  ['transitions.set(prev, map);', 'HELD', 'KEEP', 'PREV_P', 'transitions write, edge-filtered'],
  ['const key = prev + "->" + current;', 'REKEY', 'PREV', 'PREV', 'goal key: shortcut penalty and scaled goal reward (persisted)'],
  ['const finalStepTC = trajectoryConfidence(prev, current);', 'REKEY', 'PREV', 'PREV', 'final-step trajectory confidence that scales the goal reward'],
  ['findNeuronById(prev)?.userData.label,', 'LOG', 'KEEP', 'KEEP', 'console log only'],
  ['agentCurrent = allIds[Math.floor(liveRng() * allIds.length)];', 'RESET', 'KEEP', 'KEEP', 'goal reset (position assignment)'],
  ['agentLast    = agentCurrent;', 'RESET', 'KEEP', 'KEEP', 'goal reset (position assignment)'],
  ['console.log("🔄 Reset after goal → starting from:", agentCurrent);', 'LOG', 'KEEP', 'KEEP', 'console log only'],
  ['const badKey = prev + "->" + current;', 'REKEY', 'PREV', 'PREV', 'bad-path penalty (persisted penalties)'],
  ['const signalKey = prev + "->" + current;', 'REKEY', 'PREV', 'PREV', 'signals (persisted; behaviourally inert, XFER-1 D5)'],
  ['const timeKey = prev + "->" + current;', 'REKEY', 'PREV', 'PREV', 'timeMemory (session-only)'],
  ['console.log("🧠 Self learned:", prev, "→", current);', 'LOG', 'KEEP', 'KEEP', 'console log only'],
  ['recordAutonomousStep(prev, current, neuronMap, goalNeuronId);   // D1', 'HELD', 'KEEP', 'PREV_P', 'autonomous-explore pipeline, edge-filtered'],
].map(r => Object.freeze(r)));

/** the identifier substitutions an action implies */
export function opsOf(action) {
  switch (action) {
    case 'FROM': return [['agentLast', '__c1o']];
    case 'TO': return [['agentCurrent', '__c1n']];
    case 'FROM+TO': return [['agentLast', '__c1o'], ['agentCurrent', '__c1n']];
    case 'PREV': return [['prev', '__c1o']];
    case 'PREV_P': return [['prev', '__c1p']];
    default: return [];
  }
}

/** block boundaries by exact anchors (indices into the LF-split line array) */
export function findBlock(L) {
  const guardIdx = L.map((l, i) => (l === '    agentLast !== goalNeuronId' ? i : -1)).filter(i => i >= 0);
  if (guardIdx.length !== 1) throw new Error(`CREDIT-1 census: guard anchor matched ${guardIdx.length} times`);
  let open = guardIdx[0]; while (open < L.length && L[open] !== ') {') open++;
  let ifLine = guardIdx[0]; while (ifLine >= 0 && L[ifLine] !== 'if (') ifLine--;
  const anchor = '    recordAutonomousStep(prev, current, neuronMap, goalNeuronId);   // D1';
  const ras = L.map((l, i) => (l === anchor ? i : -1)).filter(i => i >= 0);
  if (ras.length !== 1) throw new Error(`CREDIT-1 census: recordAutonomousStep anchor matched ${ras.length} times`);
  if (L[ras[0] + 1] !== '}' || L[ras[0] + 2] !== '' || L[ras[0] + 3] !== '}') throw new Error('CREDIT-1 census: block close context not found');
  const close = ras[0] + 3;
  if (!(ifLine >= 0 && ifLine < open && open < close)) throw new Error('CREDIT-1 census: block order');
  return { ifLine, open, close };
}

/**
 * census of one main.js text.  Returns { block, rows, problems, invariants, plan: { A, 'A+' } } where every row is
 * { idx (0-based line index), line (1-based), text, identifiers, class, actionA, actionAplus, site }.
 */
export function censusBlock(text, { tree = false } = {}) {
  const L = text.replace(/\r\n/g, '\n').split('\n');
  const problems = [];
  const block = findBlock(L);
  const found = [];
  for (let i = block.ifLine + 1; i < block.close; i++) if (L[i].match(IDENT)) found.push(i);
  const rows = [];
  let c = 0;
  for (const i of found) {
    const t = trim(L[i]);
    if (t === GFB2_PROBE_TEXT) {
      if (!tree) problems.push(`line ${i + 1}: the GATE-FLOOR-B2 probe is present outside tree mode`);
      rows.push({ idx: i, line: i + 1, text: t, identifiers: [...L[i].matchAll(IDENT)].map(m => m[2]), class: 'INSTRUMENT', actionA: 'KEEP', actionAplus: 'KEEP', site: 'GATE-FLOOR-B2 goal-reset probe (experiment tree only)' });
      continue;
    }
    const e = CLASSIFICATION[c];
    if (!e) { problems.push(`line ${i + 1}: unclassified occurrence "${t}"`); continue; }
    if (t !== e[0]) { problems.push(`line ${i + 1}: text "${t}" is not the classified "${e[0]}"`); c++; continue; }
    rows.push({ idx: i, line: i + 1, text: t, identifiers: [...L[i].matchAll(IDENT)].map(m => m[2]), class: e[1], actionA: e[2], actionAplus: e[3], site: e[4] });
    c++;
  }
  if (c !== CLASSIFICATION.length) problems.push(`classified entries consumed ${c} of ${CLASSIFICATION.length}`);
  if (tree && !rows.some(r => r.class === 'INSTRUMENT')) problems.push('tree mode: the GATE-FLOOR-B2 probe line was not found');

  // the substitution plan per arm, derived from the actions and the identifiers actually present on each line
  const planOf = (key) => rows.filter(r => r[key] !== 'KEEP').map(r => {
    const ops = opsOf(r[key]);
    const count = ops.reduce((s, [id]) => s + r.identifiers.filter(x => x === id).length, 0);
    return { idx: r.idx, line: r.line, action: r[key], ops, count };
  });
  const plan = { A: planOf('actionA'), 'A+': planOf('actionAplus') };

  // ---- invariants (DESIGN r2 F5, F6) ----
  const resetIdx = rows.filter(r => r.class === 'RESET').map(r => r.idx);
  const assigns = [];
  for (let i = block.open + 1; i < block.close; i++) {
    if (/(^|[^A-Za-z0-9_$.])agentLast\s*=(?!=)/.test(L[i])) assigns.push(['agentLast', i + 1]);
    if (/(^|[^A-Za-z0-9_$.])agentCurrent\s*=(?!=)/.test(L[i])) assigns.push(['agentCurrent', i + 1]);
  }
  if (assigns.length !== 2 || !assigns.every(([, ln]) => resetIdx.includes(ln - 1))) problems.push(`I1: assignments inside the block ${JSON.stringify(assigns)}`);
  const firstReset = Math.min(...resetIdx);
  for (const k of ['A', 'A+']) for (const p of plan[k]) if (p.idx > firstReset && !p.ops.every(([id]) => id === 'prev')) problems.push(`I1b (${k}): a substituted agentLast/agentCurrent site lies after the goal reset (line ${p.line})`);
  const nextAssign = [], goalAssign = [];
  for (let i = block.open + 1; i < block.close; i++) {
    if (/(^|[^A-Za-z0-9_$.])next\s*=(?!=)/.test(L[i])) nextAssign.push(i + 1);
    if (/(^|[^A-Za-z0-9_$.])goalNeuronId\s*=(?!=)/.test(L[i])) goalAssign.push([i + 1, trim(L[i])]);
  }
  if (nextAssign.length) problems.push(`I4: \`next\` is assigned inside the block at ${nextAssign.join(', ')}`);
  if (goalAssign.length !== 1 || goalAssign[0][1] !== 'goalNeuronId = window.homeNeuronId;') problems.push(`I5: goal assignments inside the block ${JSON.stringify(goalAssign)}`);
  const execIdx = L.map((l, i) => (l === '  let nextStep = reasoning.to;' ? i : -1)).filter(i => i >= 0);
  if (execIdx.length !== 1) problems.push(`I2: execution anchor matched ${execIdx.length} times`);
  else {
    for (let i = execIdx[0] + 1; i < block.ifLine; i++) {
      if (/runPrediction\(/.test(L[i]) || /window\.lastReasoning\s*=(?!=)/.test(L[i]) || /(^|[^A-Za-z0-9_$.])(agentCurrent|agentLast)\s*=(?!=)/.test(L[i])) problems.push(`I2: line ${i + 1} re-decides or moves: ${trim(L[i])}`);
    }
    if (L.slice(execIdx[0], block.ifLine).map(trim).filter(t => t === 'next = window.lastReasoning.to;').length !== 1) problems.push('I2: `next = window.lastReasoning.to;` not found exactly once between the probe and the block');
  }
  const readPatterns = [/getQ\(makeStateKey\(currentKey, goalNeuronId\), k\)/, /rewards\.get\(currentKey \+ ["']->["'] \+ k\)/, /penalties\.get\(currentKey \+ ["']->["'] \+ k\)/,
    /const curKey = currentKey \+ "->" \+ k;/, /transitions\.get\(currentKey\)/, /getPathTrust\(currentKey \+ "->" \+ k\)/, /getTransitionUncertainty\(currentKey, k\)/];
  const reads = readPatterns.map(re => ({ pattern: re.source, lines: L.map((l, i) => (re.test(l) ? i + 1 : 0)).filter(Boolean) }));
  if (reads.some(r => r.lines.length === 0)) problems.push(`I3: a read pattern is absent: ${reads.filter(r => !r.lines.length).map(r => r.pattern).join(' | ')}`);

  const summary = Object.fromEntries(['GUARD', 'DEAD', 'REKEY', 'POSITION', 'LOG', 'HELD', 'RESET', 'COMMENT', 'INSTRUMENT'].map(k => [k, rows.filter(r => r.class === k).length]));
  const totals = (k) => {
    const t = { total: 0, lines: plan[k].length, agentLast: 0, agentCurrent: 0, prev: 0 };
    for (const p of plan[k]) {
      const ids = rows.find(r => r.idx === p.idx).identifiers;
      for (const [id] of p.ops) { const n = ids.filter(x => x === id).length; t[id] += n; t.total += n; }
    }
    return t;
  };
  return { block: { ifLine: block.ifLine + 1, openLine: block.open + 1, closeLine: block.close + 1, ifIdx: block.ifLine, openIdx: block.open, closeIdx: block.close },
    rows, summary, plan, totals: { A: totals('A'), 'A+': totals('A+') },
    invariants: { I1_assignments: assigns, I2_execAnchorLine: execIdx[0] + 1, I3_reads: reads, I4_nextAssignments: nextAssign, I5_goalAssignments: goalAssign }, problems };
}
