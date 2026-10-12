// ==========================================================
// MCF-1 harness — verification gates (development seeds only; no official stage, no confirmatory seed)
// ==========================================================
//   node experiments/mcf1/verify_mcf1.mjs
// Exit code 0 iff every gate passed AND every mutant was caught.  Each mutant corrupts one input or
// implementation and must make its gate fail; a mutant that is not caught means the gate is vacuous.
//
// Pinned values below were measured earlier in scratch work on the exploratory development block
// (cold census / fidelity pass).  They are regression pins, not new science.
// ==========================================================
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as CFG from './config.mjs';
import * as INV from './inventory.mjs';
import * as ADM from './admission.mjs';
import * as EPI from './episodes.mjs';
import * as VAL from './validity.mjs';
import * as ORC from './orchestrate.mjs';
import * as ANA from './analyze.mjs';
import { createTrajectoryRegistry, TRAJECTORY_RECORDS, TRAJECTORY_HELD_OUT, TRAJECTORY_AUTHORIZATIONS, trajectory, trajectorySeed } from '../registry/typed.js';
import { ENV_STREAM, domainSlots } from '../h1r/env_seed.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url)), REPO = path.resolve(HERE, '..', '..');
let failed = 0, passed = 0, mutantsCaught = 0, mutantsMissed = 0;
const check = (gate, name, cond, detail = '') => { if (cond) passed++; else failed++; console.log(`${cond ? 'PASS' : 'FAIL'} [${gate}] ${name}${detail ? ' :: ' + detail : ''}`); };
const mutant = (gate, name, caught, detail = '') => { if (caught) mutantsCaught++; else mutantsMissed++; console.log(`${caught ? 'MUTANT-CAUGHT' : 'MUTANT-MISSED'} [${gate}] ${name}${detail ? ' :: ' + detail : ''}`); };
const git = (...a) => execFileSync('git', ['-C', REPO, ...a], { encoding: 'utf8' });
const near = (a, b, t = 1e-9) => Math.abs(a - b) <= t;
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const TMP = fs.mkdtempSync(path.join(fs.realpathSync.native(os.tmpdir()), 'mcf1-verify-'));
const D0 = 1_100_000_000;

// ---------------- G0: runtime identity ----------------
console.log('\n== G0 runtime identity and repository base ==');
const ctx = ORC.makeContext({ policy: 'development' });
{
  check('G0', 'conformed tree is the B2 blob set (707cb1e)', ctx.expectedIdentity.b2Commit.startsWith('707cb1e'), ctx.expectedIdentity.b2Commit);
  check('G0', 'tree directory name carries the transform digest prefix', path.basename(ctx.treeDir).endsWith(String(ctx.tree.manifest.transformSha256).slice(0, 12)));
  const files = ctx.tree.manifest.files, k = Object.keys(files)[0];
  const h = CFG.sha256(CFG.canonicalJson(files)), hm = CFG.sha256(CFG.canonicalJson({ ...files, [k]: 'deadbeef' }));
  mutant('G0', 'altered manifest entry changes the identity hash', h !== hm);
}

// ---------------- G1: inventory ----------------
console.log('\n== G1 reserved-span inventory ==');
const inv1 = INV.buildInventory(), inv2 = INV.buildInventory();
{
  check('G1', 'inventory is deterministic (two builds, one hash)', inv1.sha256 === inv2.sha256, inv1.sha256.slice(0, 16));
  const cls = Object.fromEntries(inv1.classes.map(c => [c.id, c.spanCount]));
  const union = new Set([...TRAJECTORY_RECORDS.map(r => r.value), ...INV.h1rDomainSeeds()]);
  check('G1', 'H1-R class = 4 streams x (recorded U verified domain)', cls.H1R_RECORDS_AND_DOMAIN === 4 * union.size, `${cls.H1R_RECORDS_AND_DOMAIN} = 4 x ${union.size}`);
  check('G1', 'R3 class = one segment per environment slot', cls.R3_ENV_SLOTS === domainSlots().length && cls.R3_ENV_SLOTS === 1920, String(cls.R3_ENV_SLOTS));
  check('G1', 'development class = 3 used streams x 2,400 seeds', cls[CFG.DEV_BLOCK.id] === 3 * CFG.DEV_BLOCK.count, String(cls[CFG.DEV_BLOCK.id]));
  check('G1', 'examined classes = (cognitive + environment) x seeds', CFG.EXPOSURE.every(e => cls[e.id] === 2 * e.count), CFG.EXPOSURE.map(e => `${e.id}:${cls[e.id]}`).join(' '));
  const snap = INV.registrySnapshot();
  check('G1', 'inventory records the live registry snapshot (hash, record, held-out and authorization counts)', inv1.descriptor.registry.sha256 === snap.sha256 && snap.records === TRAJECTORY_RECORDS.length && snap.heldOutRanges === TRAJECTORY_HELD_OUT.length && snap.authorizations === TRAJECTORY_AUTHORIZATIONS.length, JSON.stringify({ records: snap.records, heldOut: snap.heldOutRanges, auth: snap.authorizations }));
  const stage2 = Array.from({ length: 20 }, (_, i) => 20260819100 + i), domain = INV.h1rDomainSeeds();
  check('G1', 'the reserved but UNRECORDED seeds (20260819009 and 100-119) are in the verified domain and absent from the registry records',
    [20260819009, ...stage2].every(v => domain.includes(v) && !TRAJECTORY_RECORDS.some(r => r.value === v)), `${domain.filter(v => !TRAJECTORY_RECORDS.some(r => r.value === v)).length} unrecorded domain seeds`);
  const h1r = inv1.classes.find(c => c.id === 'H1R_RECORDS_AND_DOMAIN');
  check('G1', 'every unrecorded reserved seed has its cognitive, visual and environment spans covered by the H1-R class',
    [20260819009, ...stage2].every(v => INV.USED_STREAMS.every(n => h1r.index.firstOverlap(INV.position(INV.derivedSeeds(v)[n]), CFG.BUDGETS[n]) >= 0)));
  const noR3 = INV.buildInventory({ exclude: ['R3_ENV_SLOTS'] });
  mutant('G1', 'inventory without the R3 class has a different hash and span count', noR3.sha256 !== inv1.sha256 && noR3.classes.length === inv1.classes.length - 1);
}

