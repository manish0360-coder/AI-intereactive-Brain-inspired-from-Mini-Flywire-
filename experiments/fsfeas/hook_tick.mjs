// FS-OQ1-F2-FEAS observation hook. MEASUREMENT ONLY.
//
// runOnce (experiments/m7/run.js) calls env.setTick(ticksExecuted) once per loop. This hook wraps
// setTick so that, AFTER the original has run and with its return value passed through unchanged,
// a read-only callback may snapshot the traversal record. The callback reads recordFor() copies
// only: no write, no RNG draw, no state change. Non-interference is VERIFIED, not assumed: the
// driver compares a hook-on and a hook-off run of the same fixture (action sequence, RNG draw
// counts, Q, environment counters, final record).
const TAIL = `
;{
  const __feas_orig = setTick;
  setTick = function (t) {
    const r = __feas_orig(t);
    const cb = globalThis.__FEAS_TICK__;
    if (typeof cb === 'function') cb(t);
    return r;
  };
}
`;

export async function load(url, ctx, next) {
  const r = await next(url, ctx);
  if (!r.source) return r;
  if (/\/experiments\/m7\/env\.js$/.test(decodeURIComponent(url))) {
    const src = String(r.source);
    if (!/export function setTick\(t\)/.test(src)) throw new Error('FEAS: setTick anchor missing');
    return { ...r, source: src + TAIL };
  }
  return r;
}
