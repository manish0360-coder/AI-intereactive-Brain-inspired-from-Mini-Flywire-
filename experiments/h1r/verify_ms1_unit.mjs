// ==========================================================
// H1-R MS-1 — unit verification of the score probe and the measurement sink (D-019 §5 as amended by D-022)
// ==========================================================
//   N1   text: one tagged line, the pinned template, immediately before the clamp-return; stripped file = B2
//   N2   form: reads two locals, calls one sink, assigns nothing, no other identifier (static)
//   N4a  neutral when present: ≥ 10,000 random input sets at identical RNG state give the same return value, the
//        same lastArbitrationBreakdown and the same RNG position (all three streams) without and with the sink
//   N5′  pinned sink and binding: static (byte-exact source, imports, no global) and at installation (descriptors,
//        isProxy, frozen, function identity); overwrite and redefinition attempts fail
//   N6a  exact pre-clamp fidelity: against a hash-recorded, test-only copy of B2's render/scoring.js whose only
//        change is the return line (`    return finalWeight;`), on ≥ 10,000 input sets with |F| > 400 at both bounds
//   N6b  (unit part) Object.is(clamp(recorded F), returned) and recorded term = 12·(T − 0.5) for every call
//   N7   anti-vacuity: each of the eight D-019 §5 N7 cases is built and must be caught by its named check
//
// Every scenario that binds the sink runs in its own child process (the binding is non-configurable by design).
// The oracle lives outside every run tree (os.tmpdir()/mfw-h1r/n6a-oracle-*) and is never loaded by a run.
//
//   node experiments/h1r/verify_ms1_unit.mjs          (writes experiments/h1r/$H1R_EVIDENCE/ms1_unit.json)
// ==========================================================
import { execFile } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { SCORE_PROBE, SCORE_RETURN } from './conformance_transform.mjs';
import { createMeasure } from './measure.mjs';
import { installMeasure, verifySinkBinding, verifySinkSource, SCORE_SOURCE, SINK_NAME } from './measure_install.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
export const B2_SCORING_SHA256 = '4a13316698b52a2132d969c838d79f9d3ccc97a853bc5e3fa947fd43fac566d5';
const N_INPUTS = 12000;
const TAG = '// H1R M-SCORE';

