# M32 — Trajectory-Seed Namespace Governance

**Status:** FORMULATION ONLY — specification, not implementation
**Milestone:** M32
**Date:** 2026-09-11
**Authority:** Director ruling of 2026-09-11 — *M31 ACCEPTED WITH REPAIR → M32 AUTHORIZED*

**No registry edit. No production, C1, UQ-B, preregistration or F1–F4 change. No seed consumed. No
experiment. No push.** Source, registry, protocols and verifiers were read only.

---

## 1. Verdict

> # M32-GREEN
> **The minimum sufficient repair is TYPED SEED IDENTITY: a seed is `(namespace, value)`, and every
> governance predicate must be able to REFUSE a value whose namespace it does not govern.**
>
> The Director's proposal — a separate trajectory namespace with its own identity, consumed,
> held-out, provenance, authorization and collision rules — is **correct in substance**, and §4
> audits it. But it names the *artifact*. **The root cause is narrower and sharper: `isHeldOut` is a
> TOTAL predicate over integers. It returns a verdict for every integer, including values from a
> namespace it was never written for. A predicate that cannot say "not mine" will always mis-answer.**
>
> **And one thing must NOT be copied from the configuration-seed model** (§8.3): configuration seeds
> are consumed **per value**; trajectory seeds must be consumed **per (value, study)**, because a
> `C × R` design *requires* the same `R` across every `C`. Copying the existing semantics would make
> the very study this governance exists to enable **impossible**.

---

## 2. The exact question

> *What is the minimum governance mechanism that completely prevents the ambiguity found in M30/M31,
> while supporting a future `C × R` study — without over-engineering, and without weakening any
> protection that currently holds?*

---

## 3. The existing model, from source

`experiments/registry/consumed.js` and the protocol guards (`c1/protocol.js:42–88`,
`uqb/protocol.js:61–66`):

```
HELD_OUT_FLOOR = 900500
isHeldOut (s)  = Number.isInteger(s) && s >= HELD_OUT_FLOOR            // TOTAL over integers
isConsumed(s)  = CONSUMED_RANGES.some(r => s >= r.lo && s <= r.hi)     // TOTAL over integers
inRegisteredBlock(s) = FROZEN.seedLo <= s <= FROZEN.seedHi             // per-study
assertSeedAllowed(seed, {collection}) → integer? → held-out? → consumed? → registered/authorised?
```

`CONSUMED_RANGES` is an ordered chain — each study's link spreads the previous study's list — with a
`why` string citing the commit that spent it.

| Property | Status |
|---|---|
| identity | **the integer value alone.** No type, no namespace |
| states | HELD-OUT, CONSUMED, and "neither" — implied, never named |
| exclusivity | **not enforced.** The guard *orders* the checks, so held-out wins; overlap is possible and undetected |
| consumption unit | the **value** |
| held-out | a numeric **floor** |
| provenance | a free-text `why`, by convention citing a commit |
| authorization | env var **plus** call-site flag, fail-closed |

> **EVIDENCE.** All of the above is read from source. The chain convention, the fail-closed
> authorization and the commit-citing `why` are genuine strengths and **are preserved** below.

---

## 4. The failure, and why it is not a bug

Executed in M30/M31:

```
isConsumed(20260819000) === false
isHeldOut (20260819000) === true
```

**Classification — (D) multiple issues, and NOT (A) a bug:**

| | |
|---|---|
| **(A) a bug** | **No.** `isHeldOut` does exactly what it was written to do |
| **(B) expected consequence of a single numeric rule** | **Yes — the proximate mechanism.** One floor over one integer line must answer for every integer |
| **(C) a namespace-design limitation** | **Yes — the root cause.** There is no type to distinguish a configuration seed from a trajectory seed |
| **(D) multiple issues** | **Yes: B is how it happens, C is why.** |

