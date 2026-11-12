# GATE-FLOOR-HEAD — runtime audit and design-decision review package (self-contained; no repository access needed)

**What I need from you.** One focused adversarial review, **before any confirmatory outcome exists and before anything is
frozen**. You do not implement code and you do not run anything. Decide whether the smallest valid HEAD replication of the
goal-entry floor (a) can use the GATE-FLOOR-1 / GATE-FLOOR-B2 design **unchanged**, (b) **needs a limited correction**
(the one proposed in §7, or a different one you specify), or (c) is **not yet interpretable**. Answer §9 in the format of §10.
Do not reopen MCF-1 governance or repeat closed audits.

## 1. Context in one paragraph

Two frozen, executed replications (160 fresh worlds each, 1,500-call Phase I) show that a guarded, default-off floor on the
goal-entering score term — `100·max(tc, 1)` iff the candidate is the active goal and a legal graph edge, **no stored episode**
— raises *legal goal reaches* a lot: conformed H1-R runtime **+152.7 [137.2, 168.4]** (exceeds the real episode store,
non-inferior to the goal-entry-only store, no goal group harmed); pristine B2 **+190.2 [176.3, 204.2]** (same structure; the
final-hop retry diagnostic is degenerate there because B2 takes no environment draw for a goal entry). Both runtimes are *not*
what ships. Production-relevance requires the current repository `main.js` (HEAD). This package is the read-only audit of
HEAD and the decision on how to test the floor there.

## 2. Identities (FACT)

| | B2 (`707cb1e`, 2026-08-28) | conformed (H1-R transform on B2) | **HEAD** `0df804c497e649affb9e7ebacb10fdc81ab6de8d` |
|---|---|---|---|
| tracked worktree | — | — | clean (23 untracked files, none under runtime paths) |
| `main.js` blob / sha256 | `113fa471…` / `537f37a2…` (5,549 lines) | sha `10c6ed9c…` | `09c36b5c…` / `c92c5c6b…` (5,699 lines) |
| `render/planning.js` blob | `be55bcb4…` | same as B2 | `7ebfec77…` |
| new runtime file | — | — | `render/traversalRecord.js` (`92555d43…`) |
| build configuration | none: ES modules loaded directly (`index.html` `<script type="module" src="./main.js">`); no package.json, no bundler | | |

Of B2's 146 runtime blobs, **exactly five differ at HEAD**: `main.js`, `render/planning.js` and three non-runtime files
(`.gitattributes`, `README.md`, `research/09_decisions.md`); `render/traversalRecord.js` is new. Every other runtime module is
blob-identical: `render/scoring.js`, `qlearning.js`, `episodeManager.js`, `trustMemory.js`, `memory.js`, `search.js`,
`instrumentation/rng.js`, `experiments/m7/{env,run,arms}.js`, `connections.json`, `neurons.json`. The M7 / other hook
inventory (`__M7_ARMS__`, `__M7_CREDIT__`, `__M7_ENV__`, `__M7_EPISODE_CAP__`, `__M7_GOAL__`, `__M7_PE__`, `__M7_TEL__`,
`__MFW_STEP_LEDGER__`) is **identical** to B2's. Four commits touched runtime files since B2: `0f47d7b` (canReachGoal fix),
`8b9355f` (FutureScore receives the graph node identity), `4fb5c74` (write-only traversal record), `952c9fc` (FutureScore
V2.3 consumer). The conformed tree's conformance edits (N1 mask/guard, R1/R2 draw reordering and goal draw, P4, flat goal
reward, …) are **not** in HEAD; they exist only in derived trees.

## 3. The complete B2 → HEAD difference in `main.js` (the full diff is five hunks)

1. import of `traversalRecord` (write-only side record).
2. **`canReachGoal`**: the visited set is unmarked on backtrack (the "CRG" fix, 9 false negatives → 0). In the conformed tree
   this was guarded by H1-R; at HEAD it is **unconditional**.
