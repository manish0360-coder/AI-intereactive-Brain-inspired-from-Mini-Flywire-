# H1-R — M7 conformance instrument

H1-R tests the **M7 design as frozen**: [`M7_PREREGISTRATION.md`](../../research/cognitive-audit/M7_PREREGISTRATION.md), SHA-256 `2f12e309…f6b9`, plus errata 01–10.

**Frozen H1-R protocol:** [`H1R_PREREGISTRATION_v1.0.md`](../../research/preregistrations/H1R_PREREGISTRATION_v1.0.md) (frozen 2026-10-04; bound to `e8e904a`).

The M7 instrument build is **B2 = `707cb1e`**. The B2 characterization of 2026-10-04 showed that B2 departs from the frozen text in several ways. This directory makes the runtime conform **without editing any production file**:

1. `build_tree.mjs` materialises the B2 blobs. It uses `git cat-file`, so there is no checkout and no line-ending conversion, and it checks every blob id.
2. It applies `conformance_transform.mjs` to exactly six files (`main.js`, `render/qlearning.js`, `render/episodeManager.js`, `instrumentation/rng.js`, and, for the MS-1 measurement instrument, `render/scoring.js` and `render/behavior.js`).
3. It writes the result, with `MANIFEST.json`, under `os.tmpdir()/mfw-h1r/`.

## Conformance edits

All edits are guarded by `globalThis.__H1R__ && globalThis.__H1R__.on`. With no runtime attached, the tree is bit-identical in behaviour to B2 (gate G1′).

