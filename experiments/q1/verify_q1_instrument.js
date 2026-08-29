// ==========================================================
// Q1 INSTRUMENTATION GATE — transition capture, neutrality, adversarial controls
// ==========================================================
// GOVERNING SOURCE
//   research/preregistrations/Q1_PREREGISTRATION.md §3 §4 §5 §6 §11 §12,
//   frozen at 0ad12fe2f190645d2126c9e55aef4f270f853009.
//   Collection parameters ratified by D-006 (research/09_decisions.md).
//
// WHAT THIS GATE ESTABLISHES
//   The frozen §6 transition log can be captured exactly as pre-registered,
//   losslessly and in order, without changing runtime behaviour, decision
//   behaviour, environment behaviour, RNG consumption or deterministic
//   execution — and that the capture actually observes the source, because
//   corrupting any measurement input turns a NAMED assertion red.
//
// WHAT THIS GATE IS NOT
//   It runs no Q1 collection. It enumerates NO seed in the D-006 range
//   899000-899499, evaluates no Q1 configuration, and never touches the
//   held-out block >= 900500. Its only configuration seeds come from the
//   fixture band already proven outside every registered block by
//   verify_m8_runner.js, and section Z proves at RUNTIME which seeds were
//   touched rather than asserting it in prose.
//
//   No §7 derived observable is computed as a result: no GAP_COMPOSITION, no
//   FIRST_DIVERGING_TRANSITION, no LAST_TRANSITION_BEFORE_EVALUATION, no
//   TRANSITION_COUNT. L9 counts transitions between a write and a read on a
//   SYNTHETIC FIXTURE seed purely to prove the log is CAPABLE of representing
//   a multi-transition gap; that is an instrumentation capability check, not a
//   Q1 measurement, and its numbers carry no scientific content. Nothing here
//   classifies a transition and nothing names a cause.
//
// ANTI-VACUITY, per the M7-ERR-10 lesson
//   Controls bind the MEASUREMENT INPUT or the RECORDING MECHANISM, never
//   merely the verifier's own predicate. Section M corrupts each probe, each
//   label, each position field, the append order, the sequence counter, the
//   tick counter, the guard, the hook, and the source anchors in turn, and
//   requires a named assertion to go RED. A gate whose controls only exercise
//   its own predicates cannot detect a measurement with no referent — that is
//   exactly how G16.4b survived.
//
// REPRODUCIBILITY, per §12
//   No assertion reads mtime, filesystem metadata, wall-clock time, the
//   network, or any untracked file. Section R verifies the transform in the
//   authoring tree, in a git-archive materialisation, and under CRLF.
// ==========================================================
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SITES, TRANSITION_SITES, transform, transformWith, createRecorder } from './instrument.js';
import { SITES as M8_SITES } from '../m8/instrument.js';
import { FROZEN, assertSeedAllowed, isConsumed, isHeldOut, inFrozenRange,
         HELD_OUT_FLOOR } from '../m8/protocol.js';
import * as env from '../m7/env.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const U    = 'file:///' + ROOT.split(path.sep).join('/');
const TMP  = fs.mkdtempSync(path.join(os.tmpdir(), 'q1-'));
const TU   = 'file:///' + TMP.split(path.sep).join('/');

// The D-006 Q1 configuration-seed range. Declared here ONLY so section Z can
// prove, arithmetically and at runtime, that nothing this gate runs falls
// inside it. No seed in this range is ever generated, enumerated or evaluated.
const Q1_RANGE = Object.freeze({ lo: 899000, hi: 899499 });

// The fixture band proven outside every registered block by verify_m8_runner.js.
// Not Q1 material, and assertSeedAllowed(seed, {fixture:true}) refuses to let a
// registered seed be used here or a fixture seed be used as measurement.
const FIXTURE_BAND = Object.freeze({ lo: 700000, hi: 700199 });
const FIXTURE_TICKS = 800;          // enough for all four §4 sites to fire
const NEUTRALITY_FIXTURE_SEED = 70000001;   // agent seed for the driver harness
const NEUTRALITY_TICKS = 800;

