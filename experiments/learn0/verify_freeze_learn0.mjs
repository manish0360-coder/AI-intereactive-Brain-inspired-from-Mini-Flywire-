// ==========================================================
// LEARN-0 — preregistration FREEZE verification (runs NO session, generates nothing, reads no outcome)
// ==========================================================
//   node experiments/learn0/verify_freeze_learn0.mjs [--require-committed]
// LINE ENDINGS.  Every pin is the sha256 of the file's content with CRLF normalised to LF (lfSha).  A Windows checkout with
// core.autocrlf=true writes CRLF into the working tree; the content - and so every pin - is unchanged.  The design gate and
// export_prereg.mjs --check hash raw bytes and therefore assume an LF working tree; on a CRLF checkout THIS verifier is the authority.
//   F1  the freeze record: status, scope, self digest, the verifier's own pin
//   F2  the frozen set is complete and every frozen file matches its pin (worktree; with --require-committed also the HEAD blob, and the
//       directory is clean and fully tracked)
//   F3  the design: digests recompute; the preregistration's self digest, file pins and body agree with the sources; the approved
//       constants (sole primary E1, n = 360, delta = 20, worlds, accounting, claim limits) are as frozen
//   F4  the substrate: no runtime path changed since the last runtime commit; production main.js is the audited content; the LEARN-0 tree
//       builds to its pins and passes the call-graph audit
//   F5  the review record: verbatim review and reviewed package match their pins; the verdict is the reviewer's text; the one required
//       correction is present in config.mjs and DESIGN.md
//   F6  block L: the frozen configuration list matches its digest; 360 consecutive worlds, 90 per goal; every seed regenerates its
//       configuration, lies below the held-out floor, is neither held-out nor consumed in the typed registry, and follows the earlier stream
//   F7  nothing was executed: no block-L session record or run manifest; the run is stated NOT AUTHORIZED and NOT EXECUTED
//   F8  the frozen decision rule behaves as declared at its boundaries (pure)
//   F9  the line-ending fix: every frozen file still matches its pin after an LF -> CRLF conversion (the Windows checkout case)
// ==========================================================
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { generateAccepted } from '../m7/env.js';
import { configSeed as typedConfigSeed, config as typedConfig } from '../registry/typed_v2.js';
import * as C from './config.mjs';
import { buildLearn0Tree } from './transform.mjs';
import { auditTree } from './static_audit.mjs';
import { buildPrereg, PACKAGE_FILES } from './export_prereg.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const REL = 'experiments/learn0';
const COMMITTED = process.argv.includes('--require-committed');
let passed = 0, failed = 0; const fails = [];
const check = (id, cond, detail = '') => { if (cond) passed++; else { failed++; fails.push(id + ' ' + detail); } console.log((cond ? 'PASS ' : 'FAIL ') + id + (cond || !detail ? '' : ' :: ' + String(detail).slice(0, 400))); };
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
// byte-level CRLF -> LF (no text decoding, so no byte other than a CR immediately before an LF can ever change)
export const lf = (b) => { const out = Buffer.allocUnsafe(b.length); let n = 0; for (let i = 0; i < b.length; i++) { if (b[i] === 13 && b[i + 1] === 10) continue; out[n++] = b[i]; } return out.subarray(0, n); };
export const lfSha = (b) => sha(lf(b));
const crlf = (b) => { const l = lf(b), out = Buffer.allocUnsafe(l.length * 2); let n = 0; for (const x of l) { if (x === 10) out[n++] = 13; out[n++] = x; } return out.subarray(0, n); };
const git = (args) => spawnSync('git', ['-C', ROOT, ...args], { encoding: 'buffer', maxBuffer: 1 << 28 });
const gitText = (args) => git(args).stdout.toString();
const norm = (s) => s.replace(/\s+/g, ' ');
const J = (o) => JSON.stringify(o);
const omit = (o, ks) => Object.fromEntries(Object.entries(o).filter(([k]) => !ks.includes(k)));
const F = JSON.parse(fs.readFileSync(path.join(HERE, 'FREEZE.json'), 'utf8'));
const NOT_RUN = 'NOT AUTHORIZED and NOT EXECUTED';
// files of the package that are NOT frozen: the freeze record itself, this verifier (pinned separately), the status README, local data
const UNFROZEN = new Set(['FREEZE.json', 'FREEZE.md', 'verify_freeze_learn0.mjs', 'README.md', 'data/.gitignore']);

