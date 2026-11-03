// 建筑 & 光影细节：地面倒影、射灯光锥、浮尘、显示器映光、路灯光斑、擦窗吊篮、楼顶光冠、旗帜、步道灯柱、航空灯
import * as THREE from 'three';
import { ctx, std, box, addCollider } from './common.js';
import { TOWER } from './tower.js';
import { PINK, BLUE, logo3DTexture, FONT } from './textures.js';
import { makePerson } from './people.js';
import { FLOOR_META } from './floorMeta.js';

const add = THREE.AdditiveBlending;
function gradTex(stops, w = 8, h = 128, radial = false) {
  const c = document.createElement('canvas'); c.width = radial ? 128 : w; c.height = radial ? 128 : h; const g = c.getContext('2d');
  const gr = radial ? g.createRadialGradient(64, 64, 0, 64, 64, 64) : g.createLinearGradient(0, 0, 0, h);
  stops.forEach(([o, a]) => gr.addColorStop(o, `rgba(255,255,255,${a})`));
  g.fillStyle = gr; g.fillRect(0, 0, c.width, c.height);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
}
const glowTex = gradTex([[0, 1], [0.35, 0.5], [1, 0]], 0, 0, true);
const fx = { night: [], day: [], tick: [] };
const nightOpacity = (m, base) => { m.userData.base = base; fx.night.push(m); return m; };
const dayOpacity = (m, base) => { m.userData.base = base; fx.day.push(m); return m; };

// ---------- 大堂：LED 巨幕在抛光地面上的倒影 ----------
export function lobbyReflection(root, ledTex) {
  const geo = new THREE.PlaneGeometry(17, 7.5);
  const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setY(i, 1 - uv.getY(i));
  const alpha = gradTex([[0, 0], [0.5, 0.25], [1, 0.9]]);
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: ledTex, alphaMap: alpha, transparent: true, opacity: 0.55, blending: add, depthWrite: false, toneMapped: false }));
  m.rotation.x = -Math.PI / 2; m.position.set(0, 0.214, -9.7 + 3.75); m.renderOrder = 3;
  root.add(m);
  // 吊灯环在地面的柔光倒影
  const ring = new THREE.Mesh(new THREE.RingGeometry(2.2, 4.2, 64), new THREE.MeshBasicMaterial({ map: glowTex, color: 0xffd9c0, transparent: true, opacity: 0.12, blending: add, depthWrite: false, toneMapped: false }));
  ring.rotation.x = -Math.PI / 2; ring.position.set(0, 0.215, -1.2); root.add(ring);
}

