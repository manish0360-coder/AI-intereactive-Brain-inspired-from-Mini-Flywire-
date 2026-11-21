// ==========================================================
// M16 design calculation 2 (PROPOSAL stage; not an experiment, not a gate). Written 2026-11-21.
// ==========================================================
// Knowledge-guided optimism (KGO), a PROTOTYPE for sizing the proposal; not proposed code.
//
// The finding behind it (m16_design_calc.out, section A): the relational belief only breaks exact ties, so it saves
// steps in a world's first episode, and the planner's optimism (vOpt = 1 for an unknown outcome) then spends much of
// that saving exploring the skipped exits in later episodes. KGO lets the belief reach the planner's values, with no
// new parameter: for exit a at a node of kind k whose exit kinds are j_1..j_w,
//     c(a) = p_k(j_a) / max_b p_k(j_b)                      (the exit's plausibility relative to the node's best)
//     the planner's unknown-outcome mass for (s, a) is multiplied by c(a)
// so the most plausible exit at every node keeps full optimism, the others keep optimism in proportion to how plausible
// the belief finds them, and a uniform belief gives c = 1 everywhere (the current agent exactly). Everything else is
// M14's tie-break loop on world model v6 (rho = 1/2), with the v4 planner (identical to the core planner without hooks).
//
// Arms: NO_REL (the adopted agent), FULL (tie-break only: M15's closed-loop UA agent), KGO (tie-break + KGO), KGO_V
// (KGO with the parameter-free safeguard described at makeAgent; added after the first smoke label showed plain KGO
// failing badly under blocks, reversal and noise).
// Conditions: E7's STABLE / NOISY / REVERSED / SPARSE with 6 episodes per evaluation world and no blocks; and
// BLOCK_RARE / BLOCK_OFTEN (STABLE relation; 6 open episodes, a route edge blocked for 5, reopened with p, 5 after),
// to see whether reduced optimism slows the search for a detour or the change belief's recovery.
// Labels m16int|design|0..N-1 (barred from any later M16 run).
//   node experiments/m16_integration/proposal_inputs/m16_kgo_calc.mjs 40 > experiments/m16_integration/proposal_inputs/m16_kgo_calc.out
// ==========================================================
import { makeStream, randInt } from '../../../cognitive/testbed/rng.mjs';
import { GraphEnv } from '../../../cognitive/testbed/env.mjs';
import { distancesTo, edgeKey } from '../../../cognitive/testbed/worlds.mjs';
import { runEpisode } from '../../../cognitive/testbed/runner.mjs';
import { SignpostEnv } from '../../../cognitive/testbed/task_e6.mjs';
import { E7, KINDS, planSequence, conditionSequence } from '../../../cognitive/testbed/task_e7.mjs';
import { argmaxRandomTie } from '../../../cognitive/testbed/agent_util.mjs';
import { qValues4, valueIteration4 } from '../../../cognitive/mind/v4/planner.mjs';
import { makeWorldModel6 } from '../../../cognitive/mind/v6/world_model.mjs';
import { VOL_DEFAULTS } from '../../../cognitive/mind/v6/agent.mjs';
import { makeBeliefSet, uniqueMode, observationsOfEpisode, loopErase as loopEraseNodes } from '../../../cognitive/mind/relation_belief/belief.mjs';

const N = Number(process.argv[2] ?? 40);
const D = Object.freeze({ episodes: 6, open: 6, blocked: 5, after: 5, families: { RARE: 0.1, OFTEN: 0.9 }, cap: E7.cap });
const BELIEF = Object.freeze({ rule: 'BOCPD', h: 0.01, alpha: 0.5 });

/**
 * M14's tie-break loop (makeSchemaAgent) with the v4 planner and, if kgo, the KGO predictOf hook.
 * verify (KGO_V, the safeguard): KGO acts only in a world where the agent's own first goal-reaching path followed the
 * belief's most probable next kind at every step (the relation CONFIRMED here), and stops for the rest of the world as
 * soon as an exit that has moved in this world fails to move (the world CONTRADICTED it). Parameter-free.
 */
