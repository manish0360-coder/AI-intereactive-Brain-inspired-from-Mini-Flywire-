// MCF-1 C2 registration PREFLIGHT.  Read-only: it never writes into the repository, never registers, never runs a stage.
//
//   node c2_preflight.mjs <repo> [--texts texts.json] [--declared-seed N --declared-index N --declared-accepted N --declared-env HEX64]
//                         [--decision-ref "text"] [--emit <dir outside the repo>]
//
// It answers one question: if the proposed record were committed now, would every precondition hold?  It fails closed:
// a missing input is PENDING (exit 3), never PASS, and any exception is FAIL (exit 1).  `--declared-*` are the values the
// Research Director declared final; there are NO defaults, so without them the configuration check stays PENDING.  The tool
// does not decide scientific adequacy and cannot grant any authorization; its PASS means only "consistent with the
// committed repository and the supplied declaration".
//
// --emit writes the exact proposed trajectory_blocks.js and registry README to a directory outside the repository, only
// when no check FAILED.  Copying them into the repository, and the commit, are separate acts that need C2 authorization.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const argv = process.argv.slice(2);
const REPO = path.resolve(argv[0] || '.');
const opt = (name) => { const i = argv.indexOf(`--${name}`); return i >= 0 && i + 1 < argv.length ? argv[i + 1] : undefined; };
const H = (b) => crypto.createHash('sha256').update(b).digest('hex');
const imp = (rel) => import(pathToFileURL(path.join(REPO, rel)).href);
const git = (...a) => execFileSync('git', ['-C', REPO, ...a], { encoding: 'utf8' }).trim();
const results = [];
const note = (id, name, status, detail = '') => { results.push({ id, name, status, detail }); console.log(`${status.padEnd(7)} ${id} ${name}${detail ? ' :: ' + detail : ''}`); };
const guard = async (id, name, fn) => { try { const r = await fn(); if (r === 'PENDING') return; if (r !== true && typeof r !== 'string') note(id, name, 'FAIL', 'predicate false'); else if (r === true) note(id, name, 'PASS'); else note(id, name, 'PASS', r); } catch (e) { note(id, name, 'FAIL', String(e && e.message ? e.message : e).split('\n')[0].slice(0, 240)); } };
const fail = (m) => { throw new Error(m); };

const C = await imp('experiments/mcf1/config.mjs');
const L = await imp('experiments/mcf1/lock.mjs');
const S = await imp('experiments/mcf1/scan.mjs');
const T = await imp('experiments/registry/typed_v2.js');
const win = C.BLOCK, lo = win.start, hi = win.start + win.scanLength - 1;
const evDir = path.join(REPO, 'experiments/mcf1/scan_records', `${win.start}-${win.scanLength}`);
let evidence = null;

