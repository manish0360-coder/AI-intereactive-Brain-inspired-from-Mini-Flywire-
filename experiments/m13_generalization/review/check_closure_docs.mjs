// M13 closure: documentation and evidence check, written 2026-11-18 for the closure (after the review). It changes
// nothing. It checks that the closure touched documentation only, and that the frozen evidence, the verdicts and the
// reviewed snapshot are intact. It also checks that the closure documents' links resolve, that every shortened hash in
// the M13 documents matches a real hash (known errata excepted only where an erratum records them), and that the three
// qualifications and the key numbers are present.
// Usage (repository root): node experiments/m13_generalization/review/check_closure_docs.mjs
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const M = 'experiments/m13_generalization', REVIEWED = '3602576';
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const git = (...a) => execFileSync('git', a, { encoding: 'utf8', maxBuffer: 1 << 26 });
const run = (...a) => { try { return { code: 0, out: execFileSync('node', a, { encoding: 'utf8', maxBuffer: 1 << 26 }) }; } catch (e) { return { code: e.status ?? 1, out: String(e.stdout ?? '') }; } };
const fails = [];
const ok = (c, msg) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${msg}`); if (!c) fails.push(msg); };
const read = (p) => fs.readFileSync(p, 'utf8');

// 1. frozen evidence intact
const frozen = read(`${M}/SPEC.sha256`).trim().split(/\r?\n/).map((l) => l.trim().split(/\s+/));
ok(frozen.length === 4 && frozen.every(([h, f]) => sha(fs.readFileSync(`${M}/${f}`)) === h), 'SPEC.sha256: SPEC.md, PINS.json, graph_bank.json, structure.json match');
ok(run(`${M}/pins.mjs`, '--check').code === 0, 'PINS.json matches all 44 pinned files');
const sums = read(`${M}/results/SHA256SUMS`).trim().split(/\r?\n/).map((l) => l.split(/\s+\*?/));
ok(sums.length === 13 && sums.every(([h, f]) => sha(fs.readFileSync(`${M}/results/${f}`)) === h), 'results/SHA256SUMS: 13 files match');
const result = JSON.parse(read(`${M}/results/m13_result.json`));
ok(sha(fs.readFileSync(`${M}/results/m13_result.json`)) === 'a0cd87d432d2dd93d4bc20d2f8274858c4ae3fdb3906fbac10f407f6e3390367', 'raw result a0cd87d4… unchanged');
ok(JSON.stringify(result.reading.lines) === JSON.stringify({ validity: 'VALID', netAdvantage: 'RETAINED', safety: 'SAFE', recovery: 'SHOWN', behaviouralMechanism: 'SHOWN' })
  && result.reading.summary === 'NET ADVANTAGE RETAINED ON THE MODULAR FAMILY, WITHIN THE SAFETY MARGIN', 'recorded verdicts: VALID / RETAINED / SAFE / SHOWN / SHOWN; summary unchanged');
const v = run(`${M}/results/check/verify_m13.mjs`, '.');
ok(v.code === 0 && v.out.includes('all checks pass'), 'pre-result independent check still passes');
const tr = run(`${M}/review/check_measures_from_traces.mjs`, `${M}/results/m13_result.json`);
ok(tr.code === 0 && tr.out.includes('all agree'), 'G4 inputs rebuilt from the recorder log still agree');
ok(sha(fs.readFileSync(`${M}/review/M13_REVIEW_BUNDLE.md`)) === '6402fe131e82ff11d0dd74795cb8124ef54397295d5bbad14c6e23cfb88f0ac9', 'reviewed bundle 6402fe13… kept as reviewed');

// 2. the closure changed documentation only
const changed = [...new Set([...git('diff', '--name-only', REVIEWED).split('\n'), ...git('ls-files', '--others', '--exclude-standard').split('\n')].filter(Boolean))].sort();
const allowed = new Set(['docs/engineering/PROJECT_STATE.md', `${M}/RESULTS.md`, `${M}/CLOSURE.md`, `${M}/review/REVIEW_DISPOSITION.md`, `${M}/review/GEMINI_REVIEW.md`, `${M}/review/check_closure_docs.mjs`, `${M}/review/check_closure_docs.out`]);
ok(changed.every((f) => allowed.has(f)), `files changed since ${REVIEWED}: ${changed.join(', ')}`);
const was = git('show', `${REVIEWED}:${M}/RESULTS.md`), now = read(`${M}/RESULTS.md`);
const title = was.split('\n')[0] + '\n';
const pointerEnd = now.indexOf('\n\n', title.length + 1);
const withoutPointer = title + now.slice(pointerEnd + 1);
ok(now.startsWith(title + '\n> **Amended 2026-11-18') && withoutPointer.startsWith(was) && withoutPointer.slice(was.length).startsWith('\n## Amendment after the independent review (2026-11-18)'),
  'RESULTS.md: the reviewed text is kept whole; only a pointer under the title and a dated amendment at the end were added');

// 2b. the review text, lodged verbatim after 9f13c3a (added to this check when the owner supplied the file)
const REVIEW = `${M}/review/GEMINI_REVIEW.md`, REVIEW_SHA = '7c8ab0f525b3b4c232af58edaa7538161e1dee0839017cc2e33276a1c5b0d2b9';
const reviewBytes = fs.readFileSync(REVIEW), reviewText = reviewBytes.toString('utf8');
ok(sha(reviewBytes) === REVIEW_SHA && reviewBytes.length === 7452, `GEMINI_REVIEW.md is the supplied file, byte for byte (SHA-256 ${REVIEW_SHA.slice(0, 8)}…, 7,452 bytes)`);
ok(read(`${M}/review/REVIEW_DISPOSITION.md`).includes(REVIEW_SHA), 'REVIEW_DISPOSITION.md records its full SHA-256');
ok(/\]\(GEMINI_REVIEW\.md\)/.test(read(`${M}/review/REVIEW_DISPOSITION.md`)) && /\]\(review\/GEMINI_REVIEW\.md\)/.test(read(`${M}/CLOSURE.md`)), 'REVIEW_DISPOSITION.md and CLOSURE.md link to GEMINI_REVIEW.md');
ok(reviewText.includes('DEFENSIBLE WITH SPECIFIC QUALIFICATIONS') && /MATERIAL Findings:\*\* None/.test(reviewText) && reviewText.includes('`3602576`'),
  'the review text names commit 3602576, concludes DEFENSIBLE WITH SPECIFIC QUALIFICATIONS and lists no material finding, as the disposition records');

// 3. links in the closure documents resolve
const docs = [`${M}/CLOSURE.md`, `${M}/review/REVIEW_DISPOSITION.md`, `${M}/RESULTS.md`];
const slug = (h) => h.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, '').trim().replace(/\s/g, '-');
let links = 0;
for (const d of docs) {
  const text = read(d), anchors = new Set([...text.matchAll(/^#+\s+(.*)$/gm)].map((m) => slug(m[1])));
  for (const [, target] of text.matchAll(/\]\(([^)\s]+)\)/g)) {
    if (/^https?:/.test(target)) continue;
    links++;
    const [file, anchor] = target.split('#');
    if (!file) ok(anchors.has(anchor), `${d}: anchor #${anchor}`);
    else if (!fs.existsSync(path.join(path.dirname(d), file))) ok(false, `${d}: link ${target} resolves`);
  }
}
ok(true, `${links} relative links in the closure documents checked`);

