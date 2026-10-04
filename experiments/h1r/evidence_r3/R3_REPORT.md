# R3: configuration-scoped environment stream (D-3B)

**Date:** 2026-10-04. **Implementer:** Claude. **Authority:** Research Director ruling "R3 IMPLEMENTATION — CONFIGURATION-SCOPED ENVIRONMENT RANDOMIZATION". The rule itself is recorded in [`H1R_ERRATUM_R3_ENVIRONMENT_SEED.md`](../../../research/preregistrations/H1R_ERRATUM_R3_ENVIRONMENT_SEED.md).

**Not done:** H1-R was not run; no H1-R outcome was generated; no outcome comparison was computed or inspected; no scientific parameter was changed.

**Build:**

| Item | SHA-256 |
|---|---|
| Base | B2 `707cb1e` |
| `conformance_transform.mjs` | `cf30e20a71d59a67ba6163c55b94399d5d74f3b4609c6e3ea37e27080d5bfd5a` |
| `env_seed.mjs` (new) | `80caf09aae290bc77c9f370dfcaaa531490a2841df801505a31bb7faecdc136e` |
| `runtime.mjs` | `48844fc1cff6470bd9f72eb02c8db417ccb4fef1b56db3ba427cfb0ab3469771` |
| `run_h1r.mjs` | `0f93fea6842c4eff9b4a619fe2bb09a85e6743cb8cc56b1d5557da8147084616` |
| `measure.mjs` | `771dcb466c829e6c37eba6429ffef3a7c9e51540caf04af87813e51eaea9a81e` (unchanged from R2) |
| conformed `instrumentation/rng.js` | `289d9229a6a3cfff579ecffb4bea23205a19e9e11a2e3e8b6dbe70134a0a2cc0` (B2 blob `7d0c4ff`, before: `8ec69622…`) |

**Material:** the 41 historical G15 configurations (seeds 900030–900499) and agent seed 20260819000 only. No held-out configuration was generated. No confirmatory agent seed was run: seeds 20260819100–119 appear only as integers in the overlap arithmetic.

---

## 1. What changed

### 1.1 Semantics (the only one)

Under H1R, when a run carries a design position (agent seed, block, accepted configuration index), `initRng` seeds the `environment` stream with

```
envSeed = (0x60800000 + slot · 4096 · 0x6d2b79f5) mod 2^32
slot    = (agentSeed − 20260819000)·64 + blockCode·32 + acceptedConfigIndex
```

instead of `agentSeed XOR 0x5EED`. Consequences:
- every (configuration position, agent seed) owns a disjoint 4096-draw segment;
- every arm of that pair gets the same segment (there is no arm term);
- nothing else changes.

The draw site, the number of draws, the cognitive, visual and σ streams, configuration generation and every R1/R2 rule are untouched.

### 1.2 Files

