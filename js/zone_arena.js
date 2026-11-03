// 东北街区：BML 体育馆 —— 露天椭圆看台 + 主舞台（LED 巨幕 / 灯光 / 烟火）+ GPU 动画人群，可以亲手开一场演出
import * as THREE from 'three';
import { ctx, box, addCollider, std, glow, hotspot, tree } from './common.js';
import { interactable, landmarks } from './districts.js';
import { drawTV, PINK, BLUE, FONT } from './textures.js';
import { hold } from './props.js';
import { addNPC } from './people.js';
import { ZONES, Z, TIER, label, neon, zone, ground, canvasTex, instanced, bounceMat, personGeo, startRide, pay } from './zone_util.js';

const { x: CX, z: CZ } = ZONES.arena;
const A0 = 40, B0 = 30, ROWS = 9, STEP_OUT = 2.1, STEP_UP = 1.25, GAP = 0.32;   // 场地半轴、看台层数；南侧入口缺口（弧度半宽）
const crowdU = { t: { value: 0 }, amp: { value: 0.06 } };
let led = null, beams = [], show = null, stageLights = [];

function ring(a0, b0, a1, b1, gap, h) {
  const s = new THREE.Shape(), st = -Math.PI / 2 + gap, en = -Math.PI / 2 + Math.PI * 2 - gap, n = 72;   // 形状 y 轴 → 世界 -z：缺口朝南（+z）
  for (let i = 0; i <= n; i++) { const t = st + (en - st) * i / n; const x = Math.cos(t) * a1, y = Math.sin(t) * b1; i ? s.lineTo(x, y) : s.moveTo(x, y); }
  for (let i = n; i >= 0; i--) { const t = st + (en - st) * i / n; s.lineTo(Math.cos(t) * a0, Math.sin(t) * b0); }
  const g = new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: false, curveSegments: 1 }); g.rotateX(-Math.PI / 2); return g;
}
function paintLED(g, W, H, t, live) {
  const k = (Math.sin(t * 0.6) + 1) / 2;
  const gr = g.createLinearGradient(0, 0, W, H); gr.addColorStop(0, `hsl(${330 + k * 20},80%,${live ? 40 : 22}%)`); gr.addColorStop(1, `hsl(${200 - k * 20},85%,${live ? 34 : 18}%)`);
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  if (live) for (let i = 0; i < 14; i++) { const x = (i * 97 + t * 160) % W, h2 = (Math.sin(t * 6 + i) * 0.5 + 0.5) * H * 0.5; g.fillStyle = i % 2 ? 'rgba(251,114,153,0.5)' : 'rgba(0,174,236,0.5)'; g.fillRect(x, H - h2, 26, h2); }
  drawTV(g, W / 2, H * 0.42, H * 0.42 * (live ? 1 + Math.sin(t * 8) * 0.05 : 1), 'rgba(255,255,255,0.95)', 14);
  g.fillStyle = '#fff'; g.font = `italic 900 ${H * 0.16}px "Arial Black",Arial`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(live ? 'BML · LIVE' : 'BILIBILI MACRO LINK', W / 2, H * 0.82);
  g.fillStyle = 'rgba(0,0,0,0.22)'; for (let y = 0; y < H; y += 4) g.fillRect(0, y, W, 1);
}

