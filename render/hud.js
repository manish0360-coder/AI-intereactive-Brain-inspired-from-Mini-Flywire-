// ======================================
// 🧠 COGNITIVE OBSERVATORY — HUD
// ======================================
// Glass-panel live cognition monitor.
// 40%+ less text. Icon-driven signals.
// Drive color bleeds into border/glow.
// ======================================

let hudElement    = null;
let streamElement = null;
let speedElement  = null;

// ── Thought stream history (newest first) ─────────────────────────
const _streamHistory = [];
const _MAX_STREAM    = 8;

// ── Cluster → CSS color map ────────────────────────────────────────
const _CLUSTER_CSS = {
    perception: '#00E5FF',
    memory:     '#CC44FF',
    reasoning:  '#FF8844',
    action:     '#44FF88',
    learning:   '#4488FF',
};

// ── Drive → border/glow color ─────────────────────────────────────
const _DRIVE_COLORS = {
    hunger:      '#fbbf24',
    boredom:     '#60a5fa',
    stress:      '#f87171',
    fatigue:     '#94a3b8',
    social:      '#c084fc',
    uncertainty: '#22d3ee',
};

// ── Cognitive mood derivation ──────────────────────────────────────
function _deriveMood(stress, curiosity, stablePaths, focus) {
    if (stress > 15)                               return { label: 'STRESSED',      color: '#f87171' };
    if (stablePaths > 2 && curiosity < 0.12)       return { label: 'CONSOLIDATING', color: '#34d399' };
    if (focus > 0.6  && curiosity < 0.25)          return { label: 'GOAL-LOCKED',   color: '#22d3ee' };
    if (curiosity > 0.28)                          return { label: 'EXPLORING',     color: '#a855f7' };
    return                                                { label: 'REFLECTING',    color: '#94a3b8' };
}

// ── Thin animated bar HTML helper ─────────────────────────────────
function _bar(pct, color) {
    const w = Math.min(Math.max(pct, 0), 100).toFixed(1);
    return `<div style="width:100%;height:5px;
        background:rgba(255,255,255,0.07);border-radius:3px;overflow:hidden;">
        <div style="width:${w}%;height:100%;background:${color};border-radius:3px;
            box-shadow:0 0 6px ${color}88;
            transition:width 280ms cubic-bezier(0.4,0,0.2,1);"></div>
    </div>`;
}

// ── Global CSS (injected once) ─────────────────────────────────────
function _injectCSS() {
    if (document.getElementById('mfw-obs-css')) return;
    const s = document.createElement('style');
    s.id = 'mfw-obs-css';
    s.textContent = `
        .mfw-panel {
            position:fixed;
            font-family:'Courier New',monospace;
            background:rgba(8,12,22,0.72);
            backdrop-filter:blur(20px) saturate(1.4);
            -webkit-backdrop-filter:blur(20px) saturate(1.4);
            border-radius:12px;
            z-index:9999;
            color:#e2e8f0;
            transition: box-shadow 600ms ease, border-color 600ms ease;
        }
        .mfw-thought-in {
            animation: mfw-drop 220ms ease-out forwards;
        }
        @keyframes mfw-drop {
            from { opacity:0; transform:translateY(-10px); }
            to   { opacity:1; transform:translateY(0);     }
        }
        .mfw-chip {
            display:inline-block; padding:2px 7px; border-radius:4px;
            font-size:10px; margin:1px; font-family:'Courier New',monospace;
            transition: opacity 400ms linear;
        }
        .mfw-mood {
            display:inline-block; padding:2px 9px; border-radius:10px;
            font-size:10px; font-weight:bold; letter-spacing:1.5px;
            border:1px solid currentColor;
        }
        .mfw-counter-pop {
            animation: mfw-pop 380ms ease-out;
        }
        @keyframes mfw-pop {
            0%   { transform:scale(1);   }
            45%  { transform:scale(1.55);}
            100% { transform:scale(1);   }
        }
        #mfw-speed-slider {
            -webkit-appearance:none; appearance:none;
            height:4px; border-radius:2px; outline:none; cursor:pointer;
            background: linear-gradient(to right, #22d3ee, #fbbf24);
        }
        #mfw-speed-slider::-webkit-slider-thumb {
            -webkit-appearance:none; width:14px; height:14px;
            border-radius:50%; background:#f8fafc;
            box-shadow:0 0 6px #22d3ee88; cursor:pointer;
        }
    `;
    document.head.appendChild(s);
}


// ======================================
// CREATE HUD  (right panel, 357 × auto)
// ======================================

