# H1-R — M7 Conformance Implementation Report

| | |
|---|---|
| **Date** | 2026-10-04 |
| **Repository state** | `main` = `6b0fbc3`, **0 tracked changes**. Everything is new and untracked under `experiments/h1r/`. |
| **Committed / pushed** | Nothing. H1-R has **not** been run. |
| **Build** | B2 = `707cb1e` (the M7 instrument; byte-identical agent to the G15 evidence build `ae45f20`) with the conformance transform, sha256 `84b4197beea994de…` |
| **Material** | Only the historical G15 configurations (900030–900499, the 41 accepted by the unchanged predicate) and agent seed 20260819000. **No new seed.** |
| **Blinding** | No per-arm outcome metric was computed. |

---

# IMPLEMENTATION SUMMARY

**No production file was edited.** H1-R uses the B2 agent. The conformance is a guarded source transform applied to a materialised copy of the B2 blobs.

| New file | Purpose |
|---|---|
| `experiments/h1r/conformance_transform.mjs` | The 14 guarded edits. Each anchor must match exactly the expected number of times, or the build refuses. |
| `experiments/h1r/build_tree.mjs` | Materialises the 146 B2 blobs (`git cat-file`, blob ids verified, no checkout, no line-ending conversion), applies the transform to 3 files, and writes `MANIFEST.json` to `os.tmpdir()/mfw-h1r/` |
| `experiments/h1r/runtime.mjs` | `globalThis.__H1R__`. Arm semantics come only from the frozen `experiments/m7/arms.js` predicates (the same module instance `run.js` configures); adjacency from `connections.json`. Usable programmatically or as a `--import` preload. |
| `experiments/h1r/run_one.mjs` | One run per OS process through the **unchanged** B2 `experiments/m7/run.js` |
| `experiments/h1r/verify_hook.mjs` | Insert-only verification recorder (proven neutral, H2) |
| `experiments/h1r/verify_conformance.mjs` | Gates A–H: 424 runs |
| `experiments/h1r/run_existing_gates.mjs` | 25 existing M7 and Phase-1.0 gates × {pristine B2, conformed-off, conformed-on} |
| `experiments/h1r/README.md` | Invariants and reproduction |
| `experiments/h1r/evidence_final/` | All evidence for this report. `experiments/h1r/evidence/` holds a superseded earlier transform; it is safe to delete. |

**Transformed files** (`sha256` before → after):

| File | Before | After |
|---|---|---|
| `main.js` | `537f37a2…` | `74138717…` |
| `render/qlearning.js` | `a3d4f4b8…` | `fdc2798c…` |
| `render/episodeManager.js` | `757d549b…` | `a8fd8dec…` |

Every edit is guarded by `globalThis.__H1R__ && globalThis.__H1R__.on`.

---

# CONFORMANCE CHANGES

All line numbers below are in the conformed `main.js` unless a file is named.

| Item | Edit(s) | Frozen authority | Invariant |
|---|---|---|---|
| **N1** | **N1-MASK** (`main.js:1660`): the memory/neighbour candidate loop admits graph neighbours only. **N1-MASK-SEM**: the semantic candidate loop (used only when no goal is set) admits graph neighbours only; the third path, `structureMap`, is neighbours by construction. **N1-SEAL** (`episodeManager.js:766`): a consecutive episode pair that is not an edge never becomes an episode transition. **N1-GUARD** (`main.js:3514`): backup; an executed move must be an edge or the existing no-op self re-execution. | §3.1, §3.3 | No non-edge move. No non-edge pair reaches `transitions`, episode/replay Q, `rewards`, momentum or trust. Slips on real edges are unchanged. |
| **N2** | `episodeManager.js:1092`: under M7 credit (`__M7_CREDIT__`, always on in H1-R), the episode-level success writer `_updateTrust` (M7-LN-01) is suppressed | **§6.1**: "recordSuccess(u→v) iff that attempt succeeded" | `successes ≤ attempts`; every trust write is a traversal outcome. Beta(1,1), decay 0.9997 and the read path are unchanged. **See the conflict on the reconciliation text below.** |
| **RANDOM** | `main.js:2635`: at the committed step-0 decision, `nextKey` is uniform over the current node's graph neighbours, using one `liveRng()` (cognitive stream) draw | §4 | The environment stream (`agentSeed ^ 0x5EED`) and the visual stream are untouched (§5.3, G2). All other draws in the tick are unchanged; only the selected action changes. |
| **FROZEN** | `qlearning.js:166`: the `updateQ` choke point (main path ×2, episode learning, replay). `main.js:3261`: Q decay. `main.js:4916`: E2 credit. `main.js:5104`: trust decay. | §4, "Q updates and trust updates disabled; scoring heuristics intact" | The Q table and trust store do not change. The policy still reads them. `dampQ` is already pinned off in every arm (§10.2). `pruneGoalWraparound` / `Q.clear` can only be reached from click and keyboard handlers. |
| **GOAL REWARD** | `main.js:3929`: `if (episodeUnique >= 3 \|\| (H1R on))`, so every goal reach pays the existing +12 | §3.4, G15′ | Eligibility is a constant. Nothing downstream modifies `rewardSignal`, and no early return sits between the goal branch and the Q update. |
| **P4** | `main.js:4736` (goal reset) and `main.js:3166` (150-tick cap restart): `window.lastReasoning = null` | §3.7 | A post-reset tick without a fresh decision commits no action. The boot pool start needs no edit (`lastReasoning` is empty at boot). |

