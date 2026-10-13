// ==========================================================
// MCF-1 harness — verification gates (development seeds and synthetic records only)
// ==========================================================
//   node experiments/mcf1/verify_mcf1.mjs
// Exit code 0 iff every gate passed AND every mutant was caught.  Each mutant corrupts one safeguard and the
// gate that protects it must then fail; a mutant that is not caught means the gate is vacuous.
//
// R1 mutants are SOURCE mutants: the harness modules are copied to a temporary directory, one uniquely-anchored
// edit is applied, the imports are rewritten to absolute URLs, and the SAME gate function is run against the
// mutated module graph.  An anchor that is missing or not unique aborts the run (no silent no-op mutants).
//
// Boundaries kept by this verifier: it never scans or executes the candidate confirmatory block (every admission
// scan goes through scanSafe), consumes no official seed, creates no registry entry or freeze record, and runs
// no official stage.  Synthetic raw seeds lie inside the exploratory development domain.
//
// Pinned values below were measured earlier on the exploratory development block (cold census / fidelity pass)
// and in the M-MCF1-HARNESS milestone.  They are regression pins, not new science.
// ==========================================================
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as CFG from './config.mjs';
import * as INV from './inventory.mjs';
import * as ADM from './admission.mjs';
import * as EPI from './episodes.mjs';
import * as VAL from './validity.mjs';
import * as FRM from './frame.mjs';
import * as ANA from './analyze.mjs';
import * as ORC from './orchestrate.mjs';
import { createTrajectoryRegistry, TRAJECTORY_RECORDS, TRAJECTORY_HELD_OUT, TRAJECTORY_AUTHORIZATIONS, trajectory, trajectorySeed, listSha256Of } from '../registry/typed_v2.js';
import * as LCK from './lock.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url)), REPO = path.resolve(HERE, '..', '..');
let failed = 0, passed = 0, mutantsCaught = 0, mutantsMissed = 0;
const check = (gate, name, cond, detail = '') => { if (cond) passed++; else failed++; console.log(`${cond ? 'PASS' : 'FAIL'} [${gate}] ${name}${detail ? ' :: ' + detail : ''}`); };
const mutant = (gate, name, caught, detail = '') => { if (caught) mutantsCaught++; else mutantsMissed++; console.log(`${caught ? 'MUTANT-CAUGHT' : 'MUTANT-MISSED'} [${gate}] ${name}${detail ? ' :: ' + detail : ''}`); };
const git = (...a) => execFileSync('git', ['-C', REPO, ...a], { encoding: 'utf8' });
const near = (a, b, t = 1e-9) => Math.abs(a - b) <= t;
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const TMPREAL = fs.realpathSync.native(os.tmpdir());
const TMP = fs.mkdtempSync(path.join(TMPREAL, 'mcf1-verify-'));
const D0 = 1_100_000_000;

/** every admission scan in this verifier goes through here: the candidate confirmatory block is never scanned */
const scanSafe = (args) => {
  const lo = CFG.BLOCK.start, hi = CFG.BLOCK.start + CFG.BLOCK.scanLength;
  if (args.start < hi && args.start + args.length > lo) throw new Error('verifier refuses to scan the candidate confirmatory block');
  return ADM.admitScan(args);
};

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
  check('G1', 'R3 class = one segment per environment slot', cls.R3_ENV_SLOTS === 1920, String(cls.R3_ENV_SLOTS));
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

// ---------------- G2: admission (no scan of the candidate block) ----------------
console.log('\n== G2 deterministic admission ==');
{
  // the candidate scan was MEASURED in M-MCF1-HARNESS (9aaf22e); R1 forbids scanning it again, so it is recorded here, not recomputed
  const RECORDED = { provenance: 'measured in M-MCF1-HARNESS (9aaf22e); not re-scanned in R1', start: 1_500_000_000, length: 4000, admitted: 3851, rejected: 149, firstReasonR3: 24, firstReasonH1R: 125 };
  check('G2', 'candidate block configuration equals the recorded scan (start, length), labelled CANDIDATE_NOT_AUTHORIZED, and the record is arithmetically consistent',
    CFG.BLOCK.start === RECORDED.start && CFG.BLOCK.scanLength === RECORDED.length && CFG.BLOCK.status === 'CANDIDATE_NOT_AUTHORIZED' && RECORDED.admitted + RECORDED.rejected === RECORDED.length && RECORDED.firstReasonR3 + RECORDED.firstReasonH1R === RECORDED.rejected);
  const S = { start: 1_600_000_000, length: 1000, category: 'registered' };      // a NON-candidate block: structural properties of the scan
  const a1 = scanSafe({ ...S, inventory: inv1 }), a2 = scanSafe({ ...S, inventory: inv2 });
  check('G2', 'scan is deterministic (identical list hash on a rebuilt inventory)', a1.summary.admittedSha256 === a2.summary.admittedSha256 && a1.sha256 === a2.sha256);
  check('G2', 'full rejection accounting: admitted + rejected = scanned, every rejection has a first reason, first-reason counts sum to the rejections',
    a1.summary.admitted + a1.summary.rejected === S.length && a1.rejected.every(r => r.reasons.length >= 1) && Object.values(a1.summary.rejectedByFirstReason).reduce((x, y) => x + y, 0) === a1.summary.rejected,
    `${a1.summary.admitted}/${a1.summary.rejected} ${JSON.stringify(a1.summary.rejectedByFirstReason)}`);
  const cand = Object.entries(a1.summary.rejectedByFirstReason).filter(([id]) => id === 'R3_ENV_SLOTS' || id === 'H1R_RECORDS_AND_DOMAIN').sort((x, y) => y[1] - x[1])[0];
  const drop = cand ? cand[0] : null;
  const a3 = drop ? scanSafe({ ...S, inventory: INV.buildInventory({ exclude: [drop] }) }) : null;
  mutant('G2', `admission against an inventory without ${drop} admits a different list`, !!a3 && a3.summary.admittedSha256 !== a1.summary.admittedSha256 && a3.summary.admitted > a1.summary.admitted, a3 ? `${a1.summary.admitted} -> ${a3.summary.admitted}` : 'no R3/H1-R rejection in the sample');
  let refused = 0; for (const [s, l] of [[CFG.M32 - 5, 10], [-1, 5], [10, 0]]) { try { scanSafe({ start: s, length: l, inventory: inv1 }); } catch (e) { refused++; } }
  check('G2', 'scans that would alias modulo 2^32 or are empty are refused', refused === 3);
  const ex = scanSafe({ start: D0, length: 50, inventory: inv1, category: 'registered' });
  check('G2', 'with the full inventory every exploratory seed is rejected (lag-0 identity)', ex.summary.admitted === 0 && ex.summary.rejectedByFirstReason.lag0 === 50);
  let guarded = false; try { scanSafe({ start: CFG.BLOCK.start, length: 1, inventory: inv1 }); } catch (e) { guarded = /candidate confirmatory block/.test(e.message); }
  check('G2', 'the verifier itself cannot scan the candidate block (scanSafe self-test)', guarded);
}

// ---------------- G3: translation collisions ----------------
console.log('\n== G3 consecutive-integer blocks collide wholesale ==');
{
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
  check('G3', 'control block at 1,600,000,000 (not the candidate): no seed collides with an examined class or the development block',
    [OFFLINE, 'EXAMINED_1P2E9', CFG.DEV_BLOCK.id].every(c => blockHits(1_600_000_000, c).n === 0));
  const lag0AtM = INV.derivedSeeds(1_300_000_000);
  check('G3', 'the collision is NOT a lag-0 identity (no derived seed equals a reserved one), so the registry check cannot see it', !INV.STREAMS.some(n => inv1.derived.has(lag0AtM[n])));
  const noOffline = INV.buildInventory({ exclude: [OFFLINE] });
  const withClass = scanSafe({ start: 1_300_000_000, length: 50, inventory: inv1, category: 'registered' });
  const without = scanSafe({ start: 1_300_000_000, length: 50, inventory: noOffline, category: 'registered' });
  check('G3', 'full inventory admits none of the first 50 seeds of the 1.3e9 block', withClass.summary.admitted === 0, `${withClass.summary.admitted}/50`);
  mutant('G3', 'an inventory without the examined offline class would admit the colliding block', without.summary.admitted >= 45, `${without.summary.admitted}/50 admitted`);
}

