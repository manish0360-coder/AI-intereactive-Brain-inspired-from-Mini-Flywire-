// M-REG-2 package: write the proposed C2 file contents (scratch).  Reads the saved admission bytes, builds the record with
// the committed builder, renders it with the committed renderer, and writes two module variants and the README edit.
// usage: node make_c2_files.mjs <cloneAtHead> <admitted.json> <outDir>
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';

const [CLONE, ADMITTED, OUT] = process.argv.slice(2);
const U = (rel) => pathToFileURL(path.join(CLONE, rel)).href;
const L = await import(U('experiments/mcf1/lock.mjs'));
const S = await import(U('experiments/mcf1/scan.mjs'));
const adm = JSON.parse(fs.readFileSync(ADMITTED, 'utf8'));
const RESULT = adm.sha256, LIST = adm.summary.admittedSha256, INV = adm.summary.inventorySha256;

const TEXT = {
  // the wording of the first proposal (it asserts an approval that has not been given): kept only as the ALTERNATIVE
  authorizationOriginal: 'User-authorized MCF-1 candidate block: the candidate admission scan of [1500000000, 1500004000) was authorized by commit a42e1d9; registration of its admitted list is authorized by the user and applied by the commit that adds this record. The preregistration freeze, the freeze record, the pin and every official stage remain separate, unauthorized steps.',
  // the draft wording: states only what is true before the approval exists
  authorizationDraft: 'MCF-1 candidate block: the admitted list of the candidate admission scan of [1500000000, 1500004000), which commit a42e1d9 authorized as an admission scan only. This record takes effect only through the commit that adds it; the approval for that commit is recorded in that commit and the decision it cites, not asserted by this field. The preregistration freeze, the freeze record, the pin and every official stage remain separate, unauthorized steps.',
  artifact: `mcf1 admission result sha256 ${RESULT} (admitted-list sha256 ${LIST}; reservation inventory sha256 ${INV}); lodged evidence experiments/mcf1/scan_records/1500000000-4000/admitted.json`,
  why: 'Candidate confirmatory block of study MCF-1: the strictly ascending raw agent seeds admitted by the deterministic pre-outcome admission predicate over the 4000-seed window starting at 1500000000 (3851 admitted; 149 rejected: R3_ENV_SLOTS 24, H1R_RECORDS_AND_DOMAIN 125, one seed carrying both reasons). Registered before Stage Q (registry record scope); no agent run and no outcome has been consumed.',
};

const original = fs.readFileSync(path.join(CLONE, 'experiments/registry/trajectory_blocks.js'), 'utf8');
if (original.includes('\r')) throw new Error('the clone must be LF');
const stateOld = "// STATE: EMPTY. No study has a block. Nothing is registered, reserved or consumed by this file.\n// A block is added only by a separately authorised commit that carries the admitted list's\n// SHA-256, the configuration identity and the authorization text, and that commit must keep\n// verify_blocks.js green.\n";
const stateNew = `// STATE: ONE BLOCK. Study MCF-1 holds the block of the candidate window 1500000000 + 4000\n// (3851 members, 149 excluded seeds, listSha256 ${LIST}).\n// A block is added only by a separately authorised commit that carries the admitted list's\n// SHA-256, the configuration identity and the authorization text, and that commit must keep\n// verify_blocks.js green.\n`;
const exportOld = 'export const TRAJECTORY_BLOCKS = Object.freeze([]);\n';
for (const [a, n] of [[stateOld, 'state paragraph'], [exportOld, 'export line']]) if (original.split(a).length !== 2) throw new Error(`anchor ${n}`);

const build = (authorization) => {
  const block = L.blockFromAdmission({ admitted: adm.admitted, artifact: TEXT.artifact, authorization, why: TEXT.why });
  const text = original.replace(stateOld, stateNew).replace(exportOld, S.renderBlocksModule([block]));
  return { block, text };
};
const draft = build(TEXT.authorizationDraft), alt = build(TEXT.authorizationOriginal);
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'trajectory_blocks.draft.js'), draft.text);
fs.writeFileSync(path.join(OUT, 'trajectory_blocks.alt.js'), alt.text);

// README line 9 of the registry document: the one sentence this change makes false
const readme = fs.readFileSync(path.join(CLONE, 'experiments/registry/README.md'), 'utf8');
const rOld = '| `trajectory_blocks.js` | block data. **Empty.** Nothing is registered, reserved or consumed |';
const rNew = '| `trajectory_blocks.js` | block data. **One block:** study MCF-1, the candidate window 1,500,000,000 + 4,000 (3,851 members, 149 excluded). Its members are consumed by MCF-1 and refused to every other study |';
if (readme.split(rOld).length !== 2) throw new Error('README anchor');
fs.writeFileSync(path.join(OUT, 'README.registry.md'), readme.replace(rOld, rNew));

const H = (s) => crypto.createHash('sha256').update(s).digest('hex');
console.log(JSON.stringify({
  draftFileSha256: H(draft.text), altFileSha256: H(alt.text), draftBytes: Buffer.byteLength(draft.text), altBytes: Buffer.byteLength(alt.text),
  blockCount: draft.block.count, excluded: draft.block.excluded.length, listSha256: draft.block.listSha256,
  authorizationDraftLength: TEXT.authorizationDraft.length, authorizationOriginalLength: TEXT.authorizationOriginal.length, artifactLength: TEXT.artifact.length, whyLength: TEXT.why.length,
}, null, 1));
