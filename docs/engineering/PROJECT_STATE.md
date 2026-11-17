# Project State

The single resume point for the cognitive programme. Update it at the end of every work session.
Results are recorded in [`docs/VERIFICATION_STATUS.md`](../VERIFICATION_STATUS.md) (legacy agent) and
[`docs/COGNITIVE_MILESTONE_ROADMAP.md`](../COGNITIVE_MILESTONE_ROADMAP.md) (testbed gates); this file records where
work stands. Document index: [`docs/README.md`](../README.md).

**Last updated:** 2026-11-17

## Repository

| Item | State |
|---|---|
| GitHub `main` | `75530c3` (pushed 2026-11-15 on the owner's word; fresh clone verified: frozen hashes identical, 155/155 tests), with 25 annotated tags (none added since 2026-11-12) |
| Local `main` | Equal to GitHub at `75530c3`, plus any later commit recorded here. No push without the owner's explicit word |
| Tests | `npm test` 173/173 (at the CF-06 freeze); legacy gate `experiments/phase1_0/verify_S2.js` 14/14 |
| Push rule | No push without the owner's explicit word |

## Done in this programme

| Date | Work | Result |
|---|---|---|
| 2026-11-17 | **CF-06** a belief about whether a changed exit will change back (model v6, ρ fixed at 1/2), 135 fresh `gate6` worlds | **SUPPORTED — CONSISTENT.** Beats all four fixed re-testing policies on the mix; against the planner +84.7 [55.1, 119.4] (2.4%; median +21); costs +17.4 in RARE (inside the 25 margin). Gain from genuine reversals and false-alarm repair. Not adopted pending the adversarial review and the owner's decision. Freeze `7ce1dc6`, results `22ea769` |
| 2026-11-13 | **CF-03b** world model v2 (`cognitive/mind/`) | **PASS** on 20 fresh `gate3b` worlds: ECE 0.028 against 0.05 (v1 0.104); DYNAQ − MBVI2 on E3 +171.0 [52.3, 317.5]; no regression. Calibration did not improve task performance. Freeze `1968083`, results `4e310b0` |
| 2026-11-14 | **CF-04** hidden-change task E4 and reliability arbitration (`cognitive/mind/arb/`), 55 fresh worlds | **ARBITRATION NOT SUPPORTED — HARMFUL.** The task is admitted (+160.7 steps without change detection). Planner − ARB = −13.8 [−20.0, −7.2]; ARB is also worse than random switching. Arbitration is not built into the agent. Freeze `2ae0311`; results in the commit after it |
| 2026-11-14 | **CF-03c** world model v3 (`cognitive/mind/v3/`): two v2 defects repaired, then tested on four unseen reliability families | **PARTIAL.** Repairs hold. Criteria held in BIMODAL only; a per-pair Laplace forecaster beats the model on WIDE and ARCSINE, a constant forecaster beats it on HIGH. The calibration claim stays limited to the development generator. Freeze `2821603`, results `ddbe5f3` |
| 2026-11-14 | Evidence ledger verified from primary records; sibling projects audited | 54 of 55 study folders read (`experiments/m7` has no tracked result file). Siblings: keep independent, reuse patterns only. Commit `9e4631b` |
| 2026-11-13 | Target architecture, decisions, hypothesis registry, roadmap | Written; see the index |
| 2026-11-13 | Research: architectures, learning, memory; evidence ledger and negative findings | Written |

## Research and audit streams

| Stream | Deliverable | State |
|---|---|---|
| Cognitive architectures | `research/COGNITIVE_ARCHITECTURE_COMPARISON.md` | Done |
| Learning mechanisms | `research/LEARNING_MECHANISMS_RESEARCH.md` | Done; citations unverified |
| Memory systems | `research/MEMORY_SYSTEMS_RESEARCH.md` | Done |
| Scientific record | `research/RESEARCH_EVIDENCE_LEDGER.md`, `NEGATIVE_FINDINGS.md`, `FILE_COVERAGE_MANIFEST.md` | Done; 13 of 55 study folders verified from primary files |
| Legacy runtime | `architecture/RUNTIME_CALL_GRAPH.md`, `research/EXISTING_SYSTEMS_AUDIT.md`, `engineering/MODULE_DEPENDENCY_MAP.md` | Partial; interrupted by the usage limit |
| Neuroscience | `research/NEUROSCIENCE_COMPUTATIONAL_MAP.md` | Not written |
| Reasoning, planning, metacognition | `research/REASONING_PLANNING_METACOGNITION_RESEARCH.md` | Not written |
| Open-source and benchmarks | `research/OPEN_SOURCE_REUSE_REGISTRY.md` | Not written |
| Sibling projects | `research/SIBLING_PROJECTS_AUDIT.md` | Not written; Noetica, Velith and Mini Prometheus are readable on disk but have not been audited |
| Independent falsification review | Appended to `architecture/ARCHITECTURE_DECISIONS.md` | See that file |

**Lesson on parallelism.** Nine agents at once exhausted the account's 5-hour usage limit within minutes, twice.
Run at most two or three at a time, and have each write its file early and extend it.

## Access inventory

Readable under `E:/Projects/OpenSourceLab/repos/`: `mini-flywire`, `Noetica-agent-lab`, `Velith`,
`Velith-research`, `mini-prometheus`, `mp-rm6-admission`, `mp-verify-ab8cc44`, `sfg_package`. Empty:
`AI MANUFACTURING`, `Dimension`, `research`.

## Decisions in force

See [`architecture/ARCHITECTURE_DECISIONS.md`](../architecture/ARCHITECTURE_DECISIONS.md), AD-1 … AD-10. In short:
build in `cognitive/`; two controllers with reliability arbitration; tasks before memory stores; calibrated belief
first; a node is a place, not a cognitive function.

## Waiting on the owner

1. **Push** of the local commits.
2. **Closure ruling** retiring nine unrun legacy studies (AD-10; a proposed D-045).
3. **Authorisation** for the legacy adapter's map-off hook in `main.js` (roadmap L1) and for app integration (M9).
4. An **erratum** for `experiments/coga/README.md`, which still calls ACQ-1 "SUPPORTED" against D-035.

## Next exact engineering milestone

**CF-06 RECORDED (2026-11-17): SUPPORTED — CONSISTENT.** Results commit `22ea769`
(`experiments/cf06/results/RESULTS.md`, `gate6_result.json` SHA-256 `91987509…72ac`, rows `cddb668b…`); not pushed.
135 fresh worlds, 0 excluded, two runs identical, 173/173.
- **Criteria:** B1–B6 all hold. B1 against the planner +84.7 [55.1, 119.4] steps on the mix (median +21, 81 / 53
  worlds). B2: RARE costs +17.4 [12.8, 21.9] against the 25 margin. B3 +60.7.
- **Source of the gain:** genuine changes +57.3 on the mix, false-alarm repair +25.7.
- **Learning the rate:** L1 +11.3 [0.3, 22.8] and L2 +31.9 hold, but the headroom rule misses by 0.4 steps, so H-VOL
  is still not admitted.
- **h:** B1 holds at every h tried. B2 and the CONSISTENT shape hold only at h = 0.01.
- **Run history (disclosed in the record):** attempt 1, launched 2026-11-16, was ended by machine standby and
  power-off with no output. Attempt 2 restarted the same deterministic run on the owner's word "try again".

Never rerun gate6. **Next, fixed by the specification:** an adversarial review of the record, then a proposal to the
owner to make model v6 with ρ fixed at 1/2 the agent's model. Nothing changes in the agent before that decision.

*Freeze and run (2026-11-16):* revision 3.1 frozen on the owner's word "Yes, freeze and run" (`7ce1dc6`) after a
final pre-Gate-6 audit (power, isolation, attribution, preregistration: all PASS) and one added line on exclusions
(none is possible: 24 nodes at maximum degree 4 always have a start-goal pair at distance 3 or more).

*Before the freeze:* **CF-06 DRAFT REVISION 3.1, UNCOMMITTED, for approval.** Gemini's review of
revision 3 (relayed by the owner; the attached file was again the CF-05/CF-05b review): conditional freeze after M1
(power) and M2 (tail risk), mechanism accepted. Done in the working tree only: **n = 135** from a simulation of the
gate's own decision rule (`experiments/cf06/power_sim.mjs`; P(SUPPORTED) at half the dev effect 0.41 / 0.69 / 0.82 at
n = 60 / 100 / 135); **gainShape in the verdict line** (three conditions; per-world distributions reported; TAIL-DRIVEN
expected); **attribution of the gain by category** from two privileged diagnostic arms BELIEF_REALONLY /
BELIEF_FALSEONLY (`cognitive/testbed/arms_v6.mjs`, optional `archiveIf` in model v6, context in task E5), gainSource
from them, a detector false-alarm evaluation plan; L2 wording tied to the headroom rule. Dev run (20 worlds, not
evidence): SUPPORTED — TAIL-DRIVEN (B1_MBVI3); all 840 revision-3 rows reproduced; split exact; **on the mix the
advantage over the planner is mostly false-alarm repair (+48.0 [11.3, 93.2]) rather than genuine changes (+28.9
[−6.2, 75.0])**, genuine reversals carry OFTEN (+31.5 [6.5, 68.8]); gainSourceMix added (restrictive). Tests 173/173.
Bundle `research/external/CF06_REV31_GEMINI_PREFREEZE_REVIEW_BUNDLE.md`. Not committed, frozen, run or pushed. Gate
run time 4 to 8 hours.

