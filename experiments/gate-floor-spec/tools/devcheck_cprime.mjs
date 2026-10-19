// development tooling (NOT a study run): the design C' cells and both training regimes on XFER-1 development worlds 0..N-1 with the DRIVER OF RECORD
// (experiments/gate-floor-spec/session.mjs, diagnostic on).  Two purposes:
//   1. fidelity: every world's U/G store statistics and every C' cell's legal / non-graph / total resets and guard counters must equal the earlier
//      development calibration (evidence/calibration6_rows.json, produced by the generated tools/session_d2.mjs) - same seeds, same semantics;
//   2. evidence: the stale-reasoning diagnostic per cell and the recording-audit attribution of every non-graph pair in the U and G stores.
//   node devcheck_cprime.mjs <outdir> [N=30] [workers=8]
import fs from 'node:fs'; import path from 'node:path'; import { spawn } from 'node:child_process';
import { fileURLToPath as _f2p, pathToFileURL } from 'node:url';
import { resolve as _resolve } from 'node:path';
const REPO = _resolve(_f2p(new URL('../../../', import.meta.url))).split(String.fromCharCode(92)).join('/');   // repository root (forward slashes)
const U = (p) => pathToFileURL(`${REPO}/${p}`).href;
const { generateAcceptedStream } = await import(U('experiments/m7/env.js')); const X1 = await import(U('experiments/xfer1/config.mjs'));
const { buildGuardTree } = await import(U('experiments/gate-floor-interaction/transform.mjs'));
const { mean, pairedSummary } = await import(U('experiments/xfer1/stats.mjs'));
const { ratioCi } = await import(U('experiments/gate-floor-spec/diag.mjs'));
const C = await import(U('experiments/gate-floor-spec/config.mjs'));
const SESS = `${REPO}/experiments/gate-floor-spec/session.mjs`;
const TREE = buildGuardTree().dir;
const out = process.argv[2], N = Number(process.argv[3] || 30), WK = Number(process.argv[4] || 8);
if (!out) { console.error('usage: node devcheck_cprime.mjs <outdir> [N] [workers]'); process.exit(2); }
fs.mkdirSync(path.join(out, 'brains'), { recursive: true });
const stream = generateAcceptedStream(X1.CONFIG_START, N);
const run = (input) => new Promise(res => { const c = spawn(process.execPath, [SESS, JSON.stringify(input)], { stdio: ['ignore', 'pipe', 'pipe'] }); let so = '', se = ''; c.stdout.on('data', d => so += d); c.stderr.on('data', d => se += d);
  c.on('close', code => { const m = so.match(/@@RESULT@@(.*)@@END@@/s); let rec = null; try { rec = m ? JSON.parse(m[1]) : null; } catch { rec = null; } res({ code, rec, se: se.slice(-300) }); }); });
async function pool(tasks, n) { let k = 0; const r = new Array(tasks.length); await Promise.all(Array.from({ length: n }, async () => { for (;;) { const i = k++; if (i >= tasks.length) return; r[i] = await tasks[i](); } })); return r; }
const base = (w) => ({ tree: TREE, world: w, configSeed: stream[w].acceptedSeed, configIndex: stream[w].acceptedConfigIndex, cond: 'P', instrument: true, diag: true });
const ws = Array.from({ length: N }, (_, w) => w);
const tj = ws.flatMap(w => C.TRAININGS.map(t => ({ w, t })));
const trains = await pool(tj.map(j => () => run({ ...base(j.w), role: 'train', label: `dev-train${j.t.id}-w${j.w}`, agentSeed: X1.trainSeed(j.w), ticks: 1500, floor: 'off', guard: j.t.guard,
  exportPath: path.join(out, 'brains', `${j.t.id}_w${j.w}.json`) })), WK);
const rows = {}, failures = [];
tj.forEach((j, i) => { const r = trains[i]; if (r.code !== 0 || !r.rec) { failures.push(`train ${j.t.id} w${j.w}: ${r.se}`); return; }
  const own = JSON.parse(fs.readFileSync(path.join(out, 'brains', `${j.t.id}_w${j.w}.json`), 'utf8')).episodes;
  fs.writeFileSync(path.join(out, 'brains', `store${j.t.id}_w${j.w}.json`), JSON.stringify({ episodes: own }));
  (rows[j.w] ||= { goal: stream[j.w].goal, train: {}, cells: {} }).train[j.t.id] = { legal: r.rec.reaches.legal, nonGraph: r.rec.reaches.nonEdge, store: r.rec.store, diag: { channels: r.rec.diag.channels, accountingOk: r.rec.diag.accounting.ok, recording: r.rec.diag.recording, illegalExecuted: r.rec.diag.illegalExecuted, blocked: r.rec.diag.blocked },
    completeness: r.rec.guardCompleteness.ok, integrity: r.rec.conditionIntegrity.ok }; });
