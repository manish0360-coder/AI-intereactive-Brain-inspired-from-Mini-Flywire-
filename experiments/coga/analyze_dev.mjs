// ==========================================================
// COG-A — development analysis under the blinding rule (DESIGN.md §10)
// ==========================================================
//   node experiments/coga/analyze_dev.mjs --mfw <runA> [--repeat <dir> ...] --baselines <file.json> --out <file.json>
// Computes ONLY: instruments and determinism of the MFW sessions (I-IDENT, A6 repeat / t0 / load identity, map-off, guard,
// refusals, clock, RNG identity), visitation strata (AA / A0 / 0A / 00) of every agent, NO-SWAP outcome rates, pre-shift
// competence, and the two null instruments (QB-1 and random-walk theta, whose expectation is 0 by construction).
// MFW and Dyna-Q SWAP choices are SEALED: they are never read here (extractEvents(..., { sealed: true })).
// ==========================================================
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { worldAt } from './worlds.mjs';
import { extractEvents, competence, pairWorld } from './events.mjs';
import { strata, theta, bootstrap } from './analysis.mjs';
import { T_SHIFT, BOOTSTRAP } from './config.mjs';

const argv = process.argv;
const arg = (k) => { const i = argv.indexOf(k); return i > 0 ? argv[i + 1] : undefined; };
const args = (k) => argv.flatMap((a, i) => (a === k ? [argv[i + 1]] : []));
const hash = (x) => crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
const load = (dir) => Object.fromEntries(fs.readdirSync(dir).filter(f => f.endsWith('.json') && f !== 'manifest.json').map(f => [f.replace(/(-t0B)?\.json$/, ''), JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))]));

export function analyzeMfw(runA, repeats) {
  const A = load(runA), worldsSeen = new Map();
  for (const s of Object.values(A)) worldsSeen.set(s.world.id, s.world);
  const per = [], inst = { sessions: 0, crashed: 0, mapAuditFail: 0, refused: 0, clockViolations: 0, rngFail: 0, blockedIllegal: 0, self: 0, wallMs: [] };
  for (const s of Object.values(A)) {
    inst.sessions++; if (s.outcome.crashed || !s.outcome.completed) inst.crashed++; if (!s.mapAudit.ok) inst.mapAuditFail++; inst.refused += s.env.refused; inst.self += s.env.self;
    inst.clockViolations += s.clock.observed.violations.length; inst.blockedIllegal += s.guard.blockedIllegal; inst.wallMs.push(s.wallMs);
    if (s.rng.seededBeforeBoot !== false || s.rng.seededAtFirstStep !== true || s.rng.reseededAt !== T_SHIFT) inst.rngFail++;
  }
  const determinism = repeats.map(dir => { const B = load(dir); let same = 0, diff = 0, missing = 0; for (const [k, s] of Object.entries(A)) { const b = B[k]; if (!b) { missing++; continue; } if (hash(b.log) === hash(s.log)) same++; else diff++; } return { dir: path.basename(dir), same, diff, missing }; });
  const worlds = [];
  for (const [id, wv] of worldsSeen) {
    const S = A[`MFW-${wv.stream}${wv.index}-SWAP`], N = A[`MFW-${wv.stream}${wv.index}-NOSWAP`];
    const w = worldAt(wv.configSeed, wv.index, wv.stream);
    const iIdent = hash(S.log.filter(r => r[0] < T_SHIFT)) === hash(N.log.filter(r => r[0] < T_SHIFT));
    const pairs = pairWorld(w, extractEvents(w, S.log, { condition: 'SWAP', sealed: true }), extractEvents(w, N.log, { condition: 'NOSWAP' }));
    worlds.push({ ...pairs, iIdent, competence: competence(w, N.log), goalResets: { S: S.goalResets.length, N: N.goalResets.length } });
  }
  return { instruments: { ...inst, wallMs: { mean: inst.wallMs.reduce((a, b) => a + b, 0) / inst.wallMs.length, max: Math.max(...inst.wallMs) } }, determinism, worlds };
}

