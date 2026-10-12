// ==========================================================
// MCF-1 — descriptive census analysis (Option C)
// ==========================================================
// The frame is the complete-cluster frame (frame.mjs): the seeds whose six condition/twin runs are present and
// valid at Stage V AND Stage O.  Every quantity below is an exact property of that finite frame, computed on
// the SAME rows with the SAME denominator, and carries the frame hash.  NO test, p-value, interval, practical
// threshold or generalisation is produced: a census of a frozen frame has no sampling uncertainty, and the
// harness makes no claim about seeds outside it.
//
// Per-seed executed first edges: xC (COLD), x9 (M9), x11 (M11).  The executed edge is twin-invariant (V5).
//
//   PRIMARY   T_frame = mean_s S_s,  S_s = 1/2 ( 1{x9=9} - 1{x9=11} + 1{x11=11} - 1{x11=9} )
//             The content-contrast executed-edge score: what each memory content executed, minus what the OTHER
//             content executed, on the route the first one remembers.  It is COLD-free, signed, and takes the values
//             -1, -1/2, 0, 1/2, 1.  It is NOT conditioned on success and not restricted to expected patterns.
//   SECONDARY followRate  = mean 1{x9=9 and x11=11}     (the previous T_s indicator; equals S_s on follow/equal pairs)
//             sigmaBar    = mean 1/2 (1{x9=9} + 1{x11=11})            remembered-route execution rate
//             coldRate    = mean 1/2 (1{xC=9} + 1{xC=11})
//             netShift    = sigmaBar - coldRate                       GOOD - COLD, executed edge
//             nonSpecific = netShift + BAD-COLD(executed) = 1/2(1{x9=9}+1{x11=11}+1{x11=9}+1{x9=11}) - (1{xC=9}+1{xC=11})
//             algebra     netShift = 1/2 (S_s + nonSpecific); on the identity class nonSpecific = 0 and netShift = S_s / 2
//   OUTCOME   Y(m,l) = first-edge traversal success of content m under twin l
//             D_s = 1/2 sum_l [ Y(M_l,l) - Y(M_l',l) ]   (GOOD - BAD, twin-averaged)
//             D^G_s, D^B_s = same against COLD
//
// Reported alongside, never deciding anything: pair-class counts and signed scores (V6), identity-class counts
// (V7), the inferred exploration indicator and its strata, and the effect of the former V6 restriction.
// ==========================================================
import { APPROVALS, DESIGN, canonicalJson, sha256 } from './config.mjs';
import { buildFrame, buildPreOutcomeFrame, frameIntact } from './frame.mjs';

export const CLAIMS = Object.freeze({
  permitted: Object.freeze([
    'In this enumerated finite frame of simulation seeds, restoring a single prior episode on a matched route changed the executed first edge in the way T_frame, the secondary measures and the pair-class counts describe.',
    'The first-edge outcome contrast is mechanically linked to the steering score under the registered reliability assignment (p_reliable - p_unreliable is a design constant).',
    'The statement is about memory-guided first-edge routing within the single specified simulation context (start node 10, goal 12, matched two-hop routes) and this frame only.',
  ]),
  prohibited: Object.freeze([
    'planning', 'probability understanding or agent evaluation of reliability', 'goal-conditioned recall or episodic recall', 'generalization beyond this frame, other decision points, other goals, or the current repository HEAD',
    'general cognition', 'a general performance benefit of memory', 'goal arrival or task completion', 'persistence, replay, overwrite, learning or trajectory effects', 'statistical significance, p-values or sampling-based intervals',
  ]),
});

