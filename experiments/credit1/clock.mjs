// ==========================================================
// CREDIT-1 — timing-diagnostic clock: constants, configuration rule, driver guard, call-site attribution (pure; Node built-ins only)
// ==========================================================
// The loop-advanced virtual clock (variant C; owner's provisional design choice, 2026-10-28) and the diagnostic record/replay
// modes of TIMING_DIAGNOSTIC_PLAN.md.  clock_preload.mjs installs the clock (node --import) from the session input's `clock`
// field; the driver calls driverClockProblems before the session scope and before any runtime module is loaded.  Only the
// TIMING_DIAGNOSTIC procedure carries a clock: every other session must run with no node flag, no preload marker, no clock
// input and the native Date.now (fail closed both ways).
// Modes (Date.now as seen by the runtime):
//   VIRTUAL      t0 + (agent loops fired by the harness) x 500 ms; nothing else advances it
//   REAL_RECORD  the real clock; every read is recorded with its calling site (the source of a replay)
//   REPLAY_FULL  the recorded values of a REAL_RECORD trace, in read order; the calling site must match at every read
//   REPLAY_SITE  the recorded values of the schema-throttle site (render/schemaMemory.js:133) at that site; VIRTUAL elsewhere
// ==========================================================
import crypto from 'node:crypto';

export const CLOCK_PROCEDURE = 'TIMING_DIAGNOSTIC';
export const CLOCK_INPUT_KEYS = Object.freeze(['clock', 'tracePath']);          // session-input fields of the timing diagnostic only
export const CLOCK_MODES = Object.freeze(['VIRTUAL', 'REAL_RECORD', 'REPLAY_FULL', 'REPLAY_SITE']);
export const CLOCK_CONFIG_KEYS = Object.freeze(['mode', 't0', 'delayMs', 'replayPath', 'replaySha256']);
export const LOOP_DELAY_MS = 500;                // main.js `let agentSpeed = 500;`, the delay of setTimeout(runAgentLoop, agentSpeed)
export const LOOP_CALLBACK_NAME = 'runAgentLoop';  // the shim captures the agent loop by this name (benchmarks/harness/headlessShim.js)
export const REBUILD_INTERVAL_MS = 15000;        // render/schemaMemory.js REBUILD_INTERVAL_MS
export const T0A = 1767225600000;                // 2026-01-01T00:00:00Z
export const T0B = 1798761600000;                // 2027-01-01T00:00:00Z
export const T0_VALUES = Object.freeze([T0A, T0B]);
export const MARKER = '__CREDIT1_CLOCK__';
export const PRELOAD_FILE = 'clock_preload.mjs';
export const PRELOAD_SHA256 = '07f51c08ebf5b3546dacdb4a51512a10eb9d55fc0562797721899e7425cd2576';
// the schema throttle's clock read, and the three call sites of rebuildSchemas on the CREDIT-1 tree A (gate G11.4b)
export const SCHEMA_SITE = 'render/schemaMemory.js:133';
export const SCHEMA_CALLERS = Object.freeze({ L: 'main.js:5265', K: 'render/episodeManager.js:1224', F: 'render/episodeManager.js:1149' });
export const viaClass = (via) => (Object.entries(SCHEMA_CALLERS).find(([, s]) => s === via) || [null])[0];

export const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');
export const canonical = (v) => JSON.stringify(v, (k, x) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map(key => [key, x[key]])) : x));
const isVirtualMode = (m) => m === 'VIRTUAL' || m === 'REPLAY_SITE';
const isReplayMode = (m) => m === 'REPLAY_FULL' || m === 'REPLAY_SITE';

/** why a clock configuration is not one of the preregistered ones (empty = valid) */
export function clockConfigProblems(cfg) {
  if (cfg === null || typeof cfg !== 'object' || Array.isArray(cfg)) return ['the clock configuration must be an object'];
  const p = [];
  const unknown = Object.keys(cfg).filter(k => !CLOCK_CONFIG_KEYS.includes(k));
  if (unknown.length) p.push(`unknown clock field(s): ${unknown.join(', ')}`);
  if (!CLOCK_MODES.includes(cfg.mode)) p.push(`clock mode ${cfg.mode} is not one of ${CLOCK_MODES.join(', ')}`);
  if (cfg.delayMs !== LOOP_DELAY_MS) p.push(`delayMs must be ${LOOP_DELAY_MS}`);
  if (isVirtualMode(cfg.mode)) { if (!T0_VALUES.includes(cfg.t0)) p.push(`t0 must be one of ${T0_VALUES.join(', ')}`); }
  else if (cfg.t0 !== null) p.push(`t0 must be null in mode ${cfg.mode} (the real clock or the recording supplies every value)`);
  if (isReplayMode(cfg.mode)) {
    if (typeof cfg.replayPath !== 'string' || !cfg.replayPath) p.push('a replay mode needs replayPath');
    if (!/^[0-9a-f]{64}$/.test(String(cfg.replaySha256))) p.push('a replay mode needs replaySha256 (sha256 of the source trace file)');
  } else if (cfg.replayPath !== undefined || cfg.replaySha256 !== undefined) p.push(`mode ${cfg.mode} takes no replay source`);
  return p;
}

