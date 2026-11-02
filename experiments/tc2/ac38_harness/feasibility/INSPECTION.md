# AC38 Limited Feasibility Study: Publication Inventory and Inspection Record

**Status: INSPECTION GATE NOT PASSED.** This records the author's inspection of the prepared artifacts only. It is not an independent inspection. Raw evidence and summaries do not exist yet. The Director has not accepted this record. Nobody is yet assigned to perform the independent reads listed as open items; that assignment is a Director decision.

Publication route P-2 (D-044): the three-file overlay, hash manifests, inspected harness artifacts and approved evidence only. The full pinned-tree archive is never published.

## Inventory

| Artifact | Files | Already public? | Author inspection | Open items |
|---|---|---|---|---|
| Tree overlay | `pinned_tree/overlay/main.js`, `render/planning.js`, `MANIFEST.json` | No: these 3 are the only bytes of the pinned tree not in public commit `0df804c` | Manual read of the 8 added lines and of `MANIFEST.json`'s structure; pattern scan clean | Independent read |
| Other 145 tree files | Not published | Yes, byte-identical to `0df804c` on public `main` | Identity re-checked against git objects by `build_overlay.mjs` | Re-check at freeze |
| Hash manifests and identity | `pinned_tree/tree_files.sha256`, `tree_sources_44.sha256`, `tree_identity.json` | No | Relative paths and SHA-256 values only | None known |
| Rebuild and overlay tools | `pinned_tree/build_overlay.mjs`, `reconstruct.mjs` | No | Pattern scan clean; manual read | Independent read |
| Study harness | `harness/*.mjs`, `harness/rewrite_table.json` | No | Pattern scan: one IP-shaped hit, `127.0.0.1` in `safety.mjs`, the loopback address of the network-guard self-test | Independent read |
| Protocol, expected outcomes, mutant definitions | `PROTOCOL.md`, `expected.json`, `MUTANTS.md` | No | Pattern scan clean | Independent read. Gemini's targeted falsification review and the author's audit of it are done (2026-11-02); Gemini read uploaded files only, so it is not the independent read |
| Synthetic rehearsal | `rehearsal/**` | No | Test-owned modules; pattern scan clean after the redaction test was changed to placeholder paths | None known |
| Raw evidence and summaries | Not produced | No | Not inspected: they do not exist yet | Redaction at capture, full scan, manual read of every breakage run and one run per mode |

## The 8 added lines in the overlay

All 8 are guarded hooks that call into globals set by test drivers. None holds a path, credential or personal datum.

| File and line | Purpose |
|---|---|
| `main.js:1154`, `:1279`, `:1320`; `render/planning.js:291` | LEARN-0 map-oracle switches, guarded, default off |
| `main.js:1792` | GFGUARD candidate-class admission hook |
| `main.js:2128` | GATEFLOOR-B2 entry hook |
| `main.js:3646` | GFGUARD execution legality guard |
| `main.js:4867` | GATEFLOOR-B2 goal-reset probe, observational |

## `MANIFEST.json`

It holds build metadata: commit ids, transform hashes, git blob ids per file, and per-file SHA-256 values keyed by repository-relative paths. It contains no absolute paths, user names, hostnames, credentials or device identifiers, by manual read of its structure and by pattern scan.

## Pattern scan

**Classes scanned:** credential shapes, credential keywords, email addresses, the owner's names and handle, the local user name, home-directory paths, drive-letter project paths, device identifiers, hostnames and IP addresses.

**Result over all 34 files in this directory, rescanned 2026-11-02 after the Gemini-review audit:** two hits, both the loopback address noted above: `harness/safety.mjs:24` and this record's own mention of it.

**Inspected set:** the SHA-256 of the newline-terminated lines `<sha256>  <path>`, sorted by path, for every file in this directory except this record, is `d94ac1f53fb5776b4a42850e305c4f5a1ea6ce12c92bef71f7a5be6af3a63dff`. Any change to those files makes this record stale.

A pattern scan cannot certify publication safety on its own, so the manual reads above remain required.
