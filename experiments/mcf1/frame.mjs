// ==========================================================
// MCF-1 — the authoritative complete-cluster frame
// ==========================================================
// ONE frame feeds every reported metric.  A seed is in the frame iff
//   * it was admitted and registry-available (V10, carried by its Stage-V entry),
//   * it qualified at Stage Q (it has a Stage-V entry at all),
//   * all six condition/twin runs are present and pass every seed-scope check at Stage V,
//   * all six condition/twin runs are present and pass every seed-scope check at Stage O,
//   * and no stage-level halt occurred (a halted stage yields NO frame; there is no partial frame).
// Exclusion is atomic: a failed member excludes the whole seed from every metric, so a paired comparison is
// never computed from the surviving members of a broken cluster.
//
// Nothing here reads a success/failure value to decide membership.  The frame is hashed (seeds, size and the
// manifests it came from); every metric carries that hash and the common denominator.
// ==========================================================
import { canonicalJson, sha256 } from './config.mjs';
import { RUN_KEYS, manifestIntact } from './validity.mjs';

export const FRAME_SCHEMA = 'mcf1.frame/1';
export const FRAME_RULE = 'complete-cluster';
const refuse = (m) => { throw new Error(`MCF-1 frame refused: ${m}`); };

export const frameHash = (body) => sha256(canonicalJson(body));
/** a frame is intact iff its stored hash equals the hash of its body (missing hash -> not intact) */
export function frameIntact(frame) {
  if (!frame || typeof frame !== 'object') return false;
  const { sha256: h, ...body } = frame;
  return typeof h === 'string' && h === frameHash(body);
}

const intOk = (x) => Number.isInteger(x);
const rowOf = (v, o) => {
  const row = { raw: v.raw, pattern: { xC: v.pattern.xC, x9: v.pattern.x9, x11: v.pattern.x11 }, pairClass: v.pairClass || v.pair, identityClass: v.identityClass === true,
    diagnostics: (v.diagnostics || []).slice(), exploration: v.exploration || null };
  if (o) row.outcomes = Object.fromEntries(RUN_KEYS.map(k => [k, { edge: o.outcomes[k].edge, ok: o.outcomes[k].ok }]));
  return row;
};
const patternComplete = (p) => p && intOk(p.xC) && intOk(p.x9) && intOk(p.x11);

/**
 * Exclusions by rule x content x twin x stage.  Each cell counts SEEDS having a failing run in that cell;
 * `evaluated` is the number of seeds the stage evaluated, so rates are comparable across conditions.  A rule that is
 * not run-specific (V10, cross-run embedding equality) is attributed to the pseudo-cell content=seed, twin=seed.
 */
export function exclusionTable({ vManifest, oManifest = null }) {
  const cells = new Map();
  const add = (stage, rule, key, kind, evaluated) => {
    const [content, twin] = key === 'seed' ? ['seed', 'seed'] : key.split('|');
    const id = `${stage}|${rule}|${content}|${twin}`;
    const c = cells.get(id) || { stage, rule, kind, content, twin, seeds: 0, evaluated };
    c.seeds++; cells.set(id, c);
  };
  const nV = vManifest.entries.length;
  for (const e of vManifest.entries) for (const [rule, keys] of Object.entries(e.failures || {})) for (const key of keys) add('V', rule, key, 'seed', nV);
  if (oManifest) {
    const nO = oManifest.entries.length;
    for (const e of oManifest.entries) {
      for (const [rule, keys] of Object.entries(e.failures || {})) for (const key of keys) add('O', rule, key, 'seed', nO);
      for (const [rule, keys] of Object.entries(e.haltDetail || {})) for (const key of keys) add('O', rule, key, 'stage-integrity', nO);
    }
  }
  const rows = [...cells.values()].sort((a, b) => (a.stage + a.rule + a.content + a.twin < b.stage + b.rule + b.content + b.twin ? -1 : 1))
    .map(c => ({ ...c, rate: c.evaluated ? c.seeds / c.evaluated : null }));
  return {
    rows,
    seedsExcluded: { V: vManifest.entries.filter(e => !e.valid).length, O: oManifest ? oManifest.entries.filter(e => !e.valid).length : null },
    note: 'a seed may fail several rules and several cells; cells are not mutually exclusive',
  };
}

