// 室内：电梯核心筒、1F 大堂、16F 办公区、天台
import * as THREE from 'three';
import { ctx, box, addCollider, std, glow, plane, hotspot, plant, sofa, tree, boxGeo } from './common.js';
import { lobbyFloorTexture, carpetTexture, woodTexture, logoTexture, textTexture, panelTexture, screenTexture, marbleTexture, woodSlatTexture, greenWallTexture, glowPoolTexture, medallionTexture, directoryTexture, floorPlaqueTexture, drawTV, PINK, BLUE } from './textures.js';
import { FLOOR_META, META_BY_KEY } from './floorMeta.js';
import { buildElevatorBank } from './elevator.js';
import { contactShadow } from './lighting.js';
import { interactable } from './districts.js';
import { makeSimplePerson } from './districts.js';
import { makeTV, TOWER } from './tower.js';
import { buildGundam } from './gundam.js';

const hw = TOWER.W / 2 - 0.3, hd = TOWER.D / 2 - 0.3;

// ---------- 电梯核心筒（按楼层主题色 + 导览牌 + 楼层铭牌） ----------
export function core(root, level, y, h, label) {
  const meta = META_BY_KEY[level] || { color: PINK, num: label, short: '' };
  const theme = new THREE.Color(meta.color);
  // 核心筒：三个电梯井之间的墙体（留出 2.4m 宽的井道，轿厢在井道里）
  const wallM = std(0xf4f5f7, { roughness: 0.5 });
  for (const [cx, w] of [[-8.1, 1.8], [-3, 3.6], [3, 3.6], [8.1, 1.8]]) box(root, wallM, w, h, 6, cx, y, -13);
  for (const x of [-6, 0, 6]) {
    box(root, wallM, 2.4, Math.max(0.1, h - 2.8), 0.3, x, y + 2.8, -10.15);     // 门楣墙
    box(root, wallM, 2.4, h, 0.3, x, y, -15.85);                               // 井道后墙
  }
  const frameMat = new THREE.MeshBasicMaterial({ color: theme.clone().multiplyScalar(1.25), toneMapped: false });
  const lab = textTexture(meta.num + ' ▲▼', { size: 56, color: '#ffffff', stroke: null });
  const labMat = new THREE.MeshBasicMaterial({ map: lab.tex, transparent: true, toneMapped: false, color: theme.clone().lerp(new THREE.Color('#ffffff'), 0.55) });
  const portal = std(0x1c2027, { metalness: 0.7, roughness: 0.35 });
  for (const x of [-6, 0, 6]) {
    box(root, portal, 0.2, 2.9, 0.16, x - 1.35, y, -9.97, { collide: false }); box(root, portal, 0.2, 2.9, 0.16, x + 1.35, y, -9.97, { collide: false }); box(root, portal, 2.9, 0.2, 0.16, x, y + 2.8, -9.97, { collide: false });
    box(root, frameMat, 2.7, 0.05, 0.16, x, y + 2.82, -9.88, { collide: false });
    box(root, frameMat, 0.05, 2.8, 0.16, x - 1.37, y, -9.88, { collide: false });
    box(root, frameMat, 0.05, 2.8, 0.16, x + 1.37, y, -9.88, { collide: false });
    const btnPlate = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.5), std(0x2a2f38, { metalness: 0.8, roughness: 0.3 }));
    btnPlate.position.set(x + 1.65, y + 1.3, -9.91); root.add(btnPlate);
    ctx.elevators.push({ x, z: -8.6, level });
  }
  // 电梯门 & 轿厢（可开合，带呼叫按钮）
  buildElevatorBank(root, level, y, h, meta.color);
  // 电梯口挡门碰撞（门关时不能穿过；乘坐过场中不走碰撞）
  for (const x of [-6, 0, 6]) addCollider(x - 1.2, y, -10.1, x + 1.2, y + 2.8, -9.8);
  // 导览牌 + 楼层铭牌（电梯之间）
  const dir = directoryTexture(FLOOR_META, level);
  const dh = Math.min(2.7, h - 1.0), dw = dh * dir.aspect;
  box(root, std(0x15171c, { metalness: 0.6 }), dw + 0.12, dh + 0.12, 0.06, 3, y + 0.35 - 0.06, -9.95, { collide: false });
  plane(root, new THREE.MeshBasicMaterial({ map: dir.tex, toneMapped: false }), dw, dh, 3, y + 0.35 + dh / 2, -9.91);
  plane(root, new THREE.MeshBasicMaterial({ map: floorPlaqueTexture(meta), transparent: true, toneMapped: false }), 2.3, 1.15, -3, y + 2.0, -9.92);
  // 主题色地面导视条
  box(root, frameMat, 18, 0.02, 0.12, 0, y + 0.005, -9.7, { collide: false });
}

export function lights(root, pts, intensity = 60, dist = 32, color = 0xfff1e0) {
  for (const [x, y, z] of pts) { const l = new THREE.PointLight(color, intensity, dist, 1.6); l.position.set(x, y, z); root.add(l); }
}

// 吊顶：线性灯槽 + 周边暗槽 + 筒灯
export function ceiling(root, y, color = 0xffffff) {
  const c = plane(root, std(color, { roughness: 0.92, emissive: 0xffffff, emissiveIntensity: 0.04 }), TOWER.W - 0.4, TOWER.D - 0.4, 0, y, 0, 0, Math.PI / 2);
  const slot = new THREE.MeshBasicMaterial({ color: 0xf2e8da });
  for (let x = -18; x <= 18.1; x += 4.5) box(root, slot, 0.09, 0.03, 23, x, y - 0.035, 3.2, { collide: false });
  const cove = std(0x2a2d34, { roughness: 0.8 });
  box(root, cove, TOWER.W - 0.6, 0.06, 0.25, 0, y - 0.06, TOWER.D / 2 - 0.55, { collide: false });
  box(root, cove, 0.25, 0.06, TOWER.D - 0.6, TOWER.W / 2 - 0.55, y - 0.06, 0, { collide: false });
  box(root, cove, 0.25, 0.06, TOWER.D - 0.6, -TOWER.W / 2 + 0.55, y - 0.06, 0, { collide: false });
  const dl = new THREE.MeshBasicMaterial({ color: 0xf6f0e6 });
  const dg = new THREE.CircleGeometry(0.12, 16);
  for (let x = -15.75; x <= 15.8; x += 4.5) for (const z of [-7, 13.5]) { const d = new THREE.Mesh(dg, dl); d.rotation.x = Math.PI / 2; d.position.set(x, y - 0.01, z); root.add(d); }
  return c;
}

