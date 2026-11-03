// 建筑细节升级：环境反射、幕墙肋条、腰线、LED 弹幕环带、裙楼、屋顶设备、入口台阶
import * as THREE from 'three';
import { RoomEnvironment } from '../lib/addons/environments/RoomEnvironment.js';
import { ctx, box, addCollider, std, glow } from './common.js';
import { TOWER } from './tower.js';
import { PINK, BLUE, FONT, drawTV } from './textures.js';

// ---------- PBR 环境贴图：让玻璃、金属有真实反射 ----------
export function setupEnvironment(renderer, scene) {
  const pm = new THREE.PMREMGenerator(renderer);
  const env = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = env;
  scene.environmentIntensity = 0.1;
  pm.dispose();
  return env;
}

// ---------- 幕墙竖向铝合金肋条（InstancedMesh，一次绘制数百根） ----------
function mullions(root) {
  const { W, D, lobbyH, top } = TOWER;
  const hw = W / 2, hd = D / 2, h = top - lobbyH - 2.2;
  const pts = [];
  const step = 2;
  for (let x = -hw + step; x < hw - 0.1; x += step) { pts.push([x, hd + 0.18, 0]); pts.push([x, -hd - 0.18, 0]); }
  for (let z = -hd + step; z < hd - 0.1; z += step) { pts.push([hw + 0.18, z, 1]); pts.push([-hw - 0.18, z, 1]); }
  const geo = new THREE.BoxGeometry(0.16, h, 0.36);
  const mat = new THREE.MeshStandardMaterial({ color: 0xe6ecf3, metalness: 0.85, roughness: 0.28 });
  const im = new THREE.InstancedMesh(geo, mat, pts.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3();
  const rotY = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
  pts.forEach(([a, b, side], i) => {
    if (side === 0) p.set(a, lobbyH + h / 2, b); else p.set(a, lobbyH + h / 2, b);
    if (side === 0) { p.set(a, lobbyH + h / 2, b); q.identity(); } else { p.set(a, lobbyH + h / 2, b); q.copy(rotY); }
    m.compose(p, q, s); im.setMatrixAt(i, m);
  });
  im.castShadow = true;
  root.add(im);
}

// ---------- 每 4 层一道发光腰线 + 每层细分隔 ----------
function perimeter(root, mat, w, d, t, h, y, out = 0.3) {
  // 外圈 4 根条，紧贴幕墙外侧，不侵入室内
  box(root, mat, w + 2 * out, h, t, 0, y, d / 2 + out - t / 2, { collide: false });
  box(root, mat, w + 2 * out, h, t, 0, y, -d / 2 - out + t / 2, { collide: false });
  box(root, mat, t, h, d + 2 * out, w / 2 + out - t / 2, y, 0, { collide: false });
  box(root, mat, t, h, d + 2 * out, -w / 2 - out + t / 2, y, 0, { collide: false });
}
function floorBands(root) {
  const { W, D, lobbyH, top, floors } = TOWER;
  const fh = (top - lobbyH) / floors;
  const thin = std(0xd9e1ea, { metalness: 0.7, roughness: 0.3 });
  const wide = std(0xf2f5f8, { metalness: 0.6, roughness: 0.25 });
  const accent = glow(BLUE, 0.4, 1.6);
  for (let f = 1; f < floors - 2; f++) {
    const y = lobbyH + f * fh;
    if (f % 4 === 0) {
      perimeter(root, wide, W, D, 0.5, 0.45, y - 0.22, 0.5);
      perimeter(root, accent, W, D, 0.08, 0.08, y - 0.3, 0.54);
    } else {
      perimeter(root, thin, W, D, 0.25, 0.12, y - 0.06, 0.25);
    }
  }
}

// ---------- 楼顶 LED 弹幕环带：四面连续滚动的弹幕 ----------
class LedRing {
  constructor() {
    const W = 2048, H = 128;
    this.c = document.createElement('canvas'); this.c.width = W; this.c.height = H;
    this.g = this.c.getContext('2d');
    this.tex = new THREE.CanvasTexture(this.c);
    this.tex.colorSpace = THREE.SRGBColorSpace; this.tex.wrapS = THREE.RepeatWrapping;
    this.words = ['bilibili', '你感兴趣的视频都在B站', '欢迎来到哔哩哔哩', 'BML · BW · 拜年纪'];
    this.draw(); this.off = 0;
  }
  draw() {
    const { g, c } = this;
    g.fillStyle = '#05060c'; g.fillRect(0, 0, c.width, c.height);
    // LED 点阵底纹
    g.fillStyle = 'rgba(255,255,255,0.05)';
    for (let x = 2; x < c.width; x += 6) for (let y = 2; y < c.height; y += 6) g.fillRect(x, y, 2, 2);
    g.font = `900 64px ${FONT}`; g.textBaseline = 'middle';
    let x = 30; let i = 0;
    while (x < c.width - 40) {
      if (i % 3 === 0) { drawTV(g, x + 34, 66, 52, i % 2 ? PINK : BLUE, 6); x += 90; }
      const w = this.words[i % this.words.length];
      g.fillStyle = ['#ffffff', PINK, '#7fd8ff', '#ffe17a'][i % 4];
      g.shadowColor = g.fillStyle; g.shadowBlur = 14;
      g.fillText(w, x, 66); x += g.measureText(w).width + 70; i++;
      g.shadowBlur = 0;
    }
    this.tex.needsUpdate = true;
  }
}

function ledRing(root) {
  const { W, D, top } = TOWER;
  const led = new LedRing();
  const y = top - 15.5, h = 3.2;
  const perim = 2 * (W + D);
  const mat = (u0, u1) => {
    const t = led.tex.clone(); t.needsUpdate = true;
    t.repeat.set((u1 - u0) / perim * 2.2, 1); t.offset.x = u0 / perim * 2.2;
    const m = new THREE.MeshBasicMaterial({ map: t, toneMapped: false });
    m.userData.base = t.offset.x; return m;
  };
  // 四面按周长连续展开，滚动时文字能“绕楼一圈”
  const faces = [
    [W, 0, hd(D) + 0.62, 0, 0, W],
    [D, W / 2 + 0.62, 0, Math.PI / 2, W, W + D],
    [W, 0, -D / 2 - 0.62, Math.PI, W + D, 2 * W + D],
    [D, -W / 2 - 0.62, 0, -Math.PI / 2, 2 * W + D, perim],
  ];
  const mats = [];
  for (const [w, x, z, ry, u0, u1] of faces) {
    const m = mat(u0, u1); mats.push(m);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
    mesh.position.set(x, y, z); mesh.rotation.y = ry; root.add(mesh);
  }
  // 灯带上下边框
  const frame = std(0x1a1d26, { metalness: 0.8, roughness: 0.3 });
  perimeter(root, frame, W, D, 0.75, 0.35, y + h / 2, 0.75);
  perimeter(root, frame, W, D, 0.75, 0.35, y - h / 2 - 0.35, 0.75);
  ctx.animators.push((dt) => { for (const m of mats) m.map.offset.x += dt * 0.035; });
}
const hd = (D) => D / 2;

// ---------- 裙楼与入口台阶：让塔楼“站”在一个基座上 ----------
function podium(root) {
  const { W, D } = TOWER;
  const stone = std(0xd7dbe2, { roughness: 0.55, metalness: 0.05 });
  const dark = std(0x2b3039, { roughness: 0.6 });
  // 外围石材基座（台阶三级）
  for (let i = 0; i < 3; i++) {
    const pad = 4 - i * 1.2;
    const y = i * 0.07;
    box(root, stone, W + pad * 2, 0.07, D + pad * 2, 0, y, 0, { collide: false, receive: true });
  }
  // 正门两侧石材立柱 + 品牌粉色竖向发光条
  const pinkGlow = new THREE.MeshBasicMaterial({ color: new THREE.Color(PINK).multiplyScalar(1.4), toneMapped: false });
  for (const x of [-9.6, 9.6]) {
    box(root, dark, 1.6, 9.4, 1.4, x, 0, D / 2 + 0.75, { cast: true });
    box(root, pinkGlow, 0.12, 8, 0.05, x + (x > 0 ? -0.82 : 0.82), 0.7, D / 2 + 1.46, { collide: false });
  }
  // 门头大字牌（雨棚上方横向发光字条）
  // 侧翼景观水景条
  const water = new THREE.MeshStandardMaterial({ color: 0x1f6f9a, emissive: 0x00AEEC, emissiveIntensity: 0.25, roughness: 0.05, metalness: 0.5 });
  for (const x of [-16, 16]) {
    box(root, stone, 12, 0.5, 3.2, x, 0, D / 2 + 3.2);
    const w = new THREE.Mesh(new THREE.BoxGeometry(11.2, 0.06, 2.4), water); w.position.set(x, 0.47, D / 2 + 3.2); root.add(w);
    ctx.nightMats.push({ mat: water, day: 0.08, night: 0.5 });
  }
  // 地面射灯：夜晚把塔楼底部“洗亮”
  const spotGeo = new THREE.CylinderGeometry(0.25, 0.3, 0.2, 12);
  const spotMat = glow(0xfff2dc, 0.2, 2.2);
  for (let x = -20; x <= 20; x += 5) {
    const s = new THREE.Mesh(spotGeo, spotMat); s.position.set(x, 0.1, D / 2 + 1.2); root.add(s);
  }
}

// ---------- 屋顶设备层：机房、冷却塔、停机坪标识 ----------
function rooftop(root) {
  const { top } = TOWER;
  const metal = std(0x9aa3ae, { metalness: 0.8, roughness: 0.35 });
  const darkM = std(0x3a404b, { metalness: 0.5, roughness: 0.5 });
  // 机房（后部，带百叶）
  box(root, std(0xe9edf2, { roughness: 0.4 }), 14, 4.5, 6, 13, top, -12.5, { cast: true });
  for (let i = 0; i < 8; i++) box(root, darkM, 12.6, 0.12, 0.08, 13, top + 0.6 + i * 0.45, -9.47, { collide: false });
  box(root, std(0xe9edf2), 14, 4.5, 6, -13, top, -12.5, { cast: true });
  // 冷却塔
  const tower = new THREE.CylinderGeometry(1.3, 1.5, 2.2, 20);
  const fanG = new THREE.CylinderGeometry(1.15, 1.15, 0.08, 20);
  const fans = [];
  for (const [x, z] of [[9.5, -12.5], [13, -12.5], [16.5, -12.5]]) {
    const t = new THREE.Mesh(tower, metal); t.position.set(x, top + 4.5 + 1.1, z); root.add(t);
    const f = new THREE.Mesh(fanG, darkM); f.position.set(x, top + 4.5 + 2.25, z); root.add(f); f.userData.dynamic = true; fans.push(f);
  }
  ctx.animators.push((dt) => fans.forEach((f, i) => { f.rotation.y += dt * (6 + i); }));
  // 太阳能板阵列（左机房顶）
  const panelM = new THREE.MeshStandardMaterial({ color: 0x1b2a4a, metalness: 0.6, roughness: 0.2 });
  for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.08, 1.8), panelM);
    p.position.set(-17.5 + i * 4.3, top + 4.9, -14 + j * 2.4); p.rotation.x = -0.3; root.add(p);
  }
}

