# M16 — Integration: design-stage finding and recommendation

> **DESIGN-STAGE EVIDENCE, NOT A FROZEN EXPERIMENT.** No SPEC, no freeze, no pins, no gate labels, no independent check,
> no confirmatory run. The figures below come from design calculations, prototypes run once on design labels to
> decide whether a gate was worth building. They are design estimates, not confirmatory results, and carry no verdict
> line. **Finding accepted by the owner, 2026-11-21: the integration gate is not run.** The accepted conclusions and
> the criteria for future tasks are in [`FINDING.md`](FINDING.md); the evidence files are checksummed in
> `proposal_inputs/SHA256SUMS`.

**Status:** design stage, 2026-11-21, on the owner's word "Yes, propose M16". Nothing is built, frozen or committed.
Three design calculations (`proposal_inputs/`) ran on the labels `m16int|design|0..39`, which are barred from any later
run. No push.

**Unchanged:** AD-13, world model v6, v3, the core and v4 planners, `env.mjs`, `main.js`, tasks E6 and E7, M13, M14,
M15 and every frozen experiment. The calculations import them and edit nothing.

## 0. Summary for the owner

You approved an M16 that would integrate the separately validated pieces and test, with nothing tuned, whether the
combination beats each piece. Before writing a gate design I calculated what such a gate would show. Neither design I
considered is worth a gate.

1. **The integration I recommended is settled before it runs** (section 1).
   - **The pieces are already one agent:** M15's agent is the AD-13 agent plus the relational belief. My earlier
     statement that they "live in separate agents" was wrong.
   - **They act in different phases:** the relational belief in a world's first episode; the change belief only after
     an exit has been tried at least 5 times.
   - **So they add up exactly:** interaction +1.35 [−2.27, 4.95] steps per label.
2. **The real integration gap, and its obvious fix, are also settled** (section 2).
   - **The gap:** the relation saves about 492 steps per label in first episodes, and 92% of that is spent again on
     exploration, because the knowledge only breaks ties and never reaches the planner's values.
   - **The fix:** letting the belief scale the planner's optimism (KGO) is unsafe. With a parameter-free safeguard
     (KGO_V) it is safe and large: 16–63% fewer steps than FULL without blocks.
   - **But knowledge plays no part in that saving:** a knowledge-free rule, "stop exploring after the first success
     unless something breaks" (EXPLOIT_V), matches KGO_V in every condition and beats it under noise (−235), reversal
     (−66) and sparse evidence (−18). A KGO_V gate would fail its decisive comparison.
3. **What it means:** on this testbed (24-node worlds, 4-hop routes, deterministic moves) simple rules match or beat
   the cognitive mechanisms:
   - M15's tuned window matched its Bayesian belief;
   - here a stop rule beats knowledge-guided exploration;
   - the adopted agent's largest cost in multi-episode stays is its own optimism, not missing cognition.

   The bottleneck for showing genuine capabilities is now the task battery, not the agent.

**Recommendation:**
- Do not run an M16 gate on integration. Record this document and its calculations as M16's design finding.
- Make the next milestone an **admission-first task battery where simple rules demonstrably fail**, before any new
  mechanism (section 4). I would write that proposal on your word.

## 1. The integration audit

Source: `proposal_inputs/m16_design_calc.mjs`, 40 design labels; `.out` has 3 familiar episodes before a block,
`_open6.out` has 6. Steps are summed over a label's 16 evaluation worlds; intervals are 95% percentile bootstrap
intervals over labels. Arms:
- FULL: the change belief plus the relational belief;
- NO_REL: the change belief only (the adopted agent);
- NO_CHANGE: the relational belief only, with ρ fixed at 0, which leaves v6 planning with v3's prediction, i.e.
  MBVI3's model;
- NEITHER: neither piece.

Each evaluation world: a few open episodes, then a route edge blocked without notice for 5 episodes, then reopened with
probability 0.1 (RARE) or 0.9 (OFTEN), then 5 more episodes.

### 1.1 The pieces are already one agent

- **M15's closed-loop agent is already the combination:** `makeBeliefAgent` → M14's `makeSchemaAgent` → world model v6
  with ρ = ½ and h = 0.01, i.e. the AD-13 agent, plus the relational belief as a tie-break (`m15_lib.mjs` passes
  `ADOPTED_AGENT.params`).
- **M14 and M15 fill the same slot:** M14's count schema and M15's belief are alternative sources for that tie-break.
- **Nothing needs rewriting.**

### 1.2 The two pieces act in different phases

**The relational belief** acts only among exits tied exactly at the top value, which in practice means untried exits
in a world's first episode. It learns once per world.

**The change belief** acts only after v3's detector declares an exit worse. The detector tracks an exit only once it
has been tried 5 times (`changeMinN = 5`).

| Familiar episodes before the block | Uses of the blocked edge before it (FULL) | Change-belief archive opened (blocked worlds) | Change belief's benefit after reopening, OFTEN |
|---|---|---|---|
| 3 | 3.0 | 82 of 640 | +0.6 [0.1, 1.2] |
| 6 | 5.9 | 613 of 640 | +18.2 [13.8, 23.0] |

