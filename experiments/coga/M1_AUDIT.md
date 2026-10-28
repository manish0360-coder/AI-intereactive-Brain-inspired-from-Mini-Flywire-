# COG-A — M-COGA-1: repository and scientific audit

Date 2026-10-29. Checkout audited: branch `main`, HEAD `412218669e355af0bc42023c68bd4c55908d5ed3`, equal to `origin/main`, no
tracked changes, Node v24.15.0. Zero agent sessions were run for this milestone.

Labels: **FACT** (verified from code, tests, logs or repository state, with location) · **PROPOSAL** (design choice, not yet
implemented or tested) · **ASSUMPTION** (condition a conclusion needs) · **OPEN** · **VERIFIED** (an assumption or proposal that
has since passed a named check).

## 1. Source of truth

| # | item | status |
|---|---|---|
| S1 | HEAD `4122186`, branch `main`, `origin/main` identical (`git ls-remote`), 0 tracked changes | FACT |
| S2 | CREDIT-1 gate re-run on this checkout: see §10 (filled from the actual run, not from the earlier report) | FACT (§10) |
| S3 | `research/external/COG_A_REDIRECT_PROPOSAL.md` exists (untracked). `COGA_DESIGN_REVISION_PLAN.md`, `COGA_DESIGN_ADDENDUM_1.md`, `COGA_PRIMARY_VERIFICATION.md` exist only outside the repository (session scratchpad); their content is carried into this audit where verified and is otherwise treated as PROPOSAL | FACT |
| S4 | No COG-A code, tabular Q-learning or Dyna-Q implementation exists in the repository (search over `*.js`/`*.mjs`: the words occur only in review documents) | FACT |

## 2. Runtime, harness and environment facts COG-A depends on

| # | fact | location |
|---|---|---|
| F1 | 20 nodes, 39 undirected edges (both directions traversable, 78 directed adjacencies); `p` is symmetric per undirected entry | `connections.json`, `neurons.json`; `experiments/m7/env.js:13-20` |
| F2 | M7 hidden reliability: 13 edges with p in [0.25, 0.45], 26 with p in [0.90, 1.00]; a failed attempt leaves the agent in place | `env.js:38-41`, `:485-494`; `main.js:4995-5020` |
| F3 | Phase swap: membership fixed, distributions swapped, so **every edge's p changes** | `env.js:172-182` |
| F4 | World acceptance R1–R5 + G11 evaluated on phase I only | `env.js:209-260` (ERR-07 scope note) |
| F5 | goal = `GOALS[configIndex % 4]`, GOALS = {8,12,16,19}; RUN_TICKS 3000, T_SHIFT 1500, EPISODE_CAP 150 | `env.js:38-44`; `main.js:1055` (`M7_EPISODE_TICK_CAP = 150`) |
| F6 | One loop = 5 `runAgent()` steps; the agent loop reschedules with `setTimeout(runAgentLoop, agentSpeed)` | `main.js:5310-5314` |
| F7 | `__M7_TEL__.step()` is called at the start of every `runAgent()` | `main.js:3249`, `:3255` |
| F8 | The agent reaches the environment only through `globalThis.__M7_ENV__.attempt(from, to)`, at most once per step, skipped when `next === null` or a goal reset just happened; on failure the agent stays and only the tick is consumed | `main.js:4995-5020`, `:5062` |
| F9 | `runOnce` sets `__M7_ENV__` only when `envMode === 'on'`; with `envMode: 'off'` a driver may install its own object and run.js does not touch it | `experiments/m7/run.js:143-150` |
| F10 | Unconditional run.js hooks: `__M7_EPISODE_CAP__ = true` (150-step episode cap) and `__M7_REPLAY_ONCE__ = true` (Branch B replay cooldown) | `run.js:189`, `:206` |
| F11 | Hook state P = `{arm: 'OFF', envMode: 'off', creditMode: 'off', pin: 'off'}` | `experiments/gate-floor-prodsem/config.mjs:38` |
| F12 | Episode start after a goal reset or cap is drawn by the runtime from the cognitive stream | `main.js:3404` |
| F13 | MFW goal reward is internal (`rewardCurrentEpisode(10)`) | `main.js:4825` |
| F14 | The LEARN-0 tree adds four guarded map-oracle lines (`__LEARN0__`) on top of the GATE-FLOOR-INTERACTION guard tree, which adds ADMIT and EXEC lines (`__GFGUARD__`) on top of the PRODSEM derived tree | `experiments/learn0/transform.mjs`; `experiments/gate-floor-interaction/transform.mjs:22-27` |
| F15 | Guard ON semantics (GATE-FLOOR-INTERACTION driver): `admit()` returns false for every non-graph candidate (trained or human-trained); `legalMove(a,b)` is true only for a self no-op or a graph edge | `experiments/gate-floor-interaction/session.mjs:111-115` |
| F16 | LEARN-0 map-off: `goalDistance`→0, `canReachGoal`→true, `graphDiameter`→0, `futureScore`→undefined, with per-session executed/blocked accounting | `learn0/transform.mjs:30-41`; `learn0/session.mjs:132-135`, `:192-195` |
| F17 | Drivers wrap `__M7_ENV__` with an accessor to log attempts without changing them | `learn0/session.mjs:136-138` |

