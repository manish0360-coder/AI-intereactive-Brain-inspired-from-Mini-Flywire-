# CREDIT-1: consolidated freeze-review package (review round 4)

**Status:** prepared on 2026-10-27 by Claude, the repository investigator and implementer.
- **Not yet reviewed by Gemini.** This is the package to be reviewed.
- **Read-only.** No freeze, no confirmatory session, no code or runtime change, no registry change, no push.
- **Option (a) is provisional.** It is the owner's proposal for independent review, not a final scientific or governance decision.
- **Means withheld:** development-world mean effects are not in this package, deliberately.

**Labels used throughout:**
- **FACT:** verified against code, gate output or run records named here.
- **HYPOTHESIS:** a proposed explanation, not demonstrated.
- **ASSUMPTION:** taken as true but not demonstrated.
- **UNRESOLVED:** an open question or known gap.

---

## 0. Instructions for the reviewer

**What you can see.** You have no repository access. Everything you need is quoted here, with hashes so the owner can check authenticity. Ask the owner for any file or record you need.

**Return:**
1. a verdict per item: **VERIFIED**, **CONCERN** (non-blocking) or **BLOCKER** (must be resolved before freeze), for every section-9 question and every row of the section-7 table;
2. for each CONCERN or BLOCKER: the evidence, a concrete failure scenario or counterexample, the missing test, and whether resolving it needs a design revision;
3. an overall verdict: **READY TO FREEZE** / **READY TO FREEZE WITH CONDITIONS** (list them) / **NOT READY** (list the blockers).

**Rules:**
- Do not propose weakening an existing invariant to obtain a pass.
- Under the reviewed protocol, calibration may change only n.
- Any other change is a design revision for the owner, made before freeze.
- Development-world effects must not be used to choose hypotheses, arms, margins, estimands or claims.

---

## 1. Where the study stands

**Design, reviews, protocol and claim limits:**
- **Design:** `experiments/credit1/DESIGN.md`, revision 2, sha256 `c41c98ae7d72526b…`, unchanged.
- **Reviews:**
  - round 1: design, revised to r2;
  - round 2: READY FOR IMPLEMENTATION MILESTONE;
  - round 3: implementation, instruments and calibration, READY WITH CONDITIONS.
- **Primary family** (DESIGN §6.3–6.7), the outcome being legal goal reaches per 1,500-call test session with the map off:
  - P1 = N1A − N0A;
  - P2 = (N1A − N0A) − (N1L − N0L);
  - Bonferroni-2 (each claim at 97.5 %), margin δ = 20, decision grid R1–R8.
- **Claim limits** (DESIGN §6.9): claims concern re-keying the existing credit writes (arm A) as a whole, in this simulator. They never license cognition, map-free reasoning, transfer, or production readiness.

### Round-3 conditions and their status

| round-3 condition | status (FACT) |
|---|---|
| [CRITICAL] I-LEDGER must key-check pipeline writes | **Fixed** in `c66d589`. Validated on real sessions: 23,898 replay-pipeline writes in the swap-parity run, plus every pipeline write in the final calibration run, 0 rejected. |
| [HIGH] swapped-store delivery parity (N1A×) | Harness built in `9d350c6`, authorized in `cb7e015`, run as `swap-20261027-cb7e015`: **20/20 pairs identical** (N1A× and N1L×). |
| [HIGH] seed and territory logging | **Not done.** An owner decision (section 7, B2). |
| [MEDIUM] G0.4 line endings in fresh Windows clones | **Not done.** Section 7, B8. |

### Commits since round 2
- **Pushed:** `5f6cccd`, `f9f45ac` (`origin/main` = `f9f45ac`).
- **Local only, owner-authorized, not pushed:**
  - `9e133bd`: calibration harness;
  - `c66f830`: calibration-only lock;
  - `8f67a8d`: D-0 export comparison and the G8.1 scope;
  - `c144130`: 64-frame ledger stack capture;
  - `c66d589`: pipeline-key validation;
  - `9d350c6`: swap-parity harness, lock `null`;
  - `cb7e015`: swap-parity authorization record. This is HEAD.

**Gate at HEAD (FACT):** 95/95 checks, 215/215 mutants, 0 sessions.

---

## 2. Reproducibility finding (FACT)

