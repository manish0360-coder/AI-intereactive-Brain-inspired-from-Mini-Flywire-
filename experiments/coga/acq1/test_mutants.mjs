// ==========================================================
// ACQ-1 — source mutants: each mutated module must fail a named behavioural check (zero MFW sessions)
// ==========================================================
//   node experiments/coga/acq1/test_mutants.mjs        exit 0 only if every mutant is detected and the unmutated source passes
// A mutant is the module's source with one exact substring replaced, written next to the module, imported, and removed.
// ==========================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { generateAccepted } from '../../m7/env.js';
import { NEIGHBOURS } from '../worlds.mjs';
import { KIND } from '../envsim.mjs';
import { cases, nearOptimal, OBJECTIVES } from '../distal.mjs';
import { GRAPH } from '../worlds.mjs';
import { describeAcq } from './states.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, '../../..');
const results = [];
const note = (name, ok, detail = '') => { results.push(!!ok); console.log(`${ok ? 'CAUGHT' : 'MISSED'} ${name}${detail ? ' - ' + detail : ''}`); };
let nonce = 0;
async function withMutant(file, anchor, repl, fn) {
  const src = fs.readFileSync(path.join(HERE, file), 'utf8');
  if (src.split(anchor).length !== 2) throw new Error(`anchor not unique in ${file}: ${anchor.slice(0, 50)}`);
  const f = path.join(HERE, `_mut_${nonce++}_${file}`);
  fs.writeFileSync(f, src.replace(anchor, () => repl));
  try { return await fn(await import(pathToFileURL(f).href)); } finally { fs.unlinkSync(f); }
}
const g = generateAccepted(200116, 0);
const W = describeAcq({ cfg: g.cfg, acceptedSeed: 200116, configIndex: 0, stream: 'study' });
const toy = { id: 'x', goal: 9, p1: GRAPH.edges.map(() => 1), p2: GRAPH.edges.map(() => 1), sw: [{ s: 1, deg: 3, A1: [NEIGHBOURS.get(1)[0]], A2: [NEIGHBOURS.get(1)[1]] }] };
const [a0, a1, a2] = NEIGHBOURS.get(1), row = (t, to) => [t, 1, to, KIND.EDGE, 1];

