// ==========================================================
// M16 design calculation (PROPOSAL stage; not an experiment, not a gate). Written 2026-11-21.
// ==========================================================
// Question for the proposal: when one agent carries both validated pieces, the within-world change belief (AD-13: world
// model v6, rho = 1/2, h = 0.01) and the across-world relational belief (M15: BOCPD h = 0.01, alpha = 1/2, used only to
// break exact planner ties), do the two interact at all, and where? If they act in disjoint situations, an
// "integration" gate would be settled before it runs.
//
// Everything is reused unchanged: task E7's sequences (planSequence: 12 warm-up + 16 evaluation signposted worlds per
// label), M14's tie-break agent (makeSchemaAgent, the adopted agent's loop), M15's belief (makeBeliefSet) and its
// observation unit (first occurrence on the loop-erased path). Ablations need no new mechanism code:
//   change belief off = rhoFixed 0 (v6 then plans with v3's prediction alone, i.e. MBVI3's model);
//   relational belief off = no schema (the adopted agent's own tie-break).
// One PROTOTYPE rule is added for the calculation only (EXPLAIN, section C below); it is not proposed code.
//
// Labels m16int|design|0..N-1 (this namespace is barred from any later M16 development or gate run).
//   node experiments/m16_integration/proposal_inputs/m16_design_calc.mjs 40 > experiments/m16_integration/proposal_inputs/m16_design_calc.out
// ==========================================================
import { makeStream, randInt } from '../../../cognitive/testbed/rng.mjs';
import { GraphEnv } from '../../../cognitive/testbed/env.mjs';
import { distancesTo, edgeKey } from '../../../cognitive/testbed/worlds.mjs';
import { runEpisode } from '../../../cognitive/testbed/runner.mjs';
import { SignpostEnv } from '../../../cognitive/testbed/task_e6.mjs';
import { E7, KINDS, SIGMA, SIGMA_INV, planSequence } from '../../../cognitive/testbed/task_e7.mjs';
import { makeSchemaAgent } from '../../../cognitive/mind/schema/agent.mjs';
import { makeBeliefSet, loopErase, uniqueMode } from '../../../cognitive/mind/relation_belief/belief.mjs';

// argv: N labels; open episodes before the block (default 3); 'event' runs only the four EVENT arms (variant A6).
const N = Number(process.argv[2] ?? 40);
const EVENT_ONLY = process.argv[4] === 'event';
const D = Object.freeze({ open: Number(process.argv[3] ?? 3), blocked: 5, after: 5, families: { RARE: 0.1, OFTEN: 0.9 }, preblockShare: 0.5, cap: E7.cap });
const BELIEF = Object.freeze({ rule: 'BOCPD', h: 0.01, alpha: 0.5 });

/** The route edge to block in world `wl`: uniform over route edges whose removal keeps the goal reachable. */
function blockEdge(entry) {
  const { world, plan } = entry, r = plan.route, ok = [];
  for (let i = 0; i + 1 < r.length; i++) if (distancesTo(world, plan.goal, new Set([edgeKey(r[i], r[i + 1])]))[plan.start] >= 0) ok.push(i);
  if (!ok.length) return null;
  const i = ok[randInt(ok.length, makeStream(`${entry.label}|m16|edge`))];
  return { i, u: r[i], v: r[i + 1] };
}

/**
 * One arm in one condition for one label. cfg: { rho, belief, perEpisode, explain, mode: 'EVENT' | 'PREBLOCK',
 * family, reversed }. Returns step windows and the belief's bookkeeping (evaluation only).
 */
