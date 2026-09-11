# M22 — Pathway-Decomposition Formulation

**Status:** FORMULATION ONLY — no implementation, no experiment, no preregistration, no seeds
**Milestone:** M22
**Date:** 2026-09-11
**Author:** Chief Systems Engineer
**Authority:** Director ruling of 2026-09-11 — *M21 ACCEPT WITH SPECIFIC REPAIR → M22 AUTHORIZED*

**Nothing was run. No production source, preregistration, frozen artifact, dataset, filter (F1/F2)
or registry entry was modified. No seed was generated, inspected, selected or consumed.** The
`895000–895999` registry defect remains open and untouched, as a separate administrative matter.

Source was **read** (`main.js:1591–1680`) to establish the causal structure. Reading is not
modifying; no line of production code changed.

---

## 0. Headline verdict, stated before the argument

**The proposed causal decomposition `Total = Ranking + Admission` is REJECTED. It is not well-posed
and not identifiable under the existing ARMED-vs-ABLATED intervention.** Four independent reasons,
each sufficient on its own (§5).

**A different question survives, and it is well-posed, attainable and discriminating** — but it is
**not a decomposition of the C1 contrast**. It is a new estimand under a **declared new
intervention**, and this memo names it as such rather than disguising it as a decomposition (§12).

I was authorised to formulate a decomposition. The honest answer is that the decomposition does not
exist, and the Director's acceptance condition explicitly permits that result. I am taking it rather
than weakening the question to manufacture one.

---

## 1. Exact research question

The M21 question, as approved:

> **Does the ARMED-vs-ABLATED difference in oracle-alignment arise from how the mechanism *ranks* a
> choice set both arms share, or from how it changes *which candidates enter* that choice set — and
> in what proportion?**

**§5 establishes that the clause "and in what proportion" has no answer.** No proportion is
identifiable, because no unique decomposition exists. The surviving form of the question is stated
at §12 and is strictly weaker than the approved one.

---

## 2. Formal variables and causal structure

Read from `main.js`, decision state `u`, phase `p`, arm `a ∈ {A = ARMED, B = ABLATED}`.

| # | Symbol | Definition | Arm-dependent? |
|---|---|---|---|
| — | `T` | the intervention: `futureBonus` delivered vs forced to 0, for 3000 ticks | the treatment |
| — | `S_a` | learned state at readout: `transitions`, `penalties`, `Q`, `rewards`, `adjacencyMemory`, `signals`, `timeMemory` | **yes** |
| — | `N(u)` | graph neighbours of the current node (`startNeuron.userData.neighbors`) | **no** |
| — | `G_a(u)` | generated set `= keys(transitions_a(u)) ∪ N(u)` (`main.js:1591–1601`) | **yes** |
| — | `Φ_a` | admission predicate F1∘F2∘F3∘F4 (`:1610`, `:1620`, `:1673`, `canReachGoal`) | **yes** |
| **1/2** | `P_a(u)` | decision-time pool `= {c ∈ G_a(u) : Φ_a(c)}` | **yes** |
| **8** | `n_a(u)` | `|P_a(u)|` | **yes** |
| **3** | `P_∩` | `P_A ∩ P_B`, size `m` | **both arms** |
| **4** | `X_A` | `P_A \ P_B`, size `e_A` | **both arms** |
| **5** | `X_B` | `P_B \ P_A`, size `e_B` | **both arms** |
| **6** | `w_a` | candidate weight from `analyzeCandidate`; **`futureBonus` enters here** | **yes** |
| **7** | `r_a` | `|{c ∈ P_a : w_a(c) > w_a(v*)}|`, rank 0 = ranked first | **yes** |
| **9** | `v*_p(u)` | oracle-optimal action, environment-defined | **NO — arm-independent** |
| **10** | `ρ_a` | `r_a/(n_a − 1)`, defined iff `n_a ≥ 2` ∧ `v* ∈ P_a`; `δ = ρ_A − ρ_B` | **yes** |

### 2.1 The causal graph, and the fact that decides the milestone

```
        T ───► S_a ──┬──► G_a  ──┐
                     │           ├──► P_a  ──┬──► r_a ──┐
                     ├──► Φ_a  ──┘           │          ├──► ρ_a ──► δ
                     │                       └──► n_a ──┘
                     └──► w_a ───────────────────────────┘

        N(u) ──► G_a        (the only arm-independent input)
        v*_p(u) ────────────────────────────────────────► r_a
```

**The decisive structural fact: `P_a` and `w_a` are not two mediators. They are two deterministic
functions of one mediator, `S_a`.**

There is no intervention on `T` that moves the pool while holding the weighting fixed, or the
reverse. `S` is a single object; `transitions` feeds generation, `penalties`/`Q`/`rewards`/
`adjacencyMemory` feed admission, and `penalties`/`signals`/`timeMemory` feed weighting — but all of
them are written by the same 3000-tick history that `T` perturbs. **"Ranking pathway" and "admission
pathway" are not two arrows out of `T`. They are one arrow, read out twice.**

