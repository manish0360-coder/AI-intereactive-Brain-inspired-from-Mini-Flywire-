# FutureScore V2.3 — Behavioural Disposition 01 (S3′)

**ID:** FS-BD-01 · **Author:** Chief Systems Engineer · **Authority:** Director decisions D1, D2, D3 of the
V2.3 Pass-2 final authorization.
**Kind:** disposition of a historical behavioural criterion under an intentional mechanism replacement.
**Not** an erratum, **not** a repair, **not** a falsification claim.

> **`experiments/phase1_0/verify_S3prime.js` IS NOT MODIFIED.** Its bytes, its panel and its 5.28% threshold are
> unchanged. It is not rerun in search of a passing threshold, and FutureScore is not tuned to recover it.
> [`FUTURESCORE_LINEAGE_NOTE_01.md`](FUTURESCORE_LINEAGE_NOTE_01.md) and
> [`IMPLEMENTATION_READINESS_V2_3.md`](IMPLEMENTATION_READINESS_V2_3.md) are likewise unmodified.

---

## 1. FACT — what was measured

At the V2.3 consumer implementation, with `verify_S3prime.js` untouched:

| Check | Result | Detail |
|---|---|---|
| **S3.2′(a)** — epsilon-pinned, forced exploration | **PASS** | zero stale executions on **6/6 panel seeds** |
| **S3.2′(b)** — natural epsilon, median stale rate across the panel | **FAIL** | **5.55%** median (mean stale 22.17) against the historical limit **5.28%** |

Further facts:
- The measurement is **deterministic**: consecutive runs reproduce `median residual rate = 5.55%, mean stale = 22.17`.
- S3.2′(b) **passes at the pre-implementation base `782df6e`** and fails after the implementation, verified in an
  isolated clone. It is therefore **not** a pre-existing failure.
- The panel is `[20260818, 31337, 31338, 777, 4242, 90210]` (`verify_S3prime.js:62`); the limit is
  `RESIDUAL_LIMIT = PRE_FIX_RATE * 0.30 = 5.28%` (`:67`), documented at `:38-39`.
- `verify_S3prime.js` blob SHA-256 is unchanged (asserted by the V2.3 gate).

## 2. FACT — what the gate says about its own two checks

From its header (`verify_S3prime.js:20-49`), quoted rather than paraphrased:

- S3.2′(a) is *"The causal F2 invariant. Policy-INVARIANT: forcing exploration forces runPrediction on every
  step, so this holds regardless of what the policy does."*
- S3.2′(b) *"replac[es] a single-seed point estimate with a robust aggregate, so ordinary policy-induced variance
  in F2b occupancy cannot flip the verdict while a genuine F2 regression still would."*
- F2b itself is *"DELIBERATELY UNREPAIRED (Ruling Q3)"*, and *"Replay-branch occupancy is POLICY-DEPENDENT, and
  the approved trust rectification changes the policy by design."*

## 3. FACT — what V2.3 changed

V2.3 replaces the FutureScore decision mechanism: learned edge cost `c_hat = (a+1)/(s+1)` from post-outcome
traversal evidence, a bounded simple-path recursion with terminal `−d`, and the projection `P = B·S/(S − FS)`
in place of `Math.min(FS·4, 20)`. Changing decision scoring changes the policy, and therefore changes
trajectories. This was declared in advance (`IMPLEMENTATION_READINESS_V2_3.md` §O, R-1).

## 4. INTERPRETATION — bounded, and not settled by this evidence

- S3.2′(b) is a **downstream, policy-dependent** quantity. V2.3 is a deliberate policy change, which is the class
  of change the gate's own header identifies as moving F2b occupancy.
- **S3.2′(a) remaining at 0/6 is evidence that the causal F2 invariant is intact**, since a genuine F2 regression
  would be expected to disturb the policy-invariant check as well. **This is evidence, not proof.**
- Two readings remain open and are **not** decided here: (i) V2.3 is a larger policy change than the variance the
  threshold was sized for; (ii) the new mechanism genuinely increases stale-branch occupancy. Separating them
  requires a purpose-built evaluation (§6).

**Explicitly not claimed:** that S3.2′(b) has been falsified; that V2.3 has caused a proven F2 defect; that this
result shows the new mechanism to be better or worse than the old one.

## 5. DISPOSITION

