# AC38 limited feasibility study (preparation)

Preparation only, under D-044. Nothing here has run on the pinned tree. Execution needs a separate written Director authorization, a designated independent reviewer who passes the readiness gate, and a passed publication inspection. `PROTOCOL.md` holds the rules.

This is not complete method validation and not an AC38 run. AC38 stays non-executable and unpassed, and the method stays unapproved.

| Path | Role |
|---|---|
| `PROTOCOL.md` | The protocol: categories, authority, definitions, fixtures, matrix rules, stop conditions, publication, reviewer, freeze |
| `expected.json` | The frozen-to-be matrix: 53 rows, 154 runs, every predicate |
| `MUTANTS.md` | Generated summary of the controls and mutants |
| `INSPECTION.md` | Publication inventory and the author's inspection record |
| `harness/` | Study harness: preload, window, fixture, runner, evaluator, matrix, gate, builders, static check |
| `pinned_tree/` | The three-file overlay, hash manifests, identity record, and the tools that build and rebuild them |
| `rehearsal/` | Synthetic rehearsal on test-owned modules: harness validation only |

Preparation commands, none of which loads the pinned tree:

```bash
node experiments/tc2/ac38_harness/feasibility/harness/build.mjs <pinned-tree-dir>
```

```bash
node experiments/tc2/ac38_harness/feasibility/harness/static_check.mjs <pinned-tree-dir>
```

```bash
node experiments/tc2/ac38_harness/feasibility/rehearsal/rehearse.mjs <out-dir-outside-the-repo>
```

```bash
node experiments/tc2/ac38_harness/feasibility/harness/run_study.mjs gate --freeze <commit>
```

`build.mjs` and `static_check.mjs` read pinned source as text only. `run_study.mjs run` refuses until every gate holds.
