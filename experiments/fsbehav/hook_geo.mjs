// A-GEO loader hook: neutralise LEARNED EVIDENCE without touching production code.
//
// recordFor() is forced to report an unobserved edge for every query, so c_hat = (0+1)/(0+1) = 1
// on every edge. Writes are untouched: recordOutcome still runs, the boundary still owns the
// record, and only the CONSUMER's view is neutralised.
//
// This is the predicted-null arm. The FS-BD-01 derivation says the S3' harness already has
// a = s on every edge (no M7 environment => every traversal succeeds), hence c_hat = 1 already,
// hence this hook must change NOTHING. If A-GEO differs from A-V23, the derivation is wrong.
const TAIL = `
;{
  // live-binding override of the exported function declaration (the D2 technique)
  recordFor = function () { return { a: 0, s: 0 }; };
}
`;

export async function load(url, ctx, next) {
  const r = await next(url, ctx);
  if (!r.source) return r;
  if (/\/render\/traversalRecord\.js$/.test(decodeURIComponent(url))) {
    const src = String(r.source);
    if (!/export function recordFor\(/.test(src)) throw new Error('A-GEO: recordFor anchor missing');
    return { ...r, source: src + TAIL };
  }
  return r;
}
