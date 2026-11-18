// Independent check of experiments/m14_schema/results/m14_result.json, written BEFORE the result existed
// (2026-11-18, after the freeze commit 01f68da and before the run). It recomputes, with its own code:
//   provenance (frozen hashes, HEAD, main.js, tests, parameters), counts, determinism, every test episode's integrity
//   (steps = moves on a deterministic world, every move an edge of the test world, the start, the goal), the routes
//   (own BFS, own path counting, own pair enumeration), CONCRETE's passivity, ORACLE_SCHEMA walking the route, each
//   schema's freeze and hash, the learned relation from the stored counts, every criterion and reported contrast with
//   its bootstrap interval, gainShape, the five lines and the summary statement (SPEC.md "Verdict").
// Shared with the driver: pairedBootstrap (so the interval seeds can be reproduced), generateWorld and makeStream (so
// the worlds and the route draws are the same).
// Illustration rule, fixed here before the result: label m14schema|gate|0; for each arm, the first COMPOSE test
// episode's path and steps, and the SCHEMA arm's learned relation.
// Usage: node verify_m14.mjs <repo root>
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const ROOT = process.argv[2];
const imp = (p) => import(pathToFileURL(path.join(ROOT, p)).href);
const { pairedBootstrap } = await imp('cognitive/testbed/stats.mjs');
const { generateWorld } = await imp('cognitive/testbed/worlds.mjs');
const { makeStream } = await imp('cognitive/testbed/rng.mjs');
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const git = (...a) => execFileSync('git', ['-C', ROOT, ...a]).toString().trim();
const fails = [];
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) fails.push(m); };
const HERE = path.join(ROOT, 'experiments/m14_schema');
const raw = fs.readFileSync(path.join(HERE, 'results/m14_result.json'));
const j = JSON.parse(raw);
console.log(`result file sha256 ${sha(raw)}  (${raw.length} bytes)`);
const ARMS = ['CONCRETE', 'SCHEMA', 'SCHEMA_SHUFFLED', 'ORACLE_SCHEMA'], CONDS = ['COMPOSE', 'NULL', 'REVERSED'];
const SIGMA = [1, 2, 3, 0], MARGIN = 9, CAP = 200;
const sum = (x) => x.reduce((a, b) => a + b, 0), mean = (x) => sum(x) / x.length;
const sd = (x) => { const m = mean(x); return Math.sqrt(x.reduce((s, v) => s + (v - m) ** 2, 0) / (x.length - 1)); };
const median = (x) => { const s = [...x].sort((a, b) => a - b), n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };

// ---- provenance ----
const frozen = Object.fromEntries(fs.readFileSync(path.join(HERE, 'SPEC.sha256'), 'utf8').trim().split(/\r?\n/).map((l) => l.trim().split(/\s+/)).map(([h, n]) => [n, h]));
ok(j.specSha256 === sha(fs.readFileSync(path.join(HERE, 'SPEC.md'))) && j.specSha256 === frozen['SPEC.md'], `SPEC.md ${j.specSha256?.slice(0, 8)} = file = SPEC.sha256`);
ok(j.pinsSha256 === sha(fs.readFileSync(path.join(HERE, 'PINS.json'))) && j.pinsSha256 === frozen['PINS.json'], 'PINS.json = file = SPEC.sha256');
ok(j.admissionSha256 === sha(fs.readFileSync(path.join(HERE, 'admission/admission.json'))) && j.admissionSha256 === frozen['admission/admission.json'], 'admission.json = file = SPEC.sha256');
ok(j.headAtLaunch === j.headAtEnd && j.headAtLaunch.startsWith('01f68da'), `HEAD 01f68da at launch and end (${j.headAtLaunch.slice(0, 7)}, ${j.headAtEnd.slice(0, 7)})`);
ok(j.appFiles['main.js'].startsWith('c92c5c6b6d2e32ae'), 'main.js is the audited file');
ok(j.tests && j.tests.exit === 0 && j.tests.passed === j.tests.total && j.tests.total >= 207, `test suite passed before the run (${j.tests?.passed}/${j.tests?.total})`);
ok(j.domain === 'm14' && j.labels === 165, 'domain m14, 165 labels');
const p = j.parameters;
ok(JSON.stringify(p.e6) === JSON.stringify({ trainWorlds: 6, trainDistance: 2, trainEpisodes: 5, testDistance: 4, testEpisodes: 3, cap: 200 }) && p.margin === MARGIN && JSON.stringify(p.sigma) === JSON.stringify(SIGMA) && JSON.stringify(p.arms) === JSON.stringify(ARMS), 'parameters as frozen (E6, SIGMA, margin 9, arms)');
ok(p.adoptedAgent.kind === 'VOL_RHO' && JSON.stringify(p.adoptedAgent.params) === '{"rhoFixed":0.5}', 'the adopted agent is AD-13 (VOL_RHO, rho 1/2)');