3. **FutureScore V2.3**: `futureScore(neuron, goal)` (signature without `rewards/penalties/curiosity/depth`);
   `futureBonus = P(FS) = 20·S/(S − FS)` with `S` = graph diameter (4), replacing `Math.min(FS·4, 20)`.
4. **Traversal-record write** at the E1/E2 point: `recordTraversalOutcome(from, to, traversed)` iff
   `next !== null && !_goalResetJustHappened` (so never for a goal entry); no RNG; module-private; **not persisted**.
5. A UI key handler clears the record (irrelevant headless).

`render/planning.js` (HEAD): `futureScore(k, goal)` = best over simple paths of ≤ 3 steps from `k` of `Σ −ĉ(e) + T(end)`, with
`ĉ(e) = (a+1)/(s+1)` from the traversal record and `T(v) = −d(v, goal)` over the **physical graph** (BFS on
`userData.neighbors`); `futureScore(goal) = 0`.

## 4. The finding that matters (FACT, with its source)

In **B2 and the conformed tree** `futureScore` started its search at `neuron.id` — the THREE `Object3D` counter — not the
graph id: "Neurons 5–20: the lookup found nothing, so `futureScore` returned exactly 0; neurons 1–4 scored the *wrong*
neuron" (`experiments/d2/D2_EVIDENCE_LINEAGE.md`, the D2 repair `8b9355f`). So `futureBonus` was **effectively dead** (0 for
16 of 20 nodes) in every runtime GATE-FLOOR-1 and GATE-FLOOR-B2 measured. At HEAD it is **live and goal-directed**: with a
cold record `FS(k) = −d(k, goal)`, hence `futureBonus` = 20 (goal), 16 (a goal neighbour), 13.3 (distance 2), 11.4, 10 — an
experience-independent structural gradient, ×1.2 in the learned score and in the arbitration blend (`scoring.js`
unchanged). At a goal-adjacent node the goal candidate leads another goal neighbour by (20−16)·1.2 = 4.8 points before the
floor's +200. FIX 3 still gives the goal candidate `100·tc` (0 when cold).

## 5. Execution path at HEAD (line numbers in HEAD `main.js`; every region not in §3 is byte-identical to B2)

| stage | HEAD |
|---|---|
| candidate generation | `runPrediction` 1519; structure map (graph neighbours), semantic and memory paths; admission 1763–1794: `isGraphNeighbor` **or** `trainedStrength > 5` **or** (`rewards > 4` and an episodic witness) — **non-graph candidates are admitted** (no N1) |
| reachability | `canReachGoal` (fixed form) filters at 1794 and 2542 |
| scoring | `futureBonus` 1970–1991 (V2.3); goal gradient 2063 / 2103 / **2123 FIX 3 `goalGradientBoost = 100*tc`**; `calculateDecisionScore` 2183 (`goalGradientBoost × 2.0`, `futureBonus × 1.2`, `driveGoalBoost`, trajectory integrity ×40, schema bonus…) |
| selection | ε-greedy with `liveRng()` (2481–2490, cognitive stream); `choices.sort(b.weight − a.weight)` (V8 stable: ties keep insertion order); `topChoices[0]`; anti-repeat swaps (2713–2725) |
| execution | `reasoning.to` executed at 3641 **without an edge check** |
| learning (before the draw) | `updateQ` 4167/4348, `recordAttempt` 4478, autonomous success/step 4590/4960 — all on the *intended* move |
| goal reset / accounting | goal block 4717; reset 4861; `sealCurrentEpisode("goal_reached")` 4822; no counter in B2/HEAD |
| environment | `_goalResetJustHappened = (next === goal)` 4992 → **no draw, no credit** for a goal entry; one `__M7_ENV__.attempt` draw 5019 for other moves (`env.attempt` returns true without a draw for a non-edge pair); E2 credit 5043; **traversal record 5059**; position changes after |
| RNG | cognitive `seed`; visual `seed ^ 0x9e3779b9`; environment `seed ^ 0x5EED` (unchanged); FutureScore draws none |
| episode / adjacency | `rebuildAdjacencyMemory` 953/1146/5251 → `trajectoryConfidence` (count/5, from episodes only); `computeTrajectoryIntegrity`; schemas 5247 |

