// 真实园区建筑群：玻璃副楼、黑色格栅商业裙楼、旋转门、候车亭吉祥物、金色雕塑、灌木
import * as THREE from 'three';
import { RoundedBoxGeometry } from '../lib/addons/RoundedBoxGeometry.js';
import { ctx, box, addCollider, std, glow, plane, registerNight, hotspot } from './common.js';
import { TOWER } from './tower.js';
import { facadeGlass, logo3DTexture, adTexture, shopTexture, stopSignTexture, tvFaceTexture, PINK, BLUE } from './textures.js';

export const FOOTPRINTS = [];
const glassMatCache = [];
function glassMaterial(cols, floors, seed) {
  const tex = facadeGlass(cols, floors, seed);
  const m = registerNight(new THREE.MeshStandardMaterial({ map: tex.map, emissiveMap: tex.emissiveMap, emissive: 0xffffff, roughness: 0.12, metalness: 0.5, envMapIntensity: 5 }), 0, 0.8);
  glassMatCache.push(m); return m;
}

// ---------- 玻璃副楼 ----------
function towerBlock({ x, z, w, d, h, seed, logo = true }) {
  const g = new THREE.Group(); g.position.set(x, 0, z);
  const floors = Math.round(h / 4), cols = Math.round(w / 2);
  const glass = glassMaterial(cols, floors, seed);
  const roof = std(0x2b313b, { metalness: 0.6, roughness: 0.5 });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [glass, glass, roof, roof, glass, glass]);
  mesh.position.y = h / 2; mesh.castShadow = true; g.add(mesh);
  // 楼层腰线 + 四角竖向金属鳍：更像真实写字楼
  const bandM = std(0xd6dde6, { metalness: 0.7, roughness: 0.3 }), finM = std(0x2a3340, { metalness: 0.85, roughness: 0.3 });
  for (let yy = 8; yy < h - 2; yy += 8) {
    box(g, bandM, w + 0.36, 0.22, 0.18, 0, yy, d / 2 + 0.09, { collide: false }); box(g, bandM, w + 0.36, 0.22, 0.18, 0, yy, -d / 2 - 0.09, { collide: false });
    box(g, bandM, 0.18, 0.22, d + 0.36, w / 2 + 0.09, yy, 0, { collide: false }); box(g, bandM, 0.18, 0.22, d + 0.36, -w / 2 - 0.09, yy, 0, { collide: false });
  }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(g, finM, 0.5, h + 1, 0.5, sx * (w / 2 + 0.1), 0, sz * (d / 2 + 0.1), { collide: false });
  // 入口雨棚
  box(g, std(0x1c2027, { metalness: 0.7, roughness: 0.35 }), Math.min(12, w * 0.5), 0.35, 3, 0, 4.2, d / 2 + 1.5, { collide: false });
  box(g, new THREE.MeshBasicMaterial({ color: new THREE.Color(BLUE).multiplyScalar(1.3), toneMapped: false }), Math.min(12, w * 0.5), 0.06, 0.06, 0, 4.15, d / 2 + 3, { collide: false });
  // 屋顶设备层
  box(g, std(0xd7dde5, { roughness: 0.5 }), w * 0.4, 2.6, d * 0.35, -w * 0.12, h, -d * 0.1, { cast: true });
  box(g, std(0x9aa3ae, { metalness: 0.8, roughness: 0.35 }), w * 0.22, 1.8, d * 0.22, w * 0.2, h, d * 0.14, { cast: true });
  // 顶部金属压顶 + 蓝线
  box(g, std(0x232a35, { metalness: 0.85, roughness: 0.3 }), w + 0.6, 0.7, d + 0.6, 0, h - 0.35, 0, { collide: false });
  const blue = new THREE.MeshBasicMaterial({ color: new THREE.Color(BLUE), toneMapped: false });
  box(g, blue, w + 0.6, 0.12, 0.12, 0, h - 0.78, d / 2 + 0.32, { collide: false });
  if (logo) {
    const tex = logo3DTexture({ w: 1024, h: 300 });
    const lm = new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false, depthWrite: false });
    const lw = Math.min(w * 0.62, 15);
    plane(g, lm, lw, lw * 300 / 1024, 0, h - 6.5, d / 2 + 0.36, 0);
    plane(g, lm, lw, lw * 300 / 1024, 0, h - 6.5, -d / 2 - 0.36, Math.PI);
  }
  ctx.scene.add(g);
  addCollider(x - w / 2, 0, z - d / 2, x + w / 2, h + 4, z + d / 2);
  FOOTPRINTS.push({ x, z, w, d, type: 'tower' });
  return g;
}

