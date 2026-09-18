// ==========================================================
// D2 GATE — FutureScore identity repair
// ==========================================================
// DEFECT   render/planning.js futureScore started its DFS at neuron.id — the THREE.Object3D
//          counter — while every lookup inside it (findNeuronById, userData.neighbors,
//          "a->b" reward keys) is keyed by the graph identity neuron.userData.id.
// REPAIR   one token: dfs(neuron.userData.id, depth).
//
// Every check is behavioural, on the REAL main.js booted headless (Phase 1.0 driver,
// pre-existing development agent seed 20260818, goal 16, 300 ticks). Arms, one process each:
//   PRE     render/planning.js as committed at 727b219 (the defect), served from git bytes
//   POST    the working tree (the repair)                 POST2  the same, a fresh process
//   ZERO    the repair with futureScore forced to 0       (ablation: attributes decisions)
//   REVERT  the working tree with the repair undone        (negative control)
// KNOWN LIMITATION: main.js reads the wall clock, so whole 300-tick trajectories are not
// seed-reproducible (see N3 and D2_EVIDENCE_LINEAGE.md). N3 no longer depends on them; N2 still
// compares the whole PRE and REVERT runs, so it inherits this limitation.
// The observation hook (experiments/d2/hook.mjs) is identical in every arm.
//
// NOT an experiment. No FutureScore, planning, learning or cognition claim. experiments/m7/env.js
// is never imported, so no configuration is generated and no configuration seed is evaluated.
// ==========================================================
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 });
const BASE = '727b2194e3391fe374eda384ef6b96ea2851ae9b';          // M38, the last pre-D2 commit
const PLANNING = 'render/planning.js';
const DEFECT = '        neuron.id,\n';
const REPAIR = '        neuron.userData.id,\n';
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const norm = (s) => s.replace(/\r\n/g, '\n');

let checks = 0, fails = 0;
const ok = (id, cond, msg) => { checks++; if (!cond) fails++; console.log(`   [${cond ? 'PASS' : 'FAIL'}] ${id.padEnd(4)} ${msg}`); return cond; };
const section = (t) => console.log(`\n-- ${t} ${'-'.repeat(Math.max(0, 74 - t.length))}`);

// ---- arms -----------------------------------------------------------------------------------
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'd2-'));
const PRE_BYTES = norm(git('show', `${BASE}:${PLANNING}`));
const POST_BYTES = norm(fs.readFileSync(path.join(ROOT, PLANNING), 'utf8'));
fs.writeFileSync(path.join(TMP, 'pre.js'), PRE_BYTES);
fs.writeFileSync(path.join(TMP, 'revert.js'), POST_BYTES.replace(REPAIR, DEFECT));
function arm(extra) {
  const out = execFileSync(process.execPath, [path.join(ROOT, 'experiments/d2/child.mjs')],
    { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 29, env: { ...process.env, D2_ROOT: ROOT, D2_TICKS: '300', ...extra } });
  return JSON.parse(out.slice(out.indexOf('@@D2@@') + 6));
}
console.log('='.repeat(78)); console.log('  D2 GATE — FutureScore identity repair'); console.log('='.repeat(78));
const A = {
  PRE: arm({ D2_PLANNING_SRC: path.join(TMP, 'pre.js') }),
  POST: arm({}),
  POST2: arm({}),
  ZERO: arm({ D2_ZERO: '1' }),
  REVERT: arm({ D2_PLANNING_SRC: path.join(TMP, 'revert.js') }),
};
fs.rmSync(TMP, { recursive: true, force: true });

// the repaired-substrate criteria, applied to ANY arm — the negative control must fail them
function repairedCriteria(r) {
  const U = r.unit, ids = U.neurons.map(n => n.userDataId);
  const lookupsOk = ['empty', 'rewarded'].every(k => U.lookups[k].every((x, i) => x === ids[i % 20]));
  const liveOk = r.calls.length > 0 && r.calls.every(c => c[3] === c[0]);
  const g16 = U.fs.rewarded.slice(40, 60);
  const nonzeroAll = g16.every(v => v !== 0);
  const liveNonzeroHigh = r.calls.filter(c => c[0] >= 5 && c[2] !== 0).length;
  const intendedOk = ['empty', 'rewarded'].every(k => U.fs[k].every((v, i) => v === U.fsIntended[k][i]));
  return { lookupsOk, liveOk, nonzeroAll, liveNonzeroHigh, intendedOk,
           pass: lookupsOk && liveOk && nonzeroAll && liveNonzeroHigh > 0 && intendedOk };
}

