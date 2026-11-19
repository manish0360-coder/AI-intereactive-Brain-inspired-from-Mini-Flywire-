// Independent check of experiments/m15_uncertainty/results/m15_result.json, written BEFORE the result existed
// (2026-11-19, after the freeze commit 77edfe7 and before the run).
//   node experiments/m15_uncertainty/results/check/verify_m15.mjs <repo root> [--result <file>] [--rehearsal]
// It recomputes, with its own code:
//   provenance (the frozen hashes, PINS, HEAD, main.js, the tests, the parameters against SPEC.md and the admission
//   record); the labels (fresh, numeric order, the switch points); determinism; the closed-loop rows (lengths, step
//   ranges, capped episodes, ORACLE on the route, CONCRETE's passivity, V-REV, the first-world identity); the passive
//   replay from scratch (its own condition sequences, theta*, observation unit, FREQ / NEWEST / WINDOW / BOCPD beliefs,
//   probe draws, exact and probe scores, ECE bins, AUROC, detection); every criterion with its interval (its own
//   cluster bootstrap; pairedBootstrap is shared so the seeds reproduce); BT-COND with its classification; the BT
//   block of the four sensitivity arms; the verdict lines and the statement (SPEC.md "Verdict").
// Shared with the driver: the generator and task E7 (planSequence: the worlds, routes and kinds), makeStream and
// pairedBootstrap. Nothing is imported from m15_lib.mjs, m15_analysis.mjs or the belief module.
// --rehearsal: for a result built on smoke labels (results/check/rehearse_m15.mjs); it relaxes only the label
// namespace, the label count and the suite record, and says so.
// Illustration rule, fixed before the result: label 0's switch point, UA's route-stream detection delays, and the
// mean steps per arm in each behaviour window over all labels.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const ROOT = path.resolve(process.argv[2] ?? '.');
const argOf = (n) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const REHEARSAL = process.argv.includes('--rehearsal');
const imp = (p) => import(pathToFileURL(path.join(ROOT, p)).href);
const { pairedBootstrap } = await imp('cognitive/testbed/stats.mjs');
const { makeStream } = await imp('cognitive/testbed/rng.mjs');
const { planSequence } = await imp('cognitive/testbed/task_e7.mjs');
const HERE = path.join(ROOT, 'experiments', 'm15_uncertainty');
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const git = (...a) => execFileSync('git', ['-C', ROOT, ...a]).toString().trim();
const fails = [];
let passes = 0;
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (c) passes++; else fails.push(m); };
const RESULT = argOf('--result') ? path.resolve(argOf('--result')) : path.join(HERE, 'results', 'm15_result.json');
const raw = fs.readFileSync(RESULT);
const j = JSON.parse(raw);
console.log(`${REHEARSAL ? 'REHEARSAL (smoke labels; namespace, count and suite checks relaxed)\n' : ''}result file sha256 ${sha(raw)}  (${raw.length} bytes)`);

// ---- the specification's constants, restated from SPEC.md ----
const K = 4, SIGMA = [1, 2, 3, 0], SIGMA_INV = [3, 0, 1, 2], ALPHA = 0.5, HAZ = 0.01, P = 64, Q = 0.25, CAP = 200;
const WARM = 12, EVAL = 16, FLOOR = 1e-6, PRUNE = 1e-12, B = 10000, CENSOR = 7, WITHIN = 6, THRESH = 0.10;
const CONDS = ['STABLE', 'NOISY', 'REVERSED', 'SPARSE'], NC = ['STABLE', 'NOISY', 'SPARSE', 'REV_PRE'];
const ADM_RAW = fs.readFileSync(path.join(HERE, 'admission', 'admission.json'));
const ADM = JSON.parse(ADM_RAW);
const WSTAR = ADM.wStar, MARGIN = ADM.margin, NGATE = ADM.n;
const WIN = `WINDOW_w${WSTAR}`;
const ARMS = ['CONCRETE', 'FROZEN', 'FREQ', 'NEWEST', WIN, 'UA', 'ORACLE'];
const SPECS = {
  FREQ: { rule: 'F', a: ALPHA }, FROZEN: { rule: 'F', a: ALPHA, freeze: true }, NEWEST: { rule: 'N' }, [WIN]: { rule: 'W', a: ALPHA, w: WSTAR },
  UA: { rule: 'B', a: ALPHA, h: HAZ }, UA_a1: { rule: 'B', a: 1, h: 0.01 }, UA_h02: { rule: 'B', a: ALPHA, h: 0.02 }, UA_h05: { rule: 'B', a: ALPHA, h: 0.05 }, UA_h15: { rule: 'B', a: ALPHA, h: 0.15 },
};
const SENS = ['UA_a1', 'UA_h02', 'UA_h05', 'UA_h15'];
const sum = (x) => x.reduce((a, b) => a + b, 0), mean = (x) => sum(x) / x.length;
const near = (a, b, tol = 1e-9) => a === b || (Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= tol);