// 室内侧窗框：竖向窗棂 + 窗台（从室内看出去更有真实感）
const _mGeo = new Map();
export function windowFrames(root, y, h) {
  const k = h.toFixed(2);
  if (!_mGeo.has(k)) _mGeo.set(k, new THREE.BoxGeometry(0.1, h, 0.18));
  const pts = [];
  for (let x = -20; x <= 20.1; x += 2) pts.push([x, TOWER.D / 2 - 0.12, 0]);
  for (let z = -14; z <= 14.1; z += 2) { pts.push([TOWER.W / 2 - 0.12, z, 1]); pts.push([-TOWER.W / 2 + 0.12, z, 1]); }
  const im = new THREE.InstancedMesh(_mGeo.get(k), std(0x2a2f38, { metalness: 0.7, roughness: 0.4 }), pts.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), qr = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2), v = new THREE.Vector3(), sc = new THREE.Vector3(1, 1, 1);
  pts.forEach(([a, b, side], i) => { m4.compose(v.set(a, y + h / 2, b), side ? qr : q, sc); im.setMatrixAt(i, m4); });
  root.add(im);
  const sill = std(0x9aa0a8, { roughness: 0.85 });
  box(root, sill, TOWER.W - 0.6, 0.45, 0.35, 0, y, TOWER.D / 2 - 0.3, { collide: false });
  box(root, sill, 0.35, 0.45, TOWER.D - 0.6, TOWER.W / 2 - 0.3, y, 0, { collide: false });
  box(root, sill, 0.35, 0.45, TOWER.D - 0.6, -TOWER.W / 2 + 0.3, y, 0, { collide: false });
}

