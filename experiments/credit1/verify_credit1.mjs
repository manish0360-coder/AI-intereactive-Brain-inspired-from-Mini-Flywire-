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
import { createLedger, parseCaller, captureStack, STACK_CAPTURE_LIMIT, evaluateLedger, pipelineCandidates, GOAL_NONE } from './instruments.mjs';
import { checkFixtures, checkMutants, telemetryNeutral, selfTargetCounter, isEdge as graphEdge } from './fixtures.mjs';
import { pi, checkPairing, deliveryFor, maskStore, KEEP, noQMaskOk } from './delivery.mjs';
import * as LOCK from './lock.mjs';
import { lineRolesOf, classifyEvents } from './events.mjs';
import * as K from './calibration.mjs';
import { COMPONENTS, CONFIG_START as X1_CONFIG_START, trainSeed, testSeed } from '../xfer1/config.mjs';
import { VOLATILE_EPISODE_FIELDS } from '../xfer1/brain.mjs';

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
  // G4.5b deep stack, shaped like the episode pipeline: main.js line 3 -> d0 -> Array.forEach -> callback -> d1 .. d15 -> the write
  const ddir = path.join(os.tmpdir(), 'mfw-credit1-stacktest', 'stk-deep-' + sha256('credit1-stack-deep').slice(0, 12));
  fs.mkdirSync(ddir, { recursive: true });
  const DEPTH = 15;
  fs.writeFileSync(path.join(ddir, 'pipeline.js'), ['export function d0(map) { [1].forEach(() => d1(map)); }',
    ...Array.from({ length: DEPTH }, (_, i) => `export function d${i + 1}(map) { ${i + 1 < DEPTH ? `d${i + 2}(map);` : "map.set('deep', 1);"} }`)].join('\n') + '\n');
  fs.writeFileSync(path.join(ddir, 'main.js'), "import { d0 } from './pipeline.js';\nexport function w(map) {\n  d0(map);\n}\n");
  const dmain = path.join(ddir, 'main.js');
  const dmod = await import(pathToFileURL(dmain).href);
  const deep = (capture) => { let stack = ''; const l = createLedger({ caller: () => { stack = capture(); return parseCaller(stack, dmain); } }); const mm = new Map(); l.wrapMap('Q', mm); dmod.w(mm);
    const fr = stack.split('\n').slice(1), iWrite = fr.findIndex(x => x.includes('pipeline.js')), iMain = fr.findIndex(x => x.includes('main.js'));
    return { line: l.events.length === 1 ? l.events[0].line : 'n/a', between: iWrite >= 0 && iMain > iWrite ? iMain - iWrite : null }; };
  const limit0 = Error.stackTraceLimit;
  const dg = deep(() => captureStack());
  check('G4.5b I-LEDGER attribution through a deep stack (at least 15 frames between main.js and the write, one through Array.forEach): attributed to main.js line 3 with the 64-frame capture',
    dg.line === 3 && dg.between >= 15 && STACK_CAPTURE_LIMIT === 64 && Error.stackTraceLimit === limit0, `line ${dg.line}, ${dg.between} frames between`);
  const withLimit = (n, f) => { const p = Error.stackTraceLimit; Error.stackTraceLimit = n; try { return f(); } finally { Error.stackTraceLimit = p; } };
  mutant('SM1 the default stack-trace limit (10) loses the main.js frame of a deep write', deep(() => withLimit(10, () => new Error().stack)).line !== 3);
  // G4.5c the previous limit is restored on the normal path and when stack formatting throws
  const restoredAfter = (capture) => { const p = Error.stackTraceLimit; Error.stackTraceLimit = 7; let ok;
    try { capture(); const normal = Error.stackTraceLimit === 7; const pst = Error.prepareStackTrace; let threw = false;
      Error.prepareStackTrace = () => { throw new Error('gate: formatting throws'); };
      try { capture(); } catch { threw = true; } finally { Error.prepareStackTrace = pst; }
      ok = normal && threw && Error.stackTraceLimit === 7; } finally { Error.stackTraceLimit = p; }
    return ok; };
  check('G4.5c captureStack restores the previous stack-trace limit, on the normal path and when stack formatting throws', restoredAfter(() => captureStack()) && Error.stackTraceLimit === limit0);
  mutant('SM2 a capture that leaves the raised limit in place is detected', !restoredAfter(() => { Error.stackTraceLimit = 64; return new Error().stack; }));
  mutant('SM3 a capture that restores only on the normal path is detected', !restoredAfter(() => { const p = Error.stackTraceLimit; Error.stackTraceLimit = 64; const s = new Error().stack; Error.stackTraceLimit = p; return s; }));
  // G4.5d the driver uses the capture; nothing in the runtime reads or sets the limit or a stack hook (the change is unobservable)
  const drv = fs.readFileSync(path.join(HERE, 'session.mjs'), 'utf8');
  const runtimeSrc = ['main.js', ...fs.readdirSync(path.join(ROOT, 'render')).filter(f => f.endsWith('.js')).map(f => `render/${f}`), ...fs.readdirSync(path.join(ROOT, 'experiments', 'm7')).filter(f => f.endsWith('.js')).map(f => `experiments/m7/${f}`)];
  const touching = runtimeSrc.filter(f => /stackTraceLimit|prepareStackTrace/.test(fs.readFileSync(path.join(ROOT, ...f.split('/')), 'utf8')));
  check('G4.5d the driver attributes writes through captureStack only; the runtime (main.js, render/, experiments/m7) never reads or sets the stack-trace limit or a stack hook',
    drv.includes('caller: () => parseCaller(captureStack(), TREE_MAIN)') && !/new Error\(\)\.stack/.test(drv) && touching.length === 0, touching.join(', '));
  check('G4.6 I-LEDGER map list: every exported keyed store is wrapped by the driver (Q, rewards, penalties, signals, curiosity, confidence, transitions nested, pathAttempts, pathSuccesses)',
    ['Q', 'rewards', 'penalties', 'signals', 'curiosity', 'confidence', 'transitions', 'pathAttempts', 'pathSuccesses'].every(n => fs.readFileSync(path.join(HERE, 'session.mjs'), 'utf8').includes(`'${n}'`)));
  // G4.7 pipeline writes are validated (no class bypasses key checking): the real ledger and evaluator on a synthetic pipeline that
  // writes, per consecutive pair of the processed episode, what _learnProcedural and _updateTrust write
  const PLINE = { PIPELINE_REPLAY: 7002, PIPELINE_BRIDGE: 7003 };
  const plClassOf = (l) => (l === PLINE.PIPELINE_REPLAY ? 'PIPELINE_REPLAY' : l === PLINE.PIPELINE_BRIDGE ? 'PIPELINE_BRIDGE' : null);
  const EPISODES = [   // exported-episode shape (render/episodeManager.js exportEpisodes)
    { id: 'e1', source: 'autonomous_success', transitions: [{ from: 14, to: 17 }, { from: 17, to: 19 }] },
    { id: 'e2', source: 'autonomous_success', transitions: [{ from: 3, to: 2 }, { from: 2, to: 1 }, { from: 1, to: 8 }] },
    { id: 'e3', source: 'replay', transitions: [{ from: 5, to: 6 }, { from: 6, to: 7 }] },
  ];
  const plRun = ({ cls = 'PIPELINE_REPLAY', pairs = [[3, 2], [2, 1], [1, 8]], goal = GOAL_NONE, evidence = true, extra = [], classOf = plClassOf } = {}) => {
    const call = 5, line = PLINE[cls];
    const S = { Q: new Map(), rewards: new Map(), transitions: new Map(), pathSuccesses: new Map(), confidence: new Map(), penalties: new Map() };
    const led = createLedger({ callIndex: () => call, caller: () => line });
    for (const [n, m] of Object.entries(S)) led.wrapMap(n, m, { nested: n === 'transitions' });
    const W = [];
    for (const [f, t] of pairs) W.push(['transitions', f, t], ['Q', `${f}#${goal}->${t}`], ['rewards', `${f}->${t}`]);
    for (const [f, t] of pairs) W.push(['pathSuccesses', `${f}->${t}`], ['confidence', `${f}->${t}`]);
    for (const w of [...W, ...extra]) {
      if (w[0] === 'transitions') { const m = S.transitions.get(w[1]) || new Map(); m.set(w[2], 1); S.transitions.set(w[1], m); }
      else if (w[0] === 'DELETE') S[w[1]].delete(w[2]);
      else S[w[0]].set(w[1], 1);
    }
    const ev = { PIPELINE_REPLAY: new Map(), PIPELINE_BRIDGE: new Map() };
    if (evidence) ev[cls].set(call, pipelineCandidates(EPISODES, cls));
    return evaluateLedger({ events: led.events, creditEvents: [], siteClassOf: classOf, arm: 'A', isEdge: graphEdge, pipelineEvidence: ev });
  };
  const okReplay = plRun(), okBridge = plRun({ cls: 'PIPELINE_BRIDGE', pairs: [[14, 17], [17, 19]], goal: 19 });
  check('G4.7 I-LEDGER validates pipeline writes: a legitimate replay (one stored episode, GOAL_NONE) and a legitimate bridge (terminal-node goal) pass with every write counted as a pipeline pair write',
    okReplay.verdict === 'PASS' && okReplay.keyClass.PIPE === 15 && okReplay.keyClass.OTHER === 0 && okBridge.verdict === 'PASS' && okBridge.keyClass.PIPE === 10,
    `replay ${okReplay.verdict} ${okReplay.keyClass.PIPE}, bridge ${okBridge.verdict} ${okBridge.keyClass.PIPE}${okReplay.failures[0] ? ' | ' + okReplay.failures[0].why : ''}`);
  const rc = pipelineCandidates(EPISODES, 'PIPELINE_REPLAY'), bc = pipelineCandidates(EPISODES, 'PIPELINE_BRIDGE');
  check('G4.7b pipeline candidates: replay sources exclude replay/imagination episodes and use GOAL_NONE; bridge episodes are autonomous_success with their terminal node as goal',
    rc.length === 2 && rc.every(c => c.goal === GOAL_NONE) && !rc.some(c => c.pairs.includes('5->6')) && bc.length === 2 && bc[0].goal === 19 && bc[1].goal === 8);
  const qsrc = fs.readFileSync(path.join(ROOT, 'render', 'qlearning.js'), 'utf8'), isrc = fs.readFileSync(path.join(HERE, 'instruments.mjs'), 'utf8');
  check('G4.7c the pipeline goal namespace is the runtime\'s: GOAL_NONE = 0 and makeStateKey maps a null goal to it (render/qlearning.js)',
    GOAL_NONE === 0 && qsrc.includes('export const GOAL_NONE = 0;') && qsrc.includes('const g = (goal != null) ? Number(goal) : GOAL_NONE;'));
  const drvSrc = fs.readFileSync(path.join(HERE, 'session.mjs'), 'utf8');
  check('G4.7d no class bypasses key checking: the evaluator validates pipeline classes, and the driver records replay evidence before replayOneEpisode and bridge evidence after the call and passes it to the evaluator',
    !/PIPELINE_REPLAY'\)\s*continue;/.test(isrc) && isrc.includes('const why = pipelineKeyProblem(w, cands);')
    && drvSrc.includes("replayBranch() { replayCalls.push(calls - 1); if (ledger) pipelineEvidence.PIPELINE_REPLAY.set(calls - 1, pipelineCandidates(epm.exportEpisodes(), 'PIPELINE_REPLAY')); }")
    && drvSrc.includes('step() { bridgeEvidence();') && drvSrc.includes('isEdge, pipelineEvidence })'));
  const plFails = (o) => plRun(o).verdict === 'FAIL';
  mutant('PL1 a legacy lag-2 key written by the replay pipeline fails I-LEDGER', plFails({ extra: [['Q', '3#0->1']] }));
  mutant('PL2 a malformed pipeline key fails I-LEDGER', plFails({ extra: [['rewards', '3->x']] }) && plFails({ extra: [['Q', '3->2']] }));
  mutant('PL3 a replay Q write outside the GOAL_NONE namespace fails I-LEDGER', plFails({ goal: 19 }));
  mutant('PL4 replay writes mixing two episodes in one call fail I-LEDGER', plFails({ pairs: [[3, 2], [14, 17]] }));
  mutant('PL5 a pipeline write without episode evidence fails I-LEDGER', plFails({ evidence: false }));
  mutant('PL6 a pipeline write to a store the pipeline never writes fails I-LEDGER', plFails({ extra: [['penalties', '3->2']] }));
  mutant('PL7 a pipeline delete fails I-LEDGER', plFails({ extra: [['DELETE', 'rewards', '3->2']] }));
  mutant('PL8 a replay write from an episode that is itself a replay copy fails I-LEDGER', plFails({ pairs: [[5, 6]] }));
  mutant('PL9 relabelled as a bridge write, a lag-2 key still fails I-LEDGER', plFails({ cls: 'PIPELINE_BRIDGE', pairs: [[14, 17], [17, 19]], goal: 19, extra: [['Q', '14#19->19']] }));
  mutant('PL10 a bridge Q write in the replay namespace fails I-LEDGER', plFails({ cls: 'PIPELINE_BRIDGE', pairs: [[14, 17], [17, 19]], goal: GOAL_NONE }));
  mutant('PL11 reclassified as DECAY, a new pipeline key fails I-LEDGER', plFails({ classOf: (l) => (l === PLINE.PIPELINE_REPLAY ? 'DECAY' : null) }));
  mutant('PL12 reclassified to no class, a pipeline write fails I-LEDGER', plFails({ classOf: () => null }));
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
  const iScope = src.indexOf('assertSessionScope({ world: IN.world, cell: IN.cell, procedure: IN.procedure });');
  check('G5.5 driver asserts the session lock before reading input, and the session scope after reading it but before loading any runtime module', iLock > 0 && iLock < iArgv && iArgv < iScope && iScope < iImp && /^import \{ assertSessionAuthorized, assertAPlusAuthorized, assertSessionScope, PROCEDURES \} from '\.\/lock\.mjs';$/m.test(src));
  // the session lock is null (the driver refuses) or exactly the calibration-only record; the A+ module lock is null
  const lockNull = LOCK.SESSION_AUTHORIZATION === null && (() => { try { LOCK.assertSessionAuthorized(); return false; } catch { return true; } })();
  const lockCal = LOCK.SESSION_AUTHORIZATION !== null && LOCK.calibrationRecordProblems(LOCK.SESSION_AUTHORIZATION).length === 0 && LOCK.scopeProblems(LOCK.SESSION_AUTHORIZATION, { world: 30, cell: 'T_L' }).length > 0;
  check('G5.6 session lock is null (refuses) or exactly the calibration-only record (development worlds 0-29, the 9 cells, A+ excluded); the A+ module lock is null', (lockNull || lockCal) && LOCK.A_PLUS_MODULE_AUTHORIZATION === null, lockNull ? 'session lock null' : lockCal ? 'calibration-only record' : 'OTHER');
  const swapNull = LOCK.SWAP_PARITY_AUTHORIZATION === null, swapRec = !swapNull && LOCK.swapParityRecordProblems(LOCK.SWAP_PARITY_AUTHORIZATION).length === 0 && LOCK.SWAP_PARITY_AUTHORIZATION.authorizedBy === 'owner';
  check('G5.6b the swap-parity lock is null (the own-path procedure is refused) or exactly the swap-parity record', swapNull || swapRec, swapNull ? 'swap-parity lock null' : swapRec ? 'swap-parity record' : 'OTHER');
  check('G5.7 driver emits the required instrument fields (I-CRED, I-LEDGER, episodes, redirects, self-target counts, event classes, procedure) and swap delivery only via pi', ['icred:', 'ledger:', 'episodes:', 'redirects:', 'selfCandidates:', 'eventClasses,', 'procedure: IN.procedure === undefined ? null : IN.procedure', "deliveryFor(CELL.name, IN.world)", 'brainWorld !== DELIVERY.brainWorld'].every(s => src.includes(s)));
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

