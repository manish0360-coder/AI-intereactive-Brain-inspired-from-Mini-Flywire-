// ==========================================================
// AC38 limited feasibility study — builds the synthetic rehearsal's table, scope and expected rows
// ==========================================================
//   node experiments/tc2/ac38_harness/feasibility/rehearsal/build.mjs
// The rehearsal runs the study's preload, window, runner and evaluator on test-owned modules in
// ./synthetic_tree.  Lines are found by unique anchors, so the rows use the synthetic sites.
// ==========================================================
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildMatrix } from '../harness/matrix.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TREE = path.join(HERE, 'synthetic_tree');
const die = (m) => { console.error(`rehearsal build refused: ${m}`); process.exit(1); };
const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');
const ENG = 'render/engine.js', STO = 'render/stores.js', RNG = 'instrumentation/rng.js';
const src = (f) => fs.readFileSync(path.join(TREE, f), 'utf8').split('\n');
const lineOf = (f, anchor) => { const hits = src(f).map((l, i) => (l === anchor ? i + 1 : 0)).filter(Boolean); if (hits.length !== 1) die(`${f}: anchor ${JSON.stringify(anchor)} found ${hits.length} times`); return hits[0]; };

const sealDecl = 'export function sealCurrentEpisode(reason = "manual") {';
const L = {
  seal: lineOf(ENG, sealDecl), bridgeIf: lineOf(ENG, '    if (_bridge) {'), comment: lineOf(ENG, '    // start fresh episode'), vaultPush: lineOf(ENG, '    episodeVault.push(sealed);'),
  sealReason: lineOf(ENG, '    currentEpisode.sealReason = reason;'), idDraw: lineOf(ENG, '    return "ep" + liveRng().toString(36).slice(2, 6);'),
  learn: lineOf(STO, 'export function learnFromEpisode(ep) {'), let: lineOf(STO, '    _episodesStoredTotal++;'), push: lineOf(STO, '    episodicStore.push({ id: "s" + liveRng().toString(36).slice(2, 6), nodes: [...ep.nodes] });'),
};
L.start = L.seal + 1;
if (src(ENG)[L.start - 1] !== '') die('the line after the seal declaration must be blank');

const hook = (id) => `    globalThis.__AC38_MUTANT__("${id}", sealed); // start fresh episode`;
const rewrites = [
  { file: ENG, line: L.seal, kind: 'wrapper', anchor: sealDecl, replace: `${sealDecl} return globalThis.__AC38_SEAL__(__ac38_seal_inner__, reason); } function __ac38_seal_inner__(reason) {` },
  { file: STO, line: L.learn, kind: 'probe', name: 'learnFromEpisode', anchor: 'export function learnFromEpisode(ep) {', replace: 'export function learnFromEpisode(ep) { globalThis.__AC38_PROBE__("learnFromEpisode");' },
  { file: STO, line: L.let, kind: 'let', name: '_episodesStoredTotal', anchor: '    _episodesStoredTotal++;', replace: `    globalThis.__AC38_LET__("_episodesStoredTotal","${STO}:${L.let}"); _episodesStoredTotal++;` },
  { file: ENG, line: L.bridgeIf, kind: 'variant', variant: 'bridge_off', anchor: '    if (_bridge) {', replace: '    globalThis.__AC38_PROBE__(_bridge ? "bridge_suppressed" : "bridge_unset"); if (false) {' },
  ...['N-0', 'MV-2a', 'MV-2b', 'MV-2c', 'MV-3', 'MV-7a', 'MV-7b'].map((v) => ({ file: ENG, line: L.comment, kind: 'variant', variant: v, anchor: '    // start fresh episode', replace: hook(v) })),
  { file: ENG, line: L.comment, kind: 'variant', variant: 'MV-6c', anchor: '    // start fresh episode', replace: '    workingMemory.set("__ac38__", 1); // start fresh episode' },
  { file: ENG, line: L.start, kind: 'variant', variant: 'MV-4', anchor: '', replace: '    liveRng();' },
  { file: ENG, line: L.start, kind: 'variant', variant: 'MV-5a', anchor: '', replace: '    liveRng("visual");' },
  { file: ENG, line: L.start, kind: 'variant', variant: 'MV-5b', anchor: '', replace: '    liveRng("environment");' },
  { file: ENG, line: L.vaultPush, kind: 'variant', variant: 'MV-6a', anchor: '    episodeVault.push(sealed);', replace: '    episodeVault.push(sealed); episodeVault.push(sealed);' },
  { file: ENG, line: L.sealReason, kind: 'variant', variant: 'MV-6b', anchor: '    currentEpisode.sealReason = reason;', replace: '    currentEpisode.sealReason = reason; currentEpisode.ac38Extra = true;' },
];
const appends = {
  [STO]: ['export function __ac38_read__() { return { Q, episodicStore, _bonusCache, stableMemory, _episodesStoredTotal, semanticEdges, neuronMap }; }', 'let __ac38_canary_let__ = 0;', 'export function __ac38_touch_let__() { globalThis.__AC38_LET__("__canary__", "appended"); __ac38_canary_let__++; }', 'export function __ac38_plant_let__() { globalThis.__AC38_LET__("_episodesStoredTotal", "planted"); _episodesStoredTotal = _episodesStoredTotal; }'].join('\n'),
  [ENG]: ['export function __ac38_read__() { return { workingMemory, _bridge, episodeVault, currentEpisode }; }', 'export function __ac38_populate__(nodes, labels) { currentEpisode.nodes = nodes; currentEpisode.labels = labels; }'].join('\n'),
  [RNG]: 'export function __ac38_streams__() { return streams; }',
};
const helperLine = src(STO).length + appends[STO].split('\n').length + 1;
const variantAppends = {
  'MV-2a': { [STO]: { code: 'export function __ac38_mut_q__() { const [k, v] = Q.entries().next().value; Q.set(k, v + 1); Q.set(k, v); }', line: helperLine } },
  'MV-2b': { [STO]: { code: 'export function __ac38_mut_embedding__() { const n = neuronMap.get(1); const e = n.userData.embedding; n.userData.embedding = e.slice(); n.userData.embedding = e; }', line: helperLine } },
  'MV-2c': { [STO]: { code: 'export function __ac38_mut_bonus__() { if (!_bonusCache.size) throw new Error("AC38 REFUSED: precondition: _bonusCache needs at least one entry"); const [k, v] = _bonusCache.entries().next().value; _bonusCache.set(k, null); _bonusCache.set(k, v); }', line: helperLine } },
};