export function createHUD() {
    if (hudElement) return;
    _injectCSS();

    hudElement = document.createElement('div');
    hudElement.className = 'mfw-panel';
    hudElement.style.cssText = `
        top:12px; right:12px; width:357px;
        padding:14px 16px 12px;
        border:1px solid rgba(34,211,238,0.25);
        box-shadow:0 0 22px rgba(34,211,238,0.12);
        font-size:12px;
    `;
    hudElement.innerHTML =
        '<div style="color:#22d3ee;font-size:10px;letter-spacing:2px;">◉ OBSERVATORY</div>';
    document.body.appendChild(hudElement);
}


// ======================================
// UPDATE HUD
// ======================================

export function updateHUD({
    curiosityState   = 0,
    confidenceState  = 0,
    stressState      = 0,
    fatigueState     = 0,
    focusState       = 0,
    qValue           = 0,
    futureBonus      = 0,
    finalWeight      = 0,
    currentThought   = '—',
    dominantDrive    = null,
    episodeCount     = 0,
    stablePaths      = 0,
    stressEscape     = false,
}) {
    if (!hudElement) return;

    const dc   = (dominantDrive && _DRIVE_COLORS[dominantDrive]) || '#22d3ee';
    const mood = _deriveMood(stressState, curiosityState, stablePaths, focusState);

    // Panel ambient — border + outer glow follows dominant drive
    hudElement.style.borderColor = dc + '55';
    hudElement.style.boxShadow   = `0 0 26px ${dc}1a, inset 0 1px 0 rgba(255,255,255,0.04)`;

    // ── Why-bars (icon + bar, no numbers) ─────────────────────────
    const valPct = Math.min((Math.max(qValue, 0) / 20) * 100, 100);
    const memPct = Math.min(((stablePaths / 8) + confidenceState * 0.5) * 100, 100);
    const curPct = Math.min(curiosityState * 20, 100);
    const cauPct = Math.max(0, 100 - (stressState / 30) * 100);

    // ── Q / Future / Score percentages ────────────────────────────
    const qPct  = Math.min((Math.abs(qValue)      / 20)  * 100, 100);
    const fPct  = Math.min((Math.abs(futureBonus) / 20)  * 100, 100);
    const sPct  = Math.min((Math.abs(finalWeight) / 200) * 100, 100);
    const qCol  = qValue >= 0 ? '#22d3ee' : '#f87171';

    hudElement.innerHTML = `

    <!-- ── HEADER ── -->
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
        <span style="color:#22d3ee;font-size:10px;font-weight:bold;letter-spacing:2px;">◉ OBSERVATORY</span>
        <span class="mfw-mood" style="color:${mood.color};border-color:${mood.color}55;">
            ${mood.label}
        </span>
    </div>

    <!-- ── CURRENT THOUGHT ── -->
    <div style="font-size:15px;color:#f8fafc;font-weight:bold;margin-bottom:3px;
        text-shadow:0 0 14px ${dc};letter-spacing:0.4px;
        white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
        ⟳ ${currentThought}
    </div>
    ${dominantDrive
        ? `<div style="font-size:10px;color:${dc};margin-bottom:10px;letter-spacing:1px;">
            ⚡ ${dominantDrive.toUpperCase()}${stressEscape ? ' &nbsp;🌪' : ''}
           </div>`
        : `<div style="margin-bottom:10px;height:14px;"></div>`
    }

    <!-- ── DIVIDER ── -->
    <div style="height:1px;background:rgba(255,255,255,0.07);margin-bottom:10px;"></div>

    <!-- ── WHY THIS MOVE ── -->
    <div style="font-size:9px;color:#334155;letter-spacing:2px;margin-bottom:7px;">
        WHY THIS MOVE
    </div>
    <div style="display:grid;grid-template-columns:16px 1fr;
        align-items:center;gap:2px 8px;margin-bottom:2px;">
        <span style="font-size:11px;" title="Value pull">⚡</span>
        <div>${_bar(valPct,'#22d3ee')}</div>
        <span style="font-size:11px;" title="Memory vouching">🏛</span>
        <div>${_bar(memPct,'#a855f7')}</div>
        <span style="font-size:11px;" title="Curiosity">✦</span>
        <div>${_bar(curPct,'#c084fc')}</div>
        <span style="font-size:11px;" title="Caution">🛡</span>
        <div>${_bar(cauPct,'#34d399')}</div>
    </div>

    <!-- ── DIVIDER ── -->
    <div style="height:1px;background:rgba(255,255,255,0.07);margin:10px 0;"></div>

    <!-- ── VALUE FLOW  Q → 🔮 → ⭐ ── -->
    <div style="display:flex;align-items:center;gap:6px;font-size:11px;">

        <div style="flex:1;text-align:center;">
            <div style="font-size:9px;color:#334155;margin-bottom:3px;">Q</div>
            ${_bar(qPct, qCol)}
            <div style="color:${qCol};font-weight:bold;margin-top:3px;">${qValue.toFixed(1)}</div>
        </div>

        <div style="color:#334155;font-size:10px;">→</div>

        <div style="flex:1;text-align:center;">
            <div style="font-size:9px;color:#334155;margin-bottom:3px;">🔮</div>
            ${_bar(fPct,'#60a5fa')}
            <div style="color:#60a5fa;font-weight:bold;margin-top:3px;">${futureBonus.toFixed(1)}</div>
        </div>

        <div style="color:#334155;font-size:10px;">→</div>

        <div style="flex:1;text-align:center;">
            <div style="font-size:9px;color:#334155;margin-bottom:3px;">⭐</div>
            ${_bar(sPct,'#fbbf24')}
            <div style="color:#fbbf24;font-weight:bold;margin-top:3px;">${finalWeight.toFixed(1)}</div>
        </div>
    </div>

    <!-- ── DIVIDER ── -->
    <div style="height:1px;background:rgba(255,255,255,0.07);margin:10px 0 8px;"></div>

    <!-- ── MEMORY COUNTERS ── -->
    <div style="display:flex;gap:14px;font-size:11px;color:#475569;align-items:center;">
        <span title="Episodes stored">📦 <b style="color:#a855f7;">${episodeCount}</b></span>
        <span title="Stable paths">🏛 <b style="color:#34d399;">${stablePaths}</b></span>
        <span title="Fatigue">😴 <b style="color:#64748b;">${fatigueState.toFixed(1)}</b></span>
        <span title="Focus">🔥 <b style="color:#22d3ee;">${focusState.toFixed(1)}</b></span>
    </div>
    `;
}


