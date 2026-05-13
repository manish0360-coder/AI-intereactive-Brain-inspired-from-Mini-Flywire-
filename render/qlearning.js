// ======================================
// Q LEARNING SYSTEM
// ======================================



// Q-table memory
export const Q = new Map();



// ======================================
// GET Q VALUE
// ======================================

// read learned value
export function getQ(state, action) {

    // create unique memory key
    const key = state + "->" + action;

    // return learned value
    // if nothing learned yet → return 0
    return Q.get(key) || 0;
}



// ======================================
// SAVE Q VALUE
// ======================================

// save learned value into memory
export function setQ(state, action, value) {

    // same memory key
    const key = state + "->" + action;

    // store learned value
    Q.set(key, value);
}