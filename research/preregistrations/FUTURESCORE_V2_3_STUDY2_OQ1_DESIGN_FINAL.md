# FutureScore V2.3 — Study 2 / OQ-1a — FINAL FROZEN DESIGN

**Status:** FROZEN for Research Director review (milestone M-STUDY2-FREEZE).
**Kind:** design specification only. **No Study 2 execution, no scientific seeds, no S-SHADOW run, no harness,
no production change.**
**Author:** Chief Systems Engineer · **Date:** 2026-09-21
**Gate:** [`verify_fs_study2_design_final.js`](verify_fs_study2_design_final.js)
**Labels:** FACT / CALCULATION / INFERENCE / DESIGN DECISION / OPEN IMPLEMENTATION GATE / OPEN QUESTION.

---

## A. Scope

This document freezes the design of **Study 2 for OQ-1a** — the *information* question — and nothing else.
It does not authorise execution, seeds, or a harness. It does not test OQ-1b (behaviour). It does not claim V2.3
is validated or that OQ-1 is answered.

## B. Frozen baseline and lineage

| Item | Identity |
|---|---|
| Production mechanism | `a066d47696b1502720f627855c8549f4d2898cd5` (V2.3 consumer at `952c9fc`; Study 1 frozen at `a066d47`) |
| V2.3 contract | `research/preregistrations/FUTURESCORE_V2_3_NUMERICAL_PROJECTION_CONTRACT.md` (commit `6a727d3`) — referenced, not restated |
| V2.2 boundary contract | `research/preregistrations/FUTURESCORE_V2_2_INPUT_CONTRACT.md` (commit `aa70e93`) |
| Lineage | `research/preregistrations/FUTURESCORE_LINEAGE_NOTE_01.md`, `…_BEHAVIORAL_DISPOSITION_01.md` |

**Lineage artifacts not yet under version control** (the scope lock of this milestone forbids committing them).
They are pinned here by SHA-256 over LF-normalised content, and the gate verifies these hashes:

| Artifact | SHA-256 |
|---|---|
| `research/preregistrations/FUTURESCORE_V2_3_STUDY2_OQ1_DESIGN.md` (Pass-1 design, accepted as design basis) | `2eee343ed77afc9da4b25fc096bc9844e406191ad279f26c8a425333a3c65b40` |
| `research/preregistrations/FUTURESCORE_V2_3_STUDY2_FEASIBILITY_F1_F2.md` (F-1 PASS, F-2 structural PASS) | `b9458dd863f53c2d2ae75e2fc6961b1c3518446f0a6b93702f750f44a09a619a` |
| `experiments/fsfeas/FEASIBILITY_RESULTS.md` (FS-OQ1-F2-FEAS PASS, feasibility only) | `1180e243e248e04345c7b4d143cd78fbe39be38013e218bd443ff50affd52125` |
| `experiments/fsfeas/evidence/INTEGRITY.sha256` (covers the 7 feasibility evidence files) | `fd5fdba61c8578d5d143fd9d22016156c7093b1127fa320bcd130009a047ce72` |

**OPEN QUESTION (governance).** These artifacts should be frozen under version control in their own milestone,
as Study 1's evidence was. Until then this hash table is their only tamper-evident record.

## C. Scientific question

**OQ-1a.** At a decision state actually visited by the V2.3 agent, before any action is taken, does consulting
learned traversal evidence (`c_hat` from post-outcome `{a, s}`) change FutureScore's candidate ranking in the
direction of the external expected-cost oracle, relative to the same mechanism with learned evidence neutralised?

**Explicitly not asked:** whether V2.3 improves behaviour (OQ-1b); whether it improves goal-reaching; the global
average effect over all states.

## D. Causal estimand

**DESIGN DECISION.** The estimand is the **informational utility of learned evidence, conditional on the state
distribution visited by the V2.3 behaviour policy**, in the **pre-shift (current-evidence) regime**:

```
Δ(e)  = τb(FS_FULL(e), U*(e)) − τb(FS_GEO(e), U*(e))
Δ_r   = median over decision events e in run r with t_e ≤ 1500 of Δ(e)
θ     = median over runs r of Δ_r                                   ← PRIMARY estimand
```

