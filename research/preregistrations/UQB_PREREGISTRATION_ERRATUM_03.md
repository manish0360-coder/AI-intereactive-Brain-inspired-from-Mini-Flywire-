# UQ-B Pre-Registration — Erratum 03

**Erratum ID:** UQB-ERR-03

**Date:** 2026-09-09
**Author:** Chief Systems Engineer
**Authority:** Director ruling of 2026-09-09 — *HOLD the registered UQ-B collection; instrument
generalization stress test*, §7, following an independent review by Gemini.

**Binds to frozen artifacts:**

| | |
|---|---|
| Document | [`UQB_PREREGISTRATION.md`](UQB_PREREGISTRATION.md) v1.0 (frozen 2026-09-09, `3b3d195`) |
| **SHA-256** | **`bc655022b63e8022ed6427001da6a90eb2f9ec139cf413ab367e9bc7269ba46e`** |
| Erratum 01 | [`UQB_PREREGISTRATION_ERRATUM_01.md`](UQB_PREREGISTRATION_ERRATUM_01.md) (frozen 2026-09-09, `84c738e`) |
| **SHA-256** | **`10e0981df5e4eec78e6c77f5bb9c94c852d36525ce61cd66f12165ae3c64b9e1`** |
| Erratum 02 | [`UQB_PREREGISTRATION_ERRATUM_02.md`](UQB_PREREGISTRATION_ERRATUM_02.md) (frozen 2026-09-09, `59c2750`) |
| **SHA-256** | **`88b9edbe8e7f4cb706c8a61400bd439fe64249e57facfc7446fa1168380786f3`** |
| Verify | `cd research/preregistrations && sha256sum -c UQB_PREREGISTRATION.sha256 UQB_PREREGISTRATION_ERRATUM_01.sha256 UQB_PREREGISTRATION_ERRATUM_02.sha256` |

> **NO FROZEN ARTIFACT IS MODIFIED BY THIS ERRATUM.** The bytes and digests of the v1.0
> pre-registration, UQB-ERR-01 and UQB-ERR-02 are unchanged, verified immediately before and
> immediately after. This erratum **adds an interpretive limitation by reference**. It corrects no
> claim, changes no definition, and rewrites nothing.

---

## 0. Purpose, stated first

This erratum records **one interpretive limitation** on the scope of the C1 and C2 estimands.

It is a **documentation clarification, not a protocol redesign.** Nothing about the measurement
changes. The limitation describes a property the measurement protocol **already had** from the
moment UQB-ERR-02 §8 authorised the R3 control; it was implemented correctly and described
accurately in operational terms, but its consequence for the *interpretation* of the estimands was
never written down.

Writing it down is the entire content of this erratum.

---

## 1. The limitation

UQB-ERR-02 §8 authorised the R3 control: during the UQ-B readout, the persistent writes performed by
`regulateBiology` are suspended, so that repeated arrangement measurements probe the same
pre-readout cognitive state rather than progressively aging the agent across arrangement order.

That control is **methodologically necessary and remains in force.** Without it, arrangement *order*
would contaminate arrangement *content*, and J1 — the same-state control on which C2 depends —
could not reach its required 0/19.

It nevertheless has an interpretive consequence, which is hereby recorded:

> **The C1 and C2 estimands measure policy alignment in a state where the agent's biological
> state-updating mechanisms are suspended. The results are conditioned on this measurement
> protocol.**

That sentence is the operative addition. It is added to the reading of **§10 (the statistic)**,
**§11 (C1)** and **§12 (C2)** by reference.

---

## 2. What this limitation does NOT say

Stated explicitly, because each of these would be a misreading:

1. It does **not** say the R3 control is invalid. It is valid and required.
2. It does **not** say biological state is irrelevant to cognition, that `regulateBiology` is
   unimportant, or that the architecture would be improved by its absence. UQB-ERR-02 §8 already
   forbids that description and that prohibition is restated here.
