# M7 — Characterization Findings

**Status:** non-frozen project record · **Date:** 2026-08-23 · **Author:** Chief Systems Engineer
**Authority:** Director ruling of 2026-08-23 (*Close current acceptance-sampler milestone*).

**Relation to the frozen artifact:**

| | |
|---|---|
| Frozen document | [`M7_PREREGISTRATION.md`](M7_PREREGISTRATION.md) v1.0 |
| **SHA-256** | **`2f12e309d7409e95f3d1bca34135110e518865fd01d96e5eeaee347b6e33f6b9`** |
| Verify | `cd research/cognitive-audit && sha256sum -c M7_PREREGISTRATION.sha256` |

> **THIS IS NOT AN ERRATUM.** It changes nothing. It supersedes no clause, defines no term, and carries no authority. It records **measured properties of the frozen design** so that later readers do not mistake silence for absence of knowledge.
>
> Every entry below is a **characterization finding, not a parameter change.** No threshold, observable, constraint, acceptance rule, or scientific criterion was altered, removed, weakened, or redefined in producing any of them. The frozen pre-registration and errata ERR-01 … ERR-07 are untouched.

---

## 1. R1 is load-bearing but empirically non-binding on the frozen topology

**Frozen §3.5 R1:** *"≥ 2 distinct routes to the goal from ≥ 6 start nodes"* — a member of the acceptance conjunction.

**Measured** (`verify_acceptance.js` D1, over every one of the 20 possible goal nodes on the frozen 20-node / 39-edge graph):

```
startsWith2 = 19   for ALL 20 possible goals
threshold   = 6
margin      = 13
goals where R1 is FALSE: NONE
```

**Characterization.** R1 is **load-bearing in the acceptance predicate** — `verify_acceptance.js` D6 confirms that negating the R1 term flips an accepted configuration to rejected — but it is **empirically non-binding on the frozen topology**: no configuration can ever be rejected by it, because R1 reads only topology and goal, both of which frozen §3.1 fixes (*"No topology change"*).

**Consequences.**
- No admissible mutation of R1 exists. `verify_acceptance.js` D1 therefore asserts R1's *correct computation* and *measured margin* rather than a falsification, and prints the finding on every run.
- Four of the five frozen acceptance constraints discriminate; R1 does not.
- **Not repaired, not removed.** R1 stands exactly as frozen.

---

## 2. G11 observables 1 and 2 are structurally redundant with R3 and R4

**ERR-06 §4.2** names five observables; frozen §3.5 R3 and R4 constrain two quantities.

**Measured** (`verify_acceptance.js` C3, C4, as an identity across all 30 pilot-block candidates):

```
rhoObs[0] === rho3                          for every candidate
rhoObs[1] === rho4                          for every candidate
|rhoObs[0]| < 0.10  <=>  R3 === true        for every candidate
|rhoObs[1]| < 0.10  <=>  R4 === true        for every candidate
```

**Characterization.**
- **Observable 1 (endpoint cosine similarity) is identical in acceptance effect to R3.**
- **Observable 2 (directed distance-to-goal) is identical in acceptance effect to R4.**

The ERR-07 acceptance conjunct is therefore a **strict superset of R3 ∧ R4 by construction**, not by coincidence — `env.js` reuses `rho3` and `rho4` rather than recomputing them. In operational terms the five-observable criterion adds exactly **three** new conditions: source endpoint degree, destination endpoint degree, canonical edge index.

**Consequence for verification.** Bypassing observable 1 or 2 is **unobservable**: R3/R4 reject such a configuration before the conjunct is reached. `verify_acceptance.js` asserts this as a structural identity rather than demonstrating it with a fabricated candidate. Measured over the pilot block, observables 1 and 2 caused **0 of 7** rejections.

**Not repaired, not removed.** All five observables retained; the `0.10` threshold unchanged.

---

## 3. Acceptance rate observed in the pilot block: 1 / 30

**Measured** (`verify_acceptance.js` §B and §E, seeds `900000–900029`, configIndex 0):

