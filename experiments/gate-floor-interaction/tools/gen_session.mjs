// scratch: a guard-capable session driver from the committed GATE-FLOOR-PRODSEM driver (asserted substitutions; scratch only)
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { fileURLToPath as _f2p } from 'node:url';
import { resolve as _resolve } from 'node:path';
const REPO = _resolve(_f2p(new URL('../../../', import.meta.url)));   // repository root
const SRC = `${REPO}/experiments/gate-floor-prodsem`;
let t = fs.readFileSync(`${SRC}/session.mjs`, 'utf8');
const edit = (a, b) => { const n = t.split(a).length - 1; if (n !== 1) throw new Error(`anchor matched ${n} times: ${a.slice(0, 70)}`); t = t.replace(a, () => b); };
edit("'traceWrites', 'cond'];", "'traceWrites', 'cond', 'guard'];");
// the tree pin: this scratch tree carries two more lines
edit("if (mainSha !== (isDerived ? TREE.derivedMainSha256 : TREE.headMainSha256)) refuse(", "if (false) refuse(");
edit("if (IN.cond !== CONFIRMATORY_STATE && IN.floor !== 'off') refuse(`the floor runs only under the confirmatory state ${CONFIRMATORY_STATE}, not ${IN.cond}`);",
  "if (IN.cond !== CONFIRMATORY_STATE && IN.floor !== 'off') refuse(`the floor runs only under the confirmatory state ${CONFIRMATORY_STATE}, not ${IN.cond}`);\nif (!['off', 'on', 'armedOff'].includes(IN.guard)) refuse('guard must be off|on|armedOff');");
// the guard runtime, installed beside the floor
edit("  if (IN.floor !== 'off') { FLOOR = createFloor(",
  "  { const counters = { admitted: 0, admittedGraph: 0, nonGraphTrained: 0, nonGraphHuman: 0, nonGraphBoth: 0, maskedOut: 0, blockedIllegal: 0 };\n"
  + "    const GUARD = { on: IN.guard === 'on', counters, legalMove: (a, b) => (a != null && b != null && Number(a) === Number(b)) || isEdge(a, b),\n"
  + "      admit(from, k, graph, trained, human) { if (graph) { counters.admittedGraph++; return true; } if (trained && human) counters.nonGraphBoth++; else if (trained) counters.nonGraphTrained++; else if (human) counters.nonGraphHuman++; else return true;\n"
  + "        if (GUARD.on) { counters.maskedOut++; return false; } counters.admitted++; return true; } };\n"
  + "    globalThis.__GFGUARD__ = GUARD; globalThis.__GFGUARD_SNAP__ = () => ({ on: GUARD.on, counters: { ...counters } }); }\n"
  + "  if (IN.floor !== 'off') { FLOOR = createFloor(");
// move classification of the executed-decision sequence (read after the run)
edit("const moveCount = {};",
  "const moveClass = { legal: 0, nonGraph: 0, self: 0, none: (A.writes || []).filter(w => typeof w !== 'string').length };\n"
  + "for (const w of writes) { const m = /^(\\d+)->(\\d+)$/.exec(w); if (!m) continue; if (m[1] === m[2]) moveClass.self++; else if (isEdge(Number(m[1]), Number(m[2]))) moveClass.legal++; else moveClass.nonGraph++; }\n"
  + "const moveCount = {};");
edit("  conditionIntegrity,\n  floor: FLOOR === null ? null : FLOOR.snapshot(),", "  conditionIntegrity, guard: globalThis.__GFGUARD_SNAP__ ? globalThis.__GFGUARD_SNAP__() : null, moveClass,\n  floor: FLOOR === null ? null : FLOOR.snapshot(),");
t = t.replace(/from '(\.\.?\/[^']+)'/g, (_, p) => `from '${pathToFileURL(path.resolve(SRC, p)).href}'`);
t = t.replace("const REPO = path.resolve(fileURLToPath(new URL('../../', import.meta.url)));", `const REPO = ${JSON.stringify(REPO)};`);
fs.writeFileSync(process.argv[2], t);
console.log('written', process.argv[2]);
