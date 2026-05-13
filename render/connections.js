// ======================================
// CONNECTION RENDER SYSTEM
// ======================================



// import scene group container
import {

    group

} from "./scene.js";



// ======================================
// STORE ALL CONNECTION LINES
// ======================================

// saves all rendered lines
const lines = [];



// ======================================
// NEURON DATABASE ACCESS
// ======================================

// reference to main neuron map
let neuronMapRef = null;



// ======================================
// GIVE NEURON MAP TO CONNECTION SYSTEM
// ======================================

export function setConnectionNeuronMap(map) {

    // store neuron database
    neuronMapRef = map;

}



// ======================================
// CONNECT TWO NEURONS
// ======================================

export function connectPoints(

    p1,      // neuron 1 position
    p2,      // neuron 2 position
    color,   // line color
    id1,     // neuron 1 id
    id2      // neuron 2 id

) {

    // create line geometry
    const geometry =
    new THREE.BufferGeometry().setFromPoints([

        p1,
        p2

    ]);



    // create line material
    const material =
    new THREE.LineBasicMaterial({

        color

    });



    // create final line
    const line =
    new THREE.Line(

        geometry,
        material

    );



    // add line into 3D group
    group.add(line);



    // save line into memory
    lines.push(line);




    // ======================================
    // SAVE NEIGHBOR RELATION
    // ======================================

    // find neurons by id
    const n1 = neuronMapRef.get(id1);
    const n2 = neuronMapRef.get(id2);



    // safety check
    if (!n1 || !n2) return;



    // neuron1 knows neuron2
    n1.userData.neighbors.push(id2);



    // neuron2 knows neuron1
    n2.userData.neighbors.push(id1);




    // return created line
    return line;
}