// ---------- 射灯光锥（体积感）+ 落点光斑 ----------
const coneAlpha = gradTex([[0, 0.45], [0.25, 0.14], [1, 0]]);
export function downlight(root, x, y, z, h, r = 1.1, color = 0xffe2c0, op = 0.09) {
  op *= 0.9;
  const cone = new THREE.Mesh(new THREE.ConeGeometry(r, h, 28, 1, true), new THREE.MeshBasicMaterial({ color, alphaMap: coneAlpha, transparent: true, opacity: op, blending: add, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
  cone.position.set(x, y - h / 2, z); cone.renderOrder = 4; root.add(cone);
  const pool = new THREE.Mesh(new THREE.CircleGeometry(r * 1.15, 28), new THREE.MeshBasicMaterial({ map: glowTex, color, transparent: true, opacity: op * 2.4, blending: add, depthWrite: false, toneMapped: false }));
  pool.rotation.x = -Math.PI / 2; pool.position.set(x, y - h + 0.02, z); pool.renderOrder = 3; root.add(pool);
  const lamp = new THREE.Mesh(new THREE.CircleGeometry(0.12, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(1.6), toneMapped: false }));
  lamp.rotation.x = Math.PI / 2; lamp.position.set(x, y - 0.01, z); root.add(lamp);
}
export function lobbyLights(root) {
  const y = 9.5;
  for (const z of [-6, -1, 4, 9]) downlight(root, 17.2, y, z, 9.3, 0.8, 0xffe6c8, 0.035);     // 历史展板（光锥落在展板前地面）
  downlight(root, -14, y, 6, 9.3, 1.4, 0xffe4d0, 0.045);                                     // 小电视雕塑
  for (const x of [12, 15.3, 18.6]) downlight(root, x, y, -13.2, 9.3, 0.8, 0xfff0dc, 0.04);  // 周边展柜
  for (const x of [-12, 12]) downlight(root, x, y, 12.5, 9.3, 1.2, 0xffe2c0, 0.05);          // 入口绿植
}

// ---------- 光束中的浮尘（白天/黄昏可见）----------
export function dustMotes(root, { x0 = -20, x1 = 20, y0 = 0.6, y1 = 9, z0 = -8, z1 = 15, n = 320 } = {}) {
  const pos = new Float32Array(n * 3), seed = new Float32Array(n);
  for (let i = 0; i < n; i++) { pos[i * 3] = x0 + Math.random() * (x1 - x0); pos[i * 3 + 1] = y0 + Math.random() * (y1 - y0); pos[i * 3 + 2] = z0 + Math.random() * (z1 - z0); seed[i] = Math.random() * 100; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const m = new THREE.PointsMaterial({ size: 0.045, map: glowTex, color: 0xfff2dc, transparent: true, opacity: 0.6, blending: add, depthWrite: false, toneMapped: false });
  const pts = new THREE.Points(g, m); pts.frustumCulled = false; root.add(pts);
  dayOpacity(m, 0.6);
  fx.tick.push((dt, t) => {
    if (!root.visible || m.opacity < 0.02) return;
    const p = ctx.player?.pos; if (p && (p.y > y1 + 2 || Math.abs(p.x) > 24)) return;
    for (let i = 0; i < n; i++) {
      const s = seed[i];
      pos[i * 3] += Math.sin(t * 0.21 + s) * 0.0025;
      pos[i * 3 + 1] += 0.0015 + Math.sin(t * 0.33 + s * 2) * 0.0015;
      pos[i * 3 + 2] += Math.cos(t * 0.17 + s) * 0.0025;
      if (pos[i * 3 + 1] > y1) pos[i * 3 + 1] = y0;
    }
    g.attributes.position.needsUpdate = true;
  });
}

// ---------- 办公区：显示器在桌面/人脸上的映光（实例化，一次绘制）----------
export function monitorGlow(root, y) {
  const spots = [];
  const cols = ['#cfe6ff', '#ff9ccc', '#7fa8ff', '#b48cff'];
  let n = 0;
  for (const cx of [-15, -7, 7, 15]) for (const cz of [-3, 4, 11]) for (const side of [-1, 1]) for (const ox of [-1.4, 1.4]) spots.push([cx + ox, cz + side * 0.62, cols[n++ % 4]]);
  const im = new THREE.InstancedMesh(new THREE.PlaneGeometry(1.2, 0.7), new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, opacity: 0.55, blending: add, depthWrite: false, toneMapped: false }), spots.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2), c = new THREE.Color();
  spots.forEach(([x, z, col], i) => { m4.compose(new THREE.Vector3(x, y + 0.78, z), q, new THREE.Vector3(1, 1, 1)); im.setMatrixAt(i, m4); im.setColorAt(i, c.set(col)); });
  im.renderOrder = 3; root.add(im);
}

// ---------- 夜间路灯在地面的暖色光斑 ----------
export function streetLightPools(scene) {
  const spots = ctx.lampSpots || [];
  if (!spots.length) return;
  const mat = new THREE.MeshBasicMaterial({ map: glowTex, color: 0xffc98a, transparent: true, opacity: 0.4, blending: add, depthWrite: false, toneMapped: false });
  const im = new THREE.InstancedMesh(new THREE.PlaneGeometry(10, 10), mat, spots.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2), one = new THREE.Vector3(1, 1, 1);
  spots.forEach(([x, z], i) => { m4.compose(new THREE.Vector3(x, 0.06, z), q, one); im.setMatrixAt(i, m4); });
  im.renderOrder = 3; scene.add(im);
  nightOpacity(mat, 0.4);
  // 主楼底部夜间泛光在地面的反射
  const base = new THREE.Mesh(new THREE.PlaneGeometry(TOWER.W + 10, 14), new THREE.MeshBasicMaterial({ map: gradTex([[0, 0], [1, 0.8]]), color: 0xff9cc0, transparent: true, opacity: 0.25, blending: add, depthWrite: false, toneMapped: false }));
  base.rotation.x = -Math.PI / 2; base.position.set(0, 0.07, TOWER.D / 2 + 7); scene.add(base);
  nightOpacity(base.material, 0.22);
}

// ---------- 擦窗吊篮（沿主楼南立面缓慢升降）----------
export function gondola(scene) {
  const g = new THREE.Group(); g.userData.dynamic = true; scene.add(g);
  const z = TOWER.D / 2 + 1.95, x = 8;
  const steel = std(0xc9ced6, { metalness: 0.8, roughness: 0.35 }), yellow = std(0xffc21a, { roughness: 0.6 });
  const basket = new THREE.Group(); g.add(basket);
  const floor = new THREE.Mesh(new THREE.BoxGeometry(6, 0.12, 0.9), steel); basket.add(floor);
  for (const sz of [-0.42, 0.42]) { const rail = new THREE.Mesh(new THREE.BoxGeometry(6, 0.06, 0.06), yellow); rail.position.set(0, 1.0, sz); basket.add(rail); const mid = rail.clone(); mid.position.y = 0.5; basket.add(mid); }
  for (const sx of [-2.95, -1, 1, 2.95]) for (const sz of [-0.42, 0.42]) { const post = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.0, 0.05), yellow); post.position.set(sx, 0.5, sz); basket.add(post); }
  for (const sx of [-2.6, 2.6]) { const hoist = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.5), std(0x2a2f38)); hoist.position.set(sx, 0.31, 0); basket.add(hoist); }
  // 两名工人（黄色背心）
  const workers = [];
  for (const [sx, seed] of [[-1.2, 41], [1.4, 77]]) {
    const w = makePerson(seed, { top: 0xffc21a, bottom: 0x2a3550, bag: false });
    w.root.position.set(sx, 0.06, 0.05); w.root.rotation.y = Math.PI; w.root.scale.multiplyScalar(0.98);
    basket.add(w.root); workers.push(w);
  }
  // 屋顶吊臂 + 钢缆
  const top = TOWER.top;
  for (const sx of [-2.6, 2.6]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 3.6), steel); arm.position.set(x + sx, top + 1.5, z - 1.6); scene.add(arm);
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.25, 1.6, 0.25), steel); post.position.set(x + sx, top + 0.8, z - 3.2); scene.add(post);
  }
  const cableM = new THREE.MeshBasicMaterial({ color: 0x2a2e36 });
  const cables = [-2.6, 2.6].map(sx => { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1, 4), cableM); c.position.x = x + sx; c.position.z = z; g.add(c); return c; });
  basket.position.set(x, 60, z);
  let t0 = 0, dir = 1, y = 60, pause = 0;
  fx.tick.push((dt, t) => {
    if (pause > 0) { pause -= dt; for (const w of workers) { w.arms[0].sh.rotation.set(-2.2 + Math.sin(t * 4) * 0.5, 0, 0.3); w.arms[0].el.rotation.x = -0.4; } }
    else { y += dir * dt * 0.55; if (y > 106 || y < 24) { dir *= -1; pause = 6; } if (Math.random() < 0.002) pause = 4; }
    basket.position.y = y;
    for (const c of cables) { const h = top + 1.5 - (y + 0.3); c.scale.y = h; c.position.y = y + 0.3 + h / 2; }
  });
}