// ---- provenance ----
const frozen = Object.fromEntries(fs.readFileSync(path.join(HERE, 'SPEC.sha256'), 'utf8').trim().split(/\r?\n/).map((l) => l.trim().split(/\s+/)).map(([h, n]) => [n, h]));
const SPECTXT = fs.readFileSync(path.join(HERE, 'SPEC.md'), 'utf8');
ok(/^\*\*Status\.\*\* Frozen/m.test(SPECTXT), 'SPEC.md is Frozen');
ok(j.specSha256 === sha(fs.readFileSync(path.join(HERE, 'SPEC.md'))) && j.specSha256 === frozen['SPEC.md'], `SPEC.md ${j.specSha256?.slice(0, 8)} = file = SPEC.sha256`);
ok(j.pinsSha256 === sha(fs.readFileSync(path.join(HERE, 'PINS.json'))) && j.pinsSha256 === frozen['PINS.json'], `PINS.json ${j.pinsSha256?.slice(0, 8)} = file = SPEC.sha256`);
ok(j.admissionSha256 === sha(ADM_RAW) && j.admissionSha256 === frozen['admission/admission.json'], `admission.json ${j.admissionSha256?.slice(0, 8)} = file = SPEC.sha256`);
const pins = spawnSync(process.execPath, [path.join(HERE, 'pins.mjs'), '--check'], { cwd: ROOT, encoding: 'utf8' });
ok(pins.status === 0, 'every pinned file matches PINS.json now');
let ancestor = false;
try { execFileSync('git', ['-C', ROOT, 'merge-base', '--is-ancestor', '77edfe7', j.headAtLaunch]); ancestor = true; } catch { ancestor = false; }
ok(ancestor && j.headAtEnd === j.headAtLaunch, `launched at ${j.headAtLaunch?.slice(0, 7)}, on top of the freeze commit 77edfe7, and HEAD unchanged during the run`);
ok(j.appFiles && j.appFiles['main.js'] === sha(fs.readFileSync(path.join(ROOT, 'main.js'))), 'main.js unchanged');
if (REHEARSAL) console.log('SKIP  suite record (rehearsal)');
else ok(j.tests && j.tests.exit === 0 && j.tests.passed === j.tests.total && j.tests.total >= 224, `suite passed before the run (${j.tests?.passed}/${j.tests?.total})`);
const P0 = j.parameters;
ok(P0.m15.alpha === ALPHA && P0.m15.h === HAZ && P0.m15.probes === P && P0.m15.logFloor === FLOOR && P0.m15.bootstrap === B && P0.m15.delayCensor === CENSOR && P0.m15.delayWithin === WITHIN && JSON.stringify(P0.m15.windowGrid) === '[2,3,4]', 'parameters: alpha, h, P, floor, B, censoring, window grid');
ok(P0.e7.q === Q && P0.e7.warmup === WARM && P0.e7.sparseWarmup === 1 && P0.e7.evaluation === EVAL && P0.e7.cap === CAP && P0.e7.distance === 4 && P0.e7.switchMin === 2 && P0.e7.switchMax === 10, 'parameters: task E7');
ok(JSON.stringify(P0.sensitivity) === JSON.stringify({ UA_a1: { rule: 'BOCPD', h: 0.01, alpha: 1 }, UA_h02: { rule: 'BOCPD', h: 0.02, alpha: 0.5 }, UA_h05: { rule: 'BOCPD', h: 0.05, alpha: 0.5 }, UA_h15: { rule: 'BOCPD', h: 0.15, alpha: 0.5 } }), 'parameters: sensitivity arms');
ok(P0.wStar === WSTAR && P0.margin === MARGIN && P0.n === NGATE && ADM.admitted === true, `w* ${WSTAR}, margin ${MARGIN}, n ${NGATE} from the admission record (ADMITTED)`);
ok(P0.adoptedAgent.kind === 'VOL_RHO' && P0.adoptedAgent.params.rhoFixed === 0.5, 'the adopted agent (AD-13)');

// ---- labels ----
const rows = j.rows;
const labels = rows.map((r) => r.label);
const idx = (l) => Number(l.slice(l.lastIndexOf('|') + 1));
const pattern = REHEARSAL ? /^m15unc\|smoke\|\d+$/ : /^m15unc\|gate\|\d+$/;
ok(labels.every((l, i) => pattern.test(l) && idx(l) === i), `labels ${REHEARSAL ? 'm15unc|smoke' : 'm15unc|gate'}|0..${labels.length - 1}, in numeric order`);
ok(REHEARSAL || (labels.length === NGATE && j.labels === NGATE), `${labels.length} labels${REHEARSAL ? ' (rehearsal)' : ` = n = ${NGATE}`}`);
ok(rows.every((r) => !r.excluded), 'no label excluded');
const seqs = labels.map((l) => planSequence(l));
ok(seqs.every((S, i) => !S.excluded && S.s === rows[i].s), 'every switch point s equals the task\'s draw');

// ---- determinism and stored validity ----
ok(j.determinism.identical === true && j.determinism.digestsSha256RunA === j.determinism.digestsSha256RunB && j.digests.length === labels.length && sha(JSON.stringify(j.digests)) === j.determinism.digestsSha256RunA, 'run A = run B (every label\'s full record), and the digests hash to the stored value');
const V = j.validity;
ok(['determinism', 'vRev', 'concretePassive', 'noExclusion', 'frozenUnchanged', 'probeIsolation', 'identity'].every((k) => V[k] === true) && (REHEARSAL || V.suite === true), 'the stored validity parts are all true');
ok(rows.every((r) => Object.values(r.checks).every((x) => x === true)), 'every label\'s stored checks are true');