// ---- 1. identity -----------------------------------------------------------------------------
section('1  which identity reaches the futureScore DFS');
{
  const pre = A.PRE.unit, post = A.POST.unit;
  ok('I1', pre.neurons.every(n => n.objectId !== n.userDataId),
    `the object reaching futureScore carries two ids: THREE counter ${JSON.stringify(pre.neurons.map(n => n.objectId))} vs graph ids 1..20`);
  ok('I2', pre.lookups.empty.every((x, i) => x === pre.neurons[i % 20].objectId),
    'PRE: the first lookup inside futureScore is the THREE counter, for all 80 (goal, neuron) calls');
  const wrong = pre.neurons.filter(n => n.objectIdResolvesTo !== null).map(n => `${n.userDataId}→${n.objectIdResolvesTo}`);
  const none = pre.neurons.filter(n => n.objectIdResolvesTo === null).map(n => n.userDataId);
  ok('I3', wrong.join(',') === '1→5,2→9,3→13,4→17' && none.length === 16,
    `PRE: that id resolves to the WRONG neuron for ${wrong.join(', ')} and to nothing for the other ${none.length}`);
  ok('I4', post.lookups.empty.every((x, i) => x === post.neurons[i % 20].userDataId) &&
    A.POST.calls.every(c => c[3] === c[0]),
    `POST: the first lookup is neuron.userData.id in all 80 unit calls and all ${A.POST.calls.length} live calls — the intended graph neuron`);
}

// ---- 2. contribution -----------------------------------------------------------------------------
section('2  what futureScore computes, before and after');
{
  const pre = A.PRE.unit, post = A.POST.unit;
  const idx = (goalPos, g) => goalPos * 20 + (g - 1);
  let preZero = true, preWrong = true;
  for (const k of ['empty', 'rewarded']) for (let gp = 0; gp < 4; gp++) for (let g = 1; g <= 20; g++) {
    const n = pre.neurons[g - 1], v = pre.fs[k][idx(gp, g)];
    if (n.objectIdResolvesTo === null) { if (v !== 0) preZero = false; }
    else if (v !== pre.fsIntended[k][idx(gp, n.objectIdResolvesTo)]) preWrong = false;
  }
  ok('C1', preZero && preWrong,
    'PRE (as diagnosed): exactly 0 for neurons 5..20; for 1..4 exactly the value of neurons 5, 9, 13, 17 — both fixtures, all 4 goals');
  const g16 = post.fs.rewarded.slice(40, 60);
  ok('C2', g16.every(v => v !== 0) && post.fs.empty.slice(40, 60).every(v => v !== 0),
    `POST: non-zero for all 20 neurons at goal 16, with and without the Probe B reward fixture (rewarded range ${Math.min(...g16).toFixed(3)}..${Math.max(...g16).toFixed(3)})`);
  ok('C3', ['empty', 'rewarded'].every(k => post.fs[k].every((v, i) => v === pre.fsIntended[k][i])),
    'POST equals the PRE function called with the graph identity, bit for bit: the repair changes the identity and nothing else');
  ok('C4', JSON.stringify(pre.look) === JSON.stringify(post.look), 'lookAheadScore is identical for all 80 (start, goal) pairs');
  const hi = (r) => r.calls.filter(c => c[0] >= 5);
  ok('C5', hi(A.PRE).every(c => c[2] === 0) && hi(A.POST).some(c => c[2] !== 0),
    `live run: PRE returned 0 on all ${hi(A.PRE).length} calls for candidates 5..20; POST returned non-zero on ${hi(A.POST).filter(c => c[2] !== 0).length}/${hi(A.POST).length}`);
}

