// ==========================================================
// M7 PRE-STAGE-1 GATE — G9 : NO NEW COGNITIVE EXPORTS
// ==========================================================
// GOVERNING SOURCE (provenance category A — frozen pre-registration)
//   M7_PREREGISTRATION.md §14, gate G9:
//       "Export surface of every render/ module unchanged"
//   M7_PREREGISTRATION.md §18.5:
//       "No new module in render/. No new export from any cognitive module."
//   M7_SCIENTIFIC_SPEC_DRAFT.md §15 G9: "(extends the M6.7 gate)"
//   frozen SHA-256 2f12e309d7409e95f3d1bca34135110e518865fd01d96e5eeaee347b6e33f6b9
//
// WHAT "UNCHANGED" IS MEASURED AGAINST
// ------------------------------------
// The frozen §18 implementation delta has NOT been applied: there is no
// experiments/m7/, no env.js, no arms.js, and main.js carries none of the
// E1-E6 sites. The live tree is therefore still the PRE-DELTA build, so the
// surface recorded below IS the reference the frozen text names. Capturing it
// now is the only moment it can be captured correctly.
//
// No threshold, seed, sample size or scientific parameter is introduced. The
// EXPECTED table is a recorded observation, following the precedent of M6.7
// in verify_S6.js, which hardcodes its expected export list the same way.
//
// METHOD: STATIC, NOT DYNAMIC
// ---------------------------
// Exports are extracted by parsing source text, not by importing. Five render
// modules (connections, render, scene, stars, ui) require THREE/DOM and cannot
// be imported under Node, so a dynamic-only gate would silently skip them.
// Static parsing covers all 37. This mirrors the M6.8 static guard.
//
// PARSER VALIDITY is asserted, not assumed: for every module that CAN be
// imported, the parsed surface is cross-checked against the real runtime
// surface (G9.2). A parser that silently returned [] would fail there.
// ==========================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const RENDER = path.join(ROOT, 'render');