### 2.1 Definitions
- **Within-run stability:** sessions compared inside one run, under the same load and timing regime. This is what the protocol tests: D-0 (the same LEARN-0-tree session twice), D-1 (LEARN-0 tree vs CREDIT-1 tree with the switch absent), D-2 (switch off vs absent) and swap parity.
- **Cross-run reproducibility:** the same planned session, identical inputs, executed in separate runs at different times and under different machine load. **No protocol step tests this.** It was found by an extra comparison made after the final run.

### 2.2 The runs compared
All on the same 364-session plan, the same configurations and seeds, the same trees, `--workers` as stated:

| run | commit | workers | result |
|---|---|---|---|
| r2 `calib-20261026-8f67a8d` | `8f67a8d` | 6 | all 364 sessions ran; stopped at D-3 (the 10-frame stack truncation, since fixed) |
| r3 `calib-20261026-c144130` | `c144130` | 10 | every step PASS |
| r4 `calib-20261027-cb7e015` | `cb7e015` | 10 | every step PASS |

The code changes between them are observational only: stack capture depth, pipeline-key evidence, and a record field.

### 2.3 Session-level comparison
Compared: every recorded behaviour field (outcome, counters, reaches, endpoints, store hashes, condition integrity, map audit, guard, move counters, diag, audit, diagnostics, artifacts including fingerprint and `writesSha256`).

| session group | sessions per run | r2 vs r3 | r3 vs r4 | r2 vs r4 |
|---|---|---|---|---|
| LEARN-0-tree (D-0, D-1) | 48 | 0 | 0 | 0 |
| development procedures (map-on, D-2) | 50 | 0 | 0 | 0 |
| T_A, T_L (training) | 30 + 30 | 0 | 0 | 0 |
| N0A, N0L (cold) | 30 + 30 | 0 | 0 | 0 |
| N1A, N1L (own store; **the P1/P2 cells**) | 30 + 30 | 0 | 0 | 0 |
| N1A_noQ | 30 | 0 | 0 | 0 |
| **N1A× (swapped store)** | 28 | **3** | **1** | **2** |
| **N1L× (swapped store)** | 28 | **1** | **2** | **2** |
| total | 364 | 4 | 3 | 4 |

### 2.4 The divergent sessions
For every row, the delivered store hash (XFER-1 hash view) and the session's start state are **identical across the two runs**.

- **First differing goal reach:** the index of the first goal reach whose call differs. Divergence happened at or before the smaller of the two call numbers.
- **Δ:** the later run minus the earlier.

| pair | session | first differing goal reach (calls) | Δ legal reaches | Δ goal reaches |
|---|---|---|---|---|
| r2→r3 | N1A×-w2 | #4 (794 / 783) | −20 | −30 |
| r2→r3 | N1A×-w25 | #212 (1368 / 1360) | +3 | +2 |
| r2→r3 | N1A×-w6 | #30 (776 / 779) | −1 | −4 |
| r2→r3 | N1L×-w14 | #11 (1279 / 1193) | +33 | +51 |
| r3→r4 | N1A×-w25 | #212 (1360 / 1368) | −3 | −2 |
| r3→r4 | N1L×-w14 | #11 (1193 / 1276) | −8 | −22 |
| r3→r4 | N1L×-w21 | #5 (669 / 764) | +2 | −40 |
| r2→r4 | N1A×-w2 | #4 (794 / 783) | −20 | −30 |
| r2→r4 | N1A×-w6 | #30 (776 / 779) | −1 | −4 |
| r2→r4 | N1L×-w14 | #11 (1279 / 1276) | +25 | +29 |
| r2→r4 | N1L×-w21 | #5 (669 / 764) | +2 | −40 |

**Observations (FACT):**
- **Only swapped-store cells diverge:** 5 distinct sessions (N1A× w2, w6, w25; N1L× w14, w21), with 3–4 differing per run pair (about 5–7 % of the 56 swap-cell sessions).
- **Three outcomes for one session.** N1L×-w14 produced a different result in each of the three runs, so the realizations do not reduce to two.
- **The size is large.** The change in a single session's legal reaches reaches 33, which exceeds the margin δ = 20.
- **Within-run checks never saw it.** No within-run check failed in r3 or r4: D-0 4/4, D-1 40/40, D-2 40/40, swap parity 20/20.
- **The primary inputs reproduced.** C-1's per-world P1/P2 rows (28 worlds) and the SDs are bit-identical across r3 and r4 (r2 never reached C-1).

---

## 3. Timing hypothesis

