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

// label update callback (set from main.js)
let onFrameCallback = null;

// ======================================
// ALLOW MAIN.JS TO GIVE STARS
// ======================================

export function setStars(starGroup) {

    // save stars reference
    stars = starGroup;

}

// ======================================
// ALLOW MAIN.JS TO REGISTER A PER-FRAME HOOK
// Used to sync HTML labels to 3D positions
// ======================================
export function setOnFrame(fn) {
    onFrameCallback = fn;
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

    // run per-frame hook (label sync, etc.)
    if (onFrameCallback) {
        onFrameCallback();
    }

    // draw scene
    renderer.render(
        scene,
        camera
    );

}