// ================= G9: calibration harness (Stage H; runs no session) =================
{
  // G9.1 the plan
  const P = K.planCalibration();
  const counts = P.reduce((m, e) => ((m[e.step] = (m[e.step] || 0) + 1), m), {});
  const vp = K.validatePlan(P);
  check('G9.1 calibration plan: 364 sessions (D-0 8, D-1 80, D-2 40, cells 236) on development worlds 0-29 only, no A+ cell, every design cell once per world (swap cells on quartets 0-27), every store exported earlier',
    vp.length === 0 && P.length === 364 && counts['D-0'] === 8 && counts['D-1'] === 80 && counts['D-2'] === 40 && counts.CELLS === 236 && P.every(e => e.world >= 0 && e.world <= 29), vp.slice(0, 2).join(' | ') || JSON.stringify(counts));
  const mutPlan = (f) => { const Q = P.map(e => ({ ...e })); f(Q); return K.validatePlan(Q).length > 0; };
  const at = (Q, label) => Q.find(e => e.label === label);
  const renum = (Q) => Q.forEach((e, i) => { e.seq = i + 1; });
  mutant('PM1 a session on world 30 is rejected', mutPlan(Q => { at(Q, 'N0A-w29').world = 30; }));
  mutant('PM2 a session in confirmatory territory (world 2032) is rejected', mutPlan(Q => { at(Q, 'N0A-w29').world = 2032; }));
  mutant('PM3 an A+ module cell is rejected', mutPlan(Q => { at(Q, 'N0A-w29').cell = 'N0AP'; }));
  mutant('PM4 a swap cell outside the complete quartets is rejected', mutPlan(Q => { const e = at(Q, 'N1A_noQ-w28'); e.cell = 'N1AX'; e.brainFrom = 'T_A-w29'; }));
  mutant('PM5 an own-store cell given another world\'s store is rejected', mutPlan(Q => { at(Q, 'N1A-w5').brainFrom = 'T_A-w6'; }));
  mutant('PM6 a swap cell given its own world\'s store is rejected', mutPlan(Q => { at(Q, 'N1AX-w5').brainFrom = 'T_A-w5'; }));
  mutant('PM7 a D-2 test fed by a non-procedure store is rejected', mutPlan(Q => { at(Q, 'D2-N1L-w3').brainFrom = 'T_L-w3'; }));
  mutant('PM8 a missing design cell is rejected', mutPlan(Q => { Q.splice(Q.findIndex(e => e.label === 'N0A-w12'), 1); renum(Q); }));
  mutant('PM9 a test scheduled before its store is rejected', mutPlan(Q => { const i = Q.findIndex(e => e.label === 'T_A-w7'), j = Q.findIndex(e => e.label === 'N1A-w7'); [Q[i], Q[j]] = [Q[j], Q[i]]; renum(Q); }));
  mutant('PM10 a development procedure on an A cell is rejected', mutPlan(Q => { at(Q, 'N0A-w4').procedure = 'D2_ALIGNED_FALSE'; }));
  mutant('PM11 the map on without the map-on procedure is rejected', mutPlan(Q => { at(Q, 'N0L-w14').map = 'on'; }));

  // G9.2 plan-only mode: the exact list on the existing XFER-1 development configurations (no lock needed, no session)
  const planJson = path.join(os.tmpdir(), 'mfw-credit1-gate-plan.json');
  fs.rmSync(planJson, { force: true });
  const po = run(process.execPath, [path.join('experiments', 'credit1', 'calibrate.mjs'), '--plan-only', '--json', planJson]);
  let pj = null; try { pj = JSON.parse(fs.readFileSync(planJson, 'utf8')); } catch { pj = null; }
  const poOk = po.status === 0 && !!pj && pj.total === 364 && pj.planProblems.length === 0 && pj.goalMismatches.length === 0 && pj.sameWorldsAsLearn0 === true
    && JSON.stringify(pj.plan.map(e => e.label)) === JSON.stringify(P.map(e => e.label)) && new Set(pj.plan.map(e => e.configSeed)).size === 30
    && pj.plan.every(e => e.configIndex === e.world && e.configSeed >= X1_CONFIG_START && e.agentSeed === (e.role === 'train' ? trainSeed(e.world) : testSeed(e.world)));
  check('G9.2 plan-only mode (no lock, no session): 364 sessions on the 30 existing XFER-1 development configurations; goals equal LEARN-0\'s development evidence; D-5 pre-check holds', poOk, pj ? `${pj.total} sessions, ${new Set(pj.plan.map(e => e.configSeed)).size} configurations` : po.stderr.trim().slice(0, 120));

  // G9.3 run mode refuses before deriving, building or spawning anything
  const refusedDir = path.join(os.tmpdir(), 'mfw-credit1-gate-refusal');
  fs.rmSync(refusedDir, { recursive: true, force: true });
  const rr = run(process.execPath, [path.join('experiments', 'credit1', 'calibrate.mjs'), '--out', refusedDir]);
  check('G9.3 run mode refuses an unauthorized or out-of-scope run before anything is derived, built or spawned (null lock: the lock; calibration lock: an output directory outside data/)', rr.status === 2 && /calibration refused/.test(rr.stderr) && !fs.existsSync(refusedDir), rr.stderr.trim().slice(0, 140));
  const cs = fs.readFileSync(path.join(HERE, 'calibrate.mjs'), 'utf8');
  const ord = ['LOCK.assertSessionAuthorized()', 'calibrationRecordProblems(LOCK.SESSION_AUTHORIZATION)', 'the output directory must be inside', "'diff', '--quiet', 'HEAD'", "imp('experiments/m7/env.js')", 'spawn(process.execPath'].map(s => cs.indexOf(s));
  check('G9.3b runner order: session lock, calibration-only record, output directory under data/, clean working tree, then derivation; sessions only after C-0', ord.every(i => i > 0) && ord.every((v, i) => i === 0 || ord[i - 1] < v) && cs.indexOf("step: 'C-0'") < cs.indexOf("await runStep('D-0')"));

  // G9.4 lock scope (pure; a synthetic record shaped like the calibration-only scope)
  const REC = { ...JSON.parse(JSON.stringify(LOCK.CALIBRATION_SCOPE)), authorizedBy: 'gate-synthetic' };
  const inScope = (a, i) => LOCK.scopeProblems(a, i).length === 0;
  const scopeOk = !inScope(null, { world: 0, cell: 'T_L' }) && inScope(REC, { world: 0, cell: 'T_L' }) && inScope(REC, { world: 29, cell: 'N1LX' }) && inScope(REC, { world: 5, cell: 'N0L', procedure: 'MAP_ON_PARITY' })
    && inScope(REC, { world: 5, cell: 'T_L', procedure: 'D2_ALIGNED_FALSE' }) && inScope(REC, { world: 5, cell: 'N0L', procedure: 'D2_MAP_ON_PARITY' })
    && !inScope(REC, { world: 30, cell: 'T_L' }) && !inScope(REC, { world: 2032, cell: 'T_L' }) && !inScope(REC, { world: -1, cell: 'T_L' }) && !inScope(REC, { world: 0, cell: 'T_AP' }) && !inScope(REC, { world: 0, cell: 'N1AP' })
    && !inScope(REC, { world: 0, cell: 'N0A', procedure: 'D2_ALIGNED_FALSE' }) && !inScope(REC, { world: 0, cell: 'T_L', procedure: 'MAP_ON_PARITY' }) && !inScope(REC, { world: 0, cell: 'T_L', procedure: 'X' });
  const scopeConsts = JSON.stringify([...LOCK.CALIBRATION_SCOPE.cells].sort()) === JSON.stringify(C.CELLS.map(c => c.name).sort()) && LOCK.CALIBRATION_SCOPE.aPlus === false
    && LOCK.CALIBRATION_SCOPE.worlds.lo === C.CALIBRATION.worlds.lo && LOCK.CALIBRATION_SCOPE.worlds.hi === C.CALIBRATION.worlds.hi && LOCK.CONFIRMATORY_START === C.TERRITORY.confirmatoryStart;
  check('G9.4 lock scope: development worlds 0-29, the 9 cells, the development procedures on their L cells only; world 30, confirmatory territory, A+ cells, procedures elsewhere and unknown procedures are refused', scopeOk && scopeConsts);
  const recBad = (f) => { const r = JSON.parse(JSON.stringify(REC)); f(r); return LOCK.calibrationRecordProblems(r).length > 0 && LOCK.scopeProblems(r, { world: 0, cell: 'T_L' }).length > 0; };
  mutant('LM1 a record admitting world 30 is rejected', recBad(r => { r.worlds.hi = 30; }));
  mutant('LM2 a record admitting an A+ cell is rejected', recBad(r => { r.cells.push('T_AP'); }));
  mutant('LM3 a record with A+ enabled is rejected', recBad(r => { r.aPlus = true; }));
  mutant('LM4 a record with an extra procedure is rejected', recBad(r => { r.procedures.push('ALIGNED_TRUE_ON_L'); }));

  // G9.5 the driver's calibration additions (static)
  const s1 = fs.readFileSync(path.join(HERE, 'session.mjs'), 'utf8'), s0 = fs.readFileSync(path.join(ROOT, 'experiments', 'learn0', 'session.mjs'), 'utf8');
  const procOk = s1.includes('if (PROC && PROC.alignedFalse) globalThis.__CREDIT1__ = { aligned: false };') && s1.includes("const MAP = PROC && PROC.mapOn ? 'on' : CELL.map;") && s1.split('\n').filter(l => !/^\s*\/\//.test(l) && /__CREDIT1__ = \{ aligned: false \}/.test(l)).length === 1;   // one code line (comments aside)
  const FIELDS = ['outcome:', 'counters:', 'reaches:', 'endpoints:', 'deliveredSizes:', 'goalKeyedQ:', 'localStorageReads:', 'conditionIntegrity, mapAudit, guard', 'moveClass, moves', 'audit:', 'diagnostics:', 'drawsLogged:', 'traversal,', 'loopsExecuted:', 'writesSha256:', 'qSum:', 'arrivals: diag.arrivals'];
  const miss = [...FIELDS.filter(f => !s0.includes(f)).map(f => `LEARN-0 ${f}`), ...FIELDS.filter(f => !s1.includes(f)).map(f => `CREDIT-1 ${f}`)];
  check('G9.5 driver: aligned:false only through the D-2 procedure, the map on only through the map-on procedures; the parent\'s D-1 fields recorded under the same names; event classes recorded', procOk && miss.length === 0, miss.join(', '));

  // G9.6 event-class line roles
  const prodRoles = lineRolesOf(prodText), baseRoles = lineRolesOf(baseText);
  const expectProd = { PREDERR: [4144, 4341], FALLBACK: [4342, 4456], DAMPQ: [4219, 4223], CUR_SIGNAL: [4319, 4328] };
  const inBlock = (r) => !!r && Object.values(r).every(([a, b]) => a > TC.block.openIdx + 1 && b < TC.block.closeIdx + 1);
  const treeRolesOk = ['A', 'A+'].every(arm => { const t = built.trees[arm].transform.text, rr2 = lineRolesOf(t), M = mapOf(t, arm);
    return rr2.problems.length === 0 && Object.entries(rr2.roles).every(([k, [a, b]]) => M[baseRoles.roles[k][0] - 1] === a - 1 && M[baseRoles.roles[k][1] - 1] === b - 1); });
  check('G9.6 event-class line roles: production 4144-4341 / 4342-4456 / 4219-4223 / 4319-4328; inside the credit block of the LEARN-0 tree; the same base lines on trees A and A+',
    prodRoles.problems.length === 0 && JSON.stringify(prodRoles.roles) === JSON.stringify(expectProd) && baseRoles.problems.length === 0 && inBlock(baseRoles.roles) && treeRolesOk, JSON.stringify(prodRoles.roles));
  const BL = baseText.split('\n');
  const rolesBroken = (f) => { const M2 = BL.slice(); f(M2); return lineRolesOf(M2.join('\n')).problems.length > 0; };
  mutant('LR1 a second dampQ anchor is detected', rolesBroken(M2 => { M2.splice(M2.indexOf('        dampQ('), 0, '        dampQ('); }));
  mutant('LR2 a missing fallback else is detected', rolesBroken(M2 => { const i = M2.indexOf('if (predError) {'); M2[M2.findIndex((l, k) => k > i && l === '} else {')] = '} else{'; }));
  mutant('LR3 the curiosity-signal write outside the prediction-error branch is detected', rolesBroken(M2 => { const c = M2.indexOf('    if (predError.curiositySignal > 0) {'); const [line] = M2.splice(c, 1); const i = M2.indexOf('if (predError) {'); M2.splice(M2.findIndex((l, k) => k > i && l === '} else {') + 1, 0, line); }));

  // G9.7 the classifier on a hand-built trace on the real graph (expected counts written by hand)
  const ROLES = { PREDERR: [100, 199], FALLBACK: [200, 299], DAMPQ: [120, 125], CUR_SIGNAL: [150, 155] };
  const ev = (call, last, cur, x) => ({ call, on: false, o: String(last), x: String(x), last: String(last), cur: String(cur), n: String(cur), goal: '19' });
  const ar = (call, a, to, fresh = true) => ({ call, a, to, fresh, rFrom: a });
  const trace = () => ({
    creditEvents: [ev(1, 4, 9, 10), ev(3, 13, 14, 16), ev(4, 10, 11, 11), ev(5, 1, 2, 9), ev(6, 8, 17, 19), ev(7, 3, 3, 2), ev(8, 5, 5, 6), ev(9, 5, 8, 7), ev(10, 4, 9, 8), ev(11, 12, 15, 16)],
    arrivals: [ar(0, 4, 9), ar(1, 9, 10), ar(2, 10, 9), ar(3, 14, 16, false), ar(4, 11, 11), ar(5, 2, 9), ar(6, 17, 19), ar(7, 3, 2), ar(8, 5, 6), ar(9, 8, 7), ar(10, 9, 8), ar(11, 15, 16), ar(12, 16, 7)],
    resets: [{ call: 6, from: 17, to: 19, goal: 19 }],
    ledgerEvents: [{ call: 1, map: 'Q', line: 50 }, { call: 9, map: 'Q', line: 210 }, { call: 10, map: 'Q', line: 122 }, { call: 10, map: 'Q', line: 151 }, { call: 11, map: 'curiosity', line: 152 }],
    roles: ROLES, isEdge: graphEdge });
  const want = { ordinary_legal_move: 4, goal_entry_reset: 1, first_move_after_reset: 1, hold: 1, reversal_guard_skip: 1, first_call_guard_skip: 1, self_target: 1, carried_decision: 1,
    nongraph_execution: 2, fallback_branch: 1, dampq_firing: 1, curiosity_signal_write: 1, aplus_filter_pass: 7, aplus_filter_fail: 3 };
  const got = classifyEvents(trace());
  check('G9.7 event classifier on a hand-built 13-call trace (real graph): hand-written counts for all 14 classes, guard skips, informative and edge-filter counts',
    JSON.stringify(got.counts) === JSON.stringify(Object.fromEntries(C.EVENT_CLASSES.map(c => [c, want[c]]))) && got.creditEvents === 10 && got.informative === 8 && got.legacyEdge === 2 && got.alignedEdge === 5
    && JSON.stringify(got.guardSkips) === '{"firstCall":1,"reversal":1,"other":1}', JSON.stringify(got.counts));
  const noLed = classifyEvents({ ...trace(), ledgerEvents: null });
  check('G9.7b with the ledger off the ledger-based classes are null, never a silent zero', noLed.counts.fallback_branch === null && noLed.counts.dampq_firing === null && noLed.counts.curiosity_signal_write === null && noLed.counts.hold === 1);
  mutant('EM1 a dropped goal reset changes the counts (no goal entry, no first move after reset, one more hold)', (() => { const g = classifyEvents({ ...trace(), resets: [] }).counts; return g.goal_entry_reset === 0 && g.first_move_after_reset === 0 && g.hold === 2; })());
  mutant('EM2 a curiosity-signal range shifted away loses the curiosity write', classifyEvents({ ...trace(), roles: { ...ROLES, CUR_SIGNAL: [160, 165] } }).counts.curiosity_signal_write === 0);
  mutant('EM3 a fallback write attributed outside the fallback range is not counted', classifyEvents({ ...trace(), ledgerEvents: trace().ledgerEvents.map(w => (w.line === 210 ? { ...w, line: 310 } : w)) }).counts.fallback_branch === 0);

  // G9.8 D-1 comparator across the two drivers' schemas
  const baseRec = () => ({ role: 'test', map: 'off', input: { world: 3, configSeed: 200500, configIndex: 3, goal: 16, agentSeed: 7, ticks: 1500 },
    outcome: { crashed: false, completed: true, ticksExecuted: 1500, loopsExecuted: 1500, error: null }, counters: { calls: 1500, envDraws: 0, attempts: 0, successes: 0, slips: 0 },
    reaches: { goal: 3, legal: 2, nonEdge: 1, legalHalves: [1, 1], goalCalls: [10, 20, 30], legalCalls: [10, 30] }, endpoints: { goalReaches: 3, legalReaches: 2, attemptSuccess: null },
    brain: { deliveredHash: 'none', deliveredHashes: null, deliveredSizes: null, start: { brainHash: 'b0' }, endHash: 'e1', endHashes: { Q: 'q1', rewards: 'r1' }, endSizes: { Q: 5 }, localStorageReads: ['x'], goalKeyedQ: 4 },
    conditionIntegrity: { ok: true, envDraws: 0, traversal: { attempts: 0 } }, mapAudit: { ok: true, executed: { a: 0 }, blocked: { a: 9 } }, guard: { counters: { admitted: 1 } },
    moveClass: { legal: 10, nonGraph: 1, self: 0, none: 2 }, moves: { far: 5, farDownhill: 2 }, diag: { arrivals: 1499, channels: { x: 1 } }, audit: { goalReaches: 3 }, diagnostics: { writes: 9 },
    artifacts: { fingerprint: 'fp', writesSha256: 'ws', qSum: 1.5 } });
  const l0 = { ...baseRec(), schema: 'learn0/1.session', label: 'L0-N0-w3', tree: { name: 'learn0' }, input: { ...baseRec().input, arm: 'COLD', keep: null, brainFile: null } };
  const c1r = { ...baseRec(), schema: 'credit1/1.session', label: 'N0L-w3', cell: 'N0L', credit: 'L', procedure: null, tree: { name: 'A' }, credit1: { icred: {} }, input: { ...baseRec().input, delivery: { source: 'none' } } };
  check('G9.8 D-1 comparator: records of the two drivers with equal compared fields match (labels, trees and schema-specific fields are not compared)', K.compareParity(l0, c1r).length === 0, K.compareParity(l0, c1r).join(', '));
  const setPath = (o, p, v) => { const ks = p.split('.'); const last = ks.pop(); ks.reduce((x, k) => x[k], o)[last] = v; };
  for (const [p, v] of [['artifacts.fingerprint', 'fp2'], ['artifacts.writesSha256', 'ws2'], ['brain.endHash', 'e2'], ['brain.endHashes.Q', 'q2'], ['brain.start.brainHash', 'b1'], ['reaches.goalCalls.0', 11],
    ['moves.farDownhill', 3], ['moveClass.legal', 11], ['guard.counters.admitted', 2], ['mapAudit.blocked.a', 8], ['conditionIntegrity.ok', false], ['counters.calls', 1499]]) {
    const m = JSON.parse(JSON.stringify(c1r)); setPath(m, p, v); mutant(`PC a differing ${p} fails D-1`, K.compareParity(l0, m).length > 0);
  }
  { const m = JSON.parse(JSON.stringify(c1r)); delete m.moves; mutant('PC a compared field missing from one record fails D-1', K.compareParity(l0, m).length > 0); }

  // G9.9 D-0 and G9.10 D-2 comparators
  const d0recs = {};
  for (const [a, b] of K.d0Pairs()) for (const lab of [a, b]) d0recs[lab] = { ...JSON.parse(JSON.stringify(l0)), label: lab, input: { ...l0.input, brainFile: `${lab}.json` } };
  const [ta, tb] = K.d0Pairs()[0];
  // store-shaped exports; the second run differs only in the wall-clock episode fields (as the runtime stamps them)
  const store = (ts) => ({ transitions: { 1: { 2: 3 } }, rewards: { '1->2': 1.5 }, penalties: {}, signals: { '1->2': 2 }, curiosity: { '1->2': 0.15 }, Q: { '1#19->2': 0.7 }, confidence: { '1->2': 5 },
    episodes: [{ id: `autonomous_success_${ts}_ab12c`, source: 'autonomous_success', nodes: [14, 17, 19], timestamp: ts }, { id: `autonomous_success_${ts + 9}_x9y8z`, source: 'autonomous_success', nodes: [3, 2, 1], timestamp: ts + 9 }],
    homeNeuronId: null, goalNeuronId: null });
  const exA = JSON.stringify(store(1792954767010)), exOk = { [ta]: exA, [tb]: JSON.stringify(store(1792954766990)) };
  check('G9.9 D-0 comparator: identical records (label and store file name aside), and exports equal under the XFER-1 hash view that differ only in the volatile episode fields (id, timestamp), pass',
    exOk[ta] !== exOk[tb] && K.exportProblems(exOk[ta], exOk[tb]).length === 0 && K.d0(d0recs, exOk).pass);
  check('G9.9b the volatile episode fields are exactly the XFER-1 convention (id, timestamp)', JSON.stringify(VOLATILE_EPISODE_FIELDS) === '["id","timestamp"]');
  { const m = JSON.parse(JSON.stringify(d0recs)); m[K.d0Pairs()[2][1]].brain.endHash = 'x'; mutant('D0M1 one differing record value fails D-0', !K.d0(m, exOk).pass); }
  const exMut = (f) => { const s = store(1792954766990); f(s); return { [ta]: exA, [tb]: JSON.stringify(s) }; };
  mutant('D0M2 an export differing in a non-volatile episode field fails D-0', !K.d0(d0recs, exMut(s => { s.episodes[1].nodes = [3, 2, 4]; })).pass);
  mutant('D0M3 an export differing in a store component fails D-0', !K.d0(d0recs, exMut(s => { s.Q['1#19->2'] = 0.71; })).pass);
  mutant('D0M4 an export with an extra episode fails D-0', !K.d0(d0recs, exMut(s => { s.episodes.push({ id: 'x', source: 'autonomous_success', nodes: [5], timestamp: 1 }); })).pass);
  mutant('D0M5 an export with a new field inside an episode fails D-0', !K.d0(d0recs, exMut(s => { s.episodes[0].extra = 1; })).pass);
  mutant('D0M6 a non-canonical export (formatting outside the parsed fields) fails D-0', !K.d0(d0recs, { [ta]: exA, [tb]: JSON.stringify(store(1792954766990), null, 1) }).pass);
  mutant('D0M7 a missing export fails D-0', !K.d0(d0recs, { [ta]: exA }).pass);
  const d2recs = {};
  for (const [a, b] of K.d2Pairs()) {
    d2recs[a] = { ...JSON.parse(JSON.stringify(c1r)), label: a, input: { ...c1r.input, delivery: { source: 'own', brainFile: a } }, credit1: { ledger: { verdict: 'LEGACY_PATTERN' }, eventClasses: { counts: { hold: 1 } } } };
    d2recs[b] = { ...JSON.parse(JSON.stringify(d2recs[a])), label: b, procedure: 'D2_ALIGNED_FALSE', input: { ...d2recs[a].input, delivery: { source: 'own', brainFile: b } } };
  }
  check('G9.10 D-2 comparator: records equal except label, procedure and store file name pass', K.d2(d2recs).pass);
  { const m = JSON.parse(JSON.stringify(d2recs)); m[K.d2Pairs()[5][1]].credit1.ledger.verdict = 'FAIL'; mutant('D2M1 a differing instrument verdict fails D-2', !K.d2(m).pass); }
  { const m = JSON.parse(JSON.stringify(d2recs)); m[K.d2Pairs()[9][1]].credit1.eventClasses.counts.hold = 2; mutant('D2M2 a differing event count fails D-2', !K.d2(m).pass); }

  // G9.11 D-1c coverage
  const fullCounts = Object.fromEntries(C.EVENT_CLASSES.map(c => [c, c.startsWith('aplus_') ? 0 : 1]));
  const covSet = (f) => { const R = {}; for (const [, lab] of K.d1Pairs()) R[lab] = { label: lab, role: lab.startsWith('T_L') ? 'train' : 'test', map: lab.startsWith('MAPON') ? 'on' : 'off',
    input: { delivery: { source: lab.startsWith('N1L') ? 'own' : 'none' } }, credit1: { eventClasses: { counts: { ...fullCounts } } } }; if (f) f(R); return R; };
  check('G9.11 D-1c coverage: every non-A+ event class, map on and off, stored and cold, training and test (A+ classes excluded while the module is unauthorized)', K.d1c(covSet()).pass);
  mutant('CV1 an event class never observed fails D-1c', !K.d1c(covSet(R => { for (const r of Object.values(R)) r.credit1.eventClasses.counts.dampq_firing = 0; })).pass);
  mutant('CV2 no map-on session fails D-1c', !K.d1c(covSet(R => { for (const r of Object.values(R)) r.map = 'off'; })).pass);
  mutant('CV3 a class unknown in one session (ledger off) fails D-1c, never a silent zero', !K.d1c(covSet(R => { Object.values(R)[0].credit1.eventClasses.counts.fallback_branch = null; })).pass);

  // G9.12 D-3, D-4, D-5
  const instRec = (label, credit, role, ic, lg) => ({ schema: 'credit1/1.session', label, credit, role, procedure: null, input: { world: 0, goal: 8 }, credit1: { icred: { verdict: ic }, ledger: { verdict: lg }, redirects: { survival: 0, recovery: 0 } } });
  const instSet = (f) => { const R = { a: instRec('T_A-w0', 'A', 'train', 'PASS', 'PASS'), b: instRec('N1A-w0', 'A', 'test', 'PASS', 'PASS'), c: instRec('T_L-w0', 'L', 'train', 'DISCRIMINATING', 'LEGACY_PATTERN'),
    d: instRec('N0L-w0', 'L', 'test', 'NOT_DISCRIMINATING', 'NOT_DISCRIMINATING') }; if (f) f(R); return R; };
  check('G9.12 D-3 and D-4 rules: A cells PASS/PASS, L training DISCRIMINATING/LEGACY_PATTERN, no FAIL anywhere, goal-redirect counters 0', K.d3(instSet()).pass && K.d4(instSet()).pass);
  mutant('IM1 an A cell with I-CRED FAIL fails D-3', !K.d3(instSet(R => { R.b.credit1.icred.verdict = 'FAIL'; })).pass);
  mutant('IM2 an L training session that is not discriminating fails D-3', !K.d3(instSet(R => { R.c.credit1.icred.verdict = 'NOT_DISCRIMINATING'; })).pass);
  mutant('IM3 an L test session with I-LEDGER FAIL fails D-3', !K.d3(instSet(R => { R.d.credit1.ledger.verdict = 'FAIL'; })).pass);
  mutant('IM4 a recovery redirect fails D-4', !K.d4(instSet(R => { R.d.credit1.redirects.recovery = 1; })).pass);
  const goalSet = (bad) => Object.fromEntries(Array.from({ length: 30 }, (_, w) => [`x${w}`, { input: { world: w, goal: bad === w ? 99 : C.GOALS[w % 4] } }]));
  check('G9.12b D-5: every development world\'s recorded goal equals GOALS[w mod 4]', K.d5(goalSet(-1)).pass);
  mutant('IM5 one world with another goal fails D-5', !K.d5(goalSet(13)).pass);

  // G9.13 C-1 and G9.14 C-2
  const c1recs = {}, sw = (w) => (w % 2 ? 10 : -10);
  for (let w = 0; w <= 27; w++) { c1recs[`N0A-w${w}`] = { reaches: { legal: 100 } }; c1recs[`N1A-w${w}`] = { reaches: { legal: 100 + sw(w) } }; c1recs[`N0L-w${w}`] = { reaches: { legal: 100 } }; c1recs[`N1L-w${w}`] = { reaches: { legal: 100 - sw(w) } }; }
  const r1 = K.c1(c1recs), s1e = Math.sqrt(28 * 100 / 27), s2e = 2 * s1e;
  check('G9.13 C-1: SDs of P1 and of P2 (difference in differences estimated directly: here 2 x SD(P1), not sqrt2 x) over the 28 quartet worlds; n = config.nFor of the larger',
    r1.pass && Math.abs(r1.P1.sd - s1e) < 1e-9 && Math.abs(r1.P2.sd - s2e) < 1e-9 && r1.n === Math.max(C.nFor(s1e), C.nFor(s2e)) && r1.worlds === 28, JSON.stringify({ P1: r1.P1, P2: r1.P2, n: r1.n }));
  { const m = { ...c1recs }; delete m['N0L-w17']; mutant('C1M1 a missing world fails C-1 (no silent drop)', !K.c1(m).pass); }
  const rateRec = (credit, evn, carried, fb, inf, le, self, procedure = null) => ({ schema: 'credit1/1.session', credit, procedure,
    credit1: { eventClasses: { creditEvents: evn, counts: { fallback_branch: fb }, informative: inf, legacyEdge: le }, icred: { carried, events: evn }, selfCandidates: { all: { evaluations: 10, self } } } });
  const r2 = K.c2({ a: rateRec('L', 100, 10, 5, 80, 6, 1), b: rateRec('L', 300, 30, 15, 120, 4, 3), c: rateRec('A', 50, 5, 1, 40, 2, 0), d: rateRec('L', 999, 999, 999, 999, 999, 9, 'D2_ALIGNED_FALSE') }, { sessionsPerMinute: 12 });
  check('G9.14 C-2: descriptive rates pooled over the design cells (procedure sessions excluded): carried, fallback, edge-filtered firing under L, self-target, throughput',
    r2.pass && Math.abs(r2.rates.L.carriedShare - 0.1) < 1e-12 && Math.abs(r2.rates.L.fallbackShare - 0.05) < 1e-12 && Math.abs(r2.rates.edgeFilterFiringUnderL - 0.05) < 1e-12 && r2.rates.L.selfTarget.all.rate === 0.2 && r2.rates.sessionsPerMinute === 12,
    JSON.stringify(r2.rates.L).slice(0, 160));

  // G9.15 the data directory and G9.16 the README
  const gi = path.join(HERE, 'data', '.gitignore');
  check('G9.15 experiments/credit1/data/ is git-ignored (only its .gitignore is tracked)', fs.existsSync(gi) && fs.readFileSync(gi, 'utf8').split('\n').filter(Boolean).join('|') === '*|!.gitignore'
    && git('check-ignore', '-q', 'experiments/credit1/data/run/sessions/x.json').status === 0 && git('check-ignore', '-q', 'experiments/credit1/data/.gitignore').status !== 0);
  const rd = fs.readFileSync(path.join(HERE, 'README.md'), 'utf8');
  check('G9.16 README documents the harness, the plan-only command and the two interpretation limits (N1L× has no LEARN-0 counterpart; map-on coverage through a development procedure)',
    ['calibrate.mjs --plan-only', 'calibration.mjs', 'events.mjs', 'N1L×', 'MAP_ON_PARITY', 'D2_ALIGNED_FALSE', '364'].every(s => rd.includes(s)));
}

// ================= G10: swap-parity harness (development only; Gemini round 3; runs no session) =================
{
  // G10.1 the plan
  const SPL = K.planSwapParity(), vsp = K.validateSwapPlan(SPL);
  const srcWorlds = [...new Set(SPL.filter(e => e.role === 'train').map(e => e.world))].sort((a, b) => a - b);
  const wantSrc = [...new Set(Array.from({ length: 10 }, (_, w) => pi(w)))].sort((a, b) => a - b);
  check('G10.1 swap-parity plan: 60 sessions (20 training on the pi sources of worlds 0-9, 20 swapped N1AX/N1LX, 20 own-path N1A/N1L copies), worlds 0-10 only, no A+ cell, every pair complete',
    vsp.length === 0 && SPL.length === 60 && JSON.stringify(srcWorlds) === JSON.stringify(wantSrc) && SPL.every(e => e.world >= 0 && e.world <= 10) && !SPL.some(e => /AP$/.test(e.cell)) && K.swapPairs().length === 20,
    vsp.slice(0, 2).join(' | ') || `sources ${srcWorlds.join(',')}`);
  const mutSwap = (f) => { const Q = SPL.map(e => ({ ...e })); f(Q); return K.validateSwapPlan(Q).length > 0; };
  const sat = (Q, l) => Q.find(e => e.label === l);
  const renumber = (Q) => Q.forEach((e, i) => { e.seq = i + 1; });
  mutant('SP1 a swap-parity session on world 11 is rejected', mutSwap(Q => { sat(Q, 'N1A-OWN-w9').world = 11; }));
  mutant('SP2 a swap-parity session in confirmatory territory is rejected', mutSwap(Q => { sat(Q, 'N1A-OWN-w9').world = 2032; }));
  mutant('SP3 an own-path copy of the own world\'s export instead of pi(w)\'s is rejected', mutSwap(Q => { sat(Q, 'N1A-OWN-w3').brainFrom = 'T_A-w3'; }));
  mutant('SP4 the own-path procedure on a swapped cell is rejected', mutSwap(Q => { const e = sat(Q, 'N1AX-w3'); e.procedure = 'SWAP_PARITY_OWNPATH'; e.copyAs = 'COPY-x'; e.storeSourceWorld = 0; }));
  mutant('SP5 a swapped cell given its own world\'s store is rejected', mutSwap(Q => { sat(Q, 'N1AX-w4').brainFrom = 'T_A-w4'; }));
  mutant('SP6 a wrong declared source world is rejected', mutSwap(Q => { sat(Q, 'N1L-OWN-w5').storeSourceWorld = 5; }));
  mutant('SP7 a pair missing its own-path partner is rejected', mutSwap(Q => { Q.splice(Q.findIndex(e => e.label === 'N1L-OWN-w5'), 1); renumber(Q); }));
  mutant('SP8 an A+ cell is rejected', mutSwap(Q => { sat(Q, 'N1AX-w2').cell = 'N1AP'; }));
  mutant('SP9 an own-path session without its own byte copy is rejected', mutSwap(Q => { sat(Q, 'N1A-OWN-w6').copyAs = null; }));
  mutant('SP10 two own-path sessions sharing one copy are rejected', mutSwap(Q => { sat(Q, 'N1A-OWN-w6').copyAs = sat(Q, 'N1A-OWN-w7').copyAs; }));
  mutant('SP11 a test scheduled before its source export is rejected', mutSwap(Q => { const i = Q.findIndex(e => e.label === 'T_A-w1'), j = Q.findIndex(e => e.label === 'N1A-OWN-w0'); [Q[i], Q[j]] = [Q[j], Q[i]]; renumber(Q); }));

  // G10.2 lock scope: the own-path procedure only under the swap-parity record, only on N1A / N1L, worlds 0-10
  const SREC = { ...JSON.parse(JSON.stringify(LOCK.SWAP_PARITY_SCOPE)), authorizedBy: 'gate-synthetic' };
  const swapIn = (a, i) => LOCK.swapScopeProblems(a, i).length === 0;
  const own = (world, cell) => ({ world, cell, procedure: 'SWAP_PARITY_OWNPATH' });
  const realAllows = (i) => { try { LOCK.assertSessionScope(i); return true; } catch { return false; } };
  const realOk = LOCK.SWAP_PARITY_AUTHORIZATION === null ? !realAllows(own(3, 'N1A')) : (realAllows(own(3, 'N1A')) && !realAllows(own(11, 'N1A')));
  check('G10.2 the own-path procedure runs only under the swap-parity record (refused while it is null, never under the calibration record), only on N1A / N1L, worlds 0-10; the calibration scope is unchanged',
    realOk && LOCK.scopeProblems(LOCK.CALIBRATION_SCOPE, own(3, 'N1A')).length > 0 && swapIn(SREC, own(0, 'N1A')) && swapIn(SREC, own(10, 'N1L')) && !swapIn(null, own(3, 'N1A'))
    && !swapIn(SREC, own(11, 'N1A')) && !swapIn(SREC, own(2032, 'N1A')) && !swapIn(SREC, own(3, 'N0A')) && !swapIn(SREC, own(3, 'N1AX')) && !swapIn(SREC, own(3, 'T_A'))
    && !swapIn(SREC, { world: 3, cell: 'N1A', procedure: 'MAP_ON_PARITY' }) && JSON.stringify(LOCK.CALIBRATION_SCOPE.procedures) === '["D2_ALIGNED_FALSE","MAP_ON_PARITY","D2_MAP_ON_PARITY"]',
    LOCK.SWAP_PARITY_AUTHORIZATION === null ? 'swap-parity lock null' : 'swap-parity record');
  const swapRecBad = (f) => { const r = JSON.parse(JSON.stringify(SREC)); f(r); return LOCK.swapParityRecordProblems(r).length > 0 && !swapIn(r, own(3, 'N1A')); };
  mutant('LS1 a swap-parity record admitting world 11 is rejected', swapRecBad(r => { r.worlds.hi = 11; }));
  mutant('LS2 a swap-parity record admitting N0A is rejected', swapRecBad(r => { r.cells.push('N0A'); }));
  mutant('LS3 a swap-parity record with an extra procedure is rejected', swapRecBad(r => { r.procedures.push('D2_ALIGNED_FALSE'); }));
  mutant('LS4 a swap-parity record with A+ enabled is rejected', swapRecBad(r => { r.aPlus = true; }));

  // G10.3 the driver
  const dsrc = fs.readFileSync(path.join(HERE, 'session.mjs'), 'utf8');
  check('G10.3 driver: storeSourceWorld only with the own-path procedure and equal to pi(w); the copy is declared through the own-store path; the true source is recorded',
    dsrc.includes("'procedure', 'storeSourceWorld'];") && dsrc.includes("if (PROC && PROC.ownPathCopy) { if (DELIVERY.source !== 'own' || IN.storeSourceWorld !== pi(IN.world)) refuse(")
    && dsrc.includes("else if (IN.storeSourceWorld !== undefined) refuse('storeSourceWorld belongs to the swap-parity procedure only');") && dsrc.includes('storeSourceWorld: IN.storeSourceWorld === undefined ? null : IN.storeSourceWorld'));

  // G10.4 the verdict on synthetic records (world 3; pi(3) = 0)
  const SRC = 'T_A-w0', COPY = 'COPY-T_A-w0-for-w3';
  const recOf = (label, cell, credit, procedure, delivery, ic, lg) => ({ schema: 'credit1/1.session', label, cell, credit, procedure, role: 'test', map: 'off',
    input: { world: 3, configSeed: 200247, configIndex: 3, goal: 19, agentSeed: 1100100007, ticks: 1500, delivery: { training: credit === 'A' ? 'T_A' : 'T_L', mask: 'FULL', ...delivery } },
    tree: { name: 'A', arm: 'A', mainSha256: 'm', manifestSha256: 'mf' },
    outcome: { crashed: false, completed: true, ticksExecuted: 1500, loopsExecuted: 1500, error: null }, counters: { calls: 1500, envDraws: 0, attempts: 0, successes: 0, slips: 0 },
    reaches: { goal: 9, legal: 7, nonEdge: 2, legalHalves: [3, 4], goalCalls: [5, 9], legalCalls: [5] }, endpoints: { goalReaches: 9, legalReaches: 7, attemptSuccess: null },
    brain: { deliveredHash: 'dh0', deliveredHashes: { Q: 'q' }, deliveredSizes: { Q: 3 }, start: { brainHash: 's' }, endHash: 'e', endHashes: { Q: 'qe' }, endSizes: { Q: 4 }, localStorageReads: ['brain: served'], goalKeyedQ: 2 },
    conditionIntegrity: { ok: true }, mapAudit: { ok: true }, guard: { counters: {} }, moveClass: { legal: 1 }, moves: { far: 1 }, diag: { channels: {} }, audit: { goalReaches: 9 }, diagnostics: { writes: 3 },
    credit1: { telemetry: { creditEvents: 10 }, icred: { verdict: ic, identityRate: 1 }, ledger: { verdict: lg, keyClass: { PIPE: 12 }, pipelineEvidence: { replayCalls: 3, bridgeCalls: 0 } },
      eventClasses: { counts: { hold: 2 } }, episodes: { count: 4 }, redirects: { survival: 0, recovery: 0 }, selfCandidates: { all: { evaluations: 9, self: 0 } } },
    artifacts: { fingerprint: 'fp', writesSha256: 'ws' } });
  const pairRecs = (credit = 'A', ic = 'PASS', lg = 'PASS') => { const [X, O, src, cp] = credit === 'A' ? ['N1AX', 'N1A', SRC, COPY] : ['N1LX', 'N1L', 'T_L-w0', 'COPY-T_L-w0-for-w3'];
    return { [`${X}-w3`]: recOf(`${X}-w3`, X, credit, null, { source: 'paired', brainWorld: 0, storeSourceWorld: null, brainFile: `${src}.json` }, ic, lg),
      [`${O}-OWN-w3`]: recOf(`${O}-OWN-w3`, O, credit, 'SWAP_PARITY_OWNPATH', { source: 'own', brainWorld: 3, storeSourceWorld: 0, brainFile: `${cp}.json` }, ic, lg) }; };
  const EV = () => ({ fileSha: { [SRC]: 'f1', [COPY]: 'f1', 'T_L-w0': 'g1', 'COPY-T_L-w0-for-w3': 'g1' }, expectedDeliveredHash: { [SRC]: 'dh0', 'T_L-w0': 'dh0' } });
  const PAIR_A = [['N1AX-w3', 'N1A-OWN-w3', SRC, COPY, 'A']], PAIR_L = [['N1LX-w3', 'N1L-OWN-w3', 'T_L-w0', 'COPY-T_L-w0-for-w3', 'L']];
  const swapV = (fr, fe) => { const R = pairRecs(), E = EV(); if (fr) fr(R); if (fe) fe(E); return K.swapParity(R, E, { pairs: PAIR_A }); };
  const vA = swapV(), vL = K.swapParity(pairRecs('L', 'DISCRIMINATING', 'LEGACY_PATTERN'), EV(), { pairs: PAIR_L });
  check('G10.4 swap-parity verdict: a swapped session and its own-path copy partner, equal everywhere except label, cell, procedure and the delivery path, with byte-identical store files and the expected delivered store, pass (A pair PASS/PASS; L pair with legacy verdicts)',
    vA.pass && vL.pass, JSON.stringify([...vA.fails, ...vL.fails]).slice(0, 200));
  const own3 = (R) => R['N1A-OWN-w3'], swp3 = (R) => R['N1AX-w3'];
  const caught = (fr, fe) => !swapV(fr, fe).pass;
  mutant('SC1 a copy that is not byte-identical to its source export fails swap parity', caught(null, E => { E.fileSha[COPY] = 'f2'; }));
  mutant('SC2 a delivered store that is not the expected masked store fails swap parity', caught(null, E => { E.expectedDeliveredHash[SRC] = 'dhX'; }));
  mutant('SC3 delivered store hashes that differ within the pair fail swap parity', caught(R => { own3(R).brain.deliveredHash = 'dh1'; }));
  mutant('SC4 an own-path session recorded through the swapped path fails swap parity', caught(R => { own3(R).input.delivery.source = 'paired'; }));
  mutant('SC5 a swapped session recorded through the own path fails swap parity', caught(R => { swp3(R).input.delivery.source = 'own'; swp3(R).input.delivery.brainWorld = 3; }));
  mutant('SC6 a wrong declared source world fails swap parity', caught(R => { own3(R).input.delivery.storeSourceWorld = 5; }));
  mutant('SC7 an own-path partner without the own-path procedure fails swap parity', caught(R => { own3(R).procedure = null; }));
  mutant('SC8 a missing session record fails swap parity', caught(R => { delete R['N1A-OWN-w3']; }));
  mutant('SC9 missing store-file hash evidence fails swap parity', caught(null, E => { delete E.fileSha[COPY]; }));
  mutant('SC10 records without the corrected I-LEDGER pipeline evidence fail swap parity', caught(R => { delete own3(R).credit1.ledger.pipelineEvidence; delete swp3(R).credit1.ledger.pipelineEvidence; }));
  mutant('SC11 a differing D-1 field (fingerprint) fails swap parity', caught(R => { own3(R).artifacts.fingerprint = 'fp2'; }));
  mutant('SC12 a differing reach call list fails swap parity', caught(R => { own3(R).reaches.goalCalls[1] = 10; }));
  mutant('SC13 a differing I-CRED result fails swap parity', caught(R => { own3(R).credit1.icred.identityRate = 0.99; }));
  mutant('SC14 differing I-LEDGER pipeline-key counts fail swap parity', caught(R => { own3(R).credit1.ledger.keyClass.PIPE = 11; }));
  mutant('SC15 a differing event-class count fails swap parity', caught(R => { own3(R).credit1.eventClasses.counts.hold = 3; }));
  mutant('SC16 a differing episode summary fails swap parity', caught(R => { own3(R).credit1.episodes.count = 5; }));
  mutant('SC17 a differing goal-redirect counter fails swap parity', caught(R => { own3(R).credit1.redirects.recovery = 1; }));
  mutant('SC18 differing self-target counts fail swap parity', caught(R => { own3(R).credit1.selfCandidates.all.self = 1; }));
  mutant('SC19 an invalid session (condition integrity) fails swap parity even when both agree', caught(R => { own3(R).conditionIntegrity.ok = false; swp3(R).conditionIntegrity.ok = false; }));
  mutant('SC20 an instrument FAIL in an A pair fails swap parity even when both agree', caught(R => { own3(R).credit1.ledger.verdict = 'FAIL'; swp3(R).credit1.ledger.verdict = 'FAIL'; }));
  mutant('SC21 a swapped session that read the copy instead of the export fails swap parity', caught(R => { swp3(R).input.delivery.brainFile = `${COPY}.json`; }));
  mutant('SC22 a missing credit1 block in both records fails swap parity', caught(R => { delete own3(R).credit1.episodes; delete swp3(R).credit1.episodes; }));
  mutant('SC23 a missing D-1 field in both records fails swap parity', caught(R => { delete own3(R).moves; delete swp3(R).moves; }));
  mutant('SC24 an I-LEDGER FAIL in an L pair fails swap parity', !K.swapParity(pairRecs('L', 'DISCRIMINATING', 'FAIL'), EV(), { pairs: PAIR_L }).pass);

  // G10.5 the runner: plan-only without a lock and without a session; run mode refuses before anything is derived or spawned
  const spJson = path.join(os.tmpdir(), 'mfw-credit1-gate-swapplan.json');
  fs.rmSync(spJson, { force: true });
  const spo = run(process.execPath, [path.join('experiments', 'credit1', 'run_swap_parity.mjs'), '--plan-only', '--json', spJson]);
  let spj = null; try { spj = JSON.parse(fs.readFileSync(spJson, 'utf8')); } catch { spj = null; }
  check('G10.5 swap-parity plan-only (no lock, no session): 60 sessions on the 11 existing XFER-1 development configurations of worlds 0-10',
    spo.status === 0 && !!spj && spj.total === 60 && spj.planProblems.length === 0 && JSON.stringify(spj.plan.map(e => e.label)) === JSON.stringify(SPL.map(e => e.label))
    && new Set(spj.plan.map(e => e.configSeed)).size === 11 && spj.plan.every(e => e.configIndex === e.world && e.agentSeed === (e.role === 'train' ? trainSeed(e.world) : testSeed(e.world))),
    spj ? `${spj.total} sessions, ${new Set(spj.plan.map(e => e.configSeed)).size} configurations` : spo.stderr.trim().slice(0, 120));
  const spRefused = path.join(os.tmpdir(), 'mfw-credit1-gate-swaprefusal');
  fs.rmSync(spRefused, { recursive: true, force: true });
  const spr = run(process.execPath, [path.join('experiments', 'credit1', 'run_swap_parity.mjs'), '--out', spRefused]);
  const rs = fs.readFileSync(path.join(HERE, 'run_swap_parity.mjs'), 'utf8');
  const ordr = ['swapParityRecordProblems(LOCK.SWAP_PARITY_AUTHORIZATION)', 'calibrationRecordProblems(LOCK.SESSION_AUTHORIZATION)', 'the output directory must be inside', "'diff', '--quiet', 'HEAD'", "imp('experiments/m7/env.js')", "step: 'C-0'", "await runPhase('TRAIN'", 'fs.copyFileSync(', "await runPhase('TEST'", 'swapParity(recs'].map(s => rs.indexOf(s));
  check('G10.5b swap-parity run mode refuses an unauthorized or out-of-scope run before anything is derived, built or spawned; order: locks, output directory, clean tree, derivation, C-0, training, byte copies, tests, verdict',
    spr.status === 2 && /swap-parity refused/.test(spr.stderr) && !fs.existsSync(spRefused) && ordr.every(i => i > 0) && ordr.every((v, i) => i === 0 || ordr[i - 1] < v), spr.stderr.trim().slice(0, 140));

  // G10.6 documentation
  const rdm = fs.readFileSync(path.join(HERE, 'README.md'), 'utf8');
  check('G10.6 README documents the swap-parity check: its plan, comparison, claim limit (delivery-path equivalence only) and that it is not authorized',
    ['run_swap_parity.mjs --plan-only', 'SWAP_PARITY_OWNPATH', 'SWAP_PARITY_AUTHORIZATION', 'delivery-path equivalence', '60 sessions'].every(s => rdm.includes(s)));
}

// ================= G11: timing-diagnostic harness (Milestone T, T-build; zero sessions) =================
// The real preload runs against fixtures: a fixture tree under the system temp directory holds byte copies of tree A's harness shim
// and phase1_0/_driver.js (pressSpace) and small fixture modules at the throttle's site and caller lines.  No fixture loads a tree's
// main.js, render/, env.js or run.js, and no driver process is started (G8.3).  Mutants are mutated copies of the preload, clock.mjs,
// diagnostic.mjs and the driver text; a mutant whose anchor is not found exactly once counts as NOT caught.
{
  const CK = await import('./clock.mjs');
  const D = await import('./diagnostic.mjs');
  const TB_BASE = 'cb7e015ce1182b0a132b7d04271adfd5fd909360';                // the T-build base (swap-parity authorization record)
  const PRELOAD = path.join(HERE, CK.PRELOAD_FILE), PRELOAD_URL = pathToFileURL(PRELOAD).href;
  const PLAN_DOC = path.join(HERE, 'TIMING_DIAGNOSTIC_PLAN.md');
  const treeA = built.trees.A.dir;
  const T0A = CK.T0A, T0B = CK.T0B;
  const VCLK = (t0 = T0A) => ({ mode: 'VIRTUAL', t0, delayMs: 500 });
  const preSrc = fs.readFileSync(PRELOAD, 'utf8'), ckSrc = fs.readFileSync(path.join(HERE, 'clock.mjs'), 'utf8'), dgSrc = fs.readFileSync(path.join(HERE, 'diagnostic.mjs'), 'utf8');
  const fxRoot = path.join(os.tmpdir(), 'mfw-credit1-gate-clock');
  fs.rmSync(fxRoot, { recursive: true, force: true });
  fs.mkdirSync(fxRoot, { recursive: true });
  let mutN = 0;
  const once = (src, anchor, repl) => (src.split(anchor).length === 2 ? src.replace(anchor, () => repl) : null);   // null: anchor not found exactly once
  const absImports = (src) => src.replace(/from '(\.\.?\/[^']+)'/g, (m, r) => `from '${pathToFileURL(path.join(HERE, r)).href}'`);
  const loadMutant = async (src) => { if (src === null) return null; const p = path.join(fxRoot, `mut-${++mutN}.mjs`); fs.writeFileSync(p, absImports(src)); return import(pathToFileURL(p).href); };
  const preloadMutant = (anchor, repl) => { const src = once(preSrc, anchor, repl); if (src === null) return null; const dir = path.join(fxRoot, `pm-${++mutN}`); fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, CK.PRELOAD_FILE), src); fs.copyFileSync(path.join(HERE, 'clock.mjs'), path.join(dir, 'clock.mjs')); return pathToFileURL(path.join(dir, CK.PRELOAD_FILE)).href; };

  // G11.1 pins and constants
  const importsOf = (s) => [...s.matchAll(/^import .* from '([^']+)';$/gm)].map(m => m[1]);
  const lenOk = [T0A, T0B].every(t => [t, t + 2 * 1500 * 500].every(x => String(x).length === 13 && x.toString(36).length === 8));
  check('G11.1 pins: clock_preload.mjs is the pinned file; TIMING_DIAGNOSTIC_PLAN.md is the timing-diagnostic scope\'s plan document; t0a 2026-01-01Z and t0b 2027-01-01Z (>= 15,000 ms; 13 decimal digits and 8 base-36 characters over a session); loop delay 500 ms; clock.mjs imports Node built-ins only, the preload clock.mjs and Node built-ins only',
    sha256(fs.readFileSync(PRELOAD)) === CK.PRELOAD_SHA256 && sha256(fs.readFileSync(PLAN_DOC)) === LOCK.TIMING_DIAGNOSTIC_SCOPE.planDocSha256 && T0A === 1767225600000 && T0B === 1798761600000
    && [T0A, T0B].every(t => t >= CK.REBUILD_INTERVAL_MS) && lenOk && CK.LOOP_DELAY_MS === 500 && CK.LOOP_CALLBACK_NAME === 'runAgentLoop'
    && importsOf(ckSrc).every(m => m.startsWith('node:')) && importsOf(preSrc).every(m => m.startsWith('node:') || m === './clock.mjs'),
    `preload ${CK.PRELOAD_SHA256.slice(0, 12)}, plan document ${LOCK.TIMING_DIAGNOSTIC_SCOPE.planDocSha256.slice(0, 12)}`);

  // the fixture tree
  const FX = path.join(fxRoot, 'fx-tree-' + sha256('credit1-clock-fixture').slice(0, 12));
  const put = (relp, text) => { const p = path.join(FX, ...relp.split('/')); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, text); };
  for (const relp of ['benchmarks/harness/headlessShim.js', 'experiments/phase1_0/_driver.js']) put(relp, fs.readFileSync(path.join(treeA, ...relp.split('/'))));
  const lines = (n, at) => { const L = Array.from({ length: n }, (_, i) => `// fixture line ${i + 1}`); for (const [ln, t] of Object.entries(at)) L[Number(ln) - 1] = t; return L.join('\n') + '\n'; };
  put('render/schemaMemory.js', lines(141, { 132: 'export function rebuildSchemas(store, force = false) {', 133: '    const now = Date.now();', 134: '    return now;', 135: '}', 139: 'export function other() {', 140: '    return Date.now();', 141: '}' }));
  put('render/episodeManager.js', lines(1225, { 1: "const SM = await import(new URL('./schemaMemory.js', import.meta.url));", 1148: 'export function forced() {', 1149: '    return SM.rebuildSchemas([], true);', 1150: '}', 1223: 'export function consolidate() {', 1224: '    return SM.rebuildSchemas([]);', 1225: '}' }));
  put('main.js', lines(5266, { 1: "const SM = await import(new URL('./render/schemaMemory.js', import.meta.url));", 5264: 'export function loopRebuild() {', 5265: '  return SM.rebuildSchemas([]);', 5266: '}' }));
  const ENTRY = [
    'const IN = JSON.parse(process.argv[2]);',
    'const boot = Date.now();',
    'const U = (r) => new URL(r, import.meta.url);',
    'const M = globalThis.__CREDIT1_CLOCK__;',
    'const out = { scenario: IN.scenario, boot, entryRan: true };',
    'try {',
    "  if (IN.scenario === 'advance') {",
    "    const shim = await import(U('../../benchmarks/harness/headlessShim.js')); const drv = await import(U('../phase1_0/_driver.js'));",
    '    const timer = shim.installTimerControl(); const seq = [];',
    "    function runAgentLoop() { seq.push(['loop', Date.now(), Date.now()]); setTimeout(runAgentLoop, 500); }",
    '    drv.pressSpace({ listeners: { keydown: [() => runAgentLoop()] } });',
    "    seq.push(['after-space', Date.now(), Date.now(), Date.now()]);",
    '    setTimeout(() => {}, 1000); setTimeout(function other() {}, 500); setInterval(() => {}, 500);',
    '    await new Promise(r => setImmediate(r)); await Promise.resolve();',
    "    seq.push(['after-other-timers', Date.now()]);",
    "    for (let i = 0; i < 4; i++) { const fired = timer.tick(); seq.push(['tick', fired, Date.now()]); }",
    "    clearTimeout(1); seq.push(['after-clear', timer.tick(), Date.now()]);",
    '    out.seq = seq; out.observed = M.observed();',
    "  } else if (IN.scenario === 'delays') {",
    "    const shim = await import(U('../../benchmarks/harness/headlessShim.js')); shim.installTimerControl();",
    '    function runAgentLoop() {}',
    "    out.delays = [499, 501, 0, undefined, '500', 500.0001, NaN, Infinity, -500, 1000, 500].map(d => { try { setTimeout(runAgentLoop, d); return [String(d), 'accepted']; } catch (e) { return [String(d), /CREDIT-1 clock: loop-delay/.test(e.message) ? 'refused' : 'other']; } });",
    '    out.observed = M.observed();',
    "  } else if (IN.scenario === 'sites' || IN.scenario === 'reads') {",
    "    const main = await import(U('../../main.js')); const sm = await import(U('../../render/schemaMemory.js')); const em = await import(U('../../render/episodeManager.js'));",
    "    if (IN.scenario === 'sites') { main.loopRebuild(); em.consolidate(); em.forced(); sm.other(); out.via = M.schemaVia(); out.observed = M.observed(); }",
    '    else {',
    '      const before = performance.timeOrigin + performance.now(); out.values = [boot];',
    '      out.values.push(main.loopRebuild()); out.values.push(sm.other()); out.values.push(Date.now());',
    '      const after = performance.timeOrigin + performance.now(); out.bounds = [before, after];',
    '      if (IN.extraRebuild) out.values.push(main.loopRebuild());',
    "      if (M.config.mode === 'REAL_RECORD') out.rec = M.recording();",
    '      out.observed = M.observed();',
    '    }',
    "  } else if (IN.scenario === 'marker') {",
    '    out.frozen = Object.isFrozen(M); out.configFrozen = Object.isFrozen(M.config); out.config = M.config; out.preloadSha256 = M.preloadSha256; out.identity = Date.now === M.now;',
    '    out.reassigned = (() => { try { globalThis.__CREDIT1_CLOCK__ = {}; return globalThis.__CREDIT1_CLOCK__ !== M; } catch { return false; } })();',
    '    out.mutated = (() => { try { M.config.t0 = 1; return M.config.t0 === 1; } catch { return false; } })();',
    "    out.redefined = (() => { try { Object.defineProperty(globalThis, '__CREDIT1_CLOCK__', { value: {} }); return true; } catch { return false; } })();",
    '  }',
    '} catch (e) { out.error = String(e && e.message); out.observed = M ? M.observed() : null; }',
    "process.stdout.write('@@FX@@' + JSON.stringify(out) + '@@END@@');",
  ];
  put('experiments/m7/fx_entry.mjs', ENTRY.join('\n') + '\n');
  const ENTRY_PATH = path.join(FX, 'experiments', 'm7', 'fx_entry.mjs');
  const S_BOOT = 'experiments/m7/fx_entry.mjs:2', S_DIRECT = `experiments/m7/fx_entry.mjs:${ENTRY.findIndex(l => l.includes('out.values.push(Date.now())')) + 1}`;
  const fx = (input, url = PRELOAD_URL, raw = null) => {
    const r = run(process.execPath, ['--import', url, ENTRY_PATH, raw !== null ? raw : JSON.stringify({ tree: FX, ...input })]);
    const m = /@@FX@@(.*)@@END@@/s.exec(r.stdout || ''); let o = null; try { o = m ? JSON.parse(m[1]) : null; } catch { o = null; }
    return { status: r.status, out: o, stderr: r.stderr || '' };
  };
  const trace = (reads, mode = 'REAL_RECORD') => { const p = path.join(fxRoot, `trace-${sha256(JSON.stringify([reads, mode])).slice(0, 12)}.json`); fs.writeFileSync(p, JSON.stringify({ mode, reads })); return { replayPath: p, replaySha256: sha256(fs.readFileSync(p)) }; };
  const R4 = [[S_BOOT, 111], ['render/schemaMemory.js:133', 222], ['render/schemaMemory.js:140', 333], [S_DIRECT, 444]];
  const RS = [[S_BOOT, 9], ['render/schemaMemory.js:133', 222], ['X:1', 5], [S_DIRECT, 7]];
  // every fixture expectation, by group; a preload mutant is caught when any expectation fails
  function fixtureSuite(url) {
    const res = [];
    const expect = (group, name, ok) => res.push({ group, name, ok: !!ok });
    for (const t0 of [T0A, T0B]) {
      const a = fx({ scenario: 'advance', clock: VCLK(t0) }, url).out, T = t0;
      const want = [['loop', T, T], ['after-space', T, T, T], ['after-other-timers', T]];
      for (let i = 1; i <= 4; i++) want.push(['loop', T + 500 * i, T + 500 * i], ['tick', true, T + 500 * i]);
      want.push(['after-clear', false, T + 2000]);
      expect('advance', `t0 ${t0}`, a && !a.error && a.boot === T && JSON.stringify(a.seq) === JSON.stringify(want) && a.observed.loopFires === 4 && JSON.stringify(a.observed.delays) === '{"500":4}'
        && a.observed.violations.length === 0 && a.observed.reads === 20);
    }
    const d = fx({ scenario: 'delays', clock: VCLK() }, url).out;
    const wantD = [['499', 'refused'], ['501', 'refused'], ['0', 'refused'], ['undefined', 'refused'], ['500', 'refused'], ['500.0001', 'refused'], ['NaN', 'refused'], ['Infinity', 'refused'], ['-500', 'refused'], ['1000', 'refused'], ['500', 'accepted']];
    expect('delays', 'only the number 500', d && !d.error && JSON.stringify(d.delays) === JSON.stringify(wantD) && d.observed.violations.length === 10 && d.observed.violations.every(v => v.kind === 'loop-delay'));
    const s = fx({ scenario: 'sites', clock: VCLK() }, url).out;
    expect('modes', 'call sites and rebuildSchemas callers', s && !s.error && JSON.stringify(s.via) === JSON.stringify(['main.js:5265', 'render/episodeManager.js:1224', 'render/episodeManager.js:1149']) && s.via.map(CK.viaClass).join('') === 'LKF'
      && JSON.stringify(s.observed.readsBySite) === JSON.stringify({ [S_BOOT]: 1, 'render/schemaMemory.js:133': 3, 'render/schemaMemory.js:140': 1 }) && s.observed.schemaReads === 3);
    const rr = fx({ scenario: 'reads', clock: { mode: 'REAL_RECORD', t0: null, delayMs: 500 } }, url).out;
    expect('modes', 'REAL_RECORD returns and records the real clock with its sites', rr && !rr.error && Array.isArray(rr.rec) && rr.rec.length === 4
      && JSON.stringify(rr.rec.map(x => x[0])) === JSON.stringify([S_BOOT, 'render/schemaMemory.js:133', 'render/schemaMemory.js:140', S_DIRECT]) && JSON.stringify(rr.rec.map(x => x[1])) === JSON.stringify(rr.values)
      && rr.rec.every(x => Number.isInteger(x[1]) && x[1] > 1.6e12 && Math.abs(x[1] - rr.bounds[1]) < 5000 && x[1] !== T0A && x[1] !== T0B) && rr.rec.every((x, i) => i === 0 || x[1] >= rr.rec[i - 1][1]));
    const ok1 = fx({ scenario: 'reads', clock: { mode: 'REPLAY_FULL', t0: null, delayMs: 500, ...trace(R4) } }, url).out;
    expect('modes', 'REPLAY_FULL returns the recorded values in read order', ok1 && !ok1.error && JSON.stringify(ok1.values) === '[111,222,333,444]' && ok1.observed.violations.length === 0);
    const mm = fx({ scenario: 'reads', clock: { mode: 'REPLAY_FULL', t0: null, delayMs: 500, ...trace([R4[0], ['render/schemaMemory.js:999', 222], R4[2], R4[3]]) } }, url).out;
    expect('modes', 'REPLAY_FULL refuses a site mismatch (fails closed)', mm && /replay-site-mismatch/.test(mm.error || '') && mm.observed.violations.length === 1 && mm.observed.violations[0].read === 1);
    const ov = fx({ scenario: 'reads', clock: { mode: 'REPLAY_FULL', t0: null, delayMs: 500, ...trace(R4.slice(0, 2)) } }, url).out;
    expect('modes', 'REPLAY_FULL refuses an overrun (fails closed)', ov && /replay-overrun/.test(ov.error || '') && ov.observed.violations[0].read === 2);
    const rs = fx({ scenario: 'reads', clock: { mode: 'REPLAY_SITE', t0: T0A, delayMs: 500, ...trace(RS) } }, url).out;
    expect('modes', 'REPLAY_SITE: recorded values at the throttle site only, the virtual clock elsewhere', rs && !rs.error && JSON.stringify(rs.values) === JSON.stringify([T0A, 222, T0A, T0A]));
    const rso = fx({ scenario: 'reads', extraRebuild: true, clock: { mode: 'REPLAY_SITE', t0: T0A, delayMs: 500, ...trace(RS) } }, url).out;
    expect('modes', 'REPLAY_SITE refuses an overrun at the throttle site', rso && /replay-overrun/.test(rso.error || ''));
    const mk = fx({ scenario: 'marker', clock: VCLK() }, url).out;
    expect('marker', 'frozen, non-configurable, the configuration and hash of the loaded preload, Date.now the installed clock', mk && mk.frozen === true && mk.configFrozen === true && CK.canonical(mk.config) === CK.canonical(VCLK())
      && mk.preloadSha256 === sha256(fs.readFileSync(fileURLToPath(url))) && mk.identity === true && mk.reassigned === false && mk.mutated === false && mk.redefined === false);
    const goodTrace = trace(R4);
    const bad = [['no clock configuration', { scenario: 'noop' }], ['an unknown key', { scenario: 'noop', clock: { ...VCLK(), extra: 1 } }], ['an unknown mode', { scenario: 'noop', clock: { ...VCLK(), mode: 'FROZEN' } }],
      ['an unknown mode with t0 null (refused by the mode rule alone)', { scenario: 'noop', clock: { mode: 'FROZEN', t0: null, delayMs: 500 } }],
      ['t0 below 15,000', { scenario: 'noop', clock: VCLK(12345) }], ['an unpinned t0', { scenario: 'noop', clock: VCLK(T0A + 1) }], ['delay 499', { scenario: 'noop', clock: { ...VCLK(), delayMs: 499 } }],
      ['t0 in a real-clock mode', { scenario: 'noop', clock: { mode: 'REAL_RECORD', t0: T0A, delayMs: 500 } }], ['a replay without a source', { scenario: 'noop', clock: { mode: 'REPLAY_FULL', t0: null, delayMs: 500 } }],
      ['a replay source with another hash', { scenario: 'noop', clock: { mode: 'REPLAY_FULL', t0: null, delayMs: 500, replayPath: goodTrace.replayPath, replaySha256: '0'.repeat(64) } }],
      ['a replay source that is not a REAL_RECORD trace', { scenario: 'noop', clock: { mode: 'REPLAY_FULL', t0: null, delayMs: 500, ...trace(R4, 'VIRTUAL') } }]];
    for (const [name, input] of bad) { const r = fx(input, url); expect('refusal', name, r.status !== 0 && !r.out && /CREDIT-1 clock preload refused/.test(r.stderr)); }
    const nj = fx(null, url, 'not-json');
    expect('refusal', 'a session input that is not JSON', nj.status !== 0 && !nj.out && /CREDIT-1 clock preload refused/.test(nj.stderr));
    const nt = fx(null, url, JSON.stringify({ scenario: 'noop', clock: VCLK() }));
    expect('refusal', 'no tree', nt.status !== 0 && !nt.out && /CREDIT-1 clock preload refused/.test(nt.stderr));
    const ok = fx({ scenario: 'noop', clock: VCLK() }, url);
    expect('refusal', 'a valid configuration runs the entry with empty stderr', ok.status === 0 && ok.out && ok.out.entryRan === true && ok.stderr.trim() === '');
    return res;
  }
  const FXR = fixtureSuite(PRELOAD_URL);
  const grp = (g) => { const r = FXR.filter(x => x.group === g); return { ok: r.length > 0 && r.every(x => x.ok), detail: `${r.filter(x => x.ok).length}/${r.length}${r.some(x => !x.ok) ? ' | failed: ' + r.filter(x => !x.ok).map(x => x.name).join(', ') : ''}` }; };
  { const g = grp('advance'); check('G11.2 the virtual clock advances only when the harness fires runAgentLoop, by its 500 ms delay (reads, other callbacks, setInterval, setImmediate, promises and a scheduled-but-unfired loop do not advance it); t0a and t0b', g.ok, g.detail); }
  { const g = grp('delays'); check('G11.3 every agent-loop delay must be exactly the number 500: 499, 501, 0, undefined, "500", 500.0001, NaN, Infinity, -500 and 1000 are refused and recorded as violations', g.ok, g.detail); }
  // G11.4 the first loop and module-level reads see t0 (fixture G11.2: boot and Space-key loop at t0), and the tree's own anchors
  const TA = (relp) => fs.readFileSync(path.join(treeA, ...relp.split('/')), 'utf8').split(/\r?\n/);
  const mainA = TA('main.js'), emA = TA('render/episodeManager.js'), smA = TA('render/schemaMemory.js'), shimA = TA('benchmarks/harness/headlessShim.js').join('\n'), runA = TA('experiments/m7/run.js').join('\n'), drvA = TA('experiments/phase1_0/_driver.js').join('\n');
  const spaceIdx = mainA.findIndex(l => l.includes('if (e.code === "Space") {'));
  const anchorsOk = mainA[5264].trim() === 'rebuildSchemas(getAllEpisodes());' && emA[1148].trim().startsWith('_sys.rebuildSchemas(episodicStore, true);') && emA[1223].trim() === '_sys.rebuildSchemas(episodicStore);'
    && smA[132].trim() === 'const now = Date.now();' && mainA.filter(l => l.trim().startsWith('let agentSpeed = 500;')).length === 1 && mainA.filter(l => l.includes('setTimeout(runAgentLoop, agentSpeed)')).length === 1
    && spaceIdx > 0 && mainA.slice(spaceIdx, spaceIdx + 8).some(l => l.trim().startsWith('runAgentLoop(); // start Safe loop')) && shimA.includes("if (typeof fn === 'function' && fn.name === 'runAgentLoop') { loopCallback = fn; captured++; return 1; }")
    && shimA.includes('tick(){ const cb = loopCallback; loopCallback = null; if (!cb) return false; cb(); return true; }') && drvA.includes("dom.listeners.keydown.forEach(fn => fn({ code:'Space'")
    && runA.indexOf('pressSpace(dom);') > 0 && runA.indexOf('pressSpace(dom);') < runA.indexOf('if (!timer.tick()) break;') && CK.SCHEMA_SITE === 'render/schemaMemory.js:133'
    && JSON.stringify(CK.SCHEMA_CALLERS) === JSON.stringify({ L: 'main.js:5265', K: 'render/episodeManager.js:1224', F: 'render/episodeManager.js:1149' });
  check('G11.4 the Space-key loop and module-level reads see t0 (fixture); tree A anchors: the throttle read render/schemaMemory.js:133, its callers main.js:5265 (L), render/episodeManager.js:1224 (K) and :1149 (forced F), agentSpeed 500 with one setTimeout(runAgentLoop, agentSpeed), the Space handler calls runAgentLoop() directly, the shim captures the loop by name and tick() fires it, run.js presses Space before the tick loop',
    grp('advance').ok && anchorsOk);
  { const g = grp('modes'), m = grp('marker'); check('G11.5 call-site attribution and the diagnostic modes: rebuildSchemas callers L/K/F, REAL_RECORD records the real clock, REPLAY_FULL returns the recording and refuses a site mismatch or overrun, REPLAY_SITE replays the throttle site only; the marker is frozen and non-configurable and reports the loaded preload', g.ok && m.ok, `${g.detail}; marker ${m.detail}`); }
  { const g = grp('refusal'); check('G11.6 the preload fails closed: no clock, unknown key or mode, unpinned or too-small t0, delay 499, t0 in a real-clock mode, a replay without a source, with another hash or not from REAL_RECORD, input not JSON, no tree: node exits before the entry runs; a valid configuration runs it with empty stderr', g.ok, g.detail); }

  // G11.6b the driver's guard (pure) and G11.6c its wiring
  const guardSuite = (G) => {
    const fails = [], expect = (n, ok) => { if (!ok) fails.push(n); };
    const bytes = fs.readFileSync(PRELOAD), fakeNow = function now() { return 1; };
    const mk = (over = {}) => Object.freeze({ installed: true, config: Object.freeze({ ...VCLK() }), preloadSha256: G.PRELOAD_SHA256, now: fakeNow, ...over });
    const diag = (over = {}) => ({ input: { procedure: 'TIMING_DIAGNOSTIC', clock: VCLK(), tracePath: 't.json' }, execArgv: ['--import', PRELOAD_URL], nodeOptions: undefined, marker: mk(), dateNow: fakeNow, preloadUrl: PRELOAD_URL, preloadBytes: bytes, ...over });
    const norm = (over = {}) => ({ input: { role: 'test' }, execArgv: [], nodeOptions: undefined, marker: undefined, dateNow: Date.now, preloadUrl: PRELOAD_URL, preloadBytes: bytes, ...over });
    const P = (ctx) => G.driverClockProblems(ctx);
    expect('the diagnostic configuration is accepted', P(diag()).length === 0);
    expect('a normal session is accepted', P(norm()).length === 0 && P(norm({ nodeOptions: '--max-old-space-size=4096' })).length === 0 && P(norm({ input: { procedure: 'D2_ALIGNED_FALSE' } })).length === 0);
    const refusedD = { 'no preload': diag({ execArgv: [], marker: undefined, dateNow: Date.now }), 'another preload URL': diag({ execArgv: ['--import', PRELOAD_URL + 'x'] }),
      'an extra node flag': diag({ execArgv: ['--import', PRELOAD_URL, '--require', 'x'] }), 'the --import= form': diag({ execArgv: [`--import=${PRELOAD_URL}`] }),
      'NODE_OPTIONS --import': diag({ nodeOptions: '--import x' }), 'NODE_OPTIONS --require': diag({ nodeOptions: '--require y' }), 'NODE_OPTIONS -r': diag({ nodeOptions: '-r q' }),
      'NODE_OPTIONS --loader': diag({ nodeOptions: '--loader z' }), 'NODE_OPTIONS --experimental-loader=': diag({ nodeOptions: '--experimental-loader=w' }),
      'a modified preload file': diag({ preloadBytes: Buffer.concat([bytes, Buffer.from(' ')]) }), 'a marker with another configuration': diag({ marker: mk({ config: Object.freeze(VCLK(T0B)) }) }),
      'Date.now that is not the installed clock': diag({ dateNow: function now() { return 2; } }), 'a marker that is not frozen': diag({ marker: { ...mk() } }), 'a marker not installed': diag({ marker: mk({ installed: false }) }),
      'a marker reporting another preload hash': diag({ marker: mk({ preloadSha256: '1'.repeat(64) }) }),
      'an invalid clock input': diag({ input: { procedure: 'TIMING_DIAGNOSTIC', clock: { ...VCLK(), delayMs: 499 }, tracePath: 't' }, marker: mk({ config: Object.freeze({ ...VCLK(), delayMs: 499 }) }) }),
      'no tracePath': diag({ input: { procedure: 'TIMING_DIAGNOSTIC', clock: VCLK() } }) };
    for (const [n, ctx] of Object.entries(refusedD)) expect(`the diagnostic refuses ${n}`, P(ctx).length > 0);
    const refusedN = { 'a clock input': norm({ input: { clock: VCLK() } }), 'a tracePath': norm({ input: { tracePath: 't' } }), 'a node flag (the preload)': norm({ execArgv: ['--import', PRELOAD_URL] }),
      'a preload marker': norm({ marker: mk() }), 'a non-native Date.now': norm({ dateNow: function now() { return 3; } }), 'NODE_OPTIONS --import': norm({ nodeOptions: '--import x' }),
      'a calibration procedure with a clock': norm({ input: { procedure: 'D2_ALIGNED_FALSE', clock: VCLK() } }), 'the swap-parity procedure under the preload': norm({ input: { procedure: 'SWAP_PARITY_OWNPATH' }, execArgv: ['--import', PRELOAD_URL] }) };
    for (const [n, ctx] of Object.entries(refusedN)) expect(`a normal session refuses ${n}`, P(ctx).length > 0);
    const Cf = G.clockConfigProblems, tr = { replayPath: 'x.json', replaySha256: 'a'.repeat(64) };
    expect('the preregistered configurations are accepted', [VCLK(), VCLK(T0B), { mode: 'REAL_RECORD', t0: null, delayMs: 500 }, { mode: 'REPLAY_FULL', t0: null, delayMs: 500, ...tr }, { mode: 'REPLAY_SITE', t0: T0A, delayMs: 500, ...tr }].every(c => Cf(c).length === 0));
    const badC = { 'an unpinned t0': VCLK(T0A + 1), 'delay 499': { ...VCLK(), delayMs: 499 }, 'an unknown key': { ...VCLK(), x: 1 }, 'an unknown mode': { ...VCLK(), mode: 'FROZEN' },
      'an unknown mode with t0 null (refused by the mode rule alone)': { mode: 'FROZEN', t0: null, delayMs: 500 },
      'a replay without its hash': { mode: 'REPLAY_FULL', t0: null, delayMs: 500, replayPath: 'x' }, 't0 in a real-clock mode': { mode: 'REAL_RECORD', t0: T0A, delayMs: 500 }, 'a replay source in a virtual mode': { ...VCLK(), ...tr }, 'not an object': null };
    for (const [n, c] of Object.entries(badC)) expect(`the configuration rule refuses ${n}`, Cf(c).length > 0);
    return fails;
  };
  const gs = guardSuite(CK);
  check('G11.6b the driver\'s clock guard (pure): the timing diagnostic needs exactly --import <pinned preload>, no preload flag in NODE_OPTIONS, the pinned preload bytes, the frozen marker with the input\'s configuration and hash, the installed Date.now, a valid clock and a tracePath; every other session refuses a clock input, a tracePath, any node flag, a marker, a non-native Date.now and a preload flag in NODE_OPTIONS',
    gs.length === 0, gs.join(' | '));
  const drvSrc = fs.readFileSync(path.join(HERE, 'session.mjs'), 'utf8');
  const GUARD_LINE = 'const cp = driverClockProblems({ input: IN, execArgv: process.execArgv, nodeOptions: process.env.NODE_OPTIONS, marker: globalThis.__CREDIT1_CLOCK__, dateNow: Date.now,';
  const REFUSE_LINE = "if (cp.length) refuse(`clock: ${cp.join('; ')}`); }";
  const wiring = (s) => {
    const iU = s.indexOf('!KEYS.includes(k) && !CLOCK_INPUT_KEYS.includes(k)'), iG = s.indexOf(GUARD_LINE), iR = s.indexOf(REFUSE_LINE);
    const iS = s.indexOf('assertSessionScope({ world: IN.world, cell: IN.cell, procedure: IN.procedure });'), iI = s.indexOf('await T(');
    return iU > 0 && iU < iG && iG < iR && iR < iS && iS < iI && s.includes('preloadUrl: pathToFileURL(path.join(HERE, PRELOAD_FILE)).href, preloadBytes: fs.readFileSync(path.join(HERE, PRELOAD_FILE)) });')
      && s.includes("import { driverClockProblems, recordedClockConfig, CLOCK_INPUT_KEYS, CLOCK_PROCEDURE, PRELOAD_FILE } from './clock.mjs';")
      && s.includes('if (DIAG) {\n  out.clock = { config: recordedClockConfig(IN.clock), preloadSha256: CLK.preloadSha256, observed: CLK.observed() };') && (s.match(/out\.clock = /g) || []).length === 1
      && s.includes("const schemaMod = DIAG ? await T('render/schemaMemory.js') : null;") && s.includes('if (TRACE) TRACE.boundary(calls - 1); },') && s.includes('if (TRACE) TRACE.boundary(calls - 1, 1); return true; },')
      && s.includes('if (TRACE) TRACE.boundary(calls);') && s.includes('const CLK = DIAG ? globalThis.__CREDIT1_CLOCK__ : null;');
  };
  check('G11.6c driver wiring: the clock guard runs after the unknown-field check and before the scope check and any runtime module; the clock input fields are accepted only to reach the guard; the clock block is added only for the timing diagnostic; the trace observes every call start, every executed move and the end of the run', wiring(drvSrc));
  { const i = drvSrc.indexOf('{ const cp = driverClockProblems('), j = drvSrc.indexOf(REFUSE_LINE) + REFUSE_LINE.length, block = drvSrc.slice(i, j);
    const anchor = "const envmod = await T('experiments/m7/env.js');";
    const moved = i > 0 && drvSrc.split(anchor).length === 2 ? (drvSrc.slice(0, i) + drvSrc.slice(j)).replace(anchor, () => `${anchor}\n${block}`) : null;
    mutant('CKW1 the clock guard moved after the first runtime import is detected', moved !== null && !wiring(moved)); }
  for (const [id, anchor, repl] of [
    ['GM1 the exact node-flag check removed', "if (!Array.isArray(execArgv) || execArgv.length !== 2 || execArgv[0] !== '--import' || execArgv[1] !== preloadUrl) p.push(", 'if (false) p.push('],
    ['GM2 the NODE_OPTIONS check removed', "if (typeof nodeOptions === 'string' && PRELOAD_FLAG.test(nodeOptions)) p.push(", 'if (false) p.push('],
    ['GM3 the preload hash check removed', 'if (!preloadBytes || sha256(preloadBytes) !== PRELOAD_SHA256) p.push(', 'if (false) p.push('],
    ['GM4 the Date.now identity check removed', 'if (dateNow !== marker.now) p.push(', 'if (false) p.push('],
    ['GM5 the marker-configuration check removed', 'if (canonical(marker.config) !== canonical(input.clock)) p.push(', 'if (false) p.push('],
    ['GM6 a normal session accepting a clock input', 'for (const k of CLOCK_INPUT_KEYS) if (input && input[k] !== undefined) p.push(', 'for (const k of CLOCK_INPUT_KEYS) if (false) p.push('],
    ['GM7 a normal session accepting a node flag', 'if (!Array.isArray(execArgv) || execArgv.length !== 0) p.push(', 'if (false) p.push('],
    ['GM8 a normal session accepting a marker', 'if (marker !== undefined) p.push(', 'if (false) p.push('],
    ['GM9 a normal session accepting a non-native Date.now', 'if (!isNativeDateNow(dateNow)) p.push(', 'if (false) p.push('],
    ['GM10 the diagnostic skipping clock validation', 'p.push(...clockConfigProblems(input.clock).map(x => `clock: ${x}`));', 'void 0;'],
    ['GM11 the diagnostic without a tracePath', "if (typeof input.tracePath !== 'string' || !input.tracePath) p.push(", 'if (false) p.push('],
    ['GM12 an unfrozen marker accepted', '!Object.isFrozen(marker) || ', ''],
    ['GM13 the marker hash check removed', 'if (marker.preloadSha256 !== PRELOAD_SHA256) p.push(', 'if (false) p.push('],
    ['CM-a an unpinned t0 accepted', 'if (!T0_VALUES.includes(cfg.t0)) p.push(', 'if (false) p.push('],
    ['CM-b a delay other than 500 accepted', 'if (cfg.delayMs !== LOOP_DELAY_MS) p.push(', 'if (false) p.push('],
    ['CM-c an unknown configuration key accepted', 'if (unknown.length) p.push(', 'if (false) p.push('],
    ['CM-d an unknown mode accepted', 'if (!CLOCK_MODES.includes(cfg.mode)) p.push(', 'if (false) p.push('],
    ['CM-e a replay without its hash accepted', "if (!/^[0-9a-f]{64}$/.test(String(cfg.replaySha256))) p.push(", 'if (false) p.push('],
    ['CM-f t0 in a real-clock mode accepted', 'else if (cfg.t0 !== null) p.push(', 'else if (false) p.push('],
  ]) { const m = await loadMutant(once(ckSrc, anchor, repl)); mutant(`${id} is detected`, m !== null && guardSuite(m).length > 0); }
  for (const [id, anchor, repl] of [
    ['PM1 the clock advancing on every read', "  if (cfg.mode === 'VIRTUAL') return virtual;", "  if (cfg.mode === 'VIRTUAL') return virtual++;"],
    ['PM2 the clock advancing when the loop is scheduled', '    const fire = { [LOOP_CALLBACK_NAME](...a) { loopFired(delay); return target.apply(this, a); } }[LOOP_CALLBACK_NAME];', '    loopFired(delay); const fire = { [LOOP_CALLBACK_NAME](...a) { return target.apply(this, a); } }[LOOP_CALLBACK_NAME];'],
    ['PM3 the clock advancing on any callback', '  return inner(fn, delay, ...rest);', "  if (cfg.mode === 'VIRTUAL') virtual += 1;\n  return inner(fn, delay, ...rest);"],
    ['PM4 a loop delay of 500 +/- 1 accepted', "if (!(typeof delay === 'number' && delay === LOOP_DELAY_MS))", "if (!(typeof delay === 'number' && Math.abs(delay - LOOP_DELAY_MS) <= 1))"],
    ['PM5 a non-number loop delay accepted', "if (!(typeof delay === 'number' && delay === LOOP_DELAY_MS))", 'if (!(Number(delay) === LOOP_DELAY_MS))'],
    ['PM6 the first loop at t0 + 500', 'let virtual = cfg.t0;', 'let virtual = cfg.t0 + LOOP_DELAY_MS;'],
    ['PM7 a fire wrapper not named runAgentLoop', '{ [LOOP_CALLBACK_NAME](...a) { loopFired(delay); return target.apply(this, a); } }[LOOP_CALLBACK_NAME]', '{ loop(...a) { loopFired(delay); return target.apply(this, a); } }.loop'],
    ['PM8 a replay overrun falling back to the real clock', "    if (i >= REC.length) throw violation('replay-overrun', { read: i, site });", '    if (i >= REC.length) return realNow.call(Date);'],
    ['PM9 a replay ignoring call sites', "    if (REC[i][0] !== site) throw violation('replay-site-mismatch', { read: i, expected: REC[i][0], got: site });\n", ''],
    ['PM10 the throttle site matched by file only', '  if (site !== SCHEMA_SITE) return virtual;', "  if (!site.startsWith('render/schemaMemory.js:')) return virtual;"],
    ['PM11 an invalid configuration installed anyway', "if (cfgProblems.length) fail(cfgProblems.join('; '));", 'void cfgProblems;'],
    ['PM12 a marker that is not frozen', 'value: Object.freeze({\n  installed: true,', 'value: ({\n  installed: true,'],
    ['PM13 a replay source whose hash is not checked', "  if (sha256(bytes) !== cfg.replaySha256) fail('the replay source does not match replaySha256');\n", ''],
    ['PM14 REAL_RECORD recording nothing', 'recording.push([site, v]); ', ''],
    ['PM15 a configurable, writable marker', 'enumerable: false, configurable: false, writable: false,', 'enumerable: false, configurable: true, writable: true,'],
    ['PM16 a mutable recorded configuration', 'config: Object.freeze({ ...cfg }),', 'config: { ...cfg },'],
  ]) { const u = preloadMutant(anchor, repl); mutant(`${id} is detected`, u !== null && fixtureSuite(u).some(x => !x.ok)); }

  // G11.7 isolation: diagnostic modes cannot enter a normal, calibration, swap-parity or confirmatory run
  const DREC = { ...JSON.parse(JSON.stringify(LOCK.TIMING_DIAGNOSTIC_SCOPE)), authorizedBy: 'gate-synthetic' };
  const dIn = (a, i) => LOCK.timingDiagnosticScopeProblems(a, i).length === 0;
  const dp = (world, cell) => ({ world, cell, procedure: 'TIMING_DIAGNOSTIC' });
  const realRefuses = (() => { try { LOCK.assertSessionScope(dp(2, 'N1AX')); return LOCK.TIMING_DIAGNOSTIC_AUTHORIZATION !== null; } catch { return LOCK.TIMING_DIAGNOSTIC_AUTHORIZATION === null; } })();
  const lockOk = realRefuses && LOCK.scopeProblems(LOCK.SESSION_AUTHORIZATION, dp(2, 'N1AX')).length > 0 && LOCK.swapScopeProblems(LOCK.SWAP_PARITY_AUTHORIZATION, dp(2, 'N1AX')).length > 0
    && dIn(DREC, dp(2, 'N1AX')) && dIn(DREC, dp(26, 'T_A')) && dIn(DREC, dp(14, 'N0L')) && !dIn(null, dp(2, 'N1AX')) && !dIn(DREC, dp(4, 'N1AX')) && !dIn(DREC, dp(2032, 'N1AX')) && !dIn(DREC, dp(2, 'N1A_noQ'))
    && !dIn(DREC, dp(2, 'N1AP')) && !dIn(DREC, { world: 2, cell: 'N1AX', procedure: 'MAP_ON_PARITY' }) && !dIn(DREC, { world: 2, cell: 'N1AX' })
    && JSON.stringify(LOCK.CALIBRATION_SCOPE.procedures) === '["D2_ALIGNED_FALSE","MAP_ON_PARITY","D2_MAP_ON_PARITY"]' && JSON.stringify(LOCK.SWAP_PARITY_SCOPE.procedures) === '["SWAP_PARITY_OWNPATH"]'
    && JSON.stringify(LOCK.TIMING_DIAGNOSTIC_SCOPE.worlds) === '[2,3,6,7,14,15,21,22,25,26]' && LOCK.TIMING_DIAGNOSTIC_SCOPE.aPlus === false;
  check('G11.7 lock isolation: TIMING_DIAGNOSTIC runs only under the timing-diagnostic record (refused while it is null; never under the calibration or swap-parity record), only on its ten development worlds and eight cells; confirmatory territory, A+ cells and other procedures are refused; the calibration and swap-parity scopes are unchanged',
    lockOk, LOCK.TIMING_DIAGNOSTIC_AUTHORIZATION === null ? 'timing-diagnostic lock null' : 'timing-diagnostic record');
  const tdNull = LOCK.TIMING_DIAGNOSTIC_AUTHORIZATION === null, tdRec = !tdNull && LOCK.timingDiagnosticRecordProblems(LOCK.TIMING_DIAGNOSTIC_AUTHORIZATION).length === 0 && LOCK.TIMING_DIAGNOSTIC_AUTHORIZATION.authorizedBy === 'owner';
  check('G11.7b the timing-diagnostic lock is null (the procedure and the run mode are refused) or exactly its record; the calibration record (2026-10-25) and the swap-parity record (2026-10-27) are unchanged; the A+ lock is null',
    (tdNull || tdRec) && LOCK.calibrationRecordProblems(LOCK.SESSION_AUTHORIZATION).length === 0 && LOCK.SESSION_AUTHORIZATION.authorizedOn === '2026-10-25'
    && LOCK.swapParityRecordProblems(LOCK.SWAP_PARITY_AUTHORIZATION).length === 0 && LOCK.SWAP_PARITY_AUTHORIZATION.authorizedOn === '2026-10-27' && LOCK.A_PLUS_MODULE_AUTHORIZATION === null, tdNull ? 'timing-diagnostic lock null' : tdRec ? 'timing-diagnostic record' : 'OTHER');
  const dRecBad = (f) => { const r = JSON.parse(JSON.stringify(DREC)); f(r); return LOCK.timingDiagnosticRecordProblems(r).length > 0 && !dIn(r, dp(2, 'N1AX')); };
  mutant('LD1 a timing-diagnostic record admitting world 4 is rejected', dRecBad(r => { r.worlds.push(4); }));
  mutant('LD2 a timing-diagnostic record admitting world 2032 is rejected', dRecBad(r => { r.worlds.push(2032); }));
  mutant('LD3 a timing-diagnostic record admitting N1A_noQ is rejected', dRecBad(r => { r.cells.push('N1A_noQ'); }));
  mutant('LD4 a timing-diagnostic record with A+ enabled is rejected', dRecBad(r => { r.aPlus = true; }));
  mutant('LD5 a timing-diagnostic record with an extra procedure is rejected', dRecBad(r => { r.procedures.push('D2_ALIGNED_FALSE'); }));
  mutant('LD6 a timing-diagnostic record pinning another plan document is rejected', dRecBad(r => { r.planDocSha256 = '0'.repeat(64); }));
  { const r = { ...JSON.parse(JSON.stringify(LOCK.CALIBRATION_SCOPE)), authorizedBy: 'gate-synthetic' }; r.procedures.push('TIMING_DIAGNOSTIC');
    mutant('LD7 a calibration record admitting TIMING_DIAGNOSTIC is rejected', LOCK.calibrationRecordProblems(r).length > 0 && LOCK.scopeProblems(r, dp(2, 'N1AX')).length > 0); }
  // the runners: only the timing-diagnostic runner starts sessions under the preload; the calibration and swap-parity runners pass no node flag
  const cred = (f) => fs.readFileSync(path.join(HERE, f), 'utf8');
  const learn0Files = []; { const walk = (p) => { for (const e of fs.readdirSync(p, { withFileTypes: true })) { const q = path.join(p, e.name); if (e.isDirectory()) walk(q); else if (/\.(mjs|js)$/.test(e.name)) learn0Files.push(q); } }; walk(path.join(ROOT, 'experiments', 'learn0')); }
  const preloadRefs = [...fs.readdirSync(HERE).filter(f => f.endsWith('.mjs')).map(f => [f, cred(f)]), ...learn0Files.map(f => [rel(f), fs.readFileSync(f, 'utf8')])]
    .filter(([, s]) => /clock_preload|PRELOAD_FILE|--import/.test(s)).map(([f]) => f).sort();
  const runnersClean = (cal, swp) => !/--import|NODE_OPTIONS|clock_preload|PRELOAD_FILE/.test(cal) && !/--import|NODE_OPTIONS|clock_preload|PRELOAD_FILE/.test(swp)
    && cal.includes('const c = spawn(process.execPath, [SESS[e.driver], JSON.stringify(input)], {') && swp.includes('const c = spawn(process.execPath, [SESS, JSON.stringify(driverInput(e, { tree: TREES, brain }))], {');
  const rtd = cred('run_timing_diagnostic.mjs');
  check('G11.7c runners: calibrate.mjs and run_swap_parity.mjs pass no node flag and no NODE_OPTIONS (their spawn lines unchanged); the preload is referenced only by clock.mjs, clock_preload.mjs, the driver, the timing-diagnostic runner and this gate (nothing in experiments/learn0); the timing-diagnostic runner starts every session with --import <the pinned preload> and without NODE_OPTIONS',
    runnersClean(cred('calibrate.mjs'), cred('run_swap_parity.mjs')) && JSON.stringify(preloadRefs) === JSON.stringify(['clock.mjs', 'clock_preload.mjs', 'run_timing_diagnostic.mjs', 'session.mjs', 'verify_credit1.mjs'])
    && rtd.includes("spawn(process.execPath, ['--import', PRELOAD_URL, SESS, JSON.stringify(diagnosticInput(e, PATHS, replay))], { cwd: ROOT, env: childEnv,") && rtd.includes("filter(([k]) => k !== 'NODE_OPTIONS')"),
    preloadRefs.join(', '));
  mutant('RM1 a calibration runner passing --import is detected', !runnersClean(cred('calibrate.mjs').replace('[SESS[e.driver], JSON.stringify(input)]', () => "['--import', 'x', SESS[e.driver], JSON.stringify(input)]"), cred('run_swap_parity.mjs')));
  const okRec = { label: 'N0A-w3', outcome: { completed: true, crashed: false }, conditionIntegrity: { ok: true }, mapAudit: { ok: true } };
  check('G11.7d calibration and swap-parity analyses refuse a timing-diagnostic record (a clock block or the TIMING_DIAGNOSTIC procedure); an ordinary valid record is unaffected',
    K.sessionProblems(okRec).length === 0 && K.sessionProblems({ ...okRec, clock: {} }).length > 0 && K.sessionProblems({ ...okRec, procedure: 'TIMING_DIAGNOSTIC' }).length > 0);
  // G8.1 for timing-diagnostic runs (synthetic)
  const drec = (file, label, cell, world, extra = {}) => ({ rel: `diag-x/sessions/${file}.json`, json: { schema: 'credit1/1.session', label, cell, input: { world }, procedure: 'TIMING_DIAGNOSTIC', clock: { config: {} }, ...extra } });
  const diagRun = (f) => { const S = { files: [{ rel: 'diag-x/summary.json', json: { schema: 'credit1/1.timing-diagnostic', head: 'd'.repeat(40), authorization: { ...JSON.parse(JSON.stringify(LOCK.TIMING_DIAGNOSTIC_SCOPE)), authorizedBy: 'owner' } } },
    drec('R-LOW-1__N1AX-w2', 'N1AX-w2', 'N1AX', 2), { rel: 'diag-x/traces/R-LOW-1__N1AX-w2.json', json: null }, drec('TR-LOW__T_A-w3', 'T_A-w3', 'T_A', 3), { rel: 'diag-x/traces/TR-LOW__T_A-w3.json', json: null },
    { rel: 'diag-x/brains/SRC__T_A-w3.json', json: null }, { rel: 'diag-x/brains/TR-LOW__T_A-w3.json', json: null }, { rel: 'diag-x/logs/c0_gate.log', json: null }, { rel: 'diag-x/report.json', json: null }],
    tracked: ['experiments/credit1/data/.gitignore'], headCarriesLock: (h, kind) => h === 'd'.repeat(40) && kind === 'timing-diagnostic' }; if (f) f(S); return K.dataDirProblems(S).problems; };
  const calRun = (rec) => K.dataDirProblems({ files: [{ rel: 'calib-y/summary.json', json: { schema: 'credit1/1.calibration', head: 'a'.repeat(40), authorization: { ...JSON.parse(JSON.stringify(LOCK.CALIBRATION_SCOPE)), authorizedBy: 'owner' } } },
    { rel: 'calib-y/sessions/N0A-w3.json', json: { schema: 'credit1/1.session', label: 'N0A-w3', cell: 'N0A', input: { world: 3 }, ...rec } }], tracked: [], headCarriesLock: (h) => h === 'a'.repeat(40) }).problems;
  const diagOk = diagRun();
  check('G8.1e the G8.1 rule accepts a well-formed timing-diagnostic run under its own lock (synthetic: condition-keyed records with the clock block, traces, source copies, training exports, logs, the report)', diagOk.length === 0 && calRun({}).length === 0, diagOk.slice(0, 2).join(' | '));
  mutant('DG17 a clock-bearing record inside a calibration run fails G8.1', calRun({ procedure: 'TIMING_DIAGNOSTIC', clock: {} }).length > 0);
  mutant('DG18 a record without the clock block inside a timing-diagnostic run fails G8.1', diagRun(S => { delete S.files[1].json.clock; }).length > 0);
  mutant('DG19 a trace inside a calibration run fails G8.1', K.dataDirProblems({ files: [{ rel: 'calib-y/summary.json', json: { schema: 'credit1/1.calibration', head: 'a'.repeat(40), authorization: { ...JSON.parse(JSON.stringify(LOCK.CALIBRATION_SCOPE)), authorizedBy: 'owner' } } },
    { rel: 'calib-y/traces/N0A-w3.json', json: null }], tracked: [], headCarriesLock: (h) => h === 'a'.repeat(40) }).problems.length > 0);
  mutant('DG20 a timing-diagnostic run whose commit carries only the calibration lock fails G8.1', diagRun(S => { S.headCarriesLock = (h, kind) => kind === 'calibration'; }).length > 0);
  mutant('DG21 a trace that is not a planned session fails G8.1', diagRun(S => { S.files.push({ rel: 'diag-x/traces/R-LOW-9__N1AX-w2.json', json: null }); }).length > 0);
  mutant('DG22 a store file that is not a planned copy or export fails G8.1', diagRun(S => { S.files.push({ rel: 'diag-x/brains/SRC__T_A-w4.json', json: null }); }).length > 0);
  mutant('DG23 a record whose label carries the condition fails G8.1', diagRun(S => { S.files[1].json.label = 'R-LOW-1__N1AX-w2'; }).length > 0);
  mutant('DG24 a timing-diagnostic run recorded under the swap-parity scope fails G8.1', diagRun(S => { S.files[0].json.authorization = { ...JSON.parse(JSON.stringify(LOCK.SWAP_PARITY_SCOPE)), authorizedBy: 'owner' }; }).length > 0);

  // G11.8 plan, comparisons, localization, verdict, validity and report (pure) with their mutants
  const diagSuite = (Dm) => {
    const fails = [], expect = (n, ok) => { if (!ok) fails.push(n); };
    const cfgOf = (mode, t0, sha = null) => ({ mode, t0, delayMs: 500, replaySha256: sha });
    const rec = (over = {}, cfg = cfgOf('VIRTUAL', T0A), obs = { reads: 9, loopFires: 300, violations: [] }) => JSON.stringify({ label: 'N1AX-w2', reaches: { legal: 10, goal: 12 }, artifacts: { qSum: 1.5 }, ...over, clock: { config: cfg, observed: obs } });
    expect('identical records', Dm.recordDiff(rec(), rec()).identical);
    const one = Dm.recordDiff(rec(), rec({ reaches: { legal: 11, goal: 12 } }));
    expect('one differing value, reported by path', !one.identical && one.paths.includes('reaches.legal'));
    expect('a fractional difference', !Dm.recordDiff(rec(), rec({ artifacts: { qSum: 1.6 } })).identical);
    expect('V_T0B allows t0 only', Dm.recordDiff(rec(), rec({}, cfgOf('VIRTUAL', T0B)), Dm.ALLOWED_CONFIG_DIFFS.V_T0B).identical && !Dm.recordDiff(rec(), rec({}, cfgOf('REAL_RECORD', T0A)), Dm.ALLOWED_CONFIG_DIFFS.V_T0B).identical);
    expect('an allowed configuration key never hides an observed difference', !Dm.recordDiff(rec(), rec({}, cfgOf('VIRTUAL', T0B), { reads: 8, loopFires: 300, violations: [] }), ['t0']).identical);
    expect('no exclusion means raw bytes', !Dm.recordDiff(rec(), rec({}, cfgOf('VIRTUAL', T0B))).identical);
    expect('the allowed-difference table', JSON.stringify(Dm.ALLOWED_CONFIG_DIFFS) === JSON.stringify({ R: [], V: [], TR: [], V_T0B: ['t0'], P_FULL: ['mode', 'replaySha256'], P_SITE: ['mode', 't0', 'replaySha256'] }));
    const ex = (id) => JSON.stringify({ Q: { a: 1 }, episodes: [{ id, timestamp: 5, nodes: [1, 2] }] });
    expect('export bytes, episode ids included', Dm.exportDiff(ex('e1'), ex('e1')).identical && !Dm.exportDiff(ex('e1'), ex('e2')).identical);
    const ARR = [[0, 1, 2], [1, 2, 3], [2, 3, 4], [3, 4, 5]], ARR_B = [[0, 1, 2], [1, 2, 3], [2, 3, 9], [3, 9, 5]];
    const tr = (o) => JSON.stringify({ arrivals: ARR, schemaEvents: [[0, 0, 'd0', 1]], schemaReads: [], reads: null, ...o });
    const A = tr({ schemaEvents: [[0, 0, 'd0', 1], [2, 0, 'd1', 1]], schemaReads: [[2, 0, 'main.js:5265']] }), B = tr({ arrivals: ARR_B, schemaReads: [[2, 0, 'main.js:5265']] });
    expect('identical traces', Dm.traceDiff(A, A).identical && !Dm.traceDiff(A, B).identical && Dm.traceDiff(A, B).firstCall === 2);
    expect('schema events are compared', !Dm.traceDiff(tr({}), tr({ schemaEvents: [[0, 0, 'dX', 1]] })).identical);
    expect('recorded clock values are not compared', Dm.traceDiff(tr({ reads: [['a', 1]] }), tr({ reads: [['a', 2]] })).identical);
    expect('localized: a throttled rebuild in one run before the first differing decision', Dm.localization(A, B).ok === true);
    expect('not localized: a decision differs before the schema', Dm.localization(A, tr({ arrivals: [[0, 1, 2], [1, 2, 7], [2, 7, 4], [3, 4, 5]], schemaReads: [[2, 0, 'main.js:5265']] })).ok === false);
    expect('not localized: only the forced (clock-free) caller', Dm.localization(tr({ schemaEvents: [[0, 0, 'd0', 1], [2, 0, 'd1', 1]], schemaReads: [[2, 0, 'render/episodeManager.js:1149']] }), tr({ arrivals: ARR_B, schemaReads: [[2, 0, 'render/episodeManager.js:1149']] })).ok === false);
    expect('not localized: a schema-read difference first', Dm.localization(tr({ schemaEvents: [[0, 0, 'd0', 1], [2, 0, 'd1', 1]], schemaReads: [[1, 1, 'main.js:5265'], [2, 0, 'main.js:5265']] }), tr({ arrivals: ARR_B, schemaReads: [[2, 0, 'main.js:5265']] })).ok === false);
    const src = rec({}, cfgOf('REAL_RECORD', null)), sha = 'a'.repeat(64);
    const ro = (repRecord, repTrace, kind = 'P_FULL') => Dm.replayOutcome({ srcRecord: src, srcTrace: A, repRecord, repTrace, allowed: Dm.ALLOWED_CONFIG_DIFFS[kind] }).outcome;
    expect('a full replay reproduces its source', ro(rec({}, cfgOf('REPLAY_FULL', null, sha)), A) === 'REPRODUCED');
    expect('a schema-site replay reproduces its source', ro(rec({}, cfgOf('REPLAY_SITE', T0A, sha)), A, 'P_SITE') === 'REPRODUCED');
    expect('a differing replay diverges', ro(rec({ reaches: { legal: 13, goal: 15 } }, cfgOf('REPLAY_FULL', null, sha)), A) === 'DIVERGED');
    const viol = rec({}, cfgOf('REPLAY_FULL', null, sha), { reads: 4, loopFires: 1, violations: [{ kind: 'replay-site-mismatch', read: 3 }] });
    expect('a clock violation with the decisions a prefix of the source: replay tooling', ro(viol, tr({ arrivals: [[0, 1, 2], [1, 2, 3]] })) === 'REPLAY_TOOLING');
    expect('a clock violation after a differing decision: a divergence', ro(viol, tr({ arrivals: [[0, 1, 2], [1, 2, 8]] })) === 'DIVERGED');
    const P = Dm.planTimingDiagnostic(), VE = P.find(e => e.file === 'V-LOW__N1AX-w2'), PE = P.find(e => e.file === 'PF-HIGH-from-R-LOW-1__N1AX-w2');
    const vr = (over = {}, obs = {}, cfg = cfgOf('VIRTUAL', T0A)) => ({ label: 'N1AX-w2', procedure: 'TIMING_DIAGNOSTIC', outcome: { completed: true, crashed: false, loopsExecuted: 300 }, conditionIntegrity: { ok: true }, mapAudit: { ok: true },
      clock: { config: cfg, observed: { reads: 10, readsBySite: {}, schemaReads: 0, loopFires: 300, delays: { 500: 300 }, violations: [], ...obs } }, ...over });
    const SP = Dm.diagnosticSessionProblems;
    expect('a valid session', SP(vr(), VE).length === 0);
    expect('invalid: stderr', SP(vr(), VE, { stderr: 'warning' }).length > 0);
    expect('invalid: a clock violation outside the replays', SP(vr({}, { violations: [{ kind: 'loop-delay' }] }), VE).length > 0);
    expect('invalid: loop fires differ from loops executed', SP(vr({}, { loopFires: 299, delays: { 500: 299 } }), VE).length > 0);
    expect('invalid: a delay other than 500', SP(vr({}, { delays: { 500: 299, 499: 1 } }), VE).length > 0);
    expect('invalid: another t0', SP(vr({}, {}, cfgOf('VIRTUAL', T0B)), VE).length > 0);
    expect('invalid: crashed', SP(vr({ outcome: { completed: false, crashed: true, loopsExecuted: 120 } }), VE).length > 0);
    expect('invalid: not a timing-diagnostic record', SP(vr({ clock: undefined }), VE).length > 0);
    const pr = (v) => vr({ outcome: { completed: false, crashed: true, loopsExecuted: 120 } }, { reads: 5, loopFires: 121, delays: { 500: 121 }, violations: v }, cfgOf('REPLAY_FULL', null, sha));
    expect('a replay that crashed on a clock violation is a result', SP(pr([{ kind: 'replay-site-mismatch' }]), PE).length === 0);
    expect('a replay that crashed without a clock violation is invalid', SP(pr([]), PE).length > 0);
    expect('the escalation rule', Dm.escalationNeeded(Array.from({ length: 5 }, () => ({ varies: false }))) === true && Dm.escalationNeeded([{ varies: true }, ...Array.from({ length: 4 }, () => ({ varies: false }))]) === false);
    const cnt = (cs) => cs.reduce((m, c) => ((m[c.kind] = (m[c.kind] || 0) + 1), m), {});
    expect('the comparisons (125 sessions; 145 with the escalation)', JSON.stringify(cnt(Dm.diagnosticComparisons(P, new Set(P.filter(e => !e.conditional).map(e => e.file))))) === JSON.stringify({ R: 30, P_FULL: 10, P_SITE: 10, V: 25, V_T0B: 25, TR: 5 })
      && cnt(Dm.diagnosticComparisons(P, new Set(P.map(e => e.file)))).R === 140);
    const base = () => ({ r: Dm.SWAP_LABELS.map((label, i) => ({ label, varies: i === 0, sourcesDiffer: i === 0, pairs: i === 0 ? [{ identical: false, loc: { ok: true } }] : [{ identical: true, loc: null }] })), escalated: false,
      p: Dm.SWAP_LABELS.flatMap(label => [{ label, kind: 'P_FULL', outcome: 'REPRODUCED' }, { label, kind: 'P_SITE', outcome: 'REPRODUCED' }]), v: [{ label: 'x', identical: true }], vb: [{ label: 'x', identical: true }], tr: [{ label: 'x', identical: true }] });
    const cat = (f) => { const b = base(); if (f) f(b); try { return Dm.diagnosticVerdict(b).category; } catch { return 'THREW'; } };
    expect('supports', cat() === 'SUPPORTS');
    expect('a full-replay divergence: another source of nondeterminism', cat(b => { b.p[0].outcome = 'DIVERGED'; }) === 'OTHER_NONDETERMINISM');
    expect('a V difference: another source', cat(b => { b.v[0].identical = false; }) === 'OTHER_NONDETERMINISM');
    expect('a TR difference: another source', cat(b => { b.tr[0].identical = false; }) === 'OTHER_NONDETERMINISM');
    expect('a schema-site replay divergence: against the specific hypothesis', cat(b => { b.p[1].outcome = 'DIVERGED'; }) === 'AGAINST_SPECIFIC_HYPOTHESIS');
    expect('an unlocalized divergence: against', cat(b => { b.r[0].pairs[0].loc.ok = false; }) === 'AGAINST_SPECIFIC_HYPOTHESIS');
    expect('t0 changes the record: against', cat(b => { b.vb[0].identical = false; }) === 'AGAINST_SPECIFIC_HYPOTHESIS');
    expect('no variation after the escalation: inconclusive', cat(b => { b.r.forEach(s => { s.varies = false; s.sourcesDiffer = false; s.pairs = [{ identical: true }]; }); b.escalated = true; }) === 'INCONCLUSIVE');
    expect('no variation without the escalation: refused', cat(b => { b.r.forEach(s => { s.varies = false; s.pairs = [{ identical: true }]; }); }) === 'THREW');
    expect('replay sources never differ: inconclusive', cat(b => { b.r[0].sourcesDiffer = false; }) === 'INCONCLUSIVE');
    expect('replay tooling: inconclusive', cat(b => { b.p[0].outcome = 'REPLAY_TOOLING'; }) === 'INCONCLUSIVE');
    expect('precedence: another source over against, every reason reported', (() => { const b = base(); b.v[0].identical = false; b.p[1].outcome = 'DIVERGED'; const v = Dm.diagnosticVerdict(b); return v.category === 'OTHER_NONDETERMINISM' && v.reasons.length === 2; })());
    const comps = [{ kind: 'R', label: 'N1AX-w2', a: 'R-LOW-1__N1AX-w2', b: 'R-HIGH-1__N1AX-w2', identical: false, paths: ['reaches.legal'], firstCall: 412, firstSchemaPos: 820, loc: { ok: true }, legal: 987654321, values: { legal: 987654321 } }];
    const rp = JSON.stringify(Dm.diagnosticReport({ comparisons: comps, verdict: { category: 'SUPPORTS', reasons: [] } }));
    expect('the report: identity verdicts, paths and call positions only, never an outcome value', !rp.includes('987654321') && rp.includes('reaches.legal') && rp.includes('"firstDivergentCall":412'));
    return fails;
  };
  const ds = diagSuite(D);
  check('G11.8 comparison rules, localization, replay outcome, session validity, escalation, comparisons, verdict and report on synthetic records: zero exclusions except the declared clock.config keys (V_T0B t0; P_FULL mode, replaySha256; P_SITE mode, t0, replaySha256); recorded clock values never compared; the verdict follows the preregistered table with its precedence; the report carries no outcome value',
    ds.length === 0, ds.join(' | '));
  for (const [id, anchor, repl] of [
    ['DC1 an allowed key that also hides clock.observed', 'for (const R of [A, B]) for (const k of allowed) if (R && R.clock && R.clock.config) delete R.clock.config[k];', 'for (const R of [A, B]) for (const k of allowed) if (R && R.clock && R.clock.config) delete R.clock.config[k]; for (const R of [A, B]) if (R && R.clock) delete R.clock.observed;'],
    ['DC2 a numeric tolerance', 'if (!allowed.length) { const identical = rawA === rawB;', 'if (!allowed.length) { const rnd = (s) => JSON.stringify(JSON.parse(s), (k, v) => (typeof v === \'number\' ? Math.round(v) : v)); const identical = rnd(rawA) === rnd(rawB);'],
    ['DC3 V_T0B also allowing mode', "V_T0B: Object.freeze(['t0']),", "V_T0B: Object.freeze(['t0', 'mode']),"],
    ['DC4 traces compared without the schema events', 'return { identical: ia === null && ie === null && ir === null,', 'return { identical: ia === null && ir === null,'],
    ['DC5 exports compared without episode ids', "export const exportDiff = (rawA, rawB) => ({ identical: typeof rawA === 'string' && typeof rawB === 'string' && rawA === rawB });", "export const exportDiff = (rawA, rawB) => ({ identical: typeof rawA === 'string' && typeof rawB === 'string' && rawA.replace(/\"id\":\"[^\"]*\"/g, '') === rawB.replace(/\"id\":\"[^\"]*\"/g, '') });"],
    ['DC6 localization ignoring the decision order', '(d.firstCall === null || p <= pos(d.firstCall, 1))', 'true'],
    ['DC7 localization accepting the forced caller', "(viaClass(via) === 'L' || viaClass(via) === 'K')", '(viaClass(via) !== null)'],
    ['DC8 any replay violation called tooling', 'if (viol.length && S && T && T.arrivals.length <= S.arrivals.length && T.arrivals.every((x, i) => JSON.stringify(x) === JSON.stringify(S.arrivals[i])))', 'if (viol.length)'],
    ['DV1 a schema-site divergence called inconclusive', "reasons.AGAINST_SPECIFIC_HYPOTHESIS.push(`${x.label}: the schema-site replay", "reasons.INCONCLUSIVE.push(`${x.label}: the schema-site replay"],
    ['DV2 a V difference called inconclusive', 'for (const x of v.filter(x => !x.identical)) reasons.OTHER_NONDETERMINISM.push(', 'for (const x of v.filter(x => !x.identical)) reasons.INCONCLUSIVE.push('],
    ['DV3 unlocalized divergences ignored', 'for (const s of r) for (const q of s.pairs.filter(q => !q.identical && !(q.loc && q.loc.ok)))', 'for (const s of r) for (const q of s.pairs.filter(q => false))'],
    ['DV4 TR differences ignored', 'for (const x of tr.filter(x => !x.identical)) reasons.OTHER_NONDETERMINISM.push(', 'for (const x of tr.filter(x => false)) reasons.OTHER_NONDETERMINISM.push('],
    ['DV5 the escalation run while a session varies', 'rVariation.every(s => s.varies === false)', 'rVariation.some(s => s.varies === false)'],
    ['DV6 replay tooling ignored', "for (const x of p.filter(x => x.outcome === 'REPLAY_TOOLING'))", 'for (const x of p.filter(x => false))'],
    ['DV7 a t0 effect ignored', 'for (const x of vb.filter(x => !x.identical))', 'for (const x of vb.filter(x => false))'],
    ['DV8 a full-replay divergence called against', "for (const x of p.filter(x => x.kind === 'P_FULL' && x.outcome === 'DIVERGED')) reasons.OTHER_NONDETERMINISM.push(", "for (const x of p.filter(x => x.kind === 'P_FULL' && x.outcome === 'DIVERGED')) reasons.AGAINST_SPECIFIC_HYPOTHESIS.push("],
    ['DV9 identical replay sources not called inconclusive', '} else if (!r.some(s => s.varies && s.sourcesDiffer)) reasons.INCONCLUSIVE.push(', '} else if (false) reasons.INCONCLUSIVE.push('],
    ['DR1 the report carrying an outcome value', "localized: c.loc ? c.loc.ok === true : null, replayOutcome: c.outcome || null })),", "localized: c.loc ? c.loc.ok === true : null, replayOutcome: c.outcome || null, legal: c.legal })),"],
    ['DS1 loop fires not checked', 'if (!crashed && o.loopFires !== rec.outcome.loopsExecuted) p.push(', 'if (false) p.push('],
    ['DS2 clock violations accepted outside the replays', 'if (o.violations.length && !replay) p.push(', 'if (false) p.push('],
    ['DS3 stderr ignored', 'if (String(stderr).trim()) p.push(', 'if (false) p.push('],
  ]) { const m = await loadMutant(once(dgSrc, anchor, repl)); mutant(`${id} is detected`, m !== null && diagSuite(m).length > 0); }

  // G11.9 the plan, plan-only by default, and the run mode's refusals
  const DP = D.planTimingDiagnostic(), dvp = D.validateDiagnosticPlan(DP);
  const byBlock = DP.reduce((m, e) => ((m[e.block] = (m[e.block] || 0) + 1), m), {});
  check('G11.9 the timing-diagnostic plan: 125 sessions + 20 conditional (R 20, R_ESC 20 conditional, P_FULL 10, P_SITE 10, V 50, V_T0B 25, TR 10) on the ten scope worlds; S5, P20 and TR5 exactly; the pinned 15 source stores; replay sources R-LOW-1 / R-HIGH-1 run earlier under the other load',
    dvp.length === 0 && DP.length === 145 && JSON.stringify(byBlock) === JSON.stringify({ R: 20, R_ESC: 20, P_FULL: 10, P_SITE: 10, V: 50, V_T0B: 25, TR: 10 })
    && JSON.stringify([...new Set(DP.filter(e => e.brainFrom).map(e => e.brainFrom))].sort()) === JSON.stringify(Object.keys(D.SOURCE_STORES).sort()) && Object.keys(D.SOURCE_STORES).length === 15
    && DP.every(e => LOCK.TIMING_DIAGNOSTIC_SCOPE.worlds.includes(e.world)) && JSON.stringify(D.SWAP_LABELS) === '["N1AX-w2","N1AX-w6","N1AX-w25","N1LX-w14","N1LX-w21"]', dvp.slice(0, 2).join(' | ') || JSON.stringify(byBlock));
  const tdJson = path.join(os.tmpdir(), 'mfw-credit1-gate-timingplan.json');
  fs.rmSync(tdJson, { force: true });
  const tpo = run(process.execPath, [path.join('experiments', 'credit1', 'run_timing_diagnostic.mjs'), '--json', tdJson]);
  let tj = null, cj = null; try { tj = JSON.parse(fs.readFileSync(tdJson, 'utf8')); cj = JSON.parse(fs.readFileSync(path.join(os.tmpdir(), 'mfw-credit1-gate-plan.json'), 'utf8')); } catch { tj = tj || null; }
  const tpOk = tpo.status === 0 && /plan only \(the default; no session is run\)/.test(tpo.stdout) && !!tj && !!cj && tj.total === 145 && tj.base === 125 && tj.planProblems.length === 0
    && JSON.stringify(tj.plan.map(e => e.file)) === JSON.stringify(DP.map(e => e.file)) && D.validateDiagnosticPlan(tj.plan, cj.plan).length === 0;
  check('G11.9b plan-only is the default (no flag, no lock, no session): 145 entries on the existing XFER-1 development configurations, every session equal to the calibration plan\'s session of its label (cell, world, configuration and agent seeds, ticks, store)',
    tpOk, tj ? `${tj.total} entries` : tpo.stderr.trim().slice(0, 140));
  if (tj && cj) {
    const pm = (f) => { const Q = tj.plan.map(e => ({ ...e })); f(Q); return D.validateDiagnosticPlan(Q, cj.plan).length > 0; };
    const at = (Q, file) => Q.find(e => e.file === file);
    mutant('PD1 a session with another configuration seed is rejected', pm(Q => { at(Q, 'V-LOW__N1A-w14').configSeed += 1; }));
    mutant('PD2 a session given another store is rejected', pm(Q => { at(Q, 'V-HIGH__N1AX-w6').brainFrom = 'T_A-w6'; }));
    mutant('PD3 an unconditional escalation is rejected', pm(Q => { at(Q, 'R-HIGH-3__N1AX-w2').conditional = false; }));
    mutant('PD4 a replay source chosen among the other runs is rejected', pm(Q => { at(Q, 'PS-HIGH-from-R-LOW-1__N1LX-w21').replayFrom = 'R-HIGH-2__N1LX-w21'; }));
    mutant('PD5 a missing primary-cell session is rejected', pm(Q => { Q.splice(Q.findIndex(e => e.file === 'V-HIGH__N0A-w2'), 1); Q.forEach((e, i) => { e.seq = i + 1; }); }));
    mutant('PD6 the t0b block on t0a is rejected', pm(Q => { at(Q, 'VB-HIGH__N1L-w25').clock = { mode: 'VIRTUAL', t0: T0A, delayMs: 500 }; }));
    mutant('PD7 a session under the other load is rejected', pm(Q => { at(Q, 'V-HIGH__N0L-w21').load = 'LOW'; }));
    mutant('PD8 a session on a world outside the scope is rejected', pm(Q => { at(Q, 'V-LOW__N0A-w6').world = 4; }));
    mutant('PD9 an export from a test session is rejected', pm(Q => { at(Q, 'V-LOW__N1A-w2').export = true; }));
  }
  const tdRefused = path.join(os.tmpdir(), 'mfw-credit1-gate-timingrefusal');
  fs.rmSync(tdRefused, { recursive: true, force: true });
  const tr1 = run(process.execPath, [path.join('experiments', 'credit1', 'run_timing_diagnostic.mjs'), '--run', '--out', tdRefused]);
  const tr2 = run(process.execPath, [path.join('experiments', 'credit1', 'run_timing_diagnostic.mjs'), '--out', tdRefused]);
  const ordT = ['timingDiagnosticRecordProblems(LOCK.TIMING_DIAGNOSTIC_AUTHORIZATION)', 'calibrationRecordProblems(LOCK.SESSION_AUTHORIZATION)', 'swapParityRecordProblems(LOCK.SWAP_PARITY_AUTHORIZATION)', 'LOCK.TIMING_DIAGNOSTIC_SCOPE.planDocSha256',
    'the output directory must be inside', "'diff', '--quiet', 'HEAD'", "imp('experiments/m7/env.js')", "step: 'C-0'", 'for (const [label, want] of Object.entries(SOURCE_STORES))', "await runEntries(plan.filter(e => e.block === 'R'))",
    'escalationNeeded(rVariation())', "await runEntries(plan.filter(e => !['R', 'R_ESC'].includes(e.block)))", 'const verdict = diagnosticVerdict({'].map(s => rtd.indexOf(s));
  check('G11.9c the run mode refuses an unauthorized run before anything is derived, built or spawned (null lock), and a run without --run; order: locks, plan document, output directory, clean tree, derivation, C-0, pinned source copies, R, the escalation rule, the remaining blocks, the verdict; the report is written only through diagnosticReport',
    tr1.status === 2 && /timing diagnostic refused: the timing diagnostic is not authorized/.test(tr1.stderr) && tr2.status === 2 && /unknown arguments/.test(tr2.stderr) && !fs.existsSync(tdRefused)
    && ordT.every(i => i > 0) && ordT.every((v, i) => i === 0 || ordT[i - 1] < v) && rtd.includes("JSON.stringify(diagnosticReport({ comparisons, verdict }), null, 2)") && (rtd.match(/writeFileSync\(path\.join\(OUT, 'report\.json'\)/g) || []).length === 1,
    `${tr1.stderr.trim().slice(0, 90)} | ${tr2.stderr.trim().slice(0, 60)}`);

  // G11.10 the clock-read census of tree A (the real-time sources a session loads)
  const CLOCK_SITES = ['main.js:4959', 'main.js:5698', 'render/candidateAnalysis.js:348', 'render/episodeManager.js:512', 'render/episodeManager.js:513', 'render/episodeManager.js:663', 'render/episodeManager.js:688',
    'render/episodeManager.js:789', 'render/episodicContextEngine.js:56', 'render/episodicContextEngine.js:118', 'render/episodicContextEngine.js:135', 'render/episodicContextEngine.js:285', 'render/episodicContextEngine.js:347',
    'render/episodicContextEngine.js:358', 'render/episodicContextEngine.js:403', 'render/longTermConsolidation.js:54', 'render/neuronVisuals.js:318', 'render/neuronVisuals.js:328', 'render/neuronVisuals.js:383',
    'render/neuronVisuals.js:387', 'render/neuronVisuals.js:424', 'render/neuronVisuals.js:427', 'render/predictionError.js:101', 'render/schemaMemory.js:133', 'render/schemaMemory.js:623',
    'render/semanticMemoryLayer.js:58', 'render/semanticProvenance.js:180', 'render/semanticProvenance.js:211', 'render/semanticVitality.js:136', 'instrumentation/traceSchema.js:34'];
  const censusFiles = ['main.js', ...fs.readdirSync(path.join(treeA, 'render')).filter(f => f.endsWith('.js')).map(f => `render/${f}`), ...fs.readdirSync(path.join(treeA, 'instrumentation')).filter(f => f.endsWith('.js')).map(f => `instrumentation/${f}`),
    'experiments/m7/run.js', 'experiments/m7/env.js', 'experiments/m7/arms.js', 'experiments/phase1_0/_driver.js', 'benchmarks/harness/headlessShim.js'];
  const census = (textOf) => { const s = [], nd = [], other = []; for (const f of censusFiles) textOf(f).split(/\r?\n/).forEach((l, i) => { const c = l.replace(/\/\/.*$/, '');
    if (/Date\.now\(/.test(c)) s.push(`${f}:${i + 1}`); if (/new Date\(/.test(c)) nd.push(`${f}:${i + 1}`); if (/performance\.now|process\.hrtime/.test(c)) other.push(`${f}:${i + 1}`); }); return { s, nd, other }; };
  const censusOk = (r) => JSON.stringify(r.s) === JSON.stringify(CLOCK_SITES) && JSON.stringify(r.nd) === '["instrumentation/sessionRecorder.js:38"]' && r.other.length === 0;
  const realText = (f) => fs.readFileSync(path.join(treeA, ...f.split('/')), 'utf8');
  const cr = census(realText);
  check('G11.10 real-time census of tree A (main.js, render/, instrumentation/, the m7 runner, the phase1_0 driver, the harness shim): exactly the 30 known Date.now() sites (the throttle read render/schemaMemory.js:133 among them), new Date only in instrumentation/sessionRecorder.js:38, no performance.now or process.hrtime',
    censusOk(cr), `${cr.s.length} Date.now sites, new Date ${cr.nd.join(', ')}`);
  mutant('CN1 an added Date.now() site is detected', !censusOk(census((f) => (f === 'render/scoring.js' ? realText(f) + '\nexport const t = () => Date.now();\n' : realText(f)))));
  mutant('CN2 a performance.now() source is detected', !censusOk(census((f) => (f === 'render/memory.js' ? realText(f) + '\nexport const p = () => performance.now();\n' : realText(f)))));

  // G11.11 what T-build leaves unchanged, and its documentation
  const unchanged = ['DESIGN.md', 'CALIBRATION_PROTOCOL.md', 'config.mjs', 'transform.mjs', 'calibrate.mjs', 'run_swap_parity.mjs', 'events.mjs', 'instruments.mjs', 'delivery.mjs', 'census.mjs', 'writecensus.mjs', 'fixtures.mjs', '.gitattributes', 'data/.gitignore', 'review', 'evidence', 'tools'].map(f => `experiments/credit1/${f}`);
  const calPlanSha = (() => { try { return sha256(fs.readFileSync(path.join(os.tmpdir(), 'mfw-credit1-gate-plan.json'))); } catch { return null; } })();
  const swapPlanSha = (() => { try { return sha256(fs.readFileSync(path.join(os.tmpdir(), 'mfw-credit1-gate-swapplan.json'))); } catch { return null; } })();
  check('G11.11 T-build leaves unchanged since its base (cb7e015): DESIGN.md, CALIBRATION_PROTOCOL.md, config.mjs, the tree builder, the calibration and swap-parity runners, events, instruments, delivery, the censuses, fixtures, review, evidence, tools; the calibration plan-only JSON (ed57fb0e...) and the swap-parity plan-only JSON (0c3c4b9a...) are byte-identical to the approved plans',
    git('diff', '--quiet', TB_BASE, '--', ...unchanged).status === 0 && calPlanSha === 'ed57fb0e7f76e39a1fb09224c328e39b634d3f6ddb32c678be1e2e4f4de42ed3' && swapPlanSha === '0c3c4b9ac20babf19126ee3279deaa66abdc1db969ab7fb0ea265f0860fcb460',
    `calibration plan ${String(calPlanSha).slice(0, 16)}, swap plan ${String(swapPlanSha).slice(0, 16)}`);
  const doc = fs.readFileSync(PLAN_DOC, 'utf8'), rdme = fs.readFileSync(path.join(HERE, 'README.md'), 'utf8');
  const ROWS = ['| **Supports the timing hypothesis** | R varies in at least one session, **and** every P-full and every P-site replay reproduces its source (where a session\'s two sources differ, each P-site replay reproduces its *own* source), **and** the traces show a throttled rebuild present in only one run at or before the first decision difference, **and** V, V′ and TR are identical | report; go to step 3 below |',
    '| **Against the specific hypothesis** | P-full reproduces but a P-site replay fails; or the decision diverges before any schema difference; or V′ differs beyond the T0 field (absolute time matters) | **STOP**: my list of clock sites is incomplete |',
    '| **Another source of nondeterminism** | any P-full replay fails; any difference in V or TR | **STOP**; no recalibration |',
    '| **Inconclusive** | R shows no variation even after escalation (hypothesis untested; V and TR still stand for these sessions); or every session\'s two sources are identical (site manipulation untested); or a replay mismatches before any decision differs (recorder defect or read-order nondeterminism) | report; you decide; no ad-hoc reruns |'];
  check('G11.12 TIMING_DIAGNOSTIC_PLAN.md holds the interpretation table unchanged, the matrix and the comparison rules; it is NOT AUTHORIZED, NOT RUN; the README documents the harness, plan-only by default, the null lock and the claim limits',
    ROWS.every(r => doc.includes(r)) && /\*\*Status: NOT AUTHORIZED, NOT RUN\.\*\*/.test(doc) && doc.includes('Total: 125 sessions, 145 with the escalation.') && doc.includes('No effect estimate, cell mean, P1/P2 value or other development-world outcome summary is computed or reported')
    && ['run_timing_diagnostic.mjs', 'TIMING_DIAGNOSTIC_PLAN.md', 'TIMING_DIAGNOSTIC_AUTHORIZATION', 'clock_preload.mjs', 'Plan-only is the default', 'built, NOT AUTHORIZED, NOT RUN', 'No effect estimate'].every(s => rdme.includes(s)));
}

// ================= G8: session records only inside authorized calibration runs; this gate runs no session =================
{
  const data = path.join(HERE, 'data');
  const files = [];
  if (fs.existsSync(data)) for (const p of fs.readdirSync(data, { recursive: true }).map(String)) {
    const abs = path.join(data, p);
    if (!fs.statSync(abs).isFile()) continue;
    const relp = p.split(path.sep).join('/');
    let json = null;
    if (/(^|\/)(summary\.json|sessions\/[^/]+\.json)$/.test(relp)) { try { json = JSON.parse(fs.readFileSync(abs, 'utf8')); } catch { json = null; } }
    files.push({ rel: relp, json });
  }
  // a run's commit must be in this history and its lock.mjs must hold the calibration-only record
  // per run kind: the authorization line and scope kind its commit's lock.mjs must hold
  const LOCK_OF = { calibration: ['export const SESSION_AUTHORIZATION = Object.freeze({ ...CALIBRATION_SCOPE,', "kind: 'DEVELOPMENT_CALIBRATION'"],
    'swap-parity': ['export const SWAP_PARITY_AUTHORIZATION = Object.freeze({ ...SWAP_PARITY_SCOPE,', "kind: 'SWAP_PARITY_CHECK'"],
    'timing-diagnostic': ['export const TIMING_DIAGNOSTIC_AUTHORIZATION = Object.freeze({ ...TIMING_DIAGNOSTIC_SCOPE,', "kind: 'TIMING_DIAGNOSTIC'"] };
  const headSeen = new Map();
  const headCarriesLock = (h, kind = 'calibration') => {
    if (typeof h !== 'string' || !/^[0-9a-f]{40}$/.test(h) || !LOCK_OF[kind]) return false;
    const key = `${h}:${kind}`;
    if (!headSeen.has(key)) {
      const anc = git('merge-base', '--is-ancestor', h, 'HEAD').status === 0;
      const src = anc ? git('show', `${h}:experiments/credit1/lock.mjs`) : null;
      headSeen.set(key, anc && src.status === 0 && LOCK_OF[kind].every(s => src.stdout.includes(s)));
    }
    return headSeen.get(key);
  };
  const tracked = git('ls-files', '--', 'experiments/credit1/data').stdout.trim().split('\n').filter(Boolean);
  const dd = K.dataDirProblems({ files, tracked, headCarriesLock });
  check('G8.1 session records exist only inside authorized development-calibration runs (the summary records the calibration-only lock, its commit carries that lock, every record is a planned in-scope session); no calibration record is tracked; nothing stray',
    dd.problems.length === 0, dd.problems.slice(0, 2).join(' | ') || `${dd.runs} run(s), ${dd.records} session record(s)`);
  const synth = (f) => {
    const S = { files: [{ rel: '.gitignore', json: null },
      { rel: 'calib-x/summary.json', json: { schema: 'credit1/1.calibration', head: 'a'.repeat(40), authorization: { ...JSON.parse(JSON.stringify(LOCK.CALIBRATION_SCOPE)), authorizedBy: 'owner' } } },
      { rel: 'calib-x/sessions/N0A-w3.json', json: { schema: 'credit1/1.session', label: 'N0A-w3', cell: 'N0A', input: { world: 3 } } },
      { rel: 'calib-x/sessions/L0-T-w2.json', json: { schema: 'learn0/1.session', label: 'L0-T-w2', input: { world: 2 } } },
      { rel: 'calib-x/brains/T_A-w3.json', json: null }, { rel: 'calib-x/logs/c0_gate.log', json: null }],
      tracked: ['experiments/credit1/data/.gitignore'], headCarriesLock: (h) => h === 'a'.repeat(40) };
    if (f) f(S);
    return K.dataDirProblems(S).problems.length > 0;
  };
  check('G8.1b the G8.1 rule accepts a well-formed authorized run (synthetic)', !synth());
  check('G8.1c the commit check: the calibration-lock commit c66f830 carries the calibration lock (not a swap-parity lock); the base commit carries neither',
    headCarriesLock('c66f83028377303a8b0a1419061ba9a002070a43', 'calibration') && !headCarriesLock('c66f83028377303a8b0a1419061ba9a002070a43', 'swap-parity') && !headCarriesLock(C.BASE_COMMIT, 'calibration'));
  // a swap-parity run is accepted only under its own lock, plan and scope
  const swapRun = (f) => {
    const S = { files: [{ rel: 'swap-x/summary.json', json: { schema: 'credit1/1.swap-parity', head: 'c'.repeat(40), authorization: { ...JSON.parse(JSON.stringify(LOCK.SWAP_PARITY_SCOPE)), authorizedBy: 'owner' } } },
      { rel: 'swap-x/sessions/N1AX-w3.json', json: { schema: 'credit1/1.session', label: 'N1AX-w3', cell: 'N1AX', input: { world: 3 } } },
      { rel: 'swap-x/sessions/N1A-OWN-w3.json', json: { schema: 'credit1/1.session', label: 'N1A-OWN-w3', cell: 'N1A', input: { world: 3 } } },
      { rel: 'swap-x/brains/T_A-w0.json', json: null }, { rel: 'swap-x/brains/COPY-T_A-w0-for-w3.json', json: null }, { rel: 'swap-x/logs/c0_gate.log', json: null }],
      tracked: ['experiments/credit1/data/.gitignore'], headCarriesLock: (h, kind) => h === 'c'.repeat(40) && kind === 'swap-parity' };
    if (f) f(S);
    return K.dataDirProblems(S).problems.length > 0;
  };
  check('G8.1d the G8.1 rule accepts a well-formed swap-parity run under the swap-parity lock (synthetic)', !swapRun());
  mutant('DG12 a swap-parity run recorded under the calibration scope fails G8.1', swapRun(S => { S.files[0].json.authorization = { ...JSON.parse(JSON.stringify(LOCK.CALIBRATION_SCOPE)), authorizedBy: 'owner' }; }));
  mutant('DG13 a swap-parity run whose commit carries only the calibration lock fails G8.1', swapRun(S => { S.headCarriesLock = (h, kind) => kind === 'calibration'; }));
  mutant('DG14 a swap-parity record that is not a planned swap session fails G8.1', swapRun(S => { S.files.push({ rel: 'swap-x/sessions/N0A-w3.json', json: { schema: 'credit1/1.session', label: 'N0A-w3', cell: 'N0A', input: { world: 3 } } }); }));
  mutant('DG15 a copy file that is not a planned copy fails G8.1', swapRun(S => { S.files.push({ rel: 'swap-x/brains/COPY-T_A-w5-for-w3.json', json: null }); }));
  mutant('DG16 calibration records inside a swap-parity run fail G8.1', swapRun(S => { S.files.push({ rel: 'swap-x/sessions/MAPON-N0L-w3.json', json: { schema: 'credit1/1.session', label: 'MAPON-N0L-w3', cell: 'N0L', input: { world: 3 } } }); }));
  mutant('DG1 a stray record directly under data/ fails G8.1', synth(S => { S.files.push({ rel: 'x.json', json: {} }); }));
  mutant('DG2 records in a directory without a calibration summary fail G8.1', synth(S => { S.files.push({ rel: 'other/sessions/N0A-w3.json', json: { schema: 'credit1/1.session', label: 'N0A-w3', cell: 'N0A', input: { world: 3 } } }); }));
  mutant('DG3 a run whose summary lacks the authorization record fails G8.1', synth(S => { S.files[1].json.authorization = null; }));
  mutant('DG4 a run whose authorization is not the calibration-only scope fails G8.1', synth(S => { S.files[1].json.authorization.aPlus = true; }));
  mutant('DG5 a run whose commit does not carry the calibration-only lock fails G8.1', synth(S => { S.files[1].json.head = 'b'.repeat(40); }));
  mutant('DG6 a tracked calibration record fails G8.1', synth(S => { S.tracked.push('experiments/credit1/data/calib-x/sessions/N0A-w3.json'); }));
  mutant('DG7 a session record that is not a planned session fails G8.1', synth(S => { S.files.push({ rel: 'calib-x/sessions/N0A-w31.json', json: { schema: 'credit1/1.session', label: 'N0A-w31', cell: 'N0A', input: { world: 31 } } }); }));
  mutant('DG8 an A+ cell record inside a run fails G8.1', synth(S => { S.files[2].json.cell = 'N0AP'; }));
  mutant('DG9 an unexpected file inside a run fails G8.1', synth(S => { S.files.push({ rel: 'calib-x/notes.txt', json: null }); }));
  mutant('DG10 an export that is not a planned export fails G8.1', synth(S => { S.files.push({ rel: 'calib-x/brains/N0A-w3.json', json: null }); }));
  mutant('DG11 a record whose content does not match its planned session fails G8.1', synth(S => { S.files[2].json.input.world = 4; }));
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
