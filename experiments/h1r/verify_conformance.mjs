// ==========================================================
// H1-R — M7 CONFORMANCE VERIFICATION (gates A–H)
// ==========================================================
// Material: ONLY the historical G15 configuration material (900030–900499, accepted per the
// unchanged predicate) and agent seed 20260819000. No new seed is generated.
// BLINDING: only gate / mechanism quantities are reported — no per-arm outcome metric
// (goal-reach counts, returns, steps-to-goal, chosen-edge slip rates).
//
//   node experiments/h1r/verify_conformance.mjs      (writes experiments/h1r/evidence/)
// ==========================================================
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildTree } from './build_tree.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const EVID = path.join(HERE, process.env.H1R_EVIDENCE || 'evidence');
fs.mkdirSync(EVID, { recursive: true });
const RUN_ONE = path.join(HERE, 'run_one.mjs');
const WORKERS = Number(process.env.WORKERS || 6);
const AGENT_SEED = 20260819000;
const ARMS = ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7'];
const sum = (a) => a.reduce((x, y) => x + y, 0);
// evidence never records the local temp-directory prefix (it contains the machine account name)
const TMPS = [...new Set([(() => { try { return fs.realpathSync.native(os.tmpdir()); } catch { return os.tmpdir(); } })(), os.tmpdir()])];
const shown = (p) => TMPS.reduce((s, t) => s.split(t).join('<tmp>'), String(p));
const t0 = Date.now();

// ---------------- trees ----------------
const C = buildTree();
const P = buildTree({ pristine: true });
const MUT = C.dir + '-mutant-goal';
if (!fs.existsSync(MUT)) {
  fs.cpSync(C.dir, MUT, { recursive: true });
  const f = path.join(MUT, 'main.js');
  const L = fs.readFileSync(f, 'utf8').split('\n');
  const i = L.findIndex(l => l.includes('// H1R GOAL'));
  if (i < 0) throw new Error('mutant: GOAL edit not found');
  L[i] = '      if (episodeUnique >= 3) {';
  fs.writeFileSync(f, L.join('\n'));
}
// R1 anti-vacuity mutant: the R1-VIEW edit removed (the early draw and its reuse kept), so the
// self-learning section runs in B2 order on the intended move with the lagged agentLast.
const MUT_R1 = C.dir + '-mutant-r1';
if (!fs.existsSync(MUT_R1)) {
  fs.cpSync(C.dir, MUT_R1, { recursive: true });
  const f = path.join(MUT_R1, 'main.js');
  const L = fs.readFileSync(f, 'utf8').split('\n');
  const i = L.findIndex(l => l.includes('// H1R R1-VIEW'));
  if (i < 0) throw new Error('mutant: R1-VIEW edit not found');
  L[i] = '';
  fs.writeFileSync(f, L.join('\n'));
}
console.log('conformed tree:', shown(C.dir), C.reused ? '(reused)' : '(built)');
console.log('pristine tree :', shown(P.dir));

// ---------------- material: historical G15 samples ----------------
const samplesFile = path.join(EVID, 'g15_samples.json');
let SAMPLES;
if (fs.existsSync(samplesFile)) SAMPLES = JSON.parse(fs.readFileSync(samplesFile, 'utf8'));
else {
  const env = await import(pathToFileURL(path.join(P.dir, 'experiments', 'm7', 'env.js')).href);
  SAMPLES = [];
  for (let seed = 900030; seed <= 900499; seed++) for (const i of [0, 1, 2, 3])
    if (env.makeConfig(seed, i).accepted) SAMPLES.push({ configSeed: seed, configIndex: i });
  const seen = env.evaluatedSeeds();
  if (!seen.every(s => s >= 900030 && s <= 900499)) throw new Error('seed boundary violated');
  fs.writeFileSync(samplesFile, JSON.stringify(SAMPLES));
}
if (SAMPLES.length !== 41) throw new Error(`expected the 41 historical G15 configurations, got ${SAMPLES.length}`);
const SUB = SAMPLES.slice(0, 3);

