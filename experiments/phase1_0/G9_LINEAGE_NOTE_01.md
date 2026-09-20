# G9 — Lineage Note 01: the render/ surface gains `traversalRecord.js`

**Note ID:** G9-LN-01
**Author:** Chief Systems Engineer
**Authority:** Director decision "FutureScore Boundary Record — Production Implementation".
**Origin:** [`FUTURESCORE_BOUNDARY_RECORD_DESIGN.md`](../../research/preregistrations/FUTURESCORE_BOUNDARY_RECORD_DESIGN.md) §7, §16.
**Kind:** lineage transition. **Not an erratum, and not a repair of G9.**

> **[`verify_G9.js`](verify_G9.js) IS NOT MODIFIED.** Its bytes are unchanged:
> SHA-256 `41bfdcde7c057a9886a009edbde7ff6f36f0b444acf60b6717fb809239b8b2c1`, asserted by the successor gate.
> It recorded the pre-delta cognitive surface and remains the historical record of what was measured.

---

## 1. What changed and why

G9 asserts (M7 frozen §14, §18.5): *"Export surface of every render/ module unchanged … No new module in
render/."* Measured against the pre-delta build, it passed 11/11 with 37 modules and 215 exports.

The frozen FutureScore V2.2/V2.3 contracts require a production record of post-outcome traversal outcomes that is
**provably isolated** from the contaminated pre-outcome and episode-level writers. The boundary design (§7)
compared the alternatives and chose a dedicated module, because isolation that cannot be proved statically is not
isolation. That adds exactly one module to `render/`:

| Module | Exports |
|---|---|
| `traversalRecord.js` | `clear`, `recordFor`, `recordOutcome` |

**G9 therefore fails from this commit onward, by design and by announcement, not by accident.** Its `G9.1`
module-set assertion detects exactly the addition described here.

## 2. Scope of the transition

- **One module added.** No existing `render/` module gains, loses or renames an export.
- **The cognitive surface is otherwise untouched:** the other 37 modules and their 215 exports are byte-for-byte
  the same surface G9 recorded.
- **No M7 claim changes.** `traversalRecord.js` is not read by any M7 arm, consumes no RNG and writes no store
  that M7 observes, so no M7 threshold, statistic or conclusion is affected. The intent of §18.5 — that no *new
  cognitive mechanism* silently enters a running study — is preserved: this module computes nothing and is
  write-only.

## 3. Successor gate

[`verify_G9_successor.js`](verify_G9_successor.js) carries the assertion forward. It:

1. asserts `verify_G9.js` is byte-identical to the digest above;
2. re-derives the live `render/` surface with the same static parser;
3. requires the live surface to equal the G9 surface **plus exactly** `traversalRecord.js` with its three exports;
4. rejects any other added or removed module, and any changed export of any other module;
5. carries its own mutation controls.

From this commit, **the successor gate is the one to run**; `verify_G9.js` is kept as the historical record.

## 4. Related: milestone scope gates superseded by the same commit

The specification milestones that preceded this one each carried a *tree-identity* scope assertion — "the
production tree is byte-identical to my base". Those assertions were true of a specification milestone and cannot
survive the first production change after it. This commit is that change, so from here:

| Gate | Check | Status |
|---|---|---|
| `research/preregistrations/verify_fs_v23.js` | `G5` production and experiment trees identical to `aa70e93` | retired as a running assertion |
| `research/preregistrations/verify_fs_boundary_design.js` | `G3` trees identical to `6a727d3`; `G4` (re-runs the V2.3 gate) | retired as running assertions |

**Neither file is edited.** Their commit-scoped checks (`G0`, `G1` — "the milestone commit is a direct child of
base and touches exactly its own files") remain true and still pass, and those are the claims that carry the
scientific content. The retired rows asserted the *absence of later work*, which is a statement about the future,
not about the milestone. Every other check in both gates still passes.

## 5. Disposition

Recorded as a lineage transition. Any further expansion of the `render/` surface requires its own note and its
own successor, never an edit to a historical gate.
