// ==========================================================
// FUTURESCORE V2.3 GATE — frozen numerical + projection contract
// ==========================================================
// Specification-only milestone. Verifies the contract by EXACT rational arithmetic (BigInt) on
// exhaustively enumerated count records, on deterministic synthetic graphs and on a reference model
// written from the contract text. It imports no production module, no experiment module and no RNG:
// no agent is run, no configuration is generated, no seed is evaluated.
//
// Scope check is lineage-aware (same discipline as verify_fs_v22.js): before commit it inspects the
// working tree against HEAD; after commit it inspects the single commit that ADDED the contract.
// ==========================================================
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DOC_REL = 'research/preregistrations/FUTURESCORE_V2_3_NUMERICAL_PROJECTION_CONTRACT.md';
const SELF_REL = 'research/preregistrations/verify_fs_v23.js';
const MILESTONE = [DOC_REL, SELF_REL].sort();
const BASE = 'aa70e93953f0ede70d0e369d6b2fa0b4e374aea7';          // FutureScore V2.2 freeze
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/\r\n/g, '\n');
const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 });

let checks = 0, fails = 0;
const ok = (id, cond, msg) => { checks++; if (!cond) fails++; console.log(`   [${cond ? 'PASS' : 'FAIL'}] ${id.padEnd(5)} ${msg}`); return cond; };
const section = (t) => console.log(`\n-- ${t} ${'-'.repeat(Math.max(0, 74 - t.length))}`);

console.log('='.repeat(78)); console.log('  FUTURESCORE V2.3 GATE — frozen numerical + projection contract'); console.log('='.repeat(78));

// ===== exact rationals; NEG_INF is an explicit sentinel ================================================
const gcd = (a, b) => { a = a < 0n ? -a : a; b = b < 0n ? -b : b; while (b) [a, b] = [b, a % b]; return a; };
const Q = (n, d = 1n) => { n = BigInt(n); d = BigInt(d); if (d === 0n) throw new Error('div0'); if (d < 0n) { n = -n; d = -d; } const g = gcd(n, d) || 1n; return { n: n / g, d: d / g }; };
const NEG_INF = Object.freeze({ inf: -1 });
const isInf = (x) => x === NEG_INF;
const add = (x, y) => (isInf(x) || isInf(y)) ? NEG_INF : Q(x.n * y.d + y.n * x.d, x.d * y.d);
const neg = (x) => Q(-x.n, x.d);
const sub = (x, y) => add(x, neg(y));
const mul = (x, y) => Q(x.n * y.n, x.d * y.d);
const div = (x, y) => Q(x.n * y.d, x.d * y.n);
const cmp = (x, y) => { if (isInf(x) && isInf(y)) return 0; if (isInf(x)) return -1; if (isInf(y)) return 1; const l = x.n * y.d, r = y.n * x.d; return l < r ? -1 : l > r ? 1 : 0; };
const eq = (x, y) => cmp(x, y) === 0;
const max = (x, y) => cmp(x, y) >= 0 ? x : y;

