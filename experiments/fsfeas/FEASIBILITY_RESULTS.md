# FS-OQ1-F2-FEAS — Controlled Feasibility Measurement, Results

**Kind:** bounded measurement. **Not Study 2.** No arms, no B-FULL/B-GEO comparison, no S-SHADOW, no
oracle-concordance endpoint, no tuning, no production change, no new seed. **Not committed.**
**Question answered — and only this one:** *during a normal V2.3 + M7 run, does actual traversal experience
produce non-prior `c_hat` on enough decision-relevant candidate edges/states for S-SHADOW to be meaningful?*
**Not answered:** whether V2.3 improves performance, or whether learned evidence improves oracle concordance.
**Labels:** FACT / CALCULATION / INFERENCE / OPEN QUESTION.

---

## 1. Method

- **Mechanism:** the frozen V2.3 implementation at `a066d47696b1502720f627855c8549f4d2898cd5`, unmodified.
- **Environment:** the existing M7 harness, `runOnce` (`experiments/m7/run.js`), `envMode = on`,
  `creditMode = on`, `pin = on`, `tickUnit = step`, `ticks = 3000`.
- **Parameters reused, not invented:** `agentSeed = 20260819000`, `arm = A1` from the frozen UQ-B protocol
  (`experiments/uqb/protocol.js:27-33`), the parameters M39/M40 used with these same fixtures.
- **Observation:** a loader hook (`hook_tick.mjs`) wraps `env.setTick` *after* the original runs, passing its
  return value through unchanged, and invokes a read-only callback that copies `recordFor(u,v)` for all 78
  directed edges. No write, no RNG draw, no state change.
- **Analysis:** post-run only. True `p` is read in a single, separately labelled staleness diagnostic and never
  during a run.

## 2. Fixtures

Exactly the four authorized development fixtures, plus one documented repeat:

| Run | Fixture | Goal | Hook |
|---|---|---|---|
| 1 | 896066:0 | 8 | on |
| 2 | 896066:1 | 12 | on |
| 3 | 896238:2 | 16 | on |
| 4 | 896329:3 | 19 | on |
| 5 | 896066:0 | 8 | **off** — the single permitted repeat |

**FACT.** Each fixture accepted at its own seed with zero rejected candidates (asserted in the child), and the
evaluated-seed census after every run contains **only** `896066`, `896238`, `896329`. **No new seed was
touched.**

## 3. Checkpoints

The frozen M40 grid (`m40_spec.js:12`): **250, 500, 750, 1000, 1250, 1500, 1750, 2000, 2250, 2500, 2750, 3000**.
`T_SHIFT = 1500`: checkpoints ≤ 1500 are **pre-shift**, > 1500 are **post-shift**. The 1500 snapshot is taken as
the phase flips, so it contains only pre-shift experience. The 3000 snapshot is taken after `runOnce` returns.

## 4. Raw evidence population (FACT)

Directed edges total 78.

| Fixture | Edges with `a > 0` @1500 / @3000 | Edges with `c_hat > 1` @1500 / @3000 | Attempts @3000 |
|---|---|---|---|
| 896066:0 | 62 / 67 | 26 / 53 | 1671 |
| 896066:1 | 58 / 64 | 27 / 53 | 1599 |
| 896238:2 | 56 / 60 | 26 / 50 | 1628 |
| 896329:3 | 62 / 72 | 31 / 60 | 1637 |

Evidence accumulates monotonically on every fixture; already at **t = 250**, 29–43 edges are observed and 8–16
carry `c_hat > 1`.

## 5. Pre/post `T_SHIFT`

**FACT.** Non-unit evidence roughly **doubles** across the shift (26–31 → 50–60 edges), because every edge swaps
distribution at the shift (`env.js` `phaseP`: phase II inverts which draw applies), so failures begin appearing
on edges that were reliable.

**Staleness diagnostic (analysis-only `p`), median `|c_hat − 1/p_current|` over observed edges:**

| Fixture | @1250 (pre) | @1750 (post) | @3000 (post) |
|---|---|---|---|
| 896066:0 | 0.049 | 1.607 | 1.320 |
| 896066:1 | 0.065 | 1.470 | 1.010 |
| 896238:2 | 0.098 | 1.495 | 1.217 |
| 896329:3 | 0.100 | 1.626 | 1.179 |

**CALCULATION / INFERENCE.** Pre-shift, learned `c_hat` tracks `1/p` closely (median error 0.05–0.10).
Immediately after the shift the error jumps to ~1.5 and only partially recovers by t = 3000 (~1.0–1.3).
**Evidence survives the transition but becomes largely stale**, as expected with `λ = 1` (V2.3 F14, no
forgetting). This is diagnostic, not a correctness finding.

## 6. Decision-state evidence coverage

Two different quantities, deliberately separated:

- **(a) candidate-edge evidence** — on the decision edge `u→k` itself. **FACT:** V2.3 FutureScore for candidate
  `k` begins *at* `k` (`render/planning.js`: `explore(start, H, new Set([start]))`), so this edge is **not** part
  of `k`'s FutureScore.
- **(b) FS-relevant evidence** — on edges the V2.3 recursion can reach from `k` (simple paths seeded `{k}`,
  ≤ `H = 3` edges, absorbing at the goal). **This is what S-SHADOW would actually exercise.**