**Consequence (PROPOSAL, justified by F9–F17).** The MFW arm of COG-A can be run with **no new runtime or tree transform**: the
pinned LEARN-0 tree; map off (F16); guard ON (F15: graph-only admission + execution guard, the GATE-FLOOR-INTERACTION bundle);
hook state P (F11) with a COG-A environment object installed as `__M7_ENV__` (F9). "COG-A state" = P + the COG-A environment.

## 3. RNG architecture

| # | finding | status |
|---|---|---|
| R1 | PRNG = mulberry32 (32-bit state, period 2^32), `makeRng(seed)` | FACT `instrumentation/rng.js:17-26` |
| R2 | Named streams: `initRng(seed)` (re)creates `cognitive` (seed), `visual` (seed ^ 0x9e3779b9), `environment` (seed ^ 0x5EED) | FACT `rng.js:32-48` |
| R3 | `liveRng(stream)` falls back to `Math.random()` when the stream is absent | FACT `rng.js:89-92` |
| R4 | `boot()` calls `initRng(seed)` before importing `main.js` | FACT `experiments/phase1_0/_driver.js:22-23`, `:31` |
| R5 | `main.js` imports `./instrumentation/rng.js`; `_driver.js` imports `../../instrumentation/rng.js`; inside one tree both resolve to the same file URL, and an ES module is instantiated once per URL, so harness and runtime share one stream registry | FACT (static: `main.js:5`, `_driver.js:22`); **ASSUMPTION** until the dynamic identity check in M-COGA-4 (drive-letter case and path normalisation on Windows can split URLs) |
| R6 | The only `Math.random` occurrences in `main.js`, `render/*.js`, `instrumentation/*.js` are inside a block comment (`main.js:3410-3418`) and the R3 fallback; no `crypto` randomness | FACT (search) |
| R7 | `Date.now()`: 30 sites in the tree-A census; `new Date` only `instrumentation/sessionRecorder.js:38`; no `performance.now`/`process.hrtime` | FACT `experiments/credit1/verify_credit1.mjs:1199-1213` (G11.10) |
| R8 | Cross-run nondeterminism exists in the current agent through the wall-clock schema-rebuild throttle (`render/schemaMemory.js:133`); the Variant C preload (`experiments/credit1/clock_preload.mjs`) replaces `Date.now` with t0 + 500 ms per fired `runAgentLoop`; its dynamic validation (T-run) never ran | FACT (CREDIT-1 run records; preload source); Variant C status: **ASSUMPTION** pending A6 (§8) |
| R9 | `initRng` is exported, so a driver can re-derive all three streams at a deterministic point without a runtime edit | FACT `rng.js:32`; that the re-seed reaches the runtime's stream depends on R5 |

**RNG contract (PROPOSAL, implemented in M-COGA-3).** Every stream seed = first 32 bits of
`sha256(canonical JSON {study: 'COG-A', version, world, agent, condition, purpose})`; `condition` is `'pre'` for every stream used
before the shift (identical in SWAP and NO-SWAP by construction), `'SWAP'`/`'NOSWAP'` after it; environment streams carry no agent
or condition (shared common random numbers). Uniqueness of all derived seeds in a study is checked (mulberry32 seeds are 32-bit).
The MFW arm re-derives its streams with `initRng` at the first step of the shift, from `(world, 'MFW', condition, 'post')`.

## 4. QB-1 and the structural null (reconstructed from the specification)

