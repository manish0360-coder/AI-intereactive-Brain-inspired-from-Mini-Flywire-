// ==========================================================
// MCF-1 — one-run driver (one process per run)
// ==========================================================
//   node driver.mjs '<json>'
//   json: { mode: 'Q'|'V'|'O', stopAt, policy: 'development'|'official', freezeSha256?, tree, label, agentSeed,
//           content: 'C'|'M9'|'M11', twin: 'T9'|'T11', configSeed, configIndex }
//
//   This file is the execution boundary.  policy "official" is accepted only after lock.assertOfficialExecution:
//   committed pin and record, source / configuration / registry digests, registered block membership, the approved
//   configuration, a read-only verification of the conformed tree and the Q -> V -> O receipt chain.  Nothing in the
//   input is trusted; freezeSha256, tree, configSeed and configIndex are only compared.  This process never builds,
//   repairs or deletes a tree.
//
//   Q  cold qualification   : content C, decision-stop
//   V  validity             : any content, decision-stop, NO environment attempt (the sink's attempt() throws)
//   O  outcome              : any content, runs to the FIRST environment attempt and stops there
//        stopAt 'attempt-hook' : sentinel thrown inside the sink right after the attempt is recorded (before any
//                                learning write; preferred)
//        stopAt 'call2'        : sentinel at the start of the second agent call (validated cold earlier; fallback)
//
// The agent, the runtime, the transform and the measurement sink are NOT modified: the sink wrapper only observes
// (and aborts).  The twin configuration is installed by the exported env.install() at call-0 start, before any
// attempt.  The brain is delivered by a one-shot read hook on localStorage through the product's own loadBrain().
// ==========================================================
import path from 'node:path';
import fs from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { configSeed as typedConfigSeed, config as typedConfig } from '../registry/typed_v2.js';
import { FRAME, DESIGN, seedPolicy, sha256, canonicalJson } from './config.mjs';
import { brainFor, brainHash } from './episodes.mjs';
import { assertOfficialExecution, DRIVER_INPUT_KEYS } from './lock.mjs';

const IN = JSON.parse(process.argv[2]);
const refuse = (m) => { throw new Error(`MCF-1 driver refused: ${m}`); };
const URLOF = (...p) => pathToFileURL(path.join(...p)).href;
const REPO = path.resolve(fileURLToPath(new URL('../../', import.meta.url)));
if (process.env.H1R_STAGE_AUTHORISED !== undefined) refuse('H1R_STAGE_AUTHORISED is set');

// ---- argument and policy guards (before anything is loaded) ----
if (IN === null || typeof IN !== 'object' || Array.isArray(IN)) refuse('the input must be a JSON object');
{
  const unknown = Object.keys(IN).filter(k => !DRIVER_INPUT_KEYS.includes(k));
  if (unknown.length) refuse(`unknown input field(s): ${unknown.join(', ')}`);
}
if (!['Q', 'V', 'O'].includes(IN.mode)) refuse(`unknown mode ${IN.mode}`);
const okStop = { Q: ['decision'], V: ['decision'], O: ['attempt-hook', 'call2'] };
if (!okStop[IN.mode].includes(IN.stopAt)) refuse(`mode ${IN.mode} cannot use stopAt ${IN.stopAt}`);
if (!DESIGN.contents.includes(IN.content) || !DESIGN.twins.includes(IN.twin)) refuse('unknown content or twin');
if (IN.mode === 'Q' && IN.content !== 'C') refuse('qualification runs are cold');
// The driver is the execution boundary.  Under the official policy nothing in the input is trusted: authorization,
// seed membership, configuration, tree and stage ordering are all derived from committed state by lock.mjs, and the
// tree that is used is the one lock.mjs verified read-only (this process never builds, repairs or deletes a tree).
let TREE = IN.tree;
if (IN.policy === 'official') { TREE = (await assertOfficialExecution(IN)).treeDir; }
else if (IN.policy === 'development') {
  if (IN.freezeSha256 !== undefined && IN.freezeSha256 !== null) refuse('a development run cannot carry a freeze hash');
  const p = seedPolicy('development', IN.agentSeed); if (!p.ok) refuse(p.why);
} else refuse(`unknown policy ${IN.policy}`);
if (IN.configSeed >= 900500 || typedConfig.isHeldOut(typedConfigSeed(IN.configSeed)) || typedConfig.isConsumed(typedConfigSeed(IN.configSeed))) refuse('config seed is held-out or consumed territory');

