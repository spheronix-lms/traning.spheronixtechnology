// Spheronix — one continuous WebGL world driven by scroll.
//
// A grid "planet" (lat/long lines + "+" markers), sixteen glossy icon tiles,
// six placement screens and a process route. Every chapter is a "shot":
// a function returning camera, tile formation and palette. The timeline
// keyframes shots against scroll position and blends between them.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { ICONS } from './icons.js?v=3';
import { TILES, ICON_ORDER } from './interests.js?v=1';

const R = 60;
const TILE_LABELS = Object.fromEntries(TILES.map((t) => [t.icon, t.label]));
const CENTER = new THREE.Vector3(0, -R, 0);
const D = THREE.MathUtils.degToRad;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const lerp = THREE.MathUtils.lerp;
const rand = (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();

// ── Planet frames ──────────────────────────────────────────────────────────
// Local frame at longitude θ on the equator: x along the surface, y up, z towards the viewer.
function frame(theta) {
  const up = new THREE.Vector3(Math.sin(theta), Math.cos(theta), 0);
  const right = new THREE.Vector3(Math.cos(theta), -Math.sin(theta), 0);
  const back = new THREE.Vector3(0, 0, 1);
  const L = (x, y, z) => CENTER.clone().addScaledVector(up, R + y).addScaledVector(right, x).addScaledVector(back, z);
  return { theta, up, right, back, L };
}
// A point on the curved surface (x, z along the ground) plus height h.
function surface(theta, x, z, h = 0) {
  const t = theta + x / R, p = z / R, r = R + h;
  return new THREE.Vector3(r * Math.sin(t) * Math.cos(p), r * Math.cos(t) * Math.cos(p) - R, r * Math.sin(p));
}
function surfaceQuat(theta, x, z, yaw = 0, tilt = 0) {
  const n = surface(theta, x, z, 1).sub(surface(theta, x, z, 0)).normalize();
  const fwd = surface(theta, x, z - 1, 0).sub(surface(theta, x, z, 0)).normalize();
  const right = new THREE.Vector3().crossVectors(fwd, n).normalize();
  const m = new THREE.Matrix4().makeBasis(right, fwd, n); // tile face (+z) points up, lying flat
  const q = new THREE.Quaternion().setFromRotationMatrix(m);
  q.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(tilt, 0, yaw)));
  return q;
}

// ── Palettes ───────────────────────────────────────────────────────────────
const PAL = {
  dark: { bg: '#080a10', line: '#ffffff', lineA: 0.15, cross: '#ffffff', crossA: 0.9, stars: 0.7, glowA: 1, glow: '#2f74ff' },
  blue: { bg: '#2c63ea', line: '#ffffff', lineA: 0.32, cross: '#ffffff', crossA: 0.95, stars: 0, glowA: 0.0, glow: '#7fb0ff' },
  light: { bg: '#edeff3', line: '#7f8692', lineA: 0.32, cross: '#4d535d', crossA: 0.85, stars: 0, glowA: 0, glow: '#ffffff' },
  dusk: { bg: '#1b2156', line: '#b9c3ff', lineA: 0.22, cross: '#ffffff', crossA: 0.75, stars: 0.25, glowA: 0.55, glow: '#4f7dff' },
};
const palette = (name, glow = {}) => {
  const p = PAL[name];
  return {
    bg: new THREE.Color(p.bg), line: new THREE.Color(p.line), lineA: p.lineA,
    cross: new THREE.Color(p.cross), crossA: p.crossA, stars: p.stars,
    glow: new THREE.Color(p.glow), glowA: glow.a ?? p.glowA, gx: glow.x ?? 0.95, gy: glow.y ?? 0.5, gs: glow.s ?? 1.5,
  };
};

