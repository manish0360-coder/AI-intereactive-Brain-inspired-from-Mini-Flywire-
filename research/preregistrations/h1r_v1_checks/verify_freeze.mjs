// H1-R v1.0 — freeze consistency check (documentation, schema and hash consistency only).
// Runs no agent, generates no configuration, reads no outcome. Exit code 0 iff every check passes.
//
//   node research/preregistrations/h1r_v1_checks/verify_freeze.mjs
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { ENV_STREAM, envSlot } from '../../../experiments/h1r/env_seed.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const BUILD = 'e8e904a2f213e45dc0fb326f36cf72809f5862cf';
const DOC = 'research/preregistrations/H1R_PREREGISTRATION_v1.0.md';
const SHAFILE = 'research/preregistrations/H1R_PREREGISTRATION_v1.0.sha256';
const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const read = (p) => fs.readFileSync(path.join(ROOT, p));
const git = (args) => execFileSync('git', ['-C', ROOT, ...args], { maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] });
const blob = (rev, p) => git(['show', `${rev}:${p}`]);
const tracked = (p) => { try { git(['ls-files', '--error-unmatch', p]); return true; } catch { return false; } };
const results = [];
const check = (id, name, ok, detail) => results.push({ id, name, ok: !!ok, detail });

const docBuf = read(DOC), doc = docBuf.toString('utf8');

// 1. integrity record
{ const line = read(SHAFILE).toString('utf8').split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#')).pop() || '';
  const [h, f] = line.split(/\s+\*?/);
  const working = sha(docBuf);
  const committed = tracked(DOC) ? sha(blob('HEAD', DOC)) : null;
  check('I1', 'v1.0 bytes match the integrity record (working copy, and HEAD blob when committed)',
    h === working && f === 'H1R_PREREGISTRATION_v1.0.md' && (committed === null || committed === h),
    `record ${h}; working ${working}; HEAD blob ${committed ?? 'not yet committed'}`); }

// 2. frozen decision anchors present verbatim
const ANCHORS = [
  't′ = d̄ / √((MS_C + MS_S)/(C·S))', 'ν = min(C−1, S−1)', 'MS_CS is not used in the test',
  'if MS_C + MS_S = 0, then p = 1 when d̄ = 0, and p = 0 otherwise',
  'p̃₍ⱼ₎ = max_{i≤j} min(1, (7−i)·p₍ᵢ₎)', 'confirmed iff p̃ < 0.01 and d̄ > 0',
  'd̄ ± t_{ν,0.995}·√((MS_C + MS_S)/(C·S))', 'A CI "contains 0" iff lower ≤ 0 ≤ upper',
  'If fewer than 2 rows or 2 seeds remain, the test is not computable and the comparison is not confirmed',
  'weighted by the fixed goal allocation (8, 8, 7, 7)/30',
  'configuration seed 886000 (hard bound 889999)', '20260819004–008',
  'exactly one extension runs: indices 5–9 of the same stream × the same seeds × 7 arms',
  'They never enter a §12 test', 'S* and the go/void decision are fixed before any Stage-2 run',
  'H1 is SUPPORTED iff', 'none of F-1, F-2, F-3, F-7, F-8, F-9 or F-10 fires', 'H1-STRICT iff',
  'neither F-5 nor F-6 fires', 'No other rule, window, metric or exclusion may enter the verdict',
  'F-3 and F-7 also fire when the CI lies below 0', 'F-1 and F-3 fire when their statistic is undefined',
  '**τ = i − 5**', 'The exploratory 2×2 PE factorial (M7 §10.2) is WAIVED', '**WITHDRAWN**',
  'reserve 1.95 × 10⁻⁶ (point), 8.37 × 10⁻⁴ (one-sided 95% lower rates), 9.54 × 10⁻⁴ (half rates)',
];
{ const missing = ANCHORS.filter(a => !doc.includes(a));
  check('A1', `all ${ANCHORS.length} frozen decision anchors are present verbatim`, missing.length === 0, missing.length ? `missing: ${missing.join(' | ')}` : 'all present'); }

// 3. nothing open, nothing recommended, abandoned material absent
{ const bad = [/\bOPEN\b/, /\bRECOMMENDATION\b/, /\bTBD\b/, /\b893000\b/, /\b894999\b/].filter(r => r.test(doc)).map(String);
  check('A2', 'no OPEN / RECOMMENDATION / TBD marker and no reference to the abandoned 893000 block', bad.length === 0, bad.length ? `found ${bad.join(', ')}` : 'none'); }

// 4. build identity: §1.2 hash table equals the committed blobs at the build commit
{ const rows = [...doc.matchAll(/^\| `([^`]+)` \| `([0-9a-f]{64})` \|$/gm)].map(m => ({ p: m[1], h: m[2] }))
    .filter(r => r.p.startsWith('experiments/') || r.p.startsWith('research/'));
  const bad = rows.filter(r => sha(blob(BUILD, r.p)) !== r.h);
  check('B1', `build-identity table: ${rows.length} files equal their committed blobs at ${BUILD.slice(0, 7)}`, rows.length === 11 && bad.length === 0,
    bad.length ? `mismatch: ${bad.map(r => r.p).join(', ')}` : `${rows.length} matched`); }

// 5. conformed-file hashes equal the R3 evidence manifest
{ const man = JSON.parse(blob(BUILD, 'experiments/h1r/evidence_r3/conformance_gates.json').toString('utf8')).manifest;
  const bad = Object.entries(man).filter(([f, v]) => !doc.includes(`| \`${f}\` |`) || !doc.includes(v.sha256After));
  check('B2', 'conformed-file table equals evidence_r3/conformance_gates.json (4 files)', Object.keys(man).length === 4 && bad.length === 0,
    bad.length ? `mismatch: ${bad.map(b => b[0]).join(', ')}` : 'all 4 match'); }