// ---------- 1F 大堂（质感升级版） ----------
export function buildLobby(scene, danmaku) {
  const root = new THREE.Group(); scene.add(root);
  const y = 0.2;
  addCollider(-hw - 0.3, -0.5, -hd - 0.3, hw + 0.3, y, hd + 0.3);
  box(root, std(0xdfe3ea), TOWER.W, 0.2, TOWER.D, 0, 0, 0, { collide: false });

  // —— 抛光大理石地面（清漆反射）——
  const mt = marbleTexture({ tiles: 2 }); mt.repeat.set(TOWER.W / 2.4, TOWER.D / 2.4);
  const marble = new THREE.MeshPhysicalMaterial({ map: mt, color: 0xe2e2e2, roughness: 0.22, metalness: 0, clearcoat: 0.7, clearcoatRoughness: 0.12, envMapIntensity: 1.4 });
  plane(root, marble, TOWER.W - 0.3, TOWER.D - 0.3, 0, y + 0.005, 0, 0, -Math.PI / 2).receiveShadow = true;
  // 深色石材镶边（框出中庭）
  const inlay = new THREE.MeshPhysicalMaterial({ color: 0x1d2027, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.08 });
  for (const [w, d, x, z] of [[20.4, 0.32, 0, 13.8], [20.4, 0.32, 0, -7.4], [0.32, 21.2, -10.2, 3.2], [0.32, 21.2, 10.2, 3.2]]) plane(root, inlay, w, d, x, y + 0.008, z, 0, -Math.PI / 2);
  // 入口拼花
  const med = new THREE.Mesh(new THREE.CircleGeometry(2.6, 64), new THREE.MeshStandardMaterial({ map: medallionTexture(), color: 0xffffff, roughness: 0.55, metalness: 0.1, emissive: 0x2a2010, emissiveIntensity: 0.6 }));
  med.rotation.x = -Math.PI / 2; med.position.set(0, y + 0.03, 7.6); med.scale.setScalar(0.85); med.material.polygonOffset = true; med.material.polygonOffsetFactor = -4; med.renderOrder = 2; root.add(med);

  ceiling(root, 9.55);
  core(root, 'lobby', y, 9.35, '1F');
  // 核心筒下部深色石材包覆
  const darkStone = marbleTexture({ base: '#23262d', vein: 'rgba(220,220,230,', dark: true, tiles: 1, seed: 13 }); darkStone.repeat.set(4, 1);
  const dsM = new THREE.MeshPhysicalMaterial({ map: darkStone, roughness: 0.25, clearcoat: 0.8 });
  for (const [cx, w] of [[-8.1, 1.8], [-3, 3.6], [3, 3.6], [8.1, 1.8]]) plane(root, dsM, w, 3.65, cx, y + 1.825, -9.995);
  for (const x of [-6, 0, 6]) plane(root, dsM, 2.4, 0.85, x, y + 3.225, -9.995);

  // —— 弹幕 LED 巨幕（细边框 + 渐变灯边）——
  const led = plane(root, new THREE.MeshBasicMaterial({ map: danmaku.tex, toneMapped: false }), 17, 5.4, 0, 6.85, -9.93);
  box(root, std(0x101216, { metalness: 0.7, roughness: 0.3 }), 17.5, 5.9, 0.12, 0, 3.9, -9.99, { collide: false });
  const edgeP = new THREE.MeshBasicMaterial({ color: new THREE.Color(PINK).multiplyScalar(1.5), toneMapped: false });
  const edgeB = new THREE.MeshBasicMaterial({ color: new THREE.Color(BLUE).multiplyScalar(1.5), toneMapped: false });
  box(root, edgeP, 8.7, 0.05, 0.05, -4.3, 9.6, -9.9, { collide: false }); box(root, edgeB, 8.7, 0.05, 0.05, 4.3, 9.6, -9.9, { collide: false });
  box(root, edgeP, 8.7, 0.05, 0.05, -4.3, 4.1, -9.9, { collide: false }); box(root, edgeB, 8.7, 0.05, 0.05, 4.3, 4.1, -9.9, { collide: false });
  led.renderOrder = 1;

  // —— 弧形前台（白色石材 + 胡桃木台面 + 粉色灯带）——
  const DC = new THREE.Vector3(0, y, -4), RO = 6.4, RI = 5.5, TH = 0.62, DH = 1.1;
  const deskFront = (() => {
    const c = document.createElement('canvas'); c.width = 2048; c.height = 300; const g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 0, 300); gr.addColorStop(0, '#fbfbfa'); gr.addColorStop(1, '#e6e6e3'); g.fillStyle = gr; g.fillRect(0, 0, 2048, 300);
    g.strokeStyle = 'rgba(160,160,165,0.25)'; g.lineWidth = 2; for (let i = 0; i < 9; i++) { g.beginPath(); g.moveTo(Math.random() * 2048, 0); g.bezierCurveTo(Math.random() * 2048, 100, Math.random() * 2048, 200, Math.random() * 2048, 300); g.stroke(); }
    g.strokeStyle = 'rgba(0,0,0,0.12)'; for (let x = 256; x < 2048; x += 256) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 300); g.stroke(); }
    drawTV(g, 1024 - 190, 150, 120, PINK, 13);
    g.fillStyle = PINK; g.font = 'italic 900 120px "Arial Black",Arial'; g.textBaseline = 'middle'; g.fillText('bilibili', 1024 - 110, 158);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
  })();
  const front = new THREE.Mesh(new THREE.CylinderGeometry(RO, RO, DH, 64, 1, true, -TH, TH * 2), new THREE.MeshPhysicalMaterial({ map: deskFront, roughness: 0.25, clearcoat: 0.6 }));
  front.position.set(DC.x, y + DH / 2, DC.z); front.castShadow = true; root.add(front);
  const back = new THREE.Mesh(new THREE.CylinderGeometry(RI, RI, DH, 48, 1, true, -TH, TH * 2), std(0xeeeeec, { side: THREE.BackSide, roughness: 0.4 }));
  back.position.copy(front.position); root.add(back);
  const top = new THREE.Mesh(new THREE.RingGeometry(RI - 0.1, RO + 0.12, 64, 1, -Math.PI / 2 - TH - 0.02, TH * 2 + 0.04), new THREE.MeshPhysicalMaterial({ map: woodTexture(), color: 0x7a5236, roughness: 0.35, clearcoat: 0.7, side: THREE.DoubleSide }));
  top.rotation.x = -Math.PI / 2; top.position.set(DC.x, y + DH + 0.01, DC.z); root.add(top);
  for (const sgn of [-1, 1]) { const cap = new THREE.Mesh(new THREE.BoxGeometry(RO - RI, DH, 0.08), std(0xeeeeec)); const a = sgn * TH, rm = (RO + RI) / 2; cap.position.set(DC.x + Math.sin(a) * rm, y + DH / 2, DC.z + Math.cos(a) * rm); cap.rotation.y = a + Math.PI / 2; root.add(cap); }
  const strip = new THREE.Mesh(new THREE.TorusGeometry(RO + 0.02, 0.025, 6, 64, TH * 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(PINK).multiplyScalar(2), toneMapped: false }));
  strip.rotation.set(Math.PI / 2, 0, Math.PI / 2 - TH); strip.position.set(DC.x, y + 0.06, DC.z); root.add(strip);
  for (let i = 0; i <= 8; i++) { const a = -TH + i * (TH * 2 / 8), rm = (RO + RI) / 2, cx = DC.x + Math.sin(a) * rm, cz = DC.z + Math.cos(a) * rm; addCollider(cx - 0.55, y, cz - 0.55, cx + 0.55, y + DH, cz + 0.55); }
  // 前台电脑（朝向内侧）+ 两位前台
  const scr = new THREE.MeshBasicMaterial({ map: screenTexture('home', 3) });
  for (const a of [-0.25, 0.25]) {
    const r = RI + 0.25, px = DC.x + Math.sin(a) * r, pz = DC.z + Math.cos(a) * r;
    const m = new THREE.Mesh(boxGeo(0.9, 0.55, 0.05), std(0x222222)); m.position.set(px, y + DH + 0.38, pz); m.rotation.y = a; root.add(m);
    const sp = new THREE.Mesh(new THREE.PlaneGeometry(0.84, 0.5), scr); sp.position.set(px - Math.sin(a) * 0.03, y + DH + 0.38, pz - Math.cos(a) * 0.03); sp.rotation.y = a + Math.PI; root.add(sp);
    const npc = makeSimplePerson(0x1f2a44, 0x2a2026); npc.position.set(DC.x + Math.sin(a) * (RI - 0.7), y, DC.z + Math.cos(a) * (RI - 0.7)); npc.rotation.y = a; root.add(npc);
  }
  hotspot(0, y, 4.2, 3.2, '前台 & 弹幕巨幕', `<p>欢迎来到 <b>哔哩哔哩</b>！弧形前台由整块白色石材打造，身后的 17 米 LED 巨幕实时滚动着弹幕 —— “前方高能”“2333”“awsl”……</p><p>弹幕是 B 站最具代表性的社区文化：观众的评论会以字幕形式从画面上飘过，让“一个人看视频”变成“一群人一起看”。</p><p class="tip">穿过闸机，在电梯门前按 <kbd>E</kbd> 可前往 12 个楼层。</p>`, 'desk');

  // —— 中庭光环吊灯（五层同心环，缓慢旋转）——
  const chand = new THREE.Group(); chand.position.set(0, 0, -1.2); chand.userData.dynamic = true; root.add(chand);
  const rings = [];
  [[3.8, 8.1, '#fff1dc'], [3.1, 7.75, '#ffe4ec'], [2.4, 7.4, '#fff1dc'], [1.7, 7.05, '#ffd0de'], [1.0, 6.7, '#FB7299']].forEach(([r, h, c], i) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.045, 8, 96), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(1.7), toneMapped: false }));
    ring.rotation.x = Math.PI / 2; ring.position.y = h; chand.add(ring); rings.push(ring);
  });
  const cable = new THREE.MeshBasicMaterial({ color: 0x999999 });
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + 0.4; const cb = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 1.5, 4), cable); cb.position.set(Math.cos(a) * 3.8, 8.85, Math.sin(a) * 3.8); chand.add(cb); }
  ctx.animators.push((dt, t) => rings.forEach((r, i) => { r.rotation.z = t * (0.05 + i * 0.02) * (i % 2 ? -1 : 1); r.rotation.x = Math.PI / 2 + Math.sin(t * 0.5 + i) * 0.03; }));

  // —— 速通闸机（靠近自动开门）——
  const gateBody = new THREE.MeshPhysicalMaterial({ color: 0xd9dde3, metalness: 1, roughness: 0.2 });
  const flapMat = new THREE.MeshStandardMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0.35, metalness: 0.6, roughness: 0.05, depthWrite: false });
  const lightOk = new THREE.MeshBasicMaterial({ color: new THREE.Color('#2ee08a').multiplyScalar(1.4), toneMapped: false });
  const flaps = [];
  const gx = [-6.3, -4.5, -2.7, -0.9, 0.9, 2.7, 4.5, 6.3];
  gx.forEach((x, i) => {
    box(root, gateBody, 0.3, 1.0, 1.5, x, y, -7.0);
    box(root, lightOk, 0.22, 0.02, 0.22, x, y + 1.0, -6.45, { collide: false });
    if (i < gx.length - 1) for (const side of [1, -1]) {
      const f = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.7, 0.02), flapMat);
      const pivot = new THREE.Group(); pivot.position.set(side > 0 ? x + 0.15 : gx[i + 1] - 0.15, y + 0.75, -7.0); root.add(pivot);
      f.position.x = side * 0.31; pivot.add(f); pivot.userData = { dynamic: true, side }; flaps.push(pivot);
    }
  });
  // 闸机：靠近时自动“刷工牌”——读卡灯由红转绿 + 滴声 + 屏幕上显示工牌，然后开门
  let gateOpen = 0, swiped = false, swipeCd = 0;
  const readers = gx.map((x) => { const m = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff4d5e').multiplyScalar(1.3), toneMapped: false }); const r = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.14), m); r.rotation.x = -Math.PI / 2 + 0.35; r.position.set(x, y + 1.02, -6.5); r.userData.dynamic = true; root.add(r); return m; });
  ctx.animators.push((dt) => {
    const p = ctx.player?.pos; if (!p) return;
    const near = Math.abs(p.z + 7) < 2.6 && Math.abs(p.x) < 7.5 && p.y < 2;
    if (swipeCd > 0) swipeCd -= dt;
    if (near && !swiped && swipeCd <= 0) { swiped = true; swipeCd = 4; ctx.onGateSwipe && ctx.onGateSwipe(); }
    if (!near && Math.abs(p.z + 7) > 4) swiped = false;
    const open = near && swiped;
    gateOpen += ((open ? 1 : 0) - gateOpen) * Math.min(1, dt * 6);
    flaps.forEach(f => { f.rotation.y = -f.userData.side * gateOpen * 1.45; });
    readers.forEach(m => m.color.set(open ? '#2ee08a' : '#ff4d5e').multiplyScalar(1.3));
  });

  // —— 立柱：白色大理石 + 黄铜收边 + 灯环 ——
  const col = new THREE.MeshPhysicalMaterial({ map: marbleTexture({ seed: 7, tiles: 1 }), roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.05 });
  const brass = new THREE.MeshStandardMaterial({ color: 0xc9a14f, metalness: 1, roughness: 0.25 });
  const ring = new THREE.MeshBasicMaterial({ color: new THREE.Color(PINK).multiplyScalar(1.4), toneMapped: false });
  for (const [x, z] of [[-8, 9], [8, 9], [-8, -4], [8, -4]]) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 9.4, 32), col); c.position.set(x, y + 4.7, z); c.castShadow = true; root.add(c);
    for (const hh of [0.1, 9.25]) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.68, 0.2, 32), brass); b.position.set(x, y + hh, z); root.add(b); }
    const r = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.03, 8, 32), ring); r.rotation.x = Math.PI / 2; r.position.set(x, y + 3, z); root.add(r);
    addCollider(x - 0.68, y, z - 0.68, x + 0.68, 10, z + 0.68);
  }

  // —— 小电视雕塑（黑色石材底座 + 黄铜边）——
  box(root, new THREE.MeshPhysicalMaterial({ color: 0x1d2027, roughness: 0.2, clearcoat: 1 }), 3.6, 0.6, 3.6, -14, y, 6);
  box(root, brass, 3.7, 0.05, 3.7, -14, y + 0.6, 6, { collide: false });
  const tv = makeTV(2.6, PINK, { glowBody: 0.3 }); tv.position.set(-14, y + 0.65, 6); tv.rotation.y = 0.5; root.add(tv); tv.userData.dynamic = true;
  addCollider(-15.8, y, 4.2, -12.2, y + 3.6, 7.8);
  ctx.animators.push((dt, t) => { tv.position.y = y + 0.65 + Math.abs(Math.sin(t * 2.2)) * 0.25; tv.rotation.y = 0.5 + Math.sin(t * 0.7) * 0.3; });
  const tvSpin = { v: 0 };
  ctx.animators.push((dt) => { if (tvSpin.v > 0) { tv.rotation.y += tvSpin.v * dt; tvSpin.v *= Math.pow(0.25, dt); if (tvSpin.v < 0.05) tvSpin.v = 0; } });
  hotspot(-14, y, 6, 3.6, '小电视', `<p><b>小电视</b>是 B 站的吉祥物与 Logo 原型：一台长着天线、会眨眼的复古电视机。</p><p>它代表着“看视频”这件最朴素的快乐，也是无数 UP 主视频片头片尾里的老朋友。</p><p class="tip">你轻轻拍了它一下，它开心地转起了圈 ~</p>`, 'tv', { focusY: 1.8, onInspect: (a) => { tvSpin.v = 9; a.sfx('win'); a.gesture('pat'); } });

  // —— 高达展台（右前方，面向入口与中庭）——
  buildGundam(root, 13.9, y, 4.6, -0.62);

  // —— 历史展板（深色展架 + 黄铜边）——
  const panels = [
    ['2009 · 起源', ['#一个弹幕小站', '2009 年 6 月 26 日', '前身 Mikufans 上线', '随后更名为 bilibili', '从 ACG 爱好者聚集地出发'], '起源 · 2009', '<p>2009 年 6 月 26 日，B 站前身 <b>Mikufans</b> 上线，是一个以 ACG（动画、漫画、游戏）内容为主的弹幕视频网站，后更名为 <b>bilibili</b>。</p>'],
    ['弹幕文化', ['#一起看的快乐', '评论实时飘过画面', '2333 / awsl / 前方高能', '空耳、名场面、合唱', '万物皆可弹幕'], '弹幕文化', '<p>弹幕让评论与视频时间轴绑定，同一时刻的观众仿佛坐在同一间放映厅。<b>“前方高能”</b>提醒、<b>“空降坐标”</b>、全屏合唱……构成了独特的社区氛围。</p>'],
    ['走向资本市场', ['#2018 · 2021', '2018 年 3 月', '登陆美国纳斯达克', '2021 年 3 月', '香港联交所二次上市'], '走向资本市场', '<p>2018 年 3 月，哔哩哔哩在美国纳斯达克上市；2021 年 3 月，又在香港联交所完成二次上市。</p>'],
    ['BML & BW', ['#线上到线下', 'Bilibili Macro Link', '大型线下演唱会', 'Bilibili World', '二次元文化盛会'], 'BML & BW', '<p><b>BML</b>（Bilibili Macro Link）是 B 站主办的大型线下演唱会，<b>BW</b>（Bilibili World）则是集漫展、游戏、舞台于一体的线下盛会，让线上的热爱在现实中相遇。</p>'],
  ];
  panels.forEach(([title, lines, htitle, html], i) => {
    const z = -6 + i * 5;
    const tex = panelTexture(title, lines, { accent: i % 2 ? BLUE : PINK });
    box(root, std(0x23262e, { metalness: 0.4, roughness: 0.5 }), 0.24, 3.7, 2.9, 19.5, y, z);
    box(root, brass, 0.05, 0.05, 2.9, 19.37, y + 3.7, z, { collide: false });
    plane(root, new THREE.MeshBasicMaterial({ map: tex, color: 0xcfcfcf }), 2.6, 3.4, 19.37, y + 1.9, z, -Math.PI / 2);
    const lit = new THREE.MeshBasicMaterial({ color: new THREE.Color(i % 2 ? BLUE : PINK).multiplyScalar(0.25), toneMapped: false });
    box(root, lit, 0.04, 0.06, 2.7, 19.35, y + 0.15, z, { collide: false });
    hotspot(18, y, z, 2.2, htitle, html, 'history', { focusY: 1.9, onInspect: () => { lit.color.set(i % 2 ? BLUE : PINK).multiplyScalar(1.8); setTimeout(() => lit.color.multiplyScalar(0.3), 6000); } });
  });

  // —— 左侧垂直绿植墙 + 地毯休息区 ——
  const gw = greenWallTexture(); gw.repeat.set(5, 2);
  box(root, std(0x1a1d22, { metalness: 0.5 }), 0.3, 6.4, 14.4, -21.45, y + 0.4, 3, { collide: false });
  plane(root, std(0xffffff, { map: gw, roughness: 1 }), 14, 6, -21.28, y + 3.6, 3, Math.PI / 2);
  box(root, std(0x2a2d34, { roughness: 0.6 }), 0.9, 0.6, 14.4, -20.9, y, 3);
  const rugC = document.createElement('canvas'); rugC.width = rugC.height = 512; const rg = rugC.getContext('2d');
  rg.fillStyle = '#e9e4dc'; rg.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 6; i++) { rg.strokeStyle = i % 2 ? 'rgba(251,114,153,0.5)' : 'rgba(0,174,236,0.4)'; rg.lineWidth = 10; rg.beginPath(); rg.arc(256, 256, 40 + i * 38, 0, Math.PI * 2); rg.stroke(); }
  const rugT = new THREE.CanvasTexture(rugC); rugT.colorSpace = THREE.SRGBColorSpace;
  const rug = new THREE.Mesh(new THREE.CircleGeometry(3.6, 48), std(0xffffff, { map: rugT, roughness: 1 })); rug.rotation.x = -Math.PI / 2; rug.position.set(-16, y + 0.012, -1.35); root.add(rug);
  sofa(root, -16, y, -3.5, 0, 0xFB7299);
  sofa(root, -16, y, 0.8, Math.PI, 0x00AEEC);
  box(root, new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.15, clearcoat: 1 }), 2, 0.45, 1.4, -16, y, -1.35);
  const vase = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 0.4, 16), brass); vase.position.set(-16, y + 0.65, -1.35); root.add(vase);

  // —— 后墙木格栅 ——
  const ws = woodSlatTexture(); ws.repeat.set(6, 4);
  const slatMat = std(0xffffff, { map: ws, roughness: 0.6 });
  plane(root, slatMat, 12.6, 9.35, -15.35, y + 4.675, -15.82);
  plane(root, slatMat, 12.6, 9.35, 15.35, y + 4.675, -15.82);

  // —— 干杯 Cafe（木格栅吧台 + 吊灯）——
  box(root, std(0xffffff, { map: woodSlatTexture({ dark: '#1d140e', light: '#6e4a2c' }), roughness: 0.6 }), 9, 1.1, 1.2, -15.5, y, -8.6);
  box(root, new THREE.MeshPhysicalMaterial({ map: marbleTexture({ seed: 3, tiles: 1 }), roughness: 0.15, clearcoat: 1 }), 9.2, 0.08, 1.4, -15.5, y + 1.1, -8.6, { collide: false });
  const cafe = textTexture('干杯 Cafe ( ゜- ゜)つロ', { size: 72, color: '#ffffff', stroke: null, weight: 900 });
  plane(root, new THREE.MeshBasicMaterial({ map: cafe.tex, transparent: true, toneMapped: false, color: new THREE.Color(PINK).multiplyScalar(1.5) }), 1.4 * cafe.aspect, 1.4, -15.5, 4.5, -15.78);
  const shadeM = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.6, roughness: 0.4, side: THREE.DoubleSide });
  const bulb = glow(0xffd6a0, 1.6, 2.4);
  for (let i = 0; i < 4; i++) {
    const x = -18.6 + i * 2.1;
    const sh = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.32, 20, 1, true), shadeM); sh.position.set(x, 3.4, -8.6); root.add(sh);
    const bl = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), bulb); bl.position.set(x, 3.25, -8.6); root.add(bl);
    const cb = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 6, 4), cable); cb.position.set(x, 6.56, -8.6); root.add(cb);
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.09, 0.28, 12), std(i % 2 ? 0xffffff : 0xFB7299)); cup.position.set(x + 0.4, y + 1.28, -8.6); root.add(cup);
  }
  interactable({ pos: new THREE.Vector3(-13, y, -6.9), r: 1.4, icon: '☕', label: '点一杯「三连拿铁」', action: (a) => a.coffee() });
  hotspot(-17.8, y, -6.5, 1.6, '干杯 Cafe', '<p>“<b>( ゜- ゜)つロ 干杯~</b>” 是 B 站最经典的颜文字之一，也是很多人进入 B 站后学会的第一句“黑话”。</p><p>来一杯“三连拿铁”吧：点赞、投币、收藏，一次到位。</p>', 'cafe');

  // —— 周边小店（背光展柜）——
  const back2 = glow(0xfff4ea, 0.35, 0.45);
  for (let i = 0; i < 3; i++) {
    const sx = 12 + i * 3.3;
    box(root, std(0x1f2228, { metalness: 0.4 }), 2.8, 2.6, 0.8, sx, y, -15.2);
    box(root, back2, 2.6, 2.3, 0.02, sx, y + 0.15, -14.79, { collide: false });
    for (const sy of [0.65, 1.55]) box(root, new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.1, transmission: 0, clearcoat: 1 }), 2.6, 0.04, 0.6, sx, y + sy, -14.95, { collide: false });
    for (let k = 0; k < 3; k++) for (let j = 0; j < 2; j++) {
      const m = makeTV(0.38, (k + j + i) % 2 ? PINK : BLUE, { glowBody: 0.4 }); m.position.set(sx - 0.9 + k * 0.9, y + 0.7 + j * 0.9, -14.95); root.add(m);
    }
  }
  const shop = textTexture('bilibili 周边', { size: 64, color: '#ffffff', stroke: null, weight: 900 });
  plane(root, new THREE.MeshBasicMaterial({ map: shop.tex, transparent: true, toneMapped: false, color: new THREE.Color(BLUE).multiplyScalar(1.6) }), 1.1 * shop.aspect, 1.1, 15.3, 4.2, -15.78);
  hotspot(15.3, y, -12.6, 2.6, 'bilibili 周边小店', '<p>货架上摆满了各色小电视手办 —— 粉色和蓝色正是 B 站品牌的两大主色：<b>哔哩粉 #FB7299</b> 与 <b>哔哩蓝 #00AEEC</b>。</p>', 'shop');

  // —— 地面光池（营造灯光层次，替代昂贵的实时反射）——
  const poolT = glowPoolTexture();
  const pool = (x, z, sx, sz, color, op) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(sx, sz), new THREE.MeshBasicMaterial({ map: poolT, color: new THREE.Color(color), transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, y + 0.02, z); m.renderOrder = 3; root.add(m);
  };
  pool(0, -1.2, 11, 11, '#ffd9b0', 0.22);
  pool(0, -8.4, 20, 5, '#7fc8ff', 0.18);
  for (const [x, z] of [[-8, 9], [8, 9], [-8, -4], [8, -4]]) pool(x, z, 3, 3, '#ff9cb9', 0.18);
  pool(-15.5, -8.6, 9, 3.5, '#ffc58a', 0.22);

  for (const [x, z] of [[-20.5, 14.5], [20.5, 14.5], [-6.8, 14.5], [6.8, 14.5], [20.5, -9.2]]) plant(root, x, y, z);
  tree(root, -12, 12.5, 0.75, y + 0.6, true); tree(root, 12, 12.5, 0.75, y + 0.6, true);
  for (const x of [-12, 12]) box(root, new THREE.MeshPhysicalMaterial({ color: 0x1d2027, roughness: 0.2, clearcoat: 1 }), 1.6, 0.6, 1.6, x, y, 12.5);
  lights(root, [[-10, 8, 4], [10, 8, 4], [0, 7, -1.2]], 30, 34, 0xffe8d0);
  // 接触阴影：让家具“落地”
  contactShadow(root, 0, y, -3.2, 14, 4.5, 0.4);
  for (const [x, z] of [[-8, 9], [8, 9], [-8, -4], [8, -4]]) contactShadow(root, x, y, z, 2.4, 2.4, 0.45);
  contactShadow(root, -14, y, 6, 5, 5, 0.4); contactShadow(root, -16, y, -1.35, 5, 6.5, 0.35); contactShadow(root, -15.5, y, -8.6, 10, 2.6, 0.4);
  for (let i = 0; i < 3; i++) contactShadow(root, 12 + i * 3.3, y, -14.6, 3.4, 1.6, 0.35);
  // 前台台面小物：绿植、名片架、铃
  const bell = new THREE.Mesh(new THREE.SphereGeometry(0.08, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), brass); bell.position.set(1.6, y + DH + 0.02, -4 + RO - 0.25); root.add(bell);
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.08, 0.16, 14), std(0x1d2027)); pot.position.set(-1.8, y + DH + 0.09, -4 + RO - 0.3); root.add(pot);
  const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.16, 0), std(0x4caf6a, { flatShading: true })); leaf.position.set(-1.8, y + DH + 0.3, -4 + RO - 0.3); root.add(leaf);
  interactable({ pos: new THREE.Vector3(1.6, y, 3.4), r: 1.3, icon: '🛎️', label: '按一下前台服务铃', cooldown: 1.2, action: (a) => { a.sfx('clink'); a.gesture('pat'); bell.scale.set(1, 0.7, 1); setTimeout(() => bell.scale.set(1, 1, 1), 120); a.toast('叮——前台小姐姐抬头：“您好，请问有预约吗？”', '🛎️', '#FB7299'); } });
  return root;
}