// ---------------- G4: registry semantics ----------------
console.log('\n== G4 registry clause semantics ==');
{
  const scan = scanSafe({ start: 1_700_000_000, length: 100, inventory: inv1, category: 'registered' });
  const probe = scan.admitted[0];
  check('G4', 'a probe seed outside the candidate block is admitted by the live registry (AVAILABLE)', Number.isSafeInteger(probe) && probe >= 1_700_000_000, String(probe));
  const rec = (value, study, status) => ({ namespace: 'trajectory', value, study, status, executed: false, authorization: 'in-memory verification only', artifact: 'none', why: 'registry clause semantics' });
  const mk = ({ records = [], heldOut = [] }) => createTrajectoryRegistry({ records: [...TRAJECTORY_RECORDS, ...records], heldOut: [...TRAJECTORY_HELD_OUT, ...heldOut], authorizations: TRAJECTORY_AUTHORIZATIONS });
  const one = (registry, category = 'registered') => scanSafe({ start: probe, length: 1, inventory: inv1, category, registry });
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
  const refuses = (v) => { try { trajectory.checkUse(trajectorySeed(v), { study: CFG.STUDY, category: 'registered' }); return 'AVAILABLE'; } catch (e) { return e.code; } };
  check('G4', 'H1-R pilot seed 20260819004 is refused for MCF-1 by the registry', refuses(20260819004) === 'CONSUMED_BY_OTHER_STUDY');
  check('G4', 'documented gap: reserved but unrecorded Stage-2 seed 20260819100 is AVAILABLE to the registry', refuses(20260819100) === 'AVAILABLE');
  check('G4', 'a raw seed >= 2^32 cannot be scanned (it would alias another seed modulo 2^32)', (() => { try { scanSafe({ start: 20260819100, length: 1, inventory: inv1 }); return false; } catch (e) { return /2\^32/.test(e.message); } })());
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

// ---------------- G7: pair rule / identity class against brute force ----------------
console.log('\n== G7 pair rule against brute force ==');
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
  check('G7', 'the pair classes follow/equal are exactly those whose first-edge contrast has support within {0,1} (descriptive label only after R1)', soundOk);
  check('G7', 'the other classes are labelled non-regular only where the contrast is not confined to {0,1}, or is identically 0', leftOut.every(s => ['(6,13)', '(13,6)'].includes(s)) || leftOut.length === 0, leftOut.join(' ') || 'none');
  const badPair = (x9, x11) => (x9 === 9 && x11 === 11) || x9 === x11 || (x9 === 11 && x11 === 9);
  mutant('G7', 'a classifier that labels the reversed pair (11,9) regular violates the support', E.some(x9 => E.some(x11 => badPair(x9, x11) && !VAL.classifyPair(x9, x11).supportOK && (() => { const sup = new Set(); for (const xC of E) for (const v of brute(xC, x9, x11).sup) sup.add(v); return [...sup].some(v => v < 0); })())));
  const badIdent = (xC, x9, x11) => [xC, x9, x11].every(e => [6, 9, 11].includes(e));
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
  check('G6', 'qualification: 3 qualified (offsets 0, 60, 92), 5 replay-at-call-0, 92 other start node, no halt',
    same(Q.qualified.map(x => x - D0), [0, 60, 92]) && Q.summary.rejectedByReason.REPLAY_AT_CALL0 === 5 && Q.summary.rejectedByReason.START_NODE === 92 && !Q.summary.rejectedByReason.RUN && !Q.halted, JSON.stringify(Q.summary.rejectedByReason));
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
  const twinOk = Q.qualified.every(raw => ['C', 'M9', 'M11'].every(c => VAL.fingerprintPre(rec(raw, `${c}|T9`)) === VAL.fingerprintPre(rec(raw, `${c}|T11`))));
  check('G6', 'twin invariance with memory present on all qualified seeds', twinOk);
  const e0 = Vs.manifest.entries.find(x => x.raw === D0);
  const fpMut = { ...rec(D0, 'M9|T9'), step0: rec(D0, 'M9|T9').step0.map((c, i) => (i === 0 ? { ...c, F: c.F + 1e-6 } : c)) };
  mutant('G6', 'a perturbed candidate score changes the fingerprint (V5/V9 would see it)', VAL.fingerprintPre(fpMut) !== e0.fingerprints['M9|T9']);
  check('G6', 'R1 entry fields present on real records: failures map, pair class, signed-score inputs and the inferred exploration indicator',
    Vs.manifest.entries.every(e => e.failures && typeof e.failures === 'object' && ['follow', 'equal', 'reversed', 'mixed'].includes(e.pairClass) && e.exploration && e.exploration.indicator === 'inferred'));
}

// ---------------- G8: legality and the illegal-action counter ----------------
console.log('\n== G8 legality predicate and the blockedIllegal capture ==');
{
  const src = fs.readFileSync(path.join(ctx.treeDir, 'main.js'), 'utf8');
  check('G8', 'conformed tree carries N1-MASK, N1-MASK-SEM and N1-GUARD with the counter', src.includes('H1R N1-MASK:') && src.includes('H1R N1-MASK-SEM:') && src.includes('H1R N1-GUARD') && src.includes('blockedIllegal++'));
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
  const r1 = VAL.validateSeedO({ raw: D0, vEntry: e, runs: m1 });
  mutant('G8', 'blockedIllegal = 1 invalidates the seed (V4b) and the failing run is attributed', r1.hardSeed.includes('V4b') && same(r1.failures.V4b, ['M9|T9']));
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
  check('G9', 'each stop point recorded its own probe', Oh.records[0].probes.some(p => p.phase === 'after-attempt') && Oc.records[0].probes.some(p => p.phase === 'call2-start'));
  const e = JSON.parse(JSON.stringify(Vs.manifest.entries.find(x => x.raw === D0))); e.fingerprints['M9|T9'] = 'x'.repeat(64);
  const runsO = Object.fromEntries(['C|T9', 'C|T11', 'M9|T9', 'M9|T11', 'M11|T9', 'M11|T11'].map(k => [k, Oh.records.find(r => r.label === `O|attempt-hook|${D0}|${k}`)]));
  const v9 = VAL.validateSeedO({ raw: D0, vEntry: e, runs: runsO });
  mutant('G9', 'a fingerprint mismatch halts the stage (V9) and is not a seed exclusion', v9.haltStage.includes('V9') && !v9.hardSeed.includes('V9') && same(v9.haltDetail.V9, ['M9|T9']));
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
  const res = spawnSync(process.execPath, [path.join(HERE, 'driver.mjs'), JSON.stringify({ mode: 'V', stopAt: 'decision', policy: 'development', tree: ctx.treeDir, label: 'x', agentSeed: CFG.DEVELOPMENT_DOMAIN.hi + 1, content: 'C', twin: 'T9', configSeed: 100000, configIndex: 1 })], { encoding: 'utf8' });
  check('G10', 'the driver refuses a seed outside the exploratory development domain before loading any runtime', res.status !== 0 && /MCF-1 driver refused: development runs are confined to the exploratory development domain/.test(res.stderr));
}

// ---------------- G11: analysis on the real development frame ----------------
console.log('\n== G11 census analysis on the real development frame ==');
const anaDev = ANA.analyzeFrame({ vManifest: Vs.manifest, oManifest: Oh.manifest, admissionSummary: admDev.summary, qualificationSummary: Q.summary, admittedList: admDev.admitted });
{
  const m = anaDev.metrics;
  check('G11', 'development frame (3 complete seeds): T_frame sum 2 of 3, followRate 2/3, net shift 1/3, first-edge contrast sum 1 of 3, all on one frame',
    anaDev.frame.size === 3 && m.T_frame.sum === 2 && m.T_frame.n === 3 && near(m.T_frame.value, 2 / 3) && near(m.followRate.value, 2 / 3) && near(m.netShift.value, 1 / 3) && anaDev.firstEdgeOutcome.firstEdgeContrast_GOODminusBAD.sum === 1 && anaDev.firstEdgeOutcome.firstEdgeContrast_GOODminusBAD.n === 3);
  check('G11', 'a 3-seed frame is below the 100-seed minimum: interpretation refused, primary value withheld, no permitted claim',
    anaDev.interpretation.allowed === false && anaDev.primaryDescriptive.value === null && anaDev.claims.permitted.length === 0 && /below the minimum of 100/.test(anaDev.interpretation.reason));
  check('G11', 'no inference is produced (no p-value, interval or test fields)', anaDev.inference.performed === false && anaDev.practicalThreshold === 'none' && !JSON.stringify(anaDev).match(/pValue|confidenceInterval|"significance":true/));
  check('G11', 'the analysis verifies: hash, frame hash and every metric carries the frame hash and denominator', ANA.verifyAnalysis(anaDev) === true);
  check('G11', 'frame reconciliation on real stages: 3 valid at V - 0 excluded at O = 3 complete clusters',
    anaDev.reconciliation.stageV.valid === 3 && anaDev.reconciliation.stageO.invalid === 0 && anaDev.reconciliation.completeClusterFrame === 3 && anaDev.reconciliation.consistent === true);
  const pre = ANA.analyzeFrame({ vManifest: Vs.manifest });
  check('G11', 'with the outcome stage absent the analysis is a labelled pre-outcome snapshot with its own frame hash and the same steering numbers',
    pre.frame.kind === 'pre-outcome' && pre.frame.sha256 !== anaDev.frame.sha256 && pre.firstEdgeOutcome.status === 'NOT_RUN' && pre.interpretation.allowed === false && same(pre.metrics.T_frame.sum, anaDev.metrics.T_frame.sum));
}

