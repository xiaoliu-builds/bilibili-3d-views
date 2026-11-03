// 哔哩哔哩新世代产业园（上海杨浦滨江）概念场景
// 参考公开信息：总建筑面积约 78 万㎡，一栋主塔「数字云塔」（N3）+ 十余栋办公独栋 + 文化商业空间，
// 标志性球形建筑「哔哩球」，定位 B站文化的“滨江梦幻岛”。以下为风格化还原，非真实建筑复刻。
import * as THREE from 'three';
import { ctx, box, addCollider, std, glow, plane, hotspot, registerNight, tree } from './common.js';
import { interactable, landmarks } from './districts.js';
import { facadeGlass, logo3DTexture, textTexture, drawTV, PINK, BLUE, FONT } from './textures.js';

export const NEWGEN = { x0: 112, x1: 290, z0: 112, z1: 290, cx: 200, cz: 200 };
const add = THREE.AdditiveBlending;

function glassMat(cols, floors, seed, night = 0.8) {
  const t = facadeGlass(cols, floors, seed);
  return registerNight(new THREE.MeshStandardMaterial({ map: t.map, emissiveMap: t.emissiveMap, emissive: 0xffffff, roughness: 0.12, metalness: 0.5, envMapIntensity: 4 }), 0, night);
}
function label(root, text, x, y, z, ry = 0, size = 1.4, bg = 'rgba(16,20,30,0.85)', color = '#fff') {
  const t = textTexture(text, { size: 56, color, stroke: null, bg, pad: 20 });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size * t.aspect, size), new THREE.MeshBasicMaterial({ map: t.tex, transparent: true, side: THREE.DoubleSide, toneMapped: false }));
  m.position.set(x, y, z); m.rotation.y = ry; root.add(m); return m;
}

// ---------- 黄浦江岸线：江面 + 防汛墙 + 木栈道 + 灯柱 + 江上游船 ----------
function riverfront(root) {
  const { x0, x1, z0, z1 } = NEWGEN;
  // 江面：沿园区南侧与东侧外围（L 形）
  const waterMat = new THREE.MeshStandardMaterial({ color: 0x1d4a6b, roughness: 0.25, metalness: 0.2, emissive: 0x08223a, emissiveIntensity: 0.4, envMapIntensity: 0.8 });
  registerNight(waterMat, 0.15, 0.55);
  const south = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0 + 40, 60), waterMat); south.rotation.x = -Math.PI / 2; south.position.set((x0 + x1) / 2 + 20, 0.03, z1 + 2); root.add(south);
  // 波光：缓慢滚动的高光条纹
  const c = document.createElement('canvas'); c.width = 256; c.height = 256; const g = c.getContext('2d');
  for (let i = 0; i < 220; i++) { g.fillStyle = `rgba(255,255,255,${0.05 + Math.random() * 0.2})`; g.fillRect(Math.random() * 256, Math.random() * 256, 6 + Math.random() * 26, 1.5); }
  const st = new THREE.CanvasTexture(c); st.wrapS = st.wrapT = THREE.RepeatWrapping; st.repeat.set(8, 3);
  const sparkle = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0 + 40, 60), new THREE.MeshBasicMaterial({ map: st, transparent: true, opacity: 0.35, blending: add, depthWrite: false, toneMapped: false }));
  sparkle.rotation.x = -Math.PI / 2; sparkle.position.set((x0 + x1) / 2 + 20, 0.05, z1 + 2); root.add(sparkle);
  ctx.animators.push((dt, t) => { st.offset.x = t * 0.01; st.offset.y = Math.sin(t * 0.3) * 0.02; });
  // 防汛墙 + 玻璃栏杆（不可越过）
  const wall = std(0xcfd4dc, { roughness: 0.7 });
  box(root, wall, x1 - x0, 0.9, 0.6, (x0 + x1) / 2, 0, z1 - 4.2, { collide: true });
  const railG = new THREE.MeshStandardMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0.25, metalness: 0.8, roughness: 0.05, depthWrite: false });
  box(root, railG, x1 - x0, 1.1, 0.06, (x0 + x1) / 2, 0.9, z1 - 4.2, { collide: false });
  addCollider(x0, 0, z1 - 4.5, x1, 3, z1 - 3.9);
  // 滨江木栈道
  const deck = new THREE.MeshStandardMaterial({ color: 0x8d6b4f, roughness: 0.8 });
  box(root, deck, x1 - x0, 0.08, 9, (x0 + x1) / 2, 0, z1 - 9, { collide: false, receive: true });
  // 栈道灯柱（夜间暖光）
  const pole = std(0x2a2f38, { metalness: 0.7, roughness: 0.4 }), head = glow(0xffe0b0, 0.2, 1.8);
  for (let x = x0 + 6; x < x1; x += 12) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 4.2, 8), pole); p.position.set(x, 2.1, z1 - 5.2); root.add(p);
    const h = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), head); h.position.set(x, 4.3, z1 - 5.2); root.add(h);
    (ctx.lampSpots ||= []).push([x, z1 - 6]);
    addCollider(x - 0.12, 0, z1 - 5.32, x + 0.12, 4.2, z1 - 5.08);
  }
  // 江上游船（缓慢往返）
  const boat = new THREE.Group(); boat.userData.dynamic = true; root.add(boat);
  const hull = new THREE.Mesh(new THREE.BoxGeometry(14, 1.6, 4), std(0xf2f4f7, { roughness: 0.4 })); hull.position.y = 0.6; boat.add(hull);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(9, 1.8, 3.4), new THREE.MeshStandardMaterial({ color: 0x1d2a3a, emissive: 0xffd9a0, emissiveIntensity: 0.4 })); cabin.position.y = 2.2; boat.add(cabin);
  registerNight(cabin.material, 0.05, 0.9);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(14.05, 0.2, 4.05), new THREE.MeshBasicMaterial({ color: new THREE.Color(PINK).multiplyScalar(1.4), toneMapped: false })); stripe.position.y = 1.2; boat.add(stripe);
  ctx.animators.push((dt, t) => { boat.position.set(x0 + 30 + ((Math.sin(t * 0.03) + 1) / 2) * (x1 - x0 - 20), 0.1 + Math.sin(t * 1.2) * 0.05, z1 + 12); boat.rotation.z = Math.sin(t * 0.9) * 0.01; });
  // 对岸（陆家嘴方向）天际线剪影
  const sky = new THREE.MeshBasicMaterial({ color: 0x23284a, fog: true });
  for (let i = 0; i < 14; i++) { const w = 10 + Math.random() * 14, h = 30 + Math.random() * 90; const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 10), sky); b.position.set(x0 + i * 14 + Math.random() * 6, h / 2, z1 + 46); root.add(b); }
}

