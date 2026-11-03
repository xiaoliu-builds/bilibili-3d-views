// 西北街区：哔哩卡丁车场 —— 3 圈比赛（玩家 + 3 台 AI）、起跑灯、加速带、名次、圈速纪录
import * as THREE from 'three';
import { ctx, box, addCollider, std, glow, hotspot, tree } from './common.js';
import { interactable, landmarks } from './districts.js';
import { drawTV, PINK, BLUE, FONT } from './textures.js';
import { addNPC } from './people.js';
import { ZONES, Z, label, neon, zone, ground, canvasTex, instanced } from './zone_util.js';

const $ = (s) => document.querySelector(s);
const { x: CX, z: CZ } = ZONES.kart;
const RAW = [[-35, -66], [-10, -68], [40, -66], [68, -44], [64, -12], [32, 0], [16, 20], [32, 40], [64, 50], [60, 70], [12, 72], [-30, 58], [-64, 42], [-72, 2], [-68, -38], [-60, -62]];
const W = 11, N = 720, LAPS = 3;
let S = [], T = [], NRM = [], SPD = [], LEN = 1, STEP = 1, OUT = 1;
let kartRig = null, gantry = null, ais = [], race = null, engine = null, bestBoard = null;
const BOOST = [[60, 90], [300, 330], [520, 545]];

// ---------------------------------------------------------------- 赛道几何
function buildTrack(root) {
  const curve = new THREE.CatmullRomCurve3(RAW.map(([x, z]) => new THREE.Vector3(CX + x, 0, CZ + z)), true, 'centripetal');
  S = curve.getSpacedPoints(N); S.pop(); LEN = curve.getLength(); STEP = LEN / N;
  T = S.map((p, i) => S[(i + 1) % N].clone().sub(S[(i - 1 + N) % N]).normalize());
  NRM = T.map(t => new THREE.Vector3(t.z, 0, -t.x));
  let A = 0; for (let i = 0; i < N; i++) { const a = S[i], b = S[(i + 1) % N]; A += (a.x - CX) * (b.z - CZ) - (b.x - CX) * (a.z - CZ); }
  OUT = A > 0 ? 1 : -1;
  // 弯道限速（AI 用）：曲率 → 速度，再做一次反向平滑提前刹车
  const k = S.map((_, i) => { const a = T[(i - 6 + N) % N], b = T[(i + 6) % N]; return Math.acos(Math.min(1, Math.max(-1, a.dot(b)))) / (12 * STEP); });
  SPD = k.map(c => Math.min(21, Math.sqrt(16 / Math.max(c, 1e-4))));
  for (let pass = 0; pass < 2; pass++) for (let i = N * 2; i >= 0; i--) { const a = i % N, b = (i + 1) % N; SPD[a] = Math.min(SPD[a], Math.sqrt(SPD[b] * SPD[b] + 2 * 9 * STEP)); }
  // 路面
  const asphalt = canvasTex(256, 256, (g) => {
    g.fillStyle = '#3a3e46'; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 2600; i++) { const v = 40 + Math.random() * 40; g.fillStyle = `rgba(${v},${v + 4},${v + 10},0.6)`; g.fillRect(Math.random() * 256, Math.random() * 256, 2, 2); }
    g.fillStyle = '#f2f2f2'; g.fillRect(6, 0, 6, 256); g.fillRect(244, 0, 6, 256);
    g.fillStyle = 'rgba(255,255,255,0.18)'; for (let y = 0; y < 256; y += 64) g.fillRect(126, y, 4, 30);
  });
  asphalt.wrapS = asphalt.wrapT = THREE.RepeatWrapping;
  const pos = [], uv = [], idx = [];
  let dist = 0;
  for (let i = 0; i <= N; i++) {
    const c = S[i % N], n = NRM[i % N];
    pos.push(c.x + n.x * W / 2, 0.05, c.z + n.z * W / 2, c.x - n.x * W / 2, 0.05, c.z - n.z * W / 2);
    uv.push(0, dist / 10, 1, dist / 10); dist += STEP;
    if (i < N) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals();
  const road = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: asphalt, roughness: 0.82, side: THREE.DoubleSide })); road.receiveShadow = true; road.renderOrder = 1; root.add(road);
  // 路肩（红白相间）
  const kerbs = [];
  for (let i = 0; i < N; i += 2) for (const sd of [1, -1]) {
    const c = S[i], n = NRM[i];
    kerbs.push({ x: c.x + n.x * sd * (W / 2 + 0.45), y: 0.08, z: c.z + n.z * sd * (W / 2 + 0.45), ry: Math.atan2(T[i].x, T[i].z), color: (i / 2) % 2 ? '#e8343f' : '#f4f4f4' });
  }
  instanced(root, new THREE.BoxGeometry(0.9, 0.1, STEP * 2), new THREE.MeshStandardMaterial({ roughness: 0.6 }), kerbs);
  // 外侧轮胎墙（入口处留缺口）
  const gate = new THREE.Vector3(CX + 80, 0, CZ + 80);
  let gi = 0, gd = 1e9; S.forEach((p, i) => { const d = p.distanceToSquared(gate); if (d < gd) { gd = d; gi = i; } });
  const tyres = [];
  for (let i = 0; i < N; i += 3) {
    const di = Math.min(Math.abs(i - gi), N - Math.abs(i - gi)); if (di < 14) continue;
    const c = S[i], n = NRM[i], o = W / 2 + 3.4;
    for (let h = 0; h < 2; h++) tyres.push({ x: c.x + n.x * OUT * o, y: 0.28 + h * 0.5, z: c.z + n.z * OUT * o, color: (i / 3 + h) % 4 === 0 ? PINK : (i / 3 + h) % 4 === 2 ? BLUE : '#1d1f24' });
  }
  instanced(root, new THREE.CylinderGeometry(0.46, 0.46, 0.48, 10), new THREE.MeshStandardMaterial({ roughness: 0.9 }), tyres);
  // 加速带
  const chev = canvasTex(128, 128, (g) => { g.fillStyle = 'rgba(0,0,0,0)'; g.clearRect(0, 0, 128, 128); g.strokeStyle = '#fff'; g.lineWidth = 16; g.lineCap = 'round'; for (const y of [30, 80]) { g.beginPath(); g.moveTo(20, y + 26); g.lineTo(64, y - 6); g.lineTo(108, y + 26); g.stroke(); } });
  const bm = new THREE.MeshBasicMaterial({ map: chev, color: new THREE.Color(PINK).multiplyScalar(1.6), transparent: true, toneMapped: false, depthWrite: false });
  for (const [a, b] of BOOST) for (let i = a; i < b; i += 6) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 4.2), bm); m.rotation.set(-Math.PI / 2, 0, Math.atan2(T[i].x, T[i].z) + Math.PI);
    m.position.set(S[i].x, 0.07, S[i].z); m.renderOrder = 2; m.userData.dynamic = true; root.add(m);
  }
  // 起终点格子线
  const chk = canvasTex(256, 64, (g) => { for (let x = 0; x < 16; x++) for (let y = 0; y < 4; y++) { g.fillStyle = (x + y) % 2 ? '#111' : '#fff'; g.fillRect(x * 16, y * 16, 16, 16); } });
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(W, 2.4), new THREE.MeshBasicMaterial({ map: chk }));
  fl.rotation.set(-Math.PI / 2, 0, Math.atan2(T[0].x, T[0].z) + Math.PI / 2); fl.position.set(S[0].x, 0.075, S[0].z); fl.renderOrder = 2; root.add(fl);
}

