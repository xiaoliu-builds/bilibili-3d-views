// 第一人称手持物 + 真实互动动画（按 E 不再只是弹窗：会出现动作、物件、声音和世界里的变化）
import * as THREE from 'three';
import { ctx, std } from './common.js';
import { makeTV } from './tower.js';
import { PINK, BLUE, FONT, roundRect } from './textures.js';

let holder = null;     // 挂在相机上的手部 + 物品
let held = null;       // 当前手持物 { obj, name, uses, onUse }
const anims = [];      // 世界中的临时动画
export function propsTick(dt) {
  for (let i = anims.length - 1; i >= 0; i--) if (anims[i](dt)) anims.splice(i, 1);
  if (holder) {
    holder.userData.t += dt;
    const t = holder.userData.t;
    // 手持物轻微呼吸晃动 + 动作曲线
    const act = holder.userData.act;
    let ax = 0, ay = 0, az = 0, rx = 0;
    if (act) {
      act.t += dt; const k = Math.min(1, act.t / act.d);
      const s = Math.sin(k * Math.PI);
      ({ ax = 0, ay = 0, az = 0, rx = 0 } = act.curve(s, k));
      if (k >= 1) { holder.userData.act = null; act.done && act.done(); }
    }
    holder.position.set(0.3 + ax, -0.3 + Math.sin(t * 2) * 0.005 + ay + holder.userData.enter, -0.66 + az);
    holder.rotation.set(-0.12 + rx, -0.25, 0.04);
    holder.userData.enter *= Math.pow(0.002, dt);
  }
}
export function tween(d, f, done) { let t = 0; anims.push((dt) => { t += dt; const k = Math.min(1, t / d); f(k); if (k >= 1) { done && done(); return true; } return false; }); }
export const easeOut = (k) => 1 - Math.pow(1 - k, 3);
export const easeInOut = (k) => k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;

function ensureHolder(camera) {
  if (holder) return holder;
  holder = new THREE.Group(); holder.userData = { t: 0, act: null, enter: 0 };
  holder.scale.setScalar(0.62);
  const skin = new THREE.MeshStandardMaterial({ color: 0xf2c9a8, roughness: 0.65 });
  const sleeve = new THREE.MeshStandardMaterial({ color: 0x2a3550, roughness: 0.8 });
  const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.36, 4, 10), sleeve); arm.rotation.x = Math.PI / 2 - 0.25; arm.position.set(0.04, -0.06, 0.24); holder.add(arm);
  const palm = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 10), skin); palm.scale.set(1, 0.75, 1.15); palm.position.set(0, -0.02, 0.02); holder.add(palm);
  for (let i = 0; i < 4; i++) { const f = new THREE.Mesh(new THREE.CapsuleGeometry(0.014, 0.05, 4, 6), skin); f.position.set(-0.04, 0.0 + (i - 1.5) * 0.024, -0.02); f.rotation.z = Math.PI / 2; holder.add(f); }
  const slot = new THREE.Group(); slot.position.set(-0.02, 0.06, -0.02); holder.add(slot); holder.userData.slot = slot;
  holder.visible = false;
  camera.add(holder);
  return holder;
}

/** 让玩家手里拿着某样东西。onUse：再次按 E（无其他互动目标时）触发 */
export function hold(camera, obj, name, { uses = 1, onUse, onDrop } = {}) {
  ensureHolder(camera);
  drop(true);
  const slot = holder.userData.slot;
  slot.add(obj);
  obj.traverse(o => { if (o.isMesh) { o.castShadow = false; o.renderOrder = 10; } });
  held = { obj, name, uses, onUse, onDrop };
  holder.visible = true; holder.userData.enter = -0.4;
  document.body.classList.add('holding');
  const hint = document.querySelector('#heldHint');
  if (hint) { hint.querySelector('b').textContent = name; hint.classList.add('show'); }
}
export function drop(silent = false) {
  if (!held) return;
  held.obj.parent && held.obj.parent.remove(held.obj);
  if (!silent && held.onDrop) held.onDrop();
  held = null;
  if (holder) holder.visible = false;
  document.body.classList.remove('holding');
  document.querySelector('#heldHint')?.classList.remove('show');
}
export function isHolding() { return !!held; }
export function heldName() { return held ? held.name : null; }
/** 把手里的东西交出去（送礼 / 委托），不触发 onDrop */
export function consumeHeld() { drop(true); }
/** 使用手中物品（喝 / 吃 / 翻书），uses 用完自动消失 */
export function useHeld() {
  if (!held || holder.userData.act) return false;
  const h = held;
  holder.userData.act = {
    t: 0, d: 0.9,
    curve: (s) => ({ ax: -0.2 * s, ay: 0.16 * s, az: 0.1 * s, rx: 0.7 * s }),
    done: () => { h.onUse && h.onUse(); h.uses--; if (h.uses <= 0) drop(); },
  };
  return true;
}
export function gesture(kind = 'reach') {
  if (!holder) return;
  holder.visible = true;
  const curves = {
    reach: (s) => ({ az: -0.28 * s, ay: 0.08 * s }),
    pat: (s, k) => ({ az: -0.3 * s, ay: -0.05 * s + Math.sin(k * Math.PI * 6) * 0.03 }),
    wave: (s, k) => ({ ax: Math.sin(k * Math.PI * 4) * 0.08, ay: 0.18 * s }),
  };
  holder.userData.act = { t: 0, d: kind === 'pat' ? 1.4 : 0.8, curve: curves[kind] || curves.reach, done: () => { if (!held) holder.visible = false; } };
}
export function initHands(camera) { ensureHolder(camera); }

