// ======================================
// CREATE 3D SCENE
// ======================================

export const scene =
new THREE.Scene();



// ======================================
// CREATE CAMERA
// ======================================

export const camera =
new THREE.PerspectiveCamera(

  75,

  window.innerWidth /
  window.innerHeight,

  0.1,

  1000
);



// move camera backward
camera.position.z = 3;



// ======================================
// CREATE RENDERER
// ======================================

export const renderer =
new THREE.WebGLRenderer();



// fullscreen
renderer.setSize(
  window.innerWidth,
  window.innerHeight
);



// add canvas into page
document.body.appendChild(
  renderer.domElement
);



// ======================================
// CREATE GROUP
// ======================================

export const group =
new THREE.Group();



// add group into scene
scene.add(group);