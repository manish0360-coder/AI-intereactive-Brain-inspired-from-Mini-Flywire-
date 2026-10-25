# CREDIT-1 — independent review record

Two rounds of independent review (Gemini, relayed by the owner) of the CREDIT-1 design. The reviews are kept unchanged; this file
records what each round received, what it returned, and what is known about provenance.

## Round 1 (2026-10-25) — review of design r1

| item | value |
|---|---|
| reviewed design | `review/DESIGN_r1_as_reviewed.md` (r1), sha256 `1eba0e9b196bd96ca73b7194d7d1efd721533d4d3c07177520125e7adabbe68a` (33,913 B) |
| review text | `review/GEMINI_ROUND1_REVIEW.txt`, a byte-exact copy of the file the owner supplied (`Downloads/gemini_Review-.txt`) |
| review sha256 | raw (CRLF, as received) `ca0c500aff59d652488b6a2e4f3cc955a4d2d2d4be22a4a0d28d50c13e5b47d5` (9,258 B); LF-normalised `7cc87c4b252f26d83199c32cf39662d48aea6352b010d41b870ee2d63aa721e7` (9,072 B) |
| verdict | design "unacceptable in present form"; overall "READY FOR DESIGN REVISION" |
| response | adjudicated in DESIGN r2 section 10. Factual corrections to the review: trajectory confidence reads episode memory, not the transitions store; A+ is 32 substitutions, not 28; the no-Q control removes Q only; the downhill measure is computed by the harness, not available to the agent. |

## Round 2 (2026-10-25) — review of design r2

| item | value |
|---|---|
| review text | `review/GEMINI_ROUND2_REVIEW.md`, transcribed **verbatim from the owner's chat message** (no file was supplied for this round). sha256 of the recorded text (LF, 7,251 B): `461f74f523b9653878b8a10f31bd76b06b70d571bbfa8886665b7a697b9a4e28`. This is the hash of the transcription; the bytes of Gemini's original output cannot be hashed from here. |
| verdict | Areas A–G all PASS; overall **READY FOR IMPLEMENTATION MILESTONE** |
| mandatory corrections | BC-1 … BC-7 as already listed in DESIGN r2 section 9 (no new design change) |
| optional suggestions | OPT-1 (telemetry side effects) and OPT-2 (self-target frequency); both implemented in the implementation milestone (fixtures: store-hash test; telemetry: candidate-evaluation counter) |

### Which bytes did round 2 review? (provenance)

- The review names the reviewed file `DESIGN_4.md` together with `CREDIT1_GEMINI_DESIGN_REVIEW_PACKAGE_R2.md`.
- **Established:**
  - The owner's Downloads folder holds `DESIGN.md` (39,666 B, sha256 `c41c98ae7d72526b8bc69ac6d753182ba0c120e185bb302fb8901de5a0ca5719`, saved 17:51) and `CREDIT1_GEMINI_DESIGN_REVIEW_PACKAGE_R2.md` (12,151 B, sha256 `3d6274739596d50cf63d93829c20ffb04531b4b928f80e2537aeaee621265169`, saved 17:50).
  - Both are byte-identical to the repository's design r2 and round-2 package.
  - They are the only CREDIT-1 design files saved there after r2.
- **Not established:**
  - No file named `DESIGN_4.md` exists on this machine. The name is consistent with an upload interface renaming a duplicate upload, but that cannot be verified from here.
  - So the exact bytes Gemini received cannot be proven. The most likely reviewed bytes are r2 `c41c98ae…` and the package `3d627473…`, and the content the review describes (28 / 32 substitutions, 9 cells, Bonferroni-2, the R1–R8 grid) matches r2.

### Factual error in the round-2 review (noted, not adopted)

- Area F describes "fixed session budgets ($n=1,500$)". That conflates two numbers.
  - In the design, **1,500 is the number of agent calls per session**.
  - The **number of worlds n is not fixed**: it is to be determined from the development-calibration standard deviations (DESIGN r2 section 6.7; the illustration gives about 488–976).
- The error does not change any verdict or correction in the review.

### Limits of the round-2 review
- The reviewer does not read the repository. Its statements that the corrections are "source-grounded" rest on the package's citations.
- The source facts were checked by the designer and by the census tools. The review is not an independent source verification.
