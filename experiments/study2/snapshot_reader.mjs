// Study-2 S-SHADOW evidence reader, bound to ONE immutable decision-time snapshot.
//
// This module replaces ONLY the `recordFor` binding of render/planning.js inside the two shadow
// instances (?mode=FULL, ?mode=GEO). It never reads render/traversalRecord.js, so a shadow evaluation
// cannot see any evidence written after the snapshot was taken.
//
//   FULL — returns the snapshotted { a, s } for the edge (unobserved edges: { a: 0, s: 0 }).
//          Throws if no snapshot is bound: FULL can never silently fall back to live evidence.
//   GEO  — returns { a: 0, s: 0 } for every edge, so c_hat = (0+1)/(0+1) = 1 everywhere.
const MODE = new URL(import.meta.url).searchParams.get('mode');
if (MODE !== 'FULL' && MODE !== 'GEO') throw new Error(`S2 reader: unknown mode ${MODE}`);

export function recordFor(from, to) {
  if (MODE === 'GEO') return { a: 0, s: 0 };
  const snap = globalThis.__S2_SNAPSHOT__;
  if (!snap) throw new Error('S2 reader: FULL evaluated with no snapshot bound');
  const e = snap.get(`${Number(from)}->${Number(to)}`);
  return e ? { a: e.a, s: e.s } : { a: 0, s: 0 };
}
