// ==========================================================
// M-REG-1 — BLOCK-AWARE TRAJECTORY REGISTRY: INDEPENDENT VERIFICATION
// ==========================================================
//   node experiments/registry/verify_blocks.js [--with-legacy-timing]
// Exit 0 iff every check passed and every mutant was caught.
//
// ORACLE. The committed typed.js (reached through the aliases typed_v2.js exports for exactly this purpose) is the
// oracle. A block record is compared with the SAME seeds registered as explicit per-seed records in the oracle; the
// two must agree on every comparable outcome. Cases the oracle cannot express (a block's own structural rules) are
// tested for refusal directly.
//
// COVERAGE. explicit-record parity (messages compared verbatim), the production registry, block membership versus
// explicit records, statuses, authorizations, HELD_OUT as a lookup outcome (including the stream-degeneracy cases),
// block-to-block overlap and cross-study ownership, duplicates, aliases, exclusion-list and hash tampering, member
// added/removed, malformed and unsupported schemas, immutability, digest, the block data module (empty, or data only
// with well-formed records and at most one block per study) and typed.js bytes.
//
// MUTANTS. typed_v2.js is copied to a temporary directory with ONE uniquely-anchored edit and the same test is run
// against the copy. An anchor that is not found exactly once aborts that mutant (no silent no-ops).
//
// Synthetic seeds lie in the exploratory development domain. Nothing is registered, reserved or consumed.
// ==========================================================
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as REAL from './typed_v2.js';
import { LEGACY_REGISTRY } from './import_isolation.js';

const HERE = path.dirname(fileURLToPath(import.meta.url)), REPO = path.resolve(HERE, '..', '..');
const { createLegacyTrajectoryRegistry, legacyTrajectory, trajectorySeed, configSeed, TRAJECTORY_RECORDS, TRAJECTORY_HELD_OUT, TRAJECTORY_AUTHORIZATIONS } = REAL;
let passed = 0, failed = 0, caught = 0, missed = 0;
const check = (id, name, ok, detail = '') => { if (ok) passed++; else failed++; console.log(`${ok ? 'PASS' : 'FAIL'} [${id}] ${name}${detail ? ' :: ' + detail : ''}`); };
const mutantResult = (id, name, ok, detail = '') => { if (ok) caught++; else missed++; console.log(`${ok ? 'MUTANT-CAUGHT' : 'MUTANT-MISSED'} [${id}] ${name}${detail ? ' :: ' + detail : ''}`); };

// ---- data helpers ----------------------------------------------------------------------------------------------------
const LO = 1_100_000_000, TWO32 = 2 ** 32;
const META = { authorization: 'in-memory verification battery', artifact: 'none', why: 'verification battery' };
const CFG = { seed: 100000, index: 1, acceptedSeed: 100026 };
function spec(n = 600, { lo = LO, every = 27, offset = 5, parity = null } = {}) {
  const hi = lo + n - 1, excluded = [];
  for (let v = lo; v <= hi; v++) {
    if (parity !== null ? ((v - lo) % 2 === parity) : ((v - lo) % every === offset)) excluded.push(v);
  }
  const members = REAL.memberListOf({ lo, hi, excluded });
  return { lo, hi, excluded, members, count: members.length, listSha256: REAL.listSha256Of(members) };
}
const rec = (value, o = {}) => ({ namespace: 'trajectory', value, study: 'TEST-A', status: 'registered', executed: false, ...META, ...o });
const blk = (s, o = {}) => ({ schema: REAL.BLOCK_SCHEMA, namespace: 'trajectory', study: 'TEST-A', status: 'registered', lo: s.lo, hi: s.hi, excluded: s.excluded,
  count: s.count, listSha256: s.listSha256, executed: false, ...META, configuration: { ...CFG }, ...o });
const baseRecords = () => [...TRAJECTORY_RECORDS];
const USES = [['TEST-A', 'registered'], ['TEST-A', 'development'], ['TEST-A', 'pilot'], ['H1-R', 'pilot'], ['M31', 'development'], ['X', 'registered']];
const outcome = (reg, v, use) => { try { return reg.checkUse(trajectorySeed(v), use).decision; } catch (e) { return `${e.name}:${e.code}`; } };
const built = (f) => { try { return { reg: f() }; } catch (e) { return { err: `${e.name}:${e.code}`, msg: e.message }; } };
/** the same seeds as explicit records in the oracle and as blocks in the candidate */
function pair(M, { blocks = [], extra = [], heldOut = [], auth = [] }) {
  const explicit = blocks.flatMap(b => b.s.members.map(v => rec(v, { study: b.study || 'TEST-A', status: b.status || 'registered' })));
  const oracle = built(() => createLegacyTrajectoryRegistry({ records: [...baseRecords(), ...explicit, ...extra], heldOut: [...TRAJECTORY_HELD_OUT, ...heldOut], authorizations: [...TRAJECTORY_AUTHORIZATIONS, ...auth] }));
  const cand = built(() => M.createTrajectoryRegistry({ records: [...baseRecords(), ...extra], heldOut: [...TRAJECTORY_HELD_OUT, ...heldOut], authorizations: [...TRAJECTORY_AUTHORIZATIONS, ...auth],
    blocks: blocks.map(b => blk(b.s, { study: b.study || 'TEST-A', status: b.status || 'registered', ...(b.o || {}) })) }));
  return { oracle, cand };
}
/** compare lookups of `probes` under USES (names + codes) */
function compare(label, { oracle, cand }, probes, uses = USES, acc) {
  if (oracle.err || cand.err) { acc.cases++; const a = oracle.err || 'BUILT', b = cand.err || 'BUILT'; acc.tally[`construct:${a}`] = (acc.tally[`construct:${a}`] || 0) + 1; if (a !== b) acc.mism.push({ label, oracle: a, cand: b }); return; }
  for (const v of probes) for (const [study, category] of uses) {
    acc.cases++;
    const a = outcome(oracle.reg, v, { study, category }), b = outcome(cand.reg, v, { study, category });
    acc.tally[a] = (acc.tally[a] || 0) + 1;
    if (a !== b) acc.mism.push({ label: `${label} ${v} ${study}/${category}`, oracle: a, cand: b });
  }
}
const newAcc = () => ({ cases: 0, tally: {}, mism: [] });
const finish = (acc, extra = {}) => ({ ok: acc.mism.length === 0 && acc.cases > 0, cases: acc.cases, tally: acc.tally, mism: acc.mism.slice(0, 5), mismatchCount: acc.mism.length, ...extra });

