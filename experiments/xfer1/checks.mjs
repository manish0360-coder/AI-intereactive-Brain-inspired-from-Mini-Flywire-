// ==========================================================
// XFER-1 — integrity checks (pure functions; each returns an array of problem strings, empty when sound)
// ==========================================================
// Used by verify_xfer1.mjs both on real records and on deliberately broken fixtures (anti-vacuity), so a check that
// cannot fail is detected.
// ==========================================================
import { COMPONENTS, ARMS, blockOf, seedOk, SEED_BASE, SEED_LIMIT } from './config.mjs';

/**
 * delivery fidelity of ONE test session record: every kept component must reach the runtime bit-for-bit, and every
 * omitted component must be empty at the first agent call.
 */
export function deliveryProblems(rec) {
  const p = [];
  const arm = ARMS[rec.input.arm];
  if (!arm) return [`unknown arm ${rec.input.arm}`];
  const keep = arm.keep, d = rec.brain.deliveredHashes, s = rec.brain.start;
  if (arm.source === 'none') {
    if (rec.brain.deliveredHash !== 'none') p.push('a cold arm delivered a brain');
    for (const c of COMPONENTS) if (s.sizes[c] !== 0) p.push(`cold arm started with a non-empty ${c}`);
    return p;
  }
  if (!d) return ['no delivered hashes recorded'];
  for (const c of COMPONENTS) {
    if (keep.includes(c)) {
      if (d[c] === 'absent') p.push(`kept component ${c} was not delivered`);
      else if (d[c] !== s.hashes[c]) p.push(`kept component ${c} differs at the first agent call (restore is not exact)`);
    } else {
      if (d[c] !== 'absent') p.push(`omitted component ${c} was delivered`);
      if (s.sizes[c] !== 0) p.push(`omitted component ${c} is not empty at the first agent call (${s.sizes[c]})`);
    }
  }
  return p;
}

/**
 * provenance of a delivered brain: every kept component must hash exactly like the END state of the training session
 * of the world the record names (`brainWorld`).  trainByWorld: Map world -> training session record.
 */
export function provenanceProblems(rec, trainByWorld) {
  const arm = ARMS[rec.input.arm];
  if (!arm || arm.source === 'none') return [];
  const t = trainByWorld.get(rec.input.brainWorld);
  if (!t) return [`no training record for brain world ${rec.input.brainWorld}`];
  const p = [];
  if (t.input.goal !== rec.input.goal && arm.source === 'donor') p.push('donor brain comes from a world with another goal');
  for (const c of arm.keep) if (rec.brain.deliveredHashes[c] !== t.brain.endHashes[c]) p.push(`delivered ${c} is not the end state of training world ${rec.input.brainWorld}`);
  return p;
}

/** restore -> re-serialize identity for a full brain: the serializer mirror must reproduce what was delivered */
export function roundtripProblems(rec) {
  const p = [];
  if (ARMS[rec.input.arm].keep.length !== COMPONENTS.length) return ['roundtrip is defined for a full-brain arm'];
  if (rec.brain.start.brainHash !== rec.brain.deliveredHash) p.push('re-serialized brain differs from the delivered brain');
  return p;
}

/** structural soundness of a world plan */
export function planProblems(plan) {
  const p = [];
  const seen = new Set();
  for (const w of plan) {
    if (blockOf(w.world) === null) p.push(`world ${w.world} is outside both blocks`);
    if (w.donor !== null) {
      const d = plan[w.donor];
      if (!d) p.push(`world ${w.world}: donor ${w.donor} does not exist`);
      else {
        if (w.donor === w.world) p.push(`world ${w.world}: donor is the world itself`);
        if (d.goal !== w.goal) p.push(`world ${w.world}: donor has a different goal`);
        if (d.block !== w.block) p.push(`world ${w.world}: donor is in another block`);
        if (d.configSeed === w.configSeed) p.push(`world ${w.world}: donor has the same configuration`);
      }
    }
    for (const s of [w.trainSeed, w.testSeed]) {
      if (!seedOk(s).ok) p.push(`world ${w.world}: seed ${s} is outside the domain`);
      if (seen.has(s)) p.push(`seed ${s} is used twice`);
      seen.add(s);
    }
    if (w.trainSeed === w.testSeed) p.push(`world ${w.world}: train and test seeds are equal`);
  }
  if (plan.length && (Math.min(...seen) < SEED_BASE || Math.max(...seen) > SEED_LIMIT)) p.push('a seed lies outside the declared domain');
  return p;
}

/** paired-design soundness of a run: every world has every arm exactly once, all arms of a world share seed and config */
export function pairingProblems(tests, arms) {
  const p = [];
  const byWorld = new Map();
  for (const r of tests) { const k = r.input.world; if (!byWorld.has(k)) byWorld.set(k, []); byWorld.get(k).push(r); }
  for (const [w, rs] of byWorld) {
    const names = rs.map(r => r.input.arm).sort();
    if (new Set(names).size !== names.length) p.push(`world ${w}: an arm occurs more than once`);
    for (const a of arms) if (!names.includes(a)) p.push(`world ${w}: arm ${a} is missing`);
    const seeds = new Set(rs.map(r => r.input.agentSeed)), cfgs = new Set(rs.map(r => r.input.acceptedConfigSeed)), ticks = new Set(rs.map(r => r.input.ticks));
    if (seeds.size !== 1) p.push(`world ${w}: arms do not share the test seed`);
    if (cfgs.size !== 1) p.push(`world ${w}: arms do not share the configuration`);
    if (ticks.size !== 1) p.push(`world ${w}: arms differ in session length`);
    for (const r of rs) {
      const a = ARMS[r.input.arm];
      if (a.source === 'own' && r.input.brainWorld !== w) p.push(`world ${w}: arm ${r.input.arm} received another world's brain`);
      if (a.source === 'donor' && r.input.brainWorld === w) p.push(`world ${w}: arm ${r.input.arm} received its own brain`);
      if (r.outcome.crashed || !r.outcome.completed) p.push(`world ${w}: arm ${r.input.arm} did not complete`);
      if (r.h1r.drawFaults !== 0 || r.h1r.blockedIllegal !== 0) p.push(`world ${w}: arm ${r.input.arm} has instrument faults`);
    }
  }
  return p;
}