// ---- closed-loop rows ----
const LEN = { STABLE: 28, NOISY: 28, REVERSED: 28, SPARSE: 17 };
const tOf = (c, i) => (c === 'SPARSE' ? 11 + i : i);
let shape = true, range = true, cappedOk = true, oracleRoute = true, passive = true, vrev = true, ident = true;
rows.forEach((r) => {
  for (const c of CONDS) for (const a of ARMS) {
    const x = r.closed[c] && r.closed[c][a];
    if (!x || x.steps.length !== LEN[c]) { shape = false; continue; }
    if (!x.steps.every((s) => Number.isInteger(s) && s >= 4 && s <= CAP)) range = false;
    for (const t of x.capped) { const i = c === 'SPARSE' ? t - 11 : t; if (x.steps[i] !== CAP) cappedOk = false; }
  }
  if (!shape) return;
  if (!r.closed.STABLE.ORACLE.steps.slice(WARM).every((s) => s === 4)) oracleRoute = false;
  const byT = new Map();
  for (const c of CONDS) r.closed[c].CONCRETE.steps.forEach((s, i) => { const t = tOf(c, i); if (byT.has(t) && byT.get(t) !== s) passive = false; byT.set(t, s); });
  for (const a of ARMS) for (let i = 0; i < WARM + r.s; i++) if (r.closed.STABLE[a].steps[i] !== r.closed.REVERSED[a].steps[i]) vrev = false;
  for (const c of CONDS) for (const a of ARMS) if (a !== 'ORACLE' && r.closed[c][a].steps[0] !== r.closed[c].CONCRETE.steps[0]) ident = false;
});
ok(shape, 'every label has 7 arms x 4 conditions, with 28 worlds (17 in SPARSE)');
ok(range, 'every episode took 4 to 200 steps (the route is the unique 4-hop shortest path)');
ok(cappedOk, 'every capped episode is recorded as 200 steps');
ok(oracleRoute, 'ORACLE walks the route (4 steps) in every STABLE evaluation world');
ok(passive, 'CONCRETE takes the same steps in every condition, world by world');
ok(vrev, 'V-REV: every arm takes the same steps in STABLE and REVERSED through evaluation world s');
ok(ident, 'identity: every non-privileged belief arm equals CONCRETE in the first world of every condition');

