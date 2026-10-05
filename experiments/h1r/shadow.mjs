// ==========================================================
// H1-R — candidate records and the pre-clamp shadow (v1.0 §8 link ③; D-020 pin 1; D-019 §5 N6b)
// ==========================================================
// Pure functions over one run's measurement record (measure.mjs `record()`). No agent code runs here except
// `arbitrate`, the pure executive arbitration function of the run's own tree (render/executiveController.js),
// which the caller passes in. Nothing here draws a random number.
//
// Pairing. Every calculateDecisionScore call pushes one (F, t) pair to the score sink (M-SCORE) and is followed by
// exactly one candidate record (M-CANDIDATE; calculateDecisionScore has one caller, inside the candidate loop, and
// nothing between the call and the push returns). Score pair k therefore belongs to candidate record k.
// Every step's candidate loop is followed by exactly one weight sort and one best record (M-BEST), which carries the
// candidate count at the sort, so the candidates of a step are the records between two best records.
//
// argmax₁ (D-020 pin 1): the first key of `choices.sort((a, b) => b.weight - a.weight)` over the candidate-loop
// entries, recomputed here with the same comparator on the recorded weights in insertion order (Array sort is
// stable), and compared with the bestChoice the agent computed.
//
// Shadow weight (v1.0 §8): the delivered T replaced by 0.5 in both the pre-clamp score F and arbitrate's
// confidenceScore. Each changes by −12(T − 0.5) = −t, the recorded trust term. Every other input keeps its A1
// value (the realised drift is inside F; the executive weights, uncertainty and self-loop flag are recorded).
// The ±400 clamp is re-applied, and the 60/40 blend is applied exactly as main.js applies it:
//     w₀ = applied ? clamp(F − t) * 0.60 + arbitrate({… confidenceScore − t …}) * 0.40 : clamp(F − t)
// argmax₀ is the first key of the same stable sort of the shadow weights. A flip is argmax₁ ≠ argmax₀.
// ==========================================================

export const clamp = (x) => Math.max(-400, Math.min(400, x));

// stable descending sort, exactly main.js's comparator; returns the first key or null
export function argmaxKey(entries, weightOf) {
  if (entries.length === 0) return null;
  return entries.map(e => ({ key: e.key, weight: weightOf(e) })).sort((a, b) => b.weight - a.weight)[0].key;
}

const blend = (fw, arbitrate, c, conf) => fw * 0.60 + arbitrate({
  rewardScore: c.arb[0], semanticScore: c.arb[1], confidenceScore: conf, uncertaintyScore: c.unc,
  curiosityScore: c.arb[3], costScore: c.arb[4],
  executiveWeights: { wReward: c.ew[0], wSemantic: c.ew[1], wConfidence: c.ew[2], wUncertainty: c.ew[3], wCuriosity: c.ew[4], wCost: c.ew[5] },
  drift: 0, isSelfLoop: c.self === 1,
}) * 0.40;

/** Joined step-0 candidate groups: [{ call, best, cands: [{ key, F, t, returned, w, applied, arb, unc, ew, self }] }]. */
export function step0Groups(m) {
  const out = [];
  let prev = 0;
  for (const [call, step, key, n] of m.bests) {
    if (step === 0) {
      const cands = [];
      for (let k = prev; k < n; k++) {
        const c = m.candidates[k];
        cands.push({ key: c[2], F: m.score[2 * k], t: m.score[2 * k + 1], returned: c[3], w: c[4], applied: c[5], arb: c[6], unc: c[7], ew: c[8], self: c[9] });
      }
      out.push({ call, best: key, cands });
    }
    prev = n;
  }
  return out;
}

/** Shadow and integrity analysis of one run. `arbitrate` is the run tree's pure arbitration function. */
export function analyzeShadow(m, arbitrate) {
  const r = {
    scoreCalls: m.score.length / 2, candidateRecords: m.candidates.length, pairingOk: m.score.length === 2 * m.candidates.length,
    groups: m.bests.length, groupFaults: 0, argmaxMismatch: 0, step0Groups: 0, step0Candidates: 0, step0GroupsPerCallMax: 0,
    nonFiniteF: 0, nonFiniteT: 0, nonFiniteStep0: 0, clampBinding: 0, clampBindingHigh: 0, clampBindingLow: 0, n6bClampMismatch: 0,
    step0ArgmaxMismatch: 0, reconstructionMismatch: 0, flips: 0, flipCalls: [],
  };
  // every scoring call: finiteness, clamp binding, N6b clamp consistency (Object.is(clamp(F), returned))
  for (let k = 0; k < m.candidates.length; k++) {
    const F = m.score[2 * k], t = m.score[2 * k + 1], returned = m.candidates[k][3];
    if (!Number.isFinite(F)) r.nonFiniteF++;
    if (!Number.isFinite(t)) r.nonFiniteT++;
    if (F > 400) { r.clampBinding++; r.clampBindingHigh++; } else if (F < -400) { r.clampBinding++; r.clampBindingLow++; }
    if (!Object.is(clamp(F), returned)) r.n6bClampMismatch++;
  }
  // every step: the best record closes exactly the candidates of that call and step; argmax₁ recomputed
  let prev = 0;
  const perCall = new Map();
  for (const [call, step, key, n] of m.bests) {
    const cs = m.candidates.slice(prev, n);
    if (n < prev || cs.some(c => c[0] !== call || c[1] !== step)) r.groupFaults++;
    if (!Object.is(argmaxKey(cs.map(c => ({ key: c[2], w: c[4] })), e => e.w), key)) r.argmaxMismatch++;
    if (step === 0) perCall.set(call, (perCall.get(call) || 0) + 1);
    prev = n;
  }
  if (prev !== m.candidates.length) r.groupFaults++;
  r.step0GroupsPerCallMax = Math.max(0, ...perCall.values());
  // step 0: reconstruction of the A1 weight, shadow weight, flip
  for (const g of step0Groups(m)) {
    r.step0Groups++; r.step0Candidates += g.cands.length;
    for (const c of g.cands) {
      const vals = [c.F, c.t, c.returned, c.w, c.unc, ...(c.applied ? [...c.arb, ...c.ew] : [])];
      if (vals.some(v => !Number.isFinite(v))) r.nonFiniteStep0++;
      const w1 = c.applied ? blend(c.returned, arbitrate, c, c.arb[2]) : c.returned;
      if (!Object.is(w1, c.w)) r.reconstructionMismatch++;
      c.w0 = c.applied ? blend(clamp(c.F - c.t), arbitrate, c, c.arb[2] - c.t) : clamp(c.F - c.t);
    }
    const a1 = argmaxKey(g.cands, c => c.w), a0 = argmaxKey(g.cands, c => c.w0);
    if (!Object.is(a1, g.best)) r.step0ArgmaxMismatch++;
    if (!Object.is(a1, a0)) { r.flips++; r.flipCalls.push(g.call); }
  }
  return r;
}