// ---- the tests: id -> fn(M) -> { ok, ... } -----------------------------------------------------------------------------------
const T = new Map();
const def = (id, gate, desc, fn) => T.set(id, { id, gate, desc, fn });

def('diff.block', 'D1', 'a list-bound block equals the same seeds as explicit records: members, excluded, aliases modulo 2^32, other studies, categories', (M) => {
  const s = spec(601), acc = newAcc();                     // 601: the hull ends on a MEMBER, so an off-by-one at hi changes the list
  const probes = [...s.members.filter((_, i) => i % 7 === 0), s.members[s.members.length - 1], ...s.excluded.slice(0, 20), ...s.members.slice(0, 10).map(v => v + TWO32), ...s.excluded.slice(0, 5).map(v => v + TWO32),
    s.lo - 1, s.hi + 1, 20260819004, 20260819100, 1_700_000_000, 5, 900500];
  compare('block', pair(M, { blocks: [{ s }] }), probes, USES, acc);
  return finish(acc, { probes: probes.length, members: s.count, excluded: s.excluded.length });
});
def('diff.status', 'D1', 'a block with a non-registered status reproduces the category-transition semantics of explicit records', (M) => {
  const acc = newAcc();
  for (const status of ['pilot', 'development']) {
    const s = spec(300, { lo: LO + 50_000 });
    compare(`status ${status}`, pair(M, { blocks: [{ s, status }] }), [...s.members.slice(0, 25), ...s.excluded.slice(0, 5)], [...USES, ['TEST-A', status]], acc);
  }
  return finish(acc);
});
def('diff.auth', 'D1', 'an exact-value authorization issued by a block member gives AUTHORIZED_REUSE exactly as for an explicit record', (M) => {
  const s = spec(300), m0 = s.members[3], acc = newAcc();
  const auth = [{ namespace: 'trajectory', value: m0, fromStudy: 'TEST-A', toStudy: 'X', authorization: 'in-memory', why: 'battery' }];
  compare('auth', pair(M, { blocks: [{ s }], auth }), [m0, s.members[4], s.excluded[0]], USES, acc);
  // an authorization issued for a seed the issuer does not hold is refused in both
  const bad = [{ ...auth[0], value: s.excluded[0] }];
  compare('auth-issuer', pair(M, { blocks: [{ s }], auth: bad }), [m0], USES, acc);
  const r = finish(acc);
  return { ...r, ok: r.ok && (acc.tally.AUTHORIZED_REUSE || 0) >= 1 };
});
def('diff.heldout', 'D2', 'HELD_OUT is exercised as an actual lookup outcome, including the zero-state degeneracy of every derived stream, with blocks present', (M) => {
  const s = spec(300, { lo: LO + 120_000 }), acc = newAcc();
  const ranges = [[2_000_000_000, 2_000_000_099], [0x5EEC, 0x5EEC], [0x5EED, 0x5EED], [0xBEEE, 0xBEEE], [0xBEEF, 0xBEEF], [(0x9e3779b9 ^ 1) >>> 0, (0x9e3779b9 ^ 1) >>> 0], [0x9e3779b9, 0x9e3779b9]];
  const probes = [1_999_999_999, 2_000_000_000, 2_000_000_050, 2_000_000_099, 2_000_000_100, 0x5EEB, 0x5EEC, 0x5EED, 0x5EEE, 0xBEEE, 0xBEEF, 0xBEF0,
    (0x9e3779b9 ^ 1) >>> 0, 0x9e3779b9, 0x9e3779ba, s.members[0], s.excluded[0]];
  for (const r of ranges) {
    const heldOut = [{ lo: r[0], hi: r[1], authorization: 'in-memory', why: 'battery' }];
    compare(`heldOut ${r[0]}-${r[1]}`, pair(M, { blocks: [{ s }], heldOut }), probes, USES, acc);
  }
  // a block member inside a held-out range is refused by both
  const clash = pair(M, { blocks: [{ s }], heldOut: [{ lo: s.members[7], hi: s.members[7], authorization: 'x', why: 'y' }] });
  compare('member-in-heldOut', clash, [], USES, acc);
  const r = finish(acc);
  return { ...r, ok: r.ok && (acc.tally['GovernanceRefusal:HELD_OUT'] || 0) >= 10 && clash.oracle.err === 'RegistryIntegrityError:REGISTRY_INTEGRITY' && clash.cand.err === clash.oracle.err };
});
def('diff.crossblock', 'D3', 'block-to-block overlap, ownership conflicts, duplicates and authorizations agree with explicit records (build or refuse, and every lookup)', (M) => {
  const A = spec(240, { lo: LO + 200_000 }), acc = newAcc();
  const scenarios = [];
  const disjoint = spec(240, { lo: LO + 300_000 });
  scenarios.push(['disjoint hulls, two studies', { blocks: [{ s: A }, { s: disjoint, study: 'TEST-B' }] }, [A.members[0], disjoint.members[0], A.excluded[0]], true]);
  const even = spec(240, { lo: LO + 400_000, parity: 1 }), odd = spec(240, { lo: LO + 400_000, parity: 0 });
  scenarios.push(['interleaved members in one hull, two studies', { blocks: [{ s: even }, { s: odd, study: 'TEST-B' }] }, [even.members[0], odd.members[0]], true]);
  scenarios.push(['identical members, two studies, no authorization', { blocks: [{ s: A }, { s: A, study: 'TEST-B' }] }, [A.members[0]], false]);
  const authAB = [{ namespace: 'trajectory', value: A.members[0], fromStudy: 'TEST-A', toStudy: 'TEST-B', authorization: 'in-memory', why: 'battery' }];
  scenarios.push(['identical members, authorization for ONE value only', { blocks: [{ s: A }, { s: A, study: 'TEST-B' }], auth: authAB }, [A.members[0]], false]);
  const small = spec(1, { lo: LO + 500_000, every: 1000, offset: 999 });                 // a one-member block
  const authS = [{ namespace: 'trajectory', value: small.members[0], fromStudy: 'TEST-A', toStudy: 'TEST-B', authorization: 'in-memory', why: 'battery' }];
  scenarios.push(['exact shared value, same status, authorized', { blocks: [{ s: small }, { s: small, study: 'TEST-B' }], auth: authS }, [small.members[0]], true]);
  scenarios.push(['exact shared value, different status, authorized', { blocks: [{ s: small }, { s: small, study: 'TEST-B', status: 'development' }], auth: authS }, [small.members[0]], false]);
  scenarios.push(['same study, two disjoint blocks', { blocks: [{ s: A }, { s: disjoint }] }, [A.members[0], disjoint.members[0]], true]);
  scenarios.push(['same study, overlapping blocks (duplicate members)', { blocks: [{ s: A }, { s: A }] }, [A.members[0]], false]);
  scenarios.push(['block member vs another study explicit record of the same value', { blocks: [{ s: A }], extra: [rec(A.members[2], { study: 'TEST-B' })] }, [A.members[2]], false]);
  scenarios.push(['block member vs explicit alias (value + 2^32) of another study', { blocks: [{ s: A }], extra: [rec(A.members[2] + TWO32, { study: 'TEST-B' })] }, [A.members[2]], false]);
  scenarios.push(['block member vs same-study explicit alias', { blocks: [{ s: A }], extra: [rec(A.members[2] + TWO32)] }, [A.members[2]], false]);
  const zeroState = { lo: 1, hi: 50, excluded: [], members: Array.from({ length: 50 }, (_, i) => i + 1) }; zeroState.count = 50; zeroState.listSha256 = REAL.listSha256Of(zeroState.members);
  scenarios.push(['zero-state alias (raw 0 shares the cognitive seed of raw 1) across studies', { blocks: [{ s: zeroState }], extra: [rec(0, { study: 'TEST-B' })] }, [0, 1, 2], false]);
  const builtState = [];
  for (const [label, p, probes, expectBuilds] of scenarios) {
    const pr = pair(M, p);
    builtState.push({ label, oracleBuilt: !pr.oracle.err, expectBuilds });
    compare(label, pr, probes, [...USES, ['TEST-B', 'registered'], ['TEST-B', 'development']], acc);
  }
  const r = finish(acc);
  const expectationsHold = builtState.every(b => b.oracleBuilt === b.expectBuilds);
  return { ...r, ok: r.ok && expectationsHold, scenarios: scenarios.length, builtState: builtState.filter(b => b.oracleBuilt !== b.expectBuilds) };
});
def('parity.records', 'D4', 'with explicit records only, every construction refusal, lookup decision and error MESSAGE equals the committed registry', (M) => {
  let cases = 0; const mism = [];
  const cmp = (label, a, b) => { cases++; if (JSON.stringify(a) !== JSON.stringify(b)) mism.push({ label, a, b }); };
  const mk = (f, g) => [built(() => createLegacyTrajectoryRegistry(f)), built(() => M.createTrajectoryRegistry(g || f))];
  const r = (v, o = {}) => ({ namespace: 'trajectory', value: v, study: 'S1', status: 'registered', executed: false, ...META, ...o });
  const base = (records, o = {}) => ({ records, heldOut: [], authorizations: [], ...o });
  const A = [
    ['duplicate (value, study)', base([r(10), r(10)])],
    ['held-out and consumed', base([r(10)], { heldOut: [{ lo: 10, hi: 10, authorization: 'x', why: 'y' }] })],
    ['held-out by stream degeneracy', base([r(0x5EED)], { heldOut: [{ lo: 0x5EEC, hi: 0x5EEC, authorization: 'x', why: 'y' }] })],
    ['authorization without an issuer record', base([r(10)], { authorizations: [{ namespace: 'trajectory', value: 11, fromStudy: 'S1', toStudy: 'S2', authorization: 'a', why: 'w' }] })],
    ['duplicate authorization', base([r(10)], { authorizations: [1, 2].map(() => ({ namespace: 'trajectory', value: 10, fromStudy: 'S1', toStudy: 'S2', authorization: 'a', why: 'w' })) })],
    ['same-study alias', base([r(5), r(5 + TWO32)])],
    ['cross-study alias without authorization', base([r(5), r(5 + TWO32, { study: 'S2' })])],
    ['cross-study same value, different status, authorized', base([r(5), r(5, { study: 'S2', status: 'pilot' })], { authorizations: [{ namespace: 'trajectory', value: 5, fromStudy: 'S1', toStudy: 'S2', authorization: 'a', why: 'w' }] })],
    ['cross-study same value, same status, authorized (builds)', base([r(5), r(5, { study: 'S2' })], { authorizations: [{ namespace: 'trajectory', value: 5, fromStudy: 'S1', toStudy: 'S2', authorization: 'a', why: 'w' }] })],
    ['extra field', base([{ ...r(5), extra: 1 }])], ['bad status', base([r(5, { status: 'final' })])], ['executed not boolean', base([r(5, { executed: 'no' })])],
    ['empty study', base([r(5, { study: ' ' })])], ['non-integer value', base([r(5.5)])], ['wrong namespace', base([r(5, { namespace: 'config' })])],
    ['bad held-out range', base([], { heldOut: [{ lo: 9, hi: 1, authorization: 'x', why: 'y' }] })], ['held-out beyond 32 bits', base([], { heldOut: [{ lo: 0, hi: TWO32, authorization: 'x', why: 'y' }] })],
    ['authorization naming one study twice', base([r(5)], { authorizations: [{ namespace: 'trajectory', value: 5, fromStudy: 'S1', toStudy: 'S1', authorization: 'a', why: 'w' }] })],
    ['records not an array', { records: {}, heldOut: [], authorizations: [] }],
  ];
  for (const [label, input] of A) { const [o, c] = mk(input); cmp(`construct: ${label}`, { e: o.err, m: o.msg }, { e: c.err, m: c.msg }); }
  // lookups on a registry that builds
  const good = base([r(10), r(11, { study: 'S2' }), r(12, { status: 'pilot' })], { heldOut: [{ lo: 500, hi: 600, authorization: 'x', why: 'y' }] });
  const [o, c] = mk(good);
  const ids = [10, 11, 12, 13, 10 + TWO32, 550, 599, 601];
  const useVariants = [];
  for (const study of ['S1', 'S2', 'S3']) for (const category of ['development', 'pilot', 'registered', 'weird']) for (const arm of [undefined, 'ARMED', 'ABLATED', 'BAD']) useVariants.push({ study, category, ...(arm ? { arm } : {}) });
  useVariants.push({ study: '' }, { study: 5 }, { category: 'registered' }, { study: 'S1', category: 'registered', extra: 1 }, null, 'x', { study: 'S1', category: 'registered', configSeed: configSeed(100000) }, { study: 'S1', category: 'registered', configSeed: trajectorySeed(1) });
  const call = (reg, id, use) => { try { return { d: reg.checkUse(id, use).decision }; } catch (e) { return { e: `${e.name}:${e.code}`, m: e.message }; } };
  for (const id of ids) for (const use of useVariants) cmp(`lookup ${id} ${JSON.stringify(use)}`, call(o.reg, trajectorySeed(id), use), call(c.reg, trajectorySeed(id), use));
  for (const bad of [5, '5', null, { namespace: 'trajectory', value: 5 }, configSeed(5)]) cmp(`identity ${JSON.stringify(bad)}`, call(o.reg, bad, { study: 'S1', category: 'registered' }), call(c.reg, bad, { study: 'S1', category: 'registered' }));
  for (const id of ids) {
    cmp(`consumptionOf ${id}`, o.reg.consumptionOf(trajectorySeed(id)).map(x => [x.value, x.study, x.status]), c.reg.consumptionOf(trajectorySeed(id)).map(x => [x.value, x.study, x.status]));
    cmp(`isHeldOut ${id}`, o.reg.isHeldOut(trajectorySeed(id)), c.reg.isHeldOut(trajectorySeed(id)));
    cmp(`isConsumedByStudy ${id}`, [o.reg.isConsumedByStudy(trajectorySeed(id), 'S1'), o.reg.isConsumedByStudy(trajectorySeed(id), 'S2')], [c.reg.isConsumedByStudy(trajectorySeed(id), 'S1'), c.reg.isConsumedByStudy(trajectorySeed(id), 'S2')]);
  }
  const emptyStudy = (reg) => { try { reg.isConsumedByStudy(trajectorySeed(10), ''); return 'no error'; } catch (e) { return `${e.name}:${e.code}:${e.message}`; } };
  cmp('isConsumedByStudy empty study', emptyStudy(o.reg), emptyStudy(c.reg));
  return { ok: mism.length === 0 && cases > 0, cases, mism: mism.slice(0, 4), mismatchCount: mism.length };
});
// ---- the committed block data: structural invariants only (P2) ----------------------------------------------------------------------
// The production block module must be DATA ONLY (an Object.freeze of a JSON array: no import, call, expression or further export),
// every block must be a well-formed trajectory.block/1 record, and no study may hold two blocks (the MCF-1 lock and the candidate
// writer both require exactly one).  The identity of a registered block is deliberately NOT pinned here: registryDigestSha256 in
// the freeze record binds it at the official gate, and a literal in this verifier would only duplicate that binding.
const BLOCK_KEYS = ['artifact', 'authorization', 'configuration', 'count', 'excluded', 'executed', 'hi', 'listSha256', 'lo', 'namespace', 'schema', 'status', 'study', 'why'];
const dataOnlyBlocks = (text) => {
  const code = text.replace(/^\s*\/\/.*$/gm, '').trim();
  const m = code.match(/^export const TRAJECTORY_BLOCKS = Object\.freeze\((\[[\s\S]*\])\);$/);
  if (!m) return null;
  try { const a = JSON.parse(m[1]); return Array.isArray(a) ? a : null; } catch (e) { return null; }
};
const oneBlockPerStudy = (blocks) => Array.isArray(blocks) && new Set(blocks.map(b => b && b.study)).size === blocks.length;
const wellFormedBlock = (b) => b !== null && typeof b === 'object' && !Array.isArray(b) && Object.keys(b).sort().join() === BLOCK_KEYS.join()
  && b.schema === REAL.BLOCK_SCHEMA && b.namespace === 'trajectory';
