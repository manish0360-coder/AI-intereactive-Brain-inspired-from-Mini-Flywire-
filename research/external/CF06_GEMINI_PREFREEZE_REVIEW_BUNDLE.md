# Pre-freeze review bundle: draft specification CF-06 (learning how often changes reverse)

> Generated from the repository at commit `3a3fd55`. **The experiment has not been run.** The specification is a draft; its driver refuses to run until the owner marks it frozen and its hash is recorded.

## How to read this bundle

Everything outside the appendices was written by the party whose design is under review. Treat it as a claim to check against the appendices (the draft specification, the source and the earlier results, verbatim, each with its SHA-256). Earlier outside reviews of this project restated the cover and missed defects that were visible in the code; please work from the appendices.

**Please answer every numbered question below** with a verdict (sound / sound with caveats / weak / wrong), one to three sentences citing an appendix, and the concrete change you would require before freezing. Then rank the five most serious problems and say whether the gate should be frozen as drafted, frozen after named changes, or not run.

## Context in one paragraph

A small reinforcement-learning testbed (24-node graphs, hidden edge reliabilities; the agent sees only its node and the number of exits). The current agent is a learned tabular model with change detection, planned over by value iteration. The previous gate (CF-05b, appendix F) showed that remembering what a changed exit used to do (RECALL) recovers a reopened route but costs steps when the change is permanent, with a break-even reversal probability of about 0.35; its willingness to re-test is fixed in advance. CF-06 asks whether the agent can learn, from its own experience, how often changes reverse. The mechanism (appendix B) is a two-regime belief per changed exit inside a new model version, updated by Bayes from failed re-tests, with the reversal rate pooled across the agent's changes by empirical Bayes. The task (appendix C) has six changes per run; each reverses with a probability set by the world family (0.1, 0.5, 0.9).

## Questions

1. Is task E5 a fair and sufficient test of "learning how often changes reverse"? Is the admission evidence (the best fixed policy flips between families) adequate?
2. Is the two-regime Bayesian belief in appendix B mathematically correct (the likelihoods, the posterior, P(old regime now), the empirical-Bayes fixed point for rho)? Check against the closed-form test in appendix D.
3. The switching hazard h = 0.01 is borrowed from the previous gate's tuning of a different mechanism, and the prior on rho is Beta(1, 1). Are these defensible as fixed a priori, or do they bias the test for or against the mechanism?
4. Criterion V1 requires VOL to beat each of four fixed policies on an equal mix of the three families. Is "equal mix" an arbitrary weighting that decides the result? Would a different defensible weighting reverse the conclusion, and should the gate report or require that?
5. Is V4 (learned rho higher in OFTEN than RARE) a real mechanism check, or could it pass without the mechanism doing anything useful? Is V2's 25-step margin justified?
6. Are the baselines fair: is anything missing (e.g. a fixed rho = 0.5 version of the same model, which separates "a Bayesian belief" from "learning rho")? Are the privileged references used correctly?
7. Statistical plan: 60 worlds, each run in all three families; paired bootstrap over worlds; mix sums per world. Adequate power for V1 against the never-re-testing planner (dev effect 68.5, SD 136.5)? Any dependence between families within a world that the analysis mishandles?
8. Development contamination: the 20 development worlds were used for the admission look and one VOL run with a-priori constants; the driver validation reused 8 of them. Is the disclosure sufficient, and is anything in the specification adjusted to that data?
9. The declared limit: false alarms of the change detector count as confirmed reversals and push rho up. How large a bias could this create in RARE worlds, and should the gate measure it?
10. Is anything in the source (appendices B, C, E) not doing what the specification says?
11. Is this the most valuable next experiment, given the owner's priorities (world modelling, learning and planning, change detection and adaptation, recovery and memory, uncertainty, metacognition, generalisation, efficiency)?

---

# Appendices (verbatim)

## Appendix A. CF-06 DRAFT specification

File: `experiments/cf06/GATE_SPEC.md` · SHA-256 `0c5e3d7fcba25d60c03dfd11318196bca5a7cef68797b7c5c30be912ccf91236` · 166 lines

````markdown
# CF-06 Gate Specification — learning how often changes reverse

**Status.** DRAFT for the owner's review. Not frozen. The driver refuses to run the `gate6` domain until this line
reads "Frozen" and the file's SHA-256 matches `GATE_SPEC.sha256`. No `gate6` world has been run.

- Development evaluation gate, not confirmatory. Commits are local until the owner authorises a push.
- Earlier gates keep their recorded verdicts; no earlier record or frozen file is edited.

## The question

CF-05b showed that remembering what a changed exit used to do (RECALL) recovers a reopened route, but costs steps
when the change is permanent, and that whether it is worth having depends on how often changes reverse (point
break-even 0.35). RECALL's willingness to re-test is fixed in advance. **Can an agent learn from its own experience
how often changes in its world reverse, and so re-test where that pays and stop where it does not?** If so, the
reversal probability stops being a design decision and becomes something the agent works out.

This targets the owner's research priorities 3 (change detection and adaptation), 4 (recovery and memory) and 6
(metacognition: an agent estimating a property of its own world from its own track record).

## The mechanism: world model v6 (`cognitive/mind/v6/`), agent VOL

The existing planner, unchanged (the frozen value-iteration planner, `cognitive/core/planner.mjs`), on a new model
version. v3 is used unchanged as the "current regime" model. v6 adds, inside the model:

1. **Two regimes per changed exit.** When v3 declares that an exit got worse, v6 keeps the prediction it held just
   before (the old regime). The exit is then either *permanent* or *reversing* (returns at a time T after the change,
   T geometric with hazard h = 0.01). A priori P(reversing) = ρ.
2. **Bayesian evidence from re-tests.** Each failed attempt on such an exit is evidence:
   L_perm = q_new^k; L_rev = S(τ_k) q_new^k + Σ_j [S(τ_{j−1}) − S(τ_j)] q_new^(j−1) q_old^(k−j+1), S(t) = (1−h)^t;
   P(reversing | tests) = ρ L_rev / (ρ L_rev + (1−ρ) L_perm); P(old regime now) = P(reversing | tests) ×
   (1 − S(τ_now) q_new^k / L_rev). The first move of such an exit confirms a reversal.
3. **The planning belief** for a changed exit is the mixture of its regimes weighted by P(old regime now).
   `predict()` returns it, so the planner needs no rule of its own.
4. **ρ is learned**, pooled over the agent's own changes by empirical Bayes to a fixed point:
   ρ = (1 + confirmed reversals + Σ P(reversing | tests) over open changes) / (2 + confirmed + open).

**Relation to RECALL.** With ρ fixed at 1 and before any failed re-test, the weight is 1 − (1 − h)^τ, exactly
RECALL's (tested). The difference: ρ is learned, and failed re-tests count as evidence instead of resetting a clock.

**Constants fixed before any development data, not tuned:** h = 0.01 (the setting CF-05b selected for RECALL on its
own tuning worlds); prior Beta(1, 1) on ρ. No setting was changed after a development result.

**Declared limit.** A false alarm of v3's change detector archives an exit that never changed; when it moves again
it counts as a confirmed reversal and pushes ρ up.

## Task E5 (`cognitive/testbed/task_e5.mjs`)

Hidden per-edge reliabilities U[0.5, 1]. 600 unrewarded exploration steps; 30 training episodes to a cued goal at
distance ≥ 3; then **six change events**. Each event blocks, without notice, an edge on a currently shortest route
whose removal keeps the goal reachable; after 10 episodes the block is removed (with probability p) or kept for the
rest of the run; then 10 more episodes. Episodes are capped at 200 steps.

| Family | p (reversal probability) | Reversed / permanent events per run (dev, 20 worlds) |
|---|---|---|
| RARE | 0.1 | 0.65 / 5.15 (0.20 skipped: no admissible edge) |
| HALF | 0.5 | 2.70 / 3.30 |
| OFTEN | 0.9 | 5.45 / 0.55 |

The whole schedule is drawn in advance from the true graph only, so it is identical for every agent in a world and
family. **Every world is run in all three families by every arm.**

**Task admission (development evidence, before this specification).** The task is worth running only if the best
fixed willingness to re-test differs between families. It does, sharply: RECALL 0.01 minus the never-re-testing
planner is **+214 steps [152, 280] in RARE**, +81 [14, 155] in HALF and **−62 [−110, −18] in OFTEN** (20 dev worlds).

## Arms

| Arm | What it is | Role |
|---|---|---|
| MBVI3 | The planner; never re-tests a changed exit | Fixed policy |
| RECALL_003, RECALL_01, RECALL_03 | CF-05b's RECALL at hazard 0.003, 0.01, 0.03 | Fixed policies |
| **VOL** | World model v6, ρ learned | **Primary** |
| VOL_RHO_TRUE | VOL with ρ fixed at the family's true p | Privileged reference (told a property of the world); in no criterion |
| ORACLE | Shortest path on the true current graph | Privileged reference |

## Criteria

All on fresh worlds; mean [95% bootstrap interval] over worlds, paired by world.

| Criterion | Statistic | Rule |
|---|---|---|
| **V1** beats every fixed policy over the equal mix | For each fixed policy X ∈ {MBVI3, RECALL_003, RECALL_01, RECALL_03}: per-world sum over the three families of steps(X) − steps(VOL) | mean > 0 and lower bound > 0, **for all four** |
| **V2** safe where re-testing hurts | RARE: steps(VOL) − steps(MBVI3) | upper bound < 25 steps |
| **V3** helps where changes reverse | OFTEN: steps(MBVI3) − steps(VOL) | mean > 0 and lower bound > 0 |
| **V4** the rate is learned | VOL's final ρ, OFTEN minus RARE, per world | mean > 0 and lower bound > 0 |
| **V5** no regression | VOL − MBVI3 on E1 EXPLORED, E3, E1S EXPLORED, E2P PRE | every upper bound < 10 steps |
| **V6** infrastructure | Two in-process runs identical; all 164 tests pass | all |

| Verdict | Condition | Consequence, fixed now |
|---|---|---|
| SUPPORTED | V1–V6 | Adversarial review, then a proposal to the owner to make v6 the agent's model. Nothing changes in the agent before that decision |
| SUPPORTED WITH EXCEPTIONS | V1 holds; some of V2–V5 fail (listed) | Not adopted as it stands; the failing criterion names the next design question |
| NOT SUPPORTED | V1 fails | Not adopted. Learning the reversal rate within a run is recorded as not enough at this scale |
| INVALID | V6 fails | None |

**Why these criteria.** V1 is the capability claim: no single fixed policy can be best in every family, so an
agent that adapts should beat each of them over a mix of worlds. V2 and V3 say where the adaptation must show:
not paying for re-testing where changes stay, and gaining where they come back. V4 checks the mechanism, so a V1
pass cannot come from something other than learning the rate. The 25-step margin in V2 is about 2% of the
planner's total over a run in RARE (1,216 steps on dev).

## Statistical plan

| Item | Value |
|---|---|
| Domain / worlds | `gate6`; `cf|gate6|world|0…59`, never used before; 24 nodes, 30 edges, maximum degree 4 |
| Sample size | The rule n = max(20, ⌈(2.8·SD/mean)²⌉), capped at 60, on the dev differences of the hardest primary contrast (V1 against MBVI3: mean 68.5, SD 136.5) gives 32; V3 gives 31. **n = 60 (the cap)**, because the V1-against-MBVI3 contrast changes sign between worlds (VOL better in 11 of 20, worse in 9) |
| Smallest detectable effects (80% power, two-sided 5%, n = 60) | V1 against MBVI3: 2.8 × 136.5 / √60 ≈ **49 steps** (dev effect 68.5). V3: ≈ 34 steps (dev 48). V2: ≈ 7 steps |
| Unit and intervals | The world; percentile bootstrap, 10,000 resamples, 95% |
| Truncation | A capped episode counts its cap in every mean and median; capped episodes are counted per arm and family; VOL's count is printed beside the verdict |
| Robust summaries | Medians and per-world counts beside every mean |
| Multiplicity | Five pass/fail conditions plus V1's four parts, all required for SUPPORTED: conservative as a whole. Reported contrasts are uncorrected and cannot change the verdict |
| Reproducibility | Two in-process runs must give identical row hashes; HEAD is recorded at launch and at the end; wall-clock and memory are recorded outside the hashed rows |

## Reported (not pass/fail)

Every arm in every family: total, median, steps while blocked, after reversed and after permanent events, capped
episodes, events per run, work per decision. Every arm against VOL in every family. The HALF family. VOL against the
privileged reference told the true rate (the cost of having to learn the rate). VOL's final ρ per family and the ρ
trajectory over the run for ten worlds per family. Wall-clock per arm.

**Pre-declared expectations** (reported, not tested): V1 holds against the three RECALL rates by a wide margin and
against MBVI3 narrowly; V2 holds; V3 holds; V4 holds; VOL's learned ρ in OFTEN stays well below 0.9 because six
events per run is little evidence, so VOL trails RECALL_01 in OFTEN and trails the true-rate reference.

## Development-domain disclosure (`cf|dev|world|0…19`; observed before this specification was written)

From development scripts kept outside the repository (the admission look and the VOL look), 20 dev worlds, all three
families. VOL was run once on these worlds, with its a-priori constants; nothing was changed afterwards.

| Arm | RARE total | HALF total | OFTEN total | Equal-mix total |
|---|---|---|---|---|
| ORACLE | 1,134.8 | 991.5 | 761.9 | 2,888 |
| MBVI3 (never re-test) | 1,216.0 | 1,109.2 | 925.1 | 3,250 |
| RECALL 0.003 | 1,287.5 | 1,124.8 | 872.9 | 3,285 |
| RECALL 0.01 | 1,430.2 | 1,189.8 | 863.6 | 3,484 |
| RECALL 0.03 | 1,712.8 | 1,424.7 | 884.2 | 4,022 |
| **VOL** | **1,215.8** | **1,088.7** | **877.1** | **3,182** |
| VOL told the true rate | 1,215.5 | 1,090.6 | 865.5 | 3,172 |