// ======================================
// THINKING STREAM  (left panel, 260px)
// ======================================

export function createThinkingStream() {
    if (streamElement) return;
    _injectCSS();

    streamElement = document.createElement('div');
    streamElement.className = 'mfw-panel';
    streamElement.style.cssText = `
        top:12px; left:12px; width:262px;
        border:1px solid rgba(34,211,238,0.16);
        box-shadow:0 0 18px rgba(34,211,238,0.07);
        padding:14px 14px 10px;
        max-height:440px; overflow:hidden;
        display:flex; flex-direction:column;
    `;
    streamElement.innerHTML = `
        <div style="font-size:9px;color:#22d3ee;letter-spacing:2px;
            font-weight:bold;margin-bottom:10px;">
            STREAM OF THOUGHT
        </div>
        <div id="mfw-stream-lines"
            style="flex:1;overflow:hidden;min-height:0;"></div>
        <div style="height:1px;background:rgba(255,255,255,0.06);
            margin:8px 0 6px;"></div>
        <div id="mfw-wm-chips"
            style="display:flex;flex-wrap:wrap;gap:3px;min-height:22px;"></div>
        <div style="height:1px;background:rgba(255,255,255,0.06);
            margin:6px 0 4px;"></div>
        <div id="mfw-intention"
            style="font-size:10px;color:#475569;font-style:italic;
            min-height:14px;transition:opacity 600ms ease;"></div>
    `;
    document.body.appendChild(streamElement);
}

export function updateThinkingStream(
    thought       = '—',
    cluster       = 'memory',
    isExplorative = false,
    qVal          = 0,
    intentionText = null
) {
    if (!streamElement) return;

    const clr    = _CLUSTER_CSS[cluster] || '#22d3ee';
    const symbol = isExplorative ? '○' : '◆';
    const symClr = isExplorative ? '#a855f7' : clr;

    // Push newest at front
    _streamHistory.unshift({ thought, clr, symbol, symClr, qVal });
    if (_streamHistory.length > _MAX_STREAM) _streamHistory.pop();

    // Render stream lines
    const linesEl = streamElement.querySelector('#mfw-stream-lines');
    if (linesEl) {
        linesEl.innerHTML = _streamHistory.map((e, i) => {
            const alpha = Math.max(0.06, 1 - i * 0.13);
            const barW  = Math.min(Math.max((e.qVal || 0) / 20, 0), 1) * 56;
            return `<div class="${i === 0 ? 'mfw-thought-in' : ''}"
                style="display:flex;align-items:center;gap:6px;padding:2px 0;
                    opacity:${alpha};font-size:11px;">
                <span style="color:${e.symClr};font-size:8px;flex-shrink:0;">${e.symbol}</span>
                <span style="color:${e.clr};white-space:nowrap;overflow:hidden;
                    text-overflow:ellipsis;max-width:148px;flex:1;">${e.thought}</span>
                <div style="width:60px;height:2px;
                    background:rgba(255,255,255,0.05);border-radius:1px;flex-shrink:0;">
                    <div style="width:${barW}px;height:100%;background:${e.clr};
                        border-radius:1px;opacity:0.65;"></div>
                </div>
            </div>`;
        }).join('');
    }

    // Working memory chips (last 5, fading)
    const chipsEl = streamElement.querySelector('#mfw-wm-chips');
    if (chipsEl) {
        chipsEl.innerHTML = _streamHistory.slice(0, 5).map((e, i) => {
            const alpha = Math.max(0.12, 1 - i * 0.2);
            const node  = (e.thought.split('->')[0] || e.thought).trim();
            return `<span class="mfw-chip"
                style="background:${e.clr}22;color:${e.clr};
                    border:1px solid ${e.clr}44;opacity:${alpha};">
                ${node}
            </span>`;
        }).join('');
    }

    // Intention whisper — fade-swap
    const intentEl = streamElement.querySelector('#mfw-intention');
    if (intentEl && intentionText) {
        intentEl.style.opacity = '0';
        setTimeout(() => {
            intentEl.textContent = `❝ ${intentionText} ❞`;
            intentEl.style.opacity = '1';
        }, 280);
    }
}


