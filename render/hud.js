// ======================================
// 🧠 BRAIN HUD
// One panel, right side.
// Static shell created once — only the
// #hud-stats div is re-rendered each tick.
// ======================================

let hudEl        = null;
let statsEl      = null;
let fadeTimer    = null;
let _lastThought = "";

// speed callback wired from main.js
let _onSpeedChange = null;
export function setHudCallbacks({ onSpeedChange }) {
    _onSpeedChange = onSpeedChange || null;
}

// ── fade ──────────────────────────────────────────────
function fadeOut() {
    if (!hudEl) return;
    hudEl.style.transition    = "opacity 1.8s ease";
    hudEl.style.opacity       = "0.07";
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

// ── progress bar ──────────────────────────────────────
function bar(value, max, color, pulse = false) {
    const pct  = Math.min(100, Math.max(0, (value / max) * 100)).toFixed(0);
    const anim = (pulse && value > max * 0.55)
        ? "animation:pulse-bar 0.5s infinite alternate;"
        : "";
    return `
    <div style="width:100%;height:9px;background:#1c1c1c;border-radius:5px;
                margin:3px 0 8px;overflow:hidden">
        <div style="width:${pct}%;height:100%;background:${color};border-radius:5px;
            transition:width 0.4s ease;${anim}"></div>
    </div>`;
}

// ── mood face ─────────────────────────────────────────
function moodFace(stress, confidence, fatigue) {
    if (stress > 3.5)     return "😱";
    if (stress > 2.5)     return "😰";
    if (fatigue > 3.5)    return "😴";
    if (fatigue > 2)      return "🥱";
    if (confidence > 3)   return "😎";
    if (confidence > 1.5) return "🙂";
    return "😐";
}

// ── speed label ───────────────────────────────────────
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

    // global CSS
    const style = document.createElement("style");
    style.textContent = `
        @keyframes pulse-bar  { from{opacity:1} to{opacity:0.4} }
        @keyframes hud-shake  {
            0%,100%{transform:translateX(0)}
            25%{transform:translateX(-5px)}
            75%{transform:translateX(5px)}
        }
        .hud-shake { animation:hud-shake 0.35s ease; }
        #hud-speed { width:100%; accent-color:#4488ff; cursor:pointer; margin:0; }
        #hud-speed::-webkit-slider-thumb { cursor:grab; }
    `;
    document.head.appendChild(style);

    hudEl = document.createElement("div");
    hudEl.id = "brain-hud";
    hudEl.style.cssText = `
        position:fixed; top:10px; right:10px;
        width:250px;
        background:rgba(0,0,0,0.92);
        color:#fff;
        font-family:monospace;
        font-size:13px;
        padding:14px 16px 14px;
        border:2px solid #4488ff;
        box-shadow:0 0 22px #1133bb;
        z-index:9999;
        border-radius:14px;
        line-height:1.6;
        transition:opacity 0.3s ease;
        user-select:none;
    `;

    // ── HEADER: face + title + current thought ────────
    const header = document.createElement("div");
    header.innerHTML = `
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
            <span id="hud-face" style="font-size:34px;line-height:1">😐</span>
            <div style="flex:1;min-width:0">
                <div style="font-size:14px;font-weight:bold;letter-spacing:0.5px">
                    🧠 Brain Status
                </div>
                <div id="hud-thought"
                    style="font-size:11px;color:#88bbff;white-space:nowrap;
                           overflow:hidden;text-overflow:ellipsis;max-width:170px">
                    Waiting for first thought…
                </div>
            </div>
        </div>
        <hr style="border:none;border-top:1px solid #2a2a2a;margin:0 0 8px">
    `;
    hudEl.appendChild(header);

    // ── LIVE STATS (only this div is re-rendered) ─────
    statsEl = document.createElement("div");
    statsEl.id = "hud-stats";
    statsEl.innerHTML = `<span style="color:#444;font-size:12px">Starting…</span>`;
    hudEl.appendChild(statsEl);

    // ── SPEED CONTROL ─────────────────────────────────
    const speedWrap = document.createElement("div");
    speedWrap.style.cssText = "margin-top:10px;border-top:1px solid #2a2a2a;padding-top:10px";
    speedWrap.innerHTML = `
        <div style="display:flex;justify-content:space-between;
                    align-items:center;margin-bottom:4px">
            <span style="font-size:12px;color:#aaa">⚡ Thinking speed</span>
            <span id="hud-speed-label"
                  style="font-size:12px;color:#ffff88;font-weight:bold">🚀 Fast</span>
        </div>
        <input id="hud-speed" type="range" min="100" max="2000" step="100" value="500">
        <div style="display:flex;justify-content:space-between;
                    font-size:10px;color:#444;margin-top:2px">
            <span>Faster</span><span>Slower</span>
        </div>
    `;
    hudEl.appendChild(speedWrap);

    // ── COLOUR LEGEND ─────────────────────────────────
    const legend = document.createElement("div");
    legend.style.cssText = "margin-top:10px;border-top:1px solid #2a2a2a;padding-top:10px";
    legend.innerHTML = `
        <div style="font-size:11px;color:#888;margin-bottom:5px;font-weight:bold">
            WHAT THE COLOURS MEAN
        </div>
        <div style="font-size:12px;line-height:2">
            <span style="color:#ff8844">●</span> Animal &nbsp;
            <span style="color:#44ff88">●</span> Food &nbsp;
            <span style="color:#ffff00">●</span> Action &nbsp;
            <span style="color:#4488ff">●</span> Place<br>
            <span style="color:#00ffff">● cyan dot</span>
            = brain sending a thought<br>
            <span style="color:#ffff00">● yellow dot</span>
            = brain learning a step
        </div>
    `;
    hudEl.appendChild(legend);

    // ── CONTROLS HINT ─────────────────────────────────
    const hint = document.createElement("div");
    hint.style.cssText = `
        margin-top:10px;border-top:1px solid #2a2a2a;padding-top:8px;
        font-size:11px;color:#555;line-height:1.9;
    `;
    hint.innerHTML = `
        <b style="color:#666">CONTROLS</b><br>
        <span style="color:#aaa">Click</span> a word → teach the brain<br>
        <span style="color:#aaa">Space</span> → auto-brain on / off<br>
        <span style="color:#aaa">Shift+Click</span> → set a goal 🎯
    `;
    hudEl.appendChild(hint);

    document.body.appendChild(hudEl);

    // ── wire slider once ──────────────────────────────
    const slider   = document.getElementById("hud-speed");
    const speedLbl = document.getElementById("hud-speed-label");
    slider.addEventListener("input", () => {
        const ms = parseInt(slider.value);
        speedLbl.textContent = speedLabel(ms);
        if (_onSpeedChange) _onSpeedChange(ms);
        fadeIn();
    });

    // ── hover restores ────────────────────────────────
    hudEl.addEventListener("mouseenter", fadeIn);
    fadeTimer = setTimeout(fadeOut, 6000);
}

