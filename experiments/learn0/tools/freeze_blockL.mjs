// LEARN-0 freeze tool (runs NO session, plans nothing, reads no outcome): generates block L — accepted-configuration stream indices
// 1672..2031 — by the orchestrator's OWN code path (extendStream from the same cached prefix, orchestrate.mjs lines 45-53) and checks every
// configuration for collisions with held-out or consumed territory.  Writes blockL_worlds.json (the frozen configuration list).
//   node tools/freeze_blockL.mjs            -> exit 1 on ANY collision or integrity failure (nothing is adjusted: no range, seed or rule changes)
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { extendStream } from '../../gate-floor1/stream.mjs';
import { generateAccepted } from '../../m7/env.js';
import { configSeed as typedConfigSeed, config as typedConfig } from '../../registry/typed_v2.js';
import { DEV_BLOCK, BLOCK } from '../../mcf1/config.mjs';
import * as C from '../config.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url)), L0 = path.resolve(HERE, '..'), ROOT = path.resolve(L0, '..', '..');
const envSha = C.sha256(fs.readFileSync(path.join(ROOT, 'experiments', 'm7', 'env.js')));
const prefixDirs = ['gate-floor-spec', 'gate-floor-interaction', 'gate-floor-prodsem'].map(d => path.join(ROOT, 'experiments', d, 'data'));
let stream = null, used = null;
for (const d of prefixDirs) { try { stream = extendStream(C.CONFIG_START, C.WORLDS_TOTAL, d, envSha); used = path.relative(ROOT, d).split(path.sep).join('/'); break; } catch (e) { if (d === prefixDirs[prefixDirs.length - 1]) throw e; } }
const problems = [], P = (m) => problems.push(m);
if (stream.length !== C.WORLDS_TOTAL) P(`stream has ${stream.length} elements, expected ${C.WORLDS_TOTAL}`);
if (stream[0].startingSeed !== C.CONFIG_START) P('the stream does not start at CONFIG_START');
stream.forEach((e, i) => { if (e.acceptedConfigIndex !== i) P(`element ${i} carries index ${e.acceptedConfigIndex}`); if (i > 0 && e.startingSeed !== stream[i - 1].acceptedSeed + 1) P(`recurrence broken at ${i}`); });
const block = stream.slice(C.WORLD_START, C.WORLDS_TOTAL);
const collisions = [];
for (const e of block) {
  const w = e.acceptedConfigIndex, s = e.acceptedSeed;
  if (!(s >= C.CONFIG_START && s < C.HELDOUT_FLOOR)) collisions.push(`world ${w}: seed ${s} outside [CONFIG_START, HELDOUT_FLOOR)`);
  if (typedConfig.isHeldOut(typedConfigSeed(s))) collisions.push(`world ${w}: seed ${s} is HELD-OUT in the typed registry`);
  if (typedConfig.isConsumed(typedConfigSeed(s))) collisions.push(`world ${w}: seed ${s} is CONSUMED in the typed registry`);
  if ((s >= DEV_BLOCK.start && s < DEV_BLOCK.start + DEV_BLOCK.count) || (s >= BLOCK.start && s < BLOCK.start + BLOCK.scanLength)) collisions.push(`world ${w}: seed ${s} lies in an MCF-1 block`);
  const g = generateAccepted(s, w);   // exactly the session driver's acceptance check (session.mjs: acceptedSeed === configSeed and 0 rejections)
  if (g.provenance.acceptedSeed !== s || g.provenance.numberOfRejectedCandidatesBeforeAcceptance !== 0 || g.cfg.goal !== e.goal) P(`world ${w}: the accepted seed does not regenerate its configuration`);
  if (e.goal !== C.GOALS[w % C.GOALS.length]) P(`world ${w}: goal ${e.goal} is not GOALS[index % 4]`);
}
const perGoal = Object.fromEntries(C.GOALS.map(g => [g, block.filter(e => e.goal === g).length]));
if (C.GOALS.some(g => perGoal[g] !== C.PER_GOAL)) P(`goal groups are not balanced: ${JSON.stringify(perGoal)}`);
const prefixMax = Math.max(...stream.slice(0, C.WORLD_START).map(e => e.acceptedSeed)), blockMin = Math.min(...block.map(e => e.acceptedSeed));
if (!(blockMin > prefixMax)) P(`block L seeds overlap the earlier stream (min ${blockMin} <= earlier max ${prefixMax})`);
const worlds = block.map(e => ({ world: e.acceptedConfigIndex, startingSeed: e.startingSeed, acceptedSeed: e.acceptedSeed, rejectedBeforeAcceptance: e.numberOfRejectedCandidatesBeforeAcceptance, goal: e.goal }));
const body = { schema: `${C.SCHEMA}.blockL`, study: C.STUDY, block: 'L', indices: [C.WORLD_START, C.WORLDS_TOTAL - 1], n: worlds.length, configStart: C.CONFIG_START, heldOutFloor: C.HELDOUT_FLOOR,
  envSha12: envSha.slice(0, 12), prefixSource: used, prefixLastAcceptedSeed: stream[C.WORLD_START - 1].acceptedSeed, seedRange: [blockMin, Math.max(...block.map(e => e.acceptedSeed))], perGoal,
  checks: { collisions: collisions.length, integrityProblems: problems.length, registry: 'typed_v2 isHeldOut / isConsumed (the session driver\'s own check)', earlierStreamMaxSeed: prefixMax }, worlds };
const out = { ...body, digest: C.hashObject(body) };
console.log(`block L: ${worlds.length} worlds, seeds ${blockMin}..${body.seedRange[1]} (earlier stream max ${prefixMax}; held-out floor ${C.HELDOUT_FLOOR}); per goal ${JSON.stringify(perGoal)}; prefix from ${used}`);
console.log(`collisions ${collisions.length}; integrity problems ${problems.length}`);
if (collisions.length || problems.length) { console.log([...collisions, ...problems].slice(0, 30).join('\n')); console.log('STOP: block L is NOT written; nothing was adjusted.'); process.exit(1); }
fs.writeFileSync(path.join(L0, 'blockL_worlds.json'), JSON.stringify(out, null, 1) + '\n');
console.log(`wrote blockL_worlds.json (digest ${out.digest})`);
