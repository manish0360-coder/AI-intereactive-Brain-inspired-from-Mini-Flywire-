// CF-01 tests — worlds
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateWorld, mfwWorld, distancesTo, edgeKey, isConnected } from '../testbed/worlds.mjs';
import { checkPermutation } from '../testbed/checks.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DEV = Array.from({ length: 10 }, (_, i) => `cf|dev|world|${i}`);

export const tests = [
  ['generated worlds: 24 nodes, 30 edges, degree <= 4, simple, connected', () => {
    for (const l of DEV) {
      const w = generateWorld(l);
      assert.equal(w.n, 24); assert.equal(w.edges.length, 30);
      assert.ok(w.adj.every((nb) => nb.length <= 4 && nb.length >= 1));
      assert.equal(new Set(w.edges.map(([u, v]) => edgeKey(u, v))).size, 30);
      assert.ok(w.edges.every(([u, v]) => u !== v));
      assert.ok(isConnected(w));
    }
  }],
  ['generation is deterministic per label and differs across labels', () => {
    assert.equal(JSON.stringify(generateWorld(DEV[0])), JSON.stringify(generateWorld(DEV[0])));
    assert.notEqual(JSON.stringify(generateWorld(DEV[0]).edges), JSON.stringify(generateWorld(DEV[1]).edges));
  }],
  ['exit orders are permutations of the neighbour lists; labels are a permutation of 1..n', () => {
    for (const l of DEV) {
      const w = generateWorld(l);
      w.exitOrder.forEach((ex, i) => assert.deepEqual([...ex].sort((a, b) => a - b), w.adj[i]));
      assert.deepEqual([...w.labelOf].sort((a, b) => a - b), Array.from({ length: w.n }, (_, i) => i + 1));
    }
  }],
  ['checkPermutation passes on generated worlds and on the MiniFlyWire graph', () => {
    for (const l of DEV) assert.deepEqual(checkPermutation(generateWorld(l)), []);
    assert.deepEqual(checkPermutation(mfwWorld(path.join(ROOT, 'connections.json'))), []);
  }],
  ['the MiniFlyWire reference world has 20 nodes and 39 edges', () => {
    const w = mfwWorld(path.join(ROOT, 'connections.json'));
    assert.equal(w.n, 20); assert.equal(w.edges.length, 39); assert.ok(isConnected(w));
  }],
  ['distancesTo respects blocked edges', () => {
    const w = generateWorld(DEV[2]);
    const [u, v] = w.edges[0];
    assert.equal(distancesTo(w, u)[v], 1);
    assert.ok(distancesTo(w, u, new Set([edgeKey(u, v)]))[v] !== 1);
  }],
];