> **The minimal invariant that prevents this entire class:**
>
> **A governance predicate must be PARTIAL over its namespace: given a seed of a namespace it does
> not govern, it must refuse rather than return a verdict.**
>
> Raising the floor, or moving trajectory seeds below it, would leave the predicate total and simply
> relocate the ambiguity. **Only refusal removes the class.**

---

## 5. Candidate designs

| | Design | Verdict |
|---|---|---|
| **N1** | Raise `HELD_OUT_FLOOR` above all agent seeds | **REJECTED.** A numeric hack; the predicate stays total; a larger future seed recreates it; **and it would silently un-hold-out the ≥ 900500 configuration region, weakening a protection that currently holds** |
| **N2** | Reserve a numeric sub-range of the same line for trajectory seeds | **REJECTED.** Typing by convention. A mistyped value lands in the wrong region **silently**, which is the failure being repaired |
| **N3** | **Typed identity: a seed is `(namespace, value)`; predicates refuse foreign namespaces** | **SELECTED** — the only candidate that removes the class rather than relocating it |
| **N4** | Two entirely separate registries, untyped | **REJECTED.** Separation without typing does not stop a caller passing a trajectory seed to the configuration predicate — the exact mistake made |

> N3 is **not purely additive**: the existing configuration registry must also **declare its
> namespace**, or a typed trajectory seed could still be handed to an untyped configuration
> predicate. §17 records this as a MUST, and §21 as the principal implementation risk.

---

## 6. `configSeed` — scientific meaning

**Identifies an environment.** `makeConfig(configSeed, configIndex)` determines the reliability
assignment, embeddings and goal (M24-R1 §2). Used by M7, M8, Q1, UQ-A, UQ-B, C1 and the 896xxx
development fixtures. **Consumed per value**, because one value yields one environment family and
re-drawing it would re-measure the same environment.

## 7. `agentSeed` — scientific meaning, and its name

**Identifies a source of stochasticity — not a trajectory.** It seeds all four RNG streams
(`run.js:318–321`) and nothing else (M26/M27).

> **Naming. The value should be called `trajectorySeed` in the governance layer, while the runtime
> parameter stays `agentSeed`.** M31 established that one seed yields **two different realised
> trajectories**, one per arm. A name must not imply what the object is not:
>
> - `agentSeed` suggests it configures *the agent* — it does not; the agent's initial state is a
>   constant (M26/M27).
> - Calling it `trajectorySeed` says it **seeds** a trajectory, without claiming it **is** one.
>
> **The runtime name is NOT changed** — that would be a production edit. The governance layer
> introduces `trajectorySeed` as the typed identity of the same value.

---

## 8. Identity model

### 8.1 Two trajectory seeds are the same iff

```
same(a, b)  ⟺  a.namespace === b.namespace  ∧  a.value === b.value
```

**Representation:** the canonical form is the pair. A bare integer is **not** a seed identity and
must not be accepted by any governance predicate.

### 8.2 Three distinct objects that must never be conflated

| Object | What it is | Cardinality, from M31 |
|---|---|---|
| **`trajectorySeed`** | an **input** — the shared source of stochasticity | one per unit |
| **realised trajectory** | an **arm-dependent outcome** of `(content, seed, arm)` | **two per seed** — M31 measured `cogDraws` differing in 12/12 cells |
| **trajectory fingerprint** | a post-hoc **identifier of a realised trajectory** | one per realised trajectory |

> **Why they must stay separate.** Seed → trajectory is **one-to-many** across arms (M31, evidence).
> Trajectory → fingerprint is **many-to-one in principle**, since a hash collision is possible —
> M31-R1 established only that *no collision was detected in that development set*. **Neither map is
> a bijection, so neither object can stand in for another.**

### 8.3 Consumption unit — where the configuration model must NOT be copied

| | Configuration seeds | Trajectory seeds |
|---|---|---|
| unit | **the value** | **the `(value, study)` pair** |
| why | one value ⇒ one environment; re-drawing re-measures it | a `C × R` design applies **the same `R` to every `C`** |

