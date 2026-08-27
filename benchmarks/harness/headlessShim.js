// ==========================================================
// HEADLESS SHIM — TEST INFRASTRUCTURE ONLY
// ==========================================================
// Lets the REAL main.js run under Node so the agent loop can be driven
// deterministically. It stubs THREE, the DOM, localStorage and fetch —
// nothing more. It never alters cognition, decisions or learning: every
// stub is inert geometry, an inert DOM node, or a file read.
//
// NOT imported by the application. Lives under benchmarks/harness/.
//
// Deterministic tick control: main.js's runAgentLoop() reschedules itself
// with setTimeout. The shim captures that callback instead of scheduling
// it, so a test advances the agent exactly one loop at a time.
// ==========================================================
import fs from 'node:fs';
import path from 'node:path';

class V3 {
  constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;}
  copy(v){this.x=v.x;this.y=v.y;this.z=v.z;return this;}
  set(x,y,z){this.x=x;this.y=y;this.z=z;return this;}
  clone(){return new V3(this.x,this.y,this.z);}
}
class Obj3D {
  static _next = 1;
  constructor(){ this.id = Obj3D._next++; this.position=new V3(); this.rotation=new V3();
                 this.scale={set(){}, x:1,y:1,z:1}; this.children=[]; this.userData={}; this.material=new Mat(); }
  add(o){ if(o) this.children.push(o); return this; }
  remove(o){ const i=this.children.indexOf(o); if(i>=0) this.children.splice(i,1); return this; }
  traverse(fn){ fn(this); for(const c of this.children) c.traverse ? c.traverse(fn) : fn(c); }
}
class Mat {                       // materials are constructed with `new`
  constructor(opts = {}) {
    Object.assign(this, opts);
    this.color = { setHSL(){return this;}, set(){return this;} };
    this.opacity = opts.opacity ?? 1;
    this.map = opts.map ?? null;
  }
  dispose(){}
}

export function installThreeStub(){
  const THREE = {
    Vector3: V3,
    Vector2: class { constructor(x=0,y=0){this.x=x;this.y=y;} },
    Scene: class extends Obj3D {},
    Group: class extends Obj3D {},
    Object3D: Obj3D,
    PerspectiveCamera: class extends Obj3D { constructor(){super(); this.aspect=1;} updateProjectionMatrix(){} },
    WebGLRenderer: class { constructor(){ this.domElement={style:{}}; } setSize(){} setPixelRatio(){} render(){} },
    BufferGeometry: class { setFromPoints(p){this.points=p; return this;} setAttribute(){return this;} dispose(){} },
    SphereGeometry: class { dispose(){} }, RingGeometry: class { dispose(){} },
    Float32BufferAttribute: class { constructor(a,b){this.array=a;this.itemSize=b;} },
    LineBasicMaterial: Mat, MeshBasicMaterial: Mat, SpriteMaterial: Mat, PointsMaterial: Mat,
    // THREE signatures: Mesh(geom, mat) | Line(geom, mat) | Points(geom, mat) | Sprite(mat)
    Line:   class extends Obj3D { constructor(g,m){super(); this.geometry=g; this.material=m||new Mat();} },
    Mesh:   class extends Obj3D { constructor(g,m){super(); this.geometry=g; this.material=m||new Mat();} },
    Points: class extends Obj3D { constructor(g,m){super(); this.geometry=g; this.material=m||new Mat();} },
    Sprite: class extends Obj3D { constructor(m){super(); this.material=m||new Mat(); this.center={set(){}};} },
    Color: class { constructor(){} setHSL(){return this;} set(){return this;} lerp(){return this;}
                   clone(){return this;} getHex(){return 0;} getHexString(){return '000000';}
                   copy(){return this;} multiplyScalar(){return this;} offsetHSL(){return this;} },
    CanvasTexture: class { constructor(){ this.dispose=()=>{}; } },
    Raycaster: class { setFromCamera(){} intersectObjects(){ return []; } },
    AdditiveBlending: 2, DoubleSide: 2,
  };
  globalThis.THREE = THREE;
  return THREE;
}