**REPAIR (M-STUDY2-IMPLEMENTATION-GATE).** The frozen text previously wrote the across-run step as an
expectation, `E_runs[·]`, while §Q declared the **median** of `Δ_r` as the primary across-run summary. The primary
estimand is now written to match §Q exactly: **`θ = median_r Δ_r`**. The mean of `Δ_r` across runs is retained
as **secondary, descriptive** information only. Nothing else about the estimand changed.

It is **not** a global average treatment effect over all possible states, and it is **not** a behavioural effect.

## E. Causal graph

```
 config (p-vector, goal) ─┬─> env.attempt outcomes ──> {a,s} ──> c_hat ──┐
                          │                                               │  [E]  learned evidence
 topology (fixed) ────────┼──> d(v,g)  [G] ───────────────────────────────┼──> FS_FULL(k)
                          │                                               │
                          │         (same G, same everything else) ───────┴──> FS_GEO(k)   (c_hat ≡ 1)
 behaviour policy (V2.3 FULL, executed) ──> visited decision state u, candidate set K(u)
                                                                                │
 oracle U*(k) = −C(k), C = expectedCostToGoal(p, g)   ← evaluation only ──────┴──> τb(·, U*)
```

The trajectory, and therefore the visited states and the accumulated evidence, are produced **once**, by the
executed FULL policy. FULL and GEO are both *read-outs* of that single decision-time state.

## F. S-SHADOW intervention

**The controlled intervention is the value of learned traversal evidence, and nothing else.** At each captured
decision event:

- **FULL** — FutureScore computed with the actual decision-time `c_hat` from `render/traversalRecord.js`.
- **GEO** — the same FutureScore computation with learned evidence neutralised, `c_hat ≡ 1` on every edge.

Neither score is executed as an action by S-SHADOW. The action actually taken is the production decision,
unchanged.

## G. Decision-time capture boundary

**FACT (source trace at the baseline).** Within one `runAgent()` call (`main.js:3249`):

| Order | Line | Event |
|---|---|---|
| 1 | `main.js:3457` | `runPrediction(agentCurrent)` — the **agent-loop** decision call |
| 2 | `main.js:1519` | `function runPrediction(startKey)` — state = `startKey`, goal = `goalNeuronId` |
| 3 | `main.js:1794` | candidate admission `canReachGoal(k, goalNeuronId)` |
| 4 | `main.js:1970` | `imaginedFuture = futureScore(targetNeuronForFuture, goalNeuronId)` — **per admitted candidate** |
| 5 | `main.js:1991` | `futureBonus = projectFutureScore(imaginedFuture, graphDiameter())` |
| 6 | `main.js:2185` | `calculateDecisionScore({…})` |
| 7 | `main.js:2490` / `2495` | `sorted = choices.sort(…)` / `bestChoice = sorted[0]` |
| 8 | `main.js:3949` | `next = window.lastReasoning.to` — the decision is taken |
| 9 | `main.js:5019` | `env.attempt(_m7From, _m7To)` — the environment decides the outcome |
| 10 | `main.js:5059` | `recordTraversalOutcome(…)` — the evidence write |

**INFERENCE (and the property S-SHADOW needs).** Scoring (4) precedes the environment draw (9) and the evidence
write (10) of the same tick, so **decision-time evidence never contains the current tick's outcome**, and no
post-action state can be mistaken for the decision state.

**DESIGN DECISION — capture point (REPAIRED, Director ruling on G-IMPL-1).** A **decision event** is **one
`runAgent` invocation whose real `runPrediction(agentCurrent)` call from `main.js:3457` produces the executed
decision at chain step 0.** The UI call `runPrediction(clickedId)` at `main.js:5651` is **excluded**. Steps taken
through the stale/replay branch without a `runPrediction` call are **not** decision events.

**DESIGN DECISION — what is captured per event (REPAIRED).**

> **Superseded wording, retained for lineage:** *"The set `K(e)` of candidates for which `futureScore` was actually
> evaluated at line 4 in that invocation."* **This was incorrect.** FACT: `runPrediction` evaluates an imagined
> chain — `for (let step = 0; step < STEPS; step++)` (`main.js:1621`), `STEPS = max(2, min(dynamicDepth, 6))`
> (`main.js:1613`), advancing with `currentKey = nextKey` (`main.js:2850`) — and only **step 0** sets the executed
> decision (`if (step === 0) { window.lastReasoning = … }`, `main.js:2764`). The superseded wording therefore
> admitted candidates of **imagined successor states**.