def('parity.production', 'D4', 'the production registry equals the committed production registry on every value of every committed record, its neighbours and aliases, for every study, category, arm and configuration', (M) => {
  const acc = newAcc(); let cases = 0; const mism = [];
  const values = new Set([20260819000, 5, 0, 1, 900500, 1_700_000_000]);
  for (const r of TRAJECTORY_RECORDS) for (const d of [0, 1, -1, TWO32, -TWO32, 0x5EED, 0xBEEF]) values.add(r.value + d);
  const studies = [...new Set([...TRAJECTORY_RECORDS.map(r => r.study), 'MCF-1', 'NEW'])];
  const call = (reg, v, use) => { try { return reg.checkUse(trajectorySeed(v), use).decision; } catch (e) { return `${e.name}:${e.code}:${e.message}`; } };
  for (const v of values) for (const study of studies) for (const category of ['development', 'pilot', 'registered']) for (const extra of [{}, { arm: 'ARMED' }, { configSeed: configSeed(100000) }]) {
    cases++; const use = { study, category, ...extra };
    const a = call(legacyTrajectory, v, use), b = call(M.trajectory, v, use);
    if (a !== b) mism.push({ v, use: `${study}/${category}`, a, b });
  }
  const same = JSON.stringify(M.trajectory.records) === JSON.stringify(legacyTrajectory.records) && JSON.stringify(M.trajectory.heldOut) === JSON.stringify(legacyTrajectory.heldOut)
    && JSON.stringify(M.trajectory.authorizations) === JSON.stringify(legacyTrajectory.authorizations);
  // records, held-out ranges and authorizations are the committed ones, and no probed value decides differently from the oracle
  // (a block member among them would); a block, if present, is a well-formed record and no study holds two
  return { ok: mism.length === 0 && cases > 0 && same && M.trajectory.blocks.every(wellFormedBlock) && oneBlockPerStudy(M.trajectory.blocks), cases, mism: mism.slice(0, 4), mismatchCount: mism.length, valuesProbed: values.size };
});
def('integrity.block', 'D5', 'every malformed, tampered or unsupported block is refused, while the untouched block builds', (M) => {
  const s = spec(120, { lo: LO + 600_000 });
  const mkBlock = (o = {}) => blk(s, o);
  const tryBuild = (blocks, extra = {}) => { try { M.createTrajectoryRegistry({ records: baseRecords(), heldOut: [], authorizations: [], blocks, ...extra }); return 'BUILT'; } catch (e) { return `${e.name}:${e.code}`; } };
  const REFUSED = 'RegistryIntegrityError:REGISTRY_INTEGRITY';
  const dropOne = s.members[10], addBack = s.excluded[0];
  // a hull that crosses 2^32 without self-aliasing (2^32 + 1 would share raw 1's cognitive seed with 2^32); count and hash are consistent
  const cross = { lo: TWO32 - 3, hi: TWO32, excluded: [] };
  cross.members = REAL.memberListOf(cross); cross.count = cross.members.length; cross.listSha256 = REAL.listSha256Of(cross.members);
  const cases = [
    ['hull crossing 2^32 with a consistent count and hash', blk(cross)],
    ['wrong listSha256', mkBlock({ listSha256: 'a'.repeat(64) })], ['uppercase listSha256', mkBlock({ listSha256: s.listSha256.toUpperCase() })], ['short listSha256', mkBlock({ listSha256: s.listSha256.slice(0, 63) })],
    ['non-string listSha256', mkBlock({ listSha256: 1234 })], ['count + 1', mkBlock({ count: s.count + 1 })], ['count - 1', mkBlock({ count: s.count - 1 })], ['count 0', mkBlock({ count: 0 })],
    ['count not an integer', mkBlock({ count: s.count + 0.5 })],
    ['excluded descending', mkBlock({ excluded: [...s.excluded].reverse() })], ['excluded with a duplicate', mkBlock({ excluded: [s.excluded[0], s.excluded[0], ...s.excluded.slice(1)] })],
    ['excluded outside the hull', mkBlock({ excluded: [...s.excluded, s.hi + 5] })], ['excluded non-integer', mkBlock({ excluded: [...s.excluded, 'x'] })], ['excluded not an array', mkBlock({ excluded: 'none' })],
    ['member removed, hash kept (excluded + 1, count - 1)', mkBlock({ excluded: [...s.excluded, dropOne].sort((a, b) => a - b), count: s.count - 1 })],
    ['member added, hash kept (excluded - 1, count + 1)', mkBlock({ excluded: s.excluded.filter(v => v !== addBack), count: s.count + 1 })],
    ['member swapped (one out, one in), count kept', mkBlock({ excluded: [...s.excluded.filter(v => v !== addBack), dropOne].sort((a, b) => a - b) })],
    ['hi < lo', mkBlock({ lo: s.hi, hi: s.lo })], ['hi = 2^32', mkBlock({ hi: TWO32, excluded: [] })], ['negative lo', mkBlock({ lo: -1 })], ['non-integer lo', mkBlock({ lo: s.lo + 0.5 })],
    ['hull above the supported size', mkBlock({ lo: 0, hi: REAL.MAX_BLOCK_HULL, excluded: [] })],
    ['unsupported schema', mkBlock({ schema: 'trajectory.block/2' })], ['missing schema', (({ schema, ...rest }) => rest)(mkBlock())], ['extra field', { ...mkBlock(), note: 'x' }],
    ['missing study', (({ study, ...rest }) => rest)(mkBlock())], ['namespace config', mkBlock({ namespace: 'config' })], ['bad status', mkBlock({ status: 'final' })],
    ['executed not boolean', mkBlock({ executed: 'false' })], ['empty study', mkBlock({ study: '  ' })], ['empty authorization', mkBlock({ authorization: '' })], ['empty artifact', mkBlock({ artifact: '' })], ['empty why', mkBlock({ why: '' })],
    ['configuration null', mkBlock({ configuration: null })], ['configuration missing acceptedSeed', mkBlock({ configuration: { seed: 1, index: 1 } })],
    ['configuration non-integer seed', mkBlock({ configuration: { ...CFG, seed: 1.5 } })], ['configuration acceptedSeed < seed', mkBlock({ configuration: { seed: 10, index: 1, acceptedSeed: 5 } })],
    ['configuration negative index', mkBlock({ configuration: { ...CFG, index: -1 } })], ['configuration extra key', mkBlock({ configuration: { ...CFG, goal: 12 } })],
    ['block is null', null], ['block is an array', []], ['block is a string', 'block'],
  ];
  const refused = [], notRefused = [];
  for (const [label, b] of cases) (tryBuild([b]) === REFUSED ? refused : notRefused).push(label);
  const control = tryBuild([mkBlock()]) === 'BUILT';
  const notArray = (() => { try { M.createTrajectoryRegistry({ records: baseRecords(), heldOut: [], authorizations: [], blocks: {} }); return false; } catch (e) { return e.code === 'REGISTRY_INTEGRITY'; } })();
  const dup = tryBuild([mkBlock(), mkBlock()]) === REFUSED;
  const explicitDup = tryBuild([mkBlock()], { records: [...baseRecords(), rec(s.members[0])] }) === REFUSED;
  return { ok: notRefused.length === 0 && control && notArray && dup && explicitDup, cases: cases.length + 4, notRefused, control };
});
def('hash.knownanswer', 'D5', 'the list hash and the member reconstruction match independently computed vectors', (M) =>
  M.listSha256Of([1, 2, 3]) === '8a6ae15122001229edb8866f56e342af12ae8187203c3e3b33931743e7c0c48d'
  && M.listSha256Of([1, 3, 5]) === 'c45ddb5ff9af0a6a331c53c3b82006c04f624d3712e915ee628e58c05251d8be'
  && M.listSha256Of([1100000000, 1100000001]) === '56968c7e2f161693b77097d206355a4ca4c81efa4deddf001431c755fb602b41'
  && JSON.stringify(M.memberListOf({ lo: 1, hi: 5, excluded: [2, 4] })) === '[1,3,5]'
  && JSON.stringify(M.memberListOf({ lo: 7, hi: 7, excluded: [] })) === '[7]');
