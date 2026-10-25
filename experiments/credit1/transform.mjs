// ==========================================================
// CREDIT-1 — experiment trees A and A+ from the pinned LEARN-0 tree (DESIGN r2 section 4)
// ==========================================================
// transformMain(baseText, arm)  pure: the LEARN-0 tree main.js -> the CREDIT-1 tree main.js for arm 'A' or 'A+'
//   * substitutions: exactly the census plan (A: 28 on 26 lines; A+: 32 on 30 lines), by whole-identifier replacement on the
//     planned lines only, each count checked against the plan;
//   * inserted lines (all guarded, default off): the alignment declaration(s), telemetry begin/end, three candidate-evaluation
//     probes (self-target counter), three episode-start probes, two goal-redirect counters.
// reverseMain(text, arm, plan)  removes the inserted lines and maps the substituted identifiers back (check S-2).
// buildCredit1Trees({ outRoot })  materialises LEARN-0 (pins verified), then tree A and tree A+, under the system temp dir.
// Production main.js and the repository tree are never written.  No tree file is ever executed here.
// ==========================================================
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildLearn0Tree } from '../learn0/transform.mjs';
import { censusBlock } from './census.mjs';
import { censusRoot } from './writecensus.mjs';
import { LEARN0_TREE } from './config.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');
const refuse = (m) => { throw new Error(`CREDIT-1 transform: ${m}`); };

const TEL = 'if (globalThis.__CREDIT1_TEL__) globalThis.__CREDIT1_TEL__';
export const LINES = Object.freeze({
  decl1: 'const __c1on = !!(globalThis.__CREDIT1__ && globalThis.__CREDIT1__.aligned === true), __c1o = __c1on ? agentCurrent : agentLast, __c1n = __c1on ? next : agentCurrent; // CREDIT-1 credit alignment (guarded, default off)',
  telBegin: `${TEL}.begin(__c1on, __c1o, next, agentLast, agentCurrent, __c1n, goalNeuronId); // CREDIT-1 telemetry (observational, call-only)`,
  decl2: 'const __c1p = (__c1on && globalThis.__CREDIT1__.edgeFiltered === true) ? __c1o : prev; // CREDIT-1 A+ edge-filtered operands (guarded, default off)',
  telEnd: `${TEL}.end(); // CREDIT-1 telemetry (observational, call-only)`,
  candAll: `    ${TEL}.candidate('all', currentKey, k); // CREDIT-1 self-target counter (observational, call-only)`,
  candStructure: `  ${TEL}.candidate('structure', currentKey, k); // CREDIT-1 self-target counter (observational, call-only)`,
  candEmbedding: `  ${TEL}.candidate('embedding', currentKey, k); // CREDIT-1 self-target counter (observational, call-only)`,
  epInitial: `    ${TEL}.episodeStart('initial', agentCurrent); // CREDIT-1 episode record (observational, call-only)`,
  epCap: `          ${TEL}.episodeStart('cap', agentCurrent); // CREDIT-1 episode record (observational, call-only)`,
  epGoal: `    ${TEL}.episodeStart('goal', agentCurrent); // CREDIT-1 episode record (observational, call-only)`,
  redirSurvival: `      ${TEL}.goalRedirect('survival'); // CREDIT-1 goal-redirect counter (observational, call-only)`,
  redirRecovery: `        ${TEL}.goalRedirect('recovery'); // CREDIT-1 goal-redirect counter (observational, call-only)`,
});
/** anchors: [line id, exact anchor text, 'after'|'before'] (each anchor must match exactly once in the LEARN-0 tree main.js) */
const ANCHORS = Object.freeze([
  ['candAll', '  allCandidates.forEach((value, k) => {', 'after'],
  ['candStructure', 'structureMap.forEach((value, k) => {', 'after'],
  ['candEmbedding', 'embeddingMap.forEach((value, k) => {', 'after'],
  ['epCap', '          agentLast    = agentCurrent;', 'after'],
  ['epInitial', '    agentCurrent = _pool[Math.floor(liveRng() * _pool.length)];', 'after'],
  ['redirSurvival', '      goalNeuronId = window.homeNeuronId;', 'before'],
  ['redirRecovery', '        goalNeuronId = window.homeNeuronId;', 'before'],
  ['epGoal', '    agentLast    = agentCurrent;', 'after'],
]);
export const insertedIds = (arm) => ['decl1', 'telBegin', ...(arm === 'A+' ? ['decl2'] : []), 'telEnd', ...ANCHORS.map(a => a[0])];

