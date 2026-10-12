# MCF-1 Phase 1 harness (`M-MCF1-HARNESS`)

Engineering harness for MCF-1 Phase 1. It **does not run the experiment**. No seed is registered or consumed,
no confirmatory seed is touched, the design is **not frozen**, and every official stage refuses to start
(`config.assertOfficialAllowed`). Everything here is read-only with respect to H1-R and the seed registry.

## The question the harness is built to ask

On the frozen B2-conformed agent, at node 10 with goal 12, does a restored prior episode on the reliable
(rather than the unreliable) of two matched two-hop routes steer the **first routing choice**, and what does
that do to **first-edge traversal success**? One decision and one environment attempt per run.

* Endpoint: first-edge traversal success. It is **not** goal arrival (node 12 is not a neighbour of node 10).
* Contents: `C` (no memory), `M9` and `M11` (one episode on route 10→9→12 or 10→11→12, delivered through the
  product's own `loadBrain()`).
* Twins: `T9` / `T11` swap which route has the reliable edge probability (0.95 against 0.35). Both twins and all
  three contents run under common random numbers per seed (six runs per seed).
* Sampling: **Option C**, a census of the entire frozen, qualified, valid finite frame. No test, p-value or
  interval is produced and nothing is claimed beyond the frame.
* Primary descriptive outcome (provisional): the counterbalanced steering rate `T_frame`. The first-edge outcome
  contrast is secondary and mechanically linked to it.

## Stages

| stage | what it does | outcome visible? |
|---|---|---|
| `inventory` | reserved stream-span inventory + hash | no |
| `admit` | deterministic ascending admission scan + hash | no |
| `qualify` (Q) | one cold decision-stop run per admitted seed | no |
| `validate` (V) | six decision-stop runs per qualified seed; validity manifest + hash | no (the sink throws on any attempt) |
| `outcome` (O) | refuses without an intact V manifest and its independently supplied hash; stops at the first attempt | yes, nothing else |
| `analyze` | reads the validity manifest first, then outcomes; descriptive census | yes |

Selection depends on no outcome. Stage O can only invalidate a seed for an instrument reason or halt the stage;
it never adds, replaces or re-admits a seed.

## Files

| file | role |
|---|---|
| `config.mjs` | constants, approval ledger (`FROZEN = false`), seed policy, official-stage gate |
| `inventory.mjs` | reserved-span inventory (H1-R records and domain, R3 environment slots, exploratory block, examined exposure) |
| `admission.mjs` | deterministic admission clauses and accounting |
| `episodes.mjs` | the registered memory contents |
| `driver.mjs` | one run per process (modes Q, V, O) |
| `validity.mjs` | pre-outcome validity rules V1 to V12, manifests |
| `orchestrate.mjs` | stage orchestration and CLI |
| `analyze.mjs` | descriptive census analysis |
| `verify_mcf1.mjs` | verification gates and anti-vacuity mutants |
| `data/` | git-ignored output directory for development runs |

## Running (development seeds only)

```bash
node experiments/mcf1/verify_mcf1.mjs
node experiments/mcf1/orchestrate.mjs admit --mode development --out experiments/mcf1/data/dev --start 1100000000 --length 100
```

Development mode is confined to the exploratory domain (raw seeds 1,100,000,000 to 1,100,199,999). The candidate
block at 1,500,000,000 is refused in development mode on purpose, and official mode is refused until a freeze
record exists.

## What is NOT decided (see `config.mjs` `APPROVALS`)

Steering-rate definition, seed block start and scan length, Phase-1 stream budgets, the instrument-halt
threshold, registry-record scope, the minimum valid frame, a practical threshold (or none), and the claim
wording. The harness carries candidate values for these and refuses to treat any of them as frozen.
