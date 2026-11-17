// M12 part 1b: two controls on the full-row result (reads full_rows.json written by full_rows.mjs).
//  (a) time control: the per-event difference for labels where BELIEF never re-used an archived exit, against labels
//      where it did, at the same event index (later events have more opportunities in every group);
//  (b) dose: the difference by the number of BELIEF re-uses (confirms of any kind) in the run;
//  (c) within-label timing: for labels with a re-use, the summed difference in windows that end before the first
//      re-use, in the window that contains it, and in the windows after it.
// Descriptive only. Means per label are given with a paired percentile bootstrap (pairedBootstrap, 10,000 resamples)
// so that their spread can be read; no threshold is applied.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const ROOT = path.resolve(here, '..', '..', '..');
const { pairedBootstrap } = await import(pathToFileURL(path.join(ROOT, 'cognitive/testbed/stats.mjs')).href);
const o = JSON.parse(fs.readFileSync(path.join(here, 'full_rows.json')));
const sum = (xs) => xs.reduce((a, b) => a + b, 0);
const r2 = (x) => Math.round(x * 100) / 100;
const ci = (xs, lab) => { if (xs.length < 2) return { n: xs.length, mean: xs.length ? xs[0] : null }; const b = pairedBootstrap(xs, `m12|${lab}`); return { n: b.n, mean: r2(b.mean), lo: r2(b.lo), hi: r2(b.hi) }; };
const out = {};
for (const f of ['RARE', 'HALF', 'OFTEN']) {
  const L = o.labels.filter((x) => x.family === f);
  const reuse = (x) => x.confirms.length > 0;
  const R = {};
  for (const [gname, G] of [['all', L], ['neither', L.filter((x) => x.group === 'neither')]]) {
    const noReuse = G.filter((x) => x.opens.length && !reuse(x)), withReuse = G.filter(reuse), noArchive = G.filter((x) => !x.opens.length);
    // (a) per event index, afterReversed and blocked, summed and per label
    const perEvent = (S) => Array.from({ length: 6 }, (_, k) => {
      const ar = S.map((x) => x.windowsRaw.filter((w) => w.k === k && w.part === 'after' && w.reverses).reduce((s, w) => s + w.d, 0));
      const bl = S.map((x) => x.windowsRaw.filter((w) => w.k === k && w.part === 'blocked').reduce((s, w) => s + w.d, 0));
      return { k: k + 1, afterReversed: sum(ar), blocked: sum(bl) };
    });
    R[gname] = {
      labels: { noArchive: noArchive.length, archiveNoReuse: noReuse.length, reuse: withReuse.length },
      afterReversedPerLabel: { archiveNoReuse: ci(noReuse.map((x) => x.dAfterReversed), `${f}|${gname}|noReuse|ar`), reuse: ci(withReuse.map((x) => x.dAfterReversed), `${f}|${gname}|reuse|ar`) },
      totalPerLabel: { archiveNoReuse: ci(noReuse.map((x) => x.dTotal), `${f}|${gname}|noReuse|tot`), reuse: ci(withReuse.map((x) => x.dTotal), `${f}|${gname}|reuse|tot`) },
      signsAfterReversed: { archiveNoReuse: [noReuse.filter((x) => x.dAfterReversed > 0).length, noReuse.filter((x) => x.dAfterReversed < 0).length, noReuse.filter((x) => x.dAfterReversed === 0).length], reuse: [withReuse.filter((x) => x.dAfterReversed > 0).length, withReuse.filter((x) => x.dAfterReversed < 0).length, withReuse.filter((x) => x.dAfterReversed === 0).length] },
      perEvent: { archiveNoReuse: perEvent(noReuse), reuse: perEvent(withReuse) },
      // (b) dose
      dose: [0, 1, 2, 3].map((n) => { const S = G.filter((x) => x.opens.length && (n < 3 ? x.confirms.length === n : x.confirms.length >= 3)); return { reuses: n < 3 ? String(n) : '3+', labels: S.length, afterReversed: sum(S.map((x) => x.dAfterReversed)), total: sum(S.map((x) => x.dTotal)), afterReversedPerLabel: S.length ? r2(sum(S.map((x) => x.dAfterReversed)) / S.length) : null }; }),
      // (c) within-label timing around the first re-use
      aroundFirstReuse: (() => {
        const acc = { before: { afterReversed: 0, total: 0 }, containing: { afterReversed: 0, total: 0 }, after: { afterReversed: 0, total: 0 } };
        for (const x of withReuse) for (const w of x.windowsRaw) {
          const slot = w.endB <= x.firstConfirm ? 'before' : w.startB > x.firstConfirm ? 'after' : 'containing';
          acc[slot].total += w.d; if (w.part === 'after' && w.reverses) acc[slot].afterReversed += w.d;
        }
        return acc;
      })(),
    };
  }
  out[f] = R;
}
const outPath = path.join(here, 'full_rows_controls.json');
fs.writeFileSync(outPath, JSON.stringify(out, null, 1));
for (const f of Object.keys(out)) for (const g of ['all', 'neither']) {
  const R = out[f][g];
  console.log(`== ${f} ${g}: labels ${JSON.stringify(R.labels)}`);
  console.log(`   afterReversed per label: no re-use ${JSON.stringify(R.afterReversedPerLabel.archiveNoReuse)}; re-use ${JSON.stringify(R.afterReversedPerLabel.reuse)}; signs +/-/0 no re-use ${R.signsAfterReversed.archiveNoReuse} re-use ${R.signsAfterReversed.reuse}`);
  console.log(`   total per label:         no re-use ${JSON.stringify(R.totalPerLabel.archiveNoReuse)}; re-use ${JSON.stringify(R.totalPerLabel.reuse)}`);
  console.log(`   per event [k, afterReversed, blocked]: no re-use ${JSON.stringify(R.perEvent.archiveNoReuse.map((e) => [e.k, e.afterReversed, e.blocked]))}`);
  console.log(`                                          re-use    ${JSON.stringify(R.perEvent.reuse.map((e) => [e.k, e.afterReversed, e.blocked]))}`);
  console.log(`   dose ${JSON.stringify(R.dose)}`);
  console.log(`   around the first re-use ${JSON.stringify(R.aroundFirstReuse)}`);
}
