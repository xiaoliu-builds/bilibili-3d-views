// 主程序：渲染、第一人称行走、碰撞、电梯、热点、鸟瞰、昼夜、小地图
import * as THREE from 'three';
import { OrbitControls } from './lib/addons/controls/OrbitControls.js';
import { EffectComposer } from './lib/addons/postprocessing/EffectComposer.js';
import { RenderPass } from './lib/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from './lib/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from './lib/addons/postprocessing/OutputPass.js';
import { ctx, addCollider, flushTrees } from './js/common.js';
import { DanmakuScreen, PINK } from './js/textures.js';
import { buildTower, TOWER } from './js/tower.js';
import { buildLobby, buildOffice, buildRoof } from './js/interiors.js';
import { buildSky, buildCity, buildPlaza, buildFloatingDanmaku, PLAZA } from './js/world.js';
import { setupEnvironment, buildTowerDetails } from './js/architecture.js';
import { buildCampus, FOOTPRINTS } from './js/campus.js';
import { buildDistricts, interactables, landmarks, bikeDocks, traffic, makeBike, districtGroups } from './js/districts.js';
import { batchStatic } from './js/batch.js';
import { elevatorSequence, updateElevatorDoors, elevatorDoors, getHand, tickHall, liftInfo, cars as liftCars } from './js/elevator.js';
import { heldName, consumeHeld } from './js/props.js';
import { propsTick, hold, drop, isHolding, useHeld, gesture, initHands, makeCan, makeCake, makeTray, makeBook, makeCocktail, makeToyTV, makeCard, floatText, hearts, bounce, spinOnce, tween, easeOut } from './js/props.js';
import { populate, updateNPCs, pushOutOfNPCs } from './js/people.js';
import { gradePass, lightShafts, setShaftDaylight, contactShadow, shaftMats } from './js/lighting.js';
import { lobbyReflection, lobbyLights, dustMotes, monitorGlow, streetLightPools, gondola, crown, flagsAndBollards, beacons, setDetailTime, tickDetails, livingWindows, towerGroundReflection, lobbyCaustics, stairwells, guideFlow, sightseeingLift, floorRibbon, facadeShow, entranceLED, cornerBanner } from './js/details.js';
import { buildExtraFloors, EXTRA_FLOORS } from './js/floors.js';
import { FLOOR_META, META_BY_KEY } from './js/floorMeta.js';
import { BiliToy } from './js/toy.js';
import { startIconObserver, drawIcon, ic, stripEmoji } from './js/icons.js';
import * as GP from './js/gameplay.js';
import { Z as ZD, ZONES } from './js/zone_util.js';
import { buildKart, tickKart, initKart, isRacing, quitRace, drawKartMinimap } from './js/zone_kart.js';
import { buildArena, tickArena, constrainArena } from './js/zone_arena.js';
import { buildMarket, tickMarket } from './js/zone_market.js';
import { initDialogue, tickDialogue, openTalk, closeTalk, isTalking } from './js/dialogue.js';
import { buildNewGen, NEWGEN } from './js/newgen.js';
import { DEPTS, CASES, LANYARDS, AVATARS, TITLES, loadBadge, saveBadge, badgeNo, today, drawBadge, drawBadgeBack, drawAvatar, iconsReady } from './js/badge.js';
import { buildCollectibles, checkCollect, questStats, Fireworks, buildNPCs, spawnDanmaku3D, Sound, KINDS } from './js/features.js';

const $ = (s) => document.querySelector(s);
startIconObserver();   // 页面中的 emoji 自动替换为 gpt-image2 生成的 3D 图标
// 启动进度：更新加载条，并让出主线程一帧，让浏览器把进度画出来（后台标签页也不会卡住）
const boot = (p, stage) => { window.__boot?.set(p, stage); return new Promise((r) => { let d = false; const f = () => { if (!d) { d = true; setTimeout(r, 0); } }; requestAnimationFrame(f); setTimeout(f, 60); }); };
// 镜头舒适度：0 = 稳定（无晃动）· 1 = 轻微（默认）· 2 = 沉浸（原版强度）
let comfort = +(localStorage.getItem('bili_comfort2') ?? 0);
const CF = () => [0, 0.35, 1][comfort];
const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
// 设备分级：手机/低内存设备默认降低像素比与阴影分辨率，保证 30fps+
const isMobile = isTouch && Math.min(screen.width, screen.height) < 820;
const lowMem = (navigator.deviceMemory || 8) <= 4;
const TIER = isMobile ? (lowMem ? 0 : 1) : 2;
document.documentElement.dataset.tier = TIER;

// ---------- 渲染器 ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, [1, 1.25, 1.25][TIER]));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
$('#app').appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(isMobile && innerHeight > innerWidth ? 80 : 75, innerWidth / innerHeight, 0.15, 2600);
camera.rotation.order = 'YXZ';
ctx.scene = scene; ctx.camera = camera;

// ---------- 灯光 ----------
const hemi = new THREE.HemisphereLight(0xbfd8ff, 0x3a4050, 0.6);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 1.0);
sun.position.set(140, 260, 110); sun.target.position.set(0, 0, 20);
sun.castShadow = true;
sun.shadow.mapSize.set(...[[512, 512], [1024, 1024], [2048, 2048]][TIER]);
if (TIER === 0) renderer.shadowMap.enabled = false;
Object.assign(sun.shadow.camera, { left: -110, right: 110, top: 110, bottom: -110, near: 10, far: 700 });
sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.04; sun.shadow.radius = 3;
scene.add(sun, sun.target);
scene.fog = new THREE.FogExp2(0x0b1022, 0.0016);

// ---------- 场景搭建（分阶段推进加载条）----------
await boot(32, '铺设天空与园区地面…');
const danmaku = new DanmakuScreen();
const sky = buildSky(scene);
// 用独立分组承接各模块输出，方便后续合批（模块内部 scene.add → group.add）
const staticGroups = [];
function intoGroup(fn) {
  const g = new THREE.Group(); scene.add(g); staticGroups.push(g);
  const realAdd = scene.add.bind(scene);
  scene.add = (...objs) => { g.add(...objs); return scene; };
  try { fn(); } finally { scene.add = realAdd; }
  return g;
}
await boot(38, '生成城市街区…');
intoGroup(() => buildCity(scene));
intoGroup(() => buildPlaza(scene));
await boot(46, '搭建 30 层主楼…');
intoGroup(() => buildTower(scene));
intoGroup(() => buildTowerDetails(scene));
await boot(53, '规划园区与周边街区…');
intoGroup(() => buildCampus());
buildDistricts(scene);
ctx.traffic = traffic;
await boot(60, '建造新世代产业园…');
{ const ng = buildNewGen(scene); districtGroups.push(ng); }
await boot(57, '修建卡丁车场、BML 体育馆和夜市…');
buildKart(scene); buildArena(scene); buildMarket(scene);
await boot(66, '装修 15 个主题楼层…');
const floorGroups = buildExtraFloors(scene, danmaku);
setupEnvironment(renderer, scene);
await boot(73, '布置 1F 大堂与高达展台…');
const lobbyGroup = intoGroup(() => buildLobby(scene, danmaku));
floorGroups.office = buildOffice(scene, danmaku);
intoGroup(() => buildRoof(scene));
// 飘浮 3D 弹幕已移除（性能）
flushTrees(scene);
const _L = Object.fromEntries(FLOOR_META.map(f => [f.key, f.y]));
await boot(79, '同事们正在入场…');
populate(scene, _L);
// 体积光束：大堂与所有楼层（加入对应楼层分组，随楼层可见性显隐）
lightShafts(lobbyGroup, 0.2, 9.4, { count: 8, opacity: 0.07, tilt: 0.5 });
for (const [k, g] of Object.entries(floorGroups)) lightShafts(g, META_BY_KEY[k].y, 3.8, { count: 5, opacity: ['theater', 'skybar', 'game', 'music', 'forum'].includes(k) ? 0.02 : 0.045, tilt: 0.75 });
// 光影 & 建筑细节
await boot(84, '调试灯光与建筑细节…');
lobbyReflection(lobbyGroup, danmaku.tex); lobbyLights(lobbyGroup); dustMotes(lobbyGroup);
monitorGlow(floorGroups.office, META_BY_KEY.office.y);
streetLightPools(scene); gondola(scene); crown(scene); flagsAndBollards(scene); beacons(scene);
livingWindows(scene); towerGroundReflection(scene); lobbyCaustics(lobbyGroup); stairwells(scene); guideFlow(scene);
sightseeingLift(scene); floorRibbon(scene); facadeShow(scene); entranceLED(scene, danmaku.tex); cornerBanner(scene);
// 静态合批：街区 / 室内楼层（保留有动画的对象）
await boot(90, '优化渲染性能…');
{
  let n = 0;
  for (const g of districtGroups) n += batchStatic(g);
  n += batchStatic(districtGroups.furniture);
  for (const g of Object.values(floorGroups)) n += batchStatic(g);
  for (const g of staticGroups) n += batchStatic(g);
  console.info('[batch] merged meshes:', n);
}
buildCollectibles(scene);
const fireworks = new Fireworks(scene);
scene.add(camera); initHands(camera); getHand(camera);
// 天台防跌落隐形墙
{
  const hw = TOWER.W / 2, hd = TOWER.D / 2, t = TOWER.top;
  addCollider(-hw, t, hd - 0.4, hw, t + 6, hd + 0.4);
  addCollider(-hw, t, -hd - 0.4, hw, t + 6, -hd + 0.4);
  addCollider(-hw - 0.4, t, -hd, -hw + 0.4, t + 6, hd);
  addCollider(hw - 0.4, t, -hd, hw + 0.4, t + 6, hd);
}

// ---------- 热点标记 ----------
const markerRing = new THREE.RingGeometry(0.55, 0.75, 40);
const markerMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(PINK).multiplyScalar(1.6), transparent: true, opacity: 0.85, side: THREE.DoubleSide, toneMapped: false, depthWrite: false });
const gemGeo = new THREE.OctahedronGeometry(0.22);
const gemMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0x7fd8ff).multiplyScalar(1.5), toneMapped: false });
const markers = ctx.hotspots.map((h) => {
  const ring = new THREE.Mesh(markerRing, markerMat); ring.rotation.x = -Math.PI / 2; ring.position.copy(h.pos).y += 0.05;
  const gem = h.ringOnly ? null : new THREE.Mesh(gemGeo, gemMat);
  if (gem) { gem.position.copy(h.pos).y += 2.3; scene.add(gem); }
  scene.add(ring);
  return { ring, gem, base: h.pos.y };
});
ctx.animators.push((dt, t) => {
  markers.forEach((m, i) => {
    const s = 1 + Math.sin(t * 3 + i) * 0.12; m.ring.scale.set(s, s, s);
    if (m.gem) { m.gem.rotation.y = t * 1.5 + i; m.gem.position.y = m.base + 2.3 + Math.sin(t * 2 + i) * 0.15; }
  });
});

// ---------- 后期辉光 ----------
const msaaRT = new THREE.WebGLRenderTarget(innerWidth * renderer.getPixelRatio(), innerHeight * renderer.getPixelRatio(), { type: THREE.HalfFloatType, samples: [0, 2, 4][TIER] });
const composer = new EffectComposer(renderer, msaaRT);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.5, 0.45, 0.9);
composer.addPass(bloom);
const grade = gradePass(); grade.uniforms.uAspect.value = innerWidth / innerHeight;
composer.addPass(grade);
composer.addPass(new OutputPass());

// ---------- 玩家 ----------
const player = {
  pos: new THREE.Vector3(0, 0, 86), vel: new THREE.Vector3(), yaw: 0, pitch: -0.04,
  onGround: false, eye: 1.65, radius: 0.35, height: 1.75, eyeY: 1.65, bob: 0,
};
ctx.player = player;
const keys = {};
let mode = 'intro'; // intro | walk | paused | orbit | modal
let speedMul = 1;
let runLock = false;           // 手机「跑」按钮：常驻奔跑
let lookSens = +(localStorage.getItem('bili_sens') || 1);  // 视角灵敏度倍率

function collides(x, y, z) {
  const r = player.radius;
  for (const c of ctx.colliders) {
    if (x + r <= c.min.x || x - r >= c.max.x || z + r <= c.min.z || z - r >= c.max.z) continue;
    if (y + 0.45 >= c.max.y || y + player.height <= c.min.y) continue;
    return true;
  }
  return false;
}
function groundAt(x, y, z) {
  const r = player.radius * 0.8;
  let g = -Infinity;
  for (const c of ctx.colliders) {
    if (x + r <= c.min.x || x - r >= c.max.x || z + r <= c.min.z || z - r >= c.max.z) continue;
    if (c.max.y <= y + 0.46 && c.max.y > g) g = c.max.y;
  }
  return Math.max(g, 0);
}
function ceilingAt(x, y, z) {
  const r = player.radius * 0.8;
  let g = Infinity;
  for (const c of ctx.colliders) {
    if (x + r <= c.min.x || x - r >= c.max.x || z + r <= c.min.z || z - r >= c.max.z) continue;
    if (c.min.y >= y + player.height - 0.05 && c.min.y < g) g = c.min.y;
  }
  return g;
}

