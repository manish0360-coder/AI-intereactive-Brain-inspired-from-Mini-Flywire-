// ==========================================================
// CREDIT-1 — census of every keyed write site in main.js and render/*.js (pure; READ-ONLY; blocker BC-3)
// ==========================================================
// A "keyed write site" is a source line that writes (set / delete / clear) one of the decision-relevant keyed stores, directly
// or through an alias (loadBrain's restore helpers, writeReward's rewardsMap, the episode pipeline's sys.* and tMap, the
// transitions inner maps), or that calls one of the writer functions.  Every hit must match exactly one classified entry
// (file, exact trimmed text, in order of appearance); every entry must be hit.  An unclassified hit fails the census.
// Comment-only lines are skipped.  The census reads files; it runs nothing.
// ==========================================================
import fs from 'node:fs';
import path from 'node:path';

export const WRITE_PATTERN = new RegExp([
  String.raw`\b(Q|rewards|penalties|signals|curiosityMap|confidenceMap|transitions|timeMemory|pathAttempts|pathSuccesses|adjacencyMemory|tMap|map|targetMap|inner|rewardsMap)\.(set|delete|clear)\(`,
  String.raw`\bsys\.(transitions|rewards|penalties|signals|curiosityMap|confidenceMap|Q)\.(set|delete|clear)\(`,
  String.raw`\b(sys\.)?(updateQ|dampQ|setQ|writeReward|recordAttempt|recordSuccess|decayTrust|recordAutonomousStep|recordAutonomousSuccess|recordManualClick|replayOneEpisode|restoreStringMap|restoreNestedNumericMap|runConsolidationPass)\(`,
].join('|'));

// classes: what the ledger expects of a write attributed to the site (DESIGN r2 section 5)
export const CLASSES = Object.freeze({
  BLOCK_REKEY: 're-keyed credit site (EXEC key in A/A+, LEGACY key in L)',
  BLOCK_HELD: 'edge-filtered credit site (LEGACY key and a graph edge in L/A; EXEC in A+)',
  BLOCK_PATH: 'goal-path / success pipeline over consecutive recentMemory entries (aligned in every arm)',
  LOAD: 'loadBrain restore of the delivered store (before the first agent call)',
  DECAY: 'key-preserving decay or deletion (never creates a key)',
  KEY_PRESERVING: 'consolidation: strengthens existing reward keys only (registry fed by re-keyed fallback sites)',
  PIPELINE_BRIDGE: 'sealed-episode bridge into the success pipeline (episode node pairs)',
  PIPELINE_REPLAY: 'replay of a stored episode (episode node pairs)',
  ADJACENCY: 'adjacencyMemory rebuilt from episodes (main.js-private; not wrapped; derived deterministically)',
  CLICK_ONLY: 'manual-click path (never reached in harness sessions; any harness write is a failure)',
  USER_RESET: 'Shift+R reset (never reached in harness sessions; any harness write is a failure)',
  WRITER_IMPL: 'writer-function body; a write is attributed to its main.js caller frame',
  DEF: 'function definition line (no write)',
});

