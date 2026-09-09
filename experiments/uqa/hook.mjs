// ==========================================================
// UQ-A ESM LOAD HOOK — in-memory ablation, no disk write to the repository
// ==========================================================
// The technique is the one already proven in experiments/m8/hook.mjs and
// experiments/q1/hook.mjs: intercept main.js as it loads, transform it, hand
// the result to the module system. The repository file is never touched.
//
// THE ARM COMES FROM THE ENVIRONMENT, AND ITS ABSENCE IS FATAL
//   node:module `register` runs this hook in a SEPARATE loader thread, so
//   main-thread state is invisible here. The arm therefore travels in the child
//   process environment. An unset or unrecognised arm THROWS; it never falls
//   back to ARMED. A silent fallback would produce an unablated run labelled
//   ABLATED, which is the worst failure this experiment could have.
//
// THE HOOK ATTESTS WHAT IT ACTUALLY DELIVERED
//   The transform runs in the loader thread, so the main thread cannot observe
//   it directly. When UQA_MARKER names a path, the hook writes the arm and the
//   SHA-256 of the source text it handed to the module system. The collector
//   recomputes that digest independently and refuses the run unless the two
//   agree. That converts "the ablation was applied" from an assumption into an
//   end-to-end proof over the code actually executed.
//
//   LINE ENDINGS ARE NORMALISED BEFORE DIGESTING, and only line endings. Under
//   core.autocrlf=true a fresh clone materialises main.js with CRLF, so a digest
//   over raw bytes would differ between checkouts and the recorded evidence
//   would not regenerate. Line terminators are semantically void in JavaScript,
//   and verify_uqa.js D12 proves the transform preserves whatever terminators it
//   was given rather than rewriting them. Normalising here therefore costs the
//   proof nothing: it still shows the delivered source is exactly the arm's
//   transform of committed main.js, and it makes that showable from any clone.
//
//   The marker is written under the OS temp directory chosen by the collector
//   and is deleted with it. Nothing is written inside the repository.
import crypto from 'node:crypto';
import fs from 'node:fs';
import { transform } from './instrument.js';

const ARM = process.env.UQA_ARM;
if (ARM !== 'ARMED' && ARM !== 'ABLATED') {
    throw new Error(`UQ-A hook: UQA_ARM must be ARMED or ABLATED, got ${JSON.stringify(ARM)}. ` +
        `The hook refuses to guess an arm.`);
}

export async function load(url, ctx, next) {
    const r = await next(url, ctx);
    if (!/\/main\.js$/.test(decodeURIComponent(url)) || !r.source) return r;

    const delivered = transform(String(r.source), ARM);

    const marker = process.env.UQA_MARKER;
    if (marker) {
        const eolNormalised = (s) => s.replace(/\r\n/g, '\n');
        const digest = (s) => crypto.createHash('sha256')
            .update(eolNormalised(s)).digest('hex');
        fs.writeFileSync(marker, JSON.stringify({
            arm: ARM,
            url: decodeURIComponent(url),
            digestBasis: 'sha256 over the source with CRLF normalised to LF',
            deliveredDigest: digest(delivered),
            receivedDigest: digest(String(r.source)),
        }) + '\n');
    }
    return { ...r, source: delivered };
}
