// ==========================================================
// GATE-FLOOR-SCOPE (design C') — preregistration FREEZE verification (runs NO session and generates NO confirmatory plan)
// ==========================================================
//   node experiments/gate-floor-spec/verify_freeze_cprime.mjs
//   F1  the reviewed design commit is an ancestor of HEAD and FREEZE.json names it
//   F2  every frozen file is byte-identical to the reviewed commit (git blob at the design commit, at HEAD, and the working tree)
//       and the frozen set is exactly the design commit's files minus the two narrative documents
//   F3  the design / decision digests recompute to the frozen values; the C' accounting is as declared
//   F4  substrate: production main.js = the audited blob, no runtime file changed, the guard tree builds to its pin, the frozen
//       interaction files are unchanged, the S5 invariant holds
//   F5  the review record: verbatim review and reviewed package hash to their recorded values; the verdict text is in the review
//   F6  the five mandatory statements and the non-authorisation of the run are stated in FREEZE.md, FREEZE.json and DESIGN.md
//   F7  no confirmatory outcome exists: no results path, no block-S run directory, no block-S session record
//   F8  the frozen decision rules behave as declared at their exact boundaries (pure re-execution, no data)
// ==========================================================
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { buildGuardTree } from '../gate-floor-interaction/transform.mjs';
import { runtimePaths } from '../gate-floor-prodsem/transform.mjs';
import { lastReasoningInvariant } from '../gate-floor-interaction/static_checks.mjs';
import * as C from './config.mjs';
import * as DG from './diag.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const REL = 'experiments/gate-floor-spec';
let passed = 0, failed = 0; const fails = [];
const check = (id, cond, detail = '') => { if (cond) passed++; else { failed++; fails.push(id + ' ' + detail); } console.log((cond ? 'PASS ' : 'FAIL ') + id + (cond || !detail ? '' : ' :: ' + detail)); };
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const git = (args) => spawnSync('git', ['-C', ROOT, ...args], { encoding: 'buffer', maxBuffer: 1 << 28 });
const gitText = (args) => git(args).stdout.toString();
const lf = (b) => Buffer.from(b.toString('utf8').replace(/\r\n/g, '\n'), 'utf8');   // a CRLF checkout is the same content
const norm = (s) => s.replace(/\s+/g, ' ');
const F = JSON.parse(fs.readFileSync(path.join(HERE, 'FREEZE.json'), 'utf8'));
const DC = F.designCommit;

// F1
check('F1.freeze-record-names-the-reviewed-design-commit', F.status === 'FROZEN_PREREGISTRATION_NOT_RUN' && /^[0-9a-f]{40}$/.test(DC) && DC.startsWith('57beb5d'));
check('F1.design-commit-is-an-ancestor-of-head', git(['merge-base', '--is-ancestor', DC, 'HEAD']).status === 0);

// F2
const atDesign = gitText(['ls-tree', '-r', '--name-only', DC, '--', REL]).trim().split('\n').filter(p => !/\/(DESIGN|README)\.md$/.test(p)).sort();
const pinned = Object.keys(F.frozenFiles).sort();
check('F2.frozen-set-is-the-design-commit-minus-the-narrative-documents', JSON.stringify(atDesign) === JSON.stringify(pinned) && pinned.length === 21, `${pinned.length} pinned vs ${atDesign.length}`);
const bad = [];
for (const p of pinned) {
  const h = F.frozenFiles[p], d = sha(git(['show', `${DC}:${p}`]).stdout), hd = sha(git(['show', `HEAD:${p}`]).stdout);
  const wt = fs.existsSync(path.join(ROOT, p)) ? sha(lf(fs.readFileSync(path.join(ROOT, p)))) : null;
  if (h !== d || h !== hd || h !== wt) bad.push(`${p}: pinned ${h.slice(0, 8)} design ${d.slice(0, 8)} head ${hd.slice(0, 8)} worktree ${wt && wt.slice(0, 8)}`);
}
check('F2.every-frozen-file-is-byte-identical-to-the-reviewed-commit-at-head-and-in-the-worktree', bad.length === 0, bad.join('; '));
const allowedNew = new Set([`${REL}/FREEZE.md`, `${REL}/FREEZE.json`, `${REL}/verify_freeze_cprime.mjs`, `${REL}/review/gemini_final_review_cprime_2026-10-20.txt`, `${REL}/review/reviewed_package_cprime.md`, `${REL}/DESIGN.md`, `${REL}/README.md`]);
const changed = gitText(['diff', '--name-only', DC, '--', REL]).trim().split('\n').filter(Boolean);
const untracked = gitText(['ls-files', '--others', '--exclude-standard', '--', REL]).trim().split('\n').filter(Boolean);
check('F2.only-the-freeze-record-and-the-narrative-documents-differ-from-the-design-commit', [...changed, ...untracked].every(p => allowedNew.has(p)), [...changed, ...untracked].filter(p => !allowedNew.has(p)).join(', '));

