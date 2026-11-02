// ==========================================================
// AC38 harness prototype — pinned-tree failing control: matrix, comparisons, deliberate breakage
// ==========================================================
//   node experiments/tc2/ac38_harness/run_control.mjs <out-dir-outside-the-repo> [--calibrate]
// Spawns one disposable process per fixture and writes only into <out-dir>.  This is a prototype
// control on the pinned tree.  It is not an AC38 run and it does not make AC38 executable.
// ==========================================================
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, TREE, TABLE_SHA256, STEPS, K, REASONS, tablePath, scopePath, outDir, makeRun, pool } from './runner.mjs';

const FIXTURES = ['empty', 'two', 'three'];
const CLB_ALLOWED = ['render/episodicContextEngine.js#episodeVault'];
const INSTRUMENTATION_FIXTURE = ['render/episodicContextEngine.js#currentEpisode'];

const OUT = outDir('run_control.mjs');
const run = makeRun(OUT);
const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');
const url = (f) => pathToFileURL(f).href;

if (process.argv.includes('--calibrate')) {
  const r = await run({ label: 'calibrate', mode: 'D', fixture: 'empty', reason: 'manual', calibrate: true });
  fs.writeFileSync(path.join(OUT, 'calibrate.json'), JSON.stringify(r, null, 1));
  console.log(JSON.stringify({ code: r.code, stderr: r.stderr, refused: r.result?.refused, failed: r.result?.failed, safety: r.result?.safety, fingerprint: r.result?.fingerprint, transform: r.result?.provenance?.transform, seals: r.result?.naturalSeals?.length }, null, 1));
  const seals = r.result?.naturalSeals ?? [];
  const byReason = {};
  for (const s of seals) (byReason[s[1]] ||= []).push(s[0]);
  console.log(JSON.stringify(Object.fromEntries(Object.entries(byReason).map(([k, v]) => [k, v.join(' ')]))));
  for (const s of seals.filter((_, i) => i % Math.max(1, Math.floor(seals.length / 6)) === 0)) console.log(JSON.stringify(s));
  process.exit(r.code === 0 ? 0 : 1);
}

if (process.argv.includes('--scan-cap')) {
  const { generateAcceptedStream } = await import(url(path.join(ROOT, 'experiments', 'm7', 'env.js')));
  const worlds = generateAcceptedStream(200000, 30).map((w, i) => ({ stream: 'study', index: i, configSeed: w.acceptedSeed, goal: w.goal }));
  const res = await pool(worlds.map((w) => () => run({ label: `scan${w.index}`, mode: 'D', fixture: 'empty', reason: 'manual', calibrate: true, world: { stream: w.stream, index: w.index, configSeed: w.configSeed } })));
  res.forEach((r, i) => {
    const seals = r.result?.naturalSeals ?? [];
    const cap = seals.filter((s) => s[1] === 'tick_cap');
    const stores = cap[0]?.[2] ?? null;
    console.log(JSON.stringify({ index: i, configSeed: worlds[i].configSeed, goal: worlds[i].goal, code: r.code, note: r.result?.refused ?? r.result?.failed ?? null, goalSeals: seals.filter((s) => s[1] === 'goal_reached').length, capSeals: cap.map((s) => s[0]).slice(0, 6), storesAtFirstCap: stores }));
  });
  process.exit(0);
}

// ---- the matrix ----
const cases = [];
for (const reason of REASONS) for (const fixture of FIXTURES) for (const mode of ['B', 'D', 'J', 'T', 'R0', 'R1']) {
  if (mode === 'B' && fixture !== 'empty') continue;
  cases.push({ label: `${mode}.${fixture}.${reason}`, mode, fixture, reason });
}
for (const reason of REASONS) cases.push({ label: `D2.empty.${reason}`, mode: 'D', fixture: 'empty', reason });
for (const reason of REASONS) cases.push({ label: `TF.three.${reason}`, mode: 'T', fieldsOnly: true, fixture: 'three', reason });
const outs = await pool(cases.map((c) => () => run(c)));
const runs = {};
outs.forEach((r) => { runs[r.label] = r; fs.writeFileSync(path.join(OUT, 'runs', `${r.label}.json`), JSON.stringify(r)); });

