// ==========================================================
// CF-06 testbed — task E5: a world whose changes sometimes reverse, at a rate set by the world's family
// ==========================================================
// The question behind it (hypothesis H-VOL): can an agent learn from its own experience how often changes in its
// world reverse, and so re-test an abandoned exit only where that pays?  CF-05b showed that a fixed willingness to
// re-test helps when changes reverse and costs when they do not; E5 makes the reversal rate a property of the world
// that an agent can only learn by living in it.
//
// Hidden per-edge reliabilities U[0.5, 1] (stream `${world}|E5|rel`).  Start S and goal G at distance >= 3 (stream
// `${world}|E5|layout`).  Phases:
//   A  pre-exposure   600 steps, no reward, no cue, 50-step episodes from the start stream
//   B  training       goal G cued and rewarded, 30 episodes from S
//   then EVENTS change events, each:
//      block    an edge on a currently shortest S->G route is blocked without notice (its removal keeps G reachable);
//               BLOCK episodes from S
//      verdict  with probability p (the family's reversal rate) the block is removed without notice; otherwise it
//               stays for the rest of the run
//      after    AFTER episodes from S
// The whole schedule (which edge, whether it reverses) is drawn in advance from `${world}|E5|${family}|events`, from
// the true graph only, so it is identical for every agent in a world and family (common random numbers).  An event
// with no admissible edge is skipped and recorded.
//
// Windows (steps summed over episodes; a capped episode counts its cap): blocked (all BLOCK episodes), after (all
// AFTER episodes), afterReversed / afterPermanent (AFTER episodes of reversed / permanent events), total.
//
// Diagnostics (diagnoseE5, EVALUATION ONLY): after the agent's last step, the environment's trace and the schedule
// give futile re-tests of permanent changes (per event and in total) and, for agents whose model keeps an event log
// (v6), how many of its archived changes and confirmed reversals were real and how many were false alarms of the
// change detector.
//
// Context (ground truth for privileged DIAGNOSTIC arms only, the CF-05b pattern of task E4B): makeAgent receives a
// fifth argument { isBlockedPair(key) }, true iff the edge behind the agent's (observation label, action index) pair
// is blocked at this moment.  cognitive/testbed/arms_v6.mjs is the only consumer and drops it for every ordinary arm.
// ==========================================================
import { GraphEnv } from './env.mjs';
import { distancesTo, edgeKey } from './worlds.mjs';
import { makeStream, shuffled } from './rng.mjs';
import { runEpisode, runSteps } from './runner.mjs';

export const E5_PARAMS = Object.freeze({ exploreSteps: 600, exploreEpisodeLength: 50, trainEpisodes: 30, events: 6, blockEpisodes: 10, afterEpisodes: 10, cap: 200, minDistance: 3 });
export const E5_FAMILIES = Object.freeze({ RARE: 0.1, HALF: 0.5, OFTEN: 0.9 });

/** The start, goal and the full change schedule for one world and family, from the true graph only. */
export function planE5(world, worldLabel, family, P = E5_PARAMS) {
  const p = E5_FAMILIES[family];
  if (p === undefined) throw new Error(`unknown E5 family ${family}`);
  const rnd = makeStream(`${worldLabel}|E5|layout`);
  const nodes = Array.from({ length: world.n }, (_, i) => i);
  const pairs = shuffled(nodes.flatMap((s) => nodes.map((g) => [s, g])), rnd);
  const pick = pairs.find(([s, g]) => distancesTo(world, g)[s] >= P.minDistance);
  if (!pick) return null;
  const [start, goal] = pick;
  const ev = makeStream(`${worldLabel}|E5|${family}|events`);
  const permanent = new Set(), events = [];
  for (let k = 0; k < P.events; k++) {
    const dG = distancesTo(world, goal, permanent), dS = distancesTo(world, start, permanent), d = dG[start];
    const onRoute = world.edges.filter(([u, v]) => !permanent.has(edgeKey(u, v)) && (dS[u] + 1 + dG[v] === d || dS[v] + 1 + dG[u] === d));
    const admissible = shuffled(onRoute, ev).filter(([u, v]) => distancesTo(world, goal, new Set([...permanent, edgeKey(u, v)]))[start] >= 0);
    const reverses = ev() < p;                        // drawn whether or not the event is admissible, so draws stay aligned
    if (!admissible.length) { events.push({ skipped: true }); continue; }
    const edge = admissible[0];
    events.push({ edge, reverses });
    if (!reverses) permanent.add(edgeKey(...edge));
  }
  return { start, goal, family, p, events };
}