// ---- passive replay, from scratch ----
const onehot = (v) => Array.from({ length: K }, (_, i) => (i === v ? 1 : 0));
const noisyTheta = (k) => Array.from({ length: K }, (_, i) => (i === SIGMA[k] ? 1 - Q : Q / (K - 1)));
function sequenceOf(S, cond) {
  const out = [];
  for (const w of cond === 'SPARSE' ? [S.worlds[WARM - 1]] : S.worlds.slice(0, WARM)) out.push({ w, kinds: w.exact, e: null, post: null, theta: (k) => onehot(SIGMA[k]) });
  for (let e = 0; e < EVAL; e++) {
    const w = S.worlds[WARM + e];
    if (cond === 'NOISY') out.push({ w, kinds: w.noisy.kinds, e, post: null, theta: noisyTheta });
    else if (cond === 'REVERSED' && e >= S.s) out.push({ w, kinds: w.reversed, e, post: e - S.s, theta: (k) => onehot(SIGMA_INV[k]) });
    else out.push({ w, kinds: w.exact, e, post: null, theta: (k) => onehot(SIGMA[k]) });
  }
  return out;
}
/** the observation unit on a route: per kind, the successor of its first node */
function routeObservations(W) {
  const r = W.w.plan.route, seen = new Array(K).fill(false), out = [];
  for (let i = 0; i + 1 < r.length; i++) { const k = W.kinds[r[i]]; if (!seen[k]) { seen[k] = true; out.push([k, W.kinds[r[i + 1]]]); } }
  return out;
}
function kindBelief(spec) {
  if (spec.rule === 'F' || spec.rule === 'W') {
    let c = new Array(K).fill(0); const last = [];
    const pred = () => { let s = 0; for (const x of c) s += x; s += K * spec.a; return c.map((x) => (x + spec.a) / s); };
    const mode = () => { const m = Math.max(...c); const at = c.map((x, i) => (x === m ? i : -1)).filter((i) => i >= 0); return at.length === 1 ? at[0] : null; };
    return { pred, obs(y) { c[y]++; if (spec.rule === 'W') { last.push(y); if (last.length > spec.w) last.shift(); if (last.length === spec.w && last.every((x) => x === last[0]) && mode() !== last[0]) { c = new Array(K).fill(0); c[last[0]] = spec.w; } } } };
  }
  if (spec.rule === 'N') { let l = null; return { pred: () => (l === null ? new Array(K).fill(1 / K) : onehot(l)), obs(y) { l = y; } }; }
  const A = K * spec.a;
  let runs = [{ r: 0, p: 1, c: new Array(K).fill(0) }];
  return {
    pred() { const p = new Array(K).fill(0); for (const s of runs) for (let i = 0; i < K; i++) p[i] += s.p * (spec.a + s.c[i]) / (A + s.r); return p; },
    obs(y) {
      const pi = runs.map((s) => (spec.a + s.c[y]) / (A + s.r));
      let ch = 0; runs.forEach((s, i) => { ch += s.p * pi[i] * spec.h; });
      const nx = [{ r: 0, p: ch, c: new Array(K).fill(0) }, ...runs.map((s, i) => ({ r: s.r + 1, p: s.p * pi[i] * (1 - spec.h), c: s.c.map((v, q) => v + (q === y ? 1 : 0)) }))];
      let z = 0; for (const s of nx) z += s.p;
      for (const s of nx) s.p /= z;
      runs = nx.filter((s) => s.p >= PRUNE);
    },
  };
}
const unique = (p) => { const m = Math.max(...p); const at = p.map((x, i) => (x === m ? i : -1)).filter((i) => i >= 0); return at.length === 1 ? at[0] : null; };
function drawOutcomes(label, cond, t, k, th) {
  const rnd = makeStream(`${label}|${cond}|probe|${t}|${k}`), out = [];
  for (let i = 0; i < P; i++) { let u = rnd(), y = 0; while (y < K - 1 && u >= th[y]) { u -= th[y]; y++; } out.push(y); }
  return out;
}
const binIndex = (c) => { let b = 0; while (b < 9 && c >= (b + 1) / 10) b++; return b; };
const newAcc = () => ({ n: 0, brier: 0, log: 0, a: 0, conf: 0, pTrue: 0, uniq: 0, fa: 0, bins: new Float64Array(30) });
function scope(cond, e, post, postObs) {
  if (cond !== 'REVERSED') return cond === 'SPARSE' && e <= 2 ? ['SPARSE', 'SPARSE_E0_2'] : [cond];
  if (post === null) return ['REV_PRE'];
  return postObs <= 1 ? ['REV_POST', 'REV_POST_1_2'] : postObs <= 5 ? ['REV_POST', 'REV_POST_3_6'] : ['REV_POST'];
}
const MECHS = ['FREQ', 'FROZEN', 'NEWEST', WIN, 'UA', ...SENS];
const POINTS = ['UA', ...SENS];
const t0 = Date.now();
const LAB = seqs.map((S, li) => {
  const label = labels[li], probes = new Map();
  const res = Object.fromEntries(MECHS.map((m) => [m, { acc: {}, points: [], delay: null }]));
  for (const cond of CONDS) {
    const C = sequenceOf(S, cond), stream = C.map(routeObservations);
    for (const m of MECHS) {
      const spec = SPECS[m], bel = Array.from({ length: K }, () => kindBelief(spec)), R = res[m];
      let isFrozen = false;
      const post = new Array(K).fill(0), delay = new Array(K).fill(null);
      C.forEach((W, i) => {
        if (W.e !== null && spec.freeze) isFrozen = true;
        if (W.e !== null) {
          for (let k = 0; k < K; k++) {
            const p = bel[k].pred(), th = W.theta(k), key = `${cond}|${W.w.t}|${k}`;
            if (!probes.has(key)) probes.set(key, drawOutcomes(label, cond, W.w.t, k, th));
            const conf = Math.max(...p), top = [];
            for (let q = 0; q < K; q++) if (p[q] === conf) top.push(q);
            let a = 0; for (const q of top) a += th[q]; a /= top.length;
            let brier = 0, log = 0;
            for (let y = 0; y < K; y++) if (th[y] > 0) { let s2 = 0; for (let q = 0; q < K; q++) s2 += (p[q] - (q === y ? 1 : 0)) ** 2; brier += th[y] * s2; log -= th[y] * Math.log(Math.max(p[y], FLOOR)); }
            const truth = th.indexOf(Math.max(...th)), u = unique(p);
            let corr = 0; for (const o of probes.get(key)) if (top.includes(o)) corr += 1 / top.length;
            const sc = scope(cond, W.e, W.post, W.post === null ? null : post[k]);
            for (const g of sc) {
              const x = R.acc[g] || (R.acc[g] = newAcc());
              x.n++; x.brier += brier; x.log += log; x.a += a; x.conf += conf; x.pTrue += p[truth]; x.uniq += u !== null ? 1 : 0; x.fa += u !== null && u !== truth ? 1 : 0;
              const b = binIndex(conf); x.bins[3 * b] += 1; x.bins[3 * b + 1] += conf; x.bins[3 * b + 2] += a;
            }
            if (POINTS.includes(m) && NC.includes(sc[0])) R.points.push([conf, corr, P - corr]);
          }
          if (W.post !== null) for (let k = 0; k < K; k++) if (delay[k] === null && post[k] === 0 && unique(bel[k].pred()) === SIGMA_INV[k]) delay[k] = 0;
        }
        for (const [k, y] of stream[i]) {
          if (!isFrozen) bel[k].obs(y);
          if (W.post !== null) { post[k]++; if (delay[k] === null && post[k] <= WITHIN && unique(bel[k].pred()) === SIGMA_INV[k]) delay[k] = post[k]; }
        }
      });
      if (cond === 'REVERSED') R.delay = delay.map((d) => (d === null ? CENSOR : d));
    }
  }
  return res;
});
console.log(`(passive replay recomputed for ${labels.length} labels x 4 conditions x ${MECHS.length} mechanisms in ${Math.round((Date.now() - t0) / 1000)} s)`);