// ---------- 「数字云塔」（N3 主塔）：曲面玻璃 + 收分 + 顶部发光云环 ----------
function cloudTower(root) {
  const cx = 214, cz = 168, H = 150;
  const g = new THREE.Group(); g.position.set(cx, 0, cz); root.add(g);
  const glass = glassMat(28, 36, 101, 0.75);
  // 三段收分圆角塔身（扁圆柱）
  const segs = [[0, 60, 15, 11], [60, 110, 13.5, 10], [110, H, 12, 9]];
  for (const [y0, y1, rx, rz] of segs) {
    const geo = new THREE.CylinderGeometry(1, 1, y1 - y0, 48, 1, false); geo.scale(rx, 1, rz);
    const m = new THREE.Mesh(geo, glass); m.position.y = (y0 + y1) / 2; m.castShadow = true; g.add(m);
    // 每段之间的空中花园平台（绿植 + 灯带）
    const plat = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.8, 48), std(0xe6eaf0, { metalness: 0.5, roughness: 0.3 })); plat.scale.set(rx + 1.2, 1, rz + 1.2); plat.position.y = y1; g.add(plat);
    const green = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.5, 48), std(0x4f8f4a, { roughness: 1, flatShading: true })); green.scale.set(rx + 0.8, 1, rz + 0.8); green.position.y = y1 + 0.6; g.add(green);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.012, 6, 64), new THREE.MeshBasicMaterial({ color: new THREE.Color(BLUE).multiplyScalar(1.5), toneMapped: false }));
    ring.rotation.x = Math.PI / 2; ring.scale.set(rx + 1.25, rz + 1.25, 1); ring.position.y = y1 - 0.35; g.add(ring);
  }
  // 竖向发光肋（像云中的光丝）
  const ribM = new THREE.MeshBasicMaterial({ color: new THREE.Color('#bfe8ff').multiplyScalar(1.1), toneMapped: false, transparent: true, opacity: 0.6 });
  for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; const r = new THREE.Mesh(new THREE.BoxGeometry(0.12, 108, 0.12), ribM); r.position.set(Math.cos(a) * 15.05, 54, Math.sin(a) * 11.05); g.add(r); }
  ctx.nightMats.push({ mat: { set emissiveIntensity(v) { ribM.opacity = 0.2 + v * 0.5; } }, day: 0.1, night: 1 });
  // 顶部“数字云”：多层半透明发光云团，缓慢旋转
  const cloud = new THREE.Group(); cloud.position.y = H + 4; g.add(cloud); cloud.userData.dynamic = true;
  const cloudM = new THREE.MeshStandardMaterial({ color: 0xeef6ff, emissive: 0x7fc8ff, emissiveIntensity: 0.6, transparent: true, opacity: 0.85, roughness: 0.6 });
  registerNight(cloudM, 0.15, 0.9);
  for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; const s = new THREE.Mesh(new THREE.SphereGeometry(3.4 + (i % 3), 16, 12), cloudM); s.position.set(Math.cos(a) * 7, Math.sin(i * 1.7) * 1.4, Math.sin(a) * 5); cloud.add(s); }
  const core = new THREE.Mesh(new THREE.SphereGeometry(4.6, 20, 14), cloudM); cloud.add(core);
  ctx.animators.push((dt, t) => { cloud.rotation.y = t * 0.05; cloud.position.y = H + 4 + Math.sin(t * 0.6) * 0.4; });
  // 塔冠蓝色立体 Logo
  const lt = logo3DTexture({ w: 1024, h: 300 });
  const lm = new THREE.MeshBasicMaterial({ map: lt, transparent: true, toneMapped: false, depthWrite: false });
  plane(g, lm, 16, 4.7, 0, H - 8, 9.6, 0); plane(g, lm, 16, 4.7, 0, H - 8, -9.6, Math.PI);
  // 底部挑高入口 + 雨棚
  box(g, std(0x1c2027, { metalness: 0.7, roughness: 0.35 }), 14, 0.5, 6, 0, 8, 13, { collide: false });
  box(g, new THREE.MeshBasicMaterial({ color: new THREE.Color(PINK).multiplyScalar(1.5), toneMapped: false }), 14, 0.08, 0.08, 0, 7.96, 16, { collide: false });
  addCollider(cx - 15, 0, cz - 11, cx + 15, H, cz + 11);
  label(root, '数字云塔 · N3', cx, 10.2, cz + 16.05, 0, 1.3, 'rgba(0,174,236,0.92)');
  hotspot(cx, 0, cz + 19, 3.4, '数字云塔', '<p>新世代产业园的主塔以 <b>“数字云塔”</b> 为设计理念，集成数字文化总部、动漫孵化基地等功能。</p><p>塔身三段收分，每段之间是空中花园；塔顶这团会发光的“云”，象征数字内容在这里生长、汇聚。</p><p class="tip">本场景为风格化概念还原，并非真实建筑复刻。</p>', 'view', { focusY: 30 });
  return g;
}

