// ==========================================================
// GATE-FLOOR-PRODSEM — export the per-session CONDITION-INTEGRITY evidence of a block (compact, reproducible, no outcome)
// ==========================================================
//   node export_integrity_blockP.mjs --in <block run dir> --out <json>
// The raw session records stay in the (git-ignored) block directory and are bound by MANIFEST.json's per-file sha256.  This
// script re-derives, for every session record, the quantities that establish hook state P (no environment draw, no E2 credit,
// no PE hook call, every recorded traversal succeeded, cap and replay armed) and the sha256 the manifest holds for the file,
// so the evidence is committable (about 1,700 small rows) and a reader can re-verify it against the raw files.
// ==========================================================
import fs from 'node:fs';
import path from 'node:path';
import * as C from './config.mjs';
import { integrityProblems } from './analyze.mjs';

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
  const ci = rec.conditionIntegrity || null;
  const problems = integrityProblems(ci);
  if (problems.length) violations++;
  rows.push({ file, sha256: sha, role: rec.role, floorMode: rec.floorMode, cond: ci && ci.cond, ok: ci && ci.ok, recomputedProblems: problems.length,
    envDraws: ci && ci.envDraws, drawsLogged: ci && ci.drawsLogged, creditKeys: ci && ci.creditKeys, peLaCalls: ci && ci.peLaCalls, peDampCalls: ci && ci.peDampCalls,
    traversalAttempts: ci && ci.traversal.attempts, traversalSuccesses: ci && ci.traversal.successes, edgesWithSlip: ci && ci.traversal.edgesWithSlip, maxCostEstimate: ci && ci.traversal.maxCostEstimate,
    episodeCapArmed: ci && ci.episodeCapArmed, replayDeterministic: ci && ci.replayDeterministic, attemptSuccess: rec.endpoints ? rec.endpoints.attemptSuccess : null });
}
const out = { schema: `${C.SCHEMA}.integrity`, state: C.CONFIRMATORY_STATE, manifestDigest: manifest.digest, sessions: rows.length, violations,
  totals: { traversalAttempts: rows.reduce((s, r) => s + (r.traversalAttempts || 0), 0), traversalSuccesses: rows.reduce((s, r) => s + (r.traversalSuccesses || 0), 0),
    envDraws: rows.reduce((s, r) => s + (r.envDraws || 0), 0), creditKeys: rows.reduce((s, r) => s + (r.creditKeys || 0), 0), peCalls: rows.reduce((s, r) => s + (r.peLaCalls || 0) + (r.peDampCalls || 0), 0),
    sessionsWithNonNullAttemptSuccess: rows.filter(r => r.attemptSuccess !== null).length },
  rows };
fs.writeFileSync(path.resolve(flag('--out')), JSON.stringify(out, null, 1));
console.log(`condition integrity: ${rows.length} session records, ${violations} violation(s); traversal ${out.totals.traversalSuccesses}/${out.totals.traversalAttempts} succeeded; env draws ${out.totals.envDraws}; credit keys ${out.totals.creditKeys}; PE hook calls ${out.totals.peCalls}`);
process.exit(violations === 0 ? 0 : 1);