**QB-1 (PROPOSAL, to be implemented and unit-tested in M-COGA-3).**
- Tabular `Q[s][a]`, a over the graph neighbours of s, all initialised to 0; one goal per world.
- Each step makes exactly one attempt. Update **in the same step** as the outcome:
  `Q(s,a) += α (r + γ·B − Q(s,a))`, `r = 1` on arrival at the goal, else 0; `B = 0` on arrival at the goal (terminal), otherwise
  `max_b Q(s',b)` with `s' = s` after a slip; reaching the 150-step cap is truncation and bootstraps (`B = max_b Q(s',b)`).
- Policy at s: two fresh uniforms `u1, u2` per decision; if `u1 < ε` choose neighbour `floor(u2·deg)`, else the greedy action with
  ties broken by ascending node id. α, γ, ε constant.
- Nothing else writes Q: no traces, n-step or batched updates, replay, planning, decay, normalisation, adaptive exploration, or
  function approximation. Episode boundaries change only the position.

**Assumptions.**

| id | assumption | how it is enforced |
|---|---|---|
| A1 | an update to (s,a) changes only `Q(s,a)` | QB-1 code; unit test (M-COGA-3) |
| A2 | each attempt updates only the departed pair, within the step, with the outcome drawn under that step's phase | QB-1 code; unit test |
| A3 | no other write to Q | QB-1 code; mutation tests (a trace or decay mutant must break the null fixture) |
| A4 | the choice at s depends only on `Q(s,·)` and fresh draws (no time, step count, reward rate, surprise, arrival counts) | QB-1 code; unit test |
| A5 | the phase is a function of the step index only; SWAP and NO-SWAP histories are identical before `T_shift` | env code; trace identity check I-IDENT (every session pair) |
| A6 | after `T_shift` each condition's agent draws come from its own stream (§3), independent of the other condition's and of the shared environment streams | RNG contract; mulberry32 streams from distinct seeds are treated as independent uniforms (**ASSUMPTION**, standard) |
| A7 | the event is the first attempt from s at step ≥ `T_shift`, s ≠ goal | event extractor; unit test |

**Claim and proof.** For a pair i = (w,s) let `V_c` = 1 if the event occurs in condition c and `Y_c` = 1 if its target is in A₂*(s).
1. A1–A3 and A7: no departure from s happens in `[T_shift, event)`, and every earlier update used outcomes realised before
   `T_shift` (A2, A5); so `Q(s,·)` at the event equals `Q_T(s,·)`, its value at `T_shift`, in both conditions.
2. A4: `Y_c = 1[g(Q_T(s,·), U_c) ∈ A₂*(s)]`, where `U_c` are the two fresh draws used at the event.
3. The draw index at the event is a stopping time of the condition's own post-shift stream; `V_c` is fixed before `U_c` is drawn,
   and `V_{c'}` depends only on the other condition's stream and the shared environment streams (A6). Hence `U_c` is uniform and
   independent of `(V_S, V_N, H)`, where H is the pre-shift history.
4. `E[V_S V_N Y_S | H] = E[V_S V_N | H]·P(g(Q_T(s,·),U) ∈ A₂*) = E[V_S V_N Y_N | H]`, so `E[V_S V_N (Y_S − Y_N) | H] = 0`.
5. Summing over pairs: `E[T] = 0` where `T = Σ_i V_S V_N (Y_S − Y_N)`; the **estimand** `θ_Q = E[T] / E[|AA|] = 0` exactly.

**What the proof does not give.** The plug-in estimator `θ̂ = Σ_w T_w / Σ_w |AA_w|` is a ratio of two random sums; later inclusions
in `AA` depend on earlier choices, so `E[θ̂]` need not be exactly 0. It is consistent as the number of worlds grows, with O(1/W)
finite-sample bias. Type I error and coverage at the null are therefore established by simulation (M-COGA-4), not assumed.

**Variants (FACT from their update rules).**

| variant | null | reason |
|---|---|---|
| QB-1 | holds (estimand), under A1–A7 | above |
| Q(λ), any trace type | fails | a state departed before `T_shift` in the episode running at `T_shift` keeps a non-zero trace and receives post-shift TD errors before its first post-shift departure (without trace reset at episode boundaries: every pre-shift-departed state) |
| n-step, Monte Carlo, batched | fails | updates for pre-shift departures within the look-ahead include post-shift rewards |
| replay, Dyna-Q | fails by design | stored transitions from s are re-backed-up with updated successor values (this is the positive-control signal) |
| ε or temperature tied to time, reward rate or arrival counts | fails | the policy at the event depends on condition-dependent quantities |
| global decay or normalisation of Q | fails in general | `Q(s,·)` changes with elapsed time |
| one stream shared by both conditions after the shift | not exact | coupling: one condition's trajectory can consume the draw the other uses at its event |