| Contrast (dev) | Result |
|---|---|
| V1 parts: X − VOL over the mix | MBVI3 +68.5 (SD 136.5; VOL better in 11, worse in 9); RECALL 0.003 +103.4 (SD 100.9); RECALL 0.01 +301.9 (SD 164.6); RECALL 0.03 +840.0 (SD 625.7) |
| V2: RARE, VOL − MBVI3 | −0.1 [−8.9, 7.8] |
| V3: OFTEN, MBVI3 − VOL | +48.0 [11.1, 92.2] |
| V4: final ρ, OFTEN − RARE | +0.31 (SD 0.14), positive in 20 of 20 worlds. Mean final ρ: RARE 0.34, HALF 0.50, OFTEN 0.65 |
| OFTEN: VOL − RECALL 0.01 | +13.6 [−8.8, 40.0] (VOL slower: ρ learned only to 0.65) |
| Mix: VOL − VOL told the true rate | +10.1 (SD 43.1) |
| V5 battery (driver validation on dev worlds 0–7) | 0.0 on all four tasks: VOL behaves exactly as the planner there |
| Driver validation, dev worlds 0–7 (a subset of the 20 above, so not independent) | All five criteria held; V1 against MBVI3 +108.8 [20.4, 206.6]; V2 +2.1 [−12.4, 13.6]; V3 +98.0 [20.3, 185.8]; V4 +0.32 [0.23, 0.40]; deterministic; 164/164 tests; 0 capped episodes for VOL |
| Expected run time of the gate | About two hours (two in-process runs of 60 worlds × 3 families × 7 arms, plus the battery) |

## Things a reviewer should doubt

1. **V1 against the planner is the weak link.** On dev VOL was better in only 11 of 20 worlds on the mix; the gain
   comes mostly from OFTEN. A null on this part is a real possibility; the other three parts are not close.
2. **Six events per run is little evidence.** The learned rate moves the right way but not far (OFTEN 0.65 for a
   true 0.9). Carrying the learned rate from one world to the next (transfer) is the obvious extension and is not
   tested here.
3. **One kind of change.** Every change is a block on the route, with reversal after exactly 10 episodes. Changes
   of other kinds, other delays, and false alarms of the change detector are not modelled by the task.
4. **h = 0.01 is borrowed from CF-05b's tuning** of a different mechanism on a different task. It sets how soon
   the model expects a reversal; it is not learned.
5. **The families are chosen by the designer.** p = 0.1, 0.5, 0.9 bracket the CF-05b break-even (0.35), but the
   equal mix is one arbitrary weighting; per-family results are reported so other weightings can be read off.
````

## Appendix B. World model v6 (two-regime belief, learned reversal rate)

File: `cognitive/mind/v6/world_model.mjs` · SHA-256 `8b6c4bf0764e899012a567a0b70e7e77d61033b43830540e0261f9e381b98efa` · 119 lines

```js
// ==========================================================
// CF-06 mind — world model v6: v3 plus a belief about whether each changed exit will change back, with the rate at
// which changes reverse LEARNED from the agent's own experience
// ==========================================================
// v3 (cognitive/mind/v3/world_model.mjs) is used unchanged as the "current regime" model.  v6 adds, inside the
// model, what CF-05b's RECALL did beside it, but as inference rather than a fixed rule:
//
// 1. Two regimes per changed exit.  When v3 declares that an exit got WORSE, v6 archives the prediction it held just
//    before (the "old regime").  From then on the exit is either PERMANENT (the old regime never returns) or
//    REVERSING (it returns at a time T after the change, T ~ Geometric(h)).  P(reversing) a priori = rho.
//
// 2. Evidence from re-tests.  Each failed attempt on an archived exit, at tau_i steps after the change, is evidence.
//    With q_new = P(attempt fails | current regime) and q_old = P(attempt fails | old regime) and S(t) = (1 - h)^t:
//        L_perm = q_new^k
//        L_rev  = S(tau_k) q_new^k + sum_{j=1..k} [S(tau_{j-1}) - S(tau_j)] q_new^(j-1) q_old^(k-j+1)     (tau_0 = 0)
//        P(reversing | tests) = rho L_rev / (rho L_rev + (1 - rho) L_perm)
//        P(old regime now)    = P(reversing | tests) * (1 - S(tau_now) q_new^k / L_rev)
//    The first move of an archived exit confirms a reversal: the archive is closed and counted.
//
// 3. The planning belief for an archived exit is the mixture (1 - w) * current + w * old, w = P(old regime now).
//    predict() returns that mixture, so any planner that asks the model gets it; no agent-side rule is needed.
//
// 4. rho is learned and pooled over the agent's changed exits (empirical Bayes, iterated to a fixed point):
//        rho = (a0 + confirmed reversals + sum over open archives P(reversing | tests)) / (a0 + b0 + confirmed + open)
//
// Relation to RECALL (CF-05b): with rho fixed at 1 and before any failed re-test, w = 1 - (1 - h)^tau, exactly RECALL's
// weight.  RECALL then resets on each failed re-test; v6 instead weighs the failure as evidence.  The difference that
// matters: rho is learned, so a world whose changes never reverse teaches the model to stop re-testing.
//
// Known limit, declared: a false alarm of v3's change detector archives an exit that never changed; when it moves
// again it is counted as a confirmed reversal, which pushes rho up.
// ==========================================================
import { makeWorldModel3, WM3_DEFAULTS } from '../v3/world_model.mjs';

export const WM6_DEFAULTS = Object.freeze({ ...WM3_DEFAULTS, volHazard: 0.01, rhoA0: 1, rhoB0: 1, rhoFixed: null, rhoIterations: 30 });

/** P(reversing | tests) and P(old regime now) for one archive.  Pure; exported for tests. */
export function regimeBelief({ rho, h, qNew, qOld, taus, tauNow }) {
  const S = (t) => (1 - h) ** t, k = taus.length;
  let Lrev = S(k ? taus[k - 1] : 0) * qNew ** k, prev = 0;
  for (let j = 1; j <= k; j++) { Lrev += (S(prev) - S(taus[j - 1])) * qNew ** (j - 1) * qOld ** (k - j + 1); prev = taus[j - 1]; }
  const Lperm = qNew ** k;
  const denom = rho * Lrev + (1 - rho) * Lperm;
  const pRev = denom > 0 ? (rho * Lrev) / denom : 0;
  const pOldNow = Lrev > 0 ? pRev * (1 - (S(tauNow) * qNew ** k) / Lrev) : 0;
  return { pRev, pOldNow: Math.min(1, Math.max(0, pOldNow)) };
}

export function makeWorldModel6(params = {}) {
  const P = { ...WM6_DEFAULTS, ...params };
  const base = makeWorldModel3(P);
  const archives = new Map();               // `${s}|${a}` -> { s, a, held, since, taus: [] }
  const vol = { confirmed: 0, opened: 0, rho: P.rhoFixed ?? P.rhoA0 / (P.rhoA0 + P.rhoB0) };
  let clock = 0;
  const clamp = (x) => Math.min(1 - 1e-9, Math.max(1e-9, x));

  function beliefOf(arch, rho) {
    const cur = base.predict(arch.s, arch.a);
    return regimeBelief({ rho, h: P.volHazard, qNew: clamp(cur.self), qOld: clamp(arch.held.self), taus: arch.taus, tauNow: clock - arch.since });
  }

  function refreshRho() {
    if (P.rhoFixed !== null) { vol.rho = P.rhoFixed; return; }
    let rho = vol.rho;
    for (let it = 0; it < P.rhoIterations; it++) {
      let open = 0, s = 0;
      for (const arch of archives.values()) { s += beliefOf(arch, rho).pRev; open++; }
      const next = (P.rhoA0 + vol.confirmed + s) / (P.rhoA0 + P.rhoB0 + vol.confirmed + open);
      const done = Math.abs(next - rho) < 1e-10;
      rho = next;
      if (done) break;
    }
    vol.rho = rho;
  }

  function predict(s, a) {
    const p = base.predict(s, a), arch = archives.get(`${s}|${a}`);
    if (!arch) return p;
    const w = beliefOf(arch, vol.rho).pOldNow;
    if (w <= 0) return p;
    const merged = new Map(p.outcomes.map(([lab, x]) => [lab, (1 - w) * x]));
    for (const [lab, x] of arch.held.outcomes) merged.set(lab, (merged.get(lab) ?? 0) + w * x);
    return { self: (1 - w) * p.self + w * arch.held.self, outcomes: [...merged], unknown: (1 - w) * p.unknown + w * arch.held.unknown, N: p.N };
  }

  function probOf(s, a, s2) {
    const p = predict(s, a);
    if (s2 === s) return p.self;
    const hit = p.outcomes.find(([lab]) => lab === s2);
    return hit ? hit[1] : p.unknown;
  }

  function update(s, a, s2, reward, done) {
    const key = `${s}|${a}`, moved = s2 !== s;
    const arch = archives.get(key);
    if (arch) {
      if (moved) { archives.delete(key); vol.confirmed++; }            // the old regime is back: a confirmed reversal
      else arch.taus.push(clock - arch.since);                         // a failed re-test: evidence
    }
    const held = base.predict(s, a), worse = base.stats().changesDown;
    base.update(s, a, s2, reward, done);
    if (!moved && !archives.has(key) && base.stats().changesDown > worse && held.outcomes.length) {
      archives.set(key, { s, a, held, since: clock, taus: [] }); vol.opened++;
    }
    clock++;
    refreshRho();
  }

  return {
    params: P,
    visit: (s, w) => base.visit(s, w), states: () => base.states(), widthOf: (s) => base.widthOf(s),
    predict, probOf, rewardProb: (s2) => base.rewardProb(s2), doneProb: (s2) => base.doneProb(s2), update,
    countOf: (s, a) => base.countOf(s, a),
    hyper: () => base.hyper(),
    stats: () => ({ ...base.stats(), archivesOpened: vol.opened, archivesOpen: archives.size, reversalsConfirmed: vol.confirmed, rho: vol.rho }),
    volatility: () => ({ rho: vol.rho, confirmed: vol.confirmed, opened: vol.opened, open: archives.size }),
  };
}
```

## Appendix B2. Agent VOL

File: `cognitive/mind/v6/agent.mjs` · SHA-256 `41253d80908460cea1fc92ee538cc869b4dea9d2c19775cc5c3635fba3b08d94` · 55 lines

```js
// ==========================================================
// CF-06 mind — VOL: the existing planner on world model v6
// ==========================================================
// The same agent loop as MBVI3 (cognitive/mind/v3/agent.mjs): value iteration with the FROZEN core planner, optimism
// for the unknown, greedy choice, uniform tie-break.  Only the model differs: v6 returns, for an exit that changed,
// a belief that mixes its current and earlier regimes according to how often the agent has seen changes reverse.
// Nothing outside the model knows about regimes; the planner just asks the model.
// ==========================================================
import { argmaxRandomTie } from '../../testbed/agent_util.mjs';
import { qValues, valueIteration } from '../../core/planner.mjs';
import { makeWorldModel6, WM6_DEFAULTS } from './world_model.mjs';

export const VOL_DEFAULTS = Object.freeze({ gamma: 0.95, budget: 100, theta: 1e-6, vOpt: 1, ...WM6_DEFAULTS });

export function makeVOL({ rng, params = {}, kind = 'VOL' }) {
  const P = { ...VOL_DEFAULTS, ...params };
  const model = makeWorldModel6(P);
  const V = new Map();
  let cue;
  const compute = { decisions: 0, sweeps: 0, backups: 0, budgetHits: 0 };
  const trace = [];                                   // rho after each change archived or reversal confirmed
  const planOpts = () => ({
    gamma: P.gamma, vOpt: P.vOpt,
    rewardOf: cue !== null ? (s2) => (s2 === cue ? 1 : 0) : (s2) => model.rewardProb(s2),
    doneOf: cue !== null ? (s2) => (s2 === cue ? 1 : 0) : (s2) => model.doneProb(s2),
  });
  return {
    kind,
    act(obs) {
      model.visit(obs.node, obs.nActions);
      if (obs.goal !== cue) { cue = obs.goal; V.clear(); }
      const opts = planOpts();
      const r = valueIteration(model, V, { budget: P.budget, theta: P.theta, ...opts });
      compute.decisions++; compute.sweeps += r.sweeps; compute.backups += r.backups; if (!r.converged) compute.budgetHits++;
      return argmaxRandomTie(qValues(model, V, obs.node, opts), rng);
    },
    observe(tr) {
      const { obs, action, reward, next, done } = tr;
      model.visit(next.node, next.nActions);
      const before = model.volatility();
      model.update(obs.node, action, next.node, reward, done);
      const after = model.volatility();
      if (after.opened !== before.opened || after.confirmed !== before.confirmed) trace.push(Number(after.rho.toFixed(4)));
    },
    inspect() {
      return {
        compute: { ...compute, backupsPerDecision: compute.decisions ? compute.backups / compute.decisions : 0, sweepsPerDecision: compute.decisions ? compute.sweeps / compute.decisions : 0, budgetHitShare: compute.decisions ? compute.budgetHits / compute.decisions : 0, budget: P.budget },
        model: { states: model.states().size, ...model.stats() },
        volatility: { ...model.volatility(), rhoTrace: trace },
      };
    },
    _model: model, _V: V,
  };
}
```

## Appendix B3. Registry v6

File: `cognitive/testbed/registry_v6.mjs` · SHA-256 `0fd399c9545a4eac7d1efdfd1dd676edf4888a193d17b0dd97ae058e751d2f64` · 41 lines