// 4. shortened hashes in the M13 documents match real hashes
const known = new Set();
const add = (h) => h && /^[0-9a-f]{40,64}$/.test(h) && known.add(h);
frozen.forEach(([h]) => add(h)); sums.forEach(([h]) => add(h));
Object.values(JSON.parse(read(`${M}/PINS.json`)).files).forEach(add);
[result.specSha256, result.pinsSha256, result.worlds.bankSha256, result.determinism.rowsSha256RunA, result.headAtLaunch, ...Object.values(result.appFiles)].forEach(add);
add(sha(fs.readFileSync(`${M}/review/M13_REVIEW_BUNDLE.md`))); add(REVIEW_SHA);
for (const c of git('log', '--format=%H', '-n', '400').split('\n')) add(c.trim());
const ERRATA = new Map([['86f0bd3f…a608e02d', 'RESULTS.md amendment, erratum']]);
const scan = [`${M}/CLOSURE.md`, `${M}/review/REVIEW_DISPOSITION.md`, `${M}/RESULTS.md`, `${M}/review/REVIEW_PACKAGE.md`];
let short = 0;
for (const d of scan) for (const [s, a, b] of read(d).matchAll(/\b([0-9a-f]{6,})…([0-9a-f]{3,})\b/g)) {
  short++;
  const match = [...known].some((h) => h.startsWith(a) && h.endsWith(b));
  if (!match) ok(ERRATA.has(s) && read(`${M}/RESULTS.md`).includes(`shortens the core-row SHA-256 as \`${s}\``), `${d}: ${s} is a known erratum, recorded (${ERRATA.get(s) ?? 'none'})`);
}
for (const d of scan) for (const [s] of read(d).matchAll(/(?<!…)\b[0-9a-f]{7,8}\b(?!…)/g)) if (![...known].some((h) => h.startsWith(s)) && !/^\d+$/.test(s)) ok(false, `${d}: ${s} matches no known hash or commit`);
ok(true, `${short} shortened hashes checked against ${known.size} known hashes and commits`);