// ---------- 16F 办公区 ----------
export function buildOffice(scene, danmaku) {
  const root = new THREE.Group(); scene.add(root);
  const y = ctx.levels.office.y;
  addCollider(-hw - 0.3, y - 0.4, -hd - 0.3, hw + 0.3, y, hd + 0.3);
  addCollider(-hw - 0.3, y + 3.8, -hd - 0.3, hw + 0.3, y + 4.2, hd + 0.3);
  const ct = carpetTexture(); ct.repeat.set(10, 8);
  plane(root, std(0xffffff, { map: ct, roughness: 0.95 }), TOWER.W - 0.3, TOWER.D - 0.3, 0, y + 0.005, 0, 0, -Math.PI / 2);
  box(root, std(0x8a94a3), TOWER.W - 0.2, 0.3, TOWER.D - 0.2, 0, y - 0.3, 0, { collide: false });
  ceiling(root, y + 3.8, 0xf4f4f4);
  box(root, std(0xf4f4f4), TOWER.W - 0.2, 0.3, TOWER.D - 0.2, 0, y + 3.8, 0, { collide: false });
  core(root, 'office', y, 3.8, '16F');
  windowFrames(root, y, 3.8);
  box(root, std(0xeef0f4, { roughness: 0.7 }), TOWER.W - 0.6, 3.8, 0.12, 0, y, -15.8);
  // 核心筒上的墙面标语
  const slogan = textTexture('你感兴趣的视频都在 B 站', { size: 72, color: '#ffffff', stroke: null, weight: 900 });
  plane(root, new THREE.MeshBasicMaterial({ map: slogan.tex, transparent: true, toneMapped: false, color: new THREE.Color(PINK).multiplyScalar(1.3) }), 0.5 * slogan.aspect, 0.5, -15.5, y + 2.7, -15.62);

  // 工位
  const desk = std(0xf5f5f2, { roughness: 0.4 }), leg = std(0x555b66, { metalness: 0.6 });
  const monFrame = std(0x1b1d22, { metalness: 0.4 });
  const monBack = std(0xc8ccd2, { metalness: 0.6, roughness: 0.35 }), monLogo = new THREE.MeshBasicMaterial({ color: 0xFB7299 });
  const kinds = ['home', 'edit', 'code', 'danmu'];
  const scrMats = kinds.map((k, i) => new THREE.MeshBasicMaterial({ map: screenTexture(k, i + 5), toneMapped: true }));
  const chairMats = [std(0xFB7299, { roughness: 0.8 }), std(0x00AEEC, { roughness: 0.8 })];
  let n = 0;
  for (const cx of [-15, -7, 7, 15]) for (const cz of [-3, 4, 11]) {
    box(root, desk, 5.6, 0.06, 1.8, cx, y + 0.72, cz, { collide: false, cast: true });
    for (const lx of [-2.6, 2.6]) box(root, leg, 0.08, 0.72, 1.6, cx + lx, y, cz, { collide: false });
    box(root, std(0xd5d9df), 5.6, 0.45, 0.04, cx, y + 0.78, cz, { collide: false });
    addCollider(cx - 2.8, y, cz - 0.9, cx + 2.8, y + 1.3, cz + 0.9);
    for (const side of [-1, 1]) for (const ox of [-1.4, 1.4]) {
      const mz = cz + side * 0.35, ry = side > 0 ? Math.PI : 0;
      const f = new THREE.Mesh(boxGeo(1.0, 0.6, 0.03), monFrame); f.position.set(cx + ox, y + 1.18, mz); root.add(f);
      const mback = new THREE.Mesh(boxGeo(0.62, 0.36, 0.05), monBack); mback.position.set(cx + ox, y + 1.16, mz + side * 0.035); root.add(mback);
      const logo = new THREE.Mesh(boxGeo(0.12, 0.03, 0.005), monLogo); logo.position.set(cx + ox, y + 1.2, mz + side * 0.063); root.add(logo);
      const foot = new THREE.Mesh(boxGeo(0.3, 0.015, 0.2), leg); foot.position.set(cx + ox, y + 0.785, mz + side * 0.05); root.add(foot);
      plane(root, scrMats[n++ % 4], 0.94, 0.54, cx + ox, y + 1.18, mz - side * 0.025, ry);
      const st = new THREE.Mesh(boxGeo(0.06, 0.4, 0.06), leg); st.position.set(cx + ox, y + 0.95, mz); root.add(st);
      // 椅子
      const ch = new THREE.Group();
      const seat = new THREE.Mesh(boxGeo(0.6, 0.1, 0.6), chairMats[(n >> 1) % 2]); seat.position.y = 0.5; ch.add(seat);
      const back = new THREE.Mesh(boxGeo(0.6, 0.7, 0.08), chairMats[(n >> 1) % 2]); back.position.set(0, 0.9, 0.3 * side); ch.add(back);
      const p = new THREE.Mesh(boxGeo(0.06, 0.45, 0.06), leg); p.position.y = 0.25; ch.add(p);
      ch.position.set(cx + ox, y, cz + side * 1.35); root.add(ch);
    }
  }
  // 桌面杂物：水杯、书本、键盘；接触阴影
  const kb = new THREE.BoxGeometry(0.42, 0.02, 0.14), mug = new THREE.CylinderGeometry(0.04, 0.035, 0.1, 12), bk = new THREE.BoxGeometry(0.22, 0.04, 0.3);
  const kbM = std(0x2a2d34), mugMs = [std(0xffffff), std(0xFB7299), std(0x00AEEC)], bkMs = [std(0xc0392b), std(0x2980b9), std(0xf39c12)];
  for (const cx of [-15, -7, 7, 15]) for (const cz of [-3, 4, 11]) {
    contactShadow(root, cx, y, cz, 6.4, 3.4, 0.35);
    for (const side of [-1, 1]) for (const ox of [-1.4, 1.4]) {
      const k = new THREE.Mesh(kb, kbM); k.position.set(cx + ox, y + 0.79, cz + side * 0.05); root.add(k);
      if ((cx + cz + ox) % 3 === 0) { const m = new THREE.Mesh(mug, mugMs[Math.abs(cx + cz) % 3]); m.position.set(cx + ox + 0.4, y + 0.82, cz + side * 0.2); root.add(m); }
      if ((cx * cz) % 4 === 0) { const b = new THREE.Mesh(bk, bkMs[Math.abs(cx) % 3]); b.position.set(cx + ox - 0.45, y + 0.79, cz + side * 0.25); b.rotation.y = 0.3; root.add(b); }
    }
  }
  // 可写的白板
  const wbC = document.createElement('canvas'); wbC.width = 512; wbC.height = 256; const wb = wbC.getContext('2d');
  wb.fillStyle = '#f8f9fa'; wb.fillRect(0, 0, 512, 256); wb.strokeStyle = '#c8ccd2'; wb.lineWidth = 6; wb.strokeRect(3, 3, 506, 250);
  wb.fillStyle = '#2a3550'; wb.font = 'bold 26px sans-serif'; wb.fillText('本周 OKR', 24, 44);
  wb.font = '20px sans-serif'; ['· 新功能上线', '· 弹幕性能优化', '· UP 主激励计划'].forEach((t, i) => wb.fillText(t, 30, 90 + i * 34));
  const wbT = new THREE.CanvasTexture(wbC); wbT.colorSpace = THREE.SRGBColorSpace;
  box(root, std(0xd8dde5, { metalness: 0.6 }), 4.2, 2.2, 0.08, -1, y + 0.8, -15.6, { collide: false });
  plane(root, new THREE.MeshBasicMaterial({ map: wbT }), 4, 2, -1, y + 1.9, -15.55);
  let doodles = 0;
  interactable({ pos: new THREE.Vector3(-1, y, -13.6), r: 2.0, icon: '🖊️', label: '在白板上画一笔', cooldown: 0.8, action: (a) => {
    const cols = ['#FB7299', '#00AEEC', '#2ec27e', '#ffb027'];
    wb.strokeStyle = cols[doodles % 4]; wb.lineWidth = 4; wb.lineCap = 'round';
    const x = 300 + Math.random() * 170, yy = 70 + Math.random() * 140;
    wb.beginPath(); wb.arc(x, yy, 16 + Math.random() * 14, 0, Math.PI * 2); wb.stroke();
    wb.beginPath(); wb.moveTo(x - 10, yy - 4); wb.lineTo(x - 4, yy - 4); wb.moveTo(x + 4, yy - 4); wb.lineTo(x + 10, yy - 4); wb.moveTo(x - 7, yy + 6); wb.quadraticCurveTo(x, yy + 12, x + 7, yy + 6); wb.stroke();
    wbT.needsUpdate = true; doodles++; a.gesture('reach'); a.sfx('click');
    a.toast(doodles === 1 ? '你在白板上画了个笑脸 :)' : `白板上已经有 ${doodles} 个笑脸了`, '🖊️', cols[(doodles - 1) % 4]);
  } });
  hotspot(0, y, 4, 3.5, 'UP 主创作工位', '<p>这里是创作者服务与内容运营团队的开放工位。屏幕上有正在剪辑的视频时间轴、B 站首页和代码编辑器。</p><p>B 站把内容创作者称为 <b>UP 主</b>（上传视频的人），每一个“一键三连”都在支持他们继续创作。</p>', 'desk');

  // 会议室（右后）
  const gl = new THREE.MeshStandardMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0.2, metalness: 0.8, roughness: 0.05, depthWrite: false, side: THREE.DoubleSide });
  box(root, gl, 12, 3.8, 0.1, 15.5, y, -5.5);
  box(root, gl, 0.1, 3.8, 2.2, 9.5, y, -6.6);
  box(root, gl, 0.1, 3.8, 6.65, 9.5, y, -12.375);
  box(root, std(0x6b4a33, { roughness: 0.5 }), 6, 0.08, 2.2, 15.5, y + 0.75, -10.5, { collide: false });
  addCollider(12.5, y, -11.6, 18.5, y + 0.9, -9.4);
  plane(root, new THREE.MeshBasicMaterial({ map: danmaku.tex, toneMapped: false }), 6, 2.2, 15.5, y + 2, -15.6);
  for (let i = 0; i < 4; i++) for (const s of [-1, 1]) {
    const c = new THREE.Mesh(boxGeo(0.55, 0.9, 0.55), chairMats[i % 2]); c.position.set(13.2 + i * 1.5, y + 0.45, -10.5 + s * 1.5); root.add(c);
  }
  const mr = textTexture('会议室 · 拜年纪', { size: 56, color: '#18191c', stroke: null });
  plane(root, new THREE.MeshBasicMaterial({ map: mr.tex, transparent: true }), 0.4 * mr.aspect, 0.4, 15.5, y + 3, -5.44);
  hotspot(10.5, y, -8.2, 2.4, '会议室 · 拜年纪', '<p>会议室以 B 站的春节品牌节目 <b>拜年纪</b> 命名。墙上的屏幕同步播放着弹幕巨幕的画面。</p>', 'meet');

  // 休闲区（左后）
  sofa(root, -15.5, y, -7.6, Math.PI, 0x00AEEC, 4);
  const bean = new THREE.SphereGeometry(0.6, 16, 12);
  [[-19.5, -13.2, 0xFB7299], [-17.8, -13.6, 0xffd166], [-12.5, -13.4, 0x00AEEC]].forEach(([x, z, c]) => {
    const b = new THREE.Mesh(bean, std(c, { roughness: 0.9 })); b.scale.set(1, 0.6, 1); b.position.set(x, y + 0.36, z); root.add(b);
    addCollider(x - 0.55, y, z - 0.55, x + 0.55, y + 0.7, z + 0.55);
  });
  box(root, glow(0x00AEEC, 0.6, 1.6), 1.2, 2.2, 0.9, -10.5, y, -15.2);
  box(root, std(0xffffff), 1.0, 1.4, 0.05, -10.5, y + 0.6, -14.73, { collide: false });
  const gacha = makeTV(1.1, PINK, { glowBody: 0.4 }); gacha.position.set(-15.5, y, -15); root.add(gacha);
  addCollider(-16.1, y, -15.4, -14.9, y + 1.2, -14.6);
  hotspot(-15.5, y, -11.5, 3, '休闲区', '<p>懒人沙发、零食饮料机和小电视扭蛋机 —— 创作累了就来这里“摸鱼”五分钟，顺便刷两条鬼畜视频回回血。</p>', 'cafe');

  // 窗边观景
  hotspot(0, y, 13.8, 3, '16F 城市景观', '<p>透过落地玻璃幕墙，可以俯瞰园区广场、飞舞的弹幕和周边城市的点点灯光。</p><p class="tip">按 <kbd>N</kbd> 切换白天 / 夜晚，看看不同时间的城市。</p>', 'view');
  for (const [x, z] of [[-20.6, 14.6], [20.6, 14.6], [-3.5, 14.6], [3.5, 14.6]]) plant(root, x, y, z);
  lights(root, [[-12, y + 3.3, 6], [12, y + 3.3, 6], [-12, y + 3.3, -8], [8, y + 3.3, -2]], 45, 24);
  return root;
}