let baseFov = camera.fov;
const fwd = new THREE.Vector3(), right = new THREE.Vector3(), move = new THREE.Vector3();
const joy = { x: 0, y: 0 };
function updatePlayer(dt) {
  // 视角平滑：鼠标输入先进入目标角，再以高阻尼跟随（手感更“稳”，不突兀）
  if (lookTarget.active) {
    const k = 1 - Math.pow(comfort === 2 ? 0.0004 : 1e-7, dt);
    const dyaw = lookTarget.yaw - player.yaw;
    player.yaw += dyaw * k; player.pitch += (lookTarget.pitch - player.pitch) * k;
    turnRoll += (THREE.MathUtils.clamp(-dyaw * 0.6, -0.04, 0.04) * (comfort === 2 ? 1 : 0) - turnRoll) * Math.min(1, dt * 8);
    if (Math.abs(dyaw) < 1e-4 && Math.abs(lookTarget.pitch - player.pitch) < 1e-4) lookTarget.active = false;
  } else { lookTarget.yaw = player.yaw; lookTarget.pitch = player.pitch; turnRoll *= Math.pow(0.02, dt); }
  fwd.set(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
  right.set(Math.cos(player.yaw), 0, -Math.sin(player.yaw));
  move.set(0, 0, 0);
  if (keys.KeyW || keys.ArrowUp) move.add(fwd);
  if (keys.KeyS || keys.ArrowDown) move.sub(fwd);
  if (keys.KeyD || keys.ArrowRight) move.add(right);
  if (keys.KeyA || keys.ArrowLeft) move.sub(right);
  if (joy.x || joy.y) { move.addScaledVector(fwd, -joy.y); move.addScaledVector(right, joy.x); }
  const moving = move.lengthSq() > 0.001;
  if (move.lengthSq() > 1) move.normalize();
  const run = keys.ShiftLeft || keys.ShiftRight || runLock;
  if (seated) { if (moving) standUp(); else { treadmillOn && (player.bob += dt * 7); camera.position.set(player.pos.x, player.pos.y + player.eye + (treadmillOn ? Math.sin(player.bob) * 0.04 : 0), player.pos.z); camera.rotation.set(player.pitch, player.yaw, 0); return; } }
  treadmillOn = false;
  const buff = performance.now() < buffUntil ? 1.3 : 1;
  // ---- 飞行：按住 V（或触屏「飞」）推进爬升；松开后滑翔下降，落地自动结束 ----
  const thrust = keys.KeyV || flyHold;
  if (thrust && !flight.on) startFlight();
  const flyingNow = flight.on;
  // 蹲下：C / Ctrl（地面上）
  const crouch = !flyingNow && (keys.KeyC || keys.ControlLeft) && !riding;
  crouchK += ((crouch ? 1 : 0) - crouchK) * Math.min(1, dt * 10);
  const speed = crouch ? 2.2 : flyingNow ? ((run || speedMul > 1) ? 26 : 15) : (run ? 9.5 : 5) * speedMul * buff * (riding ? 2.6 : 1);
  const accel = flyingNow ? 3.2 : player.onGround ? (moving ? 9 : 16) : 4;
  player.vel.x += (move.x * speed - player.vel.x) * Math.min(1, accel * dt);
  player.vel.z += (move.z * speed - player.vel.z) * Math.min(1, accel * dt);
  if (flyingNow) {
    const down = keys.KeyC || keys.ControlLeft;
    const targetVy = thrust || keys.Space ? 9 : down ? -12 : -2.6;   // 推进 / 俯冲 / 滑翔
    player.vel.y += (targetVy - player.vel.y) * Math.min(1, dt * (thrust ? 2.6 : 1.6));
    if (player.pos.y > 240 && player.vel.y > 0) player.vel.y *= 0.5; // 高度上限
  } else player.vel.y -= 22 * dt;

  const p = player.pos;
  const nx = p.x + player.vel.x * dt;
  if (!collides(nx, p.y, p.z)) p.x = nx; else player.vel.x = 0;
  const nz = p.z + player.vel.z * dt;
  if (!collides(p.x, p.y, nz)) p.z = nz; else player.vel.z = 0;

  // 与 NPC 的软碰撞（不再穿进人物身体 / 头部）
  if (!flight.on && pushOutOfNPCs(p, player.radius)) { if (!bumpCd) { bumpCd = 0.8; Sound.rustle(1.2); if (comfort === 2) camKick = Math.max(camKick, 0.03); } }
  if (bumpCd) bumpCd = Math.max(0, bumpCd - dt);
  const ground = groundAt(p.x, p.y, p.z);
  let ny = p.y + player.vel.y * dt;
  if (player.vel.y > 0) { const ceil = ceilingAt(p.x, p.y, p.z); if (ny + player.height > ceil) { ny = ceil - player.height; player.vel.y = 0; } }
  if (ny <= ground) { ny = ground; player.vel.y = 0; player.onGround = true; } else player.onGround = ny - ground < 0.05;
  p.y = ny;
  if (p.y < -10) teleport('plaza');
  if (flight.on) {
    p.x = THREE.MathUtils.clamp(p.x, -288, 288); p.z = THREE.MathUtils.clamp(p.z, -288, 288);
    if (player.onGround && !thrust && flight.t > 0.4) endFlight();
    flight.t += dt;
  }

  // 镜头：平滑上台阶 + 走路晃动
  const hs = Math.hypot(player.vel.x, player.vel.z);
  if (player.onGround && moving) player.bob += dt * hs * 1.6;
  // 脚步声：每半个步伐周期（bob 每跨过 π）踩一步；材质随所在区域
  const stepIdx = Math.floor(player.bob / Math.PI);
  if (stepIdx !== lastStep) {
    lastStep = stepIdx;
    if (player.onGround && hs > 1.2 && !riding && !flight.on) { Sound.step(surfaceAt(p), hs > 7, Math.min(1, hs / 5) * (crouchK > 0.5 ? 0.45 : 1)); if (hs > 7) Sound.rustle(0.8); }
    if (riding && hs > 2 && stepIdx % 3 === 0) Sound.tone(2400 + Math.random() * 300, 0.03, { type: 'square', vol: 0.012 });
  }
  if (player.onGround && !wasGround && fallV < -6) { Sound.land(Math.min(1.5, -fallV / 10)); camKick = Math.min(0.12, -fallV * 0.01) * Math.max(0.3, CF()); }
  wasGround = player.onGround; fallV = player.vel.y;
  camKick *= Math.pow(0.001, dt);
  // 步伐幅度平滑：停下时晃动自然衰减，不会“定格”在半空
  bobAmp += ((player.onGround && moving ? Math.min(1, hs / 5) * (hs > 7 ? 1.45 : 1) : 0) - bobAmp) * Math.min(1, dt * 8);
  // 冲刺累积疲劳：停下后有几秒明显喘息（镜头起伏 + 呼吸声）
  sprintT = hs > 7 ? Math.min(6, sprintT + dt) : Math.max(0, sprintT - dt * 0.8);
  const pant = sprintT > 2.5 && hs < 1.5 ? (sprintT - 2.5) / 3.5 : 0;
  if (pant > 0 && Math.floor(breathT * 1.4) !== Math.floor((breathT - dt) * 1.4)) Sound.breath(pant);
  breathT += dt;
  const breathe = comfort === 2 ? Math.sin(breathT * (1.7 + pant * 7)) * (0.008 + pant * 0.02) * (1 - Math.min(1, hs / 2)) : 0;
  const targetEye = p.y + player.eye - camKick - crouchK * 0.62 + Math.sin(player.bob) * 0.042 * bobAmp * CF() + breathe;
  player.eyeY += (targetEye - player.eyeY) * Math.min(1, dt * (Math.abs(targetEye - player.eyeY) > 2 ? 100 : 18));
  // 左右重心摆动（步频的一半）
  const sway = Math.cos(player.bob * 0.5) * 0.028 * bobAmp * (comfort === 2 ? 1 : 0);
  camera.position.set(p.x + right.x * sway, player.eyeY, p.z + right.z * sway);
  // 飞行转向时机身轻微侧倾
  const yawRate = (player.yaw - flight.lastYaw) / Math.max(dt, 1e-3); flight.lastYaw = player.yaw;
  const rollT = flight.on ? THREE.MathUtils.clamp(-yawRate * 0.06, -0.22, 0.22) + (keys.KeyA ? 0.06 : 0) - (keys.KeyD ? 0.06 : 0) : 0;
  flight.roll += (rollT - flight.roll) * Math.min(1, dt * 4);
  // 侧移时轻微倾斜 + 步伐带来的细微滚转
  const lat = player.vel.x * right.x + player.vel.z * right.z;
  strafeRoll += (-lat * 0.0045 * (comfort === 2 ? 1 : 0) - (strafeRoll)) * Math.min(1, dt * 6);
  camera.rotation.set(player.pitch, player.yaw, flight.roll * Math.max(0.4, CF()) + strafeRoll + turnRoll + Math.sin(player.bob * 0.5) * 0.006 * bobAmp * (comfort === 2 ? 1 : 0));
  updateFlightFx(dt, hs);
  // 奔跑 / 飞行时视野拉宽，增加速度感
  const targetFov = baseFov + (flight.on ? Math.min(16, hs * 0.55) * Math.max(0.4, CF()) : ((run || speedMul > 1) && moving ? 7 * CF() : 0));
  if (Math.abs(camera.fov - targetFov) > 0.05) { camera.fov += (targetFov - camera.fov) * Math.min(1, dt * 6); camera.updateProjectionMatrix(); }
  checkCollect(p, onCollect);
  checkLandmarks();
  if (riding) { const b = riding.bike; b.rotation.z = Math.sin(player.bob * 0.5) * 0.03; b.children[0] && (b.children[0].rotation.x += hs * dt * 2); b.children[1] && (b.children[1].rotation.x += hs * dt * 2); }
}

function cycleComfort(to) {
  comfort = to ?? (comfort + 1) % 3; localStorage.setItem('bili_comfort2', comfort);
  const L = ['稳定 · 无镜头晃动', '轻微 · 推荐', '沉浸 · 真实步伐晃动'];
  toast(`镜头舒适度：${L[comfort]}`, ['🧘', '🙂', '🎢'][comfort], '#7fd8ff');
  document.querySelectorAll('[data-comfort]').forEach(b => b.classList.toggle('on', +b.dataset.comfort === comfort));
}
window.cycleComfort = cycleComfort;
document.querySelectorAll('[data-comfort]').forEach(b => { b.classList.toggle('on', +b.dataset.comfort === comfort); b.addEventListener('click', (e) => { e.stopPropagation(); Sound.init(); Sound.click(); cycleComfort(+b.dataset.comfort); }); });
$('#guideBtn')?.addEventListener('click', (e) => { e.stopPropagation(); Sound.init(); Sound.click(); $('#guidePanel').classList.toggle('show'); });
$('#guideClose')?.addEventListener('click', () => $('#guidePanel').classList.remove('show'));
function jump() { if (player.onGround) { player.vel.y = 7; player.onGround = false; Sound.step(surfaceAt(player.pos), true, 0.7); } }
let bumpCd = 0, lastStep = 0, wasGround = true, fallV = 0, camKick = 0, crouchK = 0, bobAmp = 0, breathT = 0, strafeRoll = 0, sprintT = 0, turnRoll = 0;
const lookTarget = { yaw: 0, pitch: 0, active: false };
// 根据位置判断地面材质
function surfaceAt(p) {
  const inside = Math.abs(p.x) < TOWER.W / 2 && Math.abs(p.z) < TOWER.D / 2;
  if (inside) {
    const lv = currentLevel().key;
    if (p.z < -9.8 && p.z > -15.8) return 'metal';                     // 电梯轿厢
    return { lobby: 'marble', showroom: 'marble', canteen: 'stone', studio: 'carpet', game: 'carpet', office: 'carpet', anime: 'wood', gym: 'carpet', theater: 'carpet', library: 'wood', skybar: 'wood', roof: 'wood' }[lv] || 'stone';
  }
  // 园区草坪 / 公园
  for (const [x, z, w, d] of [[-55, -40, 56, 70], [55, -40, 56, 70], [-58, 55, 50, 46], [58, 55, 50, 46]]) if (Math.abs(p.x - x) < w / 2 && Math.abs(p.z - z) < d / 2) return 'grass';
  if (p.x > 115 && p.x < 285 && Math.abs(p.z) < 85) return 'grass';
  return 'stone';
}
let ambKind = '', roomKind = '';
function updateAmbience() {
  if (!Sound.ac) return;
  const inside = Math.abs(player.pos.x) < TOWER.W / 2 && Math.abs(player.pos.z) < TOWER.D / 2 && player.pos.y < TOWER.top - 1;
  const k = mode === 'intro' ? '' : inside ? 'indoor' : 'city';
  if (k !== ambKind) { ambKind = k; Sound.ambience(k); }
  const lv = currentLevel().key;
  const rk = mode === 'cutscene' ? null : !inside ? 'outdoor' : lv === 'lobby' ? 'hall' : lv === 'theater' ? 'theater' : 'room';
  if (rk && rk !== roomKind) { roomKind = rk; Sound.room(rk); }
}

// ---------- 飞行模式 ----------
const flight = { on: false, t: 0, roll: 0, lastYaw: 0 };
let flyHold = false;
function startFlight() {
  if (riding) dropBike();
  if (seated) standUp();
  flight.on = true; flight.t = 0;
  player.onGround = false; player.vel.y = Math.max(player.vel.y, 4);
  document.body.classList.add('flying');
  Sound.whoosh && Sound.whoosh();
  if (!flight.tipped) { flight.tipped = true; toast(`起飞！${isTouch ? '按住「飞」爬升，松手滑翔' : '按住 <kbd>V</kbd> 爬升，松开滑翔，<kbd>C</kbd> 俯冲'}`, '🪽', '#7fd8ff'); }
}
function endFlight() {
  flight.on = false;
  document.body.classList.remove('flying');
  Sound.tone(220, 0.18, { type: 'sine', vol: 0.08, slide: 90 });
}
function updateFlightFx(dt, hs) {
  const el = $('#flightHud');
  if (!flight.on) { Sound.wind && Sound.wind(0); return; }
  const kmh = Math.round(Math.hypot(hs, player.vel.y) * 3.6);
  el.querySelector('.fh-alt').textContent = Math.max(0, Math.round(player.pos.y));
  el.querySelector('.fh-spd').textContent = kmh;
  el.querySelector('.fh-vs').textContent = player.vel.y > 1 ? '▲ 爬升' : player.vel.y < -4 ? '▼ 俯冲' : '◆ 滑翔';
  $('#speedLines').style.opacity = Math.min(0.85, Math.max(0, (kmh - 25) / 70));
  Sound.wind && Sound.wind(Math.min(1, kmh / 90));
}

// ---------- 一键三连挑战 ----------
let questStart = null, questDone = false;
function toast(html, ico = 'star', color = PINK) {
  const el = document.createElement('div'); el.className = 'toast';
  el.innerHTML = `<span class="t-ico" style="background:${color}">${ic(ico) || ico}</span><span>${html}</span>`;
  $('#toasts').appendChild(el); setTimeout(() => el.remove(), 2700);
  while ($('#toasts').children.length > 3) $('#toasts').firstChild.remove();
}
function updateQuest() {
  const q = questStats();
  $('#qCount').textContent = `${q.got}/${q.total}`;
  $('#qBar').style.width = `${q.got / q.total * 100}%`;
  for (const [k, id] of [['like', '#qLike'], ['coin', '#qCoin'], ['fav', '#qFav']]) {
    $(id).textContent = `${q[k][0]}/${q[k][1]}`;
    $(id).parentElement.classList.toggle('done', q[k][0] === q[k][1]);
  }
  return q;
}
function onCollect(it) {
  if (questStart === null) questStart = performance.now();
  const k = KINDS[it.kind];
  const q = updateQuest();
  Sound.coin();
  toast(`获得 <b style="color:${k.color}">${k.label}</b> 徽章 <small>${q[it.kind][0]}/${q[it.kind][1]}</small>`, k.glyph, k.color); GP.emit('badge');
  const qe = $('#quest'); qe.classList.remove('bump'); void qe.offsetWidth; qe.classList.add('bump');
  if (q.got === q.total && !questDone) {
    questDone = true;
    const sec = Math.round((performance.now() - questStart) / 1000);
    BiliToy.submitQuestTime(sec).then(() => refreshRank(true));
    BiliToy.save({ best: String(sec) });
    $('#winTime').textContent = sec >= 60 ? `${Math.floor(sec / 60)} 分 ${sec % 60} 秒` : `${sec} 秒`;
    $('#quest').classList.add('complete'); $('.q-tip').textContent = '🎉 已完成！按 F 随时放烟花';
    danmaku.add('恭喜达成一键三连！！！', '#ffe17a');
    Sound.win(); celebrate();
    setTimeout(() => openModal('#winModal'), 1400);
  }
}
// 烟花总在视线前方绽放：室外放在镜头前方上空，室内放在南侧落地窗外
const _fw = new THREE.Vector3(), _c = new THREE.Vector3();
function celebrate(count = 10) {
  const lvl = mode === 'orbit' ? null : currentLevel();
  if (lvl && (lvl.key === 'lobby' || lvl.key === 'office')) {
    fireworks.show(count, [0, lvl.y + 14, TOWER.D / 2 + 60], 70, 14);
  } else {
    if (mode === 'orbit') { camera.updateMatrixWorld(); camera.getWorldDirection(_fw); _fw.y = 0; _fw.normalize(); }
    else _fw.set(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
    const c = mode === 'orbit' ? camera.position : _c.set(player.pos.x, player.pos.y + player.eye, player.pos.z), d = mode === 'orbit' ? 60 : 48;
    const x = c.x + _fw.x * d, z = c.z + _fw.z * d;
    let y = mode === 'orbit' ? c.y - 12 : c.y + 12;
    // 避免落在塔楼体积内被幕墙挡住
    if (Math.abs(x) < TOWER.W / 2 + 12 && Math.abs(z) < TOWER.D / 2 + 12 && y < TOWER.top + 12) y = TOWER.top + 22;
    fireworks.show(count, [x, y, z], 50, mode === 'orbit' ? 20 : 12);
  }
}

// ---------- 发送弹幕 ----------
let dColor = '#ffffff', prevMode = 'walk';
function openDanmu() {
  if (mode !== 'walk' && mode !== 'orbit') return;
  prevMode = mode; mode = 'typing';
  document.exitPointerLock?.();
  document.body.classList.add('typing');
  setTimeout(() => $('#danmuInput').focus(), 30);
}
function closeDanmu() {
  document.body.classList.remove('typing'); $('#danmuInput').blur();
  if (prevMode === 'orbit') mode = 'orbit'; else resume();
}
async function sendDanmu(text) {
  text = (text ?? $('#danmuInput').value).trim();
  if (!text) { closeDanmu(); return; }
  const chk = await BiliToy.checkText(text, 'danmaku');
  if (!chk.passed && chk.status === 'rejected') { toast('这条弹幕不太合适，换个说法吧～', '🙅', '#ff6b6b'); return; }
  if (chk.status === 'unavailable') toast('内容检测暂不可用，这条弹幕仅你自己可见', 'ℹ️', '#8a8f99');
  spawnDanmaku3D(scene, text, dColor, camera);
  danmaku.add(text, dColor);
  Sound.send();
  toast(`弹幕已发送，也会出现在 <b>1F 弹幕巨幕</b> 上`, '💬', BLUE_HEX); GP.emit('danmaku');
  $('#danmuInput').value = '';
  closeDanmu();
}
const BLUE_HEX = '#00AEEC';
$('#danmuInput').addEventListener('keydown', (e) => {
  e.stopPropagation();
  if (e.key === 'Enter') sendDanmu();
  if (e.key === 'Escape') closeDanmu();
});
$('#danmuInput').addEventListener('keyup', (e) => e.stopPropagation());
$('#danmuSend').addEventListener('click', () => sendDanmu());
document.querySelectorAll('.d-colors button').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('.d-colors button').forEach(x => x.classList.remove('on')); b.classList.add('on'); dColor = b.dataset.c; $('#danmuInput').focus();
}));
document.querySelectorAll('.d-quick button').forEach(b => b.addEventListener('click', () => sendDanmu(b.textContent)));

// ---------- 拍照 ----------
let lastPhoto = null;
function takePhoto() {
  if (mode === 'intro' || mode === 'modal') return;
  composer.render();
  const src = renderer.domElement;
  const c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
  const g = c.getContext('2d'); g.drawImage(src, 0, 0);
  // 水印
  const s = c.height / 900;
  g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, c.height - 64 * s, c.width, 64 * s);
  g.fillStyle = '#FB7299'; g.font = `italic 900 ${30 * s}px Arial`; g.fillText('bilibili', 24 * s, c.height - 22 * s);
  g.fillStyle = '#fff'; g.font = `600 ${18 * s}px ${getComputedStyle(document.body).fontFamily}`;
  g.fillText(`3D 总部大楼 · ${$('#levelName').textContent} · ${new Date().toLocaleString('zh-CN', { hour12: false })}`, 140 * s, c.height - 26 * s);
  const url = c.toDataURL('image/png');
  $('#photoImg').src = url; $('#photoDl').href = url; lastPhoto = url;
  const sh = $('#shutter'); sh.classList.remove('flash'); void sh.offsetWidth; sh.classList.add('flash');
  Sound.shutter(); GP.emit('photo');
  setTimeout(() => openModal('#photoModal'), 380);
}

