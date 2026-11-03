// 进阶玩法：一键三连收集、烟花、路人 NPC、3D 弹幕发射、音效
import * as THREE from 'three';
import { ctx, std } from './common.js';
import { textTexture, PINK, BLUE, FONT } from './textures.js';

// ======================= 一键三连收集 =======================
export const KINDS = {
  like: { label: '点赞', glyph: '赞', color: '#FB7299', dark: '#c94370' },
  coin: { label: '投币', glyph: '币', color: '#FFB027', dark: '#c77a00' },
  fav: { label: '收藏', glyph: '藏', color: '#00AEEC', dark: '#0078a8' },
};
const ORDER = ['like', 'coin', 'fav'];

function badgeTex(kind) {
  const k = KINDS[kind];
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(96, 86, 10, 128, 128, 130);
  grd.addColorStop(0, '#ffffff'); grd.addColorStop(0.22, k.color); grd.addColorStop(1, k.dark);
  g.fillStyle = grd; g.beginPath(); g.arc(128, 128, 126, 0, Math.PI * 2); g.fill();
  g.lineWidth = 10; g.strokeStyle = 'rgba(255,255,255,0.9)'; g.beginPath(); g.arc(128, 128, 104, 0, Math.PI * 2); g.stroke();
  g.fillStyle = '#fff'; g.font = `900 118px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.shadowColor = 'rgba(0,0,0,0.25)'; g.shadowBlur = 8; g.fillText(k.glyph, 128, 136);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

// 18 个收集点，按顺序轮流分配 赞 / 币 / 藏（各 6 个）
const SPOTS = [
  // 园区广场
  [-20, 0, 30], [22, 0, 44], [-44, 0, 64], [0, 0, -40], [-64, 0, 26], [60, 0, 70],
  // 1F 大堂
  [-5, 0.2, 7], [-12, 0.2, 12], [14, 0.2, -11], [16, 0.2, 6],
  // 16F
  [0, 62, 9.5], [-11, 62, 0.5], [-15.5, 62, -11], [14, 62, -8],
  // 天台
  [-17, 130, -6], [16, 130, 0], [0, 130, 12], [-10, 130, -4],
];

export function buildCollectibles(scene) {
  const geo = new THREE.CylinderGeometry(0.55, 0.55, 0.12, 40); geo.rotateX(Math.PI / 2);
  const beamGeo = new THREE.CylinderGeometry(0.06, 0.55, 9, 16, 1, true); beamGeo.translate(0, 4.5, 0);
  const mats = {};
  for (const k of ORDER) {
    const tex = badgeTex(k);
    const face = new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.55, roughness: 0.35, metalness: 0.3 });
    const side = std(KINDS[k].color, { emissive: KINDS[k].color, emissiveIntensity: 0.5, metalness: 0.6, roughness: 0.3 });
    const beam = new THREE.MeshBasicMaterial({ color: new THREE.Color(KINDS[k].color), transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
    mats[k] = { arr: [side, face, face], beam };
  }
  const items = SPOTS.map(([x, y, z], i) => {
    const kind = ORDER[i % 3];
    const mesh = new THREE.Mesh(geo, mats[kind].arr);
    mesh.position.set(x, y + 1.15, z); mesh.castShadow = true;
    const beam = new THREE.Mesh(beamGeo, mats[kind].beam); beam.position.set(x, y, z);
    scene.add(mesh, beam);
    return { mesh, beam, kind, base: y + 1.15, floor: y, taken: false, tTaken: 0, phase: i * 0.7 };
  });
  ctx.collectibles = items;
  ctx.animators.push((dt, t) => {
    for (const it of items) {
      if (!it.taken) {
        it.mesh.rotation.y = t * 2 + it.phase;
        it.mesh.position.y = it.base + Math.sin(t * 2.4 + it.phase) * 0.15;
        it.beam.material.opacity = 0.18 + Math.sin(t * 3 + it.phase) * 0.06;
      } else if (it.mesh.visible) {
        it.tTaken += dt;
        const k = it.tTaken;
        it.mesh.rotation.y += dt * 18;
        it.mesh.position.y = it.base + k * 3.5;
        const s = k < 0.18 ? 1 + k * 3 : Math.max(0, 1.54 - (k - 0.18) * 4.5);
        it.mesh.scale.setScalar(s);
        if (s <= 0) it.mesh.visible = false;
      }
    }
  });
  return items;
}

export function checkCollect(p, onGet) {
  for (const it of ctx.collectibles || []) {
    if (it.taken) continue;
    if (Math.abs(p.y - it.floor) > 1.6) continue;
    if (Math.hypot(p.x - it.mesh.position.x, p.z - it.mesh.position.z) < 1.7) {
      it.taken = true; it.beam.visible = false; onGet(it);
    }
  }
}

export function questStats() {
  const s = { like: [0, 0], coin: [0, 0], fav: [0, 0], got: 0, total: 0 };
  for (const it of ctx.collectibles || []) { s[it.kind][1]++; s.total++; if (it.taken) { s[it.kind][0]++; s.got++; } }
  return s;
}

// ======================= 烟花 =======================
export class Fireworks {
  constructor(scene, N = (document.documentElement.dataset.tier === '2' ? 4200 : 2400)) {
    this.N = N; this.idx = 0;
    this.pos = new Float32Array(N * 3); this.col = new Float32Array(N * 3);
    this.vel = new Float32Array(N * 3); this.base = new Float32Array(N * 3); this.life = new Float32Array(N);
    this.pos.fill(-9999);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    // 圆形软粒子贴图
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const cg = c.getContext('2d'); const rg = cg.createRadialGradient(32, 32, 0, 32, 32, 32);
    rg.addColorStop(0, 'rgba(255,255,255,1)'); rg.addColorStop(0.35, 'rgba(255,255,255,0.8)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
    cg.fillStyle = rg; cg.fillRect(0, 0, 64, 64);
    const m = new THREE.PointsMaterial({ size: 2.0, map: new THREE.CanvasTexture(c), vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, fog: false });
    this.points = new THREE.Points(g, m); this.points.frustumCulled = false; scene.add(this.points);
    this.geo = g; this.queue = []; this.active = 0;
    this.colors = [PINK, BLUE, '#ffd166', '#ffffff', '#b5ff8a', '#c49bff'].map(h => new THREE.Color(h));
  }
  burst(x, y, z, color = null, n = 260, speed = 18) {
    const c = color || this.colors[Math.floor(Math.random() * this.colors.length)];
    const c2 = Math.random() < 0.4 ? this.colors[Math.floor(Math.random() * this.colors.length)] : c;
    for (let k = 0; k < n; k++) {
      const i = this.idx = (this.idx + 1) % this.N;
      const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, r = Math.sqrt(1 - u * u);
      const s = speed * (0.75 + Math.random() * 0.35);
      this.pos.set([x, y, z], i * 3);
      this.vel.set([r * Math.cos(a) * s, u * s, r * Math.sin(a) * s], i * 3);
      const cc = k % 3 === 0 ? c2 : c;
      this.base.set([cc.r, cc.g, cc.b], i * 3);
      this.life[i] = 1 + Math.random() * 0.3;
    }
    this.active = 3.5;
  }
  // 一组烟花，分时依次绽放
  show(count = 6, center = [0, 150, 0], spread = 70, yRange = 40) {
    for (let i = 0; i < count; i++) {
      this.queue.push({ t: i * 0.35 + Math.random() * 0.25, x: center[0] + (Math.random() - 0.5) * spread, y: center[1] + Math.random() * yRange, z: center[2] + (Math.random() - 0.5) * spread });
    }
  }
  update(dt, onPop) {
    for (const q of this.queue) q.t -= dt;
    while (this.queue.length && this.queue[0].t <= 0) {
      const q = this.queue.shift(); this.burst(q.x, q.y, q.z); onPop && onPop();
    }
    if (this.active <= 0) return;
    this.active -= dt;
    const { pos, vel, col, base, life } = this;
    const drag = Math.pow(0.35, dt);
    for (let i = 0; i < this.N; i++) {
      if (life[i] <= 0) continue;
      const j = i * 3;
      vel[j + 1] -= 7 * dt; vel[j] *= drag; vel[j + 1] *= drag; vel[j + 2] *= drag;
      pos[j] += vel[j] * dt; pos[j + 1] += vel[j + 1] * dt; pos[j + 2] += vel[j + 2] * dt;
      life[i] -= dt * 0.5;
      const f = Math.max(0, Math.min(1, life[i])) * (0.75 + Math.random() * 0.5) * 2.6;
      col[j] = base[j] * f; col[j + 1] = base[j + 1] * f; col[j + 2] = base[j + 2] * f;
      if (life[i] <= 0) { pos[j + 1] = -9999; col[j] = col[j + 1] = col[j + 2] = 0; }
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.color.needsUpdate = true;
  }
}

// ======================= 路人 NPC =======================
export function buildNPCs(scene) {
  const skin = std(0xffdcc6, { roughness: 0.8 });
  const pants = [std(0x2b3040), std(0x44506a), std(0x6a5a4a)];
  const hairs = [std(0x2a2026), std(0x5a3a2a), std(0xf2c3d4), std(0x9fd6ff)];
  const shirts = [0xFB7299, 0x00AEEC, 0xffffff, 0xffd166, 0x8bd17c, 0x9b8cff].map(c => std(c, { roughness: 0.85 }));
  const legG = new THREE.BoxGeometry(0.15, 0.8, 0.17); legG.translate(0, -0.4, 0);
  const armG = new THREE.BoxGeometry(0.1, 0.6, 0.12); armG.translate(0, -0.3, 0);
  const bodyG = new THREE.CapsuleGeometry(0.2, 0.42, 4, 10);
  const headG = new THREE.SphereGeometry(0.16, 16, 12);
  const hairG = new THREE.SphereGeometry(0.17, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.55);

  function person(i) {
    const g = new THREE.Group();
    const pm = pants[i % pants.length], sm = shirts[i % shirts.length];
    const l1 = new THREE.Mesh(legG, pm); l1.position.set(-0.1, 0.82, 0);
    const l2 = new THREE.Mesh(legG, pm); l2.position.set(0.1, 0.82, 0);
    const body = new THREE.Mesh(bodyG, sm); body.position.y = 1.18; body.castShadow = true;
    const a1 = new THREE.Mesh(armG, sm); a1.position.set(-0.27, 1.46, 0);
    const a2 = new THREE.Mesh(armG, sm); a2.position.set(0.27, 1.46, 0);
    const head = new THREE.Mesh(headG, skin); head.position.y = 1.7;
    const hair = new THREE.Mesh(hairG, hairs[i % hairs.length]); hair.position.y = 1.72; hair.rotation.x = -0.25;
    g.add(l1, l2, body, a1, a2, head, hair);
    scene.add(g);
    return { g, l1, l2, a1, a2 };
  }
  const circle = (cx, cz, r, n = 14) => Array.from({ length: n }, (_, i) => [cx + Math.cos(i / n * Math.PI * 2) * r, cz + Math.sin(i / n * Math.PI * 2) * r]);
  const routes = [
    { y: 0, pts: [[-3.5, 24], [-3.5, 86], [3.5, 86], [3.5, 24]], n: 3 },
    { y: 0, pts: circle(0, 52, 10), n: 2 },
    { y: 0, pts: [[-26, 22], [-26, -26], [26, -26], [26, 22]], n: 2 },
    { y: 0.2, pts: [[-6.8, 13], [-6.8, -5.4], [6.8, -5.4], [6.8, 13]], n: 2 },
    { y: 62, pts: [[-19, 0.5], [19, 0.5], [19, 7.5], [-19, 7.5]], n: 2 },
    { y: 130, pts: [[-12, 9], [12, 9], [12, -6], [-12, -6]], n: 1 },
  ];
  const walkers = [];
  let id = 0;
  for (const r of routes) {
    const segs = []; let total = 0;
    for (let i = 0; i < r.pts.length; i++) {
      const a = r.pts[i], b = r.pts[(i + 1) % r.pts.length];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]); segs.push({ a, b, len, start: total }); total += len;
    }
    for (let k = 0; k < r.n; k++) {
      const p = person(id++);
      walkers.push({ ...p, y: r.y, segs, total, s: (k / r.n) * total + Math.random() * 3, v: 1.1 + Math.random() * 0.5, dir: id % 3 === 0 ? -1 : 1, ph: Math.random() * 6 });
    }
  }
  ctx.animators.push((dt) => {
    for (const w of walkers) {
      w.s = (w.s + w.v * dt * w.dir + w.total) % w.total;
      let sg = w.segs[0];
      for (const q of w.segs) if (w.s >= q.start) sg = q;
      const f = (w.s - sg.start) / sg.len;
      const x = sg.a[0] + (sg.b[0] - sg.a[0]) * f, z = sg.a[1] + (sg.b[1] - sg.a[1]) * f;
      const yaw = Math.atan2((sg.b[0] - sg.a[0]) * w.dir, (sg.b[1] - sg.a[1]) * w.dir);
      let dy = yaw - w.g.rotation.y; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      w.g.rotation.y += dy * Math.min(1, dt * 8);
      w.ph += dt * w.v * 5.2;
      const sw = Math.sin(w.ph) * 0.55;
      w.l1.rotation.x = sw; w.l2.rotation.x = -sw; w.a1.rotation.x = -sw * 0.8; w.a2.rotation.x = sw * 0.8;
      w.g.position.set(x, w.y + Math.abs(Math.cos(w.ph)) * 0.04, z);
    }
  });
  return walkers;
}

// ======================= 玩家发射的 3D 弹幕 =======================
const flying = [];
export function spawnDanmaku3D(scene, text, color, camera) {
  const { tex, aspect } = textTexture(text, { size: 72, color, stroke: 'rgba(0,0,0,0.55)' });
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false, fog: false });
  const sp = new THREE.Sprite(mat);
  const h = 0.9; sp.scale.set(h * aspect, h, 1);
  const fwd = new THREE.Vector3(); camera.getWorldDirection(fwd);
  const right = new THREE.Vector3().crossVectors(fwd, camera.up).normalize();
  sp.position.copy(camera.position).addScaledVector(fwd, 7).addScaledVector(right, 6).add(new THREE.Vector3(0, 0.6 + Math.random() * 1.2, 0));
  sp.userData = { v: right.clone().multiplyScalar(-3.2).add(new THREE.Vector3(0, 0.35, 0)), life: 9 };
  scene.add(sp); flying.push(sp);
  if (flying.length > 24) { const o = flying.shift(); scene.remove(o); o.material.map.dispose(); o.material.dispose(); }
}
ctx.animators.push((dt) => {
  for (let i = flying.length - 1; i >= 0; i--) {
    const sp = flying[i], u = sp.userData;
    sp.position.addScaledVector(u.v, dt); u.life -= dt;
    sp.material.opacity = Math.min(1, u.life / 1.5);
    if (u.life <= 0) { sp.parent.remove(sp); sp.material.map.dispose(); sp.material.dispose(); flying.splice(i, 1); }
  }
});

// ======================= 合成音效（Web Audio，无外部文件） =======================
export const Sound = {
  ac: null, on: true, master: null,
  init() {
    if (this.ac) { this.ac.resume?.(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    this.ac = new AC(); this.master = this.ac.createGain(); this.master.gain.value = 0.6; this.master.connect(this.ac.destination);
  },
  tone(freq, dur, { type = 'sine', vol = 0.15, delay = 0, slide = null } = {}) {
    if (!this.ac || !this.on) return;
    const t0 = this.ac.currentTime + delay;
    const o = this.ac.createOscillator(), g = this.ac.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(this.master); o.start(t0); o.stop(t0 + dur + 0.05);
  },
  noise(dur, { vol = 0.3, freq = 1200, delay = 0 } = {}) {
    if (!this.ac || !this.on) return;
    const t0 = this.ac.currentTime + delay;
    const len = Math.floor(this.ac.sampleRate * dur), buf = this.ac.createBuffer(1, len, this.ac.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.2);
    const s = this.ac.createBufferSource(); s.buffer = buf;
    const f = this.ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq;
    const g = this.ac.createGain(); g.gain.value = vol;
    s.connect(f); f.connect(g); g.connect(this.master); s.start(t0);
  },
  whoosh() { this.noise(0.7, { vol: 0.35, freq: 700 }); this.tone(160, 0.5, { vol: 0.08, slide: 420 }); },
  // 持续风声：循环噪声 + 低通，音量随速度
  wind(level) {
    if (!this.ac) return;
    if (!this._wind) {
      const len = this.ac.sampleRate * 2, buf = this.ac.createBuffer(1, len, this.ac.sampleRate), d = buf.getChannelData(0);
      let last = 0; for (let i = 0; i < len; i++) { last = last * 0.97 + (Math.random() * 2 - 1) * 0.03; d[i] = last * 6; }
      const src = this.ac.createBufferSource(); src.buffer = buf; src.loop = true;
      const f = this.ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500;
      const g = this.ac.createGain(); g.gain.value = 0;
      src.connect(f); f.connect(g); g.connect(this.master); src.start();
      this._wind = { g, f };
    }
    const v = this.on ? level * 0.5 : 0;
    this._wind.g.gain.setTargetAtTime(v, this.ac.currentTime, 0.15);
    this._wind.f.frequency.setTargetAtTime(350 + level * 1400, this.ac.currentTime, 0.2);
  },
  // —— 脚步声：按材质合成（无音频文件）——
  //   marble 石材：清脆高频 click；carpet 地毯：闷；wood 木地板：中频带共鸣；grass 草地：沙沙；metal 金属：叮当
  _stepBuf: null,
  step(surface = 'stone', run = false, vol = 1) {
    if (!this.ac || !this.on) return;
    const ac = this.ac, t0 = ac.currentTime;
    this._foot = !this._foot;
    const pan = ac.createStereoPanner ? ac.createStereoPanner() : null; if (pan) { pan.pan.value = this._foot ? -0.22 : 0.22; pan.connect(this.master); }
    const out = pan || this.master;
    if (!this._stepBuf) {
      const len = Math.floor(ac.sampleRate * 0.25), b = ac.createBuffer(1, len, ac.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1);
      this._stepBuf = b;
    }
    const P = {
      marble: { f: 2600, q: 1.4, dur: 0.06, v: 0.42, body: 140 },
      stone: { f: 1500, q: 1.0, dur: 0.08, v: 0.38, body: 110 },
      carpet: { f: 420, q: 0.7, dur: 0.09, v: 0.5, body: 80 },
      wood: { f: 900, q: 2.2, dur: 0.1, v: 0.45, body: 160 },
      grass: { f: 3800, q: 0.5, dur: 0.16, v: 0.22, body: 0 },
      metal: { f: 3200, q: 6, dur: 0.12, v: 0.25, body: 420 },
    }[surface] || { f: 1500, q: 1, dur: 0.08, v: 0.38, body: 110 };
    const k = (run ? 1.35 : 1) * vol * (0.85 + Math.random() * 0.3);
    const src = ac.createBufferSource(); src.buffer = this._stepBuf; src.playbackRate.value = 0.85 + Math.random() * 0.3;
    const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = P.f * (0.9 + Math.random() * 0.2); bp.Q.value = P.q;
    const g = ac.createGain(); const dur = P.dur * (run ? 0.85 : 1);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(P.v * k, t0 + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(bp); bp.connect(g); g.connect(out); g.connect(this.revSend()); src.start(t0); src.stop(t0 + dur + 0.02);
    if (P.body) { // 低频“咚”：脚跟着地
      const o = ac.createOscillator(), og = ac.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(P.body * (run ? 1.1 : 1), t0); o.frequency.exponentialRampToValueAtTime(P.body * 0.5, t0 + 0.07);
      og.gain.setValueAtTime(0.0001, t0); og.gain.exponentialRampToValueAtTime(0.18 * k, t0 + 0.005); og.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.09);
      o.connect(og); og.connect(out); og.connect(this.revSend()); o.start(t0); o.stop(t0 + 0.12);
    }
  },
  // —— 空间混响：大堂/放映厅回声大，办公室小，室外几乎没有 ——
  revSend() {
    if (this._rev) return this._rev.send;
    const ac = this.ac, len = Math.floor(ac.sampleRate * 2.4), ir = ac.createBuffer(2, len, ac.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
    const conv = ac.createConvolver(); conv.buffer = ir;
    const send = ac.createGain(); send.gain.value = 0;
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3800;
    send.connect(conv); conv.connect(lp); lp.connect(this.master);
    this._rev = { send };
    return send;
  },
  room(kind) {
    if (!this.ac) return;
    const v = { hall: 0.55, theater: 0.45, room: 0.18, cab: 0.08, outdoor: 0.03 }[kind] ?? 0.1;
    this.revSend().gain.setTargetAtTime(v, this.ac.currentTime, 0.3);
  },
  // 双音电梯到站铃 + 语音播报
  arrive(floorName) {
    this.tone(1318, 0.9, { vol: 0.12 }); this.tone(1046, 1.2, { vol: 0.1, delay: 0.32 });
    try {
      if (this.on && window.speechSynthesis && floorName) {
        const u = new SpeechSynthesisUtterance(`${floorName}，到了`); u.lang = 'zh-CN'; u.rate = 1.05; u.pitch = 1.1; u.volume = 0.6;
        setTimeout(() => speechSynthesis.speak(u), 700);
      }
    } catch (_) {}
  },
  motor(dur) { this.tone(55, dur, { type: 'sawtooth', vol: 0.02 }); this.tone(110, dur, { type: 'sine', vol: 0.015 }); this.noise(dur, { vol: 0.03, freq: 300 }); },
  doorSlide() { this.noise(1.0, { vol: 0.06, freq: 420 }); this.tone(180, 0.9, { type: 'sine', vol: 0.02, slide: 140 }); },
  rustle(v = 1) { if (!this.ac || !this.on) return; this.noise(0.12, { vol: 0.035 * v, freq: 2200 }); },
  breath(v = 1) { if (!this.ac || !this.on) return; this.noise(0.5, { vol: 0.05 * v, freq: 900 }); },
  land(heavy = 1) { this.step('stone', true, 1.6 * heavy); this.tone(90, 0.18, { vol: 0.14 * heavy, slide: 45 }); },
  // —— 环境底噪：室内空调 / 室外城市（随所在区域切换）——
  ambience(kind) {
    if (!this.ac) return;
    if (!this._amb) {
      const mk = (freq, q) => {
        const len = this.ac.sampleRate * 3, b = this.ac.createBuffer(1, len, this.ac.sampleRate), d = b.getChannelData(0);
        let l = 0; for (let i = 0; i < len; i++) { l = l * 0.98 + (Math.random() * 2 - 1) * 0.02; d[i] = l * 8; }
        const s = this.ac.createBufferSource(); s.buffer = b; s.loop = true;
        const f = this.ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq; f.Q.value = q;
        const g = this.ac.createGain(); g.gain.value = 0;
        s.connect(f); f.connect(g); g.connect(this.master); s.start(); return g;
      };
      this._amb = { indoor: mk(260, 0.8), city: mk(700, 0.4) };
    }
    const tgt = { indoor: kind === 'indoor' ? 0.05 : 0, city: kind === 'city' ? 0.07 : 0 };
    for (const k of ['indoor', 'city']) this._amb[k].gain.setTargetAtTime(this.on ? tgt[k] : 0, this.ac.currentTime, 0.6);
  },
  pour() { this.noise(1.2, { vol: 0.18, freq: 2400 }); this.tone(600, 1.1, { type: 'sine', vol: 0.03, slide: 1400 }); },
  clink() { this.tone(2600, 0.25, { type: 'sine', vol: 0.07 }); this.tone(3400, 0.3, { type: 'sine', vol: 0.05, delay: 0.02 }); },
  can() { this.noise(0.12, { vol: 0.35, freq: 3000 }); this.tone(180, 0.14, { vol: 0.16, slide: 80, delay: 0.32 }); this.noise(0.25, { vol: 0.18, freq: 5000, delay: 0.6 }); },
  page() { this.noise(0.18, { vol: 0.16, freq: 5200 }); },
  meow() { this.tone(700, 0.35, { type: 'triangle', vol: 0.06, slide: 1100 }); this.tone(900, 0.3, { type: 'triangle', vol: 0.05, delay: 0.3, slide: 600 }); },
  coin() { this.tone(988, 0.09, { type: 'square', vol: 0.06 }); this.tone(1319, 0.32, { type: 'square', vol: 0.06, delay: 0.08 }); },
  ding() { this.tone(1047, 0.9, { vol: 0.16 }); this.tone(784, 1.1, { vol: 0.12, delay: 0.28 }); },
  click() { this.tone(660, 0.05, { type: 'triangle', vol: 0.05 }); },
  send() { this.tone(520, 0.12, { type: 'triangle', vol: 0.07, slide: 1040 }); },
  pop() { this.noise(0.9, { vol: 0.35, freq: 900 }); this.tone(180, 0.3, { vol: 0.12, slide: 60 }); },
  shutter() { this.noise(0.08, { vol: 0.4, freq: 4000 }); this.noise(0.06, { vol: 0.3, freq: 3000, delay: 0.09 }); },
  win() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.35, { type: 'square', vol: 0.05, delay: i * 0.11 })); this.tone(1319, 0.8, { type: 'square', vol: 0.05, delay: 0.46 }); },
};
