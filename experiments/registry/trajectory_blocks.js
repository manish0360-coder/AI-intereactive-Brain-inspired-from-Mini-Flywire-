// ==========================================================
// TRAJECTORY BLOCK RECORDS (data module for typed_v2.js)
// ==========================================================
// A block record registers a whole admitted seed list as ONE record bound to the exact list
// (see typed_v2.js: BLOCK_SCHEMA). This module is DATA ONLY and is APPEND-ONLY:
//
//   * a block is never edited; a changed list is a NEW block with a new listSha256;
//   * the only field a later commit may flip is `executed`, which no decision reads;
//   * blocks are NOT TRAJECTORY_RECORDS entries: the MCF-1 harness builds its reservation
//     inventory from TRAJECTORY_RECORDS, so a study's own seeds must not appear there.
//
// STATE: EMPTY. No study has a block. Nothing is registered, reserved or consumed by this file.
// A block is added only by a separately authorised commit that carries the admitted list's
// SHA-256, the configuration identity and the authorization text, and that commit must keep
// verify_blocks.js green.
// ==========================================================
export const TRAJECTORY_BLOCKS = Object.freeze([]);
