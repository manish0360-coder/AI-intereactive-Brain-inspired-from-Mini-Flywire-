// M12 part 2: the 18 stored M11 traces (labels 0-2, every family, both arms). Step-level, so it can show routes,
// failed moves and re-use for BOTH agents, which the rows cannot. Nothing is run; it reads m11_result.json only.
// Conventions: an edge is undirected `${min}-${max}` in the app's neuron ids; a change-phase episode starts at S and
// ends on arrival at G (no episode was capped); episode i of the change phase belongs to event floor(i / 20), blocked
// if i % 20 < 10, else after. Step counts per window are checked against the stored rows.
// Usage: node experiments/m12_mechanism/analysis/traces.mjs
import fs from 'node:fs';
import path from 'node:path';
const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const ROOT = path.resolve(here, '..', '..', '..');
const j = JSON.parse(fs.readFileSync(path.join(ROOT, 'experiments/m11_routes/results/m11_result.json')));
const key = (a, b) => (a < b ? `${a}-${b}` : `${b}-${a}`);
const fails = [];
const check = (c, m) => { if (!c) fails.push(m); };
const sum = (xs) => xs.reduce((a, b) => a + b, 0);

function analyseArm(tr, row) {
  const C = row.secondary.compute.decisions - row.metric;
  const steps = tr.steps.filter((s) => s[0] >= C);
  const goal = tr.goal, start = tr.start;
  const episodes = [];
  let cur = [];
  for (const s of steps) { cur.push(s); if (s[3] === 1 && s[2] === goal) { episodes.push(cur); cur = []; } }
  check(cur.length === 0 && episodes.length === 120, `${tr.world} ${tr.family} ${tr.arm}: ${episodes.length} episodes, ${cur.length} trailing steps`);
  check(episodes.every((e) => e[0][1] === start), `${tr.world} ${tr.family} ${tr.arm}: an episode not starting at S`);
  const win = [];
  for (let k = 0; k < 6; k++) for (const part of ['blocked', 'after']) {
    const eps = episodes.slice(k * 20 + (part === 'after' ? 10 : 0), k * 20 + (part === 'after' ? 20 : 10));
    const all = eps.flat();
    const w = {
      k, part, steps: all.length, from: all[0][0], to: all[all.length - 1][0] + 1,
      moves: all.filter((s) => s[3] === 1).length, blockedFails: all.filter((s) => s[4] === 1).length, chanceFails: all.filter((s) => s[3] === 0 && s[4] === 0).length,
      routes: eps.map((e) => [start, ...e.filter((s) => s[3] === 1).map((s) => s[2])].join('>')),
    };
    win.push(w);
    check(w.steps === row.events[k][part], `${tr.world} ${tr.family} ${tr.arm}: window ${k} ${part} steps ${w.steps} vs row ${row.events[k][part]}`);
  }
  return { C, steps, episodes, win };
}