3. It does **not** say C1 or C2 is confounded. The suspension applies **identically** to both arms
   and to all 20 arrangements, so it cannot generate a difference between them.
4. It does **not** narrow the estimand's population. The readout remains the full 19-state decision
   population; §7 is untouched.
5. It does **not** license any reanalysis, reinterpretation, or additional statistic. §13 continues
   to forbid all of them.

The limitation is a statement about **the conditions under which the measured policy was read**,
not about the validity of the comparison performed on it.

---

## 3. Why the comparison remains causally interpretable

The R3 suspension is a property of the **measurement instrument**, applied after the run, uniformly:

- Both arms live their full 3,000-tick history with biology regulating **exactly as committed** —
  the suspension is not active during the run. C1 therefore still compares the policies that result
  from two genuinely different experiential histories.
- Within a configuration and arm, all 20 arrangements read the **same** post-run learned state under
  the **same** suspension. C2's null is therefore undisturbed.
- Ordering is structural, not empirical: `bestChoice` is determined at `main.js:2365` and
  `regulateBiology` runs at `main.js:2822`, so the control cannot alter the value measured in its
  own call (UQB-ERR-02 §4/§5).

What the limitation adds is the honest scope statement: the policy that was scored is the greedy
policy **as read under a biologically suspended readout**, and a reader must not silently assume it
is identical to the policy the agent would express in free running. That question is not measured
by UQ-B and is not claimed by it.

---

## 4. Frozen elements — confirmed UNCHANGED

Every scientific decision remains exactly as frozen. Confirmed one by one:

| # | Frozen element | Status |
|---|---|---|
| 1 | The hypothesis | UNCHANGED |
| 2 | C1 — the causal ARMED vs ABLATED estimand | UNCHANGED |
| 3 | C2 — the redistribution discriminator | UNCHANGED |
| 4 | K = 19 | UNCHANGED |
| 5 | α = 1/20, one-sided, C2 only | UNCHANGED |
| 6 | Strictly-greater-than-all-19 rejection; ties do not reject | UNCHANGED |
| 7 | The registered seed block 897000–897999 | UNCHANGED |
| 8 | The 4 frozen goal indices | UNCHANGED |
| 9 | The acceptance predicate (R1–R5, G11) | UNCHANGED |
| 10 | The 19-state decision population | UNCHANGED |
| 11 | The 3,000-tick budget | UNCHANGED |
| 12 | The agent seed and M7 arm | UNCHANGED |
| 13 | §13 — no additional statistic, ever | UNCHANGED |
| 14 | Minimum evidence: 20 configurations | UNCHANGED |
| 15 | Phases never pooled | UNCHANGED |
| 16 | The §12 ablated wiring control | UNCHANGED |
| 17 | J1 acceptance: exactly 0/19 (ERR-01 §8) | UNCHANGED |
| 18 | The R2 control (ERR-01 §4) | UNCHANGED |
| 19 | The R3 control (ERR-02 §8) | UNCHANGED — its *scope* is described, not altered |
| 20 | §15 instrumentation surface | UNCHANGED |
| 21 | §19 — no adaptive extension of the seed range | UNCHANGED |

**21 of 21 frozen elements unchanged.** This erratum adds interpretive text and nothing else.

---

## 5. Effect on collection

None. The measurement machinery is not modified by this erratum, so no re-verification of the
implementation is required and none is claimed. The instrumentation digests and the preflight
evidence stand as they were.

This erratum does **not** authorise collection. That remains a separate Director ruling.

---

## 6. Supersession record

| Erratum | Subject | Status |
|---|---|---|
| UQB-ERR-01 | J1 resolution; G12/G13 corrected; §15 extended to `render/predictionError.js` | In force, as corrected by ERR-02 §1 |
| UQB-ERR-02 | Corrected closure claim; R3 control; §15 extended to `render/behavior.js` | In force |
| **UQB-ERR-03** | **Interpretive limitation on C1/C2 scope under the R3 control** | **In force** |

No erratum is rewritten. Each remains the historical record of what was specified when it was
frozen.