const scope = {
  schema: 'tc2/ac38.rehearsal_scope/1',
  covered: [
    ...['Q', 'episodicStore', '_bonusCache', 'stableMemory', '_episodesStoredTotal', 'semanticEdges', 'neuronMap'].map((name) => ({ file: STO, name })),
    ...['workingMemory', '_bridge', 'episodeVault', 'currentEpisode'].map((name) => ({ file: ENG, name })),
  ],
  globals: ['lastReasoning', 'recentMemory'],
  inventory: [
    ...['Q', 'episodicStore', '_bonusCache', 'stableMemory', '_episodesStoredTotal', 'semanticEdges'].map((n) => ({ item: n, file: STO, binding: n })),
    { item: 'neuron embeddings', file: STO, binding: 'neuronMap' },
  ],
};
const scopeText = `${JSON.stringify(scope, null, 1)}\n`;
fs.writeFileSync(path.join(HERE, 'digest_scope.json'), scopeText);
const sources = Object.fromEntries([RNG, ENG, STO].sort().map((f) => [f, sha256(fs.readFileSync(path.join(TREE, f)))]));
const table = { schema: 'tc2/ac38.rehearsal_table/1', tree: 'synthetic_tree', scopeSha256: sha256(scopeText), sources, rewrites, appends, variantAppends };
const tableText = `${JSON.stringify(table, null, 1)}\n`;
fs.writeFileSync(path.join(HERE, 'rewrite_table.json'), tableText);

const S = (f, n) => `${f}:${n}`;
const P = {
  reasons: ['manual', 'goal_reached'],
  mv1Reasons: ['manual', 'goal_reached'],
  call: { manual: 30, goal_reached: 35 },
  sites: { plant: S(ENG, L.bridgeIf), mutLine: S(ENG, L.comment), startLine: S(ENG, L.start), idDraw: S(ENG, L.idDraw), vaultPush: S(ENG, L.vaultPush), q: S(STO, helperLine), emb: S(STO, helperLine), bonus: S(STO, helperLine) },
  mv1: {
    journalCount: { manual: 2, goal_reached: 2 }, letCount: { manual: 1, goal_reached: 1 },
    draws: { [`cognitive ${S(STO, L.push)}`]: 1, [`cognitive ${S(ENG, L.idDraw)}`]: 1 },
    probes: { learnFromEpisode: 1 },
    trip: { site: S(STO, L.push), kind: 'not_extensible' },
  },
  items: { q: 'Q', bonus: '_bonusCache', store: 'episodicStore', mv3Required: ['semanticEdges', 'stableMemory'], mv3Allowed: ['semanticEdges', 'stableMemory'] },
  vaultKey: `${ENG}#episodeVault`,
  workingMemoryKey: `${ENG}#workingMemory`,
  neutrality: { world: null, K: 30, reasons: ['manual', 'goal_reached'], seed: 12345, call: {} },
  siteProbes: false,
  brokenFile: ENG,
};
const expected = {
  schema: 'tc2/ac38.feasibility_expected/1',
  profile: 'synthetic-rehearsal',
  status: 'SYNTHETIC REHEARSAL OF THE HARNESS. Test-owned modules only. Not pinned-tree evidence, not feasibility evidence and not an AC38 run.',
  defaults: { K: 30, steps: 60 },
  tableSha256: sha256(tableText),
  closedList: {
    fresh: ['contextTag', 'id', 'labels', 'nodes', 'reward', 'sealed', 'startTime'],
    outgoing: ['contextTag', 'duration', 'endTime', 'id', 'labels', 'nodes', 'reward', 'sealReason', 'sealed', 'startTime'],
  },
  inventoryKeys: scope.inventory.map((i) => `${i.file}#${i.binding}`).sort(),
  closedListKeys: [`${ENG}#currentEpisode`, `${ENG}#episodeVault`],
  rows: buildMatrix(P),
};
fs.writeFileSync(path.join(HERE, 'expected.json'), `${JSON.stringify(expected, null, 1)}\n`);
console.log(JSON.stringify({ tableSha256: sha256(tableText), lines: L, helperLine, rows: expected.rows.length, runs: expected.rows.reduce((a, r) => a + r.runs.length, 0) }));
