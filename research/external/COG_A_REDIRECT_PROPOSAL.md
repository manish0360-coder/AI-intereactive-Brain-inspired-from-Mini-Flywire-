# Proposal: finish T-build, pause CREDIT-1, and turn MiniFlyWire into a mechanism testbed (COG-A)

Prepared 2026-10-28 for Director ruling and Gemini review. Owner: Manish Kumar.
Status: proposal only. Nothing in it is authorized, implemented or run. Repository HEAD `cb7e015` (7 local commits ahead of origin).

## 1. Problem: the method is strong, but the agent has not moved toward the goal

- **North Star** (`research/00_research_vision_v2_draft.md` §2): *which computational mechanisms are necessary and sufficient for an
  artificial system to acquire, organize, construct, transfer, and apply knowledge through continuous interaction with its environment?*
- **Phase 0 verdict** (`research/cognitive-audit/05_VERDICT.md`): MiniFlyWire is not cognitive. "The loop cannot be completed by any
  amount of work on the loop", and the minimum missing mechanism is **an environment with hidden structure**. Its sequencing step 4
  (delete or quarantine the nine NOT-USED subsystems) has not been done.
- **No runtime commit since 2026-09-20** (`952c9fc`, FutureScore V2.3). Every milestone after that (GATE-FLOOR-*, LEARN-0, CREDIT-1)
  measured the existing agent in **hook state P**, where M7's hidden-structure hooks are off (`experiments/credit1/DESIGN.md` §Q,
  `experiments/learn0/DESIGN.md` N1).
- **Recent results:**
  - LEARN-0 E1 was INCONCLUSIVE.
  - CREDIT-1 needs n = 1,208 per cell (10,872 sessions), and 1,572–2,284 if the P2 quartet clustering is real (ICC 0.30).
  - Even if CREDIT-1 succeeds, the best case is a credit-keying repair in an agent that the audit says is not cognitive.
- **Conclusion:** our infrastructure is the asset: preregistration, gates with mutation tests, reproducibility, and the M7 world.
  Spending it on more studies of the current agent in state P does not answer the North Star.

## 2. Proposal

Make MiniFlyWire a **testbed**:

- put the M7 world (hidden reliabilities, phase swap) behind a `reset()` / `step(action)` interface (Gymnasium style);
- add a five-task battery that only a learned world model can pass;
- plug in proven mechanisms as agents and compare them under our gates;
- integrate the winner into MiniFlyWire.

All tasks run map-off, so no oracle can solve them.

| task | North Star verb | measure (first post-change episodes vs. a cold control) |
|---|---|---|
| Latent learning | acquire | reward-free exploration first, then the goal appears: steps-to-goal vs. the same agent with no exploration |
| Detour | construct | an edge on the learned route is removed: first-episode steps vs. the optimal detour and vs. a cold agent |
| Revaluation | apply | the goal moves to a known node: first-episode steps vs. a cold agent |
| Hidden change | acquire / organize | M7 phase swap of hidden edge reliabilities: episodes to recover the pre-swap level |
| Transfer | transfer | pre-trained on world W1, tested on W2 from the same generator: vs. cold (XFER-1 style) |

**Agents:**
- random walk;
- the current MiniFlyWire agent;
- tabular Q-learning;
- Dyna-Q (model plus replay);
- successor representation (SR);
- a **pymdp** active-inference agent.

Q, Dyna-Q and SR are a few hundred lines each, written in JS. pymdp is Python (MIT licence, v1.0) and connects through a JSON-over-stdio
bridge. **CSCG** (Vicarious, MIT, archived; learns a cognitive map from aliased observations) is optional, once partial observability is
switched on.

**Why not attach an existing architecture or MCP:**
- **Soar and ACT-R** solve a different problem: symbolic production systems and human-timing models.
- **OpenCog Hyperon, NARS/ONA and Thousand Brains Monty** are experimental or beta, or target a different task.
- **Letta / CoALA** give memory to an LLM, not to our agent.
- **MCP** connects LLM assistants to tools. Its reference Memory and Sequential Thinking servers are teaching examples and would not make
  our agent learn anything.
- **An LLM agent** belongs, at most, as an optional baseline. CogEval (NeurIPS 2023) found that LLMs fail graph planning: they
  hallucinate edges and loop.
