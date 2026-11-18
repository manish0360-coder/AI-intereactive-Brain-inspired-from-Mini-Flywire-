// M14 pre-freeze audit probe (scratch only). Labels m14schema|audit|0..N-1, which the gate refuses. It prints
// mechanism statistics only (link coverage, schema margins, ties, schema decisions, value checks, control
// equivalences), never a first-episode step outcome or a contrast between arms.
// Usage: node prefreeze_probe.mjs <repo root> [N]
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const R = process.argv[2], N = Number(process.argv[3] ?? 100);
const imp = (p) => import(pathToFileURL(path.join(R, p)).href);
const L = await imp('experiments/m14_schema/m14_lib.mjs');
const { KINDS, SIGMA, conjugate, runWorld } = await imp('cognitive/testbed/task_e6.mjs');
const { makeKindSchema, fixedSchema, loopErase } = await imp('cognitive/mind/schema/kind_schema.mjs');
const { makeSchemaAgent } = await imp('cognitive/mind/schema/agent.mjs');
const { makeAdoptedAgent, ADOPTED_AGENT } = await imp('cognitive/testbed/adopted_agent.mjs');
const { makeStream } = await imp('cognitive/testbed/rng.mjs');
const { qValues } = await imp('cognitive/core/planner.mjs');
const { VOL_DEFAULTS } = await imp('cognitive/mind/v6/agent.mjs');
const E6 = L.E6, sigmaKey = JSON.stringify(SIGMA);
const tbl = (snap) => snap.avail.map((row, k) => row.map((a, j) => (snap.chosen[k][j] + 1) / (a + 2)));

// an instrumented agent: logs, per decision, whether the schema narrowed a tie, the tie set, the chosen action, and
// whether the chosen action has the maximal value (recomputed from the agent's own model and values)
function instrument(agent) {
  const log = [];
  return {
    log,
    agent: {
      act(obs) {
        const s0 = agent.inspect().schemaStats ?? null;
        const a = agent.act(obs);
        const s1 = agent.inspect().schemaStats ?? null;
        const opts = { gamma: VOL_DEFAULTS.gamma, vOpt: VOL_DEFAULTS.vOpt, rewardOf: (s2) => (s2 === obs.goal ? 1 : 0), doneOf: (s2) => (s2 === obs.goal ? 1 : 0) };
        const q = qValues(agent._model, agent._V, obs.node, opts), best = Math.max(...q);
        log.push({ node: obs.node, kind: obs.kind, exitKinds: obs.exitKinds ? [...obs.exitKinds] : null, action: a, tied: q.map((x, i) => (x === best ? i : -1)).filter((i) => i >= 0), maxValued: q[a] === best, narrowed: !!s0 && s1.schemaNarrowed > s0.schemaNarrowed, decided: !!s0 && s1.schemaDecided > s0.schemaDecided });
        return a;
      },
      observe: (tr) => agent.observe(tr),
      inspect: () => agent.inspect(),
    },
  };
}

function train(P, arm) {
  const schema = makeKindSchema(KINDS), worlds = [];
  P.train.forEach((t, k) => {
    const kinds = arm === 'SCHEMA_SHUFFLED' ? t.shuffledKinds : t.kinds;
    const agent = makeSchemaAgent({ rng: makeStream(`${P.trial}|agent|${arm}|train|${k}`), params: { ...ADOPTED_AGENT.params }, schema, learn: true });
    const ep = runWorld({ world: t.world, plan: t.plan, kinds, agent, episodes: E6.trainEpisodes, cap: E6.cap, envLabel: `${t.label}|env` });
    const relation = arm === 'SCHEMA_SHUFFLED' ? conjugate(SIGMA, t.perm) : SIGMA;
    worlds.push({ done: ep.filter((e) => e.done).length, routeEpisodes: ep.filter((e) => e.done && JSON.stringify(loopErase(e.path)) === JSON.stringify(t.plan.route)).length, learned: agent.inspect().schemaStats.learnedEpisodes, relationIsSigma: JSON.stringify(relation) === sigmaKey, links: t.plan.route.slice(0, -1).map((u) => kinds[u]) });
  });
  schema.freeze();
  return { schema, snap: schema.snapshot(), worlds };
}

