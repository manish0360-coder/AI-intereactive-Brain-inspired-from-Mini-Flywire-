# MCF-1 — runtime identity, RNG governance and manipulation fidelity: FALSIFICATION PACKAGE

You are an adversarial scientific/engineering reviewer. Your job is to **try to break** the claims below, not to agree.
Everything here is scratch-only evidence (no official experiment, no registry seed consumed, no agent code changed). Local paths are omitted on purpose.
Do not be deferential: if a claim is wrong, circular, under-powered, or overstated, say so and say what evidence would settle it.

## 0. Setting (5 lines)

- MiniFlyWire is a deterministic graph agent (20 nodes, 39 undirected edges). MCF-0 (scratch) showed one restored episode raises the remembered branch's decision score by +15.2, goal-agnostically.
- MCF-1 asks whether this memory-induced routing shift changes the realized first-attempt success (Y1) of a hidden-reliability two-route task (node 10 → goal 12, routes via node 9 and via node 11; twins T9/T11 swap which route is reliable).
- All runs use a frozen "B2-conformed" agent tree (commit 707cb1e plus a guarded conformance transform) with a read-only measurement sink; one process per run; deterministic.
- Streams: cognitive / visual / environment are mulberry32 segments of ONE 2^32 cycle, derived from the agent seed by XOR constants (typed registry `streamSeeds`).
- Scratch seed domain: agent seeds 1,100,000,000 + k (k < 2,400); config seeds 100000/110000/120000/130000 (below the held-out floor 900500, unconsumed).

## 1. Claims to falsify