// ---- P1 repository ----
await guard('P01', 'the tracked tree is clean, on main, HEAD equals origin/main', () => {
  if (git('status', '--porcelain', '--untracked-files=no') !== '') fail('tracked changes exist');
  if (git('rev-parse', '--abbrev-ref', 'HEAD') !== 'main') fail('not on main');
  if (git('rev-parse', 'HEAD') !== git('rev-parse', 'origin/main')) fail('HEAD differs from origin/main');
  return `HEAD ${git('rev-parse', '--short', 'HEAD')}`;
});
// ---- P2 authority: registration must not grant anything ----
await guard('P02', 'the design is unfrozen, the pin is null and the scan authorization is exactly the candidate window', async () => {
  if (C.FROZEN !== false) fail('FROZEN is not false');
  const a = fs.readFileSync(path.join(REPO, 'experiments/mcf1/authorization.mjs'), 'utf8');
  if (!/export const FREEZE_RECORD_SHA256 = null;/.test(a)) fail('the pin is not null');
  const sa = L.scanAuthorisation();
  if (sa.start !== win.start || sa.length !== win.scanLength) fail('the scan authorization is not the candidate window');
  let refusal = null; try { L.officialAuthorisation(); } catch (e) { refusal = e.message; }
  if (refusal === null) fail('officialAuthorisation() is granted');
  return `official stage refuses: ${refusal.replace(/^MCF-1 official stage refused: /, '')}`;
});
await guard('P03', 'no MCF-1 block is registered and the block module is the empty export', () => {
  if (T.TRAJECTORY_BLOCKS.length !== 0 || T.trajectory.blocks.length !== 0) fail(`${T.trajectory.blocks.length} block(s) already registered`);
  return fs.readFileSync(path.join(REPO, 'experiments/registry/trajectory_blocks.js'), 'utf8').includes('export const TRAJECTORY_BLOCKS = Object.freeze([]);') || fail('the module is not the empty export');
});
// ---- P4 evidence ----
await guard('P04', 'the lodged admission evidence matches its sidecar and its own arithmetic and covers exactly the configured window', () => {
  const f = path.join(evDir, 'admitted.json'), sf = path.join(evDir, 'admitted.json.sha256');
  if (!fs.existsSync(f) || !fs.existsSync(sf)) fail('the evidence or its sidecar is not lodged');
  const bytes = fs.readFileSync(f);
  if (fs.readFileSync(sf, 'utf8').trim() !== H(bytes)) fail('the file does not match its sidecar');
  if (git('ls-files', '--error-unmatch', path.relative(REPO, f).split(path.sep).join('/')) === '') fail('the evidence is not tracked');
  const a = JSON.parse(bytes.toString('utf8')), s = a.summary, adm = a.admitted, rej = a.rejected;
  if (s.start !== win.start || s.length !== win.scanLength || s.lastRaw !== hi || s.scanned !== win.scanLength) fail('the window differs from the configured one');
  if (s.study !== C.STUDY || s.category !== 'registered') fail('not a registered admission of this study');
  const asc = (arr) => arr.every((v, i) => Number.isSafeInteger(v) && v >= lo && v <= hi && (i === 0 || v > arr[i - 1]));
  if (!asc(adm) || !asc(rej.map(r => r.raw))) fail('ordering or bounds');
  if (new Set([...adm, ...rej.map(r => r.raw)]).size !== win.scanLength || adm.length + rej.length !== win.scanLength) fail('accounting');
  if (s.admitted !== adm.length || s.rejected !== rej.length) fail('counts');
  if (s.admittedSha256 !== H(adm.join(','))) fail('the admitted-list hash');
  if (a.sha256 !== H(C.canonicalJson(s))) fail('the result hash');
  evidence = { a, s, adm, rej, fileSha256: H(bytes) };
  return `${adm.length} admitted, ${rej.length} rejected, list ${s.admittedSha256.slice(0, 12)}…, file ${evidence.fileSha256.slice(0, 12)}…`;
});
// ---- P5 registry acceptance of the proposed block (in memory) ----
let proposed = null, digestAfter = null;
await guard('P05', 'the registry accepts the proposed block: every member is AVAILABLE before and REPRODUCTION after, no conflict', () => {
  if (evidence === null) fail('no evidence');
  const block = L.blockFromAdmission({ admitted: evidence.adm, artifact: 'preflight', authorization: 'preflight', why: 'preflight' });
  const base = { records: [...T.trajectory.records], heldOut: [...T.trajectory.heldOut], authorizations: [...T.trajectory.authorizations] };
  // the registry exactly as committed (every existing block included), then with the proposed block added
  const before = T.createTrajectoryRegistry({ ...base, blocks: [...T.trajectory.blocks] }), after = T.createTrajectoryRegistry({ ...base, blocks: [...T.trajectory.blocks, block] });
  for (const v of evidence.adm) {
    const b = before.checkUse(T.trajectorySeed(v), { study: C.STUDY, category: 'registered' }).decision;
    if (b !== 'AVAILABLE') fail(`member ${v} is ${b} before registration`);
    const a = after.checkUse(T.trajectorySeed(v), { study: C.STUDY, category: 'registered' }).decision;
    if (a !== 'REPRODUCTION') fail(`member ${v} is ${a} after registration`);
  }
  proposed = block;
  return `${evidence.adm.length} members; hull [${block.lo}, ${block.hi}], ${block.excluded.length} exclusions`;
});
// ---- P6 configuration identity: the declaration is supplied, never defaulted ----
const decl = { seed: opt('declared-seed'), index: opt('declared-index'), accepted: opt('declared-accepted'), env: opt('declared-env') };
if ([decl.seed, decl.index, decl.accepted, decl.env].some(v => v === undefined)) {
  note('P06', 'the committed study configuration equals the declared-final values', 'PENDING', 'no declaration supplied (--declared-seed/-index/-accepted/-env): configuration finality is a decision of the Research Director');
} else {
  await guard('P06', 'the committed study configuration equals the declared-final values', () => {
    const sc = C.STUDY_CONFIGURATION;
    if (sc.seed !== Number(decl.seed) || sc.index !== Number(decl.index) || sc.acceptedSeed !== Number(decl.accepted)) fail(`committed ${sc.seed}/${sc.index}/${sc.acceptedSeed} differs from the declaration`);
    if (sc.environment.sha256 !== decl.env.toLowerCase()) fail('the committed environment digest differs from the declaration');
    if (sc.adoptedFromDevelopment !== true) fail('the adoption from development is not disclosed');
    return `${sc.seed}/${sc.index}/${sc.acceptedSeed}, environment ${sc.environment.sha256.slice(0, 12)}…`;
  });
}
// ---- P7 wording ----
const textsPath = opt('texts');
let texts = null;
if (textsPath === undefined) note('P07', 'the three text fields are valid and consistent with the evidence', 'PENDING', 'no --texts supplied');
else {
  await guard('P07', 'the three text fields are valid and consistent with the evidence', () => {
    texts = JSON.parse(fs.readFileSync(path.resolve(textsPath), 'utf8'));
    for (const k of ['authorization', 'artifact', 'why']) if (typeof texts[k] !== 'string' || texts[k].trim() === '') fail(`${k} is empty`);
    const extra = Object.keys(texts).filter(k => !['authorization', 'artifact', 'why'].includes(k));
    if (extra.length) fail(`unexpected keys ${extra.join(',')}`);
    if (evidence === null) fail('no evidence to check the texts against');
    const ref = opt('decision-ref');
    const claims = /(user|director)[- ]?(authori[sz]ed|approved)|registration\b[^.]*\b(is|was|has been)\s+(authori[sz]ed|approved)|\bapproved (by|for registration)/i;
    if (claims.test(texts.authorization) && !(ref && texts.authorization.includes(ref))) fail('the authorization text asserts an approval but no --decision-ref is cited inside it');
    const rel = `experiments/mcf1/scan_records/${win.start}-${win.scanLength}/admitted.json`;
    for (const [what, needle] of [['the admission result hash', evidence.a.sha256], ['the admitted-list hash', evidence.s.admittedSha256], ['the reservation inventory hash', evidence.s.inventorySha256], ['the lodged evidence path', rel]]) {
      if (typeof needle !== 'string' || needle === '') fail(`the evidence carries no ${what}`);
      if (!texts.artifact.includes(needle)) fail(`artifact does not name ${what}`);
    }
    const m = texts.why.match(/(\d+) admitted; (\d+) rejected/);
    if (!m || Number(m[1]) !== evidence.adm.length || Number(m[2]) !== evidence.rej.length) fail('why states other counts than the evidence');
    return 'non-empty; artifact names the result hash, list hash, inventory hash and the lodged path; why states the evidence counts; no unsupported approval claim';
  });
}
// ---- P8 the build identity and sources do not move (registration is data only) ----
await guard('P08', 'registration is data only: the H1-R build identity record equals a derivation from HEAD and the module is outside the declared sources', () => {
  const out = execFileSync(process.execPath, [path.join(REPO, 'experiments/h1r/build_identity.mjs'), '--check'], { encoding: 'utf8' });
  if (!/equals a derivation from HEAD/.test(out)) fail(out.trim());
  if (L.SOURCE_FILES.includes('experiments/registry/trajectory_blocks.js')) fail('the module is a declared source');
  return 'build_identity --check: equals; sourcesSha256 ' + L.sourcesDigest().sha256.slice(0, 12) + '…';
});