export function buildArena(scene) {
  return zone(scene, CX, CZ, (root) => {
    ground(root, CX, CZ, 176, 176, 0x5a606c);
    const G = new THREE.Group(); G.position.set(CX, 0, CZ); root.add(G);
    // 场地：深色演出地面 + 粉蓝发光线
    const floorT = canvasTex(512, 512, (g) => { g.fillStyle = '#20232c'; g.fillRect(0, 0, 512, 512); g.strokeStyle = 'rgba(251,114,153,0.5)'; g.lineWidth = 3; for (let i = 0; i < 6; i++) { g.beginPath(); g.ellipse(256, 256, 40 + i * 40, 30 + i * 30, 0, 0, 7); g.stroke(); } g.strokeStyle = 'rgba(0,174,236,0.4)'; g.beginPath(); g.moveTo(256, 0); g.lineTo(256, 512); g.stroke(); });
    const fl = new THREE.Mesh(new THREE.CircleGeometry(1, 64), std(0xffffff, { map: floorT, roughness: 0.6 })); fl.scale.set(A0, B0, 1); fl.rotation.x = -Math.PI / 2; fl.position.y = 0.03; G.add(fl);
    // 看台（9 层，每层一个椭圆环；座椅颜色粉蓝白交替）
    const conc = std(0xb9bfc9, { roughness: 0.85 }), seatCols = [0xFB7299, 0x00AEEC, 0xf2f4f7];
    for (let r = 0; r < ROWS; r++) {
      const a = A0 + 2 + r * STEP_OUT, b = B0 + 2 + r * STEP_OUT;
      const step = new THREE.Mesh(ring(a, b, a + STEP_OUT, b + STEP_OUT, GAP + 0.02 * r, (r + 1) * STEP_UP), conc); G.add(step);
      const seat = new THREE.Mesh(ring(a + 0.3, b + 0.3, a + 1.0, b + 1.0, GAP + 0.02 * r, 0.45), std(seatCols[r % 3], { roughness: 0.5 })); seat.position.y = (r + 1) * STEP_UP; G.add(seat);
    }
    // 外立面 + 顶棚环
    const outA = A0 + 2 + ROWS * STEP_OUT, outB = B0 + 2 + ROWS * STEP_OUT, H = ROWS * STEP_UP;
    const shell = new THREE.Mesh(ring(outA, outB, outA + 1.2, outB + 1.2, GAP + 0.18, H + 6), std(0xe9edf3, { roughness: 0.4, metalness: 0.3 })); G.add(shell);
    const roof = new THREE.Mesh(ring(outA - 14, outB - 14, outA + 1.6, outB + 1.6, 0, 0.6), new THREE.MeshStandardMaterial({ color: 0xf6f8fb, roughness: 0.3, metalness: 0.4, side: THREE.DoubleSide })); roof.position.y = H + 6; G.add(roof);
    const rimN = new THREE.Mesh(ring(outA + 1.5, outB + 1.5, outA + 1.9, outB + 1.9, 0, 0.3), neon(PINK, 1.5)); rimN.position.y = H + 6.1; G.add(rimN);
    const rimB = new THREE.Mesh(ring(outA - 14.4, outB - 14.4, outA - 14, outB - 14, 0, 0.3), neon(BLUE, 1.5)); rimB.position.y = H + 6.1; G.add(rimB);
    for (let i = 0; i < 24; i++) { const t = i / 24 * Math.PI * 2; if (Math.abs(Math.atan2(Math.sin(t - Math.PI / 2), Math.cos(t - Math.PI / 2))) < GAP) continue; box(G, std(0xd0d5dc, { metalness: 0.6 }), 0.6, H + 6, 0.6, Math.cos(t) * (outA + 0.6), 0, Math.sin(t) * (outB + 0.6), { collide: false }); }
    // 主舞台（北侧）
    const sz = -B0 + 4;
    box(G, std(0x15171c, { roughness: 0.5 }), 26, 1.4, 10, 0, 0, sz, { collide: false });
    box(G, neon(PINK, 1.6), 26.2, 0.08, 10.2, 0, 1.4, sz, { collide: false });
    box(G, std(0x1a1d23, { metalness: 0.6 }), 14, 0.9, 8, 0, 0, sz + 7, { collide: false });     // T 台
    addCollider(CX - 13, 0, CZ + sz - 5, CX + 13, 1.4, CZ + sz + 5); addCollider(CX - 7, 0, CZ + sz + 3, CX + 7, 0.9, CZ + sz + 11);   // 可以跳上舞台
    const lc = document.createElement('canvas'); lc.width = 1024; lc.height = 448; const lt = new THREE.CanvasTexture(lc); lt.colorSpace = THREE.SRGBColorSpace;
    const ledM = new THREE.Mesh(new THREE.PlaneGeometry(24, 10.5), new THREE.MeshBasicMaterial({ map: lt, toneMapped: false })); ledM.position.set(0, 8.2, sz - 4.6); ledM.userData.dynamic = true; G.add(ledM);
    led = { g: lc.getContext('2d'), tex: lt, acc: 0, t: 0 }; paintLED(led.g, 1024, 448, 0, false); lt.needsUpdate = true;
    const truss = std(0x8a909c, { metalness: 0.9, roughness: 0.3 });
    for (const sx of [-13.5, 13.5]) box(G, truss, 0.7, 15, 0.7, sx, 0, sz - 4.6, { collide: false });
    box(G, truss, 28, 0.7, 0.7, 0, 15, sz - 4.6, { collide: false });
    for (const sx of [-16.5, 16.5]) { const sp = new THREE.Mesh(new THREE.BoxGeometry(2.2, 6, 2), std(0x111216)); sp.position.set(sx, 3, sz - 2); G.add(sp); addCollider(CX + sx - 1.1, 0, CZ + sz - 3, CX + sx + 1.1, 6, CZ + sz - 1); }
    // 舞台灯柱（加色光束，演出时摇摆变色）
    const beamM = (c) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c), transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false, fog: false });
    for (let i = 0; i < 8; i++) {
      const piv = new THREE.Group(); piv.position.set(-12 + i * 3.4, 14.6, sz - 4); piv.userData.dynamic = true; G.add(piv);
      const cone = new THREE.Mesh(new THREE.ConeGeometry(2.6, 26, 18, 1, true), beamM(i % 2 ? PINK : BLUE)); cone.position.y = -13; piv.add(cone);
      piv.rotation.x = 0.6; beams.push({ piv, cone, i });
    }
    // 人群：看台（每层若干）+ 场内站席；GPU 跳动
    const crowd = [], sticks = [];
    const nSeat = [260, 520, 900][TIER], nFloor = [90, 180, 320][TIER];
    const tops = ['#FB7299', '#00AEEC', '#ffffff', '#ffd166', '#2a3550', '#9b8cff', '#3c3f46', '#e85d3b'];
    for (let i = 0; i < nSeat; i++) {
      const r = Math.floor(Math.random() * ROWS), t = Math.PI / 2 + GAP + 0.06 + Math.random() * (Math.PI * 2 - 2 * GAP - 0.12);
      if (Math.sin(t) < -0.82 && Math.abs(Math.cos(t)) < 0.35) continue;  // 舞台背后不坐人
      const a = A0 + 2.6 + r * STEP_OUT, b = B0 + 2.6 + r * STEP_OUT, x = Math.cos(t) * a, z = Math.sin(t) * b;
      crowd.push({ x: CX + x, y: (r + 1) * STEP_UP, z: CZ + z, ry: Math.atan2(-x, -z - B0 * 0.6), s: 0.9 + Math.random() * 0.15, color: tops[i % tops.length] });
      if (i % 3 === 0) sticks.push({ x: CX + x + 0.15, y: (r + 1) * STEP_UP + 1.75, z: CZ + z, rz: 0.4, color: i % 2 ? PINK : BLUE });
    }
    for (let i = 0; i < nFloor; i++) {
      const x = (Math.random() - 0.5) * 30, z = sz + 13 + Math.random() * 20;
      if ((x / A0) ** 2 + ((z) / B0) ** 2 > 0.8) continue;
      crowd.push({ x: CX + x, y: 0.05, z: CZ + z, ry: Math.PI + (Math.random() - 0.5) * 0.6, s: 0.92 + Math.random() * 0.12, color: tops[(i * 3) % tops.length] });
      if (i % 2 === 0) sticks.push({ x: CX + x + 0.15, y: 1.8, z: CZ + z, rz: 0.4, color: i % 4 ? PINK : BLUE });
    }
    const pm = bounceMat(new THREE.MeshStandardMaterial({ roughness: 0.8 }), crowdU, 'crowd', 0.25);
    const im = instanced(root, personGeo(), pm, crowd, { dynamic: true }); im.castShadow = false;
    const sm = bounceMat(new THREE.MeshBasicMaterial({ toneMapped: false }), crowdU, 'stick', 0.6);
    const stk = instanced(root, new THREE.CylinderGeometry(0.035, 0.035, 0.5, 5), sm, sticks, { dynamic: true });
    stk.material.color.setScalar(1.6);
    // 外场：售票亭 / 应援棒摊 / 入口牌
    const ez = CZ + outB + 4;
    label(root, 'BML 体育馆 · BILIBILI MACRO LINK', CX, H + 3, CZ + outB + 1.4, 0, 2.2, 'rgba(251,114,153,0.95)');
    box(root, std(0x2a2e36), 6, 3.2, 3, CX - 14, 0, ez + 8, { collide: true }); box(root, neon(BLUE, 1.3), 6.2, 0.15, 3.2, CX - 14, 3.2, ez + 8, { collide: false });
    label(root, '应援棒 · 周边', CX - 14, 4, ez + 9.55, 0, 0.8, 'rgba(0,174,236,0.95)');
    box(root, std(0x2a2e36), 6, 3.2, 3, CX + 14, 0, ez + 8, { collide: true }); box(root, neon(PINK, 1.3), 6.2, 0.15, 3.2, CX + 14, 3.2, ez + 8, { collide: false });
    label(root, '售票处 · 今晚演出', CX + 14, 4, ez + 9.55, 0, 0.8, 'rgba(251,114,153,0.95)');
    for (let i = 0; i < 8; i++) tree(root, CX - 70 + i * 20, CZ + 82, 0.9, 0, true);
    // 交互
    interactable({ pos: new THREE.Vector3(CX - 14, 0, ez + 10.6), r: 2.4, icon: '🎤', label: '买一根应援棒（1 硬币）', cooldown: 1, action: (a) => {
      if (!pay(1, '应援棒')) return;
      const st = new THREE.Group(); const h = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.014, 0.08, 8), std(0x222)); const l = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.22, 10), neon(Math.random() < 0.5 ? PINK : BLUE, 2)); l.position.y = 0.15; st.add(h, l); st.rotation.x = -0.3;
      hold(Z.D.camera, st, '应援棒', { uses: 999, onUse: () => { Z.D.Sound.tone(660, 0.06, { type: 'triangle', vol: 0.04 }); crowdU.amp.value = Math.max(crowdU.amp.value, 0.18); setTimeout(() => { if (!show) crowdU.amp.value = 0.06; }, 1500); } });
      a.toast('拿到应援棒！在体育馆里挥舞它（按 E / 点「互动」），观众会跟你一起嗨', 'mic', PINK);
    } });
    interactable({ pos: new THREE.Vector3(CX + 14, 0, ez + 10.6), r: 2.4, icon: '🎤', label: '开一场 BML 演出（2 硬币）', cooldown: 2, action: () => startShow() });
    interactable({ pos: new THREE.Vector3(CX, 0, CZ + sz + 12), r: 3, icon: '🎤', label: '在舞台前开演唱会（2 硬币）', cooldown: 2, action: () => startShow() });
    hotspot(CX, 0, CZ + outB + 8, 3, 'BML 体育馆', '<p><b>BML</b>（Bilibili Macro Link）是 B 站的大型线下演唱会。这里是一座可容纳上千人的露天体育馆。</p><p>在售票处花 2 枚硬币，就能开一场属于你的 BML：灯光、LED 巨幕、全场应援和烟火。</p>', 'tv', { focusY: 6 });
    landmarks.push({ name: 'BML 体育馆', desc: '东北街区的露天体育馆，可以亲手开一场演唱会。', pos: new THREE.Vector3(CX, 0, CZ), r: 70, found: false, icon: 'mic' });
    addNPC(scene, { behavior: 'phone', pos: new THREE.Vector3(CX - 6, 0, ez + 12), yaw: Math.PI, name: '排队的观众', look: { top: 0xFB7299, female: true }, lines: ['今晚的 BML 嘉宾超豪华！', '应援棒一定要买粉色的', '我排了三个小时队…'] });
    addNPC(scene, { behavior: 'chat', pos: new THREE.Vector3(CX + 7, 0, ez + 13), yaw: -2.4, name: '演出导演', look: { top: 0x15171c }, lines: ['灯光、音响全部就绪！', '去售票处，今晚由你来开场', 'LED 巨幕可是 24 米宽的'] });
    stageLights = [rimN, rimB];
  });
}

