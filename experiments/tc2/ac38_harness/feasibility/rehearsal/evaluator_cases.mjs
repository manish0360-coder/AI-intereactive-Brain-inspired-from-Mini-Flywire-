// ==========================================================
// AC38 limited feasibility study — refusal and residual predicates against constructed records
// ==========================================================
//   node experiments/tc2/ac38_harness/feasibility/rehearsal/evaluator_cases.mjs
// Runs nothing.  Each case is a hand-built record with a known right answer: intended refusals must
// pass, and plausible bypasses must fail.  Written for the Gemini-review audit of 2026-11-02, where
// it showed that the earlier evaluator accepted three bypasses.
// ==========================================================
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluate } from '../harness/evaluate.mjs';

const row = (id, predicates) => ({ id, group: 'BK', role: 'breakage', countsAsDetection: false, contract: 'case', detector: 'refusal', runs: [{ label: id, mode: 'J', fixture: 'three', reason: 'manual' }], predicates });
const CASES = [
  // [id, record, predicates, must pass]
  ['intended fixture refusal', { code: 3, result: { refused: 'AC38 REFUSED: canary did not fire: [{"map":0}]' }, stderr: '', residual: [] }, [{ refusal: 'x', matches: 'canary did not fire' }], true],
  ['intended preload refusal', { code: 1, result: null, stderr: 'Error: AC38 REFUSED: the rewrite table does not match its pinned hash\n    at <ROOT>/x.mjs:21', residual: [] }, [{ refusal: 'x', matches: 'rewrite table does not match its pinned hash' }], true],
  ['bypass: generic crash quoting the reason, no refusal marker', { code: 3, result: { failed: 'the run crashed: TypeError: canary did not fire is not a function' }, stderr: '', residual: [] }, [{ refusal: 'x', matches: 'canary did not fire' }], false],
  ['bypass: exit 0 with the marker in stderr', { code: 0, result: { refused: null }, stderr: 'AC38 REFUSED: canary did not fire', residual: [] }, [{ refusal: 'x', matches: 'canary did not fire' }], false],
  ['bypass: a different site matched by a regex wildcard', { code: 3, result: { refused: 'AC38 REFUSED: anchor mismatch at render/episodicContextEngineXjs:366' }, stderr: '', residual: [] }, [{ refusal: 'x', matches: 'anchor mismatch at render/episodicContextEngine.js:366' }], false],
  ['intended leak test', { code: 0, result: { window: { leakTest: '<RESIDUAL>' } }, stderr: '', residual: ['drive-path'] }, [{ residual: 'x', eq: true }, { run: 'x', fact: 'leakTest', eq: '<RESIDUAL>' }], true],
  ['bypass: residual from an early failure, leak test never ran', { code: 3, result: { failed: 'boom' }, stderr: 'at <RESIDUAL>', residual: ['drive-path'] }, [{ residual: 'x', eq: true }, { run: 'x', fact: 'leakTest', eq: '<RESIDUAL>' }], false],
];

export function runEvaluatorCases() {
  return CASES.map(([name, record, predicates, mustPass]) => {
    const id = 'x';
    const expected = { status: 'cases', profile: 'cases', closedList: { fresh: [], outgoing: [] }, inventoryKeys: [], closedListKeys: [], rows: [row(id, predicates)] };
    const pass = evaluate(expected, [{ label: id, ...record }]).rows[0].pass;
    return { name, mustPass, pass, ok: pass === mustPass };
  });
}

if (path.resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  const results = runEvaluatorCases();
  for (const r of results) console.log(`${r.ok ? 'ok  ' : 'FAIL'} ${r.name}: ${r.pass ? 'passes' : 'fails'} (must ${r.mustPass ? 'pass' : 'fail'})`);
  console.log(JSON.stringify({ cases: results.length, correct: results.filter((r) => r.ok).length }));
  process.exit(results.every((r) => r.ok) ? 0 : 1);
}