// each check returns true when the module behaves correctly
const checks = {
  fixedPolicyZero: (M) => M.worldMetric(toy, [row(0, a0), row(1, a2)], [row(0, a0), row(1, a2)], 0, 10).psi === 0,
  windowOnly: (M) => M.worldMetric(toy, [row(50, a0)], [row(0, a1)], 0, 10).usable === 0,
  edgeOnly: (M) => [...M.stateCounts([[0, 1, a0, KIND.SELF, 1], [1, 1, a0, KIND.EDGE, 0]], 0, 10).get(1).values()][0] === 1,
  fullShift: (M) => M.worldMetric(toy, [row(0, a0)], [row(0, a1)], 0, 10).psi === 1,
  decision: (M) => { const b = { delta: 0.1, voidShare: 0, determinismOk: true, nullOk: true, pcOk: true }; const at = (L, U, x = {}) => M.decideAcq({ ...b, L, U, ...x }).row; return at(0.02, 0.3) === 'A1' && at(0.02, 0.08) === 'A2' && at(-0.05, 0.05) === 'A3' && at(-0.3, -0.01) === 'A4' && at(-0.05, 0.3) === 'A5' && at(0.02, 0.3, { voidShare: 0.06 }) === 'A8' && at(0.02, 0.3, { nullOk: false }) === 'A7'; },
  stratified: (M) => Math.abs(M.stratifiedMean([{ goal: 8, v: 0.3 }, { goal: 8, v: 0.3 }, { goal: 8, v: 0.3 }, { goal: 12, v: -0.1 }], x => x.v) - 0.1) < 1e-12,
  tWidth: (M) => { const i = M.interval([{ goal: 8, v: 0 }, { goal: 8, v: 1 }, { goal: 12, v: 0 }, { goal: 12, v: 1 }], x => x.v, { level: 0.95 }); return Math.abs((i.hi - i.est) / i.se - 4.3027) < 0.05; },
  seesEnv: (M) => { const a = new M.AcqEnv(W, 'E2'); return a.p === W.p2; },
  robustSwitch: (M) => { const sw = M.switchStates(W.p1, W.p2, W.goal); return sw.every(d => { const c = OBJECTIVES.map(o => cases(GRAPH, d.s, W.p1, W.p2, W.goal, o, 0.95)); const A = (k) => new Set(c.flatMap(x => [...nearOptimal(x[k], 0.2)])); const B = A('Q22'); return [...A('Q11')].every(x => !B.has(x)); }); },
  // the draws the agent receives (not its targets: slips make targets differ even on one shared stream)
  distinctStreams: (M) => { const f = (e) => { const d = []; M.runAcq({ world: W, agent: 'RW', env: e, steps: 5, agentFactory: () => ({ act(s, rng) { d.push(rng()); return NEIGHBOURS.get(s)[0]; }, learn() {} }) }); return d.join(); }; return f('E1') !== f('E2'); },
};
const MUTANTS = [
  ['M1 psi replaced by a raw single-environment share', 'metric.mjs', 'const psi = 0.5 * ((share(m1, d.A1) - share(m2, d.A1)) + (share(m2, d.A2) - share(m1, d.A2)));', 'const psi = share(m1, d.A1);', 'fixedPolicyZero'],
  ['M2 the window is ignored', 'metric.mjs', 'if (r[0] < lo || r[0] >= hi || r[3] !== KIND.EDGE) continue;\n    if (!c.has(r[1]))', 'if (r[3] !== KIND.EDGE) continue;\n    if (!c.has(r[1]))', 'windowOnly'],
  ['M3 self no-ops counted as decisions', 'metric.mjs', 'if (r[0] < lo || r[0] >= hi || r[3] !== KIND.EDGE) continue;\n    if (!c.has(r[1]))', 'if (r[0] < lo || r[0] >= hi) continue;\n    if (!c.has(r[1]))', 'edgeOnly'],
  ['M4 psi halved', 'metric.mjs', 'const psi = 0.5 * ((share(m1, d.A1)', 'const psi = 0.25 * ((share(m1, d.A1)', 'fullShift'],
  ['M5 SUPPORTED requires L > delta', 'analysis.mjs', "if (L > 0 && !(U < delta)) return { row: 'A1'", "if (L > delta) return { row: 'A1'", 'decision'],
  ['M6 the instruments do not gate', 'analysis.mjs', "if (!nullOk || !pcOk) return { row: 'A7', rec: 'NON-EVALUABLE' };", '', 'decision'],
  ['M7 a pooled mean instead of equal goals', 'analysis.mjs', 'return m.reduce((x, y) => x + y, 0) / m.length;\n}\nexport const contrast', 'return [...groups.values()].flat().reduce((x, y) => x + y, 0) / [...groups.values()].flat().length;\n}\nexport const contrast', 'stratified'],
  ['M8 normal quantile instead of t', 'analysis.mjs', 'const t = tQuantile(1 - (1 - level) / 2, df), se = Math.sqrt(se2);', 'const t = 1.96, se = Math.sqrt(se2);', 'tWidth'],
  ['M9 the environment ignores E1 / E2', 'env.mjs', 'this.p = pOf(world, env);', 'this.p = world.p1;', 'seesEnv'],
  ['M10 SWITCH tested at kappa instead of 2 kappa', 'states.mjs', "if (!disjoint(A('Q11', 2 * kappa), A('Q22', 2 * kappa))) continue;", "if (!disjoint(A('Q11', kappa), A('Q22', kappa))) continue;", 'robustSwitch'],
  ['M11 one agent stream for both environments', 'baselines.mjs', 'const rng = stream(agentStream(world.id, kind, envName));', "const rng = stream(agentStream(world.id, kind, 'E1'));", 'distinctStreams'],
];
const clean = { 'metric.mjs': await import('./metric.mjs'), 'analysis.mjs': await import('./analysis.mjs'), 'env.mjs': await import('./env.mjs'), 'states.mjs': await import('./states.mjs'), 'baselines.mjs': await import('./baselines.mjs') };
for (const [, file, , , chk] of MUTANTS) if (!checks[chk](clean[file])) { console.log(`FAIL unmutated ${file} fails ${chk}`); process.exit(1); }
for (const [name, file, anchor, repl, chk] of MUTANTS) {
  const a = anchor.replace(/\n/g, fs.readFileSync(path.join(HERE, file), 'utf8').includes('\r\n') ? '\r\n' : '\n'), r = repl.replace(/\n/g, fs.readFileSync(path.join(HERE, file), 'utf8').includes('\r\n') ? '\r\n' : '\n');
  const ok = await withMutant(file, a, r, (M) => checks[chk](M));
  note(`${name} (detected by ${chk})`, !ok);
}
// agents cannot read hidden reliability: no runtime source refers to the generating fields
{
  const files = ['main.js', ...fs.readdirSync(path.join(ROOT, 'render')).filter(f => f.endsWith('.js')).map(f => `render/${f}`)];
  const hits = files.filter(f => /pPhase1|pPhase2|trueP\b/.test(fs.readFileSync(path.join(ROOT, f), 'utf8')));
  results.push(hits.length === 0); console.log(`${hits.length === 0 ? 'PASS' : 'FAIL'} no runtime file refers to the hidden reliabilities (${files.length} files scanned)`);
}
console.log(`\nACQ-1 source mutants: ${results.filter(Boolean).length}/${results.length} (including the leak scan)`);
process.exit(results.every(Boolean) ? 0 : 1);
