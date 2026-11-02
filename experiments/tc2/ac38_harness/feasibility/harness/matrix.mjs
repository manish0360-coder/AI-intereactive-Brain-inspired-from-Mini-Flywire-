// ==========================================================
// AC38 limited feasibility study — the matrix: controls, mutants, neutrality and breakage rows
// ==========================================================
// buildMatrix(P) turns a profile into rows of runs and predicates.  The pinned profile and the
// synthetic rehearsal profile share it, so the rehearsal checks the same predicate logic.  Every
// expected value is fixed here before any pinned-tree run.
// ==========================================================

const COG1 = { cognitive: 1, visual: 0, environment: 0 };

export function buildMatrix(P) {
  const rows = [];
  const add = (row) => rows.push({ countsAsDetection: false, ...row });
  const S = P.sites;
  const d = (...pairs) => Object.fromEntries(pairs.sort(([a], [b]) => (a < b ? -1 : 1)));
  const OFF = ['bridge_off'];
  const j = (sites) => d(...Object.entries(sites));

  // ---- C-0: the bridge-off reference, and N-0: the mutant hook with no action ----
  for (const r of P.reasons) {
    const L = (m, f) => `C0.${m}.${f}.${r}`;
    const runs = [
      { label: L('J', 'three'), mode: 'J', fixture: 'three', reason: r, variants: OFF, aliasProof: true },
      { label: L('J', 'empty'), mode: 'J', fixture: 'empty', reason: r, variants: OFF, aliasProof: true },
      { label: L('S', 'three'), mode: 'J', superset: true, fixture: 'three', reason: r, variants: OFF },
      { label: L('T', 'three'), mode: 'T', fixture: 'three', reason: r, variants: OFF },
      { label: L('R0', 'three'), mode: 'R0', fixture: 'three', reason: r, variants: OFF },
      { label: L('R0', 'empty'), mode: 'R0', fixture: 'empty', reason: r, variants: OFF },
      { label: L('R1', 'three'), mode: 'R1', fixture: 'three', reason: r, variants: OFF },
      { label: L('D', 'three'), mode: 'D', fixture: 'three', reason: r, variants: OFF },
    ];
    add({ id: `C-0.${r}`, group: 'C-0', role: 'control', contract: 'TC:627 no-write control', detector: 'none: every mechanism silent', runs, predicates: [
      { run: L('J', 'three'), fact: 'verdict', eq: [] },
      { run: L('J', 'empty'), fact: 'verdict', eq: [] },
      { run: L('S', 'three'), fact: 'verdict', eq: [] },
      { run: L('T', 'three'), fact: 'tripped', eq: null },
      { recovered: [L('R0', 'three'), L('R1', 'three')], eq: COG1 },
      { run: L('J', 'three'), fact: 'draws', eq: d([`cognitive ${S.idDraw}`, 1]) },
      { run: L('J', 'three'), fact: 'probes', eq: { bridge_suppressed: 1 } },
      { run: L('J', 'three'), fact: 'storeDelta', eq: 0 },
      { run: L('J', 'three'), fact: 'closedListViolations', eq: [] },
      { run: L('J', 'empty'), fact: 'closedListViolations', eq: [] },
      { pairDiff: [L('J', 'empty'), L('J', 'three')], field: 'digestReturn', eq: [P.vaultKey] },
      { run: L('R0', 'three'), fact: 'positions', eqRun: L('R0', 'empty') },
      { run: L('J', 'three'), fact: 'digestBefore', eqRun: L('J', 'empty') },
      { run: L('S', 'three'), fact: 'digestBefore', eqRun: L('J', 'three') },
      { run: L('T', 'three'), fact: 'digestBefore', eqRun: L('J', 'three') },
      { run: L('D', 'three'), fact: 'digestBefore', eqRun: L('J', 'three') },
      { run: L('D', 'three'), fact: 'digestReturn', eqRun: L('J', 'three') },
      { run: L('J', 'three'), fact: 'call', eq: P.call[r] },
      { run: L('J', 'three'), fact: 'mutantOutside', eq: 0 },
    ] });
    const N = (m) => `N0.${m}.three.${r}`;
    add({ id: `N-0.${r}`, group: 'N-0', role: 'control', contract: 'scaffold neutrality', detector: 'none: identical to C-0', runs: [
      { label: N('J'), mode: 'J', fixture: 'three', reason: r, variants: [...OFF, 'N-0'], aliasProof: true },
      { label: N('D'), mode: 'D', fixture: 'three', reason: r, variants: [...OFF, 'N-0'] },
    ], predicates: [
      { run: N('J'), fact: 'verdict', eq: [] },
      { run: N('J'), fact: 'mutantFired', eq: 1 },
      { run: N('J'), fact: 'digestReturn', eqRun: L('J', 'three') },
      { outsideDiff: [N('J'), L('J', 'three')], eq: [] },
      { run: N('J'), fact: 'fingerprint', eqRun: L('J', 'three') },
      { run: N('D'), fact: 'fingerprint', eqRun: L('D', 'three') },
    ] });
  }

  // ---- MV-1: the bridge restored, every reason ----
  for (const r of P.mv1Reasons) {
    const L = (m) => `MV1.${m}.three.${r}`;
    add({ id: `MV-1.${r}`, group: 'MV-1', role: 'mutant', countsAsDetection: true, contract: 'TC:417', detector: 'journal, let, stream, tripwire', runs: [
      { label: L('J'), mode: 'J', fixture: 'three', reason: r, variants: [] },
      { label: L('T'), mode: 'T', fixture: 'three', reason: r, variants: [] },
      { label: L('R0'), mode: 'R0', fixture: 'three', reason: r, variants: [] },
      { label: L('R1'), mode: 'R1', fixture: 'three', reason: r, variants: [] },
    ], predicates: [
      { run: L('J'), fact: 'verdict', eq: ['journal', 'let', 'stream'] },
      { run: L('J'), fact: 'journalCount', eq: P.mv1.journalCount[r] },
      { run: L('J'), fact: 'letCount', eq: P.mv1.letCount[r] },
      { run: L('J'), fact: 'draws', eq: j(P.mv1.draws) },
      { run: L('J'), fact: 'probes', eq: P.mv1.probes },
      { run: L('J'), fact: 'storeDelta', eq: 1 },
      { run: L('T'), fact: 'tripped', eq: P.mv1.trip },
      { recovered: [L('R0'), L('R1')], eq: { cognitive: 2, visual: 0, environment: 0 } },
      { run: L('J'), fact: 'call', eq: P.call[r] },
    ] });
  }

  // ---- positive controls and mutants on the bridge-off base ----
  const C0 = (m, f, r) => `C0.${m}.${f}.${r}`;
  for (const r of P.reasons) {
    const pair = (id, group, contract, detector, runs, predicates) => add({ id: `${id}.${r}`, group, role: group.startsWith('P-') ? 'positive_control' : 'mutant', countsAsDetection: true, contract, detector, runs, predicates });
    const J = (g) => `${g}.J.three.${r}`, T = (g) => `${g}.T.three.${r}`;

    pair('P-1', 'P-1', 'TC:618 array index, restored (TC:626)', 'tripwire', [
      { label: J('P1'), mode: 'J', fixture: 'three', reason: r, variants: OFF, plant: 'index_restored', aliasProof: true },
      { label: T('P1'), mode: 'T', fixture: 'three', reason: r, variants: OFF, plant: 'index_restored' },
    ], [
      { run: T('P1'), fact: 'tripped', eq: { site: S.plant, kind: 'read_only' } },
      { run: J('P1'), fact: 'verdict', eq: [] },
      { run: J('P1'), fact: 'digestReturn', eqRun: C0('J', 'three', r) },
    ]);
    pair('P-2', 'P-2', 'TC:616 restored schema-cache write (TC:626)', 'journal', [
      { label: J('P2'), mode: 'J', fixture: 'three', reason: r, variants: OFF, plant: 'bonus_restored', aliasProof: true },
      { label: T('P2'), mode: 'T', fixture: 'three', reason: r, variants: OFF, plant: 'bonus_restored' },
    ], [
      { run: J('P2'), fact: 'verdict', eq: ['journal'] },
      { run: J('P2'), fact: 'journal', eq: d([`Map.set ${S.plant} [${P.items.bonus}]`, 2]) },
      { run: J('P2'), fact: 'digestReturn', eqRun: C0('J', 'three', r) },
      { run: T('P2'), fact: 'tripped', eq: null },
    ]);
    pair('MV-2a', 'MV-2a', 'TC:418 Q written then restored', 'journal', [
      { label: J('MV2a'), mode: 'J', fixture: 'three', reason: r, variants: [...OFF, 'MV-2a'], aliasProof: true },
      { label: T('MV2a'), mode: 'T', fixture: 'three', reason: r, variants: [...OFF, 'MV-2a'] },
    ], [
      { run: J('MV2a'), fact: 'verdict', eq: ['journal'] },
      { run: J('MV2a'), fact: 'journal', eq: d([`Map.set ${S.q} [${P.items.q}]`, 2]) },
      { run: J('MV2a'), fact: 'mutantFired', eq: 1 },
      { run: J('MV2a'), fact: 'digestReturn', eqRun: C0('J', 'three', r) },
      { run: T('MV2a'), fact: 'tripped', eq: null },
    ]);
    pair('MV-2b', 'MV-2b', 'TC:418 embedding written then restored', 'tripwire', [
      { label: J('MV2b'), mode: 'J', fixture: 'three', reason: r, variants: [...OFF, 'MV-2b'], aliasProof: true },
      { label: T('MV2b'), mode: 'T', fixture: 'three', reason: r, variants: [...OFF, 'MV-2b'] },
    ], [
      { run: T('MV2b'), fact: 'tripped', eq: { site: S.emb, kind: 'read_only' } },
      { run: J('MV2b'), fact: 'verdict', eq: [] },
      { run: J('MV2b'), fact: 'mutantFired', eq: 1 },
      { run: J('MV2b'), fact: 'digestReturn', eqRun: C0('J', 'three', r) },
    ]);
    pair('MV-2c', 'MV-2c', 'TC:418 schema cache written then restored', 'journal', [
      { label: J('MV2c'), mode: 'J', fixture: 'three', reason: r, variants: [...OFF, 'MV-2c'], aliasProof: true },
      { label: T('MV2c'), mode: 'T', fixture: 'three', reason: r, variants: [...OFF, 'MV-2c'] },
    ], [
      { run: J('MV2c'), fact: 'verdict', eq: ['journal'] },
      { run: J('MV2c'), fact: 'journal', eq: d([`Map.set ${S.bonus} [${P.items.bonus}]`, 2]) },
      { run: J('MV2c'), fact: 'mutantFired', eq: 1 },
      { run: J('MV2c'), fact: 'digestReturn', eqRun: C0('J', 'three', r) },
      { run: T('MV2c'), fact: 'tripped', eq: null },
    ]);
    pair('MV-3', 'MV-3', 'TC:419 forbidden write by another route', 'journal', [
      { label: J('MV3'), mode: 'J', fixture: 'three', reason: r, variants: [...OFF, 'MV-3'], aliasProof: true },
      { label: `MV3.S.three.${r}`, mode: 'J', superset: true, fixture: 'three', reason: r, variants: [...OFF, 'MV-3'] },
    ], [
      { run: J('MV3'), fact: 'verdict', eq: ['journal'] },
      { run: J('MV3'), fact: 'journalItems', includesAll: P.items.mv3Required },
      { run: J('MV3'), fact: 'journalItems', subsetOf: P.items.mv3Allowed },
      { run: J('MV3'), fact: 'probes', eq: { bridge_suppressed: 1 } },
      { run: J('MV3'), fact: 'mutantFired', eq: 1 },
      { run: J('MV3'), fact: 'digestReturn', neqRun: C0('J', 'three', r) },
      { run: `MV3.S.three.${r}`, fact: 'verdict', eq: ['superset_journal'] },
    ]);
    // These mutants change the first line of the seal, which every seal runs, including the natural
    // empty seals before the target.  Their history therefore differs from C-0, so every comparison
    // stays inside the same variant: both fixtures share the mutated history, as an AC38 pair would.
    for (const [id, stream, line] of [['MV-4', 'cognitive', S.startLine], ['MV-5a', 'visual', S.startLine], ['MV-5b', 'environment', S.startLine]]) {
      const g = id.replace('-', '');
      const draws = id === 'MV-4' ? d([`cognitive ${line}`, 1], [`cognitive ${S.idDraw}`, 1]) : d([`cognitive ${S.idDraw}`, 1], [`${stream} ${line}`, 1]);
      const delta = { cognitive: id === 'MV-4' ? 2 : 1, visual: stream === 'visual' ? 1 : 0, environment: stream === 'environment' ? 1 : 0 };
      const runs = [], preds = [];
      for (const f of ['three', 'empty']) {
        runs.push({ label: `${g}.J.${f}.${r}`, mode: 'J', fixture: f, reason: r, variants: [...OFF, id], aliasProof: true });
        runs.push({ label: `${g}.R0.${f}.${r}`, mode: 'R0', fixture: f, reason: r, variants: [...OFF, id] });
        runs.push({ label: `${g}.R1.${f}.${r}`, mode: 'R1', fixture: f, reason: r, variants: [...OFF, id] });
        preds.push({ run: `${g}.J.${f}.${r}`, fact: 'verdict', eq: ['stream'] });
        preds.push({ run: `${g}.J.${f}.${r}`, fact: 'draws', eq: draws });
        preds.push({ recovered: [`${g}.R0.${f}.${r}`, `${g}.R1.${f}.${r}`], eq: delta });
      }
      preds.push({ run: `${g}.J.three.${r}`, fact: 'digestBefore', eqRun: `${g}.J.empty.${r}` });
      preds.push({ run: `${g}.R0.three.${r}`, fact: 'positions', eqRun: `${g}.R0.empty.${r}` });
      preds.push({ pairDiff: [`${g}.J.empty.${r}`, `${g}.J.three.${r}`], field: 'digestReturn', eq: [P.vaultKey] });
      pair(id, id, id === 'MV-4' ? 'TC:420 extra cognitive sample in both fixtures' : `TC:421 ${stream} sample during a seal`, 'stream', runs, preds);
    }
    pair('MV-6a', 'MV-6a', 'TC:426 bookkeeping beyond the closed list: second vault copy', 'closed-list check', [
      { label: J('MV6a'), mode: 'J', fixture: 'three', reason: r, variants: [...OFF, 'MV-6a'], aliasProof: true },
      { label: `MV6a.S.three.${r}`, mode: 'J', superset: true, fixture: 'three', reason: r, variants: [...OFF, 'MV-6a'] },
    ], [
      { run: J('MV6a'), fact: 'verdict', eq: ['closed_list'] },
      { run: J('MV6a'), fact: 'closedListViolations', eq: ['vault_delta'] },
      { run: `MV6a.S.three.${r}`, fact: 'verdict', eq: ['closed_list'] },
    ]);
    pair('MV-6b', 'MV-6b', 'TC:426 bookkeeping beyond the closed list: extra field', 'closed-list shape check', [
      { label: J('MV6b'), mode: 'J', fixture: 'three', reason: r, variants: [...OFF, 'MV-6b'], aliasProof: true },
      { label: `MV6b.S.three.${r}`, mode: 'J', superset: true, fixture: 'three', reason: r, variants: [...OFF, 'MV-6b'] },
    ], [
      { run: J('MV6b'), fact: 'verdict', eq: ['closed_list'] },
      { run: J('MV6b'), fact: 'closedListViolations', eq: ['vault_entry_keys'] },
      { run: `MV6b.S.three.${r}`, fact: 'verdict', eq: ['closed_list'] },
    ]);
    pair('MV-6c', 'MV-6c', 'TC:426 bookkeeping beyond the closed list: other module state', 'superset journal, outside-inventory digest', [
      { label: J('MV6c'), mode: 'J', fixture: 'three', reason: r, variants: [...OFF, 'MV-6c'], aliasProof: true },
      { label: `MV6c.S.three.${r}`, mode: 'J', superset: true, fixture: 'three', reason: r, variants: [...OFF, 'MV-6c'] },
    ], [
      { run: J('MV6c'), fact: 'verdict', eq: [] },
      { outsideDiff: [J('MV6c'), C0('J', 'three', r)], eq: [P.workingMemoryKey] },
      { run: `MV6c.S.three.${r}`, fact: 'verdict', eq: ['superset_journal'] },
      { run: `MV6c.S.three.${r}`, fact: 'journal', eq: d([`Map.set ${S.mutLine} [${P.workingMemoryKey}]`, 1]) },
    ]);
    pair('MV-7a', 'MV-7a', 'TC:427 vault entry stored inside the window', 'journal, tripwire', [
      { label: J('MV7a'), mode: 'J', fixture: 'three', reason: r, variants: [...OFF, 'MV-7a'], aliasProof: true },
      { label: T('MV7a'), mode: 'T', fixture: 'three', reason: r, variants: [...OFF, 'MV-7a'] },
    ], [
      { run: J('MV7a'), fact: 'verdict', eq: ['journal'] },
      { run: J('MV7a'), fact: 'journal', eq: d([`Array.push ${S.mutLine} [${P.items.store}]`, 1]) },
      { run: J('MV7a'), fact: 'storeDelta', eq: 1 },
      { run: T('MV7a'), fact: 'tripped', eq: { site: S.mutLine, kind: 'not_extensible' } },
    ]);
    add({ id: `MV-7b.${r}`, group: 'MV-7b', role: 'characterization', countsAsDetection: false, contract: 'TC:427 deferred form, characterization only', detector: 'none inside the window; downstream fingerprint only', runs: [
      { label: J('MV7b'), mode: 'J', fixture: 'three', reason: r, variants: [...OFF, 'MV-7b'], aliasProof: true },
      { label: `MV7b.D.three.${r}`, mode: 'D', fixture: 'three', reason: r, variants: [...OFF, 'MV-7b'] },
    ], predicates: [
      { run: J('MV7b'), fact: 'verdict', eq: [] },
      { run: J('MV7b'), fact: 'storeDelta', eq: 0 },
      { run: J('MV7b'), fact: 'mutantFired', eq: 1 },
      { run: `MV7b.D.three.${r}`, fact: 'deferredFired', eq: 1 },
      { run: `MV7b.D.three.${r}`, fact: 'fingerprint', neqRun: C0('D', 'three', r) },
    ] });
  }

  // ---- neutrality on a second world and seed ----
  for (const r of P.neutrality.reasons) {
    const N = (m, f) => `NW.${m}.${f}.${r}`;
    const base = { reason: r, variants: [], world: P.neutrality.world, K: P.neutrality.K };
    const runs = [
      { label: N('B', 'empty'), mode: 'B', fixture: 'empty', ...base },
      { label: N('D', 'empty'), mode: 'D', fixture: 'empty', ...base },
      { label: N('D2', 'empty'), mode: 'D', fixture: 'empty', ...base },
      { label: N('J', 'empty'), mode: 'J', fixture: 'empty', ...base },
      { label: N('D', 'three'), mode: 'D', fixture: 'three', ...base },
      { label: N('J', 'three'), mode: 'J', fixture: 'three', ...base },
      ...(P.siteProbes ? [{ label: N('DS', 'three'), mode: 'D', fixture: 'three', ...base, variants: ['site_probes'] }] : []),
    ];
    const preds = [];
    for (const m of ['B', 'D2', 'J']) for (const fact of ['fingerprint', 'fingerprintM7']) preds.push({ run: N(m, 'empty'), fact, eqRun: N('D', 'empty') });
    for (const m of ['J', ...(P.siteProbes ? ['DS'] : [])]) { for (const fact of ['fingerprint', 'fingerprintM7']) preds.push({ run: N(m, 'three'), fact, eqRun: N('D', 'three') }); preds.push({ run: N(m, 'three'), fact: 'digestReturn', eqRun: N('D', 'three') }); }
    preds.push({ run: N('J', 'empty'), fact: 'digestReturn', eqRun: N('D', 'empty') });
    preds.push({ run: N('D', 'empty'), fact: 'seed', eq: P.neutrality.seed });
    if (P.neutrality.call[r] != null) preds.push({ run: N('D', 'three'), fact: 'call', eq: P.neutrality.call[r] });
    preds.push({ run: N('J', 'three'), fact: 'call', eqRun: N('D', 'three') });
    add({ id: `NW.${r}`, group: 'NW', role: 'neutrality', contract: 'TC:630 seal behaviour and RNG unchanged, additional seed', detector: 'comparison only', runs, predicates: preds });
  }

  // ---- deliberate breakage: each must refuse with the declared reason ----
  const r0 = P.reasons[0];
  const bk = (id, input, matches) => add({ id, group: 'BK', role: 'breakage', contract: 'fail closed', detector: 'refusal', runs: [{ label: id, fixture: 'three', reason: r0, ...input }], predicates: [{ refusal: id, matches }] });
  bk('BK-01', { mode: 'J', variants: OFF, tableSha256: '0'.repeat(64) }, 'rewrite table does not match its pinned hash');
  bk('BK-02', { mode: 'J', variants: [...OFF, 'MV-6a'], tableEdit: { op: 'anchor', variant: 'MV-6a' } }, `anchor mismatch at ${S.vaultPush}`);
  bk('BK-03', { mode: 'J', variants: [...OFF, 'MV-4'], tableEdit: { op: 'dropRewrite', variant: 'MV-4' } }, 'variant MV-4 has no rewrite in the table');
  bk('BK-04', { mode: 'J', variants: [...OFF, 'MV-2a'], tableEdit: { op: 'dropAppend', variant: 'MV-2a' } }, 'expected 1 variant appends for MV-2a, applied 0');
  bk('BK-05', { mode: 'J', variants: [...OFF, 'MV-99'] }, 'variant MV-99 is not known');
  bk('BK-06', { mode: 'J', variants: [...OFF, 'MV-2a', 'MV-6c'] }, `two rewrites on ${S.mutLine}`);
  bk('BK-07', { mode: 'J', variants: [...OFF, 'MV-2a'], breakKnob: 'journal' }, 'canary did not fire');
  bk('BK-08', { mode: 'J', variants: [...OFF, 'MV-4'], breakKnob: 'stream' }, 'canary did not fire');
  bk('BK-09', { mode: 'T', variants: [...OFF, 'MV-2b'], breakKnob: 'tripwire' }, 'tripwire canary did not fire');
  bk('BK-10', { mode: 'J', variants: OFF, brokenTree: true }, `source hash mismatch on ${P.brokenFile}`);
  bk('BK-11', { mode: 'J', variants: OFF, plant: 'bonus_restored', breakKnob: 'precondition' }, 'precondition: _bonusCache needs at least one entry');
  // the residual must come from the planted path itself, not from any other failure
  add({ id: 'BK-12', group: 'BK', role: 'breakage', contract: 'redaction residual is flagged', detector: 'residual scan', runs: [{ label: 'BK-12', mode: 'J', fixture: 'three', reason: r0, variants: OFF, breakKnob: 'leakPath' }], predicates: [{ residual: 'BK-12', eq: true }, { run: 'BK-12', fact: 'leakTest', eq: '<RESIDUAL>' }] });
  // MV-1 claims the let detector, so a dead let hook must also refuse
  bk('BK-13', { mode: 'J', variants: OFF, breakKnob: 'let' }, 'canary did not fire');

  return rows;
}
