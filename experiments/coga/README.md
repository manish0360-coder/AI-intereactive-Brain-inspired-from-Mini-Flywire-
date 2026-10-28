# COG-A — cross-state propagation after an unannounced change (running record)

**Question.** After an unannounced change of the hidden edge reliabilities in the M7 graph world, does MiniFlyWire (map oracles
off) change its choice at decision states whose best action changed for *downstream* reasons, at its first post-change decision
there, more than without the change, and more specifically than general randomisation would? (Primary estimand θ, M1_AUDIT.md §5.)

**Claim limits fixed in advance.** A positive result would show cross-state propagation of experienced change (planning or replay)
in this world class only. It would not show a cognitive map, model-based planning as such, general cognition or general
intelligence. A null shows only that this procedure detected no propagation.

## Milestones

| milestone | status | commit | verification |
|---|---|---|---|
| M-COGA-1 repository and scientific audit | done | (this commit) | CREDIT-1 gate 115/115 + 299/299 at `4122186`; distal tests 11/11 |
| M-COGA-2 frozen design and static census | next | — | — |
| M-COGA-3 environment, agents, instrumentation | — | — | — |
| M-COGA-4 verification and development validation | — | — | — |
| M-COGA-5 preregistration and confirmatory readiness | — | — | — |
| M-COGA-6 confirmatory experiment and analysis | — | — | — |
| M-COGA-7 final scientific report | — | — | — |

## Pending blockers and next decision

- Static census (zero sessions): do distal states exist in enough worlds? If not, stop before any session and present a design
  revision.
- δ and q_min need a substantive rationale (Research Director), presented with power curves before the freeze.

## Files

| file | role |
|---|---|
| `M1_AUDIT.md` | evidence ledger, QB-1 null proof, RNG, estimand and distal-construction audit |
| `distal.mjs` | distal-state classification (pure) |
| `test_distal.mjs` | `node experiments/coga/test_distal.mjs` — independent mathematical tests |
