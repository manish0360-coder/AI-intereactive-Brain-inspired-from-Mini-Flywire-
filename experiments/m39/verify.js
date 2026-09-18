// ==========================================================
// M39-P1 RED RECORD VERIFIER
// ==========================================================
// The M39-P1 development pilot STOPPED on the formulation's X4 and X5 conditions. This verifier
// does not make the pilot pass. It proves that the committed RED record is exactly what the
// committed evidence says:
//   R  evidence integrity (hashes) and cross-process byte identity
//   P  P0-P5 instrument gates hold; P6 and P7 fail; X4 and X5 fire; X1, X2, X3, X6 do not
//   N  every reported number re-derived from the evidence (saturation, attainability, oracle)
//   O  the set-valued oracle, recomputed from env.js for the four approved fixtures
//   I  seeds, formulation, historical files and production code unchanged
//   M  the provenance note is bound to these facts
// The mutation suite was NOT executed: the STOP rule halted the pilot before it (see the note).
//
//   node experiments/m39/verify.js            verify the committed record
//   node experiments/m39/verify.js --rerun    also regenerate fixture 896066:0 in a fresh process
//                                             and require byte identity with the committed evidence
// ==========================================================
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const EV = path.join(ROOT, 'experiments/m39/evidence');
const NOTE = path.join(ROOT, 'experiments/m39/M39_P1_RED_RECORD.md');
const BASE = 'dacdccdf4035a5046b4be26a2713f94cb8daa77f';          // M39 formulation
const FIXTURES = [[896066, 0], [896066, 1], [896238, 2], [896329, 3]];
const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 });
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');

let checks = 0, fails = 0;
const ok = (id, cond, msg) => { checks++; if (!cond) fails++; console.log(`   [${cond ? 'PASS' : 'FAIL'}] ${id.padEnd(4)} ${msg}`); return cond; };
const section = (t) => console.log(`\n-- ${t} ${'-'.repeat(Math.max(0, 74 - t.length))}`);
console.log('='.repeat(78)); console.log('  M39-P1 RED RECORD'); console.log('='.repeat(78));

const { gates, oracleSet, CAP } = await import(pathToFileURL(path.join(ROOT, 'experiments/m39/analyze.js')).href);
const env = await import(pathToFileURL(path.join(ROOT, 'experiments/m7/env.js')).href);

// ---- R: evidence integrity -------------------------------------------------------------------------
section('R  evidence integrity');
const raw = {}, pairs = [];
for (const [s, i] of FIXTURES) for (const r of ['a', 'b']) raw[`${s}_${i}_${r}`] = fs.readFileSync(path.join(EV, `${s}_${i}_${r}.json`), 'utf8').replace(/\r\n/g, '\n');
const manifest = fs.readFileSync(path.join(EV, 'INTEGRITY.sha256'), 'utf8').trim().split(/\r?\n/).map(l => l.split(/\s+/));
ok('R1', manifest.length === 8 && manifest.every(([h, f]) => raw[f.replace('.json', '')] !== undefined && sha(raw[f.replace('.json', '')]) === h),
  'all 8 evidence files match INTEGRITY.sha256');
ok('R2', FIXTURES.every(([s, i]) => raw[`${s}_${i}_a`] === raw[`${s}_${i}_b`]),
  'for every fixture the two independent processes produced byte-identical evidence');
for (const [s, i] of FIXTURES) pairs.push([JSON.parse(raw[`${s}_${i}_a`]), JSON.parse(raw[`${s}_${i}_b`])]);
const A = pairs.map(([a]) => a);

// ---- P: gates, recomputed ------------------------------------------------------------------------------
section('P  gates recomputed from the evidence');
const g = gates(pairs);
ok('P0', g.P0, 'P0 instrumentation: ON equals the unguarded production path (bestChoice, pool keys and weights) at all 76 states');
ok('P1', g.P1 && A.every(a => a.run.ticksExecuted === 3000 && a.run.phaseAtSnapshot === 2 && a.run.replayOnce && a.tShift === 1500),
  `P1 reproducible snapshots: 3000 ticks, phase 2 (T_SHIFT 1500), __M7_REPLAY_ONCE__, identical fingerprints and snapshot digests`);
