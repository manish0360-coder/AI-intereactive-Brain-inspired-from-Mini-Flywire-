// ==========================================================
// AC38 harness — one disposable fixture process.  Shared by run_control.mjs and run_closure.mjs
// ==========================================================
// A child gets --permission with read grants only, a minimal environment and no stdin.  It writes
// nothing itself: its result arrives on stdout and the parent stores it in the out directory.
// ==========================================================
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(HERE, '..', '..', '..');
export const TREE = path.join(os.tmpdir(), 'mfw-credit1', 'learn0base', 'learn0-8aa9ee4f39f4');
export const TABLE_SHA256 = '3dfd0b0650562e3af9040da41b7f84bd8d7e93aa77e4e5a5e1fb6920513eabb2';
export const CLOCK = { mode: 'VIRTUAL', t0: 1767225600000, delayMs: 500 };
export const STEPS = 3000, K = 2000;
export const REASONS = ['tick_cap', 'goal_reached', 'context_shift', 'topic_switch', 'manual'];
export const tablePath = path.join(HERE, 'rewrite_table.json'), scopePath = path.join(HERE, 'digest_scope.json');

const url = (f) => pathToFileURL(f).href;
const clockPreload = path.join(ROOT, 'experiments', 'credit1', 'clock_preload.mjs');

export function outDir(script) {
  const OUT = path.resolve(process.argv[2] ?? '');
  const rel = path.relative(ROOT, OUT);
  if (!process.argv[2] || (!rel.startsWith('..') && !path.isAbsolute(rel))) { console.error(`usage: ${script} <out-dir-outside-the-repo>`); process.exit(2); }
  if (!fs.existsSync(TREE)) { console.error(`pinned tree missing: ${TREE}`); process.exit(2); }
  fs.mkdirSync(path.join(OUT, 'runs'), { recursive: true });
  return OUT;
}

export function makeRun(OUT) {
  return function run(input, opts = {}) {
    const mode = input.mode, tree = input.tree ?? TREE;
    const body = { tree, clock: CLOCK, tablePath, tableSha256: TABLE_SHA256, scopePath, steps: STEPS, K, denyProbe: path.join(OUT, 'deny_probe.txt'), ...input };
    // noPermission and noGuard exist only for the breakage tests: the fixture must refuse before it loads the application.
    const permission = opts.noPermission ? [] : ['--permission', `--allow-fs-read=${ROOT}${path.sep}*`, `--allow-fs-read=${tree}${path.sep}*`, `--allow-fs-read=${OUT}${path.sep}*`];
    const guard = opts.noGuard ? [] : ['--import', url(path.join(HERE, 'guard.mjs'))];
    const args = [...permission, ...guard, '--import', url(clockPreload), ...(mode === 'B' ? [] : ['--import', url(path.join(HERE, 'preload.mjs'))]),
      path.join(HERE, 'fixture.mjs'), JSON.stringify(body)];
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
        resolve({ label: input.label, code, result, stderr: stderr.slice(0, 1200) });
      });
    });
  };
}

export async function pool(tasks, width = 6) {
  const results = new Array(tasks.length); let next = 0;
  await Promise.all(Array.from({ length: width }, async () => { while (next < tasks.length) { const i = next++; results[i] = await tasks[i](); } }));
  return results;
}
