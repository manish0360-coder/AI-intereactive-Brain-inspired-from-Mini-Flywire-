// ==========================================================
// LEARN-0 — verify the committed block-L results record (runs NO session; needs no raw data)
// ==========================================================
//   node experiments/learn0/verify_results_learn0.mjs
// The design gate (verify_learn0.mjs) and the freeze verifier (verify_freeze_learn0.mjs) are frozen files.  The freeze verifier
// certifies the PRE-RUN state, so after execution its "nothing executed" checks (F2 exact file set, F7 no results) fail by design.
// This post-run verifier (modelled on the results section the GATE-FLOOR-INTERACTION gate gained in 43cfd19) checks:
//   V1  results/manifest_blockL.json: digest recomputes, block L, frozen design and decision digests, 2,160 sessions, 0 exclusions
//   V2  results/sessions_blockL.json: one row per manifest entry with the manifest's sha256, 0 violations, totals recompute, every row
//       runs its frozen configuration seed and agent seed (blockL_worlds.json)
//   V3  every number in results/summary_blockL.json recomputes EXACTLY from the rows (the frozen analysis' per-world rule, bootstrap
//       settings and decision rule): primary, sensitivity, secondaries, by-goal, cell means, interval count, verdict
//   V4  the frozen package is intact: every FREEZE.json pin (line-ending independent), the digests, the preregistration
//   V5  results/archive_blockL.json agrees with the committed manifest
//   V6  the transcripts: the verbatim gate-3 transcript is intact and the filtered copy is exactly it minus the progress lines
//   V7  results/RESULTS.md states the frozen primary result and label
// ==========================================================
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as C from './config.mjs';
import { pairedSummary, mean } from '../xfer1/stats.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const R = path.join(HERE, 'results');
let passed = 0, failed = 0; const fails = [];
const check = (id, cond, detail = '') => { if (cond) passed++; else { failed++; fails.push(id + ' ' + detail); } console.log((cond ? 'PASS ' : 'FAIL ') + id + (cond || !detail ? '' : ' :: ' + String(detail).slice(0, 300))); };
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const lf = (b) => { const o = Buffer.allocUnsafe(b.length); let n = 0; for (let i = 0; i < b.length; i++) { if (b[i] === 13 && b[i + 1] === 10) continue; o[n++] = b[i]; } return o.subarray(0, n); };
const rd = (f) => JSON.parse(fs.readFileSync(path.join(R, f), 'utf8'));
const J = (o) => JSON.stringify(o);
const M = rd('manifest_blockL.json'), X = rd('sessions_blockL.json'), S = rd('summary_blockL.json'), REC = rd('archive_blockL.json');
const F = JSON.parse(fs.readFileSync(path.join(HERE, 'FREEZE.json'), 'utf8')), B = JSON.parse(fs.readFileSync(path.join(HERE, 'blockL_worlds.json'), 'utf8'));

// V1
{ const { digest, ...rest } = M;
  check('V1.manifest-digest-block-L-frozen-design', C.hashObject(rest) === digest && digest === S.manifestDigest && M.block === 'L' && M.selftest === false && M.exclusions === 0
    && M.designDigest === F.designDigest && M.decisionDigest === F.decisionDigest && Object.keys(M.sessions).length === 2160 && M.tree.mainSha256 === F.substrate.learn0MainSha256); }
