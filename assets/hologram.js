// JARVIS hologram — the app's orb and the 3D face, rotatable and zoomable.
// three.js r160 from jsdelivr (see the import map in each page).
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const WHITE = 0xffffff;

function glowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d");
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, "rgba(255,255,255,1)");
  grd.addColorStop(0.25, "rgba(255,255,255,.55)");
  grd.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function lineMat(opacity) {
  return new THREE.LineBasicMaterial({ color: WHITE, transparent: true, opacity,
    blending: THREE.AdditiveBlending, depthWrite: false });
}

function ring(radius, opacity, segments = 160) {
  const pts = [];
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius));
  }
  return new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineMat(opacity));
}

function ticks(radius, count, len, opacity) {
  const pos = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
    pos.push(c * radius, 0, s * radius, c * radius, len, s * radius);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  return new THREE.LineSegments(g, lineMat(opacity));
}

function particles(count, rMin, rMax, size, tex) {
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r = rMin + Math.random() * (rMax - rMin);
    const th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
    pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
    pos[i * 3 + 1] = r * Math.cos(ph) * 0.8;
    pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  return new THREE.Points(g, new THREE.PointsMaterial({ size, map: tex, color: WHITE, transparent: true,
    opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false }));
}

// ── the orb, as drawn in the app ───────────────────────────────────────────
function buildOrb(tex) {
  const g = new THREE.Group();
  const sphere = new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.SphereGeometry(0.62, 22, 14)), lineMat(0.32));
  g.add(sphere);
  const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: WHITE, transparent: true,
    blending: THREE.AdditiveBlending, depthWrite: false }));
  core.scale.set(1.5, 1.5, 1);
  g.add(core);
  const orbits = [];
  [[1.05, 0.55, 0.0], [1.15, -0.4, 0.9], [0.92, 1.2, -0.5]].forEach(([r, tx, tz], i) => {
    const o = ring(r, 0.5 - i * 0.08);
    o.rotation.set(tx, 0, tz);
    o.scale.set(1, 1, i === 1 ? 0.55 : 1);
    orbits.push(o);
    g.add(o);
  });
  const base = new THREE.Group();
  base.position.y = -1.05;
  [1.25, 1.0, 0.72, 0.46].forEach((r, i) => base.add(ring(r, 0.55 - i * 0.1)));
  base.add(ticks(1.25, 72, 0.12, 0.35));
  g.add(base);
  g.add(particles(260, 1.4, 2.6, 0.06, tex));
  g.userData.tick = (t) => {
    sphere.rotation.y = t * 0.25;
    core.material.opacity = 0.75 + Math.sin(t * 2.2) * 0.2;
    orbits.forEach((o, i) => (o.rotation.y = t * (0.35 + i * 0.18) * (i % 2 ? -1 : 1)));
    base.rotation.y = -t * 0.1;
  };
  return g;
}

// ── the face: MediaPipe canonical mesh as a point cloud with a scan line ──
async function buildFace(tex, url) {
  const g = new THREE.Group();
  const text = await (await fetch(url)).text();
  const v = [], edges = new Set();
  for (const line of text.split("\n")) {
    if (line.startsWith("v ")) {
      const [, x, y, z] = line.trim().split(/\s+/).map(Number);
      v.push(x, y, z);
    } else if (line.startsWith("f ")) {
      const ids = line.trim().split(/\s+/).slice(1).map((s) => parseInt(s, 10) - 1);
      for (let i = 0; i < ids.length; i++) {
        const a = ids[i], b = ids[(i + 1) % ids.length];
        edges.add(a < b ? `${a}_${b}` : `${b}_${a}`);
      }
    }
  }
  const box = new THREE.Box3().setFromArray(v);
  const center = box.getCenter(new THREE.Vector3());
  const s = 1.7 / Math.max(...box.getSize(new THREE.Vector3()).toArray());
  const pos = new Float32Array(v.length);
  for (let i = 0; i < v.length; i += 3) {
    pos[i] = (v[i] - center.x) * s;
    pos[i + 1] = (v[i + 1] - center.y) * s;
    pos[i + 2] = (v[i + 2] - center.z) * s;
  }
  const pg = new THREE.BufferGeometry();
  pg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(pg, new THREE.PointsMaterial({ size: 0.045, map: tex, color: WHITE, transparent: true,
    blending: THREE.AdditiveBlending, depthWrite: false }));
  g.add(pts);
  const lp = [];
  edges.forEach((k) => {
    const [a, b] = k.split("_").map(Number);
    lp.push(pos[a * 3], pos[a * 3 + 1], pos[a * 3 + 2], pos[b * 3], pos[b * 3 + 1], pos[b * 3 + 2]);
  });
  const lg = new THREE.BufferGeometry();
  lg.setAttribute("position", new THREE.Float32BufferAttribute(lp, 3));
  const wire = new THREE.LineSegments(lg, lineMat(0.16));
  g.add(wire);
  const scan = ring(1.0, 0.7, 120);
  scan.scale.set(0.95, 1, 0.75);
  g.add(scan);
  const halo = new THREE.Group();
  halo.position.y = -1.15;
  [1.15, 0.85].forEach((r, i) => halo.add(ring(r, 0.5 - i * 0.15)));
  halo.add(ticks(1.15, 60, 0.1, 0.3));
  g.add(halo);
  g.add(particles(160, 1.5, 2.6, 0.05, tex));
  g.userData.tick = (t) => {
    const y = Math.sin(t * 0.9) * 0.85;
    scan.position.y = y;
    scan.material.opacity = 0.45 + 0.3 * Math.cos(t * 0.9);
    wire.material.opacity = 0.12 + 0.06 * Math.sin(t * 1.7);
    halo.rotation.y = t * 0.15;
  };
  return g;
}

export async function mountHologram(container, { faceUrl, mode = "orb", modeButtons } = {}) {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  container.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 0.3, 4.7);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, -0.2, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.minDistance = 1.8;          // zoom in close
  controls.maxDistance = 7.5;          // and back out
  controls.autoRotate = !reduce;
  controls.autoRotateSpeed = 0.8;
  controls.zoomSpeed = 0.8;

  const tex = glowTexture();
  const models = { orb: buildOrb(tex) };
  let current = null;
  async function show(name) {
    if (!models[name] && name === "face") models.face = await buildFace(tex, faceUrl);
    if (current) scene.remove(current);
    current = models[name];
    scene.add(current);
    (modeButtons || []).forEach((b) => b.classList.toggle("on", b.dataset.mode === name));
  }
  (modeButtons || []).forEach((b) => b.addEventListener("click", () => show(b.dataset.mode)));
  await show(mode);

  function resize() {
    const r = container.getBoundingClientRect();
    renderer.setSize(r.width, r.height, false);
    camera.aspect = r.width / Math.max(1, r.height);
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(container);
  resize();

  let visible = true;
  new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(container);
  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    if (!visible) return;
    const t = reduce ? 0 : clock.getElapsedTime();
    current?.userData.tick?.(t);
    controls.update();
    renderer.render(scene, camera);
  });
}
