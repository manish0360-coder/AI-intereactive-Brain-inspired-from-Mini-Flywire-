# CF-01b Gate Results — E2′ detour after pre-exposure

**Verdict: CF-01b PASS. E2′ is admitted as a battery instrument.**
- The infrastructure gates held: G1 determinism, 63/63 tests, G5 oracle sanity.
- The primary contrast is +318.3 [236.4, 398.8].
- The `gate2` domain was run once. Nothing was re-run or tuned after the outcome.

| Item | Value |
|---|---|
| Evidence category | Development task-admission gate. Not confirmatory; local commits; no independent reproduction |
| Command | `node experiments/cf01b/run_gate.mjs --domain gate2` (exit 0, about 5 s) |
| Code and spec | HEAD `d66f75c`; `GATE_SPEC.md` SHA-256 `10120004…`; frozen before the run |
| Environment | Node v24.15.0, win32-x64 |
| Result file | `gate2_result.json`, SHA-256 `109492d4…993b`; row hash `0dd53b45…f97d` (320 rows) |
| Worlds | `cf|gate2|world|0…19`; 0 excluded |

## Primary

| Contrast | Mean | 95% CI | SD | Admitted |
|---|---|---|---|---|
| QL.PRE − DYNAQ.PRE (test-phase steps over 3 episodes) | **+318.3** | [236.4, 398.8] | 190.7 | **yes** |

## Controls (reported, not pass/fail)

| Measure | Value | Reading |
|---|---|---|
| DYNAQ pre-exposure benefit (NOPRE − PRE) | +69.9 [5.1, 153.1] | Pre-exposure helped Dyna-Q build the detour |
| QL pre-exposure null (NOPRE − PRE) | +34.4 [−53.8, 127.1] | Includes 0, as expected: QL cannot use unrewarded exposure |
| Sham disruption (SHAM − NOBLOCK) | QL −0.3 [−0.9, 0]; DYNAQ 0 [0, 0] | Blocking an off-route edge does not disrupt behaviour |
| QL − DYNAQ without pre-exposure (the CF-01 E2 design) | +282.8 [170.2, 394.6] | See the note below |
| Detour-edge coverage in phase A | 1.0 for every agent | The whole detour was seen before the block |
| Blocked-edge attempts in PRE (mean) | QL 59.3 · DYNAQ 4.2 · RANDOM 7.6 · ORACLE 0 | |
| Censoring in PRE | QL 38.3% · DYNAQ 0% · RANDOM 8.3% | |

Mean test steps:

| Arm | RANDOM | QL | DYNAQ | ORACLE |
|---|---|---|---|---|
| PRE | 254.7 | 346.2 | 28.0 | 16.8 |
| NOPRE | 217.1 | 380.6 | 97.9 | 16.8 |
| SHAM | 176.9 | 13.8 | 13.4 | 11.7 |
| NOBLOCK | 163.2 | 14.1 | 13.4 | 11.7 |

## Note on the original E2

On these 20 fresh worlds, the original no-pre-exposure design would have discriminated: +282.8 [170.2, 394.6]. On the CF-01 `gate` worlds it gave +121.2 [−3.0, 236.2].

So part of E2's non-admission at CF-01 was world-sample variability with a heavy-tailed metric, not only the construct problem. This does not reverse the CF-01 record, which stands as run. It supports CD-010's choice of the lower-variance, pre-exposed design. Pre-exposure cut DYNAQ's spread: PRE censoring 0% against 11.7% in NOPRE.

## Limits

- Coverage was 1.0, so E2′ tests detour construction from a **fully seen** map, not inference from a partial one.
- E2′ was admitted with Dyna-Q as the model-based reference. A learned-model agent must beat Dyna-Q on it before any detour capability is credited.
- Results hold only for 24-node generated worlds with deterministic edges.

`mfw-graph` reference rows (reported only) are in `gate2_result.json`.
