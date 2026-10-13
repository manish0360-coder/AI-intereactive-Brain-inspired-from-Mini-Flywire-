// ==========================================================
// MCF-1 — prepare (build or reuse) the conformed tree.  NOT part of any official execution path.
// ==========================================================
//   node experiments/mcf1/prepare_tree.mjs
// The official orchestrator and driver only VERIFY the conformed tree with plain reads (lock.verifyTreeReadOnly):
// they can neither build, repair nor delete it, so concurrent driver processes can never race on a rebuild.  When
// the tree is missing or corrupt (for example the temporary directory was cleared), run this ONCE, in a single
// process, before starting an official orchestration.  It reuses a verified tree and otherwise rebuilds it from the
// recorded git blobs (experiments/h1r/build_tree.mjs, unchanged).
// ==========================================================
import { buildTree } from '../h1r/build_tree.mjs';

const t = buildTree();
console.log(JSON.stringify({ dir: t.dir, reused: t.reused === true, files: Object.keys(t.manifest.files).length, b2Commit: t.manifest.b2Commit, transformSha256: t.manifest.transformSha256 }));