*Revision 3 (superseded by 3.1 above):* **CF-06 DRAFT REVISION 3, UNCOMMITTED, for the owner's review.** The owner chose
"Re-scope to belief" (option A). Revision 3 (`experiments/cf06/GATE_SPEC.md`): primary arm BELIEF (model v6 with ρ
fixed at 1/2, h = 0.01); criteria B1 (equal mix, beats the planner and RECALL 0.003 / 0.01 / 0.03), B2 (safe in
RARE), B3 (helps in OFTEN), B4 (mechanism: after reversed events against the planner; futile re-tests against RECALL
0.01), B5 (battery), B6 (infrastructure); learning the rate reported as L1–L4 with claim rules; h sensitivity on the
primary; two claim rules added after the dev look, restrictive only: gainSource (is the gain from reopened routes or
from returning to exits the change detector wrongly flagged?) and gainShape (consistent or from a few worlds). Dev run
(20 worlds, not evidence: these worlds chose the primary): SUPPORTED; B1 planner part +64.1 [11.5, 125.2] but 10 / 10
worlds, median −5; B3 +45.6 [10.9, 90.8]; power at half the dev effect 0.46 for each of those. Limitations in the
spec (12). Tests 169/169 in the working tree. Reconciliation `experiments/cf06/PREFREEZE_RECONCILIATION.md` §6.
Review bundle `research/external/CF06_REV3_GEMINI_PREFREEZE_REVIEW_BUNDLE.md`. The real Gemini CF-06 review has not
been received (the attached file was twice the CF-05/CF-05b review). Not committed, frozen, run or pushed. Next, on
the owner's word: an outside review of revision 3, or commit + freeze + gate6 (about 3 hours).

