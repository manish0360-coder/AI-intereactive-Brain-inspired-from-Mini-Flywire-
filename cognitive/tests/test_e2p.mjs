// CF-01b tests — task E2′ (layouts, arms, controls, determinism, oracle bounds; dev domain only)
import assert from 'node:assert/strict';
import { generateWorld, distancesTo, edgeKey } from '../testbed/worlds.mjs';
import { layoutE2P, runE2P, E2P_PARAMS, E2P_ARMS } from '../testbed/task_e2p.mjs';
import { checkDeterminism } from '../testbed/checks.mjs';

const DEV = Array.from({ length: 8 }, (_, i) => `cf|dev|world|${i}`);

export const tests = [
  ['E2P layouts: d >= 3, the block raises d, the sham is on no shortest path and leaves d unchanged', () => {
    for (const l of DEV) {
      const w = generateWorld(l); const L = layoutE2P(w, l);
      assert.ok(L, `no layout for ${l}`);
      const d = distancesTo(w, L.goal)[L.start];
      assert.ok(d >= 3); assert.equal(d, L.distance);
      assert.equal(distancesTo(w, L.goal, new Set([edgeKey(...L.blocked)]))[L.start], L.detourDistance);
      assert.ok(L.detourDistance > d);
      assert.equal(distancesTo(w, L.goal, new Set([edgeKey(...L.sham)]))[L.start], d);
      assert.notEqual(edgeKey(...L.sham), edgeKey(...L.blocked));
      assert.ok(L.detourEdges.length >= L.detourDistance && !L.detourEdges.includes(edgeKey(...L.blocked)));
    }
  }],
  ['ORACLE bounds per arm: PRE/NOPRE = 3 x detour distance; SHAM/NOBLOCK = 3 x distance', () => {
    for (const l of DEV.slice(0, 4)) {
      const w = generateWorld(l);
      for (const arm of E2P_ARMS) {
        const r = runE2P({ world: w, worldLabel: l, kind: 'ORACLE', arm });
        const per = arm === 'PRE' || arm === 'NOPRE' ? r.layout.detourDistance : r.layout.distance;
        assert.equal(r.metric, E2P_PARAMS.testEpisodes * per, `${l} ${arm}`);
      }
    }
  }],
  ['runE2P is deterministic for every agent and arm', () => {
    const l = DEV[0], w = generateWorld(l);
    for (const kind of ['RANDOM', 'QL', 'DYNAQ', 'ORACLE']) for (const arm of E2P_ARMS) {
      assert.deepEqual(checkDeterminism(runE2P({ world: w, worldLabel: l, kind, arm }), runE2P({ world: w, worldLabel: l, kind, arm })), []);
    }
  }],
  ['coverage is reported only for arms with pre-exposure and lies in [0, 1]; blocked attempts only for blocking arms', () => {
    const l = DEV[1], w = generateWorld(l);
    for (const arm of E2P_ARMS) {
      const r = runE2P({ world: w, worldLabel: l, kind: 'DYNAQ', arm });
      if (arm === 'NOPRE') assert.equal(r.secondary.coverage, undefined); else assert.ok(r.secondary.coverage >= 0 && r.secondary.coverage <= 1);
      if (arm === 'PRE' || arm === 'NOPRE') assert.ok(r.secondary.blockedAttempts >= 0); else assert.equal(r.secondary.blockedAttempts, undefined);
      assert.equal(r.testSteps.length, E2P_PARAMS.testEpisodes);
    }
  }],
  ['an injected agent factory is used, and receives the shared agent seed label', () => {
    const l = DEV[2], w = generateWorld(l); const seen = [];
    const fake = (kind, env, label) => { seen.push([kind, label]); return { act: (o) => 0 % o.nActions, observe() {} }; };
    runE2P({ world: w, worldLabel: l, kind: 'X', arm: 'NOBLOCK', makeAgent: fake });
    assert.deepEqual(seen, [['X', `${l}|E2P|agent`]]);
  }],
  ['the unknown arm is rejected', () => {
    const l = DEV[0]; assert.throws(() => runE2P({ world: generateWorld(l), worldLabel: l, kind: 'QL', arm: 'BOGUS' }));
  }],
];
