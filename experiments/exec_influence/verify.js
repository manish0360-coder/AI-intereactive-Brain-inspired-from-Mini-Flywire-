// ======================================
// experiments/verify.js  — M1 acceptance tests
// ======================================
import { initRng, cognitiveRng } from "../../instrumentation/rng.js";
import { configureBus, resetBus, subscribe, emit } from "../../instrumentation/telemetryBus.js";
import { validateEnvelope, makeEnvelope, CHANNELS, TYPES } from "../../instrumentation/traceSchema.js";
import * as scoring from "./scoring.real.js";

let pass = 0, fail = 0;
const ok = (name, cond) => { (cond ? pass++ : fail++); console.log(`${cond ? "PASS" : "FAIL"}  ${name}`); };

// ---- T1: RNG determinism — same seed => identical stream ----
initRng(999); const a = [cognitiveRng(), cognitiveRng(), cognitiveRng()];
initRng(999); const b = [cognitiveRng(), cognitiveRng(), cognitiveRng()];
ok("T1 rng deterministic (same seed -> same stream)", JSON.stringify(a) === JSON.stringify(b));

// ---- T2: RNG independence — different seed => different stream ----
initRng(1000); const c = [cognitiveRng(), cognitiveRng()];
ok("T2 rng seed-sensitive (diff seed -> diff stream)", JSON.stringify(c) !== JSON.stringify(b.slice(0,2)));

// ---- T3: decision determinism — same seed => identical finalWeight ----
const ctx = { transitionBoost:2,qValue:3,reward:4,habitBoost:1,curiosityBoost:2,chainReward:1,
  meaningBoost:1,boredomPenalty:0,curiosityState:3,confidenceState:6,stressState:4,fatigueState:3,
  focusState:2,dangerPenalty:0,selfLoopPenalty:0,bayesianTrust:0.6,dominantDrive:"boredom" };
initRng(7); const s1 = scoring.calculateDecisionScore({ ...ctx, rng: cognitiveRng });
initRng(7); const s2 = scoring.calculateDecisionScore({ ...ctx, rng: cognitiveRng });
ok("T3 decision deterministic under fixed seed", s1 === s2);

// ---- T4: behavior-neutrality — telemetry ON vs OFF => identical decision ----
resetBus();
configureBus({ enable: false });                 // OFF
initRng(7); const off = scoring.calculateDecisionScore({ ...ctx, rng: cognitiveRng });
let seen = 0; const unsub = subscribe(() => seen++);
configureBus({ enable: true, strictValidation: true, run: "neutrality" }); // ON
initRng(7); const on = scoring.calculateDecisionScore({ ...ctx, rng: cognitiveRng });
unsub();
ok("T4 behavior-neutral (telemetry on/off -> identical decision)", off === on);

// ---- T5: schema validator accepts good, rejects bad ----
const good = makeEnvelope({ runId:"r", tickId:0, channel:CHANNELS.DECISION, type:TYPES.DECISION_FRAME, payload:{} });
ok("T5a valid envelope passes", validateEnvelope(good).ok === true);
ok("T5b bad channel rejected", validateEnvelope({ ...good, channel:"nope" }).ok === false);
ok("T5c missing field rejected", validateEnvelope({ channel:CHANNELS.TICK }).ok === false);

// ---- T6: bus is a no-op when disabled (no events delivered) ----
resetBus(); let got = 0; subscribe(() => got++);
configureBus({ enable: false });
emit({ tickId:0, channel:CHANNELS.TICK, type:TYPES.TICK_OPEN, payload:{} });
ok("T6 disabled bus delivers nothing", got === 0);

resetBus();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);