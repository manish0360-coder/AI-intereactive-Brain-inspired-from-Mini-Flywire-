// ==========================================================
// PHASE 1.0 — MILESTONE 5 (F2 stale-action path) GATE : S3.1 – S3.7
// ==========================================================
// Drives the REAL main.js under the headless shim. All instrumentation is
// external: an accessor on globalThis.lastReasoning plus main.js's own
// exported _diagCounters. No application code is modified by the test.
import { boot, pressSpace } from './_driver.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
let pass=0, fail=0;
const ok=(n,c,x='')=>{c?pass++:fail++;console.log(`${c?'PASS':'FAIL'}  ${n}${x?'   '+x:''}`);};

// ---------- S3.1 static: the epsilon path can no longer exit early ----------
console.log('── S3.1  static: no early return between the epsilon draw and the decision ──');
const src = fs.readFileSync(path.join(ROOT,'main.js'),'utf8');
const epsStart = src.indexOf('if (liveRng() < epsilon');
const lrWrite  = src.indexOf('window.lastReasoning = {');
const between  = src.slice(epsStart, lrWrite);
const bareReturn = /\n\s*return;\s*(\/\/[^\n]*)?\n/.test(between.slice(0, between.indexOf('const sorted')));
ok('S3.1a epsilon block contains no `return`', !bareReturn);
ok('S3.1b epsilon draw precedes the lastReasoning write', epsStart>0 && lrWrite>epsStart);
ok('S3.1c the drawn candidate is what gets executed',
   src.includes('let nextKey = exploreChoice ? exploreChoice.key : topChoices[0].key;'));

// ---------- helper: one child process per run (main.js is an ESM singleton) ----------
import { execFileSync } from 'node:child_process';
function run({seed, boost=0, ticks=80}){
  const out = execFileSync(process.execPath, ['_runonce.js'], {
    cwd: path.dirname(fileURLToPath(import.meta.url)),
    env: {...process.env, SEED:String(seed), BOOST:String(boost), TICKS:String(ticks)},
    encoding:'utf8', maxBuffer: 64*1024*1024 });
  return JSON.parse(out.slice(out.indexOf('@@RESULT@@')+10));
}

const lo = run({seed:20260818, boost:0});
const hi = run({seed:20260818, boost:1});

// ---------- S3.2 the epsilon-caused staleness is gone ----------
console.log('\n── S3.2  stale executions reduced to the non-epsilon residual ──');
const PRE_STALE = 67, PRE_STEPS = 381;      // measured pre-fix, same seed/ticks
console.log(`      pre-fix : ${PRE_STALE}/${PRE_STEPS} steps stale (${(PRE_STALE/PRE_STEPS*100).toFixed(1)}%)`);
console.log(`      post-fix: ${lo.stale}/${lo.steps} steps stale (${(lo.stale/lo.steps*100).toFixed(1)}%)`);
console.log(`      residual cause: main.js takes the replay branch on ~8% of steps`);
console.log(`      (liveRng() < 0.92 else replayOneEpisode) and never calls runPrediction,`);
console.log(`      so lastReasoning is not refreshed. Separate defect; NOT in M5 scope.`);
ok('S3.2  stale executions cut by >=70% vs the pre-fix baseline',
   lo.stale <= PRE_STALE*0.3, `${PRE_STALE} -> ${lo.stale}`);

// ---------- S3.3 the stale rate must not track epsilon ----------
console.log('\n── S3.3  stale rate does not increase with epsilon (the defect signature) ──');
console.log(`      natural epsilon : stale ${lo.stale}/${lo.steps} = ${(lo.stale/lo.steps*100).toFixed(1)}%`);
console.log(`      epsilon pinned  : stale ${hi.stale}/${hi.steps} = ${(hi.stale/hi.steps*100).toFixed(1)}%`);
console.log(`      (pre-fix baseline for the same seeds was 17.6% -> 40.9%)`);
ok('S3.3  raising epsilon does not raise the stale rate', (hi.stale/Math.max(1,hi.steps)) <= (lo.stale/Math.max(1,lo.steps)) + 0.02);

// ---------- S3.4 exploration actually changes what is executed ----------
console.log('\n── S3.4  exploration changes the executed action sequence ──');
const a = run({seed:777, boost:0, ticks:40});
const b = run({seed:777, boost:1, ticks:40});
const common = Math.min(a.writes.length,b.writes.length);
let diffAt=-1; for(let i=0;i<common;i++) if(a.writes[i]!==b.writes[i]){diffAt=i;break;}
ok('S3.4  a higher epsilon produces a different executed path', diffAt>=0,
   `first divergence at decision #${diffAt}`);

// ---------- S3.5 seeded end-to-end determinism (the deferred S4.2) ----------
console.log('\n── S3.5  seeded determinism of the full executed action sequence ──');
const r1 = run({seed:31337, boost:0, ticks:50});
const r2 = run({seed:31337, boost:0, ticks:50});
const r3 = run({seed:31338, boost:0, ticks:50});
ok('S3.5a same seed -> identical executed action sequence',
   JSON.stringify(r1.writes)===JSON.stringify(r2.writes), `${r1.writes.length} decisions`);
ok('S3.5b different seed -> different sequence',
   JSON.stringify(r1.writes)!==JSON.stringify(r3.writes));

// ---------- S3.6 subsystem branch migration (MEASURE ONLY, Q2 deferred) ----------
console.log('\n── S3.6  subsystem side effect of F2 (measure only — do NOT fix) ──');
console.log(`      The seven writers in runAgent's \`else\` branch fire only when`);
console.log(`      evaluatePredictionError() returns null. F2 removes the epsilon`);
console.log(`      cause of that, leaving only the replay branch (main.js: liveRng() < 0.92).`);
console.log(`      else-branch executions, pre-fix : 67 / 381 steps (17.6%)`);
console.log(`      else-branch executions, post-fix: ${lo.stale} / ${lo.steps} steps (${(lo.stale/lo.steps*100).toFixed(1)}%)`);
ok('S3.6  else-branch activity measured and reduced, not eliminated', lo.stale>0 && lo.stale<67,
   'residual cause = the 8% replay branch, reported not repaired');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
