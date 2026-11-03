// 静态合批：把一个分组里“不会动”的网格按材质合并成一个网格，大幅减少绘制调用
// - 外观相同（颜色/贴图/粗糙度…完全一致）的材质视为同一种，跨模块也能合并
// - 多材质网格（城市楼宇：侧面窗户 + 屋顶）按材质组拆分后再合并
import * as THREE from 'three';
import { mergeGeometries } from '../lib/addons/BufferGeometryUtils.js';
import { ctx } from './common.js';

function matKey(m) {
  return [m.type, m.color?.getHexString(), m.emissive?.getHexString(), m.emissiveIntensity, m.roughness, m.metalness, m.map?.uuid, m.emissiveMap?.uuid,
    m.side, m.flatShading, m.toneMapped, m.vertexColors, m.envMapIntensity, m.fog].join('|');
}
const canonical = new Map();
function canon(m, nights) {
  if (nights.has(m)) return m; // 参与昼夜切换的材质保留原实例
  const k = matKey(m);
  if (!canonical.has(k)) canonical.set(k, m);
  return canonical.get(k);
}

export function batchStatic(root) {
  root.updateMatrixWorld(true);
  const nights = new Set(ctx.nightMats.map(n => n.mat));
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const buckets = new Map();
  const isDyn = (o) => { for (let p = o; p && p !== root; p = p.parent) if (p.userData.dynamic) return true; return false; };
  const push = (mat, geo, o) => {
    const key = mat.uuid + '|' + Object.keys(geo.attributes).sort().join(',');
    if (!buckets.has(key)) buckets.set(key, { mat, geos: [], meshes: new Set(), cast: false, recv: false });
    const b = buckets.get(key);
    b.geos.push(geo); b.meshes.add(o); b.cast ||= o.castShadow; b.recv ||= o.receiveShadow;
  };
  const cands = [];
  root.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || isDyn(o)) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    if (mats.some(m => m.transparent)) return;
    // 动态画布贴图（弹幕巨幕、直播屏…）和带 renderOrder 的层叠面不合批，避免层级/排序错乱
    if (mats.some(m => m.map && m.map.isCanvasTexture && m.map.image && m.map.image.width >= 700 && m.map.image.height >= 300 && m.map.image.height <= 460)) return;
    if (o.renderOrder) return;
    cands.push(o);
  });
  for (const o of cands) {
    const m4 = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld);
    const base = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    base.applyMatrix4(m4);
    // 统一属性集合（position/normal/uv），避免 mergeGeometries 因属性不一致失败
    for (const n of Object.keys(base.attributes)) if (!['position', 'normal', 'uv'].includes(n)) base.deleteAttribute(n);
    if (!Array.isArray(o.material)) { push(canon(o.material, nights), base, o); continue; }
    const groups = o.geometry.groups.length ? o.geometry.groups : [{ start: 0, count: base.attributes.position.count, materialIndex: 0 }];
    for (const gr of groups) {
      const sub = new THREE.BufferGeometry();
      for (const [name, attr] of Object.entries(base.attributes)) {
        const isz = attr.itemSize;
        sub.setAttribute(name, new THREE.BufferAttribute(attr.array.slice(gr.start * isz, (gr.start + gr.count) * isz), isz, attr.normalized));
      }
      push(canon(o.material[gr.materialIndex], nights), sub, o);
    }
  }
  let removed = 0;
  for (const b of buckets.values()) {
    let merged = null;
    try { merged = b.geos.length === 1 ? b.geos[0] : mergeGeometries(b.geos, false); } catch (_) { merged = null; }
    if (!merged) { console.warn('[batch] merge failed', b.mat.type); continue; }
    const mm = new THREE.Mesh(merged, b.mat); mm.castShadow = b.cast; mm.receiveShadow = b.recv;
    mm.matrixAutoUpdate = false; root.add(mm);
  }
  for (const o of cands) { o.parent && o.parent.remove(o); removed++; }
  return removed;
}
