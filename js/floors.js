// 新增主题楼层：5F 员工餐厅 · 9F 直播演播厅 · 22F 健身房 · 27F 空中图书馆
import * as THREE from 'three';
import { ctx, box, addCollider, std, glow, plane, hotspot, plant, sofa } from './common.js';
import { RoundedBoxGeometry } from '../lib/addons/RoundedBoxGeometry.js';
import { core, lights, ceiling, windowFrames } from './interiors.js';
import { FLOOR_META } from './floorMeta.js';
import { makeTV } from './tower.js';
import { makeSimplePerson } from './districts.js';
import { interactable } from './districts.js';
import { TOWER } from './tower.js';
import { textTexture, woodTexture, carpetTexture, tileTexture, drawTV, roundRect, marbleTexture, woodSlatTexture, glowPoolTexture, screenTexture, PINK, BLUE, FONT } from './textures.js';

const hw = TOWER.W / 2 - 0.3, hd = TOWER.D / 2 - 0.3;
const FH = 3.8;

// 楼层定义来自 floorMeta.js（这里只取本模块负责搭建的楼层）
const BUILT_HERE = ['showroom', 'canteen', 'forum', 'studio', 'game', 'music', 'anime', 'gym', 'theater', 'lounge', 'library', 'skybar'];
export const EXTRA_FLOORS = FLOOR_META.filter(f => BUILT_HERE.includes(f.key));

function shell(root, f, floorMat, ceilColor = 0xf4f4f4) {
  const y = f.y;
  ctx.levels[f.key] = { key: f.key, name: f.name, y };
  addCollider(-hw - 0.3, y - 0.4, -hd - 0.3, hw + 0.3, y, hd + 0.3);
  addCollider(-hw - 0.3, y + FH, -hd - 0.3, hw + 0.3, y + FH + 0.4, hd + 0.3);
  plane(root, floorMat, TOWER.W - 0.3, TOWER.D - 0.3, 0, y + 0.005, 0, 0, -Math.PI / 2).receiveShadow = true;
  box(root, std(0x8a94a3), TOWER.W - 0.2, 0.3, TOWER.D - 0.2, 0, y - 0.3, 0, { collide: false });
  ceiling(root, y + FH, ceilColor);
  box(root, std(ceilColor), TOWER.W - 0.2, 0.3, TOWER.D - 0.2, 0, y + FH, 0, { collide: false });
  core(root, f.key, y, FH, f.num);
  box(root, std(0xeef0f4, { roughness: 0.7 }), TOWER.W - 0.6, FH, 0.12, 0, y, -15.8);
  windowFrames(root, y, FH);
}

function sign(root, text, x, y, z, ry = 0, size = 0.6, bg = PINK) {
  const t = textTexture(text, { size: 56, color: '#fff', stroke: null, bg, pad: 18 });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size * t.aspect, size), new THREE.MeshBasicMaterial({ map: t.tex, transparent: true, toneMapped: false }));
  m.position.set(x, y, z); m.rotation.y = ry; root.add(m); return m;
}

// ---------------- 5F 员工餐厅 ----------------
function canteen(root, f) {
  const y = f.y;
  const tile = tileTexture({ base: '#e9e4dc', line: '#cfc8bd', n: 6, noise: 0.03 }); tile.repeat.set(10, 8);
  shell(root, f, std(0xffffff, { map: tile, roughness: 0.5 }));
  sign(root, '干杯食堂 ( ゜- ゜)つロ', -12, y + 2.9, -9.9, 0, 0.62);
  // 打菜窗口（后墙左侧）
  for (let i = 0; i < 4; i++) {
    const x = -19 + i * 3.4;
    box(root, std(0xd8dde5, { metalness: 0.6, roughness: 0.3 }), 3.0, 1.0, 1.2, x, y, -14.6);
    box(root, glow(0xffd6a0, 0.8, 1.2), 2.8, 0.06, 1.0, x, y + 1.0, -14.6, { collide: false });
    const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.25, 0.12, 14), std([0xd9603b, 0x6aa84f, 0xf2c14e, 0x8b5a2b][i]));
    dish.position.set(x, y + 1.08, -14.4); root.add(dish);
    sign(root, ['川菜', '轻食', '面点', '烧腊'][i], x, y + 2.3, -15.6, 0, 0.42, ['#e85d3b', '#2ec27e', '#ffb027', '#8b5a2b'][i]);
  }
  interactable({ pos: new THREE.Vector3(-14, y, -12.6), r: 3.2, icon: '🍱', label: '打一份今日套餐', action: (a) => a.meal() });
  // 餐桌（4×3）
  const tableWood = woodTexture(); tableWood.repeat.set(1, 1);
  const tableM = std(0xd8c4a8, { map: tableWood, roughness: 0.55 }), chairM = [std(0xd96a8a, { roughness: 0.7 }), std(0x2f8fb8, { roughness: 0.7 }), std(0xd9b14e, { roughness: 0.7 })];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
    const x = -15 + c * 10, z = -2 + r * 6;
    box(root, tableM, 4.2, 0.08, 1.6, x, y + 0.74, z, { collide: false });
    box(root, std(0x9aa3ae, { metalness: 0.7 }), 0.12, 0.74, 0.12, x, y, z, { collide: false });
    addCollider(x - 2.1, y, z - 0.8, x + 2.1, y + 0.82, z + 0.8);
    for (const sz of [-1.25, 1.25]) for (const sx of [-1.2, 0, 1.2]) {
      const ch = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.45, 0.5), chairM[(r + c) % 3]); ch.position.set(x + sx, y + 0.23, z + sz); root.add(ch);
    }
    if ((r + c) % 3 === 0) {
      const tray = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.04, 0.42), std(0xffa64d)); tray.position.set(x - 1, y + 0.8, z); root.add(tray);
    }
    if (r === 1 && c === 1) interactable({ pos: new THREE.Vector3(x, y, z + 2.2), r: 1.6, icon: '🪑', label: '坐下吃饭', action: (a) => a.sit(new THREE.Vector3(x, y, z + 1.25), 0) });
  }
  // 甜品站 + 咖啡机
  box(root, std(0x3a2a22), 6, 1.05, 1.2, 15, y, -13.8);
  for (let i = 0; i < 5; i++) { const cake = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.2, 16), std([0xffc2d4, 0xfff0d0, 0x8b5a2b, 0xb5e8ff, 0xffe17a][i])); cake.position.set(12.8 + i * 1.1, y + 1.15, -13.7); root.add(cake); }
  sign(root, '甜品站', 15, y + 2.4, -14.9, 0, 0.5, '#8b5a2b');
  interactable({ pos: new THREE.Vector3(15, y, -12.4), r: 2.4, icon: '🍰', label: '挑一块小蛋糕', action: (a) => a.cake() });
  plant(root, -20.5, y, 14.6); plant(root, 20.5, y, 14.6);
  lights(root, [[-10, y + 2.4, 4], [10, y + 2.4, 4], [0, y + 2.4, -10]], 40, 24, 0xffe6c8);
  hotspot(-6, y, 10, 2.6, '干杯食堂', '<p>员工餐厅提供川菜、轻食、面点和烧腊四个窗口，周五还有<b>“小电视主题甜品”</b>。</p><p>据说这里的番茄炒蛋是全公司投票第一名。</p>', 'cafe');
}