function runArm(seq, condName, cfg) {
  const b = cfg.belief ? makeBeliefSet(BELIEF, KINDS) : null;
  const out = { FIRST: 0, OPEN: 0, BLOCKED: 0, AFTER: 0, AFTER_REV: 0, AFTER_PERM: 0, capped: 0, pTrue: 0, mapErr: 0, points: 0,
    absorbed: 0, absorbedWrong: 0, droppedWrong: 0, droppedRight: 0, firstBlockedWorlds: 0, firstBlockedSteps: 0, firstCleanSteps: 0, firstCleanWorlds: 0,
    blockWorlds: 0, archiveWorlds: 0, confirmWorlds: 0, usesBefore: 0, openSteps: [], usesBeforeByWorld: [] };
  seq.worlds.forEach((entry, t) => {
    const stage = t < E7.warmup ? 'warmup' : 'eval', e = t - E7.warmup;
    const post = cfg.reversed && stage === 'eval' && e >= seq.s;
    const kinds = post ? entry.reversed : entry.exact;
    const truth = (k) => (post ? SIGMA_INV[k] : SIGMA[k]);
    if (b && stage === 'eval') {                                   // belief at the start of an evaluation world
      for (let k = 0; k < KINDS; k++) { const p = b.predictive(k); out.pTrue += p[truth(k)]; out.mapErr += uniqueMode(p) === truth(k) ? 0 : 1; out.points++; }
    }
    // schedule
    let episodes = 1, blockAt = null, reopenAt = null, reverses = null, edge = null;
    if (stage === 'eval') {
      edge = blockEdge(entry);
      if (cfg.mode === 'EVENT') {
        episodes = D.open + D.blocked + D.after;
        if (edge) { blockAt = D.open; reverses = makeStream(`${entry.label}|m16|${cfg.family}|verdict`)() < D.families[cfg.family]; reopenAt = reverses ? D.open + D.blocked : null; }
      } else {
        episodes = D.open;
        if (edge && makeStream(`${entry.label}|m16|preblock`)() < D.preblockShare) blockAt = 0;
      }
    }
    // the agent: M14's tie-break loop on world model v6, with a belief adapter (M15's beliefAsSchema, plus the gates)
    const gate = { open: true };
    const explained = new Set();
    let mapAtStart = null, newEpisode = true;
    const schema = b && {
      nKinds: KINDS, learnable: true,
      score: (k, j) => b.predictive(k)[j],
      learnEpisode(visits) {
        if (!gate.open) return;
        const kindOf = new Map(visits.map((v) => [v.node, v.kind]));
        const path = loopErase(visits.map((v) => v.node));
        const first = new Array(KINDS).fill(null);
        for (let i = 0; i + 1 < path.length; i++) { const k = kindOf.get(path[i]); if (first[k] === null) first[k] = [kindOf.get(path[i + 1]), path[i]]; }
        for (let k = 0; k < KINDS; k++) {
          if (!first[k]) continue;
          const [y, node] = first[k], wrong = y !== truth(k);
          if (cfg.explain && explained.has(node)) { if (wrong) out.droppedWrong++; else out.droppedRight++; continue; }
          b.observe(k, y); out.absorbed++; if (wrong) out.absorbedWrong++;
        }
        if (!cfg.perEpisode) gate.open = false;                      // M15's unit: one observation per kind per world
      },
    };
    const base = makeSchemaAgent({ rng: makeStream(`${seq.label}|${condName}|agent|${t}`), params: { rhoFixed: cfg.rho }, schema, learn: !!b });
    const agent = {
      act(obs) {
        if (newEpisode) { newEpisode = false; explained.clear(); mapAtStart = b ? Array.from({ length: KINDS }, (_, k) => uniqueMode(b.predictive(k))) : null; }
        return base.act(obs);
      },
      observe(tr) {
        // PROTOTYPE EXPLAIN (calculation only): a failed move on the exit the belief named as the signpost explains the
        // deviation at that node locally; the agent sees the failure itself (it stays where it was).
        if (mapAtStart && tr.next.node === tr.obs.node && tr.obs.exitKinds[tr.action] === mapAtStart[tr.obs.kind]) explained.add(tr.obs.node);
        base.observe(tr);
        if (tr.done || tr.truncated) newEpisode = true;
      },
    };
    const env = new GraphEnv(entry.world, { seedLabel: `${entry.label}|env`, maxSteps: D.cap });
    env.setRewardNode(entry.plan.goal); env.setCue(entry.plan.goal);
    const senv = new SignpostEnv(env, entry.world, kinds);
    for (let ep = 0; ep < episodes; ep++) {
      if (ep === blockAt) env.block(edge.u, edge.v);
      if (ep === reopenAt) env.unblock(edge.u, edge.v);
      const r = runEpisode(senv, agent, { start: entry.plan.start, maxSteps: D.cap });
      if (r.truncated) out.capped++;
      if (stage !== 'eval') continue;
      if (ep === 0) {
        out.FIRST += r.steps;
        if (cfg.mode === 'PREBLOCK') { if (blockAt === 0) { out.firstBlockedWorlds++; out.firstBlockedSteps += r.steps; } else { out.firstCleanWorlds++; out.firstCleanSteps += r.steps; } }
      }
      if (cfg.mode === 'EVENT') {
        if (ep >= 1 && ep < D.open) out.OPEN += r.steps;
        else if (ep >= D.open && ep < D.open + D.blocked) out.BLOCKED += r.steps;
        else if (ep >= D.open + D.blocked) { out.AFTER += r.steps; if (reverses === true) out.AFTER_REV += r.steps; else if (reverses === false) out.AFTER_PERM += r.steps; }
      }
    }
    // diagnostics (evaluation only): did the change belief ever engage in this world, and how well-used was the edge?
    if (stage === 'eval' && cfg.mode === 'EVENT' && edge) {
      const st = base._model.stats();
      const uses = env.trace().filter((row) => row[0] < blockAt && ((row[2] === edge.u && row[4] === edge.v) || (row[2] === edge.v && row[4] === edge.u))).length;
      out.blockWorlds++; out.usesBefore += uses; out.usesBeforeByWorld.push(uses);
      if (st.archivesOpened > 0) out.archiveWorlds++;
      if (st.reversalsConfirmed > 0) out.confirmWorlds++;
    }
  });
  out.pTrue = out.points ? out.pTrue / out.points : null;
  return out;
}

