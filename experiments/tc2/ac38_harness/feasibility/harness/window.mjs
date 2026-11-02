// ==========================================================
// AC38 limited feasibility study — the seal window, shared by the pinned and synthetic fixtures
// ==========================================================
// Derived from windowOf in ../../fixture.mjs at 3dc0082.  An adapter supplies every application
// handle, so the synthetic rehearsal runs this same code.  Additions: mutant dispatch, two new
// planted writes with explicit preconditions, closed-list capture, and a deliberate path leak used
// only to test redaction.
// ==========================================================
import { canon, digestAll, makeObserver, positions, sha256 } from '../../observe.mjs';
import { refuse } from './safety.mjs';

export const TERMINAL = Symbol('ac38-terminal');
const ones = (c) => Object.values(c).every((n) => n === 1);

export function makeWindow({ IN, CTL, adapter, scope, base, seed, nodes }) {
  const probes = {}, sitesInside = {};
  let windowObs = null, windowOpen = false, mutantFired = 0, mutantOutside = 0, result = null;

  if (CTL) {
    CTL.handlers.site = (site, obj) => {
      if (!windowObs) { adapter.onSiteOutside(site); return; }
      const row = (sitesInside[site] ||= { executed: 0, registered: 0 });
      row.executed++;
      if (windowObs.isRegistered(obj)) row.registered++;
    };
    CTL.handlers.mutant = (id, sealed) => {
      if (!windowOpen) { mutantOutside++; return undefined; }
      mutantFired++;
      return adapter.mutant(id, sealed);
    };
  }

  const plants = () => {
    const h = adapter.plantHandles();
    return {
      map_same_value() { const [k, val] = h.Q.entries().next().value; h.Q.set(k, val); },
      map_restored() { const [k, val] = h.Q.entries().next().value; h.Q.set(k, val + 1); h.Q.set(k, val); },
      array_restored() { const e = h.store[0]; h.store.push(e); h.store.pop(); },
      set_restored() { h.stable.add('__ac38_plant__'); h.stable.delete('__ac38_plant__'); },
      field_same_value() { h.edge.count = h.edge.count; },
      embedding_same_value() { h.neuron.userData.embedding = h.neuron.userData.embedding; },
      let_same_value() { h.plantLet(); },
      draw_cognitive() { h.liveRng(); },
      // P-1: an index write on an inventory array, restored before return
      index_restored() {
        if (h.store.length < 2) refuse('precondition: episodicStore needs at least two entries');
        const e = h.store[0]; h.store[0] = h.store[1]; h.store[0] = e;
      },
      // P-2: a schema-cache write, restored before return
      bonus_restored() {
        const need = IN.breakKnob === 'precondition' ? Infinity : 1;
        if (h.bonusCache.size < need) refuse('precondition: _bonusCache needs at least one entry');
        const [k, v] = h.bonusCache.entries().next().value; h.bonusCache.set(k, null); h.bonusCache.set(k, v);
      },
    };
  };

  function seal(inner, reason, call) {
    const out = { reason, call, seeded: adapter.isSeeded(), breakKnob: IN.breakKnob ?? null, variants: IN.variants ?? [] };
    if (!out.seeded) refuse('the fixture is not seeded');
    const R = adapter.readers();
    out.digestBefore = digestAll(scope, R);
    const inventoryRows = adapter.inventoryRows();
    const view = IN.aliasProof ? { stopAt: new WeakMap(inventoryRows.filter(([, val]) => val !== null && typeof val === 'object').map(([item, val]) => [val, item])), skipKeys: new Set(['embedding']) } : null;
    if (view) out.outsideInventoryBefore = digestAll(scope, R, view);
    out.episodeRestBefore = sha256(canon({ ...adapter.context(), nodes: null, labels: null }));
    const labels = nodes.map((id) => { const l = adapter.labelOf(id); if (l == null) refuse(`fixture node ${id} is not a valid neuron`); return l; });
    if (new Set(nodes).size !== nodes.length) refuse('fixture nodes are not unique');
    out.nodes = nodes; out.labels = labels;
    if (nodes.length) adapter.populate([...nodes], [...labels]);
    out.digestAfterPopulation = digestAll(scope, R);
    out.episodeRestAfter = sha256(canon({ ...adapter.context(), nodes: null, labels: null }));
    const vault0 = adapter.vault().length, store0 = adapter.store().length;

    const streams = adapter.streams();
    if (IN.mode === 'R0') { result = { ...out, positions: positions(streams, adapter.makeRng, seed) }; throw TERMINAL; }

    const observing = IN.mode === 'J' || IN.mode === 'T';
    const obs = observing ? makeObserver({ base, streams, touchLet: adapter.touchLet, breakKnob: IN.breakKnob, superset: IN.superset === true }) : null;
    const plant = IN.plant ? plants()[IN.plant] : null;
    if (IN.plant && !plant) refuse(`unknown planted write ${IN.plant}`);
    if (CTL) CTL.handlers.probe = (n) => { probes[n] = (probes[n] || 0) + 1; if (n === 'bridge_suppressed' && plant) plant(); };
    const logs = [];
    const savedLog = console.log;
    if (observing) {
      out.registered = obs.register(IN.superset ? adapter.supersetRows(IN.lockContext === true) : inventoryRows, adapter.neuronMap());
      CTL.handlers.let = obs.letHook;
      if (IN.mode === 'T') obs.protect({ fieldsOnly: IN.fieldsOnly === true, unlock: IN.unlock ?? { fields: [], arrays: [] } });
      if (IN.mode === 'J') console.log = (...a) => { logs[logs.length] = a.map(String).join(' ').slice(0, 220); };
      obs.arm();
      windowObs = obs;
      out.canaryOpen = obs.canaries();
      if (IN.mode === 'T') out.tripCanaryOpen = obs.tripCanaries();
    }
    windowOpen = true;
    let ret = null, err = null;
    try { ret = inner(reason); } catch (e) { err = e; }
    windowOpen = false;
    if (CTL) CTL.handlers.probe = null;
    out.probes = { ...probes };
    out.mutantFired = mutantFired;
    if (observing) {
      out.canaryClose = obs.canaries();
      if (IN.mode === 'T') out.tripCanaryClose = obs.tripCanaries();
      windowObs = null;
      obs.disarm();
      console.log = savedLog;
      CTL.handlers.let = null;
      out.observed = obs.report();
      out.sites = sitesInside;
      out.logs = logs.filter((l) => adapter.logFilter.test(l));
      if (!ones(out.canaryOpen) || !ones(out.canaryClose)) refuse(`canary did not fire: ${JSON.stringify([out.canaryOpen, out.canaryClose])}`);
      if (IN.mode === 'T' && (!ones(out.tripCanaryOpen) || !ones(out.tripCanaryClose))) refuse(`tripwire canary did not fire: ${JSON.stringify([out.tripCanaryOpen, out.tripCanaryClose])}`);
    }
    out.returned = ret === null ? 'null' : (ret === undefined ? 'undefined' : 'sealed');
    if (IN.mode === 'T') {
      out.tripped = err ? { name: err.name, message: String(err.message).slice(0, 200), site: obs.siteOf(err.stack ?? '') } : null;
      if (err && !(err instanceof TypeError)) throw err;
      result = out; throw TERMINAL;
    }
    if (err) throw err;
    const vault = adapter.vault();
    out.vaultDelta = vault.length - vault0;
    out.storeDelta = adapter.store().length - store0;
    out.closedList = { vaultAddedKeys: vault.slice(vault0).map((e) => Object.keys(e).sort()), newContextKeys: Object.keys(adapter.context()).sort() };
    if (IN.breakKnob === 'leakPath') out.leakTest = 'Z:\\ac38-leak-test\\file.txt';
    out.digestReturn = digestAll(scope, R);
    if (view) out.outsideInventoryReturn = digestAll(scope, R, view);
    if (IN.mode === 'R1') { result = { ...out, positions: positions(streams, adapter.makeRng, seed) }; throw TERMINAL; }
    result = out;
    if (IN.stopAtReturn) throw TERMINAL;
    return ret;
  }

  return { seal, get result() { return result; }, get mutantOutside() { return mutantOutside; } };
}
