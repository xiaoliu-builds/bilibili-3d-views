// 园区外的开放城市：四大主题街区 + 通用互动系统 + 共享单车 + 地标发现
import * as THREE from 'three';
import { RoundedBoxGeometry } from '../lib/addons/RoundedBoxGeometry.js';
import { ctx, box, addCollider, std, glow, plane, tree } from './common.js';
import { textTexture, logo3DTexture, drawTV, roundRect, tileTexture, PINK, BLUE, FONT } from './textures.js';

// ======================================================================
// 通用互动注册表：任何物体都可以注册成“靠近 → 提示 → 按 E 执行”
// ======================================================================
export const interactables = [];
/**
 * @param {object} o
 *  pos: Vector3, r: 半径, label: 提示文字, icon: emoji
 *  action: (api) => void   api 由 main.js 注入（toast / openInfo / sit / ride / teleport…）
 *  once: 只能触发一次；cooldown: 冷却秒数
 */
export function interactable(o) { o._cd = 0; o.cooldown = o.cooldown || 0; interactables.push(o); }

// 地标发现（走进范围自动解锁，计入“城市探索度”）
export const landmarks = [];
function landmark(name, x, z, r = 18, desc = '') { landmarks.push({ name, desc, pos: new THREE.Vector3(x, 0, z), r, found: false }); }

// 共享单车停放点
export const bikeDocks = [];

function label3D(parent, text, x, y, z, ry = 0, size = 1.2, { color = '#ffffff', bg = 'rgba(16,20,30,0.85)' } = {}) {
  const t = textTexture(text, { size: 56, color, stroke: null, bg, pad: 20 });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size * t.aspect, size), new THREE.MeshBasicMaterial({ map: t.tex, transparent: true, side: THREE.DoubleSide, toneMapped: false }));
  m.position.set(x, y, z); m.rotation.y = ry; parent.add(m);
  return m;
}

// ======================================================================
// 城市家具：红绿灯、斑马线、路灯、公交站、行道树
// ======================================================================
const lightState = { t: 0, phase: 0 }; // 0: 南北绿 1: 南北黄 2: 东西绿 3: 东西黄
export const traffic = lightState;
function trafficLight(root, x, z, ry, axis) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; root.add(g);
  const pole = std(0x2a2f38, { metalness: 0.6, roughness: 0.4 });
  box(g, pole, 0.25, 5.2, 0.25, 0, 0, 0, { collide: false });
  box(g, pole, 0.2, 0.2, 3.2, 0, 5.0, 1.5, { collide: false });
  box(g, std(0x15181e), 0.6, 1.7, 0.55, 0, 4.2, 3.0, { collide: false });
  const lamps = ['#ff3b3b', '#ffcc33', '#33e07a'].map((c, i) => {
    const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(c), toneMapped: false });
    const s = new THREE.Mesh(new THREE.CircleGeometry(0.17, 16), m); s.position.set(0, 4.75 - i * 0.52, 3.29); g.add(s); s.userData.dynamic = true;
    return m;
  });
  addCollider(x - 0.2, 0, z - 0.2, x + 0.2, 5, z + 0.2);
  const base = lamps.map(m => m.color.clone());
  ctx.animators.push(() => {
    const ns = lightState.phase === 0 ? 2 : lightState.phase === 1 ? 1 : 0; // 南北方向灯
    const ew = lightState.phase === 2 ? 2 : lightState.phase === 3 ? 1 : 0;
    const on = axis === 'ns' ? ns : ew;
    lamps.forEach((m, i) => m.color.copy(base[i]).multiplyScalar(i === on ? 2.2 : 0.12));
  });
}
function crosswalk(root, cx, cz, alongX) {
  const m = std(0xeef0f4, { roughness: 0.85 });
  for (let i = -5; i <= 5; i++) {
    if (alongX) box(root, m, 0.9, 0.025, 7, cx + i * 1.6, 0.01, cz, { collide: false });
    else box(root, m, 7, 0.025, 0.9, cx, 0.01, cz + i * 1.6, { collide: false });
  }
}
function cityFurniture(root) {
  // 主干道交叉口：(±100, ±100) 四个路口 + 园区门口对应的 (0,±100)(±100,0)
  for (const x of [-100, 100]) for (const z of [-100, 100]) {
    trafficLight(root, x - 7, z - 7, 0, 'ns');
    trafficLight(root, x + 7, z + 7, Math.PI, 'ns');
    trafficLight(root, x + 7, z - 7, -Math.PI / 2, 'ew');
    trafficLight(root, x - 7, z + 7, Math.PI / 2, 'ew');
    crosswalk(root, x, z - 9, true); crosswalk(root, x, z + 9, true);
    crosswalk(root, x - 9, z, false); crosswalk(root, x + 9, z, false);
  }
  // 园区四个出口正对的过街斑马线
  crosswalk(root, 0, 100, true); crosswalk(root, 0, -100, true); crosswalk(root, 100, 0, false); crosswalk(root, -100, 0, false);
  // 行道树 + 路灯（沿 ±100 主干道两侧人行道）
  const poleM = std(0x3a3f48, { metalness: 0.7, roughness: 0.4 });
  const headM = glow(0xfff1d6, 0.15, 1.4);
  const poleG = new THREE.CylinderGeometry(0.1, 0.14, 6, 8), headG = new THREE.SphereGeometry(0.32, 10, 8);
  for (let t = -280; t <= 280; t += 28) {
    for (const r of [-100, 100]) for (const side of [-1, 1]) {
      if (Math.abs(t) < 16 || Math.abs(Math.abs(t) - 100) < 16) continue;
      const off = r + side * 11;
      // 沿 X 方向的道路（z = r）
      tree(root, t, off, 1.0, 0, true);
      // 沿 Z 方向的道路（x = r）
      tree(root, off, t + 14, 1.0, 0, true);
      if ((t / 28) % 2 === 0) {
        for (const [px, pz] of [[t + 14, r + side * 9], [r + side * 9, t]]) {
          const p = new THREE.Mesh(poleG, poleM); p.position.set(px, 3, pz); root.add(p); (ctx.lampSpots ||= []).push([px, pz]);
          const h = new THREE.Mesh(headG, headM); h.position.set(px, 6.1, pz); root.add(h);
        }
      }
    }
  }
}