// ---------- 楼顶光冠：竖向金属鳍 + 顶部发光线 ----------
export function crown(scene) {
  const { W, D, top } = TOWER; const hw = W / 2 + 0.35, hd = D / 2 + 0.35, H = 4.2;
  const pts = [];
  for (let x = -hw; x <= hw + 0.01; x += 2.2) { pts.push([x, hd]); pts.push([x, -hd]); }
  for (let z = -hd + 2.2; z < hd - 0.1; z += 2.2) { pts.push([hw, z]); pts.push([-hw, z]); }
  const im = new THREE.InstancedMesh(new THREE.BoxGeometry(0.14, H, 0.5), std(0x2a3340, { metalness: 0.85, roughness: 0.3 }), pts.length);
  const m4 = new THREE.Matrix4();
  pts.forEach(([x, z], i) => { m4.makeTranslation(x, top + H / 2, z); im.setMatrixAt(i, m4); });
  scene.add(im);
  const lineM = new THREE.MeshBasicMaterial({ color: new THREE.Color(BLUE).multiplyScalar(1.4), toneMapped: false });
  for (const [w, d, x, z] of [[W + 0.9, 0.1, 0, hd], [W + 0.9, 0.1, 0, -hd], [0.1, D + 0.9, hw, 0], [0.1, D + 0.9, -hw, 0]]) box(scene, lineM, w, 0.1, d, x, top + H, z, { collide: false });
  // 鳍片内侧夜间向上洗光
  const wash = new THREE.MeshBasicMaterial({ map: gradTex([[0, 0], [1, 0.9]]), color: 0x7fd0ff, transparent: true, opacity: 0.35, blending: add, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
  for (const [w, x, z, ry] of [[W, 0, hd + 0.05, 0], [W, 0, -hd - 0.05, 0], [D, hw + 0.05, 0, Math.PI / 2], [D, -hw - 0.05, 0, Math.PI / 2]]) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, H), wash); p.position.set(x, top + H / 2, z); p.rotation.y = ry; scene.add(p);
  }
  nightOpacity(wash, 0.35);
}

