# H1-R MS-1 — measurement instrument: implementation and verification report

**Authority:** Research Director, "MS-1 is APPROVED" (2026-10-05). The work stays within the frozen H1-R v1.0 (SHA-256 `c52e7337…a836`, byte-unchanged), D-019 as amended by D-022, and D-020.
**Scope:** an engineering milestone only.
- Not built: `analyze.js`, Stage 1, Stage 2, the orchestrator, registry generation, and any new scientific metric.
- No change to any hypothesis, arm, reward, topology, RNG, window, exclusion or verdict rule, or to the preregistration.

**Material:** diagnostic only.
- The 41 historical G15/ERR-09 configurations (900030–900499), with agent seed 20260819000.
- No pilot, held-out or confirmatory seed was used.
- Every number below is a count or a digest. **None of it is scientific evidence.**

**Build:** B2 `707cb1e`. Conformance transform SHA-256 `02ccbf382ad7da5dd0a97e010081f025971263b2ad1af507c80d070fc0116346` (was `cf30e20a…` at R3).

---

## 1. What was implemented (the seven MS-1 items)

| # | Item | Implementation |
|---|---|---|
| 1 | S6 score probe and N5′ pinned sink | **M-SCORE:** the single pinned line before the clamp-return in `render/scoring.js` (D-019 §2).<br>**Sink:** `measure.mjs` `createMeasure()` reads no global and imports only `node:crypto`. Its `score` is byte-exact `score(f, t) { S.push(f, t); }`.<br>**Binding:** `measure_install.mjs` makes it an own, non-writable, non-configurable data property holding a frozen non-Proxy object. It is verified at installation (the driver refuses to start otherwise) and again at the end of the run. |
| 2 | Candidate and shadow probes | **M-CANDIDATE** (after each candidate-loop push) and **M-BEST** (after `const bestChoice = sorted[0];`), in `main.js`.<br>**`shadow.mjs`** does the following:<br>• pairs score k with candidate k;<br>• recomputes argmax₁ with the agent's own comparator;<br>• reconstructs the A1 weight;<br>• computes the v1.0 §8 shadow weight: T → 0.5 in F and in `arbitrate`'s confidence score (each −t), clamp re-applied, 60/40 blend as in `main.js`. |
| 3 | Decision and replay flags | **M-DECISION** fires at the step-0 selection write; **M-REPLAY** fires in the replay branch, next to the E6 flag. Per-tick flags: D (decision), R (replay), N (neither = no-commit). |
| 4 | Per-attempt and reset forwarding | `runtime.mjs` `attachMeasure()`:<br>• per environment draw, it records edge, outcome, goal-entering flag, and the raw store attempts and successes of the key just before the attempt;<br>• `episodeBoundary` forwards every goal and cap reset. |
| 5 | `runAgentLoop` entry snapshot | **M-LOOP** is the first statement of `runAgentLoop`. The τ = 1499 snapshot is taken at the entry with 1,505 completed calls. The final snapshot is taken after `runOnce`. Each entry is `[key, a, s, raw attempts within the phase]`. |
| 6 | A5 floor-binding counter | **M-FLOOR**, inside the `updateBehavior` branch in which the aggregate floor raises `confidenceState` (`render/behavior.js`). |
| 7 | Fork mode in `run_h1r.mjs` | `"fork": { "call": t + 5 \| null, "to": "A2" }`, arm A1 only. **M-FORK** is the first statement of `runAgent`. Immediately before that call, the frozen `arms.configure()` switches the arm to A2. `call: null` arms the hook without a switch. `prefixAt` reports digests of all records of the calls before a cut. |

**Driver:** `run_h1r.mjs` implements `measurementClean` exactly as D-020 pin 3 lists it:
- reward record;
- per-tick records;
- per-attempt records;
- resets;
- score/shadow records;
- both snapshots;
- floor counter;
- fork switch.

Instrument integrity (sink binding at end, N6b, argmax, reconstruction, snapshot placement, non-finite and clamp counts) is reported in a separate block. The driver computes no flip, calibration or advantage statistic; that is `analyze.js`'s job.

**Verification code:**
- `verify_conformance.mjs`: the MS, FORK and G16′ gates, and M4 extended to every probe;
- `verify_ms1_unit.mjs` (new);
- `verify_existing_equivalence.mjs` (new);
- `run_existing_gates.mjs`, which now records every assertion line;
- `run_one.mjs` and `verify_hook.mjs`: the independent recorder, with insert-only `loop()` and `floorCheck()` hooks.

