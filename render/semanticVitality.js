// ======================================
// 🧠 SEMANTIC VITALITY SYSTEM
// ======================================
// Separates two distinct semantic layers:
//
// semanticStrength (long-term importance)
//   grows when the path leads to success
//   decays very slowly when unrewarding
//   represents earned cognitive importance
//
// semanticVitality (current activation)
//   spikes when path is actively traversed
//   decays quickly when path is unused
//   represents present relevance
//
// This means:
//   a path can be semantically important
//   (strength) but currently inactive
//   (low vitality) — and vice versa.
//
// Final semantic signal combines both.
// Meaning emerges from experience,
// not from raw embedding similarity alone.
// ======================================



// ======================================
// LONG-TERM IMPORTANCE MEMORY
// path key → accumulated strength
// grows from successful trajectories
// ======================================

const semanticStrength = new Map();



// ======================================
// CURRENT ACTIVATION RELEVANCE
// path key → current vitality level
// decays quickly when unused
// ======================================

const semanticVitalityMap = new Map();



// ======================================
// LAST ACCESS TIMESTAMPS
// for time-based vitality decay
// ======================================

const lastAccessTime = new Map();



// ======================================
// REINFORCE SEMANTIC STRENGTH
// called when trajectory succeeds
// or when replay confirms importance
//
// trajectoryReward: outcome quality
// higher reward → more semantic strength
// ======================================

export function reinforceSemanticStrength(

    pathKey,
    trajectoryReward

) {

    const old =
        semanticStrength.get(pathKey) || 0;

    // logarithmic gain
    // early gain is fast, later gain slows
    const gain =
        Math.log1p(Math.max(0, trajectoryReward)) * 0.4;

    const newStrength =
        Math.min(old + gain, 10);

    semanticStrength.set(
        pathKey,
        newStrength
    );

    // console.log removed: reinforceSemanticStrength fires on every
    // terminal step of every episode commit (called from episodeManager
    // _learnSemantic). At multiple episodes per minute this floods the
    // console. Semantic vitality is visible in the HUD reasoning box
    // (Semantic vitality line). Internal signal, not a cognitive event.
}



// ======================================
// ACTIVATE SEMANTIC VITALITY
// called when agent traverses a path
//
// activation proportional to
// long-term strength
// strong paths activate vividly
// ======================================

export function activateSemanticVitality(

    pathKey,
    activationStrength = 1.0

) {

    const strength =
        semanticStrength.get(pathKey) || 0;

    const current =
        semanticVitalityMap.get(pathKey) || 0;

    // vitality spike scales with long-term strength
    // important paths activate more vividly
    const spike =
        activationStrength * (0.2 + strength * 0.15);

    const newVitality =
        Math.min(current + spike, 6);

    semanticVitalityMap.set(
        pathKey,
        newVitality
    );

    // record access time
    lastAccessTime.set(
        pathKey,
        Date.now()
    );
}



// ======================================
// DECAY SEMANTIC VITALITY
// call periodically (each agent step)
//
// vitality decays fast (relevance fades)
// strength decays very slow (importance persists)
// ======================================

export function decaySemanticSystems() {


    // ======================================
    // VITALITY — fast decay
    // unused activation fades quickly
    // ======================================

    semanticVitalityMap.forEach((value, key) => {

        const decayed = value * 0.985;

        if (decayed < 0.005) {
            semanticVitalityMap.delete(key);
        } else {
            semanticVitalityMap.set(key, decayed);
        }
    });


    // ======================================
    // STRENGTH — very slow decay
    // earned importance persists much longer
    // ======================================

    semanticStrength.forEach((value, key) => {

        const decayed = value * 0.9998;

        if (decayed < 0.005) {
            semanticStrength.delete(key);
        } else {
            semanticStrength.set(key, decayed);
        }
    });
}



// ======================================
// PENALIZE STALE UNREWARDING PATH
// called when path leads to negative outcome
// reduces both vitality and strength
// ======================================

export function penalizeSemanticPath(

    pathKey,
    penaltyAmount = 1.0

) {

    // vitality drops sharply on failure
    const currentVitality =
        semanticVitalityMap.get(pathKey) || 0;

    semanticVitalityMap.set(
        pathKey,
        Math.max(0, currentVitality - penaltyAmount * 0.3)
    );

    // strength erodes slowly
    const currentStrength =
        semanticStrength.get(pathKey) || 0;

    semanticStrength.set(
        pathKey,
        Math.max(0, currentStrength - penaltyAmount * 0.05)
    );
}



// ======================================
// GET SEMANTIC SIGNAL FOR SCORING
// combines strength + vitality
// into single competitive score
// ======================================

export function getSemanticSignal(pathKey) {

    const strength =
        semanticStrength.get(pathKey) || 0;

    const vitality =
        semanticVitalityMap.get(pathKey) || 0;


    // ======================================
    // COMBINED SEMANTIC SCORE
    //
    // strength = "how important this path is"
    // vitality = "how alive this path feels now"
    //
    // both matter
    // strength gives baseline importance
    // vitality gives current relevance boost
    // ======================================

    return (strength * 0.55) + (vitality * 0.45);
}



// ======================================
// GET RAW VALUES
// for HUD display and debugging
// ======================================

export function getSemanticStrength(pathKey) {

    return semanticStrength.get(pathKey) || 0;

}

export function getSemanticVitalityLevel(pathKey) {

    return semanticVitalityMap.get(pathKey) || 0;

}



// ======================================
// REINFORCE FROM FULL EPISODE
// called during successful episode replay
// strengthens all path segments
// ======================================

export function reinforceEpisodeSemantics(

    pathIds,
    episodeReward

) {

    for (let i = 0; i < pathIds.length - 1; i++) {

        const fromId = pathIds[i];
        const toId   = pathIds[i + 1];

        const pathKey = fromId + "->" + toId;

        // later steps in episode get stronger reinforcement
        // completing the full chain is what matters
        const positionBonus = (i + 1) / pathIds.length;

        reinforceSemanticStrength(

            pathKey,
            episodeReward * positionBonus

        );
    }
}