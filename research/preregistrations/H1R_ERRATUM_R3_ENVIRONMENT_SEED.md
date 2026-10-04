# H1-R erratum R3: configuration-scoped environment stream (frozen M7 §5.1)

**Authority:** Research Director ruling "R3 IMPLEMENTATION — CONFIGURATION-SCOPED ENVIRONMENT RANDOMIZATION", 2026-10-04. It follows the read-only R3 investigation of the same date.

**Scope:** H1-R runs only. These are runs of the conformed B2 tree with the H1-R runtime attached **and** a design position supplied (see below). With the runtime absent, B2 behaviour is unchanged (H1R OFF ≡ B2).

**Implementation:** `experiments/h1r/` (transform edit `R3-ENV-SEED`, `env_seed.mjs`, `runtime.mjs`, `run_h1r.mjs`). Verification evidence is in `experiments/h1r/evidence_r3/`.

## 1. Text superseded for H1-R

Frozen M7 §5.1 (`M7_PREREGISTRATION.md`, SHA-256 `2f12e309…f6b9`), table row:

> | Environment stream | derived: `agentSeed XOR 0x5EED` | Bernoulli traversal draws **only** |

**Reason (D-3B):** that seed has no configuration component, so every configuration and every arm run with one agent seed consumed the **same** uniform sequence. Measured in the R2 verification:
- every one of 820,871 outcomes was exactly `u_k < p_e` (R2x);
- yet the shared sequence produced the same-signed deviation in every run (pooled z = −14.1 in Phase I, +19.7 in Phase II).

The configurations the frozen analysis treats as independent clusters were therefore coupled through one environment realisation per seed.

## 2. Rule in force for H1-R (frozen)

```
envSeed = (B + slot · L · C) mod 2^32
C    = 0x6d2b79f5     (the mulberry32 increment of instrumentation/rng.js makeRng)
L    = 4096           (environment draws reserved per run)
B    = 0x60800000
slot = (agentSeed − 20260819000)·64 + blockCode·32 + acceptedConfigIndex
blockCode = 0 for the pilot block, 1 for the held-out block
0 ≤ acceptedConfigIndex < 32
```

- **Design position.** A run's position is (agent seed, block, accepted configuration index). The accepted index is the ERR-07 `acceptedConfigIndex`, which is the `configIndex` the run passes to `generateAccepted`. The rule uses the block and the index, **never** the accepted configuration seed. Held-out acceptance is sequential (ERR-07), so the accepted seeds are unknown until generated; the rule is therefore fixed and verifiable before any held-out configuration exists.
- **No arm term.** Every arm of one (configuration, agent seed) receives the same environment stream. This preserves frozen §5.2 ("identical seeds and identical stream initialisation").
- **Disjoint segments.** A mulberry32 seed is a starting state on one 2³² cycle that advances by C per draw. Slot s therefore starts exactly s·L draws after B, and every position owns a disjoint L-draw segment.
- **Stream separation is unchanged.** Draws still come only from `liveRng("environment")` (§3.7, §5.3, ruling R1). The cognitive (`agentSeed`), visual (`agentSeed XOR 0x9e3779b9`) and σ (`agentSeed XOR 0xBEEF`) seeds are untouched.
- **Verified domain.** Agent seeds 20260819000–009 (pilot and F-11 extension) and 20260819100–119 (confirmatory), both blocks, every index from 0 to 31: 1,920 segments. The derivation **refuses** any other agent seed, block or index, because non-overlap is proven only on this domain.
- **Run validity** (`run_h1r.mjs`). Every condition below must hold, or the run is invalid:
  - `initRng` registered the derived seed exactly once, for the run's own agent seed (`envStreamScoped`);
  - environment draws ≤ 4096; at most one draw per tick × `RUN_TICKS` 3000 makes this structural (`envDrawsWithinReserve`);
  - cognitive draws ≤ 1,000,000 and visual draws ≤ 65,536, the reserves of the overlap proof;
  - the run's environment segment shares no state with the generator of its own accepted configuration (`envSegmentDisjointFromConfig`; `makeConfig` consumes exactly 756 draws, against a reserve of 1,024).
- **Provenance.** `run.js` asserts `rngSeeds.environment = agentSeed XOR 0x5EED` in its record. The H1-R driver replaces that field with the seed actually registered and keeps the asserted value apart (`provenance.h1r.envStream.runJsAssertedEnvironmentSeed`).

## 3. Unchanged

Everything else is unchanged:
- topology;
- the hidden reliability distribution and `p_e` generation, including configuration generation and acceptance;
- `T_SHIFT`;
- the Beta prior and the learning rates;
- reward;
- the arm definitions;
- the cognitive, visual and σ streams;
- the R1 and R2 semantics.

Each `u_k` is still uniform. Only **which** uniform sequence a (configuration, agent seed) consumes changes.

## 4. Consequences for the analysis (not ruled here)

R3 removes the **environment** coupling between configurations. Within one agent seed, its configurations still share the agent's cognitive stream, its boot embeddings and σ. That sharing is inherent to the crossed (configuration × seed) design, and preregistration decision D-3 must still treat the seed as a crossed factor.

Evidence produced before R3 (`evidence_d1d5/` and earlier) used the B2 stream. It remains valid as mechanism verification of its own build. No H1-R outcome data exists under either stream.
