// ==========================================================
// AC38 limited feasibility study — evaluation of raw run records against frozen predicates
// ==========================================================
// Pure: reads records and expected.json, runs nothing.  The same code checks the synthetic
// rehearsal and the pinned-tree study.  A row passes only when every predicate holds and every run
// it names completed (or, for a breakage row, refused as declared).
// ==========================================================
import crypto from 'node:crypto';

const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');
const summarise = (list) => { const m = {}; for (const e of list) m[e] = (m[e] || 0) + 1; return Object.fromEntries(Object.entries(m).sort()); };
const ones = (c) => !!c && Object.values(c).every((n) => n === 1);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const rowDiff = (x = {}, y = {}) => Object.keys({ ...x, ...y }).filter((k) => x[k] !== y[k]).sort();

export function kindOf(message) {
  if (/read only property/.test(message)) return 'read_only';
  if (/not extensible/.test(message)) return 'not_extensible';
  if (/Cannot delete/.test(message)) return 'delete';
  return 'other';
}

export function facts(raw, input, cfg) {
  const r = raw?.result ?? {}, w = r.window ?? {}, obs = w.observed ?? null;
  const populated = input.fixture !== 'empty';
  const f = {
    ok: !!raw && raw.code === 0 && !!raw.result && !r.refused && !r.failed && !(raw.residual ?? []).length,
    exitCode: raw?.code ?? null,
    refused: r.refused ?? null,
    failed: r.failed ?? null,
    residual: raw?.residual ?? [],
    call: w.call ?? null,
    seed: r.inputs?.seed ?? null,
    journal: obs ? summarise(obs.inventoryWrites.map((e) => `${e.op} ${e.site} [${e.item}]`)) : null,
    journalItems: obs ? [...new Set(obs.inventoryWrites.map((e) => e.item))].sort() : null,
    journalCount: obs ? obs.inventoryWrites.length : null,
    lets: obs ? summarise(obs.lets.map((l) => `${l.name} ${l.site}`)) : null,
    letCount: obs ? obs.lets.length : null,
    draws: obs ? summarise(obs.draws.map((d) => `${d.stream} ${d.site}`)) : null,
    drawCounts: obs ? { cognitive: obs.draws.filter((d) => d.stream === 'cognitive').length, visual: obs.draws.filter((d) => d.stream === 'visual').length, environment: obs.draws.filter((d) => d.stream === 'environment').length } : null,
    mathRandom: obs ? obs.mathRandom : null,
    tripped: input.mode === 'T' ? (w.tripped ? { site: w.tripped.site, kind: kindOf(w.tripped.message) } : null) : undefined,
    vaultDelta: w.vaultDelta ?? null,
    storeDelta: w.storeDelta ?? null,
    probes: w.probes ?? null,
    canaries: obs ? (ones(w.canaryOpen) && ones(w.canaryClose) && (w.tripCanaryOpen === undefined || (ones(w.tripCanaryOpen) && ones(w.tripCanaryClose)))) : null,
    digestBefore: w.digestBefore?.root ?? null,
    digestAfterPopulation: w.digestAfterPopulation?.root ?? null,
    digestReturn: w.digestReturn?.root ?? null,
    fingerprint: r.fingerprint?.public ?? null,
    fingerprintM7: r.fingerprint?.m7 ?? null,
    mutantFired: w.mutantFired ?? null,
    mutantOutside: r.mutantOutside ?? null,
    deferredFired: r.deferredFired ?? null,
    positions: w.positions ?? null,
    returned: w.returned ?? null,
    leakTest: w.leakTest ?? null,
  };
  f.closedListViolations = w.closedList ? closedListViolations(w, populated, cfg.closedList) : null;
  f.verdict = verdict(f, input);
  return f;
}

export function closedListViolations(w, populated, allowed) {
  const v = new Set();
  if (w.vaultDelta !== (populated ? 1 : 0)) v.add('vault_delta');
  for (const keys of w.closedList.vaultAddedKeys) if (!same(keys, allowed.outgoing)) v.add('vault_entry_keys');
  if (!same(w.closedList.newContextKeys, allowed.fresh)) v.add('new_context_keys');
  return [...v].sort();
}

// One verdict for every observing run.  The clean expectation is the empty list.
export function verdict(f, input) {
  if (f.journalCount === null && f.closedListViolations === null) return null;
  const v = [];
  if (f.journalCount) v.push(input.superset ? 'superset_journal' : 'journal');
  if (f.letCount) v.push('let');
  if (f.drawCounts && (f.drawCounts.cognitive !== 1 || f.drawCounts.visual || f.drawCounts.environment)) v.push('stream');
  if (f.mathRandom) v.push('math_random');
  if (f.closedListViolations && f.closedListViolations.length) v.push('closed_list');
  return v.sort();
}