// ---------- 「哔哩球」：球形标志建筑（网格结构 + LED 弹幕屏）----------
function biliBall(root) {
  const cx = 160, cz = 238, R = 22;
  const g = new THREE.Group(); g.position.set(cx, 0, cz); root.add(g);
  // LED 球幕：滚动弹幕的动态画布贴图
  const C = document.createElement('canvas'); C.width = 1024; C.height = 512; const G = C.getContext('2d');
  const tex = new THREE.CanvasTexture(C); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = THREE.RepeatWrapping;
  const words = ['欢迎来到滨江梦幻岛', '哔哩哔哩 干杯~', '前方高能', '一键三连', '2333333', '新世代 新热爱', 'awsl', '你感兴趣的视频都在B站', 'BML · BW · 拜年纪'];
  const items = []; // 环境弹幕已移除（性能），仅显示玩家发送的
  let acc = 0, T = 0;
  const draw = (dt) => {
    acc += dt; T += dt; if (acc < 1 / 8) return; acc = 0;
    const k = (Math.sin(T * 0.25) + 1) / 2;
    const gr = G.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, `hsl(${320 + k * 30},70%,${22 + k * 8}%)`); gr.addColorStop(1, `hsl(${200 - k * 20},80%,${18 + (1 - k) * 8}%)`);
    G.fillStyle = gr; G.fillRect(0, 0, 1024, 512);
    // 中央大号小电视
    drawTV(G, 512, 250, 180 + Math.sin(T * 2) * 6, 'rgba(255,255,255,0.92)', 16);
    G.font = `900 30px ${FONT}`; G.textBaseline = 'middle';
    for (const it of items) { it.x -= it.v / 8; if (it.x < -320) { it.dead = true; continue; } G.lineWidth = 5; G.strokeStyle = 'rgba(0,0,0,0.5)'; G.strokeText(it.w, it.x, it.y); G.fillStyle = it.c; G.fillText(it.w, it.x, it.y); }
    for (let i = items.length - 1; i >= 0; i--) if (items[i].dead) items.splice(i, 1);
    // LED 点阵
    G.fillStyle = 'rgba(0,0,0,0.25)'; for (let y = 0; y < 512; y += 6) G.fillRect(0, y, 1024, 2);
    tex.needsUpdate = true;
  };
  ctx.animators.push((dt) => { if (g.visible) draw(dt); });
  const ballMat = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false });
  const ball = new THREE.Mesh(new THREE.SphereGeometry(R, 64, 40), ballMat); ball.position.y = R * 0.92; g.add(ball); ball.userData.dynamic = true;
  // 外层网格结构（经纬钢架）
  const lat = new THREE.MeshStandardMaterial({ color: 0xdfe5ec, metalness: 0.9, roughness: 0.25 });
  for (let i = 1; i < 10; i++) { const a = i / 10 * Math.PI; const r = Math.sin(a) * (R + 0.4); const t = new THREE.Mesh(new THREE.TorusGeometry(r, 0.12, 6, 80), lat); t.rotation.x = Math.PI / 2; t.position.y = R * 0.92 + Math.cos(a) * (R + 0.4); g.add(t); }
  for (let i = 0; i < 18; i++) { const t = new THREE.Mesh(new THREE.TorusGeometry(R + 0.4, 0.12, 6, 80, Math.PI), lat); t.rotation.set(0, i / 18 * Math.PI * 2, Math.PI / 2); t.position.y = R * 0.92; g.add(t); }
  // 底座 + 入口
  box(g, std(0x23262e, { metalness: 0.4, roughness: 0.5 }), 26, 3, 26, 0, 0, 0, { collide: false });
  box(g, new THREE.MeshBasicMaterial({ color: new THREE.Color(BLUE).multiplyScalar(1.4), toneMapped: false }), 26.2, 0.1, 26.2, 0, 3, 0, { collide: false });
  addCollider(cx - 13, 0, cz - 13, cx + 13, R * 2, cz + 13);
  // 地面光晕
  const halo = new THREE.Mesh(new THREE.RingGeometry(14, 30, 64), new THREE.MeshBasicMaterial({ color: 0xff9cc8, transparent: true, opacity: 0.18, blending: add, depthWrite: false, toneMapped: false }));
  halo.rotation.x = -Math.PI / 2; halo.position.set(cx, 0.06, cz); root.add(halo);
  label(root, '哔哩球 · BILI SPHERE', cx, 5.2, cz - 13.1, Math.PI, 1.3, 'rgba(251,114,153,0.92)');
  hotspot(cx, 0, cz - 17, 3.4, '哔哩球', '<p>正在杨浦滨江拔地而起的巨大球形建筑 <b>“哔哩球”</b>，将成为 B站“滨江梦幻岛”的标志，点亮整片江岸。</p><p>这里把它想象成一颗 360° 的 LED 弹幕球——全天滚动着 UP 主与观众的弹幕。</p><p class="tip">本场景为风格化概念还原，并非真实建筑复刻。</p>', 'tv', { focusY: 20 });
  interactable({ pos: new THREE.Vector3(cx, 0, cz - 15.5), r: 3, icon: '💬', label: '在哔哩球上发一条弹幕', cooldown: 3, action: (a) => {
    const w = ['滨江梦幻岛打卡！', '新世代，新热爱', '干杯 (゜-゜)つロ'][Math.floor(Math.random() * 3)];
    items.push({ w, x: 1024, y: 40 + Math.floor(Math.random() * 13) * 34, v: 70, c: '#ffe17a' });
    a.sfx('send'); a.toast(`你的弹幕「${w}」出现在哔哩球上了！`, '💬', PINK);
  } });
  return g;
}

