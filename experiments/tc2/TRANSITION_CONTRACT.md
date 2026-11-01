# TC-2 Transition Contract: Provisional Record

**Status: PROVISIONAL. NOT FROZEN.** Subject to final contract review.

- ACQ-1 is VOID under D-035 and is not evidence for this contract.
- TC-2 is design-only and paused.
- This record authorizes no implementation, test, experiment, instrumentation, build, staging, commit or push.
- No scientific improvement, reliability, transfer, planning, mechanism-performance or cognition claim is authorized.
- No acceptance criterion has been run or passed.
- Source tracing is not runtime verification.

## Status legend

| Label | Meaning |
|---|---|
| DIRECTOR RULING | Explicit Research Director decision; its exact status is stated where it appears |
| PROVISIONAL APPROVAL | Approved by the Director, subject to final contract review |
| ACCEPTED DECISION | Decision or interpretation accepted by the Director |
| APPROVED WORDING | Text approved as contract wording only, without runtime verification |
| CARRIED FORWARD | Text from Review Copy 2 that was not separately ruled. Carrying it forward approves no mechanism |
| OPEN LIMITATION | Unresolved; must not be treated as settled |
| UNRUN CRITERION | Defined requirement, never executed |
| SOURCE TRACE | Read from source; not observed at runtime |

`P:n` means line n of the pinned tree's `main.js`.

Naming note: earlier packets wrote the first ordering decision as "D1.1" and "D1.2". This record calls them O1 and O2. They are not sheet decision D1.

Provenance note: Review Copy 2 and all rulings below were made in the design conversation. This record is their first repository copy.

## Status of rulings

| Item | Status |
|---|---|
| Purpose A, mechanism boundary | DIRECTOR RULING, provisional |
| O1, O2, O3, R1, R2, R3 | DIRECTOR RULING, provisional |
| D1 (C1 to C14) | PROVISIONAL APPROVAL |
| D2 and E-7 | PROVISIONAL APPROVAL |
| D3 to D16, including D12a and D12b | PROVISIONAL APPROVAL |
| D17a, including CL-A with the accepted correction | PROVISIONAL APPROVAL |
| D17b | DIRECTOR RULING, provisional |
| DB, with scope-of-coverage clarification | PROVISIONAL APPROVAL |
| DB-Scope (b) | ACCEPTED DECISION |
| D18 | APPROVED WORDING. No criterion has been run or passed |
| CL-C, CL-D | ACCEPTED DECISION |
| DT3 | DIRECTOR RULING: DEFER. [OPEN-T3] stays open. Ruling B (Section 13) states a preferred design direction and closes nothing |
| Rulings A to F (D-037) | DIRECTOR RULING, provisional. Section 13 holds them. Every open item they name stays open |
| SC-A to SC-E (D-038) | DIRECTOR RULING, provisional. Section 14 holds them and the source-closure record. Every open item they name stays open |
| Freeze-readiness assessment (D-039) | PROPOSED, not ruled. Section 15 holds it. Verdict: NOT READY FOR FREEZE REVIEW |
| FR-A to FR-G (D-040) | DIRECTOR RULING, provisional. Section 16 holds them and the acceptance traceability. Freeze-gate verdict: NOT READY FOR DOCUMENTATION FREEZE |
| FC-1 to FC-7 (D-041) | DIRECTOR RULING, provisional. Section 17 holds them, the adopted criteria AC39 to AC48 and the current freeze verdict: NOT READY FOR DOCUMENTATION FREEZE |
| Gemini overall NOT READY verdict | Rejected as insufficiently supported. This does not independently prove the contract correct. Its useful verification ideas are preserved |

## 1. Baseline identity (PROVISIONAL APPROVAL, D6)

- Root commit: `a2bf3cb41dc1015523745fb260e6a1910e2b42d0`.
- Pinned `main.js` SHA-256: `3d3266fde38c39ea0a38f3920b4a2384ef5998e88c748e0a0a53416ef62bccc3`.
- Pinned `render/planning.js` SHA-256: `34e06c655b4f2b04d77b4db0b8db744568235865788177085510b5dd78cf46dc`.
- The baseline is content-based. Its temporary location is not its identity.

| Pinned line (not in root) | Purpose |
|---|---|
| `P:1154` | Reachability switch |
| `P:1279` | Diameter switch |
| `P:1320` | Distance switch |
| `P:1792` | Candidate admission hook |
| `P:2128` | GATE-FLOOR hook |
| `P:3646` | Execution legality guard |
| `P:4867` | Goal-reset probe |
| `render/planning.js:291` | FutureScore switch |

Qualifications:
- The comparison covered `main.js` and `render/*.js`.
- Reproducibility from the current location is not verified.
- Root stays distinct and was not traced end to end.
- Both trees remain nonconforming.
- Baseline selection authorizes no build, test or runtime use.
- If the governing baseline changes, the AC38 inventory must be re-derived.

## 2. Purpose and boundary (DIRECTOR RULINGS, provisional)

**Purpose A.** Conformance-first. TC-2 changes only what the runtime needs to obey this contract. Capability change is deferred to a separately authorized stage.

**Mechanism boundary.** No new failure-evidence store, reader, scoring term, weight, reward branch or oracle access. Do not rewire prediction-error handling merely to force failure evidence into learning. No rerouting of writers to restore cadence.

**O1.** The environment verdict must precede reward, learning, credit assignment, commit and reset for every legal attempted edge, including goal edges.

**O2.** `S` must identify the actual decision position. The realized next state `S′` must reflect the transition outcome, including remaining at the current position on a slip.

**O3.** TC-2 is a new agent with no continuity claim from ACQ-1. This does not establish that V2 improves learning or behaviour.

**R1.** V2 means the proposed authoritative transition ordering and correct state identity. V2 does not, by itself, settle L0 versus L1 or establish realized-only learning as a final policy.

**R2.** `S′` is the recorded realized successor. Its definition alone does not authorize a Q update.

**R3.** A call that produces no fresh decision must not make an environment attempt. Replay remains a training operation and must not itself authorize movement. This is a prospective TC-2 design decision, not a claim that Option A is scientifically superior or that the existing implementation already conforms.

## 3. Conformance reference CR-1 (PROVISIONAL APPROVAL, D2 and E-7)

| Row | Text |
|---|---|
| E-1 | Undirected graph of 20 nodes and 39 edges, traversable both ways; adjacency known |
| E-2 | Step: one `runAgent` call, at most one attempt |
| E-3 | Non-edge pair: refused, agent stays, step consumed, counted |
| E-4 | Edge attempt resolves by a hidden, study-supplied per-edge reliability; on failure the agent stays |
| E-5 | Self target: no-op, no draw, not an edge attempt |
| E-6 | Episode ends on goal arrival or after 150 steps |
| E-7 | No agent receives `p` or distances, and no agent receives the map-oracle outputs defined by D5 |

Excluded: stream clause, start draws, phases row, reward row.

Not governing TC-2: M7, its errata, H1-R and its rulings, ACQ-1, the remainder of COG-A, baseline agents, CREDIT-1, LEARN-0 and FutureScore. They stay unchanged in their own scope.

## 4. Rulings

### D1: F-1 ruling on [OPEN-FallbackBranch] (PROVISIONAL APPROVAL)

**C1.** A non-fresh call performs no transition pass.

**C2.** A transition pass is any execution on that call of reward computation, prediction-error evaluation, learning, memory, credit, traversal-record, commit or traversal logic for a transition taken from a carried decision, or from a current or earlier attempt, its verdict or its realised successor. This holds even when the carried target equals the agent's position after an earlier successful move.

**C3.** In the pinned tree, on a non-fresh call, the self-learning section (`P:3967-4970`), verdict site (`P:5024-5027`), credit and traversal-record sites (`P:5048-5051`, `P:5065-5067`) and traversal block (`P:5069-5198`) do not run.

**C4.** C4 is the only exception to C1. It prevails over C1 and C2 only for the operations named here. Permission attaches to each named operation, not to any enclosing function. An operation reached through a permitted function that is not named here stays prohibited unless a later ruling permits it.

- Permitted setup: selecting a stored episode, recording replay cooldown, and building and sealing the replay copy, including their existing draws and clock reads.
- Permitted learning: procedural learning at replay authority on that stored episode's transitions: `transitions` (`render/episodeManager.js:974`), Q (`:1003`), `rewards` (`:1013`), provenance log (`:1014`) and momentum (`:1019`).
- Not permitted: prediction-error evaluation, credit, traversal record, storing an episode, consolidation, commit, environment attempt, movement, or any transition taken from a carried decision or from an attempt outside a stored episode.

**C5.** The operations named here do not meet C2. They remain as they exist on a non-fresh call, limited to what is named: (a) step accounting: the per-call step hook at `P:3260` and the episode step increment at `P:3303`; (b) the branch draw at `P:3460`; (c) first start at `P:3400-3409`; (d) cap handling at `P:3274-3302`, limited to the cap test, `sealCurrentEpisode("tick_cap")`, clearing the path window and, when armed, the step ledger, resetting the expectation, drawing a new start, syncing `agentLast`, and resetting the episode step count. Its repositioning is a reset, not traversal; (e) scheduled operations at `P:3316-3394`; (f) display output and instrumentation rows that write no agent learning state.

C5 only clarifies. It neither narrows nor widens C2, and it gives no permission to any unnamed operation. An unnamed operation that meets C2 stays prohibited by C1. An unnamed operation that does not meet C2 is not decided by this ruling and stays [OPEN-A4]. Loop-level operations at `P:5222-5258` run outside `runAgent`, so this ruling does not reach them.

**C6.** This ruling permits no other decision work. By source trace, on the pinned tree with the oracle-off driver, no prediction call ends without a fresh decision. If another tree allows such a call, its candidate-evaluation writes stay unresolved under [OPEN-Base] and [OPEN-A4].

**C7.** C1 and C2 do not apply to `updateBehavior`. This ruling neither permits nor prohibits it on a non-fresh call and does not classify it. D12a and D12b now govern it.

**C8.** Nothing in this ruling decides a category. Later rulings govern what they name.

**C9.** This ruling governs non-fresh calls only. It decides nothing about calls with a fresh decision, including slips and fresh calls with no attempt.

**C10.** Fallback-branch (`P:4348-4462`), section and traversal-block writers lose their non-fresh cadence. On the pinned tree with the oracle-off driver, writers with no other autonomous call site receive no further autonomous writes; any scheduled decay of their stores continues. This loss is accepted as a consequence of the contract, is not a design target, and must be disclosed.

**C11.** No writer is rerouted to restore lost cadence. Any such restoration is a rewire deferred to a separately authorized stage.

**C12.** Root-tree behaviour is not established. This ruling selects no base tree; D6 later did so provisionally.

**C13.** This ruling does not establish that the loss is harmless, neutral or beneficial. Reader and downstream effects are unmeasured. It supports no claim about learning, reliability, mechanism or baselines. ACQ-1 remains VOID under D-035 and provides no evidence for this ruling.

**C14.** This ruling authorizes no file change, test, session, experiment, implementation, staging, commit or push.

### D2 to D17b (each ruling's status is in the status table)

| Ruling | Text | Limitation |
|---|---|---|
| D2 | CR-1 is the conformance reference | Reference only |
| D3 | On EDGE_SLIP and GOAL_SLIP, no `rewardSignal` value exists for that attempt. The row records reward as `none`, not `0` | Selects no slip rule by itself |
| D4 | Evaluating PE on EDGE_SLIP or GOAL_SLIP would be a rewire and is outside Purpose A. No such evaluation occurs in TC-2 | Does not establish that existing pre-verdict PE evaluation is correct or harmless. The existing path can evaluate intended-move inputs before an attempt slips. Effects unmeasured |
| D5 | Map-oracle outputs are goal distance, goal reachability, graph diameter and FutureScore. No agent receives them in TC-2 | Selects no tree. Not claimed to improve behaviour or be neutral. The record may have no decision reader in the pinned configuration. Does not remove the record or authorize root changes |
| D6 | Baseline as in Section 1 | Section 1 qualifications |
| D7 | Trust is the designated store for per-edge failure evidence | Storage designation, not a claim that the agent learns effectively |
| D8 | L0: on EDGE_SLIP and GOAL_SLIP the self-learning section does not run, no TD or other Q write is derived from that slip, and `S′=k(u)` is recorded | Scheduled maintenance is separate. Not shown better or neutral |
| D9 | On a slip the pending expectation is neither evaluated nor explicitly reset. The next fresh decision overwrites it | Pinned-tree assumptions; source tracing only. No slip-time reset call site |
| D10 | One verdict-bound writer: `recordAttempt(u→v)` at the verdict for every attempted legal edge, goal edges included; `recordSuccess(u→v)` if and only if the verdict is true. `P:4484`, `P:4681` and `render/episodeManager.js:1092` do not run. `confidenceMap` writes stay | Explicit mechanism change; no improvement claimed |
| D11 | The traversal record covers every attempted legal edge, goal edges included, with a single writer | The record remains instrumentation-only and is not made readable by agent decision code. Do not add a decision reader or claim the record affects decisions |
| D12a | `updateBehavior` stays at its existing place on every call where `lastDecision` exists | Effect unmeasured |
| D12b | `lastDecision`, `lastReasoning`, `generateExpectation` and `updateBehavior` are decision-time; decays are scheduled maintenance; the replay pipeline is replay training | Not shown harmless or measured |
| D13 | On GOAL_OK: 12 if `episodeUnique >= 3`, otherwise 0, on realized nodes, read before this move's memory push | Six-slot window and comment mismatch documented; objective unspecified |
| D14 | `rewardCurrentEpisode(10)` stays unchanged on GOAL_OK, has no contract role and is not the Q reward. `rewardSignal` is the Q reward input | None added |
| D15 | Verdict is `u(e,j) < p_e`, where `u(e,j)` is the j-th uniform of the per-undirected-edge stream and `j` counts attempts on `e`. MFW starts stay on the cognitive stream | Difference from baselines' shared start stream documented |
| D16 | (i) At a terminal verdict or cap, an append-only outcome record is created as instrumentation, unreadable by agent code. (ii) Stored episodes contain realized transitions only. (iii) `sealCurrentEpisode` has no contract role | No production freeze. Whether unrealized nodes can enter stored episodes under the current implementation stays unresolved |
| D17b | Arm OFF, credit on as defined by D10, PE pin off. No separate `dampQ`-on-slip requirement is added. Slips receive no PE evaluation and no Q write derived from the slip | Eventual implementation verification is mandatory. Effects unmeasured |

### D17a (PROVISIONAL APPROVAL)

D17a: APPROVED, provisional, subject to final contract review. The transition order, T1 to T9 and Part D table of Review Copy 2, and CL-A with the accepted correction, are the provisional TC-2 transition contract. CL-B stands as approved under DB, and CL-C and CL-D stand as accepted. T3 is a requirement only. [OPEN-T3] and [OPEN-DoubleGoal] stay open, and terminal-bootstrap correctness is not established. No implementation or runtime behaviour is approved. This approval is not evidence that the transition order has been implemented or verified.

### D18 (APPROVED WORDING)

D18: AC1 to AC38 are adopted as the proposed acceptance set, as follows:

(a) Review Copy 2 wording: AC7, AC26, AC34, AC35, AC36, AC37, AC6, AC8, AC12, AC20 and AC33, and AC9 and AC10 as amended there. All other criteria keep their Review Copy 2 wording, except AC5 and AC38 below.

(b) AC5: "Forced goal success: exactly one reset and exactly one commit operation. The commit operation may store no episode if existing seal gates reject storage. The commit operation must not execute twice." The distinction between the main TD write and the commit write stays in force. This wording defines a requirement to be tested later, and it does not claim that the runtime executes exactly one commit operation.

(c) AC23: the wording stays unchanged. Its parity target is OPEN. It must be defined before AC23 can be treated as executable or passed.

(d) AC38: as approved under DB, including its scope-of-coverage clarification. AC38 executability is OPEN, because no complete write-observation mechanism has been established.

(e) Independence: AC5 and AC19 stay independent of AC38 and of each other.

(f) Status: this approves contract wording only. Adoption does not mean every criterion is executable, and AC23 and AC38 are not executable at present. No criterion has been run or passed, and this ruling authorizes no implementation, test, experiment or instrumentation.

Clarification, separate from the AC5 sentence: In AC5, "seal gates" means the existing commit-path validation gates in `recordAutonomousSuccess` and `_sealBuffer`, not `sealCurrentEpisode`.

## 5. Carried-forward definitions (CARRIED FORWARD)

These definitions come from Review Copy 2. They were not separately ruled. Carrying a definition forward does not approve an associated mechanism, and it does not establish correct runtime behaviour. The fresh-decision definition does not establish correct freshness detection; [OPEN-FreshMech] stays open.

| Term | Definition |
|---|---|
| Step | One `runAgent` call |
| Fresh decision | `lastReasoning` written during this call by `runPrediction` at step 0 |
| Non-fresh call | A call with no fresh decision |
| `u`, `v` | Position at the call's decision; target of the fresh decision |
| Attempt | A fresh decision's legal edge presented to the environment |
| Verdict | The environment's single Boolean for an attempt |
| `v′` | Realized successor: `v` if true, `u` if false |
| `S`, `S′` | `k(u)`; `k(v′)`, recorded for every attempt |
| Slip | An attempt with verdict false; it is not a move |
| Realized move | An attempt with verdict true |
| Transition pass | As defined in C2 |
| Main TD write | The section's single TD update for a realized move: `P:4173`, or its `else` alternative `P:4354` |
| Commit write | A Q write by the commit pipeline at `render/episodeManager.js:1003`, for a pair in a stored success episode |

## 6. Transition contract (PROVISIONAL APPROVAL, D17a)

This section records provisionally approved contract text. CL-B, CL-C and CL-D carry their own stated statuses. It is not evidence of implementation or runtime behaviour.

### 6.1 Transition order

| Step | Contract |
|---|---|
| Between calls | Loop-level maintenance |
| 1 | Step accounting and cap test. If the cap is reached: truncation, outcome record, cap reset drawing a new start. The same call continues to step 2 |
| 2 | Top-of-call scheduled maintenance |
| 3 | First start, only if no current position exists. After a cap reset this step makes no draw |
| 4 | Branch draw |
| 5 | Prediction, or replay limited to C4 |
| 6 | `updateBehavior` where `lastDecision` exists |
| 7 | No fresh decision: no attempt, verdict or transition pass; row; end |
| 8 | Classify the fresh decision. SELF, NO_ACTION, BLOCKED or REFUSED: no attempt; row; end |
| 9 | Attempt: one verdict `u(e,j) < p_e`, goal edges included |
| 10 | Bind `u, v, verdict, v′, S, S′` |
| 11 | Credit and traversal record from bound values; outcome record on a terminal verdict |
| 12 | Slip: no section; reward `none`; no PE; no Q write; expectation pending; row; end |
| 13 | Realized move: reward. GOAL_OK uses the gate, read before the push |
| 14 | PE evaluation after the verdict |
| 15 | One main TD write; no bootstrap if terminal |
| 16 | Other section writes from bound values, including memory |
| 17 | GOAL_OK only: commit, including any commit writes, then reset last |
| 18 | Movement: EDGE_OK to `v` |
| 19 | Row |

### 6.2 T1 to T9

**T1.** GOAL_OK is the only terminal event.

**T2.** GOAL_SLIP is not terminal, and no reward value exists for it.

