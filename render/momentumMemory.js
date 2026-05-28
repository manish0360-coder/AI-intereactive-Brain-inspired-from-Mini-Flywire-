// ======================================
// 🧠 TRANSITION MOMENTUM MEMORY
// ======================================
// remembers recent thought flow
// previous -> current -> next
// ======================================



// ======================================
// MOMENTUM STORAGE
// ======================================

// stores sequence momentum
// key example:
// "human->food->eat"
export const momentumMemory = new Map();




// ======================================
// LEARN THOUGHT MOMENTUM
// ======================================

export function learnMomentum(

    previousId,
    currentId,
    nextId

) {

    // invalid sequence
    if (

        previousId == null ||

        currentId == null ||

        nextId == null

    ) return;



    // create momentum key
    const key =

        previousId +

        "->" +

        currentId +

        "->" +

        nextId;



    // current learned value
    const oldValue =

        momentumMemory.get(key) || 0;



    // strengthen momentum memory
    momentumMemory.set(

        key,

        oldValue + 1

    );

    // console.log removed: momentum fires dozens of times
    // per second during autonomous training, flooding the
    // console and burying meaningful cognitive events.
    // Momentum is an internal learning signal, not a
    // user-visible cognitive event.

}






// ======================================
// GET MOMENTUM BONUS
// ======================================

export function getMomentumBonus(

    previousId,
    currentId,
    nextId

) {

    // invalid sequence
    if (

        previousId == null ||

        currentId == null ||

        nextId == null

    ) return 0;



    // build lookup key
    const key =

        previousId +

        "->" +

        currentId +

        "->" +

        nextId;



    // learned momentum value
    const momentum =

        momentumMemory.get(key) || 0;



    // compressed scaling
    // prevents score explosion
    return Math.min(

        momentum * 0.8,

        6

    );

}