// exploit (EXPLOIT_V, the knowledge-free baseline): after the world's first goal-reaching episode, whatever path it
// took, all optimism about unknown outcomes is removed (c = 0), until an exit that moved in this world fails to move.
// It shares FULL's first episode (same tie-break); only the pruning rule differs from KGO_V.
function makeAgent({ rng, belief, learn, kgo, verify = false, exploit = false }) {
  const P = { ...VOL_DEFAULTS, rhoFixed: 0.5 };
  const model = makeWorldModel6(P);
  const V = new Map(), seen = new Map();             // seen: node label -> { kind, exitKinds } from the agent's own observations
  let cue, visits = [], confirmed = !(verify || exploit), contradicted = false, mapAtStart = null;
  const moved = new Set();                            // pairs that have moved in this world
  const active = () => !(verify || exploit) || (confirmed && !contradicted);   // plain KGO never stops
  const rel = (s, a) => {
    const o = seen.get(s);
    if (!o) return 1;
    const p = belief.predictive(o.kind), best = Math.max(...o.exitKinds.map((j) => p[j]));
    return best > 0 ? p[o.exitKinds[a]] / best : 1;
  };
  const predictOf = (kgo && belief) || exploit ? (s, a) => { const p = model.predict(s, a); if (!active()) return p; const c = exploit ? 0 : rel(s, a); return c === 1 ? p : { ...p, unknown: p.unknown * c }; } : undefined;
  const planOpts = () => ({ gamma: P.gamma, vOpt: P.vOpt, predictOf, rewardOf: (s2) => (s2 === cue ? 1 : 0), doneOf: (s2) => (s2 === cue ? 1 : 0) });
  const note = (o) => { seen.set(o.node, { kind: o.kind, exitKinds: o.exitKinds }); visits.push({ node: o.node, kind: o.kind }); };
  return {
    act(obs) {
      model.visit(obs.node, obs.nActions);
      if (obs.goal !== cue) { cue = obs.goal; V.clear(); }
      if (!visits.length) { note(obs); if (belief) mapAtStart = Array.from({ length: KINDS }, (_, k) => uniqueMode(belief.predictive(k))); }
      const opts = planOpts();
      valueIteration4(model, V, { budget: P.budget, theta: P.theta, ...opts });
      const q = qValues4(model, V, obs.node, opts), best = Math.max(...q);
      const tied = q.map((x, i) => (x === best ? i : -1)).filter((i) => i >= 0);
      if (tied.length > 1 && belief) {
        const sc = tied.map((a) => belief.predictive(obs.kind)[obs.exitKinds[a]]), top = Math.max(...sc), keep = tied.filter((_, i) => sc[i] === top);
        if (keep.length < tied.length) return keep.length === 1 ? keep[0] : keep[Math.floor(rng() * keep.length)];
      }
      return argmaxRandomTie(q, rng);
    },
    observe(tr) {
      const { obs, action, reward, next, done, truncated } = tr;
      model.visit(next.node, next.nActions);
      model.update(obs.node, action, next.node, reward, done);
      const key = `${obs.node}|${action}`;
      if (next.node !== obs.node) { note(next); moved.add(key); } else if (moved.has(key)) contradicted = true;
      if (done || truncated) {
        if (done && reward > 0 && learn.open && belief && visits.length > 1) {
          const obsK = observationsOfEpisode(visits, KINDS);
          if (verify && !confirmed) {
            // the loop-erased path's every step must follow the belief's most probable next kind (as held at episode start)
            const kindOf = new Map(visits.map((v) => [v.node, v.kind]));
            const path = loopEraseNodes(visits.map((v) => v.node));
            confirmed = path.length > 1 && path.slice(0, -1).every((u, i) => mapAtStart[kindOf.get(u)] === kindOf.get(path[i + 1]));
          }
          for (const [k, y] of obsK) belief.observe(k, y);
          learn.open = false;
        }
        if (done && reward > 0 && exploit) confirmed = true;
        visits = [];
      }
    },
  };
}

function blockEdge(entry) {
  const { world, plan } = entry, r = plan.route, ok = [];
  for (let i = 0; i + 1 < r.length; i++) if (distancesTo(world, plan.goal, new Set([edgeKey(r[i], r[i + 1])]))[plan.start] >= 0) ok.push(i);
  if (!ok.length) return null;
  const i = ok[randInt(ok.length, makeStream(`${entry.label}|m16|edge`))];
  return { u: r[i], v: r[i + 1] };
}