// V2
{ const rows = X.rows, byFile = new Map(rows.map(r => [r.file, r]));
  const bad = Object.entries(M.sessions).filter(([f, h]) => !byFile.has(f) || byFile.get(f).sha256 !== h);
  check('V2.one-row-per-manifest-entry-with-its-sha256', rows.length === 2160 && byFile.size === 2160 && bad.length === 0 && X.manifestDigest === M.digest, bad.slice(0, 3).map(([f]) => f).join(','));
  const sum = (f) => rows.reduce((s, r) => s + (f(r) || 0), 0);
  check('V2.zero-violations-and-integrity-totals', X.violations === 0 && rows.every(r => r.integrityOk && r.oracleOk && r.attemptSuccess === null && r.condition === 'P')
    && X.totals.traversalAttempts === sum(r => r.traversalAttempts) && X.totals.traversalSuccesses === X.totals.traversalAttempts && sum(r => r.envDraws) === 0 && sum(r => r.creditKeys) === 0 && sum(r => r.peCalls) === 0
    && X.totals.mapOffSessions === 1800 && sum(r => (r.map === 'off' ? r.oracleExecuted : 0)) === 0 && rows.filter(r => r.map === 'off').every(r => r.oracleGuardsReached === 4) && X.totals.mapOnSessions === 360);
  const W = new Map(B.worlds.map(w => [w.world, w]));
  const seedBad = rows.filter(r => { const w = W.get(r.world); return !w || r.configSeed !== w.acceptedSeed || r.goal !== w.goal || r.agentSeed !== (r.role === 'train' ? C.trainSeed(r.world) : C.testSeed(r.world)); });
  check('V2.every-row-runs-its-frozen-configuration-and-seed', seedBad.length === 0 && C.CELL_NAMES.every(c => rows.filter(r => r.cell === c).length === 360) && rows.filter(r => r.role === 'train').length === 360, seedBad.slice(0, 3).map(r => r.file).join(','));
}
// V3 — the frozen analysis' per-world rule (analyze.mjs evaluateBlock), recomputed from the rows
{ const worlds = [...new Set(X.rows.map(r => r.world))].sort((a, b) => a - b), PW = {};
  for (const r of X.rows) if (r.role === 'test') (PW[r.world] ||= { goal: r.goal, cells: {} }).cells[r.cell] = { legal: r.legal, nonEdge: r.nonEdge, all: r.all, early: r.early, late: r.late,
    downhill: r.farLegal > 0 ? r.farLegalDownhill / r.farLegal : null, chance: r.farLegal > 0 ? r.farLegalChance / r.farLegal : null, enter: r.adjacent > 0 ? r.adjacentEnter / r.adjacent : null,
    enterChance: r.adjacent > 0 ? r.adjacentChance / r.adjacent : null, illegalExecuted: r.illegalExecuted, admittedNonGraph: r.admittedNonGraph, goalKeyedQ: r.goalKeyedQ };
  const v = (cell, k) => (w) => PW[w].cells[cell][k], diff = (a, b, k = 'legal') => (w) => v(a, k)(w) - v(b, k)(w), sum = (fn, ws = worlds) => pairedSummary(ws.map(fn), C.BOOT);
  const rateDiff = (a, b, k) => (w) => { const x = v(a, k)(w), y = v(b, k)(w); return x === null || y === null ? 0 : x - y; };
  const cellMeans = Object.fromEntries(C.CELL_NAMES.map(c => [c, Object.fromEntries(['legal', 'nonEdge', 'all', 'early', 'late', 'downhill', 'chance', 'enter', 'enterChance', 'illegalExecuted', 'admittedNonGraph', 'goalKeyedQ']
    .map(k => [k, mean(worlds.map(v(c, k)).filter(x => x !== null))]))]));
  const e1 = sum(diff('N1', 'N0'));
  const primary = { E1: { estimand: C.CLAIMS[0].estimand, legal: e1, label: C.classifyE1(e1.ci), sensitivity: Object.fromEntries(C.MARGIN.sensitivity.map(dl => [`delta${dl}`, C.classifyE1(e1.ci, dl)])) } };
  const secondary = {
    S1: { nonGraph: sum(diff('N1', 'N0', 'nonEdge')), allResets: sum(diff('N1', 'N0', 'all')) },
    S2: { N0: sum((w) => v('N0', 'late')(w) - v('N0', 'early')(w)), N1: sum((w) => v('N1', 'late')(w) - v('N1', 'early')(w)) },
    S3: { downhill_N1_minus_N0: sum(rateDiff('N1', 'N0', 'downhill')), N0_aboveChance: sum((w) => (v('N0', 'downhill')(w) ?? 0) - (v('N0', 'chance')(w) ?? 0)), N1_aboveChance: sum((w) => (v('N1', 'downhill')(w) ?? 0) - (v('N1', 'chance')(w) ?? 0)) },
    S4: { enter_N1_minus_N0: sum(rateDiff('N1', 'N0', 'enter')) },
    S5: { O0_minus_N0: sum(diff('O0', 'N0')) },
    S6: { N1E_minus_N0: sum(diff('N1E', 'N0')), N1Q_minus_N0: sum(diff('N1Q', 'N0')), N1E_minus_N1: sum(diff('N1E', 'N1')), note: 'exploratory component estimates; no label, no claim' },
  };
  const goals = [...new Set(worlds.map(w => PW[w].goal))].sort((a, b) => a - b);
  const byGoal = Object.fromEntries(goals.map(g => { const ws = worlds.filter(w => PW[w].goal === g); return [g, { n: ws.length, E1: sum(diff('N1', 'N0'), ws), N1E: sum(diff('N1E', 'N0'), ws), N1Q: sum(diff('N1Q', 'N0'), ws), S5: sum(diff('O0', 'N0'), ws) }]; }));
  check('V3.primary-E1-interval-label-and-sensitivity-recompute-exactly', J(primary) === J(S.primary) && S.primary.E1.label === 'INCONCLUSIVE', J([e1.mean, e1.ci]));
  check('V3.every-secondary-recomputes-exactly', J(secondary) === J(S.secondary));
  check('V3.by-goal-and-cell-means-recompute-exactly', J(byGoal) === J(S.byGoal) && J(cellMeans) === J(S.cellMeans));
  const verdict = C.interpret({ valid: true, e1: primary.E1.label, nonGraphShift: `${secondary.S1.nonGraph.mean.toFixed(1)} [${secondary.S1.nonGraph.ci.lower.toFixed(1)}, ${secondary.S1.nonGraph.ci.upper.toFixed(1)}]` });
  check('V3.validity-interval-count-and-verdict', S.valid === true && S.problemCount === 0 && S.excludedFraction === 0 && J(S.worlds) === J(worlds) && S.secondaryPolicy.produced === 28 && S.verdict === verdict);
}
// V4
{ const head = (p) => { const r = spawnSync('git', ['-C', ROOT, 'show', `HEAD:${p}`], { encoding: 'buffer', maxBuffer: 1 << 28 }); return r.status === 0 ? r.stdout : null; };
  const bad = Object.entries(F.frozenFiles).filter(([p, h]) => sha(lf(fs.readFileSync(path.join(ROOT, p)))) !== h || (head(p) && sha(lf(head(p))) !== h)).map(([p]) => p);
  const P = JSON.parse(fs.readFileSync(path.join(HERE, 'preregistration.json'), 'utf8'));
  check('V4.every-frozen-file-matches-its-freeze-pin-worktree-and-head', bad.length === 0 && Object.keys(F.frozenFiles).length === F.frozenCount, bad.join(', '));
  check('V4.frozen-digests-recompute', C.decisionDigest() === F.decisionDigest && C.designDigest() === F.designDigest && P.digest === F.preregistrationDigest && sha(lf(fs.readFileSync(path.join(HERE, 'verify_freeze_learn0.mjs')))) === F.freezeVerifier.sha256); }