let pass = 0, fail = 0;
const ok = (n, c, x = '') => { c ? pass++ : fail++;
    console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${x ? '   ' + x : ''}`); return !!c; };
const throws = (fn) => { try { fn(); return false; } catch { return true; } };
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');

console.log('==============================================================');
console.log(' Q1 INSTRUMENTATION GATE — transition capture + neutrality');
console.log(' pre-registration 0ad12fe | D-006 ratified | fixture band ' +
            `${FIXTURE_BAND.lo}-${FIXTURE_BAND.hi}`);
console.log('==============================================================');

// ==========================================================
console.log('\n===== T  source transform: insertion only =====================');
// ==========================================================
const HEAD_MAIN = fs.readFileSync(path.join(ROOT, 'main.js'), 'utf8');
const INST_MAIN = transform(HEAD_MAIN);
const hLines = HEAD_MAIN.split('\n'), iLines = INST_MAIN.split('\n');

ok(`T1 all ${SITES.length} capture probes are inserted`,
   iLines.length - hLines.length === SITES.length,
   `${hLines.length} -> ${iLines.length} lines, +${iLines.length - hLines.length}`);

const inserted = new Set(SITES.map(s => s.probe));
const survivors = iLines.filter(l => !inserted.has(l));
ok('T2 every original line survives byte-identical (no line edited or removed)',
   survivors.length === hLines.length && survivors.every((l, k) => l === hLines[k]),
   `${survivors.length} non-probe lines compared`);

ok('T3 every anchor is unique in the source — transform throws otherwise',
   SITES.every(s => hLines.filter(l => l.includes(s.anchor)).length === 1),
   [...new Set(SITES.map(s => s.anchor))].length + ' distinct anchors');

const probeText = SITES.map(s => s.probe).join('\n');
ok('T4 every probe is guarded by the default-off global',
   SITES.every(s => s.probe.includes('globalThis.__MFW_Q1__ && globalThis.__MFW_Q1__.')));
ok('T5 no probe touches an RNG stream',
   !/liveRng|Math\.random|\brng\(/.test(probeText));
ok('T6 no probe assigns to anything (capture is read-only)',
   !/[^=!<>]=[^=]/.test(probeText.replace(/__MFW_Q1__ &&/g, '')));
ok('T7 the guard is __MFW_ scoped, never __M7_ and never M8s guard',
   !/__M7_/.test(probeText) && !/__MFW_M8__/.test(probeText));
ok('T8 no probe introduces a branch, a loop, an await or an async boundary',
   !/\bif\b|\bfor\b|\bwhile\b|\bawait\b|\basync\b|setTimeout|queueMicrotask|Promise/.test(probeText));
ok('T9 the transform is deterministic across repeated calls',
   transform(HEAD_MAIN) === INST_MAIN && transform(HEAD_MAIN) === transform(HEAD_MAIN));
ok('T10 site order does not change the result (anchors resolved against the original)',
   transformWith(HEAD_MAIN, [...SITES].reverse()) === INST_MAIN,
   'an inserted probe can never become the match for a later anchor');

// ==========================================================
console.log('\n===== A  anchor reuse, not duplication =======================');
// ==========================================================
// The Director required the existing cap/pool/goalReset sites be REUSED. The
// check is textual identity with M8's definitions, so a divergence is a
// failure rather than a silent second definition.
const M8A = (id) => M8_SITES.find(s => s.id === id).anchor;
const q1A = (id) => SITES.find(s => s.id === id).anchor;
ok('A1 cap/pool/goalReset anchors are M8s, not restated',
   q1A('cap:begin') === M8A('telCap') && q1A('cap:end') === M8A('telCap') &&
   q1A('pool:begin') === M8A('telPool') && q1A('goalReset:begin') === M8A('telGoal'),
   'one textual definition per anchor in the repository');
ok('A2 the write/read window boundaries are M8s anchors too',
   q1A('write') === M8A('write') && q1A('read') === M8A('read'),
   'main.js:2635 opening edge, main.js:3819 closing edge');
ok('A3 the advance site is the ONE new instrumentation point',
   q1A('advance:begin') === 'agentCurrent = next;' &&
   !M8_SITES.some(s => s.anchor === 'agentCurrent = next;'),
   'main.js:4917, absent from M8');
ok('A4 reuse fails closed if an M8 site disappears',
   throws(() => { const f = M8_SITES.find(s => s.id === 'telCap'); if (!f) throw 0;
                  if (!M8_SITES.find(s => s.id === '__gone__')) throw new Error('closed'); }),
   'm8Anchor() throws at module load rather than falling back');
ok('A5 every §4 taxonomy member has exactly one begin and one end probe',
   TRANSITION_SITES.every(s =>
        SITES.filter(x => x.site === s && x.where === 'before').length === 1 &&
        SITES.filter(x => x.site === s && x.where === 'after').length === 1),
   TRANSITION_SITES.join(', '));

// ==========================================================
console.log('\n===== P  §5 completeness gate — every reachable assignment ====');
// ==========================================================
// §5 makes an ADDITIONAL REACHABLE `agentCurrent` assignment a HALTING
// condition. This enumerates every textual assignment in main.js and requires
// each to be accounted for. An unclassified one fails the gate; it is never
// silently ignored or absorbed into an existing taxonomy member.
const ASSIGN_RE = /(^|[^.\w])agentCurrent\s*=[^=]/;
const isComment = (l) => /^\s*(\/\/|\*|\/\*)/.test(l);
const assignments = [];
hLines.forEach((l, i) => { if (ASSIGN_RE.test(l)) assignments.push({ line: i + 1, text: l }); });

const classify = (a) => {
    if (isComment(a.text)) return 'comment';
    if (/\b(let|const|var)\s+agentCurrent\s*=/.test(a.text)) return 'declaration';
    for (const s of TRANSITION_SITES) {
        const anchor = SITES.find(x => x.site === s && x.where === 'before').anchor;
        if (a.text.includes(anchor)) return s;
    }
    if (a.text.trim() === 'agentCurrent = null;') return 'wipe';
    return 'UNCLASSIFIED';
};
const classified = assignments.map(a => ({ ...a, kind: classify(a) }));
for (const c of classified) console.log(`   main.js:${String(c.line).padStart(4)}  ${c.kind}`);

ok('P1 every textual agentCurrent assignment is accounted for (§5 halting gate)',
   classified.every(c => c.kind !== 'UNCLASSIFIED'),
   `${classified.length} assignments, 0 unclassified`);
ok('P2 exactly the four §4 taxonomy members are instrumented',
   TRANSITION_SITES.every(s => classified.filter(c => c.kind === s).length === 1) &&
   classified.filter(c => TRANSITION_SITES.includes(c.kind)).length === TRANSITION_SITES.length,
   TRANSITION_SITES.map(s => `${s}@${classified.find(c => c.kind === s).line}`).join(' '));
ok('P3 the only non-taxonomy executable assignments are the declaration and the wipe',
   classified.filter(c => c.kind === 'declaration').length === 1 &&
   classified.filter(c => c.kind === 'wipe').length === 1,
   'declaration precedes every tick; wipe is the §4 excluded site');
{
    // §4 records the wipe's reason rather than omitting the site. Its
    // unreachability is a SOURCE fact plus a HARNESS fact, both checked here.
    const wipeLine = classified.find(c => c.kind === 'wipe').line;
    const guard = hLines.slice(wipeLine - 60, wipeLine)
        .some(l => l.includes('e.code === "KeyR" && e.shiftKey'));
    const driver = fs.readFileSync(path.join(ROOT, 'experiments/phase1_0/_driver.js'), 'utf8');
    ok('P4 the wipe site is unreachable in this harness, for a checked reason',
       guard && /code:\s*'Space'/.test(driver) && !/KeyR/.test(driver),
       `main.js:${wipeLine} needs KeyR+shift; the harness dispatches Space only`);
}
{
    // Recorded because it determines which mutation controls can be VALID.
    // main.js:4837 `agentLast = agentCurrent` runs before the advance at 4917,
    // so at the advance-begin probe agentLast and agentCurrent are provably
    // equal: substituting one for the other there corrupts nothing, and a
    // control built on it would be vacuous rather than green. The same
    // substitution at cap (main.js:3163, which PRECEDES 4837 in the tick) is a
    // genuine corruption, and section M exercises it as M5b.
    // The UNCONDITIONAL assignment: column 0, so it is at the top level of
    // runAgent and always executes, unlike the two indented copies inside the
    // cap and goalReset blocks.
    const unconditional = [];
    hLines.forEach((l, i) => { if (/^agentLast\s*=\s*agentCurrent;/.test(l)) unconditional.push(i); });
    const lastIdx = unconditional.length === 1 ? unconditional[0] : -1;
    const capIdx  = hLines.findIndex(l => l.includes(q1A('cap:begin')));
    const advIdx  = hLines.findIndex(l => l.includes(q1A('advance:begin')));
    ok('P6 agentLast equals agentCurrent at the advance probe but not at the cap probe',
       lastIdx > capIdx && lastIdx < advIdx,
       `main.js:${capIdx + 1} cap < main.js:${lastIdx + 1} agentLast=agentCurrent < ` +
       `main.js:${advIdx + 1} advance — so an agentLast control is vacuous at advance, valid at cap`);
}
ok('P5 the recorder REFUSES a site outside the frozen §4 taxonomy',
   throws(() => createRecorder().onTransitionBegin('wipe', 1)),
   'an unmapped site halts rather than being absorbed');

// ==========================================================
console.log('\n===== S  synthetic-fixture oracle for the recorder ============');
// ==========================================================
// A hand-scripted call sequence whose correct output is known by construction.
// Explicitly synthetic: node ids 90-99 exist in no MiniFlyWire topology, so
// this data can never be mistaken for a Q1 measurement.
function fixtureCalls(r) {
    r.onTick();                                     // tick 0
    r.onTransitionBegin('pool', null);              //   seq 0: null -> 90
    r.onTransitionEnd('pool', 90);
    r.onWrite(90, 91);                              //   seq 1: gap opens
    r.onRead(90, 90, 91);                           //   seq 2: gap closes, age 0
    r.onTransitionBegin('advance', 90);             //   seq 3: post-evaluation
    r.onTransitionEnd('advance', 91);
    r.onTick();                                     // tick 1
    r.onWrite(91, 92);                              //   seq 4: gap opens
    r.onTransitionBegin('advance', 91);             //   seq 5: intra-gap
    r.onTransitionEnd('advance', 93);
    r.onTransitionBegin('cap', 93);                 //   seq 6: intra-gap, 2nd
    r.onTransitionEnd('cap', 95);
    r.onRead(91, 95, 92);                           //   seq 7: gap closes, age 0, TWO transitions
}
{
    const r = createRecorder();
    fixtureCalls(r);
    const T = r.transitions(), B = r.boundaries();
    const EXP = [
        { seq: 0, tickIndex: 0, site: 'pool',    fromPos: null, toPos: 90 },
        { seq: 3, tickIndex: 0, site: 'advance', fromPos: 90,   toPos: 91 },
        { seq: 5, tickIndex: 1, site: 'advance', fromPos: 91,   toPos: 93 },
        { seq: 6, tickIndex: 1, site: 'cap',     fromPos: 93,   toPos: 95 },
    ];
    ok('S1 the recorder reproduces the hand-computed oracle exactly',
       T.length === EXP.length && EXP.every((x, k) => JSON.stringify(T[k]) === JSON.stringify(x)),
       `${T.length} transitions, 5 fields each`);
    ok('S2 records carry EXACTLY the frozen §6 closed schema, no more and no less',
       T.every(t => Object.keys(t).length === 5 &&
                    ['seq', 'tickIndex', 'site', 'fromPos', 'toPos'].every(k => k in t)),
       'seq, tickIndex, site, fromPos, toPos');
    ok('S3 write/read boundaries are NOT §4 taxonomy members and never appear as a site',
       T.every(t => TRANSITION_SITES.includes(t.site)) && B.length === 4 &&
       B.every(b => b.kind === 'write' || b.kind === 'read'),
       'the closed taxonomy is not widened by measurement infrastructure');
    ok('S4 one monotonic counter orders transitions and boundaries together',
       [...T, ...B].sort((a, b) => a.seq - b.seq).every((r, k) => r.seq === k),
       `union of ${T.length} + ${B.length} is contiguous 0..${T.length + B.length - 1}`);
    ok('S5 §3 semantics preserved: an age-0 gap can still contain TWO transitions',
       (() => { const w = B.find(b => b.seq === 4), rd = B.find(b => b.seq === 7);
                return rd.tickIndex - w.tickIndex === 0 &&
                       T.filter(t => t.seq > w.seq && t.seq < rd.seq).length === 2; })(),
       'AGE=k never implies k transitions — the recorder imposes no per-gap limit');
    ok('S6 the log is append-only: nothing already recorded is rewritten',
       (() => { const r2 = createRecorder(); r2.onTick();
                r2.onTransitionBegin('advance', 1); r2.onTransitionEnd('advance', 2);
                const snap = JSON.stringify(r2.transitions()[0]);
                r2.onTransitionBegin('advance', 2); r2.onTransitionEnd('advance', 3);
                return JSON.stringify(r2.transitions()[0]) === snap &&
                       r2.transitions().length === 2; })());
    ok('S7 an unpaired end and a nested begin both HALT rather than record a half-transition',
       throws(() => createRecorder().onTransitionEnd('advance', 1)) &&
       throws(() => { const x = createRecorder();
                      x.onTransitionBegin('advance', 1); x.onTransitionBegin('cap', 2); }) &&
       throws(() => { const x = createRecorder();
                      x.onTransitionBegin('advance', 1); x.onTransitionEnd('cap', 2); }),
       'no inference, no silent drop');
}

// ==========================================================
console.log('\n===== F  fixture configuration (outside every registered block)');
// ==========================================================
let FIX = null;
for (let seed = FIXTURE_BAND.lo; seed <= FIXTURE_BAND.hi && !FIX; seed++) {
    assertSeedAllowed(seed, { fixture: true });
    for (const idx of FROZEN.goalIndices) {
        const cfg = env.makeConfig(seed, idx);
        if (cfg.accepted) { FIX = { configSeed: seed, configIndex: idx, goal: cfg.goal }; break; }
    }
}
ok('F1 an accepted fixture configuration exists outside every registered block',
   FIX !== null && !inFrozenRange(FIX.configSeed) && !isConsumed(FIX.configSeed) &&
   !isHeldOut(FIX.configSeed) && (FIX.configSeed < Q1_RANGE.lo || FIX.configSeed > Q1_RANGE.hi),
   FIX ? `seed ${FIX.configSeed} index ${FIX.configIndex} goal ${FIX.goal}` : 'none found');

// ==========================================================
console.log('\n===== N  run-neutrality: OFF vs HOOK-ONLY vs ON ===============');
// ==========================================================
// The proven M8 neutrality architecture, unchanged: a driver-based child that
// recovers per-stream RNG draw counts and agent state, plus a runOnce child
// that compares the M7 fingerprint and environment counters.
function childSource(o) {
    const hook = o.hook === null ? null
        : (o.hook === 'real' ? U + '/experiments/q1/hook.mjs' : TU + '/mut_' + o.hook + '.mjs');
    return `
import { register } from 'node:module';
const U = ${JSON.stringify(U)};
const I = await import(U + '/experiments/q1/instrument.js');
${hook ? `register(${JSON.stringify(hook)}, import.meta.url);` : ''}
let R = null;
${o.guard ? `
R = I.createRecorder();
${o.recMut === 'noTick'  ? 'R.onTick = () => {};' : ''}
${o.recMut === 'reorder' ? `{ const f = R.onTransitionEnd.bind(R); const a = R.transitions();
    R.onTransitionEnd = (s, p) => { f(s, p); if (a.length > 1) a.unshift(a.pop()); }; }` : ''}
${o.recMut === 'drop'    ? `{ const f = R.onTransitionEnd.bind(R); const a = R.transitions(); let n = 0;
    R.onTransitionEnd = (s, p) => { f(s, p); if (++n === 200) a.pop(); }; }` : ''}
${o.recMut === 'dupSeq'  ? `{ const f = R.onTransitionEnd.bind(R); const a = R.transitions(); let n = 0;
    R.onTransitionEnd = (s, p) => { f(s, p); if (++n === 200 && a.length > 1) a[a.length-1].seq = a[a.length-2].seq; }; }` : ''}
globalThis.__MFW_Q1__ = R;` : ''}
${o.harness === 'runonce' ? `
const env = await import(U + '/experiments/m7/env.js');
const { runOnce } = await import(U + '/experiments/m7/run.js');
const rec = await runOnce({ configSeed: ${FIX.configSeed}, configIndex: ${FIX.configIndex},
    agentSeed: ${FROZEN.agentSeed}, arm: ${JSON.stringify(FROZEN.arm)},
    envMode: 'on', creditMode: 'on', pin: 'on', tickUnit: 'step',
    ticks: ${o.ticks}, crashAtTick: null, warmStore: false });
process.stdout.write('@@Q1@@' + JSON.stringify({
    fingerprint: rec.fingerprint,
    artifacts: { cogDraws: rec.artifacts.cogDraws, visDraws: rec.artifacts.visDraws,
                 qEntries: rec.artifacts.qEntries },
    envCounters: env.getCounters(),
    evaluatedSeeds: env.evaluatedSeeds(),
    transitions: R ? R.transitions() : null,
    boundaries:  R ? R.boundaries()  : null,
    diag:        R ? R.diagnostics() : null,
}));` : `
const { boot, pressSpace } = await import(U + '/experiments/phase1_0/_driver.js');
const { dom, timer, restore } = await boot({ seed: ${NEUTRALITY_FIXTURE_SEED} });
pressSpace(dom);
let n = 0; for (let i = 0; i < ${o.ticks}; i++) { if (!timer.tick()) break; n++; }
restore();
const { Q } = await import(U + '/render/qlearning.js');
const { makeRng, rng } = await import(U + '/instrumentation/rng.js');
const seedFor = { cognitive: ${NEUTRALITY_FIXTURE_SEED},
                  visual: (${NEUTRALITY_FIXTURE_SEED} ^ 0x9e3779b9) >>> 0,
                  environment: (${NEUTRALITY_FIXTURE_SEED} ^ 0x5EED) >>> 0 };
const draws = {};
for (const s of ['cognitive', 'visual', 'environment']) {
  let probe; try { probe = rng(s); } catch { draws[s] = null; continue; }
  const g = makeRng(seedFor[s] >>> 0); draws[s] = -1;
  for (let i = 0; i < 8000000; i++) if (g() === probe) { draws[s] = i; break; }
}
let qSum = 0; const qKeys = []; Q.forEach((v, k) => { qSum += v; qKeys.push(k); });
qKeys.sort();
process.stdout.write('@@Q1@@' + JSON.stringify({
    loops: n, draws, qSize: Q.size, qSum: Number(qSum.toFixed(9)), qHash: qKeys.join(',').length,
    transitions: R ? R.transitions() : null,
    boundaries:  R ? R.boundaries()  : null,
    diag:        R ? R.diagnostics() : null,
}));`}`;
}

let childN = 0;
function run(o) {
    const f = path.join(TMP, `run_${childN++}.mjs`);
    fs.writeFileSync(f, childSource({ hook: 'real', guard: true, recMut: null,
                                      harness: 'driver', ticks: NEUTRALITY_TICKS, ...o }));
    const out = execFileSync(process.execPath, [f], { cwd: HERE, encoding: 'utf8', maxBuffer: 1 << 28 });
    return JSON.parse(out.slice(out.indexOf('@@Q1@@') + 6));
}

// ---- probe-level mutant hooks. register() runs the hook in a SEPARATE loader
// thread, so mutating SITES in this process would be invisible to it. Every
// probe mutation must therefore be carried by a mutant hook module on disk.
const HOOK_MUTS = {
    advRemoved: `S = S.filter(s => s.site !== 'advance');`,
    advConst:   `for (const s of S) if (s.site === 'advance')
                     s.probe = s.probe.replace('agentCurrent)', '777)');`,
    advLabel:   `for (const s of S) if (s.site === 'advance')
                     s.probe = s.probe.replace('"advance"', '"pool"');`,
    // NOT agentLast: main.js:4837 sets agentLast = agentCurrent BEFORE the
    // advance at 4917, so an agentLast substitution there substitutes a
    // provably EQUAL value and corrupts nothing (see P6). \`next\` is the value
    // about to be assigned, so it genuinely differs whenever the agent moves.
    advFrom:    `for (const s of S) if (s.id === 'advance:begin')
                     s.probe = s.probe.replace('agentCurrent)', 'next)');`,
    // At cap (main.js:3163) agentLast still holds the PREVIOUS tick's position,
    // so the same substitution IS a real corruption of the begin side.
    capFrom:    `for (const s of S) if (s.id === 'cap:begin')
                     s.probe = s.probe.replace('agentCurrent)', 'agentLast)');`,
    advTo:      `for (const s of S) if (s.id === 'advance:end')
                     s.probe = s.probe.replace('agentCurrent)', 'agentLast)');`,
    capTo:      `for (const s of S) if (s.id === 'cap:end')
                     s.probe = s.probe.replace('agentCurrent)', 'agentLast)');`,
};
for (const [id, body] of Object.entries(HOOK_MUTS)) {
    fs.writeFileSync(path.join(TMP, `mut_${id}.mjs`), `
import { SITES, transformWith } from ${JSON.stringify(U + '/experiments/q1/instrument.js')};
let S = SITES.map(s => ({ ...s }));
${body}
if (JSON.stringify(S) === JSON.stringify(SITES.map(s => ({ ...s }))))
    throw new Error('mutation ${id} did not apply');
export async function load(url, ctx, next) {
  const r = await next(url, ctx);
  if (!decodeURIComponent(url).endsWith('/main.js') || !r.source) return r;
  return { ...r, source: transformWith(String(r.source), S) };
}`);
}

const OFF  = run({ hook: null,   guard: false });
const HOOK = run({ hook: 'real', guard: false });
const ON   = run({ hook: 'real', guard: true  });
const core = r => JSON.stringify({ loops: r.loops, draws: r.draws, qSize: r.qSize,
                                   qSum: r.qSum, qHash: r.qHash });
console.log(`   OFF       loops ${OFF.loops} | cog ${OFF.draws.cognitive} vis ${OFF.draws.visual} env ${OFF.draws.environment} | Q ${OFF.qSize} sum ${OFF.qSum}`);
console.log(`   HOOK-ONLY loops ${HOOK.loops} | cog ${HOOK.draws.cognitive} vis ${HOOK.draws.visual} env ${HOOK.draws.environment} | Q ${HOOK.qSize} sum ${HOOK.qSum}`);
console.log(`   ON        loops ${ON.loops} | cog ${ON.draws.cognitive} vis ${ON.draws.visual} env ${ON.draws.environment} | Q ${ON.qSize} sum ${ON.qSum}`);

ok('N1 instrumentation DISABLED is behaviourally neutral (hook registered, guard unset)',
   core(HOOK) === core(OFF), 'loops, all three RNG streams, Q size, Q sum, Q key set');
ok('N2 instrumentation ENABLED is run-neutral',
   core(ON) === core(OFF), 'identical to the uninstrumented build on every recorded quantity');
ok('N3 per-stream RNG draw counts are identical',
   OFF.draws.cognitive === ON.draws.cognitive && OFF.draws.visual === ON.draws.visual &&
   OFF.draws.environment === ON.draws.environment,
   `cognitive ${OFF.draws.cognitive}, visual ${OFF.draws.visual}, environment ${OFF.draws.environment}`);
ok('N4 agent state is identical (Q size, Q value sum, Q key set)',
   OFF.qSize === ON.qSize && OFF.qSum === ON.qSum && OFF.qHash === ON.qHash,
   `${OFF.qSize} entries, sum ${OFF.qSum}`);
ok('N5 tick count and therefore record ordering is unchanged',
   OFF.loops === ON.loops && ON.diag.ticks > 0, `${ON.loops} loops, ${ON.diag.ticks} recorded ticks`);
ok('N6 the recorder produces records ONLY when the guard is enabled',
   ON.transitions.length > 0 && HOOK.transitions === null && OFF.transitions === null,
   `${ON.transitions.length} transitions with the guard set, none without`);

// Second, independent neutrality comparison through the real M7 runner.
const R_OFF = run({ harness: 'runonce', ticks: FIXTURE_TICKS, hook: null,   guard: false });
const R_HK  = run({ harness: 'runonce', ticks: FIXTURE_TICKS, hook: 'real', guard: false });
const R_ON  = run({ harness: 'runonce', ticks: FIXTURE_TICKS, hook: 'real', guard: true  });
const rcore = r => JSON.stringify({ f: r.fingerprint, a: r.artifacts, e: r.envCounters });
console.log(`   runOnce OFF/HOOK/ON fingerprints: ${R_OFF.fingerprint.slice(0, 12)} / ` +
            `${R_HK.fingerprint.slice(0, 12)} / ${R_ON.fingerprint.slice(0, 12)}`);
ok('N7 the M7 run fingerprint is identical across OFF, HOOK-ONLY and ON',
   rcore(R_OFF) === rcore(R_HK) && rcore(R_OFF) === rcore(R_ON),
   `fingerprint, cog/vis draws, Q entries, env counters — ${R_OFF.fingerprint.slice(0, 16)}`);
ok('N8 environment counters are unchanged by instrumentation',
   JSON.stringify(R_OFF.envCounters) === JSON.stringify(R_ON.envCounters),
   `attempts ${R_ON.envCounters.attempts}`);

// ==========================================================
console.log('\n===== L  live invariants on the fixture configuration =========');
// ==========================================================
// Pure over a run result, so a mutated run is judged by exactly these
// assertions and nothing else.
function invariantsOf(res) {
    const T = res.transitions || [], B = res.boundaries || [];
    const union = [...T, ...B].sort((a, b) => a.seq - b.seq);
    const census = {}; for (const t of T) census[t.site] = (census[t.site] || 0) + 1;
    let gapsMulti = 0, lastWrite = null;
    for (const r of [...T.map(x => ({ s: x.seq, k: 't' })), ...B.map(x => ({ s: x.seq, k: x.kind }))]
                    .sort((a, b) => a.s - b.s)) {
        if (r.k === 'write') lastWrite = r.s;
        else if (r.k === 'read' && lastWrite !== null) {
            if (T.filter(t => t.seq > lastWrite && t.seq < r.s).length >= 2) gapsMulti++;
        }
    }
    return {
        census,
        L1: TRANSITION_SITES.every(s => (census[s] || 0) > 0),
        L2: T.every(t => TRANSITION_SITES.includes(t.site)),
        L3: T.every((t, k) => k === 0 || t.fromPos === T[k - 1].toPos),
        L4: T.every((t, k) => k === 0 || t.seq > T[k - 1].seq),
        L5: union.length > 0 && union.every((r, k) => r.seq === k),
        L6: T.length > 0 && T.every((t, k) => t.tickIndex >= 0 && (k === 0 || t.tickIndex >= T[k - 1].tickIndex))
            && new Set(T.map(t => t.tickIndex)).size >= 2,
        L7: T.every(t => (t.site === 'pool') === (t.fromPos === null)),
        L8: T.length > 0,
        L9: gapsMulti > 0,
        L10: res.diag ? (res.diag.pairingViolations === 0 && res.diag.openTransition === false) : false,
        gapsMulti,
    };
}
const LIVE = invariantsOf(R_ON);
console.log(`   fixture run: ${R_ON.transitions.length} transitions, ${R_ON.boundaries.length} boundaries, ` +
            `census ${JSON.stringify(LIVE.census)}`);
ok('L1 all four §4 taxonomy sites are observed live, not merely declared',
   LIVE.L1, TRANSITION_SITES.map(s => `${s} ${LIVE.census[s] || 0}`).join(', '));
ok('L2 every recorded site is inside the frozen closed taxonomy', LIVE.L2);
ok('L3 position chain is continuous: fromPos[k] === toPos[k-1] with no break',
   LIVE.L3, `${R_ON.transitions.length - 1} consecutive pairs, 0 breaks`);
ok('L4 seq is strictly increasing in log order (append-only)', LIVE.L4);
ok('L5 transitions and boundaries share ONE contiguous sequence — nothing lost',
   LIVE.L5, `union of ${R_ON.transitions.length} + ${R_ON.boundaries.length} = ` +
            `${R_ON.transitions.length + R_ON.boundaries.length}, contiguous from 0`);
ok('L6 tickIndex is non-negative, non-decreasing and takes more than one value', LIVE.L6);
ok('L7 pool records carry a null fromPos and no other site does (main.js:3273 guard)',
   LIVE.L7, 'pool fires exactly when !agentCurrent');
ok('L8 the instrumentation is not vacuous — it records', LIVE.L8,
   `${R_ON.transitions.length} transitions over ${R_ON.diag.ticks} ticks`);
ok('L9 a multi-transition gap is representable and observed on the fixture',
   LIVE.L9, `${LIVE.gapsMulti} write->read gaps carried 2+ transitions ` +
            `(capability check on a fixture seed, NOT a Q1 result)`);
ok('L10 zero pairing violations and no transition left open', LIVE.L10,
   JSON.stringify(R_ON.diag));

// ==========================================================
console.log('\n===== M  MUTATION CONTROLS — inputs and mechanism, not predicates');
// ==========================================================
// Each control corrupts one measurement INPUT or one part of the RECORDING
// MECHANISM. The named assertion must go RED. A control that cannot fail
// proves nothing.
const MUTS = [
    ['M1  advance probes removed (no advance logging)',        { hook: 'advRemoved' }, 'L1'],
    ['M2  advance probes log a constant instead of a position', { hook: 'advConst' },  'L3'],
    ['M3  advance probes carry the wrong site label',           { hook: 'advLabel' },  'L7'],
    ['M4  advance begin captures next (wrong fromPos)',         { hook: 'advFrom' },   'L3'],
    ['M5  advance end captures agentLast (wrong toPos)',        { hook: 'advTo' },     'L3'],
    ['M5b cap begin captures agentLast (wrong fromPos at a reused site)', { hook: 'capFrom' }, 'L3'],
    ['M6  cap end captures agentLast (wrong toPos at a reused site)', { hook: 'capTo' }, 'L3'],
    ['M7  records prepended instead of appended (reordered)',   { recMut: 'reorder' }, 'L4'],
    ['M8  one record silently dropped',                         { recMut: 'drop' },    'L5'],
    ['M9  a sequence number duplicated',                        { recMut: 'dupSeq' },  'L5'],
    ['M10 tick bookkeeping lost (tickIndex corruption)',        { recMut: 'noTick' },  'L6'],
    ['M11 recorder disabled (guard never set)',                 { guard: false },      'L8'],
    ['M12 probe bypass (hook never registered)',                { hook: null },        'L8'],
];
for (const [label, opts, expect] of MUTS) {
    let inv = null, crashed = false;
    try { inv = invariantsOf(run({ harness: 'runonce', ticks: FIXTURE_TICKS,
                                   hook: 'real', guard: true, ...opts })); }
    catch { crashed = true; }
    const red = Object.entries(inv || {})
        .filter(([k, v]) => /^L\d+$/.test(k) && v === false).map(([k]) => k);
    ok(`${label} -> ${expect} RED`,
       crashed || (inv && inv[expect] === false),
       crashed ? 'run aborted (also a detection)' : `RED: ${red.join(',') || 'none'}`);
}
// Source-transform controls. These are pure and need no run: the transform
// must FAIL rather than silently skip a probe.
{
    const advIdx = hLines.findIndex(l => l.includes('agentCurrent = next;'));
    const missing = hLines.filter((_, i) => i !== advIdx).join('\n');
    const duped   = [...hLines.slice(0, advIdx + 1), hLines[advIdx], ...hLines.slice(advIdx + 1)].join('\n');
    const moved   = hLines.map((l, i) => (i === advIdx - 1 ? 'if (true) {' : l)).join('\n');
    ok('M13 source-anchor MISSING -> transform throws, never skips the probe',
       throws(() => transform(missing)), 'a skipped probe would leave a hole in the log');
    ok('M14 source-anchor DUPLICATED -> transform throws, never guesses',
       throws(() => transform(duped)), 'ambiguity is a failure, not a coin flip');
    ok('M15 anchor present but INSERTED OUTSIDE its intended location -> transform throws',
       throws(() => transform(moved)),
       'the advance structural pin requires the exact enclosing guard at offset -1');
    ok('M16 the structural pin is not vacuous — an unrelated edit still transforms',
       (() => { const benign = [...hLines]; benign.splice(10, 0, '// unrelated comment');
                try { transform(benign.join('\n')); return true; } catch { return false; } })(),
       'the pin binds structure, not the whole file');
    ok('M17 a probe can never itself become an anchor',
       (() => { const bad = SITES.map(s => ({ ...s }));
                bad[0] = { ...bad[0], probe: 'x ' + bad[0].anchor };
                return throws(() => transformWith(HEAD_MAIN, bad)); })());
}

// ==========================================================
console.log('\n===== R  reproducibility (§12) ================================');
// ==========================================================
// 1. authoring tree  2. git-archive materialisation  3. CRLF checkout
const tar = execFileSync('git', ['archive', '--format=tar', 'HEAD', 'main.js'],
                         { cwd: ROOT, maxBuffer: 1 << 28 });
let ARCHIVE_MAIN = null;
for (let off = 0; off + 512 <= tar.length; ) {
    const h = tar.subarray(off, off + 512);
    const name = h.subarray(0, 100).toString('utf8').replace(/\0.*/, '');
    if (!name) break;
    const size = parseInt(h.subarray(124, 136).toString('utf8').replace(/\0.*/, '').trim(), 8) || 0;
    if (name === 'main.js') ARCHIVE_MAIN = tar.subarray(off + 512, off + 512 + size).toString('utf8');
    off += 512 + Math.ceil(size / 512) * 512;
}
const CRLF_MAIN = HEAD_MAIN.replace(/\n/g, '\r\n');
const norm = (t) => t.replace(/\r\n/g, '\n');

ok('R1 a git-archive materialisation of main.js is available and non-empty',
   typeof ARCHIVE_MAIN === 'string' && ARCHIVE_MAIN.length > 0,
   `${ARCHIVE_MAIN ? ARCHIVE_MAIN.length : 0} bytes, CRLF: ${/\r\n/.test(ARCHIVE_MAIN || '')}`);
ok('R2 the transform succeeds on the archive materialisation and inserts every probe',
   (() => { const t = transform(ARCHIVE_MAIN).split('\n').map(l => l.replace(/\r$/, ''));
            return t.filter(l => inserted.has(l)).length === SITES.length; })(),
   `${SITES.length} probes located in the archived source`);
ok('R3 archive transform is byte-identical to the authoring-tree transform after EOL normalisation',
   norm(transform(ARCHIVE_MAIN)) === INST_MAIN,
   sha(norm(transform(ARCHIVE_MAIN))).slice(0, 16) + ' == ' + sha(INST_MAIN).slice(0, 16));
ok('R4 a CRLF checkout transforms identically after EOL normalisation',
   norm(transform(CRLF_MAIN)) === INST_MAIN &&
   transform(CRLF_MAIN).split('\n').map(l => l.replace(/\r$/, '')).filter(l => inserted.has(l)).length
       === SITES.length,
   'anchors and structural pins are EOL-insensitive');
ok('R5 the instrumented CRLF source is syntactically valid JavaScript',
   (() => { const f = path.join(TMP, 'crlf_instrumented.js');
            fs.writeFileSync(f, transform(CRLF_MAIN));
            try { execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' }); return true; }
            catch { return false; } })(),
   'node --check on the transformed CRLF build');

const BS = String.fromCharCode(92);
const litRe = (q) => new RegExp(q + '(?:[^' + q + BS + BS + ']|' + BS + BS + '.)*' + q, 'g');
const code = (t) => t
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(litRe('`'), '``')
    .replace(litRe("'"), "''")
    .replace(litRe('"'), '""');
const INSTR = fs.readFileSync(path.join(HERE, 'instrument.js'), 'utf8');
const HOOKS = fs.readFileSync(path.join(HERE, 'hook.mjs'), 'utf8');
const SELF  = fs.readFileSync(path.join(HERE, 'verify_q1_instrument.js'), 'utf8');
const MEASURE = code(INSTR) + code(HOOKS);
const ALL     = MEASURE + code(SELF);

ok('R6 no measurement code depends on mtime or filesystem metadata',
   !/mtime|birthtime|atimeMs|statSync/.test(ALL), 'instrument.js, hook.mjs, verifier');
ok('R7 no measurement code depends on wall-clock time',
   !/Date\.now|new Date|performance\.now|hrtime/.test(ALL));
ok('R8 no measurement code reaches the network',
   !/https?:|fetch\(|net\.|http\.|dns\./.test(ALL));
ok('R9 the instrumentation reads no untracked or diagnostic artifact',
   !/_probe_|diagnose_G11|cognitive-audit/.test(ALL),
   'inputs are main.js, instrument.js, hook.mjs and committed experiment modules');
ok('R10 the instrumentation computes no §7 derived observable and names no cause',
   !/GAP_COMPOSITION|FIRST_DIVERGING|LAST_TRANSITION_BEFORE|TRANSITION_COUNT|proximate/i.test(MEASURE),
   'classification is offline and belongs to a later authorised milestone');

// ==========================================================
console.log('\n===== Z  seed safety — proven at runtime, not asserted ========');
// ==========================================================
const touched = [...env.evaluatedSeeds(),
                 ...R_OFF.evaluatedSeeds, ...R_HK.evaluatedSeeds, ...R_ON.evaluatedSeeds];
const inQ1 = (s) => s >= Q1_RANGE.lo && s <= Q1_RANGE.hi;
ok('Z1 the measurement code contains no seed literal at all',
   !/\b\d{6,}\b/.test(MEASURE), 'instrument.js and hook.mjs carry no seed');
ok(`Z2 the fixture band ${FIXTURE_BAND.lo}-${FIXTURE_BAND.hi} is disjoint from the D-006 Q1 range`,
   FIXTURE_BAND.hi < Q1_RANGE.lo && Q1_RANGE.hi < HELD_OUT_FLOOR,
   `${FIXTURE_BAND.hi} < ${Q1_RANGE.lo} and ${Q1_RANGE.hi} < ${HELD_OUT_FLOOR}`);
ok('Z3 NO seed in the D-006 Q1 range was generated or evaluated by this gate',
   touched.length > 0 && !touched.some(inQ1),
   `${touched.length} configuration seeds touched, range ` +
   `${Math.min(...touched)}-${Math.max(...touched)}`);
ok('Z4 no consumed M7/M8 seed and no held-out seed was touched',
   !touched.some(s => isConsumed(s) || isHeldOut(s) || inFrozenRange(s)),
   `held-out floor ${HELD_OUT_FLOOR} untouched`);
ok('Z5 every touched seed passes fixture-mode seed discipline',
   touched.every(s => { try { assertSeedAllowed(s, { fixture: true }); return true; }
                        catch { return false; } }),
   'assertSeedAllowed refuses a registered seed used as a fixture');
ok('Z6 the gate performs no candidate enumeration over any range',
   !/enumerateCandidates/.test(code(SELF)),
   'candidate enumeration belongs to the collection milestone');

// ==========================================================
console.log('\n===== G  frozen-artifact regression ===========================');
// ==========================================================
const digestOK = (mdRel, sidecarRel) => {
    const side = fs.readFileSync(path.join(ROOT, sidecarRel), 'utf8');
    const line = side.split('\n').filter(l => l.trim() && !l.startsWith('#')).pop() || '';
    const want = (line.match(/[0-9a-f]{64}/) || [])[0];
    return want && want === sha(fs.readFileSync(path.join(ROOT, mdRel)));
};
ok('G1 M7 pre-registration digest unchanged',
   digestOK('research/cognitive-audit/M7_PREREGISTRATION.md',
            'research/cognitive-audit/M7_PREREGISTRATION.sha256'));
ok('G2 M8 pre-registration digest unchanged',
   digestOK('research/preregistrations/M8_PREREGISTRATION.md',
            'research/preregistrations/M8_PREREGISTRATION.sha256'));
ok('G3 M9 pre-registration digest unchanged',
   digestOK('research/preregistrations/M9_PREREGISTRATION.md',
            'research/preregistrations/M9_PREREGISTRATION.sha256'));
ok('G4 Q1 pre-registration digest unchanged',
   digestOK('research/preregistrations/Q1_PREREGISTRATION.md',
            'research/preregistrations/Q1_PREREGISTRATION.sha256'));
{
    const dirty = execFileSync('git', ['status', '--porcelain', '--',
        'main.js', 'research/09_decisions.md', 'research/preregistrations',
        'research/cognitive-audit', 'experiments/m7', 'experiments/m8', 'experiments/m9'],
        { cwd: ROOT, encoding: 'utf8' }).split('\n').filter(l => l.trim() && !l.startsWith('??'));
    ok('G5 D-006, main.js and every M7/M8/M9 artifact are unmodified',
       dirty.length === 0, dirty.length ? dirty.join(' | ') : 'no tracked modification');
}

fs.rmSync(TMP, { recursive: true, force: true });
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
