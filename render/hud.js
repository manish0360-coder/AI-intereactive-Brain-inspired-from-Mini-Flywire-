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

    currentThought,

    // new companion-relevant signals
    dominantDrive   = null,
    episodeCount    = 0,
    stablePaths     = 0,
    stressEscape    = false,

}) {

    // safety
    if (!hudElement) return;

    // stress bar width (stress max=30, normalize to %)
    const stressBarPct = Math.min((stressState / 30) * 100, 100);
    const stressColor  = stressState > 15 ? "#ff4444" : stressState > 8 ? "#ffaa00" : "#44ff88";

    // drive color coding
    const driveColors = { hunger:"#ffaa00", boredom:"#00aaff", stress:"#ff4444",
                          fatigue:"#888888", social:"#cc44ff", uncertainty:"#44ffff" };
    const driveColor  = (dominantDrive && driveColors[dominantDrive]) || "#36cdaf";

    hudElement.innerHTML = `

    <b>🧠 LIVE BRAIN HUD</b>
    <hr>

    <div style="font-size:20px;color:#ffffff;margin-bottom:10px;">
    🧠 ${currentThought}
    </div>

    ${dominantDrive ? `<div style="font-size:13px;color:${driveColor};margin-bottom:8px;">
    ⚡ Drive: <b>${dominantDrive.toUpperCase()}</b>${stressEscape ? " 🌪️ STRESS ESCAPE" : ""}
    </div>` : ""}

    <hr>

    🧠 Curiosity: ${curiosityState.toFixed(2)}
    <div style="width:100%;height:7px;background:#111;border:1px solid #00ffcc;margin:3px 0 7px;">
    <div style="width:${Math.min(curiosityState*20,100)}%;height:100%;background:#00ffcc;"></div></div>

    😰 Stress: ${stressState.toFixed(2)}
    <div style="width:100%;height:7px;background:#111;border:1px solid ${stressColor};margin:3px 0 7px;">
    <div style="width:${stressBarPct}%;height:100%;background:${stressColor};"></div></div>

    💪 Confidence: ${confidenceState.toFixed(2)}
    &nbsp;&nbsp;
    😴 Fatigue: ${fatigueState.toFixed(2)}
    &nbsp;&nbsp;
    🔥 Focus: ${focusState.toFixed(2)}

    <hr>

    📘 Q-Value: ${qValue.toFixed(2)}
    &nbsp;&nbsp;
    🔮 Future: ${futureBonus.toFixed(2)}
    &nbsp;&nbsp;
    ⭐ Score: ${finalWeight.toFixed(2)}

    ${episodeCount > 0 || stablePaths > 0 ? `
    <hr style="border-color:#333;">
    <span style="font-size:13px;color:#888;">
    📦 Episodes: ${episodeCount} &nbsp; 🏛️ Stable: ${stablePaths}
    </span>` : ""}

    `;
}