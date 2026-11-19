// ==========================================================
// M15 mind — the adopted agent breaking exact planner ties by a relational belief (certainty-equivalent)
// ==========================================================
// The decision rule is M14's, reused unchanged: cognitive/mind/schema/agent.mjs (makeSchemaAgent) runs the adopted
// agent's loop (AD-13: world model v6, value iteration, greedy choice) and, only among exits tied exactly at the
// highest value, keeps those whose kind scores highest for the current kind; any remaining tie goes to the same random
// draw. Here the score of exit kind j at a node of kind k is the belief's predictive probability p_k(j). Only the
// ranking of p matters (PROPOSAL section 2.6): no claim about uncertainty-guided decisions is made.
//
// Learning: after an episode that reaches the goal, if the agent is learning, the places it stood on (with their
// kinds) give at most one observation per kind (belief.mjs, observationsOfEpisode), which the belief absorbs. With
// learn = false (a frozen arm after the warm-up) nothing is absorbed; a frozen belief also throws if asked.
// With belief = null the agent is the adopted agent, draw for draw (M14's identity, re-tested for M15).
// ==========================================================
import { makeSchemaAgent } from '../schema/agent.mjs';
import { observationsOfEpisode } from './belief.mjs';

/** The schema interface M14's agent expects, backed by a belief set. absorbed collects every observation passed on. */
export function beliefAsSchema(belief, absorbed = []) {
  return {
    nKinds: belief.K,
    learnable: belief.learnable,
    score: (k, j) => belief.predictive(k)[j],
    learnEpisode(visits) {
      for (const [k, y] of observationsOfEpisode(visits, belief.K)) { belief.observe(k, y); absorbed.push([k, y]); }
    },
  };
}

export function makeBeliefAgent({ rng, params = {}, belief = null, learn = false, kind = 'BELIEF_TIE' }) {
  const absorbed = [];
  const agent = makeSchemaAgent({ rng, params, schema: belief ? beliefAsSchema(belief, absorbed) : null, learn, kind });
  return { ...agent, absorbed: () => absorbed.map((x) => [...x]) };
}
