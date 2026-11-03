// 1F 大堂：高达风格巨型机甲展台（参考 B站总部大堂实景：环形沙发 + 底部蓝色打光 + bilibili 隔离带）
// 全部为程序化建模；机体静止不动（不做持续动画，避免画面抖动），按 E 才会“启动”一次。
import * as THREE from 'three';
import { ctx, addCollider, hotspot } from './common.js';
import { interactable } from './districts.js';
import { contactShadow } from './lighting.js';
import { textTexture, PINK, BLUE } from './textures.js';

// ---------- 装甲面板线贴图（分模线 + 小标识）----------
function panelTex(base = '#eef1f5', line = 'rgba(70,80,100,0.35)', seed = 1) {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, 256, 256);
  let s = seed; const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  // 轻微的明暗块，模拟不同装甲件
  for (let i = 0; i < 6; i++) { g.fillStyle = `rgba(0,0,0,${0.015 + rnd() * 0.02})`; g.fillRect(rnd() * 256, rnd() * 256, 40 + rnd() * 90, 30 + rnd() * 80); }
  g.strokeStyle = line; g.lineWidth = 2;
  for (let i = 0; i < 4; i++) { const x = rnd() * 256, y = rnd() * 256, w = 40 + rnd() * 120, h = 30 + rnd() * 120; g.strokeRect(x, y, w, h); }
  for (let i = 0; i < 2; i++) { g.beginPath(); const y = rnd() * 256; g.moveTo(0, y); g.lineTo(256, y + (rnd() - 0.5) * 30); g.stroke(); }
  // 螺丝孔 / 小标识
  g.fillStyle = 'rgba(60,70,90,0.3)'; for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(rnd() * 256, rnd() * 256, 2.2, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = 'rgba(230,60,70,0.7)'; g.fillRect(20 + rnd() * 160, 20 + rnd() * 160, 26, 6);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
  return t;
}

/** 给材质加“底部蓝色打光”：越靠近地面，越多蓝色自发光（模拟照片里的地灯效果，0 额外光源） */
function upLit(mat, y0, uniforms) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uUpCol = uniforms.col; sh.uniforms.uUpK = uniforms.k; sh.uniforms.uUpY0 = { value: y0 };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying float vUpY;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvUpY = (modelMatrix * vec4(transformed, 1.0)).y;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vUpY; uniform vec3 uUpCol; uniform float uUpK, uUpY0;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n float upF = 1.0 - smoothstep(0.0, 3.6, vUpY - uUpY0);\n totalEmissiveRadiance += uUpCol * uUpK * upF * upF * diffuseColor.rgb;');
  };
  mat.customProgramCacheKey = () => 'uplit';
  return mat;
}

