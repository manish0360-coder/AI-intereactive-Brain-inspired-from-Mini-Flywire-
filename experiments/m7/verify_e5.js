// ==========================================================
// M7 — E5 LEARNING-AUTHORITY PINNING / G12 SUBSTRATE VERIFICATION
// ==========================================================
// GOVERNING SOURCE: frozen M7_PREREGISTRATION.md
//   SHA-256 2f12e309d7409e95f3d1bca34135110e518865fd01d96e5eeaee347b6e33f6b9
//   §18.3 E5  "main.js:3846 / 3899 — Pin learningAuthority = 1.0; disable dampQ"
//   §10.2     "In every confirmatory arm: learningAuthority is pinned to
//              exactly 1.0, and dampQ is disabled."
//   §10.3     G12(a)-(d), including the un-pinned anti-vacuity control
//   §4.3      the pin is held identical across ALL arms (not an arm switch)
//
// REAL EXECUTION SITES (verified by inspection, then exercised here):
//   effectiveLR = 0.1 * learningAuthority   -> updateQ({ alpha })
//   if (compositeError > 0.20) dampQ(...)
// A third mention of learningAuthority is a console log only and carries no
// behaviour, so it is deliberately not intervened on.
//
// THIS IS NOT AN EXPERIMENT. Short deterministic tick budgets, no metric is
// estimated, nothing is persisted as experimental data.
//
// PIN MODES form a 2x2 so each pathway can be ISOLATED:
//   on         LA pinned + dampQ disabled     (the frozen confirmatory setting)
//   off        neither                        (G12(d) un-pinned control)
//   la-only    LA pinned, dampQ ACTIVE        (isolates dampQ)
//   damp-only  LA raw,    dampQ disabled      (isolates the pin)
// ==========================================================
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
let pass = 0, fail = 0;
const ok = (n, c, x = '') => { c ? pass++ : fail++; console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${x ? '   ' + x : ''}`); };

const SEED = 20260819000, TICKS = 60;

function run({ arm = 'A1', pin = 'on', hook = 'on', ticks = TICKS }) {
  const out = execFileSync(process.execPath, ['_armrun.js'], {
    cwd: HERE, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024,
    env: { ...process.env, ARM: arm, SEED: String(SEED), TICKS: String(ticks), HOOK: hook, PIN: pin }
  });
  return JSON.parse(out.slice(out.indexOf('@@RESULT@@') + 10));
}

console.log('==============================================================');
console.log(' M7 E5 / G12 SUBSTRATE VERIFICATION  (not an experiment)');
console.log('==============================================================');
console.log(`      seed ${SEED}, ${TICKS} ticks, one process per run`);

const ON        = run({ pin: 'on' });
const OFFPIN    = run({ pin: 'off' });
const LA_ONLY   = run({ pin: 'la-only' });
const DAMP_ONLY = run({ pin: 'damp-only' });
const NOHOOK    = run({ arm: 'OFF', hook: 'off' });
const ARM_OFF   = run({ arm: 'OFF', hook: 'on' });

console.log('\n      PIN         laSteps  exactly1  rawBelow1  dampInvoked  dampSuppr  qEntries       qSum');
for (const [n, r] of [['on', ON], ['off', OFFPIN], ['la-only', LA_ONLY], ['damp-only', DAMP_ONLY]])
  console.log('      ' + n.padEnd(11) + String(r.laSteps).padStart(8) + String(r.laExactlyOne).padStart(10)
    + String(r.laRawBelowOne).padStart(11) + String(r.dampInvoked).padStart(13)
    + String(r.dampSuppressed).padStart(11) + String(r.qEntries).padStart(10) + String(r.qSum).padStart(12));

// ---------- 1. M7-off preserves original behaviour ----------
console.log('\n-- 1  M7-off preserves the original behaviour ----------------');
ok('1a no hook installed => the E5 hook is absent',
   NOHOOK.peHookInstalled === false && NOHOOK.laSteps === 0 && NOHOOK.dampInvoked === 0 && NOHOOK.dampSuppressed === 0,
   'the guarded expressions reduce to the originals');
ok('1b OFF arm installs no E5 hook (pin follows arms.pinsPredictionErrorPathway)',
   ARM_OFF.peHookInstalled === false, 'frozen §4.3: pinned for M7 arms, not for OFF');
ok('1c OFF reproduces the no-hook action sequence exactly',
   JSON.stringify(ARM_OFF.writes) === JSON.stringify(NOHOOK.writes));
ok('1d OFF reproduces the no-hook Q table exactly',
   ARM_OFF.qSum === NOHOOK.qSum && ARM_OFF.qEntries === NOHOOK.qEntries,
   `qSum ${NOHOOK.qSum}, ${NOHOOK.qEntries} entries`);

// ---------- 2. the intervention is reached at the real sites ----------
console.log('\n-- 2  the E5 sites are actually reached ----------------------');
ok('2a the learningAuthority site is reached', ON.laSteps > 0, `${ON.laSteps} learning steps`);
ok('2b the dampQ guard is reached', (ON.dampInvoked + ON.dampSuppressed) > 0,
   `${ON.dampSuppressed} suppressions — compositeError exceeded 0.20 that many times`);
ok('2c the raw authority genuinely varied (the pin is not vacuous)',
   ON.laRawBelowOne > 0 && ON.laDistinctRaw > 1,
   `${ON.laRawBelowOne}/${ON.laSteps} steps had raw < 1.0, ${ON.laDistinctRaw} distinct raw values`);

// ---------- 3. G12(a) learningAuthority is exactly 1.0 ----------
console.log('\n-- 3  G12(a): learningAuthority == 1.0 on 100% of steps ------');
ok('3a delivered authority was exactly 1.0 on every learning step',
   ON.laExactlyOne === ON.laSteps && ON.laSteps > 0,
   `${ON.laExactlyOne}/${ON.laSteps} = 100%`);
ok('3b the step count is reported per run (frozen G12(c), not sampled)',
   Number.isInteger(ON.laSteps) && ON.laSteps > 0, `laSteps=${ON.laSteps}`);

// ---------- 4. G12(b) dampQ genuinely disabled ----------
console.log('\n-- 4  G12(b): dampQ invoked exactly zero times ---------------');
ok('4a dampQ was invoked exactly zero times', ON.dampInvoked === 0);
ok('4b the guard condition WAS met and the call was still skipped',
   ON.dampSuppressed > 0,
   'not a vacuous zero: compositeError > 0.20 fired and dampQ was suppressed at the real site');
// genuinely disabled, not merely bypassed in the harness: isolate the pathway.
ok('4c disabling dampQ has a real, ISOLATED effect on the Q table',
   ON.qSum !== LA_ONLY.qSum,
   `on ${ON.qSum} vs la-only ${LA_ONLY.qSum} (authority pinned in both; only dampQ differs)`);
ok('4d the harness never patched dampQ itself',
   LA_ONLY.dampInvoked > 0,
   `la-only invoked dampQ ${LA_ONLY.dampInvoked} times through the same code path`);

// ---------- 5. Q-learning remains active ----------
console.log('\n-- 5  Q-learning remains active under the pin ----------------');
ok('5a the Q table is populated', ON.qEntries > 0, `${ON.qEntries} entries`);
ok('5b Q values accumulated', ON.qSum > 0, `qSum ${ON.qSum}`);
ok('5c pinning the authority RAISES the effective learning rate, as expected',
   ON.qSum > OFFPIN.qSum,
   `pinned ${ON.qSum} > unpinned ${OFFPIN.qSum} — alpha is 0.1*1.0 instead of 0.1*(<1)`);
ok('5d the pin alone has an isolated effect on Q',
   ON.qSum !== DAMP_ONLY.qSum,
   `on ${ON.qSum} vs damp-only ${DAMP_ONLY.qSum} (dampQ disabled in both; only the pin differs)`);

// ---------- 6. ANTI-VACUITY: a broken pin must be rejected ----------
console.log('\n-- 6  G12(d): a deliberately UN-PINNED run must FAIL ---------');
const g12a = (r) => r.laSteps > 0 && r.laExactlyOne === r.laSteps;
const g12b = (r) => r.dampInvoked === 0;
ok('6a G12(a) passes on the pinned run', g12a(ON));
ok('6b G12(a) FAILS on the un-pinned control', !g12a(OFFPIN),
   `${OFFPIN.laExactlyOne}/${OFFPIN.laSteps} exactly 1.0 — the counter detects the unpinned state`);
ok('6c G12(a) FAILS on damp-only (authority left raw)', !g12a(DAMP_ONLY),
   `${DAMP_ONLY.laExactlyOne}/${DAMP_ONLY.laSteps}`);

// ---------- 7. ANTI-VACUITY: restored damping must be rejected ----------
console.log('\n-- 7  a deliberately RESTORED damping path must FAIL ---------');
ok('7a G12(b) passes on the pinned run', g12b(ON));
ok('7b G12(b) FAILS on the un-pinned control', !g12b(OFFPIN),
   `dampQ invoked ${OFFPIN.dampInvoked} times`);
ok('7c G12(b) FAILS on la-only (damping restored while the pin stands)', !g12b(LA_ONLY),
   `dampQ invoked ${LA_ONLY.dampInvoked} times — proves 4a is not vacuous`);
ok('7d both G12 assertions together accept ONLY the fully pinned run',
   [ON, OFFPIN, LA_ONLY, DAMP_ONLY].filter(r => g12a(r) && g12b(r)).length === 1,
   'exactly 1 of the 4 PIN modes satisfies G12(a) AND G12(b)');

// ---------- 8. E3/E4 and arm integration unchanged ----------
console.log('\n-- 8  E3/E4 arm integration is unaffected by E5 --------------');
const A2 = run({ arm: 'A2', pin: 'on' });
const A5 = run({ arm: 'A5', pin: 'on' });
const A1 = run({ arm: 'A1', pin: 'on' });
ok('8a A2 still delivers bayesianTrust = 0.5 at E3',
   A2.e3.every(x => x.v === 0.5) && A2.e3DistinctDelivered === 1);
ok('8b A2 still delivers aggregateTrust = null at E4',
   A2.e4.every(x => x.v === null));
ok('8c A5 still severs only the per-edge route',
   A5.e3.every(x => x.v === 0.5) && A5.e4.every(x => x.v === x.raw));
ok('8d A1 still passes both routes through',
   A1.e3Differ === 0 && A1.e4.every(x => x.v === x.raw));
ok('8e the E5 pin is applied identically across arms (frozen §4.3)',
   A1.laExactlyOne === A1.laSteps && A2.laExactlyOne === A2.laSteps && A5.laExactlyOne === A5.laSteps,
   'not an arm switch — held identical');
ok('8f the E5 pin does not consume environment draws',
   ON.envDraws === 0 && A2.envDraws === 0);

console.log(`\n${pass} passed, ${fail} failed`);
if (fail === 0) console.log('E5 / G12 SUBSTRATE GREEN.');
process.exit(fail ? 1 : 0);
