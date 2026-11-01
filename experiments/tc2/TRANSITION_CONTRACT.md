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
| DT3 | DIRECTOR RULING: DEFER. [OPEN-T3] stays open |
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
- Neither write is removed. Keeping both for now follows Purpose A's hold on existing writers. It is not a ruling that both are correct, and [OPEN-DoubleGoal] stays open.

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
| AC23 | Guards-off parity and mutant suite | S, U, R | Parity target OPEN; not executable |
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
| AC38 | See below | U, R | Executability OPEN; not executable |

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

Recorded verification limitation. AC38 executability is OPEN. No complete write-observation mechanism has been established. AC38(a)'s coverage must not be narrowed to ease implementation. If the later feasibility review cannot meet it, the coverage boundary returns to the Director for a ruling. No test, experiment or runtime check has been run, and no claim of complete runtime verification or test success is authorized.

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
- [OPEN-T3]: terminal-bootstrap mechanism. DT3 is DEFER. Neither M1 nor M2 is approved. Closure requires complete coverage of how a Q entry for `k(g)` could be created or become available, including replay, maintenance, persistence and restoration, other writers, and goal identity and lifecycle.
- [OPEN-DoubleGoal]: whether the main TD write and the commit write should both persist on GOAL_OK. Neither is removed meanwhile, and CL-A does not decide this.
- [OPEN-FreshMech]: how freshness is determined.
- [OPEN-Budget]: budget unit and attempts-per-step asymmetry.
- [OPEN-A4]: categories of operations D12b does not name.

Recorded unresolved:
- AC38 executability, including the test-access and stream-delta mechanisms.
- AC23's parity target.
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