const ident = (id) => new RegExp(`(^|[^A-Za-z0-9_$])${id.replace('$', '\\$')}(?=[^A-Za-z0-9_$]|$)`, 'g');
function replaceIdent(line, from, to) { let n = 0; const out = line.replace(ident(from), (m, pre) => { n++; return pre + to; }); return { out, n }; }

/**
 * pure transform.  options.mutate (gate mutants only): { skipIdx } leave one planned line unsubstituted;
 * { extraIdx, extraFrom, extraTo } substitute on an unplanned line; { plusInA: true } apply the A+ operands in arm A.
 */
export function transformMain(baseText, arm, options = {}) {
  if (!['A', 'A+'].includes(arm)) refuse(`unknown arm ${arm}`);
  if (baseText.includes('__CREDIT1')) refuse('the base already carries CREDIT-1 lines');
  const L = baseText.split('\n');
  const census = censusBlock(baseText, { tree: true });
  if (census.problems.length) refuse(`base census failed: ${census.problems[0]}`);
  const planKey = options.mutate && options.mutate.plusInA && arm === 'A' ? 'A+' : arm;
  const plan = census.plan[planKey];
  const subs = [];
  for (const p of plan) {
    if (options.mutate && options.mutate.skipIdx === p.idx) continue;
    let line = L[p.idx], n = 0;
    for (const [from, to] of p.ops) { const r = replaceIdent(line, from, to); line = r.out; n += r.n; }
    if (n !== p.count) refuse(`line ${p.line}: ${n} substitutions, plan says ${p.count}`);
    subs.push({ baseIdx: p.idx, baseLine: p.line, action: p.action, count: n, text: line });
    L[p.idx] = line;
  }
  if (options.mutate && Number.isInteger(options.mutate.extraIdx)) {
    const r = replaceIdent(L[options.mutate.extraIdx], options.mutate.extraFrom, options.mutate.extraTo);
    L[options.mutate.extraIdx] = r.out;
  }
  // insertions, located on the base indices
  const ins = [];
  const b = census.block;
  ins.push({ idx: b.openIdx, where: 'after', ids: ['decl1', 'telBegin'] });
  ins.push({ idx: b.closeIdx, where: 'before', ids: ['telEnd'] });
  if (arm === 'A+') {
    const prevRow = census.rows.find(r => r.text === 'const prev = agentLast; // 👉 where we were before');
    ins.push({ idx: prevRow.idx, where: 'after', ids: ['decl2'] });
  }
  const base = baseText.split('\n');
  for (const [id, anchor, where] of ANCHORS) {
    const hits = base.map((l, i) => (l === anchor ? i : -1)).filter(i => i >= 0);
    if (hits.length !== 1) refuse(`${id}: anchor matched ${hits.length} times`);
    ins.push({ idx: hits[0], where, ids: [id] });
  }
  // the goal-reset episode probe must sit inside the block, right after the RESET pair
  const goalIns = ins.find(x => x.ids[0] === 'epGoal');
  if (!(goalIns.idx > b.openIdx && goalIns.idx < b.closeIdx)) refuse('epGoal anchor is not inside the credit block');
  // build the output with a base->output line map
  const before = new Map(), after = new Map();
  for (const x of ins) { const m = x.where === 'after' ? after : before; if (m.has(x.idx)) refuse(`two insertions at base line ${x.idx + 1} (${x.where})`); m.set(x.idx, x.ids); }
  const out = [], lineMap = new Array(L.length), inserted = [];
  for (let i = 0; i < L.length; i++) {
    for (const id of before.get(i) || []) { inserted.push({ id, line: out.length + 1 }); out.push(LINES[id]); }
    lineMap[i] = out.length; out.push(L[i]);
    for (const id of after.get(i) || []) { inserted.push({ id, line: out.length + 1 }); out.push(LINES[id]); }
  }
  const expected = insertedIds(arm);
  if (inserted.length !== expected.length || !expected.every(id => inserted.some(x => x.id === id))) refuse('inserted-line set differs from the declared set');
  return { text: out.join('\n'), arm, plan, census, subs, inserted, lineMap, totals: census.totals[arm] };
}