| Fixture | (a) cand-edge `c_hat > 1`, @250 → @3000 | (b) FS-relevant `c_hat > 1`, every checkpoint | Differing FS-relevant footprints across candidates |
|---|---|---|---|
| 896066:0 | 6/19 → 19/19 | **19/19** | 18/19 @250, **19/19** thereafter |
| 896066:1 | 7/19 → 19/19 | **19/19** | **19/19** at every checkpoint |
| 896238:2 | 12/19 → 19/19 | **19/19** | **19/19** at every checkpoint |
| 896329:3 | 9/19 → 19/19 | **19/19** | **19/19** at every checkpoint |

**FACT.** From the first checkpoint onward, **every decision state on every fixture** has at least one candidate
whose FS-relevant neighbourhood contains `c_hat > 1`, and in almost every case the candidates' evidence
footprints differ from one another.

**Caveat (INFERENCE).** With 20 nodes, `D = 4` and `H = 3`, a candidate's FS-relevant neighbourhood covers a large
share of the graph, so neighbourhoods overlap heavily. Full coverage is partly a consequence of neighbourhood
size, and "differing footprints" counts *any* difference, however small. **Coverage demonstrates that evidence
is consulted and non-degenerate; it does not measure how much it separates candidates** — that magnitude is
Study 2's question.

## 7. Realised `c_hat` distributions (FACT)

Among edges with `c_hat > 1`:

| Fixture | @1500 median (p25–p75), max | @3000 median (p25–p75), max |
|---|---|---|
| 896066:0 | 2.00 (1.20–2.00), 4.00 | 1.50 (1.29–1.96), 3.00 |
| 896066:1 | 1.50 (1.20–2.00), 3.43 | 1.50 (1.25–1.88), 3.50 |
| 896238:2 | 1.67 (1.25–2.00), 3.33 | 1.50 (1.33–2.00), 3.30 |
| 896329:3 | 1.67 (1.33–2.50), 3.75 | 1.50 (1.25–2.00), 7.00 |

Observed `c_hat` spans the full theoretical unreliable range (up to ~4 pre-shift). The single value of 7.00 is an
edge with many failures and few successes; `c_hat` is bounded by `a + 1`, not by `1/p`.

## 8. Deterministic replay and non-interference

**FACT.** Run 5 (896066:0, hook **off**) is **identical to run 1 (hook on) on all 11 fingerprint fields**: the
executed action-sequence hash, number of writes, cognitive and visual RNG draw counts (`cogDraws = 92864`),
Q entries, Q sum, environment counters, attempts (1939), successes, slips (803), and the final traversal-record
hash. **Replay is deterministic, and the observation hook did not change the mechanism or its RNG consumption.**

## 9. Provenance and integrity

- Commit `a066d47696b1502720f627855c8549f4d2898cd5`; `connections.json` blob `52867c4bb1c15392…`.
- `hook_tick.mjs` sha256 `bfe52637adc3e0a9…`; `child.mjs` sha256 `068e02ef995f6bf1…`.
- Evidence: five per-run records (each with fixture, config seed/index, agent seed, arm, goal, hook flag,
  commit, seeds touched, grid, snapshots of all 78 edges at 12 checkpoints, fingerprint, Node version), plus
  `REPLAY.json` and `SUMMARY.json`, all covered by `evidence/INTEGRITY.sha256` (**7/7 OK**).
- Zero tracked files modified; production, historical artifacts and the Study-1 record untouched.

## 10. Recommendation — **PASS** (experimental feasibility only)

**The planned S-SHADOW Study 2 is experimentally feasible in the current M7 environment.**

Why this is PASS without an invented threshold: the feasibility question is whether learned evidence is
**non-degenerate and actually consulted** on decision-relevant states — the exact property Study 1 showed was
absent (`c_hat ≡ 1` never consulted). On every fixture, from the first checkpoint, FS-relevant non-unit evidence
reaches **19/19 decision states**, the maximum attainable, and differs across candidates. **No coverage threshold
could fail against a ceiling result**, so none was needed. What remains undefined — the *magnitude* of evidence
separation — is not a feasibility criterion; it is the effect Study 2 measures.

**This is not a scientific conclusion about OQ-1.** It establishes that the test can be run, not how it will
come out.

**Inputs for the final Study-2 gate (not blockers of feasibility):**

1. **`T_SHIFT` policy is now data-informed.** Pre-shift evidence tracks `1/p` closely (median error ≤ 0.10);
   post-shift evidence is largely stale (~1.0–1.6). Pre-shift evaluation matches the idealised F-2 conditions;
   post-shift tests a stale-evidence regime. This choice must be pre-registered — it changes what Study 2 means.
2. **R5 stratification** remains necessary (F-2 audit: the R5-floor fixture gave Δ ≈ 0 even under ideal evidence).
3. **Neighbourhood overlap** (§6 caveat) should inform the analysis: coverage is saturated, so Study 2 must
   measure separation magnitude through its endpoint, not infer it from coverage.

**Recommended next step:** Gemini adversarial review of the Study-2 design with these feasibility results
attached, then the final Study-2 gate.
