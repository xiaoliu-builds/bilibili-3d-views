// 程序化纹理：全部用 Canvas 绘制，无外部图片依赖
import * as THREE from 'three';

export const PINK = '#FB7299';
export const BLUE = '#00AEEC';
export const FONT = '"Noto Sans SC","PingFang SC","Microsoft YaHei","Helvetica Neue",Arial,sans-serif';

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}

function toTex(canvas, { repeat = [1, 1], srgb = true, aniso = 8 } = {}) {
  const t = new THREE.CanvasTexture(canvas);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = aniso;
  return t;
}

function rand(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

// ---------- 城市楼宇窗户（map + emissiveMap） ----------
export function buildingTextures(seed = 1, cols = 8, rows = 16, tint = [30, 40, 60]) {
  const R = rand(seed);
  const W = 256, H = 512;
  const [c, g] = makeCanvas(W, H);
  const [e, ge] = makeCanvas(W, H);
  g.fillStyle = `rgb(${tint[0]},${tint[1]},${tint[2]})`; g.fillRect(0, 0, W, H);
  ge.fillStyle = '#000'; ge.fillRect(0, 0, W, H);
  const cw = W / cols, rh = H / rows;
  const warm = ['#ffd9a0', '#ffe8c2', '#fff3d6', '#bfe3ff', '#ffc6d9'];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const px = x * cw + cw * 0.18, py = y * rh + rh * 0.2, pw = cw * 0.64, ph = rh * 0.6;
      g.fillStyle = 'rgba(120,150,190,0.35)'; g.fillRect(px, py, pw, ph);
      if (R() < 0.38) {
        const col = warm[Math.floor(R() * warm.length)];
        ge.fillStyle = col; ge.globalAlpha = 0.45 + R() * 0.55; ge.fillRect(px, py, pw, ph);
        g.fillStyle = col; g.globalAlpha = 0.6; g.fillRect(px, py, pw, ph); g.globalAlpha = 1;
      }
    }
  }
  ge.globalAlpha = 1;
  return { map: toTex(c), emissiveMap: toTex(e) };
}

// ---------- B站大楼幕墙 ----------
export function facadeTextures(cols, floors, seed = 7) {
  const R = rand(seed);
  const W = 1024, H = 2048;
  const [c, g] = makeCanvas(W, H);
  const [e, ge] = makeCanvas(W, H);
  const grad = g.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, '#1b3350'); grad.addColorStop(0.5, '#24476b'); grad.addColorStop(1, '#162a44');
  g.fillStyle = grad; g.fillRect(0, 0, W, H);
  ge.fillStyle = '#000'; ge.fillRect(0, 0, W, H);
  const cw = W / cols, rh = H / floors;
  for (let f = 0; f < floors; f++) {
    // 每层一个“亮灯概率”，让整层有的亮有的暗，更像真实写字楼
    const p = 0.25 + R() * 0.55;
    for (let x = 0; x < cols; x++) {
      const px = x * cw + 2, py = f * rh + rh * 0.16, pw = cw - 4, ph = rh * 0.74;
      const sky = g.createLinearGradient(px, py, px + pw, py + ph);
      sky.addColorStop(0, 'rgba(140,190,235,0.55)'); sky.addColorStop(1, 'rgba(60,100,150,0.35)');
      g.fillStyle = sky; g.fillRect(px, py, pw, ph);
      if (R() < p) {
        const r = R();
        const col = r < 0.08 ? PINK : r < 0.16 ? '#7fd8ff' : r < 0.6 ? '#fff1d8' : '#ffe2b0';
        ge.globalAlpha = 0.5 + R() * 0.5; ge.fillStyle = col; ge.fillRect(px, py, pw, ph);
      }
    }
    // 楼层横向分隔线
    g.fillStyle = '#c9d6e6'; g.fillRect(0, f * rh, W, rh * 0.1);
    ge.globalAlpha = 1; ge.fillStyle = '#000'; ge.fillRect(0, f * rh, W, rh * 0.12);
  }
  // 竖向铝合金线条
  g.fillStyle = 'rgba(220,230,240,0.85)';
  for (let x = 0; x <= cols; x++) g.fillRect(x * cw - 2, 0, 4, H);
  ge.fillStyle = '#000';
  for (let x = 0; x <= cols; x++) ge.fillRect(x * cw - 2, 0, 4, H);
  return { map: toTex(c), emissiveMap: toTex(e) };
}

// ---------- 小电视图标绘制 ----------
export function drawTV(g, cx, cy, size, color = BLUE, lw = null) {
  const w = size, h = size * 0.78, r = size * 0.16;
  lw = lw || size * 0.085;
  g.save();
  g.strokeStyle = color; g.fillStyle = color; g.lineWidth = lw; g.lineCap = 'round'; g.lineJoin = 'round';
  // 天线
  g.beginPath();
  g.moveTo(cx - w * 0.28, cy - h * 0.5 - size * 0.24); g.lineTo(cx - w * 0.12, cy - h * 0.5);
  g.moveTo(cx + w * 0.28, cy - h * 0.5 - size * 0.24); g.lineTo(cx + w * 0.12, cy - h * 0.5);
  g.stroke();
  // 机身
  roundRect(g, cx - w / 2, cy - h / 2, w, h, r); g.stroke();
  // 眼睛
  g.beginPath();
  g.moveTo(cx - w * 0.3, cy - h * 0.12); g.lineTo(cx - w * 0.12, cy - h * 0.2);
  g.moveTo(cx + w * 0.3, cy - h * 0.12); g.lineTo(cx + w * 0.12, cy - h * 0.2);
  g.stroke();
  // 嘴巴 ω
  g.lineWidth = lw * 0.75;
  g.beginPath();
  g.moveTo(cx - w * 0.14, cy + h * 0.1);
  g.quadraticCurveTo(cx - w * 0.07, cy + h * 0.24, cx, cy + h * 0.1);
  g.quadraticCurveTo(cx + w * 0.07, cy + h * 0.24, cx + w * 0.14, cy + h * 0.1);
  g.stroke();
  g.restore();
}

