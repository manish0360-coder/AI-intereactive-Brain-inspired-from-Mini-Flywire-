// ==========================================================
// Registry verification entry point (M-REG-1): runs both gates and exits non-zero if either fails.
//   node experiments/registry/verify_registry.js [--strict-untracked] [--with-legacy-timing]
//     verify_import_isolation.js   legacy-import isolation gate and scanner mutants
//     verify_blocks.js             block-aware registry, differential battery, mutants, timing
// There is no CI in this repository; this is the single command a milestone (or a pre-commit step) runs.
// ==========================================================
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const pass = (flag) => process.argv.includes(flag);
const jobs = [
  ['import isolation', 'verify_import_isolation.js', pass('--strict-untracked') ? ['--strict-untracked'] : []],
  ['block-aware registry', 'verify_blocks.js', pass('--with-legacy-timing') ? ['--with-legacy-timing'] : []],
];
let failed = 0;
for (const [name, file, args] of jobs) {
  console.log(`\n######## ${name} (${file}) ########`);
  const r = spawnSync(process.execPath, [path.join(HERE, file), ...args], { stdio: 'inherit' });
  if (r.status !== 0) { failed++; console.log(`######## ${name}: FAILED (exit ${r.status}) ########`); }
}
console.log(failed === 0 ? '\nREGISTRY GATES: ALL PASSED' : `\nREGISTRY GATES: ${failed} FAILED`);
process.exit(failed === 0 ? 0 : 1);