// F3
check('F3.digests-recompute-to-the-frozen-values', C.designDigest() === F.designDigest && C.decisionDigest() === F.decisionDigest
  && F.designDigest === '31d01d7c0409218ba0de12b28c33e45def1b329ae837ff12175f2b19963cf2fd' && F.decisionDigest === '82f3998279b0dc55ed9e70b0aaddfb7c8032edf3df30a853c7d4bff22c08955a');
check('F3.accounting-is-560-training-plus-1120-test-equals-1680', C.SESSION_ACCOUNTING.training === 560 && C.SESSION_ACCOUNTING.test === 1120 && C.SESSION_ACCOUNTING.total === 1680
  && F.accounting.total === 1680 && F.accounting.training === 560 && F.accounting.test === 1120 && JSON.stringify(C.CELL_NAMES) === JSON.stringify(['U_off', 'U_mask', 'U_both', 'G_both'])
  && C.WORLD_START === 1392 && C.BLOCKS.S.hi === 1671 && C.MARGIN.delta === 20 && C.FAMILY_SIZE === 3 && !C.CELL_NAMES.includes('U_exec'));

// F4
{
  const isRuntime = (p) => p === 'main.js' || p === 'connections.json' || p === 'neurons.json' || p === 'index.html' || p.startsWith('render/') || p.startsWith('instrumentation/') || p.startsWith('experiments/m7/');
  check('F4.production-main-equals-the-audited-blob-and-no-runtime-file-changed', sha(lf(fs.readFileSync(path.join(ROOT, 'main.js')))) === C.TREE.headMainSha256
    && gitText(['diff', '--name-only', C.HEAD_COMMIT, 'HEAD', '--', ...runtimePaths().filter(isRuntime)]).trim() === ''
    && gitText(['status', '--porcelain', '--untracked-files=no', '--', 'main.js', 'render', 'instrumentation', 'connections.json', 'neurons.json', 'index.html', 'experiments/m7']).trim() === '');
  const g = buildGuardTree({ outRoot: path.join(os.tmpdir(), `gfs-freeze-verify-${process.pid}`) });
  const mainG = fs.readFileSync(path.join(g.dir, 'main.js'), 'utf8');
  check('F4.guard-tree-builds-to-its-pin', sha(mainG) === C.GUARD_TREE.guardMainSha256 && g.manifest.gatefloorinteraction.admitLineSha256 === C.GUARD_TREE.admitLineSha256
    && g.manifest.gatefloorinteraction.execLineSha256 === C.GUARD_TREE.execLineSha256 && F.substrate.guardMainSha256 === C.GUARD_TREE.guardMainSha256);
  check('F4.s5-lastreasoning-is-never-cleared-in-the-guard-tree', lastReasoningInvariant(mainG).ok === true);
  fs.rmSync(path.dirname(g.dir), { recursive: true, force: true });
  const gi = ['config.mjs', 'session.mjs', 'transform.mjs', 'analyze.mjs', 'orchestrate.mjs', 'static_checks.mjs'].map(f => `experiments/gate-floor-interaction/${f}`);
  check('F4.frozen-interaction-files-unchanged-since-their-freeze', gitText(['diff', '--name-only', F.substrate.frozenInteractionCommit, 'HEAD', '--', ...gi]).trim() === '');
}

