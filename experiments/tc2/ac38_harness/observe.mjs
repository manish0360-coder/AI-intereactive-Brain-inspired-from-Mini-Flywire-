// ==========================================================
// AC38 harness prototype — digest, write journal, tripwire, stream spy, canaries (test-only)
// ==========================================================
// Spies exist only between arm() and disarm(), so nothing is patched outside a seal window.
// The journal sees Map, Set and array mutators on registered objects and the six rewritten private
// let sites.  It cannot see a plain field write: that is the tripwire's job, in a terminal run.
// ==========================================================
import crypto from 'node:crypto';

export const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');
export const refuse = (m) => { throw new Error(`AC38 REFUSED: ${m}`); };

// ---- canonical serialization ----
// Arrays and Map/Set keep their order (order changes behaviour).  Object keys are sorted.  Accessors
// are not invoked.  Functions, symbols, accessors and weak or promise values cannot be compared by
// content: they become $opaque tokens and are counted, never skipped silently.
export function canon(root, opaque = {}) {
  const seen = new Map();
  const mark = (type, detail) => { opaque[type] = (opaque[type] || 0) + 1; return `$opaque:${type}:${detail ?? ''}`; };
  const walk = (v) => {
    switch (typeof v) {
      case 'undefined': return 'u';
      case 'boolean': return v ? 'T' : 'F';
      case 'string': return JSON.stringify(v);
      case 'bigint': return `B${v}`;
      case 'number':
        if (Number.isNaN(v)) return 'NaN';
        if (v === Infinity) return '+Inf';
        if (v === -Infinity) return '-Inf';
        if (Object.is(v, -0)) return '-0';
        return String(v);
      case 'symbol': return mark('symbol', v.description);
      case 'function': return mark('function', v.name);
      default:
    }
    if (v === null) return 'null';
    if (seen.has(v)) return `$ref:${seen.get(v)}`;
    seen.set(v, seen.size);
    if (Array.isArray(v)) {
      const parts = [];
      for (let i = 0; i < v.length; i++) parts.push(i in v ? walk(v[i]) : '$hole');
      return `[${parts.join(',')}]`;
    }
    if (v instanceof Map) { const parts = []; v.forEach((val, key) => parts.push(`${walk(key)}=>${walk(val)}`)); return `M{${parts.join(',')}}`; }
    if (v instanceof Set) { const parts = []; v.forEach((val) => parts.push(walk(val))); return `S{${parts.join(',')}}`; }
    if (v instanceof Date) return `D${v.getTime()}`;
    if (ArrayBuffer.isView(v)) return `V:${v.constructor.name}[${Array.from(v).join(',')}]`;
    if (v instanceof WeakMap || v instanceof WeakSet || v instanceof Promise) return mark(v.constructor.name);
    const name = Object.getPrototypeOf(v)?.constructor?.name ?? 'null';
    const symbols = Object.getOwnPropertySymbols(v).length;
    if (symbols) opaque.symbolKey = (opaque.symbolKey || 0) + symbols;
    const parts = [];
    for (const k of Object.keys(v).sort()) {
      const d = Object.getOwnPropertyDescriptor(v, k);
      parts.push(`${JSON.stringify(k)}:${'value' in d ? walk(d.value) : mark('accessor', k)}`);
    }
    return `O${name}{${parts.join(',')}}`;
  };
  return walk(root);
}

export function digestScope(scope) {
  const byFile = {};
  for (const c of scope.covered) (byFile[c.file] ||= []).push(c.name);
  return { byFile, globals: scope.globals };
}

// Every covered binding is read through its module's appended accessor.  A missing accessor, a name
// that no longer resolves, a set of names that differs from the scope, or a value that throws while
// being read refuses the run.  recentMemory and lastReasoning are always assigned by the time a seal
// runs, so losing one refuses too; any other window global that was never assigned is named as absent.
const REQUIRED_GLOBALS = new Set(['recentMemory', 'lastReasoning']);

