// ==========================================================
// XFER-2 — verification gate (design integrity; prints no outcome)
// ==========================================================
//   node experiments/xfer2/verify_xfer2.mjs
// Sections
//   S  static     : declarations, classification rule, seed freshness, source hygiene
//   C  construct  : the control stores are what they claim to be (validity of the controls, outcome-free)
//   R  runtime    : the replay switch and the decision-time reads, checked against the runtime's own code and module
//   B  delivery   : each arm's store is delivered exactly (on an XFER-1 world outside blocks C and D); NO endpoint is read
//   M  mutants    : deliberately broken builders must be caught by the same checks (anti-vacuity)
// Needs the prepared conformed tree.  Writes nothing in the repository; scratch lives in a fresh temporary directory.
// ==========================================================
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildTree } from '../h1r/build_tree.mjs';
import { generateAcceptedStream } from '../m7/env.js';
import * as X1 from '../xfer1/config.mjs';
import { componentHashes } from '../xfer1/brain.mjs';
import * as C from './config.mjs';
import { makeGraph, coverStore, noReplay, reversedNoReplay, replayEligible, storeStats } from './controls.mjs';
import { storeFor, deliveryFor } from './arms.mjs';
import { representationProblems, coverProblems, noReplayProblems, reversedProblems, deliveryProblems } from './checks.mjs';
import { DEVELOPMENT_DOMAIN, DEV_BLOCK, BLOCK } from '../mcf1/config.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
let passed = 0, failed = 0, caught = 0, missed = 0;
const fails = [];
const check = (id, cond, detail = '') => { if (cond) passed++; else { failed++; fails.push(`${id} ${detail}`); } console.log(`${cond ? 'PASS' : 'FAIL'} ${id}${cond || !detail ? '' : ' :: ' + detail}`); };
const mutant = (id, ok, detail = '') => { if (ok) caught++; else missed++; console.log(`${ok ? 'CAUGHT' : 'MISSED'} ${id}${ok || !detail ? '' : ' :: ' + detail}`); };
const URLOF = (...p) => pathToFileURL(path.join(...p)).href;
const clone = (o) => JSON.parse(JSON.stringify(o));

const g = makeGraph(JSON.parse(fs.readFileSync(path.join(ROOT, 'connections.json'), 'utf8')));
const neurons = JSON.parse(fs.readFileSync(path.join(ROOT, 'neurons.json'), 'utf8'));
const LABEL = Object.fromEntries((Array.isArray(neurons) ? neurons : neurons.neurons).map(n => [Number(n.id), n.label]));
const labelOf = (n) => LABEL[n];