// ---------------------------------------------------------------- 卡丁车模型
export function makeKart(color = PINK, driver = true) {
  const g = new THREE.Group();
  const body = std(color, { roughness: 0.35, metalness: 0.3 }), dark = std(0x1a1c22, { roughness: 0.6 }), metal = std(0xb8bec8, { metalness: 0.9, roughness: 0.3 });
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.12, 2.0), dark); chassis.position.y = 0.18; g.add(chassis);
  const nose = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.28, 0.5), body); nose.position.set(0, 0.3, 0.95); nose.rotation.x = -0.25; g.add(nose);
  for (const sx of [-1, 1]) { const pod = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.24, 1.0), body); pod.position.set(sx * 0.62, 0.3, 0.05); g.add(pod); }
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.5, 0.45), dark); seat.position.set(0, 0.45, -0.35); seat.rotation.x = -0.25; g.add(seat);
  const bump = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.12, 0.14), metal); bump.position.set(0, 0.22, -1.08); g.add(bump);
  const engineB = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.32, 0.36), metal); engineB.position.set(0.32, 0.38, -0.72); g.add(engineB);
  const wheel = new THREE.CylinderGeometry(0.24, 0.24, 0.24, 14); wheel.rotateZ(Math.PI / 2);
  const wm = std(0x15171c, { roughness: 0.85 }); g.userData.wheels = [];
  for (const [x, z, r] of [[-0.72, 0.68, 0.22], [0.72, 0.68, 0.22], [-0.76, -0.7, 0.26], [0.76, -0.7, 0.26]]) { const w = new THREE.Mesh(wheel, wm); w.scale.setScalar(r / 0.24); w.position.set(x, r, z); g.add(w); g.userData.wheels.push(w); }
  const sw = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.025, 6, 16), dark); sw.position.set(0, 0.62, 0.28); sw.rotation.x = -1.0; g.add(sw); g.userData.steer = sw;
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.26), new THREE.MeshBasicMaterial({ map: canvasTex(128, 64, (c) => { c.fillStyle = '#fff'; c.fillRect(0, 0, 128, 64); c.fillStyle = '#111'; c.font = `900 46px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('22', 64, 34); }) }));
  plate.position.set(0, 0.42, 1.21); plate.rotation.x = -0.25; g.add(plate);
  if (driver) {
    const suit = std(color === PINK ? 0x2a3550 : 0xf2f2f2, { roughness: 0.7 });
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.32, 4, 8), suit); torso.position.set(0, 0.86, -0.32); torso.rotation.x = -0.2; g.add(torso);
    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 10), body); helmet.position.set(0, 1.3, -0.26); g.add(helmet);
    const visor = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 8, -0.9, 1.8, 1.1, 0.8), std(0x111318, { metalness: 0.8, roughness: 0.15 })); visor.position.set(0, 1.3, -0.24); g.add(visor);
    for (const sx of [-1, 1]) { const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.4, 4, 6), suit); arm.position.set(sx * 0.2, 0.82, 0.02); arm.rotation.x = -1.1; g.add(arm); }
  }
  g.traverse(o => { if (o.isMesh) o.castShadow = false; });
  return g;
}

// ---------------------------------------------------------------- 场地
export function buildKart(scene) {
  return zone(scene, CX, CZ, (root) => {
    ground(root, CX, CZ, 176, 176, 0x4c8a4a);
    buildTrack(root);
    // 起终点龙门 + 起跑灯
    const c0 = S[0], n0 = NRM[0], ry0 = Math.atan2(T[0].x, T[0].z);
    gantry = new THREE.Group(); gantry.position.set(c0.x, 0, c0.z); gantry.rotation.y = ry0; root.add(gantry);
    const pil = std(0x22252c, { metalness: 0.6, roughness: 0.4 });
    for (const sx of [-1, 1]) box(gantry, pil, 0.5, 6.6, 0.5, sx * (W / 2 + 1.2), 0, 0, { collide: false });
    box(gantry, pil, W + 3, 1.6, 0.6, 0, 6.2, 0, { collide: false });
    const ban = label(gantry, 'BILI KART · 哔哩卡丁车', 0, 7.0, -0.32, Math.PI, 1.0, 'rgba(251,114,153,0.95)'); ban.scale.setScalar(1);
    label(gantry, 'BILI KART · 哔哩卡丁车', 0, 7.0, 0.32, 0, 1.0, 'rgba(251,114,153,0.95)');
    gantry.userData.lights = [];
    for (let i = 0; i < 4; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 8), new THREE.MeshBasicMaterial({ color: 0x331111, toneMapped: false })); m.position.set(-1.8 + i * 1.2, 5.55, -0.35); gantry.add(m); gantry.userData.lights.push(m); }
    gantry.userData.dynamic = true;
    // 计时牌（最佳圈速）
    const bc = document.createElement('canvas'); bc.width = 512; bc.height = 256; const bt = new THREE.CanvasTexture(bc); bt.colorSpace = THREE.SRGBColorSpace;
    bestBoard = { c: bc, tex: bt };
    const boardM = new THREE.Mesh(new THREE.PlaneGeometry(6, 3), new THREE.MeshBasicMaterial({ map: bt, toneMapped: false }));
    const bp = c0.clone().addScaledVector(n0, -OUT * (W / 2 + 6)); boardM.position.set(bp.x, 3.2, bp.z); boardM.rotation.y = ry0 + Math.PI / 2 * OUT; boardM.userData.dynamic = true; root.add(boardM);
    box(root, pil, 0.3, 1.7, 0.3, bp.x, 0, bp.z, { collide: true });
    paintBest();
    // 看台（内场侧，面向主直道）
    const gs = c0.clone().lerp(S[60], 0.5).addScaledVector(NRM[30], -OUT * (W / 2 + 9));
    const stand = new THREE.Group(); stand.position.copy(gs); stand.rotation.y = Math.atan2(T[30].x, T[30].z) + (OUT > 0 ? Math.PI / 2 : -Math.PI / 2); root.add(stand);
    const concrete = std(0xc9ced6, { roughness: 0.85 });
    const seatCols = [PINK, BLUE, '#ffffff', PINK, BLUE];
    for (let r = 0; r < 5; r++) {
      box(stand, concrete, 30, 0.5 + r * 0.55, 1.4, 0, 0, -r * 1.4, { collide: false });
      box(stand, std(seatCols[r], { roughness: 0.5 }), 29, 0.3, 0.5, 0, 0.5 + r * 0.55, -r * 1.4 + 0.3, { collide: false });
    }
    box(stand, std(0xf2f4f7, { roughness: 0.4 }), 32, 0.25, 8.5, 0, 6.6, -2.8, { collide: false });
    for (const sx of [-15, 15]) box(stand, pil, 0.3, 6.6, 0.3, sx, 0, -6.2, { collide: false });
    stand.updateMatrixWorld(true);
    { const a = new THREE.Vector3(-16, 0, 1).applyMatrix4(stand.matrixWorld), b = new THREE.Vector3(16, 0, -7.5).applyMatrix4(stand.matrixWorld); addCollider(Math.min(a.x, b.x), 0, Math.min(a.z, b.z), Math.max(a.x, b.x), 7, Math.max(a.z, b.z)); }
    // 维修区车库 + 招牌
    const pitP = new THREE.Vector3(CX + 2, 0, CZ - 30);
    box(root, std(0x2a2e36, { roughness: 0.6 }), 26, 5, 9, pitP.x, 0, pitP.z, { collide: true });
    box(root, neon(PINK, 1.4), 26.2, 0.15, 9.2, pitP.x, 5, pitP.z, { collide: false });
    for (let i = 0; i < 3; i++) box(root, std(0xd5dae2, { metalness: 0.5, roughness: 0.4 }), 6.4, 3.6, 0.1, pitP.x - 8 + i * 8, 0, pitP.z + 4.55, { collide: false });
    label(root, '哔哩卡丁车 · 计时赛', pitP.x, 6.4, pitP.z + 4.6, 0, 1.4, 'rgba(16,20,30,0.92)');
    // 停着的几台展示车
    [[PINK, -8], [BLUE, 0], ['#ffb027', 8]].forEach(([c, dx]) => { const k = makeKart(c, false); k.position.set(pitP.x + dx, 0, pitP.z + 7.5); k.rotation.y = Math.PI; root.add(k); });
    // 照明塔
    const lampM = glow(0xfff4dc, 0.25, 2.2);
    for (const [x, z] of [[-78, -78], [78, -78], [-78, 78], [0, 0]]) {
      box(root, pil, 0.5, 14, 0.5, CX + x, 0, CZ + z, { collide: true });
      const h = new THREE.Mesh(new THREE.BoxGeometry(3, 1.2, 0.5), lampM); h.position.set(CX + x, 14.4, CZ + z); h.lookAt(CX, 0, CZ); root.add(h);
    }
    // 入口拱门（东南角，正对园区方向）
    const gx = CX + 82, gz = CZ + 82;
    for (const [dx, dz] of [[-7, 4], [4, -7]]) box(root, pil, 0.8, 7, 0.8, gx + dx, 0, gz + dz, { collide: true });
    const arch = new THREE.Group(); arch.position.set(gx - 1.5, 7, gz - 1.5); arch.rotation.y = Math.PI / 4; root.add(arch);
    box(arch, std(0x1c2027, { metalness: 0.6 }), 16, 1.6, 0.6, 0, 0, 0, { collide: false });
    label(arch, '哔哩卡丁车场 BILI KART', 0, 0.8, 0.34, 0, 1.1, 'rgba(251,114,153,0.95)');
    label(arch, '哔哩卡丁车场 BILI KART', 0, 0.8, -0.34, Math.PI, 1.1, 'rgba(251,114,153,0.95)');
    for (let i = 0; i < 10; i++) tree(root, CX + 86 - i * 17, CZ - 86, 0.9, 0, true);
    // 玩家用车：起跑区旁
    kartRig = makeKart(PINK, true); kartRig.visible = false; kartRig.userData.dynamic = true; root.add(kartRig);
    const showK = makeKart(PINK, false); const sp = S[N - 30].clone().addScaledVector(NRM[N - 30], -OUT * (W / 2 + 4)); showK.position.copy(sp); showK.rotation.y = ry0; showK.userData.dynamic = true; root.add(showK);
    kartRig.userData.show = showK;
    // AI 对手
    ais = [[BLUE, 0.97], ['#ffb027', 1.0], ['#7a5cff', 0.94]].map(([c, k], i) => { const m = makeKart(c, true); m.userData.dynamic = true; m.visible = false; root.add(m); return { m, k, lane: [-2.6, 2.6, 2.6][i], s: 0, v: 0 }; });
    // 交互 & 讲解
    interactable({ pos: sp.clone().setY(0), r: 3, icon: '🏁', label: '驾驶卡丁车：3 圈比赛', cooldown: 1, action: () => startRace() });
    hotspot(sp.x + 3, 0, sp.z + 3, 2, '哔哩卡丁车场', `<p>一条约 <b>${Math.round(LEN)} 米</b>的赛道：长直道、连续 S 弯和发夹弯。</p><p>和 3 台 AI 车手比 3 圈！赛道上粉色的 <b>箭头是加速带</b>，开出赛道会减速，撞上轮胎墙会被弹回。</p><p class="tip">${'<kbd>W</kbd>/<kbd>S</kbd> 油门刹车，<kbd>A</kbd>/<kbd>D</kbd> 转向（手机用左边摇杆）'}</p>`, 'flag');
    landmarks.push({ name: '哔哩卡丁车场', desc: '西北街区的卡丁车赛道，和 AI 车手来一场 3 圈比赛。', pos: new THREE.Vector3(CX + 40, 0, CZ + 40), r: 60, found: false, icon: 'flag' });
    addNPC(scene, { behavior: 'chat', pos: new THREE.Vector3(sp.x + 2.4, 0, sp.z - 2), yaw: -2.2, name: '赛道教练', look: { top: 0xe8343f }, lines: ['发夹弯前一定要松油门！', '踩上粉色箭头能加速', '我的最快圈速是 38 秒，你能破吗？'] });
    addNPC(scene, { behavior: 'phone', pos: new THREE.Vector3(gs.x, 0, gs.z + 3), yaw: 0, name: '赛车迷', lines: ['刚才那个超车太帅了', '我在拍比赛视频，回去剪成鬼畜'] });
  });
}
function paintBest() {
  if (!bestBoard) return;
  const g = bestBoard.c.getContext('2d'), b = JSON.parse(localStorage.getItem('bili_kart') || '{}');
  g.fillStyle = '#0e1016'; g.fillRect(0, 0, 512, 256); g.strokeStyle = PINK; g.lineWidth = 8; g.strokeRect(4, 4, 504, 248);
  g.fillStyle = PINK; g.font = `900 40px ${FONT}`; g.textAlign = 'center'; g.fillText('最快圈速 BEST LAP', 256, 64);
  g.fillStyle = '#7dffb2'; g.font = `900 96px ${FONT}`; g.fillText(b.lap ? fmt(b.lap) : '--:--.--', 256, 170);
  g.fillStyle = '#9aa0b4'; g.font = `700 30px ${FONT}`; g.fillText(b.wins ? `冠军 ${b.wins} 次` : '等你来刷新纪录', 256, 224);
  bestBoard.tex.needsUpdate = true;
}
const fmt = (s) => `${Math.floor(s / 60)}:${(s % 60).toFixed(2).padStart(5, '0')}`;

// ---------------------------------------------------------------- 比赛
function nearest(p, hint) {
  let bi = hint, bd = 1e9;
  const scan = (a, b) => { for (let j = a; j <= b; j++) { const i = (j + N) % N, d = (S[i].x - p.x) ** 2 + (S[i].z - p.z) ** 2; if (d < bd) { bd = d; bi = i; } } };
  if (hint == null) scan(0, N - 1); else { scan(hint - 40, hint + 40); if (bd > 400) scan(0, N - 1); }
  return bi;
}
function placeOnTrack(obj, idx, lane) {
  const i = ((Math.floor(idx) % N) + N) % N, f = idx - Math.floor(idx), j = (i + 1) % N;
  const c = S[i].clone().lerp(S[j], f), n = NRM[i];
  obj.position.set(c.x + n.x * lane, 0, c.z + n.z * lane); obj.rotation.y = Math.atan2(T[i].x, T[i].z);
}
function startRace() {
  const D = Z.D; if (race) return;
  D.standUp?.(); D.setMode('kart'); document.exitPointerLock?.(); document.body.classList.add('karting');
  kartRig.visible = true; kartRig.userData.show.visible = false;
  const startIdx = N - 14;
  placeOnTrack(kartRig, startIdx, -2.6 * OUT);
  race = { t: -3.6, h: kartRig.rotation.y, v: 0, x: kartRig.position.x, z: kartRig.position.z, idx: startIdx, prog: -14, lapT: [], lapStart: 0, boost: 0, off: 0, shake: 0, done: false, cam: null, last: -1 };
  ais.forEach((a, i) => { a.s = (i === 0 ? -14 : -24) * STEP; a.v = 0; a.m.visible = true; a.lane = [2.6, -2.6, 2.6][i] * OUT; a.prog = a.s / STEP; placeOnTrack(a.m, N + a.prog, a.lane); });
  $('#kartHud').classList.add('show'); $('#kartRes').classList.remove('show');
  D.toast('比赛即将开始！W 油门 · S 刹车 · A/D 转向 · 踩粉色箭头加速', 'flag', PINK);
  if (D.Sound.ac && !engine) {
    const ac = D.Sound.ac, o = ac.createOscillator(), o2 = ac.createOscillator(), f = ac.createBiquadFilter(), g = ac.createGain();
    o.type = 'sawtooth'; o2.type = 'square'; f.type = 'lowpass'; f.frequency.value = 900; g.gain.value = 0;
    o.connect(f); o2.connect(f); f.connect(g); g.connect(D.Sound.master); o.start(); o2.start(); engine = { o, o2, g, f };
  }
}
export function quitRace() {
  const D = Z.D; if (!race) return;
  race = null; kartRig.visible = false; kartRig.userData.show.visible = true; ais.forEach(a => a.m.visible = false);
  if (engine) { engine.g.gain.value = 0; engine.o.stop(); engine.o2.stop(); engine = null; }
  document.body.classList.remove('karting'); $('#kartHud').classList.remove('show'); $('#kartRes').classList.remove('show');
  const sp = kartRig.userData.show.position;
  D.player.pos.set(sp.x + 2.5, 0, sp.z + 2.5); D.player.vel.set(0, 0, 0); D.player.eyeY = D.player.eye;
  D.camera.fov = D.baseFov(); D.camera.updateProjectionMatrix(); D.camera.rotation.order = 'YXZ';
  D.setMode('walk'); D.resume();
}
function finish() {
  const D = Z.D, r = race; r.done = true;
  const all = [{ me: true, prog: r.prog }, ...ais.map(a => ({ prog: a.prog }))].sort((a, b) => b.prog - a.prog);
  const rank = all.findIndex(x => x.me) + 1, total = r.t, bestLap = Math.min(...r.lapT);
  const b = JSON.parse(localStorage.getItem('bili_kart') || '{}'), nb = !b.lap || bestLap < b.lap;
  if (nb) b.lap = bestLap; if (rank === 1) b.wins = (b.wins || 0) + 1; localStorage.setItem('bili_kart', JSON.stringify(b)); paintBest();
  const coins = [6, 4, 3, 2][rank - 1]; D.setCoins(D.coins() + coins);
  D.GP.gainXP(40 + (4 - rank) * 20); D.GP.emit('kart', 1); if (rank === 1) D.GP.emit('kartWin', 1);
  if (rank === 1) { D.Sound.win(); D.celebrate(8); } else D.Sound.ding();
  $('#kartRes').innerHTML = `<div class="kr-rank r${rank}">${rank}<small>${['st', 'nd', 'rd', 'th'][rank - 1]}</small></div><h3>${rank === 1 ? '冠军！' : rank <= 3 ? '登上领奖台！' : '完赛！再接再厉'}</h3>
    <p>总用时 <b>${fmt(total)}</b> · 最快圈 <b>${fmt(bestLap)}</b>${nb ? ' <em>新纪录！</em>' : ''}</p>
    <p class="kr-rw">+${coins} 硬币 · +${40 + (4 - rank) * 20} XP</p>
    <div class="kr-btns"><button class="btn primary" id="krAgain">再来一场</button><button class="btn" id="krQuit">下车</button></div>`;
  $('#kartRes').classList.add('show');
  $('#krAgain').onclick = () => { quitRace(); setTimeout(startRace, 60); };
  $('#krQuit').onclick = () => quitRace();
}
const _cam = new THREE.Vector3(), _look = new THREE.Vector3();
export function tickKart(dt) {
  const D = Z.D, r = race; if (!r) return;
  r.t += dt;
  const K = D.keys, J = D.joy;
  let thr = (K.KeyW || K.ArrowUp ? 1 : 0) - (K.KeyS || K.ArrowDown ? 1 : 0), str = (K.KeyA || K.ArrowLeft ? 1 : 0) - (K.KeyD || K.ArrowRight ? 1 : 0);
  if (Math.abs(J.x) > 0.05 || Math.abs(J.y) > 0.05) { thr = -J.y * 1.25; str = -J.x; }
  thr = Math.max(-1, Math.min(1, thr)); str = Math.max(-1, Math.min(1, str));
  // 起跑灯
  const L = gantry.userData.lights, cd = -r.t;
  L.forEach((m, i) => m.material.color.set(r.t >= 0 ? '#22ff77' : cd < 3 - i * 0.9 + 0.2 ? '#ff2a2a' : '#331111'));
  const sec = Math.ceil(cd);
  if (r.t < 0) { thr = 0; if (sec !== r.last) { r.last = sec; if (sec <= 3 && sec >= 1) D.Sound.tone(520, 0.18, { type: 'square', vol: 0.05 }); } }
  else if (r.last !== 0) { r.last = 0; D.Sound.tone(1040, 0.5, { type: 'square', vol: 0.06 }); r.lapStart = r.t; }
  if (r.done) thr = 0;
  // 物理
  const i0 = r.idx = nearest({ x: r.x, z: r.z }, r.idx), c = S[i0], n = NRM[i0];
  const lat = (r.x - c.x) * n.x + (r.z - c.z) * n.z, onTrack = Math.abs(lat) < W / 2 + 0.9;
  if (BOOST.some(([a, b]) => i0 >= a && i0 <= b) && Math.abs(lat) < W / 2 && r.boost <= 0) { r.boost = 1.3; D.Sound.whoosh?.(); }
  r.boost -= dt;
  const vmax = (r.boost > 0 ? 31 : 24) * (onTrack ? 1 : 0.42);
  if (thr > 0) r.v += thr * (r.boost > 0 ? 26 : 15) * dt; else if (thr < 0) r.v += thr * (r.v > 0 ? 32 : 9) * dt;
  r.v -= r.v * (onTrack ? 0.35 : 1.8) * dt + Math.sign(r.v) * 0.8 * dt;
  r.v = Math.max(-7, Math.min(r.v, vmax + (r.v > vmax ? (r.v - vmax) * 0.9 : 0)));
  if (r.v > vmax) r.v -= (r.v - vmax) * Math.min(1, dt * 3);
  const grip = 2.3 * Math.min(1, Math.abs(r.v) / 5) * (1 - 0.35 * Math.min(1, Math.abs(r.v) / 30));
  r.h += str * grip * dt * Math.sign(r.v || 1);
  r.x += Math.sin(r.h) * r.v * dt; r.z += Math.cos(r.h) * r.v * dt;
  // 轮胎墙
  const lat2 = (r.x - c.x) * n.x + (r.z - c.z) * n.z, lim = W / 2 + 2.9;
  if (Math.abs(lat2) > lim) { const k = Math.sign(lat2) * lim - lat2; r.x += n.x * k; r.z += n.z * k; if (Math.abs(r.v) > 4) { D.Sound.tone(90, 0.15, { type: 'square', vol: 0.06 }); r.shake = 0.5; } r.v *= 0.45; }
  if (!onTrack && Math.abs(r.v) > 6 && Math.random() < dt * 6) D.Sound.noise(0.06, { vol: 0.05, freq: 600 });
  // 进度（跨线 = 圈数）
  let dI = r.idx - (r._pi ?? r.idx); if (dI < -N / 2) dI += N; if (dI > N / 2) dI -= N; r._pi = r.idx; r.prog += dI;
  const lapsDone = Math.floor(r.prog / N);
  if (!r.done && lapsDone > r.lapT.length && r.t > 0) {
    const lt = r.t - r.lapStart; r.lapT.push(lt); r.lapStart = r.t;
    if (r.lapT.length >= LAPS) finish(); else { D.toast(`第 ${r.lapT.length} 圈 ${fmt(lt)}${r.lapT.length === LAPS - 1 ? ' · 最后一圈！' : ''}`, 'flag', BLUE); D.Sound.ding(); }
  }
  // AI
  for (const a of ais) {
    if (r.t > 0 && !r.done) {
      const i = ((Math.floor(a.prog) % N) + N) % N, rub = Math.max(-0.1, Math.min(0.12, (r.prog - a.prog) / (N * 0.35)));
      const tgt = SPD[i] * a.k * (1 + rub) * (BOOST.some(([x, y]) => i >= x && i <= y) ? 1.25 : 1);
      a.v += Math.max(-14, Math.min(9, (tgt - a.v) * 2)) * dt;
    } else a.v *= Math.pow(0.2, dt);
    a.prog += a.v * dt / STEP;
    a.lane += (Math.sin(r.t * 0.3 + a.k * 9) * 2.4 * OUT - a.lane) * dt * 0.3;
    placeOnTrack(a.m, ((a.prog % N) + N) % N, a.lane);
    // 与玩家碰撞
    const dx = r.x - a.m.position.x, dz = r.z - a.m.position.z, d = Math.hypot(dx, dz);
    if (d < 1.9 && d > 0.01) { const k = (1.9 - d) / d; r.x += dx * k * 0.6; r.z += dz * k * 0.6; r.v *= 0.92; if (!r.bumpT || r.t - r.bumpT > 0.6) { r.bumpT = r.t; D.Sound.tone(140, 0.08, { type: 'square', vol: 0.05 }); } }
    for (const w of a.m.userData.wheels) w.rotation.x += a.v * dt / 0.24;
  }
  // 车身
  kartRig.position.set(r.x, 0, r.z); kartRig.rotation.set(0, r.h, -str * Math.min(1, Math.abs(r.v) / 20) * 0.07);
  for (const w of kartRig.userData.wheels) w.rotation.x += r.v * dt / 0.24;
  kartRig.userData.wheels[0].rotation.y = kartRig.userData.wheels[1].rotation.y = str * 0.35; kartRig.userData.steer.rotation.z = str * 0.6;
  D.player.pos.set(r.x, 0, r.z);
  // 追尾镜头
  r.shake = Math.max(0, r.shake - dt * 2);
  const back = 5.4 + Math.min(1.5, Math.abs(r.v) / 20);
  _cam.set(r.x - Math.sin(r.h) * back, 2.35, r.z - Math.cos(r.h) * back);
  if (!r.cam) r.cam = _cam.clone(); r.cam.lerp(_cam, Math.min(1, dt * 6));
  D.camera.position.copy(r.cam); if (r.shake) D.camera.position.x += (Math.random() - 0.5) * r.shake * 0.3;
  _look.set(r.x + Math.sin(r.h) * 5, 1.0, r.z + Math.cos(r.h) * 5); D.camera.lookAt(_look);
  const fov = D.baseFov() + Math.min(18, Math.abs(r.v) * 0.55) + (r.boost > 0 ? 6 : 0);
  if (Math.abs(D.camera.fov - fov) > 0.05) { D.camera.fov += (fov - D.camera.fov) * Math.min(1, dt * 4); D.camera.updateProjectionMatrix(); }
  if (engine) { engine.o.frequency.value = 55 + Math.abs(r.v) * 7; engine.o2.frequency.value = 27 + Math.abs(r.v) * 3.5; engine.g.gain.value = D.Sound.on ? 0.028 + Math.abs(thr) * 0.015 : 0; engine.f.frequency.value = 500 + Math.abs(r.v) * 60; }
  // HUD
  const all = [{ me: true, prog: r.prog }, ...ais.map(a => ({ prog: a.prog }))].sort((a, b) => b.prog - a.prog);
  const rank = all.findIndex(x => x.me) + 1;
  $('#khLap').textContent = `${Math.min(LAPS, Math.max(1, lapsDone + 1))}/${LAPS}`;
  $('#khRank').textContent = `${rank}/4`; $('#khRank').parentElement.classList.toggle('lead', rank === 1);
  $('#khTime').textContent = r.t < 0 ? '0:00.00' : fmt(r.done ? r.t : r.t);
  $('#khSpd').textContent = Math.round(Math.abs(r.v) * 3.6);
  $('#khBoost').classList.toggle('on', r.boost > 0); $('#khOff').classList.toggle('on', !onTrack && r.t > 0);
  const cdEl = $('#khCount'); if (r.t < 0.8) { cdEl.textContent = r.t < 0 ? String(Math.max(1, sec)) : 'GO!'; cdEl.classList.add('show'); } else cdEl.classList.remove('show');
}
export const isRacing = () => !!race;
export function drawKartMinimap(g, s) {
  if (!S.length) return;
  g.strokeStyle = 'rgba(200,205,215,0.9)'; g.lineWidth = Math.max(2, W * s * 0.7); g.lineJoin = 'round'; g.beginPath();
  S.forEach((p, i) => (i ? g.lineTo(p.x * s, p.z * s) : g.moveTo(p.x * s, p.z * s))); g.closePath(); g.stroke();
  if (race) { g.fillStyle = '#ffb027'; for (const a of ais) { g.beginPath(); g.arc(a.m.position.x * s, a.m.position.z * s, 2.5, 0, 7); g.fill(); } }
}
export function initKart() {
  document.addEventListener('keydown', (e) => {
    if (!race) return;
    if (e.code === 'Escape' || e.code === 'KeyE' || e.code === 'KeyQ') { e.preventDefault(); e.stopImmediatePropagation(); quitRace(); return; }
    if (e.code === 'KeyR' && race.done) { quitRace(); setTimeout(startRace, 60); return; }
    Z.D.keys[e.code] = true;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    e.stopImmediatePropagation();
  }, true);
  $('#khExit').addEventListener('click', (e) => { e.stopPropagation(); quitRace(); });
}