export function digestAll({ byFile, globals }, readers) {
  const rows = {}, opaque = {}, absentGlobals = [], opaqueByBinding = {};
  const measured = (key, value) => {
    const before = Object.values(opaque).reduce((a, b) => a + b, 0);
    const digest = sha256(canon(value, opaque));
    const added = Object.values(opaque).reduce((a, b) => a + b, 0) - before;
    if (added) opaqueByBinding[key] = added;
    return digest;
  };
  for (const file of Object.keys(byFile).sort()) {
    const read = readers[file];
    if (typeof read !== 'function') refuse(`digest: no accessor for ${file}`);
    let values;
    try { values = read(); } catch (e) { refuse(`digest: binding unreadable in ${file}: ${e.message}`); }
    const want = [...byFile[file]].sort().join(), got = Object.keys(values).sort().join();
    if (want !== got) refuse(`digest: bindings of ${file} differ from the scope`);
    for (const name of byFile[file]) {
      try { rows[`${file}#${name}`] = measured(`${file}#${name}`, values[name]); }
      catch (e) { refuse(`digest: value unreadable at ${file}#${name}: ${e.message}`); }
    }
  }
  for (const name of globals) {
    if (!(name in globalThis)) {
      if (REQUIRED_GLOBALS.has(name)) refuse(`digest: required global ${name} is absent`);
      absentGlobals.push(name); rows[`window#${name}`] = 'absent'; continue;
    }
    try { rows[`window#${name}`] = measured(`window#${name}`, globalThis[name]); }
    catch (e) { refuse(`digest: global unreadable ${name}: ${e.message}`); }
  }
  for (const name of REQUIRED_GLOBALS) if (!globals.includes(name)) refuse(`digest: required global ${name} is outside the scope`);
  const keys = Object.keys(rows).sort();
  return { root: sha256(keys.map((k) => `${k}=${rows[k]}`).join('\n')), rows, bindings: keys.length, opaque, opaqueByBinding, absentGlobals };
}

// ---- journal, tripwire, stream spy ----
const MUTATORS = [
  [Map.prototype, 'Map', ['set', 'delete', 'clear']],
  [Set.prototype, 'Set', ['add', 'delete', 'clear']],
  [Array.prototype, 'Array', ['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse', 'fill', 'copyWithin']],
];