const problems = [];
const check = (item, ok, what) => { if (!ok) problems.push(`item ${item}: ${what}`); return ok; };
const R = (m, f, r) => runs[`${m}.${f}.${r}`]?.result;
const W = (m, f, r) => R(m, f, r)?.window;
for (const r of outs) check(0, r.code === 0 && r.result && !r.result.refused && !r.result.failed, `${r.label} did not complete: code ${r.code} ${r.result?.refused ?? r.result?.failed ?? r.stderr.slice(0, 300)}`);

const streamCounts = (w) => { const c = { cognitive: 0, visual: 0, environment: 0 }; for (const d of w?.observed?.draws ?? []) c[d.stream] = (c[d.stream] || 0) + 1; return c; };
const delta = (reason, fixture) => {
  const a = W('R0', fixture, reason)?.positions, b = W('R1', fixture, reason)?.positions;
  return a && b ? { cognitive: b.cognitive - a.cognitive, visual: b.visual - a.visual, environment: b.environment - a.environment } : null;
};
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const rowDiff = (x, y) => Object.keys({ ...x, ...y }).filter((k) => x[k] !== y[k]).sort();
const summarise = (list) => { const m = {}; for (const e of list) m[e] = (m[e] || 0) + 1; return Object.fromEntries(Object.entries(m).sort()); };

