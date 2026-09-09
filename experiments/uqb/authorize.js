// ==========================================================
// UQ-B FINAL PRE-COLLECTION AUTHORIZATION GATE
// ==========================================================
// The 13 mechanical checks required by the Director ruling of 2026-09-09
// (GO TO MAIN UQ-B COLLECTION). Read-only. Consumes no seed, runs no agent.
//
// This gate does not re-argue the science. It confirms that the repository and
// the frozen artifacts are in exactly the state the ruling authorises, and that
// the seed protections are still fail-closed, immediately before collection.
// ==========================================================
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { FROZEN, assertSeedAllowed, processAuthorisedForCollection,
         enumerateCandidates, inRegisteredBlock } from './protocol.js';
import { STRESS } from './stress.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const PRE = path.join(ROOT, 'research/preregistrations');
const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8' }).trim();
const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');

let pass = 0, fail = 0;
const P = (n, cond, msg) => {
    if (cond) { pass++; console.log(`PASS  ${String(n).padStart(2)}  ${msg}`); }
    else { fail++; console.log(`FAIL  ${String(n).padStart(2)}  ${msg}`); }
    return cond;
};
const throws = (fn) => { try { fn(); return false; } catch { return true; } };

console.log('='.repeat(78));
console.log('  UQ-B FINAL PRE-COLLECTION AUTHORIZATION GATE');
console.log('='.repeat(78) + '\n');

// 1
P(1, git('rev-parse', 'HEAD') === git('rev-parse', 'origin/main'),
    `HEAD == origin/main (${git('rev-parse', '--short', 'HEAD')})`);

// 2
P(2, git('status', '--porcelain', '--untracked-files=no') === '',
    'working tree clean (tracked)');

// 3-6 — digests, compared to the values the machinery itself carries
const DIG = {
    'UQB_PREREGISTRATION.md': FROZEN.preregistration,
    'UQB_PREREGISTRATION_ERRATUM_01.md': FROZEN.erratum01,
    'UQB_PREREGISTRATION_ERRATUM_02.md': FROZEN.erratum02,
};
P(3, sha(path.join(PRE, 'UQB_PREREGISTRATION.md')) === DIG['UQB_PREREGISTRATION.md'],
    `UQB_PREREGISTRATION.md digest unchanged (${FROZEN.preregistration.slice(0, 16)}...)`);
P(4, sha(path.join(PRE, 'UQB_PREREGISTRATION_ERRATUM_01.md')) === DIG['UQB_PREREGISTRATION_ERRATUM_01.md'],
    `ERR-01 digest unchanged (${FROZEN.erratum01.slice(0, 16)}...)`);
P(5, sha(path.join(PRE, 'UQB_PREREGISTRATION_ERRATUM_02.md')) === DIG['UQB_PREREGISTRATION_ERRATUM_02.md'],
    `ERR-02 digest unchanged (${FROZEN.erratum02.slice(0, 16)}...)`);

// ERR-03 has no constant in the machinery — it changed no definition — so it is
// verified against its own committed sidecar.
const err03 = fs.readFileSync(path.join(PRE, 'UQB_PREREGISTRATION_ERRATUM_03.sha256'), 'utf8')
    .split('\n').filter(l => l && !l.startsWith('#')).pop().trim().split(/\s+/)[0];
P(6, sha(path.join(PRE, 'UQB_PREREGISTRATION_ERRATUM_03.md')) === err03,
    `ERR-03 digest verified against its sidecar (${err03.slice(0, 16)}...)`);

// 7
P(7, FROZEN.seedLo === 897000 && FROZEN.seedHi === 897999,
    `registered block is exactly ${FROZEN.seedLo}-${FROZEN.seedHi}`);

// 8 — the stress block cannot enter the registered collection, two ways:
//     its seeds are refused in collection mode, and the enumerator refuses
//     any bounds but the frozen ones.
const stressRefused = [STRESS.seedLo, 896050, STRESS.seedHi]
    .every(s => throws(() => assertSeedAllowed(s, { collection: true })));
const boundsRefused =
    throws(() => enumerateCandidates({ makeConfig: () => { throw new Error('unreachable'); } },
        { lo: STRESS.seedLo, hi: STRESS.seedHi, collection: true })) &&
    throws(() => enumerateCandidates({ makeConfig: () => { throw new Error('unreachable'); } },
        { lo: 896000, hi: 897999, collection: true }));
P(8, stressRefused && boundsRefused,
    'the stress block cannot enter the registered collection: its seeds are refused in ' +
    'collection mode, and widened enumeration bounds are refused');

