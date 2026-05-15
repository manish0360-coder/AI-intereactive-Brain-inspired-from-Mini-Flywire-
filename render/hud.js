// ======================================
// 🧠 BRAIN HUD
// Static controls created ONCE in createHUD.
// Only the stats div is updated each tick.
// This is why the slider works correctly.
// ======================================

let hudEl      = null;   // outer container
let statsEl    = null;   // only this part is re-rendered
let fadeTimer  = null;
let _lastThought = "";
let _currentSpeed = 500; // ms — kept in sync with slider

// callbacks wired from main.js
let _onSpeedChange = null;
let _onPoke        = null;

export function setHudCallbacks({ onSpeedChange, onPoke }) {
    _onSpeedChange = onSpeedChange || null;
    _onPoke        = onPoke        || null;
}

// ── fade ──────────────────────────────────────────────
function fadeOut() {
    if (!hudEl) return;
    hudEl.style.transition    = "opacity 1.5s ease";
    hudEl.style.opacity       = "0.08";
    hudEl.style.pointerEvents = "none";
}
export function fadeIn() {
    if (!hudEl) return;
    clearTimeout(fadeTimer);
    hudEl.style.transition    = "opacity 0.2s ease";
    hudEl.style.opacity       = "1";
    hudEl.style.pointerEvents = "auto";
    fadeTimer = setTimeout(fadeOut, 6000);
}

// ── helpers ───────────────────────────────────────────
function bar(value, max, color, pulse = false) {
    const pct  = Math.min(100, Math.max(0, (value / max) * 100)).toFixed(0);
    const anim = (pulse && value > max * 0.55)
        ? "animation:pulse-bar 0.5s infinite alternate;"
        : "";
    return `<div style="width:100%;height:8px;background:#1a1a1a;border-radius:4px;
                margin:2px 0 4px;overflow:hidden">
        <div style="width:${pct}%;height:100%;background:${color};border-radius:4px;
            transition:width 0.35s ease;${anim}"></div>
    </div>`;
}

function moodFace(stress, confidence, fatigue) {
    if (stress > 3.5)     return "😱";
    if (stress > 2.5)     return "😰";
    if (fatigue > 3.5)    return "😴";
    if (fatigue > 2)      return "🥱";
    if (confidence > 3)   return "😎";
    if (confidence > 1.5) return "🙂";
    return "😐";
}

function speedLabel(ms) {
    if (ms <= 200)  return "⚡ Turbo";
    if (ms <= 500)  return "🚀 Fast";
    if (ms <= 1000) return "🚶 Normal";
    return "🐢 Slow";
}

