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