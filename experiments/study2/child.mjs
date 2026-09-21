// Study-2 READINESS run child — one normal V2.3 + M7 run on the permitted DEVELOPMENT fixture.
// This is not Study 2: no oracle is computed, no tau-b, no Delta. Raw FULL/GEO scores are NOT persisted;
// only per-event identity checks and a tamper-evident hash of the raw vectors are written.
//
// env: CAPTURE ('1' = S-SHADOW capture apparatus installed, '0' = none), OUT
import { register } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const U = pathToFileURL(ROOT).href;
const CAPTURE = process.env.CAPTURE === '1';
if (CAPTURE) register(pathToFileURL(path.join(HERE, 'hook_capture.mjs')).href, import.meta.url);

const SEED = 896066, INDEX = 0;                                  // the permitted development replay fixture
const ALLOWED = new Set([896066, 896238, 896329]);
const { FROZEN } = await import(U + '/experiments/uqb/protocol.js');
const env = await import(U + '/experiments/m7/env.js');
const TR = await import(U + '/render/traversalRecord.js');
const search = await import(U + '/render/search.js');
const FULL = CAPTURE ? await import(U + '/render/planning.js?s2=FULL') : null;
const GEO = CAPTURE ? await import(U + '/render/planning.js?s2=GEO') : null;
const { runOnce } = await import(U + '/experiments/m7/run.js');

const conns = JSON.parse(fs.readFileSync(path.join(ROOT, 'connections.json'), 'utf8'));
const DIRECTED = conns.flatMap((c) => [[c.from, c.to], [c.to, c.from]]);
const adj = new Map();
for (const c of conns) { (adj.get(c.from) || adj.set(c.from, []).get(c.from)).push(c.to); (adj.get(c.to) || adj.set(c.to, []).get(c.to)).push(c.from); }
// independent BFS (not render/planning.js) — the GEO expectation FS = -d(k, g)
const distCache = new Map();
const distFrom = (g) => { if (distCache.has(g)) return distCache.get(g); const d = new Map([[g, 0]]), q = [g]; while (q.length) { const x = q.shift(); for (const y of adj.get(x) || []) if (!d.has(y)) { d.set(y, d.get(x) + 1); q.push(y); } } distCache.set(g, d); return d; };

const liveSnapshot = () => {
  const m = new Map();
  for (const [u, v] of DIRECTED) { const r = TR.recordFor(u, v); if (r.a > 0) m.set(`${u}->${v}`, Object.freeze({ a: r.a, s: r.s })); }
  return m;
};
const hashMap = (m) => crypto.createHash('sha256').update(JSON.stringify([...m.entries()])).digest('hex');

const events = [];
const eventsPerStep = new Map();
const tickLog = [];                                              // [setTick argument, last completed runAgent index]
let lastTick = null;
if (CAPTURE) {
  globalThis.__S2_TICK__ = (t) => { tickLog.push([t, globalThis.__S2_STEP__ ?? -1]); lastTick = t; };
  // K(e) = the candidate set scored at STEP 0 of the agent-loop runPrediction(agentCurrent) (Director ruling).
  // Imagined successor states (chain steps 1..STEPS-1) are counted and EXCLUDED; they never enter an event.
  let open = false, calls0 = null, keys0 = null, sorted0 = null, final0 = null;
  let imaginedCalls = 0, imaginedKeys = 0, snap = null, snapHash = null, step = null, stepTick = null;
  globalThis.__S2_BEGIN__ = () => {
    if (open) throw new Error('S2: nested decision event');
    open = true; calls0 = []; keys0 = []; sorted0 = null; final0 = null; imaginedCalls = 0; imaginedKeys = 0;
    step = globalThis.__S2_STEP__; stepTick = lastTick;
    snap = liveSnapshot(); snapHash = hashMap(snap);              // captured ONCE, before any scoring
  };
  globalThis.__S2_KEY__ = (chain, k) => { if (!open) return; if (chain === 0) keys0.push(Number(k)); else imaginedKeys++; };
  globalThis.__S2_CALL__ = (id, g, v, chain) => { if (!open) return; if (chain === 0) calls0.push([Number(id), g, v]); else imaginedCalls++; };
  globalThis.__S2_RANK__ = (chain, kind, keys) => {
    if (!open || chain !== 0) return;
    if (kind === 'sorted') sorted0 = keys.map(Number); else if (kind === 'final') final0 = keys.map(Number);
  };
  globalThis.__S2_END__ = () => {
    open = false;
    const executed = globalThis.lastReasoning ? Number(globalThis.lastReasoning.to) : null;   // set on step 0 only
    const liveUnchanged = hashMap(liveSnapshot()) === snapHash;   // nothing wrote evidence during scoring
    // ---- candidate-set identity (checks A-G) ----
    const fsIds = calls0.map((c) => c[0]);
    const rank = sorted0 || [];
    const fsSet = new Set(fsIds), rankSet = new Set(rank);
    const missing = rank.filter((k) => !fsSet.has(k));             // ranked but not FutureScore-scored
    const extra = fsIds.filter((k) => !rankSet.has(k));            // scored but not ranked
    const idCheck = {
      A_sameIds: missing.length === 0 && extra.length === 0,
      B_sameCardinality: fsIds.length === rank.length,
      C_noMissing: missing.length === 0,
      D_noExtra: extra.length === 0,
      E_noDuplicates: fsSet.size === fsIds.length && rankSet.size === rank.length,
      F_orderDeterministic: keys0.length === fsIds.length && keys0.every((k, i) => k === fsIds[i]),
      G_targetEqualsCandidate: keys0.length === fsIds.length && keys0.every((k, i) => k === fsIds[i]),
    };
    // ---- G-IMPL-1 identities on step-0 candidates only ----
    globalThis.__S2_SNAPSHOT__ = snap;
    const raw = [];
    let fullEqLive = true, geoEqNegD = true;
    const goals = new Set(calls0.map((c) => c[1]));
    for (const [k, g, v] of calls0) {
      const n = search.findNeuronById(k);
      const full = FULL.futureScore(n, g);
      const geo = GEO.futureScore(n, g);
      const d = distFrom(Number(g)).get(k);
      if (full !== v) fullEqLive = false;
      if (geo !== (d === undefined ? -Infinity : -d)) geoEqNegD = false;
      raw.push([k, v, full, geo]);
    }
    globalThis.__S2_SNAPSHOT__ = null;
    const snapUnchanged = hashMap(snap) === snapHash;              // the snapshot itself was not mutated
    const augmented = (final0 || []).filter((k) => !fsSet.has(k)); // final-ranking entries FutureScore never scored
    events.push({ t: step, lastTick: stepTick, nCand: calls0.length, goalCount: goals.size,
      fullEqLive, geoEqNegD, liveUnchanged, snapUnchanged, idCheck, missing, extra,
      imaginedCalls, imaginedKeys, nAugmented: augmented.length,
      executedInK: executed !== null && fsSet.has(executed), executedAugmented: executed !== null && augmented.includes(executed),
      rawHash: crypto.createHash('sha256').update(JSON.stringify(raw)).digest('hex') });
    eventsPerStep.set(step, (eventsPerStep.get(step) || 0) + 1);
  };
}

