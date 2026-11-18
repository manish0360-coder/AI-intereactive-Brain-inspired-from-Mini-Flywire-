// ==========================================================
// M14 mind — the adopted agent with a kind schema that orders its exploration
// ==========================================================
// The agent loop is the adopted agent's (cognitive/mind/v6/agent.mjs, makeVOL, with the caller's parameters): world
// model v6, value iteration with the frozen core planner, optimism for the unknown, greedy choice, uniform tie-break.
// One thing is added, and only where the planner has no preference:
//
//   When several exits share the highest value (in a new world, typically the exits not yet tried) and the
//   observation carries exit kinds, the agent keeps only the tied exits whose kind scores highest under the schema
//   for its current kind, and breaks any remaining tie as before. If the schema scores all tied exits equally, or
//   there is no schema or no kinds, the choice is exactly the adopted agent's, with the same random draw.
//
// The schema never changes a value and never overrides the planner: an exit the agent has learned is worse is never
// chosen because of its kind. After every episode that reaches the goal the agent passes the places it stood on, with
// their kinds, to the schema, if the schema is learning. A frozen schema throws on learning, so the caller sets
// learn = false for test worlds.
// ==========================================================
import { argmaxRandomTie } from '../../testbed/agent_util.mjs';
import { qValues, valueIteration } from '../../core/planner.mjs';
import { makeWorldModel6 } from '../v6/world_model.mjs';
import { VOL_DEFAULTS } from '../v6/agent.mjs';

export function makeSchemaAgent({ rng, params = {}, schema = null, learn = false, kind = 'SCHEMA' }) {
  const P = { ...VOL_DEFAULTS, ...params };
  const model = makeWorldModel6(P);
  const V = new Map();
  let cue;
  let visits = [];
  const stats = { decisions: 0, ties: 0, schemaNarrowed: 0, schemaDecided: 0, learnedEpisodes: 0 };
  const planOpts = () => ({
    gamma: P.gamma, vOpt: P.vOpt,
    rewardOf: cue !== null ? (s2) => (s2 === cue ? 1 : 0) : (s2) => model.rewardProb(s2),
    doneOf: cue !== null ? (s2) => (s2 === cue ? 1 : 0) : (s2) => model.doneProb(s2),
  });
  const note = (o) => { if (o && o.exitKinds) visits.push({ node: o.node, kind: o.kind, exitKinds: [...o.exitKinds] }); };
  return {
    kind,
    act(obs) {
      model.visit(obs.node, obs.nActions);
      if (obs.goal !== cue) { cue = obs.goal; V.clear(); }
      if (!visits.length) note(obs);
      const opts = planOpts();
      valueIteration(model, V, { budget: P.budget, theta: P.theta, ...opts });
      stats.decisions++;
      const q = qValues(model, V, obs.node, opts);
      const best = Math.max(...q);
      const tied = q.map((x, i) => (x === best ? i : -1)).filter((i) => i >= 0);
      if (tied.length > 1) {
        stats.ties++;
        if (schema && obs.exitKinds) {
          const sc = tied.map((a) => schema.score(obs.kind, obs.exitKinds[a]));
          const top = Math.max(...sc);
          const keep = tied.filter((_, i) => sc[i] === top);
          if (keep.length < tied.length) {
            stats.schemaNarrowed++;
            if (keep.length === 1) { stats.schemaDecided++; return keep[0]; }
            return keep[Math.floor(rng() * keep.length)];
          }
        }
      }
      return argmaxRandomTie(q, rng);
    },
    observe(tr) {
      const { obs, action, reward, next, done, truncated } = tr;
      model.visit(next.node, next.nActions);
      model.update(obs.node, action, next.node, reward, done);
      if (next.node !== obs.node) note(next);
      if (done || truncated) {
        if (done && reward > 0 && learn && schema && schema.learnable && visits.length > 1) { schema.learnEpisode(visits); stats.learnedEpisodes++; }
        visits = [];
      }
    },
    inspect: () => ({ schemaStats: { ...stats }, model: { states: model.states().size } }),
    _model: model, _V: V,
  };
}