// 9 — no registered seed CONSUMED.
//
// A registered-block number may legitimately appear in an artifact as half of
// the range token "897000-897999" — every provenance header states which block
// is off-limits, and the liveness artifact records "frozenBlock". Those are
// declarations that the block was NOT consumed, so a scan that counts them
// reports the opposite of the truth. Range tokens are therefore neutralised
// first, and only a STANDALONE registered literal — how an actually consumed
// seed would appear, as a configSeed value or in a seed list — counts.
const dataDir = path.join(HERE, 'data');
const resDir = path.join(HERE, 'results');
const artifacts = [];
for (const [dir, files] of [[dataDir, fs.existsSync(dataDir) ? fs.readdirSync(dataDir) : []],
                            [resDir, fs.existsSync(resDir) ? fs.readdirSync(resDir) : []]]) {
    for (const f of files) {
        const p = path.join(dir, f);
        if (fs.statSync(p).isFile()) artifacts.push(p);
    }
}
const scanConsumed = (raw) => {
    const txt = String(raw).replace(/\b\d{6}\s*-\s*\d{6}\b/g, '<range>');
    return [...txt.matchAll(/\b(\d{6})\b/g)]
        .map(m => Number(m[1])).filter(inRegisteredBlock);
};
const consumedIn = artifacts.filter(p => scanConsumed(fs.readFileSync(p, 'utf8')).length > 0);
P(9, consumedIn.length === 0,
    `no registered seed is recorded as consumed in any of the ${artifacts.length} existing ` +
    `artifacts (range declarations neutralised first)` +
    (consumedIn.length ? ` — found in ${consumedIn.map(p => path.basename(p)).join(', ')}` : ''));

// 9m — ANTI-VACUITY. The control binds the measurement INPUT: a real artifact's
// bytes with one consumed-seed record planted in it. A predicate that cannot
// see this would report "clean" for a collection that had already run.
{
    const real = fs.readFileSync(path.join(resDir, 'uqb_liveness.json'), 'utf8');
    const planted = real.replace(/}\s*$/, `, "configSeed": ${FROZEN.seedLo + 42} }`);
    const caught = scanConsumed(planted);
    P('9m', caught.length === 1 && caught[0] === FROZEN.seedLo + 42 &&
            scanConsumed(real).length === 0,
        'MUTATION — a planted consumed-seed record IS detected, and the same artifact ' +
        'without it is clean, so check 9 is not vacuous');
}

// 10 — the five files the collection driver writes. `.gitignore` is tracked
//      configuration, not output, so a bare file count would misreport.
const OUTPUTS = [
    path.join(dataDir, 'readouts.jsonl'),
    path.join(dataDir, 'candidates.jsonl'),
    path.join(dataDir, 'INTEGRITY.sha256'),
    path.join(resDir, 'uqb_results.json'),
    path.join(resDir, 'uqb_results.sha256'),
];
const present = OUTPUTS.filter(p => fs.existsSync(p));
P(10, present.length === 0,
    `no prior main-collection output exists (checked ${OUTPUTS.length} driver output paths)` +
    (present.length ? ` — found ${present.map(p => path.basename(p)).join(', ')}` : ''));

// 11 — fail-closed in both required conditions
const guardOk =
    // call site asks for collection, process not authorised -> refused
    !processAuthorisedForCollection() &&
    throws(() => assertSeedAllowed(FROZEN.seedLo, { collection: true })) &&
    // process not authorised, call site not collection -> registered seed refused
    throws(() => assertSeedAllowed(FROZEN.seedLo, { collection: false })) &&
    throws(() => assertSeedAllowed(FROZEN.seedHi)) &&
    // held-out floor still refused unconditionally
    throws(() => assertSeedAllowed(900500, { collection: true }));
P(11, guardOk,
    'the collection guard is fail-closed: BOTH the call-site flag and ' +
    'UQB_COLLECTION_AUTHORISED=1 are required, and the held-out floor is refused outright');

// 12
P(12, git('diff', '--stat', 'HEAD', '--', 'main.js', 'render/', 'instrumentation/',
    'experiments/m7/') === '', 'no production source modification');

// 13
P(13, git('diff', '--stat', 'HEAD', '--', 'research/preregistrations/') === '',
    'no preregistration modification');

console.log('\n' + '='.repeat(78));
console.log(`  ${pass} passed, ${fail} failed`);
console.log(fail === 0
    ? '  AUTHORIZATION GATE: GREEN — collection may proceed exactly as frozen'
    : '  AUTHORIZATION GATE: RED — collection must NOT begin');
console.log('='.repeat(78));
process.exit(fail === 0 ? 0 : 1);