```js
// ==========================================================
// CF-06 testbed — agent registry v6: the v5 agents plus VOL (world model v6, learned reversal rate)
// ==========================================================
// The privileged-channel rule is the CF-01 rule (runner.mjs PRIVILEGED, unchanged): only ORACLE receives the oracle.
// Earlier kinds are built by their unchanged factories.
//   VOL          rho learned from experience (the mechanism under test)
//   VOL_RHO      rho fixed by the caller (params.rhoFixed); with the family's true reversal rate it is the reference
//                for what learning rho could achieve.  That value is task knowledge, so such an arm is labelled
//                privileged by whoever builds it and is never a learner arm.
// ==========================================================
import { makeStream } from './rng.mjs';
import { PRIVILEGED } from './runner.mjs';
import { AGENTS_V5 } from './registry_v5.mjs';
import { makeVOL } from '../mind/v6/agent.mjs';

export const VOL_VARIANTS = Object.freeze({
  VOL: Object.freeze({ rhoFixed: null }),
  VOL_RHO: Object.freeze({}),
});
export const MIND6_FILES = Object.freeze(['agent.mjs', 'world_model.mjs']);
export const MIND6_ALLOWED = Object.freeze(['../../testbed/agent_util.mjs', '../../core/planner.mjs', './world_model.mjs', '../v3/world_model.mjs']);
export const AGENTS_V6 = Object.freeze({
  ...AGENTS_V5,
  VOL: (opts) => makeVOL({ ...opts, params: { ...opts.params, ...VOL_VARIANTS.VOL }, kind: 'VOL' }),
  VOL_RHO: (opts) => { if (typeof opts.params.rhoFixed !== 'number') throw new Error('VOL_RHO needs params.rhoFixed'); return makeVOL({ ...opts, kind: 'VOL_RHO' }); },
});

export function agentOptionsV6(kind, env, rngLabel, params = {}) {
  const opts = { rng: makeStream(rngLabel), params };
  if (PRIVILEGED.includes(kind)) opts.oracle = Object.freeze({ bestAction: () => env.oracleBestAction() });
  return opts;
}

export function makeAgentForV6(kind, env, rngLabel, params = {}) {
  const factory = AGENTS_V6[kind];
  if (!factory) throw new Error(`unknown agent kind ${kind}`);
  const agent = factory(agentOptionsV6(kind, env, rngLabel, params));
  if (agent.privileged && !PRIVILEGED.includes(kind)) throw new Error(`${kind} claims privilege it is not granted`);
  return agent;
}
```

## Appendix C. Task E5

File: `cognitive/testbed/task_e5.mjs` · SHA-256 `1a0638f86a536f26b63cb779fc6a04c9e2e8a90e9ebb0cd910111a901475767e` · 101 lines

```js
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

export function runE5({ world, worldLabel, family, kind, params = {}, makeAgent, P = E5_PARAMS }) {
  const plan = planE5(world, worldLabel, family, P);
  if (!plan) return { task: 'E5', world: worldLabel, family, kind, excluded: true };
  const env = new GraphEnv(world, { seedLabel: `${worldLabel}|E5|env`, maxSteps: P.cap });
  for (const [u, v, q] of reliabilitiesE5(world, worldLabel)) env.setReliability(u, v, q);
  const agent = makeAgent(kind, env, `${worldLabel}|E5|agent`, params[kind] ?? {});
  env.setRewardNode(null); env.setCue(null);
  runSteps(env, agent, { total: P.exploreSteps, episodeLength: P.exploreEpisodeLength });
  env.setRewardNode(plan.goal); env.setCue(plan.goal);
  const run = (n) => Array.from({ length: n }, () => runEpisode(env, agent, { start: plan.start }));
  const train = run(P.trainEpisodes);
  const perEvent = [];
  for (const e of plan.events) {
    if (e.skipped) { perEvent.push({ skipped: true }); continue; }
    env.block(...e.edge);
    const blocked = run(P.blockEpisodes);
    const first = env.inspect().episode + 1;
    if (e.reverses) env.unblock(...e.edge);
    const after = run(P.afterEpisodes);
    const [u, v] = e.edge;
    const crossed = e.reverses ? env.trace().filter(([ep, , s, a, s2]) => ep >= first && s !== s2 && ((s === u && world.exitOrder[s][a] === v) || (s === v && world.exitOrder[s][a] === u))).length : 0;
    perEvent.push({ reverses: e.reverses, blocked: sum(blocked.map((r) => r.steps)), after: sum(after.map((r) => r.steps)), crossed, capped: [...blocked, ...after].filter((r) => r.truncated).length });
  }
  const live = perEvent.filter((e) => !e.skipped);
  const pick = (f) => sum(live.filter(f).map((e) => e.after));
  const info = typeof agent.inspect === 'function' ? agent.inspect() : {};
  return {
    task: 'E5', world: worldLabel, family, kind, start: plan.start, goal: plan.goal,
    events: perEvent, reversedEvents: live.filter((e) => e.reverses).length, permanentEvents: live.filter((e) => !e.reverses).length, skippedEvents: perEvent.length - live.length,
    windows: { train: sum(train.slice(-5).map((r) => r.steps)), blocked: sum(live.map((e) => e.blocked)), after: sum(live.map((e) => e.after)), afterReversed: pick((e) => e.reverses), afterPermanent: pick((e) => !e.reverses) },
    metric: sum(live.map((e) => e.blocked + e.after)),
    censored: [...train].filter((r) => r.truncated).length + sum(live.map((e) => e.capped)),
    secondary: { compute: info.compute ?? null, model: info.model ?? null, recovery: info.recovery ?? null, volatility: info.volatility ?? null },
  };
}
```

## Appendix D. Tests for the task and the model

File: `cognitive/tests/test_vol.mjs` · SHA-256 `037e3f66ea75fcc52cff8387d05642e294e2fef30772a3858b070b29fe4f40b5` · 147 lines

```js
// CF-06 tests — task E5 (schedule, common random numbers, windows) and world model v6 / agent VOL (regime belief
// arithmetic, relation to RECALL, learning of the reversal rate, normalisation, isolation, determinism)
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateWorld, distancesTo, edgeKey } from '../testbed/worlds.mjs';
import { GraphEnv } from '../testbed/env.mjs';
import { planE5, runE5, E5_FAMILIES, E5_PARAMS } from '../testbed/task_e5.mjs';
import { AGENTS_V6, MIND6_FILES, MIND6_ALLOWED, agentOptionsV6, makeAgentForV6 } from '../testbed/registry_v6.mjs';
import { AGENTS_V5 } from '../testbed/registry_v5.mjs';
import { PRIVILEGED } from '../testbed/runner.mjs';
import { checkPrivilege } from '../testbed/checks.mjs';
import { checkSourceIsolation } from '../testbed/checks_v1.mjs';
import { regimeBelief, makeWorldModel6 } from '../mind/v6/world_model.mjs';
import { makeStream } from '../testbed/rng.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MIND6_DIR = path.resolve(HERE, '..', 'mind', 'v6');
const LABEL = 'cf|dev|world|5', W = generateWorld(LABEL);
const close = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol, `${a} != ${b}`);
const total = (p) => p.self + p.unknown + p.outcomes.reduce((s, [, x]) => s + x, 0);

/** A model that has learned 12 reliable exits, then sees `n` changes on fresh exits, each reversing or not. */
function livedThrough(reverses, n = 4) {
  const m = makeWorldModel6();
  for (let i = 0; i < 12; i++) for (let j = 0; j < 4; j++) m.update(100 + i, 0, 200 + i, 0, false);
  for (let e = 0; e < n; e++) {
    const s = 300 + e;
    for (let j = 0; j < 30; j++) m.update(s, 0, 400 + e, 0, false);
    let k = 0; while (m.volatility().opened === e && k < 10) { m.update(s, 0, s, 0, false); k++; }
    for (let t = 0; t < 200; t++) m.update(100, 0, 200, 0, false);
    if (reverses) m.update(s, 0, 400 + e, 0, false);
    else for (let r = 0; r < 5; r++) { m.update(s, 0, s, 0, false); for (let t = 0; t < 100; t++) m.update(100, 0, 200, 0, false); }
  }
  return m;
}

export const tests = [
  ['v6 modules import only what they are allowed to, and use no forbidden API', () => {
    assert.deepEqual(fs.readdirSync(MIND6_DIR).filter((f) => f.endsWith('.mjs')).sort(), [...MIND6_FILES].sort());
    for (const f of MIND6_FILES) assert.deepEqual(checkSourceIsolation(fs.readFileSync(path.join(MIND6_DIR, f), 'utf8'), MIND6_ALLOWED, f), []);
    assert.ok(checkSourceIsolation("import { planE5 } from '../../testbed/task_e5.mjs';", MIND6_ALLOWED).length > 0, 'mutant must be caught');
  }],
  ['privilege: only ORACLE receives the oracle channel under the v6 registry; earlier kinds are the earlier factories', () => {
    const env = new GraphEnv(W, { seedLabel: 'cf|test|vol|priv' });
    const opts = (k) => agentOptionsV6(k, env, 'cf|test|vol|priv|agent', k === 'VOL_RHO' ? { rhoFixed: 0.5 } : {});
    assert.deepEqual(checkPrivilege(Object.keys(AGENTS_V6), PRIVILEGED, opts), []);
    for (const k of Object.keys(AGENTS_V5)) assert.equal(AGENTS_V6[k], AGENTS_V5[k]);
    assert.throws(() => makeAgentForV6('VOL_RHO', env, 'x', {}), /rhoFixed/);
    assert.equal(makeAgentForV6('VOL', env, 'x', { rhoFixed: 0.9 }).inspect().volatility.rho, 0.5, 'VOL ignores a caller-supplied rho');
  }],

  // ---- regime belief arithmetic ----
  ['REGIME BELIEF: with no re-test it is rho * (1 - (1 - h)^tau); with rho = 1 that is exactly RECALL\'s weight', () => {
    for (const [rho, tau] of [[1, 0], [1, 50], [1, 400], [0.3, 50], [0, 80]]) close(regimeBelief({ rho, h: 0.01, qNew: 0.999, qOld: 0.2, taus: [], tauNow: tau }).pOldNow, rho * (1 - 0.99 ** tau), 1e-12);
    close(regimeBelief({ rho: 0.4, h: 0.01, qNew: 0.9, qOld: 0.2, taus: [], tauNow: 10 }).pRev, 0.4);
  }],
  ['REGIME BELIEF: a failed re-test lowers both P(reversing) and P(old regime now); later time raises the latter again', () => {
    const base = { rho: 0.5, h: 0.01, qNew: 0.999, qOld: 0.2 };
    const none = regimeBelief({ ...base, taus: [], tauNow: 60 }), one = regimeBelief({ ...base, taus: [60], tauNow: 60 }), two = regimeBelief({ ...base, taus: [60, 120], tauNow: 120 });
    assert.ok(one.pRev < none.pRev && two.pRev < one.pRev, 'each failure is evidence against reversal');
    assert.ok(one.pOldNow < none.pOldNow);
    assert.ok(regimeBelief({ ...base, taus: [60], tauNow: 300 }).pOldNow > one.pOldNow, 'time since the last failure lets the belief recover');
    // closed form for k = 1: Lrev = S(t1) qn + (1 - S(t1)) qo
    const S = 0.99 ** 60, Lrev = S * 0.999 + (1 - S) * 0.2, pRev = 0.5 * Lrev / (0.5 * Lrev + 0.5 * 0.999);
    close(one.pRev, pRev, 1e-12); close(one.pOldNow, pRev * (1 - S * 0.999 / Lrev), 1e-12);
    for (const r of [none, one, two]) assert.ok(r.pRev >= 0 && r.pRev <= 1 && r.pOldNow >= 0 && r.pOldNow <= 1);
  }],

  // ---- learning the reversal rate ----
  ['LEARNING RHO: a world whose changes never reverse drives rho down; one whose changes always reverse drives it up', () => {
    const never = livedThrough(false), always = livedThrough(true);
    assert.ok(never.volatility().rho < 0.25, `never: ${never.volatility().rho}`);
    assert.ok(always.volatility().rho > 0.75, `always: ${always.volatility().rho}`);
    assert.equal(always.volatility().confirmed, 4); assert.equal(never.volatility().confirmed, 0);
    const fixed = makeWorldModel6({ rhoFixed: 0.3 });
    for (let j = 0; j < 30; j++) fixed.update(1, 0, 2, 0, false);
    for (let j = 0; j < 5; j++) fixed.update(1, 0, 1, 0, false);
    assert.equal(fixed.volatility().rho, 0.3, 'rhoFixed is honoured');
  }],
  ['MIXTURE: predictions stay normalised, and an archived exit\'s belief moves toward its old regime with time unobserved', () => {
    const m = makeWorldModel6(); const rnd = makeStream('cf|test|vol|norm');
    for (let i = 0; i < 2000; i++) {
      const s = 1 + Math.floor(rnd() * 6), a = Math.floor(rnd() * 2), dead = s === 3 && i > 800;
      m.update(s, a, dead || rnd() < 0.2 ? s : 1 + Math.floor(rnd() * 6), 0, false);
      if (i % 53 === 0) for (let x = 1; x <= 6; x++) for (let b = 0; b < 2; b++) { const p = m.predict(x, b); close(total(p), 1, 1e-9); assert.ok(p.self >= 0 && p.self <= 1); }
    }
    const g = makeWorldModel6({ rhoFixed: 1 });
    for (let i = 0; i < 12; i++) for (let j = 0; j < 4; j++) g.update(100 + i, 0, 200 + i, 0, false);
    for (let j = 0; j < 30; j++) g.update(1, 0, 2, 0, false);
    let k = 0; while (g.volatility().opened === 0 && k < 10) { g.update(1, 0, 1, 0, false); k++; }
    const early = g.predict(1, 0).self;
    for (let t = 0; t < 300; t++) g.update(100, 0, 200, 0, false);
    assert.ok(g.predict(1, 0).self < early - 0.3, `unobserved for 300 steps the exit is believed likely to work again (${early} -> ${g.predict(1, 0).self})`);
    g.update(1, 0, 2, 0, false);
    assert.equal(g.volatility().open, 0); assert.equal(g.volatility().confirmed, 1);
  }],

  // ---- task E5 ----
  ['E5 SCHEDULE: blocked edges lie on a shortest route of the graph as it is then, keep the goal reachable, and are the same for every agent', () => {
    for (let i = 0; i < 6; i++) for (const fam of Object.keys(E5_FAMILIES)) {
      const label = `cf|dev|world|${i}`, w = generateWorld(label), plan = planE5(w, label, fam);
      assert.ok(plan); assert.equal(plan.events.length, E5_PARAMS.events);
      const permanent = new Set();
      for (const e of plan.events) {
        if (e.skipped) continue;
        const dG = distancesTo(w, plan.goal, permanent), dS = distancesTo(w, plan.start, permanent), d = dG[plan.start], [u, v] = e.edge;
        assert.ok(dS[u] + 1 + dG[v] === d || dS[v] + 1 + dG[u] === d, 'on a shortest route now');
        assert.ok(distancesTo(w, plan.goal, new Set([...permanent, edgeKey(u, v)]))[plan.start] >= 0, 'goal stays reachable');
        if (!e.reverses) permanent.add(edgeKey(u, v));
      }
      assert.deepEqual(planE5(w, label, fam), plan, 'deterministic');
    }
    const rev = (fam) => { let r = 0, n = 0; for (let i = 0; i < 40; i++) { const label = `cf|dev|world|${i}`; for (const e of planE5(generateWorld(label), label, fam).events) if (!e.skipped) { n++; r += e.reverses ? 1 : 0; } } return r / n; };
    assert.ok(rev('RARE') < 0.25 && rev('OFTEN') > 0.75 && Math.abs(rev('HALF') - 0.5) < 0.15, 'reversal shares follow the families');
    assert.throws(() => planE5(W, LABEL, 'NOPE'));
  }],
  ['E5 RUN: rows are deterministic; windows add up; the reference uses a reopened edge unless an equally short route exists', () => {
    const run = (kind, fam) => runE5({ world: W, worldLabel: LABEL, family: fam, kind, makeAgent: makeAgentForV6 });
    const a = run('MBVI3', 'HALF'); assert.deepEqual(a, run('MBVI3', 'HALF'));
    assert.equal(a.metric, a.windows.blocked + a.windows.after); assert.equal(a.windows.after, a.windows.afterReversed + a.windows.afterPermanent);
    assert.equal(a.reversedEvents + a.permanentEvents + a.skippedEvents, E5_PARAMS.events);
    let checked = 0, crossedSome = 0;
    for (let i = 0; i < 4; i++) {
      const label = `cf|dev|world|${i}`, w = generateWorld(label), plan = planE5(w, label, 'OFTEN');
      const o = runE5({ world: w, worldLabel: label, family: 'OFTEN', kind: 'ORACLE', makeAgent: makeAgentForV6 });
      const permanent = new Set();
      plan.events.forEach((e, k) => {
        if (e.skipped) return;
        if (e.reverses) {
          checked++; if (o.events[k].crossed > 0) crossedSome++;
          else assert.equal(distancesTo(w, plan.goal, new Set([...permanent, edgeKey(...e.edge)]))[plan.start], distancesTo(w, plan.goal, permanent)[plan.start], 'skipping the reopened edge only when an equally short route exists');
        } else permanent.add(edgeKey(...e.edge));
      });
    }
    assert.ok(checked > 5 && crossedSome > checked / 2, `the reference crossed ${crossedSome} of ${checked} reopened edges`);
  }],
  ['VOL ON E5: deterministic; reports its learned rate; behaves as the planner until the first change is archived', () => {
    const run = (kind, fam, p = {}) => runE5({ world: W, worldLabel: LABEL, family: fam, kind, makeAgent: (k, e, l) => makeAgentForV6(k, e, l, p) });
    const v = run('VOL', 'HALF'); assert.deepEqual(v, run('VOL', 'HALF'));
    assert.ok(v.secondary.volatility.rho > 0 && v.secondary.volatility.rho < 1);
    assert.equal(v.windows.train, run('MBVI3', 'HALF').windows.train, 'identical to the planner before any change');
    const r = run('VOL_RHO', 'RARE', { rhoFixed: 0.1 }); assert.equal(r.secondary.volatility.rho, 0.1);
  }],
];
```

