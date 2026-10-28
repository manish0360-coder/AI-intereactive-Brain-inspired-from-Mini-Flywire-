// ==========================================================
// COG-A — events and outcomes from an environment log (agent-agnostic; pure)
// ==========================================================
// Log rows: [step, from, to, kind, success]  (envsim.mjs KIND: 0 refused, 1 edge, 2 self).
// Event of state s: the FIRST row with from === s and step >= T_SHIFT (any kind).  V = 1 if it exists, t = its step.
//   DISTAL state: Y = 1 iff kind is an edge and the target is in A2*(s).
//   STABLE state: Lv = 1 iff the attempt leaves A1*(s) (a refused or self attempt also leaves it).
// SEALED: for a SWAP session of a sealed agent only V and t are returned (no target, Y or Lv) — the blinding rule (DESIGN.md §10).
// P2 competence (pre-shift, identical in both conditions): share of edge attempts in steps [1000, T_SHIFT) from decision states
// whose target is in A1*(s).
// ==========================================================
import { T_SHIFT } from './config.mjs';
import { KIND } from './envsim.mjs';

export function firstAfterShift(log) {
  const first = new Map();
  for (const r of log) { if (r[0] < T_SHIFT) continue; if (!first.has(r[1])) first.set(r[1], r); }
  return first;
}

export function extractEvents(world, log, { condition, sealed = false }) {
  const first = firstAfterShift(log);
  const hide = sealed && condition === 'SWAP';
  const ev = (s, f) => { const r = first.get(s); if (!r) return { s, V: 0 }; const base = { s, V: 1, t: r[0] }; return hide ? { ...base, sealed: true } : { ...base, target: r[2], kind: r[3], ...f(r) }; };
  return {
    distal: world.distal.map(d => ev(d.s, (r) => ({ Y: r[3] === KIND.EDGE && d.A2star.includes(r[2]) ? 1 : 0 }))),
    stable: world.stable.map(d => ev(d.s, (r) => ({ Lv: r[3] === KIND.EDGE && d.A1star.includes(r[2]) ? 0 : 1 }))),
  };
}

export function competence(world, log, from = 1000) {
  let n = 0, hit = 0;
  for (const r of log) { if (r[0] < from || r[0] >= T_SHIFT || r[3] !== KIND.EDGE) continue; const a1 = world.pi1[r[1]]; if (!a1) continue; n++; if (a1.includes(r[2])) hit++; }
  return { n, hit, share: n ? hit / n : null };
}

/** pair one world's SWAP and NO-SWAP events for one agent */
export function pairWorld(world, evS, evN) {
  const pair = (a, b) => a.map((x, i) => { const y = b[i]; if (x.s !== y.s) throw new Error('event order mismatch'); return { s: x.s, VS: x.V, VN: y.V, tS: x.t ?? null, tN: y.t ?? null, YS: x.Y ?? null, YN: y.Y ?? null, LS: x.Lv ?? null, LN: y.Lv ?? null, sealedS: !!x.sealed }; });
  return { world: world.id, goal: world.goal, distal: pair(evS.distal, evN.distal), stable: pair(evS.stable, evN.stable) };
}
