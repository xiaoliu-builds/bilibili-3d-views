// 新场景共用工具
import * as THREE from 'three';
import { std, plane } from './common.js';
import { districtGroups } from './districts.js';
import { textTexture } from './textures.js';

export const ZONES = { kart: { x: -202, z: -202 }, arena: { x: 202, z: -202 }, market: { x: -202, z: 202 } };
export const TIER = +(document.documentElement.dataset.tier ?? 2);
export const Z = { D: null };   // 主程序依赖（initZones 注入）

export function label(root, text, x, y, z, ry = 0, size = 1.3, bg = 'rgba(16,20,30,0.88)', color = '#fff') {
  const t = textTexture(text, { size: 56, color, stroke: null, bg, pad: 20 });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size * t.aspect, size), new THREE.MeshBasicMaterial({ map: t.tex, transparent: true, side: THREE.DoubleSide, toneMapped: false }));
  m.position.set(x, y, z); m.rotation.y = ry; root.add(m); return m;
}
export const neon = (color, k = 1.6) => new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), toneMapped: false });
export function zone(scene, cx, cz, fn) {
  const g = new THREE.Group(); scene.add(g);
  fn(g, cx, cz);
  g.userData.center = new THREE.Vector3(cx, 0, cz); districtGroups.push(g);
  return g;
}
export function ground(root, cx, cz, w, d, color, map = null) {
  const m = plane(root, std(color, { roughness: 0.92, map }), w, d, cx, 0.022, cz, 0, -Math.PI / 2); m.receiveShadow = true; return m;
}
export function canvasTex(w, h, draw, repX = 1, repY = 1) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  if (repX !== 1 || repY !== 1) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repX, repY); }
  return t;
}
/** 实例化网格：items = [{x,y,z,ry,s,color}] */
export function instanced(root, geo, mat, items, { dynamic = false } = {}) {
  const im = new THREE.InstancedMesh(geo, mat, items.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3(), col = new THREE.Color();
  items.forEach((it, i) => {
    e.set(it.rx || 0, it.ry || 0, it.rz || 0); q.setFromEuler(e);
    sc.set(it.sx ?? it.s ?? 1, it.sy ?? it.s ?? 1, it.sz ?? it.s ?? 1);
    m4.compose(v.set(it.x, it.y || 0, it.z), q, sc); im.setMatrixAt(i, m4);
    if (it.color !== undefined) im.setColorAt(i, col.set(it.color));
  });
  im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
  im.frustumCulled = false; if (dynamic) im.userData.dynamic = true;
  root.add(im); return im;
}
/** 让实例随音乐上下跳动（GPU 计算，不占 CPU） */
export function bounceMat(mat, uni, key, sway = 0) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uT = uni.t; sh.uniforms.uAmp = uni.amp;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uT, uAmp;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
#ifdef USE_INSTANCING
  float ph = instanceMatrix[3].x * 0.37 + instanceMatrix[3].z * 0.61;
  transformed.y += abs(sin(uT * 4.2 + ph)) * uAmp;
  transformed.x += sin(uT * 3.0 + ph) * ${sway.toFixed(2)} * uAmp;
#endif`);
  };
  mat.customProgramCacheKey = () => 'bounce-' + key;
  return mat;
}
/** 简易人形（实例化用）：身体 + 头 */
export function personGeo() {
  const body = new THREE.CylinderGeometry(0.2, 0.24, 1.1, 6); body.translate(0, 0.55, 0);
  const head = new THREE.IcosahedronGeometry(0.17, 0); head.translate(0, 1.32, 0);
  const g = mergeGeos([body, head]); return g;
}
export function mergeGeos(list) {
  let pos = [], nor = [], idx = [], off = 0;
  for (let g of list) {
    g = g.index ? g.toNonIndexed() : g;
    const p = g.attributes.position.array, n = g.attributes.normal.array;
    pos.push(...p); nor.push(...n);
    for (let i = 0; i < p.length / 3; i++) idx.push(off + i);
    off += p.length / 3;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  return out;
}
/** 夜间更亮的实例化灯泡材质 */
export function nightBasic(ctx, color = 0xffffff, day = 0.55, night = 1.6) {
  const m = new THREE.MeshBasicMaterial({ color, toneMapped: false });
  const base = new THREE.Color(color);
  ctx.nightMats.push({ mat: { set emissiveIntensity(v) { m.color.copy(base).multiplyScalar(v); } }, day, night });
  m.color.copy(base).multiplyScalar(night);
  return m;
}
/** 过场骑乘：镜头跟随 fn(t) 返回 {pos, look}，dur 秒后结束 */
export function startRide(dur, fn, onEnd) {
  const D = Z.D, prev = D.player.pos.clone(), yaw = D.player.yaw;
  D.setMode('cutscene'); document.body.classList.add('cinematic-lite');
  let t = 0, done = false;
  const end = () => {
    if (done) return; done = true;
    D.ctx.cutscene = null; D.ctx.skipCutscene = null; document.body.classList.remove('cinematic-lite');
    D.player.pos.copy(prev); D.player.yaw = yaw; D.player.pitch = 0; D.player.eyeY = prev.y + D.player.eye;
    D.camera.rotation.order = 'YXZ'; D.camera.fov = D.baseFov(); D.camera.updateProjectionMatrix();
    D.setMode('walk'); D.resume(); onEnd && onEnd();
  };
  D.ctx.skipCutscene = end;
  D.ctx.cutscene = (dt) => {
    t += dt; const r = fn(t, dt);
    D.camera.position.copy(r.pos); D.camera.lookAt(r.look);
    if (r.fov && Math.abs(D.camera.fov - r.fov) > 0.05) { D.camera.fov += (r.fov - D.camera.fov) * Math.min(1, dt * 4); D.camera.updateProjectionMatrix(); }
    if (t >= dur) { end(); return false; }
    return false;
  };
}
export function pay(n, what) {
  const D = Z.D;
  if (D.coins() < n) { D.toast(`${what}需要 ${n} 枚硬币，去做任务或跑腿赚一点吧`, 'coin', '#ffb027'); return false; }
  D.setCoins(D.coins() - n); D.Sound.coin(); return true;
}