## Appendix E. Gate driver (criteria as they will be executed)

File: `experiments/cf06/run_gate.mjs` · SHA-256 `c50fcf296a9ef98e0535b6ce965730bb2d2dcccd5f729ae468cf2e23106d0689` · 180 lines

```js
// ==========================================================
// CF-06 — learning how often changes reverse (criteria in experiments/cf06/GATE_SPEC.md)
// ==========================================================
//   node experiments/cf06/run_gate.mjs --domain dev   --out <file outside the repository> [--worlds N]
//   node experiments/cf06/run_gate.mjs --domain gate6
// Every world is run in all three families (RARE 0.1, HALF 0.5, OFTEN 0.9) of task E5, by every arm.
//   V1  equal mix: for every fixed policy X (never re-test; RECALL 0.003, 0.01, 0.03), per-world sum over the three
//       families of steps(X) - steps(VOL), mean > 0 and lower bound > 0
//   V2  RARE (re-testing hurts): steps(VOL) - steps(MBVI3), upper bound < MARGIN
//   V3  OFTEN (re-testing helps): steps(MBVI3) - steps(VOL), mean > 0 and lower bound > 0
//   V4  the rate is learned: VOL's final rho, OFTEN minus RARE, paired by world, mean > 0 and lower bound > 0
//   V5  no regression: steps(VOL) - steps(MBVI3) upper bound < BATTERY_MARGIN on E1 EXPLORED, E3, E1S EXPLORED, E2P PRE
//   V6  infrastructure: two in-process runs identical; all tests pass
// Verdict: INVALID (V6) / NOT SUPPORTED (V1 fails) / SUPPORTED WITH EXCEPTIONS (V1 holds; some of V2-V5 fail,
//          listed) / SUPPORTED (V1-V6).
// Reported, never pass/fail: every arm in every family (mean, median, per-world counts, capped episodes); VOL against
// the privileged reference that is told the family's true rate; the HALF family; learned rho and its trajectory;
// work per decision; wall-clock and memory (outside the hashed rows).
// Refusals on the gate domain: missing or unfrozen specification, specification not matching GATE_SPEC.sha256,
// uncommitted or modified files, gate already run.  HEAD is recorded at launch and at the end.
// ==========================================================
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateWorld } from '../../cognitive/testbed/worlds.mjs';
import { runE5, E5_FAMILIES, E5_PARAMS } from '../../cognitive/testbed/task_e5.mjs';
import { runTaskV1 } from '../../cognitive/testbed/tasks_v1.mjs';
import { runE2P } from '../../cognitive/testbed/task_e2p.mjs';
import { makeAgentForV6 } from '../../cognitive/testbed/registry_v6.mjs';
import { pairedBootstrap } from '../../cognitive/testbed/stats.mjs';
import { VOL_DEFAULTS } from '../../cognitive/mind/v6/agent.mjs';
import { runAllTests } from '../../cognitive/tests/run_all.mjs';
import { runTestFiles } from '../../cognitive/tests/run_list.mjs';

export const GATE6_WORLDS = 60;      // fixed before the gate6 run; see GATE_SPEC.md
export const MARGIN = 25;            // steps over a run of task E5 (about 2% of the planner's total in RARE)
export const BATTERY_MARGIN = 10;    // steps (the earlier gates' margin, on the earlier tasks)
const FAMILIES = Object.keys(E5_FAMILIES);
// name -> [registry kind, params, label].  VOL_RHO_TRUE is told the family's true rate: a privileged reference.
const ARMS = Object.freeze({
  ORACLE: ['ORACLE', {}, 'privileged reference'],
  MBVI3: ['MBVI3', {}, 'fixed: never re-test'],
  RECALL_003: ['MBVI4_RECALL', { hazard: 0.003 }, 'fixed'],
  RECALL_01: ['MBVI4_RECALL', { hazard: 0.01 }, 'fixed'],
  RECALL_03: ['MBVI4_RECALL', { hazard: 0.03 }, 'fixed'],
  VOL: ['VOL', {}, 'learns the rate (primary)'],
  VOL_RHO_TRUE: ['VOL_RHO', null, 'privileged reference: told the family rate'],
});
const FIXED = ['MBVI3', 'RECALL_003', 'RECALL_01', 'RECALL_03'];
const BATTERY = [['E1', 'EXPLORED'], ['E3', 'STD'], ['E1S', 'EXPLORED'], ['E2P', 'PRE']];
const TEST_FILES = ['test_e2p.mjs', 'test_core.mjs', 'test_invariance.mjs', 'test_v1.mjs', 'test_mind.mjs', 'test_mind_v3.mjs', 'test_arb.mjs', 'test_recovery.mjs', 'test_vol.mjs'];

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const arg = (n, d = null) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; };
const die = (m) => { console.error(`cf06 run_gate refused: ${m}`); process.exit(2); };
const git = (...a) => execFileSync('git', ['-C', ROOT, ...a]).toString().trim();
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const sd = (xs) => { if (xs.length < 2) return null; const m = mean(xs); return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1)); };
const median = (xs) => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b), n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };

const DOMAIN = arg('--domain');
if (!['dev', 'gate6'].includes(DOMAIN)) die('--domain must be dev or gate6');
const isGate = DOMAIN === 'gate6';
const N = isGate ? GATE6_WORLDS : Number(arg('--worlds', '20'));
const SPEC = path.join(HERE, 'GATE_SPEC.md');
const OUT = isGate ? path.join(HERE, 'results', 'gate6_result.json') : path.resolve(arg('--out') ?? '');
const headAtLaunch = git('rev-parse', 'HEAD');
if (!isGate) {
  const rel = path.relative(ROOT, OUT);
  if (!arg('--out') || (!rel.startsWith('..') && !path.isAbsolute(rel))) die('dev runs need --out outside the repository');
} else {
  if (!fs.existsSync(SPEC)) die('GATE_SPEC.md is missing');
  if (!/^\*\*Status\.\*\* Frozen/m.test(fs.readFileSync(SPEC, 'utf8'))) die('GATE_SPEC.md is not marked Frozen (it is still a draft for review)');
  const SHAFILE = path.join(HERE, 'GATE_SPEC.sha256');
  if (!fs.existsSync(SHAFILE)) die('GATE_SPEC.sha256 (the frozen hash of the specification) is missing');
  const frozen = fs.readFileSync(SHAFILE, 'utf8').trim().split(/\s+/)[0];
  if (sha(fs.readFileSync(SPEC)) !== frozen) die(`GATE_SPEC.md does not match its frozen SHA-256 ${frozen}`);
  const dirty = git('status', '--porcelain', '--untracked-files=all', '--', 'cognitive', 'experiments/cf06');
  if (dirty) die(`files are not all committed and clean:\n${dirty}`);
  if (fs.existsSync(OUT)) die('the gate6 domain has already been run');
}

const agentFor = (name, family) => (kind, env, label) => {
  const [k, p] = ARMS[name];
  return makeAgentForV6(k, env, label, p === null ? { rhoFixed: E5_FAMILIES[family] } : { ...p });
};

function matrix(domain, timing) {
  const e5 = [], battery = [];
  for (let i = 0; i < N; i++) {
    const worldLabel = `cf|${domain}|world|${i}`, world = generateWorld(worldLabel);
    for (const family of FAMILIES) for (const name of Object.keys(ARMS)) {
      const t = performance.now();
      const r = runE5({ world, worldLabel, family, kind: ARMS[name][0], makeAgent: agentFor(name, family) });
      timing[name] = (timing[name] ?? 0) + performance.now() - t;
      e5.push({ name, ...r });
    }
    for (const name of ['MBVI3', 'VOL']) for (const [task, arm] of BATTERY) {
      const mk = agentFor(name, 'HALF');
      const r = task === 'E2P' ? runE2P({ world, worldLabel, kind: ARMS[name][0], arm, makeAgent: mk }) : runTaskV1({ task, world, worldLabel, kind: ARMS[name][0], arm, makeAgent: mk });
      battery.push({ name, cell: `${task}.${arm}`, world: r.world, metric: r.metric, censored: r.censored, excluded: r.excluded ?? false });
    }
  }
  return { e5, battery };
}

function analyse({ e5, battery }, domain) {
  const S = (x) => `cf|stats|${domain}|cf06|${x}`;
  const cell = (family, name) => new Map(e5.filter((r) => r.family === family && r.name === name && !r.excluded).map((r) => [r.world, r]));
  const contrast = (d, label, tag) => ({ contrast: label, sd: sd(d), median: median(d), positive: d.filter((x) => x > 0).length, negative: d.filter((x) => x < 0).length, zero: d.filter((x) => x === 0).length, mde80: d.length > 1 ? 2.8 * sd(d) / Math.sqrt(d.length) : null, ...pairedBootstrap(d, S(tag)) });
  const worldsAll = [...cell('RARE', 'VOL').keys()].filter((w) => FAMILIES.every((f) => Object.keys(ARMS).every((n) => cell(f, n).has(w)))).sort();
  const mixOf = (name) => worldsAll.map((w) => FAMILIES.reduce((s, f) => s + cell(f, name).get(w).metric, 0));
  const pairFam = (family, a, b, f = (r) => r.metric) => { const A = cell(family, a), B = cell(family, b); return worldsAll.map((w) => f(A.get(w)) - f(B.get(w))); };
  const out = { criteria: {}, families: {}, mix: {}, battery: {}, learning: {}, excludedWorlds: [...new Set(e5.filter((r) => r.excluded).map((r) => r.world))], worldsAnalysed: worldsAll.length };
  const V = mixOf('VOL');
  for (const x of FIXED) { const X = mixOf(x); out.criteria[`V1_${x}_minus_VOL_mix`] = contrast(X.map((v, i) => v - V[i]), `${x} - VOL, sum over RARE + HALF + OFTEN`, `V1|${x}`); }
  out.criteria.V2_RARE_VOL_minus_MBVI3 = contrast(pairFam('RARE', 'VOL', 'MBVI3'), 'VOL - MBVI3 (RARE)', 'V2');
  out.criteria.V3_OFTEN_MBVI3_minus_VOL = contrast(pairFam('OFTEN', 'MBVI3', 'VOL'), 'MBVI3 - VOL (OFTEN)', 'V3');
  { const R = cell('RARE', 'VOL'), O = cell('OFTEN', 'VOL'); out.criteria.V4_rho_OFTEN_minus_RARE = contrast(worldsAll.map((w) => O.get(w).secondary.volatility.rho - R.get(w).secondary.volatility.rho), 'final rho of VOL, OFTEN - RARE', 'V4'); }
  for (const [task, arm] of BATTERY) {
    const key = `${task}.${arm}`, pick = (n) => new Map(battery.filter((r) => r.name === n && r.cell === key && !r.excluded).map((r) => [r.world, r])), A = pick('VOL'), B = pick('MBVI3');
    const d = [...A.keys()].filter((w) => B.has(w)).sort().map((w) => A.get(w).metric - B.get(w).metric);
    out.battery[key] = { ...contrast(d, `VOL - MBVI3 (${key})`, `bat|${key}`), meanVOL: mean([...A.values()].map((r) => r.metric)), meanMBVI3: mean([...B.values()].map((r) => r.metric)) };
  }
  for (const name of Object.keys(ARMS)) { const m = mixOf(name); out.mix[name] = { mean: mean(m), median: median(m) }; }
  out.mix.VOL_minus_VOL_RHO_TRUE = contrast(V.map((v, i) => v - mixOf('VOL_RHO_TRUE')[i]), 'VOL - VOL_RHO_TRUE, mix (the cost of learning the rate)', 'mix|ref');
  for (const family of FAMILIES) {
    const F = { p: E5_FAMILIES[family], arms: {}, contrastsVsVOL: {} };
    for (const name of Object.keys(ARMS)) {
      const xs = [...cell(family, name).values()];
      F.arms[name] = {
        total: mean(xs.map((r) => r.metric)), medianTotal: median(xs.map((r) => r.metric)), blocked: mean(xs.map((r) => r.windows.blocked)), afterReversed: mean(xs.map((r) => r.windows.afterReversed)), afterPermanent: mean(xs.map((r) => r.windows.afterPermanent)),
        cappedEpisodes: xs.reduce((s, r) => s + r.censored, 0), reversedEvents: mean(xs.map((r) => r.reversedEvents)), permanentEvents: mean(xs.map((r) => r.permanentEvents)), skippedEvents: mean(xs.map((r) => r.skippedEvents)),
        workPerDecision: xs[0]?.secondary.compute ? mean(xs.map((r) => r.secondary.compute.backupsPerDecision)) : null,
        rhoEnd: xs[0]?.secondary.volatility ? mean(xs.map((r) => r.secondary.volatility.rho)) : null, changesArchived: xs[0]?.secondary.volatility ? mean(xs.map((r) => r.secondary.volatility.opened)) : null, reversalsConfirmed: xs[0]?.secondary.volatility ? mean(xs.map((r) => r.secondary.volatility.confirmed)) : null,
      };
    }
    for (const name of Object.keys(ARMS).filter((n) => n !== 'VOL')) F.contrastsVsVOL[name] = contrast(pairFam(family, name, 'VOL'), `${name} - VOL (${family})`, `fam|${family}|${name}`);
    out.families[family] = F;
  }
  out.learning.rhoTraces = Object.fromEntries(FAMILIES.map((f) => [f, [...cell(f, 'VOL').values()].slice(0, 10).map((r) => r.secondary.volatility.rhoTrace)]));
  return out;
}

const t1 = await runAllTests(), t2 = await runTestFiles(TEST_FILES);
const tests = { passed: t1.passed + t2.passed, total: t1.total + t2.total, failed: [...t1.failed, ...t2.failed].map((f) => `${f.file} :: ${f.name}`) };
const timingA = {}, timingB = {};
const runA = matrix(DOMAIN, timingA), runB = matrix(DOMAIN, timingB);
const hashA = sha(JSON.stringify(runA)), hashB = sha(JSON.stringify(runB));
const analysis = analyse(runA, DOMAIN);
const C = analysis.criteria;
const criteria = {
  V1_beats_every_fixed_policy_on_the_mix: FIXED.every((x) => C[`V1_${x}_minus_VOL_mix`].mean > 0 && C[`V1_${x}_minus_VOL_mix`].lo > 0),
  V2_safe_where_retesting_hurts: C.V2_RARE_VOL_minus_MBVI3.hi < MARGIN,
  V3_helps_where_changes_reverse: C.V3_OFTEN_MBVI3_minus_VOL.mean > 0 && C.V3_OFTEN_MBVI3_minus_VOL.lo > 0,
  V4_rate_is_learned: C.V4_rho_OFTEN_minus_RARE.mean > 0 && C.V4_rho_OFTEN_minus_RARE.lo > 0,
  V5_no_regression: Object.values(analysis.battery).every((c) => c.n > 0 && c.hi < BATTERY_MARGIN),
};
const infra = { determinism: hashA === hashB, tests: tests.failed.length === 0 && tests.total > 0 };
const infraOk = Object.values(infra).every(Boolean);
const exceptions = Object.entries(criteria).filter(([k, v]) => k !== 'V1_beats_every_fixed_policy_on_the_mix' && !v).map(([k]) => k);
const verdict = !infraOk ? 'CF-06 INVALID' : !criteria.V1_beats_every_fixed_policy_on_the_mix ? 'CF-06 NOT SUPPORTED (V1)' : exceptions.length ? `CF-06 SUPPORTED WITH EXCEPTIONS (${exceptions.join(', ')})` : 'CF-06 SUPPORTED';
const cappedVOL = analysis.families.RARE.arms.VOL.cappedEpisodes + analysis.families.HALF.arms.VOL.cappedEpisodes + analysis.families.OFTEN.arms.VOL.cappedEpisodes;
const result = {
  evidence: 'CF-06 learning how often changes reverse (development, not confirmatory)', domain: DOMAIN, worlds: N,
  environment: { node: process.version, platform: `${process.platform}-${process.arch}`, headAtLaunch, headAtEnd: git('rev-parse', 'HEAD'), filesClean: isGate },
  resources: { note: 'Not part of the hashed rows', wallClockMsRunA: timingA, wallClockMsRunB: timingB, maxRssKB: process.resourceUsage().maxRSS },
  specSha256: fs.existsSync(SPEC) ? sha(fs.readFileSync(SPEC)) : null,
  parameters: { task: E5_PARAMS, families: E5_FAMILIES, arms: ARMS, VOL: VOL_DEFAULTS, margin: MARGIN, batteryMargin: BATTERY_MARGIN, bootstrapResamples: 10000, world: { nodes: 24, edges: 30, maxDegree: 4 } },
  tests, infra, criteria, cappedEpisodesVOL: cappedVOL, verdict, analysis, rowsSha256: hashA, rows: runA,
};
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, `${JSON.stringify(result, null, 1)}\n`);
console.log(JSON.stringify({ verdict, infra, tests: `${tests.passed}/${tests.total}`, criteria, headAtLaunch, cappedEpisodesVOL: cappedVOL }, null, 1));
process.exit(infraOk ? 0 : 1);
```

