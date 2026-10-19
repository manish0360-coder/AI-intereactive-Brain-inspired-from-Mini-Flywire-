# GATE-FLOOR-SCOPE (design C′) — PREREGISTRATION FREEZE RECORD

**Status: FROZEN. The confirmatory run is NOT AUTHORIZED and NOT EXECUTED.**
- No confirmatory plan was generated in the freeze milestone.
- No session has run.
- No world of block S (1392–1671) has been consumed.

The freeze is not an authorisation to execute. Execution needs the owner's separate, explicit authorisation.

| | |
|---|---|
| frozen design | commit `57beb5d258890aa16ba7c8cba986a3d8a8d43659` (the package the reviewer saw) |
| design digest / decision digest | `31d01d7c0409218ba0de12b28c33e45def1b329ae837ff12175f2b19963cf2fd` / `82f3998279b0dc55ed9e70b0aaddfb7c8032edf3df30a853c7d4bff22c08955a` |
| frozen files | the 21 tracked files of this directory at `57beb5d` other than `DESIGN.md` / `README.md`: driver, diagnostic, config, orchestrator, analysis, gate, tools, evidence. They are pinned by sha256 in [`FREEZE.json`](FREEZE.json) and are byte-identical to the reviewed commit |
| substrate | audited HEAD `0df804c…`; guard tree `main.js` `a0eb7b37…` (unchanged); production `main.js` unchanged |
| gate at the design commit | `verify_gatefloorscope.mjs`: 93 passed, 0 failed; 29 mutants caught, 0 missed (`evidence/gate_verify_cprime.log`). Regression: the frozen GATE-FLOOR-INTERACTION gate gives 87/0 checks, 20/0 mutants |
| freeze verification | `verify_freeze_cprime.mjs` (byte identity, digests, substrate, review record, mandatory statements, no confirmatory outcome, frozen decision rules) |

## Mandatory statements (they bind every report of this study)

1. **The 1,680 total sessions comprise 560 training sessions and 1,120 test sessions (280 worlds x (2 training regimes + 4 test cells)).**
2. **PS1 estimates the total effect of the specific guarded training regime, including its recorded-store artifacts; it is not the effect of a clean store.**
3. **The recording-artifact explanation of the non-graph pairs in guard-trained stores is supported by development evidence but does not establish that they are behaviourally irrelevant.**
4. **Results apply only within the specified bounds: Phase I (1,500 calls), legacy stale-keyed credit and the 150-tick episode cap (with deterministic replay, hook state P, goals {8, 12, 16, 19}).**
5. **Not established by this study: the independent effect of the execution guard without the mask, the effect of a perfectly clean store, and production readiness.**

Completeness (whether a residual illegal execution is acceptable) is an owner decision, not a statistical one. That rule is frozen as
`RULES.completeness`.

## Independent review

| | |
|---|---|
| reviewer and scope | Gemini, the independent adversarial scientific reviewer. No repository access; reviewed the self-contained package [`review/reviewed_package_cprime.md`](review/reviewed_package_cprime.md) (sha256 `bf0215214eceb7b659db31cc5fb7643e7934dbe793a0740bcbe4131035e952c2`). Output relayed by the owner |
| date | 2026-10-20 |
| verdict | **FREEZE-READY WITH EXPLICIT LIMITATIONS**: no blocking defects, no required corrections |
| non-blocking limitations | (1) G_both evaluates a store containing known non-graph recording artifacts, so PS1 is the effect of this specific, artifact-containing regime, not of a perfectly sanitised store. (2) Phase I, legacy credit and 150-tick bounds. Both are statements 2–4 above |
| record | [`review/gemini_final_review_cprime_2026-10-20.txt`](review/gemini_final_review_cprime_2026-10-20.txt), a verbatim copy. As relayed it has CRLF line endings, 4,823 bytes, sha256 `29cc6613f2a530f241c3237bdc0c9fcd1b19c9424fff4b3512ee0f9f7999ac63`. The LF-normalised content that git stores has sha256 `d229494acf372568f8558a9c4ba35dab8165a16c9fe3abc71bcd0950556f98a8` |
| prior review | design C (`2b53a7f`): LIMITED CORRECTION, with three required corrections. All were implemented in `57beb5d`, which is the design reviewed here |
| reconciliation | Research Director; freeze authorised by the owner on 2026-10-20 (freeze only) |

The reviewer flagged one open point: the I5 rule (0 EXECUTED-class non-graph pairs in G stores) detects executed artifacts but not a
subtle bias in candidate selection. The design does not change in response. It already treats PS1/PS2 as the total effect of the
regime (statement 2), and the store diagnostics report every non-graph pair class per world.

## Open operational item (not part of the design)

The Block P and Block I raw archives have **no verified off-machine copy** (`research/evidence_backup/`, status OPEN). Off-machine
backup is **not** complete.