**T3.** On GOAL_OK, the main TD write and any commit write entering `g` use no bootstrap term. Other live Q writes use `maxQ(S′)` under existing rules. A slip has no Q write. Replay writes stay under C4 and are not terminal events. Mechanism deferred as [OPEN-T3].

**T4.** No Q write has `S=k(g)`.

**T5.** Q writes use bound values, never the post-reset position.

**T6.** Truncation writes no reward, Q or commit, and the previous transition keeps its bootstrap.

**T7.** The cap counts steps, not attempts.

**T8.** GOAL_OK on step 150 is terminal. A slip on step 150 truncates at the next step start.

**T9.** The Q reward input is `rewardSignal`. `rewardCurrentEpisode(10)` has no contract role.

T9 and D14's matching sentence are corrected by D-041. Section 17.5 holds the governing wording, and this text stays as the historical wording.

### 6.3 Part D table

| Event | Fresh | Attempt | Verdict | Movement | Terminal | Bootstrap | Reward | PE |
|---|---|---|---|---|---|---|---|---|
| EDGE_OK | Yes | Yes | True | To `v` | No | Yes | Existing chain | After verdict |
| EDGE_SLIP | Yes | Yes | False | None | No | n/a, no Q write | `none` | None |
| GOAL_OK | Yes | Yes | True | Arrival at `g` recorded; reset sets new start | Yes | No | 12 or 0 | After verdict |
| GOAL_SLIP | Yes | Yes | False | None | No | n/a, no Q write | `none` | None |
| SELF | Yes | No | None | None | No | n/a | No operation | No operation |
| NO_ACTION | Yes, neuron missing | No | None | None | No | n/a | No operation | No operation |
| BLOCKED | Yes | No | None | None | No | n/a | No operation | No operation |
| REFUSED | Yes | Non-edge, not an edge attempt; step consumed | No edge verdict | None | No | n/a | No operation | No operation |
| CAP | Boundary event; may share a call | No | None | Reset, not traversal | No, truncation | Prior write unaffected | No operation | Expectation cleared |
| NO_FRESH_DECISION | No | No | None | None | No | n/a | No operation | No operation |

`none` means no reward value exists. `0` on GOAL_OK is an explicit value. Under T7, every row consumes its step.

### 6.4 Clarifications

**CL-A. Goal Q writes and AC9 (PROVISIONAL APPROVAL, D17a).** On GOAL_OK, two existing paths can write Q for the edge entering `g`.

| | Main TD write | Commit write |
|---|---|---|
| Source trace | `P:4173`, or `P:4354` in the `else` branch | `render/episodeManager.js:1003`, through `P:4596` |
| Reward input | `rewardSignal`: 12 or 0 | Procedural causal reward (`:968`) |
| Contract step | 15 | 17 |
| Count on GOAL_OK | Exactly one | Zero or one on the final pair |
| Bootstrap requirement | None | None |

- The main TD write is the one AC9 counts. The commit write is separate and not counted. `dampQ` is not a TD write.
- Source trace: `P:4173` and `P:4354` are `if/else` alternatives, so only one runs. On the pinned configuration the `else` branch is not expected on attempts, under the stated static assumptions.
- Source trace: the commit write is conditional, because sealing can return null. It also writes earlier pairs in the episode; AC9 does not count those.
- Source trace: `updateQ` has no terminal flag. The commit path passes `k(g)` as `S′`.
- On the current source, a commit write entering `g` can include a bootstrap contribution if a Q entry with state `k(g)` exists. T4 alone does not exclude this. How T3 is met stays [OPEN-T3].
- Neither write is removed. Keeping both for now follows Purpose A's hold on existing writers. It is not a ruling that both are correct, and [OPEN-DoubleGoal] stays open. Ruling A (Section 13) confirms this hold.

Reading note, not ruled: in CL-A, "sealing" refers to `_sealBuffer`, not `sealCurrentEpisode`.

**CL-B. Sealing in autonomous sessions (PROVISIONAL APPROVAL, DB; scope per DB-Scope (b)).** Any seal, for any seal reason, is an episode-management operation only. It defines no transition semantics, terminal status or reward.

Current source: the context episode stays empty because `episodeRecordNode` has no caller, so `sealCurrentEpisode` exits early. If the context episode held at least 2 nodes, the function would reach the bridge into `recordAutonomousSuccess` for any seal reason. This is a source-trace observation, not a guarantee.

Permitted bookkeeping, as a closed list:
(a) On the outgoing context episode: `sealed`, `endTime`, `duration`, `sealReason`, `contextTag`.
(b) Replacing the context episode with a new empty one, including one `generateEpisodeId` call, which consumes one sample from the cognitive stream.
(c) If the outgoing episode held at least 2 nodes: appending one copy to `episodeVault`, and evicting the oldest entry when the existing limit is exceeded.

Neither the context episode nor `episodeVault` may feed learning, stored episodes, scoring, reward, decisions or commits.

D16 stays governed by D16. A seal neither creates, suppresses nor alters an outcome record.

Forbidden because of any seal, by any route, whether or not the context episode is populated:
(1) no item in the bridge-path inventory may change;
(2) no reward value, main TD write, verdict, end status or commit count may change;
(3) the seal may consume no RNG sample beyond permitted item (b).

Bridge-path inventory: `transitions`; `Q`; `rewards`; `provenanceLog`; `momentumMemory`; neuron embeddings; `semanticStrength`; `pathSuccesses`; `confidenceMap`; `episodicStore`; `_episodesStoredTotal`; `_episodesSinceConsolidation`; `consolidationRegistry`; `stableMemory`; `semanticEdges`; `conceptSchemas`; `schemas`; `_bonusCache`; `_lastMotifs`; `_lastRebuild`. This inventory is provisionally supported for the pinned tree by reported line-level source trace, not by runtime evidence.

Scope of coverage: the bridge-path inventory defines what AC38(a) observes. It does not define what CL-B permits. CL-B's prohibitions apply to any effect of a seal on learning, reward, trust, stored episodes, commits or decisions, whether or not the affected store is listed. Only CL-B's closed bookkeeping list is permitted. AC38's limit to the inventory concerns verification coverage only, and it permits no unlisted effect. When AC38 is applied to a changed tree, the inventory must first be re-derived.

**CL-C. First start and cap reset (ACCEPTED DECISION).** First start runs only when the call has not already established a position. A cap reset may draw a new start and proceed to a fresh decision in the same call, and it causes no duplicate start draw. Start-stream ownership stays under D15.

**CL-D. D16 outcome record (ACCEPTED DECISION).** The D16 outcome record contains verdict data, but it is append-only, agent-unreadable instrumentation only. It is outside the mechanism boundary's "failure-evidence store". It must not become a decision input, scoring term or reward path. Runtime immutability and unreadability still require future verification.

## 7. Acceptance criteria (APPROVED WORDING, D18; every criterion is an UNRUN CRITERION)

This approves contract wording only. Adoption does not mean every criterion is executable. AC23 and AC38 are not executable at present. No criterion has been run or passed.

The "Text" column is the wording covered by D18. AC38's text is set out below; it comes from the DB ruling and has no Review Copy 2 source.

The "Type" column is CARRIED FORWARD from Review Copy 2, except AC38's entry, which has no Review Copy 2 source.

The "Note" column is not wholly carried forward. The notes for AC1, AC5, AC6, AC7, AC8, AC9, AC10, AC12, AC16, AC19, AC20, AC23, AC26, AC33, AC34, AC35, AC36 and AC37 were edited after Review Copy 2. AC38's note has no Review Copy 2 source. The remaining notes are CARRIED FORWARD. No note is a ruling.

| ID | Text | Type | Note |
|---|---|---|---|
| AC1 | The verdict precedes every outcome-derived write | U | None |
| AC2 | One verdict per attempt, goal edges included; zero on every other event | U | None |
| AC3 | Verdict reproduces from the declared stream | U | D15 |
| AC4 | Forced goal failure: no reset, reward, commit or goal count | U | None |
| AC5 | Forced goal success: exactly one reset and exactly one commit operation. The commit operation may store no episode if existing seal gates reject storage. The commit operation must not execute twice. | U | See D18 clarification |
| AC6 | After a goal reset, no further attempt in that call. After a cap reset, the same call may proceed to a fresh decision. In both cases the next attempt needs a fresh decision | U | None |
| AC7 | Non-fresh call: zero attempts, verdicts, and transition passes; no traversal; row logged. Operations named in C4 and C5 are excluded | U | None |
| AC8 | Every attempt records `S`, `S′`; every main TD write uses `S`; return moves are learned on EDGE_OK | U | None |
| AC9 | One main TD write per EDGE_OK or GOAL_OK. Commit writes are not counted | U | None |
| AC10 | On GOAL_OK, the main TD write and any commit write entering `g` have no bootstrap term | U | [OPEN-T3] neutral |
| AC11 | Cap: no terminal write, one new start | U | CL-C |
| AC12 | On EDGE_SLIP and GOAL_SLIP, no TD or other Q write is derived from the slip. Scheduled maintenance may still change Q | U | None |
| AC13 | Attempts equal attempted edges, successes equal true verdicts, one caller | U | D10 |
| AC14 | Edge with 3 of 10 forced successes gives `s=3`, `a=10`, trust 1/3 | U | D10 |
| AC15 | Gate paths: `S,a,b,goal`=0; `S,a,b,c,goal`=12; `a,b,a,b,a,b,goal`=0; a slipped target does not count | U | D13 |
| AC16 | PE runs only after verdict; after a slip no pending expectation reaches a different transition | U | D9 assumption |
| AC17 | Outcome record hash unchanged after N later ticks; frozen record rejects writes in test | U | Test only; no production freeze |
| AC18 | Every stored episode transition is realized and a graph edge | U | Future check |
| AC19 | A capped episode stores no autonomous-success episode | U | Independent of AC5 and AC38 |
| AC20 | Start stream checks; first-call attempts follow Part D | U | None |
| AC21 | Non-fresh calls count as steps; verdicts ≤ fresh decisions ≤ steps | R | [OPEN-Budget] |
| AC22 | Same seed and fixture give identical logs, clock excluded | R | Needs deterministic replay cooldown |
| AC23 | Guards-off parity and mutant suite | S, U, R | Parity target OPEN; not executable. Candidate and gaps: Section 13, Ruling C and Section 14.1 |
| AC24 | Every attempt maps to one same-call decision; each decision maps to at most one attempt | U | None |
| AC25 | Slip on call t, replay on t+1: no attempt on t+1; edge attempt index unchanged | U | None |
| AC26 | Success on call t, replay on t+1: the environment is not called, and no transition pass occurs for call t's move. Replay training and scheduled maintenance may still change Q | U | None |
| AC27 | Goal reset, then replay at a start adjacent to the goal: no attempt, no goal entry | U | None |
| AC28 | Reset lands on old origin, non-fresh call: no attempt | U | None |
| AC29 | Prediction call with no step-0 write: no attempt | U | Forced fixture on pinned tree |
| AC30 | Slip, then a fresh decision on the same edge: permitted, counted as a new attempt | U | None |
| AC31 | Replay changes neither position nor environment counters | U | None |
| AC32 | Reasoning written outside the current call is not fresh | U | [OPEN-FreshMech] neutral |
| AC33 | No new agent-readable store, and no new reader, scoring term, weight, reward branch or oracle access. The D16 outcome record is instrumentation and is unreadable by agent code | S | None |
| AC34 | No PE evaluation occurs on EDGE_SLIP or GOAL_SLIP. The ordering of PE evaluation relative to the environment verdict for other attempts remains governed by the separately approved transition-order contract | U | None |
| AC35 | EDGE_SLIP and GOAL_SLIP rows record reward `none`. No reward consumer receives a `rewardSignal` value for that attempt | U | None |
| AC36 | No agent decision receives a D5 map-oracle output | S, R | None |
| AC37 | On a replay-branch call, the replay pipeline performs only the operations specifically permitted by C4. C5 operations and `updateBehavior` are outside this check | U | None |
| AC38 | See below | U, R | Executability OPEN; not executable. See also Section 13, Ruling D and Section 14.5 |

Type: S static, U unit or fixture, R runtime integration.

AC39 to AC48 are adopted by D-041 and set out in Section 17.8. They are UNRUN CRITERIA.

### AC38 (PROVISIONAL APPROVAL, DB; adopted by D18; UNRUN CRITERION)

For each seal reason in the matrix, run seeded paired fixtures from an equivalent initial state, differing only in that one fixture's context episode holds at least 2 nodes. Each fixture must confirm it is seeded, because `liveRng` falls back to `Math.random()` when unseeded.

(a) Write journal. In both fixtures, from seal entry to seal return, no write reaches any item in the bridge-path inventory. A write is any mutation: a Map, Set or array operation, a field write on a stored object, or an assignment to a module-level variable. A write counts even if it stores the same value or is later overwritten or restored.

(b) Stream delta. In both fixtures, across that same window, the cognitive stream advances by exactly 1 sample, and all environment and visual streams advance by 0.

(c) Final state. By the end of that call, the two fixtures match on the bridge-path inventory, the module-state digest and all stream positions. Only CL-B's closed bookkeeping list may differ. The module-state digest is a secondary final-state check only. It does not establish that a write never occurred, and it does not extend the journal's coverage.

(d) Seal boundary, all reasons. In both fixtures, the outcome-record store is identical at seal entry and seal return, whether or not it already holds records.

(e) Enclosing event, cap and terminal goal only. The existing D16 requirement holds in each fixture for that event, and record content is identical across the pair.

Matrix: `tick_cap`, `goal_reached`, `context_shift`, `topic_switch`, `manual`.

Inventory precondition. Before AC38 is executed, the bridge-path inventory must be re-derived by line-level trace of the tree under test, and every new store or counter must be added. AC38 makes no claim about any store outside that inventory. That limit concerns verification coverage only and permits no unlisted effect. Root-tree coverage is not required unless the governing baseline changes. If it changes, the inventory must be re-derived before AC38 is applied.

Fixture equivalence. Both fixtures must match on tree, seed, world, hooks, fixed clock, stores, stream positions, step count, position, `recentMemory`, expectation, `lastDecision`, `lastReasoning`, working memory and context window. A digest must match before population, and afterward only the context episode's `nodes` and `labels` may differ.

Test access. Test-only access modifies only those two fields, makes no draw, reads no clock, adds no production reader, writer or decision path, preserves AC33, and avoids `episodeRecordNode`. The exact mechanism is an implementation-review item.

Required mutants under DB (PROVISIONAL APPROVAL):

Must fail AC38:
- Bridge active with populated context, one per seal reason.
- Seal writes Q, an embedding or schema cache, then restores it.
- Forbidden write by a route other than `recordAutonomousSuccess`.
- Extra cognitive sample in both fixtures.
- Environment or visual sample during a seal.
- Seal creates, suppresses or alters an outcome record.
- Seal alters a pre-existing record on a non-terminal reason.
- Outcome record depends on context population.
- Required D16 record missing in both fixtures.
- Bookkeeping exceeds the closed list.
- `episodeVault` entry feeds a stored episode.

Must fail AC5: GOAL_OK commit removed or doubled in both fixtures.

Must fail AC19: capped episode stored in both fixtures.

AC5 and AC19 stay independent of AC38 and of each other. AC38 does not substitute for either.

Recorded verification limitation. AC38 executability is OPEN. No complete write-observation mechanism has been established. AC38(a)'s coverage must not be narrowed to ease implementation. If the later feasibility review cannot meet it, the coverage boundary returns to the Director for a ruling. No test, experiment or runtime check has been run, and no claim of complete runtime verification or test success is authorized. Section 13, Ruling D lists the evidence a future authorized feasibility study must supply.

### General mutants (CARRIED FORWARD, NOT SEPARATELY RULED)

These are not approved acceptance criteria:

Carried retry allowed; origin check instead of freshness; reset clearing only; stale self-pair reaching the environment; replay moving the agent; restored goal skip; lagged `S`; pre-verdict write; terminal bootstrap.

## 8. Known source nonconformance (SOURCE TRACE, pinned tree; not a ruling and not runtime evidence)

| Item | Current source | Contract requirement |
|---|---|---|
| Learning order | Section runs before the verdict (`P:3967-4970`, `P:5024-5027`) | Verdict first |
| Goal edges | No draw on goal attempts (`P:4999-5001`, `P:5025`) | One verdict |
| State key | Writes use `agentLast`; reads use current position (`P:4173-4181`, `P:1738`, `P:1928`) | `S=k(u)` |
| Goal bootstrap | Main write passes the pre-move position as `nextState` (`P:4177`) | No bootstrap |
| Carried reasoning | Can reach attempt and section (`P:2770`, `P:3955`) | Fresh only; no transition pass |
| PE timing | Pre-verdict (`P:4133`) | After verdict, realized moves only |
| Memory | Intended node pushed pre-verdict (`P:4490`, `P:4502`) | Realized nodes only |
| Trust writers | `P:4484`, `P:4681`, `render/episodeManager.js:1092` | One verdict-bound writer |
| Goal coverage | Hook credit and record skip goal attempts (`P:5048`, `P:5065`) | Covered |
| Outcome record | Not present | D16 instrumentation |
| Seal bridge | A populated context episode would reach the bridge. This is a source-based inference, not a runtime result | Forbidden by CL-B |

Consistent by source trace, not by runtime observation: a false verdict does not move the agent (`P:5069-5070`); the cap lets step 150 run (`P:3274`, `P:3303`); a cap reset causes no duplicate start draw (`P:3400`).

## 9. Future verification requirements (CARRIED FORWARD except as noted; not executed; not authorized)

D17b's requirement for eventual implementation verification is a Director ruling. The methods below were not separately ruled.

The table is CARRIED FORWARD from Review Copy 2, except the CL-B row. That row was changed from "Cap and goal seals do not reach the bridge" with method "Static audit, fixture" to "AC38, once executable" with method "As specified in AC38".

| Claim | Evidence required | Method |
|---|---|---|
| O1 order | Verdict precedes every outcome-derived write | Static audit, fixture, integration |
| O2, R2 | `S′=k(u)` and agent stays on forced slips | Fixture |
| R3, F-1 | Non-fresh calls: no attempt or transition pass | Fixture, mutants |
| D3, D4, D8 | Forced slip: reward `none`, no PE, no slip-derived Q write | Fixture, spy |
| D9 | Next fresh decision overwrites the expectation | Fixture; assumption check |
| D10 | Trust counts match verdicts, one writer | Fixture, spy |
| D11, D5 | Record covers goal attempts; D5 block stays armed; no decision reader reachable | Static audit, integration |
| D13 | Gate path table | Fixture |
| D15 | Verdicts reconstruct from streams | Fixture, log reconstruction |
| D16, CL-D | Record immutable and unreadable; no decision, scoring or reward path; episodes realized only | Static audit, fixture |
| CL-A | One main TD write; commit write separately identified; no bootstrap on either | Fixture, spy |
| CL-B | AC38, once executable | As specified in AC38 |
| CL-C | Cap call makes one start draw and can proceed to a fresh decision | Fixture |
| T8 | Step-150 goal and slip cases | Fixture |
| REFUSED | Forced non-edge consumes a step | Fixture |
| D17b | Arm, credit and pin values recorded and independently tested | Static audit, integration |
| Baseline identity | Hash match on a separately authorized rebuild | Static check |
| Any learning or cognition claim | New preregistered study on fresh worlds | Scientific experiment; not authorized |

Feasibility question for a later authorized review: can a test-only method observe every AC38(a) write during the seal window, including Map, Set and array mutations, in-place field writes on stored objects and neurons, and module-private state, without adding a production reader, writer or decision path, and without changing seal behaviour or RNG consumption?

