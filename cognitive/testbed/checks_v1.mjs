// ==========================================================
// CF-03 testbed — checks added after CF-01 (checks.mjs stays unchanged)
// ==========================================================
// checkSourceIsolation  the CF-01 agent rules for a module with its own allowed-import list (core modules may import
//                       agent_util.mjs and each other, nothing else)
// checkInvariance       counterfactual invariance: two runs that differ only in something hidden from the agent
//                       must produce identical action sequences until the first step at which the agent could have
//                       observed the difference
// ==========================================================

const stripComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
const FORBIDDEN = [
  ['Math.random', /\bMath\.random\b/], ['Date', /\bDate\b/], ['performance', /\bperformance\b/], ['process', /\bprocess\b/],
  ['require', /\brequire\s*\(/], ['dynamic import', /\bimport\s*\(/], ['globalThis', /\bglobalThis\b/], ['window', /\bwindow\b/],
  ['eval', /\beval\s*\(/], ['Function constructor', /\bnew\s+Function\b|\bFunction\s*\(/], ['timers', /\bset(?:Timeout|Interval|Immediate)\b/],
];

export function checkSourceIsolation(src, allowed, name = 'module') {
  const p = [];
  const code = stripComments(src);
  for (const m of code.matchAll(/^\s*(?:import|export)\b[^;]*?from\s*['"]([^'"]+)['"]|^\s*import\s*['"]([^'"]+)['"]/gm)) {
    const spec = m[1] ?? m[2];
    if (!allowed.includes(spec)) p.push(`${name} imports ${spec}`);
  }
  for (const [label, re] of FORBIDDEN) if (re.test(code)) p.push(`${name} uses ${label}`);
  return p;
}

/** seqA/seqB: arrays of [stateLabel, action]; allowedFrom: first index at which the runs may differ. */
export function checkInvariance(seqA, seqB, allowedFrom) {
  const n = Math.min(seqA.length, seqB.length, allowedFrom);
  for (let i = 0; i < n; i++) {
    if (seqA[i][0] !== seqB[i][0] || seqA[i][1] !== seqB[i][1]) return [`runs differ at step ${i}, before the difference was observable (step ${allowedFrom})`];
  }
  return [];
}
