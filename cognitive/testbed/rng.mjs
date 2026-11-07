// ==========================================================
// CF-01 testbed — seeded random streams (pure; Node built-ins only)
// ==========================================================
// Every random draw in the testbed comes from a stream named by a string label, so that a run is fully determined by
// its labels.  seedOf(label) = first 4 bytes of SHA-256(label) as an unsigned integer; the generator is mulberry32,
// the same algorithm as instrumentation/rng.js (re-implemented so the testbed imports nothing from production code).
// ==========================================================
import crypto from 'node:crypto';

export function seedOf(label) {
  return crypto.createHash('sha256').update(String(label)).digest().readUInt32BE(0);
}

export function makeStream(label) {
  let a = seedOf(label) || 1;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const randInt = (n, rnd) => Math.floor(rnd() * n);

/** A shuffled copy (Fisher–Yates). */
export function shuffled(items, rnd) {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) { const j = randInt(i + 1, rnd); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
