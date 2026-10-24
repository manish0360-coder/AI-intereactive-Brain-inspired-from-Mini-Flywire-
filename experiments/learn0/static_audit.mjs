// ==========================================================
// LEARN-0 — executable map-knowledge call-graph audit (DESIGN.md section 3)
// ==========================================================
// Every line of main.js and render/*.js in the LEARN-0 tree that reads graph structure beyond a constant (`.neighbors`, a BFS queue) or
// names a map oracle is listed in map_audit_table.json with its exact text and a class.  Because the tree files are pinned by content,
// line numbers are stable: the audit requires the scanned set to EQUAL the table (no unlisted site, no stale entry, identical text) and
// checks the structural facts the classes rely on.  A second, broader name sweep (SWEEP_RX) must equal map_sweep_table.json the same way.
// Pure; reads only the given tree directory and the two tables.
// ==========================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LINES, ORACLES } from './transform.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const SCAN_RX = /\.neighbors\b|queue\.shift\(\)|\bhopDistancesFrom\(|\bgoalDistance\(|\bcanReachGoal\b|\bfutureScore\(|\bgraphDiameter\(|\blookAheadScore\(/;
export const CLASSES = Object.freeze(['ORACLE_GUARDED', 'ORACLE_CALL_SITE', 'LOCAL_PERCEPTION', 'LEGALITY_OF_EXPERIENCED_PAIR', 'EXPERIENCE_COUPLED_SEMANTIC', 'CONSTRUCTION',
  'INERT_NOT_REACHED', 'INERT_VISUAL', 'INERT_WRITE_ONLY', 'INERT_FOR_DECISIONS', 'DEAD_NEVER_CALLED']);
export const loadTable = (file = path.join(HERE, 'map_audit_table.json')) => JSON.parse(fs.readFileSync(file, 'utf8'));
// the second, broader sweep: any graph-structure NAME (connections, edges, adjacency, neighbour, BFS, ...) on a line the first scan does not
// cover.  Every hit is listed in map_sweep_table.json with a class; none of these classes is a route from the map into a decision.
export const SWEEP_RX = /connections\b|connectionData|\bedges?\b|adjacen|neighbou?r|getNeighbors|isEdge|hasEdge|isDeclaredEdge|shortest|\bbfs\b|BFS|hopDist|graphDist|\.links\b|linkMap|edgeMap|edgeSet/i;
export const SWEEP_CLASSES = Object.freeze(['LOADING', 'CONSTRUCTION', 'LOG_TEXT', 'EPISODE_DERIVED', 'INSIDE_GUARDED_ORACLE', 'INERT_NOT_REACHED', 'CONSUMER_OF_LOCAL_PERCEPTION',
  'GUARD_DIAGNOSTIC', 'CONSUMER_OF_LISTED_READ', 'INERT_VISUAL', 'INERT_WRITE_ONLY', 'INERT_FOR_DECISIONS']);
export const loadSweep = (file = path.join(HERE, 'map_sweep_table.json')) => JSON.parse(fs.readFileSync(file, 'utf8'));
const files = (tree) => ['main.js', ...fs.readdirSync(path.join(tree, 'render')).filter(f => f.endsWith('.js')).sort().map(f => `render/${f}`)];
const read = (tree, f) => fs.readFileSync(path.join(tree, f), 'utf8').split('\n');

export function scanGraphReads(tree) {
  const rows = [];
  for (const f of files(tree)) read(tree, f).forEach((l, i) => { if (SCAN_RX.test(l) && !/^\s*(\/\/|\*)/.test(l)) rows.push({ file: f, line: i + 1, text: l.trim() }); });
  return rows;
}

/** the audit: scanned set == table, every class known, and the structural facts behind the classes */
export function sweepGraphNames(tree) {
  const rows = [];
  for (const f of files(tree)) read(tree, f).forEach((l, i) => { if (SWEEP_RX.test(l) && !SCAN_RX.test(l) && !/^\s*(\/\/|\*)/.test(l)) rows.push({ file: f, line: i + 1, text: l.trim() }); });
  return rows;
}

export function auditTree(tree, table = loadTable(), sweep = loadSweep()) {
  const problems = [];
  const key = (r) => `${r.file}:${r.line}`;
  const compare = (what, found, listedRows, classes) => {
    const scanned = new Map(found.map(r => [key(r), r])), listed = new Map(listedRows.map(r => [key(r), r]));
    for (const [k, r] of scanned) { const t = listed.get(k); if (!t) problems.push(`unlisted ${what} ${k}: ${r.text.slice(0, 80)}`); else if (t.text !== r.text) problems.push(`text changed at ${k}`); }
    for (const k of listed.keys()) if (!scanned.has(k)) problems.push(`stale ${what} entry ${k}`);
    for (const r of listedRows) if (!classes.includes(r.cls)) problems.push(`unknown class ${r.cls} at ${key(r)}`);
    return scanned.size;
  };
  const sites = compare('graph read', scanGraphReads(tree), table, CLASSES);
  const sweepSites = compare('graph-name line', sweepGraphNames(tree), sweep, SWEEP_CLASSES);
  // structural facts
  const main = read(tree, 'main.js'), planning = read(tree, 'render/planning.js');
  for (const o of ORACLES) {
    const L = LINES[o].file === 'main.js' ? main : planning;
    const ia = L.indexOf(LINES[o].anchor), il = L.indexOf(LINES[o].line);
    if (ia < 0 || il < 0 || il !== (LINES[o].where === 'after' ? ia + 1 : ia - 1)) problems.push(`${o}: the guard line is not at the oracle entry`);
    if (L.filter(l => l === LINES[o].line).length !== 1) problems.push(`${o}: the guard line is not present exactly once`);
  }
  const all = files(tree).flatMap(f => read(tree, f).map((l, i) => ({ f, i: i + 1, l })));
  const hopCalls = all.filter(x => /\bhopDistancesFrom\(/.test(x.l) && !/function hopDistancesFrom/.test(x.l));
  if (!(hopCalls.length === 1 && hopCalls[0].f === 'render/planning.js' && hopCalls[0].i > planning.indexOf(LINES.futureScore.line) + 1)) problems.push('hopDistancesFrom is called somewhere other than inside futureScore after its guard');
  const lookCalls = all.filter(x => /\blookAheadScore\(/.test(x.l) && !/function lookAheadScore/.test(x.l) && !/^\s*(\/\/|\*)/.test(x.l));
  if (lookCalls.length) problems.push(`lookAheadScore has a caller: ${lookCalls.map(x => `${x.f}:${x.i}`).join(', ')}`);
  const top = (L, i) => { for (let j = i; j >= 0; j--) { const m = /^(?:async\s+)?function\s+(\w+)|^(\w+(?:\.\w+)*)\.addEventListener\(\s*['"](\w+)/.exec(L[j]); if (m) return m[1] || `${m[2]}:${m[3]}`; } return '<module>'; };
  const pruneCalls = main.map((l, i) => (/pruneGoalWraparound\(/.test(l) && !/function pruneGoalWraparound/.test(l) ? top(main, i) : null)).filter(Boolean);
  if (!(pruneCalls.length >= 1 && pruneCalls.every(t => t === 'window:click'))) problems.push(`pruneGoalWraparound is reachable outside the click listener: ${pruneCalls.join(', ')}`);
  const counts = table.reduce((a, r) => (a[r.cls] = (a[r.cls] || 0) + 1, a), {});
  const sweepCounts = sweep.reduce((a, r) => (a[r.cls] = (a[r.cls] || 0) + 1, a), {});
  return { ok: problems.length === 0, problems, sites, counts, sweepSites, sweepCounts };
}
