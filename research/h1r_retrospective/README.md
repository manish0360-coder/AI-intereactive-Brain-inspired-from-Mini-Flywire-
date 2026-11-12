# H1-R post-hoc retrospective (read-only, exploratory)

**Status.** H1-R is closed as a VOID study (D-032). Everything here is exploratory and post hoc. It is not a confirmatory test, it does not reopen H1-R, it changes no frozen artifact, and it is not committed.

**What it reads.** The lodged manifests, the raw Stage-1 and extension records (each record's SHA-256 is checked against its manifest), and the lodged Stage-1 study input and decision record. It uses the frozen `analyze.js` functions (`runMetrics`, `crossed`, `analyzeStudy`, `brierScore`, `averageRanks`) unmodified, and the frozen configuration generator through `build_tree.mjs`.

**What it writes.** Only this directory. Nothing under `experiments/` or the registry changes, and no experiment runs.

```bash
node research/h1r_retrospective/retro_extract.mjs
```

```bash
python research/h1r_retrospective/retro_analyze.py
```

```bash
python research/h1r_retrospective/retro_manifest.py
```

| Path | Contents |
|---|---|
| `retro_extract.mjs` | per-run summaries, per-cell pairwise divergence, frozen crossed intervals, and the F-11 reproduction |
| `retro_analyze.py` | effect map, cell stability, temporal, trust, mechanism, learning, arm separation, replay, why-VOID quantities, figures |
| `retro_manifest.py` | `RETRO_MANIFEST.json`: input hashes, script hashes, versions, commands, output hashes |
| `out/` | machine-readable results and `summary.txt` (the analysis printout) |
| `figures/` | eight figures, each answering one stated question |

Requires Node 24, Python 3 with numpy, scipy and matplotlib. Two complete re-runs gave byte-identical outputs.
