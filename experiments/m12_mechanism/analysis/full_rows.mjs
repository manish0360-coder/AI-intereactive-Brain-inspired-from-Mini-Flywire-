// M12 — belief-to-behaviour mechanism analysis, part 1: all 810 stored M11 rows.
// Reads experiments/m11_routes/results/m11_result.json only. No agent is built or run.
// The graph's hidden relabelling (mfwWorld) and each label's schedule (planE5) are recomputed from the label, without
// any agent, so that the archive log's (observation label, action) pairs can be named as edges. Both reconstructions
// are checked against what M11 stored: start and goal of every row, the 18 stored schedules, the trace-length
// identity, and the ground-truth alarm counts diagnoseE5 stored for every BELIEF row.
// Usage: node experiments/m12_mechanism/analysis/full_rows.mjs [out.json]
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, appGraph, nodeTable } from '../../m11_routes/m11_lib.mjs';
import { planE5 } from '../../../cognitive/testbed/task_e5.mjs';
import { edgeKey } from '../../../cognitive/testbed/worlds.mjs';

const j = JSON.parse(fs.readFileSync(path.join(ROOT, 'experiments/m11_routes/results/m11_result.json')));
const world = appGraph();
const nodes = nodeTable();
const F = ['RARE', 'HALF', 'OFTEN'];
const EXPLORE = 600;
const fails = [];
const check = (cond, msg) => { if (!cond) fails.push(msg); };
const sum = (xs) => xs.reduce((a, b) => a + b, 0);

// ---- reconstruct every run's time line from its row ----
function timeline(row, plan) {
  const D = row.secondary.compute.decisions;
  const C = D - row.metric;                                   // trace index of the first change-phase step
  const spans = [];
  let t = C;
  plan.events.forEach((e, k) => {
    const ev = row.events[k];
    const blockAt = t, afterAt = t + ev.blocked, endAt = afterAt + ev.after;
    spans.push({ k, key: edgeKey(...e.edge), edge: e.edge, reverses: e.reverses, blockAt, afterAt, endAt });
    t = endAt;
  });
  check(t === D, `${row.world} ${row.family} ${row.arm}: spans end at ${t}, decisions ${D}`);
  check(C - EXPLORE > 0, `${row.world} ${row.family} ${row.arm}: no training steps`);
  return { D, C, spans };
}
const phaseOf = (tl, i) => {
  if (i < EXPLORE) return { phase: 'explore' };
  if (i < tl.C) return { phase: 'train' };
  const sp = tl.spans.find((s) => s.blockAt <= i && i < s.endAt);
  return { phase: i < sp.afterAt ? 'blocked' : 'after', k: sp.k };
};
const keyOfPair = (label, a) => { const u = world.nodeOfLabel.get(label); return edgeKey(u, world.exitOrder[u][a]); };