// the D2-specific behavioural assertions of one repaired arm, relative to the ablation
function d2Evidence(P, Z) {
  let first = -1, move = -1;
  for (let i = 0; i < Math.min(P.scores.length, Z.scores.length); i++) if (P.scores[i][1] !== Z.scores[i][1]) { first = i; break; }
  for (let i = 0; i < Math.min(P.writes.length, Z.writes.length); i++) if (P.writes[i] !== Z.writes[i]) { move = i; break; }
  return { unit: P.unit, identityOnEveryLiveCall: P.calls.every(c => c[3] === c[0]),
           firstScore: first, futureBonusAtFirstScore: first >= 0 ? P.scores[first][0] : null,
           firstMove: move, moves: move >= 0 ? [P.writes[move], Z.writes[move]] : null };
}

// ---- 3. decision relevance ----------------------------------------------------------------------------
section('3  does the contribution reach the final candidate score and the decision');
{
  const P = A.POST, Z = A.ZERO;
  ok('D1', P.scores.length === P.calls.length && P.scores.some(s => s[0] !== 0) && Z.scores.every(s => s[0] === 0),
    `every futureScore call feeds one calculateDecisionScore call; POST passed a non-zero futureBonus ${P.scores.filter(s => s[0] !== 0).length} times, ZERO never`);
  let first = -1;
  for (let i = 0; i < Math.min(P.scores.length, Z.scores.length); i++) if (P.scores[i][1] !== Z.scores[i][1]) { first = i; break; }
  ok('D2', first >= 0 && P.scores[first][0] !== 0 && Z.scores[first][0] === 0 &&
    P.scores.slice(0, first).every((s, i) => s[1] === Z.scores[i][1]),
    `the first candidate score that differs from the ablation (call ${first}) is exactly where futureBonus is non-zero (${first >= 0 ? P.scores[first][0].toFixed(3) : '-'}); every earlier score is identical`);
  let firstMove = -1;
  for (let i = 0; i < Math.min(P.writes.length, Z.writes.length); i++) if (P.writes[i] !== Z.writes[i]) { firstMove = i; break; }
  ok('D3', firstMove >= 0,
    `the chosen moves diverge from the ablation at decision ${firstMove} (${firstMove >= 0 ? `${P.writes[firstMove]} vs ${Z.writes[firstMove]}` : '-'}) — FutureScore is decision-relevant on this fixture`);
  const preVsZero = A.PRE.writes.findIndex((w, i) => w !== Z.writes[i]);
  console.log(`   note  PRE vs ZERO decisions: ${preVsZero < 0 ? 'identical over the run' : `first differ at decision ${preVsZero}`} ` +
    '(PRE is non-zero only through the misresolved candidates 1..4)');
}

// ---- 4. negative control, determinism ----------------------------------------------------------------
section('4  negative control and fresh-process determinism');
{
  const post = repairedCriteria(A.POST), pre = repairedCriteria(A.PRE), rev = repairedCriteria(A.REVERT);
  ok('N1', post.pass, 'POST satisfies every repaired-substrate criterion');
  ok('N2', !pre.pass && !rev.pass && JSON.stringify(A.REVERT.unit) === JSON.stringify(A.PRE.unit) &&
    JSON.stringify(A.REVERT.writes) === JSON.stringify(A.PRE.writes),
    `reverting the one line fails those criteria (lookups ${rev.lookupsOk}, live ${rev.liveOk}, non-zero ${rev.nonzeroAll}) and reproduces PRE exactly`);
  // KNOWN LIMITATION (not a D2 defect): main.js reads Date.now() in its replay (4 s), schema-rebuild
  // (15 s) and context-shift (800 ms) throttles, so two seeded 300-tick runs can diverge after
  // roughly 780-990 decisions. N3 therefore reproduces the D2 assertions, not the whole trajectory.
  const e1 = d2Evidence(A.POST, A.ZERO), e2 = d2Evidence(A.POST2, A.ZERO);
  ok('N3', JSON.stringify(e1) === JSON.stringify(e2) && e2.identityOnEveryLiveCall && e2.firstMove >= 0,
    `a fresh POST process reproduces every D2 assertion: unit fixture, graph identity on all ${A.POST2.calls.length} live calls, first differing score (call ${e2.firstScore}) and first differing move (decision ${e2.firstMove})`);
}

