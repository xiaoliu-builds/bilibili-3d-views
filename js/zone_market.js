// 西南街区：哔哩夜市 · 游乐园 —— 小吃摊、打气球、套圈、旋转木马、跳楼机、许愿池、彩灯串
import * as THREE from 'three';
import { ctx, box, addCollider, std, glow, hotspot, tree } from './common.js';
import { interactable, landmarks } from './districts.js';
import { drawTV, PINK, BLUE, FONT } from './textures.js';
import { hold, makeCan, floatText, hearts } from './props.js';
import { addNPC } from './people.js';
import { ZONES, Z, TIER, label, neon, zone, ground, canvasTex, instanced, nightBasic, startRide, pay } from './zone_util.js';

const { x: CX, z: CZ } = ZONES.market;
let carousel = null, drop = null, balloons = [], wish = null;

function stall(root, x, z, ry, name, color, sign) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; root.add(g);
  const wood = std(0x8b5a36, { roughness: 0.8 }), cloth = std(color, { roughness: 0.75 });
  box(g, wood, 4.4, 1.05, 1.6, 0, 0, 0.4, { collide: false });
  box(g, std(0xf2ece2, { roughness: 0.6 }), 4.5, 0.08, 1.7, 0, 1.05, 0.4, { collide: false });
  for (const sx of [-2.1, 2.1]) for (const sz of [-0.4, 1.2]) box(g, wood, 0.12, 2.9, 0.12, sx, 0, sz, { collide: false });
  // 条纹雨棚
  const aw = canvasTex(256, 64, (c) => { for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#ffffff' : color; c.fillRect(i * 32, 0, 32, 64); } });
  const roof = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.1, 2.4), new THREE.MeshStandardMaterial({ map: aw, roughness: 0.7 })); roof.position.set(0, 3.0, 0.5); roof.rotation.x = -0.18; g.add(roof);
  const val = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 0.4), new THREE.MeshStandardMaterial({ map: aw, side: THREE.DoubleSide })); val.position.set(0, 2.72, 1.72); g.add(val);
  label(g, sign, 0, 3.55, 0.25, 0, 0.6, 'rgba(16,14,30,0.9)', '#ffd98a');
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), glow(0xffd6a0, 0.6, 2.4)); lamp.position.set(0, 2.55, 0.9); g.add(lamp);
  g.updateMatrixWorld(true);
  const a = new THREE.Vector3(-2.3, 0, -0.5).applyMatrix4(g.matrixWorld), b = new THREE.Vector3(2.3, 0, 1.3).applyMatrix4(g.matrixWorld);
  addCollider(Math.min(a.x, b.x), 0, Math.min(a.z, b.z), Math.max(a.x, b.x), 1.1, Math.max(a.z, b.z));
  const front = new THREE.Vector3(0, 0, 2.6).applyMatrix4(g.matrixWorld);
  return { g, front };
}
function stringLights(root, pts, h = 4.4) {
  const items = [], wire = [];
  for (let s = 0; s < pts.length - 1; s++) {
    const [ax, az] = pts[s], [bx, bz] = pts[s + 1], L = Math.hypot(bx - ax, bz - az), n = Math.max(4, Math.floor(L / 0.9));
    for (let i = 0; i <= n; i++) { const k = i / n, sag = Math.sin(k * Math.PI) * 0.7; items.push({ x: ax + (bx - ax) * k, y: h - sag, z: az + (bz - az) * k, color: ['#ffd27a', '#FB7299', '#7fd8ff', '#b5ff8a', '#ffffff'][(i + s) % 5] }); }
  }
  instanced(root, new THREE.SphereGeometry(0.09, 6, 5), nightBasic(ctx, 0xffffff, 0.6, 1.8), items);
}

