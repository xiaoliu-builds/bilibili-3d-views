// 光影升级：电影级调色 + 暗角 + 胶片颗粒、室内体积光束、接触阴影、窗外天光
import * as THREE from 'three';
import { ShaderPass } from '../lib/addons/postprocessing/ShaderPass.js';
import { ctx } from './common.js';
import { TOWER } from './tower.js';

// ---------- 调色后处理（在 Bloom 之后、Output 之前；线性空间）----------
export function gradePass() {
  const pass = new ShaderPass({
    uniforms: {
      tDiffuse: { value: null },
      uTime: { value: 0 },
      uVignette: { value: 0.32 },
      uWarm: { value: new THREE.Vector3(1.04, 1.0, 0.95) },   // 高光暖
      uCool: { value: new THREE.Vector3(0.94, 0.98, 1.06) },   // 暗部冷
      uSat: { value: 1.08 },
      uContrast: { value: 1.06 },
      uGrain: { value: 0.0 },
      uAspect: { value: 1 },
    },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `
      uniform sampler2D tDiffuse; uniform float uTime, uVignette, uSat, uContrast, uGrain, uAspect;
      uniform vec3 uWarm, uCool; varying vec2 vUv;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
      void main(){
        vec3 c = texture2D(tDiffuse, vUv).rgb;
        float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
        // 分离色调：暗部偏冷、亮部偏暖
        c *= mix(uCool, uWarm, smoothstep(0.05, 0.9, l));
        // 饱和度 + 对比（围绕 0.18 中灰）
        c = mix(vec3(l), c, uSat);
        c = (c - 0.18) * uContrast + 0.18;
        // 暗角（椭圆）
        vec2 d = (vUv - 0.5) * vec2(uAspect, 1.0);
        float v = smoothstep(0.95, 0.25, length(d) * 1.05);
        c *= mix(1.0 - uVignette, 1.0, v);
        // 胶片颗粒（随亮度减弱）
        c += (hash(vUv * 900.0 + uTime) - 0.5) * uGrain * (1.0 - l * 0.6);
        gl_FragColor = vec4(max(c, 0.0), 1.0);
      }`,
  });

  return pass;
}

// ---------- 体积光束：从南侧落地窗斜射入室内的光柱（加色混合）----------
let shaftTex = null;
function getShaftTex() {
  if (shaftTex) return shaftTex;
  const c = document.createElement('canvas'); c.width = 64; c.height = 256;
  const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 256);
  const hg = g.createLinearGradient(0, 0, 64, 0);
  hg.addColorStop(0, 'rgba(0,0,0,1)'); hg.addColorStop(0.25, 'rgba(0,0,0,0)'); hg.addColorStop(0.75, 'rgba(0,0,0,0)'); hg.addColorStop(1, 'rgba(0,0,0,1)');
  g.globalCompositeOperation = 'destination-out'; g.fillStyle = hg; g.fillRect(0, 0, 64, 256);
  shaftTex = new THREE.CanvasTexture(c); return shaftTex;
}
export const shaftMats = [];
/** 在某楼层南侧窗边生成一排倾斜光柱 */
export function lightShafts(root, y, h, { color = 0xfff0d6, count = 7, opacity = 0.12, tilt = 0.55 } = {}) {
  const mat = new THREE.MeshBasicMaterial({ map: getShaftTex(), color: new THREE.Color(color), transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false, fog: false });
  mat.userData.base = opacity; shaftMats.push(mat);
  const geo = new THREE.PlaneGeometry(2.6, h * 1.6);
  for (let i = 0; i < count; i++) {
    const x = -TOWER.W / 2 + 3 + i * ((TOWER.W - 6) / (count - 1));
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y + h * 0.48, TOWER.D / 2 - 2.6);
    m.rotation.set(-tilt, 0, 0); m.renderOrder = 4;
    root.add(m);
  }
}
/** 昼夜：白天光柱明显，夜晚几乎消失 */
export function setShaftDaylight(isNight) { for (const m of shaftMats) m.opacity = isNight ? m.userData.base * 0.18 : m.userData.base; }

// ---------- 接触阴影（脚下柔和暗斑）----------
let blobTex = null;
export function contactShadow(parent, x, y, z, sx = 1, sz = 1, strength = 0.5) {
  if (!blobTex) {
    const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
    const rg = g.createRadialGradient(64, 64, 0, 64, 64, 64); rg.addColorStop(0, 'rgba(0,0,0,1)'); rg.addColorStop(0.55, 'rgba(0,0,0,0.45)'); rg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = rg; g.fillRect(0, 0, 128, 128); blobTex = new THREE.CanvasTexture(c);
  }
  const m = new THREE.Mesh(new THREE.PlaneGeometry(sx, sz), new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, opacity: strength, depthWrite: false, color: 0x000000 }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, y + 0.015, z); m.renderOrder = 2;
  parent.add(m); return m;
}
