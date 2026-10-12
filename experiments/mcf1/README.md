# MCF-1 Phase 1 harness

Engineering harness for MCF-1 Phase 1 (`M-MCF1-HARNESS`, corrected by `M-MCF1-HARNESS-R1`). It **does not run
the experiment**. No seed is registered or consumed, no confirmatory seed is touched, and **the scientific design
is not frozen**. Every official stage refuses to start (see "Execution lock"). Everything here is read-only with
respect to H1-R and the seed registry.

## The question the harness is built to ask

On the frozen B2-conformed agent, at node 10 with goal 12, does a restored prior episode on one of two matched
two-hop routes steer the **first routing choice**, and what does that do to **first-edge traversal success**?
One decision and one environment attempt per run.

* Endpoint: first-edge traversal success. It is **not** goal arrival (node 12 is not a neighbour of node 10).
* Contents: `C` (no memory), `M9` and `M11` (one episode on route 10→9→12 or 10→11→12, delivered through the
  product's own `loadBrain()`).
* Twins: `T9` / `T11` swap which route has the reliable edge probability (0.95 against 0.35). All three contents
  and both twins run under common random numbers per seed: **six runs per seed**, at Stage V and again at Stage O.
* Sampling: **Option C**, a census of the entire complete-cluster frame. No test, p-value, sampling-based interval,
  practical threshold or significance claim is produced, and nothing is claimed beyond the frame.

## Decision ledger (approved for implementation; not a freeze)

The user approved these values for implementation. In `config.mjs` they carry the status
`APPROVED_FOR_IMPLEMENTATION`. The word `APPROVED` is reserved for a freeze record and appears nowhere in the config.

| decision | value |
|---|---|
| primary outcome | `T_frame` (formula below) |
| candidate seed block | start 1,500,000,000, scan length 4,000; **candidate, not authorised** for any scan or execution |
| budgets | cognitive 4,096, visual 16,384, environment 64 (sigma unused); runtime enforcement V11 unchanged |
| instrument failures | V1, V9, V12 halt the stage; a run error gets one deterministic retry in a fresh isolated process, then halts; the first non-operational seed-scope fault at Stage O halts |
| registry scope | every admitted raw seed must already be recorded (MCF-1, registered) before an official Stage Q; the harness only checks, it creates no entry |
| minimum valid frame | 100 complete valid seeds: a sanity floor, not a power or significance threshold |
| practical threshold | none |
| claim boundary | see "Claim boundary" |
| frame | complete-cluster (below) |
| V6 | diagnostic, never an eligibility condition |

## Exact formulas

Per seed, the executed first edges are `xC` (COLD), `x9` (M9) and `x11` (M11). They are twin-invariant (V5), so the
twins do not enter any steering score.

**Primary.** `T_frame` is the arithmetic mean over the frame of

`S_s = 1/2 (1{x9=9} - 1{x9=11} + 1{x11=11} - 1{x11=9})`

the content-contrast executed-edge score: what each memory content executed on the route it remembers, minus what
the *other* content executed there. It is COLD-free, takes the values -1, -1/2, 0, 1/2, 1, and is **not**
conditioned on success or restricted to expected patterns. It equals the earlier follow indicator
`1{x9=9 and x11=11}` on every follow and equal pair, and differs only on reversed (-1) and mixed (±1/2) pairs, which
the former V6 exclusion used to hide.

**Secondary, named, on the same frame and denominator:**

| name | definition |
|---|---|
| `followRate` | mean `1{x9=9 and x11=11}` |
| `sigmaBar` | mean `1/2 (1{x9=9} + 1{x11=11})`, the remembered-route execution rate |
| `coldRate` | mean `1/2 (1{xC=9} + 1{xC=11})` |
| `netShift` | `sigmaBar - coldRate` per seed, averaged (GOOD minus COLD, executed edge) |
| `nonSpecific` | `1/2 (1{x9=9}+1{x11=11}+1{x11=9}+1{x9=11}) - (1{xC=9}+1{xC=11})`; algebra: `netShift = (S_s + nonSpecific)/2`, and `nonSpecific = 0` on the identity class |
| route-specific rates | for each of C, M9, M11: share executing node 9, node 11, or a distractor (6 or 13) |
| outcome contrast | `D_s = 1/2 sum_l [Y(M_l,l) - Y(M_l',l)]`, plus GOOD-COLD, BAD-COLD and the six cell success rates |

Every metric object carries its sum, denominator, the frame size and the **frame hash**. `verifyAnalysis` refuses an
analysis whose frame hash is missing or inconsistent, whose metric hashes differ, or whose denominators differ from
the frame.

## Complete-cluster frame

One authoritative frame (`frame.mjs`) feeds every metric. A seed is in it iff:

1. it was admitted and registry-available (V10);
2. it qualified at Stage Q;
3. all six condition/twin runs are present and pass every seed-scope check at Stage V;
4. all six condition/twin runs are present and pass every seed-scope check at Stage O;
5. and no stage-level halt occurred (a halted stage yields no frame at all).

Exclusion is atomic: a failed member excludes the **whole seed** from every metric, so a paired comparison is never
computed from the survivors of a broken cluster. Seed exclusion and stage halt are different consequences:

| consequence | rules |
|---|---|
| seed exclusion (whole seed) | V2, V3, V4, V5, V8, V10, V11 at Stage V; V4b, V11 at Stage O (only if the halt threshold is raised above 1) |
| stage halt | V1, V9, V12, a persistent run error (RUN), and at Stage O the first seed-scope fault |
| diagnostic only | V6, V7 |

Failing run keys are recorded per rule. The analysis reports exclusions by rule x content x twin x stage with the
number of seeds evaluated, and reconciles Stage-V counts, Stage-O counts, complete-cluster counts and the final
frame size explicitly (`valid at V - excluded at O = frame`). A below-minimum frame (fewer than 100 seeds)
withholds the primary value and every permitted claim.

## V6 is a diagnostic

The former V6 rule excluded seeds whose executed pair was neither (9,11) nor `x9 = x11`. It was built to keep the
first-edge contrast binary for an exact test, which the census does not use, and it selected the frame on the
primary outcome's own pattern. It no longer decides membership. The analysis reports pair-class counts (follow,
equal, reversed, mixed), the signed-score distribution, the number with `S_s < 0`, and the effect of the former
restriction on `T_frame` and on the first-edge contrast. V7 (outside the identity class) is likewise diagnostic.

