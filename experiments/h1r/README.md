# H1-R — M7 conformance instrument

H1-R tests the **M7 design as frozen**: [`M7_PREREGISTRATION.md`](../../research/cognitive-audit/M7_PREREGISTRATION.md), SHA-256 `2f12e309…f6b9`, plus errata 01–10.

The M7 instrument build is **B2 = `707cb1e`**. The B2 characterization of 2026-10-04 showed that B2 departs from the frozen text in several ways. This directory makes the runtime conform **without editing any production file**:

1. `build_tree.mjs` materialises the B2 blobs. It uses `git cat-file`, so there is no checkout and no line-ending conversion, and it checks every blob id.
2. It applies `conformance_transform.mjs` to exactly three files.
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

**What learning receives (existing rules on the realised transition):**
- **Success u → v:** the full section runs on u → v. This includes the reward (`sim(u, v)`), PE (actual = v), Q(u, v) with S′ = v, and every store keyed u → v. Return moves are included.
- **Slip:** the realised transition is u → u. The section's own entry guard ("prevents corrupt self-loop learning") excludes self-transitions, so there is no reward, no PE and no Q update: the slip costs only the elapsed tick (§3.4; ERR-05 E1′). The intended edge u → v receives the trust attempt and no success (§3.3, §6.1).
- **Goal entry:** this move takes no environment draw (pre-existing; R1 adds no draw). It is realised, learns as a success with the flat +12 and S′ = goal, and then the existing reset runs.

R1 supersedes the sentence of ERR-05 §3.1 stating that Q-learning, prediction error and reward run "unchanged on both outcomes". It also retires the earlier Q-KEY stash/apply edits, because B2's original calls are correct once they run in the realised view.

**N2 invariant, exactly:** for every traversal attempt of a real edge, `attempts += 1`, and `successes += 1` iff that traversal succeeded. No other writer touches the store under M7 credit, so one physical outcome yields at most one success. The gates check `successes ≤ attempts` at every 100-tick snapshot, and check that the store equals the counts reconstructed from the executed moves (decay mirrored).

`runtime.mjs` supplies `__H1R__`. Arm semantics come only from the frozen predicates in `experiments/m7/arms.js`, and adjacency from the tree's `connections.json`. `trustMode: 'attemptGated'` exists **for diagnosis only**; see `verify_conformance.mjs` gate B-DIAG.

## Verification

```bash
node experiments/h1r/verify_conformance.mjs
```

```bash
node experiments/h1r/run_existing_gates.mjs
```

- **Material:** only the historical G15 configurations (900030–900499, accepted per the unchanged predicate) with agent seed 20260819000. No new seed is generated.
- **Blinding:** only gate and mechanism quantities are reported. No per-arm outcome metric is computed.
- **Evidence:** both scripts write to `experiments/h1r/$H1R_EVIDENCE` (default `evidence/`). `H1R_EVAL_ONLY=1` re-evaluates the gates on a directory's saved `runs.json` without executing any run.

| Directory | Contents |
|---|---|
| `evidence_r1/` | Current evidence (R1 transform) and `R1_REPORT.md` |
| `evidence_r2/` | The previous Q-KEY round, with its `CORRECTION_REPORT.md` |
| `evidence_final/` | The first conformance round (`84b4197b`); the trap gate's "before" reference |

Tree paths in evidence are written relative to the OS temp directory, as `<tmp>/mfw-h1r/…`. The earlier evidence files had the local prefix redacted to `<tmp>` by exact string replacement (see `evidence_r1/R1_REPORT.md`).

## Known, reported limitations

- **Goal-entering moves never draw from the environment.** This is pre-existing (`_goalResetJustHappened`), whereas §3.3 implies a slip draw on every edge attempt. R1 forbids adding draws, so it is preserved.
- **Replay re-execution of the last successful move.** It remains a no-op self "move": no draw, no position change, no credit, no learning.
- **Design premises not met by B2, and not by R1 either.**
  - §10.1 assumes Q absorbs `p_e` through slipped steps "at step cost". B2's reward rules have no step cost, and under R1 a slip is not a learning event.
  - §10.2 assumes slips raise `compositeError`. In B2, state-PE is 0 by construction (`predictedNextId = actualNextId = lastReasoning.to`), and under R1 a slip is not evaluated.

  Neither is a semantic rule; both are recorded for the Director.

## Behavioural note: explore-step habit cycles

Explore-step learning (`_learnProcedural`, authority `autonomous_explore`) writes Q(from → to) with a positive reward, 8·gain, on every realised step, independent of the goal. The rule is unchanged from B2. On some trajectories this produces a self-reinforcing habit cycle. For example, in the previous round's verify_cap boot fixture, the cycle 4→3→2→1→4 received +35 to +42 from explore-step learning against −11 to −20 from the main TD update. Pinned short-run fixtures in the historical gates can lose their "goal reached early" premise this way. See `evidence_r2/CORRECTION_REPORT.md` and `evidence_r1/R1_REPORT.md`.
