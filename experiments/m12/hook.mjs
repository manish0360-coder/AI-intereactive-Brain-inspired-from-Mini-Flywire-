// M12 load hook: UQ-B's committed transforms plus the M12 input recorder.
// Same technique and the same default-off discipline as M9/M11.
import { transform, transformPredictionError } from '../uqb/instrument.js';
import { transformBehavior } from '../uqb/bio.js';
import { transformFilters } from './probe.js';

export async function load(url, ctx, next) {
    const r = await next(url, ctx);
    if (!r.source) return r;
    const p = decodeURIComponent(url);
    if (/\/main\.js$/.test(p)) {
        return { ...r, source: transformFilters(transform(String(r.source))) };
    }
    if (/\/render\/predictionError\.js$/.test(p)) {
        return { ...r, source: transformPredictionError(String(r.source)) };
    }
    if (/\/render\/behavior\.js$/.test(p)) {
        return { ...r, source: transformBehavior(String(r.source)) };
    }
    return r;
}