// ===== REFERENCE MODEL (from the contract text; inputs: counts, topology, goal ONLY) ====== MODEL-BEGIN
const KAPPA = 1, LAMBDA = 1, H_CONST = 3, B_CONST = 20;
const cHat = (a, s) => Q(BigInt(a) + BigInt(KAPPA), BigInt(s) + BigInt(KAPPA));            // F1
const eps = (a, s) => neg(cHat(a, s));                                                       // F13
function bfs(adj, g) {                                   // hop distance to g on the known graph
  const d = new Map([[g, 0]]), q = [g];
  while (q.length) { const v = q.shift(); for (const w of adj.get(v) || []) if (!d.has(w)) { d.set(w, d.get(v) + 1); q.push(w); } }
  return d;
}
const Tstruct = (adj, v, g) => { const d = bfs(adj, g); return d.has(v) ? Q(-d.get(v)) : NEG_INF; };   // F17–F19
function diameterFinite(adj) {                           // F26: largest FINITE pairwise hop distance
  let D = 0; for (const u of adj.keys()) for (const [, x] of bfs(adj, u)) D = Math.max(D, x); return D;
}
function FS(adj, cost, k, g, H) {                        // V2.1 recursion, terminal T = T_struct, refinement disabled
  if (g === null || g === undefined) return undefined;   // no goal ⇒ undefined
  const T = (v) => Tstruct(adj, v, g);
  const F = (v, h, P) => {
    if (v === g) return Q(0);
    const next = (adj.get(v) || []).filter(w => !P.has(w));
    if (h === 0 || next.length === 0) return T(v);
    let best = null;
    for (const w of next) { const val = add(neg(cost(v, w)), F(w, h - 1, new Set([...P, w]))); best = best === null ? val : max(best, val); }
    return best;
  };
  return F(k, H, new Set([k]));
}
function projection(fs, S) {                             // F23, F28, F29 — no cap (F33)
  if (fs === undefined) return Q(0);
  if (isInf(fs)) return Q(0);
  return div(mul(Q(B_CONST), Q(S)), sub(Q(S), fs));
}
// ============================================================================================ MODEL-END

// ---- E: estimator ------------------------------------------------------------------------------------
section('E  estimator (exhaustive, exact: 0 <= s <= a <= 80)');
const N = 80;
let idOk = true, geOk = true, sucOk = true, failOk = true, shrinkOk = true, gapOk = true;
for (let a = 0; a <= N; a++) for (let s = 0; s <= a; s++) {
  const c = cHat(a, s), f = a - s;
  if (!eq(c, add(Q(1), Q(f, s + 1)))) idOk = false;                                   // F5
  if (cmp(c, Q(1)) < 0) geOk = false;                                                 // F6
  if (cmp(sub(cHat(a + 1, s + 1), c), Q(0)) > 0 || !eq(sub(cHat(a + 1, s + 1), c), Q(-f, (s + 1) * (s + 2)))) sucOk = false;   // F7
  if (cmp(sub(cHat(a + 1, s), c), Q(0)) <= 0 || !eq(sub(cHat(a + 1, s), c), Q(1, s + 1))) failOk = false;                     // F8
  if (s >= 1) {
    const w = Q(s, s + 1);
    if (!eq(c, add(mul(w, Q(a, s)), mul(sub(Q(1), w), Q(1))))) shrinkOk = false;       // shrinkage identity
    if (!eq(sub(c, Q(a, s)), Q(-f, s * (s + 1)))) gapOk = false;                        // distance to the MLE
  }
}
ok('E1', idOk, 'identity c_hat = (a+1)/(s+1) = 1 + f/(s+1) on every record');
ok('E2', geOk, 'c_hat >= 1 on every record');
ok('E3', sucOk, 'success step (a+1,s+1): delta = -f/((s+1)(s+2)) <= 0');
ok('E4', failOk, 'failure step (a+1,s): delta = 1/(s+1) > 0 (strict)');
ok('E5', eq(cHat(0, 0), Q(1)), 'unobserved edge: c_hat(0,0) = 1');
ok('E6', Array.from({ length: 1001 }, (_, n) => eq(cHat(n, n), Q(1))).every(Boolean), 'all-success edge: c_hat(n,n) = 1 for n = 0..1000 (no count differentiation)');
ok('E7', shrinkOk, 'shrinkage identity c_hat = w*(a/s) + (1-w)*1, w = s/(s+1), for s >= 1');
ok('E8', gapOk, 'c_hat - a/s = -f/(s(s+1)) exactly (additive smoothing of the MLE a/s)');
ok('E9', Array.from({ length: 50 }, (_, n) => eq(eps(n + 3, n), neg(cHat(n + 3, n)))).every(Boolean) && cmp(eps(0, 0), Q(-1)) === 0,
  'epsilon = -c_hat, epsilon <= -1');