export function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r);
  g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  g.lineTo(x + r, y + h); g.quadraticCurveTo(x, y + h, x, y + h - r);
  g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y); g.closePath();
}

// ---------- 霓虹 Logo（透明底） ----------
export function logoTexture({ text = 'bilibili', color = '#ffffff', glow = PINK, tv = true, w = 1024, h = 256, bg = null, sub = null } = {}) {
  const [c, g] = makeCanvas(w, h);
  if (bg) { g.fillStyle = bg; g.fillRect(0, 0, w, h); }
  const tvSize = h * 0.62;
  g.shadowColor = glow; g.shadowBlur = h * 0.08;
  let x0 = w * 0.06;
  if (tv) { drawTV(g, x0 + tvSize * 0.55, h * 0.56, tvSize, color, tvSize * 0.09); x0 += tvSize * 1.25; }
  g.fillStyle = color;
  g.font = `italic 900 ${Math.floor(h * (sub ? 0.5 : 0.62))}px "Arial Black",${FONT}`;
  g.textBaseline = 'middle';
  g.fillText(text, x0, h * (sub ? 0.42 : 0.55));
  if (sub) {
    g.font = `600 ${Math.floor(h * 0.17)}px ${FONT}`;
    g.globalAlpha = 0.85;
    g.fillText(sub, x0 + 6, h * 0.8);
  }
  return toTex(c, { repeat: [1, 1] });
}

// ---------- 文字贴图（弹幕、标牌） ----------
export function textTexture(text, { size = 64, color = '#fff', stroke = 'rgba(0,0,0,0.6)', bg = null, pad = 16, font = FONT, weight = 800 } = {}) {
  const [m, mg] = makeCanvas(8, 8);
  mg.font = `${weight} ${size}px ${font}`;
  const tw = Math.ceil(mg.measureText(text).width);
  const [c, g] = makeCanvas(tw + pad * 2, size + pad * 2);
  if (bg) { g.fillStyle = bg; roundRect(g, 0, 0, c.width, c.height, size * 0.3); g.fill(); }
  g.font = `${weight} ${size}px ${font}`; g.textBaseline = 'middle';
  g.lineJoin = 'round';
  if (stroke) { g.lineWidth = size * 0.12; g.strokeStyle = stroke; g.strokeText(text, pad, c.height / 2); }
  g.fillStyle = color; g.fillText(text, pad, c.height / 2);
  const t = toTex(c);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return { tex: t, aspect: c.width / c.height };
}