const agg = { trials: 0, arms: {} };
const A = (arm) => (agg.arms[arm] ??= { learnedEpisodes: [], countedSteps: [], availTotal: [], capped: 0, routeEpisodes: 0, doneEpisodes: 0, worldsNoLearning: 0, relationIsSigma: 0, linksRight: [], missingLink: 0, sigmaNotStrictArgmax: 0, notArgmaxByPrior: 0, minMargin: [], conjugateIsSigma: 0, test: {} });
let snapshotMatches = 0, identityChecks = 0, identityOK = 0;
for (let i = 0; i < N; i++) {
  const P = L.planTrial(`m14schema|audit|${i}`);
  if (P.excluded) continue;
  agg.trials++;
  // CONCRETE first-episode decisions (for the identity-until-narrowing check)
  const conc = instrument(makeAdoptedAgent(null, `${P.trial}|agent|test`));
  runWorld({ world: P.test.world, plan: P.test.plan, kinds: P.test.kinds.COMPOSE, agent: conc.agent, episodes: 1, cap: E6.cap, envLabel: `${P.test.label}|env` });
  for (const arm of ['SCHEMA', 'SCHEMA_SHUFFLED', 'ORACLE_SCHEMA']) {
    const a = A(arm);
    let schema;
    if (arm === 'ORACLE_SCHEMA') schema = fixedSchema(L.ORACLE_TABLE);
    else {
      const t = train(P, arm);
      // the probe's training must reproduce runArm's schema exactly
      const row = L.runArm(P, arm);
      if (JSON.stringify(row.schema.snapshot) === JSON.stringify(t.snap)) snapshotMatches++;
      const T = tbl(t.snap);
      schema = fixedSchema(T);
      a.learnedEpisodes.push(t.snap.episodes); a.countedSteps.push(t.snap.steps); a.availTotal.push(t.snap.avail.flat().reduce((x, y) => x + y, 0));
      for (const w of t.worlds) { a.capped += E6.trainEpisodes - w.done; a.doneEpisodes += w.done; a.routeEpisodes += w.routeEpisodes; if (w.learned === 0) a.worldsNoLearning++; if (w.relationIsSigma) a.conjugateIsSigma++; }
      const rel = L.learnedRelation(schema);
      if (JSON.stringify(rel) === sigmaKey) a.relationIsSigma++;
      a.linksRight.push(rel.filter((j, k) => j === SIGMA[k]).length);
      for (let k = 0; k < KINDS; k++) {
        if (t.snap.chosen[k][SIGMA[k]] === 0) a.missingLink++;
        const others = Array.from({ length: KINDS }, (_, j) => j).filter((j) => j !== SIGMA[k]);
        const m = T[k][SIGMA[k]] - Math.max(...others.map((j) => T[k][j]));
        a.minMargin.push(m);
        if (!(m > 0)) { a.sigmaNotStrictArgmax++; if (others.some((j) => t.snap.avail[k][j] === 0 && T[k][j] >= T[k][SIGMA[k]])) a.notArgmaxByPrior++; }
      }
    }
    for (const c of L.CONDITIONS) {
      const ins = instrument(makeSchemaAgent({ rng: makeStream(`${P.trial}|agent|test`), params: { ...ADOPTED_AGENT.params }, schema, learn: false }));
      const ep = runWorld({ world: P.test.world, plan: P.test.plan, kinds: P.test.kinds[c], agent: ins.agent, episodes: 1, cap: E6.cap, envLabel: `${P.test.label}|env` });
      const s = (a.test[c] ??= { decisions: 0, ties: 0, narrowed: 0, decided: 0, notMaxValued: 0, narrowedAgreesLearned: 0, narrowedAgreesSigma: 0, narrowedWithSigmaTied: 0, routeNodeDecisions: 0, routeNodeTied: 0, routeNodeRouteExitTied: 0, routeNodeSchemaChoseRouteExit: 0, episodesWithNarrowing: 0 });
      const rel = L.learnedRelation(schema);
      const route = P.test.plan.route, world = P.test.world, kinds = P.test.kinds[c];
      let anyNarrow = false;
      for (const d of ins.log) {
        s.decisions++;
        if (d.tied.length > 1) s.ties++;
        if (!d.maxValued) s.notMaxValued++;
        if (d.narrowed) {
          anyNarrow = true; s.narrowed++; if (d.decided) s.decided++;
          const ck = d.exitKinds[d.action];
          if (ck === rel[d.kind]) s.narrowedAgreesLearned++;
          if (d.tied.some((x) => d.exitKinds[x] === SIGMA[d.kind])) { s.narrowedWithSigmaTied++; if (ck === SIGMA[d.kind]) s.narrowedAgreesSigma++; }
        }
        const u = world.nodeOfLabel.get(d.node), ri = route.indexOf(u);
        if (ri >= 0 && ri < route.length - 1) {
          s.routeNodeDecisions++;
          if (d.tied.length > 1) s.routeNodeTied++;
          const routeExit = world.exitOrder[u].indexOf(route[ri + 1]);
          if (d.tied.includes(routeExit)) { s.routeNodeRouteExitTied++; if (d.narrowed && d.action === routeExit) s.routeNodeSchemaChoseRouteExit++; }
        }
      }
      if (anyNarrow) s.episodesWithNarrowing++;
      // identity until the first narrowing: before it, the schema agent takes CONCRETE's exact actions (COMPOSE)
      if (c === 'COMPOSE') {
        identityChecks++;
        const firstN = ins.log.findIndex((d) => d.narrowed);
        const upto = firstN < 0 ? Math.max(ins.log.length, conc.log.length) : firstN;
        let ok = true;
        for (let t = 0; t < upto; t++) if (!ins.log[t] || !conc.log[t] || ins.log[t].action !== conc.log[t].action || ins.log[t].node !== conc.log[t].node) { ok = false; break; }
        if (ok) identityOK++;
        void ep;
      }
    }
  }
}
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
console.log(`audit trials: ${agg.trials} (labels m14schema|audit|0..${N - 1}); probe training reproduces runArm's frozen schema in ${snapshotMatches} of ${2 * agg.trials} trainings`);
for (const [arm, a] of Object.entries(agg.arms)) {
  if (arm !== 'ORACLE_SCHEMA') {
    console.log(`\n${arm} training: learned episodes per trial mean ${mean(a.learnedEpisodes).toFixed(2)} (min ${Math.min(...a.learnedEpisodes)}, max ${Math.max(...a.learnedEpisodes)}); counted path steps mean ${mean(a.countedSteps).toFixed(1)} (min ${Math.min(...a.countedSteps)}); exits counted (avail) mean ${mean(a.availTotal).toFixed(1)}; training episodes capped ${a.capped} of ${agg.trials * 30}; training worlds with no learned episode ${a.worldsNoLearning}; successful episodes whose loop-erased path is the route ${a.routeEpisodes} of ${a.doneEpisodes}`);
    console.log(`  learned relation = SIGMA in ${a.relationIsSigma} of ${agg.trials} trials; links right per trial mean ${mean(a.linksRight).toFixed(2)}; SIGMA links never chosen in training (missing) ${a.missingLink} of ${4 * agg.trials}; SIGMA link not the strict argmax ${a.sigmaNotStrictArgmax} of ${4 * agg.trials} (of which an unobserved pair at the 0.5 prior ties or beats it: ${a.notArgmaxByPrior}); smallest score margin of a SIGMA link over its rivals ${Math.min(...a.minMargin).toFixed(3)} (mean ${mean(a.minMargin).toFixed(3)})${arm === 'SCHEMA_SHUFFLED' ? `; training worlds whose renamed relation happens to equal SIGMA ${a.conjugateIsSigma} of ${agg.trials * 6}` : ''}`);
  }
  for (const [c, s] of Object.entries(a.test)) console.log(`  ${arm} test ${c}, first episode: decisions ${s.decisions}, tied ${s.ties} (${(100 * s.ties / s.decisions).toFixed(1)}%), schema narrowed ${s.narrowed} (${(100 * s.narrowed / s.decisions).toFixed(1)}% of decisions), decided alone ${s.decided}; chosen exit not max-valued ${s.notMaxValued}; narrowed choice = learned relation ${s.narrowedAgreesLearned} of ${s.narrowed}; with a SIGMA exit tied, chose it ${s.narrowedAgreesSigma} of ${s.narrowedWithSigmaTied}; route-node decisions ${s.routeNodeDecisions}, route exit tied ${s.routeNodeRouteExitTied}, schema chose the route exit ${s.routeNodeSchemaChoseRouteExit}; episodes with any narrowing ${s.episodesWithNarrowing} of ${agg.trials}`);
}
console.log(`\nidentity until the first schema narrowing (SCHEMA vs CONCRETE, same stream, COMPOSE first episode): ${identityOK} of ${identityChecks}`);
