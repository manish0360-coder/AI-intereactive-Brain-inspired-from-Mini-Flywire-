// ==========================================================
// CF-01 — test runner (no framework).  Each test module exports `tests` = [[name, fn], ...]; fn throws on failure.
// ==========================================================
//   node cognitive/tests/run_all.mjs          exit 0 iff every test passes
// ==========================================================
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const TEST_FILES = Object.freeze(['test_worlds.mjs', 'test_env.mjs', 'test_agents.mjs', 'test_tasks.mjs', 'test_stats.mjs', 'test_isolation.mjs', 'test_mutants.mjs']);
const HERE = path.dirname(fileURLToPath(import.meta.url));

export async function runAllTests() {
  const results = [];
  for (const f of TEST_FILES) {
    const { tests } = await import(pathToFileURL(path.join(HERE, f)).href);
    for (const [name, fn] of tests) {
      try { await fn(); results.push({ file: f, name, pass: true }); } catch (e) { results.push({ file: f, name, pass: false, error: String(e && e.message || e).slice(0, 300) }); }
    }
  }
  return { total: results.length, passed: results.filter((r) => r.pass).length, failed: results.filter((r) => !r.pass), results };
}

if (path.resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  const r = await runAllTests();
  for (const f of TEST_FILES) {
    const rows = r.results.filter((x) => x.file === f);
    console.log(`${f.padEnd(20)} ${rows.filter((x) => x.pass).length}/${rows.length}`);
  }
  for (const f of r.failed) console.log(`FAIL ${f.file} :: ${f.name} :: ${f.error}`);
  console.log(`TOTAL ${r.passed}/${r.total}`);
  process.exit(r.failed.length ? 1 : 0);
}
