// ==========================================================
// GATE-FLOOR-INTERACTION — verify the preserved raw block-I archive (evidence preservation; computes no outcome)
// ==========================================================
//   node verify_archive_blockI.mjs --archive <blockI_raw_*.tar.gz>     extract to a temp directory and verify everything
//   node verify_archive_blockI.mjs --dir <extracted blockI directory>   verify an already extracted / original directory
// Checks, against the COMMITTED records only (results/archive_blockI.json, results/manifest_blockI.json):
//   archive sha256 and size; MANIFEST.json equals the committed manifest byte for byte; the manifest digest recomputes and is
//   bound to the frozen design; every session record matches the sha256 the manifest holds and the on-disk file set equals the
//   manifest's; plan.json and controls.json match the manifest's hashes; every delivered REAL store matches the episode hash the
//   controls recorded and is the training export's episode array.  Exit 0 iff everything holds.
// ==========================================================
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as C from './config.mjs';
import { componentHashes } from '../xfer1/brain.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const flag = (n) => { const i = argv.indexOf(n); return i === -1 ? null : argv[i + 1]; };
const REC = JSON.parse(fs.readFileSync(path.join(HERE, 'results', 'archive_blockI.json'), 'utf8'));
const COMMITTED_MANIFEST = fs.readFileSync(path.join(HERE, 'results', 'manifest_blockI.json'));
const problems = [];
const need = (cond, msg) => { if (!cond) problems.push(msg); };

let dir = flag('--dir') ? path.resolve(flag('--dir')) : null;
let tmp = null;
if (flag('--archive')) {
  const arc = path.resolve(flag('--archive'));
  const bytes = fs.readFileSync(arc);
  need(C.sha256(bytes) === REC.archive.sha256, `archive sha256 ${C.sha256(bytes).slice(0, 16)} != recorded ${REC.archive.sha256.slice(0, 16)}`);
  need(bytes.length === REC.archive.bytes, `archive size ${bytes.length} != recorded ${REC.archive.bytes}`);
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gfi-archive-'));
  const r = spawnSync('tar', ['-xzf', path.basename(arc), '-C', path.relative(path.dirname(arc), tmp) || '.'], { cwd: path.dirname(arc), encoding: 'utf8' });
  if (r.status !== 0) { console.error('tar failed: ' + (r.stderr || '').slice(0, 300)); process.exit(2); }
  dir = path.join(tmp, REC.archive.root);
}
if (!dir) { console.error('--archive or --dir is required'); process.exit(2); }

const M = JSON.parse(fs.readFileSync(path.join(dir, 'MANIFEST.json'), 'utf8'));
const { digest, ...rest } = M;
need(fs.readFileSync(path.join(dir, 'MANIFEST.json')).equals(COMMITTED_MANIFEST), 'MANIFEST.json differs from results/manifest_blockI.json');
need(C.hashObject(rest) === digest && digest === REC.manifestDigest, 'manifest digest does not recompute or differs from the record');
need(M.designDigest === C.designDigest() && M.decisionDigest === C.decisionDigest(), 'the manifest is not bound to the frozen design');
const onDisk = fs.readdirSync(path.join(dir, 'sessions')).sort();
const inMan = Object.keys(M.sessions).sort();
need(JSON.stringify(onDisk) === JSON.stringify(inMan) && inMan.length === REC.counts.sessions, `session file set differs (${onDisk.length} on disk, ${inMan.length} in the manifest, ${REC.counts.sessions} recorded)`);
let badSessions = 0;
for (const f of inMan) if (!fs.existsSync(path.join(dir, 'sessions', f)) || C.sha256(fs.readFileSync(path.join(dir, 'sessions', f))) !== M.sessions[f]) badSessions++;
need(badSessions === 0, `${badSessions} session record(s) do not match the manifest hash`);
const plan = JSON.parse(fs.readFileSync(path.join(dir, 'plan.json'), 'utf8'));
const ctl = JSON.parse(fs.readFileSync(path.join(dir, 'controls.json'), 'utf8'));
need(C.hashObject(plan) === M.planSha256 && C.hashObject(ctl.controls) === M.controlsSha256, 'plan.json / controls.json do not match the manifest');
need(C.sha256(fs.readFileSync(path.join(dir, 'plan.json'))) === REC.files['plan.json'] && C.sha256(fs.readFileSync(path.join(dir, 'controls.json'))) === REC.files['controls.json'], 'plan.json / controls.json bytes differ from the record');
let badStores = 0, stores = 0;
for (const w of plan.validWorlds) {
  const c = ctl.controls[w];
  const read = (n) => JSON.parse(fs.readFileSync(path.join(dir, 'brains', n), 'utf8'));
  const train = read(`w${w}.json`), own = read(`own-real_w${w}.json`);
  stores++;
  if (componentHashes({ episodes: own.episodes }).episodes !== c.realStoreHash) badStores++;
  if (componentHashes({ episodes: train.episodes }).episodes !== c.realStoreHash) badStores++;
}
need(badStores === 0 && stores === REC.counts.worlds, `${badStores} delivered store(s) do not match the recorded episode hash`);
need(fs.readdirSync(path.join(dir, 'brains')).length === REC.counts.brains, 'brains file count differs from the record');

if (tmp) fs.rmSync(tmp, { recursive: true, force: true });
if (problems.length) { console.error('ARCHIVE VERIFICATION FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log(`archive verified: ${inMan.length} session records match the manifest; ${stores} delivered REAL stores match the controls; manifest digest ${digest.slice(0, 16)}…; plan/controls intact`);