### 1.3 Combined, they add up exactly (6 familiar episodes)

- **The relation's first-episode benefit is the same with or without the change belief:** OFTEN +500.65 [477.7,
  523.2] both ways; RARE +492.23 both ways.
- **The change belief's benefit after reopening is the same with or without the relation:** OFTEN +19.1 [15.4, 22.8]
  without it, +18.2 [13.8, 23.0] with it.
- **No interaction on total steps:** OFTEN +1.35 [−2.27, 4.95]; RARE −0.60 [−1.82, 0.50].
- **FULL beats each single piece in OFTEN:** −31.9 [−41.2, −22.5] steps against NO_REL and −16.1 [−20.7, −11.6]
  against NO_CHANGE.
- **The change belief's known RARE cost stays,** as in CF-06: about 2 steps in the blocked windows.

So "does the combination beat each piece, with nothing tuned?" is answered before any gate: **yes, additively,
because the pieces never meet.**

### 1.4 What the composition does depend on: the observation unit

FULL_EP is FULL learning from every goal-reaching episode instead of from one per world (M15's unit):

| RARE, 3 familiar episodes | FULL | FULL_EP |
|---|---|---|
| Wrong observations absorbed per label | 3.3 | 338.6 |
| P(true) at world start | 0.890 | 0.488 |
| Most-probable-kind errors (of 64) | 0 | 31.4 |
| Extra first-episode steps | — | +241.4 [219.0, 264.9] |

M15's unit, one observation per kind per world, is what keeps the two pieces from interfering. Any later change to the
unit is a change to the integrated agent.

### 1.5 New worlds whose signposted route is already broken

In PREBLOCK, half of the evaluation worlds have a route edge blocked from the start:
- **The belief is moderately contaminated:** P(true) 0.766 against 0.890; most-probable-kind errors 0.63 of 64.
- **A parameter-free EXPLAIN rule helps the belief only slightly:** do not learn from a node where the exit the belief
  named as the signpost was tried and did not move. P(true) rises to 0.804.
- **It changes no behaviour:** first-episode steps +4.6 [−4.7, 14.9]; under reversal −9.1 [−28.7, 9.4].

Most wrong observations come from detour nodes downstream, which no local rule explains. Not pursued.

### 1.6 The real gap: the relation's saving is mostly repaid

| NO_REL − FULL, RARE, 3 familiar episodes | First episode | Episodes 2–3 | Blocked | After | Whole world |
|---|---|---|---|---|---|
| steps per label | +492.2 | −359.9 | −90.3 | −0.5 | **+41.6** [30.2, 53.0] |

92% of the relation's first-episode saving is spent again: 73% in the next two episodes, 18% while the route is
blocked. The planner values every untried exit with full optimism (`vOpt = 1`), whatever the belief says about it. M14
saw the same thing ("SCHEMA costs more in COMPOSE episodes 2 and 3").

## 2. Knowledge into the planner's values: the designs evaluated

Source: `proposal_inputs/m16_kgo_calc.mjs`, 20 design labels. These are prototypes for sizing only, not proposed
code.

**Task.** E7's sequences with 6 episodes per evaluation world: STABLE, NOISY, REVERSED and SPARSE as in E7, no blocks.
BLOCK_RARE and BLOCK_OFTEN use the STABLE relation, with 6 open episodes, then a route edge blocked for 5, then
reopened with probability 0.1 or 0.9, then 5 more.

### 2.1 The arms

| Arm | Rule |
|---|---|
| NO_REL | the adopted agent |
| FULL | M15's agent (the relational belief as a tie-break) |
| KGO | FULL, and for exit `a` at a kind-`k` node the planner's unknown-outcome mass is multiplied by `c(a) = p_k(j_a) / max_b p_k(j_b)`: the most plausible exit keeps full optimism, the others keep it in proportion to their plausibility. No new parameter; a uniform belief gives FULL exactly |
| KGO_V | KGO with a parameter-free safeguard. It acts only in a world where the agent's first goal-reaching path followed the belief's most probable next kind at every step (confirmed), and stops for the rest of the world when an exit that has moved there fails to move (contradicted). The safeguard was added after the first design label showed plain KGO failing |
| EXPLOIT_V | FULL, and after a world's first goal-reaching episode, whatever path it took, all optimism about unknown outcomes is removed, until an exit that has moved fails to move. It uses no relational knowledge in its pruning; its first episode is FULL's |

### 2.2 Results

Total steps per label, over the 16 evaluation worlds:

| Condition | NO_REL | FULL | KGO | KGO_V | EXPLOIT_V |
|---|---|---|---|---|---|
| STABLE | 1143.9 | 1049.8 | 384.0 | 384.0 | 384.0 |
| NOISY | 1132.3 | 1091.0 | 1503.6 (30 capped) | 917.9 | **682.6** |
| REVERSED | 1127.8 | 1094.0 | 1193.3 (24 capped) | 656.4 | **590.4** |
| SPARSE | 1125.8 | 1047.4 | 492.6 | 418.6 | **400.8** |
| BLOCK_RARE | 2211.4 | 2182.4 | 6701.1 (383 capped) | 2143.8 | 2143.8 |
| BLOCK_OFTEN | 2184.4 | 2152.4 | 6451.9 (363 capped) | 2111.0 | 2111.0 |

| Condition | FULL − KGO_V | EXPLOIT_V − KGO_V | KGO_V's worst single world against FULL (max over labels) |
|---|---|---|---|
| STABLE | +665.8 [642.0, 687.5] | 0.0 | −4 |
| NOISY | +173.2 [143.3, 203.3] | **−235.2** [−267.6, −204.3] | +11 |
| REVERSED | +437.7 [396.2, 478.3] | **−66.0** [−83.3, −49.5] | 0 |
| SPARSE | +628.8 [599.5, 659.9] | **−17.9** [−27.2, −9.4] | 0 |
| BLOCK_RARE | +38.7 [28.0, 49.4] | 0.0 | +21 |
| BLOCK_OFTEN | +41.4 [28.4, 55.0] | 0.0 | +25 |

### 2.3 Reading

- **Plain KGO is unsafe.** A confident belief suppresses the search for a detour around a blocked route (hundreds of
  capped episodes), and a confident wrong belief suppresses exploration of the true route after a reversal or at a
  decoy.
- **KGO_V is safe and large.** It never acts in a first episode; its worst single world costs at most 25 steps more
  than FULL.
- **Under blocks, the saving is mostly deferred:** later episodes save 665, the blocked windows cost 623 more,
  leaving about +40 net. The exploration skipped while the route worked is paid when it breaks.
- **The knowledge adds nothing to the saving.** EXPLOIT_V, with no knowledge in its pruning, equals KGO_V where the
  relation holds and beats it where it does not. KGO_V's confirmation keeps the agent exploring in worlds whose first
  path disagreed with the relation. But in a 24-node world, the best known path after one episode is already close to
  the route, so further exploration does not pay back within five episodes.
- **So a KGO_V gate would fail its decisive comparison**, the one that asks whether the knowledge, and not mere
  pruning, makes the difference. That outcome is close to certain here: in all six conditions the interval for
  EXPLOIT_V − KGO_V either lies wholly below 0 or is exactly 0.

## 3. What this means for the programme

- **The adopted agent's largest cost in multi-episode stays is its own optimism.** In the four conditions without
  blocks, a stop rule removes 37–63% of FULL's steps (STABLE 1049.8 → 384.0). With a block in every world it removes
  about 2%: the deferred exploration comes back.
- **Relational knowledge matters only in a world's first episode,** where it already works as a tie-break.
- **This is the second time in two milestones that a simple rule matches or beats the cognitive mechanism.** M15's
  tuned window matched the Bayesian belief; here a stop rule beats knowledge-guided exploration. Both happen because
  the worlds are small, short and deterministic: one exploratory episode reveals most of a 24-node world, and a
  window of two observations is enough when changes are clean.
- **More mechanisms on this testbed will tend to be settled by construction or matched by a simple rule.** To show
  genuine capabilities, the tasks must first be ones where the simple rules are shown to fail.

## 4. Recommendation and the decision

**Recommended (A):**
- No M16 gate on integration. Record this document and its three calculations as M16's design-stage finding: one
  documentation commit, no gate labels touched.
- The next milestone is an **admission-first task battery**. Before any new mechanism:
  - define candidate tasks;
  - run the strongest simple rules and the privileged oracle on development labels: the stop rule, NEWEST/WINDOW, MBVI3
    and the adopted agent;
  - admit a task only if the best simple rule leaves a pre-declared headroom to the oracle.
- **Candidate levers:**
  - scale: the roadmap's M8, 100–200 nodes, where one exploratory episode reveals little;
  - stochastic moves;
  - longer stays;
  - aliased places (CF-05's partial-observability tasks were never admitted).
- **The first thing that battery would measure** is whether the stop rule still beats knowledge-guided exploration at
  scale.
- I would write that proposal on your word.

**Not recommended:**
- **(B)** Build and run the KGO_V gate anyway. Its decisive comparison is predicted to fail.
- **(C)** Adopt the stop rule into the agent. It wins because the worlds are small; it is a heuristic that would likely
  fail at scale, and adopting it would hide the problem rather than solve it.

## 5. Files and reproduction

| File | What | Labels | Run |
|---|---|---|---|
| `proposal_inputs/m16_design_calc.mjs` | sections 1.2–1.6 | `m16int|design|0..39` | `node … 40` → `.out` (917 s); `node … 40 6 event` → `_open6.out` (914 s) |
| `proposal_inputs/m16_kgo_calc.mjs` | section 2 | `m16int|design|0..19` | `node … 20` → `m16_kgo_calc.out` (1,729 s) |

Every figure above is copied from those outputs.
- **Reproduction:** `m16_design_calc.out` was produced before the script gained its optional arguments (whose defaults
  are the original settings). A re-run with the final script is checked to give identical output apart from the
  timing line.
- **Order of discovery, disclosed:** the KGO_V safeguard and the EXPLOIT_V baseline were added after the first smoke
  label (`m16int|design|0`), when plain KGO failed. Nothing was tuned: neither has a parameter.