// ---- the emission (outside the repository, only if nothing failed and the inputs exist) ----
const emit = opt('emit');
const anyFail = results.some(r => r.status === 'FAIL'), anyPending = results.some(r => r.status === 'PENDING');
if (emit !== undefined) {
  if (anyFail) note('E01', 'emit the proposed files', 'FAIL', 'refused: a check failed');
  else if (texts === null || proposed === null) note('E01', 'emit the proposed files', 'PENDING', 'needs --texts and a passing evidence check');
  else {
    const out = path.resolve(emit), rel = path.relative(REPO, out);
    if (rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel))) note('E01', 'emit the proposed files', 'FAIL', 'refused: the destination is inside the repository');
    else {
      const block = L.blockFromAdmission({ admitted: evidence.adm, artifact: texts.artifact, authorization: texts.authorization, why: texts.why });
      const original = fs.readFileSync(path.join(REPO, 'experiments/registry/trajectory_blocks.js'), 'utf8').replace(/\r\n/g, '\n');
      const stateOld = "// STATE: EMPTY. No study has a block. Nothing is registered, reserved or consumed by this file.\n// A block is added only by a separately authorised commit that carries the admitted list's\n// SHA-256, the configuration identity and the authorization text, and that commit must keep\n// verify_blocks.js green.\n";
      const stateNew = `// STATE: ONE BLOCK. Study MCF-1 holds the block of the candidate window ${win.start} + ${win.scanLength}\n// (${evidence.adm.length} members, ${evidence.rej.length} excluded seeds, listSha256 ${evidence.s.admittedSha256}).\n// A block is added only by a separately authorised commit that carries the admitted list's\n// SHA-256, the configuration identity and the authorization text, and that commit must keep\n// verify_blocks.js green.\n`;
      const exportOld = 'export const TRAJECTORY_BLOCKS = Object.freeze([]);\n';
      if (original.split(stateOld).length !== 2 || original.split(exportOld).length !== 2) note('E01', 'emit the proposed files', 'FAIL', 'the module header differs from the expected one');
      else {
        const text = original.replace(stateOld, stateNew).replace(exportOld, S.renderBlocksModule([block]));
        const readme = fs.readFileSync(path.join(REPO, 'experiments/registry/README.md'), 'utf8').replace(/\r\n/g, '\n');
        const rOld = '| `trajectory_blocks.js` | block data. **Empty.** Nothing is registered, reserved or consumed |';
        const rNew = `| \`trajectory_blocks.js\` | block data. **One block:** study MCF-1, the candidate window ${win.start.toLocaleString('en-US')} + ${win.scanLength.toLocaleString('en-US')} (${evidence.adm.length.toLocaleString('en-US')} members, ${evidence.rej.length} excluded). Its members are consumed by MCF-1 and refused to every other study |`;
        if (readme.split(rOld).length !== 2) note('E01', 'emit the proposed files', 'FAIL', 'the README row differs from the expected one');
        else {
          fs.mkdirSync(out, { recursive: true });
          fs.writeFileSync(path.join(out, 'trajectory_blocks.js'), text);
          fs.writeFileSync(path.join(out, 'README.md'), readme.replace(rOld, rNew));
          const after = T.createTrajectoryRegistry({ records: [...T.trajectory.records], heldOut: [...T.trajectory.heldOut], authorizations: [...T.trajectory.authorizations], blocks: [block] });
          digestAfter = after.digest();
          note('E01', 'emit the proposed files', 'PASS', `trajectory_blocks.js ${H(text).slice(0, 16)}… (${Buffer.byteLength(text)} bytes), registry digest after ${digestAfter}`);
        }
      }
    }
  }
}
// the verdict counts the emission step too: it was evaluated after the checks above
const verdict = results.some(r => r.status === 'FAIL') ? 'FAIL' : results.some(r => r.status === 'PENDING') ? 'PENDING' : 'PASS';
console.log(JSON.stringify({ verdict, counts: { pass: results.filter(r => r.status === 'PASS').length, pending: results.filter(r => r.status === 'PENDING').length, fail: results.filter(r => r.status === 'FAIL').length }, registryDigestAfter: digestAfter }));
process.exit(verdict === 'PASS' ? 0 : verdict === 'PENDING' ? 3 : 1);
