# M13 — final closure report

**Status: CLOSED, 2026-11-18,** on the owner's final review disposition. Nothing further is to be run, tuned or
reviewed under M13. Its labels (`m13|modular|*`) and graph bank are spent.

## Question and answer

**The question:** does the adopted AD-13 belief (BELIEF) keep its advantage over MBVI3, with nothing tuned, on a
structurally different family of worlds that no agent had seen?

**The answer, by the frozen rule:** **NET ADVANTAGE RETAINED ON THE MODULAR FAMILY, WITHIN THE SAFETY MARGIN.**

| Line | Verdict | Statistic (per label, 95% paired bootstrap, n = 165) |
|---|---|---|
| G0 Validity | **VALID** | core runs identical, tests 195/195, novelty holds, 0 exclusions |
| G1 Net advantage (primary) | **RETAINED** | +125.4 steps [92.0, 160.1]; standardized 0.56 (CF-06 0.44, M11 0.50); gainShape CONSISTENT |
| G2 Safety | **SAFE** | RARE cost +9.8 [3.6, 14.9], below the margin of 25 |
| G3 Recovery (secondary) | **SHOWN** | OFTEN, after reopenings +65.1 [50.9, 79.9]; gainShape CONSISTENT |
| G4 Behavioural mechanism (secondary) | **SHOWN** | OFTEN, reopened edges met and re-crossed +1.46 [1.25, 1.67] |

**Attribution (privileged diagnostic arms, exact split):**
- OFTEN: GENUINE REVERSALS. The false-alarm-only contrast does not hold (+6.7 [−1.0, 15.8]).
- Mix: GENUINE REVERSALS AND FALSE-ALARM REPAIR.

## What the record may say, and its three qualifications

**It may say:**
- the belief kept its advantage over MBVI3 on one held-out structural family, in one development-level run;
- it recovered reopened routes faster there;
- it met and re-crossed more reopened edges than MBVI3.

**It may not say** that the belief generalizes in general.

**Every one of those claims carries the three qualifications accepted in the review:**

1. **Selection.** The modular-ring family was chosen with M12's detour findings in mind, partly for its heavier
   tail of long detours. It was held out from development and from agent execution, but it was not drawn at random.
   The choice leaned toward conditions that M12's account predicts favour BELIEF.
2. **Cost.** BELIEF used more steps than MBVI3 in 133 of 165 RARE labels. "Safe" means the cost stayed within the
   pre-declared margin of 25 steps, not that there was no cost.
3. **G4 is a count, not proof.** G4 combines how often an agent meets a block with whether it then crosses again.
   Neither it nor the post-result crossing split shows that the belief, or the returning, causes the saving.

## Review

| Item | Value |
|---|---|
| Reviewer | Gemini, arranged by the owner; one bounded review of public commit `3602576` |
| Conclusion | **DEFENSIBLE WITH SPECIFIC QUALIFICATIONS** |
| Material findings | None |
| Disposition | [review/REVIEW_DISPOSITION.md](review/REVIEW_DISPOSITION.md). Accepted by the owner; verdicts preserved; the three qualifications recorded in RESULTS.md (dated amendment), here, and in PROJECT_STATE |
| Review text | [review/GEMINI_REVIEW.md](review/GEMINI_REVIEW.md), verbatim. It is a byte-for-byte copy of the file the owner supplied after the closure commit `9f13c3a`: SHA-256 `7c8ab0f5…a1c5b0d2b9`, CRLF endings kept |

## Evidence

**Commits:**

| Commit | What |
|---|---|
| `6381450` | Build |
| `b48453e` | Specification revision 2 |
| `8619d71` | Freeze |
| `b9a05e0` | Results |
| `3602576` | Review package, on GitHub |
| `b07f4be` | Push record |
| The commit adding this file | Closure |

**Frozen hashes** (`SPEC.sha256`):

| File | SHA-256 |
|---|---|
| `SPEC.md` | `d4140479…b6c430` |
| `PINS.json` | `0ffbbd84…5c5820a` (44 files) |
| `graph_bank.json` | `25e02ebb…d451253` |
| `structure.json` | `92bb4a69…bb5fd3cd` |

**Results:**
- `results/m13_result.json` is `a0cd87d4…e3390367`.
- The core rows of run A and run B both hash to `86f0bd3f…a20608e02d`. RESULTS.md §1 and the reviewed package
  shortened it wrongly as `…a608e02d`; this is a typo, corrected by erratum, and the stored hash is untouched.
- `results/SHA256SUMS` covers the 13 result files.
- The reviewed bundle is `6402fe13…cfb88f0ac9`.

**Verification:**
- **The independent check** (`results/check/verify_m13.mjs`, written before the result): all checks pass, in this
  checkout and in a fresh GitHub clone of `3602576`.
- **The G4 inputs, rebuilt from the recorder log** (`review/check_measures_from_traces.mjs`): 108 of 108 events
  agree, with 782 ground-truth checks.
- **The fresh clone of `3602576`:**
  - pins match;
  - the bank regenerates;
  - the descriptive scripts reproduce byte for byte;
  - the bundle rebuilds identically;
  - `npm test` passes 195/195.
- **The closure checks** (`review/check_closure_docs.mjs` → `.out`): all pass.
  - The frozen hashes, the pins and the result checksums still hold, the recorded verdicts are unchanged, and the
    independent check and the trace check still pass.
  - The reviewed bundle is untouched, and only documentation changed since `3602576`.
  - RESULTS.md keeps the reviewed text whole, and its links resolve.
  - Every shortened hash matches a real one, except the one recorded erratum.
  - The three qualifications and the key numbers are present.

## Remaining limitations

1. One structural family of 24-node graphs, chosen with mechanism knowledge (qualification 1). Other families and
   sizes are untested.
2. Clustering, cycles, route length and detour length move together. The study cannot say which one matters.
3. The RARE cost is real in most labels (qualification 2).
4. The mechanism evidence is observational. G4 is a count (qualification 3), and the diagnostic arms change what the
   belief records, not whether the agent returns.
5. It is development-level: one run, by the designer, with uncorrected secondary criteria. The verifier is
   independent in code path only, not in authorship.
6. G4's raw inputs can be rebuilt from stored step logs only in the 18 traced runs. In the other runs they rest on the
   run-time computation, which run B reproduced deterministically.
7. Step totals differ in scale between M11, CF-06 and M13, so the cross-study raw comparisons are rough. The
   standardized effect is the like-for-like figure.
8. The review attributes the family-selection disclosure to RESULTS §11. At the reviewed commit, the selection was
   stated in PROPOSAL.md §2 and the package's self-identified point 1, and it is now in RESULTS.md's amendment
   ([review/REVIEW_DISPOSITION.md](review/REVIEW_DISPOSITION.md), reading note). This changes no verdict.

## Consequence

None for AD-13 or the agent. Nothing in the agent, the application or any frozen record changed. Any next step is
the owner's decision, and closing M13 does not imply one.
