# Sibling Projects Audit: Noetica, Velith, Mini Prometheus

| Field | Value |
|---|---|
| Date | 2026-11-14 (inspection began 2026-11-12) |
| Method | Read-only inspection of sibling repositories under the lab's `repos/` directory. No build, test, experiment or git state change was performed anywhere. This file is the only file created. |
| Status | Analysis and recommendation. It decides nothing and authorises nothing. |
| Evidence rule | Every claim below comes from a file that was opened or a read-only git query. Status figures quoted from a sibling's own documents (test counts, "certified", "complete") are **that project's claims**; none was re-run here. |

## 1. Access table

| Location | Accessible? | Read | Not read |
|---|---|---|---|
| `Noetica-agent-lab` (git) | Yes | `README.md`, `ROADMAP.md` (first 60 lines), `pyproject.toml`, `docs/PROJECT_STATE.md` (first 80 lines), `docs/registry/PRIMITIVE_REGISTRY.md`, `src/noetica/evaluation/harness.py`, `evaluation/heldout.py`, `memory/store.py`, `memory/filters.py`, `runtime/runtime.py` (first 110 lines), `sdk/agent.py`, `datacontracts/registry.py` (first 60 lines); file list and line counts | The Handbook/Constitution, `DECISIONS.md`, all tests, `reference/` contents, the other 15 subsystems, `tools/` |
| `Velith` (git) | Yes | `README.md` (first 110 lines), `pyproject.toml` (first 70 lines), `docs/PROJECT_STATE.md` (first 50 lines), docstring heads of `src/velith/analysis/mcnemar.py` and `corpus/heldout.py`, a grep for seed handling; file list and line counts | `docs/DECISIONS.md`, M0–M9 specs, `geometry/`, `api/`, `harness/verifier_sandbox.py`, the rest of `analysis/`, all tests |
| `Velith-research` (git) | Yes | `RESEARCH_STATUS.md` (first 70 lines), top-level and second-level listing | All pilots (`p1`–`p4`), `stats/egrid`, `ic1`, `api0`, `reviews`, every top-level governance draft |
| `mini-prometheus` (git) | Yes | `README.md`, `pyproject.toml` (first 120 lines), `docs/ROADMAP.md` (first 60 lines), `src/mini_prometheus/experiment/protocol.py`, `partition.py`, `arms.py`, `runner.py` (first 80 lines), `docker/verifier.Dockerfile`, `tools/verify_installed_wheel.py` (first 60 lines), `.github/workflows/ci.yml` (first 80 lines); file list | `constitution/`, ADRs, specs, scheduling/planning/constraints source, tests, `demo/` |
| `mp-rm6-admission` | Yes | `.git` pointer file, `README.md` head, `git log -1`, top-level listing | Everything else |
| `mp-verify-ab8cc44` | Yes | `.git` pointer file, `git log -1`, top-level listing | Everything else, including its README |
| `sfg_package` (git) | Yes | `SFG_DECISION_PACKAGE.md` (first 50 lines), file list, status | `evidence/`, `history/`, the remainder of the package |
| `VELITH_AUDIT_AND_NEXT_MILESTONE_2026-10-29.md` | Yes | First 140 lines (sections 0–5) | Sections 6 onward |
| `AI MANUFACTURING` | Yes, **not empty** | Directory listing to depth 3 only | All documents (a `gate0` decision package, an ecosystem audit dated 2026-11-03, review bundles) |
| `Dimension` | Yes, **not empty** | Listing; `git log -1` of `world-state-engine`; licence head of `reference/gods-eye-view` | All source in both sub-repositories |
| `research` (under `repos/`) | Yes | Listing: `phase0`, `phase1`, `phase2` directories | Their contents |

The three "empty-looking" directories together hold about 2,578 files; they are not empty, and they were not audited.

### Lab root (names only, one level)

`Evidence-Driven Decision Intelligence System`, `archives`, `benchmarks` (empty), `docs` (empty), `experiments` (empty), `github-trending-mission` (empty), `p4census-archive`, `pcos-samantha`, `prompts` (empty), `repos`, `research` (empty).

Related to MiniFlyWire: `archives/` only. It holds the raw-data archives named after MiniFlyWire experiment blocks (`coga`, `gate-floor-interaction`, `gate-floor-prodsem`, `learn0`). `p4census-archive` belongs to Velith-research (P4 census and probe tarballs). The remaining populated directories look unrelated.

## 2. Noetica (`Noetica-agent-lab`)