const e = (text, cls, note) => Object.freeze({ text, cls, note });
export const TABLE = Object.freeze({
  'main.js': Object.freeze([
    e('function restoreStringMap(targetMap, obj) {', 'DEF', 'loadBrain helper'),
    e('targetMap.clear();', 'LOAD', 'restoreStringMap'),
    e('targetMap.set(k, v);', 'LOAD', 'restoreStringMap'),
    e('function restoreNestedNumericMap(targetMap, obj) {', 'DEF', 'loadBrain helper'),
    e('targetMap.clear();', 'LOAD', 'restoreNestedNumericMap'),
    e('inner.set(Number(ik), iv);', 'LOAD', 'restoreNestedNumericMap (transitions inner map)'),
    e('targetMap.set(Number(k), inner);', 'LOAD', 'restoreNestedNumericMap'),
    e('restoreNestedNumericMap(transitions, data.transitions);', 'LOAD', 'transitions'),
    e('restoreStringMap(rewards,      data.rewards);', 'LOAD', 'rewards'),
    e('restoreStringMap(penalties,    data.penalties);', 'LOAD', 'penalties'),
    e('restoreStringMap(signals,      data.signals);', 'LOAD', 'signals'),
    e('restoreStringMap(curiosityMap, data.curiosity);', 'LOAD', 'curiosity'),
    e('restoreStringMap(Q,            data.Q);', 'LOAD', 'Q'),
    e('restoreStringMap(confidenceMap, data.confidence);', 'LOAD', 'confidence'),
    e('recordAutonomousSuccess(', 'PIPELINE_BRIDGE', 'setEpisodeManagerBridge callback (sealed episode)'),
    e('adjacencyMemory.clear();', 'ADJACENCY', 'rebuildAdjacencyMemory'),
    e('adjacencyMemory.set(key, (adjacencyMemory.get(key) || 0) + 1);', 'ADJACENCY', 'rebuildAdjacencyMemory'),
    e('transitions.set(goalId, goalTransitions);', 'CLICK_ONLY', 'pruneGoalWraparound (only caller: click handler)'),
    e('Q.set(key, 0);', 'CLICK_ONLY', 'pruneGoalWraparound'),
    e('rewards.set(key, 0);', 'CLICK_ONLY', 'pruneGoalWraparound'),
    e('penalties.set(exitKey, Math.min(existing + 8, 15));', 'CLICK_ONLY', 'pruneGoalWraparound'),
    e('curiosityMap.set(key, value * 0.995); // slow decay', 'DECAY', 'curiosity decay (10 % of calls)'),
    e('penalties.delete(key);', 'DECAY', 'penalty decay'),
    e('penalties.set(key, decayed);', 'DECAY', 'penalty decay'),
    e('rewards.set(', 'DECAY', 'reward decay (2 % of calls)'),
    e('map.set(action, v * 0.995);', 'DECAY', 'transitions inner decay'),
    e('Q.set(key, value * rate);', 'DECAY', 'Q decay (0.999 per call)'),
    e('replayOneEpisode();', 'PIPELINE_REPLAY', 'replay branch'),
    e('updateQ({', 'BLOCK_REKEY', 'TD Q update (predError branch)'),
    e('dampQ(', 'BLOCK_REKEY', 'dampQ'),
    e('curiosityMap.set(', 'BLOCK_REKEY', 'curiosity from prediction error (curKey)'),
    e('updateQ({', 'BLOCK_REKEY', 'TD Q update (fallback branch)'),
    e('recordAttempt(attemptKey);', 'BLOCK_REKEY', 'trust attempt'),
    e('curiosityMap.set(', 'BLOCK_REKEY', 'curiosity exploration count (key)'),
    e('recordAutonomousSuccess(recentMemory, current, neuronMap, {', 'BLOCK_PATH', 'success pipeline'),
    e('rewards.set(', 'BLOCK_REKEY', 'goal reward (key)'),
    e('writeReward(rewards, pathKey, 0.5, PROVENANCE.DIRECT_EXPERIENCE, 8);', 'BLOCK_PATH', 'goal-path reward'),
    e('confidenceMap.set(pathKey, Math.min(oldConfidence + 5, 100));', 'BLOCK_PATH', 'goal-path confidence'),
    e('if (!globalThis.__M7_CREDIT__) recordSuccess(pathKey);', 'BLOCK_PATH', 'goal-path trust success'),
    e('penalties.set(key, Math.min(oldPenalty + 0.1, 5));', 'BLOCK_REKEY', 'penalty (key)'),
    e('confidenceMap.set(key, Math.max(oldConfidence - 0.5, 0));', 'BLOCK_REKEY', 'confidence decrement (key)'),
    e('map.set(current, (map.get(current) || 0) + 1);', 'BLOCK_HELD', 'transitions inner write (edge-filtered)'),
    e('transitions.set(prev, map);', 'BLOCK_HELD', 'transitions write (edge-filtered)'),
    e('penalties.set(key, Math.min(existingPenalty + 1.5, 8));', 'BLOCK_REKEY', 'goal shortcut penalty (goal key)'),
    e('rewards.set(key, Math.min((rewards.get(key) || 0) + scaledReward, 8));', 'BLOCK_REKEY', 'scaled goal reward (goal key)'),
    e('penalties.set(', 'BLOCK_REKEY', 'bad-path penalty (badKey)'),
    e('signals.set(signalKey, (signals.get(signalKey) || 0) + 1);       // 👉 stronger signal = more important path', 'BLOCK_REKEY', 'signals'),
    e('timeMemory.set(timeKey, Date.now());', 'BLOCK_REKEY', 'timeMemory (session-only)'),
    e('recordAutonomousStep(prev, current, neuronMap, goalNeuronId);   // D1', 'BLOCK_HELD', 'autonomous-explore pipeline (edge-filtered)'),
    e('decayTrust(0.9997);', 'DECAY', 'trust decay (runAgentLoop)'),
    e('runConsolidationPass(rewards, Q, transitions);', 'KEY_PRESERVING', 'consolidation pass (runAgentLoop)'),
    e('transitions.clear();', 'USER_RESET', 'Shift+R'),
    e('rewards.clear();', 'USER_RESET', 'Shift+R'),
    e('penalties.clear();', 'USER_RESET', 'Shift+R'),
    e('signals.clear();', 'USER_RESET', 'Shift+R'),
    e('curiosityMap.clear();', 'USER_RESET', 'Shift+R'),
    e('Q.clear();', 'USER_RESET', 'Shift+R'),
    e('confidenceMap.clear();', 'USER_RESET', 'Shift+R'),
    e('recordManualClick(clickedId, obj.userData.label, isGoalClick, goalNeuronId);', 'CLICK_ONLY', 'click handler (main.js 5393 onward)'),
    e('timeMemory.set(timeKey, Date.now());', 'CLICK_ONLY', 'click handler (main.js 5393 onward)'),
  ]),
  'render/episodeManager.js': Object.freeze([
    e('export function recordManualClick(id, label, isGoalClick, activeGoal = null) {', 'DEF', ''),
    e('export function recordAutonomousSuccess(recentMemory, goalId, neuronMap, meta) {', 'DEF', ''),
    e('export function recordAutonomousStep(fromId, toId, neuronMap, activeGoal = null) {', 'DEF', ''),
    e('export function replayOneEpisode() {', 'DEF', ''),
    e('tMap.set(to, (tMap.get(to) || 0) + 20 * gain * (1 + causalBonus * 0.5));', 'WRITER_IMPL', '_learnProcedural: transitions inner (episode pair)'),
    e('sys.transitions.set(from, tMap);', 'WRITER_IMPL', '_learnProcedural: transitions'),
    e('sys.updateQ({', 'WRITER_IMPL', '_learnProcedural: Q'),
    e('sys.writeReward(sys.rewards, key, 5 * gain * (1 + causalBonus * 0.3), prov, 10);', 'WRITER_IMPL', '_learnProcedural: rewards'),
    e('sys.recordSuccess(key);', 'WRITER_IMPL', 'trust success on episode pairs'),
    e('sys.confidenceMap.set(', 'WRITER_IMPL', 'confidence on episode pairs'),
  ]),
  'render/longTermConsolidation.js': Object.freeze([
    e('export function runConsolidationPass(rewards, Q, transitions) {', 'DEF', ''),
    e('rewards.set(key, Math.min(currentReward * 1.0002, 8));', 'WRITER_IMPL', 'consolidation: only keys with reward > 0 (key-preserving)'),
  ]),
  'render/qlearning.js': Object.freeze([
    e('export function setQ(state, action, value) {', 'DEF', ''),
    e('Q.set(key, value);', 'WRITER_IMPL', 'setQ'),
    e('export function updateQ({', 'DEF', ''),
    e('setQ(', 'WRITER_IMPL', 'updateQ -> setQ'),
    e('export function dampQ(state, action, dampStrength) {', 'DEF', ''),
    e('Q.set(key, Math.max(-20, dampedQ));', 'WRITER_IMPL', 'dampQ'),
  ]),
  'render/semanticProvenance.js': Object.freeze([
    e('export function writeReward(rewardsMap, key, amount, source, cap = 8) {', 'DEF', ''),
    e('rewardsMap.set(key, newVal);', 'WRITER_IMPL', 'writeReward'),
  ]),
  'render/trustMemory.js': Object.freeze([
    e('export function recordAttempt(key) {', 'DEF', ''),
    e('pathAttempts.set(', 'WRITER_IMPL', 'recordAttempt'),
    e('export function recordSuccess(key) {', 'DEF', ''),
    e('pathSuccesses.set(', 'WRITER_IMPL', 'recordSuccess'),
    e('export function decayTrust(rate = 0.999) {', 'DEF', ''),
    e('pathSuccesses.delete(k);', 'DECAY', 'decayTrust'),
    e('pathSuccesses.set(k, decayed);', 'DECAY', 'decayTrust'),
    e('pathAttempts.delete(k);', 'DECAY', 'decayTrust'),
    e('pathAttempts.set(k, decayed);', 'DECAY', 'decayTrust'),
  ]),
});