ok('P2', g.P2, 'P2 the decision-time pool is identical across ON, ZERO, PERM_1..19, ORACLE, production and PERM-under-ZERO, both processes');
ok('P3', g.P3, 'P3 values reproduce across arms and processes; ON delivers them; ZERO delivers 0; ORACLE delivers 20 on R* only; PERM preserves the pool multiset');
ok('P4', g.P4, 'P4 every readout is identical under a 1e8 ms clock shift');
ok('P5', g.P5 && g.e2.attainable === 74 && g.e2.unattainable === 2 && g.e2.undefinedStates === 0,
  `P5 attainability, descriptive: ${g.e2.attainable} attainable, ${g.e2.unattainable} unattainable, ${g.e2.undefinedStates} undefined of 76`);
ok('P6', g.P6 === false && g.e2.nPlus === 0 && g.e2.nMinus === 0 && g.e2.D === 0,
  `P6 FAILS as recorded: n+ = ${g.e2.nPlus}, n- = ${g.e2.nMinus}, D = ${g.e2.D}`);
ok('P7', g.P7 === false && g.degeneracy.rankable === 0,
  `P7 FAILS as recorded: ${g.degeneracy.rankable} states where FutureScore could rank candidates`);
const X = g.X;
ok('X', !X.X1 && !X.X2 && !X.X3 && X.X4 && X.X5 && !X.X6,
  `stop conditions: X4 and X5 fire; X1, X2, X3, X6 do not — ${JSON.stringify(X)}`);

// ---- N: every reported number --------------------------------------------------------------------------
section('N  reported numbers, re-derived');
const d = g.degeneracy;
const allVals = A.flatMap(a => a.states.flatMap(u => a.primary[u].on.step0.values));
ok('N1', d.poolCands === 466 && d.atCap === 466 && d.singleValued === 76 && new Set(allVals).size === 1 && allVals[0] === CAP,
  `saturation: ${d.atCap}/${d.poolCands} decision-time candidates at futureBonus = ${CAP}; every computed value in every pre-filter pool is ${CAP}`);
const perFx = A.map(a => gates([[a, a]]).degeneracy);
ok('N2', JSON.stringify(perFx.map(x => [x.poolCands, x.attainableStates, x.controllable])) === '[[129,19,6],[111,19,6],[103,17,7],[123,19,4]]' &&
  d.controllable === 23,
  `per fixture [candidates, attainable, ORACLE-INJECTED reaches R*]: ${JSON.stringify(perFx.map(x => [x.poolCands, x.attainableStates, x.controllable]))}; total 23/74`);
const un = A.flatMap(a => a.states.filter(u => !a.primary[u].oracleSet.some(v => a.primary[u].on.pool.map(([k]) => String(k)).includes(String(v))))
  .map(u => `${a.fixture.join(':')}/${u}`));
const f16 = A[2];
ok('N3', JSON.stringify(un) === '["896238:2/1","896238:2/3"]' && [1, 3].every(u => JSON.stringify(f16.primary[u].oracleSet) === '[2]' &&
  f16.primary[u].on.ledger.rejected[3] > 0 && !f16.primary[u].on.pool.some(([k]) => k === 2)),
  'the 2 unattainable states are 896238:2 nodes 1 and 3: R* = {2}, removed by F4 (goal reachability)');
ok('N4', g.permAssignmentChangedWhereRankable.permRankable === 0,
  'PERM LIMITATION: 0 states offered a non-trivial assignment, so PERM\'s discriminating behaviour was not empirically exercised');
ok('N5', A.every(a => a.snapshotBefore.digest === a.snapshotAfter.digest && a.snapshotBefore.thoughtTrailLength > 0),
  `readouts left the snapshot unchanged; thoughtTrail frozen non-empty (${A.map(a => a.snapshotBefore.thoughtTrailLength).join(',')}), recentMemory ${A.map(a => a.snapshotBefore.recentMemoryLength).join(',')}`);
ok('N6', A.every(a => a.mutant === null), 'no evidence file was produced under a verification fault');

