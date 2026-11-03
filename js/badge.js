// 员工工牌：开场选择（姓名 / 部门 / 卡套颜色 / 挂绳） + 游戏内 HUD 小工牌 + 闸机刷卡
// 外观参考 B站入职工牌：白色卡套、蓝色小电视图案、粉蓝挂绳、灰色卡扣
import { drawIcon, iconsReady } from './icons.js';
export { iconsReady };
export const DEPTS = [
  { key: 'up', name: 'UP 主创作中心', en: 'CREATOR', color: '#FB7299', icon: '🎬' },
  { key: 'tech', name: '技术研发部', en: 'ENGINEERING', color: '#00AEEC', icon: '💻' },
  { key: 'anime', name: '国创动画部', en: 'ANIMATION', color: '#2EC27E', icon: '🎨' },
  { key: 'game', name: '游戏事业部', en: 'GAMES', color: '#7A5CFF', icon: '🎮' },
  { key: 'live', name: '直播中心', en: 'LIVE', color: '#FF3B5C', icon: '🎙️' },
  { key: 'music', name: '音乐区', en: 'MUSIC', color: '#FF5DA2', icon: '🎧' },
  { key: 'ops', name: '社区运营部', en: 'COMMUNITY', color: '#FFB027', icon: '💬' },
  { key: 'intern', name: '新人实习生', en: 'INTERN', color: '#4FC3A1', icon: '🌱' },
];
export const CASES = [
  { key: 'white', name: '经典白', bg: '#ffffff', tv: '#3aa5e0', text: '#2a2f45' },
  { key: 'pink', name: '哔哩粉', bg: '#ffe3ec', tv: '#FB7299', text: '#5a2436' },
  { key: 'blue', name: '天空蓝', bg: '#e1f4ff', tv: '#00AEEC', text: '#123a52' },
  { key: 'black', name: '夜幕黑', bg: '#1f222b', tv: '#7fd8ff', text: '#f2f4fa' },
];
export const LANYARDS = [
  { key: 'pinkblue', name: '粉蓝', a: '#FB7299', b: '#3a6fd8' },
  { key: 'pink', name: '全粉', a: '#FB7299', b: '#ff9cb9' },
  { key: 'blue', name: '全蓝', a: '#00AEEC', b: '#3a6fd8' },
  { key: 'rainbow', name: '彩虹', a: '#ffb027', b: '#7a5cff' },
];

// 头像：Q 版小人（与场景人物同一画风），第 0 个为“B站头像”（登录后可用）
export const AVATARS = [
  { key: 'tv', name: '小电视', skin: '#ffffff', hair: null, tv: true },
  { key: 'a1', name: '短发', skin: '#ffdcc6', hair: '#2a2026', style: 'short' },
  { key: 'a2', name: '马尾', skin: '#f3c9a6', hair: '#6b4a33', style: 'pony' },
  { key: 'a3', name: '粉发', skin: '#ffdcc6', hair: '#f29bbb', style: 'bob' },
  { key: 'a4', name: '蓝发', skin: '#e7b48f', hair: '#7fc8ff', style: 'short', glasses: true },
  { key: 'a5', name: '丸子头', skin: '#ffdcc6', hair: '#1d1a1f', style: 'bun' },
  { key: 'a6', name: '鸭舌帽', skin: '#c98f68', hair: '#2a2026', style: 'cap' },
  { key: 'a7', name: '22 娘', skin: '#ffe6d6', hair: '#4c3a8f', style: 'twin' },
];
export const TITLES = ['新人', '正式员工', '资深 UP 主', '技术大佬', '摸鱼达人', '弹幕之神', '三连狂魔', '番剧鉴赏家'];