const cj = ws.flatMap(w => C.CELLS.map(c => ({ w, c }))).filter(j => rows[j.w] && rows[j.w].train[j.c.store]);
const tests = await pool(cj.map(j => () => run({ ...base(j.w), role: 'test', label: `dev-${j.c.name}-w${j.w}`, agentSeed: X1.testSeed(j.w), ticks: 1500, arm: 'ONLY_episodes', floor: 'on', guard: j.c.guard,
  brainPath: path.join(out, 'brains', `store${j.c.store}_w${j.w}.json`), brainWorld: j.w })), WK);
cj.forEach((j, i) => { const r = tests[i]; if (r.code !== 0 || !r.rec) { failures.push(`${j.c.name} w${j.w}: ${r.se}`); return; } const d = r.rec.diag;
  rows[j.w].cells[j.c.name] = { legal: r.rec.reaches.legal, nonEdge: r.rec.reaches.nonEdge, all: r.rec.reaches.goal, maskedOut: r.rec.guard.counters.maskedOut, blockedIllegal: r.rec.guard.counters.blockedIllegal,
    channels: d.channels, legalByClass: d.resets.legal, arrivals: Object.fromEntries(Object.entries(d.arrivals.byClass).map(([k, v]) => [k, v])), illegalExecuted: d.illegalExecuted, blocked: d.blocked,
    accountingOk: d.accounting.ok, completeness: r.rec.guardCompleteness.ok, integrity: r.rec.conditionIntegrity.ok, calls: r.rec.counters.calls }; });
fs.writeFileSync(path.join(out, 'devcheck_rows.json'), JSON.stringify({ n: N, rows, failures }));

// ---- 1. fidelity against the earlier development calibration ----
const calib = JSON.parse(fs.readFileSync(`${REPO}/experiments/gate-floor-spec/evidence/calibration6_rows.json`, 'utf8'));
const mism = [];
for (const w of ws) {
  const a = rows[w], b = calib.rows[w]; if (!a || !b) { mism.push(`w${w}: missing`); continue; }
  for (const k of ['U', 'G']) { const s = a.train[k], t = b.store[k]; if (!s) { mism.push(`w${w} ${k}: no training`); continue; }
    for (const [x, y] of [['episodes', 'episodes'], ['pairs', 'pairs'], ['nonGraphPairs', 'nonGraphPairs'], ['terminalNonGraph', 'terminalNonGraph']]) if (s.store[x] !== t[y]) mism.push(`w${w} ${k} store ${x} ${s.store[x]} != ${t[y]}`);
    if (s.legal !== t.trainLegal || s.nonGraph !== t.trainNonGraph) mism.push(`w${w} ${k} training reaches differ`); }
  for (const c of C.CELL_NAMES) { const s = a.cells[c], t = b.cells[c]; if (!s || !t) { mism.push(`w${w} ${c}: missing`); continue; }
    for (const x of ['legal', 'nonEdge', 'all']) if (s[x] !== t[x]) mism.push(`w${w} ${c} ${x} ${s[x]} != ${t[x]}`);
    if (s.maskedOut !== t.guard.maskedOut || s.blockedIllegal !== t.guard.blockedIllegal) mism.push(`w${w} ${c} guard counters differ`); }
}

// ---- 2. evidence: the stale diagnostic and the store attribution ----
const W = ws.filter(w => rows[w] && C.CELL_NAMES.every(c => rows[w].cells[c]));
const cellMean = (c, f) => mean(W.map(w => f(rows[w].cells[c])));
const per = {};
for (const c of C.CELL_NAMES) per[c] = { legal: cellMean(c, x => x.legal), nonGraph: cellMean(c, x => x.nonEdge), stale: cellMean(c, x => x.channels.stale), decision: cellMean(c, x => x.channels.decision),
  decisionCarried: cellMean(c, x => x.channels.decisionCarried), unclassified: cellMean(c, x => x.channels.unclassified), legalFromStale: cellMean(c, x => x.legalByClass.STALE),
  staleArrivals: cellMean(c, x => x.arrivals.STALE.n), staleIllegal: cellMean(c, x => x.arrivals.STALE.illegal), freshArrivals: cellMean(c, x => x.arrivals.FRESH.n), carriedArrivals: cellMean(c, x => x.arrivals.CARRIED.n),
  freshIllegal: cellMean(c, x => x.arrivals.FRESH.illegal), illegalExecuted: cellMean(c, x => x.illegalExecuted), blocked: cellMean(c, x => x.blocked), blockedStale: cellMean(c, x => x.arrivals.STALE.blocked) };