// ---------- 黑色竖向格栅商业裙楼 ----------
function podiumBlock({ x, z, w, d, h, seed, ad }) {
  const g = new THREE.Group(); g.position.set(x, 0, z);
  const body = std(0x20242c, { roughness: 0.75, metalness: 0.2 });
  box(g, body, w, h, d, 0, 0, 0, { cast: true });
  const dark = std(0x12151c, { roughness: 0.7, metalness: 0.3 });
  // 二层以上：竖向黑色百叶（实例化）
  const slatGeo = new THREE.BoxGeometry(0.28, h - 4.2, 0.5);
  const n = Math.floor(w / 0.85);
  const im = new THREE.InstancedMesh(slatGeo, dark, n * 2);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(1, 1, 1), pp = new THREE.Vector3();
  let k = 0;
  for (let i = 0; i < n; i++) {
    const xx = -w / 2 + 0.5 + i * 0.85;
    m4.compose(pp.set(xx, 2.1 + (h - 4.2) / 2, d / 2 + 0.18), q, sc); im.setMatrixAt(k++, m4);
    m4.compose(pp.set(xx, 2.1 + (h - 4.2) / 2, -d / 2 - 0.18), q, sc); im.setMatrixAt(k++, m4);
  }
  im.castShadow = true; g.add(im);
  // 一层商铺橱窗（发光）
  for (let i = 0; i < 3; i++) {
    const sw = w / 3 - 1.2;
    const sx = -w / 3 + i * (w / 3);
    const tex = shopTexture(seed + i);
    const mat = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false });
    plane(g, mat, sw, 2.7, sx, 1.75, d / 2 + 0.3, 0);
  }
  // 二层广告大屏
  const adMat = new THREE.MeshBasicMaterial({ map: adTexture(ad), toneMapped: false });
  plane(g, adMat, w * 0.46, (w * 0.46) * 2 / 3, 0, h * 0.62, d / 2 + 0.34, 0);
  // 压顶 + 蓝色细光
  box(g, std(0x14171e, { metalness: 0.5, roughness: 0.4 }), w + 0.5, 0.6, d + 0.5, 0, h + 0.3, 0, { collide: false });
  box(g, new THREE.MeshBasicMaterial({ color: new THREE.Color(BLUE), toneMapped: false }), w + 0.4, 0.1, 0.1, 0, h - 0.15, d / 2 + 0.3, { collide: false });
  ctx.scene.add(g);
  addCollider(x - w / 2, 0, z - d / 2, x + w / 2, h + 2, z + d / 2);
  FOOTPRINTS.push({ x, z, w, d, type: 'podium' });
  return g;
}

// ---------- 玻璃连廊 ----------
function bridge(side) {
  const x = side * 26, z = -8;
  const mat = new THREE.MeshStandardMaterial({ color: 0x9fd0ee, transparent: true, opacity: 0.22, metalness: 0.9, roughness: 0.06, depthWrite: false, envMapIntensity: 4 });
  const b = new THREE.Mesh(new THREE.BoxGeometry(8, 4.2, 8), mat);
  b.position.set(x, 6.4, z); ctx.scene.add(b);
  box(ctx.scene, std(0x2a3340, { metalness: 0.8, roughness: 0.3 }), 8, 0.3, 8, x, 4.2, z, { collide: false });
  box(ctx.scene, std(0x2a3340, { metalness: 0.8, roughness: 0.3 }), 8, 0.3, 8, x, 8.7, z, { collide: false });
}

