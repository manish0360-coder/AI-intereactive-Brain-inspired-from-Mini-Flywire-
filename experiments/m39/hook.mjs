// ==========================================================
// M39-P1 ESM LOAD HOOK — development pilot instrumentation, in memory only
// ==========================================================
// Composes the FROZEN, verified instrumentation read-only (RU-7):
//   experiments/uqb/instrument.js  transform            probe · permute pre-pass · runPrediction handle
//                                  transformPredictionError  R2 freeze of transitionUncertaintyMap
//   experiments/uqb/bio.js         transformBehavior    R3 snapshot/restore of the nine biology states
//   experiments/m9/probe.js        transformCandidates  pre-filter size and F1-F4 rejection counts
// and adds ONE guarded pilot line after `const bestChoice = sorted[0];` that reports the decision-time
// pool P (keys and weights, already sorted) at every decision. With `__M39_POOL__` unset it is one
// falsy read. No file on disk is modified.
//
// M39_MUTANT (verification only) injects a declared fault so the verifier can prove it is caught.
// It is never set by the pilot itself.
import { transform, transformPredictionError } from '../uqb/instrument.js';
import { transformBehavior } from '../uqb/bio.js';
import { transformCandidates } from '../m9/probe.js';

export const POOL_ANCHOR = 'const bestChoice = sorted[0];';
export const POOL_INJECT =
  'if (globalThis.__M39_POOL__) globalThis.__M39_POOL__(currentKey, step, sorted.map(c => [c.key, c.weight]));';

const MUTANT = process.env.M39_MUTANT || null;

export function transformPool(src) {
  const crlf = src.includes('\r\n');
  const lines = (crlf ? src.replace(/\r\n/g, '\n') : src).split('\n');
  const hits = lines.map((l, i) => [l.replace(/\s+$/, ''), i]).filter(([l]) => l === POOL_ANCHOR);
  if (hits.length !== 1) throw new Error(`M39: pool anchor matched ${hits.length} lines, expected 1`);
  lines.splice(hits[0][1] + 1, 0, POOL_INJECT);
  let out = lines.join('\n');
  if (MUTANT === 'noFutureScore') {
    // fault 1: the FutureScore call is removed from the value computation
    const a = 'return Math.min((n ? futureScore(n, goalNeuronId, rewards, penalties,';
    if (!out.includes(a)) throw new Error('M39 mutant anchor missing');
    out = out.replace(a, 'return Math.min((n ? (() => 0)(n, goalNeuronId, rewards, penalties,');
  }
  if (MUTANT === 'clockDependence') {
    // fault 10: a wall-clock dependence enters the candidate score
    out = out.replace('    weight: arbitratedScore',
      '    weight: arbitratedScore + (((Date.now() / 1e8) % 2) < 1 ? 1e6 * (Number(k) % 2) : 0)');
  }
  return crlf ? out.replace(/\n/g, '\r\n') : out;
}

export async function load(url, ctx, next) {
  const r = await next(url, ctx);
  if (!r.source) return r;
  const p = decodeURIComponent(url);
  if (/\/main\.js$/.test(p)) return { ...r, source: transformPool(transformCandidates(transform(String(r.source)))) };
  if (/\/render\/predictionError\.js$/.test(p)) return { ...r, source: transformPredictionError(String(r.source)) };
  if (/\/render\/behavior\.js$/.test(p)) return { ...r, source: transformBehavior(String(r.source)) };
  return r;
}