## 6. Unchanged vs changed, classified

| item | status | could it alter … |
|---|---|---|
| goal-gradient / FIX 3 block, scoring, Q-learning, trust/credit, episode memory, RNG, M7 env/hooks, persistence | **FACT** identical to B2 (blob/diff) | no change |
| canReachGoal fix unconditional | **FACT** | baseline (candidate pool) — INFERENCE: small; cannot change legality |
| futureBonus: dead (B2) → live graded structural gradient (HEAD) | **FACT** (source + D2 lineage) | **the baseline and the floor's headroom** (see §7) |
| FutureScore reads the session's traversal record (learned `ĉ`) | **FACT** | decisions only; record not persisted; goal entries never recorded |
| in production (no `__M7_ENV__`) every traversal succeeds → `ĉ ≡ 1` → FutureScore = pure graph distance | **INFERENCE** from the code | production-transfer of any M7 result |
| the floor's effect on B2's own non-graph resets; role of the 1-hop shortcut penalties | **UNKNOWN** (carried from GATE-FLOOR-B2) | — |
| `Date.now()` throttles (schema rebuild, context-shift cooldown) that D2 reports as non-reproducible beyond ~780 decisions **outside** the M7 harness | **FACT** (D2 doc) / harness behaviour **UNKNOWN until tested** | measurement validity — tested below |
| B2 ≠ HEAD for anything not listed | none found (blob diff) | — |

## 7. What I measured (read-only; scratch copy of HEAD blobs; floor OFF only; XFER-1 worlds 0–39, outside every study world)

* **Floor line applicability.** The pure `transformMain` of GATE-FLOOR-B2 applied *in memory* to HEAD `main.js`: both anchors
  match exactly once in context (FIX 3 at HEAD line 2123; reset 4861); the goal-gradient region is byte-identical; no file was
  written; production unchanged.
* **Neutrality on HEAD** (3 worlds × {no store, goal-entry store}): bare HEAD tree = HEAD + probe-only tree (bare) =
  measured floor-OFF — identical in run fingerprint (every decision, environment counters, credit keys, Q), cognitive and
  visual draw counts, environment counters and end-state brain hash. Draws into the goal: 0 in every session.
* **Floor-OFF calibration** (40 worlds; same worlds and seeds as the B2 calibration):

| arm | resets | legal | non-graph | attempt success | legal benefit over COLD [95%] | (B2 calibration) |
|---|---|---|---|---|---|---|
| COLD | 431.9 | 303.8 | 128.1 (29.7 %) | 0.656 | — | COLD legal 142.6 |
| REAL | 449.4 | 305.9 | 143.5 (31.9 %) | 0.661 | **+2.1 [−22.7, 27.4]** | +68.6 |
| ENTRY_NR | 480.5 | 364.4 | 116.1 (24.2 %) | 0.671 | **+60.5 [34.2, 87.2]** | +194.4 |

  HEAD − B2 on identical worlds/seeds: COLD legal **+161.3 [130.5, 192.1]**; ENTRY_NR legal +27.4 [3.1, 51.8]. Paired SDs:
  legal 82.0 / 86.0 / 87.3, all-resets 85–104. Stores: mean 192 episodes, none empty, 29.6 % non-graph transitions.

**Reading (INFERENCE; the four commits are confounded, but only FutureScore changes a decision channel on this scale):**
at HEAD the cold agent already reaches the goal far more often; **persisting episodes no longer helps** (the benefit the
whole programme started from is gone at HEAD); the goal-entry store still helps, by about a third of the B2 amount. The
floor's expected headroom at HEAD is therefore of the order of ENTRY_NR's +60.

## 8. Why the old design cannot be reused unchanged (concrete)

