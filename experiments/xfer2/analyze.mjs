// ==========================================================
// XFER-2 — analysis of one orchestrated block (descriptive; every rule is declared in config.mjs)
// ==========================================================
//   node analyze.mjs --in <block run dir> [--out <summary.json>]
// REFUSES a block whose manifest, design digest, delivery exactness or pairing is not intact (reports it INVALID instead of
// interpreting any endpoint).  Primary estimand: goal reaches (E1), paired by world; R(X) = benefit(X) / benefit(REAL).
// ==========================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as C from './config.mjs';
import { prng, pairedSummary, mean } from '../xfer1/stats.mjs';
import { deliveryProblems } from './checks.mjs';

/** percentile bootstrap interval of mean(num)/mean(den) over worlds; undefined when the denominator is not reliably > 0 */
export function ratioCi(num, den, { replicates, seed, level }) {
  const n = num.length;
  if (n === 0) return null;
  const r = prng(seed), vals = [];
  let invalid = 0;
  for (let b = 0; b < replicates; b++) {
    let sn = 0, sd = 0;
    for (let i = 0; i < n; i++) { const k = Math.floor(r() * n); sn += num[k]; sd += den[k]; }
    if (sd <= 0) { invalid++; continue; }
    vals.push(sn / sd);
  }
  if (invalid / replicates > 0.025) return { lower: null, upper: null, invalidFraction: invalid / replicates };
  vals.sort((a, b) => a - b);
  const lo = (1 - level) / 2, at = (q) => vals[Math.min(vals.length - 1, Math.max(0, Math.floor(q * vals.length)))];
  return { lower: at(lo), upper: at(1 - lo), invalidFraction: invalid / replicates };
}

/** pure core: records = Map label -> session record; plan = plan.json; controls = controls.json.controls */
export function evaluateBlock({ records, plan, controls }) {
  const problems = [];
  const worlds = plan.validWorlds.slice().sort((a, b) => a - b);
  const perWorld = {};
  for (const w of worlds) {
    const row = {};
    const seeds = new Set(), cfgs = new Set();
    for (const arm of C.ARM_ORDER) {
      const rec = records.get(`x2-${arm}-w${w}`);
      if (!rec) { problems.push(`world ${w}: arm ${arm} has no record`); continue; }
      if (rec.outcome.crashed || !rec.outcome.completed) problems.push(`world ${w}: arm ${arm} did not complete`);
      if (rec.h1r.drawFaults !== 0 || rec.h1r.blockedIllegal !== 0) problems.push(`world ${w}: arm ${arm} has instrument faults`);
      const c = controls[w] && controls[w].arms[arm];
      if (!c) problems.push(`world ${w}: no control record for ${arm}`);
      else problems.push(...deliveryProblems(rec, c.storeHash, c.episodes).map(x => `world ${w} ${arm}: ${x}`));
      seeds.add(rec.input.agentSeed); cfgs.add(rec.input.acceptedConfigSeed);
      row[arm] = C.ENDPOINTS.map(e => rec.endpoints[e]);
    }
    if (seeds.size !== 1) problems.push(`world ${w}: arms do not share the test seed`);
    if (cfgs.size !== 1) problems.push(`world ${w}: arms do not share the configuration`);
    perWorld[w] = { goal: plan.worlds.find(x => x.world === w).goal, realEpisodes: controls[w] ? controls[w].realEpisodes : null, arms: row };
  }
  const excludedFraction = plan.exclusions ? new Set(plan.exclusions.map(e => e.world)).size / plan.worlds.length : 0;
  const valid = problems.length === 0 && excludedFraction <= C.RULES.maxExcludedFraction && worlds.length > 0;
  const out = { schema: `${C.SCHEMA}.summary`, status: C.STATUS, block: plan.block, valid, problems: problems.slice(0, 20), excludedFraction, worlds, designDigest: C.designDigest() };
  if (!valid) { out.verdict = 'INVALID: integrity gate failed; no endpoint is interpreted.'; return out; }

  const E1 = 0;
  const diffs = (t, r, subset = worlds, k = E1) => subset.map(w => perWorld[w].arms[t][k] - perWorld[w].arms[r][k]);
  out.perWorld = perWorld;
  out.armMeans = Object.fromEntries(C.ARM_ORDER.map(a => [a, Object.fromEntries(C.ENDPOINTS.map((e, k) => [e, mean(worlds.map(w => perWorld[w].arms[a][k]))]))]));
  out.contrasts = C.CONTRASTS.map(([name, t, r]) => ({ name, treatment: t, reference: r, endpoints: Object.fromEntries(C.ENDPOINTS.map((e, k) => [e, pairedSummary(diffs(t, r, worlds, k), C.BOOTSTRAP)])) }));

  // benefit and the share of the real-episode benefit each arm reproduces
  const denom = diffs('REAL', 'COLD');
  const benefit = {}, share = {};
  for (const a of C.ARM_ORDER) {
    if (a === 'COLD') continue;
    const d = diffs(a, 'COLD');
    benefit[a] = pairedSummary(d, C.BOOTSTRAP);
    const ci = ratioCi(d, denom, C.BOOTSTRAP), point = mean(d) / mean(denom);
    share[a] = { R: mean(denom) > 0 ? point : null, ci, class: mean(denom) > 0 && ci && ci.lower !== null ? C.classify(point, ci) : 'UNDEFINED' };
  }
  out.benefit = benefit; out.share = share;
  const realValid = benefit.REAL.mean > 0 && benefit.REAL.ci.lower > 0;
  out.reproducesXfer1 = realValid;

  // declared predictions
  const diffMean = (t, r) => mean(diffs(t, r));
  const cls = (a) => share[a].class.replace('_AMBIGUOUS', '');
  out.predictions = C.PREDICTIONS.map(p => {
    let pass;
    switch (p.id) {
      case 'P1': pass = realValid; break;
      case 'P2': pass = share.REAL_NR.R !== null && share.REAL_NR.R >= 0.70; break;
      case 'P3': pass = share.COVER_NR.R !== null && share.COVER_NR.R >= 0.70; break;
      case 'P4': pass = share.REV_NR.R !== null && share.REV_NR.R < 0.30; break;
      case 'P5': pass = diffMean('COVER', 'COVER_NR') < 0; break;
      case 'P6': pass = diffMean('DONOR_SG', 'DONOR_XG') > 0; break;
      default: pass = null;
    }
    return { id: p.id, text: p.text, pass };
  });
  out.verdict = C.interpret({ valid: realValid, covNR: cls('COVER_NR'), cov: cls('COVER'), realNR: cls('REAL_NR'), revNR: cls('REV_NR') });

  // heterogeneity and the declared secondary subset
  const goals = [...new Set(worlds.map(w => perWorld[w].goal))].sort((a, b) => a - b);
  out.byGoal = Object.fromEntries(goals.map(gl => { const ws = worlds.filter(w => perWorld[w].goal === gl);
    return [gl, { n: ws.length, ...Object.fromEntries(C.ARM_ORDER.filter(a => a !== 'COLD').map(a => [a, mean(diffs(a, 'COLD', ws))])) }]; }));
  const big = worlds.filter(w => perWorld[w].realEpisodes >= 20);
  if (big.length >= 8) {
    const den = diffs('REAL', 'COLD', big);
    out.subsetRealStoreAtLeast20 = { n: big.length, benefitReal: mean(den), R: Object.fromEntries(C.ARM_ORDER.filter(a => a !== 'COLD' && a !== 'REAL').map(a => [a, mean(den) > 0 ? mean(diffs(a, 'COLD', big)) / mean(den) : null])) };
  }
  return out;
}

