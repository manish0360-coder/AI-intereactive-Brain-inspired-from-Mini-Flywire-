// M-REG-2 review package: print the identities a registration would move, for the repository checkout at <root>.
// Read-only.  usage: node identities.mjs <root>
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = path.resolve(process.argv[2] || '.');
const imp = (rel) => import(pathToFileURL(path.join(ROOT, rel)).href);
const L = await imp('experiments/mcf1/lock.mjs');
const C = await imp('experiments/mcf1/config.mjs');
const I = await imp('experiments/mcf1/inventory.mjs');
const inv = I.buildInventory();
const live = L.liveBindings();
let official;
try { L.officialAuthorisation(); official = 'AUTHORISED'; } catch (e) { official = String(e.message); }
console.log(JSON.stringify({
  registryDigestSha256: live.registryDigestSha256,
  inventorySha256: inv.sha256,
  reservationRegistrySha256: inv.descriptor.registry.sha256,
  configSha256: C.hashObject(C.configSnapshot()),
  sourcesSha256: L.sourcesDigest().sha256,
  verifierSha256: L.verifierDigest().sha256,
  studyConfigurationSha256: C.hashObject(C.STUDY_CONFIGURATION),
  scanAuthorization: L.scanAuthorisation(),
  frozen: C.FROZEN,
  officialAuthorisation: official,
}, null, 1));
