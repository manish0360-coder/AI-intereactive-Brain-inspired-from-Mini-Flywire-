// ==========================================================
// H1-R D-021(b) — compare two analysis outputs (schema h1r.d021b.output/1)
// ==========================================================
// The D-021 agreement rule: the two implementations must agree EXACTLY on every decision and within 10⁻⁹ on every
// real-valued output. Here:
//   * booleans, strings, null and the encoded non-finite values ("Infinity", "-Infinity", "NaN") must be identical;
//   * numbers must satisfy |a − b| ≤ 1e-9 (absolute; integers therefore must be equal);
//   * arrays must have equal length and agree element by element; objects must have the same keys.
// Sections named "descriptive" are compared on the keys both sides report; keys reported by one side only are listed
// (not counted as disagreements). The "implementation" block is not compared. This file contains no analysis logic.
//
//   node research/preregistrations/h1r_d021b/compare_outputs.mjs <outputA.json> <outputB.json>
// Exit code 0 iff every compared value agrees.
// ==========================================================
import fs from 'node:fs';

const TOL = 1e-9;
const [fa, fb] = process.argv.slice(2);
if (!fa || !fb) { console.error('usage: compare_outputs.mjs <outputA.json> <outputB.json>'); process.exit(2); }
const A = JSON.parse(fs.readFileSync(fa, 'utf8')), B = JSON.parse(fs.readFileSync(fb, 'utf8'));
const diffs = [], oneSided = [];
let compared = 0, maxAbs = 0;

function walk(a, b, p, descriptive) {
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b)) return diffs.push(`${p}: array vs ${Array.isArray(a) ? typeof b : typeof a}`);
    if (a.length !== b.length) return diffs.push(`${p}: length ${a.length} vs ${b.length}`);
    a.forEach((x, i) => walk(x, b[i], `${p}[${i}]`, descriptive));
    return;
  }
  if (a !== null && b !== null && typeof a === 'object' && typeof b === 'object') {
    const ka = Object.keys(a), kb = Object.keys(b);
    for (const k of new Set([...ka, ...kb])) {
      if (p === '' && k === 'implementation') continue;
      const d = descriptive || k === 'descriptive';
      if (!(k in a) || !(k in b)) { (d ? oneSided : diffs).push(`${p}.${k}: only in ${k in a ? 'A' : 'B'}`); continue; }
      walk(a[k], b[k], `${p}.${k}`, d);
    }
    return;
  }
  compared++;
  if (typeof a === 'number' && typeof b === 'number') {
    const e = Math.abs(a - b);
    if (!(e <= TOL)) diffs.push(`${p}: ${a} vs ${b} (|Δ| = ${e})`); else if (e > maxAbs) maxAbs = e;
    return;
  }
  if (a !== b) diffs.push(`${p}: ${JSON.stringify(a)} vs ${JSON.stringify(b)}`);
}

if (A.schema !== 'h1r.d021b.output/1' || B.schema !== 'h1r.d021b.output/1') diffs.push(`schema: ${A.schema} vs ${B.schema}`);
walk(A, B, '', false);
console.log(`compared ${compared} values; disagreements ${diffs.length}; max |Δ| among agreeing numbers ${maxAbs}`);
for (const d of diffs.slice(0, 200)) console.log('DIFF  ' + d);
if (diffs.length > 200) console.log(`… ${diffs.length - 200} more`);
for (const d of oneSided.slice(0, 50)) console.log('ONE-SIDED (descriptive)  ' + d);
process.exitCode = diffs.length ? 1 : 0;