const I = (b) => (b ? 1 : 0);
/** Per-seed scores from the executed pattern {xC, x9, x11}.  Pure; the only definitions of the reported steering metrics. */
export const SCORES = Object.freeze({
  steering: (p) => 0.5 * (I(p.x9 === 9) - I(p.x9 === 11) + I(p.x11 === 11) - I(p.x11 === 9)),
  follow: (p) => I(p.x9 === 9 && p.x11 === 11),
  sigma: (p) => 0.5 * (I(p.x9 === 9) + I(p.x11 === 11)),
  cold: (p) => 0.5 * (I(p.xC === 9) + I(p.xC === 11)),
  net: (p) => 0.5 * (I(p.x9 === 9) + I(p.x11 === 11)) - 0.5 * (I(p.xC === 9) + I(p.xC === 11)),
  nonSpecific: (p) => 0.5 * (I(p.x9 === 9) + I(p.x11 === 11) + I(p.x11 === 9) + I(p.x9 === 11)) - (I(p.xC === 9) + I(p.xC === 11)),
});

export const METRIC_DEFS = Object.freeze({
  T_frame:     { score: SCORES.steering, formula: 'mean over the frame of S_s = 1/2 (1{x9=9} - 1{x9=11} + 1{x11=11} - 1{x11=9})' },
  followRate:  { score: SCORES.follow, formula: 'mean over the frame of 1{x9=9 and x11=11}' },
  sigmaBar:    { score: SCORES.sigma, formula: 'mean over the frame of 1/2 (1{x9=9} + 1{x11=11})' },
  coldRate:    { score: SCORES.cold, formula: 'mean over the frame of 1/2 (1{xC=9} + 1{xC=11})' },
  netShift:    { score: SCORES.net, formula: 'sigmaBar - coldRate, per seed then averaged' },
  nonSpecific: { score: SCORES.nonSpecific, formula: 'netShift + executed BAD-COLD: 1/2(1{x9=9}+1{x11=11}+1{x11=9}+1{x9=11}) - (1{xC=9}+1{xC=11})' },
});
/** the metrics a primary selector may name (only the ledger value yields an interpretable analysis) */
export const SELECTABLE_PRIMARY = Object.freeze(Object.keys(METRIC_DEFS).filter(k => k !== 'coldRate'));

const refuse = (m) => { throw new Error(`MCF-1 analysis refused: ${m}`); };

/** one metric over a row set: value, sum, denominator, frame size and frame hash (stratum label when a subset) */
function metric(rows, f, frame, interpretable, extra = {}) {
  const vals = rows.map(f), n = vals.length, sum = vals.reduce((a, b) => a + b, 0);
  return { value: n ? sum / n : null, sum, n, frameN: frame.size, frameSha256: frame.sha256, interpretable, ...extra };
}
const counted = (rows, pred, frame, interpretable, extra = {}) => ({ count: rows.filter(pred).length, of: rows.length, frameN: frame.size, frameSha256: frame.sha256, interpretable, ...extra });

/** the descriptive measures over the frame rows (pure; the verifier checks it against hand-computed examples) */
export function computeMetrics(rows, frame, interpretable = true) {
  const out = {};
  for (const [name, def] of Object.entries(METRIC_DEFS)) out[name] = metric(rows, (r) => def.score(r.pattern), frame, interpretable, { name, formula: def.formula });
  const exec = { C: (p) => p.xC, M9: (p) => p.x9, M11: (p) => p.x11 };
  const executionRates = {};
  for (const [c, get] of Object.entries(exec)) {
    executionRates[c] = {
      to9: metric(rows, (r) => I(get(r.pattern) === 9), frame, interpretable, { name: `${c} executes node 9` }),
      to11: metric(rows, (r) => I(get(r.pattern) === 11), frame, interpretable, { name: `${c} executes node 11` }),
      other: metric(rows, (r) => I(get(r.pattern) !== 9 && get(r.pattern) !== 11), frame, interpretable, { name: `${c} executes node 6 or 13` }),
    };
  }
  const patterns = {};
  for (const r of rows) { const k = `xC=${r.pattern.xC} x9=${r.pattern.x9} x11=${r.pattern.x11}`; patterns[k] = (patterns[k] || 0) + 1; }
  return { metrics: out, executionRates, executedPatterns: patterns };
}

