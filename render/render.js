// ======================================
// IMPORT SCENE OBJECTS
// ======================================

import {

    renderer,
    scene,
    camera

} from "./scene.js";



// ======================================
// STAR ANIMATION TARGET
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
// MAIN RENDER LOOP
// ======================================

export function animate() {

    // run forever
    requestAnimationFrame(animate);



    // rotate stars if they exist
    if (stars) {

        stars.rotation.y += 0.0005;

    }



    // draw scene
    renderer.render(
        scene,
        camera
    );

}