### 2.2 There is no arm-independent reference set

I looked for one, because its existence would change the answer. It does not exist:

- `G_a(u) = keys(transitions_a(u)) ∪ N(u)`. The second term is arm-independent; **the first is
  learned**. So even the *pre-filter generated set is treatment-dependent*.
- `N(u)` alone is arm-independent but is not a candidate pool — it excludes every trained non-graph
  transition the study is about.
- `P_∩`, `P_∪` are functions of **both** arms' states, so they are arm-dependent in a worse way:
  they are not a neutral reference, they are a *joint* construct.

**Consequence:** every candidate set available for a "fixed-pool" contrast is either treatment-
dependent, jointly-determined, or scientifically empty.

---

## 3. Candidate decomposition definitions

Partition `P_A = P_∩ ⊎ X_A`, `P_B = P_∩ ⊎ X_B`, so `n_A = m + e_A`, `n_B = m + e_B`.

Split the rank by region — exact, no assumption:

```
r_A = r_A^∩ + x_A        r_A^∩ = |{c ∈ P_∩ : w_A(c) > w_A(v*)}|    x_A = |{c ∈ X_A : w_A(c) > w_A(v*)}|
r_B = r_B^∩ + x_B        (symmetrically)

δ = (r_A^∩ + x_A)/(m + e_A − 1)  −  (r_B^∩ + x_B)/(m + e_B − 1)            … (★)
```

Three candidate definitions of a "ranking" term:

| | Definition | Requires |
|---|---|---|
| **D1** | `δ_∩ = (r_A^∩ − r_B^∩)/(m − 1)` — both arms' weights on the **shared** set | membership + weights; `m ≥ 2` |
| **D2** | `δ_A = ρ(P_A, w_A) − ρ(P_A, w_B)` — both weightings on **ARMED's** pool | `w_B` on `X_A`, **never computed** |
| **D3** | `δ_B = ρ(P_B, w_A) − ρ(P_B, w_B)` — both weightings on **ABLATED's** pool | `w_A` on `X_B`, **never computed** |

And in each case `Admission := δ − Ranking`, i.e. a **residual**.

---

## 4. Counterfactual analysis

Each construction assessed against the Director's nine questions.

### 4.1 Intersection construction (D1)

1. **Intervened upon:** the choice set, restricted to `P_∩`.
2. **Preserves the original intervention?** **No.** Both arms are evaluated on a set neither arm
   produced.
3. **Introduces a new intervention?** **Yes — explicitly.** `do(pool := P_∩)` is a set-restriction
   intervention, additional to `do(T)`. *This is the hazard the Director named, and it is real.*
4. **Observable?** **Yes.** `w_A` and `w_B` are both actually computed on every member of `P_∩`,
   because every such candidate was admitted by both arms. **No unobserved weight is needed.**
5. **Identifiable?** As its own estimand, yes. **As a component of `δ`, no** (§5).
6. **Valid causal interpretation?** Only as the effect of `T` *under* the additional intervention
   `do(pool := P_∩)` — a joint-intervention estimand, not a part of `δ`.
7. **Recoverable from C1?** **No** — C1 has no membership (§6). **From M14? Yes** — membership and
   weights are recorded.