const B = C.BOOT_95;
const x1 = ratioCi(W.map(w => rows[w].cells.U_mask.channels.stale), W.map(w => rows[w].cells.U_mask.nonEdge), B);
const x3 = ratioCi(W.map(w => rows[w].cells.U_both.arrivals.STALE.blocked), W.map(w => rows[w].cells.U_both.blocked), B);
const xuNum = W.map(w => ['U_off', 'U_mask'].reduce((s, c) => s + rows[w].cells[c].channels.unclassified, 0)), xuDen = W.map(w => ['U_off', 'U_mask'].reduce((s, c) => s + rows[w].cells[c].nonEdge, 0));
const xu = ratioCi(xuNum, xuDen, B);
const stores = {};
for (const k of ['U', 'G']) { const S = W.map(w => rows[w].train[k]);
  stores[k] = { episodes: mean(S.map(s => s.store.episodes)), pairs: mean(S.map(s => s.store.pairs)), nonGraphPairs: mean(S.map(s => s.store.nonGraphPairs)), nonGraphShare: mean(S.map(s => s.store.nonGraphShare)),
    terminalNonGraph: mean(S.map(s => s.store.terminalNonGraph)), twoHopConsistent: mean(S.map(s => s.store.twoHopConsistent)),
    attribution: { EXECUTED: mean(S.map(s => s.store.attribution.EXECUTED)), SKIP: mean(S.map(s => s.store.attribution.SKIP)), UNRECORDED: mean(S.map(s => s.store.attribution.UNRECORDED)) },
    worldsWithExecutedNonGraphPair: S.filter(s => s.store.attribution.EXECUTED > 0).length, worldsWithUnrecordedPair: S.filter(s => s.store.attribution.UNRECORDED > 0).length,
    trainingNonGraphResets: mean(S.map(s => s.nonGraph)), trainingIllegalExecuted: mean(S.map(s => s.diag.illegalExecuted)), trainingBlocked: mean(S.map(s => s.diag.blocked)),
    recordingSkipAppended: mean(S.map(s => s.diag.recording.appended.SKIP + s.diag.recording.goalPairs.SKIP)), recordingInconsistent: S.reduce((a, s) => a + s.diag.recording.inconsistent, 0) }; }
const allOk = W.every(w => C.CELL_NAMES.every(c => rows[w].cells[c].accountingOk && rows[w].cells[c].completeness && rows[w].cells[c].integrity) && ['U', 'G'].every(k => rows[w].train[k].diag.accountingOk && rows[w].train[k].completeness && rows[w].train[k].integrity));
const contrasts = { PS1_scope: pairedSummary(W.map(w => rows[w].cells.G_both.legal - rows[w].cells.U_both.legal), B), PS2_package: pairedSummary(W.map(w => rows[w].cells.G_both.legal - rows[w].cells.U_off.legal), B),
  PS3_execIncrement: pairedSummary(W.map(w => rows[w].cells.U_both.legal - rows[w].cells.U_mask.legal), B), D2_retrofit: pairedSummary(W.map(w => rows[w].cells.U_both.legal - rows[w].cells.U_off.legal), B),
  M0_maskWithoutExec: pairedSummary(W.map(w => rows[w].cells.U_mask.legal - rows[w].cells.U_off.legal), B) };
const summary = { status: 'DEVELOPMENT (XFER-1 worlds, not study worlds; design input only)', driver: 'experiments/gate-floor-spec/session.mjs (diag on)', worlds: W.length, failures: failures.length,
  fidelity: { comparedTo: 'evidence/calibration6_rows.json', mismatches: mism.length, firstMismatches: mism.slice(0, 10) }, allAccountingCompletenessIntegrityOk: allOk,
  cells: per, stale: { X1_maskOnlyStaleShare: x1, X3_bundleBlockedStaleShare: x3, XU_unclassifiedShare: xu, reading: C.classifyStale({ x1, x3: x3.share, xu: xu.share, maskResets: per.U_mask.nonGraph, integrityOk: allOk }) },
  stores, contrasts };
fs.writeFileSync(path.join(out, 'devcheck_summary.json'), JSON.stringify(summary, null, 1));
console.log(JSON.stringify({ worlds: W.length, failures: failures.length, mismatches: mism.length, allOk, stale: summary.stale.reading, X1: x1, X3: x3, XU: xu }, null, 0));
console.log(JSON.stringify(stores));
for (const c of C.CELL_NAMES) console.log(c, JSON.stringify(per[c]));