// ---------- 入口旗帜（飘动）+ 步道灯柱 ----------
function flagTex(kind) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 384; const g = c.getContext('2d');
  g.fillStyle = kind === 0 ? PINK : kind === 1 ? BLUE : '#ffffff'; g.fillRect(0, 0, 256, 384);
  g.fillStyle = kind === 2 ? PINK : '#ffffff'; g.font = 'italic 900 58px "Arial Black",Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.save(); g.translate(128, 192); g.rotate(-Math.PI / 2); g.fillText('bilibili', 0, 0); g.restore();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
export function flagsAndBollards(scene) {
  const pole = std(0xd8dde4, { metalness: 0.9, roughness: 0.25 });
  const flags = [];
  [-20, -23.5, -27].forEach((x, i) => {
    const z = 25;
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 10, 10), pole); p.position.set(x, 5, z); scene.add(p);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8), pole); ball.position.set(x, 10.05, z); scene.add(ball);
    addCollider(x - 0.1, 0, z - 0.1, x + 0.1, 10, z + 0.1);
    const geo = new THREE.PlaneGeometry(2.0, 3.0, 12, 6);
    const f = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: flagTex(i), side: THREE.DoubleSide, roughness: 0.85 }));
    f.position.set(x + 1.02, 8.3, z); f.castShadow = true; scene.add(f);
    flags.push({ f, base: geo.attributes.position.array.slice(), ph: i * 1.3 });
  });
  fx.tick.push((dt, t) => {
    for (const { f, base, ph } of flags) {
      const a = f.geometry.attributes.position;
      for (let i = 0; i < a.count; i++) {
        const bx = base[i * 3], by = base[i * 3 + 1], u = (bx + 1) / 2;
        a.array[i * 3 + 2] = Math.sin(t * 3.2 + u * 4 + ph + by * 0.4) * 0.22 * u;
        a.array[i * 3 + 1] = by - u * u * 0.12;
      }
      a.needsUpdate = true; f.geometry.computeVertexNormals();
    }
  });
  // 步道灯柱：顶部发光环，夜间更亮
  const spots = [];
  for (let z = 22; z <= 86; z += 8) { if (z > 43 && z < 61) continue; spots.push([-6.4, z], [6.4, z]); }
  const body = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.12, 0.14, 0.9, 12), std(0x2a2f38, { metalness: 0.7, roughness: 0.35 }), spots.length);
  const capM = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xfff0d8).multiplyScalar(1.4), toneMapped: false });
  const cap = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.125, 0.125, 0.08, 12), capM, spots.length);
  const pool = new THREE.InstancedMesh(new THREE.PlaneGeometry(2.2, 2.2), new THREE.MeshBasicMaterial({ map: glowTex, color: 0xffe0b0, transparent: true, opacity: 0.35, blending: add, depthWrite: false, toneMapped: false }), spots.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2), one = new THREE.Vector3(1, 1, 1);
  spots.forEach(([x, z], i) => {
    m4.makeTranslation(x, 0.45, z); body.setMatrixAt(i, m4);
    m4.makeTranslation(x, 0.86, z); cap.setMatrixAt(i, m4);
    m4.compose(new THREE.Vector3(x, 0.07, z), q, one); pool.setMatrixAt(i, m4);
    addCollider(x - 0.14, 0, z - 0.14, x + 0.14, 0.9, z + 0.14);
  });
  scene.add(body, cap, pool);
  nightOpacity(pool.material, 0.35);
}

// ---------- 副楼顶部航空障碍灯 ----------
export function beacons(scene) {
  const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff2a2a).multiplyScalar(1.6), toneMapped: false });
  const geo = new THREE.SphereGeometry(0.35, 10, 8);
  const list = [];
  for (const [x, z, w, d, h] of [[-49, -18, 27, 27, 80], [47, -24, 30, 28, 64]]) for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const b = new THREE.Mesh(geo, m); b.position.set(x + sx * (w / 2), h + 0.9, z + sz * (d / 2)); scene.add(b); list.push(b);
  }
  fx.tick.push((dt, t) => { const on = (t % 1.6) < 0.25; for (const b of list) b.visible = on; });
}

