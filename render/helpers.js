// ======================================
// HELPER FUNCTIONS
// ======================================



// ======================================
// NORMALIZE VECTOR
// ======================================

export function normalize(vec) {

    // vector length
    let mag = 0;



    // calculate magnitude
    for (let i = 0; i < vec.length; i++) {

        mag += vec[i] * vec[i];

    }



    // square root
    mag = Math.sqrt(mag);



    // avoid divide by zero
    if (mag === 0) {

        return vec;

    }



    // divide every value
    for (let i = 0; i < vec.length; i++) {

        vec[i] /= mag;

    }



    return vec;

}



// ======================================
// DOT PRODUCT
// ======================================

export function dot(a, b) {

    // invalid vectors
    if (!a || !b) return 0;



    let sum = 0;



    // multiply values
    for (let i = 0; i < a.length; i++) {

        sum += a[i] * b[i];

    }



    return sum;

}


// ======================================
// 🧠 EMERGENT REWARD GROWTH
// ======================================
// unbounded but self-decelerating growth.
// reward keeps climbing forever, but each
// increment shrinks as the value rises —
// emergent reinforcement with NO artificial
// hard ceiling. replaces Math.min(x, CAP).
//
//   growReward(0,   1) = 1.00
//   growReward(20,  1) = 0.55
//   growReward(50,  1) = 0.33
//   growReward(100, 1) = 0.20
//
// the curve never flattens to zero, so the
// brain can always learn a little more —
// it just slows down, like a real habit.
// ======================================

export function growReward(oldValue, delta) {

    // safety — treat missing memory as 0
    const base = oldValue || 0;

    // diminishing-returns increment
    return base + delta / (1 + base * 0.04);

}