// ---------------------------------------------------------------- 开演
function startShow() {
  if (show) return;
  if (!pay(2, '开一场演出')) return;
  const D = Z.D; show = { t: 0 };
  D.toast('灯光！音乐！BML 现在开场——', 'mic', PINK);
  const S = D.Sound, bpm = 120, beat = 60 / bpm, mel = [659, 784, 880, 784, 659, 587, 523, 587, 659, 659, 784, 988, 880, 784, 659, 784];
  for (let b = 0; b < 52; b++) {
    const at = 1.5 + b * beat;
    S.tone(55, 0.25, { vol: 0.16, slide: 40, delay: at });
    if (b % 2) S.noise(0.12, { vol: 0.12, freq: 3200, delay: at });
    S.noise(0.04, { vol: 0.04, freq: 9000, delay: at + beat / 2 });
    if (b >= 8) S.tone(mel[b % 16], beat * 0.9, { type: 'triangle', vol: 0.05, delay: at });
    if (b >= 16 && b % 4 === 0) S.tone(mel[(b / 4) % 16] / 2, beat * 3.6, { type: 'sawtooth', vol: 0.018, delay: at });
  }
  for (let i = 0; i < 40; i++) S.noise(0.06, { vol: 0.08 + Math.random() * 0.06, freq: 2600 + Math.random() * 2000, delay: 27.5 + Math.random() * 2.2 });
  const c = new THREE.Vector3(CX, 0, CZ), stage = new THREE.Vector3(CX, 6, CZ - B0 + 2);
  startRide(31, (t) => {
    const ph = t < 6 ? 0 : t < 14 ? 1 : t < 22 ? 2 : 3;
    let pos;
    if (ph === 0) pos = new THREE.Vector3(CX, 4 + t * 0.6, CZ + 32 - t * 2.2);
    else if (ph === 1) { const a = (t - 6) / 8 * Math.PI * 0.9 + Math.PI * 0.55; pos = new THREE.Vector3(CX + Math.cos(a) * 52, 18, CZ + Math.sin(a) * 40); }
    else if (ph === 2) pos = new THREE.Vector3(CX + Math.sin(t * 0.5) * 6, 2.6, CZ - B0 + 18);
    else { const a = (t - 22) * 0.25; pos = new THREE.Vector3(CX + Math.sin(a) * 30, 30 + (t - 22) * 2, CZ + 46); }
    return { pos, look: ph === 3 ? c : stage, fov: ph === 2 ? 62 : 78 };
  }, () => {
    show = null; crowdU.amp.value = 0.06;
    D.GP.emit('concert', 1); D.GP.gainXP(50); D.setCoins(D.coins() + 3);
    D.toast('演出大成功！全场安可～ +3 硬币 · +50 XP', 'mic', '#2ec27e');
  });
  setTimeout(() => D.celebrate(10), 26500); setTimeout(() => D.celebrate(8), 28500);
}

