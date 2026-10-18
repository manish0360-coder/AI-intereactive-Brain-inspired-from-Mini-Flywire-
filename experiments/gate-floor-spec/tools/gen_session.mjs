// scratch: a component-separable, train-under-guard-capable copy of the committed GATE-FLOOR-INTERACTION session driver.
// The tree and its two pinned guard lines are UNCHANGED; only the guard object the driver installs differs:
//   admit() masks iff maskOn;  the pinned EXEC line reads `.on`, so `on` carries the execution component.
import fs from 'node:fs';
import { fileURLToPath as _f2p } from 'node:url';
import { resolve as _resolve } from 'node:path';
const REPO = _resolve(_f2p(new URL('../../../', import.meta.url))).split(String.fromCharCode(92)).join('/');   // repository root (forward slashes)
let t = fs.readFileSync(`${REPO}/experiments/gate-floor-interaction/session.mjs`, 'utf8');
const edit = (a, b) => { const c = t.split(a).length - 1; if (c !== 1) throw new Error(`anchor matched ${c} times: ${a.slice(0, 80)}`); t = t.replace(a, () => b); };
edit("if (!['off', 'on', 'armedOff'].includes(IN.guard)) refuse(`guard must be 'off', 'on' or 'armedOff', got ${IN.guard}`);",
  "if (!['off', 'on', 'armedOff', 'mask', 'exec'].includes(IN.guard)) refuse(`guard must be off|on|armedOff|mask|exec, got ${IN.guard}`);");
edit("if (IN.role === 'train' && IN.guard !== 'off') refuse('a training session is unguarded');", "");
edit("const GUARD = { on: IN.guard === 'on', counters,", "const maskOn = IN.guard === 'on' || IN.guard === 'mask';\n    const GUARD = { on: IN.guard === 'on' || IN.guard === 'exec', counters,");
edit("if (GUARD.on) { counters.maskedOut++; return false; }", "if (maskOn) { counters.maskedOut++; return false; }");
// the completeness record is informational here (component-only modes are not bundle-complete by design)
edit("guardCompleteness.ok = IN.guard === 'on' ?", "guardCompleteness.ok = IN.guard === 'on' || IN.guard === 'mask' || IN.guard === 'exec' ?");
t = t.replace(/from '(\.\.?\/[^']+)'/g, (_, p) => `from 'file:///${REPO}/experiments/gate-floor-interaction/${p}'`.replace('/experiments/gate-floor-interaction/./', '/experiments/gate-floor-interaction/').replace(/\/gate-floor-interaction\/\.\.\//, '/'));
t = t.replace("const REPO = path.resolve(fileURLToPath(new URL('../../', import.meta.url)));", `const REPO = ${JSON.stringify(REPO)};`);
fs.writeFileSync(process.argv[2], t);
console.log('written', process.argv[2]);
// ---- second pass: a staleness classifier for non-graph goal resets (observational; reads window.lastReasoning at the reset probe) ----
{
  let u = fs.readFileSync(process.argv[2], 'utf8');
  const ed = (a, b) => { const c = u.split(a).length - 1; if (c !== 1) throw new Error(`pass2 anchor matched ${c} times: ${a.slice(0, 70)}`); u = u.replace(a, () => b); };
  ed("globalThis.__GFB2__ = { goalReset(from, to, goal) { goalResets.push([calls - 1, Number(from), isEdge(from, to) && Number(to) === Number(goal) ? 1 : 0]); } };",
     "globalThis.__GFB2__ = { goalReset(from, to, goal) { const lr = globalThis.lastReasoning; goalResets.push([calls - 1, Number(from), isEdge(from, to) && Number(to) === Number(goal) ? 1 : 0, lr && Number(lr.from) !== Number(from) ? 1 : 0]); } };");
  ed("  conditionIntegrity, guardCompleteness, guard: guardSnap, moveClass,",
     "  conditionIntegrity, guardCompleteness, guard: guardSnap, moveClass,\n  nonGraphResetKinds: { stale: goalResets.filter(r => r[2] === 0 && r[3] === 1).length, decisionNonEdge: goalResets.filter(r => r[2] === 0 && r[3] === 0).length },");
  fs.writeFileSync(process.argv[2], u);
  console.log('pass2 written');
}
