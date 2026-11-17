// Independent check of experiments/m11_routes/results/m11_result.json, written BEFORE the result was seen.
// Recomputes provenance, counts, every contrast mean and bootstrap interval, and the reading, from the raw rows with
// its own code (only pairedBootstrap is shared, so the interval seeds can be reproduced exactly).
// Illustration rule, fixed here before the result: in OFTEN, label mfw|m11|0, the FIRST reversing event of the
// schedule; for each arm, the time from the reopening to the first successful crossing of that edge.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const ROOT = process.argv[2];
const { pairedBootstrap } = await import(pathToFileURL(path.join(ROOT, 'cognitive/testbed/stats.mjs')).href);
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const git = (...a) => execFileSync('git', ['-C', ROOT, ...a]).toString().trim();
const fails = [];
const ok = (cond, msg) => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}`); if (!cond) fails.push(msg); };

const file = path.join(ROOT, 'experiments/m11_routes/results/m11_result.json');
const raw = fs.readFileSync(file);
const j = JSON.parse(raw);
console.log(`result file sha256 ${sha(raw)}  (${raw.length} bytes)`);

// ---- provenance ----
const specSha = sha(fs.readFileSync(path.join(ROOT, 'experiments/m11_routes/SPEC.md')));
ok(j.specSha256 === specSha && fs.readFileSync(path.join(ROOT, 'experiments/m11_routes/SPEC.sha256'), 'utf8').startsWith(specSha), `spec hash ${specSha.slice(0, 8)} matches SPEC.sha256 and the result`);
ok(j.headAtLaunch === j.headAtEnd && j.headAtLaunch.startsWith('a3cccd5'), `HEAD a3cccd5 at launch and end (${j.headAtLaunch.slice(0, 7)}, ${j.headAtEnd.slice(0, 7)})`);
ok(j.appFiles['main.js'].startsWith('c92c5c6b6d2e32ae'), 'main.js is the audited file');
ok(j.determinism.identical && j.determinism.rowsSha256RunA === j.determinism.rowsSha256RunB, 'run A (traced) and run B (untraced) rows identical');
ok(sha(JSON.stringify(j.rows)) === j.determinism.rowsSha256RunA, 'stored rows hash to run A');
ok(j.domain === 'm11' && j.labels === 135, 'domain m11, 135 labels');
ok(JSON.stringify(j.parameters.arms.BELIEF) === JSON.stringify({ kind: 'VOL_RHO', params: { rhoFixed: 0.5 }, decision: 'AD-13' }), 'BELIEF is the AD-13 definition');

// ---- counts ----
const F = ['RARE', 'HALF', 'OFTEN'];
ok(j.rows.length === 135 * 3 * 2, `810 rows (${j.rows.length})`);
const excluded = j.rows.filter((r) => r.excluded);
console.log(`excluded rows ${excluded.length}`);
const skipped = Object.fromEntries(F.map((f) => [f, j.rows.filter((r) => r.family === f && r.arm === 'BELIEF' && !r.excluded).reduce((s, r) => s + r.skippedEvents, 0)]));
console.log('skipped events (per arm) by family', JSON.stringify(skipped));
ok(j.traces.length === 18, `18 traces (${j.traces.length})`);

// ---- recompute contrasts with own code ----
const val = {
  total: (r) => r.metric, blocked: (r) => r.windows.blocked, afterReversed: (r) => r.windows.afterReversed,
  afterPermanent: (r) => r.windows.afterPermanent, futileRetests: (r) => r.diagnostics.futileRetests,
  crossings: (r) => { let s = 0; for (const e of r.events) if (!e.skipped && e.reverses) s += e.crossed; return s; },
};
const defs = { total: ['total', -1], cost: ['total', 1], blocked: ['blocked', -1], afterReversed: ['afterReversed', -1], afterPermanent: ['afterPermanent', -1], crossings: ['crossings', 1], futileRetests: ['futileRetests', 1] };
const recomputed = {};
for (const f of F) {
  const B = new Map(), M = new Map();
  for (const r of j.rows) if (r.family === f && !r.excluded) (r.arm === 'BELIEF' ? B : M).set(r.world, r);
  const labels = [...B.keys()].filter((w) => M.has(w)).sort();
  recomputed[f] = {};
  for (const [name, [m, sign]] of Object.entries(defs)) {
    const d = labels.map((w) => sign * (val[m](B.get(w)) - val[m](M.get(w))));
    const bs = pairedBootstrap(d, `mfw|stats|m11|m11|${f}|${name}`);
    const a = j.analysis.families[f].contrasts[name];
    const same = Math.abs(bs.mean - a.mean) < 1e-9 && bs.lo === a.lo && bs.hi === a.hi && bs.n === a.n;
    ok(same, `${f} ${name}: ${bs.mean.toFixed(2)} [${bs.lo.toFixed(2)}, ${bs.hi.toFixed(2)}] n=${bs.n} matches the driver`);
    recomputed[f][name] = { ...bs, pos: d.filter((x) => x > 0).length, neg: d.filter((x) => x < 0).length, zero: d.filter((x) => x === 0).length, median: [...d].sort((x, y) => x - y)[Math.floor(d.length / 2)] };
  }
}
const D1 = recomputed.OFTEN.afterReversed.mean > 0 && recomputed.OFTEN.afterReversed.lo > 0;
const D2 = recomputed.RARE.cost.hi < 25;
const D3 = recomputed.OFTEN.crossings.mean > 0 && recomputed.OFTEN.crossings.lo > 0;
const reading = D1 && D2 && D3 ? 'DEMONSTRATED ON THE MINIFLYWIRE GRAPH' : `NOT DEMONSTRATED (${[['D1_recovery', D1], ['D2_cost', D2], ['D3_mechanism', D3]].filter(([, v]) => !v).map(([k]) => k).join(', ')})`;
ok(reading === j.reading.reading && D1 === j.reading.D1_recovery && D2 === j.reading.D2_cost && D3 === j.reading.D3_mechanism, `reading recomputed: ${reading}`);

// ---- traces ----
for (const t of j.traces) {
  ok(t.steps.every(([, , , moved, blocked]) => !(moved && blocked)), `trace ${t.world} ${t.family} ${t.arm}: no blocked step moved (${t.steps.length} steps, ${t.followed.length} followed exits)`);
}

// ---- illustration (rule fixed above) ----
const pick = (arm) => j.traces.find((t) => t.world === 'mfw|m11|0' && t.family === 'OFTEN' && t.arm === arm);
const tb = pick('BELIEF'), tm = pick('MBVI3');
const ev = tb.schedule.find((e) => !e.skipped && e.reverses);
console.log('\nillustration: OFTEN mfw|m11|0, first reversing event, edge', JSON.stringify(ev?.edge ?? null));
const sameEdge = (f) => ev && ((f.from === ev.edge[0] && f.to === ev.edge[1]) || (f.from === ev.edge[1] && f.to === ev.edge[0]));
for (const t of [tb, tm]) {
  const fol = t.followed.filter(sameEdge);
  console.log(`  ${t.arm}: followed directions ${fol.length}`);
  for (const f of fol) {
    const pts = f.points;
    const firstBlockedTry = pts.find((p) => p[2] === 1 && p[3] === 1);
    const reopenIdx = pts.findIndex((p, i) => i > 0 && pts[i - 1][2] === 1 && p[2] === 0);
    const reopen = reopenIdx >= 0 ? pts[reopenIdx] : null;
    const blockedTries = pts.filter((p) => p[2] === 1 && p[3] === 1).length;
    const beforeReopen = reopenIdx > 0 ? pts[reopenIdx - 1] : null;
    let firstCross = null;
    if (reopen) for (const s of t.steps) if (s[0] >= reopen[0] && s[1] === f.from && s[2] === f.to && s[3] === 1) { firstCross = s; break; }
    const triesAfter = reopen ? pts.filter((p) => p[0] >= reopen[0] && p[3] === 1).length : null;
    console.log(`    ${f.fromLabel} -> ${f.toLabel}: first blocked try t=${firstBlockedTry?.[0]} p=${firstBlockedTry?.[1]}; tries while blocked ${blockedTries}; p just before reopening ${beforeReopen?.[1]} (t=${beforeReopen?.[0]}); reopened at t=${reopen?.[0]} p=${reopen?.[1]}; first crossing after reopening t=${firstCross?.[0] ?? 'none'} (${firstCross && reopen ? firstCross[0] - reopen[0] : '-'} steps later); tries after reopening ${triesAfter}`);
  }
  if (t.beliefEvents) console.log(`    belief events on this edge: ${JSON.stringify(t.beliefEvents.filter((e) => ev && ((e.edge[0] === ev.edge[0] && e.edge[1] === ev.edge[1]) || (e.edge[0] === ev.edge[1] && e.edge[1] === ev.edge[0]))))}`);
}

// ---- summary for the record ----
console.log('\nper family, arm means:');
for (const f of F) console.log(f, JSON.stringify(j.analysis.families[f].arms), 'belief archives', JSON.stringify(j.analysis.families[f].beliefArchivesPerRun));
console.log('\ncontrasts (mean [lo, hi]; median; +/-/0):');
for (const f of F) for (const [k, c] of Object.entries(recomputed[f])) console.log(`${f.padEnd(5)} ${k.padEnd(15)} ${c.mean.toFixed(2)} [${c.lo.toFixed(2)}, ${c.hi.toFixed(2)}]; median ${c.median}; ${c.pos}/${c.neg}/${c.zero}`);
console.log(`\nresources: ${JSON.stringify(j.resources)}`);
console.log(`\n${fails.length ? `FAILURES: ${fails.length}` : 'all checks pass'}`);
console.log('git status of the repository:', git('status', '--porcelain') || '(clean except the result)');
