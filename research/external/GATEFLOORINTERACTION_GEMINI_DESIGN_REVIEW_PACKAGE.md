# GATE-FLOOR-INTERACTION — design-review package (self-contained; no repository access needed)

**What I need from you.** One focused adversarial review of a **design only**. Nothing is frozen; no confirmatory outcome
exists; production code is untouched. You do not implement or run anything. Judge the causal estimands, control arms, metrics,
power, multiplicity, validity gates and claim limits in §3–§7, and answer §8 in the format of §9. Do not reopen the closed
GATE-FLOOR gates or MCF-1.

## 1. Context in one paragraph

GATE-FLOOR-PRODSEM (frozen design pushed before outcomes; 280 worlds; production-like hook state P) found that a guarded,
default-off goal-entry **floor** (no stored episode) raised cold **legal goal reaches by +67.4 [58.9, 76.2]**, non-inferior to
the goal-entry-episodes ceiling, no goal group harmed. Descriptive arms: the world's own **real training store** gave **+4.1
[−6.7, 14.7]** legal reaches (+42.9 non-graph resets); with the floor it scored 412.1 versus COLD_FLOOR 439.3 (**−27.2 [−34.9,
−19.4]** legal, **+49.4** non-graph resets). That cross-condition difference is an observation, not a mechanism. HEAD admits
non-graph "shortcut" candidates and executes them as non-graph goal resets; the repository's H1-R conformance work contains a
legal-edge mask/guard (N1). The question: does such a guard change the real-store picture, and what would refute the
"non-graph diversion" explanation?

## 2. Evidence (three kinds, kept apart)

