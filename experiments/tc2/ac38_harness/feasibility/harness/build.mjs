// ==========================================================
// AC38 limited feasibility study — builds rewrite_table.json, expected.json and MUTANTS.md
// ==========================================================
//   node experiments/tc2/ac38_harness/feasibility/harness/build.mjs <pinned-tree-dir>
// Static: reads pinned source as text to verify every anchor; imports nothing from the tree.
// The base table is the closure table at 3dc0082, copied unchanged and checked by hash.
// ==========================================================
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildMatrix } from './matrix.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FEAS = path.resolve(HERE, '..');
const PARENT = path.resolve(FEAS, '..');
const TREE = process.argv[2];
if (!TREE) { console.error('usage: build.mjs <pinned-tree-dir>'); process.exit(2); }
const die = (m) => { console.error(`build refused: ${m}`); process.exit(1); };
const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');
export const BASE_TABLE_SHA256 = '3dfd0b0650562e3af9040da41b7f84bd8d7e93aa77e4e5a5e1fb6920513eabb2';

const baseBytes = fs.readFileSync(path.join(PARENT, 'rewrite_table.json'));
if (sha256(baseBytes) !== BASE_TABLE_SHA256) die('the closure rewrite table is not the one at 3dc0082');
const base = JSON.parse(baseBytes.toString('utf8'));
const srcLines = (f) => fs.readFileSync(path.join(TREE, f), 'utf8').split('\n');
for (const [f, h] of Object.entries(base.sources)) if (sha256(fs.readFileSync(path.join(TREE, f))) !== h) die(`pinned source ${f} differs from the table`);

const ECE = 'render/episodicContextEngine.js';
const hook = (id) => `    globalThis.__AC38_MUTANT__("${id}", sealed); // start fresh episode`;
const MUT = [
  ['N-0', ECE, 398, '    // start fresh episode', hook('N-0')],
  ['MV-2a', ECE, 398, '    // start fresh episode', hook('MV-2a')],
  ['MV-2b', ECE, 398, '    // start fresh episode', hook('MV-2b')],
  ['MV-2c', ECE, 398, '    // start fresh episode', hook('MV-2c')],
  ['MV-3', ECE, 398, '    // start fresh episode', hook('MV-3')],
  ['MV-4', ECE, 339, '', '    liveRng();'],
  ['MV-5a', ECE, 339, '', '    liveRng("visual");'],
  ['MV-5b', ECE, 339, '', '    liveRng("environment");'],
  ['MV-6a', ECE, 366, '    episodeVault.push(sealed);', '    episodeVault.push(sealed); episodeVault.push(sealed);'],
  ['MV-6b', ECE, 360, '    currentEpisode.sealReason = reason;', '    currentEpisode.sealReason = reason; currentEpisode.ac38Extra = true;'],
  ['MV-6c', ECE, 398, '    // start fresh episode', '    workingMemory.set("__ac38__", 1); // start fresh episode'],
  ['MV-7a', ECE, 398, '    // start fresh episode', hook('MV-7a')],
  ['MV-7b', ECE, 398, '    // start fresh episode', hook('MV-7b')],
];
const HELPER = {
  'MV-2a': ['render/qlearning.js', 'export function __ac38_mut_q__() { const [k, v] = Q.entries().next().value; Q.set(k, v + 1); Q.set(k, v); }'],
  'MV-2b': ['render/embeddings.js', 'export function __ac38_mut_embedding__() { const n = neuronMapRef.get(1); const e = n.userData.embedding; n.userData.embedding = e.slice(); n.userData.embedding = e; }'],
  'MV-2c': ['render/schemaMemory.js', 'export function __ac38_mut_bonus__() { if (!_bonusCache.size) throw new Error("AC38 REFUSED: precondition: _bonusCache needs at least one entry"); const [k, v] = _bonusCache.entries().next().value; _bonusCache.set(k, null); _bonusCache.set(k, v); }'],
};

const rewrites = [...base.rewrites];
for (const [variant, file, line, anchor, replace] of MUT) {
  if (srcLines(file)[line - 1] !== anchor) die(`${variant}: ${file}:${line} is not ${JSON.stringify(anchor)}`);
  rewrites.push({ file, line, kind: 'variant', variant, anchor, replace });
}
const variantAppends = {};
const helperLine = {};
for (const [variant, [file, code]] of Object.entries(HELPER)) {
  if (!base.appends[file]) die(`${file} has no base accessor, so the helper line cannot be placed`);
  const line = srcLines(file).length + base.appends[file].split('\n').length + 1;
  variantAppends[variant] = { [file]: { code, line } };
  helperLine[variant] = `${file}:${line}`;
}
const table = { schema: 'tc2/ac38.feasibility_table/1', tree: base.tree, baseTableSha256: BASE_TABLE_SHA256, scopeSha256: base.scopeSha256, traceSha256: base.traceSha256, sources: base.sources, rewrites, appends: base.appends, variantAppends };
const tableText = `${JSON.stringify(table, null, 1)}\n`;
fs.writeFileSync(path.join(HERE, 'rewrite_table.json'), tableText);

