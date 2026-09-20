// FS-BD-01 Study 1 driver: 4 arms x 6 panel seeds = 24 deterministic runs, plus 2 spot-check reruns.
// A-OLD executes in a READ-ONLY clone at 782df6e (never by reverting the active tree).
// No seed is created: the panel is exactly the six pre-declared S3' seeds.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const OUT = path.join(HERE, 'evidence');
const OLD_ROOT = process.env.OLD_ROOT;              // clone at 782df6e
if (!OLD_ROOT || !fs.existsSync(OLD_ROOT)) throw new Error('OLD_ROOT (clone at 782df6e) required');

const PANEL = [20260818, 31337, 31338, 777, 4242, 90210];   // verify_S3prime.js:62 — unchanged
const TICKS = 80;                                            // verify_S3prime.js:63 — unchanged
const ARMS = [
  { arm: 'A-OLD', cwd: OLD_ROOT, hook: null, label: '782df6e' },
  { arm: 'A-V23', cwd: ROOT, hook: null, label: '952c9fc' },
  { arm: 'A-GEO', cwd: ROOT, hook: path.join(HERE, 'hook_geo.mjs'), label: '952c9fc+geo' },
  { arm: 'A-FS0', cwd: ROOT, hook: path.join(HERE, 'hook_fs0.mjs'), label: '952c9fc+fs0' },
];

fs.mkdirSync(OUT, { recursive: true });

function one({ arm, cwd, hook, label }, seed, outDir) {
  const child = path.join(cwd, 'experiments/fsbehav/child.mjs');
  const r = spawnSync(process.execPath, [child], {
    cwd: path.join(cwd, 'experiments/fsbehav'),
    env: { ...process.env, ARM: arm, SEED: String(seed), TICKS: String(TICKS), BOOST: '0',
           OUT: outDir, ROOT_LABEL: label, HOOK: hook || '' },
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
  });
  if (r.status !== 0) { console.error(`FAIL ${arm} ${seed}\n${(r.stderr || '').slice(-1200)}`); process.exit(1); }
  const at = r.stdout.indexOf('@@RESULT@@');
  if (at < 0) { console.error(`FAIL ${arm} ${seed}: no result`); process.exit(1); }
  return JSON.parse(r.stdout.slice(at + 10));
}

const rows = [];
for (const a of ARMS) {
  for (const seed of PANEL) {
    const r = one(a, seed, OUT);
    rows.push(r);
    console.log(`${a.arm.padEnd(6)} seed ${String(seed).padEnd(9)} stale ${String(r.stale).padStart(3)}/${String(r.steps).padStart(3)} = ${(r.staleRate * 100).toFixed(2)}%  d/t ${r.decisionsPerTick.toFixed(2)}  s/t ${r.stepsPerTick.toFixed(2)}  resets ${r.goalResets}  fb.med ${r.futureBonus.median}`);
  }
}

// ---- reproducibility spot-check: two runs re-executed, output hashes compared ----
const spot = [];
for (const [armName, seed] of [['A-V23', 20260818], ['A-OLD', 90210]]) {
  const a = ARMS.find((x) => x.arm === armName);
  const tmp = path.join(OUT, '_spot');
  const again = one(a, seed, tmp);
  const first = rows.find((x) => x.arm === armName && x.seed === seed);
  spot.push({ arm: armName, seed, identical: again.outputHash === first.outputHash });
  console.log(`spot-check ${armName} ${seed}: ${again.outputHash === first.outputHash ? 'IDENTICAL' : 'DIFFERS'}`);
}
fs.rmSync(path.join(OUT, '_spot'), { recursive: true, force: true });

fs.writeFileSync(path.join(OUT, 'RUNS.json'), JSON.stringify({ panel: PANEL, ticks: TICKS, arms: ARMS.map((a) => ({ arm: a.arm, label: a.label, hook: a.hook ? path.basename(a.hook) : null })), spot, rows }, null, 2));

const names = fs.readdirSync(OUT).filter((f) => f.endsWith('.json')).sort();
fs.writeFileSync(path.join(OUT, 'INTEGRITY.sha256'),
  names.map((f) => `${crypto.createHash('sha256').update(fs.readFileSync(path.join(OUT, f))).digest('hex')}  ${f}`).join('\n') + '\n');
console.log(`\nwrote ${names.length} evidence files + INTEGRITY.sha256`);