// ======================================================================
// 自由探索：互动动作 API（坐 / 骑行 / 摩天轮 / 地铁 / 商店 / 小游戏）
// ======================================================================
let riding = null;          // 当前骑的共享单车
let seated = null;          // 当前坐着的位置 { prev }
let ferrisRide = null;      // 摩天轮乘坐状态
let coins = +(localStorage.getItem('bili_coins') || 5);
const bag = new Set(JSON.parse(localStorage.getItem('bili_bag') || '[]'));
function setCoins(v) { coins = Math.max(0, v); try { renderMenuStats(); } catch (_) {} localStorage.setItem('bili_coins', coins); $('#coinCount') && ($('#coinCount').textContent = coins); BiliToy.save({ coins: String(coins) }); }
function addItem(name, icon) {
  if (bag.has(name)) return false;
  bag.add(name); localStorage.setItem('bili_bag', JSON.stringify([...bag])); BiliToy.save({ bag: [...bag].slice(-60) }); BiliToy.submitCollector(bag.size + foundCount * 3);
  $('#bagCount') && ($('#bagCount').textContent = bag.size);
  toast(`获得收藏品「${name}」，已放入背包`, icon, '#7a5cff');
  return true;
}
function standUp() {
  if (!seated) return;
  player.pos.copy(seated.prev); seated = null; player.eye = 1.65;
  document.body.classList.remove('seated');
}
const API = {
  toast: (t, i, c) => toast(t, i, c),
  sfx: (n) => Sound[n] && Sound[n](),
  gesture: (k) => gesture(k),
  arcade() { GP.openGame('arcade'); },
  sit(pos, yaw, msg) {
    GP.emit('sit');
  lookTarget.active = false;
    seated = { prev: player.pos.clone() };
    const from = player.pos.clone(), y0 = player.yaw, eye0 = player.eye;
    player.vel.set(0, 0, 0);
    // 平滑走到座位 + 转身 + 下沉
    let dy = yaw - y0; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    tween(0.7, (k) => { const e = easeOut(k); player.pos.lerpVectors(from, pos, e); player.yaw = y0 + dy * e; player.eye = eye0 + (1.15 - eye0) * e; player.pitch = -0.05 * e; });
    Sound.step('wood', false, 0.5);
    document.body.classList.add('seated');
    toast(msg || `已坐下，${isTouch ? '推动摇杆' : '按 WASD'} 起身`, '🪑', '#8d6b4f');
  },
  shop(name) {
    const goods = { '会员购': ['小电视徽章', '🎖️'], '手办屋': ['22 娘手办', '🧸'], 'B站周边': ['小电视抱枕', '🛋️'], '漫画书店': ['限定漫画', '📕'], '电玩城': ['游戏代币', '🕹️'], '干杯奶茶': ['干杯奶茶', '🧋'], '原神 展位': ['原神立牌', '🎴'], '手办 展位': ['盲盒手办', '🎁'], '同人本 展位': ['同人本', '📘'], 'Cos 摄影 展位': ['拍立得', '📷'], '痛包 展位': ['痛包', '👜'] };
    const g = goods[name];
    if (g && !bag.has(g[0])) {
      if (coins < 1) { toast(`想买「${g[0]}」，但硬币不够了…去收集徽章或打工吧`, '🪙', '#ffb027'); return; }
      setCoins(coins - 1); Sound.coin(); addItem(g[0], g[1]);
    } else toast(`「${name}」逛了一圈，店员：“欢迎下次光临~”`, '🛍️', PINK);
  },
  vending() {
    if (coins < 1) { toast('硬币不足，饮料机冷漠地看着你', '🥤', '#ffb027'); return; }
    setCoins(coins - 1); gesture('reach'); Sound.coin();
    const opts = [['可乐', '#e53935'], ['柠檬茶', '#f2c14e'], ['乌龙茶', '#8b5a2b'], ['电解质水', '#2fb5ff'], ['咖啡', '#5a3a22']];
    const [d, c] = opts[Math.floor(Math.random() * opts.length)];
    // 投币 → 咕咚掉落 → 弯腰拿到手里
    setTimeout(() => Sound.tone(160, 0.2, { vol: 0.16, slide: 70 }), 420);
    setTimeout(() => {
      hold(camera, makeCan(c, d), d, { uses: 3, onUse: () => { Sound.can(); buffUntil = performance.now() + 20000; floatText(scene, camera.position.clone().add(new THREE.Vector3(Math.sin(-player.yaw) * -1.2, -0.2, Math.cos(player.yaw) * -1.2)), '体力 +10', '#7fd8ff'); } });
      toast(`咕咚——掉出一瓶「${d}」，${isTouch ? '点「互动」' : '按 <kbd>E</kbd>'} 喝一口（20 秒奔跑加速）`, '🥤', c);
    }, 900);
  },
  meal() {
    gesture('reach'); Sound.clink();
    hold(camera, makeTray(), '今日套餐', { uses: 3, onUse: () => { Sound.tone(300, 0.08, { type: 'triangle', vol: 0.05 }); Sound.tone(260, 0.08, { type: 'triangle', vol: 0.05, delay: 0.14 }); } });
    toast(`阿姨给你打了满满一盘：番茄炒蛋 + 红烧肉 + 紫菜汤。找个桌子坐下，${isTouch ? '点「互动」' : '按 <kbd>E</kbd>'} 开吃`, '🍱', '#e85d3b');
  },
  coffee() {
    toast('咖啡师接单：“一杯三连拿铁，马上好～”', '☕', '#8b5a2b');
    Sound.tone(80, 1.6, { type: 'sawtooth', vol: 0.02 }); Sound.noise(1.4, { vol: 0.1, freq: 1800, delay: 0.3 });
    setTimeout(() => { Sound.pour(); }, 1500);
    setTimeout(() => {
      const cup = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.032, 0.1, 18), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 }));
      const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.0405, 0.036, 0.045, 18), new THREE.MeshStandardMaterial({ color: 0xFB7299, roughness: 0.7 }));
      const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.014, 18), new THREE.MeshStandardMaterial({ color: 0x2a2d34 })); lid.position.y = 0.056;
      cup.add(body, sleeve, lid);
      hold(camera, cup, '三连拿铁', { uses: 3, onUse: () => { Sound.tone(300, 0.2, { type: 'sine', vol: 0.05, slide: 220 }); buffUntil = performance.now() + 15000; } });
      toast(`拿到一杯热乎乎的三连拿铁，${isTouch ? '点「互动」' : '按 <kbd>E</kbd>'} 喝一口`, '☕', '#8b5a2b');
    }, 2600);
  },
  cake() {
    gesture('reach'); Sound.clink();
    hold(camera, makeCake(), '草莓小电视蛋糕', { uses: 2, onUse: () => { Sound.tone(500, 0.1, { type: 'triangle', vol: 0.05 }); hearts(scene, camera.position.clone().add(new THREE.Vector3(0, -0.3, 0)).add(new THREE.Vector3(-Math.sin(player.yaw), 0, -Math.cos(player.yaw)).multiplyScalar(0.8)), 3); } });
    toast('拿到一块「草莓小电视蛋糕」，甜度 ✦✦✦✦✧', '🍰', '#FB7299');
  },
  borrow() {
    const books = [['《小电视的十二年》', 0xFB7299], ['《弹幕文化研究》', 0x00AEEC], ['《Three.js 入门》', 0x2ec27e], ['《UP 主成长手册》', 0xffb027]];
    const [b, c] = books[Math.floor(Math.random() * books.length)];
    gesture('reach'); Sound.tone(1200, 0.08, { type: 'square', vol: 0.04 }); Sound.tone(1600, 0.1, { type: 'square', vol: 0.04, delay: 0.12 });
    setTimeout(() => { hold(camera, makeBook(c), b, { uses: 99, onUse: () => { Sound.page(); toast(`你翻了几页${b}……`, '📖', '#8b5a2b'); } }); addItem(b, '📚') || toast(`借阅了 ${b}，记得 30 天内归还`, '📚', '#8b5a2b'); }, 500);
  },
  busker() {
    gesture('reach');
    if (coins > 0) { setCoins(coins - 1); Sound.coin(); floatText(scene, new THREE.Vector3(-10, 1.2, 170), '+1 🪙', '#ffd166'); }
    playTune();
    for (let i = 0; i < 6; i++) setTimeout(() => floatText(scene, new THREE.Vector3(-11 + Math.random(), 2.0, 170 + Math.random() - 0.5), ['♪', '♫', '♬'][i % 3], ['#ffd166', '#FB7299', '#7fd8ff'][i % 3], 0.5), i * 260);
    toast('🎵 “你感兴趣的视频都在 B 站～” 歌手向你点头致谢', '🎸', '#ffd166');
  },
  pet(cat) {
    // 蹲下 → 伸手抚摸 → 猫转头、尾巴快摇、冒爱心
    const eye0 = player.eye; gesture('pat'); Sound.meow();
    tween(0.4, (k) => { player.eye = eye0 - 0.7 * easeOut(k); player.pitch = -0.6 * easeOut(k); }, () => setTimeout(() => tween(0.5, (k) => { player.eye = eye0 - 0.7 * (1 - k); player.pitch = -0.6 * (1 - k); }), 900));
    const yaw = Math.atan2(player.pos.x - cat.position.x, player.pos.z - cat.position.z);
    const r0 = cat.rotation.y; tween(0.5, (k) => { cat.rotation.y = r0 + (yaw - r0) * easeOut(k); });
    bounce(cat, 0.12, 0.4);
    hearts(scene, cat.position.clone().add(new THREE.Vector3(0, 0.5, 0)), 6);
    toast('橘猫眯起眼睛蹭了蹭你的手：喵～（好感度 +1）', '🐱', '#f2a65a');
  },
  pigeons(ps) { toast('鸽子们扑棱棱飞起又落下——咕咕！', '🕊️', '#8a8f99'); ps.forEach((p, i) => { const y0 = p.position.y; let t = 0; const f = (dt) => { t += dt; p.position.y = y0 + Math.sin(Math.min(t, 1.2) / 1.2 * Math.PI) * (1.5 + i * 0.1); return t > 1.2; }; tempAnims.push(f); }); },
  workout() {
    // 躺下视角 + 杠铃起落 10 次（镜头上下）
    const eye0 = player.eye, p0 = player.pitch; let n = 0;
    player.eye = 0.6; player.pitch = 1.1;
    tween(5, (k) => { const c = Math.floor(k * 10); if (c !== n) { n = c; Sound.tone(140, 0.08, { vol: 0.12 }); } player.pitch = 1.1 - Math.abs(Math.sin(k * Math.PI * 10)) * 0.25; },
      () => { player.eye = eye0; player.pitch = p0; Sound.ding(); toast('卧推完成 10 次！手臂酸胀，自律 +1', '🏋️', '#ff8a3d'); });
    toast('躺上卧推凳，开始一组 10 次……', '🏋️', '#ff8a3d');
  },
  treadmill(pos) { API.sit(pos, Math.PI, '你在跑步机上慢跑，窗外是城市天际线…'); player.eye = 1.65; treadmillOn = true; },
  gacha() {
    if (coins < 1) { toast('抽卡需要 1 枚硬币', '🎴', '#ffb027'); return; }
    setCoins(coins - 1); gesture('reach'); Sound.coin();
    const r = Math.random(); const card = r < 0.1 ? ['SSR · 22 娘', '🌟', 'SSR'] : r < 0.4 ? ['SR · 33 娘', '✨', 'SR'] : ['R · 小电视', '🎴', 'R'];
    // 洗牌转盘声 → 卡片翻出到手里
    for (let i = 0; i < 8; i++) Sound.tone(600 + i * 80, 0.05, { type: 'square', vol: 0.03, delay: i * 0.08 });
    setTimeout(() => { hold(camera, makeCard(card[2]), card[0], { uses: 1, onUse: () => toast(`你把 ${card[0]} 小心地收进卡册`, card[1], '#7a5cff') }); if (card[2] !== 'R') { Sound.win(); celebrate(4); } addItem(card[0], card[1]) || toast(`抽到了 ${card[0]}（重复）`, card[1], '#7a5cff'); }, 800);
  },
  coser() { toast('Coser 摆了个 pose：“要合影吗？” —— 咔嚓！', '📸', '#9fe3ff'); setTimeout(takePhoto, 500); },
  rideBike(dock) {
    if (riding) return;
    riding = dock; dock.inUse = true;
    scene.remove(dock.bike); camera.add(dock.bike);
    dock.bike.position.set(0, -1.2, -0.75); dock.bike.rotation.set(0, Math.PI, 0); dock.bike.scale.setScalar(1);
    document.body.classList.add('riding');
    Sound.tone(1200, 0.06, { type: 'square', vol: 0.05 }); Sound.tone(1600, 0.08, { type: 'square', vol: 0.05, delay: 0.08 });
    toast(`扫码成功！骑行速度 ×2.6，${isTouch ? '点「下车」' : '按 <kbd>E</kbd> / <kbd>Q</kbd>'} 还车`, '🚲', '#2ec27e');
  },
  ferris() {
    if (!ctx.ferris) return;
    ferrisRide = { t: 0, prev: player.pos.clone(), prevYaw: player.yaw };
    mode = 'ride';
    document.body.classList.add('cinematic');
    toast('上车啦！摩天轮将载你到 48 米高空，欣赏整个园区', '🎡', PINK);
  },
  metro() { openModal('#metroModal'); },
  applause() { for (let i = 0; i < 26; i++) Sound.noise(0.05, { vol: 0.12 + Math.random() * 0.1, freq: 2500 + Math.random() * 2000, delay: 0.6 + Math.random() * 1.8 }); },
  drums() {
    const D = ctx.drumKit; if (!D) return;
    API.sit(new THREE.Vector3(-10, META_BY_KEY.music.y + 0.05, 2.85), Math.PI, '你坐到鼓凳上，准备开打「干杯鼓手」');
    setTimeout(() => GP.openGame('rhythm'), 750); return;
    const hit = (d, y0 = d.position.y) => { tween(0.12, (k) => { d.position.y = y0 - Math.sin(k * Math.PI) * 0.02; }); };
    const pat = ['K', 'H', 'S', 'H', 'K', 'K', 'S', 'H', 'K', 'H', 'S', 'H', 'K', 'T', 'S', 'C'];
    pat.forEach((x, i) => setTimeout(() => {
      if (x === 'K') { Sound.tone(70, 0.25, { vol: 0.35, slide: 40 }); hit(D.kick); }
      if (x === 'S') { Sound.noise(0.16, { vol: 0.35, freq: 3200 }); Sound.tone(220, 0.1, { vol: 0.12 }); hit(D.snare); }
      if (x === 'H') { Sound.noise(0.05, { vol: 0.15, freq: 9000 }); D.cymbals[2].rotation.z = 0.35; setTimeout(() => D.cymbals[2].rotation.z = 0.15, 90); }
      if (x === 'T') { Sound.tone(160, 0.22, { vol: 0.25, slide: 110 }); hit(D.tom1); }
      if (x === 'C') { Sound.noise(1.0, { vol: 0.3, freq: 7000 }); D.cymbals[0].rotation.z = 0.45; tween(0.8, (k) => { D.cymbals[0].rotation.z = 0.15 + Math.cos(k * 12) * 0.3 * (1 - k); }); }
      ctx.musicBoost = 0.6;
    }, i * 190));
  },
  keys() { gesture('reach'); [523, 659, 784, 1047, 784, 659, 698, 880, 1047].forEach((f, i) => Sound.tone(f, 0.4, { type: 'triangle', vol: 0.07, delay: i * 0.16 })); ctx.musicBoost = 2; toast('你弹了一段《你感兴趣的视频都在B站》的旋律 🎹', '🎹', '#FF5DA2'); },
  sing() { toast('“啦啦啦～” 调音台的电平跳了起来，录音师比了个 👍', '🎙️', '#FF5DA2'); [392, 440, 523, 587, 523, 440].forEach((f, i) => Sound.tone(f, 0.38, { type: 'sine', vol: 0.06, delay: i * 0.3 })); ctx.musicBoost = 3; },
  nap(pod) {
    const eye0 = player.eye; API.sit(new THREE.Vector3(pod.x, pod.yy + 0.35, pod.z + 0.4), 0, '你钻进睡眠舱，灯光慢慢暗下来……');
    pod.hole.material.color.set('#4FC3A1').multiplyScalar(0.25);
    const ov = $('#napFade'); ov.classList.add('show');
    setTimeout(() => { ov.classList.remove('show'); pod.hole.material.color.set('#4FC3A1').multiplyScalar(0.55); toast('小睡 20 分钟，精力全满！接下来 30 秒奔跑更快 ⚡', '😴', '#4FC3A1'); buffUntil = performance.now() + 30000; standUp(); }, 3200);
  },
  massage(pos) {
    API.sit(pos, Math.PI, '按摩椅开始工作，肩颈的酸痛慢慢消失了……');
    player.pitch = 0.35; let t0 = 0;
    tween(5, (k) => { player.pitch = 0.35 + Math.sin(k * 40) * 0.008; if (Math.floor(k * 20) !== t0) { t0 = Math.floor(k * 20); Sound.tone(90, 0.12, { type: 'sine', vol: 0.05 }); } });
  },
  tea() {
    gesture('reach'); Sound.pour();
    setTimeout(() => {
      const cup = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.034, 0.08, 18), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 }));
      const tea = new THREE.Mesh(new THREE.CircleGeometry(0.036, 18), new THREE.MeshStandardMaterial({ color: 0xc9822a, roughness: 0.2 })); tea.rotation.x = -Math.PI / 2; tea.position.y = 0.035;
      const handle = new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.005, 6, 12), new THREE.MeshStandardMaterial({ color: 0xffffff })); handle.position.x = 0.045; handle.rotation.y = Math.PI / 2;
      cup.add(body, tea, handle);
      hold(camera, cup, '桂花乌龙', { uses: 3, onUse: () => { Sound.tone(260, 0.25, { type: 'sine', vol: 0.05, slide: 200 }); floatText(scene, camera.position.clone().add(new THREE.Vector3(-Math.sin(player.yaw) * 1.2, -0.1, -Math.cos(player.yaw) * 1.2)), '好香～', '#ffd8a0', 0.25); } });
      toast(`泡好了一杯桂花乌龙，${isTouch ? '点「互动」' : '按 <kbd>E</kbd>'} 品一口`, '🍵', '#4FC3A1');
    }, 1300);
  },
  claw() {
    if (coins < 1) { toast('娃娃机需要 1 枚硬币', '🧸', '#ffb027'); return; }
    setCoins(coins - 1); gesture('reach'); Sound.coin();
    // 爪子下降 → 抓 → 上升（机械嗡声）
    Sound.tone(220, 1.6, { type: 'sawtooth', vol: 0.02, slide: 160 });
    const win = Math.random() < 0.4;
    setTimeout(() => Sound.tone(900, 0.08, { type: 'square', vol: 0.04 }), 900);
    setTimeout(() => {
      if (win) { Sound.win(); const c = [PINK, BLUE, '#ffd166'][Math.floor(Math.random() * 3)]; hold(camera, makeToyTV(c), '小电视玩偶', { uses: 1, onUse: () => { hearts(scene, camera.position.clone().add(new THREE.Vector3(-Math.sin(player.yaw), -0.3, -Math.cos(player.yaw))), 5); toast('你抱了抱小电视玩偶，它好像在笑', '🧸', c); } }); addItem('小电视玩偶', '🧸') || toast('又抓到一只小电视玩偶！', '🧸', '#7A5CFF'); }
      else toast('爪子一松……玩偶掉回去了，差一点点！', '😵', '#7A5CFF');
    }, 1800);
  },
  cocktail() {
    if (coins < 1) { toast('一杯特调需要 1 枚硬币', '🍸', '#ffb027'); return; }
    setCoins(coins - 1); Sound.coin();
    toast('调酒师开始摇壶……', '🍸', '#9B6BFF');
    for (let i = 0; i < 10; i++) Sound.noise(0.06, { vol: 0.2, freq: 3500, delay: 0.3 + i * 0.12 });
    setTimeout(() => Sound.pour(), 1700);
    setTimeout(() => { Sound.clink(); hold(camera, makeCocktail(), '三连特调', { uses: 3, onUse: () => { Sound.tone(420, 0.25, { type: 'sine', vol: 0.05, slide: 300 }); floatText(scene, camera.position.clone().add(new THREE.Vector3(-Math.sin(player.yaw) * 1.2, -0.2, -Math.cos(player.yaw) * 1.2)), '草莓 · 蓝柑 · 金桔', '#ffb0d0', 0.28); } }); addItem('三连特调', '🍹') || toast('调酒师又给你调了一杯，三层颜色分明', '🍸', '#9B6BFF'); }, 2900);
  },
  jazz() { toast('钢琴师弹起了《你感兴趣的视频都在B站》爵士版 🎶', '🎹', '#9B6BFF'); [392, 440, 494, 587, 523, 440, 392, 330].forEach((f, i) => Sound.tone(f, 0.45, { type: 'sine', vol: 0.07, delay: i * 0.28 })); },
};
function dropBike() {
  if (!riding) return;
  const d = riding; riding = null; d.inUse = false;
  camera.remove(d.bike); scene.add(d.bike);
  // 就近停车：放在玩家脚下
  d.home.set(player.pos.x + Math.sin(player.yaw) * 0.6, 0, player.pos.z + Math.cos(player.yaw) * 0.6);
  d.bike.position.copy(d.home); d.bike.rotation.set(0, player.yaw, 0);
  document.body.classList.remove('riding');
  toast('已还车，本次骑行免费 ✓', '🚲', '#2ec27e');
}
let buffUntil = 0, treadmillOn = false;
const tempAnims = [];
function playTune() { [523, 587, 659, 784, 659, 587, 523].forEach((f, i) => Sound.tone(f, 0.28, { type: 'triangle', vol: 0.06, delay: i * 0.22 })); }