// ---------- F1 ----------
check('F1.freeze-record-status-and-scope', F.status === 'FROZEN_PREREGISTRATION_NOT_RUN' && F.study === 'LEARN-0' && /freeze only/.test(F.authorization.scope) && F.authorization.confirmatoryRun.includes(NOT_RUN));
check('F1.freeze-record-self-digest', C.hashObject(omit(F, ['digest'])) === F.digest);
check('F1.this-verifier-matches-its-pin', lfSha(fs.readFileSync(fileURLToPath(import.meta.url))) === F.freezeVerifier.sha256 && F.freezeVerifier.path === `${REL}/verify_freeze_learn0.mjs`);

// ---------- F2 ----------
const walk = (d, out = []) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) { if (path.relative(HERE, p) !== 'data') walk(p, out); } else out.push(p); } return out; };
const present = walk(HERE).map(p => path.relative(HERE, p).split(path.sep).join('/')).filter(p => !UNFROZEN.has(p)).sort();
const pinned = Object.keys(F.frozenFiles).map(p => p.slice(REL.length + 1)).sort();
check('F2.the-frozen-set-is-exactly-the-package-minus-the-freeze-record-and-the-status-readme', J(present) === J(pinned) && pinned.length === F.frozenCount, J({ onlyPresent: present.filter(p => !pinned.includes(p)), onlyPinned: pinned.filter(p => !present.includes(p)) }));
const badWt = Object.entries(F.frozenFiles).filter(([p, h]) => !fs.existsSync(path.join(ROOT, p)) || lfSha(fs.readFileSync(path.join(ROOT, p))) !== h).map(([p]) => p);
check('F2.every-frozen-file-matches-its-pin-in-the-worktree', badWt.length === 0, badWt.join(', '));
if (COMMITTED) {
  const badHead = Object.entries(F.frozenFiles).filter(([p, h]) => { const r = git(['show', `HEAD:${p}`]); return r.status !== 0 || lfSha(r.stdout) !== h; }).map(([p]) => p);
  check('F2.every-frozen-file-matches-its-pin-at-head', badHead.length === 0, badHead.join(', '));
  const tracked = gitText(['ls-files', '--', REL]).trim().split('\n').filter(Boolean).sort();
  const expected = [...Object.keys(F.frozenFiles), ...[...UNFROZEN].map(f => `${REL}/${f}`)].sort();
  check('F2.the-committed-directory-is-exactly-the-frozen-set-plus-the-freeze-record', J(tracked) === J(expected), J({ extra: tracked.filter(p => !expected.includes(p)), missing: expected.filter(p => !tracked.includes(p)) }));
  check('F2.the-directory-is-clean', gitText(['status', '--porcelain', '--', REL]).trim() === '' && lfSha(git(['show', `HEAD:${REL}/verify_freeze_learn0.mjs`]).stdout) === F.freezeVerifier.sha256);
} else console.log('INFO F2: pre-commit mode (HEAD blobs not required); run with --require-committed after the commit');