// F5
{
  const rv = fs.readFileSync(path.join(ROOT, F.review.reviewRecord.path)), pk = fs.readFileSync(path.join(ROOT, F.review.reviewedPackage.path));
  check('F5.review-record-and-reviewed-package-hash-to-their-recorded-values', sha(lf(rv)) === F.review.reviewRecord.sha256 && sha(lf(pk)) === F.review.reviewedPackage.sha256
    && F.review.reviewedPackage.sha256 === 'bf0215214eceb7b659db31cc5fb7643e7934dbe793a0740bcbe4131035e952c2');
  const t = rv.toString('utf8');
  check('F5.the-recorded-verdict-is-the-reviewer-s-own-text', /\*\*FREEZE-READY WITH EXPLICIT LIMITATIONS\*\*/.test(t) && /## 4\. Blocking defects\s+None identified/.test(t) && /## 6\. Minimum required corrections\s+None\./.test(t)
    && F.review.verdict === 'FREEZE-READY WITH EXPLICIT LIMITATIONS' && F.review.blockingDefects === 0 && F.review.requiredCorrections === 0 && F.review.date === '2026-10-20');
}

// F6
{
  const fm = norm(fs.readFileSync(path.join(HERE, 'FREEZE.md'), 'utf8')), dm = norm(fs.readFileSync(path.join(HERE, 'DESIGN.md'), 'utf8')), rm = norm(fs.readFileSync(path.join(HERE, 'README.md'), 'utf8'));
  const S = F.mandatoryStatements.map(norm);
  check('F6.five-mandatory-statements-in-freeze-json-freeze-md-and-design-md', S.length === 5 && S.every(s => fm.includes(s) && dm.includes(s)), S.filter(s => !fm.includes(s) || !dm.includes(s)).join(' | '));
  check('F6.the-confirmatory-run-is-stated-as-not-authorized-and-not-executed', [fm, dm, rm].every(x => /NOT AUTHORIZED and NOT EXECUTED|NOT AUTHORIZED\*\* and \*\*NOT EXECUTED|run is NOT AUTHORIZED/.test(x)) && /NOT AUTHORIZED and NOT EXECUTED/.test(F.authorization.confirmatoryRun));
  check('F6.the-backup-limitation-stays-open', F.openOperational.some(s => /no verified off-machine copy/.test(s) && /NOT complete/.test(s)) && /no verified off-machine copy/.test(fm));
}