// ---------- 地面材质 ----------
export function groundTexture() {
  const S = 1024;
  const [c, g] = makeCanvas(S, S);
  g.fillStyle = '#2a2e36'; g.fillRect(0, 0, S, S);
  const R = rand(3);
  for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(255,255,255,${R() * 0.035})`; g.fillRect(R() * S, R() * S, 2, 2); }
  // 道路位于贴图中线（世界坐标 ±100, ±300 …）
  const road = 72, mid = S / 2;
  g.fillStyle = '#1b1d22';
  g.fillRect(mid - road / 2, 0, road, S); g.fillRect(0, mid - road / 2, S, road);
  g.strokeStyle = 'rgba(255,214,120,0.75)'; g.lineWidth = 3; g.setLineDash([26, 22]);
  g.beginPath(); g.moveTo(mid, 0); g.lineTo(mid, S); g.moveTo(0, mid); g.lineTo(S, mid); g.stroke();
  g.setLineDash([]); g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 2;
  [[mid - road / 2 + 4], [mid + road / 2 - 4]].forEach(([p]) => {
    g.beginPath(); g.moveTo(p, 0); g.lineTo(p, S); g.moveTo(0, p); g.lineTo(S, p); g.stroke();
  });
  // 人行横道
  g.fillStyle = 'rgba(255,255,255,0.55)';
  for (let i = 0; i < 8; i++) {
    g.fillRect(mid - road / 2 + 4 + i * 8.5, mid - road / 2 - 26, 5, 22);
    g.fillRect(mid - road / 2 - 26, mid - road / 2 + 4 + i * 8.5, 22, 5);
  }
  return toTex(c);
}

export function tileTexture({ base = '#cfd4dc', line = '#aab1bc', n = 8, noise = 0.04, accent = null, seed = 5 } = {}) {
  const S = 512, R = rand(seed);
  const [c, g] = makeCanvas(S, S);
  g.fillStyle = base; g.fillRect(0, 0, S, S);
  const step = S / n;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    g.fillStyle = `rgba(${R() < 0.5 ? '0,0,0' : '255,255,255'},${R() * noise})`;
    g.fillRect(x * step, y * step, step, step);
  }
  g.strokeStyle = line; g.lineWidth = 2;
  for (let i = 0; i <= n; i++) {
    g.beginPath(); g.moveTo(i * step, 0); g.lineTo(i * step, S); g.stroke();
    g.beginPath(); g.moveTo(0, i * step); g.lineTo(S, i * step); g.stroke();
  }
  if (accent) { g.strokeStyle = accent; g.lineWidth = 3; g.strokeRect(1.5, 1.5, S - 3, S - 3); }
  return toTex(c);
}

export function woodTexture() {
  const S = 512, R = rand(11);
  const [c, g] = makeCanvas(S, S);
  const planks = 8, ph = S / planks;
  for (let i = 0; i < planks; i++) {
    const l = 38 + R() * 14;
    g.fillStyle = `hsl(28,38%,${l}%)`; g.fillRect(0, i * ph, S, ph);
    for (let k = 0; k < 40; k++) {
      g.strokeStyle = `rgba(60,30,10,${R() * 0.15})`; g.lineWidth = 1;
      const y = i * ph + R() * ph; g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(S * 0.3, y + 3, S * 0.6, y - 3, S, y); g.stroke();
    }
    g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(0, i * ph, S, 2);
    g.fillRect(((i * 197) % S), i * ph, 2, ph);
  }
  return toTex(c);
}

export function carpetTexture() {
  const S = 256, R = rand(21);
  const [c, g] = makeCanvas(S, S);
  g.fillStyle = '#3b4250'; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 6000; i++) { g.fillStyle = `rgba(${R() < 0.5 ? 0 : 255},${R() < 0.5 ? 0 : 255},255,${R() * 0.06})`; g.fillRect(R() * S, R() * S, 2, 2); }
  return toTex(c);
}

export function lobbyFloorTexture() {
  const S = 1024, R = rand(31);
  const [c, g] = makeCanvas(S, S);
  g.fillStyle = '#e9ecf1'; g.fillRect(0, 0, S, S);
  // 大理石纹理
  for (let k = 0; k < 60; k++) {
    g.strokeStyle = `rgba(150,160,175,${0.05 + R() * 0.12})`; g.lineWidth = 1 + R() * 2;
    g.beginPath(); let x = R() * S, y = R() * S; g.moveTo(x, y);
    for (let j = 0; j < 6; j++) { x += (R() - 0.3) * 160; y += (R() - 0.5) * 120; g.lineTo(x, y); }
    g.stroke();
  }
  g.strokeStyle = 'rgba(160,168,180,0.7)'; g.lineWidth = 3;
  for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * S / 4, 0); g.lineTo(i * S / 4, S); g.stroke(); g.beginPath(); g.moveTo(0, i * S / 4); g.lineTo(S, i * S / 4); g.stroke(); }
  return toTex(c);
}

// ---------- 显示器屏幕 ----------
export function screenTexture(kind, seed = 1) {
  const W = 512, H = 300, R = rand(seed);
  const [c, g] = makeCanvas(W, H);
  if (kind === 'home') { // B站首页
    g.fillStyle = '#f6f7f9'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#fff'; g.fillRect(0, 0, W, 44);
    drawTV(g, 30, 24, 26, PINK, 3);
    g.fillStyle = PINK; g.font = `italic 900 22px Arial`; g.fillText('bilibili', 52, 31);
    g.fillStyle = '#eef0f3'; roundRect(g, 180, 11, 200, 22, 11); g.fill();
    for (let i = 0; i < 8; i++) {
      const x = 14 + (i % 4) * 124, y = 58 + Math.floor(i / 4) * 118;
      g.fillStyle = `hsl(${R() * 360},65%,62%)`; roundRect(g, x, y, 112, 70, 6); g.fill();
      g.fillStyle = '#18191c'; g.fillRect(x, y + 78, 100, 8);
      g.fillStyle = '#9499a0'; g.fillRect(x, y + 92, 60, 6);
    }
  } else if (kind === 'edit') { // 剪辑时间轴
    g.fillStyle = '#1e1f24'; g.fillRect(0, 0, W, H);
    const v = g.createLinearGradient(0, 0, 300, 160); v.addColorStop(0, PINK); v.addColorStop(1, BLUE);
    g.fillStyle = v; g.fillRect(100, 14, 312, 150);
    g.fillStyle = '#2b2d33'; g.fillRect(0, 178, W, H - 178);
    const cols = [PINK, BLUE, '#ffb347', '#8bd17c'];
    for (let t = 0; t < 4; t++) for (let k = 0; k < 6; k++) {
      g.fillStyle = cols[t]; g.globalAlpha = 0.8;
      g.fillRect(10 + k * 84 + R() * 10, 188 + t * 26, 40 + R() * 36, 18);
    }
    g.globalAlpha = 1; g.fillStyle = '#ff4d4f'; g.fillRect(260, 178, 2, H - 178);
  } else if (kind === 'code') {
    g.fillStyle = '#0f1420'; g.fillRect(0, 0, W, H);
    const cs = ['#ff79c6', '#8be9fd', '#50fa7b', '#f1fa8c', '#bd93f9', '#e6e6e6'];
    for (let l = 0; l < 17; l++) {
      let x = 14 + (l % 5 ? 20 : 0) * (R() < 0.5 ? 1 : 2);
      for (let k = 0; k < 4; k++) { const w = 20 + R() * 70; g.fillStyle = cs[Math.floor(R() * cs.length)]; g.fillRect(x, 12 + l * 16.5, w, 8); x += w + 10; if (x > W - 40) break; }
    }
  } else { // 弹幕视频
    const v = g.createLinearGradient(0, 0, W, H); v.addColorStop(0, '#2d1b4e'); v.addColorStop(1, '#0d4a6b');
    g.fillStyle = v; g.fillRect(0, 0, W, H);
    drawTV(g, W / 2, H / 2, 110, 'rgba(255,255,255,0.85)', 9);
    const words = ['233333', '前方高能', 'awsl', '干杯!', '下次一定', '好耶'];
    g.font = `800 20px ${FONT}`;
    for (let i = 0; i < 9; i++) { g.fillStyle = ['#fff', PINK, '#7fd8ff', '#ffe17a'][i % 4]; g.fillText(words[i % words.length], R() * (W - 80), 30 + R() * (H - 40)); }
    g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(0, H - 22, W, 22);
    g.fillStyle = PINK; g.fillRect(0, H - 22, W * 0.4, 4);
  }
  return toTex(c);
}

// ---------- 动态弹幕大屏 ----------
export class DanmakuScreen {
  constructor(w = 1024, h = 384) {
    [this.canvas, this.g] = makeCanvas(w, h);
    this.w = w; this.h = h; this.t = 0;
    this.g.lineJoin = 'round';
    this.tex = toTex(this.canvas);
    this.tex.wrapS = this.tex.wrapT = THREE.ClampToEdgeWrapping;
    this.words = ['前方高能预警!!!', '2333333333', 'awsl', '干杯 ( ゜- ゜)つロ', '爷青回', '下次一定', '已三连', '泪目了家人们',
      '好耶!', '这就是B站总部吗', '打卡打卡', 'BML 我来了', '名场面', 'UP主辛苦了', '妙啊', '哔哩哔哩 干杯~', '弹幕护体', '前排围观', '欢迎回家', '火钳刘明'];
    this.colors = ['#ffffff', '#ffffff', '#ffffff', PINK, '#7fd8ff', '#ffe17a', '#b5ff8a'];
    this.items = [];
    // 环境弹幕已移除（性能），仅显示玩家主动发送的弹幕
    this.acc = 0;
  }
  spawn(x = null) {
    const size = 26 + Math.floor(Math.random() * 3) * 6;
    this.items.push({
      text: this.words[Math.floor(Math.random() * this.words.length)],
      x: x ?? this.w + Math.random() * 200,
      y: 30 + Math.floor(Math.random() * 10) * ((this.h - 70) / 10),
      v: 90 + Math.random() * 90, size,
      color: this.colors[Math.floor(Math.random() * this.colors.length)],
    });
  }
  // 玩家发送的弹幕：带边框高亮，立即从右侧进入
  add(text, color = '#ffffff') {
    this.items.push({ text, x: this.w + 10, y: 30 + Math.floor(Math.random() * 10) * ((this.h - 70) / 10), v: 120, size: 34, color, mine: true });
  }
  update(dt) {
    this.t += dt; this.acc += dt;
    if (this.acc < 1 / 12) return; // 12fps 刷新（省 GPU 上传）
    const step = this.acc; this.acc = 0;
    const { g, w, h, t } = this;
    // 动态“视频画面”
    const grd = g.createLinearGradient(0, 0, w, h);
    const a = (Math.sin(t * 0.4) + 1) / 2;
    grd.addColorStop(0, `hsl(${330 + a * 20},80%,${28 + a * 10}%)`);
    grd.addColorStop(1, `hsl(${195 + a * 15},85%,${22 + (1 - a) * 12}%)`);
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 3; i++) {
      const cx = (Math.sin(t * 0.3 + i * 1.7) * 0.5 + 0.5) * w, cy = (Math.cos(t * 0.23 + i * 2.1) * 0.5 + 0.5) * h;
      const rg = g.createRadialGradient(cx, cy, 0, cx, cy, 180);
      rg.addColorStop(0, i % 2 ? 'rgba(251,114,153,0.35)' : 'rgba(0,174,236,0.35)'); rg.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = rg; g.fillRect(0, 0, w, h);
    }
    const s = 1 + Math.sin(t * 2) * 0.04;
    drawTV(g, w / 2, h / 2 + 10, 150 * s, 'rgba(255,255,255,0.92)', 12);
    g.font = `italic 900 46px "Arial Black",Arial`; g.fillStyle = 'rgba(255,255,255,0.95)'; g.textAlign = 'center';
    g.fillText('bilibili', w / 2, h - 34); g.textAlign = 'left';
    // 弹幕
    for (const it of this.items) {
      it.x -= it.v * step;
      g.font = `800 ${it.size}px ${FONT}`;
      g.lineWidth = 4; g.strokeStyle = 'rgba(0,0,0,0.55)'; g.strokeText(it.text, it.x, it.y);
      g.fillStyle = it.color; g.fillText(it.text, it.x, it.y);
      if (it.mine) { const w = g.measureText(it.text).width; g.lineWidth = 3; g.strokeStyle = '#ffe17a'; g.strokeRect(it.x - 8, it.y - it.size * 0.9, w + 16, it.size * 1.2); }
    }
    this.items = this.items.filter(it => it.x > -400);
        // 进度条
    g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(0, h - 8, w, 8);
    g.fillStyle = PINK; g.fillRect(0, h - 8, w * ((t * 0.02) % 1), 8);
    this.tex.needsUpdate = true;
  }
}

export function panelTexture(title, lines, { accent = PINK, w = 512, h = 700 } = {}) {
  const [c, g] = makeCanvas(w, h);
  const bg = g.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, '#ffffff'); bg.addColorStop(1, '#f3f5f9');
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  g.fillStyle = accent; g.fillRect(0, 0, w, 14);
  drawTV(g, 70, 90, 70, accent, 7);
  g.fillStyle = '#18191c'; g.font = `900 44px ${FONT}`; g.fillText(title, 126, 106);
  g.font = `500 26px ${FONT}`;
  let y = 190;
  for (const ln of lines) {
    if (ln.startsWith('#')) { g.fillStyle = accent; g.font = `900 34px ${FONT}`; g.fillText(ln.slice(1), 40, y); g.font = `500 26px ${FONT}`; y += 48; continue; }
    g.fillStyle = '#4a4f57'; g.fillText(ln, 40, y); y += 40;
  }
  g.fillStyle = '#e3e5e7'; g.fillRect(40, h - 70, w - 80, 2);
  g.fillStyle = '#9499a0'; g.font = `500 22px ${FONT}`; g.fillText('靠近按 E 查看详情', 40, h - 32);
  const t = toTex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
}

// ================= v4：真实玻璃幕墙 =================
// 白天以青蓝玻璃反射为主，夜晚少量暖光内透
export function facadeGlass(cols = 22, floors = 30, seed = 7) {
  const R = rand(seed);
  const W = 1024, H = 2048;
  const [c, g] = makeCanvas(W, H);
  const [e, ge] = makeCanvas(W, H);
  ge.fillStyle = '#000'; ge.fillRect(0, 0, W, H);
  // 玻璃底色：上深下浅的青蓝渐变
  const bg = g.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#16324a'); bg.addColorStop(0.55, '#1d425f'); bg.addColorStop(1, '#275573');
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  // 大尺度天空/云反射带（斜向柔光）
  for (let i = 0; i < 5; i++) {
    const x = R() * W, w = 120 + R() * 260;
    const rg = g.createLinearGradient(x - w, 0, x + w, 0);
    rg.addColorStop(0, 'rgba(255,255,255,0)'); rg.addColorStop(0.5, `rgba(200,228,245,${0.05 + R() * 0.06})`); rg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = rg; g.save(); g.translate(W / 2, H / 2); g.rotate(-0.18); g.fillRect(-H, -W, H * 2, W * 2); g.restore();
  }
  const cw = W / cols, rh = H / floors;
  // 单元玻璃色差
  for (let f = 0; f < floors; f++) for (let x = 0; x < cols; x++) {
    const v = R();
    if (v < 0.12) { g.fillStyle = `rgba(180,215,238,${0.05 + R() * 0.08})`; g.fillRect(x * cw + 1, f * rh + 1, cw - 2, rh - 2); }
    else if (v > 0.9) { g.fillStyle = `rgba(4,16,28,${0.10 + R() * 0.12})`; g.fillRect(x * cw + 1, f * rh + 1, cw - 2, rh - 2); }
    // 夜晚内透：少量亮窗（暖光为主，少量品牌色）
    if (R() < 0.14) {
      const col = R() < 0.78 ? `rgba(255,${214 + (R() * 30) | 0},${150 + (R() * 60) | 0},` : R() < 0.5 ? 'rgba(255,150,185,' : 'rgba(150,220,255,';
      ge.fillStyle = col + (0.55 + R() * 0.45) + ')';
      ge.fillRect(x * cw + cw * 0.14, f * rh + rh * 0.18, cw * 0.72, rh * 0.6);
    }
  }
  // 楼板横线（深色）+ 竖框
  g.fillStyle = 'rgba(6,16,26,0.55)';
  for (let f = 0; f <= floors; f++) g.fillRect(0, f * rh, W, 2);
  g.fillStyle = 'rgba(190,220,238,0.16)';
  for (let x = 0; x <= cols; x++) g.fillRect(x * cw, 0, 1.5, H);
  // 加强竖向主肋（每 4 格）
  g.fillStyle = 'rgba(210,232,246,0.28)';
  for (let x = 0; x <= cols; x += 4) g.fillRect(x * cw - 1, 0, 3, H);
  return { map: toTex(c), emissiveMap: toTex(e) };
}

// 蓝色立体 bilibili 字（透明底）
export function logo3DTexture({ w = 1024, h = 320 } = {}) {
  const [c, g] = makeCanvas(w, h);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `italic 900 ${h * 0.62}px "Arial Black",${FONT}`;
  // 厚度阴影：多层偏移深色，模拟挤出
  for (let i = 10; i >= 1; i--) {
    g.fillStyle = `rgba(0,74,110,${0.16})`;
    g.fillText('bilibili', w / 2 - i * 1.4, h / 2 - i * 1.2 + h * 0.02);
  }
  const grd = g.createLinearGradient(0, h * 0.15, 0, h * 0.85);
  grd.addColorStop(0, '#3fc7f5'); grd.addColorStop(0.55, '#00AEEC'); grd.addColorStop(1, '#0a86bb');
  g.shadowColor = 'rgba(0,120,180,0.55)'; g.shadowBlur = h * 0.06;
  g.fillStyle = grd; g.fillText('bilibili', w / 2, h * 0.52);
  g.shadowBlur = 0;
  g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillText('bilibili', w / 2 - 2, h * 0.50 - h * 0.05);
  const t = toTex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

// 候车亭圆形站牌：蓝环 + 小电视 + 12 + BILIBILI
export function stopSignTexture() {
  const S = 512;
  const [c, g] = makeCanvas(S, S);
  g.clearRect(0, 0, S, S);
  g.fillStyle = '#ffffff'; g.beginPath(); g.arc(256, 256, 244, 0, Math.PI * 2); g.fill();
  g.strokeStyle = BLUE; g.lineWidth = 34; g.beginPath(); g.arc(256, 256, 226, 0, Math.PI * 2); g.stroke();
  drawTV(g, 256, 132, 120, BLUE, 13);
  g.fillStyle = BLUE; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `900 120px "Arial Black",Arial`; g.fillText('12', 256, 300);
  g.font = `900 46px ${FONT}`; g.fillText('B I L I B I L I', 256, 392);
  g.font = `700 34px ${FONT}`; g.fillText('周年纪念站', 256, 440);
  const t = toTex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

// 小电视的脸：白色面板 + 黑框 + 眯眼 + ω 嘴（工作中的小电视）
export function tvFaceTexture({ closed = true, color = '#15171c' } = {}) {
  const W = 512, H = 400;
  const [c, g] = makeCanvas(W, H);
  g.fillStyle = '#f2f2f2'; roundRect(g, 0, 0, W, H, 70); g.fill();
  g.strokeStyle = color; g.lineWidth = 30; roundRect(g, 26, 26, W - 52, H - 52, 52); g.stroke();
  g.strokeStyle = color; g.fillStyle = color; g.lineCap = 'round'; g.lineJoin = 'round';
  // 眯眼（两条短斜杠）
  g.lineWidth = 34;
  g.beginPath(); g.moveTo(148, 158); g.lineTo(208, 178); g.stroke();
  g.beginPath(); g.moveTo(364, 158); g.lineTo(304, 178); g.stroke();
  // ω 嘴
  g.lineWidth = 26;
  g.beginPath();
  g.moveTo(200, 250); g.quadraticCurveTo(226, 296, 256, 252); g.quadraticCurveTo(286, 296, 312, 250);
  g.stroke();
  const t = toTex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

// 裙楼广告牌 / 商铺橱窗
export function adTexture(i = 0) {
  const W = 768, H = 512;
  const [c, g] = makeCanvas(W, H);
  const themes = [
    { bg: ['#1a1030', '#3a1b4a'], main: PINK, title: 'bilibili 游戏', sub: '一起游戏，一起快乐' },
    { bg: ['#062a44', '#0a4a70'], main: '#7fd8ff', title: 'BML 2024', sub: 'Bilibili Macro Link' },
    { bg: ['#2a0e1e', '#5a1b3a'], main: '#ffd166', title: '拜年纪', sub: '除夕夜 · 弹幕相会' },
  ];
  const t = themes[i % themes.length];
  const grd = g.createLinearGradient(0, 0, W, H); grd.addColorStop(0, t.bg[0]); grd.addColorStop(1, t.bg[1]);
  g.fillStyle = grd; g.fillRect(0, 0, W, H);
  for (let k = 0; k < 12; k++) { g.fillStyle = `rgba(255,255,255,${0.03 + Math.random() * 0.05})`; g.beginPath(); g.arc(Math.random() * W, Math.random() * H, 30 + Math.random() * 90, 0, Math.PI * 2); g.fill(); }
  drawTV(g, W / 2, 150, 150, t.main, 15);
  g.textAlign = 'center'; g.fillStyle = '#fff';
  g.font = `900 72px ${FONT}`; g.fillText(t.title, W / 2, 320);
  g.font = `500 34px ${FONT}`; g.fillStyle = 'rgba(255,255,255,0.8)'; g.fillText(t.sub, W / 2, 380);
  g.fillStyle = t.main; g.fillRect(W / 2 - 90, 420, 180, 8);
  return toTex(c);
}
export function shopTexture(i = 0) {
  const W = 512, H = 200;
  const [c, g] = makeCanvas(W, H);
  const grd = g.createLinearGradient(0, 0, 0, H); grd.addColorStop(0, '#0e1420'); grd.addColorStop(1, '#2a3342');
  g.fillStyle = grd; g.fillRect(0, 0, W, H);
  // 暖色橱窗光
  for (let k = 0; k < 3; k++) {
    const x = 60 + k * 160;
    const rg = g.createRadialGradient(x, H, 10, x, H, 110);
    rg.addColorStop(0, 'rgba(255,214,150,0.85)'); rg.addColorStop(1, 'rgba(255,214,150,0)');
    g.fillStyle = rg; g.fillRect(x - 110, H - 120, 220, 120);
  }
  g.strokeStyle = 'rgba(180,210,230,0.5)'; g.lineWidth = 6; g.strokeRect(4, 4, W - 8, H - 8);
  g.textAlign = 'center'; g.fillStyle = '#fff'; g.font = `900 52px ${FONT}`;
  g.fillText(['bilibili Goods', '干杯 Cafe', '会员购'][i % 3], W / 2, 78);
  return toTex(c);
}

// 临街店面：深色玻璃橱窗 + 暖光 + 店招
export function storefrontTexture(i = 0) {
  const W = 1024, H = 128;
  const [c, g] = makeCanvas(W, H);
  const names = [['便利店 24H', '奶茶', '书店', '花店'], ['火锅', '拉面', '咖啡', '药房'], ['手办屋', '电玩城', '面包房', '眼镜'], ['银行', '健身房', '理发', '水果']][i % 4];
  g.fillStyle = '#141a24'; g.fillRect(0, 0, W, H);
  const cw = W / 4;
  names.forEach((n, k) => {
    const x = k * cw;
    const rg = g.createLinearGradient(0, 30, 0, H);
    rg.addColorStop(0, 'rgba(255,222,170,0.15)'); rg.addColorStop(1, 'rgba(255,214,150,0.75)');
    g.fillStyle = rg; g.fillRect(x + 10, 38, cw - 20, H - 44);
    g.fillStyle = ['#FB7299', '#00AEEC', '#ffb027', '#7fd8a0'][(k + i) % 4]; g.fillRect(x + 10, 6, cw - 20, 28);
    g.fillStyle = '#fff'; g.font = `800 22px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(n, x + cw / 2, 21);
    g.fillStyle = 'rgba(20,26,36,0.6)'; for (let m = 1; m < 4; m++) g.fillRect(x + 10 + m * (cw - 20) / 4, 38, 2, H - 44);
  });
  const t = toTex(c); return t;
}

