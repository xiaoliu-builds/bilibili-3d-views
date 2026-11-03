// 人物交互 2.0：电影感对话（镜头对准 + 黑边 + 立绘 + 打字机 + 口型）、好感度、委托、送礼、击掌、合影、
// 头顶名牌 / 委托气泡 / 环境表情
import * as THREE from 'three';
import { drawIcon, ic } from './icons.js';
import { FLOOR_META, META_BY_KEY } from './floorMeta.js';
import { npcs } from './people.js';
import { hearts } from './props.js';

const $ = (s) => document.querySelector(s);
let D = null;          // 主程序注入
let cur = null;        // 当前对话 { n, stage, text, shown, opts, t }
const _v = new THREE.Vector3();

// ---------------------------------------------------------------- 人设
const NICK = ['阿青', '小林', '阿杰', '糖糖', '大壮', '小鹿', '阿哲', '米粒', '团子', '老周', '小满', '可乐', '星星', '阿岚', '豆豆', '芒果', '小白', '阿森', '七七', '奶盖', '小柚', '阿凯', '布丁', '夏夏'];
const PERSONA = [
  [/程序|技术|摸鱼|实习/, { role: '技术研发部', ico: 'laptop', lines: ['这个 bug 我已经修了三天了…', '我写的代码，以前只有我和上帝看得懂，现在只有上帝了', '上线前一定要先喝杯三连拿铁', '今天的需求，明天的 bug', '摸鱼？不，我在思考架构'] }],
  [/UP|主播|歌手|吉他|混音|录音|摄像|主持|Coser/, { role: '内容创作', ico: 'mic', lines: ['新视频刚过审，记得来一键三连！', '灵感都是在电梯里想到的', '粉丝说我的片头太长了…', '今天直播打算唱三首歌', '剪片到凌晨三点，但看到弹幕就值了'] }],
  [/咖啡|调酒|食堂|外卖|快递|阿姨/, { role: '后勤服务', ico: 'coffee', lines: ['今天推荐「三连拿铁」，燕麦奶版本超好喝', '中午的番茄炒蛋是招牌哦', '这单要送到 22 楼，我得快点', '辛苦啦，记得按时吃饭！', '新品「桂花乌龙」在 26 楼茶水间'] }],
  [/粉丝|游客|参观|访客|观众|情侣|小朋友|面试|客户/, { role: '访客', ico: 'camera', lines: ['原来 B 站总部长这样！', '我是来面试的，有点紧张…', '大堂那台高达也太帅了吧', '听说楼顶能看到整个园区', '第一次来，想去 BW 漫展中心看看'] }],
  [/健身|跑|瑜伽|举铁|散步|老人/, { role: '运动达人', ico: 'dumbbell', lines: ['22 楼健身房的跑步机能看夜景！', '每天一万步，打卡打卡', '练完腿去吃一顿好的', '公园里的鸽子都认识我了'] }],
  [/组长|销售|同传|与会|原画|设计|剪辑|运营/, { role: '业务团队', ico: 'people', lines: ['下午还有三个会…', '这版设计稿改了第 12 版了', '数据涨了！今晚加鸡腿', '同传太考验脑子了', '你是新来的同事吗？欢迎欢迎'] }],
];
const DEFAULT_P = { role: '同事', ico: 'smile', lines: ['你好呀～', '今天也要一键三连哦', '干杯 ( ゜- ゜)つロ', '新番看了吗？', '前方高能！', '要不要一起吃饭？'] };
const SECRETS = [
  '悄悄告诉你：1F 高达隔离带右侧按 E，它会“启动”哦', '12F「弹幕护卫」连击 5 次以上，分数开始翻倍', '限时跑腿只要在一半时间内送到，就算「准时达」，奖励更多',
  '按住 V 能飞起来，从天台起飞看园区最漂亮', '东边公园的摩天轮能升到 48 米高', '地铁可以快速去新世代产业园，滨江的哔哩球晚上会亮',
  '14F 的鼓，跟着底鼓的节拍按，更容易拿 S', '任务板里不想做的任务，可以花 1 硬币换掉', '晚上按 N 切到夜景，大楼外墙会有灯光秀',
];
const RECO = [
  ['roof', '天台观景台', '整个园区和城市都能尽收眼底，夜景绝了'], ['skybar', '29F 空中酒吧', '吧台特调「三连特调」，还有爵士钢琴'], ['game', '12F 游戏中心', '街机、娃娃机，还有「弹幕护卫」'],
  ['library', '27F 空中图书馆', '书墙超好拍，阶梯上看书很惬意'], ['theater', '24F 弹幕放映厅', '巨幕上可以发弹幕，这才是 B 站的看片方式'], ['music', '14F 音乐录音棚', '去打一段「干杯鼓手」吧'],
  ['canteen', '5F 员工餐厅', '今日套餐和草莓小电视蛋糕必点'], ['newgen', '新世代产业园', '滨江的数字云塔和哔哩球，未来感拉满'], ['street', '哔哩步行街', '周边店、奶茶店，还有街头弹唱'],
];
const FAVORS = [
  { item: '三连拿铁', ico: 'coffee', where: '1F 干杯 Cafe' }, { item: '草莓小电视蛋糕', ico: 'cake', where: '5F 员工餐厅的甜品站' },
  { item: '桂花乌龙', ico: 'tea', where: '26F 茶水间' }, { item: '今日套餐', ico: 'bento', where: '5F 员工餐厅' },
  { item: '小电视玩偶', ico: 'teddy', where: '12F 娃娃机' }, { item: '三连特调', ico: 'cocktail', where: '29F 空中酒吧' },
];
function persona(n) {
  if (n._per) return n._per;
  const name = n.name || '路人';
  const P = (PERSONA.find(([re]) => re.test(name)) || [null, DEFAULT_P])[1];
  const idx = npcs.indexOf(n);
  const nick = /小林|阿杰/.test(name) ? name.replace(/^.*?(小林|阿杰)$/, '$1') : NICK[(idx * 7 + 3) % NICK.length];
  n._per = { ...P, nick, key: `${name}#${idx}`, display: name, lines: [...(n.lines || []), ...P.lines] };
  return n._per;
}

