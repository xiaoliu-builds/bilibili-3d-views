// 人物系统：多样化外观 + 行为（走动 / 坐着打字 / 站着聊天 / 看手机 / 跑步）+ 按 E 对话打招呼
import * as THREE from 'three';
import { ctx, std } from './common.js';
import { interactable } from './districts.js';
import { PINK, BLUE } from './textures.js';
import { hearts, floatText } from './props.js';

const SKIN = [0xffdcc6, 0xf3c9a6, 0xe7b48f, 0xc98f68, 0xa8714c];
const HAIR = [0x1d1a1f, 0x3a2a22, 0x6b4a33, 0xb88a5a, 0xf2c3d4, 0x9fd6ff, 0xd9d9d9];
const TOPS = [0xfb7299, 0x00aeec, 0xffffff, 0xffd166, 0x8bd17c, 0x9b8cff, 0x2a3550, 0x3c3f46, 0xe85d3b, 0xf0e6d8];
const BOTTOMS = [0x2b3040, 0x44506a, 0x6a5a4a, 0x1d2027, 0x8a7a6a, 0x3a5a7a];
const SHOES = [0xf5f5f5, 0x15171c, 0x8a5a36, 0xfb7299];

const G = {
  head: new THREE.SphereGeometry(0.115, 18, 14),
  hairShort: new THREE.SphereGeometry(0.122, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.55),
  hairBob: new THREE.CylinderGeometry(0.13, 0.12, 0.2, 18, 1, true),
  ponytail: new THREE.CapsuleGeometry(0.04, 0.14, 4, 8),
  bun: new THREE.SphereGeometry(0.055, 10, 8),
  torso: new THREE.CapsuleGeometry(0.15, 0.3, 4, 12),
  hip: new THREE.CylinderGeometry(0.145, 0.15, 0.16, 12),
  upperLeg: new THREE.CapsuleGeometry(0.06, 0.32, 4, 8),
  lowerLeg: new THREE.CapsuleGeometry(0.052, 0.32, 4, 8),
  shoe: new THREE.BoxGeometry(0.1, 0.06, 0.2),
  upperArm: new THREE.CapsuleGeometry(0.045, 0.24, 4, 8),
  lowerArm: new THREE.CapsuleGeometry(0.04, 0.22, 4, 8),
  hand: new THREE.SphereGeometry(0.045, 10, 8),
  neck: new THREE.CylinderGeometry(0.045, 0.05, 0.08, 8),
  eye: new THREE.SphereGeometry(0.014, 8, 6),
  phone: new THREE.BoxGeometry(0.06, 0.11, 0.008),
  bag: new THREE.BoxGeometry(0.26, 0.32, 0.12),
  glasses: new THREE.TorusGeometry(0.028, 0.005, 6, 16),
  skirt: new THREE.ConeGeometry(0.22, 0.32, 16, 1, true),
  brow: new THREE.BoxGeometry(0.04, 0.009, 0.01),
  mouth: new THREE.BoxGeometry(0.036, 0.008, 0.008),
  nose: new THREE.SphereGeometry(0.014, 8, 6),
  ear: new THREE.SphereGeometry(0.022, 8, 6),
  blush: new THREE.CircleGeometry(0.018, 10),
  collar: new THREE.TorusGeometry(0.075, 0.018, 6, 16),
  belt: new THREE.CylinderGeometry(0.152, 0.152, 0.03, 14),
  sole: new THREE.BoxGeometry(0.105, 0.022, 0.21),
  capTop: new THREE.SphereGeometry(0.125, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.5),
  capBrim: new THREE.CylinderGeometry(0.11, 0.11, 0.012, 16, 1, false, -Math.PI / 2, Math.PI),
  shadow: new THREE.CircleGeometry(0.34, 20),
  longHair: new THREE.CylinderGeometry(0.125, 0.105, 0.36, 18, 1, true, Math.PI * 0.15, Math.PI * 1.7),
  hood: new THREE.TorusGeometry(0.1, 0.045, 8, 16, Math.PI),
  cup: new THREE.CylinderGeometry(0.035, 0.028, 0.11, 12),
  lid: new THREE.CylinderGeometry(0.037, 0.037, 0.015, 12),
  laptop: new THREE.BoxGeometry(0.3, 0.02, 0.22),
  jacket: new THREE.CapsuleGeometry(0.155, 0.3, 4, 12, 1),
  badge: new THREE.BoxGeometry(0.05, 0.07, 0.005),
  lanyard: new THREE.TorusGeometry(0.09, 0.004, 4, 16, Math.PI),
};
let _shadowM = null;
function shadowMat() {
  if (_shadowM) return _shadowM;
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  const rg = g.createRadialGradient(32, 32, 0, 32, 32, 32); rg.addColorStop(0, 'rgba(0,0,0,0.55)'); rg.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = rg; g.fillRect(0, 0, 64, 64);
  _shadowM = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false });
  return _shadowM;
}
const matCache = new Map();
const M = (c, o = {}) => { const k = c + JSON.stringify(o); if (!matCache.has(k)) matCache.set(k, std(c, { roughness: 0.75, ...o })); return matCache.get(k); };
const eyeM = new THREE.MeshBasicMaterial({ color: 0x1a1a1a });
const screenM = new THREE.MeshBasicMaterial({ color: new THREE.Color(0x7fd8ff).multiplyScalar(1.3), toneMapped: false });

