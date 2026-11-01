// ==========================================================
// TC-2 — read-only documentation check (mechanical; FC-7 Category 1 only)
// ==========================================================
//   node experiments/tc2/verify_contract.mjs [--pinned <tree-dir>] [--derive] [--print-pins]
//
// Reads TRANSITION_CONTRACT.md, research/09_decisions.md and the source files they cite.
// Node built-ins only. Writes nothing, uses no network or git, and by default imports no
// application or experiment module. A clean clone is enough to run it.
//
//   --pinned <dir>  also checks the pinned tree's hashes, its hook lines and line equality
//   --derive        also recomputes the Section 18.2 digests by calling the pure generator
//                   generateAccepted in experiments/m7/env.js (no agent, no session)
//   --print-pins    prints the current digests for PINS and exits. Pins change only with a
//                   new decision entry.
//
// Sections
//   H  history    : decision entries and contract sections match their pins
//   S  structure  : headings, decision ids, AC ids, table shape
//   R  references : every P:n and file reference in the contract resolves
//   C  claims     : listed source claims hold on the cited lines
//   Q  writers    : the Q-writer set matches Section 14.3
//   W  worlds     : Section 18.2 seeds recompute from their stream identity
//   T  status     : markers open, AC23 and AC38 non-executable, nothing recorded as passed
//
// A pass is a documentation check only. It is not a static source check, a runtime test or
// an experiment, and it cannot judge whether a ruling or an inference is sound.
// ==========================================================
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const CONTRACT = 'experiments/tc2/TRANSITION_CONTRACT.md';
const DECISIONS = 'research/09_decisions.md';

// ---- arguments ----
const argv = process.argv.slice(2);
let pinnedDir = null, derive = false, printPins = false;
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--pinned') pinnedDir = argv[++i];
  else if (argv[i] === '--derive') derive = true;
  else if (argv[i] === '--print-pins') printPins = true;
  else { console.error(`unknown argument ${argv[i]}`); process.exit(2); }
}
if (argv.includes('--pinned') && !pinnedDir) { console.error('--pinned needs a directory'); process.exit(2); }

// ---- pins (LF-normalised text; updated only with a new decision entry) ----
const PINS = {
  'decision:D-035': '3bc4b28e46080587326175aef3b8868133d51e33aa813f41635224e37cb4499a',
  'decision:D-036': '1f7bbe4d87b88a43db055621c5512a383ac1442ddd5a7beaa8636238a1e2e7fa',
  'decision:D-037': '22f153f069978ae5f55f68f0bd5478881726180d3746b69138f666dbc71fd547',
  'decision:D-038': 'd34977e92648d3e8908521b9c53b8ae535aabf6087d9407e88565d9062e42caa',
  'decision:D-039': '91619ab3d4bb62be699d0dc945e2d5417f9271353b4b788c18186deccff8295e',
  'decision:D-040': 'd03348d1a1545e63ffb06f533396dcba033f0c4bb15f10be36d57ac8d724cd59',
  'decision:D-041': '45ec787335edd310ed9a905ad5a88072ae8ea7d5622fe1e06ec1f39795b633ad',
  'decision:D-042': '5410b5a6731de4c04e8ea93c59d76b14bd4e2d10188071248bc8eca8326b3950',
  'decision:D-043': '50b6c9289e303e3b8b1a1c302a618a20877d6012eb9b7a7f2b2843878d053fed',
  'section:1': '08519cbc1b9c6f3e1b3dfa8426d1dc35cb47dbd0453040bc503dedad1cae2314',
  'section:2': 'df2cda186661ba293b8ea12619b2befe0f408b7688de2998b5144d3dad54d815',
  'section:3': 'd608fab817fda53b3894632686db6ce9041325159b1233a1505f142ead93e38a',
  'section:4': '6461d4a1f0f30d494f751103da0dc6fc7513509307d8afeca5dab1a019209a02',
  'section:5': 'b22a933e9b5ec3aa7b4867323d62d0a779d00e919714068a6bd9e4b2031be3ba',
  'section:6': '885bb16bd1f5e2bef3a7e53f57810877a59901c69a4bd38ce79798b15fce82fa',
  'section:7': '587e011b0b59bdf76927d88ed918cd24e923dee146e78b49872edc64d0d20f13',
  'section:8': '5d310a125a58e0da6fabaad714ffc6208efdf2424c6498db331a38b872aef334',
  'section:9': '3ba334ef9dc1fa6764dce4972381a35977f611f1e166afa7b745ce3d3ed69101',
  'section:10': '90c1fc4b10fb378d9804d2ff80b2aa8a631baf3b85b132d55da25a95a3f10fc2',
  'section:11': 'a7c6147383d6b30841a27a1e15cff80a8c1c918f76cde2bb5104da0e95782fae',
  'section:12': '1e6bde285f6d838385ca8b4e93d7c37953531851e42f8e0ac1bfffc09913cee2',
  'section:13': 'c3a7f3a3af7547959687bcc9423a82317ec27cffdeb4b5d39cb5f53c589afe6e',
  'section:14': '754d71cedd94565baa7acb26771762e41c725367acd83e22a66edee46eca9e2a',
  'section:15': 'a6abebf9ce27a5b37cd7096e511d38042454b84201d3c5695d67dfbb9b0c939a',
  'section:16': '15f2bc91759f6faaf05e3f385ca001e9242c37420ec5ae3587ba7b2eef585a00',
  'section:17': '806483d8ed80c02b7a8cf4c4c4a45455d147a2ba455b07d42fc279cebece6f76',
  'section:18': '4c5a322a22a5130e4acb614b374c48a3fb285aa14a783d5174586b728706a22b',
  'section:19': 'c4da4554533ade81e035e48dd07729260a57d9e604a4d4b5ae67894ebc77172a',
};

