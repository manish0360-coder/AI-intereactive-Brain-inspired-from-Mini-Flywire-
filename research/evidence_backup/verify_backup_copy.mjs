// ==========================================================
// evidence_backup — verify a COPY of a raw archive against the committed identity record (computes no experimental outcome)
// ==========================================================
//   node research/evidence_backup/verify_backup_copy.mjs <path-to-copy> [<path-to-copy> ...]
// For each given file: find the manifest entry with the same file name, compare size and sha256 with the committed record, and
// print the per-block verifier command that then checks the archive CONTENT against its experiment manifest.  Exit 0 iff every
// given file matches; exit 1 on any mismatch or unknown file name; exit 2 on usage errors.  Reads only; writes nothing.
// ==========================================================
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const M = JSON.parse(fs.readFileSync(path.join(HERE, 'backup_manifest.json'), 'utf8'));
const files = process.argv.slice(2);
if (!files.length) { console.error('usage: node verify_backup_copy.mjs <archive> [<archive> ...]'); process.exit(2); }
let bad = 0;
for (const f of files) {
  const name = path.basename(f);
  const entry = M.archives.find(a => a.name === name);
  if (!entry) { console.log(`UNKNOWN  ${name}: not in backup_manifest.json`); bad++; continue; }
  if (!fs.existsSync(f)) { console.log(`MISSING  ${name}: ${f}`); bad++; continue; }
  const bytes = fs.readFileSync(f);
  const sha = crypto.createHash('sha256').update(bytes).digest('hex');
  const ok = bytes.length === entry.bytes && sha === entry.sha256;
  console.log(`${ok ? 'MATCH   ' : 'MISMATCH'} ${name}: ${bytes.length} bytes, sha256 ${sha.slice(0, 16)}… ${ok ? '' : `(expected ${entry.bytes} bytes, ${entry.sha256.slice(0, 16)}…)`}`);
  if (ok) console.log(`         content check: ${entry.verifier.replace('<path>', f)}`);
  else bad++;
}
process.exit(bad === 0 ? 0 : 1);
