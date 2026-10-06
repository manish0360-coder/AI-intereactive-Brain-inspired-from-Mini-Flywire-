// ==========================================================
// H1-R — pre-Stage-1 build identity (v1.0 §1.2; Milestone B item 2; D-030)
// ==========================================================
// v1.0 §1.2 (FROZEN): the SHA-256 values of the instrument after the measurement-layer milestone, and that of
// analyze.js, are recorded before the first Stage-1 run; instruments and analysis code are identical in Stage 1
// and Stage 2; any change after Stage-1 data exist is a reported protocol deviation.
//
// The record (experiments/h1r/BUILD_IDENTITY.json) is derived from git blobs only, so it is deterministic and
// byte-stable: SHA-256 and git blob id over committed (normalised) content, repository-relative paths, fixed key
// order, no clock, no host path. Its binding commit is the commit that last writes it; that commit's parent is
// `baseCommit`. A file cannot name the commit that contains it, so the parent is named and the gate checks the
// relation (verify_readiness.mjs I2; at Milestone B, verify_milestone_b.mjs B3).
//
// ONE current record, two derivation profiles (D-030):
//   'current'      the record in the repository now: schema /2, baseCommit 1919b04 (D-029), `supersedes` names the
//                  Milestone-B record, and the verifier group also lists verify_o23.mjs and verify_readiness.mjs.
//                  --write, --check and checkAt() use it.
//   'milestone-b'  the default of derive(): reproduces, byte for byte, the record that Milestone B added at 6fc5a9e
//                  (schema /1, baseCommit BASE_COMMIT). It exists so the closed Milestone-B gate (verify_milestone_b.mjs,
//                  bound to 6fc5a9e) can still call derive(), and so verify_readiness.mjs can prove the history is intact.
// The instrumentIdentity is the same in both. D-029 changed one listed verifier (verify_orchestrator.mjs), which is
// why the Milestone-B record stopped equalling a derivation from HEAD; D-030 re-derived and re-bound the record.
//
//   node experiments/h1r/build_identity.mjs            print the current record derived from the index (staged content)
//   node experiments/h1r/build_identity.mjs --write    write it to experiments/h1r/BUILD_IDENTITY.json
//   node experiments/h1r/build_identity.mjs --check    exit 0 iff the record committed at HEAD equals a derivation from HEAD
// ==========================================================
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const REPO = path.resolve(HERE, '..', '..');
export const RECORD = 'experiments/h1r/BUILD_IDENTITY.json';
export const BASE_COMMIT = 'bf0833f466ad7c626c9a719efa3a91d6b6367b16';      // Milestone A: analyze.js dae6012c… and orchestrate.mjs 6162f8c2… committed; the Milestone-B record's baseCommit
export const BINDING_PARENT = '1919b04d6fd4fcae4a5a2728e9926219e782c59e';   // D-029; the parent of the commit that writes the current record, and its baseCommit
export const SUPERSEDES = Object.freeze({ commit: '6fc5a9eb7a3e27696b78b439765fa6fd81d73836', sha256: '9647827a253addfda448da4a75068b478e88c2c1c793ce6fede01e4c43ddae1e' });   // the Milestone-B record
const B2_COMMIT = '707cb1e5205a7e9979f81092ee1ebfa0fe28922e';
const INSTRUMENT_COMMIT = 'e8e904a2f213e45dc0fb326f36cf72809f5862cf';
const H = 'experiments/h1r/';

// orchestrate.mjs INSTRUMENT_FILES, in its key order (the identity stamped into every plan, manifest and run record)
const INSTRUMENT_KEYS = [['transformSha256', 'conformance_transform.mjs'], ['runtimeSha256', 'runtime.mjs'], ['measureSha256', 'measure.mjs'],
  ['measureInstallSha256', 'measure_install.mjs'], ['shadowSha256', 'shadow.mjs'], ['envSeedSha256', 'env_seed.mjs'], ['driverSha256', 'run_h1r.mjs']];
