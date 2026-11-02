// ==========================================================
// AC38 limited feasibility study — gate, pinned-tree matrix, evaluation and comparison
// ==========================================================
//   node .../run_study.mjs gate --freeze <commit>
//   node .../run_study.mjs run <out-dir-outside-the-repo> --tree <dir>/learn0-8aa9ee4f39f4 --freeze <commit>
//   node .../run_study.mjs evaluate <out-dir>
//   node .../run_study.mjs compare <out-a> <out-b>
// "run" refuses unless every gate holds: HEAD is the named freeze commit, that commit is on
// origin/main, tracked files are clean, the execution authorization and the frozen hash record are
// present and match, and the tree matches all 148 recorded hashes.  During preparation the
// authorization and the frozen record do not exist, so "run" cannot start.
// Harness evidence only.  Not an AC38 run.
// ==========================================================
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeRunner, pool, ROOT } from './runner.mjs';
import { evaluate } from './evaluate.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FEAS = path.resolve(HERE, '..');
const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');
const die = (m) => { console.error(`run_study refused: ${m}`); process.exit(1); };
const [cmd, ...rest] = process.argv.slice(2);
const opt = (name) => { const i = rest.indexOf(name); return i >= 0 ? rest[i + 1] : null; };
const FROZEN_FILES = ['PROTOCOL.md', 'MUTANTS.md', 'expected.json', 'harness/rewrite_table.json', 'harness/preload.mjs', 'harness/fixture.mjs', 'harness/window.mjs', 'harness/runner.mjs', 'harness/evaluate.mjs', 'harness/matrix.mjs', 'harness/safety.mjs', 'harness/run_study.mjs', 'pinned_tree/tree_files.sha256', 'pinned_tree/tree_identity.json'];
const git = (args) => execFileSync('git', ['-C', ROOT, ...args], { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();

function gate(freeze) {
  const problems = [];
  if (!freeze) problems.push('no --freeze commit was named');
  const head = git(['rev-parse', 'HEAD']);
  if (freeze && head !== freeze) problems.push(`HEAD ${head} is not the freeze commit`);
  try { git(['merge-base', '--is-ancestor', head, 'origin/main']); } catch { problems.push('HEAD is not on origin/main'); }
  if (git(['status', '--porcelain', '--untracked-files=no'])) problems.push('tracked files are not clean');
  const auth = path.join(FEAS, 'EXECUTION_AUTHORIZATION.md');
  if (!fs.existsSync(auth)) problems.push('EXECUTION_AUTHORIZATION.md is absent: execution is not authorized');
  const frozenPath = path.join(FEAS, 'FROZEN.json');
  if (!fs.existsSync(frozenPath)) problems.push('FROZEN.json is absent: the protocol is not frozen');
  else {
    const frozen = JSON.parse(fs.readFileSync(frozenPath, 'utf8'));
    for (const f of FROZEN_FILES) if (frozen.files?.[f] !== sha256(fs.readFileSync(path.join(FEAS, f)))) problems.push(`${f} differs from FROZEN.json`);
  }
  return problems;
}

function verifyTree(tree) {
  const identity = JSON.parse(fs.readFileSync(path.join(FEAS, 'pinned_tree', 'tree_identity.json'), 'utf8'));
  if (path.basename(path.resolve(tree)) !== identity.name) die(`the tree directory must be named ${identity.name}`);
  const rows = fs.readFileSync(path.join(FEAS, 'pinned_tree', 'tree_files.sha256'), 'utf8').trim().split('\n').map((l) => { const i = l.indexOf('  '); return [l.slice(i + 2), l.slice(0, i)]; });
  for (const [f, h] of rows) if (!fs.existsSync(path.join(tree, f)) || sha256(fs.readFileSync(path.join(tree, f))) !== h) die(`tree file ${f} does not match`);
  const digest = sha256(rows.map(([f, h]) => `${f}  ${h}`).join('\n') + '\n');
  if (digest !== identity.digest) die('tree digest differs');
  return digest;
}

function brokenTable(out, edit, tablePath) {
  const t = JSON.parse(fs.readFileSync(tablePath, 'utf8'));
  if (edit.op === 'anchor') t.rewrites.find((r) => r.variant === edit.variant).anchor += ' ';
  else if (edit.op === 'dropRewrite') t.rewrites = t.rewrites.filter((r) => r.variant !== edit.variant);
  else if (edit.op === 'dropAppend') delete t.variantAppends[edit.variant];
  else die(`unknown table edit ${edit.op}`);
  const text = `${JSON.stringify(t, null, 1)}\n`, p = path.join(out, `table_${edit.op}_${edit.variant}.json`);
  fs.writeFileSync(p, text);
  return { tablePath: p, tableSha256: sha256(text) };
}

async function runMatrix(out, tree, { fixture, preload, tablePath, scopePath, expectedPath, brokenFile }) {
  const expected = JSON.parse(fs.readFileSync(expectedPath, 'utf8'));
  const tableSha256 = sha256(fs.readFileSync(tablePath));
  if (tableSha256 !== expected.tableSha256) die('the rewrite table differs from the one expected.json was built from');
  fs.mkdirSync(path.join(out, 'raw'), { recursive: true });
  const broken = path.join(out, path.basename(tree));
  const run = makeRunner({ OUT: out, TREE: tree, fixture, preload, tablePath, tableSha256, scopePath, steps: expected.defaults.steps, K: expected.defaults.K });
  const tasks = [];
  for (const row of expected.rows) for (const input of row.runs) {
    const extra = {};
    if (input.tableEdit) Object.assign(extra, brokenTable(out, input.tableEdit, tablePath));
    if (input.brokenTree) {
      if (!fs.existsSync(broken)) { fs.cpSync(tree, broken, { recursive: true }); fs.appendFileSync(path.join(broken, brokenFile), ' '); }
      extra.tree = broken;
    }
    tasks.push(() => run({ ...input, ...extra }));
  }
  const records = await pool(tasks);
  for (const r of records) fs.writeFileSync(path.join(out, 'raw', `${r.label}.json`), `${JSON.stringify(r)}\n`);
  fs.rmSync(broken, { recursive: true, force: true });
  return { expected, records };
}

export function writeSummary(out, expected, records) {
  const summary = evaluate(expected, records);
  const text = `${JSON.stringify(summary, null, 1)}\n`;
  fs.writeFileSync(path.join(out, 'summary.json'), text);
  const index = records.map((r) => ({ label: r.label, sha256: sha256(fs.readFileSync(path.join(out, 'raw', `${r.label}.json`))) })).sort((a, b) => (a.label < b.label ? -1 : 1));
  fs.writeFileSync(path.join(out, 'raw_index.json'), `${JSON.stringify(index, null, 1)}\n`);
  return { summary, summarySha256: sha256(text) };
}

const loadRecords = (out) => fs.readdirSync(path.join(out, 'raw')).filter((f) => f.endsWith('.json')).sort().map((f) => JSON.parse(fs.readFileSync(path.join(out, 'raw', f), 'utf8')));
const PINNED = { fixture: path.join(HERE, 'fixture.mjs'), preload: path.join(HERE, 'preload.mjs'), tablePath: path.join(HERE, 'rewrite_table.json'), scopePath: path.resolve(FEAS, '..', 'digest_scope.json'), expectedPath: path.join(FEAS, 'expected.json'), brokenFile: 'render/hud.js' };

if (path.resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  if (cmd === 'gate') {
    const p = gate(opt('--freeze'));
    console.log(p.length ? `GATE CLOSED\n- ${p.join('\n- ')}` : 'GATE OPEN');
    process.exit(p.length ? 1 : 0);
  } else if (cmd === 'run') {
    const out = path.resolve(rest[0] ?? '');
    const rel = path.relative(ROOT, out);
    if (!rest[0] || (!rel.startsWith('..') && !path.isAbsolute(rel))) die('the out directory must be outside the repository');
    const p = gate(opt('--freeze'));
    if (p.length) die(`gate closed: ${p.join('; ')}`);
    const tree = opt('--tree'); if (!tree) die('--tree is required');
    const digest = verifyTree(tree);
    const { expected, records } = await runMatrix(out, path.resolve(tree), PINNED);
    const { summary, summarySha256 } = writeSummary(out, expected, records);
    console.log(JSON.stringify({ treeDigest: digest, rows: summary.counts, allRowsPass: summary.allRowsPass, summarySha256 }));
    process.exit(summary.allRowsPass ? 0 : 1);
  } else if (cmd === 'evaluate') {
    const out = path.resolve(rest[0]);
    const expected = JSON.parse(fs.readFileSync(PINNED.expectedPath, 'utf8'));
    const { summary, summarySha256 } = writeSummary(out, expected, loadRecords(out));
    console.log(JSON.stringify({ rows: summary.counts, allRowsPass: summary.allRowsPass, summarySha256 }));
  } else if (cmd === 'compare') {
    const [a, b] = rest.map((p) => fs.readFileSync(path.join(path.resolve(p), 'summary.json')));
    console.log(JSON.stringify({ identical: a.equals(b), a: sha256(a), b: sha256(b) }));
    process.exit(a.equals(b) ? 0 : 1);
  } else {
    console.error('usage: run_study.mjs gate|run|evaluate|compare ...'); process.exit(2);
  }
}

export { runMatrix, verifyTree, brokenTable };