## Appendix F. CF-05b results record with its amendment (the previous gate)

File: `experiments/cf05b/results/RESULTS.md` · SHA-256 `45a851aa99535295c0d18e59f64cac253c4455eed9ee50099b30b11361ee131d` · 218 lines

````markdown
# CF-05b Gate Results — targeted recall of exits that stopped working

**Verdict: CF-05b SUPPORTED AT A COST (R4).** RECALL recovers a reopened route: 18.8 fewer steps after the block is
removed [12.6, 25.1], closing two-thirds of the gap to the privileged reference. It costs 7.7 steps when the change is
permanent [2.3, 12.1]; the upper bound breaks the 10-step margin, so R4 fails. Every other criterion holds.

This was the verdict predicted in the specification before the run. The gate was run once. Nothing was re-run or
tuned after the outcome. **RECALL is not adopted into the agent** (the specification's consequence for this verdict;
also the owner's Decision 7).

| Item | Value |
|---|---|
| Evidence category | Development evaluation gate; out-of-sample validation of a setting selected on independent tuning worlds. Not confirmatory; local commits; no independent reproduction |
| Command | `node experiments/cf05b/run_gate.mjs --domain gate5b` (exit 0) |
| Code and spec | Freeze commit `104dd9b`; `GATE_SPEC.md` SHA-256 `154dd7f7…4c00` (matches `GATE_SPEC.sha256`) |
| Recorded head | `20630c6`. The driver reads HEAD when it finishes; `20630c6` was committed during the run and changes only `docs/engineering/PROJECT_STATE.md` (`git diff --stat 104dd9b 20630c6`). The code under test is the freeze commit's |
| Environment | Node v24.15.0, win32-x64; peak memory 268 MB |
| Result file | `gate5b_result.json`, SHA-256 `689f84e0…f057`; row hash `093d2e91…ec45` |
| Worlds | `cf|gate5b|world|0…39` (24 nodes, 30 edges) and `cf|gate5b|large|0…19` (48 nodes, 60 edges); 0 excluded |
| Reproducibility | Two in-process runs identical; 155/155 tests; 0 capped episodes in the criterion agents |
| Pre-run checks | The driver refused a modified specification, an unfrozen status line, an altered hash file, modified source, and the closed CF-05 gate (verified before launch) |

## Criteria

Differences in steps, 40 worlds, mean [95% interval], median, and how many worlds RECALL needed fewer / more / equal
steps than the comparator.

| Criterion | Statistic | Result | RECALL fewer / more / equal | Held |
|---|---|---|---|---|
| R1 benefit | phase D, CHANGE: MBVI3 − RECALL | **+18.8 [12.6, 25.1]**, median 10.5 | 32 / 3 / 5 | **yes** |
| R2 cost while blocked | phase C, CHANGE: RECALL − MBVI3 | +4.7 [2.9, 6.7], median 3.0 | 2 / 29 / 9 | yes |
| R3 cost when unchanged | SHAM: RECALL − MBVI3 | −6.3 [−15.6, −0.0], median 0.0 | 4 / 0 / 36 | yes |
| **R4 cost when permanent** | PERMANENT: RECALL − MBVI3 | **+7.7 [2.3, 12.1]**, median 6.0 | 2 / 36 / 2 | **no** |
| R5 no regression | RECALL − MBVI3: E1 / E3 / E1S / E2P | 0.0 / 0.0 / −0.2 [−0.8, 0.1] / 0.0 | — | yes |
| R6 beats Dyna-Q+ | CHANGE: Dyna-Q+ − RECALL, at 20 and at 1,300 updates per step | +91.9 [77.3, 108.1]; +161.4 [131.7, 194.3] | 40 / 0 / 0 in both | yes |
| R7 infrastructure | Determinism; tests | identical; 155/155 | — | yes |

## Where it helps and where it costs

Mean steps per arm (phases C = 15 blocked episodes, D = 15 episodes after the block is removed or kept):

| Agent | CHANGE C | CHANGE D | CHANGE C+D (median) | SHAM C+D | PERMANENT C+D (median) | Reopened exit crossed in D (of 15) |
|---|---|---|---|---|---|---|
| ORACLE | 108.5 | 79.8 | 188.4 (186) | 157.5 | 220.3 (219) | 15.0 |
| MBVI3 (the planner) | 115.8 | 108.2 | 223.9 (219) | 161.8 | 226.4 (219) | 0.2 |
| **RECALL** | 120.4 | **89.4** | **209.8** (214) | **155.6** | **234.1** (225) | **7.5** |
| RECALL hazard 0.003 | 116.8 | 98.4 | 215.2 (215) | 158.8 | 227.7 (220) | 3.6 |
| RECALL hazard 0.03 | 129.6 | 89.5 | 219.1 (212) | 154.9 | 252.7 (235) | 8.2 |
| Dyna-Q+ (20 updates) | 199.8 | 102.0 | 301.7 (287) | 196.2 | 373.6 (334) | 10.8 |
| Dyna-Q+ (1,300 updates) | 258.1 | 113.1 | 371.2 (332) | 188.7 | 430.4 (401) | 7.3 |

- **Gap to the reference after removal:** the planner 28.3 steps [22.3, 34.4]; RECALL 9.5 [5.2, 13.9]. RECALL closes
  two-thirds of it.
- **Equal mix of the three arms:** RECALL − MBVI3 = −12.7 steps [−23.4, −3.4] (RECALL better in 23 worlds, worse in 12).
- **Sensitivity:** a weaker setting (0.003) costs almost nothing when the change is permanent (+1.3 [−1.9, 3.4]) and
  recovers half as much (−9.8 [−14.4, −5.5]). A stronger one (0.03) recovers the same as 0.01 and costs +26.3 when
  permanent [15.9, 37.0]. The chosen setting sits at the knee.
- **Dyna-Q+** re-tests more than the planner but pays for it everywhere, and more with more planning; it does not
  recover the route in fewer steps than the planner (−6.2 [−13.3, 0.3] at 20 updates; +4.9 [−0.7, 10.4] at 1,300).
- **Truncation:** no episode hit the 200-step cap in any arm of the primary experiment.

## What RECALL actually does (the two privileged diagnostic arms)

Effect against MBVI3 (positive = fewer steps than the planner):

| Window | RECALL | REALONLY (remembers only real changes) | FALSEONLY (remembers only false alarms) | Residual | Share from real changes |
|---|---|---|---|---|---|
| **CHANGE, phase D** | +18.8 [12.8, 25.4] | **+16.8 [10.7, 23.4]** | +0.9 [0.025, 2.3] | +1.1 [0.0, 3.1] | **0.95** |
| CHANGE, phase C | −4.7 [−6.8, −2.9] | −3.8 [−5.2, −2.5] | −1.0 [−2.9, 0.3] | +0.1 [−0.1, 0.4] | 0.79 |
| CHANGE, C + D | +14.1 [8.7, 20.3] | +13.0 [7.2, 19.4] | −0.1 [−1.6, 1.2] | +1.2 [0.0, 3.4] | — |
| SHAM | +6.3 [0.0, 15.6] | −0.1 [−0.3, 0.0] | **+6.3 [0.0, 15.7]** | +0.1 [0.0, 0.3] | — |
| PERMANENT | −7.7 [−12.0, −2.4] | **−8.6 [−11.6, −5.9]** | +0.8 [−2.3, 5.3] | +0.1 [−0.7, 1.1] | — |

**Mechanism label by the rule fixed in the specification: "combination of both"**, because the false-alarm arm's
lower bound on phase D is 0.025, just above zero. In substance:

- **Recovery from real reversed changes is the mechanism.** It carries 95% of the phase-D benefit and all of the
  permanent-change cost.
- **False-alarm repair is a small, separate effect.** It contributes 0.9 steps on phase D, from 4 of 40 worlds
  (in one of them, world 3, it is the whole of RECALL's benefit). It is the whole of RECALL's apparent advantage in
  the SHAM arm (+6.3, from 4 worlds), where the planner's change detector declared a change that did not happen.
- The residuals are near zero: the two effects add up.

**What this rules out:** that RECALL's benefit is mainly a patch for the change detector (the outside review's
leading concern). **What it does not settle:** whether to call the mechanism "episodic recall" or "a latent
environmental state". As recorded before the run, the two are the same computation here (the prediction step of a
two-regime hidden state per exit); see the architecture decision record.