const ARMS_EVENT = { FULL: { rho: 0.5, belief: true }, NO_REL: { rho: 0.5, belief: false }, NO_CHANGE: { rho: 0, belief: true }, NEITHER: { rho: 0, belief: false }, ...(EVENT_ONLY ? {} : { FULL_EP: { rho: 0.5, belief: true, perEpisode: true } }) };
const ARMS_PRE = { FULL: { rho: 0.5, belief: true }, FULL_EXPLAIN: { rho: 0.5, belief: true, explain: true }, NO_REL: { rho: 0.5, belief: false } };
const CONDS = [
  ...Object.keys(D.families).map((f) => ({ name: `EVENT_${f}`, mode: 'EVENT', family: f, reversed: false, arms: ARMS_EVENT })),
  ...(EVENT_ONLY ? [] : [
    { name: 'PREBLOCK_STABLE', mode: 'PREBLOCK', reversed: false, arms: ARMS_PRE },
    { name: 'PREBLOCK_REVERSED', mode: 'PREBLOCK', reversed: true, arms: ARMS_PRE },
  ]),
];

const t0 = Date.now();
const rows = [];
for (let i = 0; i < N; i++) {
  const seq = planSequence(`m16int|design|${i}`);
  if (seq.excluded) { rows.push({ i, excluded: seq.excluded }); continue; }
  const r = { i, s: seq.s };
  for (const c of CONDS) { r[c.name] = {}; for (const [arm, a] of Object.entries(c.arms)) r[c.name][arm] = runArm(seq, c.name, { ...a, mode: c.mode, family: c.family, reversed: c.reversed }); }
  rows.push(r);
}
const live = rows.filter((r) => !r.excluded);

// ---- summaries: label means with percentile bootstrap intervals over labels ----
function boot(xs, name, B = 4000) {
  const n = xs.length, mean = xs.reduce((a, b) => a + b, 0) / n, rnd = makeStream(`m16int|design|boot|${name}`), ms = [];
  for (let b = 0; b < B; b++) { let s = 0; for (let j = 0; j < n; j++) s += xs[randInt(n, rnd)]; ms.push(s / n); }
  ms.sort((a, b) => a - b);
  return `${mean.toFixed(2)} [${ms[Math.floor(0.025 * B)].toFixed(2)}, ${ms[Math.floor(0.975 * B) - 1].toFixed(2)}]`;
}
const f = (x, d = 3) => Number(x).toFixed(d);
const get = (c, a, k) => live.map((r) => r[c][a][k]);
const diff = (c, a1, a2, k) => live.map((r) => r[c][a1][k] - r[c][a2][k]);