export function reliabilitiesE5(world, worldLabel) {
  const rnd = makeStream(`${worldLabel}|E5|rel`);
  return world.edges.map(([u, v]) => [u, v, 0.5 + 0.5 * rnd()]);
}

const sum = (xs) => xs.reduce((a, b) => a + b, 0);

/**
 * EVALUATION ONLY: ground-truth diagnostics computed after the run from the environment's trace, the schedule and
 * what the agent reported about itself.  Nothing here is reachable by an agent (it runs after the agent's last step).
 *   spans   one per live event: { key, reverses, blockAt, afterAt, endAt } in trace rows (blocked on [blockAt, afterAt)
 *           if it reverses, on [blockAt, end of run) if not)
 *   log     the v6 model's own event log [type, nodeLabel, action, step, rho], or undefined for agents without one
 * Re-tests: an attempt on a PERMANENT change's edge after its block window has ended is futile (the edge never comes
 * back).  ownAfter = attempts on the event's own edge in its own AFTER window; oldPermanent = attempts, anywhere in
 * the event's window, on the edges of earlier permanent events.
 * False alarms: an archive the model opened on an edge that was not blocked at that step; a reversal it confirmed on
 * an archive that was such a false alarm (the declared bias that pushes rho up).
 */
export function diagnoseE5(world, trace, spans, log) {
  const keyOf = (row) => edgeKey(row[2], world.exitOrder[row[2]][row[3]]);
  const blockedSpan = (key, i) => spans.find((sp) => sp.key === key && sp.blockAt <= i && i < (sp.reverses ? sp.afterAt : Infinity)) ?? null;
  const perEvent = spans.map(() => ({ ownAfter: 0, oldPermanent: 0, crossed: 0 }));
  let futile = 0, w = 0;
  for (let i = 0; i < trace.length; i++) {
    while (w < spans.length && i >= spans[w].endAt) w++;
    const inWindow = w < spans.length && i >= spans[w].blockAt;
    const row = trace[i], key = keyOf(row);
    for (let j = 0; j < spans.length; j++) {
      const sp = spans[j];
      if (sp.key !== key || i < sp.afterAt) continue;
      if (j === w && inWindow) { perEvent[j].ownAfter++; if (sp.reverses && row[2] !== row[4]) perEvent[j].crossed++; }
      if (!sp.reverses) { futile++; if (inWindow && j < w) perEvent[w].oldPermanent++; }
    }
  }
  let alarms = null;
  if (Array.isArray(log)) {
    const openOf = new Map(), rhoAtDetection = spans.map(() => null);
    alarms = { opensReal: 0, opensRealReversing: 0, opensRealPermanent: 0, opensFalse: 0, opensFalseBeforeFirstChange: 0, confirmsReal: 0, confirmsFalse: 0, changesDetected: 0, rhoAtDetection };
    for (const [type, label, a, i, rho] of log) {
      const row = trace[i], s = world.nodeOfLabel.get(label);
      if (!row || row[2] !== s || row[3] !== a) throw new Error(`event log row ${i} does not match the environment trace`);
      const id = `${label}|${a}`;
      if (type === 'open') {
        const sp = blockedSpan(keyOf(row), i);
        openOf.set(id, sp);
        if (sp) { alarms.opensReal++; if (sp.reverses) alarms.opensRealReversing++; else alarms.opensRealPermanent++; const k = spans.indexOf(sp); if (rhoAtDetection[k] === null) { rhoAtDetection[k] = rho; alarms.changesDetected++; } }
        else { alarms.opensFalse++; if (!spans.length || i < spans[0].blockAt) alarms.opensFalseBeforeFirstChange++; }
      } else if (type === 'confirm') {
        if (!openOf.has(id)) throw new Error(`event log confirms an archive it never opened (${id})`);
        if (openOf.get(id)) alarms.confirmsReal++; else alarms.confirmsFalse++;
        openOf.delete(id);
      } else throw new Error(`unknown event log entry ${type}`);
    }
  }
  return { futileRetests: futile, perEvent, alarms };
}