| Tag | Frozen authority | Invariant enforced |
|---|---|---|
| N1-MASK, N1-MASK-SEM | §3.1, §3.3 | A candidate that is not a graph neighbour of the current node is never admitted, in both candidate paths that can produce one (the memory/neighbour loop, and the semantic loop used when no goal is set). The third path (`structureMap`) is neighbours by construction. |
| N1-GUARD | §3.1, §3.3 | An executed move is a graph edge, or the existing no-op self re-execution. Backup only; it is expected never to fire. |
| N1-SEAL | §3.1, §6.1 | A consecutive episode pair that is not a graph edge is not an episode transition. So it never reaches `transitions`, Q, `rewards`, momentum, replay or trust credit. |
| N2 | §6.1 | Under M7 credit (`__M7_CREDIT__`, always on in H1-R), a trust success is recorded **iff that traversal succeeded**. The episode-level success writer (`_updateTrust`, M7-LN-01) is suppressed. This guarantees `successes ≤ attempts`. |
| A3 | §4 RANDOM | At every committed decision, the executed action is uniform over the current node's graph neighbours, drawn from the **cognitive** stream (one draw). The environment and visual streams are untouched (§5.3, G2). Every other draw of the tick is unchanged. |
| A4-Q | §4 FROZEN | No Q-table write: the `updateQ` choke point (main path, episode learning, replay) plus Q decay. `dampQ` is already pinned off in every M7 arm (§10.2). |
| A4-T | §4 FROZEN | No trust-store write: E2 traversal credit plus trust decay. The policy still reads Q and trust. |
| GOAL | §3.4, G15′ | Every goal reach pays the existing +12. The legacy eligibility operand (`episodeUnique ≥ 3`) can no longer be false. |
| P4 | §3.7 | At both episode-reset sites (goal, 150-tick cap), the pre-reset `lastReasoning` is cleared. A post-reset tick with no fresh decision commits no action. |
| CRG | HEAD `0f47d7b` (Director-authorised correctness fix) | `canReachGoal` releases a node on every DFS exit path (backtracking). These are exactly the three `visited.delete(currentId)` lines of `0f47d7b`, whose base blob `113fa47` is B2's `main.js`. There are no decision traps left; without this, N1 made state 3 / goal 16 undecidable. |
| R1 | §3.3, §3.4; Director ruling R1 (2026-10-04) | **Realised-outcome learning order:** decision → one environment draw → realised outcome → the existing learning rules. B2 ran its whole self-learning section (reward, emotion, prediction error, Q, curiosity, transitions, success episodes, goal reset, explore step) *before* the draw, on the intended move, while `agentLast` still held the previous tick's position. The section is written in post-move terms (`prev = agentLast // where we were before`, `current = next // where we moved now`; Q state `agentLast`, action `next`, next state `agentCurrent`). Under H1R it reads the realised transition, in four steps. **R1-DRAW-EARLY:** the decision's single `__M7_ENV__.attempt(u, v)` call moves ahead of the section, with the same arguments, exclusions and stream. **R1-VIEW:** `agentLast` is set to u. On a success `agentCurrent` is set to v; on a slip the realised node is u (`next` is set to u). **R1-RESTORE:** after the section the pre-move view is restored, so the E1′ traversal block performs the move and E2 credits the *intended* edge. **R1-DRAW:** the E1 site reuses the outcome instead of drawing again. B2's own `updateQ`, `recordAutonomousStep` and `recordAutonomousSuccess` calls then receive the realised transition unchanged. Reward constants, the Q equation and all parameters are unchanged. |
| R2 (D-1) | §3.3, §6.1; Director ruling R2 (2026-10-04) | **Goal-entry reliability draw.** Goal-entering attempts use the same environment draw as every other edge. **R2-GOAL-DRAW:** the single early draw no longer excludes them (B2 never drew for them). **R2-GOAL-FLAG:** under H1R, `_goalResetJustHappened` means "the goal reset ran this tick", read from the runtime's reset counter rather than inferred from the intended node, so a slipped goal attempt follows the ordinary slip path. **R2-GOAL-CREDIT:** a realised goal entry is credited a += 1 and s += 1, like any traversal (§6.1), using the decision position R1 recorded, because the reset has already moved the agent. |
| M (D-5) | §8.5 primary endpoint | **Measurement probes, observational only.** They are guarded by `globalThis.__H1R_MEASURE__`, not by the H1R switch. **M-STEP** counts one tick per `runAgent()` call. **M-REWARD** passes the final `rewardSignal` to `measure.mjs` immediately before its first consumer. Neither draws, assigns, nor branches the agent. |
| MS-1 | v1.0 §8, §9 items 1–7; D-019 (as amended by D-022), D-020; Director authorisation MS-1 (2026-10-05) | **Measurement instrument, observational only.**<br>**Probes** are guarded by `globalThis.__H1R_MEASURE__`. Each is one call-only statement that reads locals:<br>• **M-SCORE** is the single H1R-S6 line in `render/scoring.js`, immediately before the clamp-return: `score(finalWeight, trustBonus * 1.5)`. Removing it gives B2's file byte for byte (G16′).<br>• **M-CANDIDATE** follows each candidate-loop push. It records the returned score, the blended weight, and the arbitration inputs the shadow needs.<br>• **M-BEST** records `bestChoice` of each step's weight sort.<br>• **M-DECISION** records the step-0 selection write.<br>• **M-REPLAY** records the replay branch, next to the E6 flag.<br>• **M-FLOOR** records each A5 aggregate-floor raise in `updateBehavior`.<br>**Runtime hooks** are guarded by the H1R switch:<br>• **M-LOOP** is the first statement of `runAgentLoop`. The runtime takes the τ = 1499 trust snapshot there, at the entry with 1,505 completed calls.<br>• **M-FORK** is the first statement of `runAgent`. It applies an armed fork switch immediately before its call, and is inert otherwise. |
| R3-ENV-SEED | §5.1, superseded for H1-R by [erratum R3](../../research/preregistrations/H1R_ERRATUM_R3_ENVIRONMENT_SEED.md); Director ruling R3 (2026-10-04) | **Configuration-scoped environment stream.** In `instrumentation/rng.js` `initRng`, when the runtime carries a design position (agent seed, block, accepted configuration index), the `environment` stream is seeded with `env_seed.mjs`'s derivation instead of `agentSeed XOR 0x5EED`. The derivation is `(0x60800000 + slot·4096·0x6d2b79f5) mod 2³²` with `slot = (agentSeed − 20260819000)·64 + blockCode·32 + index`: one disjoint 4096-draw segment per position, with no arm term. The B2 expression stays verbatim as the fall-back branch. The cognitive and visual registrations are untouched. The runtime refuses an `initRng` seed other than the position's agent seed. |