// ---------------------------------------------------------------- 好感度
const AFF = JSON.parse(localStorage.getItem('bili_aff') || '{}');
const heartsOf = (n) => Math.min(5, Math.floor((AFF[persona(n).key] || 0) / 20));
function addAff(n, v, why) {
  const k = persona(n).key, before = heartsOf(n);
  AFF[k] = Math.min(100, (AFF[k] || 0) + v); localStorage.setItem('bili_aff', JSON.stringify(AFF));
  const after = heartsOf(n);
  floatHeart(n, v);
  if (after > before) {
    D.Sound.ding(); D.GP.emit('heart', after);
    const P = persona(n);
    if (after === 1) { D.setCoins(D.coins() + 1); D.toast(`${P.display}记住你了！好感度 1 心，+1 硬币`, 'heart', '#FB7299'); }
    else if (after === 2) D.toast(`和${P.display}熟起来了（2 心）——以后 TA 会告诉你一些「小秘密」`, 'heart', '#FB7299');
    else if (after === 3) { D.addItem(`${P.nick}的签名照`, '🖼️'); D.toast(`好感度 3 心！${P.display}送了你一张签名照`, 'frame', '#FB7299'); }
    else if (after === 4) { D.setCoins(D.coins() + 3); D.toast(`好感度 4 心！${P.display}请你喝了杯奶茶，+3 硬币`, 'bubbletea', '#FB7299'); }
    else if (after === 5) { D.setCoins(D.coins() + 5); D.celebrate(6); D.toast(`你和${P.display}成为了挚友！+5 硬币`, 'crown', '#ffb027'); }
    D.GP.gainXP(10 * after);
  }
  if (cur && cur.n === n) renderHead();
}
function floatHeart(n, v) {
  if (v <= 0) return;
  const r = n.p.root; hearts(D.scene, r.position.clone().add(_v.set(0, (n.seated ? 1.3 : 1.85) * r.scale.y, 0)), Math.min(6, 1 + Math.round(v / 6)));
}