// ---------- 天台 ----------
export function buildRoof(scene) {
  const root = new THREE.Group(); scene.add(root);
  const y = ctx.levels.roof.y;
  const wt = woodTexture(); wt.repeat.set(8, 6);
  plane(root, std(0xffffff, { map: wt, roughness: 0.8 }), TOWER.W - 0.6, TOWER.D - 0.6, 0, y + 0.01, 0, 0, -Math.PI / 2).receiveShadow = true;
  core(root, 'roof', y, 4.5, 'RF');
  const cheers = textTexture('( ゜- ゜)つロ 干杯~', { size: 80, color: '#ffffff', stroke: null, weight: 900 });
  plane(root, new THREE.MeshBasicMaterial({ map: cheers.tex, transparent: true, toneMapped: false, color: new THREE.Color(PINK).multiplyScalar(1.6) }), 0.8 * cheers.aspect, 0.8, 0, y + 3.95, -9.93);
  // 发光地标线
  const g = new THREE.MeshBasicMaterial({ color: new THREE.Color(BLUE).multiplyScalar(1.3), toneMapped: false });
  box(root, g, 0.15, 0.02, 18, -3, y, 4, { collide: false });
  box(root, g, 0.15, 0.02, 18, 3, y, 4, { collide: false });
  // 花坛与长椅
  const planter = std(0xe9ecf1);
  for (const [x, z] of [[-17, -12], [17, -12], [-17, 11], [17, 11]]) {
    box(root, planter, 4, 0.8, 4, x, y, z);
    tree(root, x, z, 0.8, y + 0.8, false);
  }
  for (const [x, z, ry] of [[-11, 13, 0], [11, 13, 0], [-19.5, 0, Math.PI / 2], [19.5, 0, -Math.PI / 2]]) {
    sofa(root, x, y, z, ry, 0xffffff, 3);
  }
  // 望远镜
  const tel = new THREE.Group();
  const tm = std(0x2b3038, { metalness: 0.8, roughness: 0.3 });
  const legG = new THREE.CylinderGeometry(0.04, 0.04, 1.3, 6);
  for (let i = 0; i < 3; i++) { const l = new THREE.Mesh(legG, tm); const a = i * Math.PI * 2 / 3; l.position.set(Math.cos(a) * 0.25, 0.6, Math.sin(a) * 0.25); l.rotation.set(Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35); tel.add(l); }
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.16, 1.1, 16), std(0xFB7299, { metalness: 0.4 })); tube.rotation.x = Math.PI / 2 - 0.35; tube.position.set(0, 1.35, 0.2); tel.add(tube);
  tel.position.set(-8, y, 14.2); root.add(tel);
  addCollider(-8.4, y, 13.8, -7.6, y + 1.6, 14.6);
  hotspot(-8, y, 13, 2.2, '观景望远镜', '<p>这里是大楼最高处，海拔约 <b>130 米</b>。</p><p>向前看是园区广场和飘过的弹幕，远处是一片灯火通明的城市楼群。红色闪烁的是楼顶航空障碍灯。</p><p class="tip">按 <kbd>V</kbd> 进入鸟瞰模式，可用鼠标环绕查看整栋大楼。</p>', 'view');
  lights(root, [[0, y + 6, 8]], 120, 40, 0xffd6e4);
  return root;
}
