// ======================================
// 🧠 LOCAL EMOTION MAP SYSTEM
// ======================================
// every path stores emotional experience
// lion -> hunt feels different from
// cat -> milk
// ======================================


// path emotions
const localEmotionMap = new Map();




// ======================================
// CREATE PATH KEY
// ======================================

function makeKey(fromId, toId) {

    return fromId + "->" + toId;

}




// ======================================
// GET LOCAL EMOTIONS
// ======================================

export function getLocalEmotion(

    fromId,
    toId

) {

    const key = makeKey(fromId, toId);




    // create empty emotional memory
    if (!localEmotionMap.has(key)) {

        localEmotionMap.set(key, {

            confidence: 0,
            fatigue: 0,
            stress: 0,
            trust: 0,
            fear: 0

        });

    }




    return localEmotionMap.get(key);

}




// ======================================
// UPDATE LOCAL EMOTIONS
// ======================================

export function updateLocalEmotion({

    fromId,
    toId,

    reward,
    danger,
    repeated

}) {

    const emotion =

        getLocalEmotion(fromId, toId);




    // successful paths gain confidence
    emotion.confidence += reward * 0.05;




    // dangerous paths create fear
    emotion.fear += danger * 0.08;




    // repeated actions create fatigue
    emotion.fatigue += repeated * 0.03;




    // stress from danger + fatigue
    emotion.stress +=

        (danger * 0.04) +

        (emotion.fatigue * 0.01);




    // trusted successful memories
    emotion.trust += reward * 0.03;




    // ======================================
    // NATURAL EMOTIONAL DECAY
    // emotions slowly stabilize
    // ======================================

    emotion.fear *= 0.995;
    emotion.stress *= 0.995;
    emotion.fatigue *= 0.997;

}