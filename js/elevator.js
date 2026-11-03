// 真实电梯：可动门 + 轿厢 + 第一人称“按按钮 → 进电梯 → 按楼层 → 到站开门 → 走出”全流程
import * as THREE from 'three';
import { ctx, std } from './common.js';
import { FLOOR_META, META_BY_KEY } from './floorMeta.js';
import { textTexture, FONT, roundRect } from './textures.js';

// 所有楼层的电梯门：key -> [{ L, R, x, light }]
export const elevatorDoors = {};
const CAB_Z = -12.6;   // 轿厢中心
const DOOR_Z = -9.86;  // 门板位置

// 拉丝不锈钢贴图
let _brushed = null;
function brushedTex() {
  if (_brushed) return _brushed;
  const c = document.createElement('canvas'); c.width = 128; c.height = 256; const g = c.getContext('2d');
  g.fillStyle = '#c4cad2'; g.fillRect(0, 0, 128, 256);
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '60,66,74'},${Math.random() * 0.12})`; g.fillRect(0, Math.random() * 256, 128, 1); }
  const gr = g.createLinearGradient(0, 0, 128, 0); gr.addColorStop(0, 'rgba(0,0,0,0.12)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.12)'); gr.addColorStop(1, 'rgba(0,0,0,0.12)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 256);
  _brushed = new THREE.CanvasTexture(c); _brushed.colorSpace = THREE.SRGBColorSpace; return _brushed;
}
let _spill = null;
function spillTex() {
  if (_spill) return _spill;
  const c = document.createElement('canvas'); c.width = 64; c.height = 128; const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 128, 0, 0); gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 128);
  const hg = g.createLinearGradient(0, 0, 64, 0); hg.addColorStop(0, 'rgba(0,0,0,1)'); hg.addColorStop(0.2, 'rgba(0,0,0,0)'); hg.addColorStop(0.8, 'rgba(0,0,0,0)'); hg.addColorStop(1, 'rgba(0,0,0,1)');
  g.globalCompositeOperation = 'destination-out'; g.fillStyle = hg; g.fillRect(0, 0, 64, 128);
  _spill = new THREE.CanvasTexture(c); return _spill;
}
// 共享资源
let _cabGeo = null;
function cabMaterials() {
  if (_cabGeo) return _cabGeo;
  const steel = new THREE.MeshStandardMaterial({ map: brushedTex(), color: 0xa9b0b8, metalness: 0.3, roughness: 0.45 });
  const mirror = new THREE.MeshStandardMaterial({ map: brushedTex(), color: 0xa9b0b8, metalness: 0.35, roughness: 0.35 });
  const floor = new THREE.MeshStandardMaterial({ color: 0x2a2d34, roughness: 0.35, metalness: 0.2 });
  const ceil = new THREE.MeshStandardMaterial({ color: 0xe8e4dc, roughness: 0.9 });
  const lamp = new THREE.MeshBasicMaterial({ color: 0xbdb6a8 });
  const rail = new THREE.MeshStandardMaterial({ color: 0xd8b56a, metalness: 1, roughness: 0.25 });
  _cabGeo = { steel, mirror, floor, ceil, rail, lamp };
  return _cabGeo;
}

// 轿厢按键面板贴图（12 个楼层 + 开/关门）
function panelTexture(currentKey, pressedKey = null) {
  const W = 256, H = 512;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  const bg = g.createLinearGradient(0, 0, W, 0); bg.addColorStop(0, '#9aa2ad'); bg.addColorStop(0.5, '#d6dbe1'); bg.addColorStop(1, '#9aa2ad');
  g.fillStyle = bg; roundRect(g, 0, 0, W, H, 20); g.fill();
  // 顶部液晶屏
  g.fillStyle = '#07080b'; roundRect(g, 26, 22, W - 52, 70, 10); g.fill();
  const cm = META_BY_KEY[currentKey];
  g.fillStyle = cm ? cm.color : '#FB7299'; g.font = '900 46px "Courier New", monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(cm ? cm.num : '1F', W / 2, 58);
  // 楼层按键 2 列
  const list = [...FLOOR_META].reverse();
  list.forEach((f, i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const cx = 58 + col * 70, cy = 140 + row * 56;
    const lit = f.key === pressedKey;
    g.fillStyle = lit ? f.color : '#e9ecef'; g.beginPath(); g.arc(cx, cy, 21, 0, Math.PI * 2); g.fill();
    g.strokeStyle = lit ? '#fff' : '#7d858f'; g.lineWidth = 3; g.stroke();
    if (lit) { g.shadowColor = f.color; g.shadowBlur = 18; g.beginPath(); g.arc(cx, cy, 21, 0, Math.PI * 2); g.stroke(); g.shadowBlur = 0; }
    g.fillStyle = lit ? '#fff' : '#2a2f38'; g.font = `800 ${f.num.length > 2 ? 15 : 17}px Arial`; g.fillText(f.num, cx, cy + 1);
  });
  // 开关门
  g.fillStyle = '#e9ecef';
  for (const [cx, lab] of [[78, '◀▶'], [178, '▶◀']]) { g.beginPath(); g.arc(cx, H - 42, 19, 0, Math.PI * 2); g.fill(); g.fillStyle = '#2a2f38'; g.font = '800 14px Arial'; g.fillText(lab, cx, H - 41); g.fillStyle = '#e9ecef'; }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
// 按键在面板贴图中的 UV（用于手指定位）
function buttonUV(key) {
  const list = [...FLOOR_META].reverse();
  const i = list.findIndex(f => f.key === key);
  const col = i % 3, row = Math.floor(i / 3);
  return { u: (58 + col * 70) / 256, v: 1 - (140 + row * 56) / 512 };
}

/** 为某楼层生成三部电梯的门板 + 轿厢（由 core() 调用） */
export function buildElevatorBank(root, level, y, h, themeColor) {
  const M = cabMaterials();
  const doorMat = new THREE.MeshStandardMaterial({ map: brushedTex(), color: 0xc4cad1, metalness: 0.3, roughness: 0.45 });
  const doors = [];
  for (const x of [-6, 0, 6]) {
    const L = new THREE.Mesh(new THREE.BoxGeometry(1.14, 2.62, 0.06), doorMat);
    const R = new THREE.Mesh(new THREE.BoxGeometry(1.14, 2.62, 0.06), doorMat);
    L.position.set(x - 0.56, y + 1.3, DOOR_Z); R.position.set(x + 0.56, y + 1.3, DOOR_Z);
    L.userData.dynamic = R.userData.dynamic = true;
    root.add(L, R);
    // 门内侧面板（朝向轿厢）
    const innerMat = new THREE.MeshStandardMaterial({ map: brushedTex(), color: 0xe2e6ea, metalness: 0.1, roughness: 0.45, side: THREE.DoubleSide });
    for (const D of [L, R]) { const inner = new THREE.Mesh(new THREE.PlaneGeometry(1.06, 2.58), innerMat); inner.position.z = -0.035; inner.rotation.y = Math.PI; D.add(inner); }
    // 呼叫按钮（可点亮）
    const callMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0x5a606a) });
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.42, 0.02), new THREE.MeshStandardMaterial({ map: brushedTex(), color: 0xc9ced5, metalness: 0.6, roughness: 0.3 }));
    plate.position.set(x + 1.65, y + 1.3, -9.905); plate.userData.dynamic = true; root.add(plate);
    const btnUp = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.055, 0.025, 20), new THREE.MeshStandardMaterial({ color: 0xe9ecef, metalness: 0.4, roughness: 0.3 }));
    btnUp.rotation.x = Math.PI / 2; btnUp.position.set(x + 1.65, y + 1.41, -9.885); btnUp.userData.dynamic = true; root.add(btnUp);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.056, 0.068, 24), callMat); ring.position.set(x + 1.65, y + 1.41, -9.893); ring.userData.dynamic = true; root.add(ring);
    const btnDn = btnUp.clone(); btnDn.position.y = y + 1.19; root.add(btnDn);
    const ring2 = new THREE.Mesh(new THREE.RingGeometry(0.056, 0.068, 24), new THREE.MeshBasicMaterial({ color: 0x5a606a })); ring2.position.set(x + 1.65, y + 1.19, -9.893); ring2.userData.dynamic = true; root.add(ring2);
    // 开门时轿厢灯光溢出到门口地面
    const spill = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.6), new THREE.MeshBasicMaterial({ map: spillTex(), color: 0xfff0dc, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    spill.rotation.x = -Math.PI / 2; spill.position.set(x, y + 0.022, -8.55); spill.renderOrder = 3; spill.userData.dynamic = true; root.add(spill);
    // 轿厢（门后：内壁 + 镜面背板 + 扶手 + 灯盘 + 按键面板）
    const cab = new THREE.Group(); cab.position.set(x, y, CAB_Z); root.add(cab);
    const add = (geo, mat, px, py, pz, ry = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(px, py, pz); m.rotation.y = ry; cab.add(m); return m; };
    add(new THREE.PlaneGeometry(2.4, 2.4), M.floor, 0, 0.012, 0).rotation.x = -Math.PI / 2;
    add(new THREE.PlaneGeometry(2.4, 2.4), M.ceil, 0, 2.78, 0).rotation.x = Math.PI / 2;
    add(new THREE.PlaneGeometry(1.4, 1.4), M.lamp, 0, 2.77, 0).rotation.x = Math.PI / 2;
    // 轿厢前墙（门两侧窄墙 + 门楣，关门后形成封闭空间）
    add(new THREE.PlaneGeometry(2.4, 0.3), M.steel, 0, 2.65, 1.19, Math.PI);
    for (const sx of [-1, 1]) add(new THREE.PlaneGeometry(0.14, 2.8), M.steel, sx * 1.13, 1.4, 1.19, Math.PI);
    // 轿厢内侧门（与厅门同步开合，运行时挡住井道外的景象）
    const cdL = add(new THREE.PlaneGeometry(1.12, 2.62), M.steel, -0.56, 1.31, 1.12, Math.PI);
    const cdR = add(new THREE.PlaneGeometry(1.12, 2.62), M.steel, 0.56, 1.31, 1.12, Math.PI);
    cdL.userData.dynamic = cdR.userData.dynamic = true;
    const pl = new THREE.PointLight(0xfff2e0, 0, 4.2, 2); pl.position.set(x, y + 2.5, CAB_Z - 0.2); pl.userData.dynamic = true; root.add(pl);   // 常驻在楼层分组里，只改亮度
    add(new THREE.PlaneGeometry(2.4, 2.78), M.mirror, 0, 1.39, -1.2);
    add(new THREE.PlaneGeometry(2.4, 2.78), M.steel, -1.2, 1.39, 0, Math.PI / 2);
    add(new THREE.PlaneGeometry(2.4, 2.78), M.steel, 1.2, 1.39, 0, -Math.PI / 2);
    for (const [px, ry] of [[-1.16, Math.PI / 2], [1.16, -Math.PI / 2]]) { const r = add(new THREE.CylinderGeometry(0.025, 0.025, 1.9, 8), M.rail, px, 0.95, -0.1); r.rotation.x = Math.PI / 2; }
    { const r = add(new THREE.CylinderGeometry(0.025, 0.025, 2.0, 8), M.rail, 0, 0.95, -1.15); r.rotation.z = Math.PI / 2; }
    const pTex = panelTexture(level);
    const panel = add(new THREE.PlaneGeometry(0.36, 0.72), new THREE.MeshBasicMaterial({ map: pTex, color: 0xd8d8d8 }), 1.19, 1.3, 0.62, -Math.PI / 2);
    panel.userData.dynamic = true;
    // 轿厢左墙：LCD 广告 / 楼层屏（所有轿厢共用一张动态贴图）
    const lcd = add(new THREE.PlaneGeometry(0.62, 0.42), cabLcdMaterial(), -1.18, 1.85, 0.55, Math.PI / 2); lcd.userData.dynamic = true;
    add(new THREE.PlaneGeometry(0.7, 0.5), M.floor, -1.185, 1.85, 0.55, Math.PI / 2);
    // 轿厢地垫（品牌 Logo）
    const mat = add(new THREE.PlaneGeometry(1.6, 1.0), cabMatMaterial(), 0, 0.016, 0.2); mat.rotation.x = -Math.PI / 2;
    // 顶部筒灯
    for (const [px, pz] of [[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]]) { const dl = add(new THREE.CircleGeometry(0.07, 14), M.lamp, px, 2.765, pz); dl.rotation.x = Math.PI / 2; }
    cab.userData = { panel, level, dynamic: true };
    cab.visible = false; // 门关着时不可见（省绘制）
    // 门上方：实时楼层显示屏 + 到站方向灯
    const disp = hallDisplay();
    const dispMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.86, 0.36), disp.mat); dispMesh.position.set(x, y + 3.02, -9.885); dispMesh.userData.dynamic = true; root.add(dispMesh);
    const lanternOff = new THREE.Color(0x2a2e36), themeC = new THREE.Color(themeColor).multiplyScalar(1.6);
    const lantern = new THREE.MeshBasicMaterial({ color: lanternOff.clone(), toneMapped: false });
    const lan = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.035), lantern); lan.position.set(x, y + 2.86, -9.884); lan.userData.dynamic = true; root.add(lan);
    doors.push({ pl, spill, L, R, cdL, cdR, x, callMat, btnUp, cab, open: 0, target: 0, level, y, disp, lantern, lanternOff, theme: themeC, car: [-6, 0, 6].indexOf(x) });
  }
  elevatorDoors[level] = doors;
  return doors;
}

// ---------- 共享：轿厢 LCD / 地垫 ----------
let _lcd = null;
function cabLcdMaterial() {
  if (_lcd) return _lcd.mat;
  const c = document.createElement('canvas'); c.width = 320; c.height = 216;
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  _lcd = { c, g: c.getContext('2d'), tex, mat: new THREE.MeshBasicMaterial({ map: tex, color: 0xdddddd }), t: 0, acc: 0 };
  return _lcd.mat;
}
let _mat = null;
function cabMatMaterial() {
  if (_mat) return _mat;
  const c = document.createElement('canvas'); c.width = 320; c.height = 200; const g = c.getContext('2d');
  g.fillStyle = '#1e2026'; roundRect(g, 0, 0, 320, 200, 18); g.fill();
  g.strokeStyle = '#FB7299'; g.lineWidth = 6; roundRect(g, 10, 10, 300, 180, 12); g.stroke();
  g.fillStyle = '#FB7299'; g.font = 'italic 900 64px "Arial Black",Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('bilibili', 160, 104);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  _mat = new THREE.MeshStandardMaterial({ map: t, roughness: 0.95 }); return _mat;
}
// 运行时由 main 写入：{ num, arrow, to }
export const liftInfo = { num: '1F', arrow: '', to: '', color: '#FB7299' };
const ADS = [['你感兴趣的视频', '都在 B 站'], ['一键三连', '点赞 · 投币 · 收藏'], ['BML 2025', '线下演唱会火热预约'], ['干杯 Cafe', '1F 大堂 · 三连拿铁']];
function drawLcd(dt) {
  if (!_lcd) return;
  _lcd.t += dt; _lcd.acc += dt; if (_lcd.acc < 1 / 15) return; _lcd.acc = 0;
  const { g, c } = _lcd, W = c.width, H = c.height, t = _lcd.t;
  const bg = g.createLinearGradient(0, 0, W, H); bg.addColorStop(0, '#0d1220'); bg.addColorStop(1, '#1a1030'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
  // 左侧：楼层 + 方向
  g.fillStyle = liftInfo.color; g.font = '900 64px "Courier New",monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(liftInfo.num, 80, 92);
  if (liftInfo.arrow) { g.globalAlpha = 0.5 + 0.5 * Math.abs(Math.sin(t * 4)); g.font = '900 30px Arial'; g.fillText(liftInfo.arrow, 80, 40); g.globalAlpha = 1; }
  g.fillStyle = '#9aa0b4'; g.font = `600 15px ${FONT}`; g.fillText(liftInfo.to ? '前往 ' + liftInfo.to : 'bilibili 大厦', 80, 150);
  // 右侧：轮播广告
  const ad = ADS[Math.floor(t / 3) % ADS.length], k = (t % 3) / 3;
  g.save(); g.beginPath(); g.rect(160, 12, 148, H - 24); g.clip();
  const ag = g.createLinearGradient(160, 0, 308, 0); ag.addColorStop(0, '#FB7299'); ag.addColorStop(1, '#00AEEC'); g.fillStyle = ag; g.fillRect(160, 12, 148, H - 24);
  g.fillStyle = '#fff'; g.textAlign = 'left'; g.font = `900 20px ${FONT}`; g.fillText(ad[0], 172 - Math.max(0, k - 0.85) * 600, 80);
  g.font = `600 14px ${FONT}`; g.fillText(ad[1], 172 - Math.max(0, k - 0.85) * 600, 110);
  g.restore();
  g.fillStyle = 'rgba(255,255,255,0.15)'; g.fillRect(160, H - 20, 148 * k, 4);
  _lcd.tex.needsUpdate = true;
}

// ---------- 门上楼层显示：三部电梯的轿厢在楼里真实地上下运行 ----------
const LIST = FLOOR_META.map(f => f.num);
export const cars = [0, 1, 2].map(i => ({ idx: [0, 5, 9][i], target: [6, 2, 11][i], wait: 0, dir: 0, acc: 0 }));
function hallDisplay() {
  const c = document.createElement('canvas'); c.width = 192; c.height = 80;
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  return { c, g: c.getContext('2d'), tex, mat: new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }), last: '' };
}
function drawHall(d) {
  const car = cars[d.car]; const key = car.idx + '|' + car.dir + '|' + (d.open > 0.05);
  if (d.disp.last === key) return; d.disp.last = key;
  const { g, c } = d.disp;
  g.fillStyle = '#05060a'; g.fillRect(0, 0, c.width, c.height);
  g.strokeStyle = '#23262f'; g.lineWidth = 4; g.strokeRect(2, 2, c.width - 4, c.height - 4);
  const col = '#' + d.theme.clone().multiplyScalar(1 / 1.6).getHexString();
  g.fillStyle = col; g.textBaseline = 'middle';
  g.font = '900 30px Arial'; g.textAlign = 'center'; g.fillText(car.dir > 0 ? '▲' : car.dir < 0 ? '▼' : '•', 40, 41);
  g.font = '900 46px "Courier New",monospace'; g.fillText(LIST[car.idx], 120, 43);
  d.disp.tex.needsUpdate = true;
}
/** 每帧：模拟三部轿厢上下运行；只刷新当前可见楼层的显示屏 */
export function tickHall(dt, levelKey) {
  for (const car of cars) {
    if (car.hold) continue;
    car.acc += dt;
    if (car.wait > 0) { car.wait -= dt; car.dir = 0; continue; }
    if (car.acc < 0.9) continue; car.acc = 0;
    if (car.idx === car.target) { car.wait = 2 + Math.random() * 4; car.target = Math.floor(Math.random() * LIST.length); continue; }
    car.dir = Math.sign(car.target - car.idx); car.idx += car.dir;
  }
  const bank = elevatorDoors[levelKey];
  if (bank) for (const d of bank) drawHall(d);
  drawLcd(dt);
}

// 门动画：每帧把 open 推向 target
export function updateElevatorDoors(dt) {
  for (const list of Object.values(elevatorDoors)) for (const d of list) {
    if (Math.abs(d.open - d.target) < 0.001) { d.cab.visible = d.open > 0.01 || !!d.inUse; continue; }
    d.open += Math.sign(d.target - d.open) * Math.min(Math.abs(d.target - d.open), dt * 0.95);
    const e = 0.5 - 0.5 * Math.cos(Math.PI * d.open);   // 缓入缓出
    d.L.position.x = d.x - 0.56 - e * 1.02;
    d.R.position.x = d.x + 0.56 + e * 1.02;
    d.cdL.position.x = -0.56 - e * 1.0; d.cdR.position.x = 0.56 + e * 1.0;
    if (d.lantern) d.lantern.color.copy(d.open > 0.05 ? d.theme : d.lanternOff);
    if (d.spill) d.spill.material.opacity = 0.42 * e;
    if (d.pl) d.pl.intensity = 3.2 * Math.max(e, d.inUse ? 1 : 0);
    d.cab.visible = d.open > 0.01 || d.inUse;
  }
}

// =====================================================================
// 第一人称手部模型（按按钮用）
// =====================================================================
let hand = null;
export function getHand(camera) {
  if (hand) return hand;
  hand = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color: 0xf2c9a8, roughness: 0.65 });
  const sleeve = new THREE.MeshStandardMaterial({ color: 0x2a3550, roughness: 0.8 });
  const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.036, 0.36, 4, 10), sleeve); arm.rotation.x = Math.PI / 2; arm.position.z = 0.26; hand.add(arm);
  const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.03, 12), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 })); cuff.rotation.x = Math.PI / 2; cuff.position.z = 0.085; hand.add(cuff);
  const palm = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.035, 0.085), skin); palm.position.z = 0.02; hand.add(palm);
  const finger = new THREE.Mesh(new THREE.CapsuleGeometry(0.014, 0.08, 4, 8), skin); finger.rotation.x = Math.PI / 2; finger.position.set(-0.025, 0.01, -0.07); hand.add(finger);
  for (let i = 0; i < 3; i++) { const f = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6), skin); f.position.set(0.0 + i * 0.022, -0.005, -0.03); hand.add(f); }
  hand.visible = false;
  hand.traverse(o => { if (o.isMesh) { o.renderOrder = 10; } });
  hand.scale.setScalar(0.95);
  camera.add(hand);
  return hand;
}

// =====================================================================
// 电梯乘坐过场：返回 Promise，结束后由 main.js 恢复控制
// =====================================================================
const ease = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
export function elevatorSequence({ camera, player, from, door, to, Sound, onArrive, onStep }) {
  const H = getHand(camera);
  const doorsTo = elevatorDoors[to];
  const toDoor = doorsTo ? doorsTo.find(d => d.x === door.x) || doorsTo[1] : null;
  const fromY = door.y, toY = META_BY_KEY[to].y;
  const theme = new THREE.Color(META_BY_KEY[to].color);
  const steps = [];
  const camPos = new THREE.Vector3(), lookAt = new THREE.Vector3();
  const eye = 1.62;
  let yaw0 = player.yaw, pitch0 = player.pitch;
  // —— 关键帧（时长秒，更新函数 k∈[0,1]）——
  const callBtn = new THREE.Vector3(door.x + 1.65, fromY + 1.41, -9.9);
  const cabPanelLocal = (key) => { const uv = buttonUV(key); return new THREE.Vector3(door.x + 1.18, fromY + 1.3 + (uv.v - 0.5) * 0.72, CAB_Z + 0.62 - (uv.u - 0.5) * 0.36); };
  const standOut = new THREE.Vector3(door.x + 1.15, fromY, -8.55);
  const inCab = new THREE.Vector3(door.x - 0.35, fromY, CAB_Z + 0.05);
  const lookYaw = (from, to2) => Math.atan2(-(to2.x - from.x), -(to2.z - from.z));
  const lookPitch = (from, to2) => Math.atan2(to2.y - (from.y + eye), Math.hypot(to2.x - from.x, to2.z - from.z));
  const setCam = (p, yaw, pitch, roll = 0) => { camera.position.set(p.x, p.y + eye, p.z); camera.rotation.set(pitch, yaw, roll, 'YXZ'); };
  const startP = player.pos.clone();
  const handTo = (target, k) => {
    // 手从屏幕右下伸向目标（相机空间）
    H.visible = k > 0.02 && k < 0.98;
    camera.updateMatrixWorld();
    const local = camera.worldToLocal(target.clone());
    const rest = new THREE.Vector3(0.3, -0.42, -0.35);
    const reach = Math.sin(k * Math.PI);
    const tgt = local.clone(); tgt.multiplyScalar(Math.max(0, (local.length() - 0.05)) / Math.max(local.length(), 1e-3)); tgt.y -= 0.06; tgt.x += 0.04;
    H.position.lerpVectors(rest, tgt, reach);
    H.lookAt(camera.localToWorld(local.clone()));
  };
  // 1. 转身看呼叫按钮并靠近
  steps.push({ d: 0.7, f: (k) => {
    const e = ease(k); const p = startP.clone().lerp(standOut, e);
    player.pos.copy(p);
    setCam(p, THREE.MathUtils.lerp(yaw0, lookYaw(standOut, callBtn), e), THREE.MathUtils.lerp(pitch0, lookPitch(standOut, callBtn), e));
  } });
  // 2. 伸手按呼叫键（按键亮起）
  steps.push({ d: 0.75, f: (k, first) => {
    if (first) yaw0 = lookYaw(standOut, callBtn);
    handTo(callBtn, k);
    if (k > 0.5 && !door._lit) { door._lit = true; door.callMat.color.copy(theme).multiplyScalar(1.8); Sound.tone(1320, 0.08, { type: 'square', vol: 0.05 }); onStep && onStep('call'); }
    door.btnUp.position.z = -9.885 - Math.max(0, Math.sin(Math.min(1, Math.max(0, (k - 0.4) / 0.25)) * Math.PI)) * 0.012;
  } });
  // 2.5 等待：门上显示屏显示轿厢从别的楼层一层层驶来
  steps.push({ d: 1.6, f: (k, first) => {
    if (first) onStep && onStep('wait-start');
    onStep && onStep('wait', { k });
    const p = standOut.clone(); const tYaw = lookYaw(p, new THREE.Vector3(door.x, fromY + 3.0, -9.9));
    setCam(p, THREE.MathUtils.lerp(lookYaw(standOut, callBtn), tYaw, ease(Math.min(1, k * 2))), THREE.MathUtils.lerp(lookPitch(standOut, callBtn), lookPitch(standOut, new THREE.Vector3(door.x, fromY + 3.0, -9.9)), ease(Math.min(1, k * 2))));
  } });
  // 3. 等门打开（叮 + 开门声）
  steps.push({ d: 1.1, f: (k, first) => {
    if (first) { H.visible = false; Sound.tone(1318, 0.5, { vol: 0.08 }); door.target = 1; Sound.doorSlide(); Sound.room && Sound.room('room'); }
    const p = standOut; const tYaw = lookYaw(p, new THREE.Vector3(door.x, fromY + 1.4, CAB_Z));
    const disp = new THREE.Vector3(door.x, fromY + 3.0, -9.9);
    setCam(p, THREE.MathUtils.lerp(lookYaw(standOut, disp), tYaw, ease(k)), THREE.MathUtils.lerp(lookPitch(standOut, disp), -0.05, ease(k)));
  } });
  // 4. 走进轿厢
  steps.push({ d: 1.0, f: (k) => {
    const e = ease(k); const p = standOut.clone().lerp(inCab, e);
    p.y += Math.abs(Math.sin(k * Math.PI * 3)) * 0.03;
    setCam(p, lookYaw(standOut, new THREE.Vector3(door.x, fromY, CAB_Z)), -0.05);
    if (Math.floor(k * 3) !== Math.floor((k - 0.02) * 3)) onStep && onStep('foot');
  } });
  // 5. 转身面向门 + 看向按键面板
  const panelTarget = cabPanelLocal(to);
  steps.push({ d: 0.8, f: (k) => {
    const e = ease(k);
    const yawIn = lookYaw(standOut, new THREE.Vector3(door.x, fromY, CAB_Z));
    setCam(inCab, THREE.MathUtils.lerp(yawIn, lookYaw(inCab, panelTarget), e), THREE.MathUtils.lerp(-0.05, lookPitch(inCab, panelTarget), e));
  } });
  // 6. 按目标楼层键（面板高亮）
  steps.push({ d: 0.8, f: (k) => {
    handTo(panelTarget, k);
    if (k > 0.5 && !door._pressed) {
      door._pressed = true;
      const pm = door.cab.userData.panel.material; pm.map.dispose(); pm.map = panelTexture(from, to); pm.needsUpdate = true;
      Sound.tone(1480, 0.07, { type: 'square', vol: 0.05 }); onStep && onStep('press');
    }
  } });
  // 7. 转向门口，关门
  steps.push({ d: 1.1, f: (k, first) => {
    if (first) { H.visible = false; door.target = 0; Sound.doorSlide(); Sound.room && Sound.room('cab'); }
    const pm2 = inCab.clone().lerp(new THREE.Vector3(door.x, fromY, CAB_Z - 0.35), ease(k));
    setCam(pm2, THREE.MathUtils.lerp(lookYaw(inCab, panelTarget), Math.PI, ease(k)), THREE.MathUtils.lerp(lookPitch(inCab, panelTarget), 0.05, ease(k)));
  } });
  // 8. 运行：轻微晃动 + 低频嗡声 + 楼层数字滚动（由 onStep 推给 HUD）
  const dist = Math.abs(toY - fromY);
  const runDur = THREE.MathUtils.clamp(1.4 + dist / 70, 1.6, 3.2);
  steps.push({ d: runDur, f: (k, first) => {
    if (k > 0.85 && !door._pre) { door._pre = true; onStep && onStep('pre-arrive'); }
    if (first) { Sound.motor(runDur); onStep && onStep('run-start', { runDur }); }
    // 起步下沉、到站轻微上弹（加减速的身体感受）+ 运行中细微振动
    const bump = (a, b) => (k > a && k < b) ? Math.sin(Math.PI * (k - a) / (b - a)) : 0;
    const dir = Math.sign(toY - fromY) || 1;
    const shake = Math.sin(k * 90) * 0.003 * Math.sin(k * Math.PI);
    const p = new THREE.Vector3(door.x, fromY, CAB_Z - 0.35); p.y += shake - dir * 0.045 * bump(0, 0.2) + dir * 0.03 * bump(0.82, 1);
    setCam(p, Math.PI, 0.05 + Math.sin(k * Math.PI) * 0.01);
    onStep && onStep('run', { k: ease(k) });
  } });
  // 9. 到站：瞬移到目标层轿厢，开门
  const inCabTo = new THREE.Vector3(toDoor ? toDoor.x : door.x, toY, CAB_Z - 0.35);
  steps.push({ d: 1.1, f: (k, first) => {
    if (first) {
      onArrive && onArrive();
      if (toDoor) { toDoor.open = 0; toDoor.target = 1; toDoor.cab.visible = true; const pm = toDoor.cab.userData.panel.material; pm.map.dispose(); pm.map = panelTexture(to); pm.needsUpdate = true; }
      Sound.arrive && Sound.arrive(META_BY_KEY[to].short); Sound.doorSlide();
    }
    setCam(inCabTo, Math.PI, 0.05 - 0.07 * ease(k));
  } });
  // 10. 走出电梯
  const arriveIdx = steps.length - 1;
  const outTo = new THREE.Vector3(inCabTo.x * 0.6, toY, -5.6);
  steps.push({ d: 1.0, f: (k) => {
    const e = ease(k); const p = inCabTo.clone().lerp(outTo, e);
    p.y += Math.abs(Math.sin(k * Math.PI * 3)) * 0.03;
    const endYaw = Math.PI + (inCabTo.x > 0 ? -0.35 : inCabTo.x < 0 ? 0.35 : 0);
    setCam(p, THREE.MathUtils.lerp(Math.PI, endYaw, e), THREE.MathUtils.lerp(-0.02, -0.08, e));
    player.pos.copy(p); player.pos.y = toY;
    if (Math.floor(k * 3) !== Math.floor((k - 0.02) * 3)) onStep && onStep('foot');
  } });
  // 播放器
  return new Promise((resolve) => {
    let i = 0, t = 0, first = true;
    door._lit = false; door._pressed = false; door._pre = false; door.inUse = true; if (toDoor) toDoor.inUse = true;
    // 跳过：直接进入到站开门
    ctx.skipCutscene = () => {
      if (i >= arriveIdx) return false;
      H.visible = false; door.target = 0; door.open = 0; door.cab.visible = false;
      const n = Math.round(((ctx.liftFrom ?? 1) + (ctx.liftTo ?? 1)) / 2);
      onStep && onStep('run', { k: 1 });
      i = arriveIdx; t = 0; first = true; return true;
    };
    const run = (dt) => {
      const s = steps[i];
      t += dt;
      const k = Math.min(1, t / s.d);
      s.f(k, first); first = false;
      if (k >= 1) { i++; t = 0; first = true; if (i >= steps.length) {
        H.visible = false;
        door.inUse = false; if (toDoor) toDoor.inUse = false;
        door.callMat.color.set(0x5a606a);
        // 门延迟关闭
        if (toDoor) setTimeout(() => { toDoor.target = 0; }, 1200);
        player.yaw = Math.PI + (inCabTo.x > 0 ? -0.35 : inCabTo.x < 0 ? 0.35 : 0); player.pitch = -0.08;
        ctx.skipCutscene = null;
        resolve(); return true;
      } }
      return false;
    };
    ctx.cutscene = run;
  });
}
