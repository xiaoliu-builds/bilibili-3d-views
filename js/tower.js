// B站大楼外观：大堂玻璃幕墙、塔楼幕墙、霓虹招牌、天台、小电视雕塑
import * as THREE from 'three';
import { ctx, box, addCollider, std, glow, registerNight, plane, hotspot } from './common.js';
import { facadeGlass, logoTexture, logo3DTexture, roundRect, skybarBandTexture, PINK, BLUE, textTexture } from './textures.js';

export const TOWER = { W: 44, D: 32, lobbyH: 10, top: 130, floors: 30 };

// ---------- 小电视（B站吉祥物 Logo）3D 模型 ----------
let faceTex = null;
function getFaceTex() {
  if (faceTex) return faceTex;
  const c = document.createElement('canvas'); c.width = 512; c.height = 380;
  const g = c.getContext('2d');
  g.fillStyle = '#0d1b2e'; roundRect(g, 6, 6, 500, 368, 70); g.fill();
  const grd = g.createRadialGradient(256, 150, 20, 256, 190, 300);
  grd.addColorStop(0, 'rgba(0,174,236,0.35)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd; roundRect(g, 6, 6, 500, 368, 70); g.fill();
  g.strokeStyle = '#ffffff'; g.lineCap = 'round'; g.lineWidth = 34;
  g.shadowColor = '#7fd8ff'; g.shadowBlur = 24;
  g.beginPath(); g.moveTo(100, 160); g.lineTo(200, 125); g.moveTo(412, 160); g.lineTo(312, 125); g.stroke();
  g.lineWidth = 24; g.beginPath();
  g.moveTo(180, 230); g.quadraticCurveTo(218, 290, 256, 230); g.quadraticCurveTo(294, 290, 332, 230); g.stroke();
  faceTex = new THREE.CanvasTexture(c); faceTex.colorSpace = THREE.SRGBColorSpace;
  return faceTex;
}

export function makeTV(scale = 1, color = BLUE, { glowBody = 0.25 } = {}) {
  const g = new THREE.Group();
  const w = 1, h = 0.78, r = 0.17, depth = 0.45;
  const s = new THREE.Shape(); const x = -w / 2, y = 0.08;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  const geo = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.035, bevelSegments: 3, curveSegments: 10 });
  geo.translate(0, 0, -depth / 2);
  const mat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: glowBody, roughness: 0.35, metalness: 0.2 });
  const body = new THREE.Mesh(geo, mat); body.castShadow = true; g.add(body);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(0.84, 0.62),
    new THREE.MeshBasicMaterial({ map: getFaceTex(), transparent: true, toneMapped: false }));
  face.position.set(0, y + h / 2, depth / 2 + 0.045); g.add(face);
  const back = face.clone(); back.position.z = -depth / 2 - 0.045; back.rotation.y = Math.PI; g.add(back);
  const antMat = std(color, { emissive: color, emissiveIntensity: glowBody });
  const antGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.32, 8);
  [-1, 1].forEach(sx => {
    const a = new THREE.Mesh(antGeo, antMat);
    a.position.set(sx * 0.2, y + h + 0.12, 0); a.rotation.z = sx * 0.75; g.add(a);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), antMat);
    ball.position.set(sx * 0.31, y + h + 0.23, 0); g.add(ball);
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.2), std(0x2a3340));
    leg.position.set(sx * 0.3, 0.04, 0); g.add(leg);
  });
  g.scale.setScalar(scale);
  g.userData.mat = mat;
  return g;
}

