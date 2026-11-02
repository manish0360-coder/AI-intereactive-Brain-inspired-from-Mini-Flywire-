# AC38 harness prototype: pinned-tree failing control

Status: prototype. This is not an AC38 run. AC38 stays non-executable and is not passed. The TC-2 specification stays frozen at `622c58b`. Nothing here is an acceptance test, a parity run, a guard or a derived tree.

The pinned tree is the system that is expected to fail AC38. A harness that can see those failures, stay clean when the bridge is switched off in memory, and notice when it stops working is the only thing this prototype claims to demonstrate.

## Files

| File | Role |
| --- | --- |
| `scan_scope.mjs` | Static lexer: module graph and top-level bindings. Runs no application code |
| `trace_seal_path.mjs` | Static line-level trace of the seal path. Runs no application code |
| `seal_path_trace.json` | The trace: functions, reads, writes, decisions, and the comparison with the inventory |
| `build_scope.mjs` | Writes `digest_scope.json` and `rewrite_table.json` from pinned source text and the trace |
| `digest_scope.json` | Every in-scope binding, every exclusion with its reason, the 20-item inventory map |
| `rewrite_table.json` | Source hashes, line-anchored rewrites, appended accessors, the two test-only variants |
| `guard.mjs` | Network denial preload |
| `preload.mjs` | Hash-locked in-memory transformation |
| `observe.mjs` | Digest, write journal, tripwire, stream spy, canaries, position recovery |
| `fixture.mjs` | One fixture in one disposable process |
| `runner.mjs` | Spawns a fixture; holds the pinned table hash |
| `run_control.mjs` | Pinned-tree failing control: matrix, comparisons, deliberate breakage |
| `run_closure.mjs` | Clean control, field-write ladder, inventory cross-check, deliberate breakage |
| `evidence/pinned_control.json` | Compact result of the failing control |
| `evidence/closure_control.json` | Compact result of the closure control |

## Running it

```bash
node experiments/tc2/ac38_harness/run_control.mjs <out-dir-outside-the-repo>
```

```bash
node experiments/tc2/ac38_harness/run_closure.mjs <out-dir-outside-the-repo>
```

Both need the pinned tree at `<os tmpdir>/mfw-credit1/learn0base/learn0-8aa9ee4f39f4`. Each fixture runs under `--permission` with read grants for the repo, the tree and the out directory, and no write, child-process or worker grant. Each process proves those denials before `main.js` loads. Its only output is stdout, which the parent writes into the out directory.

To regenerate the static files, run `trace_seal_path.mjs`, then `build_scope.mjs`, then pin the new table hash in `runner.mjs`.

## Run modes

| Mode | Source | Observation | Ends |
| --- | --- | --- | --- |
| B | Unmodified | None. Empty fixture only, because `nodes` is unreachable without the transform | Step 3000 |
| D | Transformed | None | Step 3000 |
| J | Transformed | Journal, stream spy, canaries, log capture, in the seal window only | Step 3000 |
| T | Transformed | J's journal plus deep freeze at seal entry | Seal return or first frozen write |
| TF | Transformed | As T with arrays left writable, so the seal reaches its first field write | Seal return or first frozen write |
| R0, R1 | Transformed | Stream positions at seal entry, or at seal return | Immediately after |

Spies exist only between arming and disarming at the seal window. Freezing and position recovery cannot be undone, so those runs are terminal.

## Fixture identity

World `acq1:study:12`: configuration seed 200979, goal 8, agent `MFW-P`, environment E1, agent seed 3361643952, hook state P with the guard on and the map off, virtual clock, 3000 steps. This reuses the session wiring of the ACQ-1 driver. It uses no ACQ-1 evidence, which stays VOID under D-035.

World 12 was chosen by reachability alone. `run_control.mjs --scan-cap` showed that 6 of the 30 development worlds reach a natural `tick_cap` seal within 3000 steps, and world 12 is the only one where every measured store is non-empty at that seal. The selection used no AC38 result.

| Reason | How the seal is reached |
| --- | --- |
| `tick_cap` | Natural seal at `P:3276`, call 2474, the first at or after call 2000 |
| `goal_reached` | Natural seal at `P:4828`, call 2088, the first at or after call 2000 |
| `context_shift`, `topic_switch`, `manual` | Direct call from the step hook at call 2000. The pinned tree has no live caller for these reasons |

Population happens at seal entry and sets only the context episode's `nodes` and `labels`. Fixtures: empty; two nodes `[1,2]`; three nodes `[1,2,3]`, the first legal walk that avoids the goal.

## Closure control