/** inverse used by check S-2: remove the inserted lines, map identifiers back on the planned lines (plan from the base census) */
export function reverseMain(text, arm, plan) {
  const ids = insertedIds(arm);
  const L = text.split('\n');
  const keep = [];
  const seen = Object.fromEntries(ids.map(id => [id, 0]));
  for (const l of L) { const id = ids.find(k => LINES[k] === l); if (id) { seen[id]++; continue; } keep.push(l); }
  const problems = ids.filter(id => seen[id] !== 1).map(id => `inserted line ${id} found ${seen[id]} times`);
  const byIdx = new Map(plan.map(p => [p.idx, p]));
  for (let i = 0; i < keep.length; i++) {
    const p = byIdx.get(i);
    if (!p) { if (/__c1[onp]\b/.test(keep[i])) problems.push(`line ${i + 1}: a CREDIT-1 identifier outside the plan`); continue; }
    for (const [from, to] of p.ops) keep[i] = replaceIdent(keep[i], to, from).out;
  }
  return { text: keep.join('\n'), problems };
}

export function transformDigest() { return sha256(fs.readFileSync(path.join(HERE, 'transform.mjs'))); }

/** materialise LEARN-0 (pins verified) and trees A and A+ under outRoot */
export function buildCredit1Trees({ outRoot = path.join(os.tmpdir(), 'mfw-credit1') } = {}) {
  const learn0 = buildLearn0Tree({ outRoot: path.join(outRoot, 'learn0base') });
  const baseBytes = fs.readFileSync(path.join(learn0.dir, 'main.js'));
  if (sha256(baseBytes) !== LEARN0_TREE.mainSha256) refuse('the LEARN-0 tree main.js is not the pinned one');
  if (sha256(fs.readFileSync(path.join(learn0.dir, 'render', 'planning.js'))) !== LEARN0_TREE.planningSha256) refuse('the LEARN-0 tree planning.js is not the pinned one');
  const baseText = baseBytes.toString('utf8');
  const wc = censusRoot(learn0.dir);
  if (wc.problems.length) refuse(`write census of the LEARN-0 tree failed: ${wc.problems[0]}`);
  const trees = {};
  for (const arm of ['A', 'A+']) {
    const t = transformMain(baseText, arm);
    // the ledger's site table: tree main.js line -> write-census class (writes in render modules are attributed to their main.js caller)
    t.siteClasses = Object.fromEntries(wc.rows.filter(r => r.file === 'main.js').map(r => [t.lineMap[r.idx] + 1, r.cls]));
    const dir = path.join(outRoot, `credit1-${arm === 'A' ? 'A' : 'Aplus'}-${sha256(t.text).slice(0, 12)}`);
    fs.rmSync(dir, { recursive: true, force: true });
    fs.cpSync(learn0.dir, dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'main.js'), t.text);
    const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'MANIFEST.json'), 'utf8'));
    manifest.files['main.js'] = sha256(t.text);
    manifest.credit1 = { arm, baseLearn0MainSha256: LEARN0_TREE.mainSha256, mainSha256: sha256(t.text), transformSha256: transformDigest(),
      substitutions: t.totals, inserted: Object.fromEntries(t.inserted.map(x => [x.id, { line: x.line, sha256: sha256(LINES[x.id]) }])), siteClasses: t.siteClasses };
    fs.writeFileSync(path.join(dir, 'MANIFEST.json'), JSON.stringify(manifest, null, 1));
    trees[arm] = { dir, manifest, transform: t };
  }
  return { learn0, baseText, trees };
}