console.log(`M16 design calculation: ${live.length} labels (m16int|design|0..${N - 1}), ${rows.length - live.length} excluded, ${((Date.now() - t0) / 1000).toFixed(0)} s`);
console.log(`Per evaluation world (16 per label): EVENT = ${D.open} open + ${D.blocked} blocked + ${D.after} after episodes, a route edge blocked after episode ${D.open}, reopened with p (RARE 0.1, OFTEN 0.9); PREBLOCK = ${D.open} episodes, a route edge blocked from the start in a share ${D.preblockShare} of worlds, never reopened.`);
console.log('Steps are summed over the 16 evaluation worlds of a label; intervals are 95% percentile bootstrap over labels.\n');

console.log('A. Where each piece acts (EVENT conditions; per-world observation unit, as M15)');
for (const c of ['EVENT_RARE', 'EVENT_OFTEN']) {
  console.log(`  ${c}`);
  for (const a of Object.keys(ARMS_EVENT)) console.log(`    ${a.padEnd(10)} FIRST ${f(get(c, a, 'FIRST').reduce((x, y) => x + y, 0) / live.length, 1).padStart(6)}  OPEN ${f(get(c, a, 'OPEN').reduce((x, y) => x + y, 0) / live.length, 1).padStart(6)}  BLOCKED ${f(get(c, a, 'BLOCKED').reduce((x, y) => x + y, 0) / live.length, 1).padStart(7)}  AFTER ${f(get(c, a, 'AFTER').reduce((x, y) => x + y, 0) / live.length, 1).padStart(7)} (reopened ${f(get(c, a, 'AFTER_REV').reduce((x, y) => x + y, 0) / live.length, 1)}, permanent ${f(get(c, a, 'AFTER_PERM').reduce((x, y) => x + y, 0) / live.length, 1)})  capped ${get(c, a, 'capped').reduce((x, y) => x + y, 0)}  P(true) ${a.includes('REL') || a === 'NEITHER' ? '  -   ' : f(get(c, a, 'pTrue').reduce((x, y) => x + y, 0) / live.length)}`);
  const tot = (a) => live.map((r) => ['FIRST', 'OPEN', 'BLOCKED', 'AFTER'].reduce((s, k) => s + r[c][a][k], 0));
  const relNoChange = live.map((r, j) => tot('NEITHER')[j] - tot('NO_CHANGE')[j]), relWithChange = live.map((r, j) => tot('NO_REL')[j] - tot('FULL')[j]);
  console.log(`    relation's benefit, FIRST: without the change belief (NEITHER - NO_CHANGE) ${boot(diff(c, 'NEITHER', 'NO_CHANGE', 'FIRST'), `${c}|relFirst0`)}; with it (NO_REL - FULL) ${boot(diff(c, 'NO_REL', 'FULL', 'FIRST'), `${c}|relFirst1`)}`);
  console.log(`    change belief's benefit, AFTER: without the relation (NEITHER - NO_REL) ${boot(diff(c, 'NEITHER', 'NO_REL', 'AFTER'), `${c}|chg0`)}; with it (NO_CHANGE - FULL) ${boot(diff(c, 'NO_CHANGE', 'FULL', 'AFTER'), `${c}|chg1`)}`);
  console.log(`    change belief's benefit, BLOCKED: without the relation ${boot(diff(c, 'NEITHER', 'NO_REL', 'BLOCKED'), `${c}|chgB0`)}; with it ${boot(diff(c, 'NO_CHANGE', 'FULL', 'BLOCKED'), `${c}|chgB1`)}`);
  console.log(`    interaction on total steps, (NEITHER - NO_CHANGE) - (NO_REL - FULL): ${boot(relNoChange.map((x, j) => x - relWithChange[j]), `${c}|inter`)}`);
  for (const a of ['FULL', 'NO_REL', 'NO_CHANGE', 'NEITHER']) {
    const s = (k) => get(c, a, k).reduce((x, y) => x + y, 0);
    const u = live.flatMap((r) => r[c][a].usesBeforeByWorld);
    console.log(`    ${a.padEnd(10)} block worlds ${s('blockWorlds')}: v6 opened an archive in ${s('archiveWorlds')}, confirmed a reversal in ${s('confirmWorlds')}; uses of the edge before the block: mean ${f(s('usesBefore') / s('blockWorlds'), 2)}, zero in ${u.filter((x) => x === 0).length} worlds`);
  }
  console.log(`    FULL - best single piece on total: vs NO_REL ${boot(live.map((r, j) => tot('FULL')[j] - tot('NO_REL')[j]), `${c}|vsNoRel`)}; vs NO_CHANGE ${boot(live.map((r, j) => tot('FULL')[j] - tot('NO_CHANGE')[j]), `${c}|vsNoChg`)}`);
}