const pairs = [];
for (const w of ['mfw|m11|0', 'mfw|m11|1', 'mfw|m11|2']) for (const f of ['RARE', 'HALF', 'OFTEN']) {
  const tb = j.traces.find((t) => t.world === w && t.family === f && t.arm === 'BELIEF');
  const tm = j.traces.find((t) => t.world === w && t.family === f && t.arm === 'MBVI3');
  const rb = j.rows.find((r) => r.world === w && r.family === f && r.arm === 'BELIEF');
  const rm = j.rows.find((r) => r.world === w && r.family === f && r.arm === 'MBVI3');
  const A = { B: analyseArm(tb, rb), M: analyseArm(tm, rm) };
  const sched = tb.schedule.map((e, k) => ({ k, key: key(...e.edge), reverses: e.reverses }));

  // first divergence (whole run) and what BELIEF did there
  let div = null;
  for (let i = 0; i < Math.min(tb.steps.length, tm.steps.length); i++) {
    const b = tb.steps[i], m = tm.steps[i];
    if (b[1] !== m[1] || b[2] !== m[2]) { div = { t: b[0], at: b[1], beliefTo: b[2], mbvi3To: m[2], beliefMoved: b[3], beliefBlocked: b[4], beliefP: b[5], mbvi3P: m[5] }; break; }
  }
  const opens = (tb.beliefEvents ?? []).filter((e) => e.type === 'open');
  const confirms = (tb.beliefEvents ?? []).filter((e) => e.type === 'confirm');
  if (div) {
    const openAt = (t) => { const s = new Set(); for (const e of tb.beliefEvents) { if (e.t >= t) break; const id = `${e.edge[0]}>${e.edge[1]}`; if (e.type === 'open') s.add(id); else s.delete(id); } return s; };
    const archived = openAt(div.t);
    div.beliefExitArchived = archived.has(`${div.at}>${div.beliefTo}`);
    div.archivedAtDivergence = [...archived];
    const last = opens.filter((e) => e.t < div.t).pop();
    div.lastOpenBefore = last ? { t: last.t, edge: last.edge, lag: div.t - last.t } : null;
    // MBVI3's prediction for BELIEF's chosen exit, if MBVI3's recorder followed that exit
    const fm = tm.followed.find((x) => x.from === div.at && x.to === div.beliefTo);
    const pm = fm ? fm.points.filter((p) => p[0] <= div.t).pop() : null;
    div.mbvi3PForBeliefExit = pm ? pm[1] : null;
  }

  // archives: real or false, and re-use of the archived edge by each arm
  const spansOf = (row) => { const C = row.secondary.compute.decisions - row.metric; let t = C; return row.events.map((e, k) => { const s = { k, blockAt: t, afterAt: t + e.blocked, endAt: t + e.blocked + e.after }; t = s.endAt; return s; }); };
  const SB = spansOf(rb), SM = spansOf(rm);
  const crossings = (steps, ekey, from, to) => steps.filter((s) => s[0] >= from && s[0] < to && s[3] === 1 && key(s[1], s[2]) === ekey).length;
  const archives = opens.map((o) => {
    const ek = key(...o.edge);
    const ev = sched.find((e) => e.key === ek && SB[e.k].blockAt <= o.t && o.t < (e.reverses ? SB[e.k].afterAt : Infinity));
    const conf = confirms.find((c) => c.t > o.t && c.edge[0] === o.edge[0] && c.edge[1] === o.edge[1]);
    const res = { t: o.t, edge: o.edge, real: !!ev, event: ev ? ev.k + 1 : null, reverses: ev ? ev.reverses : null, confirmedAt: conf ? conf.t : null };
    if (ev && ev.reverses) {
      const k = ev.k;
      res.belief = { ownAfter: crossings(tb.steps, ek, SB[k].afterAt, SB[k].endAt), later: crossings(tb.steps, ek, SB[k].endAt, Infinity), firstAfterReopen: tb.steps.find((s) => s[0] >= SB[k].afterAt && s[3] === 1 && key(s[1], s[2]) === ek)?.[0] ?? null, reopenAt: SB[k].afterAt };
      res.mbvi3 = { ownAfter: crossings(tm.steps, ek, SM[k].afterAt, SM[k].endAt), later: crossings(tm.steps, ek, SM[k].endAt, Infinity), firstAfterReopen: tm.steps.find((s) => s[0] >= SM[k].afterAt && s[3] === 1 && key(s[1], s[2]) === ek)?.[0] ?? null, reopenAt: SM[k].afterAt };
    } else if (!ev) {
      res.belief = { before: crossings(tb.steps, ek, A.B.C, o.t), after: crossings(tb.steps, ek, o.t, Infinity) };
      res.mbvi3 = { before: crossings(tm.steps, ek, A.M.C, o.t), after: crossings(tm.steps, ek, o.t, Infinity) };
    }
    return res;
  });

  // every reversing event, whether or not BELIEF archived its edge: crossings of the edge by each arm after its
  // reopening, inside that event's own after-window (what M11 counted) and anywhere later in the run
  const reopened = sched.filter((e) => e.reverses).map((e) => ({
    event: e.k + 1, edge: e.key,
    belief: { ownAfter: crossings(tb.steps, e.key, SB[e.k].afterAt, SB[e.k].endAt), later: crossings(tb.steps, e.key, SB[e.k].endAt, Infinity) },
    mbvi3: { ownAfter: crossings(tm.steps, e.key, SM[e.k].afterAt, SM[e.k].endAt), later: crossings(tm.steps, e.key, SM[e.k].endAt, Infinity) },
    triedWhileBlocked: { belief: tb.steps.filter((s) => s[0] >= SB[e.k].blockAt && s[0] < SB[e.k].afterAt && key(s[1], s[2]) === e.key).length, mbvi3: tm.steps.filter((s) => s[0] >= SM[e.k].blockAt && s[0] < SM[e.k].afterAt && key(s[1], s[2]) === e.key).length },
  }));

  // per-window differences (MBVI3 - BELIEF) split into moves, blocked failures, chance failures; route agreement
  const win = A.B.win.map((wb, i) => {
    const wm = A.M.win[i];
    const sameRoutes = wb.routes.filter((r, e) => r === wm.routes[e]).length;
    return { k: wb.k + 1, part: wb.part, reverses: sched[wb.k].reverses, dSteps: wm.steps - wb.steps, dMoves: wm.moves - wb.moves, dBlockedFails: wm.blockedFails - wb.blockedFails, dChanceFails: wm.chanceFails - wb.chanceFails, sameRouteEpisodes: sameRoutes };
  });
  // routes taken most often in the last two events' windows, per arm (persistence of a detour)
  const topRoutes = (arm) => { const c = new Map(); for (const w of A[arm].win.slice(8)) for (const r of w.routes) c.set(r, (c.get(r) ?? 0) + 1); return [...c].sort((a, b) => b[1] - a[1]).slice(0, 2); };
  pairs.push({ world: w, family: f, totalB: rb.metric, totalM: rm.metric, divergence: div, archives, reopened, windows: win, topRoutesLastTwoEvents: { BELIEF: topRoutes('B'), MBVI3: topRoutes('M') } });
}