// ---------------- 9F 直播演播厅 ----------------
function studio(root, f) {
  const y = f.y;
  const cp = carpetTexture(); cp.repeat.set(10, 8);
  shell(root, f, std(0x8a90a3, { map: cp, roughness: 0.95 }), 0x3a3e4a);
  sign(root, 'LIVE · 直播中', -14, y + 3.0, -9.9, 0, 0.6, '#ff3b5c');
  // 主直播间：绿幕 + 环形灯 + 主播台
  box(root, std(0x2ecc71, { roughness: 1 }), 12, 3.6, 0.15, -12, y, -8.6, { collide: false });
  box(root, std(0x2a2d36), 4, 0.9, 1.4, -12, y, -4.6);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.06, 10, 36), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffffff).multiplyScalar(2), toneMapped: false }));
  ring.position.set(-12, y + 1.9, -3.4); root.add(ring);
  const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.3, 6), std(0x222222)); stand.position.set(-12, y + 1.2, -3.4); root.add(stand);
  const mic = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.16, 4, 8), std(0x333333, { metalness: 0.6 })); mic.position.set(-11.4, y + 1.15, -4.2); root.add(mic);
  // 摄像机三脚架
  for (const x of [-15, -9]) {
    const cam = new THREE.Group(); cam.position.set(x, y, 1); root.add(cam);
    for (let k = 0; k < 3; k++) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.4, 6), std(0x222222)); const a = k * 2.09; l.position.set(Math.cos(a) * 0.25, 0.65, Math.sin(a) * 0.25); l.rotation.set(Math.sin(a) * 0.3, 0, -Math.cos(a) * 0.3); cam.add(l); }
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.8), std(0x111111)); body.position.y = 1.5; body.lookAt(-12 - x, 1.5, -6); cam.add(body);
    addCollider(x - 0.4, y, 0.6, x + 0.4, y + 1.7, 1.4);
  }
  // 大屏：虚拟主播画面 + 弹幕
  const vc = document.createElement('canvas'); vc.width = 768; vc.height = 432;
  const vg = vc.getContext('2d');
  const tex = new THREE.CanvasTexture(vc); tex.colorSpace = THREE.SRGBColorSpace;
  const scr = plane(root, new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }), 10, 5.6, 9, y + 2.0, -15.65);
  scr.renderOrder = 1;
  box(root, std(0x111111), 10.4, 6, 0.1, 9, y - 0.95, -15.72, { collide: false });
  const words = ['主播好可爱', '前排!', '[礼物] 小电视 x1', '233333', '舰长上船', '晚上好~', 'awsl'];
  let acc = 0, scroll = 0, gift = 0;
  ctx.animators.push((dt, t) => {
    acc += dt; if (acc < 1 / 10) return; acc = 0; scroll += 4;
    const gr = vg.createLinearGradient(0, 0, 768, 432); gr.addColorStop(0, '#ffd1e1'); gr.addColorStop(1, '#c8e8ff');
    vg.fillStyle = gr; vg.fillRect(0, 0, 768, 432);
    // 虚拟主播：Q 版小电视头 + 晃动
    const bob = Math.sin(t * 3) * 8;
    vg.fillStyle = '#ffffff'; roundRect(vg, 284, 120 + bob, 200, 160, 36); vg.fill();
    drawTV(vg, 384, 200 + bob, 150, PINK, 12);
    vg.fillStyle = PINK; roundRect(vg, 314, 290 + bob, 140, 110, 30); vg.fill();
    vg.fillStyle = 'rgba(0,0,0,0.55)'; vg.fillRect(0, 0, 768, 40);
    vg.fillStyle = '#ff3b5c'; roundRect(vg, 12, 8, 70, 24, 6); vg.fill();
    vg.fillStyle = '#fff'; vg.font = `800 16px ${FONT}`; vg.fillText('● LIVE', 20, 26);
    vg.fillText(`人气 ${(12.8 + Math.sin(t * 0.3) * 0.4).toFixed(1)} 万`, 100, 26);
    vg.font = `800 24px ${FONT}`;
    // 滚动弹幕已移除（性能 / 防抖）
    if (ctx.studioGift > 0) { ctx.studioGift -= 1 / 10; vg.fillStyle = 'rgba(251,114,153,0.85)'; roundRect(vg, 220, 360, 330, 52, 26); vg.fill(); vg.fillStyle = '#fff'; vg.font = `900 26px ${FONT}`; vg.fillText('感谢 你 送出的 小电视！', 236, 395); }
    tex.needsUpdate = true;
  });
  interactable({ pos: new THREE.Vector3(9, y, -11.5), r: 3.4, icon: '🎁', label: '给主播送个小电视礼物', action: (a) => { ctx.studioGift = 3; a.toast('礼物已送出，主播：谢谢老板！(≧∇≦)ﾉ', '🎁', '#FB7299'); a.sfx('coin'); } });
  interactable({ pos: new THREE.Vector3(-12, y, -2.4), r: 2.0, icon: '🎙️', label: '坐上主播台试播', action: (a) => a.sit(new THREE.Vector3(-12, y, -3.6), Math.PI, '你开播了！弹幕：“新人主播？关注了！”') });
  // 录音棚（玻璃隔间）
  const gl = new THREE.MeshStandardMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0.2, metalness: 0.8, roughness: 0.05, depthWrite: false, side: THREE.DoubleSide });
  box(root, gl, 10, FH, 0.1, 15.5, y, 6); box(root, gl, 0.1, FH, 5, 10.5, y, 3.5);
  for (let i = 0; i < 6; i++) box(root, std(0x3a3d48, { roughness: 1 }), 1.2, 1.2, 0.12, 12 + (i % 3) * 3, y + 0.8 + Math.floor(i / 3) * 1.4, 1.1 + 0.0, { collide: false });
  box(root, std(0x2a2d36), 3, 0.9, 1.2, 15.5, y, 3.5);
  sign(root, '录音棚 · ON AIR', 15.5, y + 3.1, 6.06, 0, 0.42, '#ff3b5c');
  // 霓虹灯与彩色灯光
  box(root, new THREE.MeshBasicMaterial({ color: new THREE.Color(PINK).multiplyScalar(1.6), toneMapped: false }), 0.08, 0.08, 28, -20.8, y + 3.4, 0, { collide: false });
  box(root, new THREE.MeshBasicMaterial({ color: new THREE.Color(BLUE).multiplyScalar(1.6), toneMapped: false }), 0.08, 0.08, 28, 20.8, y + 3.4, 0, { collide: false });
  lights(root, [[-12, y + 2.4, -3], [9, y + 2.4, -8], [0, y + 2.4, 4]], 55, 22, 0xffd6e8);
  lights(root, [[-12, y + 2.4, 10], [15, y + 2.4, 4]], 45, 20, 0xc8e8ff);
  hotspot(-2, y, 10, 2.6, '直播演播厅', '<p>这里是 B 站<b>官方直播</b>与虚拟主播内容的制作区：绿幕直播间、三机位摄像、录音棚一应俱全。</p><p>大屏上正在直播的虚拟主播，人气已经破十万了。</p>', 'tv');
}

// ---------------- 22F 健身房 ----------------
function gym(root, f) {
  const y = f.y;
  const rub = tileTexture({ base: '#2b2f38', line: '#24272e', n: 8, noise: 0.05 }); rub.repeat.set(10, 8);
  shell(root, f, std(0xffffff, { map: rub, roughness: 0.95 }), 0x1d2027);
  sign(root, 'B 站健身房 · 自律给我自由', -12, y + 3.0, -9.9, 0, 0.55, '#ff8a3d');
  // 跑步机（面向窗户）
  const tm = [];
  for (let i = 0; i < 6; i++) {
    const x = -17 + i * 6, z = 11;
    const base = new THREE.Group(); base.position.set(x, y, z); root.add(base);
    const belt = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.2, 2.2), std(0x15171c)); belt.position.y = 0.2; base.add(belt);
    box(base, std(0x9aa3ae, { metalness: 0.7 }), 0.08, 1.3, 0.08, -0.4, 0, 1.0, { collide: false });
    box(base, std(0x9aa3ae, { metalness: 0.7 }), 0.08, 1.3, 0.08, 0.4, 0, 1.0, { collide: false });
    const scr = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.5, 0.08), std(0x111111)); scr.position.set(0, 1.45, 1.0); scr.rotation.x = -0.3; base.add(scr);
    const glowScr = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.4), new THREE.MeshBasicMaterial({ color: new THREE.Color(i % 2 ? BLUE : PINK).multiplyScalar(1.2), toneMapped: false })); glowScr.position.set(0, 1.45, 0.95); glowScr.rotation.set(-0.3, Math.PI, 0); base.add(glowScr);
    addCollider(x - 0.5, y, z - 1.1, x + 0.5, y + 0.3, z + 1.1);
    addCollider(x - 0.5, y, z + 0.9, x + 0.5, y + 1.6, z + 1.1);
    tm.push(belt);
    if (i === 2) interactable({ pos: new THREE.Vector3(x, y, z - 1.8), r: 1.6, icon: '🏃', label: '上跑步机跑一会儿', action: (a) => a.treadmill(new THREE.Vector3(x, y + 0.3, z)) });
  }
  // 力量区：哑铃架 + 杠铃凳
  box(root, std(0x2a2d36, { metalness: 0.6 }), 6, 0.9, 0.8, -14, y, -4);
  for (let i = 0; i < 8; i++) {
    const db = new THREE.Group(); db.position.set(-16.6 + i * 0.75, y + 1.0, -4); root.add(db);
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 8), std(0xcccccc, { metalness: 0.9 })); bar.rotation.z = Math.PI / 2; db.add(bar);
    for (const sx of [-0.18, 0.18]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.09 + i * 0.008, 0.09 + i * 0.008, 0.08, 12), std(0x111111)); p.rotation.z = Math.PI / 2; p.position.x = sx; db.add(p); }
  }
  for (const x of [-6, 2]) {
    box(root, std(0x15171c), 0.5, 0.45, 1.8, x, y, 0);
    const bb = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.2, 8), std(0xcccccc, { metalness: 0.9 })); bb.rotation.z = Math.PI / 2; bb.position.set(x, y + 1.15, -0.6); root.add(bb);
    for (const sx of [-0.95, 0.95]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.08, 18), std(0x222222)); p.rotation.z = Math.PI / 2; p.position.set(x + sx, y + 1.15, -0.6); root.add(p); }
    for (const sx of [-0.7, 0.7]) box(root, std(0x9aa3ae, { metalness: 0.7 }), 0.06, 1.2, 0.06, x + sx, y, -0.6, { collide: false });
  }
  interactable({ pos: new THREE.Vector3(-6, y, 1.4), r: 1.6, icon: '🏋️', label: '卧推一组（10 次）', action: (a) => a.workout() });
  // 瑜伽室（木地板 + 镜墙）
  const wd = woodTexture(); wd.repeat.set(3, 3);
  plane(root, std(0xffffff, { map: wd, roughness: 0.6 }), 12, 10, 14.5, y + 0.01, -8.5, 0, -Math.PI / 2);
  plane(root, std(0xdfe8f2, { metalness: 1, roughness: 0.05, envMapIntensity: 2 }), 11.6, 3.4, 14.5, y + 1.8, -13.6);
  for (let i = 0; i < 4; i++) { const mat = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.03, 1.9), std([0xFB7299, 0x00AEEC, 0xa8e6cf, 0xffd166][i])); mat.position.set(10.5 + i * 2.6, y + 0.03, -7.5); root.add(mat); }
  sign(root, '瑜伽室', 14.5, y + 3.2, -3.45, 0, 0.45, '#2ec27e');
  // 节奏动感彩灯
  const disco = [PINK, BLUE, '#ffd166'].map((c, i) => { const l = new THREE.PointLight(c, 18, 16, 1.6); l.position.set(-8 + i * 8, y + 3.2, 3); root.add(l); return l; });
  ctx.animators.push((dt, t) => disco.forEach((l, i) => { l.intensity = 12 + Math.sin(t * 3 + i * 2) * 8; }));
  ctx.animators.push((dt) => { tm.forEach(b => { b.material.color.offsetHSL(0, 0, 0); }); });
  lights(root, [[-12, y + 2.4, 6], [12, y + 2.4, 6]], 30, 22);
  hotspot(0, y, 6, 2.6, 'B 站健身房', '<p>22 层的员工健身房，跑步机正对落地窗，可以边跑边看城市天际线。</p><p>墙上的标语是：<b>“自律给我自由，三连给我动力”</b>。</p>', 'view');
}

