// FS-BD-01 Study 1 — one booted agent run per process (main.js is an ESM singleton).
//
// Reproduces the S3'(b) measurement conditions exactly: same driver, same panel seeds,
// TICKS = 80, BOOST = 0, quiet boot. The metric definitions are S3''s, verbatim:
//   decisions = writes to globalThis.lastReasoning      (one per runPrediction)
//   steps     = diag.mqfTotal delta                     (one per updateQ)
//   stale     = max(0, steps - decisions)
// _runonce.js is historical and is NOT modified; this runner re-implements the same pattern
// and adds only read-only observations (goal-reset count, futureBonus samples).
//
// env: ARM, SEED, TICKS, BOOST, OUT (evidence dir), ROOT_LABEL (commit of the tree being run)
import { boot, pressSpace } from '../phase1_0/_driver.js';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ARM = process.env.ARM || 'A-V23';
const seed = Number(process.env.SEED ?? 20260818);
const boost = Number(process.env.BOOST ?? 0);
const ticks = Number(process.env.TICKS ?? 80);
const OUT = process.env.OUT;
const ROOT_LABEL = process.env.ROOT_LABEL || 'unknown';

const { dom, timer, restore, main } = await boot({ seed });

// decisions: every assignment to lastReasoning (identical to _runonce.js)
const writes = [];
let _lr = globalThis.lastReasoning;
Object.defineProperty(globalThis, 'lastReasoning', {
  configurable: true,
  get() { return _lr; },
  set(v) { _lr = v; writes.push(v ? `${v.from}->${v.to}` : null); },
});

if (boost > 0) Object.defineProperty(globalThis, '_predictionErrorEpsilonBoost',
  { configurable: true, get() { return boost; }, set() {} });

// goal arrivals: the driver has already silenced console.log, so replacing it here captures
// the reset announcement during ticks without un-quieting startup. No RNG, no behaviour change.
let resets = 0;
console.log = (...a) => { if (typeof a[0] === 'string' && a[0].includes('Reset after goal')) resets++; };

// futureBonus observation: scoring.js publishes the last value it scored with (live binding)
const scoring = await import('../../render/scoring.js');

const diag = main._diagCounters;
pressSpace(dom);

const per = [];
const fbSamples = [];
for (let i = 0; i < ticks; i++) {
  const w = writes.length, q = diag.mqfTotal;
  if (!timer.tick()) break;
  per.push({ d: writes.length - w, s: diag.mqfTotal - q });
  const fb = scoring.liveFutureBonus;
  if (Number.isFinite(fb)) fbSamples.push(Number(fb.toFixed(6)));
}
restore();

const d = per.reduce((a, r) => a + r.d, 0);
const s = per.reduce((a, r) => a + r.s, 0);

// trajectory discontinuities: a write whose `from` is not the previous write's `to`.
// Independent cross-check on `resets` (it also counts any other repositioning).
let discontinuities = 0;
for (let i = 1; i < writes.length; i++) {
  const prev = writes[i - 1], cur = writes[i];
  if (!prev || !cur) continue;
  if (prev.split('->')[1] !== cur.split('->')[0]) discontinuities++;
}

const q = (arr, p) => { if (!arr.length) return null; const b = [...arr].sort((x, y) => x - y); return b[Math.min(b.length - 1, Math.floor(p * b.length))]; };

const result = {
  arm: ARM, rootLabel: ROOT_LABEL, seed, boost, ticks: per.length,
  decisions: d, steps: s,
  stale: Math.max(0, s - d),
  staleTicks: per.filter(r => r.s > r.d).length,
  staleRate: s > 0 ? Math.max(0, s - d) / s : 0,
  decisionsPerTick: per.length ? d / per.length : 0,
  stepsPerTick: per.length ? s / per.length : 0,
  goalResets: resets,
  discontinuities,
  futureBonus: { n: fbSamples.length, min: q(fbSamples, 0), p25: q(fbSamples, 0.25), median: q(fbSamples, 0.5), p75: q(fbSamples, 0.75), max: q(fbSamples, 0.999) },
  writes,
  nodeVersion: process.version,
};
result.outputHash = crypto.createHash('sha256')
  .update(JSON.stringify({ ...result, startedAt: undefined })).digest('hex');

if (OUT) {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, `${ARM}_${seed}.json`), JSON.stringify(result, null, 2));
}
process.stdout.write('@@RESULT@@' + JSON.stringify(result));
