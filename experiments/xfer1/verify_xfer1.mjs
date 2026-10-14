// ==========================================================
// XFER-1 — verification gate
// ==========================================================
//   node experiments/xfer1/verify_xfer1.mjs
// Sections:
//   S  static   : declarations, seed hygiene, source hygiene, statistics
//   G  guards   : the session driver refuses every ill-formed or out-of-territory input
//   B  behaviour: determinism, exact delivery of every component, serializer round trip, cold equivalence
//   M  mutants  : deliberately broken fixtures must be caught by the same check functions (anti-vacuity)
//   E  evidence : lodged result summaries are internally consistent (skipped when none is lodged)
// Needs the prepared conformed tree (node experiments/mcf1/prepare_tree.mjs).  Writes nothing in the repository;
// scratch files live in a fresh directory under the OS temporary directory and are removed at the end.
// ==========================================================
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { buildTree } from '../h1r/build_tree.mjs';
import { generateAcceptedStream } from '../m7/env.js';
import * as C from './config.mjs';
import { maskBrain, brainHash } from './brain.mjs';
import { deliveryProblems, roundtripProblems, planProblems, pairingProblems, provenanceProblems } from './checks.mjs';
import { prng, bootstrapMeanCi, pairedSummary, mean } from './stats.mjs';
import { summarize } from './analyze.mjs';
import { DEVELOPMENT_DOMAIN, DEV_BLOCK, BLOCK } from '../mcf1/config.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
let passed = 0, failed = 0, mutCaught = 0, mutMissed = 0;
const fails = [];
const check = (id, cond, detail = '') => { if (cond) passed++; else { failed++; fails.push(`${id} ${detail}`); } console.log(`${cond ? 'PASS' : 'FAIL'} ${id}${cond || !detail ? '' : ' :: ' + detail}`); };
const mutant = (id, caught, detail = '') => { if (caught) mutCaught++; else mutMissed++; console.log(`${caught ? 'CAUGHT' : 'MISSED'} ${id}${caught || !detail ? '' : ' :: ' + detail}`); };