---

# VALIDATION RESULTS

## Conformance suite

`node experiments/h1r/verify_conformance.mjs`: 424 runs, 0 errors, 861 s. **31 PASS, 0 FAIL, 1 CONFLICT, 2 INFO.**

| Gate | Result | Evidence |
|---|---|---|
| X0 | PASS | 424 runs; 0 errors, crashes or incomplete runs |
| **G1′** inert without runtime | PASS | 21/21 (configuration, arm) pairs: fingerprint and cognitive draws identical to pristine B2 |
| **A1** no non-edge movement | PASS | 0 non-edge moves of 618,424 edge attempts. 57,744 self no-op re-executions (no position change, no draw, no credit) |
| **A2** transition memory | PASS | non-edge writes: main 0/405,495, episode 0/535,753; non-edge entries at end 0 |
| **A3** episode learning / replay | PASS | non-edge episode pairs 0/535,753; replay 0 |
| **A4** trust store | PASS | non-edge trust keys: 0 (max over all snapshots) |
| **A5** goal detection | PASS | 65,808/65,808 goal reaches come from an adjacent node |
| **A6** backup guard | PASS | 0 firings |
| **A7** main-path TD Q keys | **CONFLICT** | 241,783/647,278 (37.4%) main-path Q writes use a non-edge key. All of them use the **lagged state key** (`agentLast`, ERR-05 §4); none comes from movement. |
| A-AV | PASS | With conformance off: 4,446 non-edge moves, 5,454 non-edge episode pairs, 44 non-edge trust keys |
| **B1** s ≤ a | PASS | keys with s > a: max **0** over 7,872 snapshots (every 100 ticks plus end) |
| **B2** trust bounds | PASS | range [0.0457, 0.9949] |
| **B3** only traversal writes | PASS | 0 reconstruction mismatches (decay mirrored); episode credits offered 111,098, applied 0 |
| B-AV | PASS | conformance off: max 63 keys with s > a |
| B-DIAG | INFO | **The attempt-gated variant breaks s ≤ a in 41/41 runs** (max trust 1.877) |
| **C1** RANDOM wired | PASS | 84,198 uniform decisions; runtime saw arm A3 |
| **C2** RANDOM ≠ BELIEF | PASS | 41/41 configurations |
| **C3** RANDOM uniform | PASS | A3: χ² = 46.9, df 58, p = 0.85, 0 non-neighbour picks, argmax share 0.261 (0.259 expected under uniform). A1: χ² = 24,906, p ≈ 0, argmax share 0.908 |
| C-INFO | INFO | Decision ticks committing no action: A1 15.0%, A2 15.9%, A3 25.8%, A4 17.2%, A5 14.5%, A6 16.2%, A7 16.6%. **Root cause in Unresolved issue U3.** |
| C-AV | PASS | Without the runtime, A3 is byte-identical to A1 (the historical defect, reproduced) |
| **D1** FROZEN Q | PASS | 0 changed keys, max \|Δ\| 0, tick 0 → 3000 |
| **D2** FROZEN trust | PASS | attempt keys changed 0, success keys changed 0 |
| **D3** FROZEN policy runs | PASS | 95,330 decisions, 1,395,436 trust reads |
| D-AV | PASS | A1 over the same interval: 5,544 Q keys and 2,219 trust keys changed |
| **E1** no stale post-reset action | PASS | 0 moves and 0 goal reaches across 67,162 resets |
| **E2** no stale goal reach | PASS | 0 |
| E-AV | PASS | conformance off: 387 stale post-reset goal reaches |
| **F1** +12 on every reach | PASS | 65,808 reaches, 65,808 Q goal updates, 0 not equal to 12 |
| **F2** eligibility constant | PASS | 287 runs, rate exactly 1 |
| F-AV | PASS | conformance off: 2,262 rewards ≠ 12; GOAL-reverted mutant: 598 |
| **G15′-S** structural | PASS | The GOAL edit (`main.js:3929`) sits inside the goal branch (`:3927`); the next statement is `rewardSignal = 12;` |
| **G15′** | PASS | Structural + F1 + F2 + F-AV |
| **H1** determinism | PASS | 21/21 identical across two independent processes |
| **H2** recorder neutrality | PASS | 21/21 |

