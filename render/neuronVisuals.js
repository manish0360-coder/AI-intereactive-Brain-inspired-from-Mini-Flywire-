// ======================================
// 🧠 FUTURISTIC NEURON VISUAL SYSTEM
// ======================================
// Cluster-colored glowing nodes with
// floating labels, pulse animations,
// and travel glow effects.
// ======================================

// ── Cluster color palette ──────────────────────────────────────────
// Each semantic cluster has its own identity:
//   perception → electric cyan   #00E5FF
//   memory     → deep violet     #CC44FF
//   reasoning  → warm amber      #FF8844
//   action     → bio green       #44FF88
//   learning   → royal blue      #4488FF

export const CLUSTER_COLORS = {
    perception: { hex: 0x00E5FF, css: '#00E5FF', glow: 0x00AADD },
    memory:     { hex: 0xCC44FF, css: '#CC44FF', glow: 0x8822BB },
    reasoning:  { hex: 0xFF8844, css: '#FF8844', glow: 0xBB5522 },
    action:     { hex: 0x44FF88, css: '#44FF88', glow: 0x22BB55 },
    learning:   { hex: 0x4488FF, css: '#4488FF', glow: 0x2255BB },
};

// ── Neuron visual registry ─────────────────────────────────────────
// key: neuron id → { mesh, glowMesh, labelSprite, cluster, baseScale }
const neuronVisuals = new Map();

// ── Three.js group ref ─────────────────────────────────────────────
let _group = null;
export function setVisualsGroup(g) { _group = g; }

// ── Pulse state ────────────────────────────────────────────────────
const pulsePhases = new Map();   // id → float phase offset
let   _animFrame  = 0;


// ======================================
// CREATE GLOW TEXTURE (canvas-based)
// radial gradient → soft sphere glow
// ======================================

function makeGlowTexture(color) {
    const size   = 128;
    const canvas = document.createElement('canvas');
    canvas.width  = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const cx = size / 2, cy = size / 2, r = size / 2;
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);

    // Convert hex color to rgb
    const R = (color >> 16) & 0xff;
    const G = (color >> 8)  & 0xff;
    const B =  color        & 0xff;

    gradient.addColorStop(0.0,  `rgba(${R},${G},${B},0.85)`);
    gradient.addColorStop(0.35, `rgba(${R},${G},${B},0.45)`);
    gradient.addColorStop(0.65, `rgba(${R},${G},${B},0.12)`);
    gradient.addColorStop(1.0,  `rgba(${R},${G},${B},0.00)`);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    return new THREE.CanvasTexture(canvas);
}


// ======================================
// CREATE LABEL SPRITE
// floating text above each neuron
// ======================================

function makeLabelSprite(text, color) {
    const canvas = document.createElement('canvas');
    canvas.width  = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    // Background pill
    ctx.clearRect(0, 0, 256, 64);
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    const rr = 14;
    const tw = ctx.measureText(text).width + 32;
    const tx = (256 - tw) / 2;
    ctx.beginPath();
    ctx.roundRect(tx, 10, tw, 40, rr);
    ctx.fill();

    // Border
    ctx.strokeStyle = color;
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.roundRect(tx, 10, tw, 40, rr);
    ctx.stroke();

    // Text
    ctx.font        = 'bold 22px "Courier New", monospace';
    ctx.fillStyle   = color;
    ctx.textAlign   = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text.toUpperCase(), 128, 32);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({
        map:         texture,
        transparent: true,
        depthWrite:  false,
    });

    const sprite = new THREE.Sprite(material);
    sprite.scale.set(0.90, 0.22, 1);
    return sprite;
}


// ======================================
// CREATE ONE FUTURISTIC NEURON
// core sphere + glow halo + label
// ======================================