8. **Edge cases:** `m = 0` → undefined; `m = 1` → `1/(m−1)` divides by zero; `m = 2` → binary only;
   `m ≥ 3` first gives graded resolution (the boundary derived in C1's formulation).
9. **Different decompositions, different answers?** **Yes — demonstrated in §5.2.**

### 4.2 Union construction

1. **Intervened upon:** the choice set, expanded to `P_∪`.
2–3. **Preserves? No. New intervention? Yes** — and a stronger one: it forces each arm to evaluate
   candidates its own filters **rejected**.
4. **Observable? NO.** Requires `w_A` on `X_B` and `w_B` on `X_A`. Those weights were never computed,
   because F1–F4 reject *before* `analyzeCandidate` runs (`main.js:1610–1673` precede `:1680`).
   They are *computable by an instrument* but are not observations — and computing them asks what an
   agent would score a candidate its own learned state excluded, which presupposes the rejection
   carries no information about the weight. That presupposition is unwarranted: F1 and F2 read
   `penalties` and `Q`, which also feed the weighting.
5–6. **Not identifiable; no valid causal interpretation** as a component of `δ`.
7. **Recoverable? No**, from neither C1 nor M14 — M14 records weights only for admitted candidates.
8. **Edge cases:** `P_∪` is never empty when either pool is non-empty, but is undefined in the same
   `v* ∉ P_∪` sense.
9. **Yes.**

### 4.3 Cross-pool counterfactual ranking (D2/D3)

`ρ(P_B, w_A)` — ARMED's weighting over ABLATED's pool. This is a **cross-world composition**: it
pairs the pool that `S_A` would *not* produce with the weighting that `S_B` does not produce.

- In a stochastic system this is a classic non-identifiable cross-world counterfactual.
- **In this deterministic system it is computable in principle** — `P` and `w` are deterministic
  functions of `S`, and both `S_A` and `S_B` are realised. Determinism genuinely buys something here,
  and I want to be precise that the obstruction is *not* the usual cross-world one.
- **But computability is not causal validity.** `(P_B, w_A)` is a configuration **no intervention on
  `T` can produce**. Computing it describes a system that cannot exist. *Do not manufacture a
  counterfactual because it makes the algebra convenient* — this is exactly that.
- **Observable? No** (needs `w_A` on `X_B`). **Recoverable from C1 or M14? No.**

### 4.4 Fixed-pool and fixed-ranking counterfactuals

- **Fixed-pool** (`do(P := P_0)` for a common `P_0`): requires an arm-independent `P_0`. §2.2 shows
  none exists that is scientifically non-empty. Using `N(u)` would answer a question about
  graph neighbours, not about the mechanism.
- **Fixed-ranking** (`do(w := w_0)`): holding the weighting fixed while the pool varies. But `w` is
  the object `futureBonus` acts on — **fixing `w` deletes the treatment**. The contrast collapses to
  an admission-only comparison of two pools under a weighting belonging to neither arm, which is not
  an effect of `T` at all.

### 4.5 What the causal graph additionally requires

Because `P_a` and `w_a` share the single parent `S_a`, a separation would require intervening
**inside** `S` — e.g. transplanting `transitions` from `S_B` into `S_A` while leaving `penalties`
alone. That is:

- a **new intervention on a different variable** (`S`, not `T`);
- **not** a decomposition of the ARMED-vs-ABLATED effect;
- and it would produce a state **off the manifold of reachable states** — a learned state no history
  generates, whose weights and filters may be jointly inconsistent.

**It is recorded here as the construction the causal graph demands, and rejected as invalid.**

---

## 5. Identifiability analysis — why `Total = Ranking + Admission` fails

### 5.1 Non-additivity is structural, not approximate

From (★), the exact identity is:

```
δ = [ r_A^∩/(n_A − 1) − r_B^∩/(n_B − 1) ]  +  [ x_A/(n_A − 1) − x_B/(n_B − 1) ]
       ↑ shared-set ranks, but under ARM-SPECIFIC denominators
```

The first bracket is **not** `δ_∩`, because `δ_∩` divides by `(m − 1)` and this divides by
`(n_a − 1)`. The gap is exactly:

```
r_A^∩/(n_A − 1) − r_A^∩/(m − 1)  =  − r_A^∩ · e_A / [ (n_A − 1)(m − 1) ]
```

**The admission change *rescales the ranking term itself*.** A concrete instance: with `r_A^∩ = 2`,
`m = 3`, `e_A = 3` (so `n_A = 6`), the identical ranking fact contributes `2/5 = 0.40` inside `δ` but
`2/2 = 1.00` inside `δ_∩`. **The ranking contribution is not invariant to admission**, so no
additive split exists in which both terms retain their meaning. `ρ = r/(n−1)` is a ratio; the two
"pathways" enter multiplicatively through a shared denominator.

One may of course *define* `Admission := δ − δ_∩`. That residual then absorbs the entire interaction.
**Calling it a pathway is a naming decision, not a measurement** — and this memo declines it.

### 5.2 Path-dependence: the same data give different answers

Telescoping through different pivots is always exact and always different:

```
pivot P_∩ :  δ = [ρ(P_A,w_A) − ρ(P_∩,w_A)] + [ρ(P_∩,w_A) − ρ(P_∩,w_B)] + [ρ(P_∩,w_B) − ρ(P_B,w_B)]
pivot P_A :  δ = [ρ(P_A,w_A) − ρ(P_A,w_B)] + [ρ(P_A,w_B) − ρ(P_B,w_B)]
pivot P_B :  δ = [ρ(P_A,w_A) − ρ(P_B,w_A)] + [ρ(P_B,w_A) − ρ(P_B,w_B)]
```

**Worked counter-example.** `P_∩ = {a,b,c}`, `v* = b`. Under `w_A` the shared order is `a > b > c`
(`r_A^∩ = 1`); under `w_B` it is `b > a > c` (`r_B^∩ = 0`). `P_A = {a,b,c,x}`, where `w_A` puts `x`
last and `w_B` would put `x` first.

- **Ranking at pivot `P_∩`:** `(1 − 0)/(3 − 1) = +0.5`
- **Ranking at pivot `P_A`:** `ρ(P_A,w_A) = 1/3`, `ρ(P_A,w_B) = 1/3` → `0.0`

**Same system, same data, two legitimate "ranking effects": +0.5 and 0.0.** No principle in the
causal graph selects between them. A Shapley average over orderings is computable but is a
*convention*, and conventions do not confer identifiability.

### 5.3 No separate manipulability

§2.1: `P_a` and `w_a` are both deterministic images of the single mediator `S_a`. Mediation analysis
requires mediators that can be set independently. These cannot. **There is one pathway
`T → S → (P, w) → ρ`, not two.**

### 5.4 The reference set is not neutral

`P_∩` depends on `S_A` **and** `S_B`. It is not a fixed frame against which both arms are measured;
it is a construct that moves with both. Conditioning on it is conditioning on a **post-treatment,
jointly-determined** variable — the standard collider hazard — so even the sign of any residual
"admission" term is not guaranteed to have a causal reading.

### 5.5 Verdict

> **`Total = Ranking + Admission` is mathematically non-additive (5.1), not uniquely determined
> (5.2), not supported by separate manipulability (5.3), and defined against a post-treatment
> jointly-determined reference (5.4). It is REJECTED as a causal decomposition of the C1 contrast.**

---

## 6. E6 recoverability from existing data

| Quantity | C1 census (`readouts.jsonl`) | M14 probe (`m14_attainability.json`) |
|---|---|---|
| Pool **size** `n_a` | **YES** (`nA`, `nB`) | **YES** (`poolSizeA/B`) |
| Pool **membership** `P_a` | **NO** | **YES** (`poolA`, `poolB`) |
| Candidate **weights** `w_a` on admitted candidates | **NO** | **YES** (weights paired with ids) |
| Candidate weights on **rejected** candidates | **NO** | **NO** — never computed by the runtime |
| **Cross-pool rank** | **NO** | **YES** (`rAinB`, `rBinA`) |
| **Oracle identity** `v*` | **YES** (`vStar`) | **YES** (`optRank[p].star`) |
| **Normalised rank** `ρ_a` | **YES** (`rhoA`, `rhoB`) | derivable |
| **E6 total contrast** `δ` | **YES** (`delta`) | derivable |

**C1 is insufficient, and not by a narrow margin.** Its cells record
`state, phase, vStar, rA, nA, rhoA, whyA, rB, nB, rhoB, whyB, bothDefined, delta, bestA, bestB,
tiesA, tiesB` — size but not membership, and no weights at all. Every construction in §3 needs at
minimum membership; D2/D3 additionally need weights that **no instrument can observe** because the
runtime never computes them.

C1 §8 made `r` and `n` mandatory so a reader could see how much of `Δ` **co-occurs** with pool
change. That was correctly scoped: co-occurrence is what size-plus-rank supports. Decomposition is
not, and **reopening C1 would not help** — the information was never recorded, so no re-analysis can
recover it.

**M14 shows richer instrumentation is constructible — and nothing more.** It records membership,
weights and cross-pool ranks, so it dissolves the *observability* obstruction for D1. It does
**not** dissolve the *identifiability* obstruction: §5 does not depend on missing data, and would
survive a perfect instrument. **Better instrumentation cannot repair a non-identified estimand.**

---

## 7. Attainability analysis

The UQ-B C2 failure (adequacy register **L4**: *"the outcome was forced by construction"*) is the
failure to avoid. So: **before proposing anything, is more than one outcome reachable?**

### 7.1 Structural attainability of the shared-set contrast

A clean nesting result, from the definitions alone:

- `δ` defined ⟺ `n_A ≥ 2 ∧ n_B ≥ 2 ∧ v* ∈ P_A ∧ v* ∈ P_B`.
- `v* ∈ P_A ∧ v* ∈ P_B` ⟺ **`v* ∈ P_∩`**, so `m ≥ 1` holds automatically wherever `δ` is defined.
- **Therefore `δ_∩` is defined on exactly the `δ`-defined cells with `m ≥ 2`** (and `m ≥ 3` for
  graded resolution).

The shared-set contrast adds **exactly one** new definedness condition. That condition is a function
of **both** arms — a genuinely new missingness mechanism, not covered by C1's zero-asymmetry result,
and it would have to be monitored rather than assumed benign.

### 7.2 Empirical attainability — committed M14 development fixtures

Computed read-only from `experiments/m14/m14_attainability.json` (`b825d1a`), **152 state-rows across
4 development fixtures on non-registered 896xxx territory**.

> **These numbers are a feasibility check on the construction. They are development fixtures, not a
> census; they license no scientific conclusion about the mechanism, about `futureScore`, or about
> any population, and they are not evidence for any hypothesis in §10.**

| Structure | Count |
|---|---|
| intersection size `m` | min 1, max 8, mean 4.38 |
| `m = 0` (empty intersection) | **0** |
| `m = 1` | 2 |
| `m ≥ 2` / `m ≥ 3` | 150 / 144 |
| identical pools (`e_A = e_B = 0`) | 10 |
| exactly one exclusive candidate | 30 |
| two or more exclusives | 112 |
| `v*` in both pools / only ARMED / only ABLATED / neither | 149 / **0** / **0** / 3 |
| both `δ` and `δ_∩` defined | **148** |

| Discrimination (on those 148 rows) | Count |
|---|---|
| `δ_∩ ≠ 0` / `δ_∩ = 0` | **96 / 52** |
| `δ ≠ 0` | 117 |
| **both** non-zero → signs agree / **disagree** | **93 / 1** |
| joint zeros (`δ = δ_∩ = 0`) | 29 |
| `δ ≠ 0` **and** `δ_∩ = 0` (admission-only pattern) | **23** |
| `δ_∩ ≠ 0` **and** `δ = 0` | 2 |
| identical pools → `δ = δ_∩` exactly | **7 / 7** |
| descriptive per-row `corr(δ, δ_∩)` | **0.957** — see PASS 2 §P-3 |

*The sign-agreement row counts only rows where both quantities are non-zero. A naive count over all
148 rows gives 122 agreements, but 29 of those are `0 = 0` and carry no information; the honest
figure is 93 of 94.*

**Reading, strictly limited:** more than one outcome is reachable — `δ_∩` takes both zero and
non-zero values, agrees and disagrees in sign with `δ`, and the admission-only pattern occurs. **The
construction is not forced by design, so it does not repeat UQ-B's C2 failure.** The last row is a
correctness check rather than a finding: when the pools are identical the algebra requires
`δ = δ_∩`, and it holds in 7 of 7 rows.

**What this does *not* show:** that the decomposition is valid (§5 is unaffected by any data), or
that these proportions hold anywhere else.

---

## 8. Toy-case results

`ρ = r/(n−1)`, rank 0 = first. `T` = total `δ`; `S` = shared-set contrast `δ_∩`.

| # | Case | Construction | `δ` | `δ_∩` | Discriminates? |
|---|---|---|---|---|---|
| 1 | **Identical pools, identical order** | `P_A=P_B={a,b,c}`, same `w` | 0 | 0 | both null — consistent |
| 2 | **One exclusive candidate** | `P_A={a,b,c}`, `P_B={a,b,c,d}`, `v*=c` last in both, `d` below `c` | `1 − 2/3 = +0.333` | 0 | **yes — admission-only** |
| 3 | **Multiple exclusives** | as 2 with `X_B={d,e}` | `1 − 2/4 = +0.5` | 0 | yes |
| 4 | **Identical oracle-optimal candidate** | `v*` is environment-defined | — | — | **always true by construction; not a case** |
| 5 | **`v*` exclusive to ARMED** | `v* ∉ P_B` | **undefined** | **undefined** | no cell; both silent |
| 6 | **`v*` exclusive to ABLATED** | `v* ∉ P_A` | **undefined** | **undefined** | no cell; both silent |
| 7 | **Ranking-only** | `P_A=P_B={a,b,c}`, `v*=b`; `w_A: a>b>c`, `w_B: b>a>c` | `+0.5` | `+0.5` | **yes — `δ = δ_∩`** |
| 8 | **Admission-only** | = case 2 | `+0.333` | 0 | **yes** |
| 9 | **Both changing** | case 2 pools **and** case 7 orders | `≠ 0` | `≠ 0`, `≠ δ` | partially — magnitudes not separable (§5.1) |
| 10 | **Opposing effects** | `P_∩={a,b,c}`, `v*=b`, `r_A^∩=1`, `r_B^∩=2`; `X_A={x,y,z}` all above `v*`, `X_B={u,v}` all below | `4/5 − 2/4 = +0.3` | `(1−2)/2 = −0.5` | **yes — opposite signs** |
| 11 | **Empty intersection** | `P_A ∩ P_B = ∅` | may be defined | **undefined** | **NO — instrument silent** |
| 12 | **Exactly one shared** | `m = 1` → `1/(m−1)` | may be defined | **undefined (÷0)** | **NO — instrument silent** |

**What the toy cases establish.** Cases 7, 8 and 10 show the shared-set contrast is genuinely
discriminating: it equals the total under pure ranking, vanishes under pure admission, and can carry
the *opposite sign* to the total. **Case 10 is the decisive one** — if the two quantities can point
in opposite directions, then `δ − δ_∩` cannot be read as "the admission part of `δ`", because a
"part" that reverses the whole is not a part. It is the residual §5.1 predicted.

**Cases 11 and 12 are the instrument's blind spots**, and case 9 is where it stops being able to
apportion — exactly the region the approved question's "in what proportion" clause occupies.

---

## 9. Failure cases

| | Failure | Consequence |
|---|---|---|
| **F-a** | `m = 0` or `m = 1` | shared-set contrast undefined; a cell the total retains is lost |
| **F-b** | `m = 2` | binary resolution only — `ρ ∈ {0,1}`; the C1-derived `n ≥ 3` boundary applies |
| **F-c** | New, **jointly-determined** missingness on `m` | a definedness mechanism depending on **both** arms; C1's zero-asymmetry result does **not** cover it and it must be monitored, never assumed |
| **F-d** | Treating `δ − δ_∩` as "the admission effect" | **invalid** (§5.1, case 10) |
| **F-e** | Reporting a Shapley or averaged split as *the* decomposition | a convention presented as an identified quantity (§5.2) |
| **F-f** | Computing `w_A` on candidates ARMED rejected | unobservable; presupposes rejection carries no weight information, which F1/F2 contradict |
| **F-g** | Comparing `δ_∩` against C1's `Δ` as though the same estimand | different intervention, different normaliser — **not comparable** |
| **F-h** | Reading `δ_∩` as a statement about `futureScore`, planning, uncertainty or cognition | prohibited; it is a ranking-position contrast under a restricted choice set |

---

## 10. Evidence → Inference → Hypothesis

**Evidence** — what the committed record directly establishes.

- **Ev-1.** `main.js:1591–1601`: the generated set is `keys(transitions) ∪ neighbours`; `transitions`
  is learned state (written at `:4593–4595`).
- **Ev-2.** `main.js:1610, 1620, 1673` + `canReachGoal`: four admission filters, all reading learned
  state except the graph-neighbour component of F3.
- **Ev-3.** C1 cells record size, rank, `ρ`, `δ`, `v*`, ties — **not membership, not weights**.
- **Ev-4.** M14 records pool membership with weights and cross-pool ranks, on 4 development fixtures.
- **Ev-5.** The M14 structural counts in §7.2, on those development fixtures.
- **Ev-6.** C1 census results as carried forward from M20/M21, unchanged.

**Inference** — what follows mathematically or logically.

- **In-1.** `P_a` and `w_a` are deterministic functions of the single mediator `S_a` (from Ev-1/Ev-2).
- **In-2.** No arm-independent, scientifically non-empty candidate reference set exists (Ev-1).
- **In-3.** `Total = Ranking + Admission` is non-additive, path-dependent, unsupported by separate
  manipulability, and defined against a post-treatment jointly-determined reference — **not
  identifiable** (§5). *This is a mathematical result and does not depend on any datum.*
- **In-4.** `δ_∩` is defined on exactly the `δ`-defined cells with `m ≥ 2` (§7.1).
- **In-5.** Because `ρ = r/(n − 1)`, a smaller pool produces a larger normalised rank at the same raw
  rank; therefore treatment-dependent pool size **can** contribute to the observed E6 contrast even
  when raw rank is unchanged. **This is a consequence of the definition — not a finding, and not an
  attribution** (M21-R1).

**Hypothesis** — untested.

- **Hy-1.** Whether the arms order commonly-available options differently in any registered
  population.
- **Hy-2.** Whether pool-size or admission differences contribute to the observed C1 contrast **at
  all**, and if so how much. *§5 establishes that "how much" is not identifiable by decomposition.*
- **Hy-3.** Whether the §7.2 structure holds beyond four development fixtures.
- **Hy-4.** Everything M21 listed as H-4 … H-6.

**No cognitive, planning, mechanistic or `futureScore` claim is promoted from C1 anywhere in this
memo.** The C1 positive census means remain exactly what M20 recorded: a descriptive
ARMED-vs-ABLATED E6 result over one registered census, favourable to ABLATED under the frozen
convention, generalising nowhere.

---

## 11. Explicit rejections

1. **REJECTED — `Total = Ranking + Admission` as a causal decomposition.** §5. Four independent
   grounds.
2. **REJECTED — `Admission := δ − δ_∩` as a pathway.** It absorbs the interaction and can carry the
   opposite sign to the whole (case 10). A residual is not a pathway.
3. **REJECTED — union and cross-pool constructions (D2, D3).** They require weights the runtime never
   computes, on candidates the arm's own filters rejected (§4.2, §4.3).
4. **REJECTED — any "fixed-ranking" counterfactual.** Fixing `w` deletes the treatment (§4.4).
5. **REJECTED — intra-`S` transplant.** A new intervention on a different variable, producing states
   off the reachable manifold (§4.5).
6. **REJECTED — Shapley or order-averaged splits presented as identified.** A convention, not a
   measurement (§5.2, F-e).
7. **REJECTED — re-analysing C1 to obtain any of the above.** The information was never recorded, and
   §5 would survive perfect data anyway (§6).
8. **REJECTED — the phrase "in what proportion" in the approved question.** No proportion is
   identifiable. I am not answering that clause; I am reporting that it has no answer.

---

## 12. The one minimal measurement that survives — and what it is not

A single contrast survives §5, and it is **not a decomposition**:

> **The shared-choice-set ranking contrast.** For each decision state where `δ` is defined and
> `m ≥ 3`, compare the position of `v*` under `w_A` and under `w_B` **within `P_∩`**, the options
> both arms admitted.

**What it is.** A well-posed estimand under the **explicitly declared joint intervention**
`do(T) ∧ do(pool := P_∩)`. Observable with no unrecorded quantity (§4.1.4). Attainable and
discriminating (§7.2, §8). Blind in the cases of §9.

**What it is NOT, stated so it cannot drift:**

- **NOT a decomposition of `δ`**, and no residual may be labelled "admission" (§11.2).
- **NOT comparable to C1's `Δ`** — different intervention, different normaliser (F-g).
- **NOT an estimate of the C1 effect's composition.**
- **NOT a statement about `futureScore`, planning, uncertainty, cognition or mechanism** (F-h).

**Does it merely rename the total effect?** **Not in principle — but see PASS 2 §P-3, which is the
strongest objection in this memo and comes close.** It coincides with the total exactly when the
pools are identical (case 1/7; 7 of 7 M14 rows), and diverges otherwise: in 23 of 148 M14 rows the
total is non-zero while the shared-set contrast is zero, and in one row they carry opposite signs. A
renaming could not do that. **However, on the same fixtures the two are highly collinear
(descriptive per-row correlation 0.957), which materially weakens the case for measuring it.**

**Is it worth doing?** Conditionally. It answers **Hy-1** — do the two weightings order commonly
available options differently — which is a genuine, transferable property of the *scoring rule*, and
scoring rules are the kind of object Noetica could reimplement. That is a narrower prize than M21
hoped for: it characterises the weighting, and it says **nothing** about how the C1 contrast is
composed. **Whether that narrower prize justifies a registered block is a Director decision, and I
am not presuming it.**

---

---

# PASS 2 — INDEPENDENT SELF-CHALLENGE

Nine attacks on my own formulation. Two land hard enough to change the recommendation.

### P-1. Shared-set validity — *does `P_∩` silently create a third intervention?*

**Attack lands. Conceded in full, and it is not a technicality.** `do(pool := P_∩)` is an
intervention on neither arm's process, and `P_∩` is a function of both arms' states. §4.1 and §5.4
concede it; §12 names it in the estimand's own definition rather than burying it.

**Partial mitigation, and its limit.** The restriction is applied **at readout**, not inside a
running agent: C1 and M14 both evaluate a single decision at a fixed state with no continuation, so
nothing downstream is perturbed and no trajectory diverges. That makes the construct a
**measurement-time restriction** rather than a counterfactual dynamical system. It does **not** make
it a decomposition, and it does not remove the joint-determination of `P_∩`.

### P-2. Admission/ranking separation — *is §5 too strong?*

**Attack fails.** One might object that non-additivity is common and routinely handled by
interaction terms. But §5.2's worked counter-example is not an interaction-magnitude problem: two
legitimate pivots give ranking effects of **+0.5 and 0.0** on identical data. That is
non-uniqueness, not non-linearity, and no interaction term repairs it.

### P-3. Does the measurement simply rename the total effect? — **the strongest objection**

**Attack partially lands, and it changes my recommendation.**

Computed on the same 148 M14 development rows:

| | |
|---|---|
| descriptive per-row correlation `corr(δ, δ_∩)` | **0.957** |
| rows where **both** are non-zero | 94 |
| — of those, signs **agree** / **disagree** | **93 / 1** |
| joint zeros (both exactly 0) | 29 |

My §7.2 line "signs agree 122, disagree 1" was **inflated by joint zeros** — 29 of those 122
agreements are `0 = 0`. The honest figure is 93 of 94 among genuinely non-zero rows.

**So: not a renaming in principle** — 23 admission-only rows and one sign reversal are impossible
under a renaming — **but on the only data that exist it behaves nearly like one.** Its incremental
information over `δ` is real but concentrated in a minority of rows.

**Two limits on how far this objection goes, both stated so the Director can weigh it properly:**

1. The correlation is computed **per state-row**, whereas C1's estimand is a **per-configuration
   mean over states**. Per-cell collinearity does not straightforwardly imply configuration-level
   redundancy; aggregation can behave differently. This is a caution against the objection, not a
   refutation of it.
2. Collinearity speaks to **incremental value as a summary statistic**. It does not bear on the
   *direct* question Hy-1 asks, for which the informative quantity is that `δ_∩ ≠ 0` in **96 of
   148** rows — i.e. the two weightings do order commonly-available options differently, and often.

**What this objection does NOT license.** A high `corr(δ, δ_∩)` must **not** be read as "the ranking
pathway accounts for most of `δ`". That is precisely the attribution §5 rejects. Correlation between
a total and a restricted-set contrast is not a decomposition, however high.

### P-4. Additivity — *could a different outcome scale restore it?*

**Attack fails, but narrows the claim usefully.** A different normaliser (raw rank; a log-odds
transform) could be additive in a way `r/(n−1)` is not. But E6's normalisation is **frozen**, and
changing it defines a different study, not a decomposition of this one. §5.1 is therefore a claim
about **E6 as frozen**, which is the only thing M22 was asked about.

### P-5. Identifiability — *does determinism rescue the cross-world terms?*

**Attack fails, and the reason matters.** Determinism genuinely does make `ρ(P_B, w_A)` *computable*
(§4.3) — the usual cross-world obstruction is absent. The obstruction is different and survives:
`(P_B, w_A)` is a configuration **no intervention on `T` can produce**, and the weights it needs
were never computed because F1–F4 reject before `analyzeCandidate`. Computable ≠ reachable ≠ valid.

### P-6. E6 recoverability — *is C1 really unrecoverable?*

**Attack fails.** Checked against the artifact rather than assumed: C1's cell keys carry no
membership and no weight field (§6). And the point is moot for the decomposition — §5 is a
mathematical result that a perfect instrument would not touch.

### P-7. Counterfactual validity — *is the measurement-time framing a dodge?*

**Attack partially lands.** Calling it "measurement-time" (P-1) makes the construct safe but also
**narrows what it can mean**: it is a property of the **weighting function evaluated at a state**,
not of the agent's behaviour, and certainly not of its trajectory. §12 must be read with that
restriction, and F-h already forbids the behavioural reading.

### P-8. Edge cases — *are the blind spots rare enough to ignore?*

**Attack lands on any claim of completeness.** They must not be ignored. On dev fixtures `m ≤ 1`
occurred in 2 of 152 rows and `m = 2` in a further 6 — small, but these are four fixtures, and F-c
warns that the `m` distribution is jointly determined and could differ elsewhere. **No `m`
distribution may be assumed for any registered population.** Note also that 26 of the 52 zero-`δ_∩`
rows sit at `m = 3`, the minimum graded size — so the zero rate is partly a resolution effect, not
purely a substantive one.

### P-9. Attainability — *is §7.2 evidence, or reassurance?*

**Attack partially lands.** §7.2 shows the construction is *not forced* — genuinely more than one
outcome is reachable, which is what the L4 test requires. It shows nothing about any registered
population, and four development fixtures are a feasibility check, not a basis for expectation.
Labelled as such in §7.2, and repeated here because the temptation to treat it as a preview is real.

### Net effect of PASS 2

**P-1 and P-3 survive as standing limitations rather than being answered.** The decomposition
verdict in §5 is untouched — nothing in PASS 2 weakens it, and P-2, P-4, P-5, P-6 strengthen it. But
the *value* of the surviving measurement is materially lower than §12 first suggested, and §13's
recommendation is revised accordingly.

---

## 13. Exact next milestone

> ## M23 — Shared-Choice-Set Estimand Specification *(formulation only)*
> *Or, at the Director's discretion, a decision to stop here.*

**Two admissible outcomes, and I recommend the Director weigh them explicitly:**

**(a) Proceed to M23.** Specify the shared-set ranking contrast as a standalone estimand: freeze its
direction convention in advance; fix the `m ≥ 3` boundary and the treatment of `m ∈ {0,1,2}`; specify
the **joint-intervention** language so it can never be reported as a decomposition; and specify
monitoring for the new jointly-determined missingness (F-c). No preregistration, no seeds, no code.

**(b) Stop.** M22's genuine result is a **negative**: the decomposition the program wanted does not
exist. That is worth recording on its own, and the surviving measurement answers a strictly narrower
question than the one that motivated M21. Stopping here is defensible and should not be treated as
failure.

**My recommendation, revised after PASS 2: (b) — stop, and record the negative.**

I came into §12 recommending (a). P-3 changed it. The case against continuing, in order of weight:

1. **The measurement is nearly collinear with what C1 already has** (`corr = 0.957` on the only
   available data; signs agree 93 of 94 among non-zero rows). A registered block is a scarce,
   non-renewable resource, and this would spend one on a quantity that tracks an existing
   measurement closely.
2. **The prize is much narrower than what motivated M21.** Q-B was chosen to make the C1 contrast
   interpretable. §5 establishes that no decomposition can do that — ever. What survives answers a
   different and smaller question about the weighting function at a state.
3. **Two standing limitations survive PASS 2 unanswered** (P-1: it is a third intervention; P-7: it
   describes a weighting evaluated at a state, not behaviour).

**The case for (a), stated fairly because it is not negligible:** `δ_∩ ≠ 0` in 96 of 148 development
rows, which — if it held in a registered population — would directly evidence Hy-1, that the two
weightings order commonly-available options differently. That is a property of the *scoring rule*,
which is the reimplementable object the North Star cares about. And the per-row collinearity in P-3
is measured at a different unit of analysis than C1's per-configuration estimand, so it is
suggestive rather than decisive.

**Why I still land on (b).** The program's repeated failure mode has been to keep measuring because
a measurement was available. M19 declined to certify adequacy; M20 declined to recommend a
follow-up on an interesting pattern; M21 declined another E6 census. The same discipline applies
here to my own proposal. **M22's genuine result is the negative in §5**, and a negative that closes a
line of inquiry permanently is worth more than a marginal measurement that would not have answered
the question that prompted it.

**If the Director selects (a) anyway, that is a reasonable call** — the argument in its favour is
real, and M23 as scoped in (a) is the correct next step. I am recommending, not withholding.

**Before either, unchanged and still outstanding:** the `895000–895999` registry link (M21 §1.7),
which must be closed before any successor selects seeds, and which I have again left untouched.

**M22 must not be read as authorising:** any implementation, any experiment, any preregistration, any
seed selection, any change to F1/F2 or production source, any modification of C1/UQ-A/UQ-B, or any
registry edit. None occurred.