// ---------------- 27F 空中图书馆 ----------------
function library(root, f) {
  const y = f.y;
  const wd = woodTexture(); wd.repeat.set(8, 6);
  shell(root, f, std(0xffffff, { map: wd, roughness: 0.7 }), 0xf0e6d8);
  sign(root, '空中图书馆 · 安静阅读', -12, y + 3.0, -9.9, 0, 0.55, '#8b5a2b');
  // 书墙（左右两侧）
  const bookCols = [0xc0392b, 0x2980b9, 0x27ae60, 0xf39c12, 0x8e44ad, 0x16a085, 0xd35400, 0xFB7299, 0x00AEEC, 0x34495e];
  const shelfM = std(0x6b4a33, { roughness: 0.7 });
  const bookG = new THREE.BoxGeometry(0.12, 0.36, 0.26);
  const books = new THREE.InstancedMesh(bookG, std(0xffffff, { roughness: 0.8 }), 2 * 5 * 70);
  const m4 = new THREE.Matrix4(), col = new THREE.Color();
  let k = 0;
  for (const side of [-1, 1]) {
    const x = side * 21.0;
    box(root, shelfM, 0.6, 3.6, 24, x, y, -1);
    for (let r = 0; r < 5; r++) {
      box(root, std(0x5a3c28), 0.62, 0.05, 24, x, y + 0.2 + r * 0.7, -1, { collide: false });
      for (let i = 0; i < 70; i++) {
        const h = 0.75 + ((i * 37 + r * 11) % 7) / 20;
        m4.makeScale(1, h, 1); m4.setPosition(x - side * 0.05, y + 0.42 + r * 0.7 + (h - 1) * 0.18, -12.6 + i * 0.33);
        books.setMatrixAt(k, m4); books.setColorAt(k, col.set(bookCols[(i * 7 + r * 3 + (side > 0 ? 5 : 0)) % bookCols.length])); k++;
      }
    }
  }
  root.add(books);
  // 阅读阶梯（大台阶，可以走上去）
  // 阅读阶梯：面向南侧落地窗，越往后越高（可以一级级走上去）
  for (let i = 0; i < 4; i++) {
    const z = 10 - i * 1.6, h = 0.4 * (i + 1);
    box(root, std(0x8d6b4f, { roughness: 0.7 }), 14, h, 1.6, 0, y, z, { collide: true });
    for (let c = 0; c < 4; c++) { const cu = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.12, 0.8), std([0xFB7299, 0x00AEEC, 0xffd166, 0xa8e6cf][(c + i) % 4])); cu.position.set(-5 + c * 3.3, y + h + 0.06, z); root.add(cu); }
  }
  interactable({ pos: new THREE.Vector3(0, y, 12.2), r: 2.2, icon: '📖', label: '坐在阶梯上看书', action: (a) => a.sit(new THREE.Vector3(0, y + 1.2, 6.8), Math.PI, '你翻开了《小电视的十二年》，窗外是整片城市夜景……') });
  // 阅读桌 + 台灯
  for (let i = 0; i < 3; i++) for (const sx of [-1, 1]) {
    const x = sx * 13, z = -4 + i * 4.5;
    box(root, std(0x8d6b4f), 3.2, 0.08, 1.4, x, y + 0.74, z, { collide: false });
    addCollider(x - 1.6, y, z - 0.7, x + 1.6, y + 0.82, z + 0.7);
    const lamp = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.22, 14, 1, true), glow(0xffd6a0, 1.0, 2.0, { side: THREE.DoubleSide })); lamp.position.set(x + 1.1, y + 1.2, z); root.add(lamp);
    const st = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.42, 6), std(0x222222)); st.position.set(x + 1.1, y + 0.98, z); root.add(st);
  }
  // 借书机
  box(root, std(0xf2f4f7, { roughness: 0.3 }), 1.2, 1.6, 0.7, 6, y, -14.8);
  plane(root, new THREE.MeshBasicMaterial({ color: new THREE.Color(BLUE).multiplyScalar(1.1), toneMapped: false }), 0.9, 0.6, 6, y + 1.2, -14.44);
  interactable({ pos: new THREE.Vector3(6, y, -13.4), r: 1.8, icon: '📚', label: '自助借一本书', action: (a) => a.borrow() });
  plant(root, -18, y, 14.6); plant(root, 18, y, 14.6); plant(root, 0, y, 14.6);
  lights(root, [[-10, y + 2.4, 4], [10, y + 2.4, 4], [0, y + 2.4, -8]], 32, 22, 0xffe2bf);
  hotspot(-8, y, -9, 2.6, '空中图书馆', '<p>27 层的图书馆收藏了动画、游戏、科技与设计类书籍上万册。</p><p>阅读阶梯是最受欢迎的位置 —— 背后就是整面落地窗和城市夜景。</p>', 'history');
}

// =====================================================================
// 3F 品牌展厅
// =====================================================================
function showroom(root, f) {
  const y = f.y;
  const mt = marbleTexture({ seed: 51 }); mt.repeat.set(TOWER.W / 2.4, TOWER.D / 2.4);
  shell(root, f, new THREE.MeshStandardMaterial({ map: mt, color: 0xcfcfcf, roughness: 0.45 }), 0xeeeeee);
  // 十五周年时间轴长墙（东侧）
  const years = [['2009', 'Mikufans 上线'], ['2010', '更名 bilibili'], ['2013', '首届 BML'], ['2014', '拜年纪'], ['2017', 'BW 首办'], ['2018', '纳斯达克上市'], ['2020', '后浪'], ['2021', '香港二次上市'], ['2024', '十五周年']];
  const tc = document.createElement('canvas'); tc.width = 2048; tc.height = 512; const tg = tc.getContext('2d');
  const bg = tg.createLinearGradient(0, 0, 2048, 0); bg.addColorStop(0, '#fff5f8'); bg.addColorStop(1, '#eef9ff'); tg.fillStyle = bg; tg.fillRect(0, 0, 2048, 512);
  tg.strokeStyle = PINK; tg.lineWidth = 8; tg.beginPath(); tg.moveTo(60, 270); tg.lineTo(1990, 270); tg.stroke();
  years.forEach(([yr, ev], i) => {
    const x = 120 + i * 225;
    tg.fillStyle = i % 2 ? BLUE : PINK; tg.beginPath(); tg.arc(x, 270, 22, 0, Math.PI * 2); tg.fill();
    tg.fillStyle = '#18191c'; tg.font = `900 70px "Arial Black",Arial`; tg.textAlign = 'center'; tg.fillText(yr, x, i % 2 ? 380 : 200);
    tg.font = `700 34px ${FONT}`; tg.fillStyle = '#4a4f57'; tg.fillText(ev, x, i % 2 ? 430 : 130);
  });
  tg.fillStyle = '#18191c'; tg.font = `900 46px ${FONT}`; tg.textAlign = 'left'; tg.fillText('bilibili 十五周年 · 时间轴', 60, 60);
  const tt = new THREE.CanvasTexture(tc); tt.colorSpace = THREE.SRGBColorSpace;
  box(root, std(0xffffff), 0.2, 3.4, 22, 21.2, y, 2, { collide: true });
  const tl = plane(root, new THREE.MeshBasicMaterial({ map: tt, color: 0xd8d8d8 }), 20, 2.8, 21.08, y + 1.9, 2, -Math.PI / 2);
  const tlGlow = new THREE.MeshBasicMaterial({ color: new THREE.Color(PINK).multiplyScalar(1.5), toneMapped: false });
  box(root, tlGlow, 0.04, 0.04, 20, 21.05, y + 0.45, 2, { collide: false });
  interactable({ pos: new THREE.Vector3(19, y, 2), r: 3, icon: '✨', label: '点亮时间轴', action: (a) => { tlGlow.color.setHSL(Math.random(), 0.8, 0.6).multiplyScalar(1.6); a.toast('时间轴亮起 —— 十五年，谢谢你一直都在 (｡･ω･｡)ﾉ♡', '✨', '#FF8A5C'); a.sfx('ding'); } });
  // 玻璃展柜（手办）
  const glassM = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transmission: 0.9, transparent: true, opacity: 0.25, roughness: 0.02, metalness: 0, depthWrite: false });
  const pedestal = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.25, clearcoat: 1 });
  const cases = [[-12, 4, PINK, '22 娘'], [-6, 4, BLUE, '33 娘'], [0, 4, '#ffb027', '金色小电视'], [6, 4, '#7a5cff', '初代小电视'], [-12, 10, '#2ec27e', 'BML 奖杯'], [-6, 10, PINK, '拜年纪'], [0, 10, BLUE, '后浪'], [6, 10, '#ff8a5c', '百大 UP']];
  cases.forEach(([x, z, c, name]) => {
    box(root, pedestal, 1.4, 1.0, 1.4, x, y, z);
    const gl = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.1, 1.3), glassM); gl.position.set(x, y + 1.55, z); root.add(gl);
    const tv = makeTV(0.7, c, { glowBody: 0.35 }); tv.position.set(x, y + 1.05, z); root.add(tv);
    const spot = new THREE.Mesh(new THREE.CircleGeometry(0.3, 20), new THREE.MeshBasicMaterial({ color: 0xe8e0d0 })); spot.rotation.x = Math.PI / 2; spot.position.set(x, y + 3.74, z); root.add(spot);
    const lb = textTexture(name, { size: 40, color: '#18191c', stroke: null, bg: 'rgba(255,255,255,0.95)', pad: 12 });
    plane(root, new THREE.MeshBasicMaterial({ map: lb.tex, transparent: true }), 0.28 * lb.aspect, 0.28, x, y + 0.55, z + 0.71);
    interactable({ pos: new THREE.Vector3(x, y, z + 1.4), r: 1.2, icon: '🔍', label: `欣赏「${name}」展品`, action: (a) => a.toast(`「${name}」—— 这是 B 站历史上的重要纪念品，编号 #${(Math.random() * 900 + 100) | 0}`, '🏆', c) });
  });
  // 留言墙
  const notes = new THREE.Group(); root.add(notes);
  box(root, std(0xc8a27a, { roughness: 0.9 }), 8, 3, 0.1, -15, y + 0.4, -15.6, { collide: false });
  const noteCols = [0xfff3a0, 0xffc2d4, 0xb5e8ff, 0xc8f5c0];
  for (let i = 0; i < 26; i++) { const n = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.42), std(noteCols[i % 4], { roughness: 0.9 })); n.position.set(-18.6 + (i % 9) * 0.88 + Math.random() * 0.1, y + 0.8 + Math.floor(i / 9) * 0.9 + Math.random() * 0.1, -15.53); n.rotation.z = (Math.random() - 0.5) * 0.3; notes.add(n); }
  interactable({ pos: new THREE.Vector3(-15, y, -13.4), r: 2.6, icon: '📝', label: '在留言墙贴一张便签', action: (a) => {
    const n = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.42), std(noteCols[(Math.random() * 4) | 0], { emissive: 0x332200, emissiveIntensity: 0.4 }));
    n.position.set(-18.6 + Math.random() * 7.2, y + 0.7 + Math.random() * 2.4, -15.52); n.rotation.z = (Math.random() - 0.5) * 0.4; notes.add(n);
    a.toast('你写下了“十五岁生日快乐！”并贴在了留言墙上', '📝', '#FF8A5C'); a.sfx('click');
  } });
  sign(root, '品牌展厅 · bilibili MUSEUM', -12, y + 3.0, -9.9, 0, 0.55, '#FF8A5C');
  lights(root, [[-6, y + 2.4, 7], [10, y + 2.4, 2]], 22, 20, 0xfff0e0);
  hotspot(-3, y, 13.5, 2.6, '品牌展厅', '<p>3 层是 B 站的品牌博物馆：东墙是<b>十五周年时间轴</b>，中间八个玻璃展柜陈列着历代小电视与 22/33 娘手办。</p><p>北侧的留言墙已经贴满了来自各地 UP 主的祝福。</p>', 'history');
}

