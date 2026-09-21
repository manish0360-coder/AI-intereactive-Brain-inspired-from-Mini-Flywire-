// Study-2 readiness driver: exactly TWO runs of the permitted development replay fixture 896066:0 —
// capture apparatus ON and OFF. No scientific seed, no Study-2 run, no oracle, no tau-b, no Delta.
// The run list is a literal constant; nothing about which runs execute depends on any output.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, 'readiness_evidence');
const RUNS = Object.freeze(['1', '0']);                          // capture on, capture off
fs.mkdirSync(OUT, { recursive: true });

const out = {};
for (const capture of RUNS) {
  const r = spawnSync(process.execPath, [path.join(HERE, 'child.mjs')], {
    cwd: HERE, env: { ...process.env, CAPTURE: capture, OUT }, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024,
  });
  if (r.status !== 0) { console.error(`FAIL capture=${capture}\n${(r.stderr || '').slice(-2000)}`); process.exit(1); }
  out[capture] = JSON.parse(r.stdout.slice(r.stdout.indexOf('@@S2@@') + 6));
  console.log(`capture=${capture} events=${out[capture].events} attempts=${out[capture].fingerprint.attempts} cogDraws=${out[capture].fingerprint.cogDraws}`);
}
const keys = Object.keys(out['1'].fingerprint);
const diff = keys.filter((k) => JSON.stringify(out['1'].fingerprint[k]) !== JSON.stringify(out['0'].fingerprint[k]));
console.log(`G-IMPL-2 capture-on vs capture-off: ${diff.length ? 'DIFFERS on ' + diff.join(', ') : 'IDENTICAL on all ' + keys.length + ' fingerprint fields'}`);
fs.writeFileSync(path.join(OUT, 'NONINTERFERENCE.json'), JSON.stringify({ fields: keys, differing: diff, on: out['1'].fingerprint, off: out['0'].fingerprint }, null, 2));
const names = fs.readdirSync(OUT).filter((f) => f.endsWith('.json')).sort();
fs.writeFileSync(path.join(OUT, 'INTEGRITY.sha256'),
  names.map((f) => `${crypto.createHash('sha256').update(fs.readFileSync(path.join(OUT, f))).digest('hex')}  ${f}`).join('\n') + '\n');
if (diff.length) process.exit(2);