// ---- statistics ----
const merged = (L, m, scopes) => { const o = newAcc(); for (const g of scopes) { const x = L[m].acc[g]; if (!x) continue; for (const f of ['n', 'brier', 'log', 'a', 'conf', 'pTrue', 'uniq', 'fa']) o[f] += x[f]; for (let i = 0; i < 30; i++) o.bins[i] += x.bins[i]; } return o; };
const avg = (L, m, scopes, f) => { const o = merged(L, m, scopes); return o[f] / o.n; };
const ece = (bins, off = 0) => { let N = 0; for (let b = 0; b < 10; b++) N += bins[off + 3 * b]; let e = 0; for (let b = 0; b < 10; b++) { const n = bins[off + 3 * b]; if (n) e += (n / N) * Math.abs(bins[off + 3 * b + 2] / n - bins[off + 3 * b + 1] / n); } return e; };
const eceDir = (bins) => { let N = 0; for (let b = 0; b < 10; b++) N += bins[3 * b]; let d = 0; for (let b = 0; b < 10; b++) { const n = bins[3 * b]; if (n) d += (n / N) * (bins[3 * b + 2] / n - bins[3 * b + 1] / n); } return d; };
function cluster(vecs, tag, stat) {
  const n = vecs.length, d = vecs[0].length, tot = new Float64Array(d);
  for (const v of vecs) for (let i = 0; i < d; i++) tot[i] += v[i];
  const est = stat(tot), rnd = makeStream(tag), vals = new Float64Array(B), acc = new Float64Array(d);
  for (let b = 0; b < B; b++) { acc.fill(0); for (let i = 0; i < n; i++) { const v = vecs[Math.floor(rnd() * n)]; for (let q = 0; q < d; q++) acc[q] += v[q]; } vals[b] = stat(acc); }
  vals.sort();
  return { mean: est, lo: vals[250], hi: vals[9749], loFamily: vals[62] };
}
function aurocCluster(lists, tag) {
  const confs = [...new Set(lists.flat().map((x) => x[0]))].sort((a, b) => a - b), rank = new Map(confs.map((c, i) => [c, i])), R = confs.length;
  const lab = lists.map((l) => l.map((x) => [rank.get(x[0]), x[1], x[2]]));
  const Pp = new Float64Array(R), Nn = new Float64Array(R);
  const auc = () => { let below = 0, s = 0, pos = 0, neg = 0; for (let r = 0; r < R; r++) { s += Pp[r] * (below + 0.5 * Nn[r]); below += Nn[r]; pos += Pp[r]; neg += Nn[r]; } return s / (pos * neg); };
  const fill = (pick) => { Pp.fill(0); Nn.fill(0); for (const i of pick) for (const [r, p, q] of lab[i]) { Pp[r] += p; Nn[r] += q; } };
  const n = lists.length; fill([...Array(n).keys()]);
  const est = auc(), rnd = makeStream(tag), vals = new Float64Array(B), pick = new Array(n);
  for (let b = 0; b < B; b++) { for (let i = 0; i < n; i++) pick[i] = Math.floor(rnd() * n); fill(pick); vals[b] = auc(); }
  vals.sort();
  return { mean: est, lo: vals[250], hi: vals[9749] };
}
const domain = j.domain;
const tag = (t) => `m15unc|stats|${domain}|${t}`;
const stepsIn = (r, arm, win) => {
  const st = r.closed[{ S: 'STABLE', N: 'NOISY', P: 'REVERSED', SP: 'SPARSE' }[win]][arm].steps;
  if (win === 'S' || win === 'N') return mean(st.slice(WARM));
  if (win === 'P') return mean(st.slice(WARM + r.s, WARM + r.s + 6));
  return mean(st.slice(1, 4));
};
const delayOf = (L, m) => mean(L[m].delay);
const condBrier = (L, m) => mean([['STABLE'], ['NOISY'], ['SPARSE'], ['REV_PRE', 'REV_POST']].map((sc) => avg(L, m, sc, 'brier')));
const binsOf = (L, m, sc) => merged(L, m, sc).bins;
const cat = (...vs) => Float64Array.from(vs.flatMap((v) => Array.from(v)));
function parts(ua, blocks) {
  const sfx = ua === 'UA' ? '' : `|${ua}`, out = [];
  const pd = (name, line, f, dir, thr) => { const d = rows.map((r, i) => f(r, LAB[i])); out.push({ name, line, kind: 'paired', dir, threshold: thr, perLabel: d, ...pairedBootstrap(d, tag(name + sfx)) }); };
  const cl = (name, line, vec, stat, dir, thr) => out.push({ name, line, kind: 'cluster', dir, threshold: thr, ...cluster(LAB.map(vec), tag(name + sfx), stat) });
  if (blocks.includes('T')) pd('T', 'T', (r) => stepsIn(r, 'CONCRETE', 'S') - stepsIn(r, ua, 'S'), 'lo>', 0);
  if (blocks.includes('BT')) {
    cl('BT1', 'BT', (L) => binsOf(L, ua, NC), (v) => ece(v), 'hi<', 0.10);
    pd('BT2a', 'BT', (r, L) => avg(L, 'NEWEST', NC, 'brier') - avg(L, ua, NC, 'brier'), 'lo>', 0);
    cl('BT2b', 'BT', (L) => cat(binsOf(L, 'NEWEST', NC), binsOf(L, ua, NC)), (v) => ece(v, 0) - ece(v, 30), 'lo>', 0);
    cl('BT3a', 'BT', (L) => { const o = merged(L, ua, ['NOISY']); return Float64Array.of(o.pTrue, o.n); }, (v) => Math.abs(v[0] / v[1] - 0.75), 'hi<', 0.10);
    pd('BT3b', 'BT', (r, L) => avg(L, ua, ['STABLE'], 'pTrue') - avg(L, ua, ['NOISY'], 'pTrue'), 'lo>', 0);
    out.push({ name: 'BT3c', line: 'BT', kind: 'cluster', dir: 'lo>', threshold: 0.5, ...aurocCluster(LAB.map((L) => L[ua].points), tag('BT3c' + sfx)) });
    pd('BT4', 'BT', (r, L) => avg(L, ua, NC, 'brier') - avg(L, 'FREQ', NC, 'brier'), 'hi<', 0.05);
    cl('BT5a', 'BT', (L) => { const o = merged(L, ua, ['SPARSE_E0_2']); return Float64Array.of(o.conf, o.a, o.n); }, (v) => (v[0] - v[1]) / v[2], 'hi<', 0.10);
    cl('BT5b', 'BT', (L) => { const x = merged(L, 'NEWEST', ['SPARSE_E0_2']), y = merged(L, ua, ['SPARSE_E0_2']); return Float64Array.of(x.conf, x.a, x.n, y.conf, y.a, y.n); }, (v) => (v[0] - v[1]) / v[2] - (v[3] - v[4]) / v[5], 'lo>', 0);
  }
  if (blocks.includes('CD')) {
    pd('CD1a', 'CD', (r, L) => delayOf(L, 'FREQ') - delayOf(L, 'UA'), 'lo>', 0);
    cl('CD1b', 'CD', (L) => Float64Array.of(L.UA.delay.filter((d) => d <= WITHIN).length, 4), (v) => v[0] / v[1], 'lo>', 0.75);
    cl('CD2a', 'CD', (L) => { const o = merged(L, 'UA', NC); return Float64Array.of(o.fa, o.uniq); }, (v) => v[0] / v[1], 'hi<', 0.10);
    cl('CD2b', 'CD', (L) => { const x = merged(L, 'NEWEST', ['NOISY']), y = merged(L, 'UA', ['NOISY']); return Float64Array.of(x.fa, x.uniq, y.fa, y.uniq); }, (v) => v[0] / v[1] - v[2] / v[3], 'lo>', 0);
    pd('CD3a', 'CD', (r, L) => avg(L, 'FREQ', ['REV_POST_3_6'], 'brier') - avg(L, 'UA', ['REV_POST_3_6'], 'brier'), 'lo>', 0);
    pd('CD3b', 'CD', (r, L) => avg(L, 'FROZEN', ['REV_POST_3_6'], 'brier') - avg(L, 'UA', ['REV_POST_3_6'], 'brier'), 'lo>', 0);
  }
  if (blocks.includes('ACT')) {
    pd('ACT1a', 'ACT', (r) => stepsIn(r, 'UA', 'N') - stepsIn(r, 'CONCRETE', 'N'), 'hi<', MARGIN);
    pd('ACT1b', 'ACT', (r) => stepsIn(r, 'NEWEST', 'N') - stepsIn(r, 'UA', 'N'), 'lo>', 0);
    pd('ACT2a', 'ACT', (r) => stepsIn(r, 'FROZEN', 'P') - stepsIn(r, 'UA', 'P'), 'lo>', 0);
    pd('ACT2b', 'ACT', (r) => stepsIn(r, 'FREQ', 'P') - stepsIn(r, 'UA', 'P'), 'lo>', 0);
    pd('ACT3', 'ACT', (r) => stepsIn(r, 'UA', 'SP') - stepsIn(r, 'CONCRETE', 'SP'), 'hi<', MARGIN);
  }
  if (blocks.includes('MECH')) {
    pd('MECH-a', 'MECH', (r, L) => condBrier(L, WIN) - condBrier(L, 'UA'), 'lo>', 0);
    pd('MECH-b', 'MECH', (r, L) => delayOf(L, 'UA') - delayOf(L, WIN), 'hi<', 1);
    cl('MECH-c', 'MECH', (L) => { const x = merged(L, WIN, NC), y = merged(L, 'UA', NC); return Float64Array.of(x.fa, x.uniq, y.fa, y.uniq); }, (v) => v[0] / v[1] - v[2] / v[3], 'lo>', 0);
  }
  for (const c of out) c.pass = Number.isFinite(c.lo) && (c.dir === 'lo>' ? c.lo > c.threshold : c.hi < c.threshold);
  return out;
}
function compare(mine, stored, what) {
  const bad = [];
  if (!stored || stored.length !== mine.length) { ok(false, `${what}: ${stored ? stored.length : 0} stored parts, ${mine.length} recomputed`); return; }
  for (const c of mine) {
    const s = stored.find((x) => x.name === c.name);
    if (!s) { bad.push(`${c.name} missing`); continue; }
    if (s.line !== c.line || s.kind !== c.kind || s.dir !== c.dir || s.threshold !== c.threshold) bad.push(`${c.name} definition`);
    if (!near(s.mean, c.mean) || !near(s.lo, c.lo) || !near(s.hi, c.hi)) bad.push(`${c.name} ${s.mean}/${s.lo}/${s.hi} vs ${c.mean}/${c.lo}/${c.hi}`);
    if (s.pass !== c.pass) bad.push(`${c.name} pass ${s.pass} vs ${c.pass}`);
    if (c.perLabel && (!s.perLabel || s.perLabel.length !== c.perLabel.length || s.perLabel.some((x, i) => !near(x, c.perLabel[i])))) bad.push(`${c.name} per-label values`);
  }
  ok(bad.length === 0, `${what}: every part's estimate, interval, definition and outcome recomputed${bad.length ? ` (${bad.slice(0, 6).join('; ')})` : ''}`);
}
const C = parts('UA', ['T', 'BT', 'CD', 'ACT', 'MECH']);
compare(C, j.criteria, 'criteria (24 parts)');
for (const s of SENS) compare(parts(s, ['BT']), j.sensitivityBT && j.sensitivityBT[s], `sensitivity BT block ${s}`);