// ================= v6：大堂质感 & 楼层导视 =================
// 大理石：暖白底 + 灰色纹理 + 1.2m 分缝
export function marbleTexture({ base = '#efece6', vein = 'rgba(120,124,132,', dark = false, seed = 41, tiles = 2 } = {}) {
  const S = 1024, R = rand(seed);
  const [c, g] = makeCanvas(S, S);
  g.fillStyle = base; g.fillRect(0, 0, S, S);
  // 云雾底纹
  for (let i = 0; i < 26; i++) {
    const x = R() * S, y = R() * S, r = 120 + R() * 260;
    const rg = g.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, dark ? 'rgba(255,255,255,0.05)' : 'rgba(180,176,170,0.10)'); rg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = rg; g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // 主纹理（连续折线 + 细分支）
  for (let k = 0; k < 18; k++) {
    let x = R() * S, y = R() * S; const ang = R() * Math.PI;
    g.strokeStyle = vein + (0.08 + R() * 0.22) + ')'; g.lineWidth = 0.6 + R() * 2.4;
    g.beginPath(); g.moveTo(x, y);
    for (let j = 0; j < 14; j++) { x += Math.cos(ang) * 60 + (R() - 0.5) * 70; y += Math.sin(ang) * 60 + (R() - 0.5) * 70; g.lineTo(x, y); }
    g.stroke();
  }
  // 分缝
  g.strokeStyle = dark ? 'rgba(0,0,0,0.6)' : 'rgba(150,146,140,0.55)'; g.lineWidth = 2;
  for (let i = 0; i <= tiles; i++) { const p = i * S / tiles; g.beginPath(); g.moveTo(p, 0); g.lineTo(p, S); g.stroke(); g.beginPath(); g.moveTo(0, p); g.lineTo(S, p); g.stroke(); }
  return toTex(c, { aniso: 16 });
}

