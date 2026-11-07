// ==========================================================
// CF-00 runtime audit — in-memory instrumentation preload (no repository file is changed)
// ==========================================================
//   node --import <file URL of this module> experiments/cf00_audit/session.mjs '<json>'
// Rewrites three anchors of main.js and one of render/scoring.js as they are loaded, so that each scored candidate's
// 36 additive terms, its clamped score and its arbitrated (ranked) weight, and each runPrediction step's ranking,
// exploration draw and epsilon are reported to globalThis.__CF00__.  Optional ablation switches (environment
// variables, read once here) remove one channel at its source:
//   CF00_ZERO=<term,...>  set the named scoring terms to 0 before they are summed (render/scoring.js TERMS)
//   CF00_NOGG=1           skip the goal-gradient block (main.js: goalDistance BFS x adjacency gate)
//   CF00_NOREACH=1        make canReachGoal() return true (main.js: depth-4 DFS over the true graph)
// With no switch set every rewrite is a no-op apart from the reporting calls, which consume no randomness.
// Date.now and performance.now are replaced by a loop-advanced virtual clock so repeated runs are comparable.
// Every anchor must match exactly once or the load fails.
// ==========================================================
import { registerHooks } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const T0 = 1767225600000;
let loops = 0;
Date.now = () => T0 + loops * 500;
try { Object.defineProperty(globalThis.performance, 'now', { value: () => loops * 500, configurable: true }); } catch { /* not replaceable */ }
globalThis.__CF00_ADVANCE__ = () => { loops++; };
if (process.env.CF00_NOGG) globalThis.__CF00_NOGG__ = true;
if (process.env.CF00_NOREACH) globalThis.__CF00_NOREACH__ = true;
if (process.env.CF00_ZERO) globalThis.__CF00_ZERO__ = new Set(process.env.CF00_ZERO.split(',').filter(Boolean));

const EDITS = new Map([
  [pathToFileURL(path.join(ROOT, 'render', 'scoring.js')).href, [
    [/for \(let i = 0; i < TERMS\.length; i\+\+\) finalWeight \+= TERMS\[i\]\[1\];/,
      (m) => `{ const __z = globalThis.__CF00_ZERO__; if (__z) for (let i = 0; i < TERMS.length; i++) if (__z.has(TERMS[i][0])) TERMS[i][1] = 0; } ${m} globalThis.__CF00__ && globalThis.__CF00__.terms(TERMS);`],
  ]],
  [pathToFileURL(path.join(ROOT, 'main.js')).href, [
    [/function canReachGoal\(startId, goalId, maxDepth = 4\) \{/,
      (m) => `${m} if (globalThis.__CF00_NOREACH__) return true;`],
    [/let goalGradientBoost = 0;(\r?\n\s*)if \(goalNeuronId !== null\) \{/,
      (m, ws) => `let goalGradientBoost = 0;${ws}if (goalNeuronId !== null && !globalThis.__CF00_NOGG__) {`],
    [/choices\.push\(\{\r?\n\s*key: k,\r?\n\s*weight: arbitratedScore\r?\n\s*\}\);/,
      (m) => `globalThis.__CF00__ && globalThis.__CF00__.cand(k, finalWeight, arbitratedScore); ${m}`],
    [/const bestChoice = sorted\[0\];/,
      (m) => `${m} globalThis.__CF00__ && globalThis.__CF00__.decide(step, currentKey, sorted, exploreChoice, epsilon);`],
  ]],
]);

registerHooks({
  load(url, context, nextLoad) {
    const r = nextLoad(url, context);
    const edits = EDITS.get(url);
    if (!edits) return r;
    let src = typeof r.source === 'string' ? r.source : Buffer.from(r.source).toString('utf8');
    for (const [re, fn] of edits) {
      const hits = src.match(new RegExp(re.source, 'g'));
      if (!hits || hits.length !== 1) throw new Error(`cf00 preload: anchor ${re} matched ${hits ? hits.length : 0} times in ${url}`);
      src = src.replace(re, fn);
    }
    return { ...r, source: src };
  },
});
