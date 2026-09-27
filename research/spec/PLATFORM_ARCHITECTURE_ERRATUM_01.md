# Platform-Architecture Documents — Erratum 01: superseded by the ecosystem Handbook v1.1

**Erratum ID:** SPEC-ERR-01
**Date:** 2026-09-28
**Author:** Chief Systems Engineer
**Authority:** Director ruling of 2026-09-28 (I1 — four-repository architecture alignment), recorded as
[D-012](../09_decisions.md).

**Binds to frozen artifacts** (frozen 2026-07-16 in `0a19b37`; SHA-256 of the committed bytes):

| Document | SHA-256 |
|---|---|
| [`REPOSITORY_RESPONSIBILITY_MATRIX.md`](REPOSITORY_RESPONSIBILITY_MATRIX.md) | `268c9485cef908f76b33951bb0f0e7fbf012406b02085cecf72b9ab9aa095e88` |
| [`PROMOTION_WORKFLOW.md`](PROMOTION_WORKFLOW.md) | `d02c47e47d0a9f1cc8f6b9a6d091ad6ce8b7b450154c068eef77f44fba02424c` |
| [`TRACEABILITY_spec_to_noetica_AND_boundary.md`](TRACEABILITY_spec_to_noetica_AND_boundary.md) | `d72c1eaed804ebd8316a784139a5d22695317ea35b046e243a8cec6edcaa8c28` |
| [`TRACEABILITY_spec_to_velith.md`](TRACEABILITY_spec_to_velith.md) | `059dc33e9e38cfa75248864d79f7ff6810cff5afb55e39ce044f52913fed6a8f` |

Verify: `git show 0a19b37:research/spec/<document> | sha256sum`.

> **THE FOUR FROZEN DOCUMENTS ARE NOT MODIFIED BY THIS ERRATUM.** Their bytes and digests are
> unchanged; they are retained as **HISTORICAL** provenance (vocabulary of
> [`docs/VERIFICATION_STATUS.md`](../../docs/VERIFICATION_STATUS.md) §1). This erratum supersedes only
> their repository-responsibility and promotion-routing content, named exactly in §2. The Computational
> Specification, the candidate-admission specification, and every research result, pre-registration,
> gate and erratum remain in force exactly as written.

---

## 1. Why an erratum

The four documents (dated 2026-06-27, frozen 2026-07-16) assign repository responsibilities that
contradict the ratified ecosystem constitution, *The Engineering Constitution and Architecture Handbook*
**v1.1** — "Ecosystem: MiniFlyWire → Noetica → Velith → Mini Prometheus", the highest-priority artifact
of the ecosystem, held byte-identical in Noetica (`docs/constitution/HANDBOOK_v1.1.md`, imported there in
`e27bab4` on 2026-07-01) and in Mini Prometheus (`constitution/HANDBOOK_v1.1.md`); SHA-256
`ad670d24eaab6acb2cca301223dfb58d9216b6ee89e87fd569638af3a00eafd0`.

The Handbook was already ratified when these documents were frozen, so the contradiction was present at
freeze. An erratum is used — not an edit and not a re-freeze — so that the original digests keep
validating and the correction is dated, attributable and separately reviewable.

## 2. Superseded content, stated exactly

| Frozen statement (where) | Superseded by — Handbook v1.1 |
|---|---|
| Noetica is "the Memory (Knowledge authority, K-face)" only (matrix §0, §2) | Noetica is the Layer-2 platform: general agent/runtime mechanisms, state substrate, memory/context, provenance, evaluation, reasoning/planning *form*, the verifier protocol, tool interfaces and general orchestration mechanisms. |
| Velith is "the Judiciary (Verification authority)" and must never own knowledge representation (matrix §0, §3) | Velith is Layer 3, engineering intelligence: engineering ontology and content, engineering reasoning, CAD/simulation, engineering verification and verified engineering results, published through `EngineeringTask` / `EngineeringResult` / `DesignArtifact`. |
| Mini Prometheus is "the Executive (Engine & Orchestrator)", "the *only* repository that calls the others" (matrix §0, §4, §9) | Mini Prometheus is Layer 4, manufacturing intelligence: planning, manufacturability, constraints, resources, scheduling and factory adapters. It consumes Velith's engineering API (and Noetica's mechanisms) through pinned, versioned packages; its orchestration is manufacturing runtime orchestration only. |
| Information flows MiniFlyWire → {Noetica, Velith, Mini Prometheus} in parallel, with a Noetica ↔ Mini Prometheus runtime loop (matrix §1, §2, §8; both traceability documents) | Dependencies are linear: MiniFlyWire → Noetica → Velith → Mini Prometheus. MiniFlyWire is imported by no repository (Handbook Law 4); its only arrow is the Knowledge Flow — a specification that Noetica re-implements. |
| S2/G2 routes a validated mechanism by the matrix to one or more target repositories; S4 independent verification belongs to Velith; S5 activation belongs to Mini Prometheus "as runtime orchestrator" (promotion workflow S2–S5, §3, §6) | The promotion process is Handbook §11.3: certification against the promotion gate (§5.5), entry in **Noetica's** Primitive Registry (§11.5), **re-implementation by Noetica** behind a versioned interface (Law 7), and a decision record. A cognitive primitive is promoted into Noetica only; engineering content belongs to Velith and manufacturing content to Mini Prometheus. |
| Noetica is an education-domain "cognitive-primitives laboratory" (Noetica traceability §0) | Historical only. That repository was transformed into the Layer-2 platform (Noetica DN-2; tag `platform-engineering-v1`). |
| Velith baseline M0–M6 (Velith traceability, header) | Historical baseline only. |

## 3. What remains in force

- MiniFlyWire's research gates G0 (specification conformance) and G1 (scientific validation), their
  criteria and their order. Certification for promotion is governed by the Handbook's promotion gate
  (§5.5); where the frozen workflow's G2–G5 / S2–S5 assign a target or an owner differently from
  Handbook §11.3, the Handbook governs.
- The Computational Specification and `CANDIDATE_ADMISSION_SPEC.md`.
- Every research artifact of this repository.

**No mechanism is currently routable.** None has passed G1
([`ENGINEERING_READINESS_REVIEW_2026-06-27.md`](../ENGINEERING_READINESS_REVIEW_2026-06-27.md), verdict;
claim ledger in [`SYNTHESIS_M7_M8_M9_Q1.md`](../SYNTHESIS_M7_M8_M9_Q1.md) §10).

## 4. Scope

Governance only. This erratum authorises no experiment, creates no observable, specifies no protocol,
generates or inspects no seed, and modifies no frozen artifact.
