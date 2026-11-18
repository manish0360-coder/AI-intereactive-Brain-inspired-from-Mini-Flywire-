# M13 — independent review and its disposition

**Date:** 2026-11-18.

**Status:** the review is accepted by the owner. M13 is CLOSED; see [../CLOSURE.md](../CLOSURE.md).

## The review

| Item | Value |
|---|---|
| Reviewer | Gemini, arranged by the owner: one bounded, independent review |
| What was reviewed | Public commit `3602576` (the review package); single-file bundle `M13_REVIEW_BUNDLE.md`, SHA-256 `6402fe131e82ff11d0dd74795cb8124ef54397295d5bbad14c6e23cfb88f0ac9` |
| Scope | Whether M13's implementation, analysis and conclusions are scientifically defensible |
| Conclusion | **DEFENSIBLE WITH SPECIFIC QUALIFICATIONS** |
| Material findings | **None.** No finding invalidates a verdict line or the summary statement |
| Qualifications | Three, listed below |
| Review text | [GEMINI_REVIEW.md](GEMINI_REVIEW.md), verbatim |

**The review text.** It is lodged verbatim as [GEMINI_REVIEW.md](GEMINI_REVIEW.md), a byte-for-byte copy of the file
the owner supplied after the closure commit `9f13c3a`.
- SHA-256 `7c8ab0f525b3b4c232af58edaa7538161e1dee0839017cc2e33276a1c5b0d2b9`; 7,452 bytes; CRLF line endings, kept.
- It is stored byte-exact (the folder is `-text`).
- When this disposition was first written at `9f13c3a`, only the owner's disposition below was on hand. This
  disposition is unchanged by the lodging, and nothing in the review was summarized or rewritten.

**One reading note on the review's text, without changing the disposition.** On question 3 and in its summary, the
review says the family-selection limitation is disclosed in RESULTS §11. At the reviewed commit `3602576`, the
selection was stated in PROPOSAL.md §2 and in the package's self-identified point 1. RESULTS §11 named "one family"
and "descriptors move together", but not the selection itself. The selection is now stated in RESULTS.md's dated
amendment, as qualification 1 below.

## The owner's disposition (verbatim)

> M13 — FINAL REVIEW DISPOSITION AND CLOSURE
>
> The independent Gemini review of public commit `3602576` is accepted.
>
> Decision
>
> Accept the conclusion:
> DEFENSIBLE WITH SPECIFIC QUALIFICATIONS.
>
> Gemini identified no material findings that invalidate any M13 verdict line or the summary statement.
>
> Preserve all five original verdicts:
>
> * G0: VALID
> * G1: RETAINED
> * G2: SAFE
> * G3: SHOWN
> * G4: SHOWN
>
> Required actions
>
> 1. Add the Gemini review and its disposition to the M13 review record.
> 2. Prepare a concise final closure report.
> 3. Ensure the three qualifications remain prominent:
>    * Modular-ring family selection was informed by M12's detour findings, although the family remained held out
>      from agent execution.
>    * RARE operational costs occurred in 133/165 labels; safety means remaining within the predeclared margin, not
>      zero cost.
>    * G4 is a behavioural count combining encounter frequency and subsequent crossing. Do not claim causal proof.
> 4. Preserve the exact frozen specification, raw results, hashes, original verdicts and independent verification
>    evidence.
> 5. Do not change the experiment implementation, parameters, graph bank, frozen specification or results.
> 6. Do not rerun M13.
> 7. Do not request another Gemini review.
> 8. Do not push or publish additional changes without my explicit approval.
>
> Stopping condition
>
> Once the review disposition and final closure report are complete and their documentation checks pass, mark M13
> CLOSED.
>
> Do not create another revision cycle or invent additional experiments as a condition of closure.
>
> Report the final commit, changed documentation files, verification results and any remaining limitations.

## Disposition

**The verdict lines are unchanged:**

| Line | Verdict |
|---|---|
| G0 | VALID |
| G1 | RETAINED |
| G2 | SAFE |
| G3 | SHOWN |
| G4 | SHOWN |

The summary statement is unchanged: **NET ADVANTAGE RETAINED ON THE MODULAR FAMILY, WITHIN THE SAFETY MARGIN.**

**No material correctness issue was raised, so none is addressed.** The three qualifications are wording
qualifications on the claims. Each is recorded where the claims are made.

| Qualification | What it means for the record | Package self-identified point | Where it is recorded |
|---|---|---|---|
| **Q1. Family selection** | The modular ring was chosen with M12's detour findings in mind, partly for its heavier tail of long detours. It stayed held out from agent execution: no agent ran on it before the frozen run. "Held-out structural family" means held out from agent execution and from development, not drawn at random | 1 | RESULTS.md amendment; CLOSURE.md; PROJECT_STATE |
| **Q2. RARE cost** | BELIEF used more steps than MBVI3 in 133 of 165 RARE labels (mean +9.8 [3.6, 14.9]). SAFE means the cost stayed within the pre-declared margin of 25. It does not mean there was no cost | 6 | RESULTS.md amendment; CLOSURE.md; PROJECT_STATE |
| **Q3. G4** | G4 is a behavioural count. It counts reopened edges an agent met while blocked and crossed again, so it combines how often the agent meets a block with whether it crosses again. It is not a rate, and it is not causal proof that the belief, or the returning, causes the saving | 4 | RESULTS.md amendment; CLOSURE.md; PROJECT_STATE |

## What changed and what did not

**Changed (documentation only):**
- this file;
- `review/GEMINI_REVIEW.md` (the review, verbatim, added after `9f13c3a`);
- `CLOSURE.md` (new);
- a dated amendment at the end of `RESULTS.md`, with the three qualifications and one erratum, plus a three-line
  pointer to it under the title (no original sentence changed);
- `docs/engineering/PROJECT_STATE.md`;
- `review/check_closure_docs.mjs` → `.out`, the closure's documentation and evidence check.

**Not changed:**
- `SPEC.md`, `SPEC.sha256`, `PINS.json` and all 44 pinned files;
- the graph bank and the structural record;
- the implementation;
- `results/` (the raw result, logs and the pre-result independent check, with `SHA256SUMS`);
- this package's supplementary checks and per-label table;
- the reviewed bundle.

`M13_REVIEW_BUNDLE.md` is the snapshot that was reviewed, and it is kept as it was at `3602576`. It is not
regenerated. Rebuilding it at a later commit would differ, because `RESULTS.md` now carries the amendment; rebuild it
at `3602576` to reproduce it.

**Erratum (closure documentation check):** RESULTS.md §1 and this package's cover shorten the core-row hash as
`86f0bd3f…a608e02d`. The full hash is `86f0bd3f188feb5eee5bbf3e67294a8e7b5add8227123300fa7b70a20608e02d`, which ends
`…a20608e02d`. It is a typo in the abbreviation only. The stored hash and all checks against it are unaffected. The
correction is in the RESULTS.md amendment, and the reviewed cover and bundle are kept as reviewed.

**Not done, as instructed:** no rerun, no new experiment, no further review, and no push.
