// Study-2 capture hook (loader). Rewrites module source IN MEMORY only; no file on disk changes.
//
// main.js
//   (1) step counter: the first statement of runAgent() increments globalThis.__S2_STEP__, so the
//       0-based index of the current runAgent() call is always known (G-IMPL-3). runAgent() has exactly
//       one caller, runAgentLoop's 5-step loop (main.js:5311).
//   (2) decision-event markers around the AGENT-LOOP call runPrediction(agentCurrent) only. The UI call
//       runPrediction(clickedId) is never wrapped, so it cannot produce an event.
// render/planning.js (the production instance, no query string)
//   (3) futureScore is wrapped to REPORT (k, goal, value) while an event is open. The value returned
//       to the decision is exactly the production value.
// render/planning.js?s2=FULL | ?s2=GEO (the two shadow instances)
//   (4) identical source except ONE line: the recordFor import is redirected to snapshot_reader.mjs.
//
// None of these consumes RNG or writes agent state. Non-interference is VERIFIED by a capture-on /
// capture-off replay (G-IMPL-2), not assumed.
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const READER_HREF = pathToFileURL(path.join(HERE, 'snapshot_reader.mjs')).href;

export const RUNAGENT_ANCHOR = 'function runAgent() {';
export const RUNAGENT_REPLACEMENT =
  'function runAgent() { globalThis.__S2_STEP__ = (globalThis.__S2_STEP__ ?? -1) + 1;';
export const DECISION_ANCHOR = '    runPrediction(agentCurrent);';
export const DECISION_REPLACEMENT =
  '    if (globalThis.__S2_BEGIN__) globalThis.__S2_BEGIN__(); runPrediction(agentCurrent); if (globalThis.__S2_END__) globalThis.__S2_END__();';
export const IMPORT_ANCHOR = '} from "./traversalRecord.js";';

// (6) step-0 capture (Director ruling on G-IMPL-1): report-only injections inside runPrediction.
//     They read variables already in scope and write only to capture globals; no production value changes.
export const REPORT_INJECTIONS = [
  // chain step: imagined successor states are steps 1..STEPS-1 (main.js:1621, currentKey = nextKey at :2850)
  ['  for (let step = 0; step < STEPS; step++) {',
   '  for (let step = 0; step < STEPS; step++) { globalThis.__S2_CHAIN__ = step;'],
  // the candidate key at the FutureScore site, so targetNeuronForFuture(k) can be checked against k
  ['  const targetNeuronForFuture = findNeuronById(k);',
   '  if (globalThis.__S2_KEY__) globalThis.__S2_KEY__(step, k); const targetNeuronForFuture = findNeuronById(k);'],
  // the FutureScore-scored ranking (before structure/embedding augmentation)
  ['const sorted = choices.sort((a, b) => b.weight - a.weight);',
   'const sorted = choices.sort((a, b) => b.weight - a.weight); if (globalThis.__S2_RANK__) globalThis.__S2_RANK__(step, "sorted", sorted.map((c) => c.key));'],
  // the final ranking after augmentation, from which topChoices / nextKey are taken
  ['choices.sort((a, b) => b.prob - a.prob);',
   'choices.sort((a, b) => b.prob - a.prob); if (globalThis.__S2_RANK__) globalThis.__S2_RANK__(step, "final", choices.map((c) => c.key));'],
];

const once = (src, anchor, what) => {
  const n = src.split(anchor).length - 1;
  if (n !== 1) throw new Error(`S2 hook: ${what} anchor matched ${n} times, expected exactly 1`);
};

// pure transforms — exported so the gate can recompute and diff them against the files on disk
export function mainSource(src) {
  once(src, RUNAGENT_ANCHOR, 'runAgent');
  once(src, DECISION_ANCHOR, 'agent-loop runPrediction');
  let out = src.replace(RUNAGENT_ANCHOR, RUNAGENT_REPLACEMENT).replace(DECISION_ANCHOR, DECISION_REPLACEMENT);
  for (const [anchor, replacement] of REPORT_INJECTIONS) { once(out, anchor, anchor.trim().slice(0, 40)); out = out.replace(anchor, replacement); }
  return out;
}
export function shadowSource(src, mode) {
  once(src, IMPORT_ANCHOR, 'recordFor import');
  return src.replace(IMPORT_ANCHOR, `} from "${READER_HREF}?mode=${mode}";`);
}
export const PLANNING_TAIL = `
;{
  const __s2_orig = futureScore;
  futureScore = function (neuron, goalNeuronId, ...rest) {
    const value = __s2_orig(neuron, goalNeuronId, ...rest);
    const report = globalThis.__S2_CALL__;
    if (report) report(neuron && neuron.userData ? neuron.userData.id : null, goalNeuronId, value, globalThis.__S2_CHAIN__);
    return value;
  };
}
`;

// (5) env.setTick observer (G-IMPL-3): records which runAgent index was last completed when runOnce set
//     each tick, so the step counter is pinned to the M40 tick convention by evidence, not inference.
export const SETTICK_TAIL = `
;{
  const __s2_setTick = setTick;
  setTick = function (t) {
    const r = __s2_setTick(t);
    const cb = globalThis.__S2_TICK__;
    if (cb) cb(t);
    return r;
  };
}
`;

const lf = (s) => String(s).replace(/\r\n/g, '\n');

export async function load(url, ctx, next) {
  const r = await next(url, ctx);
  if (!r.source) return r;
  const u = new URL(url);
  const p = decodeURIComponent(u.pathname);
  if (/\/main\.js$/.test(p)) return { ...r, source: mainSource(lf(r.source)) };
  if (/\/experiments\/m7\/env\.js$/.test(p)) {
    once(lf(r.source), 'export function setTick(t)', 'env.setTick');
    return { ...r, source: lf(r.source) + SETTICK_TAIL };
  }
  if (/\/render\/planning\.js$/.test(p)) {
    const mode = u.searchParams.get('s2');
    if (mode === 'FULL' || mode === 'GEO') return { ...r, source: shadowSource(lf(r.source), mode) };
    if (mode === null) return { ...r, source: lf(r.source) + PLANNING_TAIL };
    throw new Error(`S2 hook: unexpected planning.js query ${u.search}`);
  }
  return r;
}