**FACT — source (HEAD).** (S1) a non-neighbour candidate is admitted if `transitions[from][k] > 5` or `rewards > 4` with an
adjacency witness; N1-MASK drops every non-neighbour before that test. (S2) N1 = MASK (candidate loop), MASK-SEM (goal-free
semantic loop), GUARD (executed move must be an edge or a self no-op), SEAL (non-edge pairs never become episode transitions);
HEAD has none. (S3) MASK-SEM is behind `if (goalNeuronId !== null) return;` → unreachable with a goal set, so it is not a factor
level; SEAL is a different pathway and is excluded. (S4) autonomous learning writes `transitions` only for graph neighbours;
non-graph transitions enter through sealed episodes. (S5) `window.lastReasoning` is never cleared at HEAD (H1-R's P4 edit does).
(S6) the MASK and EXEC anchors each match once in HEAD.

**FACT — preserved block-P records (observational, post-hoc).** A world's real store: 238 episodes, 11.5 % of consecutive pairs
non-graph, 279/280 worlds hold a terminal jump-into-goal episode, 3.8 stored shortcut sources per world. Non-graph resets start
at a stored shortcut source in 66 % of cases (REAL, REAL_FLOOR) versus 36 % without a store (structural baseline). **Per-world
Spearman between stored shortcut sources and the legal deficit ρ = −0.01 [−0.13, 0.10]** (terminal non-graph episodes −0.14
[−0.26, −0.03]; against the non-graph-reset change +0.25 [0.13, 0.35]; terciles of sources: deficit −31.1 / −19.6 / −30.8).
**This does not support "shortcut-associated non-graph resets cause the legal deficit".**

**FACT — development calibration (40 XFER-1 worlds, outside every study world; 8 cells × 40 = 320 test sessions; state P).**
Guard-OFF cells reproduce the committed state-P calibration exactly. Guard ON ⇒ non-graph resets 0/160 sessions, executed
non-graph moves 0/160; guard OFF ⇒ guard counters inert; integrity 320/320; default-off neutrality identical on 3/3 worlds.
The execution guard fired **29.3** times per session (max 49; ≈ 2 % of calls); graph-admitted candidates changed by < 1 %;
12.4 non-graph candidates reach admission per executed non-graph move.

| cell (store, floor, guard) | legal | non-graph | all resets |
|---|---|---|---|
| COLD, F0, G0 / G1 | 369.1 / 395.4 | 82.7 / 0 | 451.8 / 395.4 |
| COLD, F1, G0 / G1 | 451.4 / 448.8 | 68.4 / 0 | 519.8 / 448.8 |
| REAL, F0, G0 / G1 | 371.4 / 422.8 | 139.1 / 0 | 510.5 / 422.8 |
| REAL, F1, G0 / G1 | 408.1 / 454.9 | 136.3 / 0 | 544.5 / 454.9 |

Paired legal-reach contrasts (n = 40; mean [95 % CI], SD): guard \| REAL,F1 **+46.8 [31.4, 62.5]** (50.2); guard \| REAL,F0
+51.4 [34.6, 68.2]; guard \| COLD,F0 +26.3 [3.2, 48.9]; guard \| COLD,F1 **−2.7 [−16.1, 10.6]** (43.7); store deficit (REAL−COLD)
\| F1: G0 **−43.3 [−62.9, −23.5]**, G1 **+6.2 [−8.3, 20.9]**; **store × guard \| F1 +49.5 [28.9, 70.0]** (67.0); floor \| REAL
G0 +36.7 [20.7, 53.9] / G1 +32.1 [17.1, 49.5] (≈ 54); floor × guard \| REAL −4.6 [−15.0, 5.8]; floor × guard \| COLD −29.0
[−54.8, −3.1]; 3-way +24.4 [−2.3, 52.1] (89.4).

**INFERENCE (hypotheses, not results).** (i) The guard as a *bundle* is associated, in the development sample, with removal of
the real-store deficit and a legal gain in real-store cells — an interventional contrast on the bundle, n = 40. (ii) In cold+floor
the guard changes accounting only (legal −2.7 while non-graph −68.4). (iii) Part of the PRODSEM headline is re-classification
(floor × guard \| COLD). (iv) Because the observational dose-response is flat while the bundle effect is large, the channel the
guard closes must be broader than "stored terminal shortcuts into the goal" — e.g. non-goal non-graph admissions, stale
pre-reset reasoning executed from a new position (S5) — **unverified**.

**UNKNOWN.** Mask versus exec attribution; whether the deficit is mediated by the non-graph channel in a confirmatory sample;
what else in a real store lowers legal reaches; the guard's effect when the store is trained *under* the guard; behaviour
without the 150-tick cap or beyond 1,500 calls.

## 3. Proposed design — paired 2 × 2 × 2 factorial (nothing else)

Factors, all within world, one unguarded cold training session per world, same test seed/configuration for the eight cells:
**S** store {COLD, REAL = the world's own unguarded training export, identical across its four cells}; **F** floor {OFF, ON}
(frozen PRODSEM line); **G** guard {OFF, ON} = two guarded, default-off, call-only lines in the derived tree — ADMIT (before the
admission test: counts the candidate class; ON drops non-graph candidates = N1-MASK) and EXEC (before the executed-move read:
blocks a non-edge, non-self move and counts it = N1-GUARD). Hook state P (arm OFF / env off / credit off / pin off); the 150-tick
cap, deterministic replay and legacy credit remain. 280 fresh worlds (70 per goal 8/12/16/19), 8 test + 1 training session
per world = 2,520 sessions.

Every cell enters a declared estimand: COLD F0 G0 (baseline; reproduction of the PRODSEM floor effect = instrument I6), COLD F1 G0
(PRODSEM floor; deficit reference at G0), COLD F1 G1 (deficit reference at G1), COLD F0 G1 (3-way only), REAL F0 G0, REAL F1 G0,
REAL F0 G1, REAL F1 G1 (candidate package). A 6-cell reduction (drop COLD F0 G0 and COLD F0 G1) loses the 3-way interaction, the
within-block PRODSEM reproduction and guard | COLD,F0, and saves 25 % of test sessions. **Deliberately excluded:** an ENTRY_NR
arm; a mask-only level; a store with non-graph pairs removed; a store trained under the guard; N1-SEAL / P4 / MASK-SEM.

## 4. Estimands and decision rules

Primary outcome for every claim: **legal goal reaches per session**; non-graph and total resets reported separately, never
merged. Paired by world, percentile bootstrap (10,000, seed 20261014), absolute margin **δ = 20** (≈ 4.4 % of cold-floor
level). Y(S,F,G); τ_G(S,F) = Y(S,F,1) − Y(S,F,0); Δ_SG(F) = τ_G(REAL,F) − τ_G(COLD,F); D_g = Y(REAL,1,g) − Y(COLD,1,g).
Primary family decided at **Bonferroni-3 (98.33 %)**; the unadjusted 95 % class is a non-decisive sensitivity.

* **PC1 (does the guard remove the real-store deficit?)** estimand Δ_SG(1) = D_1 − D_0. RECOVERY_FULL: lower ≥ δ and D_1 lower >
  −δ; RECOVERY_PARTIAL: lower ≥ δ; **NO_RECOVERY: upper < δ**; else INCONCLUSIVE. Precondition I5: upper(D_0) < 0, else
  NOT_TESTABLE.
* **PC2 (does the guard improve legal reaches or only the accounting?)** τ_G(REAL,1). IMPROVES: lower ≥ δ; HARMS: upper ≤ −δ;
  ACCOUNTING_ONLY: interval inside (−δ, δ); else INCONCLUSIVE.
* **PC3 (does the floor benefit persist with the real store?)** τ_F(REAL,0) and τ_F(REAL,1): PERSISTS iff both lower ≥ δ.
* **Secondary, descriptive, nothing gates on them:** guard | COLD (both F), store×guard | F0, floor×guard | COLD and | REAL,
  store×floor | G0, G1, **the 3-way**, the deficit at F0, every contrast on non-graph and total resets, per-goal versions.
* **Falsification.** PC1 = NO_RECOVERY with I3, I5 valid falsifies "the legal deficit runs through the admission/execution
  channel the guard closes" (bundle level); PC2 = ACCOUNTING_ONLY means the guard is a hygiene decision; PC2 = HARMS excludes it.
* **Justifies a separate production-design specification:** PC3 = PERSISTS ∧ PC2 ≠ HARMS ∧ no goal-group HARM flag ∧ I1–I4, I7;
  the package is floor + guard iff PC2 = IMPROVES, floor alone otherwise.

## 5. Validity gates (a failing instrument voids only the dependent claims)

I1 condition integrity P in every session (as PRODSEM). I2 floor audit in every F1 session. **I3 guard completeness: non-graph
resets = 0 and executed non-graph moves = 0 in every G1 session; maskedOut = blockedIllegal = 0 in every G0 session** (voids
PC1, PC2; near-tautological by construction, an integrity check). I4 default-off neutrality of the added lines (gate-level:
bare = derived = lines-present-off = armed-off on decisions, transitions, RNG draws, Q/credit, end state) and a candidate-level
scope test. I5 the deficit reproduces at G0 (upper bound of D_0 < 0). I6 the cold floor effect reproduces (lower of τ_F(COLD,0)
≥ 40, PRODSEM MIN_BENEFIT). I7 the delivered store is identical across a world's four REAL cells and equals its training export;
seeds/configuration shared across the eight cells.

**Goal-specific harm:** for τ_G(REAL,1), τ_F(REAL,0) and τ_F(REAL,1) a goal group's unadjusted 95 % interval wholly below 0
(70 worlds per goal) is a HARM flag on that claim. **Unintended effects on candidate selection (descriptive; two FLAGS):**
candidate classes reaching admission, masked count, **blocked-move count (flag > 5 % of calls; dev 2.0 %)**, executed-move
composition, **graph-admitted candidate count (flag if the guard changes it > 5 %; dev < 1 %)**, distinct goal edges used,
end-state goal-edge penalty.

## 6. Sample size, multiplicity, stopping

n ≥ ((z₁₋α/2 + z₀.₈₀)·SD/δ)², δ = 20, decisive α = 0.05/3, SDs from the development contrasts. Bonferroni-3 n (SD × 1.25 in
parentheses): PC1 118 (184); PC2 67 (104); PC3 79 / 76 (123 / 118); 3-way 210 (328); largest secondary 254 (397). **n = 280**
covers every primary contrast with a 25 % SD inflation and keeps 70 per goal; the secondaries are not powered at inflation,
which is why nothing gates on them. MDE at n = 280 (Bonf-3): PC1 12.9, PC2 9.7, PC3 10.6 / 10.4, 3-way 17.3. Assumptions: the
40-world SDs are point estimates (SE ≈ 11 %), effects of interest ≥ 20, independent worlds, normal-approximation sizing of a
bootstrap analysis. **Fixed stopping:** all 280 worlds × 8 cells; no interim look, no extension, no outcome-based exclusion; a
failed session is retried once then its world is excluded (integrity / guard-completeness violations count as failures); > 10 %
excluded → INVALID; one frozen analysis. No parameter is chosen from the new block.

## 7. Claim limits

State P; 150-tick cap, deterministic replay and legacy stale-keyed credit remain; the guard is the N1 mask + execution guard as
implemented, **not** full N1; the delivered store is trained unguarded; Phase I, 1,500 calls, goals {8, 12, 16, 19}. Not
production equivalence, routing capability or cognition.

## 8. Questions

1. **Factor definition.** Is guard = MASK + EXEC a defensible single level, given EXEC fires ~29 times per session (S5: stale
   pre-reset reasoning is a candidate source)? What is the smallest control that separates an admission effect from wasted ticks
   or stale-reasoning blocking — or is "bundle" an acceptable claim scope?
2. **Causal reading of PC1.** Does holding the delivered store fixed (trained unguarded) make the store × guard interaction a valid
   test of "the deficit runs through the closed channel"? What confound remains (the guard also changes what gets sealed during
   the session)?
3. **Reconciliation.** The observational dose-response is flat (ρ ≈ −0.01) while the development interaction is large. Does the
   design contain a control that could distinguish "non-graph channel" from "another effect of the guard"? What would you add?
4. **Cells.** Is the 8-cell factorial the smallest design for the stated six questions, or is the 6-cell reduction enough?
5. **Decision rules.** Are δ = 20 and Bonferroni-3 appropriate; is NO_RECOVERY defined on upper(Δ_SG) < δ adequate as a
   falsifier (the deficit-persists clause was dropped because the expected D_1 upper bound ≈ −19 sits on the margin)?
6. **Power.** Is n = 280 with a 25 % SD inflation and non-gating secondaries justified from n = 40 development SDs?
7. **Gates and flags.** Is I3 meaningful given it is near-tautological; are the two flags (blocked > 5 %, graph pool change > 5 %)
   reasonable; is anything vacuous or missing?
8. **Claim limits.** Anything over- or under-claimed, including the "falsifies … as a bundle" wording?

## 9. Answer format

Per question: `AGREE` / `AGREE WITH CLAIM LIMIT: <text>` / `OBJECT: <specific, minimal correction>`. Then at most three numbered
**required** corrections (what, why, how small), then one verdict: `PASS` / `PASS WITH CLAIM LIMITS` / `LIMITED CORRECTION` /
`BLOCK`. Label anything not required `OPTIONAL`.