// ---------- 统一：昼夜因子 f（0 白天 · 0.55 黄昏 · 1 夜晚）----------
export function setDetailTime(f) {
  for (const m of fx.night) m.opacity = m.userData.base * THREE.MathUtils.smoothstep(f, 0.3, 1);
  for (const m of fx.day) m.opacity = m.userData.base * (1 - THREE.MathUtils.smoothstep(f, 0.6, 1));
}
export function tickDetails(dt, t) { for (const f of fx.tick) f(dt, t); }

// ---------- 主楼幕墙夜间“活”起来：窗户随时间逐个亮灭 ----------
// 在幕墙 emissive 贴图之上叠一层动态窗格贴图（canvas），夜间每秒随机点亮/熄灭若干格
export function livingWindows(scene) {
  const { W, D, lobbyH, top } = TOWER;
  const cols = 22, rows = 30, cW = 512, cH = 1024;
  const c = document.createElement('canvas'); c.width = cW; c.height = cH; const g = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const state = new Uint8Array(cols * rows);
  const cw = cW / cols, rh = cH / rows;
  const warm = ['#ffd9a0', '#fff1d8', '#ffe2b0', '#bfe6ff', '#ffc2d8'];
  const paint = (i) => {
    const x = (i % cols) * cw, y = Math.floor(i / cols) * rh;
    g.clearRect(x, y, cw, rh);
    if (state[i]) { g.fillStyle = warm[i % warm.length]; g.globalAlpha = 0.55 + (i % 7) * 0.06; g.fillRect(x + cw * 0.14, y + rh * 0.2, cw * 0.72, rh * 0.58); g.globalAlpha = 1; }
  };
  for (let i = 0; i < state.length; i++) { state[i] = Math.random() < 0.07 ? 1 : 0; paint(i); }
  tex.needsUpdate = true;
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.55, blending: add, depthWrite: false, toneMapped: false });
  const h = top - lobbyH - 2;
  for (const [w, x, z, ry] of [[W, 0, D / 2 + 0.05, 0], [W, 0, -D / 2 - 0.05, Math.PI], [D, W / 2 + 0.05, 0, Math.PI / 2], [D, -W / 2 - 0.05, 0, -Math.PI / 2]]) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(x, lobbyH + h / 2, z); m.rotation.y = ry; m.renderOrder = 2; scene.add(m);
  }
  nightOpacity(mat, 0.55);
  let acc = 0;
  fx.tick.push((dt) => {
    if (mat.opacity < 0.05) return;
    acc += dt; if (acc < 0.6) return; acc = 0;
    for (let k = 0; k < 6; k++) { const i = (Math.random() * state.length) | 0; state[i] ^= 1; paint(i); }
    tex.needsUpdate = true;
  });
}

// ---------- 主楼在园区地面的“湿润”倒影（夜间更明显）----------
export function towerGroundReflection(scene) {
  const { W, D } = TOWER;
  const c = document.createElement('canvas'); c.width = 256; c.height = 512; const g = c.getContext('2d');
  // 竖向彩色光带（对应立面霓虹 / 楼层腰线 / LED 环）
  const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, 'rgba(255,255,255,0.7)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  for (let x = 0; x < 256; x += 12) { g.fillStyle = `rgba(${x % 36 ? '255,214,170' : '127,208,255'},${0.12 + Math.random() * 0.25})`; g.fillRect(x, 0, 5, 512); }
  g.globalCompositeOperation = 'destination-in'; g.fillStyle = gr; g.fillRect(0, 0, 256, 512);
  const t = new THREE.CanvasTexture(c);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(W, 22), new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: 0.35, blending: add, depthWrite: false, toneMapped: false }));
  m.rotation.x = -Math.PI / 2; m.position.set(0, 0.065, D / 2 + 11 + 3); scene.add(m);
  nightOpacity(m.material, 0.35);
}