// ======================================
// SPEED CONTROL  (bottom-right, 290px)
// ======================================

export function createSpeedControl(onSpeedChange, onStepFn) {
    if (speedElement) return;
    _injectCSS();

    speedElement = document.createElement('div');
    speedElement.className = 'mfw-panel';
    speedElement.style.cssText = `
        bottom:16px; right:12px; width:292px;
        border:1px solid rgba(34,211,238,0.16);
        box-shadow:0 0 16px rgba(34,211,238,0.07);
        padding:11px 16px;
        display:flex; align-items:center; gap:12px;
    `;

    speedElement.innerHTML = `
        <button id="mfw-play-btn"
            style="width:38px;height:38px;border-radius:50%;flex-shrink:0;
                background:rgba(52,211,153,0.13);border:1px solid #34d39966;
                color:#34d399;font-size:17px;cursor:pointer;
                display:flex;align-items:center;justify-content:center;
                transition:all 200ms ease;
                box-shadow:0 0 10px rgba(52,211,153,0.18);">▶</button>

        <div style="flex:1;">
            <div style="display:flex;justify-content:space-between;
                font-size:9px;color:#334155;letter-spacing:1px;margin-bottom:5px;">
                <span>DELIBERATE</span><span>RAPID</span>
            </div>
            <input id="mfw-speed-slider" type="range"
                min="60" max="1000" value="500" step="20"
                style="width:100%;cursor:pointer;">
            <div id="mfw-tempo-label"
                style="font-size:9px;color:#475569;text-align:center;
                margin-top:4px;letter-spacing:1px;">
                2.0 thoughts/sec
            </div>
        </div>

        <button id="mfw-step-btn"
            style="width:28px;height:28px;border-radius:6px;flex-shrink:0;
                background:rgba(34,211,238,0.1);border:1px solid #22d3ee44;
                color:#22d3ee;font-size:13px;cursor:pointer;
                display:flex;align-items:center;justify-content:center;"
            title="Single step">⏭</button>
    `;

    document.body.appendChild(speedElement);

    const slider   = speedElement.querySelector('#mfw-speed-slider');
    const playBtn  = speedElement.querySelector('#mfw-play-btn');
    const stepBtn  = speedElement.querySelector('#mfw-step-btn');
    const tempoLbl = speedElement.querySelector('#mfw-tempo-label');

    // Slider → speed
    if (slider && onSpeedChange) {
        slider.addEventListener('input', () => {
            const ms  = parseInt(slider.value);
            const tps = (1000 / ms).toFixed(1);
            if (tempoLbl) tempoLbl.textContent = `${tps} thoughts/sec`;
            onSpeedChange(ms);
        });
    }

    // Step button
    if (stepBtn && onStepFn) {
        stepBtn.addEventListener('click', onStepFn);
    }

    // Play/pause button — toggles running state visually
    // Actual start/stop is wired via Space key in main.js;
    // this button triggers the same by dispatching a keydown Space event.
    if (playBtn) {
        playBtn._running = false;
        playBtn.addEventListener('click', () => {
            playBtn._running = !playBtn._running;
            playBtn.textContent = playBtn._running ? '⏸' : '▶';
            playBtn.style.background = playBtn._running
                ? 'rgba(52,211,153,0.28)'
                : 'rgba(52,211,153,0.13)';
            // Dispatch Space keydown so main.js toggle fires
            document.dispatchEvent(new KeyboardEvent('keydown', {
                code: 'Space', key: ' ', bubbles: true
            }));
        });
    }
}