> **This is the decisive divergence.** Under per-value consumption, using trajectory seed `t` at the
> first configuration would consume it and **block every remaining configuration** — making the
> factorial design impossible. **Copying the existing semantics would forbid the study this
> governance exists to enable.**
>
> **Invariant:** a trajectory seed may be used at **any number of configurations and both arms within
> one study**, and by **no second study**.

---

## 9. State machine

**Three states, per namespace. Mutually exclusive by construction — which the current model does not
enforce:**

| State | Meaning | Invariant it protects |
|---|---|---|
| **AVAILABLE** | never allocated | that fresh territory exists |
| **HELD-OUT** | reserved, never to be generated, inspected or inferred | a genuinely untouched future test set |
| **CONSUMED** | allocated to a named study | that no two studies share a seed |

`REGISTERED` is **not** a registry state — it is **study-scoped** (`inRegisteredBlock` + fail-closed
authorization) and is preserved exactly as it is.

**Transitions — monotone, and that monotonicity is the whole protection:**

| Transition | Legal? | Why |
|---|---|---|
| AVAILABLE → CONSUMED | **YES** | ordinary allocation |
| AVAILABLE → HELD-OUT | **YES**, by explicit authorization only | reservation |
| **HELD-OUT → CONSUMED** | **ILLEGAL** | the held-out guarantee *is* this prohibition |
| **CONSUMED → AVAILABLE** | **ILLEGAL** | un-consuming permits silent reuse |
| **HELD-OUT → AVAILABLE** | **ILLEGAL** | releasing reserved territory destroys the guarantee |

> **No state is ever left.** `HELD-OUT ∩ CONSUMED = ∅` must be **asserted**, not assumed — the
> current model leaves it to check ordering (§3).

---

## 10. Provenance — minimum fields, each justified

| Field | Why it is necessary |
|---|---|
| `namespace` | without it there is no typed identity (§4) |
| `value` | the seed |
| `study` | the consumption unit is `(value, study)` (§8.3) |
| `status` | `development` \| `pilot` \| `registered` \| `held-out` (§11) |
| `authorization` | the Director ruling or commit that permitted it — **verifiable**, unlike a date |
| `executed` | whether it was actually run, or only reserved. M31's 896xxx note shows the distinction matters |
| `artifact` | the data file that resulted — makes the record auditable |

**Deliberately NOT included:** date (a commit reference is strictly stronger and already carried);
version (the commit carries it); free-text notes beyond `why` (the existing convention suffices).

---

## 11. Development / pilot / registered / held-out

| | Purpose | Claim licensed |
|---|---|---|
| **A development** | instrument work | none |
| **B pilot** | attainability | none about any population |
| **C registered** | the preregistered collection | the study's own |
| **D held-out** | never touched | none, ever |

**Transitions between categories: FORBIDDEN in all directions.**

> **A/B → C is forbidden as a CONSERVATIVE CHOICE, not a derived necessity — and it is stated as
> such.** A development trajectory seed is not obviously contaminated for a *different* configuration,
> because its realisation depends on the configuration. But adjudicating that subtlety costs more
> than the alternative, and the trajectory space is 2³² wide, so **the conservative rule is free.**
> This mirrors the registry's own reasoning when it declared the whole 896xxx block consumed rather
> than only the seeds actually run.
>
> **D → anything is forbidden absolutely** (§9).

---

## 12. Collision rules — which are real

