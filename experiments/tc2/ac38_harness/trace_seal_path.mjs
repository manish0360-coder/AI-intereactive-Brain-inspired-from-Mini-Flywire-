// ==========================================================
// AC38 harness closure — line-level static trace of the seal path (reads source text, runs none of it)
// ==========================================================
//   node experiments/tc2/ac38_harness/trace_seal_path.mjs <pinned-tree-dir> <out.json>
// Starts at sealCurrentEpisode and the bridge callback in main.js, and follows direct calls, imports,
// functions passed by name, and members injected through initEpisodeManager and initSchemaMemory.
// It does not start from the monitored inventory, so its result can be compared with it.
// A regex tracer cannot prove completeness: anything it cannot resolve is listed, never dropped.
// ==========================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mask, graph } from './scan_scope.mjs';

const [, , TREE, OUTFILE] = process.argv;
if (!TREE || !OUTFILE) { console.error('usage: trace_seal_path.mjs <pinned-tree-dir> <out.json>'); process.exit(2); }

const FILES = graph(TREE, 'main.js');
const MUTATORS = 'set|delete|clear|add|push|pop|shift|unshift|splice|sort|reverse|fill|copyWithin';
const KEYWORDS = new Set(['if', 'for', 'while', 'switch', 'return', 'function', 'catch', 'typeof', 'await', 'new', 'delete', 'void', 'throw', 'super', 'in', 'of', 'do', 'else', 'try', 'case', 'yield', 'instanceof', 'this', 'null', 'true', 'false', 'undefined']);
const BUILTINS = new Set(['Math', 'Number', 'String', 'Array', 'Object', 'Map', 'Set', 'Date', 'JSON', 'Boolean', 'console', 'Symbol', 'Infinity', 'NaN', 'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'Error', 'Promise', 'RegExp', 'globalThis', 'window', 'document', 'THREE', 'structuredClone']);
const CHAIN = '[A-Za-z_$][\\w$]*(?:\\??\\.[A-Za-z_$][\\w$]*|\\[[^\\]\\n]*\\])*';

const lineOf = (text, offset) => { let n = 1; for (let i = 0; i < offset; i++) if (text[i] === '\n') n++; return n; };
function closeBrace(m, open) { let d = 0; for (let i = open; i < m.length; i++) { if (m[i] === '{') d++; else if (m[i] === '}') { d--; if (d === 0) return i; } } throw new Error('unbalanced'); }
function closeParen(m, open) { let d = 0; for (let i = open; i < m.length; i++) { if ('([{'.includes(m[i])) d++; else if (')]}'.includes(m[i])) { d--; if (d === 0) return i; } } throw new Error('unbalanced'); }

// ---- per-module index ----
const MODS = {};
for (const file of FILES) {
  const src = fs.readFileSync(path.join(TREE, file), 'utf8').replace(/\r/g, '');
  const m = mask(src);
  const imports = {};
  for (const x of src.matchAll(/import\s*\{([^}]*)\}\s*from\s*["']([^"']+)["']/g)) {
    const target = path.posix.normalize(path.posix.join(path.posix.dirname(file), x[2]));
    for (const piece of x[1].split(',')) {
      const clean = piece.replace(/\/\/.*$/gm, '').trim();
      if (!clean) continue;
      const [orig, alias] = clean.split(/\s+as\s+/);
      imports[(alias ?? orig).trim()] = { file: target, name: orig.trim() };
    }
  }
  const funcs = {}, bindings = {};
  let depth = 0;
  for (let i = 0; i < m.length; i++) {
    const c = m[i];
    if ('{[('.includes(c)) depth++;
    else if ('}])'.includes(c)) depth--;
    if (depth !== 0 || !/[a-z]/.test(c) || /[\w$.]/.test(m[i - 1] ?? ' ')) continue;
    const rest = m.slice(i, i + 200);
    const f = /^(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)\s*\(/.exec(rest);
    if (f) {
      const open = i + f[0].length - 1, close = closeParen(m, open), body = m.indexOf('{', close);
      const end = closeBrace(m, body);
      funcs[f[1]] = { file, name: f[1], start: lineOf(m, i), end: lineOf(m, end), offset: i, endOffset: end, params: m.slice(open + 1, close) };
      i = end; continue;
    }
    const a = /^(const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s+)?(\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>/.exec(rest);
    if (a) {
      const after = i + a[0].length; let j = after; while (/\s/.test(m[j])) j++;
      const end = m[j] === '{' ? closeBrace(m, j) : m.indexOf('\n', j);
      funcs[a[2]] = { file, name: a[2], start: lineOf(m, i), end: lineOf(m, end), offset: i, endOffset: end, params: a[3].replace(/[()]/g, '') };
      i = end; continue;
    }
    const b = /^(const|let|var)\s+([A-Za-z_$][\w$]*)/.exec(rest);
    if (b) bindings[b[2]] = { kind: b[1], line: lineOf(m, i), exported: /export\s+$/.test(m.slice(Math.max(0, i - 8), i)) };
  }
  MODS[file] = { file, src, masked: m, lines: src.split('\n'), mlines: m.split('\n'), imports, funcs, bindings };
}

// ---- injected members: both init calls in main.js use shorthand names ----
const main = MODS['main.js'];
const objectLiteralKeys = (call) => {
  const at = main.masked.indexOf(`${call}({`);
  if (at < 0) throw new Error(`${call} not found`);
  const open = main.masked.indexOf('{', at), close = closeBrace(main.masked, open);
  return [...main.masked.slice(open + 1, close).matchAll(/(?:^|,|\n)\s*([A-Za-z_$][\w$]*)\s*(?::\s*([^,\n]+))?/g)].map((x) => ({ key: x[1], value: (x[2] ?? x[1]).trim() }));
};
const resolveFromMain = (name) => {
  if (main.imports[name]) return main.imports[name];
  if (main.funcs[name] || main.bindings[name]) return { file: 'main.js', name };
  return null;
};
const INJECTED = {
  'render/episodeManager.js': Object.fromEntries(objectLiteralKeys('initEpisodeManager').map((k) => [k.key, resolveFromMain(k.value)])),
  'render/schemaMemory.js': Object.fromEntries(objectLiteralKeys('initSchemaMemory').map((k) => [k.key, resolveFromMain(k.value.split('.')[0]) ?? null])),
};

// ---- locals and aliases inside one function ----
function locals(text, params) {
  const names = new Set(params.split(',').map((p) => p.replace(/=.*$/s, '').replace(/[{}[\].\s]/g, '')).filter(Boolean));
  const paramNames = new Set(names);
  const alias = {};
  for (const x of text.matchAll(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?:=\s*([^;\n]*))?/g)) { names.add(x[1]); if (x[2] !== undefined) alias[x[1]] = x[2].trim(); }
  for (const x of text.matchAll(/\b(?:const|let|var)\s*[{[]([^}\]]*)[}\]]\s*(?:=|of)\s*([^;\n)]*)/g)) for (const p of x[1].split(',')) { const n = p.split(':').pop().replace(/=.*$/, '').trim(); if (/^[A-Za-z_$][\w$]*$/.test(n)) { names.add(n); alias[n] = x[2].trim(); } }
  for (const x of text.matchAll(/\bfor\s*\(\s*(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s+of\s+([^)]*)\)/g)) { names.add(x[1]); alias[x[1]] = x[2].trim(); }
  for (const x of text.matchAll(/\(([^()]*)\)\s*=>/g)) for (const p of x[1].split(',')) { const n = p.replace(/=.*$/s, '').replace(/[{}[\].\s]/g, ''); if (/^[A-Za-z_$][\w$]*$/.test(n)) { names.add(n); paramNames.add(n); } }
  for (const x of text.matchAll(/(?:^|[^\w$.])([A-Za-z_$][\w$]*)\s*=>/g)) { names.add(x[1]); paramNames.add(x[1]); }
  for (const x of text.matchAll(/\bfunction\s*[A-Za-z_$]*[\w$]*\s*\(([^)]*)\)/g)) for (const p of x[1].split(',')) { const n = p.trim(); if (n) { names.add(n); paramNames.add(n); } }
  return { names, paramNames, alias };
}