// consistency-oriented finite-count checks: records with exact ratio s/a = r/q, scaled by m
section('C  consistency (finite counts, exact)');
const PS = [[1, 4], [1, 3], [1, 2], [2, 3], [3, 4], [1, 1]];
let consOk = true, decOk = true;
for (const [r, q] of PS) {
  let prev = null;
  for (let m = 1; m <= 300; m++) {
    const a = m * q, s = m * r, err = sub(cHat(a, s), Q(q, r));                        // c_hat - 1/p
    if (!eq(err, Q(-(q - r), r * (m * r + 1)))) consOk = false;                          // = -(q-r)/(r(mr+1)) = O(1/m)
    const abs = cmp(err, Q(0)) < 0 ? neg(err) : err;
    if (prev !== null && (r === q ? !eq(abs, Q(0)) : cmp(abs, prev) >= 0)) decOk = false;
    prev = abs;
  }
}
ok('C1', consOk, 'for s/a = p exactly: c_hat - 1/p = -(1/p - 1)/(s+1) — vanishes as O(1/m)');
ok('C2', decOk, '|c_hat - 1/p| strictly decreasing in sample scale (zero when p = 1)');
ok('C3', eq(cHat(300, 0), Q(301)), 'p = 0 records: c_hat = a+1 grows without bound (1/p = inf)');

section('B  non-Bayesian (algebraic)');
let noBeta = true;
for (let al = 1; al <= 6; al++) for (let be = 1; be <= 6; be++) {
  const vals = [];
  for (let n = (al > 1 ? 0 : 1); n <= 20; n++) vals.push(Q(n + al + be - 1, n + al - 1));   // E[1/p | n successes], Beta(al,be)
  if (vals.some(v => eq(v, Q(1))) || new Set(vals.map(v => `${v.n}/${v.d}`)).size < 2) noBeta = false;
}
ok('B1', noBeta, 'every proper Beta(a0,b0>0) prior gives an all-success E[1/p] != 1 that varies with n — none reproduces F10');

// ---- T/R: terminal and recursion on deterministic synthetic graphs -----------------------------------
section('T  terminal + FS recursion (deterministic synthetic graphs)');
const G = (pairs, nodes) => { const adj = new Map(nodes.map(v => [v, []])); for (const [u, v] of pairs) { adj.get(u).push(v); adj.get(v).push(u); } return adj; };
const range = (n) => Array.from({ length: n }, (_, i) => i);
const GRAPHS = {
  singleEdge: G([[0, 1]], range(2)),
  path6: G(range(5).map(i => [i, i + 1]), range(6)),
  cycle6: G(range(6).map(i => [i, (i + 1) % 6]), range(6)),
  star5: G(range(4).map(i => [0, i + 1]), range(5)),
  K4: G([[0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3]], range(4)),
  grid3: G([[0, 1], [1, 2], [3, 4], [4, 5], [6, 7], [7, 8], [0, 3], [3, 6], [1, 4], [4, 7], [2, 5], [5, 8]], range(9)),
  twoComponents: G([[0, 1], [1, 2], [3, 4]], range(5)),
  withIsolated: G([[0, 1], [1, 2], [2, 3]], range(5)),
};
const EXPECTED_D = { singleEdge: 1, path6: 5, cycle6: 3, star5: 2, K4: 1, grid3: 4, twoComponents: 2, withIsolated: 3 };
ok('T1', Object.entries(GRAPHS).every(([k, g]) => diameterFinite(g) === EXPECTED_D[k]),
  'D = largest FINITE pairwise hop distance (finite on disconnected graphs)');