const perWindow = [], pairs = [];
for (const reason of REASONS) {
  for (const fixture of FIXTURES) {
    const j = W('J', fixture, reason), t = W('T', fixture, reason);
    const writes = j?.observed?.inventoryWrites ?? [];
    const row = {
      reason, fixture, call: j?.call, nodes: j?.nodes, labels: j?.labels, returned: j?.returned, seeded: j?.seeded,
      journal: { inventoryWrites: writes.length, byItem: summarise(writes.map((w) => w.item)), bySite: summarise(writes.map((w) => `${w.op} ${w.site}`)), letWrites: summarise((j?.observed?.lets ?? []).map((l) => `${l.name} ${l.site}`)), unregisteredMutatorCalls: j?.observed?.unregistered, registeredObjects: j?.observed?.registeredObjects },
      probes: j?.probes, logs: j?.logs ?? [],
      streams: { spy: streamCounts(j), drawSites: summarise((j?.observed?.draws ?? []).map((d) => `${d.stream} ${d.site}`)), recovered: delta(reason, fixture), mathRandom: j?.observed?.mathRandom },
      vaultDelta: j?.vaultDelta, storeDelta: j?.storeDelta,
      canaries: { J: { open: j?.canaryOpen, close: j?.canaryClose }, T: { open: t?.canaryOpen, close: t?.canaryClose, tripOpen: t?.tripCanaryOpen, tripClose: t?.tripCanaryClose } },
      tripwire: { fired: !!t?.tripped, detail: t?.tripped ?? null, journalWritesBeforeTrip: t?.observed?.inventoryWrites?.length, firstJournalledBeforeTrip: t?.observed?.inventoryWrites?.[0] ?? null },
      fieldTripwire: fixture === 'three' ? { detail: W('TF', fixture, reason)?.tripped ?? null, journalWritesBeforeTrip: W('TF', fixture, reason)?.observed?.inventoryWrites?.length } : null,
    };
    perWindow.push(row);

    // item 1: identical inputs and source, ordered comparisons
    const modes = ['D', 'J', 'T', 'R0', 'R1', ...(fixture === 'empty' ? ['B', 'D2'] : [])];
    const inp = R('D', fixture, reason)?.inputDigest;
    for (const m of modes) {
      check(1, R(m, fixture, reason)?.inputDigest === inp, `${m}.${fixture}.${reason} input digest differs`);
      check(1, R(m, fixture, reason)?.provenance?.mainSha256 === R('D', fixture, reason)?.provenance?.mainSha256, `${m}.${fixture}.${reason} source differs`);
    }
    check(1, R('D', fixture, reason)?.fingerprint?.public === R('J', fixture, reason)?.fingerprint?.public, `D vs J public fingerprint differs: ${fixture}.${reason}`);
    check(1, R('D', fixture, reason)?.fingerprint?.m7 === R('J', fixture, reason)?.fingerprint?.m7, `D vs J M7 fingerprint differs: ${fixture}.${reason}`);
    if (fixture === 'empty') {
      check(1, R('B', fixture, reason)?.fingerprint?.public === R('D', fixture, reason)?.fingerprint?.public, `B vs D public fingerprint differs: ${reason}`);
      check(1, R('B', fixture, reason)?.fingerprint?.m7 === R('D', fixture, reason)?.fingerprint?.m7, `B vs D M7 fingerprint differs: ${reason}`);
      check(1, R('D2', fixture, reason)?.fingerprint?.public === R('D', fixture, reason)?.fingerprint?.public, `D repeat differs: ${reason}`);
    }
    for (const m of ['J', 'T', 'R0', 'R1', ...(fixture === 'three' ? ['TF'] : [])]) {
      check(1, R(m, fixture, reason)?.inputDigest === inp, `${m}.${fixture}.${reason} input digest differs`);
      check(1, W(m, fixture, reason)?.digestBefore?.root === W('D', fixture, reason)?.digestBefore?.root, `${m}.${fixture}.${reason} digest at seal entry differs from D`);
      check(1, W(m, fixture, reason)?.digestAfterPopulation?.root === W('D', fixture, reason)?.digestAfterPopulation?.root, `${m}.${fixture}.${reason} digest after population differs from D`);
    }
    // recovery agrees with the spy
    const spy = streamCounts(j), rec = row.streams.recovered;
    check(6, rec && spy.cognitive === rec.cognitive && spy.visual === rec.visual && spy.environment === rec.environment, `stream spy ${JSON.stringify(spy)} vs recovery ${JSON.stringify(rec)}: ${fixture}.${reason}`);

    // item 5: every window
    const ones = (c) => c && Object.values(c).every((n) => n === 1);
    check(5, ones(j?.canaryOpen) && ones(j?.canaryClose), `journal window canary: ${fixture}.${reason}`);
    check(5, ones(t?.canaryOpen) && ones(t?.canaryClose) && ones(t?.tripCanaryOpen) && ones(t?.tripCanaryClose), `tripwire window canary: ${fixture}.${reason}`);
  }

  // fixture equivalence and pair comparison at the end of the call
  const je = W('J', 'empty', reason), j2 = W('J', 'two', reason), j3 = W('J', 'three', reason);
  check(1, je?.digestBefore?.root === j2?.digestBefore?.root && je?.digestBefore?.root === j3?.digestBefore?.root, `fixtures differ before population: ${reason}`);
  const pop2 = rowDiff(je?.digestAfterPopulation?.rows ?? {}, j2?.digestAfterPopulation?.rows ?? {}), pop3 = rowDiff(je?.digestAfterPopulation?.rows ?? {}, j3?.digestAfterPopulation?.rows ?? {});
  check(1, same(pop2, INSTRUMENTATION_FIXTURE) && same(pop3, INSTRUMENTATION_FIXTURE), `population changed more than the context episode: ${reason} ${pop2} ${pop3}`);
  check(1, je?.episodeRestAfter === j2?.episodeRestAfter && je?.episodeRestAfter === j3?.episodeRestAfter, `population changed a context field other than nodes and labels: ${reason}`);
  const d2 = rowDiff(je?.digestReturn?.rows ?? {}, j2?.digestReturn?.rows ?? {}), d3 = rowDiff(je?.digestReturn?.rows ?? {}, j3?.digestReturn?.rows ?? {});
  pairs.push({ reason, emptyVsTwo: d2, emptyVsThree: d3, outsideClosedList: { emptyVsTwo: d2.filter((k) => !CLB_ALLOWED.includes(k)), emptyVsThree: d3.filter((k) => !CLB_ALLOWED.includes(k)) } });

  // item 2: empty, clean control
  const c1 = { cognitive: 1, visual: 0, environment: 0 };
  const e = perWindow.find((w) => w.reason === reason && w.fixture === 'empty');
  check(2, e.returned === 'null' && e.journal.inventoryWrites === 0 && Object.keys(e.journal.letWrites).length === 0, `empty fixture wrote: ${reason} ${JSON.stringify(e.journal.byItem)}`);
  check(2, same(e.streams.spy, c1) && same(e.streams.recovered, c1) && e.streams.mathRandom === 0, `empty fixture stream delta: ${reason} ${JSON.stringify(e.streams)}`);
  check(2, e.vaultDelta === 0 && e.storeDelta === 0 && !e.tripwire.fired && Object.keys(e.probes ?? {}).length === 0, `empty fixture touched the bridge or tripped: ${reason}`);

  // item 3: two nodes, the vacuity trap
  const v = perWindow.find((w) => w.reason === reason && w.fixture === 'two');
  check(3, v.returned === 'sealed' && v.vaultDelta === 1 && v.storeDelta === 0, `two-node seal shape: ${reason}`);
  check(3, v.probes?.bridge_callback === 1 && v.probes?.recordAutonomousSuccess === 1 && v.probes?._sealBuffer === 1 && !v.probes?._runPipeline && !v.probes?._storeEpisode, `two-node probes: ${reason} ${JSON.stringify(v.probes)}`);
  check(3, v.logs.some((l) => l.includes('REJECT gate4:length')), `two-node gate log missing: ${reason}`);
  check(3, v.journal.inventoryWrites === 0 && Object.keys(v.journal.letWrites).length === 0 && !v.tripwire.fired, `two-node wrote the inventory: ${reason} ${JSON.stringify(v.journal.byItem)}`);
  check(3, same(v.streams.spy, c1) && same(v.streams.recovered, c1), `two-node stream delta: ${reason} ${JSON.stringify(v.streams)}`);
  check(3, same(d2, CLB_ALLOWED), `two-node final state differs outside the closed list: ${reason} ${d2}`);

  // item 4: three nodes, reachability and the expected violations
  const h = perWindow.find((w) => w.reason === reason && w.fixture === 'three');
  check(4, new Set(h.nodes).size === 3 && h.returned === 'sealed' && h.storeDelta === 1, `three-node seal shape: ${reason}`);
  check(4, h.probes?.bridge_callback === 1 && h.probes?.recordAutonomousSuccess === 1 && h.probes?._sealBuffer >= 1 && h.probes?._runPipeline >= 1 && h.probes?._storeEpisode >= 1, `three-node probes: ${reason} ${JSON.stringify(h.probes)}`);
  check(4, ['PASS gates4-6', '[EPISODE ACCEPTED]', '[EPISODE STORED]'].every((s) => h.logs.some((l) => l.includes(s))), `three-node pipeline logs missing: ${reason}`);
  check(4, h.journal.inventoryWrites > 0 && Object.keys(h.journal.letWrites).some((k) => k.startsWith('_episodesStoredTotal')), `three-node clause (a) did not fail: ${reason}`);
  check(4, h.journal.bySite['Array.push render/episodeManager.js:1110'] === 1, `three-node store push not journalled: ${reason}`);
  check(4, h.streams.spy.cognitive >= 2 && h.streams.recovered?.cognitive === h.streams.spy.cognitive, `three-node clause (b) did not fail: ${reason} ${JSON.stringify(h.streams)}`);
  check(4, h.streams.drawSites['cognitive render/episodeManager.js:789'] >= 1, `three-node draw at the store id not seen: ${reason}`);
  check(4, h.tripwire.fired && h.tripwire.detail.name === 'TypeError' && h.tripwire.detail.site !== 'harness', `three-node tripwire did not fire on application code: ${reason}`);
  check(4, d3.some((k) => !CLB_ALLOWED.includes(k)), `three-node final state matched the empty fixture: ${reason}`);

  // item 6: real hits, not only canaries
  check(6, h.journal.inventoryWrites > 0, `journal has no real hit: ${reason}`);
  check(6, Object.keys(h.streams.drawSites).length > 0, `stream spy has no real hit: ${reason}`);
  const armedTrip = h.tripwire.detail, fieldTrip = h.fieldTripwire.detail;
  check(6, armedTrip && /Cannot add property|object is not extensible/.test(armedTrip.message), `tripwire array hit not seen: ${reason} ${JSON.stringify(armedTrip)}`);
  check(6, fieldTrip?.name === 'TypeError' && /read only property/.test(fieldTrip.message) && fieldTrip.site !== 'harness', `no application field write caught: ${reason} ${JSON.stringify(fieldTrip)}`);
  check(6, d3.includes('main.js#neuronMap'), `digest did not see the embedding change: ${reason}`);
}