// ---------------- runner ----------------
function run(job) {
  return new Promise((res) => {
    const arg = JSON.stringify({ agentSeed: AGENT_SEED, ...job });
    execFile(process.execPath, [RUN_ONE, arg], { cwd: path.join(job.tree, 'experiments', 'm7'), maxBuffer: 1 << 28 },
      (e, out, err) => {
        const i = out ? out.indexOf('@@H1R@@') : -1;
        if (i < 0) return res({ ...job, tree: shown(job.tree), error: shown(String(err || (e && e.message) || 'no output')).slice(-3000) });
        res({ ...JSON.parse(out.slice(i + 7)), set: job.set, tree: shown(job.tree) });
      });
  });
}
async function pool(jobs) {
  const out = new Array(jobs.length); let k = 0, done = 0;
  await Promise.all(Array.from({ length: WORKERS }, async () => {
    while (k < jobs.length) { const j = k++; out[j] = await run(jobs[j]); done++;
      if (done % 25 === 0 || done === jobs.length) process.stdout.write(`  ${done}/${jobs.length} runs\n`); }
  }));
  return out;
}
const J = [];
for (const s of SUB) for (const arm of ARMS) {
  J.push({ set: 'parityPristine', tree: P.dir, h1r: 'off', arm, ...s });
  J.push({ set: 'parityConformedOff', tree: C.dir, h1r: 'off', arm, ...s });
  J.push({ set: 'onNoRecord', tree: C.dir, h1r: 'on', arm, ...s });
  J.push({ set: 'onNoRecord2', tree: C.dir, h1r: 'on', arm, ...s });
}
for (const s of SAMPLES) for (const arm of ARMS) J.push({ set: 'main', tree: C.dir, h1r: 'on', record: true, arm, ...s });
for (const s of SUB) for (const arm of ['A1', 'A3', 'A4']) J.push({ set: 'antiOff', tree: C.dir, h1r: 'off', record: true, arm, ...s });
for (const s of SUB) J.push({ set: 'mutantGoal', tree: MUT, h1r: 'on', record: true, arm: 'A1', ...s });
for (const s of SUB) J.push({ set: 'mutantR1', tree: MUT_R1, h1r: 'on', record: true, arm: 'A1', ...s });
for (const s of SAMPLES) J.push({ set: 'diagAttemptGated', tree: C.dir, h1r: 'on', record: true, trustMode: 'attemptGated', arm: 'A1', ...s });
let R;
if (process.env.H1R_EVAL_ONLY) {   // re-evaluate the gates on the saved runs of this evidence directory (no execution)
  R = JSON.parse(fs.readFileSync(path.join(EVID, 'runs.json'), 'utf8'));
  console.log(`EVAL_ONLY: re-evaluating ${R.length} saved runs (no execution)`);
} else {
  console.log(`running ${J.length} single-process runs with ${WORKERS} workers ...`);
  R = await pool(J);
  fs.writeFileSync(path.join(EVID, 'runs.json'), JSON.stringify(R));
}
const errs = R.filter(r => r.error);
const by = (set) => R.filter(r => r.set === set && !r.error);
const key = (r) => `${r.configSeed}/${r.configIndex}/${r.arm}`;
const main = by('main');

// ---------------- gates ----------------
const G = [];
const gate = (id, name, pass, evidence) => { G.push({ id, name, status: pass === null ? 'CONFLICT' : pass ? 'PASS' : 'FAIL', evidence }); };

gate('X0', 'every run completed without error or crash', errs.length === 0 && R.every(r => r.error || (r.completed && !r.crashed)),
  `${R.length} runs, ${errs.length} errors, ${R.filter(r => !r.error && (!r.completed || r.crashed)).length} incomplete/crashed`);

// G1' parity: conformed tree with the H1R runtime absent is bit-identical to B2
{ const pp = by('parityPristine'), pc = by('parityConformedOff');
  const same = pp.filter(p => { const c = pc.find(x => key(x) === key(p)); return c && c.fp === p.fp && c.cog === p.cog; }).length;
  gate("G1'", 'transformed tree is inert without the H1R runtime (fingerprint = B2, all 7 arms)', same === pp.length && pp.length === SUB.length * 7,
    `${same}/${pp.length} (config, arm) pairs identical in fingerprint and cognitive draws`); }

// A — REAL EDGE
{ const mv = (k) => sum(main.map(r => r.moves[k] || 0));
  gate('A1', 'no non-edge (draw-free) movement', mv('NONEDGE') === 0,
    `NONEDGE ${mv('NONEDGE')} | edge attempts ${mv('edgeSuccess') + mv('edgeSlip')} | self no-op re-executions ${mv('selfNoop')} (no position change, no draw, no credit)`);
  gate('A2', 'no non-edge pair enters transition memory', sum(main.map(r => r.tr.nonEdge)) === 0 && sum(main.map(r => r.epTr.nonEdge)) === 0 && main.every(r => r.transitionsEnd.nonEdge === 0),
    `main writes non-edge ${sum(main.map(r => r.tr.nonEdge))}/${sum(main.map(r => r.tr.n))}; episode writes non-edge ${sum(main.map(r => r.epTr.nonEdge))}/${sum(main.map(r => r.epTr.n))}; end-of-run non-edge entries ${sum(main.map(r => r.transitionsEnd.nonEdge))}`);
  const pipeNE = sum(main.flatMap(r => Object.values(r.pipe).map(p => p.nonEdgePairs)));
  const pipeAll = sum(main.flatMap(r => Object.values(r.pipe).map(p => p.pairs)));
  const replayNE = sum(main.map(r => (r.pipe['full:replay'] || { nonEdgePairs: 0 }).nonEdgePairs));
  gate('A3', 'no non-edge pair enters episode learning or replay (Q via episodes, rewards, momentum, trust credit)', pipeNE === 0,
    `non-edge episode pairs ${pipeNE}/${pipeAll}; replay ${replayNE}`);
  gate('A4', 'no non-edge key in the trust store', main.every(r => r.trustChecks.nonEdgeKeysMax === 0),
    `max non-edge trust keys over all snapshots and runs: ${Math.max(...main.map(r => r.trustChecks.nonEdgeKeysMax))}`);
  gate('A5', 'every goal reach is a graph-edge move from an adjacent node', main.every(r => r.goals.canonical === r.goals.n),
    `canonical ${sum(main.map(r => r.goals.canonical))}/${sum(main.map(r => r.goals.n))} goal reaches (pooled over all arms)`);
  gate('A6', 'backup move guard never needed (mask + P4 complete)', main.every(r => r.h1rCounters.blockedIllegal === 0),
    `guard firings ${sum(main.map(r => r.h1rCounters.blockedIllegal))}`);
  const off = by('antiOff');
  gate('A-AV', 'anti-vacuity: the same probes detect non-edge movement and pairs when conformance is off',
    sum(off.map(r => r.moves.NONEDGE || 0)) > 0 && sum(off.flatMap(r => Object.values(r.pipe).map(p => p.nonEdgePairs))) > 0 && off.some(r => r.trustChecks.nonEdgeKeysMax > 0),
    `H1R off: NONEDGE ${sum(off.map(r => r.moves.NONEDGE || 0))}, non-edge episode pairs ${sum(off.flatMap(r => Object.values(r.pipe).map(p => p.nonEdgePairs)))}, max non-edge trust keys ${Math.max(...off.map(r => r.trustChecks.nonEdgeKeysMax))}`);
}

