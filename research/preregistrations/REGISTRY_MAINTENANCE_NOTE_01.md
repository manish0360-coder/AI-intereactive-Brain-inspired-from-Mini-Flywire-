# Registry and Verifier Maintenance Note 01 — seed-registry guard and successor verifiers

**Status:** OPEN maintenance items. **NON-BLOCKING.** Recorded 2026-09-26 at the close of FutureScore V2.3 Study 2.
**Scope of this note:** it only records the items. It changes no code, no verifier, no registry file and no evidence.
Fixing any item needs a separate Director authorization. None of them reopens Study 2 (see
[`FUTURESCORE_V2_3_STUDY2_DISPOSITION.md`](FUTURESCORE_V2_3_STUDY2_DISPOSITION.md)).
**Labels:** FACT (observed and recorded in `experiments/study2/historical_gate_sweep.json`) / INFERENCE / OPTION.

## Background (FACT)

Study 2 marked its block 890000–892999 consumed with a new chain link,
`experiments/registry/consumed_after_study2.js`, and re-pointed `experiments/registry/typed.js` to it (commit
`0c635e1`). The earlier links, `consumed.js` and `consumed_after_c1.js`, are unchanged. A before/after sweep of 35
historical gates found exactly 5 that change verdict. Each is named in `verify_study2_execution.js` (H2–H8).

## Items

**MN-1 — raw-import guard does not name the new link (FACT).** `experiments/m33/verify.js` keeps a fixed list of
protected registry modules (`consumed.js`, `consumed_after_c1.js` and the protocol modules). Because the new link is not
on that list:
- check I3 ("typed.js is the only new importer") now fails;
- new code could import `consumed_after_study2.js` directly without the M33 gate flagging it;
- `research/preregistrations/verify_m33.js` aborts, because it runs the M33 gate and treats its non-zero exit as fatal.

*Interim enforcement:* `verify_study2_execution.js` R4 checks that only `typed.js` (and that gate) import the new link.

**MN-2 — the M34 verifier cannot run (FACT).** `experiments/m34/verify.js` copies the installed `typed.js` into a temporary
directory together with only the two chain files it knew (`consumed.js`, `consumed_after_c1.js`). It therefore fails
with `ERR_MODULE_NOT_FOUND` as soon as `typed.js` delegates to any later link, and every future link will have the
same effect.
- Its subject, `consumed_after_c1.js`, is byte-unchanged.
- Its exhaustive property (only the intended block changes at the typed layer) is re-established for the new link by
  `verify_study2_execution.js` R2.

Before Study 2 this gate already failed P1/P2 for pre-existing reasons.

**MN-3 — M38 H1 flips by design (FACT).** `experiments/m38/verify.js` H1 asserts that the seed registries are
byte-identical to `6b67c55`. They now differ intentionally. G1 and G2 of the same gate already failed before Study 2.

**MN-4 — the Study-2 execution gate's scope check is not commit-bound (FACT).** `verify_study2_execution.js` S3 compares
the working tree against `d846fbd`. Every later commit, starting with the bookkeeping commit that adds this note, makes
S3 fail. This is the same class of since-base scope check as earlier gates (for example `verify_fs_v23` G5).
*Lesson for new gates:* bind scope checks to the milestone's own commit range, never to the moving working tree.

**MN-5 — line-ending portability of earlier evidence (FACT + INFERENCE).** Several integrity records hash exact bytes
of multi-line files that carry no `-text` attribute:
- `experiments/study2/readiness_evidence/NONINTERFERENCE.json`;
- `experiments/study2/validation/RESULTS.json` and `reference.json`;
- `experiments/fsfeas/evidence/REPLAY.json` and `SUMMARY.json`.

FACT: during Study 2 a `git stash` round-trip under `core.autocrlf=true` rewrote the same kind of files to CRLF and
broke their hashes. INFERENCE: a fresh clone with `core.autocrlf=true` would fail those integrity checks in the same
way. This is the same class as the recorded `verify_G9_successor` portability item.

The Study-2 execution evidence is protected (`.gitattributes`: `experiments/study2/execution/* -text`).

## Options (not executed; for a future authorized maintenance milestone)

- **A successor registry verifier.** For example `experiments/registry/verify_chain.js`. It would:
  - discover chain links by the existing naming convention (`experiments/registry/consumed*.js`);
  - materialise every link;
  - check each link against its predecessor, exhaustively.

  This replaces the fixed file lists of MN-1 and MN-2 without editing either historical verifier.
- **Derive the protected-module list from the chain convention** in that successor, rather than hard-coding it.
- **Extend `-text` to the evidence files listed in MN-5.** `.gitattributes` would change, but no evidence byte would.

None of these is a prerequisite for the Mini Prometheus manufacturing work.
