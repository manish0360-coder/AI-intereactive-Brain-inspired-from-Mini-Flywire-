// ==========================================================
// AC38 harness prototype — static scope scan (reads source text, runs none of it)
// ==========================================================
// Walks the module graph from main.js, finds every top-level binding with a small lexer.  Top-level
// means brace, bracket and paren depth 0, because main.js keeps many function-local declarations at
// column 0.  build_scope.mjs classifies what this finds.
// ==========================================================
import fs from 'node:fs';
import path from 'node:path';

// Blanks strings, templates, comments and regex literals, keeping every newline and offset.
export function mask(src) {
  const out = src.split(''); const n = src.length; let i = 0; let prev = '';
  const blank = (a, b) => { for (let k = a; k < b; k++) if (out[k] !== '\n') out[k] = ' '; };
  const skipTemplate = (start) => {
    let j = start + 1;
    while (j < n) {
      if (src[j] === '\\') { j += 2; continue; }
      if (src[j] === '`') return j + 1;
      if (src[j] === '$' && src[j + 1] === '{') {
        let depth = 1; j += 2;
        while (j < n && depth) {
          if (src[j] === '`') { j = skipTemplate(j); continue; }
          if (src[j] === '{') depth++; else if (src[j] === '}') depth--;
          j++;
        }
        continue;
      }
      j++;
    }
    return j;
  };
  while (i < n) {
    const c = src[i], d = src[i + 1];
    if (c === '/' && d === '/') { let j = i; while (j < n && src[j] !== '\n') j++; blank(i, j); i = j; continue; }
    if (c === '/' && d === '*') { const j = src.indexOf('*/', i + 2); const e = j < 0 ? n : j + 2; blank(i, e); i = e; continue; }
    if (c === '"' || c === "'") { let j = i + 1; while (j < n && src[j] !== c) { if (src[j] === '\\') j++; j++; } blank(i, j + 1); i = j + 1; prev = 'x'; continue; }
    if (c === '`') { const j = skipTemplate(i); blank(i, j); i = j; prev = 'x'; continue; }
    if (c === '/' && /[=(,:!&|?{};\n[+\-*%<>~^]|^$/.test(prev)) {
      let j = i + 1, cls = false;
      while (j < n && (src[j] !== '/' || cls) && src[j] !== '\n') { if (src[j] === '\\') j++; else if (src[j] === '[') cls = true; else if (src[j] === ']') cls = false; j++; }
      if (src[j] === '/') { let e = j + 1; while (/[a-z]/.test(src[e] || '')) e++; blank(i, e); i = e; prev = 'x'; continue; }
    }
    if (!/\s/.test(c)) prev = c;
    i++;
  }
  return out.join('');
}

function topLevel(src) {
  const m = mask(src);
  const rows = []; let depth = 0, i = 0, line = 1;
  const word = /[A-Za-z_$][\w$]*/y;
  while (i < m.length) {
    const c = m[i];
    if (c === '\n') { line++; i++; continue; }
    if ('{[('.includes(c)) { depth++; i++; continue; }
    if ('}])'.includes(c)) { depth--; i++; continue; }
    if (depth === 0 && /[A-Za-z_$]/.test(c) && !/[\w$.]/.test(m[i - 1] || ' ')) {
      word.lastIndex = i; const w = word.exec(m)[0];
      if (w === 'const' || w === 'let' || w === 'var' || w === 'function' || w === 'class') {
        let j = i + w.length; const declLine = line; const exported = /export\s+$/.test(m.slice(Math.max(0, i - 12), i));
        if (w === 'function' || w === 'class') {
          while (/\s/.test(m[j])) j++;
          if (m[j] === '*') j++;
          while (/\s/.test(m[j])) j++;
          word.lastIndex = j; const nm = word.exec(m);
          if (nm) rows.push({ name: nm[0], kind: w, line: declLine, exported, init: '' });
        } else {
          let d = 0, expectName = true, k = j, curLine = line;
          while (k < m.length) {
            const ch = m[k];
            if (ch === '\n') curLine++;
            if ('{[('.includes(ch)) d++; else if ('}])'.includes(ch)) d--;
            if (d === 0 && ch === ';') break;
            if (d === 0 && ch === '\n') {
              let z = k + 1; while (/\s/.test(m[z] || '')) z++;
              if (!',.?:+-*/%=<>&|'.includes(m[z] || ' ') && expectName === false && !/[,=+\-*/%&|?:(.]\s*$/.test(m.slice(j, k))) break;
            }
            if (d === 0 && expectName && /[A-Za-z_$]/.test(ch)) {
              word.lastIndex = k; const nm = word.exec(m)[0]; let z = k + nm.length; while (/\s/.test(m[z])) z++;
              rows.push({ name: nm, kind: w, line: curLine, exported, init: src.slice(z + 1, z + 34).split('\n')[0].trim() });
              expectName = false; k += nm.length; continue;
            }
            if (d === 0 && ch === ',') expectName = true;
            k++;
          }
          for (let q = i; q < k; q++) if (m[q] === '\n') line++;
          i = k; continue;
        }
      }
      i += w.length; continue;
    }
    i++;
  }
  if (depth !== 0) throw new Error(`unbalanced lexer depth ${depth}`);
  return rows;
}

export function graph(tree, start) {
  const seen = new Set(), queue = [start];
  while (queue.length) {
    const f = queue.shift(); if (seen.has(f)) continue; seen.add(f);
    const text = fs.readFileSync(path.join(tree, f), 'utf8');
    for (const m of text.matchAll(/(?:from\s+|import\s*\(?\s*)["'](\.[^"']+)["']/g)) {
      const t = path.posix.normalize(path.posix.join(path.posix.dirname(f), m[1]));
      if (fs.existsSync(path.join(tree, t))) queue.push(t);
    }
  }
  return [...seen].sort();
}

export function scan(tree) {
  const read = (rel) => fs.readFileSync(path.join(tree, rel), 'utf8');
  const files = graph(tree, 'main.js');
  const bindings = [];
  for (const f of files) {
    try { for (const r of topLevel(read(f))) bindings.push({ file: f, ...r }); }
    catch (e) { throw new Error(`${f}: ${e.message}`); }
  }
  const globals = [...new Set(files.flatMap((f) => [...mask(read(f)).matchAll(/\b(?:window|globalThis)\.([A-Za-z_$][\w$]*)\s*(?:=[^=]|\+=|-=|\+\+|--)/g)].map((m) => m[1])))].sort();
  return { files, bindings, globals };
}