// =====================================================================
// 12F 游戏中心
// =====================================================================
function gameCenter(root, f, danmaku) {
  const y = f.y;
  const cp = carpetTexture(); cp.repeat.set(10, 8);
  shell(root, f, std(0x6a62a0, { map: cp, roughness: 0.95 }), 0x2a2740);
  sign(root, 'bilibili GAME CENTER', -12, y + 3.0, -9.9, 0, 0.6, '#7A5CFF');
  // 街机长廊（西侧两排）
  const cab = std(0x18161f, { roughness: 0.5, metalness: 0.3 });
  const games = ['home', 'danmu', 'code', 'edit'];
  for (let i = 0; i < 7; i++) for (const side of [-1, 1]) {
    const x = -19 + (side > 0 ? 3.2 : 0), z = -6 + i * 2.6;
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2; root.add(g);
    box(g, cab, 1.1, 2.0, 1.0, 0, 0, 0, { collide: false });
    box(g, cab, 1.1, 0.25, 0.5, 0, 0.95, 0.6, { collide: false });
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.65), new THREE.MeshBasicMaterial({ map: screenTexture(games[(i + side + 4) % 4], i * 3 + side + 20), toneMapped: false }));
    scr.position.set(0, 1.45, 0.51); g.add(scr);
    const mq = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.25), new THREE.MeshBasicMaterial({ color: new THREE.Color(['#FB7299', '#00AEEC', '#7A5CFF', '#ffb027'][i % 4]).multiplyScalar(1.6), toneMapped: false }));
    mq.position.set(0, 1.92, 0.51); g.add(mq);
    addCollider(x - 0.55, y, z - 0.55, x + 0.55, y + 2, z + 0.55);
  }
  interactable({ pos: new THREE.Vector3(-17.4, y, 1.8), r: 1.6, icon: '🕹️', label: '玩一局「弹幕护卫」', action: (a) => { if (a.arcade) return a.arcade(); const sc = (Math.random() * 90000 + 10000) | 0; a.toast(`《弹幕射击》得分 ${sc.toLocaleString()}！${sc > 80000 ? '刷新了本机最高纪录！' : '再来一局？'}`, '🕹️', '#7A5CFF'); a.sfx('win'); } });
  // 电竞舞台（东侧）
  box(root, std(0x232033, { roughness: 0.6 }), 14, 0.5, 7, 12, y, -10.5);
  const stageEdge = new THREE.MeshBasicMaterial({ color: new THREE.Color('#7A5CFF').multiplyScalar(1.8), toneMapped: false });
  box(root, stageEdge, 14, 0.05, 0.05, 12, y + 0.5, -7, { collide: false });
  for (let i = 0; i < 5; i++) {
    const x = 6.4 + i * 2.8;
    box(root, std(0x111111), 1.8, 0.06, 0.8, x, y + 1.25, -10.5, { collide: false });
    const mon = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.5), new THREE.MeshBasicMaterial({ map: screenTexture('danmu', 40 + i), toneMapped: false })); mon.position.set(x, y + 1.6, -10.85); root.add(mon);
    const chair = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.1, 0.6), std(i % 2 ? 0x7A5CFF : 0xFB7299)); chair.position.set(x, y + 1.05, -9.6); root.add(chair);
  }
  plane(root, new THREE.MeshBasicMaterial({ map: danmaku.tex, toneMapped: false }), 12, 3.2, 12, y + 2.4, -15.65);
  sign(root, '电竞舞台 · BLG 加油', 12, y + 3.65, -15.62, 0, 0.32, '#7A5CFF');
  interactable({ pos: new THREE.Vector3(12, y, -5.6), r: 3, icon: '🏆', label: '为电竞选手应援', action: (a) => { a.toast('全场齐喊：“BLG！BLG！” 选手比了个心', '📣', '#7A5CFF'); a.sfx('win'); } });
  // 娃娃机
  const claw = new THREE.Group(); claw.position.set(16, y, 8); root.add(claw);
  box(claw, std(0xFB7299, { roughness: 0.4 }), 1.6, 1.0, 1.6, 0, 0, 0, { collide: false });
  const glassM = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.18, depthWrite: false });
  const gl = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.5, 1.5), glassM); gl.position.y = 1.75; claw.add(gl);
  box(claw, std(0xFB7299), 1.6, 0.35, 1.6, 0, 2.5, 0, { collide: false });
  for (let i = 0; i < 9; i++) { const t2 = makeTV(0.22, [PINK, BLUE, '#ffd166'][i % 3], { glowBody: 0.3 }); t2.position.set(-0.45 + (i % 3) * 0.45, 1.02, -0.45 + Math.floor(i / 3) * 0.45); t2.rotation.y = i; claw.add(t2); }
  addCollider(15.2, y, 7.2, 16.8, y + 2.8, 8.8);
  interactable({ pos: new THREE.Vector3(16, y, 9.6), r: 1.6, icon: '🧸', label: '抓娃娃（1 硬币）', action: (a) => a.claw() });
  // 霓虹地面灯带
  const neon = [PINK, BLUE, '#7A5CFF'].map(c => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(1.6), toneMapped: false }));
  for (let i = 0; i < 3; i++) box(root, neon[i], 0.06, 0.02, 24, -10 + i * 0.3, y + 0.01, 3, { collide: false });
  lights(root, [[-14, y + 2.4, 2], [12, y + 2.4, -8], [0, y + 2.4, 8], [-14, y + 2.4, 12]], 55, 24, 0xd0c4ff);
  lights(root, [[8, y + 2.4, 8]], 28, 18, 0xffb0d0);
  hotspot(2, y, 10, 2.6, '游戏中心', '<p>12 层是 B 站游戏事业部的员工游戏中心：西侧是 14 台街机组成的<b>街机长廊</b>，东侧是电竞舞台，角落的娃娃机里全是小电视。</p>', 'tv');
}