// ---- per-label analysis ----
const labels = [];
for (const f of F) {
  const B = new Map(), M = new Map();
  for (const r of j.rows) if (r.family === f) (r.arm === 'BELIEF' ? B : M).set(r.world, r);
  for (const [w, b] of B) {
    const m = M.get(w);
    const plan = planE5(world, w, f);
    check(plan.start === b.start && plan.goal === b.goal && plan.start === m.start && plan.goal === m.goal, `${w} ${f}: start/goal reconstruction`);
    check(plan.events.every((e) => !e.skipped), `${w} ${f}: a skipped event`);
    const tr = j.traces.find((t) => t.world === w && t.family === f && t.arm === 'BELIEF');
    if (tr) check(JSON.stringify(tr.schedule) === JSON.stringify(plan.events.map((e) => ({ edge: [nodes[e.edge[0]].id, nodes[e.edge[1]].id], reverses: e.reverses }))), `${w} ${f}: schedule differs from the stored trace schedule`);
    const tb = timeline(b, plan), tm = timeline(m, plan);

    // BELIEF's own archive log, named and classified against ground truth
    const log = b.secondary.volatility.log;
    const open = new Map();
    const opens = [], confirms = [];
    for (const [type, label, a, i] of log) {
      const key = keyOfPair(label, a), id = `${label}|${a}`, ph = phaseOf(tb, i);
      if (type === 'open') {
        const sp = tb.spans.find((s) => s.key === key && s.blockAt <= i && i < (s.reverses ? s.afterAt : Infinity)) ?? null;
        const o = { i, key, id, ph, real: !!sp, ofEvent: sp ? sp.k : null, reversing: sp ? sp.reverses : null };
        opens.push(o); open.set(id, o);
      } else {
        const o = open.get(id);
        check(!!o, `${w} ${f}: confirm without open`);
        open.delete(id);
        // where did the re-use happen? 'ownAfter' = inside the after-window of a reversing event on this same edge,
        // where M11's crossing measure counts it; 'later' = anywhere else (M11 does not count it)
        let where;
        if (!o.real) where = 'falseRepair';
        else if (ph.phase === 'after' && tb.spans[ph.k].key === key && tb.spans[ph.k].reverses) where = 'ownAfter';
        else where = 'later';
        confirms.push({ i, key, ph, where, ofEvent: o.ofEvent, openedAt: o.i, lag: i - o.i });
      }
    }
    const al = b.diagnostics.alarms;
    check(opens.filter((o) => o.real).length === al.opensReal && opens.filter((o) => o.real && o.reversing).length === al.opensRealReversing && opens.filter((o) => !o.real).length === al.opensFalse, `${w} ${f}: open classification differs from diagnoseE5`);
    check(confirms.filter((c) => c.where !== 'falseRepair').length === al.confirmsReal && confirms.filter((c) => c.where === 'falseRepair').length === al.confirmsFalse, `${w} ${f}: confirm classification differs from diagnoseE5`);
    // a real confirm in its own after-window is a crossing that diagnoseE5 also counted
    for (const c of confirms.filter((x) => x.where === 'ownAfter')) check(b.events[c.ph.k].crossed > 0, `${w} ${f}: own-after confirm without a counted crossing`);
    // and conversely: a 'later' re-use is never inside a window where M11 counted a crossing of that edge
    for (const c of confirms.filter((x) => x.where === 'later')) check(!(c.ph.phase === 'after' && tb.spans[c.ph.k].key === c.key), `${w} ${f}: a later re-use inside a counted window`);

    // per-window differences, MBVI3 - BELIEF
    const win = [];
    plan.events.forEach((e, k) => {
      win.push({ k, part: 'blocked', reverses: e.reverses, d: m.events[k].blocked - b.events[k].blocked, startB: tb.spans[k].blockAt, endB: tb.spans[k].afterAt });
      win.push({ k, part: 'after', reverses: e.reverses, d: m.events[k].after - b.events[k].after, startB: tb.spans[k].afterAt, endB: tb.spans[k].endAt });
    });
    const firstOpen = opens.length ? opens[0].i : Infinity;
    const firstConfirm = confirms.length ? confirms[0].i : Infinity;
    // identity check: v6 without an archive predicts exactly as v3, so every window that ENDS before BELIEF's first
    // archive opens must be identical (same steps), and the training phase too
    const trainSame = tb.C === tm.C;
    const preOpenWindowsSame = win.filter((x) => x.endB <= firstOpen).every((x) => x.d === 0);
    check(trainSame || firstOpen < tb.C, `${w} ${f}: training differs although no archive opened in it`);
    check(preOpenWindowsSame, `${w} ${f}: a window before the first archive differs`);

    const crossB = sum(b.events.map((e) => (e.reverses ? e.crossed : 0))), crossM = sum(m.events.map((e) => (e.reverses ? e.crossed : 0)));
    labels.push({
      world: w, family: f,
      group: crossB > 0 && crossM > 0 ? 'both' : crossB > 0 ? 'beliefOnly' : crossM > 0 ? 'mbvi3Only' : 'neither',
      dTotal: m.metric - b.metric, dAfterReversed: m.windows.afterReversed - b.windows.afterReversed, dBlocked: m.windows.blocked - b.windows.blocked, dAfterPermanent: m.windows.afterPermanent - b.windows.afterPermanent,
      trainSame, firstOpen, firstConfirm, changeStart: tb.C,
      opens: opens.map((o) => ({ i: o.i, phase: o.ph.phase, k: o.ph.k ?? null, real: o.real, ofEvent: o.ofEvent, reversing: o.reversing })),
      confirms: confirms.map((c) => ({ i: c.i, phase: c.ph.phase, k: c.ph.k ?? null, where: c.where, ofEvent: c.ofEvent, lag: c.lag })),
      windowsRaw: win.map(({ k, part, reverses, d, startB, endB }) => ({ k, part, reverses, d, startB, endB })),
      modelB: { changesDown: b.secondary.model.changesDown, changesUp: b.secondary.model.changesUp },
      modelM: { changesDown: m.secondary.model.changesDown, changesUp: m.secondary.model.changesUp },
      ownAfterAttempts: { B: sum(b.events.map((e) => e.ownAfterAttempts)), M: sum(m.events.map((e) => e.ownAfterAttempts)) },
      oldPermanentAttempts: { B: sum(b.events.map((e) => e.oldPermanentAttempts)), M: sum(m.events.map((e) => e.oldPermanentAttempts)) },
      futile: { B: b.diagnostics.futileRetests, M: m.diagnostics.futileRetests },
    });
  }
}

