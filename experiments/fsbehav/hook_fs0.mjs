// A-FS0 loader hook: force the FutureScore contribution to zero without touching production code.
//
// futureBonus is pinned to 0, so the decision score keeps every other term (notably
// goalGradientBoost) and loses only FutureScore. This bounds how much of the stale-rate
// behaviour FutureScore explains at all.
//
// The anchor is the exact V2.3 projection expression; a miss throws rather than silently
// producing an unablated arm.
const ANCHOR = `  const futureBonus =
  projectFutureScore(imaginedFuture, graphDiameter());`;
const REPLACEMENT = `  const futureBonus = 0;`;

export async function load(url, ctx, next) {
  const r = await next(url, ctx);
  if (!r.source) return r;
  if (/\/main\.js$/.test(decodeURIComponent(url))) {
    const raw = String(r.source);
    const crlf = raw.includes('\r\n');
    const src = crlf ? raw.replace(/\r\n/g, '\n') : raw;
    const hits = src.split(ANCHOR).length - 1;
    if (hits !== 1) throw new Error(`A-FS0: projection anchor matched ${hits} times, expected 1`);
    const out = src.replace(ANCHOR, REPLACEMENT);
    return { ...r, source: crlf ? out.replace(/\n/g, '\r\n') : out };
  }
  return r;
}
