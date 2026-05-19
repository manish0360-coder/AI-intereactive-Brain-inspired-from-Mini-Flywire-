// ======================================
// IMPORT SCENE OBJECTS
// ======================================

import {

    renderer,
    scene,
    camera,
    group
} from "./scene.js";



// ======================================
// STAR REFERENCE
// ======================================

// this variable will later receive stars
let stars = null;



// ======================================
// ALLOW MAIN.JS TO GIVE STARS
// ======================================

export function setStars(starGroup) {

    // save stars reference
    stars = starGroup;

}



// ======================================
// MAIN ANIMATION LOOP
// ======================================

export function animate() {

    // run forever
    requestAnimationFrame(animate);



    // rotate stars
    if (stars) {

        stars.rotation.y += 0.0005;

    }



    // animate neurons
    group.traverse((obj) => {

        // skip non-neurons
        if (!obj.userData?.isNeuron) return;



        // safe activation
        const activation =
            obj.userData.activation || 0;



        // smooth decay
        obj.userData.activation *= 0.94;



        // safe neuron scale
        const scale =

            1 +

            (activation * 0.3);



        obj.scale.set(

            scale,
            scale,
            scale

        );

    });



    // render scene
    renderer.render(scene, camera);

}