// ---------------- G2: admission ----------------
console.log('\n== G2 deterministic admission ==');
const a1 = ADM.admitScan({ start: CFG.BLOCK.start, length: CFG.BLOCK.scanLength, inventory: inv1, category: 'registered' });
{
  const a2 = ADM.admitScan({ start: CFG.BLOCK.start, length: CFG.BLOCK.scanLength, inventory: inv2, category: 'registered' });
  check('G2', 'scan is deterministic (identical list hash on a rebuilt inventory)', a1.summary.admittedSha256 === a2.summary.admittedSha256);
  // known answer: the position-only feasibility check done before this milestone (candidate block, NOT authorised)
  check('G2', 'known answer: 4,000 scanned -> 3,851 admitted / 149 rejected', a1.summary.admitted === 3851 && a1.summary.rejected === 149, `${a1.summary.admitted}/${a1.summary.rejected}`);
  check('G2', 'known answer: first reasons = R3 slots 24, H1-R spans 125; no lag-0, registry or intra-run rejection',
    a1.summary.rejectedByFirstReason.R3_ENV_SLOTS === 24 && a1.summary.rejectedByFirstReason.H1R_RECORDS_AND_DOMAIN === 125 && a1.summary.lag0Coincidences === 0 && a1.summary.registryRefusals === 0 && a1.summary.intraRunConflicts === 0);
  check('G2', 'no overlap with the exploratory development or examined exposure', a1.summary.seedsOverlappingByClass[CFG.DEV_BLOCK.id] === 0 && CFG.EXPOSURE.every(e => a1.summary.seedsOverlappingByClass[e.id] === 0));
  const a3 = ADM.admitScan({ start: CFG.BLOCK.start, length: CFG.BLOCK.scanLength, inventory: INV.buildInventory({ exclude: ['R3_ENV_SLOTS'] }), category: 'registered' });
  mutant('G2', 'admission against an inventory without R3 admits a different list', a3.summary.admittedSha256 !== a1.summary.admittedSha256 && a3.summary.admitted > a1.summary.admitted);
  let refused = 0; for (const [s, l] of [[CFG.M32 - 5, 10], [-1, 5], [10, 0]]) { try { ADM.admitScan({ start: s, length: l, inventory: inv1 }); } catch (e) { refused++; } }
  check('G2', 'scans that would alias modulo 2^32 or are empty are refused', refused === 3);
  const ex = ADM.admitScan({ start: D0, length: 50, inventory: inv1, category: 'registered' });
  check('G2', 'with the full inventory every exploratory seed is rejected (lag-0 identity)', ex.summary.admitted === 0 && ex.summary.rejectedByFirstReason.lag0 === 50);
}

// ---------------- G3: translation collisions ----------------
console.log('\n== G3 consecutive-integer blocks collide wholesale ==');
{
  // measured on the full inventory: over the first 400 seeds of each block, EVERY seed's visual span intersects an
  // examined offline-exposure span at 1.3e9 and at 1.4e9 (consecutive raw seeds are translates on the cycle);
  // 1.5e9 intersects no examined class.  The streams do not collide at lag 0, so the registry cannot see this.
  const N = 100, blockHits = (start, cls) => {
    const idx = inv1.classes.find(c => c.id === cls).index; let n = 0, viaVisual = 0;
    for (let k = 0; k < N; k++) {
      const s = INV.derivedSeeds(start + k), hit = (n2) => idx.firstOverlap(INV.position(s[n2]), CFG.BUDGETS[n2]) >= 0;
      if (INV.USED_STREAMS.some(hit)) n++; if (hit('visual')) viaVisual++;
    }
    return { n, viaVisual };
  };
  const OFFLINE = 'EXAMINED_OFFLINE_1P1E9';
  for (const start of [1_300_000_000, 1_400_000_000]) {
    const h = blockHits(start, OFFLINE);
    check('G3', `block at ${start}: all ${N} seeds collide with the examined offline exposure, through the visual stream`, h.n === N && h.viaVisual === N, `${h.n}/${N} (visual ${h.viaVisual})`);
  }
  check('G3', `block at ${CFG.BLOCK.start}: no seed collides with an examined class or the development block`,
    [OFFLINE, 'EXAMINED_1P2E9', CFG.DEV_BLOCK.id].every(c => blockHits(CFG.BLOCK.start, c).n === 0));
  const lag0AtM = INV.derivedSeeds(1_300_000_000);
  check('G3', 'the collision is NOT a lag-0 identity (no derived seed equals a reserved one), so the registry check cannot see it',
    !INV.STREAMS.some(n => inv1.derived.has(lag0AtM[n])));
  const noOffline = INV.buildInventory({ exclude: [OFFLINE] });
  const withClass = ADM.admitScan({ start: 1_300_000_000, length: 50, inventory: inv1, category: 'registered' });
  const without = ADM.admitScan({ start: 1_300_000_000, length: 50, inventory: noOffline, category: 'registered' });
  check('G3', 'full inventory admits none of the first 50 seeds of the 1.3e9 block', withClass.summary.admitted === 0, `${withClass.summary.admitted}/50`);
  mutant('G3', 'an inventory without the examined offline class would admit the colliding block', without.summary.admitted >= 45, `${without.summary.admitted}/50 admitted`);
}

