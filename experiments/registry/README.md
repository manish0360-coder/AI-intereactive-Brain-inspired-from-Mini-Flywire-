# Seed registry: block-aware layer and import isolation (M-REG-1)

`typed.js` is the legacy typed registry. It is byte-identical to its committed baseline and is bound by hash in the
H1-R build identity, so it is never edited. Two things were added beside it.

| file | role |
|---|---|
| `typed_v2.js` | re-exports `typed.js`, replaces `createTrajectoryRegistry` and `trajectory` with an **indexed**, **block-aware** implementation |
| `trajectory_blocks.js` | block data. **Empty.** Nothing is registered, reserved or consumed |
| `import_isolation.js` | the static scanner and the gate policy |
| `legacy_typed_importers.json` | the exact legacy exceptions to that policy (path and content hash) |
| `verify_blocks.js` | differential battery against `typed.js` as oracle, structural tests, mutants, timing |
| `verify_import_isolation.js` | scanner tests, the gate over the real repository, scanner mutants |
| `verify_registry.js` | runs both gates (there is no CI in this repository) |

## Why a layer, and why indexed

`typed.js` validates every pair of records and scans every record on every lookup: about 41 s to construct and 15 ms
per lookup at roughly 3,850 records, paid by every process that imports it (measured in this environment; see the
verifier output). The v2 layer finds sources that share a derived stream seed through an index, with identical
decisions, refusal codes and messages for explicit records (`parity.records`, `parity.production`).

## Block record (schema `trajectory.block/1`)

A block registers a whole admitted seed list as one record bound to the exact list.

```
{ schema, namespace: 'trajectory', study, status,          // status: development | pilot | registered
  lo, hi,                                                   // inclusive hull, 0 <= lo <= hi < 2^32
  excluded: [ascending hull seeds that are NOT members],
  count,                                                    // (hi - lo + 1) - excluded.length
  listSha256,                                               // SHA-256 of the members, ascending, decimal, joined by ','
  executed, authorization, artifact, why,
  configuration: { seed, index, acceptedSeed } }
```

* Membership is `lo <= v <= hi` and `v` not in `excluded`. The registry recomputes the member list and refuses unless
  `count` and `listSha256` match it exactly. An interval alone proves nothing.
* Each member behaves exactly like an explicit per-seed record with the block's study and status: AVAILABLE,
  REPRODUCTION, CATEGORY_TRANSITION, CONSUMED_BY_OTHER_STUDY, ALIASED_SOURCE, AUTHORIZED_REUSE and HELD_OUT are all
  decided by the same rules (the verifier compares every case with explicit records in the committed registry).
* A block is **not** a `TRAJECTORY_RECORDS` entry: the MCF-1 harness builds its reservation inventory from those
  records, so a study's own seeds there would make it reject its own admitted list.
* The registry does not claim the list is the output of any admission algorithm; the consumer binds that, and the
  consumer's freeze record binds the registry `digest()`.

## Import isolation

Outside `experiments/h1r/`, a file may reference `experiments/registry/typed.js` only if it is `typed_v2.js` or an
exact entry of `legacy_typed_importers.json` with the exact content hash. The gate fails on a new consumer, on a
legacy consumer whose content changed, and on a stale entry, so the exception list can only shrink. Detected:
static imports and re-exports, dynamic `import()` and `require()` of literals, `import.meta.resolve`, relative,
absolute and `file:` spellings, `?query` and `#hash` suffixes, case, escapes, composed path pieces, and the
block-blind aliases `legacyTrajectory` / `createLegacyTrajectoryRegistry` outside this directory. **Not detected**:
paths assembled at run time from pieces the scanner cannot see, symlinks, and non-JavaScript loaders. Untracked
files are reported as warnings (strict mode fails them).

### Legacy exceptions that remain, and why

| scope | files | why they remain |
|---|---|---|
| historical verifiers | `m33`, `m34`, `m35`, `m38`, `m39`, `research/preregistrations/verify_m33*.js`, `verify_m34`, `verify_m37`, `verify_m38_p0`, `verify_m39`, `verify_m40` | byte-protected or time-pinned evidence of closed milestones |
| Study 2 | `experiments/study2/governance.mjs`, `verify_driver.js`, `verify_study2_execution.js` | executed and frozen |
| H1-R adjacent | `research/preregistrations/h1r_v1_checks/pilot_registry_status.mjs` | closed with H1-R |
| MCF-1 harness | `experiments/mcf1/{admission,driver,inventory,orchestrate,validity,verify_mcf1}` | migrating changes engine files pinned by the MCF-1 verifier; that belongs to the harness follow-up milestone |

The smallest follow-up that achieves global enforcement is the MCF-1 harness migration to `typed_v2.js`
(removes six entries); the historical entries stay by design.

## Running

```bash
node experiments/registry/verify_registry.js
```