/** the configuration as recorded in a session record: no file path, so records of the same condition compare byte for byte */
export const recordedClockConfig = (cfg) => ({ mode: cfg.mode, t0: cfg.t0, delayMs: cfg.delayMs, replaySha256: cfg.replaySha256 === undefined ? null : cfg.replaySha256 });

const PRELOAD_FLAG = /(^|\s)(--import|--require|-r|--loader|--experimental-loader)(=|\s|$)/;
/** true only for the engine's own Date.now */
export const isNativeDateNow = (f) => typeof f === 'function' && f.name === 'now' && /\{\s*\[native code\]\s*\}\s*$/.test(Function.prototype.toString.call(f));

/**
 * the driver's clock guard (fail closed).  input: the session input; execArgv: process.execArgv; nodeOptions:
 * process.env.NODE_OPTIONS; marker: globalThis.__CREDIT1_CLOCK__; dateNow: Date.now; preloadUrl / preloadBytes: the file URL and
 * bytes of experiments/credit1/clock_preload.mjs.  Empty = the session may proceed to the lock's scope check.
 */
export function driverClockProblems({ input, execArgv, nodeOptions, marker, dateNow, preloadUrl, preloadBytes }) {
  const p = [];
  const diagnostic = !!input && typeof input === 'object' && input.procedure === CLOCK_PROCEDURE;
  if (typeof nodeOptions === 'string' && PRELOAD_FLAG.test(nodeOptions)) p.push('NODE_OPTIONS carries a preload or loader flag');
  if (!diagnostic) {
    for (const k of CLOCK_INPUT_KEYS) if (input && input[k] !== undefined) p.push(`${k} belongs to the ${CLOCK_PROCEDURE} procedure only`);
    if (!Array.isArray(execArgv) || execArgv.length !== 0) p.push('a session outside the timing diagnostic runs with no node flag (no preload)');
    if (marker !== undefined) p.push('a clock preload is installed outside the timing diagnostic');
    if (!isNativeDateNow(dateNow)) p.push('Date.now is not the native clock');
    return p;
  }
  p.push(...clockConfigProblems(input.clock).map(x => `clock: ${x}`));
  if (typeof input.tracePath !== 'string' || !input.tracePath) p.push('the timing diagnostic needs tracePath');
  if (!Array.isArray(execArgv) || execArgv.length !== 2 || execArgv[0] !== '--import' || execArgv[1] !== preloadUrl) p.push(`node flags must be exactly --import ${preloadUrl}`);
  if (!preloadBytes || sha256(preloadBytes) !== PRELOAD_SHA256) p.push(`the preload file is not the pinned ${PRELOAD_FILE}`);
  if (!marker || typeof marker !== 'object' || !Object.isFrozen(marker) || marker.installed !== true) p.push('the clock preload marker is missing or not frozen');
  else {
    if (canonical(marker.config) !== canonical(input.clock)) p.push('the installed clock configuration differs from the session input');
    if (marker.preloadSha256 !== PRELOAD_SHA256) p.push('the installed preload reports another hash');
    if (dateNow !== marker.now) p.push('Date.now is not the installed clock');
  }
  return p;
}

/**
 * [site, via] of a clock read from a V8 stack: the first two frames outside the preload, as tree-relative 'file:line' (the
 * tree directory's base name anchors the path, so 8.3 and long forms of the same path agree); frames outside the tree are
 * 'EXT:<file name>:<line>'.  via is the caller of the reading function (for the schema site: which rebuildSchemas caller).
 */
export function frameSites(stack, treeBase, selfFile = PRELOAD_FILE) {
  const norm = (p) => { let s = String(p); try { s = decodeURIComponent(s); } catch { /* keep */ } return s.replace(/\\/g, '/').replace(/^file:\/\/\/?/, ''); };
  const anchor = '/' + String(treeBase).toLowerCase() + '/';
  const out = [];
  for (const raw of String(stack).split('\n').slice(1)) {
    const m = raw.match(/\(([^()]+):(\d+):(\d+)\)\s*$/) || raw.match(/^\s*at\s+(.+):(\d+):(\d+)\s*$/);
    if (!m) continue;
    const file = norm(m[1]), low = file.toLowerCase();
    if (low.endsWith('/' + selfFile.toLowerCase())) continue;
    const i = low.lastIndexOf(anchor);
    out.push(i >= 0 ? `${file.slice(i + anchor.length)}:${m[2]}` : `EXT:${file.split('/').pop()}:${m[2]}`);
    if (out.length === 2) break;
  }
  return [out[0] || 'UNKNOWN', out[1] || 'UNKNOWN'];
}
