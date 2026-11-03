// 楼层元数据：电梯面板 / 楼层指示条 / 导览牌 / 到站横幅共用
export const FLOOR_META = [
  { key: 'lobby', num: '1F', n: 1, y: 0.2, name: '1F 大堂', short: '大堂', desc: '弹幕巨幕 · 前台 · 品牌绿植墙', icon: '🏛️', color: '#FB7299' },
  { key: 'showroom', num: '3F', n: 3, y: 12, name: '3F 品牌展厅', short: '品牌展厅', desc: '十五周年时间轴 · 手办展柜 · 留言墙', icon: '🖼️', color: '#FF8A5C' },
  { key: 'canteen', num: '5F', n: 5, y: 18, name: '5F 员工餐厅', short: '员工餐厅', desc: '干杯食堂 · 自选窗口 · 甜品站', icon: '🍱', color: '#FFB027' },
  { key: 'forum', num: '7F', n: 7, y: 26, name: '7F 路演会议中心', short: '路演会议中心', desc: '阶梯路演厅 · 发布会舞台 · 同传间', icon: '🎤', color: '#3D8BFF' },
  { key: 'studio', num: '9F', n: 9, y: 34, name: '9F 直播演播厅', short: '直播演播厅', desc: '直播间 · 虚拟主播 · 录音棚', icon: '🎙️', color: '#FF3B5C' },
  { key: 'game', num: '12F', n: 12, y: 46, name: '12F 游戏中心', short: '游戏中心', desc: '街机长廊 · 电竞舞台 · 娃娃机', icon: '🎮', color: '#7A5CFF' },
  { key: 'music', num: '14F', n: 14, y: 54, name: '14F 音乐录音棚', short: '音乐录音棚', desc: '架子鼓 · 调音台 · 隔音录音间', icon: '🎧', color: '#FF5DA2' },
  { key: 'office', num: '16F', n: 16, y: 62, name: '16F 创作者办公区', short: '创作者办公区', desc: '工位 · 会议室 · 休闲区', icon: '💻', color: '#00AEEC' },
  { key: 'anime', num: '19F', n: 19, y: 74, name: '19F 动画工作室', short: '动画工作室', desc: '原画桌 · 分镜墙 · 渲染农场', icon: '🎨', color: '#2EC27E' },
  { key: 'gym', num: '22F', n: 22, y: 86, name: '22F 健身房', short: '健身房', desc: '跑步机 · 力量区 · 瑜伽室', icon: '🏋️', color: '#FF8A3D' },
  { key: 'theater', num: '24F', n: 24, y: 96, name: '24F 弹幕放映厅', short: '弹幕放映厅', desc: '阶梯座位 · 弹幕巨幕 · 小舞台', icon: '🎬', color: '#E85D75' },
  { key: 'lounge', num: '26F', n: 26, y: 101, name: '26F 休息舱 & 茶水间', short: '休息舱 & 茶水间', desc: '胶囊睡眠舱 · 按摩椅 · 茶饮吧', icon: '🛋️', color: '#4FC3A1' },
  { key: 'library', num: '27F', n: 27, y: 106, name: '27F 空中图书馆', short: '空中图书馆', desc: '书墙 · 阅读阶梯 · 城市景观', icon: '📚', color: '#C08A4E' },
  { key: 'skybar', num: '29F', n: 29, y: 116, name: '29F 空中酒吧', short: '空中酒吧', desc: '吧台特调 · 夜景卡座 · 爵士钢琴', icon: '🍸', color: '#9B6BFF' },
  { key: 'roof', num: 'RF', n: 31, y: 130, name: 'RF 天台观景台', short: '天台观景台', desc: '巨型小电视 · 城市全景', icon: '🌃', color: '#00AEEC' },
];
export const META_BY_KEY = Object.fromEntries(FLOOR_META.map(f => [f.key, f]));
