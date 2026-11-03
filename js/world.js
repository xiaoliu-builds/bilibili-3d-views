// 外部环境：天空、地面、园区广场、城市楼群、路灯、飘浮弹幕
import * as THREE from 'three';
import { ctx, box, addCollider, std, glow, registerNight, plane, hotspot, tree, boxGeo } from './common.js';
import { buildingTextures, groundTexture, tileTexture, textTexture, logoTexture, storefrontTexture, PINK, BLUE } from './textures.js';
import { TOWER } from './tower.js';

export const PLAZA = 92; // 园区半宽

// ---------- 天空 ----------
export function buildSky(scene) {
  const uniforms = {
    top: { value: new THREE.Color() }, mid: { value: new THREE.Color() }, bottom: { value: new THREE.Color() },
    starAmt: { value: 1 }, time: { value: 0 },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `
      uniform vec3 top; uniform vec3 mid; uniform vec3 bottom; uniform float starAmt; uniform float time;
      varying vec3 vDir;
      float hash(vec3 p){ p = fract(p*0.3183099+.1); p*=17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
      void main(){
        float h = vDir.y;
        vec3 col = h > 0.0 ? mix(mid, top, pow(clamp(h,0.0,1.0),0.55)) : mix(mid, bottom, clamp(-h*4.0,0.0,1.0));
        if (h > 0.05 && starAmt > 0.0) {
          vec3 p = floor(vDir * 420.0);
          float s = hash(p);
          float tw = 0.6 + 0.4*sin(time*2.0 + s*60.0);
          col += vec3(step(0.9975, s) * starAmt * tw * smoothstep(0.05, 0.3, h));
        }
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1800, 32, 16), mat);
  sky.renderOrder = -1; scene.add(sky);
  // 月亮 / 太阳
  const orb = new THREE.Mesh(new THREE.SphereGeometry(28, 24, 16), new THREE.MeshBasicMaterial({ color: 0xfff4e0, fog: false, toneMapped: false }));
  orb.position.set(-600, 520, -1100); scene.add(orb);
  ctx.animators.push((dt, t) => { uniforms.time.value = t; sky.position.copy(ctx.camera.position); });
  return { uniforms, orb };
}

// ---------- 地面与城市 ----------
export function buildCity(scene) {
  const gt = groundTexture(); gt.repeat.set(8, 8);
  const ground = plane(scene, std(0xffffff, { map: gt, roughness: 0.92 }), 1600, 1600, 0, 0, 0, 0, -Math.PI / 2);
  ground.receiveShadow = true;

  // 楼群：6 种窗户材质 + 共享几何
  const tints = [[28, 36, 52], [40, 44, 56], [24, 40, 58], [48, 40, 52], [30, 46, 50], [36, 36, 44]];
  const mats = tints.map((t, i) => {
    const tex = buildingTextures(100 + i * 17, 8, 16, t);
    return registerNight(new THREE.MeshStandardMaterial({ map: tex.map, emissiveMap: tex.emissiveMap, emissive: 0xffffff, roughness: 0.5, metalness: 0.3 }), 0.05, 1.0);
  });
  const roofMat = std(0x30343c, { roughness: 0.9 });
  const beaconMat = new THREE.MeshBasicMaterial({ color: 0xff3344, toneMapped: false });
  const beacons = [];
  let seed = 9;
  const R = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const unit = new THREE.BoxGeometry(1, 1, 1); unit.translate(0, 0.5, 0);
  // 街区：中心 3×3 内的楼可走近、可碰撞；四个“主题街区”留给 districts.js
  // 主题街区 + 东南角「新世代产业园」（2×2 地块，由 newgen.js 搭建）
  const DISTRICT = new Set(['0,1', '1,0', '-1,0', '0,-1', '1,1', '2,1', '1,2', '2,2', '-1,-1', '1,-1', '-1,1']);   // 西北卡丁车 / 东北 BML / 西南夜市
  const shopMats = [0, 1, 2, 3].map(i => new THREE.MeshBasicMaterial({ map: storefrontTexture(i), toneMapped: false }));
  for (let bx = -3; bx <= 3; bx++) for (let bz = -3; bz <= 3; bz++) {
    if (bx === 0 && bz === 0) continue;
    if (DISTRICT.has(`${bx},${bz}`)) continue;
    const cx = bx * 200, cz = bz * 200;
    const dist = Math.hypot(bx, bz);
    const near = Math.abs(bx) <= 1 && Math.abs(bz) <= 1;
    // 近处街区：沿街规则排布 4 栋（留出人行道），远处随机
    const slots = near ? [[-42, -42], [42, -42], [-42, 42], [42, 42]] : null;
    const n = near ? 4 : (dist < 2 ? 9 : 6);
    for (let i = 0; i < n; i++) {
      const w = near ? 50 + R() * 20 : 22 + R() * 30, d = near ? 50 + R() * 20 : 22 + R() * 30;
      const h = (dist < 1.5 ? 50 : 30) + R() * (dist < 2 ? 130 : 90);
      const x = near ? cx + slots[i][0] : cx + (R() - 0.5) * (170 - w), z = near ? cz + slots[i][1] : cz + (R() - 0.5) * (170 - d);
      const mat = mats[Math.floor(R() * mats.length)];
      const m = new THREE.Mesh(unit, [mat, mat, roofMat, roofMat, mat, mat]);
      m.scale.set(w, h, d); m.position.set(x, 0, z);
      scene.add(m);
      if (near) {
        addCollider(x - w / 2, 0, z - d / 2, x + w / 2, h, z + d / 2);
        ctx.cityFootprints = ctx.cityFootprints || []; ctx.cityFootprints.push({ x, z, w, d });
        // 临街商铺：四面一层发光店招 + 雨棚
        const awning = std([0xFB7299, 0x00AEEC, 0xffb027, 0x5a6476][i % 4], { roughness: 0.7 });
        for (const [fx, fz, fw, ry] of [[0, d / 2 + 0.05, w, 0], [0, -d / 2 - 0.05, w, Math.PI], [w / 2 + 0.05, 0, d, Math.PI / 2], [-w / 2 - 0.05, 0, d, -Math.PI / 2]]) {
          const sp = new THREE.Mesh(new THREE.PlaneGeometry(fw * 0.86, 3.6), shopMats[(i + Math.round(ry * 2)) & 3]);
          sp.position.set(x + fx, 2.2, z + fz); sp.rotation.y = ry; scene.add(sp);
          const aw = new THREE.Mesh(new THREE.BoxGeometry(fw * 0.86, 0.18, 1.6), awning);
          aw.position.set(x + fx + Math.sin(ry) * 0.8, 4.3, z + fz + Math.cos(ry) * 0.8); aw.rotation.y = ry; scene.add(aw);
        }
      }
      if (h > 110) {
        const b = new THREE.Mesh(new THREE.SphereGeometry(0.9, 8, 6), beaconMat); b.position.set(x, h + 1, z); scene.add(b); b.userData.dynamic = true; beacons.push(b);
      }
      // 少数大楼顶部霓虹边
      if (R() < 0.18) {
        const nm = new THREE.MeshBasicMaterial({ color: new THREE.Color(R() < 0.5 ? PINK : BLUE).multiplyScalar(1.3), toneMapped: false });
        box(scene, nm, w + 0.4, 0.6, 0.4, x, h - 0.6, z + d / 2, { collide: false });
        box(scene, nm, w + 0.4, 0.6, 0.4, x, h - 0.6, z - d / 2, { collide: false });
      }
    }
  }
  // 每种材质贴图统一重复（简化）
  mats.forEach(m => { m.map.repeat.set(2, 3); m.emissiveMap.repeat.set(2, 3); });
  ctx.animators.push((dt, t) => { const on = Math.sin(t * 2.4) > 0; beacons.forEach(b => b.visible = on); });
  // 可探索范围：±290（外圈道路内侧），用低矮护栏 + 隐形墙收边
  const L = 292;
  const rail = std(0xd0d5dc, { metalness: 0.7, roughness: 0.4 });
  for (const s2 of [-1, 1]) {
    box(scene, rail, 2 * L, 1.0, 0.25, 0, 0, s2 * L, { collide: false });
    box(scene, rail, 0.25, 1.0, 2 * L, s2 * L, 0, 0, { collide: false });
    addCollider(-L, 0, s2 * L - 0.5, L, 30, s2 * L + 0.5);
    addCollider(s2 * L - 0.5, 0, -L, s2 * L + 0.5, 30, L);
  }

  // 道路上的车流（发光小方块）
  const carGeo = new THREE.BoxGeometry(2, 1.2, 4.2);
  const headMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xfff2c4).multiplyScalar(1.5), toneMapped: false });
  const tailMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff3b3b).multiplyScalar(1.4), toneMapped: false });
  const cars = [];
  for (let i = 0; i < 70; i++) {
    const alongX = i % 2 === 0;
    const lane = [-300, -100, 100, 300][Math.floor(Math.random() * 4)];
    const dir = Math.random() < 0.5 ? 1 : -1;
    const m = new THREE.Mesh(carGeo, dir > 0 ? headMat : tailMat);
    const off = dir * 3;
    if (alongX) { m.rotation.y = Math.PI / 2; m.position.set(Math.random() * 1600 - 800, 0.7, lane + off); }
    else m.position.set(lane + off, 0.7, Math.random() * 1600 - 800);
    m.userData = { alongX, dir, v: 14 + Math.random() * 16 };
    scene.add(m); m.userData.dynamic = true; cars.push(m);
  }
  ctx.animators.push((dt) => {
    const ph = ctx.traffic ? ctx.traffic.phase : 0;
    for (const c of cars) {
      const u = c.userData, k = u.alongX ? 'x' : 'z';
      // 红灯：沿 X 行驶的车在东西绿灯(2)时通行，沿 Z 的在南北绿灯(0)时通行
      const green = u.alongX ? ph === 2 : ph === 0;
      let v = u.v;
      if (!green) {
        const p = c.position[k];
        for (const sl of [-100, 100]) {
          const stop = sl - u.dir * 13; // 停止线
          const ahead = (stop - p) * u.dir;
          if (ahead > 0 && ahead < 12) { v = u.v * Math.max(0, (ahead - 1) / 11); break; }
        }
      }
      c.position[k] += u.dir * v * dt;
      if (c.position[k] > 800) c.position[k] = -800; if (c.position[k] < -800) c.position[k] = 800;
    }
  });
}

// ---------- 园区广场 ----------
export function buildPlaza(scene) {
  const root = new THREE.Group(); scene.add(root);
  const S = PLAZA * 2;
  const pt = tileTexture({ base: '#aab1bd', line: '#8d95a2', n: 4, noise: 0.06 }); pt.repeat.set(S / 4, S / 4);
  const pave = plane(root, std(0xffffff, { map: pt, roughness: 0.85 }), S, S, 0, 0.02, 0, 0, -Math.PI / 2);
  pave.receiveShadow = true;
  // 草坪
  const grass = std(0x4f9a5c, { roughness: 1 });
  for (const [x, z, w, d] of [[-55, -40, 56, 70], [55, -40, 56, 70], [-58, 55, 50, 46], [58, 55, 50, 46]]) {
    box(root, grass, w, 0.12, d, x, 0, z, { collide: false, receive: true });
    const curb = std(0xe8eaee);
    box(root, curb, w + 0.6, 0.25, 0.3, x, 0, z - d / 2, { collide: false });
    box(root, curb, w + 0.6, 0.25, 0.3, x, 0, z + d / 2, { collide: false });
    box(root, curb, 0.3, 0.25, d, x - w / 2, 0, z, { collide: false });
    box(root, curb, 0.3, 0.25, d, x + w / 2, 0, z, { collide: false });
    for (let i = 0; i < 9; i++) {
      const tx = x + (Math.sin(i * 12.3 + x) * 0.42) * w, tz = z + (Math.cos(i * 7.1 + z) * 0.42) * d;
      tree(root, tx, tz, 1.1 + (i % 3) * 0.3, 0.12);
    }
  }
  // 中轴步道：深色石材“星光道” + 粉色发光引导线
  const pathTex = tileTexture({ base: '#565d6b', line: '#454b57', n: 2, noise: 0.08, accent: 'rgba(251,114,153,0.5)', seed: 71 });
  pathTex.repeat.set(1, 8);
  const path = std(0xffffff, { map: pathTex, roughness: 0.92, metalness: 0 });
  box(root, path, 12, 0.06, 74, 0, 0, TOWER.D / 2 + 40, { collide: false, receive: true });
  const lineMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(PINK).multiplyScalar(1.5), toneMapped: false });
  box(root, lineMat, 0.22, 0.09, 74, -5.4, 0, TOWER.D / 2 + 40, { collide: false });
  box(root, lineMat, 0.22, 0.09, 74, 5.4, 0, TOWER.D / 2 + 40, { collide: false });

  // 喷泉
  const fz = 52;
  const basin = new THREE.Mesh(new THREE.CylinderGeometry(7, 7.4, 0.9, 40, 1, true), std(0xeef0f3, { side: THREE.DoubleSide }));
  basin.position.set(0, 0.45, fz); root.add(basin);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(7.1, 0.25, 8, 48), std(0xffffff)); rim.rotation.x = Math.PI / 2; rim.position.set(0, 0.9, fz); root.add(rim);
  const water = new THREE.Mesh(new THREE.CircleGeometry(6.9, 40), new THREE.MeshStandardMaterial({ color: 0x3fb6e8, emissive: 0x00AEEC, emissiveIntensity: 0.35, roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.85 }));
  water.rotation.x = -Math.PI / 2; water.position.set(0, 0.7, fz); root.add(water);
  registerNight(water.material, 0.15, 0.7);
  addCollider(-7.2, 0, fz - 7.2, 7.2, 0.95, fz + 7.2);
  // 喷泉水柱粒子
  const N = 700, pos = new Float32Array(N * 3), vel = new Float32Array(N * 3);
  const resetP = (i) => {
    const a = Math.random() * Math.PI * 2, s = Math.random() < 0.35 ? 0.3 : 2.5;
    pos[i * 3] = Math.cos(a) * s * 0.2; pos[i * 3 + 1] = 0.9; pos[i * 3 + 2] = Math.sin(a) * s * 0.2;
    vel[i * 3] = Math.cos(a) * s * (0.6 + Math.random() * 0.5); vel[i * 3 + 1] = s < 1 ? 9 + Math.random() * 2 : 5 + Math.random(); vel[i * 3 + 2] = Math.sin(a) * s * (0.6 + Math.random() * 0.5);
  };
  for (let i = 0; i < N; i++) { resetP(i); pos[i * 3 + 1] = 0.9 + Math.random() * 4; }
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pm = new THREE.PointsMaterial({ color: 0xbfeaff, size: 0.18, transparent: true, opacity: 0.85, depthWrite: false });
  const pts = new THREE.Points(pg, pm); pts.position.set(0, 0, fz); pts.frustumCulled = false; root.add(pts);
  ctx.animators.push((dt) => {
    for (let i = 0; i < N; i++) {
      vel[i * 3 + 1] -= 9.8 * dt;
      pos[i * 3] += vel[i * 3] * dt; pos[i * 3 + 1] += vel[i * 3 + 1] * dt; pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
      if (pos[i * 3 + 1] < 0.7) resetP(i);
    }
    pg.attributes.position.needsUpdate = true;
  });
  // 喷泉中央小电视
  hotspot(0, 0, fz + 9, 3, '弹幕喷泉', '<p>喷泉的水柱随着节奏起伏，夜晚会亮起 <b>哔哩蓝</b> 的灯光。</p><p>这条粉色引导线是园区的中轴线，一路通往大楼正门。</p>', 'view');

  // 入口立牌
  const sign = new THREE.Group();
  box(sign, std(0xffffff, { roughness: 0.3 }), 22, 3.4, 1.6, 0, 0, 0, { collide: false, cast: true });
  const lt = logoTexture({ text: 'bilibili', color: PINK, glow: '#ffffff', sub: '哔哩哔哩 · 总部园区' });
  plane(sign, new THREE.MeshBasicMaterial({ map: lt, transparent: true }), 13, 3.25, 0, 1.7, 0.81);
  plane(sign, new THREE.MeshBasicMaterial({ map: lt, transparent: true }), 13, 3.25, 0, 1.7, -0.81, Math.PI);
  box(sign, glow(PINK, 1.2, 3), 22.2, 0.12, 1.7, 0, 3.4, 0, { collide: false });
  sign.position.set(-24, 0, 82); root.add(sign);
  addCollider(-35, 0, 81.2, -13, 3.5, 82.8);
  hotspot(-24, 0, 85, 4, '欢迎来到哔哩哔哩总部园区', `<p>这是一座以 <b>bilibili</b> 品牌元素为灵感创作的 3D 概念大楼（非真实建筑复刻）。</p><ul><li>沿着粉色中轴线向前，穿过自动门即可进入 <b>1F 大堂</b></li><li>乘坐电梯可前往 <b>16F 办公区</b> 与 <b>天台观景台</b></li><li>场景中带 <span class="dot"></span> 光圈的地方都可以按 <kbd>E</kbd> 查看介绍</li></ul>`, 'flag');

  // 路灯
  const poleMat = std(0x3a3f48, { metalness: 0.7, roughness: 0.4 });
  const headMat = glow(0xfff1d6, 0.2, 1.4);
  const poleGeo = new THREE.CylinderGeometry(0.08, 0.12, 5, 8);
  const headGeo = new THREE.SphereGeometry(0.35, 12, 8);
  const lampPts = [];
  for (let z = TOWER.D / 2 + 10; z <= 86; z += 12) for (const x of [-8.5, 8.5]) lampPts.push([x, z]);
  for (let x = -84; x <= 84; x += 21) if (Math.abs(x) > 12) lampPts.push([x, 88]);
  for (const [x, z] of lampPts) {
    (ctx.lampSpots ||= []).push([x, z]);
    const p = new THREE.Mesh(poleGeo, poleMat); p.position.set(x, 2.5, z); root.add(p);
    const h = new THREE.Mesh(headGeo, headMat); h.position.set(x, 5.1, z); root.add(h);
    addCollider(x - 0.15, 0, z - 0.15, x + 0.15, 5, z + 0.15);
  }
  // 少量真实点光源（夜间氛围）
  const lampLights = [];
  for (const [x, z] of [[-8.5, 26], [8.5, 50], [-8.5, 74], [8.5, 26]]) {
    const l = new THREE.PointLight(0xffd9a8, 24, 24, 1.8); l.position.set(x, 4.8, z); root.add(l); lampLights.push(l);
  }
  ctx.lampLights = lampLights;

  // 长椅
  const benchMat = std(0x8d6b4f, { roughness: 0.7 });
  for (const z of [32, 44, 64, 76]) for (const x of [-11, 11]) {
    box(root, benchMat, 0.6, 0.45, 2.6, x, 0, z);
    box(root, benchMat, 0.12, 0.5, 2.6, x + (x > 0 ? 0.28 : -0.28), 0.45, z, { collide: false });
  }

  // 园区边界：四面绿篱，各留 24m 出口通往城市（可碰撞，不再有隐形墙）
  const hedge = std(0x3c7e4a, { roughness: 1 });
  const B = PLAZA, GAP = 12;
  const seg = (x1, z1, x2, z2) => {
    const w = Math.max(Math.abs(x2 - x1), 1.2), d = Math.max(Math.abs(z2 - z1), 1.2);
    box(root, hedge, w, 1.1, d, (x1 + x2) / 2, 0, (z1 + z2) / 2);
  };
  for (const s2 of [-1, 1]) {
    seg(-B, s2 * B, -GAP, s2 * B); seg(GAP, s2 * B, B, s2 * B);   // 南北
    seg(s2 * B, -B, s2 * B, -GAP); seg(s2 * B, GAP, s2 * B, B);   // 东西
  }
  // 四个园区大门（粉色门楣 + 方向牌）
  const gate = new THREE.MeshBasicMaterial({ color: new THREE.Color(PINK).multiplyScalar(1.4), toneMapped: false });
  const gates = [
    { x: 0, z: B, ry: 0, label: '南门 · 商业步行街 →' },
    { x: 0, z: -B, ry: Math.PI, label: '北门 · BW 漫展中心 →' },
    { x: B, z: 0, ry: Math.PI / 2, label: '东门 · 城市公园 / 摩天轮 →' },
    { x: -B, z: 0, ry: -Math.PI / 2, label: '西门 · 地铁站 / 共享单车 →' },
  ];
  for (const gt2 of gates) {
    const g = new THREE.Group(); g.position.set(gt2.x, 0, gt2.z); g.rotation.y = gt2.ry; root.add(g);
    box(g, std(0xffffff), 1.2, 7, 1.2, -GAP, 0, 0, { collide: false });
    box(g, std(0xffffff), 1.2, 7, 1.2, GAP, 0, 0, { collide: false });
    box(g, gate, 2 * GAP + 1.2, 0.5, 0.8, 0, 7, 0, { collide: false });
    const t = textTexture(gt2.label, { size: 56, color: '#ffffff', stroke: null, bg: 'rgba(16,20,30,0.85)', pad: 22 });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.2 * t.aspect, 1.2), new THREE.MeshBasicMaterial({ map: t.tex, transparent: true, side: THREE.DoubleSide, toneMapped: false }));
    m.position.set(0, 8.3, 0); g.add(m);
  }
  // 门柱碰撞（世界坐标）
  for (const gt2 of gates) for (const o of [-GAP, GAP]) {
    const along = Math.abs(gt2.ry) === Math.PI / 2;
    const x = gt2.x + (along ? 0 : o), z = gt2.z + (along ? o : 0);
    addCollider(x - 0.6, 0, z - 0.6, x + 0.6, 7, z + 0.6);
  }

  return root;
}

// ---------- 飘浮的 3D 弹幕 ----------
export function buildFloatingDanmaku(scene) {
  const words = ['欢迎来到B站!', '前方高能', '2333333', 'awsl', '( ゜- ゜)つロ 干杯~', '爷青回', '一键三连', 'bilibili 干杯!', '好耶', '下次一定', '泪目', '名场面打卡', '哔哩哔哩 (゜-゜)つロ', '妙啊', 'UP主加油'];
  const colors = ['#ffffff', PINK, '#7fd8ff', '#ffe17a', '#ffffff'];
  const items = [];
  for (let i = 0; i < 34; i++) {
    const { tex, aspect } = textTexture(words[i % words.length], { size: 64, color: colors[i % colors.length], stroke: 'rgba(0,0,0,0.45)' });
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false, fog: false });
    const sp = new THREE.Sprite(mat);
    const s = 2.2 + Math.random() * 2.4;
    sp.scale.set(s * aspect, s, 1);
    const ring = Math.random() < 0.55;
    sp.userData = ring
      ? { ring: true, r: 40 + Math.random() * 30, a: Math.random() * Math.PI * 2, v: (0.05 + Math.random() * 0.08) * (Math.random() < 0.5 ? 1 : -1), y: 12 + Math.random() * 110 }
      : { ring: false, x: Math.random() * 180 - 90, z: TOWER.D / 2 + 6 + Math.random() * 60, y: 8 + Math.random() * 30, v: 6 + Math.random() * 8 };
    scene.add(sp); items.push(sp);
  }
  ctx.animators.push((dt, t) => {
    for (const sp of items) {
      const u = sp.userData;
      if (u.ring) { u.a += u.v * dt; sp.position.set(Math.cos(u.a) * u.r, u.y + Math.sin(t + u.a * 3) * 0.6, Math.sin(u.a) * u.r); }
      else { u.x -= u.v * dt; if (u.x < -100) u.x = 100; sp.position.set(u.x, u.y, u.z); }
    }
  });
}
