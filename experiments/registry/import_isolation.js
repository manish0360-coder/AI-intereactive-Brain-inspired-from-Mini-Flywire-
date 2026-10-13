// ==========================================================
// LEGACY-REGISTRY IMPORT ISOLATION (static analysis; M-REG-1)
// ==========================================================
// POLICY. experiments/registry/typed.js is the legacy trajectory registry. It cannot be edited (it is
// hash-bound in the H1-R build identity), and it does not know block records. A consumer that imports it
// directly is blind to every block in typed_v2.js and could re-use a registered seed as AVAILABLE.
// Therefore, outside the permitted H1-R scope, nothing may reference typed.js except:
//   * experiments/registry/typed_v2.js (the layer itself), and
//   * the exact files listed in legacy_typed_importers.json WITH THE EXACT CONTENT HASH recorded there
//     (frozen historical verifiers and studies; a ratchet: a changed file stops being an exception, and an
//     entry whose file no longer references typed.js must be removed).
//
// WHAT THE SCANNER DETECTS (provable from the text of one file)
//   static imports and re-exports   import x from '...', import '...', export * from '...', export {a} from '...'
//   dynamic imports                 import('...') with a string or template literal without substitutions
//   require                         require('...') with a literal
//   import.meta.resolve('...')
//   indirect loads                  a literal that resolves to typed.js, in a file that also contains a
//                                   loader construct it cannot resolve (import(expr), require(expr),
//                                   createRequire, import.meta.resolve(expr), eval, new Function)
//   spellings                       relative, root-relative and absolute paths, file: URLs, backslashes,
//                                   duplicate separators, '.' and '..' segments, ?query/#hash suffixes,
//                                   mixed case, and \\uXXXX / \\xHH escapes inside the literal
// WHAT IT DOES NOT DETECT (stated, not hidden)
//   paths assembled at run time from pieces ('typed' + '.js', array joins, environment, computed
//   properties), a registry reached through another module that re-exports typed.js outside this
//   scanner's file set, symlinks, and code that is not JavaScript text. A literal that merely MENTIONS
//   the path (for example a list of protected files) in a file without a loader construct is reported as
//   a mention, not a violation.
// ==========================================================
import crypto from 'node:crypto';

export const LEGACY_REGISTRY = 'experiments/registry/typed.js';
export const LAYER_FILE = 'experiments/registry/typed_v2.js';
export const PERMITTED_SCOPES = Object.freeze(['experiments/h1r/']);          // path-segment boundary: the trailing '/' matters
export const BASELINE_FILE = 'experiments/registry/legacy_typed_importers.json';
/** names under which typed_v2.js re-exports the block-blind legacy implementation (oracle use only) */
export const LEGACY_ALIASES = Object.freeze(['legacyTrajectory', 'createLegacyTrajectoryRegistry']);
/** the registry directory may use the aliases (tests); everywhere else they are a violation */
export const ALIAS_SCOPES = Object.freeze(['experiments/registry/']);
export const SCAN_EXTENSIONS = Object.freeze(['.js', '.mjs', '.cjs', '.jsx', '.ts', '.mts', '.cts']);