// =====================================================================
// 19F 动画工作室
// =====================================================================
function animeStudio(root, f) {
  const y = f.y;
  const wd = woodTexture(); wd.repeat.set(8, 6);
  shell(root, f, std(0xd9c8b4, { map: wd, roughness: 0.7 }), 0xf2efe8);
  sign(root, '动画工作室 · 原画组', -12, y + 3.0, -9.9, 0, 0.55, '#2EC27E');
  // 原画桌（倾斜数位屏）
  const deskM = std(0xf5f2ec, { roughness: 0.4 }), tabletM = std(0x1a1d22, { metalness: 0.4 });
  const frames = ['danmu', 'home', 'edit'];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
    const x = -14 + c * 7, z = -2 + r * 5.5;
    box(root, deskM, 3.2, 0.06, 1.4, x, y + 0.74, z, { collide: false });
    addCollider(x - 1.6, y, z - 0.7, x + 1.6, y + 0.82, z + 0.7);
    for (const ox of [-0.8, 0.8]) {
      const tb = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.6, 0.04), tabletM); tb.position.set(x + ox, y + 1.0, z - 0.2); tb.rotation.x = -0.9; root.add(tb);
      const sc = new THREE.Mesh(new THREE.PlaneGeometry(0.84, 0.54), new THREE.MeshBasicMaterial({ map: screenTexture(frames[(r + c) % 3], r * 9 + c * 2 + (ox > 0 ? 1 : 0) + 60), toneMapped: false }));
      sc.position.set(x + ox, y + 1.012, z - 0.185); sc.rotation.x = -0.9; root.add(sc);
      const lamp = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.16, 12, 1, true), glow(0xffe8c0, 0.8, 1.6, { side: THREE.DoubleSide })); lamp.position.set(x + ox + 0.45, y + 1.35, z + 0.3); root.add(lamp);
    }
    const ch = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.9, 0.55), std(0x2EC27E)); ch.position.set(x, y + 0.45, z + 1.2); root.add(ch);
  }
  interactable({ pos: new THREE.Vector3(-7, y, 4.6), r: 1.6, icon: '✏️', label: '画一张原画', action: (a) => { const ch = ['小电视', '22 娘', '33 娘', '橘猫'][(Math.random() * 4) | 0]; a.toast(`你画了一张「${ch}」的原画，组长点评：线条很有灵气！`, '🎨', '#2EC27E'); } });
  // 分镜墙（北侧软木板）
  box(root, std(0xb58a5c, { roughness: 0.95 }), 14, 2.6, 0.1, 13, y + 0.6, -15.6, { collide: false });
  const pinCols = ['#ffffff', '#fff6d8', '#ffe8ef', '#e8f6ff'];
  for (let i = 0; i < 18; i++) {
    const sc = document.createElement('canvas'); sc.width = 192; sc.height = 128; const g = sc.getContext('2d');
    g.fillStyle = pinCols[i % 4]; g.fillRect(0, 0, 192, 128); g.strokeStyle = '#333'; g.lineWidth = 3; g.strokeRect(10, 10, 172, 90);
    g.strokeStyle = '#555'; g.lineWidth = 2; g.beginPath(); for (let k = 0; k < 4; k++) { g.moveTo(20 + Math.random() * 150, 20 + Math.random() * 70); g.lineTo(20 + Math.random() * 150, 20 + Math.random() * 70); } g.stroke();
    drawTV(g, 60 + (i * 37) % 80, 55, 34, '#333', 3);
    g.fillStyle = '#666'; g.font = '16px sans-serif'; g.fillText(`C${String(i + 1).padStart(3, '0')}`, 12, 120);
    const t = new THREE.CanvasTexture(sc); t.colorSpace = THREE.SRGBColorSpace;
    const card = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.8), new THREE.MeshBasicMaterial({ map: t }));
    card.position.set(7 + (i % 6) * 2.1, y + 1.1 + Math.floor(i / 6) * 0.85, -15.53); card.rotation.z = (Math.random() - 0.5) * 0.06; root.add(card);
  }
  interactable({ pos: new THREE.Vector3(13, y, -13.6), r: 2.8, icon: '🎞️', label: '翻看分镜稿', action: (a) => a.toast('这是新番《小电视的冒险》第 3 集分镜，共 186 个镜头', '🎞️', '#2EC27E') });
  // 渲染农场（服务器机柜 + 闪烁指示灯）
  const rack = std(0x15171c, { metalness: 0.6, roughness: 0.4 });
  const ledG = new THREE.MeshBasicMaterial({ color: new THREE.Color('#2EC27E').multiplyScalar(1.6), toneMapped: false });
  const ledB = new THREE.MeshBasicMaterial({ color: new THREE.Color(BLUE).multiplyScalar(1.6), toneMapped: false });
  for (let i = 0; i < 6; i++) {
    const x = 17.5, z = -2 + i * 2.2;
    box(root, rack, 1.4, 3.2, 1.0, x, y, z);
    for (let k = 0; k < 10; k++) { const l = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.06), k % 3 ? ledG : ledB); l.position.set(x - 0.71, y + 0.4 + k * 0.28, z - 0.3 + (k % 4) * 0.18); l.rotation.y = -Math.PI / 2; root.add(l); }
  }
  ctx.animators.push((dt, t) => { const k = 0.6 + Math.abs(Math.sin(t * 7)) * 1.2; ledG.color.setRGB(0.18 * k, 0.76 * k, 0.49 * k); ledB.color.setRGB(0, 0.68 * (2 - k * 0.5), 0.92 * (2 - k * 0.5)); });
  sign(root, '渲染农场 RENDER FARM', 17.5, y + 3.45, 2.2, -Math.PI / 2, 0.36, '#2EC27E');
  lights(root, [[-8, y + 2.4, 4], [8, y + 2.4, 4]], 36, 24, 0xfff2e0);
  hotspot(-10, y, 13.5, 2.6, '动画工作室', '<p>19 层是 B 站国创动画的制作中心：12 张原画桌、整面分镜墙，以及 24 小时运转的<b>渲染农场</b>。</p><p>一集 24 分钟的动画，需要上千张原画与数百个镜头。</p>', 'desk');
}

// =====================================================================
// 24F 弹幕放映厅
// =====================================================================
function theater(root, f, danmaku) {
  const y = f.y;
  const cp = carpetTexture(); cp.repeat.set(10, 8);
  shell(root, f, std(0x6a2a3a, { map: cp, roughness: 0.95 }), 0x14121a);
  // 巨幕（北侧）+ 黑色幕框
  box(root, std(0x0b0b0e), 30, 3.7, 0.15, 0, y + 0.05, -15.5, { collide: false });
  const scr = plane(root, new THREE.MeshBasicMaterial({ map: danmaku.tex, toneMapped: false }), 22, 3.1, 0, y + 2.0, -15.4);
  scr.renderOrder = 1;
  // 小舞台
  box(root, std(0x2a1a20, { roughness: 0.6 }), 24, 0.4, 3, 0, y, -13.2);
  const curtain = std(0x8a1b2e, { roughness: 1 });
  for (const sx of [-1, 1]) for (let i = 0; i < 6; i++) box(root, curtain, 0.5, 3.6, 0.3, sx * (12.3 + i * 0.45), y, -14.5 + Math.sin(i) * 0.1, { collide: false });
  // 阶梯座位（5 级，越往后越高）
  const seatM = std(0xc0283f, { roughness: 0.8 }), stepM = std(0x2a2026, { roughness: 0.9 });
  const seats = [];
  for (let r = 0; r < 5; r++) {
    const z = -5 + r * 3.2, h = r * 0.35;
    if (r > 0) box(root, stepM, 34, h, 3.2, 0, y, z, { collide: true });
    const stepEdge = new THREE.MeshBasicMaterial({ color: new THREE.Color('#E85D75').multiplyScalar(1.4), toneMapped: false });
    box(root, stepEdge, 34, 0.02, 0.04, 0, y + h + 0.01, z - 1.58, { collide: false });
    for (let c = 0; c < 12; c++) {
      if (c === 5 || c === 6) continue; // 中间过道
      const x = -14.3 + c * 2.6;
      const s2 = new THREE.Group(); s2.position.set(x, y + h, z); root.add(s2);
      const seat = new THREE.Mesh(new RoundedBoxGeometry(1.0, 0.18, 0.8, 2, 0.06), seatM); seat.position.y = 0.45; s2.add(seat);
      const back = new THREE.Mesh(new RoundedBoxGeometry(1.0, 0.9, 0.16, 2, 0.06), seatM); back.position.set(0, 0.85, 0.42); back.rotation.x = 0.12; s2.add(back);
      seats.push({ x, y: y + h, z });
    }
  }
  const pick = seats[Math.floor(seats.length / 2) + 3];
  interactable({ pos: new THREE.Vector3(pick.x, pick.y, pick.z - 0.9), r: 1.4, icon: '🍿', label: '找个座位看电影', action: (a) => a.sit(new THREE.Vector3(pick.x, pick.y + 0.2, pick.z), 0, '你坐下来，屏幕上的弹幕刷了满屏 ——“前方高能！！”') });
  interactable({ pos: new THREE.Vector3(0, y, -10.4), r: 2.4, icon: '🎬', label: '发一条放映厅弹幕', action: (a) => { danmaku.add('放映厅的朋友们晚上好！', '#ffd166'); a.toast('你的弹幕出现在巨幕上了！', '🎬', '#E85D75'); a.sfx('send'); } });
  // 走道地灯
  const aisle = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffd166').multiplyScalar(1.3), toneMapped: false });
  for (let r = 0; r < 5; r++) for (const sx of [-1.2, 1.2]) box(root, aisle, 0.12, 0.03, 0.12, sx, y + r * 0.35 + 0.01, -5 + r * 3.2, { collide: false });
  // 壁灯
  for (const sx of [-1, 1]) for (let i = 0; i < 4; i++) { const w = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.6), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffb08a').multiplyScalar(1.3), toneMapped: false })); w.position.set(sx * 21.3, y + 2.4, -8 + i * 6); w.rotation.y = -sx * Math.PI / 2; root.add(w); }
  sign(root, '弹幕放映厅 · 今日放映', -12, y + 3.0, -9.9, 0, 0.55, '#E85D75');
  lights(root, [[0, y + 2.4, 4], [0, y + 2.4, -11]], 26, 22, 0xffc8b8);
  hotspot(14, y, 12, 2.6, '弹幕放映厅', '<p>24 层的员工放映厅，每周五晚上放映新番首映与经典电影。</p><p>和普通影院不同，这里的巨幕上<b>可以发弹幕</b>——这才是 B 站的看片方式。</p>', 'tv');
}

