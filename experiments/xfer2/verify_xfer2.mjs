// ==========================================================
// XFER-2 — verification gate (design integrity; prints no study endpoint)
// ==========================================================
//   node experiments/xfer2/verify_xfer2.mjs
// Sections
//   S  static     : declarations, margin rule and its provenance (XFER-1 only), seed freshness, source hygiene
//   C  construct  : the control stores are what they claim to be (outcome-free)
//   R  runtime    : complete consumer path of `quality` over the whole conformed tree; replay call-site order (F3)
//   I  isolation  : the switch tested on the runtime: eligible stores replay, quality-0.49 stores do not (module stub and
//                   whole-runtime probe), and a store at quality 0.49 yields the same decisions as the same store at its
//                   real quality until the first replay tick
//   B  delivery   : each arm's store is delivered exactly (on an XFER-1 world outside blocks C and D); no endpoint is read
//   A  analysis   : margin rules, statuses and interpretation sentences on exact fixtures
//   M  mutants    : deliberately broken builders / rules must be caught by the same checks (anti-vacuity)
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
import { pairedSummary } from '../xfer1/stats.mjs';
import * as C from './config.mjs';
import { makeGraph, satStore, genStore, entryStore, noReplay, reversedNoReplay, replayEligible, storeStats, makeEpisode } from './controls.mjs';
import { storeFor, deliveryFor } from './arms.mjs';
import { representationProblems, satProblems, genProblems, entryProblems, noReplayProblems, reversedProblems, deliveryProblems } from './checks.mjs';
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
  check('S1.primary-arms', JSON.stringify(C.PRIMARY_ARMS) === JSON.stringify(['COLD', 'REAL', 'REAL_NR', 'GEN_NR', 'SAT_NR']));
  check('S1.six-predictions-with-unique-ids', new Set(C.PREDICTIONS.map(p => p.id)).size === 6);
  check('S1.blocks-disjoint-and-after-xfer1', C.BLOCKS.C.lo === 80 && C.BLOCKS.C.hi + 1 === C.BLOCKS.D.lo && C.BLOCKS.D.hi + 1 === C.WORLDS_TOTAL && C.blockOf(79) === null && C.blockOf(80) === 'C' && C.blockOf(231) === 'D' && C.blockOf(232) === null);
  const seeds = [];
  for (let w = C.BLOCKS.C.lo; w <= C.BLOCKS.D.hi; w++) seeds.push(C.trainSeed(w), C.testSeed(w));
  check('S2.seeds-fresh-and-inside-the-domain', seeds.every(s => s > C.SEED_BASE + 159 && s >= DEVELOPMENT_DOMAIN.lo && s <= DEVELOPMENT_DOMAIN.hi && (s < DEV_BLOCK.start || s >= DEV_BLOCK.start + DEV_BLOCK.count) && (s < BLOCK.start || s >= BLOCK.start + BLOCK.scanLength)) && new Set(seeds).size === seeds.length);
  // margin rule: boundaries, and provenance of the thresholds from XFER-1 ONLY (a different experiment)
  const ci = (lower, upper) => ({ lower, upper });
  check('S3.classifyShortfall-boundaries', C.classifyShortfall(ci(0, 24.99)) === 'NON_INFERIOR' && C.classifyShortfall(ci(25, 40)) === 'FALLS_SHORT' && C.classifyShortfall(ci(10, 40)) === 'INCONCLUSIVE'
    && C.classifyShortfall(ci(-60, -25)) === 'EXCEEDS' && C.classifyShortfall(ci(-60, -24)) === 'NON_INFERIOR' && C.classifyShortfall(ci(null, null)) === 'UNDEFINED');
  check('S3.min-real-benefit-is-twice-delta', C.MARGIN.minRealBenefit === 2 * C.MARGIN.delta);
  {
    // power: the replication block must be large enough to classify a shortfall against DELTA, from XFER-1 variability only
    const r = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, 'experiments', 'xfer1', 'results', f), 'utf8'));
    const A = r('summary_blockA.json'), B = r('summary_blockB.json');
    const ws = [...A.worlds.map(w => [A, w]), ...B.worlds.map(w => [B, w])];
    const sdOf = (t, ref) => { const d = ws.map(([S, w]) => S.perWorld[w].arms[t][0] - S.perWorld[w].arms[ref][0]); const m = d.reduce((s, x) => s + x, 0) / d.length; return Math.sqrt(d.reduce((s, x) => s + (x - m) ** 2, 0) / (d.length - 1)); };
    const sds = [['ONLY_episodes', 'SHAM_EPIS'], ['ONLY_episodes', 'NOPROC'], ['ONLY_episodes', 'FULL'], ['SHAM_EPIS', 'NOPROC'], ['NO_rewards', 'FULL'], ['ONLY_transitions', 'ONLY_episodes'], ['FULL', 'SHAM'], ['NO_episodes', 'FULL']].map(([t, ref]) => sdOf(t, ref)).sort((a, b) => a - b);
    const p80 = sds[Math.floor(0.8 * sds.length)];
    const need = Math.ceil((2.8 * p80 / C.MARGIN.delta) ** 2);
    const have = C.BLOCKS.D.hi - C.BLOCKS.D.lo + 1;
    check('S5.block-D-is-powered-for-the-declared-margin', have >= need, `need ${need} worlds at SD ${p80.toFixed(0)}, have ${have}`);
    check('S5.block-C-is-small-by-design-and-never-primary', C.BLOCKS.C.hi - C.BLOCKS.C.lo + 1 < have);
  }
  {
    const a = JSON.parse(fs.readFileSync(path.join(ROOT, 'experiments', 'xfer1', 'results', 'summary_blockA.json'), 'utf8')), b = JSON.parse(fs.readFileSync(path.join(ROOT, 'experiments', 'xfer1', 'results', 'summary_blockB.json'), 'utf8'));
    const d = [...a.worlds.map(w => a.perWorld[w].arms.ONLY_episodes[0] - a.perWorld[w].arms.COLD[0]), ...b.worlds.map(w => b.perWorld[w].arms.ONLY_episodes[0] - b.perWorld[w].arms.COLD[0])];
    const s = pairedSummary(d, X1.BOOTSTRAP);
    check('S3.margins-are-anchored-in-xfer1-not-in-xfer2', s.mean > 0 && s.ci.lower >= C.MARGIN.minRealBenefit && C.MARGIN.delta >= 0.20 * s.mean && C.MARGIN.delta <= 0.30 * s.mean, `${s.mean.toFixed(1)} [${s.ci.lower.toFixed(1)}, ${s.ci.upper.toFixed(1)}]`);
  }
  check('S3.interpret-refuses-without-reproduction', /^DID_NOT_REPRODUCE/.test(C.interpret({ status: 'DID_NOT_REPRODUCE' })) && /^NOT_INTERPRETABLE_LOW_BENEFIT/.test(C.interpret({ status: 'NOT_INTERPRETABLE_LOW_BENEFIT' })));
  check('S3.interpret-names-the-handicap-only-when-the-upper-bound-reproduces', /attenuation/.test(C.interpret({ status: 'OK', satVsRealNR: 'NON_INFERIOR', genVsRealNR: 'FALLS_SHORT', realVsRealNR: 'NON_INFERIOR', entryVsSat: 'INCONCLUSIVE', noentryVsSat: 'INCONCLUSIVE' }))
    && !/attenuation/.test(C.interpret({ status: 'OK', satVsRealNR: 'FALLS_SHORT', genVsRealNR: 'FALLS_SHORT', realVsRealNR: 'NON_INFERIOR' })) && !/attenuation/.test(C.interpret({ status: 'OK', satVsRealNR: 'INCONCLUSIVE' })));
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

