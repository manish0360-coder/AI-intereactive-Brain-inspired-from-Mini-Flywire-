// ==========================================================
// MCF-1 — descriptive census analysis (Option C)
// ==========================================================
// The frame is the set of valid qualified seeds frozen in the Stage-V validity manifest.  Every quantity below
// is an exact property of that finite frame.  NO test, p-value, interval or generalisation is produced:
// a census of a frozen frame has no sampling uncertainty, and the harness makes no claim about seeds
// outside it.
//
// ORDER (enforced by structure): the validity manifest and the steering quantities are computed first and
// from the validity manifest alone; outcome fields are read only afterwards.
//
// Quantities (per valid seed s, executed edges x_C, x_9, x_11 under COLD, M9, M11):
//   T_s      = 1[x_9 = 9 and x_11 = 11]            both contents execute their own remembered route
//   sigma_s  = (1[x_9 = 9] + 1[x_11 = 11]) / 2     remembered-route execution rate, counterbalanced over route identity
//   cold_s   = (1[x_C = 9] + 1[x_C = 11]) / 2      the same rate with no memory
//   net_s    = sigma_s - cold_s                    net steering shift against COLD
//   Y(m,l)   = first-edge traversal success of content m under twin l
//   D^R_s    = (1/2) sum_l [ Y(M_l,l) - Y(M_l',l) ]     GOOD minus BAD, twin-averaged
//   D^G_s, D^B_s = same against COLD (decomposition; licensed only where the identity class holds)
// ==========================================================
import { APPROVALS, DESIGN, canonicalJson, sha256 } from './config.mjs';
import { manifestIntact } from './validity.mjs';

export const CLAIMS = Object.freeze({
  permitted: Object.freeze([
    'In this frozen finite frame, the counterbalanced steering rate was T_frame (and the net shift and first-edge contrast were as reported).',
    'The first-edge outcome contrast is mechanically linked to the steering rate under the registered reliability assignment (p_reliable - p_unreliable is a design constant).',
    'Restored prior-episode memory steered the first routing choice toward the remembered route, independent of route identity and of the episode\'s historical goal (at the first decision).',
  ]),
  prohibited: Object.freeze([
    'goal arrival or task completion', 'persistence, replay, overwrite, learning or trajectory effects', 'agent evaluation of reliability',
    'generalisation beyond this frame, other decision points, other goals, or the current repository HEAD',
    'statistical significance of a census', 'episodic recall or goal-conditioned memory',
  ]),
});

const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
const count = (a, f) => a.filter(f).length;

/** steering quantities: validity manifest ONLY */
export function steeringFromValidity(vManifest) {
  if (!manifestIntact(vManifest)) throw new Error('MCF-1 analysis refused: the validity manifest is not intact');
  if (vManifest.halted) return { status: 'HALTED', halts: vManifest.halts };
  const valid = vManifest.entries.filter(e => e.valid);
  const P = valid.map(e => e.pattern);
  const T = P.map(p => (p.x9 === 9 && p.x11 === 11 ? 1 : 0));
  const sigma = P.map(p => ((p.x9 === 9 ? 1 : 0) + (p.x11 === 11 ? 1 : 0)) / 2);
  const cold = P.map(p => ((p.xC === 9 ? 1 : 0) + (p.xC === 11 ? 1 : 0)) / 2);
  const net = sigma.map((s, i) => s - cold[i]);
  const patterns = {};
  for (const p of P) { const k = `xC=${p.xC} x9=${p.x9} x11=${p.x11}`; patterns[k] = (patterns[k] || 0) + 1; }
  return {
    status: 'OK', frameSize: valid.length,
    T_frame: { k: T.reduce((a, b) => a + b, 0), n: valid.length, value: mean(T) },
    sigmaBar: mean(sigma), coldRate: mean(cold), netShift: mean(net),
    coldRouteChoice: { via9: count(P, p => p.xC === 9), via11: count(P, p => p.xC === 11), distractor: count(P, p => p.xC !== 9 && p.xC !== 11) },
    executedPatterns: patterns,
    identityClass: { inClass: count(valid, e => e.identityClass === true), outOfClass: count(valid, e => e.identityClass !== true) },
  };
}

