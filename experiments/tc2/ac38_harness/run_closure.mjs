// ==========================================================
// AC38 harness closure — clean control, field-write ladder, inventory cross-check, breakage
// ==========================================================
//   node experiments/tc2/ac38_harness/run_closure.mjs <out-dir-outside-the-repo> [--find-stable]
// One disposable process per fixture; writes only into <out-dir>.  The bridge-off switch and every
// probe exist in memory only.  This is harness evidence on the pinned tree.  It is not an AC38 run,
// it does not make AC38 executable, and a clean bridge-off result is not a derived tree.
// ==========================================================
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { HERE, ROOT, TREE, TABLE_SHA256, REASONS, tablePath, scopePath, outDir, makeRun, pool } from './runner.mjs';

// Found by --find-stable: this seal's own consolidation takes a pre-existing entry over the threshold.
const STABLE = Object.freeze({ world: { stream: 'study', index: 15, configSeed: 201269 }, K: 1698 });
const VAULT = 'render/episodicContextEngine.js#episodeVault', CONTEXT = 'render/episodicContextEngine.js#currentEpisode';
const OUT = outDir('run_closure.mjs');
const run = makeRun(OUT);
const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');
const trace = JSON.parse(fs.readFileSync(path.join(HERE, 'seal_path_trace.json'), 'utf8'));
const scope = JSON.parse(fs.readFileSync(scopePath, 'utf8'));
const monitored = new Set(scope.inventory.map((i) => `${i.file}#${i.binding}`));
const siteProbe = { variant: 'site_probes', superset: true };

if (process.argv.includes('--scan-crossings')) {
  const { generateAcceptedStream } = await import(pathToFileURL(path.join(ROOT, 'experiments', 'm7', 'env.js')).href);
  const worlds = generateAcceptedStream(200000, 30).map((w, i) => ({ stream: 'study', index: i, configSeed: w.acceptedSeed }));
  const res = await pool(worlds.map((world) => () => run({ label: `cross${world.index}`, mode: 'D', variant: 'site_probes', fixture: 'empty', reason: 'manual', calibrate: true, world })));
  res.forEach((r, i) => { const c = r.result?.crossings ?? []; const viaSealPath = c.filter((x) => x[2]); console.log(JSON.stringify({ index: i, configSeed: worlds[i].configSeed, code: r.code, note: r.result?.refused ?? r.result?.failed ?? null, crossings: c.length, viaConsolidation: viaSealPath.length, preExisting: viaSealPath.filter((x) => x[1]).map((x) => [x[0], x[3], x[4], x[5], x[6]]).slice(0, 6) })); });
  process.exit(0);
}

// Finds a seal whose own window takes a pre-existing consolidation entry over the stability threshold.
// Only consolidation inside the window counts, so the candidates are goal seals with the counter at 4.
if (process.argv.includes('--find-stable')) {
  const ids = (process.argv.find((x) => x.startsWith('--worlds=')) ?? '--worlds=15').slice(9).split(',').map(Number);
  const { generateAcceptedStream } = await import(pathToFileURL(path.join(ROOT, 'experiments', 'm7', 'env.js')).href);
  const stream = generateAcceptedStream(200000, 30);
  for (const index of ids) {
    const world = { stream: 'study', index, configSeed: stream[index].acceptedSeed };
    const cal = await run({ label: `cal${index}`, mode: 'D', variant: 'site_probes', fixture: 'empty', reason: 'manual', calibrate: true, world });
    const seals = cal.result.naturalSeals.filter((x) => x[1] === 'goal_reached' && x[2].episodesSinceConsolidation === 4);
    const cand = [...new Set(seals.map((x) => x[0]))];
    const res = await pool(cand.map((k) => () => run({ label: `find${index}.${k}`, mode: 'J', ...siteProbe, fixture: 'three', reason: 'goal_reached', K: k, stopAtReturn: true, world })));
    res.forEach((r, i) => {
      const site = r.result?.window?.sites?.['render/longTermConsolidation.js:58'];
      if (site?.registered > 0 || r.code !== 0) console.log(JSON.stringify({ world: index, configSeed: world.configSeed, K: cand[i], call: r.result?.window?.call, code: r.code, note: r.result?.refused ?? r.result?.failed ?? null, ltc58: site ?? null, stores: seals.find((x) => x[0] === cand[i])?.[2] }));
    });
    console.log(`world ${index}: ${cand.length} candidates`);
  }
  process.exit(0);
}