## 2. Blocking gates (every one PASS)

| Required gate | Result | Evidence |
|---|---|---|
| **N1** text | PASS | One tagged line equal to the template, immediately before the return. Stripped SHA-256 = B2 `4a133166…66d5` (`ms1_unit.json` N1; `conformance_gates.json` G16′) |
| **N2** form | PASS | Reads `finalWeight` and `trustBonus`, makes one call, assigns nothing, names no other identifier. S4 and G9 are clean OFF and ON (N2-S4G9) |
| **N3** inert when absent | PASS | G1′ 21/21. OFF ≡ pristine on all 25 scripts, apart from G16.4a2–a6 (**see §4, first evaluation FAILED**) |
| **N4a** unit neutrality | PASS | 12,000 input sets at identical RNG state: return, `lastArbitrationBreakdown` and the next draw of every stream are identical, with 0 mismatches |
| **N4b** run neutrality | PASS | 21/21 (7 arms × 3 configurations): fingerprint and cognitive, visual and environment draws identical with and without the measurement layer |
| **N5′** pinned sink and binding | PASS | Static: byte-exact, `S` private, Node built-ins only, no global. Installation: descriptors, frozen, not a Proxy, function identity. Overwrite, redefinition and `score` replacement are all refused. Binding unchanged at the end of 353/353 measured runs |
| **N6a** pre-clamp fidelity | PASS | Oracle = B2 `scoring.js` with only line 451 changed to `return finalWeight;`. SHA-256 `7cca1635bd8b87657c0c654266c9a71d32119deceb72212ed2339c752b769a2a`, written outside every run tree. 12,000 sets, 2,000 with F > 400 and 2,000 with F < −400: 0 mismatches |
| **N6b** clamp consistency | PASS | Unit: 0/12,000. Runs: 11,581,679 scoring calls, `Object.is(clamp(F), returned)` 0 mismatches. Term = 12·(T − 0.5) with T captured at `__M7_ARMS__`: 0 mismatches; pairs = E3 deliveries in 287/287 runs |
| **N7** anti-vacuity | PASS 8/8 | (a) probe after clamp: N1, and N6a only above \|F\| = 400 (4,000 mismatches, 0 in range)<br>(b) assigning probe: N2, N1, and N4a (8,000)<br>(c) RNG-drawing probe: N4a RNG position (12,000) and N2<br>(d) second tagged line: N1, and 24,000 pairs for 12,000 calls<br>(e) transform when \|F\| > 400: N6a above 400 only, N5′ static and installation<br>(f) accessor and Proxy: N5′ installation, N6a<br>(g) arm-conditioned sink: N5′ source pin, static and installation<br>(h) run-conditioned sink: N5′ source pin, static and installation |
| **G16′** | PASS | N1 items; stripped file = B2; `verify_G16.js` G16.4a1–a6 all PASS on the stripped text |
| **G1′** | PASS | 21/21 fingerprint and draws = B2 with the runtime absent |
| **OFF ≡ pristine** (existing gates) | PASS | N3 over 33 (script, run) pairs from 3 independent runs. N3-REFL and N3-AV pass. The R1–R3 form of the check: 24/24 |
| **Full conformance suite** | PASS (every blocking gate) | 91 PASS / 3 FAIL / 0 CONFLICT / 6 INFO on 487 runs, 0 errors. The 3 FAILs (F2, G15′, P1) are v1.0 §11's non-blocking set, unchanged from R3 |
| **R3 suite** | PASS | R3-F, R3a, R3b, R3c, R3c2, R3d, R3e, R3h, R3j, R3-DRV, R3-CAL, R3-AV |
| **Recorder reconciliation** | PASS | REC1: 862,435 calls; 793,093 D, 69,342 R, 0 N; 0 mismatches.<br>REC2: 821,318 attempts = envDraws; edge, outcome, goal flag and prior (a, s) 0 mismatches.<br>REC3: 49,350 resets (48,102 goal, 1,248 cap) = recorder = runtime; 0 mismatches.<br>MS-FLOOR: 203,989 raises, call by call = the recorder's recomputation; 0 mismatches. M1/M2 unchanged: 470,217 events, 0 mismatches |
| **Shadow checks** | PASS | Recomputed argmax = `bestChoice` in 2,966,562 sorts (793,093 at step 0); 0 mismatches. A1-weight reconstruction: 0 mismatches over 3,049,156 step-0 candidates. **0 flips in every A2 and A5 run** (82 runs) |
| **Snapshot placement** | PASS | 287/287:<br>• τ1499 snapshot at 1,505 calls, at `runAgentLoop` entry 301 of 601. Entry 0 is `pressSpace`'s untimed loop, so entry 301 is run.js loop l = 300;<br>• env phase already 2;<br>• store and raw counts equal the recorder's (0 mismatches);<br>• final snapshot at 3,005 calls equals the live store.<br>Anti-vacuity: in 23/287 runs, the store one step later (at M-STEP of call 1505, after the loop's `decayTrust`) differs |
| **Fork gates** | PASS 3/3 | FORK-1: a no-switch fork = the original (fingerprint and every record), 3/3.<br>FORK-2: a switch at call 0 = the A2 run (fingerprint and every record), 3/3.<br>FORK-3: forks at calls 705, 1505 and 2985 equal the original on every record before the switch, 9/9.<br>FORK-AV: every configuration diverges within 25 calls of some switch.<br>FORK-E: A1 and A2 agree on every frozen arm predicate except E3 and E4 |
| **MS-CLEAN** | PASS | 24/24 driver runs, forks included, are valid with `measurementClean` true; instrument integrity holds in every one |

## 3. Required reports

**1. Non-finite `finalWeight`:** **0**.
- 0 of 11,581,679 pre-clamp scoring calls in the 287 diagnostic runs, and 0 of 937,559 in the 24 driver runs.
- The trust term is never non-finite either.

**2. ±400 clamp binding:**
- **76,112 of 11,581,679 calls (0.66 %)** in the 287 runs; 7,823 of 937,559 in the driver runs.
- Every binding is at +400 (F > 400). F < −400 never occurred in the diagnostic material; the lower bound is covered by the unit oracle's 2,000 forced sets.
- Per arm: A1 10,451; A2 14,399; A3 0; A4 12,414; A5 13,746; A6 14,251; A7 10,851.

**3. Measurement-sink integrity:**
- N5′ was verified at installation in every run (`installMeasure` throws otherwise).
- The binding was unchanged at the end of 353/353 measured runs.
- Tampering is refused (unit), and the N7 e–h sink and binding attacks are all caught.

**4. RNG-position neutrality:**
- N4a: the next value of the cognitive, visual and environment streams is identical in 12,000/12,000 sets.
- N4b and M3: fingerprints and every stream's draw count are identical, 21/21.
- MS-1 draws nothing: R1e and R2x show 821,318 draws = edge attempts; R3j and M4 find no generator reference.

**5. OFF / pristine equivalence:**
- G1′ 21/21.
- Existing gates OFF ≡ pristine on all 25 scripts, except the classified G16.4a2–a6 (§4).
- ON failures are exactly the classified set: 603 PASS / 17 FAIL — the R3 set (12) plus G16.4a2–a6 (5).

**Cross-round neutrality (additional):** all 469 runs that can be compared with R3's committed `evidence_r3/runs.json` have the same fingerprint, cognitive draws and environment draws. That is every set and arm, with and without the runtime and recorder. MS-1 changed no agent behaviour.

## 4. Disclosure: N3's first evaluation FAILED, and how it was resolved

- **What failed.** I wrote a new N3 comparator for MS-1, stricter than the R1–R3 form (exit code, PASS count, FAIL lines). It required every assertion line's text to be identical between OFF and pristine.
  - On first evaluation it failed on six lines of four scripts: `verify_determinism` D4, `verify_S1prime` S1.7′(2)/(4), `verify_S2` S2.3 and `verify_G16` G16.3′(3)/(4). These are all PASS lines whose detail counts differed.
  - The exit codes, assertion IDs and verdicts were identical.
  - The first evaluation is kept: `existing_equivalence.firsteval.json` and `.log`.
- **Diagnosis (FACT).** These detail texts are not reproducible on the unmodified B2 tree:
  - `verify_S1prime.js:69`, `verify_G16.js:167` and `verify_S2.js:19–42` draw their contexts from unseeded `Math.random()`;
  - D4 reports the deliberately non-deterministic wall-clock control build (`verify_determinism` C1 requires that build to give more than one fingerprint).
  - Two further independent runs of the four scripts (`n3_repeat_a/`, `n3_repeat_b/`) show the same lines differing pristine against pristine, and OFF against OFF.
  - A relation that fails pristine against pristine cannot define "OFF ≡ pristine". The defect was in the new comparator, not in the instrument.
- **Resolution.** N3 now requires:
  - the same exit code;
  - the same assertion IDs, in the same order, with the same verdicts;
  - the exact same text for every line that is reproducible between independent pristine runs.

  Which lines are not reproducible is determined from pristine runs only, never against OFF. Those lines still need the same ID and verdict. The result:
  - N3: 33 (script, run) pairs, no difference outside G16.4a2–a6;
  - N3-REFL: reflexive on independent pristine runs;
  - N3-AV: detects a changed verdict (S2 ON), the unexempted S6 lines, and an altered reproducible line;
  - N3-HIST: the R1–R3 form of the check, identical on 24/24.
- **For the Director:** this changes my own new verifier, not N3's frozen text. The R3j precedent applies: a first-evaluation probe defect, disclosed, fixed and re-evaluated. The relation is still stricter than every earlier evaluation of OFF ≡ pristine.

## 5. Interpretations and remaining uncertainties

1. **D-020 pin 2, "loop 300".** The snapshot is taken at `runAgentLoop` entry index 301 of 601. `pressSpace` runs one untimed loop (calls 0–4) before run.js loop l = 0, so entry 301 is l = 300, with exactly 1,505 completed calls and phase 2. The pin's "1,505 completed calls" fixes it unambiguously; MS-SNAP checks both.
2. **D-020 pin 3, "score/shadow records … all finite"** is applied to the step-0 records, as the pin's own scope says ("one per step-0 candidate"). Non-finite F on non-step-0 calls is counted and reported separately; it was 0.
3. **The fork switch** is `arms.configure({ arm: 'A2' })` immediately before call t + 5. That switches the E3 and E4 deliveries (A1 and A2 differ in nothing else, FORK-E). `runAgentLoop` pre-work that precedes call t + 5 at a loop boundary runs under A1; E3 and E4 are read only inside `runAgent`. FORK-2 shows that a switch at call 0 reproduces A2 exactly.
4. **The runtime imports** the tree's `render/trustMemory.js` and `experiments/m7/env.js` dynamically, only when the measurement is attached. These are the same module instances `run.js` uses. It reads the trust maps, `getCounters()` and `getPhase()`; it writes nothing and draws nothing. R3j's literal-import check still passes. The preloaded runtime used by the existing gates attaches no measurement.
5. **Record size.** A full (non-digest) driver record is 3.24 MB, 94 % of it the step-0 candidate groups. At S* = 20, Stage 2 has 4,200 runs, about 14 GB. Storage is a decision for the orchestrator (not part of MS-1); the instrument's output is complete.
6. **Diagnostic facts, not evidence.**
   - In this material no tick is a no-commit tick (0 N flags).
   - A4's store stays empty, because FROZEN starts cold, so its delivered T is 0.5 and its shadow is trivially exact.
   - A3 has 0 clamp bindings.
   - Flip counts (anti-vacuity only): A1 421, A3 2,289, A6 460, A7 638; A2, A4 and A5 0.
7. **Non-blocking FAILs** (v1.0 §11), unchanged from R3:
   - F2 and G15′ as originally declared: 10 of the 287 runs never reach the goal, and F2′ and G15′(9.4) pass;
   - P1: A2 ≡ A5 in 7 of 41 configurations.
8. **Still to come (v1.0 §9 items 8–10, D-021):** `analyze.js`; Gemini's independent §12–§14 implementation (D-021(b)); the orchestrator; and the registry records. None was started.

## 6. Status

**READY FOR ANALYZE.JS.**
- All seven MS-1 items exist.
- Every blocking gate the authorisation names passes on the diagnostic material.
- The one first-evaluation failure (N3) is diagnosed as a verifier defect, resolved with a relation that is stricter than every earlier evaluation, and disclosed above for Director review.

`analyze.js` was not started.

## 7. Reproduce

```bash
node experiments/h1r/verify_ms1_unit.mjs
```

```bash
node experiments/h1r/verify_conformance.mjs
```

```bash
node experiments/h1r/run_existing_gates.mjs
```

```bash
node experiments/h1r/verify_existing_equivalence.mjs
```

Each needs `H1R_EVIDENCE=evidence_ms1`. The N3 repetitions are `run_existing_gates.mjs` with `ONLY=verify_determinism.js,verify_S1prime.js,verify_S2.js,verify_G16.js` and `H1R_EVIDENCE=evidence_ms1/n3_repeat_a` (then `_b`). Tree paths in the evidence are written as `<tmp>/mfw-h1r/…`.
