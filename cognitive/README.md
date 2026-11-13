# cognitive/ — the reproducible cognitive testbed (CF-01)

This directory holds the environment–agent separation layer from `docs/COGNITIVE_ARCHITECTURE_HANDBOOK.md` §8. It is plain Node.js ES modules with no packages.

It is independent of the browser application: nothing in `main.js` or `render/` imports it, and it imports nothing from them. The one exception is `worlds.mjs`, which reads `connections.json` to build a reference world.

| Path | Role |
|---|---|
| `testbed/env.mjs` | `GraphEnv`, the authoritative environment. It keeps private state, emits frozen observations `{node, nActions, goal}`, permutes action labels, owns reward and uses per-edge common random numbers |
| `testbed/worlds.mjs` | World generator and the `mfw-graph` reference world. Ground truth; never imported by agents |
| `testbed/tasks.mjs` | Battery v0: E1 latent learning, E2 detour, E3 reward relocation |
| `testbed/runner.mjs` | Agent registry, the privileged-channel rule (`agentOptions`) and episode loops |
| `testbed/stats.mjs` | Paired percentile bootstrap |
| `testbed/checks.mjs` | Named isolation and integrity checks |
| `testbed/agent_util.mjs` | The only module an agent may import |
| `testbed/rng.mjs` | Label-seeded streams |
| `agents/` | `RANDOM`, `QL`, `DYNAQ`, and `ORACLE` (privileged reference) |
| `core/` | CF-03: learned world model v1, value-iteration planner, MBVI agent (kept unchanged as a baseline) |
| `mind/` | CF-03b onward: world model v2 (pooled priors, impassable-exit mixture) and MBVI2. The integrated agent grows here |
| `mind/v3/` | CF-03c: world model v3 (v2 with two defects repaired: consistent leave-one-out weights, evidence-accumulating change detection) and MBVI3. v2 stays frozen beside it |
| `tests/` | Unit, isolation and mutant tests (`run_all.mjs` for CF-01; `npm test` runs every file) |

```bash
node cognitive/tests/run_all.mjs
```

**Writing an agent:**
1. Export a factory `({ rng, params }) → { kind, act(obs), observe(transition) }`.
2. Import only `../testbed/agent_util.mjs`.
3. Do not use `Math.random`, the clock, globals or dynamic imports.
4. Register the file in `testbed/runner.mjs`.

`tests/test_isolation.mjs` enforces these rules, and `tests/test_mutants.mjs` proves that each enforcing check catches a violation.

**Not here yet:**
- arbitration (CF-04);
- partial observability and episodic memory (CF-05);
- the MiniFlyWire-legacy adapter (CF-02).

See `docs/COGNITIVE_MILESTONE_ROADMAP.md`.