// ---------------------------------------------------------------- 立绘（按 NPC 实际外观绘制）
function portrait(g, n, expr = 'normal', mouth = 0) {
  const L = n.p.look || {}, S = g.canvas.width, s = S / 100;
  g.clearRect(0, 0, S, S);
  const top = L.top || '#FB7299';
  const bg = g.createLinearGradient(0, 0, S, S); bg.addColorStop(0, '#ffe3ec'); bg.addColorStop(1, '#d9f1ff'); g.fillStyle = bg; g.fillRect(0, 0, S, S);
  g.fillStyle = 'rgba(255,255,255,0.5)'; for (let i = 0; i < 5; i++) { g.beginPath(); g.arc((15 + i * 19) * s, (12 + (i % 2) * 8) * s, 3 * s, 0, 7); g.fill(); }
  const cx = 50 * s, cy = 50 * s;
  // 身体
  g.fillStyle = top; g.beginPath(); g.ellipse(cx, cy + 50 * s, 36 * s, 26 * s, 0, 0, 7); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.85)'; g.beginPath(); g.moveTo(cx - 9 * s, cy + 25 * s); g.lineTo(cx, cy + 34 * s); g.lineTo(cx + 9 * s, cy + 25 * s); g.fill();
  if (L.badge) { g.strokeStyle = '#00AEEC'; g.lineWidth = 2 * s; g.beginPath(); g.moveTo(cx - 10 * s, cy + 26 * s); g.lineTo(cx - 4 * s, cy + 44 * s); g.moveTo(cx + 10 * s, cy + 26 * s); g.lineTo(cx + 4 * s, cy + 44 * s); g.stroke(); g.fillStyle = '#fff'; g.fillRect(cx - 6 * s, cy + 42 * s, 12 * s, 9 * s); }
  const hair = L.hair || '#2a2026', skin = L.skin || '#ffdcc6';
  g.fillStyle = hair;
  if (L.female && (L.hs === 0 || L.hs === 3)) { g.beginPath(); g.ellipse(cx, cy + (L.hs === 3 ? 12 : 4) * s, 31 * s, (L.hs === 3 ? 40 : 32) * s, 0, 0, 7); g.fill(); }
  if (L.female && L.hs === 1) { g.beginPath(); g.ellipse(cx + 26 * s, cy + 6 * s, 9 * s, 20 * s, -0.35, 0, 7); g.fill(); }
  // 脸
  g.fillStyle = skin; g.beginPath(); g.ellipse(cx, cy, 25 * s, 27 * s, 0, 0, 7); g.fill();
  for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(cx + sx * 25 * s, cy + 2 * s, 4 * s, 6 * s, 0, 0, 7); g.fill(); }
  // 刘海
  g.fillStyle = hair; g.beginPath(); g.ellipse(cx, cy - 13 * s, 27 * s, 18 * s, 0, Math.PI, Math.PI * 2); g.fill();
  g.beginPath(); g.moveTo(cx - 25 * s, cy - 10 * s); g.quadraticCurveTo(cx - 8 * s, cy - 1 * s, cx + 3 * s, cy - 14 * s); g.quadraticCurveTo(cx + 15 * s, cy - 4 * s, cx + 26 * s, cy - 10 * s); g.lineTo(cx + 26 * s, cy - 17 * s); g.lineTo(cx - 25 * s, cy - 17 * s); g.fill();
  if (L.female && L.hs === 2) { g.beginPath(); g.arc(cx, cy - 33 * s, 10 * s, 0, 7); g.fill(); }
  if (L.cap) { g.fillStyle = L.cap; g.beginPath(); g.ellipse(cx, cy - 16 * s, 28 * s, 16 * s, 0, Math.PI, Math.PI * 2); g.fill(); g.fillRect(cx - 4 * s, cy - 18 * s, 36 * s, 5 * s); }
  // 五官（表情）
  g.fillStyle = '#1a1a1a'; g.strokeStyle = '#1a1a1a'; g.lineCap = 'round';
  for (const sx of [-1, 1]) {
    const ex = cx + sx * 9.5 * s, ey = cy + 3 * s;
    if (expr === 'happy') { g.lineWidth = 2.6 * s; g.beginPath(); g.arc(ex, ey + 2 * s, 4 * s, Math.PI * 1.15, Math.PI * 1.85); g.stroke(); }
    else if (expr === 'surprise') { g.beginPath(); g.ellipse(ex, ey, 3.6 * s, 4.8 * s, 0, 0, 7); g.fill(); }
    else { g.beginPath(); g.ellipse(ex, ey, 3 * s, 4.2 * s, 0, 0, 7); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(ex + 1 * s, ey - 1.5 * s, 1.1 * s, 0, 7); g.fill(); g.fillStyle = '#1a1a1a'; }
    g.lineWidth = 1.8 * s; g.beginPath(); g.moveTo(ex - 4 * s, ey - 8 * s - (expr === 'surprise' ? 2 * s : 0)); g.lineTo(ex + 4 * s, ey - 8.6 * s - (expr === 'surprise' ? 2 * s : 0)); g.stroke();
  }
  if (L.glasses) { g.strokeStyle = '#15171c'; g.lineWidth = 1.8 * s; for (const sx of [-1, 1]) { g.beginPath(); g.arc(cx + sx * 9.5 * s, cy + 3 * s, 6.5 * s, 0, 7); g.stroke(); } g.beginPath(); g.moveTo(cx - 3 * s, cy + 3 * s); g.lineTo(cx + 3 * s, cy + 3 * s); g.stroke(); }
  g.fillStyle = 'rgba(255,130,160,0.45)'; for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(cx + sx * 16 * s, cy + 10 * s, 4.5 * s, 2.6 * s, 0, 0, 7); g.fill(); }
  // 嘴（口型随打字机开合）
  g.fillStyle = '#b0545e'; g.strokeStyle = '#b0545e'; g.lineWidth = 2.2 * s;
  if (mouth > 0.1 || expr === 'surprise') { g.beginPath(); g.ellipse(cx, cy + 14 * s, 4 * s, (expr === 'surprise' ? 4 : 1 + mouth * 3) * s, 0, 0, 7); g.fill(); }
  else { g.beginPath(); g.moveTo(cx - 5 * s, cy + 13 * s); g.quadraticCurveTo(cx, cy + (expr === 'happy' ? 19 : 16) * s, cx + 5 * s, cy + 13 * s); g.stroke(); }
}