const problems = [];
const check = (gate, ok, what) => { if (!ok) problems.push(`${gate}: ${what}`); return ok; };
const runs = {};
async function stage(cases) {
  const outs = await pool(cases.map((c) => () => run(c)));
  outs.forEach((r) => { runs[r.label] = r; fs.writeFileSync(path.join(OUT, 'runs', `${r.label}.json`), JSON.stringify(r)); check('run', r.code === 0 && r.result && !r.result.refused && !r.result.failed, `${r.label} did not complete: code ${r.code} ${r.result?.refused ?? r.result?.failed ?? r.stderr.slice(0, 300)}`); });
}
const R = (l) => runs[l]?.result;
const W = (l) => runs[l]?.result?.window;
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const rowDiff = (x = {}, y = {}) => Object.keys({ ...x, ...y }).filter((k) => x[k] !== y[k]).sort();
const summarise = (list) => { const m = {}; for (const e of list) m[e] = (m[e] || 0) + 1; return Object.fromEntries(Object.entries(m).sort()); };
const spyCounts = (w) => { const c = { cognitive: 0, visual: 0, environment: 0 }; for (const d of w?.observed?.draws ?? []) c[d.stream] = (c[d.stream] || 0) + 1; return c; };
const delta = (a, b) => (a && b ? { cognitive: b.cognitive - a.cognitive, visual: b.visual - a.visual, environment: b.environment - a.environment } : null);
const C1 = { cognitive: 1, visual: 0, environment: 0 };
const ones = (c) => !!c && Object.values(c).every((n) => n === 1);

// The one clean verdict: the bridge-off runs must return nothing, and the planted runs must not.
function verdict(w, tripwireWindow = null) {
  const v = [];
  if ((w?.observed?.inventoryWrites ?? []).length) v.push('journal');
  if ((w?.observed?.lets ?? []).length) v.push('let');
  if (!same(spyCounts(w), C1)) v.push('stream');
  if ((w?.observed?.mathRandom ?? 0) > 0) v.push('math_random');
  if (tripwireWindow?.tripped) v.push('tripwire');
  return v;
}

// ---- 1. clean control, with bridge-on beside it in the same batch ----
const cases = [];
for (const reason of REASONS) {
  const off = { variant: 'bridge_off', reason };
  const on = { reason };
  cases.push(
    { label: `OFF.D.empty.${reason}`, mode: 'D', fixture: 'empty', ...off }, { label: `OFF.J.empty.${reason}`, mode: 'J', fixture: 'empty', aliasProof: true, ...off },
    { label: `OFF.D.three.${reason}`, mode: 'D', fixture: 'three', ...off }, { label: `OFF.J.three.${reason}`, mode: 'J', fixture: 'three', aliasProof: true, ...off },
    { label: `OFF.T.three.${reason}`, mode: 'T', fixture: 'three', ...off }, { label: `OFF.S.three.${reason}`, mode: 'T', superset: true, fixture: 'three', ...off },
    { label: `OFF.R0.three.${reason}`, mode: 'R0', fixture: 'three', ...off }, { label: `OFF.R1.three.${reason}`, mode: 'R1', fixture: 'three', ...off },
    { label: `ON.D.empty.${reason}`, mode: 'D', fixture: 'empty', ...on }, { label: `ON.J.empty.${reason}`, mode: 'J', fixture: 'empty', aliasProof: true, ...on },
    { label: `ON.D.three.${reason}`, mode: 'D', fixture: 'three', ...on }, { label: `ON.J.three.${reason}`, mode: 'J', fixture: 'three', aliasProof: true, ...on },
    { label: `ON.T.three.${reason}`, mode: 'T', fixture: 'three', ...on }, { label: `ON.R0.three.${reason}`, mode: 'R0', fixture: 'three', ...on }, { label: `ON.R1.three.${reason}`, mode: 'R1', fixture: 'three', ...on },
  );
}
await stage(cases);