**What learning receives (existing rules on the realised transition):**
- **Success u → v:** the full section runs on u → v. This includes the reward (`sim(u, v)`), PE (actual = v), Q(u, v) with S′ = v, and every store keyed u → v. Return moves are included.
- **Slip:** the realised transition is u → u. The section's own entry guard ("prevents corrupt self-loop learning") excludes self-transitions, so there is no reward, no PE and no Q update: the slip costs only the elapsed tick (§3.4; ERR-05 E1′). The intended edge u → v receives the trust attempt and no success (§3.3, §6.1).
- **Goal entry (since R2):** draws like every other edge.
  - On success it is realised: it learns as a success with the flat +12 and S′ = goal, the existing reset runs, and the edge is credited a += 1, s += 1.
  - On a slip it is an ordinary slip: no reset, no reward, no learning, and the attempt is credited a += 1.

## Measurement and the experiment driver (D-5, MS-1)

- **`measure.mjs`** (`createMeasure()`) is the measurement sink. It reads no global and imports only `node:crypto`. Its `score` is the pinned function `score(f, t) { S.push(f, t); }` (D-019 §5 N5′), and `S` is read only by `record()`. It records:
  - one reward event, `[callIndex, rewardSignal]`, per `runAgent()` call that computed a `rewardSignal`. Under R1 that is exactly the realised moves and goal entries;
  - per-tick decision and replay flags (no-commit = neither);
  - per-attempt records;
  - goal and cap resets;
  - both trust snapshots;
  - A5 floor raises;
  - the pre-clamp score pair (F, t) of every scoring call, and the candidate records;
  - the fork switch.

  τ = call index − 5 (v1.0 §6).
- **`measure_install.mjs`** binds the sink as `globalThis.__H1R_MEASURE__`: an own, non-writable, non-configurable data property holding the frozen object. `installMeasure()` refuses to return unless the N5′ installation checks pass: descriptors, frozen, not a Proxy, pinned `score` source and function identity. `verifySinkSource()` is the static N5′ check.
- **`shadow.mjs`** joins each score pair with its candidate record and recomputes argmax₁ (D-020 pin 1). It computes the pre-clamp shadow weight of v1.0 §8: T replaced by 0.5 in F and in `arbitrate`'s confidence score, the clamp re-applied, and the 60/40 blend as in `main.js`. It also counts the N6b clamp-consistency failures, non-finite F, and calls on which the ±400 clamp binds. It is pure, apart from calling the run tree's pure `arbitrate`.
- **`runtime.mjs`**, through `attachMeasure(M)`, forwards to the sink:
  - one per-attempt record per environment draw: edge, outcome, goal-entering flag, and the raw trust-store attempts and successes of the key just before the attempt;
  - every reset;
  - the snapshots. The τ = 1499 snapshot is taken at `runAgentLoop` entry 301, which is run.js loop l = 300 after `pressSpace`'s entry, with 1,505 calls complete. The final snapshot is taken after `runOnce`. Each entry is `[key, a, s, raw attempts within the phase]`.

  `armFork({ call })` arms the fork switch. Immediately before that `runAgent()` call, the frozen `arms.configure()` switches the arm to A2. A1 and A2 differ only in the E3 and E4 deliveries (gate FORK-E).