// ============ S: static ============
{
  const names = C.ARM_ORDER;
  check('S1.arms-wellformed', names.every(a => ['none', 'own', 'donor'].includes(C.ARMS[a].source) && C.ARMS[a].keep.every(c => C.COMPONENTS.includes(c))));
  check('S1.cold-keeps-nothing', C.ARMS.COLD.source === 'none' && C.ARMS.COLD.keep.length === 0);
  check('S1.full-keeps-everything', C.ARMS.FULL.keep.length === C.COMPONENTS.length && C.COMPONENTS.every(c => C.ARMS.FULL.keep.includes(c)));
  check('S1.only-and-leave-one-out', C.COMPONENTS.every(c => C.ARMS[`ONLY_${c}`].keep.length === 1 && C.ARMS[`NO_${c}`].keep.length === C.COMPONENTS.length - 1 && !C.ARMS[`NO_${c}`].keep.includes(c)));
  check('S1.components-are-the-saveBrain-fields', JSON.stringify(C.COMPONENTS) === JSON.stringify(['transitions', 'rewards', 'penalties', 'signals', 'curiosity', 'Q', 'confidence', 'episodes']));
  check('S2.contrasts-reference-declared-arms', C.CONTRASTS.every(([n, t, r]) => C.ARMS[t] && C.ARMS[r]));
  check('S2.primary-declared', C.CONTRASTS.some(([n]) => n === C.PRIMARY.contrast) && C.ENDPOINTS.includes(C.PRIMARY.endpoint));
  const seeds = [];
  for (let w = 0; w < C.WORLDS_TOTAL; w++) seeds.push(C.trainSeed(w), C.testSeed(w));
  check('S3.seeds-inside-the-declared-development-domain', seeds.every(s => s >= DEVELOPMENT_DOMAIN.lo && s <= DEVELOPMENT_DOMAIN.hi));
  check('S3.seeds-disjoint-from-the-cold-census-block', seeds.every(s => s < DEV_BLOCK.start || s >= DEV_BLOCK.start + DEV_BLOCK.count));
  check('S3.seeds-disjoint-from-the-candidate-confirmatory-block', seeds.every(s => s < BLOCK.start || s >= BLOCK.start + BLOCK.scanLength));
  check('S3.seeds-pairwise-distinct', new Set(seeds).size === seeds.length);
  check('S3.config-territory-below-held-out-floor', C.CONFIG_START + 5000 < C.HELDOUT_FLOOR);
  check('S3.seedOk-refuses-foreign-domains', !C.seedOk(20260819000).ok && !C.seedOk(BLOCK.start).ok && !C.seedOk(C.SEED_BASE - 1).ok && !C.seedOk(C.SEED_LIMIT + 1).ok && C.seedOk(C.SEED_BASE).ok);
  check('S3.blocks-disjoint-and-cover', C.BLOCKS.A.hi + 1 === C.BLOCKS.B.lo && C.BLOCKS.B.hi + 1 === C.WORLDS_TOTAL && C.blockOf(0) === 'A' && C.blockOf(79) === 'B' && C.blockOf(80) === null);

  // source hygiene: no clock, no ambient randomness, no stage authorisation, no local absolute paths
  const srcs = fs.readdirSync(HERE).filter(f => f.endsWith('.mjs') && f !== 'verify_xfer1.mjs');
  const bad = [];
  for (const f of srcs) {
    const t = fs.readFileSync(path.join(HERE, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    if (/Date\.now|new Date\(|Math\.random|performance\.now/.test(t)) bad.push(`${f}: clock or ambient randomness`);
    if (/H1R_STAGE_AUTHORISED\s*=/.test(t)) bad.push(`${f}: sets a stage authorisation`);
    if (/[A-Za-z]:[\\/]+Users|\/Users\/|\/home\//.test(t)) bad.push(`${f}: local absolute path`);
  }
  check('S4.source-hygiene', bad.length === 0, bad.join('; '));

  // statistics fixtures (exact values)
  check('S5.mean-median-sd', mean([1, 2, 3, 4]) === 2.5 && pairedSummary([1, 2, 3, 4], C.BOOTSTRAP).median === 2.5 && Math.abs(pairedSummary([1, 2, 3, 4], C.BOOTSTRAP).sd - Math.sqrt(5 / 3)) < 1e-12);
  const ci1 = bootstrapMeanCi([1, 2, 3, 4, 5, 6], { replicates: 2000, seed: 7, level: 0.95 }), ci2 = bootstrapMeanCi([1, 2, 3, 4, 5, 6], { replicates: 2000, seed: 7, level: 0.95 });
  check('S5.bootstrap-deterministic-and-brackets-the-mean', JSON.stringify(ci1) === JSON.stringify(ci2) && ci1.lower <= 3.5 && ci1.upper >= 3.5 && ci1.lower >= 1 && ci1.upper <= 6);
  check('S5.constant-differences-give-a-degenerate-interval', (() => { const c = bootstrapMeanCi([5, 5, 5, 5], { replicates: 500, seed: 3, level: 0.95 }); return c.lower === 5 && c.upper === 5; })());
  check('S5.prng-in-unit-interval', (() => { const r = prng(42); for (let i = 0; i < 1000; i++) { const x = r(); if (!(x >= 0 && x < 1)) return false; } return true; })());
}

// ============ shared scratch ============
const tree = buildTree();
const TREE = tree.dir;
const scratch = fs.mkdtempSync(path.join(fs.realpathSync.native(os.tmpdir()), 'xfer1-verify-'));
const stream = generateAcceptedStream(C.CONFIG_START, 6);              // the first six worlds of the declared stream (same ascending pass)
const plan = C.planWorlds(stream);
const W = plan[1], D = plan[W.donor];
const run = (input) => {
  const r = spawnSync(process.execPath, [path.join(HERE, 'session.mjs'), JSON.stringify(input)], { encoding: 'utf8', maxBuffer: 1 << 28 });
  const m = r.stdout.match(/@@RESULT@@(.*)@@END@@/s);
  return { code: r.status, rec: m ? JSON.parse(m[1]) : null, stderr: (r.stderr || '').slice(-600) };
};
const trainInput = (w, exportPath) => ({ role: 'train', label: `v-train-w${w.world}`, tree: TREE, world: w.world, configSeed: w.configSeed, configIndex: w.configIndex, agentSeed: w.trainSeed, ticks: C.TICKS.train, exportPath });
const testInput = (w, arm, brainPath, brainWorld) => {
  const i = { role: 'test', label: `v-${arm}-w${w.world}`, tree: TREE, world: w.world, configSeed: w.configSeed, configIndex: w.configIndex, agentSeed: w.testSeed, ticks: C.TICKS.test, arm };
  if (brainPath !== undefined) { i.brainPath = brainPath; i.brainWorld = brainWorld; }
  return i;
};
const refused = (input, needle) => { const r = run(input); return r.code !== 0 && r.rec === null && r.stderr.includes(needle) ? true : `code=${r.code} rec=${r.rec !== null} stderr=${r.stderr.slice(-200)}`; };

try {
  // ============ G: guards ============
  const base = testInput(W, 'COLD');
  const g = (id, input, needle) => { const v = refused(input, needle); check(id, v === true, v === true ? '' : String(v)); };
  g('G1.unknown-field', { ...base, surprise: 1 }, 'unknown input field');
  g('G2.unknown-role', { ...base, role: 'both' }, 'unknown role');
  g('G3.test-seed-equal-to-train-seed', { ...base, agentSeed: W.trainSeed }, 'is not the test seed');
  g('G3.train-seed-in-a-test-session-of-another-world', { ...trainInput(W, undefined), agentSeed: D.trainSeed }, 'is not the train seed');
  g('G4.wrong-length', { ...base, ticks: 3000 }, 'ticks must be');
  g('G5.agent-seed-outside-domain', { ...base, agentSeed: 20260819000 }, 'outside the XFER-1 domain');
  g('G5.agent-seed-in-the-candidate-block', { ...base, agentSeed: 1_500_000_000 }, 'outside the XFER-1 domain');
  g('G6.heldout-config-seed', { ...base, configSeed: 900600 }, 'outside the XFER-1 territory');
  g('G6.consumed-config-seed', { ...base, configSeed: 890000 }, 'held-out/consumed');
  g('G6.config-below-territory', { ...base, configSeed: 100000 }, 'outside the XFER-1 territory');
  g('G7.train-with-an-arm', { ...trainInput(W, undefined), arm: 'FULL' }, 'cold and has no arm');
  g('G7.cold-arm-with-a-brain', { ...base, brainPath: path.join(scratch, 'x.json'), brainWorld: W.world }, 'must not have a brain file');
  g('G7.full-arm-without-a-brain', testInput(W, 'FULL'), 'needs a brain file');
  g('G7.own-arm-with-a-donor-brain', testInput(W, 'FULL', path.join(scratch, 'x.json'), D.world), 'needs the own-world brain');
  g('G7.donor-arm-with-the-own-brain', testInput(W, 'SHAM', path.join(scratch, 'x.json'), W.world), 'needs a donor-world brain');
  g('G7.brain-file-without-provenance', { ...testInput(W, 'FULL', path.join(scratch, 'x.json'), W.world), brainWorld: undefined }, 'brainWorld is required');
  process.env.H1R_STAGE_AUTHORISED = 'stage1';
  g('G8.refuses-when-a-stage-authorisation-is-set', base, 'H1R_STAGE_AUTHORISED is set');
  delete process.env.H1R_STAGE_AUTHORISED;
  g('G9.missing-tree', { ...base, tree: path.join(scratch, 'no-such-tree') }, 'prepared conformed tree');

  // ============ B: behaviour ============
  const brainW = path.join(scratch, 'w1.json'), brainD = path.join(scratch, 'w5.json');
  const t1 = run(trainInput(W, brainW)), t2 = run(trainInput(D, brainD));
  check('B0.training-sessions-complete', t1.rec && t2.rec && !t1.rec.outcome.crashed && !t2.rec.outcome.crashed && t1.rec.outcome.completed && t2.rec.outcome.completed, `${t1.stderr} ${t2.stderr}`);
  check('B0.training-starts-from-an-empty-brain', COMPONENTS_EMPTY(t1.rec.brain.start.sizes));
  check('B0.training-acquires-experience', Object.values(t1.rec.brain.endSizes).every(n => n > 0));
  check('B0.worlds-differ', t1.rec.input.acceptedConfigSeed !== t2.rec.input.acceptedConfigSeed && t1.rec.input.goal === t2.rec.input.goal);

  // determinism: the same training session reproduces its behaviour and its persisted brain.  The product stamps each
  // episode with wall-clock identifiers (id, timestamp), so the exported BYTES differ between runs; they are excluded
  // from the hash view (brain.mjs) and shown below to be the ONLY differing fields and to be behaviourally inert.
  const brainW2 = path.join(scratch, 'w1_again.json');
  const t1b = run(trainInput(W, brainW2));
  check('B1.training-is-deterministic', t1b.rec && t1b.rec.artifacts.fingerprint === t1.rec.artifacts.fingerprint && t1b.rec.brain.endHash === t1.rec.brain.endHash && JSON.stringify(t1b.rec.endpoints) === JSON.stringify(t1.rec.endpoints));
  {
    const a = JSON.parse(fs.readFileSync(brainW, 'utf8')), b = JSON.parse(fs.readFileSync(brainW2, 'utf8'));
    const diff = new Set();
    for (const c of C.COMPONENTS) {
      if (c !== 'episodes') { if (JSON.stringify(a[c]) !== JSON.stringify(b[c])) diff.add(c); continue; }
      if (a.episodes.length !== b.episodes.length) diff.add('episodes.length');
      for (let i = 0; i < Math.min(a.episodes.length, b.episodes.length); i++) for (const k of new Set([...Object.keys(a.episodes[i]), ...Object.keys(b.episodes[i])])) if (JSON.stringify(a.episodes[i][k]) !== JSON.stringify(b.episodes[i][k])) diff.add(`episodes.${k}`);
    }
    check('B1.only-wall-clock-episode-identifiers-differ', [...diff].every(d => d === 'episodes.id' || d === 'episodes.timestamp'), [...diff].join(','));
  }

  const armsUnderTest = ['COLD', 'FULL', 'SHAM', 'ONLY_episodes', 'NO_episodes', 'ONLY_Q', 'NO_Q', 'PROC', 'NOPROC', 'ONLY_confidence'];
  const recs = {};
  for (const a of armsUnderTest) {
    const src = C.ARMS[a].source;
    const r = run(src === 'none' ? testInput(W, a) : src === 'own' ? testInput(W, a, brainW, W.world) : testInput(W, a, brainD, D.world));
    recs[a] = r.rec;
    check(`B2.${a}.completes`, r.rec !== null && r.rec.outcome.completed && !r.rec.outcome.crashed, r.stderr);
    if (r.rec) {
      const pr = deliveryProblems(r.rec);
      check(`B2.${a}.delivery-is-exact`, pr.length === 0, pr.join('; '));
    }
  }
  {
    // a brain that differs only in the wall-clock episode identifiers is the same experience: same outcomes, same hash view
    const full2 = run(testInput(W, 'FULL', brainW2, W.world));
    check('B1.behaviour-independent-of-episode-identifiers', full2.rec !== null && full2.rec.artifacts.fingerprint === recs.FULL.artifacts.fingerprint && JSON.stringify(full2.rec.endpoints) === JSON.stringify(recs.FULL.endpoints));
    check('B1.hash-view-ignores-only-those-identifiers', full2.rec !== null && full2.rec.brain.deliveredHash === recs.FULL.brain.deliveredHash);
  }
  check('B3.full-brain-round-trips-through-loadBrain', roundtripProblems(recs.FULL).length === 0, roundtripProblems(recs.FULL).join('; '));
  check('B3.delivered-brain-is-the-masked-training-brain', recs.FULL.brain.deliveredHash === brainHash(maskBrain(JSON.parse(fs.readFileSync(brainW, 'utf8')), C.COMPONENTS)));
  check('B3.donor-brain-differs-from-the-own-brain', recs.SHAM.brain.deliveredHash !== recs.FULL.brain.deliveredHash);
  const trainBy = new Map([[W.world, t1.rec], [D.world, t2.rec]]);
  check('B3.every-delivered-brain-is-its-world-training-end-state', Object.values(recs).every(r => provenanceProblems(r, trainBy).length === 0), Object.values(recs).flatMap(r => provenanceProblems(r, trainBy)).join('; '));
  check('B3.paired-by-construction', pairingProblems(Object.values(recs), armsUnderTest).length === 0, pairingProblems(Object.values(recs), armsUnderTest).join('; '));
  check('B3.episode-restore-leaves-other-stores-empty', recs.ONLY_episodes.brain.start.sizes.episodes > 0 && Object.entries(recs.ONLY_episodes.brain.start.sizes).filter(([c]) => c !== 'episodes').every(([, n]) => n === 0));

  // determinism of a test session and cold equivalence with the plain pipeline
  const cold2 = run(testInput(W, 'COLD'));
  check('B4.test-session-is-deterministic', cold2.rec && cold2.rec.artifacts.fingerprint === recs.COLD.artifacts.fingerprint && JSON.stringify(cold2.rec.endpoints) === JSON.stringify(recs.COLD.endpoints));
  const ref = spawnSync(process.execPath, [path.join(HERE, 'reference_run.mjs'), JSON.stringify({ tree: TREE, configSeed: W.configSeed, configIndex: W.configIndex, agentSeed: W.testSeed, ticks: C.TICKS.test })], { encoding: 'utf8', maxBuffer: 1 << 28 });
  const rm = ref.stdout.match(/@@REF@@(.*)@@END@@/s), rr = rm ? JSON.parse(rm[1]) : null;
  check('B5.cold-session-equals-the-plain-pipeline', rr !== null && rr.fingerprint === recs.COLD.artifacts.fingerprint && rr.goalReaches === recs.COLD.endpoints.goalReaches && rr.calls === recs.COLD.counters.calls, rr ? JSON.stringify(rr) : (ref.stderr || '').slice(-300));
  check('B5.experience-changes-behaviour-in-this-world', recs.FULL.artifacts.fingerprint !== recs.COLD.artifacts.fingerprint);

  // ============ M: mutants (function-level; the same checks must fire) ============
  const clone = (o) => JSON.parse(JSON.stringify(o));
  { // M1: a masker that ignores the arm delivers a component it must omit
    const r = clone(recs.ONLY_episodes); r.brain.deliveredHashes.Q = r.brain.start.hashes.Q === 'absent' ? 'f'.repeat(64) : r.brain.start.hashes.Q;
    mutant('M1.masker-delivers-an-omitted-component', deliveryProblems(r).length > 0);
  }
  { // M2: a masker that drops a kept component
    const r = clone(recs.FULL); r.brain.deliveredHashes.rewards = 'absent';
    mutant('M2.masker-drops-a-kept-component', deliveryProblems(r).length > 0);
  }
  { // M3: the restore is inexact (a kept component differs at the first call)
    const r = clone(recs.FULL); r.brain.start.hashes.Q = '0'.repeat(64);
    mutant('M3.restore-is-not-exact', deliveryProblems(r).length > 0);
  }
  { // M4: an omitted component is not empty at the first call (state leaked in from elsewhere)
    const r = clone(recs.ONLY_episodes); r.brain.start.sizes.transitions = 7;
    mutant('M4.omitted-component-leaks-state', deliveryProblems(r).length > 0);
  }
  { // M5: the serializer mirror drops a store
    const r = clone(recs.FULL); r.brain.start.brainHash = '1'.repeat(64);
    mutant('M5.serializer-round-trip-breaks', roundtripProblems(r).length > 0);
  }
  { // M5b: a delivered brain that is not the claimed world's training output (swapped donor/own)
    const r = clone(recs.FULL); r.input.brainWorld = D.world;
    const r2 = clone(recs.SHAM); r2.input.brainWorld = W.world;
    mutant('M5b.own-brain-claimed-from-the-donor-world', provenanceProblems(r, trainBy).length > 0);
    mutant('M5b.donor-brain-claimed-from-the-own-world', provenanceProblems(r2, trainBy).length > 0);
  }
  { // M6: cold arm that is secretly given a brain
    const r = clone(recs.COLD); r.brain.deliveredHash = 'abc';
    mutant('M6.cold-arm-receives-a-brain', deliveryProblems(r).length > 0);
  }
  { // M7: donor equals self / other goal / other block
    const bad = clone(plan); bad[1].donor = 1;
    const bad2 = clone(plan); bad2[1].donor = plan.findIndex(p => p.goal !== plan[1].goal);
    const bad3 = clone(plan); bad3[1].trainSeed = bad3[1].testSeed;
    mutant('M7.donor-is-the-world-itself', planProblems(bad).length > 0);
    mutant('M7.donor-has-another-goal', planProblems(bad2).length > 0);
    mutant('M7.train-seed-equals-test-seed', planProblems(bad3).length > 0);
    check('M7.the-real-plan-is-sound', planProblems(plan).length === 0, planProblems(plan).join('; '));
  }
  { // M8: arms of a world do not share the test seed / an arm is duplicated / a world got another world's brain
    const rs = Object.values(recs).map(clone);
    const a = clone(rs); a[1].input.agentSeed += 2;
    const b = clone(rs); b[2].input.arm = b[1].input.arm;
    const c = clone(rs); c.find(r => r.input.arm === 'FULL').input.brainWorld = 99;
    mutant('M8.arms-use-different-seeds', pairingProblems(a, armsUnderTest).length > 0);
    mutant('M8.duplicated-arm', pairingProblems(b, armsUnderTest).length > 0);
    mutant('M8.wrong-brain-provenance', pairingProblems(c, armsUnderTest).length > 0);
  }
  { // M9: analysis arithmetic against an exact fixture, and against a sign-flipped one
    const mk = (w, arm, goalReaches) => ({ input: { world: w, arm, goal: 8 }, endpoints: { goalReaches, attemptSuccess: 0.5, slipsPerCall: 0.1, earlyReaches: 1 }, diagnostics: { top3UndirectedShare: 0.4, replayCalls: 10 } });
    const rows = [];
    [10, 20, 30].forEach((cold, w) => { rows.push(mk(w, 'COLD', cold), mk(w, 'FULL', cold + 4)); });
    const s = summarize(rows, []);
    const prim = s.contrasts.find(c => c.name === C.PRIMARY.contrast).endpoints.goalReaches;
    check('M9.analysis-matches-the-exact-fixture', prim.mean === 4 && prim.median === 4 && prim.positive === 3 && prim.negative === 0 && prim.n === 3);
    const flipped = rows.map(r => (r.input.arm === 'FULL' ? { ...r, endpoints: { ...r.endpoints, goalReaches: r.endpoints.goalReaches - 8 } } : r));
    const s2 = summarize(flipped, []).contrasts.find(c => c.name === C.PRIMARY.contrast).endpoints.goalReaches;
    mutant('M9.analysis-detects-a-sign-change', s2.mean === -4 && s2.negative === 3);
  }

  // ============ E: lodged evidence ============
  const resultsDir = path.join(HERE, 'results');
  const lodged = fs.existsSync(resultsDir) ? fs.readdirSync(resultsDir).filter(f => /^summary_block[AB]\.json$/.test(f)) : [];
  if (lodged.length === 0) console.log('SKIP E: no lodged result summaries');
  for (const f of lodged) {
    const s = JSON.parse(fs.readFileSync(path.join(resultsDir, f), 'utf8'));
    check(`E.${f}.status-is-exploratory`, s.status === 'DEVELOPMENT_EXPLORATORY' && s.schema === 'xfer1.summary/1');
    check(`E.${f}.every-world-has-every-arm`, s.worlds.every(w => s.armOrder.every(a => Array.isArray(s.perWorld[w].arms[a]) && s.perWorld[w].arms[a].length === C.ENDPOINTS.length)));
    const prim = s.contrasts.find(c => c.name === C.PRIMARY.contrast);
    const diffs = s.worlds.map(w => s.perWorld[w].arms.FULL[0] - s.perWorld[w].arms.COLD[0]);
    check(`E.${f}.primary-contrast-recomputes`, prim && Math.abs(prim.endpoints.goalReaches.mean - mean(diffs)) < 1e-9 && prim.endpoints.goalReaches.n === s.worlds.length);
    check(`E.${f}.bootstrap-recomputes`, (() => { const ci = bootstrapMeanCi(diffs, C.BOOTSTRAP); return ci.lower === prim.endpoints.goalReaches.ci.lower && ci.upper === prim.endpoints.goalReaches.ci.upper; })());
    check(`E.${f}.manifest-digest-recorded`, /^[0-9a-f]{64}$/.test(s.manifestDigest));
  }
} finally {
  fs.rmSync(scratch, { recursive: true, force: true });
}

function COMPONENTS_EMPTY(sizes) { return C.COMPONENTS.every(c => sizes[c] === 0); }

console.log(`\nRESULT: ${passed} checks passed, ${failed} failed; mutants caught ${mutCaught}, missed ${mutMissed}`);
if (failed || mutMissed) { console.log(fails.join('\n')); process.exit(1); }