**Arm isolation in the H1-R configuration** (from the same runs): every arm A2–A7 diverges from A1 in 41/41 configurations. ABLATION delivers 0.5 on 1,404,171/1,404,171 per-edge reads, and nulls 103,535 of 103,738 aggregate reads (the remainder were already null).

## Existing gates

`node experiments/h1r/run_existing_gates.mjs`. Results are PASS/FAIL counts.

| Gate | pristine B2 | conformed, off | conformed, on |
|---|---|---|---|
| m7/verify_M7 (G1–G6, G11–G14) | 49/0 | 49/0 | **49/0** |
| m7/verify_arms | 59/0 | 59/0 | 59/0 |
| m7/verify_env | 54/0 | 54/0 | 54/0 |
| m7/verify_e1e2 | 32/0 | 32/0 | 32/0 |
| m7/verify_e3e4 | 36/0 | 36/0 | **32/4** |
| m7/verify_e5 | 30/0 | 30/0 | 30/0 |
| m7/verify_cap | 42/0 | 42/0 | 42/0 |
| m7/verify_goal | 26/0 | 26/0 | **23/3** |
| m7/verify_determinism | 29/0 | 29/0 | 29/0 |
| m7/verify_G8 | 22/0 | 22/0 | 22/0 |
| m7/verify_G10 | 38/0 | 38/0 | 38/0 |
| m7/verify_acceptance | 26/0 | 26/0 | 26/0 |
| m7/verify_stepledger | 29/0 | 29/0 | **28/1** |
| m7/verify_G15 (historical) | 24/0, G15 FAIL (ρ reproduced) | 24/0, G15 FAIL | **22/2** |
| phase1_0 (11 gates) | identical to off | identical to pristine | **verify_S2 13/1**; others unchanged; S1b S1.7 is the historical failure in all three |

**Inertness:** conformed-off equals pristine on **all 25 gates**.

**Conformance-on failures, each investigated:**

| Gate / assertion | Measured cause | Class |
|---|---|---|
| G15 C2, C3 | They assert that replay-stale and non-canonical goal reaches **exist** (> 0). Conformance makes both exactly 0. | By design. Direct evidence that P4 and N1 work. |
| historical G15 verdict | Recomputes the legacy predicate `episodeUnique ≥ 3`, which no longer determines reward | Measures a retired variable. Superseded by G15′. |
| stepledger A3 | The ledger only feeds goal eligibility, which GOAL removed | By design |
| S2.4b (3/4) | The fixture hand-teaches **8→16, which is not a graph edge** | N1-SEAL correctly refuses it |
| goal B2, B3 | Bit-identity pins to pre-seam **B2** figures | Cannot hold once behaviour is intentionally changed |
| goal C2 | `qEntries(on) ≥ qEntries(off)` heuristic. Q sum still rises 39.06 → 305.50 and goal keys appear. | B2-magnitude heuristic |
| e3e4 I.3a/3b/3e/5b | No environment, no M7 credit, no goal, 80 ticks. 0 trust successes exist and E3 ≠ 0.5 appears only after about 330 reads. With edge-only candidates the aggregate perturbation flips no argmax. The switches still deliver correctly (G4 49/0 under conformance; E3/E4 value arrays differ). In the H1-R configuration all arms diverge, 41/41. | Liveness assertion whose configuration no longer exercises a decision effect. **Not wiring.** |

All of these are **FAILs of existing gates**. None is weakened or edited; they are reported as fails.

---

# REGRESSION RESULTS

