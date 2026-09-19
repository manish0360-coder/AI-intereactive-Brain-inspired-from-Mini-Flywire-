// ==========================================================
// M40-P1 STAGE-1 ESM LOAD HOOK — measurement instrumentation, in memory only
// ==========================================================
// Reuses, read-only:
//   experiments/uqb/instrument.js  transform, transformPredictionError  (probe, guard pre-pass, handle, R2 freeze)
//   experiments/uqb/bio.js         transformBehavior                     (R3 biology snapshot/restore)
//   experiments/m9/probe.js        transformCandidates                   (pre-filter ledger)
//   experiments/m39/hook.mjs       transformPool                         (decision-time pool line after bestChoice)
// Adds exactly the two guarded lines M40-R1 specifies (m40_spec.js §7a, §12a):
//   main.js  — one getter over the exposed top-level bindings the declared state names
//   run.js   — one capture call at the loop head, before env.setTick(ticksExecuted)
// With their globals unset each is one falsy read. No file on disk is modified.
import { transform, transformPredictionError } from '../uqb/instrument.js';
import { transformBehavior } from '../uqb/bio.js';
import { transformCandidates } from '../m9/probe.js';
import { transformPool } from '../m39/hook.mjs';

export const EXPOSE_LINE =
  'if (globalThis.__M40_EXPOSE__) globalThis.__M40_EXPOSE__.get = () => ({ adjacencyMemory, timeMemory, chainMemory, ' +
  'attentionMap, lastDecision, agentRunning, goalNeuronId, agentCurrent });';
export const CAPTURE_ANCHOR = '      env.setTick(ticksExecuted);';
export const CAPTURE_LINE = '      if (globalThis.__M40_CAPTURE__) globalThis.__M40_CAPTURE__(ticksExecuted, writes, rec);';

const lf = (s) => String(s).replace(/\r\n/g, '\n');
export function transformRun(src) {
  const lines = lf(src).split('\n');
  const hits = lines.map((l, i) => [l.replace(/\s+$/, ''), i]).filter(([l]) => l === CAPTURE_ANCHOR);
  if (hits.length !== 1) throw new Error(`M40: run.js capture anchor matched ${hits.length} lines, expected 1`);
  lines.splice(hits[0][1], 0, CAPTURE_LINE);
  return lines.join('\n');
}
export const transformMain = (src) => lf(transformPool(transformCandidates(transform(String(src))))) + '\n' + EXPOSE_LINE + '\n';

export async function load(url, ctx, next) {
  const r = await next(url, ctx);
  if (!r.source) return r;
  const p = decodeURIComponent(url);
  if (/\/main\.js$/.test(p)) return { ...r, source: transformMain(r.source) };
  if (/\/experiments\/m7\/run\.js$/.test(p)) return { ...r, source: transformRun(r.source) };
  if (/\/render\/predictionError\.js$/.test(p)) return { ...r, source: transformPredictionError(String(r.source)) };
  if (/\/render\/behavior\.js$/.test(p)) return { ...r, source: transformBehavior(String(r.source)) };
  return r;
}