// ---------- 入口旋转门（视觉装饰） ----------
function revolvingDoor(x) {
  const g = new THREE.Group(); g.position.set(x, 0, TOWER.D / 2 + 0.6);
  const glass = new THREE.MeshStandardMaterial({ color: 0xbfe4f8, transparent: true, opacity: 0.3, metalness: 0.9, roughness: 0.05, depthWrite: false, envMapIntensity: 3 });
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.25, 3.4, 32, 1, true), glass);
  wall.position.y = 1.7; g.add(wall);
  const leafMat = new THREE.MeshStandardMaterial({ color: 0xd8eefb, transparent: true, opacity: 0.55, metalness: 0.6, roughness: 0.1, depthWrite: false });
  for (let i = 0; i < 4; i++) {
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(1.15, 3.1, 0.04), leafMat);
    leaf.position.y = 1.65; leaf.rotation.y = i * Math.PI / 2 + Math.PI / 4; g.add(leaf);
  }
  const metal = std(0xb8c0ca, { metalness: 0.95, roughness: 0.25 });
  for (const y of [0.05, 3.35]) { const r = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.08, 10, 36), metal); r.rotation.x = Math.PI / 2; r.position.y = y; g.add(r); }
  ctx.scene.add(g);
  addCollider(x - 0.95, 0, TOWER.D / 2 - 0.4, x + 0.95, 3.4, TOWER.D / 2 + 1.6);
}

// ---------- 灌木球 ----------
const shrubGeo = new THREE.IcosahedronGeometry(0.62, 1);
const shrubMats = [0x4c8a4f, 0x5fa25e, 0x6fae5e, 0x3f7a48].map(c => std(c, { roughness: 1, flatShading: true }));
export function shrub(x, z, s = 1, y = 0) {
  const m = new THREE.Mesh(shrubGeo, shrubMats[(Math.abs(x * 31 + z * 17) | 0) % 4]);
  m.scale.set(s * (1 + Math.random() * 0.25), s * 0.72, s * (1 + Math.random() * 0.25));
  m.position.set(x, y + 0.42 * s, z); m.castShadow = true;
  ctx.scene.add(m);
}