export function createWorld(canvas, opts) {
  const { featured, programColors } = opts;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 400);
  scene.add(camera);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
  scene.add(new THREE.AmbientLight(0xffffff, 0.25));
  const key = new THREE.DirectionalLight(0xffffff, 1.0);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x8fb6ff, 0.6);
  scene.add(fill);

  // ── Glow (atmosphere light behind the planet limb) ──
  const glowTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.25, 'rgba(255,255,255,.75)');
    grd.addColorStop(0.6, 'rgba(255,255,255,.22)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(c);
  })();
  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ map: glowTex, transparent: false, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }),
  );
  glow.renderOrder = -10;
  camera.add(glow);

  // ── Planet body (depth only: hides the far side of the grid) ──
  const body = new THREE.Mesh(new THREE.SphereGeometry(R - 0.08, 96, 64), new THREE.MeshBasicMaterial({ colorWrite: false }));
  body.position.copy(CENTER);
  body.renderOrder = -5;
  scene.add(body);

  // ── Grid lines ──
  const fadeUniforms = { uColor: { value: new THREE.Color() }, uAlpha: { value: 0.15 }, uFar: { value: 80 } };
  const lineMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, uniforms: fadeUniforms,
    vertexShader: `varying float vD; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.); vD = length(mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 uColor; uniform float uAlpha; uniform float uFar; varying float vD;
      void main(){ float a = uAlpha * (1. - smoothstep(uFar * .35, uFar, vD)); gl_FragColor = vec4(uColor, a);
      #include <colorspace_fragment>
      }`,
  });
  const STEP = D(2.2);
  const TH = [D(-60), D(200)], PH = [D(-62), D(62)];
  {
    const pts = [];
    const P = (t, p) => new THREE.Vector3(R * Math.sin(t) * Math.cos(p), R * Math.cos(t) * Math.cos(p) - R, R * Math.sin(p));
    for (let t = TH[0]; t <= TH[1]; t += STEP) {
      for (let p = PH[0]; p < PH[1]; p += STEP / 2) { const a = P(t, p), b = P(t, p + STEP / 2); pts.push(a.x, a.y, a.z, b.x, b.y, b.z); }
    }
    for (let p = PH[0]; p <= PH[1]; p += STEP) {
      for (let t = TH[0]; t < TH[1]; t += STEP / 2) { const a = P(t, p), b = P(t + STEP / 2, p); pts.push(a.x, a.y, a.z, b.x, b.y, b.z); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    scene.add(new THREE.LineSegments(g, lineMat));
  }

  // ── "+" markers at grid intersections (instanced) ──
  const crossUniforms = { uColor: { value: new THREE.Color() }, uAlpha: { value: 0.9 }, uFar: { value: 80 } };
  const crossMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, uniforms: crossUniforms,
    vertexShader: `varying float vD; void main(){ vec4 mv = modelViewMatrix * instanceMatrix * vec4(position,1.); vD = length(mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 uColor; uniform float uAlpha; uniform float uFar; varying float vD;
      void main(){ float a = uAlpha * (1. - smoothstep(uFar * .3, uFar, vD)); gl_FragColor = vec4(uColor, a);
      #include <colorspace_fragment>
      }`,
  });
  {
    const arm = 0.34, th = 0.045;
    const a = new THREE.PlaneGeometry(arm * 2, th * 2);
    const b = new THREE.PlaneGeometry(th * 2, arm * 2);
    const geo = mergePlanes(a, b);
    const spots = [];
    for (let t = TH[0]; t <= TH[1]; t += STEP) for (let p = PH[0]; p <= PH[1]; p += STEP) if (rand() < 0.42) spots.push([t, p]);
    const inst = new THREE.InstancedMesh(geo, crossMat, spots.length);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1);
    spots.forEach(([t, p], i) => {
      const pos = new THREE.Vector3(R * Math.sin(t) * Math.cos(p), R * Math.cos(t) * Math.cos(p) - R, R * Math.sin(p));
      const n = pos.clone().sub(CENTER).normalize();
      q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
      pos.addScaledVector(n, 0.02);
      m.compose(pos, q, s);
      inst.setMatrixAt(i, m);
    });
    scene.add(inst);
  }

  // ── Stars ──
  const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.35, sizeAttenuation: true, transparent: true, opacity: 0.7, depthWrite: false });
  {
    const n = 900, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const v = new THREE.Vector3(rand() * 2 - 1, rand() * 2 - 1, rand() * 2 - 1).normalize().multiplyScalar(160 + rand() * 60);
      pos.set([v.x, v.y + 20, v.z], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    scene.add(new THREE.Points(g, starMat));
  }

  // ── Tiles ──
  const iconTex = (name) => {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const ctx = c.getContext('2d');
    const k = (256 / 24) * 0.6;
    ctx.translate(128 - 12 * k, 128 - 12 * k);
    ctx.scale(k, k);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = 'rgba(255,255,255,.7)';
    ctx.shadowBlur = 4;
    ctx.stroke(new Path2D(ICONS[name]));
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  };
  const tileGeo = new RoundedBoxGeometry(1.6, 1.6, 0.52, 5, 0.17);
  const faceGeo = new THREE.PlaneGeometry(1.2, 1.2);
  const tileMat = new THREE.MeshPhysicalMaterial({
    color: 0x2f7bff, emissive: 0x1043d8, emissiveIntensity: 0.34,
    roughness: 0.28, metalness: 0, clearcoat: 0.65, clearcoatRoughness: 0.14, envMapIntensity: 0.42,
  });
  tileMat.toneMapped = false;
  const tiles = ICON_ORDER.map((name, i) => {
    const g = new THREE.Group();
    const mat = tileMat.clone();
    mat.toneMapped = false;
    const body = new THREE.Mesh(tileGeo, mat);
    body.userData.tile = i;
    g.add(body);
    const faceMat = new THREE.MeshBasicMaterial({ map: iconTex(name), transparent: true, depthWrite: false, toneMapped: false });
    const front = new THREE.Mesh(faceGeo, faceMat);
    front.position.z = 0.265;
    const back = new THREE.Mesh(faceGeo, faceMat);
    back.position.z = -0.265;
    back.rotation.y = Math.PI;
    g.add(front, back);
    g.userData = { seed: rand() * 100, i, rx: rand(), rz: rand(), ry: rand(), name, mat, body, hover: 0, spin: 0, spinTarget: 0, pop: 0 };
    scene.add(g);
    return g;
  });
  const bodies = tiles.map((t) => t.userData.body);
  const N = tiles.length;

  // ── Placement screens ──
  const screens = featured.map((f, i) => {
    const g = new THREE.Group();
    const frameMesh = new THREE.Mesh(new RoundedBoxGeometry(6.6, 4.1, 0.16, 3, 0.05), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.45 }));
    const face = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 3.9), new THREE.MeshBasicMaterial({ map: screenTexture(f, programColors), toneMapped: false }));
    face.position.z = 0.085;
    g.add(frameMesh, face);
    g.visible = false;
    scene.add(g);
    return g;
  });

  // ── Process route ──
  const ROUTE_T = D(97);
  const routeNodes = [[-7.5, 2.4], [0.4, -0.6], [7.6, 1.6]].map(([x, z]) => surface(ROUTE_T, x, z, 0.06));
  const routeCurve = new THREE.CatmullRomCurve3([
    surface(ROUTE_T, -11, 4, 0.06), routeNodes[0], surface(ROUTE_T, -3.5, -0.2, 0.06), routeNodes[1],
    surface(ROUTE_T, 4, 0.6, 0.06), routeNodes[2], surface(ROUTE_T, 11, 3, 0.06),
  ]);
  const routeGeo = new THREE.TubeGeometry(routeCurve, 240, 0.035, 6, false);
  const routeMat = new THREE.MeshBasicMaterial({ color: 0x9fc2ff, transparent: true, opacity: 1, toneMapped: false });
  const route = new THREE.Mesh(routeGeo, routeMat);
  scene.add(route);
  const routeIndexCount = routeGeo.index.count;
  const nodeMeshes = routeNodes.map((p) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }));
    m.position.copy(p);
    scene.add(m);
    return m;
  });
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), new THREE.MeshBasicMaterial({ color: 0x3d8bff, toneMapped: false }));
  scene.add(head);

  // pulse rings that ripple out of each stop once the route reaches it
  const pulseMat = () => new THREE.MeshBasicMaterial({ color: 0x9fc2ff, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
  const pulses = routeNodes.map((p) => {
    const n = p.clone().sub(CENTER).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
    return [0, 1].map((k) => {
      const m = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.5, 48), pulseMat());
      m.position.copy(p).addScaledVector(n, 0.02);
      m.quaternion.copy(q);
      m.userData.phase = k * 0.5;
      m.visible = false;
      scene.add(m);
      return m;
    });
  }).flat();

  // a light streak that keeps travelling along the finished route
  const comet = Array.from({ length: 9 }, (_, k) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.11 * (1 - k / 11), 12, 10), new THREE.MeshBasicMaterial({ color: k ? 0x9fc2ff : 0xffffff, transparent: true, opacity: 1 - k / 9, depthWrite: false, toneMapped: false }));
    m.visible = false;
    scene.add(m);
    return m;
  });

  // "circuit" lines that connect the tiles while they assemble into a wall
  const WALL_EDGES = [];
  for (let i = 0; i < 16; i++) {
    if (i % 4 < 3) WALL_EDGES.push([i, i + 1]);
    if (i < 12) WALL_EDGES.push([i, i + 4]);
  }
  const circuitGeo = new THREE.BufferGeometry();
  circuitGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(WALL_EDGES.length * 6), 3));
  const circuitMat = new THREE.LineBasicMaterial({ color: 0x9fc2ff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  const circuit = new THREE.LineSegments(circuitGeo, circuitMat);
  circuit.frustumCulled = false;
  circuit.visible = false;
  scene.add(circuit);
  // a glowing junction in the middle of every trace
  const nodeGeo = new THREE.BufferGeometry();
  nodeGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(WALL_EDGES.length * 3), 3));
  const nodeMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.22, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  const circuitNodes = new THREE.Points(nodeGeo, nodeMat);
  circuitNodes.frustumCulled = false;
  circuitNodes.visible = false;
  scene.add(circuitNodes);
  const tmpV = new THREE.Vector3();

  // sparks that burst from each tile as it flips in the "launch" step
  const SPARKS = 14;
  const sparkDirs = Array.from({ length: 16 * SPARKS }, () => new THREE.Vector3(rand() * 2 - 1, rand() * 2 - 1, rand() * 2 - 1).normalize().multiplyScalar(0.6 + rand() * 0.9));
  const sparkGeo = new THREE.BufferGeometry();
  sparkGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(16 * SPARKS * 3), 3));
  const sparkMat = new THREE.PointsMaterial({ color: 0xcfe2ff, size: 0.2, transparent: true, opacity: 1, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  const sparks = new THREE.Points(sparkGeo, sparkMat);
  sparks.frustumCulled = false;
  sparks.visible = false;
  scene.add(sparks);

  // ── Camera helpers ──
  const tmpM = new THREE.Matrix4();
  function camBasis(c, aspect) {
    const f = c.look.clone().sub(c.pos).normalize();
    const r = new THREE.Vector3().crossVectors(f, c.up).normalize();
    const u = new THREE.Vector3().crossVectors(r, f).normalize();
    const th = Math.tan(D(c.fov / 2));
    return {
      f, r, u,
      at(nx, ny, d) { return c.pos.clone().addScaledVector(f, d).addScaledVector(r, nx * th * d * aspect).addScaledVector(u, ny * th * d); },
      face(rx = 0, ry = 0, rz = 0) {
        tmpM.makeBasis(r, u, f.clone().negate());
        return new THREE.Quaternion().setFromRotationMatrix(tmpM).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)));
      },
    };
  }
  function cam(theta, pos, look, roll = 0, fov = 40) {
    const fr = frame(theta);
    const p = fr.L(...pos), l = fr.L(...look);
    const dir = l.clone().sub(p).normalize();
    const up = fr.up.clone().applyAxisAngle(dir, roll);
    return { pos: p, look: l, up, fov };
  }
  const T = (pos, quat, s = 1) => ({ p: pos, q: quat, s });

  // Grid cells: tiles lying on the planet sit exactly inside a grid square.
  const thetaLine = (theta) => TH[0] + Math.round((theta - TH[0]) / STEP) * STEP;
  const phiLine = PH[0] + Math.round(-PH[0] / STEP) * STEP;
  function cell(theta, cx, cz) {
    const t = thetaLine(theta) + (cx + 0.5) * STEP;
    const p = phiLine + (cz + 0.5) * STEP;
    return { x: (t - theta) * R, z: p * R };
  }
  function pickCells(seed, c0, c1, r0, r1, n, skip = () => false) {
    const all = [];
    for (let cx = c0; cx <= c1; cx++) for (let cz = r0; cz <= r1; cz++) if (!skip(cx, cz)) all.push([cx, cz]);
    let sd = seed;
    const rnd = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
    for (let i = all.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [all[i], all[j]] = [all[j], all[i]]; }
    return all.slice(0, n);
  }
  const CELLS = {
    floor: pickCells(11, -5, 4, -4, 1, N),
    exhibit: pickCells(23, -7, 6, -7, -3, N),
    route: pickCells(37, -6, 5, -5, 4, N, (cx, cz) => cz >= -1 && cz <= 2),
    studio: pickCells(41, -4, 3, -3, 2, N),
  };
  const lying = (theta, [cx, cz], h, s) => {
    const { x, z } = cell(theta, cx, cz);
    return T(surface(theta, x, z, h), surfaceQuat(theta, x, z, 0), s);
  };
  // tiles on a screen-space ring all lean the same way: towards the centre
  const ringFace = (b, nx, ny) => b.face(ny * 0.35, -nx * 0.45, 0);

  // ── Shots ──
  // env: { t (time), sec (progress map), aspect }
  const shots = {
    hero(env) {
      const c = cam(0, [0, 13.5, 13], [0, 0, -6.5], -0.42);
      const b = camBasis(c, env.aspect);
      const Rc = 10.5, spin = -env.sec.welcome * Math.PI * 1.1 - env.t * 0.035;
      const near = env.aspect > 1.2 ? 9.6 : 11.5;
      const center = c.pos.clone().addScaledVector(b.f, near + Rc).addScaledVector(b.u, env.aspect > 1.2 ? 1.45 : 1.75);
      const tl = tiles.map((tile, i) => {
        const a = (i / N) * Math.PI * 2 + spin;
        const n = b.r.clone().multiplyScalar(Math.sin(a)).addScaledVector(b.f, -Math.cos(a));
        const pos = center.clone().addScaledVector(n, Rc).addScaledVector(b.u, Math.sin(env.t * 0.7 + tile.userData.seed) * 0.12);
        const x = new THREE.Vector3().crossVectors(b.u, n);
        const q = new THREE.Quaternion().setFromRotationMatrix(tmpM.makeBasis(x, b.u, n));
        return T(pos, q, 1.02);
      });
      return { cam: c, tiles: tl, pal: palette('dark', { x: 1.05, y: 0.5, s: 1.8, a: 0.85 }) };
    },
    heroLow(env) {
      const c = cam(0, [0, 7, 9], [0, 0, -9], -0.5);
      const b = camBasis(c, env.aspect);
      const tl = tiles.map((tile, i) => {
        const a = (i / N) * Math.PI * 2;
        return T(b.at(Math.cos(a) * 1.25, 1.35 + Math.sin(a) * 0.4, 12 + (i % 4) * 2), b.face(0.3, 0.4, 0.2), 1);
      });
      return { cam: c, tiles: tl, pal: palette('dark', { x: 1.05, y: 0.75, s: 2.2 }) };
    },
    space(env) {
      const c = cam(0, [0, 9, 12], [0, 15, -30], 0);
      const b = camBasis(c, env.aspect);
      const spin = env.sec.about * Math.PI * 0.5 + env.t * 0.02;
      const narrow = env.aspect < 0.9;
      const tl = tiles.map((tile, i) => {
        const { seed } = tile.userData;
        const a = (i / N) * Math.PI * 2 + spin;
        const d = 18;
        const nx = Math.cos(a) * (narrow ? 0.95 : 0.9), ny = Math.sin(a) * (narrow ? 0.9 : 0.86);
        return T(b.at(nx, ny + Math.sin(env.t * 0.6 + seed) * 0.012, d), ringFace(b, nx, ny), narrow ? 0.6 : 0.82);
      });
      return { cam: c, tiles: tl, pal: palette('dark', { x: 0.95, y: 0.95, s: 1.8 }) };
    },
    floor(env, name = 'dark') {
      const c = cam(0, [0, 10.5, 5.5], [0, 0, -3.5], 0.42);
      const tl = tiles.map((tile, i) => {
        const lift = i % 4 === 0 ? 1.3 + Math.sin(env.t * 0.8 + tile.userData.seed) * 0.15 : 0;
        return lying(0, CELLS.floor[i], 0.26 + lift, 0.85);
      });
      return { cam: c, tiles: tl, pal: palette(name, { x: -0.9, y: -0.1, s: 2.2 }) };
    },
    blue(env) { return shots.floor(env, 'blue'); },
    workIntro(env) {
      const th = D(9);
      const c = cam(th, [0, 3.2, 15], [0, 3.6, 0], 0);
      const b = camBasis(c, env.aspect);
      const spin = env.sec.work * 2 + env.t * 0.015;
      const tl = tiles.map((tile, i) => {
        const a = (i / N) * Math.PI * 2 + spin;
        const nx = Math.cos(a) * 0.92, ny = Math.sin(a) * 0.86;
        return T(b.at(nx, ny, 18), ringFace(b, nx, ny), 0.8);
      });
      return { cam: c, tiles: tl, pal: palette('light') };
    },
    exhibit(env, i) {
      const th = exhibitTheta(i);
      const q = exhibitQ(env, i);
      const narrow = env.aspect < 0.9;
      const d = narrow ? clamp(7.3 / (0.728 * env.aspect), 12, 26) : clamp(12.5 / (0.728 * env.aspect), 9.5, 22);
      const vw = 0.728 * d * env.aspect;
      const dx = narrow ? 0 : 0.6 - vw * 0.2;
      const lookY = narrow ? 2.35 - 0.146 * d : 2.3;
      const c = cam(th, [dx + (q - 0.5) * (narrow ? 0.4 : 1.4), lookY + 0.5, d], [dx + (q - 0.5) * (narrow ? 0.2 : 0.8), lookY, 0], 0);
      const tl = tiles.map((tile, k) => lying(th, CELLS.exhibit[k], 0.18, 0.6));
      return { cam: c, tiles: tl, pal: palette('light') };
    },
    route(env) {
      const k = clamp(1.55 / env.aspect, 1, 2.4);
      const c = cam(ROUTE_T, [0, 9.5 * k, 11 * k], [0, 0, -1.5], 0.06);
      const tl = tiles.map((tile, k) => lying(ROUTE_T, CELLS.route[k], 0.2, 0.7));
      return { cam: c, tiles: tl, pal: palette('dusk', { x: 0.2, y: 1.0, s: 2.4 }) };
    },
    steps(env) {
      const th = D(108);
      const narrow = env.aspect < 0.9;
      const c = cam(th, [3, 15, 19], [3, 3, -6], -0.22);
      const b = camBasis(c, env.aspect);
      const sp = env.sec.steps * 3; // 0..3
      const s1 = smooth(0.85, 1.6, sp), s2 = smooth(1.9, 2.7, sp);
      const cx = narrow ? 0 : 0.5, cy = narrow ? -0.45 : 0;
      const tl = tiles.map((tile, i) => {
        const { rx, rz, ry, seed } = tile.userData;
        // learn: loose cloud
        const cloud = b.at(cx + (rx - 0.5) * 0.85 + Math.sin(env.t * 0.3 + seed) * 0.03, cy + (rz - 0.5) * 1.1, 17 + ry * 9);
        const qCloud = b.face((rz - 0.5) * 0.9, (rx - 0.5) * 1.2, (ry - 0.5) * 0.5);
        // build: a 4×4 wall
        const col = i % 4, row = Math.floor(i / 4);
        const stagger = smooth(i / N * 0.6, i / N * 0.6 + 0.4, s1);
        const wall = b.at(cx + (col - 1.5) * (narrow ? 0.34 : 0.12), cy + (1.5 - row) * (narrow ? 0.16 : 0.19), 20);
        const qWall = b.face(-0.25, -0.3, 0);
        // launch: tiles flip in sequence
        const flip = smooth(i / N * 0.7, i / N * 0.7 + 0.3, s2) * Math.PI * 2;
        const pos = cloud.lerp(wall, stagger);
        const qq = qCloud.slerp(qWall, stagger).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, flip, 0)));
        return T(pos, qq, lerp(narrow ? 0.55 : 0.78, narrow ? 0.55 : 0.75, stagger));
      });
      return { cam: c, tiles: tl, pal: palette('dark', { x: 1.0, y: 0.9, s: 1.7 }) };
    },
    details(env) {
      const th = D(122);
      const c = cam(th, [0, 3.2, 15], [0, 4.5, 0], 0);
      const b = camBasis(c, env.aspect);
      const tl = tiles.map((tile, i) => {
        const a = (i / (N - 1)) * Math.PI * 0.9 + Math.PI * 0.05 + env.sec.details * 0.25;
        const nx = Math.cos(a) * 0.7, ny = 0.06 + Math.sin(a) * 0.66;
        return T(b.at(nx, ny + Math.sin(env.t * 0.7 + i) * 0.006, 19), ringFace(b, nx, ny - 0.06), 0.72);
      });
      return { cam: c, tiles: tl, pal: palette('dark', { x: 0.95, y: 0.95, s: 1.8 }) };
    },
    day(env) {
      const th = D(127);
      const narrow = env.aspect < 0.9;
      const c = cam(th, [0, 2.6, 15], [0, 4.6, 0], 0);
      const b = camBasis(c, env.aspect);
      const n = dayState.tiles.length || 1;
      const used = new Set(dayState.tiles);
      let floorK = 0;
      const tl = tiles.map((tile, i) => {
        const k = dayState.tiles.indexOf(i);
        if (k < 0) {
          const cellAt = CELLS.floor[floorK++ % CELLS.floor.length];
          return lying(th, cellAt, 0.2, 0.7);
        }
        // a sun path: activities rise and set across the sky
        const f = n > 1 ? k / (n - 1) : 0.5;
        const nx = narrow ? -0.8 + f * 1.6 : -0.05 + f * 0.95;
        const ny = narrow ? -0.08 + Math.sin(f * Math.PI) * 0.4 : 0.05 + Math.sin(f * Math.PI) * 0.62;
        const on = k === dayState.active;
        const pos = b.at(nx, ny + Math.sin(env.t * 0.9 + k) * 0.008, on ? 15 : 19);
        return T(pos, ringFace(b, (nx - 0.45) * 0.6, ny - 0.3), on ? (narrow ? 0.85 : 1.15) : (narrow ? 0.5 : 0.7));
      });
      // the glow travels like the sun; the sky warms at the edges of the day
      const t = dayState.t;
      const pal = palette('dark', { x: -1.1 + t * 2.2, y: 0.25 + Math.sin(t * Math.PI) * 0.75, s: 1.6, a: 0.95 });
      const warm = new THREE.Color('#ff9a52'), noon = new THREE.Color('#5d9bff');
      const edge = Math.abs(t - 0.5) * 2;
      pal.glow = noon.clone().lerp(warm, smooth(0.45, 1, edge));
      pal.bg = new THREE.Color('#0d1430').lerp(new THREE.Color('#1a1030'), smooth(0.6, 1, edge));
      return { cam: c, tiles: tl, pal };
    },
    finder(env) {
      const th = D(141);
      const narrow = env.aspect < 0.9;
      const c = cam(th, [0, 5, 15], [0, 3.4, 0], 0);
      const b = camBasis(c, env.aspect);
      const sel = [...finder.selected];
      const cx = narrow ? 0 : 0.42, cy = narrow ? 0.42 : 0;
      const tl = tiles.map((tile, i) => {
        const col = i % 4, row = Math.floor(i / 4);
        const picked = finder.selected.has(i);
        if (finder.result) {
          if (!picked) return lying(th, CELLS.floor[i], 0.2, 0.7);
          const k = sel.indexOf(i), m = sel.length;
          const nx = cx + (k - (m - 1) / 2) * (narrow ? 0.42 : 0.16);
          return T(b.at(nx, cy + Math.sin(env.t * 1.4 + k) * 0.01, 14), b.face(-0.15, Math.sin(env.t * 0.8 + k) * 0.3, 0), narrow ? 0.9 : 1.15);
        }
        const wall = b.at(cx + (col - 1.5) * (narrow ? 0.34 : 0.12), cy + (1.5 - row) * (narrow ? 0.14 : 0.19), picked ? 16.5 : 19);
        return T(wall, b.face(-0.12, picked ? -0.35 : -0.2, 0), narrow ? 0.62 : 0.8);
      });
      return { cam: c, tiles: tl, pal: palette('dark', { x: 1.0, y: 0.95, s: 1.7 }) };
    },
    studioTitle(env) {
      const th = D(134);
      const c = cam(th, [0, 6.5, 14], [0, 3.2, 0], 0);
      const b = camBasis(c, env.aspect);
      const tl = tiles.map((tile, i) => {
        const a = (i / N) * Math.PI * 2 + env.t * 0.02 + env.sec.studio;
        const nx = Math.cos(a) * 0.9, ny = Math.sin(a) * 0.84;
        return T(b.at(nx, ny, 22), ringFace(b, nx, ny), 0.78);
      });
      return { cam: c, tiles: tl, pal: palette('dark', { x: 0.95, y: 1.0, s: 1.6 }) };
    },
    studioCluster(env) {
      const th = D(134);
      const c = cam(th, [0, 6.5, 14], [0, 3.2, 0], 0);
      const b = camBasis(c, env.aspect);
      const narrow = env.aspect < 0.9;
      const tl = tiles.map((tile, i) => {
        const col = i % 4, row = Math.floor(i / 4);
        const sx = narrow ? 0.3 : 0.13, sy = narrow ? 0.14 : 0.2;
        const wave = Math.sin(env.t * 1.2 - (col + row) * 0.6) * 0.15;
        return T(b.at((col - 1.5) * sx, (1.5 - row) * sy, 20), b.face(-0.2 + wave, 0.25, 0), narrow ? 0.6 : 0.8);
      });
      return { cam: c, tiles: tl, pal: palette('dark', { x: 0.95, y: 1.0, s: 1.6 }) };
    },
    studioPanel(env) {
      const th = D(134);
      const c = cam(th, [0, 13, 9], [0, 0, -1.5], 0.0);
      const tl = tiles.map((tile, i) => lying(th, CELLS.studio[i], 0.3 + Math.sin(env.t * 0.7 + i) * 0.05, 1));
      return { cam: c, tiles: tl, pal: palette('dark', { x: 1.0, y: 1.1, s: 1.5 }) };
    },
    contact(env) {
      const th = D(150);
      const narrow = env.aspect < 0.9;
      const c = cam(th, [narrow ? 2.5 : 0, narrow ? 11 : 9, narrow ? 19 : 14], [narrow ? 3.5 : 2.5, narrow ? 6.5 : 1, 0], -0.15);
      const tl = tiles.map((tile, i) => {
        const col = i % 4, row = Math.floor(i / 4);
        const step = Math.max(0, 2 - Math.abs(col - 1.5) - Math.abs(row - 1.5)) ;
        const h = 0.24 + step * 0.42 + Math.sin(env.t * 0.9 - (col + row) * 0.5) * 0.05;
        return lying(th, [(narrow ? -1 : 1) + col, row - 2], h, 0.85);
      });
      return { cam: c, tiles: tl, pal: palette('dark', { x: 0.9, y: 1.05, s: 1.7 }) };
    },
  };

  // ── Timeline ──
  const EX_START = 0.12, EX_W = (1 - EX_START) / featured.length;
  const exhibitTheta = (i) => D(17 + i * 11);
  const exhibitQ = (env, i) => (env.sec.work - (EX_START + i * EX_W)) / EX_W;
  const KEYS = [
    ['welcome', 0, 'hero'], ['welcome', 0.4, 'hero'], ['welcome', 0.78, 'heroLow'],
    ['about', 0.05, 'space'], ['about', 0.6, 'space'], ['about', 0.69, 'floor'], ['about', 0.86, 'floor'], ['about', 0.98, 'blue'],
    ['work', 0.035, 'workIntro'], ['work', EX_START - 0.025, 'workIntro'],
    ...featured.flatMap((_, i) => [['work', EX_START + i * EX_W + EX_W * 0.08, 'ex' + i], ['work', EX_START + i * EX_W + EX_W * 0.82, 'ex' + i]]),
    ['process', 0.08, 'route'], ['process', 0.88, 'route'],
    ['steps', 0.04, 'steps'], ['steps', 0.97, 'steps'],
    ['details', 0.08, 'details'], ['details', 0.9, 'details'],
    ['day', 0.05, 'day'], ['day', 0.95, 'day'],
    ['studio', 0.05, 'studioTitle'], ['studio', 0.27, 'studioTitle'], ['studio', 0.36, 'studioCluster'], ['studio', 0.4, 'studioCluster'], ['studio', 0.5, 'studioPanel'], ['studio', 0.97, 'studioPanel'],
    ['finder', 0.08, 'finder'], ['finder', 0.92, 'finder'],
    ['contact', 0.6, 'contact'],
  ];
  featured.forEach((_, i) => { shots['ex' + i] = (env) => shots.exhibit(env, i); });

  function blend(a, b, k) {
    const c = {
      pos: a.cam.pos.clone().lerp(b.cam.pos, k), look: a.cam.look.clone().lerp(b.cam.look, k),
      up: a.cam.up.clone().lerp(b.cam.up, k).normalize(), fov: lerp(a.cam.fov, b.cam.fov, k),
    };
    const tl = a.tiles.map((ta, i) => {
      const tb = b.tiles[i];
      return T(ta.p.clone().lerp(tb.p, k), ta.q.clone().slerp(tb.q, k), lerp(ta.s, tb.s, k));
    });
    const pa = a.pal, pb = b.pal;
    const pal = {
      bg: pa.bg.clone().lerp(pb.bg, k), line: pa.line.clone().lerp(pb.line, k), lineA: lerp(pa.lineA, pb.lineA, k),
      cross: pa.cross.clone().lerp(pb.cross, k), crossA: lerp(pa.crossA, pb.crossA, k), stars: lerp(pa.stars, pb.stars, k),
      glow: pa.glow.clone().lerp(pb.glow, k), glowA: lerp(pa.glowA, pb.glowA, k), gx: lerp(pa.gx, pb.gx, k), gy: lerp(pa.gy, pb.gy, k), gs: lerp(pa.gs, pb.gs, k),
    };
    return { cam: c, tiles: tl, pal };
  }

  function evaluate(env, layout) {
    const abs = (sec, p) => layout[sec].start + p * layout[sec].len;
    const u = env.u;
    const keys = KEYS.map(([s, p, shot]) => [abs(s, p), shot]);
    if (u <= keys[0][0]) return shots[keys[0][1]](env);
    for (let i = 0; i < keys.length - 1; i++) {
      const [ua, sa] = keys[i], [ub, sb] = keys[i + 1];
      if (u >= ua && u <= ub) {
        const k = ub > ua ? ease((u - ua) / (ub - ua)) : 1;
        if (sa === sb) return shots[sa](env);
        return blend(shots[sa](env), shots[sb](env), k);
      }
    }
    return shots[keys[keys.length - 1][1]](env);
  }

  // ── Chapter state pushed in from app.js ──
  const finder = { selected: new Set(), result: false };
  const dayState = { tiles: [], active: -1, t: 0 };

  // ── Frame + tile interaction ──
  const pointer = { x: 0, y: 0, sx: 0, sy: 0, cx: -999, cy: -999, active: false, blocked: false };
  const ndc = new THREE.Vector2(9, 9);
  const BLOCK = 'a,button,input,select,textarea,label,dialog,.site-header,.mobile-menu,.chapter-dots,.feature-card,.step,.studio-scene__panel,.work-award__box,.exhibit-copy,.contact__main,.route__step,.statement,.day__card,.day__track,.finder__panel';
  const raycaster = new THREE.Raycaster();
  let hovered = -1;
  const tip = opts.tip;
  addEventListener('pointermove', (e) => {
    pointer.x = e.clientX / innerWidth - 0.5; pointer.y = e.clientY / innerHeight - 0.5;
    pointer.cx = e.clientX; pointer.cy = e.clientY; pointer.active = true;
    ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    pointer.blocked = !!document.elementFromPoint(e.clientX, e.clientY)?.closest(BLOCK);
  }, { passive: true });
  document.addEventListener('pointerleave', () => { pointer.active = false; });
  addEventListener('pointerdown', (e) => {
    if (e.target.closest?.(BLOCK)) return;
    ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    const i = pick();
    if (i < 0) return;
    if (opts.onTileClick?.(i)) tiles[i].userData.pop = 1;
    else kick(i);
  });
  function pick() {
    raycaster.setFromCamera(ndc, camera);
    const hit = raycaster.intersectObjects(bodies.filter((b) => b.parent.visible), false)[0];
    return hit ? hit.object.userData.tile : -1;
  }
  function kick(i) {
    const ud = tiles[i].userData;
    ud.spinTarget += Math.PI * 2;
    ud.pop = 1;
  }
  const qA = new THREE.Quaternion(), qB = new THREE.Quaternion(), qS = new THREE.Quaternion();
  const AX_Y = new THREE.Vector3(0, 1, 0), vp = new THREE.Vector3(), toCam = new THREE.Vector3();
  let lastT = 0;
  const clock = new THREE.Clock();
  let W = 1, H = 1;
  function resize() {
    W = innerWidth; H = innerHeight;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize);
  resize();

  const routeState = { draw: 0, visible: 0 };

  function render(state) {
    const t = clock.getElapsedTime();
    const env = { t, u: state.u, sec: state.sec, aspect: camera.aspect };
    const s = evaluate(env, state.layout);

    // camera (+ subtle pointer parallax)
    pointer.sx += (pointer.x - pointer.sx) * 0.05;
    pointer.sy += (pointer.y - pointer.sy) * 0.05;
    const f = s.cam.look.clone().sub(s.cam.pos).normalize();
    const r = new THREE.Vector3().crossVectors(f, s.cam.up).normalize();
    camera.position.copy(s.cam.pos).addScaledVector(r, pointer.sx * 0.6).addScaledVector(s.cam.up, -pointer.sy * 0.4);
    camera.up.copy(s.cam.up);
    camera.lookAt(s.cam.look);
    if (camera.fov !== s.cam.fov) { camera.fov = s.cam.fov; camera.updateProjectionMatrix(); }

    key.position.copy(camera.position).addScaledVector(s.cam.up, 12).addScaledVector(r, -8);
    key.target.position.copy(s.cam.look);
    key.target.updateMatrixWorld();
    fill.position.copy(camera.position).addScaledVector(r, 10);

    const dt = Math.min(0.1, t - lastT); lastT = t;
    const fk = (r) => 1 - Math.pow(1 - r, dt * 60);
    s.tiles.forEach((ts, i) => {
      const tile = tiles[i];
      tile.position.copy(ts.p);
      tile.quaternion.copy(ts.q);
      tile.scale.setScalar(Math.max(ts.s, 0.0001));
      tile.visible = ts.s > 0.01;
    });
    camera.updateMatrixWorld();
    // re-check what is under the cursor every frame: content scrolls under a still mouse
    if (pointer.active) pointer.blocked = !!document.elementFromPoint(pointer.cx, pointer.cy)?.closest(BLOCK);
    hovered = pointer.active && !pointer.blocked && !document.querySelector('dialog[open]') ? pick() : -1;
    const camUp = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
    const camRight = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
    tiles.forEach((tile, i) => {
      const ud = tile.userData;
      ud.hover += ((i === hovered ? 1 : 0) - ud.hover) * fk(0.16);
      ud.spin += (ud.spinTarget - ud.spin) * fk(0.06);
      ud.pop = Math.max(0, ud.pop - dt * 1.6);
      if (!tile.visible) return;
      // magnet: tiles near the cursor turn to look at it
      vp.copy(tile.position).project(camera);
      const dx = ndc.x - vp.x, dy = ndc.y - vp.y;
      const infl = pointer.active ? Math.exp(-((dx * camera.aspect) ** 2 + dy * dy) / 0.09) : 0;
      qA.setFromAxisAngle(camUp, clamp(dx * 1.4, -0.6, 0.6) * infl);
      qB.setFromAxisAngle(camRight, clamp(-dy * 1.4, -0.6, 0.6) * infl);
      tile.quaternion.premultiply(qA).premultiply(qB);
      tile.quaternion.multiply(qS.setFromAxisAngle(AX_Y, ud.spin));
      // hover: lift towards the camera and grow; click: hop
      toCam.copy(camera.position).sub(tile.position).normalize();
      const sc = tile.scale.x;
      tile.position.addScaledVector(toCam, ud.hover * 0.8 * sc).addScaledVector(camUp, Math.sin(ud.pop * Math.PI) * 0.7 * sc);
      tile.scale.setScalar(sc * (1 + 0.16 * ud.hover));
      const picked = (finder.selected.has(i) && state.sub === 'finder') || (dayState.tiles[dayState.active] === i && state.sub === 'day');
      ud.lit = (ud.lit || 0) + ((picked ? 1 : 0) - (ud.lit || 0)) * fk(0.1);
      ud.mat.emissiveIntensity = 0.34 + 0.5 * ud.hover + 0.5 * Math.sin(ud.pop * Math.PI) + 0.7 * ud.lit;
    });
    document.body.classList.toggle('tile-hover', hovered >= 0);
    if (tip) {
      tip.classList.toggle('is-on', hovered >= 0);
      if (hovered >= 0) {
        const ud = tiles[hovered].userData;
        if (tip.dataset.i !== String(hovered)) {
          tip.dataset.i = hovered;
          tip.querySelector('[data-tip-no]').textContent = String(hovered + 1).padStart(2, '0');
          tip.querySelector('[data-tip-text]').textContent = TILE_LABELS[ud.name] || ud.name;
        }
        tip.style.transform = `translate3d(${pointer.cx + 16}px, ${pointer.cy + 18}px, 0)`;
      }
    }

    // palette
    const p = s.pal;
    renderer.setClearColor(p.bg, 1);
    fadeUniforms.uColor.value.copy(p.line); fadeUniforms.uAlpha.value = p.lineA;
    crossUniforms.uColor.value.copy(p.cross); crossUniforms.uAlpha.value = p.crossA;
    starMat.opacity = p.stars;
    const th = Math.tan(D(camera.fov / 2)), depth = 150;
    glow.position.set(p.gx * th * depth * camera.aspect, p.gy * th * depth, -depth);
    glow.scale.setScalar(p.gs * 2 * th * depth);
    glow.material.color.copy(p.glow);
    glow.material.opacity = p.glowA;
    glow.visible = p.glowA > 0.01;

    // screens rise when their exhibit comes up
    screens.forEach((g, i) => {
      const q = exhibitQ(env, i);
      const rise = smooth(-0.35, 0.18, q);
      const sink = smooth(0.95, 1.4, q);
      const visible = q > -0.7 && q < 1.6;
      g.visible = visible;
      if (!visible) return;
      const th2 = exhibitTheta(i);
      const narrow = env.aspect < 0.9;
      const x = narrow ? 0 : 0.6;
      const yaw = narrow ? 0 : -0.32;
      const standH = 2.35;
      g.position.copy(surface(th2, x, 0, lerp(0.1, standH, rise) - sink * 2.5));
      const qStand = surfaceQuat(th2, x, 0, 0, 0).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)));
      const qFlat = surfaceQuat(th2, x, 0, 0, 0);
      g.quaternion.copy(qFlat.slerp(qStand, rise)).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw * rise, 0)));
      g.scale.setScalar(1);
    });

    // route drawing
    const pr = state.sec.process ?? 0;
    const inProcess = state.chapter === 'process';
    routeState.draw = smooth(0.12, 0.7, pr);
    routeState.visible = inProcess && (state.sub === 'process' || state.sub === 'steps') ? 1 : 0;
    const rv = routeState.visible > 0 && routeState.draw > 0;
    route.visible = rv;
    route.geometry.setDrawRange(0, Math.floor(routeIndexCount * routeState.draw / 6) * 6);
    nodeMeshes.forEach((m, i) => { m.visible = rv && routeState.draw >= [0.17, 0.5, 0.83][i]; });
    head.visible = rv && routeState.draw < 1;
    if (rv) head.position.copy(routeCurve.getPointAt(Math.min(0.999, routeState.draw)));

    // route pulses + comet
    const stopsAt = [0.17, 0.5, 0.83];
    pulses.forEach((m, k) => {
      const node = Math.floor(k / 2);
      const on = rv && routeState.draw >= stopsAt[node];
      m.visible = on;
      if (!on) return;
      const ph = (t * 0.45 + m.userData.phase + node * 0.17) % 1;
      m.scale.setScalar(0.6 + ph * 3.2);
      m.material.opacity = (1 - ph) * 0.55;
    });
    const cometOn = rv && routeState.draw >= 0.999;
    comet.forEach((m, k) => {
      m.visible = cometOn;
      if (cometOn) m.position.copy(routeCurve.getPointAt(((t * 0.11 - k * 0.006) % 1 + 1) % 1));
    });

    // circuit lines + launch sparks (process steps)
    const sp = (state.sec.steps ?? 0) * 3;
    const inSteps = state.sub === 'steps';
    const link = inSteps ? smooth(1.15, 1.75, sp) : 0;
    circuit.visible = circuitNodes.visible = link > 0.01;
    if (circuit.visible) {
      const arr = circuitGeo.attributes.position.array;
      const visibleEdges = Math.ceil(WALL_EDGES.length * smooth(1.15, 1.6, sp));
      const nodeArr = nodeGeo.attributes.position.array;
      WALL_EDGES.forEach(([a, b], k) => {
        // a short trace across the gap between two neighbouring tiles, just in front of their faces
        const A = tiles[a].position, B = tiles[b].position;
        const dir = tmpV.copy(B).sub(A);
        const len = dir.length();
        dir.divideScalar(len || 1);
        const half = 0.8 * tiles[a].scale.x;
        const lift = toCam.copy(camera.position).sub(A).normalize().multiplyScalar(0.3 * tiles[a].scale.x);
        const on = k < visibleEdges;
        const p0 = A.clone().addScaledVector(dir, Math.min(half, len / 2)).add(lift);
        const p1 = on ? B.clone().addScaledVector(dir, -Math.min(half, len / 2)).add(lift) : p0;
        arr.set([p0.x, p0.y, p0.z, p1.x, p1.y, p1.z], k * 6);
        const mid = p0.clone().lerp(p1, 0.5);
        nodeArr.set(on ? [mid.x, mid.y, mid.z] : [A.x, A.y, A.z], k * 3);
      });
      circuitGeo.attributes.position.needsUpdate = true;
      nodeGeo.attributes.position.needsUpdate = true;
      circuitMat.opacity = link * (0.7 + Math.sin(t * 3) * 0.2);
      nodeMat.opacity = link * (0.65 + Math.sin(t * 4) * 0.35);
    }
    const s2 = smooth(1.9, 2.7, sp);
    sparks.visible = inSteps && s2 > 0 && s2 < 1;
    if (sparks.visible) {
      const arr = sparkGeo.attributes.position.array;
      for (let i = 0; i < 16; i++) {
        const f = smooth(i / 16 * 0.7, i / 16 * 0.7 + 0.3, s2);
        const burst = Math.sin(f * Math.PI);
        const c = tiles[i].position, sc = tiles[i].scale.x;
        for (let k = 0; k < SPARKS; k++) {
          const d = sparkDirs[i * SPARKS + k], j = (i * SPARKS + k) * 3;
          const r = burst * (1.1 + f * 0.9) * sc; // out and back in: the tile 'charges' as it flips
          arr[j] = c.x + d.x * r; arr[j + 1] = c.y + d.y * r; arr[j + 2] = c.z + d.z * r;
        }
      }
      sparkGeo.attributes.position.needsUpdate = true;
      sparkMat.opacity = 0.9;
    }

    renderer.render(scene, camera);
  }

  const v = new THREE.Vector3();
  function projectNode(i) {
    v.copy(routeNodes[i]).project(camera);
    return { x: (v.x * 0.5 + 0.5) * W, y: (-v.y * 0.5 + 0.5) * H, on: v.z < 1 };
  }

  return {
    render, projectNode, routeProgress: () => routeState.draw, hoveredTile: () => hovered,
    setFinder(selected, result) { finder.selected = new Set(selected); finder.result = result; },
    setDay(tileList, active, t) { dayState.tiles = tileList; dayState.active = active; dayState.t = t; },
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────
function mergePlanes(a, b) {
  const pos = [...a.attributes.position.array, ...b.attributes.position.array];
  const ia = [...a.index.array], off = a.attributes.position.count;
  const idx = [...ia, ...[...b.index.array].map((i) => i + off)];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  return g;
}

// Generates the "kiosk screen" artwork for a placement exhibit.
function screenTexture(f, colors) {
  const W = 1600, H = 975;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  const [c1, c2] = colors[f.program] || ['#0d1b3d', '#1f5fe0'];
  const bg = g.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, c1); bg.addColorStop(1, c2);
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  // particles
  for (let i = 0; i < 260; i++) {
    g.fillStyle = `rgba(255,255,255,${(Math.random() * 0.35).toFixed(2)})`;
    const s = Math.random() * 3 + 1;
    g.fillRect(Math.random() * W, Math.random() * H, s, s);
  }
  // spotlight
  const sp = g.createRadialGradient(W / 2, -100, 0, W / 2, -100, H * 1.1);
  sp.addColorStop(0, 'rgba(255,255,255,.35)'); sp.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = sp; g.fillRect(0, 0, W, H);
  const sans = '"42dot Sans", "Geist", system-ui, sans-serif';
  const mono = '"Geist Mono", ui-monospace, monospace';
  // ghost company word
  g.save();
  g.globalAlpha = 0.13;
  g.fillStyle = '#fff';
  g.font = `600 260px ${sans}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(f.company.split(' ')[0], W / 2, H * 0.42, W * 1.05);
  g.restore();
  // header
  g.fillStyle = 'rgba(255,255,255,.85)';
  g.font = `500 26px ${mono}`;
  g.fillText('SPHERONIX · CORPORATE TRAINING', 60, 72);
  g.textAlign = 'right';
  g.fillText(`BATCH ${f.batch}`, W - 60, 72);
  g.textAlign = 'left';
  // avatar
  const ax = W / 2, ay = H * 0.4, ar = 120;
  const av = g.createLinearGradient(ax - ar, ay - ar, ax + ar, ay + ar);
  av.addColorStop(0, 'rgba(255,255,255,.95)'); av.addColorStop(1, 'rgba(255,255,255,.55)');
  g.fillStyle = av;
  g.beginPath(); g.arc(ax, ay, ar, 0, Math.PI * 2); g.fill();
  g.fillStyle = c1;
  g.font = `600 92px ${sans}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(f.name.split(' ').map((w) => w[0]).join(''), ax, ay + 4);
  // name + role
  g.fillStyle = '#fff';
  g.font = `500 64px ${sans}`;
  g.fillText(f.name, W / 2, H * 0.66);
  g.font = `400 36px ${sans}`;
  g.fillStyle = 'rgba(255,255,255,.82)';
  g.fillText(`${f.role} · ${f.company}`, W / 2, H * 0.74);
  // offer pill
  const pill = `OFFER · ${f.pkg}`;
  g.font = `500 28px ${mono}`;
  const pw = g.measureText(pill).width + 56;
  g.fillStyle = 'rgba(255,255,255,.95)';
  roundRect(g, W / 2 - pw / 2, H * 0.82, pw, 60, 30); g.fill();
  g.fillStyle = c1;
  g.fillText(pill, W / 2, H * 0.82 + 31);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}
function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
