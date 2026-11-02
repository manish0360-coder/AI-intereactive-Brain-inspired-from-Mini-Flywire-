// Synthetic, test-owned module for the AC38 harness rehearsal. Not application code.
// A context episode, a vault and a seal function laid out like the pinned seal: an empty path, a
// populated path with closed-list fields, a vault copy, an optional bridge, then a fresh episode.
import { liveRng } from "../instrumentation/rng.js";

const workingMemory = new Map();
let _bridge = null;
const episodeVault = [];

function generateEpisodeId() {
    return "ep" + liveRng().toString(36).slice(2, 6);
}

function freshEpisode() {
    return { id: generateEpisodeId(), nodes: [], labels: [], startTime: 0, contextTag: null, reward: 0, sealed: false };
}

let currentEpisode = freshEpisode();

export function setEpisodeManagerBridge(fn) {
    _bridge = fn;
}

export function sealCurrentEpisode(reason = "manual") {

    if (currentEpisode.nodes.length < 2) {
        currentEpisode = freshEpisode();
        return null;
    }

    currentEpisode.sealed = true;
    currentEpisode.endTime = 0;
    currentEpisode.duration = 0;
    currentEpisode.sealReason = reason;
    currentEpisode.contextTag = currentEpisode.labels[0];

    const sealed = { ...currentEpisode };

    episodeVault.push(sealed);

    if (_bridge) {
        _bridge(sealed);
    }

    // start fresh episode
    currentEpisode = freshEpisode();

    return sealed;
}