// 地标发现
let foundCount = 0;
const LM_ICON = { '哔哩卡丁车场': 'flag', 'BML 体育馆': 'mic', '哔哩夜市 · 游乐园': 'ferris', '哔哩步行街': '🛍️', '东方城市公园': '🌳', '哔哩摩天轮': '🎡', '地铁 12 号线 · 哔哩站': '🚇', 'BW 漫展中心': '🎪', '新世代产业园': '🏙️' };
landmarks.forEach(l => { l.icon = LM_ICON[l.name] || l.icon || '📍'; });
setTimeout(() => { const el = document.getElementById('exploreCount'); if (el) el.textContent = `${landmarks.filter(l => l.found).length}/${landmarks.length}`; }, 0);
function checkLandmarks() {
  for (const l of landmarks) {
    if (l.found) continue;
    if (Math.hypot(player.pos.x - l.pos.x, player.pos.z - l.pos.z) < l.r && player.pos.y < 3) {
      l.found = true; foundCount++; BiliToy.save({ landmarks: landmarks.filter(x => x.found).map(x => x.name) }); BiliToy.submitCollector(bag.size + foundCount * 3);
      $('#discover .d-name').textContent = l.name;
      $('#discover .d-desc').textContent = l.desc;
      $('#discover .d-count').textContent = `城市探索 ${foundCount}/${landmarks.length}`;
      const el = $('#discover'); el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
      Sound.ding(); vibrate(25); GP.emit('landmark');
      $('#exploreCount') && ($('#exploreCount').textContent = `${foundCount}/${landmarks.length}`);
      if (foundCount === landmarks.length) setTimeout(() => { toast('你走遍了整座城市！奖励 5 枚硬币', '🗺️', '#ffb027'); setCoins(coins + 5); celebrate(8); }, 2200);
    }
  }
}
// 摩天轮乘坐：镜头跟随座舱一周
const _fw2 = new THREE.Vector3();
function updateFerris(dt) {
  const F = ctx.ferris; const r = ferrisRide;
  r.t += dt;
  const dur = 40;
  const k = Math.min(1, r.t / dur);
  const cab = F.cabins[0];
  cab.getWorldPosition(_fw2);
  camera.position.set(_fw2.x, _fw2.y + 0.4, _fw2.z);
  // 看向园区主楼，并加一点平移
  camera.lookAt(0, 50 + Math.sin(k * Math.PI) * 30, 0);
  // 保持第一座舱在底部出发：在开始时把轮盘相位对齐
  if (k >= 1) {
    mode = 'walk'; ferrisRide = null;
    document.body.classList.remove('cinematic');
    player.pos.copy(r.prev); player.yaw = r.prevYaw; player.eyeY = player.pos.y + player.eye;
    camera.rotation.order = 'YXZ';
    toast('摩天轮之旅结束，欢迎再来～', '🎡', PINK);
  }
}

// ---------- 楼层判定 ----------
// 楼层表（自下而上），电梯面板 / 楼层判定 / 电梯数字共用
const FLOORS = FLOOR_META;
function currentLevel() {
  const p = player.pos;
  const inside = Math.abs(p.x) < TOWER.W / 2 && Math.abs(p.z) < TOWER.D / 2;
  if (flight.on && !(inside && p.y < TOWER.top)) return Math.abs(p.x) > PLAZA || Math.abs(p.z) > PLAZA ? districtLevel(p) : ctx.levels.plaza;
  if (p.y > 3 && inside || p.y > TOWER.top - 2 && inside) {
    let best = FLOORS[0];
    for (const f of FLOORS) if (p.y >= ctx.levels[f.key].y - 1) best = f;
    return ctx.levels[best.key];
  }
  if (inside) return ctx.levels.lobby;
  if (Math.abs(p.x) > PLAZA || Math.abs(p.z) > PLAZA) return districtLevel(p);
  return ctx.levels.plaza;
}
const DISTRICT_LV = {
  newgen: { key: 'city', name: '新世代产业园 · 滨江' }, street: { key: 'city', name: '哔哩步行街' }, park: { key: 'city', name: '东方城市公园' },
  metro: { key: 'city', name: '地铁站 · 西区' }, expo: { key: 'city', name: 'BW 漫展中心' }, city: { key: 'city', name: '城市街区' },
  kart: { key: 'city', name: '哔哩卡丁车场' }, arena: { key: 'city', name: 'BML 体育馆' }, market: { key: 'city', name: '哔哩夜市 · 游乐园' },
};
function districtLevel(p) {
  if (p.x > NEWGEN.x0 - 4 && p.z > NEWGEN.z0 - 4) return DISTRICT_LV.newgen;
  for (const k of ['kart', 'arena', 'market']) { const c = ZONES[k]; if (Math.abs(p.x - c.x) < 92 && Math.abs(p.z - c.z) < 92) return DISTRICT_LV[k]; }
  if (Math.abs(p.x) < 100 && p.z > 100) return DISTRICT_LV.street;
  if (Math.abs(p.z) < 100 && p.x > 100) return DISTRICT_LV.park;
  if (Math.abs(p.z) < 100 && p.x < -100) return DISTRICT_LV.metro;
  if (Math.abs(p.x) < 100 && p.z < -100) return DISTRICT_LV.expo;
  return DISTRICT_LV.city;
}

const SPAWNS = {
  plaza: { pos: [0, 0, 86], yaw: 0 },
  lobby: { pos: [0, 0.2, 14.2], yaw: 0 },
  office: { pos: [0, ctx.levels.office.y, -7.2], yaw: Math.PI },
  roof: { pos: [8, TOWER.top, 13.2], yaw: 0.42, view: true },
  street: { pos: [0, 0, 124], yaw: Math.PI, name: '哔哩步行街' },
  park: { pos: [124, 0, -6], yaw: -Math.PI / 2 - 0.35, name: '东方城市公园' },
  metro: { pos: [-150, 0, 0], yaw: Math.PI / 2, name: '地铁站 · 西区' },
  expo: { pos: [0, 0, -128], yaw: 0, name: 'BW 漫展中心' },
  newgen: { pos: [200, 0, 124], yaw: Math.PI, name: '新世代产业园 · 滨江梦幻岛' },
  // 新场景：出生在入口内侧、面朝场景中心（yaw 约定：朝向 = (-sin yaw, -cos yaw)）
  kart: { pos: [-202 + 74, 0, -202 + 74], yaw: Math.atan2(74, 74), name: '哔哩卡丁车场' },
  arena: { pos: [202, 0, -202 + 70], yaw: 0, name: 'BML 体育馆' },
  market: { pos: [-202 + 78, 0, 202], yaw: Math.PI / 2, name: '哔哩夜市 · 游乐园' },
};
for (const f of EXTRA_FLOORS) SPAWNS[f.key] = { pos: [0, f.y, -7.2], yaw: Math.PI };
// 各楼层到达机位：出电梯即可看到本层主景
const VIEWS = {
  showroom: [-2, 0, 13, -0.35], studio: [-2, 0, 6, 0.35], game: [-4, 0, 8, -0.75],
  theater: [0, 1.45, 8.2, 0], skybar: [4, 0, 4, 0.85], anime: [4, 0, 14, -0.6],
  forum: [0, 1.3, 8.6, 0], music: [-4, 0, 9, 0.5], lounge: [-2, 0, 6, 0.35],
};
for (const [k, [x, dy, z, yaw]] of Object.entries(VIEWS)) SPAWNS[k] = { pos: [x, META_BY_KEY[k].y + dy, z], yaw, view: true };
function teleport(key, fromElevatorX = null) {
  if (flight.on) endFlight();
  const s = SPAWNS[key];
  player.pos.set(...s.pos); player.yaw = s.yaw; player.pitch = key === 'roof' ? 0.12 : -0.04;
  if (fromElevatorX !== null && key !== 'plaza' && !s.view) { player.pos.set(fromElevatorX, ctx.levels[key].y, -7.2); player.yaw = Math.PI; }
  player.vel.set(0, 0, 0); player.eyeY = player.pos.y + player.eye; lookTarget.active = false;
  if (META_BY_KEY[key]) floorBanner(META_BY_KEY[key]); else flash(ctx.levels[key] ? ctx.levels[key].name : s.name);
}
function flash(text) {
  const el = $('#floorFlash'); el.textContent = text; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
}

// ---------- 交互：热点 / 电梯 ----------
let nearby = null;
function findNearby() {
  const p = player.pos;
  for (const e of ctx.elevators) {
    if (Math.abs(p.y - ctx.levels[e.level].y) < 1.5 && Math.hypot(p.x - e.x, p.z - e.z) < 1.9) return { type: 'elevator', e };
  }
  let best = null, bd = Infinity, kind = null;
  for (const it of interactables) {
    if (it.disabled || it._cd > 0 || Math.abs(p.y - it.pos.y) > 2) continue;
    const d = Math.hypot(p.x - it.pos.x, p.z - it.pos.z);
    if (d < it.r && d < bd) { bd = d; best = it; kind = 'act'; }
  }
  for (const h of ctx.hotspots) {
    if (Math.abs(p.y - h.pos.y) > 2) continue;
    const d = Math.hypot(p.x - h.pos.x, p.z - h.pos.z);
    if (d < h.r && d < bd) { bd = d; best = h; kind = 'hotspot'; }
  }
  if (!best) return null;
  return kind === 'act' ? { type: 'act', it: best } : { type: 'hotspot', h: best };
}
function updatePrompt() {
  nearby = mode === 'walk' ? findNearby() : null;
  const el = $('#prompt');
  document.body.classList.toggle('aiming', !!nearby);
  $('#actBtn')?.classList.toggle('ready', !!nearby);
  if (!nearby) { el.classList.remove('show'); return; }
  const k = isTouch ? '点击' : '按 <kbd>E</kbd>';
  el.innerHTML = nearby.type === 'elevator' ? `${k} 乘坐电梯` : nearby.type === 'act' ? `${nearby.it.icon} ${k} ${nearby.it.label}` : `${k} 查看「${nearby.h.title}」`;
  el.classList.add('show');
}
function interact() {
  if (!nearby) return;
  if (nearby.type === 'elevator') openElevator(nearby.e);
  else if (nearby.type === 'act') { const it = nearby.it; it._cd = it.cooldown || 0.6; it.action(API); GP.emit('act', it.label); }
  else inspect(nearby.h);
}
// 查看：镜头平滑转向目标并靠近一点，同时目标轻微发光脉冲，然后展示信息卡
function inspect(h) {
  lookTarget.active = false;
  const target = (h.focus || h.pos).clone(); target.y += h.focusY ?? 1.4;
  const yaw1 = Math.atan2(-(target.x - player.pos.x), -(target.z - player.pos.z));
  const dist = Math.hypot(target.x - player.pos.x, target.z - player.pos.z);
  const pitch1 = Math.atan2(target.y - (player.pos.y + player.eye), Math.max(0.5, dist));
  let dy = yaw1 - player.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
  const y0 = player.yaw, p0 = player.pitch;
  mode = 'cutscene';
  Sound.tone(880, 0.06, { type: 'triangle', vol: 0.04 });
  tween(0.45, (k) => { const e = easeOut(k); player.yaw = y0 + dy * e; player.pitch = p0 + (pitch1 - p0) * e; camera.rotation.set(player.pitch, player.yaw, 0); },
    () => { if (h.onInspect) h.onInspect(API); mode = 'walk'; openInfo(h); });
}