/** load a block directory; throws on any broken hash */
export function loadBlock(dir) {
  const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'MANIFEST.json'), 'utf8'));
  const { digest, ...rest } = manifest;
  if (C.hashObject(rest) !== digest) throw new Error('manifest digest does not match its contents');
  if (manifest.designDigest !== C.designDigest()) throw new Error('the block was run under a different design than the one in config.mjs');
  const plan = JSON.parse(fs.readFileSync(path.join(dir, 'plan.json'), 'utf8'));
  if (C.hashObject(plan) !== manifest.planSha256) throw new Error('plan.json was altered');
  const ctl = JSON.parse(fs.readFileSync(path.join(dir, 'controls.json'), 'utf8'));
  if (C.hashObject(ctl.controls) !== manifest.controlsSha256) throw new Error('controls.json was altered');
  const records = new Map();
  for (const [file, h] of Object.entries(manifest.sessions)) {
    const text = fs.readFileSync(path.join(dir, 'sessions', file));
    if (C.sha256(text) !== h) throw new Error(`session record altered: ${file}`);
    const rec = JSON.parse(text);
    if (rec.role === 'test') records.set(file.replace(/\.json$/, ''), rec);
  }
  return { manifest, plan, controls: ctl.controls, records };
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  const argv = process.argv.slice(2);
  const flag = (n) => { const i = argv.indexOf(n); return i === -1 ? null : argv[i + 1]; };
  if (!flag('--in')) { console.error('--in is required'); process.exit(2); }
  const { manifest, plan, controls, records } = loadBlock(path.resolve(flag('--in')));
  const s = evaluateBlock({ records, plan, controls });
  s.manifestDigest = manifest.digest; s.tree = manifest.tree;
  if (flag('--out')) fs.writeFileSync(path.resolve(flag('--out')), JSON.stringify(s, null, 1));
  const f = (x, d = 3) => (x === null || x === undefined ? 'n/a' : x.toFixed(d));
  console.log(`block ${s.block}: valid=${s.valid}; worlds ${s.worlds.length}; excluded fraction ${s.excludedFraction.toFixed(3)}`);
  if (!s.valid) { console.log(s.verdict); console.log(s.problems.join('\n')); process.exit(1); }
  console.log('arm        goalReaches  benefit vs COLD [95% CI]            R(share of REAL)  class');
  for (const a of C.ARM_ORDER) {
    const m = s.armMeans[a].goalReaches;
    if (a === 'COLD') { console.log(`${a.padEnd(10)} ${f(m, 1).padStart(10)}`); continue; }
    const b = s.benefit[a], sh = s.share[a];
    console.log(`${a.padEnd(10)} ${f(m, 1).padStart(10)}  ${f(b.mean, 1).padStart(8)} [${f(b.ci.lower, 1)}, ${f(b.ci.upper, 1)}]   ${f(sh.R, 2).padStart(6)} [${f(sh.ci && sh.ci.lower, 2)}, ${f(sh.ci && sh.ci.upper, 2)}]  ${sh.class}`);
  }
  console.log('\npredictions:'); for (const p of s.predictions) console.log(`  ${p.id} ${p.pass ? 'PASS' : 'FAIL'}  ${p.text}`);
  console.log('\n' + s.verdict);
}
