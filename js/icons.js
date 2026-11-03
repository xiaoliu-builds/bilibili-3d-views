// 图标系统：全部使用 gpt-image2 生成的 3D 图标图集（ui/icons.webp，16 列 × 7 行，每格 128px）
// - ic(name)：返回图标 HTML
// - 页面上任何出现的 emoji 都会被 MutationObserver 自动替换成图集图标（toast / 提示 / 楼层导航…无需逐处改）
// - drawIcon(g, key, x, y, size)：在 canvas 上绘制（工牌 / 小地图）
export const ICON_NAMES = ["satellite", "book_open", "meditate", "smile", "coaster", "walk", "elevator", "wings", "nightcity", "hand", "target", "pin", "moon", "sun", "sunset", "user", "chat", "camera", "badge", "map", "teddy", "bike", "chair", "piano", "mic_studio", "cocktail", "coin", "trophy", "hands", "metro", "cards", "shopbag", "coffee", "books", "dumbbell", "sparkles", "ferris", "clapper", "refresh", "fireworks", "speaker", "arcade", "gift", "soda", "bento", "bell", "palette", "backpack", "bolt", "nope", "sofa", "cake", "guitar", "cat", "dove", "drum", "sleep", "tea", "circus", "city", "run", "memo", "film", "mic", "pen", "laptop", "gamepad", "headphones", "robot", "download", "dice", "party", "medal", "book_red", "bubbletea", "handbag", "notes", "star", "dizzy", "tree", "tv", "scroll", "people", "flag", "mute", "gear", "grad", "wave", "search", "megaphone", "pencil", "popcorn", "massage", "sprout", "museum", "frame", "menu", "home", "play", "heart", "thumb", "clap", "info", "check", "cross", "gem", "key", "lock", "bus", "rocket", "balloon", "crown"];
const IDX = Object.fromEntries(ICON_NAMES.map((n, i) => [n, i]));
const COLS = 16, ROWS = 7;
export const EMOJI = {"💬": "chat", "📸": "camera", "📷": "camera", "🪪": "badge", "🗺": "map", "🧸": "teddy", "☰": "menu", "🚲": "bike", "🪑": "chair", "🎹": "piano", "🎙": "mic_studio", "🍸": "cocktail", "🍹": "cocktail", "🛰": "satellite", "📖": "book_open", "🪽": "wings", "📍": "pin", "🌙": "moon", "🪙": "coin", "🏆": "trophy", "🤲": "hands", "🚇": "metro", "🎴": "cards", "🛍": "shopbag", "☕": "coffee", "📚": "books", "📘": "books", "🏋": "dumbbell", "✨": "sparkles", "🎡": "ferris", "🎬": "clapper", "🔄": "refresh", "🧘": "meditate", "🙂": "smile", "🎢": "coaster", "🎯": "target", "🎆": "fireworks", "🔊": "speaker", "🔇": "mute", "🕹": "arcade", "🎁": "gift", "🥤": "soda", "🍱": "bento", "🛎": "bell", "🌃": "nightcity", "🌆": "city", "🏙": "city", "🎨": "palette", "✋": "hand", "🎒": "backpack", "⌂": "home", "⚡": "bolt", "🙅": "nope", "🛋": "sofa", "🍰": "cake", "🎸": "guitar", "🐱": "cat", "🕊": "dove", "🥁": "drum", "😴": "sleep", "🍵": "tea", "🎪": "circus", "🏃": "run", "☀": "sun", "🌇": "sunset", "📝": "memo", "🎞": "film", "🎤": "mic", "🖊": "pen", "💻": "laptop", "🎮": "gamepad", "🎧": "headphones", "🤖": "robot", "⬇": "download", "🎲": "dice", "🚶": "walk", "🛗": "elevator", "👤": "user", "★": "star", "🌟": "star", "🎉": "party", "🎖": "medal", "📕": "book_red", "🧋": "bubbletea", "👜": "handbag", "🎵": "notes", "🎶": "notes", "👍": "thumb", "😵": "dizzy", "🌳": "tree", "📺": "tv", "📜": "scroll", "👥": "people", "🚩": "flag", "⚙": "gear", "🎓": "grad", "👋": "wave", "🔍": "search", "📣": "megaphone", "✏": "pencil", "🍿": "popcorn", "👏": "clap", "💆": "massage", "🌱": "sprout", "🏛": "museum", "🖼": "frame", "ℹ": "info", "🎊": "party", "❤": "heart", "💎": "gem", "🔑": "key", "🔒": "lock", "🚌": "bus", "🚀": "rocket", "🎈": "balloon", "👑": "crown"};
const keyOf = (k) => (k && IDX[k] !== undefined ? k : EMOJI[String(k || '').replace(/\uFE0F/g, '')] || null);
export function ic(k, cls = '') {
  const n = keyOf(k); if (!n) return '';
  const i = IDX[n], x = i % COLS, y = Math.floor(i / COLS);
  return `<i class="ic ${cls}" data-ic="${n}" style="background-position:${(x / (COLS - 1) * 100).toFixed(3)}% ${(y / (ROWS - 1) * 100).toFixed(3)}%"></i>`;
}
// 所有 emoji（含未收录的）——未收录的直接去掉，保证界面上不再出现系统 emoji
const EMOJI_RE = /(?:[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{2300}-\u{23FF}\u2139\u2605\u2302\u2630])\uFE0F?/gu;
const KEEP = new Set(['✓', '✕', '✦', '✧', '♡', '♪', '♫', '♬', '⏎', '⌘', '⤒', '⤓', '✔']);
export const hasEmoji = (s) => { EMOJI_RE.lastIndex = 0; let m; while ((m = EMOJI_RE.exec(s))) if (!KEEP.has(m[0].replace(/\uFE0F/g, ''))) return true; return false; };
export function iconize(s) { return String(s).replace(EMOJI_RE, (m) => { const b = m.replace(/\uFE0F/g, ''); return KEEP.has(b) ? m : ic(b); }); }
export function stripEmoji(s) { return String(s).replace(EMOJI_RE, (m) => (KEEP.has(m.replace(/\uFE0F/g, '')) ? m : '')).replace(/\s{2,}/g, ' ').trim(); }

