// ==========================================================
// CF-00 runtime audit — one headless MiniFlyWire session (one OS process per session)
// ==========================================================
//   node --import <file URL of preload.mjs> experiments/cf00_audit/session.mjs '<json>'
//   json: { seed, goal: <node id> | null, loops, out: <file outside the repository> }
// Boots the real main.js through experiments/phase1_0/_driver.js, presses SPACE and fires `loops` agent loops
// (5 runAgent steps each).  An always-succeeding __M7_ENV__ is attached only to log executed moves: it returns true
// for every attempt, which is exactly main.js's behaviour with no environment attached.  Goal-entering moves bypass
// __M7_ENV__ (main.js:4992-5018), so goal arrivals are counted from main.js's own gate-0 log line instead.
// The record holds every runPrediction step (the 36 terms of every candidate), every executed move and every arrival.
// ==========================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const input = JSON.parse(process.argv[2]);
if (!globalThis.__CF00_ADVANCE__) throw new Error('the cf00 preload is not installed');
const outRel = path.relative(ROOT, path.resolve(input.out));
if (!outRel.startsWith('..') && !path.isAbsolute(outRel)) throw new Error('the output file must be outside the repository');

const decisions = [];
let pending = null, cands = [];
globalThis.__CF00__ = {
  terms(T) { pending = T.map((t) => [t[0], t[1]]); },
  cand(k, fw, arb) { cands.push({ k: String(k), fw, arb, terms: pending }); pending = null; },
  decide(step, current, sorted, explore, eps) {
    decisions.push({ step, current: String(current), ranked: sorted.map((c) => [String(c.key), c.weight]), explore: explore ? String(explore.key) : null, eps, cands });
    cands = [];
  },
};
const moves = [];
globalThis.__M7_ENV__ = { attempt(from, to) { moves.push([String(from), String(to), decisions.length]); return true; } };

const { boot, pressSpace } = await import(pathToFileURL(path.join(ROOT, 'experiments/phase1_0/_driver.js')).href);
const { dom, timer, restore } = await boot({ seed: input.seed, goal: input.goal ?? undefined, quiet: true });
const goalHits = [];
console.log = (...a) => { if (typeof a[0] === 'string' && a[0].startsWith('[EPISODE ATTEMPT] gate0:goal-reached')) goalHits.push(moves.length); };
let fired = 0, crash = null;
try {
  pressSpace(dom);
  for (let l = 0; l < input.loops; l++) {
    globalThis.__CF00_ADVANCE__();
    if (!timer.tick()) break;
    fired++;
  }
} catch (e) { crash = String((e && e.stack) || e).slice(0, 600); }
restore();
fs.writeFileSync(input.out, JSON.stringify({ seed: input.seed, goal: input.goal, loops: input.loops, fired, crash, goalHits, decisions, moves }));
process.stdout.write(`${JSON.stringify({ seed: input.seed, goal: input.goal, fired, crash: crash ? crash.slice(0, 160) : null, arrivals: goalHits.length, moves: moves.length })}\n`);
process.exit(crash ? 1 : 0);