// ---------------------------------------------------------------- 对话框
function renderHead() {
  const n = cur.n, P = persona(n), h = heartsOf(n), pts = (AFF[P.key] || 0) % 20;
  $('#tbName').textContent = P.display;
  $('#tbRole').innerHTML = `${ic(P.ico)} ${P.role}${h >= 2 ? ` · ${P.nick}` : ''}`;
  $('#tbHearts').innerHTML = Array.from({ length: 5 }, (_, i) => `<i class="${i < h ? 'on' : i === h ? 'part' : ''}" style="${i === h ? `--k:${pts / 20}` : ''}"></i>`).join('');
}
function say(text, opts, expr = 'normal') {
  cur.text = text; cur.shown = 0; cur.opts = opts; cur.expr = expr; cur.speakT = 0;
  $('#tbText').textContent = ''; $('#tbOpts').innerHTML = ''; $('#tbOpts').classList.remove('show');
  cur.n.speaking = true;
}
function showOpts() {
  cur.n.speaking = false;
  $('#tbOpts').innerHTML = cur.opts.map((o, i) => `<button class="${o.hot ? 'hot' : ''} ${o.dis ? 'dis' : ''}" data-i="${i}">${o.ico ? ic(o.ico) : ''}<span>${o.t}</span>${D.isTouch ? '' : `<kbd>${i + 1}</kbd>`}</button>`).join('');
  $('#tbOpts').classList.add('show');
  $('#tbOpts').querySelectorAll('button').forEach(b => b.onclick = (e) => { e.stopPropagation(); pick(+b.dataset.i); });
}
function pick(i) {
  const o = cur?.opts?.[i]; if (!o || o.dis) { if (o?.dis) D.Sound.tone(220, 0.1, { type: 'square', vol: 0.03 }); return; }
  D.Sound.click(); o.fn();
}
function react(n, k, d = 1.6) { n.react = { k, t: 0, d }; }

// ---------------------------------------------------------------- 主菜单（根选项）
function rootOpts() {
  const n = cur.n, P = persona(n), held = D.heldName(), h = heartsOf(n);
  const o = [];
  if (n.favor && !n.favor.done) {
    if (n.favor.accepted && held === n.favor.item) o.push({ t: `把「${held}」交给 TA`, ico: n.favor.ico, hot: true, fn: () => favorDone() });
    else if (!n.favor.accepted) o.push({ t: '你好像有事？', ico: 'hands', hot: true, fn: () => favorAsk() });
  }
  o.push({ t: '聊聊天', ico: 'chat', fn: () => chat() });
  o.push({ t: '有什么推荐的地方？', ico: 'map', fn: () => reco() });
  if (held && held !== '跑腿包裹' && !(n.favor && n.favor.accepted && !n.favor.done && held === n.favor.item)) o.push({ t: `送 TA「${held}」`, ico: 'gift', fn: () => gift(held) });
  else if (!held) o.push({ t: '请 TA 喝奶茶（1 硬币）', ico: 'bubbletea', dis: D.coins() < 1, fn: () => treat() });
  o.push({ t: '击个掌！', ico: 'clap', fn: () => highFive() });
  o.push({ t: '一起合影', ico: 'camera', fn: () => selfie() });
  o.push({ t: '再见', ico: 'wave', fn: () => closeTalk(true) });
  if (h >= 2 && Math.random() < 0.6 && !cur.secretShown) o.splice(1, 0, { t: '有什么小道消息吗？', ico: 'search', fn: () => secret() });
  return o.slice(0, 7);
}
function back(text = '还有什么想聊的？', expr = 'normal') { say(text, rootOpts(), expr); }