/** 生成一个带关节的人物；返回 { root, parts } */
export function makePerson(seed = 0, opts = {}) {
  const R = (n) => { seed = (seed * 9301 + 49297) % 233280; return Math.floor(seed / 233280 * n); };
  const skin = M(SKIN[R(SKIN.length)]), hair = M(HAIR[R(HAIR.length)], { roughness: 0.55 });
  const top = M(opts.top ?? TOPS[R(TOPS.length)]), bottom = M(opts.bottom ?? BOTTOMS[R(BOTTOMS.length)]), shoe = M(SHOES[R(SHOES.length)], { roughness: 0.4 });
  const female = opts.female ?? R(2) === 0;
  const scale = opts.child ? 0.62 : 0.94 + R(12) / 100;
  const root = new THREE.Group();
  const body = new THREE.Group(); root.add(body);
  const hips = new THREE.Group(); hips.position.y = 0.9; body.add(hips);
  const hip = new THREE.Mesh(G.hip, bottom); hips.add(hip);
  const spine = new THREE.Group(); spine.position.y = 0.05; hips.add(spine);
  const torso = new THREE.Mesh(G.torso, top); torso.position.y = 0.27; torso.scale.set(female ? 0.92 : 1.05, 1, 0.78); spine.add(torso);
  const neck = new THREE.Mesh(G.neck, skin); neck.position.y = 0.55; spine.add(neck);
  const headG = new THREE.Group(); headG.position.y = 0.68; spine.add(headG);
  const head = new THREE.Mesh(G.head, skin); head.scale.set(0.95, 1.05, 1); headG.add(head);
  const eyes = [];
  for (const sx of [-0.04, 0.04]) {
    const e = new THREE.Mesh(G.eye, eyeM); e.position.set(sx, 0.015, 0.105); headG.add(e); eyes.push(e);
    const br = new THREE.Mesh(G.brow, hair); br.position.set(sx, 0.05, 0.108); br.rotation.z = sx > 0 ? -0.12 : 0.12; headG.add(br);
    const ear = new THREE.Mesh(G.ear, skin); ear.position.set(sx * 2.75, 0.0, 0); ear.scale.set(0.6, 1, 0.9); headG.add(ear);
  }
  const nose = new THREE.Mesh(G.nose, skin); nose.position.set(0, -0.01, 0.115); headG.add(nose);
  const mouth = new THREE.Mesh(G.mouth, M(0xb0545e)); mouth.position.set(0, -0.045, 0.106); headG.add(mouth);
  if (female && R(2)) for (const sx of [-0.06, 0.06]) { const b = new THREE.Mesh(G.blush, M(0xff9fb0, { transparent: true, opacity: 0.55 })); b.position.set(sx, -0.02, 0.104); headG.add(b); }
  const hs = female ? R(4) : R(3);
  const h1 = new THREE.Mesh(G.hairShort, hair); h1.position.y = 0.02; h1.rotation.x = -0.2; headG.add(h1);
  if (female && hs === 0) { const b = new THREE.Mesh(G.hairBob, hair); b.position.set(0, -0.04, -0.01); headG.add(b); }
  let tail = null;
  if (female && hs === 1) { tail = new THREE.Group(); tail.position.set(0, 0.03, -0.11); headG.add(tail); const p = new THREE.Mesh(G.ponytail, hair); p.position.set(0, -0.08, -0.02); p.rotation.x = 0.35; tail.add(p); }
  if (female && hs === 2) { const b = new THREE.Mesh(G.bun, hair); b.position.set(0, 0.11, -0.06); headG.add(b); }
  if (female && hs === 3) { const lh = new THREE.Mesh(G.longHair, M(hair.color.getHex(), { roughness: 0.55, side: THREE.DoubleSide })); lh.position.set(0, -0.11, -0.012); lh.rotation.y = Math.PI; headG.add(lh); }
  const look = { skin: '#' + skin.color.getHexString(), hair: '#' + hair.color.getHexString(), top: '#' + top.color.getHexString(), female, hs, glasses: false, cap: null, badge: false };
  if (R(5) === 0 && (look.glasses = true)) for (const sx of [-0.042, 0.042]) { const g = new THREE.Mesh(G.glasses, M(0x15171c)); g.position.set(sx, 0.015, 0.11); headG.add(g); }
  if (!female && R(5) === 0) { const capM = M([0xfb7299, 0x00aeec, 0x15171c, 0xffffff][R(4)]); look.cap = '#' + capM.color.getHexString(); const ct = new THREE.Mesh(G.capTop, capM); ct.position.y = 0.03; headG.add(ct); const cb = new THREE.Mesh(G.capBrim, capM); cb.position.set(0, 0.035, 0.09); cb.rotation.x = 0.15; headG.add(cb); }
  // 领口 + 腰带
  const collar = new THREE.Mesh(G.collar, M([0xffffff, 0xf0e6d8, 0x2a3550][R(3)])); collar.rotation.x = Math.PI / 2; collar.position.y = 0.53; spine.add(collar);
  const belt = new THREE.Mesh(G.belt, M(0x2a1e18, { roughness: 0.5 })); belt.position.y = 0.05; hips.add(belt);
  const longSleeve = R(3) === 0;
  const style = R(5);   // 0 帽衫 · 1 敞开外套 · 其他 T恤/衬衫
  if (style === 0) { const hd = new THREE.Mesh(G.hood, top); hd.position.set(0, 0.52, -0.08); hd.rotation.set(-0.6, 0, Math.PI); spine.add(hd); }
  if (style === 1) { const jk = new THREE.Mesh(G.jacket, M([0x2a3550, 0x3c3f46, 0x6b4a33, 0xf0e6d8][R(4)])); jk.position.y = 0.27; jk.scale.set(female ? 0.98 : 1.1, 1.02, 0.84); jk.material = jk.material.clone(); jk.material.side = THREE.BackSide; spine.add(jk); }
  if ((R(3) === 0 || opts.badge) && (look.badge = true)) { const ly = new THREE.Mesh(G.lanyard, M(0x00aeec)); ly.position.set(0, 0.47, 0.06); ly.rotation.set(0.3, 0, Math.PI); spine.add(ly); const bd = new THREE.Mesh(G.badge, M(0xffffff, { roughness: 0.3 })); bd.position.set(0, 0.36, 0.125); spine.add(bd); }
  // 手臂（肩 → 肘）
  const arms = [];
  for (const sx of [-1, 1]) {
    const sh = new THREE.Group(); sh.position.set(sx * 0.19, 0.45, 0); spine.add(sh);
    const ua = new THREE.Mesh(G.upperArm, top); ua.position.y = -0.14; sh.add(ua);
    const el = new THREE.Group(); el.position.y = -0.29; sh.add(el);
    const la = new THREE.Mesh(G.lowerArm, longSleeve ? top : skin); la.position.y = -0.13; el.add(la);
    const hd = new THREE.Mesh(G.hand, skin); hd.position.y = -0.27; el.add(hd);
    arms.push({ sh, el, hd });
  }
  // 腿（髋 → 膝）
  const legs = [];
  for (const sx of [-1, 1]) {
    const hp = new THREE.Group(); hp.position.set(sx * 0.08, -0.04, 0); hips.add(hp);
    const ul = new THREE.Mesh(G.upperLeg, bottom); ul.position.y = -0.2; hp.add(ul);
    const kn = new THREE.Group(); kn.position.y = -0.42; hp.add(kn);
    const ll = new THREE.Mesh(G.lowerLeg, female && R(2) ? skin : bottom); ll.position.y = -0.2; kn.add(ll);
    const ft = new THREE.Group(); ft.position.set(0, -0.42, 0); kn.add(ft);
    const sh = new THREE.Mesh(G.shoe, shoe); sh.position.set(0, 0, 0.04); ft.add(sh);
    const so = new THREE.Mesh(G.sole, M(0xf2f2f2, { roughness: 0.6 })); so.position.set(0, -0.035, 0.04); ft.add(so);
    legs.push({ hp, kn, ft });
  }
  if (female && R(3) === 0) { const sk = new THREE.Mesh(G.skirt, bottom); sk.position.y = -0.12; sk.material = M(bottom.color.getHex(), { side: THREE.DoubleSide }); hips.add(sk); }
  // 配件：双肩包 / 手机
  let phone = null;
  if (opts.bag ?? R(3) === 0) { const b = new THREE.Mesh(G.bag, M([0x2a3550, 0xfb7299, 0x15171c, 0x00aeec][R(4)])); b.position.set(0, 0.3, -0.16); spine.add(b); }
  if (opts.cup ?? (R(6) === 0)) { const cg = new THREE.Group(); const c1 = new THREE.Mesh(G.cup, M(0xffffff, { roughness: 0.5 })); const c2 = new THREE.Mesh(G.lid, M(0x2a2d34)); c2.position.y = 0.06; const sl = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.032, 0.04, 12), M(0xfb7299)); cg.add(c1, c2, sl); cg.position.set(0, -0.06, 0.04); arms[0].hd.add(cg); }
  if (opts.phone) { phone = new THREE.Mesh(G.phone, M(0x15171c)); const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.052, 0.098), screenM); scr.position.z = 0.005; phone.add(scr); arms[1].hd.add(phone); phone.position.set(0, -0.03, 0.03); phone.rotation.x = -0.6; }
  root.scale.setScalar(scale);
  root.traverse(o => { if (o.isMesh) o.castShadow = false; });
  // 脚下接触阴影
  const sh = new THREE.Mesh(G.shadow, shadowMat()); sh.rotation.x = -Math.PI / 2; sh.position.y = 0.02; sh.renderOrder = 2; root.add(sh);
  root.userData.dynamic = true;
  return { root, body, hips, spine, headG, arms, legs, phone, eyes, tail, mouth, look };
}

