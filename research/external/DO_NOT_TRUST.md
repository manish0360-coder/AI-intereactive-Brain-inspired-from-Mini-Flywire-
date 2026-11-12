# Do Not Trust

Projects and claims that look highly relevant but should **not** be adopted on current evidence. Listing here is not a judgement of technical merit — it records why adoption would replace our reinvention problem with a dependency problem. Metadata API-verified 2026-09-20.

---

## A. Blocked by license

| Project | Verified license | Why it matters |
|---|---|---|
| [crbnos/carbon](https://github.com/crbnos/carbon) | **AGPL-3.0** (LICENSE read) | The most complete open MES/ERP/MRP found (2560★, pushed 2026-09-20). AGPL's network clause reaches hosted use, so it cannot back a closed product without accepting copyleft. Its own LICENSE also notes portions under differing terms — **mixed licensing, needs legal reading, not a skim.** |
| [Mes-Open/OpenMes](https://github.com/Mes-Open/OpenMes) | **AGPL-3.0** | Same gate; PHP stack also mismatches our platforms. |
| [opencog/atomspace](https://github.com/opencog/atomspace) | **AGPL-3.0** (LICENSE read) | Frequently cited as a knowledge substrate; copyleft makes it unusable as a linked component. |
| [zibozzb/FeatureNet](https://github.com/zibozzb/FeatureNet) | **GPL-3.0** | Viral for linked use, and unmaintained since 2019-05-13. |

## B. No license grant at all

| Project | Status | Consequence |
|---|---|---|
| [AndrewColligan/CADNet](https://github.com/AndrewColligan/CADNet) | **no LICENSE file at HEAD**; last push 2021-05-28 | Public on GitHub grants no reuse rights. Cannot be copied or adapted, whatever the paper says. |
| [openai/random-network-distillation](https://github.com/openai/random-network-distillation) | **no LICENSE file**, **ARCHIVED**, last push 2020-10-01 | The canonical RND reference implementation is legally unusable and abandoned. |
| [gabejohnsnn/OpenMRP-System](https://github.com/gabejohnsnn/OpenMRP-System) | **no LICENSE file**; 3★ | No rights, no community, no evidence. |
| [salabim/salabim](https://github.com/salabim/salabim) | **no LICENSE at HEAD** (404 on LICENSE/COPYING variants); 404★ | Good technical fit for factory DES, but the license must be resolved before it can even be shortlisted. **LICENSE-UNCLEAR, not license-free.** |

## C. Immature or unproven despite an attractive description

| Project | Evidence | Why not |
|---|---|---|
| [factorysemantics/factorysemantics-mes](https://github.com/factorysemantics/factorysemantics-mes) | Apache-2.0, pushed 2026-09-19, **1 star** | Describes exactly what Mini Prometheus wants (OPC UA in, OEE out, MCP agent surface). One star and a recent creation date mean there is no operational evidence whatsoever. Permissive license makes it worth *reading*, not depending on. |
| [xmy2000/MFTReNet](https://github.com/xmy2000/MFTReNet) | MIT, 19★, pushed 2024-04-22 | Interesting topological-relation prediction; too small a project to carry a pipeline stage. |
| [aewallin/opencamlib](https://github.com/aewallin/opencamlib) | LGPL-2.1, 538★, last push 2025-02-12 | Real toolpath geometry, but low activity; adopting it likely means maintaining it. |

## D. Claims contradicted by inspection

| Claim | Source | What inspection showed |
|---|---|---|
| "CadQuery is licensed under LGPLv3" | widely cited comparison blog, 2026 | **The LICENSE file at HEAD is Apache-2.0.** Had we taken the blog at face value, we would have wrongly excluded a permissive dependency — or worse, wrongly included one under an assumed obligation. |
| "Open-source MES exists for our use case" | vendor/comparison articles | The mature options are **AGPL**; the permissive one has 1 star. The category looks solved and is not. |
| Benchmarks/accuracy reported by feature-recognition READMEs | AAGNet, MFTReNet, FeatureNet, CADNet | **UNVERIFIED.** No test, CI or benchmark was executed or inspected at source level in this pass. Treat every reported metric as a claim. |

## E. Architecturally hazardous even where technically strong

| Project | Risk |
|---|---|
| [letta-ai/letta](https://github.com/letta-ai/letta), [mem0ai/mem0](https://github.com/mem0ai/mem0), [topoteretes/cognee](https://github.com/topoteretes/cognee) | Each bundles a *cognitive commitment* (what memory is, when it is written, how it is retrieved) with its storage. Adopting one into Noetica would import an unvalidated memory model and bypass MiniFlyWire's validation path — the exact drift the constitution forbids. Adopt as a **storage driver behind our own contract**, or not at all. |
| [langchain-ai/langgraph](https://github.com/langchain-ai/langgraph) | Durable execution is genuinely useful, but framework lock-in would shape Noetica's control flow around another project's abstractions. |
| [SoarGroup/Soar](https://github.com/SoarGroup/Soar), [trueagi-io/hyperon-experimental](https://github.com/trueagi-io/hyperon-experimental) | Full cognitive architectures. Importing one would replace our research question rather than answer it. Reference only. |

## F. Paper-only, treat as reference

| Work | Status |
|---|---|
| PathUCB / PathTS (arXiv:2607.15440) | **No public repository.** The estimator formulas are readable and directly relevant, but there is nothing to adopt, and its reset-on-failure objective differs from our retry-in-place model. |
| Min-Exp-Cost-Path (arXiv:1802.00898) | Paper-only; assumes known success probabilities. |
| 2026 text-to-CAD agent line (ToolCAD, CAD-Judge, Zero-to-CAD) | Active research; repositories not source-verified here; reported invalid-output rates are themselves a warning about depending on generated CAD without our own verification layer. |

---

## Standing rule this register encodes

A repository being popular, recent, or well-described is not evidence that it works, and is never evidence that we may use it. Before anything here or in [`DO_NOT_REBUILD.md`](DO_NOT_REBUILD.md) is adopted, it needs a pinned commit, a read license file, an executed test or benchmark, and a supply-chain pass — **none of which this audit performed at source level**.