export function summarize(worlds) {
  const st = strata(worlds);
  const yN = worlds.flatMap(w => w.distal.filter(p => p.VN === 1).map(p => p.YN)), lN = worlds.flatMap(w => w.stable.filter(p => p.VN === 1).map(p => p.LN));
  const aaPerWorld = worlds.map(w => w.distal.filter(p => p.VS && p.VN).length);
  return { strata: st, noswapY: { n: yN.length, rate: yN.length ? yN.reduce((a, b) => a + b, 0) / yN.length : null }, noswapLeave: { n: lN.length, rate: lN.length ? lN.reduce((a, b) => a + b, 0) / lN.length : null },
    aaPerWorld, distalPerWorld: worlds.map(w => w.distal.length), tS: worlds.flatMap(w => w.distal.filter(p => p.VS).map(p => p.tS - T_SHIFT)), tN: worlds.flatMap(w => w.distal.filter(p => p.VN).map(p => p.tN - T_SHIFT)) };
}

if (arg('--out')) {
  const mfw = analyzeMfw(arg('--mfw'), args('--repeat'));
  const base = JSON.parse(fs.readFileSync(arg('--baselines'), 'utf8'));
  const byAgent = {};
  for (const s of base.sessions) { (byAgent[s.agent] ||= []).push({ ...s.pairs, competence: s.competence, iIdent: s.iIdent }); }
  const nullOf = (ws) => { const b = bootstrap(ws, theta, { replicates: BOOTSTRAP.replicates, seed: BOOTSTRAP.seed }); return { ...b, aa: strata(ws).AA }; };
  const out = {
    schema: 'coga/1.dev-analysis', blinding: 'MFW and DYNA SWAP choices sealed; not read',
    mfw: { instruments: mfw.instruments, determinism: mfw.determinism, iIdent: mfw.worlds.every(w => w.iIdent), ...summarize(mfw.worlds),
      competence: mfw.worlds.map(w => w.competence.share), worlds: mfw.worlds.map(({ distal, stable, ...r }) => ({ ...r, distal: distal.map(p => ({ s: p.s, VS: p.VS, VN: p.VN, tS: p.tS, tN: p.tN, YN: p.YN })), stable: stable.map(p => ({ s: p.s, VS: p.VS, VN: p.VN, LN: p.LN })) })) },
    baselines: Object.fromEntries(Object.entries(byAgent).map(([a, ws]) => [a, { iIdent: ws.every(w => w.iIdent), ...summarize(ws), competence: ws.map(w => w.competence.share),
      ...(a === 'DYNA' ? {} : { nullTheta: nullOf(ws) }) }])),
  };
  fs.writeFileSync(arg('--out'), JSON.stringify(out, null, 1));
  const m = out.mfw, f = (x) => (x === null ? 'null' : x.toFixed(3));
  console.log(`MFW: sessions ${m.instruments.sessions}, crashed ${m.instruments.crashed}, mapAudit fail ${m.instruments.mapAuditFail}, refused ${m.instruments.refused}, clock violations ${m.instruments.clockViolations}, rng fail ${m.instruments.rngFail}, blockedIllegal ${m.instruments.blockedIllegal}, I-IDENT ${m.iIdent}, mean wall ${(m.instruments.wallMs.mean / 1000).toFixed(1)} s`);
  console.log(`MFW determinism: ${JSON.stringify(m.determinism)}`);
  console.log(`MFW strata ${JSON.stringify(m.strata)}; NO-SWAP Y rate ${f(m.noswapY.rate)} (n ${m.noswapY.n}); NO-SWAP leave rate ${f(m.noswapLeave.rate)}; AA per world ${JSON.stringify(m.aaPerWorld)}; mean competence ${f(m.competence.reduce((a, b) => a + b, 0) / m.competence.length)}`);
  for (const [a, b] of Object.entries(out.baselines)) console.log(`${a}: I-IDENT ${b.iIdent}, strata ${JSON.stringify(b.strata)}, NO-SWAP Y ${f(b.noswapY.rate)}, mean competence ${f(b.competence.reduce((x, y) => x + y, 0) / b.competence.length)}${b.nullTheta ? `, NULL theta ${f(b.nullTheta.est)} [${f(b.nullTheta.lo)}, ${f(b.nullTheta.hi)}] (AA ${b.nullTheta.aa})` : ' (SWAP sealed)'}`);
}