The earlier Addendum 1 statement that the null covers Q(λ) is **withdrawn**.

## 5. Estimand

Candidate primary (unchanged): `θ = E[Σ_{(w,s)∈AA} (Y_SWAP − Y_NOSWAP)] / E[|AA|]`, AA = eligible distal pairs encountered in both
conditions. Estimator `θ̂ = Σ_w Σ_{AA_w} d / Σ_w |AA_w|`; uncertainty by a goal-stratified cluster bootstrap over worlds (all
sessions of a world resampled together); worlds with `|AA_w| = 0` stay in the resampling and contribute 0 to both sums.

Three questions kept apart:
1. **θ** — the effect within the observed paired-support stratum AA.
2. **Route and visitation** — the A0/0A/00 counts and the SWAP − NO-SWAP difference in encounter rates (M1, descriptive).
3. **Adaptation over all distal states** — not identified by θ; addressed only by bounds (M2) and the composite (M5).

**M1–M6 (PROPOSAL; exact formulas frozen in M-COGA-2).**
- **M1** counts of AA, A0, 0A, 00 per agent, condition, goal; AA share = `|AA| / (|AA|+|A0|+|0A|)`.
- **M2** worst-case (Manski) bounds on the encountered-population analogue `θ_E` over `E = AA ∪ A0 ∪ 0A`, with the unobserved
  first-opportunity choice set to 0 or 1: lower = `(Σ_AA d + Σ_A0 (Y_S − 1) − Σ_0A Y_N) / |E|`, upper =
  `(Σ_AA d + Σ_A0 Y_S + Σ_0A (1 − Y_N)) / |E|`; width `(|A0| + |0A|)/|E|`. The counterfactual "first-opportunity choice" for a pair
  never encountered in a condition is a modelling concept, stated as such.
- **M3** θ by time-since-shift bins of the SWAP event, and on the time-matched subset `|t_S − t_N| ≤ W_t`.
- **M4** world-weighted `θ̂_w = mean over worlds with |AA_w| > 0 of (Σ_AA_w d / |AA_w|)` against event-weighted `θ̂`.
- **M5** composite `Z = V·Y` over all distal pairs, SWAP − NO-SWAP (secondary; mixes route choice and choice).
- **M6** interpretability: θ is NOT EVALUABLE if the AA share is below `q_min`.

## 6. Distal construction (audit of the scratchpad proposal)

| # | issue | resolution | status |
|---|---|---|---|
| D-a | `expectedCostToGoal` (Dijkstra on the full graph, `env.js:325-340`) lets a "continuation" route back through s and so mixes s's own edges into the continuation | compute every continuation on G∖{s}; then `Q(s,a) = L(s,a) + K(a)` with L from Inc(s) only and K from edges not incident to s; the four cases are recombinations (L₁+K₁, L₂+K₂, L₂+K₁, L₁+K₂) | **VERIFIED**: `experiments/coga/distal.mjs`; test T1 (9,144 continuation values equal exhaustive simple-path enumeration, real graph, every goal and removed node, both objectives) |
| D-b | cut vertices: a neighbour may have no path to the goal avoiding s | `K(a) = ∞`, the action is excluded at s | **VERIFIED** (T6) |
| D-c | goal handling | `K(goal) = 0`; the goal itself is never a decision state | **VERIFIED** (T7, T8) |
| D-d | objective mismatch: env reference = expected attempts (ERR-04), Q/Dyna optimise γ-discounted reward. **New finding:** a relative tolerance on discounted *values* is not comparable with one on attempts (values sit near 1, so a 5% value gap is a large cost gap) | write the discounted objective as a **cost**, `c = log V / log γ` (certainty-equivalent steps): edge cost `log g(p) / log γ`, `g(p) = pγ/(1−(1−p)γ)`; a certain edge costs exactly 1 and the cost tends to 1/p as γ → 1. Both objectives are then min-sum shortest paths with one tolerance κ; a state is distal only if D2–D4 hold under both | **VERIFIED** (T8 unit cost; T9 shows the objectives can disagree, so robustness under both is not vacuous); γ is fixed a priori |
| D-e | exact ties | probability zero with continuous p; near-ties excluded by disjoint near-optimal sets (D2) | **VERIFIED** (T11: 0 exact ties in 304 state-phase decisions on worlds 0-7) |
| D-f | 150-step cap | treated as negligible if the expected cost from every state is far below 150 in both phases | ASSUMPTION; static check in the census |
| D-g | the argmin on G∖{s} equals `reliabilityOptimalPolicy`'s choice (an optimal path never revisits s) | cross-check | **VERIFIED** on worlds 0-7 (T11: 304/304 agree); repeated over every census world |
| D-i | κ-stability over [κ/2, 2κ] decided by endpoints | each of D2, D3, D4 and the union disjointness is monotone in κ, so the DISTAL set of tolerances is an interval | **VERIFIED** (T10: 1,520 state-objective pairs on random swap worlds, all intervals) |
| D-h | existence: every edge changes, local changes may explain most switches | the static census decides; if distal states are too rare, stop before sessions | OPEN |
| D-j | hand-built classes behave as defined | DISTAL, LOCAL, INTERACTION, STABLE examples | **VERIFIED** (T2–T5) |