// ---------- 办公独栋群：错落的低层玻璃楼 + 屋顶花园 + 连廊 ----------
function officeVillage(root) {
  const blocks = [
    [140, 150, 22, 18, 28, 211], [168, 140, 18, 16, 22, 212], [140, 182, 20, 16, 34, 213], [255, 140, 20, 18, 24, 214],
    [262, 172, 18, 20, 30, 215], [250, 208, 22, 16, 20, 216], [196, 214, 16, 14, 18, 217], [272, 240, 20, 16, 26, 218],
  ];
  const roofG = std(0x4f8f4a, { roughness: 1, flatShading: true }), edge = std(0xe6eaf0, { metalness: 0.5, roughness: 0.3 });
  const names = ['UP 主创作中心', '动漫孵化基地', 'B站会员购', '游戏研发中心', '电竞训练基地', 'MCN 机构园', '音乐工坊', '虚拟主播中心'];
  blocks.forEach(([x, z, w, d, h, seed], i) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), glassMat(Math.round(w / 2), Math.round(h / 4), seed, 0.7));
    m.position.set(x, h / 2, z); m.castShadow = true; root.add(m);
    box(root, edge, w + 0.6, 0.6, d + 0.6, x, h, z, { collide: false });
    box(root, roofG, w - 1, 0.4, d - 1, x, h + 0.6, z, { collide: false });
    for (let k = 0; k < 3; k++) tree(root, x - w / 3 + k * (w / 3), z, 0.6, h + 1, false);
    addCollider(x - w / 2, 0, z - d / 2, x + w / 2, h + 2, z + d / 2);
    // 楼名牌
    label(root, names[i], x, Math.min(h - 3, 9), z + d / 2 + 0.06, 0, 0.9, i % 2 ? 'rgba(0,174,236,0.9)' : 'rgba(251,114,153,0.9)');
    (ctx.cityFootprints ||= []).push({ x, z, w, d });
  });
  // 二层空中连廊（粉色玻璃）
  const bridgeM = new THREE.MeshStandardMaterial({ color: 0xffc2d8, transparent: true, opacity: 0.35, metalness: 0.6, roughness: 0.1, depthWrite: false });
  for (const [x, z, w, d] of [[154, 145, 6, 4], [140, 166, 4, 14], [258, 156, 4, 14], [256, 224, 4, 16]]) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, 3.2, d), bridgeM); b.position.set(x, 9.6, z); root.add(b); }
}