```
candidates                                        30
accepted by R1-R5 (frozen §3.5)                    8   (26.7%)
also satisfying all five |rho| < 0.10 (ERR-07)     1   (3.3%)
surviving configuration                       900000
  max |rho| 0.0854 (canonical-edge-index), margin to rejection 0.0146
  R2 r2Starts 4 (needs >= 1)   R5 r5Differing 7/19 (needs >= 4)
```

Rejection causes among the 8 R1–R5-accepted configurations, all in the three previously unconstrained observables:

```
source-endpoint-degree        4/7 rejections   sole cause 0
destination-endpoint-degree   3/7 rejections   sole cause 1
canonical-edge-index          5/7 rejections   sole cause 2
endpoint-cosine-similarity    0/7              (constrained by R3)
directed-distance-to-goal     0/7              (constrained by R4)
```

**Acceptance is non-vacuous** (`verify_acceptance.js` E1–E3): at least one configuration survives, it is scientifically usable, and all 29 rejections are attributable to a named criterion. Had zero survived, that would have been reported RED, not passed.

**Characterization, not a change.** The rate is a measured consequence of the frozen `0.10` threshold applied at n = 39 edges, where the permutation-null standard deviation of Spearman ρ is `1/√38 = 0.1622` — so `0.10` is **0.616 σ**. Nothing was tuned to obtain this rate, and nothing may be tuned in response to it.

---

## 4. What these findings are — and are not

| | |
|---|---|
| **Are** | measured properties of the frozen design, recorded so they are not rediscovered as surprises |
| **Are** | reproducible: `node experiments/m7/verify_acceptance.js` prints §1–§3 on every run |
| **Are not** | errata. No clause is superseded, no term defined, no authority claimed |
| **Are not** | parameter changes. No threshold, observable, constraint or acceptance rule was altered |
| **Are not** | grounds for repair. R1 stands; all five observables stand; `0.10` stands |

**Reproduce:** `node experiments/m7/verify_acceptance.js` · `node experiments/m7/diagnose_G11.js`

---

## 5. Open items at closeout (status, not findings)

Recorded for completeness; each awaits a Director ruling and none is addressed here.

| Item | State |
|---|---|
| **G8** | **RED.** E6 telemetry implemented and non-vacuous; the failing sub-clause is frozen §9.1's *"the two are verified to differ"*, which the G8 adjudication classified as a frozen-specification contradiction present at freeze. A draft erratum was prepared and **not written**. Hard Stage-1 blocker (frozen §12.2). |
| **G15** | **NOT_IMPLEMENTED.** No reward-eligibility substrate; its criterion (*"no systematic dependence"*) is undefined in frozen text. Hard Stage-1 blocker. |
| **Tick unit** | Unruled: 3000 `runAgent()` steps vs 3000 `runAgentLoop` iterations — a 5× difference. Blocks any real run. |
| **150-tick episode cap** | Frozen §3.7 requirement with no mechanism in `main.js`. Not implemented. |
| **Held-out yield** | At 3.3 %, 30 accepted configurations need ~900 candidate seeds against frozen §5.1's declared 30-seed block. Deferred by Director ruling. Blocks Stage 2. |
| **Post-shift (Phase II) leakage** | Recorded in ERR-07 §3.1 as a W3 limitation, measured up to \|ρ\| = 0.3077. Unresolved by design. |
| **`run.js` default vs ERR-06 §2.3** | `run.js` defaults `ENV=on, CREDIT=on`; ERR-06 §2.3 states the default invocation is `ENV=off, CREDIT=off`. One line either way; awaiting ruling. |
| **Stale ERR-03 comments in `env.js`** | Header line 23 and line 245 describe the **superseded** finite-horizon R5. The code implements ERR-04 (`R5_STATUS = 'IMPLEMENTED_PER_ERR_04'`). Documentation only. |

---

**STATUS: CHARACTERIZATION RECORDED · FROZEN DOCUMENT AND ERRATA UNMODIFIED**

Digest `2f12e309d7409e95f3d1bca34135110e518865fd01d96e5eeaee347b6e33f6b9` validates unchanged. No Stage 1, pilot, or confirmatory run. Held-out block `900500–900529` uninspected. Nothing committed, nothing pushed.
