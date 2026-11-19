// M15 design calculation, revision 3 (no agent, no environment, no task run).  node m15_design_calc.mjs
// The belief about ONE kind's next kind y in {0,1,2,3} (K = 4), from a stream with ONE observation per world
// (proposal revision 3's observation unit), under the update rules of the revised arms:
//   FREQ       Dirichlet(alpha) counts, no change model (BOCPD with h = 0)
//   NEWEST     one-hot on the last observation (uniform before any)
//   WINDOW w   non-Bayesian change rule: Dirichlet(alpha) counts since the last reset; when the last w observations all
//              equal a value u that is not the current unique most probable value, reset the counts to those w
//              observations. w = 2 is "switch after two agreeing contradictions"
//   BOCPD h    Adams & MacKay (2007), Algorithm 1, constant hazard h, Dirichlet(alpha)-categorical model:
//                pi_r = (alpha + n_r[y]) / (A + r),  A = K alpha
//                growth  P(r_t = r+1, y_1:t) = P(r_{t-1} = r, y_1:t-1) pi_r (1 - h)
//                change  P(r_t = 0,   y_1:t) = sum_r P(r_{t-1} = r, y_1:t-1) pi_r h
//                run r+1 holds n_r + e_y; run 0 holds no observation
//                predictive P(y_{t+1} = j) = sum_r P(r_t = r | y_1:t) (alpha + n_r[j]) / (A + r)
// Belief quality is scored against the ENVIRONMENT'S TRUE DISTRIBUTION theta* (expected Brier under theta*), not
// against a sampled stream. Revision 1 of this file mixed two change-point conventions; revision 2 corrected it;
// revision 3 changes the evidence unit (n0 = 12 warm-up observations), adds WINDOW, the timing analysis (d), and the
// pooled calibration estimate (e) that led the proposal to h = 0.01 (h = 0.05 is predicted to be underconfident).
// Revision 3.1 adds (f), the probe sample size: it is why the proposal uses P = 64 probes per kind per world. h = 0.01
// is development-selected after section (e) showed h = 0.05 to be underconfident; h = 0.05 stays a sensitivity arm.
const K = 4;
function rules(AL) {
  const A = K * AL;
  const dir = (c) => { const s = c.reduce((a, b) => a + b, 0) + A; return c.map((x) => (x + AL) / s); };
  const freq = (obs) => { const c = new Array(K).fill(0); for (const o of obs) c[o]++; return dir(c); };
  const newest = (obs) => { const p = new Array(K).fill(obs.length ? 0 : 1 / K); if (obs.length) p[obs.at(-1)] = 1; return p; };
  const uniqueMode = (c) => { const m = Math.max(...c); const at = c.map((x, i) => (x === m ? i : -1)).filter((i) => i >= 0); return at.length === 1 ? at[0] : null; };
  const window = (w) => (obs) => {
    let c = new Array(K).fill(0);
    obs.forEach((y, t) => {
      c[y]++;
      if (t + 1 >= w) {
        const last = obs.slice(t + 1 - w, t + 1);
        if (last.every((x) => x === last[0]) && uniqueMode(c) !== last[0]) { c = new Array(K).fill(0); c[last[0]] = w; }
      }
    });
    return dir(c);
  };
  const bocpd = (h) => (obs) => {
    let runs = [{ r: 0, w: 1, n: new Array(K).fill(0) }];
    for (const y of obs) {
      const pi = runs.map((s) => (AL + s.n[y]) / (A + s.r));
      const grow = runs.map((s, i) => ({ r: s.r + 1, w: s.w * pi[i] * (1 - h), n: s.n.map((v, j) => v + (j === y ? 1 : 0)) }));
      runs = [{ r: 0, w: runs.reduce((t, s, i) => t + s.w * pi[i] * h, 0), n: new Array(K).fill(0) }, ...grow];
      const z = runs.reduce((t, s) => t + s.w, 0);
      for (const s of runs) s.w /= z;
      runs = runs.filter((s) => s.w > 1e-14);
    }
    const p = new Array(K).fill(0);
    for (const s of runs) for (let j = 0; j < K; j++) p[j] += s.w * (AL + s.n[j]) / (A + s.r);
    return p;
  };
  return { FREQ: freq, NEWEST: newest, 'WINDOW w=2': window(2), 'WINDOW w=3': window(3), 'BOCPD h=0.01': bocpd(0.01), 'BOCPD h=0.02': bocpd(0.02), 'BOCPD h=0.05': bocpd(0.05), 'BOCPD h=0.15': bocpd(0.15) };
}
const argmax = (p) => { const m = Math.max(...p); const at = p.map((x, i) => (x === m ? i : -1)).filter((i) => i >= 0); return at.length === 1 ? at[0] : -1; };
const expBrier = (p, theta) => theta.reduce((acc, tj, j) => acc + tj * p.reduce((s, pi, i) => s + (pi - (i === j ? 1 : 0)) ** 2, 0), 0);
const onehot = (v) => Array.from({ length: K }, (_, i) => (i === v ? 1 : 0));
const noisy = (v, q) => Array.from({ length: K }, (_, i) => (i === v ? 1 - q : q / (K - 1)));
let seed = 1;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const draw = (theta) => { let u = rnd(), j = 0; while (j < K - 1 && u >= theta[j]) { u -= theta[j]; j++; } return j; };