### 3.1 Confirmed observations about the code (FACT, `cb7e015`)
1. **A throttled rebuild in the agent loop.** `main.js:5200` `runAgentLoop()` calls `rebuildSchemas(getAllEpisodes())` at `main.js:5247` on every loop cycle, with `force` false.
2. **The throttle is real time.** `render/schemaMemory.js:129` `rebuildSchemas(episodicStore, force = false)` returns early when `!force && now - _lastRebuild < REBUILD_INTERVAL_MS`. Here `now = Date.now()` and `REBUILD_INTERVAL_MS = 15000` (`schemaMemory.js:80`, whose comment reads "every 15 seconds of agent time"; it is wall-clock time). `_lastRebuild` starts at 0 and is set after a rebuild (`:160`).
3. **A second path is event-driven.** `render/episodeManager.js:1142–1149` forces a rebuild every `SCHEMA_REBUILD_EVERY = 20` stored episodes, after `SCHEMA_MIN_EPISODES = 10`. That path is deterministic in agent events.
4. **The schemas feed the score.** `main.js:2323` puts `schemaBonus: getSchemaBonus(currentKey, k)` into each candidate's score inputs, and `render/scoring.js:355` adds `schemaBonus × 15` to the candidate's weight.
5. **Three other wall-clock sites, and what they do:**
   - `render/candidateAnalysis.js:348–354` computes `timeScore = exp(-(Date.now() − lastUsed) / 30000)`. `main.js:1847` destructures it, but it is never used again in `main.js`: **not in the decision**.
   - `render/semanticProvenance.js:211` has a 5-second window inside `getActivationDominance`, which is **never called** (dead code).
   - `render/episodicContextEngine.js:295` applies an 800 ms context-shift cooldown to episode segmentation. It feeds the bridge pipeline, which produced **0 writes** in every run.
6. **A precedent.** The replay cooldown (`episodeManager.js:512`) was a wall-clock site. Under the harness it is clock-free (`globalThis.__M7_REPLAY_ONCE__`, Director ruling 2026-08-26), and condition integrity requires that branch; it held in every session.

### 3.2 Proposed causal explanation (HYPOTHESIS)
- **The mechanism.** Which agent call each throttled rebuild lands on depends on how fast the session runs (process load, scheduling). A rebuild at a different call changes the schema set seen by later calls. That changes `schemaBonus` for some candidates, which can flip a decision; after that the session follows a different trajectory.
- **Consistent with the evidence:**
  - divergence starts mid-session;
  - inputs and start states are identical;
  - the runs were made at different times under different load;
  - the effect is rare (1–2 % of sessions overall).

### 3.3 Not proven (UNRESOLVED)
1. **That the schema rebuild is the cause.** No session has been instrumented to record rebuild times or schema sets. The proof would be a diagnostic run that pins the throttle (or slows the clock) and shows the divergence appears or disappears. It has not been authorized or run.
2. **Why only swapped-store cells diverged.** Own-store, cold and training cells never did. Possibilities (none tested):
   - goal-mismatched stores produce schema bonuses that compete more closely with other score terms;
   - swap sessions spend more time near decision ties;
   - chance in a sample of 56 versus 308.
3. **That no other wall-clock or nondeterministic channel exists.** Text search covered `Date.now()` arithmetic in `main.js` and `render/`, but not every module or library.
4. **That primary-cell sessions cannot diverge** at confirmatory scale (section 4).

---

## 4. Impact on claims (for your assessment)

**What we know (FACT):**
- **Swap cells feed only secondary analyses.** P1 and P2 use N1A, N0A, N1L and N0L; the swap cells N1A×/N1L× feed only the secondary comparisons S2 and S3 (goal-swap specificity, DESIGN §6.5). Over 3 run pairs × 120 primary-cell sessions, 0 diverged.
- **The bound on that is loose.** By the rule of three, the per-session divergence rate for primary cells in a given run pair is below about 2.5 % (95 %).
- **Swap-cell divergence is not small.** About 5–7 % of sessions per run pair, with |Δ legal| up to 33 per session.

**Why three matching P1/P2 runs do not settle it:**
- (i) 30 development worlds is far fewer than 1,208 confirmatory worlds.
- (ii) A rate below the bound above can still mean dozens of primary sessions diverging at confirmatory scale (4 cells × 1,208 = 4,832 primary sessions).
- (iii) If arms differ systematically in run time, timing noise could correlate with arm, a potential bias rather than only noise.
- (iv) The mechanism is unproven, so the immunity of primary cells is empirical, not structural.