// ---------- 大堂天花：水面焦散般缓慢流动的光纹（来自入口水景）----------
export function lobbyCaustics(root) {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, 256, 256);
  g.strokeStyle = 'rgba(180,230,255,0.55)'; g.lineWidth = 2;
  for (let i = 0; i < 40; i++) { g.beginPath(); let x = Math.random() * 256, y = Math.random() * 256; g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (Math.random() - 0.5) * 70; y += (Math.random() - 0.5) * 70; g.quadraticCurveTo(x + 20, y - 20, x, y); } g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 2);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(26, 9), new THREE.MeshBasicMaterial({ map: t, alphaMap: gradTex([[0, 0], [0.3, 1], [1, 0]]), transparent: true, opacity: 0.18, blending: add, depthWrite: false, toneMapped: false }));
  m.rotation.x = Math.PI / 2; m.position.set(0, 9.5, 11.2); root.add(m);
  fx.tick.push((dt, tt) => { if (!root.visible) return; t.offset.x = Math.sin(tt * 0.12) * 0.15; t.offset.y = tt * 0.02; });
}

// ---------- 副楼：楼梯间竖向夜灯 + 雨棚下沿灯带 ----------
export function stairwells(scene) {
  const strips = [];
  for (const [x, z, w, d, h] of [[-49, -18, 27, 27, 80], [47, -24, 30, 28, 64]]) {
    const g = new THREE.Mesh(new THREE.PlaneGeometry(1.6, h - 10), new THREE.MeshBasicMaterial({ map: gradTex([[0, 0.9], [0.5, 0.6], [1, 0.9]]), color: 0xbfe8ff, transparent: true, opacity: 0.6, blending: add, depthWrite: false, toneMapped: false }));
    g.position.set(x + w / 2 - 3, h / 2 + 2, z + d / 2 + 0.08); scene.add(g); strips.push(g.material);
    nightOpacity(g.material, 0.55);
  }
  // 楼梯间里的“台阶光点”：从下往上滚动
  const dots = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xfff2d8).multiplyScalar(1.4), toneMapped: false });
  fx.tick.push((dt, t) => { for (const m of strips) m.map.offset.y = (t * 0.05) % 1; });
}

// ---------- 地面 LED 引导条：从园区入口流向大楼正门（夜间）----------
export function guideFlow(scene) {
  const c = document.createElement('canvas'); c.width = 16; c.height = 256; const g = c.getContext('2d');
  for (let y = 0; y < 256; y += 32) { const gr = g.createLinearGradient(0, y, 0, y + 32); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.7, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, y, 16, 32); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 12);
  const mat = new THREE.MeshBasicMaterial({ map: t, color: new THREE.Color(PINK).multiplyScalar(1.6), transparent: true, opacity: 0.9, blending: add, depthWrite: false, toneMapped: false });
  for (const x of [-5.4, 5.4]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 74), mat); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.1, TOWER.D / 2 + 40); scene.add(m); }
  nightOpacity(mat, 0.9);
  fx.tick.push((dt, tt) => { t.offset.y = (tt * 0.6) % 1; });
}

// ---------- 主楼西立面：外挂观光电梯（玻璃井道 + 运行中的轿厢）----------
export function sightseeingLift(scene) {
  const { W, D, top } = TOWER;
  const x = -W / 2 - 2.4, z = 4;
  const steel = std(0x2a3340, { metalness: 0.85, roughness: 0.3 });
  const glassM = new THREE.MeshStandardMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0.18, metalness: 0.8, roughness: 0.05, depthWrite: false, side: THREE.DoubleSide });
  // 井道框架
  for (const [dx, dz] of [[-1.4, -1.4], [1.4, -1.4], [-1.4, 1.4], [1.4, 1.4]]) box(scene, steel, 0.22, top + 2, 0.22, x + dx, 0, z + dz, { collide: false });
  for (let yy = 4; yy < top; yy += 4) { box(scene, steel, 3.0, 0.12, 0.12, x, yy, z + 1.4, { collide: false }); box(scene, steel, 0.12, 0.12, 3.0, x - 1.4, yy, z, { collide: false }); }
  const shaft = new THREE.Mesh(new THREE.BoxGeometry(2.8, top, 2.8), glassM); shaft.position.set(x, top / 2, z); scene.add(shaft);
  addCollider(x - 1.5, 0, z - 1.5, x + 1.5, top, z + 1.5);
  // 轿厢
  const cab = new THREE.Group(); cab.userData.dynamic = true; scene.add(cab);
  const cabGlass = new THREE.MeshStandardMaterial({ color: 0xdff4ff, transparent: true, opacity: 0.32, metalness: 0.6, roughness: 0.05, depthWrite: false, side: THREE.DoubleSide });
  const shell = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.6, 2.2), cabGlass); shell.position.y = 1.3; cab.add(shell);
  box(cab, std(0xe9edf2, { metalness: 0.6 }), 2.3, 0.18, 2.3, 0, 0, 0, { collide: false });
  box(cab, std(0xe9edf2, { metalness: 0.6 }), 2.3, 0.18, 2.3, 0, 2.6, 0, { collide: false });
  const lampM = new THREE.MeshBasicMaterial({ color: new THREE.Color(PINK).multiplyScalar(1.6), toneMapped: false });
  box(cab, lampM, 2.32, 0.05, 2.32, 0, 2.58, 0, { collide: false });
  box(cab, lampM, 2.32, 0.05, 2.32, 0, 0.16, 0, { collide: false });
  // 车厢里的两个乘客剪影
  for (const [sx, seed] of [[-0.4, 11], [0.45, 29]]) { const p = makePerson(seed, { bag: false }); p.root.position.set(sx, 0.18, 0); p.root.rotation.y = -Math.PI / 2; cab.add(p.root); }
  const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1, 6), new THREE.MeshBasicMaterial({ color: 0x1a1d24 })); cable.position.x = x; cable.position.z = z; scene.add(cable);
  cab.position.set(x, 0.2, z);
  const stops = FLOOR_META.map(f => f.y);
  let i = 0, target = 3, wait = 2, yy = 0.2;
  fx.tick.push((dt) => {
    if (wait > 0) { wait -= dt; return; }
    const ty = stops[target], dir = Math.sign(ty - yy), sp = Math.min(6, 1 + Math.abs(ty - yy) * 0.8);
    yy += dir * Math.min(Math.abs(ty - yy), sp * dt);
    if (Math.abs(ty - yy) < 0.01) { yy = ty; i = target; target = (Math.random() * stops.length) | 0; wait = 3 + Math.random() * 3; }
    cab.position.y = yy;
    const h = top + 2 - (yy + 2.7); cable.scale.y = Math.max(0.1, h); cable.position.y = yy + 2.7 + h / 2;
  });
}