const { installH1R } = await import(URLOF(REPO, 'experiments/h1r/runtime.mjs'));
const { installMeasure } = await import(URLOF(REPO, 'experiments/h1r/measure_install.mjs'));
const { createMeasure } = await import(URLOF(REPO, 'experiments/h1r/measure.mjs'));
const H = await installH1R({ tree: TREE, trustMode: 'traversal', envPosition: null });      // M7 §5.1 XOR environment stream
const T = (rel) => import(URLOF(TREE, rel));
const [qmod, mem, trust, epm, search, envmod] = await Promise.all([T('render/qlearning.js'), T('render/memory.js'), T('render/trustMemory.js'), T('render/episodeManager.js'), T('render/search.js'), T('experiments/m7/env.js')]);
const treeManifest = JSON.parse(fs.readFileSync(path.join(TREE, 'MANIFEST.json'), 'utf8'));

// the accepted configuration must itself be outside held-out/consumed territory
const baseGen = envmod.generateAccepted(IN.configSeed, IN.configIndex);
if (typedConfig.isHeldOut(typedConfigSeed(baseGen.provenance.acceptedSeed)) || typedConfig.isConsumed(typedConfigSeed(baseGen.provenance.acceptedSeed))) refuse('accepted configuration seed is held-out or consumed territory');
if (baseGen.cfg.goal !== FRAME.goal) refuse(`configuration goal ${baseGen.cfg.goal} is not the registered goal ${FRAME.goal}`);

const nested = (m) => { let n = 0; m.forEach(v => { n += v instanceof Map ? v.size : 1; }); return n; };
const probes = [];
function probe(phase, calls) {
  const emb = [];
  for (let id = 1; id <= 20; id++) { const n = search.findNeuronById(id); emb.push(n && n.userData && n.userData.embedding ? Array.from(n.userData.embedding) : null); }
  let qsum = 0; qmod.Q.forEach(v => { qsum += v; });
  probes.push({ phase, calls, Q: { size: qmod.Q.size, sum: qsum }, transitions: { outer: mem.transitions.size, entries: nested(mem.transitions) }, rewards: mem.rewards.size, penalties: mem.penalties.size,
    confidenceMap: mem.confidenceMap.size, pathAttempts: trust.pathAttempts.size, pathSuccesses: trust.pathSuccesses.size,
    episodes: epm.getAllEpisodes().map(e => ({ id: e.id, nodes: e.nodes.slice(), hasActiveGoal: Object.prototype.hasOwnProperty.call(e, 'activeGoal') })),
    embeddingSha: sha256(JSON.stringify(emb)) });
}
const ROUTE = { T9: { rel: [[10, 9], [9, 12]], unrel: [[10, 11], [11, 12]] }, T11: { rel: [[10, 11], [11, 12]], unrel: [[10, 9], [9, 12]] } };
function twinCfg() {
  const cfg = baseGen.cfg, p1 = cfg.pPhase1.slice();
  for (const [a, b] of ROUTE[IN.twin].rel) p1[envmod.edgeIndexOf(a, b)] = DESIGN.reliability.reliable;
  for (const [a, b] of ROUTE[IN.twin].unrel) p1[envmod.edgeIndexOf(a, b)] = DESIGN.reliability.unreliable;
  return { ...cfg, pPhase1: p1, pPhase2: p1.slice() };
}

const SENTINEL = 'MCF1_STOP';
let startNode = null, chosen = null, installedP = null;
const create = () => {
  const base = createMeasure(); let attemptSeen = false;
  return Object.freeze({ ...base,
    step() {
      base.step(); const c = base.count();
      if (c === 1) {
        probe('call0-start', c);
        envmod.install(twinCfg());
        installedP = { '10-9': envmod.trueP(10, 9), '9-12': envmod.trueP(9, 12), '10-11': envmod.trueP(10, 11), '11-12': envmod.trueP(11, 12) };
      } else if (c >= 2) {
        // a decision-only stage reaching call 2 means call 0 produced no decision (a replay tick): stop cleanly and let
        // V2 / qualification classify it.  A first-attempt stage reaching call 2 with no attempt is an instrument fault.
        if (IN.stopAt === 'call2' || IN.stopAt === 'decision') { probe('call2-start', c); throw new Error(SENTINEL); }
        throw new Error('MCF1_GUARD: a second agent call began before the first attempt');
      }
    },
    decision(...a) {
      const r = base.decision(...a);
      if (base.count() === 1) {
        const w = globalThis.window || globalThis, lr = w.lastReasoning || globalThis.lastReasoning || null;
        if (lr) { startNode = Number(lr.from); chosen = Number(lr.to); }
        if (IN.stopAt === 'decision') { probe('at-decision', 1); throw new Error(SENTINEL); }
      }
      return r;
    },
    attempt(...a) {
      if (IN.stopAt === 'decision') throw new Error('MCF1_GUARD: an environment attempt was reached in a decision-only stage');
      const r = base.attempt(...a);
      if (!attemptSeen) { attemptSeen = true; if (IN.stopAt === 'attempt-hook') { probe('after-attempt', base.count()); throw new Error(SENTINEL); } }
      return r;
    } });
};
const M = installMeasure(globalThis, create);
await H.attachMeasure(M);