/** outcome contrasts: read only after the steering block exists */
export function contrastFromOutcomes(vManifest, oManifest) {
  if (!manifestIntact(oManifest)) throw new Error('MCF-1 analysis refused: the outcome manifest is not intact');
  if (oManifest.inputs.validityManifestSha256 !== vManifest.sha256) throw new Error('MCF-1 analysis refused: the outcome manifest was not produced against this validity manifest');
  if (oManifest.halted) return { status: 'HALTED', halts: oManifest.halts };
  const vOk = new Map(vManifest.entries.filter(e => e.valid).map(e => [e.raw, e]));
  const rows = [];
  for (const o of oManifest.entries) {
    if (!o.valid || !vOk.has(o.raw)) continue;
    const Y = (c, t) => o.outcomes[`${c}|${t}`].ok;
    const twin = (l) => `T${l}`, other = (l) => (l === 9 ? 11 : 9);
    let dR = 0, dG = 0, dB = 0;
    for (const l of [9, 11]) {
      dR += (Y(`M${l}`, twin(l)) - Y(`M${other(l)}`, twin(l))) / 2;
      dG += (Y(`M${l}`, twin(l)) - Y('C', twin(l))) / 2;
      dB += (Y(`M${other(l)}`, twin(l)) - Y('C', twin(l))) / 2;
    }
    rows.push({ raw: o.raw, dR, dG, dB, identityHolds: Math.abs(dG + dB) < 1e-12, binary: dR === 0 || dR === 1 });
  }
  const n = rows.length, sum = (f) => rows.reduce((a, r) => a + f(r), 0);
  return {
    status: 'OK', n,
    firstEdgeContrast_GOODminusBAD: { k: sum(r => r.dR), n, value: n ? sum(r => r.dR) / n : null, allBinary: rows.every(r => r.binary) },
    decomposition: { GOODminusCOLD: n ? sum(r => r.dG) / n : null, BADminusCOLD: n ? sum(r => r.dB) / n : null, identityHoldsForSeeds: count(rows, r => r.identityHolds), identityFailsForSeeds: count(rows, r => !r.identityHolds) },
    seedsInstrumentInvalidAtStageO: oManifest.entries.filter(e => !e.valid).map(e => ({ raw: e.raw, hardSeed: e.hardSeed, haltStage: e.haltStage })),
  };
}

export function analyzeFrame({ vManifest, oManifest = null, admissionSummary = null, qualificationSummary = null }) {
  const steering = steeringFromValidity(vManifest);                               // 1. validity manifest first
  const exclusions = { byRule: vManifest.counts.byRule, invalidSeeds: vManifest.entries.filter(e => !e.valid).map(e => ({ raw: e.raw, hard: e.hard })) };
  const contrast = oManifest ? contrastFromOutcomes(vManifest, oManifest) : { status: 'NOT_RUN' };   // 2. outcomes afterwards
  const body = {
    schema: 'mcf1.analysis/1', design: { sampling: 'Option C: census of the frozen valid qualified frame', approvals: APPROVALS, contents: DESIGN.contents, twins: DESIGN.twins },
    inference: { performed: false, reason: 'census of a frozen finite frame: every number is an exact frame property; no test, interval or generalisation is produced' },
    provenance: { validityManifestSha256: vManifest.sha256, outcomeManifestSha256: oManifest ? oManifest.sha256 : null, admission: admissionSummary, qualification: qualificationSummary },
    frame: { qualifiedSeeds: vManifest.entries.length, validSeeds: vManifest.counts.valid, invalidSeeds: vManifest.counts.invalid },
    primaryDescriptive: { name: APPROVALS.primaryDescriptive.value, status: APPROVALS.primaryDescriptive.status, value: steering.status === 'OK' ? steering.T_frame.value : null },
    steering, firstEdgeOutcome: contrast, exclusions, claims: CLAIMS,
  };
  return { ...body, sha256: sha256(canonicalJson(body)) };
}