// ---------- 夜间立面泛光：底部向上的柔和光锥 ----------
function uplights(root) {
  const { W, D } = TOWER;
  const tex = (() => {
    const c = document.createElement('canvas'); c.width = 64; c.height = 256;
    const g = c.getContext('2d'); const gr = g.createLinearGradient(0, 256, 0, 0);
    gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.25)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 256);
    const hg = g.createLinearGradient(0, 0, 64, 0);
    hg.addColorStop(0, 'rgba(0,0,0,1)'); hg.addColorStop(0.5, 'rgba(0,0,0,0)'); hg.addColorStop(1, 'rgba(0,0,0,1)');
    g.globalCompositeOperation = 'destination-out'; g.fillStyle = hg; g.fillRect(0, 0, 64, 256);
    return new THREE.CanvasTexture(c);
  })();
  const mats = [PINK, BLUE].map(c => new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(c), transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }));
  const geo = new THREE.PlaneGeometry(4.5, 26);
  for (let i = 0; i < 9; i++) {
    const x = -W / 2 + 2.5 + i * ((W - 5) / 8);
    const m = new THREE.Mesh(geo, mats[i % 2]); m.position.set(x, 23, D / 2 + 0.7); root.add(m);
    const m2 = m.clone(); m2.position.z = -D / 2 - 0.7; root.add(m2);
  }
  ctx.animators.push(() => { mats.forEach(m => m.opacity = ctx.isNight ? 0.28 : 0.0); });
}

export function buildTowerDetails(scene) {
  const root = new THREE.Group(); scene.add(root);
  mullions(root);
  floorBands(root);
  ledRing(root);
  podium(root);
  rooftop(root);
  uplights(root);
  return root;
}
