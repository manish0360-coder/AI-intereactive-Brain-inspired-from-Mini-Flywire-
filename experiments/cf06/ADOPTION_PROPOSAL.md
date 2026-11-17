# CF-06 — proposal: make the belief the agent's world model

**Status.** Proposal to the owner, 2026-11-17. **Awaiting the owner's decision.** Nothing in the agent has changed,
and nothing changes before the decision.

**Why there is a proposal.** The frozen specification fixed the consequence of this verdict before the run
([GATE_SPEC.md](GATE_SPEC.md), decision table, line 122). For SUPPORTED — CONSISTENT it reads: "Adversarial review,
then a proposal to the owner to make model v6 with ρ fixed at 1/2 the agent's model."
- The gate gave that verdict ([RESULTS.md](results/RESULTS.md)).
- The review recomputed the verdict from the rows and found it correct. It rated the record SOUND WITH CORRECTIONS
  ([ADVERSARIAL_REVIEW.md](results/ADVERSARIAL_REVIEW.md)).
- Every figure below is as corrected by the review's dated amendment.

## The decision

**Should the agent's world model become model v6 with ρ fixed at 1/2 and h = 0.01 (the gate's BELIEF arm), in place
of model v3?**

| Option | What it means |
|---|---|
| **A. Adopt (recommended)** | BELIEF becomes the agent in `cognitive/`. MBVI3 stays, unchanged, as the baseline. The claim is limited as set out below |
| **B. Do not adopt now** | MBVI3 stays the agent. Model v6 stays a research prototype, as RECALL did (AD-12). The record stands as written |

**Not offered: adopting VOL, the version that learns ρ.** VOL was cheaper on the mix by 11.3 steps [0.3, 22.8], but:
- choosing it because of this run would pick the arm on the gate's outcome;
- E5 is not admitted as a test of learning ρ: the headroom was 31.9 against the 32.3 required;
- L1's "yes" is Monte Carlo-marginal: its lower bound is above 0 in 95% of reseeded bootstraps;
- the specification names ρ fixed at 1/2.

## What adoption would change

**Changes, after a yes, in one commit:**
- **The record of decisions.** AD-13 in `docs/architecture/ARCHITECTURE_DECISIONS.md`, carrying the limited claim
  below.
- **The status documents:**
  - the H-BEL row of the hypothesis registry;
  - capability rows 4 and 8 of the roadmap;
  - a row for `mind/v6/` in `cognitive/README.md`;
  - `PROJECT_STATE.md`.
- **One named definition of the agent.** It is the gate's arm exactly: `VOL_RHO` with `rhoFixed: 0.5`, and every other
  parameter at its v6 default, so h = 0.01. It goes in a new file in `cognitive/testbed/`, with a test that pins it to
  the gate6 parameters. Later specifications then cite one definition instead of restating parameters. It also
  separates the agent from the registry's `VOL_RHO` entry, which is documented as the privileged true-rate reference.
- **Later gates.** BELIEF becomes the agent that new mechanisms are built on and must not set back. MBVI3 stays in the
  registry, unchanged, so a later result can still be read against the old agent.

**No change:**
- **Code.** No edit to model v6, model v3 or the planner. The agent would be exactly the configuration frozen at
  `7ce1dc6` and run on gate6.
- **The browser application.** Nothing in `main.js` or `render/`; the testbed stays independent of it.
- **Push.** None.
- **Evidence class.** Still one development gate.

## The evidence, as corrected by the review

The figures are from gate6: 135 fresh 24-node worlds, each run once in every family.

| Question | Answer |
|---|---|
| How large is the gain over the planner? | **About 28 steps a run.** +84.7 [55.1, 119.4] per world, summed over its three runs, is 2.4% of the planner's steps. The median world gains 21 steps over its three runs (0.6%) |
| Is it spread across worlds? | **CONSISTENT by the frozen rule.** 81 worlds favour the belief and 53 the planner. Without the 14 most favourable worlds, the rest still average +36.6. **Concentrated by share, though.** Those 14 worlds (10%) carry 61% of the gain, more than the 51% on development. The two largest worlds are mostly false-alarm repair |
| Against which policies? | **Each of the four fixed policies tested.** Against the planner's reset +84.7; against RECALL at h = 0.003, 0.01 and 0.03, +94.2, +350.5 and +1,283.3. **Not against every fixed schedule.** A rule that re-tests k times and then gives up was not tested (frozen limitation 10) |
| By family, against the planner | **Rarely reverse (RARE):** costs 17.4 steps a run [12.8, 21.9], 1.3% more. **Half reverse (HALF):** saves 41.4 [24.9, 60.7], 3.5%. **Mostly reverse (OFTEN):** saves 60.7 [43.6, 79.9], 6.0%. **Nothing reversed (the 64 such RARE runs):** costs 20.1 [14.5, 25.4] |
| When does it lose on balance? | **Against the planner,** B1 fails on every weighting with RARE at 0.7 or more, and on 0.6 / 0.4 / 0. **Against RECALL,** it fails on 5 weightings where OFTEN dominates. It holds on 50 of 66 weightings |
| Where does the gain come from? | **Genuine changes:** +57.3 (68%). **Repairing false alarms of model v3's change detector:** +25.7 (30%). **Residual:** +1.7. The RARE cost comes from the belief's handling of permanent changes: −22.7 in their windows |
| Does the mechanism do what it should? | **Recovers reopened routes:** in OFTEN, 43.5 [32.3, 55.8] fewer steps after reversed events (B4a). **Gives up on permanent changes:** 111 fewer futile re-tests a run than RECALL at the same h (B4b). But that contrast also differs in ρ, and the belief still re-tests more than the planner: 21.8 against 14.2 a run in RARE |
| Does it break anything? | **Identical to the planner in 539 of 540 world-cells** on the four tasks without changes. That shows only that the extension is inert where nothing changes (frozen limitation 14) |
| What does it cost to run? | **Planning work:** value-iteration work per decision is 6.5% to 7.4% higher. **Arm time:** 16% higher (801 s against 690 s in run A) |
| How much of the possible gain? | **Gap to the oracle:** the planner is 411.1 steps from the privileged oracle on the mix. **Closed:** the belief closes 21% of that gap, VOL 23% and the true-rate reference 28% |
| Does it depend on h? | **h was not tuned on E5.** h = 0.01 was borrowed from CF-05b. **B1 is ROBUST:** it holds at 0.003, 0.01 and 0.03. **The full verdict line is reached only at 0.01.** By the same rules, h = 0.003 would read SUPPORTED WITH EXCEPTIONS (B2) — CONSISTENT, a marginal fail with B2's upper bound at 25.1. h = 0.03 would read SUPPORTED — TAIL-DRIVEN |
| How strong is the evidence? | **One development gate, not confirmatory.** It was run by the designer, on local commits, with no independent reproduction. **Two launches.** The restart is disclosed and rests on the owner's decision |

