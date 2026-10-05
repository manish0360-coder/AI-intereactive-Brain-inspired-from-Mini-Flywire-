# H1-R D-021(b) — independent-implementation package (Gemini)

**Authority:**
- Research Director ruling of 2026-10-05, "proceed with D-021(b) only", and the correction ruling after the integrity audit.
- The process is decision-log D-021(b). Gemini implements §12–§14 of H1-R v1.0 from the frozen text alone. Both implementations run on a pre-registered synthetic fixture set and must agree exactly on every decision, and within 10⁻⁹ on every real-valued output.

**Status:** prepared only.
- Nothing has been run against it, and no H1-R analysis has begun.
- `analyze.js` does not exist.
- No Stage 1 or Stage 2 run, no H1-R configuration and no registry change were made.

**Provenance:**
- **Source commit:** the package is built from frozen texts and instrument facts read at the pinned source commit `30e7693236309bbfb82b8117b74240fc8ab5d43a`.
- **Package commit:** the commit that eventually adds this directory is a different commit, recorded separately when it is made.

## Files

| File | Role | Given to Gemini? |
|---|---|---|
| `GEMINI_PACKAGE.md` | **The handoff.** The instructions plus verbatim appendices A–F | **Yes** |
| `fixtures/S01–S17.json`, `fixtures/M01.json` | Synthetic inputs only, no expected outputs. Study level (`h1r.d021b.study/1`) and record level (`h1r.d021b.records/1`) | **Yes** |
| `GEMINI_INSTRUCTIONS.md` | The hand-written part of the package; contained in it | Contained in the package |
| `build_package.mjs` | Assembles the package from **git blobs at the pinned source commit**. It refuses unless:<br>• every `> [source]` quote in the instructions occurs verbatim in its source;<br>• v1.0 and M7 hash to their frozen values;<br>• every fixture matches its hash | No |
| `PACKAGE_MANIFEST.json` | SHA-256 of the package, every source blob and excerpt, every fixture and every tool. Its `environmentMetadata` block (build time, Node version, OS) is the only part that may change on a rebuild | No |
| `make_fixtures.mjs` | Deterministic, single-pass generator of the synthetic fixtures. Local mulberry32 seeds 990001 and 990101, never an analysis seed. It contains no analysis computation | No |
| `fixtures/FIXTURES.sha256.json` | SHA-256 per fixture; the same list is in the package's Appendix F.3 | Contained in the package |
| `compare_outputs.mjs` | The D-021 agreement check between two output files. It contains no analysis logic and no expected value | No (the relayer runs it) |

The package includes no analysis implementation of either implementer.

## Lodging protocol (D-021: "both results are lodged before comparison")

1. **Freeze the package.** Commit this directory (the package-only commit) before Gemini receives anything.
2. **Relay.** The user gives Gemini `GEMINI_PACKAGE.md` and the files in `fixtures/`, and nothing else, together with the SHA-256 of `GEMINI_PACKAGE.md`.
3. **No external access.** Because the repository is public, Gemini must work with no web browsing, no GitHub browsing, no repository access and no other external source. It confirms this in its `PROVENANCE.md`.
4. **Gemini lodges.** On receipt of Gemini's four deliverables (code, interpretation register, implementation notes, provenance), record their SHA-256 values. Keep the files sealed from Claude.
5. **Claude implements.** Claude writes `analyze.js` blind to Gemini's deliverables and emits the same output schema (`GEMINI_INSTRUCTIONS.md` §10). Its SHA-256 is recorded and committed before any comparison, and before the first Stage-1 run (v1.0 §1.2).
6. **Compare.** Run both on `fixtures/`, then:
   ```bash
   node research/preregistrations/h1r_d021b/compare_outputs.mjs gemini_output.json claude_output.json
   ```
   Compare the two interpretation registers item by item.
7. **Disagreement.** Any disagreement halts H1-R until the cause is found and corrected, and is reported. It is never settled by choosing one result (D-021 §2). Items marked UNSPECIFIED on either side go to the Director for a ruling.

## Rebuild and verify

```bash
node research/preregistrations/h1r_d021b/make_fixtures.mjs
```

```bash
node research/preregistrations/h1r_d021b/build_package.mjs
```

Both are deterministic and read frozen material only from the pinned source commit:
- every fixture, `FIXTURES.sha256.json` and `GEMINI_PACKAGE.md` reproduce byte for byte, before and after the package commit;
- in `PACKAGE_MANIFEST.json`, only `environmentMetadata` changes.
