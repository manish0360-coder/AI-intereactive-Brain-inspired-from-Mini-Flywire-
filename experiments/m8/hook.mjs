// ==========================================================
// M8 ESM LOAD HOOK — in-memory source transform, no disk write
// ==========================================================
// The technique is the one already proven in experiments/m7/verify_G15.js:
// intercept main.js as it loads, splice probe lines in, hand the result to
// the module system. The repository file is never touched.
//
// Registering this hook is the ONLY way M8 probes enter the build. With the
// hook unregistered, main.js is byte-identical to HEAD; with the hook
// registered but globalThis.__MFW_M8__ unset, every probe is one falsy
// global read. Both states are asserted by verify_m8_instrument.js.
import { transform } from './instrument.js';

export async function load(url, ctx, next) {
    const r = await next(url, ctx);
    if (!/\/main\.js$/.test(decodeURIComponent(url)) || !r.source) return r;
    return { ...r, source: transform(String(r.source)) };
}