export function buildGundam(root, X, Y, Z, RY = 0) {
  const G = new THREE.Group(); G.position.set(X, Y, Z); G.rotation.y = RY; root.add(G);
  const up = { col: { value: new THREE.Color('#3d7bff') }, k: { value: 0.32 } };

  // —— 材质（数值刻意与场景其他材质不同，避免被合批“合并”掉 shader 改动）——
  const white = upLit(new THREE.MeshStandardMaterial({ map: panelTex('#eef1f5', 'rgba(70,80,100,0.16)', 3), color: 0xf4f6fa, roughness: 0.43, metalness: 0.18, envMapIntensity: 1.1 }), Y, up);
  const white2 = upLit(new THREE.MeshStandardMaterial({ map: panelTex('#e2e6ec', 'rgba(70,80,100,0.2)', 9), color: 0xe9edf2, roughness: 0.47, metalness: 0.22, envMapIntensity: 1.1 }), Y, up);
  const frame = upLit(new THREE.MeshStandardMaterial({ color: 0x5c6472, roughness: 0.41, metalness: 0.72 }), Y, up);
  const joint = upLit(new THREE.MeshStandardMaterial({ color: 0x252a33, roughness: 0.52, metalness: 0.66 }), Y, up);
  const blue = upLit(new THREE.MeshStandardMaterial({ color: 0x2a55c9, roughness: 0.37, metalness: 0.28 }), Y, up);
  const red = upLit(new THREE.MeshStandardMaterial({ color: 0xd22f3c, roughness: 0.39, metalness: 0.24 }), Y, up);
  const yellow = new THREE.MeshStandardMaterial({ color: 0xf3c234, roughness: 0.33, metalness: 0.42, emissive: 0x3a2a00, emissiveIntensity: 0.35 });
  const eyeM = new THREE.MeshBasicMaterial({ color: new THREE.Color('#5ef0ff').multiplyScalar(1.6), toneMapped: false });
  const ventM = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffd25a').multiplyScalar(0.7), toneMapped: false });
  const thrustM = new THREE.MeshBasicMaterial({ color: new THREE.Color('#7fb4ff').multiplyScalar(0.4), toneMapped: false });

  const B = (parent, mat, w, h, d, x, y, z, rx = 0, ry = 0, rz = 0) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = true; parent.add(m); return m;
  };
  const C = (parent, mat, rt, rb, h, x, y, z, rx = 0, rz = 0, seg = 16) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat); m.position.set(x, y, z); m.rotation.set(rx, 0, rz); parent.add(m); return m;
  };
  /** 斜切装甲块：前面窄、后面宽的梯形体（比方盒更有机甲感） */
  const W = (parent, mat, w, h, d, x, y, z, taper = 0.75, rx = 0, ry = 0, rz = 0) => {
    const geo = new THREE.BoxGeometry(w, h, d, 1, 1, 1); const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) if (p.getZ(i) > 0) { p.setX(i, p.getX(i) * taper); p.setY(i, p.getY(i) * (0.5 + taper / 2)); }
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = true; parent.add(m); return m;
  };

  // ======== 腿（宽站姿，参考实景照片）========
  const HIP = 3.25, SPREAD = 0.15;
  for (const sx of [-1, 1]) {
    const leg = new THREE.Group(); leg.position.set(sx * 0.62, HIP, 0); leg.rotation.z = sx * SPREAD; G.add(leg);
    C(leg, joint, 0.26, 0.26, 0.5, 0, 0, 0, 0, Math.PI / 2, 14);                 // 胯关节
    B(leg, frame, 0.62, 1.25, 0.66, 0, -0.75, 0);                                 // 大腿骨架
    W(leg, white, 0.74, 1.05, 0.78, 0, -0.78, 0.04, 0.82);                         // 大腿装甲
    C(leg, joint, 0.24, 0.24, 0.72, 0, -1.48, 0, 0, Math.PI / 2, 14);              // 膝关节
    W(leg, white2, 0.6, 0.62, 0.34, 0, -1.48, 0.42, 0.7, -0.15);                    // 护膝
    B(leg, ventM, 0.36, 0.05, 0.02, 0, -1.4, 0.6);                                  // 膝部灯条
    W(leg, white, 0.9, 1.75, 1.0, 0, -2.4, 0.03, 0.8);                              // 小腿装甲
    for (let k = 0; k < 3; k++) B(leg, joint, 0.5, 0.05, 0.03, 0, -2.0 - k * 0.14, 0.53);   // 小腿散热格栅
    B(leg, red, 0.5, 0.42, 0.2, 0, -2.85, -0.52);                                   // 小腿后推进器
    C(leg, thrustM, 0.12, 0.16, 0.08, sx * 0.12, -3.0, -0.6, Math.PI / 2, 0, 12);
    // 脚：抵消胯部外撇，保持水平贴地
    const foot = new THREE.Group(); foot.position.set(0, -3.28, 0.08); foot.rotation.z = -sx * SPREAD; leg.add(foot);
    W(foot, white2, 0.86, 0.32, 1.5, 0, 0.12, 0.12, 0.7);
    B(foot, red, 0.9, 0.1, 1.55, 0, -0.03, 0.12);                                   // 鞋底
    B(foot, blue, 0.5, 0.2, 0.42, 0, 0.32, 0.55);                                   // 脚背
    C(foot, joint, 0.18, 0.18, 0.5, 0, 0.38, -0.2, 0, Math.PI / 2, 12);             // 踝关节
  }

  // ======== 腰 / 裙甲 ========
  B(G, joint, 1.25, 0.5, 0.8, 0, HIP + 0.1, 0);
  for (const sx of [-1, 1]) {
    const fs = W(G, white, 0.6, 0.78, 0.14, sx * 0.36, HIP - 0.12, 0.47, 0.85, 0.12, 0, -sx * 0.06);   // 前裙甲
    B(G, yellow, 0.06, 0.48, 0.02, sx * 0.2, HIP - 0.08, 0.55, 0.12, 0, sx * 0.5);                   // 黄色 V 纹
    W(G, white2, 0.16, 0.95, 0.78, sx * 0.86, HIP - 0.1, 0, 0.85, 0, 0, sx * 0.14);                  // 侧裙甲
    void fs;
  }
  B(G, red, 0.34, 0.5, 0.2, 0, HIP - 0.06, 0.48, 0.1);                               // 中央护裆
  B(G, white2, 1.1, 0.7, 0.16, 0, HIP - 0.08, -0.48, -0.12);                         // 后裙甲

  // ======== 躯干 ========
  B(G, red, 0.95, 0.5, 0.72, 0, HIP + 0.6, 0.02);                                     // 腹部
  for (let k = 0; k < 3; k++) B(G, joint, 0.8, 0.04, 0.02, 0, HIP + 0.46 + k * 0.13, 0.39);
  const chest = new THREE.Group(); chest.position.set(0, HIP + 1.55, 0); G.add(chest);
  W(chest, blue, 2.0, 1.35, 1.25, 0, 0, 0, 0.84);                                     // 胸甲
  W(chest, white, 0.7, 0.5, 0.3, 0, -0.5, 0.56, 0.8);                                 // 驾驶舱舱盖
  B(chest, red, 0.24, 0.24, 0.06, 0, -0.52, 0.73);
  for (const sx of [-1, 1]) {
    B(chest, yellow, 0.62, 0.5, 0.06, sx * 0.55, 0.12, 0.6);                         // 胸前散热口
    for (let k = 0; k < 4; k++) B(chest, ventM, 0.5, 0.05, 0.02, sx * 0.55, -0.02 + k * 0.1, 0.64);
    W(chest, white, 0.42, 0.34, 0.9, sx * 0.86, 0.62, 0.02, 0.8);                    // 肩颈装甲
  }
  B(chest, white2, 1.0, 0.18, 0.7, 0, 0.72, 0);                                       // 领口
  // 背包 + 光束军刀柄
  B(chest, frame, 1.25, 1.25, 0.6, 0, 0.0, -0.88);
  for (const sx of [-1, 1]) {
    C(chest, white2, 0.09, 0.09, 0.8, sx * 0.38, 0.9, -0.95, 0, 0, 12);
    C(chest, new THREE.MeshBasicMaterial({ color: new THREE.Color(PINK).multiplyScalar(1.6), toneMapped: false }), 0.05, 0.05, 0.1, sx * 0.38, 1.33, -0.95, 0, 0, 10);
    C(chest, joint, 0.18, 0.24, 0.42, sx * 0.34, -0.72, -1.0, 0, 0, 14);
    C(chest, thrustM, 0.14, 0.14, 0.04, sx * 0.34, -0.94, -1.0, 0, 0, 14);
  }

  // ======== 头 ========
  const head = new THREE.Group(); head.position.set(0, HIP + 2.42, 0.06); head.userData.dynamic = true; G.add(head);
  C(head, joint, 0.18, 0.22, 0.3, 0, -0.08, 0, 0, 0, 12);                             // 颈
  W(head, white, 0.58, 0.5, 0.6, 0, 0.22, 0, 0.82);                                   // 头盔
  B(head, joint, 0.44, 0.16, 0.06, 0, 0.18, 0.28);                                    // 面罩（眼部凹槽）
  const eyes = [];
  for (const sx of [-1, 1]) { const e = B(head, eyeM, 0.13, 0.06, 0.02, sx * 0.1, 0.19, 0.315, 0, 0, -sx * 0.18); eyes.push(e); }
  B(head, white2, 0.3, 0.14, 0.12, 0, 0.04, 0.28);                                    // 口罩
  B(head, red, 0.12, 0.08, 0.1, 0, -0.04, 0.3);                                       // 红色下巴
  B(head, red, 0.14, 0.1, 0.06, 0, 0.42, 0.29);                                       // 额头红色感应器
  for (const sx of [-1, 1]) {
    B(head, yellow, 0.05, 0.62, 0.04, sx * 0.22, 0.66, 0.3, 0, 0, -sx * 1.0);       // V 字天线
    C(head, yellow, 0.035, 0.035, 0.12, sx * 0.31, 0.2, 0.08, 0, Math.PI / 2, 8);    // 头部火神炮
  }
  C(head, white2, 0.012, 0.012, 0.5, 0.18, 0.55, -0.24, 0.3, 0, 6);                  // 后天线

  // ======== 肩 / 手臂 ========
  const armR = new THREE.Group(), armL = new THREE.Group();
  for (const [arm, sx] of [[armR, -1], [armL, 1]]) {
    arm.position.set(sx * 1.38, HIP + 1.88, 0); G.add(arm);
    W(arm, white, 1.0, 0.9, 1.15, sx * 0.12, 0.05, 0, 0.82, 0, 0, sx * 0.08);         // 肩甲
    B(arm, red, 0.06, 0.32, 0.9, sx * 0.63, 0.05, 0);                                  // 肩甲红线
    C(arm, joint, 0.24, 0.24, 0.5, 0, -0.45, 0, 0, Math.PI / 2, 14);
    B(arm, frame, 0.42, 0.95, 0.46, 0, -0.95, 0);                                      // 上臂
    const fore = new THREE.Group(); fore.position.set(0, -1.48, 0); arm.add(fore);
    C(fore, joint, 0.2, 0.2, 0.46, 0, 0, 0, 0, Math.PI / 2, 14);                       // 肘关节
    W(fore, white, 0.6, 1.15, 0.64, 0, -0.62, 0, 0.84);                                // 前臂装甲
    B(fore, joint, 0.36, 0.38, 0.34, 0, -1.34, 0.04);                                  // 手
    arm.userData.fore = fore;
  }
  // 右手：持光束步枪，枪口朝下斜指地面（照片同款姿势）
  armR.rotation.set(-0.22, 0, -0.16); armR.userData.fore.rotation.x = -0.55; armR.userData.dynamic = true;
  {
    const rifle = new THREE.Group(); rifle.position.set(0, -1.38, 0.2); rifle.rotation.x = -0.2; armR.userData.fore.add(rifle);
    B(rifle, joint, 0.18, 0.3, 1.9, 0, 0, 0.55);
    B(rifle, frame, 0.12, 0.12, 0.9, 0, 0.02, 1.85);
    B(rifle, white2, 0.14, 0.16, 0.5, 0, 0.24, 0.35);                                  // 瞄具
    B(rifle, joint, 0.12, 0.34, 0.16, 0, -0.26, 0.12);                                  // 握把
    B(rifle, red, 0.04, 0.04, 0.4, 0.1, 0.0, 0.95);
    armR.userData.muzzle = B(rifle, new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff7aa8').multiplyScalar(0.1), toneMapped: false }), 0.08, 0.08, 0.04, 0, 0.02, 2.32);
  }
  // 左手：持盾
  armL.rotation.set(0.05, 0, 0.12); armL.userData.fore.rotation.x = -0.35;
  {
    const sh = new THREE.Group(); sh.position.set(0.42, -0.65, 0.1); sh.rotation.set(0.1, 0.12, 0); armL.userData.fore.add(sh);
    const shape = new THREE.Shape(); shape.moveTo(0, 1.2); shape.lineTo(0.62, 0.9); shape.lineTo(0.55, -0.6); shape.lineTo(0, -1.25); shape.lineTo(-0.55, -0.6); shape.lineTo(-0.62, 0.9); shape.closePath();
    const sgeo = new THREE.ExtrudeGeometry(shape, { depth: 0.1, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.05, bevelSegments: 1 });
    const outer = new THREE.Mesh(sgeo, white); outer.rotation.y = Math.PI / 2; sh.add(outer);
    const inner = new THREE.Mesh(new THREE.ShapeGeometry(shape), red); inner.scale.set(0.8, 0.84, 1); inner.rotation.y = Math.PI / 2; inner.position.x = 0.17; sh.add(inner);
    B(sh, yellow, 0.02, 0.9, 0.12, 0.18, 0.38, 0); B(sh, yellow, 0.02, 0.12, 0.6, 0.18, 0.5, 0);   // 十字徽记
  }

  // ======== 展台：深色圆台 + 地面 LED 灯环 + 环形沙发 ========
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.3, 0.06, 64), new THREE.MeshPhysicalMaterial({ color: 0x1b1e26, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.08 }));
  plinth.position.y = 0.03; G.add(plinth);
  const ledRing = new THREE.Mesh(new THREE.TorusGeometry(2.25, 0.035, 6, 96), new THREE.MeshBasicMaterial({ color: new THREE.Color('#4a8cff').multiplyScalar(1.8), toneMapped: false }));
  ledRing.rotation.x = Math.PI / 2; ledRing.position.y = 0.07; G.add(ledRing);
  // 4 盏地埋射灯：灯头 + 向上的加色光柱
  const beamC = document.createElement('canvas'); beamC.width = 64; beamC.height = 256; const bg = beamC.getContext('2d');
  const gr = bg.createLinearGradient(0, 256, 0, 0); gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.45, 'rgba(255,255,255,0.25)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  bg.fillStyle = gr; bg.fillRect(0, 0, 64, 256);
  const hg = bg.createLinearGradient(0, 0, 64, 0); hg.addColorStop(0, 'rgba(0,0,0,1)'); hg.addColorStop(0.3, 'rgba(0,0,0,0)'); hg.addColorStop(0.7, 'rgba(0,0,0,0)'); hg.addColorStop(1, 'rgba(0,0,0,1)');
  bg.globalCompositeOperation = 'destination-out'; bg.fillStyle = hg; bg.fillRect(0, 0, 64, 256);
  const beamT = new THREE.CanvasTexture(beamC);
  const beamM = new THREE.MeshBasicMaterial({ map: beamT, color: new THREE.Color('#5d93ff'), transparent: true, opacity: 0.07, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false, fog: false });
  const lampM = new THREE.MeshBasicMaterial({ color: new THREE.Color('#9cc2ff').multiplyScalar(2), toneMapped: false });
  for (const [lx, lz] of [[-1.1, 1.3], [1.1, 1.3], [-1.3, -0.9], [1.3, -0.9]]) {
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.03, 16), lampM); lamp.position.set(lx, 0.075, lz); G.add(lamp);
    const beam = new THREE.Mesh(new THREE.ConeGeometry(0.95, 4.6, 20, 1, true), beamM); beam.position.set(lx * 0.8, 2.35, lz * 0.8); beam.rotation.x = Math.PI; beam.rotation.z = -lx * 0.08; beam.renderOrder = 5; G.add(beam);
  }
  // 环形沙发：6 段软包座面 + 内圈靠背（照片同款浅灰布艺）
  const fabric = new THREE.MeshStandardMaterial({ color: 0xd8d4cf, roughness: 0.96, metalness: 0 });
  const fabric2 = new THREE.MeshStandardMaterial({ color: 0xcbc6c0, roughness: 0.97, metalness: 0 });
  const sector = (r0, r1, a0, a1) => { const s = new THREE.Shape(); s.absarc(0, 0, r1, a0, a1, false); s.absarc(0, 0, r0, a1, a0, true); s.closePath(); return s; };
  const N = 6, gap = 0.025;
  for (let i = 0; i < N; i++) {
    const a0 = i / N * Math.PI * 2 + gap, a1 = (i + 1) / N * Math.PI * 2 - gap;
    const seat = new THREE.Mesh(new THREE.ExtrudeGeometry(sector(2.62, 3.3, a0, a1), { depth: 0.34, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 2, curveSegments: 20 }), fabric);
    seat.rotation.x = -Math.PI / 2; seat.position.y = 0.06; G.add(seat);
    const back = new THREE.Mesh(new THREE.ExtrudeGeometry(sector(2.36, 2.6, a0, a1), { depth: 0.74, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 2, curveSegments: 20 }), fabric2);
    back.rotation.x = -Math.PI / 2; back.position.y = 0.06; G.add(back);
  }
  const plinthBase = new THREE.Mesh(new THREE.CylinderGeometry(3.38, 3.38, 0.06, 64, 1, true), new THREE.MeshStandardMaterial({ color: 0x8f8a84, roughness: 0.8 }));
  plinthBase.position.y = 0.03; G.add(plinthBase);

  // —— 铭牌（斜面立牌）——
  const plate = new THREE.Group(); G.add(plate); plate.position.set(0, 0, 4.1);
  const pm = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.9, 0.08), new THREE.MeshStandardMaterial({ color: 0x15171c, roughness: 0.3, metalness: 0.6 })); pm.position.y = 0.82; pm.rotation.x = -0.5; plate.add(pm);
  const pc = document.createElement('canvas'); pc.width = 600; pc.height = 360; const pg = pc.getContext('2d');
  pg.fillStyle = '#15171c'; pg.fillRect(0, 0, 600, 360);
  pg.fillStyle = PINK; pg.fillRect(36, 40, 8, 120);
  pg.fillStyle = '#fff'; pg.font = '900 64px "Noto Sans SC","PingFang SC",sans-serif'; pg.textBaseline = 'top'; pg.fillText('高达 · BL-78', 64, 34);
  pg.fillStyle = '#9ab8ff'; pg.font = '700 26px Arial'; pg.fillText('MOBILE SUIT · bilibili HQ 1F', 66, 112);
  pg.fillStyle = '#c9ccd6'; pg.font = '500 26px "Noto Sans SC",sans-serif';
  ['全高 约 6.6 米 · 大堂守护者', '请勿攀爬 · 欢迎拍照打卡'].forEach((t, i) => pg.fillText(t, 40, 196 + i * 46));
  pg.fillStyle = BLUE; pg.font = 'italic 900 34px "Arial Black",Arial'; pg.fillText('bilibili', 430, 300);
  const pt = new THREE.CanvasTexture(pc); pt.colorSpace = THREE.SRGBColorSpace; pt.anisotropy = 4;
  const face = new THREE.Mesh(new THREE.PlaneGeometry(1.42, 0.85), new THREE.MeshBasicMaterial({ map: pt, toneMapped: false, color: 0xd8d8d8 }));
  face.rotation.x = -0.5; face.position.set(0, 0.82 + 0.045 * Math.sin(0.5), 0.045 * Math.cos(0.5)); plate.add(face);
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.7, 10), new THREE.MeshStandardMaterial({ color: 0x15171c, metalness: 0.7, roughness: 0.3 })); post.position.y = 0.35; plate.add(post);

  // —— bilibili 隔离带（黑色立柱 + 蓝字织带），沿正面弧线 ——
  const beltC = document.createElement('canvas'); beltC.width = 512; beltC.height = 32; const bt = beltC.getContext('2d');
  bt.fillStyle = '#16181d'; bt.fillRect(0, 0, 512, 32); bt.fillStyle = '#3fa9ff'; bt.font = 'italic 900 22px "Arial Black",Arial'; bt.textBaseline = 'middle';
  for (let x = 20; x < 512; x += 170) bt.fillText('bilibili', x, 17);
  const beltT = new THREE.CanvasTexture(beltC); beltT.colorSpace = THREE.SRGBColorSpace; beltT.wrapS = THREE.RepeatWrapping;
  const postM = new THREE.MeshStandardMaterial({ color: 0x1a1c22, metalness: 0.75, roughness: 0.32 });
  const R = 4.55, angs = [-1.15, -0.62, -0.08, 0.46, 1.0, 1.5];
  const pts = angs.map(a => new THREE.Vector3(Math.sin(a) * R, 0, Math.cos(a) * R));
  pts.forEach((p, i) => {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.95, 12), postM); pole.position.set(p.x, 0.5, p.z); G.add(pole);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.19, 0.04, 20), postM); base.position.set(p.x, 0.02, p.z); G.add(base);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), postM); cap.position.set(p.x, 0.98, p.z); G.add(cap);
    if (i < pts.length - 1) {
      const q = pts[i + 1], len = p.distanceTo(q);
      const t = beltT.clone(); t.needsUpdate = true; t.repeat.set(len / 1.6, 1);
      const belt = new THREE.Mesh(new THREE.PlaneGeometry(len, 0.06), new THREE.MeshBasicMaterial({ map: t, side: THREE.DoubleSide }));
      belt.position.set((p.x + q.x) / 2, 0.88, (p.z + q.z) / 2); belt.rotation.y = -Math.atan2(q.z - p.z, q.x - p.x); G.add(belt);
    }
  });

  // —— 碰撞（世界坐标，覆盖圆形沙发）——
  G.updateMatrixWorld(true);
  const w = (lx, lz) => new THREE.Vector3(lx, 0, lz).applyMatrix4(G.matrixWorld);
  const cRing = 3.35;
  addCollider(X - 2.45, Y, Z - 2.45, X + 2.45, Y + 7.5, Z + 2.45);
  addCollider(X - cRing, Y, Z - 1.75, X + cRing, Y + 1, Z + 1.75);
  addCollider(X - 1.75, Y, Z - cRing, X + 1.75, Y + 1, Z + cRing);
  for (const p of pts) { const q = w(p.x, p.z); addCollider(q.x - 0.18, Y, q.z - 0.18, q.x + 0.18, Y + 1, q.z + 0.18); }
  { const q = w(0, 4.1); addCollider(q.x - 0.25, Y, q.z - 0.25, q.x + 0.25, Y + 1.1, q.z + 0.25); }

  // —— 接触阴影 ——
  contactShadow(root, X, Y, Z, 8.2, 8.2, 0.38);
  for (const sx of [-1, 1]) { const q = w(sx * 1.08, 0.2); contactShadow(root, q.x, Y + 0.07, q.z, 1.6, 2.2, 0.55); }

  // —— 讲解 & 互动 ——
  const front = w(-1.5, 4.95);
  hotspot(front.x, Y, front.z, 1.6, '高达 · 大堂守护者', '<p>参考 B 站总部大堂实景：一台 <b>约 6.6 米高的巨型机甲</b>站在环形沙发中央，脚下的地灯把机体打成冷蓝色，是访客最爱的打卡点。</p><p>这里按 <b>高达风格</b>程序化重建：白色装甲 + 蓝色胸甲 + 黄色 V 字天线，右手持光束步枪，左手持盾，背后插着两把光束军刀。</p><p class="tip">靠近隔离带按 <kbd>E</kbd>，可以“启动”它。</p>', 'view', { focusY: 4.4, focus: new THREE.Vector3(X, Y, Z) });
  // 启动演出：眼睛亮起 → 头转向玩家 → 地灯增强 → 抬枪 → 胸口散热口发光 → 复位
  let boot = -1;
  const fore0 = armR.userData.fore.rotation.x, arm0 = armR.rotation.x;
  const base = { k: up.k.value, op: beamM.opacity };
  interactable({ pos: w(1.5, 4.95), r: 1.6, icon: '🤖', label: '启动高达', cooldown: 7, action: (a) => {
    boot = 0; a.sfx('whoosh'); a.toast('机体启动中…  “BL-78，出击准备完毕！”', '🤖', BLUE);
    setTimeout(() => a.sfx('ding'), 900);
  } });
  ctx.animators.push((dt) => {
    if (boot < 0) return;
    boot += dt; const t = boot;
    const on = t < 5.2 ? Math.min(1, t / 0.6) : Math.max(0, 1 - (t - 5.2) / 1.2);
    eyeM.color.set('#5ef0ff').multiplyScalar(1.6 + on * 4 + (t < 0.6 ? Math.sin(t * 40) * 1.5 : 0));
    ventM.color.set('#ffd25a').multiplyScalar(0.7 + on * 1.6);
    thrustM.color.set('#7fb4ff').multiplyScalar(0.4 + on * 2.2);
    up.k.value = base.k + on * 0.45; beamM.opacity = base.op + on * 0.1;
    // 头转向玩家（限制角度）
    const p = ctx.player?.pos;
    if (p) {
      const lp = G.worldToLocal(p.clone()); const yaw = THREE.MathUtils.clamp(Math.atan2(lp.x, lp.z), -0.7, 0.7);
      head.rotation.y += (yaw * on - head.rotation.y) * Math.min(1, dt * 3);
    }
    // 抬枪
    const lift = THREE.MathUtils.smoothstep(t, 1.2, 2.2) * (1 - THREE.MathUtils.smoothstep(t, 5.0, 6.2));
    armR.rotation.x = arm0 - lift * 0.55; armR.userData.fore.rotation.x = fore0 + lift * 0.5;
    armR.userData.muzzle.material.color.set('#ff7aa8').multiplyScalar(0.1 + lift * 3);
    if (t > 6.4) { boot = -1; head.rotation.y = 0; up.k.value = base.k; beamM.opacity = base.op; }
  });
  return G;
}