// 姿势
function poseWalk(p, ph, amp = 1) {
  const s = Math.sin(ph) * 0.55 * amp, c = Math.cos(ph);
  p.legs[0].hp.rotation.x = s; p.legs[1].hp.rotation.x = -s;
  p.legs[0].kn.rotation.x = Math.max(0, -Math.sin(ph - 0.6)) * 0.9 * amp; p.legs[1].kn.rotation.x = Math.max(0, Math.sin(ph - 0.6)) * 0.9 * amp;
  p.arms[0].sh.rotation.x = -s * 0.8; p.arms[1].sh.rotation.x = s * 0.8;
  p.arms[0].el.rotation.x = -0.25 - Math.max(0, s) * 0.4; p.arms[1].el.rotation.x = -0.25 - Math.max(0, -s) * 0.4;
  p.hips.position.y = 0.9 + Math.abs(c) * 0.035 * amp;
  p.hips.rotation.z = Math.sin(ph) * 0.035 * amp;
  p.spine.rotation.y = s * 0.12; p.spine.rotation.x = 0.04 * amp; p.spine.rotation.z = -Math.sin(ph) * 0.02 * amp;
  // 脚掌：抵消大腿+小腿旋转，让鞋底大致贴地；蹬地时脚尖下压
  for (let i = 0; i < 2; i++) { const l = p.legs[i]; l.ft.rotation.x = -(l.hp.rotation.x + l.kn.rotation.x) + Math.max(0, (i ? -1 : 1) * Math.sin(ph + 0.4)) * 0.35 * amp; }
}
function poseSit(p) {
  for (const l of p.legs) { l.hp.rotation.x = -1.5; l.kn.rotation.x = 1.5; l.ft.rotation.x = 0; }
  p.hips.position.y = 0.48;
  for (const a of p.arms) { a.sh.rotation.x = -0.55; a.el.rotation.x = -0.9; }
}
function poseStand(p) { p.hips.rotation.z = 0; p.spine.rotation.z = 0; for (const l of p.legs) { l.hp.rotation.x = 0; l.kn.rotation.x = 0; l.ft.rotation.x = 0; } p.hips.position.y = 0.9; for (const a of p.arms) { a.sh.rotation.set(0, 0, 0); a.el.rotation.x = -0.12; } }

// ======================================================================
export const npcs = [];
const GREET = ['你好呀～', '欢迎来 B 站！', '今天也要一键三连哦', '干杯 ( ゜- ゜)つロ', '新番看了吗？', '加班中…', '前方高能！', 'awsl', '要不要一起吃饭？', '这个 bug 修好了！'];

