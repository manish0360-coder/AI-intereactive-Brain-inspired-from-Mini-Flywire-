// ==========================================================
// ACQ-1 — baseline sessions in a static environment (uses the COG-A agents unchanged)
// ==========================================================
// Same step loop and episode rule as ../agents.mjs runBaseline.  The agent stream is condition-specific from step 0
// (world, agent, E1 / E2): the two sessions of a world share the environment's common random numbers and nothing else.
// ==========================================================
import { makeAgent } from '../agents.mjs';
import { EPISODE_CAP } from '../config.mjs';
import { stream, agentStream } from '../rngid.mjs';
import { AcqEnv } from './env.mjs';

export function runAcq({ world, agent: kind, env: envName, params = {}, steps, agentFactory = null, onDecision = null }) {
  const env = new AcqEnv(world, envName);
  const agent = (agentFactory || makeAgent)(kind, params);
  const rng = stream(agentStream(world.id, kind, envName));
  let s = env.nextStart(), epSteps = 0;
  const arrivals = [];
  for (let t = 0; t < steps; t++) {
    if (onDecision) onDecision(t, s, agent);
    const a = agent.act(s, rng);
    const ok = env.attempt(s, a, t);
    const s2 = ok ? a : s, terminal = s2 === world.goal;
    agent.learn(s, a, terminal ? 1 : 0, s2, terminal, rng);
    epSteps++;
    if (terminal) arrivals.push(t);
    if (terminal || epSteps >= EPISODE_CAP) { s = env.nextStart(); epSteps = 0; } else s = s2;
  }
  return { agent: kind, env: envName, world: world.id, log: env.log, arrivals, refused: env.refused, self: env.self };
}
