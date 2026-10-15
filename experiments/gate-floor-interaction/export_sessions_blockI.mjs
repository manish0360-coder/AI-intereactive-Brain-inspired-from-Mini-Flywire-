// ==========================================================
// GATE-FLOOR-INTERACTION — export the per-session evidence of a block (compact, reproducible; computes no claim)
// ==========================================================
//   node export_sessions_blockI.mjs --in <block run dir> --out <json>
// The raw session records stay in the (git-ignored) block directory and are bound by MANIFEST.json's per-file sha256.  This
// script re-derives, for every session record, the condition-integrity and guard-completeness quantities from the raw numbers (the
// session's own ok flags are not trusted) together with the per-session outcome counts and the manifest hash of the file, so the
// evidence is committable and verifiable against the raw files / the archive.
// ==========================================================
import fs from 'node:fs';
import path from 'node:path';
import * as C from './config.mjs';
import { integrityProblems } from '../gate-floor-prodsem/analyze.mjs';

const argv = process.argv.slice(2);
const flag = (n) => { const i = argv.indexOf(n); return i === -1 ? null : argv[i + 1]; };
if (!flag('--in') || !flag('--out')) { console.error('--in and --out are required'); process.exit(2); }
const dir = path.resolve(flag('--in'));
const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'MANIFEST.json'), 'utf8'));
const rows = [];
let violations = 0;
for (const [file, sha] of Object.entries(manifest.sessions).sort()) {
  const bytes = fs.readFileSync(path.join(dir, 'sessions', file));
  if (C.sha256(bytes) !== sha) throw new Error(`session record altered: ${file}`);
  const rec = JSON.parse(bytes);
  const m = /^gfi-(COLD|REAL)_F([01])_G([01])-w(\d+)\.json$/.exec(file) || /^gfi-train-w(\d+)\.json$/.exec(file);
  const isTest = rec.role === 'test';
  const guardOn = rec.guard ? rec.guard.on === true : null;
  const gc = rec.guardCompleteness;
  const recomputedOk = isTest || rec.role === 'train'
    ? (guardOn ? (rec.reaches.nonEdge === 0 && rec.moveClass.nonGraph === 0 && rec.guard.counters.admitted === 0) : (rec.guard.counters.maskedOut === 0 && rec.guard.counters.blockedIllegal === 0))
    : false;
  const ip = integrityProblems(rec.conditionIntegrity);
  if (ip.length || !recomputedOk) violations++;
  const ci = rec.conditionIntegrity;
  rows.push({ file, sha256: sha, role: rec.role, world: rec.input.world, cell: isTest && m ? `${m[1]}_F${m[2]}_G${m[3]}` : null, floorMode: rec.floorMode, guardOn,
    condition: ci && ci.cond, integrityOk: ci ? ip.length === 0 && ci.ok === true : false, guardCompletenessOk: !!gc && gc.ok === true && recomputedOk, attemptSuccess: rec.endpoints ? rec.endpoints.attemptSuccess : null,
    legal: rec.reaches.legal, nonGraph: rec.reaches.nonEdge, all: rec.reaches.goal, maskedOut: rec.guard.counters.maskedOut, blockedIllegal: rec.guard.counters.blockedIllegal, movesNonGraph: rec.moveClass.nonGraph,
    envDraws: ci && ci.envDraws, creditKeys: ci && ci.creditKeys, peCalls: ci && (ci.peLaCalls + ci.peDampCalls), traversalAttempts: ci && ci.traversal.attempts, traversalSuccesses: ci && ci.traversal.successes });
}
const sumOf = (f) => rows.reduce((s, r) => s + (f(r) || 0), 0);
const out = { schema: `${C.SCHEMA}.sessions`, state: C.CONFIRMATORY_STATE, manifestDigest: manifest.digest, sessions: rows.length, violations,
  totals: { traversalAttempts: sumOf(r => r.traversalAttempts), traversalSuccesses: sumOf(r => r.traversalSuccesses), envDraws: sumOf(r => r.envDraws), creditKeys: sumOf(r => r.creditKeys), peCalls: sumOf(r => r.peCalls),
    guardOnSessions: rows.filter(r => r.guardOn === true).length, guardOnNonGraphResets: sumOf(r => (r.guardOn ? r.nonGraph : 0)), guardOnExecutedNonGraphMoves: sumOf(r => (r.guardOn ? r.movesNonGraph : 0)),
    guardOffMasked: sumOf(r => (r.guardOn === false ? r.maskedOut : 0)), guardOffBlocked: sumOf(r => (r.guardOn === false ? r.blockedIllegal : 0)),
    sessionsWithNonNullAttemptSuccess: rows.filter(r => r.attemptSuccess !== null).length },
  rows };
fs.writeFileSync(path.resolve(flag('--out')), JSON.stringify(out, null, 1));
console.log(`per-session evidence: ${rows.length} records, ${violations} violation(s); traversal ${out.totals.traversalSuccesses}/${out.totals.traversalAttempts}; env draws ${out.totals.envDraws}; guard-on sessions ${out.totals.guardOnSessions}: non-graph resets ${out.totals.guardOnNonGraphResets}, executed non-graph moves ${out.totals.guardOnExecutedNonGraphMoves}`);
process.exit(violations === 0 ? 0 : 1);