// ---- deliberate breakage ----
const tableText = fs.readFileSync(tablePath, 'utf8');
const brokenTable = (name, edit) => {
  const t = JSON.parse(tableText); edit(t);
  const text = `${JSON.stringify(t, null, 1)}\n`; const p = path.join(OUT, `table_${name}.json`);
  fs.writeFileSync(p, text);
  return { tablePath: p, tableSha256: sha256(text) };
};
const brokenTree = path.join(OUT, 'broken_tree');
fs.rmSync(brokenTree, { recursive: true, force: true });
fs.cpSync(TREE, brokenTree, { recursive: true });
fs.appendFileSync(path.join(brokenTree, 'render', 'hud.js'), ' ');
const scopeBad = path.join(OUT, 'scope_bad.json');
fs.writeFileSync(scopeBad, `${fs.readFileSync(scopePath, 'utf8')} `);

const base = { fixture: 'three', reason: 'manual' };
const breakage = [
  { name: 'wrong rewrite-table hash', expect: /does not match its pinned hash/, input: { mode: 'D', ...base, tableSha256: '0'.repeat(64) } },
  { name: 'source hash mismatch, transformed', expect: /source hash mismatch on render\/hud\.js/, input: { mode: 'D', ...base, tree: brokenTree } },
  { name: 'source hash mismatch, bare', expect: /source hash mismatch on render\/hud\.js/, input: { mode: 'B', fixture: 'empty', reason: 'manual', tree: brokenTree } },
  { name: 'broken anchor', expect: /anchor mismatch at render\/episodicContextEngine\.js:338/, input: { mode: 'D', ...base, ...brokenTable('anchor', (t) => { t.rewrites[0].anchor += ' '; }) } },
  { name: 'missing let rewrite', expect: /expected 6 let rewrites, applied 5/, input: { mode: 'D', ...base, ...brokenTable('let', (t) => { t.rewrites = t.rewrites.filter((r) => !(r.kind === 'let' && r.line === 1115)); }) } },
  { name: 'missing probe rewrite', expect: /expected 5 probe rewrites, applied 4/, input: { mode: 'D', ...base, ...brokenTable('probe', (t) => { t.rewrites = t.rewrites.filter((r) => !(r.kind === 'probe' && r.line === 820)); }) } },
  { name: 'instrumentation target never loaded', expect: /target render\/not_there\.js was never loaded/, input: { mode: 'D', ...base, ...brokenTable('target', (t) => { t.appends['render/not_there.js'] = '// nothing'; }) } },
  { name: 'digest scope altered', expect: /digest scope does not match/, input: { mode: 'D', ...base, scopePath: scopeBad } },
  { name: 'required binding missing from accessor', expect: /bindings of render\/memory\.js differ from the scope/, input: { mode: 'D', ...base, ...brokenTable('missing', (t) => { t.appends['render/memory.js'] = t.appends['render/memory.js'].replace('transitions, ', ''); }) } },
  { name: 'required binding does not resolve', expect: /binding unreadable in render\/memory\.js/, input: { mode: 'D', ...base, ...brokenTable('bogus', (t) => { t.appends['render/memory.js'] = t.appends['render/memory.js'].replace('transitions,', '__no_such_binding__,'); }) } },
  { name: 'value unreadable', expect: /global unreadable lastClicked/, input: { mode: 'D', ...base, breakKnob: 'unreadable' } },
  { name: 'required global absent', expect: /required global recentMemory is absent/, input: { mode: 'D', ...base, breakKnob: 'absentGlobal' } },
  { name: 'journal disabled', expect: /canary did not fire/, input: { mode: 'J', ...base, breakKnob: 'journal' } },
  { name: 'stream spy disabled', expect: /canary did not fire/, input: { mode: 'J', ...base, breakKnob: 'stream' } },
  { name: 'let journal disabled', expect: /canary did not fire/, input: { mode: 'J', ...base, breakKnob: 'let' } },
  { name: 'tripwire disabled', expect: /tripwire canary did not fire/, input: { mode: 'T', ...base, breakKnob: 'tripwire' } },
];
const brokeOut = await pool(breakage.map((b, i) => () => run({ label: `break${i}`, ...b.input })));
const breakResults = breakage.map((b, i) => {
  const r = brokeOut[i]; const text = `${r.result?.refused ?? ''} ${r.stderr}`;
  const row = { name: b.name, exitCode: r.code, refused: b.expect.test(text), message: (/AC38 REFUSED: [^\n]*/.exec(text)?.[0] ?? '').slice(0, 160) };
  check(7, r.code !== 0 && row.refused, `${b.name}: exit ${r.code} ${text.slice(0, 240)}`);
  return row;
});
fs.rmSync(brokenTree, { recursive: true, force: true });