- Above all, plugging in a whole architecture would test that architecture, not identify mechanisms, which is the North Star's question.

## 3. Phases, effort and stop rules

| phase | work | effort | exit or stop rule |
|---|---|---|---|
| A. Testbed | interface, five tasks, deterministic clock (reuses T-build), gate | 1–2 weeks | every task reproducible bit-for-bit under the gate; if over 2 weeks, cut to three tasks |
| B. Baselines | the six agents above | 1–2 weeks | every agent completes every task reproducibly. If no agent beats random on a task, the task is not discriminating: fix the task, not the agents |
| C. Measure | exploratory comparison, then **one** preregistered decisive comparison, frozen before outcomes | ~1 week | a winner per task, or an explicit "none" |
| D. Integrate | put the winning mechanism into MiniFlyWire; quarantine dead modules (audit step 4); show beliefs or the map in the 3D view | 2–4 weeks | the integrated agent beats the current agent on the battery |
| E. Re-audit | rerun the Phase 0 audit questions and the battery | 1 week | a measurable yes on at least latent learning and detour |

Integrity rules are unchanged: freeze and push before confirmatory outcomes, no tuning after outcomes, explicit authorization for
sessions, seeds and production edits.

## 4. CREDIT-1

1. **Finish T-build.** The gate missed exactly one mutant (CM-d) because a test input was not discriminating; the code is correct. The
   fix is one added case, `{mode:'FROZEN', t0:null, delayMs:500}`, followed by the gate rerun, a fresh-clone check
   (`core.autocrlf=false`) and one local commit. The deterministic clock is needed by phase A anyway, because the current agent is a
   baseline and its schema throttle (`render/schemaMemory.js:133`) reads the wall clock.
2. **Then pause.** T-run, recalibration, D-6, freeze and confirmatory stay unauthorized, which is no change.
   - **Resume condition:** phase C shows the current agent's credit path is the bottleneck on at least one task.
   - Otherwise the lagged-credit fix is done as an engineering repair inside phase D, with no 10,872-session study.

## 5. Decisions requested

| # | who | decision |
|---|---|---|
| 1 | owner | authorize the CM-d one-case test fix and the single local T-build commit (no push) |
| 2 | Director | pause CREDIT-1 after T-build, with the resume condition in §4 |
| 3 | Director | rule on clock variant C (loop-advanced). This departs from the M7 Branch B frozen-clock precedent and is needed by both CREDIT-1 and COG-A |
| 4 | Director + Gemini | approve **COG-A design-only** as the next milestone: interface, battery definitions, pass measures, agents, gate plan. Zero sessions |
| 5 | owner | push the 7 local CREDIT-1 commits (plus T-build) so provenance is on the remote (open item B9) |

## 6. Questions for the reviewer

1. Does each task discriminate model-based from model-free behaviour in **our** world (20-node graph, stochastic edges)? Which task could
   a tuned model-free agent pass, and how should it be hardened?
2. Is anything important missing from the agent list? Is pymdp-via-bridge worth its cost against a JS active-inference baseline?
3. Does pausing CREDIT-1 after T-build lose anything the testbed cannot recover?
4. The main risk is that the testbed becomes another open-ended measurement programme. Are the stop rules in §3 enough?

## 7. Limits

- The best plausible result is **cognitive-map learning**: acquisition, detour, revaluation, adaptation and transfer in one graph world.
  It is not general cognition.
- Some ecosystem facts (Soar binding versions, Letta release numbers, Monty activity) come from third-party listings, not official pages.
- The effort figures are estimates.

## Sources

- pymdp: https://github.com/infer-actively/pymdp
- CSCG: George et al., *Nature Communications* 12, 2392 (2021); https://github.com/vicariousinc/naturecomm_cscg
- MCP reference servers: https://github.com/modelcontextprotocol/servers
- CogEval: Momennejad et al., "Evaluating Cognitive Maps and Planning in Large Language Models with CogEval", NeurIPS 2023
- SR: Dayan (1993); Stachenfeld, Botvinick & Gershman, *Nature Neuroscience* 20 (2017)
- Dyna: Sutton (1990)
- Gymnasium interface: https://gymnasium.farama.org