// ---------------- G4: registry semantics ----------------
console.log('\n== G4 registry clause semantics ==');
{
  // The registry is exercised through admitScan's injectable `registry` parameter on IN-MEMORY registries only:
  // nothing is recorded, registered or consumed.  The probe is a seed that the live registry and every span clause admit.
  const scan = ADM.admitScan({ start: 1_700_000_000, length: 100, inventory: inv1, category: 'registered' });
  const probe = scan.admitted[0];
  check('G4', 'a probe seed outside the candidate block is admitted by the live registry (AVAILABLE)', Number.isSafeInteger(probe) && probe >= 1_700_000_000 && probe < CFG.BLOCK.start + 10 ** 9, String(probe));
  const rec = (value, study, status) => ({ namespace: 'trajectory', value, study, status, executed: false, authorization: 'in-memory verification only', artifact: 'none', why: 'registry clause semantics' });
  const mk = ({ records = [], heldOut = [] }) => createTrajectoryRegistry({ records: [...TRAJECTORY_RECORDS, ...records], heldOut: [...TRAJECTORY_HELD_OUT, ...heldOut], authorizations: TRAJECTORY_AUTHORIZATIONS });
  const one = (registry, category = 'registered') => ADM.admitScan({ start: probe, length: 1, inventory: inv1, category, registry });
  const reasonOf = (r) => (r.rejected[0] ? r.rejected[0].reasons[0] : null);
  check('G4', 'live registry: AVAILABLE -> admitted', one(trajectory).admitted.length === 1);
  const reg = one(mk({ records: [rec(probe, CFG.STUDY, 'registered')] }));
  check('G4', 'after an MCF-1 registered record: REPRODUCTION is accepted by the admission clause', reg.admitted.length === 1 && reg.summary.registryRefusals === 0);
  const devAsReg = one(mk({ records: [rec(probe, CFG.STUDY, 'development')] }));
  mutant('G4', 'a development-recorded seed used as registered is refused (CATEGORY_TRANSITION)', devAsReg.admitted.length === 0 && reasonOf(devAsReg) === 'registry:CATEGORY_TRANSITION', reasonOf(devAsReg));
  const other = one(mk({ records: [rec(probe, 'M31', 'development')] }));
  mutant('G4', 'a seed recorded by another study is refused (CONSUMED_BY_OTHER_STUDY)', other.admitted.length === 0 && reasonOf(other) === 'registry:CONSUMED_BY_OTHER_STUDY', reasonOf(other));
  const held = one(mk({ heldOut: [{ lo: probe, hi: probe, authorization: 'in-memory verification only', why: 'registry clause semantics' }] }));
  mutant('G4', 'a held-out seed is refused (HELD_OUT)', held.admitted.length === 0 && reasonOf(held) === 'registry:HELD_OUT', reasonOf(held));
  check('G4', 'the injected-registry summary hash differs from the live one only because the registry differs', reg.summary.registrySha256 !== one(trajectory).summary.registrySha256 && one(trajectory).summary.registrySha256 === INV.registrySnapshot().sha256);
  // facts about the live registry that the span inventory has to cover
  const refuses = (v) => { try { trajectory.checkUse(trajectorySeed(v), { study: CFG.STUDY, category: 'registered' }); return 'AVAILABLE'; } catch (e) { return e.code; } };
  check('G4', 'H1-R pilot seed 20260819004 is refused for MCF-1 by the registry', refuses(20260819004) === 'CONSUMED_BY_OTHER_STUDY');
  check('G4', 'documented gap: reserved but unrecorded Stage-2 seed 20260819100 is AVAILABLE to the registry', refuses(20260819100) === 'AVAILABLE');
  check('G4', 'a raw seed >= 2^32 cannot be scanned (it would alias another seed modulo 2^32)', (() => { try { ADM.admitScan({ start: 20260819100, length: 1, inventory: inv1 }); return false; } catch (e) { return /2\^32/.test(e.message); } })());
}

// ---------------- G5: registered contents ----------------
console.log('\n== G5 memory contents ==');
{
  check('G5', 'COLD has no brain', EPI.brainFor('C') === null && EPI.brainHash(null) === 'none');
  for (const c of ['M9', 'M11']) {
    const b = EPI.brainFor(c);
    check('G5', `${c}: brain contains only "episodes", one episode on the registered route`, Object.keys(b).join() === 'episodes' && b.episodes.length === 1 && same(b.episodes[0].nodes, CFG.FRAME.routes[c === 'M9' ? 9 : 11]));
    check('G5', `${c}: every consecutive pair is a graph edge`, b.episodes[0].nodes.slice(0, -1).every((n, i) => EPI.isGraphEdge(n, b.episodes[0].nodes[i + 1])));
  }
  check('G5', 'the frame candidate set equals the graph neighbours of the start node', EPI.frameCandidatesMatchGraph() && same(EPI.NEIGHBOURS(10), [6, 9, 11, 13]));
  check('G5', 'node 12 is NOT a neighbour of node 10 (the endpoint is first-edge success, not goal arrival)', !EPI.isGraphEdge(10, 12));
  check('G5', 'brain hashes are stable and distinct', EPI.REGISTERED_BRAIN_HASHES.M9 !== EPI.REGISTERED_BRAIN_HASHES.M11 && EPI.brainHash(EPI.brainFor('M9')) === EPI.REGISTERED_BRAIN_HASHES.M9);
  let threw = false; try { EPI.brainFor('X'); } catch (e) { threw = true; }
  check('G5', 'unknown content is refused', threw);
}

