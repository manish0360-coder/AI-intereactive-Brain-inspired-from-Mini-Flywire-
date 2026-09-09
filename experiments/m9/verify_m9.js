// ==========================================================
// M9 INSTRUMENTATION NEUTRALITY — the same discipline UQ-B used
// ==========================================================
// Every detecting assertion here is paired with a mutation that must break it.
// A gate that cannot fail proves nothing.
// ==========================================================
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { transform } from '../uqb/instrument.js';
import { transformCandidates, INJECTED_LINES, FILTER_STAGES, GUARD,
         ANCHOR_CHOICES, ANCHOR_SORT, makeLedger } from './probe.js';
import { FROZEN, inRegisteredBlock } from '../uqb/protocol.js';
import { M9_FIXTURES, assertFixtureAllowed } from './diagnose.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const U = 'file:///' + ROOT.replace(/\\/g, '/');
const MAIN = fs.readFileSync(path.join(ROOT, 'main.js'), 'utf8');

let pass = 0, fail = 0;
const P = (id, cond, msg) => {
    if (cond) { pass++; console.log(`PASS  ${id.padEnd(6)} ${msg}`); }
    else { fail++; console.log(`FAIL  ${id.padEnd(6)} ${msg}`); }
    return cond;
};
const throws = (fn) => { try { fn(); return false; } catch { return true; } };

console.log('='.repeat(78));
console.log('  M9 INSTRUMENTATION NEUTRALITY');
console.log('='.repeat(78) + '\n');

// ---- static -------------------------------------------------------------
const base = transform(MAIN);            // UQ-B layer, as the hook applies it
const withM9 = transformCandidates(base);
const bl = base.replace(/\r\n/g, '\n').split('\n');
const ml = withM9.replace(/\r\n/g, '\n').split('\n');

P('M1', ml.length - bl.length === INJECTED_LINES,
    `the transform adds exactly ${INJECTED_LINES} lines (1 begin + ${FILTER_STAGES} stages + 1 end)`);

// every added line must name the guard or the guard-derived local
const bag = new Map();
for (const l of bl) bag.set(l, (bag.get(l) || 0) + 1);
const added = [];
for (const l of ml) { const c = bag.get(l) || 0; if (c > 0) bag.set(l, c - 1); else added.push(l); }
P('M2', added.length === INJECTED_LINES && added.every(l => l.includes('__M9')),
    `all ${added.length} injected lines are single statements naming the guard`);

const def = added.find(l => /const\s+__M9\s*=/.test(l));
P('M3', !!def && def.includes(GUARD) && def.includes('? ') && def.includes(': null'),
    'the guard-derived local is defined by a conditional on ' + GUARD + ', null when unset');

// ---- mutation controls --------------------------------------------------
P('M4', throws(() => transformCandidates(base.replace(ANCHOR_SORT, 'const sorted = choices;'))),
    'MUTATION — a moved sort anchor is REFUSED');
P('M5', throws(() => transformCandidates(base.replace(ANCHOR_CHOICES, '  const choices = new Array();'))),
    'MUTATION — a changed choices declaration is REFUSED');

// a fifth filter stage must be refused: the pinned count is what makes the
// stage NUMBERING meaningful, and STAGE_NAMES would silently mislabel.
{
    const lines = base.replace(/\r\n/g, '\n').split('\n');
    const iLoop = lines.findIndex(l => l.replace(/\s+$/, '') === '  allCandidates.forEach((value, k) => {');
    const extra = lines.slice();
    extra.splice(iLoop + 1, 0, '    if (false) {', '      return;', '    }');
    P('M6', throws(() => transformCandidates(extra.join('\n'))),
        'MUTATION — a fifth filter stage is REFUSED: the pinned stage count would mislabel');
}
{
    const lines = base.replace(/\r\n/g, '\n').split('\n');
    const iLoop = lines.findIndex(l => l.replace(/\s+$/, '') === '  allCandidates.forEach((value, k) => {');
    const iPush = lines.findIndex(l => l.replace(/\s+$/, '') === '  choices.push({');
    const idx = [];
    for (let i = iLoop + 1; i < iPush; i++) if (/^\s*return;\s*(\/\/.*)?$/.test(lines[i])) idx.push(i);
    const fewer = lines.slice(); fewer.splice(idx[0], 1);
    P('M7', throws(() => transformCandidates(fewer.join('\n'))),
        'MUTATION — a removed filter stage is REFUSED');
}

// ---- CRLF ---------------------------------------------------------------
{
    const crlfIn = base.replace(/\r\n/g, '\n').replace(/\n/g, '\r\n');
    const outC = transformCandidates(crlfIn);
    P('M8', outC.includes('\r\n') && !/(^|[^\r])\n/.test(outC) &&
        outC.replace(/\r\n/g, '\n') === withM9.replace(/\r\n/g, '\n'),
        'a CRLF checkout transforms consistently and agrees with the LF transform');
}