export function tickArena(dt, t) {
  const live = !!show; if (show) show.t += dt;
  const st = show ? show.t : 0;
  crowdU.t.value = t;
  if (show) crowdU.amp.value += ((st < 1.5 ? 0.1 : st < 9 ? 0.22 : st > 28 ? 0.4 : 0.32) - crowdU.amp.value) * Math.min(1, dt * 2);
  for (const b of beams) {
    const sp = live ? 1.6 : 0.35;
    b.piv.rotation.x = 0.55 + Math.sin(t * sp + b.i) * (live ? 0.45 : 0.15);
    b.piv.rotation.z = Math.sin(t * sp * 0.8 + b.i * 1.7) * (live ? 0.6 : 0.2);
    b.cone.material.opacity = live ? 0.16 + Math.max(0, Math.sin(t * 8 + b.i)) * 0.12 : 0.03 + 0.06 * (ctx.nightF ?? 1);
    if (live) b.cone.material.color.setHSL(((t * 0.15 + b.i * 0.12) % 1), 0.85, 0.6);
  }
  if (led && (led.acc += dt) > (live ? 1 / 15 : 1 / 4)) { led.acc = 0; led.t = t; paintLED(led.g, 1024, 448, t, live); led.tex.needsUpdate = true; }
}
/** 看台软碰撞：不能穿过看台（入口缺口除外），站在场地或外场 */
export function constrainArena(p) {
  const x = p.x - CX, z = p.z - CZ;
  const inA = A0 + 0.6, outA = A0 + 3.2 + ROWS * STEP_OUT;
  const ea = x / inA, eb = z / (inA - A0 + B0), r1 = Math.hypot(ea, eb);
  const r2 = Math.hypot(x / outA, z / (outA - A0 + B0));
  if (r1 < 1 || r2 > 1 || p.y > ROWS * STEP_UP + 7) return;
  const ang = Math.atan2(z, x); let d = ang - Math.PI / 2; d = Math.atan2(Math.sin(d), Math.cos(d));
  if (Math.abs(d) < GAP - 0.03) return;
  const k = (r1 - 1) < (1 - r2) ? 1 / r1 * 0.999 : 1 / r2 * 1.001;
  p.x = CX + x * k; p.z = CZ + z * k;
}
