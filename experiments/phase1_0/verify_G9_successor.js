// ==========================================================
// G9 SUCCESSOR GATE — cognitive export surface, after G9-LN-01
// ==========================================================
// verify_G9.js recorded the pre-delta render/ surface (37 modules, 215 exports) and is HISTORICAL:
// it is never edited, and its bytes are asserted here. G9-LN-01 announces one intentional addition,
// render/traversalRecord.js, required by the frozen FutureScore boundary design.
//
// This gate carries the assertion forward: the live surface must equal the G9 surface PLUS exactly that
// one module with exactly its three exports. Any other addition, removal or export change fails.
//
// Static parsing, same extractor as G9: five render modules need THREE/DOM and cannot be imported
// under Node. No agent is run, no seed is evaluated, no configuration is generated.
// ==========================================================
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const RENDER = path.join(ROOT, 'render');
const G9_PATH = path.join(HERE, 'verify_G9.js');
const G9_SHA = '41bfdcde7c057a9886a009edbde7ff6f36f0b444acf60b6717fb809239b8b2c1';
const NEW_MODULE = 'traversalRecord.js';
const NEW_EXPORTS = ['clear', 'recordFor', 'recordOutcome'];

let pass = 0, fail = 0;
const ok = (n, c, x = '') => { c ? pass++ : fail++; console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${x ? '   ' + x : ''}`); };

// ---- export-surface extractor: identical to verify_G9.js (pure text; no module evaluation) ----
function surfaceOf(src) {
  const names = new Set();
  for (const m of src.matchAll(/^\s*export\s+(?:async\s+)?(?:function\*?|class|const|let|var)\s+([A-Za-z_$][\w$]*)/gm))
    names.add(m[1]);
  for (const m of src.matchAll(/^\s*export\s*\{([^}]*)\}/gm))
    for (const part of m[1].split(',')) {
      const t = part.trim(); if (!t) continue;
      const as = t.split(/\s+as\s+/);
      names.add((as[1] || as[0]).trim());
    }
  if (/^\s*export\s+default\b/m.test(src)) names.add('default');
  if (/^\s*export\s*\*/m.test(src)) names.add('<<STAR_EXPORT>>');
  return [...names].sort();
}

console.log('==============================================================');
console.log('  G9 SUCCESSOR GATE — render/ surface after G9-LN-01');
console.log('==============================================================');

// ---------- S1 the historical gate is untouched ----------
console.log('-- S1  historical verify_G9.js unchanged ---------------------');
const g9src = fs.readFileSync(G9_PATH);
const g9sha = crypto.createHash('sha256').update(g9src).digest('hex');
ok('S1.1  verify_G9.js is byte-identical to its recorded digest', g9sha === G9_SHA, g9sha);

// ---------- S2 the G9 reference surface, read FROM the historical gate ----------
console.log('\n-- S2  reference surface recovered from verify_G9.js ---------');
const txt = g9src.toString('utf8');
const table = txt.slice(txt.indexOf('const EXPECTED = {'), txt.indexOf('\n};', txt.indexOf('const EXPECTED = {')));
const G9_SURFACE = {};
for (const m of table.matchAll(/'([\w.]+\.js)':\s*\[([^\]]*)\]/g))
  G9_SURFACE[m[1]] = m[2].split(',').map(s => s.trim().replace(/^'|'$/g, '')).filter(Boolean).sort();
const g9Modules = Object.keys(G9_SURFACE).length;
const g9Exports = Object.values(G9_SURFACE).reduce((a, v) => a + v.length, 0);
ok('S2.1  recovered the recorded surface', g9Modules === 37 && g9Exports === 215, `${g9Modules} modules, ${g9Exports} exports`);

// ---------- S3 the live surface ----------
console.log('\n-- S3  live render/ surface ---------------------------------');
const live = {};
for (const f of fs.readdirSync(RENDER).filter(f => f.endsWith('.js')).sort())
  live[f] = surfaceOf(fs.readFileSync(path.join(RENDER, f), 'utf8'));

const EXPECTED = { ...G9_SURFACE, [NEW_MODULE]: [...NEW_EXPORTS].sort() };
const cmp = (a, b) => JSON.stringify(Object.keys(a).sort().map(k => [k, a[k]])) === JSON.stringify(Object.keys(b).sort().map(k => [k, b[k]]));

const added = Object.keys(live).filter(f => !(f in G9_SURFACE));
const removed = Object.keys(G9_SURFACE).filter(f => !(f in live));
ok('S3.1  exactly one module added, none removed', added.length === 1 && added[0] === NEW_MODULE && removed.length === 0,
  `${Object.keys(live).length} modules` + (added.length ? ` ADDED:${added.join(',')}` : '') + (removed.length ? ` REMOVED:${removed.join(',')}` : ''));
ok('S3.2  the added module exports exactly ' + NEW_EXPORTS.join(','), JSON.stringify(live[NEW_MODULE] || []) === JSON.stringify([...NEW_EXPORTS].sort()),
  (live[NEW_MODULE] || []).join(','));
const changed = Object.keys(G9_SURFACE).filter(f => JSON.stringify(live[f]) !== JSON.stringify(G9_SURFACE[f]));
ok('S3.3  no pre-existing module changed its export surface', changed.length === 0, changed.join(',') || '37 modules identical');
ok('S3.4  live surface == G9 surface + the announced module', cmp(EXPECTED, live),
  `${Object.keys(live).length} modules, ${Object.values(live).reduce((a, v) => a + v.length, 0)} exports`);

// ---------- S4 parser validity (anti-vacuity), same method as G9.2 ----------
console.log('\n-- S4  parser validity: static surface == runtime surface ----');
let checked = 0; const bad = [];
for (const f of Object.keys(live)) {
  let mod;
  try { mod = await import('file:///' + path.join(RENDER, f).replace(/\\/g, '/')); }
  catch { continue; }                       // needs THREE/DOM - covered statically only
  checked++;
  const dyn = Object.keys(mod).sort();
  if (JSON.stringify(dyn) !== JSON.stringify(live[f])) bad.push(`      ${f}: runtime ${dyn.join(',')} | parsed ${live[f].join(',')}`);
}
ok('S4.1  parsed surface matches the runtime surface', bad.length === 0, `${checked}/${Object.keys(live).length} modules cross-checked`);
bad.forEach(r => console.log(r));

// ---------- S5 mutation controls ----------
console.log('\n-- S5  mutation controls ------------------------------------');
const clone = () => JSON.parse(JSON.stringify(live));
const mAdd = clone(); mAdd['qlearning.js'] = [...mAdd['qlearning.js'], 'zzInjected'].sort();
const mDel = clone(); mDel[NEW_MODULE] = mDel[NEW_MODULE].filter(x => x !== 'recordOutcome');
const mMod = clone(); mMod['zz_injected.js'] = ['zz'];
const mRen = clone(); delete mRen[NEW_MODULE];
ok('S5.1  rejects an ADDED export on an existing module', !cmp(EXPECTED, mAdd), 'qlearning.js + zzInjected');
ok('S5.2  rejects a REMOVED export on the new module', !cmp(EXPECTED, mDel), `${NEW_MODULE} - recordOutcome`);
ok('S5.3  rejects a SECOND added module', !cmp(EXPECTED, mMod), '+ zz_injected.js');
ok('S5.4  rejects the new module disappearing', !cmp(EXPECTED, mRen), `- ${NEW_MODULE}`);
ok('S5.5  accepts the true surface (control - must PASS)', cmp(EXPECTED, live), 'control');

console.log(`\n${pass} passed, ${fail} failed`);
console.log(fail ? 'G9 SUCCESSOR RED' : 'G9 SUCCESSOR GREEN - surface == G9 + the announced traversalRecord.js');
process.exit(fail ? 1 : 0);