Please assess whether the timing dependence threatens P1/P2, the secondary swap comparisons, or both, and under what assumptions.

---

## 5. Option (a): keep the runtime and disclose the measured limitation (PROPOSED, provisional)

**Definition.** Freeze with the runtime and trees exactly as calibrated. The confirmatory estimand is defined over the runtime as it is: each session is one realization of a process that includes a rare wall-clock dependence. The limitation and its measured extent are pre-registered.

**What would have to be pre-registered** (proposal; the exact wording is for the freeze package):
1. **A limitation statement:** the runtime contains a wall-clock-throttled schema rebuild. Observed cross-run divergence: 0 of 120 primary-cell sessions per run pair and 3–4 of 56 swap-cell sessions per run pair (section 2). Secondary swap comparisons are therefore run-dependent; the primary analysis is one realization.
2. **Interpretation rules:**
   - S2 and S3 results are reported with this caveat and never upgraded to claims;
   - a primary label near a boundary (within one realization-noise band, to be defined) is reported as sensitive to timing.
3. **A pre-registered reproducibility diagnostic, run after the confirmatory block:**
   - re-execute the full 9-cell set of a random sample of confirmatory worlds (size and seed fixed at freeze; for example 5 % = 60 worlds, about 540 sessions);
   - report cross-run divergence rates by cell and arm;
   - recompute P1/P2 on the re-executed sample and report how often the label would change.
4. **An arm–timing balance check:** report session durations by cell and arm, and test whether duration differs between A and L cells.
5. **A decision rule:** if the diagnostic finds primary-cell divergence above a pre-set rate, or arm-correlated timing, the confirmatory label is reported as **not timing-robust**, and no claim beyond INCONCLUSIVE is made for that claim.

**Telemetry and diagnostics needed:**
- **Per-session wall-clock duration** (start and end timestamps), recorded **by the runner outside the session process**. This needs no change to the runtime, the trees or the frozen protocol's measurements. The session record is untouched and the runner's summary gains the timestamps. It would still be a small runner change, made and gated at the freeze milestone.
- **Optionally**, the number of throttled schema rebuilds per session. That *would* need runtime instrumentation and is **not** proposed, because option (a) keeps the runtime unchanged.

**Why it may be defensible:**
- it keeps the reviewed design and the parity basis with LEARN-0 and every earlier study;
- the primary cells showed no divergence;
- the limitation is measured, disclosed and checked after the fact.

**Risks:**
- it accepts an unmodelled noise channel;
- the after-the-fact diagnostic can only detect, not remove, timing effects;
- arm–timing correlation would be a confound.

---

## 6. Option (b): a deterministic schema rebuild (DESCRIBED, NOT IMPLEMENTED)

**Definition.** Under the harness, replace the 15-second wall-clock throttle with a deterministic one. This follows the `__M7_REPLAY_ONCE__` precedent:
- a guarded global (for example `globalThis.__M7_SCHEMA_CALLS__`) makes `rebuildSchemas` throttle by agent-call count, or skip the unforced path entirely;
- the default-off behaviour stays byte-identical outside the harness.

**What it would change:**
- `render/schemaMemory.js` (and, for full determinism, possibly the other clock sites) **in every experiment tree**.
- The CREDIT-1 tree's static check S-4 currently requires that only `main.js` differs from the LEARN-0 tree. Option (b) changes either the LEARN-0 tree basis or S-4.
- **Compatibility with LEARN-0 and earlier studies:** they ran with the wall-clock behaviour. Their recorded results stand, but they could not be reproduced bit-for-bit under (b), and the D-1 parity basis (the LEARN-0 tree) would need the same guard or a new basis.

**Validation it would need:**
1. a design revision and its review;
2. new tree pins and transform checks;
3. a full recalibration (D-0 to D-5), plus a new cross-run reproducibility check, now a protocol step;
4. new SDs and possibly a new n;
5. for full determinism, a decision about the other wall-clock sites.

**Not implemented.**

---

## 7. Other outstanding items: blockers vs optional