1. **Instrument I1 fails by construction.** I1 requires the lower bound of benefit(REAL) ≥ 50; the calibration gives +2.1
   [−22.7, 27.4]. Then C2 is void *by rule* and the replication label can never be REPLICATED (it requires I1 OK), even if
   the floor works perfectly. The instrument the label rests on does not exist at HEAD.
2. **The absolute margins are mis-scaled.** DELTA 25 and MIN_BENEFIT 50 were set at ≈ a quarter and ≈ two quarters of a
   +98…+190 effect. Against +60: DELTA is 41 % of the effect (a floor 25 short would be "non-inferior"), MIN_BENEFIT is
   83 % of it (a real +60 effect has an expected lower bound ≈ 47 at n = 160, so C1 would likely "fail"). I2
   (benefit(ENTRY_NR) lower bound ≥ 50) has the same problem.
3. **Sample size was derived for DELTA 25.** With a rescaled DELTA the requirement changes.

## 9. Proposed limited correction (the *smallest* change that restores interpretability) and questions

**Proposal (everything else unchanged):** same substrate rule (HEAD blobs in a derived copy + the two guarded lines), same
arms, floor value 1, outcome (legal reaches, every reset a declared sensitivity), claims C1/C3/C4/C5, bootstrap, exclusions,
degenerate final-hop reporting, fresh worlds 552 onward, seed governance.
* **(a)** Demote REAL from instrument to a *descriptive contrast*: C2 and I1 stay reported but no longer gate the label;
  REPLICATED = C1 ∧ C3 ∧ C4 ∧ C5 with I2 OK. (At HEAD "restoring persistence" has no benefit to reproduce.)
* **(b)** Rescale the margins by the program's own rule from the *independent calibration of the only live instrument*:
  DELTA = ¼·(+60.5) ≈ **15**, MIN_BENEFIT = 2·DELTA = **30** (below the calibration's lower bound 34.2); MAX_ATTEMPT_DROP
  unchanged (attempt-success spread among arms 0.015).
* **(c)** Recompute n from the largest *legal* paired SD (87.3): n ≥ (2.8·87.3/15)² = 266 → **280 worlds, 70 per goal**.
* **(d)** Add to the gate: determinism (floor ON twice, identical) and the neutrality equality of §7 on the *formal* derived
  tree with the floor line present.
* **(e)** State in every report that the HEAD result is *conditional on FutureScore V2.3 being live*. No FutureScore-attribution
  arm is proposed: it would be a second intervention and the causal question (the goal-entry term's contribution at HEAD)
  does not need it.

**Questions.**
1. Is the HEAD audit complete and are the FACT / INFERENCE / UNKNOWN classes right? What did I miss on the live path?
2. Can the floor be tested on a derived HEAD copy without a production edit and with the same causal question — i.e. is the
   goal-entry term still the intervened quantity when FutureScore also carries a goal gradient?
3. Is demoting REAL (a) and rescaling by (b)–(c) the smallest defensible correction, or is the design **not yet
   interpretable** without a FutureScore-attribution arm (which would be a second intervention I have *not* proposed)?
4. Are the margins derived from a 40-world point estimate (+60.5, interval ±26) defensible, or should MIN_BENEFIT/DELTA be
   fixed from its lower bound or revisited after a larger floor-OFF calibration?
5. Is neutrality evidence (§7 plus (d)) sufficient, given D2's warning about `Date.now()` throttles?
6. Claim limits: HEAD, Phase I, 1,500 calls, the M7 hidden-reliability harness, floor value 1; nothing about production
   (where traversals never fail and FutureScore is a pure distance potential), learning, recall, planning, routing
   capability, general cognition or manufacturing competence. Sufficient?

## 10. Answer format

`VERDICT: UNCHANGED | LIMITED CORRECTION | NOT YET INTERPRETABLE` (plus PASS / PASS WITH CLAIM LIMITS / REVISE for the
proposal), a short answer to each question, then a numbered list of objections labelled **MATERIAL** (changes what I run or
may claim) or **MINOR** with the specific change you would require. Do not propose a different study or a second
intervention value. If a material objection cannot be answered from this package, name the fact you would need.
