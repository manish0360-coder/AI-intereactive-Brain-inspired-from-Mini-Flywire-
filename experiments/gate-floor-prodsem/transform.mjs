// ==========================================================
// GATE-FLOOR-PRODSEM — the derived tree: IDENTICAL to GATE-FLOOR-HEAD's (same commit, same two guarded lines, same pins)
// ==========================================================
// No runtime edit is proposed or made: the floor line, the goal-reset probe and the tree construction are the audited
// GATE-FLOOR-HEAD ones.  This module only re-exports them (and places the materialised trees under its own temp directory) so that
// the identity of what ran is a single source of truth.  Pins: config.mjs TREE.
// ==========================================================
import os from 'node:os';
import path from 'node:path';
import * as T from '../gate-floor-head/transform.mjs';

export const { transformMain, FLOOR_LINE, PROBE_LINE, FLOOR_ANCHOR, PROBE_ANCHOR, runtimePaths, transformDigest } = T;

export function buildHeadTree(opts = {}) {
  return T.buildHeadTree({ outRoot: path.join(os.tmpdir(), 'mfw-gatefloorprodsem'), ...opts });
}
