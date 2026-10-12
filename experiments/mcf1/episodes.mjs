// ==========================================================
// MCF-1 — the registered memory contents
// ==========================================================
// Content C  : no brain at all (the store is empty).
// Content Mb : exactly ONE episode on the route via node b (10 -> b -> 12), delivered through the product's own
//              loadBrain() restore path as { episodes: [ ... ] } and nothing else, so Q, transitions, rewards,
//              penalties and trust stay empty.  The episode has the same shape the MCF-0 and fidelity work used
//              (goal-agnostic edge familiarity); `activeGoal` is carried as injected metadata and is discarded
//              by loadEpisodes().
// ==========================================================
import fs from 'node:fs';
import { FRAME, DESIGN, canonicalJson, sha256 } from './config.mjs';

const readJson = (rel) => JSON.parse(fs.readFileSync(new URL(rel, import.meta.url), 'utf8'));
const neurons = readJson('../../neurons.json'), connections = readJson('../../connections.json');
const LABEL = Object.fromEntries((Array.isArray(neurons) ? neurons : neurons.neurons).map(n => [Number(n.id), n.label]));
const EDGES = new Set();
for (const e of connections) { const a = Number(e.from), b = Number(e.to); EDGES.add(a + '|' + b); EDGES.add(b + '|' + a); }
/** undirected graph edge test (connections.json; the traversal graph is undirected) */
export const isGraphEdge = (a, b) => EDGES.has(Number(a) + '|' + Number(b));
export const NEIGHBOURS = (node) => [...new Set(connections.flatMap(e => (Number(e.from) === node ? [Number(e.to)] : Number(e.to) === node ? [Number(e.from)] : [])))].sort((x, y) => x - y);

function episode(nodes, id) {
  for (let i = 0; i < nodes.length - 1; i++) if (!isGraphEdge(nodes[i], nodes[i + 1])) throw new Error(`MCF-1 episode ${id}: ${nodes[i]}->${nodes[i + 1]} is not a graph edge`);
  return {
    id, source: 'autonomous_success', nodes: nodes.slice(), labels: nodes.map(n => LABEL[n]),
    transitions: nodes.slice(0, -1).map((from, i) => ({ from, to: nodes[i + 1] })),
    quality: 0.8, coherence: 0.8, unique: new Set(nodes).size, diversity: 0.8, timestamp: 1, consolidationEligible: true,
    activeGoal: FRAME.goal,
  };
}

export const CONTENT_NODES = Object.freeze({ M9: FRAME.routes[9], M11: FRAME.routes[11] });
/** null for COLD, else the exact brain object handed to loadBrain() */
export function brainFor(content) {
  if (!DESIGN.contents.includes(content)) throw new Error(`MCF-1: unknown content ${content}`);
  if (content === 'C') return null;
  return { episodes: [episode(CONTENT_NODES[content], `mcf1_${content}`)] };
}
export const brainHash = (brain) => (brain === null ? 'none' : sha256(canonicalJson(brain)));
export const REGISTERED_BRAIN_HASHES = Object.freeze(Object.fromEntries(DESIGN.contents.map(c => [c, brainHash(brainFor(c))])));

/** the candidate set the registered frame must show at the decision: exactly the graph neighbours of the start node */
export function frameCandidatesMatchGraph() {
  const nb = NEIGHBOURS(FRAME.startNode);
  return nb.length === FRAME.candidates.length && nb.every((k, i) => k === FRAME.candidates[i]);
}
