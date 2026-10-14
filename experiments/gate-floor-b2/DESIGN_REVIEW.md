# GATE-FLOOR-B2 — design review record

Recorded **before any confirmatory outcome of the 160 study worlds existed**. This file is part of the freeze.

## Independent review

A self-contained design package (pristine build identity and the source differences, the semantic port and its legal-edge
guard, the measurement path and its neutrality evidence, the frozen design, the GATE-FLOOR-1 results and limits including
the retry increase, the unsupported claims) was reviewed independently by Gemini, which had no repository access and did
not run or implement anything.

**Verdict: PASS WITH CLAIM LIMITS. Material objections: none. Smallest sufficient correction: none. Freeze readiness: ready
to freeze and run unchanged.**

Facts the reviewer confirmed: the substrate is the pristine B2 tree (`707cb1e5`); B2 inherently allows non-graph goal
resets (37.8 % in COLD) and takes no environment draw for a goal-entering move; the intervention is two guarded lines that
evaluate only legally confirmed graph edges without touching the environment's reliability draw; the calibration puts
REAL's legal benefit at +68.6 [42.3, 95.2], so the REAL instrument (I1) may trigger NOT_INTERPRETABLE_LOW_BENEFIT; the
final-hop retry diagnostic is structurally degenerate (0 failures) and is correctly reported as such. Inference: legal
reaches as the primary outcome is necessary and justified; n = 160 and the absolute margins have sufficient power for the
maximum calibration paired SD (111.6); the neutrality checks isolate the intervention cleanly.

### The reviewer's stated UNKNOWNs (carried, not resolved)

1. **How the floor alters the frequency of B2's own non-graph resets.** Reported per arm and per goal group, with the paired
   difference to COLD; it is not constrained and no claim depends on it.
2. **Whether B2's 1-hop "shortcut blocked" penalties dampen a floor that makes 1-hop entries common.** Not testable with
   this design. The only measurement added is the end-of-session penalty/reward/transition memory on each `u → goal` edge
   (descriptive), which can show whether penalties are *larger* under the floor, not whether they *dampen* it.

### Note on the reviewed text

The file that carried the review also contained, above it, the verdict text of the earlier GATE-FLOOR-1 review (same
verdict). Only the B2-specific section is the review of this design; nothing in the earlier text is relied on here.

## What was added between the review and the freeze (descriptive only; no decision criterion moved)

The authorisation to freeze asked that non-graph goal-reset frequency be reported **by arm and goal group** and that the
effect of shortcut penalties be reported "only to the extent supported by measured results". Two observational additions
were made, both after the run and neither able to influence it:

* the analysis now reports non-graph resets per goal group (it already reported them per arm and as paired differences);
* each instrumented session records, after the run, the penalty / reward / transition memory on the goal's edges
  (`goalEdgeState`), summarised per arm.

Consequences for the digests: the **decision digest is unchanged** (`fefd942a099fde6f20d4204d684cde1cd545b8734e41f35b65ace851fa4528fc`:
arms, claims, margins, rules, worlds, seeds, tree pins, outcome definition); the **design digest** additionally binds the
descriptive diagnostics and therefore moved from the value shown in the review package (`392e5443…`) to the value recorded
in `config.mjs` and in every manifest. The gate asserts that these additions do not change the measured OFF runtime
(neutrality sections N1–N3, whole sessions) and that the analysis reproduces them on exact fixtures (A12, A13).

## Claim limits (unchanged)

Permitted only for: pristine B2 (`707cb1e`), Phase I, 1,500 calls, the hidden-reliability task with an oracle goal, floor
value 1. **Not** claimed: learning, understanding, human-like episodic recall, planning, reliability learning, routing
capability, general cognition, manufacturing competence, production safety, or any property of the current repository
`main.js` (B2 ≠ HEAD is UNKNOWN). The final-hop failure diagnostic is uninformative about retry-farming on this substrate
by construction. Production code is unchanged.