// ---------------- G12: official-stage refusal ----------------
console.log('\n== G12 official-stage refusal ==');
{
  // R2: authorization is parameterless and committed-state-derived; the full attack matrix (synthetic records, injected
  // options, direct driver calls, receipts) lives in verify_r2.mjs.  Here: the shipped state refuses at the first guard.
  const refusalOf = (fn) => { try { fn(); return null; } catch (e) { return String(e.message); } };
  check('G12', 'no authorization exists: officialAuthorisation() refuses (the design is not frozen)', /official stage refused: the design is not frozen/.test(refusalOf(() => LCK.officialAuthorisation()) || ''));
  check('G12', 'makeContext accepts no freeze record, pin, registry or authorization option (every one is refused by name)',
    ['freeze', 'actual', 'authorization', 'registry', 'pinnedFreezeSha256'].every(k => /accepts no option other than policy and concurrency/.test(refusalOf(() => ORC.makeContext({ policy: 'official', [k]: {} })) || '')));
  check('G12', 'an official context cannot be created in the shipped state', /official stage refused/.test(refusalOf(() => ORC.makeContext({ policy: 'official' })) || ''));
  check('G12', 'the shipped config is unfrozen, nothing in it carries the APPROVED status, and the config exports no authority',
    CFG.FROZEN === false && Object.values(CFG.APPROVALS).every(a => a.status !== 'APPROVED') && CFG.REQUIRED_FOR_OFFICIAL.every(k => k in CFG.APPROVALS)
    && !('OFFICIAL_AUTHORIZATION' in CFG) && !('assertFreezeAuthorised' in CFG) && !('assertOfficialAllowed' in CFG));
  const cli = spawnSync(process.execPath, [path.join(HERE, 'orchestrate.mjs'), 'inventory', '--mode', 'official'], { encoding: 'utf8' });
  check('G12', 'the CLI refuses official mode (exit != 0, refusal text)', cli.status !== 0 && /official stage refused/.test(cli.stderr), (cli.stderr || '').trim().split('\n')[0]);
  check('G12', 'seed policy: candidate block and out-of-domain seeds refused for development; official refused without a record',
    !CFG.seedPolicy('development', CFG.BLOCK.start).ok && !CFG.seedPolicy('development', CFG.BLOCK.start + CFG.BLOCK.scanLength - 1).ok && !CFG.seedPolicy('development', CFG.DEVELOPMENT_DOMAIN.hi + 1).ok && CFG.seedPolicy('development', D0).ok && !CFG.seedPolicy('official', D0).ok && !CFG.seedPolicy('official', CFG.BLOCK.start).ok);
  check('G12', 'no official output directory was created', !fs.existsSync(path.join(TMP, 'official')));
}