## What may be claimed if it is adopted

**May be written:** "On task E5 (135 fresh 24-node worlds, one development gate), a world model that keeps a
two-regime belief about each changed exit, with ρ fixed at 1/2 and h = 0.01, took fewer steps over an equal mix of
reversal rates than each of four fixed re-testing policies. Against the planner the saving was about 28 steps a run
(2.4%); 61% of it came from 10% of worlds, and about 30% from repairing the change detector's false alarms. Where
changes rarely reversed, it cost about 17 steps a run (1.3%)."

**May not be written:**
- that the belief is better in general, or in every environment;
- that it beats every fixed re-testing schedule, or that Bayesian inference beats hand-made schedules;
- that the result is robust to h (only B1 is);
- that the agent learns how often changes reverse, or how volatile its world is (ρ is fixed);
- anything confirmatory.

## Risks

**If adopted:**
- **The adoption rests on h.** Under the same rules, h = 0.003 would have given "not adopted as it stands" (B2 fails
  marginally), and h = 0.03 would have given the TAIL-DRIVEN wording. h = 0.01 was fixed before the run and not
  chosen on E5, so the verdict stands, but the margin is narrow.
- **Part of the gain repairs a defect elsewhere.** About 30% of the saving undoes false alarms of model v3's change
  detector. A better detector would remove some of it, and the comparison with the planner would need re-reading.
- **The agent gets worse where most changes are permanent:** 17.4 steps a run in RARE, and 20.1 where nothing
  reversed.
- **The agent's arm runs about 16% slower** in later gates.
- **Mitigation.** One configuration undoes the step, and the old agent stays available.

**If not adopted:**
- **No memory of an exit's earlier state.** The agent keeps none for a changed exit.
- **Recovery after a reversal stays unadopted a second time.** RECALL was not adopted after CF-05b (supported at a
  cost); now the belief, although it passed every frozen criterion.
- **Declining after seeing the outcome.** Declining because the gain is small or concentrated would apply a standard
  that the frozen decision table did not set. The decision is still yours, and its reason would be recorded in AD-13.

## Recommendation

**Option A: adopt, with the claim limited as above.**

1. **It is the verdict this proposal was written for.** The specification set this consequence in advance. The review
   recomputed the verdict from the rows, and none of its 17 findings touches a criterion.
2. **The costs are known and bounded.**
   - 17.4 steps a run where changes rarely reverse, inside the margin fixed in advance;
   - about 7% more planning work;
   - nothing on the four tasks without changes.
3. **It is the principled form AD-12 called for.**
   - The earlier regime is kept inside the model.
   - Failed re-tests are weighed as evidence.
   - No constant was tuned on E5.
   - The planner is untouched.
4. **It can be undone.** One configuration reverts it, and the old agent stays as the baseline.

## What the decision does not settle

- **Learning ρ (H-VOL)** stays not admitted. It needs a task that passes the headroom rule. Adopting ρ = 1/2 does not
  close it; VOL is the same code with ρ learned.
- **The change detector's false alarms** (30% of the gain) remain an untested design question (frozen limitations 4
  and 12).
- **h** stays the value borrowed from CF-05b; the full verdict line is specific to it.
- **Integration into the browser application** (roadmap M9) is not part of this proposal. It needs its own
  authorisation.
- **Push.** The local commits stay unpushed until your word.

## After the decision

- **A:** one commit with AD-13, the status documents, and the named definition with its test. `npm test` is run.
  Nothing else changes.
- **B:** AD-13 records the decision and its reason, and the status documents say "not adopted". Nothing else changes.