**`K(e)` is the exact step-0 ranking candidate set:** the candidates scored by `futureScore` at `main.js:1970`
**while the chain is at step 0**, i.e. at the real decision state. **Imagined successor states produced by steps
1…STEPS−1 are excluded from the primary endpoint** and never enter an event record. `FS_FULL(k)` is the value
computed there; `FS_GEO(k)` is computed for exactly the same `K(e)` at the same moment. The endpoint therefore
evaluates only the ranking that can actually determine the executed action at that event.

**OPEN IMPLEMENTATION GATE G-IMPL-1 (same-snapshot and candidate-set proof).** The GEO score must be produced by the
**same code** as FULL with only the evidence reader replaced, evaluated inside the same `runPrediction` invocation
before control leaves it. Acceptance criterion: the GEO evaluator's source differs from `render/planning.js`
**only** in the evidence-reader binding, proven by a source-diff check, and no GEO evaluation writes any state.
**Additionally (REPAIR):** for every event, the step-0 ranking candidate set (`sorted` at `main.js:2490`, step 0)
must **equal** the step-0 FutureScore candidate set — same IDs, same cardinality, none missing, none extra, no
duplicates, deterministic order — and `targetNeuronForFuture(k)` (`main.js:1968`) must resolve to `k` itself.

**OPEN IMPLEMENTATION GATE G-IMPL-2 (non-interference).** Adding the capture must not change the executed
trajectory. Acceptance criterion: capture-on versus capture-off runs of the same fixture are identical on the
full fingerprint (action-sequence hash, RNG draw counts, Q, environment counters, final record) — the method
FS-OQ1-F2-FEAS already demonstrated.

**OPEN IMPLEMENTATION GATE G-IMPL-3 (step index).** `t_e` must be the index of the `runAgent` step in which the
event occurs, counted exactly. The M40 checkpoint convention counts completed ticks; the capture must use the
same counting so that `t ≤ 1500` means the same thing.

**Considered and not adopted:** an M40-style checkpoint *census* that scores every decision state from a snapshot.
It is also same-state, but it scores states the agent is not at, which the Director's ruling excludes.

## H. FULL / GEO identity matrix

| Input | FULL | GEO | Identical? |
|---|---|---|---|
| decision state `u` | captured | same capture | **yes** |
| goal | `goalNeuronId` | same | **yes** |
| candidate set `K(e)` | step-0 set evaluated at `main.js:1970` (imagined steps excluded) | same set | **yes** |
| graph / neighbours | physical graph | same | **yes** |
| candidate admission | `canReachGoal(maxDepth=4)`, `main.js:1794` | not re-run; same `K(e)` | **yes** |
| geometry `d(v,g)` | private BFS, `render/planning.js` | same function | **yes** |
| horizon | `H = 3` module constant | same | **yes** |
| recursion, terminal, goal handling | V2.3 | same | **yes** |
| projection | not used for ranking (monotone; §P) | not used | **yes** |
| ranking procedure / tie policy | §P | §P | **yes** |
| every non-evidence score term | not part of FS | not part of FS | **yes** |
| **learned evidence `c_hat`** | **actual** | **≡ 1** | **NO — the intervention** |

**INFERENCE.** Because GEO re-uses `K(e)` rather than recomputing admission, **admission is identical between
arms by construction**.

## I. V2.3 contract reference

The mechanism is V2.3 exactly as frozen in the V2.3 contract and verified by
`experiments/futurescore/verify.js` (77/77). This design does **not** restate, reinterpret or alter `c_hat`,
`H = 3`, the simple-path recursion, the terminal, goal handling, `D`, or the projection.

**Limitations of the tested mechanism, stated rather than fixed:**
- **FutureScore does not cost the decision edge.** FACT: `render/planning.js:395`
  `explore(start, H, new Set([start]))` begins at the candidate, so evidence on `u→k` is outside FS.
- **FutureScore horizon `H = 3` differs from the oracle's unbounded horizon.**
- **Goal-entering traversals never receive evidence** (FS-LN-01 §3.1).

## J. Oracle definition and leakage boundary