// ---- counts and determinism ----
const labels = Array.from({ length: 165 }, (_, i) => `m14schema|gate|${i}`);
ok(j.rows.length === 165 * 4, `660 rows (${j.rows.length})`);
ok(new Set(j.rows.map((r) => `${r.trial}|${r.arm}`)).size === j.rows.length && ARMS.every((a) => j.rows.filter((r) => r.arm === a).length === 165), 'each (label, arm) exactly once');
ok(j.rows.every((r) => labels.includes(r.trial)), 'every label in m14schema|gate|0..164');
ok(sha(JSON.stringify(j.rows)) === j.determinism.rowsSha256RunA && j.determinism.rowsSha256RunA === j.determinism.rowsSha256RunB, 'stored rows hash to run A, and run A = run B');

// ---- own routes ----
function bfs(world, target) { const d = new Array(world.n).fill(-1); d[target] = 0; let f = [target]; while (f.length) { const nx = []; for (const u of f) for (const v of world.adj[u]) if (d[v] < 0) { d[v] = d[u] + 1; nx.push(v); } f = nx; } return d; }
function counts(world, g) { const d = bfs(world, g), c = new Array(world.n).fill(0); c[g] = 1; const order = [...Array(world.n).keys()].filter((i) => d[i] >= 0).sort((a, b) => d[a] - d[b]); for (const u of order) if (u !== g) c[u] = world.adj[u].filter((v) => d[v] === d[u] - 1).reduce((s, v) => s + c[v], 0); return { d, c }; }
function route(label, dist) {
  const w = generateWorld(label), pairs = [];
  for (let g = 0; g < w.n; g++) { const { d, c } = counts(w, g); for (let s = 0; s < w.n; s++) if (d[s] === dist && c[s] === 1) pairs.push([s, g]); }
  const [s, g] = pairs[Math.floor(makeStream(`${label}|route`)() * pairs.length)];
  const { d } = counts(w, g); const r = [s]; let u = s; while (u !== g) { u = w.adj[u].find((v) => d[v] === d[u] - 1); r.push(u); }
  return { w, s, g, r, edges: new Set(w.edges.map(([a, b]) => `${a}-${b}`)) };
}
const isEdge = (R, a, b) => R.edges.has(a < b ? `${a}-${b}` : `${b}-${a}`);
const routes = new Map(labels.map((l) => [l, route(`${l}|test`, 4)]));
let integ = true, passive = true, oracle = true, train = true, schemaOK = true, why = [];
for (const r of j.rows) {
  const R = routes.get(r.trial);
  for (const c of CONDS) {
    const eps = r.tests[c];
    if (!eps || eps.length !== 3) { integ = false; why.push(`${r.trial} ${r.arm} ${c}: episodes`); continue; }
    for (const e of eps) {
      if (e.path[0] !== R.s || e.steps !== e.path.length - 1 || !e.path.every((x, i) => i === 0 || isEdge(R, e.path[i - 1], x)) || (e.done ? e.path.at(-1) !== R.g : e.steps !== CAP)) { integ = false; why.push(`${r.trial} ${r.arm} ${c}`); }
    }
  }
  if (r.arm === 'CONCRETE' && !(JSON.stringify(r.tests.NULL) === JSON.stringify(r.tests.COMPOSE) && JSON.stringify(r.tests.REVERSED) === JSON.stringify(r.tests.COMPOSE))) passive = false;
  if (r.arm === 'ORACLE_SCHEMA' && JSON.stringify(r.tests.COMPOSE[0].path) !== JSON.stringify(R.r)) oracle = false;
  if (r.arm === 'SCHEMA' || r.arm === 'SCHEMA_SHUFFLED') {
    if (!r.training || r.training.length !== 6) train = false;
    else r.training.forEach((t, k) => { const T = route(`${r.trial}|train|${k}`, 2); if (t.world !== `${r.trial}|train|${k}` || t.start !== T.s || t.goal !== T.g || t.steps.length !== 5) train = false; });
    const s = r.schema.snapshot;
    const T = s.avail.map((row, k) => row.map((a, x) => (s.chosen[k][x] + 1) / (a + 2)));
    const rel = T.map((row) => { const top = Math.max(...row), at = row.map((v, x) => (v === top ? x : -1)).filter((x) => x >= 0); return at.length === 1 ? at[0] : null; });
    if (!s.frozen || sha(JSON.stringify(s)) !== r.schema.sha256 || JSON.stringify(rel) !== JSON.stringify(r.schema.relation) || (JSON.stringify(rel) === JSON.stringify(SIGMA)) !== r.schema.relationIsSigma) schemaOK = false;
  }
}
ok(integ, `every test episode: starts at the route start, steps = moves, every move an edge of the test world, ends at the goal or the cap${why.length ? ' — ' + why.slice(0, 3).join('; ') : ''}`);
ok(train, 'every schema arm trained on its six worlds, at the recomputed 2-hop routes, five episodes each');
ok(passive, 'CONCRETE: the three conditions are identical runs in every label');
ok(oracle, 'ORACLE_SCHEMA walks the recomputed route in every label');
ok(schemaOK, 'every schema is frozen, hashes to its recorded SHA-256, and its relation recomputes from its counts');
ok(j.validity.identical && j.validity.testsPassed && j.validity.noExclusions && j.validity.concretePassive === passive && j.validity.oracleFollows === oracle, 'the driver\'s validity parts agree');