export function buildMarket(scene) {
  return zone(scene, CX, CZ, (root) => {
    const tileT = canvasTex(256, 256, (g) => { g.fillStyle = '#8a7c70'; g.fillRect(0, 0, 256, 256); g.strokeStyle = 'rgba(40,30,20,0.35)'; g.lineWidth = 3; for (let i = 0; i <= 256; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 256); g.moveTo(0, i); g.lineTo(256, i); g.stroke(); } for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(255,255,255,${Math.random() * 0.06})`; g.fillRect(Math.random() * 256, Math.random() * 256, 3, 3); } }, 22, 22);
    ground(root, CX, CZ, 176, 176, 0xffffff, tileT);
    // 入口牌坊（东侧，朝向园区）
    const gx = CX + 84, gz = CZ;
    const red = std(0xc8323c, { roughness: 0.5 }), gold = std(0xffc94d, { roughness: 0.3, metalness: 0.6 });
    for (const sz of [-8, 8]) box(root, red, 1.2, 8, 1.2, gx, 0, gz + sz, { collide: true });
    box(root, red, 1.6, 1.2, 19, gx, 8, gz, { collide: false }); box(root, gold, 1.8, 0.25, 19.4, gx, 9.2, gz, { collide: false });
    label(root, '哔哩夜市 · 游乐园', gx + 0.85, 8.6, gz, Math.PI / 2, 1.5, 'rgba(200,50,60,0.0)', '#ffe08a');
    label(root, '哔哩夜市 · 游乐园', gx - 0.85, 8.6, gz, -Math.PI / 2, 1.5, 'rgba(200,50,60,0.0)', '#ffe08a');
    for (const sz of [-8, 8]) { const l = new THREE.Mesh(new THREE.SphereGeometry(0.55, 14, 10), glow(0xff5a4a, 0.6, 2.2)); l.position.set(gx + 0.9, 6.6, gz + sz); root.add(l); }
    // 小吃街（两排摊位）
    const foods = [['烤串', '#e85d3b', '炭烤肉串'], ['奶茶', PINK, '三连奶茶'], ['章鱼烧', '#ffb027', '章鱼小丸子'], ['棉花糖', '#ff9cc8', '彩虹棉花糖'], ['糖葫芦', '#c8323c', '冰糖葫芦'], ['臭豆腐', '#7a5c3a', '长沙臭豆腐'], ['烤冷面', '#3a7bd5', '东北烤冷面'], ['冰粉', '#4fc3a1', '红糖冰粉']];
    const stalls = [];
    foods.forEach(([n, c, item], i) => {
      const row = i < 4 ? -1 : 1, k = i % 4;
      const s = stall(root, CX + 66 - k * 9, CZ + row * 9, row < 0 ? 0 : Math.PI, n, c, n);
      stalls.push(s);
      interactable({ pos: s.front, r: 2.2, icon: '🍱', label: `买一份「${item}」（1 硬币）`, cooldown: 1, action: (a) => {
        if (!pay(1, item)) return;
        const m = makeCan(c, n); hold(Z.D.camera, m, item, { uses: 2, onUse: () => { Z.D.Sound.tone(420, 0.12, { type: 'sine', vol: 0.05 }); floatText(Z.D.scene, Z.D.camera.position.clone().add(new THREE.Vector3(-Math.sin(Z.D.player.yaw) * 1.2, -0.2, -Math.cos(Z.D.player.yaw) * 1.2)), '好吃！', '#ffd98a', 0.24); } });
        Z.D.GP.emit('snack', 1); a.toast(`买到「${item}」！${Z.D.isTouch ? '点「互动」' : '按 <kbd>E</kbd>'} 吃一口，也可以送给同事`, 'bento', c);
      } });
    });
    stringLights(root, [[CX + 72, CZ - 6], [CX + 34, CZ - 6]]); stringLights(root, [[CX + 72, CZ + 6], [CX + 34, CZ + 6]]);
    stringLights(root, [[CX + 72, CZ - 6], [CX + 72, CZ + 6]], 4.8); stringLights(root, [[CX + 34, CZ - 6], [CX + 34, CZ + 6]], 4.8);
    // ---- 旋转木马（西北侧）----
    const cx1 = CX - 20, cz1 = CZ - 38;
    carousel = new THREE.Group(); carousel.position.set(cx1, 0, cz1); carousel.userData.dynamic = true; root.add(carousel);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(8, 8.3, 0.6, 40), std(0xf2ece2, { roughness: 0.5 })); base.position.y = 0.3; root.add(base); base.position.set(cx1, 0.3, cz1);
    const top = new THREE.Mesh(new THREE.ConeGeometry(8.6, 3.4, 32), std(PINK, { roughness: 0.5 })); top.position.y = 6.6; carousel.add(top);
    const fringe = new THREE.Mesh(new THREE.CylinderGeometry(8.6, 8.6, 0.8, 32, 1, true), std(0xffffff, { side: THREE.DoubleSide })); fringe.position.y = 4.9; carousel.add(fringe);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 6, 16), gold); pole.position.y = 3; carousel.add(pole);
    const bulbs = []; for (let i = 0; i < 32; i++) { const a = i / 32 * Math.PI * 2; bulbs.push({ x: cx1 + Math.cos(a) * 8.65, y: 4.9, z: cz1 + Math.sin(a) * 8.65, color: i % 2 ? '#ffd27a' : '#ffffff' }); }
    instanced(root, new THREE.SphereGeometry(0.12, 6, 5), nightBasic(ctx, 0xffffff, 0.7, 1.9), bulbs);
    carousel.userData.horses = [];
    const hc = [0xffffff, PINK, BLUE, 0xffd166];
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2, hg = new THREE.Group(); hg.position.set(Math.cos(a) * 5.6, 1.6, Math.sin(a) * 5.6); hg.rotation.y = -a; carousel.add(hg);
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 4.6, 8), gold); rod.position.y = 1.2; hg.add(rod);
      const hm = std(hc[i % 4], { roughness: 0.4 });
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.9, 4, 10), hm); body.rotation.x = Math.PI / 2; hg.add(body);
      const neck = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.5, 4, 8), hm); neck.position.set(0, 0.42, 0.55); neck.rotation.x = -0.6; hg.add(neck);
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.28, 0.5), hm); head.position.set(0, 0.72, 0.8); hg.add(head);
      for (const [lx, lz] of [[-0.18, 0.45], [0.18, 0.45], [-0.18, -0.45], [0.18, -0.45]]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.7, 6), hm); l.position.set(lx, -0.5, lz); hg.add(l); }
      const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.1, 0.4), std(0xc8323c)); saddle.position.y = 0.34; hg.add(saddle);
      carousel.userData.horses.push(hg);
    }
    addCollider(cx1 - 8.3, 0, cz1 - 8.3, cx1 + 8.3, 0.6, cz1 + 8.3);
    label(root, '梦幻旋转木马', cx1, 1.4, cz1 + 8.5, 0, 0.7, 'rgba(251,114,153,0.95)');
    interactable({ pos: new THREE.Vector3(cx1, 0, cz1 + 10), r: 2.6, icon: '🎡', label: '坐旋转木马（1 硬币）', cooldown: 2, action: () => {
      if (!pay(1, '旋转木马')) return;
      const D = Z.D; const tune = [523, 659, 784, 659, 698, 880, 784, 659, 587, 698, 659, 523];
      for (let r = 0; r < 3; r++) tune.forEach((f, i) => D.Sound.tone(f, 0.42, { type: 'triangle', vol: 0.05, delay: r * 5.2 + i * 0.43 }));
      const h = carousel.userData.horses[0], tmp = new THREE.Vector3(), look = new THREE.Vector3(cx1, 2.2, cz1);
      startRide(16, (t) => { h.getWorldPosition(tmp); tmp.y += 1.2; const fwd = new THREE.Vector3(Math.cos(carousel.rotation.y), 0, -Math.sin(carousel.rotation.y)); return { pos: tmp.clone(), look: tmp.clone().add(new THREE.Vector3(-tmp.z + cz1, 0, tmp.x - cx1).normalize().multiplyScalar(-6)).setY(2.4) }; }, () => { D.GP.emit('attraction', 1); D.GP.gainXP(15); D.toast('旋转木马转完啦，童心 +1', 'smile', PINK); });
    } });
    // ---- 跳楼机（西南侧）----
    const dx = CX - 52, dz = CZ + 30, H = 42;
    const tower = std(0xe9edf3, { metalness: 0.5, roughness: 0.35 });
    box(root, tower, 2.2, H, 2.2, dx, 0, dz, { collide: true });
    for (let y = 4; y < H; y += 4) box(root, neon(y % 8 ? PINK : BLUE, 1.4), 2.4, 0.18, 2.4, dx, y, dz, { collide: false });
    box(root, std(0x2a2e36), 6, 1.6, 6, dx, H, dz, { collide: false }); label(root, '极速跳楼机 · 42m', dx, H + 2.4, dz + 3.05, 0, 1, 'rgba(0,174,236,0.95)');
    drop = new THREE.Group(); drop.position.set(dx, 2, dz); drop.userData.dynamic = true; root.add(drop);
    const ringM = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.35, 8, 24), std(0xffb027, { roughness: 0.4 })); ringM.rotation.x = Math.PI / 2; drop.add(ringM);
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, s = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.9, 0.6), std(i % 2 ? PINK : BLUE)); s.position.set(Math.cos(a) * 2.6, -0.3, Math.sin(a) * 2.6); s.rotation.y = -a; drop.add(s); }
    interactable({ pos: new THREE.Vector3(dx, 0, dz + 5), r: 2.6, icon: '🚀', label: '挑战跳楼机（2 硬币）', cooldown: 2, action: () => {
      if (!pay(2, '跳楼机')) return;
      const D = Z.D; D.Sound.motor?.(5);
      let screamed = false; drop.userData.ride = true;
      startRide(13, (t) => {
        let y;
        if (t < 6) y = 2 + (H - 4) * (t / 6) ** 1.2; else if (t < 8.5) y = H - 2 + Math.sin(t * 3) * 0.05; else { const k = Math.min(1, (t - 8.5) / 1.6); y = H - 2 - (H - 4) * k * k; if (!screamed && t > 8.6) { screamed = true; D.Sound.whoosh?.(); D.Sound.tone(900, 1.2, { type: 'sawtooth', vol: 0.03, slide: 400 }); } if (k >= 1) y = 2 + Math.abs(Math.sin((t - 10.1) * 6)) * 0.4 * Math.max(0, 1 - (t - 10.1)); }
        drop.position.y = y;
        const p = new THREE.Vector3(dx, y + 0.9, dz + 2.7);
        const lookDown = t > 8.2 && t < 10.2;
        return { pos: p, look: lookDown ? new THREE.Vector3(dx, 0, dz + 12) : new THREE.Vector3(dx + Math.sin(t * 0.15) * 40, y * 0.6, dz + 60), fov: lookDown ? 92 : 75 };
      }, () => { drop.position.y = 2; drop.userData.ride = false; D.GP.emit('attraction', 1); D.GP.gainXP(25); D.toast('腿还在抖……勇气值 +1！', 'bolt', '#ffb027'); });
    } });
    // ---- 打气球（射击摊）----
    const bx = CX + 20, bz = CZ - 32;
    const booth = new THREE.Group(); booth.position.set(bx, 0, bz); root.add(booth);
    box(booth, std(0x2a2e36), 8, 4, 0.4, 0, 0, -2, { collide: false }); box(booth, std(0x8b5a36), 8, 1.1, 1, 0, 0, 1.6, { collide: false });
    label(booth, '打气球 · 10 发 3 中有奖', 0, 4.6, -1.7, 0, 0.7, 'rgba(251,114,153,0.95)');
    const bcols = [0xFB7299, 0x00AEEC, 0xffd166, 0x8bd17c, 0x9b8cff];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 7; c++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 10), std(bcols[(r + c) % 5], { roughness: 0.25, metalness: 0.1 })); b.scale.y = 1.15; b.position.set(-3 + c, 1.1 + r * 0.9, -1.7); booth.add(b); balloons.push(b); }
    booth.userData.dynamic = true;
    addCollider(bx - 4, 0, bz - 2.3, bx + 4, 4, bz + 2.1);
    interactable({ pos: new THREE.Vector3(bx, 0, bz + 3.2), r: 2.4, icon: '🎯', label: '打气球（1 硬币 · 10 发）', cooldown: 1, action: () => { if (!pay(1, '打气球')) return; Z.D.openMini('balloon'); } });
    // ---- 套圈 ----
    const rx = CX + 4, rz = CZ + 34;
    const rb = new THREE.Group(); rb.position.set(rx, 0, rz); root.add(rb);
    box(rb, std(0x3a5a3a), 7, 0.3, 5, 0, 0, -1.5, { collide: false });
    for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) { const t = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.5, 10), std(bcols[(r * 4 + c) % 5])); t.position.set(-2.2 + c * 1.5, 0.55, -3 + r * 1.2); rb.add(t); }
    label(rb, '套圈圈 · 套中拿走', 0, 2.2, -4.2, 0, 0.7, 'rgba(0,174,236,0.95)');
    addCollider(rx - 3.6, 0, rz - 4.2, rx + 3.6, 0.4, rz + 1.1);
    interactable({ pos: new THREE.Vector3(rx, 0, rz + 2.4), r: 2.4, icon: '🎯', label: '套圈（1 硬币 · 5 个圈）', cooldown: 1, action: () => { if (!pay(1, '套圈')) return; Z.D.openMini('ring'); } });
    // ---- 许愿池 ----
    const wx = CX - 10, wz = CZ + 2;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(4.2, 0.45, 10, 40), std(0xe6e0d6, { roughness: 0.5 })); rim.rotation.x = Math.PI / 2; rim.position.set(wx, 0.45, wz); root.add(rim);
    const water = new THREE.Mesh(new THREE.CircleGeometry(4, 40), new THREE.MeshStandardMaterial({ color: 0x3a8fd0, roughness: 0.1, metalness: 0.3, emissive: 0x0a3a6a, emissiveIntensity: 0.5 })); water.rotation.x = -Math.PI / 2; water.position.set(wx, 0.55, wz); root.add(water);
    const tv = new THREE.Group(); tv.position.set(wx, 0.6, wz); root.add(tv); tv.userData.dynamic = true;
    const tvB = new THREE.Mesh(new THREE.BoxGeometry(2, 1.5, 1), std(PINK, { roughness: 0.3, emissive: PINK, emissiveIntensity: 0.2 })); tvB.position.y = 1.4; tv.add(tvB);
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.1), new THREE.MeshBasicMaterial({ map: canvasTex(128, 96, (g) => { g.fillStyle = '#fff'; g.fillRect(0, 0, 128, 96); drawTV(g, 64, 50, 60, BLUE, 6); }) })); scr.position.set(0, 1.4, 0.51); tv.add(scr);
    wish = { tv, water, t: 0 };
    addCollider(wx - 4.6, 0, wz - 4.6, wx + 4.6, 0.9, wz + 4.6);
    interactable({ pos: new THREE.Vector3(wx, 0, wz + 5.4), r: 2.4, icon: '✨', label: '往许愿池投一枚硬币许愿', cooldown: 3, action: (a) => {
      if (!pay(1, '许愿')) return;
      const D = Z.D; D.gesture('reach'); setTimeout(() => D.Sound.tone(1200, 0.4, { type: 'sine', vol: 0.05, slide: 1600 }), 300);
      hearts(D.scene, new THREE.Vector3(wx, 2.6, wz), 6);
      const r = Math.random(); let msg, ico = 'sparkles';
      if (r < 0.12) { D.setCoins(D.coins() + 5); msg = '大吉！池底浮出 5 枚硬币——许愿灵验了！'; ico = 'coin'; D.celebrate(5); }
      else if (r < 0.4) { D.GP.gainXP(30); msg = '中吉！你感觉今天工作效率会很高（+30 XP）'; }
      else msg = ['小吉：今天的新番会很好看', '吉：会有人给你一键三连', '吉：电梯会一直等你', '小吉：中午的番茄炒蛋多给一勺'][Math.floor(Math.random() * 4)];
      D.GP.emit('wish', 1); a.toast(msg, ico, '#ffb027');
    } });
    // 树、长椅、气球摊装饰
    for (let i = 0; i < 10; i++) tree(root, CX - 82, CZ - 80 + i * 17, 0.95, 0, true);
    for (let i = 0; i < 6; i++) tree(root, CX - 60 + i * 16, CZ + 82, 0.95, 0, true);
    stringLights(root, [[CX + 84, CZ - 8], [cx1 + 9, cz1 + 2]], 5.5); stringLights(root, [[CX + 84, CZ + 8], [dx + 3, dz - 2]], 5.5);
    hotspot(gx - 6, 0, gz + 11, 2.4, '哔哩夜市 · 游乐园', '<p>夜幕降临，西南街区就变成了热闹的 <b>夜市 + 游乐园</b>。</p><p>小吃街买烤串奶茶，再去 <b>打气球 / 套圈</b> 赢奖品；坐 <b>旋转木马</b>，挑战 42 米 <b>跳楼机</b>；最后往许愿池投一枚硬币，看看今天运气如何。</p><p class="tip">按 <kbd>N</kbd> 切到夜晚，彩灯会亮起来。</p>', 'shop');
    landmarks.push({ name: '哔哩夜市 · 游乐园', desc: '西南街区的夜市和游乐园：小吃、打气球、套圈、旋转木马、跳楼机。', pos: new THREE.Vector3(CX + 20, 0, CZ), r: 70, found: false, icon: 'ferris' });
    // NPC
    const V = (x, z) => new THREE.Vector3(CX + x, 0, CZ + z);
    addNPC(scene, { behavior: 'chat', pos: V(66, -6.5), yaw: 0, name: '烤串摊老板', look: { top: 0xe85d3b }, lines: ['刚烤好的，香得很！', '多放孜然还是辣椒？', '夜市一开，生意就来'] });
    addNPC(scene, { behavior: 'idle', pos: V(48, 4), yaw: -1.2, name: '逛夜市的情侣', look: { female: true, top: 0xFB7299 }, lines: ['这家棉花糖超好看！', '一会儿去坐旋转木马吧'] });
    addNPC(scene, { behavior: 'walk', pos: V(0, 0), route: [[60, 3], [30, 3], [30, -3], [60, -3]], name: '逛吃的同事', lines: ['我已经吃了第三串了', '臭豆腐闻着臭吃着香！'] });
    addNPC(scene, { behavior: 'phone', pos: V(20, -26), yaw: Math.PI, name: '射击摊老板', look: { top: 0x2a3550 }, lines: ['十发三中，送你小电视玩偶！', '瞄准气球中间～'] });
    addNPC(scene, { behavior: 'idle', pos: V(-48, 36), yaw: 2.5, name: '跳楼机排队的人', lines: ['我腿已经软了……', '据说最高点能看到新世代产业园'] });
    addNPC(scene, { behavior: 'sit', pos: V(-14, 7.4), yaw: Math.PI, name: '许愿的小朋友', look: { child: true }, lines: ['我许愿要一只小电视！', '许愿池的小电视会眨眼睛哦'] });
  });
}

export function tickMarket(dt, t) {
  if (carousel) { carousel.rotation.y += dt * 0.55; carousel.userData.horses.forEach((h, i) => { h.position.y = 1.6 + Math.sin(t * 2.4 + i * 1.3) * 0.38; }); }
  if (wish) { wish.tv.position.y = 0.6 + Math.sin(t * 1.4) * 0.12; wish.tv.rotation.y = Math.sin(t * 0.5) * 0.4; }
  if (drop && !drop.userData.ride) drop.position.y = 2 + Math.max(0, Math.sin(t * 0.25)) * 0.0;
  balloons.forEach((b, i) => { if (b.visible) b.position.y += Math.sin(t * 2 + i) * 0.0012; });
}