// ---------- 主楼东立面：竖向楼层导视带（每层一块发光铭牌）----------
export function floorRibbon(scene) {
  const { W, D, lobbyH } = TOWER;
  const x = W / 2 + 0.45, z = D / 2 - 3;
  for (const f of FLOOR_META) {
    if (f.key === 'lobby') continue;
    const c = document.createElement('canvas'); c.width = 256; c.height = 96; const g = c.getContext('2d');
    g.fillStyle = 'rgba(10,12,18,0.85)'; g.fillRect(0, 0, 256, 96);
    g.fillStyle = f.color; g.fillRect(0, 0, 10, 96);
    g.font = '900 46px "Arial Black",Arial'; g.fillStyle = f.color; g.textBaseline = 'middle'; g.fillText(f.num, 22, 48);
    g.font = `800 26px ${FONT}`; g.fillStyle = '#fff'; g.fillText(f.short.slice(0, 6), 116, 48);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.MeshBasicMaterial({ map: t, toneMapped: false, transparent: true });
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 1.6), m); pl.position.set(x, f.y + 2.1, z); pl.rotation.y = Math.PI / 2; scene.add(pl);
  }
}

// ---------- 主楼立面灯光秀（夜间）：以窗格为像素，循环播放 4 种图案 ----------
export function facadeShow(scene) {
  const { W, D, lobbyH, top } = TOWER;
  const h = top - lobbyH - 20;   // 留出顶部 LED 环带与招牌
  const mat = new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 }, uOp: { value: 0 }, uCols: { value: 22 }, uRows: { value: 24 }, uPink: { value: new THREE.Color(PINK) }, uBlue: { value: new THREE.Color(BLUE) } },
    transparent: true, depthWrite: false, blending: add, toneMapped: false,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `
      uniform float uT, uOp, uCols, uRows; uniform vec3 uPink, uBlue; varying vec2 vUv;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5); }
      void main(){
        vec2 g = vec2(vUv.x * uCols, vUv.y * uRows); vec2 cell = floor(g); vec2 f = fract(g);
        float win = step(0.12, f.x) * step(f.x, 0.88) * step(0.18, f.y) * step(f.y, 0.8);   // 窗格形状
        vec2 c = (cell + 0.5) / vec2(uCols, uRows);
        float cyc = mod(uT, 40.0), m = floor(cyc / 10.0), k = fract(cyc / 10.0);
        float v = 0.0;
        if (m < 0.5) v = smoothstep(0.12, 0.0, abs(c.y - fract(uT * 0.08)));                         // 光带自下而上
        else if (m < 1.5) v = smoothstep(0.18, 0.0, abs(fract(c.x * 0.6 + c.y * 0.9 - uT * 0.12) - 0.5) - 0.32); // 斜向扫光
        else if (m < 2.5) { float hh = hash(cell + floor(uT * 2.0)); v = step(0.86, hh); }                     // 星点闪烁
        else { vec2 d = (c - vec2(0.5, 0.45)) * vec2(1.3, 1.0); float r = length(d); v = smoothstep(0.05, 0.0, abs(r - fract(uT * 0.15) * 0.8)); } // 同心波纹
        float fade = smoothstep(0.0, 0.08, k) * smoothstep(1.0, 0.92, k);
        vec3 col = mix(uPink, uBlue, c.x * 0.6 + c.y * 0.4 + 0.2 * sin(uT * 0.3));
        gl_FragColor = vec4(col * 1.6, v * win * fade * uOp);
      }`,
  });
  const faces = [[W, 0, D / 2 + 0.07, 0], [W, 0, -D / 2 - 0.07, Math.PI], [D, W / 2 + 0.07, 0, Math.PI / 2], [D, -W / 2 - 0.07, 0, -Math.PI / 2]];
  for (const [w, x, z, ry] of faces) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(x, lobbyH + h / 2, z); m.rotation.y = ry; m.renderOrder = 3; scene.add(m); }
  fx.tick.push((dt, t) => { mat.uniforms.uT.value = t; mat.uniforms.uOp.value += ((ctx.nightF > 0.5 ? 0.55 : ctx.nightF > 0.3 ? 0.2 : 0) - mat.uniforms.uOp.value) * Math.min(1, dt * 2); });
}