*Revision 2 (superseded by revision 3 above):* **CF-06 DRAFT REVISION 2, UNCOMMITTED, for the owner's review.** The owner
approved the draft after specific corrections (fixed-ρ = 1/2 control, false-alarm diagnostics, h sensitivity,
zero-reversal diagnostic, audits, six-change adequacy; 24/30 kept; drift and continuous delays as future questions)
and said: do not commit, push, freeze or run gate6. Done in the working tree only: v6 event log (evaluation only),
`diagnoseE5` in task E5, driver arms VOL_FIXED05 / VOL_H003 / VOL_H03, criterion V7 and verdict BELIEF, NOT
LEARNING, claim rules, weighting grid, ρ distributions; 5 new tests (168/168); spec revision 2 and
`experiments/cf06/PREFREEZE_RECONCILIATION.md`. The file supplied as Gemini's CF-06 review is the CF-05/CF-05b
review (identical SHA-256 `8f9d8635…`); the real CF-06 review is still to be obtained. **Revision-2 dev run (dev
0–19, all ten arms): the driver's verdict would be BELIEF, NOT LEARNING** — V1–V5 hold, V7 control − VOL +4.4
[−12.0, 23.6]; the fixed-ρ control alone beats all four fixed policies; even the true-rate reference gains only +14.5
[−8.2, 42.4] over the control (below the n = 60 detectable effect 22), so E5 cannot test whether learning the rate
pays; 76% of confirmed reversals in RARE are change-detector false alarms. Recommendation in
`PREFREEZE_RECONCILIATION.md` §5: re-scope CF-06 to the belief (option A) and redesign for H-VOL with a headroom
admission rule (option C); or freeze revision 2 as is (option B). Awaiting the owner's choice; then commit (one
milestone) and freeze as below.