const ICONS = { desk: '🛎️', tv: '📺', history: '📜', cafe: '☕', shop: '🛍️', meet: '👥', view: '🌃', flag: '🚩' };
function openInfo(h) {
  $('#infoIcon').textContent = ICONS[h.icon] || 'ℹ️';
  $('#infoTitle').textContent = h.title;
  $('#infoBody').innerHTML = h.html;
  openModal('#infoModal');
}
function openElevator(e) {
  if (riding) { toast('共享单车不能带进电梯，已自动还车', '🚲', '#2ec27e'); dropBike(); }
  const cur = e.level, cm = META_BY_KEY[cur];
  $('#elvNow').textContent = cm ? cm.num : '1F';
  $('#elvNowName').textContent = cm ? cm.short : '';
  $('#elevatorModal .modal-card').style.setProperty('--theme', cm ? cm.color : PINK);
  const list = $('#floorList'); list.innerHTML = '';
  [...FLOORS].reverse().forEach((f) => {
    const b = document.createElement('button');
    const here = f.key === cur;
    b.className = 'floor-card' + (here ? ' current' : '');
    b.style.setProperty('--c', f.color);
    b.innerHTML = `<span class="fc-num">${f.num}</span><span class="fc-ico">${f.icon}</span><span class="fc-txt"><b>${f.short}</b><small>${here ? '● 您在此层' : f.desc}</small></span><span class="fc-go">${here ? '' : '›'}</span>`;
    b.disabled = here;
    b.onclick = () => { closeModal(); rideElevator(f.key, e.x, e); };
    list.appendChild(b);
  });
  openModal('#elevatorModal');
}
// 到站横幅：主题色大楼层号 + 名称 + 介绍
function floorBanner(f) {
  const el = $('#floorBanner');
  el.style.setProperty('--c', f.color);
  el.querySelector('.fb-num').textContent = f.num;
  el.querySelector('.fb-ico').textContent = f.icon;
  el.querySelector('.fb-name').textContent = f.short;
  el.querySelector('.fb-desc').textContent = f.desc;
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
}
// 右侧楼层指示条
function buildFloorRail() {
  const rail = $('#floorRail'); rail.innerHTML = '';
  [...FLOORS].reverse().forEach(f => {
    const b = document.createElement('button'); b.dataset.key = f.key; b.style.setProperty('--c', f.color);
    b.innerHTML = `<i></i><span>${f.num}</span><em>${f.short}</em>`;
    b.onclick = (ev) => {
      ev.stopPropagation();
      const lv = currentLevel(); if (lv.key === f.key) return;
      if (!META_BY_KEY[lv.key]) return;
      rideElevator(f.key, 0);
    };
    rail.appendChild(b);
  });
}
function updateFloorRail(lv) {
  const inside = !!META_BY_KEY[lv.key] && lv.key !== 'lobby' || (lv.key === 'lobby');
  document.body.classList.toggle('in-tower', inside && mode !== 'orbit' && player.pos.y < TOWER.top + 8 && Math.abs(player.pos.x) < TOWER.W / 2 + 1 && Math.abs(player.pos.z) < TOWER.D / 2 + 1);
  document.querySelectorAll('#floorRail button').forEach(b => b.classList.toggle('active', b.dataset.key === lv.key));
}
const FLOOR_NUM = Object.fromEntries(FLOORS.map(f => [f.key, f.n]));
function rideElevator(k, x, e = null) {
  lookTarget.active = false;
  // 有对应的实体电梯 → 播放第一人称乘梯过场；否则（如从楼层条点击）走快速动画
  const lvKey = e ? e.level : currentLevel().key;
  const bank = elevatorDoors[lvKey];
  const door = bank ? (bank.find(d => d.x === (e ? e.x : 0)) || bank[1]) : null;
  if (!door || !elevatorDoors[k]) return quickRide(k, x);
  if (riding) dropBike(); standUp(); if (flight.on) endFlight();
  mode = 'cutscene';
  document.exitPointerLock?.();
  document.body.classList.add('cinematic-lite');
  const from = FLOOR_NUM[lvKey] || 1, to = FLOOR_NUM[k];
  const hud = $('#liftHud'); hud.style.setProperty('--c', META_BY_KEY[k].color);
  hud.querySelector('.lh-arrow').textContent = to > from ? '▲' : '▼';
  hud.querySelector('.lh-num').textContent = META_BY_KEY[lvKey]?.num || '1F';
  hud.querySelector('.lh-to').textContent = META_BY_KEY[k].short;
  const idxOf = (key) => FLOORS.findIndex(f => f.key === key);
  const car = liftCars[door.car]; car.hold = true;
  // 轿厢原本停在别的楼层：等待时一层层开过来
  const here = idxOf(lvKey); let away = car.idx === here ? Math.min(FLOORS.length - 1, here + 3 + Math.floor(Math.random() * 3)) : car.idx; car.dir = Math.sign(here - away);
  Object.assign(liftInfo, { num: META_BY_KEY[lvKey]?.num || '1F', arrow: to > from ? '▲' : '▼', to: META_BY_KEY[k].short, color: META_BY_KEY[k].color });
  $('#skipHint').classList.add('show');
  elevatorSequence({
    camera, player, from: lvKey, door, to: k, Sound,
    onStep: (what, d) => {
      if (what === 'foot') Sound.step('stone', false, 0.8);
      if (what === 'press') toast(`已按下 <b>${META_BY_KEY[k].num}</b>`, META_BY_KEY[k].icon, META_BY_KEY[k].color);
      if (what === 'run-start') hud.classList.add('show');
      if (what === 'pre-arrive') { visKey = null; updateFloorVisibility(true, k); }
      if (what === 'wait') { car.idx = Math.round(away + (here - away) * Math.min(1, d.k * 1.15)); if (car.idx === here) car.dir = 0; }
      if (what === 'run') {
        const n = Math.round(from + (to - from) * d.k), label = n >= 31 ? 'RF' : `${n}F`;
        hud.querySelector('.lh-num').textContent = label; liftInfo.num = label;
        // 门外显示屏同步：轿厢真实经过的楼层
        const fi = idxOf(lvKey), ti = idxOf(k); car.idx = Math.round(fi + (ti - fi) * d.k); car.dir = Math.sign(ti - fi);
      }
    },
    onArrive: () => {
      player.pos.set(door.x, META_BY_KEY[k].y, -12.8);
      visKey = null; updateFloorVisibility(true, k);
    },
  }).then(() => {
    car.hold = false; car.idx = idxOf(k); car.dir = 0; car.target = car.idx; car.wait = 3;
    Object.assign(liftInfo, { num: META_BY_KEY[k].num, arrow: '', to: '' });
    $('#skipHint').classList.remove('show');
    hud.classList.remove('show');
    document.body.classList.remove('cinematic-lite');
    player.vel.set(0, 0, 0); player.eyeY = player.pos.y + player.eye;
    floorBanner(META_BY_KEY[k]);
    resume();
  });
}
function quickRide(k, x) {
  const ov = $('#elevatorRide'); ov.classList.add('show');
  $('#rideTarget').textContent = ctx.levels[k].name;
  const from = FLOOR_NUM[currentLevel().key] || 1, to = FLOOR_NUM[k];
  $('#rideArrow').textContent = to > from ? '▲' : '▼';
  const dur = 1500, t0 = performance.now();
  const tick = () => {
    const f = Math.min(1, (performance.now() - t0) / dur), e = f < 0.5 ? 2 * f * f : 1 - Math.pow(-2 * f + 2, 2) / 2;
    const n = Math.round(from + (to - from) * e);
    $('#rideFloor').textContent = n >= 31 ? 'RF' : `${n}F`;
    $('#elevatorRide').style.setProperty('--c', META_BY_KEY[k].color);
    if (f < 1) requestAnimationFrame(tick);
  };
  tick();
  setTimeout(() => { teleport(k, x); }, 900);
  setTimeout(() => { ov.classList.remove('show'); Sound.ding(); resume(); }, 1900);
}

// ---------- 模式切换 ----------
const orbit = new OrbitControls(camera, renderer.domElement);
orbit.enabled = false; orbit.enableDamping = true; orbit.dampingFactor = 0.06;
orbit.minDistance = 20; orbit.maxDistance = 260; orbit.maxPolarAngle = Math.PI * 0.495;
orbit.autoRotate = true; orbit.autoRotateSpeed = 0.6;

function lock() { if (isTouch) return; try { const r = renderer.domElement.requestPointerLock?.(); r?.catch?.(() => {}); } catch (_) {} }
function resume() {
  if (mode === 'cutscene' && ctx.cutscene) return;
  $('#pauseOverlay').classList.remove('show');
  mode = 'walk';
  lock();
}
function openModal(sel) {
  if (mode !== 'modal') modalFrom = mode === 'orbit' ? 'orbit' : 'walk';
  mode = 'modal';
  document.exitPointerLock?.();
  document.querySelectorAll('.modal').forEach(m => m.classList.remove('show'));
  $(sel).classList.add('show');
}
let modalFrom = 'walk';
function closeModal(andResume = false) {
  document.querySelectorAll('.modal').forEach(m => m.classList.remove('show'));
  GP.onModalClosed();
  if (andResume) { if (modalFrom === 'orbit') mode = 'orbit'; else resume(); }
}
document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => closeModal(true)));

function enterOrbit() {
  mode = 'orbit';
  document.exitPointerLock?.();
  closeModal();
  $('#pauseOverlay').classList.remove('show');
  orbit.enabled = true;
  orbit.target.set(0, 55, 0);
  camera.position.set(72, 105, 88);
  document.body.classList.add('orbiting');
  flash('鸟瞰模式');
}
function exitOrbit() {
  orbit.enabled = false;
  document.body.classList.remove('orbiting');
  camera.rotation.order = 'YXZ';
  resume();
}

document.addEventListener('pointerlockchange', () => {
  if (document.pointerLockElement !== renderer.domElement && mode === 'walk') {
    mode = 'paused'; $('#pauseOverlay').classList.add('show');
  }
});
addEventListener('pointerdown', () => { if (mode === 'cutscene' && ctx.skipCutscene) ctx.skipCutscene(); });
renderer.domElement.addEventListener('click', () => { if (mode === 'walk' && !document.pointerLockElement) lock(); });
document.addEventListener('mousemove', (e) => {
  if (mode !== 'walk' || document.pointerLockElement !== renderer.domElement) return;
  if (Math.abs(e.movementX) > 180 || Math.abs(e.movementY) > 180) return; // 过滤锁定瞬间的异常跳变
  lookTarget.yaw -= e.movementX * 0.0022 * lookSens;
  lookTarget.pitch = Math.max(-1.45, Math.min(1.45, lookTarget.pitch - e.movementY * 0.0022 * lookSens));
  lookTarget.active = true;
});
document.addEventListener('keydown', (e) => {
  if (mode === 'typing' || window.__mg || window.__talk || mode === 'kart') return;
  if (mode === 'cutscene' && ctx.skipCutscene && ['Space', 'KeyE', 'Escape', 'Enter'].includes(e.code)) { e.preventDefault(); ctx.skipCutscene(); return; }
  keys[e.code] = true;
  if (e.code === 'Space' && mode === 'walk') { jump(); e.preventDefault(); }
  if (e.code === 'KeyE' && mode === 'walk') { if (riding && !nearby) dropBike(); else if (!nearby && isHolding()) useHeld(); else interact(); }
  if (e.code === 'KeyG' && mode === 'walk' && isHolding()) { drop(); toast('放下了手里的东西', '🤲', '#8a8f99'); }
  if (e.code === 'KeyQ' && mode === 'walk' && riding) dropBike();
  if (e.code === 'KeyB') { if (mode === 'orbit') exitOrbit(); else if (mode !== 'intro') enterOrbit(); }
  if (e.code === 'KeyN' && mode !== 'intro') toggleNight();
  if (e.code === 'KeyJ') cycleComfort();
  if (e.code === 'KeyM') $('#minimapWrap').classList.toggle('hidden');
  if (e.code === 'KeyH') $('#helpCard').classList.toggle('hidden');
  if (e.code === 'Escape' && mode === 'modal') closeModal(true);
  if (e.code === 'KeyT' && (mode === 'walk' || mode === 'orbit')) { e.preventDefault(); openDanmu(); }
  if (e.code === 'KeyP' && (mode === 'walk' || mode === 'orbit')) takePhoto();
  if (e.code === 'KeyF' && (mode === 'walk' || mode === 'orbit')) { celebrate(); GP.emit('firework'); }
  if (e.code === 'KeyL' && (mode === 'walk' || mode === 'paused' || mode === 'orbit')) GP.openBoard();
  if (/Digit[1-8]/.test(e.code) && (mode === 'walk' || mode === 'paused')) {
    if (riding) dropBike(); standUp();
    teleport(['plaza', 'lobby', 'office', 'roof', 'street', 'park', 'metro', 'expo'][+e.code.slice(5) - 1]);
  }
});
document.addEventListener('keyup', (e) => { keys[e.code] = false; });
window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

document.addEventListener('pointerdown', () => Sound.init(), { once: true });
function startWalk() {
  Sound.init(); Sound.click();
  questStart = performance.now();
  beginEnter('正在进入 bilibili 大楼', () => {
    flash(currentLevel().name || ctx.levels.plaza.name);
    if (!coachShown) { coachShown = true; setTimeout(() => coachShow(0), 900); }
    if (isTouch) setTimeout(() => $('#touchZoneHint').classList.add('show'), 300);
  });
  $('#intro').classList.add('hide');
  document.body.classList.add('started');
  if (isTouch) document.body.classList.add('touch');
  resume();
}
let coachShown = false;
// ---------- 点击开始后的进入进度条：等前若干帧真正渲染完成（着色器编译、贴图上传）再揭开画面 ----------
let entering = null;
const ENTER_STAGES = [[0.25, '刷工牌，验证身份…'], [0.55, '加载园区场景…'], [0.85, '点亮大楼灯光…'], [1.01, '准备就绪！']];
function setEnter(p) {
  const el = $('#enterLoad'); const pct = Math.round(p * 100);
  el.querySelector('.ld-fill').style.transform = `scaleX(${p})`; el.querySelector('.ld-head').style.left = pct + '%';
  el.querySelector('.ld-pct').textContent = pct + '%';
  el.querySelector('.ld-stage').textContent = ENTER_STAGES.find(([k]) => p < k)?.[1] || '准备就绪！';
}
function beginEnter(title, onDone) {
  const el = $('#enterLoad');
  el.querySelector('.ld-title').textContent = title;
  const tips = window.__tips || []; el.querySelector('.ld-tip').textContent = tips[Math.floor(Math.random() * tips.length)] || '';
  el.classList.remove('hide'); el.classList.add('show'); setEnter(0);
  entering = { t0: performance.now(), frames: 0, onDone };
}
function tickEnter() {
  if (!entering) return;
  entering.frames++;
  const el = performance.now() - entering.t0;
  const p = Math.min(1, Math.min(entering.frames / 14, 1) * 0.65 + Math.min(el / 1600, 1) * 0.35);
  setEnter(p);
  if (entering.frames >= 14 && el >= 1600) {
    const done = entering.onDone; entering = null; setEnter(1);
    setTimeout(() => { $('#enterLoad').classList.add('hide'); $('#enterLoad').classList.remove('show'); }, 220);
    done && done();
  }
}
$('#startBtn').addEventListener('click', () => { Sound.init(); Sound.click(); if (!badge) openBadgePick(true); else startWalk(); });
$('#orbitStartBtn').addEventListener('click', () => {
  beginEnter('正在升空鸟瞰', null);
  $('#intro').classList.add('hide');
  document.body.classList.add('started');
  if (isTouch) document.body.classList.add('touch');
  enterOrbit();
});
$('#resumeBtn').addEventListener('click', resume);
$('#exitOrbitBtn').addEventListener('click', exitOrbit);
document.querySelectorAll('.nav [data-go]').forEach(b => b.addEventListener('click', (e) => {
  e.stopPropagation();
  const k = b.dataset.go;
  if (k === 'orbit') { mode === 'orbit' ? exitOrbit() : enterOrbit(); return; }
  if (mode === 'orbit') { orbit.enabled = false; document.body.classList.remove('orbiting'); }
  if (riding) dropBike(); standUp();
  teleport(k); resume();
}));
$('#nightBtn').addEventListener('click', (e) => { e.stopPropagation(); toggleNight(); });
$('#danmuBtn').addEventListener('click', (e) => { e.stopPropagation(); if (mode === 'paused') resume(); openDanmu(); });
$('#photoBtn').addEventListener('click', (e) => { e.stopPropagation(); takePhoto(); });
$('#fireBtn').addEventListener('click', (e) => { e.stopPropagation(); celebrate(); GP.emit('firework'); });
$('#soundBtn').addEventListener('click', (e) => {
  e.stopPropagation(); Sound.init(); Sound.on = !Sound.on;
  $('#soundBtn').classList.toggle('off', !Sound.on); { const sb = $('#soundBtn'); const old = sb.querySelector('.ic'); if (old) old.outerHTML = ic(Sound.on ? 'speaker' : 'mute'); }
});
$('#winFire').addEventListener('click', () => celebrate());
document.querySelectorAll('.metro-st').forEach(b => b.addEventListener('click', () => {
  closeModal();
  const ov = $('#elevatorRide'); ov.classList.add('show'); $('#rideTarget').textContent = b.querySelector('b').textContent; $('#rideFloor').textContent = 'M12'; $('#rideArrow').textContent = '▶';
  setTimeout(() => { if (riding) dropBike(); standUp(); teleport(b.dataset.go); }, 900);
  setTimeout(() => { ov.classList.remove('show'); Sound.ding(); resume(); }, 1900);
}));
if (isTouch) $('#dropBtn').addEventListener('touchstart', (e) => { e.preventDefault(); dropBike(); }, { passive: false });
if (isTouch) {
  const fb = $('#flyBtn');
  fb.addEventListener('touchstart', (e) => { e.preventDefault(); flyHold = true; fb.classList.add('press'); vibrate(12); }, { passive: false });
  const up = (e) => { flyHold = false; fb.classList.remove('press'); };
  fb.addEventListener('touchend', up); fb.addEventListener('touchcancel', up);
}
setCoins(coins); $('#bagCount').textContent = bag.size;