export function createFuturisticNeuron(n, group) {

    const clusterKey = n.cluster || 'memory';
    const colors     = CLUSTER_COLORS[clusterKey] || CLUSTER_COLORS.memory;

    // ── Core sphere ───────────────────────────────────────────────
    const coreMat = new THREE.MeshBasicMaterial({
        color:       colors.hex,
        transparent: true,
        opacity:     0.92,
    });
    const coreGeo  = new THREE.SphereGeometry(0.12, 16, 16);
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    coreMesh.position.set(n.x, n.y, n.z);

    // ── Glow halo (billboard sprite) ─────────────────────────────
    const glowTex  = makeGlowTexture(colors.glow);
    const glowMat  = new THREE.SpriteMaterial({
        map:         glowTex,
        transparent: true,
        opacity:     0.7,
        depthWrite:  false,
        blending:    THREE.AdditiveBlending,
    });
    const glowSprite = new THREE.Sprite(glowMat);
    glowSprite.scale.set(0.55, 0.55, 1);
    glowSprite.position.set(n.x, n.y, n.z);

    // ── Ring accent ───────────────────────────────────────────────
    const ringGeo = new THREE.RingGeometry(0.14, 0.17, 32);
    const ringMat = new THREE.MeshBasicMaterial({
        color:       colors.hex,
        transparent: true,
        opacity:     0.4,
        side:        THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.set(n.x, n.y, n.z);
    ring.rotation.x = Math.PI / 4;   // slight tilt for 3D feel

    // ── Label sprite ──────────────────────────────────────────────
    const label = makeLabelSprite(n.label, colors.css);
    label.position.set(n.x, n.y + 0.28, n.z);

    // ── Add to scene ──────────────────────────────────────────────
    group.add(coreMesh);
    group.add(glowSprite);
    group.add(ring);
    group.add(label);

    // ── Mark as neuron for raycasting ─────────────────────────────
    coreMesh.userData.isNeuron = true;
    coreMesh.userData.id       = n.id;
    coreMesh.userData.label    = n.label;
    coreMesh.userData.cluster  = clusterKey;
    coreMesh.userData.clusterColors = colors;
    coreMesh.userData.neighbors = [];

    // ── Store visual refs ─────────────────────────────────────────
    neuronVisuals.set(n.id, {
        core:   coreMesh,
        glow:   glowSprite,
        ring,
        label,
        colors,
        baseGlowScale: 0.55,
        baseRingOpacity: 0.4,
    });

    pulsePhases.set(n.id, Math.random() * Math.PI * 2);

    return coreMesh;
}


// ======================================
// CREATE FUTURISTIC CONNECTION LINE
// gradient-colored edge with subtle glow
// ======================================

export function createFuturisticConnection(p1, p2, cluster1, cluster2, group) {

    const c1 = CLUSTER_COLORS[cluster1] || CLUSTER_COLORS.memory;
    const c2 = CLUSTER_COLORS[cluster2] || CLUSTER_COLORS.memory;

    // Use mid-color between two clusters
    const midColor = new THREE.Color(c1.hex).lerp(new THREE.Color(c2.hex), 0.5);

    const geo = new THREE.BufferGeometry().setFromPoints([p1, p2]);

    // Main line
    const mat = new THREE.LineBasicMaterial({
        color:       midColor,
        transparent: true,
        opacity:     0.22,
    });
    const line = new THREE.Line(geo, mat);

    // Subtle glow duplicate (slightly brighter, thicker blending)
    const glowMat = new THREE.LineBasicMaterial({
        color:    midColor,
        transparent: true,
        opacity:  0.08,
        blending: THREE.AdditiveBlending,
    });
    const glowLine = new THREE.Line(geo, glowMat);

    group.add(line);
    group.add(glowLine);

    return { line, glowLine, mat, glowMat };
}


// ======================================
// PULSE ANIMATION
// gentle breathing effect per cluster
// ======================================

let _tick = 0;

export function tickNeuronPulse() {

    _tick += 0.018;

    neuronVisuals.forEach((v, id) => {

        const phase   = pulsePhases.get(id) || 0;
        const pulse   = Math.sin(_tick + phase);

        // Glow breathes
        const glowScale = v.baseGlowScale + pulse * 0.06;
        v.glow.scale.set(glowScale, glowScale, 1);
        v.glow.material.opacity = 0.55 + pulse * 0.18;

        // Ring rotates slowly
        v.ring.rotation.z += 0.004;
        v.ring.material.opacity = v.baseRingOpacity + pulse * 0.12;

        // Label breathes subtly
        v.label.material.opacity = 0.82 + pulse * 0.10;
    });
}


// ======================================
// CLICK GLOW — neuron selected
// burst bright then fade back
// ======================================

export function flashNeuronClick(neuronId, duration = 1200) {

    const v = neuronVisuals.get(neuronId);
    if (!v) return;

    // Instant burst
    v.glow.scale.set(1.4, 1.4, 1);
    v.glow.material.opacity = 1.0;
    v.core.scale.set(1.6, 1.6, 1.6);
    v.ring.material.opacity = 1.0;
    v.ring.scale.set(1.8, 1.8, 1.8);

    // Label brightens
    v.label.material.opacity = 1.0;

    // Animate back to normal over duration
    const start = Date.now();
    const target = {
        glowScale:    v.baseGlowScale,
        glowOpacity:  0.7,
        coreScale:    1.0,
        ringOpacity:  v.baseRingOpacity,
        ringScale:    1.0,
    };

    function fadeBack() {
        const elapsed  = Date.now() - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased    = 1 - Math.pow(1 - progress, 3);  // ease-out cubic

        const gs = 1.4 + (target.glowScale   - 1.4) * eased;
        v.glow.scale.set(gs, gs, 1);
        v.glow.material.opacity = 1.0 + (target.glowOpacity - 1.0) * eased;
        const cs = 1.6 + (target.coreScale - 1.6) * eased;
        v.core.scale.set(cs, cs, cs);
        v.ring.material.opacity = 1.0 + (target.ringOpacity - 1.0) * eased;
        const rs = 1.8 + (target.ringScale - 1.8) * eased;
        v.ring.scale.set(rs, rs, rs);

        if (progress < 1) requestAnimationFrame(fadeBack);
    }

    requestAnimationFrame(fadeBack);
}


// ======================================
// TRAVEL GLOW — thought dot traveling
// creates a bright moving plasma dot
// ======================================

export function spawnTravelDot(fromPos, toPos, clusterColor, group) {

    const color  = CLUSTER_COLORS[clusterColor]?.hex || 0x00ffff;

    // Core dot
    const dotGeo = new THREE.SphereGeometry(0.055, 8, 8);
    const dotMat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 1.0,
    });
    const dot = new THREE.Mesh(dotGeo, dotMat);

    // Glow halo on dot
    const glowTex = makeGlowTexture(color);
    const glowMat = new THREE.SpriteMaterial({
        map:      glowTex,
        transparent: true,
        opacity:  0.8,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
    });
    const dotGlow = new THREE.Sprite(glowMat);
    dotGlow.scale.set(0.22, 0.22, 1);

    group.add(dot);
    group.add(dotGlow);

    const start = { x: fromPos.x, y: fromPos.y, z: fromPos.z };
    const end   = { x: toPos.x,   y: toPos.y,   z: toPos.z   };
    const startMs = Date.now();
    const duration = 600;

    function animate() {
        const elapsed  = Date.now() - startMs;
        const progress = Math.min(elapsed / duration, 1);
        // ease-in-out sine
        const t = 0.5 - Math.cos(progress * Math.PI) / 2;

        const x = start.x + (end.x - start.x) * t;
        const y = start.y + (end.y - start.y) * t;
        const z = start.z + (end.z - start.z) * t;

        dot.position.set(x, y, z);
        dotGlow.position.set(x, y, z);

        // Fade out tail
        const opacity = progress < 0.8 ? 1.0 : 1.0 - (progress - 0.8) / 0.2;
        dot.material.opacity   = opacity;
        dotGlow.material.opacity = opacity * 0.8;

        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            group.remove(dot);
            group.remove(dotGlow);
        }
    }

    requestAnimationFrame(animate);
}