const run = await runOnce({
  configSeed: SEED, configIndex: INDEX, agentSeed: FROZEN.agentSeed, arm: FROZEN.m7Arm,
  envMode: 'on', creditMode: 'on', pin: 'on', tickUnit: 'step', ticks: 3000, crashAtTick: null, warmStore: false,
});
for (const k of ['__S2_BEGIN__', '__S2_CALL__', '__S2_END__', '__S2_TICK__', '__S2_KEY__', '__S2_RANK__']) globalThis[k] = null;

const prov = run.provenance;
if (prov.acceptedSeed !== SEED || prov.numberOfRejectedCandidatesBeforeAcceptance !== 0) throw new Error('STOP: fixture did not accept at its own seed');
const touched = env.evaluatedSeeds();
if (touched.some((s) => !ALLOWED.has(s))) throw new Error(`STOP: non-fixture seed evaluated: ${touched}`);
if (run.crash) throw new Error(`run crashed: ${run.crash.message}`);

const findKey = (o, key) => { if (!o || typeof o !== 'object') return undefined; if (key in o) return o[key]; for (const v of Object.values(o)) { const r = findKey(v, key); if (r !== undefined) return r; } return undefined; };
const a = run.artifacts;
const finalSnap = DIRECTED.map(([u, v]) => { const r = TR.recordFor(u, v); return [u, v, r.a, r.s]; });
const fingerprint = {
  writesHash: crypto.createHash('sha256').update(JSON.stringify(a.writes)).digest('hex'),
  nWrites: a.writes.length, cogDraws: a.cogDraws, visDraws: a.visDraws, qEntries: a.qEntries, qSum: a.qSum,
  envCounters: a.envCounters, attempts: a.attempts, successes: a.successes, slips: a.slips,
  finalRecordHash: crypto.createHash('sha256').update(JSON.stringify(finalSnap)).digest('hex'),
};
const result = {
  schema: 'study2-readiness/1', fixture: `${SEED}:${INDEX}`, capture: CAPTURE, goal: prov.goal,
  commit: 'd1949f91601683ef2e955f8b766c2e656ffc8047', seedsTouched: touched,
  ticksExecuted: findKey(run, 'ticksExecuted'), loopsExecuted: findKey(run, 'loopsExecuted'),
  runAgentCalls: CAPTURE ? globalThis.__S2_STEP__ + 1 : null,
  fingerprint,
  events: CAPTURE ? events : null,
  maxEventsPerStep: CAPTURE ? Math.max(0, ...eventsPerStep.values()) : null,
  tickLog: CAPTURE ? tickLog : null,
  nodeVersion: process.version,
};
fs.mkdirSync(process.env.OUT, { recursive: true });
fs.writeFileSync(path.join(process.env.OUT, `readiness_${CAPTURE ? 'capture' : 'nocapture'}.json`), JSON.stringify(result));
process.stdout.write('@@S2@@' + JSON.stringify({ capture: CAPTURE, events: CAPTURE ? events.length : null, fingerprint }));