*Revision 1 (superseded by revision 2 above):* CF-06 specification DRAFT (`experiments/cf06/GATE_SPEC.md`,
commit `3a3fd55`; Gemini bundle `research/external/CF06_GEMINI_PREFREEZE_REVIEW_BUNDLE.md`, `3ae2143`). Dev evidence:
VOL best on the equal mix among learners (3,182 vs planner 3,250 and RECALL 3,285–4,022), learned ρ ordered RARE
0.34 < HALF 0.50 < OFTEN 0.65 in all worlds, within 10 steps of the true-rate reference; weak link: V1 against the
planner (VOL better in 11 of 20 dev worlds). **To freeze after approval:** set the status line to start
`**Status.** Frozen`, write `GATE_SPEC.sha256`, commit, verify refusals, then run
`node experiments/cf06/run_gate.mjs --domain gate6` in the background (about two hours). Never rerun gate6.

*Development history:* **CF-06 IN DEVELOPMENT (2026-11-15; owner said "start CF-06").** Built and committed `9d623b2` (not frozen): task
E5 (`cognitive/testbed/task_e5.mjs`, six unannounced blocks per run, each reversing with a family rate RARE 0.1 /
HALF 0.5 / OFTEN 0.9), world model v6 with a learned reversal rate (`cognitive/mind/v6/`), agent VOL, registry v6,
`test_vol.mjs`; npm test 164/164. **Dev admission look (20 dev worlds): the task discriminates** — RECALL 0.01 −
planner: RARE +214 [152, 280], HALF +81 [14, 155], OFTEN −62 [−110, −18]; the best fixed policy flips between
families. Next: VOL on the same dev worlds; then draft `experiments/cf06/GATE_SPEC.md` and present it to the owner
(and Gemini if wanted) BEFORE freezing. Dev scripts live outside the repository (scratchpad); their numbers go into
the spec's development disclosure.

**Earlier (2026-11-15): CF-05 closed; CF-05b run once and recorded.** CF-05b verdict **SUPPORTED AT A COST (R4)**,
results `55048a2`: +18.8 steps after the block is removed [12.6, 25.1]; +7.7 when the change is permanent
[2.3, 12.1]; mostly recovery from real reversals (about 89%, with interaction); point break-even reversal probability
0.35 [0.16, 0.51], helps at 95% only where more than about half of changes reverse; 48-node repetition (non-gating)
same sign. RECALL is NOT adopted (AD-12). Adversarial review done: record SOUND WITH CORRECTIONS, 13 findings, all
accepted, applied by dated amendment (`experiments/cf05b/results/ADVERSARIAL_REVIEW.md`).

**Next exact milestone: CF-06, learning how often changes reverse** (roadmap; hypothesis H-VOL). First build and
admit a task with several changes per run and a reversal rate set per world family; the mechanism lives inside the
world model (two regimes per exit, learned and pooled switching rate). Not started; waits for the owner.

Still waiting on the owner: push of the local commits; the closure ruling for the unrun legacy studies; authorisation
for the legacy-agent hook in `main.js`.

