// CF-01 tests — paired bootstrap
import assert from 'node:assert/strict';
import { pairedBootstrap } from '../testbed/stats.mjs';

export const tests = [
  ['a constant difference gives a degenerate interval at that value', () => {
    const r = pairedBootstrap(new Array(20).fill(7), 'cf|test|stats|a');
    assert.equal(r.mean, 7); assert.equal(r.lo, 7); assert.equal(r.hi, 7);
  }],
  ['the interval brackets the mean and is reproducible per label', () => {
    const d = Array.from({ length: 20 }, (_, i) => i - 5);
    const a = pairedBootstrap(d, 'cf|test|stats|b'), b = pairedBootstrap(d, 'cf|test|stats|b');
    assert.deepEqual(a, b); assert.ok(a.lo < a.mean && a.mean < a.hi);
  }],
  ['an interval on a sample centred on 0 includes 0', () => {
    const d = Array.from({ length: 20 }, (_, i) => (i % 2 ? 3 : -3));
    const r = pairedBootstrap(d, 'cf|test|stats|c'); assert.ok(r.lo <= 0 && r.hi >= 0);
  }],
];