// R — REALISED-OUTCOME LEARNING ORDER (Director ruling R1). Every learning write of a tick is resolved
// against that tick's realised transition (move u->v, goal entry u->goal; a slip, a self no-op or no
// decision realises no transition).
{ const rr = (runs, f) => sum(runs.map(x => f(x.r1)));
  const r = (f) => rr(main, f);
  const kinds = (k) => r(x => x.ticks[k]);
  gate('R1a', "every main TD Q update is Q(S, A) of the realised transition (S = decision position, A = realised node, S' = realised node or goal)",
    r(x => x.q.n) > 0 && r(x => x.q.mismatch) === 0 && r(x => x.q.nonEdge) === 0 && r(x => x.q.onUnrealised) === 0,
    `updates ${r(x => x.q.n)} (FROZEN calls included; blocked at the choke point), mismatches ${r(x => x.q.mismatch)}, non-edge keys ${r(x => x.q.nonEdge)}, on unrealised ticks ${r(x => x.q.onUnrealised)}`);
  gate('R1b', 'no learning from an unrealised transition (learning section, Q, transitions, explore-step and success-episode pairs)',
    r(x => x.learn.onUnrealised) === 0 && r(x => x.q.onUnrealised) === 0 && r(x => x.tr.unrealised) === 0 && r(x => x.explore.unrealised) === 0 &&
    r(x => x.success.unrealised) === 0 && r(x => x.tr.n) > 0 && r(x => x.explore.n) > 0 && r(x => x.success.n) > 0,
    `learning-section entries on unrealised ticks ${r(x => x.learn.onUnrealised)}/${r(x => x.learn.n)}; transitions writes unrealised ${r(x => x.tr.unrealised)}/${r(x => x.tr.n)}; ` +
    `explore pairs unrealised ${r(x => x.explore.unrealised)}/${r(x => x.explore.n)}; success-episode pairs unrealised ${r(x => x.success.unrealised)}/${r(x => x.success.n)}`);
  gate('R1c', 'coverage: every realised move and goal entry gets exactly one learning pass and one main Q update (return moves included)',
    r(x => x.learn.missing) === 0 && r(x => x.learn.duplicate) === 0 && r(x => x.learn.mismatch) === 0 && r(x => x.q.missing) === 0 && r(x => x.q.duplicate) === 0 &&
    r(x => x.ret.n) > 0 && r(x => x.ret.covered) === r(x => x.ret.n),
    `realised moves ${kinds('move')}, goal entries ${kinds('goal')}; missing learning ${r(x => x.learn.missing)}, missing Q ${r(x => x.q.missing)}, duplicates ${r(x => x.learn.duplicate) + r(x => x.q.duplicate)}; ` +
    `return moves covered ${r(x => x.ret.covered)}/${r(x => x.ret.n)} (per arm: ${ARMS.map(a => { const rs = main.filter(x => x.arm === a); return `${a} ${rr(rs, x => x.ret.covered)}/${rr(rs, x => x.ret.n)}`; }).join(', ')})`);
  gate('R1d', 'a slip receives no reward and no update (it costs only the elapsed tick)', r(x => x.q.onSlip) === 0 && r(x => x.learn.onUnrealised) === 0 && kinds('slip') > 0,
    `slip ticks ${kinds('slip')}; Q updates on slip ticks ${r(x => x.q.onSlip)} (positive reward ${r(x => x.q.onSlipPositive)}); self no-op ticks ${kinds('self')}; non-edge ${kinds('nonedge')}`);
  gate('R1e', 'exactly one environment draw per edge-attempt decision, none otherwise (goal entries included), from the environment stream counter',
    r(x => x.env.mismatch) === 0 && main.every(x => x.r1.env.maxPerTick <= 1) && r(x => x.env.draws) === r(x => x.env.expected) &&
    sum(main.map(x => x.envCounters.envDraws)) === r(x => x.env.draws) && r(x => x.env.goalEntryDraws) === 0,
    `draws ${r(x => x.env.draws)} = edge-attempt decisions ${r(x => x.env.expected)} (moves ${kinds('move')} + slips ${kinds('slip')}); per-tick mismatches ${r(x => x.env.mismatch)}; max per tick ${Math.max(...main.map(x => x.r1.env.maxPerTick))}; ` +
    `env stream counter ${sum(main.map(x => x.envCounters.envDraws))}; goal-entry draws ${r(x => x.env.goalEntryDraws)}`);
  const tally = (k) => { const o = {}; for (const x of main) for (const [rw, n] of Object.entries(x.r1.q.rewardByKind[k])) o[rw] = (o[rw] || 0) + n; return JSON.stringify(o); };
  G.push({ id: 'R1-INFO', name: 'reward carried by main TD Q updates, by realised outcome (existing rules; pooled over all arms)', status: 'INFO',
    evidence: `move ${tally('move')} | goal ${tally('goal')} | slip ${tally('slip')} | other ${tally('other')}` });
  const off = by('antiOff'), mut = by('mutantR1');
  gate('R1-AV', 'anti-vacuity: B2 order (conformance off) and the R1-VIEW mutant both learn on unrealised slips and miss realised return moves; both draw once per decision',
    rr(off, x => x.q.onSlip) > 0 && rr(off, x => x.q.mismatch) > 0 && rr(off, x => x.ret.covered) < rr(off, x => x.ret.n) &&
    rr(mut, x => x.q.onSlip) > 0 && rr(mut, x => x.q.mismatch) > 0 && rr(off, x => x.env.mismatch) === 0 && rr(mut, x => x.env.mismatch) === 0,
    `off: Q updates on slip ticks ${rr(off, x => x.q.onSlip)} (positive ${rr(off, x => x.q.onSlipPositive)}), mismatched ${rr(off, x => x.q.mismatch)}, return moves covered ${rr(off, x => x.ret.covered)}/${rr(off, x => x.ret.n)} | ` +
    `mutant: on slip ticks ${rr(mut, x => x.q.onSlip)}, mismatched ${rr(mut, x => x.q.mismatch)}, return moves covered ${rr(mut, x => x.ret.covered)}/${rr(mut, x => x.ret.n)} | env per-tick mismatches off ${rr(off, x => x.env.mismatch)}, mutant ${rr(mut, x => x.env.mismatch)}`); }