**Bridge-off clean control.** Variant `bridge_off` rewrites one line in memory, `render/episodicContextEngine.js:394`, so a registered bridge is skipped and a probe records that it was. The same three-node fixture and the same assertions then run with the bridge off. Bridge-on runs sit beside it in the same batch. This is a test control. It is not a derived tree and says nothing about how TC-2 should change the seal.

**Planted writes.** A clean result only means something if the same assertions can fail. Each planted write happens inside the bridge-off window, from the suppressed bridge line, and the same verdict function must report it. Same-value and restored writes show what the journal sees and the final digest does not.

**Field-write ladder.** Everything reachable from every covered binding is locked at seal entry, except the closed list. A rung runs until the first write to a locked object. The harness unlocks that write at that site only, so a second site writing the same key still trips, and the next rung runs in a new process. A ladder ends when the seal returns with no trip. Arrays unlock by inventory item, because an array's `length` cannot be trapped per site.

**Site probes.** Variant `site_probes` adds one line probe per field-write site. Each records whether the line ran and whether its target existed at window entry. That is the runtime evidence behind every exclusion.

**Inventory cross-check.** `trace_seal_path.mjs` starts from the seal and reads the monitored inventory only after it finishes. At runtime, the journal watches everything reachable from every covered binding, and a digest of all bindings with inventory objects replaced by name tokens shows what changed outside the inventory.

| Ladder context | World | Reason | Why it is there |
| --- | --- | --- | --- |
| `goal` | 12 | `goal_reached`, call 2088 | Consolidation and schema rebuild run in the window |
| `stable` | 15 | `goal_reached`, call 1698 | The window takes a pre-existing entry over the stability threshold. World 12 never does this in a window |
| `context` | 12 | `manual`, call 2000 | Also locks the outgoing context episode, to hit the closed-list fields |
| `cap` | 12 | `tick_cap`, call 2474 | The natural cap route |

World 15 (configuration seed 201269, goal 19) was found with `run_closure.mjs --find-stable`. The search looked for that one line only and used no AC38 result.

## Fingerprint scope

The public fingerprint is computed the same way in B, D and J, from exported state only: `Q`, `transitions`, `rewards`, `penalties`, `confidenceMap`, `signals`, `thoughtTrail`, `curiosityMap`, `momentumMemory`, `pathSuccesses`, `pathAttempts`, `episodicStore`, `getSchemas()`, every neuron's `userData`, `recentMemory`, `lastReasoning`, `curiosityState`, `energyState`, the step count, the environment log, goal resets, and final cognitive and visual draw counts. The M7 record fingerprint is compared alongside it.

## Digest serialization

Arrays, Maps and Sets keep their order, because order changes behaviour. Object keys are sorted. Numbers keep `NaN`, `-0` and the infinities distinct. Cycles and repeated objects become `$ref:n`. Accessors are not invoked. Functions, symbols, accessors and weak or promise values cannot be compared by content, so they become `$opaque` tokens and are counted in every digest. Each binding gets a SHA-256, and the root hashes the sorted rows.

A missing accessor, a binding that does not resolve, a set of names that differs from the scope, or a value that throws while being read refuses the run. So does losing `recentMemory` or `lastReasoning`. Any other window global that was never assigned is recorded as absent, in the digest and in the report.

This is a digest of the covered module-level bindings. It is not a digest of all application state.

## Blind spots

- A closure's private state is invisible to the digest. The digest excludes `streams` for that reason, and stream positions are measured separately. No other closure state is measured.
- State held by the test drivers (`experiments/m7/env.js`, `arms.js`, `run.js`) is outside the scope. The environment log is in the fingerprint.
- The digest sees only own enumerable string keys, and a value's own stub class state. Stubbed DOM and THREE objects are not real renderers.
- The journal sees mutator calls through the prototypes. It cannot see plain field writes or `length` assignment. Those need the tripwire, which reports only the first one per run, so the ladder needs one process per site.
- The ladder covers the contexts it ran. A site is only as covered as the seals that reached it. An array's `length` unlocks by item, not by site.
- `trace_seal_path.mjs` is a regex tracer, not a parser. It missed one chained `.sort(` on a continuation line until the runtime cross-check found it. The runtime cross-check covers only code that ran.
- The tripwire cannot see a `TypeError` that application code swallows. No catch site lies on the seal path of the pinned tree, by source reading. A changed tree must re-check that.
- `Reflect.set`, `Object.defineProperty` and similar routes on Maps and Sets are invisible to the journal. None occurs in pinned production source.
- Private `let` writes are seen only at the six rewritten sites. A new site would need a new rewrite; `build_scope.mjs` fails if it finds one it cannot prefix.
- Matching fingerprints across modes show equal measured results for these seeds and inputs. They do not prove that instrumentation is neutral.
- The inventory and the rewrite table are bound to this tree. A changed tree needs both re-derived.
