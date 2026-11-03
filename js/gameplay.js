// 互动玩法：员工等级 + KPI 任务板、限时跑腿（3D 送货）、街机「弹幕护卫」、节奏「干杯鼓手」
// 事件驱动：主程序在各处 emit(type, value)，任务 / 等级 / 成就在这里统一结算
import * as THREE from 'three';
import { interactable } from './districts.js';
import { drawTV, PINK, BLUE, FONT } from './textures.js';
import { drawIcon, ic } from './icons.js';
import { hold, drop, isHolding } from './props.js';
import { FLOOR_META, META_BY_KEY } from './floorMeta.js';

const $ = (s) => document.querySelector(s);
const LS = (k, v) => (v === undefined ? JSON.parse(localStorage.getItem(k) || 'null') : localStorage.setItem(k, JSON.stringify(v)));
let G = null;   // 主程序注入：{ scene, camera, player, toast, Sound, coins(), setCoins(n), openModal, closeModal, celebrate, goto(key,x,z), state() }

// ======================================================================
// 员工等级
// ======================================================================
const LEVELS = [[0, '实习生'], [100, '新人'], [250, '正式员工'], [450, '资深员工'], [700, '小组长'], [1000, '主管'], [1400, '经理'], [1900, '总监'], [2500, '副总裁'], [3200, '首席干杯官']];
let xp = +(localStorage.getItem('bili_xp') || 0);
export function levelInfo(v = xp) {
  let i = 0; while (i < LEVELS.length - 1 && v >= LEVELS[i + 1][0]) i++;
  const cur = LEVELS[i][0], next = LEVELS[i + 1]?.[0] ?? cur;
  return { lv: i + 1, title: LEVELS[i][1], xp: v, cur, next, k: next > cur ? (v - cur) / (next - cur) : 1, max: i === LEVELS.length - 1 };
}
export function gainXP(n) { addXP(n); }
function addXP(n) {
  const before = levelInfo().lv; xp += Math.round(n); localStorage.setItem('bili_xp', xp);
  const L = levelInfo();
  if (L.lv > before) {
    const bonus = L.lv * 2; G.setCoins(G.coins() + bonus);
    G.Sound.win(); G.celebrate(6);
    banner(`升级啦！LV${L.lv} · ${L.title}`, `奖励 ${bonus} 枚硬币`, 'crown');
  }
  renderHud();
}

// ======================================================================
// KPI 任务（5 个一批，做完一批领取全勤奖，再刷新下一批）
// ======================================================================
const POOL = [
  { id: 'greet', t: '和 3 位同事聊聊天', ico: 'chat', n: 3, ev: 'talk', xp: 30, c: 1 },
  { id: 'present', t: '送同事一份礼物（或请喝奶茶）', ico: 'gift', n: 1, ev: 'gift', xp: 30, c: 1 },
  { id: 'favor', t: '完成 1 个同事委托（头顶有气泡的人）', ico: 'hands', n: 1, ev: 'favor', xp: 60, c: 2, core: true },
  { id: 'hi5', t: '和 2 位同事击掌', ico: 'clap', n: 2, ev: 'highfive', xp: 20, c: 1 },
  { id: 'friend', t: '和任意同事好感度达到 2 颗心', ico: 'heart', n: 2, ev: 'heart', max: true, xp: 40, c: 2 },
  { id: 'kart', t: '跑完 1 场卡丁车比赛（西北街区）', ico: 'flag', n: 1, ev: 'kart', xp: 50, c: 2, core: true },
  { id: 'kartWin', t: '在卡丁车比赛中拿到冠军', ico: 'trophy', n: 1, ev: 'kartWin', xp: 80, c: 4, core: true },
  { id: 'concert', t: '在 BML 体育馆开一场演出', ico: 'mic', n: 1, ev: 'concert', xp: 50, c: 2, core: true },
  { id: 'balloon', t: '夜市打气球一局打中 5 个', ico: 'target', n: 5, ev: 'balloon', max: true, xp: 45, c: 2, core: true },
  { id: 'snack', t: '在夜市买 2 份小吃', ico: 'bento', n: 2, ev: 'snack', xp: 25, c: 1 },
  { id: 'rides', t: '玩 2 次游乐设施（旋转木马 / 跳楼机）', ico: 'ferris', n: 2, ev: 'attraction', xp: 35, c: 2 },
  { id: 'wish', t: '在夜市许愿池许个愿', ico: 'sparkles', n: 1, ev: 'wish', xp: 20, c: 1 },
  { id: 'coffee', t: '在 1F 干杯 Cafe 点一杯三连拿铁', ico: 'coffee', n: 1, ev: 'act', re: /三连拿铁/, xp: 25, c: 1 },
  { id: 'danmaku', t: '发送 2 条弹幕', ico: 'chat', n: 2, ev: 'danmaku', xp: 25, c: 1 },
  { id: 'photo', t: '拍 2 张照片留念', ico: 'camera', n: 2, ev: 'photo', xp: 25, c: 1 },
  { id: 'floors', t: '乘电梯去 3 个不同楼层', ico: 'elevator', n: 3, ev: 'floor', uniq: true, xp: 40, c: 2 },
  { id: 'deliver', t: '完成 1 单限时跑腿（1F 前台接单）', ico: 'gift', n: 1, ev: 'deliver', xp: 40, c: 2, core: true },
  { id: 'fast', t: '完成 2 单「准时达」跑腿', ico: 'rocket', n: 2, ev: 'deliverFast', xp: 60, c: 3, core: true },
  { id: 'arcade', t: '「弹幕护卫」单局拿到 300 分（12F）', ico: 'arcade', n: 300, ev: 'arcade', max: true, xp: 50, c: 2, core: true },
  { id: 'rhythm', t: '「干杯鼓手」拿到 B 评级以上（14F）', ico: 'drum', n: 2, ev: 'rhythm', max: true, fmt: (p) => ['—', 'C', 'B', 'A', 'S'][p] || '—', xp: 50, c: 2, core: true },
  { id: 'gundam', t: '启动 1F 大堂的高达', ico: 'robot', n: 1, ev: 'act', re: /启动高达/, xp: 20, c: 1 },
  { id: 'badge', t: '收集 3 枚三连徽章', ico: 'star', n: 3, ev: 'badge', xp: 30, c: 1 },
  { id: 'bike', t: '骑共享单车 300 米', ico: 'bike', n: 300, ev: 'ride', unit: '米', xp: 35, c: 2 },
  { id: 'fly', t: '飞行累计 20 秒（按住 V / 「飞」）', ico: 'wings', n: 20, ev: 'fly', unit: '秒', xp: 30, c: 1 },
  { id: 'sit', t: '找地方坐下休息 2 次', ico: 'chair', n: 2, ev: 'sit', xp: 20, c: 1 },
  { id: 'roof', t: '登上 RF 天台观景台', ico: 'nightcity', n: 1, ev: 'floor', key: 'roof', xp: 25, c: 1 },
  { id: 'claw', t: '去 12F 抓一次娃娃', ico: 'teddy', n: 1, ev: 'act', re: /抓娃娃/, xp: 25, c: 1 },
  { id: 'gym', t: '去 22F 健身房锻炼一次', ico: 'dumbbell', n: 1, ev: 'act', re: /卧推|跑步机/, xp: 25, c: 1 },
  { id: 'food', t: '在 5F 员工餐厅吃点东西', ico: 'bento', n: 1, ev: 'act', re: /今日套餐|小蛋糕/, xp: 20, c: 1 },
  { id: 'book', t: '在 27F 空中图书馆借一本书', ico: 'books', n: 1, ev: 'act', re: /借一本书/, xp: 20, c: 1 },
  { id: 'fire', t: '放 1 次烟花庆祝一下', ico: 'fireworks', n: 1, ev: 'firework', xp: 15, c: 1 },
  { id: 'landmark', t: '发现 1 个新的城市地标', ico: 'map', n: 1, ev: 'landmark', xp: 35, c: 2, need: () => !G || G.state().landmarksLeft > 0 },
];
const BY_ID = Object.fromEntries(POOL.map(t => [t.id, t]));
const today = () => new Date().toLocaleDateString('zh-CN');
let kpi = LS('bili_kpi');
function newBatch(prevBatch = 0) {
  const avail = POOL.filter(t => !t.need || t.need());
  const core = avail.filter(t => t.core), rest = avail.filter(t => !t.core);
  const pick = (arr, n) => arr.sort(() => Math.random() - 0.5).slice(0, n);
  const list = [...pick(core, 2), ...pick(rest, 3)].sort(() => Math.random() - 0.5).map(t => ({ id: t.id, p: 0, done: false, seen: [] }));
  kpi = { day: today(), batch: prevBatch + 1, list, claimed: false };
  LS('bili_kpi', kpi);
}