// ---- behavioural neutrality ---------------------------------------------
const child = (mode, fx) => `
import { register } from 'node:module';
const U = ${JSON.stringify(U)};
const MODE = ${JSON.stringify(mode)};
if (MODE !== 'baseline') { globalThis.__UQB_EXPOSE__ = {}; register(U + '/experiments/m9/hook.mjs', import.meta.url); }
const env = await import(U + '/experiments/m7/env.js');
const { runOnce } = await import(U + '/experiments/m7/run.js');
let ledger = null;
if (MODE === 'armed') {
    const M9 = await import(U + '/experiments/m9/probe.js');
    ledger = M9.makeLedger();
    globalThis.__M9__ = ledger;      // armed for the WHOLE run: the strongest test
}
const rec = await runOnce({
    configSeed: ${fx.configSeed}, configIndex: ${fx.configIndex},
    agentSeed: ${FROZEN.agentSeed}, arm: ${JSON.stringify(FROZEN.m7Arm)},
    envMode: 'on', creditMode: 'on', pin: 'on', tickUnit: 'step',
    ticks: ${fx.ticks}, crashAtTick: null, warmStore: false,
});
globalThis.__M9__ = null;
process.stdout.write('@@R@@' + JSON.stringify({
    fingerprint: rec.fingerprint, artifacts: rec.artifacts,
    ledgerRecords: ledger ? ledger.records.length : null,
    evaluatedSeeds: env.evaluatedSeeds(),
}));
`;
const run = (mode, fx) => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'm9v-'));
    try {
        const f = path.join(tmp, 'c.mjs');
        fs.writeFileSync(f, child(mode, fx));
        const out = execFileSync(process.execPath, [f], { encoding: 'utf8', maxBuffer: 1 << 28 });
        return JSON.parse(out.slice(out.indexOf('@@R@@') + 5));
    } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
};
const sig = (r) => JSON.stringify({
    fp: r.fingerprint, q: r.artifacts && r.artifacts.qEntries,
    s: r.artifacts && r.artifacts.qSum, d: r.artifacts && r.artifacts.cogDraws,
});

console.log('\n-- behavioural (600 ticks, non-registered fixture) -----------------------');
const FX = { ...M9_FIXTURES[0], ticks: 600 };
assertFixtureAllowed(FX);
const b = run('baseline', FX), off = run('hooked-off', FX), on = run('armed', FX);
P('M9', sig(b) === sig(off),
    'GUARD OFF — the M9 build is byte-identical to the uninstrumented run ' +
    '(fingerprint, Q entries, Q sum, RNG draws)');
P('M10', sig(b) === sig(on),
    'GUARD ON — arming the ledger for an entire run changes NOTHING: counting only');
P('M11', on.ledgerRecords > 0 && off.ledgerRecords === null,
    `and the armed run DID record (${on.ledgerRecords} ledger entries), so M10 is not vacuous`);

const again = run('armed', FX);
P('M12', JSON.stringify(again) === JSON.stringify(on),
    'DETERMINISM — an independent process reproduces the armed run exactly');

// ---- ledger self-consistency on a live run ------------------------------
{
    const led = makeLedger();
    const h = led.begin('X', 7);
    h.reject(0); h.reject(0); h.reject(3); h.end(4);
    const r = led.records[0];
    P('M13', r.allCandidatesSize === 7 && r.rejected[0] === 2 && r.rejected[3] === 1 &&
             r.choicesLength === 4,
        'the ledger attributes rejections per call and per stage');
}

// ---- seed accounting -----------------------------------------------------
const seen = [...new Set([...b.evaluatedSeeds, ...off.evaluatedSeeds, ...on.evaluatedSeeds])];
P('M14', seen.filter(inRegisteredBlock).length === 0,
    `no registered seed was evaluated (${seen.length} distinct: ${seen.join(', ')})`);

// ---- production safety ---------------------------------------------------
const diff = execFileSync('git', ['diff', '--stat', 'HEAD', '--', 'main.js', 'render/',
    'instrumentation/', 'experiments/m7/', 'experiments/uqb/', 'research/preregistrations/'],
    { cwd: ROOT, encoding: 'utf8' }).trim();
P('M15', diff === '',
    'production source, UQ-B machinery and frozen documents are all unmodified');

console.log('\n' + '='.repeat(78));
console.log(`  ${pass} passed, ${fail} failed`);
console.log(fail === 0 ? '  M9 INSTRUMENTATION: NEUTRAL' : '  M9 INSTRUMENTATION: NOT NEUTRAL');
console.log('='.repeat(78));
process.exit(fail === 0 ? 0 : 1);