const clean = [];
for (const reason of REASONS) {
  const off = W(`OFF.J.three.${reason}`), offE = W(`OFF.J.empty.${reason}`), on = W(`ON.J.three.${reason}`), t = W(`OFF.T.three.${reason}`), s = W(`OFF.S.three.${reason}`), onT = W(`ON.T.three.${reason}`);
  const recOff = delta(W(`OFF.R0.three.${reason}`)?.positions, W(`OFF.R1.three.${reason}`)?.positions), recOn = delta(W(`ON.R0.three.${reason}`)?.positions, W(`ON.R1.three.${reason}`)?.positions);
  const v = verdict(off, t), vSuper = verdict({ observed: s?.observed }, s);
  const finalDiff = rowDiff(offE?.digestReturn?.rows, off?.digestReturn?.rows);
  clean.push({ reason, call: off?.call, nodes: off?.nodes, returned: off?.returned, verdict: v, supersetTripped: s?.tripped ?? null, vaultDelta: off?.vaultDelta, storeDelta: off?.storeDelta, spy: spyCounts(off), recovered: recOff, probes: off?.probes, logs: off?.logs, registered: { inventory: off?.registered, superset: s?.registered }, finalStateDiffFromEmpty: finalDiff,
    bridgeOn: { inventoryWrites: on?.observed?.inventoryWrites?.length, lets: on?.observed?.lets?.length, spy: spyCounts(on), recovered: recOn, probes: on?.probes, tripped: onT?.tripped ?? null, storeDelta: on?.storeDelta } });

  // the clean result, with nothing weakened from the bridge-on expectations
  check('G1 clean', v.length === 0, `bridge-off three-node not clean: ${reason} ${v}`);
  check('G1 clean', !s?.tripped, `bridge-off superset tripwire fired: ${reason} ${JSON.stringify(s?.tripped)}`);
  check('G1 clean', (s?.observed?.inventoryWrites ?? []).length === 0, `bridge-off superset journal saw a write: ${reason}`);
  check('G1 clean', same(recOff, C1), `bridge-off recovered stream delta: ${reason} ${JSON.stringify(recOff)}`);
  check('G1 clean', same(finalDiff, [VAULT]), `bridge-off final state differs outside the closed list: ${reason} ${finalDiff}`);
  check('G1 clean', off?.storeDelta === 0 && off?.vaultDelta === 1 && off?.returned === 'sealed', `bridge-off seal shape: ${reason}`);

  // genuinely exercised: the populated path ran, the window was live, the bridge was registered
  check('G1 exercised', off?.probes?.bridge_suppressed === 1 && !off?.probes?.bridge_unset, `switch did not suppress a registered bridge: ${reason} ${JSON.stringify(off?.probes)}`);
  check('G1 exercised', ['bridge_callback', 'recordAutonomousSuccess', '_sealBuffer', '_runPipeline', '_storeEpisode'].every((p) => !off?.probes?.[p]), `bridge-off still reached the bridge: ${reason} ${JSON.stringify(off?.probes)}`);
  check('G1 exercised', (off?.logs ?? []).some((l) => l.includes(`Episode sealed [${reason}]`)), `populated seal log missing: ${reason}`);
  for (const w of [off, t, s]) check('G1 exercised', ones(w?.canaryOpen) && ones(w?.canaryClose), `canary missing: ${reason}`);
  for (const w of [t, s]) check('G1 exercised', ones(w?.tripCanaryOpen) && ones(w?.tripCanaryClose), `tripwire canary missing: ${reason}`);
  check('G1 exercised', (s?.registered?.objects ?? 0) > (off?.registered?.objects ?? 0), `superset is not wider than the inventory: ${reason}`);

  // bridge-on still fails, from the same state
  check('G1 bridge-on', on?.observed?.inventoryWrites?.length > 0 && on?.observed?.lets?.length > 0, `bridge-on write clause did not fail: ${reason}`);
  check('G1 bridge-on', spyCounts(on).cognitive === 2 && recOn?.cognitive === 2, `bridge-on stream clause did not fail: ${reason}`);
  check('G1 bridge-on', ['bridge_callback', 'recordAutonomousSuccess', '_sealBuffer', '_runPipeline', '_storeEpisode'].every((p) => on?.probes?.[p] >= 1) && !on?.probes?.bridge_suppressed, `bridge-on reachability: ${reason} ${JSON.stringify(on?.probes)}`);
  check('G1 bridge-on', onT?.tripped?.name === 'TypeError' && onT?.tripped?.site !== 'harness', `bridge-on tripwire did not fire: ${reason}`);

  // the switch is the only difference
  const tOff = R(`OFF.J.three.${reason}`)?.provenance?.transform?.transformed ?? {}, tOn = R(`ON.J.three.${reason}`)?.provenance?.transform?.transformed ?? {};
  check('G1 switch', same(rowDiff(tOff, tOn), ['render/episodicContextEngine.js']), `transformed source differs elsewhere: ${reason} ${rowDiff(tOff, tOn)}`);
  check('G1 switch', off?.digestBefore?.root === on?.digestBefore?.root && off?.digestAfterPopulation?.root === on?.digestAfterPopulation?.root, `bridge-off and bridge-on differ before the seal: ${reason}`);
  check('G1 switch', R(`OFF.J.three.${reason}`)?.inputDigest === R(`ON.J.three.${reason}`)?.inputDigest, `inputs differ: ${reason}`);
  check('G1 switch', R(`OFF.D.empty.${reason}`)?.fingerprint?.public === R(`ON.D.empty.${reason}`)?.fingerprint?.public, `switch changed an empty run that never reaches it: ${reason}`);
  check('G1 switch', R(`OFF.D.three.${reason}`)?.fingerprint?.public === R(`OFF.J.three.${reason}`)?.fingerprint?.public, `D vs J differs on bridge-off: ${reason}`);
  check('G1 switch', R(`ON.D.three.${reason}`)?.fingerprint?.public === R(`ON.J.three.${reason}`)?.fingerprint?.public, `D vs J differs on bridge-on: ${reason}`);
}
const downstream = Object.fromEntries(REASONS.map((r) => [r, { emptyBridgeOn: R(`ON.D.empty.${r}`)?.fingerprint?.public?.slice(0, 16), threeBridgeOff: R(`OFF.D.three.${r}`)?.fingerprint?.public?.slice(0, 16), threeBridgeOn: R(`ON.D.three.${r}`)?.fingerprint?.public?.slice(0, 16) }]));