// F7
{
  const tracked = gitText(['ls-files', '--', REL]).split('\n');
  check('F7.no-results-path-is-tracked', !tracked.some(p => /\/results\//.test(p)));
  const found = [];
  const walk = (d) => { if (!fs.existsSync(d)) return; for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else found.push(p); } };
  walk(path.join(HERE, 'data'));
  const manifests = found.filter(p => path.basename(p) === 'MANIFEST.json').filter(p => { try { return JSON.parse(fs.readFileSync(p, 'utf8')).block === 'S'; } catch { return true; } });
  const blockS = found.filter(p => { const m = /gfs-.*-w(\d+)\.json$/.exec(path.basename(p)); return m && Number(m[1]) >= C.BLOCKS.S.lo && Number(m[1]) <= C.BLOCKS.S.hi; });
  check('F7.no-block-s-run-directory-or-session-record-exists', manifests.length === 0 && blockS.length === 0, [...manifests, ...blockS].slice(0, 3).join(', '));
  const after = gitText(['log', '--name-only', '--format=', `${DC}..HEAD`, '--', REL]).split('\n').filter(Boolean);
  check('F7.no-commit-after-the-design-touches-an-outcome-path', !after.some(p => /\/(results|data)\//.test(p) && !/\/data\/\.gitignore$/.test(p)));
}

// F8 (pure)
{
  const ci = (lower, upper) => ({ lower, upper });
  const d = C.MARGIN.delta;
  check('F8.ps1-boundaries', C.classifyPS1(ci(d, d + 5)) === 'SCOPE_BENEFIT' && C.classifyPS1(ci(-d - 5, -d)) === 'SCOPE_HARM' && C.classifyPS1(ci(-d + 0.1, d - 0.1)) === 'SCOPE_NEUTRAL'
    && C.classifyPS1(ci(-d, 5)) === 'INCONCLUSIVE' && C.classifyPS1(null) === 'UNDEFINED');
  check('F8.ps2-boundaries', C.classifyPS2(ci(d, 40)) === 'PACKAGE_IMPROVES' && C.classifyPS2(ci(-40, -d)) === 'PACKAGE_HARMS' && C.classifyPS2(ci(-5, 5)) === 'PACKAGE_NEUTRAL' && C.classifyPS2(ci(5, 30)) === 'INCONCLUSIVE');
  check('F8.ps3-boundaries', C.classifyPS3(ci(-40, -d)) === 'MASK_SUPERIOR' && C.classifyPS3(ci(d, 40)) === 'MASK_FALLS_SHORT' && C.classifyPS3(ci(-30, d - 0.1)) === 'MASK_SUFFICES' && C.classifyPS3(ci(-5, d)) === 'INCONCLUSIVE');
  const x1 = (lo, hi) => ({ share: (lo + hi) / 2, ci: ci(lo, hi) });
  check('F8.stale-reading-rules', C.classifyStale({ x1: x1(0.9, 1), x3: 0.95, xu: 0.05, maskResets: 1, integrityOk: true }) === 'SUPPORTED'
    && C.classifyStale({ x1: x1(0.5, 0.89), x3: 1, xu: 0, maskResets: 30, integrityOk: true }) === 'WEAKENED' && C.classifyStale({ x1: x1(0.95, 1), x3: 0.94, xu: 0, maskResets: 30, integrityOk: true }) === 'WEAKENED'
    && C.classifyStale({ x1: x1(0.95, 1), x3: 1, xu: 0.06, maskResets: 30, integrityOk: true }) === 'UNRESOLVED' && C.classifyStale({ x1: x1(0.95, 1), x3: 1, xu: 0, maskResets: 0.5, integrityOk: true }) === 'UNRESOLVED'
    && C.classifyStale({ x1: x1(0.85, 0.95), x3: 1, xu: 0, maskResets: 30, integrityOk: true }) === 'UNRESOLVED' && C.classifyStale({ x1: x1(0.95, 1), x3: 1, xu: 0, maskResets: 30, integrityOk: false }) === 'VOID');
  const sp = (o) => C.specification({ ps1: 'SCOPE_NEUTRAL', ps2: 'PACKAGE_IMPROVES', ps3: 'MASK_SUFFICES', stale: 'SUPPORTED', harmFlags: 0, instrumentsOk: true, ...o });
  check('F8.decision-table', sp({}).justified === true && /completeness requirement for the owner/.test(sp({}).execGuard) && /retrofit suffices/.test(sp({}).scope)
    && sp({ harmFlags: 1 }).justified === false && sp({ ps2: 'PACKAGE_NEUTRAL' }).justified === false && sp({ instrumentsOk: false }).justified === false
    && /keep the execution guard/.test(sp({ ps3: 'MASK_FALLS_SHORT' }).execGuard) && /do not train under the bundle/.test(sp({ ps1: 'SCOPE_HARM' }).scope));
  const A = { call: 1, a: 3, to: 9, rFrom: 3, rTo: 9, fresh: true, legal: false, blocked: false };
  check('F8.diagnostic-classes', DG.classifyArrival(A) === 'FRESH' && DG.classifyArrival({ ...A, fresh: false }) === 'CARRIED' && DG.classifyArrival({ ...A, rFrom: 7, fresh: false }) === 'STALE'
    && DG.classifyArrival({ ...A, rFrom: 7 }) === 'UNCLASSIFIED' && DG.classifyReset({ from: 3, to: 9 }, [A, A]) === 'UNCLASSIFIED');
}

console.log(`\nGATE-FLOOR-SCOPE freeze verification: ${passed} checks passed, ${failed} failed (no session run, no plan generated)`);
if (failed) { console.log(fails.join('\n')); process.exit(1); }