/** 画头像（圆形），size 为直径 */
export function drawAvatar(g, key, cx, cy, size, img = null) {
  const r = size / 2;
  g.save(); g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.clip();
  const bg = g.createLinearGradient(cx - r, cy - r, cx + r, cy + r); bg.addColorStop(0, '#ffe3ec'); bg.addColorStop(1, '#dff3ff');
  g.fillStyle = bg; g.fillRect(cx - r, cy - r, size, size);
  if (key === 'bili' && img && img.complete && img.naturalWidth) { g.drawImage(img, cx - r, cy - r, size, size); g.restore(); return; }
  const a = AVATARS.find(x => x.key === key) || AVATARS[1];
  const s = size / 100;
  if (a.tv) {
    g.strokeStyle = '#00AEEC'; g.lineWidth = 6 * s; g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath(); g.moveTo(cx - 16 * s, cy - 30 * s); g.lineTo(cx - 6 * s, cy - 20 * s); g.moveTo(cx + 16 * s, cy - 30 * s); g.lineTo(cx + 6 * s, cy - 20 * s); g.stroke();
    g.beginPath(); g.roundRect ? g.roundRect(cx - 30 * s, cy - 20 * s, 60 * s, 46 * s, 10 * s) : g.rect(cx - 30 * s, cy - 20 * s, 60 * s, 46 * s); g.stroke();
    g.lineWidth = 5 * s; g.beginPath(); g.moveTo(cx - 18 * s, cy - 2 * s); g.lineTo(cx - 7 * s, cy - 6 * s); g.moveTo(cx + 18 * s, cy - 2 * s); g.lineTo(cx + 7 * s, cy - 6 * s); g.stroke();
    g.lineWidth = 3.5 * s; g.beginPath(); g.moveTo(cx - 8 * s, cy + 9 * s); g.quadraticCurveTo(cx - 4 * s, cy + 15 * s, cx, cy + 9 * s); g.quadraticCurveTo(cx + 4 * s, cy + 15 * s, cx + 8 * s, cy + 9 * s); g.stroke();
    g.restore(); return;
  }
  // 身体（衣服）
  g.fillStyle = '#2a3550'; g.beginPath(); g.ellipse(cx, cy + 52 * s, 34 * s, 26 * s, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(cx - 8 * s, cy + 28 * s); g.lineTo(cx, cy + 38 * s); g.lineTo(cx + 8 * s, cy + 28 * s); g.fill();
  // 后发
  g.fillStyle = a.hair;
  if (a.style === 'bob' || a.style === 'twin') { g.beginPath(); g.ellipse(cx, cy + 4 * s, 30 * s, 32 * s, 0, 0, Math.PI * 2); g.fill(); }
  if (a.style === 'pony') { g.beginPath(); g.ellipse(cx + 24 * s, cy + 10 * s, 9 * s, 20 * s, -0.3, 0, Math.PI * 2); g.fill(); }
  if (a.style === 'twin') { for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(cx + sx * 30 * s, cy + 14 * s, 8 * s, 18 * s, sx * 0.2, 0, Math.PI * 2); g.fill(); } }
  // 脸
  g.fillStyle = a.skin; g.beginPath(); g.ellipse(cx, cy, 24 * s, 26 * s, 0, 0, Math.PI * 2); g.fill();
  // 刘海 / 头顶
  g.fillStyle = a.hair; g.beginPath(); g.ellipse(cx, cy - 12 * s, 26 * s, 18 * s, 0, Math.PI, Math.PI * 2); g.fill();
  g.beginPath(); g.moveTo(cx - 24 * s, cy - 10 * s); g.quadraticCurveTo(cx - 8 * s, cy - 2 * s, cx + 2 * s, cy - 14 * s); g.quadraticCurveTo(cx + 14 * s, cy - 4 * s, cx + 25 * s, cy - 10 * s); g.lineTo(cx + 25 * s, cy - 16 * s); g.lineTo(cx - 24 * s, cy - 16 * s); g.fill();
  if (a.style === 'bun') { g.beginPath(); g.arc(cx, cy - 32 * s, 10 * s, 0, Math.PI * 2); g.fill(); }
  if (a.style === 'cap') { g.fillStyle = '#FB7299'; g.beginPath(); g.ellipse(cx, cy - 16 * s, 27 * s, 15 * s, 0, Math.PI, Math.PI * 2); g.fill(); g.fillRect(cx - 4 * s, cy - 18 * s, 34 * s, 5 * s); }
  // 五官
  g.fillStyle = '#1a1a1a';
  for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(cx + sx * 9 * s, cy + 2 * s, 3 * s, 4 * s, 0, 0, Math.PI * 2); g.fill(); }
  g.strokeStyle = '#b0545e'; g.lineWidth = 2.2 * s; g.lineCap = 'round'; g.beginPath(); g.moveTo(cx - 5 * s, cy + 12 * s); g.quadraticCurveTo(cx, cy + 16 * s, cx + 5 * s, cy + 12 * s); g.stroke();
  g.fillStyle = 'rgba(255,140,170,0.45)'; for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(cx + sx * 15 * s, cy + 9 * s, 4.5 * s, 2.6 * s, 0, 0, Math.PI * 2); g.fill(); }
  if (a.glasses) { g.strokeStyle = '#15171c'; g.lineWidth = 2 * s; for (const sx of [-1, 1]) { g.beginPath(); g.arc(cx + sx * 9 * s, cy + 2 * s, 6.5 * s, 0, Math.PI * 2); g.stroke(); } }
  g.restore();
}