function chat() {
  const n = cur.n, P = persona(n);
  n._chat = (n._chat || 0) + 1;
  const line = P.lines[(n._chatIdx = ((n._chatIdx ?? Math.floor(Math.random() * P.lines.length)) + 1) % P.lines.length)];
  react(n, Math.random() < 0.5 ? 'laugh' : 'nod');
  say(line, rootOpts(), 'happy');
  if (!cur.chatted) { cur.chatted = true; D.GP.emit('talk'); addAff(n, n._chat <= 3 ? 8 : 3); }
  D.Sound.tone(520 + Math.random() * 200, 0.06, { type: 'triangle', vol: 0.03 });
}
function secret() {
  const n = cur.n; cur.secretShown = true;
  react(n, 'think', 2.2);
  say(`（小声）${SECRETS[(npcs.indexOf(n) + (n._sec = (n._sec || 0) + 1)) % SECRETS.length]}`, rootOpts(), 'happy');
}
function reco() {
  const n = cur.n, here = D.levelKey();
  const list = RECO.filter(r => r[0] !== here); const r = list[(npcs.indexOf(n) + (n._reco = (n._reco || 0) + 1)) % list.length];
  react(n, 'point', 2);
  say(`推荐你去「${r[1]}」！${r[2]}。`, [
    { t: '带我去看看！', ico: 'rocket', hot: true, fn: () => { closeTalk(false); D.goto(r[0], r[1]); } },
    { t: '好的，下次去', ico: 'thumb', fn: () => back('嗯嗯，有空一定要去哦～', 'happy') },
  ], 'happy');
}
function gift(item) {
  const n = cur.n; D.consumeHeld();
  react(n, 'cheer', 2); D.Sound.win();
  say(`哇，「${item}」！送给我的吗？谢谢你～`, rootOpts(), 'happy');
  addAff(n, 25); D.GP.emit('gift'); D.GP.gainXP(15);
}
function treat() {
  const n = cur.n; D.setCoins(D.coins() - 1); D.Sound.coin();
  react(n, 'bow', 1.4);
  say('请我喝奶茶？你人也太好了吧！下次我请回来～', rootOpts(), 'happy');
  addAff(n, 15); D.GP.emit('gift');
}
function highFive() {
  const n = cur.n;
  react(n, 'highfive', 1.3); D.gesture('reach');
  setTimeout(() => { D.Sound.noise(0.06, { vol: 0.4, freq: 2600 }); D.Sound.tone(880, 0.08, { type: 'triangle', vol: 0.05 }); }, 380);
  say(['耶！✋', '好耶！击掌成功！', '干杯——不对，击掌！'][Math.floor(Math.random() * 3)], rootOpts(), 'happy');
  if (!cur.hi5) { cur.hi5 = true; addAff(n, 4); D.GP.emit('highfive'); }
}
function selfie() {
  const n = cur.n;
  react(n, 'pose', 3.2);
  say('来来来，看镜头——茄子！', [], 'happy');
  setTimeout(() => { if (!cur || cur.n !== n) return; closeTalk(false, true); setTimeout(() => { D.takePhoto(); addAff(n, 5); }, 120); }, 1100);
}
function favorAsk() {
  const n = cur.n, F = n.favor;
  react(n, 'think', 2);
  say(`其实……能帮我从${F.where}带一份「${F.item}」吗？忙得走不开了。`, [
    { t: '包在我身上！', ico: 'thumb', hot: true, fn: () => { F.accepted = true; react(n, 'cheer', 1.4); D.toast(`接受委托：去${F.where}拿「${F.item}」交给${persona(n).display}`, F.ico, '#7A5CFF'); say('太好了，拜托啦！我就在这儿等你～', rootOpts(), 'happy'); } },
    { t: '现在有点忙', ico: 'nope', fn: () => back('没关系，有空再说～') },
  ], 'normal');
}
function favorDone() {
  const n = cur.n, F = n.favor; F.done = true; D.consumeHeld();
  react(n, 'cheer', 2.2); D.Sound.win(); D.celebrate(3);
  D.setCoins(D.coins() + 3);
  say(`就是这个！「${F.item}」，你真是救星！这是给你的谢礼～`, rootOpts(), 'happy');
  D.toast(`委托完成！+3 硬币 · 好感度大幅提升`, 'hands', '#2ec27e');
  addAff(n, 30); D.GP.emit('favor'); D.GP.gainXP(40);
}