| # | Class | Verdict |
|---|---|---|
| 1 | configSeed / configSeed | **REAL** — two studies drawing one environment. Already prevented |
| 2 | trajectorySeed / trajectorySeed **across studies** | **REAL** — the new rule (§8.3) |
| 2b | trajectorySeed / trajectorySeed **within one study** | **NOT a collision — it is REQUIRED** by the factorial design |
| 3 | configSeed value == trajectorySeed value | **NOT a collision.** Different namespaces ⇒ different objects. **Legal and meaningless under typed identity** — forbidding it would solve a non-problem |
| 4 | development / registered | **REAL**, prevented by §11 |
| 5 | held-out / consumed | **REAL**, prevented by the §9 invariant |
| 6 | provenance collision (one seed, two records) | **REAL** — an accounting fault; the record must be unique per `(namespace, value, study)` |
| 7 | trajectory **fingerprint** collision | **NOT a governance collision.** A measurement property, handled by the duplicate-check procedure (M31-R1). **Governance must not try to prevent it** |

---

## 13. The `20260819000` case

Classified at §4 as **(D)**: **(B)** a total predicate over one integer line is the mechanism,
**(C)** the missing namespace type is the cause. **Not a bug.**

**It is not modified here.** Under the specification it becomes:
`{ namespace: 'trajectory', value: 20260819000, study: 'M7-substrate', status: 'registered',
executed: true }` — and `isHeldOut` in the **configuration** namespace would **refuse** it rather
than answer.

---

## 14. Relationship to the `895000–895999` gap

**Separable — and I tested the claim rather than assuming it.**

| | |
|---|---|
| **Are they inseparable?** | **No.** The 895xxx gap is a *configuration-namespace* accounting omission: C1's own block was never recorded as consumed. The trajectory namespace does not touch it |
| **Do they share an implementation file?** | **Yes** — both live in `experiments/registry/`. Typed identity requires editing the configuration registry (§5), which is the same file the 895xxx repair would touch |
| **Conclusion** | **Adjacent in implementation, separate in substance. They must remain SEPARATE COMMITS under separate authorization**, even if executed in the same session. Folding an accounting repair into a namespace refactor is exactly the silent-scope-expansion this program forbids |

---

## 15. `C × R` requirements this governance must support

| Requirement | Supported by |
|---|---|
| paired configuration × seed assignment | §8.3 — one seed across all configurations within a study |
| reproducible reruns | reruns of the *same* study are reproduction, not new consumption (§9, Case 6) |
| development/registered separation | §11 |
| held-out trajectory seeds | §9 — mechanism present; **no current requirement demands one** (§17) |
| exact consumed accounting | §10, enumerated (§16) |
| provenance | §10 |
| no accidental reuse | §8.3 + §9 monotonicity |
| independent seed allocation | typed namespace, 2³² wide |
| persistence of `cogDraws` | **a data requirement of the future study, not a governance object.** Governance records that it was persisted; it does not store it |
| fingerprint recording | same — recorded per `(unit, arm)`, not a governance identity (§12.7) |

---

## 16. Held-out representation — ranges vs enumeration

| | Collision risk | Auditability | Scalability | Reproducibility |
|---|---|---|---|---|
| **A numeric ranges** | low if disjoint | good | good | good |
| **B enumerated lists** | none | **exact** | linear in count | exact |
| **C typed namespace + ranges** | low | good | good | good |
| **D typed namespace + enumeration** | none | **exact** | linear | exact |

> **SELECTED: D for consumption, and C permitted for held-out.**
>
> **The reason is the draw mechanism, not preference.** Configuration seeds were drawn in
> **contiguous blocks**, so a range represents them exactly. M25 established that a defensible
> trajectory sample requires **uniform random draw**, which produces **scattered** values. **A range
> cannot represent a scattered set without over-claiming territory it never used.** Consumption must
> therefore be **enumerated**.
>
> Held-out territory, by contrast, is *reserved in advance* and may legitimately be contiguous, so a
> typed range remains available for it.

---

## 17. MUST / SHOULD / NOT NECESSARY