// ======================================
// UPDATE HUD  (called every ~500ms)
// Only touches statsEl, hud-face, hud-thought.
// Never rebuilds slider, legend, or hint.
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

    // update face + thought label in-place
    const faceEl    = document.getElementById("hud-face");
    const thoughtEl = document.getElementById("hud-thought");
    if (faceEl)    faceEl.textContent    = moodFace(stressState, confidenceState, fatigueState);
    if (thoughtEl) thoughtEl.textContent = currentThought;

    // shake on panic
    if (stressState > 3.5 && !hudEl.classList.contains("hud-shake")) {
        hudEl.classList.add("hud-shake");
        setTimeout(() => hudEl.classList.remove("hud-shake"), 380);
    }

    // ── mood words ────────────────────────────────────
    const stressWord = stressState > 3.5 ? "😱 Panicking!"
                     : stressState > 2.5 ? "😰 Stressed"
                     : stressState > 0.8 ? "😬 Worried"
                     : "😌 Calm";

    const curioWord  = curiosityState > 2   ? "🔍 Exploring new paths!"
                     : curiosityState > 0.5 ? "👀 A bit curious"
                     : "😐 Not curious";

    const confidWord = confidenceState > 2   ? "💪 Very confident"
                     : confidenceState > 0.5 ? "🙂 Fairly sure"
                     : "😟 Unsure";

    const tiredWord  = fatigueState > 2   ? "😴 Needs a rest"
                     : fatigueState > 0.5 ? "🥱 Getting sleepy"
                     : "⚡ Full energy";

    // ── decision verdict ──────────────────────────────
    let verdict = "🤔 Deciding…";
    if (finalWeight > 20) verdict = "🌟 Really good path!";
    else if (finalWeight > 5) verdict = "👍 Good path";
    else if (finalWeight < 0) verdict = "⚠️ Risky path";

    // ── rebuild only the stats section ────────────────
    statsEl.innerHTML = `
        <div style="font-size:11px;color:#888;margin-bottom:6px;font-weight:bold">
            BRAIN FEELINGS RIGHT NOW
        </div>

        <div style="font-size:12px;margin-bottom:1px">
            😰 <b>Stress</b> — <span style="color:#ff8866">${stressWord}</span>
        </div>
        ${bar(stressState, 5, "#ff4422", true)}

        <div style="font-size:12px;margin-bottom:1px">
            🔍 <b>Curiosity</b> — <span style="color:#88ffdd">${curioWord}</span>
        </div>
        ${bar(curiosityState, 5, "#00ffcc")}

        <div style="font-size:12px;margin-bottom:1px">
            💪 <b>Confidence</b> — <span style="color:#88aaff">${confidWord}</span>
        </div>
        ${bar(confidenceState, 5, "#4499ff")}

        <div style="font-size:12px;margin-bottom:1px">
            😴 <b>Tiredness</b> — <span style="color:#ffcc88">${tiredWord}</span>
        </div>
        ${bar(fatigueState, 5, "#ffaa00")}

        <div style="margin-top:6px;padding:6px 8px;background:#111;border-radius:6px;
                    font-size:12px;color:#ffff88;border-left:3px solid #4488ff">
            Last decision score: <b>${finalWeight.toFixed(1)}</b><br>
            <span style="color:#ccc">${verdict}</span>
        </div>
    `;
}
