// 公共工具：带碰撞的盒子、热点注册、昼夜材质登记
import * as THREE from 'three';

export const ctx = {
  scene: null,
  colliders: [],      // {min:Vector3, max:Vector3}
  hotspots: [],       // {pos, r, title, html, icon}
  elevators: [],      // {x, z, level}
  animators: [],      // (dt, t) => void
  nightMats: [],      // {mat, day, night} 昼夜切换时调整 emissiveIntensity
  minimapRects: [],   // 小地图绘制
  levels: {
    plaza: { key: 'plaza', name: '园区广场', y: 0 },
    lobby: { key: 'lobby', name: '1F 大堂', y: 0.2 },
    office: { key: 'office', name: '16F 创作者办公区', y: 62 },
    roof: { key: 'roof', name: 'RF 天台观景台', y: 130 },
  },
  isNight: true,
};

const geoCache = new Map();
export function boxGeo(w, h, d) {
  const k = `${w}|${h}|${d}`;
  if (!geoCache.has(k)) geoCache.set(k, new THREE.BoxGeometry(w, h, d));
  return geoCache.get(k);
}

/** 以“底面中心”为锚点放置盒子 */
export function box(parent, mat, w, h, d, x, y, z, { collide = true, cast = false, receive = false } = {}) {
  const m = new THREE.Mesh(boxGeo(w, h, d), mat);
  m.position.set(x, y + h / 2, z);
  m.castShadow = cast; m.receiveShadow = receive;
  parent.add(m);
  if (collide) {
    // 碰撞体换算到世界坐标（父节点可能有平移/90°旋转）
    if (parent && !parent.isScene && (parent.position.lengthSq() > 0 || parent.rotation.y !== 0 || parent.parent)) {
      parent.updateWorldMatrix(true, false);
      _bb.makeEmpty();
      for (const sx of [-1, 1]) for (const sy of [0, 1]) for (const sz of [-1, 1]) {
        _v.set(x + sx * w / 2, y + sy * h, z + sz * d / 2).applyMatrix4(parent.matrixWorld); _bb.expandByPoint(_v);
      }
      addCollider(_bb.min.x, _bb.min.y, _bb.min.z, _bb.max.x, _bb.max.y, _bb.max.z);
    } else addCollider(x - w / 2, y, z - d / 2, x + w / 2, y + h, z + d / 2);
  }
  return m;
}
const _bb = new THREE.Box3(), _v = new THREE.Vector3();

export function addCollider(x1, y1, z1, x2, y2, z2) {
  ctx.colliders.push({ min: new THREE.Vector3(x1, y1, z1), max: new THREE.Vector3(x2, y2, z2) });
}

export function hotspot(x, y, z, r, title, html, icon = 'info', opts = {}) {
  const h = { pos: new THREE.Vector3(x, y, z), r, title, html, icon, ringOnly: !!opts.ringOnly, onInspect: opts.onInspect, focusY: opts.focusY, focus: opts.focus };
  ctx.hotspots.push(h);
  return h;
}

export function std(color, opts = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.1, ...opts });
}

/** 发光材质：夜晚更亮 */
export function glow(color, day = 0.6, night = 2.2, opts = {}) {
  const mat = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: color, emissiveIntensity: night, roughness: 0.4, ...opts });
  ctx.nightMats.push({ mat, day, night });
  return mat;
}

export function registerNight(mat, day, night) {
  ctx.nightMats.push({ mat, day, night });
  mat.emissiveIntensity = night;
  return mat;
}

export function plane(parent, mat, w, h, x, y, z, ry = 0, rx = 0) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.position.set(x, y, z); m.rotation.set(rx, ry, 0, 'YXZ');
  parent.add(m);
  return m;
}