## 10. Accepted losses and prohibited claims (CARRIED FORWARD, consistent with the rulings above)

Accepted losses:
- C10 cadence losses.
- No direct Q failure evidence under L0.
- No PE on slips, including removal of evaluations on later-slipped attempts.
- Suppression of legacy trust writers.
- The traversal record has no reachable decision reader while D5's block holds.

All effects are unmeasured. No evidence exists for harmlessness, neutrality or benefit.

Prohibited without new evidence:
- Any claim that TC-2 improves learning, reliability, transfer, planning or mechanism performance.
- Any claim that MFW is cognitive.
- Any claim that TC-2 rescues, repairs, reproduces or validates ACQ-1.
- Any claim that behaviour is preserved, or that a loss is harmless.
- Any claim that replay is safe because its authority is restricted.
- Any claim that root behaves as the pinned tree does.

## 11. Open limitations (OPEN LIMITATION)

Open markers:
- [OPEN-T3]: terminal-bootstrap mechanism. DT3 is DEFER. Under Ruling B (Section 13), M2 is the preferred provisional design direction. M2 is not approved for implementation, and M1 is not adopted. Closure requires complete coverage of how a Q entry for `k(g)` could be created or become available, including replay, maintenance, persistence and restoration, other writers, and goal identity and lifecycle. Section 14.3 records that coverage at source level for the pinned tree. That does not close this marker, and the reasons it stays open are stated there.
- [OPEN-DoubleGoal]: whether the main TD write and the commit write should both persist on GOAL_OK, and which of them should own the goal edge. Neither is removed meanwhile, and neither CL-A nor Ruling A (Section 13) decides this.
- [OPEN-FreshMech]: how freshness is determined. Under Ruling E (Section 13) and SC-E (Section 14.5), `lastReasoning` object identity is the leading candidate. It is not approved.
- [OPEN-Budget]: budget unit and attempts-per-step asymmetry. See Ruling F (Section 13). SC-B (Section 14.2) sets study steps as the primary unit and records what remains unresolved.
- [OPEN-A4]: categories of operations D12b does not name. Ruling F (Section 13) lists the gap. Section 14.4 holds a proposed classification, which is not ruled.

Recorded unresolved:
- AC38 executability, including the test-access and stream-delta mechanisms.
- AC23's parity target, including what code the guard switch controls (Section 14.1).
- The gate objective.
- Whether unrealized nodes reach stored episodes in the current implementation.
- Root behaviour and root-tree inventory.
- Non-fresh prediction calls on any other tree.
- Pinned baseline reproducibility.

Markers provisionally ruled, subject to final contract review:

| Marker | Ruling |
|---|---|
| [OPEN-FallbackBranch] | D1 |
| [OPEN-SlipReward] | D3 |
| [OPEN-PEBoundary] | D4 |
| [OPEN-Oracle] | D5 |
| [OPEN-Base] | D6, for the pinned baseline; root stays outstanding |
| [OPEN-Carrier] | D7 |
| [OPEN-L] | D8 |
| [OPEN-PE] | D9 |
| [OPEN-Credit] | D10, D11 |
| [OPEN-Gate] | D13 |
| [OPEN-A5] | D14 |
| [OPEN-RNG] | D15 |
| [OPEN-Seal] | D16 |

## 12. What this record does not do

- It does not freeze the contract.
- It does not change any ACQ-1 record, frozen file, hash, raw record or Git history.
- It authorizes no new work.

## 13. Reconciliation rulings A to F (DIRECTOR RULING, provisional; D-037)

Rulings A to F come from the Research Director's TC-2 end-to-end contract directive. This section is their first repository copy.

The paragraphs marked "Ruling" state the Director's rulings. Everything else in this section is reconciliation wording: it records how the rulings fit this contract, and it is not a further ruling. "Source trace" lines use the pinned tree unless stated, and they are not runtime evidence.

This section changes no text of T1 to T9, the Part D table or any acceptance criterion. It closes no open marker. It authorizes no implementation, test, run, instrumentation or feasibility study. No criterion has been run or passed.

Later update: Section 14 (D-038) updates this section where the two differ. This applies to the "Guards" and "Mutant suite" rows of Ruling C, and to Ruling F's statements that no ruling sets the budget unit. D-037 records the state at its own date.

### Ruling A: double-goal writes

Ruling. Both existing Q-write paths stay for now. The main TD write and the commit write stay distinct operations. The final-pair commit write on live GOAL_OK is not suppressed.

- This preserves existing behaviour. It does not validate it. No claim is made that keeping both writes is optimal or cognitively better, and the impact is unmeasured.
- The commit operation stays distinct from the individual writes inside its pipeline. AC5 counts the operation. AC9 counts the main TD write and does not count commit writes. T3 and AC10 apply to each GOAL_OK write entering `g`.
- Goal-edge ownership stays open under [OPEN-DoubleGoal].

Disclosure, inferred from source trace: D13's gate does not gate the commit pipeline. The gate is read before the memory push (`P:4053-4073`, `P:4502`). The commit runs after the push (`P:4596`) and appends the goal node (`render/episodeManager.js:298-300`). So a GOAL_OK with gate reward 0, such as AC15's path `S,a,b,goal`, can still pass the seal gates and reach commit-pipeline writes to `transitions`, Q and `rewards`. Ruling A preserves this. It is disclosed here, not validated.

### Ruling B: terminal handling

Ruling. M2 is the preferred provisional design for T3. M2 means an explicit terminal input that defaults to `false`, rather than deriving terminal status from incidental Q-table state. This is a design direction, not implementation authorization.

M1, the entry invariant under which the contract states that no `k(g)` entry exists, is not adopted. No runtime code changes under this ruling.

Boundaries:
- T4 stays a separate invariant. M2 does not replace it.
- M2 does not by itself prove that no Q write reads a bootstrap value from the goal state. It acts only on writes that receive the input.
- Because Ruling A keeps both writes, M2 would have to reach both the main TD write and any commit write entering `g`. Reaching only one would leave T3 unmet.
- Replay behaviour must be preserved. Replay writes stay under C4 and are not terminal events (T3).

Coverage review. M2 and the [OPEN-T3] coverage requirement can stand together. M2 is a candidate means for the two GOAL_OK writes. The coverage requirement is the closure condition for the marker, and it also bears on T4 and on any write that M2 does not touch. The two do not conflict, so the closure rule in Section 11 is not amended. [OPEN-T3] stays open because that coverage is not complete and no mechanism is implemented or verified.

Identifying a live success, by source trace:
- `terminal: true` does not identify one. The field is set on the final pair for every source, replay included (`render/episodeManager.js:771`), and no reader of it was found. Not every `terminal: true` final pair belongs to a live autonomous success.
- `source === "autonomous_success"` (`render/episodeManager.js:322`) is not enough alone. `sealCurrentEpisode`'s bridge (`P:927`) calls the same function. CL-B forbids that effect, and the route is inert on current source because the context episode stays empty.
- Replay episodes must stay distinguishable from live GOAL_OK handling. The exact identifier is not selected, and it is an item for implementation review.

### Ruling C: AC23 parity

Ruling. The proposed parity target is a fresh, pinned-baseline comparison of a fresh baseline run and a guards-enabled run, with the same driver, fixed clock, seeds, development worlds and Hook State P. Byte-identical logs are the candidate parity criterion. Static reverse-identity checks complement that comparison.

AC23's wording stays unchanged. Its parity target stays OPEN and AC23 stays not executable. Parity has not been demonstrated, and neither run has been executed. ACQ-era logs are not parity evidence.

| Must be defined before AC23 can execute | Known today | Gap |
|---|---|---|
| Logs and artifacts | The ACQ-1 driver's record fields exist (`experiments/coga/acq1/session_mfw.mjs:117-127`), including `log`, `goalResets`, `envCounters`, `guard`, `mapAudit` and `outcome` | No TC-2 artifact list exists. Whole-record identity cannot hold across different trees, because the record carries `mainSha256` and `wallMs` |
| Driver | Two COG-A drivers exist and they differ (`experiments/coga/session_mfw.mjs`, `experiments/coga/acq1/session_mfw.mjs`) | No driver is selected. Both carry COG-A study conditions |
| Pinned baseline | Section 1 gives the content identity | Pinned baseline reproducibility is not verified. Section 9 requires a hash match on a separately authorized rebuild |
| Configuration | Hook State P and the fixed clock are `experiments/coga/config.mjs:32-33` | Hook State P has `creditMode: 'off'`, while D17b sets credit on as defined by D10. Parity under Hook State P does not test the D17b configuration. Step count is not set |
| Seeds and worlds | Development territory is accepted-stream indices 0 to 29 (`experiments/coga/acq1/DESIGN.md:135`) | No world or seed list is selected |
| "Guards" | AC23 says "Guards-off". Ruling C says "guards-enabled" | The term is undefined, and the two phrases are not reconciled here. The existing legality guard is on in the ACQ-1 driver's variant P (`experiments/coga/acq1/session_mfw.mjs:8`). Inferred: if TC-2 behaviour were active, byte identity would not be expected, because O1 reorders learning. The Director must define which state each run uses |
| Mutant suite | AC38's section lists mutants with a must-fail target. Section 7 lists nine general mutants, carried forward and not ruled | AC23 names no suite. Membership is undefined. The general mutants have no stated target criterion or expected result |
| Nondeterminism | AC22 excludes the clock and needs deterministic replay cooldown. `wallMs` is environment-dependent | No rule says which fields are excluded, normalized or compared |
| Static reverse-identity checks | CREDIT-1's S-2 is a precedent for the method (`experiments/credit1/DESIGN.md:207`) | No TC-2 patch exists, so no mandatory check can be listed. Whether reverse identity can hold for reordered code is unknown |
| Evidence and pass/fail | Any byte difference would fail the candidate criterion | Required evidence files, the pass rule for each mutant, and the handling of a partial failure are undefined |

### Ruling D: AC38 method

Ruling. The proposed executed-code-closure method is not approved yet. AC38 stays open.

The contract keeps requiring evidence that the mechanism detects every write class:
- transient writes;
- same-value writes;
- writes later overwritten or restored;
- collection mutations;
- array index and length mutations;
- object-field changes;
- module-private assignments;
- any other class AC38(a) already requires.

Final-state digests alone are insufficient. This contract does not claim that V8 block coverage, source inspection, allowlists, prototype instrumentation, or any combination of them gives complete write observation.

Evidence a future authorized feasibility study must supply:
- A positive control for each write class, showing detection of a planted write, including one restored before seal return.
- A no-write control on the same window.
- A coverage statement for every bridge-path inventory item, naming any item the method cannot observe. Source trace: the inventory includes module-private counters and caches, such as `_episodesStoredTotal` and `_lastRebuild`, that test code outside the module cannot reach directly.
- Detection of every "must fail AC38" mutant.
- A demonstration that the method adds no production reader, writer or decision path, preserves AC33, and leaves seal behaviour and RNG consumption unchanged.

If the study cannot supply this, the existing verification limitation applies: coverage is not narrowed, and the boundary returns to the Director. No feasibility spike, instrumentation or runtime patch is authorized here.

### Ruling E: freshness

Ruling. Object-identity comparison for `lastReasoning` stays the leading candidate, subject to source-backed contract wording. No persistent flag is added, and runtime behaviour does not change. [OPEN-FreshMech] stays open.

Observation boundary: the `lastReasoning` reference, read at the start of one `runAgent` call and again after the prediction or replay step of that same call. Under the candidate, a difference would mean a fresh decision. Both reads fall inside one synchronous call.

What a changed reference is intended to prove, by source trace on the pinned tree: `P:2770` ran during this call. `P:2770` is the only assignment to `lastReasoning`, and `render/*.js` does not reference it. The assignment sits inside `if (step === 0)` in `runPrediction` (`P:2769`), it creates a new object literal on each write, and no field of that object is assigned, directly or through the reader alias at `P:3642`. That matches Section 5's definition of a fresh decision. The harness accessor keeps the same reference (`experiments/m7/run.js:233-240`).

What it cannot prove:
- That the decision is legal, correct or useful.
- Anything about a changed tree. A second writer, a reused object or an in-place field write would break this reading.
- Runtime behaviour. This reading comes from source trace only.

Evidence still needed: a re-derived writer list for the tree under test; AC7, AC25 to AC29 and AC32 on that tree; and detection of the general mutants "Carried retry allowed" and "Origin check instead of freshness".

### Ruling F: budget and A4

Ruling. [OPEN-Budget] and [OPEN-A4] stay open unless existing repository evidence fully resolves them. The study's step budget stays distinct from actual `runAgent` attempts or other execution exposure. Neither issue authorizes runtime work.

Review result: existing repository evidence does not fully resolve either marker. Both stay open.

Budget. These measures stay distinct: the study's step budget, `runAgent` calls, fresh decisions, attempts, verdicts and any other execution exposure. E-2 defines a step as one `runAgent` call, and T7 says the cap counts steps. No ruling says which count governs a study's budget.

The five-call discrepancy. The reported figures are harness counters from one git-ignored development record, `experiments/coga/data/acq-dev-P12k/MFWP-study0-E1.json`: `steps` 12000, `ticksExecuted` 12000, `calls` 12005, `loopFires` 2400. They identify the discrepancy only. They are not evidence for any contract requirement, and no ACQ-1 result is used.

Source trace, with `experiments/m7/run.js` and `benchmarks/harness/headlessShim.js` byte-identical in root and the pinned tree:
- The driver uses `tickUnit: 'step'` (`experiments/coga/acq1/session_mfw.mjs:114`).
- `pressSpace` runs before the tick loop (`experiments/m7/run.js:248`). The Space handler calls `runAgentLoop()` directly (`P:5382`), which makes 5 `runAgent` calls (`P:5317-5319`).
- The tick loop then runs `Math.ceil(12000 / 5)` = 2400 loops of 5 calls (`experiments/m7/run.js:115`, `benchmarks/harness/headlessShim.js:144`).
- `ticksExecuted` counts only those loops (`experiments/m7/run.js:256`), and `loopFires` counts only timer fires (`experiments/credit1/clock_preload.mjs:69-79`).
- So 5 + 12,000 = 12,005.

Status: the repository's source accounts for the arithmetic. This has not been observed call by call at runtime. It does not settle the budget: under E-2 that session ran 12,005 steps against a requested 12,000, and whether the first 5 calls count against a budget is unruled. [OPEN-Budget] stays open.

A4. D12b names `lastDecision`, `lastReasoning`, `generateExpectation` and `updateBehavior` as decision-time, decays as scheduled maintenance, and the replay pipeline as replay training. It names nothing else. The remaining gap is:
- C5(a) step accounting, C5(b) the branch draw, C5(c) first start, C5(d) cap handling and C5(f) display output and instrumentation rows. C5 says these do not meet C2. It places none of them in a D12b category.
- Any C5(e) scheduled operation that is not a decay.
- Loop-level operations at `P:5222-5258` that are not decays. Source trace: that range includes a `liveRng` draw (`P:5238`), `rebuildSchemas` (`P:5254`) and `rebuildAdjacencyMemory` (`P:5258`). C5 states that its ruling does not reach them.
- Any operation C5 does not name and that does not meet C2.
- Candidate-evaluation writes on a prediction call with no fresh decision, on another tree (C6).

This list records the gap. It classifies nothing.

## 14. Source closure (DIRECTOR RULING, provisional; D-038)

SC-A to SC-E come from the Research Director's TC-2 source-closure directive. That directive calls them Rulings A to E. This record calls them SC-A to SC-E so they are not confused with Section 13's Rulings A to F. This section is their first repository copy.

The paragraphs marked "Ruling" state the Director's rulings. "Proposed" marks text that nobody has ruled on. Everything else in this section is a source finding or reconciliation wording, and it is not a further ruling.

This section changes no text of T1 to T9, the Part D table or any acceptance criterion. It closes no open marker. It authorizes no implementation, test, run, instrumentation or feasibility study. No criterion has been run or passed, and the contract is not frozen. Source coverage is not runtime verification: no application code ran for this review.

Later update: Section 16 (D-040) updates this section where the two differ. This applies to Section 14.1's guard definition and Section 14.2's open stopping rule. D-038 records the state at its own date.

Line references. `P:n` is line n of the pinned `main.js`. The same line in the repository's `main.js` is n minus the offset below. `render/*.js` has the same line numbers in both trees, apart from `render/planning.js`, which this section does not cite.

| `P:n` | Offset |
|---|---|
| Up to 1153 | 0 |
| 1155 to 1278 | 1 |
| 1280 to 1319 | 2 |
| 1321 to 1791 | 3 |
| 1793 to 2127 | 4 |
| 2129 to 3645 | 5 |
| 3647 to 4866 | 6 |
| 4868 and above | 7 |

The hook lines `P:1154`, `P:1279`, `P:1320`, `P:1792`, `P:2128`, `P:3646` and `P:4867` exist only in the pinned tree.

### 14.1 SC-A: AC23 guard parity

Ruling. The parity comparison is a baseline run with guards off against a candidate run with guards enabled. All other relevant inputs and configuration are identical, including driver, fixed clock, seeds, development worlds and Hook State P. The guard setting is the intended comparison variable, and no other configuration difference may contaminate the comparison. Parity under Hook State P does not validate the D17b credit-on configuration. Guard parity is not proof that the contract is correct.

AC23's wording stays unchanged. AC23 stays open and not executable. No parity run is authorized, none has run, and parity has not been demonstrated.

**Parity strata.**

| Stratum | Baseline run | Candidate run | Status |
|---|---|---|---|
| P | Guards off, Hook State P | Guards enabled, Hook State P | The SC-A target. Not executable |
| D17b, conditional | Guards off, credit as defined by D10 | Guards enabled, credit as defined by D10 | Applies only if the Director places D17b's configuration within AC23's scope. Neither run can be specified today. It has not run or passed |

Neither stratum stands in for the other. Source trace on why no hook state supplies D10 credit:
- Hook State P has `creditMode: 'off'` (`experiments/coga/config.mjs:32`), so `__M7_CREDIT__` stays unset (`experiments/m7/run.js:151`) and the legacy writers `P:4484` and `P:4681` stay live.
- `creditMode: 'on'` is not D10 either. Its credit site skips goal attempts (`P:5048`), and `render/episodeManager.js:1092` still runs.

**Open conflict, recorded and not resolved.** SC-A fixes the guard state of each run. It does not name the code that the guard switch controls. That choice decides whether Ruling C's byte-identity criterion can hold:

| Reading of "guards" | Evidence | Consequence for byte identity |
|---|---|---|
| TC-2 behaviour behind a switch in a derived tree | AC23's origin: an early design draft read "Guards off: parity with `acq-dev-P12k` logs" | Inferred: not expected with guards enabled, because O1, R3, D8 and D10 change behaviour. The testable claim would be guards-off parity with the baseline |
| The existing legality guard `__GFGUARD__` (`P:1792`, `P:3646`) | It is on in the ACQ-1 driver (`experiments/coga/acq1/session_mfw.mjs:103-105`) | Source does not support it: the guard masks candidates and blocks moves, so turning it on can change behaviour |
| Checks with no behavioural effect | No such code exists | It could hold, but it would not test any TC-2 behaviour |

Only AC23's expected result stops here. The precise missing decision is which code the guard switch controls, and whether byte identity applies to the guards-enabled run.

**Inputs that must match, by source.**

