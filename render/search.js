// ======================================
// SEARCH HELPERS
// ======================================



// neuron database
let neuronMapRef = null;



// ======================================
// CONNECT MAIN MAP
// ======================================

export function setNeuronMap(map) {

    neuronMapRef = map;

}



// ======================================
// FIND NEURON BY ID
// ======================================

export function findNeuronById(id) {

    return neuronMapRef.get(Number(id));

}