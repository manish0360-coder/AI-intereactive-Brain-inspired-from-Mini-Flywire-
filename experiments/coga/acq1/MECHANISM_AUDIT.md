# ACQ-1 — audit of the acquisition mechanism (M-COGA-6)

**Decision: no learning-mechanism change is made.** The audit does not establish that one is necessary. Evidence below; all of it is
development data or code reading, none confirmatory.

## 1. How experienced reliability can reach a choice (hook state P)

| channel | code | carries the outcome of the attempted edge? | status in P |
|---|---|---|---|
| Q update | `main.js:4167`, inside the learning block that runs **before** the environment call of the same step; keys `(agentLast, next)`, target from `rewardSignal` and `max Q(agentCurrent, ·)` | only indirectly. The reward is computed from the intended `next` and semantic similarity, before any outcome (`main.js:4056-4086`, goal +12 for the intended move); the key is the next decision's, so a slip's effect lands on the pair chosen afterwards. This is CREDIT-1's lag | live |
| per-edge trust (E2) | `__M7_CREDIT__.recordTraversal`, `main.js:5040-5043`, read as `bayesianTrust`, `render/scoring.js:183`, weight ±6 | yes, exactly: attempts and successes of the attempted edge | **off** in P; on in H |
| legacy trust | `main.js:4473-4480` (lagged attempts), `:4675` (success only for edges of goal-reaching paths) | no: it measures membership of successful paths | live |
| prediction error | `main.js:4157` (learning authority), `:4214` (`dampQ`) | implicitly: slips raise the error | live in P; pinned off in H |
| episodes | stored only for completed goal paths; a slip leaves no trace (`main.js:4997-4999`) | only as a frequency effect: routes that succeed are stored more often | live |
| traversal record | `main.js:5059`, read only by `render/planning.js:231` (FutureScore) | yes, exactly | written, but its only reader is a map oracle, blocked map-off |

**FACT (reading).** The one accurate per-edge outcome record in state P, the traversal record, has no reader in a map-off session. Everything
else that is live is indirect. So fast edge-level learning like QB-1's is not available in P, and a slow channel is what the code allows.

## 2. What the behaviour shows (development, 30 worlds, ψ crossover)

| window | MFW-P | MFW-H (E2 on, PE off) | MFW-A (aligned credit) | QB-1 |
|---|---|---|---|---|
| [0, 3000) | −0.017 | 0.047 | 0.077 | 0.326 |
| [3000, 6000) | 0.011 | 0.063 | 0.054 | 0.555 |
| [6000, 9000) | 0.069 | 0.112 | 0.095 | 0.651 |
| [9000, 12000) | 0.131 [0.065, 0.191] | 0.140 [0.067, 0.214] | 0.137 [0.062, 0.210] | 0.687 |

Readings, all conditional on being development data:
1. **Acquisition is not impossible in P.** ψ rises without any change to the agent. The earlier P2 failure at 1,500 steps was at least
   partly insufficient exposure, on a confounded metric.
2. **The prediction-error pathway is not necessary.** H pins it off and reaches the same level.
3. **The credit repairs do not change the level at 12,000 steps.** Correct per-edge trust (H) and aligned credit (A) start earlier, by
   about 0.05–0.08 in the first 3,000 steps, and end level with P.
4. **MFW is far slower than a minimal learner:** it needs about 10,000 steps for what QB-1 shows in its first 500 to 1,000.
5. **MFW also plateaus low.** At 36,000 steps (`evidence/dev_diag_36000.json`), ψ(MFW-P) by 6,000-step bins is −0.002, 0.088, 0.163, 0.125,
   0.155, 0.157; QB-1 is 0.426, 0.663, 0.714, 0.727, 0.724, 0.710. So the limit is not only speed: MFW settles near 0.15, about a fifth
   of QB-1's level. 12,000 steps reaches that plateau, so the evaluation window does not understate a slow learner.

## 3. What is not established

- Which channel produces the late rise. The common element of P, H and A is success-biased episodic frequency, but that is a hypothesis
  (**OPEN**); no ablation of it was run.
- Why correct trust (H) does not do better. Its weight is small against the other scoring terms by reading, but term magnitudes were not
  measured (**OPEN**).

## 4. Decision

The Director's criterion for a change is that the audit establishes it is necessary. It does not:
- the target behaviour appears on development worlds in the unchanged agent;
- the two existing, gated repairs do not change the end level, so no specific missing mechanism has been identified;
- any new mechanism chosen now would be a guess about an unmeasured channel, the arbitrary kind of change the ruling forbids.

Therefore P stays the primary agent, and A and H stay as prespecified secondary arms. If ACQ-1 is not supported, or a faster acquirer is
wanted, the next step is a channel ablation on development worlds, then a new versioned design. That is outside ACQ-1.

## 5. Addendum after the confirmatory run (2026-10-31)

Sections 1–4 are unchanged and describe what was known at the freeze. On 100 confirmatory worlds (`RESULTS.md`):
- Reading 3 is partly withdrawn: H does lead P early, but MFW-A's early lead did not replicate, and A ended at 0.080 against P's 0.130.
- Table §1 omits a fact recorded in `../M1_AUDIT.md` F8: goal-entering choices skip the environment (`main.js:5018`), so MFW's final hop never slips
  and no channel can record a failure on it (`RESEARCH_REPORT.md` §5).
- The channel of the late rise stays open. The exploratory checks reject chance, retry dynamics, the arrival mix and a reliability-blind goal gradient as
  the explanation, but they identify no channel (`RESEARCH_REPORT.md` §6).