| Input | Source | Remaining gap |
|---|---|---|
| Tree | Section 1 | No guards-enabled tree exists. If the runs use two trees, `mainSha256` differs by design |
| Driver | The ACQ-1 driver refuses any tree but the pinned one (`experiments/coga/acq1/session_mfw.mjs:76-77`) and sets `GUARD.on` to true (`:103`) | It cannot serve without a fork. No TC-2 driver exists |
| Fixed clock | `CLOCK`, `experiments/coga/config.mjs:33`, with `experiments/credit1/clock_preload.mjs` | None for the definition |
| Hook state | `experiments/coga/config.mjs:32` | Stratum P only |
| Agent seed | Derived from world id, agent id and environment (`experiments/coga/acq1/session_mfw.mjs:94`) | The agent id embeds the variant name, so both runs must share one agent id |
| Worlds | `DEV_INDICES` 0 to 29, `experiments/coga/config.mjs:19` | No world list or count is selected |
| Step count | `steps`, with `tickUnit: 'step'` | Not set |
| Harness switches | `__M7_EPISODE_CAP__` and `__M7_REPLAY_ONCE__` are unconditional (`experiments/m7/run.js:189`, `:207`) | None for the definition |
| Process and store | One process per session; cold store asserted (`experiments/m7/run.js:223-231`) | None for the definition |

**AC23 definition rows.**

| Row | Status | Proposed or known content | Missing |
|---|---|---|---|
| Logs and artifacts | Proposed | Compare `log`, `goalResets`, `envCounters`, `mapAudit`, `outcome`, `clock.loopFires`, `clock.violations` and `provenance.fingerprint`. The fingerprint hashes run artifacts including `qEntries`, `qSum` and draw counts (`experiments/m7/run.js:278-289`, `:352`). Exclude `wallMs` and `label` | Director approval. `log` holds attempts only (`experiments/coga/acq1/session_mfw.mjs:127`), so no driver writes the per-call rows that Section 6 requires. The handling of `guard` counters depends on the open conflict |
| Nondeterminism | Partly known | Clock: fixed by the preload. Replay cooldown: deterministic through `__M7_REPLAY_ONCE__` (`render/episodeManager.js:505-507`). `wallMs`: environment-dependent | A rule listing excluded, normalized and compared fields, and whether the Node version must match |
| Static reverse-identity checks | Not defined | CREDIT-1's S-2 is a precedent (`experiments/credit1/DESIGN.md:207`) | No TC-2 patch exists, so no mandatory check can be listed. Whether reverse identity can hold for reordered code is unknown |
| Evidence and pass/fail | Proposed | For each matched pair, record tree, driver and preload hashes and the compared bytes. Any byte difference in a compared field fails. A missing artifact fails | Director approval, and the rule for a partial failure |
| Mutant suite | Partly known | See below | AC23 names no suite, so membership is undefined |

| General mutant | Expected result | Origin of the target |
|---|---|---|
| Carried retry allowed | Fails AC25 | Design conversation, not ruled |
| Origin check instead of freshness | Fails AC25 and AC28 | Design conversation, not ruled |
| Reset clearing only | Fails AC25 | Design conversation, not ruled |
| Stale self-pair reaching the environment | Fails AC26 | Design conversation, not ruled |
| Replay moving the agent | Fails AC31 | Design conversation, not ruled |
| Restored goal skip | Proposed: fails AC2 | Proposed here from the AC text |
| Lagged `S` | Proposed: fails AC8 | Proposed here from the AC text |
| Pre-verdict write | Proposed: fails AC1 | Proposed here from the AC text |
| Terminal bootstrap | Proposed: fails AC10 | Proposed here from the AC text |

An early draft of AC23 also named an "extra trust writer" mutant, which is not in Section 7's list. The DB mutants keep the targets stated in Section 7.

Byte-identical logs would show only that the compared fields match. They would not show that the contract is correct, or that uncompared state matches.

### 14.2 SC-B: budget accounting

Ruling. The primary study budget unit is study steps. Actual `runAgent` attempts are recorded separately as execution exposure. All five direct calls from `runAgentLoop()` on Space are recorded in exposure accounting. They count as study steps only if they satisfy the contract's defined step boundary. [OPEN-Budget] stays open if the exact step boundary, the status of the direct calls, the call-level runtime confirmation or any other budget requirement stays unresolved. The existing development record may explain the arithmetic, but it is not automatically acceptance evidence.

Naming. In this ruling, "`runAgent` attempts" means `runAgent` calls. It does not mean Attempt as Section 5 defines it. This section calls the measure call exposure.

Step boundary, by source trace:
- E-2 and Section 5 define a step as one `runAgent` call.
- Step accounting begins at `P:3260`, the first statement of `runAgent` (`P:3254`). No exit comes before it.
- The driver counts every entry (`experiments/coga/acq1/session_mfw.mjs:98`). It stamps attempts and goal resets with `calls - 1` (`:99`, `:101`).
- The episode cap counts one per call (`P:3303`) and is armed before the first call (`experiments/m7/run.js:189`).
- `ticksExecuted` counts timer loops (`experiments/m7/run.js:256`). It is not a step count.

Finding on the direct calls. Each direct call enters `runAgent` exactly as a timer-loop call does, and reaches `P:3260` and `P:3303`. So under E-2 all five are study steps at source level, and the first has step index 0. By inference, a completed session with `tickUnit: 'step'` makes `5 + 5 × ceil(steps / 5)` calls. A session requesting 12,000 steps therefore runs 12,005 study steps under E-2, and `ticksExecuted` understates that by 5. The loop body also runs one more time than `loopFires` reports, including its RNG draws. This is source trace. Section 13's Ruling F holds the arithmetic and the record it explains.

Accounting convention:

| Measure | Meaning | Present field | Rule |
|---|---|---|---|
| Requested study steps | The budget, stated before a run | `steps` | The primary unit |
| Executed study steps | `runAgent` calls that meet E-2 | `calls` | Reported against the request. Any overrun is reported |
| Call exposure | Every `runAgent` call, direct calls included | `calls` | Recorded separately, even when equal to executed steps |
| Contract Attempts | Attempts as defined in Section 5 | `log` rows of kind EDGE (corrected by Section 15) | Never a budget unit |
| Harness ticks | Loop-based harness count | `ticksExecuted` | Never reported as steps |

One counter serves two measures today. They stay separate fields so that a later boundary change cannot pass silently. A study must state its unit before it runs and must not switch between steps and attempts.

Unresolved, so [OPEN-Budget] stays open:
- Call-level runtime confirmation has not been made. Existing development records hold totals and attempt rows, with no row for every call.
- No ruling says whether a driver must stop at the requested steps or may overrun and disclose it.
- The existing attempts-per-step asymmetry stays open.

### 14.3 SC-C: `[OPEN-T3]` route inventory

Ruling. M2 stays the preferred provisional design: an explicit terminal input that defaults to `false`. Terminal status must not be inferred from incidental Q-table state. T4 stays a separate invariant. No runtime implementation is authorized. T3 must not be claimed to pass because M2 is documented.

Meaning of `k(g)`. `Q` is the Map at `render/qlearning.js:12`, with keys of the form `state->action`. `makeStateKey(pos, goal)` returns `pos#goal` (`render/qlearning.js:40-50`). So `k(g)` is the string `g#g`, and a Q entry for `k(g)` is any key beginning `g#g->`.

Search. Every reference to `Q`, `setQ`, `updateQ`, `dampQ` and `makeStateKey` was read in `main.js`, `render/*.js`, `instrumentation/*` and `index.html`.
- `Q` is imported by `main.js` only. `render/embeddings.js` imports only `getQAny`, which reads.
- `Q` is not placed on `window` or `globalThis`.
- These files contain no `eval` or `new Function`. Their only dynamic imports are `node:fs` and `node:path` (`instrumentation/sessionRecorder.js:55-56`).
- The harness reads `Q` and does not write it (`experiments/m7/run.js:59`, `:276`).

| # | Route | Location | Effect on `k(g)` | Conditions | Relevance |
|---|---|---|---|---|---|
| 1 | Table creation | `render/qlearning.js:12` | Starts empty | Module load | Initialization |
| 2 | Restore | `P:1124`, `P:756`, `P:803`, `P:773-778` | Can create any key, `g#g` included. Keys are not filtered. Clears the table first | A stored `brain` exists at boot | Restoration |
| 3 | Save | `P:709-740`, `P:1148` | Writes nothing to `Q`. Makes entries available to route 2 | Browser timer. Inert in the harness (`benchmarks/harness/headlessShim.js:140`) | Persistence |
| 4 | Main TD write | `P:4173`, `P:4354`, through `render/qlearning.js:143` and `:126` | Creates `g#g` only if `agentLast` is the goal. Reads `k(g)` as bootstrap only if `agentCurrent` is the goal (`P:4177`) | Inside the section guard `P:3975` | Live |
| 5 | Explore write | `P:4966-4968`, `render/episodeManager.js:365`, `:893`, `:1003` | Creates `g#g` only if `prev` is the goal. Target is never the goal | Inside the section guard. Not a commit write as Section 5 defines it | Live |
| 6 | Success commit | `P:4596`, `render/episodeManager.js:284`, `:344`, `:1003` | Creates `g#g` only if the goal is a non-final node. The final pair reads `g#g` as bootstrap if an entry exists | `current === goalNeuronId` (`P:4559`), and the seal gates pass | Live success |
| 7 | Replay | `P:3483`, `render/episodeManager.js:517-525`, `:1003` | Neither creates nor reads `g#g`. `activeGoal` stays null (`:698`, `:808`), so keys are `x#0` (`render/qlearning.js:46`). Node ids are 1 to 20 | Replay branch, stored episode, cooldown | Replay |
| 8 | Manual commit | `P:5460`, `render/episodeManager.js:211`, `:241`, `:263`, `:1003` | Can create `g#g`. A buffer keeps its opening goal (`:224`), while the goal click tests the current goal (`P:5453-5455`). A goal change during a teaching pass can leave the old goal mid-path | Human clicks | Teaching |
| 9 | Seal bridge | `P:3276`, `P:4828`, `P:927`, `render/episodeManager.js:284` | Would use the context episode's last node as `activeGoal`, so it could create that node's own `k` entry | Inert on current source: `episodeRecordNode` has no caller (`render/episodicContextEngine.js:283`). CL-B forbids its effects | Forbidden route |
| 10 | Decay | `P:3390-3394` | Scales any existing entry. Creates nothing and removes nothing, so an entry is retained | Each `runAgent` call | Maintenance |
| 11 | `dampQ` | `P:4225`, `render/qlearning.js:319-335` | Lowers an existing positive entry. Creates nothing | Inside the section guard, composite error above 0.20 | Live |
| 12 | Goal wraparound prune | `P:5532`, `P:1404`, `P:1423-1429` | None. It matches the bare prefix `g->`, which no composite key has | Shift-click | Goal lifecycle |
| 13 | Wipe | `P:5356` | Removes every entry | Shift+R | Reset |
| 14 | Consolidation pass | `P:5263`, `render/longTermConsolidation.js:101-121` | None. It receives `Q` and does not touch it | `liveRng` gate `P:5262` | Maintenance |
| 15 | Goal writers | `P:820`, `P:1139`, `P:3440`, `P:4315`, `P:5368`, `P:5515` | Write no Q entry. They change which key is `k(g)`. An old `h#h` entry survives and becomes `k(g)` when the goal returns to `h` | `P:3440` and `P:4315` need `window.homeNeuronId`, written only by `P:817` and `P:5544` | Goal lifecycle |
| 16 | Position writers | `agentCurrent`: `P:3298`, `P:3409`, `P:4868`, `P:5070`, `P:5366`. `agentLast`: `P:3299`, `P:4869`, `P:4974`, `P:5367` | Write no Q entry. They decide whether routes 4 and 5 can use the goal as a state | See S0 below | Goal lifecycle |
| 17 | Readers | `P:1738`, `P:1928`, `P:2798`, `P:2815`, `P:3898`, `P:4421`, `P:5597`, `P:5665`, `render/qlearning.js:91`, `render/embeddings.js:199-200`, `:293-294`, `render/schemaMemory.js:399` | Mutate nothing. A `k(g)` entry that exists can reach scoring | Decision, display and embedding reads | Availability |

What the source proves: this list of routes and the conditions in its table. What it does not prove: that any route did or did not fire in a real session, what a stored `brain` holds, or anything about a changed tree.

**Scope S0.** The goal is set once at `P:1139`, before the loop, and is a node id of 1 or more. The `brain` store is empty at boot. The only input is one Space press. `window.homeNeuronId` stays undefined. Source trace: the harness meets these conditions (`experiments/m7/env.js:166`, `experiments/phase1_0/_driver.js:30`, `:41-44`, `experiments/m7/run.js:223-231`, `:248`), and it writes no `homeNeuronId`.

Inference from source, within S0, on the pinned tree:
1. `agentCurrent` is never the goal. `P:3298`, `P:3409` and `P:4868` exclude it, and `P:5001` with `P:5069` blocks `P:5070` whenever `next` is the goal. `P:3409` falls back to the full list only if the goal is the only node.
2. `agentLast` copies `agentCurrent` at each of its writers, so it is never the goal. Routes 4 and 5 therefore never use `g#g` as `S`, and route 4 never reads it as `S′`.
3. Candidate keys are numbers: they come from `neighbors` (`render/connections.js:120`, `:125`) and `transitions`, and `P:2594-2596` keeps semantic candidates out while a goal is set. So `P:4559` and `P:4723` match the goal. The section `P:3967-4970` has no `throw`, and its only `return` sits inside a `map` callback (`P:4577`), so nothing in it exits early. `P:4821` therefore clears `recentMemory` in the same call that pushes the goal at `P:4502`.
4. So at route 6 the goal appears once, as the final node. Labels in `neurons.json` are unique, so the id mapping at `render/episodeManager.js:303-309` cannot move another node onto the goal.
5. Routes 2, 8 and 9 and the goal changes in route 15 are excluded by S0. Route 7 uses `x#0`.

So within S0 no source route creates a `g#g` entry, and route 6's final pair finds none to read.

**Outside S0.** A `k(g)` entry can exist. Routes 2 and 8 can supply one. Route 6 can create one when the goal changes to a node still in `recentMemory`: the later success has that node mid-path. So M1's statement that no `k(g)` entry exists is not generally true of this source.

**Closure status.**

| Item | Status |
|---|---|
| Source inventory for the pinned tree | Complete, to the limit of static search. It is not runtime verification |
| T3 | Not met by the pinned tree: the main TD write passes the pre-move position as `S′` (`P:4177`, Section 8). Not claimed to pass |
| T4 | Separate from T3 and not inferred from it. Inferred from source: within S0 no route violates it, and outside S0 routes 6 and 8 can write `S=k(g)` |
| M2 | Preferred direction only. It would have to reach `P:4173` or `P:4354` and the live final pair at `render/episodeManager.js:1003`. Default `false` would leave replay, explore and manual writes unchanged |
| [OPEN-T3] | **Stays open.** No tree carries M2. The inventory must be re-derived on any tree that does. No ruling says whether TC-2 sessions are limited to S0. No runtime evidence exists |

Both existing Q-write paths stay as Ruling A left them.

### 14.4 SC-D: `[OPEN-A4]` proposed classification

Ruling. Prepare a source-backed proposal for operations D12b does not name. Do not extend D12b's scope or declare the item resolved.

Everything below is proposed. D12b is unchanged, and [OPEN-A4] stays open. D12b's classes are decision-time, scheduled maintenance and replay training. The proposal adds two classes that no ruling has created: **boundary** (step accounting, starts and resets) and **non-learning output**.

| Operation | Location | Source fact | Proposed class | Why, or why not |
|---|---|---|---|---|
| Step hook | `P:3260` | Harness telemetry. One global read, no RNG | Boundary | Writes no agent state and is not a decision or a decay |
| Episode step counter | `P:3303` | Integer counter read by the cap | Boundary | It drives the cap and makes no decision |
| Cap handling | `P:3274-3302` | Seals, clears the path window and expectation, draws a start, writes position | Boundary | It has an RNG draw and a position write, so it fits none of D12b's classes |
| First start | `P:3400-3409` | Draws a start and writes position | Boundary | Same reason |
| `recentMemory` setup | `P:3312-3314` | Creates an empty array if absent | Boundary | No learning content |
| Position bookkeeping | `P:4974` | `agentLast = agentCurrent`, on every call that reaches it. C3 and C5 do not name it | Unclassified | Under O2 `S` is bound at the decision, so its role on a changed tree is unknown |
| Branch draw | `P:3460` | One draw from the cognitive stream that selects prediction or replay | Boundary, or decision-time | It comes before any decision, yet it decides whether one exists |
| Survival goal override | `P:3431-3447` | Writes the goal if fatigue is above 80 and a home is set. C5 does not name it | Unclassified | It changes the goal and so bears on Section 14.3 |
| Decay gates | `P:3316`, `P:3330`, `P:3358`, `P:5238` | RNG draws that gate decays | Scheduled maintenance | They exist only to schedule a decay. D12b names decays, not their draws |
| Penalty pruning | `P:3344` | Deletes a penalty below 0.05 during decay | Scheduled maintenance | Part of that decay |
| `P:3316-3394` remainder | `P:3316-3394` | Each remaining operation there is a decay. Source trace found no other kind | Scheduled maintenance | D12b already names decays, so C5(e) adds no further gap |
| Schema rebuild | `P:5254` | Rebuilds `schemas` from stored episodes | Unclassified | Derived-store rebuild, not a decay |
| Adjacency rebuild | `P:5258` | Rebuilds adjacency memory from stored episodes | Unclassified | Same reason |
| Consolidation pass | `P:5262-5263` | One RNG gate, then raises stable `rewards` (`render/longTermConsolidation.js:112`) | Unclassified | It strengthens a store, so it is not a decay |
| Drive update | `P:1692` | `updateMotivationalState` writes drive state during prediction | Decision-time | It runs inside the decision, but D12b's list is specific |
| Biology update | `P:2957` | `regulateBiology` changes energy, stress and related state (`render/behavior.js:105`) | Decision-time | Same reason |
| Candidate analysis | `P:1808` | A search of `render/candidateAnalysis.js` found no store write | None needed | Inferred to be a read, subject to review |
| Display and diagnostics | `P:2791`, `P:2821`, `P:2831`, `P:3566-3948`, `P:5288` | HUD, stream, spotlight, reasoning text and diagnostic counters | Non-learning output | C5(f) names display output and instrumentation. Whether visual state counts needs checking |
| Early exits | `P:3643`, `P:3646`, `P:3683` | Control flow, with the guard's `blockedIllegal` counter | Boundary | They map to Part D rows and write no learning state |
| Candidate-evaluation writes on another tree | C6 | Not present as a non-fresh case on the pinned tree | Unclassified | Unresolved by C6 |

Policy decisions needed:
1. Does D12b gain a boundary class and a non-learning-output class?
2. Is the branch draw boundary or decision-time?
3. Do decay gate draws count as part of "decays"?
4. Are the schema rebuild, adjacency rebuild and consolidation pass scheduled maintenance, or a separate class?
5. Are `updateMotivationalState` and `regulateBiology` decision-time under D12b?
6. May the goal change within a TC-2 session? This decides `P:3431-3447`, `P:4315` and Section 14.3's S0.
7. Should `P:4974` run on a non-fresh call in TC-2?

### 14.5 SC-E: freshness and AC38

Ruling. The `lastReasoning` object-identity direction is preserved only as far as source evidence supports it. No freshness flag is added, and runtime behaviour does not change. AC38 stays open. No method, including executed-code closure, final-state digests, V8 coverage or allowlists, is approved as complete write observation. No instrumentation or feasibility experiment is authorized.