// ---- criteria ----
const cell = (arm) => new Map(j.rows.filter((r) => r.arm === arm).map((r) => [r.trial, r]));
const diff = (X, Y, c, e) => { const a = cell(X), b = cell(Y); return labels.map((l) => a.get(l).tests[c][e].steps - b.get(l).tests[c][e].steps); };
const spec = {
  P1: ['CONCRETE', 'SCHEMA', 'COMPOSE', 0], P2: ['SCHEMA_SHUFFLED', 'SCHEMA', 'COMPOSE', 0], S: ['SCHEMA', 'CONCRETE', 'NULL', 0],
  R1: ['SCHEMA', 'CONCRETE', 'REVERSED', 0], R2: ['SCHEMA', 'CONCRETE', 'REVERSED', 2], O: ['SCHEMA', 'ORACLE_SCHEMA', 'COMPOSE', 0],
  H: ['CONCRETE', 'ORACLE_SCHEMA', 'COMPOSE', 0], SH: ['CONCRETE', 'SCHEMA_SHUFFLED', 'COMPOSE', 0], E2: ['CONCRETE', 'SCHEMA', 'COMPOSE', 1], E3: ['CONCRETE', 'SCHEMA', 'COMPOSE', 2],
};
const driverOf = { P1: j.analysis.criteria.P1, P2: j.analysis.criteria.P2, S: j.analysis.criteria.S, R1: j.analysis.secondary.R1_reversedHarm, R2: j.analysis.secondary.R2_reversedThird, O: j.analysis.secondary.O_shortfall, H: j.analysis.secondary.H_oracle, SH: j.analysis.secondary.SH_shuffledVsConcrete, E2: j.analysis.secondary.E2_compose, E3: j.analysis.secondary.E3_compose };
const mine = {}, D = {};
for (const [k, [X, Y, c, e]] of Object.entries(spec)) {
  D[k] = diff(X, Y, c, e);
  mine[k] = pairedBootstrap(D[k], `m14schema|stats|m14|${k}`);
  const d = driverOf[k];
  ok(d && d.n === mine[k].n && Math.abs(d.mean - mine[k].mean) < 1e-12 && d.lo === mine[k].lo && d.hi === mine[k].hi, `${k}: ${mine[k].mean.toFixed(3)} [${mine[k].lo.toFixed(3)}, ${mine[k].hi.toFixed(3)}] n=${mine[k].n} matches the driver`);
}
const lb = (c) => c.n > 0 && c.mean > 0 && c.lo > 0;
const shape = (d) => { const s = [...d].sort((a, b) => b - a), top = Math.ceil(0.1 * d.length), inF = d.filter((x) => x > 0).length, ag = d.filter((x) => x < 0).length; const bad = !(inF > ag) || !(median(d) > 0) || !(mean(s.slice(top)) > 0); return { inF, ag, ties: d.length - inF - ag, median: median(d), topShare: sum(d) ? sum(s.slice(0, top)) / sum(d) : null, meanWithoutTop: mean(s.slice(top)), tail: bad }; };
const g = shape(D.P1);
ok((g.tail ? 'TAIL' : 'CONSISTENT') === (j.analysis.gainShapeP1.reading.startsWith('TAIL') ? 'TAIL' : 'CONSISTENT'), `gainShape P1 recomputed: ${g.tail ? 'TAIL-DRIVEN' : 'CONSISTENT'}`);
const valid = passive && oracle && j.validity.identical && j.validity.testsPassed && j.validity.noExclusions;
const transfer = lb(mine.P1) && lb(mine.P2) ? 'SHOWN' : lb(mine.P1) ? 'NOT ATTRIBUTABLE TO THE RELATION' : mine.P1.hi < 0 ? 'REVERSED' : 'NOT SHOWN';
const lines = { validity: valid ? 'VALID' : 'INVALID', transfer, relationalContent: lb(mine.P2) ? 'SHOWN' : 'NOT SHOWN', safety: mine.S.hi < MARGIN ? 'SAFE' : 'NOT SHOWN SAFE', reversal: lb(mine.R1) ? 'MISLED WHEN REVERSED' : 'NOT SHOWN' };
const summary = !valid ? 'INVALID — NO CRITERION IS INTERPRETED' : transfer === 'SHOWN' ? `LEARNED RELATIONAL SCHEMA TRANSFERS TO UNSEEN COMBINATIONS${lines.safety === 'SAFE' ? ', WITHIN THE SAFETY MARGIN' : '; SAFETY NOT SHOWN'}${g.tail ? ' — FROM A MINORITY OF LABELS' : ''}` : transfer === 'NOT ATTRIBUTABLE TO THE RELATION' ? 'A BENEFIT IS SHOWN, BUT NOT ATTRIBUTABLE TO THE LEARNED RELATION' : `TRANSFER ${transfer}`;
ok(JSON.stringify({ ...lines, validity: lines.validity }) === JSON.stringify({ ...j.reading.lines, validity: j.reading.lines.validity.split(' ')[0] }), `lines recomputed: ${JSON.stringify(lines)}`);
ok(summary === j.reading.summary, `summary recomputed: ${summary}`);

