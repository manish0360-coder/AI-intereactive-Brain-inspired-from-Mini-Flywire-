// ==========================================================
// CREDIT-1 — timing-diagnostic clock preload (the TIMING_DIAGNOSTIC procedure only; clock.mjs holds the rules)
// ==========================================================
//   node --import <file URL of this module> experiments/credit1/session.mjs '<session input with a clock field>'
// Installs, before the driver or any runtime module runs, from the session input (process.argv[2]):
//   * Date.now per mode (clock.mjs): VIRTUAL / REAL_RECORD / REPLAY_FULL / REPLAY_SITE; every read is attributed to its calling
//     site (tree-relative file:line) and counted;
//   * a setTimeout wrapper: a callback named runAgentLoop must be scheduled with exactly 500 ms (anything else throws and is
//     recorded); when the harness fires it, the virtual clock advances by that delay and the loop runs.  Nothing else advances
//     the clock: other callbacks, reads, setInterval, setImmediate and promises do not.
// Any invalid configuration throws here, so node exits before the driver runs (fail closed).  The frozen, non-configurable
// marker globalThis.__CREDIT1_CLOCK__ lets the driver verify the installation and read the observations.
// ==========================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { clockConfigProblems, frameSites, sha256, LOOP_DELAY_MS, LOOP_CALLBACK_NAME, MARKER, SCHEMA_SITE } from './clock.mjs';

const fail = (m) => { throw new Error(`CREDIT-1 clock preload refused: ${m}`); };
let input = null;
try { input = JSON.parse(process.argv[2]); } catch { fail('the session input (argv[2]) is not JSON'); }
if (!input || typeof input !== 'object' || input.clock === undefined) fail('the session input carries no clock configuration');
const cfg = input.clock;
const cfgProblems = clockConfigProblems(cfg);
if (cfgProblems.length) fail(cfgProblems.join('; '));
if (typeof input.tree !== 'string' || !input.tree) fail('the session input names no tree');
if (globalThis[MARKER] !== undefined) fail('a clock is already installed');
const TREE_BASE = path.basename(input.tree);
const SELF_SHA = sha256(fs.readFileSync(fileURLToPath(import.meta.url)));

// the replay source: a REAL_RECORD trace, byte-checked against the configured hash
let REC = null;
if (cfg.mode === 'REPLAY_FULL' || cfg.mode === 'REPLAY_SITE') {
  let bytes = null;
  try { bytes = fs.readFileSync(cfg.replayPath); } catch { fail(`the replay source ${cfg.replayPath} cannot be read`); }
  if (sha256(bytes) !== cfg.replaySha256) fail('the replay source does not match replaySha256');
  let t = null;
  try { t = JSON.parse(bytes.toString('utf8')); } catch { fail('the replay source is not JSON'); }
  if (!t || t.mode !== 'REAL_RECORD' || !Array.isArray(t.reads)) fail('the replay source is not a REAL_RECORD trace');
  REC = cfg.mode === 'REPLAY_FULL' ? t.reads : t.reads.filter(r => r[0] === SCHEMA_SITE).map(r => r[1]);
}

const realNow = Date.now;
let virtual = cfg.t0;                                   // VIRTUAL and REPLAY_SITE only
let reads = 0, siteReads = 0, loopFires = 0;
const readsBySite = new Map(), delays = new Map(), violations = [], schemaVia = [], recording = [];
const violation = (kind, detail) => { violations.push({ kind, ...detail }); return new Error(`CREDIT-1 clock: ${kind} ${JSON.stringify(detail)}`); };
const callSites = () => { const lim = Error.stackTraceLimit; try { Error.stackTraceLimit = 8; return frameSites(new Error().stack, TREE_BASE); } finally { Error.stackTraceLimit = lim; } };

function now() {
  const [site, via] = callSites();
  const i = reads++;
  readsBySite.set(site, (readsBySite.get(site) || 0) + 1);
  if (site === SCHEMA_SITE) schemaVia.push(via);
  if (cfg.mode === 'VIRTUAL') return virtual;
  if (cfg.mode === 'REAL_RECORD') { const v = realNow.call(Date); recording.push([site, v]); return v; }
  if (cfg.mode === 'REPLAY_FULL') {
    if (i >= REC.length) throw violation('replay-overrun', { read: i, site });
    if (REC[i][0] !== site) throw violation('replay-site-mismatch', { read: i, expected: REC[i][0], got: site });
    return REC[i][1];
  }
  if (site !== SCHEMA_SITE) return virtual;             // REPLAY_SITE: the virtual clock away from the throttle site
  const j = siteReads++;
  if (j >= REC.length) throw violation('replay-overrun', { read: i, site });
  return REC[j];
}

// the agent loop: scheduled only with the declared delay; the clock advances when the harness fires it, never earlier
function loopFired(delay) {
  loopFires++;
  delays.set(delay, (delays.get(delay) || 0) + 1);
  if (cfg.mode === 'VIRTUAL' || cfg.mode === 'REPLAY_SITE') virtual += delay;
}
let inner = globalThis.setTimeout;
function setTimeoutClocked(fn, delay, ...rest) {
  if (typeof fn === 'function' && fn.name === LOOP_CALLBACK_NAME) {
    if (!(typeof delay === 'number' && delay === LOOP_DELAY_MS)) throw violation('loop-delay', { delay: String(delay) });
    const target = fn;
    const fire = { [LOOP_CALLBACK_NAME](...a) { loopFired(delay); return target.apply(this, a); } }[LOOP_CALLBACK_NAME];
    return inner(fire, delay, ...rest);
  }
  return inner(fn, delay, ...rest);
}
Object.defineProperty(globalThis, 'setTimeout', { configurable: true, enumerable: true, get() { return setTimeoutClocked; }, set(v) { inner = v; } });
Object.defineProperty(Date, 'now', { value: now, writable: true, enumerable: false, configurable: true });

const sorted = (m) => Object.fromEntries([...m].sort(([a], [b]) => (String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0)));
Object.defineProperty(globalThis, MARKER, { enumerable: false, configurable: false, writable: false, value: Object.freeze({
  installed: true,
  config: Object.freeze({ ...cfg }),
  preloadSha256: SELF_SHA,
  now,
  observed: () => ({ reads, readsBySite: sorted(readsBySite), schemaReads: schemaVia.length, loopFires, delays: sorted(delays), violations: violations.map(v => ({ ...v })) }),
  schemaVia: (from = 0) => schemaVia.slice(from),
  recording: () => recording.slice(),
}) });