// ---------------- G13: hygiene ----------------
console.log('\n== G13 repository hygiene ==');
{
  const tracked = git('status', '--porcelain', '--untracked-files=no').split('\n').filter(Boolean);     // no trim: the first column of a line may be a space
  // R2 also deliberately edits two registry documents (the legacy-importer baseline loses the six migrated entries and
  // the registry README describes it); nothing else outside experiments/mcf1 may differ from HEAD
  const R2_REGISTRY_EDITS = ['experiments/registry/legacy_typed_importers.json', 'experiments/registry/README.md'];
  const trackedOutside = tracked.map(l => l.slice(3)).filter(f => !f.startsWith('experiments/mcf1/') && !R2_REGISTRY_EDITS.includes(f));
  check('G13', 'no tracked file outside experiments/mcf1 (and the two registry documents R2 edits) is modified', trackedOutside.length === 0, trackedOutside.slice(0, 3).join(' | '));
  const harnessFiles = fs.readdirSync(HERE, { withFileTypes: true }).filter(d => d.isFile()).map(d => d.name);
  check('G13', 'the harness directory holds only the expected files', harnessFiles.every(f => /^(admission|analyze|authorization|config|driver|envidentity|episodes|frame|inventory|lock|orchestrate|prepare_tree|validity|verify_mcf1|verify_r2)\.mjs$|^README\.md$|^\.gitignore$/.test(f)), harnessFiles.join(' '));
  const PATTERNS = [new RegExp('[A-Za-z]:[\\\\/]+Us' + 'ers'), new RegExp('/c/Us' + 'ers/'), new RegExp('Man' + 'ish', 'i'), new RegExp('App' + 'Data'), new RegExp('MAN' + 'ISH~1')];
  const files = fs.readdirSync(HERE).filter(f => /\.(mjs|md)$|^\.gitignore$/.test(f));
  const leaks = []; for (const f of files) { const t = fs.readFileSync(path.join(HERE, f), 'utf8'); for (const p of PATTERNS) if (p.test(t)) leaks.push(`${f}:${p}`); }
  check('G13', 'no local path or account name in any harness file', leaks.length === 0, leaks.join(' '));
  mutant('G13', 'the path scanner detects an injected local path', PATTERNS.some(p => p.test('C:' + '\\Us' + 'ers\\someone\\x')));
  const banned = []; for (const f of ['orchestrate.mjs', 'analyze.mjs', 'frame.mjs', 'validity.mjs', 'admission.mjs', 'inventory.mjs', 'config.mjs', 'episodes.mjs', 'lock.mjs', 'envidentity.mjs', 'authorization.mjs']) { const t = fs.readFileSync(path.join(HERE, f), 'utf8').replace(/\/\/.*$/gm, ''); if (/Date\.now\(|Math\.random\(|new Date\(/.test(t)) banned.push(f); }
  check('G13', 'no clock or Math.random in analysis, frame, orchestration, validity, admission, inventory, config', banned.length === 0, banned.join(','));
  const touched = git('diff', '--name-only', 'HEAD').split('\n').filter(Boolean);
  check('G13', 'H1-R files and the registry code and data are untouched (only the two documented registry documents may differ)', !touched.some(f => /^experiments\/(h1r|registry)\//.test(f) && !R2_REGISTRY_EDITS.includes(f)));
  const regFiles = fs.existsSync(path.join(HERE, 'data')) ? fs.readdirSync(path.join(HERE, 'data')).filter(f => f !== '.gitignore') : [];
  check('G13', 'no registry entry, freeze record or output artifact exists in the harness data directory', regFiles.length === 0, regFiles.join(' '));
}

// ==========================================================
// R1 gates: synthetic records through the REAL validators, with source mutants
// ==========================================================
console.log('\n== R1 gates (synthetic complete-cluster records; source-mutated module copies) ==');
const EXPECTED = ctx.expectedIdentity;
const SR = (k) => D0 + 1000 + k;                                   // synthetic raw seeds inside the exploratory development domain (arithmetic only)
const CONTENTS = ['C', 'M9', 'M11'], TWINS = ['T9', 'T11'];
const FA = 'f'.repeat(64);

function synthRun({ raw, content, twin, x, best, stage, ok }) {
  const isO = stage === 'O';
  return {
    label: `${stage}|${raw}|${content}|${twin}`, mode: stage, stopAt: isO ? 'attempt-hook' : 'decision', outcome: { abortedBySentinel: true, error: null },
    calls: 1, startNode: 10, chosen: x, brainHash: EPI.REGISTERED_BRAIN_HASHES[content], installedP: {},
    step0: [6, 9, 11, 13].map(k => ({ key: k, returned: k === best ? 4.2 : 3, w: 2, applied: 1, arb: [], unc: 0.75, selfLoop: 0, F: k === best ? 4.2 : 3, trustTerm: 0 })),
    decisions: [[0, x]], bests: [[0, 0, best, 4]], replays: [], attempts: isO ? [[0, 10, x, ok]] : [],
    legality: { candidatesAreEdges: [true, true, true, true], executedIsEdge: true, executedLegalMove: true },
    h1r: { on: true, blockedIllegal: 0, drawFaults: 0, envDrawsSeen: isO ? 1 : 0, edgeAttempts: 0, noDecision: 0, slips: 0, realised: 0 },
    artifacts: { cogDraws: 653, visDraws: 3020, envCounters: { attempts: 0, successes: 0, slips: 0, envDraws: isO ? 1 : 0 } },
    executedEdgeP: isO ? (ok ? 1 : 0) : null,                      // p in {0,1}: ok = 1{u1 < p} holds for every u1 in [0,1)
    tree: { name: 'synthetic', manifestSha256: EXPECTED.manifestSha256, b2Commit: EXPECTED.b2Commit, transformSha256: 'x' },
    probes: [
      { phase: 'call0-start', calls: 1, episodes: content === 'C' ? [] : [{ id: `syn_${content}`, nodes: CFG.FRAME.routes[content === 'M9' ? 9 : 11].slice(), hasActiveGoal: false }], embeddingSha: 'e'.repeat(64) },
      { phase: 'at-decision', calls: 1, Q: { size: 0, sum: 0 }, transitions: { outer: 0, entries: 0 }, rewards: 0, penalties: 0, confidenceMap: 0, pathAttempts: 0, pathSuccesses: 0 },
    ],
  };
}
const defaultOk = (c, t, x) => (x === (t === 'T9' ? 9 : 11) ? 1 : 0);        // stand-in outcome rule: success iff the executed edge is the reliable one
function makeCohort(B, specs, { tweaks = [], haltCount } = {}) {
  const vRuns = new Map(), oRuns = new Map(), vAll = [], oAll = [];
  const T = new Map(tweaks.map(t => [`${t.stage}|${t.raw}|${t.key}`, t.fn]));
  for (const s of specs) {
    const vr = {}, or = {};
    for (const c of CONTENTS) for (const t of TWINS) {
      const k = `${c}|${t}`, x = s.pattern[c === 'C' ? 'xC' : c === 'M9' ? 'x9' : 'x11'], best = s.best ? s.best[c] : x, ok = defaultOk(c, t, x);
      for (const stage of ['V', 'O']) {
        const r = synthRun({ raw: s.raw, content: c, twin: t, x, best, stage, ok });
        const fn = T.get(`${stage}|${s.raw}|${k}`); if (fn) fn(r);
        (stage === 'V' ? vr : or)[k] = r; (stage === 'V' ? vAll : oAll).push(r);
      }
    }
    vRuns.set(s.raw, vr); oRuns.set(s.raw, or);
  }
  const raws = specs.map(s => s.raw);
  const vOut = B.ORC.assembleV({ qualified: raws, runsBySeed: vRuns, allRecs: vAll, expectedIdentity: EXPECTED, sources: {}, admittedSet: new Set(raws), registryOf: () => 'AVAILABLE', policy: 'development' });
  const oArgs = { vManifest: vOut.manifest, runsBySeed: oRuns, allRecs: oAll, expectedIdentity: EXPECTED, sources: {}, stopAt: 'attempt-hook' };
  if (haltCount !== undefined) oArgs.haltCount = haltCount;
  return { vOut, oOut: B.ORC.assembleO(oArgs), raws };
}
const P = (xC, x9, x11) => ({ xC, x9, x11 });
// hand-computed S(x9,x11) = 1/2 (1{x9=9} - 1{x9=11} + 1{x11=11} - 1{x11=9}), indexed [x9][x11]; independent of the implementation
const S_TABLE = { 6: { 6: 0, 9: -0.5, 11: 0.5, 13: 0 }, 9: { 6: 0.5, 9: 0, 11: 1, 13: 0.5 }, 11: { 6: -0.5, 9: -1, 11: 0, 13: -0.5 }, 13: { 6: 0, 9: -0.5, 11: 0.5, 13: 0 } };
const COHORT12 = [P(9, 9, 11), P(11, 9, 11), P(9, 9, 9), P(11, 11, 11), P(9, 11, 9), P(9, 9, 6), P(6, 6, 6), P(13, 13, 13), P(9, 9, 11), P(11, 9, 11), P(9, 9, 11), P(6, 9, 11)].map((p, i) => ({ raw: SR(i), pattern: p }));
const sumS = (specs) => specs.reduce((a, s) => a + S_TABLE[s.pattern.x9][s.pattern.x11], 0);
const spec100 = (n = 100) => {
  const mix = [[60, P(9, 9, 11)], [20, P(6, 9, 11)], [10, P(9, 9, 9)], [10, P(9, 11, 9)]], out = [];
  for (const [k, p] of mix) for (let i = 0; i < k; i++) out.push({ raw: SR(10_000 + out.length), pattern: p });
  return out.slice(0, n);
};
const res = (r) => (typeof r === 'boolean' ? { ok: r } : r);

const TESTS = new Map();
const def = (id, gate, desc, fn) => TESTS.set(id, { id, gate, desc, fn });

def('g15.ledger', 'G15', 'ledger values: T_frame primary, min frame 100, no threshold, halt count 1, candidate block 1.5e9/4000 CANDIDATE_NOT_AUTHORIZED, budgets 4096/16384/64, complete-cluster frame, V6 diagnostic, the adopted study configuration; nothing APPROVED, FROZEN false', (B) => {
  const A = B.CFG.APPROVALS;
  return A.primaryDescriptive.value === 'T_frame' && A.minimumValidFrame.value === 100 && A.practicalThreshold.value === 'none' && A.instrumentHaltCount.value === 1
    && A.seedBlock.value === 1_500_000_000 && A.scanLength.value === 4000 && A.seedBlock.status === 'CANDIDATE_NOT_AUTHORIZED' && A.scanLength.status === 'CANDIDATE_NOT_AUTHORIZED' && B.CFG.BLOCK.status === 'CANDIDATE_NOT_AUTHORIZED'
    && B.CFG.BUDGETS.cognitive === 4096 && B.CFG.BUDGETS.visual === 16384 && B.CFG.BUDGETS.environment === 64
    && A.completeClusterFrame.value === 'complete-cluster' && A.v6Handling.value === 'diagnostic' && A.samplingDesign.value === 'C'
    && A.studyConfiguration.value === B.CFG.STUDY_CONFIGURATION && B.CFG.STUDY_CONFIGURATION.adoptedFromDevelopment === true && B.CFG.STUDY_CONFIGURATION.seed === 100000 && B.CFG.STUDY_CONFIGURATION.acceptedSeed === 100026
    && B.CFG.FROZEN === false && Object.values(A).every(a => a.status !== 'APPROVED') && B.CFG.REQUIRED_FOR_OFFICIAL.every(k => k in A);
});
def('g16.table', 'G16', 'primary score S_s equals the hand-computed value for all 16 (x9,x11) pairs (negative, zero, positive and off-pattern)', (B) =>
  [6, 9, 11, 13].every(x9 => [6, 9, 11, 13].every(x11 => B.ANA.SCORES.steering({ xC: 9, x9, x11 }) === S_TABLE[x9][x11])));
def('g16.mean', 'G16', 'T_frame = arithmetic mean of S_s over the frame: 8 hand-computed seeds incl. reversed, mixed and distractor patterns give sum 2, n 8, T_frame 0.25, followRate 3/8', (B) => {
  const pats = [P(9, 9, 11), P(11, 9, 11), P(9, 9, 11), P(9, 9, 9), P(9, 11, 9), P(9, 9, 6), P(9, 11, 6), P(13, 13, 13)];
  const m = B.ANA.computeMetrics(pats.map((p, i) => ({ raw: i, pattern: p, exploration: null, diagnostics: [], pairClass: 'x' })), { size: 8, sha256: FA }).metrics;
  return m.T_frame.sum === 2 && m.T_frame.n === 8 && m.T_frame.value === 0.25 && m.followRate.value === 3 / 8 && m.T_frame.frameN === 8 && m.T_frame.frameSha256 === FA;
});
def('g16.equiv', 'G16', 'documented equivalence: S_s equals the previous follow indicator on every follow/equal pair (all 16 pair-regular triples with xC free) and differs on reversed (-1 vs 0) and mixed', (B) => {
  let eq = true, diff = false;
  for (const xC of [6, 9, 11, 13]) for (const x9 of [6, 9, 11, 13]) for (const x11 of [6, 9, 11, 13]) {
    const p = P(xC, x9, x11), cls = B.VAL.classifyPair(x9, x11).cls, S = B.ANA.SCORES.steering(p), F = B.ANA.SCORES.follow(p);
    if ((cls === 'follow' || cls === 'equal') && S !== F) eq = false;
    if (cls === 'reversed' && S === -1 && F === 0) diff = true;
  }
  return eq && diff;
});
def('g17.secondary', 'G17', 'secondary scores against a hand table (sigma, cold, net, non-specific) and the identities net = (S + N)/2 and N = 0 on the identity class over all 64 triples', (B) => {
  const H17 = [[9, 9, 11, 1, 0.5, 0.5, 0], [11, 9, 11, 1, 0.5, 0.5, 0], [9, 9, 9, 0.5, 0.5, 0, 0], [11, 11, 11, 0.5, 0.5, 0, 0], [6, 9, 11, 1, 0, 1, 1], [9, 6, 6, 0, 0.5, -0.5, -1], [6, 6, 6, 0, 0, 0, 0], [9, 11, 9, 0, 0.5, -0.5, 0], [13, 9, 9, 0.5, 0, 0.5, 1]];
  const tableOk = H17.every(([xC, x9, x11, s, c, n, N]) => { const p = P(xC, x9, x11), S = B.ANA.SCORES; return S.sigma(p) === s && S.cold(p) === c && S.net(p) === n && S.nonSpecific(p) === N; });
  let ident = true, classZero = true;
  for (const xC of [6, 9, 11, 13]) for (const x9 of [6, 9, 11, 13]) for (const x11 of [6, 9, 11, 13]) {
    const p = P(xC, x9, x11), S = B.ANA.SCORES;
    if (Math.abs(S.net(p) - (S.steering(p) + S.nonSpecific(p)) / 2) > 1e-12) ident = false;
    if (B.VAL.inIdentityClass(xC, x9, x11) && S.nonSpecific(p) !== 0) classZero = false;
  }
  return tableOk && ident && classZero;
});
def('g18.selector', 'G18', 'the primary selector changes the computed metric and its label: on a 100-seed frame T_frame sum 70, netShift sum 45; a non-ledger selection is flagged and never interpretable; unknown names are refused', (B) => {
  const { vOut, oOut } = makeCohort(B, spec100());
  const a = B.ANA.analyzeFrame({ vManifest: vOut.manifest, oManifest: oOut.manifest });
  const b = B.ANA.analyzeFrame({ vManifest: vOut.manifest, oManifest: oOut.manifest, primary: 'netShift' });
  let unknown = false; try { B.ANA.analyzeFrame({ vManifest: vOut.manifest, oManifest: oOut.manifest, primary: 'nope' }); } catch (e) { unknown = /unknown primary/.test(e.message); }
  return a.primaryDescriptive.name === 'T_frame' && a.primaryDescriptive.sum === 70 && near(a.primaryDescriptive.value, 0.7) && a.primaryDescriptive.status === 'LEDGER_PRIMARY' && a.interpretation.allowed === true
    && b.primaryDescriptive.name === 'netShift' && b.primaryDescriptive.sum === 45 && b.primaryDescriptive.status === 'NON_LEDGER_SELECTION_TEST_ONLY' && b.interpretation.allowed === false && b.primaryDescriptive.value === null && unknown;
});
def('g19.cluster', 'G19', 'one failed member of the six-run cluster excludes the WHOLE seed from every metric (V3 on one Stage-V run, attributed to that run only)', (B) => {
  const raw = SR(0);
  const { vOut, oOut } = makeCohort(B, COHORT12, { tweaks: [{ stage: 'V', raw, key: 'M11|T11', fn: (r) => { r.legality.candidatesAreEdges = [true, true, true, false]; } }] });
  const e = vOut.manifest.entries.find(x => x.raw === raw), rest = COHORT12.filter(s => s.raw !== raw);
  if (e.valid || !same(e.hard, ['V3']) || !same(e.failures.V3, ['M11|T11']) || vOut.halted) return { ok: false, detail: 'entry not excluded as expected' };
  const a = B.ANA.analyzeFrame({ vManifest: vOut.manifest, oManifest: oOut.manifest });
  return a.frame.size === 11 && !a.frame.seeds.includes(raw) && a.metrics.T_frame.sum === sumS(rest) && a.metrics.T_frame.n === 11 && a.reconciliation.stageV.valid === 11
    && a.exclusions.rows.some(r => r.stage === 'V' && r.rule === 'V3' && r.content === 'M11' && r.twin === 'T11' && r.seeds === 1) && B.ANA.verifyAnalysis(a) === true;
});
def('g19.stageO', 'G19', 'a Stage-O-only invalidation removes that seed from EVERY metric; V-only, O and complete-cluster counts reconcile (12 valid at V - 1 at O = 11)', (B) => {
  const raw = SR(1);
  const { vOut, oOut } = makeCohort(B, COHORT12, { haltCount: 2, tweaks: [{ stage: 'O', raw, key: 'C|T11', fn: (r) => { r.h1r.blockedIllegal = 1; } }] });
  if (vOut.manifest.counts.valid !== 12 || oOut.halted || oOut.manifest.counts.invalid !== 1) return { ok: false, detail: 'stage outcome not as constructed' };
  const a = B.ANA.analyzeFrame({ vManifest: vOut.manifest, oManifest: oOut.manifest }), rest = COHORT12.filter(s => s.raw !== raw);
  const allN = [a.metrics.T_frame.n, a.metrics.followRate.n, a.metrics.netShift.n, a.metrics.nonSpecific.n, a.metrics.sigmaBar.n, a.metrics.coldRate.n, a.executionRates.C.to9.n, a.executionRates.M11.other.n,
    a.firstEdgeOutcome.firstEdgeContrast_GOODminusBAD.n, a.firstEdgeOutcome.decomposition.GOODminusCOLD.n, a.pairClasses.follow.of, a.exploration.unionVisible.of];
  return a.frame.size === 11 && !a.frame.seeds.includes(raw) && allN.every(n => n === 11) && a.metrics.T_frame.sum === sumS(rest)
    && a.reconciliation.stageV.valid === 12 && a.reconciliation.stageO.invalid === 1 && a.reconciliation.completeClusterFrame === 11 && a.reconciliation.consistent === true
    && a.exclusions.rows.some(r => r.stage === 'O' && r.rule === 'V4b' && r.content === 'C' && r.twin === 'T11') && B.ANA.verifyAnalysis(a) === true;
});
def('g20.halt', 'G20', 'integrity failures halt the stage and are never seed exclusions: V9 and V12 at Stage O, V1 at Stage V, and a halted stage yields no frame', (B) => {
  const v9 = makeCohort(B, COHORT12, { tweaks: [{ stage: 'O', raw: SR(2), key: 'M9|T9', fn: (r) => { r.bests = [[0, 0, 6, 4]]; } }] });
  const e9 = v9.oOut.manifest.entries.find(x => x.raw === SR(2));
  const v12 = makeCohort(B, COHORT12, { tweaks: [{ stage: 'O', raw: SR(3), key: 'C|T9', fn: (r) => { r.attempts[0][3] = 1 - r.attempts[0][3]; } }] });
  const v1 = makeCohort(B, COHORT12, { tweaks: [{ stage: 'V', raw: SR(4), key: 'C|T9', fn: (r) => { r.tree.manifestSha256 = 'b'.repeat(64); } }] });
  const refused = (c) => { try { B.FRM.buildFrame({ vManifest: c.vOut.manifest, oManifest: c.oOut.manifest }); return false; } catch (e) { return /halted/.test(e.message); } };
  const analysisRefused = (() => { try { B.ANA.analyzeFrame({ vManifest: v9.vOut.manifest, oManifest: v9.oOut.manifest }); return false; } catch (e) { return /halted/.test(e.message); } })();
  return v9.oOut.halted && v9.oOut.manifest.halts.some(h => h.rule === 'V9' && h.raw === SR(2) && same(h.runs, ['M9|T9'])) && e9.haltStage.includes('V9') && !e9.hardSeed.includes('V9')
    && v12.oOut.halted && v12.oOut.manifest.halts.some(h => h.rule === 'V12' && h.raw === SR(3))
    && v1.vOut.halted && v1.vOut.manifest.halts.some(h => h.rule === 'V1')
    && refused(v9) && refused(v12) && analysisRefused;
});
def('g20.run', 'G20', 'a run error gets exactly one deterministic retry with identical inputs; a transient error recovers; a persistent error halts Q, V and O (never a silent seed drop)', async (B) => {
  const calls = new Map(), seen = new Map();
  const exec = async (input) => {
    const n = (calls.get(input.label) || 0) + 1; calls.set(input.label, n);
    (seen.get(input.label) || seen.set(input.label, []).get(input.label)).push(JSON.stringify(input));
    if (input.label === 'persist') return { error: 'boom' };
    if (input.label === 'transient' && n === 1) return { error: 'boom' };
    return { label: input.label, fine: true };
  };
  const out = await B.ORC.runPool([{ label: 'ok' }, { label: 'persist' }, { label: 'transient' }], { concurrency: 3 }, null, exec);
  const poolOk = calls.get('ok') === 1 && calls.get('persist') === 2 && calls.get('transient') === 2 && !!out[1].error && out[2].fine === true && out[2].error === undefined
    && seen.get('persist')[0] === seen.get('persist')[1];
  const errRun = (r) => { for (const k of Object.keys(r)) delete r[k]; r.error = 'boom'; };
  const v = makeCohort(B, COHORT12, { tweaks: [{ stage: 'V', raw: SR(5), key: 'M9|T11', fn: errRun }] });
  const o = makeCohort(B, COHORT12, { tweaks: [{ stage: 'O', raw: SR(6), key: 'C|T9', fn: errRun }] });
  const q = B.ORC.assembleQ({ seeds: [SR(7), SR(8)], recs: [{ label: 'Q|a', error: 'boom' }, synthRun({ raw: SR(8), content: 'C', twin: 'T9', x: 9, best: 9, stage: 'V', ok: 1 })], expectedIdentity: EXPECTED });
  return poolOk
    && v.vOut.halted && v.vOut.manifest.halts.some(h => h.rule === 'RUN' && h.raw === SR(5) && same(h.runs, ['M9|T11']))
    && o.oOut.halted && o.oOut.manifest.halts.some(h => h.rule === 'RUN' && h.raw === SR(6))
    && q.halted && q.halts.some(h => h.rule === 'RUN' && h.raw === SR(7));
});
def('g20.firstfault', 'G20', 'the first non-operational seed-scope fault at Stage O halts the stage (ledger threshold 1); a higher threshold keeps it a seed exclusion', (B) => {
  const tw = [{ stage: 'O', raw: SR(9), key: 'M11|T9', fn: (r) => { r.h1r.drawFaults = 1; } }];
  const first = makeCohort(B, COHORT12, { tweaks: tw });
  const loose = makeCohort(B, COHORT12, { tweaks: tw, haltCount: 2 });
  return first.oOut.halted && first.oOut.manifest.halts.some(h => h.rule === 'SEED_FAULT_AT_O' && h.count === 1 && h.threshold === 1 && h.seeds[0].raw === SR(9))
    && !loose.oOut.halted && loose.oOut.manifest.counts.invalid === 1;
});
def('g20.cachedir', 'G20', 'the run pool creates a missing output directory for its resumable cache and resumes from it without re-running (defect found by the CLI smoke: a stage run directly into a new --out)', async (B) => {
  const cacheFile = path.join(TMP, `cachedir_${path.basename(B.dir)}`, 'nested', 'cache.jsonl');
  let calls = 0; const exec = async (input) => { calls++; return { label: input.label, fine: true }; };
  const inputs = [{ label: 'a' }, { label: 'b' }];
  const first = await B.ORC.runPool(inputs, { concurrency: 2 }, cacheFile, exec);
  const written = fs.readFileSync(cacheFile, 'utf8').split('\n').filter(Boolean).length;
  const second = await B.ORC.runPool(inputs, { concurrency: 2 }, cacheFile, exec);
  return first.length === 2 && written === 2 && calls === 2 && second.every(r => r.fine === true);
});
def('g20.report', 'G20', 'the CLI report carries the manifest\'s OWN hash (what --v-sha must be), distinct from the artifact file hash, and Stage O accepts exactly that value', async (B) => {
  const { vOut } = makeCohort(B, COHORT12);
  const art = B.ORC.writeArtifact(path.join(TMP, `report_${path.basename(B.dir)}`), 'validity_manifest.json', vOut.manifest);
  const rep = B.ORC.artifactReport(art, vOut.manifest);
  const o = await B.ORC.stageO({ vManifest: vOut.manifest, expectedVSha256: rep.manifestSha256, ctx, cacheFile: null, stopAt: 'attempt-hook',
    exec: async (input) => synthRun({ raw: input.agentSeed, content: input.content, twin: input.twin, x: 9, best: 9, stage: 'O', ok: 1 }) }).then(() => 'accepted', (e) => e.message);
  return rep.manifestSha256 === vOut.manifest.sha256 && rep.sha256 === art.sha256 && rep.manifestSha256 !== art.sha256 && o === 'accepted';
});
def('g21.v6', 'G21', 'V6 patterns stay eligible when everything else passes; pair-class counts, signed scores and the effect of the former restriction are reported', (B) => {
  const { vOut, oOut } = makeCohort(B, COHORT12);
  const rev = vOut.manifest.entries.find(x => x.raw === SR(4)), mix = vOut.manifest.entries.find(x => x.raw === SR(5));
  if (!(rev.valid && mix.valid && rev.diagnostics.includes('V6') && mix.diagnostics.includes('V6') && rev.hard.length === 0 && rev.pairClass === 'reversed' && mix.pairClass === 'mixed')) return { ok: false, detail: 'V6 seeds not eligible' };
  const a = B.ANA.analyzeFrame({ vManifest: vOut.manifest, oManifest: oOut.manifest }), pc = a.pairClasses, pv = a.previousV6Restriction;
  return a.frame.seeds.includes(SR(4)) && a.frame.seeds.includes(SR(5)) && a.frame.size === 12
    && pc.follow.count === 6 && pc.equal.count === 4 && pc.reversed.count === 1 && pc.mixed.count === 1 && pc.antiSteering.count === 1 && pc.v6Flagged.count === 2
    && pc.signedScores['1'].count === 6 && pc.signedScores['-1'].count === 1 && pc.signedScores['0.5'].count === 1 && pc.signedScores['0'].count === 4
    && pv.seedsOutsideFormerRestriction.count === 2 && pv.T_frame_formerRestriction.n === 10 && near(pv.T_frame_formerRestriction.value, 0.6) && near(pv.T_frame_fullFrame.value, 5.5 / 12)
    && a.firstEdgeOutcome.firstEdgeContrast_GOODminusBAD.allBinary === false && pv.firstEdgeContrast_formerRestriction.n === 10;
});
def('g22.label', 'G22', 'the exploration indicator is labelled inferred, lists its limits, and distinguishes a COLD-only view from the union over the six runs (cold invisible, memory visible)', (B) => {
  const spec = [{ raw: SR(0), pattern: P(9, 9, 9), best: { C: 9, M9: 9, M11: 11 } }, { raw: SR(1), pattern: P(9, 9, 11) }];
  const { vOut, oOut } = makeCohort(B, spec);
  const e = vOut.manifest.entries.find(x => x.raw === SR(0)).exploration, a = B.ANA.analyzeFrame({ vManifest: vOut.manifest, oManifest: oOut.manifest }), ex = a.exploration;
  return e.indicator === 'inferred' && e.anyVisible === true && e.coldVisible === false && e.sharedPick === true && e.unobservableByConstruction === false
    && ex.indicator === 'inferred' && ex.limitations.length >= 4 && ex.unionVisible.count === 1 && ex.coldVisible.count === 0 && ex.memoryOnlyVisible.count === 1 && ex.contentDependentPick.count === 0
    && ex.strata.visible.n === 1 && ex.strata.notVisible.n === 1 && /not adjust for confounding/.test(ex.limitations.join(' '));
});
def('g22.invariance', 'G22', 'exploration status changes neither eligibility, nor the frame hash, nor the primary score, nor the outcome mapping (same cohort with nothing visible vs everything visible)', (B) => {
  const plain = makeCohort(B, COHORT12), allVis = makeCohort(B, COHORT12.map(s => ({ ...s, best: { C: 6, M9: 6, M11: 6 } })));
  const A = B.ANA.analyzeFrame({ vManifest: plain.vOut.manifest, oManifest: plain.oOut.manifest }), Z = B.ANA.analyzeFrame({ vManifest: allVis.vOut.manifest, oManifest: allVis.oOut.manifest });
  const validSame = same(plain.vOut.manifest.entries.map(e => e.valid), allVis.vOut.manifest.entries.map(e => e.valid)) && same(plain.vOut.manifest.entries.map(e => e.hard), allVis.vOut.manifest.entries.map(e => e.hard));
  const expectVisible = COHORT12.filter(s => Object.values(s.pattern).some(x => x !== 6)).length;      // best = 6 everywhere: only the all-6 seed stays invisible
  return validSame && A.exploration.unionVisible.count === 0 && Z.exploration.unionVisible.count === expectVisible && expectVisible === 11 && same(A.frame.seeds, Z.frame.seeds)
    && A.metrics.T_frame.sum === Z.metrics.T_frame.sum && A.firstEdgeOutcome.firstEdgeContrast_GOODminusBAD.sum === Z.firstEdgeOutcome.firstEdgeContrast_GOODminusBAD.sum
    && same(plain.oOut.manifest.entries.map(e => e.outcomes), allVis.oOut.manifest.entries.map(e => e.outcomes)) && !allVis.oOut.halted;
});
def('g22.static', 'G22', 'the diagnostic is a pure function of records: its source contains no random-number or clock call (no RNG consumption)', (B) => {
  const src = B.VAL.explorationOf.toString();
  return !/makeRng|Math\.random|liveRng|Date\.now|new Date/.test(src) && B.VAL.explorationOf.length === 1;
});
def('g22.anchors', 'G22', 'the call-0 exploration facts the diagnostic relies on are present in the conformed tree: epsilon branch (0.2 base, fatigue term), M-BEST and M-DECISION hooks, stress and fatigue initialised to 0', () => {
  const main = fs.readFileSync(path.join(ctx.treeDir, 'main.js'), 'utf8'), beh = fs.readFileSync(path.join(ctx.treeDir, 'render', 'behavior.js'), 'utf8');
  return main.includes('if (liveRng() < epsilon && choices.length > 0)') && /0\.2\s*-\s*\(fatigueState \* 0\.002\)/.test(main) && main.includes('M-BEST') && main.includes('M-DECISION')
    && /export let stressState = 0;/.test(beh) && /export let fatigueState = 0;/.test(beh);
});
def('g23.hash', 'G23', 'missing or inconsistent frame hashes cause refusal: altered frame body, deleted metric hash, foreign metric hash, altered denominator, edited body without rehash, wrong qualified-seed hash', (B) => {
  const { vOut, oOut } = makeCohort(B, COHORT12);
  const a = B.ANA.analyzeFrame({ vManifest: vOut.manifest, oManifest: oOut.manifest });
  const rehash = (t) => { const { sha256: _s, ...b } = t; t.sha256 = B.CFG.sha256(B.CFG.canonicalJson(b)); return t; };
  const clone = () => JSON.parse(JSON.stringify(a));
  const throwsRefusal = (fn) => { try { fn(); return false; } catch (e) { return /MCF-1 (analysis|frame) refused/.test(e.message); } };
  const t1 = clone(); t1.frame.seeds.pop(); rehash(t1);
  const t2 = clone(); delete t2.metrics.netShift.frameSha256; rehash(t2);
  const t3 = clone(); t3.metrics.sigmaBar.frameSha256 = 'a'.repeat(64); rehash(t3);
  const t4 = clone(); t4.metrics.coldRate.n = 7; rehash(t4);
  const t5 = clone(); t5.metrics.T_frame.sum = 99;
  const wrongQ = throwsRefusal(() => B.ANA.analyzeFrame({ vManifest: vOut.manifest, oManifest: oOut.manifest, qualifiedSha256: 'c'.repeat(64) }));
  return B.ANA.verifyAnalysis(a) === true && throwsRefusal(() => B.ANA.verifyAnalysis(t1)) && throwsRefusal(() => B.ANA.verifyAnalysis(t2)) && throwsRefusal(() => B.ANA.verifyAnalysis(t3))
    && throwsRefusal(() => B.ANA.verifyAnalysis(t4)) && throwsRefusal(() => B.ANA.verifyAnalysis(t5)) && wrongQ;
});
def('g23.min', 'G23', 'the 100-seed minimum blocks scientific interpretation at 99 (primary withheld, no permitted claim) and permits it at exactly 100', (B) => {
  const run = (n) => { const { vOut, oOut } = makeCohort(B, spec100(n)); return B.ANA.analyzeFrame({ vManifest: vOut.manifest, oManifest: oOut.manifest }); };
  const a99 = run(99), a100 = run(100);
  return a99.frame.size === 99 && a99.interpretation.allowed === false && a99.primaryDescriptive.value === null && a99.claims.permitted.length === 0 && a99.primaryDescriptive.status === 'WITHHELD_BELOW_MINIMUM_FRAME'
    && a99.metrics.T_frame.interpretable === false && a100.frame.size === 100 && a100.interpretation.allowed === true && a100.primaryDescriptive.value !== null && a100.claims.permitted.length === 3;
});
def('g24.ctx', 'G24', 'an official context that did not come from makeContext\'s gate is refused by the stage functions before any run; a development context with the same fake executor works (control)', async (B) => {
  let calls = 0; const exec = async (input) => { calls++; return synthRun({ raw: input.agentSeed, content: 'C', twin: 'T9', x: 9, best: 9, stage: 'V', ok: 1 }); };
  const forged = { ...ctx, policy: 'official' };
  let refused = false; try { await B.ORC.stageQ({ seeds: [SR(0)], ctx: forged, cacheFile: null, exec }); } catch (e) { refused = /official context must be created by makeContext/.test(e.message); }
  const beforeControl = calls;
  const ctrl = await B.ORC.stageQ({ seeds: [SR(0)], ctx, cacheFile: null, exec });
  return refused && beforeControl === 0 && calls === 1 && ctrl.qualified.length === 1;
});
def('g24.preflight', 'G24', 'the registry preflight needs the registered MCF-1 block to EQUAL the admitted list (not a subset, not a superset, not a different list) and every admitted seed to decide REPRODUCTION; it creates nothing', (B) => {
  const seeds = [SR(0), SR(1), SR(2)];
  const block = (list, over = {}) => ({ schema: 'trajectory.block/1', namespace: 'trajectory', study: CFG.STUDY, status: 'registered', lo: list[0], hi: list[list.length - 1],
    excluded: [], count: list.length, listSha256: listSha256Of(list), executed: false, authorization: 'in-memory verification only', artifact: 'none', why: 'preflight semantics',
    configuration: { seed: 100000, index: 1, acceptedSeed: 100026 }, ...over });
  const mkReg = (blocks) => createTrajectoryRegistry({ records: [...TRAJECTORY_RECORDS], heldOut: [...TRAJECTORY_HELD_OUT], authorizations: [...TRAJECTORY_AUTHORIZATIONS], blocks });
  const run = (blocks, admitted = seeds) => B.ORC.evaluateRegistryPreflight(mkReg(blocks), { admitted });
  const none = run([]), exact = run([block(seeds)]), subset = run([block(seeds.slice(0, 2))]), superset = run([block([...seeds, SR(3)])]);
  const empty = B.ORC.evaluateRegistryPreflight(mkReg([]), { admitted: [] });
  const notExecuted = run([block(seeds, { executed: true })]), dev = run([block(seeds, { status: 'development' })]);
  // defence in depth: a registry-shaped object whose block carries the right members but a wrong list hash (the real
  // constructor refuses such a block, so this exercises the preflight comparison itself)
  const hashBad = B.ORC.evaluateRegistryPreflight({ blocks: [block(seeds, { listSha256: 'f'.repeat(64) })], checkUse: () => ({ decision: 'REPRODUCTION' }) }, { admitted: seeds });
  return !none.ok && !hashBad.ok && /list hash/.test(hashBad.block.why) && none.counts.AVAILABLE === 3 && exact.ok && exact.block.ok && exact.counts.REPRODUCTION === 3
    && !subset.ok && same(subset.offenders.map(o => o.raw), [seeds[2]]) && !superset.ok && /not exactly the admitted list/.test(superset.block.why)
    && !empty.ok && !notExecuted.ok && !dev.ok;
});
def('g24.candidate', 'G24', 'the candidate block is refused for development before anything is scanned (a trap inventory is never touched); an official scan needs the committed authorization, so no mode of stageAdmit can scan the candidate range; makeContext refuses official without it', async (B) => {
  const trap = { get classes() { throw new Error('TRAP: the inventory was touched'); }, get derived() { throw new Error('TRAP: the inventory was touched'); } };
  let pre = false; try { B.ORC.stageAdmit({ policy: 'development', start: B.CFG.BLOCK.start, length: 5, inventory: trap }); } catch (e) { pre = /admission refused: the candidate confirmatory block is not authorised/.test(e.message); }
  let tail = false; try { B.ORC.stageAdmit({ policy: 'development', start: B.CFG.BLOCK.start + 3000, length: 5, inventory: trap }); } catch (e) { tail = /admission refused/.test(e.message); }
  let official = false; try { B.ORC.stageAdmit({ policy: 'official', start: B.CFG.BLOCK.start, length: B.CFG.BLOCK.scanLength, inventory: trap }); } catch (e) { official = /official stage refused/.test(e.message); }
  let unknown = false; try { B.ORC.stageAdmit({ policy: 'scan', start: B.CFG.BLOCK.start, length: 5, inventory: trap }); } catch (e) { unknown = /unknown policy/.test(e.message); }
  const pol = !B.CFG.seedPolicy('development', B.CFG.BLOCK.start).ok && !B.CFG.seedPolicy('official', B.CFG.BLOCK.start).ok;
  let ctxRefused = false; try { B.ORC.makeContext({ policy: 'official' }); } catch (e) { ctxRefused = /official stage refused/.test(e.message); }
  return pre && tail && official && unknown && pol && ctxRefused;
});

// ---- the source-mutant harness ----
const MUT_ROOT = fs.mkdtempSync(path.join(TMPREAL, 'mcf1-mutants-'));
const ENGINE_FILES = fs.readdirSync(HERE).filter(f => f.endsWith('.mjs') && !f.startsWith('verify_') && f !== 'driver.mjs' && f !== 'prepare_tree.mjs');
const fileUrl = (p) => pathToFileURL(p).href;
function rewriteImports(src, destDir) {
  const toUrl = (spec) => { const abs = path.resolve(HERE, spec); return path.dirname(abs) === HERE ? fileUrl(path.join(destDir, path.basename(abs))) : fileUrl(abs); };
  return src.replace(/(from\s+)'(\.{1,2}\/[^']+)'/g, (_, a, spec) => `${a}'${toUrl(spec)}'`)
    .replace(/(readJson\()'(\.{1,2}\/[^']+)'(\))/g, (_, a, spec, c) => `${a}'${fileUrl(path.resolve(HERE, spec))}'${c}`);
}
async function loadBundle(id, edits) {
  const dir = path.join(MUT_ROOT, id); fs.mkdirSync(dir, { recursive: true });
  for (const f of Object.keys(edits)) if (!ENGINE_FILES.includes(f)) throw new Error(`mutant ${id}: ${f} is not a mutable engine file`);
  for (const f of ENGINE_FILES) {
    let src = fs.readFileSync(path.join(HERE, f), 'utf8');
    for (const [find, rep] of (edits[f] || [])) {
      const n = src.split(find).length - 1;
      if (n !== 1) throw new Error(`mutant ${id}: anchor in ${f} matched ${n} times (must be exactly 1): ${find.slice(0, 70)}`);
      src = src.replace(find, () => rep);
    }
    fs.writeFileSync(path.join(dir, f), rewriteImports(src, dir));
  }
  const imp = (f) => import(fileUrl(path.join(dir, f)));
  const [cfgM, valM, frmM, anaM, orcM] = await Promise.all([imp('config.mjs'), imp('validity.mjs'), imp('frame.mjs'), imp('analyze.mjs'), imp('orchestrate.mjs')]);
  return { CFG: cfgM, VAL: valM, FRM: frmM, ANA: anaM, ORC: orcM, dir, orchestratePath: path.join(dir, 'orchestrate.mjs') };
}
const REAL = { CFG, VAL, FRM, ANA, ORC, dir: HERE, orchestratePath: path.join(HERE, 'orchestrate.mjs') };
async function runTest(id, B) {
  const t = TESTS.get(id); let r;
  try { r = res(await t.fn(B)); } catch (e) { r = { ok: false, detail: 'threw: ' + String(e && e.message ? e.message : e).slice(0, 120), threw: true }; }
  return r;
}

// real implementation: every R1 gate must pass
for (const t of TESTS.values()) {
  const r = await runTest(t.id, REAL);
  check(t.gate, `[${t.id}] ${t.desc}`, r.ok === true, r.detail || '');
}

// mutants: each deliberately breaks one safeguard; the named gate must fail against the mutated module graph
const M = (id, desc, tests, edits) => ({ id, desc, tests, edits });
const MUTANTS = [
  M('m-status-approved', 'a ledger decision carrying the reserved APPROVED status', ['g15.ledger'], { 'config.mjs': [["value: 'C', status: 'APPROVED_FOR_IMPLEMENTATION', note: 'census of the whole", "value: 'C', status: 'APPROVED', note: 'census of the whole"]] }),
  M('m-steer-old-indicator', 'primary score reverted to the follow indicator (success-pattern restricted definition)', ['g16.table', 'g16.mean'], { 'analyze.mjs': [['steering: (p) => 0.5 * (I(p.x9 === 9) - I(p.x9 === 11) + I(p.x11 === 11) - I(p.x11 === 9)),', 'steering: (p) => I(p.x9 === 9 && p.x11 === 11),']] }),
  M('m-steer-sign', 'primary score with the wrong sign on the x9 = 11 term', ['g16.table'], { 'analyze.mjs': [['steering: (p) => 0.5 * (I(p.x9 === 9) - I(p.x9 === 11) + I(p.x11 === 11) - I(p.x11 === 9)),', 'steering: (p) => 0.5 * (I(p.x9 === 9) + I(p.x9 === 11) + I(p.x11 === 11) - I(p.x11 === 9)),']] }),
  M('m-net-no-cold', 'net shift that forgets to subtract COLD', ['g17.secondary'], { 'analyze.mjs': [['net: (p) => 0.5 * (I(p.x9 === 9) + I(p.x11 === 11)) - 0.5 * (I(p.xC === 9) + I(p.xC === 11)),', 'net: (p) => 0.5 * (I(p.x9 === 9) + I(p.x11 === 11)),']] }),
  M('m-selector-hardcoded', 'primary selector that labels the requested metric but computes T_frame', ['g18.selector'], { 'analyze.mjs': [['const sel = m.metrics[primary];', 'const sel = m.metrics.T_frame;']] }),
  M('m-partial-cluster', 'validator that tolerates a single failing member of the cluster', ['g19.cluster'], { 'validity.mjs': [['return { raw, valid: hard.length === 0, hard, diagnostics, failures,', 'return { raw, valid: hard.length === 0 || Object.values(failures).every(a => a.length <= 1), hard, diagnostics, failures,']] }),
  M('m-frame-keeps-O-invalid', 'frame that keeps seeds invalid at Stage O (steering from the Stage-V frame)', ['g19.stageO'], { 'frame.mjs': [['if (!o.valid) continue;', 'if (!o.valid) { rows.push(rowOf(v, { outcomes: Object.fromEntries(RUN_KEYS.map(k => [k, { edge: v.executed[k], ok: 0 }])) })); seeds.push(v.raw); continue; }']] }),
  M('m-V9-as-seed-exclusion', 'a determinism mismatch demoted to an ordinary seed exclusion', ['g20.halt'], { 'validity.mjs': [["if (fingerprintPre(r) !== vEntry.fingerprints[k]) halt('V9', k);", "if (fingerprintPre(r) !== vEntry.fingerprints[k]) seedFail('V9', k);"]] }),
  M('m-integrity-halts-ignored', 'assembleO that records integrity failures but never halts on them', ['g20.halt'], { 'orchestrate.mjs': [['for (const x of entries) for (const id of x.haltStage || []) halts.push({ rule: id, raw: x.raw, runs: ((x.haltDetail || {})[id] || []).slice() });', '']] }),
  M('m-frame-from-halted-O', 'frame builder that accepts a halted Stage-O manifest', ['g20.halt'], { 'frame.mjs': [["if (oManifest.halted || (oManifest.halts && oManifest.halts.length)) refuse('Stage O halted: a halted stage yields no frame');", '']] }),
  M('m-no-retry', 'run pool without the one deterministic retry', ['g20.run'], { 'orchestrate.mjs': [['if (rec.error) rec = await exec(input);', '']] }),
  M('m-RUN-drop-at-V', 'a persistent run error at Stage V silently drops the seed instead of halting', ['g20.run'], { 'orchestrate.mjs': [["for (const e of entries) if (e.failures && e.failures.RUN) halts.push({ rule: 'RUN', raw: e.raw, runs: e.failures.RUN.slice() });", '']] }),
  M('m-RUN-drop-at-O', 'a persistent run error at Stage O silently drops the seed instead of halting', ['g20.run'], { 'orchestrate.mjs': [["for (const x of entries) if (x.failures && x.failures.RUN) halts.push({ rule: 'RUN', raw: x.raw, runs: x.failures.RUN.slice() });", '']] }),
  M('m-RUN-drop-at-Q', 'a persistent run error at Stage Q silently leaves the seed unqualified', ['g20.run'], { 'orchestrate.mjs': [["for (const raw of runFaults) halts.push({ rule: 'RUN', raw });", '']] }),
  M('m-cachedir-missing', 'run pool that assumes the cache directory already exists', ['g20.cachedir'], { 'orchestrate.mjs': [['if (cacheFile) fs.mkdirSync(path.dirname(cacheFile), { recursive: true });', '']] }),
  M('m-report-file-hash-only', 'CLI report that prints only the artifact file hash as the manifest hash', ['g20.report'], { 'orchestrate.mjs': [["manifestSha256: obj && typeof obj.sha256 === 'string' ? obj.sha256 : null", 'manifestSha256: art.sha256']] }),
  M('m-fault-threshold-off-by-one', 'Stage-O seed-fault threshold that needs one fault more than the ledger value', ['g20.firstfault'], { 'orchestrate.mjs': [['if (haltCount !== null && faults.length >= haltCount)', 'if (haltCount !== null && faults.length > haltCount)']] }),
  M('m-V6-hard', 'V6 restored as a hard eligibility exclusion', ['g21.v6'], { 'validity.mjs': [["if (!pair.supportOK) diagnostics.push('V6');", "if (!pair.supportOK) { diagnostics.push('V6'); fail('V6'); }"]] }),
  M('m-exploration-eligibility', 'exploration status excludes seeds', ['g22.invariance'], { 'validity.mjs': [['return { raw, valid: hard.length === 0, hard, diagnostics, failures,', 'return { raw, valid: hard.length === 0 && !explorationOf(runs).anyVisible, hard, diagnostics, failures,']] }),
  M('m-exploration-rng', 'exploration diagnostic that consumes an RNG draw', ['g22.static'], { 'validity.mjs': [['const T9 = (c) => per[`${c}|T9`];', 'const T9 = (c) => per[`${c}|T9`]; makeRng(1)();']] }),
  M('m-verify-no-frame-check', 'analysis verifier that does not recompute the frame hash', ['g23.hash'], { 'analyze.mjs': [["if (!a.frame || !frameIntact(a.frame)) refuse('the frame hash is missing or does not match the frame body');", '']] }),
  M('m-verify-no-metric-hash', 'analysis verifier that does not compare metric frame hashes', ['g23.hash'], { 'analyze.mjs': [['else if (o.frameSha256 !== a.frame.sha256) bad.push(`${p}: frame hash differs`);', 'else if (false) bad.push("x");']] }),
  M('m-min-frame-off', 'minimum valid frame not enforced', ['g23.min'], { 'analyze.mjs': [['const belowMinimum = frame.size < min;', 'const belowMinimum = false;']] }),
  M('m-ctx-guard-off', 'stage functions that accept a forged official context', ['g24.ctx'], { 'orchestrate.mjs': [["if (ctx.policy === 'official' && !AUTHORISED.has(ctx)) throw new Error('MCF-1 stage refused: an official context must be created by makeContext after the freeze-record gate');", '']] }),
  M('m-preflight-superset-allowed', 'preflight that accepts a registered block larger than the admitted list', ['g24.preflight'], { 'orchestrate.mjs': [["else if (list.length !== admitted.length || list.some((v, i) => v !== admitted[i])) block.why = 'the registered block members are not exactly the admitted list';", '']] }),
  M('m-preflight-hash-unchecked', 'preflight that does not compare the block list hash with the admitted list hash', ['g24.preflight'], { 'orchestrate.mjs': [["else if (b.listSha256 !== sha256(admitted.join(','))) block.why = 'the block list hash is not the admitted list hash';", '']] }),
  M('m-candidate-guard-off', 'development admission without the candidate-block refusal', ['g24.candidate'], { 'orchestrate.mjs': [["if (!p.ok) throw new Error(`MCF-1 admission refused: ${p.why}`);", '']] }),
];
for (const m of MUTANTS) {
  let B;
  try { B = await loadBundle(m.id, m.edits); } catch (e) { mutant('R1', `${m.id}: ${m.desc}`, false, `MUTANT COULD NOT BE BUILT (verifier defect): ${e.message}`); continue; }
  const outs = []; for (const tid of m.tests) outs.push({ tid, ...(await runTest(tid, B)) });
  const caught = outs.some(o => o.ok !== true);
  mutant(TESTS.get(m.tests[0]).gate, `${m.id}: ${m.desc}`, caught, outs.map(o => `${o.tid} ${o.ok === true ? 'PASSED (not caught)' : o.threw ? o.detail : 'failed as required'}`).join('; '));
}

// ---------------- G25: engine files untouched; G26: documentation ----------------
console.log('\n== G25 engine files and G26 documentation ==');
{
  // the engine files whose behaviour the verifier pins (driver semantics, admission algorithm, inventory definitions,
  // contents): SHA-256 of the line-ending-normalised text.  M-MCF1-R2 deliberately re-baselined driver, inventory and
  // admission (typed_v2 migration, driver-boundary enforcement, reservation view); G27/g.parity prove the behaviour the
  // pins stand for is unchanged.  episodes.mjs is untouched since the M-MCF1-HARNESS baseline (9aaf22e).
  const ENGINE_PINS = {
    'driver.mjs': '5e49978b23487978bda2d193a82b1b50f112b1e49384161aaa9d55b9f9d32808',
    'inventory.mjs': '607047b3d0fb5551a7963537fd3e903a09e948526a62941d737ab49e7c018ec8',
    'admission.mjs': '94cfb914f5dd93b7c2d4b84d1a5b09ef35b56b866e2187721fe6283fa6356aa5',
    'episodes.mjs': 'c9f01f9d7d5599209ca9705f819c2d5628c69f47f05c3ac902b2b2c4767787e6',
  };
  for (const f of Object.keys(ENGINE_PINS)) {
    const text = fs.readFileSync(path.join(HERE, f), 'utf8');
    check('G25', `${f} is byte-identical (line-ending-normalised) to its pinned text`, CFG.hashTextNormalised(text) === ENGINE_PINS[f], CFG.hashTextNormalised(text).slice(0, 16));
    mutant('G25', `${f}: a one-character change is detected by the pin`, CFG.hashTextNormalised(text + ' ') !== ENGINE_PINS[f]);
  }
  const readme = fs.readFileSync(path.join(HERE, 'README.md'), 'utf8');
  const REQUIRED = ['T_frame', 'S_s = 1/2 (1{x9=9} - 1{x9=11} + 1{x11=11} - 1{x11=9})', 'complete-cluster', 'V6', 'diagnostic', '100', 'inferred', 'not frozen', 'officialAuthorisation', 'APPROVED_FOR_IMPLEMENTATION', 'candidate', 'prohibited', 'planning', 'general performance benefit', 'retry'];
  const missing = REQUIRED.filter(p => !readme.includes(p));
  check('G26', 'README documents the ledger, formulas, frame rule, V6, minimum, exploration limits, claim boundary and the execution lock', missing.length === 0, missing.join(' | '));
  mutant('G26', 'a README without the formula and the lock is detected', REQUIRED.filter(p => !readme.replace(/officialAuthorisation/g, '').replace(/S_s = 1\/2/g, '').includes(p)).length === 2);
  check('G26', 'the README states the execution lock and does not describe the design as frozen', /not frozen/.test(readme) && !/design is frozen/.test(readme.replace(/not frozen/g, '')));
}

console.log(`\nRESULT: ${passed} checks passed, ${failed} failed; mutants caught ${mutantsCaught}, missed ${mutantsMissed}`);
fs.rmSync(TMP, { recursive: true, force: true });
fs.rmSync(MUT_ROOT, { recursive: true, force: true });
process.exit(failed === 0 && mutantsMissed === 0 ? 0 : 1);