/** 低多边形树 */
const treeGeo = { trunk: new THREE.CylinderGeometry(0.15, 0.22, 2, 6), crown: new THREE.IcosahedronGeometry(1.4, 0) };
const treeMats = { trunk: std(0x6b4a33), crowns: [std(0x3f9b5b, { flatShading: true }), std(0x57b06a, { flatShading: true }), std(0x2f7d55, { flatShading: true }), std(0xf3a6c0, { flatShading: true })] };
// 树木：先记录，最后统一用 InstancedMesh 批量绘制（数百棵树 ≈ 6 次绘制）
const treeList = [];
export function tree(parent, x, z, s = 1, y = 0, collide = true) {
  const ci = Math.floor(Math.abs(Math.sin(x * 12.9 + z * 78.2)) * 4) % 4;
  treeList.push({ x, y, z, s, ci, rot: (x * 7.3 + z * 3.1) % (Math.PI * 2) });
  if (collide) addCollider(x - 0.3 * s, y, z - 0.3 * s, x + 0.3 * s, y + 4 * s, z + 0.3 * s);
}
export function flushTrees(scene) {
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), sc = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  const trunk = new THREE.InstancedMesh(treeGeo.trunk, treeMats.trunk, treeList.length);
  treeList.forEach((t, i) => { m4.compose(p.set(t.x, t.y + 1 * t.s, t.z), q.identity(), sc.setScalar(t.s)); trunk.setMatrixAt(i, m4); });
  trunk.castShadow = true; scene.add(trunk);
  for (let c = 0; c < 4; c++) {
    const list = treeList.filter(t => t.ci === c);
    if (!list.length) continue;
    const a = new THREE.InstancedMesh(treeGeo.crown, treeMats.crowns[c], list.length);
    const b = new THREE.InstancedMesh(treeGeo.crown, treeMats.crowns[c], list.length);
    list.forEach((t, i) => {
      q.setFromAxisAngle(up, t.rot);
      m4.compose(p.set(t.x, t.y + 2.6 * t.s, t.z), q, sc.setScalar(t.s)); a.setMatrixAt(i, m4);
      q.setFromAxisAngle(up, t.rot + 1);
      m4.compose(p.set(t.x, t.y + 3.6 * t.s, t.z), q, sc.setScalar(t.s * 0.7)); b.setMatrixAt(i, m4);
    });
    a.castShadow = b.castShadow = true; scene.add(a, b);
  }
  treeList.length = 0;
}

/** 盆栽 */
const potGeo = new THREE.CylinderGeometry(0.45, 0.35, 0.8, 12);
const potMat = std(0xf5f5f5, { roughness: 0.3 });
const leafGeo = new THREE.IcosahedronGeometry(0.75, 0);
const leafMat = std(0x4caf6a, { flatShading: true });
export function plant(parent, x, y, z) {
  const p = new THREE.Mesh(potGeo, potMat); p.position.set(x, y + 0.4, z); parent.add(p);
  const l = new THREE.Mesh(leafGeo, leafMat); l.position.set(x, y + 1.35, z); l.scale.set(1, 1.3, 1); parent.add(l);
  addCollider(x - 0.45, y, z - 0.45, x + 0.45, y + 1.8, z + 0.45);
}

/** 沙发 */
export function sofa(parent, x, y, z, ry = 0, color = 0xFB7299, len = 3) {
  const g = new THREE.Group();
  const m = std(color, { roughness: 0.85 });
  const seat = new THREE.Mesh(boxGeo(len, 0.45, 1), m); seat.position.y = 0.25; g.add(seat);
  const back = new THREE.Mesh(boxGeo(len, 0.8, 0.25), m); back.position.set(0, 0.7, -0.4); g.add(back);
  const a1 = new THREE.Mesh(boxGeo(0.25, 0.65, 1), m); a1.position.set(-len / 2 + 0.12, 0.45, 0); g.add(a1);
  const a2 = a1.clone(); a2.position.x = len / 2 - 0.12; g.add(a2);
  g.position.set(x, y, z); g.rotation.y = ry; parent.add(g);
  const hw = (Math.abs(Math.cos(ry)) > 0.5 ? len : 1) / 2, hd = (Math.abs(Math.cos(ry)) > 0.5 ? 1 : len) / 2;
  addCollider(x - hw, y, z - hd, x + hw, y + 1.1, z + hd);
  return g;
}