/** the complete-cluster frame from the Stage-V and Stage-O manifests */
export function buildFrame({ vManifest, oManifest, qualifiedSha256 = null, admittedSha256 = null, admittedList = null }) {
  if (!vManifest || !manifestIntact(vManifest)) refuse('the validity manifest is missing or not intact');
  if (!oManifest || !manifestIntact(oManifest)) refuse('the outcome manifest is missing or not intact');
  if (vManifest.halted || (vManifest.halts && vManifest.halts.length)) refuse('Stage V halted: a halted stage yields no frame');
  if (oManifest.halted || (oManifest.halts && oManifest.halts.length)) refuse('Stage O halted: a halted stage yields no frame');
  if (!oManifest.inputs || oManifest.inputs.validityManifestSha256 !== vManifest.sha256) refuse('the outcome manifest was not produced against this validity manifest');
  if (qualifiedSha256 !== null && vManifest.inputs.qualifiedSha256 !== qualifiedSha256) refuse('the qualified-seed hash does not match the validity manifest');
  const vValid = vManifest.entries.filter(e => e.valid), oByRaw = new Map(oManifest.entries.map(e => [e.raw, e]));
  const vRaws = vValid.map(e => e.raw).sort((a, b) => a - b), oRaws = oManifest.entries.map(e => e.raw).sort((a, b) => a - b);
  if (vRaws.length !== oRaws.length || vRaws.some((r, i) => r !== oRaws[i])) refuse('Stage O does not cover exactly the Stage-V-valid seeds');
  if (admittedList) { const A = new Set(admittedList); for (const e of vManifest.entries) if (!A.has(e.raw)) refuse(`seed ${e.raw} is not in the admitted list`); }
  const rows = [], seeds = [];
  for (const v of vValid) {
    const o = oByRaw.get(v.raw);
    if (!o.valid) continue;                                              // seed-scope fault at Stage O: the WHOLE seed leaves the frame
    if (!patternComplete(v.pattern) || !v.executed) refuse(`seed ${v.raw}: the Stage-V entry lacks a complete executed pattern`);
    if (!o.outcomes) refuse(`seed ${v.raw}: a valid Stage-O entry carries no outcomes`);
    for (const k of RUN_KEYS) {
      const y = o.outcomes[k];
      if (!y || !intOk(y.edge) || !(y.ok === 0 || y.ok === 1)) refuse(`seed ${v.raw}: incomplete cluster at run ${k}`);
      if (y.edge !== v.executed[k]) refuse(`seed ${v.raw}: the Stage-O executed edge of ${k} differs from Stage V`);
    }
    rows.push(rowOf(v, o)); seeds.push(v.raw);
  }
  seeds.sort((a, b) => a - b); rows.sort((a, b) => a.raw - b.raw);
  const body = { schema: FRAME_SCHEMA, rule: FRAME_RULE, kind: 'complete', runKeys: RUN_KEYS.slice(), size: seeds.length, seeds,
    validityManifestSha256: vManifest.sha256, outcomeManifestSha256: oManifest.sha256, qualifiedSha256: vManifest.inputs.qualifiedSha256 || null, admittedSha256 };
  const nVvalid = vValid.length, lostAtO = nVvalid - seeds.length;
  const reconciliation = {
    qualifiedEvaluatedAtStageV: vManifest.entries.length,
    stageV: { valid: nVvalid, invalid: vManifest.entries.length - nVvalid, invalidByRule: vManifest.counts.byRule },
    stageO: { evaluated: oManifest.entries.length, valid: seeds.length, invalid: lostAtO, invalidByRule: oManifest.counts.byRule },
    completeClusterFrame: seeds.length,
    identity: `${nVvalid} valid at Stage V - ${lostAtO} excluded at Stage O = ${seeds.length}`,
    consistent: seeds.length === nVvalid - lostAtO && seeds.length === oManifest.entries.filter(e => e.valid).length,
  };
  return { frame: { ...body, sha256: frameHash(body) }, rows, reconciliation, exclusions: exclusionTable({ vManifest, oManifest }) };
}

/**
 * Pre-outcome snapshot (Stage V only; no outcome exists).  Labelled kind 'pre-outcome': it is NOT the analysis frame,
 * it can never be interpreted, and it carries its own hash.
 */
export function buildPreOutcomeFrame({ vManifest }) {
  if (!vManifest || !manifestIntact(vManifest)) refuse('the validity manifest is missing or not intact');
  if (vManifest.halted || (vManifest.halts && vManifest.halts.length)) refuse('Stage V halted: a halted stage yields no frame');
  const rows = [], seeds = [];
  for (const v of vManifest.entries.filter(e => e.valid)) {
    if (!patternComplete(v.pattern)) refuse(`seed ${v.raw}: the Stage-V entry lacks a complete executed pattern`);
    rows.push(rowOf(v, null)); seeds.push(v.raw);
  }
  seeds.sort((a, b) => a - b); rows.sort((a, b) => a.raw - b.raw);
  const body = { schema: FRAME_SCHEMA, rule: FRAME_RULE, kind: 'pre-outcome', runKeys: RUN_KEYS.slice(), size: seeds.length, seeds,
    validityManifestSha256: vManifest.sha256, outcomeManifestSha256: null, qualifiedSha256: vManifest.inputs.qualifiedSha256 || null, admittedSha256: null };
  return { frame: { ...body, sha256: frameHash(body) }, rows, reconciliation: { qualifiedEvaluatedAtStageV: vManifest.entries.length, stageV: { valid: seeds.length, invalid: vManifest.entries.length - seeds.length, invalidByRule: vManifest.counts.byRule } },
    exclusions: exclusionTable({ vManifest, oManifest: null }) };
}
