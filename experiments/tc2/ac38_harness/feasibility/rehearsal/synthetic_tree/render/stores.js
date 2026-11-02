// Synthetic, test-owned module for the AC38 harness rehearsal. Not application code.
// Stores shaped like the bridge-path inventory, and a bridge target that makes one write of each
// class the pinned pipeline makes: Map set, array push, private let, stored field, neuron field, draw.
import { liveRng } from "../instrumentation/rng.js";

export const Q = new Map();
export const episodicStore = [];
const _bonusCache = new Map();
const stableMemory = new Set();
let _episodesStoredTotal = 0;
const semanticEdges = new Map();
export const neuronMap = new Map();

export function seedStores() {
    for (let i = 1; i <= 6; i++) neuronMap.set(i, { userData: { label: "n" + i, embedding: [i, i + 1, i + 2] } });
    Q.set("1#0->2", 0.5);
    Q.set("2#0->3", 0.25);
    episodicStore.push({ id: "e1", nodes: [1, 2, 3] });
    episodicStore.push({ id: "e2", nodes: [2, 3, 4] });
    _bonusCache.set("1->2", 1);
    stableMemory.add("2->3");
    semanticEdges.set("1->2", { count: 3, strength: 1 });
}

export function learnFromEpisode(ep) {
    Q.set(ep.nodes[0] + "#0->" + ep.nodes[1], 1);
    episodicStore.push({ id: "s" + liveRng().toString(36).slice(2, 6), nodes: [...ep.nodes] });
    _episodesStoredTotal++;
    const e = semanticEdges.get("1->2");
    e.count++;
    const n = neuronMap.get(ep.nodes[0]);
    n.userData.embedding = n.userData.embedding.map((x) => x + 1);
}

export function reinforcePath(a, b) {
    const key = a + "->" + b;
    const e = semanticEdges.get(key) || { count: 0, strength: 0 };
    e.count++;
    semanticEdges.set(key, e);
    stableMemory.add(key);
}

export function step() {
    return liveRng();
}