// ---- planted writes: the clean verdict must fail when a write really happens ----
const PLANTS = [
  ['map_same_value', 'J', 'journal', true], ['map_restored', 'J', 'journal', true], ['array_restored', 'J', 'journal', true], ['array_shift_restored', 'J', 'journal', true], ['set_restored', 'J', 'journal', true], ['let_same_value', 'J', 'let', true],
  ['draw_cognitive', 'J', 'stream', false], ['draw_visual', 'J', 'stream', false], ['draw_environment', 'J', 'stream', false], ['math_random', 'J', 'math_random', false],
  ['field_same_value', 'T', 'tripwire', null], ['embedding_same_value', 'T', 'tripwire', null], ['array_restored', 'T', 'tripwire', null],
  ['field_same_value', 'J', null, true],
];
const reasonP = 'manual', offP = { variant: 'bridge_off', fixture: 'three', reason: reasonP };
await stage([...PLANTS.map(([plant, mode]) => ({ label: `PL.${plant}.${mode}`, mode, plant, ...offP })), { label: 'PL.draw_cognitive.R1', mode: 'R1', plant: 'draw_cognitive', ...offP }]);
const plantRows = PLANTS.map(([plant, mode, expect, digestBlind]) => {
  const w = W(`PL.${plant}.${mode}`);
  const v = mode === 'T' ? verdict({ observed: { draws: [{ stream: 'cognitive' }] } }, w) : verdict(w);
  const base = W(`OFF.J.three.${reasonP}`);
  const digestUnchanged = w?.digestReturn ? w.digestReturn.root === base?.digestReturn?.root : null;
  if (expect) check('G5 planted', v.includes(expect), `${plant} in ${mode} not detected: ${v}`);
  else check('G5 planted', v.length === 0, `${plant} in ${mode} is the documented journal blind spot, but it reported ${v}`);
  if (digestBlind === true) check('G5 planted', digestUnchanged === true, `${plant} in ${mode}: expected the final digest to stay equal`);
  return { plant, mode, detectedBy: v, expected: expect, finalDigestUnchanged: digestUnchanged, trip: w?.tripped?.site ?? null };
});
const plantedRecovered = delta(W(`OFF.R0.three.${reasonP}`)?.positions, W('PL.draw_cognitive.R1')?.positions);
check('G5 planted', same(plantedRecovered, { cognitive: 2, visual: 0, environment: 0 }), `planted draw not recovered: ${JSON.stringify(plantedRecovered)}`);