**Oracle (retained from the accepted design).** For candidate `k` at event `e`:

```
U*(k) = −C(k),   C = expectedCostToGoal(p, goal)        (experiments/m7/env.js)
```

with `p = cfg.pPhase1` for the primary window (§K). Higher `U*` is better. `U*` is scoped to the candidate
onward, matching FutureScore's scope (§I).

**CORRECTION RECORDED.** The F-2 feasibility calculation used `−(1/p(u,k) + C(k))`, which includes the decision
edge. **That variant is not the frozen oracle.** F-2's Δ values (+0.02 … +0.35) are therefore illustrative of
structural rankability only and **must not be used as a prior effect-size estimate** for this endpoint.

**Information boundary.** True `p`, `C`, and any oracle-derived value may be used **only in post-run analysis**.
They must not enter FutureScore, candidate generation, candidate admission, FULL scoring, GEO scoring, behaviour,
stopping rules, or seed selection.

**Leakage audit.**

| Channel | Status | Evidence |
|---|---|---|
| true `p` into scoring | **excluded** | `render/planning.js` imports only `search.js`, `embeddings.js`, `traversalRecord.js` (V2.3 gate N1); no `trueP`, `expectedCostToGoal`, `pPhase` symbol in its code (gate N3) |
| oracle into scoring | **excluded** | same; oracle functions live in `experiments/m7/env.js`, which `planning.js` does not import |
| future trajectory / post-decision outcomes | **excluded** | scoring at `main.js:1970` precedes `env.attempt` (`5019`) and the evidence write (`5059`) of the same tick |
| phase-II outcomes in primary scoring | **excluded** | an event at step `t ≤ 1500` sees evidence written through step `t − 1 ≤ 1499`, all phase I (`env.setTick`: phase II from tick 1500) |
| future traversal events | **excluded** | same as the post-decision row |
| evaluation-only labels, analysis metadata | **OPEN IMPLEMENTATION GATE G-IMPL-4** | the capture must write events to an append-only record and the analysis must compute `U*` out of process; to be proven by a static gate |
| seed-specific oracle information | **OPEN IMPLEMENTATION GATE G-IMPL-4** | the config seed may select the configuration only; nothing oracle-derived may select, filter or order seeds |

## K. Primary pre-shift analysis

**DESIGN DECISION (frozen by ruling).** Primary window: **decision events with step index `t ≤ 1500`**, following
the existing M40 phase convention under which the `t = 1500` snapshot is pre-shift.

**The question it answers:** does learned evidence add oracle-concordant ranking information **in the regime
where that evidence is current** — where FS-OQ1-F2-FEAS measured median `|c_hat − 1/p|` of 0.05–0.10.

**Boundary disclosure.** `env.setTick(1500)` switches the environment to phase II at step 1500, so an event at
`t = 1500` is *executed* under phase II while its evidence is still entirely phase I. The ruling includes it;
the primary oracle uses `pPhase1` for every event in the window, including `t = 1500`. At most one step per run
is affected. This is fixed in advance and reported, not adjusted.

**The phase is not selected on results.** Pre-shift was frozen before Study 2 exists.

## L. Secondary post-shift analysis

**Explicitly secondary and exploratory: the stale / historically accumulated evidence regime.** Events with
`t > 1500`, scored against `U*` computed from `pPhase2`. **Never pooled** with the primary window, and **never
used to change the primary conclusion**. FS-OQ1-F2-FEAS showed post-shift evidence is largely stale
(median error ~1.0–1.6), so this analysis characterises a different question.

## M. R5 moderation policy

**DESIGN DECISION (frozen by ruling).** No new R5 threshold. **`R5 ≥ 8` is not adopted**, and no configuration
is excluded for low R5.

- **Eligibility** is the existing acceptance rule only (§T); R5 ≥ 4 is already part of it (`env.js:248`) and is
  retained as-is.
- **R5 is a prespecified moderator:** each run's `r5Differing` (from `cfg.checks`) is recorded.
- **Summary:** a per-run table of `(run, goal, R5, Δ_r)`, and the Spearman rank correlation between R5 and
  `Δ_r` across runs, reported **descriptively** with no threshold and no subgroup test.
