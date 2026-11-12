// Runs every test file under cognitive/tests through the existing runners.
// It adds no tests of its own: CF-01's list comes from run_all.mjs, and the files
// added by later gates (CF-01b, CF-03) are run through run_list.mjs.
//   node scripts/test.mjs        exit 0 iff every test passes
import { TEST_FILES } from '../cognitive/tests/run_all.mjs';
import { runTestFiles } from '../cognitive/tests/run_list.mjs';

const LATER_GATES = ['test_core.mjs', 'test_e2p.mjs', 'test_invariance.mjs', 'test_v1.mjs'];
const files = [...TEST_FILES, ...LATER_GATES];

const r = await runTestFiles(files);
for (const f of files) {
  const rows = r.results.filter((x) => x.file === f);
  console.log(`${f.padEnd(22)} ${rows.filter((x) => x.pass).length}/${rows.length}`);
}
for (const f of r.failed) console.log(`FAIL ${f.file} :: ${f.name} :: ${f.error}`);
console.log(`TOTAL ${r.passed}/${r.total}`);
process.exit(r.failed.length ? 1 : 0);