// ---------- 大楼 ----------
export function buildTower(scene) {
  const { W, D, lobbyH, top, floors } = TOWER;
  const hw = W / 2, hd = D / 2;
  const root = new THREE.Group(); scene.add(root);

  // —— 大堂玻璃 ——
  const glass = new THREE.MeshStandardMaterial({ color: 0xa8d8ff, transparent: true, opacity: 0.16, roughness: 0.05, metalness: 0.8, depthWrite: false, side: THREE.DoubleSide });
  const frame = std(0xdfe5ec, { metalness: 0.7, roughness: 0.3 });
  const glassPane = (w, h, x, y, z, ry) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), glass);
    m.position.set(x, y + h / 2, z); m.rotation.y = ry; m.renderOrder = 2; root.add(m);
  };
  // 正面（中间留门洞 x∈[-5,5], y∈[0,6]）
  glassPane(hw - 5, lobbyH, -(hw + 5) / 2, 0, hd, 0);
  glassPane(hw - 5, lobbyH, (hw + 5) / 2, 0, hd, 0);
  glassPane(10, lobbyH - 6, 0, 6, hd, 0);
  addCollider(-hw, 0, hd - 0.15, -5, lobbyH, hd + 0.15);
  addCollider(5, 0, hd - 0.15, hw, lobbyH, hd + 0.15);
  // 侧面
  glassPane(D, lobbyH, -hw, 0, 0, Math.PI / 2); glassPane(D, lobbyH, hw, 0, 0, Math.PI / 2);
  addCollider(-hw - 0.15, 0, -hd, -hw + 0.15, top, hd);
  addCollider(hw - 0.15, 0, -hd, hw + 0.15, top, hd);
  addCollider(-hw, 0, -hd - 0.15, hw, top, -hd + 0.15);
  addCollider(-hw, 6, hd - 0.15, hw, top, hd + 0.15);
  // 竖向铝框与横梁
  for (let x = -hw; x <= hw + 0.01; x += 4) {
    if (Math.abs(x) < 5.5 && x !== 0) continue;
    box(root, frame, 0.18, lobbyH, 0.3, x, 0, hd, { collide: false });
  }
  for (let z = -hd; z <= hd + 0.01; z += 4) {
    box(root, frame, 0.3, lobbyH, 0.18, -hw, 0, z, { collide: false });
    box(root, frame, 0.3, lobbyH, 0.18, hw, 0, z, { collide: false });
  }
  box(root, frame, W, 0.25, 0.32, 0, 6, hd, { collide: false });
  box(root, frame, 0.32, 0.25, D, -hw, 6, 0, { collide: false });
  box(root, frame, 0.32, 0.25, D, hw, 6, 0, { collide: false });
  // 背墙（实墙）
  box(root, std(0xf2f4f7), W, lobbyH, 0.3, 0, 0, -hd, { collide: false });

  // —— 自动感应玻璃门 ——
  const doorMat = new THREE.MeshStandardMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0.28, metalness: 0.9, roughness: 0.05, depthWrite: false });
  const doorL = new THREE.Mesh(new THREE.BoxGeometry(5, 6, 0.08), doorMat);
  const doorR = doorL.clone();
  doorL.position.set(-2.5, 3, hd); doorR.position.set(2.5, 3, hd); root.add(doorL, doorR); doorL.userData.dynamic = doorR.userData.dynamic = true;
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.6, 0.16), new THREE.MeshBasicMaterial({ color: new THREE.Color(PINK).multiplyScalar(1.4), toneMapped: false }));
  handle.position.set(2.3, 0, 0); doorL.add(handle);
  const handle2 = handle.clone(); handle2.position.x = -2.3; doorR.add(handle2);
  let doorOpen = 0;
  ctx.animators.push((dt) => {
    const p = ctx.player?.pos; if (!p) return;
    const near = Math.abs(p.x) < 8 && Math.abs(p.z - hd) < 7 && p.y < 3;
    doorOpen += ((near ? 1 : 0) - doorOpen) * Math.min(1, dt * 4);
    doorL.position.x = -2.5 - doorOpen * 4.6; doorR.position.x = 2.5 + doorOpen * 4.6;
  });

  // —— 入口雨棚 ——
  box(root, std(0xf7f8fa, { metalness: 0.4, roughness: 0.3 }), 18, 0.5, 8, 0, 6.2, hd + 4, { collide: false, cast: true });
  box(root, glow(PINK, 1.0, 3.0), 18.2, 0.12, 0.12, 0, 6.18, hd + 8, { collide: false });
  const canopyLogo = new THREE.MeshBasicMaterial({ map: logoTexture({ text: 'bilibili', color: '#ffffff', glow: PINK }), transparent: true, toneMapped: false });
  plane(root, canopyLogo, 8, 2, 0, 7.6, hd + 7.6);
  box(root, std(0xf7f8fa, { metalness: 0.4 }), 9, 0.1, 0.4, 0, 6.7, hd + 7.6, { collide: false });

  // —— 塔楼幕墙（单面材质：从楼内向外看自动剔除，如同透明玻璃）——
  const h = top - lobbyH;
  const fFront = facadeGlass(22, floors, 7);
  const fSide = facadeGlass(16, floors, 13);
  // 青蓝反射玻璃：白天映天空，夜晚透出少量暖光
  const mk = (tex) => registerNight(new THREE.MeshStandardMaterial({ map: tex.map, emissiveMap: tex.emissiveMap, emissive: 0xffffff, roughness: 0.14, metalness: 0.45, envMapIntensity: 3.2 }), 0.0, 0.62);
  const mFront = mk(fFront), mSide = mk(fSide);
  plane(root, mFront, W, h, 0, lobbyH + h / 2, hd + 0.02, 0);
  plane(root, mFront, W, h, 0, lobbyH + h / 2, -hd - 0.02, Math.PI);
  plane(root, mSide, D, h, hw + 0.02, lobbyH + h / 2, 0, Math.PI / 2);
  plane(root, mSide, D, h, -hw - 0.02, lobbyH + h / 2, 0, -Math.PI / 2);
  // 大堂顶板外沿 & 楼层腰线
  const band = std(0xe8edf3, { metalness: 0.5, roughness: 0.3 });
  box(root, band, W + 1, 0.8, D + 1, 0, lobbyH - 0.4, 0, { collide: false, cast: true });
  addCollider(-hw, lobbyH - 0.4, -hd, hw, lobbyH, hd);

  // —— 角部金属包边（夜间仅一条细青蓝光线）——
  const edgeMetal = std(0x2a3340, { metalness: 0.9, roughness: 0.35 });
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    box(root, edgeMetal, 0.5, h + 2, 0.5, sx * (hw + 0.15), lobbyH - 0.4, sz * (hd + 0.15), { collide: false });
  }
  const strip2 = new THREE.MeshBasicMaterial({ color: new THREE.Color('#7fd8ff'), toneMapped: false });
  [-11, 11].forEach(x => box(root, strip2, 0.12, h - 30, 0.08, x, lobbyH + 4, hd + 0.14, { collide: false }));
  // 顶部金属压顶 + 细蓝光线
  const cap = std(0x232a35, { metalness: 0.85, roughness: 0.3 });
  box(root, cap, W + 1.2, 0.9, D + 1.2, 0, top - 0.45, 0, { collide: false });
  const crown = new THREE.MeshBasicMaterial({ color: new THREE.Color(BLUE), toneMapped: false });
  box(root, crown, W + 1.2, 0.16, 0.16, 0, top - 1.0, hd + 0.62, { collide: false });
  box(root, crown, W + 1.2, 0.16, 0.16, 0, top - 1.0, -hd - 0.62, { collide: false });
  box(root, crown, 0.16, 0.16, D + 1.2, hw + 0.62, top - 1.0, 0, { collide: false });
  box(root, crown, 0.16, 0.16, D + 1.2, -hw - 0.62, top - 1.0, 0, { collide: false });
  ctx.animators.push(() => { const k = ctx.isNight ? 1 : 0.25; strip2.opacity = crown.opacity = k; });

  // —— 招牌 ——
  const logo3d = logo3DTexture();
  const signMat = new THREE.MeshBasicMaterial({ map: logo3d, transparent: true, toneMapped: false, depthWrite: false });
  // 立体字背板（深蓝厚板，侧面看有厚度）
  const signBack = std(0x102436, { metalness: 0.6, roughness: 0.4 });
  for (const [zz, ry] of [[hd + 0.35, 0], [-hd - 0.35, Math.PI]]) {
    box(root, signBack, 30, 6.6, 0.5, 0, top - 9, zz, { collide: false });
    plane(root, signMat, 28, 7, 0, top - 9, zz + (zz > 0 ? 0.28 : -0.28), ry);
  }
  const sideSign = new THREE.MeshBasicMaterial({ map: logo3d, transparent: true, toneMapped: false, depthWrite: false });
  plane(root, sideSign, 12, 3, hw + 0.4, top - 9, 0, Math.PI / 2);
  plane(root, sideSign, 12, 3, -hw - 0.4, top - 9, 0, -Math.PI / 2);

  // —— 天台 ——
  box(root, std(0xdfe5ec, { metalness: 0.4 }), W + 0.8, 0.6, D + 0.8, 0, top - 0.6, 0, { collide: false, cast: true });
  addCollider(-hw, top - 0.6, -hd, hw, top, hd);
  // 玻璃护栏
  const rail = new THREE.MeshStandardMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0.25, metalness: 0.8, roughness: 0.05, depthWrite: false });
  const railTop = new THREE.MeshBasicMaterial({ color: new THREE.Color(PINK).multiplyScalar(1.3), toneMapped: false });
  const railSeg = (w, d, x, z) => {
    box(root, rail, w, 1.2, d, x, top, z);
    box(root, railTop, Math.max(w, 0.12), 0.08, Math.max(d, 0.12), x, top + 1.2, z, { collide: false });
  };
  railSeg(W, 0.1, 0, hd - 0.1); railSeg(W, 0.1, 0, -hd + 0.1);
  railSeg(0.1, D, hw - 0.1, 0); railSeg(0.1, D, -hw + 0.1, 0);

  // 天台巨型小电视
  const bigTV = makeTV(11, BLUE, { glowBody: 0.35 });
  bigTV.position.set(0, top, 3); root.add(bigTV);
  addCollider(-6, top, 3 - 3, 6, top + 11, 3 + 3);
  ctx.animators.push((dt, t) => { bigTV.userData.mat.emissiveIntensity = (ctx.isNight ? 0.45 : 0.15) + Math.sin(t * 2) * 0.08; });
  hotspot(0, top, 9.5, 4, '天台巨型小电视', `<p>高达 <b>11 米</b> 的小电视雕塑是 B 站的标志性形象 —— 圆角电视机身、两根小天线和“ω”嘴巴，几乎每个 B 站用户都认识它。</p><p>据说站在它面前喊一声 <b>“干杯！”</b>，就能收获一整天的好运（｀・ω・´）</p>`, 'tv');

  // 天线塔 + 航空障碍灯
  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.4, 14, 8), std(0xcfd6de, { metalness: 0.8, roughness: 0.3 }));
  antenna.position.set(0, top + 4.5 + 7, -13); root.add(antenna);
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 10), new THREE.MeshBasicMaterial({ color: 0xff2a2a, toneMapped: false }));
  beacon.position.set(0, top + 4.5 + 14.3, -13); root.add(beacon); beacon.userData.dynamic = true;
  ctx.animators.push((dt, t) => { beacon.visible = Math.sin(t * 3) > 0; });

  // —— 29F 空中酒吧暖光带 + 空中花园挑台 ——
  const sbt = skybarBandTexture();
  const sbm = registerNight(new THREE.MeshStandardMaterial({ map: sbt, emissiveMap: sbt, emissive: 0xffffff, roughness: 0.3 }), 0.25, 1.1);
  const bandY = 118, bandH = 3.4;
  plane(root, sbm, W, bandH, 0, bandY, hd + 0.06, 0);
  plane(root, sbm, W, bandH, 0, bandY, -hd - 0.06, Math.PI);
  plane(root, sbm, D, bandH, hw + 0.06, bandY, 0, Math.PI / 2);
  plane(root, sbm, D, bandH, -hw - 0.06, bandY, 0, -Math.PI / 2);
  const ledge = std(0xe9edf2, { metalness: 0.5, roughness: 0.3 });
  const green = std(0x4f8f4a, { roughness: 1, flatShading: true });
  box(root, ledge, W + 2.4, 0.35, 1.6, 0, 116, hd + 0.8, { collide: false });
  box(root, green, W + 2, 0.5, 1.2, 0, 116.35, hd + 0.8, { collide: false });
  const railG = new THREE.MeshStandardMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0.25, metalness: 0.8, roughness: 0.05, depthWrite: false });
  box(root, railG, W + 2.4, 1.0, 0.05, 0, 116.35, hd + 1.6, { collide: false });
  // 主楼底部两侧竖向装饰鳍（入口识别性）
  const fin = std(0x2a3340, { metalness: 0.85, roughness: 0.3 });
  for (const x of [-hw - 0.9, hw + 0.9]) box(root, fin, 0.6, 26, 1.2, x, lobbyH - 0.4, hd - 2, { collide: false });
  return root;
}
