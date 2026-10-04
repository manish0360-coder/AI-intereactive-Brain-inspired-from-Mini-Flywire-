// ==========================================================
// H1-R verification — INSERT-ONLY recording hook (loaded by run_one.mjs when record=true)
// ==========================================================
// Applies to the conformed (or pristine) tree. Each inserted line is
//   ;globalThis.__R__ && globalThis.__R__.<fn>(...)
// It assigns no agent state, alters no control flow and draws no random number.
// Neutrality is checked by verify_conformance.mjs (fingerprints with/without the hook).
function src(r) { return typeof r.source === 'string' ? r.source : Buffer.from(r.source).toString('utf8'); }
function idx(L, pred) { const o = []; L.forEach((l, i) => { if (pred(l)) o.push(i); }); return o; }
function must(c, m) { if (!c) throw new Error('H1R verify hook: ' + m); }
const R = ';globalThis.__R__ && globalThis.__R__.';

function patchMain(L) {
  // goal reach: the move is (decision position -> goal). In B2 order the decision position is
  // agentCurrent; in the H1R R1 realised view it is agentLast (agentCurrent already holds the goal).
  let a = idx(L, l => l.includes('if (next === goalNeuronId) {'));
  must(a.length === 1, 'goal anchor ' + a.length);
  L.splice(a[0] + 1, 0, R + 'goal(((globalThis.__H1R__ && globalThis.__H1R__.on) ? agentLast : agentCurrent), next);');

  // every entry into the self-learning section (after its guard): the transition it learns from
  a = idx(L, l => l === '  let rewardSignal = 0;');
  must(a.length === 1, 'learning-section anchor ' + a.length);
  L.splice(a[0] + 1, 0, R + 'learn(agentLast, next, agentCurrent);');

  a = idx(L, l => l.includes('? _m7env.attempt(_m7From, _m7To)'));
  must(a.length === 1 && L[a[0] + 1].trim() === ': true;', 'E1 anchor');
  L.splice(a[0] + 2, 0, R + 'move(_m7From, _m7To, _m7Traversed, _goalResetJustHappened);');

  a = idx(L, l => l.trim() === 'updateQ({');
  must(a.length === 2, 'updateQ anchors ' + a.length);
  for (const i of [...a].reverse()) L.splice(i, 0, R + 'q(agentLast, next, rewardSignal, agentCurrent);');

  a = idx(L, l => l.includes('if (isGraphNeighborForMem) {'));
  must(a.length === 1, 'transitions anchor');
  L.splice(a[0] + 1, 0, R + 'tr(prev, current, transitions);');

  // explore-step learning (D1): the pair handed to recordAutonomousStep
  a = idx(L, l => l.includes('recordAutonomousStep(prev, current, neuronMap, goalNeuronId);   // D1'));
  must(a.length === 1, 'explore-step anchor ' + a.length);
  L.splice(a[0], 0, R + 'explore(prev, current);');

  for (const anchor of ['agentCurrent = allIds[Math.floor(liveRng() * allIds.length)];',
                        'agentCurrent = _capIds[Math.floor(liveRng() * _capIds.length)];']) {
    a = idx(L, l => l.trim() === anchor);
    must(a.length === 1, 'reset anchor');
    L.splice(a[0] + 1, 0, R + `reset(${anchor.includes('_capIds') ? "'cap'" : "'goal'"});`);
  }

  a = idx(L, l => l.includes('decayTrust(0.9997);'));
  must(a.length === 1, 'decayTrust anchor');
  L.splice(a[0], 0, R + 'decay(0.9997);');

  // selection (step 0), after any H1R A3 override, before the lastReasoning write
  a = idx(L, (l, ) => l === 'if (step === 0) {');
  a = a.filter(i => L[i + 1] === '  window.lastReasoning = {');
  must(a.length === 1, 'selection anchor ' + a.length);
  L.splice(a[0], 0, R + 'sel(step, currentKey, nextKey, (topChoices[0] ? topChoices[0].key : null), (exploreChoice ? exploreChoice.key : null), startNeuron.userData.neighbors);');
  return L;
}

function patchEM(L) {
  let a = idx(L, l => l.includes('function _runPipeline(episode) {'));
  must(a.length === 1, '_runPipeline');
  L.splice(a[0] + 1, 0, R + "pipe('full', episode.source, episode.transitions);");
  a = idx(L, l => l.includes('function _runPipelineMinimal(episode) {'));
  must(a.length === 1, '_runPipelineMinimal');
  L.splice(a[0] + 1, 0, R + "pipe('min', episode.source, episode.transitions);");
  a = idx(L, l => l.includes('tMap.set(to, (tMap.get(to) || 0) + 20 * gain * (1 + causalBonus * 0.5));'));
  must(a.length === 1, 'episode transitions');
  L.splice(a[0] + 1, 0, R + 'epTr(from, to);');
  a = idx(L, l => l.includes('sys.recordSuccess(key);'));
  must(a.length === 1, 'episode credit');
  L.splice(a[0], 0, R + 'epCredit(key);');
  return L;
}

export async function load(url, ctx, next) {
  const r = await next(url, ctx);
  const u = decodeURIComponent(url).replace(/\\/g, '/');
  const root = decodeURIComponent(process.env.H1R_VERIFY_TREE_URL || '').replace(/\\/g, '/');
  if (!r.source || !root || !u.startsWith(root)) return r;
  if (u === root + '/main.js') return { ...r, source: patchMain(src(r).split('\n')).join('\n') };
  if (u === root + '/render/episodeManager.js') return { ...r, source: patchEM(src(r).split('\n')).join('\n') };
  return r;
}