/** walk：沿路线循环；sit：坐着（type 打字 / talk 聊天 / read）；stand：站着（phone / chat）；jog：慢跑 */
export function addNPC(scene, cfg) {
  const p = makePerson(cfg.seed ?? npcs.length * 7 + 3, { phone: cfg.behavior === 'phone', ...cfg.look });
  p.root.position.copy(cfg.pos); p.root.rotation.y = cfg.yaw ?? 0;
  p.root.userData.npc = cfg.name || '路人';
  scene.add(p.root);
  const n = { ...cfg, p, ph: Math.random() * 6, t: Math.random() * 10, greetT: 0, baseYaw: cfg.yaw ?? 0, s: 0, headTurn: 0 };
  if (cfg.route) {
    const segs = []; let total = 0;
    for (let i = 0; i < cfg.route.length; i++) { const a = cfg.route[i], b = cfg.route[(i + 1) % cfg.route.length]; const len = Math.hypot(b[0] - a[0], b[1] - a[1]); segs.push({ a, b, len, start: total }); total += len; }
    n.segs = segs; n.total = total; n.s = Math.random() * total; n.v = cfg.speed ?? (1.0 + Math.random() * 0.4);
  }
  if (cfg.behavior === 'sit' || cfg.behavior === 'type' || cfg.behavior === 'read' || cfg.behavior === 'eat') poseSit(p); else poseStand(p);
  npcs.push(n);
  // 按 E 对话：打开电影感对话框（js/dialogue.js）；对话系统未就绪时退回简单打招呼
  const nm = cfg.name || '路人';
  interactable({
    get pos() { return p.root.position; }, r: 1.8, cooldown: 0.8,
    get icon() { return n.favor && !n.favor.done ? (n.favor.accepted ? '🎁' : '🤲') : '💬'; },
    get label() { return n.favor && !n.favor.done ? (n.favor.accepted ? `把东西交给${nm}` : `${nm}好像有事找你`) : `和${nm}聊聊`; },
    action: (api) => {
      if (ctx.openTalk) return ctx.openTalk(n);
      n.greetT = 2.6;
      const line = cfg.lines ? cfg.lines[Math.floor(Math.random() * cfg.lines.length)] : GREET[Math.floor(Math.random() * GREET.length)];
      api.toast(`${nm}：“${line}”`, '💬', cfg.color || PINK);
    },
  });
  return n;
}