## Exploration diagnostic (inferred, with limits)

At call 0 the agent draws `liveRng() < epsilon` with epsilon = 0.2 (stress and fatigue are 0 and nothing at call 0
depends on the restored memory) and, if it triggers, a second draw picks a candidate. The measurement sink records
the step-0 argmax (`M-BEST`) and the executed edge (`M-DECISION`), **not** the trigger or the pick. The indicator is
therefore **inferred**: a run is "visible" when its executed edge differs from its argmax. Limits:

* a triggered pick equal to the argmax is invisible in that run;
* when all three contents share one argmax, such a trigger is invisible in every run (`unobservableByConstruction`);
* a COLD-only view misses triggers visible only under a memory content, so the union over the six runs is reported
  alongside it;
* it is a descriptive decomposition only: it does not adjust for confounding, and it never decides frame membership,
  the primary outcome or the outcome mapping.

It adds no runtime behaviour and consumes no random number; the verifier checks that the conformed tree carries the
branch and hooks described here.

## Claim boundary

Permitted, if the numbers support it: memory-guided **first-edge routing** within the single specified simulation
context (start node 10, goal 12, matched two-hop routes, the registered reliability assignment) and the enumerated
frame. Everything else is prohibited, in particular planning, probability understanding or agent evaluation of reliability, goal-conditioned or
episodic recall, generalization beyond the frame or to other decision points, goals or the repository HEAD, general
cognition, a general performance benefit of memory, goal arrival, learning or trajectory effects, and any
significance statement.

## Execution lock

Official stages are **locked**:

* `config.FROZEN` is false and no config status can unlock anything;
* `assertFreezeAuthorised` runs before any inventory build or scan and requires a freeze record that is complete,
  not `testOnly`, and whose own hash equals `OFFICIAL_AUTHORIZATION.freezeRecordSha256`, which is `null` here. A
  synthetic record can therefore never authorise execution, even with matching hashes;
* stage functions refuse an official context that did not pass that gate, and an official Stage Q additionally runs
  the registry preflight;
* the candidate block is refused in development mode before anything is scanned. This milestone did not scan it.

The design is not frozen. A later, separately authorised freeze must produce a record whose hashes match the
corrected source and configuration, and a separate commit must pin that record's hash.

## Stages and files

| stage | what it does |
|---|---|
| `inventory` | reserved stream-span inventory + hash |
| `admit` | deterministic ascending admission scan + hash |
| `qualify` (Q) | one cold decision-stop run per admitted seed |
| `validate` (V) | six decision-stop runs per qualified seed; validity manifest + hash (no outcome exists) |
| `outcome` (O) | needs an intact V manifest and its independently supplied hash; stops at the first attempt |
| `analyze` | builds the one frame, then the descriptive census; no inference |

| file | role |
|---|---|
| `config.mjs` | constants, ledger, seed policy, official gate |
| `inventory.mjs`, `admission.mjs`, `episodes.mjs`, `driver.mjs` | engine (unchanged by R1; pinned by the verifier) |
| `validity.mjs` | rules, pair class, exploration indicator, manifests |
| `frame.mjs` | the complete-cluster frame, reconciliation, exclusion table |
| `analyze.mjs` | scores, metrics, selector, interpretation, `verifyAnalysis` |
| `orchestrate.mjs` | stage assembly, retry policy, preflight, context lock, CLI |
| `verify_mcf1.mjs` | gates and source mutants |
| `data/` | git-ignored output directory for development runs |

## Running (development seeds only)

```bash
node experiments/mcf1/verify_mcf1.mjs
```

Development mode is confined to the exploratory domain (raw seeds 1,100,000,000 to 1,100,199,999). The verifier
uses development seeds and synthetic records only and never scans or executes the candidate block.