// =====================================================================
// 29F 空中酒吧
// =====================================================================
function skybar(root, f) {
  const y = f.y;
  const wd = woodTexture(); wd.repeat.set(8, 6);
  shell(root, f, std(0x4a3426, { map: wd, roughness: 0.6 }), 0x16121a);
  // 吧台（L 形）+ 背光酒柜
  const counterTop = new THREE.MeshPhysicalMaterial({ map: marbleTexture({ base: '#1f1d22', vein: 'rgba(220,200,170,', dark: true, tiles: 1, seed: 8 }), roughness: 0.15, clearcoat: 1 });
  box(root, std(0xffffff, { map: woodSlatTexture({ dark: '#120c08', light: '#5a3a22' }), roughness: 0.6 }), 12, 1.1, 1.2, -10, y, -11.5);
  box(root, counterTop, 12.3, 0.08, 1.45, -10, y + 1.1, -11.5, { collide: false });
  const underGlow = new THREE.MeshBasicMaterial({ color: new THREE.Color('#9B6BFF').multiplyScalar(1.6), toneMapped: false });
  box(root, underGlow, 12, 0.03, 0.03, -10, y + 1.02, -10.85, { collide: false });
  box(root, glow(0xffc88a, 1.2, 1.6), 12, 2.4, 0.05, -10, y + 1.2, -15.7, { collide: false });
  // 酒瓶（实例化）
  const bottleG = new THREE.CylinderGeometry(0.07, 0.08, 0.36, 10);
  const bottles = new THREE.InstancedMesh(bottleG, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.15, metalness: 0.2, emissive: 0x221100, emissiveIntensity: 0.6 }), 84);
  const m4 = new THREE.Matrix4(), col = new THREE.Color();
  for (let i = 0; i < 84; i++) { m4.makeTranslation(-15.4 + (i % 28) * 0.39, y + 1.45 + Math.floor(i / 28) * 0.7, -15.45); bottles.setMatrixAt(i, m4); bottles.setColorAt(i, col.set(['#6b3a1a', '#2e6b3a', '#c9973f', '#7a2a3a', '#2a4a7a', '#d8d0c0'][i % 6])); }
  root.add(bottles);
  for (let k = 0; k < 3; k++) box(root, std(0x3a2a1e, { metalness: 0.3 }), 12, 0.05, 0.35, -10, y + 1.25 + k * 0.7, -15.5, { collide: false });
  // 吧凳
  const stoolM = new THREE.MeshStandardMaterial({ color: 0xc9a14f, metalness: 1, roughness: 0.25 });
  for (let i = 0; i < 7; i++) {
    const x = -15 + i * 1.6;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.75, 8), stoolM); pole.position.set(x, y + 0.38, -10.3); root.add(pole);
    const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.08, 18), std(0x2a1a14, { roughness: 0.5 })); seat.position.set(x, y + 0.78, -10.3); root.add(seat);
  }
  interactable({ pos: new THREE.Vector3(-10, y, -9.4), r: 2.6, icon: '🍸', label: '点一杯「三连特调」', action: (a) => a.cocktail() });
  interactable({ pos: new THREE.Vector3(-13.4, y, -9.6), r: 1.0, icon: '🪑', label: '坐上吧凳', action: (a) => a.sit(new THREE.Vector3(-13.4, y + 0.35, -10.3), 0, '调酒师擦着杯子：“今晚想喝点什么？”') });
  // 吊灯（暖光玻璃球）
  const bulbM = glow(0xffc88a, 1.8, 2.6);
  for (let i = 0; i < 8; i++) {
    const x = -15.5 + i * 1.6;
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 10), bulbM); b.position.set(x, y + 2.7, -11.5); root.add(b);
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 1.0, 4), new THREE.MeshBasicMaterial({ color: 0x555555 })); c.position.set(x, y + 3.25, -11.5); root.add(c);
  }
  // 窗边卡座（面向南侧夜景）
  for (let i = 0; i < 5; i++) {
    const x = -16 + i * 8;
    sofa(root, x, y, 12.4, 0, 0x3a2a52, 3.2);
    box(root, counterTop, 1.6, 0.06, 0.9, x, y + 0.62, 13.9, { collide: false });
    const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.1, 10), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffb060').multiplyScalar(2), toneMapped: false })); candle.position.set(x, y + 0.72, 13.9); root.add(candle);
  }
  interactable({ pos: new THREE.Vector3(0, y, 11.2), r: 1.8, icon: '🌃', label: '坐在窗边看夜景', action: (a) => a.sit(new THREE.Vector3(0, y + 0.1, 12.4), Math.PI, '116 米高空，整座城市的灯火尽收眼底……') });
  // 三角钢琴（东侧小舞台）
  box(root, std(0x1a1418, { roughness: 0.7 }), 6, 0.3, 5, 16, y, 2);
  const piano = new THREE.Group(); piano.position.set(16, y + 0.3, 2); root.add(piano);
  const pb = new THREE.Mesh(new RoundedBoxGeometry(1.6, 0.4, 2.2, 3, 0.15), new THREE.MeshPhysicalMaterial({ color: 0x0a0a0c, roughness: 0.1, clearcoat: 1 })); pb.position.y = 1.0; piano.add(pb);
  const lid = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.04, 2.0), new THREE.MeshPhysicalMaterial({ color: 0x0a0a0c, roughness: 0.1, clearcoat: 1 })); lid.position.set(0.3, 1.6, 0); lid.rotation.z = 0.6; piano.add(lid);
  const keysM = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.05, 0.25), std(0xf5f5f0)); keysM.position.set(0, 1.05, -1.2); piano.add(keysM);
  for (const [lx, lz] of [[-0.6, -0.8], [0.6, -0.8], [0, 0.9]]) { const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.8, 8), std(0x0a0a0c)); leg.position.set(lx, 0.4, lz); piano.add(leg); }
  addCollider(15, y, 0.8, 17, y + 1.8, 3.3);
  const pianist = makeSimplePerson(0x15151a, 0x2a2026); pianist.position.set(16, y + 0.3, 0.4); root.add(pianist); pianist.userData.dynamic = true;
  ctx.animators.push((dt, t) => { pianist.rotation.y = Math.sin(t * 2) * 0.08; });
  interactable({ pos: new THREE.Vector3(14, y, 2), r: 2.2, icon: '🎹', label: '点一首爵士', action: (a) => a.jazz() });
  sign(root, 'SKY BAR · 29F', -12, y + 3.0, -9.9, 0, 0.55, '#9B6BFF');
  lights(root, [[-10, y + 2.4, -10], [0, y + 2.4, 10], [-14, y + 2.4, 4]], 30, 20, 0xffb878);
  lights(root, [[16, y + 2.4, 2]], 20, 12, 0xb89bff);
  hotspot(-4, y, 4, 2.6, '空中酒吧', '<p>29 层是员工专属的<b>空中酒吧</b>：背光酒柜、黑金大理石吧台和窗边卡座，周五晚上还有现场爵士钢琴。</p><p>招牌是“三连特调”——草莓、蓝柑和金桔三层分明。</p>', 'cafe');
}