- **`run_h1r.mjs`** is the experiment driver, one run per process. It:
  - requires `block` (`'pilot'` or `'heldout'`). With the agent seed and `configIndex` (the ERR-07 accepted index), this is the run's design position. It refuses a position outside the verified domain (`env_seed.mjs`);
  - builds or reuses the conformed tree;
  - attaches the runtime (`trustMode: 'traversal'`, plus the design position) and the measurement (N5′ checked at installation);
  - in fork mode (`"fork": { "call": t + 5 | null, "to": "A2" }`, arm A1 only), arms the switch (v1.0 §8 link ④);
  - runs the unchanged `experiments/m7/run.js` with the frozen settings;
  - writes a record containing:
    - provenance: the B2 commit, the transform, runtime, measure, measure-install, shadow, env-seed and driver hashes, the environment stream actually registered, and the fork;
    - the 11 validity conditions (v1.0 §10). `measurementClean` is exactly D-020 pin 3: reward record, per-tick, per-attempt, resets, score/shadow, snapshots, floor and fork. The R3 conditions are `envStreamScoped`, `envDrawsWithinReserve`, `cognitiveDrawsWithinReserve`, `visualDrawsWithinReserve` and `envSegmentDisjointFromConfig`;
    - instrument integrity: sink binding at the end of the run, N6b, argmax, reconstruction, snapshot placement, the non-finite F count and the clamp-binding count;
    - the measurement records: reward events, per-tick flags, attempts, resets, snapshots, floor calls, decisions, and the step-0 candidate groups with (F, t). With `digestOnly`, they are replaced by counts and SHA-256 digests (`prefixAt` adds digests of the calls before given calls).

  The driver never aggregates rewards into returns, windows or comparisons, and computes no flip, calibration or advantage statistic. Those belong to `analyze.js`, which is not part of MS-1.
- **`env_seed.mjs`** (R3) holds the frozen derivation, its verified domain and the exact overlap arithmetic. It is pure arithmetic and draws nothing.

R1 supersedes the sentence of ERR-05 §3.1 stating that Q-learning, prediction error and reward run "unchanged on both outcomes". It also retires the earlier Q-KEY stash/apply edits, because B2's original calls are correct once they run in the realised view.

**N2 invariant, exactly:** for every traversal attempt of a real edge, `attempts += 1`, and `successes += 1` iff that traversal succeeded. No other writer touches the store under M7 credit, so one physical outcome yields at most one success. The gates check `successes ≤ attempts` at every 100-tick snapshot, and check that the store equals the counts reconstructed from the executed moves (decay mirrored).

`runtime.mjs` supplies `__H1R__`. Arm semantics come only from the frozen predicates in `experiments/m7/arms.js`, and adjacency from the tree's `connections.json`. `trustMode: 'attemptGated'` exists **for diagnosis only**; see `verify_conformance.mjs` gate B-DIAG.

## Analysis and orchestration (v1.0 §9 items 8–9; D-023 … D-026)

- **`analyze.js`** is the analysis instrument (§12–§15 and every §8 metric), with the Director's rulings D-024, D-025 and D-026 listed in its `RULINGS` and its implementation readings in `INFERENCES`. Its SHA-256 is Stage-1-binding (v1.0 §1.2). `node experiments/h1r/analyze.js <fixtureDir> <out.json>` analyses fixture files; the orchestrator calls the same functions directly.
- **`orchestrate.mjs`** runs the pipeline PLAN → registry pre-check → SCHEDULE → EXECUTE → RECORD / NO-RECORD → structural validation → identity/provenance validation → validity classification → pair construction → study input → `analyze.js`. It computes no metric. A stage runs only with `H1R_STAGE_AUTHORISED=<stage>` and a registry that records H1-R's use; `node experiments/h1r/orchestrate.mjs precheck <stage>` reports the read-only pre-check and `identity` the instrument hashes.
- **Rulings it applies (D-026):** a base run whose process leaves no record is a crash and is never re-run; a fork is valid iff all 11 flags are true, with one pre-registered retry; raw records live in the git-ignored `data/` (SHA-256 of the uncompressed bytes, repository-relative manifest paths); derived artifacts go to `stage_records/`.

## Registry, build identity and CLI gate (Milestone B; D-027)