for (const AL of [0.5, 1]) {
  const R = rules(AL);
  console.log(`\n================ symmetric Dirichlet prior alpha = ${AL} ================`);
  console.log('(a) reversal: n0 = 12 warm-up observations of value 0, then m of value 1.');
  console.log('    P(next = 1) after m new observations; * marks m where value 1 is the unique most probable');
  for (const [name, f] of Object.entries(R)) {
    const row = [];
    for (let m = 0; m <= 6; m++) { const p = f([...new Array(12).fill(0), ...new Array(m).fill(1)]); row.push(`${p[1].toFixed(2)}${argmax(p) === 1 ? '*' : ' '}`); }
    console.log(`  ${name.padEnd(13)} m=0..6: ${row.join(' ')}`);
  }
  console.log('(d) detection delay (first m at which value 1 is the unique most probable) against pre-switch evidence n0:');
  console.log(`  ${'rule'.padEnd(13)} ${[4, 8, 12, 16, 22, 30].map((n) => `n0=${n}`.padStart(6)).join('')}`);
  for (const [name, f] of Object.entries(R)) {
    const cells = [4, 8, 12, 16, 22, 30].map((n0) => { for (let m = 1; m <= 40; m++) if (argmax(f([...new Array(n0).fill(0), ...new Array(m).fill(1)])) === 1) return m; return '>40'; });
    console.log(`  ${name.padEnd(13)} ${cells.map((x) => String(x).padStart(6)).join('')}`);
  }
  for (const q of [0.10, 0.25, 0.40]) {
    console.log(`(b) noise q = ${q}: 12 clean warm-up observations, then 16 noisy ones (value 0 w.p. ${1 - q}, else uniform among the others);`);
    console.log('    2,000 seeded streams; belief before each noisy observation, scored against the true distribution theta*');
    for (const [name, f] of Object.entries(R)) {
      seed = 1000 + Math.round(q * 100);
      let fa = 0, n = 0, p0 = 0, br = 0;
      const theta = noisy(0, q);
      for (let s = 0; s < 2000; s++) {
        const st = Array.from({ length: 16 }, () => draw(theta));
        for (let t = 0; t < st.length; t++) { const p = f([...new Array(12).fill(0), ...st.slice(0, t)]); n++; if (argmax(p) !== 0) fa++; p0 += p[0]; br += expBrier(p, theta); }
      }
      console.log(`  ${name.padEnd(13)} false alarms ${(100 * fa / n).toFixed(1).padStart(5)}%   mean P(true value) ${(p0 / n).toFixed(3)} (true ${(1 - q).toFixed(2)})   expected Brier ${(br / n).toFixed(3)}`);
    }
  }
  console.log('(c) stable and insufficient evidence: P(true value) and expected Brier against a deterministic relation, after n clean observations');
  for (const [name, f] of Object.entries(R)) console.log(`  ${name.padEnd(13)} ${[0, 1, 2, 5, 12, 24].map((k) => { const p = f(new Array(k).fill(0)); return `n=${k}: ${p[0].toFixed(3)}/${expBrier(p, onehot(0)).toFixed(3)}`; }).join('  ')}`);
}