1. **S3′ was valid for the F2 repair lineage** and remains the authoritative superseding criterion for it.
2. **S3.2′(a) remains PASS at 0/6** and continues to carry the causal F2 invariant.
3. **S3.2′(b) is observed at 5.55% against the historical 5.28% threshold** — a real behavioural change relative
   to the historical criterion.
4. **V2.3 intentionally changes the decision mechanism.**
5. **S3.2′(b) is downstream and policy-dependent**, so it can change when the decision mechanism changes.
6. **The 5.55% measurement is retained as evidence**, together with S3.2′(a) = 0/6.
7. **The historical 5.28% threshold is NOT a V2.3 contract** and is not silently reinterpreted as one.
8. **`verify_S3prime.js` remains untouched**, and the gate continues to report its result unchanged.
9. **A future V2.3 stale-decision behavioural evaluation**, if scientifically required, **must be separately
   designed and authorized**; it may not be improvised from this gate's panel or threshold.
10. Every statement above is labelled FACT, INTERPRETATION or DISPOSITION, and none is promoted between classes.

## 6. Scope ratification recorded here (Director decision D2)

`IMPLEMENTATION_READINESS_V2_3.md` §R literally specified "two expressions" in `main.js`. The implementation
necessarily added two private helpers, **29 code lines at `main.js:1226-1316`**:

| Helper | Why it is entailed by the frozen contract |
|---|---|
| `projectFutureScore(fs, S)` | the contract places the projection in `main.js`, and the `−∞` / undefined branches must be named to be testable |
| `graphDiameter()` | `S = D` requires the largest finite pairwise hop distance of the **physical** graph; `goalDistance` is disqualified (learned transitions, depth-limited) and `canReachGoal` is a boolean filter |

**The Director has explicitly ratified this as implementation-detail expansion within the already-frozen
`main.js` consumer surface.** Both helpers are private and unexported, create no new architectural owner, and
leave `goalDistance`, `canReachGoal`, `goalGradientBoost`, `traversalRecord.js` and `render/scoring.js`
untouched. The Pass-1 document is **not** modified; this note is the record.

## 7. `D >= 1` (Director decision D3)

No production runtime assertion is added. `D >= 1` is a frozen contract precondition (F27), production `D = 4` is
verified independently by the V2.3 gate, and `D < 1` semantics are not invented. `P(−1, 0)` evaluates to `0`
mathematically and is not a division-by-zero case; `P(0, 0)` is undefined and lies outside the frozen production
domain.

## 8. Historical-lineage coupling observed at this milestone

Gates that fail because V2.3 intentionally changes their assumptions, **classified as historical-lineage
coupling and left unmodified**:

| Gate | Check(s) | Class |
|---|---|---|
| `experiments/boundary/verify.js` | `A3` (predicted by FS-LN-01 §3.4), plus `A1`, `A2`, `B5.1` (milestone-scoped `main.js` diff assertions), `G5` (self-counting on `research/preregistrations`) | scope assertions of a closed milestone |
| `experiments/boundary/verify.js` | `B4.2` — the record now has a second production **importer**, `render/planning.js` | **authorized** by V2.2 D6(d): FutureScore is a read-only consumer. The single-**writer** property still holds (`B4.1`, and `P1` of the V2.3 gate) |
| `experiments/futurescore/verify_lineage.js` | `L4b`, `L4e`, `L4f` — assert "implementation has not started" | flip by design at implementation (FS-LN-01 §5 calls these the *pre-implementation half*) |
| `experiments/futurescore/verify_lineage.js` | `L3b`, `L8c` | scope assertions naming later-milestone files (`IMPLEMENTATION_READINESS_V2_3.md`) and the now-changed production files; the self-counting class already recorded |
| `research/preregistrations/verify_fs_v23.js` | `G5` | tree-identity assertion, already retired in FS-LN-01 §4 |
| `experiments/phase1_0/verify_G9.js` | `G9.1`, `G9.2b`, `G9.6e` | announced by G9-LN-01; superseded by `verify_G9_successor.js` |

**Correction to FS-LN-01's prediction, recorded for accuracy:** §3.4 named boundary `A3` only and stated that
*"the other 53 checks stay meaningful and are expected to continue passing."* Six boundary checks in fact fail.
FS-LN-01 is **not** edited; this note records the wider blast radius, which is of the same structural classes it
described plus the authorized second-importer case.
