# CREDIT-1 — development calibration protocol (blocker BC-7)

**Status: WRITTEN, NOT AUTHORIZED, NOT RUN.**
- No calibration session, smoke session or confirmatory session may run until the owner authorizes calibration separately.
- The session lock (`lock.mjs`, `SESSION_AUTHORIZATION = null`) makes the driver refuse every session until then.
- Authorizing calibration does not authorize a freeze or a confirmatory run.

## 1. Basis and worlds
- **Development worlds only:** XFER-1 worlds 0–29. This is the precedent of LEARN-0's development calibration (`experiments/learn0/config.mjs` CALIBRATION), and these worlds lie inside the territory LEARN-0 records as used by earlier studies (0–1391).
- **No world of the CREDIT-1 confirmatory territory (from index 2032) is used. No seed or world index is generated.**
- **Pairing:** worlds 0–29 are taken as quartets 0–27 (seven quartets, 28 worlds), so π stays inside the set. Worlds 28–29 run the six core cells and N1A_noQ only (no swap cells).

## 2. Cells and trees
- **The 9 cells** of `config.CELLS`. The A+ module cells are excluded unless the owner separately authorizes the A+ module (`lock.mjs`).
- **Trees:**
  - tree A (main.js sha256 `e5c8a8b1…`) for L and A cells;
  - tree A+ (`5ee142a1…`) only for module cells.
  - Both are built by `transform.mjs` from the pinned LEARN-0 tree and checked by the gate before any session.
- **Ledger:** `full` in every calibration session.

## 3. Ordered steps and pass rules (any failure stops calibration and is reported; nothing is weakened)

| step | what | pass rule |
|---|---|---|
| C-0 | gate `verify_credit1.mjs` on the commit to be used | every check PASS, every mutant caught |
| D-0 | determinism baseline: 4 LEARN-0-tree sessions run twice | 100 % identical session records |
| D-1 | off-parity: tree A with no `__CREDIT1__` global vs the LEARN-0 tree, the L-cell procedures on ≥ 10 worlds | 100 % identical fingerprint, `writesSha256`, end-brain and component hashes, reach call lists, move counters, guard and oracle counters, condition integrity |
| D-1c | **coverage criterion** for the D-1 set: each event class in `config.EVENT_CLASSES` (except the two A+ classes when the module is not authorized) observed at least once, together with map on, map off, stored, cold, training and test | every listed class ≥ 1 |
| D-2 | `{ aligned: false }` with telemetry and ledger installed vs D-1 | 100 % identical |
| D-3 | instruments in aligned cells: I-CRED and I-LEDGER | I-CRED PASS and I-LEDGER PASS in every A cell. In every L training session, I-CRED is DISCRIMINATING (identity rate < 1) and I-LEDGER shows a LEGACY_PATTERN (legacy non-edge writes > 0). |
| D-4 | goal-redirect counters (survival, recovery) | 0 in every cell |
| D-5 | goal check for the pairing: each development world's goal as recorded by its sessions | equals GOALS[w mod 4] for every world. Otherwise the swap pairing is recomputed from the recorded goals before analysis, and the deviation is disclosed. |
| C-1 | SDs for P1 and P2 (P2's difference in differences estimated directly), over the 28 quartet worlds | reported; n computed by `config.nFor` (larger of P1 and P2, multiple of 4) |
| C-2 | descriptive rates | self-target candidate evaluations; carried-decision share; fallback-branch share; edge-filtered firing rate under L (checks the 7.3 % uniform-walk figure); throughput (sessions per minute with the full ledger) |

## 4. What may change after calibration
- **Only n** (C-1).
- Any other change (arms, cells, margins, labels, claims, instruments) is a disclosed revision made before freeze, reviewed again.
- Calibration outcomes are never used to choose arms, margins or claims.

## 5. Outputs
- Session records go to a git-ignored `experiments/credit1/data/` directory.
- A calibration summary, the parity and coverage report and the instrument report are prepared for the owner's review. **Nothing is committed without authorization.**