// one-shot brain delivery through loadBrain()'s single read; the harness's later cold-store assertion sees the real, empty store
const brain = brainFor(IN.content), brainJson = brain === null ? null : JSON.stringify(brain);
const reads = []; let served = false, current;
Object.defineProperty(globalThis, 'localStorage', { configurable: true, enumerable: true, get() { return current; },
  set(v) { current = { getItem: (k) => { if (k === 'brain' && brainJson !== null && !served) { served = true; reads.push('brain: served'); return brainJson; } reads.push(`${k}: passthrough`); return v.getItem(k); },
    setItem: (k, x) => v.setItem(k, x), removeItem: (k) => v.removeItem(k), clear: () => v.clear() }; } });

process.chdir(path.join(TREE, 'experiments', 'm7'));
const { runOnce } = await import(URLOF(TREE, 'experiments/m7/run.js'));
const rec = await runOnce({ configSeed: IN.configSeed, configIndex: IN.configIndex, agentSeed: IN.agentSeed, arm: 'A1', envMode: 'on', creditMode: 'on', pin: 'on', tickUnit: 'step', ticks: 5, crashAtTick: null, warmStore: false });

const m = M.record();
const joined = m.candidates.map((c, k) => [...c, m.score[2 * k], m.score[2 * k + 1]]);
const step0 = joined.filter(c => c[0] === 0 && c[1] === 0).map(c => ({ key: c[2], returned: c[3], w: c[4], applied: c[5], arb: c[6], unc: c[7], selfLoop: c[9], F: c[10], trustTerm: c[11] }));
const A = rec.artifacts || {};
const executedEdgeP = IN.mode === 'O' && startNode !== null && chosen !== null ? envmod.trueP(startNode, chosen) : null;   // design constant of the executed edge (read AFTER the run; used only by the Stage-O mapping check)
const out = {
  schema: 'mcf1.run/1', mode: IN.mode, stopAt: IN.stopAt, policy: IN.policy, label: IN.label,
  input: { agentSeed: IN.agentSeed, content: IN.content, twin: IN.twin, configSeed: IN.configSeed, configIndex: IN.configIndex, acceptedConfigSeed: baseGen.provenance.acceptedSeed },
  tree: { name: path.basename(TREE), manifestSha256: sha256(canonicalJson(treeManifest.files)), b2Commit: treeManifest.b2Commit, transformSha256: treeManifest.transformSha256 },
  outcome: { abortedBySentinel: !!(rec.outcome.error && String(rec.outcome.error.message).includes(SENTINEL)), error: rec.outcome.error ? String(rec.outcome.error.message).slice(0, 200) : null },
  calls: m.calls, startNode, chosen, brainHash: brainHash(brain), installedP, localStorageReads: reads,
  step0, bests: m.bests.filter(b => b[0] === 0), decisions: m.decisions.filter(d => d[0] === 0), replays: m.replays, attempts: m.attempts,
  legality: { candidatesAreEdges: step0.map(c => !!H.isEdge(startNode, c.key)), executedIsEdge: chosen === null ? null : !!H.isEdge(startNode, chosen), executedLegalMove: chosen === null ? null : !!H.legalMove(startNode, chosen) },
  h1r: { on: H.on === true, blockedIllegal: H.counters.blockedIllegal, drawFaults: H.instrument.drawFaults, envDrawsSeen: H.instrument.envDrawsSeen, edgeAttempts: H.r1stats.edgeAttempts, noDecision: H.r1stats.noDecision, slips: H.r1stats.slips, realised: H.r1stats.realised },
  artifacts: { cogDraws: A.cogDraws, visDraws: A.visDraws, envCounters: A.envCounters },
  executedEdgeP, probes,
};
process.stdout.write('\n@@RESULT@@' + JSON.stringify(out) + '@@END@@\n');
process.exit(0);