// 竖向木格栅
export function woodSlatTexture({ dark = '#2b1d14', light = '#8a5a36', slats = 16 } = {}) {
  const W = 512, H = 512, R = rand(77);
  const [c, g] = makeCanvas(W, H);
  g.fillStyle = dark; g.fillRect(0, 0, W, H);
  const sw = W / slats;
  for (let i = 0; i < slats; i++) {
    const x = i * sw + sw * 0.18, w = sw * 0.64;
    const gr = g.createLinearGradient(x, 0, x + w, 0);
    const l = 0.85 + R() * 0.3;
    gr.addColorStop(0, shade(light, 0.75 * l)); gr.addColorStop(0.5, shade(light, 1.05 * l)); gr.addColorStop(1, shade(light, 0.7 * l));
    g.fillStyle = gr; g.fillRect(x, 0, w, H);
    for (let k = 0; k < 10; k++) { g.strokeStyle = `rgba(40,20,8,${R() * 0.18})`; g.lineWidth = 1; const xx = x + R() * w; g.beginPath(); g.moveTo(xx, 0); g.bezierCurveTo(xx + 3, H * 0.3, xx - 3, H * 0.6, xx + 1, H); g.stroke(); }
  }
  return toTex(c);
}
function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, ((n >> 16) & 255) * k), gg = Math.min(255, ((n >> 8) & 255) * k), b = Math.min(255, (n & 255) * k);
  return `rgb(${r | 0},${gg | 0},${b | 0})`;
}