function runArm(seq, cond, arm) {
  const block = cond.startsWith('BLOCK_'), family = block ? cond.slice(6) : null;
  const C = conditionSequence(seq, block ? 'STABLE' : cond);
  const b = arm === 'NO_REL' ? null : makeBeliefSet(BELIEF, KINDS);
  const out = { FIRST: 0, LATER: 0, POST_FIRST: 0, POST_LATER: 0, POST_WORLDS: 0, BLOCKED: 0, AFTER: 0, capped: 0, perWorld: [] };
  for (const W of C) {
    const learn = { open: true };
    const agent = makeAgent({ rng: makeStream(`${seq.label}|${cond}|agent|${W.entry.t}`), belief: b, learn, kgo: arm === 'KGO' || arm === 'KGO_V', verify: arm === 'KGO_V', exploit: arm === 'EXPLOIT_V' });
    const env = new GraphEnv(W.entry.world, { seedLabel: `${W.entry.label}|env`, maxSteps: D.cap });
    env.setRewardNode(W.entry.plan.goal); env.setCue(W.entry.plan.goal);
    const senv = new SignpostEnv(env, W.entry.world, W.kinds);
    const ev = W.stage === 'eval';
    let episodes = 1, blockAt = null, reopenAt = null;
    if (ev) {
      episodes = block ? D.open + D.blocked + D.after : D.episodes;
      const edge = block ? blockEdge(W.entry) : null;
      if (edge) { blockAt = D.open; if (makeStream(`${W.entry.label}|m16|${family}|verdict`)() < D.families[family]) reopenAt = D.open + D.blocked; W.edge = edge; }
    }
    let worldSteps = 0;
    for (let ep = 0; ep < episodes; ep++) {
      if (ep === blockAt) env.block(W.edge.u, W.edge.v);
      if (ep === reopenAt) env.unblock(W.edge.u, W.edge.v);
      const r = runEpisode(senv, agent, { start: W.entry.plan.start, maxSteps: D.cap });
      if (r.truncated) out.capped++;
      if (!ev) continue;
      worldSteps += r.steps;
      const post = W.post !== null;
      if (block) {
        if (ep === 0) out.FIRST += r.steps; else if (ep < D.open) out.LATER += r.steps; else if (ep < D.open + D.blocked) out.BLOCKED += r.steps; else out.AFTER += r.steps;
      } else if (ep === 0) { out.FIRST += r.steps; if (post) out.POST_FIRST += r.steps; } else { out.LATER += r.steps; if (post) out.POST_LATER += r.steps; }
    }
    if (ev) { out.perWorld.push(worldSteps); if (W.post !== null) out.POST_WORLDS++; }
  }
  return out;
}

const CONDS = ['STABLE', 'NOISY', 'REVERSED', 'SPARSE', 'BLOCK_RARE', 'BLOCK_OFTEN'];
const ARMS = ['NO_REL', 'FULL', 'KGO', 'KGO_V', 'EXPLOIT_V'];
const t0 = Date.now();
const rows = [];
for (let i = 0; i < N; i++) {
  const seq = planSequence(`m16int|design|${i}`);
  if (seq.excluded) continue;
  const r = { i };
  for (const c of CONDS) { r[c] = {}; for (const a of ARMS) r[c][a] = runArm(seq, c, a); }
  rows.push(r);
}

function boot(xs, name, B = 4000) {
  const n = xs.length, mean = xs.reduce((a, b) => a + b, 0) / n, rnd = makeStream(`m16int|design|kgo|boot|${name}`), ms = [];
  for (let b = 0; b < B; b++) { let s = 0; for (let j = 0; j < n; j++) s += xs[randInt(n, rnd)]; ms.push(s / n); }
  ms.sort((a, b) => a - b);
  return `${mean.toFixed(1)} [${ms[Math.floor(0.025 * B)].toFixed(1)}, ${ms[Math.floor(0.975 * B) - 1].toFixed(1)}]`;
}
const mean = (c, a, k) => rows.reduce((s, r) => s + r[c][a][k], 0) / rows.length;
const d = (c, a1, a2, k) => rows.map((r) => r[c][a1][k] - r[c][a2][k]);
const tot = (c, a) => rows.map((r) => r[c][a].FIRST + r[c][a].LATER + r[c][a].BLOCKED + r[c][a].AFTER);