| id | item | facts | proposed status |
|---|---|---|---|
| B1 | **Timing decision**: option (a) or (b), with its pre-registration text | sections 2–6 | **BLOCKER** |
| B2 | **Territory and registry (OQ-2)** | see below | **BLOCKER** (owner decision) |
| B3 | **Confirmatory configurations and collision check** | stream indices 2032–3239 (1,208 worlds, 302 quartets) generated only at freeze, checked against the registry's consumed and held-out ranges, LEARN-0's reserved ranges and block L (DESIGN §6.8) | **BLOCKER** (a freeze step) |
| B4 | **Final α, power and n** | current: Bonferroni-2, each claim at 97.5 %, 80 % power, SD × 1.25, δ 20, giving n = 1,208 (P2 drives; P1 alone gives 584) and 10,872 sessions | **BLOCKER** (fix at freeze) |
| B5 | **Equivalence power at a true zero effect** (DESIGN §6.7 requires it) | computed below for verification | **BLOCKER** (to report at freeze) |
| B6 | **Confirmatory runner and frozen analysis code** | not yet implemented: bootstrap (10,000 replicates; seed fixed at freeze, `PRIMARY.bootstrap.seed` is currently `null`), the label rule, the R1–R8 grid, exclusions (§6.6, ≤ 10 %), S2/S3 and mediators | **BLOCKER** (must exist and pass the gate before freeze) |
| B7 | **Freeze verifier** with line-ending-independent pins (DESIGN §7, T11) | not yet implemented | **BLOCKER** |
| B8 | **G0.4** (round 3, MEDIUM): fresh Windows clones under `core.autocrlf=true` fail LEARN-0's V5 check | options: `-text` in the root `.gitattributes`, or G0.4 runs the unmodified verifier in a temporary `core.autocrlf=false` worktree | recommended before freeze (owner) |
| B9 | **Provenance housekeeping** | push the 7 local commits; lodge the round-3 review text, the round-3 package and this package; lodge the run manifests (section 8) | recommended before freeze (owner) |
| O1 | **Replication strategy** | proposal below | optional |
| O2 | **Unwrapped stores test** (round 3, B2): snapshot of non-Map stores | not built | optional |
| O3 | **Clock stress test** (round 3, B4) | partly evidenced by section 2 | optional, or part of B1 |
| O4 | **Bridge-pipeline rule on real sessions** | 0 bridge writes in every run, so untested | optional (limitation) |
| O5 | **A+ module** | not authorized | out of scope |

**B2 facts (registry):**
- The typed seed registry records no study on the XFER-1 stream (config seeds from 200,000; agent seeds from 1,100,100,000). That covers XFER-1, GATE-FLOOR-*, C′, LEARN-0 block L and CREDIT-1's calibration. Territory is tracked by stream-index ranges in study configs; LEARN-0 `FREEZE.md:91` and D-033 record this as an open governance item.
- CREDIT-1's config reserves indices 0–2031 and starts the confirmatory block at 2032.
- Nine drivers refuse any config seed the typed registry marks consumed, so writing these seeds into the consumed chain would stop committed tooling from reproducing committed results.
- Proposal: a successor list consulted only by future studies (the `consumed.js` convention), covering every study on this stream.

**B5: equivalence and label power** (normal approximation, computed by Claude, for verification). n = 1,208, two-sided 97.5 % interval (z = 2.2414), δ = 20; "SD × 1.25" applies the design's inflation:

| claim, SD | SE | half-width | P(NO_PRACTICAL_EFFECT \| true 0) | P(LEARNS/RAISES \| μ = 25 / 30 / 40 / 50) |
|---|---|---|---|---|
| P1, 125.26 | 3.604 | 8.08 | 0.999 | 0.197 / 0.703 / 1.000 / 1.000 |
| P1, × 1.25 | 4.505 | 10.10 | 0.972 | 0.129 / 0.491 / 0.986 / 1.000 |
| P2, 180.30 | 5.188 | 11.63 | 0.894 | 0.101 / 0.377 / 0.947 / 1.000 |
| P2, × 1.25 | 6.485 | 14.53 | 0.601 | 0.071 / 0.242 / 0.800 / 0.991 |

**Implication:** the n rule gives about 80 % power to label P2 RAISES at a true effect of **40 = 2δ** under the inflated SD, and about 60–89 % power to label P2 NO_PRACTICAL_EFFECT at a true effect of 0. A true effect just above δ is unlikely to be labelled LEARNS or RAISES. This follows from the label rule (the lower bound must be ≥ δ). **UNRESOLVED:** whether this matches the intended claims.