## 7. Seeds and territory

| # | fact | location |
|---|---|---|
| T1 | World i of the accepted-configuration stream = i-th accepted configuration from seed 200,000 with `configIndex = i` | `experiments/xfer1/config.mjs:7`, `planWorlds` |
| T2 | Stream indices 0–1391 earlier studies, 1392–1671 C′ reserved, 1672–2031 LEARN-0 L; 0–29 used as development worlds by XFER-1, LEARN-0 and CREDIT-1 | `learn0/config.mjs:56-69` |
| T3 | CREDIT-1 reserved its confirmatory block from index 2032 (n = 1,208 at the last calibration: 2032–3239; not frozen; study paused) | `credit1/DESIGN.md` §6.8 |
| T4 | The typed registry marks config seeds 886000–900499 consumed (H1-R, Study 2, C1, M9–M17, UQ-A/B, Q1, M8, M7) and ≥ 900500 held-out; **nothing on the 200,000 stream** | `experiments/registry/consumed_after_h1r.js` (probe of `typed_v2.config`) |
| T5 | 11 session drivers refuse any config seed the registry marks consumed | e.g. `credit1/session.mjs:86`, `learn0/session.mjs:51` |

PROPOSAL: COG-A does **not** modify the registry (marking the 200,000 stream would break reproduction under T5). COG-A records its
territory in its own frozen configuration and proves disjointness against T2–T4 by an explicit collision check over the generated
config seeds. Development: indices 0–29 (development reuse only). Confirmatory: from index 3240.

## 8. Clock

Variant C stays provisional. COG-A needs determinism for I-IDENT (identical SWAP/NO-SWAP histories before the shift). Plan:
static classification of the 30 `Date.now` sites (decision / cadence / content / instrumentation / dead) in M-COGA-2, and the
dynamic A6 check (t0a vs t0b, low vs high load: identical decision traces) on development sessions in M-COGA-4.

## 9. Parameters still open

δ, γ, κ, K_dist, q_min (and W_t for M3). γ, κ, K_dist are fixed from static structure or a priori before any confirmatory
eligibility is computed; δ and q_min need a substantive rationale (M-COGA-2 sets out the alternatives and their consequences).

## 10. Verification run for this milestone

| command | result |
|---|---|
| `node experiments/credit1/verify_credit1.mjs` on HEAD `4122186`, before any COG-A file was committed | `CREDIT-1 gate: 115/115 checks passed; mutants caught 299/299; agent sessions run: 0` / `GATE PASSED` (exit 0) — **VERIFIED** |
| `node experiments/coga/test_distal.mjs` | `COG-A distal tests: 11/11 passed` (exit 0) |

**Scope note on the CREDIT-1 gate.** Its check G0.2 requires every tracked change since its base `dd5b3ec` to lie inside
`experiments/credit1/` or `research/external/CREDIT1_*`. Once COG-A files are committed, G0.2 will report them by design; that is
a scope check of the CREDIT-1 milestone, not a change to CREDIT-1. The historical CREDIT-1 result is fixed at `4122186` (above,
and re-runnable from a worktree at that commit). The COG-A gate carries its own, stricter integrity check: every CREDIT-1,
LEARN-0, M7, registry and runtime file byte-identical to `4122186`.

## 11. Files of this milestone

- `experiments/coga/M1_AUDIT.md` (this file)
- `experiments/coga/distal.mjs` — pure distal-state classification (both objectives as costs, G∖{s} continuations, κ-stability)
- `experiments/coga/test_distal.mjs` — independent mathematical tests (exhaustive enumeration, hand-built classes, monotonicity,
  agreement with `env.js`)
- `experiments/coga/README.md` — running record
