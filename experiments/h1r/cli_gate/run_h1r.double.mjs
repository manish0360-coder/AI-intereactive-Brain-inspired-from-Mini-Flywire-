// ==========================================================
// H1-R CLI gate — TEST DOUBLE for experiments/h1r/run_h1r.mjs
// ==========================================================
// Used only inside verify_cli.mjs sandboxes (copied to <sandbox>/experiments/h1r/run_h1r.mjs). It runs no
// agent, no M7 code and no instrument. It writes a structurally complete h1r.run/2 record whose provenance is
// the planned run's identity, whose measurement is empty, and whose 11 validity flags are all false, so the
// orchestrator classifies every run invalid and never computes a metric from it. Its fingerprint is a hash of
// the run's identity (a determinism re-run therefore matches its base run).
//   H1R_CLI_DOUBLE_CRASH=<runId>[,<runId>...]   exit 70 without a record (a crash, D-026 §1)
//   H1R_CLI_DOUBLE_MALFORMED=<runId>             write bytes that are not JSON (a MALFORMED halt)
// ==========================================================
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { instrumentIdentity, INSTRUMENT_FILES, VALIDITY_FLAGS, SCHEMAS } from './orchestrate.mjs';
import { envSeedFor, blockCodeOf } from './env_seed.mjs';

const IN = JSON.parse(process.argv[2] || '{}');
for (const k of ['configSeed', 'configIndex', 'agentSeed', 'arm', 'block', 'out', 'tree']) if (IN[k] === undefined) throw new Error(`run_h1r double: ${k} required`);
const runId = path.basename(IN.out).replace(/\.json\.partial$/, '');
if ((process.env.H1R_CLI_DOUBLE_CRASH || '').split(',').includes(runId)) process.exit(70);
if (process.env.H1R_CLI_DOUBLE_MALFORMED === runId) { fs.writeFileSync(IN.out, 'not a record'); process.exit(0); }

const env = await import(pathToFileURL(path.join(IN.tree, 'experiments', 'm7', 'env.js')).href);
let acceptedSeed = IN.configSeed, cfg = env.makeConfig(acceptedSeed, IN.configIndex);
while (!cfg.accepted) { acceptedSeed++; if (acceptedSeed > IN.configSeed + 100000) throw new Error('run_h1r double: no accepted seed'); cfg = env.makeConfig(acceptedSeed, IN.configIndex); }

const ident = instrumentIdentity();
const instrument = Object.fromEntries(['b2Commit', 'trustMode', ...Object.keys(INSTRUMENT_FILES)].map(k => [k, ident[k]]));
const envSeed = envSeedFor({ agentSeed: IN.agentSeed, blockCode: blockCodeOf(IN.block), acceptedConfigIndex: IN.configIndex });
const fork = IN.fork ? { call: IN.fork.call, to: IN.fork.to || 'A2' } : null;
const record = {
  schema: SCHEMAS.run,
  double: 'verify_cli test double: no agent was run; every validity flag is false',
  provenance: { configSeed: IN.configSeed, configIndex: IN.configIndex, acceptedSeed, goal: cfg.goal, agentSeed: IN.agentSeed, arm: IN.arm,
    h1r: { ...instrument, envStream: { block: IN.block, envSeed }, fork } },
  fingerprint: crypto.createHash('sha256').update(JSON.stringify([IN.block, IN.configIndex, IN.configSeed, acceptedSeed, IN.agentSeed, IN.arm, fork])).digest('hex'),
  validity: { ...Object.fromEntries(VALIDITY_FLAGS.map(k => [k, false])), valid: false },
  measurement: { schema: SCHEMAS.measure, events: [], ticks: [], attempts: [], resets: [], snapshots: [], floorCalls: [], step0: null },
};
fs.writeFileSync(IN.out, JSON.stringify(record));
