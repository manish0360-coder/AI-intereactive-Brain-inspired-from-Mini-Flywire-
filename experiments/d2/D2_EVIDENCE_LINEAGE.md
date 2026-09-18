# D2 — FutureScore identity repair: evidence lineage

**Milestone:** D2 · **Base:** M38 `727b219` · **Gate:** `node experiments/d2/verify.js` (20/20)

D2 establishes **substrate correctness of the FutureScore identity path only**. The production
decision path now supplies the graph node identity FutureScore expects. The mechanism produces
non-zero values on the existing 20-node substrate. Its contribution reaches candidate scoring and
the chosen move. The negative control reproduces the pre-repair defect.

It does **not** establish that FutureScore improves cognition, planning, learning or engineering
performance. That is the next experiment's question.

## Defect and repair

`render/planning.js:357` started the `futureScore` DFS at `neuron.id`, the THREE `Object3D` counter
(5, 9, 13, …, 81 in the headless build). Every lookup inside the DFS is keyed by the graph id
`neuron.userData.id` (1–20): `findNeuronById`, `userData.neighbors` and the `"a->b"` reward keys.

- Neurons 5–20: the lookup found nothing, so `futureScore` returned exactly 0.
- Neurons 1–4: it scored the **wrong** neuron (1→5, 2→9, 3→13, 4→17).

**Repair, one line:** `neuron.id,` → `neuron.userData.id,`. No other production byte changed.

## Transition of historical source pins

These historical checks pin the pre-repair bytes of `render/planning.js`, or measure the D2 defect
itself. They were **not edited**. They remain the record of their own bases, and they now report
the authorised repair:

| Historical check | Base | What it binds | After D2 |
|---|---|---|---|
| `experiments/m38/verify.js` G1, G2 | `6b67c55` | planning.js bytes; production-path diff | rejects: G2 lists exactly `["render/planning.js"]` |
| `experiments/m34/verify.js` P2 | `73c12d9` | 25 protected files incl. planning.js | rejects: `["render/planning.js"]` |
| `research/preregistrations/verify_m37.js` I2 | `c8db982` | 17 protected files incl. planning.js | rejects |
| `research/preregistrations/verify_m38_p0.js` I2 | `9f07464` | 11 protected files incl. planning.js | rejects |
| `research/preregistrations/verify_m35.js` `futureScoreCost`, `d2Measured` | live tree | measures the D2 defect (0 / N non-zero) | rejects: the defect is gone |
| `experiments/phase1_0/verify_S3.js` S3.2 / S3.6 | live agent | stale-execution counts of the pre-D2 agent | S3.2 FAIL→PASS (67→26 becomes 67→0); S3.6 PASS→FAIL (else-branch residual now eliminated); 8/9 either way, measured idle on both sources |

Checks that were already failing before D2 on their own "only milestone files changed since base"
premise (M34 P1, M37 I1/I4, M38-P0 I1/I4) are unchanged in kind.

**Successor binding:** `experiments/d2/verify.js` S1 pins `render/planning.js` to the `727b219` bytes
with exactly the defect line replaced (sha256 `9f286d73e3e6a880…`). S5 asserts that the historical M38
gate rejects the repair only through its two planning.js pins.

## Known verification limitation (not a D2 defect)

`main.js` reads `Date.now()` in decision- and learning-relevant throttles:

- `episodeManager.js:511–512`: 4 s replay cooldown; each replay also draws `liveRng`.
- `schemaMemory.js:133`: 15 s schema rebuild; feeds `schemaBonus × 15` in the final score.
- `episodicContextEngine.js:295`: 800 ms context-shift cooldown; each new episode id also draws `liveRng`.

Seeded 300-tick runs of the same source therefore diverge after about 780–990 decisions:

| Condition | Fresh processes | Distinct outcomes |
|---|---|---|
| idle, sequential | 6 | 3 |
| concurrent | 4 | 4 |
| `Date.now` frozen by an outside wrapper (diagnostic only) | 6 sequential; 4 concurrent | 1; 1 |

A frozen clock removes the divergence but changes semantics, because the throttles stop cycling. It
was therefore **not adopted**, and no production clock behaviour was changed. The D2 gate's N3 checks
that a fresh process reproduces the D2 assertions: the unit fixture, graph identity on every live call,
and the first differing score and move against the ablation (call 0 and decision 4). It does not
check whole-run byte identity. N2 still compares whole PRE and REVERT runs and inherits this
limitation.

**Consequence for the next experiment:** a behavioural FutureScore comparison longer than about 780
decisions is not seed-reproducible until this is resolved by a separately authorised decision.

## Seeds and configurations

Registered seeds and configurations touched: **0**. `experiments/m7/env.js` is never imported. The
only agent seed used is the pre-existing Phase 1.0 development fixture `20260818`. C1, UQ-B, their raw
data, preregistrations, registries and the M38 substrate are byte-identical to `727b219` (gate S3).