const _tmp = new THREE.Vector3();
/** 玩家与 NPC 的软碰撞：把玩家位置推出 NPC 半径（返回是否碰到） */
export function pushOutOfNPCs(pos, radius = 0.35) {
  let hit = false;
  for (const n of npcs) {
    const r = n.p.root; if (!r.visible || Math.abs(r.position.y - pos.y) > 1.2) continue;
    const dx = pos.x - r.position.x, dz = pos.z - r.position.z, d = Math.hypot(dx, dz), min = radius + 0.3 * r.scale.x;
    if (d < min && d > 1e-4) { pos.x = r.position.x + dx / d * min; pos.z = r.position.z + dz / d * min; hit = true; if (!n.bumpT || n.bumpT <= 0) { n.bumpT = 1.2; n.greetT = Math.max(n.greetT, 0.9); } }
  }
  return hit;
}
export function updateNPCs(dt, playerPos, camPos) {
  for (const n of npcs) {
    const p = n.p, r = p.root;
    // 距离剔除：超过 90m 不更新也不渲染
    const d2 = r.position.distanceToSquared(camPos);
    r.visible = d2 < 90 * 90 && (Math.abs(r.position.y - camPos.y) < 12 || d2 < 40 * 40);
    if (!r.visible) continue;
    n.t += dt; if (n.bumpT > 0) n.bumpT -= dt;
    // 眨眼
    n.blink = (n.blink ?? 2 + Math.random() * 3) - dt;
    const eyeS = n.blink < 0.12 ? 0.15 : 1; if (n.blink < 0) n.blink = 2.5 + Math.random() * 3.5;
    for (const e of p.eyes) e.scale.y = eyeS;
    // 呼吸
    p.spine.scale.set(1, 1 + Math.sin(n.t * 1.8 + n.ph) * 0.012, 1);
    const toP = _tmp.set(playerPos.x - r.position.x, 0, playerPos.z - r.position.z);
    const dP = toP.length(), sameFloor = Math.abs(playerPos.y - r.position.y) < 2;
    if (n.talking || n.react) {
      // 对话中：转身面向玩家，说话时有手势和口型；n.react 为一次性反应动作
      const yaw = Math.atan2(playerPos.x - r.position.x, playerPos.z - r.position.z);
      let dy = yaw - r.rotation.y; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      if (!n.seated || Math.abs(dy) < 1.2) r.rotation.y += dy * Math.min(1, dt * 5);
      if (n.seated) poseSit(p); else poseStand(p);
      p.headG.rotation.set(-0.06, 0, 0); p.spine.rotation.set(0, 0, 0); p.hips.position.y = n.seated ? 0.48 : 0.9;
      if (p.mouth) p.mouth.scale.set(1, n.speaking ? 1 + Math.abs(Math.sin(n.t * 18)) * 3.5 : 1, 1);
      if (n.speaking && !n.react) { p.arms[0].sh.rotation.x = -0.45 + Math.sin(n.t * 4) * 0.2; p.arms[0].el.rotation.x = -1.0; p.arms[1].sh.rotation.x = -0.3 + Math.sin(n.t * 3.3 + 1) * 0.15; p.arms[1].el.rotation.x = -0.8; p.headG.rotation.z = Math.sin(n.t * 1.7) * 0.06; }
      else if (!n.react) { p.headG.rotation.x = -0.04 + Math.max(0, Math.sin(n.t * 2.2)) * 0.06; }
      if (n.react) {
        const R2 = n.react; R2.t += dt; const k = Math.min(1, R2.t / 0.25) * Math.min(1, Math.max(0, (R2.d - R2.t) / 0.25)), A = p.arms;
        switch (R2.k) {
          case 'wave': A[1].sh.rotation.set(-2.6 * k, 0, -0.3 * k); A[1].el.rotation.x = -0.4 + Math.sin(n.t * 14) * 0.35 * k; break;
          case 'laugh': p.spine.rotation.x = -0.12 * k; p.headG.rotation.x = -0.25 * k + Math.sin(n.t * 20) * 0.04 * k; A[0].sh.rotation.x = -0.6 * k; A[0].el.rotation.x = -1.6 * k; if (!n.seated) p.hips.position.y = 0.9 + Math.abs(Math.sin(n.t * 12)) * 0.02 * k; break;
          case 'nod': p.headG.rotation.x = Math.sin(R2.t * 12) * 0.18 * k; break;
          case 'highfive': A[1].sh.rotation.set(-2.5 * k, 0, -0.15 * k); A[1].el.rotation.x = -0.25 * k; if (!n.seated) p.spine.rotation.x = 0.08 * k; break;
          case 'cheer': for (const [i, a] of A.entries()) { a.sh.rotation.set(-2.8 * k, 0, (i ? -0.35 : 0.35) * k); a.el.rotation.x = -0.3 * k; } if (!n.seated) p.hips.position.y = 0.9 + Math.abs(Math.sin(R2.t * 9)) * 0.12 * k; p.headG.rotation.x = -0.2 * k; break;
          case 'bow': p.spine.rotation.x = 0.5 * Math.sin(Math.min(1, R2.t / R2.d) * Math.PI); p.headG.rotation.x = 0.2 * k; break;
          case 'think': A[1].sh.rotation.x = -1.3 * k; A[1].el.rotation.x = -2.2 * k; A[1].sh.rotation.z = 0.25 * k; p.headG.rotation.z = 0.18 * k; p.headG.rotation.x = -0.1 * k; break;
          case 'point': A[1].sh.rotation.set(-1.45 * k, 0, -0.5 * k); A[1].el.rotation.x = -0.1 * k; p.headG.rotation.y = -0.3 * k; break;
          case 'pose': A[1].sh.rotation.set(-2.3 * k, 0, -0.5 * k); A[1].el.rotation.x = -1.5 * k; A[0].sh.rotation.z = 0.55 * k; A[0].el.rotation.x = -1.6 * k; p.headG.rotation.z = 0.15 * k; p.spine.rotation.z = -0.05 * k; break;
        }
        if (R2.t >= R2.d) n.react = null;
      }
      continue;
    }
    if (p.mouth && p.mouth.scale.y !== 1) p.mouth.scale.y = 1;
    if (n.greetT > 0) {
      // 转身面向玩家 + 挥手
      n.greetT -= dt;
      const yaw = Math.atan2(playerPos.x - r.position.x, playerPos.z - r.position.z);
      let dy = yaw - r.rotation.y; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); r.rotation.y += dy * Math.min(1, dt * 6);
      if (!n.seated) { poseStand(p); }
      p.arms[1].sh.rotation.set(-2.6, 0, -0.3); p.arms[1].el.rotation.x = -0.4 + Math.sin(n.t * 14) * 0.35;
      p.headG.rotation.x = -0.08;
      continue;
    }
    switch (n.behavior) {
      case 'walk': case 'jog': {
        // 让路：玩家挡在前方 1.5m 内时减速停下、看向玩家
        const fwdX = Math.sin(r.rotation.y), fwdZ = Math.cos(r.rotation.y);
        const ahead = sameFloor && dP < 1.6 && (toP.x * fwdX + toP.z * fwdZ) / Math.max(dP, 1e-3) > 0.55;
        if ((n.pauseT ?? 0) <= 0 && Math.random() < dt * 0.012 && n.behavior === 'walk') n.pauseT = 3 + Math.random() * 3;
        if (n.pauseT > 0) n.pauseT -= dt;
        n.yieldK = THREE.MathUtils.lerp(n.yieldK ?? 1, ahead || n.pauseT > 0 ? 0 : 1, Math.min(1, dt * 5));
        const sp = n.v * (n.behavior === 'jog' ? 2.4 : 1) * n.yieldK;
        n.s = (n.s + sp * dt) % n.total;
        let sg = n.segs[0]; for (const q of n.segs) if (n.s >= q.start) sg = q;
        const f = (n.s - sg.start) / sg.len;
        r.position.x = sg.a[0] + (sg.b[0] - sg.a[0]) * f; r.position.z = sg.a[1] + (sg.b[1] - sg.a[1]) * f;
        const yaw = Math.atan2(sg.b[0] - sg.a[0], sg.b[1] - sg.a[1]);
        let dy = yaw - r.rotation.y; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); r.rotation.y += dy * Math.min(1, dt * 6);
        n.ph += dt * Math.max(sp, 0.05) * 4.6;
        poseWalk(p, n.ph, (n.behavior === 'jog' ? 1.5 : 1) * Math.max(0.05, n.yieldK));
        if (n.behavior === 'jog') { for (const a of p.arms) a.el.rotation.x = -1.6; }
        p.headG.rotation.x = 0;
        if (n.pauseT > 0 && n.yieldK < 0.3) { p.arms[1].sh.rotation.x = -0.8; p.arms[1].el.rotation.x = -1.5; p.headG.rotation.x = 0.4; }
        break;
      }
      case 'type': {
        n.seated = true; poseSit(p);
        p.arms[0].sh.rotation.x = -0.9; p.arms[1].sh.rotation.x = -0.9;
        p.arms[0].el.rotation.x = -0.75 + Math.sin(n.t * 18) * 0.05; p.arms[1].el.rotation.x = -0.75 + Math.sin(n.t * 17 + 1) * 0.05;
        p.headG.rotation.x = 0.12 + Math.sin(n.t * 0.6) * 0.04;
        r.rotation.y = n.baseYaw + Math.sin(n.t * 0.3) * 0.06;
        break;
      }
      case 'eat': case 'read': case 'sit': {
        n.seated = true; poseSit(p);
        if (n.behavior === 'eat') { p.arms[1].sh.rotation.x = -0.9 - Math.max(0, Math.sin(n.t * 1.6)) * 0.9; p.arms[1].el.rotation.x = -1.4; }
        if (n.behavior === 'read') { for (const a of p.arms) { a.sh.rotation.x = -0.9; a.el.rotation.x = -1.2; } p.headG.rotation.x = 0.35; }
        if (n.behavior === 'sit') { p.headG.rotation.y = Math.sin(n.t * 0.5) * 0.4; }
        r.rotation.y = n.baseYaw;
        break;
      }
      case 'phone': {
        poseStand(p);
        p.arms[1].sh.rotation.x = -0.8; p.arms[1].el.rotation.x = -1.5;
        p.headG.rotation.x = 0.4;
        p.spine.rotation.y = Math.sin(n.t * 0.4) * 0.05;
        r.rotation.y = n.baseYaw;
        break;
      }
      case 'chat': {
        poseStand(p);
        p.headG.rotation.y = Math.sin(n.t * 0.8 + n.ph) * 0.25;
        p.headG.rotation.x = Math.sin(n.t * 2.5 + n.ph) * 0.05;
        const talk = Math.sin(n.t * 1.2 + n.ph) > 0.3;
        p.arms[0].sh.rotation.x = talk ? -0.5 + Math.sin(n.t * 5) * 0.2 : 0; p.arms[0].el.rotation.x = talk ? -0.9 : -0.12;
        p.arms[1].sh.rotation.x = talk ? -0.3 + Math.sin(n.t * 4 + 1) * 0.18 : 0; p.arms[1].sh.rotation.z = talk ? 0.12 : 0; p.arms[1].el.rotation.x = talk ? -0.7 : -0.12;
        if (!talk) p.headG.rotation.x = Math.max(0, Math.sin(n.t * 3 + n.ph)) * 0.12;   // 听的时候点头
        p.spine.rotation.y = talk ? Math.sin(n.t * 0.9) * 0.06 : 0;
        r.rotation.y = n.baseYaw;
        break;
      }
      case 'idle': default: {
        poseStand(p); r.rotation.y = n.baseYaw;
        const cyc = (n.t + n.ph * 3) % 18, act = Math.floor((n.t + n.ph * 3) / 18 + n.ph) % 4;
        const w = cyc < 4 ? Math.sin(cyc / 4 * Math.PI) : 0;           // 每 18 秒做一次 4 秒的小动作
        p.headG.rotation.y = Math.sin(n.t * 0.35 + n.ph) * 0.5 * (1 - w);
        // 重心转移：一侧膝盖微屈
        p.legs[0].kn.rotation.x = Math.max(0, Math.sin(n.t * 0.25 + n.ph)) * 0.15; p.hips.rotation.z = Math.sin(n.t * 0.25 + n.ph) * 0.04;
        if (act === 0) { p.arms[0].sh.rotation.x = -1.0 * w; p.arms[0].el.rotation.x = -1.6 * w; p.headG.rotation.x = 0.35 * w; p.headG.rotation.y = 0.25 * w; }        // 看表
        else if (act === 1) { for (const a of p.arms) { a.sh.rotation.x = -2.9 * w; a.el.rotation.x = -0.3 * w; } p.spine.rotation.x = -0.12 * w; }                         // 伸懒腰
        else if (act === 2) { for (const [i, a] of p.arms.entries()) { a.sh.rotation.z = (i ? 1 : -1) * 0.55 * w; a.el.rotation.x = -1.7 * w; } }                       // 叉腰
        break;
      }
    }
    if (!isFinite(p.headG.rotation.y) || !isFinite(p.headG.rotation.x)) { p.headG.rotation.set(0, 0, 0); n.headTurn = 0; }
    if (p.tail) p.tail.rotation.x = Math.sin(n.t * 7 + n.ph) * 0.12 * (n.behavior === 'walk' || n.behavior === 'jog' ? 1 : 0.2), p.tail.rotation.z = Math.sin(n.t * 3.5 + n.ph) * 0.1;
    if (sameFloor && dP < 4.5) {
      let rel = Math.atan2(toP.x, toP.z) - r.rotation.y; rel = Math.atan2(Math.sin(rel), Math.cos(rel));
      if (Math.abs(rel) < 1.8) {
        n.headTurn = THREE.MathUtils.lerp(n.headTurn, THREE.MathUtils.clamp(rel, -1.0, 1.0), Math.min(1, dt * 4));
        p.headG.rotation.y = n.headTurn;
      }
    } else if (n.headTurn) { n.headTurn *= Math.pow(0.05, dt); }
  }
}