// ---------- 触屏控制（浮动摇杆：左半屏任意处按下即出现；右半屏滑动转视角） ----------
const vibrate = (ms = 12) => { try { navigator.vibrate?.(ms); } catch (_) {} };
if (isTouch) {
  const stick = $('#joystick'), knob = $('#joyKnob');
  const R = 56; // 摇杆半径
  let sid = null, sc = null, lid = null, lp = null, lvx = 0, lvy = 0;
  const canvas = renderer.domElement;
  const placeStick = (x, y) => { stick.style.left = `${x - 64}px`; stick.style.top = `${y - 64}px`; stick.style.bottom = 'auto'; stick.classList.add('active'); };
  const resetStick = () => { stick.classList.remove('active'); stick.style.left = ''; stick.style.top = ''; stick.style.bottom = ''; knob.style.transform = ''; joy.x = joy.y = 0; speedMul = 1; stick.classList.remove('sprint'); };
  canvas.addEventListener('touchstart', (e) => {
    $('#touchZoneHint').classList.remove('show');
    if (mode !== 'walk' && mode !== 'orbit' && mode !== 'kart') return;
    for (const t of e.changedTouches) {
      if ((mode === 'walk' || mode === 'kart') && t.clientX < innerWidth * 0.45 && sid === null) {
        sid = t.identifier; sc = { x: t.clientX, y: t.clientY }; placeStick(sc.x, sc.y);
      } else if (lid === null) { lid = t.identifier; lp = { x: t.clientX, y: t.clientY }; lvx = lvy = 0; }
    }
  }, { passive: true });
  window.addEventListener('touchmove', (e) => {
    for (const t of e.changedTouches) {
      if (t.identifier === sid) {
        let dx = t.clientX - sc.x, dy = t.clientY - sc.y; const d = Math.hypot(dx, dy);
        if (d > R) { dx *= R / d; dy *= R / d; }
        knob.style.transform = `translate(${dx}px,${dy}px)`;
        // 死区 + 推到边缘自动奔跑
        const k = d < 8 ? 0 : 1;
        joy.x = (dx / R) * k; joy.y = (dy / R) * k;
        const sprint = d > R * 0.95 && dy < -R * 0.5;
        if (sprint !== (speedMul > 1)) { speedMul = sprint ? 1.9 : 1; stick.classList.toggle('sprint', sprint); if (sprint) vibrate(8); }
      } else if (t.identifier === lid && mode === 'walk') {
        // 灵敏度随屏幕宽度自适应，轻微平滑避免抖动
        const sens = 3.2 / Math.max(innerWidth, 360) * lookSens;
        lvx = lvx * 0.35 + (t.clientX - lp.x) * 0.65; lvy = lvy * 0.35 + (t.clientY - lp.y) * 0.65;
        lookTarget.yaw -= lvx * sens; lookTarget.pitch = Math.max(-1.3, Math.min(1.3, lookTarget.pitch - lvy * sens)); lookTarget.active = true;
        lp = { x: t.clientX, y: t.clientY };
      }
    }
  }, { passive: true });
  const end = (e) => { for (const t of e.changedTouches) { if (t.identifier === sid) { sid = null; resetStick(); } if (t.identifier === lid) lid = null; } };
  window.addEventListener('touchend', end); window.addEventListener('touchcancel', end);
  $('#jumpBtn').addEventListener('touchstart', (e) => { e.preventDefault(); jump(); vibrate(10); $('#jumpBtn').classList.add('press'); setTimeout(() => $('#jumpBtn').classList.remove('press'), 160); }, { passive: false });
  $('#actBtn').addEventListener('touchstart', (e) => { e.preventDefault(); if (nearby) { vibrate(14); interact(); } else if (isHolding()) { vibrate(10); useHeld(); } }, { passive: false });
  $('#prompt').addEventListener('click', interact);
  // 横竖屏切换后重新计算布局
  addEventListener('orientationchange', () => setTimeout(() => dispatchEvent(new Event('resize')), 300));
}

// ---------- 手机新增按键：蹲 / 跑 / 放下 ----------
if (isTouch) {
  const hold = (el, on, off) => {
    el.addEventListener('touchstart', (e) => { e.preventDefault(); el.classList.add('press'); vibrate(8); on(); }, { passive: false });
    const up = () => { el.classList.remove('press'); off && off(); };
    el.addEventListener('touchend', up); el.addEventListener('touchcancel', up);
  };
  hold($('#crouchBtn'), () => { keys.KeyC = true; }, () => { keys.KeyC = false; });
  hold($('#runBtn'), () => { runLock = !runLock; $('#runBtn').classList.toggle('on', runLock); toast(runLock ? '已开启常驻奔跑' : '已关闭常驻奔跑', '🏃', PINK); });
  hold($('#putBtn'), () => { if (isHolding()) { drop(); toast('放下了手里的东西', '🤲', '#8a8f99'); } });
}
// ---------- 游戏菜单（手机 ☰ / 电脑暂停层）----------
function openGameMenu() { if (mode === 'intro' || mode === 'cutscene') return; openModal('#gameMenu'); syncGameMenu(); }
function syncGameMenu() {
  $('#sensRange').value = lookSens; $('#sensVal').textContent = lookSens.toFixed(1) + '×';
  document.querySelectorAll('#gameMenu [data-q]').forEach(b => b.classList.toggle('on', +b.dataset.q === quality));
  const nb = document.querySelector('#gameMenu [data-gm="night"]'); nb.innerHTML = `${ic({ day: 'sun', dusk: 'sunset', night: 'moon' }[timePhase])}<span>昼夜</span>`;
}
$('#menuBtn').addEventListener('click', (e) => { e.stopPropagation(); Sound.click(); openGameMenu(); });
$('#pauseMenuBtn').addEventListener('click', (e) => { e.stopPropagation(); $('#pauseOverlay').classList.remove('show'); openGameMenu(); });
$('#pauseHomeBtn').addEventListener('click', (e) => { e.stopPropagation(); backToMenu(); });
$('#gmHome').addEventListener('click', () => backToMenu());
document.querySelectorAll('#gameMenu [data-gm]').forEach(b => b.addEventListener('click', () => {
  const k = b.dataset.gm; Sound.click();
  if (k === 'night') { toggleNight(); syncGameMenu(); return; }
  if (k === 'map') { $('#minimapWrap').classList.toggle('hidden'); toast($('#minimapWrap').classList.contains('hidden') ? '小地图已隐藏' : '小地图已显示', '🗺️', BLUE_C); return; }
  if (k === 'sound') { $('#soundBtn').click(); return; }
  if (k === 'task') { GP.openBoard(); return; }
  if (k === 'arcade' || k === 'rhythm') { closeModal(); GP.openGame(k); return; }
  closeModal(k !== 'orbit' && k !== 'badge');
  setTimeout(() => {
    if (k === 'danmu') $('#danmuBtn').click();
    else if (k === 'photo') $('#photoBtn').click();
    else if (k === 'fire') $('#fireBtn').click();
    else if (k === 'orbit') enterOrbit();
    else if (k === 'badge') $('#myBadge').click();
    else if (k === 'deliver') GP.startOrder();
  }, 120);
}));
const BLUE_C = '#00AEEC';
$('#sensRange').addEventListener('input', (e) => { lookSens = +e.target.value; localStorage.setItem('bili_sens', lookSens); $('#sensVal').textContent = lookSens.toFixed(1) + '×'; });
document.querySelectorAll('#gameMenu [data-q]').forEach(b => b.addEventListener('click', () => { setQuality(+b.dataset.q); syncGameMenu(); }));
function setQuality(q, silent = false) {
  quality = q; localStorage.setItem('bili_quality', q);
  const pr = Math.min(devicePixelRatio, [0.85, 1.1, 1.5][q]);
  renderer.setPixelRatio(pr); composer.setPixelRatio?.(pr);
  renderer.shadowMap.enabled = q > 0; sun.castShadow = q > 0;
  bloom.enabled = q > 0;
  renderer.setSize(innerWidth, innerHeight); composer.setSize(innerWidth, innerHeight);
  if (!silent) toast(`画质：${['省电', '均衡', '高清'][q]}`, '⚙️', BLUE_C);
}
function backToMenu() {
  if (isRacing()) quitRace();
  if (isTalking()) closeTalk();
  closeModal(); $('#pauseOverlay').classList.remove('show');
  if (riding) dropBike(); standUp();
  if (mode === 'orbit') { orbit.enabled = false; document.body.classList.remove('orbiting'); }
  document.exitPointerLock?.();
  mode = 'intro'; introFrames = 0; runLock = false; $('#runBtn')?.classList.remove('on');
  for (const k in keys) keys[k] = false;
  $('#intro').classList.remove('hide'); document.body.classList.remove('started');
  renderMenuBadge(); renderMenuStats();
}

// ---------- 昼夜 ----------
const DAY = { top: 0x3a7fd0, mid: 0xcfe2f0, bottom: 0x8e9aa8, fog: 0xa9c4dc, fogD: 0.0011, hemi: 0.95, sun: 1.9, exp: 1.0, bloom: 0.18, stars: 0, orb: 0xfff6d8, orbPos: [500, 650, -900] };
const NIGHT = { top: 0x030614, mid: 0x1a1d3d, bottom: 0x0b0d18, fog: 0x10142c, fogD: 0.0016, hemi: 0.5, sun: 0.25, exp: 1.05, bloom: 0.5, stars: 1, orb: 0xe8eeff, orbPos: [-600, 520, -1100] };
const DUSK = { top: 0x2b3a72, mid: 0xf2a06a, bottom: 0x4a3c52, fog: 0xc9927a, fogD: 0.0013, hemi: 0.72, sun: 1.75, exp: 1.02, bloom: 0.32, stars: 0.12, orb: 0xffa860, orbPos: [-950, 120, -480] };
let timePhase = 'night';
function applyTime(phase) {
  if (phase === true) phase = 'night'; else if (phase === false) phase = 'day';
  timePhase = phase;
  const P = phase === 'night' ? NIGHT : phase === 'dusk' ? DUSK : DAY;
  const f = phase === 'night' ? 1 : phase === 'dusk' ? 0.55 : 0, night = phase === 'night', dusk = phase === 'dusk';
  ctx.isNight = f > 0.5; ctx.nightF = f;
  sky.uniforms.top.value.set(P.top); sky.uniforms.mid.value.set(P.mid); sky.uniforms.bottom.value.set(P.bottom); sky.uniforms.starAmt.value = P.stars;
  scene.fog.color.set(P.fog); scene.fog.density = P.fogD;
  scene.environmentIntensity = night ? 0.08 : dusk ? 0.22 : 0.35;
  hemi.intensity = P.hemi; hemi.color.set(dusk ? 0xffc9a8 : 0xbfd8ff); hemi.groundColor.set(dusk ? 0x4a3a40 : 0x3a4050);
  sun.intensity = P.sun; sun.color.set(night ? 0x8ea4ff : dusk ? 0xff9a55 : 0xffe7c8);
  sun.position.set(...(dusk ? [-250, 62, 70] : [140, 260, 110]));   // 黄昏：太阳压低，拉出长影
  renderer.toneMappingExposure = P.exp; bloom.strength = P.bloom;
  setShaftDaylight(night);
  shaftMats.forEach(m => m.color.set(dusk ? 0xffb070 : 0xfff0d6));
  const G = { day: [[1.06, 1.01, 0.93], [0.95, 0.99, 1.05], 0.26], dusk: [[1.14, 1.0, 0.84], [0.88, 0.94, 1.12], 0.34], night: [[1.02, 0.98, 1.0], [0.9, 0.96, 1.1], 0.38] }[phase];
  grade.uniforms.uWarm.value.set(...G[0]); grade.uniforms.uCool.value.set(...G[1]); grade.uniforms.uVignette.value = G[2];
  sky.orb.material.color.set(P.orb); sky.orb.position.set(...P.orbPos); sky.orb.scale.setScalar(night ? 1 : dusk ? 2.6 : 1.6);
  for (const { mat, day, night: n } of ctx.nightMats) mat.emissiveIntensity = day + (n - day) * f;
  (ctx.lampLights || []).forEach(l => l.intensity = f > 0.4 ? 24 : 0);
  setDetailTime(f);
  $('#nightBtn .ico').innerHTML = ic(night ? 'moon' : dusk ? 'sunset' : 'sun');
  $('#nightBtn .lbl').textContent = night ? '夜晚' : dusk ? '黄昏' : '白天';
}
function toggleNight() { const nx = { day: 'dusk', dusk: 'night', night: 'day' }[timePhase]; applyTime(nx); flash({ day: '白天', dusk: '黄昏 · 日落时分', night: '夜晚' }[nx]); }
applyTime(true);