// ---------------------------------------------------------------- 打开 / 关闭
export function openTalk(n) {
  if (cur || !D) return;
  const P = persona(n);
  cur = { n, t: 0, prevMode: D.getMode() };
  window.__talk = true; D.setMode('talk'); document.exitPointerLock?.();
  document.body.classList.add('talking');
  n.talking = true; n.greetT = 0;
  $('#talkBox').classList.add('show');
  renderHead();
  react(n, 'wave', 1.4);
  D.Sound.tone(660, 0.07, { type: 'triangle', vol: 0.04 }); setTimeout(() => D.Sound.tone(880, 0.08, { type: 'triangle', vol: 0.04 }), 70);
  const first = !n._met; n._met = true;
  const h = heartsOf(n);
  const hello = first && h === 0 ? `初次见面！我是${P.nick}，在这里${/访客/.test(P.role) ? '参观' : `做${P.role === '同事' ? '日常工作' : P.role}`}。你是新来的同事吧？`
    : h >= 4 ? `是你呀！最好的朋友来啦～` : h >= 2 ? `嘿，${['又见面了', '今天也辛苦啦', '你来得正好'][Math.floor(Math.random() * 3)]}！` : `你好呀～有什么事吗？`;
  say(hello, rootOpts(), 'happy');
}
export function closeTalk(bye = false, keepFace = false) {
  if (!cur) return;
  const n = cur.n; cur = null;
  n.talking = false; n.speaking = false;
  if (bye) { react(n, 'wave', 1.2); D.Sound.tone(700, 0.06, { type: 'triangle', vol: 0.03 }); }
  $('#talkBox').classList.remove('show'); document.body.classList.remove('talking');
  window.__talk = false; D.resume();
}
export const isTalking = () => !!cur;

// ---------------------------------------------------------------- 3D 名牌 / 委托气泡 / 环境表情
const TAG_N = 4, EMO_N = 3;
let tags = [], favMarks = [], emos = [], scanT = 0, emoT = 2;
const iconTexCache = new Map();
function iconTex(name, bubble = false) {
  const k = name + bubble; if (iconTexCache.has(k)) return iconTexCache.get(k);
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const paint = () => {
    g.clearRect(0, 0, 128, 128);
    if (bubble) { g.fillStyle = 'rgba(255,255,255,0.95)'; g.beginPath(); g.roundRect(10, 6, 108, 96, 30); g.fill(); g.beginPath(); g.moveTo(52, 100); g.lineTo(64, 122); g.lineTo(76, 100); g.fill(); g.strokeStyle = '#FB7299'; g.lineWidth = 5; g.beginPath(); g.roundRect(10, 6, 108, 96, 30); g.stroke(); }
    const ok = drawIcon(g, name, 64, bubble ? 54 : 64, bubble ? 78 : 118); tex.needsUpdate = true; return ok;
  };
  if (!paint()) { const iv = setInterval(() => { if (paint()) clearInterval(iv); }, 300); }
  iconTexCache.set(k, tex); return tex;
}
function makeSprite(tex, sx, sy) {
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false, fog: false }));
  sp.scale.set(sx, sy, 1); sp.renderOrder = 25; sp.visible = false; D.scene.add(sp); return sp;
}
function tagTex(n) {
  const P = persona(n), h = heartsOf(n), key = `${h}|${n.favor && !n.favor.done ? (n.favor.accepted ? 'a' : 'f') : ''}`;
  if (n._tag && n._tag.key === key) return n._tag.tex;
  const c = n._tag?.c || document.createElement('canvas'); c.width = 320; c.height = 96; const g = c.getContext('2d');
  g.clearRect(0, 0, 320, 96);
  g.font = '900 30px "Noto Sans SC","PingFang SC",sans-serif'; const tw = Math.min(250, g.measureText(P.display).width);
  const w = Math.max(150, tw + 40), x0 = (320 - w) / 2;
  g.fillStyle = 'rgba(16,14,30,0.78)'; g.beginPath(); g.roundRect(x0, 4, w, 52, 26); g.fill();
  g.strokeStyle = 'rgba(251,114,153,0.9)'; g.lineWidth = 3; g.stroke();
  g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(P.display, 160, 31, 250);
  for (let i = 0; i < 5; i++) { g.globalAlpha = i < h ? 1 : 0.28; drawIcon(g, 'heart', 160 + (i - 2) * 26, 76, 24); }
  g.globalAlpha = 1;
  const tex = n._tag?.tex || new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.needsUpdate = true;
  n._tag = { c, tex, key }; return tex;
}
const EMO_BY = { type: ['laptop', 'bolt', 'notes'], eat: ['bento', 'heart'], read: ['book_open', 'sparkles'], phone: ['chat', 'camera', 'thumb'], chat: ['chat', 'smile', 'heart'], sit: ['coffee', 'smile', 'sleep'], walk: ['notes', 'smile'], jog: ['run', 'bolt'], idle: ['sparkles', 'smile', 'notes'] };
function headPos(n, extra = 0) { const r = n.p.root; return _v.set(r.position.x, r.position.y + ((n.seated ? 1.36 : 1.95) + extra) * r.scale.y, r.position.z); }

