// ==========================================================
// UQ-B ESM LOAD HOOK — in-memory transform, no disk write
// ==========================================================
// The technique proven by experiments/m8/hook.mjs, experiments/q1/hook.mjs and
// experiments/uqa/hook.mjs: intercept main.js as it loads, apply the frozen §13
// instrumentation, hand the result to the module system. The repository file is
// never touched.
//
// UNLIKE UQ-A'S HOOK, THIS ONE CARRIES NO ARM.
//   UQ-A's exposure was baked into the source transform, so the arm had to
//   travel in the child environment. UQ-B's transform is arm-agnostic: it
//   installs guarded machinery, and the arm and the arrangement are supplied at
//   run time through `globalThis.__UQB__`. That is what makes a single loaded
//   build serve arrangement 0 and all 19 shuffles without reloading main.js —
//   which matters, because main.js is a singleton ESM module that cannot be
//   re-instantiated in one process.
//
// DEFAULT-OFF
//   With `__UQB__`, `__UQB_PROBE__` and `__UQB_EXPOSE__` all unset, every
//   injected site is one falsy global read and the build is behaviourally
//   identical to HEAD. verify_uqb_impl.js proves this rather than asserting it.
import { transform, transformPredictionError } from './instrument.js';
import { transformBehavior } from './bio.js';

export async function load(url, ctx, next) {
    const r = await next(url, ctx);
    if (!r.source) return r;
    const p = decodeURIComponent(url);

    if (/\/main\.js$/.test(p)) {
        return { ...r, source: transform(String(r.source)) };
    }
    // R2, authorised by UQB-ERR-01 §4: suspend read-side persistence in
    // getTransitionUncertainty during the readout. Guarded and default-off.
    if (/\/render\/predictionError\.js$/.test(p)) {
        return { ...r, source: transformPredictionError(String(r.source)) };
    }
    // R3, authorised by UQB-ERR-02 §8: suspend regulateBiology's persistent
    // writes during the readout. Guarded and default-off.
    if (/\/render\/behavior\.js$/.test(p)) {
        return { ...r, source: transformBehavior(String(r.source)) };
    }
    return r;
}