// ---- BT-COND ----
const NAME = { STABLE: 'STABLE', NOISY: 'NOISY', SPARSE: 'SPARSE', REV_PRE: 'REVERSED before the switch' };
const myCond = {};
for (const sc of NC) {
  const r = cluster(LAB.map((L) => binsOf(L, 'UA', [sc])), tag(`BTCOND|${sc}`), (v) => ece(v));
  const pooled = merged({ x: { acc: {} } }, 'x', []);
  for (const L of LAB) { const o = merged(L, 'UA', [sc]); for (const f of ['n', 'conf', 'a']) pooled[f] += o[f]; for (let i = 0; i < 30; i++) pooled.bins[i] += o.bins[i]; }
  const cls = !(pooled.n > 0) ? 'MISSING' : r.hi < THRESH ? 'PASS' : r.loFamily >= THRESH ? 'MATERIAL FAIL' : 'INCONCLUSIVE';
  myCond[sc] = { points: pooled.n, ...r, direction: eceDir(pooled.bins), classification: cls };
}
const bt = j.btCond;
ok(bt && NC.every((sc) => bt.conditions[sc] && near(bt.conditions[sc].ece, myCond[sc].mean) && near(bt.conditions[sc].lo, myCond[sc].lo) && near(bt.conditions[sc].hi, myCond[sc].hi) && near(bt.conditions[sc].loFamily, myCond[sc].loFamily) && bt.conditions[sc].points === myCond[sc].points && bt.conditions[sc].classification === myCond[sc].classification && Math.sign(bt.conditions[sc].direction) === Math.sign(myCond[sc].direction)), 'BT-COND: all four conditions present; ECE, 95% interval, family lower bound, direction and classification recomputed');
const allPass = NC.every((sc) => myCond[sc].classification === 'PASS');
const myLine = allPass ? 'SHOWN' : `NOT SHOWN (${NC.filter((sc) => myCond[sc].classification !== 'PASS').map((sc) => `${sc} ${myCond[sc].classification}`).join(', ')})`;
ok(bt && bt.allPass === allPass && bt.line === myLine && bt.complete === NC.every((sc) => myCond[sc].classification !== 'MISSING'), `BT-COND line: ${myLine}`);
const nTot = sum(NC.map((sc) => myCond[sc].points));
const pwm = sum(NC.map((sc) => myCond[sc].points * myCond[sc].mean)) / nTot;
const pooledAll = (() => { const b = new Float64Array(30); for (const L of LAB) { const o = merged(L, 'UA', NC); for (let i = 0; i < 30; i++) b[i] += o.bins[i]; } return ece(b); })();
ok(bt && near(bt.pointWeightedMean, pwm) && near(bt.pooled, pooledAll) && near(bt.pooled, C.find((c) => c.name === 'BT1').mean), 'BT-COND: point-weighted mean and pooled ECE (= BT1\'s estimate) recomputed');