export function makeObserver({ base, streams, touchLet, breakKnob = null }) {
  const marker = `${base}/`;
  const targets = new WeakMap();
  const objects = [], fieldLocks = [];
  const visited = new WeakSet();
  const entries = [], lets = [], draws = [], unregistered = {};
  let random = 0, armed = false, inNote = false;
  const saved = [];
  const applyFn = Reflect.apply, mapGet = Map.prototype.get, stackLimit = Error.stackTraceLimit;

  // The first tree frame is the site.  The clock preload also wraps the agent loop, so it sits low on
  // every stack: only a clock frame above the site means the clock itself made the call.  A draw is
  // attributed to the caller of rng.js, not to the line inside rng.js.
  const siteOf = (stack, skipRng = false) => {
    let site = null, clock = false;
    for (const l of stack.split('\n')) {
      if (site !== null) break;
      if (l.includes('clock_preload.mjs')) { clock = true; continue; }
      const i = l.indexOf(marker);
      if (i < 0) continue;
      const m = /^([^:]+\.js):(\d+)/.exec(l.slice(i + marker.length));
      if (m && !(skipRng && m[1] === 'instrumentation/rng.js')) site = `${m[1]}:${m[2]}`;
    }
    return clock ? `clock_preload(${site})` : (site ?? 'harness');
  };
  const here = (skipRng) => { Error.stackTraceLimit = 24; const s = new Error().stack; Error.stackTraceLimit = stackLimit; return siteOf(s, skipRng); };

  function note(target, op, key) {
    if (!armed || inNote) return;
    inNote = true;
    try {
      const item = targets.get(target);
      const site = here();
      if (item === undefined) { unregistered[site] = (unregistered[site] || 0) + 1; return; }
      entries[entries.length] = { item, op, site, key: typeof key === 'string' || typeof key === 'number' ? String(key) : null };
    } finally { inNote = false; }
  }

  function collect(item, root) {
    const stack = [root];
    while (stack.length) {
      const v = stack.pop();
      if (v === null || typeof v !== 'object' || visited.has(v)) continue;
      visited.add(v); targets.set(v, item); objects.push(v);
      if (v instanceof Map) { v.forEach((val, key) => { stack.push(val); stack.push(key); }); continue; }
      if (v instanceof Set) { v.forEach((val) => stack.push(val)); continue; }
      if (Array.isArray(v)) { for (const x of v) stack.push(x); continue; }
      for (const k of Object.keys(v)) stack.push(v[k]);
    }
  }

  const canary = { map: new Map(), set: new Set(), arr: [], frozen: { field: 0 }, frozenArr: [0] };
  for (const k of ['map', 'set', 'arr']) targets.set(canary[k], '__canary__');

  function register(inventory, neuronMap) {
    for (const [item, value] of inventory) collect(item, value);
    neuronMap.forEach((n) => { collect('neuron embeddings', n.userData.embedding); fieldLocks.push(n.userData); });
    return { objects: objects.length, embeddings: fieldLocks.length };
  }

  // Terminal runs only: this cannot be undone, so the process ends at seal return.  A run stops at its
  // first frozen write, and the first one is an array push, so fieldsOnly leaves arrays writable to let
  // the same seal reach its first application field write.
  function protect(fieldsOnly = false) {
    if (breakKnob === 'tripwire') return;
    Object.freeze(canary.frozen); Object.freeze(canary.frozenArr);
    for (const o of objects) if (!(o instanceof Map) && !(o instanceof Set) && !(fieldsOnly && Array.isArray(o))) Object.freeze(o);
    for (const u of fieldLocks) Object.defineProperty(u, 'embedding', { writable: false });
  }

  function arm() {
    if (breakKnob !== 'journal') {
      for (const [proto, cls, names] of MUTATORS) for (const name of names) {
        const orig = proto[name];
        saved.push([proto, name, orig]);
        const op = `${cls}.${name}`;
        proto[name] = { [name](...a) { note(this, op, a[0]); return applyFn(orig, this, a); } }[name];
      }
    }
    if (breakKnob !== 'stream') {
      saved.push([Map.prototype, 'get', mapGet]);
      Map.prototype.get = function get(k) {
        if (this === streams && armed && !inNote) { inNote = true; try { draws[draws.length] = { stream: String(k), site: here(true) }; } finally { inNote = false; } }
        return applyFn(mapGet, this, [k]);
      };
    }
    const realRandom = Math.random;
    saved.push([Math, 'random', realRandom]);
    Math.random = function random_() { random++; return realRandom(); };
    armed = true;
  }

  function disarm() {
    armed = false;
    while (saved.length) { const [o, n, f] = saved.pop(); o[n] = f; }
  }

  const letHook = (name, site) => { if (armed && breakKnob !== 'let') lets[lets.length] = { name, site }; };

  // Proves each mechanism is live at this moment in this window.  Touches test-owned objects only;
  // the stream probe asks for a key that does not exist, so it draws nothing.
  function canaries() {
    const count = (f) => entries.filter(f).length;
    const e0 = count((e) => e.item === '__canary__' && e.op === 'Map.set'), s0 = count((e) => e.item === '__canary__' && e.op === 'Set.add'), a0 = count((e) => e.item === '__canary__' && e.op === 'Array.push');
    const l0 = lets.filter((l) => l.name === '__canary__').length, d0 = draws.filter((d) => d.stream === '__ac38_canary__').length;
    canary.map.set('c', 1); canary.set.add(entries.length); canary.arr.push(1);
    touchLet();
    streams.get('__ac38_canary__');
    return {
      map: count((e) => e.item === '__canary__' && e.op === 'Map.set') - e0,
      set: count((e) => e.item === '__canary__' && e.op === 'Set.add') - s0,
      array: count((e) => e.item === '__canary__' && e.op === 'Array.push') - a0,
      let: lets.filter((l) => l.name === '__canary__').length - l0,
      stream: draws.filter((d) => d.stream === '__ac38_canary__').length - d0,
    };
  }

  function tripCanaries() {
    const trips = (f) => { try { f(); return 0; } catch (e) { return e instanceof TypeError ? 1 : 0; } };
    return {
      field: trips(() => { canary.frozen.field = 1; }),
      index: trips(() => { canary.frozenArr[0] = 1; }),
      length: trips(() => { canary.frozenArr.length = 0; }),
      push: trips(() => { canary.frozenArr.push(1); }),
    };
  }

  const report = () => ({
    inventoryWrites: entries.filter((e) => e.item !== '__canary__'),
    lets: lets.filter((l) => l.name !== '__canary__'),
    draws: draws.filter((d) => d.stream !== '__ac38_canary__'),
    mathRandom: random,
    unregistered,
    registeredObjects: objects.length,
  });

  return { register, protect, arm, disarm, letHook, canaries, tripCanaries, report, siteOf };
}

// Terminal only: reading a position consumes samples.  Three consecutive values locate the stream.
export function positions(streams, makeRng, seed, limit = 8_000_000) {
  const find = (name, s) => {
    const fn = streams.get(name);
    if (typeof fn !== 'function') refuse(`stream ${name} is not registered`);
    const a = fn(), b = fn(), c = fn();
    const ref = makeRng(s >>> 0);
    let x = ref(), y = ref();
    for (let i = 0; i < limit; i++) { const z = ref(); if (x === a && y === b && z === c) return i; x = y; y = z; }
    refuse(`stream ${name}: position not recovered`);
    return -1;
  };
  return { cognitive: find('cognitive', seed), visual: find('visual', (seed ^ 0x9e3779b9) >>> 0), environment: find('environment', (seed ^ 0x5EED) >>> 0) };
}
