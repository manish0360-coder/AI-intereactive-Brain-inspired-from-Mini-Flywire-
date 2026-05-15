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

    hudElement.style.width = "420px";

    hudElement.style.background =
    "rgba(0,0,0,0.8)";

    hudElement.style.color = "#36cdaf";

    hudElement.style.fontFamily = "monospace";

    hudElement.style.fontSize = "17px";

    hudElement.style.padding = "18px";

    hudElement.style.border =
    "1px solid #0e01ff";

    hudElement.style.boxShadow =
    "0 0 20px #260bf2";

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

    <div style="
    font-size:22px;
    color:#ffffff;
    margin-bottom:12px;
    ">

    🧠 Thinking:
    ${currentThought}

    </div>

    <hr>

    🧠 Curiosity:
    ${curiosityState.toFixed(2)}

    <div style="
    width:100%;
    height:8px;
    background:#111;
    border:1px solid #00ffcc;
    margin-top:4px;
    margin-bottom:8px;
    ">

    <div style="
    width:${curiosityState * 20}%;
    height:100%;
    background:#00ffcc;
    "></div>

    </div>

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