// ---------- 坐姿小电视人偶（工作中的小电视） ----------
function officeTV() {
  const g = new THREE.Group();
  const black = new THREE.MeshStandardMaterial({ color: 0x1c2028, roughness: 0.55, metalness: 0.15 });
  const white = new THREE.MeshStandardMaterial({ color: 0xf4f5f8, roughness: 0.4, metalness: 0.05 });
  const grey = new THREE.MeshStandardMaterial({ color: 0x8a909c, roughness: 0.5, metalness: 0.3 });
  const shoe = new THREE.MeshStandardMaterial({ color: 0x101218, roughness: 0.35, metalness: 0.2 });
  // 躯干（西装）
  const body = new THREE.Mesh(new RoundedBoxGeometry(0.95, 0.95, 0.55, 3, 0.16), black);
  body.position.set(0, 1.32, 0); g.add(body);
  // 白衬衫领口
  const shirt = new THREE.Mesh(new RoundedBoxGeometry(0.34, 0.3, 0.06, 2, 0.03), white);
  shirt.position.set(0, 1.55, 0.29); g.add(shirt);
  // 头
  const head = new THREE.Mesh(new RoundedBoxGeometry(1.62, 1.28, 0.82, 5, 0.24), white);
  head.position.set(0, 2.42, 0); g.add(head);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(1.42, 1.08),
    new THREE.MeshBasicMaterial({ map: tvFaceTexture(), transparent: true, toneMapped: false }));
  face.position.set(0, 2.42, 0.42); g.add(face);
  // 天线
  const antMat = black, antG = new THREE.CylinderGeometry(0.03, 0.03, 0.34, 8);
  for (const sx of [-1, 1]) {
    const a = new THREE.Mesh(antG, antMat); a.position.set(sx * 0.42, 3.2, -0.1); a.rotation.z = sx * 0.5; g.add(a);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), antMat); ball.position.set(sx * 0.5, 3.34, -0.1); g.add(ball);
  }
  // 手臂 + 白手套（手搭在公文包上）
  for (const sx of [-1, 1]) {
    const arm = new THREE.Mesh(new RoundedBoxGeometry(0.2, 0.62, 0.22, 2, 0.1), black);
    arm.position.set(sx * 0.5, 1.2, 0.18); arm.rotation.x = -0.7; g.add(arm);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 10), white);
    hand.position.set(sx * 0.34, 1.02, 0.42); hand.scale.set(1, 0.8, 1.1); g.add(hand);
  }
  // 公文包
  const bag = new THREE.Mesh(new RoundedBoxGeometry(0.72, 0.5, 0.28, 3, 0.07), grey);
  bag.position.set(0, 1.08, 0.42); g.add(bag);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.02, 8, 20, Math.PI), black);
  handle.position.set(0, 1.36, 0.42); g.add(handle);
  for (const sx of [-1, 1]) { const lk = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.1, 0.03), std(0xd8dde5, { metalness: 0.9, roughness: 0.2 })); lk.position.set(sx * 0.18, 1.08, 0.57); g.add(lk); }
  // 坐姿大腿 + 小腿 + 皮鞋
  for (const sx of [-1, 1]) {
    const thigh = new THREE.Mesh(new RoundedBoxGeometry(0.3, 0.24, 0.5, 2, 0.1), black);
    thigh.position.set(sx * 0.24, 0.78, 0.18); g.add(thigh);
    const calf = new THREE.Mesh(new RoundedBoxGeometry(0.26, 0.5, 0.26, 2, 0.1), black);
    calf.position.set(sx * 0.24, 0.42, 0.38); g.add(calf);
    const sh = new THREE.Mesh(new RoundedBoxGeometry(0.32, 0.2, 0.46, 3, 0.1), shoe);
    sh.position.set(sx * 0.24, 0.14, 0.5); g.add(sh);
  }
  return g;
}