// ---------- DOM 自动替换 ----------
function convertText(node) {
  const t = node.nodeValue; if (!t || !hasEmoji(t)) return;
  const p = node.parentNode; if (!p || /^(SCRIPT|STYLE|TEXTAREA|TITLE|OPTION)$/.test(p.nodeName)) return;
  const span = document.createElement('span'); span.innerHTML = iconize(t.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])));
  const frag = document.createDocumentFragment(); while (span.firstChild) frag.appendChild(span.firstChild);
  p.replaceChild(frag, node);
}
function walk(root) {
  if (root.nodeType === 3) return convertText(root);
  if (root.nodeType !== 1) return;
  const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); const list = [];
  while (tw.nextNode()) if (hasEmoji(tw.currentNode.nodeValue)) list.push(tw.currentNode);
  list.forEach(convertText);
}
export function startIconObserver() {
  walk(document.body);
  new MutationObserver((recs) => {
    for (const r of recs) {
      if (r.type === 'characterData') convertText(r.target);
      else for (const n of r.addedNodes) walk(n);
    }
  }).observe(document.body, { childList: true, subtree: true, characterData: true });
}

// ---------- canvas 绘制 ----------
const atlas = new Image();
export const iconsReady = new Promise((res) => { atlas.onload = () => res(true); atlas.onerror = () => res(false); });
atlas.src = './ui/icons.webp';
export function drawIcon(g, k, cx, cy, size) {
  const n = keyOf(k); if (!n || !atlas.complete || !atlas.naturalWidth) return false;
  const i = IDX[n], S = atlas.naturalWidth / COLS;
  g.drawImage(atlas, (i % COLS) * S, Math.floor(i / COLS) * S, S, S, cx - size / 2, cy - size / 2, size, size);
  return true;
}