export const GROUPS = Object.freeze({     // the Milestone-B groups (unchanged)
  protocol: ['research/preregistrations/H1R_PREREGISTRATION_v1.0.md', 'research/preregistrations/H1R_PREREGISTRATION_v1.0.sha256',
    'research/preregistrations/H1R_ERRATUM_R3_ENVIRONMENT_SEED.md', 'research/preregistrations/h1r_d021b/GEMINI_PACKAGE.md'],
  analysis: [`${H}analyze.js`],
  orchestrator: [`${H}orchestrate.mjs`],
  instrument: [...INSTRUMENT_KEYS.map(([, f]) => H + f), `${H}build_tree.mjs`],
  registry: ['experiments/registry/typed.js', 'experiments/registry/consumed_after_h1r.js', 'experiments/registry/consumed_after_study2.js',
    'experiments/registry/consumed_after_c1.js', 'experiments/registry/consumed.js', 'experiments/uqb/protocol.js', 'experiments/uqa/protocol.js',
    'experiments/q1/protocol.js', 'experiments/q1/instrument.js', 'experiments/m8/protocol.js', 'experiments/m8/instrument.js'],
  verifiers: [`${H}verify_conformance.mjs`, `${H}verify_ms1_unit.mjs`, `${H}run_existing_gates.mjs`, `${H}verify_existing_equivalence.mjs`, `${H}verify_hook.mjs`,
    `${H}run_one.mjs`, `${H}verify_analysis.mjs`, `${H}verify_orchestrator.mjs`, `${H}verify_cli.mjs`, `${H}cli_gate/build_tree.double.mjs`,
    `${H}cli_gate/run_h1r.double.mjs`, `${H}cli_gate/env.double.js`, `${H}verify_milestone_b.mjs`, `${H}build_identity.mjs`, `${H}fresh_clone_check.mjs`, `${H}verify_d028.mjs`,
    'research/preregistrations/h1r_v1_checks/verify_freeze.mjs'],
});
export const GROUPS_CURRENT = Object.freeze({ ...GROUPS, verifiers: [...GROUPS.verifiers, `${H}verify_o23.mjs`, `${H}verify_readiness.mjs`] });
export const PROFILES = Object.freeze({
  'milestone-b': Object.freeze({ schema: 'h1r.build-identity/1', baseCommit: BASE_COMMIT, supersedes: null, groups: GROUPS,
    statement: 'Pre-Stage-1 build identity (H1-R v1.0 §1.2). SHA-256 and git blob id over committed blob content. The binding commit is the commit that adds this record; its parent is baseCommit. instrumentIdentity is the object orchestrate.mjs stamps into every plan, manifest and run record; a Stage-1 or Stage-2 artifact whose instrument identity differs from it is a protocol deviation.' }),
  current: Object.freeze({ schema: 'h1r.build-identity/2', baseCommit: BINDING_PARENT, supersedes: SUPERSEDES, groups: GROUPS_CURRENT,
    statement: 'Pre-Stage-1 build identity (H1-R v1.0 §1.2). SHA-256 and git blob id over committed blob content. The binding commit is the commit that last writes this record; its parent is baseCommit. It supersedes the Milestone-B record named in supersedes (D-030) and has the same instrumentIdentity. instrumentIdentity is the object orchestrate.mjs stamps into every plan, manifest and run record; a Stage-1 or Stage-2 artifact whose instrument identity differs from it is a protocol deviation.' }),
});
// the files whose WORKING-TREE bytes are hashed at run time (instrumentIdentity); they must be -text
export const RUNTIME_HASHED = Object.freeze([`${H}analyze.js`, `${H}orchestrate.mjs`, ...INSTRUMENT_KEYS.map(([, f]) => H + f)]);

const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');
const git = (args, opts = {}) => execFileSync('git', ['-C', REPO, ...args], { maxBuffer: 1 << 30, ...opts });
const blobAt = (rev, p) => git(['cat-file', 'blob', `${rev}:${p}`]);
const blobId = (rev, p) => git(['rev-parse', `${rev}:${p}`], { encoding: 'utf8' }).trim();
// the `text` attribute as the index's .gitattributes sets it (git 2.39 has no check-attr --source)
const textAttr = (p) => { const out = git(['check-attr', '--cached', 'text', '--', p], { encoding: 'utf8' }).trim(); return out.slice(out.lastIndexOf(': ') + 2); };

/** A record, from the blobs at `rev` ('' = the index). `profile` selects which record: see the header. */
export function derive(rev = '', profile = 'milestone-b') {
  const P = PROFILES[profile];
  if (!P) throw new Error(`derive: unknown profile ${profile}`);
  if (rev !== '' && blobId(rev, '.gitattributes') !== blobId('', '.gitattributes')) throw new Error(`derive(${rev}): the index's .gitattributes differs from ${rev}'s`);
  const entry = (p) => ({ path: p, sha256: sha256(blobAt(rev, p)), gitBlob: blobId(rev, p), text: textAttr(p), runtimeHashed: RUNTIME_HASHED.includes(p) });
  const files = Object.fromEntries(Object.entries(P.groups).map(([g, list]) => [g, list.map(entry)]));
  const shaOf = (p) => Object.values(files).flat().find(e => e.path === p).sha256;
  const instrumentIdentity = { b2Commit: B2_COMMIT, trustMode: 'traversal' };
  for (const [k, f] of INSTRUMENT_KEYS) instrumentIdentity[k] = shaOf(H + f);
  instrumentIdentity.analyzeSha256 = shaOf(`${H}analyze.js`);
  instrumentIdentity.orchestratorSha256 = shaOf(`${H}orchestrate.mjs`);
  return {
    schema: P.schema,
    study: 'H1-R',
    statement: P.statement,
    baseCommit: P.baseCommit,
    ...(P.supersedes ? { supersedes: { ...P.supersedes } } : {}),
    b2Commit: B2_COMMIT,
    instrumentCommit: INSTRUMENT_COMMIT,
    preregistrationSha256: shaOf('research/preregistrations/H1R_PREREGISTRATION_v1.0.md'),
    instrumentIdentity,
    files,
  };
}
export const serializeRecord = (r) => JSON.stringify(r, null, 1) + '\n';
/** The record committed at `rev` ('' = the index) against a fresh derivation of the current profile from the same blobs; --check runs it at HEAD. */
export function checkAt(rev) { const committed = blobAt(rev, RECORD).toString('utf8'), fresh = serializeRecord(derive(rev, 'current')); return { committed, fresh, same: committed === fresh }; }

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  const mode = process.argv[2];
  if (mode === '--write') { const t = serializeRecord(derive('', 'current')); fs.writeFileSync(path.join(REPO, RECORD), t); console.log(`${sha256(t)}  ${RECORD}`); }
  else if (mode === '--check') {
    const { committed, same } = checkAt('HEAD');
    console.log(`${RECORD} at HEAD ${same ? 'equals' : 'DIFFERS FROM'} a derivation from HEAD (${sha256(committed).slice(0, 16)})`);
    process.exitCode = same ? 0 : 1;
  } else if (mode === undefined) process.stdout.write(serializeRecord(derive('', 'current')));
  else { console.error('usage: node experiments/h1r/build_identity.mjs [--write | --check]'); process.exit(2); }
}