let pass = 0, fail = 0;
const ok = (n, c, x = '') => { c ? pass++ : fail++; console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${x ? '   ' + x : ''}`); };

// ---- export-surface extractor (pure text; no module evaluation) ----
function surfaceOf(src) {
  const names = new Set();
  for (const m of src.matchAll(/^\s*export\s+(?:async\s+)?(?:function\*?|class|const|let|var)\s+([A-Za-z_$][\w$]*)/gm))
    names.add(m[1]);
  for (const m of src.matchAll(/^\s*export\s*\{([^}]*)\}/gm))
    for (const part of m[1].split(',')) {
      const t = part.trim(); if (!t) continue;
      const as = t.split(/\s+as\s+/);
      names.add((as[1] || as[0]).trim());
    }
  if (/^\s*export\s+default\b/m.test(src)) names.add('default');
  if (/^\s*export\s*\*/m.test(src)) names.add('<<STAR_EXPORT>>');
  return [...names].sort();
}

// ==========================================================
// RECORDED REFERENCE SURFACE — pre-delta build. 37 modules, 215 exports.
// ==========================================================
const EXPECTED = {
  'activationCompetition.js': ['boostActivation','clearContextMask','computeLateralInhibition','decayActivations','getActivation','getActivationVolatility','getCompetitionScore','getTopActiveNeurons','isContextEligible','setActivation','setContextMask'],
  'behavior.js': ['applyPredictionErrorToBehavior','changeFatigue','changeStress','confidenceState','curiosityState','energyState','exhaustionState','explorationMode','fatigueState','focusState','loopStressState','regulateBiology','restingState','stressState','survivalPressure','survivalState','updateBehavior'],
  'candidateAnalysis.js': ['analyzeCandidate'],
  'cognitiveAttention.js': ['applyAttentionAmplification','getAttentionScore','getAttentionSnapshot','resetAttentionFocus','setGoalAttention','strengthenAttention','updateAttentionFocus','weakenAttention'],
  'connections.js': ['connectPoints','setConnectionNeuronMap'],
  'embeddings.js': ['createEmbedding','setEmbeddingNeuronMap','similarity','trainEmbedding'],
  'emotionMap.js': ['getLocalEmotion','updateLocalEmotion'],
  'episodeManager.js': ['clearAllEpisodes','episodicStore','exportEpisodes','getActiveGoalCoverage','getAllEpisodes','getEpisodeStats','getEpisodesForBuildMap','initEpisodeManager','loadEpisodes','recordAutonomousStep','recordAutonomousSuccess','recordManualClick','replayOneEpisode'],
  'episodic.js': ['buildEpisodeMap'],
  'episodicContextEngine.js': ['episodeRecordNode','getCurrentEpisodeState','getEpisodeVaultForReplay','getEpisodesByTag','getVaultSize','isLearningGated','resetManualSession','rewardCurrentEpisode','sealCurrentEpisode','setConceptRelations','setEpisodeManagerBridge','wmAddNode','wmDecay','wmGetActivation','wmGetSnapshot'],
  'executiveController.js': ['arbitrate','explainArbitration'],
  'helpers.js': ['dot','growReward','normalize'],
  'hud.js': ['createHUD','createSpeedControl','createThinkingStream','updateHUD','updateThinkingStream'],
  'knowledge.js': ['conceptRelations'],
  'longTermConsolidation.js': ['decayConsolidation','getConsolidationScore','getConsolidationSummary','isStableMemory','reinforcePath','runConsolidationPass','weakenPath'],
  'memory.js': ['confidenceMap','curiosityMap','penalties','rewards','signals','thoughtTrail','transitions'],
  'momentumMemory.js': ['getMomentumBonus','learnMomentum','momentumMemory'],
  'motivationalState.js': ['boredomDrive','computeExecutiveWeights','fatigueDrive','getMotivationalSnapshot','hungerDrive','recordOutcome','socialDrive','stressDrive','uncertaintyDrive','updateMotivationalState'],
  'neuronVisuals.js': ['CLUSTER_COLORS','createFuturisticConnection','createFuturisticNeuron','flashNeuronClick','getNeuronCluster','setAttentionSpotlight','setNeuronHighlight','setVisualsGroup','spawnTravelDot','tickNeuronPulse'],
  'planning.js': ['futureScore','lookAheadScore'],
  'predictionError.js': ['decayTransitionUncertainties','evaluatePredictionError','generateExpectation','getRollingError','getSemanticExpectationConfidence','getSequenceError','getTransitionUncertainty','peekTransitionUncertainty','recordSemanticExpectationOutcome','resetExpectation','uncertaintyState','updateSequenceError','updateTransitionUncertainty'],
  'qlearning.js': ['GOAL_NONE','Q','dampQ','getQ','getQAny','makeStateKey','setQ','updateQ'],
  'render.js': ['animate','setStars'],
  'scene.js': ['camera','group','renderer','scene'],
  'schemaMemory.js': ['getSchemaBonus','getSchemaDiagnostics','getSchemas','initSchemaMemory','rebuildSchemas'],
  'scoring.js': ['calculateDecisionScore','lastArbitrationBreakdown','liveFutureBonus'],
  'search.js': ['findNeuronById','setNeuronMap'],
  'semantic.js': ['buildSemanticMap'],
  'semanticActivation.js': ['decaySemanticActivations','getActivationStrength','getSemanticActivationFactor','recordSemanticActivation'],
  'semanticMemoryLayer.js': ['decaySemanticMemory','getNoiseSuppressedScore','getSchemaStrength','getSemanticEdgeStrength','getSemanticSummary','isNoiseEdge','recordSemanticEdge'],
  'semanticProvenance.js': ['PROVENANCE','getActivationDominance','getProvenanceAuthority','logActivation','shouldTrainEmbedding','writeReward','writeTransition'],
  'semanticVitality.js': ['activateSemanticVitality','decaySemanticSystems','getSemanticSignal','getSemanticStrength','getSemanticVitalityLevel','penalizeSemanticPath','reinforceEpisodeSemantics','reinforceSemanticStrength'],
  'stars.js': ['createStars','stars'],
  'trustMemory.js': ['decayTrust','getPathTrust','getTrustSnapshot','getTrustUncertainty','pathAttempts','pathSuccesses','recordAttempt','recordSuccess'],
  'ui.js': ['reasoningBox'],
  'uncertaintyEngine.js': ['decayUncertainty','getGlobalUncertaintyPressure','getPredictionCalibration','getUncertaintyScore','getUncertaintySnapshot','updateUncertainty'],
  'uncertaintyLedger.js': ['decayUncertaintyLedger','getCombinedSemanticUncertainty','getCombinedUncertainty','getLedgerSummary','getProceduralUncertainty','getSemanticUncertainty','propagateUncertainty','registerOllamaPair','updateProceduralUncertainty','updateSemanticUncertainty'],
};

const actual = {};
for (const f of fs.readdirSync(RENDER).filter(f => f.endsWith('.js')).sort())
  actual[f] = surfaceOf(fs.readFileSync(path.join(RENDER, f), 'utf8'));

const expNames = Object.keys(EXPECTED).sort();
const actNames = Object.keys(actual).sort();
const TOTAL_EXPECTED_EXPORTS = Object.values(EXPECTED).reduce((a, v) => a + v.length, 0);

// ---------- G9.1 module set ----------
console.log('-- G9.1  render/ module set unchanged ------------------------');
const added   = actNames.filter(f => !expNames.includes(f));
const removed = expNames.filter(f => !actNames.includes(f));
ok('G9.1  no render/ module added or removed',
   added.length === 0 && removed.length === 0,
   `${actNames.length} modules` + (added.length ? ` ADDED:${added.join(',')}` : '') + (removed.length ? ` REMOVED:${removed.join(',')}` : ''));

// ---------- G9.2 parser validity (anti-vacuity for the METHOD) ----------
console.log('\n-- G9.2  parser validity: static surface == runtime surface --');
let checked = 0; const parserBad = [];
for (const f of actNames) {
  let mod;
  try { mod = await import('file:///' + path.join(RENDER, f).replace(/\\/g, '/')); }
  catch { continue; }                       // needs THREE/DOM - covered statically only
  checked++;
  const dyn = Object.keys(mod).sort();
  if (JSON.stringify(dyn) !== JSON.stringify(actual[f]))
    parserBad.push(`      ${f}\n        runtime ${dyn.join(',')}\n        parsed  ${actual[f].join(',')}`);
}
ok('G9.2a parsed surface matches the real runtime surface',
   parserBad.length === 0, `${checked}/${actNames.length} modules cross-checked at runtime`);
parserBad.forEach(r => console.log(r));

const totalActual = Object.values(actual).reduce((a, v) => a + v.length, 0);
ok('G9.2b parser actually found exports (not vacuously empty)',
   totalActual === TOTAL_EXPECTED_EXPORTS,
   `${totalActual} exports across ${actNames.length} modules`);

// ---------- G9.3 per-module surface ----------
console.log('\n-- G9.3  per-module export surface unchanged -----------------');
const drift = [];
for (const f of expNames) {
  if (!actual[f]) continue;
  const e = EXPECTED[f], a = actual[f];
  const plus  = a.filter(x => !e.includes(x));
  const minus = e.filter(x => !a.includes(x));
  if (plus.length || minus.length)
    drift.push(`      ${f}` + (plus.length ? `  ADDED: ${plus.join(',')}` : '') + (minus.length ? `  REMOVED: ${minus.join(',')}` : ''));
}
ok('G9.3  every render/ module exports exactly its reference surface',
   drift.length === 0,
   drift.length ? `${drift.length} modules drifted` : `${actNames.length} modules, ${totalActual} exports, exact match`);
drift.forEach(r => console.log(r));

// ---------- G9.4 no star re-exports ----------
console.log('\n-- G9.4  no star re-export in render/ ------------------------');
const stars = actNames.filter(f => actual[f].includes('<<STAR_EXPORT>>'));
ok('G9.4  no render/ module uses a star re-export (surface stays enumerable)',
   stars.length === 0, stars.length ? stars.join(',') : 'none');

// ---------- G9.5 consistency with M6.7 ----------
console.log('\n-- G9.5  consistency with the M6.7 gate it extends -----------');
const M6_7 = ['decayTransitionUncertainties','evaluatePredictionError','generateExpectation',
  'getRollingError','getSemanticExpectationConfidence','getSequenceError','getTransitionUncertainty',
  'peekTransitionUncertainty','recordSemanticExpectationOutcome','resetExpectation',
  'uncertaintyState','updateSequenceError','updateTransitionUncertainty'].sort();
ok('G9.5  predictionError.js agrees with the M6.7 expected set',
   JSON.stringify(actual['predictionError.js']) === JSON.stringify(M6_7), `${M6_7.length} names`);

// ---------- G9.6 ANTI-VACUITY ----------
// The comparison must REJECT a mutated surface. Mutations are synthetic and
// in-memory: no file under render/ is written. Read-only discipline preserved.
console.log('\n-- G9.6  ANTI-VACUITY: mutated surfaces must be rejected -----');
const cmp = (exp, act) => {
  const en = Object.keys(exp).sort(), an = Object.keys(act).sort();
  if (JSON.stringify(en) !== JSON.stringify(an)) return false;
  return en.every(f => JSON.stringify(exp[f]) === JSON.stringify(act[f]));
};
const clone = () => JSON.parse(JSON.stringify(actual));

const mAdd = clone(); mAdd['qlearning.js'] = [...mAdd['qlearning.js'], 'zzInjectedExport'].sort();
const mDel = clone(); mDel['trustMemory.js'] = mDel['trustMemory.js'].filter(x => x !== 'getPathTrust');
const mMod = clone(); mMod['m7_injected.js'] = ['somethingNew'];
const mRen = clone(); delete mRen['planning.js'];

ok('G9.6a rejects an ADDED export',           !cmp(EXPECTED, mAdd), 'qlearning.js + zzInjectedExport');
ok('G9.6b rejects a REMOVED export',          !cmp(EXPECTED, mDel), 'trustMemory.js - getPathTrust');
ok('G9.6c rejects an ADDED render/ module',   !cmp(EXPECTED, mMod), '+ m7_injected.js');
ok('G9.6d rejects a REMOVED render/ module',  !cmp(EXPECTED, mRen), '- planning.js');
ok('G9.6e accepts the true unmutated surface', cmp(EXPECTED, actual), 'control - must PASS');

console.log(`\n${pass} passed, ${fail} failed`);
if (fail === 0) console.log('G9 GREEN - no cognitive export surface changed.');
process.exit(fail ? 1 : 0);