- **Registry (v1.0 §7.6, first two actions).** `experiments/registry/consumed_after_h1r.js` records the H1-R pilot configuration block 886000–889999 (`H1R_BLOCKS`, use `pilot`; nothing evaluated yet). `typed.js` delegates to it and records (H1-R, pilot, not executed) for the pilot agent seeds 20260819004–008. Nothing at or above the held-out floor is recorded. The confirmatory seeds and the held-out stream are recorded only before Stage 2, once S* is fixed. `node experiments/h1r/orchestrate.mjs precheck stage1` is now executable as far as the registry is concerned; a stage still needs the Director's `H1R_STAGE_AUTHORISED=<stage>`. `precheck stage2` still refuses.
- **Build identity (v1.0 §1.2).** `BUILD_IDENTITY.json` records, before any Stage-1 run:
  - the SHA-256 and git blob id of the pre-registration, the analysis instrument, the orchestrator, the instrument files, the registry and the verifiers;
  - the `instrumentIdentity` object that the orchestrator stamps into every plan, manifest and run record.

  `build_identity.mjs` derives it from git blobs only, so it holds no clock and no host path. Its binding commit is the commit that last writes it, whose parent is `baseCommit`. `node experiments/h1r/build_identity.mjs --check` re-derives it from HEAD.
- **Which tree the build identity describes (D-030).** One record, `BUILD_IDENTITY.json`, describes the current pre-Stage-1 tree: schema `h1r.build-identity/2`, `baseCommit` `1919b04` (D-029), and the verifier group also lists `verify_o23.mjs` and `verify_readiness.mjs`.
  - It supersedes the record Milestone B added at `6fc5a9e` (SHA-256 `9647827a…`, schema `/1`), which `supersedes` names. D-029 had changed one verifier that record listed, so it stopped equalling a derivation from HEAD. D-030 re-derived it.
  - The `instrumentIdentity` is identical in both records. Every protocol, analysis, orchestrator, instrument and registry entry is identical.
  - `derive()` still defaults to the Milestone-B profile, which reproduces the superseded record byte for byte; `--write`, `--check` and `checkAt()` use the current profile. `verify_readiness.mjs` checks both.
- **Line endings.** `orchestrate.mjs` and the 7 instrument files are hashed from working-tree bytes at run time, so they are `-text`, like `analyze.js`. `fresh_clone_check.mjs` clones the repository with `core.autocrlf=true` and checks that every `-text` file keeps its committed bytes.
- **CLI gate.** `verify_cli.mjs` (C1–C15) drives `orchestrate.mjs` as a child process:
  - **In the repository:** only the read-only commands run there (`identity`, `precheck`, usage errors, unauthorised stage commands).
  - **In sandboxes:** authorised stage commands run only in throwaway sandboxes under the temporary directory, on test doubles (`cli_gate/`). No agent runs there, no M7 configuration is generated, and every record is invalid by construction.
- **Historical gates.** `evidence_milestone_b/historical_gate_sweep.json` records every registry-related historical gate before and after the milestone. `verify_milestone_b.mjs` names each changed verdict and its reason. Of 38 gates, two change:
  - `verify_study2_execution.js` R1, R4 and H5. 889999, the Study-2 block's neighbour, is now the last H1-R pilot seed; the chain gained a link; M34's error now names the new link.
  - `pilot_registry_status.mjs`, the v1.0 B.3 query. The pilot block is now consumed and 004–008 are recorded for H1-R.
- **N3 and D-028.** N3 compares `verify_determinism.js` C1 on its ID, position, verdict and exit code, but not on its count of distinct fingerprints. That count comes from 8 concurrent runs with the determinism repair suppressed, so it depends on the wall clock, and nothing else reads it.
  - The rest of the line, D4 and every other assertion stay as before.
  - `verify_d028.mjs` derives 12 cases from the existing §11 evidence and checks 11 over-broad versions of the exemption against them.