// ======================================================================
// 布点：大堂、各楼层、园区、街区
// ======================================================================
export function populate(scene, L) {
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const yLobby = 0.2;
  // —— 大堂：来往员工、前台排队、沙发等候、咖啡吧 ——
  addNPC(scene, { behavior: 'walk', pos: V(0, yLobby, 0), route: [[-7.4, 13], [-7.4, -5.6], [7.4, -5.6], [7.4, 13]], name: '同事小林', look: { bag: true } });
  addNPC(scene, { behavior: 'walk', pos: V(0, yLobby, 0), route: [[7.4, 13], [7.4, -5.6], [-7.4, -5.6], [-7.4, 13]], name: '实习生阿杰', speed: 1.3 });
  addNPC(scene, { behavior: 'walk', pos: V(0, yLobby, 0), route: [[-3, 14.5], [-3, 3.5], [3, 3.5], [3, 14.5]], name: '访客', look: { female: true } });
  addNPC(scene, { behavior: 'phone', pos: V(-11.5, yLobby, 10.5), yaw: 0.6, name: '等人的 UP 主', lines: ['我在等合作方，马上到～', '粉丝刚破百万！', '今天要拍 vlog'] });
  addNPC(scene, { behavior: 'sit', pos: V(-16.6, yLobby, -3.4), yaw: 0, name: '面试者' , lines: ['有点紧张…', '待会儿就要面试了'] });
  addNPC(scene, { behavior: 'sit', pos: V(-15.4, yLobby, 0.7), yaw: Math.PI, name: '快递小哥' });
  addNPC(scene, { behavior: 'chat', pos: V(-13.6, yLobby, -7.1), yaw: Math.PI, name: '咖啡师', look: { top: 0x3a2a22 }, lines: ['今天推荐「三连拿铁」', '要加燕麦奶吗？'] });
  addNPC(scene, { behavior: 'chat', pos: V(-17.6, yLobby, -7.0), yaw: Math.PI, name: '买咖啡的同事' });
  addNPC(scene, { behavior: 'idle', pos: V(14.6, yLobby, -12.2), yaw: Math.PI, name: '逛周边的粉丝', look: { female: true, bag: true }, lines: ['这个小电视手办好可爱！', '要不要买两个…'] });
  addNPC(scene, { behavior: 'idle', pos: V(17.6, yLobby, -1.2), yaw: Math.PI / 2 + 0.3, name: '参观者', lines: ['原来 B 站是 2009 年成立的', '弹幕文化真有意思'] });
  addNPC(scene, { behavior: 'chat', pos: V(5.4, yLobby, 9.2), yaw: -2.2, name: '销售', look: { top: 0x1d2027, bottom: 0x1d2027 } });
  addNPC(scene, { behavior: 'chat', pos: V(6.4, yLobby, 8.3), yaw: 1.0, name: '客户', look: { top: 0xf0e6d8 } });
  addNPC(scene, { behavior: 'phone', pos: V(10.2, yLobby, 10.4), yaw: 2.55, name: '拍高达的粉丝', look: { bag: true }, lines: ['这台高达也太帅了吧！', '拍下来发动态～', '要是能开就好了'] });
  // —— 16F 办公区：工位打字 ——
  const yO = L.office;
  const desks = [[-15, -3], [-7, -3], [7, -3], [15, -3], [-15, 4], [7, 4], [-7, 11], [15, 11]];
  desks.forEach(([cx, cz], i) => {
    for (const [ox, side] of [[-1.4, i % 2 ? 1 : -1], [1.4, i % 2 ? -1 : 1]]) {
      if ((i + ox) % 3 === 0) continue;
      addNPC(scene, { behavior: 'type', pos: V(cx + ox, yO, cz + side * 1.35), yaw: side > 0 ? Math.PI : 0, name: ['程序员', '剪辑师', '运营', '设计师'][(i + (ox > 0 ? 1 : 0)) % 4], lines: ['这个需求今天能上线', '在剪新视频，别打扰我~', '数据涨了！', '再改一版就好'] });
    }
  });
  addNPC(scene, { behavior: 'walk', pos: V(0, yO, 0), route: [[-19, 0.5], [19, 0.5], [19, 7.5], [-19, 7.5]], name: '组长', look: { top: 0x2a3550 } });
  addNPC(scene, { behavior: 'chat', pos: V(-14.6, yO, -12), yaw: 0.5, name: '摸鱼的同事', lines: ['嘘——我在休息', '要不要来点零食？'] });
  addNPC(scene, { behavior: 'chat', pos: V(-13.2, yO, -11.3), yaw: -2.4, name: '摸鱼的同事 B' });
  // —— 5F 餐厅：吃饭 ——
  const yC = L.canteen;
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
    if ((r * 4 + c) % 3 === 1) continue;
    const x = -15 + c * 10, z = -2 + r * 6;
    addNPC(scene, { behavior: 'eat', pos: V(x - 1.2, yC, z - 1.25), yaw: 0, name: '吃饭的同事', lines: ['番茄炒蛋绝了', '今天的红烧肉好香'] });
    if (c % 2) addNPC(scene, { behavior: 'eat', pos: V(x + 1.2, yC, z + 1.25), yaw: Math.PI, name: '吃饭的同事' });
  }
  addNPC(scene, { behavior: 'idle', pos: V(-16.4, yC, -12.4), yaw: Math.PI, name: '排队打饭' });
  addNPC(scene, { behavior: 'idle', pos: V(-13, yC, -12.2), yaw: Math.PI, name: '排队打饭' });
  addNPC(scene, { behavior: 'chat', pos: V(-17.8, yC, -15.4), yaw: 0, name: '食堂阿姨', look: { top: 0xffffff, female: true }, lines: ['同学多吃点！', '今天有你爱吃的'] });
  // —— 9F 直播：主播、摄影 ——
  const yS = L.studio;
  addNPC(scene, { behavior: 'sit', pos: V(-12, yS, -5.2), yaw: 0, name: '主播', look: { female: true, top: 0xfb7299 }, lines: ['家人们晚上好～', '感谢老板的小电视！'] });
  addNPC(scene, { behavior: 'idle', pos: V(-15.4, yS, 1.6), yaw: Math.PI - 0.5, name: '摄像师' });
  addNPC(scene, { behavior: 'type', pos: V(15.5, yS, 2.4), yaw: Math.PI, name: '录音师' });
  // —— 12F 游戏中心 ——
  const yG = L.game;
  addNPC(scene, { behavior: 'idle', pos: V(-17.3, yG, -3.4), yaw: -Math.PI / 2, name: '打街机的同事', lines: ['马上破纪录了！', '别说话，BOSS 战！'] });
  addNPC(scene, { behavior: 'idle', pos: V(-17.3, yG, 4.4), yaw: -Math.PI / 2, name: '打街机的同事' });
  for (let i = 0; i < 5; i += 2) addNPC(scene, { behavior: 'type', pos: V(6.4 + i * 2.8, yG + 0.5, -9.6), yaw: Math.PI, name: '电竞选手', lines: ['冲！', 'GG'] });
  addNPC(scene, { behavior: 'chat', pos: V(10, yG, -4.4), yaw: Math.PI, name: '观众' }); addNPC(scene, { behavior: 'chat', pos: V(14, yG, -4.2), yaw: Math.PI, name: '观众', look: { female: true } });
  // —— 19F 动画 ——
  const yA = L.anime;
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) if ((r + c) % 2 === 0) addNPC(scene, { behavior: 'type', pos: V(-14 + c * 7, yA, -2 + r * 5.5 + 1.2), yaw: Math.PI, name: '原画师', lines: ['这一帧还差一点', '分镜改好了'] });
  // —— 22F 健身房 ——
  const yGy = L.gym;
  addNPC(scene, { behavior: 'jog', pos: V(0, yGy, 0), route: [[-19, -6], [19, -6], [19, 6], [-19, 6]], name: '健身达人', speed: 1.1, lines: ['再跑 5 公里！', '自律给我自由'] });
  addNPC(scene, { behavior: 'idle', pos: V(-13.6, yGy, -2.8), yaw: Math.PI, name: '举铁的同事' });
  addNPC(scene, { behavior: 'sit', pos: V(13, yGy, -7.5), yaw: 0, name: '做瑜伽的同事', look: { female: true } });
  // —— 24F 放映厅 ——
  const yT = L.theater;
  [[-11.7, 0], [-6.5, 1], [6.5, 1], [9.1, 2], [-9.1, 3], [11.7, 3], [3.9, 2]].forEach(([x, r]) => addNPC(scene, { behavior: 'sit', pos: V(x, yT + r * 0.35 + 0.05, -5 + r * 3.2), yaw: Math.PI, name: '观众', lines: ['前方高能！！', '这段我能看一百遍'] }));
  // —— 27F 图书馆 ——
  const yL = L.library;
  addNPC(scene, { behavior: 'read', pos: V(-13, yL, -2.8), yaw: Math.PI, name: '看书的同事', lines: ['嘘——', '这本书推荐你看'] });
  addNPC(scene, { behavior: 'read', pos: V(13, yL, 6.2), yaw: Math.PI, name: '看书的同事', look: { female: true } });
  addNPC(scene, { behavior: 'read', pos: V(-3.3, yL + 0.8, 8.4), yaw: Math.PI, name: '阶梯上的读者' });
  addNPC(scene, { behavior: 'idle', pos: V(-19.8, yL, 2), yaw: -Math.PI / 2, name: '找书的同事' });
  // —— 29F 酒吧 ——
  const ySb = L.skybar;
  addNPC(scene, { behavior: 'chat', pos: V(-10, ySb, -12.6), yaw: 0, name: '调酒师', look: { top: 0x1d2027 }, lines: ['今晚想喝点什么？', '试试「三连特调」'] });
  addNPC(scene, { behavior: 'sit', pos: V(-11.8, ySb + 0.35, -10.3), yaw: Math.PI, name: '酒吧客人' });
  addNPC(scene, { behavior: 'sit', pos: V(-8.6, ySb + 0.35, -10.3), yaw: Math.PI, name: '酒吧客人', look: { female: true } });
  addNPC(scene, { behavior: 'sit', pos: V(-8, ySb, 12.6), yaw: Math.PI, name: '看夜景的情侣' }); addNPC(scene, { behavior: 'sit', pos: V(-7, ySb, 12.6), yaw: Math.PI, name: '看夜景的情侣', look: { female: true } });
  // —— 7F 路演：观众 + 主持人 ——
  const yF = L.forum;
  if (yF != null) {
    [[-11.7, 1], [-9.1, 1], [-6.5, 2], [6.5, 1], [9.1, 2], [11.7, 3], [3.9, 3], [-3.9, 2], [-11.7, 4], [9.1, 4]].forEach(([x, r]) => addNPC(scene, { behavior: 'sit', pos: V(x, yF + r * 0.32 + 0.02, -5 + r * 3.2 + 0.1), yaw: Math.PI, name: '与会者', look: { badge: true }, lines: ['这场发布会干货满满', '记一下这个数据'] }));
    addNPC(scene, { behavior: 'chat', pos: V(-4, yF + 0.45, -12.4), yaw: 0, name: '主持人', look: { top: 0x1d2027, bottom: 0x1d2027, badge: true }, lines: ['欢迎各位来到创作者大会！', '下面有请百大 UP 主上台'] });
    addNPC(scene, { behavior: 'type', pos: V(17.5, yF, 10.6), yaw: Math.PI, name: '同传译员', lines: ['正在同声传译中…'] });
  }
  // —— 14F 音乐：吉他手 / 录音师 ——
  const yM = L.music;
  if (yM != null) {
    addNPC(scene, { behavior: 'type', pos: V(10, yM, -4.6), yaw: Math.PI, name: '混音师', lines: ['这一轨低频再推一点', '人声有点糊，重来一遍'] });
    addNPC(scene, { behavior: 'chat', pos: V(4, yM, 3), yaw: -0.6, name: '吉他手', look: { top: 0x15171c }, lines: ['来合奏一段？', '这段 riff 怎么样'] });
    addNPC(scene, { behavior: 'idle', pos: V(16.5, yM, 6.2), yaw: Math.PI, name: '歌手', look: { female: true, top: 0xff5da2 }, lines: ['在等录音师的信号…'] });
  }
  // —— 26F 休息：按摩 / 喝茶 / 懒人沙发 ——
  const yLg = L.lounge;
  if (yLg != null) {
    addNPC(scene, { behavior: 'sit', pos: V(-14, yLg + 0.3, 4.3), yaw: Math.PI, name: '享受按摩的同事', lines: ['别叫我，让我再躺五分钟', '舒服～'] });
    addNPC(scene, { behavior: 'chat', pos: V(10.2, yLg, -10.2), yaw: Math.PI, name: '泡茶的同事', look: { cup: true }, lines: ['今天的桂花乌龙不错', '要不要来一杯？'] });
    addNPC(scene, { behavior: 'phone', pos: V(13.8, yLg, -9.8), yaw: Math.PI + 0.4, name: '刷手机的同事' });
    addNPC(scene, { behavior: 'sit', pos: V(6, yLg + 0.05, 9.4), yaw: 0.4, name: '摸鱼的同事', lines: ['嘘，我在“思考人生”'] });
  }
  // —— 园区 & 城市：散步 / 慢跑 / 看手机 ——
  addNPC(scene, { behavior: 'walk', pos: V(0, 0, 0), route: [[-3.5, 24], [-3.5, 86], [3.5, 86], [3.5, 24]], name: '下班的同事', look: { bag: true } });
  addNPC(scene, { behavior: 'walk', pos: V(0, 0, 0), route: [[3.5, 86], [3.5, 24], [-3.5, 24], [-3.5, 86]], name: '外卖小哥', look: { top: 0xffd166 }, speed: 1.6 });
  addNPC(scene, { behavior: 'jog', pos: V(0, 0, 0), route: [[-26, 22], [-26, -26], [26, -26], [26, 22]], name: '夜跑的同事' });
  addNPC(scene, { behavior: 'phone', pos: V(-6.4, 0, 39), yaw: 0.4, name: '候车的人' });
  addNPC(scene, { behavior: 'chat', pos: V(12, 0, 62), yaw: -1.8, name: '散步的老人' }); addNPC(scene, { behavior: 'chat', pos: V(10.8, 0, 62.6), yaw: 1.2, name: '散步的老人', look: { female: true } });
  addNPC(scene, { behavior: 'idle', pos: V(-1.6, 0, 60), yaw: Math.PI, name: '小朋友', look: { child: true }, lines: ['喷泉好漂亮！', '小电视！'] });
  addNPC(scene, { behavior: 'walk', pos: V(0, 0, 0), route: [[-4, 130], [-4, 280], [4, 280], [4, 130]], name: '逛街的游客', look: { female: true, bag: true } });
  addNPC(scene, { behavior: 'walk', pos: V(0, 0, 0), route: [[4, 280], [4, 130], [-4, 130], [-4, 280]], name: '逛街的游客' });
  addNPC(scene, { behavior: 'walk', pos: V(0, 0, 0), route: [[148, -54], [252, -54], [252, 54], [148, 54]], name: '公园散步', speed: 0.9 });
  addNPC(scene, { behavior: 'jog', pos: V(0, 0, 0), route: [[200 - 55, 0], [200, -55], [255, 0], [200, 55]], name: '公园跑步' });
  addNPC(scene, { behavior: 'walk', pos: V(0, 0, 0), route: [[-30, -150], [30, -150], [30, -120], [-30, -120]], name: 'Coser', look: { female: true, top: 0x9fd6ff } });
  addNPC(scene, { behavior: 'phone', pos: V(-160, 0, -4), yaw: Math.PI / 2, name: '等地铁的人' });
}
