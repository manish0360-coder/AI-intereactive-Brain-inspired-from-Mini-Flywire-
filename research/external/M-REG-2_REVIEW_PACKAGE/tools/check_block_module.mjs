// M-REG-2 review package: independent check of a block data module, with no repository code involved.
// It evaluates the module, rebuilds the member list from the hull and the exclusions, hashes it the way the registry does
// (SHA-256 of the decimal members joined by ",") and compares every claim.  Exit 0 only if all hold.
// usage: node check_block_module.mjs <module.js> [<admitted.json>]
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';

const [MODULE, ADMITTED] = process.argv.slice(2);
const PINNED = { lo: 1500000000, hi: 1500003999, count: 3851, excluded: 149, listSha256: 'bef9096b87d46aee382f1920baba5a1fa086bdb98d9b1469d503ccbc7bc7a2a6', study: 'MCF-1', configuration: { seed: 100000, index: 1, acceptedSeed: 100026 } };
const mod = await import(pathToFileURL(path.resolve(MODULE)).href);
const blocks = mod.TRAJECTORY_BLOCKS;
const b = blocks[0];
const skip = new Set(b.excluded), members = [];
for (let v = b.lo; v <= b.hi; v++) if (!skip.has(v)) members.push(v);
const sha = crypto.createHash('sha256').update(members.join(',')).digest('hex');
const asc = (a) => a.every((v, i) => i === 0 || v > a[i - 1]);
const keys = Object.keys(b).sort().join(',');
const checks = {
  oneBlock: blocks.length === 1,
  exactFields: keys === 'artifact,authorization,configuration,count,excluded,executed,hi,listSha256,lo,namespace,schema,status,study,why',
  identity: b.study === PINNED.study && b.status === 'registered' && b.executed === false && b.schema === 'trajectory.block/1' && b.namespace === 'trajectory',
  hull: b.lo === PINNED.lo && b.hi === PINNED.hi,
  excludedAscendingInterior: asc(b.excluded) && b.excluded.every(v => v > b.lo && v < b.hi) && b.excluded.length === PINNED.excluded,
  countEqualsRebuilt: b.count === members.length && members.length === PINNED.count,
  listHashEqualsRebuilt: sha === b.listSha256 && sha === PINNED.listSha256,
  configuration: JSON.stringify(b.configuration) === JSON.stringify(PINNED.configuration),
  textFieldsNonEmpty: ['authorization', 'artifact', 'why'].every(k => typeof b[k] === 'string' && b[k].trim() !== ''),
};
if (ADMITTED) {
  const a = JSON.parse(fs.readFileSync(ADMITTED, 'utf8')).admitted;
  checks.membersEqualAdmittedList = a.length === members.length && a.every((v, i) => v === members[i]);
}
const ok = Object.values(checks).every(Boolean);
console.log(JSON.stringify({ ok, checks, members: members.length, listSha256: sha }, null, 1));
process.exit(ok ? 0 : 1);