if (!EVENT_ONLY) console.log('\nB. The observation unit matters: the same FULL agent learning from EVERY goal-reaching episode (FULL_EP)');
for (const c of EVENT_ONLY ? [] : ['EVENT_RARE', 'EVENT_OFTEN']) {
  const m = (a, k) => get(c, a, k).reduce((x, y) => x + y, 0) / live.length;
  console.log(`  ${c}: absorbed per label FULL ${f(m('FULL', 'absorbed'), 1)} (wrong ${f(m('FULL', 'absorbedWrong'), 1)}), FULL_EP ${f(m('FULL_EP', 'absorbed'), 1)} (wrong ${f(m('FULL_EP', 'absorbedWrong'), 1)}); P(true) at world start FULL ${f(m('FULL', 'pTrue'))}, FULL_EP ${f(m('FULL_EP', 'pTrue'))}; MAP errors per label FULL ${f(m('FULL', 'mapErr'), 2)}, FULL_EP ${f(m('FULL_EP', 'mapErr'), 2)} (of 64)`);
  console.log(`    FIRST: FULL_EP - FULL ${boot(diff(c, 'FULL_EP', 'FULL', 'FIRST'), `${c}|epFirst`)}; total ${boot(live.map((r) => ['FIRST', 'OPEN', 'BLOCKED', 'AFTER'].reduce((s, k) => s + r[c].FULL_EP[k] - r[c].FULL[k], 0)), `${c}|epTot`)}`);
}

if (!EVENT_ONLY) {
  console.log('\nC. A new world whose signposted route is already broken (PREBLOCK): contamination, and a parameter-free EXPLAIN rule');
  console.log('   EXPLAIN (prototype): do not learn from a node where, in this episode, the exit the belief named as the signpost was tried and did not move.');
}
for (const c of EVENT_ONLY ? [] : ['PREBLOCK_STABLE', 'PREBLOCK_REVERSED']) {
  const m = (a, k) => get(c, a, k).reduce((x, y) => x + y, 0) / live.length;
  console.log(`  ${c}`);
  for (const a of Object.keys(ARMS_PRE)) console.log(`    ${a.padEnd(12)} FIRST ${f(m(a, 'FIRST'), 1).padStart(6)} (blocked worlds ${f(m(a, 'firstBlockedSteps') / Math.max(1e-9, m(a, 'firstBlockedWorlds')), 2)} per world, clean ${f(m(a, 'firstCleanSteps') / Math.max(1e-9, m(a, 'firstCleanWorlds')), 2)})${a === 'NO_REL' ? '' : `  P(true) ${f(m(a, 'pTrue'))}  MAP errors ${f(m(a, 'mapErr'), 2)}/64  absorbed ${f(m(a, 'absorbed'), 1)} (wrong ${f(m(a, 'absorbedWrong'), 2)})  dropped wrong ${f(m(a, 'droppedWrong'), 2)} right ${f(m(a, 'droppedRight'), 2)}`}`);
  console.log(`    FULL - FULL_EXPLAIN, FIRST: ${boot(diff(c, 'FULL', 'FULL_EXPLAIN', 'FIRST'), `${c}|explain`)}; NO_REL - FULL, FIRST: ${boot(diff(c, 'NO_REL', 'FULL', 'FIRST'), `${c}|rel`)}`);
}
console.log('\nWorlds with no admissible route edge to block (their removal would disconnect the goal):');
let noEdge = 0, all = 0;
for (let i = 0; i < N; i++) { const seq = planSequence(`m16int|design|${i}`); if (seq.excluded) continue; for (const w of seq.worlds.slice(E7.warmup)) { all++; if (!blockEdge(w)) noEdge++; } }
console.log(`  ${noEdge} of ${all} evaluation worlds (those worlds run without a block).`);
