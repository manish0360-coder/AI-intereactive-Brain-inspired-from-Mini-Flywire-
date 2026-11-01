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
| Contract Attempts | Attempts as defined in Section 5 | `envCounters.attempts` | Never a budget unit |
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
