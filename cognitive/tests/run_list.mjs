// ==========================================================
// Test-list runner for gates after CF-01 (CF-01's own run_all.mjs stays unchanged).  Same module contract:
// each file exports `tests` = [[name, fn], ...]; fn throws on failure.
// ==========================================================
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

export async function runTestFiles(files) {
  const results = [];
  for (const f of files) {
    const { tests } = await import(pathToFileURL(path.join(HERE, f)).href);
    for (const [name, fn] of tests) {
      try { await fn(); results.push({ file: f, name, pass: true }); } catch (e) { results.push({ file: f, name, pass: false, error: String((e && e.message) || e).slice(0, 300) }); }
    }
  }
  return { total: results.length, passed: results.filter((r) => r.pass).length, failed: results.filter((r) => !r.pass), results };
}