// ---------------- G7: validity truth table (pure) ----------------
console.log('\n== G7 pattern rule against brute force ==');
{
  const E = [6, 9, 11, 13], PB = { 6: 0.9185, 13: 0.9151 };
  const P = (e, tw, pr, pu) => (e === 9 ? (tw === 9 ? pr : pu) : e === 11 ? (tw === 11 ? pr : pu) : PB[e]);
  const Y = (e, tw, pr, pu, u) => (u < P(e, tw, pr, pu) ? 1 : 0);
  const grid = []; for (const [pr, pu] of [[0.95, 0.35], [0.9, 0.45], [1, 0.25], [0.7, 0.6]]) for (let i = 0; i < 200; i++) grid.push([pr, pu, (i + 0.5) / 200]);
  const brute = (xC, x9, x11) => { let holds = true; const sup = new Set();
    for (const [pr, pu, u] of grid) { let g = 0, b = 0, r = 0; for (const tw of [9, 11]) { const xr = tw === 9 ? x9 : x11, xu = tw === 9 ? x11 : x9; g += (Y(xr, tw, pr, pu, u) - Y(xC, tw, pr, pu, u)) / 2; b += (Y(xu, tw, pr, pu, u) - Y(xC, tw, pr, pu, u)) / 2; r += (Y(xr, tw, pr, pu, u) - Y(xu, tw, pr, pu, u)) / 2; } if (Math.abs(g + b) > 1e-12) holds = false; sup.add(+r.toFixed(6)); }
    return { holds, sup: [...sup] }; };
  let classOk = true, soundOk = true, identityCount = 0, leftOut = [];
  for (const xC of E) for (const x9 of E) for (const x11 of E) {
    const bf = brute(xC, x9, x11), cls = VAL.inIdentityClass(xC, x9, x11); if (bf.holds) identityCount++; if (bf.holds !== cls) classOk = false;
  }
  for (const x9 of E) for (const x11 of E) {
    const sup = new Set(); for (const xC of E) for (const v of brute(xC, x9, x11).sup) sup.add(v);
    const ok = VAL.classifyPair(x9, x11).supportOK, within = [...sup].every(v => v === 0 || v === 1);
    if (ok && !within) soundOk = false; if (!ok && within) leftOut.push(`(${x9},${x11})`);
  }
  check('G7', 'identity class equals brute-force identity over all 64 executed triples', classOk && identityCount === 10, `${identityCount}/64 hold`);
  check('G7', 'pair rule is SOUND: every accepted pair has contrast support within {0,1}', soundOk);
  check('G7', 'pair rule is conservative only where the contrast is identically 0', leftOut.every(s => ['(6,13)', '(13,6)'].includes(s)) || leftOut.length === 0, leftOut.join(' ') || 'none');
  const badPair = (x9, x11) => (x9 === 9 && x11 === 11) || x9 === x11 || (x9 === 11 && x11 === 9);                 // wrongly accepts the reversed pair
  mutant('G7', 'a classifier that accepts the reversed pair (11,9) violates the support', E.some(x9 => E.some(x11 => badPair(x9, x11) && !VAL.classifyPair(x9, x11).supportOK && (() => { const sup = new Set(); for (const xC of E) for (const v of brute(xC, x9, x11).sup) sup.add(v); return [...sup].some(v => v < 0); })())));
  const badIdent = (xC, x9, x11) => [xC, x9, x11].every(e => [6, 9, 11].includes(e));                              // wrongly widens the class
  mutant('G7', 'a widened identity class disagrees with brute force', E.some(a => E.some(b => E.some(c => badIdent(a, b, c) !== brute(a, b, c).holds))));
}

// ---------------- development pipeline (shared by G6, G8-G11, G14) ----------------
console.log('\n== development pipeline on 100 exploratory seeds (Q -> V -> O -> analysis) ==');
const invDev = ORC.stageInventory({ policy: 'development' });
const admDev = ORC.stageAdmit({ policy: 'development', start: D0, length: 100, inventory: invDev });
const Q = await ORC.stageQ({ seeds: admDev.admitted, ctx, cacheFile: path.join(TMP, 'cache_Q.jsonl') });
const Vs = await ORC.stageV({ qualified: Q.qualified, ctx, cacheFile: path.join(TMP, 'cache_V.jsonl'), admittedSet: new Set(admDev.admitted) });
const Oh = await ORC.stageO({ vManifest: Vs.manifest, expectedVSha256: Vs.manifest.sha256, ctx, cacheFile: path.join(TMP, 'cache_Oh.jsonl'), stopAt: 'attempt-hook' });
const Oc = await ORC.stageO({ vManifest: Vs.manifest, expectedVSha256: Vs.manifest.sha256, ctx, cacheFile: path.join(TMP, 'cache_Oc.jsonl'), stopAt: 'call2' });