// B — TRUST
{ const t = main.filter(r => r.arm !== 'A4');
  gate('B1', 'successes <= attempts for every key at every 100-tick snapshot and at run end', t.every(r => r.trustChecks.maxSgtA === 0),
    `keys with s>a: max ${Math.max(...t.map(r => r.trustChecks.maxSgtA))} over ${sum(t.map(r => r.trustChecks.snapshots))} snapshots`);
  gate('B2', 'trust within [0, 1]', t.every(r => r.trustChecks.maxTrust <= 1 && r.trustChecks.minTrust >= 0),
    `range [${Math.min(...t.map(r => r.trustChecks.minTrust)).toFixed(4)}, ${Math.max(...t.map(r => r.trustChecks.maxTrust)).toFixed(4)}]`);
  gate('B3', 'every trust write is a traversal outcome (store = attempts/successes reconstructed from moves, decay mirrored)', t.every(r => r.trustChecks.reconMismatchMax === 0) && sum(t.map(r => r.epCredit.applied)) === 0,
    `reconstruction mismatches ${sum(t.map(r => r.trustChecks.reconMismatchMax))}; episode credits offered ${sum(t.map(r => r.epCredit.offered))}, applied ${sum(t.map(r => r.epCredit.applied))}`);
  const off = by('antiOff').filter(r => r.arm !== 'A4');
  gate('B-AV', 'anti-vacuity: with conformance off the probe detects s>a', off.some(r => r.trustChecks.maxSgtA > 0),
    `H1R off: max keys with s>a ${Math.max(...off.map(r => r.trustChecks.maxSgtA))}`);
  const d = by('diagAttemptGated');
  G.push({ id: 'B-DIAG', name: 'diagnostic: the attempt-gated N2 variant (reconciliation text) against the s<=a invariant', status: 'INFO',
    evidence: `runs with any s>a: ${d.filter(r => r.trustChecks.maxSgtA > 0).length}/${d.length}; max keys with s>a ${Math.max(...d.map(r => r.trustChecks.maxSgtA))}; max trust ${Math.max(...d.map(r => r.trustChecks.maxTrust)).toFixed(4)}` });
}