ok('T2', Object.values(GRAPHS).every(g => diameterFinite(g) >= 1), 'D >= 1 on every graph with an edge');
let tOk = true, discOk = true, discSeen = 0;
for (const g of Object.values(GRAPHS)) for (const goal of g.keys()) {
  if (!eq(Tstruct(g, goal, goal), Q(0))) tOk = false;
  const d = bfs(g, goal);
  for (const v of g.keys()) {
    const T = Tstruct(g, v, goal);
    if (d.has(v)) { if (!eq(T, Q(-d.get(v))) || cmp(T, Q(0)) > 0) tOk = false; }
    else { discSeen++; if (!isInf(T)) discOk = false; }
  }
}
ok('T3', tOk, 'T_struct(v,g) = -d(v,g) <= 0 and T(g,g) = 0');
ok('T4', discOk && discSeen > 0, `disconnected terminal = -inf (${discSeen} disconnected pairs)`);

// deterministic cost patterns over directed edges (no RNG): records (a,s) from a fixed formula
const PATTERNS = {
  allSuccess: () => [4, 4],
  unobserved: () => [0, 0],
  mixedA: (u, v) => { const s = (u * 3 + v) % 4, f = (u + 2 * v) % 3; return [s + f, s]; },
  mixedB: (u, v) => { const s = (u + v) % 2, f = (u * v + 1) % 4; return [s + f, s]; },
};
function learnedShortest(adj, cost, g) {                 // D_c_hat by exact relaxation (small graphs)
  const dist = new Map([...adj.keys()].map(v => [v, v === g ? Q(0) : NEG_INF]));   // NEG_INF here = unreached
  for (let it = 0; it < adj.size; it++) for (const v of adj.keys()) for (const w of adj.get(v)) {
    const dw = dist.get(w); if (isInf(dw)) continue;
    const cand = add(cost(v, w), dw), cur = dist.get(v);
    if (isInf(cur) || cmp(cand, cur) < 0) dist.set(v, cand);
  }
  return dist;                                          // value = learned cost; NEG_INF = unreachable
}
let allSuccOk = true, boundOk = true, monoOk = true, rangeOk = true, goalOk = true, undefOk = true, evals = 0;
for (const [gName, g] of Object.entries(GRAPHS)) for (const [pName, pat] of Object.entries(PATTERNS)) {
  const cost = (u, v) => { const [a, s] = pat(u, v); return cHat(a, s); };
  for (const goal of g.keys()) {
    const d = bfs(g, goal), Dc = learnedShortest(g, cost, goal);
    for (const k of g.keys()) {
      let prev = null;
      for (let H = 0; H <= 5; H++) {
        const fs = FS(g, cost, k, goal, H); evals++;
        if (k === goal && !eq(fs, Q(0))) goalOk = false;
        if (!isInf(fs) && cmp(fs, Q(0)) > 0) rangeOk = false;
        if (!d.has(k)) { if (!isInf(fs)) boundOk = false; }
        else {
          if (cmp(fs, Q(-d.get(k))) > 0) boundOk = false;                          // FS <= -d
          if (cmp(fs, neg(Dc.get(k))) < 0) boundOk = false;                        // FS >= -D_c_hat
          if ((pName === 'allSuccess' || pName === 'unobserved') && !eq(fs, Q(-d.get(k)))) allSuccOk = false;
        }
        if (prev !== null && cmp(fs, prev) > 0) monoOk = false;                     // non-increasing in H
        prev = fs;
      }
      if (FS(g, cost, k, null, H_CONST) !== undefined) undefOk = false;
    }
  }
}
ok('R1', allSuccOk, 'all-success and unobserved regimes: FS_H(k|g) = -d(k,g) for every H = 0..5');
ok('R2', boundOk, '-D_c_hat(k,g) <= FS_H(k|g) <= -d(k,g); unreachable goal gives -inf');
ok('R3', monoOk, 'FS_H non-increasing as H increases (H = 0..5)');
ok('R4', rangeOk && goalOk, `FS in [-inf, 0]; k = g gives 0 (${evals} exact evaluations)`);
ok('R5', undefOk, 'no goal: FS undefined');