const outcomeScores = {
  Y: (r, c, t) => r.outcomes[`${c}|${t}`].ok,
  dR: (r) => [9, 11].reduce((s, l) => s + (r.outcomes[`M${l}|T${l}`].ok - r.outcomes[`M${l === 9 ? 11 : 9}|T${l}`].ok) / 2, 0),
  dG: (r) => [9, 11].reduce((s, l) => s + (r.outcomes[`M${l}|T${l}`].ok - r.outcomes[`C|T${l}`].ok) / 2, 0),
  dB: (r) => [9, 11].reduce((s, l) => s + (r.outcomes[`M${l === 9 ? 11 : 9}|T${l}`].ok - r.outcomes[`C|T${l}`].ok) / 2, 0),
};

function outcomeBlock(rows, frame, interpretable) {
  const first = metric(rows, outcomeScores.dR, frame, interpretable, { name: 'first-edge contrast, GOOD minus BAD, twin-averaged' });
  const cells = {};
  for (const c of DESIGN.contents) for (const t of DESIGN.twins) cells[`${c}|${t}`] = metric(rows, (r) => outcomeScores.Y(r, c, t), frame, interpretable, { name: `first-edge success, ${c} under ${t}` });
  const identityHolds = rows.filter(r => Math.abs(outcomeScores.dG(r) + outcomeScores.dB(r)) < 1e-12).length;
  return {
    status: 'OK',
    firstEdgeContrast_GOODminusBAD: { ...first, allBinary: rows.every(r => { const d = outcomeScores.dR(r); return d === 0 || d === 1; }) },
    decomposition: {
      GOODminusCOLD: metric(rows, outcomeScores.dG, frame, interpretable, { name: 'GOOD minus COLD' }),
      BADminusCOLD: metric(rows, outcomeScores.dB, frame, interpretable, { name: 'BAD minus COLD' }),
      identityHoldsForSeeds: identityHolds, identityFailsForSeeds: rows.length - identityHolds,
    },
    successRates: cells,
  };
}

function pairBlock(rows, frame, interpretable) {
  const cls = (c) => counted(rows, r => r.pairClass === c, frame, interpretable, { name: `pair class ${c}` });
  const scoreBins = {};
  for (const v of [-1, -0.5, 0, 0.5, 1]) scoreBins[String(v)] = counted(rows, r => SCORES.steering(r.pattern) === v, frame, interpretable, { name: `S_s = ${v}` });
  const regular = rows.filter(r => r.pairClass === 'follow' || r.pairClass === 'equal');
  const out = { follow: cls('follow'), equal: cls('equal'), reversed: cls('reversed'), mixed: cls('mixed'), signedScores: scoreBins,
    antiSteering: counted(rows, r => SCORES.steering(r.pattern) < 0, frame, interpretable, { name: 'S_s < 0' }),
    v6Flagged: counted(rows, r => r.diagnostics.includes('V6'), frame, interpretable, { name: 'V6 diagnostic raised (reversed or mixed pair)' }),
    v7Flagged: counted(rows, r => r.diagnostics.includes('V7'), frame, interpretable, { name: 'V7 diagnostic raised (outside the identity class)' }),
  };
  return { out, regular };
}