- **Expected-effect note (INFERENCE):** low R5 plausibly limits achievable Δ — the R5-floor fixture gave a near-null
  illustrative Δ in F-2. That is a reason to *report* heterogeneity, not to exclude runs.

## N. Candidate admission

Retained as-is: `canReachGoal(…, maxDepth = 4)`, `goalDistance`, `goalGradientBoost`, all unchanged.
**CALCULATION (F-1):** on this topology the maximum hop distance to any goal is 4, so admission prunes nothing.
**INFERENCE:** admission can bound achievable concordance in general, but because GEO re-uses FULL's `K(e)` it is
**identical between arms and cannot create the contrast.**

## O. Primary endpoint

```
Δ(e) = τb( FS_FULL(e), U*(e) ) − τb( FS_GEO(e), U*(e) )
```

computed over the candidate set `K(e)` of decision event `e`, for events in the primary window. The unit of `Δ(e)`
is a difference of two Kendall tau-b values, in `[−2, 2]`.

## P. Kendall tau-b and tie handling

**Ranking input.** Raw FutureScore values. The projection is strictly increasing (V2.3 gate L7), so ranking by raw
FS and by `futureBonus` is identical; using raw FS avoids an unnecessary transformation. `−∞` sorts below every
finite value; two `−∞` values are tied.

**Definition.** For `m = |K(e)|` candidates, over all `n0 = m(m−1)/2` unordered pairs `(i, j)`:
`sx = sign(x_i − x_j)`, `sy = sign(y_i − y_j)`;
`n_c` = pairs with `sx·sy > 0`, `n_d` = pairs with `sx·sy < 0`;
`n1` = pairs tied in `x`, `n2` = pairs tied in `y` (a pair tied in both counts in both).

```
τb = (n_c − n_d) / sqrt( (n0 − n1) · (n0 − n2) )
```

**Numeric ties (precision convention, not a scientific threshold).** Two values are tied when
`|x_i − x_j| ≤ 1e-9`. FS magnitudes are ≤ ~20 and double precision is ~1e-16 relative, so this absorbs
summation-order noise without merging genuinely distinct evidence values (the smallest non-zero `c_hat`
differences at realistic counts are orders of magnitude larger). Applied identically to FULL, GEO and `U*`.

**Undefined tau-b.** When `n0 − n1 = 0` or `n0 − n2 = 0`, one margin has no untied pair and tau-b is undefined.
GEO makes this likely, because candidates at equal hop distance tie.
- **DESIGN DECISION (primary):** an undefined tau-b is scored **0** ("no ordering information"). This keeps the
  events where geometry ties — exactly where evidence could matter — in the estimand, and treats both arms
  symmetrically.
- **Prespecified sensitivity analysis:** the same endpoint with such events **excluded**.
- **Reported:** the count and share of events with an undefined tau-b, per arm.

**Candidate-set size.** Events with `m < 2` are excluded (no ranking exists). **CALCULATION:** admission prunes
nothing here, so this arises only at degree-1 states; the count is reported.

**Determinism.** The statistic is order-independent over pairs and uses no RNG.

**Validation (not a dependency).** The project-owned implementation is to be cross-checked against SciPy
`scipy.stats.kendalltau`, whose default `variant='b'` implements tau-b (source: `scipy/stats/_stats_py.py`,
`def kendalltau(…, variant='b', …)`), in a **separate validation step**, never as a runtime dependency.

## Q. Statistical unit and aggregation

**Hierarchy (consistent with the accepted Pass-1 design, Part 10):**

1. **Decision event `e`** → `Δ(e)`.
2. **Within run `r`** → `Δ_r = median over e in r of Δ(e)`. Events are weighted by occurrence, which is what
   "conditional on the visited state distribution" means; repeat visits count repeatedly. The mean is reported
   as secondary.
3. **Independent unit = the run**, i.e. one accepted configuration (`configSeed`, `configIndex`) with its goal.
   Events within a run share one trajectory and one evidence stream and are **not** independent.
4. **Across runs** → the median of `Δ_r` (the primary estimand `θ`, §D), the interval defined in §W, and — as
   originally frozen — an **exact** enumerated bootstrap interval for that median when the run
   count permits exact enumeration, the full per-run sign pattern, and the exact sign test.

**No α and no significance threshold is set.** Results are classified against §V/§W as consistent with,
inconclusive about, or inconsistent with OQ-1a.