// 垂直绿植墙
export function greenWallTexture() {
  const S = 512, R = rand(91);
  const [c, g] = makeCanvas(S, S);
  g.fillStyle = '#1e3b24'; g.fillRect(0, 0, S, S);
  const greens = ['#2f6b3a', '#3f8a45', '#56a356', '#6cbf5f', '#86c96b', '#2c5a33', '#9fd27a'];
  for (let i = 0; i < 1600; i++) {
    const x = R() * S, y = R() * S, r = 6 + R() * 16, a = R() * Math.PI;
    g.fillStyle = greens[Math.floor(R() * greens.length)];
    g.beginPath(); g.ellipse(x, y, r, r * 0.45, a, 0, Math.PI * 2); g.fill();
  }
  // 点缀小花
  for (let i = 0; i < 60; i++) { g.fillStyle = ['#ffc2d4', '#fff3b0', '#ffffff', '#b8e3ff'][i % 4]; g.beginPath(); g.arc(R() * S, R() * S, 2 + R() * 3, 0, Math.PI * 2); g.fill(); }
  return toTex(c);
}

// 地面光池（径向渐变，叠加混合）
export function glowPoolTexture() {
  const [c, g] = makeCanvas(256, 256);
  const rg = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  rg.addColorStop(0, 'rgba(255,255,255,0.9)'); rg.addColorStop(0.35, 'rgba(255,255,255,0.35)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = rg; g.fillRect(0, 0, 256, 256);
  const t = toTex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
}

// 入口地面拼花：黑色石材圆盘 + 金色小电视
export function medallionTexture() {
  const S = 1024;
  const [c, g] = makeCanvas(S, S);
  const rg = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  rg.addColorStop(0, '#2a2d34'); rg.addColorStop(1, '#14161b');
  g.fillStyle = rg; g.beginPath(); g.arc(S / 2, S / 2, S / 2 - 4, 0, Math.PI * 2); g.fill();
  const gold = g.createLinearGradient(0, 0, S, S); gold.addColorStop(0, '#f5d58a'); gold.addColorStop(0.5, '#c9973f'); gold.addColorStop(1, '#f2cf7c');
  g.strokeStyle = gold; g.lineWidth = 14; g.beginPath(); g.arc(S / 2, S / 2, S / 2 - 30, 0, Math.PI * 2); g.stroke();
  g.lineWidth = 4; g.beginPath(); g.arc(S / 2, S / 2, S / 2 - 60, 0, Math.PI * 2); g.stroke();
  // 罗盘刻度
  for (let i = 0; i < 64; i++) { const a = i / 64 * Math.PI * 2, r1 = S / 2 - 70, r2 = S / 2 - (i % 8 ? 86 : 110); g.lineWidth = i % 8 ? 2 : 5; g.beginPath(); g.moveTo(S / 2 + Math.cos(a) * r1, S / 2 + Math.sin(a) * r1); g.lineTo(S / 2 + Math.cos(a) * r2, S / 2 + Math.sin(a) * r2); g.stroke(); }
  drawTV(g, S / 2, S / 2 - 30, 330, '#d9a94a', 30);
  g.fillStyle = gold; g.textAlign = 'center'; g.font = `italic 900 96px "Arial Black",Arial`; g.fillText('bilibili', S / 2, S / 2 + 250);
  const t = toTex(c, { aniso: 16 }); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
}

// 电梯厅楼层导览牌（当前层高亮）
export function directoryTexture(list, currentKey) {
  const W = 512, rowH = 46, H = 120 + list.length * rowH + 30;
  const [c, g] = makeCanvas(W, H);
  const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#1a1d26'); bg.addColorStop(1, '#0e1016');
  g.fillStyle = bg; roundRect(g, 0, 0, W, H, 26); g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.12)'; g.lineWidth = 3; roundRect(g, 3, 3, W - 6, H - 6, 24); g.stroke();
  drawTV(g, 56, 60, 52, PINK, 6);
  g.fillStyle = '#fff'; g.font = `900 36px ${FONT}`; g.textBaseline = 'middle'; g.fillText('楼层导览', 100, 52);
  g.fillStyle = '#8c90a6'; g.font = `600 18px ${FONT}`; g.fillText('FLOOR DIRECTORY', 102, 84);
  [...list].reverse().forEach((f, i) => {
    const y = 120 + i * rowH;
    const cur = f.key === currentKey;
    if (cur) { g.fillStyle = f.color; g.globalAlpha = 0.22; roundRect(g, 18, y, W - 36, rowH - 6, 12); g.fill(); g.globalAlpha = 1; }
    g.fillStyle = f.color; roundRect(g, 30, y + 6, 70, rowH - 18, 8); g.fill();
    g.fillStyle = '#fff'; g.font = `900 22px ${FONT}`; g.textAlign = 'center'; g.fillText(f.num, 65, y + rowH / 2 - 3);
    g.textAlign = 'left'; g.font = `${cur ? 900 : 600} 23px ${FONT}`; g.fillStyle = cur ? '#fff' : '#d6d9e6';
    g.fillText(f.short, 118, y + rowH / 2 - 3);
    if (cur) { g.fillStyle = f.color; g.font = `800 17px ${FONT}`; g.textAlign = 'right'; g.fillText('● 您在此层', W - 34, y + rowH / 2 - 3); g.textAlign = 'left'; }
  });
  const t = toTex(c, { aniso: 8 }); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return { tex: t, aspect: W / H };
}