// ---------- 中央草坪 + 下沉广场 + 二次元雕塑 + 园区入口 ----------
function plazaAndGate(root) {
  const { x0, x1, z0, z1, cx, cz } = NEWGEN;
  // 园区铺装
  const pave = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0 - 6), std(0x7d8492, { roughness: 0.9 }));
  pave.rotation.x = -Math.PI / 2; pave.position.set(cx, 0.025, cz - 3); pave.receiveShadow = true; root.add(pave);
  // 中央草坪（椭圆）
  const lawn = new THREE.Mesh(new THREE.CircleGeometry(1, 48), std(0x5a9a5c, { roughness: 1 })); lawn.scale.set(26, 18, 1);
  lawn.rotation.x = -Math.PI / 2; lawn.position.set(205, 0.04, 238); root.add(lawn);
  for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; tree(root, 205 + Math.cos(a) * 24, 238 + Math.sin(a) * 16, 1.1, 0.04); }
  // 下沉广场（圆形台阶，可走下去）
  for (let i = 0; i < 4; i++) {
    const ring = new THREE.Mesh(new THREE.RingGeometry(9 - i * 1.6, 9 - i * 1.6 + 1.6, 48), std(0xd6dbe3, { roughness: 0.7, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.set(186, 0.05, 192); root.add(ring);
  }
  // 中央：巨型 3D 小电视雕塑（粉色）+ 喷雾
  const tvG = new THREE.Group(); tvG.position.set(186, 0, 192); root.add(tvG); tvG.userData.dynamic = true;
  const bodyM = std(PINK, { roughness: 0.35, metalness: 0.2, emissive: PINK, emissiveIntensity: 0.15 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(6, 4.6, 3), bodyM); body.position.y = 3.6; tvG.add(body);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 3.4), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  face.position.set(0, 3.6, 1.51); tvG.add(face);
  const fc = document.createElement('canvas'); fc.width = 256; fc.height = 180; const fg = fc.getContext('2d');
  fg.fillStyle = '#fff'; fg.fillRect(0, 0, 256, 180); fg.strokeStyle = '#222'; fg.lineWidth = 14; fg.lineCap = 'round';
  fg.beginPath(); fg.moveTo(56, 70); fg.lineTo(100, 84); fg.moveTo(200, 70); fg.lineTo(156, 84); fg.stroke();
  fg.lineWidth = 10; fg.beginPath(); fg.moveTo(98, 118); fg.quadraticCurveTo(113, 140, 128, 118); fg.quadraticCurveTo(143, 140, 158, 118); fg.stroke();
  const ft = new THREE.CanvasTexture(fc); ft.colorSpace = THREE.SRGBColorSpace; face.material.map = ft;
  for (const sx of [-1, 1]) { const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 2.2, 8), bodyM); ant.position.set(sx * 1.2, 6.6, 0); ant.rotation.z = sx * 0.5; tvG.add(ant); const ball = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 10), bodyM); ball.position.set(sx * 1.75, 7.5, 0); tvG.add(ball); }
  ctx.animators.push((dt, t) => { tvG.rotation.y = Math.sin(t * 0.4) * 0.35; body.position.y = 3.6 + Math.sin(t * 1.6) * 0.15; face.position.y = body.position.y; });
  addCollider(183, 0, 190, 189, 6, 194);
  // 园区入口门楼（北侧，面向主城区）
  const gate = new THREE.Group(); gate.position.set(cx, 0, z0 + 2); root.add(gate);
  const pillar = std(0xf2f4f7, { roughness: 0.3 });
  for (const sx of [-14, 14]) box(gate, pillar, 2, 9, 2, sx, 0, 0, { collide: false });
  box(gate, std(0x1c2027, { metalness: 0.7 }), 30, 2.2, 2.2, 0, 9, 0, { collide: false });
  box(gate, new THREE.MeshBasicMaterial({ color: new THREE.Color(PINK).multiplyScalar(1.5), toneMapped: false }), 30, 0.12, 2.3, 0, 9, 0, { collide: false });
  label(gate, '哔哩哔哩新世代产业园 · 滨江梦幻岛', 0, 10.1, 1.15, 0, 1.25, 'rgba(16,20,30,0.92)');
  label(gate, '哔哩哔哩新世代产业园 · 滨江梦幻岛', 0, 10.1, -1.15, Math.PI, 1.25, 'rgba(16,20,30,0.92)');
  for (const sx of [-14, 14]) addCollider(cx + sx - 1, 0, z0 + 1, cx + sx + 1, 9, z0 + 3);
  // 指示牌
  label(root, '← 数字云塔　　哔哩球 →', cx - 6, 3, z0 + 12, 0, 0.9, 'rgba(0,174,236,0.9)');
}