console.log('\n== G6 Stage Q / V against pinned known answers ==');
{
  check('G6', 'development admission of 100 exploratory seeds: all admitted', admDev.summary.admitted === 100);
  check('G6', 'qualification: 3 qualified (offsets 0, 60, 92), 5 replay-at-call-0, 92 other start node',
    same(Q.qualified.map(x => x - D0), [0, 60, 92]) && Q.summary.rejectedByReason.REPLAY_AT_CALL0 === 5 && Q.summary.rejectedByReason.START_NODE === 92 && !Q.summary.rejectedByReason.RUN, JSON.stringify(Q.summary.rejectedByReason));
  check('G6', 'runtime identity holds on every Stage-Q record', Q.summary.runtimeIdentity.ok);
  const rec = (raw, k) => Vs.records.find(r => r.label === `V|${raw}|${k}`);
  const PIN = { 0: { F: { 6: 3.000529952276683, 9: 4.200064592815189, 11: 4.201431519867485, 13: 3.000148751737269 }, exec: 11, cog: 653, pattern: [11, 9, 11] },
    60: { F: { 6: 3.002798636201023, 9: 4.201513182157835, 11: 4.199400415812019, 13: 3.0001020675911088 }, exec: 9, cog: 654, pattern: [9, 9, 9] },
    92: { F: { 6: 3.000421677911606, 9: 4.199996518871466, 11: 4.199440435316279, 13: 3.002578424466726 }, exec: 9, cog: 653, pattern: [9, 9, 11] } };
  for (const [k, p] of Object.entries(PIN)) {
    const raw = D0 + Number(k), r = rec(raw, 'C|T9');
    check('G6', `seed +${k}: cold scores equal the pinned measurement`, Object.entries(p.F).every(([key, v]) => near(r.step0.find(c => c.key === Number(key)).F, v)));
    check('G6', `seed +${k}: cold executed edge and cognitive draw count at the decision`, VAL.executedOf(r) === p.exec && r.artifacts.cogDraws === p.cog && r.artifacts.visDraws === 3020, `exec ${VAL.executedOf(r)} cog ${r.artifacts.cogDraws}`);
    const e = Vs.manifest.entries.find(x => x.raw === raw);
    check('G6', `seed +${k}: executed pattern (xC, x9, x11) equals the pinned fidelity result and the seed is valid`, same([e.pattern.xC, e.pattern.x9, e.pattern.x11], p.pattern) && e.valid, JSON.stringify(e.pattern));
  }
  check('G6', 'every Stage-V record is a decision-stop with no attempt and 0 environment draws', Vs.records.every(r => r.attempts.length === 0 && r.artifacts.envCounters.envDraws === 0 && r.outcome.abortedBySentinel));
  check('G6', 'validity manifest: 3 valid, 0 invalid, no halts, hash self-consistent', Vs.manifest.counts.valid === 3 && Vs.manifest.counts.invalid === 0 && !Vs.halted && VAL.manifestIntact(Vs.manifest));
  // twin invariance is checked on every run pair
  const twinOk = Q.qualified.every(raw => ['C', 'M9', 'M11'].every(c => VAL.fingerprintPre(rec(raw, `${c}|T9`)) === VAL.fingerprintPre(rec(raw, `${c}|T11`))));
  check('G6', 'twin invariance with memory present on all qualified seeds', twinOk);
  const e0 = Vs.manifest.entries.find(x => x.raw === D0);
  const fpMut = { ...rec(D0, 'M9|T9'), step0: rec(D0, 'M9|T9').step0.map((c, i) => (i === 0 ? { ...c, F: c.F + 1e-6 } : c)) };
  mutant('G6', 'a perturbed candidate score changes the fingerprint (V5/V9 would see it)', VAL.fingerprintPre(fpMut) !== e0.fingerprints['M9|T9']);
}

// ---------------- G8: legality and the illegal-action counter ----------------
console.log('\n== G8 legality predicate and the blockedIllegal capture ==');
{
  const src = fs.readFileSync(path.join(ctx.treeDir, 'main.js'), 'utf8');
  check('G8', 'conformed tree carries N1-MASK, N1-MASK-SEM and N1-GUARD with the counter', src.includes('H1R N1-MASK:') && src.includes('H1R N1-MASK-SEM:') && src.includes('H1R N1-GUARD') && src.includes('blockedIllegal++'));
  // the runtime is installed in a child process so that nothing it patches reaches this verifier
  const probeSrc = `import { installH1R } from ${JSON.stringify(new URL('../h1r/runtime.mjs', import.meta.url).href)};
    const H = await installH1R({ tree: ${JSON.stringify(ctx.treeDir)}, trustMode: 'traversal', envPosition: null });
    process.stdout.write(JSON.stringify({ l109: H.legalMove(10, 9), l1012: H.legalMove(10, 12), l1010: H.legalMove(10, 10), e1012: H.isEdge(10, 12), e109: H.isEdge(10, 9), e1010: H.isEdge(10, 10), blocked: H.counters.blockedIllegal }));`;
  const pr = spawnSync(process.execPath, ['--input-type=module', '-e', probeSrc], { encoding: 'utf8' });
  let L = null; try { L = JSON.parse(pr.stdout); } catch (e) { /* reported by the check below */ }
  check('G8', 'runtime legality predicate: (10,9) legal, (10,12) illegal, (10,10) self re-execution allowed, graph edge test strict',
    !!L && L.l109 === true && L.l1012 === false && L.l1010 === true && L.e1012 === false && L.e109 === true && L.e1010 === false, pr.status === 0 ? JSON.stringify(L) : (pr.stderr || '').slice(0, 200));
  check('G8', 'illegal-action counter starts at 0', !!L && L.blocked === 0);
  check('G8', 'independent graph check agrees with the runtime predicate on every Stage-V candidate and executed edge',
    Vs.records.every(r => r.legality.candidatesAreEdges.every(Boolean) && r.legality.executedLegalMove === true && EPI.isGraphEdge(r.startNode, r.chosen)));
  check('G8', 'every Stage-O record carries the counter, it is 0, and the executed edge is legal', Oh.records.every(r => r.h1r.blockedIllegal === 0 && r.legality.executedLegalMove === true && r.h1r.on === true));
  const e = Vs.manifest.entries.find(x => x.raw === D0), runsO = Object.fromEntries(['C|T9', 'C|T11', 'M9|T9', 'M9|T11', 'M11|T9', 'M11|T11'].map(k => [k, Oh.records.find(r => r.label === `O|attempt-hook|${D0}|${k}`)]));
  const base = VAL.validateSeedO({ raw: D0, vEntry: e, runs: runsO });
  check('G8', 'baseline Stage-O validation of the pinned seed is valid', base.valid && base.hardSeed.length === 0 && base.haltStage.length === 0);
  const m1 = JSON.parse(JSON.stringify(runsO)); m1['M9|T9'].h1r.blockedIllegal = 1;
  mutant('G8', 'blockedIllegal = 1 invalidates the seed (V4b)', VAL.validateSeedO({ raw: D0, vEntry: e, runs: m1 }).hardSeed.includes('V4b'));
  const m2 = JSON.parse(JSON.stringify(runsO)); m2['C|T9'].legality.executedLegalMove = false;
  mutant('G8', 'an illegal executed action invalidates the seed (V4b)', VAL.validateSeedO({ raw: D0, vEntry: e, runs: m2 }).hardSeed.includes('V4b'));
  const m3 = JSON.parse(JSON.stringify(runsO)); m3['M11|T11'].h1r.drawFaults = 1;
  mutant('G8', 'a draw fault invalidates the seed (V4b)', VAL.validateSeedO({ raw: D0, vEntry: e, runs: m3 }).hardSeed.includes('V4b'));
}