function rootOf(expr, scope, mod, seen = new Set()) {
  const e = expr.trim();
  if (/^(new\s|\[|\{|`|\d|-?\d)/.test(e)) return { kind: 'fresh', via: e.slice(0, 40) };
  const id = /^([A-Za-z_$][\w$]*)/.exec(e)?.[1];
  if (!id) return { kind: 'expression', via: e.slice(0, 40) };
  if (id === 'this') return { kind: 'this', via: e.slice(0, 40) };
  if (scope.names.has(id)) {
    if (scope.alias[id] !== undefined && !seen.has(id)) { seen.add(id); const r = rootOf(`${scope.alias[id]}${e.slice(id.length)}`, scope, mod, seen); return { ...r, path: `${id} <- ${r.path ?? r.via ?? r.name ?? ''}`.slice(0, 80) }; }
    return { kind: scope.paramNames.has(id) ? 'param' : 'local', name: id };
  }
  if (id === '_sys' || id === 'sys') {
    const member = /^(?:_sys|sys)\.([A-Za-z_$][\w$]*)/.exec(e)?.[1];
    return { kind: 'injected', name: member ?? '(whole)', target: INJECTED[mod.file]?.[member] ?? null };
  }
  if (mod.bindings[id]) return { kind: 'module', name: id, file: mod.file, bindingKind: mod.bindings[id].kind };
  if (mod.imports[id]) return { kind: 'imported', name: id, target: mod.imports[id] };
  if (mod.funcs[id]) return { kind: 'function', name: id };
  if (BUILTINS.has(id)) return { kind: 'builtin', name: id };
  return { kind: 'unresolved', name: id };
}

// ---- the closure ----
const WORK = [];
const seen = new Map();
const enqueue = (file, name, from) => {
  const key = `${file}#${name}`;
  if (seen.has(key)) { seen.get(key).from.add(from); return; }
  const fn = MODS[file]?.funcs[name];
  if (!fn) return;
  const entry = { ...fn, key, from: new Set([from]) };
  seen.set(key, entry); WORK.push(entry);
};
enqueue('render/episodicContextEngine.js', 'sealCurrentEpisode', 'ROOT');
const bridgeLine = main.mlines.findIndex((l) => l.includes('setEpisodeManagerBridge((sealedEp) =>'));
const bridgeOpen = main.masked.indexOf('(sealedEp) =>', main.masked.indexOf('setEpisodeManagerBridge('));
const bridgeBody = main.masked.indexOf('{', bridgeOpen), bridgeEnd = closeBrace(main.masked, bridgeBody);
const BRIDGE = { file: 'main.js', name: '(bridge callback)', start: bridgeLine + 1, end: lineOf(main.masked, bridgeEnd), offset: bridgeOpen, endOffset: bridgeEnd, params: 'sealedEp', key: 'main.js#(bridge callback)', from: new Set(['render/episodicContextEngine.js#sealCurrentEpisode:395']) };
seen.set(BRIDGE.key, BRIDGE); WORK.push(BRIDGE);

const writes = [], reads = [], special = [], unresolvedCalls = [];
while (WORK.length) {
  const fn = WORK.shift(), mod = MODS[fn.file];
  const text = mod.masked.slice(fn.offset, fn.endOffset + 1);
  const scope = locals(text, fn.params);
  const first = fn.start;
  const lines = text.split('\n');
  const readSet = new Map();
  lines.forEach((line, idx) => {
    const n = first + idx;
    const site = `${fn.file}:${n}`;
    const raw = (mod.lines[n - 1] ?? '').trim().slice(0, 110);

    for (const x of line.matchAll(/(?:^|[^\w$.])([A-Za-z_$][\w$]*)\s*\(/g)) {
      const name = x[1];
      if (KEYWORDS.has(name) || BUILTINS.has(name) || scope.names.has(name)) continue;
      if (mod.funcs[name]) enqueue(fn.file, name, `${fn.key}:${n}`);
      else if (mod.imports[name]) enqueue(mod.imports[name].file, mod.imports[name].name, `${fn.key}:${n}`);
      else unresolvedCalls.push({ site, name, raw });
    }
    for (const x of line.matchAll(/(?:^|[^\w$])(?:_sys|sys)\.([A-Za-z_$][\w$]*)/g)) {
      const t = INJECTED[fn.file]?.[x[1]];
      if (t === undefined) unresolvedCalls.push({ site, name: `sys.${x[1]}`, raw });
      else if (t) enqueue(t.file, t.name, `${fn.key}:${n}`);
    }
    for (const x of line.matchAll(/(?:^|[(,\s=])([A-Za-z_$][\w$]*)(?=\s*[,)])/g)) {
      const name = x[1];
      if (scope.names.has(name)) continue;
      if (mod.funcs[name]) enqueue(fn.file, name, `${fn.key}:${n}`);
      else if (mod.imports[name] && MODS[mod.imports[name].file]?.funcs[mod.imports[name].name]) enqueue(mod.imports[name].file, mod.imports[name].name, `${fn.key}:${n}`);
    }
    for (const x of line.matchAll(/(?:^|[^\w$.])([A-Za-z_$][\w$]*)/g)) {
      const name = x[1];
      if (scope.names.has(name) || KEYWORDS.has(name) || BUILTINS.has(name)) continue;
      if (mod.bindings[name]) readSet.set(`${fn.file}#${name}`, (readSet.get(`${fn.file}#${name}`) ?? 0) + 1);
      else if (mod.imports[name] && MODS[mod.imports[name].file]?.bindings[mod.imports[name].name]) readSet.set(`${mod.imports[name].file}#${mod.imports[name].name}`, (readSet.get(`${mod.imports[name].file}#${mod.imports[name].name}`) ?? 0) + 1);
    }

    if (/\bDate\.now\b|\bliveRng\(|\brng\(|Math\.random|\bsetTimeout\b|\bsetInterval\b|\bPromise\b|\bcatch\b|\btry\b|\bawait\b|\blocalStorage\b|\bfetch\(|\bReflect\.|Object\.defineProperty|Object\.assign|Object\.setPrototypeOf|\bwindow\.|\bglobalThis\b|\.call\(|\.apply\(|\.bind\(/.test(line)) special.push({ site, fn: fn.name, raw });

    const note = (cls, chain, op) => {
      const r = rootOf(chain, scope, mod);
      writes.push({ site, fn: fn.name, class: cls, op, lhs: chain.slice(0, 60), root: r, raw });
    };
    const cleaned = line.replace(/^\s*(?:const|let|var)\s+[^=]*=/, (s) => ' '.repeat(s.length));
    for (const x of cleaned.matchAll(new RegExp(`(^|[^\\w$.\\]])(${CHAIN})\\s*((?:\\+|-|\\*|/|%|\\|\\||&&|\\?\\?|<<|>>|\\^|&|\\|)?=)(?![=>])`, 'g'))) {
      const before = cleaned.slice(0, x.index + x[1].length);
      if (/[!<>=]$/.test(before)) continue;
      const chain = x[2];
      const isBare = /^[A-Za-z_$][\w$]*$/.test(chain);
      if (isBare) {
        if (scope.names.has(chain)) continue;
        note('binding', chain, x[3]);
      } else note(chain.endsWith('.length') ? 'length' : (/\[[^\]]*\]$/.test(chain) ? 'index' : 'field'), chain, x[3]);
    }
    for (const x of line.matchAll(new RegExp(`(${CHAIN})\\s*(\\+\\+|--)|(\\+\\+|--)\\s*(${CHAIN})`, 'g'))) {
      const chain = x[1] ?? x[4];
      if (/^[A-Za-z_$][\w$]*$/.test(chain)) { if (!scope.names.has(chain)) note('binding', chain, x[2] ?? x[3]); } else note('field', chain, x[2] ?? x[3]);
    }
    for (const x of line.matchAll(new RegExp(`(${CHAIN})\\.(${MUTATORS})\\s*\\(`, 'g'))) note('mutator', x[1], x[2]);
    for (const x of line.matchAll(new RegExp(`(?:[\\)\\]]\\s*|^\\s*)\\.(${MUTATORS})\\s*\\(`, 'g'))) writes.push({ site, fn: fn.name, class: 'computed-receiver', op: x[1], lhs: '(computed)', root: { kind: 'expression' }, raw });
    for (const x of line.matchAll(new RegExp(`\\bdelete\\s+(${CHAIN})`, 'g'))) note('delete', x[1], 'delete');
  });
  fn.reads = [...readSet.keys()].sort();
  reads.push({ fn: fn.key, reads: fn.reads });
}

// ---- adjudication ----
// Rules first.  A write the rules cannot place is settled here by a source reason that names the caller
// or the guard.  run_closure.mjs checks these against runtime evidence.  Anything left is UNRESOLVED.
const NEURON = 'main.js#neuronMap';
const CLOSED_LIST = new Set(['render/episodicContextEngine.js#currentEpisode', 'render/episodicContextEngine.js#episodeVault']);
const FRESH = (why) => ({ decision: 'fresh', why });
const ADJUDICATED = {
  'render/semanticProvenance.js:128': { decision: 'store', store: 'render/memory.js#rewards', why: 'writeReward parameter: its only seal-path caller, episodeManager.js:1013, passes sys.rewards' },
  'render/qlearning.js:269': { decision: 'unreachable', store: 'main.js#_diagCounters', why: 'inside if (diag): the only seal-path caller, episodeManager.js:1003, passes no diag' },
  'render/qlearning.js:272': { decision: 'unreachable', store: 'main.js#_diagCounters', why: 'inside if (diag): the only seal-path caller, episodeManager.js:1003, passes no diag' },
  'render/qlearning.js:273': { decision: 'unreachable', store: 'main.js#_diagCounters', why: 'inside if (diag): the only seal-path caller, episodeManager.js:1003, passes no diag' },
  'render/embeddings.js:236': { decision: 'store', store: NEURON, why: 'n1 comes from findNeuronById, a neuron held in neuronMap' },
  'render/embeddings.js:237': { decision: 'store', store: NEURON, why: 'n2 comes from findNeuronById, a neuron held in neuronMap' },
  'render/embeddings.js:320': { decision: 'store', store: NEURON, why: 'other is a neuronMapRef.forEach value, the same Map as neuronMap' },
  'render/helpers.js:44': FRESH('normalize parameter: its seal-path callers, embeddings.js:236, 237 and 320, pass spread copies'),
  'render/episodeManager.js:299': FRESH('episodeWords is the array returned by recentMemory.map'),
  'render/episodeManager.js:323': FRESH('ep is the object literal returned by _createBuffer'),
  'render/episodeManager.js:324': FRESH('ep is the object literal returned by _createBuffer'),
  'render/episodeManager.js:325': FRESH('ep is the object literal returned by _createBuffer'),
  'render/episodeManager.js:326': FRESH('ep is the object literal returned by _createBuffer'),
  'render/episodeManager.js:331': FRESH('ep is the object literal returned by _createBuffer'),
  'render/episodicContextEngine.js:456': FRESH('sorts the spread copy of a new Set'),
  'render/episodicContextEngine.js:477': FRESH('sorts the array returned by Object.entries(clusterScores)'),
  'render/schemaMemory.js:205': FRESH('sorts a spread copy of motifs'),
  'render/schemaMemory.js:554': FRESH('positionNodes is built inside _extractSchema'),
  'render/schemaMemory.js:575': FRESH('sorts a spread copy of freq.entries()'),
};
function decide(w) {
  const a = ADJUDICATED[w.site];
  if (a) return a;
  const r = w.root;
  if (r.kind === 'fresh') return { decision: 'fresh', why: 'root is created inside the call' };
  const store = r.kind === 'module' ? `${r.file}#${r.name}` : ((r.kind === 'injected' || r.kind === 'imported') && r.target ? `${r.target.file}#${r.target.name}` : null);
  if (store) return { decision: CLOSED_LIST.has(store) ? 'closed-list' : 'store', store };
  return { decision: 'UNRESOLVED' };
}
for (const w of writes) Object.assign(w, decide(w));

const derived = {};
for (const w of writes) if (w.decision === 'store') (derived[w.store] ||= new Set()).add(`${w.site} ${w.class === 'mutator' ? w.op : w.class}`);
const derivedStores = Object.fromEntries(Object.entries(derived).sort().map(([k, v]) => [k, [...v].sort()]));

// The monitored inventory is read only here, after the derivation is finished.
const scope = JSON.parse(fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'digest_scope.json'), 'utf8'));
const monitored = scope.inventory.map((i) => `${i.file}#${i.binding}`);
const omissions = Object.keys(derivedStores).filter((k) => !monitored.includes(k));
const notDerived = monitored.filter((k) => !derivedStores[k]);
const aliases = writes.filter((w) => w.decision === 'store' && w.store.split('#')[1] !== w.lhs.split(/[.[]/)[0]).map((w) => ({ site: w.site, written: w.lhs, store: w.store })).sort((a, b) => (a.site < b.site ? -1 : 1));
const FIELD = ['field', 'index', 'length', 'delete'];
const fieldSites = writes.filter((w) => FIELD.includes(w.class)).map((w) => ({ site: w.site, lhs: w.lhs, op: w.op, decision: w.decision, store: w.store ?? null, why: w.why ?? null }));
const readsOutside = [...new Set(reads.flatMap((r) => r.reads))].filter((k) => !monitored.includes(k)).sort();

const functions = [...seen.values()].map((f) => ({ key: f.key, start: f.start, end: f.end, calledFrom: [...f.from].sort().slice(0, 4) })).sort((a, b) => (a.key < b.key ? -1 : 1));
const out = { schema: 'tc2/ac38.seal_path_trace/1', tree: path.basename(TREE), functions, fieldSites, derivedStores, comparison: { monitored: monitored.length, omissions, notDerived, aliases, unresolved: writes.filter((w) => w.decision === 'UNRESOLVED').map((w) => w.site), adjudicated: Object.fromEntries(Object.entries(ADJUDICATED).map(([k, v]) => [k, v.why])) }, readsOutsideInventory: readsOutside, writes, reads, special, unresolvedCalls };
fs.writeFileSync(OUTFILE, `${JSON.stringify(out, null, 1)}\n`);
const count = (f) => writes.filter(f).length;
console.log(JSON.stringify({ functions: functions.length, writes: writes.length, field: count((w) => FIELD.includes(w.class)), binding: count((w) => w.class === 'binding'), mutator: count((w) => w.class === 'mutator'), computedReceiver: count((w) => w.class === 'computed-receiver'), special: special.length, unresolvedCalls: unresolvedCalls.length, decisions: Object.fromEntries(['store', 'closed-list', 'fresh', 'unreachable', 'UNRESOLVED'].map((d) => [d, count((w) => w.decision === d)])), derivedStores: Object.keys(derivedStores).length, omissions, notDerived }));
