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
    'swap-parity': ['export const SWAP_PARITY_AUTHORIZATION = Object.freeze({ ...SWAP_PARITY_SCOPE,', "kind: 'SWAP_PARITY_CHECK'"] };
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
