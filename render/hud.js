// ======================================
// 🧠 LIVE AI BRAIN HUD
// ======================================

// HUD container
let hudElement = null;

// ======================================
// CREATE HUD
// ======================================

export function createHUD() {

    // prevent duplicate HUD
    if (hudElement) return;

    // create panel
    hudElement = document.createElement("div");

    // panel style
    hudElement.style.position = "fixed";
    hudElement.style.top = "10px";
    hudElement.style.right = "10px";

    hudElement.style.width = "260px";

    hudElement.style.background =
    "rgba(0,0,0,0.8)";

    hudElement.style.color = "#00ffcc";

    hudElement.style.fontFamily = "monospace";

    hudElement.style.fontSize = "13px";

    hudElement.style.padding = "12px";

    hudElement.style.border =
    "1px solid #00ffcc";

    hudElement.style.zIndex = "9999";

    hudElement.style.borderRadius = "10px";

    hudElement.innerHTML =
    "<b>🧠 LIVE BRAIN HUD</b><hr>";

    // add to page
    document.body.appendChild(hudElement);
}



// ======================================
// UPDATE HUD VALUES
// ======================================

export function updateHUD({

    curiosityState,
    confidenceState,
    stressState,
    fatigueState,
    focusState,

    qValue,
    futureBonus,
    finalWeight,

    currentThought

}) {

    // safety
    if (!hudElement) return;

    hudElement.innerHTML = `

    <b>🧠 LIVE BRAIN HUD</b>
    <hr>

    🎯 Thought:
    ${currentThought}

    <hr>

    🧠 Curiosity:
    ${curiosityState.toFixed(2)}

    💪 Confidence:
    ${confidenceState.toFixed(2)}

    😰 Stress:
    ${stressState.toFixed(2)}

    😴 Fatigue:
    ${fatigueState.toFixed(2)}

    🔥 Focus:
    ${focusState.toFixed(2)}

    <hr>

    📘 Q-Value:
    ${qValue.toFixed(2)}

    🔮 Future:
    ${futureBonus.toFixed(2)}

    ⭐ Final Score:
    ${finalWeight.toFixed(2)}

    `;
}