// ---------- 候车亭 ----------
function mascotStop() {
  const g = new THREE.Group(); g.position.set(-10, 0, 35);
  const metal = std(0x232733, { metalness: 0.7, roughness: 0.35 });
  const benchMat = std(0x9aa3ae, { metalness: 0.7, roughness: 0.3 });
  // 平台
  box(g, std(0xcdd2da, { roughness: 0.7 }), 6.8, 0.2, 3.8, 0, 0.1, 0, { receive: true });
  // 背板 + 侧挡板
  box(g, metal, 6.8, 3.2, 0.16, 0, 1.75, -1.55);
  const panelMat = new THREE.MeshStandardMaterial({ color: 0x16324a, roughness: 0.4, metalness: 0.2, emissive: new THREE.Color(BLUE), emissiveIntensity: 0.25 });
  box(g, panelMat, 6.2, 2.5, 0.06, 0, 1.85, -1.45, { collide: false });
  // 立柱
  for (const sx of [-1, 1]) box(g, metal, 0.24, 3.7, 0.24, sx * 3.2, 1.95, 1.55);
  // 顶棚
  box(g, metal, 7.2, 0.3, 4.1, 0, 3.75, 0.2);
  box(g, metal, 7.2, 0.4, 0.3, 0, 3.55, 2.1);
  for (let i = 0; i < 4; i++) box(g, glow(0xfff4e0, 0.8, 1.1), 1.2, 0.04, 0.5, -2.4 + i * 1.6, 3.56, 0.6, { collide: false });
  // 亭顶蓝色 bilibili 立体字
  const signBack = std(0x102436, { metalness: 0.6, roughness: 0.4 });
  box(g, signBack, 4.6, 1.25, 0.22, 0, 4.5, 1.95, { collide: false });
  plane(g, new THREE.MeshBasicMaterial({ map: logo3DTexture({ w: 1024, h: 280 }), transparent: true, toneMapped: false, depthWrite: false }),
    4.2, 1.05, 0, 4.5, 2.03, 0);
  // 长椅
  box(g, benchMat, 4.6, 0.14, 0.8, 0, 0.62, -0.85);
  box(g, benchMat, 4.6, 0.7, 0.12, 0, 1.0, -1.22);
  for (const sx of [-2, 2]) box(g, metal, 0.12, 0.5, 0.6, sx, 0.32, -0.85);
  // 小电视人偶坐上去
  const tv = officeTV(); tv.position.set(0, 0.66, -0.55); g.add(tv);
  hotspot(-10, 0.4, 37.4, 4.5, '工作中的小电视',
    `<p>这是 B 站园区的标志性装置 —— <b>候车的小电视</b>。</p><p>它穿着西装、抱着公文包，每天坐在长椅上等 12 路班车；旁边站牌上的小电视已经等了 <b>12 周年</b>。</p><p class="tip">上班这件事，连小电视都会眯起眼睛</p>`, 'tv', { ringOnly: true });
  // 圆形站牌
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.4, 10), std(0xb8c0ca, { metalness: 0.9, roughness: 0.25 }));
  pole.position.set(3.9, 1.3, 2.0); g.add(pole);
  const signMat = new THREE.MeshBasicMaterial({ map: stopSignTexture(), transparent: true, toneMapped: false, side: THREE.DoubleSide });
  const disk = new THREE.Mesh(new THREE.CircleGeometry(0.62, 40), signMat);
  disk.position.set(3.9, 2.85, 2.0); g.add(disk);
  const diskBack = disk.clone(); diskBack.rotation.y = Math.PI; diskBack.position.z = 1.96; g.add(diskBack);
  // 亭前斑马线
  const zebra = std(0xeef0f4, { roughness: 0.8 });
  for (let i = 0; i < 4; i++) box(g, zebra, 5.6, 0.02, 0.3, 0, 0.215, 2.6 + i * 0.5, { collide: false });
  ctx.scene.add(g);
  addCollider(-13.4, 0, 33.4, -6.6, 3.6, 36.6); // 亭体
  addCollider(-6.3, 0, 36.7, -5.5, 3, 37.5);   // 站牌
}