**B4 alternatives** (same formula, P2's SD):

| option | n | sessions | time at about 9.6 sessions/min |
|---|---|---|---|
| 99 % family-wise (each claim at 99.75 %, z = 2.8070) | 1,692 | 15,228 | about 26 h |
| 90 % power (z = 1.2816) | 1,580 | 14,220 | — |
| both | 2,124 | 19,116 | — |
| current | 1,208 | 10,872 | about 19 h |

**O1, proposed replication:**
- **When:** only if the primary result gives a positive label (R1 or R4).
- **What:** a second confirmatory block on fresh territory after the primary block (from index 3240), with the identical frozen design and analysis.
- **How:** a pre-registered combination rule, for example that both blocks must give the label.
- **Why:** it guards against non-statistical errors that α cannot cover, such as an idiosyncratic world sample or a hidden defect, at the cost of a second block.

**Confirmatory design assumptions** (ASSUMPTION unless noted):
- the development worlds represent the confirmatory population;
- per-world differences are independent;
- the normal approximation holds, and percentile-bootstrap intervals behave as nominal at n ≈ 1,208;
- quartet goal balance makes the pooled SD the relevant one (goal 8 is markedly more variable: per-goal SD(P2) 272.8, against 109.9–202.3 for the others);
- at most 10 % of worlds are excluded;
- one block, fixed n, no interim look;
- **sessions are deterministic given their inputs.** This is now known to be violated for swap cells (section 2) and unproven at scale for primary cells.

---

## 8. Evidence integrity (inventory)

**Runs.** All are in git-ignored `experiments/credit1/data/` and preserved unchanged. "Manifest" is the sha256 of a sorted `sha256sum` listing of all run files, as recorded by Claude:

| run | commit | files | manifest (16) | summary.json (16) | status |
|---|---|---|---|---|---|
| `calib-20261026-c66f830` | `c66f830` | 12 | `7cb6ee8061c9ea0a` | `a4508cab8855f41e` | STOPPED AT D-0 (export byte check; corrected in `8f67a8d`) |
| `calib-20261026-8f67a8d` | `8f67a8d` | 448 | `0c0aa859be595fdf` | `77c96d5c4c46aaf7` | STOPPED AT D-3 (stack truncation; corrected in `c144130`) |
| `calib-20261026-c144130` | `c144130` | 448 | `54d1f1a5b045ef03` | `3311cf53a019a29a` | COMPLETE: every step passed |
| `swap-20261027-cb7e015` | `cb7e015` | 102 | `0d9595af9f96ea68` | `e1d68fa9f07d3475` | COMPLETE: every pair identical (20/20) |
| `calib-20261027-cb7e015` | `cb7e015` | 448 | `9798d18e02bf6039` | `1c1e1d34c6da159c` | COMPLETE: every step passed (n = 1,208) |

**Final calibration run, `calib-20261027-cb7e015` (FACT):**
- **C-0:** gate 95/95, 215/215.
- **D-0 to D-2:**
  - D-0: 4/4 record pairs, exports equal under the store-hash view;
  - D-1: 40/40;
  - D-1c: every required class and dimension;
  - D-2: 40/40.
- **D-3 to D-5:**
  - D-3: 316/316 sessions; I-CRED PASS (A) / DISCRIMINATING (L); I-LEDGER PASS / LEGACY_PATTERN; 0 failures; 0 unattributed;
  - D-4: goal-redirect counters 0;
  - D-5: 30 worlds.
- **C-1 and C-2:**
  - C-1: SD(P1) 125.26 gives n 584; SD(P2) 180.30 gives n 1,208. Rows identical to `calib-20261026-c144130`.
  - C-2: PASS, about 11.8 sessions per minute. Its rates differ slightly from the earlier run solely because the divergent swap sessions are pooled.

**Source at HEAD `cb7e015`** (sha256 of committed bytes, 16 hex digits):

| file | hash |
|---|---|
| `main.js` (production, audited) | `c92c5c6b6d2e32ae` |
| `render/schemaMemory.js` | `41d1ccc871bd2606` |
| `render/scoring.js` | `4a13316698b52a21` |
| `render/candidateAnalysis.js` | `99e1dc6d183554da` |
| `render/episodeManager.js` | `757d549bec6f317b` |
| `render/semanticProvenance.js` | `74618a635d5cfcbf` |
| `render/episodicContextEngine.js` | `03f620320d3b7270` |
| `experiments/m7/run.js` | `9f6494b27a07712e` |
| `experiments/credit1/DESIGN.md` | `c41c98ae7d72526b` |
| `experiments/credit1/CALIBRATION_PROTOCOL.md` | `407bea4f0ae72f73` |
| `config.mjs` | `2630150cc118ecaf` |
| `lock.mjs` | `f946b2b59d4be757` |
| `session.mjs` | `afb4f775f85550dd` |
| `instruments.mjs` | `53fb58cc408920be` |
| `calibration.mjs` | `4fc94c0f15874128` |
| `calibrate.mjs` | `a6f3074da5741100` |
| `run_swap_parity.mjs` | `d785328c4e2dd3ba` |
| `verify_credit1.mjs` | `18d5838374ef95c0` |

**Reviews and packages:**
- **In the repository:** round 1 (`review/GEMINI_ROUND1_REVIEW.txt`, raw `ca0c500a…`); the r1 design as reviewed; round 2 (`review/GEMINI_ROUND2_REVIEW.md`, `461f74f5…`); `review/REVIEW_RECORD.md`.
- **Untracked (not committed):**
  - the round-3 package, `research/external/CREDIT1_GEMINI_CALIBRATION_REVIEW_PACKAGE.md` (`4de9a80e…`);
  - this package.

**Missing from the repository** (reported explicitly):
1. **The round-3 review text.** It exists only as the owner's `Downloads/gemini_Review-.txt` (9,022 bytes, sha256 `1009a24281b6cbfc…`). That file name was earlier used for the round-1 review, whose verbatim copy is in the repository.
2. **The run manifests.** They exist only in Claude's session scratch directory, not in the repository.
3. **Per-session wall-clock durations.** Never recorded by any run; file timestamps give completion order only.
4. **Rebuild timing and schema-set telemetry.** Never recorded (section 3.3).

**Interpretation of earlier results is unchanged:**
- The first two runs' stops and their corrections stand as reported.
- The run-3 calibration result stands. Its swap-cell values are one realization (section 2).
- Corrections to Claude's earlier statements:
  - the second run's "8.8 h" span contained a 482.5-minute idle gap and was not throughput;
  - n at 90 % power is 1,580, not 1,576;
  - the local commit count after `c66d589` was five, not six (now seven, after `9d350c6` and `cb7e015`).

---

## 9. Questions for the independent reviewer

**On the evidence ladder:**
1. Is the ladder sufficient for a confirmatory freeze?
   - static gate;
   - calibration D-0 to D-5;
   - swap-parity delivery check;
   - corrected instruments validated on real sessions;
   - proposed after-the-fact reproducibility diagnostic.

   What is missing?
2. Should cross-run reproducibility become a pre-registered protocol step (for example a repeated subsample) rather than an after-the-fact diagnostic?

**On the finding:**
3. Do sections 2.3–2.4 establish cross-run non-reproducibility of swap cells beyond doubt? Is anything in the comparison method itself suspect?
4. Is the schema-rebuild hypothesis (section 3) the most plausible mechanism? What diagnostic would prove or refute it most cheaply, and must it be run before freeze?
5. Why might only swapped-store cells diverge? Does that pattern support or weaken the hypothesis?

**On the claims:**
6. Does the timing dependence threaten P1/P2, the secondary swap comparisons, or both? Under which assumptions is P1/P2 safe?
7. Could timing noise be arm-correlated (for example, aligned credit changing per-call computation)? How should that be tested?

**On options (a) and (b):**
8. Is option (a) scientifically defensible? Are the pre-registration items in section 5 sufficient, and what thresholds should the decision rule use?
9. If (a) is not acceptable, is (b) proportionate? Are its compatibility costs for LEARN-0 and earlier studies acceptable? Should the other wall-clock sites be treated too?

**On the design and remaining protocol:**
10. Does the confirmatory design support the intended claims, given the power profile in section 7 (B5)? Was the design meant to be powered for effects of about 2δ?
11. Are B1–B7 the complete set of freeze blockers? Is anything listed as optional actually a blocker?
12. Is the 99 % / 90 %-power alternative or the conditional replication (O1) the better use of the extra cost, or neither?
13. Is the territory and registry proposal (B2) sound, and are the drivers' consumption checks an obstacle to recording it?
14. Do any protocol gaps remain? For example, the bridge rule untested, stores the ledger can't wrap, or determinism assumed by the analysis.