def('shape.immutable', 'D6', 'lookups return frozen eight-field records; blocks are frozen; blockOf identifies the origin; mutation attempts fail', (M) => {
  const s = spec(50, { lo: LO + 700_000 });
  const reg = M.createTrajectoryRegistry({ records: baseRecords(), heldOut: [], authorizations: [], blocks: [blk(s)] });
  const hit = reg.consumptionOf(trajectorySeed(s.members[3])), old = legacyTrajectory.consumptionOf(trajectorySeed(20260819004));
  const keys = (r) => Object.keys(r).sort().join(',');
  const explicitHit = M.trajectory.consumptionOf(trajectorySeed(20260819004));
  let mutated = false; try { hit[0].value = 1; mutated = true; } catch (e) { /* strict mode: refused */ }
  let blockMutated = false; try { reg.blocks[0].excluded.push(1); blockMutated = true; } catch (e) { /* refused */ }
  return hit.length === 1 && Object.isFrozen(hit[0]) && keys(hit[0]) === keys(old[0]) && keys(explicitHit[0]) === keys(old[0]) && !mutated && !blockMutated
    && Object.isFrozen(reg.blocks) && Object.isFrozen(reg.blocks[0]) && reg.blockOf(hit[0]) === reg.blocks[0] && M.trajectory.blockOf(explicitHit[0]) === null && reg.layer === 'typed/2';
});
def('digest', 'D6', 'the registry digest is stable, key-order independent, and changes when any member, status or block changes', (M) => {
  const s = spec(60, { lo: LO + 800_000 }), s2 = spec(60, { lo: LO + 800_000, offset: 6 });
  const mk = (b) => M.createTrajectoryRegistry({ records: baseRecords(), heldOut: [], authorizations: [], blocks: b ? [b] : [] });
  const d1 = mk(blk(s)).digest(), d2 = mk(blk(s)).digest();
  const reordered = (({ why, artifact, ...rest }) => ({ artifact, why, ...rest }))(blk(s));
  return d1 === d2 && /^[0-9a-f]{64}$/.test(d1) && mk(reordered).digest() === d1 && mk(blk(s2)).digest() !== d1 && mk(blk(s, { status: 'pilot' })).digest() !== d1 && mk(null).digest() !== d1;
});
def('data.state', 'D7', 'the block data module is data only, every block is a well-formed trajectory.block/1 record, no study holds two blocks, and the production registry is built from exactly it', () => {
  const parsed = dataOnlyBlocks(fs.readFileSync(path.join(HERE, 'trajectory_blocks.js'), 'utf8'));
  return parsed !== null && JSON.stringify(parsed) === JSON.stringify(REAL.TRAJECTORY_BLOCKS)
    && parsed.every(wellFormedBlock) && oneBlockPerStudy(parsed) && REAL.trajectory.blocks.length === parsed.length
    && parsed.every(b => { const m = REAL.memberListOf(b); return m.length === b.count && REAL.listSha256Of(m) === b.listSha256; });
});
def('data.state.controls', 'D7', 'the data-only, well-formed and one-block-per-study predicates refuse an import, a call, trailing code, a second export, non-JSON content, a malformed record and two blocks of one study, and accept the empty module', () => {
  const head = 'export const TRAJECTORY_BLOCKS = Object.freeze(';
  const accepted = [head + '[]);\n', '// note\n' + head + '[{"study":"S"}]);\n'];
  const refused = ["import fs from 'node:fs';\n" + head + '[]);\n', head + '[(() => 1)()]);\n', head + '[]);\nconsole.log(1);\n', head + '[]);\nexport const X = Object.freeze([]);\n',
    head + '[{study: "S"}]);\n', 'export const X = 1;\n', head + '[]) \n', ''];
  const wf = { ...Object.fromEntries(BLOCK_KEYS.map(k => [k, null])), schema: REAL.BLOCK_SCHEMA, namespace: 'trajectory' };
  return accepted.every(t => dataOnlyBlocks(t) !== null) && refused.every(t => dataOnlyBlocks(t) === null)
    && wellFormedBlock(wf) && !wellFormedBlock({ ...wf, schema: 'trajectory.block/2' }) && !wellFormedBlock({ ...wf, extra: 1 }) && !wellFormedBlock((({ why, ...r }) => r)(wf))
    && !wellFormedBlock(null) && !wellFormedBlock([]) && !wellFormedBlock({ ...wf, namespace: 'config' })
    && oneBlockPerStudy([]) && oneBlockPerStudy([{ study: 'A' }, { study: 'B' }]) && !oneBlockPerStudy([{ study: 'A' }, { study: 'A' }]) && !oneBlockPerStudy(null);
});
def('typed.identical', 'D7', 'typed.js is byte-identical to the baseline blob', () => {
  const pinned = '3958211bb753f5a0a14e4f4fb014edefa804308a';
  return execFileSync('git', ['-C', REPO, 'hash-object', path.join(HERE, path.basename(LEGACY_REGISTRY))], { encoding: 'utf8' }).trim() === pinned;
});
def('contract.reexport', 'D7', 'the layer re-exports the typed.js API unchanged, shadows only createTrajectoryRegistry and trajectory, and adds the documented names', () => {
  const names = ['NAMESPACE', 'CATEGORY', 'UntypedSeedError', 'NamespaceRefusal', 'GovernanceRefusal', 'RegistryIntegrityError', 'configSeed', 'trajectorySeed', 'isSeedIdentity', 'sameSeed', 'config', 'streamSeeds', 'TRAJECTORY_RECORDS', 'TRAJECTORY_HELD_OUT', 'TRAJECTORY_AUTHORIZATIONS'];
  const added = ['createLegacyTrajectoryRegistry', 'legacyTrajectory', 'BLOCK_SCHEMA', 'SUPPORTED_BLOCK_SCHEMAS', 'MAX_BLOCK_HULL', 'REGISTRY_LAYER', 'TRAJECTORY_BLOCKS', 'listSha256Of', 'memberListOf'];
  let thrown; try { legacyTrajectory.checkUse(trajectorySeed(20260819004), { study: 'MCF-1', category: 'registered' }); } catch (e) { thrown = e; }
  return [...names, ...added, 'createTrajectoryRegistry', 'trajectory'].every(n => n in REAL) && thrown instanceof REAL.GovernanceRefusal && REAL.trajectory !== legacyTrajectory && REAL.createTrajectoryRegistry !== createLegacyTrajectoryRegistry;
});