// ---------------- static checks (exported for verify_conformance.mjs) ----------------
/** N1 on a conformed render/scoring.js text against B2's bytes. */
export function checkN1(text, b2Text) {
  const L = text.split('\n');
  const tagged = L.map((l, i) => l.includes(TAG) ? i : -1).filter(i => i >= 0);
  const i = tagged.length === 1 ? tagged[0] : -1;
  const stripped = i >= 0 ? [...L.slice(0, i), ...L.slice(i + 1)].join('\n') : null;
  const r = { taggedLines: tagged.length, template: i >= 0 && L[i] === SCORE_PROBE, beforeReturn: i >= 0 && L[i + 1] === SCORE_RETURN,
    strippedSha256: stripped === null ? null : sha(Buffer.from(stripped, 'utf8')) };
  r.strippedEqualsB2 = stripped !== null && stripped === b2Text && r.strippedSha256 === B2_SCORING_SHA256;
  r.ok = r.taggedLines === 1 && r.template && r.beforeReturn && r.strippedEqualsB2;
  return r;
}
/** N2 on every tagged line: reads finalWeight and trustBonus, one call (the sink's score), no assignment, no other identifier. */
export function checkN2(text) {
  const lines = text.split('\n').filter(l => l.includes(TAG));
  const per = lines.map(l => {
    const code = l.slice(0, l.indexOf('//')).trim();
    const ids = [...code.replace(/(['"`])(?:\\.|(?!\1).)*\1/g, '').matchAll(/[A-Za-z_$][A-Za-z0-9_$]*/g)].map(m => m[0]);
    const allowed = new Set(['if', 'globalThis', '__H1R_MEASURE__', 'score', 'finalWeight', 'trustBonus']);
    const other = [...new Set(ids.filter(x => !allowed.has(x)))];
    const assigns = /(^|[^=!<>])=(?!=)|\+\+|--|[+\-*/%&|^]=|<<=|>>=/.test(code.replace(/===|!==|=>/g, ''));
    const calls = (code.match(/\(/g) || []).length - 1;           // minus the `if (` paren
    const sinkCalls = (code.match(/globalThis\.__H1R_MEASURE__\.score\(/g) || []).length;
    return { other, assigns, calls, sinkCalls, readsBoth: ids.includes('finalWeight') && ids.includes('trustBonus'),
      ok: other.length === 0 && !assigns && calls === 1 && sinkCalls === 1 && ids.includes('finalWeight') && ids.includes('trustBonus') };
  });
  return { lines: lines.length, per, ok: lines.length > 0 && per.every(p => p.ok) };
}

// ---------------- input sets (a local generator; never an agent stream) ----------------
function mulberry(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export function inputSets(n = N_INPUTS) {
  const r = mulberry(0x4D53314E), U = (a, b) => a + (b - a) * r(), pick = (xs) => xs[Math.floor(r() * xs.length)];
  const out = [];
  for (let i = 0; i < n; i++) {
    const x = {
      transitionBoost: U(0, 6), qValue: U(-3, 8), reward: U(-5, 15), habitBoost: U(0, 7), curiosityBoost: U(0, 3), chainReward: U(0, 4),
      meaningBoost: U(0, 3), futureBonus: U(-2, 4), boredomPenalty: U(0, 3), repetitionPenalty: r() < 0.7 ? 0 : U(0, 3),
      localConfidence: U(0, 2), localStress: U(0, 2), localFatigue: U(0, 2), localTrust: U(0, 2), localFear: U(0, 2),
      curiosityState: U(0, 0.3), confidenceState: U(0, 100), stressState: U(0, 40), fatigueState: U(0, 160), focusState: U(0, 20),
      dangerPenalty: U(0, 10), selfLoopPenalty: r() < 0.8 ? 0 : U(0, 20), bayesianTrust: r() < 0.25 ? 0.5 : r(),
      goalGradientBoost: U(-3, 5), schemaBonus: U(0, 1), trajectoryIntegrity: U(0, 1), semanticVitalityScore: U(0, 3),
      noiseSuppressedScore: U(0, 3), consolidationBonus: U(0, 3), attentionAmplifiedScore: U(0, 5), uncertaintyScore: U(0, 2),
      dominantDrive: pick(['hunger', 'boredom', 'stress', 'fatigue', null]),
      executiveWeights: r() < 0.5 ? null : { exploit: U(0.5, 1.5), explore: U(0.5, 1.5) },
      uncertaintyState: U(0, 1), transitionUncertainty: U(0, 1), sequenceError: U(0, 1),
    };
    if (i % 6 === 4) x.trajectoryIntegrity = U(12, 30);        // forces F > 400
    if (i % 6 === 5) x.repetitionPenalty = U(8, 14);           // forces F < −400
    out.push({ seed: 1000 + i, x });
  }
  return out;
}

// ---------------- child: one scenario ----------------
async function child(spec) {
  const res = { scenario: spec.scenario };
  const SC = await import(pathToFileURL(path.join(spec.tree, 'render', 'scoring.js')).href);
  const RNG = await import(pathToFileURL(path.join(spec.tree, 'instrumentation', 'rng.js')).href);
  const OR = await import(pathToFileURL(path.join(spec.oracle, 'render', 'scoring.js')).href);
  const ORNG = await import(pathToFileURL(path.join(spec.oracle, 'instrumentation', 'rng.js')).href);
  const sets = inputSets();
  const breakdown = () => { const b = SC.lastArbitrationBreakdown; return b ? Object.entries(b) : null; };
  const nextRng = (R) => ['cognitive', 'visual', 'environment'].map(s => R.rng(s));
  const callAll = () => sets.map(({ seed, x }) => { RNG.initRng(seed); const ret = SC.calculateDecisionScore({ ...x }); return { ret, br: breakdown(), rng: nextRng(RNG) }; });
  // phase A: no sink bound
  const A = spec.n4a ? callAll() : null;
  // bind the sink as the scenario says
  let M = null;
  if (spec.bind === 'install') M = installMeasure();
  else if (spec.bind === 'mutantSource') {
    const { createMeasure: cm } = await import(pathToFileURL(spec.mutantSource).href);
    M = cm(); Object.defineProperty(globalThis, SINK_NAME, { value: M, writable: false, configurable: false });
  } else if (spec.bind === 'accessor') {
    M = createMeasure(); const real = M;
    const fake = { ...real, score: (f, t) => real.score(Math.abs(f) > 400 ? Math.sign(f) * 400 : f, t) };
    Object.defineProperty(globalThis, SINK_NAME, { get() { return fake; }, configurable: false });
  } else if (spec.bind === 'proxy') {
    M = createMeasure(); const real = M;
    const p = new Proxy({}, { get(_, k) { return k === 'score' ? (f, t) => real.score(Math.abs(f) > 400 ? Math.sign(f) * 400 : f, t) : real[k]; } });
    Object.defineProperty(globalThis, SINK_NAME, { value: p, writable: false, configurable: false });
  }
  if (spec.setArm) globalThis.__H1R_ARM__ = spec.setArm;
  res.binding = verifySinkBinding(globalThis, spec.bind === 'install' ? M.score : undefined);
  if (spec.bind === 'install') {   // overwrite and redefinition attempts must fail
    let w = false, d = false, s = false;
    try { globalThis[SINK_NAME] = {}; } catch { w = true; }
    try { Object.defineProperty(globalThis, SINK_NAME, { value: {} }); } catch { d = true; }
    try { M.score = () => {}; } catch { s = true; }
    res.tamper = { overwriteRefused: w && globalThis[SINK_NAME] === M, redefineRefused: d && globalThis[SINK_NAME] === M, scoreReplaceRefused: s && M.score.toString() === SCORE_SOURCE };
  }
  // phase B: sink bound; then the oracle at the same RNG seed
  const B = callAll();
  const O = sets.map(({ seed, x }) => { ORNG.initRng(seed); return OR.calculateDecisionScore({ ...x }); });
  const S = M ? M.record().score : [];
  // N4a
  if (A) {
    let ret = 0, br = 0, rng = 0;
    for (let i = 0; i < sets.length; i++) {
      if (!Object.is(A[i].ret, B[i].ret)) ret++;
      const a = A[i].br, b = B[i].br;
      if (!a || !b || a.length !== b.length || a.some(([k, v], j) => b[j][0] !== k || !Object.is(v, b[j][1]))) br++;
      if (A[i].rng.some((v, j) => !Object.is(v, B[i].rng[j]))) rng++;
    }
    res.n4a = { n: sets.length, returnMismatch: ret, breakdownMismatch: br, rngPositionMismatch: rng };
  }
  // N6a / N6b (unit)
  const pairs = S.length / 2;
  res.pairing = { calls: sets.length, sinkPairs: pairs };
  if (pairs === sets.length) {
    let mm = 0, mmHigh = 0, mmLow = 0, mmIn = 0, high = 0, low = 0, clampMm = 0, termMm = 0;
    for (let i = 0; i < sets.length; i++) {
      const F = S[2 * i], t = S[2 * i + 1], f = O[i];
      if (f > 400) high++; else if (f < -400) low++;
      if (!Object.is(F, f)) { mm++; if (f > 400) mmHigh++; else if (f < -400) mmLow++; else mmIn++; }
      if (!Object.is(Math.max(-400, Math.min(400, F)), B[i].ret)) clampMm++;
      if (!Object.is(t, 12 * (sets[i].x.bayesianTrust - 0.5))) termMm++;
    }
    res.n6a = { n: sets.length, high, low, mismatch: mm, mismatchHigh: mmHigh, mismatchLow: mmLow, mismatchInRange: mmIn };
    res.n6b = { clampMismatch: clampMm, termMismatch: termMm };
  }
  return res;
}

// ---------------- main ----------------
async function main() {
  const { buildTree } = await import('./build_tree.mjs');
  const EVID = path.join(HERE, process.env.H1R_EVIDENCE || 'evidence');
  fs.mkdirSync(EVID, { recursive: true });
  const TMPS = [...new Set([(() => { try { return fs.realpathSync.native(os.tmpdir()); } catch { return os.tmpdir(); } })(), os.tmpdir()])];
  // evidence never records the local temp-directory prefix, raw or JSON-escaped (it contains the machine account name)
  const shown = (p) => TMPS.flatMap(t => [t, JSON.stringify(t).slice(1, -1)]).reduce((s, t) => s.split(t).join('<tmp>'), String(p));
  const C = buildTree(), P = buildTree({ pristine: true });
  const confText = fs.readFileSync(path.join(C.dir, 'render', 'scoring.js'), 'utf8');
  const b2Buf = fs.readFileSync(path.join(P.dir, 'render', 'scoring.js')), b2Text = b2Buf.toString('utf8');
  const rngB2 = fs.readFileSync(path.join(P.dir, 'instrumentation', 'rng.js'));
  if (sha(b2Buf) !== B2_SCORING_SHA256) throw new Error('B2 render/scoring.js does not hash to the D-019 value');
  // the N6a oracle: B2's scoring.js with only the return line replaced; its own copy of B2's rng.js
  const oracleText = b2Text.split('\n').map(l => l === SCORE_RETURN ? '    return finalWeight;' : l).join('\n');
  const oDiff = b2Text.split('\n').map((l, i) => l === oracleText.split('\n')[i] ? -1 : i).filter(i => i >= 0);
  const oracleSha = sha(Buffer.from(oracleText, 'utf8'));
  const ORACLE = path.join(fs.realpathSync.native(os.tmpdir()), 'mfw-h1r', `n6a-oracle-${oracleSha.slice(0, 12)}`);
  fs.mkdirSync(path.join(ORACLE, 'render'), { recursive: true }); fs.mkdirSync(path.join(ORACLE, 'instrumentation'), { recursive: true });
  fs.writeFileSync(path.join(ORACLE, 'render', 'scoring.js'), oracleText); fs.writeFileSync(path.join(ORACLE, 'instrumentation', 'rng.js'), rngB2);
  // probe mutants (N7 a–d): each a copy of the conformed render/scoring.js + rng.js in its own directory
  const probeMutant = (name, edit) => { const dir = `${C.dir}-n7-${name}`; const t = edit(confText);
    fs.mkdirSync(path.join(dir, 'render'), { recursive: true }); fs.mkdirSync(path.join(dir, 'instrumentation'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'render', 'scoring.js'), t); fs.copyFileSync(path.join(C.dir, 'instrumentation', 'rng.js'), path.join(dir, 'instrumentation', 'rng.js'));
    return { dir, text: t }; };
  const swapProbe = (t, line) => { if (t.split(SCORE_PROBE).length !== 2) throw new Error('probe not found'); return t.replace(SCORE_PROBE, line); };
  const MUT = {
    afterClamp: probeMutant('afterclamp', t => swapProbe(t, '').replace(SCORE_RETURN,
      `    const _h1rClamped = Math.max(-400, Math.min(400, finalWeight));\n    if (globalThis.__H1R_MEASURE__) globalThis.__H1R_MEASURE__.score(_h1rClamped, trustBonus * 1.5); ${TAG}\n    return _h1rClamped;`).replace(/\n\n    const _h1rClamped/, '\n    const _h1rClamped')),
    assigns: probeMutant('assigns', t => swapProbe(t, `    if (globalThis.__H1R_MEASURE__) globalThis.__H1R_MEASURE__.score(finalWeight = finalWeight * 1.000001, trustBonus * 1.5); ${TAG}`)),
    draws: probeMutant('draws', t => swapProbe(t, `    if (globalThis.__H1R_MEASURE__) globalThis.__H1R_MEASURE__.score(finalWeight, trustBonus * 1.5 + 0 * liveRng()); ${TAG}`)),
    second: probeMutant('second', t => swapProbe(t, `${SCORE_PROBE}\n${SCORE_PROBE}`)),
  };
  // sink mutants (N7 e, g, h): measure.mjs with only the pinned score line replaced
  const measureText = fs.readFileSync(path.join(HERE, 'measure.mjs'), 'utf8');
  const SINKDIR = path.join(fs.realpathSync.native(os.tmpdir()), 'mfw-h1r', 'n7-sinks');
  fs.mkdirSync(SINKDIR, { recursive: true });
  const CODE = `    ${SCORE_SOURCE},`;          // the code line (the header comment also quotes the source)
  const sinkMutant = (name, line) => { if (measureText.split(CODE).length !== 2) throw new Error('pinned score line not found');
    const t = measureText.replace(CODE, `    ${line},`); const f = path.join(SINKDIR, `measure_${name}.mjs`); fs.writeFileSync(f, t); return { file: f, text: t }; };
  const SINK = {
    transform: sinkMutant('transform', 'score(f, t) { S.push(Math.abs(f) > 400 ? Math.sign(f) * 400 : f, t); }'),
    arm: sinkMutant('arm', "score(f, t) { S.push(globalThis.__H1R_ARM__ === 'A1' && Math.abs(f) > 400 ? Math.sign(f) * 400 : f, t); }"),
    run: sinkMutant('run', 'score(f, t) { S.push(process.argv.length > 2 && Math.abs(f) > 400 ? Math.sign(f) * 400 : f, t); }'),
  };
  // children
  const runChild = (spec) => new Promise((res) => execFile(process.execPath, [fileURLToPath(import.meta.url), '--child', JSON.stringify({ oracle: ORACLE, ...spec })],
    { maxBuffer: 1 << 26 }, (e, out, err) => { const i = out ? out.indexOf('@@MS1U@@') : -1;
      res(i < 0 ? { scenario: spec.scenario, error: shown(String(err || (e && e.message))).slice(-2000) } : JSON.parse(out.slice(i + 8))); }));
  const specs = [
    { scenario: 'clean', tree: C.dir, bind: 'install', n4a: true },
    { scenario: 'afterClamp', tree: MUT.afterClamp.dir, bind: 'install', n4a: true },
    { scenario: 'assigns', tree: MUT.assigns.dir, bind: 'install', n4a: true },
    { scenario: 'draws', tree: MUT.draws.dir, bind: 'install', n4a: true },
    { scenario: 'second', tree: MUT.second.dir, bind: 'install', n4a: true },
    { scenario: 'sinkTransform', tree: C.dir, bind: 'mutantSource', mutantSource: SINK.transform.file },
    { scenario: 'accessor', tree: C.dir, bind: 'accessor' },
    { scenario: 'proxy', tree: C.dir, bind: 'proxy' },
    { scenario: 'sinkArm', tree: C.dir, bind: 'mutantSource', mutantSource: SINK.arm.file, setArm: 'A1' },
    { scenario: 'sinkRun', tree: C.dir, bind: 'mutantSource', mutantSource: SINK.run.file },
  ];
  const R = Object.fromEntries((await Promise.all(specs.map(runChild))).map(r => [r.scenario, r]));
  // install-time refusal of each sink mutant (on a scratch global object)
  const installRefuses = async (file) => { const { createMeasure: cm } = await import(pathToFileURL(file).href);
    try { installMeasure({}, cm); return false; } catch (e) { return /fails N5′/.test(e.message); } };
  const G = [];
  const gate = (id, name, pass, evidence) => G.push({ id, name, status: pass ? 'PASS' : 'FAIL', evidence });
  const c = R.clean;
  const errs = Object.values(R).filter(r => r.error);
  gate('U0', 'every unit scenario ran to completion', errs.length === 0, errs.map(e => `${e.scenario}: ${e.error.slice(-300)}`).join(' | ') || `${specs.length} scenarios`);
  const n1 = checkN1(confText, b2Text), n2 = checkN2(confText);
  gate('N1', 'text: exactly one `// H1R M-SCORE` line, equal to the pinned template, immediately before the clamp-return; with it removed the file is B2 byte for byte (SHA-256 4a133166…66d5)',
    n1.ok, JSON.stringify(n1));
  gate('N2', 'form: the probe reads finalWeight and trustBonus, makes one call (the sink score), assigns nothing and names no other identifier (no RNG, Date.now, I/O, import, export)',
    n2.ok, JSON.stringify(n2.per));
  gate('N4a', `neutral when present: ${N_INPUTS} random input sets at identical RNG state give the same return value, lastArbitrationBreakdown and RNG position (cognitive, visual, environment) without and with the sink`,
    !c.error && c.n4a.n >= 10000 && c.n4a.returnMismatch === 0 && c.n4a.breakdownMismatch === 0 && c.n4a.rngPositionMismatch === 0, JSON.stringify(c.n4a));
  const src = verifySinkSource(measureText);
  gate("N5'", 'pinned sink and binding: static (byte-exact score, S private, Node built-ins only, no global) and at installation (own data property, non-writable, non-configurable, frozen non-Proxy ordinary object, score own non-writable, pinned source, function identity); overwrite/redefinition refused',
    src.ok && !c.error && c.binding.ok && c.tamper.overwriteRefused && c.tamper.redefineRefused && c.tamper.scoreReplaceRefused,
    `static ${JSON.stringify(src)}; installation ${JSON.stringify(c.binding)}; tamper ${JSON.stringify(c.tamper)}`);
  gate('N6a', 'exact pre-clamp fidelity: every recorded F is Object.is-equal to the oracle (B2 scoring.js returning finalWeight) at the same RNG state, |F| > 400 at both bounds included',
    !c.error && c.n6a.n >= 10000 && c.n6a.mismatch === 0 && c.n6a.high >= 1000 && c.n6a.low >= 1000 && c.pairing.sinkPairs === c.pairing.calls,
    `oracle ${shown(ORACLE)} SHA-256 ${oracleSha} (differs from B2 in ${oDiff.length} line: ${oDiff.map(i => i + 1).join(',')}); ${JSON.stringify(c.n6a)}`);
  gate('N6b-U', 'clamp consistency and trust term (unit): Object.is(clamp(recorded F), returned) and recorded term = 12·(T − 0.5) for every call',
    !c.error && c.n6b.clampMismatch === 0 && c.n6b.termMismatch === 0, JSON.stringify(c.n6b));
  // N7: each case must be caught by its named check
  const ac = R.afterClamp, as = R.assigns, dr = R.draws, se = R.second, st = R.sinkTransform, ax = R.accessor, px = R.proxy, sa = R.sinkArm, sr = R.sinkRun;
  const n1m = (t) => checkN1(t, b2Text), n2m = (t) => checkN2(t);
  const ok = (r) => r && !r.error;
  const sinkStatic = (m) => !verifySinkSource(m.text).ok;
  const n7 = [
    ['a', 'a probe placed after the clamp — caught by N1 and by N6a only on inputs with |F| > 400',
      !n1m(MUT.afterClamp.text).ok && ok(ac) && ac.n6a.mismatchHigh > 0 && ac.n6a.mismatchLow > 0 && ac.n6a.mismatchInRange === 0,
      `N1 ok=${n1m(MUT.afterClamp.text).ok}; N6a ${ok(ac) ? JSON.stringify(ac.n6a) : ac && ac.error}`],
    ['b', 'a probe that assigns — caught by N2 (and N1, N4a)', !n2m(MUT.assigns.text).ok && !n1m(MUT.assigns.text).ok && ok(as) && as.n4a.returnMismatch > 0,
      `N2 ok=${n2m(MUT.assigns.text).ok}; N1 ok=${n1m(MUT.assigns.text).ok}; N4a ${ok(as) ? JSON.stringify(as.n4a) : as && as.error}`],
    ['c', 'a probe that draws a random number — caught by N4a (RNG position) and N2', !n2m(MUT.draws.text).ok && ok(dr) && dr.n4a.rngPositionMismatch > 0,
      `N2 ok=${n2m(MUT.draws.text).ok}; N4a ${ok(dr) ? JSON.stringify(dr.n4a) : dr && dr.error}`],
    ['d', 'a second tagged line — caught by N1 (and the score/candidate pairing)', !n1m(MUT.second.text).ok && n1m(MUT.second.text).taggedLines === 2 && ok(se) && se.pairing.sinkPairs === 2 * se.pairing.calls,
      `N1 tagged lines ${n1m(MUT.second.text).taggedLines}; pairs ${ok(se) ? se.pairing.sinkPairs : '?'} for ${ok(se) ? se.pairing.calls : '?'} calls`],
    ['e', 'a sink that transforms the value only when |F| > 400 — caught by the N6a oracle (only above 400) and by N5′ (static and installation)',
      ok(st) && st.n6a.mismatchHigh > 0 && st.n6a.mismatchLow > 0 && st.n6a.mismatchInRange === 0 && sinkStatic(SINK.transform) && await installRefuses(SINK.transform.file),
      `N6a ${ok(st) ? JSON.stringify(st.n6a) : st && st.error}; N5′ static fails ${sinkStatic(SINK.transform)}; install refuses ${await installRefuses(SINK.transform.file)}`],
    ['f', 'a Proxy or accessor binding that rewrites arguments — caught by N5′ at installation (and by N6a)',
      ok(ax) && !ax.binding.ok && ax.n6a.mismatch > 0 && ok(px) && !px.binding.ok && px.n6a.mismatch > 0,
      `accessor: ${ok(ax) ? ax.binding.problems.join('; ') + ', N6a mismatches ' + ax.n6a.mismatch : ax && ax.error} | proxy: ${ok(px) ? px.binding.problems.join('; ') + ', N6a mismatches ' + px.n6a.mismatch : px && px.error}`],
    ['g', "a sink conditioned on the arm — caught by N5′'s source pin (static and installation)",
      sinkStatic(SINK.arm) && await installRefuses(SINK.arm.file) && ok(sa) && sa.n6a.mismatch > 0,
      `static ${JSON.stringify(verifySinkSource(SINK.arm.text).problems)}; install refuses ${await installRefuses(SINK.arm.file)}; (unbound demonstration: N6a mismatches ${ok(sa) ? sa.n6a.mismatch : '?'})`],
    ['h', "a sink conditioned on run identity — caught by N5′'s source pin (static and installation)",
      sinkStatic(SINK.run) && await installRefuses(SINK.run.file) && ok(sr) && sr.n6a.mismatch > 0,
      `static ${JSON.stringify(verifySinkSource(SINK.run.text).problems)}; install refuses ${await installRefuses(SINK.run.file)}; (unbound demonstration: N6a mismatches ${ok(sr) ? sr.n6a.mismatch : '?'})`],
  ];
  for (const [k, name, pass, ev] of n7) gate(`N7${k}`, name, pass, ev);
  const summary = { generatedBy: 'experiments/h1r/verify_ms1_unit.mjs', conformedTree: shown(C.dir), transformSha256: C.manifest.transformSha256,
    b2ScoringSha256: B2_SCORING_SHA256, oracle: { path: shown(ORACLE), sha256: oracleSha, linesChanged: oDiff.map(i => i + 1) }, inputSets: N_INPUTS,
    measureSha256: sha(fs.readFileSync(path.join(HERE, 'measure.mjs'))), gates: G, scenarios: R };
  fs.writeFileSync(path.join(EVID, 'ms1_unit.json'), shown(JSON.stringify(summary, null, 1)));
  for (const g of G) console.log(`${g.status.padEnd(5)} ${g.id.padEnd(6)} ${g.name}\n      ${g.evidence}`);
  const fails = G.filter(g => g.status === 'FAIL').length;
  console.log(`\n${G.length - fails} PASS, ${fails} FAIL`);
  process.exitCode = fails ? 1 : 0;
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked && process.argv[2] === '--child') process.stdout.write('@@MS1U@@' + JSON.stringify(await child(JSON.parse(process.argv[3]))));
else if (invoked) await main();
