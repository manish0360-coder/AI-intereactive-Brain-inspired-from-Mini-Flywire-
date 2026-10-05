// ==========================================================
// H1-R — binding of the measurement sink (D-019 §5 N5′, as amended by D-022)
// ==========================================================
// installMeasure() creates the sink (measure.mjs) and binds it as `globalThis.__H1R_MEASURE__`:
//   * an own data property of globalThis, non-writable and non-configurable;
//   * whose value is a frozen ordinary object that is not a Proxy;
//   * whose `score` is an own, non-writable data property holding the pinned function
//     `score(f, t) { S.push(f, t); }` (source byte-exact; function identity checked).
// The checks run at installation; a failure throws, so the run never starts with a non-conforming sink.
// verifySinkBinding() and verifySinkSource() are exported for the verification gates (N5′, N7).
// ==========================================================
import { types } from 'node:util';
import { createMeasure } from './measure.mjs';

export const SCORE_SOURCE = 'score(f, t) { S.push(f, t); }';
export const SINK_NAME = '__H1R_MEASURE__';

/** N5′ installation checks on a bound global. Returns { ok, problems }. */
export function verifySinkBinding(globalObject, expectedScore) {
  const problems = [];
  const d = Object.getOwnPropertyDescriptor(globalObject, SINK_NAME);
  if (!d) problems.push('no own property');
  else {
    if (!('value' in d)) problems.push('accessor property, not a data property');
    if (d.writable) problems.push('writable');
    if (d.configurable) problems.push('configurable');
  }
  const M = d && 'value' in d ? d.value : undefined;
  if (M === null || typeof M !== 'object') problems.push('value is not an object');
  else {
    if (types.isProxy(M)) problems.push('value is a Proxy');
    if (!Object.isFrozen(M)) problems.push('value is not frozen');
    if (Object.getPrototypeOf(M) !== Object.prototype) problems.push('value is not an ordinary object');
    const sd = Object.getOwnPropertyDescriptor(M, 'score');
    if (!sd || !('value' in sd)) problems.push('score is not an own data property');
    else {
      if (sd.writable) problems.push('score is writable');
      if (typeof sd.value !== 'function') problems.push('score is not a function');
      else {
        if (types.isProxy(sd.value)) problems.push('score is a Proxy');
        if (Function.prototype.toString.call(sd.value) !== SCORE_SOURCE) problems.push('score source differs from the pinned function');
        if (expectedScore !== undefined && sd.value !== expectedScore) problems.push('score is not the function created by measure.mjs');
      }
    }
  }
  return { ok: problems.length === 0, problems };
}

/** N5′ static checks on the measurement module's source. Returns { ok, problems }. */
export function verifySinkSource(src) {
  const problems = [];
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  const imports = [...code.matchAll(/\bimport\b[^'"]*['"]([^'"]+)['"]/g)].map(m => m[1]);
  if (imports.some(s => !s.startsWith('node:'))) problems.push(`imports other than Node built-ins: ${imports.join(', ')}`);
  if (/\bimport\s*\(/.test(code)) problems.push('dynamic import');
  // reads no global: no global-object or host-state reference, no dunder global, no eval-like access
  const bad = code.match(/\b(globalThis|global|window|self|process|require|eval|Function)\b|\b__[A-Za-z0-9_]+__\b/g);
  if (bad) problems.push(`global references: ${[...new Set(bad)].join(', ')}`);
  const lines = code.split('\n').map(l => l.trim());
  const pinned = lines.filter(l => l === SCORE_SOURCE + ',' || l === SCORE_SOURCE);
  if (pinned.length !== 1) problems.push(`pinned score line found ${pinned.length} times`);
  if (lines.filter(l => /\bscore\s*\(/.test(l) && !l.startsWith(SCORE_SOURCE)).length) problems.push('another score definition');
  // S: declared once, written only by score(), read only by record()
  const sLines = lines.filter(l => /\bS\b/.test(l));
  const allowed = sLines.filter(l => l === 'const S = [];' || l === SCORE_SOURCE + ',' || l === 'score: S.slice(),');
  if (sLines.length !== allowed.length || sLines.length !== 3) problems.push(`S referenced outside its declaration, score() and record(): ${sLines.length} lines`);
  return { ok: problems.length === 0, problems };
}

// `create` is replaceable only so that verify_ms1_unit.mjs can show the installation checks refuse a non-conforming
// sink (N7); every driver uses the default.
export function installMeasure(globalObject = globalThis, create = createMeasure) {
  const M = create();
  const pinned = M.score;
  Object.defineProperty(globalObject, SINK_NAME, { value: M, writable: false, configurable: false, enumerable: false });
  const v = verifySinkBinding(globalObject, pinned);
  if (!v.ok) throw new Error(`H1R measurement sink binding fails N5′: ${v.problems.join('; ')}`);
  return M;
}