// C — RANDOM
function uniformity(runs) {
  const agg = {};
  for (const r of runs) for (const [s, b] of Object.entries(r.sel.byState)) {
    const a = agg[s] || (agg[s] = { counts: new Array(b.nb).fill(0), other: 0 }); b.counts.forEach((c, i) => a.counts[i] += c); a.other += b.other; }
  let chi = 0, df = 0, other = 0, n = 0, expArgmax = 0;
  for (const a of Object.values(agg)) { const N = sum(a.counts); other += a.other; n += N; if (N === 0 || a.counts.length < 2) continue;
    const e = N / a.counts.length; chi += sum(a.counts.map(c => (c - e) ** 2 / e)); df += a.counts.length - 1; expArgmax += N / a.counts.length; }
  const z = (Math.cbrt(chi / df) - (1 - 2 / (9 * df))) / Math.sqrt(2 / (9 * df));
  const p = 0.5 * (1 - erf(z / Math.SQRT2));
  return { chi, df, z, p, n, other, expectedArgmaxShareIfUniform: expArgmax / n };
}
function erf(x) { const s = Math.sign(x); x = Math.abs(x); const t = 1 / (1 + 0.3275911 * x);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return s * y; }
{ const a3 = main.filter(r => r.arm === 'A3'), a1 = main.filter(r => r.arm === 'A1');
  const u3 = uniformity(a3), u1 = uniformity(a1);
  const differ = a3.filter(r => { const b = a1.find(x => x.configSeed === r.configSeed && x.configIndex === r.configIndex); return b && b.fp !== r.fp; }).length;
  gate('C1', 'RANDOM is wired: the runtime saw arm A3 and made uniform decisions in every run', a3.every(r => r.h1rCounters.uniformDecisions > 0 && r.h1rCounters.armsSeen.join() === 'A3'),
    `uniform decisions ${sum(a3.map(r => r.h1rCounters.uniformDecisions))} over ${a3.length} runs; arms seen ${[...new Set(a3.flatMap(r => r.h1rCounters.armsSeen))]}`);
  gate('C2', 'RANDOM behaves differently from BELIEF (fingerprint) on every configuration', differ === a3.length, `${differ}/${a3.length}`);
  gate('C3', 'RANDOM choices are uniform over graph neighbours (pooled chi-square p > 0.001) while BELIEF is not (p < 1e-6)', u3.p > 0.001 && u1.p < 1e-6 && u3.other === 0,
    `A3: chi2=${u3.chi.toFixed(1)} df=${u3.df} p=${u3.p.toExponential(2)} n=${u3.n} non-neighbour picks ${u3.other}; argmax share ${(sum(a3.map(r => r.sel.chosenArgmax)) / u3.n).toFixed(3)} vs ${u3.expectedArgmaxShareIfUniform.toFixed(3)} expected if uniform | ` +
    `A1: chi2=${u1.chi.toFixed(1)} df=${u1.df} p=${u1.p.toExponential(2)}; argmax share ${(sum(a1.map(r => r.sel.chosenArgmax)) / u1.n).toFixed(3)}`);
  G.push({ id: 'C-INFO', name: 'decision ticks that commit no action (no admissible candidate), share of decision ticks', status: 'INFO',
    evidence: ARMS.map(a => { const rs = main.filter(r => r.arm === a); const nc = sum(rs.map(r => r.noCommitDecisionTicks)); const dt = sum(rs.map(r => r.ticksSeen - r.replayTicks));
      return `${a} ${(100 * nc / dt).toFixed(2)}%`; }).join(', ') });
  const off3 = by('antiOff').filter(r => r.arm === 'A3'), off1 = by('antiOff').filter(r => r.arm === 'A1');
  gate('C-AV', 'anti-vacuity: without the H1R runtime A3 is byte-identical to A1 (the historical defect)', off3.every(r => { const b = off1.find(x => x.configSeed === r.configSeed && x.configIndex === r.configIndex); return b && b.fp === r.fp; }),
    `${off3.length} configurations`);
}

// D — FROZEN
{ const a4 = main.filter(r => r.arm === 'A4'), a1 = main.filter(r => r.arm === 'A1');
  gate('D1', 'FROZEN: Q table unchanged from tick 0 to tick 3000', a4.every(r => r.qDelta.changed === 0 && r.qDelta.keys1 === r.qDelta.keys0),
    `changed keys ${sum(a4.map(r => r.qDelta.changed))}, max |delta| ${Math.max(...a4.map(r => r.qDelta.maxAbs))}, entries at end ${sum(a4.map(r => r.qDelta.keys1))}`);
  gate('D2', 'FROZEN: trust store (attempts and successes) unchanged from tick 0 to tick 3000', a4.every(r => r.trustDeltaA.changed === 0 && r.trustDeltaS.changed === 0),
    `attempt keys changed ${sum(a4.map(r => r.trustDeltaA.changed))}, success keys changed ${sum(a4.map(r => r.trustDeltaS.changed))}`);
  gate('D3', 'FROZEN still executes its policy (decisions made, trust read at E3)', a4.every(r => r.sel.n > 0 && r.e3.n > 0 && r.e3.pass === r.e3.n),
    `decisions ${sum(a4.map(r => r.sel.n))}, E3 reads ${sum(a4.map(r => r.e3.n))} (passthrough ${sum(a4.map(r => r.e3.pass))})`);
  gate('D-AV', 'anti-vacuity: BELIEF changes Q and trust over the same interval', a1.every(r => r.qDelta.changed > 0 && r.trustDeltaA.changed > 0),
    `A1 Q keys changed ${sum(a1.map(r => r.qDelta.changed))}, trust attempt keys changed ${sum(a1.map(r => r.trustDeltaA.changed))}`); }

// E — P4
{ gate('E1', 'zero post-reset actions from pre-reset reasoning', main.every(r => r.stalePostResetMoves === 0 && r.goals.stalePostReset === 0),
    `stale post-reset moves ${sum(main.map(r => r.stalePostResetMoves))}, stale post-reset goal reaches ${sum(main.map(r => r.goals.stalePostReset))}; resets ${sum(main.map(r => r.h1rCounters.resets.goal + r.h1rCounters.resets.cap))}`);
  gate('E2', 'zero stale goal reaches of any kind', main.every(r => r.goals.stale === 0), `stale goal reaches ${sum(main.map(r => r.goals.stale))}`);
  const off = by('antiOff');
  gate('E-AV', 'anti-vacuity: with conformance off, stale post-reset goal reaches are detected', sum(off.map(r => r.goals.stalePostReset)) > 0,
    `H1R off: ${sum(off.map(r => r.goals.stalePostReset))} stale post-reset goal reaches`); }