Freshness, beyond Section 13's Ruling E. Source trace on the pinned tree:
- `main.js` is the only production file that references `lastReasoning`. It has no initial writer.
- The replay branch does not call `runPrediction` (`P:3472-3484`), so the reference stays unchanged and the call reads as non-fresh.
- `runPrediction` can exit before `P:2770` at `P:1627`, `P:1677` and `P:2619`. Such an exit at step 0 writes nothing, so the call reads as non-fresh, as AC29 requires.
- The click path calls `runPrediction` outside `runAgent` (`P:5658`). A write there falls outside the observation boundary, as AC32 requires.

Limits stay as Ruling E states them. Object identity cannot prove that a decision is correct, and it says nothing about a changed tree or runtime behaviour. [OPEN-FreshMech] stays open.

AC38, observation facts on the bridge-path inventory, by source trace:

| Reach from outside the module | Items |
|---|---|
| Exported binding (7) | `Q`, `transitions`, `rewards`, `confidenceMap`, `momentumMemory`, `pathSuccesses`, `episodicStore` |
| Module-private (12) | `provenanceLog`, `semanticStrength`, `_episodesStoredTotal`, `_episodesSinceConsolidation`, `consolidationRegistry`, `stableMemory`, `semanticEdges`, `conceptSchemas`, `schemas`, `_bonusCache`, `_lastMotifs`, `_lastRebuild` |
| Field on a neuron object (1) | Neuron embeddings (`render/embeddings.js:236-237`, `:320`) |

These facts say how an item is declared. They establish no method. The evidence a future authorized feasibility study must supply stays as Section 13's Ruling D lists it, and it must cover all 20 items. AC38 stays open and not executable.

### 14.6 Status after this review

| Item | Status |
|---|---|
| AC23 | Open, not executable |
| AC38 | Open, not executable |
| [OPEN-T3] | Open. Source inventory complete for the pinned tree |
| [OPEN-DoubleGoal] | Open. Both Q-write paths unchanged |
| [OPEN-FreshMech] | Open |
| [OPEN-Budget] | Open. Primary unit set; runtime confirmation and overrun rule outstanding |
| [OPEN-A4] | Open. Proposal awaits a ruling |

No acceptance criterion has been run or passed. TC-2 remains design-only and paused.

## 15. Freeze-readiness assessment (PROPOSED, not ruled; D-039)

This section is the Chief Systems Engineer's assessment, requested by the project owner. Every recommendation in it is PROPOSED and has no force until the Research Director rules on it. The established rulings stay exactly as Sections 4, 13 and 14 record them.

This section changes no text of T1 to T9, the Part D table, D12b or any acceptance criterion. It closes no open marker and approves no mechanism. No criterion has been run or passed, and the contract is not frozen. Line references follow Section 14's rule. Source trace is not runtime evidence.

Later update: Section 16 (D-040) records the Director's rulings on these issues. Where the two differ, Section 16 governs. This section stays as the record of the assessment.

Correction. Section 14.2 named `envCounters.attempts` as the field for contract Attempts. That field is `env.log.length`, which also counts SELF and REFUSED rows (`experiments/coga/acq1/session_mfw.mjs:123`, `experiments/coga/acq1/env.mjs:25-30`). The Section 14.2 row is corrected.

### 15.1 Summary

| Issue | Established ruling | Recommendation | Basis | Evidence still needed |
|---|---|---|---|---|
| A. AC23 guards | SC-A, Ruling C | Guards enforce behaviour. Byte identity applies with guards off. The guards-on comparison uses listed invariants | Policy, resting on design records | Every gap in Section 15.2 |
| B. Session scope | None | Adopt S0 as the initial session scope | Policy. S0's fit to the harness is source fact | M2 on a derived tree, re-derived inventory, runtime evidence |
| C. D17b | D17b, SC-A's limit | No D17b parity stratum in initial AC23. D17b stays mandatory as TC-2's configuration | Policy. The missing baseline is source fact | AC13, AC14, Section 9's D17b row |
| D. Budget | SC-B | Hard budget. Requested steps are a multiple of 5, and overrun is not permitted | Policy. The arithmetic is source fact | Driver change, call-level runtime confirmation |
| E. A4 | D12b, SC-D | Classes in Section 15.6 | Policy. Locations and effects are source facts | Director ruling |
| F. Freshness | Ruling E, SC-E | Keep object identity as the leading candidate, with the boundary in Section 15.7 | Source fact for the pinned tree. Adoption is policy | Re-derived writer list; AC7, AC25 to AC29, AC32 |
| G. AC38 | Ruling D, SC-E | Authorize the study in Section 15.8 separately | Policy | Study results |

### 15.2 Issue A: AC23 guard semantics

**Question.** What does the guard switch control, and what must match between runs?

**Existing record.** AC23 reads "Guards-off parity and mutant suite". D18(c) keeps that wording and leaves the parity target OPEN. Ruling C proposes a fresh pinned-baseline comparison, with byte-identical logs as the candidate criterion. SC-A sets guards off against guards enabled, with all else identical.

**Evidence.**
- Design record: an early AC23 read "Guards off: parity with `acq-dev-P12k` logs", on a derived tree built by a guarded transform.
- Repository precedent: GATE-FLOOR required off-state neutrality on whole sessions, checked not assumed, and then tested determinism with the intervention on (`experiments/gate-floor-b2/PRISTINE_RUNTIME.md:70-77`, `experiments/gate-floor-head/DESIGN_REVIEW.md:46-49`).
- Contract: O1, R3, D8 and D10 require behaviour to change. By inference, a switch carrying them cannot leave all outputs identical.
- Source: the legality guard masks candidates (`P:1792`) and blocks moves (`P:3646`), and it is on in the ACQ-1 driver's variant P.

| Option | Consequence and risk |
|---|---|
| 1. Guards are observational, so all outputs must match | Byte identity is testable, but the switch could not carry O1, R3, D8 or D10. AC23 would then say nothing about TC-2 behaviour |
| 2. Guards enforce behaviour, so listed invariants must match | Fits the contract. Alone, it risks weak invariants and loses the off-state test |
| 2 with off-state byte identity (recommended) | Keeps the strongest test where it can hold. Costs a third run and an additive-only derived tree |

**Recommendation: Interpretation 2, with byte identity retained for the off state.** This is a policy choice resting on the design records and contract. It adds checks instead of removing them: a third run, repeat-run preconditions and an additive-only rule. It departs from Ruling C's literal pairing of byte identity with a guards-enabled run, so it needs an explicit Director ruling.

| Term | Proposed definition |
|---|---|
| What the switch controls | One switch for the whole TC-2 guard set: every code path a derived tree adds to implement this contract. No partial state is permitted |
| Not switched | The legality guard (on in all runs), the D5 map block, Hook State P and the harness switches |
| Run A | Fresh pinned tree |
| Run B | Derived tree, guards off |
| Run C | Derived tree, guards enabled |
| A against B | AC23's parity. Byte identity on the compare set. This is where Ruling C's criterion applies |
| B against C | SC-A's comparison, with the guard setting as the only variable. It is not a parity claim, and byte identity is not required |
| Compare set | `log`, `goalResets`, `envCounters`, `mapAudit`, `guard`, `outcome`, `rng`, `clock.loopFires`, `clock.violations`, `provenance.fingerprint` |
| Excluded from compare | `wallMs`, `label`, and `provenance.mainSha256`, which differs by design between A and B |
| Must match, B against C | The input record (tree, driver, preload, clock, hook state, world, goal, agent id, seed, environment, requested steps), the first start, `u(e,j)` for every pair both runs reach, executed steps, `mapAudit.ok`, zero clock violations, no crash |
| Permitted differences, B against C | Any output downstream of a guard-controlled clause. In each session the first differing call must be attributed to a named clause. This needs per-call rows |
| Static reverse-identity checks | The derived tree is additive only: removing tagged lines gives the pinned `main.js` byte for byte, and no other tree file differs. CREDIT-1's S-2 is the precedent. This establishes source containment. It does not establish runtime equivalence, correct guards-on behaviour or the absence of RNG or clock effects |
| Suite membership | Section 14.1's nine general mutants, plus "extra trust writer" with a proposed target of AC13. The DB mutants stay with AC38, AC5 and AC19, so AC23 does not wait on AC38 |
| World list | Accepted-stream development indices 0 to 9, with configuration seeds 200116, 200183, 200220, 200247, 200316, 200388, 200404, 200489, 200531 and 200710. Ten matches the design record's count |
| Environment | One fixed per-edge environment that meets D15. It does not exist yet |
| Step count | 12,000 requested steps, under Section 15.5. This is a harness-scale choice, not a scientific one. The ACQ-1 design notes that 3,000 was only the M7 budget (`experiments/coga/acq1/DESIGN.md:110`) |
| Nondeterminism | None is permitted in the compare set. Fixed clock, `__M7_REPLAY_ONCE__`, a seeded RNG asserted at the first call (`instrumentation/rng.js:91`), one process per session, one Node binary. Preconditions: repeated Run A and repeated Run C are each byte-identical on the compare set |
| Pass | All ten worlds pass A against B, all B against C items hold, the static checks pass, and every suite mutant fails its named criterion |
| Fail | Any compared byte difference, failed item, missing artifact or surviving mutant fails AC23. No retry and no world replacement. The first differing row is reported |

**Limit.** A pass would show off-state inertness and a matched comparison. It would not show correct guards-on behaviour. That belongs to the other acceptance criteria.

**AC23 stays open and not executable.** Still missing: a Director ruling, a derived tree, a TC-2 driver, the D15 environment, per-call rows, and the fixtures that the mutants target.

### 15.3 Issue B: session scope, T3 and M2

**Question.** Is S0 the right initial TC-2 session scope?

**Existing record.** Purpose A, CR-1, O3, Section 14.3 and SC-C. No ruling sets the session scope.

**Evidence.** CR-1 has no row for restoration, teaching or goal change. The harness fixes the goal (`experiments/m7/run.js:210-212`), asserts a cold store (`:223-231`) and presses Space once (`:248`).

| Option | Consequence and risk |
|---|---|
| S0 (recommended) | Fits Purpose A, CR-1 and the harness. Conclusions stop at S0 |
| Broader scope | Must also cover routes 2, 3, 8, 12, 13 and 15, plus `P:3431-3447`, `P:4315` and route 6 after a goal change. CR-1 has no reference for them, so conformance would have no basis |

**Recommendation: adopt S0 as the initial session scope.** This is a policy choice.
- Includes: one goal set once before the loop, an empty `brain` store, one Space press, no home, one process, the episode cap and deterministic replay cooldown.
- Excludes: restoration, saving, manual teaching, any goal change, home override, Shift+R and the seal bridge.
- No conclusion may be generalized beyond S0.

**T3 and M2.**
- M2 does not exist in the pinned tree: `updateQ` has no terminal input (`render/qlearning.js:143-165`). No-bootstrap behaviour is not established there: `P:4177` passes the pre-move position.
- Within S0, on a tree where `S′=k(g)`, the absence of `g#g` would give both GOAL_OK writes a zero bootstrap. That is the incidental Q-table state SC-C rules out relying on, so M2 stays the preferred design.
- [OPEN-T3] stays open. It needs an S0 ruling, M2 on a derived tree, the inventory re-derived on that tree, AC10 fixtures and runtime evidence.
- T4 stays separate, and no acceptance criterion names it (Section 15.9).

### 15.4 Issue C: D17b scope

**Question.** Is D17b's credit-on configuration mandatory for the initial TC-2 milestone?

**Existing record.** D17b, D10, SC-A's limit and Section 9's D17b row.

**Evidence.** No hook state supplies D10 credit (Section 14.1). A parity stratum needs a baseline that already has the behaviour, and no tree has D10 credit.

| Option | Consequence and risk |
|---|---|
| D17b parity stratum in initial AC23 | No matched baseline exists, so it could not be a parity |
| `creditMode: 'on'` off-parity stratum | Feasible, and it would cover the `__M7_CREDIT__` path. It is not D10, so it must not carry D17b's name |
| Outside initial AC23, mandatory as TC-2's configuration (recommended) | Keeps D17b binding and keeps guard parity honest |

**Recommendation.** Keep D17b mandatory as TC-2's configuration, and exclude a D17b parity stratum from initial AC23. The missing baseline is source fact, and the exclusion is a policy choice.
- Proposed control: the D10 writer sits inside the TC-2 guard set, and `creditMode` stays `'off'` in Runs A, B and C. The guard setting then stays the only variable.
- Limitation: AC23 says nothing about D10. Run C containing D10 code does not validate it, and Hook State P does not prove D17b behaviour.
- Future requirement: AC13, AC14 and Section 9's D17b row must pass on the guards-enabled tree before any TC-2 behaviour is relied on.

### 15.5 Issue D: budget and accounting

**Question.** How are steps, exposure and overrun defined, so that a hard budget cannot be silently exceeded?

**Existing record.** E-2, T7, AC21, SC-B and Section 14.2. These definitions are consistent with each other. None sets a stopping rule.

**Evidence.** The five-call discrepancy is accounted for at source level (Section 13, Ruling F). The harness passes `ticks` as the step budget (`experiments/coga/acq1/session_mfw.mjs:114`), then adds the direct loop on top.

| Option | Consequence and risk |
|---|---|
| Disclose overrun only | A requested budget can still be exceeded |
| Exclude the five direct calls from steps | Conflicts with E-2, the step index and the episode cap |
| Hard budget (recommended) | No overrun. Needs a driver change. `main.js` does not change |

**Recommendation: a hard budget.** This is a policy choice. The arithmetic is source fact.

| Term | Proposed definition | Field |
|---|---|---|
| Requested steps | A positive multiple of 5, declared before the run. The primary budget. Any other value is refused | `steps` |
| Executed study steps | `runAgent` calls reaching `P:3260`, from the session's first call, direct calls included | `calls` |
| `runAgent` call exposure | Every `runAgent` entry, recorded separately from executed steps | `calls`, cross-checked by `5 + 5 × loopFires` |
| Contract Attempts | Legal edges presented to the environment. On the pinned tree goal attempts have no row (`P:5025`) | `log` rows of kind EDGE |
| Harness timer ticks | Timer-driven loop fires. Never reported as steps. `ticksExecuted` is 5 times this count | `clock.loopFires` |
| Stopping | The driver passes `ticks = requested − 5`. The direct loop plus `requested / 5 − 1` timer loops make exactly the requested calls | Future driver |
| Overrun | Executed steps above requested. Not permitted: the session is invalid | `calls` |
| Underrun | Executed steps below requested. The session is incomplete and reported as such | `calls`, `outcome.completed` |
| Session end | Not a terminal event. It writes no reward, Q or commit and creates no D16 record. The open episode is treated as censored | None yet |

For 12,000 requested steps, the driver passes 11,995, and 5 plus 2,399 loops of 5 make 12,000 calls.

Future implementation requirement, not implemented: the TC-2 driver refuses other values, passes `ticks` as above and asserts that `calls` equals `steps`. Existing records stay as they are.

[OPEN-Budget] stays open until the policy is ruled and call-level runtime confirmation exists. The attempts-per-step asymmetry also stays open.

### 15.6 Issue E: A4 operation classification

**Question.** Which class does each operation that D12b does not name belong to?

**Existing record.** D12b, C5, Section 6.1's "Loop-level maintenance" row, SC-D and Section 14.4.

**Options.** Extend D12b's wording, or leave D12b unchanged and rule classes in a new decision. Recommended: leave D12b unchanged. Add two labels by a new ruling: **boundary** (step accounting, starts, resets and call control) and **non-learning output**. Locations and effects below are source facts. Classes are policy.

| Operation | Location | Observable effect | Proposed class | Rationale | Unresolved |
|---|---|---|---|---|---|
| Branch draw | `P:3460` | One draw from the cognitive stream; selects prediction or replay | Boundary | It runs before any decision and writes no decision state | Ruling |
| Decay gate draws | `P:3316`, `P:3330`, `P:3358`, `P:5238` | One draw each; choose whether a decay runs | Scheduled maintenance | C5(e) already includes the first three as scheduled operations. Each exists to schedule a decay | Ruling. `P:5238` also gates rebuilds |
| Schema rebuild | `P:5254`, `render/schemaMemory.js:129-167` | Rebuilds `schemas` and clears `_bonusCache`; throttled by the clock | Scheduled maintenance, non-decay | Runs under Section 6.1's loop-level row. Derived from stored episodes, and it feeds scoring | Whether D12b's class admits non-decay work |
| Adjacency rebuild | `P:5258`, `P:953-961` | Rebuilds `adjacencyMemory` from stored episodes | Scheduled maintenance, non-decay | Same reason | Same |
| Consolidation pass | `P:5262-5263`, `render/longTermConsolidation.js:101-115` | One draw; raises stable `rewards`, capped at 8 | Scheduled maintenance, non-decay | Loop-level, but it strengthens a store | Same. Effect unmeasured |
| `updateMotivationalState` | `P:1692` | Writes drive state once per imagined step; no RNG use found in its file | Decision-time | Runs only inside `runPrediction` | D12b's list is specific, so a ruling is needed |
| `regulateBiology` | `P:2957`, `render/behavior.js:105` | Writes energy, stress and exhaustion state; no RNG use found in its file | Decision-time | Runs only inside `runPrediction`, after the step loop | Same |
| Goal change | `P:820`, `P:3431-3447`, `P:4315`, `P:5515` | Writes `goalNeuronId` | Not permitted in S0 | Each needs a stored brain, a home or a click, all excluded by S0 | Issue B ruling |
| Position bookkeeping | `P:4974` | `agentLast = agentCurrent` | Not run on a non-fresh call | Pinned source: it runs on a non-fresh call that passes the exits at `P:3576`, `P:3588`, `P:3643`, `P:3646`, `P:3653`, `P:3658` and `P:3690`. Section 6.1 step 7 ends such a call first, so this is a nonconformance | Its role on a derived tree |
| Step accounting | `P:3260`, `P:3303` | Telemetry and the cap counter | Boundary | Section 14.2 | Ruling |
| Cap handling, first start | `P:3274-3302`, `P:3400-3409` | Draw and position write | Boundary | CL-C and Part D cover their behaviour | Ruling |
| Display and diagnostics | `P:2791`, `P:2821`, `P:2831`, `P:3566-3947`, `P:5288` | HUD, stream, spotlight, text and counters | Non-learning output | C5(f) names them | Whether each read writes no learning state |

D12b is unchanged, and [OPEN-A4] stays open.

### 15.7 Issue F: freshness

**Question.** Is object identity an adequate freshness mechanism?

**Existing record.** Section 5, C6, AC7, AC25 to AC29, AC32, Ruling E and SC-E.

| Option | Consequence and risk |
|---|---|
| Object identity (recommended as candidate) | Needs no stored state. Rests on one writer creating a new object |
| Persistent flag | Excluded by Ruling E and SC-E |
| `runPrediction` return value | Changes a function's contract at `P:3462` and `P:5658`. No ruling has considered it |
| Origin check | Already a must-fail mutant |

**Recommendation.** Keep object identity as the leading candidate. The pinned-tree reading is a source finding, and adoption is a policy choice.

**Boundary it could support.** Read the `lastReasoning` reference immediately before and immediately after contract step 5, in one `runAgent` call, using a local variable. A difference supports exactly one statement: the assignment ran between those reads.

**What it cannot prove.** That the decision is legal or correct. Anything about a changed tree. Anything about runtime behaviour.