function makeEl(){
  const el = {
    style:new Proxy({},{get:(t,k)=>t[k]??'',set:(t,k,v)=>{t[k]=v;return true;}}),
    children:[], innerHTML:'', innerText:'', textContent:'', value:'', width:0, height:0,
    appendChild(c){this.children.push(c);return c;}, removeChild(c){return c;},
    addEventListener(){}, removeEventListener(){}, setAttribute(){}, getAttribute(){return null;},
    querySelector(){return makeEl();}, querySelectorAll(){return [];},
    getContext(){ return new Proxy({},{get:()=>()=>({addColorStop(){}})}); },
    remove(){}, focus(){}, click(){},
  };
  return el;
}

export function installDomStub(){
  const listeners = {};
  const store = new Map();

  globalThis.document = {
    createElement: () => makeEl(),
    getElementById: () => null,
    body: makeEl(), head: makeEl(),
    addEventListener(){}, dispatchEvent(){},
  };

  // ── FIDELITY POINT ──────────────────────────────────────────────
  // In a browser `window` IS the global object, so `window.recentMemory = []`
  // creates a global binding that main.js then reads as the bare identifier
  // `recentMemory` (main.js:3409 and elsewhere — it is never declared).
  // A plain stub object would break that, so window must alias globalThis,
  // exactly as it does in the browser. Anything less is not the same program.
  globalThis.innerWidth  = 1280;
  globalThis.innerHeight = 800;
  globalThis.addEventListener    = (type, fn) => { (listeners[type] ||= []).push(fn); };
  globalThis.removeEventListener = () => {};
  globalThis.dispatchEvent = (ev) => { (listeners[ev.type]||[]).forEach(fn=>fn(ev)); return true; };
  globalThis.window = globalThis;

  globalThis.localStorage = {
    getItem:k=>store.has(k)?store.get(k):null,
    setItem:(k,v)=>store.set(k,String(v)),
    removeItem:k=>store.delete(k), clear:()=>store.clear(),
  };
  globalThis.requestAnimationFrame = () => 0;   // animate() must not recurse
  globalThis.cancelAnimationFrame  = () => {};
  return { listeners, localStorageMap: store };
}

export function installFetchStub(repoRoot){
  globalThis.fetch = async (url) => {
    const p = path.join(repoRoot, String(url).replace(/^\.?\//,''));
    const txt = fs.readFileSync(p,'utf8');
    return { ok:true, json: async () => JSON.parse(txt), text: async () => txt };
  };
}

// ---------- deterministic tick control ----------
// runAgentLoop() reschedules itself with `setTimeout(runAgentLoop, agentSpeed)`.
// It is the only NAMED function passed to setTimeout in the whole app — every
// other use is an arrow that removes a THREE.Line after a delay. So capture by
// function name: precise, and it cannot be confused with a visual callback.
export function installTimerControl(){
  let loopCallback = null;
  let captured = 0, dropped = 0;
  globalThis.setTimeout = (fn, delay = 0) => {
    if (typeof fn === 'function' && fn.name === 'runAgentLoop') { loopCallback = fn; captured++; return 1; }
    dropped++;                    // inert visual line-removal; never affects cognition
    return 0;
  };
  globalThis.clearTimeout  = () => { loopCallback = null; };
  globalThis.setInterval   = () => 0;      // saveBrain autosave: inert under test
  globalThis.clearInterval = () => {};
  return {
    /** run exactly one runAgentLoop iteration (= 5 runAgent steps) */
    tick(){ const cb = loopCallback; loopCallback = null; if (!cb) return false; cb(); return true; },
    get hasPending(){ return loopCallback !== null; },
    get stats(){ return { captured, dropped }; },
  };
}

export async function settle(n=8){ for(let i=0;i<n;i++) await new Promise(r=>setImmediate(r)); }