- Phase-1.0 gates in the B2 tree: conformed-off equals pristine (S1 12/0, S1′ 7/0, S2 14/0, S2_Q4 15/0, S4 12/0, S6 18/0, G9 11/0, G16 28/0, S3′ 2/0, parity 200000/200000; S1b keeps its historical S1.7 failure).
- With conformance on, only S2.4b changes (the non-edge fixture).
- HEAD gates are unaffected because no HEAD file changed.

---

# SCIENTIFIC IMPACT

**Preserved:**
- the M7 question, arms, topology, `T_SHIFT`, episode cap, learning rates, Beta(1,1), trust decay, Q parameters, seeds and statistics;
- the reward process, except goal eligibility;
- the historical G15 evidence, which is reproduced exactly in pristine and off.

**Restored to the frozen text:**
- edge-only movement (§3.1/§3.3);
- traversal-outcome trust (§6.1);
- live RANDOM and FROZEN arms (§4);
- a structurally p_e-independent goal reward (G15′);
- no stale post-reset actions.

**Behaviour now differs from B2 by design.** B2 baselines are not comparable to the conformed agent.

---

# UNRESOLVED ISSUES

These need Research Director reconciliation. None was resolved by choosing an interpretation silently.

**U1 — N2 text vs the invariant (implemented per §6.1).**
- The reconciled text ("credit only an edge attempted in the episode") **cannot** satisfy B1 s ≤ a. Measured: s > a in 41/41 runs, trust up to 1.877.
- The reason: an attempted-and-successful edge already receives its traversal success, so episode credit counts it twice.
- Frozen §6.1 rules out episode credit under M7, and that is what was implemented.
- **Ruling needed:** confirm the §6.1 semantics.

**U2 — A7, lagged main-path Q keys (37.4%).**
- The Q state key is the previous tick's position (ERR-05 §4, never repaired for Q).
- This is not movement and enters no other store. Non-edge Q entries are never read for selection, but **they do enter the bootstrap max** (`qlearning.js:203`).
- Fixing it re-times Q-learning, which is outside the frozen six items.
- **Ruling needed:** declare it as a limitation, or authorise a §3.3 "realised node enters Q-learning" conformance item.

**U3 — new confound exposed by N1: the B2 `canReachGoal` trap (RED for H1-R).**
- B2's depth-4 DFS shares a `visited` set without backtracking (35 false negatives). Node **3** with goal **16** then has **no** admissible neighbour.
- In B2, teleports escaped the trap. Under N1, goal-16 configurations (14/41) commit no action on **40–47%** of decision ticks (RANDOM 75%), against < 3% for other goals and 0.8% in B2.
- With a correct depth-4 `canReachGoal` there are **0 traps**. That repair already exists at HEAD (`0f47d7b`: 3 lines, Director-authorised, "9 false negatives eliminated, 0 introduced").
- **Ruling needed:** include `0f47d7b` in the conformance build. It is outside the six items, so it was not added.

**U4 — the existing-gate fails under conformance-on.**
- They are classified above.
- **Ruling needed:** accept these historical assertions as B2-behaviour pins that do not apply to the conformed instrument, or require successor assertions.

**U5 — pre-existing, outside scope, reported only:**
- Goal-entering moves never draw from the environment (`main.js:4867`, `:4893`), whereas §3.3 implies a slip draw on every edge attempt.
- Replay re-execution of the last successful move remains a no-op self "move".

---

# COMMIT READINESS

**Implementation is NOT verification-complete.**

- Gate A has a CONFLICT (A7).
- Existing gates fail under conformance-on (U4).
- U3 is an unresolved confound.

Nothing has been committed. When it is committed, the evidence files are byte-hashed and should be marked `-text` in `.gitattributes`, following the M7 precedent.

---

# NEXT OPTIMIZED DECISION

**One reconciliation ruling covering U1–U4**, with these recommendations:

| Item | Recommendation |
|---|---|
| U1 | Confirm §6.1 traversal-only trust (as implemented) |
| U3 | Add the existing HEAD repair `0f47d7b` to the conformance transform |
| U2 | Either declare it, or authorise §3.3 Q keying as a conformance item. Prefer authorising, because H-B ("ordinary model-free RL") presupposes a coherent TD learner. |
| U4 | Classify the listed assertions as B2 pins |

Then re-run the two existing scripts, unchanged (about 25 minutes): `verify_conformance.mjs` and `run_existing_gates.mjs`. If they are green, the conformance milestone can be committed and H1-R pre-registration writing can begin.
