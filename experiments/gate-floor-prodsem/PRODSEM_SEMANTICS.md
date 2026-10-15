# GATE-FLOOR-PRODSEM — what each harness switch does at HEAD (Phase 1 record: read-only)

Audited runtime: commit `0df804c497e649affb9e7ebacb10fdc81ab6de8d` (runtime files unchanged through the freeze commit's parent).
Everything below was established on scratch copies of the pinned trees; nothing in the repository runtime was modified. FACT =
read from source or measured; INFERENCE = derived, stated with its basis; UNKNOWN = not established.

## 1. The complete list of harness-global consumers in the runtime (FACT)

The runtime (`main.js`, `render/*`, `instrumentation/*`) never imports `experiments/m7/env.js`; the configuration reaches it only
through `__M7_GOAL__`. The gate (`verify_gatefloorprodsem.mjs` §D) pins each row as a source assertion.

| global | read at (HEAD `main.js`) | effect when defined | `runOnce` defines it when | product |
|---|---|---|---|---|
| `__M7_ENV__` | 5014–5020 | `_m7Traversed = env.attempt(from,to)` (Bernoulli draw, legal edges only, never a goal-entering move) | `envMode === 'on'` | undefined: always `true` |
| `__M7_CREDIT__` | 4473, 4675, 5040–5044 | bypasses the legacy attempt and episode-success credit sites; credits `u→v` at the traversal site for real edges only | `creditMode === 'on'` | undefined: legacy sites live |
| `__M7_PE__` | 4157–4160, 4215–4217 | `learningAuthority ≡ 1.0`, `dampQ` disabled | arm ≠ OFF and `pin === 'on'` | undefined: raw authority, `dampQ` fires above 0.20 |
| `__M7_ARMS__` | 2296, 3550 | `bayesianTrustFor` / `aggregateTrustFor` | always (identity for arm OFF and A1) | undefined: raw |
| `__M7_EPISODE_CAP__` | 3268 | 150-tick cap, random restart | **unconditionally** | undefined: no cap |
| `__M7_REPLAY_ONCE__` | render/episodeManager.js:505 | presence-based replay cooldown | **unconditionally** | undefined: 4 s wall clock |
| `__M7_GOAL__`, `__M7_TEL__` | 1139, 3255, 3473 | goal transport; telemetry (call-only) | goal always | — |
| `__MFW_STEP_LEDGER__` | 4047 | **changes the reward computation** | never | undefined |

## 2. Hook states (declared in `config.mjs` `HOOK_STATES`)

| state | arm / envMode / creditMode / pin | meaning |
|---|---|---|
| H | A1 / on / on / on | blocks of every earlier milestone |
| E | A1 / off / on / on | the literal "environment OFF": E2 credit and the PE pin remain; **no product code path reaches it** |
| **P** | OFF / off / off / off | every M7 *semantic* hook undefined — the product's own hook state (cap, replay-once, goal transport retained) |
| Ppass | P + `__M7_ENV__ = {attempt: () => true}` | control |

## 3. The five questions (as asked)

| | classification |
|---|---|
| (a) every attempted legal traversal succeeds | FACT (source + measured: traversal record `a == s` on every edge, max learned cost 1.00, env counters 0). Goal-entering moves and non-graph pairs take no draw in H either, so removing the environment does not change them. |
| (b) draws removed without disturbing other RNG streams | FACT: `environment` stream drawn only inside `env.attempt` (env.js, exactly one `liveRng('environment')`). Visual draws identical across H/E/P (3,020); cognitive draw counts differ through trajectories only. INFERENCE: pairing inside one state is exact. |
| (c) scoring, FutureScore V2.3, legal-edge guard, intervention preserved | FACT: same source; `__M7_ARMS__` identity. FutureScore: learned cost `ĉ = (a+1)/(s+1) = 1` ⇒ `FS(k|g) = −d(k,g)` ⇒ `futureBonus = 20·4/(4+d)`. INFERENCE (high): equals production, where no traversal fails (main.js 5051–5053 calls the harness-off record "the declared V2.2 D23 limitation"). |
| (d) Q-learning / credit / episode storage / learning order | FACT: the environment flag alone changes none of them; **E is not production** (keeps E2 credit and the PE pin). Measured E vs P (6 dev worlds, COLD): attempt keys 61 vs 133, credit keys 61 vs 0, PE hook calls 1,318/1,173 vs 0, Q sum 833.7 vs 806.8. Episode storage: same code path, same source, mean quality 0.85 in H/E/P. UNKNOWN: which of credit vs PE drives the E–P outcome difference. |
| (e) goal resets, termination, counters | FACT: reset logic reads only `next === goalNeuronId`; the `_goalResetJustHappened` branch skips draw and credit in every state; the cap and replay-once are armed in all four states; `legal + non-graph == all resets` holds in every measured session (96/96 in the hook-state matrix, 360/360 in the calibration). Counters `attempts/successes/slips`, env counters: 0 or null. |

## 4. Measurements (scratch; floor OFF; none is a confirmatory outcome)

* Neutrality (6 XFER-1 dev worlds × {no store, goal-entry store} = 12 sessions per state): bare HEAD == measured-OFF == armed-OFF
  in 12/12 for each of H, E, P, Ppass; P == Ppass in 12/12. Compared: decision sequence, attempt/success/credit keys, env counters,
  Q entries/sum, cognitive/visual draw counts, end-brain hash.
* Behaviour per state (COLD, 6 dev worlds, 1,500 calls): resets H 440.5 / E 419.0 / P 441.0; legal 279.3 / 356.0 / 391.5;
  non-graph 161.2 / 63.0 / 49.5; slips 328 / 0 / 0.
* Floor-OFF calibration under P, 40 dev worlds: see `results/calibration_summary.json` (ENTRY_NR +82.0 [58.9, 105.8]; REAL +2.3
  [−27.8, 31.6]; paired SD 98.4 / 77.6 / 84.4; non-graph share of COLD resets 18.3 %). The H column reproduces the committed
  GATE-FLOOR-HEAD calibration exactly.
* Intervention integrity under P (dev worlds 1, 2): two floor-ON runs bit-identical; the floor table holds only goal-neighbour →
  goal edges; `lowered = 0`; non-legal goal candidates returned unmodified.

## 5. UNKNOWN (carried; not resolved by this study)

Effect of the missing production cap and of the wall-clock replay; production goal / start distribution (the harness goal set is
{8, 12, 16, 19}); the mechanism by which the legacy stale-keyed credit interacts with the floor (the outcome is measured, the
mechanism is not claimed); behaviour beyond 1,500 calls or after Phase II.