**Assumptions that need runtime evidence.**
1. Nothing interleaves within the call. Source shows no `await` in `main.js`.
2. A derived tree keeps one writer, and that writer always creates a new object.
3. No wrapper or accessor changes reference behaviour (`experiments/m7/run.js:236-240` stores the assigned value).
4. The attempt uses the `to` of that same object (`P:3955`).

[OPEN-FreshMech] stays open. It needs a re-derived writer list, AC7, AC25 to AC29 and AC32 on the tree under test, and detection of the freshness mutants.

### 15.8 Issue G: AC38

**Why current evidence does not establish complete write observation.**
- No observation mechanism exists, and none has run.
- Final-state digests miss transient, same-value and overwritten or restored writes. AC38(c) already says so.
- 12 of the 20 inventory items are module-private (Section 14.5). Some are `let` bindings such as `_lastRebuild` (`render/schemaMemory.js:81`), so they change by assignment.
- Neuron embeddings change by field assignment (`render/embeddings.js:236-237`).
- AC38(b) needs stream positions at seal entry and return. `instrumentation/rng.js` exports no position reader, and the existing recovery runs once, at session end (`experiments/m7/run.js:266-273`).
- The context episode is module-private (`render/episodicContextEngine.js:51`), and the test-access mechanism is undefined.
- Source search and code coverage show what exists or ran. Neither observes each write.

**Proposal for a separately authorized feasibility study. Not authorized and not started.**

| Item | Proposal |
|---|---|
| Question | Can a test-only method observe every AC38(a) write in the seal window, across all 20 items, without changing behaviour? |
| Write classes | Transient, same-value, overwritten or restored, Map and Set operations, array index and length, object fields including neuron fields, module-private assignments, and any other class AC38(a) requires |
| Required properties | A positive control per write class and item kind. A no-write control. A coverage statement for all 20 items. Detection of every "must fail AC38" mutant. Seal-window stream deltas. Test access that meets AC38's limits. No production reader, writer or decision path; AC33 preserved. Seal behaviour and RNG consumption unchanged, shown by comparing runs with the method present and absent |
| Candidates | None approved or selected. Families to compare: a source-transformed test copy, wrappers on exported collections, and a static closure argument with coverage. A family that misses a property is rejected, and coverage is not narrowed to fit it |
| Phases | 1. Freeze the protocol before outcomes. 2. Build a synthetic write-class corpus. 3. Run controls on a test-only copy. 4. Run the mutants. 5. Check neutrality. 6. Report |
| Stop rules | Stop on any production edit, any undetected class, or any behaviour change |
| Outcomes | Feasible, or not feasible. Not feasible returns the coverage boundary to the Director. Neither outcome passes AC38 |
| Authorization needed | A Director ruling that names the test copy, the runs and any tooling |

AC38 stays open and not executable.

### 15.9 Freeze-readiness verdict

**Verdict: NOT READY FOR FREEZE REVIEW.** The mandatory definitions above are proposals, not rulings.

If the Director rules on every item in Category 1 below, the verdict would become READY FOR DOCUMENTATION FREEZE ONLY, WITH RUNTIME/ACCEPTANCE BLOCKERS. That would not mean TC-2 is correct or accepted. A later AC38 result that returns the coverage boundary to the Director would reopen the frozen text.

**Category 1: policy decisions that documentation can settle.**
1. Guard semantics and the three-run AC23 (Section 15.2).
2. AC23 suite, worlds, environment, step count, nondeterminism and pass/fail rules (Section 15.2).
3. S0 as the initial session scope (Section 15.3).
4. D17b's place outside initial AC23 (Section 15.4).
5. Hard budget, stopping and session-end rules (Section 15.5).
6. A4 classes and the two new labels (Section 15.6).
7. T-to-AC coverage. No criterion names T4 or T9, and T5 and T8 are only partly covered. Proposed new criterion, not added: "Within S0, no Q write has `S=k(g)`, commit writes included."
8. The gate objective, already recorded as unresolved.

**Category 2: source-level questions.**
1. Whether unrealized nodes reach stored episodes. Source answer on the pinned tree: yes. The push at `P:4502` precedes the verdict at `P:5026`, no writer removes a slipped target, and `P:4596` commits `recentMemory`. Section 11 keeps the item until this is accepted.
2. Re-derivation on a derived tree: the bridge-path inventory, the `k(g)` routes and the `lastReasoning` writers. This cannot start until a tree exists.
3. Non-fresh prediction calls on any other tree (C6).
4. Root behaviour and inventory. This is needed only if the governing baseline changes.

**Category 3: runtime evidence still missing.**
1. Pinned baseline hash match on a separately authorized rebuild.
2. A derived tree, a TC-2 driver and a D15 environment.
3. Every acceptance criterion: none has been run.
4. AC23's runs.
5. Call-level budget confirmation.
6. M2, T3 and T4 on a derived tree.
7. Freshness behaviour.
8. D16 record immutability and unreadability.

**Category 4: questions needing a separately authorized feasibility study.**
1. AC38 write observation.
2. AC38 test access.
3. AC38 stream deltas.

Open after this assessment: [OPEN-T3], [OPEN-DoubleGoal], [OPEN-FreshMech], [OPEN-Budget] and [OPEN-A4]. AC23 and AC38 stay not executable. Documentation completeness is not behavioural correctness or acceptance.

## 16. Freeze-gate rulings (DIRECTOR RULING, provisional; D-040)

FR-A to FR-G come from the Research Director's TC-2 freeze-gate directive. That directive calls them Rulings A to G. This record renames them so they are not confused with Section 13's Rulings A to F or Section 14's SC-A to SC-E. This section is their first repository copy.

The paragraphs marked "Ruling" state the Director's rulings. They are policy directions and replace no required source or runtime evidence. "Proposed" marks text awaiting a ruling. Everything else is a source finding or reconciliation wording, and it is not a further ruling. Where this section differs from Sections 13, 14 or 15, this section governs.

This section changes no text of T1 to T9, the Part D table, D12b or any acceptance criterion. It closes no open marker. It authorizes no implementation, test, run, instrumentation or feasibility study. No criterion has been run or passed, and the contract is not frozen. Line references follow Section 14's rule. Source trace is not runtime evidence.

Later update: Section 17 (D-041) updates this section where the two differ. This applies to the guard-switch definition, the attribution clause list, the proposed amendments, the clarifications and the verdict. D-040 records the state at its own date.

### 16.1 FR-A: AC23 structure

Ruling. Adopt the three-run design as the proposed AC23 structure: Run A is a fresh pinned baseline, Run B is a derived tree with guards disabled, and Run C is the same derived tree with guards enabled. A against B requires byte identity over an explicitly enumerated comparison set. B against C requires equality on explicitly named invariants, with differences permitted only where attributable to a named guard-controlled clause. Unrestricted byte identity between B and C is not required if guards intentionally change behaviour. Static checks do not establish runtime equivalence. AC23 stays open and non-executable until every mandatory definition and prerequisite is satisfied.

**Reconciliation with existing rulings.**

| Existing item | Existing text | Effect of FR-A | Result |
|---|---|---|---|
| AC23 | "Guards-off parity and mutant suite" | A against B is that parity | Consistent. Wording unchanged |
| D18(c) | Parity target OPEN, to be defined before AC23 can be executable or passed | FR-A sets the structure. The target stays open until its definitions are complete | Consistent |
| Ruling C | A "proposed parity target" comparing a fresh baseline run and a guards-enabled run, with byte-identical logs as "the candidate parity criterion" | Byte identity moves from that pairing to A against B | Refinement, not an override. Ruling C's text is proposed and candidate, and D18(c) leaves the target OPEN, so no binding requirement is weakened. The literal pairing is not kept, and D-040 says so |
| Ruling C's required definitions | Logs, baseline, suite, nondeterminism, static checks, evidence, pass and fail | All stay mandatory | Consistent |
| SC-A | Guards off against guards enabled, all else identical, guard setting as the variable | B against C is that comparison, on one tree. SC-A's "baseline run" is Run B. FR-A's baseline is Run A | Consistent. Naming recorded |
| SC-A's D17b limit | Parity under Hook State P does not validate D17b | Kept (Section 16.3) | Consistent |
| Ruling A, Section 13 | Both Q-write paths stay | The guard set must keep both | Consistent |

No conflict with a binding requirement was found, so FR-A is recorded.

**Guard switch.**

| Item | Definition |
|---|---|
| Controls | One switch for the whole TC-2 guard set: every code path a derived tree adds to implement this contract. No partial state is permitted |
| Does not control | The legality guard, which is on in all runs. The D5 map block. Hook State P's four fields. The harness switches, RNG streams and clock |
| Off | Every added path is skipped, so the derived tree follows its pinned lines only |
| Enabled | Every added path runs |
| Exists today | No. No derived tree exists |

**Inputs that must match.** In every compared pair: world index and configuration seed, goal, environment, agent id, seed, requested steps, driver hash, preload hash, clock configuration, hook state, legality guard on, map block on, and Node binary. Runs B and C also share one tree hash.

**Comparison set, A against B.** `log`, `goalResets`, `envCounters`, `mapAudit`, `guard`, `outcome`, `rng`, `clock.loopFires`, `clock.violations` and `provenance.fingerprint`. Excluded: `wallMs`, `label`, and `provenance.mainSha256`, which differs by design. Field names follow the ACQ-1 driver record (`experiments/coga/acq1/session_mfw.mjs:117-127`), and a TC-2 driver must carry the same fields. Per-call rows are outside this set, because Run A has none.

**Named invariants, B against C.**
1. The input record listed above.
2. The first start.
3. `u(e,j)` for every pair `(e,j)` that both runs reach.
4. Requested steps, executed steps and call exposure.
5. `mapAudit.ok` is true.
6. `clock.violations` is zero.
7. Neither run crashes.

**Attribution rules.**
1. Runs B and C write one row per call: call index, Part D event, `u`, `v` and verdict. Writing a row consumes no draw and reads no clock.
2. The first differing call in a session is its divergence point.
3. The divergence must match an entry in a closed attribution table, which maps each guard-controlled clause to the row change it can cause. The clause list is O1, O2, R3, C1, D3, D4, D8, D10, D11, D13, D15, D16 and T3.
4. An unmatched divergence fails. A later difference is attributed to the clause of that divergence, provided every invariant holds.
5. Limit: after a divergence the two states differ, so this comparison cannot show that each later difference is lawful. The other acceptance criteria and the mutants must cover that.

The attribution table cannot be completed until a TC-2 patch exists.

**Static checks.** All are mandatory, and CREDIT-1's S-1 to S-4 are the precedent (`experiments/credit1/DESIGN.md:206-209`).
1. Removing tagged lines from the derived `main.js` gives the pinned `main.js` byte for byte, LF-normalised.
2. Every other tree file is byte-identical to the pinned tree, or is a declared new file.
3. The tagged line set equals the declared plan.
4. Every tagged line is the switch declaration or sits behind the switch.

Reordered code can stay additive only by wrapping pinned lines in added conditions, and this is unproven until a patch exists. These checks establish source containment. They do not establish runtime equivalence or correct guards-on behaviour.

**Pass and fail.**
- Preconditions: repeated Run A and repeated Run C are each byte-identical on the comparison set, in every world.
- Pass: every world passes A against B, every invariant and attribution rule holds, all static checks pass, and every suite mutant fails its named criterion.
- Fail: any compared byte difference, failed invariant, unmatched divergence, failed static check, missing artifact or surviving mutant fails AC23. There is no retry or world replacement, and the first differing row is reported.
- A pass would show off-state inertness and a matched comparison only.

**Numbers, reconciled and not approved.**

| Number | Origin | Reconciliation | Status |
|---|---|---|---|
| 10 mutants | Section 7's nine general mutants, marked as not approved criteria, plus "extra trust writer" from an early draft | Each target in Section 14.1 fits its criterion's text, and AC13 fits the tenth. The count has no authority of its own: it is the length of an unruled list. An early draft wanted a mutant for each criterion, and no ruling kept that | Awaiting Director approval |
| 10 worlds | A design-conversation count. No contract requirement | Indices 0 to 9 lie inside `DEV_INDICES` (`experiments/coga/config.mjs:19`) and cover goals 8, 12, 16 and 19 (`experiments/m7/env.js:166`). Whether ten are enough is unknown | Awaiting Director approval |
| 12,000 steps | ACQ-1's budget (`experiments/coga/acq1/DESIGN.md:31`), borrowed as a scale only. ACQ-1 is VOID and is not evidence here | No contract requirement. Whether it reaches rare gated paths cannot be shown without a run | Awaiting Director approval |

### 16.2 FR-B: initial scope

Ruling. Adopt S0 as the proposed initial scope: fixed goal, cold store, one Space press and no home set. Restoration, saving, teaching, goal changes and the seal bridge are excluded from this initial scope. This does not prove that the implementation satisfies S0, and no conclusion is generalized beyond it. [OPEN-T3] stays open until the required terminal and bootstrap contract and evidence are satisfied. M2 is not claimed to exist in the pinned tree. T4 stays distinct from T3.

**Conflict check against binding requirements.**

| Requirement | Finding |
|---|---|
| CR-1 | No conflict. It has no row for any excluded item |
| [OPEN-T3] closure rule | It requires coverage of restoration and goal lifecycle, which S0 excludes. S0 does not amend it. Section 14.3 supplies that coverage at source level |
| CL-B | It applies to any seal, by any route. S0 does not relax it |
| AC38 | Its fixtures populate the context episode, which S0 excludes. S0 does not narrow AC38's coverage |
| Seal calls | S0 excludes the bridge route, not seals. `P:3276` and `P:4828` still call `sealCurrentEpisode` |
| Forced fixtures | Criteria such as AC29 force states. They are fixtures, not S0 sessions |
| Saving | `P:1148` runs in a browser, so the browser app is not S0. The harness stub makes it inert (`benchmarks/harness/headlessShim.js:140`) |

No existing requirement needs to change for S0.

### 16.3 FR-C: D17b

Ruling. Hook State P parity is not claimed to prove D17b's credit-on behaviour. If D17b is mandatory in the existing contract, that obligation is preserved. A missing matched parity baseline is a verification gap, not evidence that the configuration is safe. No D17b test is run and no baseline is invented.

Finding: D17b is mandatory. Section 4 states that eventual implementation verification is mandatory, and Section 9 has its row. The obligation stands.

**Required configuration.** Arm OFF, credit as defined by D10, PE pin off.

| Test | Configuration exercised | Supports | Does not support |
|---|---|---|---|
| Run A | Pinned tree, Hook State P, legacy writers `P:4484`, `P:4681` and `render/episodeManager.js:1092` | A reference for Run B | Anything about D10 |
| Run B | Derived tree, guards off, Hook State P, same legacy writers | With Run A, off-state inertness under legacy credit | D10 or D17b |
| Run C | Derived tree, guards enabled, Hook State P's four fields | With Run B, a matched comparison under the named invariants | D10 correctness, D17b validity or safety |
| AC13, AC14 | Guards-enabled fixture with the D10 writer | Trust counts in that fixture | Whole-session behaviour |
| Section 9's D17b row | Arm, credit and pin values, recorded and independently tested | Configuration identity | Behaviour |

**Validation required for D17b, none of it done.** The arm, credit and pin values are recorded and independently tested. AC13 and AC14 pass. A static audit shows that `P:4484`, `P:4681` and `render/episodeManager.js:1092` do not run. AC12 and AC34 hold, as D17b's slip clause requires.

**Verification gap.** No tree has D10 credit, so no matched parity baseline exists. That is a gap in verification. It is not evidence about D17b.

### 16.4 FR-D: hard study budget

Ruling. Adopt a hard budget for the defined study-step unit. Requested steps, executed study steps, `runAgent` call exposure, contract-level Attempts and harness timer ticks stay distinct. All qualifying `runAgent` calls, direct calls included, count toward the budget. Contract Attempts are not `envCounters.attempts`. A session that exceeds its declared budget is invalid. Session end is not a terminal learning event unless a separate contract requirement establishes that meaning. The driver adjustment `ticks = requested − 5` is a source-level proposal, and it must not be treated as universally valid. [OPEN-Budget] stays open while runtime confirmation is required.

| Field | Definition | Present field |
|---|---|---|
| Requested steps | The hard budget, declared before the run | `steps` |
| Executed study steps | `runAgent` calls reaching `P:3260`, from the session's first call, direct calls included | `calls` |
| `runAgent` call exposure | Every `runAgent` entry, recorded separately. Equal to executed steps today | `calls`, cross-checked by `5 + 5 × loopFires` |
| Contract Attempts | Legal edges presented to the environment | `log` rows of kind EDGE |
| Harness timer ticks | Timer-driven loop fires. Never reported as steps | `clock.loopFires` |
| Overrun | Executed steps above requested. The session is invalid | `calls` against `steps` |
| Underrun | Executed steps below requested. The session is incomplete | `calls`, `outcome.completed` |
| Session end | Not a terminal event. No existing requirement gives it learning meaning, and D16 names only terminal verdicts and the cap | None |

**Five-call assumption, by source trace on the pinned tree.** It holds only when all of these hold:
1. `agentRunning` is false at the press (`P:3197`, `P:5379`).
2. There is one Space press. A second press stops the loop (`P:5383-5384`).
3. `runAgentLoop` passes its only early return (`P:5209`).
4. `P:5318` is the only `runAgent` call site.
5. `P:5382` and the timer at `P:5321` are the only loop entries.
6. `P:5328` is the only production keydown listener.

It is not universal. A derived tree, a different driver or another tick unit must re-derive it, and no runtime observation confirms it.

**Future driver requirement, not implemented.** Under those conditions a driver can pass `ticks = requested − 5` for a requested value that is a multiple of 5. For other values the current loop cannot stop exactly, because each loop makes 5 calls, so the driver must refuse them. It must also assert that `calls` does not exceed `steps`. `main.js` need not change for this.

### 16.5 FR-E: A4 classification

Ruling. Record the classification below with its rationale and limitations. D12b stays unchanged. [OPEN-A4] stays open until its full acceptance requirements are met.

This table adds two labels, **boundary** and **non-learning output**, and no D12b amendment is needed: D12b says decays are scheduled maintenance, not that only decays are. Locations and effects are source facts. Classes are policy.

| Operation | Location | Class | Rationale | Limitation |
|---|---|---|---|---|
| Branch draw | `P:3460` | Boundary | It runs before any decision and writes no decision state | Its draw still shapes the stream, so it stays in parity scope |
| Decay gate draws | `P:3316`, `P:3330`, `P:3358`, `P:5238` | Scheduled maintenance | Each exists to schedule a decay, and C5(e) covers the first three | `P:5238` also gates the two rebuilds |
| Schema rebuild | `P:5254`, `render/schemaMemory.js:129-167` | Scheduled maintenance, non-decay | It runs under Section 6.1's loop-level row and derives from stored episodes | It feeds scoring and is throttled by the clock. Effect unmeasured |
| Adjacency rebuild | `P:5258`, `P:953-961` | Scheduled maintenance, non-decay | Same | It feeds `trajectoryConfidence`. Effect unmeasured |
| Consolidation pass | `P:5262-5263`, `render/longTermConsolidation.js:101-115` | Scheduled maintenance, non-decay | It runs at loop level | It raises stable `rewards`, capped at 8. Effect unmeasured |
| `updateMotivationalState` | `P:1692` | Decision-time, outside D12b's named list | It runs only inside `runPrediction`, once per imagined step | The click path also reaches it, outside S0 |
| `regulateBiology` | `P:2957`, `render/behavior.js:105` | Decision-time, outside D12b's named list | It runs only inside `runPrediction`, after the step loop | An early exit at `P:2619` skips it, so it is not guaranteed on every prediction call |
| Goal change under S0 | `P:820`, `P:3431-3447`, `P:4315`, `P:5515` | Not permitted | Each needs a stored brain, a home or a click, and S0 excludes all three | S0 does not prove an implementation meets it |
| `P:4974` on non-fresh calls | `P:4974` | Not run on a non-fresh call in TC-2 | Section 6.1 step 7 ends such a call first | Pinned source runs it after the exits at `P:3576`, `P:3588`, `P:3643`, `P:3646`, `P:3653`, `P:3658` and `P:3690`. That is a nonconformance, and its role on a derived tree is unknown |
| Step accounting | `P:3260`, `P:3303` | Boundary | Telemetry and the cap counter | None |
| Cap handling and first start | `P:3274-3302`, `P:3400-3409` | Boundary | CL-C and Part D govern them | Each has a draw and a position write |
| Display and diagnostics | `P:2791`, `P:2821`, `P:2831`, `P:3566-3947`, `P:5288` | Non-learning output | `render/hud.js` imports nothing, and `render/neuronVisuals.js` imports only `liveRng`, for the visual stream | Source-level only. Visual draws still count toward AC38(b) |