function check(p, F, R, cfg) {
  const val = (run, fact) => F[run]?.[fact];
  // A refusal counts only if the process exited non-zero and a harness refusal (the "AC38 REFUSED:"
  // marker, from the fixture result or the preload's stderr) carries the declared reason as a literal
  // substring.  A generic crash that happens to quote the reason does not count.
  if (p.refusal) {
    const raw = R[p.refusal];
    const refusals = [raw?.result?.refused ?? '', ...String(raw?.stderr ?? '').split('\n')].filter((m) => m.includes('AC38 REFUSED: '));
    return { ok: !!raw && raw.code !== 0 && refusals.some((m) => m.includes(p.matches)), observed: { exitCode: raw?.code, refusals: refusals.map((m) => m.slice(0, 200)) } };
  }
  if (p.residual) { const got = (R[p.residual]?.residual ?? []).length > 0; return { ok: got === p.eq, observed: R[p.residual]?.residual }; }
  if (p.recovered) {
    const [a, b] = p.recovered.map((l) => F[l]?.positions);
    const d = a && b ? { cognitive: b.cognitive - a.cognitive, visual: b.visual - a.visual, environment: b.environment - a.environment } : null;
    return { ok: same(d, p.eq), observed: d };
  }
  if (p.pairDiff) {
    const [a, b] = p.pairDiff.map((l) => R[l]?.result?.window?.[p.field]?.rows);
    const d = a && b ? rowDiff(a, b) : null;
    return { ok: same(d, p.eq), observed: d };
  }
  if (p.outsideDiff) {
    const [a, b] = p.outsideDiff.map((l) => R[l]?.result?.window?.outsideInventoryReturn?.rows);
    const skip = new Set([...cfg.inventoryKeys, ...cfg.closedListKeys]);
    const d = a && b ? rowDiff(a, b).filter((k) => !skip.has(k)) : null;
    return { ok: same(d, p.eq), observed: d };
  }
  const got = val(p.run, p.fact);
  if ('eq' in p) return { ok: same(got, p.eq), observed: got };
  if ('eqRun' in p) { const other = val(p.eqRun, p.fact); return { ok: got != null && same(got, other), observed: [got, other] }; }
  if ('neqRun' in p) { const other = val(p.neqRun, p.fact); return { ok: got != null && other != null && !same(got, other), observed: [got, other] }; }
  if ('includesAll' in p) return { ok: Array.isArray(got) && p.includesAll.every((x) => got.includes(x)), observed: got };
  if ('subsetOf' in p) return { ok: Array.isArray(got) && got.every((x) => p.subsetOf.includes(x)), observed: got };
  return { ok: false, observed: 'unknown predicate' };
}

export function evaluate(expected, records) {
  const R = Object.fromEntries(records.map((r) => [r.label, r]));
  const inputs = Object.fromEntries(expected.rows.flatMap((row) => row.runs.map((run) => [run.label, run])));
  const F = Object.fromEntries(Object.entries(inputs).map(([l, input]) => [l, facts(R[l], input, expected)]));
  const rows = expected.rows.map((row) => {
    const failures = [];
    for (const run of row.runs) {
      const wantOk = row.role !== 'breakage';
      if (wantOk && !F[run.label].ok) failures.push({ predicate: `${run.label} completed`, observed: { exitCode: F[run.label].exitCode, refused: F[run.label].refused, failed: F[run.label].failed && String(F[run.label].failed).slice(0, 200), residual: F[run.label].residual } });
      if (wantOk && F[run.label].ok && F[run.label].canaries === false) failures.push({ predicate: `${run.label} canaries`, observed: false });
    }
    for (const p of row.predicates) { const c = check(p, F, R, expected); if (!c.ok) failures.push({ predicate: p, observed: c.observed }); }
    return { id: row.id, group: row.group, role: row.role, countsAsDetection: row.countsAsDetection, contract: row.contract, detector: row.detector, pass: failures.length === 0, failures };
  });
  const compact = Object.fromEntries(Object.entries(F).sort(([a], [b]) => (a < b ? -1 : 1)).map(([l, f]) => [l, f]));
  const summary = {
    schema: 'tc2/ac38.feasibility_summary/1',
    status: expected.status,
    profile: expected.profile,
    expectedSha256: sha256(JSON.stringify(expected)),
    rows,
    counts: { rows: rows.length, passed: rows.filter((r) => r.pass).length, failed: rows.filter((r) => !r.pass).length, runs: Object.keys(F).length, recordsMissing: Object.keys(F).filter((l) => !R[l]).length },
    runs: compact,
  };
  summary.allRowsPass = summary.counts.failed === 0 && summary.counts.recordsMissing === 0;
  return summary;
}