// ---------- 小地图 ----------
const mm = $('#minimap'), mg = mm.getContext('2d');
const MM = 180;
// 跟随玩家的小地图：园区内 1px≈1m，城市里自动缩小视野（1px≈2m）
let mmZoom = 1;
function drawMinimap() {
  const lvl = currentLevel();
  const p = mode === 'orbit' ? orbit.target : player.pos;
  const outside = Math.abs(p.x) > PLAZA || Math.abs(p.z) > PLAZA;
  mmZoom += ((outside ? 0.5 : 0.95) - mmZoom) * 0.2;
  const s = mmZoom;
  mg.clearRect(0, 0, MM, MM);
  mg.save(); mg.translate(MM / 2, MM / 2);
  mg.translate(-p.x * s, -p.z * s);
  const indoor = lvl.key !== 'plaza';
  // 道路底色
  mg.fillStyle = '#1b1f28'; mg.fillRect(-300 * s, -300 * s, 600 * s, 600 * s);
  mg.fillStyle = '#3a404c';
  for (const r of [-300, -100, 100, 300]) { mg.fillRect(-300 * s, (r - 6) * s, 600 * s, 12 * s); mg.fillRect((r - 6) * s, -300 * s, 12 * s, 600 * s); }
  // 主题街区
  mg.fillStyle = 'rgba(79,154,92,0.7)'; mg.fillRect(115 * s, -85 * s, 170 * s, 170 * s);                // 公园
  mg.fillStyle = 'rgba(42,109,146,0.9)'; mg.beginPath(); mg.arc(220 * s, 20 * s, 30 * s, 0, 7); mg.fill();
  mg.fillStyle = 'rgba(143,132,120,0.8)'; mg.fillRect(-15 * s, 115 * s, 30 * s, 170 * s);             // 步行街
  mg.fillStyle = 'rgba(122,92,255,0.45)'; mg.beginPath(); mg.arc(0, -225 * s, 42 * s, 0, 7); mg.fill(); // BW
  mg.fillStyle = 'rgba(154,161,171,0.5)'; mg.fillRect(-285 * s, -85 * s, 170 * s, 170 * s);            // 地铁区
  mg.fillStyle = 'rgba(120,110,170,0.5)'; mg.fillRect(NEWGEN.x0 * s, NEWGEN.z0 * s, (NEWGEN.x1 - NEWGEN.x0) * s, (NEWGEN.z1 - NEWGEN.z0) * s);  // 新世代产业园
  mg.fillStyle = 'rgba(42,109,146,0.9)'; mg.fillRect(NEWGEN.x0 * s, (NEWGEN.z1 - 4) * s, (NEWGEN.x1 - NEWGEN.x0) * s, 10 * s);   // 黄浦江
  mg.fillStyle = '#FB7299'; mg.beginPath(); mg.arc(160 * s, 238 * s, 6, 0, 7); mg.fill(); mg.fillStyle = '#7fd8ff'; mg.fillRect(205 * s, 162 * s, 18 * s, 12 * s);
  // 新场景色块
  mg.fillStyle = 'rgba(76,138,74,0.55)'; mg.fillRect((ZONES.kart.x - 88) * s, (ZONES.kart.z - 88) * s, 176 * s, 176 * s);
  mg.fillStyle = 'rgba(90,96,108,0.7)'; mg.beginPath(); mg.ellipse(ZONES.arena.x * s, ZONES.arena.z * s, 62 * s, 52 * s, 0, 0, 7); mg.fill();
  mg.strokeStyle = PINK; mg.lineWidth = 2; mg.stroke();
  mg.fillStyle = 'rgba(138,124,112,0.6)'; mg.fillRect((ZONES.market.x - 88) * s, (ZONES.market.z - 88) * s, 176 * s, 176 * s);
  drawKartMinimap(mg, s);
  for (const f of ctx.cityFootprints || []) { mg.fillStyle = 'rgba(70,78,92,0.95)'; mg.fillRect((f.x - f.w / 2) * s, (f.z - f.d / 2) * s, f.w * s, f.d * s); }
  // 园区
  mg.fillStyle = 'rgba(40,46,60,0.95)'; mg.fillRect(-PLAZA * s, -PLAZA * s, PLAZA * 2 * s, PLAZA * 2 * s);
  mg.fillStyle = 'rgba(79,154,92,0.75)';
  for (const [x, z, w, d] of [[-55, -40, 56, 70], [55, -40, 56, 70], [-58, 55, 50, 46], [58, 55, 50, 46]]) mg.fillRect((x - w / 2) * s, (z - d / 2) * s, w * s, d * s);
  for (const f of FOOTPRINTS) { mg.fillStyle = f.type === 'tower' ? 'rgba(120,180,220,0.6)' : 'rgba(90,98,112,0.8)'; mg.fillRect((f.x - f.w / 2) * s, (f.z - f.d / 2) * s, f.w * s, f.d * s); }
  mg.fillStyle = indoor ? 'rgba(251,114,153,0.35)' : PINK; mg.strokeStyle = PINK; mg.lineWidth = 1.5;
  mg.fillRect(-TOWER.W / 2 * s, -TOWER.D / 2 * s, TOWER.W * s, TOWER.D * s);
  mg.strokeRect(-TOWER.W / 2 * s, -TOWER.D / 2 * s, TOWER.W * s, TOWER.D * s);
  // 地标图标
  mg.font = `${Math.round(12)}px sans-serif`; mg.textAlign = 'center'; mg.textBaseline = 'middle';
  for (const l of landmarks) { mg.globalAlpha = l.found ? 1 : 0.45; if (!drawIcon(mg, l.icon || 'pin', l.pos.x * s, l.pos.z * s - 2, 18)) mg.fillText('•', l.pos.x * s, l.pos.z * s); }
  mg.globalAlpha = 1;
  { const ot = GP.orderTarget(); if (ot && Math.abs(ot.y - player.pos.y) < 1.6) { mg.fillStyle = 'rgba(251,114,153,0.35)'; mg.beginPath(); mg.arc(ot.x * s, ot.z * s, 9, 0, Math.PI * 2); mg.fill(); drawIcon(mg, 'gift', ot.x * s, ot.z * s, 16); } }
  mg.globalAlpha = 1;
  // 共享单车点
  mg.fillStyle = '#2ec27e';
  for (const d of bikeDocks) if (!d.inUse) { mg.fillRect(d.home.x * s - 1.5, d.home.z * s - 1.5, 3, 3); }
  // 徽章 & 热点（同层）
  for (const it of ctx.collectibles || []) {
    if (it.taken || Math.abs(it.floor - player.pos.y) > 3) continue;
    mg.fillStyle = KINDS[it.kind].color; mg.strokeStyle = '#fff'; mg.lineWidth = 1;
    mg.beginPath(); mg.arc(it.mesh.position.x * s, it.mesh.position.z * s, 3.2, 0, Math.PI * 2); mg.fill(); mg.stroke();
  }
  mg.fillStyle = '#7fd8ff';
  for (const h of ctx.hotspots) if (Math.abs(h.pos.y - player.pos.y) < 3) { mg.beginPath(); mg.arc(h.pos.x * s, h.pos.z * s, 2.2, 0, Math.PI * 2); mg.fill(); }
  mg.restore();
  // 玩家箭头固定在中心
  const yaw = mode === 'orbit' ? Math.atan2(-(orbit.target.x - camera.position.x), -(orbit.target.z - camera.position.z)) : player.yaw;
  mg.save(); mg.translate(MM / 2, MM / 2); mg.rotate(-yaw);
  mg.fillStyle = 'rgba(255,255,255,0.18)'; mg.beginPath(); mg.moveTo(0, 0); mg.arc(0, 0, 26, -Math.PI / 2 - 0.6, -Math.PI / 2 + 0.6); mg.fill();
  mg.fillStyle = riding ? '#2ec27e' : '#fff'; mg.strokeStyle = PINK; mg.lineWidth = 2;
  mg.beginPath(); mg.moveTo(0, -7); mg.lineTo(5, 5); mg.lineTo(0, 2.5); mg.lineTo(-5, 5); mg.closePath(); mg.fill(); mg.stroke();
  mg.restore();
  $('#levelName').textContent = mode === 'orbit' ? '鸟瞰模式' : flight.on ? `飞行中 · ${lvl.name.replace(/^\S+\s/, '')}` : lvl.name;
  const lm = META_BY_KEY[lvl.key];
  { const v = mode === 'orbit' ? '@satellite' : flight.on ? '@wings' : lm ? lm.num : '@pin'; const el = $('#levelBadge'); if (el.dataset.v !== v) { el.dataset.v = v; if (v[0] === '@') el.innerHTML = ic(v.slice(1)); else el.textContent = v; } }
  $('#topbar').style.setProperty('--lc', lm ? lm.color : '#7fd8ff');
  updateFloorRail(lvl);
  $('#coords').textContent = mode === 'orbit' ? '' : `高度 ${player.pos.y.toFixed(0)} m`;
  document.querySelectorAll('.nav [data-go]').forEach(b => b.classList.toggle('active', mode === 'orbit' ? b.dataset.go === 'orbit' : (b.dataset.go === lvl.key || (lvl.key === 'city' && b.dataset.go === 'street'))));
}

// ---------- 新手引导：3 步目标驱动，完成即推进 ----------
const COACH = [
  { text: () => `沿着 <b>粉色引导线</b> 向前走，穿过自动门进入大堂`, done: () => currentLevel().key === 'lobby' },
  { text: () => `跟随 <b>彩色光柱</b> 拾取一枚「赞 / 币 / 藏」徽章`, done: () => questStats().got >= 1 },
  { text: () => `走到大堂后方 <b>电梯门</b> 前，${isTouch ? '点「互动」' : '按 <kbd>E</kbd>'} 前往天台`, done: () => currentLevel().key === 'roof' || currentLevel().key === 'office' },
];
let coachStep = -1, coachTimer = 0;
function coachShow(i) {
  coachStep = i;
  const el = $('#coach');
  if (i >= COACH.length) { el.classList.remove('show'); toast('新手引导完成！自由探索吧 ✨', '🎓', '#FFB027'); return; }
  $('#coachText').innerHTML = COACH[i].text();
  document.querySelectorAll('.coach-dots i').forEach((d, k) => d.classList.toggle('on', k <= i));
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
}
function updateCoach(dt) {
  if (coachStep < 0 || coachStep >= COACH.length || mode !== 'walk') return;
  coachTimer += dt;
  if (coachTimer > 0.4) { coachTimer = 0; if (COACH[coachStep].done()) { Sound.ding(); vibrate(20); coachShow(coachStep + 1); } }
}

// ---------- 室内楼层可见性：幕墙不透明，只渲染玩家所在楼层 ----------
let visKey = null, frameN = 0;
function updateFloorVisibility(force = false, forceKey = null) {
  if (mode === 'cutscene' && !force) return;
  const lv = mode === 'orbit' || mode === 'intro' || mode === 'ride' ? null : currentLevel();
  const key = forceKey || (lv ? lv.key : null);
  if (key === visKey) return;
  visKey = key;
  for (const [k, g] of Object.entries(floorGroups)) g.visible = k === key;
}
function updateDistrictCulling() {
  const c = mode === 'orbit' ? orbit.target : player.pos;
  const far = mode === 'orbit' ? 420 : 260;
  for (const g of districtGroups) g.visible = c.distanceTo(g.userData.center) < far && !(player.pos.y > 3 && Math.abs(player.pos.x) < TOWER.W / 2 && Math.abs(player.pos.z) < TOWER.D / 2 && mode === 'walk');
}

// ---------- 性能自适应：持续低帧率时降低像素比和阴影 ----------
let fpsAcc = 0, fpsN = 0, quality = TIER;
queueMicrotask(() => { const q = localStorage.getItem('bili_quality'); if (q !== null && +q !== TIER) setQuality(+q, true); });
function adaptQuality(dt) {
  fpsAcc += dt; fpsN++;
  if (fpsAcc < 2.5) return;
  const fps = fpsN / fpsAcc; fpsAcc = 0; fpsN = 0;
  if (fps < 45 && quality > 0) {
    quality--;
    if (quality === 1) { renderer.setPixelRatio(1); composer.setPixelRatio?.(1); }
    if (quality === 0) { grade.uniforms.uGrain.value = 0; renderer.shadowMap.enabled = false; sun.castShadow = false; bloom.resolution?.set(innerWidth / 2, innerHeight / 2); renderer.setPixelRatio(0.85); composer.setPixelRatio?.(0.85); }
    renderer.setSize(innerWidth, innerHeight); composer.setSize(innerWidth, innerHeight);
  }
}

// ---------- 主循环 ----------
const clock = new THREE.Clock();
let t = 0, mmAcc = 0;
camera.position.set(0, 1.65, 86);
let dtS = 1 / 60;
const introEl = document.getElementById('intro'); let introFrames = 0;
function frame() {
  if (window.__pauseLoop) { requestAnimationFrame(frame); return; }
  // 主菜单期间：背景是静态插画，完全遮住 3D 画布 → 只预热前 6 帧（编译着色器），之后停止渲染，菜单零卡顿
  if (mode === 'intro' && introEl && !introEl.classList.contains('hide') && ++introFrames > 6) { clock.getDelta(); requestAnimationFrame(frame); return; }
  const raw = Math.min(clock.getDelta(), 0.05);
  dtS += (raw - dtS) * 0.25;            // 指数平滑，吸收偶发的长帧
  const dt = Math.abs(raw - dtS) > 0.02 ? raw : dtS;
  t += dt;
  if (entering) { for (const k in keys) keys[k] = false; joy.x = joy.y = 0; }
  for (const it of interactables) if (it._cd > 0) it._cd -= dt;
  for (let i = tempAnims.length - 1; i >= 0; i--) if (tempAnims[i](dt)) tempAnims.splice(i, 1);
  if (mode === 'ride' && ferrisRide) updateFerris(dt);
  if (mode === 'cutscene' && ctx.cutscene) { if (ctx.cutscene(dt)) ctx.cutscene = null; }
  if (mode === 'walk') { updatePlayer(dt); constrainArena(player.pos); }
  else if (mode === 'kart') tickKart(dt);
  else if (mode === 'orbit') orbit.update();
  else if (mode === 'intro') {
    const a = t * 0.08;
    camera.position.set(Math.sin(a) * 120, 66 + Math.sin(t * 0.2) * 12, Math.cos(a) * 120 + 10);
    camera.lookAt(0, 62, 0);
  }
  GP.tick(dt);
  tickDialogue(dt);
  tickArena(dt, t);
  tickMarket(dt, t);
  updateElevatorDoors(dt);
  tickHall(dt, visKey || currentLevel().key);
  propsTick(dt);
  updateNPCs(dt, player.pos, camera.position);
  updateAmbience();
  for (const f of ctx.animators) f(dt, t);
  tickDetails(dt, t);
  danmaku.update(dt);
  fireworks.update(dt, () => Sound.pop());
  updatePrompt();
  adaptQuality(dt);
  updateFloorVisibility();
  if ((frameN++ & 7) === 0) updateDistrictCulling();
  updateCoach(dt);
  mmAcc += dt; if (mmAcc > 0.1 && mode !== 'intro') { mmAcc = 0; drawMinimap(); }
  composer.render();
  tickEnter();
  requestAnimationFrame(frame);
}
frame();

addEventListener('resize', () => {
  grade.uniforms.uAspect.value = innerWidth / innerHeight;
  baseFov = isMobile && innerHeight > innerWidth ? 80 : 75;
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight); composer.setSize(innerWidth, innerHeight);
});

// ---------- 互动玩法：等级 / 任务 / 跑腿 / 小游戏 ----------
GP.initGameplay({
  scene, camera, player, ctx, interactables, isTouch, Sound,
  toast: (h, i, c) => toast(h, i, c), coins: () => coins, setCoins: (v) => setCoins(v), addItem: (n, i) => addItem(n, i),
  openModal: (s) => openModal(s), closeModal: (r) => closeModal(r), celebrate: (n) => celebrate(n),
  state: () => ({ level: currentLevel().key, mode, riding: !!riding, flying: flight.on, landmarksLeft: landmarks.filter(l => !l.found).length }),
  gotoZone(k) { if (riding) dropBike(); standUp(); teleport(k); },
  goto(key, x, z, yaw = 0) {
    if (riding) dropBike(); standUp();
    teleport(key); player.pos.set(x, META_BY_KEY[key].y, z); player.yaw = yaw; player.eyeY = player.pos.y + player.eye;
    toast('已到达，靠近机器按 <kbd>E</kbd>（手机点「互动」）开始游戏', 'pin', BLUE_HEX);
  },
});
window.__gp = GP; window.__ints = interactables; window.__kartTick = (dt) => tickKart(dt);
// ---------- 人物交互 2.0：对话 / 好感度 / 委托 ----------
initDialogue({
  scene, camera, player, isTouch, Sound, GP,
  toast: (h, i, c) => toast(h, i, c), coins: () => coins, setCoins: (v) => setCoins(v), addItem: (n, i) => addItem(n, i),
  celebrate: (n) => celebrate(n), takePhoto: () => takePhoto(), gesture: (k) => gesture(k),
  heldName: () => heldName(), consumeHeld: () => consumeHeld(),
  getMode: () => mode, setMode: (m) => { mode = m; }, resume: () => resume(),
  syncLook: () => { lookTarget.yaw = player.yaw; lookTarget.pitch = player.pitch; lookTarget.active = false; },
  baseFov: () => baseFov, levelKey: () => currentLevel().key,
  goto(key, name) {
    const ov = $('#napFade'); ov && ov.classList.add('quick', 'show');
    setTimeout(() => { if (riding) dropBike(); standUp(); teleport(key); toast(`同事带你来到了「${name}」`, 'pin', BLUE_HEX); }, 500);
    setTimeout(() => { ov && ov.classList.remove('show'); setTimeout(() => ov && ov.classList.remove('quick'), 600); }, 1100);
  },
});
ctx.openTalk = (n) => openTalk(n);
// ---------- 新场景：卡丁车 / BML / 夜市 ----------
ZD.D = {
  scene, camera, player, ctx, keys, joy, isTouch, Sound, GP,
  toast: (h, i, c) => toast(h, i, c), coins: () => coins, setCoins: (v) => setCoins(v), celebrate: (n) => celebrate(n),
  gesture: (k) => gesture(k), standUp: () => { if (riding) dropBike(); standUp(); },
  setMode: (m) => { mode = m; }, resume: () => resume(), baseFov: () => baseFov,
  openMini: (k) => GP.openGame(k),
};
initKart();
$('#taskBtn').addEventListener('click', (e) => { e.stopPropagation(); Sound.click(); GP.openBoard(); });
renderMenuStats();

