# CF-01 Gate Specification (frozen)

**Status.** Frozen in the CF-01 implementation commit, before the `gate` domain was run.

- The pass rules are those of `docs/COGNITIVE_EXPERIMENT_PROTOCOL.md` §4, committed in `ea3f772` before any gate-domain run.
- This file fixes the parameter values.
- Any later change to the files the gate depends on (`cognitive/`, `experiments/cf01/run_gate.mjs`, this file) after the gate run invalidates the run.

**Evidence category.** Development gate, not confirmatory. The commits are local and not remote-verified (CD-008).

## Command

```bash
node experiments/cf01/run_gate.mjs --domain gate
```

The driver refuses to run in three cases:
- any file under `cognitive/` or `experiments/cf01/` is uncommitted or modified;
- `results/gate_result.json` already exists;
- `--worlds` is not 20.

## Frozen values

| Item | Value |
|---|---|
| Domain / worlds | `gate`; world labels `cf|gate|world|0` … `cf|gate|world|19` |
| World generator | 24 nodes, 30 edges, max degree 4; random spanning tree, then random extra edges; hidden node relabelling and exit permutation (`cognitive/testbed/worlds.mjs`) |
| Dynamics | p = 1 on every edge except blocked edges (p = 0). Reward 1 on arrival at the rewarded node, which ends the episode. Cap 200 steps |
| E1 latent learning | Arms EXPLORED and NAIVE. Phase A: 600 steps, no reward, no cue, episodes of 50 steps from the start stream. Phase B: goal cued and rewarded, 5 episodes from S, with d(S, G) ≥ 3 |
| E2 detour | 40 training episodes from S to cued G with d(S, G) ≥ 3. Then block one edge on a shortest S→G path whose removal raises d(S, G). Then 3 test episodes |
| E3 reward relocation | No cue. 30 training episodes from S to G1 with d(S, G1) ≥ 2. The reward then moves to G2 with d(S, G2) ≥ 3, G2 not on any shortest S→G1 path. Then 5 test episodes |
| Metric | Sum of test-phase episode steps; a censored episode counts as 200 |
| Agents | RANDOM; QL (α 0.5, γ 0.95, ε 0.1, Q₀ 0); DYNAQ (QL + k = 20 planning updates); ORACLE (privileged, reference) |
| Seeds | Environment `<world>|<task>|env`; agent `<world>|<task>|agent`; layout `<world>|<task>|layout`; bootstrap `cf|stats|gate|<task>` |
| Statistics | Paired difference per world; percentile bootstrap, 10,000 resamples |
| Primary contrasts | E1: QL.EXPLORED − DYNAQ.EXPLORED. E2 and E3: QL − DYNAQ |
| Admission (G4) | Mean > 0 and lower 95% bound > 0 |
| Verdict | PASS: G1, G2, G3 and G5 pass and ≥ 2 tasks admitted. PARTIAL: < 2 tasks admitted. FAIL: G1, G2, G3 or G5 fails |

**Changes from the values proposed in the protocol:** none.

## Development-domain disclosure (observed before this freeze)

The `dev` domain (`cf|dev|world|0…19`) was used to develop and check the pipeline. The parameters above were **not** changed after the dev run.

Dev run summary (row hash `1b18815f…aa53a`):
- Verdict on dev: PASS. Every gate held.
- Primary contrasts on dev:
  - E1: +129.4 [93.6, 170.2]
  - E2: +265.7 [152.6, 374.1]
  - E3: +269.0 [91.1, 453.4]
- E1 negative control (QL EXPLORED − NAIVE): −6.6 [−56.4, 46.3].
- DYNAQ latent benefit: +82.6 [48.4, 120.9].
- Censoring on dev was high for QL in E2 (55%) and E3 (45%). The cap of 200 therefore under-states those differences; this is accepted as pre-declared.
- On the reference world `mfw-graph` (reported only), DYNAQ did worse than QL in E3 (636 vs 68 steps).

The gate domain uses 20 different worlds. Dev outcomes are not evidence for the gate.