**MUST HAVE**
1. **Typed identity** `(namespace, value)`; bare integers rejected (§8.1).
2. **Partial predicates** — refusal on a foreign namespace (§4). *The invariant that closes the class.*
3. **Configuration registry declares its namespace** — otherwise typing is one-sided (§5).
4. **Consumption unit `(value, study)`** for trajectory seeds (§8.3).
5. **Monotone state machine** with `HELD-OUT ∩ CONSUMED = ∅` asserted (§9).
6. **Enumerated trajectory consumption** (§16).
7. **Provenance**: namespace, value, study, status, authorization, executed, artifact (§10).
8. **Category transitions forbidden** (§11).
9. **Fail-closed authorization preserved** — env var *and* call-site flag, unchanged from the
   existing model.

**SHOULD HAVE**
10. A **held-out trajectory region** — the mechanism, without reserving one now: no current
    requirement demands it, and reserving territory without a purpose is over-engineering.
11. A **migration note** recording that `20260819000` and M31's five offsets are retrospectively
    typed, with `executed: true`.

**NOT NECESSARY**
12. **A new pairing identifier.** The paired unit is `(content, trajectorySeed)`; the arm is a
    treatment label and the realised trajectory an outcome. **Nothing further identifies the unit**
    (§8.2).
13. **Forbidding cross-namespace numeric equality** — a non-problem under typed identity (§12.3).
14. **Governance of fingerprints** — a measurement property (§12.7).
15. **Date/version fields** — a commit reference is strictly stronger (§10).

---

## 18. PASS 2 — adversarial cases

| # | Case | Caught? | By what |
|---|---|---|---|
| 1 | `configSeed = 123`, `trajectorySeed = 123` | **No problem to catch** | §12.3 — distinct objects; legal and meaningless |
| 2 | development seed later requested for registered collection | **YES** | §11 — category transitions forbidden |
| 3 | trajectory seed falls inside the old configSeed held-out range | **YES** | §4 — the configuration predicate **refuses** a trajectory seed instead of answering. *This is the `20260819000` case, and it is the one the design exists to fix* |
| 4 | trajectory seed consumed while the same numeric configSeed stays held-out | **No problem** | §12.3 — independent states in independent namespaces |
| 5 | same seed for ARMED and ABLATED | **REQUIRED, not caught** | §8.3 — this is the CRN design; forbidding it would break the study |
| 6 | same seed rerun for verification | **Permitted** | §9 — reruns of the *same* study are reproduction; consumption is `(value, study)` and the study is unchanged |
| 7 | two seeds → identical fingerprint | **Not a governance matter** | §12.7 — measurement; duplicate-check handles it |
| 8 | one seed → different fingerprints across arms | **Expected** | §8.2 — M31 evidence; the map is one-to-many by construction |
| 9 | held-out seed passed to a development harness | **YES** | §9 — HELD-OUT → CONSUMED is illegal, and the guard is fail-closed |
| 10 | consumed seed selected again | **YES if by another study** (§8.3); **permitted within the same study** (Case 6) | the `(value, study)` unit distinguishes them — **a per-value rule could not** |
| 11 | 895xxx remains a configSeed issue | **YES** | §14 — separate substance, separate commits |
| 12 | `C × R` needs 1000 trajectory seeds while configSeed uses its own 1000 block | **No conflict** | independent 2³² namespaces |

### 18.1 Attacks that found something

**Attack — "Case 10 is ambiguous: is a rerun a second use?"** **It landed, and §8.3/§9 were written
because of it.** Under a naive per-value rule, a verifier re-running a committed result would be
"reusing a consumed seed" and would be refused — breaking every reproduction gate this program
relies on. **The `(value, study)` unit resolves it**: same study ⇒ reproduction; different study ⇒
refused.

**Attack — "typed identity is additive, so migration is safe."** **Failed — §5 corrects it.** Typing
only one namespace leaves the other total. The configuration registry must be edited too, which is a
change other studies depend on.

**Attack — "enumeration will not scale to 1000 seeds."** **Failed.** A 1000-entry list is trivial to
store and exactly auditable; and a range would *over-claim* scattered territory, which is worse than
verbose.

