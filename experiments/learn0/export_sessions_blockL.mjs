// ==========================================================
// LEARN-0 — export the per-session evidence of block L (compact, reproducible; computes no claim)
// ==========================================================
//   node export_sessions_blockL.mjs --in <block run dir> --out <json>
// Post-run tool, modelled on experiments/gate-floor-interaction/export_sessions_blockI.mjs.  The raw session records stay in the
// git-ignored run directory (and its archive) and are bound by MANIFEST.json's per-file sha256.  For every record this script
// re-derives condition integrity and the oracle audit from the raw numbers (the session's own ok flags are not trusted) and keeps the
// per-session quantities the frozen analysis uses, together with the manifest hash of the file, so the results are recomputable from
// committed evidence alone.
// ==========================================================
import fs from 'node:fs';
import path from 'node:path';
import * as C from './config.mjs';
import { integrityProblems } from '../gate-floor-prodsem/analyze.mjs';
import { oracleProblems } from './analyze.mjs';

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
  const m = /^l0-(T|N0|N1|N1E|N1Q|O0)-w(\d+)\.json$/.exec(file);
  if (!m || Number(m[2]) !== rec.input.world) throw new Error(`unexpected session file ${file}`);
  const ci = rec.conditionIntegrity, ip = integrityProblems(ci), op = oracleProblems(rec, rec.map);
  const integrityOk = ip.length === 0 && ci.ok === true, oracleOk = op.length === 0;
  if (!integrityOk || !oracleOk || rec.outcome.crashed || !rec.outcome.completed) violations++;
  const sum = (o) => Object.values(o).reduce((s, v) => s + v, 0);
  rows.push({ file, sha256: sha, role: rec.role, world: rec.input.world, cell: m[1] === 'T' ? null : m[1], map: rec.map, arm: rec.input.arm, goal: Number(rec.input.goal),
    agentSeed: rec.input.agentSeed, configSeed: rec.input.configSeed, condition: ci.cond, integrityOk, oracleOk, attemptSuccess: rec.endpoints.attemptSuccess,
    oracleExecuted: sum(rec.mapAudit.executed), oracleBlocked: sum(rec.mapAudit.blocked), oracleGuardsReached: Object.values(rec.mapAudit.blocked).filter(v => v > 0).length,
    legal: rec.reaches.legal, nonEdge: rec.reaches.nonEdge, all: rec.reaches.goal, early: rec.reaches.legalHalves[0], late: rec.reaches.legalHalves[1],
    farLegal: rec.moves.farLegal, farLegalDownhill: rec.moves.farLegalDownhill, farLegalChance: rec.moves.farLegalChance, adjacent: rec.moves.adjacent, adjacentEnter: rec.moves.adjacentEnter,
    adjacentChance: rec.moves.adjacentChance, illegalExecuted: rec.diag.illegalExecuted, admittedNonGraph: rec.guard.counters.admitted, goalKeyedQ: rec.brain.goalKeyedQ,
    envDraws: ci.envDraws, creditKeys: ci.creditKeys, peCalls: ci.peLaCalls + ci.peDampCalls, traversalAttempts: ci.traversal.attempts, traversalSuccesses: ci.traversal.successes });
}
const sumOf = (f) => rows.reduce((s, r) => s + (f(r) || 0), 0);
const off = rows.filter(r => r.map === 'off'), on = rows.filter(r => r.map === 'on');
const out = { schema: `${C.SCHEMA}.sessions`, state: C.CONFIRMATORY_STATE, manifestDigest: manifest.digest, sessions: rows.length, violations,
  totals: { traversalAttempts: sumOf(r => r.traversalAttempts), traversalSuccesses: sumOf(r => r.traversalSuccesses), envDraws: sumOf(r => r.envDraws), creditKeys: sumOf(r => r.creditKeys), peCalls: sumOf(r => r.peCalls),
    mapOffSessions: off.length, mapOffExecutedOracleCalls: sumOf(r => (r.map === 'off' ? r.oracleExecuted : 0)), mapOffSessionsWithAllFourGuardsReached: off.filter(r => r.oracleGuardsReached === 4).length,
    mapOnSessions: on.length, mapOnBlockedOracleCalls: sumOf(r => (r.map === 'on' ? r.oracleBlocked : 0)), sessionsWithNonNullAttemptSuccess: rows.filter(r => r.attemptSuccess !== null).length },
  rows };
fs.writeFileSync(path.resolve(flag('--out')), JSON.stringify(out, null, 1));
console.log(`per-session evidence: ${rows.length} records, ${violations} violation(s); traversal ${out.totals.traversalSuccesses}/${out.totals.traversalAttempts}; env draws ${out.totals.envDraws}; map-off sessions ${off.length}: executed oracle calls ${out.totals.mapOffExecutedOracleCalls}, all four guards reached in ${out.totals.mapOffSessionsWithAllFourGuardsReached}`);
process.exit(violations === 0 ? 0 : 1);
