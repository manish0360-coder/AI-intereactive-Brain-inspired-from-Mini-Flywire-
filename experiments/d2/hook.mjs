// ==========================================================
// D2 ESM LOAD HOOK — observation only, identical in every arm
// ==========================================================
// render/planning.js  served from D2_PLANNING_SRC when set (the pre-repair bytes,
//                     extracted from git), otherwise the working tree. futureScore
//                     is wrapped to record (userData.id, goal, value); with
//                     D2_ZERO=1 it returns 0 instead (the ablation arm).
// render/search.js    findNeuronById is wrapped to record the FIRST id looked up
//                     inside a futureScore call — the identity that reached its DFS.
// render/scoring.js   calculateDecisionScore is wrapped to record the futureBonus it
//                     received and the score it returned.
// No repository file is written. No wrapper draws randomness or changes a value,
// except the declared ablation.
import fs from 'node:fs';

const PLANNING_SRC = process.env.D2_PLANNING_SRC || null;
const ZERO = process.env.D2_ZERO === '1';

const PLANNING_TAIL = `
;{
  const __d2_orig = futureScore;
  futureScore = function (neuron, goal, ...rest) {
    const cap = globalThis.__D2__;
    if (cap) cap.lookup = null;
    const v = ${ZERO ? '0' : '__d2_orig(neuron, goal, ...rest)'};
    if (cap) cap.calls.push([neuron && neuron.userData ? neuron.userData.id : null, goal, v, cap.lookup]);
    return v;
  };
}
`;
const SEARCH_TAIL = `
;{
  const __d2_orig = findNeuronById;
  findNeuronById = function (id) {
    const cap = globalThis.__D2__;
    if (cap && cap.lookup === null) cap.lookup = Number(id);
    return __d2_orig(id);
  };
}
`;
const SCORING_TAIL = `
;{
  const __d2_orig = calculateDecisionScore;
  calculateDecisionScore = function (ctx) {
    const v = __d2_orig(ctx);
    const cap = globalThis.__D2__;
    if (cap) cap.scores.push([ctx.futureBonus, v]);
    return v;
  };
}
`;

export async function load(url, ctx, next) {
  const r = await next(url, ctx);
  if (!r.source) return r;
  const p = decodeURIComponent(url);
  if (/\/render\/planning\.js$/.test(p)) {
    const src = PLANNING_SRC ? fs.readFileSync(PLANNING_SRC, 'utf8') : String(r.source);
    return { ...r, source: src + PLANNING_TAIL };
  }
  if (/\/render\/search\.js$/.test(p)) return { ...r, source: String(r.source) + SEARCH_TAIL };
  if (/\/render\/scoring\.js$/.test(p)) return { ...r, source: String(r.source) + SCORING_TAIL };
  return r;
}
