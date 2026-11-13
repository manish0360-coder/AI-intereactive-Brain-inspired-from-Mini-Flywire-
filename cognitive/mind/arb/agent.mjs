// ==========================================================
// CF-04 mind — ARB: reliability arbitration between a planner and a habit learner (the mechanism under test)
// ==========================================================
// Two complete controllers learn from every transition:
//   planner  MBVI3 (world model v3 + value iteration), unchanged
//   habit    tabular one-step Q-learning with the QL baseline's update rule and parameters
// One selector chooses which controller's action is executed, and logs it.
//
// Reliability signals, each measured against that controller's own expected error so that irreducible noise does
// not count against it (the CF-03b review's objection to comparing raw errors):
//   planner  state-prediction error  spe = 1 - p_model(observed outcome), minus its expectation under the model's
//            own predictive distribution, 1 - sum_i p_i^2.  Mean zero when the model is right, positive when the
//            world has stopped behaving as the model says.
//   habit    |TD error| (clipped to 1), minus its own slow running average.
// Each excess is smoothed with rate `rate`.  The habit controller acts while
//       smoothed planner excess - smoothed habit excess > theta
// and the planner acts otherwise.
//
// Modes (params.mode):
//   RELIABILITY  the rule above                                   (kind ARB)
//   RANDOM       the habit acts with probability mfShare per decision, independently of any signal
//                (kind RANDSWITCH: the control for "any switching helps")
// inspect().control reports decisions, habit decisions and share, switches, disagreements (the two controllers
// proposed different actions) and decisive habit decisions (the habit acted AND disagreed with the planner).
// ==========================================================
import { argmaxRandomTie, makeTable } from '../../testbed/agent_util.mjs';
import { makeMBVI3 } from '../v3/agent.mjs';

export const ARB_DEFAULTS = Object.freeze({ alpha: 0.5, gamma: 0.95, epsilon: 0.1, rate: 0.1, slowRate: 0.01, theta: 0.05, mode: 'RELIABILITY', mfShare: 0 });

export function makeARB({ rng, params = {}, kind = 'ARB' }) {
  const P = { ...ARB_DEFAULTS, ...params };
  if (!['RELIABILITY', 'RANDOM'].includes(P.mode)) throw new Error(`unknown arbitration mode ${P.mode}`);
  const planner = makeMBVI3({ rng, params: P.planner ?? {} });
  const model = planner._model;              // the planner's own model, read for its predictive probabilities
  const Q = makeTable();
  const control = { decisions: 0, habitDecisions: 0, switches: 0, disagreements: 0, decisiveHabit: 0 };
  let eMB = 0, eMF = 0, slowMF = 0, last = null;
  return {
    kind,
    act(obs) {
      const aMB = planner.act(obs);
      const row = Q.row(obs.node, obs.goal, obs.nActions);
      const aMF = rng() < P.epsilon ? Math.floor(rng() * obs.nActions) : argmaxRandomTie(row, rng);
      const useHabit = P.mode === 'RANDOM' ? rng() < P.mfShare : eMB - eMF > P.theta;
      control.decisions++;
      if (useHabit) control.habitDecisions++;
      if (aMB !== aMF) { control.disagreements++; if (useHabit) control.decisiveHabit++; }
      if (last !== null && last !== useHabit) control.switches++;
      last = useHabit;
      return useHabit ? aMF : aMB;
    },
    observe(tr) {
      const { obs, action, reward, next, done } = tr;
      // planner signal, from the model as it stood BEFORE this transition
      const p = model.predict(obs.node, action);
      const expected = 1 - (p.self ** 2 + p.unknown ** 2 + p.outcomes.reduce((s, [, x]) => s + x ** 2, 0));
      const excessMB = (1 - model.probOf(obs.node, action, next.node)) - expected;
      // habit signal and update
      const row = Q.row(obs.node, obs.goal, obs.nActions);
      const delta = reward + (done ? 0 : P.gamma * Math.max(...Q.row(next.node, next.goal, next.nActions))) - row[action];
      const abs = Math.min(1, Math.abs(delta));
      const excessMF = abs - slowMF;
      slowMF += P.slowRate * (abs - slowMF);
      eMB += P.rate * (excessMB - eMB);
      eMF += P.rate * (excessMF - eMF);
      row[action] += P.alpha * delta;
      planner.observe(tr);
    },
    inspect() {
      const inner = planner.inspect();
      return {
        control: { ...control, habitShare: control.decisions ? control.habitDecisions / control.decisions : 0, signals: { planner: eMB, habit: eMF } },
        compute: inner.compute, model: inner.model,
      };
    },
  };
}