const KEY = 'bili_badge_v1';
export function loadBadge() { try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch (_) { return null; } }
export function saveBadge(b) { localStorage.setItem(KEY, JSON.stringify(b)); }
export function today() { const d = new Date(); return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`; }
export function badgeNo() { return 'BL' + String(Date.now()).slice(-6) + String(Math.floor(Math.random() * 90 + 10)); }

/** 画一张工牌（canvas），用于 HUD / 3D 手持 / 分享 */
export function drawBadge(b, W = 360) {
  const H = Math.round(W * 1.55), s = W / 360;
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  const cs = CASES.find(x => x.key === b.case) || CASES[0], dp = DEPTS.find(x => x.key === b.dept) || DEPTS[0];
  const rr = (x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
  // 卡套
  g.fillStyle = cs.bg; rr(4 * s, 30 * s, W - 8 * s, H - 34 * s, 26 * s); g.fill();
  // 卡套内侧的柔和暗角（塑料卡套里插着卡片的体积感）
  g.save(); rr(4 * s, 30 * s, W - 8 * s, H - 34 * s, 26 * s); g.clip();
  const iv = g.createRadialGradient(W / 2, H * 0.45, W * 0.35, W / 2, H * 0.5, W * 0.95); iv.addColorStop(0, 'rgba(0,0,0,0)'); iv.addColorStop(1, 'rgba(20,24,40,0.10)');
  g.fillStyle = iv; g.fillRect(0, 0, W, H);
  // 底部 / 右侧的厚度暗边，顶部 / 左侧高光
  g.lineWidth = 6 * s; g.strokeStyle = 'rgba(20,24,40,0.10)'; rr(7 * s, 33 * s, W - 14 * s, H - 40 * s, 23 * s); g.stroke();
  g.restore();
  const rim = g.createLinearGradient(0, 30 * s, W, H); rim.addColorStop(0, 'rgba(255,255,255,0.9)'); rim.addColorStop(0.5, 'rgba(0,0,0,0.06)'); rim.addColorStop(1, 'rgba(0,0,0,0.22)');
  g.strokeStyle = rim; g.lineWidth = 2.5 * s; rr(5 * s, 31 * s, W - 10 * s, H - 36 * s, 25 * s); g.stroke();
  // 顶部卡扣槽
  g.fillStyle = 'rgba(0,0,0,0.12)'; rr(W / 2 - 40 * s, 44 * s, 80 * s, 12 * s, 6 * s); g.fill();
  // 卡扣（金属质感 + 投在卡面上的阴影）
  g.save(); g.shadowColor = 'rgba(10,14,30,0.35)'; g.shadowBlur = 10 * s; g.shadowOffsetY = 5 * s;
  const mg = g.createLinearGradient(0, 0, 0, 52 * s); mg.addColorStop(0, '#c4c9d2'); mg.addColorStop(0.5, '#9aa0aa'); mg.addColorStop(1, '#7f8590');
  g.fillStyle = mg; rr(W / 2 - 34 * s, 0, 68 * s, 52 * s, 8 * s); g.fill(); g.restore();
  g.fillStyle = 'rgba(255,255,255,0.45)'; g.fillRect(W / 2 - 30 * s, 3 * s, 60 * s, 2 * s);
  g.fillStyle = '#b7bcc5'; rr(W / 2 - 26 * s, 34 * s, 52 * s, 8 * s, 4 * s); g.fill();
  g.fillStyle = 'rgba(0,0,0,0.25)'; rr(W / 2 - 24 * s, 36 * s, 48 * s, 4 * s, 2 * s); g.fill();
  // 头像（圆框 + 部门色描边）
  const ax = W / 2, ay = 168 * s, ad = 150 * s;
  g.save(); g.shadowColor = 'rgba(20,24,40,0.28)'; g.shadowBlur = 14 * s; g.shadowOffsetY = 6 * s;
  g.fillStyle = dp.color; g.beginPath(); g.arc(ax, ay, ad / 2 + 7 * s, 0, Math.PI * 2); g.fill(); g.restore();
  g.fillStyle = '#fff'; g.beginPath(); g.arc(ax, ay, ad / 2 + 3 * s, 0, Math.PI * 2); g.fill();
  drawAvatar(g, b.avatar || 'tv', ax, ay, ad, b._img);
  // 称号徽标（头像右下）
  if (b.title) {
    g.font = `900 ${14 * s}px "Noto Sans SC","PingFang SC",sans-serif`;
    const tw = g.measureText(b.title).width + 22 * s;
    g.fillStyle = '#ffd166'; rr(ax + ad / 2 - tw * 0.55, ay + ad / 2 - 22 * s, tw, 26 * s, 13 * s); g.fill();
    g.strokeStyle = '#fff'; g.lineWidth = 3 * s; g.stroke();
    g.fillStyle = '#5a3a00'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(b.title, ax + ad / 2 - tw * 0.55 + tw / 2, ay + ad / 2 - 9 * s);
  }
  // 部门色条
  g.save(); g.shadowColor = 'rgba(20,24,40,0.25)'; g.shadowBlur = 10 * s; g.shadowOffsetY = 4 * s;
  g.fillStyle = dp.color; rr(26 * s, 278 * s, W - 52 * s, 40 * s, 12 * s); g.fill(); g.restore();
  const bh2 = g.createLinearGradient(0, 278 * s, 0, 318 * s); bh2.addColorStop(0, 'rgba(255,255,255,0.28)'); bh2.addColorStop(0.5, 'rgba(255,255,255,0)'); g.fillStyle = bh2; rr(26 * s, 278 * s, W - 52 * s, 40 * s, 12 * s); g.fill();
  g.fillStyle = '#fff'; g.font = `900 ${18 * s}px "Noto Sans SC","PingFang SC",sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  { const tw = g.measureText(dp.name).width, isz = 26 * s, x0 = W / 2 - (tw + isz + 6 * s) / 2;
    const ok = drawIcon(g, dp.icon, x0 + isz / 2, 297 * s, isz);
    g.fillText(dp.name, ok ? x0 + isz + 6 * s + tw / 2 : W / 2, 298 * s); }
  // 姓名
  g.fillStyle = cs.text;
  let fs = 38 * s; const maxW = W - 60 * s;
  do { g.font = `900 ${fs}px "Noto Sans SC","PingFang SC",sans-serif`; if (g.measureText(b.name || '新同学').width <= maxW) break; fs -= 2 * s; } while (fs > 14 * s);
  g.fillText(b.name || '新同学', W / 2, 360 * s);
  g.globalAlpha = 0.6; g.font = `700 ${14 * s}px Arial`; g.fillText(`${dp.en} · ${b.no || 'BL000000'}`, W / 2, 394 * s); g.globalAlpha = 1;
  // 入职日期
  g.globalAlpha = 0.55; g.font = `700 ${12 * s}px "Noto Sans SC",sans-serif`; g.fillText(`入职 ${b.date || new Date().toISOString().slice(0, 10)}`, W / 2, 416 * s); g.globalAlpha = 1;
  // 条码
  const bx = 60 * s, by = 432 * s, bw = W - 120 * s, bh = 26 * s; let seed = 0; for (const ch of (b.no || 'BL')) seed = (seed * 31 + ch.charCodeAt(0)) % 9973;
  g.fillStyle = cs.text; g.globalAlpha = 0.75;
  for (let x = 0; x < bw;) { seed = (seed * 9301 + 49297) % 233280; const w = (1 + (seed % 3)) * s; if ((seed >> 3) % 2) g.fillRect(bx + x, by, w, bh); x += w + s; }
  g.globalAlpha = 1;
  // 底部 bilibili 字标
  g.fillStyle = cs.tv; g.font = `italic 900 ${40 * s}px "Arial Black",Arial`; g.fillText('bilibili', W / 2, H - 46 * s);
  // 全息防伪条（彩虹渐变）
  const hg = g.createLinearGradient(0, 0, W, 0); ['#ff9ac4', '#ffd166', '#a0ffcf', '#7fd8ff', '#c49bff'].forEach((c2, k) => hg.addColorStop(k / 4, c2));
  g.save(); rr(4 * s, 30 * s, W - 8 * s, H - 34 * s, 26 * s); g.clip(); g.globalAlpha = 0.55; g.fillStyle = hg; g.fillRect(4 * s, H - 20 * s, W - 8 * s, 6 * s); g.restore();
  // 卡套反光
  const gl = g.createLinearGradient(0, 30 * s, W, H); gl.addColorStop(0, 'rgba(255,255,255,0.35)'); gl.addColorStop(0.35, 'rgba(255,255,255,0)'); gl.addColorStop(1, 'rgba(255,255,255,0.08)');
  g.fillStyle = gl; rr(4 * s, 30 * s, W - 8 * s, H - 34 * s, 26 * s); g.fill();
  return c;
}

