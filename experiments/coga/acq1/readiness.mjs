// ==========================================================
// ACQ-1 — machine-checkable confirmatory readiness (M-COGA-8); runs no session
// ==========================================================
//   node experiments/coga/acq1/readiness.mjs [--out <file.json>]      exit 0 only if every gate passes
// checkReadiness() is also called by run_confirmatory.mjs: there is no path to a confirmatory session around it.
// ==========================================================
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { ACQ_AUTHORIZATION as LOCK } from './lock.mjs';
import { DELTA, STEPS, WINDOW, MFW_VARIANTS } from './config.mjs';
import { allocate, collisionProblems } from './allocation.mjs';
import { LEARN0_TREE } from '../../learn0/config.mjs';
import { CREDIT1_TREE } from '../../credit1/config.mjs';
import { buildCredit1Trees } from '../../credit1/transform.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, '../../..');
const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8' }).trim();
const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
export const PROTOCOL_FILES = Object.freeze(['DESIGN.md', 'DECISION_TABLE.md', 'POWER_ANALYSIS.md', 'config.mjs', 'analysis.mjs', 'metric.mjs', 'states.mjs', 'env.mjs', 'baselines.mjs', 'session_mfw.mjs', 'run_confirmatory.mjs', 'analyze.mjs', 'allocation.mjs', 'evidence/allocation.json', 'evidence/stream_2032_4039.json', 'evidence/power_sim.json', 'evidence/dev_gates.json']);
export const protocolHashes = () => Object.fromEntries(PROTOCOL_FILES.map(f => [f, sha(path.join(HERE, f))]));
const PROTECTED = ['main.js', 'render', 'instrumentation', 'experiments/m7', 'experiments/learn0', 'experiments/credit1', 'experiments/registry', 'experiments/xfer1', 'experiments/phase1_0', 'experiments/gate-floor-prodsem', 'experiments/gate-floor-interaction', 'experiments/gate-floor-head', 'benchmarks', 'connections.json', 'neurons.json', '.gitattributes'];

export function checkReadiness({ runTests = true } = {}) {
  const g = [];
  const gate = (name, ok, detail = '') => g.push({ name, ok: !!ok, detail: String(detail) });
  gate('G1 no tracked change in the working tree', git('status', '--porcelain', '--untracked-files=no') === '');
  gate('G2 protected runtime, LEARN-0, CREDIT-1, M7, registry and harness paths are identical to 4122186', git('diff', '--stat', '4122186', '--', ...PROTECTED) === '');
  gate('G3 the lock is set and complete', LOCK && LOCK.freezeCommit && LOCK.protocolSha256 && Array.isArray(LOCK.allocation) && LOCK.allocation.length > 0 && LOCK.authorizedBy);
  if (LOCK) {
    let anc = false; try { execFileSync('git', ['merge-base', '--is-ancestor', LOCK.freezeCommit, 'HEAD'], { cwd: ROOT }); anc = true; } catch { /* not an ancestor */ }
    gate('G4 the freeze commit is an ancestor of HEAD', anc, LOCK.freezeCommit);
    const changed = anc ? git('diff', '--name-only', LOCK.freezeCommit, 'HEAD').split('\n').filter(Boolean) : ['?'];
    gate('G5 only the lock changed since the freeze commit', changed.every(f => f === 'experiments/coga/acq1/lock.mjs'), changed.join(', '));
    const hashes = protocolHashes(), bad = Object.keys(hashes).filter(k => hashes[k] !== LOCK.protocolSha256[k]);
    gate('G6 every protocol file matches its frozen hash', bad.length === 0 && Object.keys(LOCK.protocolSha256).length === PROTOCOL_FILES.length, bad.join(', '));
    gate('G7 lock parameters equal the study constants', LOCK.delta === DELTA && LOCK.steps === STEPS && JSON.stringify(LOCK.window) === JSON.stringify(WINDOW) && JSON.stringify(LOCK.variants) === JSON.stringify(MFW_VARIANTS));
    const stream = JSON.parse(fs.readFileSync(path.join(HERE, 'evidence', 'stream_2032_4039.json'), 'utf8'));
    const alloc = JSON.parse(fs.readFileSync(path.join(HERE, 'evidence', 'allocation.json'), 'utf8'));
    gate('G8 the stream file is intact and continues LEARN-0\'s chain', crypto.createHash('sha256').update(JSON.stringify(stream.rows)).digest('hex') === stream.sha256 && stream.rows[0].index === 2032 && stream.learn0Sample.bad === 0);
    const re = allocate(stream.rows, LOCK.n);
    gate('G9 the allocation regenerates from the stream and equals the lock', JSON.stringify(re.allocation) === JSON.stringify(alloc.allocation) && JSON.stringify(LOCK.allocation) === JSON.stringify(alloc.allocation));
    const cp = collisionProblems(alloc.allocation, stream.rows);
    gate('G10 no collision with any recorded territory, registry range or trajectory record', cp.length === 0, cp.slice(0, 3).join('; '));
    const pw = JSON.parse(fs.readFileSync(path.join(HERE, 'evidence', 'power_sim.json'), 'utf8'));
    const worst = pw.cells.filter(c => c.n === LOCK.n);
    gate('G11 the chosen n meets the preregistered power rule in every scenario (power >= 0.90, equivalence >= 0.90, type I <= 0.06)', pw.delta === DELTA && worst.length > 0 && worst.every(c => (c.theta === 0 ? c.pEquiv >= 0.90 && c.pPos + c.pNeg <= 0.06 : c.pPos >= 0.90)));
    const dev = JSON.parse(fs.readFileSync(path.join(HERE, 'evidence', 'dev_gates.json'), 'utf8'));
    gate('G12 development gates: positive control above delta, random walk inside +-delta, MFW instruments clean, determinism byte-identical', dev.positiveControl.lo > DELTA && dev.nullRW.lo > -DELTA && dev.nullRW.hi < DELTA && dev.instrumentsOk && dev.determinismOk, JSON.stringify({ pc: dev.positiveControl, rw: dev.nullRW }));
  }
  const trees = buildCredit1Trees();
  gate('G13 the pinned trees rebuild', sha(path.join(trees.learn0.dir, 'main.js')) === LEARN0_TREE.mainSha256 && sha(path.join(trees.trees.A.dir, 'main.js')) === CREDIT1_TREE.A.mainSha256);
  if (runTests) for (const t of ['experiments/coga/acq1/test_acq1.mjs', 'experiments/coga/acq1/test_mutants.mjs', 'experiments/coga/test_coga.mjs']) { const r = spawnSync(process.execPath, [t], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26 }); gate(`G14 ${t} passes`, r.status === 0, (r.stdout || '').trim().split('\n').pop()); }
  return { schema: 'coga/acq1.readiness', head: git('rev-parse', 'HEAD'), ok: g.every(x => x.ok), gates: g };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const r = checkReadiness();
  const i = process.argv.indexOf('--out'); if (i > 0) fs.writeFileSync(process.argv[i + 1], JSON.stringify(r, null, 1));
  for (const x of r.gates) console.log(`${x.ok ? 'PASS' : 'FAIL'} ${x.name}${x.detail ? ' - ' + x.detail.slice(0, 160) : ''}`);
  console.log(`readiness: ${r.gates.filter(x => x.ok).length}/${r.gates.length} gates; ${r.ok ? 'READY' : 'NOT READY'}`);
  process.exit(r.ok ? 0 : 1);
}
