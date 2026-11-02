// ==========================================================
// AC38 limited feasibility study — one disposable fixture process, with redaction at capture
// ==========================================================
// Derived from ../../runner.mjs at 3dc0082.  Same permission set and minimal environment.  Before a
// result is kept, every known local path prefix is replaced by a fixed token, then the text is
// scanned for anything path-shaped that survived.  A survivor is masked and flagged, and a flagged
// run can never pass.  The rule is part of the frozen protocol, not an edit made after a run.
// ==========================================================
import { spawn } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(HERE, '..', '..', '..', '..', '..');
export const CLOCK = { mode: 'VIRTUAL', t0: 1767225600000, delayMs: 500 };
const url = (f) => pathToFileURL(f).href;
const clockPreload = path.join(ROOT, 'experiments', 'credit1', 'clock_preload.mjs');
const guard = path.join(HERE, '..', '..', 'guard.mjs');

const RESIDUAL = [
  ['drive-path', /[A-Za-z]:[\\/][^\s"'`<>]*/g],
  ['file-url', /file:\/\/\/[^\s"'`<>]*/g],
  ['home-path', /\/(?:Users|home)\/[^\s"'`<>]*/g],
  ['short-name', /[A-Za-z0-9]{1,6}~\d[^\s"'`<>]*/g],
];

export function makeRedactor(pairs) {
  const forms = [];
  for (const [p, token] of pairs) {
    if (!p) continue;
    const abs = path.resolve(p), fwd = abs.split(path.sep).join('/'), href = url(abs);
    for (const f of [abs, fwd, href, href.replace(/^file:\/\/\//, ''), fwd.replace(/ /g, '%20')]) {
      forms.push([f, token]);
      if (/^[A-Za-z]:/.test(f)) forms.push([f[0] === f[0].toUpperCase() ? f[0].toLowerCase() + f.slice(1) : f[0].toUpperCase() + f.slice(1), token]);
    }
  }
  forms.sort((a, b) => b[0].length - a[0].length);
  const residual = new Set();
  const str = (s) => {
    let t = s;
    for (const [f, token] of forms) if (t.includes(f)) t = t.split(f).join(token);
    for (const [name, re] of RESIDUAL) { re.lastIndex = 0; if (re.test(t)) { residual.add(name); re.lastIndex = 0; t = t.replace(re, '<RESIDUAL>'); } }
    return t;
  };
  const deep = (v) => {
    if (typeof v === 'string') return str(v);
    if (Array.isArray(v)) return v.map(deep);
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [str(k), deep(x)]));
    return v;
  };
  return { str, deep, residual: () => [...residual].sort() };
}

export function makeRunner({ OUT, TREE, fixture, preload, tablePath, tableSha256, scopePath, steps, K }) {
  return function run(input, opts = {}) {
    const tree = input.tree ?? TREE;
    const body = { tree, clock: CLOCK, tablePath: input.tablePath ?? tablePath, tableSha256: input.tableSha256 ?? tableSha256, scopePath, steps, K, denyProbe: path.join(OUT, 'deny_probe.txt'), ...input };
    delete body.tableEdit; delete body.brokenTree;
    const permission = opts.noPermission ? [] : ['--permission', `--allow-fs-read=${ROOT}${path.sep}*`, `--allow-fs-read=${tree}${path.sep}*`, `--allow-fs-read=${OUT}${path.sep}*`];
    const args = [...permission, '--import', url(guard), '--import', url(clockPreload), ...(input.mode === 'B' ? [] : ['--import', url(preload)]), fixture, JSON.stringify(body)];
    return new Promise((resolve) => {
      const child = spawn(process.execPath, args, { cwd: ROOT, env: { SystemRoot: process.env.SystemRoot }, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
      let stdout = '', stderr = '';
      child.stdout.on('data', (d) => { stdout += d; });
      child.stderr.on('data', (d) => { stderr += d; });
      const timer = setTimeout(() => child.kill(), opts.timeout ?? 300000);
      child.on('close', (code) => {
        clearTimeout(timer);
        const m = /@@AC38@@(.*)@@END@@/s.exec(stdout);
        let result = null;
        try { result = m ? JSON.parse(m[1]) : null; } catch { result = null; }
        const r = makeRedactor([[tree, '<TREE>'], [TREE, '<TREE>'], [OUT, '<OUT>'], [ROOT, '<ROOT>'], [os.tmpdir(), '<TMP>'], [os.homedir(), '<HOME>']]);
        resolve({ label: input.label, code, result: r.deep(result), stderr: r.str(stderr.slice(0, 1200)), residual: r.residual() });
      });
    });
  };
}

export async function pool(tasks, width = 6) {
  const results = new Array(tasks.length); let next = 0;
  await Promise.all(Array.from({ length: width }, async () => { while (next < tasks.length) { const i = next++; results[i] = await tasks[i](); } }));
  return results;
}
