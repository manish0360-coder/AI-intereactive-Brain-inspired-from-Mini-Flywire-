// ==========================================================
// H1-R MS-1 — the 25 existing gate scripts against the conformed tree (D-019 §4 and §5 N2, N3)
// ==========================================================
// Reads experiments/h1r/$H1R_EVIDENCE/existing_gates.json (run_existing_gates.mjs) and, when present, the independent
// repetitions $H1R_EVIDENCE/n3_repeat_*/existing_gates.json (run_existing_gates.mjs with ONLY=<scripts>), and checks:
//   N3   OFF ≡ pristine: for every script, the same exit code and the same assertions — IDs, order, verdicts, and the
//        exact text of every line whose text is reproducible between independent pristine runs — except
//        verify_G16.js G16.4a2–a6, which are classified failures under H1R-S6 (D-019 §4); every other G16 assertion
//        stays binding (see the N3 block for why exact text of non-reproducible lines cannot be required)
//   N3-REFL / N3-AV  the relation is reflexive on independent pristine runs and detects real differences
//   S6′  on the pristine B2 tree verify_G16.js is unaffected (G16.4a1–a6 pass)
//   ON   with conformance ON, the failing assertions are exactly the classified set: v1.0 §11 (e1e2 G1f/AV8b,
//        cap B1/B3/B4/H7, goal B2/B3, stepledger A3, S1b S1.7, S2 S2.4b), H1R-S4 (G8.4c), and H1R-S6 (G16.4a2–a6);
//        and they equal the previous round's ON failures (evidence_r3) plus G16.4a2–a6
//   N2   (S4, G9 part) verify_S4.js and verify_G9.js are clean on the conformed tree, OFF and ON
//
//   node experiments/h1r/verify_existing_equivalence.mjs     (writes $H1R_EVIDENCE/existing_equivalence.json)
// ==========================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const EVID = path.join(HERE, process.env.H1R_EVIDENCE || 'evidence');
const REF = path.join(HERE, 'evidence_r3', 'existing_gates.json');
const cur = JSON.parse(fs.readFileSync(path.join(EVID, 'existing_gates.json'), 'utf8'));
const ref = JSON.parse(fs.readFileSync(REF, 'utf8'));
const S6 = ['G16.4a2', 'G16.4a3', 'G16.4a4', 'G16.4a5', 'G16.4a6'];
const CLASSIFIED = { 'verify_e1e2.js': ['G1f', 'AV8b'], 'verify_cap.js': ['B1', 'B3', 'B4', 'H7'], 'verify_goal.js': ['B2', 'B3'],
  'verify_G8.js': ['G8.4c'], 'verify_stepledger.js': ['A3'], 'verify_S1b.js': ['S1.7'], 'verify_S2.js': ['S2.4b'], 'verify_G16.js': S6 };