- **O23 of `verify_orchestrator.mjs`.**
  - **At Milestone B (`6fc5a9e`):** O23 still asserted the pre-Milestone-B registry, so it failed by design: its in-memory registry duplicated the committed 004–008 records and threw. It also held a CLI probe with `H1R_STAGE_AUTHORISED=stage1` that relied on the registry refusing; with this registry that probe would have started Stage 1, and only the throw kept it unreachable.
  - **D-029 replaced it.** O23 is now `o23RegistryIntegrity`: read-only and in process, it starts no process and checks the post-registration registry (Stage 1 and the extension executable, Stage 2 not, 004–008 recorded unexecuted).
  - **`verify_o23.mjs`** proves that it cannot start Stage 1 even when the pre-check succeeds:
    - a static scan;
    - a child-process trap with member guards and registry doubles;
    - 7 mutants, including the old probe restored.
  - **Milestone B's own gate**, `verify_milestone_b.mjs`, is bound to `6fc5a9e`, where it passed 36/36. At D-029 its since-base checks S1 and S2, and its check H-P of O23's old source, no longer held (33/36).
  - **`build_identity.mjs --check`** reported one difference at D-029: the record listed `6fc5a9e`'s `verify_orchestrator.mjs`. **D-030** re-derived and re-bound the record, so `--check` now exits 0.
  - **Milestone B's gate after D-030** is 30/36. B1, B3 and A3 also no longer hold, because they bind to the record as `6fc5a9e` added it, and that record is now superseded. The gate file is unchanged, and its other 30 checks pass. See D-030 §4.

```bash
node experiments/h1r/verify_milestone_b.mjs
```

```bash
node experiments/h1r/verify_cli.mjs
```

```bash
node experiments/h1r/verify_d028.mjs
```

```bash
node experiments/h1r/verify_o23.mjs
```

```bash
node experiments/h1r/build_identity.mjs --check
```

```bash
node experiments/h1r/verify_readiness.mjs
```

```bash
node experiments/h1r/fresh_clone_check.mjs
```

## Verification

```bash
node experiments/h1r/verify_analysis.mjs
```

```bash
node experiments/h1r/verify_orchestrator.mjs
```

```bash
node experiments/h1r/verify_conformance.mjs
```

```bash
node experiments/h1r/run_existing_gates.mjs
```

```bash
node experiments/h1r/verify_existing_equivalence.mjs
```

```bash
node experiments/h1r/verify_ms1_unit.mjs
```

- **What each script checks:**
  - `verify_existing_equivalence.mjs` reads the output of `run_existing_gates.mjs`. It checks OFF ≡ pristine assertion by assertion (N3; G16.4a2–a6 classified under H1R-S6), that the ON failures are exactly the classified set, and that S4 and G9 are clean.
  - `verify_ms1_unit.mjs` holds the unit gates N1, N2, N4a, N5′, N6a, N6b-U and N7a–h. The N6a oracle, a test-only B2 `scoring.js` returning `finalWeight`, is written under `<tmp>/mfw-h1r/n6a-oracle-*`, hash-recorded, and never loaded by a run.
- **Material:** only the historical G15 configurations (900030–900499, accepted per the unchanged predicate) with agent seed 20260819000. No new seed is generated.
- **R3 positions:** the 41 configurations form no design block, so each gets its own position on agent seed 20260819000 that no design run can occupy:
  - configuration *p* < 32 takes held-out index *p*;
  - configuration *p* ≥ 32 takes pilot index *p* − 22, i.e. 10–18.
- **Blinding:** only gate and mechanism quantities are reported. No per-arm outcome metric is computed.
- **Evidence:** both scripts write to `experiments/h1r/$H1R_EVIDENCE` (default `evidence/`). `H1R_EVAL_ONLY=1` re-evaluates the gates on a directory's saved `runs.json` without executing any run.