// ======================================================================
// 物件工厂
// ======================================================================
export function makeCan(color = '#e53935', label = '可乐') {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128; const g = c.getContext('2d');
  g.fillStyle = color; g.fillRect(0, 0, 256, 128);
  g.fillStyle = 'rgba(255,255,255,0.9)'; g.font = `900 46px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(label, 128, 66);
  g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(0, 10, 256, 6); g.fillRect(0, 112, 256, 6);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const grp = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.033, 0.033, 0.12, 20), new THREE.MeshStandardMaterial({ map: t, metalness: 0.6, roughness: 0.3 }));
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.033, 0.01, 20), new THREE.MeshStandardMaterial({ color: 0xcfd4da, metalness: 1, roughness: 0.25 })); top.position.y = 0.065;
  grp.add(body, top); return grp;
}
export function makeCake() {
  const g = new THREE.Group();
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.07, 0.008, 24), std(0xffffff, { roughness: 0.2 })); g.add(plate);
  const cake = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.05, 20), std(0xffc2d4, { roughness: 0.7 })); cake.position.y = 0.03; g.add(cake);
  const cream = new THREE.Mesh(new THREE.CylinderGeometry(0.047, 0.047, 0.012, 20), std(0xffffff, { roughness: 0.6 })); cream.position.y = 0.058; g.add(cream);
  const berry = new THREE.Mesh(new THREE.SphereGeometry(0.014, 10, 8), std(0xe53950, { roughness: 0.35 })); berry.position.y = 0.072; g.add(berry);
  return g;
}
export function makeTray() {
  const g = new THREE.Group();
  const tray = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.012, 0.18), std(0xffa64d, { roughness: 0.5 })); g.add(tray);
  const bowls = [[-0.07, 0.03, 0xd9603b], [0.0, -0.04, 0xffffff], [0.07, 0.03, 0x6aa84f]];
  for (const [x, z, c] of bowls) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.025, 0.03, 16), std(0xffffff)); b.position.set(x, 0.02, z); g.add(b); const f = new THREE.Mesh(new THREE.CylinderGeometry(0.031, 0.031, 0.006, 16), std(c, { roughness: 0.8 })); f.position.set(x, 0.034, z); g.add(f); }
  const chop = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.004, 0.16), std(0x8b5a2b)); chop.position.set(0.11, 0.012, 0); g.add(chop);
  g.scale.setScalar(0.85); return g;
}
export function makeBook(color = 0xc0392b, title = '') {
  const g = new THREE.Group();
  const cover = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.016, 0.15), std(color, { roughness: 0.6 })); g.add(cover);
  const pages = new THREE.Mesh(new THREE.BoxGeometry(0.104, 0.012, 0.144), std(0xfaf6ea)); pages.position.set(0.002, 0, 0); g.add(pages);
  g.rotation.z = 0.3; return g;
}
export function makeCocktail() {
  const g = new THREE.Group();
  const glassM = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.3, roughness: 0.02, metalness: 0, depthWrite: false });
  const bowl = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.06, 20, 1, true), glassM); bowl.rotation.x = Math.PI; bowl.position.y = 0.09; g.add(bowl);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.07, 8), glassM); stem.position.y = 0.025; g.add(stem);
  const layers = [[0xff4d7a, 0.075], [0x2fb5ff, 0.088], [0xffc23d, 0.1]];
  for (const [c, y] of layers) { const r = 0.012 + (y - 0.06) * 0.85; const l = new THREE.Mesh(new THREE.CylinderGeometry(r, r - 0.006, 0.013, 16), new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.4, transparent: true, opacity: 0.9 })); l.position.y = y; g.add(l); }
  const lemon = new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.005, 6, 16), std(0xfff07a)); lemon.position.set(0.04, 0.11, 0); g.add(lemon);
  return g;
}
export function makeToyTV(color = PINK) { const t = makeTV(0.09, color, { glowBody: 0.3 }); return t; }
export function makeCard(rarity = 'R') {
  const c = document.createElement('canvas'); c.width = 128; c.height = 180; const g = c.getContext('2d');
  const col = rarity === 'SSR' ? ['#ffd166', '#ff6fa3'] : rarity === 'SR' ? ['#b38cff', '#00AEEC'] : ['#d6dbe1', '#9aa2ad'];
  const gr = g.createLinearGradient(0, 0, 128, 180); gr.addColorStop(0, col[0]); gr.addColorStop(1, col[1]); g.fillStyle = gr; roundRect(g, 0, 0, 128, 180, 12); g.fill();
  g.fillStyle = '#fff'; g.font = `900 34px ${FONT}`; g.textAlign = 'center'; g.fillText(rarity, 64, 160);
  g.strokeStyle = '#fff'; g.lineWidth = 6; g.strokeRect(14, 14, 100, 110);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.09, 0.126), new THREE.MeshBasicMaterial({ map: t, side: THREE.DoubleSide, toneMapped: false }));
  m.rotation.set(-0.4, 0.2, 0); return m;
}

// ======================================================================
// 世界动画工具：飘字 / 爱心 / 硬币飞出 / 物体弹跳
// ======================================================================
const floatGeo = new THREE.PlaneGeometry(1, 1);
export function floatText(scene, pos, text, color = '#ffffff', size = 0.42) {
  text = String(text).replace(/\s*[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]\uFE0F?/gu, '').trim() || '+1';
  const c = document.createElement('canvas'); const g = c.getContext('2d');
  g.font = `900 64px ${FONT}`; const w = Math.ceil(g.measureText(text).width) + 30; c.width = w; c.height = 90;
  g.font = `900 64px ${FONT}`; g.textBaseline = 'middle'; g.lineWidth = 8; g.strokeStyle = 'rgba(0,0,0,0.55)'; g.strokeText(text, 15, 47); g.fillStyle = color; g.fillText(text, 15, 47);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, toneMapped: false, sizeAttenuation: true }));
  sp.scale.set(size * w / 90, size, 1); sp.position.copy(pos); sp.renderOrder = 6; scene.add(sp);
  const y0 = pos.y;
  tween(1.6, (k) => { sp.position.y = y0 + easeOut(k) * 0.9; sp.material.opacity = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3; }, () => { scene.remove(sp); t.dispose(); sp.material.dispose(); });
}
const heartTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  g.fillStyle = '#ff6f9c'; g.beginPath(); g.moveTo(32, 56); g.bezierCurveTo(-10, 28, 14, -4, 32, 18); g.bezierCurveTo(50, -4, 74, 28, 32, 56); g.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
})();
export function hearts(scene, pos, n = 5) {
  for (let i = 0; i < n; i++) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: heartTex, transparent: true, depthWrite: false, toneMapped: false }));
    sp.scale.setScalar(0.18 + Math.random() * 0.1); sp.position.copy(pos); scene.add(sp);
    const dx = (Math.random() - 0.5) * 0.6, dz = (Math.random() - 0.5) * 0.6, dl = i * 0.12;
    let t = -dl;
    anims.push((dt) => { t += dt; if (t < 0) { sp.visible = false; return false; } sp.visible = true; const k = Math.min(1, t / 1.4); sp.position.set(pos.x + dx * k, pos.y + k * 1.1, pos.z + dz * k); sp.material.opacity = 1 - k; if (k >= 1) { scene.remove(sp); sp.material.dispose(); return true; } return false; });
  }
}
export function bounce(obj, amp = 0.25, d = 0.5) {
  const y0 = obj.position.y;
  tween(d, (k) => { obj.position.y = y0 + Math.sin(k * Math.PI) * amp * (1 - k * 0.3); }, () => { obj.position.y = y0; });
}
export function spinOnce(obj, axis = 'y', d = 0.6) {
  const r0 = obj.rotation[axis];
  tween(d, (k) => { obj.rotation[axis] = r0 + easeInOut(k) * Math.PI * 2; });
}
/** 物体从 a 飞到 b（抛物线），完成后回调 */
export function arc(scene, obj, a, b, h = 0.6, d = 0.6, done) {
  if (!obj.parent) scene.add(obj);
  tween(d, (k) => { obj.position.lerpVectors(a, b, k); obj.position.y += Math.sin(k * Math.PI) * h; obj.rotation.x += 0.3; }, done);
}