// (e) Expected pooled calibration of the no-change probes (BT1's quantity), alpha = 1/2, from idealised passive
// streams (one observation per kind per world; every kind observed every world): STABLE (12 clean warm-up + 16 clean),
// NOISY (12 clean + 16 at q = 0.25), SPARSE (1 clean + 16 clean), REVERSED before its switch (12 clean + s clean,
// s uniform 2..10). At each evaluation world start, top-1 confidence c = max p and the probability that a probe
// outcome equals the top value, theta*[argmax p]; ECE over 10 equal-width bins of c, weighted by probe-point counts.
{
  const AL = 0.5, R = rules(AL);
  const sigmaOnly = (n) => new Array(n).fill(0);
  const points = [];   // [rule, confidence, expected correctness]
  const condStreams = (ruleName, f) => {
    const add = (prefix, evalStream, thetaOf) => { for (let w = 0; w < evalStream.length; w++) { const p = f([...prefix, ...evalStream.slice(0, w)]); const a = argmax(p); const c = Math.max(...p); points.push([ruleName, c, a < 0 ? 1 / K : thetaOf(w)[a]]); } };
    seed = 777;
    for (let rep = 0; rep < 400; rep++) {
      add(sigmaOnly(12), sigmaOnly(16), () => onehot(0));                                            // STABLE
      const th = noisy(0, 0.25); add(sigmaOnly(12), Array.from({ length: 16 }, () => draw(th)), () => th);   // NOISY
      add(sigmaOnly(1), sigmaOnly(16), () => onehot(0));                                             // SPARSE
      const s = 2 + Math.floor(rnd() * 9); add(sigmaOnly(12), sigmaOnly(s), () => onehot(0));         // REVERSED pre-switch
    }
  };
  for (const name of ['FREQ', 'WINDOW w=2', 'WINDOW w=3', 'BOCPD h=0.01', 'BOCPD h=0.02', 'BOCPD h=0.05']) condStreams(name, R[name]);
  console.log('\n(e) expected pooled no-change calibration, alpha = 1/2 (idealised passive streams): top-1 ECE, mean confidence, mean expected accuracy');
  for (const name of ['FREQ', 'WINDOW w=2', 'WINDOW w=3', 'BOCPD h=0.01', 'BOCPD h=0.02', 'BOCPD h=0.05']) {
    const pts = points.filter((x) => x[0] === name), bins = Array.from({ length: 10 }, () => ({ n: 0, c: 0, a: 0 }));
    for (const [, c, a] of pts) { const b = bins[Math.min(9, Math.floor(c * 10))]; b.n++; b.c += c; b.a += a; }
    const ece = bins.reduce((t, b) => t + (b.n ? (b.n / pts.length) * Math.abs(b.a / b.n - b.c / b.n) : 0), 0);
    console.log(`  ${name.padEnd(13)} ECE ${ece.toFixed(3)}   mean confidence ${(pts.reduce((t, x) => t + x[1], 0) / pts.length).toFixed(3)}   mean expected accuracy ${(pts.reduce((t, x) => t + x[2], 0) / pts.length).toFixed(3)}`);
  }
}

