# experiments/phase1_0

Verification gates for Phase 1.0 agent stabilization. Run from this directory:

```
node parity_termarray.js     # M1: refactor was arithmetic-neutral (200k contexts)
node verify_S1.js            # M1: S1.1–S1.5   D3 sign repair
node verify_S1b.js           # M1: S1.5b, S1.6, S1.7, S1.8
node verify_S2.js            # M2: S2.1–S2.7   D1 composite Q namespace + Q4
node verify_S4.js            # M4: S4.1–S4.8   Q3 seeded RNG routing
node verify_S3.js            # M5: S3.1–S3.6   F2 stale-action path
```

Exit code 0 = pass.

## Headless execution (M5 onward)

`verify_S3.js` runs the **real `main.js`** under `benchmarks/harness/headlessShim.js`,
which stubs THREE, the DOM, `localStorage` and `fetch` — nothing else. All test
instrumentation is external: an accessor property on `globalThis.lastReasoning`
plus main.js's own exported `_diagCounters`. **No application code is modified
by any test.**

`main.js` is an ES-module singleton with import-time side effects, so each agent
run needs its own process. `_runonce.js` is that per-run entry point; `verify_S3.js`
spawns it via `child_process`.

Two shim details worth knowing:

- **`window` aliases `globalThis`.** In a browser `window` *is* the global object,
  which is the only reason `main.js` can read the never-declared identifier
  `recentMemory` (it is created by `window.recentMemory = []`). A plain stub
  object would not reproduce that, so the shim must alias.
- **Timers are captured by function name.** `runAgentLoop` is the only named
  function passed to `setTimeout`; every other use is an arrow that removes a
  `THREE.Line`. Capturing by name gives exact per-tick control without
  guessing at delays.

## `baseline/` — frozen historical artifacts, not modules under test

Every gate imports the live module from `../../render/`. The baselines exist
only as reference arms. Do not let a gate import a baseline in place of the
thing it is testing — that is the Phase 0 D11 failure mode.

| Gate | Proves |
|---|---|
| parity | The M1 term-array refactor changed no arithmetic. |
| S1.1–S1.5 | Sign semantics, drive amplification, **anti-retuning**, scale audit, taught-path preference. |
| S1.6–S1.8 | No belief→decision channel opened; `arbitrate()` unaffected; export surface unchanged. |
| S2.1–S2.7 | Q writes readable by the scorer; single-goal isomorphism; episodeManager parity; `getQAny`; `dampQ` namespace; D8 documented-not-fixed. |
| S4.1–S4.8 | No live `Math.random()`; seeded reproducibility; unseeded == `Math.random()`; stream separation; draw-count and threshold preservation; `rng()` contract intact. |
| S3.1–S3.6 | Epsilon path cannot exit early; stale executions cut 67→17; stale rate no longer tracks epsilon; exploration changes the executed path; **seeded end-to-end determinism**; subsystem branch migration measured. |
