// ==========================================================
// H1-R — run the EXISTING (unmodified) M7 and Phase-1.0 gates in three configurations:
//   pristine  : untransformed B2 tree                         (reference)
//   off       : conformed tree, H1R runtime absent            (must equal pristine: inertness)
//   on        : conformed tree, H1R runtime preloaded via NODE_OPTIONS --import
// Writes experiments/h1r/evidence/existing_gates.json. Gate scripts are never edited.
// ==========================================================
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildTree } from './build_tree.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const EVID = path.join(HERE, process.env.H1R_EVIDENCE || 'evidence');
fs.mkdirSync(EVID, { recursive: true });
const C = buildTree(), P = buildTree({ pristine: true });
const RUNTIME_URL = pathToFileURL(path.join(HERE, 'runtime.mjs')).href;
const PAR = Number(process.env.PAR || 4);

const M7 = ['verify_M7.js', 'verify_arms.js', 'verify_env.js', 'verify_e1e2.js', 'verify_e3e4.js', 'verify_e5.js', 'verify_cap.js',
  'verify_goal.js', 'verify_determinism.js', 'verify_G8.js', 'verify_G10.js', 'verify_acceptance.js', 'verify_stepledger.js', 'verify_G15.js'];
const P10 = ['parity_termarray.js', 'verify_S1.js', 'verify_S1b.js', 'verify_S1prime.js', 'verify_S2.js', 'verify_S2_Q4.js', 'verify_S4.js',
  'verify_S6.js', 'verify_G9.js', 'verify_G16.js', 'verify_S3prime.js'];
const only = (process.env.ONLY || '').split(',').filter(Boolean);

function runGate(tree, dir, script, mode) {
  return new Promise((res) => {
    const env = { ...process.env };
    delete env.NODE_OPTIONS; delete env.H1R; delete env.H1R_TREE;
    if (mode === 'on') { env.NODE_OPTIONS = `--import=${RUNTIME_URL}`; env.H1R = 'on'; env.H1R_TREE = tree; }
    const t = Date.now();
    execFile(process.execPath, [script], { cwd: path.join(tree, ...dir.split('/')), env, maxBuffer: 1 << 28, timeout: 3600_000 },
      (e, out, err) => {
        const text = String(out || '') + String(err || '');
        const lines = text.split(/\r?\n/);
        const fails = lines.filter(l => /^\s*(\[FAIL\]|FAIL\s)/.test(l)).map(l => l.trim().slice(0, 220));
        const passes = lines.filter(l => /^\s*(\[PASS\]|PASS\s)/.test(l)).length;
        const verdicts = lines.filter(l => /(GATE G\d+\s*:|RESULT:|passed, .*failed|VERDICT|INFORMATION SUFFICIENCY)/.test(l)).map(l => l.trim().slice(0, 200));
        // MS-1: every assertion line, so OFF ≡ pristine can be compared assertion by assertion (verify_existing_equivalence.mjs)
        const assertions = lines.filter(l => /^\s*(\[PASS\]|PASS\s|\[FAIL\]|FAIL\s)/.test(l)).map(l => l.trim().slice(0, 300));
        res({ script, dir, mode, exit: e ? (e.code ?? 'error') : 0, seconds: Math.round((Date.now() - t) / 1000), passes, fails, verdicts, assertions,
              tail: lines.slice(-6).join(' | ').slice(0, 600) });
      });
  });
}

const jobs = [];
for (const [dir, list] of [['experiments/m7', M7], ['experiments/phase1_0', P10]]) for (const s of list) {
  if (only.length && !only.includes(s)) continue;
  jobs.push([P.dir, dir, s, 'pristine'], [C.dir, dir, s, 'off'], [C.dir, dir, s, 'on']);
}
const out = new Array(jobs.length); let k = 0;
await Promise.all(Array.from({ length: PAR }, async () => {
  while (k < jobs.length) { const j = k++; const [tree, dir, s, mode] = jobs[j];
    out[j] = await runGate(tree, dir, s, mode === 'pristine' ? 'off' : mode); out[j].config = mode;
    console.log(`${mode.padEnd(8)} ${dir}/${s}: exit ${out[j].exit}, ${out[j].passes} PASS, ${out[j].fails.length} FAIL (${out[j].seconds}s)`); }
}));
fs.writeFileSync(path.join(EVID, 'existing_gates.json'), JSON.stringify(out, null, 1));
