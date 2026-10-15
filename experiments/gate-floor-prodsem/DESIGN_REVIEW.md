# GATE-FLOOR-PRODSEM — design review record

Written before any confirmatory outcome exists. Three inputs were considered and weighed independently: the Phase 1 investigation
([PRODSEM_SEMANTICS.md](PRODSEM_SEMANTICS.md)), the independent review (Gemini: **PASS WITH CLAIM LIMITS**, one required
correction) and the Research Director's freeze authorization. The decisions below rest on the repository facts and measurements,
not on any reviewer's authority.

## What was frozen (and what changed from GATE-FLOOR-HEAD)

| | GATE-FLOOR-HEAD | GATE-FLOOR-PRODSEM | basis |
|---|---|---|---|
| substrate | derived HEAD tree, main sha `8cf1dc29…` | **identical** (same transform, same pins) | no runtime edit |
| condition | hooks H (arm A1, env on, credit on, pin on) | **P** (arm OFF, env off, credit off, pin off) | Phase 1: `envMode off` alone (state E) is a hybrid |
| margins | DELTA 15 / MIN_BENEFIT 30 | **20 / 40**; (15, 30) as a declared sensitivity | the programme's rule on the state-P calibration (ENTRY_NR +82.0 [58.9, 105.8]); same ~5 % / ~10 % of cold |
| n | 280 (70/goal) | **280** (70/goal), worlds **832–1111** | (2.8·98.4/20)² = 190 ≤ 280; gating SD 77.6 → 118 |
| arms | COLD, COLD_FLOOR, ENTRY_NR gate; REAL, REAL_FLOOR descriptive | **unchanged** | no new arm; dropping REAL arms would change no claim |
| C4 | no harmed goal group **and** attempt-success drop ≤ 0.05 | no harmed goal group (clause **retired**) | attempt success is undefined under P (no draw exists) |
| C5 | floor audit | floor audit **+ condition integrity** (hook state, env counters 0, draws 0, traversal `a == s`, cap and replay armed, non-empty evidence) | a violation invalidates the block |
| label | REPLICATED / PARTIAL / NOT_REPLICATED / HARM / AUDIT_FAILED | **TRANSFERS / PARTIAL / NO_MEANINGFUL_BENEFIT / HARM / AUDIT_FAILED** | a semantics-transfer test, not a replication |
| classification | — | **"Production-like transition semantics under M7 bounds."** | Director ruling + Gemini correction 1 |

## The review claims, assessed one by one

| claim | assessment |
|---|---|
| P alone, no confirmatory E block | **Accepted**, on code facts: E keeps E2 credit and the PE pin and no product path reaches it (Phase 1). P − E on COLD legal is +18.3 [−3.4, 42.5], so the choice does not hinge on the intervention. |
| Retain the 150-tick cap; no driver-side setter trap | **Accepted.** An untested trap right before a confirmatory run is execution risk; the cap is a declared deviation. |
| "the cap … total goal reaches under P may be artificially higher" (Gemini INFERENCE) | **Not accepted as a direction.** The cap also truncates productive long episodes; the sign is UNKNOWN and carried as such. |
| replay-once is "orthogonal" because the floor is decision-time scoring | **Partly supported** (XFER-2: replay effect +0.1 [−8, 8]) but not tested under P; kept as a claim limit, not as a finding. |
| DELTA 20, MIN_BENEFIT 40, n 280 | **Accepted**, with the derivation above. The statement that n = 280 "ensures robust power for the goal-specific harm rules" is **not** adopted: no power for the harm rule was computed; the per-goal unadjusted interval half-width is about ±16 at 70 worlds. |
| "only the final-hop diagnostic is vacuous under P" | **Incomplete.** Also degenerate or retired: per-attempt success (and its C4 clause), slips per call, environment counters, E2 credit-key counts, the reliability-weighted `leastReliableShare` (removed), and the `drawsMatchEnvCounters` audit (trivially 0 = 0, guarded instead by the integrity block). |
| legacy stale-keyed credit is "an artifact of the pristine B2 architecture" | **Corrected.** It is HEAD's own credit site (documented in the source), i.e. the product's behaviour under P. It is listed as a deviation because the Director requires it and because it is a known temporal misalignment relative to the *intended* credit semantics — not because P departs from the product there. Its interaction with the floor is measured as an outcome only; the mechanism is not claimed. |

## Mandatory report limits (verbatim in the config, the summary and the results record)

Classification: Production-like transition semantics under M7 bounds. Deviations: (1) the 150-tick episode cap; (2) the
deterministic replay cooldown; (3) legacy stale-keyed credit assignment through `agentLast→next`. Condition P installs no
environment draw, so traversal-attempt success is identically 1.0 and cannot establish real-world routing capability;
degenerate diagnostics are reported as such. No claim of production equivalence, production readiness, user-visible quality,
safety or general routing capability; nothing outside the frozen goals {8, 12, 16, 19}, the graph, the Phase I budget and the
harness semantics. FutureScore V2.3 behaves as a graph-distance potential under P.

## Execution rules (unchanged)

No optional stopping, no outcome-based exclusion, no revision after outcomes, no tuning of the intervention; > 10 % excluded →
INVALID. Production `main.js` is not modified. The floor-OFF calibration (XFER-1 worlds 0–39) is non-confirmatory and sits outside
every study world.