export function emit(ev, v = 1) {
  if (!G) return;
  let changed = false;
  for (const it of kpi.list) {
    if (it.done) continue;
    const T = BY_ID[it.id]; if (T.ev !== ev) continue;
    if (T.re && !T.re.test(String(v))) continue;
    if (T.key && v !== T.key) continue;
    if (T.uniq) { if (!META_BY_KEY[v] || v === 'lobby' || it.seen.includes(v)) continue; it.seen.push(v); it.p = it.seen.length; }
    else if (T.max) it.p = Math.max(it.p, +v);
    else it.p += (T.re || T.key) ? 1 : +v;
    changed = true;
    if (it.p >= T.n) {
      it.p = T.n; it.done = true;
      G.setCoins(G.coins() + T.c); G.Sound.coin(); setTimeout(() => G.Sound.ding(), 120);
      G.toast(`任务完成：${T.t} <small>+${T.xp} XP · +${T.c} 硬币</small>`, T.ico, '#2ec27e');
      addXP(T.xp);
    }
  }
  if (changed) { LS('bili_kpi', kpi); renderHud(); if ($('#taskModal').classList.contains('show')) renderBoard(); }
}
function claimBatch() {
  if (kpi.claimed || !kpi.list.every(x => x.done)) return;
  kpi.claimed = true; LS('bili_kpi', kpi);
  G.setCoins(G.coins() + 5); G.Sound.win(); G.celebrate(8);
  banner('全勤奖到手！', '+5 硬币 · +80 XP，新一批任务已送达', 'trophy');
  addXP(80);
  newBatch(kpi.batch); renderBoard(); renderHud();
}
function reroll(i) {
  const it = kpi.list[i]; if (!it || it.done) return;
  if (G.coins() < 1) { G.toast('换任务需要 1 枚硬币', 'coin', '#ffb027'); return; }
  const used = new Set(kpi.list.map(x => x.id));
  const cand = POOL.filter(t => !used.has(t.id) && (!t.need || t.need()));
  if (!cand.length) return;
  G.setCoins(G.coins() - 1); G.Sound.click();
  kpi.list[i] = { id: cand[Math.floor(Math.random() * cand.length)].id, p: 0, done: false, seen: [] };
  LS('bili_kpi', kpi); renderBoard(); renderHud();
}

// ======================================================================
// HUD：任务面板里的等级条 + 今日任务进度
// ======================================================================
function renderHud() {
  const L = levelInfo(), done = kpi.list.filter(x => x.done).length;
  const el = $('#qKpi'); if (!el) return;
  el.querySelector('.q-lv').textContent = `LV${L.lv}`;
  el.querySelector('.q-lvt').textContent = L.title;
  el.querySelector('.q-xp i').style.width = `${L.k * 100}%`;
  el.querySelector('.q-task').textContent = done === kpi.list.length ? (kpi.claimed ? '已领取' : '领全勤奖 ›') : `任务 ${done}/${kpi.list.length} ›`;
  el.classList.toggle('ready', done === kpi.list.length && !kpi.claimed);
}
function banner(title, sub, icon) {
  const b = $('#lvBanner');
  b.innerHTML = `${ic(icon)}<div><b>${title}</b><small>${sub}</small></div>`;
  b.classList.remove('show'); void b.offsetWidth; b.classList.add('show');
}

// ======================================================================
// 任务板（modal）
// ======================================================================
const best = () => LS('bili_best') || { arcade: 0, rhythm: 0, deliver: 0, streak: 0 };
function saveBest(k, v) { const b = best(); if (v > (b[k] || 0)) { b[k] = v; LS('bili_best', b); return true; } return false; }
function renderBoard() {
  const L = levelInfo();
  $('#tkLv').innerHTML = `<b>LV${L.lv}</b><div class="tk-lvinfo"><div class="tk-lvt">${L.title}</div><div class="tk-bar"><i style="width:${L.k * 100}%"></i></div><small>${L.max ? '已满级' : `${L.xp - L.cur} / ${L.next - L.cur} XP 升到 LV${L.lv + 1}`}</small></div>`;
  $('#tkBatch').textContent = `第 ${kpi.batch} 批 · ${kpi.list.filter(x => x.done).length}/${kpi.list.length}`;
  $('#tkList').innerHTML = kpi.list.map((it, i) => {
    const T = BY_ID[it.id], k = Math.min(1, it.p / T.n);
    const prog = T.fmt ? `${T.fmt(it.p)} / ${T.fmt(T.n)}` : `${Math.floor(it.p)} / ${T.n}${T.unit || ''}`;
    return `<div class="tk-it ${it.done ? 'done' : ''}">${ic(T.ico)}<div class="tk-main"><div class="tk-t">${T.t}</div><div class="tk-pb"><i style="width:${k * 100}%"></i></div></div>
      <div class="tk-side"><small>${it.done ? '✓ 已完成' : prog}</small><em>+${T.xp}XP · ${T.c}币</em>${it.done ? '' : `<button data-rr="${i}" title="花 1 硬币换一个">换一个</button>`}</div></div>`;
  }).join('');
  const all = kpi.list.every(x => x.done);
  $('#tkClaim').disabled = !all || kpi.claimed;
  $('#tkClaim').textContent = all ? (kpi.claimed ? '已领取' : '领取全勤奖（+5 硬币 +80 XP）') : '完成全部 5 个任务可领全勤奖';
  const b = best();
  $('#tkGames').innerHTML = [
    ['deliver', 'gift', '限时跑腿', `1F 前台接单，把包裹送到指定楼层。最佳连送 ${b.streak || 0} 单`, '立即接单'],
    ['arcade', 'arcade', '弹幕护卫', `12F 游戏中心街机。点掉剧透 / 广告 / 引战弹幕。最高 ${b.arcade || 0} 分`, '前往 12F'],
    ['rhythm', 'drum', '干杯鼓手', `14F 音乐录音棚架子鼓。踩准节拍打鼓。最佳 ${['—', 'C', 'B', 'A', 'S'][b.rhythm || 0]}`, '前往 14F'],
    ['kart', 'flag', '哔哩卡丁车', `西北街区赛道，和 3 台 AI 比 3 圈。${(() => { const k = LS('bili_kart') || {}; return k.lap ? `最快圈 ${k.lap.toFixed(2)} 秒` : '还没有圈速纪录'; })()}`, '前往赛道'],
    ['arena', 'mic', 'BML 体育馆', '东北街区露天体育馆，买应援棒、开一场属于你的演唱会', '前往体育馆'],
    ['market', 'ferris', '哔哩夜市 · 游乐园', `西南街区：小吃、打气球（最佳 ${b.balloon || 0} 中）、套圈、旋转木马、跳楼机`, '前往夜市'],
  ].map(([k, i, t, d, btn]) => `<div class="tk-g">${ic(i)}<div><b>${t}</b><small>${d}</small></div><button data-go="${k}">${btn}</button></div>`).join('');
  document.querySelectorAll('#tkList [data-rr]').forEach(bn => bn.onclick = () => reroll(+bn.dataset.rr));
  document.querySelectorAll('#tkGames [data-go]').forEach(bn => bn.onclick = () => {
    const k = bn.dataset.go; G.closeModal(true);
    if (k === 'deliver') setTimeout(() => startOrder(), 150);
    if (k === 'arcade') G.goto('game', -17.4, 3.6, Math.PI);
    if (k === 'rhythm') G.goto('music', -10, 5.6, 0);
    if (k === 'kart' || k === 'arena' || k === 'market') G.gotoZone?.(k);
  });
}
export function openBoard() { renderBoard(); G.openModal('#taskModal'); }

