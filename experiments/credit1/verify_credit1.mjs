// ==========================================================
// CREDIT-1 — the implementation-milestone gate (single entry point)
// ==========================================================
//   node experiments/credit1/verify_credit1.mjs
// Runs every authorized static check, synthetic fixture, mutant and integrity check.  It reads the repository, builds the
// experiment trees under the system temp directory, and runs NO agent session: the driver is only parsed (node --check).
// Exit 0 only if every check passes and every mutant is caught.
// ==========================================================
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as C from './config.mjs';
import { censusBlock } from './census.mjs';
import { censusFile, censusRoot, TABLE, UNRESOLVED } from './writecensus.mjs';
import { transformMain, reverseMain, buildCredit1Trees, LINES, insertedIds } from './transform.mjs';
import { createLedger, parseCaller } from './instruments.mjs';
import { checkFixtures, checkMutants, telemetryNeutral, selfTargetCounter } from './fixtures.mjs';
import { pi, checkPairing, deliveryFor, maskStore, KEEP, noQMaskOk } from './delivery.mjs';
import * as LOCK from './lock.mjs';
import { COMPONENTS } from '../xfer1/config.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');
const rel = (p) => path.relative(ROOT, p).split(path.sep).join('/');
const results = [];
const check = (id, ok, detail = '') => { results.push({ id, ok: !!ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${id}${detail ? ' - ' + detail : ''}`); };
const mutantsCaught = [];
const mutant = (id, caught) => { mutantsCaught.push({ id, caught: !!caught }); if (!caught) console.log(`MISSED MUTANT ${id}`); };
const spawns = [];
const run = (cmd, args, opts = {}) => { spawns.push([cmd, ...args]); return spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28, ...opts }); };
const git = (...a) => run('git', a);
// line ends.  Integrity is always judged on raw bytes (committed blob, exact working-copy form); text inspection uses lf().
//   lf(b)      drops the CR of every CRLF pair (the LEARN-0 verifier's idiom)
//   crlfOf(b)  the bytes git checks out for an LF blob under core.autocrlf=true (every LF becomes CRLF)
const lf = (b) => { const o = Buffer.allocUnsafe(b.length); let n = 0; for (let i = 0; i < b.length; i++) { if (b[i] === 13 && b[i + 1] === 10) continue; o[n++] = b[i]; } return o.subarray(0, n); };
const crlfOf = (b) => Buffer.from(b.toString('latin1').replace(/\n/g, '\r\n'), 'latin1');
const blob = (rev, p) => { const r = run('git', ['show', `${rev}:${p}`], { encoding: 'buffer' }); return r.status === 0 ? r.stdout : null; };
const MAIN_RAW = fs.readFileSync(path.join(ROOT, 'main.js'));
const MAIN_BLOB = blob('HEAD', 'main.js');

// ================= G0: base revision, production source, frozen evidence, registry, results =================
{
  const head = git('rev-parse', 'HEAD').stdout.trim();
  const isAnc = git('merge-base', '--is-ancestor', C.BASE_COMMIT, 'HEAD').status === 0;
  check('G0.1 base revision is HEAD or an ancestor of HEAD', isAnc, `base ${C.BASE_COMMIT.slice(0, 7)}, HEAD ${head.slice(0, 7)}`);
  const changed = git('diff', '--name-only', C.BASE_COMMIT).stdout.trim().split('\n').filter(Boolean);
  const allowed = (p) => p.startsWith('experiments/credit1/') || /^research\/external\/CREDIT1_[A-Z0-9_]+\.md$/.test(p);
  const outside = changed.filter(p => !allowed(p));
  check('G0.2 tracked changes since the base are confined to experiments/credit1/ and research/external/CREDIT1_*', outside.length === 0, outside.length ? outside.join(', ') : `${changed.length} tracked path(s) changed, all inside`);
  const PIN = C.PRODUCTION_MAIN_SHA256;
  const baseBlob = blob(C.BASE_COMMIT, 'main.js');
  const blobOk = !!baseBlob && !!MAIN_BLOB && sha256(baseBlob) === PIN && sha256(MAIN_BLOB) === PIN;
  check('G0.3a production main.js committed bytes (raw SHA-256 of the blob at the base and at HEAD) are the audited file; main.js and render/ unchanged since the base', blobOk && git('diff', '--quiet', C.BASE_COMMIT, '--', 'main.js', 'render').status === 0, `blob ${MAIN_BLOB ? sha256(MAIN_BLOB).slice(0, 16) : 'missing'}`);
  // the working copy may be the committed LF bytes or exactly their autocrlf CRLF checkout; any other byte difference fails
  const rawSha = sha256(MAIN_RAW), form = rawSha === PIN ? 'LF' : (MAIN_BLOB && rawSha === sha256(crlfOf(MAIN_BLOB))) ? 'CRLF' : 'OTHER';
  const normSha = sha256(lf(MAIN_RAW));
  check('G0.3b production main.js working copy: raw bytes are exactly the committed bytes (LF) or exactly their core.autocrlf checkout (CRLF), and the LF-normalized hash is the audited file', form !== 'OTHER' && normSha === PIN, `raw ${rawSha.slice(0, 16)} (${form}), LF-normalized ${normSha.slice(0, 16)}`);
  const v = run(process.execPath, [path.join('experiments', 'learn0', 'verify_results_learn0.mjs')]);
  const v4 = v.status === 0 && /13 checks passed, 0 failed/.test(v.stdout);
  let note = '';
  if (!v4) { // diagnostic only, never changes the verdict: V5 hashes the raw bytes of this manifest (README, "Known checkout limitation")
    const mp = 'experiments/learn0/results/manifest_blockL.json', cb = blob('HEAD', mp);
    if (cb) note = ` | diagnostic: ${mp} working copy ${sha256(fs.readFileSync(path.join(ROOT, ...mp.split('/')))).slice(0, 16)}, committed blob ${sha256(cb).slice(0, 16)}, its CRLF checkout ${sha256(crlfOf(cb)).slice(0, 16)}`;
  }
  check('G0.4 LEARN-0 frozen evidence: verify_results_learn0 13/13', v4, (v.stdout.trim().split('\n').pop() || '').slice(0, 100) + note);
  check('G0.5 LEARN-0 directory unchanged since the base (tracked) and no untracked LEARN-0 files', git('diff', '--quiet', C.BASE_COMMIT, '--', 'experiments/learn0').status === 0 && git('ls-files', '--others', '--exclude-standard', '--', 'experiments/learn0').stdout.trim() === '');
  check('G0.6 registry unchanged since the base and no untracked registry files', git('diff', '--quiet', C.BASE_COMMIT, '--', 'experiments/registry').status === 0 && git('ls-files', '--others', '--exclude-standard', '--', 'experiments/registry').stdout.trim() === '');
  check('G0.7 results, decision log and evidence-backup records unchanged since the base', git('diff', '--quiet', C.BASE_COMMIT, '--', ':(glob)experiments/*/results/**', 'research/09_decisions.md', 'research/evidence_backup').status === 0);
  const d = sha256(fs.readFileSync(path.join(HERE, 'DESIGN.md')));
  check('G0.8 DESIGN.md is the reviewed r2, byte-identical', d === C.DESIGN.sha256, d.slice(0, 16));
  const rv = Object.entries({ round1: C.REVIEWS.round1, r1Design: C.REVIEWS.r1Design, round2: C.REVIEWS.round2 }).map(([k, r]) => [k, sha256(fs.readFileSync(path.join(HERE, ...r.file.split('/')))) === r.sha256]);
  check('G0.9 review records match their recorded hashes (round 1 raw, r1 design, round 2 transcription)', rv.every(([, ok]) => ok), rv.map(([k, ok]) => `${k}:${ok}`).join(' '));
}

// ================= G1: credit-block census, A and A+ (BC-1) =================
const prodText = lf(MAIN_RAW).toString('utf8');                          // inspection text, LF-normalized (integrity: G0.3a, G0.3b)
{
  const r = censusBlock(prodText);
  check('G1.1 production census: 46 lines classified, invariants I1-I5 hold', r.problems.length === 0 && r.rows.length === 46, r.problems.slice(0, 2).join(' | ') || JSON.stringify(r.summary));
  const tot = (k) => JSON.stringify(r.totals[k]) === JSON.stringify({ ...C.SUBSTITUTIONS[k] });
  check('G1.2 substitution plans reconcile with the design: A 28 on 26 lines (17/5/6), A+ 32 on 30 lines (17/5/10)', tot('A') && tot('A+'), `A ${JSON.stringify(r.totals.A)} | A+ ${JSON.stringify(r.totals['A+'])}`);
  const lines = (pred) => r.rows.filter(pred).map(x => x.line).sort((a, b) => a - b);
  const eq = (a, b) => JSON.stringify(a) === JSON.stringify([...b].sort((x, y) => x - y));
  const D = C.DESIGN_LINES;
  const ok = eq(lines(x => x.class === 'GUARD'), D.GUARD) && eq(lines(x => x.class === 'DEAD'), D.DEAD) && eq(lines(x => x.actionA.includes('FROM')), D.FROM)
    && eq(lines(x => x.actionA.includes('TO')), D.TO) && eq(lines(x => x.actionA === 'PREV'), D.PREV) && eq(lines(x => x.actionAplus === 'PREV_P'), D.HELD_EDGE)
    && eq(lines(x => x.class === 'HELD' && x.actionAplus === 'KEEP'), D.HELD_OTHER) && eq(lines(x => x.class === 'POSITION'), D.POSITION) && eq(lines(x => x.class === 'RESET'), D.RESET)
    && eq(lines(x => x.class === 'LOG'), D.LOG) && eq(lines(x => x.class === 'COMMENT'), D.COMMENT);
  check('G1.3 every classified line number equals DESIGN r2 section 2.1 (production main.js)', ok);
  // census mutants.  A mutant whose anchor is not found counts as NOT caught (it never lands on another line).
  class AnchorMissing extends Error {}
  const at = (M, pred, what) => { const i = M.findIndex(pred); if (i < 0) throw new AnchorMissing(what); return i; };
  const mutOn = (text, f) => { const M = text.split('\n'); try { f(M); } catch (e) { if (e instanceof AnchorMissing) return false; throw e; } return censusBlock(M.join('\n')).problems.length > 0; };
  const idxOf = (M, t) => at(M, l => l.trim() === t, t);
  const cm2 = (M) => { const i = at(M, l => l === '  let nextStep = reasoning.to;', 'execution probe'); M[i] = M[i] + ' runPrediction(agentCurrent);'; };
  mutant('CM1 TD state re-keyed in the source', mutOn(prodText, M => { const i = idxOf(M, 'state:     makeStateKey(agentLast,    goalNeuronId),'); M[i] = M[i].replace('agentLast', 'agentCurrent'); }));
  mutant('CM2 re-decision between the probe and the block', mutOn(prodText, cm2));
  mutant('CM3 agentLast assigned inside the block', mutOn(prodText, M => { const i = idxOf(M, 'const prev = agentLast; // 👉 where we were before'); M.splice(i + 1, 0, 'agentLast = next;'); }));
  mutant('CM4 an extra unclassified occurrence', mutOn(prodText, M => { const i = idxOf(M, 'updateSequenceError(agentCurrent);'); M[i] = M[i] + ' void agentLast;'; }));
  mutant('CM5 `next` reassigned inside the block (I4)', mutOn(prodText, M => { const i = idxOf(M, 'const prev = agentLast; // 👉 where we were before'); M.splice(i + 1, 0, 'next = agentCurrent;'); }));
  mutant('CM6 a second goal assignment inside the block (I5)', mutOn(prodText, M => { const i = idxOf(M, 'const prev = agentLast; // 👉 where we were before'); M.splice(i + 1, 0, 'goalNeuronId = 7;'); }));
  // line-ending robustness of the inspection path, on both checkout forms of the committed bytes: each normalizes to the
  // gate's inspection text, passes the census, and CM2 is caught on it.  Control: the unnormalized CRLF text misses CM2's
  // exact-line anchor (the fresh-clone defect this path removes), which also shows the CRLF form really carries CRs.
  const le = MAIN_BLOB ? [['LF', MAIN_BLOB], ['CRLF', crlfOf(MAIN_BLOB)]].map(([k, b]) => { const t = lf(b).toString('utf8');
    return { k, same: t === prodText, census: censusBlock(t).problems.length === 0, cm2: mutOn(t, cm2), control: k === 'LF' || !mutOn(b.toString('utf8'), cm2) }; }) : [];
  check('G1.4 line ends: the LF and CRLF checkout forms of the committed main.js both normalize to the inspection text, pass the census and catch CM2 (control: unnormalized CRLF misses it)',
    le.length === 2 && le.every(x => x.same && x.census && x.cm2 && x.control), le.map(x => `${x.k}: same ${x.same}, census ${x.census}, CM2 ${x.cm2}, control ${x.control}`).join(' | '));
}

// ================= G2: write-site census (BC-3) =================
const EXPECTED_BY_CLASS = { DEF: 14, LOAD: 12, PIPELINE_BRIDGE: 1, ADJACENCY: 2, CLICK_ONLY: 6, DECAY: 11, PIPELINE_REPLAY: 1, BLOCK_REKEY: 14, BLOCK_PATH: 4, BLOCK_HELD: 3, KEY_PRESERVING: 1, USER_RESET: 7, WRITER_IMPL: 13 };
{
  const r = censusRoot(ROOT);
  check('G2.1 every keyed write site in main.js and render/*.js is classified (production)', r.problems.length === 0 && r.sites === 89, `${r.files} files, ${r.sites} sites${r.problems.length ? ' | ' + r.problems[0] : ''}`);
  check('G2.2 class counts as recorded', JSON.stringify(r.byClass, Object.keys(EXPECTED_BY_CLASS).sort()) === JSON.stringify(EXPECTED_BY_CLASS, Object.keys(EXPECTED_BY_CLASS).sort()), JSON.stringify(r.byClass));
  check('G2.3 documented gaps listed (non-Map / private stores, momentum write-only)', UNRESOLVED.length === 3);
  const L = prodText.split('\n');
  const i = L.findIndex(l => l.trim() === 'decayTrust(0.9997);');
  const add = L.slice(); add.splice(i + 1, 0, '      Q.set("x#1->2", 1);');
  mutant('WM1 an unclassified write site is detected', censusFile('main.js', add.join('\n')).problems.length > 0);
  const del = L.slice(); del.splice(i, 1);
  mutant('WM2 a classified write site that disappears is detected', censusFile('main.js', del.join('\n')).problems.length > 0);
  const getMomentumCallers = ['main.js', ...fs.readdirSync(path.join(ROOT, 'render')).map(f => `render/${f}`)].filter(f => f.endsWith('.js'))
    .filter(f => /getMomentumBonus\(/.test(fs.readFileSync(path.join(ROOT, ...f.split('/')), 'utf8').replace(/export function getMomentumBonus\(/g, '')));
  check('G2.4 momentum store has no reader (getMomentumBonus has 0 call sites)', getMomentumCallers.length === 0, getMomentumCallers.join(', '));
}

// ================= G3: experiment trees, S-1 to S-5 (BC-6) =================
const outRoot = path.join(os.tmpdir(), 'mfw-credit1-gate');
fs.rmSync(outRoot, { recursive: true, force: true });
const built = buildCredit1Trees({ outRoot });
const baseText = built.baseText;
const baseL = baseText.split('\n');
// expected values computed here from the base tree, never taken from the transform's own report (t.plan, t.lineMap, t.census)
const TC = censusBlock(baseText, { tree: true });
const AUTH = TC.plan;                                                        // the independent substitution plan per arm
const insertedSet = (arm) => new Set(insertedIds(arm).map(id => LINES[id]));
const removeInserted = (text, arm) => { const s = insertedSet(arm); return text.split('\n').filter(l => !s.has(l)); };
// independent base->tree line map: indices of the tree lines that are not inserted lines of the arm
const mapOf = (text, arm) => { const s = insertedSet(arm), m = []; text.split('\n').forEach((l, i) => { if (!s.has(l)) m.push(i); }); return m; };
const planSig = (plan) => JSON.stringify(plan.map(p => [p.idx, p.count]));
function s3(t, arm) {
  const plan = AUTH[arm];
  const R = removeInserted(t.text, arm);
  const problems = [];
  if (t.plan && planSig(t.plan) !== planSig(plan)) problems.push('the transform-reported plan differs from the independent census plan');
  if (R.length !== baseL.length) problems.push(`line count after removing inserted lines ${R.length} != base ${baseL.length}`);
  const changed = [];
  for (let i = 0; i < Math.min(R.length, baseL.length); i++) if (R[i] !== baseL[i]) changed.push(i);
  const planned = new Set(plan.map(p => p.idx));
  const extra = changed.filter(i => !planned.has(i)), missing = [...planned].filter(i => !changed.includes(i));
  if (extra.length) problems.push(`unplanned changed line(s) ${extra.map(i => i + 1).join(', ')}`);
  if (missing.length) problems.push(`planned line(s) not substituted ${missing.map(i => i + 1).join(', ')}`);
  let total = 0;
  for (const p of plan) { const n = (R[p.idx] || '').match(/__c1[onp]\b/g)?.length || 0; total += n; if (n !== p.count) problems.push(`line ${p.line}: ${n} substitutions, plan ${p.count}`); }
  for (let i = 0; i < R.length; i++) if (!planned.has(i) && /__c1[onp]\b/.test(R[i])) problems.push(`CREDIT-1 identifier outside the plan at base line ${i + 1}`);
  return { problems, changed: changed.length, total };
}
// S-5: invariants on the tree text, located through the independent census (TC) and the independent line map
function s5(t, arm) {
  const T = t.text.split('\n'), M = mapOf(t.text, arm), mp = (i) => M[i];
  const b = TC.block, p = [];
  if (M.length !== baseL.length) p.push(`independent line map covers ${M.length} lines, base has ${baseL.length}`);
  if (t.lineMap && (t.lineMap.length !== M.length || t.lineMap.some((x, i) => x !== M[i]))) p.push('the transform-reported line map differs from the independent line map');
  if (T[mp(b.ifIdx)] !== 'if (' || T[mp(b.openIdx)] !== ') {' || T[mp(b.closeIdx)] !== '}') p.push('block bounds do not map');
  const resetT = TC.rows.filter(r => r.class === 'RESET').map(r => mp(r.idx));
  for (let i = mp(b.openIdx) + 1; i < mp(b.closeIdx); i++) {
    if (/(^|[^A-Za-z0-9_$.])(agentLast|agentCurrent)\s*=(?!=)/.test(T[i]) && !resetT.includes(i)) p.push(`position assignment at tree line ${i + 1}`);
    if (/(^|[^A-Za-z0-9_$.])next\s*=(?!=)/.test(T[i])) p.push(`next assigned at tree line ${i + 1}`);
    if (/(^|[^A-Za-z0-9_$.])goalNeuronId\s*=(?!=)/.test(T[i]) && T[i] !== '        goalNeuronId = window.homeNeuronId;') p.push(`goal assigned at tree line ${i + 1}`);
  }
  const d1 = T.indexOf(LINES.decl1);
  if (d1 !== mp(b.openIdx) + 1) p.push('declaration 1 is not the first statement of the block');
  const firstUse = (tok, from) => T.findIndex((l, i) => i > from && l !== LINES.decl1 && l !== LINES.decl2 && new RegExp(`\\b${tok}\\b`).test(l));
  for (const tok of ['__c1o', '__c1n', '__c1on']) { const u = firstUse(tok, -1); if (u !== -1 && u < d1) p.push(`${tok} used before its declaration`); }
  if (arm === 'A+') {
    const prevIdx = mp(TC.rows.find(r => r.text === 'const prev = agentLast; // 👉 where we were before').idx);
    const d2 = T.indexOf(LINES.decl2);
    if (d2 !== prevIdx + 1) p.push('declaration 2 does not immediately follow `const prev`');
    const u = firstUse('__c1p', -1); if (u !== -1 && u < d2) p.push('__c1p used before its declaration');
  } else if (T.some(l => /\b__c1p\b/.test(l))) p.push('__c1p present in tree A');
  const execT = T.indexOf('  let nextStep = reasoning.to;');
  for (let i = execT + 1; i < mp(b.ifIdx); i++) if (insertedIds(arm).some(id => LINES[id] === T[i])) p.push(`inserted line between the execution probe and the block (tree line ${i + 1})`);
  return p;
}
{
  check('G3.0 LEARN-0 tree rebuilt and matches its frozen pins (main.js, planning.js)', true, `main ${C.LEARN0_TREE.mainSha256.slice(0, 12)}`);
  const tc = TC;
  const tcTot = (k) => JSON.stringify(tc.totals[k]) === JSON.stringify({ ...C.SUBSTITUTIONS[k] });
  check('G3.1 (S-1) census of the LEARN-0 tree main.js: 47 lines (46 + the goal-reset probe as INSTRUMENT), invariants hold, plans A 28/26 and A+ 32/30', tc.problems.length === 0 && tc.rows.length === 47 && tc.summary.INSTRUMENT === 1 && tcTot('A') && tcTot('A+'), JSON.stringify(tc.summary));
  const wcTree = censusRoot(built.learn0.dir);
  check('G3.1b write census of the LEARN-0 tree: 89 sites, all classified', wcTree.problems.length === 0 && wcTree.sites === 89);
  for (const arm of ['A', 'A+']) {
    const tr = built.trees[arm], t = tr.transform;
    const mainSha = sha256(fs.readFileSync(path.join(tr.dir, 'main.js')));
    check(`G3.2 tree ${arm}: main.js equals the pinned build (${C.CREDIT1_TREE[arm].mainSha256.slice(0, 12)}), ${C.CREDIT1_TREE[arm].inserted} inserted lines`, mainSha === C.CREDIT1_TREE[arm].mainSha256 && t.inserted.length === C.CREDIT1_TREE[arm].inserted, mainSha.slice(0, 16));
    const rev = reverseMain(t.text, arm, AUTH[arm]);
    check(`G3.3 (S-2) tree ${arm}: reverse-substitution identity, byte-identical to the LEARN-0 tree main.js`, rev.problems.length === 0 && rev.text === baseText, rev.problems.slice(0, 2).join(' | '));
    const s = s3(t, arm);
    check(`G3.4 (S-3) tree ${arm}: substituted set equals the plan (${C.SUBSTITUTIONS[arm].total} on ${C.SUBSTITUTIONS[arm].lines} lines), nothing else touched`, s.problems.length === 0 && s.changed === C.SUBSTITUTIONS[arm].lines && s.total === C.SUBSTITUTIONS[arm].total, s.problems.slice(0, 3).join(' | ') || `${s.total} on ${s.changed}`);
    // S-4: only main.js (and the manifest) differ from the LEARN-0 tree
    const files = (d) => { const out = []; const walk = (p) => { for (const e of fs.readdirSync(p, { withFileTypes: true })) { const q = path.join(p, e.name); if (e.isDirectory()) walk(q); else out.push(path.relative(d, q).split(path.sep).join('/')); } }; walk(d); return out.sort(); };
    const fb = files(built.learn0.dir), ft = files(tr.dir);
    const diff = ft.filter(f => f !== 'main.js' && f !== 'MANIFEST.json' && (!fb.includes(f) || sha256(fs.readFileSync(path.join(tr.dir, f))) !== sha256(fs.readFileSync(path.join(built.learn0.dir, f)))));
    check(`G3.5 (S-4) tree ${arm}: only main.js and MANIFEST.json differ from the LEARN-0 tree`, diff.length === 0 && fb.length === ft.length, `${ft.length} files${diff.length ? ' | ' + diff.slice(0, 3).join(', ') : ''}`);
    const p = s5(t, arm);
    check(`G3.6 (S-5) tree ${arm}: invariants (positions set only at the reset, next not reassigned, goal only at the recovery line, declarations before use, nothing inserted between the probe and the block; line map independent)`, p.length === 0, p.slice(0, 3).join(' | '));
    // ledger site map integrity: every write-census main.js row maps to a tree line with the same (or planned-substituted) text
    const T = t.text.split('\n'), M = mapOf(t.text, arm);
    const planned = new Set(AUTH[arm].map(x => x.idx));
    const bad = wcTree.rows.filter(r => r.file === 'main.js').filter(r => { const tl = T[M[r.idx]] ?? ''; return planned.has(r.idx) ? !/__c1[onp]\b/.test(tl) && tl.trim() !== r.text : tl.trim() !== r.text; });
    check(`G3.7 tree ${arm}: the ledger site map covers all 60 main.js write sites at the right tree lines`, bad.length === 0 && Object.keys(tr.manifest.credit1.siteClasses).length === 60, bad.slice(0, 2).map(r => r.text).join(' | '));
  }
  // T2b: default-off semantics of the inserted declarations and telemetry lines (evaluated in isolation; no runtime)
  const evalDecl = (G, withDecl2) => new Function('G', 'agentCurrent', 'agentLast', 'next', 'prev',
    `${LINES.decl1.replaceAll('globalThis', 'G')}\n${withDecl2 ? LINES.decl2.replaceAll('globalThis', 'G') : ''}\nreturn { on: __c1on, o: __c1o, n: __c1n, p: ${withDecl2 ? '__c1p' : 'undefined'} };`)(G, 'CUR', 'LAST', 'NEXT', 'PREV');
  const cases = [[{}, false, false], [{ __CREDIT1__: { aligned: false } }, false, false], [{ __CREDIT1__: { aligned: 'true' } }, false, false], [{ __CREDIT1__: { edgeFiltered: true } }, false, false],
    [{ __CREDIT1__: { aligned: true } }, true, false], [{ __CREDIT1__: { aligned: true, edgeFiltered: true } }, true, true]];
  const decOk = cases.every(([G, on, plus]) => { const r = evalDecl(G, true);
    return r.on === on && r.o === (on ? 'CUR' : 'LAST') && r.n === (on ? 'NEXT' : 'CUR') && r.p === (plus ? 'CUR' : 'PREV'); });
  check('G3.8 (T2) declarations: global absent / aligned:false / non-boolean / edgeFiltered-only are all legacy; aligned:true is A; aligned+edgeFiltered is A+', decOk);
  const telIds = insertedIds('A+').filter(id => !['decl1', 'decl2'].includes(id));
  let telOk = true;
  for (const id of telIds) {
    try { new Function('G', LINES[id].replaceAll('globalThis', 'G'))({}); } catch { telOk = false; }
    let called = false;
    try { new Function('G', 'currentKey', 'k', 'agentCurrent', '__c1on', '__c1o', 'next', 'agentLast', '__c1n', 'goalNeuronId', LINES[id].replaceAll('globalThis', 'G'))({ __CREDIT1_TEL__: new Proxy({}, { get: () => () => { called = true; } }) }, 1, 2, 3, true, 3, 4, 5, 4, 19); } catch { telOk = false; }
    if (!called) telOk = false;
  }
  check(`G3.9 (T2) the ${telIds.length} telemetry lines are inert with the global absent and call only the telemetry when present`, telOk);
  // transform mutants: each goes through S-2 (reverse identity under the independent plan), S-3 and S-5; caught if any reports a problem
  const tmBy = { n: 0, S2: 0, S3: 0, S5: 0 };
  const tmCaught = (t, arm) => {
    const r = reverseMain(t.text, arm, AUTH[arm]);
    const by = { S2: r.problems.length > 0 || r.text !== baseText, S3: s3(t, arm).problems.length > 0, S5: s5(t, arm).length > 0 };
    tmBy.n++; for (const k of ['S2', 'S3', 'S5']) if (by[k]) tmBy[k]++;
    return by.S2 || by.S3 || by.S5;
  };
  for (const arm of ['A', 'A+']) for (const pl of AUTH[arm]) mutant(`TM-skip ${arm} line ${pl.line}`, tmCaught(transformMain(baseText, arm, { mutate: { skipIdx: pl.idx } }), arm));
  const rowIdx = (txt, nth = 0) => TC.rows.filter(r => r.text === txt)[nth].idx;
  for (const [name, idx, from, to] of [['guard line', rowIdx('agentLast !== null &&'), 'agentLast', '__c1o'], ['reset line', rowIdx('agentCurrent = allIds[Math.floor(liveRng() * allIds.length)];'), 'agentCurrent', '__c1n'],
    ['recentMemory push (held, not credit)', rowIdx('if (current !== null && current !== prev) {'), 'prev', '__c1o'], ['position line', rowIdx('updateSequenceError(agentCurrent);'), 'agentCurrent', '__c1n'],
    ['log line', rowIdx('"| transUnc:", getTransitionUncertainty(agentLast, next).toFixed(3),'), 'agentLast', '__c1o']])
    mutant(`TM-extra substitution on a ${name}`, tmCaught(transformMain(baseText, 'A', { mutate: { extraIdx: idx, extraFrom: from, extraTo: to } }), 'A'));
  mutant('TM-A+ operands applied in tree A', tmCaught(transformMain(baseText, 'A', { mutate: { plusInA: true } }), 'A'));
  const flagOn = built.trees.A.transform.text.replace(LINES.decl1, LINES.decl1.replace('globalThis.__CREDIT1__.aligned === true', 'globalThis.__CREDIT1__?.aligned !== false'));
  mutant('TM-flag default on (declaration altered)', flagOn !== built.trees.A.transform.text && tmCaught({ ...built.trees.A.transform, text: flagOn }, 'A'));
  console.log(`transform mutants routed through S-2/S-3/S-5: ${tmBy.n}; reported by S-2 ${tmBy.S2}, S-3 ${tmBy.S3}, S-5 ${tmBy.S5}`);
}

// ================= G4: instruments, fixtures, mutants, OPT-1, OPT-2 (BC-4, BC-5) =================
{
  const f = checkFixtures();
  const bad = f.results.filter(x => !x.ok);
  check(`G4.1 synthetic fixtures: ${f.results.length} runs (14 event classes x L, A, A+) match their hand-written expectations`, bad.length === 0 && f.results.length === 42, bad.slice(0, 2).map(b => `${b.fixture}/${b.arm}: ${b.diffs.join('; ')}`).join(' | '));
  check('G4.2 every specified event class is covered by a fixture', f.missing.length === 0, f.missing.join(', '));
  for (const m of checkMutants()) mutant(m.name, m.caught);
  const tn = telemetryNeutral();
  check('G4.3 (OPT-1) telemetry calls leave every store hash unchanged', tn.neutral === true, tn.before.slice(0, 12));
  const st = selfTargetCounter();
  check('G4.4 (OPT-2) self-target candidate-evaluation counter', st.ok, JSON.stringify(st.counts));
  // real-stack attribution: a three-line module in a uniquely named temp directory (not the agent)
  const dir = path.join(os.tmpdir(), 'mfw-credit1-stacktest', 'stk-' + sha256('credit1-stack').slice(0, 12));
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'main.js'), 'export function w(map) {\n  map.set(\'k\', 1);\n}\n');
  const led = createLedger({ caller: () => parseCaller(new Error().stack, path.join(dir, 'main.js')) });
  const m = new Map(); led.wrapMap('Q', m);
  const mod = await import(pathToFileURL(path.join(dir, 'main.js')).href);
  mod.w(m);
  check('G4.5 I-LEDGER stack attribution on a real stack (8.3 / long path and URL-encoding safe): the write is attributed to line 2', led.events.length === 1 && led.events[0].line === 2, `line ${led.events[0] && led.events[0].line}`);
  check('G4.6 I-LEDGER map list: every exported keyed store is wrapped by the driver (Q, rewards, penalties, signals, curiosity, confidence, transitions nested, pathAttempts, pathSuccesses)',
    ['Q', 'rewards', 'penalties', 'signals', 'curiosity', 'confidence', 'transitions', 'pathAttempts', 'pathSuccesses'].every(n => fs.readFileSync(path.join(HERE, 'session.mjs'), 'utf8').includes(`'${n}'`)));
}

// ================= G5: delivery and the locked driver (BC-2) =================
{
  const block = Array.from({ length: 16 }, (_, i) => 2032 + i);
  check('G5.1 pairing pi: bijection inside each quartet, different goal, block aligned (illustrative indices; nothing generated)', checkPairing(block).length === 0);
  mutant('DM1 pi = identity (same goal) is rejected', checkPairing(block, (w) => w).length > 0);
  mutant('DM1b a pairing that leaves the quartet is rejected', checkPairing(block, (w) => (w + 4 - 2032) % 16 + 2032).length > 0);
  mutant('DM1c a block not aligned to quartets is rejected', checkPairing(block.map(w => w + 1)).length > 0);
  const want = { T_L: ['none'], T_A: ['none'], N0L: ['none'], N0A: ['none'], N1L: ['own', 'T_L', 'FULL'], N1A: ['own', 'T_A', 'FULL'], N1AX: ['paired', 'T_A', 'FULL'], N1LX: ['paired', 'T_L', 'FULL'], N1A_noQ: ['own', 'T_A', 'NO_Q'] };
  const okCells = Object.entries(want).every(([c, [src, tr, mask]]) => { const d = deliveryFor(c, 2033); return d.source === src && (src === 'none' || (d.training === tr && d.mask === mask && d.brainWorld === (src === 'own' ? 2033 : pi(2033)))); });
  check('G5.2 store delivery for the 9 cells (none / own / paired; FULL / NO_Q)', okCells && C.CELLS.length === 9);
  const brain = Object.fromEntries(COMPONENTS.map(c => [c, c === 'episodes' ? [] : { k: 1 }]));
  const nq = maskStore(brain, 'NO_Q');
  check('G5.3 the NO_Q mask removes exactly Q', !('Q' in nq) && COMPONENTS.filter(c => c !== 'Q').every(c => c in nq) && noQMaskOk(KEEP.NO_Q));
  mutant('DM2 a mask that also drops rewards is rejected', !noQMaskOk(KEEP.NO_Q.filter(c => c !== 'rewards')));
  mutant('DM2b a mask that keeps Q is rejected', !noQMaskOk([...KEEP.NO_Q, 'Q']));
  const chk = run(process.execPath, ['--check', path.join('experiments', 'credit1', 'session.mjs')]);
  check('G5.4 driver parses (node --check: parsed, not executed)', chk.status === 0, chk.stderr.trim().slice(0, 120));
  const src = fs.readFileSync(path.join(HERE, 'session.mjs'), 'utf8');
  const iLock = src.indexOf('assertSessionAuthorized();'), iArgv = src.indexOf('JSON.parse(process.argv'), iImp = src.indexOf('await T(');
  check('G5.5 driver asserts the session lock before reading input or loading any runtime module', iLock > 0 && iLock < iArgv && iLock < iImp && /^import \{ assertSessionAuthorized, assertAPlusAuthorized \} from '\.\/lock\.mjs';$/m.test(src));
  check('G5.6 session lock and A+ module lock are null; the lock refuses', LOCK.SESSION_AUTHORIZATION === null && LOCK.A_PLUS_MODULE_AUTHORIZATION === null && (() => { try { LOCK.assertSessionAuthorized(); return false; } catch { return true; } })());
  check('G5.7 driver emits the required instrument fields (I-CRED, I-LEDGER, episodes, redirects, self-target counts) and swap delivery only via pi', ['icred:', 'ledger:', 'episodes:', 'redirects:', 'selfCandidates:', "deliveryFor(CELL.name, IN.world)", 'brainWorld !== DELIVERY.brainWorld'].every(s => src.includes(s)));
}

// ================= G6: calibration protocol (BC-7) =================
{
  const p = fs.readFileSync(path.join(HERE, 'CALIBRATION_PROTOCOL.md'), 'utf8');
  const steps = ['C-0', 'D-0', 'D-1', 'D-1c', 'D-2', 'D-3', 'D-4', 'D-5', 'C-1', 'C-2'];
  check('G6.1 calibration protocol: NOT AUTHORIZED, development basis XFER-1 worlds 0-29, every step with a pass rule, coverage list = config.EVENT_CLASSES', /NOT AUTHORIZED, NOT RUN/.test(p) && /XFER-1 worlds 0–29/.test(p) && steps.every(s => p.includes(`| ${s} |`)) && p.includes('config.EVENT_CLASSES') && C.CALIBRATION.status === 'NOT AUTHORIZED' && C.EVENT_CLASSES.length === 14);
}

// ================= G7: analysis constants, grid, territory =================
{
  const phi = (x) => { const t = 1 / (1 + 0.2316419 * Math.abs(x)), d = Math.exp(-x * x / 2) / Math.sqrt(2 * Math.PI); const p = d * t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429)))); return x > 0 ? 1 - p : p; };
  const q = (pr) => { let lo = 0, hi = 6; for (let i = 0; i < 80; i++) { const m = (lo + hi) / 2; if (phi(m) < pr) lo = m; else hi = m; } return (lo + hi) / 2; };
  const primaryOk = (P) => P.level === 0.975 && P.margin === 20 && JSON.stringify(P.sensitivity) === '[15,30]' && Math.abs(P.zAlpha - q(1 - 0.025 / 2)) < 2e-4 && Math.abs(P.zPower - q(0.8)) < 2e-4 && JSON.stringify(P.claims) === '["P1","P2"]';
  check('G7.1 primary family P1, P2; Bonferroni-2 (level 0.975, z 2.2414); margin 20; sensitivity 15/30', primaryOk(C.PRIMARY));
  mutant('AM1 level 0.95 is rejected', !primaryOk({ ...C.PRIMARY, level: 0.95 }));
  const EXPECTED_GRID = { RAISES: ['R1', 'R2', 'R2', 'R3'], NO_PRACTICAL_DIFFERENCE: ['R4', 'R5', 'R6', 'R5'], LOWERS: ['R7', 'R7', 'R7', 'R7'], INCONCLUSIVE: ['R8', 'R6', 'R6', 'R6'] };
  const gridOk = (G) => C.P2_LABELS.every(p2 => JSON.stringify(C.P1_LABELS.map(p1 => G[p2] && G[p2][p1])) === JSON.stringify(EXPECTED_GRID[p2])) && new Set(Object.values(G).flatMap(r => Object.values(r))).size === 8;
  check('G7.2 decision grid: 16 cells, exhaustive, R1-R8, equal to DESIGN r2 section 6.4', gridOk(C.GRID));
  mutant('AM2 a swapped grid row is rejected', !gridOk({ ...C.GRID, RAISES: C.GRID.LOWERS }));
  const lab = (lo, hi) => C.labelOf({ lower: lo, upper: hi }, 'POS', 'NONE', 'NEG');
  check('G7.3 label rule at the margin boundaries', lab(20, 40) === 'POS' && lab(19.99, 40) === 'INCONCLUSIVE' && lab(-40, -20) === 'NEG' && lab(-19.9, 19.9) === 'NONE' && lab(-20, 10) === 'INCONCLUSIVE');
  check('G7.4 sample-size rule reproduces the design illustration (P1 488, P2 976 at SD sqrt2 x 114.5)', C.nFor(114.5) === 488 && C.nFor(Math.SQRT2 * 114.5) === 976);
  const maxReserved = Math.max(...C.TERRITORY.reserved.map(r => r.hi));
  const territoryOk = (T) => T.confirmatoryStart > Math.max(...T.reserved.map(r => r.hi)) && T.generated === false;
  check('G7.5 territory: confirmatory start 2032 above every reserved range; nothing generated', territoryOk(C.TERRITORY) && C.TERRITORY.confirmatoryStart === maxReserved + 1);
  mutant('AM3 a confirmatory start inside 0-2031 is rejected', !territoryOk({ ...C.TERRITORY, confirmatoryStart: 2000 }));
  mutant('AM3b a territory marked as generated is rejected', !territoryOk({ ...C.TERRITORY, generated: true }));
}

// ================= G8: session count is zero =================
{
  const data = path.join(HERE, 'data');
  const sessionFiles = fs.existsSync(data) ? fs.readdirSync(data, { recursive: true }).filter(f => /\.json$/.test(String(f))) : [];
  check('G8.1 no CREDIT-1 session record exists (experiments/credit1/data absent or empty)', sessionFiles.length === 0, fs.existsSync(data) ? `${sessionFiles.length} file(s)` : 'absent');
  const runtimeImport = /from\s+['"][^'"]*(\/render\/|\/main\.js|experiments\/m7\/run\.js|\.\/session\.mjs)['"]|import\(\s*['"][^'"]*(render\/|main\.js|run\.js|session\.mjs)/;
  const mods = fs.readdirSync(HERE).filter(f => f.endsWith('.mjs') && f !== 'session.mjs');
  const offending = mods.filter(f => runtimeImport.test(fs.readFileSync(path.join(HERE, f), 'utf8')));
  check('G8.2 no gate module imports the runtime or the driver', offending.length === 0, offending.join(', '));
  const driverRuns = spawns.filter(s => s.some(a => String(a).includes('session.mjs')) && !s.includes('--check'));
  check('G8.3 this gate started no agent session (the driver was only parsed); agent sessions run: 0', driverRuns.length === 0, `${spawns.length} subprocess(es): ${[...new Set(spawns.map(s => path.basename(String(s[0]))))].join(', ')}`);
}

// ================= summary =================
const failed = results.filter(r => !r.ok);
const missed = mutantsCaught.filter(m => !m.caught);
console.log(`\nCREDIT-1 gate: ${results.length - failed.length}/${results.length} checks passed; mutants caught ${mutantsCaught.length - missed.length}/${mutantsCaught.length}; agent sessions run: 0`);
if (failed.length || missed.length) { console.log('GATE FAILED'); process.exit(1); }
console.log('GATE PASSED');