// ---- real implementation -----------------------------------------------------------------------------------------------------
console.log('== differential and structural tests (real implementation, oracle = committed typed.js) ==');
const realResults = new Map();
const runTest = async (id, M) => { try { return T.get(id).fn(M); } catch (e) { return { ok: false, detail: 'threw: ' + e.message }; } };
let totalCases = 0; const totalTally = {};
for (const t of T.values()) {
  const r = await runTest(t.id, REAL);
  const o = typeof r === 'boolean' ? { ok: r } : r;
  realResults.set(t.id, o);
  if (o.cases) totalCases += o.cases;
  if (o.tally && t.id.startsWith('diff.')) for (const [k, v] of Object.entries(o.tally)) totalTally[k] = (totalTally[k] || 0) + v;
  const bits = [o.cases ? `${o.cases} cases` : '', o.mismatchCount !== undefined ? `${o.mismatchCount} mismatches` : '', o.detail || '', o.mism && o.mism.length ? JSON.stringify(o.mism[0]).slice(0, 220) : ''].filter(Boolean).join(', ');
  check(`${t.gate}.${t.id}`, t.desc, o.ok === true, bits);
}
console.log(`INFO comparable cases run: ${totalCases}; block-vs-explicit outcome tally: ${JSON.stringify(totalTally)}`);

