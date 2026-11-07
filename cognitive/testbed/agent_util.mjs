// ==========================================================
// CF-01 testbed — the only module an agent may import (pure helpers; no environment access)
// ==========================================================

/** Index of the maximum; ties broken uniformly with one draw from rnd, and only when there is a tie. */
export function argmaxRandomTie(values, rnd) {
  let best = -Infinity; const idx = [];
  for (let i = 0; i < values.length; i++) {
    if (values[i] > best) { best = values[i]; idx.length = 0; idx.push(i); } else if (values[i] === best) idx.push(i);
  }
  return idx.length === 1 ? idx[0] : idx[Math.floor(rnd() * idx.length)];
}

/** A tabular value store keyed by (state label, cue label or null); rows are created at 0 with the given width. */
export function makeTable() {
  const rows = new Map();
  return {
    row(node, goal, width) {
      const k = `${node}|${goal}`;
      let r = rows.get(k);
      if (!r) { r = new Array(width).fill(0); rows.set(k, r); }
      return r;
    },
    size: () => rows.size,
    snapshot: () => Object.fromEntries([...rows].map(([k, v]) => [k, [...v]])),
  };
}