// stores outside the ledger's reach (DESIGN r2 DL-8; verified facts noted)
export const UNRESOLVED = Object.freeze([
  'session-only stores written through the re-keyed block sites: emotion map (render/emotionMap.js), semantic expectation / semantic uncertainty / semantic activation, procedural uncertainty ledger, uncertainty propagation, semantic memory layer, uncertainty engine, semantic vitality, transition uncertainty - not exported Maps, not wrapped; their influence on the chosen move is UNVERIFIED',
  'adjacencyMemory and timeMemory (both main.js-private Maps, not exported; adjacencyMemory is rebuilt from episodes, timeMemory holds clock values read only by the discarded candidate analysis) and the consolidation registry (render/longTermConsolidation.js, fed by reinforcePath/weakenPath) - not wrapped',
  'momentum store (render/momentumMemory.js) - write-only: getMomentumBonus has 0 call sites (verified); not a decision channel',
]);

const trim = (s) => s.replace(/^\s+|\s+$/g, '');

/** census of one file's text against its table entry list */
export function censusFile(file, text) {
  const L = text.replace(/\r\n/g, '\n').split('\n');
  const entries = TABLE[file] || [];
  const hits = [];
  for (let i = 0; i < L.length; i++) {
    const t = trim(L[i]);
    if (t.startsWith('//')) continue;
    if (WRITE_PATTERN.test(L[i])) hits.push({ idx: i, line: i + 1, text: t });
  }
  const problems = [], rows = [];
  let c = 0;
  for (const h of hits) {
    const en = entries[c];
    if (!en) { problems.push(`${file}:${h.line}: unclassified write site "${h.text}"`); continue; }
    if (h.text !== en.text) { problems.push(`${file}:${h.line}: "${h.text}" is not the classified "${en.text}"`); c++; continue; }
    rows.push({ file, line: h.line, idx: h.idx, text: h.text, cls: en.cls, note: en.note });
    c++;
  }
  if (c !== entries.length) problems.push(`${file}: classified entries consumed ${c} of ${entries.length}`);
  return { rows, problems };
}

/** census of a source root (production repository root or an experiment tree directory) */
export function censusRoot(root) {
  const files = ['main.js', ...fs.readdirSync(path.join(root, 'render')).filter(f => f.endsWith('.js')).sort().map(f => `render/${f}`)];
  const rows = [], problems = [];
  for (const f of files) {
    const text = fs.readFileSync(path.join(root, ...f.split('/')), 'utf8');
    const r = censusFile(f, text);
    rows.push(...r.rows); problems.push(...r.problems);
  }
  for (const f of Object.keys(TABLE)) if (!files.includes(f)) problems.push(`${f}: table file not found under ${root}`);
  const byClass = {};
  for (const r of rows) byClass[r.cls] = (byClass[r.cls] || 0) + 1;
  return { files: files.length, sites: rows.length, byClass, rows, problems };
}