// 楼层号铭牌
export function floorPlaqueTexture(f) {
  const W = 512, H = 256;
  const [c, g] = makeCanvas(W, H);
  g.fillStyle = 'rgba(0,0,0,0)'; g.clearRect(0, 0, W, H);
  g.fillStyle = f.color; g.font = `900 170px "Arial Black",Arial`; g.textBaseline = 'middle'; g.textAlign = 'left';
  g.shadowColor = f.color; g.shadowBlur = 22; g.fillText(f.num, 12, 112); g.shadowBlur = 0;
  g.fillStyle = '#ffffff'; g.font = `800 38px ${FONT}`; g.fillText(f.short, 16, 222);
  const t = toTex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
}

// 29F 空中酒吧外立面暖光带
export function skybarBandTexture() {
  const W = 2048, H = 160, R = rand(29);
  const [c, g] = makeCanvas(W, H);
  const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#2a1a12'); bg.addColorStop(1, '#5a3418');
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 40; i++) { const x = i * W / 40 + 20; const rg = g.createRadialGradient(x, 30, 0, x, 60, 70); rg.addColorStop(0, 'rgba(255,200,120,0.95)'); rg.addColorStop(1, 'rgba(255,170,90,0)'); g.fillStyle = rg; g.fillRect(x - 70, 0, 140, H); }
  // 植物剪影 + 人影
  for (let i = 0; i < 60; i++) { const x = R() * W; g.fillStyle = 'rgba(20,30,18,0.75)'; g.beginPath(); g.ellipse(x, H - 18, 18 + R() * 20, 26 + R() * 18, 0, 0, Math.PI * 2); g.fill(); }
  for (let i = 0; i < 26; i++) { const x = R() * W; g.fillStyle = 'rgba(15,10,10,0.7)'; g.fillRect(x, H - 70, 12, 52); g.beginPath(); g.arc(x + 6, H - 80, 9, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = 'rgba(0,0,0,0.45)'; for (let x = 0; x < W; x += W / 44) g.fillRect(x, 0, 4, H);
  return toTex(c);
}