/** 工牌背面：员工守则 + 二维码样式 + 园区地址 */
export function drawBadgeBack(b, W = 360) {
  const H = Math.round(W * 1.55), s = W / 360;
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  const cs = CASES.find(x => x.key === b.case) || CASES[0], dp = DEPTS.find(x => x.key === b.dept) || DEPTS[0];
  const rr = (x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
  g.fillStyle = cs.bg; rr(4 * s, 30 * s, W - 8 * s, H - 34 * s, 26 * s); g.fill();
  g.save(); g.shadowColor = 'rgba(10,14,30,0.35)'; g.shadowBlur = 10 * s; g.shadowOffsetY = 5 * s;
  g.fillStyle = '#9aa0aa'; rr(W / 2 - 34 * s, 0, 68 * s, 52 * s, 8 * s); g.fill(); g.restore();
  // 顶部色带
  g.fillStyle = dp.color; rr(4 * s, 30 * s, W - 8 * s, 70 * s, 26 * s); g.fill(); g.fillRect(4 * s, 70 * s, W - 8 * s, 30 * s);
  g.fillStyle = '#fff'; g.font = `900 ${22 * s}px "Noto Sans SC",sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('员工守则 · 干杯精神', W / 2, 78 * s);
  g.fillStyle = cs.text; g.textAlign = 'left'; g.font = `700 ${15 * s}px "Noto Sans SC",sans-serif`;
  ['① 热爱内容，尊重每一位 UP 主', '② 看到好视频，记得一键三连', '③ 弹幕要友善，前方高能要提醒', '④ 上班可以穿 Cos 服（真的）', '⑤ 遇事不决，先干杯 (゜-゜)つロ'].forEach((t, i) => g.fillText(t, 30 * s, 130 * s + i * 30 * s));
  // 伪二维码（装饰）
  const qx = W / 2 - 60 * s, qy = 290 * s, q = 120 * s, n = 21, cell = q / n; let seed = 7; for (const ch of (b.no || 'BL')) seed = (seed * 31 + ch.charCodeAt(0)) % 9973;
  g.fillStyle = '#fff'; rr(qx - 8 * s, qy - 8 * s, q + 16 * s, q + 16 * s, 10 * s); g.fill();
  g.fillStyle = '#1a1d24';
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { seed = (seed * 9301 + 49297) % 233280; if ((seed >> 4) % 2) g.fillRect(qx + x * cell, qy + y * cell, cell, cell); }
  for (const [fx, fy] of [[0, 0], [n - 7, 0], [0, n - 7]]) { g.fillStyle = '#1a1d24'; g.fillRect(qx + fx * cell, qy + fy * cell, 7 * cell, 7 * cell); g.fillStyle = '#fff'; g.fillRect(qx + (fx + 1) * cell, qy + (fy + 1) * cell, 5 * cell, 5 * cell); g.fillStyle = '#1a1d24'; g.fillRect(qx + (fx + 2) * cell, qy + (fy + 2) * cell, 3 * cell, 3 * cell); }
  g.fillStyle = cs.text; g.textAlign = 'center'; g.globalAlpha = 0.6; g.font = `600 ${12 * s}px "Noto Sans SC",sans-serif`;
  g.fillText('拾到请交还 1F 前台 · 谢谢你 ♡', W / 2, 440 * s);
  g.fillText('上海 · 哔哩哔哩总部大厦', W / 2, 462 * s); g.globalAlpha = 1;
  g.fillStyle = cs.tv; g.font = `italic 900 ${34 * s}px "Arial Black",Arial`; g.fillText('bilibili', W / 2, H - 46 * s);
  return c;
}
