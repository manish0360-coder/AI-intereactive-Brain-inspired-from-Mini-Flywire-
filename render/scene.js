// ======================================
// 🧠 ECHO — 3D SCENE SETUP
// ======================================

// ── Scene ────────────────────────────
export const scene = new THREE.Scene();


// ── Camera ───────────────────────────
// FOV 72 + z=5.5 fits all 20 nodes (spread +-2.5 units).
// Old z=3 cut off outer nodes like SALIENCE, GOAL, IDENTITY.
export const camera = new THREE.PerspectiveCamera(
    72,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);
camera.position.z = 5.5;


// ── Renderer ─────────────────────────
export const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);


// ── Scene group ───────────────────────
export const group = new THREE.Group();
scene.add(group);


// ======================================
// MOUSE WHEEL ZOOM
// Scroll up = zoom in, Scroll down = zoom out
// ======================================
window.addEventListener('wheel', (e) => {
    camera.position.z += e.deltaY * 0.005;
    camera.position.z  = Math.max(2.0, Math.min(12.0, camera.position.z));
}, { passive: true });


// ======================================
// RESIZE HANDLER
// ======================================
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});