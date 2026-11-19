// Runs the whole test suite by discovery (cognitive/tests/run_discover.mjs): CF-01's list (run_all.mjs, in its order),
// then every other cognitive/tests/test_*.mjs file in name order. A new test file runs without any runner being edited.
// scripts/test.mjs (pinned by M13) and scripts/test_all.mjs (pinned by M14) stay unchanged; a suite test
// (test_m15_belief.mjs, "M15 RUNNER") checks that discovery covers every file they run.
//   node scripts/test_discover.mjs        exit 0 iff every test passes
import { discoveredFiles } from '../cognitive/tests/run_discover.mjs';
import { runTestFiles } from '../cognitive/tests/run_list.mjs';

const files = discoveredFiles();
const r = await runTestFiles(files);
for (const f of files) {
  const rows = r.results.filter((x) => x.file === f);
  console.log(`${f.padEnd(26)} ${rows.filter((x) => x.pass).length}/${rows.length}`);
}
for (const f of r.failed) console.log(`FAIL ${f.file} :: ${f.name} :: ${f.error}`);
console.log(`TOTAL ${r.passed}/${r.total}`);
process.exit(r.failed.length ? 1 : 0);