**Attack — "if the pilot seeds are burned, M31 wasted territory."** **Failed.** 6 values of 2³².

---

## 19. Evidence → Inference → Hypothesis

**EVIDENCE** *(source and committed artifacts)*
- **Ev-1.** `isHeldOut(s) = s >= 900500`, total over integers (`c1/protocol.js:46`).
- **Ev-2.** `isConsumed` is range-based and total (`:47`).
- **Ev-3.** `assertSeedAllowed` orders held-out → consumed → registered, fail-closed (`:61–88`).
- **Ev-4.** Executed: `isConsumed(20260819000) === false`, `isHeldOut(20260819000) === true`.
- **Ev-5.** M31: one seed produced different `cogDraws` per arm in 12/12 cells.
- **Ev-6.** The registry's chain convention cites commits in `why`.

**INFERENCE**
- **In-1.** The failure class is a total predicate over an untyped value; only refusal removes it (Ev-1, Ev-4).
- **In-2.** Seed → realised trajectory is one-to-many across arms (Ev-5), so the objects cannot be conflated.
- **In-3.** Per-value consumption would make `C × R` impossible, so the unit must be `(value, study)`.
- **In-4.** A random draw produces scattered values, so consumption must be enumerated, not ranged.
- **In-5.** Typed identity is not purely additive — the configuration registry must also be typed.

**HYPOTHESIS**
- **Hy-15.** That no *other* namespace is latent in the system. A trace found configuration and
  trajectory only; **that is not proof**.
- **Hy-16.** That forbidding development → registered reuse costs nothing. **Plausible given 2³²,
  and adopted as a conservative choice rather than a derived necessity** (§11).

> **No governance rule proposed here is a discovered source fact.** §3, §4 and Ev-1…Ev-6 are source.
> **Everything in §8–§17 is a PROPOSED RULE**, and none of it is implemented.

---

## 20. Remaining uncertainties

1. **Hy-15** — whether a third namespace is latent.
2. **Migration risk** — §5/In-5: typing the configuration registry touches a file every study
   depends on. Specified, not executed; the implementation milestone carries the risk.
3. **No held-out trajectory region is reserved**, deliberately (§17.10). If a future validation study
   needs one, it must be reserved *before* any trajectory collection, not after.

**None blocks the specification.** 1 is a bounded hypothesis, 2 is an implementation concern, 3 is a
deferred decision with a stated deadline.

---

## 21. Status

> # M32-GREEN
> **The formulation is sufficiently specified and no material governance failure remains.**

Not YELLOW: the three uncertainties in §20 are a bounded hypothesis, an implementation risk and a
deliberately deferred reservation — **none is an unresolved governance question**. Not HOLD: no
foundational ambiguity remains; §4 names the invariant precisely. Not RED: §18 exercises twelve
adversarial cases, and the namespace approach catches every genuine collision while correctly
declining to solve the three non-problems.

---

## 22. Single highest-value next decision

> ## M33 — Typed-Namespace Registry Implementation
> *Implementation milestone, requiring separate Director authorization.*
>
> Implement §17's nine MUST items in `experiments/registry/`, under the 2× workflow: a Pass 1
> specification gate, then a Pass 2 implementation-plus-verification gate, **not collapsed**.
>
> **It must be a separate commit from the `895000–895999` configuration-seed repair** (§14), even if
> both are authorised together and touch the same directory.
>
> **Migration is the principal risk** (§20.2): typing the configuration registry changes a module
> M8, Q1, UQ-A, UQ-B and C1 all import. Every existing guard must continue to refuse exactly what it
> refuses today — **verified against the committed protocols, not asserted.**

**Not recommended as next:** any `C × R` collection. It remains gated on M33, and M31 §2.1 recorded
that its cost-justification is still unanswered.

---

Believe in yourself and keep going
