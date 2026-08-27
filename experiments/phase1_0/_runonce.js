// One booted agent run per process (main.js is an ESM singleton with side effects).
import { boot, pressSpace } from './_driver.js';
const seed  = Number(process.env.SEED  ?? 20260818);
const boost = Number(process.env.BOOST ?? 0);
const ticks = Number(process.env.TICKS ?? 80);
const { dom, timer, restore, main } = await boot({ seed });
const writes=[]; let _lr=globalThis.lastReasoning;
Object.defineProperty(globalThis,'lastReasoning',{configurable:true,
  get(){return _lr;}, set(v){_lr=v; writes.push(v?`${v.from}->${v.to}`:null);}});
if (boost>0) Object.defineProperty(globalThis,'_predictionErrorEpsilonBoost',
  {configurable:true, get(){return boost;}, set(){}});
const diag = main._diagCounters;
pressSpace(dom);
const per=[];
for(let i=0;i<ticks;i++){ const w=writes.length,q=diag.mqfTotal;
  if(!timer.tick()) break; per.push({d:writes.length-w,s:diag.mqfTotal-q}); }
restore();
const d=per.reduce((a,r)=>a+r.d,0), s=per.reduce((a,r)=>a+r.s,0);
process.stdout.write('@@RESULT@@'+JSON.stringify({
  seed, boost, ticks:per.length, decisions:d, steps:s,
  stale:Math.max(0,s-d), staleTicks:per.filter(r=>r.s>r.d).length, writes }));
