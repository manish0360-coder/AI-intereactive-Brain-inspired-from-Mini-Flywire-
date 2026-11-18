// Independent check of experiments/m13_generalization/results/m13_result.json, written BEFORE the result was seen
// (2026-11-18, while the single run was in progress). It recomputes, with its own code, provenance, counts, every
// criterion and its bootstrap interval, the five verdict lines and the summary statement (SPEC.md "Verdict"),
// gainShape, the attribution (SPEC.md "Attribution"), G1's standardized effect and the detour-excess moderator.
// Shared with the driver: only pairedBootstrap (so that the interval seeds can be reproduced exactly) and planE5
// (the schedule; it reads only the graph).
// Illustration rule, fixed here before the result: label m13|modular|0, family OFTEN, the first reversing event whose
// edge BELIEF tried while it was blocked (in BELIEF's trace); for both core arms, the predicted chance the exit works
// at the first blocked try, just before the reopening and at the reopening, and the step of the first crossing after
// the reopening. If BELIEF met no reversing event there, the next traced label (1, then 2) is used.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const ROOT = process.argv[2];
const imp = (p) => import(pathToFileURL(path.join(ROOT, p)).href);
const { pairedBootstrap } = await imp('cognitive/testbed/stats.mjs');
const { planE5 } = await imp('cognitive/testbed/task_e5.mjs');
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const git = (...a) => execFileSync('git', ['-C', ROOT, ...a]).toString().trim();
const fails = [];
const ok = (cond, msg) => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}`); if (!cond) fails.push(msg); };
const HERE = path.join(ROOT, 'experiments/m13_generalization');
const file = path.join(HERE, 'results/m13_result.json');
const raw = fs.readFileSync(file);
const j = JSON.parse(raw);
console.log(`result file sha256 ${sha(raw)}  (${raw.length} bytes)`);
const F = ['RARE', 'HALF', 'OFTEN'], ARMS = ['BELIEF', 'MBVI3', 'BELIEF_REALONLY', 'BELIEF_FALSEONLY'];
const sum = (xs) => xs.reduce((a, b) => a + b, 0), mean = (xs) => sum(xs) / xs.length;
const sd = (xs) => { const m = mean(xs); return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1)); };
const median = (xs) => { const s = [...xs].sort((a, b) => a - b), n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };

// ---- provenance ----
const frozen = Object.fromEntries(fs.readFileSync(path.join(HERE, 'SPEC.sha256'), 'utf8').trim().split(/\r?\n/).map((l) => l.trim().split(/\s+/)).map(([h, n]) => [n, h]));
ok(j.specSha256 === sha(fs.readFileSync(path.join(HERE, 'SPEC.md'))) && j.specSha256 === frozen['SPEC.md'], `SPEC.md hash ${j.specSha256?.slice(0, 8)} = file = SPEC.sha256`);
ok(j.pinsSha256 === sha(fs.readFileSync(path.join(HERE, 'PINS.json'))) && j.pinsSha256 === frozen['PINS.json'], 'PINS.json hash = file = SPEC.sha256');
ok(j.worlds.bankSha256 === sha(fs.readFileSync(path.join(HERE, 'graph_bank.json'))) && j.worlds.bankSha256 === frozen['graph_bank.json'], 'graph bank hash = file = SPEC.sha256');
ok(JSON.stringify(j.structure) === JSON.stringify(JSON.parse(fs.readFileSync(path.join(HERE, 'structure.json'), 'utf8'))) && sha(fs.readFileSync(path.join(HERE, 'structure.json'))) === frozen['structure.json'], 'structure record = structure.json = SPEC.sha256');
ok(j.headAtLaunch === j.headAtEnd && j.headAtLaunch.startsWith('8619d71'), `HEAD 8619d71 at launch and end (${j.headAtLaunch.slice(0, 7)}, ${j.headAtEnd.slice(0, 7)})`);
ok(j.appFiles['main.js'].startsWith('c92c5c6b6d2e32ae'), 'main.js is the audited file');
ok(j.tests && j.tests.exit === 0 && j.tests.passed === j.tests.total && j.tests.total >= 195, `test suite passed before the run (${j.tests?.passed}/${j.tests?.total})`);
ok(j.domain === 'm13' && j.labels === 165, 'domain m13, 165 labels');
ok(j.structure.novelty.holds === true && j.structure.novelty.bankClusteringP05 > j.structure.novelty.devClusteringP95, 'novelty check holds');
const A = j.parameters.arms;
ok(A.BELIEF.kind === 'VOL_RHO' && JSON.stringify(A.BELIEF.params) === '{"rhoFixed":0.5}' && JSON.stringify(A.BELIEF_REALONLY.params) === '{"rhoFixed":0.5}' && JSON.stringify(A.BELIEF_FALSEONLY.params) === '{"rhoFixed":0.5}' && A.MBVI3.kind === 'MBVI3' && JSON.stringify(A.MBVI3.params) === '{}', 'arms as specified (AD-13 parameters; MBVI3 baseline)');

// ---- counts and determinism ----
ok(j.rows.length === 165 * 3 * 4, `1,980 rows (${j.rows.length})`);
const key = (r) => `${r.world}|${r.family}|${r.arm}`;
ok(new Set(j.rows.map(key)).size === j.rows.length && ARMS.every((a) => j.rows.filter((r) => r.arm === a).length === 495), 'each (label, family, arm) exactly once');
ok(j.rows.every((r) => r.world.startsWith('m13|modular|')), 'every label in m13|modular|*');
const excluded = j.rows.filter((r) => r.excluded).length;
ok(excluded === 0 && j.validity.noExclusions === true && j.validity.excludedPairs === 0, `no exclusion (${excluded})`);
const core = j.rows.filter((r) => r.arm === 'BELIEF' || r.arm === 'MBVI3');
ok(j.determinism.identical && sha(JSON.stringify(core)) === j.determinism.rowsSha256RunA && j.determinism.rowsSha256RunA === j.determinism.rowsSha256RunB, 'core rows of run A hash to the recorded hash, identical to run B');
ok(j.traces.length === 18, `18 traces (${j.traces.length})`);
for (const t of j.traces) ok(t.steps.every(([, , , moved, blocked]) => !(moved && blocked)), `trace ${t.world.split('|')[2]} ${t.family} ${t.arm}: no blocked step moved (${t.steps.length} steps)`);
// measures: internal consistency and agreement with the task's own counts
let mOk = true;
for (const r of j.rows) {
  const m = r.m13, rev = m.events.filter((e) => e.reverses);
  if (!(m.metAndReturned <= m.met && m.met <= rev.length && m.returnedOwn + m.returnedOnlyLater <= rev.length)) mOk = false;
  for (const e of m.events) { const ev = r.events[e.k]; if (ev.ownAfterAttempts !== e.attemptsOwn || (e.reverses && ev.crossed !== e.crossedOwn)) mOk = false; }
  if (m.met !== rev.filter((e) => e.met).length || m.metAndReturned !== rev.filter((e) => e.met && (e.crossedOwn + e.crossedLater) > 0).length) mOk = false;
}
ok(mOk, 'behaviour measures consistent in every row and equal to the task\'s own counts');

// ---- criteria, recomputed ----
const cell = (f, arm) => new Map(j.rows.filter((r) => r.family === f && r.arm === arm).map((r) => [r.world, r]));
const labelsOf = (f) => [...cell(f, 'BELIEF').keys()].sort();
const pair = (f, X, Y, g) => { const a = cell(f, X), b = cell(f, Y); return labelsOf(f).map((w) => g(a.get(w)) - g(b.get(w))); };
const mixLabels = labelsOf('RARE');
const g1 = mixLabels.map((w) => F.reduce((s, f) => s + (cell(f, 'MBVI3').get(w).metric - cell(f, 'BELIEF').get(w).metric), 0));
const g2 = pair('RARE', 'BELIEF', 'MBVI3', (r) => r.metric);
const g3 = pair('OFTEN', 'MBVI3', 'BELIEF', (r) => r.windows.afterReversed);
const g4 = pair('OFTEN', 'BELIEF', 'MBVI3', (r) => r.m13.metAndReturned);
const crit = {
  G1_mix: pairedBootstrap(g1, 'm13|stats|m13|G1|mix'), G2_RARE_cost: pairedBootstrap(g2, 'm13|stats|m13|RARE|cost'),
  G3_OFTEN_afterReversed: pairedBootstrap(g3, 'm13|stats|m13|G3|OFTEN|afterReversed'), G4_OFTEN_metAndReturned: pairedBootstrap(g4, 'm13|stats|m13|OFTEN|metAndReturned'),
};
const same = (a, b) => a && b && a.n === b.n && Math.abs(a.mean - b.mean) < 1e-9 && a.lo === b.lo && a.hi === b.hi;
for (const [k, c] of Object.entries(crit)) ok(same(c, j.analysis.criteria[k]), `${k}: ${c.mean.toFixed(3)} [${c.lo.toFixed(3)}, ${c.hi.toFixed(3)}] n=${c.n} matches the driver`);

// ---- verdict lines and summary (SPEC.md "Verdict"), own implementation ----
const holds = (c) => c.n > 0 && c.mean > 0 && c.lo > 0;
const g0 = j.validity.identical && j.validity.testsPassed && j.validity.novelty && j.validity.noExclusions && mOk;
const shape = (d) => { const s = [...d].sort((a, b) => b - a), top = Math.ceil(0.1 * d.length), why = []; const inF = d.filter((x) => x > 0).length, ag = d.filter((x) => x < 0).length; if (!(inF > ag)) why.push('favour'); if (!(median(d) > 0)) why.push('median'); if (!(mean(s.slice(top)) > 0)) why.push('top'); return { inFavour: inF, against: ag, ties: d.length - inF - ag, median: median(d), topShare: sum(s.slice(0, top)) / sum(d), meanWithoutTop: mean(s.slice(top)), tail: why.length > 0, why }; };
const sh = { G1: shape(g1), G3: shape(g3) };
const lines = {
  validity: g0 ? 'VALID' : 'INVALID',
  netAdvantage: holds(crit.G1_mix) ? 'RETAINED' : crit.G1_mix.hi < 0 ? 'REVERSED' : 'NOT SHOWN',
  safety: crit.G2_RARE_cost.hi < 25 ? 'SAFE' : 'NOT SHOWN SAFE',
  recovery: holds(crit.G3_OFTEN_afterReversed) ? 'SHOWN' : 'NOT SHOWN',
  behaviouralMechanism: holds(crit.G4_OFTEN_metAndReturned) ? 'SHOWN' : 'NOT SHOWN',
};
const summary = !g0 ? 'INVALID — NO CRITERION IS INTERPRETED'
  : lines.netAdvantage === 'RETAINED' ? `NET ADVANTAGE RETAINED ON THE MODULAR FAMILY${lines.safety === 'SAFE' ? ', WITHIN THE SAFETY MARGIN' : '; SAFETY NOT SHOWN'}${sh.G1.tail ? ' — FROM A MINORITY OF LABELS' : ''}`
  : `NET ADVANTAGE ${lines.netAdvantage} ON THE MODULAR FAMILY`;
ok(JSON.stringify({ ...lines, validity: lines.validity.split(' ')[0] }) === JSON.stringify({ ...j.reading.lines, validity: j.reading.lines.validity.split(' ')[0] }), `lines recomputed: ${JSON.stringify(lines)}`);
ok(summary === j.reading.summary, `summary recomputed: ${summary}`);
ok((sh.G1.tail ? 'TAIL' : 'CONSISTENT') === (j.reading.gainShape.G1_mix.startsWith('TAIL') ? 'TAIL' : 'CONSISTENT') && (sh.G3.tail ? 'TAIL' : 'CONSISTENT') === (j.reading.gainShape.G3_OFTEN_afterReversed.startsWith('TAIL') ? 'TAIL' : 'CONSISTENT'), `gainShape recomputed: G1 ${sh.G1.tail ? 'TAIL-DRIVEN' : 'CONSISTENT'}, G3 ${sh.G3.tail ? 'TAIL-DRIVEN' : 'CONSISTENT'}`);

// ---- attribution (SPEC.md "Attribution"), own implementation ----
const mixOf = (arm) => mixLabels.map((w) => F.reduce((s, f) => s + (cell(f, 'MBVI3').get(w).metric - cell(f, arm).get(w).metric), 0));
const At = {
  A1: pairedBootstrap(pair('OFTEN', 'MBVI3', 'BELIEF_REALONLY', (r) => r.metric), 'm13|stats|m13|attr|OFTEN|real'),
  A2: pairedBootstrap(pair('OFTEN', 'MBVI3', 'BELIEF_REALONLY', (r) => r.windows.afterReversed), 'm13|stats|m13|attr|OFTEN|realAfter'),
  A3: pairedBootstrap(pair('OFTEN', 'MBVI3', 'BELIEF_FALSEONLY', (r) => r.metric), 'm13|stats|m13|attr|OFTEN|false'),
  A4: pairedBootstrap(mixOf('BELIEF_REALONLY'), 'm13|stats|m13|attr|mix|real'),
  A5: pairedBootstrap(mixOf('BELIEF_FALSEONLY'), 'm13|stats|m13|attr|mix|false'),
};
const D = j.analysis.secondary.attribution;
ok(same(At.A1, D.OFTEN.genuineChanges) && same(At.A2, D.OFTEN.genuineAfterReversed) && same(At.A3, D.OFTEN.falseAlarms) && same(At.A4, D.mix.genuineChanges) && same(At.A5, D.mix.falseAlarms), 'attribution contrasts A1-A5 match the driver');
const exact = j.rows.filter((r) => r.arm === 'BELIEF_REALONLY').every((r) => r.diagnostics.alarms.opensFalse === 0) && j.rows.filter((r) => r.arm === 'BELIEF_FALSEONLY').every((r) => r.diagnostics.alarms.opensReal === 0);
const lab = (gen, fal) => (!exact ? 'INVALID (the diagnostic split is not exact)' : gen && fal ? 'GENUINE REVERSALS AND FALSE-ALARM REPAIR' : gen ? 'GENUINE REVERSALS' : fal ? 'FALSE-ALARM REPAIR' : 'NOT ATTRIBUTED');
const src = lab(holds(At.A1) && holds(At.A2), holds(At.A3)), srcMix = lab(holds(At.A4), holds(At.A5));
ok(exact === D.splitExact && src === D.gainSource && srcMix === D.gainSourceMix, `attribution recomputed: split exact ${exact}; OFTEN ${src}; mix ${srcMix}`);

// ---- standardized effect and moderator ----
ok(Math.abs(mean(g1) / sd(g1) - j.analysis.secondary.standardizedEffectG1.value) < 1e-9, `G1 standardized effect ${(mean(g1) / sd(g1)).toFixed(4)} matches`);
const bank = JSON.parse(fs.readFileSync(path.join(HERE, 'graph_bank.json'), 'utf8'));
const bfs = (n, adj, t, cut) => { const d = new Array(n).fill(-1); d[t] = 0; let fr = [t]; while (fr.length) { const nx = []; for (const u of fr) for (const v of adj[u]) { const k = u < v ? `${u}-${v}` : `${v}-${u}`; if (d[v] < 0 && !cut.has(k)) { d[v] = d[u] + 1; nx.push(v); } } fr = nx; } return d; };
const { buildWorld } = await imp('experiments/m13_generalization/worlds_modular.mjs');
const mod = {};
for (const f of F) {
  const G = { 'excess 0': [], 'excess 1-3': [], 'excess 4+': [] }, B = cell(f, 'BELIEF'), M = cell(f, 'MBVI3');
  for (const g of bank.graphs) {
    const adj = Array.from({ length: g.n }, () => []); for (const [u, v] of g.edges) { adj[u].push(v); adj[v].push(u); }
    const p = planE5(buildWorld(g.label, g.n, g.edges), g.label, f), perm = new Set();
    p.events.forEach((e, k) => {
      if (e.skipped) return;
      const kk = e.edge[0] < e.edge[1] ? `${e.edge[0]}-${e.edge[1]}` : `${e.edge[1]}-${e.edge[0]}`;
      const x = bfs(g.n, adj, p.goal, new Set([...perm, kk]))[p.start] - bfs(g.n, adj, p.goal, perm)[p.start];
      if (!e.reverses) perm.add(kk);
      else G[x === 0 ? 'excess 0' : x >= 4 ? 'excess 4+' : 'excess 1-3'].push(M.get(g.label).events[k].after - B.get(g.label).events[k].after);
    });
  }
  mod[f] = Object.fromEntries(Object.entries(G).map(([k, d]) => [k, { events: d.length, meanAfterDifference: d.length ? mean(d) : null }]));
}
const dm = j.analysis.secondary.moderatorDetourExcess;
ok(F.every((f) => Object.keys(mod[f]).every((k) => mod[f][k].events === dm[f][k].events && (mod[f][k].meanAfterDifference === null ? dm[f][k].meanAfterDifference === null : Math.abs(mod[f][k].meanAfterDifference - dm[f][k].meanAfterDifference) < 1e-9))), 'moderator recomputed with own BFS');

// ---- illustration (rule fixed above) ----
console.log('\nillustration:');
for (const L of ['m13|modular|0', 'm13|modular|1', 'm13|modular|2']) {
  const tb = j.traces.find((t) => t.world === L && t.family === 'OFTEN' && t.arm === 'BELIEF'), tm = j.traces.find((t) => t.world === L && t.family === 'OFTEN' && t.arm === 'MBVI3');
  const rb = cell('OFTEN', 'BELIEF').get(L), rm = cell('OFTEN', 'MBVI3').get(L);
  const ev = rb.m13.events.find((e) => e.reverses && e.met);
  if (!ev) { console.log(`  ${L}: BELIEF met no reversing event; next label`); continue; }
  const edge = tb.schedule[ev.k].edge, sameEdge = (f) => (f.from === edge[0] && f.to === edge[1]) || (f.from === edge[1] && f.to === edge[0]);
  console.log(`  ${L} OFTEN, event ${ev.k + 1}, edge ${edge.join('-')}: BELIEF delay ${ev.delay}; MBVI3 met ${rm.m13.events.find((e) => e.k === ev.k).met}, delay ${rm.m13.events.find((e) => e.k === ev.k).delay}`);
  for (const t of [tb, tm]) for (const f of t.followed.filter(sameEdge)) {
    const pts = f.points, first = pts.find((p) => p[2] === 1 && p[3] === 1), ri = pts.findIndex((p, i) => i > 0 && pts[i - 1][2] === 1 && p[2] === 0);
    console.log(`    ${t.arm} ${f.from}->${f.to}: first blocked try t=${first?.[0]} p=${first?.[1]}; just before reopening p=${ri > 0 ? pts[ri - 1][1] : '-'}; at reopening t=${ri >= 0 ? pts[ri][0] : '-'} p=${ri >= 0 ? pts[ri][1] : '-'}; tries after reopening ${ri >= 0 ? pts.filter((p) => p[0] >= pts[ri][0] && p[3] === 1).length : '-'}`);
  }
  break;
}

// ---- summaries for the record ----
console.log('\ncriteria (mean [lo, hi], n; sd; median; +/-/0):');
for (const [k, d] of [['G1_mix', g1], ['G2_RARE_cost', g2], ['G3_OFTEN_afterReversed', g3], ['G4_OFTEN_metAndReturned', g4]]) { const c = crit[k]; console.log(`  ${k.padEnd(24)} ${c.mean.toFixed(3)} [${c.lo.toFixed(3)}, ${c.hi.toFixed(3)}], n ${c.n}; sd ${sd(d).toFixed(3)}; median ${median(d)}; ${d.filter((x) => x > 0).length}/${d.filter((x) => x < 0).length}/${d.filter((x) => x === 0).length}`); }
console.log(`  G4 minimum detectable effect (80%): ${(2.801585 * sd(g4) / Math.sqrt(g4.length)).toFixed(3)}`);
console.log(`  gainShape G1 ${JSON.stringify(sh.G1)}; G3 ${JSON.stringify(sh.G3)}`);
console.log(`  standardized G1 ${(mean(g1) / sd(g1)).toFixed(4)} (CF-06 0.444, M11 0.498)`);
console.log('attribution:'); for (const [k, c] of Object.entries(At)) console.log(`  ${k} ${c.mean.toFixed(3)} [${c.lo.toFixed(3)}, ${c.hi.toFixed(3)}]`);
console.log(`  OFTEN ${src}; mix ${srcMix}; split exact ${exact}`);
console.log('moderator:', JSON.stringify(mod));
console.log('\nper family:');
for (const f of F) {
  const fa = j.analysis.families[f];
  console.log(`  ${f}: arms ${JSON.stringify(Object.fromEntries(Object.entries(fa.arms).map(([a, v]) => [a, Object.fromEntries(Object.entries(v).map(([k, x]) => [k, typeof x === 'number' ? +x.toFixed(3) : x]))])))}`);
  console.log(`     contrasts ${JSON.stringify(Object.fromEntries(Object.entries(fa.contrasts).map(([k, c]) => [k, [+c.mean.toFixed(3), +c.lo.toFixed(3), +c.hi.toFixed(3), c.positive, c.negative, c.zero]])))}`);
  console.log(`     belief archives ${JSON.stringify(Object.fromEntries(Object.entries(fa.beliefArchivesPerRun).map(([k, x]) => [k, +x.toFixed(3)])))}`);
}
console.log(`\nresources: ${JSON.stringify(j.resources)}`);
console.log(`\n${fails.length ? `FAILURES: ${fails.length}` : 'all checks pass'}`);
console.log('git status of the repository:', git('status', '--porcelain') || '(clean)');