**Repair of the Pass-1 design, stated explicitly:** Pass-1 named "decision states" as the event unit; this
freeze specifies them as **decision events at the `main.js:3457` call**, which is the operational definition the
Pass-1 text implied but did not pin.

## R. Seed governance

- **No scientific seed is generated by this milestone.**
- **Configuration seeds for Study 2: OPEN QUESTION — requires Director authorization** of a fresh registered
  range, disjoint from C1 `895xxx`, UQ-B `897xxx`, held-out `≥ 900500`, and the development fixtures.
- **Run count: OPEN QUESTION.** It must be pre-registered before generation. **DESIGN DECISION:** config indices
  cycle through `0..3`, so the four goals (8, 12, 16, 19; `env.js:38`, `makeConfig` `goal = GOALS[index % 4]`)
  are represented equally.
- **Behaviour-policy agent seed:** the existing frozen protocol constant `agentSeed = 20260819000`
  (`experiments/uqb/protocol.js`), reused and not generated, with arm `A1`, exactly as FS-OQ1-F2-FEAS used.
- **Development fixtures** (`896066:0`, `896066:1`, `896238:2`, `896329:3`) are for harness shakedown and gate
  G-IMPL-2 only, and **carry no confirmatory weight**.
- **Pre-registration before any seed is generated:** this document, the analysis script and its hash, the run
  count, and the seed range.

## S. Reproducibility

| Item | Frozen value |
|---|---|
| code | `a066d47696b1502720f627855c8549f4d2898cd5` + the Study-2 capture/analysis harness (hash recorded at implementation) |
| graph | `connections.json` blob sha256 `52867c4bb1c15392…` (20 nodes, 39 edges, D = 4) |
| environment | `experiments/m7/env.js` at the baseline; `RUN_TICKS = 3000`, `T_SHIFT = 1500`, `EPISODE_CAP = 150` |
| agent | V2.3, arm `A1`, `pin = on`, `tickUnit = step`, `agentSeed = 20260819000` |
| config | `makeConfig(configSeed, configIndex)` with `generateAccepted`; `acceptedSeed` and rejection count recorded |
| RNG | named streams (`instrumentation/rng.js`); cognitive and visual draw counts recorded per run |
| checkpoint grid (diagnostic only) | M40 grid `250 … 3000` |
| primary window | decision events with step `t ≤ 1500` |
| evidence | per-run event record + `INTEGRITY.sha256`, output hashes, replay check on one run |

## T. Exclusion rules

**Run level.** A run is **eligible** iff its configuration is accepted by the existing rule
(`cfg.accepted`, `env.js:203-204`, which already includes `R5 ≥ 4`). No other run-level exclusion exists. A run
that crashes is **recorded and reported**, excluded from the primary analysis, and **not replaced**.

**Event level.** Excluded only if `m < 2` (§P) or outside the analysis window. Undefined tau-b is **not**
exclusion in the primary analysis (§P).

**No post-hoc exclusion of any kind**, including by R5.

## U. Stopping rules

The study is complete when the pre-registered run set has executed. **No run is added** to rescue an
inconclusive result or to change a sign pattern. Additional runs are justified only by a failed G-IMPL-2 replay
check on a run, which is re-executed once with the failure reported.

## V. Null interpretation

If `Δ_r` is centred on zero, with an interval spanning zero and no sign majority:
**"No detectable oracle-concordant ranking information from learned evidence beyond geometry, at FULL-policy-
visited pre-shift decision events, under the frozen V2.3 mechanism."**
This does **not** establish that learned evidence is useless in general, in other environments, at other
horizons, or behaviourally. Plausible structural reasons — the unscored decision edge, `H = 3`, neighbourhood
overlap, low-R5 configurations — are to be examined, not used to explain the result away.

## W. Positive-result interpretation

**Interval rule (frozen before any result — REPAIR, M-STUDY2-IMPLEMENTATION-GATE).** "The interval" means the
**two-sided 95% percentile interval of the exact nonparametric bootstrap distribution of `θ = median_r Δ_r`**,
the same method Study 1 used:

- the bootstrap distribution is the **complete** set of all `N = n^n` equally weighted resamples, with
  replacement, of the `n` run-level values `Δ_r` — enumerated, never randomly sampled, so it consumes no RNG;