// ---- performance (measurements, not guarantees) ---------------------------------------------------------------------------------
console.log('\n== performance on a synthetic list of 3,852 members ==');
{
  const s = spec(4000), reps = 5, times = [];
  const blocks = [blk(s)];
  for (let i = 0; i < reps; i++) { const t0 = process.hrtime.bigint(); REAL.createTrajectoryRegistry({ records: baseRecords(), heldOut: [], authorizations: [], blocks }); times.push(Number(process.hrtime.bigint() - t0) / 1e6); }
  const reg = REAL.createTrajectoryRegistry({ records: baseRecords(), heldOut: [], authorizations: [], blocks });
  const ids = s.members.map(v => trajectorySeed(v));
  const t1 = process.hrtime.bigint(); let reproduced = 0;
  for (const id of ids) if (reg.checkUse(id, { study: 'TEST-A', category: 'registered' }).decision === 'REPRODUCTION') reproduced++;
  const lookupUs = Number(process.hrtime.bigint() - t1) / 1e3 / ids.length;
  times.sort((a, b) => a - b);
  const env = { node: process.version, platform: `${os.platform()} ${os.arch()}`, cpu: os.cpus()[0] ? os.cpus()[0].model.trim() : 'unknown', logicalCores: os.cpus().length, memoryGiB: +(os.totalmem() / 2 ** 30).toFixed(1) };
  const perf = { members: s.count, hull: 4000, excluded: s.excluded.length, constructionMs: { min: +times[0].toFixed(1), median: +times[Math.floor(times.length / 2)].toFixed(1), max: +times[times.length - 1].toFixed(1), runs: reps }, lookupMicrosecondsMean: +lookupUs.toFixed(1), lookups: ids.length, environment: env };
  console.log('PERF ' + JSON.stringify(perf));
  check('P1', 'all 3,852 members resolve to REPRODUCTION under their block', reproduced === s.count, `${reproduced}/${s.count}`);
  check('P2', 'regression guard (generous, NOT a guarantee): construction under 5 s and mean lookup under 1 ms', perf.constructionMs.median < 5000 && lookupUs < 1000, `median ${perf.constructionMs.median} ms, mean lookup ${perf.lookupMicrosecondsMean} us`);
  if (process.argv.includes('--with-legacy-timing')) {
    const explicit = s.members.map(v => rec(v));
    const a = process.hrtime.bigint(); const legacy = createLegacyTrajectoryRegistry({ records: [...baseRecords(), ...explicit], heldOut: [], authorizations: [] }); const b = process.hrtime.bigint();
    for (let i = 0; i < 50; i++) legacy.checkUse(ids[i], { study: 'TEST-A', category: 'registered' });
    const c = process.hrtime.bigint();
    console.log('PERF-LEGACY ' + JSON.stringify({ records: explicit.length + baseRecords().length, constructionSeconds: +(Number(b - a) / 1e9).toFixed(2), lookupMillisecondsMean: +(Number(c - b) / 1e6 / 50).toFixed(2), environment: env }));
  }
}

