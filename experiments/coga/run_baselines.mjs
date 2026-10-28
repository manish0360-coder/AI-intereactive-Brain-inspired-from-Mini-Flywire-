// ==========================================================
// COG-A — baseline sessions (random walk, QB-1, Dyna-Q), in process (they are pure and fast)
// ==========================================================
//   node experiments/coga/run_baselines.mjs --set dev|sim:<from>:<count> --out <file.json> [--alpha a --epsilon e] [--k K] [--tune]
// --tune   QB-1 grid (DESIGN.md §3.1) on ALL development worlds 0-29, NO-SWAP only, scored by goal arrivals in steps [1000, 1500)
//          (phase-I performance: identical in both conditions, no swap-dependent quantity).  Writes every grid point.
// Otherwise: every second-stage-accepted world of the set, both conditions, agents RW / QB1 / DYNA; per session the paired
// events (SEALED for DYNA's SWAP choices: the blinding rule, DESIGN.md §10), P2 competence, arrivals and the log hash.
// ==========================================================
import fs from 'node:fs';
import crypto from 'node:crypto';
import { streamWorlds } from './worlds.mjs';
import { runBaseline } from './agents.mjs';
import { extractEvents, competence, pairWorld } from './events.mjs';
import { STUDY_STREAM_START, SIM_STREAM_START, DEV_INDICES, TUNING_GRID, T_SHIFT, DYNA_K } from './config.mjs';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const set = arg('--set', 'dev'), outFile = arg('--out');
const SEALED = new Set(['DYNA']);
export function worldsOf(set) {
  if (set === 'dev') return streamWorlds(STUDY_STREAM_START, DEV_INDICES.hi + 1, 'study');
  const [, f, n] = set.split(':').map(Number); return streamWorlds(SIM_STREAM_START, f + n, 'sim').slice(f);
}
const hash = (x) => crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');

export function tune(worlds) {
  const grid = [];
  for (const alpha of TUNING_GRID.alpha) for (const epsilon of TUNING_GRID.epsilon) {
    const per = worlds.map(w => runBaseline({ world: w, agent: 'QB1', condition: 'NOSWAP', params: { alpha, epsilon }, steps: T_SHIFT }).arrivals.filter(t => t >= 1000 && t < T_SHIFT).length);
    grid.push({ alpha, epsilon, meanArrivals: per.reduce((a, b) => a + b, 0) / per.length, perWorld: per });
  }
  const best = grid.reduce((b, g) => (g.meanArrivals > b.meanArrivals ? g : b));
  return { grid, chosen: { alpha: best.alpha, epsilon: best.epsilon }, rule: 'max mean goal arrivals in steps [1000, 1500), NO-SWAP, development worlds 0-29; first maximum in grid order' };
}

export function runSet(worlds, params, agents = ['RW', 'QB1', 'DYNA']) {
  const res = [];
  for (const w of worlds.filter(x => x.accepted)) for (const agent of agents) {
    const p = agent === 'DYNA' ? { ...params, k: params.k ?? DYNA_K } : params;
    const S = runBaseline({ world: w, agent, condition: 'SWAP', params: p }), N = runBaseline({ world: w, agent, condition: 'NOSWAP', params: p });
    const pre = (l) => hash(l.filter(r => r[0] < T_SHIFT));
    const sealed = SEALED.has(agent);
    res.push({ agent, world: w.id, goal: w.goal, configSeed: w.configSeed, iIdent: pre(S.log) === pre(N.log), competence: competence(w, N.log),
      arrivals: { S: S.arrivals.length, N: N.arrivals.length, pre: N.arrivals.filter(t => t < T_SHIFT).length }, updatesPerStep: S.updatesPerStep,
      logSha256: { S: hash(S.log), N: hash(N.log) }, sealed,
      pairs: pairWorld(w, extractEvents(w, S.log, { condition: 'SWAP', sealed }), extractEvents(w, N.log, { condition: 'NOSWAP' })) });
  }
  return res;
}

if (outFile) {
  const worlds = worldsOf(set);
  const out = arg('--tune') !== undefined || process.argv.includes('--tune')
    ? { schema: 'coga/1.tuning', set, ...tune(worlds) }
    : { schema: 'coga/1.baselines', set, params: { alpha: Number(arg('--alpha')), epsilon: Number(arg('--epsilon')), k: Number(arg('--k', String(DYNA_K))) },
        sessions: runSet(worlds, { alpha: Number(arg('--alpha')), epsilon: Number(arg('--epsilon')), k: Number(arg('--k', String(DYNA_K))) }) };
  fs.writeFileSync(outFile, JSON.stringify(out));
  console.log(out.schema === 'coga/1.tuning' ? `chosen ${JSON.stringify(out.chosen)}; grid ${out.grid.map(g => `${g.alpha}/${g.epsilon}:${g.meanArrivals.toFixed(1)}`).join(' ')}` : `${out.sessions.length} agent-world pairs; I-IDENT ${out.sessions.every(s => s.iIdent)}`);
}
