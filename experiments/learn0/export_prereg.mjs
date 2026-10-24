// ==========================================================
// LEARN-0 — machine-readable preregistration (derived from config.mjs; digest-bound; NOT a freeze)
// ==========================================================
//   node export_prereg.mjs            writes preregistration.json
//   node export_prereg.mjs --check    exits 1 unless preregistration.json equals what the current sources produce
// Everything a decision depends on is copied from config.mjs and bound by its decision digest; the package files are bound by content.
// Status stays DESIGN_FOR_REVIEW: a freeze milestone (separate authorisation) pins this file, extends the stream and records the block.
// ==========================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as C from './config.mjs';
import { LINES } from './transform.mjs';
import { loadTable, loadSweep } from './static_audit.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, 'preregistration.json');
export const PACKAGE_FILES = Object.freeze(['config.mjs', 'transform.mjs', 'session.mjs', 'plan.mjs', 'orchestrate.mjs', 'analyze.mjs', 'static_audit.mjs', 'map_audit_table.json', 'map_sweep_table.json',
  'provenance.mjs', 'sizing.mjs', 'verify_learn0.mjs', 'export_prereg.mjs', 'tools/calib_learn0.mjs', 'tools/sizing_learn0.mjs', 'evidence/calib_learn0_summary.json', 'evidence/calib_learn0_rows.json',
  'evidence/sizing_learn0.json']);

export function buildPrereg() {
  const table = loadTable(), sweep = loadSweep();
  const files = Object.fromEntries(PACKAGE_FILES.map(f => [f, C.sha256(fs.readFileSync(path.join(HERE, f)))]));
  const body = {
    schema: `${C.SCHEMA}.preregistration`, study: C.STUDY, status: C.STATUS,
    authorisation: { confirmatoryRun: false, freeze: false, note: 'design package for review; no confirmatory world has been generated or run' },
    question: 'Does experience-derived state improve goal-directed behaviour when every map oracle is disabled?',
    runtime: { ...C.RUNTIME, headCommitOfThisPackage: 'see git (the package is untracked until authorised)', hookState: C.CONFIRMATORY_STATE, hooks: C.HOOK_STATES[C.CONFIRMATORY_STATE] },
    trees: { prodsem: C.TREE, guard: C.GUARD_TREE, learn0: C.LEARN0_TREE, learn0Lines: Object.fromEntries(Object.entries(LINES).map(([o, l]) => [o, { file: l.file, anchor: l.anchor, where: l.where, line: l.line }])) },
    mapKnowledge: { definition: C.RULES.scope, oracles: C.ORACLES, neutralValues: { goalDistance: 0, canReachGoal: true, graphDiameter: 0, futureScore: 'undefined (projection returns 0)' },
      callGraphAudit: { table: 'map_audit_table.json', sites: table.length, classes: table.reduce((a, r) => (a[r.cls] = (a[r.cls] || 0) + 1, a), {}),
        sweep: { table: 'map_sweep_table.json', sites: sweep.length, classes: sweep.reduce((a, r) => (a[r.cls] = (a[r.cls] || 0) + 1, a), {}) } } },
    design: { training: C.TRAINING, cells: C.CELLS, arms: C.CONFIRMATORY_ARMS, ticks: C.TICKS, sessionsPerWorld: C.SESSIONS_PER_WORLD, accounting: C.SESSION_ACCOUNTING },
    worlds: { block: 'L', start: C.WORLD_START, n: C.WORLDS_N, end: C.WORLD_START + C.WORLDS_N - 1, perGoal: C.PER_GOAL, goals: C.GOALS, reserved: C.RESERVED,
      seeds: { train: `trainSeed(w) = ${C.SEED_BASE} + 2w`, test: `testSeed(w) = ${C.SEED_BASE} + 2w + 1`, firstTrain: C.trainSeed(C.WORLD_START), lastTest: C.testSeed(C.WORLD_START + C.WORLDS_N - 1) },
      configurations: 'accepted-configuration stream indices 1672..2031 from CONFIG_START; generated at the freeze milestone, not before' },
    primary: { claim: C.CLAIMS[0], margin: C.MARGIN, level: C.PRIMARY_LEVEL, bootstrap: C.BOOTSTRAP,
      decisionRule: { LEARNS_WITHOUT_MAP: 'CI lower >= delta', EXPERIENCE_HARMS_WITHOUT_MAP: 'CI upper <= -delta', NO_PRACTICAL_EFFECT: '-delta < CI lower and CI upper < delta', INCONCLUSIVE: 'otherwise' } },
    secondary: C.SECONDARY, secondaryPolicy: C.SECONDARY_POLICY, instruments: C.INSTRUMENTS, provenance: C.PROVENANCE, rules: C.RULES,
    sizing: { ...C.SIZING, rule: 'n >= ((z0.975 + z0.80) * SD / delta)^2, SD = development SD of the primary contrast inflated by 25 %',
      source: 'evidence/calib_learn0_rows.json (XFER-1 development worlds 0..29), recomputed by sizing.mjs; verification evidence/sizing_learn0.json (closed form + Monte Carlo through the analysis bootstrap)',
      operatingCharacteristics: JSON.parse(fs.readFileSync(path.join(HERE, 'evidence', 'sizing_learn0.json'), 'utf8')).closedForm.scenarios },
    calibration: C.CALIBRATION,
    gate: { command: 'node experiments/learn0/verify_learn0.mjs', worldsUsed: 'XFER-1 development worlds 0..3 only' },
    digests: { decision: C.decisionDigest(), design: C.designDigest() },
    files,
  };
  return { ...body, digest: C.hashObject(body) };
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  const p = buildPrereg();
  if (process.argv.includes('--check')) {
    const cur = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : null;
    const same = cur && JSON.stringify(cur) === JSON.stringify(p);
    console.log(same ? `preregistration.json is current (digest ${p.digest})` : 'preregistration.json is STALE or missing: re-run node export_prereg.mjs');
    process.exit(same ? 0 : 1);
  }
  fs.writeFileSync(OUT, JSON.stringify(p, null, 1) + '\n');
  console.log(`wrote preregistration.json (digest ${p.digest}; decision ${p.digests.decision})`);
}