// (f) Probe sample size (revision 3.1). Idealised passive streams for n = 165 labels x 4 kinds, no-change phases as
// in (e); beliefs of UA (BOCPD h = 0.01) and NEWEST at every evaluation-world start. For P probe outcomes per kind
// per world, drawn from theta* and IDENTICAL for both mechanisms, the Monte Carlo error that probe sampling adds:
//   per label: probe Brier minus exact expected Brier (UA), and the same for the contrast NEWEST - UA;
//   pooled: empirical top-1 ECE from probe outcomes against the exact ECE (expected accuracy theta*[argmax p]), and
//   the probe AUROC of top-1 confidence for correctness; their spread over 20 independent probe draws.
// Compared with the between-label SD of the exact quantities, which is what the bootstrap intervals reflect.
{
  const AL = 0.5, R = rules(AL), UA = R['BOCPD h=0.01'], NW = R.NEWEST;
  const sigmaOnly = (n) => new Array(n).fill(0);
  const NL = 165;
  seed = 4242;
  const labels = [];
  for (let l = 0; l < NL; l++) {
    const pts = [];
    for (let k = 0; k < K; k++) {
      const phase = (prefix, ev, thetaOf) => { for (let w = 0; w < ev.length; w++) { const o = [...prefix, ...ev.slice(0, w)]; pts.push({ pu: UA(o), pn: NW(o), th: thetaOf(w) }); } };
      phase(sigmaOnly(12), sigmaOnly(16), () => onehot(0));
      const th = noisy(0, 0.25); phase(sigmaOnly(12), Array.from({ length: 16 }, () => draw(th)), () => th);
      phase(sigmaOnly(1), sigmaOnly(16), () => onehot(0));
      const s = 2 + Math.floor(rnd() * 9); phase(sigmaOnly(12), sigmaOnly(s), () => onehot(0));
    }
    labels.push(pts);
  }
  const bri = (p, j) => p.reduce((s, v, i) => s + (v - (i === j ? 1 : 0)) ** 2, 0);
  const sd = (xs) => { const m = xs.reduce((a, b) => a + b, 0) / xs.length; return Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / (xs.length - 1)); };
  const exactUA = labels.map((pts) => pts.reduce((s, x) => s + expBrier(x.pu, x.th), 0) / pts.length);
  const exactC = labels.map((pts) => pts.reduce((s, x) => s + expBrier(x.pn, x.th) - expBrier(x.pu, x.th), 0) / pts.length);
  const allPts = labels.flat();
  const eceExact = (() => { const b = Array.from({ length: 10 }, () => ({ n: 0, c: 0, a: 0 })); for (const x of allPts) { const c = Math.max(...x.pu), a = argmax(x.pu); const bb = b[Math.min(9, Math.floor(c * 10))]; bb.n++; bb.c += c; bb.a += a < 0 ? 1 / K : x.th[a]; } return b.reduce((t, v) => t + (v.n ? (v.n / allPts.length) * Math.abs(v.a / v.n - v.c / v.n) : 0), 0); })();
  console.log(`\n(f) probe sample size, n = ${NL} labels, ${allPts.length / NL} no-change belief points per label (4 kinds), UA = BOCPD h = 0.01, alpha = 1/2`);
  console.log(`    between-label SD of the exact per-label quantities: UA expected Brier ${sd(exactUA).toFixed(4)}; NEWEST - UA ${sd(exactC).toFixed(4)}; exact pooled ECE (UA) ${eceExact.toFixed(4)}`);
  console.log('    P   MC SD per-label UA probe Brier   MC SD per-label NEWEST-UA   pooled probe ECE: mean (MC SD)   probe AUROC: mean (MC SD)');
  for (const P of [8, 16, 32, 64]) {
    seed = 9000 + P;
    const errUA = [], errC = [], eces = [], aucs = [];
    for (let rep = 0; rep < 20; rep++) {
      const bins = Array.from({ length: 10 }, () => ({ n: 0, c: 0, a: 0 })); const scored = [];
      labels.forEach((pts, l) => {
        let su = 0, sn = 0, m = 0;
        for (const x of pts) for (let i = 0; i < P; i++) {
          const y = draw(x.th); su += bri(x.pu, y); sn += bri(x.pn, y); m++;
          const c = Math.max(...x.pu), a = argmax(x.pu), ok = a === y ? 1 : 0;
          const bb = bins[Math.min(9, Math.floor(c * 10))]; bb.n++; bb.c += c; bb.a += ok; scored.push([c, ok]);
        }
        if (rep === 0) { errUA.push(su / m - exactUA[l]); errC.push((sn - su) / m - exactC[l]); }
      });
      eces.push(bins.reduce((t, v) => t + (v.n ? (v.n / scored.length) * Math.abs(v.a / v.n - v.c / v.n) : 0), 0));
      scored.sort((a, b) => a[0] - b[0]);
      let rankSumPos = 0, nPos = 0, i = 0;
      while (i < scored.length) { let j = i; while (j < scored.length && scored[j][0] === scored[i][0]) j++; const avg = (i + 1 + j) / 2; for (let t = i; t < j; t++) if (scored[t][1]) { rankSumPos += avg; nPos++; } i = j; }
      const nNeg = scored.length - nPos; aucs.push((rankSumPos - nPos * (nPos + 1) / 2) / (nPos * nNeg));
    }
    const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
    console.log(`  ${String(P).padStart(3)}   ${sd(errUA).toFixed(4).padStart(10)}                     ${sd(errC).toFixed(4).padStart(10)}                ${mean(eces).toFixed(4)} (${sd(eces).toFixed(4)})               ${mean(aucs).toFixed(4)} (${sd(aucs).toFixed(4)})`);
  }
}
