// Study-2 driver manifest (D20): SHA-256 over LF-normalised content of every file that executes or analyses
// Study 2. The Director's registration pins sha256(canonical manifest); drive_study2.mjs refuses to request a
// single seed unless the files on disk reproduce that pin.
//   node experiments/study2/manifest.mjs            -> print the manifest
//   node experiments/study2/manifest.mjs --write    -> write DRIVER_MANIFEST.json
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');

// execution apparatus, in dependency order
export const DRIVER_FILES = Object.freeze([
  'experiments/study2/governance.mjs', 'experiments/study2/drive_study2.mjs', 'experiments/study2/run_child.mjs',
  'experiments/study2/capture.mjs', 'experiments/study2/hook_capture.mjs', 'experiments/study2/snapshot_reader.mjs',
  'experiments/study2/manifest.mjs',
]);
// post-run analysis (the analysis script hash, §R / Z9)
export const ANALYSIS_FILES = Object.freeze(['experiments/study2/analyze_study2.mjs', 'experiments/study2/taub.mjs']);

export const shaLF = (text) => crypto.createHash('sha256').update(String(text).replace(/\r\n/g, '\n')).digest('hex');
const fileSha = (rel) => shaLF(fs.readFileSync(path.join(ROOT, rel), 'utf8'));

export function computeManifest() {
  const files = {};
  for (const f of [...DRIVER_FILES, ...ANALYSIS_FILES]) files[f] = fileSha(f);
  const analysisSha256 = shaLF(ANALYSIS_FILES.map((f) => `${files[f]}  ${f}`).join('\n'));
  return { schema: 'study2-driver-manifest/1', files, analysisSha256 };
}
// canonical serialisation: fixed key order, LF, trailing newline
export const canonical = (m) => JSON.stringify(m, null, 2) + '\n';
export const manifestSha256 = (m) => shaLF(canonical(m));

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const m = computeManifest();
  if (process.argv.includes('--write')) fs.writeFileSync(path.join(HERE, 'DRIVER_MANIFEST.json'), canonical(m));
  process.stdout.write(canonical(m) + `manifestSha256 ${manifestSha256(m)}\n`);
}