function tickWorld(dt) {
  const cam = D.camera.position, me = D.player.pos, t = performance.now() / 1000;
  if ((scanT -= dt) <= 0) {
    scanT = 0.15;
    const near = [];
    for (const n of npcs) {
      const r = n.p.root; if (!r.visible || Math.abs(r.position.y - me.y) > 1.8) continue;
      const d = Math.hypot(r.position.x - me.x, r.position.z - me.z); if (d < 7) near.push([d, n]);
    }
    near.sort((a, b) => a[0] - b[0]);
    for (let i = 0; i < TAG_N; i++) { const s = tags[i], e = near[i]; if (!e || cur) { s.visible = false; s.userData.n = null; continue; } s.userData.n = e[1]; s.userData.d = e[0]; s.material.map = tagTex(e[1]); s.visible = true; }
  }
  for (const s of tags) { if (!s.visible || !s.userData.n) continue; s.position.copy(headPos(s.userData.n, 0.22)); s.material.opacity = Math.min(1, (7 - s.userData.d) / 2); }
  // 委托气泡
  for (const m of favMarks) {
    const n = m.userData.n, r = n.p.root;
    const show = n.favor && !n.favor.done && r.visible && Math.abs(r.position.y - me.y) < 1.8 && Math.hypot(r.position.x - me.x, r.position.z - me.z) < 28 && !(cur && cur.n === n);
    m.visible = !!show; if (!show) continue;
    m.position.copy(headPos(n, 0.62 + Math.sin(t * 2.6 + m.id) * 0.06));
    const sc = n.favor.accepted ? 0.42 : 0.5 + Math.sin(t * 5) * 0.03; m.scale.set(sc, sc, 1);
  }
  // 环境表情：周围的人偶尔冒出小表情，场景更有生气
  if ((emoT -= dt) <= 0 && !cur) {
    emoT = 2.2 + Math.random() * 2.5;
    const cand = npcs.filter(n => n.p.root.visible && !n.talking && !(n.favor && !n.favor.done) && Math.abs(n.p.root.position.y - me.y) < 1.8 && Math.hypot(n.p.root.position.x - me.x, n.p.root.position.z - me.z) < 16);
    const e = emos.find(s => !s.visible);
    if (cand.length && e) { const n = cand[Math.floor(Math.random() * cand.length)], opts = EMO_BY[n.behavior] || EMO_BY.idle; e.material.map = iconTex(opts[Math.floor(Math.random() * opts.length)], true); e.userData = { n, t: 0 }; e.visible = true; }
  }
  for (const e of emos) {
    if (!e.visible) continue; const u = e.userData; u.t += dt;
    const k = u.t < 0.25 ? u.t / 0.25 : u.t > 2.2 ? Math.max(0, 1 - (u.t - 2.2) / 0.3) : 1;
    const sc = 0.42 * (u.t < 0.25 ? 0.6 + 0.55 * Math.sin(k * Math.PI * 0.75) : k);
    e.scale.set(sc, sc, 1); e.position.copy(headPos(u.n, 0.5 + u.t * 0.05)); e.material.opacity = k;
    if (u.t > 2.5) e.visible = false;
  }
}