export function runE5({ world, worldLabel, family, kind, params = {}, makeAgent, P = E5_PARAMS }) {
  const plan = planE5(world, worldLabel, family, P);
  if (!plan) return { task: 'E5', world: worldLabel, family, kind, excluded: true };
  const env = new GraphEnv(world, { seedLabel: `${worldLabel}|E5|env`, maxSteps: P.cap });
  for (const [u, v, q] of reliabilitiesE5(world, worldLabel)) env.setReliability(u, v, q);
  const pairEdge = new Map();
  world.labelOf.forEach((lab, u) => world.exitOrder[u].forEach((v, i) => pairEdge.set(`${lab}|${i}`, edgeKey(u, v))));
  const context = Object.freeze({ isBlockedPair: (key) => pairEdge.has(key) && env.inspect().blocked.includes(pairEdge.get(key)) });
  const agent = makeAgent(kind, env, `${worldLabel}|E5|agent`, params[kind] ?? {}, context);
  env.setRewardNode(null); env.setCue(null);
  let t = runSteps(env, agent, { total: P.exploreSteps, episodeLength: P.exploreEpisodeLength }).steps;   // trace rows so far
  env.setRewardNode(plan.goal); env.setCue(plan.goal);
  const run = (n) => Array.from({ length: n }, () => { const r = runEpisode(env, agent, { start: plan.start }); t += r.steps; return r; });
  const train = run(P.trainEpisodes);
  const perEvent = [], spans = [];
  for (const e of plan.events) {
    if (e.skipped) { perEvent.push({ skipped: true }); continue; }
    const blockAt = t;
    env.block(...e.edge);
    const blocked = run(P.blockEpisodes);
    const afterAt = t;
    if (e.reverses) env.unblock(...e.edge);
    const after = run(P.afterEpisodes);
    spans.push({ key: edgeKey(...e.edge), reverses: e.reverses, blockAt, afterAt, endAt: t });
    perEvent.push({ reverses: e.reverses, blocked: sum(blocked.map((r) => r.steps)), after: sum(after.map((r) => r.steps)), crossed: 0, capped: [...blocked, ...after].filter((r) => r.truncated).length });
  }
  const info = typeof agent.inspect === 'function' ? agent.inspect() : {};   // the agent has taken its last step
  const trace = env.trace();
  if (trace.length !== t) throw new Error('step count does not match the environment trace');
  const diag = diagnoseE5(world, trace, spans, info.volatility?.log);
  const live = perEvent.filter((e) => !e.skipped);
  live.forEach((e, k) => { if (e.reverses) e.crossed = diag.perEvent[k].crossed; e.ownAfterAttempts = diag.perEvent[k].ownAfter; e.oldPermanentAttempts = diag.perEvent[k].oldPermanent; });
  const pick = (f) => sum(live.filter(f).map((e) => e.after));
  return {
    task: 'E5', world: worldLabel, family, kind, start: plan.start, goal: plan.goal,
    events: perEvent, reversedEvents: live.filter((e) => e.reverses).length, permanentEvents: live.filter((e) => !e.reverses).length, skippedEvents: perEvent.length - live.length,
    windows: { train: sum(train.slice(-5).map((r) => r.steps)), blocked: sum(live.map((e) => e.blocked)), after: sum(live.map((e) => e.after)), afterReversed: pick((e) => e.reverses), afterPermanent: pick((e) => !e.reverses) },
    metric: sum(live.map((e) => e.blocked + e.after)),
    censored: [...train].filter((r) => r.truncated).length + sum(live.map((e) => e.capped)),
    secondary: { compute: info.compute ?? null, model: info.model ?? null, recovery: info.recovery ?? null, volatility: info.volatility ?? null },
    diagnostics: { evaluationOnly: true, futileRetests: diag.futileRetests, alarms: diag.alarms },
  };
}