*Earlier note, kept for the record:* **GATE RUNNING (2026-11-15): CF-05b was frozen at `104dd9b` (spec SHA-256 `154dd7f7…4c00`) and launched once on
`gate5b` (40 worlds of 24 nodes) plus 20 non-gating worlds of 48 nodes; about 80 minutes.** CF-05 closed without a
run (`7e40e59`). Driver refusals verified before launch: modified spec, unfrozen status, altered hash file, modified
source, closed gate. **If interrupted:** if `experiments/cf05b/results/gate5b_result.json` exists, the gate HAS run;
never run it again — read the file and write `results/RESULTS.md`. If it does not exist and no process is running,
the run did not complete; rerunning on the same domain is allowed only because no result was ever produced, and that
must be recorded. Then: adversarial review (one agent), response, registry (H-REC row), decisions (AD for CF-05 and
CF-05b; Decision 7 analysis: RECALL is the prediction step of a two-regime hidden state per exit; the model-native
version with a LEARNED reversal rate needs a multi-change task), roadmap, this file.

*Earlier note, kept for the record:* **IN PROGRESS (2026-11-15): executing the owner's eight decisions on the Gemini pre-freeze review.** Review lodged
verbatim at `research/external/CF05_CF05B_GEMINI_REVIEW.md`. Done: (a) source discrepancy settled from the code:
CF-05b is 40 worlds of 24 nodes / 30 edges, plus a non-gating 20 worlds of 48 nodes / 60 edges; CF-05 declared 60
worlds; Gemini's "20/40 nodes" matches nothing in the code; `gate5`/`gate5b` never used. (b) Diagnostic arms
audited and REPAIRED: they classified by edge, not by event (false alarms on the manipulated edge before the block
counted as "real"), and a diagnostic arm missing its context silently became ordinary RECALL. Now
`cognitive/testbed/arms_v5.mjs` is the only route for ground truth; each declared change is classified by whether
the edge is blocked at that moment; missing context throws; 7 isolation/leakage tests; npm test 154/154.
**Remaining, in order:** CF-05 closure record (`experiments/cf05/CLOSURE.md`; spec never frozen, do not run);
add to `gate_lib.mjs` the U(p) = p·B − (1−p)·C curve with joint bootstrap and break-even p, the real/false
decomposition with residual, 48-node memory/compute/convergence metrics and wall-clock outside the hashed rows, a
refusal for closed gates, and a GATE_SPEC.sha256 check; correct and freeze the CF-05b spec; run `gate5b` once in
the background; results; adversarial review; registry, decisions, roadmap.

*Earlier note, kept for the record:* **WAITING ON THE OWNER (2026-11-15): an outside review of two DRAFT specifications, before any freeze.**
The owner reviewed the first CF-05 draft and decided: two separate gates; recall's setting re-selected on new
tuning worlds; a permanent-block task arm; diagnostic arms separating real recovery from false-alarm repair; a
larger-world repetition; and a Gemini review of the drafts first.

- **CF-05** (`experiments/cf05/GATE_SPEC.md`, revision 2): the exploration bonus, with the Dyna-Q+ baseline, 60
  worlds, domain `gate5`. Its own dev data predict a null; expected verdict NOT SUPPORTED.
- **CF-05b** (`experiments/cf05b/GATE_SPEC.md`): targeted recall, 40 worlds, domain `gate5b`, to run after CF-05
  is recorded. Setting chosen on `cf|tune5b|world|0…19` (now spent). Tuning result: −18.6 steps after the block is
  removed [−27.1, −10.4] and +8.2 when the block is permanent [5.7, 10.8]; expected verdict SUPPORTED AT A COST.
- **Bundle for Gemini:** `research/external/CF05_CF05B_GEMINI_PREFREEZE_REVIEW_BUNDLE.md` (cover with sixteen
  questions, then both drafts, the shared driver, the candidates, the baseline, the task, the model and the CF-04
  record, verbatim with hashes). The owner relays it and brings the reply back.
- **When the reply arrives:** reconcile it against the drafts and source (as was done for the first review), revise
  the drafts, present them to the owner, and only on approval change each status line to start
  `**Status.** Frozen`, commit, and run (`node experiments/cf05/run_gate.mjs --domain gate5`, in the background;
  then `cf05b`). Both drivers refuse to run until then. Nothing enters the agent without a passed gate and
  independent verification. npm test 150/150.