// ---- helpers ----
const norm = (s) => s.replace(/\r/g, '');
const cache = new Map();
const read = (rel, base = ROOT) => { const k = `${base}|${rel}`; if (!cache.has(k)) cache.set(k, norm(fs.readFileSync(path.join(base, rel), 'utf8'))); return cache.get(k); };
const lines = (rel, base = ROOT) => read(rel, base).split('\n');
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const code = (l) => l.replace(/\/\/.*$/, '');

let fails = 0, passes = 0, skipped = 0, group = '';
const failures = [];
const check = (name, ok, extra = '') => { if (ok) passes++; else { fails++; failures.push(`${group} ${name}${extra ? '  ' + extra : ''}`); } };
const start = (g) => { group = g; };

const contract = read(CONTRACT), decisions = read(DECISIONS);
const between = (t, a, b) => { const i = t.indexOf(a); if (i < 0) return ''; const j = b ? t.indexOf(b, i) : -1; return j < 0 ? t.slice(i) : t.slice(i, j); };
const sectionOf = (n) => {
  const m = [...contract.matchAll(/^## (\d+)\. /gm)]; const i = m.findIndex((x) => +x[1] === n);
  return i < 0 ? '' : contract.slice(m[i].index, i + 1 < m.length ? m[i + 1].index : undefined);
};
const decisionOf = (id) => {
  const i = decisions.indexOf(`## ${id} `); if (i < 0) return '';
  const j = decisions.indexOf('\n## D-', i + 1); return j < 0 ? decisions.slice(i) : decisions.slice(i, j + 1);
};
const DECISION_IDS = ['D-035', 'D-036', 'D-037', 'D-038', 'D-039', 'D-040', 'D-041', 'D-042', 'D-043'];
const SECTION_IDS = Array.from({ length: 19 }, (_, i) => i + 1);

if (printPins) {
  const out = {};
  for (const id of DECISION_IDS) out[`decision:${id}`] = sha(decisionOf(id));
  for (const n of SECTION_IDS) out[`section:${n}`] = sha(sectionOf(n));
  console.log(JSON.stringify(out, null, 2));
  process.exit(0);
}

// ---- pinned main.js lines versus repository lines ----
const HOOKS = [1154, 1279, 1320, 1792, 2128, 3646, 4867];
const hookSet = new Set(HOOKS);
const offsetOf = (n) => HOOKS.filter((h) => h < n).length;
const rootMain = lines('main.js');
const pinMain = pinnedDir ? lines('main.js', pinnedDir) : null;
const P = (n) => (hookSet.has(n) ? (pinMain ? pinMain[n - 1] : null) : rootMain[n - 1 - offsetOf(n)] ?? '');

// ---- H history ----
start('H');
for (const id of DECISION_IDS) check(`${id} matches its pin`, PINS[`decision:${id}`] === sha(decisionOf(id)));
for (const n of SECTION_IDS) check(`section ${n} matches its pin`, PINS[`section:${n}`] === sha(sectionOf(n)));
check('contract header states the freeze and its limits', contract.includes('**Status: DOCUMENTATION FROZEN AS A SPECIFICATION BASELINE, WITH EXPLICIT LIMITATIONS (D-043, Section 19).** This is not runtime acceptance, experiment authorization or independent validation.'));

// ---- S structure ----
start('S');
const heads = [...contract.matchAll(/^## (\d+)\. /gm)].map((m) => +m[1]);
check('sections 1 to 19 in order', JSON.stringify(heads) === JSON.stringify(SECTION_IDS));
const ids = [...decisions.matchAll(/^## D-(\d{3})/gm)].map((m) => +m[1]);
check('decision ids unique', new Set(ids).size === ids.length);
check('newest decision first', ids[0] === Math.max(...ids));
const s7 = between(contract, '## 7. Acceptance', '### AC38');
const acNumbers = (t) => [...t.matchAll(/^\| AC(\d+) \|/gm)].map((m) => +m[1]);
check('AC1 to AC38 in Section 7', JSON.stringify(acNumbers(s7)) === JSON.stringify(Array.from({ length: 38 }, (_, i) => i + 1)));
check('AC39 to AC48 in Section 17.8', JSON.stringify(acNumbers(between(contract, '### 17.8 Adopted criteria', '### 17.9 '))) === JSON.stringify(Array.from({ length: 10 }, (_, i) => i + 39)));
check('AC49 in Section 18.5', JSON.stringify(acNumbers(between(contract, '### 18.5 FZ-5', '### 18.6 '))) === '[49]');
check('no AC beyond AC49', !/\bAC(5\d|[6-9]\d)\b/.test(contract));
for (const n of [14, 15, 16, 17, 18, 19]) {
  let bad = 0, cols = null;
  for (const l of sectionOf(n).split('\n')) { if (l.startsWith('|')) { const c = l.split('|').length; if (cols === null) cols = c; else if (cols !== c) bad++; } else cols = null; }
  check(`section ${n} tables have consistent columns`, bad === 0, `bad=${bad}`);
}
const trace = between(contract, '### 16.8 Acceptance traceability', '**Findings on the reported gaps.**');
for (let i = 1; i <= 9; i++) check(`T${i} is traced`, new RegExp(`^\\| T${i} \\|`, 'm').test(trace));

// ---- R references ----
start('R');
const refText = contract;
const pNumbers = new Set();
for (const m of (refText + DECISION_IDS.slice(3).map(decisionOf).join('\n')).matchAll(/`P:(\d+)(?:-(\d+))?`/g)) { pNumbers.add(+m[1]); if (m[2]) pNumbers.add(+m[2]); }
const BLANK_RANGE_END = new Set([3948]);   // Section 14.4 cites P:3566-3948; that end line is blank
for (const n of pNumbers) {
  if (hookSet.has(n)) { if (!pinMain) { skipped++; continue; } check(`hook P:${n} is non-blank`, (pinMain[n - 1] ?? '').trim().length > 0); continue; }
  check(`P:${n} resolves`, BLANK_RANGE_END.has(n) || P(n).trim().length > 0);
  if (pinMain) check(`P:${n} equals its repository line`, pinMain[n - 1] === P(n));
}
const refs = [];
let last = null;   // a bare `:n` belongs to the last file named on its line, or earlier in its table
for (const line of refText.split('\n')) {
  if (!line.startsWith('|')) last = null;
  for (const m of line.matchAll(/`((?:experiments|research|benchmarks|render|instrumentation)\/[^`:\s]+?)(?::(\d+)(?:-(\d+))?)?`|`:(\d+)(?:-(\d+))?`/g)) {
    if (m[1]) { last = m[1]; refs.push([m[1], m[2] ? +m[2] : null, m[3] ? +m[3] : null]); }
    else if (last) refs.push([last, +m[4], m[5] ? +m[5] : null]);
    else check('a bare line reference has a file on its line', false, line.slice(0, 80));
  }
}
const IGNORED = 'experiments/coga/data/';   // git-ignored records are absent from a clean clone
for (const [f, a, b] of new Map(refs.map((r) => [r.join('|'), r])).values()) {
  if (f.includes('*')) { check(`glob ${f}`, fs.existsSync(path.join(ROOT, path.dirname(f)))); continue; }
  if (f.startsWith(IGNORED)) { skipped++; continue; }
  const ok = fs.existsSync(path.join(ROOT, f)); check(`${f} exists`, ok);
  if (ok && a !== null) check(`${f}:${b || a} is in range`, (b || a) <= lines(f).length);
}

// ---- C claims ----
start('C');
const L = (f, n) => lines(f)[n - 1] ?? '';
const EM = 'render/episodeManager.js', QL = 'render/qlearning.js', RUN = 'experiments/m7/run.js', ACQ = 'experiments/coga/acq1/session_mfw.mjs', ENVF = 'experiments/m7/env.js';
const claims = [
  ['makeStateKey form', /return p \+ "#" \+ g/.test(L(QL, 48))],
  ['Q table', /export const Q = new Map\(\)/.test(L(QL, 12))],
  ['updateQ has no terminal input', !/terminal/.test(lines(QL).slice(142, 165).join('\n'))],
  ['main TD write', /updateQ\(\{/.test(P(4173)) && /reward: +rewardSignal/.test(P(4176)) && /nextState: makeStateKey\(agentCurrent, goalNeuronId\)/.test(P(4177))],
  ['else TD write', /updateQ\(\{/.test(P(4354)) && /reward: +rewardSignal/.test(P(4357))],
  ['commit line and reward', /sys\.updateQ\(\{/.test(L(EM, 1003)) && /reward: +causalReward/.test(L(EM, 1006)) && /const causalReward += 8 \* gain \* \(1 \+ causalBonus\)/.test(L(EM, 968))],
  ['authorities', /procedural: +1\.00/.test(L(EM, 60)) && /procedural: +0\.30/.test(L(EM, 68)) && /procedural: +0\.90/.test(L(EM, 76)) && /procedural: +0\.40/.test(L(EM, 84))],
  ['section guard', /agentLast !== goalNeuronId/.test(P(3975))],
  ['move guard', /Number\(next\) === Number\(goalNeuronId\)/.test(P(5001)) && /agentCurrent = next/.test(P(5070))],
  ['goal skip of the verdict', /_goalResetJustHappened && _m7env/.test(P(5025)) && /_m7env\.attempt/.test(P(5026))],
  ['replay has no goal', /_createBuffer\("replay"\)/.test(L(EM, 517)) && !/activeGoal/.test(lines(EM).slice(516, 527).join('\n')) && /buf\.activeGoal \?\? null/.test(L(EM, 808))],
  ['terminal field set for all sources', /terminal: i === nodes\.length - 2/.test(L(EM, 771))],
  ['seal bridge', /recordAutonomousSuccess\(/.test(P(927)) && !/episodeRecordNode\(/.test(rootMain.map(code).join('\n'))],
  ['legacy trust writers', /recordAttempt\(attemptKey\)/.test(P(4484)) && /__M7_CREDIT__/.test(P(4479)) && /agentLast \+ "->" \+ next/.test(P(4482)) && /recordSuccess\(pathKey\)/.test(P(4681)) && /sys\.recordSuccess\(key\)/.test(L(EM, 1092))],
  ['trust gate', /auth\.trust <= 0/.test(L(EM, 1084)) && /trust: +1\.00/.test(L(EM, 62)) && [70, 78, 86, 94].every((n) => /trust: +0\.00/.test(L(EM, n)))],
  ['hook credit', /_m7cred/.test(P(5048)) && /input\.creditMode === 'on'/.test(L(RUN, 151))],
  ['confidence writes', /confidenceMap\.set/.test(P(4666)) && /confidenceMap\.set/.test(P(4697)) && /confidenceMap\.set/.test(L(EM, 1096))],
  ['trust ratio and scoring', /\(s \+ 1\) \/ \(a \+ 2\)/.test(L('render/trustMemory.js', 94)) && /\(bayesianTrust - 0\.5\) \* 8/.test(L('render/scoring.js', 184)) && /getPathTrust\(currentKey \+ "->" \+ k\)/.test(P(2304))],
  ['freshness writer', /window\.lastReasoning = \{/.test(P(2770)) && /step === 0/.test(P(2769)) && rootMain.filter((l) => /lastReasoning *=[^=]/.test(code(l))).length === 1],
  ['updateBehavior', /updateBehavior\(\{/.test(P(3544)) && /if \(lastDecision && lastDecision\.best\)/.test(P(3493)) && rootMain.filter((l) => /\bupdateBehavior\(/.test(code(l))).length === 1],
  ['lastDecision writers', /let lastDecision = null/.test(P(685)) && /lastDecision = \{/.test(P(2532)) && /lastDecision = null/.test(P(4872))],
  ['budget lines', /__M7_TEL__\.step\(\)/.test(P(3260)) && /_m7EpisodeTicks\+\+/.test(P(3303)) && /runAgentLoop\(\)/.test(P(5382)) && /for \(let i = 0; i < 5/.test(P(5317))],
  ['harness loop', /Math\.ceil\(input\.ticks/.test(L(RUN, 115)) && /pressSpace\(dom\)/.test(L(RUN, 248)) && /ticksExecuted \+= ticksPerLoop/.test(L(RUN, 256))],
  ['Attempts field', /attempts: env\.log\.length/.test(L(ACQ, 123))],
  ['cap value', /M7_EPISODE_TICK_CAP = 150/.test(P(1055))],
  ['reliability chain', /pOf = \(world, env\) => \(env === 'E1' \? world\.p1 : world\.p2\)/.test(L('experiments/coga/acq1/states.mjs', 32)) && /p1: cfg\.pPhase1/.test(L('experiments/coga/acq1/states.mjs', 37)) && /pPhase1: phaseP\(1\)/.test(L(ENVF, 195))],
  ['reliability ranges', /N_UNRELIABLE += 13/.test(L(ENVF, 39)) && /P_UNRELIABLE += \[0\.25, 0\.45\]/.test(L(ENVF, 40)) && /P_RELIABLE += \[0\.90, 1\.00\]/.test(L(ENVF, 41)) && /makeRng\(configSeed >>> 0\)/.test(L(ENVF, 165))],
  ['verdict form', /this\.slip\[e\]\(\) < this\.p\[e\]/.test(L('experiments/coga/acq1/env.mjs', 29))],
  ['agent id', /agentId = `MFW-\$\{IN\.variant\}`/.test(L(ACQ, 93)) && /streamSeed\(agentStream\(world\.id, agentId, IN\.env\)\)/.test(L(ACQ, 94)) && /variant 'P'/.test(L(ACQ, 8)) && /\*\*MFW-P\*\*/.test(L('experiments/coga/acq1/DESIGN.md', 40))],
  ['agent id in evidence records', /agent: agentId/.test(L(ACQ, 118)) && /identity: agentStream\(world\.id, agentId, IN\.env\)/.test(L(ACQ, 120)) && /const VARIANTS = \{ P: \{ hooks: MFW_HOOKS/.test(L(ACQ, 40)) && lines(ACQ).filter((l) => /\bagentId\b/.test(l)).length === 4],
  ['stream identity', /STUDY = 'COG-A'/.test(L('experiments/coga/rngid.mjs', 13)) && /VERSION = 1/.test(L('experiments/coga/rngid.mjs', 14)) && /agentStream = /.test(L('experiments/coga/rngid.mjs', 37)) && /envSlip = /.test(L('experiments/coga/rngid.mjs', 35))],
  ['clock and hook state', /VIRTUAL/.test(L('experiments/coga/config.mjs', 33)) && /creditMode: 'off'/.test(L('experiments/coga/config.mjs', 32))],
];
for (const [name, ok] of claims) check(name, !!ok);
if (pinMain) {
  check('legality guard hook', /__GFGUARD__\.legalMove/.test(P(3646)));
  check('candidate admission hook', /__GFGUARD__\.admit/.test(P(1792)));
  check('pinned main.js hash', sha(fs.readFileSync(path.join(pinnedDir, 'main.js'))) === '3d3266fde38c39ea0a38f3920b4a2384ef5998e88c748e0a0a53416ef62bccc3');
  check('pinned planning.js hash', sha(fs.readFileSync(path.join(pinnedDir, 'render/planning.js'))) === '34e06c655b4f2b04d77b4db0b8db744568235865788177085510b5dd78cf46dc');
  check('MFW-P absent from pinned main.js', !lines('main.js', pinnedDir).some((l) => l.includes('MFW-P')));
  check('no coga folder in the pinned tree', !fs.existsSync(path.join(pinnedDir, 'experiments', 'coga')));
} else skipped += 6;

// ---- Q writers ----
start('Q');
const prod = ['main.js', ...fs.readdirSync(path.join(ROOT, 'render')).filter((f) => f.endsWith('.js')).sort().map((f) => `render/${f}`), ...fs.readdirSync(path.join(ROOT, 'instrumentation')).sort().map((f) => `instrumentation/${f}`), 'index.html'];
const hits = [];
for (const f of prod) lines(f).forEach((l, i) => { if (/\bQ\.(set|delete|clear)\(|\bsetQ\(|\bupdateQ\(|\bdampQ\(|restoreStringMap\(Q\b/.test(code(l))) hits.push(`${f}:${i + 1}`); });
const expected = [...[803, 1427, 3393, 4173, 4225, 4354, 5356].map((n) => `main.js:${n - offsetOf(n)}`), 'render/episodeManager.js:1003', ...[126, 132, 143, 252, 319, 335].map((n) => `render/qlearning.js:${n}`)];
check('the Q-writer set matches Section 14.3', JSON.stringify(hits) === JSON.stringify(expected), hits.join(' '));
check('no eval or new Function', !prod.some((f) => /\beval\(|new Function/.test(read(f))));
check('only main.js and embeddings.js import qlearning', JSON.stringify(prod.filter((f) => /from\s+["'][^"']*qlearning(\.js)?["']/.test(read(f))).sort()) === JSON.stringify(['main.js', 'render/embeddings.js']));

// ---- W worlds ----
start('W');
const worlds = [...between(contract, '### 18.2 FZ-2', '### 18.3 ').matchAll(/^\| (\d+) \| `(acq1:study:\d+)` \| (\d+) \| (\d+) \| (\d+) \| `([0-9a-f]{64})` \|$/gm)].map((m) => ({ index: +m[1], id: m[2], configSeed: +m[3], goal: +m[4], agentSeed: +m[5], digest: m[6] }));
check('ten parity worlds are listed', worlds.length === 10 && worlds.every((w, i) => w.index === i && w.id === `acq1:study:${i}`));
for (const w of worlds) {
  const identity = { agent: 'MFW-P', condition: 'E1', purpose: 'agent', study: 'COG-A', version: 1, world: w.id };
  check(`world ${w.index} seed recomputes`, (parseInt(sha(JSON.stringify(identity)).slice(0, 8), 16) >>> 0) === w.agentSeed);
}
if (derive) {
  const { generateAccepted } = await import(pathToFileURL(path.join(ROOT, 'experiments/m7/env.js')).href);
  for (const w of worlds) {
    const g = generateAccepted(w.configSeed, w.index);
    check(`world ${w.index} is accepted at its seed`, g.provenance.acceptedSeed === w.configSeed && g.provenance.numberOfRejectedCandidatesBeforeAcceptance === 0);
    check(`world ${w.index} goal`, g.cfg.goal === w.goal);
    check(`world ${w.index} p1 digest`, g.cfg.pPhase1.length === 39 && sha(JSON.stringify(g.cfg.pPhase1)) === w.digest);
  }
} else skipped += 30;

// ---- T status ----
start('T');
const markers = between(contract, 'Open markers:', 'Recorded unresolved:');
const ruled = between(contract, 'Markers provisionally ruled', '## 12.');
const s18 = sectionOf(18), d42 = decisionOf('D-042'), s19 = sectionOf(19), d43 = decisionOf('D-043');
const closing = s19.slice(s19.lastIndexOf('Open markers:'));
for (const m of ['T3', 'DoubleGoal', 'FreshMech', 'Budget', 'A4']) {
  check(`[OPEN-${m}] is listed open`, markers.includes(`- [OPEN-${m}]:`) && closing.includes(`[OPEN-${m}]`) && d43.includes(`[OPEN-${m}]`));
  check(`[OPEN-${m}] is not in the ruled table`, !ruled.includes(`[OPEN-${m}]`));
}
check('AC23 and AC38 notes stay not executable', /^\| AC23 .*not executable/m.test(s7) && /^\| AC38 .*not executable/m.test(s7));
check('AC23 and AC38 stay non-executable in the closing status', closing.includes('AC23 and AC38 stay open and non-executable') && d43.includes('AC23 and AC38 stay open and non-executable'));
check('no criterion run or passed', closing.includes('No criterion has been run or passed') && closing.includes('AC1 to AC49 stay open and unrun') && d43.includes('No acceptance criterion has been run or passed'));
const recorded = [13, 14, 15, 16, 17, 18, 19].map(sectionOf).join('\n') + DECISION_IDS.slice(1).map(decisionOf).join('\n');
check('no criterion is recorded as passed', !/\bAC\d+\b[^.\n|]*\b(has passed|was passed|is passed)\b/.test(recorded.replaceAll('AC1 to AC49 are unrun, and none is passed', '')));
check('verdict is consistent', s18.includes('**Verdict: READY WITH EXPLICIT LIMITATIONS.**') && d42.includes('READY WITH EXPLICIT LIMITATIONS') && /FZ-1 to FZ-6 \(D-042\).*READY WITH EXPLICIT LIMITATIONS/.test(contract));
check('the verdict does not freeze the contract', s18.includes('This verdict does not freeze the contract') && d42.includes('The contract is not frozen'));
const t9 = 'The Q reward input is `rewardSignal`. `rewardCurrentEpisode(10)` has no contract role.';
check('T9 history is preserved', contract.includes(`**T9.** ${t9}`) && decisionOf('D-041').includes(t9));
check('T4 stays separate from T3', d42.includes('T4 stays distinct from T3'));
check('both Q-write paths stay', d42.includes('Both existing Q-write paths stay unchanged'));
check('no separation is claimed', s18.includes('No separation is implemented, and none is claimed'));
check('MFW-P limitation is recorded', s18.includes('`MFW-P` does not exist in the pinned tree') && s19.includes('the original pinned-tree verification condition did not pass') && d43.includes('did not pass'));
check('freeze is a specification baseline only', s19.includes('This freezes the current specification baseline only') && d43.includes('This freezes the specification baseline only'));
check('freeze allows amendment', s19.includes('may require a documented amendment and renewed review') && d43.includes('may require a documented amendment and renewed review'));
check('freeze authorizes nothing and validates nothing', s19.includes('The freeze authorizes no implementation, test, parity run, feasibility work or experiment') && s19.includes('independently validated') && d43.includes('This entry authorizes no implementation'));
check('freeze closes nothing', s19.includes('This freeze closes no open marker and no acceptance criterion') && d43.includes('No open marker is closed'));
check('E1 metadata is not parity evidence', s19.includes('reproducibility metadata') && s19.includes('They are not parity evidence') && d43.includes('reproducibility metadata, not parity evidence'));
check('guard separation is not implemented', s19.includes('The separation is not implemented') && d43.includes('The separation is not implemented'));

// ---- report ----
for (const f of failures) console.log(`FAIL  ${f}`);
console.log(`PASS ${passes}  FAIL ${fails}  NOT CHECKED ${skipped}`);
console.log('Category 1 documentation check only. It says nothing about runtime behaviour or acceptance.');
process.exit(fails ? 1 : 0);
