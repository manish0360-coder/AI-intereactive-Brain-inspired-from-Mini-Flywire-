// ==========================================================
// M11 ESM LOAD HOOK — serve EITHER the pre-repair or the post-repair main.js
// ==========================================================
// The behavioural delta (Workflow 2D/2E) has to compare the agent BEFORE and
// AFTER the canReachGoal repair. The working tree only holds the repaired
// version, so the pre-repair bytes are extracted from git (0227a5f) into a
// file and served through this hook. Nothing on disk in the repository is
// swapped, reverted, or written.
//
// M11_MAIN_SRC unset  -> the working tree's main.js (post-repair)
// M11_MAIN_SRC set    -> that file's contents in place of main.js (pre-repair)
//
// On top of that substitution it applies the SAME committed instrumentation
// M9 used, so both sides are measured by identical machinery:
//   UQ-B  instrument.transform        the runPrediction handle + guarded probe
//   M9    transformCandidates         the guarded candidate ledger
// Both are default-off; with their globals unset the build is behaviourally
// identical to the source it was given.
import fs from 'node:fs';
import { transform, transformPredictionError } from '../uqb/instrument.js';
import { transformBehavior } from '../uqb/bio.js';
import { transformCandidates } from '../m9/probe.js';

const OVERRIDE = process.env.M11_MAIN_SRC || null;

export async function load(url, ctx, next) {
    const r = await next(url, ctx);
    if (!r.source) return r;
    const p = decodeURIComponent(url);

    if (/\/main\.js$/.test(p)) {
        const src = OVERRIDE ? fs.readFileSync(OVERRIDE, 'utf8') : String(r.source);
        return { ...r, source: transformCandidates(transform(src)) };
    }
    if (/\/render\/predictionError\.js$/.test(p)) {
        return { ...r, source: transformPredictionError(String(r.source)) };
    }
    if (/\/render\/behavior\.js$/.test(p)) {
        return { ...r, source: transformBehavior(String(r.source)) };
    }
    return r;
}