// ---------- 入口上方：弹幕 LED 横幅（复用大堂弹幕巨幕画面）----------
export function entranceLED(scene, ledTex) {
  const { W, D, lobbyH } = TOWER;
  const z = D / 2 + 0.36, w = W - 6, h = 2.6, y = lobbyH - 2.4;
  box(scene, std(0x111318, { metalness: 0.6, roughness: 0.4 }), w + 0.4, h + 0.4, 0.3, 0, y - h / 2 - 0.2, z - 0.15, { collide: false });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: ledTex, toneMapped: false, color: 0xdddddd }));
  m.position.set(0, y, z + 0.01); scene.add(m);
  const edge = new THREE.MeshBasicMaterial({ color: new THREE.Color(PINK).multiplyScalar(1.5), toneMapped: false });
  box(scene, edge, w + 0.4, 0.06, 0.06, 0, y + h / 2 + 0.17, z + 0.02, { collide: false });
  box(scene, edge, w + 0.4, 0.06, 0.06, 0, y - h / 2 - 0.23, z + 0.02, { collide: false });
}

// ---------- 主楼转角竖向 LED 屏：竖排文字自上而下滚动 ----------
export function cornerBanner(scene) {
  const { W, D, lobbyH } = TOWER;
  const c = document.createElement('canvas'); c.width = 128; c.height = 2048; const g = c.getContext('2d');
  const bg = g.createLinearGradient(0, 0, 0, 2048); bg.addColorStop(0, '#1a0f2a'); bg.addColorStop(1, '#0b1a2e'); g.fillStyle = bg; g.fillRect(0, 0, 128, 2048);
  const lines = ['哔哩哔哩', '你感兴趣的视频都在B站', '干杯', '一键三连'];
  let y = 40; g.textAlign = 'center'; g.font = `900 84px ${FONT}`;
  for (let k = 0; y < 2000; k++) {
    const t = lines[k % lines.length]; g.fillStyle = k % 2 ? '#7fd8ff' : '#ffffff'; g.shadowColor = g.fillStyle; g.shadowBlur = 16;
    for (const ch of t) { g.fillText(ch, 64, y + 70); y += 92; if (y > 1980) break; }
    g.shadowBlur = 0; g.fillStyle = PINK; g.fillRect(34, y + 10, 60, 10); y += 60;
  }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapT = THREE.RepeatWrapping;
  const h = 46, x = -W / 2 + 2.2, z = D / 2 + 0.42;
  box(scene, std(0x111318, { metalness: 0.6 }), 3.2, h + 0.6, 0.3, x, lobbyH + 1.7, z - 0.16, { collide: false });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(2.8, h), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })); m.position.set(x, lobbyH + 2 + h / 2, z + 0.01); scene.add(m);
  tex.repeat.set(1, h / 2.8 / (2048 / 128));
  fx.tick.push((dt, t) => { tex.offset.y = (t * 0.02) % 1; });
}