// 加载完成：预热着色器（避免首次进入时卡顿），最多等 3.5 秒
await boot(95, '预热画面着色器…');
try { await Promise.race([renderer.compileAsync ? renderer.compileAsync(scene, camera) : Promise.resolve(renderer.compile(scene, camera)), new Promise(r => setTimeout(r, 3500))]); } catch (_) {}
await boot(100, '大楼搭建完成！');
setTimeout(() => { $('#loader').classList.add('done'); setTimeout(() => $('#loader').remove(), 800); }, 250);
// URL 参数直达：?spot=lobby|office|roof|plaza|orbit &day=1
{
  const q = new URLSearchParams(location.search), spot = q.get('spot');
  if (q.get('day') === '1') applyTime('day');
  if (q.get('dusk') === '1') applyTime('dusk');
  if (spot) {
    $('#intro').classList.add('hide'); document.body.classList.add('started');
    if (isTouch) document.body.classList.add('touch');
    if (q.get('fx') === '1') { celebrate(6); setInterval(() => celebrate(4), 1200); }
    if (spot === 'orbit') enterOrbit(); else if (SPAWNS[spot]) { teleport(spot); mode = 'walk'; if (q.get('yaw')) player.yaw = +q.get('yaw'); }
  }
}
updateQuest();
buildFloorRail();
// ---------- 员工工牌 ----------
let badge = loadBadge();
let pick = badge ? { ...badge } : { name: '', dept: 'up', case: 'white', lanyard: 'pinkblue', avatar: 'a1', title: '新人', no: badgeNo(), date: today() };
const biliAvatar = new Image(); biliAvatar.crossOrigin = 'anonymous'; biliAvatar.referrerPolicy = 'no-referrer';
let pickThenStart = false;
const RAND_NAMES = ['小电视', '干杯酱', '三连君', '弹幕侠', '二二', '三三', '哔哩新人', 'UP 预备役', '摸鱼大师', '番剧鉴赏家'];
function renderPick() {
  const c = drawBadge({ ...pick, name: pick.name || '新同学', _img: biliAvatar }, 720);
  const cv = $('#badgeCanvas'); cv.getContext('2d').clearRect(0, 0, cv.width, cv.height); cv.getContext('2d').drawImage(c, 0, 0);
  const bk = drawBadgeBack(pick, 720), bv = $('#badgeBack'); bv.getContext('2d').clearRect(0, 0, bv.width, bv.height); bv.getContext('2d').drawImage(bk, 0, 0);
  document.querySelectorAll('#bpAvatars button').forEach(b => b.classList.toggle('on', b.dataset.k === pick.avatar));
  document.querySelectorAll('#bpTitles button').forEach(b => b.classList.toggle('on', b.dataset.k === pick.title));
  const ly = LANYARDS.find(l => l.key === pick.lanyard);
  document.querySelector('.bp-lanyard').style.setProperty('--la', ly.a); document.querySelector('.bp-lanyard').style.setProperty('--lb', ly.b);
  document.querySelectorAll('#bpDepts button').forEach(b => b.classList.toggle('on', b.dataset.k === pick.dept));
  document.querySelectorAll('#bpCases button').forEach(b => b.classList.toggle('on', b.dataset.k === pick.case));
  document.querySelectorAll('#bpLanyards button').forEach(b => b.classList.toggle('on', b.dataset.k === pick.lanyard));
}
// 头像选择（第一个为 B站头像，仅登录后可用）
{
  const list = [{ key: 'bili', name: 'B站头像' }, ...AVATARS];
  $('#bpAvatars').innerHTML = list.map(a => `<button data-k="${a.key}" title="${a.name}"><canvas width="96" height="96"></canvas><span>${a.name}</span></button>`).join('');
  document.querySelectorAll('#bpAvatars button').forEach(b => {
    const cv = b.querySelector('canvas'), g = cv.getContext('2d');
    if (b.dataset.k === 'bili') { g.fillStyle = '#2a2d3a'; g.beginPath(); g.arc(48, 48, 46, 0, 7); g.fill(); g.fillStyle = '#fff'; g.font = '900 30px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('B', 48, 50); }
    else drawAvatar(g, b.dataset.k, 48, 48, 92);
    b.onclick = async () => {
      if (b.dataset.k === 'bili') {
        const u = BiliToy.user || await BiliToy.login();
        if (!u || !u.avatar) { toast('在 B站 App / bilibili.com 内打开并登录后，可使用你的 B站头像', 'ℹ️', '#8a8f99'); return; }
        biliAvatar.onload = () => { g.clearRect(0, 0, 96, 96); drawAvatar(g, 'bili', 48, 48, 92, biliAvatar); renderPick(); };
        biliAvatar.src = u.avatar.replace(/^http:/, 'https:');
        if (!pick.name) { pick.name = u.nickname.slice(0, 8); $('#badgeName').value = pick.name; }
      }
      pick.avatar = b.dataset.k; Sound.click(); renderPick();
    };
  });
  $('#bpTitles').innerHTML = TITLES.map(t => `<button data-k="${t}">${t}</button>`).join('');
  document.querySelectorAll('#bpTitles button').forEach(b => b.onclick = () => { pick.title = b.dataset.k; Sound.click(); renderPick(); });
  $('#bpTurn').onclick = () => { const f = $('#bpFlip'); f.classList.toggle('turned'); $('#bpTurn').textContent = f.classList.contains('turned') ? '🔄 翻回正面' : '🔄 翻到背面'; Sound.tone(700, 0.08, { type: 'triangle', vol: 0.05, slide: 1100 }); };
  $('#bpFlip').onclick = () => $('#bpTurn').click();
  $('#bpSave').onclick = async () => {
    // 正反面拼成一张图导出
    const f = drawBadge({ ...pick, name: pick.name || '新同学', _img: biliAvatar }, 540), k = drawBadgeBack(pick, 540);
    const out = document.createElement('canvas'); out.width = 1200; out.height = 960; const g = out.getContext('2d');
    const bg = g.createLinearGradient(0, 0, 1200, 960); bg.addColorStop(0, '#2a1838'); bg.addColorStop(1, '#0e2a40'); g.fillStyle = bg; g.fillRect(0, 0, 1200, 960);
    g.drawImage(f, 50, 60); g.drawImage(k, 610, 60);
    g.fillStyle = 'rgba(255,255,255,0.7)'; g.font = '700 22px sans-serif'; g.textAlign = 'center'; g.fillText('bilibili 3D 总部大厦 · 我的工牌', 600, 935);
    const url = out.toDataURL('image/png');
    const r = await BiliToy.saveImage(url);
    if (r === 'album') toast('工牌已保存到相册 ✓', '🪪', '#2ec27e'); else { const a = document.createElement('a'); a.href = url; a.download = `bilibili-badge-${pick.name || 'me'}.png`; a.click(); toast('工牌图片已下载 ✓', '🪪', '#2ec27e'); }
  };
}
$('#bpDepts').innerHTML = DEPTS.map(d => `<button data-k="${d.key}" style="--c:${d.color}"><span>${d.icon}</span>${d.name.replace(/部|中心|区$/, '')}</button>`).join('');
$('#bpCases').innerHTML = CASES.map(c => `<button data-k="${c.key}" style="--sw:${c.bg}"><i></i>${c.name}</button>`).join('');
$('#bpLanyards').innerHTML = LANYARDS.map(l => `<button data-k="${l.key}" style="--sw:repeating-linear-gradient(45deg,${l.a} 0 6px,${l.b} 6px 12px)"><i></i>${l.name}</button>`).join('');
document.querySelectorAll('#bpDepts button').forEach(b => b.onclick = () => { pick.dept = b.dataset.k; Sound.click(); renderPick(); });
document.querySelectorAll('#bpCases button').forEach(b => b.onclick = () => { pick.case = b.dataset.k; Sound.click(); renderPick(); });
document.querySelectorAll('#bpLanyards button').forEach(b => b.onclick = () => { pick.lanyard = b.dataset.k; Sound.click(); renderPick(); });
$('#badgeName').addEventListener('input', (e) => { pick.name = e.target.value.trim().slice(0, 8); renderPick(); });
$('#badgeName').addEventListener('keydown', (e) => e.stopPropagation());
$('#badgeRand').onclick = () => { pick.name = RAND_NAMES[Math.floor(Math.random() * RAND_NAMES.length)]; $('#badgeName').value = pick.name; Sound.click(); renderPick(); };
function openBadgePick(thenStart = false) {
  pickThenStart = thenStart;
  pick = badge ? { ...badge } : pick;
  $('#badgeName').value = pick.name || ''; renderPick();
  $('#badgePick').classList.add('show');
  if (!thenStart && mode !== 'intro') { document.exitPointerLock?.(); if (mode === 'walk') mode = 'modal'; }
  setTimeout(() => !isTouch && $('#badgeName').focus(), 200);
}
async function confirmBadge() {
  if (!pick.name) pick.name = RAND_NAMES[Math.floor(Math.random() * RAND_NAMES.length)];
  const chk = await BiliToy.checkText(pick.name, 'badge_name');
  if (!chk.passed && chk.status === 'rejected') { toast('这个名字不太合适，换一个吧～', '🙅', '#ff6b6b'); return; }
  pick.avatar ||= 'a1'; pick.title ||= '新人'; pick.date ||= today();
  badge = { ...pick }; saveBadge(badge); BiliToy.save({ badge: JSON.stringify(badge) });
  $('#badgePick').classList.remove('show');
  renderMyBadge(); updateChestBadge(); renderMenuBadge();
  Sound.ding();
  if (pickThenStart) { startWalk(); setTimeout(() => toast(`欢迎入职，${badge.name}！工牌已挂好，刷卡就能进闸机`, '🪪', DEPTS.find(d => d.key === badge.dept).color), 900); }
  else { toast('工牌已更新 ✓', '🪪', '#2ec27e'); if (mode !== 'intro') resume(); }
}
$('#badgeGo').onclick = confirmBadge;
function renderMyBadge() {
  if (!badge) { $('#myBadge').style.display = 'none'; return; }
  $('#myBadge').style.display = '';
  const cv = $('#myBadge canvas'), c = drawBadge({ ...badge, _img: biliAvatar }, 120);
  cv.getContext('2d').clearRect(0, 0, cv.width, cv.height); cv.getContext('2d').drawImage(c, 0, 0);
  const ly = LANYARDS.find(l => l.key === badge.lanyard); $('#myBadge').style.setProperty('--la', ly.a); $('#myBadge').style.setProperty('--lb', ly.b);
}
// ---------- 第一人称：低头能看到挂在胸前的工牌 ----------
const chestBadge = (() => {
  const g = new THREE.Group();
  const tex = new THREE.CanvasTexture(drawBadge({ name: '', dept: 'up', case: 'white' }, 240)); tex.colorSpace = THREE.SRGBColorSpace;
  const card = new THREE.Mesh(new THREE.PlaneGeometry(0.085, 0.132), new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false, depthTest: false }));
  card.renderOrder = 20; g.add(card);
  const strapM = new THREE.MeshBasicMaterial({ color: 0xFB7299, depthTest: false });
  const straps = [-1, 1].map(sx => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.12, 0.001), strapM); m.position.set(sx * 0.026, 0.11, 0.001); m.rotation.z = sx * 0.3; m.renderOrder = 19; g.add(m); return m; });
  g.position.set(0.0, -0.17, -0.32); g.rotation.x = -0.15; g.visible = false;
  camera.add(g);
  return { g, card, tex, strapM };
})();
function updateChestBadge() {
  if (!badge) return;
  const c = drawBadge({ ...badge, _img: biliAvatar }, 240);
  chestBadge.tex.image = c; chestBadge.tex.needsUpdate = true;
  chestBadge.strapM.color.set(LANYARDS.find(l => l.key === badge.lanyard).a);
}
ctx.animators.push((dt, t) => {
  const show = badge && mode === 'walk' && !flight.on && !seated && player.pitch < -0.5;
  const k = THREE.MathUtils.clamp((-player.pitch - 0.5) / 0.35, 0, 1);
  chestBadge.g.visible = !!show;
  if (show) { chestBadge.card.material.opacity = k; chestBadge.g.position.y = -0.2 + k * 0.03; chestBadge.g.rotation.z = 0; /* 不再持续摆动（防抖） */ }
});
renderMyBadge(); updateChestBadge();
// 图标图集加载后重画工牌（部门图标）
iconsReady.then(() => { renderMyBadge(); updateChestBadge(); renderMenuBadge?.(); if ($('#badgePick').classList.contains('show')) renderPick(); });
$('#myBadge').addEventListener('click', (e) => { e.stopPropagation(); openBadgePick(false); });
ctx.getBadge = () => badge;
function renderMenuBadge() {
  const box = $('#menuBadge'); if (!box) return;
  if (!badge) { box.classList.remove('has'); return; }
  box.classList.add('has');
  const cv = box.querySelector('canvas'), c = drawBadge({ ...badge, _img: biliAvatar }, 180);
  cv.getContext('2d').clearRect(0, 0, cv.width, cv.height); cv.getContext('2d').drawImage(c, 0, 0);
  box.querySelector('.mb-name').textContent = `欢迎回来，${badge.name}`;
  box.querySelector('.mb-dept').textContent = `${DEPTS.find(d => d.key === badge.dept).name} · ${badge.title || '新人'}`;
  box.style.setProperty('--la', LANYARDS.find(l => l.key === badge.lanyard).a);
}
function renderMenuStats() {
  const el = $('#menuStats'); if (!el) return;
  const found = landmarks.filter(l => l.found).length;
  const L = GP.levelInfo();
  el.innerHTML = `<span>⭐ <b>LV${L.lv}</b> ${L.title}</span><span>🪙 <b>${coins}</b> 硬币</span><span>🎒 <b>${bag.size}</b> 收藏</span><span>🗺️ <b>${found}/${landmarks.length}</b> 地标</span>`;
}
renderMenuBadge(); renderMenuStats();
$('#menuBadge')?.addEventListener('click', (e) => { e.stopPropagation(); Sound.init(); Sound.click(); openBadgePick(false); });
// 主菜单键盘：Enter 开始
addEventListener('keydown', (e) => { if (mode === 'intro' && e.code === 'Enter' && !$('#badgePick').classList.contains('show')) $('#startBtn').click(); });
ctx.onGateSwipe = () => {
  Sound.tone(1760, 0.08, { type: 'square', vol: 0.05 }); Sound.tone(2350, 0.12, { type: 'square', vol: 0.05, delay: 0.09 });
  const b = badge || { name: '访客', dept: 'intern', case: 'white', lanyard: 'pinkblue', no: 'VISITOR' };
  const el = $('#swipeCard'); const cv = el.querySelector('canvas'), c = drawBadge(b, 180);
  cv.getContext('2d').clearRect(0, 0, cv.width, cv.height); cv.getContext('2d').drawImage(c, 0, 0);
  el.querySelector('b').textContent = badge ? `${b.name}，早上好！` : '访客通行';
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
};
// ---------- B站 Toy SDK ----------
BiliToy.init().then(async (ok) => {
  document.body.classList.toggle('toy-sdk', ok);
  if (!ok) return;
  const cloud = await BiliToy.load();
  if (cloud) {
    if (cloud.coins != null && cloud.coins > coins) setCoins(cloud.coins);
    if (Array.isArray(cloud.bag)) { cloud.bag.forEach(n => bag.add(n)); $('#bagCount').textContent = bag.size; }
    if (Array.isArray(cloud.landmarks)) { for (const l of landmarks) if (cloud.landmarks.includes(l.name)) l.found = true; foundCount = landmarks.filter(l => l.found).length; $('#exploreCount').textContent = `${foundCount}/${landmarks.length}`; }
    if (cloud.best) $('#rkBest').textContent = fmtSec(cloud.best);
  }
  refreshRank();
  // 手机 App 内：开始漫游时请求横屏沉浸
  if (isTouch) $('#startBtn').addEventListener('click', () => BiliToy.immersive(true), { once: true });
  BiliToy.watchContainer((st) => { if (st && st.changedFields && st.changedFields.includes('viewport')) dispatchEvent(new Event('resize')); });
});
function fmtSec(sec) { sec = Math.abs(+sec); return sec >= 60 ? `${Math.floor(sec / 60)}分${sec % 60}秒` : `${sec}秒`; }
async function refreshRank(force = false) {
  const board = +($('#rankPanel').dataset.board || 1);
  const { list, mine } = await BiliToy.rank(board, $('#rankPanel').dataset.period || 'week');
  const box = $('#rkList');
  if (!list) { box.innerHTML = '<div class="rk-empty">在 B站 App / bilibili.com 中打开即可查看排行榜</div>'; return; }
  if (!list.length) { box.innerHTML = '<div class="rk-empty">还没有人上榜，快来成为第一名！</div>'; }
  else box.innerHTML = list.slice(0, 10).map(r => `<div class="rk-row ${r.rank <= 3 ? 'top' + r.rank : ''}"><span class="rk-n">${r.rank}</span><img src="${(r.avatar || '').replace(/^http:/, 'https:')}" referrerpolicy="no-referrer" onerror="this.style.visibility='hidden'"/><span class="rk-name">${String(r.nickname || '').replace(/[<>&]/g, '')}</span><b>${board === 1 ? fmtSec(r.score) : r.score}</b></div>`).join('');
  $('#rkMine').textContent = mine && mine.ranked ? `我的排名：第 ${mine.rank} 名 · ${board === 1 ? fmtSec(mine.score) : mine.score + ' 分'}` : '我还未上榜';
}
$('#rankBtn').addEventListener('click', (e) => { e.stopPropagation(); refreshRank(); openModal('#rankPanel'); });
document.querySelectorAll('#rankPanel [data-board]').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('#rankPanel [data-board]').forEach(x => x.classList.toggle('on', x === b));
  $('#rankPanel').dataset.board = b.dataset.board; refreshRank();
}));
document.querySelectorAll('#rankPanel [data-period]').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('#rankPanel [data-period]').forEach(x => x.classList.toggle('on', x === b));
  $('#rankPanel').dataset.period = b.dataset.period; refreshRank();
}));
$('#loginBtn').addEventListener('click', async (e) => {
  e.stopPropagation();
  const u = await BiliToy.login();
  if (u) {
    $('#loginBtn').innerHTML = `<img src="${u.avatar.replace(/^http:/, 'https:')}" referrerpolicy="no-referrer"/><span>${u.nickname.replace(/[<>&]/g, '')}</span>`;
    $('#loginBtn').classList.add('in');
    toast(`欢迎回来，${u.nickname.replace(/[<>&]/g, '')}！进度已与 B站账号同步`, '👋', PINK);
  } else toast('请在 B站 App 或 bilibili.com 中打开以登录', 'ℹ️', '#8a8f99');
});
$('#photoSave').addEventListener('click', async () => {
  if (!lastPhoto) return;
  const r = await BiliToy.saveImage(lastPhoto);
  if (r === 'album') toast('已保存到系统相册 ✓', '📸', '#2ec27e');
  else { const a = document.createElement('a'); a.href = lastPhoto; a.download = 'bilibili-tower.png'; a.click(); toast('照片已下载 ✓', '📸', '#2ec27e'); }
});
$('#photoShare').addEventListener('click', async () => {
  if (await BiliToy.share('index.html?spot=plaza')) return;
  const qr = await BiliToy.qrCode('index.html?spot=plaza');
  if (qr) { $('#qrImg').src = qr; $('#qrBox').classList.add('show'); }
  else toast('分享需要在 B站 App 内使用', 'ℹ️', '#8a8f99');
});
window.__bili = { ctx, player, teleport, enterOrbit, toggleNight, camera, celebrate, fireworks, onCollect, collides, API, dropBike, renderer, tickDoors: updateElevatorDoors, tickProps: propsTick, look: (p) => { player.pitch = p; lookTarget.pitch = p; lookTarget.yaw = player.yaw; }, renderOnce: () => { for (const f of ctx.animators) f(0.016, 1); composer.render(); } };