[OPEN-A4] stays open. No evidence shows these classes hold on a derived tree, and C6's case on another tree is unresolved.

### 16.6 FR-F: freshness

Ruling. `lastReasoning` object identity stays the leading freshness-mechanism candidate. No persistent flag is added, runtime behaviour does not change, and correctness is not claimed from identity alone. [OPEN-FreshMech] stays open while required evidence is missing.

**May establish.** On a tree where one writer always creates a new object: a difference between two reads around contract step 5, in one synchronous `runAgent` call, means the assignment ran between those reads.

**Cannot establish.** That the decision is legal, correct or useful. That the attempt used that object's `to`. Anything about a tree with another writer, a reused object or an in-place write. Any runtime behaviour.

Section 15.7's four assumptions still need runtime evidence, together with AC7, AC25 to AC29 and AC32 on the tree under test.

### 16.7 FR-G: AC38 feasibility proposal

Ruling. AC38 stays open and non-executable. A proposal for a separately authorized feasibility study is prepared. No implementation method is approved, no instrumentation is added and the study is not executed.

This extends Section 15.8.

| Item | Proposal |
|---|---|
| Required write classes | Transient, same-value, overwritten, restored, Map and Set operations, array index and length, object fields, module-private assignments, and any other class AC38(a) requires |
| Module-private state | The method must observe all 12 module-private items without adding a production reader, writer or decision path |
| Observation completeness | Complete means that, for every item in the re-derived inventory, every mutation of every class in the seal window is recorded, and controls prove it. One unobservable item makes the result incomplete |
| Access to evidence | Journals are readable by test code only. Test access meets AC38's limits and avoids `episodeRecordNode` |
| Stream deltas | Measured at seal entry and return, per window: cognitive stream 1, environment and visual streams 0 |
| Limitations | A result applies only to the tree tested. Feasible does not pass AC38. Inventory re-derivation comes first |
| Stop conditions | Any production edit, undetected write class, behaviour change, or new dependency that is not authorized |
| Acceptance of the study | The protocol is frozen before outcomes. Every control and mutant is reported, failures included. Results repeat. An independent review checks them, and the Director accepts or rejects the report |

Method families stay as Section 15.8 lists them, and none is approved.

### 16.8 Acceptance traceability

Coverage means a criterion exists. It is not a result. Every result below is UNRUN, and no criterion is passed. "Adequate" is a reading of the wording only.

| Requirement | Definition | Criteria | Required evidence | Coverage |
|---|---|---|---|---|
| O1 | Section 2 | AC1, AC16 | Fixture, integration | Adequate |
| O2, R2 | Section 2 | AC8 | Fixture | Adequate |
| R3 | Section 2 | AC7, AC24 to AC30, AC32 | Fixture, mutants | Adequate |
| Mechanism boundary | Section 2 | AC33, AC34 | Static, fixture | Partial: no criterion names rerouting (C11) |
| C1, C2 | Section 4 | AC7, AC26 | Fixture | Adequate |
| C4 | Section 4 | AC31, AC37 | Fixture | Adequate |
| E-2, E-6 | Section 3 | AC11, AC21 | Fixture, integration | Adequate |
| E-3 | Section 3 | AC2 for the verdict only | Fixture | Partial: Section 9's row has no criterion |
| E-4, E-5 | Section 3 | AC2, AC3, AC14 | Fixture | Adequate |
| E-7, D5 | Sections 3, 4 | AC36 | Static, integration | Adequate |
| D3 | Section 4 | AC35 | Fixture | Adequate |
| D4 | Section 4 | AC16, AC34 | Fixture | Adequate |
| D6 | Section 1 | None. Section 9's hash match applies | Static on a rebuild | Partial: a prerequisite, not a criterion |
| D7, D10 | Section 4 | AC13, AC14 | Fixture, spy | Adequate |
| D8 | Section 4 | AC12 | Fixture | Adequate |
| D9 | Section 4 | AC16 | Fixture | Adequate |
| D11 | Section 4 | None | Static, integration | None: Section 9's row has no criterion |
| D12a | Section 4 | None. AC37 excludes it | Static | Partial: static check 2 and the pinned lines cover it |
| D13 | Section 4 | AC15 | Fixture | Adequate |
| D14 | Section 4 | None | Fixture | None |
| D15 | Section 4 | AC3 | Fixture, log reconstruction | Adequate |
| D16 | Section 4 | AC17, AC18, AC19 | Static, fixture | Adequate |
| D17b | Section 4 | AC12, AC13, AC14, AC34 in part | Static, integration | Partial: no criterion names the configuration |
| T1 | Section 6.2 | AC4, AC5, AC11 | Fixture | Adequate |
| T2 | Section 6.2 | AC4, AC35 | Fixture | Adequate |
| T3 | Section 6.2 | AC10 | Fixture, spy | Adequate |
| T4 | Section 6.2 | None | Spy on every Q write | None |
| T5 | Section 6.2 | AC8 in part | Fixture | Partial |
| T6 | Section 6.2 | AC11, AC19 | Fixture | Adequate |
| T7 | Section 6.2 | AC21 | Fixture | Adequate |
| T8 | Section 6.2 | AC11 in part | Fixture | Partial |
| T9 | Section 6.2 | None | Fixture, spy | None |
| Part D no-attempt rows | Section 6.3 | AC2, AC7 | Fixture | Adequate |
| CL-A | Section 6.4 | AC5, AC9, AC10 | Fixture, spy | Adequate |
| CL-B | Section 6.4 | AC38 | As AC38 specifies | Adequate as wording. Not executable |
| CL-C | Section 6.4 | AC6, AC11, AC20 | Fixture | Adequate |
| CL-D | Section 6.4 | AC17, AC33 | Static, fixture | Adequate |
| FR-A | Section 16.1 | AC22, AC23 | Runs, static, mutants | Adequate as wording. Not executable |
| FR-B | Section 16.2 | None | Recorded session conditions | None |
| FR-D | Section 16.4 | AC21 in part | Recorded counts | Partial |

**Findings on the reported gaps.**
- T4: confirmed. AC10 tests bootstrap and AC8 tests the main TD write. Neither stops a Q write with `S=k(g)`, and Section 14.3 shows that route 6 and route 8 can write one outside S0.
- T9: confirmed, and it has a wording problem. T9 says "The Q reward input is `rewardSignal`", but CL-A keeps a commit write whose reward is the procedural causal reward (`render/episodeManager.js:968`), and explore and replay writes use the same line. `rewardSignal` feeds only `P:4176` and `P:4357`. `rewardCurrentEpisode` only adds to the context episode (`render/episodicContextEngine.js:505`), and no Q writer reads it.
- T5: partly covered. AC8 binds `S` for the main TD write. It does not bind `S′`, and no criterion names the post-reset position.
- T8: partly covered. AC11 covers the cap. Section 9 has a step-150 row, but no criterion states it.

**Proposed amendments, not adopted.** Each is the smallest text that closes its gap. None is added to Section 7.

| Id | Closes | Proposed criterion | Type | Why it is needed |
|---|---|---|---|---|
| PA1 | T4 | No Q write has `S=k(g)`, commit writes included | U, R | T4 is a stand-alone invariant with no test |
| PA2 | T9, D14 | Every main TD write takes its reward input from `rewardSignal`. No Q write reads a value set by `rewardCurrentEpisode` | U | D14 and T9 have no test |
| PA3 | T5 | Every main TD write uses the bound `S` and `S′`. No Q write uses the post-reset position | U | AC8 stops short of `S′` and reset |
| PA4 | T8 | GOAL_OK on step 150 is terminal. A slip on step 150 truncates at the next step start | U | Section 9's row has no criterion |
| PA5 | D11 | The traversal record holds one entry per attempted legal edge, goal edges included, from a single writer | U, R | D11 has no test |
| PA6 | E-3 | A forced non-edge pair is refused: the agent stays, the step is consumed and the event is counted | U | Section 9's row has no criterion |
| PA7 | D17b, FR-B | Each TC-2 session records its S0 conditions, arm OFF, PE pin off and D10 credit active. A session that departs from them is refused | S, R | Neither has a criterion |
| PA8 | FR-D | Requested steps, executed steps, call exposure, Attempts and timer ticks are recorded separately, and executed steps never exceed requested steps | R | AC21 does not state the hard budget |
| PA9 | C11 | No writer gains a new call site to restore lost cadence | S | The mechanism boundary has no test for rerouting |

### 16.9 Clarifications requested

1. Approve, change or reject the AC23 numbers: the mutant suite, the worlds and the step count.
2. Confirm that the D10 writer sits inside the guard set. Run C would then keep Hook State P's four fields while its effective credit is D10. The alternative is a separate credit switch and a fourth configuration.
3. Decide whether a D17b stratum is within AC23's scope, given that no matched baseline exists.
4. Approve, change or reject PA1 to PA9.
5. Confirm T9's scope. The proposed reading is the main TD write, with commit, explore and replay writes staying as CL-A and C4 record them.
6. Define the D15 environment for parity runs: the per-edge reliability values and their source.
7. Rule on the gate objective, or accept it as a disclosed limitation.

### 16.10 Freeze-gate verdict

**Verdict: NOT READY FOR DOCUMENTATION FREEZE.** Mandatory definitions remain unresolved: items 1 to 6 of Section 16.9 all bear on the contract's definitions or its acceptance set. This verdict is about documentation. A documentation freeze, when reached, would not be a claim of behavioural correctness, runtime acceptance or any improvement in the agent.

Remaining blockers:

| Area | Blocker | Kind |
|---|---|---|
| Definitions | Section 16.9 items 1 to 7 | Director decision |
| Acceptance coverage | T4, T9, D11, D14 and FR-B have no criterion. T5, T8, E-3, D17b, FR-D and C11 are partly covered | Director decision |
| Derived tree and driver | No derived tree, TC-2 driver, per-call rows, attribution table or D15 environment exists | Artifact |
| AC23 | Baseline rebuild, all runs, static checks and mutant fixtures | Runtime |
| T3 and M2 | M2 is not implemented or approved. The inventory must be re-derived on a derived tree. AC10 is unrun | Runtime |
| T4 | No criterion, no derived-tree inventory, no runtime evidence | Decision and runtime |
| D17b | All validation in Section 16.3 | Runtime |
| Budget | Call-level confirmation, the future driver, and the five-call re-derivation | Runtime |
| Freshness | Writer list on the tree under test, four assumptions, AC7, AC25 to AC29, AC32 | Runtime |
| AC38 | Feasibility study, then acceptance | Feasibility, then runtime |
| D16 | Record immutability and unreadability: AC17, AC33 and Section 9's row | Runtime |
| Source records | Unrealized nodes in stored episodes, where the source answer in Section 15.9 awaits acceptance. Non-fresh prediction calls on other trees | Director decision |
| All criteria | AC1 to AC38 are unrun | Runtime |

Open markers: [OPEN-T3], [OPEN-DoubleGoal], [OPEN-FreshMech], [OPEN-Budget] and [OPEN-A4]. AC23 and AC38 stay open and non-executable. TC-2 remains design-only and paused.

## 17. Clarification rulings (DIRECTOR RULING, provisional; D-041)

FC-1 to FC-7 come from the Research Director's TC-2 clarification directive. That directive calls them Rulings 1 to 7. This record renames them so they are not confused with earlier rulings. This section is their first repository copy.

The paragraphs marked "Ruling" state the Director's rulings. They are policy directions and replace no required source or runtime evidence. "Recommended" marks text awaiting a ruling. Everything else is a source finding or reconciliation wording. Where this section differs from Sections 13 to 16, this section governs.

This section adds AC39 to AC48 and corrects T9. It changes no other text of T1 to T9, the Part D table, D12b or any existing criterion. It closes no open marker. It authorizes no implementation, test, run, instrumentation or feasibility study. No criterion has been run or passed, and the contract is not frozen. Line references follow Section 14's rule. Source trace is not runtime evidence.

### 17.1 FC-1: AC23 test parameters

Ruling. 10 mutants, 10 development worlds and 12,000 study steps are approved as the proposed initial test plan, subject to confirming that they conflict with no binding requirement. They are initial test parameters only. They do not establish statistical sufficiency or prove cognitive improvement. Mutant selection requires a source-backed inventory. The world list, seeds and environment must be identified reproducibly. No run is executed.

**Conflict check.**

| Parameter | Binding item checked | Finding |
|---|---|---|
| 12,000 steps | FR-D hard budget | No conflict. The value is a requested budget. The ACQ-1 driver's present call would make 12,005 calls, which FR-D makes invalid, so a future driver must not pass it unchanged |
| 12,000 steps | E-6, T7, T8 | No conflict |
| 10 worlds | SC-A's "development worlds", `DEV_INDICES` | No conflict |
| 10 worlds | ACQ-1 is not evidence | No conflict. The indices are shared, and no ACQ-1 result is used |
| 10 mutants | Section 7: general mutants "are not approved acceptance criteria" | No conflict. Membership is a test parameter, and a mutant does not become a criterion |
| 10 mutants | FC-3 excludes D17b from the AC23 parity stratum | Surfaced. Mutant 10 needs D10 active, so it cannot run in Runs A, B or C. Mutants are fixture checks, not parity runs, so it runs in Configuration V (Section 17.3). No ruling is contradicted |

**Mutant inventory.** Each mutant restores a behaviour on a derived tree. Mutants 2 and 3 are design alternatives with no pinned code of their own. No mutant exists yet, and this list is not a claim of sufficiency.

| # | Mutant | Behaviour restored | Pinned site | Target |
|---|---|---|---|---|
| 1 | Carried retry allowed | A non-fresh call attempts from carried reasoning | `P:3955`, `P:5026` | AC25 |
| 2 | Origin check instead of freshness | Freshness replaced by comparing position with `reasoning.from` | `P:3644` | AC25, AC28 |
| 3 | Reset clearing only | Carried reasoning cleared only at reset. Pinned reset clears only `lastDecision` | `P:4872` | AC25 |
| 4 | Stale self-pair reaching the environment | The self test compares the target with `reasoning.from` | `P:3683` | AC26 |
| 5 | Replay moving the agent | Traversal runs on a non-fresh call | `P:5069-5070` | AC31 |
| 6 | Restored goal skip | Goal edges skip the verdict | `P:5001`, `P:5025` | AC2 |
| 7 | Lagged `S` | `agentLast` is used as the state | `P:4174` | AC8, AC41 |
| 8 | Pre-verdict write | The section runs before the verdict | `P:3967`, `P:5026` | AC1 |
| 9 | Terminal bootstrap | A goal write bootstraps | `P:4177`, `render/episodeManager.js:1003` | AC10 |
| 10 | Extra trust writer | A legacy writer runs beside D10 | `P:4484`, `P:4681`, `render/episodeManager.js:1092` | AC13 |

The world list is Section 15.2's: indices 0 to 9 and their configuration seeds. Section 17.6 covers seeds and environment.

### 17.2 FC-2: guard set and D10

Ruling. The D10 writer is not automatically placed in the guard set. The exact guarded code paths, the relationship between D10, credit configuration and guarded behaviour, and whether the three runs would conflate two independent changes must first be identified. The narrowest guard definition consistent with the design records is recommended. A binding decision that requires D10 in the guard set would be reported as a conflict. No runtime code changes.

**Binding-decision check.** No binding decision places D10 in the guard set. D10 and D17b bind the TC-2 configuration, not a switch. FR-A's ruling text does not mention D10. Section 16.1's phrase "every code path a derived tree adds" was reconciliation wording, and Section 16.9 asked for confirmation. So there is no conflict to stop on.

**Relationship between D10 and guarded behaviour, by source trace.**
- Trust reaches decisions. `getPathTrust` feeds `bayesianTrust` (`P:2301-2304`), which scores as `(bayesianTrust - 0.5) * 8` (`render/scoring.js:184`). Under arm OFF the value passes unchanged (`experiments/m7/arms.js:139-140`).
- So changing the trust writers can change decisions, independently of transition order.
- Hook State P has `creditMode: 'off'`, and Section 14.1 records that no hook state supplies D10 credit. An active D10 writer is therefore a departure from Hook State P's legacy credit, and SC-A requires the two compared runs to share Hook State P.
- Coupling that remains: `P:4484` sits inside the section, so a guard that skips the section on slips (D8) also removes those legacy attempt calls. Run C's trust counts therefore differ from Run B's even with D10 out. This follows from a guarded clause and is attributable to it, but Run C's trust values have no contract meaning.

**Would the three-run comparison conflate two changes?** With D10 inside the guard set, yes: B against C would change transition behaviour and the trust writers together. With D10 outside, the writer set stays the same, and only the coupling above remains.

| Option | Effect | Risk |
|---|---|---|
| D10 inside the guard set | Run C is the TC-2 configuration | Two changes under one variable. Conflicts with SC-A's matched Hook State P and with FC-3's exclusion |
| D10 outside, on a separate credit switch (recommended) | One variable in B against C. Consistent with SC-A and FC-3 | Run C is a comparison configuration only, and the TC-2 configuration gets no parity |

**Recommended guard definition, awaiting a Director ruling.** One switch covers these paths, and the D10 writer is not among them. Pinned sites are where the behaviour lives today.

| Behaviour | Clause | Pinned sites |
|---|---|---|
| Verdict before the section; section on realized moves only | O1, D8 | `P:3967-4970`, `P:5024-5027` |
| Goal edges reach the environment | O1, D15 | `P:5001`, `P:5025` |
| State and next-state binding | O2, T5 | `P:4174`, `P:4177`, `P:4226`, `P:4355`, `P:4358`, `P:4967` |
| No attempt or transition pass on a non-fresh call | R3, C1 | `P:3955`, `P:5024-5027`, `P:5069` |
| PE after the verdict, realized moves only | O1, D4 | `P:4133` |
| Memory holds realized nodes only | D13, D16 | `P:4490`, `P:4502` |
| Reset last | Section 6.1 step 17 | `P:4821-4869` |
| Traversal record covers goal attempts | D11 | `P:5065` |
| Outcome record | D16 | New path, no pinned site |
| Terminal bootstrap | T3 | `P:4177`, `render/episodeManager.js:1003`. Mechanism not approved |

Outside the guard: the trust writers `P:4484`, `P:4681` and `render/episodeManager.js:1092`, the credit site `P:5048`, D15's stream, which is part of the environment, and everything Section 16.1 lists as not controlled.