// F — GOAL REWARD
{ gate('F1', 'every goal reach reaches exactly one main Q update with reward exactly +12', main.every(r => r.q.goalN === r.goals.n && r.q.goalNot12 === 0) && sum(main.map(r => r.goals.n)) > 0,
    `goal events ${sum(main.map(r => r.goals.n))} (pooled over all arms), goal Q updates ${sum(main.map(r => r.q.goalN))}, reward != 12: ${sum(main.map(r => r.q.goalNot12))}`);
  gate('F2', 'eligibility rate is identically 1 in every run (no input through which p_e or history could act)', main.every(r => r.q.goalNot12 === 0 && r.goals.n > 0),
    `${main.length} runs; runs with no goal reach: ${main.filter(r => r.goals.n === 0).length}; runs with a goal reward != 12: ${main.filter(r => r.q.goalNot12 > 0).length}`);
  // F2' — the same property specified per frozen §9.4 ("Agent never reaches goal in a run: Included.
  // That is signal, not failure"): the eligibility rate is exactly 1 in every run in which it is defined.
  { const defined = main.filter(r => r.goals.n > 0), none = main.filter(r => r.goals.n === 0);
    gate("F2'", 'eligibility rate is exactly 1 in every run where it is defined (frozen §9.4: a run without a goal reach is included, not a failure)',
      defined.every(r => r.q.goalNot12 === 0 && r.q.goalN === r.goals.n) && defined.length > 0 && sum(defined.map(r => r.goals.n)) > 0,
      `${defined.length} runs with goal reaches, eligibility rate exactly 1 in all; ${none.length} runs without a goal reach (rate undefined; included per §9.4)`); }
  const off = by('antiOff'), mut = by('mutantGoal');
  gate('F-AV', 'anti-vacuity: legacy rule (conformance off) and a mutant with the GOAL edit reverted both pay != 12',
    sum(off.map(r => r.q.goalNot12)) > 0 && sum(mut.map(r => r.q.goalNot12)) > 0,
    `H1R off: ${sum(off.map(r => r.q.goalNot12))} goal rewards != 12; mutant: ${sum(mut.map(r => r.q.goalNot12))}`); }

// G — G15' (structural)
{ const L = fs.readFileSync(path.join(C.dir, 'main.js'), 'utf8').split('\n');
  const gi = L.map((l, i) => l.includes('// H1R GOAL') ? i : -1).filter(i => i >= 0);
  const nextCode = gi.length === 1 ? L.slice(gi[0] + 1).find(l => l.trim() !== '' && !l.trim().startsWith('//')) : null;
  const anchor = L.findIndex(l => l.includes('if (next === goalNeuronId) {'));
  gate("G15'-S", 'structural: the goal branch pays 12 whenever H1R is on — the eligibility operand cannot be false',
    gi.length === 1 && nextCode && nextCode.trim() === 'rewardSignal = 12;' && gi[0] > anchor && gi[0] - anchor < 4 && L[gi[0]].includes('|| (globalThis.__H1R__ && globalThis.__H1R__.on)'),
    `GOAL edit at main.js:${gi[0] + 1} inside the goal branch opened at :${anchor + 1}; next statement '${nextCode && nextCode.trim()}'`);
  const fpass = G.filter(g => ['F1', 'F2', 'F-AV'].includes(g.id)).every(g => g.status === 'PASS');
  gate("G15'", "G15' = structural + dynamic (F1, F2) + anti-vacuity (F-AV)", fpass && G.find(g => g.id === "G15'-S").status === 'PASS', 'see G15\'-S, F1, F2, F-AV');
  const fpass2 = G.filter(g => ['F1', "F2'", 'F-AV'].includes(g.id)).every(g => g.status === 'PASS');
  gate("G15'(9.4)", "G15' with F2 specified per frozen §9.4 = structural + dynamic (F1, F2') + anti-vacuity (F-AV)", fpass2 && G.find(g => g.id === "G15'-S").status === 'PASS', "see G15'-S, F1, F2', F-AV"); }