// 5. the three qualifications and the key numbers are where the owner asked them to be
const C = read(`${M}/CLOSURE.md`), R = read(`${M}/RESULTS.md`), P = read('docs/engineering/PROJECT_STATE.md'), D = read(`${M}/review/REVIEW_DISPOSITION.md`);
const q = [/M12's detour findings/, /133 of 165/, /count/];
for (const [name, t] of [['CLOSURE.md', C], ['RESULTS.md amendment', R.slice(R.indexOf('## Amendment after the independent review'))], ['PROJECT_STATE.md', P], ['REVIEW_DISPOSITION.md', D]]) ok(q.every((re) => re.test(t)), `${name}: all three qualifications present`);
ok(/\*\*Status: CLOSED, 2026-11-18/.test(C) && /M13 CLOSED/.test(P) && /M13 is CLOSED/.test(R.split('\n').slice(0, 6).join('\n')), 'M13 marked CLOSED in CLOSURE.md, PROJECT_STATE and the RESULTS.md pointer');
const cr = result.analysis.criteria, f1 = (x) => x.toFixed(1), f2 = (x) => x.toFixed(2);
const nums = [`+${f1(cr.G1_mix.mean)} steps [${f1(cr.G1_mix.lo)}, ${f1(cr.G1_mix.hi)}]`, `+${f1(cr.G2_RARE_cost.mean)} [${f1(cr.G2_RARE_cost.lo)}, ${f1(cr.G2_RARE_cost.hi)}]`,
  `+${f1(cr.G3_OFTEN_afterReversed.mean)} [${f1(cr.G3_OFTEN_afterReversed.lo)}, ${f1(cr.G3_OFTEN_afterReversed.hi)}]`, `+${f2(cr.G4_OFTEN_metAndReturned.mean)} [${f2(cr.G4_OFTEN_metAndReturned.lo)}, ${f2(cr.G4_OFTEN_metAndReturned.hi)}]`,
  `standardized ${f2(result.analysis.secondary.standardizedEffectG1.value)}`, `${cr.G2_RARE_cost.positive} of 165`];
const A3 = result.analysis.secondary.attribution.OFTEN.falseAlarms;
nums.push(`+${f1(A3.mean)} [−${f1(-A3.lo)}, ${f1(A3.hi)}]`);
ok(nums.every((s) => C.includes(s)), `CLOSURE.md numbers match the result: ${nums.join('; ')}`);

console.log(fails.length ? `\n${fails.length} FAILURES` : '\nall closure checks pass');
process.exit(fails.length ? 1 : 0);