// ---- O: oracle ---------------------------------------------------------------------------------------------
section('O  set-valued oracle, recomputed');
let agree = 0, total = 0;
for (const a of A) {
  const cfg = env.makeConfig(a.fixture[0], a.fixture[1]);
  for (const u of a.states) {
    total++;
    const R = oracleSet(u, a.goal, cfg.pPhase2, env);
    const single = env.reliabilityOptimalPolicy(cfg.pPhase2, a.goal).policy.get(u);
    if (JSON.stringify(R) === JSON.stringify(a.primary[u].oracleSet) && R.includes(single)) agree++;
  }
}
ok('O1', agree === total && total === 76, `R* recomputed from phase-2 reliability equals the evidence at all ${total} states and contains env's tie-broken choice`);
// With every p = 1 the expected-attempts cost is the hop count, so R*(u) must equal EXACTLY the set of
// neighbours on some hop-shortest route — computed here by an independent BFS — including every tie.
{
  const ones = Array(39).fill(1);
  const adj = new Map(Array.from({ length: 20 }, (_, i) => [i + 1, []]));
  for (const e of JSON.parse(fs.readFileSync(path.join(ROOT, 'connections.json'), 'utf8'))) { adj.get(e.from).push(e.to); adj.get(e.to).push(e.from); }
  let pairs2 = 0, exact = 0, ties = 0;
  for (const gl of env.GOALS) {
    const d = new Map([[gl, 0]]), q = [gl];
    while (q.length) { const x = q.shift(); for (const y of adj.get(x)) if (!d.has(y)) { d.set(y, d.get(x) + 1); q.push(y); } }
    for (const u of env.decisionStates(gl)) {
      const want = adj.get(u).filter(v => d.get(v) === d.get(u) - 1).sort((a, b) => a - b);
      const got = oracleSet(u, gl, ones, env);
      pairs2++; if (JSON.stringify(got) === JSON.stringify(want)) exact++; if (want.length >= 2) ties++;
    }
  }
  ok('O2', exact === pairs2 && ties > 0,
    `set-valued: with every p = 1, R* equals the independent BFS shortest-neighbour set at ${exact}/${pairs2} (state, goal) pairs, ${ties} of them multi-member ties`);
}
ok('O3', JSON.stringify(env.evaluatedSeeds()) === '[896066,896238,896329]',
  `configuration seeds evaluated by this verifier: ${JSON.stringify(env.evaluatedSeeds())} — the approved fixtures only`);

// ---- I: integrity -------------------------------------------------------------------------------------------
section('I  seeds and historical integrity');
ok('I1', A.every(a => JSON.stringify(a.evaluatedSeeds) === JSON.stringify([a.fixture[0]])),
  'each pilot process evaluated exactly its own approved fixture seed — zero new seeds, no registered block');
const REG = await import(pathToFileURL(path.join(ROOT, 'experiments/registry/consumed_after_c1.js')).href);
ok('I2', FIXTURES.every(([s]) => REG.rangeFor(s) && REG.rangeFor(s).lo === 896000) && REG.isConsumed(895500) && REG.isConsumed(897500),
  'the fixtures lie in the consumed development block 896000-896999; C1 and UQ-B blocks untouched in effect');
const PROTECTED = ['main.js', 'render/planning.js', 'render/scoring.js', 'render/memory.js', 'render/behavior.js',
  'render/predictionError.js', 'instrumentation/rng.js', 'experiments/m7/env.js', 'experiments/m7/run.js',
  'experiments/uqb/instrument.js', 'experiments/uqb/bio.js', 'experiments/uqb/permute.js', 'experiments/uqb/collect.js',
  'experiments/uqb/protocol.js', 'experiments/uqb/results/uqb_results.json', 'experiments/uqb/data/candidates.jsonl',
  'experiments/uqb/data/INTEGRITY.sha256',
  'experiments/m9/probe.js', 'experiments/c1/data/candidates.jsonl', 'experiments/c1/results/c1_results.json',
  'experiments/registry/consumed.js', 'experiments/registry/consumed_after_c1.js', 'experiments/registry/typed.js',
  'experiments/d2/verify.js', 'experiments/m38/substrate.js',
  'research/preregistrations/M39_FUTURESCORE_SHADOW_EVALUATION_FORMULATION.md', 'research/preregistrations/verify_m39.js',
  'neurons.json', 'connections.json'];