// =====================================================================
// 7F 路演会议中心：阶梯座位 + 发布会舞台 + 同传间
// =====================================================================
function forum(root, f, danmaku) {
  const y = f.y;
  const cp = carpetTexture(); cp.repeat.set(10, 8);
  shell(root, f, std(0x4a5878, { map: cp, roughness: 0.95 }), 0x23283a);
  // 舞台 + LED 背景 + 演讲台
  box(root, std(0x1c2030, { roughness: 0.5 }), 20, 0.45, 5, 0, y, -12.6);
  const edge = new THREE.MeshBasicMaterial({ color: new THREE.Color('#3D8BFF').multiplyScalar(1.6), toneMapped: false });
  box(root, edge, 20, 0.04, 0.05, 0, y + 0.45, -10.1, { collide: false });
  const ledC = document.createElement('canvas'); ledC.width = 1024; ledC.height = 320; const lg = ledC.getContext('2d');
  const grd = lg.createLinearGradient(0, 0, 1024, 320); grd.addColorStop(0, '#0d1b3d'); grd.addColorStop(1, '#2a1240'); lg.fillStyle = grd; lg.fillRect(0, 0, 1024, 320);
  drawTV(lg, 170, 160, 170, '#3D8BFF', 16);
  lg.fillStyle = '#fff'; lg.font = `900 72px ${FONT}`; lg.fillText('bilibili 年度创作者大会', 300, 150);
  lg.font = `600 34px ${FONT}`; lg.fillStyle = '#9fc4ff'; lg.fillText('CREATOR CONFERENCE · 一起，向热爱出发', 304, 215);
  const ledT = new THREE.CanvasTexture(ledC); ledT.colorSpace = THREE.SRGBColorSpace;
  plane(root, new THREE.MeshBasicMaterial({ map: ledT, color: 0xdddddd }), 18, 3.0, 0, y + 2.1, -15.6);
  const podium = new THREE.Group(); podium.position.set(5, y + 0.45, -11.2); root.add(podium);
  box(podium, std(0xf2f4f7, { roughness: 0.3 }), 1.0, 1.1, 0.6, 0, 0, 0, { collide: false });
  box(podium, edge, 1.0, 0.03, 0.02, 0, 0.9, 0.31, { collide: false });
  const mic = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.35, 6), std(0x222222)); mic.position.set(0, 1.25, 0.15); mic.rotation.x = 0.5; podium.add(mic);
  addCollider(4.5, y, -11.5, 5.5, y + 1.6, -10.9);
  // 阶梯座位（5 级，可走上去）
  const seatM = std(0x3D8BFF, { roughness: 0.75 }), stepM = std(0x2a3044, { roughness: 0.9 });
  for (let r = 0; r < 5; r++) {
    const z = -5 + r * 3.2, h = r * 0.32;
    if (r > 0) box(root, stepM, 34, h, 3.2, 0, y, z, { collide: true });
    for (let c = 0; c < 12; c++) {
      if (c === 5 || c === 6) continue;
      const x = -14.3 + c * 2.6;
      const ch = new THREE.Group(); ch.position.set(x, y + h, z); root.add(ch);
      const seat = new THREE.Mesh(new RoundedBoxGeometry(0.9, 0.12, 0.7, 2, 0.05), seatM); seat.position.y = 0.45; ch.add(seat);
      const back = new THREE.Mesh(new RoundedBoxGeometry(0.9, 0.7, 0.1, 2, 0.04), seatM); back.position.set(0, 0.8, 0.36); ch.add(back);
      const desk = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.03, 0.3), std(0xe9ecf1)); desk.position.set(0, 0.72, -0.55); ch.add(desk);
    }
  }
  // 同传间（玻璃小房间）
  const gl = new THREE.MeshStandardMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0.22, metalness: 0.8, roughness: 0.05, depthWrite: false, side: THREE.DoubleSide });
  box(root, gl, 5, FH, 0.1, 17.5, y, 6); box(root, gl, 0.1, FH, 5, 15, y, 8.5);
  box(root, std(0x2a2d36), 4, 0.8, 1.0, 17.5, y, 9.5);
  sign(root, '同声传译 · ON AIR', 17.5, y + 3.1, 6.06, 0, 0.36, '#3D8BFF');
  // 舞台灯：两排向舞台打的光锥
  const coneM = new THREE.MeshBasicMaterial({ color: 0xbfd8ff, transparent: true, opacity: 0.06, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
  for (const x of [-7, -2, 3, 8]) { const c = new THREE.Mesh(new THREE.ConeGeometry(1.4, 3.6, 20, 1, true), coneM); c.position.set(x, y + 1.95, -12.2); root.add(c); }
  let talking = 0;
  interactable({ pos: new THREE.Vector3(5, y + 0.45, -10.2), r: 1.6, icon: '🎤', label: '走上演讲台发言', cooldown: 4, action: (a) => {
    a.sit(new THREE.Vector3(5, y + 0.45, -10.4), 0, '你站上演讲台：“大家好，我是一名 UP 主……”台下响起掌声 👏');
    a.applause && a.applause(); talking++;
  } });
  sign(root, '路演会议中心 · FORUM', -12, y + 3.0, -9.9, 0, 0.55, '#3D8BFF');
  lights(root, [[0, y + 2.4, -11], [-8, y + 2.4, 4], [8, y + 2.4, 4]], 34, 22, 0xd8e4ff);
  hotspot(-15, y, 12, 2.6, '路演会议中心', '<p>7 层是 B 站对外发布会与创作者大会的场地：可容纳上百人的<b>阶梯路演厅</b>、LED 舞台和同声传译间。</p><p>每年的创作者大会、百大 UP 主颁奖都会在这里彩排。</p>', 'meet');
}

// =====================================================================
// 14F 音乐录音棚：架子鼓 / 键盘 / 调音台 / 隔音录音间
// =====================================================================
function music(root, f) {
  const y = f.y;
  const wd = woodTexture(); wd.repeat.set(8, 6);
  shell(root, f, std(0x6a4a34, { map: wd, roughness: 0.6 }), 0x1c1a22);
  // 吸音墙板（彩色）
  const panelCols = [0x3a2d4a, 0x2d3a4a, 0x4a2d3a];
  for (let i = 0; i < 12; i++) box(root, std(panelCols[i % 3], { roughness: 1 }), 1.6, 1.6, 0.12, -19 + i * 3.4, y + 1.2 + (i % 2) * 0.3, -15.6, { collide: false });
  // 架子鼓
  const kit = new THREE.Group(); kit.position.set(-10, y, 2); root.add(kit);
  const shellM = std(0xFF5DA2, { metalness: 0.4, roughness: 0.35 }), skinM = std(0xf5f2ea, { roughness: 0.6 }), chrome = std(0xd8dde4, { metalness: 1, roughness: 0.2 });
  const drum = (r, h, x, yy, z, rx = 0) => { const g = new THREE.Group(); g.position.set(x, yy, z); g.rotation.x = rx; const b = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 24), shellM); g.add(b); const t = new THREE.Mesh(new THREE.CircleGeometry(r, 24), skinM); t.rotation.x = -Math.PI / 2; t.position.y = h / 2 + 0.001; g.add(t); kit.add(g); return g; };
  const kick = drum(0.32, 0.4, 0, 0.34, 0, Math.PI / 2);
  const snare = drum(0.18, 0.14, 0.45, 0.7, 0.35); const tom1 = drum(0.15, 0.16, -0.18, 0.95, 0.1, 0.3); const tom2 = drum(0.15, 0.16, 0.18, 0.95, 0.1, 0.3); const floorTom = drum(0.22, 0.4, -0.55, 0.45, 0.4);
  const cymM = std(0xd9b04a, { metalness: 1, roughness: 0.25 });
  const cymbals = [[-0.65, 1.35, -0.1], [0.7, 1.25, 0.0], [0.6, 0.95, 0.6]].map(([x, yy, z]) => { const st = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, yy, 6), chrome); st.position.set(x, yy / 2, z); kit.add(st); const c = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.01, 24), cymM); c.position.set(x, yy, z); c.rotation.z = 0.15; kit.add(c); return c; });
  const stool = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.06, 16), std(0x111111)); stool.position.set(0, 0.55, 0.85); kit.add(stool);
  addCollider(-11, y, 1.2, -9, y + 1.4, 3.2);
  ctx.drumKit = { kick, snare, tom1, tom2, floorTom, cymbals };
  interactable({ pos: new THREE.Vector3(-10, y, 3.6), r: 1.6, icon: '🥁', label: '打一段鼓', cooldown: 3.5, action: (a) => a.drums() });
  // 键盘
  const keys = new THREE.Group(); keys.position.set(-3, y, 4); root.add(keys);
  box(keys, std(0x15171c), 1.4, 0.08, 0.4, 0, 0.82, 0, { collide: false });
  box(keys, std(0xf5f5f0), 1.3, 0.03, 0.18, 0, 0.87, 0.08, { collide: false });
  for (const sx of [-0.6, 0.6]) box(keys, chrome, 0.04, 0.82, 0.04, sx, 0, 0, { collide: false });
  addCollider(-3.7, y, 3.8, -2.3, y + 0.95, 4.2);
  interactable({ pos: new THREE.Vector3(-3, y, 4.9), r: 1.3, icon: '🎹', label: '弹一段旋律', cooldown: 2.5, action: (a) => a.keys() });
  // 调音台 + 监听音箱
  box(root, std(0x1e2027, { metalness: 0.4 }), 4.2, 0.95, 1.4, 10, y, -6);
  const mix = document.createElement('canvas'); mix.width = 512; mix.height = 160; const mg = mix.getContext('2d');
  mg.fillStyle = '#121318'; mg.fillRect(0, 0, 512, 160);
  for (let i = 0; i < 24; i++) { mg.fillStyle = '#2a2d36'; mg.fillRect(12 + i * 20.5, 20, 6, 120); mg.fillStyle = ['#FF5DA2', '#00AEEC', '#ffd166'][i % 3]; mg.fillRect(8 + i * 20.5, 40 + (i * 37) % 80, 14, 10); }
  const mixT = new THREE.CanvasTexture(mix); mixT.colorSpace = THREE.SRGBColorSpace;
  const desk = new THREE.Mesh(new THREE.PlaneGeometry(4.0, 1.2), new THREE.MeshBasicMaterial({ map: mixT, color: 0xcccccc })); desk.rotation.x = -Math.PI / 2 + 0.25; desk.position.set(10, y + 0.97, -6); root.add(desk);
  const meterM = new THREE.MeshBasicMaterial({ color: new THREE.Color('#2ee08a').multiplyScalar(1.4), toneMapped: false });
  const meters = []; for (let i = 0; i < 8; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.4, 0.02), meterM); m.position.set(8.4 + i * 0.45, y + 1.4, -6.65); m.userData.dynamic = true; root.add(m); meters.push(m); }
  ctx.animators.push((dt, t) => { if (!root.visible) return; meters.forEach((m, i) => { const v = 0.25 + Math.abs(Math.sin(t * (3 + i * 0.7) + i)) * (ctx.musicBoost > 0 ? 1.4 : 0.6); m.scale.y = v; m.position.y = y + 1.2 + v * 0.2; }); if (ctx.musicBoost > 0) ctx.musicBoost -= dt; });
  for (const x of [7.6, 12.4]) { box(root, std(0x15171c), 0.5, 0.8, 0.45, x, y + 0.95, -6.4, { collide: false }); const cone = new THREE.Mesh(new THREE.CircleGeometry(0.16, 20), std(0x2a2d36)); cone.position.set(x, y + 1.3, -6.17); root.add(cone); }
  // 隔音录音间（玻璃 + 麦克风 + 防喷罩）
  const gl = new THREE.MeshStandardMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0.2, metalness: 0.8, roughness: 0.05, depthWrite: false, side: THREE.DoubleSide });
  box(root, gl, 7, FH, 0.1, 16.5, y, 4); box(root, gl, 0.1, FH, 7, 13, y, 7.5);
  const mstand = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.6, 6), chrome); mstand.position.set(16.5, y + 0.8, 9); root.add(mstand);
  const mhead = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.12, 4, 10), std(0x2a2d34, { metalness: 0.7 })); mhead.position.set(16.5, y + 1.65, 9); root.add(mhead);
  const pop = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.008, 6, 20), std(0x111111)); pop.position.set(16.5, y + 1.65, 8.8); root.add(pop);
  const onAir = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff3b5c').multiplyScalar(0.3), toneMapped: false });
  box(root, onAir, 1.2, 0.35, 0.05, 16.5, y + 3.1, 4.06, { collide: false });
  sign(root, 'ON AIR', 16.5, y + 3.1, 4.1, 0, 0.3, '#ff3b5c');
  interactable({ pos: new THREE.Vector3(16.5, y, 8), r: 1.5, icon: '🎙️', label: '进录音间唱两句', cooldown: 4, action: (a) => { onAir.color.set('#ff3b5c').multiplyScalar(1.6); setTimeout(() => onAir.color.set('#ff3b5c').multiplyScalar(0.3), 5000); a.sing(); } });
  // 彩色氛围灯
  const pl = [0xff5da2, 0x7a5cff, 0x00aeec].map((c, i) => { const l = new THREE.PointLight(c, 16, 14, 1.6); l.position.set(-12 + i * 10, y + 2.6, 0); root.add(l); return l; });
  ctx.animators.push((dt, t) => { if (!root.visible) return; pl.forEach((l, i) => l.intensity = 12 + Math.sin(t * 1.5 + i * 2) * 6 + (ctx.musicBoost > 0 ? 10 : 0)); });
  sign(root, '音乐录音棚 · bilibili MUSIC', -12, y + 3.0, -9.9, 0, 0.55, '#FF5DA2');
  lights(root, [[-8, y + 2.4, 4], [10, y + 2.4, -4]], 22, 18, 0xffd8e8);
  hotspot(0, y, 12, 2.6, '音乐录音棚', '<p>14 层是 B 站音乐区的专业录音棚：架子鼓、合成器、24 轨调音台和独立隔音间。</p><p>不少 B 站原创音乐与虚拟歌手的作品，都是在这里完成录制与混音的。</p>', 'tv');
}

