// ==========================================================
// ACQ-1 — the confirmatory allocation and its collision proof (zero sessions)
// ==========================================================
//   node experiments/coga/acq1/allocation.mjs --stream <stream json> --n <worlds, multiple of 4> --out <file.json>
// Takes accepted-stream indices from CONFIRMATORY_START upward, equal per goal, each world required to have >= 1 SWITCH state
// (a world that fails is logged and skipped; the next index of that goal takes its place).  Every check below is on configuration
// seeds and on the stream chain, not on index arithmetic alone.
// ==========================================================
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateAccepted } from '../../m7/env.js';
import { config as typedConfig, configSeed as typedConfigSeed, trajectory as typedTrajectory, trajectorySeed as typedTrajectorySeed } from '../../registry/typed_v2.js';
import { DEV_INDICES, SIM_STREAM_START, STUDY_STREAM_START, HELDOUT_FLOOR, REGISTRY_CONSUMED } from '../config.mjs';
import { streamSeed, agentStream, envSlip, envStart } from '../rngid.mjs';
import { GRAPH } from '../worlds.mjs';
import { describeAcq } from './states.mjs';
import { MFW_VARIANTS } from './config.mjs';

export const CONFIRMATORY_START = 3240;      // after CREDIT-1's reservation 2032-3239
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, '../../..');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };

export function allocate(rows, n, start = CONFIRMATORY_START) {
  const quota = n / 4; if (!Number.isInteger(quota)) throw new Error('n must be a multiple of 4');
  const taken = { 8: 0, 12: 0, 16: 0, 19: 0 }, out = [], skippedNoSwitch = [];
  for (const r of rows) {
    if (r.index < start || taken[r.goal] >= quota) continue;
    const g = generateAccepted(r.configSeed, r.index);
    if (g.provenance.acceptedSeed !== r.configSeed || g.provenance.numberOfRejectedCandidatesBeforeAcceptance !== 0 || g.cfg.goal !== r.goal) throw new Error(`stream row ${r.index} does not regenerate`);
    const w = describeAcq({ cfg: g.cfg, acceptedSeed: r.configSeed, configIndex: r.index, stream: 'study' });
    if (!w.sw.length) { skippedNoSwitch.push(r.index); continue; }
    out.push({ index: r.index, configSeed: r.configSeed, goal: r.goal, switchStates: w.sw.length }); taken[r.goal]++;
    if (out.length === n) break;
  }
  if (out.length !== n) throw new Error(`only ${out.length} of ${n} worlds could be allocated`);
  return { allocation: out, skippedNoSwitch };
}

export function collisionProblems(allocation, rows) {
  const p = [];
  const blockFile = JSON.parse(fs.readFileSync(path.join(ROOT, 'experiments', 'learn0', 'blockL_worlds.json'), 'utf8'));
  const learn0Max = Math.max(...blockFile.worlds.map(w => w.acceptedSeed));
  const creditEnd = rows.find(r => r.index === CONFIRMATORY_START - 1);
  if (!creditEnd) p.push('the stream does not reach the end of the CREDIT-1 reservation');
  for (const a of allocation) {
    if (a.index < CONFIRMATORY_START) p.push(`world ${a.index} lies below the confirmatory start`);
    if (a.configSeed <= learn0Max) p.push(`seed ${a.configSeed} is not above LEARN-0's last seed`);
    if (creditEnd && a.configSeed <= creditEnd.configSeed) p.push(`seed ${a.configSeed} is inside the CREDIT-1 reservation`);
    if (a.configSeed < STUDY_STREAM_START || (a.configSeed >= SIM_STREAM_START && a.configSeed < STUDY_STREAM_START)) p.push(`seed ${a.configSeed} is in the simulation stream`);
    if (a.configSeed >= REGISTRY_CONSUMED.lo || a.configSeed >= HELDOUT_FLOOR) p.push(`seed ${a.configSeed} reaches registry territory`);
    if (typedConfig.isConsumed(typedConfigSeed(a.configSeed)) || typedConfig.isHeldOut(typedConfigSeed(a.configSeed))) p.push(`seed ${a.configSeed} is consumed or held out in the registry`);
    if (a.index >= DEV_INDICES.lo && a.index <= DEV_INDICES.hi) p.push(`world ${a.index} is a development world`);
  }
  if (new Set(allocation.map(a => a.configSeed)).size !== allocation.length) p.push('duplicate configuration seeds');
  // session streams: unique within each world, and absent from the trajectory registry
  for (const a of allocation) {
    const id = `acq1:study:${a.index}`;
    const agents = [...MFW_VARIANTS.map(v => `MFW-${v}`), 'RW', 'QB1', 'DYNA'];
    const ids = [...agents.flatMap(x => ['E1', 'E2'].map(e => agentStream(id, x, e))), envStart(id), ...GRAPH.edges.map(e => envSlip(id, e.i))];
    const seeds = ids.map(streamSeed);
    if (new Set(seeds).size !== seeds.length) p.push(`stream seed collision inside world ${a.index}`);
    for (const s of seeds) { const t = typedTrajectorySeed(s); if (typedTrajectory.isHeldOut(t) || typedTrajectory.consumptionOf(t).length) p.push(`stream seed ${s} of world ${a.index} is recorded in the trajectory registry`); }
  }
  return p;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const stream = JSON.parse(fs.readFileSync(arg('--stream'), 'utf8')), n = Number(arg('--n'));
  const { allocation, skippedNoSwitch } = allocate(stream.rows, n);
  const problems = collisionProblems(allocation, stream.rows);
  const out = { schema: 'coga/acq1.allocation', n, confirmatoryStart: CONFIRMATORY_START, streamSha256: stream.sha256, continuedFrom: stream.continuedFrom, skippedNoSwitch, seedRange: [Math.min(...allocation.map(a => a.configSeed)), Math.max(...allocation.map(a => a.configSeed))], indexRange: [allocation[0].index, allocation[allocation.length - 1].index], perGoal: allocation.reduce((a, r) => { a[r.goal] = (a[r.goal] || 0) + 1; return a; }, {}), collisionProblems: problems, allocation };
  out.sha256 = crypto.createHash('sha256').update(JSON.stringify(allocation)).digest('hex');
  fs.writeFileSync(arg('--out'), JSON.stringify(out, null, 1));
  console.log(JSON.stringify({ n, indexRange: out.indexRange, seedRange: out.seedRange, perGoal: out.perGoal, skippedNoSwitch, collisionProblems: problems.length, sha256: out.sha256 }));
  process.exit(problems.length ? 1 : 0);
}
