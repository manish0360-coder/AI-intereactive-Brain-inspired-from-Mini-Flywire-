// ==========================================================
// GATE-FLOOR-1 — the accepted-configuration stream, extended from the XFER-2 cache (pure of the study; I/O only for the cache)
// ==========================================================
// generateAcceptedStream(start, count) is the recurrence  seed_0 = start;  element_i = generateAccepted(seed_i, i);
// seed_{i+1} = acceptedSeed_i + 1.  The first 232 elements are already cached by XFER-2; the rest are produced by
// continuing that same recurrence, so the result IS generateAcceptedStream(CONFIG_START, count) (the gate checks the
// seam: element 232 of the extended stream equals generateAccepted(acceptedSeed_231 + 1, 232), and the cached prefix is
// untouched).  Nothing is invented: a different stream is a different set of worlds.
// ==========================================================
import fs from 'node:fs';
import path from 'node:path';
import { generateAccepted } from '../m7/env.js';

const keep = (r) => ({ acceptedConfigIndex: r.provenance.acceptedConfigIndex, startingSeed: r.provenance.startingSeed, acceptedSeed: r.provenance.acceptedSeed,
  numberOfRejectedCandidatesBeforeAcceptance: r.provenance.numberOfRejectedCandidatesBeforeAcceptance, goal: r.cfg.goal });

/** continue `prefix` (an array of cached stream elements) up to `count` elements */
export function continueStream(prefix, count, onProgress = null) {
  const out = prefix.slice();
  if (out.some((e, i) => e.acceptedConfigIndex !== i)) throw new Error('the cached prefix is not indexed 0..n-1');
  for (let i = 0; i < out.length - 1; i++) if (out[i + 1].startingSeed !== out[i].acceptedSeed + 1) throw new Error(`the cached prefix breaks the recurrence at element ${i + 1}`);
  while (out.length < count) {
    const i = out.length;
    const seed = i === 0 ? null : (out[i - 1].acceptedSeed + 1) >>> 0;
    if (seed === null) throw new Error('an empty prefix cannot be continued (the stream start is the caller\'s)');
    out.push(keep(generateAccepted(seed, i)));
    if (onProgress) onProgress(i, out[i]);
  }
  return out;
}

/** the stream of `count` elements from `start`, reusing the XFER-2 cache of the same start as the prefix when it exists */
export function extendStream(start, count, xfer2DataDir, envSha) {
  // the LONGEST cached prefix of this start (XFER-2 left a 152-element cache from its first design and the 232-element one)
  const cached = fs.existsSync(xfer2DataDir) ? fs.readdirSync(xfer2DataDir).map(f => ({ f, m: f.match(new RegExp(`^stream_${start}_(\\d+)_${envSha.slice(0, 12)}\\.json$`)) })).filter(x => x.m).map(x => ({ f: x.f, n: Number(x.m[1]) })) : [];
  cached.sort((a, b) => b.n - a.n);
  const prefixFile = cached.length ? cached[0].f : null;
  if (!prefixFile) throw new Error(`no cached XFER-2 stream prefix for start ${start} (env.js digest ${envSha.slice(0, 12)})`);
  const prefix = JSON.parse(fs.readFileSync(path.join(xfer2DataDir, prefixFile), 'utf8'));
  if (prefix[0].startingSeed !== start) throw new Error('the cached prefix does not start at the stream start');
  const t0 = Date.now();
  const out = continueStream(prefix, count, (i) => { if ((i - prefix.length) % 20 === 0) console.log(`  stream element ${i} (${((Date.now() - t0) / 1000).toFixed(0)} s)`); });
  return out;
}