If confirmed, D10 moves to a separate credit switch. The attribution clause list in Section 16.1 then drops D10, and the guard-on, D10-on state is Configuration V. A guards-off state with D10 on has no contract role.

### 17.3 FC-3: D17b

Ruling. D17b is excluded from the initial AC23 parity stratum. Where it stays mandatory under the TC-2 contract, it stays a separate validation obligation. Hook State P parity is not claimed to validate D17b. No test is executed.

D17b stays mandatory (Section 16.3). This ruling settles Section 14.1's conditional stratum: there is no D17b stratum in initial AC23.

| Test | Tree | Guard | Credit | Hook fields | Supports | Does not support |
|---|---|---|---|---|---|---|
| Run A | Pinned | None | Legacy | Hook State P | Reference for Run B | Anything about D10 |
| Run B | Derived | Off | Legacy | Hook State P | With Run A, off-state inertness | D10, D17b |
| Run C | Derived | On | Legacy | Hook State P | With Run B, a matched comparison | TC-2 conformance, D10, D17b |
| Configuration V | Derived | On | D10 | Arm OFF, PE pin off | TC-2's required configuration, once its criteria pass | Parity: it has no matched baseline |
| Mutants 1 to 10 | Derived | On | D10 | As Configuration V | Each target criterion can fail | Parity |

This table depends on the Section 17.2 recommendation. TC-2's behavioural criteria run in Configuration V unless a criterion says otherwise.

**Missing prerequisites.** A derived tree, a D10 credit switch, a TC-2 driver, and any baseline that has D10 credit. No such baseline exists, and none is invented.

**Evidence eventually required for D17b.**
1. AC46 passes: arm, credit and pin values are recorded and independently checked.
2. AC13 and AC14 pass in Configuration V.
3. A static audit shows that `P:4484`, `P:4681` and `render/episodeManager.js:1092` do not run there.
4. AC12 and AC34 pass, as D17b's slip clause requires.
5. A disclosed statement of the missing parity baseline.

### 17.4 FC-4: amendment disposition

Ruling. PA1 to PA9 are not adopted as a batch. Each is assessed alone. Only changes that are necessary, precisely worded and consistent with binding requirements are adopted. Any that changes intended behaviour or conflicts with a ruling is flagged for Director review.

| Id | Exact existing requirement | Exact adopted text | Affected criterion | Failure mode | Why existing criteria fall short | Evidence | Scope change | Disposition |
|---|---|---|---|---|---|---|---|---|
| PA1 | T4: "No Q write has `S=k(g)`." | No Q write by any path, main TD, explore, commit or replay, has `S=k(g)` | New AC39 | A Q write out of the goal state | AC8 covers the main TD write only, and AC10 covers bootstrap only | Section 14.3, routes 6 and 8 | None | Adopted, reworded to name every path |
| PA2 | T9: "The Q reward input is `rewardSignal`. `rewardCurrentEpisode(10)` has no contract role." | Every main TD write takes its reward input from `rewardSignal`. Every explore, commit and replay write takes the procedural causal reward. No Q write takes a reward input from `rewardCurrentEpisode(10)` | New AC40 | A wrong reward input on any path | No criterion. PA2's main-TD-only text falls short of FC-5 | Section 17.5 | Corrects T9's wording under FC-5. Behaviour unchanged | Replaced, then adopted. T9 correction flagged |
| PA3 | T5: "Q writes use bound values, never the post-reset position." | Every main TD write and explore write uses the bound `S` as its state and, where it bootstraps, the bound `S′` as its next state. No Q write uses a key built from the post-reset position | New AC41, alongside AC8 | A lagged state, or a key from the post-reset position | AC8 binds `S` for the main TD write only | Section 8; `P:4174`, `P:4177`, `P:4967` | None | Adopted, reworded to cover explore writes and `S′` |
| PA4 | T8: "GOAL_OK on step 150 is terminal. A slip on step 150 truncates at the next step start." | GOAL_OK on step 150 is terminal. A slip on step 150 truncates at the next step start | New AC42, alongside AC11 | A wrong boundary at step 150 | AC11 covers the cap only. Section 9's row has no criterion | `P:1055`, `P:3274`, `P:3303` | None | Adopted, in T8's own words |
| PA5 | D11: "The traversal record covers every attempted legal edge, goal edges included, with a single writer" | The traversal record covers every attempted legal edge, goal edges included, with a single writer | New AC43 | Goal attempts missing, or a second writer | No criterion. PA5's "one entry per attempted legal edge" misread the store, which keeps counts per edge | `render/traversalRecord.js:103-124`, `P:5065` | None | Adopted, reworded to D11's words |
| PA6 | E-3: "Non-edge pair: refused, agent stays, step consumed, counted" | A forced non-edge pair is blocked by the legality guard or refused by the environment. In either case the agent stays, no verdict exists, the step is consumed and the event is counted | New AC44, alongside AC2 | A non-edge moves the agent or consumes no step | AC2 covers the verdict only | Part D's BLOCKED and REFUSED rows; `P:3646`, `experiments/coga/acq1/env.mjs:27` | None | Adopted, reworded because the legality guard stops a non-edge before the environment |
| PA7 | FR-B: "Adopt S0 as the proposed initial scope: fixed goal, cold store, one Space press and no home set." D17b: "Arm OFF, credit on as defined by D10, PE pin off." | AC45: Each TC-2 session records its S0 conditions. A session that departs from any of them supports no S0 conclusion. AC46: A run in Configuration V records arm OFF, PE pin off and credit as defined by D10, and each value is independently checked | New AC45 and AC46 | A session outside S0, or an unverified configuration | No criterion. PA7 joined two requirements, and "D10 active" for every session would conflict with FC-3 | Sections 16.2, 17.3 | PA7's refusal clause was not in FR-B and is dropped | Split, then adopted |
| PA8 | FR-D: "A session that exceeds its declared budget is invalid." | Requested steps, executed study steps, `runAgent` call exposure, contract Attempts and harness timer ticks are recorded separately. Executed steps never exceed requested steps, and a session that does is invalid | New AC47, alongside AC21 | A silent overrun, or merged fields | AC21 does not state the hard budget | Section 16.4 | None | Adopted |
| PA9 | C11: "No writer is rerouted to restore lost cadence." | Every writer call site the derived tree adds is named by a contract clause, and none exists to restore lost cadence | New AC48, alongside AC33 | A writer rerouted for cadence | No criterion. PA9's wording tested intent only, and D10's own new site would have needed an exception | C11, D10 | None | Adopted, reworded to a static check |

Flagged for Director review: only the T9 correction, in Section 17.5. No amendment changes intended behaviour.

### 17.5 FC-5: T9 and Q-write rewards

Ruling. T9 must address every applicable Q-write path in the approved TC-2 scope, not merely the main TD writer. `rewardCurrentEpisode` is not claimed to reach a Q writer unless source establishes it. Inconsistent wording gets a precise correction, with the historical wording preserved in the decision record. Q-write behaviour does not change.

| Path | Write operation | Reward input | In S0 | Criteria | Evidence still required |
|---|---|---|---|---|---|
| Main TD | `P:4173` | `rewardSignal` (`P:4176`) | Yes | AC9, AC10, AC15, AC40 | Fixture and spy on a derived tree |
| Main TD, else branch | `P:4354` | `rewardSignal` (`P:4357`) | Yes. Not expected on attempts (CL-A) | AC9, AC40 | Same |
| Explore | `P:4967`, `render/episodeManager.js:412`, `:899`, `:1003` | Causal reward (`:968`), authority 0.30 (`:68`) | Yes | AC40, AC41 | Same |
| Success commit | `P:4596`, `render/episodeManager.js:344`, `:840`, `:1003` | Causal reward, authority 1.00 (`:60`) | Yes | AC5, AC10, AC40 | Same |
| Replay | `P:3483`, `render/episodeManager.js:525`, `:840`, `:1003` | Causal reward, authority 0.40 (`:84`) | Yes. Keys are `x#0` | AC37, AC40 | Same |
| Manual commit | `P:5460`, `render/episodeManager.js:241`, `:263`, `:1003` | Causal reward, authority 0.90 (`:76`) | No | None in S0 | Not applicable in S0 |
| Seal bridge | `P:927`, `render/episodeManager.js:344` | Causal reward | No. Forbidden and inert | AC38 | As AC38 specifies |

The causal reward is `8 * gain * (1 + causalBonus)` (`render/episodeManager.js:968`), with gain from authority and quality (`:914`). Other Q mutations have no reward input: `P:3393`, `P:4225`, `P:1427`, `P:803` and `P:5356`.

`rewardCurrentEpisode(10)` (`P:4831`) only adds to `currentEpisode.reward` (`render/episodicContextEngine.js:505`). None of the listed Q writes takes that value. No source route to a Q writer was found.

**Corrected T9 (D-041).** "The main TD write's reward input is `rewardSignal`. Explore, commit and replay writes use the procedural causal reward. No Q write takes a reward input from `rewardCurrentEpisode(10)`, which has no contract role."

D14's sentence "`rewardSignal` is the Q reward input" reads the same way. This correction matches CL-A, C4 and Ruling A, and it changes no behaviour. It does alter approved wording, so it is flagged for the Director, who may reverse it.

### 17.6 FC-6: parity environment

Ruling. A reproducible parity environment is defined from existing contract and source evidence. Each field names its authoritative source and whether it is fixed or still needs a decision. No environment value is invented, and no parity run is executed. AC23 stays open and non-executable until the required definitions are complete.

| Field | Value or rule | Authoritative source | Status |
|---|---|---|---|
| Run A tree | Section 1 hashes | Section 1, `experiments/learn0/config.mjs:22-26` | Fixed. Rebuild match outstanding |
| Runs B and C tree | One additive derived tree | Section 16.1 | Artifact missing |
| Driver | One TC-2 driver for all runs | SC-A | Artifact missing |
| Node runtime | The same binary in every compared pair, version recorded. v24.15.0 was recorded earlier (`experiments/coga/M1_AUDIT.md:4`) | Section 16.1 | Rule fixed. Pinning a version needs a decision |
| Dependencies | None: no `package.json`, and THREE is stubbed (`benchmarks/harness/headlessShim.js:42`) | Source | Fixed |
| World | Stream `study`, indices 0 to 9, Section 15.2's seeds, checked by `generateAccepted` (`experiments/coga/acq1/session_mfw.mjs:80-81`) | FC-1 | Fixed |
| Goal | `GOALS[configIndex % GOALS.length]` (`experiments/m7/env.js:166`) | Source | Fixed |
| Reliability values | Candidate: `pOf(world, env)`, either `world.p1` or `world.p2` (`experiments/coga/acq1/states.mjs:32`). E-4 leaves them study-supplied | E-4 | Needs a decision |
| Verdict rule | `u(e,j) < p_e` on per-edge streams. The ACQ-1 environment has this form (`experiments/coga/acq1/env.mjs:17`, `:29`) | D15 | Rule fixed |
| Agent identity | One id in all runs. Candidate: `MFW-P`, the pinned tree's id (`experiments/coga/acq1/session_mfw.mjs:93`) | SC-A | Needs a decision |
| Agent seed | `streamSeed(agentStream(world.id, agentId, env))` (`experiments/coga/acq1/session_mfw.mjs:94`) | Source | Fixed once the two decisions are made |
| Fixed clock | `CLOCK`: VIRTUAL, t0 1767225600000, delay 500, with the pinned preload | `experiments/coga/config.mjs:33` | Fixed |
| Hook state | Hook State P | `experiments/coga/config.mjs:32` | Fixed |
| Credit | Legacy writers in Runs A, B and C | Sections 17.2, 17.3 | Depends on the guard ruling |
| Legality guard, map block | Both on | `experiments/coga/acq1/session_mfw.mjs:103`, `:107` | Fixed |
| Harness switches | Episode cap and deterministic replay cooldown | `experiments/m7/run.js:189`, `:207` | Fixed |
| Steps | 12,000 requested, `tickUnit: 'step'` | FC-1, FR-D | Fixed. Driver outstanding |
| Initial state and store | One fresh process, empty Q, cold store asserted | `render/qlearning.js:12`, `experiments/m7/run.js:223-231` | Fixed |
| Network | None. The fetch stub reads repository files (`benchmarks/harness/headlessShim.js:118-123`) | Source | Fixed |
| Refused settings | The environment variables at `experiments/coga/acq1/session_mfw.mjs:31-32` and preload flags at `:63` | Source | Fixed. A fork must keep them |
| Output capture | The record fields, written once to stdout (`experiments/coga/acq1/session_mfw.mjs:129`), console quiet (`experiments/phase1_0/_driver.js:22`) | Source | Fixed. A fork must keep them |
| Comparison rules | Section 16.1 | FR-A | Fixed |

The environment code above is a source candidate only. CR-1 states that ACQ-1 does not govern TC-2.

### 17.7 FC-7: gate objective

Ruling. The gate's objective is to check documented contract compliance, reproducibility requirements and evidence integrity. The gate distinguishes documentation checks, static source checks, runtime acceptance tests, and experiments evaluating learning or cognitive performance. A pass in one category must not be represented as a pass in another.

| Category | What it checks | Status today |
|---|---|---|
| 1. Documentation checks | Wording, references, history, status labels | Performed per milestone |
| 2. Static source checks | Code structure, as in AC23's static checks and criteria of type S | Not performed as acceptance. Source trace here is a design finding |
| 3. Runtime acceptance tests | Criteria of type U and R | None run |
| 4. Experiments | Learning or cognitive performance | None authorized |

**What the current documentation gate can establish.** That cited lines exist and say what is claimed. That protected text is unchanged. That labels and markers are consistent. That no criterion is recorded as passed.

**What it cannot establish.** Runtime behaviour, correct code, a passed criterion, a complete inventory on any other tree, or any learning result. It is a scratch script and is not committed, so a reader cannot rerun it from the repository.

**Scope note.** Section 11's "The gate objective" and D13's "objective unspecified" refer to D13's reward gate, which is a different gate. FC-7 defines the verification gate. D13's objective stays as a disclosed limitation. AC15 fixes the gate's behaviour, so no criterion depends on it. The source comment names an anti-farming purpose (`P:4031-4043`).

### 17.8 Adopted criteria

These criteria are adopted by D-041 under FC-4. They are UNRUN CRITERIA, and each runs in Configuration V unless stated.

| ID | Text | Type | Note |
|---|---|---|---|
| AC39 | No Q write by any path, main TD, explore, commit or replay, has `S=k(g)` | U, R | T4. `k(g)` is `g#g` (Section 14.3) |
| AC40 | Every main TD write takes its reward input from `rewardSignal`. Every explore, commit and replay write takes the procedural causal reward. No Q write takes a reward input from `rewardCurrentEpisode(10)` | U | T9 as corrected, D14 |
| AC41 | Every main TD write and explore write uses the bound `S` as its state and, where it bootstraps, the bound `S′` as its next state. No Q write uses a key built from the post-reset position | U | T5 |
| AC42 | GOAL_OK on step 150 is terminal. A slip on step 150 truncates at the next step start | U | T8 |
| AC43 | The traversal record covers every attempted legal edge, goal edges included, with a single writer | U, R | D11 |
| AC44 | A forced non-edge pair is blocked by the legality guard or refused by the environment. In either case the agent stays, no verdict exists, the step is consumed and the event is counted | U | E-3, Part D |
| AC45 | Each TC-2 session records its S0 conditions. A session that departs from any of them supports no S0 conclusion | S, R | FR-B. Also applies to Runs A, B and C. Forced fixtures are not sessions |
| AC46 | A run in Configuration V records arm OFF, PE pin off and credit as defined by D10, and each value is independently checked | S, R | D17b |
| AC47 | Requested steps, executed study steps, `runAgent` call exposure, contract Attempts and harness timer ticks are recorded separately. Executed steps never exceed requested steps, and a session that does is invalid | R | FR-D. Also applies to Runs A, B and C |
| AC48 | Every writer call site the derived tree adds is named by a contract clause, and none exists to restore lost cadence | S | C11 |

### 17.9 Coverage resolution

Coverage is about wording. Every result stays UNRUN.

| Requirement | Definition | Criteria | Coverage | Runtime evidence required |
|---|---|---|---|---|
| T4 | Section 6.2 | AC39 | Adequate as wording | Spy on every Q write, S0 sessions and forced fixtures |
| T9 | Section 17.5 | AC40 | Adequate as wording | Spy on each path's reward input |
| T5 | Section 6.2 | AC8, AC41 | Adequate as wording | Fixture covering `S′` and goal reset |
| T8 | Section 6.2 | AC11, AC42 | Adequate as wording | Step-150 goal and slip fixtures |
| D11 | Section 4 | AC43 | Adequate as wording | Fixture, plus a static writer audit |
| D14 | Section 4, read with Section 17.5 | AC40 | Adequate as wording | Same as T9 |
| FR-B | Section 16.2 | AC45 | Adequate as wording | Recorded session conditions |
| E-3 | Section 3 | AC2, AC44 | Adequate as wording | Forced non-edge fixtures |
| D17b | Section 4 | AC12, AC13, AC14, AC34, AC46 | Adequate as wording | Section 17.3's list |
| FR-D | Section 16.4 | AC21, AC47 | Adequate as wording | Recorded counts, call-level confirmation |
| C11 | Section 4 | AC33, AC48 | Adequate as wording | Static audit of a derived tree |

Still partial: D12a has no criterion, and D6 is a prerequisite and not a criterion. Neither was in the reported gap list. Recommended for D12a, not adopted: "On every call where `lastDecision` exists, `updateBehavior` runs once at its existing place."

The T4 criterion rests on `k(g)` being `g#g`. If T4 was meant to cover the goal node under any goal namespace, AC39 would be too narrow. No record says so, so this reading is reported and not extended.

### 17.10 Freeze assessment

**Verdict: NOT READY FOR DOCUMENTATION FREEZE.** Three mandatory definitions remain unresolved. A documentation freeze, when reached, would not be a claim of runtime correctness or any improvement in the agent.

| Category | Items |
|---|---|
| Resolved policy questions | AC23 parameters, D17b's exclusion, PA dispositions, the T9 correction (flagged), the verification gate's objective, S0, the hard budget, A4 classes |
| Unresolved contract definitions | 1. The Section 17.2 guard definition and separate credit switch. 2. The parity reliability values. 3. The parity agent id |
| Missing acceptance coverage | None in the reported list, as wording. D12a stays partial |
| Missing source evidence | Re-derivation on a derived tree: bridge-path inventory, `k(g)` routes, `lastReasoning` writers, five-call conditions and mutant sites. Unrealized-node finding awaits acceptance. Non-fresh prediction calls on other trees |
| Missing artifacts | Derived tree, D10 credit switch, TC-2 driver, per-call rows, attribution table, mutants |
| Missing runtime evidence | Baseline rebuild match; AC23's runs; AC1 to AC48; budget confirmation; T3, M2 and T4 on a derived tree; freshness assumptions; D16 immutability and unreadability; Section 17.3's D17b evidence |
| AC38 feasibility | Write observation, test access and stream deltas, then AC38 itself |
| Other | M2 is not approved. [OPEN-DoubleGoal] stays undecided. A Node version pin is optional and undecided |

Open markers: [OPEN-T3], [OPEN-DoubleGoal], [OPEN-FreshMech], [OPEN-Budget] and [OPEN-A4]. AC23 and AC38 stay open and non-executable. No criterion has been run or passed. TC-2 remains design-only and paused.