function explorationBlock(rows, frame, interpretable, hasOutcomes) {
  const vis = (r) => !!(r.exploration && r.exploration.anyVisible);
  const stratum = (label, subset) => ({
    n: subset.length, frameN: frame.size, frameSha256: frame.sha256, stratum: label,
    T_frame: metric(subset, (r) => SCORES.steering(r.pattern), frame, interpretable, { stratum: label }),
    netShift: metric(subset, (r) => SCORES.net(r.pattern), frame, interpretable, { stratum: label }),
    ...(hasOutcomes ? { firstEdgeContrast: metric(subset, outcomeScores.dR, frame, interpretable, { stratum: label }) } : {}),
  });
  return {
    indicator: 'inferred', basis: 'executed first edge differs from the recorded step-0 argmax (M-BEST vs M-DECISION)',
    limitations: [
      'the explore trigger and the pick are not directly recorded; the indicator is inferred from executed != argmax',
      'a triggered pick equal to the argmax is invisible in that run',
      'when all three contents share one argmax a trigger is invisible in every run (unobservableByConstruction)',
      'a COLD-only indicator misses triggers visible only under a memory content; the union over the six runs is reported',
      'a descriptive decomposition only: it does not adjust for confounding, and it never decides frame membership or the primary outcome',
    ],
    unionVisible: counted(rows, vis, frame, interpretable, { name: 'executed != argmax in at least one of the six runs' }),
    coldVisible: counted(rows, r => !!(r.exploration && r.exploration.coldVisible), frame, interpretable, { name: 'executed != argmax in a COLD run' }),
    memoryOnlyVisible: counted(rows, r => !!(r.exploration && r.exploration.anyVisible && !r.exploration.coldVisible), frame, interpretable, { name: 'visible only under a memory content' }),
    contentDependentPick: counted(rows, r => !!(r.exploration && r.exploration.anyVisible && r.exploration.sharedPick === false), frame, interpretable, { name: 'visible, executed edges differ across contents' }),
    unobservableByConstruction: counted(rows, r => !!(r.exploration && r.exploration.unobservableByConstruction), frame, interpretable, { name: 'all three contents share one argmax' }),
    strata: { visible: stratum('exploration-visible', rows.filter(vis)), notVisible: stratum('not-visible', rows.filter(r => !vis(r))) },
  };
}

/**
 * Analysis of the complete-cluster frame.  `primary` is a selector over METRIC_DEFS (default: the ledger value);
 * a non-ledger selection computes and labels that metric but is flagged and never interpretable.
 */
export function analyzeFrame({ vManifest, oManifest = null, qualifiedSha256 = null, admissionSummary = null, qualificationSummary = null, admittedList = null, primary = APPROVALS.primaryDescriptive.value }) {
  if (!SELECTABLE_PRIMARY.includes(primary)) refuse(`unknown primary selector "${primary}"`);
  const qsha = qualifiedSha256 !== null ? qualifiedSha256 : (qualificationSummary ? qualificationSummary.qualifiedSha256 : null);
  const built = oManifest
    ? buildFrame({ vManifest, oManifest, qualifiedSha256: qsha, admittedSha256: admissionSummary ? admissionSummary.admittedSha256 : null, admittedList })
    : buildPreOutcomeFrame({ vManifest });
  const { frame, rows, reconciliation, exclusions } = built;
  const complete = frame.kind === 'complete';
  const min = APPROVALS.minimumValidFrame.value;
  const onLedger = primary === APPROVALS.primaryDescriptive.value;
  const belowMinimum = frame.size < min;
  const allowed = complete && !belowMinimum && onLedger;
  const reason = !complete ? 'pre-outcome snapshot: no outcome stage, nothing is interpretable'
    : belowMinimum ? `the complete valid frame has ${frame.size} seeds, below the minimum of ${min}: scientific interpretation is refused`
    : !onLedger ? `the selected primary "${primary}" is not the ledger primary "${APPROVALS.primaryDescriptive.value}": test-only selection` : 'interpretation permitted within the claim boundary';

  const m = computeMetrics(rows, frame, allowed);
  const pb = pairBlock(rows, frame, allowed);
  const outcome = complete ? outcomeBlock(rows, frame, allowed) : { status: 'NOT_RUN' };
  const regularMetrics = {
    description: 'the former V6 eligibility restriction (executed pair (9,11) or x9 = x11), reported only to show its effect; it no longer selects anything',
    seedsOutsideFormerRestriction: counted(rows, r => !(r.pairClass === 'follow' || r.pairClass === 'equal'), frame, allowed),
    T_frame_fullFrame: m.metrics.T_frame,
    T_frame_formerRestriction: metric(pb.regular, (r) => SCORES.steering(r.pattern), frame, allowed, { stratum: 'former-V6-regular', name: 'T_frame over seeds the former restriction kept' }),
    ...(complete ? { firstEdgeContrast_fullFrame: outcome.firstEdgeContrast_GOODminusBAD,
      firstEdgeContrast_formerRestriction: metric(pb.regular, outcomeScores.dR, frame, allowed, { stratum: 'former-V6-regular', name: 'first-edge contrast over seeds the former restriction kept' }) } : {}),
  };

  const sel = m.metrics[primary];
  const body = {
    schema: 'mcf1.analysis/2',
    design: { sampling: 'Option C: census of the complete-cluster frame', approvals: APPROVALS, contents: DESIGN.contents, twins: DESIGN.twins },
    inference: { performed: false, reason: 'census of a frozen finite frame: every number is an exact frame property; no test, p-value, interval, threshold or generalisation is produced' },
    practicalThreshold: APPROVALS.practicalThreshold.value,
    provenance: { validityManifestSha256: vManifest.sha256, outcomeManifestSha256: oManifest ? oManifest.sha256 : null, admission: admissionSummary, qualification: qualificationSummary },
    frame, reconciliation, exclusions,
    selector: { requested: primary, ledger: APPROVALS.primaryDescriptive.value, onLedger },
    interpretation: { allowed, minimumValidFrame: min, frameSize: frame.size, frameKind: frame.kind, reason },
    primaryDescriptive: { name: primary, formula: METRIC_DEFS[primary].formula, value: allowed ? sel.value : null, sum: sel.sum, n: sel.n, frameN: sel.frameN, frameSha256: frame.sha256,
      status: allowed ? 'LEDGER_PRIMARY' : (!onLedger ? 'NON_LEDGER_SELECTION_TEST_ONLY' : (!complete ? 'PRE_OUTCOME_SNAPSHOT' : 'WITHHELD_BELOW_MINIMUM_FRAME')),
      withheld: allowed ? null : reason },
    metrics: m.metrics, executionRates: m.executionRates, executedPatterns: m.executedPatterns,
    pairClasses: pb.out, previousV6Restriction: regularMetrics,
    firstEdgeOutcome: outcome,
    exploration: explorationBlock(rows, frame, allowed, complete),
    claims: { permitted: allowed ? CLAIMS.permitted : [], prohibited: CLAIMS.prohibited, refused: allowed ? null : reason },
  };
  return { ...body, sha256: sha256(canonicalJson(body)) };
}