// ======================================================================
// 南：商业步行街（0, 200）
// ======================================================================
function shopStreet(root, api) {
  const cz = 200;
  // 石材铺装
  box(root, std(0x8f8478, { roughness: 0.9 }), 30, 0.04, 170, 0, 0, cz, { collide: false, receive: true });
  label3D(root, '哔哩步行街', 0, 9.5, 116, 0, 2.2, { color: '#ffffff', bg: 'rgba(251,114,153,0.92)' });
  box(root, std(0xffffff), 0.8, 9, 0.8, -14, 0, 116); box(root, std(0xffffff), 0.8, 9, 0.8, 14, 0, 116);
  box(root, new THREE.MeshBasicMaterial({ color: new THREE.Color(PINK).multiplyScalar(1.3), toneMapped: false }), 29, 0.4, 0.6, 0, 8.2, 116, { collide: false });
  // 两侧连排商铺（3 层小楼）
  const fac = [0xe8ddd0, 0xd7e4ef, 0xf0d9de, 0xdfe8d6, 0xe9e2f2];
  const names = ['会员购', '干杯奶茶', '手办屋', '漫画书店', 'B站周边', '拉面屋', '电玩城', '甜品铺', '咖啡馆', '花店'];
  for (let i = 0; i < 5; i++) for (const side of [-1, 1]) {
    const z = 130 + i * 30, x = side * 30, idx = i * 2 + (side > 0 ? 1 : 0);
    const h = 11 + (idx % 3) * 3;
    box(root, std(fac[idx % 5], { roughness: 0.8 }), 26, h, 26, x, 0, z + 10, { cast: true });
    // 店面：橱窗 + 招牌
    const shopC = document.createElement('canvas'); shopC.width = 512; shopC.height = 256;
    const g = shopC.getContext('2d');
    const gr = g.createLinearGradient(0, 70, 0, 256); gr.addColorStop(0, 'rgba(255,224,170,0.4)'); gr.addColorStop(1, 'rgba(255,214,150,0.95)');
    g.fillStyle = '#1a2230'; g.fillRect(0, 0, 512, 256); g.fillStyle = gr; g.fillRect(20, 80, 472, 170);
    g.fillStyle = 'rgba(30,36,48,0.7)'; for (let k = 1; k < 4; k++) g.fillRect(20 + k * 118, 80, 4, 170);
    g.fillStyle = [PINK, BLUE, '#ffb027', '#7a5cff', '#2ec27e'][idx % 5]; roundRect(g, 20, 12, 472, 58, 12); g.fill();
    g.fillStyle = '#fff'; g.font = `900 40px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(names[idx], 256, 42);
    const tex = new THREE.CanvasTexture(shopC); tex.colorSpace = THREE.SRGBColorSpace;
    const face = new THREE.Mesh(new THREE.PlaneGeometry(20, 10), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
    face.position.set(x - side * 13.05, 5, z + 10); face.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2; root.add(face);
    // 雨棚
    const aw = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.15, 20), std([PINK, BLUE, '#ffb027', '#7a5cff', '#2ec27e'][idx % 5], { roughness: 0.8 }));
    aw.position.set(x - side * 14.1, 10.4, z + 10); aw.rotation.z = side * 0.18; root.add(aw);
    // 店铺互动
    interactable({
      pos: new THREE.Vector3(x - side * 15.5, 0, z + 10), r: 3.2, icon: '🛍️', label: `逛逛「${names[idx]}」`,
      action: (a) => a.shop(names[idx]),
    });
  }
  // 中央：外摆座椅、遮阳伞、花坛
  for (let i = 0; i < 4; i++) {
    const z = 140 + i * 34;
    const umb = new THREE.Mesh(new THREE.ConeGeometry(2.2, 0.9, 12), std(i % 2 ? PINK : BLUE, { roughness: 0.8 }));
    umb.position.set(-5, 3.1, z); root.add(umb);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.8, 8), std(0xdddddd)); pole.position.set(-5, 1.4, z); root.add(pole);
    const tbl = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.06, 18), std(0xffffff)); tbl.position.set(-5, 0.75, z); root.add(tbl);
    addCollider(-5.8, 0, z - 0.8, -4.2, 0.8, z + 0.8);
    interactable({ pos: new THREE.Vector3(-5, 0, z + 1.4), r: 1.6, icon: '🪑', label: '坐下歇会儿', action: (a) => a.sit(new THREE.Vector3(-5, 0, z + 1.2), Math.PI) });
    box(root, std(0xd6d0c6), 4, 0.6, 4, 5, 0, z + 10);
    tree(root, 5, z + 10, 0.9, 0.6, false);
  }
  // —— 自动售货机 ——
  const vm = new THREE.Group(); vm.position.set(11, 0, 122); root.add(vm);
  box(vm, std(0xf2f4f7, { roughness: 0.3 }), 1.8, 2.6, 1.0, 0, 0, 0, { collide: false });
  const vmScreen = document.createElement('canvas'); vmScreen.width = 256; vmScreen.height = 320;
  const vg = vmScreen.getContext('2d'); vg.fillStyle = '#0c1a2a'; vg.fillRect(0, 0, 256, 320);
  const cols = ['#ff5a5a', '#ffb027', '#2ec27e', '#00AEEC', '#FB7299', '#9b6bff'];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { vg.fillStyle = cols[(r + c) % 6]; roundRect(vg, 16 + c * 58, 18 + r * 66, 40, 52, 10); vg.fill(); vg.fillStyle = 'rgba(255,255,255,0.4)'; vg.fillRect(22 + c * 58, 24 + r * 66, 8, 40); }
  vg.fillStyle = PINK; vg.font = `900 22px ${FONT}`; vg.textAlign = 'center'; vg.fillText('干杯饮料', 128, 300);
  const vt = new THREE.CanvasTexture(vmScreen); vt.colorSpace = THREE.SRGBColorSpace;
  plane(vm, new THREE.MeshBasicMaterial({ map: vt, toneMapped: false }), 1.5, 1.9, 0, 1.55, -0.51, Math.PI);
  addCollider(10.1, 0, 121.5, 11.9, 2.6, 122.5);
  interactable({ pos: new THREE.Vector3(11, 0, 120.6), r: 1.8, icon: '🥤', label: '买一瓶饮料（1 硬币）', action: (a) => a.vending() });
  // —— 街头歌手 ——
  const singer = makeSimplePerson(0x1f2a44, 0xffd166);
  singer.position.set(-11, 0, 170); singer.rotation.y = Math.PI / 2; root.add(singer); singer.userData.dynamic = true;
  const guitar = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.9, 0.4), std(0x9a5a2a)); guitar.position.set(0.15, 1.15, 0.25); guitar.rotation.z = 0.6; singer.add(guitar);
  const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.12, 14, 1, true), std(0x3a2a1a, { side: THREE.DoubleSide })); hat.position.set(-10, 0.06, 170); root.add(hat);
  addCollider(-11.4, 0, 169.6, -10.6, 1.9, 170.4);
  ctx.animators.push((dt, t) => { singer.rotation.z = Math.sin(t * 3) * 0.04; guitar.rotation.z = 0.6 + Math.sin(t * 9) * 0.05; });
  interactable({ pos: new THREE.Vector3(-9.6, 0, 170), r: 2.2, icon: '🎸', label: '听一首街头弹唱', action: (a) => a.busker() });
  // —— 撸猫 ——
  const cat = makeCat(0xf2a65a); cat.position.set(9, 0, 185); root.add(cat); cat.userData.dynamic = true;
  ctx.animators.push((dt, t) => { cat.userData.tail.rotation.z = Math.sin(t * 4) * 0.5; cat.position.y = Math.abs(Math.sin(t * 1.2)) * 0.02; });
  interactable({ pos: new THREE.Vector3(9, 0, 185), r: 1.6, icon: '🐱', label: '撸一下橘猫', action: (a) => a.pet(cat) });
  landmark('哔哩步行街', 0, 200, 40, '十家临街小店，奶茶、手办、漫画一条街逛完。');
}

// ======================================================================
// 东：城市公园 + 摩天轮 + 湖（200, 0）
// ======================================================================
function cityPark(root) {
  const cx = 200;
  box(root, std(0x5a9a5c, { roughness: 1 }), 170, 0.08, 170, cx, 0, 0, { collide: false, receive: true });
  // 环形步道
  const path = new THREE.Mesh(new THREE.RingGeometry(52, 58, 64), std(0xcfc6b6, { roughness: 0.9, side: THREE.DoubleSide }));
  path.rotation.x = -Math.PI / 2; path.position.set(cx, 0.09, 0); root.add(path);
  box(root, std(0xcfc6b6, { roughness: 0.9 }), 6, 0.09, 30, cx - 70, 0, 0, { collide: false });
  // 湖
  const lake = new THREE.Mesh(new THREE.CircleGeometry(30, 48), new THREE.MeshStandardMaterial({ color: 0x2a6d92, roughness: 0.08, metalness: 0.4, emissive: 0x0a2a40, emissiveIntensity: 0.3 }));
  lake.rotation.x = -Math.PI / 2; lake.position.set(cx + 20, 0.1, 20); root.add(lake);
  addCollider(cx - 6, 0, -6, cx + 46, 0.5, 46);
  // 小船
  const boat = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.5, 1.1), std(0xffffff)); boat.position.set(cx + 20, 0.3, 20); root.add(boat); boat.userData.dynamic = true;
  const swan = new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 10), std(0xffffff)); swan.position.set(0.8, 0.55, 0); boat.add(swan);
  ctx.animators.push((dt, t) => { boat.position.set(cx + 20 + Math.cos(t * 0.15) * 16, 0.3, 20 + Math.sin(t * 0.15) * 16); boat.rotation.y = -t * 0.15; });
  // 树林
  for (let i = 0; i < 46; i++) {
    const a = i / 46 * Math.PI * 2, r = 64 + (i % 3) * 6;
    tree(root, cx + Math.cos(a) * r, Math.sin(a) * r, 1.2 + (i % 4) * 0.2, 0.08);
  }
  // —— 摩天轮 ——
  const wheel = new THREE.Group(); wheel.position.set(cx - 30, 0, -30); root.add(wheel); wheel.userData.dynamic = true;
  const R = 22, hub = R + 4;
  const steel = std(0xe8ecf2, { metalness: 0.8, roughness: 0.3 });
  for (const sx of [-1.4, 1.4]) {
    for (const lean of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.55, hub + 1, 8), steel);
      leg.position.set(sx, hub / 2, lean * 7); leg.rotation.x = -lean * 0.27; wheel.add(leg);
    }
  }
  addCollider(cx - 32, 0, -38, cx - 28, 6, -22);
  const rim = new THREE.Group(); rim.position.y = hub; wheel.add(rim);
  const ringM = new THREE.MeshBasicMaterial({ color: new THREE.Color(PINK).multiplyScalar(1.3), toneMapped: false });
  for (const sx of [-1, 1]) { const ring = new THREE.Mesh(new THREE.TorusGeometry(R, 0.22, 8, 64), ringM); ring.rotation.y = Math.PI / 2; ring.position.x = sx; rim.add(ring); }
  const spokeG = new THREE.CylinderGeometry(0.08, 0.08, R * 2, 6);
  for (let i = 0; i < 12; i++) { const sp = new THREE.Mesh(spokeG, steel); sp.rotation.x = i * Math.PI / 12; rim.add(sp); }
  const cabins = [];
  const cabG = new RoundedBoxGeometry(2.2, 2.0, 2.0, 3, 0.4);
  const cabCols = [PINK, BLUE, '#ffd166', '#7fd8a0', '#c49bff', '#ff8a5c'];
  for (let i = 0; i < 16; i++) {
    const a = i / 16 * Math.PI * 2;
    const cab = new THREE.Mesh(cabG, std(cabCols[i % 6], { roughness: 0.4, emissive: cabCols[i % 6], emissiveIntensity: 0.25 }));
    cab.userData.a = a; rim.add(cab); cabins.push(cab);
  }
  // 灯光：夜间轮缘随时间流动
  ctx.animators.push((dt, t) => {
    rim.rotation.x = -t * 0.06;
    for (const c of cabins) { const a = c.userData.a; c.position.set(0, Math.cos(a) * R, Math.sin(a) * R); c.rotation.x = t * 0.06; }
    ringM.color.setHSL((t * 0.05) % 1, 0.8, 0.6).multiplyScalar(ctx.isNight ? 1.6 : 1);
  });
  ctx.ferris = { wheel, rim, cabins, hub, R, base: new THREE.Vector3(cx - 30, 0, -30) };
  // 售票亭
  box(root, std(0xffffff), 3, 2.6, 2.2, cx - 30, 0, -12);
  label3D(root, '摩天轮 · 30 元', cx - 30, 3.4, -10.85, 0, 0.7, { bg: 'rgba(251,114,153,0.92)' });
  interactable({ pos: new THREE.Vector3(cx - 30, 0, -9.6), r: 2.2, icon: '🎡', label: '乘坐摩天轮（约 40 秒）', action: (a) => a.ferris() });
  // 长椅可坐
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI * 2 + 0.3, r = 61;
    const x = cx + Math.cos(a) * r, z = Math.sin(a) * r;
    const bench = new THREE.Group(); bench.position.set(x, 0, z); bench.rotation.y = -a + Math.PI / 2; root.add(bench);
    box(bench, std(0x8d6b4f), 2.6, 0.12, 0.7, 0, 0.45, 0, { collide: false });
    box(bench, std(0x8d6b4f), 2.6, 0.6, 0.1, 0, 0.75, -0.32, { collide: false });
    addCollider(x - 1, 0, z - 1, x + 1, 0.9, z + 1);
    const seat = new THREE.Vector3(x - Math.cos(a) * 1.0, 0, z - Math.sin(a) * 1.0);
    interactable({ pos: seat, r: 1.8, icon: '🪑', label: '在长椅上发会儿呆', action: (ap) => ap.sit(seat.clone(), Math.atan2(Math.cos(a), Math.sin(a)) + Math.PI) });
  }
  // 喂鸽子
  const pigeons = [];
  for (let i = 0; i < 9; i++) { const p = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), std(0x8a8f99)); p.scale.set(1, 0.8, 1.4); p.position.set(cx - 60 + (i % 3) * 0.8, 0.2, 8 + Math.floor(i / 3) * 0.8); root.add(p); p.userData.dynamic = true; pigeons.push(p); }
  ctx.animators.push((dt, t) => pigeons.forEach((p, i) => { p.position.y = 0.2 + Math.max(0, Math.sin(t * 6 + i)) * 0.06; }));
  interactable({ pos: new THREE.Vector3(cx - 59, 0, 9), r: 2.4, icon: '🕊️', label: '撒点面包屑喂鸽子', action: (a) => a.pigeons(pigeons) });
  label3D(root, '东方城市公园', cx - 80, 4.5, 0, Math.PI / 2, 1.6, { bg: 'rgba(46,140,80,0.9)' });
  landmark('东方城市公园', cx, 0, 60, '湖心小船、摩天轮和成片的树林。');
  landmark('哔哩摩天轮', cx - 30, -30, 26, '高约 48 米，夜里轮缘会变色。');
}

// ======================================================================
// 西：地铁站 + 共享单车（-200, 0）
// ======================================================================
function metro(root) {
  const cx = -200;
  box(root, std(0x9aa1ab, { roughness: 0.85 }), 170, 0.04, 170, cx, 0, 0, { collide: false, receive: true });
  // 地铁出入口（玻璃顶棚 + 下行台阶）
  const st = new THREE.Group(); st.position.set(cx + 40, 0, 0); st.rotation.y = Math.PI / 2; root.add(st);
  const glassM = new THREE.MeshStandardMaterial({ color: 0xa8d6f0, transparent: true, opacity: 0.35, metalness: 0.8, roughness: 0.05, depthWrite: false });
  box(st, std(0x2a3340, { metalness: 0.7 }), 0.3, 1.2, 10, -4, 0, 0, { collide: true });
  box(st, glassM, 0.08, 2.4, 10, -4, 1.2, 0, { collide: false });
  box(st, std(0x2a3340, { metalness: 0.7 }), 0.3, 1.2, 10, 4, 0, 0, { collide: true });
  box(st, glassM, 0.08, 2.4, 10, 4, 1.2, 0, { collide: false });
  box(st, glassM, 8.6, 0.2, 10.6, 0, 3.6, 0, { collide: false });
  box(st, std(0x30353f), 7.4, 0.1, 9, 0, 0.01, 0, { collide: false });
  for (let i = 0; i < 8; i++) box(st, std(0xc8ccd3), 7.2, 0.06, 0.12, 0, 0.06, -3.6 + i * 1.0, { collide: false });
  // 地铁 M 标志
  const sign = new THREE.Group(); sign.position.set(cx + 34, 0, 7); root.add(sign);
  box(sign, std(0xd0d5dc, { metalness: 0.8 }), 0.2, 4.6, 0.2, 0, 0, 0, { collide: false });
  const mC = document.createElement('canvas'); mC.width = mC.height = 256; const mg = mC.getContext('2d');
  mg.fillStyle = '#e60012'; mg.beginPath(); mg.arc(128, 128, 120, 0, Math.PI * 2); mg.fill();
  mg.fillStyle = '#fff'; mg.font = `900 150px Arial`; mg.textAlign = 'center'; mg.textBaseline = 'middle'; mg.fillText('M', 128, 138);
  const mt = new THREE.CanvasTexture(mC); mt.colorSpace = THREE.SRGBColorSpace;
  const disk = new THREE.Mesh(new THREE.CircleGeometry(0.9, 32), new THREE.MeshBasicMaterial({ map: mt, side: THREE.DoubleSide, toneMapped: false }));
  disk.position.set(0, 5.4, 0); sign.add(disk);
  addCollider(cx + 33.8, 0, 6.8, cx + 34.2, 4.6, 7.2);
  label3D(root, '地铁 12 号线 · 哔哩站', cx + 40, 4.6, 5.4, Math.PI / 2, 0.8, { bg: 'rgba(230,0,18,0.9)' });
  interactable({ pos: new THREE.Vector3(cx + 40, 0, 0), r: 3.4, icon: '🚇', label: '乘坐地铁（快速出行）', action: (a) => a.metro() });
  // 公交站
  const bus = new THREE.Group(); bus.position.set(cx + 60, 0, -40); root.add(bus);
  box(bus, std(0x2a3340, { metalness: 0.6 }), 6, 0.2, 2.4, 0, 3, 0, { collide: false });
  box(bus, glassM, 6, 2.6, 0.1, 0, 0.3, -1.1, { collide: false });
  box(bus, std(0x9aa3ae), 4, 0.1, 0.6, 0, 0.5, -0.6, { collide: false });
  addCollider(cx + 57, 0, -41.3, cx + 63, 3, -40.6);
  label3D(root, '公交 B12 路', cx + 60, 3.6, -38.8, 0, 0.6, { bg: 'rgba(0,174,236,0.9)' });
  // 共享单车停放点（若干辆）
  dockBikes(root, cx + 58, 18, 6);
  dockBikes(root, -14, 104, 4);   // 园区南门外
  dockBikes(root, 104, 14, 4);    // 园区东门外
  dockBikes(root, 14, -104, 4);   // 园区北门外
  label3D(root, '哔哩地铁站', cx + 78, 4.5, 0, Math.PI / 2, 1.6, { bg: 'rgba(230,0,18,0.9)' });
  landmark('地铁 12 号线 · 哔哩站', cx + 40, 0, 22, '可以从这里乘地铁快速到达各个街区。');
  // 西区居民楼
  const fac = [0xe8ddd0, 0xd7dbe2, 0xf0e4d6];
  for (let i = 0; i < 6; i++) {
    const x = cx - 50 + (i % 2) * 50, z = -60 + Math.floor(i / 2) * 60, h = 30 + (i * 7) % 24;
    box(root, std(fac[i % 3], { roughness: 0.85 }), 28, h, 22, x, 0, z, { cast: true });
    // 阳台条
    for (let f = 1; f < h / 3.2; f++) box(root, std(0xffffff), 28.6, 0.25, 1.2, x, f * 3.2, z + 11.4, { collide: false });
  }
}

// —— 共享单车 ——
let bikeGeo = null;
export function makeBike(color = BLUE) {
  const g = new THREE.Group();
  const frameM = std(color, { metalness: 0.4, roughness: 0.4 });
  const tireM = std(0x15171c, { roughness: 0.8 });
  bikeGeo = bikeGeo || { wheel: new THREE.TorusGeometry(0.34, 0.05, 8, 24), tube: new THREE.CylinderGeometry(0.03, 0.03, 1, 6) };
  for (const z of [-0.55, 0.55]) { const w = new THREE.Mesh(bikeGeo.wheel, tireM); w.position.set(0, 0.36, z); w.rotation.y = Math.PI / 2; g.add(w); }
  const tube = (x1, y1, z1, x2, y2, z2) => {
    const a = new THREE.Vector3(x1, y1, z1), b = new THREE.Vector3(x2, y2, z2);
    const m = new THREE.Mesh(bikeGeo.tube, frameM); m.position.copy(a).lerp(b, 0.5);
    m.scale.y = a.distanceTo(b); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()); g.add(m);
  };
  tube(0, 0.36, -0.55, 0, 0.75, -0.1); tube(0, 0.75, -0.1, 0, 0.8, 0.45); tube(0, 0.36, 0.55, 0, 0.8, 0.45);
  tube(0, 0.36, -0.55, 0, 0.36, 0.0); tube(0, 0.36, 0.0, 0, 0.75, -0.1);
  tube(-0.25, 1.0, 0.5, 0.25, 1.0, 0.5); tube(0, 0.8, 0.45, 0, 1.0, 0.5);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.06, 0.28), std(0x222222)); seat.position.set(0, 0.86, -0.12); g.add(seat);
  const basket = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.2, 0.26), std(0xdddddd, { metalness: 0.5 })); basket.position.set(0, 0.92, 0.66); g.add(basket);
  return g;
}
function dockBikes(root, x, z, n) {
  for (let i = 0; i < n; i++) {
    const b = makeBike(i % 2 ? BLUE : PINK); b.position.set(x + i * 0.9, 0, z); root.add(b); b.userData.dynamic = true;
    const dock = { bike: b, home: new THREE.Vector3(x + i * 0.9, 0, z), inUse: false };
    bikeDocks.push(dock);
    interactable({
      pos: dock.home, r: 1.4, icon: '🚲', label: '扫码骑共享单车', get disabled() { return dock.inUse; },
      action: (a) => a.rideBike(dock),
    });
  }
  box(root, std(0x2ec27e), n * 0.9 + 0.6, 0.02, 1.6, x + (n - 1) * 0.45, 0, z, { collide: false });
}

// ======================================================================
// 北：BW 漫展中心（0, -200）
// ======================================================================
function expoCenter(root) {
  const cz = -200;
  const expoTile = tileTexture({ base: '#8f97a6', line: '#7b8392', n: 4, noise: 0.06 }); expoTile.repeat.set(40, 40);
  box(root, std(0xffffff, { map: expoTile, roughness: 0.85 }), 170, 0.04, 170, 0, 0, cz, { collide: false, receive: true });
  box(root, std(0xFB7299, { roughness: 0.8 }), 8, 0.05, 80, 0, 0, cz + 52, { collide: false });
  // 穹顶场馆
  const dome = new THREE.Mesh(new THREE.SphereGeometry(42, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0xdfe8f2, metalness: 0.6, roughness: 0.25, envMapIntensity: 2 }));
  dome.scale.y = 0.55; dome.position.set(0, 4, cz - 25); dome.castShadow = true; root.add(dome);
  // 穹顶横向肋
  for (let i = 1; i < 6; i++) {
    const r = 42 * Math.cos(i * 0.26), y = 4 + 42 * 0.55 * Math.sin(i * 0.26);
    const rib = new THREE.Mesh(new THREE.TorusGeometry(r, 0.18, 6, 64), std(0x9aa3ae, { metalness: 0.8 })); rib.rotation.x = Math.PI / 2; rib.position.set(0, y, cz - 25); root.add(rib);
  }
  box(root, std(0xd5dbe3), 88, 4, 88, 0, 0, cz - 25, { collide: true });
  // 入口大屏 BW
  const bwC = document.createElement('canvas'); bwC.width = 1024; bwC.height = 384; const bg = bwC.getContext('2d');
  const gg = bg.createLinearGradient(0, 0, 1024, 384); gg.addColorStop(0, '#ff6fa3'); gg.addColorStop(0.5, '#7a5cff'); gg.addColorStop(1, '#00AEEC');
  bg.fillStyle = gg; bg.fillRect(0, 0, 1024, 384);
  bg.fillStyle = '#fff'; bg.font = `italic 900 150px "Arial Black",Arial`; bg.textAlign = 'center'; bg.fillText('BILIBILI WORLD', 512, 200);
  bg.font = `700 54px ${FONT}`; bg.fillText('二次元文化盛会 · 今日开展', 512, 300);
  const bwt = new THREE.CanvasTexture(bwC); bwt.colorSpace = THREE.SRGBColorSpace;
  plane(root, new THREE.MeshBasicMaterial({ map: bwt, toneMapped: false }), 32, 12, 0, 12, cz + 19.1);
  box(root, std(0x1a1d26), 33, 13, 0.6, 0, 5.5, cz + 18.7, { collide: false });
  // 展位帐篷 + 旗帜
  const tentCols = [PINK, BLUE, '#ffd166', '#7a5cff', '#2ec27e', '#ff8a5c'];
  const booths = ['原神', '手办', '同人本', 'Cos 摄影', '痛包', '抽卡机'];
  booths.forEach((n, i) => {
    const x = -50 + i * 20, z = cz + 40;
    const roof = new THREE.Mesh(new THREE.ConeGeometry(5.2, 2.6, 4), std(tentCols[i], { roughness: 0.7 }));
    roof.rotation.y = Math.PI / 4; roof.position.set(x, 4.6, z); root.add(roof);
    for (const [px, pz] of [[-3.4, -3.4], [3.4, -3.4], [-3.4, 3.4], [3.4, 3.4]]) box(root, std(0xffffff), 0.15, 3.3, 0.15, x + px, 0, z + pz, { collide: false });
    box(root, std(0xffffff), 5, 1, 1.2, x, 0, z - 2.8);
    label3D(root, n, x, 3.1, z + 3.6, 0, 0.7, { bg: tentCols[i] });
    if (n === '抽卡机') interactable({ pos: new THREE.Vector3(x, 0, z), r: 3.2, icon: '🎴', label: '抽一张 BW 限定卡', action: (a) => a.gacha() });
    else interactable({ pos: new THREE.Vector3(x, 0, z), r: 3.2, icon: '🎪', label: `逛「${n}」展位`, action: (a) => a.shop(n + ' 展位') });
  });
  // 旗帜（飘动）
  const flags = [];
  for (let i = 0; i < 10; i++) {
    const x = -60 + i * 13.3, z = cz + 60;
    box(root, std(0xd0d5dc, { metalness: 0.7 }), 0.15, 8, 0.15, x, 0, z, { collide: false });
    const f = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 3, 1, 6), std(tentCols[i % 6], { side: THREE.DoubleSide, roughness: 0.8 }));
    f.position.set(x + 0.75, 6.2, z); root.add(f); f.userData.dynamic = true; flags.push(f);
  }
  ctx.animators.push((dt, t) => flags.forEach((f, i) => { f.rotation.y = Math.sin(t * 2 + i) * 0.35; }));
  // Coser NPC
  const coser = makeSimplePerson(0xffffff, 0x8ad8ff, 0x9fe3ff);
  coser.position.set(12, 0, cz + 28); coser.rotation.y = Math.PI; root.add(coser); coser.userData.dynamic = true;
  const wand = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.2, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(PINK).multiplyScalar(1.5), toneMapped: false }));
  wand.position.set(0.35, 1.4, 0.2); wand.rotation.z = -0.6; coser.add(wand);
  addCollider(11.6, 0, cz + 27.6, 12.4, 1.9, cz + 28.4);
  ctx.animators.push((dt, t) => { wand.rotation.z = -0.6 + Math.sin(t * 2.5) * 0.4; });
  interactable({ pos: new THREE.Vector3(12, 0, cz + 29.8), r: 2.2, icon: '📸', label: '和 Coser 合影', action: (a) => a.coser() });
  label3D(root, 'BW 漫展中心', 0, 6, cz + 78, 0, 1.8, { bg: 'rgba(122,92,255,0.92)' });
  landmark('BW 漫展中心', 0, cz, 60, '穹顶场馆、六大展位和随处可见的 Coser。');
}

// ======================================================================
// 简易人物 / 猫
// ======================================================================
export function makeSimplePerson(shirt = 0x2a3a5a, hair = 0x2a2026, skirt = null) {
  const g = new THREE.Group();
  const skin = std(0xffdcc6);
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.42, 4, 10), std(shirt)); body.position.y = 1.18; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), skin); head.position.y = 1.7; g.add(head);
  const h = new THREE.Mesh(new THREE.SphereGeometry(0.175, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.6), std(hair)); h.position.y = 1.72; g.add(h);
  if (skirt) { const s = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.5, 14), std(skirt)); s.position.y = 0.8; g.add(s); }
  for (const sx of [-0.1, 0.1]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.8, 0.16), std(0x2b3040)); l.position.set(sx, 0.42, 0); g.add(l); }
  for (const sx of [-0.27, 0.27]) { const a = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.6, 0.12), std(shirt)); a.position.set(sx, 1.2, 0); g.add(a); }
  return g;
}
function makeCat(color) {
  const g = new THREE.Group();
  const m = std(color, { roughness: 0.9 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.36, 4, 10), m); body.rotation.x = Math.PI / 2; body.position.y = 0.22; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 14, 10), m); head.position.set(0, 0.36, 0.3); g.add(head);
  for (const sx of [-0.08, 0.08]) { const e = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.1, 4), m); e.position.set(sx, 0.5, 0.3); g.add(e); }
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.04, 0.4, 6), m); tail.position.set(0, 0.35, -0.32); tail.rotation.x = -0.5; g.add(tail);
  g.userData.tail = tail;
  return g;
}

// ======================================================================
export const districtGroups = [];
export function buildDistricts(scene) {
  const root = new THREE.Group(); scene.add(root);
  cityFurniture(root);
  const mk = (fn, cx, cz) => { const g = new THREE.Group(); scene.add(g); fn(g); g.userData.center = new THREE.Vector3(cx, 0, cz); districtGroups.push(g); return g; };
  mk(shopStreet, 0, 200);
  mk(cityPark, 200, 0);
  mk(metro, -200, 0);
  mk(expoCenter, 0, -200);
  districtGroups.furniture = root;
  // 红绿灯周期：南北绿 8s → 黄 2s → 东西绿 8s → 黄 2s
  ctx.animators.push((dt) => {
    lightState.t += dt;
    const dur = [8, 2, 8, 2][lightState.phase];
    if (lightState.t > dur) { lightState.t = 0; lightState.phase = (lightState.phase + 1) % 4; }
  });
  return root;
}