// ======================================
// SET NEURON HIGHLIGHT STATE
// used for neighbor highlighting on click
// ======================================

export function setNeuronHighlight(neuronId, state) {
    // state: 'selected' | 'neighbor' | 'normal'
    const v = neuronVisuals.get(neuronId);
    if (!v) return;

    if (state === 'selected') {
        v.core.material.color.set(0xffffff);
        v.glow.scale.set(1.2, 1.2, 1);
        v.glow.material.opacity = 0.95;
        v.ring.material.opacity = 0.9;
    } else if (state === 'neighbor') {
        v.core.material.color.set(v.colors.hex);
        v.glow.scale.set(0.9, 0.9, 1);
        v.glow.material.opacity = 0.85;
        v.ring.material.opacity = 0.7;
    } else {
        // normal
        v.core.material.color.set(v.colors.hex);
        v.glow.scale.set(v.baseGlowScale, v.baseGlowScale, 1);
        v.glow.material.opacity = 0.7;
        v.ring.material.opacity = v.baseRingOpacity;
        v.ring.scale.set(1, 1, 1);
        v.core.scale.set(1, 1, 1);
    }
}


// ======================================
// GET CLUSTER FROM NEURON MAP
// ======================================

export function getNeuronCluster(neuronId, neuronMap) {
    return neuronMap.get(neuronId)?.userData?.cluster || 'memory';
}