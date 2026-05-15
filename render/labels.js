// ======================================
// 🏷️ NEURON LABEL SYSTEM
// Shows the name of each neuron
// floating above it on screen
// ======================================

import { camera, renderer } from "./scene.js";

// stores all label divs
const labelDivs = new Map(); // neuronId -> div

// container for all labels
let labelContainer = null;

// ======================================
// CREATE THE LABEL CONTAINER
// ======================================
export function initLabelContainer() {
    labelContainer = document.createElement("div");
    labelContainer.style.position = "fixed";
    labelContainer.style.top = "0";
    labelContainer.style.left = "0";
    labelContainer.style.width = "100%";
    labelContainer.style.height = "100%";
    labelContainer.style.pointerEvents = "none"; // don't block clicks
    labelContainer.style.zIndex = "100";
    document.body.appendChild(labelContainer);
}

// ======================================
// CREATE A LABEL FOR ONE NEURON
// ======================================
export function createNeuronLabel(neuron) {
    const div = document.createElement("div");
    div.style.position = "absolute";
    div.style.color = "#ffffff";
    div.style.fontFamily = "monospace";
    div.style.fontSize = "13px";
    div.style.fontWeight = "bold";
    div.style.textShadow = "0 0 6px #000, 0 0 12px #000";
    div.style.pointerEvents = "none";
    div.style.transform = "translate(-50%, -130%)";
    div.style.whiteSpace = "nowrap";
    div.style.padding = "2px 6px";
    div.style.borderRadius = "4px";
    div.style.background = "rgba(0,0,0,0.55)";
    div.style.border = "1px solid rgba(255,255,255,0.15)";
    div.innerText = neuron.userData.label;
    div.dataset.neuronId = neuron.userData.id;

    labelContainer.appendChild(div);
    labelDivs.set(neuron.userData.id, div);
    return div;
}

// ======================================
// UPDATE ALL LABEL POSITIONS EACH FRAME
// Called from render loop
// ======================================
export function updateLabelPositions(neuronMap) {
    if (!labelContainer) return;

    neuronMap.forEach((neuron, id) => {
        const div = labelDivs.get(id);
        if (!div) return;

        // project 3D position to 2D screen
        const pos = neuron.position.clone();
        pos.project(camera);

        // convert to CSS pixels
        const x = (pos.x * 0.5 + 0.5) * window.innerWidth;
        const y = (-pos.y * 0.5 + 0.5) * window.innerHeight;

        // hide if behind camera
        if (pos.z > 1) {
            div.style.display = "none";
            return;
        }

        div.style.display = "block";
        div.style.left = x + "px";
        div.style.top = y + "px";
    });
}

// ======================================
// HIGHLIGHT A LABEL (when neuron clicked)
// ======================================
export function highlightLabel(id, color = "#ffff00") {
    const div = labelDivs.get(id);
    if (div) {
        div.style.color = color;
        div.style.fontSize = "15px";
        div.style.background = "rgba(0,0,0,0.8)";
    }
}

// ======================================
// RESET ALL LABELS TO DEFAULT STYLE
// ======================================
export function resetAllLabels(neuronMap) {
    neuronMap.forEach((neuron, id) => {
        const div = labelDivs.get(id);
        if (div) {
            div.style.color = "#ffffff";
            div.style.fontSize = "13px";
            div.style.background = "rgba(0,0,0,0.55)";
        }
    });
}