| File | Change |
|---|---|
| `experiments/h1r/conformance_transform.mjs` | New edit **R3-ENV-SEED**, applied to `instrumentation/rng.js` (the fourth transformed file). It changes one line: `makeRng((G && Number.isInteger(__H1R__.envSeed)) ? __H1R__.applyEnvSeed(seed) : (seed ^ 0x5EED) >>> 0)`, keeping the B2 expression verbatim as the fall-back. The anchor and the `initRng` shape are checked, so the build refuses on any mismatch. |
| `experiments/h1r/env_seed.mjs` | **New.** The frozen constants, `envSlot` / `envSeedFor` (refusing outside the verified domain), and exact overlap arithmetic. Pure arithmetic: no generator. |
| `experiments/h1r/runtime.mjs` | `installH1R({ envPosition })` derives `envSeed`. `applyEnvSeed(seed)` records the application and **refuses** an `initRng` seed other than the position's agent seed. It draws nothing. |
| `experiments/h1r/run_h1r.mjs` | Requires `block` (`pilot` \| `heldout`); the position is (agentSeed, block, configIndex). It records the stream actually used (it overrides `run.js`'s asserted `rngSeeds.environment` and keeps that value apart) and adds 5 validity conditions (§3). |
| `experiments/h1r/run_one.mjs` | Recorder: optional `envBlock` / `envIndex`. The draw-check mirror uses the derived seed. It reports `envSeedLog`, `envDraws`, visual draws and `acceptedSeed`. |
| `experiments/h1r/verify_conformance.mjs` | R3 positions for the verification material; sets `driverRef` and `mutantR3`; gates R3-F, R3a–R3j, R3-DRV, R3-CAL, R3-AV; M5 re-pointed to `driverRef`. |
| `experiments/h1r/README.md` | R3 row, driver input, evidence table. |
| `research/preregistrations/H1R_ERRATUM_R3_ENVIRONMENT_SEED.md` | **New.** The §5.1 erratum for H1-R. |

**Verification positions.** The 41 diagnostic configurations form no design block, so configuration *p* takes:
- held-out index *p*, if *p* < 32 (seed 20260819000 is never a held-out-block seed);
- pilot index *p* − 22 (10–18), otherwise (the pilot and F-11 extension use indices 0–9).

These positions are disjoint from every design position.

---

## 2. Gates

Suite: `H1R_EVIDENCE=evidence_r3 node verify_conformance.mjs`. It made 469 single-process runs, 0 errors, and took 841 s. **Result: 71 PASS, 3 FAIL, 0 CONFLICT, 5 INFO.** All three FAILs predate R3 and keep R2's classification (§2.3).

### 2.1 R3 gates

| Gate | Result | Evidence |
|---|---|---|
| **R3-F** derivation exact | PASS | 1,920/1,920 domain slots equal the formula computed independently in the verifier; 6/6 out-of-domain positions refused |
| **R3a** same (config, seed), same stream in every arm | PASS | 41/41 configurations with all 7 arms on one stream. In 287/287 runs, `initRng` registered the expected seed exactly once, and every draw equals the mirrored derived stream (0 mismatches, 0 unattributed). The repeat and measurement sets use the same seed. |
| **R3b** different configurations, disjoint streams | PASS | 41 distinct seeds; 0/820 segment pairs overlap. Anti-vacuity: with H1R off, 3 configurations share 1 stream. |
| **R3c** full planned overlap proof | PASS | The 1,920 segments of the verified domain (seeds 000–009 and 100–119, both blocks, index 0–31) sit exactly slot·L draws after B, none with seed 0. They have 0 contacts with the 90 cognitive, visual and σ streams of those seeds; the nearest is 9,666,781 draws away. Reserves against measured maxima: cognitive 1,000,000 vs 89,317; visual 65,536 vs 3,020; σ 4,096 vs 304 (exact: the replica equals `makeSigma` for all 30 seeds). |
| **R3c2** no run touches its own configuration's generator | PASS | A `makeConfig` replica (exactly 756 draws) reproduces all 41 configurations. 412/412 positioned runs and 6/6 driver runs are clear of their own generator. |
| **R3d** OFF is B2 (static) | PASS | `rng.js` differs from B2 in one line (46); the fall-back is the B2 expression verbatim; G1′ PASS |
| **R3e** cognitive, visual and σ unchanged | PASS | With a position: cognitive (100,000 draws) and visual (65,536) equal `makeRng(seed)` and `makeRng(seed ^ 0x9e3779b9)`; environment equals `makeRng(derived)`; another agent seed is refused. Without a runtime, and with H1R on but no position, environment = B2. σ = B2 for 30 seeds. In all 412 positioned runs, cognitive and visual draws were recovered from the agent-seed streams. |
| **R3h** environment draws ≤ 4096 | PASS | Max over all runs 2,907. Structural bound: `RUN_TICKS` 3000 × 1 draw per tick = 3000. Driver flag 6/6. |
| **R3j** no new random draw | PASS (see §2.4) | `makeRng(` constructions in `rng.js`: 4 = B2's 4. No generator call or import in `env_seed.mjs` or `runtime.mjs`. Probe self-test true. R1e PASS. |
| **R3-DRV** the driver records the stream it used | PASS | 6/6: derived from (seed, block, configIndex), registered once, recorded; `run.js`'s asserted value kept apart |
| **R3-CAL** calibration over independent units (pre-declared \|z\| < 4, 14 tests) | PASS | Per arm, pooled over its 41 disjoint streams, \|z\| ≤ 2.12 in all 14 tests |
| **R3-AV** anti-vacuity | PASS | With R3-ENV-SEED reverted, the derived seed is registered in 0/3 runs and the derived mirror disagrees 2,785 times |
| R3c-INFO | INFO | See §4 (UNRESOLVED 2) |

### 2.2 R1 and R2 gates (ruling item 9)

| Gate | Result | Evidence |
|---|---|---|
| R1a–R1e, R1-AV | PASS | R1e: 821,318 draws = edge-attempt decisions (moves 422,115 + slips 351,101 + goal entries 48,102); max 1 per tick; equals the stream counter |
| R2a, R2c, R2d, R2e, R2-AV | PASS | Goal-entering attempts draw exactly once and can slip |
| **R2x** `u_k < p_e` exact | PASS | 87,257 goal-entering + 734,061 other outcomes checked against the mirrored **derived** stream: 0 mismatches, 0 unattributed |
| **R2b** pooled calibration, as declared | **PASS** (FAIL at R2) | Goal-entering z = −0.34, other z = −1.62. It failed at R2 (z = 6.18) because every configuration shared one stream (pseudoreplication). R3 removes that cause. |
| M1–M5, M-AV | PASS | M3: measurement neutral 21/21. M5: the driver reproduces the recorder run at the same position, 6/6, all validity conditions true. |
| H1, H2, G1′, X0 | PASS | Determinism 21/21; recorder neutral 21/21; OFF = B2 21/21; 469/469 runs completed |

### 2.3 FAILs that predate R3 (same classification as R2)

| Gate | Evidence | Classification |
|---|---|---|
| F2, and G15′ (which composes it) | 10/287 runs without a goal reach; no goal reward ≠ 12 | The gate contradicts frozen §9.4 ("never reaches goal in a run: included"). F2′ and G15′(9.4) PASS. The count depends on the stream: it was 4/287 under the shared stream. Arm labels are not reported. |
| P1 | A2 ≡ A5 on 7/41 configurations (it was 5/41) | The known A5 one-sided floor, an open preregistration decision. P2 and P3 PASS. |

### 2.4 R3j failed on first evaluation (my probe error)

On the first evaluation, R3j FAILED (`conformance_run.firsteval.log`, `conformance_gates.firsteval.json`). The only match was the text of the runtime's refusal message, `` `H1R R3: initRng(${seed}) does not match…` ``: a string literal, not a generator reference.

I corrected the probe rather than the message:
- it strips comments **and** string or template literals before scanning;
- it adds an explicit check that neither module imports `rng.js` or crypto;
- it adds a self-test: the probe must flag `makeRng(1)` and must not flag a message string.

The gates were then re-evaluated on the saved runs (`H1R_EVAL_ONLY=1`; no run re-executed, job definitions unchanged). `runtime.mjs` also imports the tree's `arms.js` dynamically for the arm predicates (pre-existing since the conformance round). The code check confirms it never references `makeSigma`.

### 2.5 Existing gates (`run_existing_gates.mjs`, 25 scripts × pristine / off / on)

- **OFF ≡ pristine on 25/25 scripts** (exit code, PASS count, every FAIL line and every verdict line).
- Pristine now ≡ pristine at R2 on 25/25.
- ON ≡ ON at R2 on 25/25 (608 PASS / 12 FAIL, identical FAIL lines; classified in R1/R2). The existing fixtures call `initRng` themselves with no design position, so under H1R they keep the B2 stream.

---

## 3. Proofs requested by the ruling

**OFF unchanged (FACT).**
1. Static: the conformed `rng.js` differs from B2 in exactly one line. Its condition requires `__H1R__.on` **and** an integer `envSeed`; its fall-back is the B2 expression verbatim (R3d).
2. Dynamic: the conformed tree without the runtime has the B2 fingerprint and cognitive draw count for all 7 arms (G1′ 21/21). All 25 existing gate scripts are identical to pristine.
3. Unit: without a runtime, `initRng` gives environment = `makeRng(seed ^ 0x5EED)` exactly (R3e).

**Stream non-overlap (FACT).** Exact BigInt arithmetic on the mulberry32 cycle (`env_seed.mjs`, `overlapProof`):
- every domain slot starts exactly slot × 4096 draws after B, so the 1,920 segments are pairwise disjoint by construction, and this is checked;
- 0 contacts with any cognitive, visual or σ stream of the 30 domain seeds, under reserves above every measured consumption;
- each run's draws stay inside its segment (≤ 3000 < 4096, structural, and checked as a validity condition);
- each run's segment is clear of its own configuration's generator (checked per run).

**Within-configuration arm pairing (FACT).** For all 41 configurations, all 7 arms:
- registered the same derived seed exactly once (runtime log);
- had every environment draw equal to the k-th value of an independent mirror of that seed (R3a, R2x).

So every arm consumed the identical uniform sequence. As before R3, the sequence is shared by attempt order, not by edge: once the arms' trajectories diverge, the k-th draw falls on different edges.

**No H1-R outcome generated (FACT).**
- Every run used ERR-09 diagnostic configurations with agent seed 20260819000, which is refused for H1-R experimental use.
- The 6 driver runs used the same material, digest-only.
- A pre-suite smoke test (3 recorder runs and 1 driver run on configuration 900074/1, seed 000) reported fingerprints and stream facts only.
- No pilot or held-out configuration was generated; no confirmatory seed was run.
- The only outcome-adjacent numbers are the pooled counts that gates F2 and P1 report by design (§2.3).

---

## 4. Classification

**FACT**
1. R3 changes only the seed of the `environment` stream, and only for H1R runs that carry a design position. Every other stream, rule and parameter is unchanged (R3d, R3e, R3j, G1′, existing gates).
2. Same (configuration, agent seed) gives the same stream in all arms; different configurations get disjoint streams. The whole verified domain is overlap-free against the agent streams (R3a, R3b, R3c).
3. `u_k < p_e` stays exact under the derived stream (R2x, 821,318 draws).
4. The R2 calibration gate R2b, which failed through pseudoreplication, now passes as declared, and calibration over independent units passes in all 14 arm × class tests.
5. The verified domain is agent seeds 20260819000–009 and 100–119. Over the full range 000–119 the lattice **does** touch σ streams of the unregistered seeds 054–055, so those seeds are refused, not merely unverified.

**INFERENCE**
1. Within an agent seed, configurations no longer share environment noise, so configuration-level summaries are no longer coupled through the environment. The cognitive stream, boot embeddings and σ are still shared within a seed by design, so the crossed (configuration × seed) structure remains for D-3.
2. The changes in F2 (4 → 10 runs) and P1 (5 → 7 configurations) are realisation effects of the new streams on the same mechanisms, not new failure classes. The mechanism gates that bear on them (F1, F2′, P2, P3) pass.

**UNRESOLVED**
1. **Crossed-factor analysis (D-3)** is still open; R3 does not decide it.
2. **Configuration-generator contacts (R3c-INFO).** Among candidate seeds 893000–894999 and 900000–909999, 27 generator segments touch a domain environment segment, 10 of them at planned held-out positions. This matters only when the touched configuration is the one actually accepted at that position. Held-out acceptance is sequential and has not been generated, so that cannot be checked in advance. It is enforced per run instead (`envSegmentDisjointFromConfig`), and a violation would make that run invalid. INFERENCE: the per-run probability is about 1 × 10⁻⁶.
3. **Pre-existing, not R3:** whether a seed's **cognitive** stream touches the generator of a configuration it is run on. The frozen design never examined this, and R3 does not change it.
