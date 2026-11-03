// B站 Toy JS SDK 接入层：所有能力先 isSupport 再调用，任何失败都静默降级（普通浏览器里照常可玩）
// 文档能力：getUserProfile / 云存储 / 排行榜 / checkInputSafety / saveImageToAlbum / share / getQrCode / 容器控制 / navigate
const T = () => (typeof window !== 'undefined' ? window.toy : null);
const supportCache = new Map();
const isToyHost = () => (/(^|\.)bilibili\.com$/i.test(location.hostname) && /\/toy\//.test(location.pathname)) || /[?&]toy=1\b/.test(location.search);

export async function has(ability) {
  const t = T(); if (!t || typeof t.isSupport !== 'function') return false;
  if (!BiliToy.inToy) return false;   // 只在 B站 Toy 页面（bilibili.com/toy/…）内启用，其他域名直接降级，避免请求超时
  if (supportCache.has(ability)) return supportCache.get(ability);
  let ok = false;
  try { ok = !!(await t.isSupport(ability)); } catch (_) { ok = false; }
  supportCache.set(ability, ok);
  return ok;
}
async function call(ability, fn, fallback = null, timeout = 6000) {
  if (!(await has(ability))) return fallback;
  try {
    return await Promise.race([fn(T()), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), timeout))]);
  } catch (e) { console.info('[ToySDK]', ability, e && (e.type || e.message)); return fallback; }
}

export const BiliToy = {
  ready: false,
  inToy: false,
  user: null,          // { avatar, nickname }
  async init() {
    // SDK 脚本为 async 加载：最多等待 4 秒
    for (let i = 0; i < 40 && !T(); i++) await new Promise(r => setTimeout(r, 100));
    this.inToy = !!T() && isToyHost();
    this.ready = !!T() && typeof T().isSupport === 'function' && this.inToy;
    return this.ready;
  },

  // —— 用户资料（需用户手势触发首次授权）——
  async login() {
    const u = await call('getUserProfile', (t) => t.getUserProfile());
    if (u && u.nickname) this.user = { avatar: u.avatar, nickname: u.nickname };  // toyOpenId 不落盘、不打日志
    return this.user;
  },

  // —— 云存储：硬币 / 背包 / 徽章 / 发现地标 ——
  async load() {
    const r = await call('getCloudStorage', (t) => t.getCloudStorage(['coins', 'bag', 'badges', 'landmarks', 'best']));
    if (!r) return null;
    const j = (s, d) => { try { return s ? JSON.parse(s) : d; } catch (_) { return d; } };
    return { coins: r.coins != null ? +r.coins : null, bag: j(r.bag, null), badges: j(r.badges, null), landmarks: j(r.landmarks, null), best: r.best != null ? +r.best : null };
  },
  _saveT: 0, _pending: null,
  save(items) {
    // 节流：3 秒内合并多次写入
    this._pending = Object.assign(this._pending || {}, items);
    clearTimeout(this._saveT);
    this._saveT = setTimeout(async () => {
      const data = {}; for (const [k, v] of Object.entries(this._pending)) data[k] = typeof v === 'string' ? v : JSON.stringify(v);
      this._pending = null;
      await call('setCloudStorage', (t) => t.setCloudStorage(data));
    }, 3000);
  },

  // —— 排行榜：board 1 = 一键三连挑战（用时越短越好 → 分数取负秒数）；board 2 = 城市探索 + 收藏品 ——
  async submitQuestTime(sec) { return call('submitScore', (t) => t.submitScore({ board: 1, score: -Math.round(sec) })); },
  async submitCollector(n) { return call('submitScore', (t) => t.submitScore({ board: 2, score: Math.round(n) })); },
  async rank(board = 1, period = 'week') {
    const list = await call('getRankList', (t) => t.getRankList({ board, period, limit: 20 }), null);
    const mine = await call('getMyRank', (t) => t.getMyRank({ board, period }), null);
    return { list, mine };
  },

  // —— 文本安全：弹幕 / 便签。unavailable 时不当作通过（但本地展示仍允许，仅不上墙给别人）——
  async checkText(text, scene) {
    const r = await call('checkInputSafety', (t) => t.checkInputSafety({ text, scene }), null, 2500);
    if (!r) return { passed: true, status: 'local' };   // 非 Toy 环境：仅本地可见
    return r;
  },

  // —— 照片 ——
  async saveImage(dataUrl) {
    if (await has('saveImageToAlbum')) {
      try { await T().saveImageToAlbum({ base64Data: dataUrl, hintMsg: '保存你在 bilibili 大楼拍的照片' }); return 'album'; } catch (e) { if (e && e.type === 'invalid_param') return 'too-big'; }
    }
    return 'download';
  },
  async share(path = 'index.html') { return call('share', (t) => t.share({ path })); },
  async qrCode(path = '') { const r = await call('getQrCode', (t) => t.getQrCode({ path, size: 320 })); return r && r.base64; },

  // —— 容器：手机端横屏沉浸 ——
  async immersive(landscape = true) { return call('setContainerMode', (t) => t.setContainerMode(landscape ? { orientation: 'landscape', immersive: true } : { orientation: 'auto', immersive: false })); },
  async watchContainer(cb) {
    if (!(await has('onContainerChange'))) return () => {};
    try { return T().onContainerChange(cb); } catch (_) { return () => {}; }
  },

  // —— 跳转：B站官方空间 / 视频（需手势）——
  async open(type, id) { return call('navigate', (t) => t.navigate({ type, id, extra: { from: 'bili-tower-3d' } })); },
};