*Earlier note, kept for the record:* **WAITING ON THE OWNER (2026-11-14): CF-05 specification is a DRAFT for review, commit `907232f`.** File:
`experiments/cf05/GATE_SPEC.md`. Dev findings: the exploration bonus (BONUS) and blanket belief decay (DECAY) do
not recover the route and harm at stronger settings; Dyna-Q+ is worse than the planner at every setting; a third,
targeted candidate RECALL (remember exits declared worse, drift back toward the remembered belief) gives −12.4
steps after the block is removed [−23.4, −2.5] on dev, selected among three settings so optimistic. **To freeze
after approval:** change the specification's status line to start `**Status.** Frozen`, commit, then
`node experiments/cf05/run_gate.mjs --domain gate5` (60 worlds, about 45 minutes; run it in the background), record
`results/RESULTS.md`, then the independent verification listed in the specification. Nothing enters the agent
before that. npm test 147/147.

*Earlier progress note, kept for the record:* **CF-05 preparation, in progress (2026-11-14).** The Gemini review was received, lodged and reconciled
(`research/external/CF03C_CF04_GEMINI_REVIEW_RECONCILIATION.md`, commit `572c0a5`); the hold below is lifted by
the owner's instruction to proceed. Done so far, commit `6bdd9e7`: Dyna-Q+ count-model baseline
(`cognitive/baselines/`), two recovery candidates BONUS and DECAY (`cognitive/mind/v4/`), registry v5, tests
(146/146). **Remaining, in order:** (1) the dev-domain grid on task E4, three settings each for Dyna-Q+, BONUS
and DECAY, both arms (the script used is outside the repository; rerun it if its output is lost); (2) choose one
setting per family by the same rule (lowest total steps over the CHANGE and SHAM arms); (3) write
`experiments/cf05/GATE_SPEC.md` and `run_gate.mjs`; (4) **present the specification to the owner for review before
freezing**; (5) freeze, run once on a new domain (`gate5`), record, independent verification. No candidate enters
any agent path unless the gate shows a measurable improvement.

*Superseded hold, kept for the record:* **HOLD (owner's instruction, 2026-11-14): CF-05 is not to be designed, frozen or run until an independent
Gemini review of CF-03c and CF-04 has been received and considered.** The complete bundle for that review is
`research/external/CF03C_CF04_GEMINI_REVIEW_BUNDLE.md` (cover and questions, statistical power, internal review,
then the frozen specifications, results and source code verbatim with hashes). The owner relays it to Gemini and
brings the reply back. When the reply arrives: record it with responses in
`docs/architecture/ARCHITECTURE_DECISIONS.md`, amend any results record by a dated amendment (never by editing),
and only then decide the next experiment — which may not be CF-05.

**Proposed, pending that review: CF-05 — recovery after a change is reversed.**
CF-04 measured where the planner still loses: after a block is removed it is 40.1 steps behind the reference
[32.5, 48.1] because it re-tests the reopened exit in 0.9 of 15 episodes. Steps:

1. Build the stronger baseline first: Dyna-Q+ with a count model (`cognitive/agents/dynaq_plus.mjs`), so a
   re-testing mechanism is compared with the textbook one.
2. Design on `dev`: a bonus for exits not tried recently, inside the planner's value computation. Task E4 already
   measures it (`return` window; the sham arm measures its cost).
3. Freeze `experiments/cf05/GATE_SPEC.md`; run once on a new domain.

Independent of this and waiting only on the owner: the legacy-agent comparison (needs authorisation to touch
`main.js`).

What the testbed agent is today, by evidence: a learned model with pooled priors and change detection (v3),
planned over by value iteration (MBVI3). Arbitration, working memory, episodic memory and transfer have no
evidence; arbitration has evidence against it at this scale.

Earlier wording of the previous step, kept for reference: build `cognitive/testbed/task_e4.mjs`
(stochastic edges, a distal change the agent must discover, a sham-change control) and its admission gate
`experiments/cf04a/`. Calibrate the horizon on `dev` worlds first; the COG-A study failed its precondition at
1,500 steps. In parallel, **M1 — stronger baselines** (Dyna-Q+ with a count model, posterior sampling).