// ---- report ----
console.log('\ncontrasts (mean [lo, hi], n; sd; median; +/-/0):');
for (const k of Object.keys(spec)) console.log(`  ${k.padEnd(3)} ${spec[k].slice(0, 2).join(' - ').padEnd(30)} ${spec[k][2].padEnd(8)} ep ${spec[k][3] + 1}: ${mine[k].mean.toFixed(3)} [${mine[k].lo.toFixed(3)}, ${mine[k].hi.toFixed(3)}], n ${mine[k].n}; sd ${sd(D[k]).toFixed(3)}; median ${median(D[k])}; ${D[k].filter((x) => x > 0).length}/${D[k].filter((x) => x < 0).length}/${D[k].filter((x) => x === 0).length}`);
console.log(`  P1 gainShape: ${JSON.stringify(g)}`);
console.log('\nmean steps per arm, condition and test episode (capped episodes):');
for (const a of ARMS) for (const c of CONDS) { const rs = [...cell(a).values()]; console.log(`  ${a.padEnd(16)} ${c.padEnd(8)} ${[0, 1, 2].map((e) => `${mean(rs.map((r) => r.tests[c][e].steps)).toFixed(2)} (${rs.filter((r) => !r.tests[c][e].done).length})`).join('  ')}`); }
for (const a of ['SCHEMA', 'SCHEMA_SHUFFLED']) { const rs = [...cell(a).values()]; console.log(`  ${a}: learned relation = SIGMA in ${rs.filter((r) => r.schema.relationIsSigma).length} of 165; links right per label ${mean(rs.map((r) => r.schema.relation.filter((x, k) => x === SIGMA[k]).length)).toFixed(2)}; training steps per label ${mean(rs.map((r) => sum(r.training.map((t) => sum(t.steps))))).toFixed(1)}`); }
console.log('\nillustration (m14schema|gate|0, first COMPOSE episode):');
const R0 = routes.get('m14schema|gate|0');
console.log(`  route ${R0.r.join('>')}`);
for (const a of ARMS) { const r = cell(a).get('m14schema|gate|0'); console.log(`  ${a.padEnd(16)} ${r.tests.COMPOSE[0].steps} steps: ${r.tests.COMPOSE[0].path.join('>')}${r.schema ? `  relation ${JSON.stringify(r.schema.relation)}` : ''}`); }
console.log(`\n${fails.length ? `${fails.length} FAILURES` : 'all checks pass'}`);
console.log(`git status of the repository: ${git('status', '--porcelain') || '(clean)'}`);