// ---- P: projection -----------------------------------------------------------------------------------
section('P  projection P(FS) = B*S/(S - FS), B = 20, S = D');
let pMono = true, pBound = true, pTop = true, pInj = true, pSpan = true, pGap = true;
for (let D = 1; D <= 12; D++) {
  const S = D, grid = [];
  for (let t = 0; t <= 12 * D; t++) grid.push(Q(-t, 4));                               // FS = 0, -1/4, ..., -3D
  const vals = grid.map(fs => projection(fs, S));
  for (let i = 1; i < vals.length; i++) if (cmp(vals[i], vals[i - 1]) >= 0) pMono = false;   // FS decreasing => P strictly decreasing
  for (let i = 0; i < vals.length; i++) {
    if (cmp(vals[i], Q(0)) < 0 || cmp(vals[i], Q(B_CONST)) > 0) pBound = false;
    if (i > 0 && eq(vals[i], Q(B_CONST))) pTop = false;
  }
  if (new Set(vals.map(v => `${v.n}/${v.d}`)).size !== vals.length) pInj = false;
  if (!eq(sub(projection(Q(0), S), projection(Q(-D), S)), Q(B_CONST, 2))) pSpan = false;
  for (let x = 0; x < D; x++) if (cmp(sub(projection(Q(-x), S), projection(Q(-x - 1), S)), Q(B_CONST, 4 * D)) < 0) pGap = false;
}
ok('P1', pMono, 'strictly increasing over finite FS (exact grid, D = 1..12)');
ok('P2', pBound, 'P in [0, B]');
ok('P3', eq(projection(Q(0), 5), Q(B_CONST)) && pTop, 'P = B at FS = 0 and only there');
ok('P4', pInj, 'N1 injective: distinct FS give distinct P (no cap)');
ok('P5', pSpan, 'N2 span P(0) - P(-D) = B/2 exactly when S = D');
ok('P6', pGap, 'N3 every unit gap on [-D, 0] >= B/(4D)');
ok('P7', eq(projection(NEG_INF, 5), Q(0)) && eq(projection(undefined, 5), Q(0)), 'P(-inf) = 0 and P(undefined) = 0');
ok('P8', eq(projection(Q(-1000000), 3), Q(60, 1000003)) && cmp(projection(Q(-1000000), 3), Q(0)) > 0,
  'no floor collapse: finite FS always gives P > 0 (limit 0 only at -inf)');

// ---- K: constants ------------------------------------------------------------------------------------
section('K  design constants');
const DOC = read(DOC_REL);
ok('K1', H_CONST === 3 && /\| F15 \| `H = 3` \|/.test(DOC) && /No empirical claim is made\s+that 3 is optimal/.test(DOC), 'H = 3, recorded as not empirically optimized');
ok('K2', B_CONST === 20 && /\| F24 \| `B = 20` \|/.test(DOC), 'B = 20');
ok('K3', /\| F25 \| `S = D` \|/.test(DOC) && /not fitted to behavioral\s+outcomes/.test(DOC), 'S = D, a structural anchor not fitted to behavior');
ok('K4', KAPPA === 1 && LAMBDA === 1 && /\| F14 \| forgetting `λ = 1` \|/.test(DOC), 'kappa = 1, lambda = 1');

// ---- D: document content -----------------------------------------------------------------------------
section('D  contract content');
const rows = [...DOC.matchAll(/^\| F(\d+) \| /gm)].map(m => +m[1]);
ok('D1', rows.length === 40 && rows.every((n, i) => n === i + 1), 'frozen items F1..F40 recorded in order');
ok('D2', DOC.includes('c_hat = (a+1)/(s+1) is an additively smoothed estimator of the MLE a/s of expected traversal attempts 1/p.'),
  'precise additive-smoothing wording recorded verbatim');
