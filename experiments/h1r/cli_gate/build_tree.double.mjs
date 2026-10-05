// ==========================================================
// H1-R CLI gate — TEST DOUBLE for experiments/h1r/build_tree.mjs
// ==========================================================
// Used only inside verify_cli.mjs sandboxes (copied to <sandbox>/experiments/h1r/build_tree.mjs). It does not
// read B2 and builds no agent tree: it writes <sandbox>/tree/ with the env.js double, a synthetic three-edge
// connections.json and a MANIFEST.json marked as a double.
// ==========================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SANDBOX = path.resolve(HERE, '..', '..');

export function buildTree() {
  const dir = path.join(fs.realpathSync.native(SANDBOX), 'tree');
  fs.mkdirSync(path.join(dir, 'experiments', 'm7'), { recursive: true });
  fs.copyFileSync(path.join(HERE, 'env.double.js'), path.join(dir, 'experiments', 'm7', 'env.js'));
  fs.writeFileSync(path.join(dir, 'connections.json'), JSON.stringify([{ from: '1', to: '2' }, { from: '2', to: '3' }, { from: '3', to: '1' }]));
  const manifest = { double: 'verify_cli test double: no B2 blob was read and no agent tree was built' };
  fs.writeFileSync(path.join(dir, 'MANIFEST.json'), JSON.stringify(manifest));
  return { dir, manifest, reused: false };
}