// ======================================
// CREATE HUD  (called once on startup)
// ======================================
export function createHUD() {
    if (hudEl) return;

    // global CSS for animations
    const style = document.createElement("style");
    style.textContent = `
        @keyframes pulse-bar { from{opacity:1} to{opacity:0.45} }
        @keyframes hud-shake  { 0%,100%{transform:translateX(0)}
                                 25%{transform:translateX(-5px)}
                                 75%{transform:translateX(5px)} }
        .hud-shake { animation: hud-shake 0.35s ease; }
        #hud-poke:hover  { background:#ff6644 !important; }
        #hud-calm:hover  { background:#33aa66 !important; }
        #hud-speed::-webkit-slider-thumb { cursor:grab; }
    `;
    document.head.appendChild(style);

    hudEl = document.createElement("div");
    hudEl.id = "brain-hud";
    hudEl.style.cssText = `
        position:fixed; top:10px; right:10px;
        width:240px;
        background:rgba(0,0,0,0.90);
        color:#fff;
        font-family:monospace;
        font-size:13px;
        padding:14px 16px 12px;
        border:2px solid #4488ff;
        box-shadow:0 0 20px #1133aa;
        z-index:9999;
        border-radius:14px;
        line-height:1.75;
        transition:opacity 0.3s ease;
        user-select:none;
    `;

    // ── static controls (never rebuilt) ──────────────
    const controls = document.createElement("div");
    controls.innerHTML = `
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
            <span id="hud-face" style="font-size:30px;line-height:1">😐</span>
            <div>
                <div style="font-size:15px;font-weight:bold">Brain Status</div>
                <div id="hud-thought" style="font-size:11px;color:#aaddff">Waiting...</div>
            </div>
        </div>
        <hr style="border-color:#333;margin:5px 0">
    `;
    hudEl.appendChild(controls);

    // ── live stats area (only this is re-rendered) ────
    statsEl = document.createElement("div");
    statsEl.id = "hud-stats";
    statsEl.innerHTML = `<i style="color:#555">Starting up...</i>`;
    hudEl.appendChild(statsEl);

    // ── divider ───────────────────────────────────────
    const div1 = document.createElement("hr");
    div1.style.cssText = "border-color:#333;margin:8px 0";
    hudEl.appendChild(div1);

    // ── speed control ─────────────────────────────────
    const speedSection = document.createElement("div");
    speedSection.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px">
            <span style="font-size:12px;color:#aaa">⚡ Brain speed</span>
            <span id="hud-speed-label" style="font-size:12px;color:#ffff88">🚀 Fast</span>
        </div>
        <input id="hud-speed" type="range" min="100" max="2000" step="100" value="500"
            style="width:100%;accent-color:#4488ff;cursor:pointer;margin:0">
        <div style="display:flex;justify-content:space-between;font-size:10px;
            color:#555;margin-top:1px">
            <span>Fast (100ms)</span><span>Slow (2s)</span>
        </div>
    `;
    hudEl.appendChild(speedSection);

    // ── buttons ───────────────────────────────────────
    const btnSection = document.createElement("div");
    btnSection.style.marginTop = "8px";
    btnSection.innerHTML = `
        <button id="hud-poke" style="
            width:100%;padding:7px 0;margin-bottom:5px;
            background:#cc2211;color:#fff;border:none;
            border-radius:8px;font-family:monospace;font-size:13px;
            cursor:pointer;font-weight:bold;transition:background 0.15s;">
            😱 Stress the brain!
        </button>
        <button id="hud-calm" style="
            width:100%;padding:7px 0;
            background:#1a5c38;color:#fff;border:none;
            border-radius:8px;font-family:monospace;font-size:13px;
            cursor:pointer;font-weight:bold;transition:background 0.15s;">
            😌 Calm it down
        </button>
        <div style="margin-top:6px;font-size:10px;color:#555;text-align:center">
            Space = auto on/off &nbsp;·&nbsp; Click = teach &nbsp;·&nbsp; Shift+Click = set goal
        </div>
    `;
    hudEl.appendChild(btnSection);

    document.body.appendChild(hudEl);

    // ── wire slider (once, never re-wired) ────────────
    const slider      = document.getElementById("hud-speed");
    const speedLbl    = document.getElementById("hud-speed-label");
    slider.addEventListener("input", () => {
        _currentSpeed = parseInt(slider.value);
        speedLbl.textContent = speedLabel(_currentSpeed);
        if (_onSpeedChange) _onSpeedChange(_currentSpeed);
        fadeIn();
    });

    // ── wire buttons (once) ───────────────────────────
    document.getElementById("hud-poke").addEventListener("click", () => {
        if (_onPoke) _onPoke("stress");
        fadeIn();
    });
    document.getElementById("hud-calm").addEventListener("click", () => {
        if (_onPoke) _onPoke("calm");
        fadeIn();
    });

    // ── hover restores ────────────────────────────────
    hudEl.addEventListener("mouseenter", fadeIn);
    fadeTimer = setTimeout(fadeOut, 6000);
}

// ======================================
// UPDATE HUD  (called every ~500ms)
// Only updates statsEl + face + thought.
// Never touches slider or buttons.
// ======================================
export function updateHUD({
    curiosityState, confidenceState, stressState,
    fatigueState, focusState,
    qValue, futureBonus, finalWeight, currentThought
}) {
    if (!hudEl || !statsEl) return;

    // pop visible only when thought changes
    if (currentThought !== _lastThought) {
        _lastThought = currentThought;
        fadeIn();
    }

    // update face + thought (targeted DOM, not innerHTML rebuild)
    const faceEl    = document.getElementById("hud-face");
    const thoughtEl = document.getElementById("hud-thought");
    if (faceEl)    faceEl.textContent    = moodFace(stressState, confidenceState, fatigueState);
    if (thoughtEl) thoughtEl.textContent = currentThought;

    // shake on high stress
    if (stressState > 3.5 && !hudEl.classList.contains("hud-shake")) {
        hudEl.classList.add("hud-shake");
        setTimeout(() => hudEl.classList.remove("hud-shake"), 380);
    }

    // mood words
    const stressWord  = stressState     > 3.5 ? "😱 Panicking!" : stressState  > 2.5 ? "😰 Stressed"
                      : stressState     > 0.8 ? "😬 Worried"    : "😌 Calm";
    const curioWord   = curiosityState  > 2   ? "🔍 Exploring!" : curiosityState > 0.5 ? "👀 Curious" : "😐 Bored";
    const confidWord  = confidenceState > 2   ? "💪 Confident"  : confidenceState > 0.5 ? "🙂 OK"     : "😟 Unsure";
    const tiredWord   = fatigueState    > 2   ? "😴 Tired"      : fatigueState   > 0.5 ? "🥱 Sleepy"  : "⚡ Fresh";

    let verdict = "🤔 Thinking...";
    if (finalWeight > 20) verdict = "🌟 Great path!";
    else if (finalWeight > 5) verdict = "👍 Good path";
    else if (finalWeight < 0) verdict = "⚠️ Risky!";

    // only rebuild the stats section
    statsEl.innerHTML = `
        <div style="margin-bottom:2px;font-size:12px">
            😰 <b>Stress</b> — ${stressWord}
        </div>
        ${bar(stressState, 5, "#ff4422", true)}

        <div style="margin-bottom:2px;font-size:12px">
            🔍 <b>Curiosity</b> — ${curioWord}
        </div>
        ${bar(curiosityState, 5, "#00ffcc")}

        <div style="margin-bottom:2px;font-size:12px">
            💪 <b>Confidence</b> — ${confidWord}
        </div>
        ${bar(confidenceState, 5, "#44aaff")}

        <div style="margin-bottom:2px;font-size:12px">
            😴 <b>Tiredness</b> — ${tiredWord}
        </div>
        ${bar(fatigueState, 5, "#ffaa00")}

        <div style="margin-top:4px;font-size:12px;color:#ffff88">
            Score: ${finalWeight.toFixed(1)} — ${verdict}
        </div>
    `;
}