// ============ C: construct validity (outcome-free fixtures) ============
const sat = satStore(g, labelOf, { quality: C.NR_QUALITY, tag: 'sat' });
{
  check('C1.saturated-store-valid-goal-free-saturated', satProblems(sat, g, labelOf).length === 0, satProblems(sat, g, labelOf).join('; '));
  check('C1.saturated-store-deterministic', JSON.stringify(satStore(g, labelOf, { quality: C.NR_QUALITY, tag: 'sat' })) === JSON.stringify(sat));
  const st = storeStats(sat, g, 12);
  check('C1.saturated-gate-and-entry-retention-are-full', st.gateMean.goalward === 1 && st.gateMean.away === 1 && st.gateMean.level === 1 && st.goalEntry.tcMean === 1);
  for (const goal of [8, 12, 16, 19]) {
    const ne = satStore(g, labelOf, { excludeInto: goal, seed: 20261015 + goal, tag: `satne${goal}`, quality: C.NR_QUALITY });
    const s2 = storeStats(ne, g, goal);
    check(`C2.no-entry-store-goal-${goal}`, satProblems(ne, g, labelOf, { excludeInto: goal }).length === 0 && s2.goalEntry.tcMean === 0 && s2.gateMean.goalward === 1, satProblems(ne, g, labelOf, { excludeInto: goal }).join('; '));
    const en = entryStore(g, labelOf, goal), s3 = storeStats(en, g, goal);
    check(`C3.entry-only-store-goal-${goal}`, entryProblems(en, g, labelOf, goal).length === 0 && s3.goalEntry.tcMean === 1 && Math.abs(s3.gateMean.goalward - 0.1) < 1e-9 && Math.abs(s3.gateMean.away - 0.1) < 1e-9 && Math.abs(s3.gateMean.level - 0.1) < 1e-9, entryProblems(en, g, labelOf, goal).join('; '));
  }
  // matched generic store on a fixture "real" store (the first 60 saturated episodes, quality restored)
  const fake = sat.slice(0, 60).map(e => ({ ...e, quality: 0.85 }));
  const gen = genStore(g, labelOf, fake, { seed: C.GEN_SEED + 7, tag: 'gen7' });
  check('C4.matched-generic-matches-count-lengths-kinds-and-transitions', genProblems(gen, fake, g, labelOf).length === 0, genProblems(gen, fake, g, labelOf).join('; '));
  check('C4.matched-generic-is-deterministic', JSON.stringify(genStore(g, labelOf, fake, { seed: C.GEN_SEED + 7, tag: 'gen7' })) === JSON.stringify(gen));
  check('C4.matched-generic-differs-with-the-world-seed', JSON.stringify(genStore(g, labelOf, fake, { seed: C.GEN_SEED + 8, tag: 'gen7' })) !== JSON.stringify(gen));
  const syn = [[3, 6, 1, 4, 9, 12], [10, 9, 12], [7, 6, 1, 4, 9, 12]].filter(p => p.slice(0, -1).every((u, i) => g.directed.has(`${u}->${p[i + 1]}`)))
    .map((n, i) => makeEpisode({ id: `r${i}`, nodes: n, labelOf, quality: 0.85 }));
  const nr = noReplay(syn), rev = reversedNoReplay(syn, labelOf);
  check('C5.noreplay-exact-and-read-identical', noReplayProblems(nr, syn, g).length === 0 && JSON.stringify(storeStats(nr, g, 12).edgeCounts) === JSON.stringify(storeStats(syn, g, 12).edgeCounts));
  { const a = storeStats(syn, g, 12), b = storeStats(rev, g, 12); const keys = [...g.directed].sort(); const idx = new Map(keys.map((k, i) => [k, i]));
    const mirrored = keys.every(k => { const [u, v] = k.split('->'); return a.edgeCounts[idx.get(k)] === b.edgeCounts[idx.get(v + '->' + u)]; });
    check('C5.reversal-exact-and-mirrors-every-directed-edge-count', reversedProblems(rev, syn, g).length === 0 && mirrored && a.transitions === b.transitions); }
  check('C5.representation-rules-accept-the-real-shape', representationProblems(syn, g, labelOf).length === 0);
}

