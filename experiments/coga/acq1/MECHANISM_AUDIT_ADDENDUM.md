# ACQ-1 mechanism audit — addendum

**Status of this file.** Non-frozen addendum to [`MECHANISM_AUDIT.md`](MECHANISM_AUDIT.md), written after ACQ-1 was ruled VOID under D-035. It narrows two readings in that audit. It does not edit the audit, validate its other statements, or change any frozen record.

**Code references.** "Root" means `main.js` at commit `6bc1166`. "Pinned" means the LEARN-0 tree `main.js` (sha256 `3d3266fd…`) used for MFW-P and MFW-H, which is built outside Git. The cited code is the same in both; the line numbers differ. MFW-A's tree was not inspected for this addendum.

## 1. Slips and `recentMemory`

**Original reading** (`MECHANISM_AUDIT.md:14`): "a slip leaves no trace".

That reading is too broad. Its citation, root `main.js:4997-4999`, describes the traversal block only.

**Observed in code**

| step | root | pinned |
|---|---|---|
| `current` is set to `next`, the intended target | 4484 | 4490 |
| If `current !== null && current !== prev`, `current` is pushed to `recentMemory` | 4495-4496 | 4501-4502 |
| The environment verdict `_m7Traversed` is taken | 5017-5020 | 5024-5027 |
| The traversal block runs only if the verdict succeeded | 5062 | 5069 |
| At goal entry, `recordAutonomousSuccess` receives `recentMemory` | 4590 | 4596 |

The first two steps sit inside the self-learning section (pinned 3967-4970). [`render/episodeManager.js:725-732`](../../../render/episodeManager.js) collapses consecutive duplicate nodes when an episode is sealed.

[`M7_LINEAGE_NOTE_01.md:28`](../../../research/cognitive-audit/M7_LINEAGE_NOTE_01.md) recorded the intended-node append before ACQ-1's freeze.

**Narrowed reading.** On a slip, the successful-traversal block does not run. The intended node enters `recentMemory` before the verdict only when the self-learning section ran on that tick and `current !== prev`.

**Not established**

- How often an unrealised node is still in the six-slot window when an episode is committed.
- Whether an unrealised node reaches a stored episode in any recorded session.
- Whether this affects choices, credit or any reliability signal.

## 2. H and the prediction-error pathway

**Original reading** (`MECHANISM_AUDIT.md:32`): "The prediction-error pathway is not necessary. H pins it off and reaches the same level."

That inference does not follow, because H changes more than the pin.

**Observed in configuration**

| setting | MFW-P ([`../config.mjs:32`](../config.mjs)) | MFW-H ([`session_mfw.mjs:40`](session_mfw.mjs)) |
|---|---|---|
| `arm` | `OFF` | `A1` |
| `creditMode` | `off` | `on` |
| `pin` | `off` | `on` |

- The pin takes effect only when `arm` is not `OFF` ([`experiments/m7/run.js:138`](../../m7/run.js), [`experiments/m7/arms.js:170`](../../m7/arms.js)). It fixes learning authority at 1.0 and blocks `dampQ` (`run.js:139-142`).
- `A1` passes trust values through unchanged (`arms.js:30`, `:139-140`, `:149-150`).
- `creditMode: 'on'` installs per-edge credit (`run.js:151-160`) and bypasses the legacy writers at root `main.js:4473` and `:4675` (pinned 4479 and 4681).

ACQ-1 has no arm that changes the pin alone.

**Narrowed reading.** The P–H comparison cannot isolate the prediction-error pathway, because `pin` and `creditMode` change together.

**Not established**

- Whether the prediction-error pathway is necessary or unnecessary. The comparison supports neither conclusion.

The original reading rested on development data, and it stays development data. ACQ-1's confirmatory results cannot be used for this question.

## What this file does not do

- Historical reports, frozen protocol files, lock files, hashes, raw data and Git history remain unchanged.
- It is not part of the frozen protocol and is not in the lock.
- It authorizes no new work. TC-2 and propagation work remain paused.