// ---- 5. scope, lineage, seeds ----------------------------------------------------------------------------
section('5  scope, evidence lineage, seeds');
{
  ok('S1', sha(POST_BYTES) === sha(PRE_BYTES.replace(DEFECT, REPAIR)) && PRE_BYTES.split(DEFECT).length === 2,
    `${PLANNING} is the ${BASE.slice(0, 7)} bytes with exactly the one defect line replaced (sha256 ${sha(POST_BYTES).slice(0, 16)}…)`);
  const changed = git('diff', '--name-only', BASE).split(/\r?\n/).filter(Boolean);
  // new files are checked on the production paths only; tracked frozen files are S3's job
  const untracked = git('ls-files', '-o', '--exclude-standard', '--', 'main.js', 'render', 'instrumentation').split(/\r?\n/).filter(Boolean);
  ok('S2', changed.every(f => f === PLANNING || f.startsWith('experiments/d2/')) && untracked.length === 0,
    `since ${BASE.slice(0, 7)} the only production change is ${PLANNING}: tracked ${JSON.stringify(changed)}, new production files ${JSON.stringify(untracked)}`);
  const FROZEN = ['main.js', 'render/scoring.js', 'render/search.js', 'render/embeddings.js', 'instrumentation/rng.js',
    'experiments/m7/env.js', 'experiments/c1/protocol.js', 'experiments/uqb/protocol.js', 'experiments/c1/data/candidates.jsonl',
    'experiments/c1/results/c1_results.json', 'experiments/registry/consumed.js', 'experiments/registry/consumed_after_c1.js',
    'experiments/registry/typed.js', 'experiments/m38/substrate.js', 'experiments/m38/verify.js', 'neurons.json', 'connections.json',
    'research/cognitive-audit/M7_PREREGISTRATION.md', 'research/preregistrations/C1_PREREGISTRATION.md',
    'research/preregistrations/UQB_PREREGISTRATION.md'];
  const same = (f) => git('rev-parse', `${BASE}:${f}`).trim() === git('hash-object', path.join(ROOT, f)).trim();
  ok('S3', FROZEN.every(same), `${FROZEN.length} frozen, C1, UQ-B, registry, M38 and data files byte-identical to ${BASE.slice(0, 7)}`);
  const child = fs.readFileSync(path.join(ROOT, 'experiments/d2/child.mjs'), 'utf8');
  // actual import specifiers and call sites, with comments stripped; a mutant must be rejected
  const noSeedPath = (src) => {
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    const specs = [...code.matchAll(/\bimport\b[^;]*?['"`]([^'"`]+)['"`]/g)].map(m => m[1]);
    return specs.length > 0 && !specs.some(s => /m7\/env\.js|registry\//.test(s)) &&
      !/\b(makeConfig|generateAccepted|generateAcceptedStream)\s*\(/.test(code);
  };
  const mutant = child + "\nconst __x = await import(U + '/experiments/m7/env.js');\n";
  ok('S4', noSeedPath(child) && !noSeedPath(mutant) && /SEED = 20260818/.test(child),
    'no configuration generated and no registry touched: the arms never import env.js; agent seed is the pre-existing Phase 1.0 fixture 20260818');
  // Evidence lineage: the M38 gate binds planning.js to its own base bytes. It must now reject
  // the authorised repair through that binding — and through nothing else.
  let m38;
  try { m38 = JSON.parse(execFileSync(process.execPath, [path.join(ROOT, 'experiments/m38/verify.js'), '--json'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 })); }
  catch (e) { m38 = JSON.parse(e.stdout); }
  const m38Fails = m38.results.filter(r => !r.ok).map(r => r.id);
  const g2 = m38.results.find(r => r.id === 'G2');
  const g2Files = g2 ? g2.msg.slice(g2.msg.lastIndexOf(': ') + 2) : null;
  ok('S5', JSON.stringify(m38Fails) === '["G1","G2"]' && g2Files === '["render/planning.js"]',
    `LINEAGE: the historical M38 gate rejects exactly its two planning.js pins ${JSON.stringify(m38Fails)} — G1 bytes vs 6b67c55, G2 listing ${g2Files} — and passes its other ${m38.results.length - m38Fails.length} checks; D2 is the successor binding`);
}

console.log('\n' + '='.repeat(78));
console.log(`  D2 GATE: ${checks - fails}/${checks} passed, ${fails} FAILED`);
console.log(`  VERDICT: ${fails === 0 ? 'IDENTITY REPAIR VERIFIED' : 'IDENTITY REPAIR NOT VERIFIED'}`);
console.log('='.repeat(78));
process.exit(fails === 0 ? 0 : 1);