// V5
{ const mf = sha(fs.readFileSync(path.join(R, 'manifest_blockL.json')));
  check('V5.archive-record-agrees-with-the-committed-manifest', REC.manifestDigest === M.digest && REC.manifestFileSha256 === mf && REC.files['MANIFEST.json'] === mf && REC.counts.sessions === 2160 && REC.counts.worlds === 360 && REC.counts.brains === 360 && REC.freezeCommit === 'cc8a42d63db01a98a5ce0a95dc18953a41dfe180'); }
// V6
{ const vb = lf(fs.readFileSync(path.join(R, 'exec_gate3_plan_only.VERBATIM.log'))).toString('utf8'), fl = lf(fs.readFileSync(path.join(R, 'exec_gate3_plan_only.log'))).toString('utf8');
  check('V6.verbatim-gate3-transcript-intact-and-the-filtered-copy-is-it-minus-progress-lines', sha(Buffer.from(vb)) === 'cf88f8f2914e122a6480d92514af75f3e1b0d49aa398cb19a2ac3d628bcf3968' && vb.split('\n').filter(l => !/^  stream element \d+ \(\d+ s\)$/.test(l)).join('\n') === fl && vb.split('\n').filter(l => /stream element/.test(l)).length === 18); }
// V7
{ const md = fs.readFileSync(path.join(R, 'RESULTS.md'), 'utf8'), e = S.primary.E1.legal, f1 = (x) => x.toFixed(1).replace('-', '−');
  check('V7.results-record-states-the-frozen-primary-result-and-label', md.includes(`E1 = ${f1(e.mean)}, 95 % percentile bootstrap interval [${f1(e.ci.lower)}, ${f1(e.ci.upper)}]`) && md.includes('**INCONCLUSIVE.**') && md.includes(M.digest)); }

console.log(`\nLEARN-0 results verification: ${passed} checks passed, ${failed} failed (no session run; no raw data needed)`);
if (failed) { console.log(fails.join('\n')); process.exit(1); }