console.log(`M16 design calculation 2 (knowledge-guided optimism, prototype): ${rows.length} labels, ${((Date.now() - t0) / 1000).toFixed(0)} s`);
console.log(`E7 conditions: ${D.episodes} episodes per evaluation world, no blocks. BLOCK_*: STABLE relation, ${D.open} open + ${D.blocked} blocked + ${D.after} after episodes. Steps summed over the 16 evaluation worlds of a label; 95% percentile bootstrap over labels.\n`);
for (const c of CONDS) {
  console.log(c);
  for (const a of ARMS) console.log(`  ${a.padEnd(7)} FIRST ${mean(c, a, 'FIRST').toFixed(1).padStart(6)}  LATER ${mean(c, a, 'LATER').toFixed(1).padStart(6)}${c === 'REVERSED' ? `  post-switch FIRST ${mean(c, a, 'POST_FIRST').toFixed(1)} LATER ${mean(c, a, 'POST_LATER').toFixed(1)}` : ''}${c.startsWith('BLOCK') ? `  BLOCKED ${mean(c, a, 'BLOCKED').toFixed(1).padStart(6)}  AFTER ${mean(c, a, 'AFTER').toFixed(1).padStart(6)}` : ''}  total ${(tot(c, a).reduce((x, y) => x + y, 0) / rows.length).toFixed(1).padStart(7)}  capped ${rows.reduce((s, r) => s + r[c][a].capped, 0)}`);
  console.log(`  total: NO_REL - FULL ${boot(rows.map((r, j) => tot(c, 'NO_REL')[j] - tot(c, 'FULL')[j]), `${c}|nf`)}; FULL - KGO ${boot(rows.map((r, j) => tot(c, 'FULL')[j] - tot(c, 'KGO')[j]), `${c}|fk`)}; FULL - KGO_V ${boot(rows.map((r, j) => tot(c, 'FULL')[j] - tot(c, 'KGO_V')[j]), `${c}|fkv`)}; NO_REL - KGO_V ${boot(rows.map((r, j) => tot(c, 'NO_REL')[j] - tot(c, 'KGO_V')[j]), `${c}|nkv`)}`);
  console.log(`  KGO_V by window, FULL - KGO_V: FIRST ${boot(d(c, 'FULL', 'KGO_V', 'FIRST'), `${c}|fvF`)}; LATER ${boot(d(c, 'FULL', 'KGO_V', 'LATER'), `${c}|fvL`)}${c === 'REVERSED' ? `; post-switch FIRST ${boot(d(c, 'FULL', 'KGO_V', 'POST_FIRST'), `${c}|fvPF`)}, LATER ${boot(d(c, 'FULL', 'KGO_V', 'POST_LATER'), `${c}|fvPL`)}` : ''}${c.startsWith('BLOCK') ? `; BLOCKED ${boot(d(c, 'FULL', 'KGO_V', 'BLOCKED'), `${c}|fvB`)}; AFTER ${boot(d(c, 'FULL', 'KGO_V', 'AFTER'), `${c}|fvA`)}` : ''}`);
  console.log(`  knowledge's own contribution, EXPLOIT_V - KGO_V: total ${boot(rows.map((r, j) => tot(c, 'EXPLOIT_V')[j] - tot(c, 'KGO_V')[j]), `${c}|ev`)}; LATER ${boot(d(c, 'EXPLOIT_V', 'KGO_V', 'LATER'), `${c}|evL`)}${c.startsWith('BLOCK') ? `; BLOCKED ${boot(d(c, 'EXPLOIT_V', 'KGO_V', 'BLOCKED'), `${c}|evB`)}` : ''}`);
  const worstV = rows.map((r) => Math.max(...r[c].KGO_V.perWorld.map((x, w) => x - r[c].FULL.perWorld[w])));
  console.log(`  worst single world, KGO_V - FULL steps: median over labels ${[...worstV].sort((x, y) => x - y)[Math.floor(worstV.length / 2)]}, max ${Math.max(...worstV)}`);
  console.log(`  FIRST: FULL - KGO ${boot(d(c, 'FULL', 'KGO', 'FIRST'), `${c}|fkF`)}; LATER: FULL - KGO ${boot(d(c, 'FULL', 'KGO', 'LATER'), `${c}|fkL`)}${c === 'REVERSED' ? `; post-switch FIRST FULL - KGO ${boot(d(c, 'FULL', 'KGO', 'POST_FIRST'), `${c}|fkPF`)}; post-switch LATER ${boot(d(c, 'FULL', 'KGO', 'POST_LATER'), `${c}|fkPL`)}` : ''}${c.startsWith('BLOCK') ? `; BLOCKED FULL - KGO ${boot(d(c, 'FULL', 'KGO', 'BLOCKED'), `${c}|fkB`)}; AFTER FULL - KGO ${boot(d(c, 'FULL', 'KGO', 'AFTER'), `${c}|fkA`)}` : ''}`);
  const worst = rows.map((r) => Math.max(...r[c].KGO.perWorld.map((x, w) => x - r[c].FULL.perWorld[w])));
  console.log(`  worst single world, KGO - FULL steps: median over labels ${[...worst].sort((x, y) => x - y)[Math.floor(worst.length / 2)]}, max ${Math.max(...worst)}`);
}