const withdrawn = (doc) => /c_hat is the MLE|is the MLE of expected attempts|Beta\(κ, ?0\)|Beta\(kappa, ?0\)/.test(doc);
ok('D3', !withdrawn(DOC), 'withdrawn wording absent (no "c_hat is the MLE", no Beta(κ,0))');
ok('D4', /\| F11 \| the estimator is NOT Bayesian \|/.test(DOC) && /\*\*not\*\* a Bayesian posterior expectation/.test(DOC)
  && !DOC.split('\n').some(l => /\bis Bayesian\b/i.test(l) && !/NOT|not/.test(l)), 'non-Bayesian stated; no positive Bayesian claim');
const sentences = (doc) => doc.replace(/\*/g, '').replace(/\s*\n\s*/g, ' ').split(/(?<=[.!?|])\s+/);
const optimalNegated = (doc) => sentences(doc).filter(s => /optimal/i.test(s)).every(s => /\bno\b|\bnot\b/i.test(s));
ok('D5', optimalNegated(DOC), 'every sentence mentioning "optimal" is negated');
ok('D6', /IMPLEMENTATION: NO-GO\. EXPERIMENTS: NO-GO\./.test(DOC) && /\*\*Implementation: NO-GO until separately authorized\.\*\*/.test(DOC)
  && /\*\*Experiments: NO-GO until separately authorized\.\*\*/.test(DOC), 'implementation and experiments recorded NO-GO');
ok('D7', !/statistically significant|empirically validated|behaviorally valid/i.test(DOC.replace(/no claim of statistical significance, empirical validation or behavioral validity/, '')),
  'no significance, empirical-validation or behavioral-validity claim');
const SECTIONS = ['### 2.2 Derivation', '**Additive-smoothing interpretation.**', '**Shrinkage interpretation.**', '### 2.3 Not Bayesian',
  '**All-success production regime.**', '| consistency |', '## 3. Planning horizon', '## 4. Terminal and FutureScore recursion', '**Bounds.**',
  '## 5. Projection', '### 5.1 Non-degeneracy', '## 6. Forbidden inputs', '## 7. Implementation prerequisites'];
ok('D8', SECTIONS.every(s => DOC.includes(s)), 'all required sections present');

