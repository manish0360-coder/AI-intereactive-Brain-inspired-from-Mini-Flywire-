// ======================================
// 🧠 UNCERTAINTY ENGINE
// ======================================
// Computes three uncertainty signals:
//
// 1. Prediction Surprise
//    how wrong was the brain's prediction?
//    high surprise → something unexpected
//
// 2. Inconsistency
//    how variable are outcomes on this path?
//    high variance → unreliable path
//
// 3. Novelty Pressure
//    how unexplored is this path?
//    high novelty → strong curiosity pull
//
// These feed into the executive controller
// as a first-class uncertainty signal.
// ======================================



// ======================================
// PREDICTION MEMORY
// path key → last predicted reward
// ======================================

const predictionHistory = new Map();



// ======================================
// SURPRISE MEMORY
// path key → exponential moving average
//            of recent prediction errors
// ======================================

const surpriseMap = new Map();



// ======================================
// INCONSISTENCY MEMORY
// path key → running variance accumulator
// ======================================

const inconsistencyMap = new Map();



// ======================================
// VISIT COUNT MEMORY
// path key → total traversal count
// ======================================

const visitCount = new Map();



// ======================================
// UPDATE UNCERTAINTY
// called after each agent step
// with predicted vs actual outcome
// ======================================

export function updateUncertainty(

    pathKey,
    predictedReward,
    actualReward

) {

    // ======================================
    // PREDICTION ERROR = surprise
    // ======================================

    const error =
        Math.abs(actualReward - predictedReward);


    // ======================================
    // UPDATE SURPRISE
    // exponential moving average
    // recent errors weighted higher
    // ======================================

    const oldSurprise =
        surpriseMap.get(pathKey) || 0;

    // fast adaptation (0.3) means
    // brain quickly notices surprises
    surpriseMap.set(
        pathKey,
        oldSurprise * 0.7 + error * 0.3
    );


    // ======================================
    // UPDATE INCONSISTENCY
    // tracks variance of outcomes
    // paths with wildly varying outcomes
    // are unreliable → increase uncertainty
    // ======================================

    const oldInconsistency =
        inconsistencyMap.get(pathKey) || 0;

    inconsistencyMap.set(
        pathKey,
        oldInconsistency * 0.92 + (error * error) * 0.08
    );


    // ======================================
    // STORE LAST PREDICTION
    // for next comparison
    // ======================================

    predictionHistory.set(
        pathKey,
        predictedReward
    );


    // ======================================
    // INCREMENT VISIT COUNT
    // ======================================

    visitCount.set(
        pathKey,
        (visitCount.get(pathKey) || 0) + 1
    );
}



// ======================================
// GET UNCERTAINTY SCORE
// for executive controller
//
// returns [0, 5] range
// higher = more uncertain = more
//          exploration pressure
// ======================================

export function getUncertaintyScore(pathKey) {

    const surprise =
        surpriseMap.get(pathKey) || 0;

    const inconsistency =
        Math.sqrt(inconsistencyMap.get(pathKey) || 0);

    const visits =
        visitCount.get(pathKey) || 0;


    // ======================================
    // NOVELTY COMPONENT
    // unexplored paths are uncertain
    // familiarity reduces novelty pressure
    // ======================================

    const noveltyPressure =
        1 / Math.sqrt(visits + 1);


    // ======================================
    // COMBINED UNCERTAINTY
    //
    // surprise:     unexpected outcomes
    // inconsistency: variable outcomes
    // novelty:      unexplored territory
    // ======================================

    const rawUncertainty =
        surprise       * 0.4 +
        inconsistency  * 0.35 +
        noveltyPressure * 0.25;

    return Math.min(rawUncertainty * 3, 5);
}



// ======================================
// GET PREDICTION CALIBRATION
// how consistent are predictions?
// used to modulate confidence weight
// ======================================

export function getPredictionCalibration(pathKey) {

    const inconsistency =
        inconsistencyMap.get(pathKey) || 0;

    const visits =
        visitCount.get(pathKey) || 0;


    // well-calibrated = low inconsistency + many visits
    const calibration =
        (1 / (1 + Math.sqrt(inconsistency))) *
        Math.min(visits / 10, 1);

    return calibration;
}



// ======================================
// GET GLOBAL UNCERTAINTY PRESSURE
// average uncertainty across recent paths
// drives overall exploration vs exploitation
// ======================================

export function getGlobalUncertaintyPressure() {

    if (surpriseMap.size === 0) return 0.5;

    let total = 0;
    let count = 0;

    surpriseMap.forEach(value => {
        total += value;
        count++;
    });

    return Math.min(total / count, 1);
}



// ======================================
// DECAY UNCERTAINTY MEMORY
// call each agent step
// surprises fade as paths stabilize
// ======================================

export function decayUncertainty() {

    surpriseMap.forEach((v, k) => {
        const decayed = v * 0.993;
        if (decayed < 0.001) {
            surpriseMap.delete(k);
        } else {
            surpriseMap.set(k, decayed);
        }
    });

    inconsistencyMap.forEach((v, k) => {
        const decayed = v * 0.996;
        if (decayed < 0.0001) {
            inconsistencyMap.delete(k);
        } else {
            inconsistencyMap.set(k, decayed);
        }
    });
}



// ======================================
// GET SNAPSHOT
// for HUD/debugging
// ======================================

export function getUncertaintySnapshot() {

    return {
        totalPaths:       surpriseMap.size,
        avgSurprise:      getGlobalUncertaintyPressure(),
        highestSurprise:  getHighestSurprisePath()
    };
}

function getHighestSurprisePath() {

    let max = 0;
    let maxKey = null;

    surpriseMap.forEach((v, k) => {
        if (v > max) {
            max = v;
            maxKey = k;
        }
    });

    return { key: maxKey, value: max };
}