// ---- source mutants of typed_v2.js ---------------------------------------------------------------------------------------------------
console.log('\n== source mutants of typed_v2.js ==');
const MUT_ROOT = fs.mkdtempSync(path.join(fs.realpathSync.native(os.tmpdir()), 'reg-v2-mut-'));
const SRC = fs.readFileSync(path.join(HERE, 'typed_v2.js'), 'utf8');
// The mutants are judged on synthetic fixtures, never on the committed block data: a mutant that changes member reconstruction
// would make a registered production block fail its own count check at import, so each copy loads an EMPTY block module.
const EMPTY_BLOCKS = path.join(MUT_ROOT, 'trajectory_blocks.empty.js');
fs.writeFileSync(EMPTY_BLOCKS, 'export const TRAJECTORY_BLOCKS = Object.freeze([]);\n');
const rewrite = (text) => text.replace(/(from\s+)'(\.\/[^']+)'/g, (m, a, spec2) => `${a}'${pathToFileURL(spec2 === './trajectory_blocks.js' ? EMPTY_BLOCKS : path.join(HERE, spec2)).href}'`);
async function loadMutant(id, edits) {
  let src = SRC;
  for (const [find, rep] of edits) {
    const n = src.split(find).length - 1;
    if (n !== 1) throw new Error(`anchor matched ${n} times (must be exactly 1): ${find.slice(0, 70)}`);
    src = src.replace(find, () => rep);
  }
  const f = path.join(MUT_ROOT, id + '.js');
  fs.writeFileSync(f, rewrite(src));
  return import(pathToFileURL(f).href);
}
const MUTANTS = [
  ['aliases-ignored', 'lookups ignore sources that share a derived seed but not the raw value', ['diff.block', 'parity.records'], [["return [...hit].sort((a, b) => a - b).map(i => frozenAll[i]);", "return [...hit].sort((a, b) => a - b).map(i => frozenAll[i]).filter(r => r.value === id.value);"]]],
  ['hash-not-checked', 'listSha256 is not compared with the reconstructed list', ['integrity.block'], [["if (b.listSha256 !== listSha256Of(members)) throw integrity(`block ${i} listSha256 does not match the reconstructed member list`);", ""]]],
  ['count-not-checked', 'the member count is not checked', ['integrity.block'], [["if (!Number.isSafeInteger(b.count) || b.count !== members.length || members.length === 0) throw integrity(`block ${i} count does not match the member list`);", ""]]],
  ['exclusions-unordered', 'the exclusion list may be unordered or repeated', ['integrity.block'], [["(k > 0 && v <= b.excluded[k - 1])", "false"]]],
  ['schema-not-checked', 'an unsupported schema is accepted', ['integrity.block'], [["if (!SUPPORTED_BLOCK_SCHEMAS.includes(b.schema)) throw integrity(`block ${i} has unsupported schema ${b.schema}`);", ""]]],
  ['hull-beyond-32-bits', 'a hull beyond 2^32 is accepted', ['integrity.block'], [["b.lo < 0 || b.hi > SOURCE_MAX || b.lo > b.hi", "b.lo < 0 || b.lo > b.hi"]]],
  ['configuration-not-validated', 'the configuration identity is only partly validated', ['integrity.block'], [["|| c.seed < 0 || c.index < 0 || c.acceptedSeed < c.seed) {", "|| false) {"]]],
  ['duplicates-allowed', 'a duplicate (value, study) is accepted', ['integrity.block', 'diff.crossblock', 'parity.records'], [["if (seen.has(k)) throw integrity(`duplicate record for ${k}`);", ""]]],
  ['members-not-held-out-checked', 'a member inside a held-out range is accepted', ['diff.heldout', 'parity.records'], [["if (inHeldOut(r.value)) throw integrity(`value ${r.value} is both held-out and consumed`);", ""]]],
  ['held-out-degeneracy-dropped', 'the zero-state degeneracy of held-out ranges is dropped', ['diff.heldout', 'parity.records'], [["if (d === 0) return inRange((x ^ 1) >>> 0);", ""]]],
  ['held-out-lookup-dropped', 'a held-out seed is not refused at lookup', ['diff.heldout', 'parity.records'], [["if (isHeldOut(id)) throw new GovernanceRefusal('HELD_OUT', `trajectory seed ${id.value} is held out`);", ""]]],
  ['same-study-share-allowed', 'one study may record two raw values that share a source', ['diff.crossblock', 'parity.records'], [["if (ri.study === rj.study) throw integrity(`${ri.study} records ${ri.value} and ${rj.value}, which share a stochastic source`);", ""]]],
  ['cross-study-share-allowed', 'two studies may share a source without an authorization', ['diff.crossblock', 'parity.records'], [["if (ri.value !== rj.value || ri.status !== rj.status || !isAuthorized(ri.value, ri.study, rj.study)) {", "if (false) {"]]],
  ['block-status-ignored', 'a block member is always treated as registered', ['diff.status'], [["study: b.study, status: b.status,", "study: b.study, status: 'registered',"]]],
  ['block-study-wrong', 'every block member is attributed to the first block\'s study', ['diff.crossblock'], [["study: b.study, status: b.status,", "study: blocks[0].study, status: b.status,"]]],
  ['authorization-ignored', 'an authorization does not unlock reuse', ['diff.auth', 'parity.records'], [["const unauthorized = other.filter(r => r.value !== id.value || !isAuthorized(id.value, r.study, study));", "const unauthorized = other.filter(r => r.value !== id.value);"]]],
  ['category-check-dropped', 'a category transition is not refused', ['diff.status', 'parity.records'], [["if (involved.some(r => r.status !== category)) {", "if (false) {"]]],
  ['config-namespace-unchecked', 'a use.configSeed of the wrong namespace is accepted', ['parity.records'], [["if (cfg !== undefined) requireNamespace(cfg, NAMESPACE.CONFIG);", ""]]],
  ['hull-off-by-one', 'the member reconstruction drops the last hull seed', ['diff.block', 'hash.knownanswer'], [["for (let v = block.lo; v <= block.hi; v++) if (!skip.has(v)) out.push(v);", "for (let v = block.lo; v < block.hi; v++) if (!skip.has(v)) out.push(v);"]]],
  ['digest-ignores-blocks', 'the registry digest does not cover blocks', ['digest'], [["authorizations: frozenAuths, blocks: frozenBlocks }))", "authorizations: frozenAuths }))"]]],
  ['blockOf-always-null', 'blockOf never identifies an origin', ['shape.immutable'], [["const blockOf = (record) => blockOfRecord.get(record) || null;", "const blockOf = () => null;"]]],
  ['records-not-frozen', 'looked-up records are not frozen', ['shape.immutable'], [["const frozenAll = all.map(r => Object.freeze(r));", "const frozenAll = all;"]]],
];
for (const [id, desc, tests, edits] of MUTANTS) {
  let M;
  try { M = await loadMutant(id, edits); } catch (e) { mutantResult('REG', `${id}: ${desc}`, false, 'MUTANT COULD NOT BE BUILT: ' + e.message); continue; }
  const results = [];
  for (const tid of tests) { const r = await runTest(tid, M); const ok = (typeof r === 'boolean' ? r : r.ok) === true; results.push({ tid, ok, threw: !!(r && r.detail && /threw/.test(r.detail)) }); }
  mutantResult('REG', `${id}: ${desc}`, results.some(r => !r.ok), results.map(r => `${r.tid} ${r.ok ? 'PASSED (not caught)' : r.threw ? 'threw' : 'failed as required'}`).join('; '));
}

console.log(`\nRESULT: ${passed} checks passed, ${failed} failed; mutants caught ${caught}, missed ${missed}; comparable cases ${totalCases}`);
fs.rmSync(MUT_ROOT, { recursive: true, force: true });
process.exit(failed === 0 && missed === 0 ? 0 : 1);