// ---------------- G9: Stage-O stop points ----------------
console.log('\n== G9 first-attempt stop points ==');
{
  const oc = Object.fromEntries(Oc.manifest.entries.map(x => [x.raw, x])), oh = Object.fromEntries(Oh.manifest.entries.map(x => [x.raw, x]));
  check('G9', 'Stage O valid for all 3 seeds at both stop points, no halts', Oh.manifest.counts.valid === 3 && Oc.manifest.counts.valid === 3 && !Oh.halted && !Oc.halted);
  check('G9', 'attempt-hook outcomes equal call2 outcomes for every run of every seed', Q.qualified.every(r => same(oh[r].outcomes, oc[r].outcomes)));
  check('G9', 'exactly one environment draw and one attempt per run', Oh.records.every(r => r.attempts.length === 1 && r.artifacts.envCounters.envDraws === 1 && r.h1r.envDrawsSeen === 1));
  check('G9', 'Stage-O pre-attempt fingerprints equal Stage V (determinism, V9)', Q.qualified.every(raw => ['C', 'M9', 'M11'].every(c => ['T9', 'T11'].every(t => VAL.fingerprintPre(Oh.records.find(r => r.label === `O|attempt-hook|${raw}|${c}|${t}`)) === Vs.manifest.entries.find(x => x.raw === raw).fingerprints[`${c}|${t}`]))));
  check('G9', 'instrument mapping holds (realised ok = 1{u1 < p}) for every run (V12)', Oh.manifest.counts.byRule.V12 === undefined);
  const stopHook = Oh.records[0].probes.some(p => p.phase === 'after-attempt'), stopCall2 = Oc.records[0].probes.some(p => p.phase === 'call2-start');
  check('G9', 'each stop point recorded its own probe', stopHook && stopCall2);
  // mutant: a Stage-V entry whose fingerprint was altered must halt the stage (V9)
  const e = JSON.parse(JSON.stringify(Vs.manifest.entries.find(x => x.raw === D0))); e.fingerprints['M9|T9'] = 'x'.repeat(64);
  const runsO = Object.fromEntries(['C|T9', 'C|T11', 'M9|T9', 'M9|T11', 'M11|T9', 'M11|T11'].map(k => [k, Oh.records.find(r => r.label === `O|attempt-hook|${D0}|${k}`)]));
  mutant('G9', 'a fingerprint mismatch halts the stage (V9)', VAL.validateSeedO({ raw: D0, vEntry: e, runs: runsO }).haltStage.includes('V9'));
  const m = JSON.parse(JSON.stringify(runsO)); m['M9|T9'].attempts[0][3] = 1 - m['M9|T9'].attempts[0][3];
  mutant('G9', 'an outcome flag that disagrees with 1{u1<p} halts the stage (V12)', VAL.validateSeedO({ raw: D0, vEntry: Vs.manifest.entries.find(x => x.raw === D0), runs: m }).haltStage.includes('V12'));
}

// ---------------- G10: gating and blindness ----------------
console.log('\n== G10 gating and outcome blindness ==');
{
  const refuses = async (vm, sha) => { try { await ORC.stageO({ vManifest: vm, expectedVSha256: sha, ctx, cacheFile: null }); return false; } catch (e) { return /refused/.test(e.message); } };
  check('G10', 'Stage O refuses a wrong supplied manifest hash', await refuses(Vs.manifest, 'f'.repeat(64)));
  const tam = JSON.parse(JSON.stringify(Vs.manifest)); tam.entries[0].valid = !tam.entries[0].valid;
  mutant('G10', 'a tampered validity manifest is refused (stored hash no longer matches)', await refuses(tam, Vs.manifest.sha256) && !VAL.manifestIntact(tam));
  const halted = JSON.parse(JSON.stringify(Vs.manifest)); halted.halts = [{ rule: 'V1' }];
  const { sha256: _h, ...body } = halted; halted.sha256 = CFG.sha256(CFG.canonicalJson(body));
  check('G10', 'Stage O refuses a halted validity stage', await refuses(halted, halted.sha256));
  const fields = new Set(); const walk = (o) => { if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) { fields.add(k); walk(v); } }; walk(Vs.manifest.entries);
  check('G10', 'the Stage-V manifest carries no outcome, draw or contrast field', !['ok', 'u1', 'outcomes', 'attempts', 'D', 'dR'].some(k => fields.has(k)), [...fields].filter(k => ['ok', 'u1', 'outcomes', 'attempts', 'dR'].includes(k)).join(','));
  check('G10', 'the driver forbids an attempt in decision-only stages (source guard present)', fs.readFileSync(path.join(HERE, 'driver.mjs'), 'utf8').includes('an environment attempt was reached in a decision-only stage'));
  // spawn a decision-only driver on a seed outside the development domain: must refuse before loading anything
  const res = spawnSync(process.execPath, [path.join(HERE, 'driver.mjs'), JSON.stringify({ mode: 'V', stopAt: 'decision', policy: 'development', tree: ctx.treeDir, label: 'x', agentSeed: CFG.BLOCK.start, content: 'C', twin: 'T9', configSeed: 100000, configIndex: 1 })], { encoding: 'utf8' });
  check('G10', 'the driver refuses a candidate-block seed in development mode', res.status !== 0 && /MCF-1 driver refused: the candidate confirmatory block is not authorised/.test(res.stderr), res.status === 0 ? 'driver did not refuse' : 'refused before loading any runtime');
}