// ---------- 金色招财小电视 ----------
function goldenTV() {
  const g = new THREE.Group(); g.position.set(9.6, 0, 21);
  const gold = new THREE.MeshStandardMaterial({ color: 0xd9a93f, metalness: 1, roughness: 0.22, envMapIntensity: 1.4 });
  const darkGold = new THREE.MeshStandardMaterial({ color: 0x8a6420, metalness: 1, roughness: 0.3 });
  // 石座
  box(g, std(0xc2c7cf, { roughness: 0.6 }), 1.5, 1.1, 1.3, 0, 0.55, 0);
  // 坐姿身体
  const body = new THREE.Mesh(new RoundedBoxGeometry(0.95, 0.9, 0.7, 4, 0.2), gold);
  body.position.set(0, 1.75, 0); g.add(body);
  // 举起的招财手
  const armUp = new THREE.Mesh(new RoundedBoxGeometry(0.2, 0.6, 0.2, 2, 0.1), gold);
  armUp.position.set(-0.55, 2.35, 0.05); armUp.rotation.z = 0.5; g.add(armUp);
  const pawUp = new THREE.Mesh(new THREE.SphereGeometry(0.15, 14, 10), gold); pawUp.position.set(-0.78, 2.62, 0.05); g.add(pawUp);
  const armDown = new THREE.Mesh(new RoundedBoxGeometry(0.2, 0.55, 0.2, 2, 0.1), gold);
  armDown.position.set(0.55, 1.85, 0.1); armDown.rotation.x = -0.5; g.add(armDown);
  const pawDown = new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 10), gold); pawDown.position.set(0.62, 1.6, 0.3); g.add(pawDown);
  // 头
  const head = new THREE.Mesh(new RoundedBoxGeometry(1.15, 0.95, 0.62, 5, 0.2), gold);
  head.position.set(0, 2.85, 0); g.add(head);
  // 脸：古铜色眯眼 + ω（透明贴片）
  const c = document.createElement('canvas'); c.width = 512; c.height = 420;
  const cx = c.getContext('2d');
  cx.strokeStyle = '#6e4e14'; cx.fillStyle = '#6e4e14'; cx.lineWidth = 30; cx.lineCap = 'round'; cx.lineJoin = 'round';
  cx.beginPath(); cx.moveTo(150, 165); cx.lineTo(210, 185); cx.stroke();
  cx.beginPath(); cx.moveTo(362, 165); cx.lineTo(302, 185); cx.stroke();
  cx.lineWidth = 24; cx.beginPath(); cx.moveTo(200, 260); cx.quadraticCurveTo(226, 306, 256, 262); cx.quadraticCurveTo(286, 306, 312, 260); cx.stroke();
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const face = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.82), new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false }));
  face.position.set(0, 2.85, 0.32); g.add(face);
  // 耳朵
  for (const sx of [-1, 1]) {
    const a = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.24, 8), darkGold);
    a.position.set(sx * 0.3, 3.48, 0); a.rotation.z = sx * 0.45; g.add(a);
  }
  // 脚
  for (const sx of [-1, 1]) { const f = new THREE.Mesh(new RoundedBoxGeometry(0.34, 0.22, 0.42, 3, 0.1), gold); f.position.set(sx * 0.28, 1.2, 0.12); g.add(f); }
  ctx.scene.add(g);
  hotspot(9.6, 0.5, 22.6, 3, '招财小电视',
    `<p>门口右侧的<b>金色小电视</b>，参考了园区里的招财猫雕塑。</p><p>举爪的姿势寓意“投币招财”—— 走过时别忘了来一个一键三连。</p>`, 'tv');
}

export function buildCampus() {
  // 两栋玻璃副楼 + 两栋格栅商业裙楼
  towerBlock({ x: -49, z: -18, w: 27, d: 27, h: 80, seed: 31 });
  towerBlock({ x: 47, z: -24, w: 30, d: 28, h: 64, seed: 57 });
  podiumBlock({ x: -41, z: -7, w: 22, d: 12, h: 14, seed: 3, ad: 1 });
  podiumBlock({ x: 41, z: -9, w: 22, d: 12, h: 14, seed: 8, ad: 2 });
  bridge(-1); bridge(1);
  // 入口旋转门
  revolvingDoor(7.6); revolvingDoor(-7.6);
  // 吉祥物候车亭 & 金色雕塑
  mascotStop();
  goldenTV();
  // 灌木
  const pts = [];
  for (let i = 0; i < 5; i++) pts.push([-14 - i * 2.2, 19 + (i % 2) * 2], [14 + i * 2.2, 19 - (i % 2) * 2]);
  pts.push([-14.5, 32.5], [-14.5, 37.5], [12.5, 24], [8, 24.5], [11.5, 18], [-30, 20], [30, 20]);
  pts.push([-26, 12], [26, 12], [-30, 6], [30, 6], [-30, -2], [30, -2]);
  pts.forEach(([x, z], i) => shrub(x, z, 0.8 + (i % 3) * 0.25));
}