// ---------- 地铁 12 号线·新世代站（滨江站）----------
function station(root) {
  const x = 128, z = 122;
  const gl = new THREE.MeshStandardMaterial({ color: 0xa8d6f0, transparent: true, opacity: 0.35, metalness: 0.8, roughness: 0.05, depthWrite: false });
  box(root, std(0x2a3340, { metalness: 0.7 }), 0.3, 1.2, 8, x - 3.5, 0, z, { collide: true });
  box(root, std(0x2a3340, { metalness: 0.7 }), 0.3, 1.2, 8, x + 3.5, 0, z, { collide: true });
  box(root, gl, 7.6, 0.2, 8.6, x, 3.4, z, { collide: false });
  label(root, '地铁 12 号线 · 新世代站', x, 4.6, z + 4.4, 0, 0.7, 'rgba(230,0,18,0.9)');
  interactable({ pos: new THREE.Vector3(x, 0, z + 1), r: 3, icon: '🚇', label: '乘坐地铁（快速出行）', action: (a) => a.metro() });
}

export function buildNewGen(scene) {
  const root = new THREE.Group(); scene.add(root);
  riverfront(root); plazaAndGate(root); cloudTower(root); biliBall(root); officeVillage(root); station(root);
  landmarks.push({ name: '新世代产业园', desc: 'B站在杨浦滨江打造的“滨江梦幻岛”：数字云塔、哔哩球与十余栋办公独栋。', pos: new THREE.Vector3(200, 0, 200), r: 50, found: false, icon: '🏙️' });
  root.userData.center = new THREE.Vector3(200, 0, 200);
  return root;
}