// ---------------------------------------------------------------- 每帧
let blinkT = 0;
export function tickDialogue(dt) {
  if (!D) return;
  tickWorld(dt);
  if (!cur) return;
  const n = cur.n; cur.t += dt;
  // 镜头：平滑对准 NPC 面部 + 轻微推近
  const hp = headPos(n, -0.12), cam = D.camera.position;
  const yaw = Math.atan2(-(hp.x - cam.x), -(hp.z - cam.z)), dist = Math.hypot(hp.x - cam.x, hp.z - cam.z);
  const pitch = Math.atan2(hp.y - cam.y, Math.max(0.6, dist));
  let dy = yaw - D.player.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
  const k = Math.min(1, dt * 5);
  D.player.yaw += dy * k; D.player.pitch += (pitch - D.player.pitch) * k;
  D.syncLook(); D.camera.rotation.set(D.player.pitch, D.player.yaw, 0);
  const fov = D.baseFov() - 14; if (Math.abs(D.camera.fov - fov) > 0.05) { D.camera.fov += (fov - D.camera.fov) * k; D.camera.updateProjectionMatrix(); }
  // 打字机
  if (cur.shown < cur.text.length) {
    cur.shown = Math.min(cur.text.length, cur.shown + dt * 34);
    $('#tbText').textContent = cur.text.slice(0, Math.floor(cur.shown));
    if (Math.floor(cur.shown) % 3 === 0 && (cur.speakT -= dt) <= 0) { cur.speakT = 0.07; D.Sound.tone(420 + (npcs.indexOf(n) % 5) * 60 + Math.random() * 40, 0.035, { type: 'triangle', vol: 0.018 }); }
    if (cur.shown >= cur.text.length) showOpts();
  }
  // 立绘：口型 + 眨眼
  blinkT -= dt; const blink = blinkT < 0.1; if (blinkT < 0) blinkT = 2 + Math.random() * 2.5;
  const mouth = n.speaking ? Math.abs(Math.sin(cur.t * 18)) : 0;
  portrait($('#tbPortrait').getContext('2d'), n, blink && cur.expr !== 'happy' ? 'happy' : cur.expr, mouth);
}

// ---------------------------------------------------------------- 初始化
export function initDialogue(deps) {
  D = deps;
  for (let i = 0; i < TAG_N; i++) tags.push(makeSprite(null, 1.05, 0.315));
  for (let i = 0; i < EMO_N; i++) emos.push(makeSprite(null, 0.42, 0.42));
  // 随机挑 6 位站着 / 坐着的同事发布委托（每次进游戏不同）
  const pool = npcs.filter(n => n.behavior !== 'walk' && n.behavior !== 'jog' && n.name && n.p.root.position.y < 125).sort(() => Math.random() - 0.5).slice(0, 6);
  pool.forEach((n, i) => {
    const F = FAVORS[i % FAVORS.length];
    n.favor = { ...F, accepted: false, done: false };
    const m = makeSprite(iconTex(F.ico, true), 0.5, 0.5); m.userData.n = n; favMarks.push(m);
  });
  // 对话框交互
  $('#tbText').parentElement.addEventListener('click', () => { if (cur && cur.shown < cur.text.length) { cur.shown = cur.text.length; $('#tbText').textContent = cur.text; showOpts(); } });
  $('#tbClose').addEventListener('click', (e) => { e.stopPropagation(); closeTalk(true); });
  document.addEventListener('keydown', (e) => {
    if (!cur) return;
    e.stopPropagation();
    if (e.code === 'Escape') { e.preventDefault(); closeTalk(true); return; }
    if (['KeyE', 'Space', 'Enter'].includes(e.code)) {
      e.preventDefault();
      if (cur.shown < cur.text.length) { cur.shown = cur.text.length; $('#tbText').textContent = cur.text; showOpts(); }
      return;
    }
    const m = e.code.match(/^(?:Digit|Numpad)([1-9])$/); if (m) { e.preventDefault(); pick(+m[1] - 1); }
  }, true);
  blinkT = 2;
}