// ---- aggregates over the 9 pairs ----
const W = pairs.flatMap((p) => p.windows);
const agg = (S) => ({ dSteps: sum(S.map((x) => x.dSteps)), dMoves: sum(S.map((x) => x.dMoves)), dBlockedFails: sum(S.map((x) => x.dBlockedFails)), dChanceFails: sum(S.map((x) => x.dChanceFails)) });
const summary = {
  checksFailed: fails,
  decomposition: { all: agg(W), afterReversed: agg(W.filter((x) => x.part === 'after' && x.reverses)), blocked: agg(W.filter((x) => x.part === 'blocked')) },
  episodesSameRoute: { same: sum(W.map((x) => x.sameRouteEpisodes)), of: W.length * 10 },
  divergences: pairs.map((p) => ({ pair: `${p.world.split('|')[2]} ${p.family}`, ...(p.divergence ? { t: p.divergence.t, beliefExitArchived: p.divergence.beliefExitArchived, beliefMoved: p.divergence.beliefMoved, beliefBlocked: p.divergence.beliefBlocked, beliefP: p.divergence.beliefP, mbvi3PForBeliefExit: p.divergence.mbvi3PForBeliefExit, lagFromLastOpen: p.divergence.lastOpenBefore?.lag ?? null } : { identical: true }) })),
  reversingArchives: pairs.flatMap((p) => p.archives.filter((a) => a.real && a.reverses).map((a) => ({ pair: `${p.world.split('|')[2]} ${p.family}`, event: a.event, edge: a.edge.join('-'), openedAt: a.t, confirmedAt: a.confirmedAt, belief: a.belief, mbvi3: a.mbvi3 }))),
  reopenedEdges: (() => {
    const R = pairs.flatMap((p) => p.reopened);
    const n = (arm, part) => R.filter((r) => r[arm][part] > 0).length;
    return { events: R.length, triedWhileBlocked: { belief: R.filter((r) => r.triedWhileBlocked.belief > 0).length, mbvi3: R.filter((r) => r.triedWhileBlocked.mbvi3 > 0).length }, reusedInOwnAfter: { belief: n('belief', 'ownAfter'), mbvi3: n('mbvi3', 'ownAfter') }, reusedOnlyLater: { belief: R.filter((r) => !r.belief.ownAfter && r.belief.later).length, mbvi3: R.filter((r) => !r.mbvi3.ownAfter && r.mbvi3.later).length }, crossingsTotal: { belief: sum(R.map((r) => r.belief.ownAfter + r.belief.later)), mbvi3: sum(R.map((r) => r.mbvi3.ownAfter + r.mbvi3.later)) } };
  })(),
  permanentArchives: pairs.flatMap((p) => p.archives.filter((a) => a.real && !a.reverses).map((a) => ({ pair: `${p.world.split('|')[2]} ${p.family}`, event: a.event, edge: a.edge.join('-') }))).length,
  falseArchives: pairs.flatMap((p) => p.archives.filter((a) => !a.real).map((a) => ({ pair: `${p.world.split('|')[2]} ${p.family}`, edge: a.edge.join('-'), openedAt: a.t, confirmedAt: a.confirmedAt, belief: a.belief, mbvi3: a.mbvi3 }))),
};
fs.writeFileSync(path.join(here, 'traces.json'), JSON.stringify({ summary, pairs }, null, 1));
console.log(JSON.stringify(summary, null, 1));
console.log(fails.length ? `CHECKS FAILED: ${fails.length}` : 'all trace checks pass');