// ---- 2. field-write ladder ----
const inTrace = (site) => trace.writes.find((w) => w.site === site) ?? null;
function nextUnlock(t, w) {
  const key = /property '([^']+)'/.exec(t.message)?.[1] ?? /Cannot add property ([^,]+),/.exec(t.message)?.[1] ?? null;
  const last = w?.observed?.inventoryWrites?.at(-1);
  if (last && last.site === t.site && last.op.startsWith('Array.')) return { kind: 'array', item: last.item, op: last.op, site: t.site };
  if (/\[object Array\]/.test(t.message) || /^Cannot add property \d/.test(t.message)) {
    const s = inTrace(t.site);
    return s?.store ? { kind: 'array', item: s.store, op: key === 'length' ? 'length' : 'index', site: t.site } : null;
  }
  if (/^Cannot add property/.test(t.message)) { const s = inTrace(t.site); return s?.store ? { kind: 'extend', item: s.store, key, site: t.site } : null; }
  return /read only property/.test(t.message) ? { kind: 'field', key, site: t.site } : null;
}
async function ladder(name, input) {
  const unlock = { fields: [], arrays: [], extend: [] }, rungs = [];
  let final = null, stoppedBy = null;
  for (let n = 0; n < 45; n++) {
    const label = `L.${name}.${n}`;
    const r = await run({ label, mode: 'T', ...siteProbe, fixture: 'three', unlock, ...input });
    runs[label] = r; fs.writeFileSync(path.join(OUT, 'runs', `${label}.json`), JSON.stringify(r));
    const w = r.result?.window;
    if (r.code !== 0 || !w) { stoppedBy = `rung ${n} failed: ${r.result?.refused ?? r.result?.failed ?? r.stderr.slice(0, 200)}`; break; }
    check('G2 ladder', ones(w.canaryOpen) && ones(w.canaryClose) && ones(w.tripCanaryOpen) && ones(w.tripCanaryClose), `canary missing at ${label}`);
    for (const f of [...unlock.fields, ...unlock.extend]) check('G2 ladder', w.observed.fieldHits[`${f.key} ${f.site}`] >= 1, `${label}: unlocked ${f.key} at ${f.site} was not reached`);
    if (!w.tripped) { final = { rung: n, returned: w.returned, sites: w.sites, fieldHits: w.observed.fieldHits, registered: w.registered }; break; }
    const u = nextUnlock(w.tripped, w);
    const row = { rung: n, site: w.tripped.site, message: w.tripped.message, unlock: u, staticDecision: inTrace(w.tripped.site)?.decision ?? null, inStaticTrace: !!inTrace(w.tripped.site) };
    rungs.push(row);
    if (!u) { stoppedBy = `rung ${n}: cannot classify ${w.tripped.message} at ${w.tripped.site}`; break; }
    if (u.kind === 'field') { if (unlock.fields.some((f) => f.key === u.key && f.site === u.site)) { stoppedBy = `rung ${n}: no progress at ${u.site}`; break; } unlock.fields = [...unlock.fields, { key: u.key, site: u.site }]; } else if (u.kind === 'extend') { if (unlock.extend.some((f) => f.key === u.key && f.site === u.site)) { stoppedBy = `rung ${n}: no progress at ${u.site}`; break; } unlock.extend = [...unlock.extend, { item: u.item, key: u.key, site: u.site }]; } else { if (unlock.arrays.includes(u.item)) { stoppedBy = `rung ${n}: no progress on ${u.item}`; break; } unlock.arrays = [...unlock.arrays, u.item]; }
  }
  check('G2 ladder', final && !stoppedBy && final.returned === 'sealed', `${name} did not reach a clean final rung: ${stoppedBy}`);
  return { name, rungs, final, stoppedBy };
}
const CONTEXTS = [
  ['goal', { reason: 'goal_reached' }], ['stable', { reason: 'goal_reached', ...STABLE }], ['context', { reason: 'manual', lockContext: true }], ['cap', { reason: 'tick_cap' }],
];
const ladders = await Promise.all(CONTEXTS.map(([name, input]) => ladder(name, input)));