// S — STATIC CORRECTNESS (source of the conformed tree)
{ const M = fs.readFileSync(path.join(C.dir, 'main.js'), 'utf8'), ML = M.split('\n');
  const EM = fs.readFileSync(path.join(C.dir, 'render', 'episodeManager.js'), 'utf8');
  const QL = fs.readFileSync(path.join(C.dir, 'render', 'qlearning.js'), 'utf8');
  const cnt = (s, re) => (s.match(re) || []).length;
  { const at = (re) => ML.findIndex(l => re.test(l));
    const iDraw = at(/H1R R1-DRAW-EARLY/), iView = at(/H1R R1-VIEW/), iGuard = at(/^    agentLast !== goalNeuronId$/), iLearn = at(/^  let rewardSignal = 0;$/),
          iRestore = at(/H1R R1-RESTORE/), iSync = at(/^agentLast = agentCurrent;\s+\/\/ 👉 store current/), iE1 = at(/H1R R1-DRAW: reuse/);
    gate('S1', 'R1: one early draw, the realised view, the restore and the E1 reuse, in causal order; Q-KEY edits gone; original learning calls intact',
      cnt(M, /H1R R1-DRAW-EARLY/g) === 1 && cnt(M, /H1R R1-VIEW/g) === 1 && cnt(M, /H1R R1-RESTORE/g) === 1 && cnt(M, /H1R R1-DRAW: reuse/g) === 1 &&
      cnt(M, /Q-KEY/g) === 0 && cnt(M, /__M7_ENV__\.attempt\(/g) === 1 && cnt(M, /_m7env\.attempt\(_m7From, _m7To\)/g) === 1 &&
      cnt(M, /^\s+updateQ\(\{\s*$/gm) === 2 && cnt(M, /^    recordAutonomousStep\(prev, current, neuronMap, goalNeuronId\);   \/\/ D1$/gm) === 1 &&
      cnt(M, /^  recordAutonomousSuccess\(recentMemory, current, neuronMap, \{$/gm) === 1 &&
      iDraw >= 0 && iDraw < iView && iView < iGuard && iGuard < iLearn && iLearn < iRestore && iRestore === iSync - 1 && iSync < iE1,
      `lines: draw ${iDraw + 1} < view ${iView + 1} < guard ${iGuard + 1} < section ${iLearn + 1} < restore ${iRestore + 1} < sync ${iSync + 1} < E1 reuse ${iE1 + 1}; original updateQ sites 2, D1 1, success 1; Q-KEY 0`); }
  gate('S2', 'CRG: exactly the three 0f47d7b backtracking releases, guarded, inside canReachGoal',
    cnt(M, /H1R CRG \(0f47d7b\)/g) === 3 && cnt(M, /visited\.delete\(currentId\)/g) === 3, `guarded releases ${cnt(M, /visited\.delete\(currentId\)/g)}`);
  gate('S3', 'N2: the episode success writer is suppressed only under M7 credit; trust math untouched',
    cnt(EM, /globalThis\.__M7_CREDIT__ && !globalThis\.__H1R__\.episodeCreditAllowed\(key\)/g) === 1 && cnt(QL, /\/\/ H1R/g) === 1,
    'one guarded writer; qlearning.js carries only the FROZEN choke point');
  gate('S4', 'N1/A3/A4/P4/GOAL edits present exactly once each',
    cnt(M, /H1R N1-MASK:/g) === 1 && cnt(M, /H1R N1-MASK-SEM/g) === 1 && cnt(M, /H1R N1-GUARD/g) === 1 && cnt(M, /H1R A3 RANDOM/g) === 1 &&
    cnt(M, /H1R A4-Q/g) === 1 && cnt(M, /H1R A4-T/g) === 2 && cnt(M, /H1R P4/g) === 2 && cnt(M, /H1R GOAL/g) === 1 && cnt(EM, /H1R N1-SEAL/g) === 1, 'all present');
  // execute the conformed canReachGoal itself over the whole 20 x 4 domain, H1R on and off
  const s = ML.findIndex(l => l.startsWith('function canReachGoal('));
  const e = ML.findIndex((l, i) => i > s && l === '}');
  const src = ML.slice(s, e + 1).join('\n');
  const E = JSON.parse(fs.readFileSync(path.join(C.dir, 'connections.json'), 'utf8'));
  const NS = JSON.parse(fs.readFileSync(path.join(C.dir, 'neurons.json'), 'utf8')).map(n => Number(n.id));
  const nb = new Map(NS.map(n => [n, []])); for (const c of E) { nb.get(Number(c.from)).push(Number(c.to)); nb.get(Number(c.to)).push(Number(c.from)); }
  const crg = new Function('findNeuronById', src + '\nreturn canReachGoal;')((id) => nb.has(Number(id)) ? { userData: { neighbors: nb.get(Number(id)) } } : null);
  const dist = (a, g) => { const d = new Map([[a, 0]]), q = [a]; while (q.length) { const x = q.shift(); for (const y of nb.get(x)) if (!d.has(y)) { d.set(y, d.get(x) + 1); q.push(y); } } return d.get(g); };
  const evalDomain = (on) => { const saved = globalThis.__H1R__; globalThis.__H1R__ = on ? { on: true } : undefined;
    let fn = 0, fp = 0; const traps = [];
    for (const g of [8, 12, 16, 19]) for (const st of NS) { const truth = dist(st, g) <= 3; const got = crg(st, g); if (truth && !got) fn++; if (!truth && got) fp++; }
    for (const g of [8, 12, 16, 19]) for (const u of NS) { if (u === g) continue; if (nb.get(u).every(k => !crg(k, g))) traps.push(`${u}/goal ${g}`); }
    globalThis.__H1R__ = saved; return { fn, fp, traps }; };
  const off = evalDomain(false), on = evalDomain(true);
  gate('S5', 'conformed canReachGoal: 0 false negatives, 0 false positives, 0 trap states over 20 x 4 (H1R on); B2 defect reproduced with H1R off',
    on.fn === 0 && on.fp === 0 && on.traps.length === 0 && off.fn > 0 && off.traps.includes('3/goal 16'),
    `on: FN ${on.fn}, FP ${on.fp}, traps ${on.traps.length} | off (B2): FN ${off.fn}, FP ${off.fp}, traps ${off.traps.join(', ') || 'none'}`); }

// T — TRAP DYNAMICS (pre-declared: for every arm, every goal's no-commit share of decision ticks <= 5%)
{ const GOALS = [8, 12, 16, 19];
  const tab = (runs) => Object.fromEntries(ARMS.map(a => [a, GOALS.map(g => { const rs = runs.filter(r => r.arm === a && GOALS[r.configIndex % 4] === g);
    const nc = sum(rs.map(r => r.noCommitDecisionTicks)), dt = sum(rs.map(r => r.ticksSeen - r.replayTicks)); return dt ? nc / dt : NaN; })]));
  const after = tab(main);
  let beforeTxt = 'previous tree not available';
  const prevFile = path.join(HERE, 'evidence_final', 'runs.json');
  if (fs.existsSync(prevFile)) { const prev = JSON.parse(fs.readFileSync(prevFile, 'utf8')).filter(r => r.set === 'main' && !r.error); const b = tab(prev);
    beforeTxt = ARMS.map(a => `${a} ${b[a].map(x => (100 * x).toFixed(1)).join('/')}`).join(' | '); }
  const worst = Math.max(...ARMS.flatMap(a => after[a]));
  gate('T1', 'no decision trap: per arm, per goal, no-commit share of decision ticks <= 5%', worst <= 0.05,
    `AFTER (goal 8/12/16/19, %): ${ARMS.map(a => `${a} ${after[a].map(x => (100 * x).toFixed(1)).join('/')}`).join(' | ')} || BEFORE (84b4197b tree): ${beforeTxt}`); }

// P — ARM DISTINCTNESS (mechanism wiring only — fingerprints, no outcome metric)
{ const pairs = []; for (let i = 0; i < ARMS.length; i++) for (let j = i + 1; j < ARMS.length; j++) pairs.push([ARMS[i], ARMS[j]]);
  let ok = 0, tot = 0; const bad = [];
  for (const [x, y] of pairs) for (const s of SAMPLES) { const a = main.find(r => r.arm === x && r.configSeed === s.configSeed && r.configIndex === s.configIndex);
    const b = main.find(r => r.arm === y && r.configSeed === s.configSeed && r.configIndex === s.configIndex); tot++; if (a && b && a.fp !== b.fp) ok++; else bad.push(`${x}/${y}@${s.configSeed}/${s.configIndex}`); }
  gate('P1', 'all seven arms are pairwise behaviourally distinct on every configuration (21 pairs x 41)', ok === tot, `${ok}/${tot} distinct${bad.length ? '; identical: ' + bad.slice(0, 5).join(', ') : ''}`);
  const four = ['A1', 'A2', 'A3', 'A4']; let ok4 = 0, tot4 = 0;
  for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) for (const s of SAMPLES) {
    const a = main.find(r => r.arm === four[i] && r.configSeed === s.configSeed && r.configIndex === s.configIndex);
    const b = main.find(r => r.arm === four[j] && r.configSeed === s.configSeed && r.configIndex === s.configIndex); tot4++; if (a && b && a.fp !== b.fp) ok4++; }
  gate('P2', 'BELIEF, ABLATION, RANDOM, FROZEN pairwise distinct on every configuration (6 pairs x 41; the Phase-8 requirement)', ok4 === tot4, `${ok4}/${tot4} distinct`);
  // P3 — wiring: every manipulated arm's manipulation reaches decisions, i.e. it differs from BELIEF.
  let ok5 = 0, tot5 = 0; const per = {};
  for (const x of ARMS.slice(1)) { per[x] = 0; for (const s of SAMPLES) {
    const a = main.find(r => r.arm === 'A1' && r.configSeed === s.configSeed && r.configIndex === s.configIndex);
    const b = main.find(r => r.arm === x && r.configSeed === s.configSeed && r.configIndex === s.configIndex); tot5++; if (a && b && a.fp !== b.fp) { ok5++; per[x]++; } } }
  gate('P3', 'every manipulated arm (A2..A7) differs from BELIEF on every configuration (6 x 41)', ok5 === tot5,
    `${ok5}/${tot5} distinct (${Object.entries(per).map(([a, n]) => `${a} ${n}/${SAMPLES.length}`).join(', ')})`); }

// H — DETERMINISM
{ const a = by('onNoRecord'), b = by('onNoRecord2');
  const rep = a.filter(x => { const y = b.find(z => key(z) === key(x)); return y && y.fp === x.fp && y.cog === x.cog; }).length;
  const neutral = a.filter(x => { const y = main.find(z => key(z) === key(x)); return y && y.fp === x.fp && y.cog === x.cog; }).length;
  gate('H1', 'conformed runs are deterministic (two independent processes, identical fingerprint)', rep === a.length && a.length === SUB.length * 7, `${rep}/${a.length}`);
  gate('H2', 'the verification recorder is observationally neutral (record vs no-record fingerprint)', neutral === a.length, `${neutral}/${a.length}`); }

const summary = { generatedBy: 'experiments/h1r/verify_conformance.mjs', conformedTree: shown(C.dir), manifest: C.manifest.transformed,
  transformSha256: C.manifest.transformSha256, runs: R.length, errors: errs.length, seconds: Math.round((Date.now() - t0) / 1000), gates: G };
fs.writeFileSync(path.join(EVID, 'conformance_gates.json'), JSON.stringify(summary, null, 1));
for (const g of G) console.log(`${g.status.padEnd(8)} ${g.id.padEnd(7)} ${g.name}\n         ${g.evidence}`);
for (const e of errs.slice(0, 3)) console.log('ERROR', e.set, e.configSeed, e.configIndex, e.arm, e.error.slice(-800));
const hard = G.filter(g => g.status === 'FAIL').length, conflicts = G.filter(g => g.status === 'CONFLICT').length;
console.log(`\n${G.filter(g => g.status === 'PASS').length} PASS, ${hard} FAIL, ${conflicts} CONFLICT, ${G.filter(g => g.status === 'INFO').length} INFO — ${summary.seconds} s`);
process.exitCode = hard ? 1 : 0;