// ---------- F3 ----------
const P = JSON.parse(fs.readFileSync(path.join(HERE, 'preregistration.json'), 'utf8'));
check('F3.design-and-decision-digests-recompute-to-the-frozen-values', C.decisionDigest() === F.decisionDigest && C.designDigest() === F.designDigest && P.digests.decision === F.decisionDigest && P.digests.design === F.designDigest);
check('F3.preregistration-self-digest-and-frozen-digest', C.hashObject(omit(P, ['digest'])) === P.digest && P.digest === F.preregistrationDigest);
const pf = PACKAGE_FILES.filter(f => P.files[f] !== lfSha(fs.readFileSync(path.join(HERE, f))) || F.frozenFiles[`${REL}/${f}`] !== P.files[f]);
check('F3.preregistration-file-pins-equal-the-sources-line-ending-independently', pf.length === 0 && Object.keys(P.files).length === PACKAGE_FILES.length, pf.join(', '));
check('F3.preregistration-body-equals-what-the-sources-produce', J(omit(buildPrereg(), ['files', 'digest'])) === J(omit(P, ['files', 'digest'])));
check('F3.approved-design-unchanged-sole-primary-n-delta-worlds-accounting', C.CLAIMS.length === 1 && C.CLAIMS[0].id === 'E1' && /E1 = E_w\[ Y_w\(N1\) - Y_w\(N0\) \]/.test(C.CLAIMS[0].estimand)
  && C.CELLS.find(c => c.name === 'N1').arm === 'FULL' && C.CELLS.find(c => c.name === 'N0').arm === 'COLD' && C.WORLDS_N === 360 && C.SIZING.nChosen === 360 && C.MARGIN.delta === 20
  && C.WORLD_START === 1672 && C.WORLDS_TOTAL === 2032 && C.PER_GOAL === 90 && J(C.SESSION_ACCOUNTING) === J({ training: 360, test: 1800, total: 2160 }) && J(F.design.accounting) === J(C.SESSION_ACCOUNTING)
  && F.design.n === 360 && F.design.delta === 20 && F.design.primary === 'E1 = N1 - N0 (sole primary)' && C.SECONDARY_POLICY.intervals === 28);
check('F3.approved-claim-limits-frozen-verbatim', C.RULES.learnsLimit === 'A LEARNS_WITHOUT_MAP outcome may reflect experience-derived graph reconstruction and path-keyed Q-values; it does not demonstrate map-free spatial reasoning, abstract route planning, or cognition.'
  && J(F.claimLimits) === J([C.RULES.claims, C.RULES.learnsLimit, C.RULES.residualMap, C.CLAIMS[0].scope]) && C.interpret({ valid: true, e1: 'LEARNS_WITHOUT_MAP' }).includes(C.RULES.learnsLimit));

// ---------- F4 ----------
{
  const d = gitText(['diff', '--name-only', C.RUNTIME.lastRuntimeChange, 'HEAD', '--', ...C.RUNTIME.runtimePaths]).trim();
  check('F4.no-runtime-path-changed-since-the-last-runtime-commit', git(['cat-file', '-e', C.RUNTIME.lastRuntimeChange]).status === 0 && d === '' && gitText(['rev-parse', 'HEAD:main.js']).trim() === C.RUNTIME.mainBlob
    && gitText(['rev-parse', 'HEAD:render']).trim() === C.RUNTIME.renderTree && lfSha(fs.readFileSync(path.join(ROOT, 'main.js'))) === C.TREE.headMainSha256 && F.runtime.mainBlob === C.RUNTIME.mainBlob, d);
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'l0-freeze-'));
  try {
    const t = buildLearn0Tree({ outRoot: out }), m = t.manifest.learn0;
    check('F4.the-learn0-tree-builds-to-its-pins', m.mainSha256 === C.LEARN0_TREE.mainSha256 && m.planningSha256 === C.LEARN0_TREE.planningSha256 && t.manifest.gatefloorhead.headCommit === C.HEAD_COMMIT
      && m.mainSha256 === F.substrate.learn0MainSha256 && m.planningSha256 === F.substrate.learn0PlanningSha256);
    const au = auditTree(t.dir);
    check('F4.the-call-graph-audit-passes-on-the-built-tree', au.ok && au.sites === 46 && au.sweepSites === 41, J(au.problems));
  } finally { fs.rmSync(out, { recursive: true, force: true }); }
}