## Expected net utility (reported; not a criterion)

U(p) = p × B − (1 − p) × C, steps saved per change, where p is the probability that a change reverses. p is not
estimated: nothing in the testbed measures it. B = 14.1 steps (whole post-change period of a reversed change);
C = 7.7 steps (permanent change). Joint bootstrap over the 40 worlds, 10,000 resamples.

| p | 0 | 0.1 | 0.2 | 0.3 | 0.4 | 0.5 | 0.6 | 0.7 | 0.8 | 0.9 | 1 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| U(p) | −7.7 | −5.5 | −3.4 | −1.2 | +1.0 | +3.2 | +5.4 | +7.6 | +9.8 | +11.9 | +14.1 |
| 95% interval | [−12.1, −2.4] | [−9.4, −0.7] | [−6.9, 0.9] | [−4.5, 2.7] | [−2.2, 4.7] | [−0.2, 6.8] | [1.8, 9.3] | [3.6, 11.8] | [5.4, 14.6] | [7.1, 17.3] | [8.7, 20.2] |
| Share of resamples with U > 0 | 0.00 | 0.01 | 0.05 | 0.26 | 0.71 | 0.97 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 |

**Break-even: p\* = 0.35** (bootstrap median 0.36, 95% interval [0.16, 0.51]; in 99.6% of resamples U crosses zero
once from below, in 0.4% RECALL helps at every p). RECALL is worth having where more than about a third of changes
reverse, is not where fewer than about a sixth do, and the evidence cannot decide in between.