### C1 — Runtime: RUNTIME_STATUS = B2_SAFE (scoped), HEAD needs reconformance
Evidence (FACT unless marked):
- Blobs B2 → HEAD differ in runtime files only in `main.js`, `render/planning.js` (modified) and `render/traversalRecord.js` (new). `scoring.js`, `episodeManager.js`, `rng.js`, `env.js`, `run.js`, `arms.js`, `neurons.json`, `connections.json` are blob-identical.
- Conformed `main.js` vs the existing transform applied in memory to HEAD `main.js` (with the three obsolete canReachGoal edits removed): 195 changed lines in exactly six groups: (1) import of traversalRecord; (2) canReachGoal (guarded-in-conformed vs native-in-HEAD); (3) new helpers `projectFutureScore`, `graphDiameter`; (4) the `runPrediction` FutureScore consumer; (5) a write-only traversal-record write after the attempt; (6) a keydown `clear()`.
- canReachGoal, conformed (H1R on) vs HEAD, all 20 nodes × 4 goals: **0/80** differences (raw B2 vs HEAD: 9/80). The conformance transform already contains the repair (CRG-1..3, "exactly the three changes of 0f47d7b").
- The existing transform **refuses** HEAD only because its CRG-1 anchor matches 0 times (HEAD is already fixed). With CRG-1..3 removed (scratch copy, in memory) every other anchor matches.
- The material difference is FutureScore V2.3: B2 used `min(oldFS*4, 20)` (comment in HEAD: saturated every candidate at 20); HEAD uses `P(FS)=20·S/(S−FS)`, S = graph diameter = 4, FS from learned traversal evidence. At the first decision (empty evidence) HEAD gives candidates 9 and 11 FS = −1 → 16.0 each and candidates 6 and 13 FS = −2 → 13.33 each (×1.2 weight in scoring.js). So 9 vs 11 are symmetric under HEAD at call 0 (INFERENCE: B2's old term was equal for them when saturated), but absolute scores and the distractor gap differ, and **HEAD's later decisions read reliability evidence** (B2's do not).
- No RNG or clock use in the new HEAD code (grep).
Claim: for a first-decision study, the memory pathway code (loadBrain/loadEpisodes/adjacency/trajectory integrity/ε/RNG consumption) is unchanged, so B2-conformed is valid and pinned; HEAD would be a different study needing: drop CRG-1..3, new digest, rerun conformance gates, rerun cold census and fidelity pass.
**Attack:** is "B2_SAFE" too generous? Is there any B2-vs-HEAD difference that could change the *qualification frame* or the *flip* in a way my arithmetic missed? Is it legitimate to claim the study is about "MiniFlyWire" at all if HEAD differs?

### C2 — RNG architecture: reuse the registry's own construction; the DOMAIN is new; add a deterministic admissibility predicate
Evidence:
- `typed.js` defines a trajectory seed's governance identity as its derived stream seeds (cognitive `v`, visual `v^0x9e3779b9`, environment `v^0x5EED`, sigma `v^0xBEEF`); non-zero-lag overlap is explicitly NOT detected by the registry ("needs a per-run draw budget, a scientific parameter").
- R3 environment-stream rule (`env_seed.mjs`) refuses any agent seed outside 20260819000–009 and 100–119 (verified refusal at runtime).
- Over ALL 2^32 seeds, exact orientation: with budgets {cognitive 4096, visual 16384, environment 64} cognitive↔visual collides for 4 of 2^20 seed bit-patterns; cognitive↔environment never (0/2048); visual↔environment never (0/131072). With H1-R reserve budgets {cognitive 1e6, visual 65536, environment 4096} cognitive↔visual collides for 284/2^20 patterns and visual↔environment 4/2^17.
- H1-R domain internal collisions under its own reserves: 0 (32 agent seeds incl. reserved Stage-2 and M31; 1,920 R3 environment slots).
- Deterministic greedy admissibility scan (registry `checkUse` AVAILABLE ∧ intra-run disjoint ∧ disjoint from every H1-R/M31 span and R3 slot ∧ disjoint from earlier admitted seeds): from 1,100,000,000, 2,432 raw values scanned → 2,400 admissible, 32 rejected (cognitive 4, visual 3, environment 25, all vs H1-R). From 1,200,000,000 (proposal): 1,006 scanned → 1,000 admissible, 6 rejected. With H1-R reserve budgets 79% of consecutive seeds are rejected (mostly block self-overlap), so long runs need a different budget design.
- Registry negative controls: H1-R pilot 20260819004 and M7 20260819000 and M31 20261819003 → REFUSED (CONSUMED_BY_OTHER_STUDY). **20260819100 and 20260819119 (reserved for the closed Stage 2) → AVAILABLE** (they are unrecorded), so the registry alone would not protect them.
Claim: one clean architecture = typed `trajectorySeed` in a new study namespace + registry `streamSeeds` (no R3, no new formula) + the admissibility predicate with frozen budgets; RNG_STATUS = NEW_DOMAIN_REQUIRED (construction reused, domain new).
**Attack:** is leaving environment-stream derivation to the registry's XOR rule acceptable when the R3 erratum exists for a reason (cross-configuration correlation)? Does MCF-1's single-config design make that moot? Is greedy admissibility a form of seed selection that could bias results?

### C3 — What "f" is (precise), measured at decision-stop with memory present
Design (predeclared before any run): all 114 qualified census seeds (start node 10, call 0 a prediction tick), 11 contents × twins T9/T11 = 2,508 runs, no filtering. Contents: COLD, EMPTY (`episodes: []`), M9 (10→9→12), M11 (10→11→12), WG9 (10→9→8), WG11 (10→11→13→8), WL9/WL11 (same route as M, activeGoal metadata = another goal), SHAM_A9 (9→12), SHAM_A11 (11→12), SHAM_FAR (1→2→3).
Results (scratch, deterministic):
- 2,508/2,508 runs valid: sentinel stop before any attempt, 0 environment draws, learning stores empty, call 0 a prediction tick.
- Restored episodes exactly as intended (0 for COLD/EMPTY, 1 otherwise); `activeGoal` present in the store 0 times; embeddings hash, cognitive/visual draw counts, start node and candidate order identical across contents: 114/114 seeds.
- Dose: ΔF(remembered branch) = 15.2 within 4e-15 in 456/456 runs; off-target ΔF = 0 and Δw = 0 exactly; Δw(target) ≈ 9.187.
- f_score 228/228 per branch; argmax shifts toward the remembered branch 114/114 (lower CP95 0.968); argmax flip when needed: B=9 33/33, B=11 81/81 (pooled 114/114, lower 0.968); argmax AWAY: 0/114.
- Executed route: executed flip when x_C ≠ B: 85/125 pooled (0.68). The 40 non-flips are ALL ε-trigger seeds (executed route identical across COLD, M9 and M11 even though argmax(M9) ≠ argmax(M11)): 29/114 = 25.4% of seeds (code value ε = 0.2; the 2,209-decision census gave 0.209).
- Executed pattern table (x_C, x_M9, x_M11 → seeds): (11,9,11) 21; (9,9,11) 64; (9,9,9) 7; (11,11,11) 11; (13,13,13) 6; (6,6,6) 5.
- Conditional on no ε-trigger the executed route follows the argmax in 85/85 needed flips.
- Y1-relevant quantity: twin-averaged executed shift toward the remembered branch s̄ = mean over seeds of ½Σ_B(1[x_B=B]−1[x_C=B]) = 85/(2·114) = 0.373. Under design reliabilities (0.95 / 0.35, Δp = 0.6) the planning expectation of the twin-averaged benefit contrast is 0.6·0.373 = 0.224 (model-based, not an effect estimate; no outcome was read).
**Attack:** which of these "f" definitions is actually the one that enters Y1, and did I choose the most favourable? Is "ε-trigger = 29/114" a trustworthy ε estimate (n=114)? Is conditioning on the 114 qualified seeds (start node 10) hiding heterogeneity that only appears at other decision points?

### C4 — Controls
- EMPTY, SHAM_A9, SHAM_A11, SHAM_FAR equal COLD exactly (candidate scores, argmax, executed, draws): 228/228 each (114 seeds × 2 twins).
- WG9, WG11, WL9, WL11 equal M9/M11 exactly: 228/228 each. So at the first decision the historical terminus (different goal) and the goal label have NO effect (`loadEpisodes` discards `activeGoal`).
- Memory-present twin equivalence: 114/114 for every content; installed reliabilities verified (T9: 10-9 = 0.95, 10-11 = 0.35; T11 reversed) 114/114.
**Attack:** exact equality at the decision does not prove equality of later behaviour; what would it take to show WRONG-GOAL differs at the second decision? Could "SHAM equals COLD" be an artefact of how the sham was chosen?

### C5 — Statistics
- Twin algebra: with twin counterbalance, cold executed route and both memory-condition executed routes in the observed patterns, d_G + d_B = 0 per seed for every hypothetical (p_rel, p_unrel, u) on a grid: 114/114 seeds. Hence τ_G = −τ_B, τ_R = 2τ_G, and the "three contrasts" are one degree of freedom.
- Multiplicity: the capability claim "benefit AND harm" is a conjunction → intersection-union at α per component, no correction. Fixed-sequence (FDA Oct-2022 guidance: only prospective order + stop at first failure) gives the same decision here; Holm is valid but strictly weaker for a conjunction (power loss shown below). Nesting is NOT required for fixed-sequence FWER control.
- CRN: first environment draw u₁ is draw 1, identical across conditions (verified 48/48 with outcome = 1[u₁<p]); paired-by-seed analysis is valid (Owen §8.6); removing CRN cuts IUT power sharply (table).
- Power by pattern bootstrap (4,000 repetitions; fresh u; design p; one-sided 0.025 per contrast), IUT / Holm-both:
  - empirical patterns: S=8 0.52/0.25 · S=10 0.73/0.49 · S=12 0.86/0.69 · S=15 0.95/0.87 · S=20 0.99/0.98
  - conservative (flip cancelled at 1−lowerCP = 0.032): S=10 0.70 · S=15 0.94 · S=20 0.99
  - stress (flip cancelled w.p. 0.25): S=15 0.79 · S=20 0.94 · S=25 0.98
  - stress (0.50): S=20 0.69 · S=30 0.93 · S=40 0.99
  - reliability gap 0.95/0.45: S=15 0.87 · S=20 0.97
  - CRN removed: S=20 0.26 · S=40 0.67 (benefit-only test: S=20 0.68; interaction-only 0.91)
**Attack:** is the pattern bootstrap legitimate when the 114 patterns include realised ε events? Is α = 0.025 one-sided per component the right level for the conjunction? Is S=15–20 an honest recommendation or an artefact of a degenerate, almost-deterministic system?

## 2. Known weaknesses I already disclose
1. The MCF-0 dry runs (config seed 7,000,000) and a first pass of this probe (config seed 7,100,000; 1,488 runs, archived and discarded) used config seeds ≥ 900500, which the registry predicate classes as held-out territory (never consumed, never recorded; pre-attempt state is config-invariant, 8/8 seeds × 4 configs). Everything reported here used config seeds 100000–130000.
2. All numbers are one frame: goal 12, start node 10, two routes via 9 and 11. Generalization is not claimed.
3. The cold census is 2,400 seeds (114 qualified); the fidelity pass is the same 114 seeds, i.e. development data, not confirmatory.
4. The twin is installed by calling the exported `env.install` from the wrapped sink at call-0 start (before any attempt). It was bit-identical to the unmodified runner on 12/12 cold seeds; the memory-present case relies on the decision-level equality above.
5. HEAD was NOT built or run; the HEAD side of C1 is code reading, in-memory transform application and offline arithmetic.

## 3. What I want back
For each of C1–C5: **SURVIVES / WEAKENED / FALSIFIED**, the strongest counter-argument, the specific check that would settle it, and any claim I made that does not follow from the evidence. Then list up to five things I did not think to test. No agreement language; no summaries of what I said.