// ---------- F5 ----------
{
  const rv = fs.readFileSync(path.join(ROOT, F.review.record.path)), pk = fs.readFileSync(path.join(ROOT, F.review.reviewedPackage.path));
  // the review was relayed with CRLF line endings (6,202 bytes, da703024...); its LF content (what git stores; 6,097 bytes) is e3714b8c...
  check('F5.review-record-and-reviewed-package-match-their-pins', lfSha(rv) === F.review.record.sha256 && lfSha(pk) === F.review.reviewedPackage.sha256
    && F.review.record.sha256 === 'e3714b8cf680ba6b0c383ab5bb264e6601ca7575b70b90c33da9c84c3ec9bf0e' && F.review.record.sha256AsRelayed === 'da703024e3629505419ddffa9896f0a435a8071b53d7b0ebf82aee5a0e0535c8'
    && [F.review.record.sha256AsRelayed, F.review.record.sha256].includes(sha(rv)) && F.review.reviewedPackage.sha256 === '2cf60179c252c9da8a12d6c46b7462b62b020673d15c4b87b465099e6cea1cb5');
  const t = rv.toString('utf8');
  check('F5.the-verdict-and-the-required-correction-are-the-reviewer-s-own-text', /\*\*VERDICT: PASS WITH CLAIM LIMITS\*\*/.test(t) && /Mandatory Claim Limitation on Graph Reconstruction/.test(t) && /LEARN-0 \(Revision 2\)/.test(t)
    && F.review.verdict === 'PASS WITH CLAIM LIMITS' && F.review.requiredCorrections === 1 && F.review.date === '2026-10-24');
  check('F5.the-required-correction-is-applied-in-config-and-design', norm(fs.readFileSync(path.join(HERE, 'DESIGN.md'), 'utf8')).includes(norm(C.RULES.learnsLimit)) && F.review.correctionApplied.where.length === 2);
  check('F5.reviewer-factual-slips-are-recorded-and-not-adopted', Array.isArray(F.review.factualSlipsNotAdopted) && F.review.factualSlipsNotAdopted.length === 2);
}

// ---------- F6 ----------
{
  const B = JSON.parse(fs.readFileSync(path.join(HERE, 'blockL_worlds.json'), 'utf8'));
  check('F6.block-list-matches-its-digest-and-the-freeze-record', C.hashObject(omit(B, ['digest'])) === B.digest && B.digest === F.blockL.digest && B.n === 360 && J(B.indices) === J([1672, 2031]) && B.checks.collisions === 0 && B.checks.integrityProblems === 0);
  const W = B.worlds, probs = [];
  W.forEach((e, k) => {
    if (e.world !== C.WORLD_START + k) probs.push(`slot ${k} is world ${e.world}`);
    if (k > 0 && e.startingSeed !== W[k - 1].acceptedSeed + 1) probs.push(`recurrence broken at ${e.world}`);
    if (e.goal !== C.GOALS[e.world % C.GOALS.length]) probs.push(`goal of ${e.world}`);
    if (!(e.acceptedSeed >= C.CONFIG_START && e.acceptedSeed < C.HELDOUT_FLOOR)) probs.push(`seed of ${e.world} outside [CONFIG_START, HELDOUT_FLOOR)`);
    if (typedConfig.isHeldOut(typedConfigSeed(e.acceptedSeed)) || typedConfig.isConsumed(typedConfigSeed(e.acceptedSeed))) probs.push(`seed of ${e.world} is held-out or consumed`);
  });
  check('F6.360-consecutive-worlds-recurrence-goals-and-no-held-out-or-consumed-seed', W.length === 360 && probs.length === 0 && W[0].startingSeed === B.prefixLastAcceptedSeed + 1
    && W[0].acceptedSeed > B.checks.earlierStreamMaxSeed && C.GOALS.every(g => W.filter(e => e.goal === g).length === 90), probs.slice(0, 5).join('; '));
  const regen = W.filter(e => { const g = generateAccepted(e.acceptedSeed, e.world); return g.provenance.acceptedSeed !== e.acceptedSeed || g.provenance.numberOfRejectedCandidatesBeforeAcceptance !== 0 || g.cfg.goal !== e.goal; });
  check('F6.every-frozen-seed-regenerates-its-configuration-as-the-session-driver-requires', regen.length === 0, regen.slice(0, 5).map(e => e.world).join(', '));
  const cache = path.join(ROOT, B.prefixSource, `stream_${C.CONFIG_START}_${C.WORLD_START}_${B.envSha12}.json`);
  if (fs.existsSync(cache)) { const s = JSON.parse(fs.readFileSync(cache, 'utf8')); check('F6.the-block-continues-the-cached-earlier-stream', s.length === C.WORLD_START && s[C.WORLD_START - 1].acceptedSeed === B.prefixLastAcceptedSeed && Math.max(...s.map(e => e.acceptedSeed)) === B.checks.earlierStreamMaxSeed); }
  else console.log('INFO F6: the local cache of the earlier stream is absent (it is not tracked); the seam is checked against the frozen prefix seed only');
}