// ============ S: static ============
{
  check('S1.arms-and-contrasts-declared', C.CONTRASTS.every(([n, t, r]) => C.ARMS[t] && C.ARMS[r]));
  check('S1.primary-arms-are-the-five-needed', JSON.stringify(C.PRIMARY_ARMS) === JSON.stringify(['COLD', 'REAL', 'REAL_NR', 'COVER', 'COVER_NR']));
  check('S1.predictions-have-unique-ids', new Set(C.PREDICTIONS.map(p => p.id)).size === C.PREDICTIONS.length && C.PREDICTIONS.length === 6);
  check('S1.blocks-disjoint-and-after-xfer1', C.BLOCKS.C.lo === 80 && C.BLOCKS.C.hi + 1 === C.BLOCKS.D.lo && C.BLOCKS.D.hi + 1 === C.WORLDS_TOTAL && C.blockOf(79) === null && C.blockOf(80) === 'C' && C.blockOf(151) === 'D');
  check('S1.block-sizes-balance-goals', (C.BLOCKS.C.hi - C.BLOCKS.C.lo + 1) % 4 === 0 && (C.BLOCKS.D.hi - C.BLOCKS.D.lo + 1) % 4 === 0);
  // seeds: fresh relative to XFER-1 (worlds 0..79 use SEED_BASE .. SEED_BASE + 159) and inside the declared domain
  const seeds = [];
  for (let w = C.BLOCKS.C.lo; w <= C.BLOCKS.D.hi; w++) seeds.push(C.trainSeed(w), C.testSeed(w));
  check('S2.seeds-fresh-relative-to-xfer1', seeds.every(s => s > C.SEED_BASE + 159));
  check('S2.seeds-inside-development-domain-and-clear-of-census-and-candidate', seeds.every(s => s >= DEVELOPMENT_DOMAIN.lo && s <= DEVELOPMENT_DOMAIN.hi && (s < DEV_BLOCK.start || s >= DEV_BLOCK.start + DEV_BLOCK.count) && (s < BLOCK.start || s >= BLOCK.start + BLOCK.scanLength)));
  check('S2.seeds-pairwise-distinct', new Set(seeds).size === seeds.length);
  // the classification rule on its boundaries
  check('S3.classify-bins', C.classify(0.80, { lower: 0.8, upper: 0.9 }) === 'REPRODUCES' && C.classify(0.79, { lower: 0.5, upper: 0.7 }) === 'PARTIAL' && C.classify(0.39, { lower: 0.1, upper: 0.3 }) === 'DOES_NOT_REPRODUCE');
  check('S3.classify-flags-straddling-intervals', C.classify(0.85, { lower: 0.6, upper: 1.1 }) === 'REPRODUCES_AMBIGUOUS' && C.classify(0.1, { lower: -0.2, upper: 0.5 }) === 'DOES_NOT_REPRODUCE_AMBIGUOUS');
  check('S3.interpret-refuses-when-invalid', /^INVALID/.test(C.interpret({ valid: false, covNR: 'REPRODUCES', cov: 'REPRODUCES', realNR: 'REPRODUCES', revNR: 'REPRODUCES' })));
  check('S3.interpret-names-the-unlock-explanation', /attenuation/.test(C.interpret({ valid: true, covNR: 'REPRODUCES', cov: 'PARTIAL', realNR: 'REPRODUCES', revNR: 'DOES_NOT_REPRODUCE' })));
  check('S3.interpret-never-overclaims-when-mixed', /Inconclusive|mixed/i.test(C.interpret({ valid: true, covNR: 'PARTIAL', cov: 'PARTIAL', realNR: 'PARTIAL', revNR: 'PARTIAL' })));
  // hygiene
  const srcs = fs.readdirSync(HERE).filter(f => f.endsWith('.mjs') && f !== 'verify_xfer2.mjs');
  const bad = [];
  for (const f of srcs) {
    const t = fs.readFileSync(path.join(HERE, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    if (/Date\.now|new Date\(|Math\.random|performance\.now/.test(t)) bad.push(`${f}: clock or ambient randomness`);
    if (/H1R_STAGE_AUTHORISED\s*=/.test(t)) bad.push(`${f}: sets a stage authorisation`);
    if (/[A-Za-z]:[\\/]+Users|\/Users\/|\/home\//.test(t)) bad.push(`${f}: local absolute path`);
  }
  check('S4.source-hygiene', bad.length === 0, bad.join('; '));
}

// ============ C: construct validity of the controls ============
const cover = coverStore(g, labelOf, { tag: 'cover' });
const coverNR = noReplay(cover);
{
  check('C1.cover-is-valid-goal-free-saturated', coverProblems(cover, g, labelOf).length === 0, coverProblems(cover, g, labelOf).join('; '));
  const again = coverStore(g, labelOf, { tag: 'cover' });
  check('C1.cover-is-deterministic', JSON.stringify(again) === JSON.stringify(cover));
  check('C1.cover-is-world-independent-pure-function-of-the-graph', coverStore.length <= 3);   // (g, labelOf, options): no goal or brain argument
  const st = storeStats(cover, g, 12);
  check('C1.cover-gate-retention-is-uniform', Math.abs(st.gateMean.goalward - 1) < 1e-12 && Math.abs(st.gateMean.away - 1) < 1e-12 && Math.abs(st.gateMean.level - 1) < 1e-12);
  check('C1.cover-integrity-is-uniform', Math.abs(st.integrityMean.goalward - 1) < 1e-12 && Math.abs(st.integrityMean.away - 1) < 1e-12);
  check('C1.cover-replay-eligible-share-matches-real-simple-share', Math.abs(st.replayEligibleFraction - C.COVER.simpleFraction) < 0.01, String(st.replayEligibleFraction));
  check('C1.cover-nr-is-replay-ineligible-and-read-identical', storeStats(coverNR, g, 12).replayEligibleFraction === 0 && JSON.stringify(storeStats(coverNR, g, 12).edgeCounts) === JSON.stringify(st.edgeCounts));
  // pooled real stores of block-A world 1 (trained in scratch below) are checked in the B section; here: synthetic real-like store
  const syntheticReal = [[3, 6, 1, 4, 9, 12], [10, 9, 12], [7, 6, 1, 4, 9, 12], [2, 1, 4, 3, 4, 9]].map((n, i) => ({ ...cover[0], id: `r${i}`, nodes: n, labels: n.map(labelOf), transitions: n.slice(0, -1).map((from, k) => ({ from, to: n[k + 1], position: k, terminal: k === n.length - 2 })), unique: new Set(n).size, diversity: new Set(n).size / n.length, quality: 0.85 }));
  const syn = syntheticReal.filter(e => g.directed.has(`${e.nodes[0]}->${e.nodes[1]}`));
  check('C2.noreplay-keeps-structure-and-drops-eligibility', noReplayProblems(noReplay(syn), syn, g).length === 0, noReplayProblems(noReplay(syn), syn, g).join('; '));
  check('C2.noreplay-leaves-every-decision-time-read-unchanged', JSON.stringify(storeStats(noReplay(syn), g, 12).edgeCounts) === JSON.stringify(storeStats(syn, g, 12).edgeCounts) && JSON.stringify(storeStats(noReplay(syn), g, 12).gateMean) === JSON.stringify(storeStats(syn, g, 12).gateMean) && JSON.stringify(storeStats(noReplay(syn), g, 12).integrityMean) === JSON.stringify(storeStats(syn, g, 12).integrityMean));
  const rev = reversedNoReplay(syn, labelOf);
  check('C3.reversal-is-exact-and-ineligible', reversedProblems(rev, syn, g).length === 0, reversedProblems(rev, syn, g).join('; '));
  const a = storeStats(syn, g, 12), b = storeStats(rev, g, 12);
  check('C3.reversal-mirrors-gate-retention-by-edge-class', Math.abs(a.gateMean.goalward - b.gateMean.away) < 1e-12 && Math.abs(a.gateMean.away - b.gateMean.goalward) < 1e-12);
  check('C3.reversal-preserves-undirected-exposure', a.transitions === b.transitions);
  check('C4.representation-rules-accept-the-real-shape', representationProblems(syn, g, labelOf).length === 0, representationProblems(syn, g, labelOf).join('; '));
}

// ============ R: the runtime's replay switch and decision-time reads ============
const tree = buildTree();
const TREE = tree.dir;
{
  // R1 static: decision-time reads never consult `quality` (F1)
  const main = fs.readFileSync(path.join(TREE, 'main.js'), 'utf8');
  const body = (src, header) => { const i = src.indexOf(header); if (i < 0) return null; let d = 0, j = src.indexOf('{', i); const s = j; for (; j < src.length; j++) { if (src[j] === '{') d++; else if (src[j] === '}') { d--; if (d === 0) break; } } return src.slice(s, j + 1); };
  const reads = ['function rebuildAdjacencyMemory', 'function trajectoryConfidence', 'function computeTrajectoryIntegrity'].map(h => [h, body(main, h)]);
  check('R1.decision-time-read-functions-found', reads.every(([, b]) => b !== null));
  check('R1.decision-time-reads-never-consult-quality', reads.every(([, b]) => b !== null && !/quality/.test(b)));
  const em = fs.readFileSync(path.join(TREE, 'render', 'episodeManager.js'), 'utf8');
  const ga = body(em, 'export function getAllEpisodes');
  check('R1.getAllEpisodes-applies-no-filter', ga !== null && !/quality|filter\(/.test(ga));
  const rp = body(em, 'export function replayOneEpisode');
  check('R1.replay-eligibility-rule-is-the-mirrored-one', rp !== null && /ep\.quality < 0\.5/.test(rp) && /ep\.nodes\.length < 3/.test(rp) && /isSimplePath/.test(rp) && /ep\.source === "replay" \|\| ep\.source === "imagination"/.test(rp));
}
{
  // R2 behavioural: the tree's own episodeManager, a recording system stub; a store is replayed only when eligible
  const probe = async (episodes, tag, tries = 80) => {
    const mod = await import(`${URLOF(TREE, 'render', 'episodeManager.js')}?probe=${tag}`);
    const calls = { updateQ: 0, writeReward: 0 };
    const sys = {
      findNeuronById: (id) => ({ userData: { neighbors: g.neighbors.get(Number(id)) || [] } }),
      transitions: new Map(), rewards: new Map(), confidenceMap: new Map(),
      PROVENANCE: { MANUAL_TRAINING: 'MANUAL', DIRECT_EXPERIENCE: 'DIRECT' },
      makeStateKey: (n, goal) => `${n}#${goal}`,
      updateQ() { calls.updateQ++; }, writeReward() { calls.writeReward++; },
      logActivation() {}, learnMomentum() {}, trainEmbedding() {}, reinforceSemanticStrength() {}, reinforceEpisodeSemantics() {}, recordSuccess() {}, reinforcePath() {}, rebuildSchemas() {},
    };
    const log = console.log; console.log = () => {};
    try { mod.initEpisodeManager(sys); mod.loadEpisodes(clone(episodes)); for (let i = 0; i < tries; i++) mod.replayOneEpisode(); } finally { console.log = log; }
    return calls;
  };
  const on = await probe(cover, 'on'), off = await probe(coverNR, 'off');
  check('R2.eligible-store-is-replayed-into-procedural-learning', on.updateQ > 0 && on.writeReward > 0, JSON.stringify(on));
  check('R2.quality-below-half-switches-replay-learning-off', off.updateQ === 0 && off.writeReward === 0, JSON.stringify(off));
  const loops = cover.filter(e => new Set(e.nodes).size !== e.nodes.length).map(e => ({ ...e, quality: 0.9 }));
  const lp = await probe(loops, 'loops');
  check('R2.loop-containing-episodes-are-never-replayed-regardless-of-quality', lp.updateQ === 0, JSON.stringify(lp));
}

// ============ B: delivery on an XFER-1 world (no endpoint is read or printed) ============
const scratch = fs.mkdtempSync(path.join(fs.realpathSync.native(os.tmpdir()), 'xfer2-verify-'));
try {
  const stream = generateAcceptedStream(X1.CONFIG_START, 6);
  const plan = X1.planWorlds(stream);
  const W = plan[1], DSG = plan[W.donor], DXG = plan[2];            // world 1 (goal 12), same-goal donor 5, other-goal donor 2 (goal 16)
  const session = (input) => {
    const r = spawnSync(process.execPath, [path.join(ROOT, 'experiments', 'xfer1', 'session.mjs'), JSON.stringify(input)], { encoding: 'utf8', maxBuffer: 1 << 28 });
    const m = r.stdout.match(/@@RESULT@@(.*)@@END@@/s);
    return { code: r.status, rec: m ? JSON.parse(m[1]) : null, stderr: (r.stderr || '').slice(-300) };
  };
  const brainPath = (w) => path.join(scratch, `w${w.world}.json`);
  const trained = {};
  for (const w of [W, DSG, DXG]) {
    const r = session({ role: 'train', label: `v2-train-w${w.world}`, tree: TREE, world: w.world, configSeed: w.configSeed, configIndex: w.configIndex, agentSeed: w.trainSeed, ticks: X1.TICKS.train, exportPath: brainPath(w) });
    trained[w.world] = r.rec && fs.existsSync(brainPath(w)) ? JSON.parse(fs.readFileSync(brainPath(w), 'utf8')) : null;
    check(`B0.training-w${w.world}-completes`, r.rec !== null && !r.rec.outcome.crashed && r.rec.outcome.completed, r.stderr);
  }
  const real = trained[W.world].episodes;
  check('B0.real-store-is-a-valid-persisted-store', representationProblems(real, g, labelOf).length === 0, representationProblems(real, g, labelOf).slice(0, 3).join('; '));
  check('B0.real-store-is-not-trivially-empty', real.length >= 20, String(real.length));
  const ctx = { realEpisodes: real, donorSG: trained[DSG.world].episodes, donorXG: trained[DXG.world].episodes, cover, coverNR, labelOf };
  check('B1.noreplay-of-the-real-store-is-exact', noReplayProblems(noReplay(real), real, g).length === 0, noReplayProblems(noReplay(real), real, g).join('; '));
  check('B1.reversal-of-the-real-store-is-exact', reversedProblems(reversedNoReplay(real, labelOf), real, g).length === 0, reversedProblems(reversedNoReplay(real, labelOf), real, g).join('; '));
  check('B1.cover-independent-of-the-real-store', coverProblems(cover, g, labelOf, [real]).length === 0, coverProblems(cover, g, labelOf, [real]).join('; '));
  {
    const sr = storeStats(real, g, W.goal), sc = storeStats(cover, g, W.goal), sn = storeStats(noReplay(real), g, W.goal), sv = storeStats(reversedNoReplay(real, labelOf), g, W.goal);
    check('B1.real-store-reads-are-sparse-and-goalward', sr.directedEdgesAtLeast5 < sc.directedEdgesAtLeast5 && sr.gateMean.goalward > sr.gateMean.away);
    check('B1.noreplay-reads-equal-real-reads', JSON.stringify(sn.edgeCounts) === JSON.stringify(sr.edgeCounts) && sn.replayEligibleFraction === 0);
    check('B1.reversal-mirrors-real-reads', Math.abs(sv.gateMean.away - sr.gateMean.goalward) < 1e-12 && Math.abs(sv.gateMean.goalward - sr.gateMean.away) < 1e-12);
  }
  const recs = {};
  for (const arm of C.ARM_ORDER) {
    const store = storeFor(arm, ctx), d = deliveryFor(arm);
    const input = { role: 'test', label: `v2-${arm}-w${W.world}`, tree: TREE, world: W.world, configSeed: W.configSeed, configIndex: W.configIndex, agentSeed: W.testSeed, ticks: X1.TICKS.test, arm: d.session };
    if (d.source === 'file') { const f = path.join(scratch, `${arm}_w${W.world}.json`); fs.writeFileSync(f, JSON.stringify({ episodes: store })); input.brainPath = f; input.brainWorld = W.world; }
    if (d.source === 'donor') { input.brainPath = brainPath(arm === 'DONOR_SG' ? DSG : DXG); input.brainWorld = arm === 'DONOR_SG' ? DSG.world : DXG.world; }
    const r = session(input);
    recs[arm] = r.rec;
    check(`B2.${arm}.completes`, r.rec !== null && r.rec.outcome.completed && !r.rec.outcome.crashed, r.stderr);
    if (r.rec) {
      const expected = store === null ? null : componentHashes({ episodes: store }).episodes;
      const pr = deliveryProblems(r.rec, expected, store === null ? 0 : store.length);
      check(`B2.${arm}.delivered-store-is-exactly-the-control-store`, pr.length === 0, pr.join('; '));
    }
  }
  check('B3.arms-share-seed-and-configuration', (() => { const rs = Object.values(recs).filter(Boolean); return new Set(rs.map(r => r.input.agentSeed)).size === 1 && new Set(rs.map(r => r.input.acceptedConfigSeed)).size === 1; })());
  check('B3.donor-stores-are-other-worlds', recs.DONOR_SG && recs.DONOR_XG && recs.DONOR_SG.input.brainWorld !== W.world && recs.DONOR_XG.input.brainWorld !== W.world && DSG.goal === W.goal && DXG.goal !== W.goal);
  // determinism of two arms (fingerprint equality only; the value is not printed)
  for (const arm of ['REAL_NR', 'COVER']) {
    const store = storeFor(arm, ctx), f = path.join(scratch, `${arm}_w${W.world}.json`);
    const r = session({ role: 'test', label: `v2-${arm}-again`, tree: TREE, world: W.world, configSeed: W.configSeed, configIndex: W.configIndex, agentSeed: W.testSeed, ticks: X1.TICKS.test, arm: 'ONLY_episodes', brainPath: f, brainWorld: W.world });
    check(`B4.${arm}.session-is-deterministic`, r.rec !== null && r.rec.artifacts.fingerprint === recs[arm].artifacts.fingerprint);
  }
  check('B5.the-controls-change-behaviour-relative-to-cold', ['REAL', 'REAL_NR', 'COVER', 'COVER_NR', 'REV_NR'].every(a => recs[a] && recs[a].artifacts.fingerprint !== recs.COLD.artifacts.fingerprint));

  // ============ M: mutants ============
  // M1 cover leaks the goal: every episode ends at the goal
  { const leak = cover.map((e, i) => { const n = e.nodes.slice(0, -1).concat([12]); return { ...e, nodes: n, labels: n.map(labelOf) }; });
    mutant('M1.cover-that-ends-at-the-goal-is-rejected', coverProblems(leak, g, labelOf).length > 0); }
  // M2 cover under-saturated (too few episodes)
  { let threw = false; try { coverStore(g, labelOf, { count: 20 }); } catch { threw = true; }
    mutant('M2.unsaturated-cover-is-rejected', threw); }
  // M3 cover contains a non-edge move
  { const bad = clone(cover); bad[3].nodes[1] = bad[3].nodes[0] === 20 ? 1 : 20; mutant('M3.non-edge-move-is-rejected', representationProblems(bad, g, labelOf).length > 0); }
  // M4 cover that copies real episodes verbatim
  { const mix = clone(cover); for (let i = 0; i < 40 && i < real.length; i++) mix[i] = { ...real[i], id: `leak_${i}` };
    mutant('M4.cover-copying-real-episodes-is-rejected', coverProblems(mix, g, labelOf, [real]).length > 0); }
  // M5 no-replay builder that forgets to lower quality
  { const forgot = real.map(e => ({ ...e, id: `${e.id}_nr` })); mutant('M5.noreplay-that-keeps-quality-is-rejected', noReplayProblems(forgot, real, g).length > 0 || real.every(e => !replayEligible(e, g))); }
  // M6 no-replay builder that also alters structure
  { const tampered = noReplay(real).map((e, i) => (i === 0 ? { ...e, nodes: e.nodes.slice().reverse() } : e)); mutant('M6.noreplay-that-changes-structure-is-rejected', noReplayProblems(tampered, real, g).length > 0); }
  // M7 reversal that is not a reversal
  { const notRev = reversedNoReplay(real, labelOf).map((e, i) => ({ ...e, nodes: real[i].nodes.slice(), labels: real[i].labels.slice() })); mutant('M7.reversal-that-keeps-direction-is-rejected', reversedProblems(notRev, real, g).length > 0 || real.length === 0); }
  // M8 delivery of the wrong store / a leaked procedural store
  { const r = clone(recs.REAL_NR); const exp = componentHashes({ episodes: storeFor('REAL_NR', ctx) }).episodes;
    const wrong = clone(r); wrong.brain.deliveredHashes.episodes = componentHashes({ episodes: real }).episodes;
    mutant('M8.delivery-of-the-replayable-store-in-place-of-the-nr-store', deliveryProblems(wrong, exp, real.length).length > 0);
    const leaky = clone(r); leaky.brain.start.sizes.Q = 3;
    mutant('M8.procedural-state-leaking-into-an-episodes-only-arm', deliveryProblems(leaky, exp, real.length).length > 0); }
  // M9 the replay switch: a store whose NR copy is still eligible must register in the runtime probe
  { const stillEligible = cover.map(e => ({ ...e, quality: 0.51 }));
    const mod = await import(`${URLOF(TREE, 'render', 'episodeManager.js')}?probe=mut`);
    const calls = { updateQ: 0 };
    const sys = { findNeuronById: (id) => ({ userData: { neighbors: g.neighbors.get(Number(id)) || [] } }), transitions: new Map(), rewards: new Map(), confidenceMap: new Map(), PROVENANCE: { MANUAL_TRAINING: 'M', DIRECT_EXPERIENCE: 'D' }, makeStateKey: (n, gl) => `${n}#${gl}`, updateQ() { calls.updateQ++; }, writeReward() {}, logActivation() {}, learnMomentum() {}, trainEmbedding() {}, reinforceSemanticStrength() {}, reinforceEpisodeSemantics() {}, recordSuccess() {}, reinforcePath() {}, rebuildSchemas() {} };
    const log = console.log; console.log = () => {};
    try { mod.initEpisodeManager(sys); mod.loadEpisodes(clone(stillEligible)); for (let i = 0; i < 80; i++) mod.replayOneEpisode(); } finally { console.log = log; }
    mutant('M9.quality-0.51-still-replays-so-the-switch-threshold-matters', calls.updateQ > 0); }
  // M10 analysis rule: a classification mutant that ignores the interval must differ from the declared rule
  { const naive = (r) => (r >= 0.8 ? 'REPRODUCES' : r >= 0.4 ? 'PARTIAL' : 'DOES_NOT_REPRODUCE');
    mutant('M10.interval-straddling-is-not-silently-classified', C.classify(0.85, { lower: 0.2, upper: 1.2 }) !== naive(0.85)); }
} finally {
  fs.rmSync(scratch, { recursive: true, force: true });
}

// ============ A: analysis rules on exact fixtures ============
{
  const { evaluateBlock, ratioCi } = await import('./analyze.mjs');
  // fixture: 12 worlds; COLD = 100 + w; REAL benefit 100 in every world; arm benefits chosen per case
  const mkBlock = (ben, { breakWorld = null, dropArm = null, wrongHash = null } = {}) => {
    const worlds = Array.from({ length: 12 }, (_, k) => 80 + k);
    const records = new Map(), controls = {};
    const plan = { block: 'C', arms: C.ARM_ORDER, worlds: worlds.map(w => ({ world: w, goal: [8, 12, 16, 19][w % 4] })), validWorlds: worlds, exclusions: [] };
    for (const w of worlds) {
      controls[w] = { realEpisodes: 40, arms: {} };
      for (const arm of C.ARM_ORDER) {
        const h = arm === 'COLD' ? null : `hash_${arm}_${w}`;
        controls[w].arms[arm] = { storeHash: h, episodes: arm === 'COLD' ? 0 : 40 };
        if (dropArm === arm && breakWorld === w) continue;
        const goal = 100 + w + (arm === 'COLD' ? 0 : ben[arm]);
        const sizes = { transitions: 0, rewards: 0, penalties: 0, signals: 0, curiosity: 0, Q: 0, confidence: 0, episodes: arm === 'COLD' ? 0 : 40 };
        records.set(`x2-${arm}-w${w}`, {
          input: { agentSeed: C.testSeed(w), acceptedConfigSeed: 200000 + w }, outcome: { crashed: false, completed: true }, h1r: { drawFaults: 0, blockedIllegal: 0 },
          endpoints: { goalReaches: goal, attemptSuccess: 0.7, slipsPerCall: 0.2, earlyReaches: goal / 3 },
          brain: { deliveredHash: arm === 'COLD' ? 'none' : 'x', deliveredHashes: arm === 'COLD' ? null : { episodes: wrongHash === arm && breakWorld === w ? 'bad' : h },
            start: { hashes: { episodes: h }, sizes } },
        });
      }
    }
    return { records, plan, controls };
  };
  const base = { REAL: 100, REAL_NR: 90, COVER: 40, COVER_NR: 100, REV_NR: 5, DONOR_SG: 70, DONOR_XG: 20 };
  const ok = evaluateBlock(mkBlock(base));
  check('A1.valid-fixture-is-valid', ok.valid, ok.problems.join('; '));
  check('A1.benefit-and-share-are-exact', Math.abs(ok.benefit.REAL.mean - 100) < 1e-9 && Math.abs(ok.share.COVER_NR.R - 1) < 1e-9 && Math.abs(ok.share.REV_NR.R - 0.05) < 1e-9 && Math.abs(ok.share.REAL_NR.R - 0.9) < 1e-9);
  check('A1.classes-follow-the-declared-bins', ok.share.COVER_NR.class === 'REPRODUCES' && ok.share.REV_NR.class === 'DOES_NOT_REPRODUCE' && ok.share.DONOR_SG.class === 'PARTIAL' && ok.share.COVER.class === 'PARTIAL');
  check('A1.predictions-evaluate-as-declared', ok.predictions.find(p => p.id === 'P1').pass && ok.predictions.find(p => p.id === 'P2').pass && ok.predictions.find(p => p.id === 'P3').pass && ok.predictions.find(p => p.id === 'P4').pass && ok.predictions.find(p => p.id === 'P5').pass === true && ok.predictions.find(p => p.id === 'P6').pass);
  check('A1.verdict-names-the-unlock-explanation-when-cover-nr-reproduces', /attenuation/.test(ok.verdict));
  // the opposite world: cover does nothing, real decision-time reads carry it
  const opp = evaluateBlock(mkBlock({ ...base, COVER_NR: 0, COVER: 0 }));
  check('A2.verdict-when-generic-exposure-fails-and-real-reads-succeed', /does not reproduce the benefit but the real episodes/.test(opp.verdict), opp.verdict);
  const replay = evaluateBlock(mkBlock({ ...base, COVER_NR: 0, COVER: 0, REAL_NR: 0 }));
  check('A2.verdict-when-only-replay-learning-reproduces', /depends on replay learning/.test(replay.verdict), replay.verdict);
  // integrity: a missing arm record, a wrong delivered store, and a non-reproducing REAL each make the block invalid / uninterpreted
  const missing = evaluateBlock(mkBlock(base, { breakWorld: 83, dropArm: 'COVER' }));
  mutant('A3.missing-record-invalidates-the-block', !missing.valid && /INVALID/.test(missing.verdict));
  const wrong = evaluateBlock(mkBlock(base, { breakWorld: 84, wrongHash: 'REAL_NR' }));
  mutant('A3.wrong-delivered-store-invalidates-the-block', !wrong.valid);
  const nonrep = evaluateBlock(mkBlock({ ...base, REAL: 0 }));
  mutant('A3.non-reproducing-real-blocks-interpretation', nonrep.valid && nonrep.reproducesXfer1 === false && /INVALID/.test(nonrep.verdict) && nonrep.share.REAL_NR.class === 'UNDEFINED');
  // ratio interval: exact on constant ratios, and refuses a denominator that is not reliably positive
  const ci = ratioCi([5, 5, 5, 5], [10, 10, 10, 10], { replicates: 500, seed: 1, level: 0.95 });
  check('A4.ratio-interval-degenerate-on-constant-ratio', Math.abs(ci.lower - 0.5) < 1e-12 && Math.abs(ci.upper - 0.5) < 1e-12);
  const unstable = ratioCi([1, 2, 3, 4], [1, -1, 1, -1], { replicates: 2000, seed: 1, level: 0.95 });
  mutant('A4.ratio-interval-undefined-when-the-denominator-straddles-zero', unstable.lower === null);
}

console.log(`\nRESULT: ${passed} checks passed, ${failed} failed; mutants caught ${caught}, missed ${missed}`);
if (failed || missed) { console.log(fails.join('\n')); process.exit(1); }