// ---- paths ---------------------------------------------------------------------------------------
/** normalise any spelling of a path: file: URLs, backslashes, duplicate separators, . and .., ?query and #hash */
export function normalizePath(p) {
    let s = String(p);
    if (/^file:\/\//i.test(s)) {
        s = s.replace(/^file:\/\//i, '');
        try { s = decodeURIComponent(s); } catch (e) { /* keep the raw text */ }
        s = s.replace(/^\/([A-Za-z]:)/, '$1');
    }
    s = s.replace(/[?#].*$/, '').replace(/\\/g, '/');
    const absolute = s.startsWith('/') || /^[A-Za-z]:\//.test(s);
    const parts = [];
    for (const seg of s.split('/')) {
        if (seg === '' || seg === '.') continue;
        if (seg === '..') { if (parts.length && parts[parts.length - 1] !== '..') parts.pop(); else if (!absolute) parts.push('..'); continue; }
        parts.push(seg);
    }
    return (s.startsWith('/') ? '/' : '') + parts.join('/');
}
const dirOf = (p) => { const n = normalizePath(p), i = n.lastIndexOf('/'); return i < 0 ? '' : n.slice(0, i); };
const isAbsoluteLike = (s) => /^([A-Za-z]:[\\/]|\/|\\|file:)/i.test(String(s));
const TARGET = LEGACY_REGISTRY.toLowerCase();
/** does this specifier / path literal, written in `fromPath`, denote experiments/registry/typed.js ? */
export function referencesLegacyRegistry(spec, fromPath) {
    const direct = normalizePath(spec).toLowerCase();
    if (direct === TARGET || direct.endsWith('/' + TARGET)) return true;
    if (!isAbsoluteLike(spec)) {
        const base = dirOf(fromPath);
        const joined = normalizePath((base ? base + '/' : '') + spec).toLowerCase();
        if (joined === TARGET) return true;
    }
    return false;
}
export const inPermittedScope = (p) => { const n = normalizePath(p).toLowerCase(); return PERMITTED_SCOPES.some(s => n.startsWith(s)); };

// ---- tokenizer: comments, strings, templates and regex literals are understood --------------------
const REGEX_AFTER_KEYWORD = new Set(['return', 'typeof', 'case', 'do', 'else', 'in', 'of', 'new', 'delete', 'void', 'throw', 'yield', 'await']);
function unescape(s) {
    return s.replace(/\\(u\{([0-9a-fA-F]+)\}|u([0-9a-fA-F]{4})|x([0-9a-fA-F]{2})|[\s\S])/g, (m, g, u1, u2, x2) => {
        if (u1) { try { return String.fromCodePoint(parseInt(u1, 16)); } catch (e) { return m; } }
        if (u2) return String.fromCharCode(parseInt(u2, 16));
        if (x2) return String.fromCharCode(parseInt(x2, 16));
        const c = m[1];
        return c === 'n' ? '\n' : c === 't' ? '\t' : c === 'r' ? '\r' : c === '\n' ? '' : c;
    });
}
export function tokenize(src) {
    const toks = []; const n = src.length; let line = 1;
    const prevSignificant = () => toks.length ? toks[toks.length - 1] : null;
    function lex(i, inTemplateExpr) {
        let depth = 0;
        while (i < n) {
            const c = src[i];
            if (c === '\n') { line++; i++; continue; }
            if (/\s/.test(c)) { i++; continue; }
            if (c === '/' && src[i + 1] === '/') { while (i < n && src[i] !== '\n') i++; continue; }
            if (c === '/' && src[i + 1] === '*') { i += 2; while (i < n && !(src[i] === '*' && src[i + 1] === '/')) { if (src[i] === '\n') line++; i++; } i += 2; continue; }
            if (c === '"' || c === "'") {
                let j = i + 1;
                while (j < n && src[j] !== c && src[j] !== '\n') { if (src[j] === '\\') j++; j++; }
                toks.push({ t: 'str', v: unescape(src.slice(i + 1, j)), line });
                i = j + 1; continue;
            }
            if (c === '`') {
                let j = i + 1, chunk = '', hasExpr = false; const chunks = [];
                const start = toks.length;
                while (j < n && src[j] !== '`') {
                    if (src[j] === '\\') { chunk += src.slice(j, j + 2); j += 2; continue; }
                    if (src[j] === '$' && src[j + 1] === '{') {
                        hasExpr = true; chunks.push(unescape(chunk)); chunk = '';
                        j = lex(j + 2, true);
                        continue;
                    }
                    if (src[j] === '\n') line++;
                    chunk += src[j]; j++;
                }
                chunks.push(unescape(chunk));
                if (!hasExpr) toks.splice(start, toks.length - start, { t: 'str', v: chunks[0], line });
                else toks.push({ t: 'tplx', v: chunks.join('\u0000'), line });
                i = j + 1; continue;
            }
            if (/[A-Za-z_$]/.test(c)) {
                let j = i + 1; while (j < n && /[\w$]/.test(src[j])) j++;
                toks.push({ t: 'id', v: src.slice(i, j), line }); i = j; continue;
            }
            if (/[0-9]/.test(c)) { let j = i + 1; while (j < n && /[\w.]/.test(src[j])) j++; toks.push({ t: 'num', v: src.slice(i, j), line }); i = j; continue; }
            if (c === '/') {
                const p = prevSignificant();
                const regexAllowed = !p || (p.t === 'punct' && ![')', ']', '}'].includes(p.v)) || (p.t === 'id' && REGEX_AFTER_KEYWORD.has(p.v));
                if (regexAllowed) {
                    let j = i + 1, cls = false;
                    while (j < n && src[j] !== '\n') {
                        if (src[j] === '\\') { j += 2; continue; }
                        if (src[j] === '[') cls = true; else if (src[j] === ']') cls = false; else if (src[j] === '/' && !cls) break;
                        j++;
                    }
                    j++; while (j < n && /[a-z]/i.test(src[j])) j++;
                    toks.push({ t: 're', v: '', line }); i = j; continue;
                }
            }
            if (c === '{') { depth++; toks.push({ t: 'punct', v: c, line }); i++; continue; }
            if (c === '}') {
                if (inTemplateExpr && depth === 0) return i + 1;
                depth = Math.max(0, depth - 1); toks.push({ t: 'punct', v: c, line }); i++; continue;
            }
            toks.push({ t: 'punct', v: c, line }); i++;
        }
        return i;
    }
    lex(0, false);
    return toks;
}

// ---- findings -------------------------------------------------------------------------------------
const CLAUSE_PUNCT = new Set(['{', '}', ',', '*']);
function matchingParenArgs(toks, open) {            // tokens strictly between the '(' at `open` and its ')'
    let depth = 0; const args = [];
    for (let k = open; k < toks.length; k++) {
        const t = toks[k];
        if (t.t === 'punct' && t.v === '(') { depth++; if (depth === 1) continue; }
        if (t.t === 'punct' && t.v === ')') { depth--; if (depth === 0) return { args, end: k }; }
        args.push(t);
    }
    return { args, end: toks.length };
}
function fromClause(toks, from) {                   // scan an import/export clause to `from 'spec'`
    for (let k = from; k < Math.min(toks.length, from + 400); k++) {
        const t = toks[k];
        if (t.t === 'id' && t.v === 'from' && toks[k + 1] && toks[k + 1].t === 'str') return { spec: toks[k + 1].v, strIndex: k + 1, line: t.line };
        if (t.t === 'id' || t.t === 'str' || (t.t === 'punct' && CLAUSE_PUNCT.has(t.v))) continue;
        return null;
    }
    return null;
}
/**
 * Scan one file. Returns { path, hard: [...], mentions: [...], loaderConstructs: n }.
 * hard findings: { kind, spec, line } where kind is static | reexport | static-sideeffect | dynamic-literal | require-literal | meta-resolve | indirect
 */
export function scanSource(path, text) {
    const toks = tokenize(String(text));
    const hard = [], used = new Set(); let loader = 0;
    const consider = (kind, spec, line, strIndex) => {
        if (strIndex !== undefined) used.add(strIndex);
        if (referencesLegacyRegistry(spec, path)) hard.push({ kind, spec, line });
    };
    for (let k = 0; k < toks.length; k++) {
        const t = toks[k], nx = toks[k + 1];
        if (t.t !== 'id') continue;
        if (t.v === 'import') {
            if (nx && nx.t === 'punct' && nx.v === '(') {
                const { args } = matchingParenArgs(toks, k + 1);
                if (args.length >= 1 && args[0].t === 'str' && (args.length === 1 || (args[1].t === 'punct' && args[1].v === ','))) consider('dynamic-literal', args[0].v, t.line, k + 2);
                else loader++;                                       // strings inside a non-literal argument are reported as 'indirect' below
            } else if (nx && nx.t === 'punct' && nx.v === '.' && toks[k + 2] && toks[k + 2].v === 'meta') {
                if (toks[k + 4] && toks[k + 4].v === 'resolve' && toks[k + 5] && toks[k + 5].v === '(') {
                    const { args } = matchingParenArgs(toks, k + 5);
                    if (args.length === 1 && args[0].t === 'str') consider('meta-resolve', args[0].v, t.line, k + 6); else loader++;
                }
            } else if (nx && nx.t === 'str') consider('static-sideeffect', nx.v, t.line, k + 1);
            else { const f = fromClause(toks, k + 1); if (f) consider('static', f.spec, f.line, f.strIndex); }
        } else if (t.v === 'export' && nx && ((nx.t === 'punct' && (nx.v === '*' || nx.v === '{')))) {
            const f = fromClause(toks, k + 1);
            if (f) consider('reexport', f.spec, f.line, f.strIndex);
        } else if (t.v === 'require' && nx && nx.t === 'punct' && nx.v === '(') {
            const { args } = matchingParenArgs(toks, k + 1);
            if (args.length === 1 && args[0].t === 'str') consider('require-literal', args[0].v, t.line, k + 2); else loader++;
        } else if (t.v === 'createRequire' || t.v === 'eval' || (t.v === 'Function' && toks[k - 1] && toks[k - 1].v === 'new')) loader++;
        else if (LEGACY_ALIASES.includes(t.v)) hard.push({ kind: 'legacy-alias', spec: t.v, line: t.line });
    }
    const mentions = [];
    const report = (spec, line, composed) => {
        const kind = composed ? 'indirect-composed' : 'indirect';
        if (loader > 0) hard.push({ kind, spec, line }); else mentions.push({ kind: composed ? 'mention-composed' : 'mention', spec, line });
    };
    toks.forEach((t, idx) => {
        if (t.t !== 'str' || used.has(idx)) return;
        if (referencesLegacyRegistry(t.v, path)) report(t.v, t.line, false);
    });
    // composed literals: path.join(ROOT, 'experiments', 'registry', 'typed.js') and 'experiments/registry/' + 'typed.js'
    for (let k = 0; k < toks.length; k++) {
        if (toks[k].t !== 'str') continue;
        for (const [sep, glue] of [[',', '/'], ['+', '']]) {
            const run = [toks[k].v]; let e = k;
            while (toks[e + 1] && toks[e + 1].t === 'punct' && toks[e + 1].v === sep && toks[e + 2] && toks[e + 2].t === 'str') { run.push(toks[e + 2].v); e += 2; }
            if (run.length < 2) continue;
            const composed = run.join(glue);
            if (referencesLegacyRegistry(composed, path)) report(composed, toks[k].line, true);
        }
    }
    return { path, hard, mentions, loaderConstructs: loader };
}

// ---- gate -----------------------------------------------------------------------------------------
export const hashText = (text) => crypto.createHash('sha256').update(String(text).replace(/\r\n/g, '\n')).digest('hex');
/**
 * Evaluate the policy over a set of files. `baseline` = { entries: [{ path, sha256, scope, reason }] }.
 * ok iff there is no violation and no stale baseline entry.
 */
export function evaluateGate({ files, untracked = [], baseline, strictUntracked = false }) {
    const entries = new Map((baseline && baseline.entries || []).map(e => [normalizePath(e.path).toLowerCase(), e]));
    const out = { permitted: [], layer: [], exceptions: [], violations: [], mentions: [], stale: [], untrackedFindings: [], scanned: files.length, scannedUntracked: untracked.length };
    const referencing = new Set();
    const hardOf = (r, p) => (ALIAS_SCOPES.some(s => p.startsWith(s)) ? r.hard.filter(h => h.kind !== 'legacy-alias') : r.hard);
    for (const f of files) {
        const r = scanSource(f.path, f.text), p = normalizePath(f.path).toLowerCase();
        if (r.mentions.length) out.mentions.push({ path: f.path, mentions: r.mentions });
        const hard = hardOf(r, p);
        if (!hard.length) continue;
        referencing.add(p);
        if (p === LAYER_FILE) { out.layer.push({ path: f.path, findings: hard }); continue; }
        if (inPermittedScope(p)) { out.permitted.push({ path: f.path, findings: hard }); continue; }
        const e = entries.get(p);
        if (e && e.sha256 === hashText(f.text)) { out.exceptions.push({ path: f.path, scope: e.scope, reason: e.reason, findings: hard }); continue; }
        out.violations.push({ path: f.path, reason: e ? 'changed-legacy-consumer' : 'new-consumer', findings: hard });
    }
    // untracked files are not part of the committed tree: reported as warnings, failing only in strict mode
    for (const f of untracked) {
        const r = scanSource(f.path, f.text), p = normalizePath(f.path).toLowerCase(), hard = hardOf(r, p);
        if (!hard.length || p === LAYER_FILE || inPermittedScope(p)) continue;
        out.untrackedFindings.push({ path: f.path, findings: hard });
    }
    const present = new Set(files.map(f => normalizePath(f.path).toLowerCase()));
    for (const [p, e] of entries) if (!present.has(p) || !referencing.has(p)) out.stale.push({ path: e.path, why: present.has(p) ? 'no longer references typed.js: remove the entry' : 'file is gone: remove the entry' });
    out.ok = out.violations.length === 0 && out.stale.length === 0 && (!strictUntracked || out.untrackedFindings.length === 0);
    return out;
}
