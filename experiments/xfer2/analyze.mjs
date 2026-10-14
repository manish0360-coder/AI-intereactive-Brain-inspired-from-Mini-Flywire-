// ==========================================================
// XFER-2 — analysis of one orchestrated block (descriptive; every rule is declared in config.mjs)
// ==========================================================
//   node analyze.mjs --in <block run dir> [--out <summary.json>]
// REFUSES a block whose manifest, design digest, delivery exactness or pairing is not intact (reports it INVALID and
// interprets no endpoint).  Primary quantity: per-world paired differences in goal reaches (E1).  Classification uses the
// fixed absolute margins in config.mjs (MARGIN), never a ratio:
//   benefit(REAL) lower bound >= MIN_REAL_BENEFIT  -> status OK (interpretable)
//   0 < lower bound < MIN_REAL_BENEFIT             -> NOT_INTERPRETABLE_LOW_BENEFIT (paired differences reported only)
//   lower bound <= 0                               -> DID_NOT_REPRODUCE (XFER-1 not reproduced; nothing interpreted)
// ==========================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as C from './config.mjs';
import { pairedSummary, mean } from '../xfer1/stats.mjs';
import { deliveryProblems } from './checks.mjs';

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
  const out = { schema: `${C.SCHEMA}.summary`, status: C.STATUS, block: plan.block, valid, problems: problems.slice(0, 20), excludedFraction, worlds, designDigest: C.designDigest(), margin: C.MARGIN };
  if (!valid) { out.verdict = 'INVALID: integrity gate failed; no endpoint is interpreted.'; out.reproduction = 'INVALID'; return out; }

  const E1 = 0;
  const diffs = (t, r, subset = worlds, k = E1) => subset.map(w => perWorld[w].arms[t][k] - perWorld[w].arms[r][k]);
  out.perWorld = perWorld;
  out.armMeans = Object.fromEntries(C.ARM_ORDER.map(a => [a, Object.fromEntries(C.ENDPOINTS.map((e, k) => [e, mean(worlds.map(w => perWorld[w].arms[a][k]))]))]));
  out.contrasts = C.CONTRASTS.map(([name, t, r]) => ({ name, treatment: t, reference: r, endpoints: Object.fromEntries(C.ENDPOINTS.map((e, k) => [e, pairedSummary(diffs(t, r, worlds, k), C.BOOTSTRAP)])) }));

  // benefit of every arm over cold, and the reproduction status of REAL (decides whether anything is interpreted)
  out.benefit = {};
  for (const a of C.ARM_ORDER) if (a !== 'COLD') out.benefit[a] = pairedSummary(diffs(a, 'COLD'), C.BOOTSTRAP);
  const lower = out.benefit.REAL.ci.lower;
  const status = lower >= C.MARGIN.minRealBenefit ? 'OK' : lower > 0 ? 'NOT_INTERPRETABLE_LOW_BENEFIT' : 'DID_NOT_REPRODUCE';
  out.reproduction = status;

  // shortfall classification of an arm against a declared reference: reference - arm, per world, interval vs +/- DELTA
  const shortfall = (ref, x) => { const s = pairedSummary(diffs(ref, x), C.BOOTSTRAP); return { reference: ref, arm: x, shortfall: s, class: C.classifyShortfall(s.ci) }; };
  const cmp = {
    REAL_NR_vs_REAL: shortfall('REAL', 'REAL_NR'), SAT_NR_vs_REAL_NR: shortfall('REAL_NR', 'SAT_NR'), GEN_NR_vs_REAL_NR: shortfall('REAL_NR', 'GEN_NR'),
    REV_NR_vs_REAL_NR: shortfall('REAL_NR', 'REV_NR'), ENTRY_NR_vs_SAT_NR: shortfall('SAT_NR', 'ENTRY_NR'), SAT_NOENTRY_NR_vs_SAT_NR: shortfall('SAT_NR', 'SAT_NOENTRY_NR'),
    COLD_vs_REAL: { reference: 'REAL', arm: 'COLD', shortfall: pairedSummary(diffs('REAL', 'COLD'), C.BOOTSTRAP) },
  };
  cmp.COLD_vs_REAL.class = C.classifyShortfall(cmp.COLD_vs_REAL.shortfall.ci);
  out.classifications = cmp;

  const okPred = (c, set) => status === 'OK' && set.includes(cmp[c].class);
  out.predictions = C.PREDICTIONS.map(p => {
    let pass;
    switch (p.id) {
      case 'P1': pass = status === 'OK'; break;
      case 'P2': pass = okPred('REAL_NR_vs_REAL', ['NON_INFERIOR', 'EXCEEDS']); break;
      case 'P3': pass = okPred('SAT_NR_vs_REAL_NR', ['NON_INFERIOR', 'EXCEEDS']); break;
      case 'P4': pass = okPred('GEN_NR_vs_REAL_NR', ['FALLS_SHORT']); break;
      case 'P5': pass = okPred('REV_NR_vs_REAL_NR', ['FALLS_SHORT']); break;
      case 'P6': pass = okPred('ENTRY_NR_vs_SAT_NR', ['NON_INFERIOR', 'EXCEEDS']); break;
      default: pass = null;
    }
    return { id: p.id, text: p.text, pass };
  });
  out.verdict = C.interpret({ status, satVsRealNR: cmp.SAT_NR_vs_REAL_NR.class, genVsRealNR: cmp.GEN_NR_vs_REAL_NR.class, realVsRealNR: cmp.REAL_NR_vs_REAL.class,
    entryVsSat: cmp.ENTRY_NR_vs_SAT_NR.class, noentryVsSat: cmp.SAT_NOENTRY_NR_vs_SAT_NR.class });
  if (status === 'OK') out.shareOfRealBenefit = Object.fromEntries(Object.keys(out.benefit).map(a => [a, out.benefit[a].mean / out.benefit.REAL.mean]));   // descriptive only

  // heterogeneity and the declared secondary subset
  const goals = [...new Set(worlds.map(w => perWorld[w].goal))].sort((a, b) => a - b);
  out.byGoal = Object.fromEntries(goals.map(gl => { const ws = worlds.filter(w => perWorld[w].goal === gl);
    return [gl, { n: ws.length, ...Object.fromEntries(C.ARM_ORDER.filter(a => a !== 'COLD').map(a => [a, mean(diffs(a, 'COLD', ws))])) }]; }));
  const big = worlds.filter(w => perWorld[w].realEpisodes >= 20);
  if (big.length >= 8) out.subsetRealStoreAtLeast20 = { n: big.length, benefit: Object.fromEntries(C.ARM_ORDER.filter(a => a !== 'COLD').map(a => [a, mean(diffs(a, 'COLD', big))])),
    shortfalls: { GEN_NR_vs_REAL_NR: pairedSummary(diffs('REAL_NR', 'GEN_NR', big), C.BOOTSTRAP), SAT_NR_vs_REAL_NR: pairedSummary(diffs('REAL_NR', 'SAT_NR', big), C.BOOTSTRAP) } };
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
  const f = (x, d = 1) => (x === null || x === undefined ? 'n/a' : x.toFixed(d));
  console.log(`block ${s.block}: valid=${s.valid}; reproduction=${s.reproduction}; worlds ${s.worlds.length}; excluded fraction ${s.excludedFraction.toFixed(3)}`);
  if (!s.valid) { console.log(s.verdict); console.log(s.problems.join('\n')); process.exit(1); }
  console.log('arm              goalReaches   benefit vs COLD [95% CI]');
  for (const a of C.ARM_ORDER) {
    const m = s.armMeans[a].goalReaches;
    if (a === 'COLD') { console.log(`${a.padEnd(16)} ${f(m).padStart(9)}`); continue; }
    const b = s.benefit[a];
    console.log(`${a.padEnd(16)} ${f(m).padStart(9)}   ${f(b.mean).padStart(7)} [${f(b.ci.lower)}, ${f(b.ci.upper)}]`);
  }
  console.log(`\nmargins: DELTA ${C.MARGIN.delta}, MIN_REAL_BENEFIT ${C.MARGIN.minRealBenefit}`);
  for (const [k, v] of Object.entries(s.classifications)) console.log(`  ${k.padEnd(28)} shortfall ${f(v.shortfall.mean).padStart(7)} [${f(v.shortfall.ci.lower)}, ${f(v.shortfall.ci.upper)}]  ${v.class}`);
  console.log('\npredictions:'); for (const p of s.predictions) console.log(`  ${p.id} ${p.pass ? 'PASS' : 'FAIL'}  ${p.text}`);
  console.log('\n' + s.verdict);
}