// ======================================================================
// 限时跑腿：1F 前台接单 → 坐电梯 → 跟随指引送到目标楼层
// ======================================================================
const WHO = {
  showroom: ['展厅讲解员', '展品说明卡'], canteen: ['食堂阿姨', '一箱新鲜草莓'], forum: ['发布会导演', '演讲稿 U 盘'], studio: ['当红主播', '一杯三分糖奶茶'],
  game: ['电竞选手', '新的机械键盘'], music: ['录音师', '一套新鼓棒'], office: ['产品经理', '打印好的需求文档'], anime: ['原画师', '数位板笔尖'],
  gym: ['健身教练', '一桶蛋白粉'], theater: ['放映员', '新番拷贝硬盘'], lounge: ['加班的程序员', '眼罩和耳塞'], library: ['图书管理员', '要归还的漫画'],
  skybar: ['调酒师', '一袋青柠'], roof: ['摄影师', '长焦镜头'],
};
let order = null, streak = 0;
let beacon = null;
function makeBeacon(scene) {
  const g = new THREE.Group(); g.visible = false; scene.add(g);
  const col = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 6, 32, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(PINK).multiplyScalar(1.4), transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
  col.position.y = 3; g.add(col);
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.6, 2.2, 48), new THREE.MeshBasicMaterial({ color: new THREE.Color(PINK).multiplyScalar(1.8), transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.04; g.add(ring);
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, toneMapped: false }));
  sp.scale.set(1.1, 1.1, 1); sp.position.y = 2.4; sp.renderOrder = 30; g.add(sp);
  g.userData = { ring, sp, c, tex, painted: false };
  return g;
}
function packageMesh() {
  const g = new THREE.Group();
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.11, 0.13), new THREE.MeshStandardMaterial({ color: 0xc89a62, roughness: 0.85 }));
  const tape = new THREE.Mesh(new THREE.BoxGeometry(0.165, 0.112, 0.03), new THREE.MeshStandardMaterial({ color: 0xFB7299, roughness: 0.5 }));
  g.add(box, tape); g.position.set(0, 0.02, -0.02); return g;
}
function floorTargets(key) {
  const y = META_BY_KEY[key].y, out = [];
  for (const it of G.interactables) {
    const d = Object.getOwnPropertyDescriptor(it, 'pos'); if (!d || d.get) continue;
    const p = it.pos; if (Math.abs(p.y - y) > 0.8 || Math.abs(p.x) > 19.5 || p.z < -8.5 || Math.abs(p.z) > 14.5) continue;
    out.push(new THREE.Vector3(p.x, y, p.z));
  }
  if (!out.length) out.push(key === 'roof' ? new THREE.Vector3(6, y, 9) : new THREE.Vector3(0, y, 3));
  return out;
}
export function startOrder() {
  if (order) { G.toast(`你手上还有一单：送到 <b>${order.name}</b>`, 'gift', PINK); return; }
  const keys = Object.keys(WHO).filter(k => META_BY_KEY[k] && k !== G.state().level);
  const key = keys[Math.floor(Math.random() * keys.length)];
  const pts = floorTargets(key), tgt = pts[Math.floor(Math.random() * pts.length)];
  const p = G.player.pos, outside = Math.abs(p.x) > 22 || Math.abs(p.z) > 16;
  const total = Math.round(Math.max(30, Math.min(85, 26 + (Math.abs(p.x) + Math.abs(p.z + 7)) / 3.5 + (Math.abs(tgt.x) + Math.abs(tgt.z + 7)) / 3.5 + (outside ? 15 : 0))));
  const [who, item] = WHO[key];
  order = { key, pos: tgt, name: META_BY_KEY[key].name, who, item, total, left: total };
  beacon.position.copy(tgt); beacon.visible = true;
  const ud = beacon.userData; if (!ud.painted) { const g = ud.c.getContext('2d'); g.clearRect(0, 0, 128, 128); ud.painted = drawIcon(g, 'gift', 64, 64, 120); ud.tex.needsUpdate = true; }
  hold(G.camera, packageMesh(), '跑腿包裹', { uses: 999, onUse: () => G.toast(`把「${item}」送给 ${who}（${order?.name || ''}）`, 'gift', PINK), onDrop: () => G.toast('包裹先收进背包了，订单继续', 'backpack', '#8a8f99') });
  G.Sound.ding();
  G.toast(`接单成功！把「${item}」送到 <b>${order.name}</b> 的${who}手上，限时 ${total} 秒`, 'gift', PINK);
  $('#runHud').classList.add('show'); renderRun();
}
function endOrder(ok) {
  const o = order; order = null; beacon.visible = false; $('#runHud').classList.remove('show');
  if (isHolding()) drop(true);
  if (!o) return;
  if (ok) {
    const fast = o.left / o.total >= 0.5;
    streak++; saveBest('streak', streak); saveBest('deliver', (best().deliver || 0) + 1);
    const coin = 2 + (fast ? 2 : 0) + (streak >= 3 ? 1 : 0);
    G.setCoins(G.coins() + coin); G.Sound.win(); G.celebrate(4);
    banner(fast ? '准时达！' : '送达成功', `${o.who}：“谢谢！” +${coin} 硬币 · 连送 ${streak} 单`, fast ? 'rocket' : 'gift');
    addXP(30 + Math.round(o.left));
    emit('deliver'); if (fast) emit('deliverFast');
  } else {
    streak = 0; G.Sound.tone(220, 0.5, { type: 'sawtooth', vol: 0.05, slide: 110 });
    G.toast(`超时了……${o.who}只好自己下楼拿了。回 1F 前台再接一单吧`, 'nope', '#ff6b6b');
  }
}
let _rt = 0;
function renderRun() {
  if (!order) return;
  const el = $('#runHud'), p = G.player.pos, o = order;
  const sameFloor = Math.abs(p.y - o.pos.y) < 1.6;
  const dist = Math.hypot(p.x - o.pos.x, p.z - o.pos.z);
  el.querySelector('.rh-to').textContent = `送到 ${o.name}`;
  el.querySelector('.rh-sub').textContent = sameFloor ? `${o.who} · ${o.item} · 还有 ${Math.round(dist)} 米` : `先坐电梯${o.pos.y > p.y ? '上' : '下'}到 ${META_BY_KEY[o.key].num}（${o.item}）`;
  const t = Math.max(0, Math.ceil(o.left));
  el.querySelector('.rh-time').textContent = `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
  el.classList.toggle('hurry', o.left < 10);
  const arrow = el.querySelector('.rh-arrow');
  if (sameFloor) {
    const yawTo = Math.atan2(-(o.pos.x - p.x), -(o.pos.z - p.z));
    let rel = yawTo - G.player.yaw; rel = Math.atan2(Math.sin(rel), Math.cos(rel));
    arrow.style.transform = `rotate(${-rel}rad)`; arrow.classList.remove('vert');
  } else { arrow.style.transform = `rotate(${o.pos.y > p.y ? 0 : Math.PI}rad)`; arrow.classList.add('vert'); }
}

// ======================================================================
// 每帧：跑腿计时 / 到达判定 / 骑行 & 飞行累计 / 楼层到达事件
// ======================================================================
let lastLv = null, rideAcc = 0, flyAcc = 0; const lastPos = new THREE.Vector3(); let hasLast = false;
export function tick(dt) {
  if (!G) return;
  const S = G.state(), p = G.player.pos;
  if (S.level !== lastLv) { if (lastLv !== null) emit('floor', S.level); lastLv = S.level; }
  if (S.mode === 'walk') {
    if (S.riding && hasLast) { rideAcc += Math.hypot(p.x - lastPos.x, p.z - lastPos.z); if (rideAcc >= 10) { emit('ride', Math.floor(rideAcc)); rideAcc %= 1; } }
    if (S.flying) { flyAcc += dt; if (flyAcc >= 1) { emit('fly', 1); flyAcc -= 1; } }
  }
  lastPos.copy(p); hasLast = true;
  if (order) {
    if (S.mode === 'walk') order.left -= dt;
    if (Math.abs(p.y - order.pos.y) < 1.6 && Math.hypot(p.x - order.pos.x, p.z - order.pos.z) < 2.4) endOrder(true);
    else if (order.left <= 0) endOrder(false);
    if (order && (_rt += dt) > 0.1) { _rt = 0; renderRun(); }
    if (beacon.visible) { const t = performance.now() / 1000; beacon.userData.ring.scale.setScalar(1 + Math.sin(t * 4) * 0.08); beacon.userData.sp.position.y = 2.4 + Math.sin(t * 2.4) * 0.15; }
  }
}
export function orderTarget() { return order ? order.pos : null; }

// ======================================================================
// 小游戏框架（全屏 canvas，鼠标 / 触屏 / 键盘通用）
// ======================================================================
let MG = null;
const cv = () => $('#mgCanvas');
function sizeCanvas() {
  const c = cv(), r = c.getBoundingClientRect(), d = Math.min(devicePixelRatio || 1, 2);
  c.width = Math.round(r.width * d); c.height = Math.round(r.height * d);
  return { w: r.width, h: r.height, d };
}
export function openGame(kind) {
  if (MG) return;
  const game = kind === 'arcade' ? Arcade() : kind === 'balloon' ? Balloon() : kind === 'ring' ? RingToss() : Rhythm();
  MG = { kind, game, state: 'intro', raf: 0, last: 0 };
  window.__mg = true;
  $('#mgTitle').innerHTML = `${ic(game.icon)} ${game.title}`;
  $('#mgIntro').innerHTML = `${ic(game.icon, 'mg-big')}<h3>${game.title}</h3><p>${game.desc}</p><div class="mg-how">${game.how()}</div><small>历史最佳：${game.bestText()}</small><button class="btn primary" id="mgStart">开始游戏</button>`;
  $('#mgIntro').classList.add('show'); $('#mgResult').classList.remove('show'); $('#mgHud').innerHTML = '';
  G.openModal('#mgModal');
  $('#mgStart').onclick = () => startGame();
  requestAnimationFrame(() => { const s = sizeCanvas(); game.init(s); drawFrame(); });
}
function startGame() {
  const s = sizeCanvas(); MG.game.init(s); MG.game.start(); MG.state = 'play'; MG.last = performance.now();
  $('#mgIntro').classList.remove('show'); $('#mgResult').classList.remove('show');
  G.Sound.click();
  const loop = (now) => {
    if (!MG || MG.state !== 'play') return;
    const dt = Math.min(0.05, (now - MG.last) / 1000); MG.last = now;
    const over = MG.game.update(dt, now);
    drawFrame();
    if (over) finishGame(); else MG.raf = requestAnimationFrame(loop);
  };
  MG.raf = requestAnimationFrame(loop);
}
function drawFrame() { const c = cv(), g = c.getContext('2d'), d = c.width / c.getBoundingClientRect().width; g.setTransform(d, 0, 0, d, 0, 0); MG.game.draw(g); $('#mgHud').innerHTML = MG.game.hud(); }
function finishGame() {
  MG.state = 'result'; cancelAnimationFrame(MG.raf);
  const r = MG.game.result();
  const nb = saveBest(MG.kind, r.bestVal);
  G.setCoins(G.coins() + r.coins); if (r.coins) G.Sound.coin();
  addXP(r.xp); emit(MG.kind, r.bestVal);
  if (r.good) G.Sound.win(); else G.Sound.tone(330, 0.4, { type: 'triangle', vol: 0.06, slide: 220 });
  $('#mgResult').innerHTML = `<div class="mg-grade g-${r.grade}">${r.grade}</div><h3>${r.title}</h3><p>${r.lines.join('<br>')}</p>
    <div class="mg-reward">${ic('coin')} +${r.coins} 硬币　${ic('star')} +${Math.round(r.xp)} XP${nb ? `　<b class="mg-nb">新纪录！</b>` : ''}</div>
    <div class="mg-btns"><button class="btn primary" id="mgAgain">再来一局</button><button class="btn" id="mgBack">继续漫游</button></div>`;
  $('#mgResult').classList.add('show');
  $('#mgAgain').onclick = () => startGame();
  $('#mgBack').onclick = () => quitGame();
}
export function quitGame() {
  if (!MG) return;
  cancelAnimationFrame(MG.raf); MG.game.stop?.(); MG = null; window.__mg = false;
  G.closeModal(true);
}
export function onModalClosed() { if (MG) { cancelAnimationFrame(MG.raf); MG.game.stop?.(); MG = null; window.__mg = false; } }
function pointer(e) {
  if (!MG || MG.state !== 'play') return;
  const r = cv().getBoundingClientRect();
  const pts = e.changedTouches ? [...e.changedTouches] : [e];
  for (const t of pts) MG.game.press?.(t.clientX - r.left, t.clientY - r.top);
  e.preventDefault();
}
document.addEventListener('keydown', (e) => {
  if (!MG) return;
  if (e.code === 'Escape') { e.preventDefault(); quitGame(); return; }
  if (MG.state === 'play') { MG.game.key?.(e.code); if (['Space', 'KeyD', 'KeyF', 'KeyJ', 'KeyK'].includes(e.code)) e.preventDefault(); }
  else if ((e.code === 'Enter' || e.code === 'Space')) { e.preventDefault(); startGame(); }
}, true);

// ---------- 小游戏 1：弹幕护卫（点掉剧透 / 广告 / 引战弹幕，好弹幕放行）----------
function Arcade() {
  const GOOD = ['前方高能！', 'awsl', '2333333', '好耶！', '一键三连了', '泪目', '妙啊', 'UP主辛苦了', '打卡打卡', '爷青回', '下次一定', '这就是B站', '名场面', '前排围观', '火钳刘明'];
  const VIP = ['舰长：今天也来了', '提督：UP主加油', '舰长：干杯~'];
  const BAD = ['剧透：主角最后会…', '引战：XX不如YY', '加V领福利', '刷屏刷屏刷屏刷屏', '广告：低价代刷', '这都不会？菜', '剧透：凶手是…', '引战：都是水军', '广告：点我主页'];
  let W = 0, H = 0, items = [], fx = [], t = 0, score = 0, combo = 0, maxCombo = 0, hearts = 3, spawnT = 0, hits = 0, wrong = 0, missed = 0, shake = 0;
  const DUR = 45;
  return {
    title: '弹幕护卫', icon: 'arcade',
    desc: '弹幕区混进了剧透、广告和引战！<b>点掉红色的坏弹幕</b>，正常弹幕和舰长弹幕要放行。漏掉 3 条坏弹幕就结束。',
    how: () => `<span>${G.isTouch ? '手指点击' : '鼠标点击'} 红色弹幕 = 清除（连击加倍）</span><span>点错正常弹幕 −20 分</span><span>限时 ${DUR} 秒，越往后越快</span>`,
    bestText: () => `${best().arcade || 0} 分`,
    init(s) { W = s.w; H = s.h; },
    start() { items = []; fx = []; t = 0; score = 0; combo = 0; maxCombo = 0; hearts = 3; spawnT = 0.3; hits = 0; wrong = 0; missed = 0; },
    update(dt) {
      t += dt; spawnT -= dt; shake = Math.max(0, shake - dt * 3);
      const k = Math.min(1, t / DUR);
      if (spawnT <= 0) {
        spawnT = 0.72 - k * 0.42 + Math.random() * 0.25;
        const lanes = Math.max(5, Math.floor((H - 70) / 46)), lane = Math.floor(Math.random() * lanes);
        const r = Math.random(), bad = r < 0.42 + k * 0.12, vip = !bad && r > 0.86;
        const text = bad ? BAD[Math.floor(Math.random() * BAD.length)] : vip ? VIP[Math.floor(Math.random() * VIP.length)] : GOOD[Math.floor(Math.random() * GOOD.length)];
        const fs = 20 + Math.floor(Math.random() * 3) * 2;
        items.push({ text, bad, vip, x: W + 10, y: 46 + lane * 46, v: (110 + k * 170) * (0.85 + Math.random() * 0.35), fs, w: 0, color: bad ? '#fff' : vip ? '#5a3a00' : ['#ffffff', '#ffd1e0', '#bfe9ff', '#fff3b0'][Math.floor(Math.random() * 4)] });
      }
      for (const it of items) it.x -= it.v * dt;
      for (const it of items) if (it.bad && !it.dead && it.x + it.w < 0) { it.dead = true; hearts--; missed++; combo = 0; shake = 1; G.Sound.tone(180, 0.25, { type: 'square', vol: 0.05 }); fx.push({ x: 60, y: it.y, txt: '漏掉了！', c: '#ff6b6b', t: 0 }); }
      items = items.filter(it => !it.dead && it.x + it.w > -20);
      for (const f of fx) f.t += dt; fx = fx.filter(f => f.t < 0.8);
      return t >= DUR || hearts <= 0;
    },
    press(x, y) {
      let hit = null;
      for (const it of items) if (x >= it.x - 10 && x <= it.x + it.w + 10 && Math.abs(y - it.y) <= it.fs * 0.9) { if (!hit || it.bad) hit = it; }
      if (!hit) return;
      hit.dead = true;
      if (hit.bad) { combo++; maxCombo = Math.max(maxCombo, combo); hits++; const mul = 1 + Math.floor(combo / 5) * 0.5, pts = Math.round(10 * mul); score += pts; G.Sound.tone(660 + Math.min(combo, 12) * 40, 0.08, { type: 'triangle', vol: 0.06 }); fx.push({ x: hit.x + hit.w / 2, y: hit.y, txt: `+${pts}${combo >= 5 ? ` ×${mul}` : ''}`, c: '#7dffb2', t: 0 }); }
      else { combo = 0; wrong++; score = Math.max(0, score - 20); shake = 0.7; G.Sound.tone(200, 0.2, { type: 'sawtooth', vol: 0.05 }); fx.push({ x: hit.x + hit.w / 2, y: hit.y, txt: '−20 误伤了', c: '#ff8a8a', t: 0 }); }
    },
    draw(g) {
      g.save(); if (shake > 0) g.translate((Math.random() - 0.5) * 8 * shake, 0);
      const gr = g.createLinearGradient(0, 0, W, H); gr.addColorStop(0, '#2a1640'); gr.addColorStop(1, '#0f2a44'); g.fillStyle = gr; g.fillRect(-10, 0, W + 20, H);
      drawTV(g, W / 2, H / 2, Math.min(W, H) * 0.36, 'rgba(255,255,255,0.08)', 10);
      g.fillStyle = 'rgba(0,0,0,0.18)'; for (let y = 0; y < H; y += 4) g.fillRect(0, y, W, 1);
      g.textBaseline = 'middle';
      for (const it of items) {
        g.font = `800 ${it.fs}px ${FONT}`; it.w = g.measureText(it.text).width;
        if (it.bad || it.vip) { g.fillStyle = it.bad ? 'rgba(220,40,60,0.92)' : 'rgba(255,209,102,0.95)'; const ph = it.fs + 12; g.beginPath(); g.roundRect(it.x - 10, it.y - ph / 2, it.w + 20, ph, ph / 2); g.fill(); }
        if (it.bad) { g.fillStyle = '#ffe1e1'; g.beginPath(); g.moveTo(it.x - 2, it.y + 7); g.lineTo(it.x + 5, it.y - 7); g.lineTo(it.x + 12, it.y + 7); g.closePath(); g.fill(); g.fillStyle = '#c0283c'; g.fillRect(it.x + 4.2, it.y - 2, 1.8, 5); }
        g.lineWidth = 4; g.strokeStyle = 'rgba(0,0,0,0.45)'; const tx = it.bad ? it.x + 16 : it.x; if (it.bad) it.w += 16;
        if (!it.vip) g.strokeText(it.text, tx, it.y); g.fillStyle = it.color; g.fillText(it.text, tx, it.y);
      }
      for (const f of fx) { g.globalAlpha = 1 - f.t / 0.8; g.font = `900 22px ${FONT}`; g.fillStyle = f.c; g.textAlign = 'center'; g.fillText(f.txt, f.x, f.y - f.t * 40); g.textAlign = 'left'; g.globalAlpha = 1; }
      g.restore();
      if (combo >= 3) { g.font = `900 46px ${FONT}`; g.textAlign = 'right'; g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillText(`${combo} 连击`, W - 20, H - 40); g.textAlign = 'left'; }
    },
    hud: () => `<span>${ic('star')} <b>${score}</b> 分</span><span>${ic('bolt')} 连击 <b>${combo}</b></span><span class="mg-hearts">${'<i class="on"></i>'.repeat(Math.max(0, hearts))}${'<i></i>'.repeat(3 - Math.max(0, hearts))}</span><span>${ic('refresh')} <b>${Math.max(0, Math.ceil(DUR - t))}</b> 秒</span>`,
    result() {
      const grade = score >= 600 ? 'S' : score >= 400 ? 'A' : score >= 250 ? 'B' : 'C';
      return { grade, bestVal: score, good: score >= 250, title: hearts <= 0 ? '弹幕区沦陷了……' : '弹幕环境守护成功！', coins: Math.min(8, Math.floor(score / 100)), xp: 10 + score / 8,
        lines: [`得分 <b>${score}</b> · 最高连击 ${maxCombo}`, `清除坏弹幕 ${hits} 条 · 误伤 ${wrong} 条 · 漏掉 ${missed} 条`] };
    },
  };
}

// ---------- 小游戏 2：干杯鼓手（4 轨节奏游戏，D F J K / 点击轨道）----------
// ---------- 小游戏 3：夜市打气球（10 发子弹，气球左右漂移，打中 3 个以上有奖）----------
function Balloon() {
  const COLS = ['#FB7299', '#00AEEC', '#ffd166', '#8bd17c', '#9b8cff', '#ff8a5c'];
  let W = 0, H = 0, bs = [], shots = 10, hit = 0, t = 0, pops = [], aim = { x: 0, y: 0 }, flash = 0, endT = 0;
  return {
    title: '夜市打气球', icon: 'target',
    desc: '10 发子弹，打中越多奖品越好！<b>金色气球</b>算 3 个。气球会左右飘，瞄准再开枪。',
    how: () => `<span>${G.isTouch ? '点哪打哪' : '鼠标点击射击'} · 共 10 发</span><span>3 中：硬币 · 6 中：玩偶 · 9 中：大奖</span>`,
    bestText: () => `${best().balloon || 0} 个`,
    init(s) { W = s.w; H = s.h; },
    start() {
      bs = []; shots = 10; hit = 0; t = 0; pops = []; endT = 0;
      for (let r = 0; r < 4; r++) for (let c = 0; c < 8; c++) bs.push({ bx: (c + 0.5 + (r % 2) * 0.5) / 8.5, y: 0.16 + r * 0.17, ph: Math.random() * 6, sp: 0.4 + Math.random() * 0.6, c: COLS[(r * 8 + c) % COLS.length], gold: Math.random() < 0.08, alive: true });
    },
    update(dt) { t += dt; flash = Math.max(0, flash - dt * 6); for (const p of pops) p.t += dt; pops = pops.filter(p => p.t < 0.6); if (shots <= 0) endT += dt; return shots <= 0 && endT > 0.8; },
    pos(b) { return { x: (b.bx + Math.sin(t * b.sp + b.ph) * 0.022) * W, y: b.y * H + Math.sin(t * 1.6 + b.ph) * 5 }; },
    press(x, y) {
      if (shots <= 0) return; shots--; flash = 1; aim = { x, y };
      G.Sound.noise(0.08, { vol: 0.25, freq: 2400 });
      const R = Math.min(W / 26, H / 16);
      for (const b of bs) { if (!b.alive) continue; const p = this.pos(b); if (Math.hypot(x - p.x, y - p.y) < R * 1.15) { b.alive = false; hit += b.gold ? 3 : 1; pops.push({ ...p, c: b.c, t: 0 }); G.Sound.tone(b.gold ? 1320 : 880, 0.12, { type: 'triangle', vol: 0.06 }); return; } }
    },
    draw(g) {
      const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#3a1e2e'); gr.addColorStop(1, '#1e1626'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
      g.fillStyle = 'rgba(255,214,140,0.08)'; for (let i = 0; i < 12; i++) g.fillRect(i * W / 12, 0, 2, H);
      const R = Math.min(W / 26, H / 16);
      for (const b of bs) {
        if (!b.alive) continue; const p = this.pos(b);
        g.strokeStyle = 'rgba(255,255,255,0.4)'; g.lineWidth = 1; g.beginPath(); g.moveTo(p.x, p.y + R * 1.1); g.quadraticCurveTo(p.x + 6, p.y + R * 2, p.x, p.y + R * 2.6); g.stroke();
        const bg = g.createRadialGradient(p.x - R * 0.35, p.y - R * 0.4, R * 0.1, p.x, p.y, R * 1.15); bg.addColorStop(0, '#ffffff'); bg.addColorStop(0.25, b.gold ? '#ffe08a' : b.c); bg.addColorStop(1, b.gold ? '#c8901a' : b.c);
        g.fillStyle = bg; g.beginPath(); g.ellipse(p.x, p.y, R * 0.88, R * 1.05, 0, 0, 7); g.fill();
        g.fillStyle = b.gold ? '#c8901a' : b.c; g.beginPath(); g.moveTo(p.x - 4, p.y + R * 1.05); g.lineTo(p.x + 4, p.y + R * 1.05); g.lineTo(p.x, p.y + R * 1.25); g.fill();
      }
      for (const p of pops) { const k = p.t / 0.6; g.strokeStyle = p.c; g.lineWidth = 3; g.globalAlpha = 1 - k; for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283; g.beginPath(); g.moveTo(p.x + Math.cos(a) * R * k * 0.6, p.y + Math.sin(a) * R * k * 0.6); g.lineTo(p.x + Math.cos(a) * R * (0.6 + k), p.y + Math.sin(a) * R * (0.6 + k)); g.stroke(); } g.globalAlpha = 1; }
      if (flash > 0) { g.fillStyle = `rgba(255,240,200,${flash * 0.25})`; g.beginPath(); g.arc(aim.x, aim.y, 26 * flash + 6, 0, 7); g.fill(); }
      g.fillStyle = '#8b5a36'; g.fillRect(0, H - 34, W, 34); g.fillStyle = '#ffd98a'; g.font = `800 15px ${FONT}`; g.textAlign = 'center'; g.fillText('瞄准气球，点击射击', W / 2, H - 12); g.textAlign = 'left';
    },
    hud: () => `<span>${ic('target')} 打中 <b>${hit}</b></span><span>${ic('bolt')} 子弹 <b>${shots}</b>/10</span>`,
    result() {
      const grade = hit >= 9 ? 'S' : hit >= 6 ? 'A' : hit >= 3 ? 'B' : 'C';
      if (hit >= 6) G.addItem?.(hit >= 9 ? '夜市大奖 · 巨型小电视' : '夜市小电视玩偶', '🧸');
      return { grade, bestVal: hit, good: hit >= 3, title: hit >= 9 ? '神枪手！拿走大奖' : hit >= 6 ? '漂亮！送你一只玩偶' : hit >= 3 ? '不错，有小奖' : '差一点点……', coins: hit >= 9 ? 6 : hit >= 6 ? 3 : hit >= 3 ? 2 : 0, xp: 10 + hit * 4, lines: [`打中 <b>${hit}</b> 个（金色气球算 3 个）`, hit >= 6 ? '奖品已放进背包' : '3 中有硬币 · 6 中有玩偶'] };
    },
  };
}
// ---------- 小游戏 4：套圈（摆动的力度条 + 方向条，5 个圈）----------
function RingToss() {
  let W = 0, H = 0, t = 0, rings = 5, got = 0, stage = 0, dir = 0, pow = 0, fly = null, prizes = [], msg = null, endT = 0;
  const NAMES = ['小电视', '22 娘', '33 娘', '应援棒', '奶茶券', '手办'];
  return {
    title: '夜市套圈', icon: 'target',
    desc: '先定<b>方向</b>，再定<b>力度</b>，把圈套到奖品上！一共 5 个圈。',
    how: () => `<span>${G.isTouch ? '点击屏幕' : '点击 / 空格'}：第一下定方向，第二下定力度</span><span>套中越远的奖品越值钱</span>`,
    bestText: () => `${best().ring || 0} 个`,
    init(s) { W = s.w; H = s.h; },
    start() { t = 0; rings = 5; got = 0; stage = 0; fly = null; msg = null; endT = 0; prizes = []; for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) prizes.push({ x: 0.2 + c * 0.2 + (r % 2) * 0.05, y: 0.22 + r * 0.16, r, alive: true, n: NAMES[(r * 4 + c) % NAMES.length] }); },
    tap() {
      if (fly || rings <= 0) return;
      if (stage === 0) { dir = Math.sin(t * 2.2); stage = 1; G.Sound.click(); }
      else { pow = (Math.sin(t * 2.8) + 1) / 2; stage = 0; rings--; const tx = 0.5 + dir * 0.42, ty = 0.86 - pow * 0.72; fly = { k: 0, tx, ty }; G.Sound.tone(500, 0.2, { type: 'sine', vol: 0.04, slide: 900 }); }
    },
    press() { this.tap(); }, key(c) { if (c === 'Space') this.tap(); },
    update(dt) {
      t += dt; if (msg) { msg.t += dt; if (msg.t > 1) msg = null; }
      if (fly) { fly.k += dt / 0.7; if (fly.k >= 1) {
        let best = null, bd = 1; for (const p of prizes) { if (!p.alive) continue; const d = Math.hypot((p.x - fly.tx) * W, (p.y - fly.ty) * H) / Math.min(W, H); if (d < bd) { bd = d; best = p; } }
        if (best && bd < 0.045) { best.alive = false; got++; msg = { txt: `套中「${best.n}」！`, c: '#7dffb2', t: 0 }; G.Sound.tone(988, 0.15, { type: 'triangle', vol: 0.06 }); G.Sound.tone(1319, 0.2, { type: 'triangle', vol: 0.05, delay: 0.1 }); }
        else { msg = { txt: bd < 0.08 ? '差一点！' : '没套中', c: '#ff9a9a', t: 0 }; G.Sound.tone(260, 0.15, { type: 'square', vol: 0.03 }); }
        fly = null; } }
      if (rings <= 0 && !fly) endT += dt;
      return rings <= 0 && !fly && endT > 1.1;
    },
    draw(g) {
      g.fillStyle = '#25331f'; g.fillRect(0, 0, W, H); g.fillStyle = '#2f4427'; g.fillRect(W * 0.08, H * 0.1, W * 0.84, H * 0.56);
      const S = Math.min(W, H);
      for (const p of prizes) { if (!p.alive) continue; const x = p.x * W, y = p.y * H; g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(x, y + 4, S * 0.03, S * 0.012, 0, 0, 7); g.fill(); g.fillStyle = ['#FB7299', '#00AEEC', '#ffd166'][p.r]; g.beginPath(); g.roundRect(x - S * 0.018, y - S * 0.05, S * 0.036, S * 0.05, 4); g.fill(); g.fillStyle = '#fff'; g.font = `700 ${Math.round(S * 0.022)}px ${FONT}`; g.textAlign = 'center'; g.fillText(p.n, x, y + S * 0.035); }
      const bx = W / 2, by = H * 0.9;
      if (!fly && rings > 0) {
        const d = stage === 0 ? Math.sin(t * 2.2) : dir;
        g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 3; g.setLineDash([8, 8]); g.beginPath(); g.moveTo(bx, by); g.lineTo(bx + d * W * 0.42, H * 0.2); g.stroke(); g.setLineDash([]);
        if (stage === 1) { const p = (Math.sin(t * 2.8) + 1) / 2; g.fillStyle = 'rgba(255,255,255,0.15)'; g.fillRect(W - 40, H * 0.15, 18, H * 0.7); const gr = g.createLinearGradient(0, H * 0.85, 0, H * 0.15); gr.addColorStop(0, '#7dffb2'); gr.addColorStop(1, '#ff6b6b'); g.fillStyle = gr; g.fillRect(W - 40, H * 0.85 - p * H * 0.7, 18, p * H * 0.7); }
      }
      if (fly) { const k = fly.k, x = bx + (fly.tx * W - bx) * k, y = by + (fly.ty * H - by) * k - Math.sin(k * Math.PI) * H * 0.18, rs = S * (0.05 - k * 0.018); g.strokeStyle = '#ffd166'; g.lineWidth = 5; g.beginPath(); g.ellipse(x, y, rs, rs * 0.45, 0, 0, 7); g.stroke(); }
      for (let i = 0; i < rings; i++) { g.strokeStyle = '#ffd166'; g.lineWidth = 4; g.beginPath(); g.ellipse(30 + i * 30, H - 26, 11, 5, 0, 0, 7); g.stroke(); }
      if (msg) { g.globalAlpha = 1 - msg.t; g.fillStyle = msg.c; g.font = `900 30px ${FONT}`; g.textAlign = 'center'; g.fillText(msg.txt, W / 2, H * 0.78 - msg.t * 20); g.globalAlpha = 1; }
      g.fillStyle = 'rgba(255,255,255,0.75)'; g.font = `700 14px ${FONT}`; g.textAlign = 'center'; g.fillText(fly || rings <= 0 ? '' : stage === 0 ? '点击定方向' : '点击定力度', W / 2, H - 20); g.textAlign = 'left';
    },
    hud: () => `<span>${ic('gift')} 套中 <b>${got}</b></span><span>${ic('target')} 剩余 <b>${rings}</b> 个圈</span>`,
    result() {
      const grade = got >= 4 ? 'S' : got >= 3 ? 'A' : got >= 1 ? 'B' : 'C';
      if (got >= 3) G.addItem?.('套圈奖品 · 22 娘手办', '🧸');
      return { grade, bestVal: got, good: got >= 1, title: got >= 3 ? '套圈达人！' : got >= 1 ? '有收获！' : '今天手感不太好', coins: got * 2, xp: 10 + got * 10, lines: [`5 个圈套中 <b>${got}</b> 个`, got >= 3 ? '额外奖励：22 娘手办（已放进背包）' : '套中 3 个可以拿手办'] };
    },
  };
}

function Rhythm() {
  const LANES = 4, KEYS = ['KeyD', 'KeyF', 'KeyJ', 'KeyK'], LABEL = ['D', 'F', 'J', 'K'], COL = ['#FB7299', '#FFB027', '#00AEEC', '#7A5CFF'], NAME = ['底鼓', '军鼓', '通鼓', '镲'];
  const BPM = 112, BEAT = 60 / BPM, LEAD = 2.2, SONG = 34, FALL = 1.35;
  let W = 0, H = 0, notes = [], t0 = 0, now = 0, score = 0, combo = 0, maxCombo = 0, judge = null, flash = [0, 0, 0, 0], beatIdx = -1, cnt = { p: 0, g: 0, m: 0 }, ended = false;
  const drum = (l, v = 1) => {
    const S = G.Sound;
    if (l === 0) S.tone(70, 0.25, { vol: 0.32 * v, slide: 40 });
    if (l === 1) { S.noise(0.15, { vol: 0.3 * v, freq: 3200 }); S.tone(220, 0.08, { vol: 0.1 * v }); }
    if (l === 2) S.tone(150, 0.22, { vol: 0.24 * v, slide: 100 });
    if (l === 3) S.noise(0.25, { vol: 0.16 * v, freq: 8000 });
  };
  function chart() {
    const out = []; let prev = -1;
    const total = Math.floor(SONG / BEAT);
    for (let b = 4; b < total; b++) {
      const k = b / total;
      const add = (time, lane) => out.push({ time, lane, hit: false, miss: false });
      let lane = b % 4 === 0 ? 0 : b % 2 === 0 ? 0 : 1; if (Math.random() < 0.35) lane = Math.floor(Math.random() * LANES);
      if (lane === prev && Math.random() < 0.5) lane = (lane + 1 + Math.floor(Math.random() * 3)) % LANES;
      add(b * BEAT, lane); prev = lane;
      if (Math.random() < 0.12 + k * 0.33) add((b + 0.5) * BEAT, (lane + 2) % LANES);
      if (k > 0.55 && b % 4 === 0 && Math.random() < 0.5) add(b * BEAT, 3);
    }
    return out;
  }
  const hitY = () => H * 0.82, laneX = (l) => W / 2 + (l - 1.5) * Math.min(110, W / 4.6), laneW = () => Math.min(100, W / 5);
  return {
    title: '干杯鼓手', icon: 'drum',
    desc: '跟着节拍打鼓！音符落到<b>判定线</b>时按下对应按键。踩得越准分越高，连击不断拿 S 评级。',
    how: () => G.isTouch ? `<span>点击屏幕下方对应的轨道</span><span>4 条轨道：底鼓 · 军鼓 · 通鼓 · 镲</span>` : `<span>按键 <kbd>D</kbd> <kbd>F</kbd> <kbd>J</kbd> <kbd>K</kbd> 对应 4 条轨道</span><span>也可以用鼠标点击轨道</span>`,
    bestText: () => ['—', 'C', 'B', 'A', 'S'][best().rhythm || 0],
    init(s) { W = s.w; H = s.h; },
    start() { notes = chart(); t0 = performance.now() / 1000 + LEAD; score = 0; combo = 0; maxCombo = 0; judge = null; flash = [0, 0, 0, 0]; beatIdx = -1; cnt = { p: 0, g: 0, m: 0 }; ended = false; },
    update(dt, nowMs) {
      now = nowMs / 1000 - t0;
      for (let i = 0; i < 4; i++) flash[i] = Math.max(0, flash[i] - dt * 4);
      const bi = Math.floor(now / BEAT);
      if (bi !== beatIdx && now > -BEAT * 4 && now < SONG) { beatIdx = bi; const S = G.Sound; S.noise(0.04, { vol: 0.05, freq: 9000 }); if (((bi % 4) + 4) % 4 === 0) S.tone(55, 0.3, { vol: 0.08, slide: 40 }); if (bi % 2 === 1) S.tone(110, 0.15, { type: 'triangle', vol: 0.025 }); }
      for (const n of notes) if (!n.hit && !n.miss && now - n.time > 0.16) { n.miss = true; cnt.m++; combo = 0; judge = { t: 'MISS', c: '#ff6b6b', at: now }; }
      return now > SONG + 1.2;
    },
    hitLane(l) {
      flash[l] = 1; let bestN = null, bd = 1;
      for (const n of notes) if (n.lane === l && !n.hit && !n.miss) { const d = Math.abs(now - n.time); if (d < bd) { bd = d; bestN = n; } }
      if (bestN && bd < 0.16) {
        bestN.hit = true; combo++; maxCombo = Math.max(maxCombo, combo);
        const perfect = bd < 0.07; perfect ? cnt.p++ : cnt.g++;
        score += Math.round((perfect ? 100 : 60) * (1 + Math.min(combo, 50) / 50));
        judge = { t: perfect ? 'PERFECT' : 'GOOD', c: perfect ? '#ffe17a' : '#7fd8ff', at: now };
        drum(l, 1);
        const D = G.ctx.drumKit; if (D) { const m = [D.kick, D.snare, D.tom1, D.cymbals?.[2]][l]; if (m) { m.scale.setScalar(1.06); setTimeout(() => m.scale.setScalar(1), 90); } }
      } else drum(l, 0.4);
    },
    key(code) { const l = KEYS.indexOf(code); if (l >= 0) this.hitLane(l); },
    press(x, y) { let bl = 0, bd = 1e9; for (let l = 0; l < LANES; l++) { const d = Math.abs(x - laneX(l)); if (d < bd) { bd = d; bl = l; } } if (bd < laneW()) this.hitLane(bl); },
    draw(g) {
      const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#120c22'); gr.addColorStop(1, '#2a1238'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
      const pulse = Math.max(0, 1 - ((now % BEAT) + BEAT) % BEAT / BEAT * 3);
      g.fillStyle = `rgba(251,114,153,${0.06 + pulse * 0.08})`; g.fillRect(0, 0, W, H);
      const lw = laneW(), hy = hitY();
      for (let l = 0; l < LANES; l++) {
        const x = laneX(l);
        g.fillStyle = 'rgba(255,255,255,0.05)'; g.fillRect(x - lw / 2, 0, lw, H);
        if (flash[l] > 0) { const fg = g.createLinearGradient(0, hy, 0, hy - 220); fg.addColorStop(0, COL[l] + 'aa'); fg.addColorStop(1, COL[l] + '00'); g.globalAlpha = flash[l]; g.fillStyle = fg; g.fillRect(x - lw / 2, hy - 220, lw, 220); g.globalAlpha = 1; }
        g.strokeStyle = COL[l]; g.lineWidth = 4; g.beginPath(); g.arc(x, hy, lw * 0.36, 0, Math.PI * 2); g.stroke();
        g.fillStyle = 'rgba(255,255,255,0.85)'; g.font = `900 ${G.isTouch ? 14 : 18}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(G.isTouch ? NAME[l] : LABEL[l], x, hy); g.font = `700 12px ${FONT}`; g.fillStyle = 'rgba(255,255,255,0.45)'; if (!G.isTouch) g.fillText(NAME[l], x, hy + lw * 0.36 + 14);
      }
      g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(W / 2 - lw * 2.4, hy - 1, lw * 4.8, 2);
      for (const n of notes) {
        if (n.hit || n.miss) continue;
        const dtn = n.time - now; if (dtn > FALL || dtn < -0.2) continue;
        const y = hy - (dtn / FALL) * hy, x = laneX(n.lane);
        g.fillStyle = COL[n.lane]; g.beginPath(); g.roundRect(x - lw * 0.38, y - 11, lw * 0.76, 22, 11); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.55)'; g.beginPath(); g.roundRect(x - lw * 0.3, y - 8, lw * 0.6, 5, 3); g.fill();
      }
      if (now < 0) { g.fillStyle = '#fff'; g.font = `900 64px ${FONT}`; g.textAlign = 'center'; g.fillText(String(Math.ceil(-now)), W / 2, H * 0.4); g.font = `700 16px ${FONT}`; g.fillText('跟着节拍准备…', W / 2, H * 0.4 + 50); }
      if (judge && now - judge.at < 0.5) { const a = 1 - (now - judge.at) / 0.5; g.globalAlpha = a; g.fillStyle = judge.c; g.font = `900 ${34 + a * 8}px ${FONT}`; g.textAlign = 'center'; g.fillText(judge.t, W / 2, hy - 120); g.globalAlpha = 1; }
      if (combo >= 5) { g.fillStyle = 'rgba(255,255,255,0.9)'; g.font = `900 30px ${FONT}`; g.textAlign = 'center'; g.fillText(`${combo}`, W / 2, H * 0.3); g.font = `700 13px ${FONT}`; g.fillStyle = 'rgba(255,255,255,0.6)'; g.fillText('COMBO', W / 2, H * 0.3 + 24); }
      g.textAlign = 'left';
    },
    hud: () => `<span>${ic('star')} <b>${score}</b> 分</span><span>${ic('bolt')} 连击 <b>${combo}</b></span><span>${ic('notes')} <b>${Math.max(0, Math.min(100, Math.round(now / SONG * 100)))}</b>%</span>`,
    result() {
      const total = cnt.p + cnt.g + cnt.m || 1, acc = (cnt.p + cnt.g * 0.6) / total * 100;
      const gi = acc >= 92 ? 4 : acc >= 80 ? 3 : acc >= 62 ? 2 : 1, grade = ['', 'C', 'B', 'A', 'S'][gi];
      return { grade, bestVal: gi, good: gi >= 2, title: gi >= 3 ? '全场为你欢呼！' : gi === 2 ? '节奏不错！' : '再练练，找找节拍感', coins: [0, 1, 2, 3, 5][gi], xp: 10 + score / 60,
        lines: [`准确率 <b>${acc.toFixed(1)}%</b> · 得分 ${score} · 最高连击 ${maxCombo}`, `PERFECT ${cnt.p} · GOOD ${cnt.g} · MISS ${cnt.m}`] };
    },
  };
}

// ======================================================================
// 初始化
// ======================================================================
export function initGameplay(deps) {
  G = deps;
  if (!kpi || kpi.day !== today() || !Array.isArray(kpi.list) || kpi.list.some(x => !BY_ID[x.id])) newBatch(0);
  beacon = makeBeacon(G.scene);
  // 1F 前台：接跑腿单
  interactable({ pos: new THREE.Vector3(-1.6, 0.2, 3.4), r: 1.3, icon: '🎁', label: '接一单限时跑腿', cooldown: 1, action: () => startOrder() });
  const c = cv();
  c.addEventListener('mousedown', pointer); c.addEventListener('touchstart', pointer, { passive: false });
  $('#mgQuit').addEventListener('click', () => quitGame());
  $('#tkClaim').addEventListener('click', () => claimBatch());
  $('#qKpi').addEventListener('click', (e) => { e.stopPropagation(); openBoard(); });
  addEventListener('resize', () => { if (MG) { const s = sizeCanvas(); MG.game.init(s); if (MG.state !== 'play') drawFrame(); } });
  renderHud();
}