/**
 * Consistency refusal.  An analysis is accepted only if its hash matches its body, its frame is intact, and EVERY
 * reported metric carries that frame's hash and size (and, unless it is a labelled stratum, the frame denominator).
 */
export function verifyAnalysis(a) {
  if (!a || typeof a !== 'object') refuse('no analysis supplied');
  const { sha256: h, ...body } = a;
  if (typeof h !== 'string' || h !== sha256(canonicalJson(body))) refuse('the analysis hash does not match its body');
  if (!a.frame || !frameIntact(a.frame)) refuse('the frame hash is missing or does not match the frame body');
  const bad = [];
  const walk = (o, p) => {
    if (!o || typeof o !== 'object') return;
    if (!Array.isArray(o) && ('value' in o || 'count' in o || 'frameSha256' in o)) {
      const isStratum = typeof o.stratum === 'string';
      if (typeof o.frameSha256 !== 'string') bad.push(`${p}: no frame hash`);
      else if (o.frameSha256 !== a.frame.sha256) bad.push(`${p}: frame hash differs`);
      else if (o.frameN !== a.frame.size) bad.push(`${p}: frame size differs`);
      else if (!isStratum && ('value' in o || 'count' in o) && (o.n !== undefined ? o.n : o.of) !== a.frame.size) bad.push(`${p}: denominator differs from the frame`);
    }
    for (const [k, v] of Object.entries(o)) walk(v, `${p}.${k}`);
  };
  for (const sec of ['metrics', 'executionRates', 'pairClasses', 'previousV6Restriction', 'firstEdgeOutcome', 'exploration']) walk(a[sec], sec);
  if (a.primaryDescriptive && a.primaryDescriptive.frameSha256 !== a.frame.sha256) bad.push('primaryDescriptive: frame hash differs');
  if (!a.metrics || Object.keys(a.metrics).length === 0) bad.push('no metrics');
  if (bad.length) refuse(`inconsistent frame: ${bad.slice(0, 5).join('; ')}`);
  return true;
}
