// FS-OQ1-F2-FEAS driver: exactly the four authorized development fixtures (hook on), plus ONE
// documented repeat of 896066:0 with the hook OFF. The repeat verifies deterministic replay AND
// that the observation hook did not change the mechanism (same actions, same RNG consumption,
// same Q, same environment counters, same final traversal record).
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, 'evidence');
const RUNS = [
  ['896066', '0', '1'], ['896066', '1', '1'], ['896238', '2', '1'], ['896329', '3', '1'],
  ['896066', '0', '0'],                                   // the single documented repeat, hook OFF
];
fs.mkdirSync(OUT, { recursive: true });

const results = [];
for (const [seed, index, hook] of RUNS) {
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [path.join(HERE, 'child.mjs')], {
    cwd: HERE, env: { ...process.env, SEED: seed, INDEX: index, HOOK: hook, OUT },
    encoding: 'utf8', maxBuffer: 256 * 1024 * 1024,
  });
  if (r.status !== 0) { console.error(`FAIL ${seed}:${index} hook=${hook}\n${(r.stderr || '').slice(-1500)}`); process.exit(1); }
  const res = JSON.parse(r.stdout.slice(r.stdout.indexOf('@@FEAS@@') + 8));
  results.push(res);
  console.log(`${res.fixture} hook=${hook} goal ${res.goal} snapshots ${res.snapshots} attempts ${res.fingerprint.attempts} slips ${res.fingerprint.slips} cogDraws ${res.fingerprint.cogDraws} (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
}

const on = results.find((x) => x.fixture === '896066:0' && x.hook);
const off = results.find((x) => x.fixture === '896066:0' && !x.hook);
const keys = Object.keys(on.fingerprint);
const diff = keys.filter((k) => JSON.stringify(on.fingerprint[k]) !== JSON.stringify(off.fingerprint[k]));
console.log(`\nREPLAY + NON-INTERFERENCE (896066:0 hook-on vs hook-off): ${diff.length === 0 ? 'IDENTICAL on all ' + keys.length + ' fingerprint fields' : 'DIFFERS on ' + diff.join(', ')}`);
fs.writeFileSync(path.join(OUT, 'REPLAY.json'), JSON.stringify({ fixture: '896066:0', fields: keys, differing: diff, on: on.fingerprint, off: off.fingerprint }, null, 2));

const names = fs.readdirSync(OUT).filter((f) => f.endsWith('.json')).sort();
fs.writeFileSync(path.join(OUT, 'INTEGRITY.sha256'),
  names.map((f) => `${crypto.createHash('sha256').update(fs.readFileSync(path.join(OUT, f))).digest('hex')}  ${f}`).join('\n') + '\n');
console.log(`wrote ${names.length} evidence files + INTEGRITY.sha256`);
if (diff.length) process.exit(2);
