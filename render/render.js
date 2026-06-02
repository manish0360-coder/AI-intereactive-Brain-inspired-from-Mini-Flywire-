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
// IMPORT FUTURISTIC PULSE SYSTEM
// ======================================

import { tickNeuronPulse } from "./neuronVisuals.js";


// ======================================
// STAR REFERENCE
// ======================================

let stars = null;

export function setStars(starGroup) {
    stars = starGroup;
}


// ======================================
// MAIN ANIMATION LOOP
// ======================================

export function animate() {

    requestAnimationFrame(animate);

    // rotate stars
    if (stars) {
        stars.rotation.y += 0.0004;
        stars.rotation.x += 0.00008;   // subtle tilt drift
    }

    // futuristic neuron pulse (breathing glow + ring rotation)
    tickNeuronPulse();

    // activation-based scale (for thought dots and fired neurons)
    group.traverse((obj) => {

        if (!obj.userData?.isNeuron) return;

        const activation = obj.userData.activation || 0;
        obj.userData.activation *= 0.94;

        // scale already managed by flashNeuronClick — only apply
        // activation spike on top when explicitly activated
        if (activation > 0.05) {
            const scale = 1 + activation * 0.25;
            obj.scale.set(scale, scale, scale);
        }
    });

    renderer.render(scene, camera);
}