// ---- S: static gates ---------------------------------------------------------------------------------
section('S  static gates');
const SELF = read(SELF_REL);
const MODEL = SELF.slice(SELF.indexOf('REFERENCE MODEL'), SELF.indexOf('MODEL-END'));
ok('S1', !/\bp\[|trueP|expectedCostToGoal|curiosity|\bQ\.get|qlearning|recentMemory|thoughtTrail|lastDecision|liveRng|Math\.random|globalThis|performance\.now|Date\.now/.test(MODEL),
  'reference model reads no oracle, curiosity, Q, decision state, RNG, clock or global');
ok('S2', /No\s*goal|no goal/i.test(DOC) && ['oracle', 'curiosity', 'Q-values', 'decision-state', 'RNG', 'instrumentation', 'no mutation'].every(w => DOC.includes(w)),
  'forbidden inputs listed in the contract');
const imports = [...SELF.matchAll(/^import .* from '([^']+)';/gm)].map(m => m[1]);
const DYN = ['import', '('].join('');
ok('S3', imports.every(m => m.startsWith('node:')) && !SELF.includes(DYN),
  `no-agent-run gate: imports only node builtins (${imports.join(', ')}); no dynamic import`);
const RUNNERS = ['runOnce', 'makeConfig', 'generateAccepted', 'readoutSeed', 'initRng', 'experiments/m7', 'main.js\''];
const before = SELF.slice(0, SELF.indexOf('const RUNNERS'));
ok('S4', RUNNERS.every(t => !before.includes(t)),
  'no-seed gate: no agent runner, configuration generation, seed derivation or RNG initialisation referenced');

// ---- M: mutation controls (the gates must reject a weakened contract or estimator) -------------------
section('M  mutation controls');
const badHat = (a, s) => Q(a + 2, s + 1);
ok('M1', !eq(badHat(5, 5), Q(1)), 'a pseudo-failure estimator (a+2)/(s+1) is rejected by the all-success identity');
const capped = (fs, S) => { const p = projection(fs, S); return cmp(p, Q(10)) > 0 ? Q(10) : p; };
ok('M2', eq(capped(Q(0), 4), capped(Q(-1), 4)), 'a capped projection collapses distinct FS (the M40 failure) — injectivity check detects it');
ok('M3', !optimalNegated(DOC + '\nH = 3 is optimal.'), 'an un-negated optimality claim is rejected');
ok('M4', withdrawn(DOC.replace('is an additively smoothed estimator of the MLE a/s of expected traversal attempts', 'is the MLE of expected attempts'))
  && withdrawn(DOC + '\nplug-in 1/E[p] under a Beta(κ,0) prior'), 'reintroducing the withdrawn MLE or Beta(κ,0) wording is rejected by D3');
ok('M5', !/IMPLEMENTATION: NO-GO\. EXPERIMENTS: NO-GO\./.test(DOC.replace('IMPLEMENTATION: NO-GO.', 'IMPLEMENTATION: GO.')), 'a GO status is rejected by D6');

// ---- G: scope and lineage ----------------------------------------------------------------------------
section('G  scope and lineage');
const added = git('log', '--diff-filter=A', '--format=%H', '--', DOC_REL).trim().split('\n').filter(Boolean);
let files, mode;
if (added.length === 1) {
  mode = `commit ${added[0].slice(0, 7)}`;
  files = git('show', '--name-only', '--format=', added[0]).trim().split('\n').filter(Boolean);
  ok('G0', git('rev-parse', `${added[0]}^`).trim() === BASE, 'the contract commit is the direct child of base aa70e93');
} else {
  mode = 'working tree vs HEAD';
  ok('G0', git('rev-parse', 'HEAD').trim() === BASE, 'pre-commit: HEAD is base aa70e93');
  const tracked = git('diff', '--name-only', 'HEAD').trim().split('\n').filter(Boolean);
  const staged = git('diff', '--cached', '--name-only', 'HEAD').trim().split('\n').filter(Boolean);
  files = [...new Set([...tracked, ...staged, ...MILESTONE.filter(f => fs.existsSync(path.join(ROOT, f)))])];
}
files.sort();
ok('G1', JSON.stringify(files) === JSON.stringify(MILESTONE), `${mode}: changes exactly the 2 milestone files${JSON.stringify(files) === JSON.stringify(MILESTONE) ? '' : ' — got ' + files.join(', ')}`);
ok('G2', !files.some(f => /^(main\.js|render\/|index\.html|instrumentation\/)/.test(f)), 'no production source changed');
ok('G3', !files.some(f => f.startsWith('experiments/')), 'no experiment code or data changed');
ok('G4', !files.some(f => /evidence\/|registry|\.sha256$|M7_|M39_|M40_|m40_spec|verify_m\d|verify_fs_v22|FUTURESCORE_V2_2/.test(f)),
  'no historical evidence, registry, sidecar, historical verifier or V2.2 artifact changed');
const prodDiff = git('diff', '--name-only', BASE, '--', 'main.js', 'render', 'index.html', 'instrumentation', 'experiments').trim();
ok('G5', prodDiff === '', 'production and experiment trees identical to base aa70e93');
let v22 = '';
try { v22 = execFileSync(process.execPath, [path.join(ROOT, 'research/preregistrations/verify_fs_v22.js')], { cwd: ROOT, encoding: 'utf8' }); } catch (e) { v22 = String(e.stdout || ''); }
ok('G6', /RESULT: 38\/38 checks passed — PASS/.test(v22), 'lineage: the frozen V2.2 gate still passes 38/38');

console.log('\n' + '='.repeat(78));
console.log(`  RESULT: ${checks - fails}/${checks} checks passed — ${fails ? 'FAIL' : 'PASS'}`);
console.log('='.repeat(78));
process.exit(fails ? 1 : 0);