**What it is.** By its README, Layer 2 of a four-layer ecosystem (MiniFlyWire → Noetica → Velith → Mini Prometheus): a domain-agnostic "agent intelligence platform" that owns mechanisms, typed interfaces and a state substrate, and deliberately contains no cognition, no domain oracle and no LLM wrapper. It is published as the package `noetica` 1.0.0.

**Stack and state.** Python ≥ 3.10, standard library only at runtime, hatchling build. 228 tracked files, 56 commits; about 4,360 lines under `src/noetica`. Last commit `44d380b`, 2026-09-28, "release: publish Noetica as the installable, versioned package noetica 1.0.0 (DN-9)". Branch `transform/noetica-canonical`, 7 commits ahead of its remote, working tree clean. **No LICENSE file**; the README's "License / quality bar" section states no licence.

**Architecture.** 21 subsystem packages mapped one-to-one to a constitution chapter (`interfaces`, `state`, `provenance`, `episodes`, `memory`, `evaluation`, `verification`, `planning`, `reasoning`, `reflection`, `runtime`, `sdk`, and others), ordered by a strict acyclic import DAG that CI enforces (`tools/check_boundaries.py`, `tests/architecture/`). The `Runtime` (`runtime/runtime.py`, 228 lines) is an integrator: a state machine `setup → [guard → activate → dispatch | verify → yield]* → persist → teardown`, with every mechanism injected and a hard `max_steps` bound. Cognition enters only as an injected `Activator` callable.