const anyD = R('D', 'empty', 'manual');
const dig = W('J', 'three', 'manual')?.digestBefore;
const threes = perWindow.filter((w) => w.fixture === 'three');
const hitItems = new Set(threes.flatMap((w) => [...Object.keys(w.journal.byItem), ...Object.keys(w.journal.letWrites).map((k) => k.split(' ')[0])]));
const letSites = new Set(threes.flatMap((w) => Object.keys(w.journal.letWrites).map((k) => k.split(' ')[1])));
const fieldSites = [...new Set(threes.map((w) => w.fieldTripwire.detail?.site))].sort();
const inventory = JSON.parse(fs.readFileSync(scopePath, 'utf8')).inventory.map((i) => i.item);
const summary = {
  schema: 'tc2/ac38.prototype.summary/1',
  status: 'PROTOTYPE CONTROL ON THE PINNED TREE. Not an AC38 run. AC38 stays non-executable and is not passed.',
  tree: path.basename(TREE), tableSha256: TABLE_SHA256, scopeSha256: sha256(fs.readFileSync(scopePath)),
  preloadSha256: anyD?.provenance?.ac38PreloadSha256, clockPreloadSha256: anyD?.provenance?.clockPreloadSha256, mainSha256: anyD?.provenance?.mainSha256, planningSha256: anyD?.provenance?.planningSha256,
  transform: anyD?.provenance?.transform, safety: anyD?.safety, K, steps: STEPS, processes: outs.length + brokeOut.length,
  digest: { bindings: dig?.bindings, opaque: dig?.opaque, opaqueTop: Object.entries(dig?.opaqueByBinding ?? {}).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, 12), opaqueBindings: Object.keys(dig?.opaqueByBinding ?? {}).length, absentGlobals: dig?.absentGlobals },
  networkAttempts: outs.reduce((a, r) => a + (r.result?.network?.guardAttempts ?? 0), 0),
  realHitCoverage: { journalAndLetItems: [...hitItems].sort(), inventoryItemsWithNoJournalOrLetHit: inventory.filter((i) => !hitItems.has(i)), letSitesHit: [...letSites].sort(), firstFieldWriteSites: fieldSites },
  perWindow, pairs, breakage: breakResults,
  fingerprints: Object.fromEntries(REASONS.flatMap((r) => FIXTURES.map((f) => [`${f}.${r}`, { D: R('D', f, r)?.fingerprint?.public, J: R('J', f, r)?.fingerprint?.public, ...(f === 'empty' ? { B: R('B', f, r)?.fingerprint?.public, D2: R('D2', f, r)?.fingerprint?.public } : {}) }]))),
  problems,
};
fs.writeFileSync(path.join(OUT, 'summary.json'), `${JSON.stringify(summary, null, 1)}\n`);

console.log(`processes ${summary.processes}, problems ${problems.length}`);
for (const w of perWindow) console.log(`${w.reason.padEnd(14)}${w.fixture.padEnd(6)} call ${String(w.call).padEnd(5)} ret ${String(w.returned).padEnd(7)} inv ${String(w.journal.inventoryWrites).padEnd(4)} let ${String(Object.keys(w.journal.letWrites).length).padEnd(2)} spy ${JSON.stringify(w.streams.spy)} rec ${JSON.stringify(w.streams.recovered)} vault ${w.vaultDelta} store ${w.storeDelta} trip ${w.tripwire.fired ? w.tripwire.detail.site : '-'} field ${w.fieldTripwire?.detail?.site ?? '-'}`);
console.log(JSON.stringify(summary.realHitCoverage));
for (const b of breakResults) console.log(`break: ${b.refused && b.exitCode !== 0 ? 'REFUSED' : 'NOT REFUSED'} ${b.name} (exit ${b.exitCode})`);
for (const p of problems.slice(0, 40)) console.log(`PROBLEM ${p}`);
process.exit(problems.length ? 1 : 0);