| Directory | Contents |
|---|---|
| `evidence_readiness/` | D-030: the Stage-1 readiness gate (`readiness.json`), and on the same code the O23 safety gate (`o23_gates.json`), the orchestrator battery (`orchestrator/`), the freeze check, the fresh-clone check and the Milestone B gate at this commit |
| `evidence_o23/` | D-029: the O23 safety gate (`o23_gates.json`), the orchestrator battery with the new O23 (`orchestrator/`), the Milestone B gate at this commit, the fresh-clone check and the freeze check |
| `evidence_milestone_b/` | Milestone B: the historical-gate sweep, the fresh-clone check, the CLI gate (C1–C15), the §11 battery (`section11/`), the analysis and orchestrator batteries (`analysis/`, `orchestrator/`), the D-028 gate (`d028_gates.json`), the closure re-runs (`closure/`) and the Milestone B gate log |
| `evidence_milestone_a/` | The §11 battery rerun for Milestone A (conformance, MS-1 unit, existing gates with the N3 repetitions, equivalence, freeze) |
| `evidence_orchestrator/` | Gates O1–O26 of `verify_orchestrator.mjs` on the diagnostic material, with its manifests |
| `evidence_analysis/` | The `verify_analysis.mjs` battery (unit oracles U1–U21, fixtures, mutants), the fixture output and the interpretation register |
| `evidence_ms1/` | MS-1 evidence (the measurement instrument) and `MS1_REPORT.md` |
| `evidence_r3/` | The R3 round (configuration-scoped environment stream), with `R3_REPORT.md`; the ON reference for `verify_existing_equivalence.mjs` |
| `evidence_d1d5/` | The R2 round (D-1 goal-entry draw and D-5 measurement; B2 environment stream), with `R2_REPORT.md` |
| `evidence_r1/` | The R1 round, with `R1_REPORT.md` |
| `evidence_r2/` | The previous Q-KEY round, with its `CORRECTION_REPORT.md` |
| `evidence_final/` | The first conformance round (`84b4197b`); the trap gate's "before" reference |

Tree paths in evidence are written relative to the OS temp directory, as `<tmp>/mfw-h1r/…`. The earlier evidence files had the local prefix redacted to `<tmp>` by exact string replacement (see `evidence_r1/R1_REPORT.md`).

## Known, reported limitations

- **Resolved by R2 (D-1):** goal-entering moves used to take no environment draw, contrary to §3.3. They now draw like every other edge.
- **Resolved by R3 (D-3B):** every configuration of one agent seed used to consume the same environment sequence. Each (configuration position, agent seed) now has its own segment.
  - Within an agent seed, configurations still share its cognitive stream, boot embeddings and σ. This is inherent to the crossed design and is analysis decision D-3.
  - The existing M7 and Phase-1.0 gate fixtures call `initRng` themselves with no design position, so under H1R they keep the B2 environment stream.
- **Replay re-execution of the last successful move.** It remains a no-op self "move": no draw, no position change, no credit, no learning.
- **Design premises not met by B2, and not by R1 either.**
  - §10.1 assumes Q absorbs `p_e` through slipped steps "at step cost". B2's reward rules have no step cost, and under R1 a slip is not a learning event.
  - §10.2 assumes slips raise `compositeError`. In B2, state-PE is 0 by construction (`predictedNextId = actualNextId = lastReasoning.to`), and under R1 a slip is not evaluated.

  Neither is a semantic rule; both are recorded for the Director.

## Behavioural note: explore-step habit cycles

Explore-step learning (`_learnProcedural`, authority `autonomous_explore`) writes Q(from → to) with a positive reward, 8·gain, on every realised step, independent of the goal. The rule is unchanged from B2. On some trajectories this produces a self-reinforcing habit cycle. For example, in the previous round's verify_cap boot fixture, the cycle 4→3→2→1→4 received +35 to +42 from explore-step learning against −11 to −20 from the main TD update. Pinned short-run fixtures in the historical gates can lose their "goal reached early" premise this way. See `evidence_r2/CORRECTION_REPORT.md` and `evidence_r1/R1_REPORT.md`.