const scope = JSON.parse(fs.readFileSync(path.join(PARENT, 'digest_scope.json'), 'utf8'));
const P = {
  reasons: ['manual', 'goal_reached'],
  mv1Reasons: ['tick_cap', 'goal_reached', 'context_shift', 'topic_switch', 'manual'],
  call: { manual: 2000, goal_reached: 2088, tick_cap: 2474, context_shift: 2000, topic_switch: 2000 },
  sites: { plant: `${ECE}:394`, mutLine: `${ECE}:398`, startLine: `${ECE}:339`, idDraw: `${ECE}:120`, vaultPush: `${ECE}:366`, q: helperLine['MV-2a'], emb: helperLine['MV-2b'], bonus: helperLine['MV-2c'] },
  mv1: {
    journalCount: { tick_cap: 19, goal_reached: 272, context_shift: 19, topic_switch: 19, manual: 19 },
    letCount: { tick_cap: 2, goal_reached: 5, context_shift: 2, topic_switch: 2, manual: 2 },
    draws: { 'cognitive render/episodeManager.js:789': 1, [`cognitive ${ECE}:120`]: 1 },
    probes: { _runPipeline: 1, _sealBuffer: 1, _storeEpisode: 1, bridge_callback: 1, recordAutonomousSuccess: 1 },
    trip: { site: 'render/semanticProvenance.js:180', kind: 'not_extensible' },
  },
  items: { q: 'Q', bonus: '_bonusCache', store: 'episodicStore', mv3Required: ['consolidationRegistry', 'semanticEdges'], mv3Allowed: ['conceptSchemas', 'consolidationRegistry', 'semanticEdges', 'stableMemory'] },
  vaultKey: `${ECE}#episodeVault`,
  workingMemoryKey: `${ECE}#workingMemory`,
  neutrality: { world: { stream: 'study', index: 18, configSeed: 201469 }, K: 500, reasons: ['manual', 'goal_reached', 'tick_cap'], seed: 2376807940, call: { tick_cap: 609 } },
  siteProbes: true,
  brokenFile: 'render/hud.js',
};
const expected = {
  schema: 'tc2/ac38.feasibility_expected/1',
  profile: 'pinned',
  status: 'LIMITED FEASIBILITY STUDY. Harness evidence only. Not complete method validation and not an AC38 run. AC38 stays non-executable and unpassed; the method stays unapproved.',
  defaults: { K: 2000, steps: 3000 },
  tableSha256: sha256(tableText),
  closedList: {
    fresh: ['contextTag', 'id', 'labels', 'nodes', 'reward', 'sealed', 'startTime'],
    outgoing: ['contextTag', 'duration', 'endTime', 'id', 'labels', 'nodes', 'reward', 'sealReason', 'sealed', 'startTime'],
  },
  inventoryKeys: scope.inventory.map((i) => `${i.file}#${i.binding}`).sort(),
  closedListKeys: [`${ECE}#currentEpisode`, `${ECE}#episodeVault`],
  outcomeRecordMutants: ['TC:422', 'TC:423', 'TC:424', 'TC:425'],
  rows: buildMatrix(P),
};
const expectedText = `${JSON.stringify(expected, null, 1)}\n`;
fs.writeFileSync(path.join(FEAS, 'expected.json'), expectedText);

// MUTANTS.md: generated, so it cannot drift from the table and the matrix
const rowsOf = (g) => expected.rows.filter((r) => r.group === g);
const lines = ['# AC38 limited feasibility study: controls and mutants', '', 'Generated by `harness/build.mjs`. Do not edit by hand. Harness evidence only: not an AC38 run.', '',
  'Every mutant exists only in memory in a disposable process. The base is the bridge-off control, except MV-1, which restores the bridge. A mutant row counts as detected only when every predicate holds, including the named detector. MV-7b is characterization only and never counts as a detected write. The four outcome-record mutants (TC:422-425) are not here: they stay untested and unresolved.', '',
  '| Group | Contract | In-memory change | Required detector | Counts as detection |', '|---|---|---|---|---|'];
const changeOf = (g) => {
  if (g === 'C-0') return 'bridge off at `render/episodicContextEngine.js:394`';
  if (g === 'MV-1') return 'none: the bridge stays on';
  if (g === 'P-1') return 'planted from the suppressed bridge line: `episodicStore[0]` written, then restored';
  if (g === 'P-2') return 'planted from the suppressed bridge line: one `_bonusCache` entry set to `null`, then restored';
  if (g === 'NW') return 'none: comparison of modes on world 18';
  if (g === 'BK') return 'deliberate breakage';
  const m = MUT.find(([v]) => v === g);
  const helper = HELPER[g] ? `; helper appended at \`${helperLine[g]}\`: \`${HELPER[g][1]}\`` : '';
  return `\`${m[1]}:${m[2]}\` becomes \`${m[4].trim()}\`${helper}`;
};
for (const g of [...new Set(expected.rows.map((r) => r.group))]) {
  const r = rowsOf(g)[0];
  lines.push(`| ${g} | ${r.contract} | ${changeOf(g)} | ${r.detector} | ${r.countsAsDetection ? 'yes' : 'no'} |`);
}
lines.push('', `Rows: ${expected.rows.length}. Runs: ${expected.rows.reduce((a, r) => a + r.runs.length, 0)}. Each row's exact predicates are in \`expected.json\`.`, '');
fs.writeFileSync(path.join(FEAS, 'MUTANTS.md'), lines.join('\n'));
console.log(JSON.stringify({ tableSha256: sha256(tableText), expectedSha256: sha256(expectedText), rows: expected.rows.length, runs: expected.rows.reduce((a, r) => a + r.runs.length, 0), helperLine }));