// ---- summaries ----
const out = { source: 'experiments/m11_routes/results/m11_result.json', checksFailed: fails, families: {} };
const fmt = (x) => (typeof x === 'number' ? Math.round(x * 100) / 100 : x);
for (const f of F) {
  const L = labels.filter((x) => x.family === f);
  const S = {};
  S.labels = L.length;
  S.noArchive = { labels: L.filter((x) => !x.opens.length).length, nonZeroTotal: L.filter((x) => !x.opens.length && x.dTotal !== 0).length };
  S.trainDiffers = L.filter((x) => !x.trainSame).length;
  // confirm classes over the whole run
  const cls = (x) => {
    const w = new Set(x.confirms.map((c) => c.where));
    if (!x.opens.length) return 'A_noArchive';
    if (!w.size) return 'B_archiveNoReuse';
    if (w.has('ownAfter')) return 'E_ownAfterReuse';
    if (w.has('later') && w.has('falseRepair')) return 'D_lateReuse+falseRepair';
    if (w.has('later')) return 'C1_lateReuseOnly';
    return 'C2_falseRepairOnly';
  };
  for (const g of ['all', 'neither']) {
    const G = g === 'all' ? L : L.filter((x) => x.group === 'neither');
    const by = {};
    for (const x of G) { const c = cls(x); (by[c] ??= { labels: 0, dAfterReversed: 0, dTotal: 0, dBlocked: 0, ties: 0 }); by[c].labels++; by[c].dAfterReversed += x.dAfterReversed; by[c].dTotal += x.dTotal; by[c].dBlocked += x.dBlocked; if (x.dTotal === 0) by[c].ties++; }
    S[`byConfirmClass_${g}`] = Object.fromEntries(Object.entries(by).sort());
    S[`sum_${g}`] = { labels: G.length, dAfterReversed: sum(G.map((x) => x.dAfterReversed)), dTotal: sum(G.map((x) => x.dTotal)) };
    // time split: window differences before vs from BELIEF's first confirm (any type)
    let pre = { afterReversed: 0, total: 0 }, post = { afterReversed: 0, total: 0 };
    for (const x of G) for (const wv of x.windowsRaw) {
      const tgt = wv.endB <= x.firstConfirm ? pre : post;      // windows that end before the first re-use vs the rest
      tgt.total += wv.d; if (wv.part === 'after' && wv.reverses) tgt.afterReversed += wv.d;
    }
    S[`timeSplitFirstReuse_${g}`] = { windowsEndingBeforeFirstReuse: pre, windowsContainingOrAfterFirstReuse: post };
    // by event index
    const byK = Array.from({ length: 6 }, (_, k) => ({ k: k + 1, blocked: 0, afterReversed: 0, afterPermanent: 0 }));
    for (const x of G) for (const wv of x.windowsRaw) { if (wv.part === 'blocked') byK[wv.k].blocked += wv.d; else if (wv.reverses) byK[wv.k].afterReversed += wv.d; else byK[wv.k].afterPermanent += wv.d; }
    S[`byEvent_${g}`] = byK;
  }
  // re-use counts
  const C = L.flatMap((x) => x.confirms);
  S.confirms = { ownAfter: C.filter((c) => c.where === 'ownAfter').length, later: C.filter((c) => c.where === 'later').length, falseRepair: C.filter((c) => c.where === 'falseRepair').length };
  S.laterReuseWhere = Object.fromEntries(['blocked', 'after'].map((p) => [p, C.filter((c) => c.where === 'later' && c.phase === p).length]));
  S.laterReuseLagMedian = (() => { const l = C.filter((c) => c.where === 'later').map((c) => c.lag).sort((a, b) => a - b); return l.length ? l[Math.floor(l.length / 2)] : null; })();
  const O = L.flatMap((x) => x.opens);
  S.opens = { real: O.filter((o) => o.real).length, realReversing: O.filter((o) => o.real && o.reversing).length, false: O.filter((o) => !o.real).length, falseByPhase: Object.fromEntries(['explore', 'train', 'blocked', 'after'].map((p) => [p, O.filter((o) => !o.real && o.phase === p).length])) };
  // detector activity, both arms (same v3 detector)
  const mean = (xs) => sum(xs) / xs.length;
  S.detector = {
    changesDownB: fmt(mean(L.map((x) => x.modelB.changesDown))), changesDownM: fmt(mean(L.map((x) => x.modelM.changesDown))),
    changesUpB: fmt(mean(L.map((x) => x.modelB.changesUp))), changesUpM: fmt(mean(L.map((x) => x.modelM.changesUp))),
    labelsWithChangesUpB: L.filter((x) => x.modelB.changesUp > 0).length, labelsWithChangesUpM: L.filter((x) => x.modelM.changesUp > 0).length,
  };
  S.attempts = {
    ownAfterB: sum(L.map((x) => x.ownAfterAttempts.B)), ownAfterM: sum(L.map((x) => x.ownAfterAttempts.M)),
    oldPermanentB: sum(L.map((x) => x.oldPermanentAttempts.B)), oldPermanentM: sum(L.map((x) => x.oldPermanentAttempts.M)),
    futileB: sum(L.map((x) => x.futile.B)), futileM: sum(L.map((x) => x.futile.M)),
  };
  out.families[f] = S;
}
out.labels = labels;
const outPath = process.argv[2];
if (outPath) fs.writeFileSync(outPath, JSON.stringify(out, null, 1));
const { labels: _drop, ...head } = out;
console.log(JSON.stringify(head, null, 1));
console.log(fails.length ? `CHECKS FAILED: ${fails.length}` : 'all reconstruction checks pass');