// ---------- F7 ----------
{
  const all = walk(HERE).concat(fs.existsSync(path.join(HERE, 'data')) ? walk(path.join(HERE, 'data')) : []);
  const sessionRecs = all.filter(p => { const m = /^l0-[A-Za-z0-9]+-w(\d+)\.json$/.exec(path.basename(p)); return m && Number(m[1]) >= C.WORLD_START && Number(m[1]) <= C.WORLDS_TOTAL - 1; });
  const manifests = all.filter(p => path.basename(p) === 'MANIFEST.json').filter(p => { try { return JSON.parse(fs.readFileSync(p, 'utf8')).block !== 'SELFTEST'; } catch { return true; } });
  check('F7.no-block-l-session-record-run-manifest-or-results-path', sessionRecs.length === 0 && manifests.length === 0 && !gitText(['ls-files', '--', REL]).split('\n').some(p => /\/results\//.test(p)), [...sessionRecs, ...manifests].slice(0, 3).join(', '));
  const fm = norm(fs.readFileSync(path.join(HERE, 'FREEZE.md'), 'utf8')), dm = norm(fs.readFileSync(path.join(HERE, 'DESIGN.md'), 'utf8')), rm = norm(fs.readFileSync(path.join(HERE, 'README.md'), 'utf8'));
  check('F7.the-confirmatory-run-is-stated-not-authorized-and-not-executed', [fm, dm, rm].every(x => x.includes(NOT_RUN)));
}

// ---------- F8 (pure) ----------
{
  const ci = (lower, upper) => ({ lower, upper }), d = C.MARGIN.delta;
  check('F8.decision-rule-boundaries', C.classifyE1(ci(d, d + 5)) === 'LEARNS_WITHOUT_MAP' && C.classifyE1(ci(d - 1e-9, d + 5)) === 'INCONCLUSIVE' && C.classifyE1(ci(-d - 5, -d)) === 'EXPERIENCE_HARMS_WITHOUT_MAP'
    && C.classifyE1(ci(-d + 1e-9, d - 1e-9)) === 'NO_PRACTICAL_EFFECT' && C.classifyE1(ci(-d, 5)) === 'INCONCLUSIVE' && C.classifyE1(ci(5, d)) === 'INCONCLUSIVE' && C.classifyE1(null) === 'UNDEFINED');
}

// ---------- F9 ----------
{
  const rows = Object.entries(F.frozenFiles).map(([p, h]) => { const b = fs.readFileSync(path.join(ROOT, p)), c = crlf(b); return { p, h, lfOk: lfSha(c) === h, rawDiffers: sha(c) !== sha(lf(b)) || !b.includes(10) }; });
  check('F9.every-frozen-file-matches-its-pin-after-lf-to-crlf-conversion', rows.every(r => r.lfOk), rows.filter(r => !r.lfOk).map(r => r.p).join(', '));
  check('F9.the-conversion-changes-the-raw-bytes-so-the-normalisation-is-load-bearing', rows.every(r => r.rawDiffers) && rows.filter(r => fs.readFileSync(path.join(ROOT, r.p)).includes(10)).length >= 20);
}

console.log(`\nLEARN-0 freeze verification: ${passed} checks passed, ${failed} failed (no session run, nothing generated)`);
if (failed) { console.log(fails.join('\n')); process.exit(1); }