// ---- the reading rule ----
const valid = ['determinism', 'suite', 'vRev', 'concretePassive', 'noExclusion', 'frozenUnchanged', 'probeIsolation', 'identity'].every((k) => V[k] === true) && NC.every((sc) => myCond[sc].classification !== 'MISSING');
const all = (l) => C.filter((c) => c.line === l).every((c) => c.pass);
const failed = (l) => C.filter((c) => c.line === l && !c.pass).map((c) => c.name);
const T = all('T');
const act = !T ? 'NOT INTERPRETABLE (transfer not shown)' : all('ACT') ? 'SHOWN' : `NOT SHOWN (failed: ${failed('ACT').join(', ')})`;
const word = (d) => (d > 0 ? 'underconfident' : d < 0 ? 'overconfident' : 'no net direction');
const f3 = (x) => x.toFixed(3);
const shortfall = NC.filter((sc) => myCond[sc].classification !== 'PASS').map((sc) => { const c = myCond[sc]; return c.classification === 'MATERIAL FAIL' ? `UA materially ${word(c.direction)} in ${NAME[sc]} (ECE ${f3(c.mean)})` : c.classification === 'INCONCLUSIVE' ? `${NAME[sc]} inconclusive (ECE ${f3(c.mean)} [${f3(c.lo)}, ${f3(c.hi)}])` : `${NAME[sc]} missing`; }).join(', ');
const h05 = parts('UA_h05', ['BT']);
let statement;
if (!valid) statement = 'INVALID — NO CRITERION IS INTERPRETED';
else {
  const s = [], cl = act === 'SHOWN' ? ', IN CLOSED-LOOP BEHAVIOUR' : '';
  if (all('BT') && all('CD') && allPass) s.push(`CALIBRATED ADAPTIVE BELIEF TRACKING AND CHANGE DETECTION SHOWN, with a development-selected hazard (h = 0.01)${cl}`);
  else if (all('BT') && all('CD')) { s.push(`POOLED CALIBRATION AND CHANGE DETECTION SHOWN (development-selected h = 0.01)${cl}`); s.push(`CALIBRATION ACROSS CONDITIONS NOT SHOWN: ${shortfall}`); }
  else { s.push(`POOLED CALIBRATED BELIEF TRACKING (BT, development-selected hazard h = 0.01): ${all('BT') ? 'SHOWN' : 'NOT SHOWN'}`); s.push(`CALIBRATION ACROSS CONDITIONS: ${allPass ? 'SHOWN' : `NOT SHOWN: ${shortfall}`}`); s.push(`CHANGE DETECTION: ${all('CD') ? 'SHOWN' : 'NOT SHOWN'}`); s.push(`ACTIVE BEHAVIOUR: ${act}`); }
  s.push(all('MECH') ? 'Bayesian change-point inference outperforms a tuned window rule' : 'change detection not distinguished from a tuned window rule');
  s.push(`originally specified h = 0.05 (sensitivity arm): BT parts passed ${h05.filter((c) => c.pass).length} of ${h05.length}${h05.every((c) => c.pass) ? '' : ` (failed: ${h05.filter((c) => !c.pass).map((c) => c.name).join(', ')})`}`);
  s.push(`BT1 pools the no-change conditions (pooled exact ECE ${f3(pooledAll)}); UA's exact ECE by condition (BT-COND, threshold 0.10): ${NC.map((sc) => `${NAME[sc]} ${f3(myCond[sc].mean)} [${f3(myCond[sc].lo)}, ${f3(myCond[sc].hi)}] ${word(myCond[sc].direction)}, ${myCond[sc].classification}`).join('; ')}; point-weighted mean ${f3(pwm)}`);
  statement = s.join('; ');
}
const L0 = j.reading.lines;
ok(L0.transfer === (T ? 'SHOWN' : 'NOT SHOWN') && L0.calibratedBeliefTracking === (all('BT') ? 'SHOWN' : `NOT SHOWN (failed: ${failed('BT').join(', ')})`) && L0.calibrationAcrossConditions === myLine && L0.changeDetection === (all('CD') ? 'SHOWN' : `NOT SHOWN (failed: ${failed('CD').join(', ')})`) && L0.activeBehaviour === act && L0.bayesianAdvantageOverTunedWindow === (all('MECH') ? 'SHOWN' : `NOT SHOWN (failed: ${failed('MECH').join(', ')}; predicted NOT SHOWN)`) && L0.validity === (valid ? 'VALID' : L0.validity), 'the verdict lines recomputed');
ok(j.reading.statement === statement, 'the statement recomputed character for character');
ok(!/CALIBRATED ADAPTIVE BELIEF TRACKING AND CHANGE DETECTION SHOWN/.test(j.reading.statement) || (allPass && all('BT') && all('CD')), 'the full capability name appears only with BT, CD and BT-COND all SHOWN');