const idOf = (line) => line.replace(/^\[?(PASS|FAIL)\]?\s+/, '').split(/\s+/)[0];
const isFail = (line) => /^\[?FAIL/.test(line);
const get = (rows, script, config) => rows.find(r => r.script === script && r.config === config);
const scripts = [...new Set(cur.map(r => r.script))];
const G = [];
const gate = (id, name, pass, evidence) => G.push({ id, name, status: pass ? 'PASS' : 'FAIL', evidence });

gate('E0', 'all 25 existing gate scripts ran in all three configurations, each with assertion lines recorded',
  scripts.length === 25 && scripts.every(s => ['pristine', 'off', 'on'].every(c => { const r = get(cur, s, c); return r && Array.isArray(r.assertions) && r.assertions.length > 0; })),
  `${scripts.length} scripts; assertions recorded: ${cur.filter(r => Array.isArray(r.assertions) && r.assertions.length > 0).length}/${cur.length}`);

// N3 — OFF ≡ pristine.
// First evaluation (kept as existing_equivalence.firsteval.*) required identical assertion TEXT and failed on six
// lines of four scripts whose detail text is not reproducible on the unmodified B2 tree: it varies between
// independent pristine runs (unseeded Math.random contexts in verify_S1prime S1.7′(2)/(4), verify_G16 G16.3′(3)/(4),
// verify_S2 S2.1/S2.3; the deliberately wall-clock control build in verify_determinism D4). A relation that fails
// pristine against pristine cannot define "OFF ≡ pristine". The relation used here is:
//   same exit code; the same assertion IDs in the same order, each with the same verdict; and the same exact text for
//   every assertion line, except lines whose text differs between independent pristine runs (measured from the
//   repetition directories n3_repeat_* — pristine against pristine only, never against OFF), which must still
//   carry the same ID and verdict.
// It is stricter than the R1–R3 check (exit code, PASS count, FAIL lines), is checked to be reflexive on
// independent pristine runs (N3-REFL), and must detect real differences (N3-AV).
const REPEATS = fs.readdirSync(EVID, { withFileTypes: true }).filter(d => d.isDirectory() && d.name.startsWith('n3_repeat_'))
  .map(d => ({ name: d.name, rows: JSON.parse(fs.readFileSync(path.join(EVID, d.name, 'existing_gates.json'), 'utf8')) }));
const nondet = {};                      // script -> Set of assertion indices whose text varies between pristine runs
for (const s of scripts) {
  const runs = [get(cur, s, 'pristine'), ...REPEATS.map(r => get(r.rows, s, 'pristine')).filter(Boolean)].map(r => r.assertions);
  nondet[s] = new Set(runs[0].map((l, i) => i).filter(i => new Set(runs.map(a => a[i])).size > 1));
}
// equivalence of two runs of one script (`except`: assertion IDs exempt from comparison, for H1R-S6 only)
function equivalent(s, p, o, except = []) {
  const why = [];
  const P = p.assertions.filter(l => !except.includes(idOf(l))), O = o.assertions.filter(l => !except.includes(idOf(l)));
  const idxP = p.assertions.map((l, i) => i).filter(i => !except.includes(idOf(p.assertions[i])));
  if (except.length === 0 && p.exit !== o.exit) why.push(`exit ${p.exit}/${o.exit}`);
  if (P.length !== O.length) why.push(`assertions ${P.length}/${O.length}`);
  else P.forEach((l, k) => {
    if (idOf(l) !== idOf(O[k]) || isFail(l) !== isFail(O[k])) why.push(`#${idxP[k]} ${idOf(l)}: id/verdict`);
    else if (l !== O[k] && !nondet[s].has(idxP[k])) why.push(`#${idxP[k]} ${idOf(l)}: text`);
  });
  return why;
}
{ const bad = [], detail = {};
  const pairs = [{ name: 'main', rows: cur }, ...REPEATS];
  let compared = 0;
  for (const s of scripts) for (const run of pairs) {
    const p = get(run.rows, s, 'pristine'), o = get(run.rows, s, 'off');
    if (!p || !o) continue;
    compared++;
    if (s === 'verify_G16.js') {
      const pS6 = p.assertions.filter(l => S6.includes(idOf(l))), oS6 = o.assertions.filter(l => S6.includes(idOf(l)));
      const why = equivalent(s, p, o, S6);
      detail[`${run.name}`] = { pristineS6: pS6.map(l => (isFail(l) ? 'FAIL ' : 'PASS ') + idOf(l)), offS6: oS6.map(l => (isFail(l) ? 'FAIL ' : 'PASS ') + idOf(l)), otherDifferences: why, exit: [p.exit, o.exit] };
      if (why.length) bad.push(`${run.name} ${s}: ${why.join(', ')}`);
      if (pS6.length !== 5 || oS6.length !== 5 || oS6.map(idOf).join() !== S6.join() || pS6.some(isFail)) bad.push(`${run.name} ${s}: G16.4a2–a6 not reported as expected`);
      continue;
    }
    const why = equivalent(s, p, o);
    if (why.length) bad.push(`${run.name} ${s}: ${why.join(', ')}`);
  }
  const total = scripts.reduce((n, s) => n + get(cur, s, 'off').assertions.length, 0);
  const nd = Object.entries(nondet).filter(([, v]) => v.size).map(([s, v]) => `${s} ${[...v].map(i => idOf(get(cur, s, 'pristine').assertions[i])).join('/')}`);
  gate('N3', 'OFF ≡ pristine: every existing gate script gives, with the H1R runtime absent, the same exit code and the same assertions (IDs, order, verdicts, and exact text wherever the text is reproducible between independent pristine runs), except verify_G16.js G16.4a2–a6 (classified under H1R-S6)',
    bad.length === 0, `${compared} (script, run) pairs over ${1 + REPEATS.length} runs (${REPEATS.map(r => r.name).join(', ')}); ${total} assertion lines in the main run; ` +
    `differences: ${bad.length ? bad.join(' | ') : 'none'}; text not reproducible between pristine runs (verdict and ID still compared): ${nd.join('; ') || 'none'}; G16: ${JSON.stringify(detail)}`);
  // reflexivity: the relation holds between independent pristine runs of the unmodified B2 tree
  const refl = [];
  for (const r of REPEATS) for (const s of scripts) { const a = get(cur, s, 'pristine'), b = get(r.rows, s, 'pristine'); if (a && b) { const w = equivalent(s, a, b); if (w.length) refl.push(`${r.name} ${s}: ${w.join(', ')}`); } }
  gate('N3-REFL', 'the equivalence relation is reflexive on the unmodified B2 tree: independent pristine runs are equivalent to each other',
    REPEATS.length >= 2 && refl.length === 0, `${REPEATS.length} repetitions of ${[...new Set(REPEATS.flatMap(r => r.rows.map(x => x.script)))].join(', ')}; failures: ${refl.join(' | ') || 'none'}`);
  // anti-vacuity: the relation detects real differences
  const s2on = equivalent('verify_S2.js', get(cur, 'verify_S2.js', 'pristine'), get(cur, 'verify_S2.js', 'on'));
  const g16noS6 = equivalent('verify_G16.js', get(cur, 'verify_G16.js', 'pristine'), get(cur, 'verify_G16.js', 'off'));
  const pS1 = get(cur, 'verify_S1prime.js', 'pristine'), detIdx = pS1.assertions.findIndex((l, i) => !nondet['verify_S1prime.js'].has(i));
  const tampered = { ...pS1, assertions: pS1.assertions.map((l, i) => i === detIdx ? l + ' x' : l) };
  const textChange = equivalent('verify_S1prime.js', pS1, tampered);
  gate('N3-AV', 'anti-vacuity: the relation detects a changed verdict (verify_S2 ON: S2.4b), the S6 lines when they are not exempted (verify_G16 OFF), and a changed reproducible detail text',
    s2on.length > 0 && g16noS6.length > 0 && textChange.length > 0,
    `S2 pristine vs ON: ${s2on.join(', ')}; G16 pristine vs OFF without the exemption: ${g16noS6.join(', ')}; S1prime with one reproducible line altered: ${textChange.join(', ')}`);
  // the R1–R3 check, for continuity: exit code, PASS count and FAIL lines
  const hist = scripts.filter(s => s !== 'verify_G16.js').filter(s => { const p = get(cur, s, 'pristine'), o = get(cur, s, 'off');
    return p.exit === o.exit && p.passes === o.passes && JSON.stringify(p.fails) === JSON.stringify(o.fails); }).length;
  G.push({ id: 'N3-HIST', name: 'the R1–R3 form of the check (exit code, PASS count, FAIL lines), scripts other than verify_G16.js', status: 'INFO', evidence: `${hist}/${scripts.length - 1} identical` });
  const p16 = get(cur, 'verify_G16.js', 'pristine');
  gate("G16'-P", 'on the pristine B2 tree verify_G16.js is unaffected: G16.4a1–a6 all pass',
    ['G16.4a1', ...S6].every(id => p16.assertions.some(l => idOf(l) === id && !isFail(l))), p16.assertions.filter(l => /G16\.4a/.test(l)).map(l => l.slice(0, 50)).join(' | ')); }

// ON — exactly the classified set, and the previous round's ON failures plus G16.4a2–a6
{ const bad = [], seen = {};
  for (const s of scripts) {
    const on = get(cur, s, 'on'), prev = get(ref, s, 'on');
    const fails = on.assertions.filter(isFail).map(idOf).sort();
    const prevFails = (prev ? prev.fails : []).map(idOf).sort();
    const expected = [...new Set([...prevFails, ...(s === 'verify_G16.js' ? S6 : [])])].sort();
    if (fails.length) seen[s] = fails;
    if (JSON.stringify(fails) !== JSON.stringify(expected)) bad.push(`${s}: ${fails.join(',') || 'none'} vs expected ${expected.join(',') || 'none'}`);
    if (fails.some(id => !(CLASSIFIED[s] || []).includes(id))) bad.push(`${s}: unclassified failure ${fails.filter(id => !(CLASSIFIED[s] || []).includes(id)).join(',')}`);
  }
  const nPass = cur.filter(r => r.config === 'on').reduce((n, r) => n + r.assertions.filter(l => !isFail(l)).length, 0);
  const nFail = cur.filter(r => r.config === 'on').reduce((n, r) => n + r.assertions.filter(isFail).length, 0);
  gate('ON', 'conformance ON: the failing assertions are exactly the classified set (v1.0 §11, H1R-S4, H1R-S6) and equal the R3 round\'s ON failures plus G16.4a2–a6; no new failure',
    bad.length === 0, `${nPass} PASS / ${nFail} FAIL; failing: ${Object.entries(seen).map(([s, f]) => `${s.replace('verify_', '').replace('.js', '')} ${f.join('/')}`).join('; ')}${bad.length ? ' || ' + bad.join(' | ') : ''}`); }

// N2 — S4 and G9 clean on the conformed tree
{ const rows = ['verify_S4.js', 'verify_G9.js'].flatMap(s => ['off', 'on'].map(c => get(cur, s, c)));
  gate('N2-S4G9', 'verify_S4.js and verify_G9.js are clean on the conformed tree (OFF and ON): exit 0, no failing assertion',
    rows.every(r => r && r.exit === 0 && !r.assertions.some(isFail) && r.assertions.length > 0),
    rows.map(r => `${r.script} ${r.config}: exit ${r.exit}, ${r.assertions.length} assertions, ${r.assertions.filter(isFail).length} FAIL`).join('; ')); }

fs.writeFileSync(path.join(EVID, 'existing_equivalence.json'), JSON.stringify({ generatedBy: 'experiments/h1r/verify_existing_equivalence.mjs', reference: 'evidence_r3/existing_gates.json', gates: G }, null, 1));
for (const g of G) console.log(`${g.status.padEnd(5)} ${g.id.padEnd(8)} ${g.name}\n      ${g.evidence}`);
const fails = G.filter(g => g.status === 'FAIL').length;
console.log(`\n${G.length - fails} PASS, ${fails} FAIL`);
process.exitCode = fails ? 1 : 0;