// ============ R: complete consumer path over the whole conformed tree ============
const tree = buildTree();
const TREE = tree.dir;
{
  const skip = new Set(['Portfolio_Assets', 'node_modules', '.git', 'LAB_NOTES', 'PROJECT_MEMORY']);
  const files = [];
  const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { if (skip.has(e.name)) continue; const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (/\.m?js$/.test(e.name)) files.push(p); } };
  walk(TREE);
  const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' ')).split('\n').map(l => l.replace(/\/\/.*$/, ''));
  const hits = [];
  const callSites = { getEpisodesForBuildMap: [], getEpisodeStats: [] };
  for (const f of files) {
    const rel = path.relative(TREE, f).split(path.sep).join('/');
    let fn = '(top)';
    strip(fs.readFileSync(f, 'utf8')).forEach((line, i) => {
      const m = line.match(/(?:export\s+)?(?:async\s+)?function\s+([A-Za-z0-9_$]+)/); if (m) fn = m[1];
      if (/\.quality\b|\bquality\s*[:=]|\[['"]quality['"]\]|\bquality\b\s*[,)}]/.test(line)) hits.push({ rel, fn });
      for (const name of Object.keys(callSites)) if (new RegExp(`\\b${name}\\s*\\(`).test(line) && !/function\s/.test(line)) callSites[name].push(`${rel}:${i + 1}`);
    });
  }
  const allowed = new Set(['recordAutonomousSuccess', 'replayOneEpisode', 'getEpisodesForBuildMap', 'getEpisodeStats', 'exportEpisodes', 'loadEpisodes', '_sealBuffer', '_runPipeline', '_runPipelineMinimal', '_learnProcedural', '_learnSemantic', '_updateTrust']);
  check('R1.every-consumer-of-quality-is-in-episodeManager', hits.length > 0 && hits.every(h => h.rel === 'render/episodeManager.js'), [...new Set(hits.filter(h => h.rel !== 'render/episodeManager.js').map(h => h.rel))].join(', '));
  check('R1.consumers-are-the-declared-functions', hits.every(h => allowed.has(h.fn)), [...new Set(hits.filter(h => !allowed.has(h.fn)).map(h => h.fn))].join(', '));
  check('R1.the-quality-reading-getters-have-no-callers', Object.values(callSites).every(a => a.length === 0), JSON.stringify(callSites));
  const em = fs.readFileSync(path.join(TREE, 'render', 'episodeManager.js'), 'utf8');
  const body = (src, header) => { const i = src.indexOf(header); if (i < 0) return null; let d = 0, j = src.indexOf('{', i); const s = j; for (; j < src.length; j++) { if (src[j] === '{') d++; else if (src[j] === '}') { d--; if (d === 0) break; } } return src.slice(s, j + 1); };
  const rp = body(em, 'export function replayOneEpisode');
  check('R2.replay-eligibility-rule', rp !== null && /ep\.quality < 0\.5/.test(rp) && /ep\.nodes\.length < 3/.test(rp) && /isSimplePath/.test(rp) && /ep\.source === "replay" \|\| ep\.source === "imagination"/.test(rp));
  check('R2.replayed-copy-gets-its-quality-recomputed', rp !== null && /_createBuffer\("replay"\)/.test(rp) && /_sealBuffer\(ep\)/.test(rp) && !/\.quality\s*=/.test(rp));
  check('R2.F3-the-random-draw-follows-the-eligibility-return', rp !== null && rp.indexOf('eligible.length === 0') >= 0 && rp.indexOf('eligible.length === 0') < rp.indexOf('liveRng()'));
  const main = fs.readFileSync(path.join(TREE, 'main.js'), 'utf8');
  const reads = ['function rebuildAdjacencyMemory', 'function trajectoryConfidence', 'function computeTrajectoryIntegrity'].map(h => [h, body(main, h)]);
  check('R3.decision-time-reads-found-and-never-consult-quality', reads.every(([, b]) => b !== null && !/quality/.test(b)));
  const ga = body(em, 'export function getAllEpisodes');
  check('R3.getAllEpisodes-applies-no-filter', ga !== null && !/quality|filter\(/.test(ga));
  const gate = main.match(/goalGradientBoost \*= \(0\.10 \+ 0\.90 \* tc\)/) && main.match(/goalGradientBoost = 100 \* tc/);
  check('R4.gate-formulas-as-declared', !!gate);
}

// ============ I: isolation of the switch on the runtime ============
const scratch = fs.mkdtempSync(path.join(fs.realpathSync.native(os.tmpdir()), 'xfer2-verify-'));
try {
  // I1 module-level: the tree's own episode manager with a recording system stub
  const probeModule = async (episodes, tag, tries = 80) => {
    const mod = await import(`${URLOF(TREE, 'render', 'episodeManager.js')}?probe=${tag}`);
    const calls = { updateQ: 0, writeReward: 0 };
    const sys = {
      findNeuronById: (id) => ({ userData: { neighbors: g.neighbors.get(Number(id)) || [] } }),
      transitions: new Map(), rewards: new Map(), confidenceMap: new Map(),
      PROVENANCE: { MANUAL_TRAINING: 'MANUAL', DIRECT_EXPERIENCE: 'DIRECT' }, makeStateKey: (n, goal) => `${n}#${goal}`,
      updateQ() { calls.updateQ++; }, writeReward() { calls.writeReward++; },
      logActivation() {}, learnMomentum() {}, trainEmbedding() {}, reinforceSemanticStrength() {}, reinforceEpisodeSemantics() {}, recordSuccess() {}, reinforcePath() {}, rebuildSchemas() {},
    };
    const log = console.log; console.log = () => {};
    try { mod.initEpisodeManager(sys); mod.loadEpisodes(clone(episodes)); for (let i = 0; i < tries; i++) mod.replayOneEpisode(); } finally { console.log = log; }
    return calls;
  };
  const eligibleStore = sat.map(e => ({ ...e, quality: 0.85 }));
  const on = await probeModule(eligibleStore, 'on'), off = await probeModule(noReplay(eligibleStore), 'off');
  check('I1.eligible-store-replays-into-procedural-learning', on.updateQ > 0 && on.writeReward > 0, JSON.stringify(on));
  check('I1.quality-below-half-switches-replay-learning-off', off.updateQ === 0 && off.writeReward === 0, JSON.stringify(off));
  const loops = sat.filter(e => new Set(e.nodes).size !== e.nodes.length).map(e => ({ ...e, quality: 0.9 }));
  check('I1.loop-containing-episodes-never-replay', (await probeModule(loops, 'loops')).updateQ === 0);
  const half = await probeModule(sat.map(e => ({ ...e, quality: 0.5 })), 'half');
  check('I1.threshold-is-exactly-half', half.updateQ > 0);

  // world and training for the whole-runtime tests
  const stream = generateAcceptedStream(X1.CONFIG_START, 6);
  const plan = X1.planWorlds(stream);
  const W = plan[1];
  const session = (input) => {
    const r = spawnSync(process.execPath, [path.join(ROOT, 'experiments', 'xfer1', 'session.mjs'), JSON.stringify(input)], { encoding: 'utf8', maxBuffer: 1 << 28 });
    const m = r.stdout.match(/@@RESULT@@(.*)@@END@@/s);
    return { code: r.status, rec: m ? JSON.parse(m[1]) : null, stderr: (r.stderr || '').slice(-300) };
  };
  const probe = (brain, ticks = 100, seed = W.testSeed) => {
    const bp = brain === null ? null : path.join(scratch, `probe_${C.hashObject(brain).slice(0, 10)}.json`);
    if (bp) fs.writeFileSync(bp, JSON.stringify(brain));
    const r = spawnSync(process.execPath, [path.join(HERE, 'probe_session.mjs'), JSON.stringify({ tree: TREE, configSeed: W.configSeed, configIndex: W.configIndex, agentSeed: seed, ticks, brainPath: bp })], { encoding: 'utf8', maxBuffer: 1 << 28 });
    const m = r.stdout.match(/@@PROBE@@(.*)@@END@@/s);
    return m ? JSON.parse(m[1]) : { error: (r.stderr || '').slice(-300) };
  };
  const brainW = path.join(scratch, `w${W.world}.json`);
  const tr = session({ role: 'train', label: 'v2-train', tree: TREE, world: W.world, configSeed: W.configSeed, configIndex: W.configIndex, agentSeed: W.trainSeed, ticks: X1.TICKS.train, exportPath: brainW });
  check('B0.training-completes', tr.rec !== null && !tr.rec.outcome.crashed && tr.rec.outcome.completed, tr.stderr);
  const real = JSON.parse(fs.readFileSync(brainW, 'utf8')).episodes;
  check('B0.real-store-valid-and-not-trivially-empty', representationProblems(real, g, labelOf).length === 0 && real.length >= 20, representationProblems(real, g, labelOf).slice(0, 3).join('; '));

  // I2 whole runtime: same store at its real quality and at 0.49 -> identical decisions until the first replay tick
  const pOn = probe({ episodes: real }), pNr = probe({ episodes: noReplay(real) });
  check('I2.probes-ran', !pOn.error && !pNr.error && pOn.writes.length > 0, `${pOn.error || ''} ${pNr.error || ''}`);
  if (!pOn.error && !pNr.error) {
    const firstReplay = pOn.replays.length ? pOn.replays[0] : pOn.calls;
    let lcp = 0; while (lcp < pOn.writes.length && lcp < pNr.writes.length && pOn.writes[lcp] === pNr.writes[lcp]) lcp++;
    check('I2.same-first-decision-weights', JSON.stringify(pOn.call0Weights) === JSON.stringify(pNr.call0Weights) && pOn.call0Weights.length > 0);
    check('I2.same-decisions-until-the-first-replay-tick', pOn.replays.length > 0 && lcp >= firstReplay, `lcp ${lcp}, first replay call ${firstReplay}`);
    check('I2.same-replay-branch-calls-until-divergence', pOn.replays[0] === pNr.replays[0]);
  }
  // I3 whole runtime: replay writes procedural keys for an eligible store and none for the quality-0.49 copy.
  // A probe seed is used (inside the XFER-1 seed domain, never a study seed) for which the first replay tick falls in the
  // first two loops; the three probe paths lie far from the start node, and the no-replay run must never WALK a probe edge,
  // so a probe key can only have been written by replay.
  let i3 = null;
  for (let k = 0; k < 14 && i3 === null; k++) {
    const seed = C.SEED_BASE + 90_000 + k;
    const cold = probe(null, 5, seed);
    if (cold.error || !cold.writes.length) continue;
    const start = Number(cold.writes[0].split('->')[0]);
    const dist = new Map([[start, 0]]), q = [start];
    while (q.length) { const x = q.shift(); for (const y of g.neighbors.get(x)) if (!dist.has(y)) { dist.set(y, dist.get(x) + 1); q.push(y); } }
    const cands = [];
    for (const a of g.nodes) for (const b of g.neighbors.get(a)) for (const c of g.neighbors.get(b)) if (c !== a) cands.push({ nodes: [a, b, c], far: Math.min(dist.get(a), dist.get(b), dist.get(c)) });
    cands.sort((x, y) => (y.far - x.far) || (x.nodes.join(',') < y.nodes.join(',') ? -1 : 1));
    const picked = [];
    for (const c of cands) { if (picked.some(p => p.nodes.some(n => c.nodes.includes(n)))) continue; picked.push(c); if (picked.length === 3) break; }
    if (picked.length < 3) continue;
    const eps = picked.map((p, i) => makeEpisode({ id: `far_${i}`, nodes: p.nodes, labelOf, quality: 0.85 }));
    const on = probe({ episodes: eps }, 10, seed);
    if (on.error || !on.replays.length || on.replays[0] > 9) continue;
    const nr = probe({ episodes: noReplay(eps) }, 10, seed);
    if (nr.error) continue;
    const probeKeys = eps.flatMap(e => e.transitions.map(t => `${t.from}->${t.to}`));
    const probeEdges = new Set(probeKeys.flatMap(k2 => { const [u, v] = k2.split('->'); return [`${u}->${v}`, `${v}->${u}`]; }));
    if (nr.writes.some(w => probeEdges.has(w)) || on.writes.slice(0, on.replays[0]).some(w => probeEdges.has(w))) continue;   // an agent walk would make a key ambiguous
    i3 = { seed, eps, probeKeys, on, nr, minFar: Math.min(...picked.map(p => p.far)) };
  }
  check('I3.a-valid-probe-seed-exists', i3 !== null);
  if (i3 !== null) {
    const keysOf = (p) => new Set([...p.rewardsKeys, ...p.transitionsKeys]);
    const kOn = keysOf(i3.on), kNr = keysOf(i3.nr);
    check('I3.probe-paths-are-eligible-distinct-and-far', i3.eps.length === 3 && i3.eps.every(e => replayEligible(e, g)) && new Set(i3.eps.map(e => e.labels.join('>'))).size === 3 && i3.minFar >= 2, `far ${i3.minFar}`);
    check('I3.eligible-store-writes-procedural-keys-on-the-runtime', i3.probeKeys.some(k2 => kOn.has(k2)), `${i3.probeKeys.filter(k2 => kOn.has(k2)).length} of ${i3.probeKeys.length}`);
    check('I3.quality-0.49-store-writes-none-of-them', i3.probeKeys.every(k2 => !kNr.has(k2)), i3.probeKeys.filter(k2 => kNr.has(k2)).join(','));
    check('I3.the-replay-branch-was-taken-in-both-runs', i3.on.replays.length > 0 && i3.nr.replays.length > 0 && i3.on.replays[0] === i3.nr.replays[0]);
  }

  // ============ B: delivery on an XFER-1 world (no endpoint is read or printed) ============
  const sat1 = satStore(g, labelOf, { quality: C.NR_QUALITY, tag: 'sat' });
  const ctx = { world: W.world, goal: W.goal, realEpisodes: real, g, labelOf, sat: sat1 };
  const recs = {};
  for (const arm of C.ARM_ORDER) {
    const store = storeFor(arm, ctx), d = deliveryFor(arm);
    const input = { role: 'test', label: `v2-${arm}-w${W.world}`, tree: TREE, world: W.world, configSeed: W.configSeed, configIndex: W.configIndex, agentSeed: W.testSeed, ticks: X1.TICKS.test, arm: d.session };
    if (d.source === 'file') { const f = path.join(scratch, `${arm}_w${W.world}.json`); fs.writeFileSync(f, JSON.stringify({ episodes: store })); input.brainPath = f; input.brainWorld = W.world; }
    const r = session(input);
    recs[arm] = r.rec;
    check(`B1.${arm}.completes`, r.rec !== null && r.rec.outcome.completed && !r.rec.outcome.crashed, r.stderr);
    if (r.rec) {
      const expected = store === null ? null : componentHashes({ episodes: store }).episodes;
      const pr = deliveryProblems(r.rec, expected, store === null ? 0 : store.length);
      check(`B1.${arm}.delivered-store-is-exactly-the-control-store`, pr.length === 0, pr.join('; '));
    }
  }
  check('B2.arms-share-seed-and-configuration', (() => { const rs = Object.values(recs).filter(Boolean); return new Set(rs.map(r => r.input.agentSeed)).size === 1 && new Set(rs.map(r => r.input.acceptedConfigSeed)).size === 1; })());
  check('B2.every-control-store-passes-its-construct-check-on-the-real-world', genProblems(storeFor('GEN_NR', ctx), real, g, labelOf).length === 0 && satProblems(storeFor('SAT_NOENTRY_NR', ctx), g, labelOf, { excludeInto: W.goal }).length === 0 && entryProblems(storeFor('ENTRY_NR', ctx), g, labelOf, W.goal).length === 0
    && noReplayProblems(storeFor('REAL_NR', ctx), real, g).length === 0 && reversedProblems(storeFor('REV_NR', ctx), real, g).length === 0 && satProblems(storeFor('SAT_NR', ctx), g, labelOf, { realStores: [real] }).length === 0);
  for (const arm of ['REAL_NR', 'GEN_NR']) {
    const f = path.join(scratch, `${arm}_w${W.world}.json`);
    const r = session({ role: 'test', label: `v2-${arm}-again`, tree: TREE, world: W.world, configSeed: W.configSeed, configIndex: W.configIndex, agentSeed: W.testSeed, ticks: X1.TICKS.test, arm: 'ONLY_episodes', brainPath: f, brainWorld: W.world });
    check(`B3.${arm}.session-is-deterministic`, r.rec !== null && r.rec.artifacts.fingerprint === recs[arm].artifacts.fingerprint);
  }
  check('B4.every-store-arm-changes-behaviour-relative-to-cold', C.ARM_ORDER.filter(a => a !== 'COLD').every(a => recs[a] && recs[a].artifacts.fingerprint !== recs.COLD.artifacts.fingerprint));

  // ============ M: mutants ============
  { const leak = sat.map(e => { const n = e.nodes.slice(0, -1).concat([12]); return { ...e, nodes: n, labels: n.map(labelOf) }; });
    mutant('M1.saturated-store-that-ends-at-the-goal-is-rejected', satProblems(leak, g, labelOf).length > 0); }
  { let threw = false; try { satStore(g, labelOf, { count: 20 }); } catch { threw = true; } mutant('M2.unsaturated-store-is-rejected', threw); }
  { const bad = clone(sat); bad[3].nodes[1] = bad[3].nodes[0] === 20 ? 1 : 20; mutant('M3.non-edge-move-is-rejected', representationProblems(bad, g, labelOf).length > 0); }
  { const gen = genStore(g, labelOf, real, { seed: C.GEN_SEED + 1, tag: 'g' });
    const short = gen.slice(0, -3); mutant('M4.generic-store-with-the-wrong-count-is-rejected', genProblems(short, real, g, labelOf).length > 0);
    const stretched = gen.map((e, i) => (i === 0 ? { ...e, nodes: e.nodes.concat(e.nodes.slice(-2).reverse().slice(0, 1)) } : e));
    mutant('M5.generic-store-with-a-changed-length-is-rejected', genProblems(stretched, real, g, labelOf).length > 0);
    const replayable = gen.map(e => ({ ...e, quality: 0.85 })); mutant('M6.generic-store-that-is-replay-eligible-is-rejected', genProblems(replayable, real, g, labelOf).length > 0 || gen.every(e => !replayEligible({ ...e, quality: 0.85 }, g)));
    const copied = gen.map((e, i) => (i < gen.length ? { ...real[i], id: `c${i}`, quality: C.NR_QUALITY } : e));
    mutant('M7.generic-store-that-copies-real-paths-is-rejected', genProblems(copied, real, g, labelOf).length > 0); }
  { const withEntry = satStore(g, labelOf, { excludeInto: null, quality: C.NR_QUALITY, tag: 'x' });
    mutant('M8.no-entry-store-containing-entering-edges-is-rejected', satProblems(withEntry, g, labelOf, { excludeInto: W.goal }).length > 0); }
  { const e = entryStore(g, labelOf, W.goal).slice(1); mutant('M9.entry-store-with-a-missing-episode-is-rejected', entryProblems(e, g, labelOf, W.goal).length > 0); }
  { const forgot = real.map(e => ({ ...e, id: `${e.id}_nr` })); mutant('M10.noreplay-that-keeps-quality-is-rejected', noReplayProblems(forgot, real, g).length > 0); }
  { const tampered = noReplay(real).map((e, i) => (i === 0 ? { ...e, nodes: e.nodes.slice().reverse() } : e)); mutant('M11.noreplay-that-changes-structure-is-rejected', noReplayProblems(tampered, real, g).length > 0); }
  { const notRev = reversedNoReplay(real, labelOf).map((e, i) => ({ ...e, nodes: real[i].nodes.slice(), labels: real[i].labels.slice() })); mutant('M12.reversal-that-keeps-direction-is-rejected', reversedProblems(notRev, real, g).length > 0); }
  { const exp = componentHashes({ episodes: storeFor('REAL_NR', ctx) }).episodes;
    const wrong = clone(recs.REAL_NR); wrong.brain.deliveredHashes.episodes = componentHashes({ episodes: real }).episodes;
    mutant('M13.delivery-of-the-replayable-store-in-place-of-the-nr-store', deliveryProblems(wrong, exp, real.length).length > 0);
    const leaky = clone(recs.REAL_NR); leaky.brain.start.sizes.Q = 3;
    mutant('M14.procedural-state-leaking-into-an-episodes-only-arm', deliveryProblems(leaky, exp, real.length).length > 0); }
  { const still = await probeModule(sat.map(e => ({ ...e, quality: 0.51 })), 'mut');
    mutant('M15.quality-0.51-still-replays-so-the-threshold-matters', still.updateQ > 0); }
} finally {
  fs.rmSync(scratch, { recursive: true, force: true });
}

// ============ A: analysis rules on exact fixtures ============
{
  const { evaluateBlock } = await import('./analyze.mjs');
  const mkBlock = (ben, { breakWorld = null, dropArm = null, wrongHash = null, jitter = 0 } = {}) => {
    const worlds = Array.from({ length: 12 }, (_, k) => 80 + k);
    const records = new Map(), controls = {};
    const plan = { block: 'C', arms: C.ARM_ORDER, worlds: worlds.map(w => ({ world: w, goal: [8, 12, 16, 19][w % 4] })), validWorlds: worlds, exclusions: [] };
    for (const w of worlds) {
      controls[w] = { realEpisodes: 40, arms: {} };
      for (const arm of C.ARM_ORDER) {
        const h = arm === 'COLD' ? null : `hash_${arm}_${w}`;
        controls[w].arms[arm] = { storeHash: h, episodes: arm === 'COLD' ? 0 : 40 };
        if (dropArm === arm && breakWorld === w) continue;
        const goal = 100 + w + (arm === 'COLD' ? 0 : ben[arm]) + (jitter && arm !== 'COLD' ? ((w % 3) - 1) * jitter : 0);
        const sizes = { transitions: 0, rewards: 0, penalties: 0, signals: 0, curiosity: 0, Q: 0, confidence: 0, episodes: arm === 'COLD' ? 0 : 40 };
        records.set(`x2-${arm}-w${w}`, { input: { agentSeed: C.testSeed(w), acceptedConfigSeed: 200000 + w }, outcome: { crashed: false, completed: true }, h1r: { drawFaults: 0, blockedIllegal: 0 },
          endpoints: { goalReaches: goal, attemptSuccess: 0.7, slipsPerCall: 0.2, earlyReaches: goal / 3 },
          brain: { deliveredHash: arm === 'COLD' ? 'none' : 'x', deliveredHashes: arm === 'COLD' ? null : { episodes: wrongHash === arm && breakWorld === w ? 'bad' : h }, start: { hashes: { episodes: h }, sizes } } });
      }
    }
    return { records, plan, controls };
  };
  // REAL benefit 100; real-no-replay 90; saturated 100; matched generic 60; reversed 5; entry-only 98; no-entry 40
  const base = { REAL: 100, REAL_NR: 90, SAT_NR: 100, GEN_NR: 60, REV_NR: 5, ENTRY_NR: 98, SAT_NOENTRY_NR: 40 };
  const ok = evaluateBlock(mkBlock(base));
  check('A1.valid-fixture-and-status', ok.valid && ok.reproduction === 'OK', ok.problems.join('; '));
  check('A1.classifications-follow-the-margin', ok.classifications.REAL_NR_vs_REAL.class === 'NON_INFERIOR' && ok.classifications.SAT_NR_vs_REAL_NR.class === 'EXCEEDS' === false && ok.classifications.GEN_NR_vs_REAL_NR.class === 'FALLS_SHORT' && ok.classifications.REV_NR_vs_REAL_NR.class === 'FALLS_SHORT' && ok.classifications.ENTRY_NR_vs_SAT_NR.class === 'NON_INFERIOR' && ok.classifications.SAT_NOENTRY_NR_vs_SAT_NR.class === 'FALLS_SHORT', JSON.stringify(Object.fromEntries(Object.entries(ok.classifications).map(([k, v]) => [k, v.class]))));
  check('A1.cold-is-classed-falls-short-whenever-status-is-ok', ok.classifications.COLD_vs_REAL.class === 'FALLS_SHORT');
  check('A1.predictions-evaluate-as-declared', ok.predictions.every(p => p.pass === true), JSON.stringify(ok.predictions.map(p => [p.id, p.pass])));
  check('A1.verdict-names-the-handicap', /attenuation/.test(ok.verdict) && /goal-entering term alone/.test(ok.verdict), ok.verdict);
  // saturated falls short: the content sentence, never the handicap sentence
  const content = evaluateBlock(mkBlock({ ...base, SAT_NR: 20 }));
  check('A2.verdict-when-saturated-exposure-falls-short', /carries information exposure does not/.test(content.verdict) && !/attenuation/.test(content.verdict), content.verdict);
  // status handling: low benefit and non-reproduction are never interpreted
  const low = evaluateBlock(mkBlock({ ...base, REAL: 30 }, { jitter: 1 }));
  check('A3.low-benefit-is-not-interpretable', low.valid && low.reproduction === 'NOT_INTERPRETABLE_LOW_BENEFIT' && /^NOT_INTERPRETABLE_LOW_BENEFIT/.test(low.verdict) && low.predictions.every(p => p.pass === false) && low.shareOfRealBenefit === undefined, `${low.reproduction} ${low.verdict}`);
  const none = evaluateBlock(mkBlock({ ...base, REAL: 0 }, { jitter: 1 }));
  check('A3.non-reproduction-is-not-interpreted', none.valid && none.reproduction === 'DID_NOT_REPRODUCE' && /^DID_NOT_REPRODUCE/.test(none.verdict) && none.predictions.every(p => p.pass === false));
  // exactly at the margin
  const edge = evaluateBlock(mkBlock({ ...base, REAL_NR: 75 }));      // shortfall of REAL_NR vs REAL = 25 exactly -> FALLS_SHORT
  check('A4.shortfall-exactly-at-delta-falls-short', edge.classifications.REAL_NR_vs_REAL.class === 'FALLS_SHORT' && /replay/.test(edge.verdict));
  const justUnder = evaluateBlock(mkBlock({ ...base, REAL_NR: 76 }));
  check('A4.shortfall-just-under-delta-is-non-inferior', justUnder.classifications.REAL_NR_vs_REAL.class === 'NON_INFERIOR');
  // integrity
  const missing = evaluateBlock(mkBlock(base, { breakWorld: 83, dropArm: 'GEN_NR' }));
  mutant('A5.missing-record-invalidates-the-block', !missing.valid && /INVALID/.test(missing.verdict));
  const wrong = evaluateBlock(mkBlock(base, { breakWorld: 84, wrongHash: 'REAL_NR' }));
  mutant('A5.wrong-delivered-store-invalidates-the-block', !wrong.valid);
  // a rule that classified on the point estimate alone would call a straddling interval non-inferior
  const straddle = C.classifyShortfall({ lower: -30, upper: 60 });
  mutant('A5.straddling-interval-is-inconclusive-not-non-inferior', straddle === 'INCONCLUSIVE');
}

// ============ E: lodged evidence is internally consistent and bound to the frozen design ============
{
  const dir = path.join(HERE, 'results');
  const found = ['C', 'D'].filter(b => fs.existsSync(path.join(dir, `summary_block${b}.json`)));
  if (found.length === 0) console.log('SKIP E: no lodged XFER-2 summaries');
  for (const b of found) {
    const s = JSON.parse(fs.readFileSync(path.join(dir, `summary_block${b}.json`), 'utf8'));
    const size = C.BLOCKS[b].hi - C.BLOCKS[b].lo + 1;
    check(`E.${b}.bound-to-the-frozen-design`, s.designDigest === C.designDigest() && s.schema === `${C.SCHEMA}.summary` && s.status === C.STATUS && s.block === b);
    check(`E.${b}.world-allocation-and-integrity`, s.valid === true && s.worlds.length === size && s.excludedFraction <= C.RULES.maxExcludedFraction && /^[0-9a-f]{64}$/.test(s.manifestDigest));
    if (!s.perWorld) { check(`E.${b}.not-interpreted-without-integrity`, !s.valid); continue; }
    const d = (ref, x) => s.worlds.map(w => s.perWorld[w].arms[ref][0] - s.perWorld[w].arms[x][0]);
    const benefit = pairedSummary(d('REAL', 'COLD'), C.BOOTSTRAP);
    check(`E.${b}.benefit-of-real-recomputes`, Math.abs(benefit.mean - s.benefit.REAL.mean) < 1e-9 && benefit.ci.lower === s.benefit.REAL.ci.lower && benefit.ci.upper === s.benefit.REAL.ci.upper);
    const status = benefit.ci.lower >= C.MARGIN.minRealBenefit ? 'OK' : benefit.ci.lower > 0 ? 'NOT_INTERPRETABLE_LOW_BENEFIT' : 'DID_NOT_REPRODUCE';
    check(`E.${b}.status-follows-the-frozen-rule`, s.reproduction === status);
    const pairs = { REAL_NR_vs_REAL: ['REAL', 'REAL_NR'], SAT_NR_vs_REAL_NR: ['REAL_NR', 'SAT_NR'], GEN_NR_vs_REAL_NR: ['REAL_NR', 'GEN_NR'], REV_NR_vs_REAL_NR: ['REAL_NR', 'REV_NR'], ENTRY_NR_vs_SAT_NR: ['SAT_NR', 'ENTRY_NR'], SAT_NOENTRY_NR_vs_SAT_NR: ['SAT_NR', 'SAT_NOENTRY_NR'] };
    check(`E.${b}.every-classification-recomputes`, Object.entries(pairs).every(([k, [ref, x]]) => { const t = pairedSummary(d(ref, x), C.BOOTSTRAP); return t.ci.lower === s.classifications[k].shortfall.ci.lower && t.ci.upper === s.classifications[k].shortfall.ci.upper && C.classifyShortfall(t.ci) === s.classifications[k].class; }));
    check(`E.${b}.verdict-follows-the-declared-rules`, s.verdict === C.interpret({ status, satVsRealNR: s.classifications.SAT_NR_vs_REAL_NR.class, genVsRealNR: s.classifications.GEN_NR_vs_REAL_NR.class, realVsRealNR: s.classifications.REAL_NR_vs_REAL.class, entryVsSat: s.classifications.ENTRY_NR_vs_SAT_NR.class, noentryVsSat: s.classifications.SAT_NOENTRY_NR_vs_SAT_NR.class }));
    check(`E.${b}.no-prediction-passes-without-status-ok`, status === 'OK' || s.predictions.every(p => p.pass === false));
  }
}

console.log(`\nRESULT: ${passed} checks passed, ${failed} failed; mutants caught ${caught}, missed ${missed}`);
if (failed || missed) { console.log(fails.join('\n')); process.exit(1); }