// =====================================================================
// 26F 休息舱 & 茶水间：胶囊睡眠舱 / 按摩椅 / 茶饮吧 / 懒人沙发
// =====================================================================
function lounge(root, f) {
  const y = f.y;
  const cp = carpetTexture(); cp.repeat.set(10, 8);
  shell(root, f, std(0xb8c8c0, { map: cp, roughness: 0.95 }), 0xd8d4cc);
  // 胶囊睡眠舱（两层）
  const podM = new THREE.MeshStandardMaterial({ color: 0xd9dcde, roughness: 0.35, metalness: 0.1 });
  const inner = new THREE.MeshBasicMaterial({ color: new THREE.Color('#4FC3A1').multiplyScalar(0.55) });
  const pods = [];
  for (let i = 0; i < 6; i++) for (let lv = 0; lv < 2; lv++) {
    const x = -18.5 + i * 2.6, yy = y + lv * 1.35, z = -13.6;
    const pod = new THREE.Mesh(new RoundedBoxGeometry(2.3, 1.2, 2.4, 3, 0.35), podM); pod.position.set(x, yy + 0.65, z); root.add(pod);
    const hole = new THREE.Mesh(new THREE.CircleGeometry(0.48, 28), inner); hole.position.set(x, yy + 0.65, z + 1.21); root.add(hole);
    pods.push({ x, yy, z, hole });
  }
  addCollider(-20, y, -15.4, -3.7, y + 2.7, -12.3);
  box(root, std(0xd8dde4, { metalness: 0.7 }), 0.08, 1.4, 0.08, -3.4, y, -12.2, { collide: false });
  interactable({ pos: new THREE.Vector3(-15.9, y, -11.2), r: 1.6, icon: '😴', label: '钻进睡眠舱小憩一会儿', cooldown: 8, action: (a) => a.nap(pods[2]) });
  // 按摩椅
  const massageM = std(0x2a2d34, { roughness: 0.5 }), cushion = std(0x4FC3A1, { roughness: 0.8 });
  for (let i = 0; i < 3; i++) {
    const g = new THREE.Group(); g.position.set(-14 + i * 3, y, 4); g.rotation.y = Math.PI; root.add(g);
    const seat = new THREE.Mesh(new RoundedBoxGeometry(1.0, 0.4, 1.0, 3, 0.15), massageM); seat.position.y = 0.4; g.add(seat);
    const back = new THREE.Mesh(new RoundedBoxGeometry(1.0, 1.1, 0.35, 3, 0.15), massageM); back.position.set(0, 1.0, -0.5); back.rotation.x = -0.35; g.add(back);
    const pad = new THREE.Mesh(new RoundedBoxGeometry(0.8, 0.9, 0.1, 2, 0.05), cushion); pad.position.set(0, 1.0, -0.33); pad.rotation.x = -0.35; g.add(pad);
    const leg = new THREE.Mesh(new RoundedBoxGeometry(0.8, 0.25, 0.7, 2, 0.1), massageM); leg.position.set(0, 0.25, 0.75); leg.rotation.x = 0.5; g.add(leg);
    addCollider(-14 + i * 3 - 0.55, y, 3.2, -14 + i * 3 + 0.55, y + 1.3, 5.4);
    if (i === 1) interactable({ pos: new THREE.Vector3(-11, y, 2.6), r: 1.3, icon: '💆', label: '躺上按摩椅放松', cooldown: 3, action: (a) => a.massage(new THREE.Vector3(-11, y + 0.3, 4.2)) });
  }
  // 茶饮吧
  box(root, std(0xffffff, { map: woodSlatTexture({ dark: '#2a1e16', light: '#a07a52' }), roughness: 0.6 }), 8, 1.05, 1.2, 12, y, -11.5);
  box(root, new THREE.MeshPhysicalMaterial({ map: marbleTexture({ seed: 61, tiles: 1 }), roughness: 0.2, clearcoat: 1 }), 8.2, 0.06, 1.4, 12, y + 1.05, -11.5, { collide: false });
  const jarM = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, roughness: 0.05, depthWrite: false });
  const teaCols = [0xc9822a, 0x6aa84f, 0xd94a3b, 0xf2c14e, 0x8b5a2b];
  for (let i = 0; i < 5; i++) { const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.4, 16), jarM); jar.position.set(9 + i * 1.5, y + 1.3, -11.8); root.add(jar); const tea = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.2, 16), std(teaCols[i], { roughness: 0.4 })); tea.position.set(9 + i * 1.5, y + 1.2, -11.8); root.add(tea); }
  sign(root, '茶水间 · 今日特饮：桂花乌龙', 12, y + 2.6, -15.6, 0, 0.42, '#4FC3A1');
  interactable({ pos: new THREE.Vector3(12, y, -10.2), r: 2.2, icon: '🍵', label: '泡一杯桂花乌龙', cooldown: 2, action: (a) => a.tea() });
  // 懒人沙发区 + 绿植 + 地毯
  const beanG = new THREE.SphereGeometry(0.6, 16, 12);
  [[4, 8, 0xFB7299], [6, 9.4, 0xffd166], [8.2, 8.2, 0x00AEEC], [5.2, 11, 0x4FC3A1]].forEach(([x, z, c]) => { const b = new THREE.Mesh(beanG, std(c, { roughness: 0.95 })); b.scale.set(1, 0.6, 1); b.position.set(x, y + 0.36, z); root.add(b); addCollider(x - 0.55, y, z - 0.55, x + 0.55, y + 0.7, z + 0.55); });
  const rug = new THREE.Mesh(new THREE.CircleGeometry(3.6, 40), std(0xe9e0d0, { roughness: 1 })); rug.rotation.x = -Math.PI / 2; rug.position.set(6, y + 0.012, 9.5); root.add(rug);
  for (const [x, z] of [[-20, 12], [20, 12], [16, 2], [-6, 13]]) plant(root, x, y, z);
  // 温暖的落地灯
  for (const [x, z] of [[2, 12], [10, 6]]) { const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.6, 6), std(0x2a2d34)); pole.position.set(x, y + 0.8, z); root.add(pole); const shade = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.35, 18, 1, true), glow(0xffd6a0, 0.9, 1.6, { side: THREE.DoubleSide })); shade.position.set(x, y + 1.7, z); root.add(shade); }
  sign(root, '休息舱 · 安静区 请勿喧哗', -12, y + 3.0, -9.9, 0, 0.5, '#4FC3A1');
  lights(root, [[-10, y + 1.9, -4], [8, y + 1.9, 6], [12, y + 1.9, -8]], 10, 16, 0xfff0dc);
  hotspot(-2, y, 12, 2.6, '休息舱 & 茶水间', '<p>26 层是员工的“充电站”：12 个胶囊睡眠舱、按摩椅和茶饮吧。</p><p>据说午休 20 分钟后，写代码的效率能提升 30%。</p>', 'cafe');
}

export function buildExtraFloors(scene, danmaku) {
  const groups = {};
  const fns = { showroom, canteen, forum, studio, game: gameCenter, music, anime: animeStudio, gym, theater, lounge, library, skybar };
  for (const f of EXTRA_FLOORS) { const g = new THREE.Group(); scene.add(g); fns[f.key](g, f, danmaku); groups[f.key] = g; }
  return groups;
}