// 6. M7 frozen digest still validates (committed blob)
{ const h = sha(blob('HEAD', 'research/cognitive-audit/M7_PREREGISTRATION.md'));
  check('B3', 'M7 pre-registration digest validates', h === '2f12e309d7409e95f3d1bca34135110e518865fd01d96e5eeaee347b6e33f6b9', h); }

// 7. the three M7 governing documents equal the recorded hashes
{ const docs = { 'M7_SCIENTIFIC_SPEC_DRAFT.md': '27865156379bbe39402b96665154b96b5f79dfd36d0fbbf689f6d0b40d360d57',
                 'M7_GATE_SEMANTICS_AUDIT.md': 'ee09a15549d73f06af36caaf0672dce0682fc8e3947c37c69bec41e30f64560d',
                 'M7_CHARACTERIZATION_FINDINGS.md': '6b79436e4afdb06ab8dc4b58a5e7f56e2103c854669ce58c25c850d0747383fd' };
  const bad = Object.entries(docs).filter(([f, h]) => { const p = `research/cognitive-audit/${f}`;
    return sha(read(p)) !== h || !doc.includes(h) || (tracked(p) && sha(blob('HEAD', p)) !== h); });
  check('B4', 'the three M7 governing documents match their recorded SHA-256 (working copy, v1.0 table, HEAD blob when committed)',
    bad.length === 0, bad.length ? `mismatch: ${bad.map(b => b[0]).join(', ')}` : 'all 3 match'); }

// 8. byte-integrity attributes
{ const ga = read('.gitattributes').toString('utf8');
  const need = ['research/preregistrations/H1R_PREREGISTRATION_v1.0.md', 'research/preregistrations/H1R_PREREGISTRATION_v1.0.sha256',
                'research/cognitive-audit/M7_SCIENTIFIC_SPEC_DRAFT.md', 'research/cognitive-audit/M7_GATE_SEMANTICS_AUDIT.md',
                'research/cognitive-audit/M7_CHARACTERIZATION_FINDINGS.md'];
  const miss = need.filter(p => !new RegExp(`^${p.replace(/[.]/g, '\\.')}\\s+-text\\s*$`, 'm').test(ga));
  check('B5', '.gitattributes marks the frozen files -text', miss.length === 0, miss.length ? `missing: ${miss.join(', ')}` : '5 entries'); }

// 9. decision log records the freeze with the document hash
{ const log = read('research/09_decisions.md').toString('utf8'); const h = sha(docBuf);
  const ids = ['D-013', 'D-014', 'D-015', 'D-016', 'D-017', 'D-018'].filter(id => !new RegExp(`^## ${id} — `, 'm').test(log));
  check('G1', 'decision log has entries D-013 … D-018 and D-018 cites the v1.0 SHA-256', ids.length === 0 && log.includes(h),
    `${ids.length ? 'missing ' + ids.join(', ') + '; ' : ''}hash cited: ${log.includes(h)}`); }

// 10. obsolete claim removed from the R3 report
{ const r = read('experiments/h1r/evidence_r3/R3_REPORT.md').toString('utf8');
  check('G2', 'R3 report no longer asserts the per-run ~1e-6 probability and points to v1.0', !r.includes('the per-run probability is about 1 × 10⁻⁶') && r.includes('H1R_PREREGISTRATION_v1.0.md'),
    'checked'); }

// 11. schema: the R3 constants and the pilot positions agree with v1.0
{ const constants = ENV_STREAM.B === 0x60800000 && ENV_STREAM.L === 4096 && ENV_STREAM.C === 0x6d2b79f5 &&
    JSON.stringify(ENV_STREAM.seedOffsets) === JSON.stringify([[0, 9], [100, 119]]);
  const slots = []; for (let s = 20260819004; s <= 20260819008; s++) for (let i = 0; i < 10; i++) slots.push(envSlot({ agentSeed: s, blockCode: 0, acceptedConfigIndex: i }));
  const expected = [4, 5, 6, 7, 8].flatMap(o => [...Array(10)].map((_, i) => o * 64 + i));
  const listed = doc.includes('256–265, 320–329, 384–393, 448–457 and 512–521');
  let conf = true; for (let s = 20260819100; s <= 20260819119; s++) for (let i = 0; i < 30; i++) { try { envSlot({ agentSeed: s, blockCode: 1, acceptedConfigIndex: i }); } catch { conf = false; } }
  check('S1', 'R3 constants, pilot slots (5 seeds x 10 indices) and confirmatory positions agree with v1.0 and lie in the verified domain',
    constants && JSON.stringify(slots) === JSON.stringify(expected) && listed && conf, `constants ${constants}; pilot slots ${slots[0]}..${slots[slots.length - 1]}; listed ${listed}; confirmatory in domain ${conf}`); }

for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.id.padEnd(3)} ${r.name}\n      ${r.detail}`);
const fails = results.filter(r => !r.ok).length;
console.log(`\n${results.length - fails} PASS, ${fails} FAIL`);
process.exitCode = fails ? 1 : 0;
