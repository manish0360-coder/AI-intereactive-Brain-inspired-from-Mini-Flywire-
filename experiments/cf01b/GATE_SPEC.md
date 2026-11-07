# CF-01b Gate Specification — E2′ detour after pre-exposure (frozen)

**Status.** Frozen in the CF-01b implementation commit, before the `gate2` domain was run.

- This is a **task-admission gate**: does E2′ discriminate model-based from model-free learning? It is development evidence, not confirmatory. Commits are local.
- The result is bound to the commit it ran at.
- The redesign rationale is CD-010. The controls follow the Director-approved review (2026-11-07, §F).

## Command

```bash
node experiments/cf01b/run_gate.mjs --domain gate2
```

The driver refuses to run if any file under `cognitive/` or `experiments/cf01b/` is uncommitted or modified, or if `results/gate2_result.json` already exists.

## Frozen values

| Item | Value |
|---|---|
| Domain / worlds | `gate2`; labels `cf|gate2|world|0` … `cf|gate2|world|19` (20 worlds) |
| World-count rule (pre-declared) | n = max(20, ⌈(2.8 · SD_dev / mean_dev)²⌉), capped at 60. It uses the dev pilot's primary paired differences; 2.8 ≈ z₀.₉₇₅ + z₀.₈. Dev: SD 207.8, mean 368.9 → (1.58)² = 2.5 → **n = 20** |
| World generator | As CF-01: 24 nodes, 30 edges, max degree 4, hidden relabelling and exit permutation |
| Task | `cognitive/testbed/task_e2p.mjs` |
| Phase A (pre-exposure) | 600 steps, no reward or cue, 50-step episodes from the start stream |
| Phase B (training) | Cued goal G, 40 episodes from S, with d(S, G) ≥ 3 |
| Phase C (test) | 3 episodes from S, cap 200 |
| Arms | **PRE**: A → B → block e → C. **NOPRE**: B → block e → C. **SHAM**: A → B → block an edge on no shortest S→G path → C. **NOBLOCK**: A → B → C. The edge e lies on a shortest S→G path, and removing it raises d(S, G) |
| Agents | RANDOM; QL (α 0.5, γ 0.95, ε 0.1); DYNAQ (+ k = 20); ORACLE (privileged reference) |
| Seeds | Environment `<world>|E2P|env`; agent `<world>|E2P|agent`; layout `<world>|E2P|layout`; bootstrap `cf|stats|gate2|E2P…` |
| Metric | Sum of the 3 test-episode step counts (a censored episode counts 200) |
| **Primary (admission)** | D = QL.PRE − DYNAQ.PRE. **Admitted iff mean > 0 and 95% bootstrap lower bound > 0** (10,000 resamples) |
| Infrastructure | G1: identical row hashes over two in-process runs. G2/G3: CF-01 suite (57) + `test_e2p.mjs` (6), 63 tests in all. G5: mean ORACLE ≤ every learner in every arm |
| Verdict | PASS: infrastructure passes and E2′ is admitted. NOT ADMITTED: infrastructure passes, E2′ is not admitted. FAIL: an infrastructure gate fails |
| Reported, not pass/fail | DYNAQ pre-exposure benefit (NOPRE − PRE); QL pre-exposure null (NOPRE − PRE, expected ≈ 0); sham disruption (SHAM − NOBLOCK) per agent; QL − DYNAQ in NOPRE (the CF-01 E2 design); coverage of detour edges in phase A; blocked-edge attempts; censoring; `mfw-graph` reference rows |

**Changes from the CD-010 proposal:** SHAM and NOBLOCK arms added. Coverage reporting added. World count set by the rule above. Each follows the Director-approved review §F.

## Development-domain disclosure (observed before this freeze; parameters not changed after it)

Dev worlds `cf|dev|world|0…19`, row hash `5d9dd977…79e9`, verdict on dev: PASS.

| Measure | Dev value |
|---|---|
| Primary (QL.PRE − DYNAQ.PRE) | +368.9 [278.5, 455.0] |
| DYNAQ pre-exposure benefit | +129.9 [49.5, 222.9] |
| QL null | −51.5 [−193.0, 86.6] |
| Sham disruption | QL +2.4 [0, 7.1]; DYNAQ −0.05 [−0.15, 0] |
| NOPRE QL − DYNAQ | +187.6 [56.2, 310.8] |
| Phase-A coverage of detour edges | 1.0 for every agent |
| Censoring, PRE arm | QL 53.3%, DYNAQ 0% |

Coverage of 1.0 means 600 steps exposes the whole detour in these 24-node worlds. **The task therefore tests use of a fully seen map, not partial-map inference.**

The gate uses 20 different worlds. Dev outcomes are not evidence for the gate.