The second form (using R1's phase-D benefit, B = 18.8, which ignores the cost paid while the block is in place) gives
p\* = 0.29 [0.13, 0.40]. It overstates the benefit; the whole-period form above is the one to read.

**Evidence and policy are separate.** The curve is evidence. Choosing p, and so whether to adopt RECALL, is a policy
decision; it is not taken here.

## Scaling experiment: 48 nodes (separate; non-gating; cannot change the verdict)

20 worlds of 48 nodes and 60 edges, 1,200 exploration steps, the setting chosen at 24 nodes applied unchanged.

| Measure | 24 nodes (40 worlds) | 48 nodes (20 worlds) |
|---|---|---|
| Benefit, phase D: MBVI3 − RECALL | +18.8 [12.6, 25.1] | **+36.2 [22.1, 52.9]** (RECALL fewer in 17 of 20) |
| Benefit, whole period (B) | +14.1 [8.7, 20.3] | +28.8 [14.3, 45.9] |
| Cost while blocked | +4.7 [2.9, 6.7] | +7.5 [5.0, 10.3] |
| Cost when unchanged | −6.3 [−15.6, −0.0] | +0.1 [0.0, 0.3] |
| Cost when permanent (C) | +7.7 [2.3, 12.1] | **+14.8 [10.3, 19.9]** |
| Planner's gap to the reference after removal | +28.3 | +43.5 [29.9, 59.6] |
| RECALL's remaining gap | +9.5 | +7.3 [4.5, 10.1] |
| Break-even p\* | 0.35 [0.16, 0.51] | 0.34 [0.21, 0.54] |
| Capped episodes | 0 | 0 |

| Resource and convergence (RECALL, CHANGE arm) | 24 nodes | 48 nodes |
|---|---|---|
| Model states | 24 | 48 |
| State–action pairs tried | 60 | 120 |
| Exits remembered per run; still held at the end | 1.40; 0.15 | 1.50; — |
| Value-iteration backups per decision (MBVI3 → RECALL) | 1,334 → 1,391 (+4%) | 2,823 → 2,926 (+4%) |
| Sweeps per decision; decisions hitting the 100-sweep budget | 23.6; 0.05% | 24.9; 0.07% |
| Wall-clock, 3 task arms, run A (MBVI3 → RECALL) | 139 s → 214 s for 40 worlds | 240 s → 372 s for 20 worlds |

**Reading.** Generalisation of the sign: the setting tuned at 24 nodes recovers the route at 48 nodes with the same
break-even, and both benefit and cost roughly double, as the routes do. Computation: work per decision doubles with
world size and RECALL adds 4% to it; wall-clock rises 54–55%, more than the backup count suggests, because the
mixture belief is recomputed in the planner's inner loop (an implementation cost, not an algorithmic one). Planning
convergence is unaffected: about 24 sweeps per decision at both sizes, and the budget is almost never reached.

## What this shows, and what it does not

**Shown, on 40 fresh 24-node worlds, out of sample:**
- Remembering what an exit did before it was declared worse, and letting that belief return with time, recovers a
  reopened route: two-thirds of the gap to the reference closed, at a 4% computational cost.
- The benefit comes from real reversed changes, not from repairing the change detector.
- It costs about 8 steps when the change is permanent, so whether it is worth having depends on how often changes
  reverse; break-even about a third.
- It beats the textbook re-testing baseline (Dyna-Q+) by a wide margin at both planning budgets.

**Not shown:**
- That RECALL should be in the agent. The cost when changes are permanent is real, and the right p is unknown.
- Anything about changes that reverse after a different delay, several times, or on several edges at once.
- A distinction between "episodic recall" and "latent state": the same computation here.
- Anything confirmatory: one development gate, by the designer, no independent reproduction.

## Amendment after adversarial review (2026-11-15)

The text above is left as first written. An adversarial review ([ADVERSARIAL_REVIEW.md](ADVERSARIAL_REVIEW.md))
found every number correct and the verdict correctly derived, and found the following statements stronger than the
evidence. Each was checked against the recorded rows. These corrections govern how the record may be cited.

1. **Utility, corrected reading.** The pointwise 95% interval for U(p) excludes zero only for p ≥ 0.55
   (U(0.50) = 3.2 [−0.2, 6.8]; U(0.55) [0.8, 8.0]) and is entirely negative only for p ≤ 0.10 (U(0.15) [−8.2, 0.1]).
   Correct reading: **RECALL helps, at 95%, where more than about half of changes reverse; it costs where fewer than
   about a tenth do; between, the evidence does not decide. Point break-even 0.35.** The sentence "is worth having
   where more than about a third of changes reverse, is not where fewer than about a sixth do" is withdrawn.
2. **The effects do not add up.** "The residuals are near zero: the two effects add up" is withdrawn. The phase-D
   residual (+1.1; 44 world-steps, of which 39 come from world 14) exceeds the false-alarm effect (+0.9). In world 14
   RECALL saves 46 steps, REALONLY 0 and FALSEONLY 7: RECALL already behaves differently from the planner during
   training there (and in worlds 33 and 39), so its later memory of the real change acts on a different path. The
   real and false-alarm parts interact; "a small, separate effect" is withdrawn.
3. **Share from real changes: about 89%, not 95%.** REALONLY's effect is 89% of RECALL's own (16.8 of 18.8); the 95%
   in the decomposition table is REALONLY / (REALONLY + FALSEONLY). "The benefit comes from real reversed changes, not
   from repairing the change detector" is replaced by: **mostly recovery from real reversals (about 89%), with an
   interaction the diagnostic arms cannot split cleanly; the rule-fixed label "combination of both" stands.**
4. **The false-alarm lower bound of 0.025 reflects sparse data.** FALSEONLY differs from the planner on phase D in
   only 4 of 40 worlds (3, 5, 14, 33), all positive; a bootstrap resample omits all four with probability
   0.9^40 = 1.5%, below 2.5%, so the lower bound is positive whatever their size. The same holds for RECALL's SHAM
   interval. The rule was applied as frozen.
5. **Computational cost.** "At a 4% computational cost" is replaced by: **4% more value-iteration backups and 54%
   more wall-clock** (139 s → 214 s). The explanation given (recomputing the mixture belief) was not tested. The
   timings do not depend on how much is remembered (FALSEONLY 213.5 s with 0.4 memories per run, RECALL 214.4 s with
   1.4, REALONLY 215.6 s with 0.9), which points to a per-backup overhead of the prototype's planning hook rather
   than to the mechanism. Run B's absolute times are about half of run A's; the ratio is stable at about 1.55.
6. **48 nodes.** "Both benefit and cost roughly double, as the routes do" is withdrawn: the reference's phase D grows
   only 5% (79.9 → 84.2 steps) and its SHAM total 7%. What roughly doubles is the planner's gap to the reference
   (28.3 → 43.5). "Same break-even" means similar point estimates (0.35 and 0.34) with wide intervals. The
   "still held at the end" entry for 48 nodes is 0.2 (CHANGE) and 1.05 (PERMANENT), not "—".
7. **Dyna-Q+.** "Does not recover the route in fewer steps than the planner" is replaced by "not reliably fewer"
   (−6.2 [−13.3, 0.3] at 20 updates).
8. **Two intervals for the same contrast.** R1 appears as [12.6, 25.1] (criteria) and [12.8, 25.4] (decomposition);
   R4 as [2.3, 12.1] and [2.4, 12.0]. They come from separate seeded bootstrap streams. The criteria table is the one
   the verdict used; R4 fails under either.
9. **Not every world in R1 is recovery from a reversal.** In world 3 a false alarm before the block takes every agent
   off the route, so CHANGE and SHAM rows coincide there, and RECALL's 21 steps are false-alarm repair. RECALL already
   differs from the planner before the change in 3 of 40 worlds (14, 33, 39).
10. **Units.** "Reopened exit crossed in D (of 15)" counts crossings of the exit, not episodes.
11. **Provenance.** The result file records HEAD at the end of the run only. That the run launched at `104dd9b` is
    inferred from the specification hash, the clean-tree check and the diff to `20630c6`; it was not recorded at
    launch. The pre-run refusal checks were observed in the session and are not lodged as a log.
12. **Omitted from the record, now added from the JSON.** Tries of the manipulated edge in phase D (CHANGE): ORACLE
    20.5, MBVI3 0.3, RECALL 9.5, REALONLY 8.7, FALSEONLY 0.6, Dyna-Q+ 15.0 and 9.3. Changes declared worse per run
    (CHANGE): MBVI3 1.32, RECALL 1.40. Medians were not computed for the decomposition and utility tables, and
    per-world counts were not computed for R5.
13. **Selection context.** At hazard 0.003 RECALL passes R4 (+1.3, upper bound 3.4) with a phase-D benefit of 9.8
    [5.5, 14.4]. R4's failure belongs to the selected setting, not to targeted recall as such. On `gate5b` the
    selection rule would still have chosen 0.01 (sum of the three arms 599.5, against 601.7 and 626.6).

## Next question (recorded; not started)

RECALL fixes its willingness to re-test (hazard 0.01) in advance, so it pays the permanent-change cost whatever the
world is like. The utility curve says the right willingness depends on how often changes reverse. **An agent that
learns that rate from its own experience** would need no policy choice of p: it would re-test in worlds where changes
reverse and stop in worlds where they do not. Testing that needs a task with several changes per run and a
world-family reversal rate. See the architecture decision record and roadmap.
````

## Appendix G. RECALL agent (the fixed-rate baselines)

File: `cognitive/mind/v4/agent.mjs` · SHA-256 `962f3841186bf2cdf1e07b8c79680ebb2cec99e12e3c6e2c51b848477eecc50d` · 109 lines

```js
// ==========================================================
// CF-05 candidate — MBVI4: the MBVI3 planner with a way to re-test what it has stopped trying
// ==========================================================
// The measured gap (CF-04): after a block is removed the planner stays on the detour, because it re-tests an exit
// it believes dead in 0.9 of 15 episodes.  Nothing in MBVI3 ever makes an abandoned exit attractive again.
// MBVI4 is MBVI3 (world model v3, value iteration, optimism for the unknown, greedy choice) plus ONE of two
// candidate mechanisms, selected by params.mode.  It is a candidate under test, used by nothing else.
//
// Both use tau(s, a) = real steps since the pair (s, a) was last tried.  Pairs never tried are left to the model's
// existing optimism and are not affected.
//
//   BONUS  an additive bonus in the planned value, the Dyna-Q+ idea moved into value iteration:
//              Q(s, a) += kappa * sqrt(tau)
//
//   DECAY  no bonus; the planner's BELIEF about a pair fades toward what it believes about an untried pair.  If
//          anything in the world can change at rate `hazard` per step, then after tau steps without looking the
//          pair has changed with probability  w = 1 - (1 - hazard)^tau, and the planning distribution is
//              (1 - w) * model's prediction for the pair  +  w * model's prediction for an untried pair
//          A dead exit therefore regains some probability of moving, to an unknown place valued optimistically,
//          and is re-tested when that beats the route in use.  The model's own counts are not modified.
//
//   RECALL targeted, not blanket.  When the model declares that an exit GOT WORSE, the agent keeps the belief it
//          held about that exit just before (where it led, how reliably).  Only for such exits, the planning
//          belief drifts back toward the remembered one:  (1 - w) * current + w * remembered, with the same
//          w = 1 - (1 - hazard)^tau.  Exits that never worked, and exits still in use, are untouched, so the
//          agent re-tests what is worth re-testing instead of everything.  The memory is dropped when the exit
//          moves again.
//
//   NONE   neither (must reproduce MBVI3; asserted by tests).
//
// inspect().recovery reports the mode and the mean tau of the pairs the agent chose (how stale its choices were).
// ==========================================================
import { argmaxRandomTie } from '../../testbed/agent_util.mjs';
import { makeWorldModel3, WM3_DEFAULTS } from '../v3/world_model.mjs';
import { qValues4, valueIteration4 } from './planner.mjs';

export const MBVI4_DEFAULTS = Object.freeze({ gamma: 0.95, budget: 100, theta: 1e-6, vOpt: 1, mode: 'NONE', kappa: 0.003, hazard: 0.001, ...WM3_DEFAULTS });
const UNTRIED = '__untried__';   // a key no observation can produce: the model's prediction for a pair never tried

export function makeMBVI4({ rng, params = {}, kind = 'MBVI4' }) {
  const P = { ...MBVI4_DEFAULTS, ...params };
  if (!['NONE', 'BONUS', 'DECAY', 'RECALL'].includes(P.mode)) throw new Error(`unknown recovery mode ${P.mode}`);
  const model = makeWorldModel3(P);
  const V = new Map();
  const last = new Map();                    // `${s}|${a}` -> clock value when the pair was last tried
  const former = new Map();                  // RECALL: `${s}|${a}` -> the prediction held just before the exit was declared worse
  let cue, clock = 0;
  const compute = { decisions: 0, sweeps: 0, backups: 0, budgetHits: 0 };
  const recovery = { chosen: 0, tauSum: 0, remembered: 0 };
  // DIAGNOSTIC switch: params.recallIf(key) -> bool, supplied only by cognitive/testbed/arms_v5.mjs to privileged
  // diagnostic arms.  An ordinary agent has no recallIf and remembers every declared-worse exit.
  const mayRemember = (key) => !P.recallIf || P.recallIf(key) === true;
  const tauOf = (s, a) => { const t = last.get(`${s}|${a}`); return t === undefined ? null : clock - t; };
  const bonusOf = P.mode === 'BONUS' ? (s, a) => { const tau = tauOf(s, a); return tau === null ? 0 : P.kappa * Math.sqrt(tau); } : undefined;
  const predictOf = P.mode === 'DECAY' ? (s, a) => {
    const p = model.predict(s, a), tau = tauOf(s, a);
    if (tau === null || tau === 0) return p;
    const w = 1 - (1 - P.hazard) ** tau, q = model.predict(UNTRIED, 0);
    return { self: (1 - w) * p.self + w * q.self, outcomes: p.outcomes.map(([lab, x]) => [lab, (1 - w) * x]), unknown: (1 - w) * p.unknown + w * q.unknown, N: p.N };
  } : P.mode === 'RECALL' ? (s, a) => {
    const p = model.predict(s, a), f = former.get(`${s}|${a}`), tau = tauOf(s, a);
    if (!f || tau === null || tau === 0) return p;
    const w = 1 - (1 - P.hazard) ** tau, merged = new Map(p.outcomes.map(([lab, x]) => [lab, (1 - w) * x]));
    for (const [lab, x] of f.outcomes) merged.set(lab, (merged.get(lab) ?? 0) + w * x);
    return { self: (1 - w) * p.self + w * f.self, outcomes: [...merged], unknown: (1 - w) * p.unknown + w * f.unknown, N: p.N };
  } : undefined;
  const planOpts = () => ({
    gamma: P.gamma, vOpt: P.vOpt, predictOf, bonusOf,
    rewardOf: cue !== null ? (s2) => (s2 === cue ? 1 : 0) : (s2) => model.rewardProb(s2),
    doneOf: cue !== null ? (s2) => (s2 === cue ? 1 : 0) : (s2) => model.doneProb(s2),
  });
  return {
    kind,
    act(obs) {
      model.visit(obs.node, obs.nActions);
      if (obs.goal !== cue) { cue = obs.goal; V.clear(); }
      const opts = planOpts();
      const r = valueIteration4(model, V, { budget: P.budget, theta: P.theta, ...opts });
      compute.decisions++; compute.sweeps += r.sweeps; compute.backups += r.backups; if (!r.converged) compute.budgetHits++;
      const a = argmaxRandomTie(qValues4(model, V, obs.node, opts), rng);
      const tau = tauOf(obs.node, a);
      if (tau !== null) { recovery.chosen++; recovery.tauSum += tau; }
      return a;
    },
    observe(tr) {
      const { obs, action, reward, next, done } = tr;
      model.visit(next.node, next.nActions);
      const key = `${obs.node}|${action}`;
      const recall = P.mode === 'RECALL';
      const held = recall ? model.predict(obs.node, action) : null, worse = recall ? model.stats().changesDown : 0;
      model.update(obs.node, action, next.node, reward, done);
      if (recall) {
        if (next.node !== obs.node) former.delete(key);                         // it works again: nothing to recall
        else if (model.stats().changesDown > worse && held.outcomes.length && mayRemember(key)) { former.set(key, held); recovery.remembered++; }
      }
      clock++;
      last.set(key, clock);
    },
    inspect() {
      return {
        compute: { ...compute, backupsPerDecision: compute.decisions ? compute.backups / compute.decisions : 0, sweepsPerDecision: compute.decisions ? compute.sweeps / compute.decisions : 0, budgetHitShare: compute.decisions ? compute.budgetHits / compute.decisions : 0, budget: P.budget },
        recovery: { mode: P.mode, meanTauOfChosen: recovery.chosen ? recovery.tauSum / recovery.chosen : null, remembered: recovery.remembered, remembering: former.size, triedPairs: last.size },
        model: { states: model.states().size, ...model.stats(), ...model.hyper() },
      };
    },
    _model: model, _V: V,                     // test access only
  };
}
```

## Appendix H. World model v3 (the current-regime model, unchanged)

File: `cognitive/mind/v3/world_model.mjs` · SHA-256 `4363d24935d437b133a06eee5642f7aa5fae84681aa78c9d38d15e2853a6537b` · 193 lines

```js
// ==========================================================
// CF-03c mind — learned world model v3: v2 with two defects repaired
// ==========================================================
// v2 (cognitive/mind/world_model.mjs) is frozen as the CF-03b model and is not edited.  The independent review of
// CF-03b reported two defects in it; both are reproduced by cognitive/tests/test_mind_v3.mjs against v2 and fixed
// here.  Everything not listed below is the v2 definition: the pooled Beta population over move success, the
// impassable-exit mixture, the pooled destination-novelty rate, the reward model and its local change-point.
//
// Defect 1 — inconsistent leave-one-out weights.
//   v2 accumulated the pooled totals (M, T) with each pair's weight computed under the PREVIOUS hyper-parameters,
//   and subtracted a pair's own contribution with a weight computed under the NEW ones.  For a pair that has never
//   moved the two weights differ, so the leave-one-out mean could leave [0, 1]; a never-moved pair then received
//   P(stay) > 1 and a negative UNKNOWN mass.
//   v3: the empirical-Bayes step is iterated to a fixed point (at most emIterations passes), and each pair's weight
//   is STORED in the same pass that builds the totals.  The leave-one-out mean subtracts exactly the stored weight,
//   so it is a ratio of sums of non-negative terms and stays in [0, 1].
//
// Defect 2 — a single ordinary failure reset a reliable pair.
//   v2 cleared a pair's counts when N >= resetMinN and one observation had predictive probability < resetTau.  A
//   pair with about 35 successes predicts P(stay) < 0.05, so one legitimate failure of a 0.98 edge wiped it.
//   v3: change detection accumulates evidence.  Each pair keeps two CUSUM statistics, for "this exit got worse" and
//   "this exit got better", against the alternative that the outcome now happens with probability changeAlt:
//       g = max(0, g + log( alt(x) / p_model(x) ))        x = the observed outcome, p_model from BEFORE the update
//   A change is declared when its posterior odds exceed 1 under a prior change rate changeHazard per attempt:
//       g > log( (1 - changeHazard) / changeHazard )
//   One surprising outcome cannot reach the threshold unless the model was almost certain (as after many
//   deterministic successes, where a block is then detected on the first failure).  On a declared change the pair's
//   counts become the observations of the run that raised the statistic (the estimated post-change data), instead
//   of being cleared.  Statistics accumulate only once the pair has changeMinN observations.
//
// Ablation switches (all default on): poolMove (the pooled move-success prior), poolDest (the pooled novelty rate),
// piBlock = 0 (no impassable-exit component), resets (no change detection), globalRewardReset.
// ==========================================================
import { lgammaV3 as lgamma } from './numerics.mjs';

export const WM3_DEFAULTS = Object.freeze({
  poolMove: true, poolDest: true, hyperMean0: 0.5, hyperN0: 1, strength0: 2, strengthGrid: Object.freeze([1, 2, 4, 8, 16, 32, 64]),
  emIterations: 25, piBlock: 0.05, kappa: 0.25,
  resets: true, changeHazard: 0.002, changeAlt: 0.9, changeMinN: 5,
  beta0: 0.1, rewardResetMinN: 5, rewardResetTau: 0.05, globalRewardReset: false,
});

/** log marginal likelihood of m moves in n attempts (a given order) under Beta(a, b). */
export function logBetaBinomial(m, n, a, b) {
  return lgamma(m + a) + lgamma(n - m + b) - lgamma(n + a + b) - lgamma(a) - lgamma(b) + lgamma(a + b);
}

const emptyRun = () => ({ g: 0, N: 0, nMove: 0, out: new Map() });

export function makeWorldModel3(params = {}) {
  const P = { ...WM3_DEFAULTS, ...params };
  const width = new Map();              // state label -> number of actions (observed on arrival)
  const pairs = new Map();              // `${s}|${a}` -> { N, nMove, out, keep, down, up }
  const arrive = new Map();             // label -> { n, r1, d1 }
  const cache = new Map();              // `${s}|${a}` -> { version, value }
  const stats = { changesDown: 0, changesUp: 0, rewardResets: 0, globalRewardResets: 0, updates: 0, emPasses: 0 };
  const m0 = P.hyperMean0 * P.hyperN0;
  const threshold = Math.log((1 - P.changeHazard) / P.changeHazard);
  let hyper = { mu: P.hyperMean0, S: P.strength0, M: 0, T: 0, nu: P.kappa };
  let version = 0;

  /** Posterior weight of "impassable" for k failures and no move, under population (mu, S). */
  function blockWeight(nMove, k, mu, S) {
    if (P.piBlock <= 0 || nMove > 0) return 0;
    let pk = 1;
    for (let j = 0; j < k; j++) pk *= (S * (1 - mu) + j) / (S + j);
    return P.piBlock / (P.piBlock + (1 - P.piBlock) * pk);
  }

  /** Empirical Bayes to a fixed point.  Stored q.keep and the totals (M, T) always come from the same pass. */
  function refresh() {
    let E = 0, R = 0;
    for (const q of pairs.values()) if (q.nMove) { E += q.out.size - 1; R += q.nMove - 1; }
    const nu = P.poolDest ? (E + P.kappa) / (R + 1) : P.kappa;
    if (!P.poolMove) {
      for (const q of pairs.values()) q.keep = 1;
      hyper = { mu: P.hyperMean0, S: P.strength0, M: 0, T: 0, nu };
      return;
    }
    const active = [...pairs.values()].filter((q) => q.N > 0);
    let mu = hyper.mu, S = hyper.S, M = 0, T = 0;
    for (let it = 0; it < P.emIterations; it++) {
      stats.emPasses++;
      M = 0; T = 0;
      for (const q of active) { q.keep = 1 - blockWeight(q.nMove, q.N, mu, S); M += q.keep * q.nMove; T += q.keep * q.N; }
      const mu2 = (M + m0) / (T + P.hyperN0);
      let S2 = P.strength0;
      if (active.length) {
        let best = -Infinity;
        for (const g of P.strengthGrid) {
          let ll = 0;
          for (const q of active) ll += q.keep * logBetaBinomial(q.nMove, q.N, g * mu2, g * (1 - mu2));
          if (ll > best + 1e-12) { best = ll; S2 = g; }
        }
      }
      const done = Math.abs(mu2 - mu) < 1e-10 && S2 === S;
      mu = mu2; S = S2;
      if (done) break;
    }
    hyper = { mu, S, M, T, nu };
  }

  function compute(s, a) {
    const q = pairs.get(`${s}|${a}`);
    const N = q ? q.N : 0, nMove = q ? q.nMove : 0, S = hyper.S;
    let mu = hyper.mu;
    if (P.poolMove && q && q.N) mu = (hyper.M - q.keep * nMove + m0) / (hyper.T - q.keep * N + P.hyperN0);   // leave-one-out
    const w = blockWeight(nMove, N, mu, S);
    const pMove = (1 - w) * (nMove + S * mu) / (N + S);
    const u = nMove ? Math.min(hyper.nu, P.kappa / (nMove + P.kappa)) : 1;
    const outcomes = nMove ? [...q.out].map(([lab, c]) => [lab, pMove * (1 - u) * c / nMove]) : [];
    return { self: 1 - pMove, outcomes, unknown: pMove * u, N, blocked: w };
  }

  function predict(s, a) {
    const key = `${s}|${a}`;
    const hit = cache.get(key);
    if (hit && hit.version === version) return hit.value;
    const value = compute(s, a);
    cache.set(key, { version, value });
    return value;
  }

  /** Predictive probability of the category the outcome s2 falls into (SELF, a known outcome, or UNKNOWN). */
  function probOf(s, a, s2) {
    const p = predict(s, a);
    if (s2 === s) return p.self;
    const hit = p.outcomes.find(([lab]) => lab === s2);
    return hit ? hit[1] : p.unknown;
  }

  const rewardProb = (s2) => { const r = arrive.get(s2); return r ? (r.r1 + P.beta0) / (r.n + P.beta0) : 1; };
  const doneProb = (s2) => { const r = arrive.get(s2); return r ? (r.d1 + P.beta0) / (r.n + P.beta0) : 1; };

  /** Advance one CUSUM statistic with this observation; returns true when a change is declared. */
  function cusum(run, llr, moved, s2) {
    const g = run.g + llr;
    if (g <= 0) { run.g = 0; run.N = 0; run.nMove = 0; run.out.clear(); return false; }
    run.g = g; run.N++;
    if (moved) { run.nMove++; run.out.set(s2, (run.out.get(s2) ?? 0) + 1); }
    return g > threshold;
  }

  function update(s, a, s2, reward, done) {
    stats.updates++;
    const key = `${s}|${a}`;
    let q = pairs.get(key);
    if (!q) { q = { N: 0, nMove: 0, out: new Map(), keep: 1, down: emptyRun(), up: emptyRun() }; pairs.set(key, q); }
    const moved = s2 !== s;
    let replaced = false;
    if (P.resets && q.N >= P.changeMinN) {
      const pSelf = Math.min(1 - 1e-12, Math.max(1e-12, predict(s, a).self));
      const alt = P.changeAlt;
      const worse = cusum(q.down, Math.log((moved ? 1 - alt : alt) / (moved ? 1 - pSelf : pSelf)), moved, s2);
      const better = cusum(q.up, Math.log((moved ? alt : 1 - alt) / (moved ? 1 - pSelf : pSelf)), moved, s2);
      if (worse || better) {
        const run = worse ? q.down : q.up;
        if (worse) stats.changesDown++; else stats.changesUp++;
        q.N = run.N; q.nMove = run.nMove; q.out = new Map(run.out);       // the run already includes this observation
        q.down = emptyRun(); q.up = emptyRun();
        replaced = true;
      }
    }
    if (!replaced) { q.N++; if (moved) { q.nMove++; q.out.set(s2, (q.out.get(s2) ?? 0) + 1); } }
    if (moved) {
      const r = reward > 0 ? 1 : 0, d = done ? 1 : 0;
      const prev = arrive.get(s2);
      if (prev && P.resets && prev.n >= P.rewardResetMinN) {
        const pr = r ? rewardProb(s2) : 1 - rewardProb(s2);
        if (pr < P.rewardResetTau) {
          if (P.globalRewardReset) { arrive.clear(); stats.globalRewardResets++; } else { arrive.delete(s2); stats.rewardResets++; }
        }
      }
      const cur = arrive.get(s2) ?? { n: 0, r1: 0, d1: 0 };
      cur.n++; cur.r1 += r; cur.d1 += d;
      arrive.set(s2, cur);
    }
    refresh();
    version++;
  }

  return {
    params: P,
    visit(s, w) { if (!width.has(s)) width.set(s, w); else if (width.get(s) !== w) throw new Error(`state ${s} changed its action count`); },
    states: () => width,
    widthOf: (s) => width.get(s),
    predict, probOf, rewardProb, doneProb, update,
    countOf: (s, a) => pairs.get(`${s}|${a}`)?.N ?? 0,
    hyper: () => ({ mu: hyper.mu, S: hyper.S, nu: hyper.nu }),
    stats: () => ({ ...stats }),
  };
}
```

## Appendix H2. Frozen value-iteration planner

File: `cognitive/core/planner.mjs` · SHA-256 `eceb06302e97bf97632a697558f0fc1b3ca9ee3e7d347cef6bdace36c5516835` · 42 lines

```js
// ==========================================================
// CF-03 core — budgeted value iteration over the learned world model
// ==========================================================
// Q(s,a) = p(SELF) * gamma * V(s)
//        + sum over known outcomes s'  p(s') * [ R(s') + gamma * (1 - D(s')) * V(s') ]
//        + p(UNKNOWN) * vOpt                                 (optimism: an unseen outcome is worth vOpt)
// V(s) = max_a Q(s,a), over every visited state.  R and D come from the caller: the learned arrival model, or the
// declared cue semantics R = D = 1[s' = cue] (CD-005).  Gauss–Seidel sweeps, warm-started from the caller's V, until
// the largest change is below theta or `budget` sweeps are used.  A backup is one Q(s,a) evaluation.
// ==========================================================

export function qValue(model, V, s, a, { gamma, vOpt, rewardOf, doneOf }) {
  const p = model.predict(s, a);
  let q = p.self * gamma * (V.get(s) ?? vOpt) + p.unknown * vOpt;   // an unswept state starts optimistic
  for (const [s2, pr] of p.outcomes) q += pr * (rewardOf(s2) + gamma * (1 - doneOf(s2)) * (V.get(s2) ?? vOpt));
  return q;
}

export function qValues(model, V, s, opts) {
  const w = model.widthOf(s);
  return Array.from({ length: w }, (_, a) => qValue(model, V, s, a, opts));
}

export function valueIteration(model, V, { budget, theta, ...opts }) {
  let sweeps = 0, backups = 0, delta = Infinity;
  const states = [...model.states()];
  while (sweeps < budget) {
    delta = 0;
    for (const [s, w] of states) {
      let best = -Infinity;
      for (let a = 0; a < w; a++) { const q = qValue(model, V, s, a, opts); if (q > best) best = q; }
      backups += w;
      const old = V.get(s);
      delta = Math.max(delta, old === undefined ? Infinity : Math.abs(best - old));
      V.set(s, best);
    }
    sweeps++;
    if (delta < theta) break;
  }
  return { sweeps, backups, converged: delta < theta };
}
```

## Appendix I. Environment

File: `cognitive/testbed/env.mjs` · SHA-256 `4cc715d58338dd8c4a5849dd03d046dea9cd88cc2d9d1e7c8bd786c2a982dc5e` · 94 lines

```js
// ==========================================================
// CF-01 testbed — GraphEnv: the authoritative environment (handbook §8)
// ==========================================================
// The environment alone holds ground truth: position, topology, reliabilities, blocked edges, the rewarded node and
// the cue.  Agents see only frozen observations { node, nActions, goal }.  All state is in private fields.
//
//   const env = new GraphEnv(world, { seedLabel, maxSteps })
//   env.reset({ start, maxSteps })  -> observation
//   env.step(action)                -> { obs, reward, done, truncated }
// Runner-only controls (never handed to an agent): setRewardNode, setCue, block, unblock, setReliability, trace,
// oracleBestAction, inspect.
//
// Dynamics: action i at node s targets v = exitOrder[s][i]; the attempt succeeds iff the edge is not blocked and
// u < p(edge), where u is the j-th draw of that edge's own stream for this environment instance (common random
// numbers: same draws for every agent run with the same seedLabel).  A draw is consumed on every attempt, blocked or
// not.  On failure the agent stays.  Reward 1 and done on arrival at the rewarded node; the goal edge obeys the same
// dynamics as every other edge (CD-004).  Truncation at maxSteps is distinct from done.
// ==========================================================
import { distancesTo, edgeKey } from './worlds.mjs';
import { makeStream, randInt } from './rng.mjs';

export const OBS_KEYS = Object.freeze(['node', 'nActions', 'goal']);

export class GraphEnv {
  #w; #seedLabel; #maxSteps; #episodeMax;
  #rel = new Map(); #blocked = new Set(); #reward = null; #cue = null;
  #edgeStreams = new Map(); #startStream;
  #pos = null; #t = 0; #episode = -1; #over = true; #log = [];

  constructor(world, { seedLabel, maxSteps = 200 } = {}) {
    if (!seedLabel) throw new Error('GraphEnv needs a seedLabel');
    this.#w = world; this.#seedLabel = seedLabel; this.#maxSteps = maxSteps; this.#episodeMax = maxSteps;
    this.#startStream = makeStream(`${seedLabel}|start`);
  }

  // ---- runner-only controls ----
  setRewardNode(node) { this.#reward = node; }
  setCue(node) { this.#cue = node; }
  block(u, v) { this.#blocked.add(edgeKey(u, v)); }
  unblock(u, v) { this.#blocked.delete(edgeKey(u, v)); }
  setReliability(u, v, p) { if (!(p >= 0 && p <= 1)) throw new RangeError('reliability must be in [0, 1]'); this.#rel.set(edgeKey(u, v), p); }
  trace() { return this.#log.map((r) => [...r]); }
  inspect() { return { pos: this.#pos, t: this.#t, episode: this.#episode, reward: this.#reward, cue: this.#cue, blocked: [...this.#blocked].sort() }; }

  /** Privileged shortest-path action toward the rewarded node on the current true graph (blocked and p = 0 edges removed). */
  oracleBestAction() {
    if (this.#reward === null || this.#pos === null) return null;
    const cut = new Set(this.#blocked);
    for (const [k, p] of this.#rel) if (p === 0) cut.add(k);
    const d = distancesTo(this.#w, this.#reward, cut);
    const exits = this.#w.exitOrder[this.#pos];
    let best = null, bestD = Infinity;
    exits.forEach((v, i) => { if (!cut.has(edgeKey(this.#pos, v)) && d[v] >= 0 && d[v] < bestD) { bestD = d[v]; best = i; } });
    return best;
  }

  // ---- agent-facing interface ----
  reset({ start = null, maxSteps = null } = {}) {
    if (start === null) {
      const pool = Array.from({ length: this.#w.n }, (_, i) => i).filter((i) => i !== this.#reward);
      start = pool[randInt(pool.length, this.#startStream)];
    }
    if (start === this.#reward) throw new Error('an episode may not start at the rewarded node');
    this.#pos = start; this.#t = 0; this.#episode++; this.#over = false;
    this.#episodeMax = maxSteps ?? this.#maxSteps;
    return this.#obs();
  }

  step(action) {
    if (this.#over) throw new Error('step() after the episode ended; call reset()');
    const s = this.#pos;
    const exits = this.#w.exitOrder[s];
    if (!Number.isInteger(action) || action < 0 || action >= exits.length) throw new RangeError(`invalid action ${action} at a node with ${exits.length} exits`);
    const v = exits[action];
    const key = edgeKey(s, v);
    let stream = this.#edgeStreams.get(key);
    if (!stream) { stream = makeStream(`${this.#seedLabel}|edge|${key}`); this.#edgeStreams.set(key, stream); }
    const u = stream();
    const ok = !this.#blocked.has(key) && u < (this.#rel.has(key) ? this.#rel.get(key) : 1);
    if (ok) this.#pos = v;
    this.#t++;
    const reward = ok && this.#reward !== null && this.#pos === this.#reward ? 1 : 0;
    const done = reward > 0;
    const truncated = !done && this.#t >= this.#episodeMax;
    if (done || truncated) this.#over = true;
    this.#log.push([this.#episode, this.#t, s, action, this.#pos, reward]);
    return { obs: this.#obs(), reward, done, truncated };
  }

  #obs() {
    return Object.freeze({ node: this.#w.labelOf[this.#pos], nActions: this.#w.exitOrder[this.#pos].length, goal: this.#cue === null ? null : this.#w.labelOf[this.#cue] });
  }
}
```

## Appendix I2. Paired bootstrap

File: `cognitive/testbed/stats.mjs` · SHA-256 `33f34b4887292fc6f5ded9c94b93ecf89fa182952a3ec9d177bca842bafb59bb` · 20 lines

```js
// ==========================================================
// CF-01 testbed — paired world-level contrasts with a seeded percentile bootstrap (metrics §2)
// ==========================================================
import { makeStream } from './rng.mjs';

export function pairedBootstrap(diffs, label, B = 10000) {
  const n = diffs.length;
  if (!n) return { n: 0, mean: null, lo: null, hi: null };
  const mean = diffs.reduce((a, b) => a + b, 0) / n;
  const rnd = makeStream(label);
  const means = new Float64Array(B);
  for (let b = 0; b < B; b++) {
    let s = 0;
    for (let i = 0; i < n; i++) s += diffs[Math.floor(rnd() * n)];
    means[b] = s / n;
  }
  means.sort();
  return { n, mean, lo: means[Math.floor(0.025 * B)], hi: means[Math.ceil(0.975 * B) - 1], B };
}
```

