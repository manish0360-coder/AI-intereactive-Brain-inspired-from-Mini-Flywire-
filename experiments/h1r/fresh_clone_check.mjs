// ==========================================================
// H1-R — fresh-clone byte check under core.autocrlf=true (Milestone B item 3)
// ==========================================================
// Clones this repository into the system temporary directory with core.autocrlf=true and checks out:
//   - HEAD: every tracked file whose `text` attribute is unset (-text) must hash, in the clone's working tree, to
//     the SHA-256 of its committed blob; every -text entry of the build-identity record must equal the record; and
//     `node orchestrate.mjs identity` run IN THE CLONE must print the record's instrumentIdentity.
//   - the base commit (before Milestone B's .gitattributes rules): for the files hashed at run time, whether the
//     checkout converted them (the demonstration that the rules are needed).
// Writes experiments/h1r/$H1R_EVIDENCE/fresh_clone.json (default evidence_milestone_b): repository-relative paths,
// hashes and counts only. The clones are removed afterwards.
//
//   node experiments/h1r/fresh_clone_check.mjs
// ==========================================================
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BASE_COMMIT, RECORD, RUNTIME_HASHED } from './build_identity.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..');
const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');
const ENV = Object.fromEntries(Object.entries(process.env).filter(([k]) => k.toUpperCase() !== 'H1R_STAGE_AUTHORISED'));
const git = (dir, args, opts = {}) => execFileSync('git', ['-C', dir, ...args], { maxBuffer: 1 << 30, env: ENV, ...opts });
const ROOT = path.join(fs.realpathSync.native(os.tmpdir()), 'mfw-h1r-fresh-clone');
fs.rmSync(ROOT, { recursive: true, force: true });
fs.mkdirSync(ROOT, { recursive: true });

function cloneAt(name, rev) {
  const dir = path.join(ROOT, name);
  execFileSync('git', ['clone', '-q', '--no-checkout', '-c', 'core.autocrlf=true', REPO, dir], { env: ENV, stdio: ['ignore', 'pipe', 'pipe'] });
  git(dir, ['checkout', '-q', '--detach', rev], { stdio: ['ignore', 'pipe', 'pipe'] });
  return dir;
}
const unsetText = (dir) => {
  const files = git(dir, ['ls-files', '-z']).toString('utf8').split('\0').filter(Boolean);
  const out = git(dir, ['check-attr', '--stdin', '-z', 'text'], { input: files.join('\0') + '\0' }).toString('utf8').split('\0');
  const res = [];
  for (let i = 0; i + 2 < out.length; i += 3) if (out[i + 2] === 'unset') res.push(out[i]);
  return res.sort();
};

const head = git(REPO, ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const H = cloneAt('head', head);
const autocrlf = git(H, ['config', '--get', 'core.autocrlf'], { encoding: 'utf8' }).trim();
const protectedFiles = unsetText(H).map(p => {
  const blob = sha256(git(H, ['cat-file', 'blob', `HEAD:${p}`])), wt = sha256(fs.readFileSync(path.join(H, ...p.split('/'))));
  return { path: p, sha256: blob, workingTreeEqual: wt === blob };
});
const record = JSON.parse(fs.readFileSync(path.join(H, ...RECORD.split('/')), 'utf8'));
const recordEntries = Object.values(record.files).flat();
const recordChecks = recordEntries.filter(e => e.text === 'unset').map(e => ({ path: e.path, equal: sha256(fs.readFileSync(path.join(H, ...e.path.split('/')))) === e.sha256 }));
const cloneIdentity = JSON.parse(execFileSync(process.execPath, [path.join(H, 'experiments', 'h1r', 'orchestrate.mjs'), 'identity'], { cwd: H, env: ENV, encoding: 'utf8' }));
const runtimeAllProtected = RUNTIME_HASHED.every(p => protectedFiles.some(f => f.path === p));

const B = cloneAt('base', BASE_COMMIT);
const baseRuntime = RUNTIME_HASHED.map(p => {
  const blob = sha256(git(B, ['cat-file', 'blob', `HEAD:${p}`])), wt = sha256(fs.readFileSync(path.join(B, ...p.split('/'))));
  return { path: p, blobSha256: blob, checkoutSha256: wt, converted: wt !== blob };
});
fs.rmSync(ROOT, { recursive: true, force: true });

const ok = autocrlf === 'true' && protectedFiles.every(f => f.workingTreeEqual) && recordChecks.every(c => c.equal) && runtimeAllProtected
  && JSON.stringify(cloneIdentity) === JSON.stringify(record.instrumentIdentity);
const doc = {
  schema: 'h1r.fresh-clone/1', generatedBy: 'experiments/h1r/fresh_clone_check.mjs', autocrlf,
  tested: 'a fresh clone, checked out with core.autocrlf=true, of the commit that was HEAD when this ran (see the milestone commit message)',
  protectedCount: protectedFiles.length, protectedEqual: protectedFiles.filter(f => f.workingTreeEqual).length,
  runtimeHashedAllProtected: runtimeAllProtected,
  buildIdentity: { record: RECORD, protectedEntries: recordChecks.length, equal: recordChecks.filter(c => c.equal).length, cloneIdentityEqualsRecord: JSON.stringify(cloneIdentity) === JSON.stringify(record.instrumentIdentity) },
  baseDemonstration: { baseCommit: BASE_COMMIT, runtimeHashed: baseRuntime, converted: baseRuntime.filter(r => r.converted).map(r => r.path) },
  protectedFiles, pass: ok,
};
const EVID = path.join(HERE, process.env.H1R_EVIDENCE || 'evidence_milestone_b');
fs.mkdirSync(EVID, { recursive: true });
fs.writeFileSync(path.join(EVID, 'fresh_clone.json'), JSON.stringify(doc, null, 1) + '\n');
console.log(`fresh clone (core.autocrlf=${autocrlf}) of ${head.slice(0, 7)}: ${doc.protectedEqual}/${doc.protectedCount} -text files byte-equal to their committed blobs; build identity ${doc.buildIdentity.equal}/${doc.buildIdentity.protectedEntries}; clone identity equals record ${doc.buildIdentity.cloneIdentityEqualsRecord}`);
console.log(`base ${BASE_COMMIT.slice(0, 7)} under the same checkout: converted ${doc.baseDemonstration.converted.length}/${RUNTIME_HASHED.length} run-time-hashed files (${doc.baseDemonstration.converted.join(', ') || 'none'})`);
console.log(ok ? 'FRESH CLONE: PASS' : 'FRESH CLONE: FAIL');
process.exitCode = ok ? 0 : 1;