**Its own claims.** `docs/PROJECT_STATE.md`: "Platform Engineering COMPLETE & FROZEN", `mypy --strict` clean on 89 files, 181 tests, 15 architecture tests. Not re-run here. Two candid statements matter more: the package "is not yet consumed by Velith or Mini Prometheus" (Velith's `pyproject.toml` now pins it, so this line is stale), and `docs/registry/PRIMITIVE_REGISTRY.md` is **empty by design**: no MiniFlyWire mechanism has ever been promoted.

**Reusable for MiniFlyWire.**
- `evaluation/harness.py` + `evaluation/heldout.py` (142 lines together): arms run over a locked held-out set; the harness raises if an arm's state revision or memory changes during measurement, or if a held-out id appears in memory. This is a clean, small statement of "frozen evaluation" as an executable invariant.
- `memory/filters.py` + `memory/store.py`: the write filter is the single manipulated variable, with the retriever held identical across arms. That is exactly the design discipline MiniFlyWire's store experiments needed (the XFER and GATE-FLOOR arms vary what enters a store).
- `datacontracts/registry.py`: versioned payload schemas with registered forward migrations.
- The architecture tests as a pattern: an import-boundary gate that fails closed.

**Overlap.** `reference/miniflywire/` holds a 14-file copy of MiniFlyWire's early research corpus (vision, axioms, ontology, notebook). It is a snapshot from before 2026-09-28 and will have diverged; it must not be treated as current. MiniFlyWire has independently built held-out discipline, typed registries with an import-isolation gate, and store-ablation arms.

**Do not reuse / conflicts.** The harness measures only a pass rate per arm: no seeds, no confidence intervals, no paired contrasts. MiniFlyWire's harnesses are statistically richer; adopting Noetica's would be a downgrade. `Runtime.start_episode` uses `uuid.uuid4()`, which is non-deterministic identity and would violate MiniFlyWire's seeded-reproducibility rules if carried over. No source file contains a seeded RNG. Without a licence the code is all-rights-reserved by default; copying it into the MIT-licensed MiniFlyWire repository would be unclean even with a common owner, until a licence is declared.

## 3. Velith

**What it is.** By its README, Layer 3: a "grounded, verification-first engineering-intelligence research harness". Its software vertical has a local model propose a patch, a hardened container verify it against hidden tests, and the outcome persisted as a content-hashed episode. It is building toward a pre-registered compounding experiment (does verified memory help?).

**Stack and state.** Python 3.12 exactly; `pydantic`, `pydantic-settings`, and Noetica 1.0.0 pinned by git tag; optional `statsmodels` (analysis) and an OCCT binding (geometry). 227 tracked files, 125 commits, about 9,300 lines under `src/velith`. Last commit `e903f03`, 2026-11-05, "docs(gate0): restore the frozen D34/D35 index wording". Branch `main`, in sync with its remote; untracked junk in the tree (`next-env.d.ts`, a `pytest-cache-files-*` directory, committed-looking `__pycache__` directories on disk). **No LICENSE file; `pyproject.toml` declares `license = "Proprietary"`.**

**Architecture.** `agent/proposer` → `harness/verifier_sandbox` (two-phase, network-off verification) → `episodes/` (append-only JSONL plus a rebuildable SQLite index) → `corpus/` (manifest and held-out lock) → `batch/` (run provenance, per-task derived seeds, cost guard) → `retrieval/` → `arms/` (A0/A1/A2 write filters) → `evaluation/` → `analysis/` (pre-registration, exact McNemar, Holm, Wald, GEE, EMM, trend, decision). A newer `geometry/` and `api/` add an exact-geometry verifier and an engineering API.

**Its own claims.** README and `docs/PROJECT_STATE.md` (updated 2026-10-31): M0–M9 complete and tagged; M10 in progress on **synthetic fixtures only**; "No real evaluation and no go/no-go verdict exist yet". The README still says version `0.0.0` and unpublished while a `v0.1.0` tag exists and PROJECT_STATE says no such tag exists: the status documents disagree with git. The external audit file dated 2026-10-29 records 741 tests at an older commit and concludes that the central experiment may be infeasible on task supply and contamination.

**Reusable for MiniFlyWire.**
- `analysis/mcnemar.py` (115 lines): exact one-sided McNemar from integer binomial coefficients, no approximation. `analysis/holm.py` (97 lines): Holm-Bonferroni. `analysis/preregistration.py` + `prereg_store.py`: a pre-registration artifact recorded before outcomes are read. These map directly onto MiniFlyWire's freeze-before-outcome rule, for paired binary endpoints.
- `corpus/heldout.py`: a held-out lock keyed on content-addressed task identity, with a single guarded writer that fails closed.
- `batch/provenance.py` (`derive_task_seed`): per-task seeds derived deterministically from task identity and a batch seed. Only the call site was read, not the function body.

**Overlap.** Pre-registration, held-out locks, content-addressed evidence, write-filter arms and mutation-tested gates exist in both projects, built separately in two languages.

**Do not reuse / conflicts.** The licence is declared proprietary: no code may be copied into MiniFlyWire. `statsmodels`, the OCCT binding, Docker and an Ollama-served model are heavy dependencies with nothing to offer a zero-dependency Node project. The statistics target paired pass/fail outcomes on tasks, whereas MiniFlyWire's primary endpoints are counts over seeded worlds with bootstrap intervals; only McNemar and Holm transfer, and both are small enough to re-derive.

## 4. Velith-research

**What it is.** The evidence and pilot repository for Velith, with no decision authority (its `RESEARCH_STATUS.md` says ratified decisions live in Velith's `docs/DECISIONS.md`). It holds pilots P1–P4, an exact-power grid (`stats/egrid`), reference implementations and governance drafts.

**State.** 2,223 tracked files (about 1,900 are evidence under `p1`–`p3` and `stage0`), 32 commits. Last commit `74716ba`, 2026-10-31, "feat(api-0): add isolated consumer validation (C4b)". Branch `main`. **Tree is dirty**: one modified markdown file, one modified zip, and one evidence file deleted with an untracked copy whose name contains characters that are illegal on Windows (a colon-bearing timestamp). No LICENSE file; the status file says the repository is public under a named policy. Its status file is dated 2026-10-22 and predates the last commit.

**Reusable.** As a documentation pattern only: the separation of an authority repository from a possibly-wrong research repository, and the P4 "freeze the protocol, then run exactly once" launcher idea (`p4/probe/act_c_once.sh`, not read). Nothing here is code MiniFlyWire should take.

**Caution.** The colon-in-filename problem is a concrete Windows hazard: MiniFlyWire evidence files should never embed ISO timestamps with colons.

## 5. Mini Prometheus (`mini-prometheus`)

**What it is.** By its README, Layer 4: manufacturing intelligence. Given an engineer-declared request and a declared shop capability model, it plans, verifies manufacturability with a deterministic oracle, logs a content-hashed episode, reuses verified experience, and schedules multiple jobs deterministically. It states that it is "not a research project".

**Stack and state.** Python ≥ 3.11; `jsonschema` is the only runtime dependency; pinned dev toolchain; Docker verifier as the authoritative gate. 367 tracked files, 54 commits. Last commit `d4fe151`, 2026-11-07, "feat(adr-0023): demonstration-ready pilot UI with Hindi; ADR-0023 record correction". Branch `main`, in sync with its remote, clean. Runtime `0.13.0`, contracts `0.5.0`. **No LICENSE file.**

**Architecture.** `constitution/` (frozen theory) → `contracts/` (JSON Schemas with generated Python bindings) → `src/mini_prometheus/` (planning, constraints, scheduling, precedent, judgment, experience, orchestration, and a leaf `experiment/` package). Dependency direction is enforced by `import-linter` contracts in `pyproject.toml`, including one that forbids importing `miniflywire` and one that keeps precedent out of every verdict path.

**Its own claims.** `docs/ROADMAP.md` records RM1–RM5, RM8–RM14 and MP-S1 complete, with the Velith and Noetica integrations (RM6, RM7) **not built**, all acceptance on synthetic declarations, and real-world evaluation blocked. RM15 is recorded with a mixed result (H2 and H4 not met). The record is unusually candid about its limits.

**Reusable for MiniFlyWire.**
- `experiment/protocol.py`: a frozen evaluation protocol with a machine-readable **Statement of Claims**, including an explicit `cannot_claim` list embedded in every report. This is the single most transferable idea in the ecosystem.
- `experiment/partition.py` (45 lines): a content-addressed held-out split (hash bucket modulo 4) with a leakage-safe checkpoint id; no RNG, no seed to manage.
- `experiment/arms.py`: an Arm1 ≡ Arm2 validity control (two arms that must produce byte-identical outputs by construction), proving the outcome depends only on the manipulated input.
- `.github/workflows/ci.yml`: "behavioural zero-diff" gates that diff frozen source against a tag and compare default behaviour to a golden frozen by digest, never regenerated from the current implementation.
- `tools/verify_installed_wheel.py` and `docker/verifier.Dockerfile`: verdicts produced in a pinned container, not on the host.

**Overlap.** MiniFlyWire already has byte-identity checks against a pristine baseline, frozen blocks, and gates with mutants. The Arm1 ≡ Arm2 control parallels MiniFlyWire's identity and fidelity passes.

**Do not reuse / conflicts.** The domain content (planning, scheduling, shop models) is irrelevant to a cognitive agent. All metrics are exact rationals over a deterministic oracle; there is no stochastic machinery. Its constitution forbids importing MiniFlyWire, so any direct coupling would break its own CI.

## 6. Mini Prometheus worktrees and the SFG package

**`mp-rm6-admission`.** Not a "non-git copy": its `.git` file points into `mini-prometheus/.git/worktrees/`. It is a linked worktree on branch `rm6.0-admission` at `c2e3b98` (2026-11-03, "feat(rm6): enforce design artifact media type admission"). The main roadmap records this branch as parked and its premise as stale. Nothing to reuse.

**`mp-verify-ab8cc44`.** Also a linked worktree, detached at `ab8cc44` (2026-10-23, a STEP-artifact traceability test). It appears to be a verification checkout of an old commit. Nothing to reuse. Because both are worktrees, any git command run inside them acts on the main repository's object store; they should be handled with care.

**`sfg_package`.** A Velith "Stage-1 Feasibility Gate" decision package: one decision document at revision r5, a SHA-256 manifest, and versioned evidence and history directories. One commit (`47d589c`, 2026-10-29). **Tree is dirty** with staged and untracked revisions (r4, r5, audit directories). Its own status line reads "SFG-1 NOT READY"; one gate passed within technical scope, five open. Reusable as a documentation pattern: evidence labels `[PROVEN] / [ASSUMED] / [UNKNOWN] / [PROVISIONAL]`, a numbered revision log, and prior revisions preserved by hash. It also records defects found in its own exact-power code, which is a reason not to borrow that code unreviewed.

## 7. Reuse table

| Asset | Path | Licence | Value for MiniFlyWire | Cost | Recommendation |
|---|---|---|---|---|---|
| Statement of Claims with `cannot_claim` | `mini-prometheus/src/mini_prometheus/experiment/protocol.py` | None declared | High: forces every report to state what it may not claim | Low (an idea, about 30 lines in JS) | **Adopt the pattern**, re-implemented |
| Identical-arms validity control | `mini-prometheus/.../experiment/arms.py` | None declared | High: cheap proof that only the manipulated input matters | Low | **Adopt the pattern** |
| Frozen-evaluation invariant (state/memory unchanged during measurement) | `Noetica-agent-lab/src/noetica/evaluation/harness.py` | None declared | Medium: MiniFlyWire checks this ad hoc per harness | Low | Re-implement as a shared assertion |
| Write filter as the single manipulated variable | `Noetica-agent-lab/src/noetica/memory/filters.py`, `store.py` | None declared | Medium: design rule for store experiments | Low | Adopt as a design rule |
| Content-addressed held-out split | `mini-prometheus/.../experiment/partition.py` | None declared | Medium: seedless, leakage-safe | Low | Consider for task-level splits; seeded world blocks already cover this |
| Exact McNemar, Holm | `Velith/src/velith/analysis/mcnemar.py`, `holm.py` | **Proprietary** | Medium, only if paired binary endpoints are used | Low to re-derive from the textbook definition | Re-derive; **do not copy** |
| Behavioural zero-diff CI gate | `mini-prometheus/.github/workflows/ci.yml` | None declared | Medium: MiniFlyWire has local equivalents, not CI ones | Medium | Borrow the idea when CI is extended |
| Evidence labels and revision log | `sfg_package/SFG_DECISION_PACKAGE.md` | None declared | Low to medium | Trivial | Optional documentation convention |
| Noetica `Runtime` as an agent loop | `Noetica-agent-lab/src/noetica/runtime/runtime.py` | None declared | Low: Python, propose-verify shaped, non-deterministic ids | High (language bridge, determinism fixes) | **Do not adopt** |
| Velith sandbox, geometry, GEE stack | `Velith/src/velith/harness`, `geometry`, `analysis/gee.py` | **Proprietary** | None | High | **Do not reuse** |
| Seeded-RNG utility | none found in any sibling | — | — | — | MiniFlyWire's own is the only one |

## 8. Is there a shared-substrate story?

**Not a credible one today. Keep the projects independent and share patterns, not code.** Reasons, in order of weight:

1. **The ecosystem's own rules forbid it.** Noetica's README says MiniFlyWire's validated mechanisms are "re-implement[ed], never import[ed]". Mini Prometheus enforces "MiniFlyWire is never imported" in CI. The designed flow is one-way and by re-implementation: MiniFlyWire proves a mechanism, Noetica re-implements it. Running MiniFlyWire's agent *on* Noetica or Mini Prometheus inverts that flow.
2. **The promotion path has never been exercised.** Noetica's Primitive Registry is empty. Before asking whether substrates can be shared, the ecosystem has not yet shown that one finding can cross one boundary.
3. **Language and runtime mismatch.** MiniFlyWire is browser/Node JavaScript with a zero-dependency posture; all three siblings are Python (3.10, 3.11 and exactly 3.12). A bridge would add a process boundary to experiments whose value rests on byte-level reproducibility.
4. **Shape mismatch.** The siblings share a `propose → verify → log` episode with an external oracle. MiniFlyWire's cognitive agent is a continuous perception-action loop in seeded worlds with no oracle. Noetica's `Runtime` has no notion of a world, a tick or a seed.
5. **Statistical regress.** Noetica's harness reports a pass rate; MiniFlyWire's harnesses already carry seeded blocks, intervals, pre-outcome freezes and mutant-tested gates. The reuse direction that makes sense is MiniFlyWire → siblings, not the reverse.
6. **Licensing.** No sibling carries a LICENSE file; Velith declares itself proprietary. MiniFlyWire is MIT. Code should not move until that is resolved, even between repositories with one owner.
7. **Sibling readiness.** Velith's central experiment is recorded as possibly infeasible; Mini Prometheus's upstream integrations are unbuilt; two sibling trees are dirty. None is a stable foundation to build on.

**What is worth doing instead.** Adopt three patterns in MiniFlyWire by re-implementation: the Statement of Claims with a `cannot_claim` list, the identical-arms validity control, and a shared frozen-evaluation assertion.

**Smallest experiment that would test integration.** Test the designed direction, not the inverted one: a one-finding promotion dry run.

- Pick one closed, replicated MiniFlyWire result with a crisp behavioural contract (for example, the goal-entry floor, which replicated across four frozen blocks).
- Write its contract as a language-neutral fixture: a JSON file of input states and the expected decision for each, generated once from MiniFlyWire's frozen code and pinned by digest.
- Pre-state the pass criterion: an independent re-implementation in a scratch Python module, shaped as a Noetica-style injected `Activator` or write filter, must reproduce every fixture row exactly.
- Scope: one fixture file, one scratch module, no edit to any sibling repository, no dependency added to MiniFlyWire. It needs owner authorisation, since it touches the promotion gate.

If the fixture cannot be written (the mechanism is too entangled with `main.js` to state as input → decision rows), that is itself the answer: the cognitive findings are not yet portable, and substrate sharing is premature. If it passes, the ecosystem has its first registry candidate and a reusable template for the next one.

## 9. Limits of this audit

- Sibling test suites, gates and CI were not run; all pass counts are quoted, not verified.
- Constitutions, decision ledgers, ADRs and most source were not read (see the access table).
- `AI MANUFACTURING`, `Dimension` and `repos/research` were listed, not audited. `Dimension` contains two further git repositories, one of them a third-party MIT-licensed reference project.
- The audit file dated 2026-10-29 describes Velith at an older commit than the one inspected here.
