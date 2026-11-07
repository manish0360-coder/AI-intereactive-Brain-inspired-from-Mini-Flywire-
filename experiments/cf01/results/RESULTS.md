# CF-01 Gate Results

**Verdict: CF-01 PASS.**
- All infrastructure gates held: G1 determinism, G2 isolation, G3 environment correctness, G5 oracle sanity.
- **Two of three tasks were admitted:** E1 latent learning and E3 reward relocation.
- **E2 detour was not admitted.** Its lower 95% bound was −2.95, below 0.
- The gate domain was run once. Nothing was re-run or tuned after the outcome.

| Item | Value |
|---|---|
| Evidence category | Development gate, not confirmatory. Local commits, not remote-verified (CD-008) |
| Command | `node experiments/cf01/run_gate.mjs --domain gate` (exit 0, about 3 s) |
| Code and spec | HEAD `465f0b6`; `GATE_SPEC.md` SHA-256 `8e93ad88…2bfb2f`; protocol §4 committed earlier in `ea3f772` |
| Environment | Node v24.15.0, win32-x64 |
| Result file | `gate_result.json`, SHA-256 `2aa55c20…4485b`; row hash `6d3affcc…a9a6f1` (320 rows) |
| Worlds | `cf|gate|world|0…19`; 0 excluded on any task |

## Gates

| Gate | Result |
|---|---|
| G1 determinism | PASS: two in-process runs gave identical row hashes |
| G2 isolation | PASS: 22/22 tests (isolation + 17 mutants, each caught by its named check) |
| G3 environment correctness | PASS: 35/35 tests |
| G4 discriminability | E1 admitted · **E2 not admitted** · E3 admitted |
| G5 reference sanity | PASS: ORACLE ≤ every learner on every task and arm |

## Primary contrasts

Each contrast is the paired difference in test-phase steps (baseline − mechanism), over 20 worlds, with a 95% percentile bootstrap.

| Task | Contrast | Mean | 95% CI | Admitted |
|---|---|---|---|---|
| E1 latent learning | QL.EXPLORED − DYNAQ.EXPLORED | +149.2 | [104.9, 203.1] | yes |
| E2 detour | QL − DYNAQ | +121.2 | [−3.0, 236.2] | **no** |
| E3 reward relocation | QL − DYNAQ | +269.2 | [113.3, 424.3] | yes |

## Reported, not pass/fail

| Measure | Value |
|---|---|
| E1 negative control: QL.EXPLORED − QL.NAIVE | +7.2 [−32.1, 50.3]. It includes 0, as expected: QL cannot learn from unrewarded experience. Unit test `test_tasks.mjs` shows its Q stays exactly 0 |
| E1 latent benefit within DYNAQ: NAIVE − EXPLORED | +65.0 [42.4, 93.4] |
| E2 attempts on the blocked edge (mean) | QL 46.7 · DYNAQ 10.9 · RANDOM 11.3 · ORACLE 0 |
| E3 arrivals at the old goal after relocation (mean) | QL 62.1 · DYNAQ 14.1 · RANDOM 12.5 · ORACLE 0 |
| Censoring (share of test episodes hitting the 200 cap) | E2: QL 25%, DYNAQ 11.7%. E3: QL 42%, DYNAQ 16%. The cap under-states the larger differences |

Mean test-phase steps:

| Task.arm | RANDOM | QL | DYNAQ | ORACLE |
|---|---|---|---|---|
| E1.EXPLORED | 304.5 | 178.8 | 29.7 | 19.5 |
| E1.NAIVE | 302.7 | 171.7 | 94.6 | 19.5 |
| E2 | 282.6 | 239.1 | 117.9 | 17.7 |
| E3 | 326.2 | 545.8 | 276.7 | 21.0 |

QL does worse than RANDOM on E3. This is habit perseverance: QL arrived at the old goal 62 times on average after the reward moved.

## Why E2 was not admitted (descriptive diagnosis, not a test)

The effect was heterogeneous across worlds:
- DYNAQ took more steps than QL in 5 of 20 worlds.
- In worlds 17 and 18, DYNAQ was censored in all 3 test episodes.

Both agents explore without direction (ε = 0.1). After 40 goal-directed training episodes, neither has reliably experienced the alternative route. When the learned route is blocked, the deterministic Dyna model knows the blocked action fails but has no model of the detour, so the agent must find it by undirected exploration.

This is consistent with the absence of directed exploration, which is the CF-03 mechanism. It is an interpretation and was not tested here.

## Reference world `mfw-graph` (reported only)

On the MiniFlyWire graph with the same task code, DYNAQ took 636 steps on E3 against 68 for QL, the reverse of the generated-world pattern.

A plausible reading, not tested: the last-outcome model keeps stale "reward 1" entries for pairs into the old goal that were not revisited after relocation. Planning keeps propagating them. It is a known weakness of deterministic last-outcome Dyna models, and a reason CF-03 uses a probabilistic, count-based model.

## Consequences

1. **Battery v0 = E1 and E3.** These two tasks may be used as instruments by CF-03.
2. **E2 must be redesigned before use** (proposal CD-010: E2′ adds an unrewarded pre-exposure phase, so the map is known before the block, as in the classical detour paradigm). It needs a new gate domain. This gate domain is spent.
3. **The comparison bar for CF-03 is DYNAQ, not QL.** On E1 and E3 a learned-model agent must beat DYNAQ for any claim (`COGNITIVE_METRICS.md` §5).
4. **Not shown.** No claim about MiniFlyWire's own agent, which did not take part. No claim on worlds outside this generator family, and none about stochastic dynamics.
