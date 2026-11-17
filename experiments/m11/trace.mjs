// ==========================================================
// M11 — passive trace recorder for task E5 runs (EVALUATION ONLY)
// ==========================================================
// traced(agent, context) wraps an agent built for task E5. act, observe and inspect pass straight through: the agent
// receives exactly what it would receive without the wrapper, and nothing the wrapper reads is returned to it.
//
// On each observe, BEFORE the agent updates, the recorder notes:
//   - what the agent tried (its node label and action index) and whether it moved;
//   - the ground truth for that exit, from the task's context.isBlockedPair. That is evaluation only and is never
//     handed to the agent;
//   - the agent's predicted probability that the exit works, 1 - predict(s, a).self, from the model it acted on.
//
// From the first attempt on an exit while the task has it blocked, the recorder follows that exit. It adds a point
// whenever the exit's predicted probability moves by at least TRACE_RESOLUTION, its ground truth changes, or the agent
// tries it.
//
// Reading predict() changes nothing: v3 caches a pure function of the model version, and v6 adds a pure mixture.
// cognitive/tests/test_m11_env.mjs checks that traced and untraced runs give identical rows.
// ==========================================================
export const TRACE_RESOLUTION = 0.001;

const round4 = (x) => Math.round(x * 1e4) / 1e4;

export function traced(agent, context) {
  if (!agent || !agent._model || typeof agent._model.predict !== 'function') throw new Error('traced() needs an agent that exposes its model');
  if (!context || typeof context.isBlockedPair !== 'function') throw new Error('traced() needs the E5 task context');
  const model = agent._model;
  const pWorks = (s, a) => 1 - model.predict(s, a).self;
  const steps = [];                              // [t, node label, action, moved 0/1, blocked 0/1, pWorks]
  const followed = new Map();                    // `${label}|${action}` -> { node, action, points: [[t, pWorks, blocked, tried]] }
  let t = 0;

  const wrapper = {
    kind: agent.kind,
    act: (obs) => agent.act(obs),
    observe(tr) {
      const s = tr.obs.node, a = tr.action, key = `${s}|${a}`;
      const blocked = context.isBlockedPair(key) ? 1 : 0;
      const moved = tr.next.node !== s ? 1 : 0;
      const p = pWorks(s, a);
      steps.push([t, s, a, moved, blocked, round4(p)]);
      if (blocked && !followed.has(key)) followed.set(key, { node: s, action: a, points: [] });
      for (const [k, f] of followed) {
        const tried = k === key ? 1 : 0;
        const pk = tried ? p : pWorks(f.node, f.action);
        const bk = tried ? blocked : (context.isBlockedPair(k) ? 1 : 0);
        const last = f.points[f.points.length - 1];
        if (!last || tried || bk !== last[2] || Math.abs(pk - last[1]) >= TRACE_RESOLUTION) f.points.push([t, round4(pk), bk, tried]);
      }
      t++;
      agent.observe(tr);
    },
    inspect: () => (typeof agent.inspect === 'function' ? agent.inspect() : {}),
  };

  const record = () => ({
    steps: steps.map((r) => [...r]),
    followed: [...followed].map(([key, f]) => ({ key, node: f.node, action: f.action, points: f.points.map((x) => [...x]) })),
  });
  return { agent: wrapper, record };
}