// ---- report ----
console.log('\nrecomputed criteria (estimate [95%], pass):');
for (const c of C) console.log(`  ${c.name.padEnd(6)} ${c.line.padEnd(4)} ${c.mean.toFixed(4)} [${c.lo.toFixed(4)}, ${c.hi.toFixed(4)}] ${c.dir} ${c.threshold}  ${c.pass ? 'pass' : 'FAIL'}`);
console.log('recomputed BT-COND (UA, exact ECE by condition):');
for (const sc of NC) console.log(`  ${NAME[sc].padEnd(27)} ${myCond[sc].mean.toFixed(4)} [${myCond[sc].lo.toFixed(4)}, ${myCond[sc].hi.toFixed(4)}], family lower ${myCond[sc].loFamily.toFixed(4)}, ${word(myCond[sc].direction)}, ${myCond[sc].classification}`);
console.log(`  pooled ${pooledAll.toFixed(4)}; point-weighted mean ${pwm.toFixed(4)}`);
console.log('\nillustration (fixed before the result):');
console.log(`  ${labels[0]}: s = ${rows[0].s}; UA route-stream detection delays ${JSON.stringify(LAB[0].UA.delay)}`);
for (const w of ['S', 'N', 'P', 'SP']) console.log(`  mean steps, ${{ S: 'STABLE worlds 1-16', N: 'NOISY worlds 1-16', P: 'post-switch worlds 1-6', SP: 'SPARSE worlds 1-3' }[w].padEnd(23)}: ${ARMS.map((a) => `${a} ${mean(rows.map((r) => stepsIn(r, a, w))).toFixed(2)}`).join('  ')}`);
console.log(`\nstored statement: ${j.reading.statement}`);
console.log(`\n${fails.length ? `${fails.length} FAILURE(S)` : 'ALL CHECKS PASS'} (${passes} passed)`);
console.log(`git status of the repository: ${git('status', '--porcelain') || 'clean'}`);
process.exit(fails.length ? 1 : 0);
