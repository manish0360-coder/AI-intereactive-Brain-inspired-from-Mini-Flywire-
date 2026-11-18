// ==========================================================
// M13 — writes the graph bank and its structural record (STRUCTURE ONLY; no agent)
// ==========================================================
//   node experiments/m13_generalization/make_bank.mjs [--check]
// Writes graph_bank.json (the 165 modular-ring graphs) and structure.json (descriptors of the bank, the development
// family and the app graph, and the novelty check). With --check it writes nothing and exits 1 unless both files on
// disk are exactly what the generator and the descriptors give.
// ==========================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeBank } from './worlds_modular.mjs';
import { structureRecord } from './structure.mjs';

export const N_LABELS = 165;
const HERE = path.dirname(fileURLToPath(import.meta.url));

const bank = makeBank(N_LABELS);
const bankText = JSON.stringify(bank, null, 1) + '\n';
const structText = JSON.stringify(structureRecord(bank), null, 1) + '\n';
const bankPath = path.join(HERE, 'graph_bank.json'), structPath = path.join(HERE, 'structure.json');
if (process.argv.includes('--check')) {
  const same = fs.existsSync(bankPath) && fs.readFileSync(bankPath, 'utf8') === bankText && fs.existsSync(structPath) && fs.readFileSync(structPath, 'utf8') === structText;
  console.log(same ? 'graph_bank.json and structure.json are exactly what the generator gives' : 'MISMATCH');
  process.exit(same ? 0 : 1);
}
fs.writeFileSync(bankPath, bankText);
fs.writeFileSync(structPath, structText);
const nv = JSON.parse(structText).novelty;
console.log(`bank: ${bank.count} graphs; novelty ${nv.holds ? 'HOLDS' : 'FAILS'} (bank clustering p05 ${nv.bankClusteringP05.toFixed(3)} vs development p95 ${nv.devClusteringP95.toFixed(3)}; cyclomatic as declared: ${nv.cyclomaticAsDeclared}); skipped events in the bank schedules: ${nv.bank.skippedEvents} of ${nv.bank.events}`);
