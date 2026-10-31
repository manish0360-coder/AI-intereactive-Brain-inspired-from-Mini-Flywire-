// ==========================================================
// ACQ-1 — provenance-backed configuration allocation (zero sessions)
// ==========================================================
//   node experiments/coga/acq1/territory.mjs --to <last index> --out <file.json>
// The accepted-configuration stream is defined by env.generateAcceptedStream: strictly ascending seeds from 200,000, one accepted
// world per index, the next index resuming at acceptedSeed + 1, goal = GOALS[index % 4] (so acceptance depends on the index).
// LEARN-0's frozen block file (experiments/learn0/blockL_worlds.json) records that chain through index 2031, each row with its
// startingSeed and acceptedSeed.  This script:
//   1. re-verifies a sample of those rows with the real generator (same seed, same index, same acceptance);
//   2. continues the chain from index 2032 at (last accepted seed + 1), so CREDIT-1's reserved indices 2032-3239 are generated,
//      and never reused, and everything after them is the same stream the earlier studies walked;
//   3. writes the accepted seed of every index, with their sha256.
// Overlap is decided on configuration seeds, not on index arithmetic: see allocation.mjs.
// ==========================================================
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { generateAccepted } from '../../m7/env.js';

const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, '../../..');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };

export function loadLearn0Block() { return JSON.parse(fs.readFileSync(path.join(ROOT, 'experiments', 'learn0', 'blockL_worlds.json'), 'utf8')); }

export function verifySample(block, every = 60) {
  let checked = 0, bad = 0;
  for (let i = 0; i < block.worlds.length; i += every) {
    const r = block.worlds[i], g = generateAccepted(r.startingSeed, r.world);
    checked++; if (g.provenance.acceptedSeed !== r.acceptedSeed || g.cfg.goal !== r.goal) bad++;
  }
  return { checked, bad };
}

/** continue the chain: returns rows for indices fromIndex..toIndex */
export function continueChain(startSeed, fromIndex, toIndex, onRow = null) {
  const rows = []; let seed = startSeed;
  for (let i = fromIndex; i <= toIndex; i++) {
    const g = generateAccepted(seed, i);
    const row = { index: i, startingSeed: seed, configSeed: g.provenance.acceptedSeed, goal: g.cfg.goal, rejected: g.provenance.numberOfRejectedCandidatesBeforeAcceptance };
    rows.push(row); if (onRow) onRow(row);
    seed = row.configSeed + 1;
  }
  return rows;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const to = Number(arg('--to')), outFile = arg('--out'), t0 = Date.now();
  const block = loadLearn0Block();
  const last = block.worlds[block.worlds.length - 1];
  const sample = verifySample(block);
  if (sample.bad) { console.error(`LEARN-0 chain sample failed: ${JSON.stringify(sample)}`); process.exit(1); }
  const rows = continueChain(last.acceptedSeed + 1, last.world + 1, to, (r) => { if (r.index % 200 === 0) console.log(`index ${r.index} seed ${r.configSeed} (${((Date.now() - t0) / 1000).toFixed(0)} s)`); });
  const out = { schema: 'coga/acq1.stream', stream: 'accepted configurations from seed 200000 (env.generateAcceptedStream chain)', continuedFrom: { index: last.world, acceptedSeed: last.acceptedSeed, source: 'experiments/learn0/blockL_worlds.json', blockDigest: block.digest }, learn0Sample: sample, rows };
  out.sha256 = crypto.createHash('sha256').update(JSON.stringify(rows)).digest('hex');
  fs.writeFileSync(outFile, JSON.stringify(out));
  console.log(JSON.stringify({ rows: rows.length, first: rows[0], last: rows[rows.length - 1], sample, sha256: out.sha256, seconds: (Date.now() - t0) / 1000 }));
}