- it may be computed by enumerating multiset count vectors weighted by their multinomial counts, which yields the
  **identical** distribution and remains feasible when `n^n` is too large to list; the two computations must agree
  exactly on every run count where both are feasible;
- with the `N` resample medians sorted ascending (0-based), the **lower** bound is the value at position
  `⌊0.025·N⌋` and the **upper** bound the value at position `⌈0.975·N⌉ − 1`;
- the interval **excludes zero** iff `lower > 0` or `upper < 0`, strictly.

No effect-size threshold is set. The 95% level is carried over from the existing Study-1 methodology; it was not
chosen with reference to any expected result.

If `Δ_r > 0` with a consistent sign majority and an interval excluding zero:
**"Learned traversal evidence adds oracle-concordant ranking information beyond geometric goal distance, at the
states the V2.3 agent visits, in the current-evidence regime."**
This is an **information** claim about **OQ-1a only**. It does **not** show behavioural improvement (OQ-1b),
goal-reaching gains, or a global treatment effect.

## X. Threats and limitations

1. **Evidence endogeneity** — states and evidence come from the executed FULL policy; the estimand is conditional
   on that distribution by design.
2. **Unscored decision edge** — evidence on `u→k` is invisible to both FS and `U*`.
3. **`H = 3` versus the oracle's unbounded horizon.**
4. **Neighbourhood overlap** — FS-relevant neighbourhoods cover much of a 20-node, D = 4 graph.
5. **Single topology**; results may not transfer.
6. **Low-R5 configurations** plausibly limit achievable Δ (§M).
7. **Boundary event at `t = 1500`** executed under phase II (§K).
8. **Undefined tau-b convention** (§P) — mitigated by the prespecified sensitivity analysis.
9. **Float-tie convention** (§P).
10. **F-2 oracle variant** differs from the frozen oracle (§J) — F-2 numbers are not a prior.
11. **jsdom/driver fidelity.**
12. **Lineage artifacts not yet under version control** (§B).

## Y. Build-vs-reuse decision

| Need | Decision | Evidence |
|---|---|---|
| independent graph / shortest-path cross-check | **REUSE AS VALIDATION REFERENCE** — NetworkX, **not** a dependency | `networkx/networkx`: API reports `NOASSERTION`, but `LICENSE.txt` reads "3-clause BSD"; active (push 2026-09-18) |
| independent Kendall tau-b cross-check | **REUSE AS VALIDATION REFERENCE** — SciPy, **not** a dependency | `scipy/scipy`: BSD-3-Clause; `kendalltau(…, variant='b')` default is tau-b; active (push 2026-09-21) |
| S-SHADOW mechanism (same-state counterfactual, learned traversal evidence, geometry-only counterfactual, external expected-cost oracle, FutureScore-style ranking) | **BUILD — project-owned** | the completed existing-work audit found no implementation of this combination; the nearest learned-reliability work (PathUCB/PathTS, arXiv:2607.15440) optimises a reset-on-failure objective and publishes no code |

No dependency is added to production or to `package.json` (none exists). Neither reference replaces any part of the
mechanism; both only validate it.

## Z. Final Study-2 gate checklist

| # | Gate | Status |
|---|---|---|
| Z1 | Design frozen (this document) | **frozen here** |
| Z2 | Seed range authorized and pre-registered | **OPEN — Director** |
| Z3 | Run count pre-registered | **OPEN — Director** |
| Z4 | G-IMPL-1 same-snapshot proof | **OPEN IMPLEMENTATION GATE** |
| Z5 | G-IMPL-2 capture non-interference | **OPEN IMPLEMENTATION GATE** |
| Z6 | G-IMPL-3 exact step index | **OPEN IMPLEMENTATION GATE** |
| Z7 | G-IMPL-4 oracle/metadata leakage static gate | **OPEN IMPLEMENTATION GATE** |
| Z8 | tau-b implementation cross-checked against SciPy (validation only) | **OPEN IMPLEMENTATION GATE** |
| Z9 | analysis script hash recorded before seed generation | **OPEN** |
| Z10 | untracked lineage artifacts frozen under version control | **OPEN QUESTION — governance** |

**No Study 2 execution or scientific seeds were performed in producing this design.**