const same = (f) => git('rev-parse', `${BASE}:${f}`).trim() === git('hash-object', path.join(ROOT, f)).trim();
ok('I3', PROTECTED.every(same), `${PROTECTED.length} production, UQ-B, M9, C1, registry, D2, M38 and M39-formulation files byte-identical to ${BASE.slice(0, 7)}`);
// UQ-B's raw readouts are gitignored by convention and recorded by hash in its own manifest
const uqbReadouts = path.join(ROOT, 'experiments/uqb/data/readouts.jsonl');
const uqbHash = (fs.readFileSync(path.join(ROOT, 'experiments/uqb/data/INTEGRITY.sha256'), 'utf8').match(/^([0-9a-f]{64})\s+readouts\.jsonl$/m) || [])[1];
ok('I3b', !fs.existsSync(uqbReadouts) || crypto.createHash('sha256').update(fs.readFileSync(uqbReadouts)).digest('hex') === uqbHash,
  `UQ-B raw readouts (gitignored) ${fs.existsSync(uqbReadouts) ? 'match their frozen manifest hash' : 'are absent locally; nothing to compare'}`);
const changed = git('diff', '--name-only', BASE).split(/\r?\n/).filter(Boolean);
ok('I4', changed.every(f => f.startsWith('experiments/m39/')), `since ${BASE.slice(0, 7)} only experiments/m39/ changed: ${JSON.stringify(changed)}`);

// ---- M: provenance note -------------------------------------------------------------------------------------
section('M  provenance note');
const M = fs.existsSync(NOTE) ? fs.readFileSync(NOTE, 'utf8').replace(/\r\n/g, '\n') : '';
const flat = (t) => t.replace(/\*/g, '').replace(/`/g, '').replace(/\s+/g, ' ');
const C = {
  verdict: (t) => (t.match(/^> # M39-P1-RED/gm) || []).length === 2 && !/M39-P1-(GREEN|YELLOW)/.test(t),
  stop: (t) => flat(t).includes('stopped on X4 and X5'),
  perm: (t) => flat(t).includes('PERM wiring was exercised structurally, but its discriminating behavior was not empirically exercised because the pilot FutureScore values were constant at the production cap.'),
  mutation: (t) => flat(t).includes('The mutation suite was not executed: the formulation\'s STOP rule halted the pilot before mutation execution.'),
  scope: (t) => flat(t).includes('The only supported conclusion is that the M39 end-of-run pilot snapshots were saturated and therefore non-discriminating for the intended E2 readout.'),
  // forbidden claims may appear only as explicit "- NOT:" negation bullets
  claims: (t) => !/PERM was validated|FutureScore is (falsified|universally inert|inert)|planning is falsified|cognition is falsified|never affects decisions/i
    .test(flat(t.replace(/^- NOT: .*$/gm, ''))),
};
if (M) {
  for (const [k, f] of Object.entries(C)) ok(`M-${k}`.slice(0, 10), f(M), `note ${k} matches the record`);
  const corrupt = {
    verdict: M.replaceAll('# M39-P1-RED', '# M39-P1-GREEN'),
    stop: M.replace('stopped on X4 and X5', 'passed'),
    perm: M.replace('its discriminating behavior was not empirically exercised', 'it was validated'),
    mutation: M.replace('The mutation suite was not executed', 'The mutation suite passed'),
    scope: M.replace(/were saturated and therefore\s+non-discriminating/, 'showed FutureScore is inert'),
    claims: M + '\nPERM was validated.\n',
  };
  for (const [k, t] of Object.entries(corrupt)) ok(`X-${k}`.slice(0, 10), t !== M && !C[k](t), `corrupting the note breaks '${k}'`);
} else ok('M0', false, 'provenance note missing');

// ---- optional fresh regeneration ------------------------------------------------------------------------------
if (process.argv.includes('--rerun')) {
  section('F  fresh-process regeneration of fixture 896066:0');
  const out = execFileSync(process.execPath, [path.join(ROOT, 'experiments/m39/child.mjs')],
    { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 29, env: { ...process.env, M39_ROOT: ROOT, M39_SEED: '896066', M39_INDEX: '0', M39_MUTANT: '' } });
  ok('F1', out.slice(out.indexOf('@@M39@@') + 7) + '\n' === raw['896066_0_a'], 'a fresh run reproduces the committed evidence byte for byte');
}

console.log('\n' + '='.repeat(78));
console.log(`  M39-P1 RECORD: ${checks - fails}/${checks} checks passed, ${fails} FAILED`);
console.log(`  VERDICT: ${fails === 0 ? 'RED RECORD VERIFIED — pilot stopped on X4 and X5' : 'RED RECORD NOT VERIFIED'}`);
console.log('='.repeat(78));
process.exit(fails === 0 ? 0 : 1);
