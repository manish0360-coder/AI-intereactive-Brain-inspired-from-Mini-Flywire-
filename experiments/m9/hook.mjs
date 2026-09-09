// ==========================================================
// M9 ESM LOAD HOOK — UQ-B's committed transforms, plus the M9 ledger
// ==========================================================
// REUSE, NOT REIMPLEMENTATION
//   The failure being diagnosed occurred inside the UQ-B readout, under the
//   R2 and R3 persistence controls, reached through the §8 runPrediction
//   handle. To diagnose it the runtime path must be THAT path, so this hook
//   applies UQ-B's committed transforms verbatim and adds exactly one thing:
//   the counting ledger.
//
// ORDER
//   UQ-B's transform runs FIRST, on pristine source, so its anchors resolve at
//   the audited lines. M9's transform then resolves its own anchors by content
//   on the result — none of which UQ-B touches.
//
// DEFAULT-OFF, TWICE OVER
//   With __UQB__/__UQB_PROBE__/__UQB_EXPOSE__/__UQB_FREEZE__/__UQB_FREEZE_BIO__
//   and __M9__ all unset, every injected site in both layers is one falsy read
//   and the build is behaviourally identical to HEAD. verify_m9.js proves it.
import { transform, transformPredictionError } from '../uqb/instrument.js';
import { transformBehavior } from '../uqb/bio.js';
import { transformCandidates } from './probe.js';

export async function load(url, ctx, next) {
    const r = await next(url, ctx);
    if (!r.source) return r;
    const p = decodeURIComponent(url);

    if (/\/main\.js$/.test(p)) {
        return { ...r, source: transformCandidates(transform(String(r.source))) };
    }
    if (/\/render\/predictionError\.js$/.test(p)) {
        return { ...r, source: transformPredictionError(String(r.source)) };
    }
    if (/\/render\/behavior\.js$/.test(p)) {
        return { ...r, source: transformBehavior(String(r.source)) };
    }
    return r;
}