// ---------------- G11: analysis ----------------
console.log('\n== G11 census analysis ==');
{
  // synthetic frame with hand-computed answers
  const mkEntry = (raw, xC, x9, x11) => ({ raw, valid: true, hard: [], diagnostics: [], pattern: { xC, x9, x11 }, pair: x9 === 9 && x11 === 11 ? 'follow' : 'equal', steering: x9 === 9 && x11 === 11, identityClass: VAL.inIdentityClass(xC, x9, x11), fingerprints: {} });
  const entries = [mkEntry(1, 9, 9, 11), mkEntry(2, 11, 9, 11), mkEntry(3, 9, 9, 9), mkEntry(4, 6, 6, 6)];
  const vm = VAL.buildManifest({ stage: 'V', inputs: { synthetic: true }, entries, halts: [] });
  const Yfun = (c, t, e) => (e === (t === 'T9' ? 9 : 11) ? 1 : 0);              // success iff the executed edge is the reliable one (a stand-in outcome rule with CRN u in the gap)
  const outcomesFor = (p) => Object.fromEntries(['C', 'M9', 'M11'].flatMap(c => ['T9', 'T11'].map(t => { const e = c === 'C' ? p.xC : c === 'M9' ? p.x9 : p.x11; return [`${c}|${t}`, { edge: e, ok: Yfun(c, t, e) }]; })));
  const oEntries = entries.map(e => ({ raw: e.raw, valid: true, hardSeed: [], haltStage: [], missing: [], outcomes: outcomesFor(e.pattern) }));
  const om = VAL.buildManifest({ stage: 'O', inputs: { validityManifestSha256: vm.sha256 }, entries: oEntries, halts: [] });
  const an = ANA.analyzeFrame({ vManifest: vm, oManifest: om });
  // expected by hand: T = (1,1,0,0) -> 0.5 ; sigma = (1,1,0.5,0)... see below
  const T = 2 / 4, sigma = (1 + 1 + 0.5 + 0) / 4, cold = (0.5 + 0.5 + 0.5 + 0) / 4;
  check('G11', 'T_frame, sigma bar and net shift equal the hand computation', near(an.steering.T_frame.value, T) && near(an.steering.sigmaBar, sigma) && near(an.steering.coldRate, cold) && near(an.steering.netShift, sigma - cold), JSON.stringify({ T: an.steering.T_frame.value, sigma: an.steering.sigmaBar, net: an.steering.netShift }));
  // D^R: seeds 1,2 follow -> twin9: Y(M9,T9)-Y(M11,T9) = 1-0 ; twin11: Y(M11,T11)-Y(M9,T11) = 1-0 -> D=1 ; seeds 3,4: 0
  check('G11', 'first-edge contrast K = 2 of 4, binary, decomposition identity holds for every seed', an.firstEdgeOutcome.firstEdgeContrast_GOODminusBAD.k === 2 && an.firstEdgeOutcome.firstEdgeContrast_GOODminusBAD.allBinary && an.firstEdgeOutcome.decomposition.identityFailsForSeeds === 0, JSON.stringify(an.firstEdgeOutcome.decomposition));
  check('G11', 'no inference is produced (no p-value, interval or test fields)', an.inference.performed === false && !JSON.stringify(an).match(/pValue|confidenceInterval|significan(t|ce)\":true/));
  const antv = ANA.analyzeFrame({ vManifest: vm, oManifest: null });
  check('G11', 'steering is computed from the validity manifest alone (identical with outcomes absent)', same(antv.steering, an.steering) && antv.firstEdgeOutcome.status === 'NOT_RUN');
  const tam = JSON.parse(JSON.stringify(vm)); tam.entries[0].pattern.x9 = 11;
  mutant('G11', 'analysis refuses a tampered validity manifest', (() => { try { ANA.analyzeFrame({ vManifest: tam }); return false; } catch (e) { return /not intact/.test(e.message); } })());
  const wrongO = VAL.buildManifest({ stage: 'O', inputs: { validityManifestSha256: 'a'.repeat(64) }, entries: oEntries, halts: [] });
  mutant('G11', 'analysis refuses an outcome manifest built against a different validity manifest', (() => { try { ANA.analyzeFrame({ vManifest: vm, oManifest: wrongO }); return false; } catch (e) { return /not produced against this validity manifest/.test(e.message); } })());
  const real = ANA.analyzeFrame({ vManifest: Vs.manifest, oManifest: Oh.manifest });
  check('G11', 'development frame: T_frame 2/3, net shift 1/3, first-edge contrast K=1 of 3', real.steering.T_frame.k === 2 && real.steering.T_frame.n === 3 && near(real.steering.netShift, 1 / 3) && real.firstEdgeOutcome.firstEdgeContrast_GOODminusBAD.k === 1 && real.firstEdgeOutcome.n === 3);
}

// ---------------- G12: official-stage refusal ----------------
console.log('\n== G12 official-stage refusal ==');
{
  const refusal = (f, a) => { try { CFG.assertOfficialAllowed(f, a); return false; } catch (e) { return /refused/.test(e.message); } };
  check('G12', 'no freeze record -> refused', refusal(null, {}));
  check('G12', 'frozen:false -> refused', refusal({ schema: 'mcf1.freeze/1', frozen: false }, {}));
  const approvals = Object.fromEntries(CFG.REQUIRED_FOR_OFFICIAL.map(k => [k, { value: 'x', status: 'APPROVED' }]));
  const H = { preregistrationSha256: 'a'.repeat(64), configSha256: 'b'.repeat(64), inventorySha256: 'c'.repeat(64), admittedSha256: 'd'.repeat(64), treeDigest: 'e'.repeat(64) };
  const good = { schema: 'mcf1.freeze/1', frozen: true, approvals, ...H };
  check('G12', 'a complete synthetic record with matching actual hashes is accepted (positive control: the gate is not vacuous)', (() => { try { return CFG.assertOfficialAllowed(good, H) === true; } catch (e) { return false; } })());
  mutant('G12', 'a complete record WITHOUT the actual hashes is refused', refusal(good, {}));
  mutant('G12', 'a hash mismatch is refused', refusal(good, { ...H, inventorySha256: 'f'.repeat(64) }));
  mutant('G12', 'an unapproved decision is refused', refusal({ ...good, approvals: { ...approvals, practicalThreshold: { value: null, status: 'UNDECIDED' } } }, H));
  check('G12', 'the shipped config is unfrozen and every required decision is not APPROVED', CFG.FROZEN === false && CFG.REQUIRED_FOR_OFFICIAL.some(k => CFG.APPROVALS[k].status !== 'APPROVED'));
  const cli = spawnSync(process.execPath, [path.join(HERE, 'orchestrate.mjs'), 'inventory', '--mode', 'official', '--out', path.join(TMP, 'official')], { encoding: 'utf8' });
  check('G12', 'the CLI refuses official mode (exit != 0, refusal text)', cli.status !== 0 && /official stage refused/.test(cli.stderr), (cli.stderr || '').trim().split('\n')[0]);
  check('G12', 'seed policy: candidate block and out-of-domain seeds refused for development; official refused without a record',
    !CFG.seedPolicy('development', CFG.BLOCK.start).ok && !CFG.seedPolicy('development', CFG.DEVELOPMENT_DOMAIN.hi + 1).ok && CFG.seedPolicy('development', D0).ok && !CFG.seedPolicy('official', D0).ok);
  check('G12', 'no official output directory was created', !fs.existsSync(path.join(TMP, 'official')));
}

// ---------------- G13: hygiene ----------------
console.log('\n== G13 repository hygiene ==');
{
  const tracked = git('status', '--porcelain', '--untracked-files=no').trim().split('\n').filter(Boolean);
  check('G13', 'no tracked file is modified', tracked.length === 0, tracked.slice(0, 3).join(' | '));
  const harnessFiles = fs.readdirSync(HERE, { withFileTypes: true }).filter(d => d.isFile()).map(d => d.name);
  check('G13', 'the harness directory holds only the expected files', harnessFiles.every(f => /^(admission|analyze|config|driver|episodes|inventory|orchestrate|validity|verify_mcf1)\.mjs$|^README\.md$|^\.gitignore$/.test(f)), harnessFiles.join(' '));
  const PATTERNS = [new RegExp('[A-Za-z]:[\\\\/]+Us' + 'ers'), new RegExp('/c/Us' + 'ers/'), new RegExp('Man' + 'ish', 'i'), new RegExp('App' + 'Data'), new RegExp('MAN' + 'ISH~1')];
  const files = fs.readdirSync(HERE).filter(f => /\.(mjs|md)$|^\.gitignore$/.test(f));
  const leaks = []; for (const f of files) { const t = fs.readFileSync(path.join(HERE, f), 'utf8'); for (const p of PATTERNS) if (p.test(t)) leaks.push(`${f}:${p}`); }
  check('G13', 'no local path or account name in any harness file', leaks.length === 0, leaks.join(' '));
  mutant('G13', 'the path scanner detects an injected local path', PATTERNS.some(p => p.test('C:' + '\\Us' + 'ers\\someone\\x')));
  const banned = []; for (const f of ['orchestrate.mjs', 'analyze.mjs', 'validity.mjs', 'admission.mjs', 'inventory.mjs', 'config.mjs', 'episodes.mjs']) { const t = fs.readFileSync(path.join(HERE, f), 'utf8').replace(/\/\/.*$/gm, ''); if (/Date\.now\(|Math\.random\(|new Date\(/.test(t)) banned.push(f); }
  check('G13', 'no clock or Math.random in analysis, orchestration, validity, admission, inventory, config', banned.length === 0, banned.join(','));
  const touched = git('diff', '--name-only', 'HEAD').split('\n').filter(Boolean);
  check('G13', 'H1-R and registry files are untouched', !touched.some(f => /^experiments\/(h1r|registry)\//.test(f)));
}

// ---------------- G14 summary of the end-to-end dry run ----------------
console.log('\n== G14 end-to-end development dry run ==');
{
  const an = ANA.analyzeFrame({ vManifest: Vs.manifest, oManifest: Oh.manifest, admissionSummary: admDev.summary, qualificationSummary: Q.summary });
  check('G14', 'all stages ran without a halt and every manifest is self-consistent', !Q.halted && !Vs.halted && !Oh.halted && VAL.manifestIntact(Vs.manifest) && VAL.manifestIntact(Oh.manifest));
  check('G14', 'analysis is a census: no inference, primary descriptive is the provisional T_frame', an.inference.performed === false && an.primaryDescriptive.name === 'T_frame' && an.primaryDescriptive.status === 'PROVISIONAL');
  check('G14', 'claims block lists permitted and prohibited conclusions', an.claims.permitted.length >= 3 && an.claims.prohibited.includes('goal arrival or task completion'));
  const art = ORC.writeArtifact(path.join(TMP, 'artifacts'), 'analysis.json', an);
  check('G14', 'artifact writer produces a file whose sidecar hash matches its bytes', CFG.sha256(fs.readFileSync(path.join(TMP, 'artifacts', 'analysis.json'), 'utf8')) === art.sha256 && fs.readFileSync(path.join(TMP, 'artifacts', 'analysis.json.sha256'), 'utf8').trim() === art.sha256);
}

console.log(`\nRESULT: ${passed} checks passed, ${failed} failed; mutants caught ${mutantsCaught}, missed ${mutantsMissed}`);
fs.rmSync(TMP, { recursive: true, force: true });
process.exit(failed === 0 && mutantsMissed === 0 ? 0 : 1);