// ---- 3. inventory: runtime cross-check of the static trace ----
const stableCtx = { reason: 'goal_reached', ...STABLE };
const crossCases = [
  ...REASONS.map((reason) => ({ label: `SJ.three.${reason}`, mode: 'J', ...siteProbe, fixture: 'three', reason, stopAtReturn: true })),
  { label: 'SJ.three.stable', mode: 'J', ...siteProbe, fixture: 'three', ...stableCtx, stopAtReturn: true },
  { label: 'AP.empty.stable', mode: 'J', aliasProof: true, fixture: 'empty', ...stableCtx, stopAtReturn: true },
  { label: 'AP.three.stable', mode: 'J', aliasProof: true, fixture: 'three', ...stableCtx, stopAtReturn: true },
];
await stage(crossCases);
const lineAt = (site) => { const i = site.lastIndexOf(':'); return fs.readFileSync(path.join(TREE, site.slice(0, i)), 'utf8').split('\n')[Number(site.slice(i + 1)) - 1] ?? ''; };
const written = {}, outsideMonitored = new Set(), staticMiss = new Set(), constructorAdds = new Set(), journalledSites = new Set();
const siteStats = {};
const addSites = (sites) => { for (const [s, c] of Object.entries(sites ?? {})) { const r = (siteStats[s] ||= { executed: 0, registered: 0 }); r.executed += c.executed; r.registered += c.registered; } };
for (const label of [...REASONS.map((r) => `SJ.three.${r}`), 'SJ.three.stable']) {
  const w = W(label);
  addSites(w?.sites);
  for (const e of w?.observed?.inventoryWrites ?? []) { written[e.item] = (written[e.item] || 0) + 1; if (!monitored.has(e.item)) outsideMonitored.add(`${e.item} at ${e.site}`); journalledSites.add(`${e.op} ${e.site}`); }
  for (const l of w?.observed?.lets ?? []) { const k = `${l.site.slice(0, l.site.lastIndexOf(':'))}#${l.name}`; written[k] = (written[k] || 0) + 1; if (!monitored.has(k)) outsideMonitored.add(`${k} at ${l.site}`); }
  for (const site of Object.keys(w?.observed?.unregistered ?? {})) {
    if (site.startsWith('clock_preload') || site === 'harness') continue;
    if (inTrace(site)) continue;
    if (/new (Map|Set)\(/.test(lineAt(site))) { constructorAdds.add(site); continue; }
    staticMiss.add(site);
  }
}
for (const l of ladders) addSites(l.final?.sites);
for (const l of ladders) for (const r of l.rungs) if (r.unlock?.key === 'embedding') written['main.js#neuronMap'] = (written['main.js#neuronMap'] || 0) + 1;
check('G3 inventory', outsideMonitored.size === 0, `runtime wrote outside the monitored inventory: ${[...outsideMonitored].join(', ')}`);
check('G3 inventory', staticMiss.size === 0, `runtime mutator site unknown to the static trace: ${[...staticMiss].join(', ')}`);
const aliasRows = [];
for (const [ctx, emptyL, threeL] of [...REASONS.map((r) => [r, `ON.J.empty.${r}`, `ON.J.three.${r}`]), ['stable', 'AP.empty.stable', 'AP.three.stable']]) {
  const diff = rowDiff(W(emptyL)?.outsideInventoryReturn?.rows, W(threeL)?.outsideInventoryReturn?.rows).filter((k) => !monitored.has(k));
  const beforeDiff = rowDiff(W(emptyL)?.outsideInventoryBefore?.rows, W(threeL)?.outsideInventoryBefore?.rows);
  aliasRows.push({ context: ctx, changedOutsideInventory: diff });
  check('G3 inventory', beforeDiff.length === 0, `outside-inventory digests differ before the seal: ${ctx} ${beforeDiff}`);
  check('G3 inventory', diff.every((k) => k === VAULT || k === CONTEXT), `state outside the inventory changed: ${ctx} ${diff}`);
}
const allFieldHits = ladders.flatMap((l) => l.rungs.filter((r) => r.unlock?.kind === 'field' || r.unlock?.kind === 'extend' || r.unlock?.op === 'length' || r.unlock?.op === 'index').map((r) => ({ context: l.name, site: r.site, kind: r.unlock.kind, key: r.unlock.key ?? r.unlock.op })));
const outsideWindow = {};
for (const r of Object.values(runs)) if (r.label?.startsWith('SJ.')) for (const [s, n] of Object.entries(r.result?.sitesOutsideWindow ?? {})) outsideWindow[s] = Math.max(outsideWindow[s] ?? 0, n);
const siteTable = trace.fieldSites.map((f) => {
  const hits = allFieldHits.filter((h) => h.site === f.site), st = siteStats[f.site] ?? { executed: 0, registered: 0 };
  const row = { site: f.site, lhs: f.lhs, decision: f.decision, trippedIn: [...new Set(hits.map((h) => h.context))], executedInWindow: st.executed, onStoredObject: st.registered, executedOutsideWindow: outsideWindow[f.site] ?? 0, status: null };
  if (f.decision === 'store' || f.decision === 'closed-list') row.status = hits.length ? 'REAL HIT' : 'NO HIT';
  else if (f.decision === 'fresh') row.status = st.executed > 0 && st.registered === 0 ? 'EXCLUDED: runtime confirms a target created inside the call' : (st.executed === 0 ? 'NOT EXECUTED' : 'FRESH CLAIM REFUTED');
  else if (f.decision === 'unreachable') row.status = st.executed === 0 ? (row.executedOutsideWindow > 0 ? 'EXCLUDED: not reached in any window, and its probe is live outside them' : 'EXCLUDED: probe silent everywhere') : 'UNREACHABLE CLAIM REFUTED';
  return row;
});
for (const r of siteTable) check('G2 ladder', r.status === 'REAL HIT' || r.status.startsWith('EXCLUDED'), `${r.site} ${r.lhs}: ${r.status}`);
for (const l of ladders) for (const r of l.rungs) check('G3 inventory', r.inStaticTrace, `ladder ${l.name} tripped at ${r.site}, which the static trace does not have`);

// ---- breakage ----
const tableText = fs.readFileSync(tablePath, 'utf8');
const brokenTable = (name, edit) => {
  const t = JSON.parse(tableText); edit(t);
  const text = `${JSON.stringify(t, null, 1)}\n`; const p = path.join(OUT, `table_${name}.json`);
  fs.writeFileSync(p, text);
  return { tablePath: p, tableSha256: sha256(text) };
};
const off3 = { variant: 'bridge_off', fixture: 'three', reason: 'manual' };
const breakage = [
  { name: 'switch anchor broken', expect: /anchor mismatch at render\/episodicContextEngine\.js:394/, input: { mode: 'J', ...off3, ...brokenTable('switch', (t) => { t.rewrites.find((r) => r.variant === 'bridge_off').anchor += ' '; }) } },
  { name: 'switch missing from the table', expect: /variant bridge_off has no rewrite/, input: { mode: 'J', ...off3, ...brokenTable('noswitch', (t) => { t.rewrites = t.rewrites.filter((r) => r.variant !== 'bridge_off'); }) } },
  { name: 'unknown variant', expect: /variant nope is not known/, input: { mode: 'J', ...off3, variant: 'nope' } },
  { name: 'site probe missing', expect: /expected 29 variant rewrites, applied 28/, input: { mode: 'J', fixture: 'three', reason: 'manual', ...siteProbe, stopAtReturn: true, ...brokenTable('nosite', (t) => { const i = t.rewrites.findIndex((r) => r.variant === 'site_probes'); t.rewrites.splice(i, 1); }) } },
  { name: 'clean control, journal disabled', expect: /canary did not fire/, input: { mode: 'J', ...off3, breakKnob: 'journal' } },
  { name: 'clean control, stream spy disabled', expect: /canary did not fire/, input: { mode: 'J', ...off3, breakKnob: 'stream' } },
  { name: 'clean control, let journal disabled', expect: /canary did not fire/, input: { mode: 'J', ...off3, breakKnob: 'let' } },
  { name: 'clean control, tripwire disabled', expect: /tripwire canary did not fire/, input: { mode: 'T', ...off3, breakKnob: 'tripwire' } },
  { name: 'unknown planted write', expect: /unknown planted write/, input: { mode: 'J', ...off3, plant: 'nope' } },
  { name: 'ladder unlock key matches nothing', expect: /ladder unlock key __nope__ matched no registered object/, input: { mode: 'T', ...siteProbe, fixture: 'three', reason: 'manual', unlock: { fields: [{ key: '__nope__', site: 'x' }], arrays: [] } } },
  { name: 'target seal never reached', expect: /target seal \(manual at or after call 99999\) was not reached/, input: { mode: 'J', fixture: 'three', reason: 'manual', K: 99999 } },
  { name: 'process without the permission model', expect: /not running under the required permission set/, input: { mode: 'J', ...off3 }, opts: { noPermission: true } },
  { name: 'process without the network guard', expect: /network guard is not active/, input: { mode: 'J', ...off3 }, opts: { noGuard: true } },
];
const brokeOut = await pool(breakage.map((b, i) => () => run({ label: `cbreak${i}`, ...b.input }, b.opts ?? {})));
const breakResults = breakage.map((b, i) => {
  const r = brokeOut[i], text = `${r.result?.refused ?? ''} ${r.stderr}`;
  const row = { name: b.name, exitCode: r.code, refused: b.expect.test(text), message: (/AC38 REFUSED: [^\n]*/.exec(text)?.[0] ?? '').slice(0, 150) };
  check('G4 breakage', r.code !== 0 && row.refused, `${b.name}: exit ${r.code} ${text.slice(0, 220)}`);
  return row;
});
// A wrong-site unlock is not a refusal: the write must still trip at its true site.
const wrongSite = await run({ label: 'wrongsite', mode: 'T', ...siteProbe, fixture: 'three', reason: 'manual', fieldsOnly: true, unlock: { fields: [{ key: 'embedding', site: 'render/embeddings.js:999' }], arrays: [] } });
const wrongTrip = wrongSite.result?.window?.tripped ?? null;
check('G4 breakage', !!wrongSite.result?.window, `wrong-site run did not complete: code ${wrongSite.code} ${wrongSite.result?.refused ?? wrongSite.result?.failed ?? wrongSite.stderr.slice(0, 200)}`);
if (wrongSite.result?.window) check('G4 breakage', wrongTrip?.site === 'render/embeddings.js:236', `wrong-site unlock let the write through: ${JSON.stringify(wrongTrip)}`);

const anyOff = R(`OFF.J.three.manual`);
const summary = {
  schema: 'tc2/ac38.closure.summary/1',
  status: 'HARNESS EVIDENCE ON THE PINNED TREE. Not an AC38 run. AC38 stays non-executable and is not passed. The bridge-off switch is an in-memory test control, not a derived tree or a guard.',
  tree: path.basename(TREE), tableSha256: TABLE_SHA256, scopeSha256: sha256(fs.readFileSync(scopePath)), traceSha256: sha256(fs.readFileSync(path.join(HERE, 'seal_path_trace.json'))), preloadSha256: anyOff?.provenance?.ac38PreloadSha256,
  mainSha256: anyOff?.provenance?.mainSha256, planningSha256: anyOff?.provenance?.planningSha256, safety: anyOff?.safety, stableContext: STABLE,
  processes: Object.keys(runs).length + brokeOut.length + 1, networkAttempts: Object.values(runs).reduce((a, r) => a + (r.result?.network?.guardAttempts ?? 0), 0),
  clean, downstream, planted: plantRows, plantedRecovered,
  ladders: ladders.map((l) => ({ name: l.name, rungs: l.rungs, finalRung: l.final?.rung, finalReturned: l.final?.returned, fieldHits: l.final?.fieldHits, registered: l.final?.registered, stoppedBy: l.stoppedBy })),
  fieldSites: siteTable,
  inventory: { staticComparison: { monitored: trace.comparison.monitored, derived: Object.keys(trace.derivedStores).length, omissions: trace.comparison.omissions, notDerived: trace.comparison.notDerived, unresolved: trace.comparison.unresolved, aliases: trace.comparison.aliases }, runtime: { writtenByItem: Object.fromEntries(Object.entries(written).sort()), outsideMonitored: [...outsideMonitored].sort(), mutatorSitesUnknownToStaticTrace: [...staticMiss].sort(), constructorAdds: [...constructorAdds].sort() }, outsideInventoryDigest: aliasRows, neverWrittenAtRuntime: [...monitored].filter((k) => !written[k]), storeMutatorSitesNotHit: trace.writes.filter((w) => w.decision === 'store' && w.class === 'mutator' && ![...journalledSites].some((j) => j.endsWith(` ${w.site}`))).map((w) => `${w.site} ${w.lhs}.${w.op}`) },
  breakage: breakResults, wrongSiteUnlock: wrongTrip, problems,
};
fs.writeFileSync(path.join(OUT, 'closure_summary.json'), `${JSON.stringify(summary, null, 1)}\n`);

console.log(`processes ${summary.processes}, problems ${problems.length}`);
for (const c of clean) console.log(`clean ${c.reason.padEnd(14)} call ${c.call} verdict [${c.verdict}] spy ${JSON.stringify(c.spy)} rec ${JSON.stringify(c.recovered)} vault ${c.vaultDelta} store ${c.storeDelta} | on: inv ${c.bridgeOn.inventoryWrites} let ${c.bridgeOn.lets} cog ${c.bridgeOn.spy.cognitive}/${c.bridgeOn.recovered?.cognitive} trip ${c.bridgeOn.tripped?.site}`);
console.log(JSON.stringify(downstream));
for (const p of plantRows) console.log(`plant ${p.plant.padEnd(22)}${p.mode} detected [${p.detectedBy}] digestSame ${p.finalDigestUnchanged} trip ${p.trip ?? '-'}`);
for (const l of ladders) { console.log(`ladder ${l.name}: ${l.rungs.length} rungs, final ${l.final?.rung} ${l.stoppedBy ?? ''}`); for (const r of l.rungs) console.log(`  ${r.rung} ${r.site} ${r.unlock ? `${r.unlock.kind} ${r.unlock.key ?? r.unlock.item} ${r.unlock.op ?? ''}` : '?'} static:${r.staticDecision}`); }
for (const r of siteTable) console.log(`site ${r.site.replace('render/', '').padEnd(34)} ${r.lhs.padEnd(26)} ${r.decision.padEnd(12)} in ${r.executedInWindow} stored ${r.onStoredObject} out ${r.executedOutsideWindow} tripped [${r.trippedIn}] ${r.status}`);
console.log(JSON.stringify(summary.inventory.runtime).slice(0, 900));
console.log(JSON.stringify(aliasRows));
console.log(`never written at runtime: ${summary.inventory.neverWrittenAtRuntime}`);
for (const b of breakResults) console.log(`break: ${b.refused && b.exitCode !== 0 ? 'REFUSED' : 'NOT REFUSED'} ${b.name} (exit ${b.exitCode})`);
console.log(`wrong-site unlock tripped at ${wrongTrip?.site}`);
for (const p of problems.slice(0, 50)) console.log(`PROBLEM ${p}`);
process.exit(problems.length ? 1 : 0);
