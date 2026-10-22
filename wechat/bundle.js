// 水滴合成深海 - 微信小游戏 bundle（自动生成，勿手改）
// 由 tools/build_wechat.js 从 js/ 八模块拼接而来；模块间共享作用域，加载顺序与 index.html 一致。
// 头部 var 注入：部分小游戏运行环境的 document/window 是只读全局，垫片赋值会被静默忽略
// （真机实测报 document.getElementById is not a function），故在模块作用域内用 var 显式
// 遮蔽环境全局，取垫片挂到 GameGlobal.__shim 的对象。
var window = GameGlobal.__shim.window;
var document = GameGlobal.__shim.document;
var localStorage = GameGlobal.__shim.localStorage;
var navigator = GameGlobal.__shim.navigator;
var performance = GameGlobal.__shim.performance;
// ===== js/platform.js =====
// 水滴合成深海 - 平台适配层
// 当前为 Web 实现；移植微信小游戏时只需替换本文件内标注 [wx] 的方法体，
// main.js / config.js 不需要任何改动。
window.MG = window.MG || {};

MG.platform = {
  // 是否运行在微信小游戏环境（调试用）
  isWx: (typeof wx !== 'undefined') && !!wx.getSystemInfoSync,

  // ---------- 存储 ----------
  // [wx] 替换为 wx.getStorageSync / wx.setStorageSync（同步接口，签名一致）
  get: function (k) {
    try { return localStorage.getItem(k); } catch (e) { return null; }
  },
  set: function (k, v) {
    try { localStorage.setItem(k, String(v)); } catch (e) {}
  },
  // JSON 便捷读写（存档结构用）
  getJSON: function (k, fallback) {
    try {
      var v = this.get(k);
      return v == null ? fallback : JSON.parse(v);
    } catch (e) { return fallback; }
  },
  setJSON: function (k, v) { this.set(k, JSON.stringify(v)); },
  // 删除单键（清空存档用）：[wx] 替换为 wx.removeStorageSync（wx-shim 的 localStorage 已桥接）
  remove: function (k) {
    try { localStorage.removeItem(k); } catch (e) {}
  },
  // 重载进程（清空存档后重置游戏至初始状态用）：Web 直接刷新页面；
  // [wx] 小游戏无 location.reload，改走 wx.restartMiniProgram（重开小游戏=全新启动）
  reload: function () {
    try {
      if (this.isWx && typeof wx !== 'undefined' && wx.restartMiniProgram) { wx.restartMiniProgram(); return; }
    } catch (e) {}
    try { location.reload(); } catch (e2) {}
  },

  // ---------- 音频 ----------
  // [wx] WebAudio 在低端安卓可能不稳，替换为 wx.createInnerAudioContext 体系
  //      （届时 audio.ensure/blip 等改为播放预生成音频，见 main.js audio 段注释）
  audioCtxClass: function () {
    return window.AudioContext || window.webkitAudioContext || null;
  },

  // ---------- 分享 ----------
  // payload: { title, desc, score, stage }
  // 返回 true = 平台已接管分享；false = 调用方走自己的 UI（当前 Web 的战报卡片）
  // [wx] 替换为 wx.shareAppMessage({ title, imageUrl })
  share: function (payload) {
    return false;
  },

  // ---------- 榜单 ----------
  // [wx] 替换为 wx.setUserCloudStorage + 开放数据域子域渲染
  submitScore: function (score) { /* Web 版为本地榜，见 main.js 好友榜 */ },

  // ---------- 振动（★ 手机设备马达震动反馈，不是画面/窗口抖动） ----------
  // v198 用户纠正："震动不是震动窗口，是手机设备的震动反馈！！！"——本接口只触发
  // 硬件马达（navigator.vibrate；微信端由 wx-shim 桥到 wx.vibrateShort/vibrateLong）。
  // 画面摇晃（systems.js addShake → render translate 微抖）是另一套独立视觉特效，
  // 与设置里的"震动"开关无任何关联。iOS 微信/Safari 不支持振动 API，该开关静默无效。
  vibrate: function (ms) {
    if (navigator && navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) {} }
  }
};

;
// ===== js/titlefont.js =====
// 标题字体：荆南麦圆体（OFL 免费商用），已子集化仅含"水滴合成深海"6 字（约 4KB）
// 浏览器：FontFace + data URL 注册；微信：base64 解码写临时文件后 wx.loadFont
// 字体族名写到 MG.titleFontFamily，render.drawTitleArt 直接引用
(function () {
  var B64 = 'AAEAAAAQAQAABAAAR0RFRgARAAcAAA0sAAAAFkdQT1NEdkx1AAANRAAAACBHU1VCI34kjAAADWQAAAAwT1MvMoYKv08AAAqIAAAAYGNtYXBO7h5vAAAK6AAAAFxnYXNw//8AAwAADSQAAAAIZ2x5ZiW/84cAAAEMAAAI3GhlYWR7IA5xAAAKGAAAADZoaGVhYZJeSAAACmQAAAAkaG10eAamAMAAAApQAAAAEmxvY2EFbggaAAAKCAAAABBtYXhwACYCIwAACegAAAAgbmFtZSd1PjoAAAtEAAABvnBvc3T/kgBWAAANBAAAACB2aGVhYYAL8wAADagAAAAkdm10eAPkAAYAAA2UAAAAEgAEABr/3gNpAxoABQATADYAQgAAJTI/AQUHFyciNSc0NyUyFQcUBwYBIyInJjU0NzY3Njc2MzIXBBcWFRQjIicmJwYHBgcGByInBjczNj8BNjcmJyYnBgFPmKkI/kwDSXU1BTMCIzIIRtb+agIXBhAJGUOKSyosJRkBN0EJNRUOHzMOHS+OdjZaD1upGTM1U05SCAZWcDk7FJoSm14BNeowARku6jQJFQGBCQ4TEA0WNn1wOxHlaRATLRIjNg8GDQkHAQlLmgEDBQYKCQZSR1sAAgAh/8sDYwMxABAAfAAAASIvASY1NDc2MzIXFhUUBwYDIyInBgcGIyImNTQ3NjcmLwEGIycUBxY3NjMyFxYVFAcGIycmNTQzFhc3BgcGBwYHBiMiNTQ3NhM0NxYzNyYnNDc2MzIXFhc2NzIVFAcGBxYXNjc2MzIWFRQHBgcWFzY3NDc2MzIXFhUUBwYDAw4NVQ0TCxAjSBIIEQ4CW0tMVQ8KGBQTUVgrHgE3IM0DZykcCSUJAyYOMBBtJiMfHjReAgIUGhQsLQQ8DFFpV2MJAhUNCywDAwpelDI3fGUbGTQkCxsOHAgdXCYiCgUVCgkbCgchEAKVCDwMDhESCTkVEgwJFf03q2AsAx0OFw8ud3e7CgEBSyQEBwQhChNGsTABJDAyAxebCQMnGa9VNyoMEoIBnEoDBgFGPyAMBChCRgYOLisIEAaoS1BYFhQXEBVceWUYDDsiDAMZDRxhNBwAAAIAJ//QA10DGgAcAEYAADciJyY1NDc2NwYjIicmJzQ3FjMyNzMyFRQHBgcGBSYnJic0MzIXEzQzMhcHFzY3NjMXFhUUBwYHHgEVFAcGBwYjIicmJwMUWBEPEQ16UShDGyAiBjQgH0xGAjM7UVwWATE5chcCKgqLAisvCQIsb0AUGAwiG1FXLsECCR8JCRoPSbQCSgoUFBITYPELAQIxLQIEFTMqoL5EEXsIHgwdMRYCuCgr4SxbVBQBDiUcHFVCM9InBgUbCAMeXcT+mU0ABQAf/80DZgMZABYALwBCALIAxQAAATcyNTQnLgE1NDcyHwEWFRQHNzQnBwYTMjc2NwYHHgEXFhcUByInLgE1NDcPARQXJyIvASY1NDc2MzIXFhcWFRQHBhcmNTQ3FjM3NjcGBwYjJic0NzY3NjMyFxYVFAczNjMlMhUUBwYjBzY3JTIXFhU3MhcUBgcGBzcyFxUGBwYHBgcGIyYnJjU0MzIXNjcOAQ8BIicmNSY1NDcHIicWHQEGBwYrASYnNDc2MzIXNzYzMhcTIi8BJjU0NzYzMhcWFxYVFAcGAbp6AwUsAyoRCiYPAkMD9QZbNGYHAThPBiEOBwEsEQcuARZgAQHpEhF+CgsNEgwOMlURDhEZBCkLFCYHBhYVDiIZAg47SQsXDA0PCwYWLgEjJyjVvhsJGQE7KQEHMR0CQRICAzcaBAIeJhcFBghRMlgaJgl2CAGJOSMSFxEuAgIaLgwDMCIPJwRZChsHBhIaTAgWCg0PExF+CgwNEQ0NMlYQDRIBcQUCAgdCCwUeAwo1GxEHCAU7Rg41/uMMQEMGBAEhGxELIAQKRAsFGQYFPSkZ2xBZDA0OEA0FCkQUFBETDkUICyQBAQFfPSwbFAIgEhZerBUFEBIJHQIYIigHHjsGARQoUVoFJCYHA0NABxcOHwkIAjsjNwETBx8rEBQlDgEBAQQIJyspKiQBBAkKCLBiHwc3LA8DE+0RBAEpEFkMDQ4RDAUKRBQTEhMOAAAHACP/1ANiAxgAEgAnADsATgBjAHYArAAAASI1NwUVFCMiNSc0NyUyFQcGDwEiJyYnJicmNTQzMhcWFxYXFhUUBiUiJyY1NDc2NzYzMhcWFRQHBgcGJyIvASY1NDc2MzIXFhcWFRQHBgMjJic0NzYzMhc3NjMyFxYdAQYHBhMiLwEmNTQ3NjMyFxYXFhUUBwYBIyI1EQcGBwYjIjU0PwEjIicmNTQ3FjM3NTY7ATIXBzY3MhcUBwYHFxYVFAcGIyInJicHERQDGSoB/ow0JwEuAdgtAgErBxASKU8nEAgmDhEpMkMdBhv+CxIMCQtzOQ8OGwwHCjdzFmYREnkKCw0SCwwxVBANEm8EVwobBgYRGUoIFQoNGS8hDh4REXoJCg4RCw0xUxAMEgFYCSkiZAYWGjAKWiQsDw8qCg63AiUGIAsBU5AgAiEoMmQHHQgHHw9YGSkCMC1bC0ssJ3cvAhMujC0BohAzSyARDA0oBRYwOy4QDBIeAgwRDg8NT1sLEAgMDxhcSgvaEFkMDg0RDQUKRBUTEhIP/XUGNy0PAhLtEQULHwexYR8BpRBZDA4NEQ0FCkUUExISD/5QLgEDAeQHIC4NFL0KDhgtAgIDSSwrSQUKJTAGBATOEAkfDAIZtUED/vsxAAAGACb/1gNfAxsABQANAG8AgACSAKMAACUyNycHFQM2NzY3BgcWASMmJyY1NDMyFxEHFTY3MzIVFAcGBxU3MhcHFAcGIyInJjUnNj8BNQYjIjU0NzI3NQcRFCsBJjURND8BJiciByYnJjU0NzI3FzI3NTQzMh0BNj8BFhcWBwYHBgc2NzIXAwYBIi8BJjU0NzYzMhcWFRQHBgMjJic0NzYzMhc3NjMyFQYHBhMiLwEmNTQ3NjMyFxYVFAcGAho0HgFtDkw1CAc4YwgBCwIrIA8gCSOWMTYCKCg1NEEhAwUnM0MfHiUCBB8vJjgmJTgniSUKIjBMBgkiGB0VHiwhEyY5OCMyZG0LIQYEIjI9AwgyBz0BAwH9nxISfgoMDRE5aRANElMEWQobBgYSG00IFTAwIg8YERJ+CgwMEjloEQ0SeQxDCEUBrgUCJScFAyL9hAgfEhEjDQGmCUIDByAsAQcEMQQpgywHDQICMIEoAgQzAiclAQJCB/5HMAEtAcpEBwQqJAEBAwclJAcBAQMnIyocBw4BARk2Bg0HIisDAUP+Hz4ClRBZCw4NEA1TFBMSEQ/9dQY2LA8CE+8QNbFhHgGlEFkLDg0QDVQTExIRDwABAAAABwIiAB4AAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAABoARgBfwKUA4cEbgABAAAAAgAAy0euH18PPPUACwPoAAAAANsg6vsAAAAA40vgGPyc/gJg9wR3AAAACAACAAAAAAAAArwAXAOEABoAIQAnAB8AIwAmAAAAAQAAA/z+wAAAYK78nP7XYPcAAQAAAAAAAAAAAAAAAAAAAAIABAN0AZAABQAAAooCWAAAAEsCigJYAAABXgBMARgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQCAgIAHAVAhu9AP8/sAAAAS/AgMAAAABAAAAAAHxArwAAAAgADIAAAACAAAAAwAAABQAAwABAAAAFAAEAEgAAAAOAAgAAgAGVAhiEGw0bXdt8W70//8AAFQIYhBsNG13bfFu9P//q/md8pPPko2SFJESAAEAAAAAAAAAAAAAAAAAAAAAAAcAWgADAAEECQAAAK4AAAADAAEECQABACYArgADAAEECQACAA4A1AADAAEECQADADoA4gADAAEECQAEACYArgADAAEECQAFABYBHAADAAEECQAGADIBMgBDAG8AcAB5AHIAaQBnAGgAdAAgADIAMAAyADIAIABUAGgAZQAgAFMAaABhAG4AdABlAGwAbAAgAFMAYQBuAHMAIABQAHIAbwBqAGUAYwB0ACAAQQB1AHQAaABvAHIAcwAgAGgAdAB0AHAAcwA6AGcAaQB0AGgAdQBiAC4AYwBvAG0AYQByAHIAbwB3AHQAeQBwAGUAcwBoAGEAbgB0AGUAbABsAC0AcwBhAG4AcwBLAGkAbgBnAG4AYQBtAG0AbQAgAE0AYQBpAHkAdQBhAG4AIAAyAFIAZQBnAHUAbABhAHIAMgAuADAAOwBLAGkAbgBnAG4AYQBtAG0AbQBNAGEAaQB5AHUAYQBuADIALQBSAGUAZwB1AGwAYQByAFYAZQByAHMAaQBvAG4AIAAyAC4AMABLAGkAbgBnAG4AYQBtAG0AbQBNAGEAaQB5AHUAYQBuADIALQBSAGUAZwB1AGwAYQByAAAAAwAAAAAAAP+PAFYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAH//wACAAEAAAAMAAAAAAAAAAIAAQABAAYAAQAAAAEAAAAKABwAHgABREZMVAAIAAQAAAAA//8AAAAAAAAAAQAAAAoALAAuAANERkxUABRjeXJsAB5sYXRuAB4ABAAAAAD//wAAAAAAAAAAAAAAAP/yA+gABv/vAAYABwAIAAUAAAABEABfA/qoAAAFPP4C/A0EdwAAAAEAAAAAAAAAAAAAAAAAAg==';
  var FAMILY = 'KN Maiyuan Title';
  var isWx = (typeof wx !== 'undefined') && !!wx.getSystemInfoSync;
  function b64ToAb(s) {
    var T = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    s = s.replace(/-/g, '+').replace(/_/g, '/').replace(/\s+/g, '');
    var n = s.length, pad = (s.charAt(n - 1) === '=' ? (s.charAt(n - 2) === '=' ? 2 : 1) : 0);
    var out = new Uint8Array(Math.floor(n / 4) * 3 - pad), acc = 0, bits = 0, p = 0, i;
    for (i = 0; i < n; i++) {
      var v = T.indexOf(s.charAt(i));
      if (v < 0) continue;
      acc = (acc << 6) | v; bits += 6;
      if (bits >= 8) { bits -= 8; if (p < out.length) out[p++] = (acc >> bits) & 0xFF; }
    }
    return out.buffer;
  }
  MG.titleFontFamily = FAMILY; // 未加载完成时先占位，注册完成后自动生效
  if (isWx) {
    try {
      var fsm = wx.getFileSystemManager();
      var path = wx.env.USER_DATA_PATH + '/title_font.ttf';
      fsm.writeFileSync(path, b64ToAb(B64), 'binary');
      var fam = wx.loadFont(path);
      if (fam) MG.titleFontFamily = fam;
    } catch (e) { /* 字体加载失败回退系统字体，不影响游戏 */ }
  } else if (typeof FontFace === 'function' && document && document.fonts) {
    try {
      var ff = new FontFace(FAMILY, 'url(data:font/ttf;base64,' + B64 + ')');
      ff.load().then(function (f) { document.fonts.add(f); }).catch(function () {});
    } catch (e) {}
  }
})();

;
// ===== js/config.js =====
// 水滴合成深海 - 全局配置
// 9 级合成链：雾泡 → 水滴 → 露珠 → 浪花 → 溪流 → 湖泊 → 江河 → 大海 → 沧海
window.MG = window.MG || {};
MG.config = {
  // 逻辑分辨率（画布固定，CSS 等比缩放）
  W: 420,
  H: 840,              // 9:18（420×18/9=840；比例 2.0 < 常见手机≈2.16，view.s 按宽适配不变）
  // ★ 比例旋钮：改屏幕比例只改 H 这一处，其余元素位置由 js/layout.js 全部自动派生。
  //   定位语义（v183 定版）：HUD 按顶部定位（钉块顶 0~165）；其余一切按底部定位
  //   （= 9:18 定版基准 + dy，dy=H-840，随块底整体平移）；底部带恒 75 贴块底；
  //   容器顶不设置（v184：容器从块顶长到容器底）；HUD 底与容器顶之间空隙 = 自然残余。
  //   数值规范（v191）：layout 内全部基准值为 5 的倍数。约束：H ≥ 840。
  floorY: 675,         // 容器底 y 初始值（build() 回写为 H-75；9:18=765）

  // 容器（顶部 HUD 区 0~165 三组（统计/得分+进度条/任务+潮汐）行距舒适；
  // 容器顶不设置=0：容器从块顶长到容器底，堆叠空间只作派生量）
  wall: 0,             // 侧墙厚（0 = 无边框，水滴铺满画布全宽）
  containerTop: 0,     // 容器顶部开口 y 初始值（build() 回写为 0：容器顶不设置，v184）
  dangerY: 315,        // 危险线 y 初始值（build() 回写为 315+dy；9:18=315。堆积超过此线且静止即失败）

  // 投放
  // 投放：坠落高度初始值（build() 回写为 260+dy 独立基准，与警戒线解耦，v190）
  spawnY: 260,
  dropCooldown: 0.55,  // 两次投放最小间隔（秒）

  // 物理
  gravity: 1500,       // 重力加速度 px/s^2
  restitution: 0.12,   // 弹性
  friction: 0.10,      // 切向摩擦
  dampPerStep: 0.9995, // 速度阻尼（每子步）
  maxSpeed: 1500,      // 限速
  substeps: 8,         // 每帧物理子步数
  slop: 0.5,           // 允许重叠量（防抖）

  // 失败判定
  dangerTime: 3,       // v368：堆高越线缓冲期（统一 3s，不再分潮汐 ×2 / 首次 ×3 / 容器顶 ×0.55）
  dangerSpeed: 80,     // 低于此速度视为"静止"
  graceTime: 0.6,      // 新球出生宽限（不参与危险判定）
  // v352：外力位移豁免时长（秒）——被磁石/漩涡滴拽拉而越过警戒线的水滴，在外力停止后仍有
  // 这么久落回，期间不参与堆高判负（用户："磁石滴带走的水滴不应该触发越线"）。
  // ★ 范围严格限定「特殊滴外力」：深海涌泉(1800)/风暴向心力(2400)/间歇泉(geyserF)/潮汐浮力
  //   造成的越线属正常游戏机制，一律不豁免（用户 v352 明确）——那些抬升若顶过线，该判就判。
  // 旧值 0.2s 不够：磁石吸力 6200 远大于重力 1500，水滴被拽到磁石位置后磁石一消散吸力即断，
  // 落回往往不止 0.2s，于是"在落回途中"就开始攒引信——这正是误判负的成因。
  extGrace: 1.2,
  dangerWarnH: 120,    // 警戒线「开始闪烁」的触发高度：水滴顶距警戒线 ≤ 此值（从下方逼近）才进入闪烁警示；更远时线条安静（v215 用户要求）

  // 连击
  comboWindow: 1.1,    // 连击窗口（秒）
  comboMaxMult: 4,     // 连击倍率上限
  rainCombo: 3,        // 甘霖触发：连击达到该次数时馈赠下一滴

  // 技能（每消除一个对应符文滴 +1 充能 = 可用 1 次，可连放；顺序对应底部按钮）
  // v316：解锁条件改为「对应符文滴首次出现即解锁」（跨刷新持久，见 systems.js runeSeen/seeRune）——
  // 旧版按累计分解锁（skillUnlock 分数门槛）已删除：未出现符文的技能保持锁定。
  // v342：cost 改为 1（原 4/6/10/6 的"攒满才激活"设计作废——消除一个符文滴即获 1 次使用）
  skills: [
    { key: 'swap',   name: '换滴', cost: 1 },
    { key: 'ripple', name: '涟漪', cost: 1 },
    { key: 'evap',   name: '蒸发', cost: 1 },
    { key: 'flow',   name: '水流', cost: 1 }
  ],

  // 二周目「深渊潜航」：免门槛直接可玩，菜单选一条海况词缀开高危高收益的无尽局
  ng: {
    unlockScore: 0,                     // v341：移除 5 万分解锁门槛，直接进入（入口在菜单「每日挑战」）
    affixes: [
      { id: 'heavy', name: '重压深潜', desc: '重力 +80%',        grav: 1.8 },    // v285：词缀再加重（用户：难度还是太低）；v328：+60%→+80%（用户："重压深潜（重力 +80%）"）
      { id: 'storm', name: '疾风骤雨', desc: '潮汐间隔 -65%',    tideInt: 0.35 },
      { id: 'reef',  name: '暗礁密布', desc: '礁石概率 ×4',    ironX: 4 },
      { id: 'frost', name: '寒冰速冻', desc: '水滴 35% 落水即冻', ice: 0.35 }
    ]
  },

  // 每日挑战：每天一局全服同规则的词缀挑战局（词缀按日期种子固定），达到目标分即完成
  dailyChal: {
    goalBestRatio: 0.35,  // 目标分 = 生涯最高分 × 35%（向上取整到百；无生涯分时按 3000 保底）
    goalMin: 3000,        // 目标分保底
    rewardBase: 1800,     // 首通奖励基数
    rewardStep: 200,      // 连续完成天数每 +1 天的奖励增量
    rewardMax: 3200,      // 奖励封顶（乘区前）
    charge: 1             // 完成时随机技能充能（v350：2→1，道具获取整体降低）
  },

  // 离线收益：按离开时长结算积分（生涯最佳分定速率），开局自动入账
  offline: {
    minMins: 3,           // 离开不足此分钟数不触发（防刷新页面反复白嫖）
    capMins: 480,         // 结算时长封顶（8 小时，过夜一觉正好吃满）
    perMinBase: 30,       // 每分钟保底产出
    bestRatio: 0.0004     // 每分钟额外产出 = 生涯最佳分 × 此系数（5.3 万 → 51/分）
  },

  // 涟漪：以水堆重心为中心的双重波纹推挤
  ripple: {
    power: 300,        // 首波推力
    secondPower: 190,  // 次波推力
    radius: 460,       // 有效半径
    delay: 0.28,       // 次波延迟（秒）
    lift: 90           // 额外向上抬升
  },

  // 特殊水滴（随机混入投放队列）
  specialChance: 0.15,           // 每次投放出现特殊滴的概率（潮汐池基准；v354 起随海域线性升至 specialChanceMax）
  specialChanceMax: 0.34,        // v354：最后一档海域（深渊王座）的特殊滴概率——海域越靠后，特殊滴整体越频繁
  specialStageBoost: 0.5,        // v354：海域对应加成——特殊滴的解锁海域每深一档，权重 ×(1+boost×stage)，
                                 // 使"当前海域所属"的特殊滴出现概率更大（浅海不受影响：可选项本来就少）
  // 符文水滴（随机附带道具属性）：合成带符文的水滴为对应技能 +1 充能（特殊滴/礁石不带符文）
  // v316：符文池不再按"已解锁技能"过滤——未解锁技能的符文正是解锁来源（滚出即解锁，见 systems.js rollRune/seeRune）
  rune: {
    chance: 0.05,                                      // 普通投放带符文的概率（v343：0.15→0.08；v350：0.08→0.05——道具获取整体降低，符文滴更稀缺）
    weights: { swap: 0.28, ripple: 0.24, evap: 0.20, flow: 0.28 } // 四种符文的分布权重
  },
  skillMaxQ: 5,              // v342：cost=1 后此值=单技能可储备的可用次数上限（最多连放 5 次，超额截断）
  guideLen: 170,             // 掉落辅助线固定长度（世界像素，v338：改为固定长度，参考主流落子指示）
  vortex: {                      // 漩涡滴：吸附周围水滴后消散
    pullR: 190,
    pullF: 430,
    delay: 0.35,
    life: 1.6,
    score: 8
  },
  cloud: {                       // 雨云滴：落地后随机分裂为 2~3 颗不大于当前等级的水滴（补充低级滴）
    splitDelay: 0.55,
    minSplit: 2,                  // 最少分裂数
    maxSplit: 3,                  // 最多分裂数
    maxTier: 2,                   // 分裂水滴档位上限（不大于当前等级——保持"补充低级滴"定位）
    score: 2
  },
  ice: {                         // 冰晶滴：落定后冻结自己与周围水滴（临时平台）
    freezeTime: 4.5,             // 冻结时长（秒）
    radiusFactor: 2.4,           // 冻结半径 = 自身半径 × 该系数
    score: 5
  },
  // 礁石：障碍物（砸穿水滴堆落底、不浮起、两两相消或蒸发移除）
  // ★ v357 重设计（用户："礁石的游戏设计有些弱了，毕竟是期望他能增加游戏难度"）：
  //   ① r 26→34（原半径小于第 4 档水滴，占位毫无存在感）② 蒸发 1 充能 +5 分 → **2 充能、不给分**
  //   （清除从"不亏反赚"变成止损）③ 新增**礁石税**：每块在场 −6% 全局收益（上限 −30%），
  //   拖着不管就持续吃亏。清除途径：两两相消（15 分）/ 蒸发（2 充能）/ 熔岩范围烧。
  // ★ v365：应用户要求**移除两项**——① "撞击才碎"（impactSpeed）移除，恢复**接触即相消**；
  //   ② "在场生长"（growRate/growMax）移除，半径恒定 34。礁石税与蒸发涨价保留。
  // ★ v366：应用户要求**只有涨潮才能消除礁石**（其他水滴无此限制）——相消与蒸发两条主动
  //   清除途径都要求 tide.progress ≥ tideNeed；v367 起「江河→大海」潮汐闸门已移除，礁石是
  //   场上唯一仍受潮汐限制的清除途径。熔岩范围烧是特殊滴的被动清除，不限潮汐（保留一个不挑
  //   时机的出口，避免死局）。
  iron: {
    chance: 0.08,                // 每次投放是礁石的概率
    maxActive: 3,                // 场上同时最多几个（v339：2→5；v375：用户要求礁石最多 3 个）
    r: 34,                       // v357：26→34（原半径小于第 4 档水滴，占位毫无存在感）；v365：恒定，不再生长
    massMult: 16,                // 质量倍率（远重于水滴，下落时把水滴挤开）
    evaporateScore: 0,           // v357：蒸发移除不再给分（原 5）
    evapCost: 2,                 // v357：蒸发一块礁石耗 2 次充能（水滴仍 1 次）
    hp: 4.0,                     // v372：礁石被水滴接触磨蚀的总时长（秒），磨穿即碎裂移除（玩家正向出口）
    erodeScore: 12,              // v372：礁石磨碎移除的奖励分（清礁石同时小幅回血，不再是纯负面）
    pairScore: 15,               // 两块礁石相消的奖励（v357 曾因"撞击才碎"提到 30，v365 恢复接触即消后回到 15）
    tideNeed: 0.15,              // v366：涨潮进度 ≥ 此值才允许消除礁石（相消 / 蒸发）
    taxPer: 0.06,                // v357：每块在场礁石让全局得分倍率 −6%
    taxMax: 0.30                 // v357：扣分上限 30%（5 块封顶）
  },

  // 图鉴积分门槛：累计得分（跨局）达到后才解锁该级图鉴（0 = 无门槛，前 5 级免费）
  dexGate: [0, 0, 0, 0, 0, 500, 3000, 10000, 30000],
  // 投放门槛：直接投放的水滴档位/特殊滴需累计分达标才会刷出（图鉴不显示门槛数值）
  spawnGate: [0, 0, 0, 800, 2500],
  // 特殊滴与海域绑定：抵达该海域后才会刷出（图鉴里未到达海域的特殊滴不显示）
  specialStage: {
    rune: 0, chest: 0,            // 潮汐池（v317：符文滴提前到潮汐池——技能解锁随首个符文出现，开局即可解锁）
    iron: 1, cloud: 1,            // 珊瑚浅海（v317：礁石改到珊瑚浅海）
    ice: 2, vortex: 2,            // 蔚蓝深海（v317：漩涡滴改到蔚蓝深海）
    rainbow: 3, gale: 3,          // 午夜深渊
    magnet: 4, spring: 4,         // 月光环礁
    thunder: 5, pearl: 5,         // 海沟之眼
    magma: 6, geyser: 6,          // 热泉裂谷
    void: 7, aurora: 7            // 深渊王座
  },
  // 新特殊滴行为参数
  magnet:   { delay: 0.4, life: 1.8, pullR: 250, pullF: 620, score: 150 }, // 磁石滴：吸附范围/力度须强于漩涡滴（pullF 430），否则"聚拢大范围"名不副实
  magmaR: 95, magmaScore: 70,   // 熔岩滴：烧毁半径 / 每个目标折算分
  geyserW: 120, geyserF: 400,   // 间歇泉：水柱半宽 / 上冲力
  voidN: 5, voidScore: 90,      // 虚空滴：吞噬数量上限 / 每颗折算分
  auroraMult: 3,                // 极光滴：下一次合成得分倍数

  // 潮汐系统（周期性涨潮：水滴受浮力上浮重排；浮起越线同样判负）
  // 潮位设计：满潮水面随海域线性逼近/没入警戒线（v322 纯线性，最后一个海域最高）——
  // v308 曾封顶"警戒线下 40px"（水面永远碰不到警戒线，水滴因此永远越不过线）；v319 移除
  // 封顶但把越线量挂在线性渐变端点，仿真实测 sea5 之前任何档位都浮不过线（sea3 仅沧海
  // 勉强 +14px、sea0-2 全负）；v321 改逐海域显式曲线又出现 sea2 凸节、sea4 后走平
  // （用户："涨潮的高度不合理，按理说应当线性增高，最后一个海域达到最高"）；v322 定为
  // overMin→overMax 纯线性：每个海域等量抬升 42px，深海满潮全档位浮起越线
    tide: {
      // v315：首潮倒计时不再单独设值，直接用 cycleInterval（用户："首次涨潮倒计时也用潮汐间隔的时间"）
    cycleInterval: 42,   // 两次涨潮间隔（v313：32→42，用户"初始增加到 40 以上"；随海域推进线性压到 tideIntervalMin）
    duration: 7,         // 涨潮持续（sea0 值；v327：随海域线性拉长至 durationMax——见 updateTide）
    durationMax: 9,      // v327：最后一个海域的涨潮持续。实测（test/sim_tide_probe.js）：深海引信链
                        // 2.2s(引信)+3s(深流缓冲)+2.2s(二段)=7.4s > 满潮保持 7s，退潮 1.6s 内水滴
                        // 随水面落回线下，二段引信永远差 ~0.3~1s 攒不满 ⇒ sea5~7 首个潮汐周期 72 个
                        // sea×tier 用例实测"判负: 无"，全部被缓冲+退潮救走（虚晃一枪）。拉长至 9s 后
                        // 引信链在退潮前兑现，深海潮汐首个周期即可判负
    buoyancy: 4000,      // 浮力加速度（v341：2900→4000，净上托 2500）。v353：衰减保留（用户"潮汐的衰减还是保留吧"），但完全浸没的水滴可被顶过警戒线（正常机制，按 v352 裁定不豁免）
    // v328：潮位规格（用户："潮汐最低是警戒线至底部的 1/4，最高值是 3/4！完全是不超过警戒线的"）
    // ——满潮水面 = 警戒线→底部(=floorY-dangerY=450px)的"填充比例"：浅海最低填 1/4、深海最高填 3/4，
    // 整条曲线线性、且恒在警戒线下方（最满 fill=3/4 时水面 = floorY-450×0.75 = 427.5，仍比警戒线 315 低 112.5px）。
    // fill(sea) = lowFrac + (highFrac-lowFrac)×sea/(海域数-1)；满潮水面 y = floorY - (floorY-dangerY)×fill。
    // 取代 v322 的 overMin/overMax（原会让深海满潮没过警戒线上 35px，违反"不超过警戒线"）。
    lowFrac: 0.25,       // 最低潮位填充比例（浅海；水面 = floorY-450×0.25 = 652.5，最靠近底部）
    highFrac: 0.75,      // 最高潮位填充比例（深海；水面 = floorY-450×0.75 = 427.5，最靠近警戒线但仍在线下 112.5px）
    warnTime: 3          // 涨潮前预警秒数
  },

  // 潮汐组合技：退潮余波有概率引来海神恩泽，全场普通水滴集体升 1 级
  tideBless: {
    chance: 0.4,         // 每次退潮触发概率（防连发：连续两次至多出一次）
    minDrops: 4          // 场上普通水滴少于此数不触发
  },

  // 无尽模式渐进加压（进入无尽后随时长线性到满，坡度平缓）
  ramp: {
    minutes: 14,         // 达到满强度所需分钟数（收紧：压力更早到位）
    tideIntervalMin: 16, // 潮汐间隔下限（秒）
    ironChanceMax: 0.16, // 礁石概率上限
    spawnWeightsMax: [22, 24, 22, 16, 16] // 投放权重演进终点（向高级倾斜）
  },

  // 高潮时刻：无尽模式每累计 +1500 分，场上最高档的可合成对自发相聚（v354：500→1500——原值后期触发过密）
  climaxEvery: 1500,

  // 里程碑任务链
  questScoreBase: 35,
  questScoreStep: 22,

  // 海域图鉴 & 汇入海域
  dexBonusMult: 10,
  seaBonus: 300,
  seaMultStep: 0.25,

  // 数值封顶：所有得分乘区（海域加成×成就加成×连击等）叠乘后的总上限，防后期分数膨胀失真
  multCap: 8,

  // 每日任务（每天按日期种子生成 3 个，跨局累计；全完成涨连续天数）
  daily: {
    rewardScore: 150,     // 单个任务完成奖励
    streakBase: 100,      // 全完成基础奖励
    streakStep: 50        // 连续天数每 +1 的额外奖励
  },

  // 海域演进：累计得分（跨局）里程碑改变世界（背景色调随阶段加深，色相与图鉴徽章一致）
  seaStages: [
    { at: 0,     name: '潮汐池', bg: ['#DFF4FC', '#BDE9F7', '#9BD4EC', '#80BFE2'], shade: 'rgba(16,56,96,0.26)' },
    { at: 3000,  name: '珊瑚浅海', bg: ['#E0F4EA', '#BAE9D6', '#8ED1C0', '#62AB9A'], shade: 'rgba(20,70,64,0.26)' },
    { at: 10000, name: '蔚蓝深海', bg: ['#C9EBF9', '#95D0EF', '#62A9DC', '#3D82BE'], shade: 'rgba(10,40,90,0.30)' },
    { at: 25000, name: '午夜深渊', bg: ['#A9BCE8', '#7589CF', '#4B5DB2', '#2D3B90'], shade: 'rgba(14,18,64,0.34)' },
    { at: 50000, name: '月光环礁', bg: ['#DCE6F0', '#B0C2D6', '#7C92B0', '#4C6084'], shade: 'rgba(28,32,54,0.34)' },
    { at: 100000, name: '海沟之眼', bg: ['#8FA3CE', '#5971B0', '#32478A', '#1B2D66'], shade: 'rgba(6,12,44,0.40)' },
    { at: 180000, name: '热泉裂谷', bg: ['#C4A69E', '#987068', '#6C4E52', '#44303C'], shade: 'rgba(46,20,14,0.40)' },
    { at: 300000, name: '深渊王座', bg: ['#B49BD6', '#8A67BE', '#5A3FA2', '#36256E'], shade: 'rgba(20,10,44,0.44)' }
  ],

  // 随机出生池（只出前 5 级，权重）
  spawnWeights: [30, 26, 22, 14, 8],

  // 合成链（每档一个可辨识色相：雾白→青→青绿→天蓝→宝蓝→靛蓝→紫→海军蓝→深渊墨蓝，明度同步递进）
  tiers: [
    { name: '雾泡', r: 15, color: '#E8F5FC', dark: '#A8CFE2', score: 1 },
    { name: '水滴', r: 21, color: '#8FDCE9', dark: '#3E9FBC', score: 3 },
    { name: '露珠', r: 28, color: '#56CDB4', dark: '#1E8A76', score: 6 },
    { name: '浪花', r: 36, color: '#4EA8E6', dark: '#1C68A6', score: 10 },
    { name: '溪流', r: 45, color: '#3E7BD6', dark: '#19468F', score: 15 },
    { name: '湖泊', r: 55, color: '#5B62C8', dark: '#2A3186', score: 21 },
    { name: '江河', r: 66, color: '#7A55BE', dark: '#3B2A6E', score: 29 },
    { name: '大海', r: 78, color: '#27479C', dark: '#101F56', score: 38 },
    { name: '沧海', r: 92, color: '#122A5E', dark: '#060F2E', score: 50 }
  ]
};

;
// ===== js/layout.js =====
// 水滴合成深海 - layout：布局几何唯一真源
// 模块加载顺序 1.5/4（config 之后、physics 之前）。经典 script 共享全局作用域，
// 本文件只依赖 MG.config；core/systems/panels/render 运行期经全局作用域解析引用。
//
// ★ 设计目标（v175）：改屏幕比例只改 config 的 C.H 一处，全游戏元素位置自动重排。
// 一切坐标从「基础几何」经公式派生，分四层：
//   ① hud   顶部信息区（0~hudBottom）：★ 按顶部定位——钉块顶，绝对定版，块高变化不动（v183）
//   ② body  容器区（containerTop~floorY）：★ 按底部定位——= 9:18 定版基准 + dy（v183）
//   ③ band  底部带（floorY~H）：高度恒 75 贴块底；内部（按钮/装饰）钉 floorY 相对位
//   ④ panel 全屏面板：同样按底部定位（= 9:18 定版基准 + dy），不漂流
// 菜单（开始界面）：按底部定位（= 9:18 定版基准 + dy）
//
// ★ 定位语义（v183 用户定版，覆盖 v175~v182 的 EXTRA 分配方案）：
//   "HUD 部分按照顶部定位，其他的按照底部定位，弹性空间不需要设置，有多少是多少。"
//   HUD 钉块顶（0~hudBottom）；其余一切 = 9:18 定版基准值 + dy，随块底整体平移；
//   HUD 底与容器顶之间的空隙 = 自然残余，不再显式分配。
// ★★ 容器顶不设置（v184 用户定版："容器到HUD顶部，直接到窗口最大位置即可，
//   相当于不设置容器顶；堆叠空间没必要，堆叠区从堆叠底部开始，高度上限不需要设置"）：
//   containerTop = 0——容器从块顶开始长；失败线 dangerY 直接钉绝对基准
//   （315+dy，含 v178/v181 两次+40 与 v188 单独下移 10），
//   "堆叠空间"退为派生量（floorY-dangerY 自动守恒），不再是反推参数。
// ★★★ 出生点独立基准（v190）：spawnY = 260+dy 与警戒线解耦（"单独移警戒线"语义：
//   警戒线动、出生点不动、两者间距必变）；出生通道 = dangerY-spawnY = 55；
//   弹出提示锚 mirrorCy = dangerY + 出生通道 = 370+dy（出生区相对警戒线的镜像对称位）。
// ★ v194 堆叠空间中点 stackCy = (dangerY+floorY)/2 = 540+dy：深海事件"漩涡风暴"锚点
//   （旧公式 containerTop+(floorY-containerTop)*0.45 的语义"从容器顶往下 45%"在 v184
//    容器顶改 0 后静默漂移到 344，漩涡盘顶压过警戒线 31px；改锚堆叠区中心永不再压线）。
// ★ v195 HUD 下探 + 底部六钮均匀化（用户："HUD信息区可以设置更大的范围（例如占用部分伸缩区），
//   请重新调整这部分的样式，尤其是任务元素（太丑了，请重新设计）"；"底部按钮/道具应当均匀
//   分布，且左侧按钮（图鉴）与右侧按钮（重开）距离左右边界的距离应该是一定的"）：
//   · hudBottom 165→190：占用伸缩区 25，余 70 = 特殊滴虚影标签空间（r≤36 不碰 HUD）；
//   · 任务条 205×35 → 任务卡 285×60（靶心图标+标题+星级+金色进度条）；潮汐胶囊 90×35
//     → 潮汐卡 95×60（同高同款，左右边距各 15、卡间 10，全部 5 的倍数，守 v191 规范）；
//   · 底部六钮：band.btnCx = 35+i×(W−70)/5 公式派生、band.btnR=20 统一半径
//     （旧写死 45/115/…/395 左右缘距 25≠10、重开 r15 偏小）。
// ★ v197 第一排重排（用户："图标也太丑了，成就按钮先隐藏掉吧。游戏内这个地方改成设置按钮，
//   用来弹出设置音效、音乐和震动，右侧的音量按钮移除掉"；设置弹窗底部不放说明文本）：
//   · 成就按钮（奖杯）整套隐藏；右上角音量钮整套移除；左上角原位新增设置钮（setCx=25
//   占原奖杯位，半径引 rowBtnR=18，样式沿用 v196 drawRowBtn 白底圆+蓝灰环+齿轮图标）；
//   · 新增设置弹窗 panel.set（v317 起 300×326 块内居中，随 dy 平移）：标题 + ✕ + 四行
//     （音效/音乐/震动三开关，每行 260×56：名称+小字说明+右侧 52×30 滑块，点整行即切换；
//      v317 第 4 行 = 清空存档，危险样式，点行开二级确认 panel.setClear）；
//     弹窗打开时屏蔽瞄准/掉落（与重开确认弹窗同门禁）；底部按用户要求不放说明文本。
//     v317 高度 260→326：四行排满 50+3×66+56=304，余 22（与旧版三行的 12 对称留白）。
// ★ 数值规范（v191 用户要求"值要求是 0 或者 5 结尾"）：本文件所有基准值统一为
//   5 的倍数（坐标/尺寸/偏移全部整齐，便于目测核对与微调）。
//   dy = C.H - 840（9:18 定版基准块高）：H=840 → 0（= 当前交付逐像素一致）；
//   改比例只改 C.H，HUD 不动、其余全部 +dy。
//   约束：H ≥ 765 + 75 = 840（当前交付比例即下限）。
// 适配策略（view.s / oy / renderOy / hudInset）由 core.fit() 每帧重算，见其注释。
//
// ★ 使用规范：绘制与命中热区一律引用 MG.layout.xxx，禁止再写死坐标数字；
//   config 改 C.H 后无需改任何其他文件（fit() 每次 resize 会调 build() 重算）。
window.MG = window.MG || {};
MG.layout = {
  hud: null, body: null, band: null, panel: null, menu: null,
  dy: 0,        // 当前块高相对 9:18 定版基准的底部平移量（= C.H - 840），供探针/调试输出

  // 由基础几何重建全部派生坐标（幂等；config 被外部改动后调用即可同步）
  build: function () {
    var C = MG.config, W = C.W, H = C.H;
    // ★★ 容器顶不设置（v184 用户定版）：containerTop = 0，容器从块顶开始长；
    //   失败线 dangerY 直接钉绝对基准（315+dy，v191 数值规范：317→315），
    //   "堆叠空间"不再作为反推参数——它只是派生量 floorY - dangerY，自动守恒。
    var dy = H - 840;                  // 9:18 定版基准块高 840；H=840 → 0
    this.dy = dy;
    C.floorY = H - 75;                 // 765（9:18）：容器底 = 块底 - 底部带 75
    C.containerTop = 0;                // 容器顶不设置（v184）：容器从块顶（窗口最大位置）开始长
    C.dangerY = 315 + dy;              // 315（9:18）：失败线绝对基准（254+两次+40-同步上移+单独下移10，v191 取整）
    // 坠落高度 = 出生点绝对基准（260+dy，v190 定版，与警戒线解耦）。
    // v188 曾按"公式跟随"让 spawnY 随警戒线联动，用户反馈"单独给警戒线往下移10 好像
    // 没有生效，因为警戒线和出生区的间距没有变化"——"单独移"语义 = 警戒线动、出生点不动。
    C.spawnY = 260 + dy;               // 260（9:18）：出生点独立基准，不随警戒线漂移

    // ---- ① 顶部 HUD 区（v149/v161 定版行位；★ 钉块顶，块高变化时本区不动）----
    this.hud = {
      row1Y: 40,               // 统计最佳结果 / 计时 baseline（与设置钮 cy35 垂直居中对齐同排）
      trophyCy: 35,            // 设置按钮圆心（+hudInset 避让胶囊）
      setCx: 25,               // v197：设置钮 x（占原奖杯位；右上角音量钮已移除）
      rowBtnR: 18,              // v196：第一排圆钮统一半径（设置钮，15→18 变大）
      scoreY: 85,              // 当前得分 baseline（translate 锚点；v234b：80→85，按设置钮底(53)~进度条顶(98)中点≈75 居中）
      seaBar: { sx: 25, sy: 98, sw: W - 50, sh: 24 }, // 海域进度条（v151 定版 100~120；v223 高 20→24、上移 2 补偿：上让出分数行间隙、下仍留潮汐 ty=125 前 3px）
      // ★ v195 HUD 下探 + 任务元素重设计（用户："HUD信息区可以设置更大的范围（例如占用部分
      //   伸缩区），请重新调整这部分的样式，尤其是任务元素（太丑了，请重新设计）"）：
      //   hudBottom 165→190：占用"HUD底→出生点260"伸缩区 25，余 70 = 特殊滴虚影标签空间
      //   （标签 17px 贴球顶；r≤36 不碰 HUD；刘海 hudInset≤25 时视觉底 215，距出生点仍 45）；
      //   任务条 205×35 两行挤压 → 任务卡 285×60（靶心图标+标题+星级+金色进度条）；
      //   潮汐胶囊 90×35 → 潮汐卡 95×60（与任务卡同高同款白底，左右边距各 15、卡间 10）。
      quest: { qx: 15, qy: 125, qw: 285, qh: 60 },     // 任务卡（v195 重设计，15~300 × 125~185）
      tidePill: { side: 'right', margin: 25, ty: 135, th: 44 }, // v274：ty 142→135（用户"降到135"）；v273 曾 127→142 下移拉开与海域进度条(底122)的间距；右锚定紧凑液态计时器；未填充区透明（仅描边）；v208 压低高度 52→44；v213 卡宽固定（按 2 位数 '99s' 封顶），文字缩短只影响文本本身、不再改变卡宽/位置
      hudBottom: 190           // HUD 区底沿（v195：任务卡底+5）；容器顶=0（v184），HUD 直接浮在容器上
    };

    // ---- ② 容器区（核心游戏几何：底部锚定，随 dy 整体平移；容器顶不设置=0，v184）----
    this.body = {
      containerTop: C.containerTop,     // 0：容器顶不设置（容器从块顶开始长，v184 用户定版）
      dangerY: C.dangerY,               // 315+dy 警戒线（绝对基准，v191 取整）
      floorY: C.floorY,                 // 765+dy 容器底
      spawnY: C.spawnY,                 // 260+dy 出生点（独立基准，v190 起与警戒线解耦）
      // 出生通道（坠落区）高度 = dangerY - spawnY = 55（9:18）——"单独移警戒线"的显式体现
      spawnGap: C.dangerY - C.spawnY,
      // ★ 弹出提示（公告弹字 + 涨潮横幅）默认锚点：出生区相对警戒线在堆叠区中的
      //   镜像对称位置 = dangerY + spawnGap = 370+dy（出生通道 55 镜像到警戒线下方）
      mirrorCy: C.dangerY + (C.dangerY - C.spawnY),
      // ★ v194 堆叠空间中点 = (dangerY+floorY)/2 = 540+dy：深海事件"漩涡风暴"锚点
      //   （旧 0.45 公式随 v184 容器顶=0 静默漂移到 344、盘顶压警戒线 31px，用户报
      //    "漩涡风暴每次都接近警戒线"；堆叠空间恒 450，中点距警戒线 225，永不再压线）
      stackCy: (C.dangerY + C.floorY) / 2,
      tutY: 535 + dy                    // 首局引导胶囊锚点（v231：575→535 上移 40，堆叠区中部；随底部锚定链平移）
    };

    // ---- ③ 底部带（floorY~H：高度恒 75 贴块底，内部钉 floorY 相对位，绝不打散）----
    // 底部六钮圆心 x（v195 用户："底部按钮/道具应当均匀分布，且左侧按钮（图鉴）与右侧
    // 按钮（重开）距离左右边界的距离应该是一定的"）：旧 systems.js 写死 45/115/185/255/
    // 325/395 + restart r15 → 左缘距 25≠右缘距 10、重开钮偏小、整排视觉重心偏右。
    // 现由 W 公式派生：边距 35、间距 (W-70)/5（9:18=70），六钮统一 r=20 → 左右缘距各 15，
    // 完全均匀对称；systems.js 的 bookBtn/SKILL_BTNS/restartBtn 改引本真源（禁写死坐标）。
    var btnCx = [], bi;
    for (bi = 0; bi < 6; bi++) btnCx.push(35 + bi * (W - 70) / 5);
    this.band = {
      top: C.floorY,
      h: H - C.floorY,                  // 恒 75（底部带固定不变，v177 用户定版）
      btnCy: C.floorY + 30,             // 795+dy：底部一排按钮圆心（v163 铁律：与容器底恒距 30）
      btnCx: btnCx,                     // v195 六钮圆心 x：[图鉴,交换,涟漪,蒸发,水流,重开]（公式派生）
      btnR: 20,                         // v195 六钮统一半径（重开 15→20，消除大小不一）
      labelDy: 10,                      // 按钮名称标签：圆心 + r + 10
      decorBase: C.floorY + 20,         // 785+dy：底部装饰基准线（床面玻璃横条底 FH12 + 8）
      dunes: [                          // 三块沙丘（径向渐变柔边）：相对容器底固定，随 dy 平移不重排
        { x: 85,  dy: 10, rx: 95,  ry: 15, c: 'rgba(238,246,240,0.7)', c0: 'rgba(238,246,240,0)' },
        { x: 315, dy: 15, rx: 115, ry: 15, c: 'rgba(238,246,240,0.7)', c0: 'rgba(238,246,240,0)' },
        { x: 195, dy: 20, rx: 85,  ry: 10, c: 'rgba(228,240,234,0.55)', c0: 'rgba(228,240,234,0)' }
      ],
      pebbleYOff: (C.floorY + 20) - 665, // 卵石/海星/扇贝基准随 dy 平移（旧版 FLOORY=646 定版位）
      pebbles: [[25, 685, 2.5], [65, 700, 2.5], [110, 685, 2.5], [170, 700, 2.5],
                [245, 690, 2.5], [305, 700, 2.5], [350, 685, 2.5], [405, 695, 2.5]],
      starfish: { x: 90, y: 700, s: 10 },
      shell: { x: 330, y: 700, s: 10 }
    };

    // ---- ④ 全屏面板（底部锚定：= 9:18 定版基准 + dy，随块底平移不漂流）----
    this.panel = {
      focusCy: 465 + dy,              // 游戏区焦点中心（9:18 定版 465：结算海报 py230/h470 与分享卡 py255/h420 的共同中心）
      over: { w: 320, h: 470 },       // 结算海报（v161 排版放松定版；py = focusCy - 235 = 230+dy）
      share: { w: 300, h: 420 },      // 战报分享卡（py = focusCy - 210 = 255+dy）
      confirm: { w: 300, h: 224, btnH: 42, btnGap: 12, btnTop: 54 }, // v299 曾去标题行，v300 按用户要求恢复（页头标题+✕）；按钮维持放大后 42 高不变
      ng: { w: 330, h: 350 },         // 深渊潜航词缀三选一（底部锚定，y = 245+dy）
      dex: { x: 20, w: 380, h: 600 }, // 图鉴/成就（局内 y 由 dexY 派生；菜单态按全屏 VH 居中）
      dexY: 120 + dy,                 // 图鉴局内 y（9:18 定版 120 = (840-600)/2，随底部锚定链平移）
      // ★ v197 设置弹窗（音效/音乐/震动三开关 + v317 清空存档一行；用户："游戏内这个地方改成设置按钮，
      //   用来弹出设置音效、音乐和震动"）：300×326 块内居中（x=(W-300)/2=60，y=(840-326)/2+dy=257+dy），
      //   随底部锚定链平移；底部按用户要求不放说明文本。v317 加第 4 行「清空存档」：面板 260→326
      //   （行几何不动：rowDy=50 标题区 / rowGap=66（行距 56+10）/ rowW=260 左右各留 20，
      //    四行排满 50+3×66+56=304，余 22 与旧版三行对称）。
      //   v317 清空存档二级确认（危险操作，与设置面板同语言）：300×180 块内居中，两钮横排。
      set: { w: 300, h: 326, rowDy: 50, rowGap: 66, rowH: 56, rowW: 260 }, // v200：rowDy 60→50 让三行让出通用页头（标题 y+30）
      setClear: { w: 300, h: 180, btnH: 42, btnGap: 12, btnTop: 108 }
    };

    // ---- 菜单（开始界面：顶部艺术字标题、左右功能磁贴列、中央水滴吉祥物、深海蓝胶囊开始钮；
    //      v237 撤：海域牌/历史最佳牌/底部玩法一句话；全部 = 定版基准 + dy）----
    this.menu = {
      titleY: 130 + dy, subY: 148 + dy,  // v287 下移 20（用户"有点靠上"）→ v289 回上 10（用户：主页标题上移 10）
      tileW: 64, tileH: 64,            // 功能磁贴（深海玻璃牌：图标+标签收在块内，不外溢遮挡）
      tileLX: 55, tileRX: 365,         // 左右列中心 x（左右缘距 25）
      tileTop: 246 + dy, tileGap: 78,  // 行 y = tileTop + i*tileGap（246/324，块底 388 不压吉祥物 430）
      mascotCy: 430 + dy,              // 中央水滴吉祥物（两列之间）
      offlineY: 565 + dy, offlineW: 300, offlineH: 80, // v288：60→80（三行文字原挤在 60 内、末行贴底溢出）
      startY: 690 + dy, startW: 260, startH: 65   // 深海蓝大胶囊（圆角全半径）
    };
  },

  // ---- 菜单功能磁贴矩形（渲染与命中共用）：side 'L'/'R'，行号 i ----
  menuTileRect: function (side, i) {
    var m = this.menu;
    var cx = side === 'L' ? m.tileLX : m.tileRX;
    return { x: cx - m.tileW / 2, y: m.tileTop + i * m.tileGap, w: m.tileW, h: m.tileH };
  },

  // ---- 面板矩形（渲染与命中共用，一处定义）----
  overRect: function () {
    var p = this.panel.over, W = MG.config.W;
    return { x: (W - p.w) / 2, y: this.panel.focusCy - p.h / 2, w: p.w, h: p.h };
  },
  shareRect: function () {
    var p = this.panel.share, W = MG.config.W;
    return { x: (W - p.w) / 2, y: this.panel.focusCy - p.h / 2, w: p.w, h: p.h };
  },
  confirmRect: function () {
    // v234：重开确认与设置弹窗同款居中——面板块内垂直居中（此前 dy:395 偏上不居中）
    var p = this.panel.confirm, W = MG.config.W;
    return { x: (W - p.w) / 2, y: (840 - p.h) / 2 + this.dy, w: p.w, h: p.h };
  },
  // v234 重开确认三按钮矩形（渲染与命中共用）：0=返回主页 1=重新开始 2=返回游戏
  confirmBtnRect: function (i) {
    var r = this.confirmRect(), p = this.panel.confirm;
    return { x: r.x + 24, y: r.y + p.btnTop + i * (p.btnH + p.btnGap), w: r.w - 48, h: p.btnH };
  },
  // v236 重开确认右上 ✕（同 setCloseBtn/dexCloseBtn 惯例：右内缩 40、顶 8、30×30）
  confirmCloseRect: function () {
    var r = this.confirmRect();
    return { x: r.x + r.w - 40, y: r.y + 8, w: 30, h: 30 };
  },
  // v197 设置弹窗矩形（渲染与命中共用）：面板块内居中，随 dy 平移
  setRect: function () {
    var p = this.panel.set, W = MG.config.W;
    return { x: (W - p.w) / 2, y: (840 - p.h) / 2 + this.dy, w: p.w, h: p.h };
  },
  setRowRect: function (i) {
    var r = this.setRect(), p = this.panel.set;
    return { x: r.x + 20, y: r.y + p.rowDy + i * p.rowGap, w: p.rowW, h: p.rowH };
  },
  setCloseRect: function () {
    var r = this.setRect();
    return { x: r.x + r.w - 40, y: r.y + 8, w: 30, h: 30 }; // ✕ 热区 30×30（右上角，与图鉴 dexCloseBtn 同款）
  },
  // v317 清空存档二级确认（渲染与命中共用）：面板块内居中，随 dy 平移
  setClearRect: function () {
    var p = this.panel.setClear, W = MG.config.W;
    return { x: (W - p.w) / 2, y: (840 - p.h) / 2 + this.dy, w: p.w, h: p.h };
  },
  // 0=取消 1=确认清空（横排等宽，左右各留 24）
  setClearBtnRect: function (i) {
    var r = this.setClearRect(), p = this.panel.setClear;
    var bw = (r.w - 48 - p.btnGap) / 2;
    return { x: r.x + 24 + i * (bw + p.btnGap), y: r.y + p.btnTop, w: bw, h: p.btnH };
  },
  setClearCloseRect: function () {
    var r = this.setClearRect();
    return { x: r.x + r.w - 40, y: r.y + 8, w: 30, h: 30 };
  },
  ngRect: function () {
    var p = this.panel.ng, W = MG.config.W;
    return { x: (W - p.w) / 2, y: (840 - p.h) / 2 + this.dy, w: p.w, h: p.h };
  }
};
MG.layout.build();

;
// ===== js/physics.js =====
// 水滴合成深海 - 极简圆形物理引擎
// 纯 JS 实现（无依赖），后续可整体移植到微信小游戏（wx.createCanvas 同为 2D context）
// 策略：固定子步进积分 + 位置修正（含 slop 防抖） + 冲量解算（弹性/切向摩擦）
(function () {
  var C = MG.config;

  function Physics() {
    this.bodies = [];
    this._nextId = 1;
  }

  Physics.prototype.create = function (x, y, tier, vx, vy) {
    var b = {
      id: this._nextId++,
      x: x, y: y,
      vx: vx || 0, vy: vy || 0,
      r: C.tiers[tier].r,
      tier: tier,
      dangerT: 0,     // 越线静止累计时间
      grace: C.graceTime // 出生宽限
    };
    this.bodies.push(b);
    return b;
  };

  Physics.prototype.remove = function (b) {
    var i = this.bodies.indexOf(b);
    if (i >= 0) this.bodies.splice(i, 1);
  };

  // v351：批量删除——一趟遍历搞定（调用方原先是循环逐个 remove，每次都是
  // indexOf(O(n)) + splice(O(n))，删 k 个即 O(k*n)）。count 可选：只删 list 前
  // count 个（虚空吞噬只吞前 N 个 victim，传 count 可免 slice 分配）。
  Physics.prototype.removeMany = function (list, count) {
    if (!list || !list.length) return;
    var n = (count == null) ? list.length : Math.min(count, list.length);
    if (n <= 0) return;
    var kill = {}, i;
    for (i = 0; i < n; i++) if (list[i]) kill[list[i].id] = 1;
    var bs = this.bodies, w = 0;
    for (i = 0; i < bs.length; i++) { if (!kill[bs[i].id]) bs[w++] = bs[i]; }
    bs.length = w;
  };

  Physics.prototype.step = function (dt) {
    var bs = this.bodies;
    var n = C.substeps, h = dt / n;
    var left = C.wall, right = C.W - C.wall;
    var floorY = C.floorY;
    var g = C.gravity, e = C.restitution;
    var k, s, i, j, b, o;

    for (s = 0; s < n; s++) {
      // --- 积分 + 边界 ---
      for (k = 0; k < bs.length; k++) {
        b = bs[k];
        b.vy += g * h;
        b.vx *= C.dampPerStep;
        b.vy *= C.dampPerStep;
        var sp = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
        if (sp > C.maxSpeed) {
          var sc = C.maxSpeed / sp;
          b.vx *= sc; b.vy *= sc;
        }
        b.x += b.vx * h;
        b.y += b.vy * h;

        if (b.x - b.r < left) { b.x = left + b.r; if (b.vx < 0) b.vx = -b.vx * e; b.vy *= 0.99; }
        if (b.x + b.r > right) { b.x = right - b.r; if (b.vx > 0) b.vx = -b.vx * e; b.vy *= 0.99; }
        if (b.y + b.r > floorY) { b.y = floorY - b.r; if (b.vy > 0) b.vy = -b.vy * e; b.vx *= 0.985; }
      }

      // --- 圆-圆碰撞（O(n^2)，球数 <= 60，足够快）---
      for (i = 0; i < bs.length; i++) {
        var a = bs[i];
        for (j = i + 1; j < bs.length; j++) {
          o = bs[j];
          var dx = o.x - a.x, dy = o.y - a.y;
          var minD = a.r + o.r;
          var d2 = dx * dx + dy * dy;
          if (d2 >= minD * minD) continue;

          var dist = Math.sqrt(d2), nx, ny;
          if (dist < 0.0001) { nx = 0; ny = -1; dist = 0.0001; }
          else { nx = dx / dist; ny = dy / dist; }

          // 礁石（iron）参与的接触：零容差 + 全量位置修正——礁石与普通滴严格分离，
          // 既不重叠（视觉穿模）也不压扁水滴（水滴-水滴仍保留 slop 让堆叠柔软自然）
          var ironPair = !!(a.iron || o.iron);
          var overlap = minD - dist - (ironPair ? 0 : C.slop);
          if (overlap <= 0) continue;

          // 质量 ∝ 面积（b.m 为自定义质量，铁块等障碍用）
          var ma = a.m || a.r * a.r, mo = o.m || o.r * o.r;
          var invA = 1 / ma, invO = 1 / mo, invSum = invA + invO;

          // 位置修正（按反质量分配）；礁石对全量修正，杜绝残余重叠
          var corr = overlap / invSum * (ironPair ? 1.0 : 0.8);
          a.x -= nx * corr * invA; a.y -= ny * corr * invA;
          o.x += nx * corr * invO; o.y += ny * corr * invO;

          // 法向冲量
          var rvx = o.vx - a.vx, rvy = o.vy - a.vy;
          var vn = rvx * nx + rvy * ny;
          if (vn < 0) {
            var jn = -(1 + e) * vn / invSum;
            a.vx -= jn * nx * invA; a.vy -= jn * ny * invA;
            o.vx += jn * nx * invO; o.vy += jn * ny * invO;

            // 切向摩擦
            var tx = -ny, ty = nx;
            var vt = rvx * tx + rvy * ty;
            var jt = -vt * C.friction / invSum;
            a.vx -= jt * tx * invA; a.vy -= jt * ty * invA;
            o.vx += jt * tx * invO; o.vy += jt * ty * invO;
          }
        }
      }
    }
  };

  MG.Physics = Physics;
})();

;
// ===== js/core.js =====
// 水滴合成深海 - core：画布与自适应 / 平台存储封装 / 音效 / 广告占位
// 模块加载顺序 1/4（无内部依赖）。四个模块共享全局作用域（经典 script），
// 函数与状态互相可见；加载顺序只约束"顶层初始化语句"的执行先后。
  var C = MG.config;
  var T = C.tiers;
  // 跨模块工具：微信 Canvas 对 hsl/hsla 支持不稳定，提供 rgba 兜底
  MG.util = MG.util || {};
  MG.util.hslToRgba = function (h, s, l, a) {
    h = ((h % 360) + 360) % 360 / 360; s = Math.max(0, Math.min(1, s / 100)); l = Math.max(0, Math.min(1, l / 100));
    var c = s * (1 - Math.abs(2 * l - 1));
    var x = c * (1 - Math.abs((h * 6) % 2 - 1));
    var m = l - c / 2, r, g, b;
    if (h < 1 / 6) { r = c; g = x; b = 0; }
    else if (h < 2 / 6) { r = x; g = c; b = 0; }
    else if (h < 3 / 6) { r = 0; g = c; b = x; }
    else if (h < 4 / 6) { r = 0; g = x; b = c; }
    else if (h < 5 / 6) { r = x; g = 0; b = c; }
    else { r = c; g = 0; b = x; }
    return 'rgba(' + Math.round((r + m) * 255) + ',' + Math.round((g + m) * 255) + ',' + Math.round((b + m) * 255) + ',' + (a == null ? 1 : a) + ')';
  };

  // ---------- 画布 ----------
  // 逻辑高度动态（VH ≥ C.H）：HUD 三组行位钉块顶（layout.hud，0~164），
  // 其余一切按底部定位（layout.body/band/panel/menu = 9:18 定版基准 + dy，随块底平移），
  // 中间水域随窗口高度自适应；画布 CSS 高度恒等于窗口高度，CSS 宽度=游戏区宽度（两侧为页面深海背景）
  var canvas = document.getElementById('game');
  // v295：诊断开关 —— URL 带 ?cpu=1 时强制 CPU（软件光栅）画布：
  // Chrome/Edge/Electron 下 willReadFrequently:true 会让该 canvas 完全走 CPU 光栅、不再分配
  // GPU 表面，可彻底排除"GPU 表面损坏导致的花屏"。用来确认花屏是否来自宿主 GPU 合成层。
  var _qs = '';
  try { _qs = (window.location && window.location.search) || ''; } catch (e) { _qs = ''; }
  var forceCpu = /(\?|&)cpu=1(\b|&)/.test(_qs);
  var ctx = canvas.getContext('2d', { alpha: false, willReadFrequently: forceCpu }); // v294：不透明画布——背景全程自绘不透明，
                                                       // 杜绝"表面清空后透出宿主棋盘噪声"的花屏形态
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var VH = C.H;           // 当前逻辑高度（全屏：h/view.s，≥C.H）
  var LW = C.W;           // 当前逻辑宽度（≥ C.W，宽窗口下两侧为延伸海水）
  var BX = 0;             // 游戏区（420 逻辑宽）水平居中偏移
  var FLOORY = C.floorY;  // 容器底 y（= layout.body.floorY，随 dy 平移）
  var view = { s: 1 };
  // 游戏块 = 420×C.H 逻辑区（当前交付 9:18=840）。★ 定位语义（v183 用户定版）：
  // HUD 按顶部定位（钉块顶 0~164，绝对定版）；其余一切按底部定位
  // （= 9:18 定版基准 + dy，dy=C.H-840，随块底整体平移）；底部带恒 74 贴块底；
  // HUD 底与容器顶之间空隙 = 79+dy，有多少是多少、不显式分配。
  // 坠落高度 = 最大可投放滴底触警戒线时的球心（dangerY - 45）；高屏多余的高度上下均分
  // （oy 为块居中偏移），块外由背景渐变延伸填充。
  // ★ 改比例只改 config 的 C.H 一处：layout.build() 自动重算全部游戏内坐标
  //   （dy=C.H-840，HUD 不动、其余全部随块底平移）；本 fit() 只负责
  //   「块 → 窗口」适配（view.s / oy / hudInset），不再写死任何游戏内坐标。
  var oy = 0;             // 游戏块顶部偏移（逻辑 px，≥0）
  var renderOy = 0;       // 渲染/点击实际使用的偏移（全态 = oy，垂直居中）
  var hudInset = 0;       // HUD 顶行避让胶囊的实际下挪量（= 居中后残余量，高屏→0，矮屏≤24）

  function fit() {
    var w = window.innerWidth, h = window.innerHeight;
    MG.layout.build();                    // 几何真源重建（config 改 H 后全量自动重排）
    // 全屏铺满：刘海/挖孔、手势条区域都按正常区域对待，不做任何安全区缩进
    view.s = Math.min(w / C.W, h / C.H);   // 等比缩放，不变形
    VH = h / view.s;
    LW = w / view.s;                       // 逻辑宽度（≥420）
    BX = (LW - C.W) / 2;                   // 游戏区水平居中
    // 垂直居中：高屏多余的高度上下均分，游戏块（420×C.H）居中成为视觉焦点；
    // 块顶上方/块底下方由全屏背景渐变（水色）自然延展填充，无留白、无接缝。
    // （__safeTop 由 wx-shim 用 getMenuButtonBoundingClientRect 计算，单位=窗口 CSS px）
    oy = Math.max(0, (VH - C.H) / 2);
    // 胶囊残余避让：居中后 HUD 顶行（块内 trophyCy35/r16 → 顶缘 19）若仍在胶囊下缘之上才需额外下挪；
    // 高屏居中量已远大于胶囊高度 → hudInset=0（无需再避让）；矮屏(≈块高)才给 ≤25 的残余量。
    var capBottom = window.__safeTop ? (window.__safeTop - 10) / view.s : 0;
    hudInset = Math.max(0, Math.min(capBottom - oy - (MG.layout.hud.trophyCy - 16), 25));
    // 容器区（layout.body 单一真源）：容器底/容器顶/警戒线/出生点按底部锚定
    // （floorY = H-75，随块底整体平移）
    FLOORY = MG.layout.body.floorY;        // 765+dy（9:18=765；dy=C.H-840）
    // v294：仅尺寸真变化才重设——对 canvas.width/height 赋值（即使值相同）也会清空画布并
    // 重新分配显存表面；窗口拖拽/预览容器连续缩放时 fit() 高频触发，表面反复重建在部分
    // GPU/合成器上呈现花屏（用户截图：全屏 1px 棋盘噪声、内容半透明）
    var nw = Math.round(w * dpr), nh = Math.round(h * dpr);
    if (canvas.width !== nw) canvas.width = nw;
    if (canvas.height !== nh) canvas.height = nh;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    // 按钮恒贴在容器底下方（cy=layout.band.btnCy=FLOORY+28，与容器底恒距 28，v163 定版）——
    // 块高/比例变化时容器整体下移，按钮随容器走（不钉屏幕、不贴块底，v172 贴底事故的根治）
    var cy = MG.layout.band.btnCy;
    // 注意：模块化后 bookBtn 等声明在 systems.js（后加载），早期触发时用 typeof 守卫
    if (typeof bookBtn !== 'undefined' && typeof restartBtn !== 'undefined' && typeof SKILL_BTNS !== 'undefined') {
      bookBtn.cy = cy; restartBtn.cy = cy;
      for (var i = 0; i < SKILL_BTNS.length; i++) SKILL_BTNS[i].cy = cy;
    }
    // v197：成就/音量按钮已移除，设置钮（setBtn）画在 HUD 平移块内（drawHUD），
    // cy 恒为 layout.hud.trophyCy、命中侧 +hudInset，无需在此烤入坐标。
  }
  window.addEventListener('resize', fit);
  window.addEventListener('orientationchange', fit);
  if (window.ResizeObserver) {
    // 兜底：预览面板/嵌入容器改变尺寸时不一定触发 resize 事件
    new ResizeObserver(fit).observe(document.documentElement);
  }

  // ---------- 存储（走平台适配层 MG.platform，Web 实现指向 localStorage） ----------
  function saveNum(key, v) { MG.platform.set(key, String(v)); }
  function loadFlag(key) { return MG.platform.get(key) === '1'; }
  function saveFlag(key, v) { MG.platform.set(key, v ? '1' : '0'); }
  function loadDex() {
    var v = MG.platform.getJSON('mg_dex', {}) || {};
    return { u: v.u || {}, c: v.c || {}, sp: v.sp || {}, stats: v.stats || {}, ach: v.ach || {}, col: v.col || {} };
  }
  function saveDex() {
    MG.platform.setJSON('mg_dex', { u: dexUnlocked, c: dexCounts, sp: dexSpecial, stats: lifeStats, ach: achDone, col: colClaimed });
  }

  // ---------- 存档版本（迁移机制） ----------
  // 每次发布含破坏性存档改动的版本，SAVE_VERSION +1 并在迁移链里追加一步变换；
  // 读取端（loadNum/loadFlag/loadDex）全部带默认值，因此未知字段天然兼容。
  var SAVE_VERSION = 1;
  function migrateSave() {
    var ver = parseInt(MG.platform.get('mg_ver'), 10);
    if (isNaN(ver)) ver = 0;
    if (ver > SAVE_VERSION) return; // 更高版本存档（回滚到旧客户端）：原样保留，只读不写降级字段
    // ---- 迁移链（从 ver 逐级升到 SAVE_VERSION） ----
    // v0 → v1：v0 时代键名与当前一致（mg_best/mg_peak/mg_life/mg_dex/mg_mute/mg_tut/mg_ng…），
    //          无字段变换，仅补打版本标记，legacy 存档天然兼容。
    // if (ver < 2) { ...未来变换... }
    MG.platform.set('mg_ver', String(SAVE_VERSION));
  }
  migrateSave(); // 必须先于 systems.js 的任何读档执行（core 在 systems 之前加载）


  // ---------- 音效（WebAudio 合成，无素材文件） ----------
  // ★ v197 音频拆三开关（用户："游戏内这个地方改成设置按钮，用来弹出设置音效、音乐和震动"）：
  //   sfxOn   音效（复用旧静音键 mg_mute：旧值 1=静音 → sfxOn = 旧值反读，向后兼容老存档）
  //   musicOn 音乐（新键 mg_music；存档缺失时继承旧 mute 的反值——曾全局静音的用户
  //            升级后不会突然开唱）
  //   vibOn   震动（新键 mg_vib 默认开；经 hap() 走 MG.platform.vibrate，不支持时静默）
  var audio = {
    ctx: null,
    sfxOn: !loadFlag('mg_mute'),
    musicOn: (function () { var v = MG.platform.get('mg_music'); return v == null ? !loadFlag('mg_mute') : v === '1'; })(),
    vibOn: (function () { var v = MG.platform.get('mg_vib'); return v == null ? true : v === '1'; })(),
    ensure: function () {
      var self = this;
      if (!this.ctx) {
        try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {}
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        try { this.ctx.resume(); } catch (e) {}
        // 部分内嵌 WebView 需要手势结束后再恢复一次
        if (!this._retry) {
          this._retry = true;
          setTimeout(function () {
            try { if (self.ctx && self.ctx.state === 'suspended') self.ctx.resume(); } catch (e) {}
          }, 250);
        }
      }
      if (this.ctx && this.musicOn) this.bgm.start();
    },
    blip: function (freq, dur, type, vol, slide) {
      if (!this.sfxOn || !this.ctx) return;
      try {
        var t0 = this.ctx.currentTime;
        var osc = this.ctx.createOscillator(), gn = this.ctx.createGain();
        osc.type = type || 'sine';
        osc.frequency.setValueAtTime(freq, t0);
        if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq * slide), t0 + dur);
        gn.gain.setValueAtTime(vol || 0.15, t0);
        gn.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
        osc.connect(gn); gn.connect(this.ctx.destination);
        osc.start(t0); osc.stop(t0 + dur + 0.02);
      } catch (e) {}
    },
    drop: function () { this.blip(320, 0.08, 'triangle', 0.12, 0.6); hap(15); },
    pop: function (tier) { this.blip(480 + tier * 45, 0.14, 'sine', 0.18, 1.6); hap(20); },
    big: function () { this.blip(200, 0.45, 'sine', 0.22, 2.4); hap(45); },
    swirl: function () { this.blip(220, 0.5, 'sine', 0.12, 2.8); hap(25); },
    freeze: function () { this.blip(1250, 0.09, 'sine', 0.12, 1.1); hap(15); },
    thaw: function () { this.blip(700, 0.18, 'sine', 0.10, 1.5); hap(15); },
    over: function () { this.blip(300, 0.5, 'sawtooth', 0.10, 0.3); hap(80); },
    quest: function () {
      if (!this.sfxOn) return;
      this.blip(660, 0.10, 'sine', 0.14, 1.2);
      var self = this;
      setTimeout(function () { self.blip(880, 0.16, 'sine', 0.14, 1.2); }, 90);
      hap(20);
    },
    tide: function () {
      if (!this.sfxOn || !this.ctx) return;
      // 涨潮：低频上滑长音
      this.blip(110, 0.9, 'sine', 0.14, 2.2);
      this.blip(165, 0.7, 'triangle', 0.07, 2.0);
      hap(40);
    }
  };

  // ---------- 震动反馈（v197 设置弹窗"震动"开关；v198 用户纠正语义） ----------
  // ★ v198 用户："震动不是震动窗口，是手机设备的震动反馈！！！"——本函数只走
  //   MG.platform.vibrate（H5: navigator.vibrate；微信: wx-shim 桥 wx.vibrateShort/
  //   vibrateLong），全程不碰画布变换；画面摇晃（addShake → render translate 微抖）
  //   是另一套独立视觉特效，与震动开关无任何关联。
  // 音效/音乐/震动三开关相互独立：震动只认 vibOn，与静音状态无关。
  function hap(ms) { if (audio.vibOn) MG.platform.vibrate(ms || 20); }

  // ---------- 背景音乐（深海氛围：母线低通呼吸 + 双振荡器暖垫 + 五声琶音 + 水底涌动噪声 + 水滴点缀） ----------
  audio.bgm = {
    on: false, iv: null, step: 0, _live: [], _flt: null, _masterGain: null, _lfo: null, _amb: null,
    chords: [
      [261.63, 329.63, 392.00, 493.88], // Cmaj7
      [220.00, 261.63, 329.63, 392.00], // Am7
      [174.61, 220.00, 261.63, 349.23], // Fmaj7
      [196.00, 246.94, 293.66, 392.00]  // G7
    ],
    arps: [ // 各和弦的琶音点缀音池（高八度五声/和弦音）
      [523.25, 659.25, 783.99, 1046.50],
      [440.00, 523.25, 659.25, 880.00],
      [523.25, 698.46, 880.00],
      [587.33, 783.99, 987.77]
    ],
    // 母线：低通(缓慢呼吸扫频) + 总增益，所有 BGM 声部都汇入这里，音色整体"水下感"
    master: function () {
      var c = audio.ctx;
      if (this._flt) return this._flt;
      var f = c.createBiquadFilter();
      f.type = 'lowpass'; f.frequency.value = 1150; f.Q.value = 0.5;
      var lfo = c.createOscillator(), lg = c.createGain();
      lfo.type = 'sine'; lfo.frequency.value = 0.05; lg.gain.value = 240;
      lfo.connect(lg); lg.connect(f.frequency); lfo.start();
      var g = c.createGain(); g.gain.value = 0.9;
      f.connect(g); g.connect(c.destination);
      this._flt = f; this._masterGain = g; this._lfo = lfo;
      return f;
    },
    // 水底涌动：布朗噪声循环 + 低通 + 慢速 swell（一次性创建，stop 时整体停掉）
    ambience: function () {
      var c = audio.ctx;
      if (this._amb) return;
      var len = Math.floor(c.sampleRate * 3);
      var buf = c.createBuffer(1, len, c.sampleRate);
      var d = buf.getChannelData(0), last = 0, i;
      for (i = 0; i < len; i++) {
        var w = Math.random() * 2 - 1;
        last = (last + 0.02 * w) / 1.02;
        d[i] = last * 3.2;
      }
      var src = c.createBufferSource(); src.buffer = buf; src.loop = true;
      var f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 400;
      var g = c.createGain(); g.gain.value = 0.045;
      var lfo = c.createOscillator(), lg = c.createGain();
      lfo.type = 'sine'; lfo.frequency.value = 0.08; lg.gain.value = 0.022;
      lfo.connect(lg); lg.connect(g.gain);
      src.connect(f); f.connect(g); g.connect(this.master());
      src.start(); lfo.start();
      this._amb = { src: src, lfo: lfo };
    },
    start: function () {
      if (this.on || !audio.musicOn || !audio.ctx) return;
      this.on = true;
      this.master(); this.ambience();
      var self = this;
      var playBar = function () {
        try {
          var c = audio.ctx, t0 = c.currentTime, dst = self.master();
          var ch = self.chords[self.step % self.chords.length];
          var arp = self.arps[self.step % self.arps.length];
          var i, k;
          // 暖垫：每个和弦音两个微失谐正弦（合唱质感），尾音与下小节头交叉淡化 → 无缝循环
          for (i = 0; i < ch.length; i++) {
            for (k = 0; k < 2; k++) {
              var o = c.createOscillator(), g = c.createGain();
              o.type = 'sine'; o.frequency.value = ch[i] * (k ? 1.0022 : 0.9978);
              g.gain.setValueAtTime(0.0001, t0);
              g.gain.linearRampToValueAtTime(0.014, t0 + 1.6);
              g.gain.setValueAtTime(0.014, t0 + 2.6);
              g.gain.linearRampToValueAtTime(0.0001, t0 + 4.15);
              o.connect(g); g.connect(dst);
              o.start(t0); o.stop(t0 + 4.2);
              self._live.push({ o: o, g: g });
            }
          }
          // 低音铺底
          var b = c.createOscillator(), bg = c.createGain();
          b.type = 'triangle'; b.frequency.value = ch[0] / 2;
          bg.gain.setValueAtTime(0.0001, t0);
          bg.gain.linearRampToValueAtTime(0.038, t0 + 1.2);
          bg.gain.setValueAtTime(0.038, t0 + 2.4);
          bg.gain.linearRampToValueAtTime(0.0001, t0 + 4.05);
          b.connect(bg); bg.connect(dst);
          b.start(t0); b.stop(t0 + 4.1);
          self._live.push({ o: b, g: bg });
          // 五声琶音点缀（随机 3~5 个短音，落在小节内随机位置）
          // 声音反馈：连击越高琶音整体升调（每连击约 +60 音分，上限 6 连击）
          var lift = Math.pow(2, Math.min(combo, 6) / 20);
          var n = 3 + (Math.random() * 3 | 0);
          for (i = 0; i < n; i++) {
            var at = t0 + 0.4 + Math.random() * 3.0;
            var fq = arp[(Math.random() * arp.length) | 0] * lift;
            var a = c.createOscillator(), ag = c.createGain();
            a.type = 'sine'; a.frequency.value = fq;
            ag.gain.setValueAtTime(0.0001, at);
            ag.gain.linearRampToValueAtTime(0.016, at + 0.04);
            ag.gain.exponentialRampToValueAtTime(0.0001, at + 1.1);
            a.connect(ag); ag.connect(dst);
            a.start(at); a.stop(at + 1.15);
            self._live.push({ o: a, g: ag });
          }
          // 水滴滑音（低概率，柔和）
          if (Math.random() < 0.4) {
            var dl = 0.8 + Math.random() * 2.2, f0 = 900 + Math.random() * 700;
            var p = c.createOscillator(), pg = c.createGain();
            p.type = 'sine';
            p.frequency.setValueAtTime(f0, t0 + dl);
            p.frequency.exponentialRampToValueAtTime(f0 * 1.6, t0 + dl + 0.12);
            pg.gain.setValueAtTime(0.0001, t0 + dl);
            pg.gain.linearRampToValueAtTime(0.013, t0 + dl + 0.02);
            pg.gain.exponentialRampToValueAtTime(0.0001, t0 + dl + 0.5);
            p.connect(pg); pg.connect(dst);
            p.start(t0 + dl); p.stop(t0 + dl + 0.55);
            self._live.push({ o: p, g: pg });
          }
        } catch (e) {}
        if (self._live.length > 90) self._live.splice(0, self._live.length - 90);
        self.step++;
      };
      playBar();
      this.iv = setInterval(playBar, 4000);
    },
    // 声音预警①：危险度 0~1 → 母线低通收紧（水堆越贴近警戒线，音色越闷越紧）
    setDanger: function (x) {
      if (!audio.ctx || !this._flt || !audio.musicOn) return;
      try { this._flt.frequency.setTargetAtTime(1150 - x * 480, audio.ctx.currentTime, 0.5); } catch (e) {}
    },
    // 声音预警②：潮汐低频隆隆（progress 渐入，预警期脉冲）
    setTide: function (progress, warn) {
      if (!audio.ctx || !audio.musicOn) return;
      try {
        if (!this._drone) {
          var c = audio.ctx;
          var o = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter();
          o.type = 'sine'; o.frequency.value = 48;
          f.type = 'lowpass'; f.frequency.value = 120;
          g.gain.value = 0.0001;
          o.connect(f); f.connect(g); g.connect(this.master());
          o.start();
          this._drone = { o: o, g: g };
        }
        var target = Math.max(progress * 0.055, warn ? 0.02 : 0);
        this._drone.g.gain.setTargetAtTime(target, audio.ctx.currentTime, 0.8);
      } catch (e) {}
    },
    stop: function () {
      if (this.iv) clearInterval(this.iv);
      this.iv = null; this.on = false;
      // 立即静音所有已排程音符（否则最后一个小节还会余音最多 4 秒）
      try {
        var t = audio.ctx ? audio.ctx.currentTime : 0;
        for (var i = 0; i < this._live.length; i++) {
          try {
            var n = this._live[i];
            n.g.gain.cancelScheduledValues(0);
            n.g.gain.setValueAtTime(0.0001, t);
            n.o.stop(t + 0.03);
          } catch (e) {}
        }
      } catch (e) {}
      this._live = [];
      // 涌动噪声一并停掉（下次 start 重建）
      try { if (this._amb) { this._amb.src.stop(); this._amb.lfo.stop(); } } catch (e) {}
      this._amb = null;
      // 潮汐低频隆隆一并停掉（下次 setTide 重建）
      try { if (this._drone) { this._drone.o.stop(); this._drone = null; } } catch (e) {}
    }
  };

  // v327：广告占位（ads / adOverlay）已移除——先不做广告

;
// ===== js/systems.js =====
// 水滴合成深海 - systems：游戏状态 / 输入 / 合成 / 技能 / 潮汐 / 海域事件 / 图鉴数据 / 主更新
// 模块加载顺序 2/4（依赖 core.js：canvas、audio、存储助手）。顶层 var 初始化
// （rollTier 等）调用的函数与本文件同域提升，或来自已加载的 core.js。
// 水滴合成深海 - 游戏主逻辑
// 输入 / 合成 / 技能 / 图鉴 / 海域 / 特殊水滴(漩涡·雨云·冰晶) / 潮汐 / 任务链 / 渲染 / 音效 / 广告占位
// 全部 UI 画在 canvas 内（含按钮命中判定），便于后续原样移植到微信小游戏（无 DOM 环境）
  // ---------- 状态 ----------
  var phys = new MG.Physics();
  var state = 'menu'; // 开机先停在开始界面（主流小游戏设计：标题 + 开始按钮）
  var menuStartBtn = { x: C.W / 2 - MG.layout.menu.startW / 2, y: MG.layout.menu.startY, w: MG.layout.menu.startW, h: MG.layout.menu.startH }; // 「开始游戏」主按钮（x 随 startW 居中）
  // v237 主页↔游戏水域扫屏过渡：dir 'in'=入局 / 'out'=回主页，t0 起始时刻（performance.now 时钟，与 segAnims 同策略），
  // dur 时长；渲染层 drawRippleReveal 消费（涟漪揭幕：圆外旧画面快照、圆内新场景），过渡期内输入屏蔽。
  // sx/sy = 涟漪起点（内容层逻辑坐标，渲染层统一 +BX/+renderOy 转屏幕），由触发点传入。
  var menuTrans = { dir: null, t0: -9, dur: 1.1, sx: 0, sy: 0, snap: null };
  // 统一入口：dir 'in'=主页→游戏 / 'out'=游戏→主页；cx/cy = 涟漪圆心（内容层坐标）
  function startTransition(dir, cx, cy) {
    menuTrans.dir = dir;
    menuTrans.t0 = performance.now() / 1000;
    menuTrans.sx = cx; menuTrans.sy = cy;
    menuTrans.snap = null; // 渲染层首帧开头截取旧画面
  }
  // 主页功能磁贴（v234b：左二右二）——成就殿堂各项独立成钮（页签 0成就/1每日/2榜单 直达）。
  // 图鉴/分享磁贴按用户要求暂撤；命中几何唯一真源 layout.menuTileRect，图标/标签由渲染层画。
  var menuTiles = [
    { side: 'L', i: 0, icon: '📋', label: '每日任务', act: function () { achOpen = true; dexOpen = false; dexTab = 1; } },
    { side: 'L', i: 1, icon: '🎯', label: '每日挑战', act: function () { achOpen = true; dexOpen = false; dexTab = 2; } },
    { side: 'R', i: 0, icon: '🏆', label: '成就', act: function () { achOpen = true; dexOpen = false; dexTab = 0; achScroll = 0; } },
    { side: 'R', i: 1, icon: '🥇', label: '榜单', act: function () { achOpen = true; dexOpen = false; dexTab = 3; } }
  ];
  for (var mti = 0; mti < menuTiles.length; mti++) menuTiles[mti].pressT = 0;
  // ---------- 道具解锁（v316）：对应「符文」首次出现即永久解锁 ----------
  // 解锁条件 = 该技能的符文滴在预览里出现过一次（rollRune 滚出即记录，mg_rune 跨刷新持久）；
  // 未出现前道具保持锁定：底部钮显示挂锁，点击仅提示。充能（符文合成 / 大宝箱 / 图鉴里程碑）
  // 不受锁影响——解锁前照常累积，解锁后即可用。替换旧版"累计分解锁"（C.skillUnlock 已删）。
  // ★ 本块必须在下方首次 rollRune()（next-drop 初始化）之前求值——seeRune 要写 runeSeen。
  var runeSeen = (function () {
    var d = MG.platform.getJSON('mg_rune', null) || {}, out = {}, i;
    for (i = 0; i < C.skills.length; i++) out[C.skills[i].key] = !!d[C.skills[i].key];
    return out;
  })();
  function saveRuneSeen() { MG.platform.setJSON('mg_rune', runeSeen); }
  function seeRune(key) {
    if (!key || runeSeen[key]) return;
    runeSeen[key] = 1;
    saveRuneSeen();
  }
  var score = 0, displayScore = 0, scoreBump = 0;
  var best = 0; // 刷新页面即重新计，不跨刷新保留
  var nextTier = rollTier();
  var nextSpecial, nextRune, nextIron;
  rollNextDrop();
  var runeHintShown = false; // 符文玩法一次性提示
  var aimX = C.W / 2;
  var aiming = false;
  var cooldown = 0;
  var combo = 0, comboTimer = 0, maxCombo = 0;
  var doubled = false; // 结算双倍（v161 起去广告门，直接双倍）
  var reviveCount = 0; // 本局复活次数（v328 恢复：直接复活，无广告；先不做广告）
  var popups = [], parts = [];
  var rippleQueue = []; // 待发的涟漪次波 { t, x, y }
  var time = 0;
  var overButtons = [];
  var shakeT = 0, shakeAmp = 0;
  var dangerAlert = 0; // 越线判定进度 0..1（checkDanger 每帧写入，警戒线渲染读取）
  var dangerRemain = 0; // 越线死亡缓冲剩余秒数（drawDangerText 倒计时用，v328）

  var skillCharge = { swap: 0, ripple: 0, evap: 0, flow: 0 };
  // 大宝箱（无尽模式）：定期沉入一只，限时点击开启随机奖励
  var chest = null;
  var chestTimer = 45 + Math.random() * 25; // v343：宝箱出现间隔拉长（原 26+20rand），降低出现频率
  var questStaleT = 4; // 滞留任务检查计时
  // 随机深海事件（无尽模式）：涌泉 / 甘霖 / 漩涡风暴
  var seaEvent = { timer: 24 + Math.random() * 14, type: null, t: 0, t0: 6, x: 0, y: 0, data: null };
  var rippleMode = false; // 涟漪选位模式：点击画布指定波纹中心
  var flowMode = false;   // 水流模式：点选两枚水滴交换位置（布局型道具）
  var flowPick = null;    // 水流模式已选中的第一枚水滴
  var dexLoaded = loadDex();
  var dexUnlocked = dexLoaded.u;
  var dexCounts = dexLoaded.c;
  var dexSpecial = dexLoaded.sp;   // 特殊水滴发现记录 { vortex:1, iron:1, ... }
  // 生涯最高累计分（跨刷新持久）：图鉴"已抵达"按它判定——发现过的收集永不回退；
  // 本局玩法（背景海域/特殊滴池/潮位）仍按会话内 totalScore 重新潜入，两者各司其职
  var careerPeak = parseFloat(MG.platform.get('mg_peak')) || 0;
  var dexTab = 0;                  // 成就殿堂视图（v241 拆分）：0=成就 1=每日任务 2=每日挑战 3=榜单
  var achScroll = 0;               // v243 成就列表滚动量（单列超出一屏，拖拽/滚轮滚动）
  var achDrag = null;              // 成就列表拖拽中 { y, s0 }
  var dexSelSp = -1;               // 图鉴页当前选中的特殊滴说明（-1=未选）
  var dexSec = 0;                  // 图鉴主页分节：0=合成链 1=海域演进（特殊滴槽位并入海域行）
  var dexSelTier = -1;             // 选中的合成链档位（-1 未选）
  var dexSelStage = -1;            // 选中的海域阶段（-1 未选）
  // 跨局终身统计（成就进度用）：大宝箱/涨潮/礁石对/彩虹合成/任务/连击/单局最高分
  var lifeStats = (function () {
    var d = { chest: 0, tide: 0, ironPair: 0, rainbow: 0, quest: 0, combo: 0, best: 0 };
    var s = dexLoaded.stats || {};
    for (var k in d) if (typeof s[k] === 'number' && s[k] > d[k]) d[k] = s[k];
    return d;
  })();
  var achDone = dexLoaded.ach;     // 已达成成就 { id: 1 }
  var colClaimed = dexLoaded.col;  // 图鉴收集里程碑领取记录 { m25:1, m50:1, ... }
  // ---------- 离线收益：按离开时长结算（开局自动入账，走普通过分管线可联动图鉴/收集） ----------
  var offlineGain = (function () {
    var seen = parseInt(MG.platform.get('mg_seen')) || 0;
    var now = Date.now();
    saveNum('mg_seen', now);   // 启动即刷新心跳
    if (!seen) return null;    // 首次游玩无收益
    var rawMins = Math.floor((now - seen) / 60000);
    if (rawMins < C.offline.minMins) return null; // 太短不触发（防刷新页面反复白嫖）
    var mins = Math.min(rawMins, C.offline.capMins);
    var anchor = Math.max(parseInt(MG.platform.get('mg_best')) || 0, lifeStats.best || 0);
    var perMin = C.offline.perMinBase + Math.floor(anchor * C.offline.bestRatio);
    return { mins: rawMins, gain: perMin * mins };
  })();
  var seenTick = 0; // 游玩期心跳计时（30s 刷 mg_seen，防“玩数小时后关页”把旧 seen 算成长离线）
  function bumpStat(k, n) {
    lifeStats[k] = (lifeStats[k] || 0) + (n || 1);
    saveDex();
    checkAchievements();
  }
  var seaCount = 0;
  var scoreMult = 1;
  var evapMode = false;
  var rainHint = 0;
  var dexOpen = false;
  var achOpen = false; // 成就页（成就/每日/榜单）——与图鉴拆分为两个独立入口
  var lastPointer = { x: -100, y: -100 };

  var quest = null, questDepth = 0;

  // 关卡状态：1 = 限时得分关（低难度），2 = 无尽模式（礁石/潮汐齐全，计时改为累计进行时长）
  var levelElapsed = 0;                                  // 本局已进行时长（顶部计时显示用）
  var lifeScore = 0, runCounted = 0; // 累计分（图鉴门槛用）：刷新页面即重新计，不跨刷新保留
  function totalScore() { return lifeScore + (score - runCounted); }

  // 潮汐状态
  var tide = { phase: 'idle', timer: C.tide.cycleInterval, progress: 0, banner: 0 }; // v315：首潮倒计时直接用潮汐间隔（用户："首次涨潮倒计时也用潮汐间隔的时间"）
  var achTick = 0; // 成就周期检查计时
  // 无尽模式渐进加压：随时长线性到满（潮汐更频/礁石更多/投放向高级倾斜）
  var endlessT = 0, rampStage = 0;
  var climaxMark = 0; // 高潮时刻：上次触发时的分数标记
  var tideKillHint = false; // 潮汐可致死（浮起越线判负）：一次性提示
  // 首局主动引导：前 5 投分步提示（只出现一次，localStorage 标记）
  var dropCount = 0, tutDone = loadFlag('mg_tut');
  var TUT_STEPS = [
    '按住屏幕左右拖动瞄准，松手投下水滴',
    '低级水滴先垫底，给大水滴留空间',
    '相同水滴碰到一起就会合成升级',
    '水堆漫过警戒线并停住就输了——留意上方白线',
    '合成带符文的水滴，可为底部对应技能充能' // v344：原"攒满符文即可点亮"是 cost=1 前的旧措辞，已作废
  ];
  function endlessRamp() {
    return Math.min(1, endlessT / (C.ramp.minutes * 60));
  }
  // 成就永续加成查询（勋章变成长线）
  function perkOn(id) { return !!achDone[id]; }
  function perkMult() { return (achDone.tide12 && tide.progress > 0.2) ? 1.1 : 1; }
  // 数值封顶：所有乘区叠乘后总倍率不超过 C.multCap（防成就/海域加成叠乘导致分数膨胀）
  // v281：词缀不再提供得分倍率收益（用户：倍率太高），只保留难度增益
  // v357：礁石税——每块**在场**礁石削弱全局收益（用户："在场即扣分"）。旧设计里礁石躺在场上
  // 毫无代价，玩家可以无限期不管；现在拖着不管 = 收益持续变差，逼你主动清除。
  // 作用面 = 一切走 cm() 的收益（合成 / 彩虹 / 相消 / 图鉴里程碑 / 任务 / 每日挑战奖励）。
  var ironN = 0; // v369：在场礁石数缓存（每帧由 update 起点 ironCount() 重算；reefTax/updateReefHint 读此值，消除每分/每帧重复 O(n) 扫描）
  function reefTax() {
    var n = ironN;
    if (n <= 0) return 1;
    return Math.max(1 - C.iron.taxMax, 1 - C.iron.taxPer * n);
  }
  function cm(m) { return Math.min(m * reefTax(), C.multCap); }

  // 技能渐进解锁：按累计得分逐个点亮（换滴开局即有，涟漪/蒸发/水流递进）
  // v316：解锁判定 = 对应符文已出现（runeSeen，mg_rune 持久）——替代旧版累计分门槛
  function skillUnlocked(key) { return !!runeSeen[key]; }

  // ---------- 二周目「深渊潜航」（免门槛：带词缀的高危高收益无尽局，经菜单「每日挑战」进入） ----------
  var ng = { unlocked: true, active: null };  // v341：免 5 万解锁门槛，直接进入（入口见菜单「每日挑战」）
  var ngOpen = false, ngPicks = [];   // 词缀三选一弹窗
  var ngPickRects = [];               // 三张词缀卡的命中区（draw 时填充）
  var GRAV0 = C.gravity;              // 基准重力（词缀局按倍率改写，重开恢复）
  function ngStartRun(affix, fromDaily) {
    restart();                         // restart→ngEndRun 会清 active/fromDaily/gravity，故下方重设
    ng.active = affix;                 // v369：删掉 restart 前的冗余赋值（会被 ngEndRun 清掉）
    ng.fromDaily = !!fromDaily;
    C.gravity = GRAV0 * (affix.grav || 1);
    addPopup(C.W / 2, 300, (fromDaily ? '每日挑战 ·「' : '深渊潜航 ·「') + affix.name + '」', true, 0, 0, 'world'); // v331：挑战开局公告归 world（词缀名如"重压深潜"不含事件关键词）
    ngOpen = false;
  }
  function ngEndRun() {
    if (!ng.active) return;
    ng.active = null;
    ng.fromDaily = false;
    C.gravity = GRAV0;
  }
  // 词缀三选一：从词缀池随机抽 3 张
  function openNgPick() {
    var pool = C.ng.affixes.slice(), picks = [];
    while (picks.length < 3 && pool.length) picks.push(pool.splice((Math.random() * pool.length) | 0, 1)[0]);
    ngPicks = picks;
    ngPickRects = [];
    ngOpen = true;
    audio.blip(460, 0.12, 'sine', 0.08, 0.6);
  }

  // 海域演进：累计分跨过里程碑改变世界（背景色调随阶段加深 + 称号）
  var stageSeen = -1; // 已提示过的阶段（会话内）
  var seaFade = null; // 海域换色渐变 { from, to, t, dur }：跨里程碑时背景平滑过渡而非跳变
  function seaStage() {
    var s = 0, ts = totalScore();
    for (var i = C.seaStages.length - 1; i >= 0; i--) { if (ts >= C.seaStages[i].at) { s = i; break; } }
    return s;
  }
  // 渲染层查询当前换色进度：进行中返回 { from, to, k }（k 为缓动后的插值系数），静止返回 null
  function seaBlend() {
    if (!seaFade) return null;
    var p = seaFade.t / seaFade.dur;
    if (p >= 1) return null;
    p = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; // easeInOutQuad
    return { from: seaFade.from, to: seaFade.to, k: p };
  }
  // v355：挑战完成度 = 当前分数在「到达最深海域所需分组」中的位置（唯一真源，渲染层直接调用）。
  // 语义：8 个海域分组把全程均分成 n-1 档（每跨过一个海域 +1 档），**档内再按分数线性插值**——
  // 不再像 v277 那样只在跨档瞬间跳变一整档（旧式：卡在 71% 整局不动，跨过 10 万才跳到 86%）。
  // 到达最深海域（累计分 ≥ C.seaStages[last].at）= 100%，即任务完成。分数取与 seaStage 同源的
  // 累计分 totalScore()（决定海域的是累计分，不是单局分）。
  function seaProgress() {
    var n = C.seaStages.length, last = n - 1, ts = totalScore();
    if (ts >= C.seaStages[last].at) return 1;
    var i = 0;
    for (var k = last - 1; k >= 0; k--) { if (ts >= C.seaStages[k].at) { i = k; break; } }
    var lo = C.seaStages[i].at, hi = C.seaStages[i + 1].at;
    var f = hi > lo ? (ts - lo) / (hi - lo) : 0;
    return Math.max(0, Math.min(1, (i + f) / last));
  }

  // ---------- 每日任务（按日期种子生成，跨局累计；全完成涨连续天数） ----------
  function todayStr() {
    var d = new Date();
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  }
  function yesterdayStr() {
    var d = new Date(); d.setDate(d.getDate() - 1);
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  }
  function dateSeed(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = (h * 16777619) >>> 0; }
    return h >>> 0;
  }
  function mulberry(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function loadDaily() { return MG.platform.getJSON('mg_daily', null); }
  function saveDaily() { MG.platform.setJSON('mg_daily', daily); }
  function buildDailyTasks(date, rnd, streakNow) {
    // 难度随连续天数递进（1x → 3x），星数标记难度，奖励同步分级
    // v246：任务 3 → 5（合成 / 连击 + 大宝箱 / 涨潮 / 礁石三项全给，附加项随机排序）
    // v285：再次整体上调（用户："难度还是太低了，要进一步提高"）——合成 11~17→16~22、
    // 连击 5~8→7~11、大宝箱/礁石 2→3（封顶 4）、涨潮 3→4
    var f = 1 + Math.min(2, (streakNow || 0) * 0.34);
    var stars = f < 1.5 ? 1 : (f < 2.5 ? 2 : 3);
    var mn = function (v) { return Math.max(1, Math.round(v * f)); };
    var t1 = { type: 'merge', tier: 1 + Math.floor(rnd() * 3), need: mn(16 + Math.floor(rnd() * 7)), stars: stars };
    t1.text = '合成 ' + t1.need + ' 个「' + T[t1.tier].name + '」';
    var t2 = { type: 'combo', need: mn(7 + Math.floor(rnd() * 5)), stars: stars };
    t2.text = '达成 ' + t2.need + ' 连击';
    var extras = [
      { type: 'chest', need: Math.min(4, mn(3)), text: '开启大宝箱' },
      { type: 'tide',  need: mn(4), text: '经历涨潮' },
      { type: 'iron',  need: Math.min(4, mn(3)), text: '消除礁石' }
    ];
    for (var i = extras.length - 1; i > 0; i--) { // 洗牌
      var j = Math.floor(rnd() * (i + 1)), tmp = extras[i]; extras[i] = extras[j]; extras[j] = tmp;
    }
    var tasks = [t1, t2];
    for (var e = 0; e < extras.length; e++) {
      var t = { type: extras[e].type, need: extras[e].need, stars: stars };
      t.text = extras[e].text + ' ×' + t.need;
      tasks.push(t);
    }
    return tasks;
  }
  var daily = (function () {
    var d = loadDaily(), today = todayStr();
    // ver 不符（任务数量/结构/数值变更）也强制重建当日任务——v285 任务数值再上调，ver 3→4
    if (!d || d.ver !== 4 || d.date !== today) {
      var streak = (d && d.date === yesterdayStr()) ? (d.streak || 0) : 0; // 断签清零
      var rnd = mulberry(dateSeed(today));
      var fresh = { ver: 4, date: today, streak: streak, streakToday: false, tasks: buildDailyTasks(today, rnd, streak), prog: [0, 0, 0, 0, 0], done: [false, false, false, false, false], allDone: false };
      saveDailyFresh(fresh);
      return fresh;
    }
    return d;
  })();
  function saveDailyFresh(d) { MG.platform.setJSON('mg_daily', d); }
  function dailyProgress(type, tier, n) {
    for (var i = 0; i < daily.tasks.length; i++) {
      var t = daily.tasks[i];
      if (daily.done[i] || t.type !== type) continue;
      if (type === 'merge' && t.tier !== tier) continue;
      if (type === 'combo') daily.prog[i] = Math.min(t.need, Math.max(daily.prog[i], n || 0)); // 连击取峰值
      else daily.prog[i] = Math.min(t.need, daily.prog[i] + (n || 1));
      if (daily.prog[i] >= t.need) {
        daily.done[i] = true;
        // 奖励随任务难度星数分级（★ ×1 · ★★ ×1.5 · ★★★ ×2）
        var gain = Math.round(C.daily.rewardScore * (1 + ((t.stars || 1) - 1) * 0.5) * scoreMult);
        score += gain;
        scoreBump = 0.35;
        addPopup(C.W / 2, 205, '每日任务完成 +' + gain, true, 0);
        audio.quest();
      }
    }
    // 全部完成 → 连续天数 +1（每天只涨一次）+ 天数奖励（v246：随任务数量泛化，不再写死三项）
    var allOk = daily.tasks.length > 0;
    for (var ai = 0; ai < daily.tasks.length; ai++) if (!daily.done[ai]) { allOk = false; break; }
    if (!daily.allDone && allOk) {
      daily.allDone = true;
      if (!daily.streakToday) { daily.streakToday = true; daily.streak++; }
      var bonus = C.daily.streakBase + daily.streak * C.daily.streakStep;
      score += bonus;
      scoreBump = 0.4;
      // v345：移除「每日全勤」顺带送的符文充能（原 addCharge(pk.key,2)）——它本是分数/连击奖励，
      // 却额外发符文，属"非符文滴获取符文"的来源之一；现只保留分数奖励本身
      addPopup(C.W / 2, 232, '今日全勤！连续 ' + daily.streak + ' 天 +' + bonus, true, 0);
      parts.push({ type: 'ring', x: C.W / 2, y: annY(232), r: 30, life: 0.7, max: 0.7, color: '#F5C542' });
      audio.quest();
    }
    saveDaily();
  }

  // ---------- 每日挑战（每天一局全服同规则的词缀挑战局：达到目标分即完成） ----------
  // 复用「深渊潜航」词缀管线（重力/潮汐/暗礁/冰冻/倍率全部已实现），另配两条更凶的每日专属词缀；
  // 完成状态持久化（mg_dchal），连续完成天数递增奖励；进行中的挑战局不持久化（刷新即丢，可重试）
  var DCHAL_AFFIXES = [
    { id: 'heavy',   name: '重压深潜', desc: '重力 +80%',              grav: 1.8 },   // v285：词缀再加重（用户：难度还是太低）；v328：+60%→+80%（用户："重压深潜（重力 +80%）"）
    { id: 'storm',   name: '疾风骤雨', desc: '潮汐间隔 -65%',          tideInt: 0.35 },
    { id: 'reef',    name: '暗礁密布', desc: '礁石概率 ×4',          ironX: 4 },
    { id: 'frost',   name: '寒冰速冻', desc: '水滴 35% 落水即冻',      ice: 0.35 },
    { id: 'abyss',   name: '深渊试炼', desc: '重力 +40% · 潮汐更频且潮期涌动加剧',  grav: 1.4, tideInt: 0.35, tideToss: 1.9 },  // v339：原"潮汐 -65%"在正常局实为增益（潮水托离警戒线+潮期引信×2更安全），改为真减益——潮期浮力×1.9涌动更猛、靠近警戒线时潮期也是真危险。v368 越线缓冲统一 3s 后 tideNoGrace 机制已移除（v369 删字段，三处"无宽限"描述同步清除）
    { id: 'icereef', name: '冰礁交错', desc: '暗礁 ×5 且 45% 落水即冻', ironX: 5, ice: 0.45 }
  ];
  var dchal = (function () {
    var d = MG.platform.getJSON('mg_dchal', null) || {};
    // v278：counts = 各词缀历史完成次数（跨天保留）
    if (d.date !== todayStr()) d = { date: todayStr(), done: false, streak: d.streak || 0, lastDate: d.lastDate || null, counts: d.counts || {} };
    if (!d.counts) d.counts = {};
    return d;
  })();
  function saveChal() { MG.platform.setJSON('mg_dchal', dchal); }
  var dchalRun = null; // 本局挑战参数 { goal }（仅运行期）
  function dayChalIdx() {
    // v243 深渊潜航每日轮换：按本地日期序号轮转，每天开放一个词缀（不再随机抽取）
    var d = new Date();
    return Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 864e5) % DCHAL_AFFIXES.length;
  }
  function dchalRoll() {
    var affix = DCHAL_AFFIXES[dayChalIdx()];
    var goal = Math.max(C.dailyChal.goalMin, Math.ceil((lifeStats.best || 3000) * C.dailyChal.goalBestRatio / 100) * 100);
    return { affix: affix, goal: goal, idx: dayChalIdx() };
  }
  function dchalStart() {
    if (state !== 'menu' && state !== 'over') return; // 对局中不可发起（防误触清空当前局面）
    var roll = dchalRoll();
    dchalRun = { goal: roll.goal, affixId: roll.affix.id }; // v278：记录词缀 id，完成后累加 counts
    ngStartRun(roll.affix, true);
    achOpen = false;
    // v245：与主页「开始游戏」同款涟漪揭幕（圆心 = 开始挑战按钮中心）
    var br = dchalBtnRect();
    startTransition('in', br.x + br.w / 2, br.y + br.h / 2);
  }
  // 面板/HUD 读取的挑战态（panels/render 经全局解析调用）
  // v243：list = 深渊潜航全部词缀（每天轮换开放一个），todayIdx = 今日开放的下标
  function dchalInfo() {
    var roll = dchalRoll(), list = [];
    for (var i = 0; i < DCHAL_AFFIXES.length; i++) {
      list.push({
        id: DCHAL_AFFIXES[i].id,
        name: DCHAL_AFFIXES[i].name, desc: DCHAL_AFFIXES[i].desc,
        count: (dchal.counts && dchal.counts[DCHAL_AFFIXES[i].id]) || 0, // v278：历史完成次数
        today: i === roll.idx, done: i === roll.idx && dchal.done
      });
    }
    return {
      name: roll.affix.name, desc: roll.affix.desc, goal: roll.goal,
      done: dchal.done, streak: dchal.streak || 0,
      canStart: state === 'menu' || state === 'over',
      running: !!(ng.active && ng.fromDaily && dchalRun),
      list: list, todayIdx: roll.idx
    };
  }
  // dchalHud() 已移除（v196）：HUD 统计精简为"最高/最远海域"后无调用方（原仅 drawHUD 用）
  function checkDailyChallenge() {
    if (!ng.active || !ng.fromDaily || !dchalRun) return;
    if (dchal.date !== todayStr()) { dchal.date = todayStr(); dchal.done = false; saveChal(); } // 跨天兜底（长时间挂机）
    if (dchal.done) return; // 今日已完成：可继续玩但不重复发奖
    if (score < dchalRun.goal) return;
    dchal.done = true;
    dchal.streak = (dchal.lastDate === yesterdayStr()) ? (dchal.streak || 0) + 1 : 1;
    dchal.lastDate = todayStr();
    // v278：该词缀历史完成次数 +1（挑战页签列表展示"已完成 N 次"）
    dchal.counts[dchalRun.affixId] = (dchal.counts[dchalRun.affixId] || 0) + 1;
    var gain = Math.round(Math.min(C.dailyChal.rewardMax, C.dailyChal.rewardBase + (dchal.streak - 1) * C.dailyChal.rewardStep) * cm(scoreMult));
    score += gain;
    scoreBump = 0.5;
    if (score > best) { best = score; saveNum('mg_best', best); }
    var pk = C.skills[(Math.random() * C.skills.length) | 0];
    addCharge(pk.key, C.dailyChal.charge);
    addPopup(C.W / 2, 205, '每日挑战达成！+' + gain, true, 0);
    addPopup(C.W / 2, 232, '连续 ' + dchal.streak + ' 天 ·「' + pk.name + '」充能 +' + C.dailyChal.charge, false, 0);
    parts.push({ type: 'ring', x: C.W / 2, y: annY(205), r: 30, life: 0.7, max: 0.7, color: '#F5C542' });
    audio.quest();
    saveChal();
  }

  // ---------- 好友榜（本地模拟榜：预留微信 wx 接口位，上线后替换数据源） ----------
  var friends = (function () {
    var list = MG.platform.getJSON('mg_friends', null);
    if (!list) {
      var names = ['海风酱', '泡泡鱼', '深蓝船长', '浪里格', '珊瑚酱', '夜航星'];
      var rnd = mulberry(dateSeed('friends-v1'));
      list = [];
      for (var i = 0; i < names.length; i++) list.push({ name: names[i], base: Math.floor(300 + rnd() * 4200) });
      MG.platform.setJSON('mg_friends', list);
    }
    return list;
  })();
  function friendBoard() {
    // 好友分随日期轻微浮动（模拟活跃），我方取历史最佳
    var rnd = mulberry(dateSeed(todayStr()) ^ 0x5f5f);
    var rows = [];
    for (var i = 0; i < friends.length; i++) {
      rows.push({ name: friends[i].name, score: Math.max(0, Math.round(friends[i].base * (0.9 + rnd() * 0.25))), me: false });
    }
    rows.push({ name: '我', score: best, me: true });
    rows.sort(function (a, b) { return b.score - a.score; });
    return rows;
  }

  // ---------- 战报分享（卡片式预览；上线后在此接 wx.shareAppMessage） ----------
  var shareOpen = false, shareText = '';
  function buildShareText() {
    return '【水滴合成深海】我在' + C.seaStages[seaStage()].name + '拿下 ' + score + ' 分！' +
      (maxCombo > 1 ? '最高 ' + maxCombo + ' 连击，' : '') +
      (seaCount > 0 ? '沧海汇入海域 ×' + seaCount + '，' : '') +
      '最佳 ' + best + '。来和我比比谁潜得更深！';
  }
  function openShare() {
    shareText = buildShareText();
    shareOpen = true;
    // 上线接微信小游戏时此处调用：
    // wx.shareAppMessage({ title: shareText, imageUrl: canvas 截图 })
  }
  function copyShareText() {
    var ok = false;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(shareText);
        ok = true;
      } else {
        var ta = document.createElement('textarea');
        ta.value = shareText;
        document.body.appendChild(ta);
        ta.select();
        ok = document.execCommand('copy');
        document.body.removeChild(ta);
      }
    } catch (e) { ok = false; }
    addPopup(C.W / 2, 300, ok ? '文案已复制，去粘贴给好友吧' : '复制失败：长按文案手动复制', true, 0);
    audio.blip(ok ? 760 : 300, 0.15, 'sine', 0.1, 1);
  }

  // v348：横向均匀播种——第 i 个（共 n 个）元素落在第 i 条等宽竖带内（带内抖动保留自然感），
  // 取代旧版 Math.random() * LW 的纯随机：元素数量少时纯随机会整片聚在一侧（用户：
  // "左边元素比右边多"）。循环重生（气泡冒顶/闪粒出屏/水母升顶）也走它，
  // 保证任何时刻都均匀铺满全屏，不会越跑越聚。数量同时随屏宽放大，宽屏两侧不再因
  // 密度不足而显得空。
  function bandX(i, n, pad) {
    var w = LW / n, p = pad || 0;
    var x = (i + 0.5) * w + (Math.random() - 0.5) * w * 0.8;
    return Math.min(LW - p, Math.max(p, x));
  }
  // 数量随屏宽：以块宽 C.W 为密度基准，宽屏同密度铺满（上界防超宽屏过量）
  function scaleN(base, cap) { return Math.min(cap, Math.max(base, Math.round(base * LW / C.W))); }

  // 背景气泡
  var bubbles = [];
  var BUB_N = scaleN(14, 30);
  for (var bi = 0; bi < BUB_N; bi++) {
    bubbles.push({
      x: bandX(bi, BUB_N, 4), y: Math.random() * VH,
      r: 1.5 + Math.random() * 3.5, sp: 12 + Math.random() * 22,
      sway: Math.random() * Math.PI * 2
    });
  }

  // 远景鱼群：按海域分化体色/体型/泳速（每片海域有自己的鱼），换海域时旧鱼慢慢淡出、新鱼慢慢淡入
  var fishes = [];
  // 各海域鱼群外观：tint/tintD 体色（亮/暗）、s 尺寸范围、sp 泳速范围
  var FISH_LOOK = [
    { tint: '158,206,228', tintD: '66,120,168', s: [6, 12],  sp: [26, 56] }, // 潮汐池：浅水银蓝小鱼
    { tint: '122,214,182', tintD: '34,132,110', s: [6, 12],  sp: [28, 58] }, // 珊瑚浅海：青绿雀鲷
    { tint: '96,164,232',  tintD: '30,88,168',  s: [8, 14],  sp: [34, 66] }, // 蔚蓝深海：群游蓝鱼
    { tint: '116,124,214', tintD: '52,56,140',  s: [5, 9],   sp: [18, 40] }, // 午夜深渊：暗紫灯笼鱼（小而慢）
    { tint: '196,212,238', tintD: '110,130,168', s: [10, 16], sp: [22, 44] }, // 月光环礁：银月鱼（大而缓）
    { tint: '92,112,182',  tintD: '36,48,110',  s: [7, 12],  sp: [30, 62] }, // 海沟之眼：深蓝窄影
    { tint: '226,142,96',  tintD: '150,62,36',  s: [8, 13],  sp: [30, 60] }, // 热泉裂谷：暖橙耐热鱼
    { tint: '184,146,236', tintD: '96,62,168',  s: [6, 12],  sp: [24, 50] }  // 深渊王座：幽紫发光鱼
  ];
  function fishLook() { return FISH_LOOK[Math.min(seaStage(), FISH_LOOK.length - 1)]; }
  function resetFish(f, keepDir) {
    var lk = fishLook();
    f.stg = seaStage();
    // v346：keepDir=true 时保留原游动方向（屏幕环绕用）；仅换海域重生才随机方向
    f.dir = keepDir ? f.dir : (Math.random() < 0.5 ? 1 : -1);
    f.x = f.dir > 0 ? -70 : LW + 70;
    f.y = 110 + Math.random() * Math.max(240, VH - 220);
    f.sp = lk.sp[0] + Math.random() * (lk.sp[1] - lk.sp[0]);
    f.s = lk.s[0] + Math.random() * (lk.s[1] - lk.s[0]);
    f.tint = lk.tint; f.tintD = lk.tintD;
    f.wob = Math.random() * Math.PI * 2;
  }
  // v346：鱼数随屏宽自适应（宽屏更密、分布更均匀，缓解"左右不均"观感）；窄屏保底 5 条
  var FISH_N = Math.max(5, Math.round(LW / 170));
  for (var fi = 0; fi < FISH_N; fi++) {
    var nf = { tail: 0, dir: 1, x: 0, y: 0, sp: 0, s: 0, wob: 0, fade: 0, stg: 0, tint: '', tintD: '' };
    resetFish(nf);
    nf.x = bandX(fi, FISH_N, 0); // v348：开局按条带均匀铺开（原 rand*LW 少量样本会聚一侧）
    nf.fade = 1; // 开局即在场的鱼不做淡入
    fishes.push(nf);
  }

  // 水母
  var jellies = [];
  var JELLY_N = Math.min(4, Math.max(2, Math.round(LW / 300))); // v348：2 只样本太少，瞬时必然偏一侧
  for (var ji = 0; ji < JELLY_N; ji++) {
    jellies.push({
      x: bandX(ji, JELLY_N, 50), // v347：水母画在全屏背景层（无 BX 偏移），旧版按 C.W 会开局全挤在左侧
      y: 240 + (ji * 170) % Math.max(200, VH - 320), // v348：多只时纵向错落且不越界
      s: 13 + Math.random() * 9,
      ph: Math.random() * Math.PI * 2,
      drift: 4 + Math.random() * 5,
      tint: (ji % 2) === 0 ? '255,175,205' : '185,160,255'
    });
  }

  // 微光闪粒
  var glitters = [];
  var GLI_N = scaleN(22, 46);
  for (var gi = 0; gi < GLI_N; gi++) {
    glitters.push({
      x: bandX(gi, GLI_N, 2), y: Math.random() * VH,
      r: 0.8 + Math.random() * 1.5,
      ph: Math.random() * Math.PI * 2, sp: 1.5 + Math.random() * 2.5
    });
  }

  // 海草已按用户要求移除

  function rollTier() {
    // 渐进加压：投放权重随无尽时长向高级演进（线性插值到 spawnWeightsMax）
    // 投放门槛：累计分未达 spawnGate 的档位不参与投放（达标前静默过滤，不提示数值）
    var rp = endlessRamp(), ws = [], total = 0, i;
    for (i = 0; i < C.spawnWeights.length; i++) {
      if (C.spawnGate && C.spawnGate[i] && totalScore() < C.spawnGate[i]) { ws.push(0); continue; }
      var w = C.spawnWeights[i] + (C.ramp.spawnWeightsMax[i] - C.spawnWeights[i]) * rp;
      ws.push(w); total += w;
    }
    if (total <= 0) return 0;
    var r = Math.random() * total;
    for (i = 0; i < ws.length; i++) { r -= ws[i]; if (r <= 0 && ws[i] > 0) return i; }
    for (i = ws.length - 1; i >= 0; i--) if (ws[i] > 0) return i;
    return 0;
  }
  function rollSpecial() {
    // v354：海域越靠后 → ①特殊滴整体越频繁（specialChance → specialChanceMax 按海域线性插值）
    //                    ②"该海域对应"的特殊滴权重越高（解锁海域越深，权重 ×(1+boost×stage)）
    var cur = seaStage(), nSea = C.seaStages.length;
    var sf = nSea > 1 ? cur / (nSea - 1) : 0;
    var chance = C.specialChance + (C.specialChanceMax - C.specialChance) * sf;
    if (Math.random() >= chance) return null;
    // 与海域绑定：未抵达对应海域的特殊滴静默过滤（越深的海，特殊滴越多越强）
    var pool = [['vortex', 30], ['cloud', 24], ['ice', 20], ['rainbow', 14], ['gale', 12],
      ['magnet', 10], ['spring', 10], ['thunder', 9], ['pearl', 9],
      ['magma', 8], ['geyser', 8], ['void', 6], ['aurora', 6]];
    var keys = [], ws2 = [], total = 0, i;
    var boost = C.specialStageBoost || 0;
    for (i = 0; i < pool.length; i++) {
      var stg = (C.specialStage && C.specialStage[pool[i][0]]) || 0;
      if (cur < stg) continue;
      var w = pool[i][1] * (1 + boost * stg);
      keys.push(pool[i][0]); ws2.push(w); total += w;
    }
    if (!keys.length) return null;
    var r = Math.random() * total;
    for (i = 0; i < keys.length; i++) { r -= ws2[i]; if (r <= 0) return keys[i]; }
    return keys[keys.length - 1];
  }
  function rollIron() {
    if (seaStage() < ((C.specialStage && C.specialStage.iron != null) ? C.specialStage.iron : 0)) return false; // 珊瑚浅海起才落礁石（注意 0 是合法门槛，不能写 || 兜底）
    if (seaEvent && seaEvent.type === 'storm') return false; // 保底：风暴期间不再落礁石，避免双重失控
    if (ironCount() >= C.iron.maxActive) return false; // 场上已满员：预览不再出礁石，避免落下时被迫转成水滴
    var ch = C.iron.chance + (C.ramp.ironChanceMax - C.iron.chance) * endlessRamp();
    if (ng && ng.active && ng.active.ironX) ch *= ng.active.ironX; // 二周目「暗礁密布」
    return Math.random() < ch;
  } // 礁石概率随渐进加压提升
  // 符文：普通水滴随机附带的道具属性，合成时为对应技能充能
  // v316：① 池子不再按 skillUnlocked 过滤——未解锁技能的符文正是解锁来源（旧过滤下永远解锁不了）；
  //       ② 滚出即 seeRune 记录"已出现"→ 对应道具解锁（预览可见即生效，mg_rune 持久）。
  //       调用方须保证只在"这一滴确实带符文"时调用（礁石/特殊滴占位不滚，见 rollNextDrop）。
  function rollRune() {
    // v340：符文首现海域以配置为准——必须显式判断 number，否则 specialStage.rune=0 会被 `|| 2`
    // 当成 falsy 退回 2（蔚蓝深海），与图鉴 SP_DEFS rune.stage(=0 潮汐池) 不一致（用户核对发现）
    var runeStage = (C.specialStage && typeof C.specialStage.rune === 'number') ? C.specialStage.rune : 2;
    if (seaStage() < runeStage) return null; // 抵达配置海域才带符文（与图鉴一致）
    if (Math.random() >= C.rune.chance) return null;
    var keys = [], ws = [], total = 0, k;
    for (k in C.rune.weights) {
      if (!C.rune.weights.hasOwnProperty(k)) continue;
      keys.push(k); ws.push(C.rune.weights[k]); total += C.rune.weights[k];
    }
    if (!keys.length) return null;
    var r = Math.random() * total, pick = keys[keys.length - 1];
    for (k = 0; k < keys.length; k++) { r -= ws[k]; if (r <= 0) { pick = keys[k]; break; } }
    seeRune(pick); // 符文在预览中出现 → 对应道具解锁（持久）
    return pick;
  }
  // 下一滴预览三连滚（v316 合并原 4 处重复写法：初始化 / 每次投放后 / 换滴 / 重开）：
  // 特殊滴 → 礁石 → 符文。礁石/特殊滴占位的滴不带符文——预览所见即所得，
  // 也保证 rollRune（内含 seeRune 解锁）只在符文真正会出现时被调用。
  function rollNextDrop() {
    nextSpecial = rollSpecial();
    nextIron = rollIron();
    nextRune = (!nextSpecial && !nextIron) ? rollRune() : null;
  }
  function runeName(key) {
    for (var i = 0; i < C.skills.length; i++) if (C.skills[i].key === key) return C.skills[i].name;
    return '';
  }
  function runeColor(key) {
    return key === 'swap' ? '#8E6FC0' : (key === 'ripple' ? '#2FA8A0' : (key === 'evap' ? '#E2705E' : '#3FA8B8'));
  }
  function ironCount() {
    var n = 0;
    for (var i = 0; i < phys.bodies.length; i++) if (phys.bodies[i].iron) n++;
    return n;
  }
  function createIron(x, y) {
    discoverSpecial('iron');
    var b = phys.create(x, y, 0, 0, 0);
    b.iron = true;
    b.tier = -1;
    b.r = C.iron.r;                                    // v365：半径恒定（"在场生长"已按用户要求移除）
    b.m = C.iron.r * C.iron.r * C.iron.massMult;     // 大质量 → 下落时把水滴挤开（砸穿效果）
    b.hp = C.iron.hp; b.hpMax = C.iron.hp;           // v372：接触磨蚀耐久（落地堆叠/故意落子即可磨穿，给玩家清礁石的正向出口）
    return b;
  }
  // 礁石税提示（v357）：收益惩罚必须让玩家看见（否则分数莫名变少）——数量变化时才提示，
  // 且 1 块不报（太平凡）。v365：生长机制移除后，这个计数提示独立成函数仍在主循环调用。
  var reefCountPrev = 0;       // 上一帧在场礁石数（只在数量变化时提示，避免刷屏）
  var ironGateHintT = -9;      // v366：礁石潮汐闸门提示的上次时刻（5 秒节流，防刷屏）
  function updateReefHint() {
    var n = ironN;
    if (n === reefCountPrev) return;
    if (n >= 2) addPopup(C.W / 2, C.dangerY + 24, '礁石 ×' + n + ' · 全局收益 −' + Math.round((1 - reefTax()) * 100) + '%', false, 0);
    else if (n === 0 && reefCountPrev >= 2) addPopup(C.W / 2, C.dangerY + 24, '礁石清空 · 收益恢复', false, 0);
    reefCountPrev = n;
  }
  // v372：礁石可控出口——水滴与礁石接触即缓慢磨蚀，磨穿后碎裂移除并小幅加分，
  // 给玩家"用落子清礁石"的正向手段（此前礁石纯负面，只能靠涨潮/蒸发被动清除）。
  function updateReefErode(dt) {
    if (ironN === 0) return; // 无礁石不扫描
    var bs = phys.bodies, i, j, b, o, dx, dy, d;
    for (i = 0; i < bs.length; i++) {
      b = bs[i];
      if (!b.iron || b.hp == null) continue;
      var touching = false;
      for (j = 0; j < bs.length; j++) {
        if (j === i) continue;
        o = bs[j];
        if (o.iron || o.chest || o.special) continue; // 礁石/宝箱/特殊滴不计入接触
        dx = o.x - b.x; dy = o.y - b.y;
        d = Math.sqrt(dx * dx + dy * dy);
        if (d < (b.r + o.r) * 0.98) { touching = true; break; } // 接近相切即算接触（堆叠静置必然触发）
      }
      if (!touching) continue;
      b.hp -= dt; // 持续接触才磨蚀，快速穿过不掉血
      if (b.hp > 0) continue;
      var gain = Math.round(C.iron.erodeScore * cm(scoreMult));
      score += gain; scoreBump = 0.25;
      if (score > best) { best = score; saveNum('mg_best', best); }
      dailyProgress('iron'); // 计入"消除礁石"每日任务（与蒸发/涨潮相消口径统一）
      addPopup(b.x, b.y - b.r - 8, '礁石磨碎 · +' + gain, false, 0, 1.4, 'todo');
      for (var k = 0; k < 8; k++) {
        var ang = Math.random() * Math.PI * 2, sp = 40 + Math.random() * 90;
        parts.push({ type: 'dot', x: b.x, y: b.y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
          r: 1.5 + Math.random() * 2, life: 0.5, max: 0.5, color: '#9FB0BC' });
      }
      audio.freeze(); // 碎裂短音（复用冻结音，清脆不突兀）
      phys.remove(b);
    }
  }
  function specialLabel(sp) {
    var i = spIndexByKey(sp);
    return i >= 0 ? SP_DEFS[i].name : sp;
  }
  function specialColor(sp) {
    var i = spIndexByKey(sp);
    return i >= 0 ? SP_DEFS[i].color : '#4A5FC8';
  }

  function clampAim(x) {
    var r = nextIron ? C.iron.r : T[nextTier].r;
    var lo = C.wall + r + 2, hi = C.W - C.wall - r - 2;
    return Math.max(lo, Math.min(hi, x));
  }

  // 场上数量最多的一级（限可投放范围、排除特殊滴与冻结滴），用于甘霖馈赠
  function mostCommonTier() {
    var counts = {}, i, b;
    for (i = 0; i < phys.bodies.length; i++) {
      b = phys.bodies[i];
      if (b.special || b.frozen > 0 || b.iron) continue;
      counts[b.tier] = (counts[b.tier] || 0) + 1;
    }
    var bestT = -1, bestN = 0;
    for (i = 0; i < T.length; i++) {
      if (counts[i] && counts[i] > bestN) { bestN = counts[i]; bestT = i; }
    }
    return bestT;
  }

  // ---------- 特效 ----------
  function burst(x, y, tier, isBig) {
    var t = T[tier];
    parts.push({ type: 'ring', x: x, y: y, r: t.r * 0.6, life: 0.35, max: 0.35, color: t.color });
    var n = isBig ? 14 : 7;
    for (var i = 0; i < n; i++) {
      var ang = Math.random() * Math.PI * 2, sp = 60 + Math.random() * (isBig ? 220 : 140);
      var L = 0.5 + Math.random() * 0.3;
      parts.push({ type: 'dot', x: x, y: y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 40,
        r: 1.5 + Math.random() * 3, life: L, max: L, color: Math.random() < 0.4 ? '#FFFFFF' : t.color });
    }
  }
  // 合成吸附粒子：从四周螺旋汇入合成点
  function suckIn(x, y, tier) {
    var r = T[tier].r + 18;
    for (var i = 0; i < 6; i++) {
      var ang = (i / 6) * Math.PI * 2 + Math.random() * 0.5;
      parts.push({ type: 'suck',
        x: x + Math.cos(ang) * r, y: y + Math.sin(ang) * r,
        tx: x, ty: y, r: 2.5, life: 0.28, max: 0.28, color: '#FFFFFF' });
    }
  }
  // 公告类特效锚定（v192）：设计稿 y（保留相对 209 的偏移让多条弹字错开）→ 镜像到
  // 警戒线下方的弹字带 mirrorCy = dangerY + 出生通道（出生区相对警戒线的镜像对称位，v190）。
  // addPopup 的文本映射与伴随 ring 粒子共用此换算——v190 只迁移了文本，7 处公告 ring
  // 遗留 9:16 旧稿坐标（y=150 三处落进 HUD 信息条 hudBottom=165、环与文字分离），
  // 自此公告类特效一律经 annY 派生，禁止再写死旧坐标。
  function annY(y) { return MG.layout.body.mirrorCy + (y - 209); }
  // v331：提示分色 7 类（用户确认方案，交互示例 test/popup_kinds_demo.html）：
  //   gain    金   — 得分微反馈（+N / 连击后缀）
  //   burst   紫   — 效果生效高光（特殊滴 / 大招 / 稀有合成）
  //   world   深青 — 海域与潮汐推进（演进 / 渐深 / 深海事件 / 挑战开局）
  //   reward  绿   — 奖励与里程碑（图鉴 / 成就 / 任务 / 宝箱 / 复活 / 充能）
  //   todo    琥珀 — 行动提醒（点宝箱 / 预告 / 教程）
  //   miss    暗红 — 落空与错失
  //   neutral 蓝灰 — 操作反馈回执（默认兜底）
  // 规则序已对全部调用点逐一核对（miss→todo→neutral→world→burst→gain→reward）；
  // 调用方仍可显式传 kind 覆盖（宝箱/todo、词缀/world、符文教程/todo）。
  function inferKind(t) {
    if (/落空|黯淡|枯了|熄灭|空空如也|沉入深渊|复制失败/.test(t)) return 'miss';
    if (/点它开启|甘霖 · 下一滴|需在潮汐中|带符文的水滴/.test(t)) return 'todo';
    if (/^换滴$|水流交换|符文 \d|出现后解锁|已复制/.test(t)) return 'neutral';
    if (/海域演进|海域渐深|潮位渐深|每日挑战 ·|深渊潜航 ·|深海涌泉|漩涡风暴|海神甘霖/.test(t)) return 'world';
    if (/彩虹合成|雷霆引合|珍珠祝福|虚空吞噬|熔岩灼烧|极光庇护|海神恩泽|汇入海域|海潮高潮|礁石相消|疾风|雨云化雨|甘霖降临|冰封|间歇泉/.test(t)) return 'burst';
    if (/^\+|礁石移除/.test(t)) return 'gain';
    if (/图鉴|成就|任务|全勤|挑战达成|大宝箱开启|复活|离线|解锁|充能|充满|符文|富豪|收益|收集|发现/.test(t)) return 'reward';
    return 'neutral';
  }
  function addPopup(x, y, text, isBig, mult, life, kind, attach) {
    // 公告带（居中 + 设计稿 y 180~320）锚定堆叠区镜像位（v190 用户："弹出提示（如涨潮等），
    // 要默认出现在出生区相对于警戒线在堆叠区中的镜像对称位置"）：基准 =
    // layout.body.mirrorCy = dangerY + 出生通道（出生区相对警戒线镜像到警戒线下方），
    // 保留设计稿相对 209 的偏移让多条弹字错开
    if (x === C.W / 2 && y >= 180 && y <= 320) y = annY(y);
    // 防重叠：与仍在显示中的弹字同带（横向接近）时顺移一行，多条同时弹出不再叠字。
    // ★ v326：顺移不得进入底部道具带（用户："有些（提示）则会出现在底部道具区域，
    //   这是不合理的"）——原逻辑只向下顺移，底部连发的微反馈（+分数/移除/合成）
    //   会层层 cascading 涌进六钮区（btnCy-btnR=floorY+10）。改为"贴冲突方跳一行"：
    //   冲突方在上且其下一行仍在容器底之上时下行，否则上行；一步到位收敛（不再
    //   固定 +30 反复往返）。上限 = 容器底 floorY：弹字绘制在实体层之上，压滴不
    //   挡字；底部道具带则一律不占。
    // ★ v356：字号越大优先级越高（用户："提示词，字体越大，应当优先级越高，即显示越靠上，
    //   越不容易被遮挡"）——冲突时**小字让位、大字占住上方原位**：新弹字是大字而冲突方是
    //   小字时，把小字往下顶一行（仍夹在容器底之上）；小字无处可下时大字再往上让一行。
    //   反向（新弹字是小字）仍走 v326 原规则，绝不挤走大字。
    var popMaxY = MG.layout.body.floorY;
    for (var i = 0; i < popups.length; i++) {
      var op = popups[i];
      if (op.life > 0.35 && Math.abs(op.x - x) < 220) {
        while (Math.abs(op.y - y) < 28) {
          if (isBig && !op.big && op.y + 30 <= popMaxY) op.y += 30;  // 小字让位下行，大字占上方
          else if (op.y < y && op.y + 30 <= popMaxY) y = op.y + 30;
          else y = op.y - 30;
        }
      }
    }
    if (y > popMaxY) y = popMaxY; // 双重保险：锚点本身落在道具带内也夹回带上
    // v325：弹字时长参数化——原一律 life=1.0s，而渲染 alpha=life/max×1.5 ⇒ 前 1/3
    // 时长（0.33s）后就开始淡出，海神恩泽/深海事件/成就等公告一闪而过看不清
    // （用户："有些提示信息出现的太短了，比如海神恩泽等，出现时间要稍微长一点！
    // 请梳理一下类似的提示并做出优化！"）。大字号公告默认 2.0s（不透明段 1.33s，
    // 4 倍于原可读时间）；+分数/技能短标签等微反馈仍 1.0s；个别重要小字提示
    // （甘霖预告/符文教程/越线冲走/任务更新/宝箱错过）显式传 life 延长。
    var lf = life || (isBig ? 2.0 : 1.0);
    var p = { x: x, y: y, text: text, life: lf, max: lf, big: !!isBig, mult: mult || 0, scale: 0.4, kind: kind || inferKind(text) };
    // 跟随实体（如大宝箱）：弹字贴着实体走，实体被移除即消失——避免"宝箱降落、文本上升"错位
    if (attach) { p.attach = attach; p.attachOff = { x: x - attach.x, y: y - attach.y }; }
    popups.push(p);
  }
  function addShake(amp, dur) {
    shakeAmp = Math.max(shakeAmp, amp);
    shakeT = Math.max(shakeT, dur);
  }
  function updateFx(dt) {
    var i, p;
    // v351：以下三个队列统一改「正序 write-index 原地压缩」——旧版倒序 splice 每删一个都要搬移
    // 其后全部元素（O(n)），粒子/弹字密集时整段退化成 O(n²)；压缩版一趟 O(n)、零搬移、保序。
    // 涟漪次波（延迟到达的第二推）
    var rqw = 0;
    for (i = 0; i < rippleQueue.length; i++) {
      var rq = rippleQueue[i];
      rq.t -= dt;
      if (rq.t <= 0) {
        applyRipplePush(rq.x, rq.y, C.ripple.secondPower);
        parts.push({ type: 'ring', x: rq.x, y: rq.y, r: 46, life: 0.5, max: 0.5, color: '#A8DDF5' });
      } else rippleQueue[rqw++] = rq;
    }
    rippleQueue.length = rqw;

    var pw = 0;
    for (i = 0; i < parts.length; i++) {
      p = parts[i];
      p.life -= dt;
      if (p.type === 'dot') { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 400 * dt; }
      else if (p.type === 'suck') {
        var k = Math.min(1, dt * 13);
        p.x += (p.tx - p.x) * k; p.y += (p.ty - p.y) * k;
      }
      if (p.life > 0) parts[pw++] = p;
    }
    parts.length = pw;

    var upw = 0;
    for (i = 0; i < popups.length; i++) {
      p = popups[i];
      var alive = true;
      if (p.attach) { // 跟随实体：贴着目标移动；目标已不在场上（宝箱开启/沉走）则移除
        if (phys.bodies.indexOf(p.attach) < 0) alive = false;
        else {
          p.x = p.attach.x + p.attachOff.x;
          p.y = p.attach.y + p.attachOff.y;
          p.life -= dt; // v340：跟随弹字也要走生命周期，否则大宝箱提示会一直贴着宝箱不消失
          if (p.scale < 1) p.scale = Math.min(1, p.scale + dt * 5);
          if (p.life <= 0) alive = false;
        }
      } else {
        p.life -= dt; p.y -= 28 * dt;
        if (p.scale < 1) p.scale = Math.min(1, p.scale + dt * 5);
        if (p.life <= 0) alive = false;
      }
      if (alive) popups[upw++] = p;
    }
    popups.length = upw;
    for (i = 0; i < bubbles.length; i++) {
      p = bubbles[i];
      p.y -= p.sp * dt;
      p.sway += dt;
      if (p.y < -8) { p.y = VH + 8; p.x = bandX(i, bubbles.length, 4); } // v348：重生也按条带
    }
    for (i = 0; i < fishes.length; i++) {
      var f = fishes[i];
      f.x += f.dir * f.sp * dt;
      f.y += Math.sin(time * 0.7 + f.wob) * 8 * dt;
      f.tail += dt * 9;
      // 海域切换：旧鱼 1.6s 缓慢淡出（边游边隐），淡尽后重生为本海域的鱼并 1.6s 淡入
      var curStg = seaStage();
      if (f.fade > 0 && f.stg !== curStg) f.fade -= dt / 1.6;
      else if (f.fade < 1) f.fade += dt / 1.6;
      if (f.fade <= 0) { f.fade = 0; resetFish(f); }
      if (f.fade > 1) f.fade = 1;
      // v346：平滑环绕——保留游动方向，游出一侧即从对侧同方向续游（不再瞬移+随机反向，
      // 修复"右侧消失后左侧倒着游回来、左右不均衡"的观感）；换海域淡出淡入仍走下方 resetFish(f)
      if (f.dir > 0 && f.x > LW + 70) resetFish(f, true);
      else if (f.dir < 0 && f.x < -70) resetFish(f, true);
    }
    for (i = 0; i < jellies.length; i++) {
      var jl = jellies[i];
      jl.y -= jl.drift * dt;
      jl.x += Math.sin(time * 0.5 + jl.ph) * 9 * dt;
      if (jl.y < 170) { jl.y = VH * 0.88; jl.x = bandX(i, jellies.length, 50); } // v348：重生也按条带
    }
    for (i = 0; i < glitters.length; i++) {
      var gl = glitters[i];
      gl.y -= gl.sp * dt;
      if (gl.y < -6) { gl.y = VH + 6; gl.x = bandX(i, glitters.length, 2); } // v348：重生也按条带
    }
    if (shakeT > 0) { shakeT -= dt; if (shakeT <= 0) shakeAmp = 0; }
    if (scoreBump > 0) scoreBump -= dt;
    // 按钮按压反馈计时
    if (bookBtn.pressT > 0) bookBtn.pressT -= dt;
    for (var mi = 0; mi < menuTiles.length; mi++) if (menuTiles[mi].pressT > 0) menuTiles[mi].pressT -= dt; // v233 主页磁贴按压回弹
    if (setBtn.pressT > 0) setBtn.pressT -= dt; // v197：设置钮（原奖杯×2/静音三处已移除）
    if (restartBtn.pressT > 0) restartBtn.pressT -= dt;
    for (i = 0; i < SKILL_BTNS.length; i++) if (SKILL_BTNS[i].pressT > 0) SKILL_BTNS[i].pressT -= dt;
  }

  // ---------- 图鉴 ----------
  // 解锁条件：合成出该级 + 跨局累计得分达到门槛（前 5 级无门槛）
  function unlockTier(t, px, py) {
    dexCounts[t] = (dexCounts[t] || 0) + 1;
    if (dexUnlocked[t]) return;
    if (totalScore() < (C.dexGate[t] || 0)) return; // 积分门槛未到
    dexUnlocked[t] = 1;
    var bonus = Math.round(T[t].score * C.dexBonusMult * scoreMult);
    score += bonus;
    scoreBump = 0.3;
    if (score > best) { best = score; saveNum('mg_best', best); }
    // 初始几档（无积分门槛）是开局常态，不再弹"图鉴解锁"提示，避免刷屏
    if (C.dexGate[t]) {
      addPopup(px === undefined ? C.W / 2 : px, py === undefined ? 240 : py,
        '图鉴解锁 · ' + T[t].name + ' +' + bonus, true, 0);
    }
    saveDex();
    checkCollection();
  }
  // 累计得分跨过门槛时补解锁（如先合出了高级、后攒够积分）
  function checkDexGates() {
    for (var t = 0; t < T.length; t++) {
      if (!dexUnlocked[t] && totalScore() >= (C.dexGate[t] || 0)) unlockTier(t);
    }
  }

  // ---------- 成就（常驻目标，跨局累计；达成后永久生效的加成见 perk） ----------
  // 成就难度分级：diff 1=★入门 2=★★进阶 3=★★★传说，奖励按难度递增
  var ACH_DEFS = [
    // v285：目标再上调一档（用户："难度还是太低了"）；desc 与 target 保持一致（已达成的成就保留不撤）
    { id: 'score2k',  name: '深海富豪', desc: '单局得分达到 65000',        target: 65000,  diff: 1, perk: '永续 · 开局充能 +1', cur: function () { return Math.max(score, best, lifeStats.best || 0); } }, // v350：perk 文案 +2→+1 与实际一致
    { id: 'combo6',   name: '连浪十叠', desc: '达成 10 连击',              target: 10,     diff: 1, perk: '永续 · 连击窗 +0.3s', cur: function () { return Math.max(maxCombo, lifeStats.combo || 0); } },
    { id: 'chest5',   name: '寻宝猎人', desc: '累计开启 25 只大宝箱',  target: 25,     diff: 1, perk: '永续 · 大宝箱奖励 +50%', cur: function () { return lifeStats.chest || 0; } },
    { id: 'tide12',   name: '弄潮儿',   desc: '经历 55 次涨潮',            target: 55,     diff: 2, perk: '永续 · 潮期得分 +10%', cur: function () { return lifeStats.tide || 0; } },
    { id: 'iron5',    name: '礁石克星', desc: '累计消除 28 对礁石',  target: 28,     diff: 2, perk: '永续 · 礁石相消 ×2', cur: function () { return lifeStats.ironPair || 0; } },
    { id: 'rainbow5', name: '虹光使者', desc: '触发 28 次彩虹合成',        target: 28,     diff: 2, perk: '永续 · 彩虹得分 +50%', cur: function () { return lifeStats.rainbow || 0; } },
    { id: 'quest12',  name: '任务大师', desc: '累计完成 60 个任务',        target: 60,     diff: 2, perk: '永续 · 任务奖励 +30%', cur: function () { return lifeStats.quest || 0; } },
    { id: 'canghai',  name: '沧海遗珠', desc: '合成出传说中的「沧海」',    target: 1,      diff: 2, perk: '永续 · 沧海汇入 +50%', cur: function () { return dexCounts[8] || 0; } },
    { id: 'canghai5', name: '沧海成群', desc: '累计合成 10 只「沧海」',    target: 10,     diff: 3, perk: '称号 · 沧海之主', cur: function () { return dexCounts[8] || 0; } },
    { id: 'combo12',  name: '惊涛十八叠', desc: '达成 18 连击',            target: 18,     diff: 3, perk: '称号 · 驭浪者', cur: function () { return Math.max(maxCombo, lifeStats.combo || 0); } },
    { id: 'score10w', name: '海渊传说', desc: '单局得分达到 200000',       target: 200000, diff: 3, perk: '称号 · 海渊传说', cur: function () { return Math.max(score, best, lifeStats.best || 0); } }
  ];
  function checkAchievements() {
    lifeStats.best = Math.max(lifeStats.best || 0, best, score);
    for (var i = 0; i < ACH_DEFS.length; i++) {
      var a = ACH_DEFS[i];
      if (achDone[a.id]) continue;
      if (a.cur() < a.target) continue;
      achDone[a.id] = 1;
      // 奖励按难度分级：★ +60/充能1 · ★★ +150/充能2 · ★★★ +400/充能4
      var d = a.diff || 1;
      var base = d === 3 ? 400 : (d === 2 ? 150 : 60);
      var gain = Math.round(base * cm(scoreMult));
      score += gain;
      scoreBump = 0.4;
      var pick = C.skills[(Math.random() * C.skills.length) | 0];
      // v350：成就充能 ★★★ 4→3（★/★★ 的 1/2 已是最低档，保持）
      addCharge(pick.key, d === 3 ? 3 : (d === 2 ? 2 : 1));
      addPopup(C.W / 2, 240, '成就达成 · ' + a.name + ' +' + gain, true, 0);
      addPopup(C.W / 2, 266, '「' + pick.name + '」充能 +' + (d === 3 ? 3 : (d === 2 ? 2 : 1)), false, 0);
      parts.push({ type: 'ring', x: C.W / 2, y: annY(150), r: 26, life: 0.6, max: 0.6, color: '#F5C542' });
      audio.quest();
      saveDex();
    }
  }

  // ---------- 特殊水滴图鉴（发现即点亮；与海域绑定：stage=解锁海域） ----------
  // 每片海域相对上一片恰好新增 2 种（潮汐池=符文滴+大宝箱，大宝箱在图鉴中单列）
  // v317 用户定版：符文滴→潮汐池、礁石(iron)→珊瑚浅海、漩涡滴→蔚蓝深海
  var SP_DEFS = [
    { key: 'vortex',  stage: 2, name: '漩涡滴', color: '#7B6FD0', desc: '吸附周围水滴后消散，聚拢散滴。' },
    { key: 'cloud',   stage: 1, name: '雨云滴', color: '#8FA8BC', desc: '分裂成两颗雾泡，补充低级滴。' },
    { key: 'iron',    stage: 1, name: '礁石', color: '#6E7B88', desc: '沉重障碍，仅涨潮可相消或蒸发（2 充能）移除；在场越多收益越低。' },
    { key: 'ice',     stage: 2, name: '冰晶滴', color: '#A8DFF2', desc: '冻结周围水滴，可当临时平台。' },
    { key: 'rune',    stage: 0, name: '符文滴', color: '#B08FD0', desc: '合成时为对应技能 +1 充能。' },
    { key: 'rainbow', stage: 3, name: '彩虹滴', color: '#E86FA8', desc: '使碰到的水滴跳 2 级，得分双倍。' },
    { key: 'gale',    stage: 3, name: '疾风滴', color: '#7FCDA4', desc: '刮起疾风吹开周围水滴。' },
    { key: 'magnet',  stage: 4, name: '磁石滴', color: '#6A8FD8', desc: '磁场漩涡聚拢大范围水滴。' },
    { key: 'spring',  stage: 4, name: '甘霖滴', color: '#8FD8B8', desc: '下一滴变成场上最多的档位。' },
    { key: 'thunder', stage: 5, name: '雷霆滴', color: '#F2C14E', desc: '引雷让一对同档水滴直接合成。' },
    { key: 'pearl',   stage: 5, name: '珍珠滴', color: '#F0E6D2', desc: '祝福最多的档位全体升 1 级。' },
    { key: 'magma',   stage: 6, name: '熔岩滴', color: '#E2703A', desc: '烧毁周围礁石与最低两档。' },
    { key: 'geyser',  stage: 6, name: '间歇泉滴', color: '#5FC8D8', desc: '向上喷出水柱，冲开上方水滴。' },
    { key: 'void',    stage: 7, name: '虚空滴', color: '#4A3A6A', desc: '吞噬最低档水滴至多 5 颗。' },
    { key: 'aurora',  stage: 7, name: '极光滴', color: '#9BE8D8', desc: '极光庇护：下次合成得分 ×3。' }
  ];
  function spIndexByKey(key) {
    for (var i = 0; i < SP_DEFS.length; i++) if (SP_DEFS[i].key === key) return i;
    return -1;
  }
  // 海域 → 图鉴两个槽位的 dexSelSp 索引（潮汐池槽 2 = 大宝箱虚拟位 SP_DEFS.length）
  var STAGE_SP_SLOTS = {};
  (function () {
    var per = {}, i;
    for (i = 0; i < SP_DEFS.length; i++) {
      var st = SP_DEFS[i].stage;
      (per[st] = per[st] || []).push(i);
    }
    for (var k in per) if (per.hasOwnProperty(k)) STAGE_SP_SLOTS[k] = [per[k][0], per[k][1]];
    STAGE_SP_SLOTS[0] = [spIndexByKey('rune'), SP_DEFS.length]; // v317：潮汐池 = 符文滴 + 大宝箱
  })();
  function discoverSpecial(sp) {
    if (dexSpecial[sp]) return;
    dexSpecial[sp] = 1;
    saveDex();
    var i = spIndexByKey(sp);
    addPopup(C.W / 2, 240, '图鉴新发现 · ' + (i >= 0 ? SP_DEFS[i].name : '大宝箱'), true, 0);
    if (i >= 0 && SP_DEFS[i].desc) { // v372：特殊滴首现追加一句话玩法说明（复用图鉴描述，2.8s 读全）
      addPopup(C.W / 2, C.dangerY + 30, (SP_DEFS[i].name + '：' + SP_DEFS[i].desc), false, 0, 2.8, 'todo');
    }
    checkCollection();
  }

  // ---------- 图鉴收集度（长线收集闭环：水滴 9 档 + 特殊形态 15 种 + 大宝箱 = 25 格） ----------
  // 达成率跨过里程碑即自动发放奖励（对齐成就奖励体系：积分 + 技能充能 + 宝箱贺礼）；
  // 领取记录持久化（mg_dex.col），老存档的既有收集会在下一局开始后 1 秒内自动补发
  var COL_MILESTONES = [
    { id: 'm25',  pct: 0.25, score: 500,  charge: 1, name: '收集 25%' },
    { id: 'm50',  pct: 0.5,  score: 1200, charge: 1, name: '收集 50%', chest: true },  // v350：2→1
    { id: 'm75',  pct: 0.75, score: 2500, charge: 2, name: '收集 75%', chest: true },  // v350：3→2
    { id: 'm100', pct: 1,    score: 6000, charge: 0, name: '集齐图鉴', allCharge: 1 }  // v350：全技能 2→1
  ];
  function colProgress() {
    var n = 0, t, k;
    for (t = 0; t < T.length; t++) if (dexUnlocked[t]) n++;
    for (k in dexSpecial) if (dexSpecial[k]) n++;
    return { n: n, total: T.length + SP_DEFS.length + 1 };
  }
  function checkCollection() {
    var cp = colProgress(), i;
    for (i = 0; i < COL_MILESTONES.length; i++) {
      var m = COL_MILESTONES[i];
      if (colClaimed[m.id]) continue;
      if (cp.n / cp.total < m.pct) continue;
      colClaimed[m.id] = 1;
      var gain = Math.round(m.score * cm(scoreMult));
      score += gain;
      scoreBump = 0.4;
      if (score > best) { best = score; saveNum('mg_best', best); }
      var sub = null, s;
      if (m.charge) {
        // v316：优先充已解锁技能；全部未解锁时兜底充任意技能（充能可预先累积，解锁即用）——
        // 旧版 filter 后 keys 可能为空（开局全锁），keys[random] 会写出 skillCharge[undefined]
        var keys = [];
        for (s = 0; s < C.skills.length; s++) if (skillUnlocked(C.skills[s].key)) keys.push(C.skills[s]);
        if (!keys.length) keys = C.skills.slice();
        if (keys.length) {
          var pick = keys[(Math.random() * keys.length) | 0];
          addCharge(pick.key, m.charge);
          sub = '「' + pick.name + '」充能 +' + m.charge;
        }
      }
      if (m.allCharge) {
        for (s = 0; s < C.skills.length; s++) addCharge(C.skills[s].key, m.allCharge);
        sub = '全技能充能 +' + m.allCharge;
      }
      addPopup(C.W / 2, 240, '图鉴收集达成 · ' + m.name + ' +' + gain, true, 0);
      if (sub) addPopup(C.W / 2, 266, sub, false, 0);
      if (m.id === 'm100') addPopup(C.W / 2, 292, '成就称号 · 深海博物学家', false, 0);
      if (m.chest && !chest && state === 'play') chestTimer = Math.min(chestTimer, 4); // 稍后沉一只大宝箱贺礼
      parts.push({ type: 'ring', x: C.W / 2, y: annY(150), r: 26, life: 0.6, max: 0.6, color: '#F5C542' });
      audio.quest();
      saveDex();
    }
  }

  // ---------- 任务链 ----------
  // 当前已解锁的最高水滴档（任务难度随进度缩放的基准）
  function questMaxTier() {
    var m = 0; // v371：默认 0（下游 makeQuest 已 Math.max(1,…) 夹住；无档解锁时语义才正确，不再误导为"tier1 已解锁"）
    for (var i = 0; i < T.length; i++) if (dexUnlocked[i]) m = i;
    return m;
  }
  function makeQuest(depth) {
    questDepth = depth;
    var mx = questMaxTier(); // 追随玩家进度：低分时出低档任务，深处出高档任务
    var roll = Math.random(), q;
    if (roll < 0.45) {
      q = { type: 'merge', tier: Math.max(1, mx - 1 - Math.floor(Math.random() * 2)), need: 3 + Math.min(depth, 4), have: 0 };
      q.text = '合成 ' + q.need + ' 个「' + T[q.tier].name + '」';
    } else if (roll < 0.75) {
      q = { type: 'combo', need: Math.min(3 + Math.floor(depth / 2), 6), have: 0 };
      q.text = '达成 ' + q.need + ' 连击';
    } else {
      q = { type: 'tier', tier: Math.min(T.length - 1, mx + 1), need: 1, have: 0 };
      q.text = '合成出「' + T[q.tier].name + '」';
    }
    q.rewardScore = C.questScoreBase + depth * C.questScoreStep;
    q.stars = Math.min(3, 1 + Math.floor(depth / 2)); // 难度星级随任务深度递进 1~3
    q.bornMax = mx; // 记录生成时的进度基准，用于滞留检测
    quest = q;
  }
  function questProgress(nt, comboN) {
    if (!quest) return;
    if (quest.type === 'merge' && nt === quest.tier) quest.have++;
    else if (quest.type === 'combo') quest.have = Math.max(quest.have, comboN);
    else if (quest.type === 'tier' && nt === quest.tier) quest.have = 1;
    if (quest.have >= quest.need) completeQuest();
  }
  function completeQuest() {
    var gain = Math.round(quest.rewardScore * cm(scoreMult * (perkOn('quest12') ? 1.3 : 1))); // 成就加成：任务大师；总倍率封顶
    score += gain;
    scoreBump = 0.35;
    bumpStat('quest');
    var pick = C.skills[Math.floor(Math.random() * C.skills.length)];
    addCharge(pick.key, pick.cost);
    addPopup(C.W / 2, 240, '任务完成 +' + gain, true, 0);
    addPopup(C.W / 2, 266, '「' + pick.name + '」已充满', false, 0);
    parts.push({ type: 'ring', x: C.W / 2, y: annY(150), r: 20, life: 0.5, max: 0.5, color: '#F5C542' });
    audio.quest();
    if (score > best) { best = score; saveNum('mg_best', best); }
    makeQuest(questDepth + 1);
  }

  // ---------- 合成 ----------
  function processMerges() {
    var bs = phys.bodies, used = {}, merges = [], rainbowPairs = [], i, j;
    // 彩虹滴：接触任意普通水滴 → 目标滴直接跳 2 级（趣味高光时刻，优先于普通合成）
    // v305：扫描与执行分离——原实现边遍历边 doRainbowMerge（内含 phys.remove 的 splice
    // 移位），同帧会漏检移位处的一个实体；改为标记收集、扫描完统一执行
    for (i = 0; i < bs.length; i++) {
      var rb = bs[i];
      if (used[rb.id] || rb.special !== 'rainbow' || rb.frozen > 0 || rb.iron) continue;
      for (j = 0; j < bs.length; j++) {
        var tb = bs[j];
        if (tb === rb || used[tb.id] || tb.special || tb.frozen > 0 || tb.iron) continue;
        var rdx = tb.x - rb.x, rdy = tb.y - rb.y;
        var rminD = rb.r + tb.r + 0.5;
        if (rdx * rdx + rdy * rdy <= rminD * rminD) {
          used[rb.id] = used[tb.id] = 1;
          rainbowPairs.push([rb, tb]);
          break;
        }
      }
    }
    for (i = 0; i < rainbowPairs.length; i++) doRainbowMerge(rainbowPairs[i][0], rainbowPairs[i][1]);
    for (i = 0; i < bs.length; i++) {
      var a = bs[i];
      // v305：pop 弹出动画期（popT>0，尺寸 60%~115% 过渡）不参与合成——避免"小水滴跟
      // 正常水滴消除"的观感；pop 结束后下一接触帧立即正常合成，连击链只多 0.28s 步进
      if (used[a.id] || a.special || a.frozen > 0 || a.iron || a.popT > 0) continue;
      for (j = i + 1; j < bs.length; j++) {
        var b = bs[j];
        if (used[b.id] || b.special || b.frozen > 0 || b.iron || b.tier !== a.tier || b.popT > 0) continue;
        var dx = b.x - a.x, dy = b.y - a.y;
        // 合成阈值：接触即合（+0.5 容差覆盖物理 slop 允许的静置重叠）
        var minD = a.r + b.r + 0.5;
        if (dx * dx + dy * dy <= minD * minD) {
          used[a.id] = used[b.id] = 1;
          merges.push([a, b]);
          break;
        }
      }
    }
    for (i = 0; i < merges.length; i++) doMerge(merges[i][0], merges[i][1]);

    // v365：恢复"接触即相消"（v357 的"撞击才碎"按用户要求移除）
    // ★ v366：**只有涨潮才能消除礁石**（用户："可以把礁石设置为只有涨潮才能消除，其他的水滴
    //   不需要这样的条件"）——退潮时两块礁石即使相触也不相消（纯障碍），涨潮后才一起消失。
    //   v367：「江河→大海」潮汐闸门已移除，礁石是场上唯一仍受潮汐限制的合成外清除途径；
    //   提示按 5 秒节流（礁石会在不同时间多次碰到，避免提示刷屏）。
    for (i = 0; i < bs.length; i++) {
      var ia = bs[i];
      if (!ia.iron || ia.chest || used[ia.id] || ia.frozen > 0) continue;
      if (tide.progress < C.iron.tideNeed) {
        break; // v375：退潮期整段跳过（相消提示改由 drawReefCancelHint 画在礁石上，不再全局弹字）
      }
      for (j = i + 1; j < bs.length; j++) {
        var ib = bs[j];
        if (!ib.iron || ib.chest || used[ib.id] || ib.frozen > 0) continue;
        var idx = ib.x - ia.x, idy = ib.y - ia.y;
        var iminD = ia.r + ib.r + 0.5;
        if (idx * idx + idy * idy <= iminD * iminD) {
          used[ia.id] = used[ib.id] = 1;
          ironPairMerge(ia, ib);
          break;
        }
      }
    }
  }

  function ironPairMerge(a, b) {
    var mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    phys.remove(a); phys.remove(b);
    var gain = Math.round(C.iron.pairScore * cm(scoreMult * (perkOn('iron5') ? 2 : 1))); // 成就加成：礁石克星翻倍；总倍率封顶
    score += gain;
    scoreBump = 0.3;
    if (score > best) { best = score; saveNum('mg_best', best); }
    addPopup(mx, my - b.r - 12, '礁石相消', true, 0);
    addPopup(mx, my - b.r + 10, '+' + gain, false, 0);
    burstIron(mx, my);
    burstIron(a.x, a.y);
    burstIron(b.x, b.y);
    bumpStat('ironPair');
    dailyProgress('iron');
    parts.push({ type: 'ring', x: mx, y: my, r: 22, life: 0.5, max: 0.5, color: '#9AA7B4' });
    addShake(5, 0.3);
    audio.blip(320, 0.3, 'square', 0.12, 0.5);
    audio.blip(180, 0.35, 'sine', 0.15, 0.55);
  }

  // 彩虹合成：彩虹滴 + 任意普通水滴 → 该滴跳 2 级，双倍合成分
  function doRainbowMerge(rb, t) {
    var mx = (rb.x + t.x) / 2, my = (rb.y + t.y) / 2;
    phys.remove(rb); phys.remove(t);
    var nt = Math.min(T.length - 1, t.tier + 2);
    var nb = phys.create(mx, my, nt, 0, -60);
    nb.popT = 0.28;
    var gain = Math.round(T[nt].score * 2 * cm(scoreMult * (perkOn('rainbow5') ? 1.5 : 1) * perkMult()));
    score += gain;
    scoreBump = 0.4;
    combo++; comboTimer = C.comboWindow + (perkOn('combo6') ? 0.3 : 0);
    dailyProgress('combo', 0, combo);
    if (score > best) { best = score; saveNum('mg_best', best); }
    bumpStat('rainbow');
    dailyProgress('merge', nt);
    addPopup(mx, my - T[nt].r - 14, '彩虹合成！「' + T[nt].name + '」', true, 0);
    addPopup(mx, my - T[nt].r + 8, '+' + gain, false, 0);
    for (var i = 0; i < 14; i++) {
      var ang = Math.random() * Math.PI * 2, sp = 60 + Math.random() * 160;
      parts.push({ type: 'dot', x: mx, y: my, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 40,
        r: 1.5 + Math.random() * 2.5, life: 0.6, max: 0.6,
        color: MG.util.hslToRgba(Math.floor(Math.random() * 360), 80, 65, 1) });
    }
    parts.push({ type: 'ring', x: mx, y: my, r: 18, life: 0.5, max: 0.5, color: '#C084FC' });
    addShake(3, 0.2);
    audio.blip(520, 0.3, 'sine', 0.16, 2.2);
    audio.blip(780, 0.35, 'triangle', 0.12, 1.8);
  }

  function doMerge(a, b) {
    var mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    var vx = (a.vx + b.vx) / 2, vy = (a.vy + b.vy) / 2;
    var tier = a.tier;
    phys.remove(a); phys.remove(b);
    // 符文充能：参与合成的水滴若带符文，为对应技能 +1
    if (a.rune) chargeRune(a, mx, my);
    if (b.rune) chargeRune(b, mx, my);

    combo++; comboTimer = C.comboWindow + (perkOn('combo6') ? 0.3 : 0); // 成就加成：连浪六叠延长连击窗口
    if (combo > maxCombo) { maxCombo = combo; if (maxCombo > (lifeStats.combo || 0)) { lifeStats.combo = maxCombo; } }
    dailyProgress('combo', 0, combo); // 每日任务：连击取峰值
    if (combo >= 2) hap(Math.min(50, 8 + combo * 3)); // v372：连击分级震动（2 连轻振→高连更强，配合已有 pop 震动）
    var mult = Math.min(combo, C.comboMaxMult);

    // 顶级「沧海」两两相消 → 汇入海域
    if (tier >= T.length - 1) {
      seaCount++;
      scoreMult = 1 + seaCount * C.seaMultStep;
      var gain = Math.round((T[tier].score * 4 + C.seaBonus) * cm(mult * scoreMult * (perkOn('canghai') ? 1.5 : 1) * perkMult()));
      score += gain;
      scoreBump = 0.35;
      addPopup(mx, my - 22, '汇入海域 ×' + seaCount, true, 0);
      addPopup(mx, my + 12, '+' + gain, true, 0);
      burst(mx, my, tier, true);
      suckIn(mx, my, tier);
      parts.push({ type: 'ring', x: mx, y: my, r: 20, life: 0.6, max: 0.6, color: '#7FD4FF' });
      addShake(7, 0.4);
      audio.big();
      if (score > best) { best = score; saveNum('mg_best', best); }
      questProgress(tier, combo);
      return;
    }

    var nt = tier + 1;
    var nb = phys.create(mx, my, nt, vx, vy - 40);
    nb.grace = 0.25;
    nb.popT = 0.28;

    var gain2 = Math.round(T[nt].score * cm(mult * scoreMult * perkMult() * (auroraNext || 1))); // 成就加成：弄潮儿潮汐期间 +10%；极光庇护 ×3；总倍率封顶
    if (auroraNext) { auroraNext = 0; parts.push({ type: 'ring', x: mx, y: my, r: T[nt].r + 8, life: 0.5, max: 0.5, color: '#9BE8D8' }); }
    score += gain2;
    scoreBump = 0.3;
    if (score > best) { best = score; saveNum('mg_best', best); }
    dailyProgress('merge', nt);

    unlockTier(nt, mx, my - T[nt].r - 38);
    addPopup(mx, my - T[nt].r - 12, '+' + gain2, nt >= T.length - 1, mult > 1 ? mult : 0); // v372：分数飘字随连击倍率放大（drawPopups 按 mult 缩放字号）
    burst(mx, my, nt, nt >= 6);
    suckIn(mx, my, tier);
    pushNeighbors(mx, my, T[nt].r + 30);
    if (nt >= 6) addShake(4, 0.25);
    audio.pop(nt);
    if (nt >= T.length - 1) audio.big();

    questProgress(nt, combo);

    // 甘霖：连击馈赠
    if (combo === C.rainCombo) {
      var t = mostCommonTier();
      if (t >= 0 && t !== nextTier) {
        nextTier = t;
        nextIron = false; nextSpecial = null; nextRune = null; // v369：清掉旧预览标志，避免甘霖被特殊滴/礁石覆盖（修复 2.1 类 bug）
        rainHint = 2.5;
        aimX = clampAim(aimX);
        addPopup(C.W / 2, 240, '甘霖 · 下一滴是「' + T[t].name + '」', false, 0, 1.6); // v325：预告类信息，1.6s 够读完
      }
    }
  }

  // 高潮时刻：无尽模式每累计 +1500 分（v354：500→1500），场上最高档的可合成对自发相聚（防后期机械投放）
  function doClimax() {
    var bs = phys.bodies, best = null, i, j;
    for (i = 0; i < bs.length; i++) {
      var a = bs[i];
      if (a.iron || a.chest || a.special || a.frozen > 0) continue;
      for (j = i + 1; j < bs.length; j++) {
        var b2 = bs[j];
        if (b2.iron || b2.chest || b2.special || b2.frozen > 0 || b2.tier !== a.tier) continue;
        if (!best || a.tier > best[0].tier) best = [a, b2];
      }
    }
    climaxMark = score; // 无论是否找到可合对都重置（找不到则下一轮再试）
    if (!best) return;
    var a = best[0], b2 = best[1];
    parts.push({ type: 'ring', x: a.x, y: a.y, r: a.r, life: 0.6, max: 0.6, color: '#F5D76E' });
    parts.push({ type: 'ring', x: b2.x, y: b2.y, r: b2.r, life: 0.6, max: 0.6, color: '#F5D76E' });
    for (var k = 0; k < 12; k++) {
      parts.push({ type: 'dot', x: (a.x + b2.x) / 2, y: (a.y + b2.y) / 2,
        vx: (Math.random() - 0.5) * 160, vy: -40 - Math.random() * 120,
        r: 1.5 + Math.random() * 2, life: 0.7, max: 0.7, color: '#F5D76E' });
    }
    addPopup(C.W / 2, C.dangerY + 24, '海潮高潮！水滴自发相聚', true, 0);
    addShake(2, 0.2);
    audio.quest();
    doMerge(a, b2);
  }

  function pushNeighbors(x, y, R, fmax) {
    var bs = phys.bodies, F = (fmax != null) ? fmax : 140;
    for (var i = 0; i < bs.length; i++) {
      var b = bs[i];
      var dx = b.x - x, dy = b.y - y;
      var d = Math.sqrt(dx * dx + dy * dy);
      if (d > 0 && d < R) {
        var f = (1 - d / R) * F;
        b.vx += dx / d * f; b.vy += dy / d * f;
      }
    }
  }

  // ---------- 特殊水滴 ----------
  var auroraNext = 0; // 极光庇护：下一次合成得分倍数（极光滴设置，用后清零）
  function updateSpecials(dt) {
    var bs = phys.bodies, i;
    for (i = bs.length - 1; i >= 0; i--) {
      var b = bs[i];
      if (!b) continue; // 雷霆/熔岩/虚空会在遍历中移除其他水滴，索引可能位移（最多漏拍一帧，下帧补上）
      if (b.special) {
        b.specialT += dt;
        if (b.special === 'cloud') {
          if (b.specialT >= C.cloud.splitDelay) splitCloud(b);
        } else if (b.special === 'vortex') {
          updateVortex(b, dt, bs, C.vortex, '#8FA8E8');
        } else if (b.special === 'magnet') {
          updateVortex(b, dt, bs, C.magnet, '#9BC0F0'); // 磁石滴：同漩涡逻辑，范围/力度更大
        } else if (b.special === 'ice') {
          updateIce(b, bs);
        } else if (b.special === 'gale') {
          // 疾风滴：落定瞬间吹开周围水滴（腾出空间，防堆高），随后变回普通水滴
          if (b.specialT >= 0.45 || b.y + b.r >= C.floorY - 4) {
            pushNeighbors(b.x, b.y, 185, 260); // v337：加大吹开半径与力度，效果肉眼可见
            burst(b.x, b.y, b.tier, false);
            // v337：三圈扩散风环 + 横向阵风粒子，强化"吹开"的视觉反馈
            for (var gi = 0; gi < 3; gi++) {
              parts.push({ type: 'ring', x: b.x, y: b.y, r: 14 + gi * 26, life: 0.55 + gi * 0.12, max: 0.55 + gi * 0.12, color: '#CFF0E2' });
            }
            for (var gs = 0; gs < 14; gs++) {
              var gdir = (gs % 2 === 0) ? 1 : -1;
              parts.push({ type: 'dot', x: b.x + gdir * (10 + Math.random() * 30), y: b.y + (Math.random() - 0.5) * 70,
                vx: gdir * (120 + Math.random() * 160), vy: (Math.random() - 0.5) * 80,
                r: 1.5 + Math.random() * 2, life: 0.5, max: 0.5, color: '#DFF6EC' });
            }
            addPopup(b.x, b.y - b.r - 14, '疾风！', false, 0);
            audio.swirl();
            b.special = null;
            phys.remove(b); // v369：消耗自身
          }
        } else if (b.special === 'spring') {
          if (b.specialT >= 0.45 || b.y + b.r >= C.floorY - 4) triggerSpring(b);
        } else if (b.special === 'thunder') {
          if (b.specialT >= 0.45 || b.y + b.r >= C.floorY - 4) triggerThunder(b);
        } else if (b.special === 'pearl') {
          if (b.specialT >= 0.45 || b.y + b.r >= C.floorY - 4) triggerPearl(b);
        } else if (b.special === 'magma') {
          if (b.specialT >= 0.45 || b.y + b.r >= C.floorY - 4) triggerMagma(b);
        } else if (b.special === 'geyser') {
          if (b.specialT >= 0.45 || b.y + b.r >= C.floorY - 4) triggerGeyser(b);
        } else if (b.special === 'void') {
          if (b.specialT >= 0.45 || b.y + b.r >= C.floorY - 4) triggerVoid(b);
        } else if (b.special === 'aurora') {
          if (b.specialT >= 0.45 || b.y + b.r >= C.floorY - 4) triggerAurora(b);
        }
      }
      // 冻结滴：速度清零 + 倒计时 + 解冻
      if (b.frozen > 0) {
        b.frozen -= dt;
        b.vx *= 0.1; b.vy = 0;
        if (b.frozen <= 0) thaw(b);
      }
      // 二周目「冰封之海」：标记滴落底即冻（临时平台，风险与资源并存）
      if (b.ngIce && !b.iron && b.y + b.r >= C.floorY - 3) {
        b.ngIce = false;
        b.frozen = C.ice.freezeTime;
        burst(b.x, b.y + b.r * 0.4, 0, false);
      }
    }
  }
  function updateVortex(b, dt, bs, P, pcolor) {
    P = P || C.vortex; pcolor = pcolor || '#8FA8E8';
    if (b.specialT >= P.delay && b.specialT < P.delay + P.life) {
      for (var j = 0; j < bs.length; j++) {
        var o = bs[j];
        if (o === b || o.special || o.frozen > 0 || o.iron) continue;
        var dx = b.x - o.x, dy = b.y - o.y;
        var d = Math.sqrt(dx * dx + dy * dy);
        if (d > 1 && d < P.pullR) {
          var f = P.pullF * (1 - d / P.pullR);
          o.vx += dx / d * f * dt * 10;
          o.vy += dy / d * f * dt * 10;
          o.vortexGrace = C.extGrace; // v327：被漩涡拽拉/甩飞的水滴免予堆高判负（用户："漩涡滴带飞的水滴不参与堆高判定"）；v352：0.2s→extGrace(1.2s)——磁石吸力 6200 远大于重力，落回不止 0.2s
        }
      }
      if (Math.random() < 0.3) {
        var ang = Math.random() * Math.PI * 2;
        parts.push({ type: 'dot', x: b.x + Math.cos(ang) * b.r, y: b.y + Math.sin(ang) * b.r,
          vx: Math.cos(ang + 2) * 60, vy: Math.sin(ang + 2) * 60, r: 2, life: 0.3, max: 0.3, color: pcolor });
      }
    }
    if (b.specialT >= P.delay + P.life) dissolveVortex(b, P);
  }
  function updateIce(b, bs) {
    var speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
    if ((b.specialT > 0.2 && speed < 70) || b.specialT > 1.6) freezeAround(b, bs);
  }
  function splitCloud(b) {
    phys.remove(b);
    burst(b.x, b.y, 0, false);
    // v339：随机分裂 2~3 颗，每颗档位随机 0..maxTier（不大于当前等级，保持"补充低级滴"定位）
    var n = C.cloud.minSplit + ((Math.random() < 0.5) ? 0 : (C.cloud.maxSplit - C.cloud.minSplit));
    var cap = C.cloud.maxTier;
    var spread = (n === 3) ? 1.0 : 0.7;   // 三颗撒得更开
    for (var i = 0; i < n; i++) {
      var tier = (Math.random() * (cap + 1)) | 0;                 // 0..cap 随机档位
      var ang = (i / n - 0.5) * spread * Math.PI;                 // 以虚影为中心左右扇形散开
      var vx = Math.sin(ang) * 80;
      var vy = -55 - Math.random() * 45;
      var d = phys.create(b.x + Math.sin(ang) * 16, b.y - 6, tier, vx, vy);
      d.popT = 0.25;
    }
    addPopup(b.x, b.y - 20, '雨云化雨', false, 0);
    audio.blip(520, 0.2, 'sine', 0.13, 1.8);
  }
  function dissolveVortex(b, P) {
    P = P || C.vortex;
    // v352：消散瞬间再给范围内水滴补一次外力宽限——此刻被拽拉的水滴多半还在空中（正飞向/
    // 围绕原中心），磁石一消失吸力即断，若只剩残余宽限就会在"落回途中"开始攒引信。补满
    // extGrace 让它们从容落回；落定后若仍在越线区，那是真实堆高，照常计时判负。
    var bs0 = phys.bodies;
    for (var vi = 0; vi < bs0.length; vi++) {
      var o = bs0[vi];
      if (o === b || o.special || o.frozen > 0 || o.iron) continue;
      var vdx = b.x - o.x, vdy = b.y - o.y;
      if (vdx * vdx + vdy * vdy < P.pullR * P.pullR) o.vortexGrace = C.extGrace;
    }
    var gain = Math.round((P.score || C.vortex.score) * scoreMult);
    score += gain;
    scoreBump = 0.25;
    addPopup(b.x, b.y - b.r - 10, '+' + gain, false, 0);
    burst(b.x, b.y, 5, false);
    parts.push({ type: 'ring', x: b.x, y: b.y, r: 16, life: 0.45, max: 0.45, color: '#8FA8E8' });
    phys.remove(b);
    audio.swirl();
  }

  // —— 深海新特殊滴（月光环礁起逐海域解锁，全部"落定即触发"）——
  // 甘霖滴：下一滴变为场上最多的档位
  function triggerSpring(b) {
    var t = mostCommonTier();
    b.special = null;
    if (t >= 0 && t !== nextTier) {
      nextTier = t;
      nextIron = false; nextSpecial = null; nextRune = null; // v369：同上，避免被旧预览标志覆盖
      rainHint = 2.5;
      aimX = clampAim(aimX);
    }
    addPopup(b.x, b.y - b.r - 14, '甘霖降临！', false, 0);
    parts.push({ type: 'ring', x: b.x, y: b.y, r: 18, life: 0.5, max: 0.5, color: '#BFE8D0' });
    audio.quest();
    phys.remove(b); // v369：落定即触发后消耗自身（与虚空/漩涡一致），不再遗留普通滴
  }
  // 雷霆滴：场上一对同档水滴直接合成（选距离最近的一对）
  function triggerThunder(b) {
    var bs = phys.bodies, best = null, i, j;
    for (i = 0; i < bs.length; i++) {
      var a = bs[i];
      if (a === b || a.iron || a.chest || a.special || a.frozen > 0) continue;
      for (j = 0; j < bs.length; j++) {
        var o = bs[j];
        if (o === a || o.iron || o.chest || o.special || o.frozen > 0 || o.tier !== a.tier) continue;
        var d = Math.abs(a.x - o.x) + Math.abs(a.y - o.y);
        if (!best || d < best.d) best = { a: a, o: o, d: d };
      }
    }
    b.special = null;
    if (!best) { addPopup(b.x, b.y - b.r - 14, '雷落空了…', false, 0); phys.remove(b); return; }
    parts.push({ type: 'ring', x: best.a.x, y: best.a.y, r: best.a.r, life: 0.5, max: 0.5, color: '#F2C14E' });
    parts.push({ type: 'ring', x: best.o.x, y: best.o.y, r: best.o.r, life: 0.5, max: 0.5, color: '#F2C14E' });
    addPopup(C.W / 2, C.dangerY + 24, '雷霆引合！', true, 0);
    addShake(2, 0.2);
    audio.freeze();
    doMerge(best.a, best.o);
    phys.remove(b); // v369：消耗自身
  }
  // 珍珠滴：场上最多的档位全体 +1 级
  function triggerPearl(b) {
    var t = mostCommonTier(), n = 0;
    b.special = null;
    if (t < 0 || t >= T.length - 1) { addPopup(b.x, b.y - b.r - 14, '珍珠黯淡了…', false, 0); phys.remove(b); return; }
    var bs = phys.bodies;
    for (var i = 0; i < bs.length; i++) {
      var o = bs[i];
      if (o.tier !== t || o.iron || o.chest || o.special || o.frozen > 0) continue;
      // v305：升档必须同步半径——此前只改 tier 不改 r，升档滴永远保持旧档的小半径，
      // 却能与新档正常大小的水滴合成（用户："不同大小的相同类型水滴可以消除"）
      o.tier += 1; o.r = T[o.tier].r; o.popT = 0.3; n++;
      parts.push({ type: 'ring', x: o.x, y: o.y, r: o.r * 0.6, life: 0.45, max: 0.45, color: '#F0E6D2' });
    }
    addPopup(C.W / 2, C.dangerY + 24, '珍珠祝福！「' + T[t].name + '」全体 +1', true, 0);
    audio.quest();
    phys.remove(b); // v369：消耗自身
  }
  // 熔岩滴：烧毁周围礁石与最低两档水滴，折算得分
  function triggerMagma(b) {
    var bs = phys.bodies, R = C.magmaR, burn = [], i;
    for (i = 0; i < bs.length; i++) {
      var o = bs[i];
      if (o === b) continue;
      var dx = o.x - b.x, dy = o.y - b.y;
      if (dx * dx + dy * dy > R * R) continue;
      if ((o.iron && !o.chest) || (!o.iron && !o.special && !o.chest && o.frozen <= 0 && o.tier <= 2)) burn.push(o);
    }
    b.special = null;
    var gain = 0;
    for (i = 0; i < burn.length; i++) {
      var t2 = burn[i].iron ? 0 : burn[i].tier;
      gain += Math.round((C.magmaScore + T[t2].score * 2) * scoreMult);
      burst(burn[i].x, burn[i].y, Math.max(0, t2), false);
      if (burn[i].iron) dailyProgress('iron'); // v357：熔岩烧掉礁石同样计入"消除礁石"
    }
    phys.removeMany(burn); // v351：批量一次删完（逐个 remove 是 indexOf+splice 的 O(k*n)）
    score += gain; scoreBump = 0.3;
    addPopup(b.x, b.y - b.r - 14, burn.length ? '熔岩灼烧 ×' + burn.length + ' +' + gain : '熔岩熄灭', burn.length, 0);
    if (burn.length) addShake(3, 0.25);
    parts.push({ type: 'ring', x: b.x, y: b.y, r: R * 0.7, life: 0.5, max: 0.5, color: '#F2A05E' });
    phys.remove(b); // v369：熔岩灼烧后消耗自身，不再遗留普通滴
    audio.freeze();
  }
  // 间歇泉滴：垂直水柱冲开上方水滴
  function triggerGeyser(b) {
    var bs = phys.bodies, n = 0;
    for (var i = 0; i < bs.length; i++) {
      var o = bs[i];
      if (o === b || o.y >= b.y) continue;
      if (Math.abs(o.x - b.x) > C.geyserW) continue;
      o.vy -= C.geyserF * (1 - Math.min(1, (b.y - o.y) / 260));
      n++;
    }
    b.special = null;
    for (var k = 0; k < 10; k++) {
      parts.push({ type: 'dot', x: b.x + (Math.random() - 0.5) * 26, y: b.y - Math.random() * 160,
        vx: (Math.random() - 0.5) * 30, vy: -140 - Math.random() * 160,
        r: 1.5 + Math.random() * 2.5, life: 0.6, max: 0.6, color: '#BFF0F8' });
    }
    addPopup(b.x, b.y - b.r - 14, n ? '间歇泉！' : '泉眼枯了', false, 0);
    phys.remove(b); // v369：消耗自身
    audio.swirl();
  }
  // 虚空滴：吞噬场上最低档水滴（至多 voidN 颗），折算高分
  function triggerVoid(b) {
    var bs = phys.bodies, victims = [], i;
    for (i = 0; i < bs.length; i++) {
      var o = bs[i];
      if (o === b || o.iron || o.chest || o.special || o.frozen > 0) continue;
      victims.push(o);
    }
    victims.sort(function (a, c) { return a.tier - c.tier; });
    b.special = null;
    var gain = 0, n = 0;
    for (i = 0; i < victims.length && n < C.voidN; i++, n++) {
      gain += Math.round(C.voidScore * (1 + victims[i].tier * 0.3) * scoreMult);
      suckIn(b.x, b.y, Math.max(0, victims[i].tier));
    }
    phys.removeMany(victims, n); // v351：只吞前 n 个；count 参数避免 slice 分配
    score += gain; scoreBump = 0.3;
    if (gain > 0) addPopup(b.x, b.y - b.r - 14, '虚空吞噬 ×' + n + ' +' + gain, true, 0);
    else addPopup(b.x, b.y - b.r - 14, '虚空空空如也', false, 0);
    phys.remove(b);
    parts.push({ type: 'ring', x: b.x, y: b.y, r: 20, life: 0.55, max: 0.55, color: '#8A7FD4' });
    audio.swirl();
  }
  // 极光滴：下一次合成得分 ×3
  function triggerAurora(b) {
    b.special = null;
    auroraNext = C.auroraMult;
    for (var k = 0; k < 10; k++) {
      var ang = Math.random() * Math.PI;
      parts.push({ type: 'dot', x: b.x + Math.cos(ang) * 20, y: b.y - Math.random() * 40,
        vx: (Math.random() - 0.5) * 60, vy: -60 - Math.random() * 100,
        r: 2 + Math.random() * 2, life: 0.8, max: 0.8, color: k % 2 ? '#9BE8D8' : '#C8B8F0' });
    }
    addPopup(C.W / 2, C.dangerY + 24, '极光庇护！下次合成 ×3', true, 0);
    phys.remove(b); // v369：消耗自身
    audio.quest();
  }
  function freezeAround(b, bs) {
    b.special = null;
    b.frozen = C.ice.freezeTime;
    var R = b.r * C.ice.radiusFactor;
    for (var j = 0; j < bs.length; j++) {
      var o = bs[j];
      if (o === b || o.special || o.frozen > 0) continue;
      var dx = o.x - b.x, dy = o.y - b.y;
      if (dx * dx + dy * dy <= R * R) o.frozen = C.ice.freezeTime * 0.92;
    }
    addPopup(b.x, b.y - b.r - 14, '冰封！', false, 0);
    parts.push({ type: 'ring', x: b.x, y: b.y, r: b.r, life: 0.4, max: 0.4, color: '#BFEAFF' });
    for (var k = 0; k < 6; k++) {
      var ang = Math.random() * Math.PI * 2;
      parts.push({ type: 'dot', x: b.x + Math.cos(ang) * R * 0.5, y: b.y + Math.sin(ang) * R * 0.5,
        vx: Math.cos(ang) * 40, vy: Math.sin(ang) * 40 - 20, r: 2, life: 0.5, max: 0.5, color: '#DFF4FF' });
    }
    audio.freeze();
  }
  function thaw(b) {
    b.frozen = 0;
    parts.push({ type: 'ring', x: b.x, y: b.y, r: b.r * 0.5, life: 0.3, max: 0.3, color: '#DFF4FF' });
    audio.thaw();
  }

  // ---------- 潮汐 ----------
  // 潮位设计（v328）：满潮水面 = 警戒线→底部(450px)的"填充比例"——浅海最低填 1/4、深海最高填 3/4，
  // 线性、且恒在警戒线下方。fill(sea)=lowFrac+(highFrac-lowFrac)×sea/(n-1)；
  // 满潮水面 y = floorY - zone×fill（zone=floorY-dangerY）。最满 fill=0.75 时水面=427.5，仍在线下 112.5px。
  // 取代 v322 的 overMin/overMax（原深海满潮没过警戒线，违反"不超过警戒线"）。
  // ★ v353：以上约束的是**水面高度**，不是水滴高度。浮力仍随浸没比衰减（用户："潮汐的衰减还是
  // 保留吧"），但**完全浸没的水滴净上托 2500（浮力 4000 > 重力 1500），会冲出水面并越过警戒线**
  // ——正常机制、按 v352 裁定不豁免。禁止再用"水面恒在警戒线下方"推导"浮力安全 / 不会把水滴
  // 托过线"（该结论错误，已删除）。
  function tideWaterMax() {
    var H = FLOORY - C.containerTop;
    var zone = FLOORY - C.dangerY;
    var fill = C.tide.lowFrac + (C.tide.highFrac - C.tide.lowFrac) * (seaStage() / (C.seaStages.length - 1));
    return (zone * fill) / H; // 满潮水面 = FLOORY - H×tideWaterMax = FLOORY - zone×fill（恒 ≥ 警戒线）
  }
  var _tideYKey = -1, _tideYVal = 0; // v371：按 tide.progress 缓存，tideCrest 每帧多次采样只读一次 tideWaterMax()/seaStage()
  function tideY() {
    if (_tideYKey === tide.progress) return _tideYVal;
    _tideYKey = tide.progress;
    _tideYVal = FLOORY - tide.progress * (FLOORY - C.containerTop) * tideWaterMax();
    return _tideYVal;
  }
  // 波浪振幅随潮汐增强（潮越大浪越涌），物理水面(tideY)保持平，仅视觉起浪
  function tideAmp() {
    return 2.5 + tide.progress * 5.5;
  }
  // 共用水面波形：两组行波叠加，所有视觉层（水体/染色/波线/泡沫）对齐同一条 crest
  function tideCrest(x) {
    var amp = tideAmp();
    return tideY()
      + Math.sin(x * 0.032 + time * 2.4) * amp
      + Math.sin(x * 0.071 - time * 1.7) * amp * 0.55
      + Math.sin(x * 0.16 + time * 3.6) * amp * 0.25;
  }
  function updateTide(dt) {
    if (tide.banner > 0) tide.banner -= dt;
    if (tide.phase === 'idle') {
      tide.timer -= dt;
      tide.progress = Math.max(0, tide.progress - dt / 1.6);
      if (tide.timer <= 0) {
        tide.phase = 'active';
        // v327：涨潮持续随海域线性拉长（sea0=duration → 深渊王座=durationMax），让深海引信链在退潮前兑现（原写死 duration，深海首潮永不致死）
        tide.timer = C.tide.duration + (C.tide.durationMax - C.tide.duration) * seaStage() / (C.seaStages.length - 1);
        tide.banner = 2.4;
        if (!tideKillHint) { tideKillHint = true; addPopup(C.W / 2, C.dangerY + 24, '潮位渐深 · 水下浮力增强', true, 0); }
        audio.tide();
      }
    } else {
      tide.progress = Math.min(1, tide.progress + dt / 1.3);
      tide.timer -= dt;
      if (tide.timer <= 0) {
        tide.phase = 'idle';
        // v311：潮汐间隔改为随海域推进变短（原为随局内时长 endlessRamp）——
        // 初始 cycleInterval 32s 线性压到深海的 tideIntervalMin 16s；词缀局再乘疾风骤雨系数
        var tiv = C.tide.cycleInterval - (C.tide.cycleInterval - C.ramp.tideIntervalMin) * (seaStage() / (C.seaStages.length - 1));
        if (ng.active && ng.active.tideInt) tiv *= ng.active.tideInt; // 二周目「疾风骤雨」
        tide.timer = tiv;
        bumpStat('tide');                      // 成就：经历涨潮次数（跨局累计）
        dailyProgress('tide');                 // 每日任务：经历涨潮
        seaEvent.timer = Math.max(seaEvent.timer, 4); // 保底：退潮后至少 4s 再来事件
        tryTideBless();                        // 组合技：退潮余波概率引来海神恩泽
      }
    }
  }
  // 潮汐+祝福组合技：退潮瞬间概率触发，全场普通水滴集体升 1 级（连续两次退潮至多出一次）
  var tideBlessCd = false;
  function tryTideBless() {
    var bs = phys.bodies, i, n = 0;
    for (i = 0; i < bs.length; i++) if (!bs[i].iron && !bs[i].chest && !bs[i].special) n++;
    if (n < C.tideBless.minDrops) return;
    if (tideBlessCd) { tideBlessCd = false; return; }
    if (Math.random() >= C.tideBless.chance) return;
    tideBlessCd = true;
    for (i = 0; i < bs.length; i++) {
      var b = bs[i];
      if (b.iron || b.chest || b.special || b.tier >= T.length - 1) continue;
      // v305：同珍珠滴——升档同步半径（否则祝福后全体水滴都小一号，与合成产物大小不一）
      b.tier += 1;
      b.r = T[b.tier].r;
      b.popT = 0.3;
      parts.push({ type: 'ring', x: b.x, y: b.y, r: b.r * 0.6, life: 0.5, max: 0.5, color: '#F5D76E' });
    }
    for (i = 0; i < 10; i++) {
      parts.push({ type: 'dot', x: 30 + Math.random() * (C.W - 60), y: FLOORY - Math.random() * 120,
        vx: (Math.random() - 0.5) * 40, vy: -60 - Math.random() * 80,
        r: 1.5 + Math.random() * 2, life: 0.8, max: 0.8, color: '#F5D76E' });
    }
    addPopup(C.W / 2, 220, '海神恩泽！退潮余波祝福全场 +1 级', true, 0);
    addShake(3, 0.3);
    audio.quest();
  }
  function applyBuoyancy(dt) {
    if (tide.progress <= 0.02) return;
    var wy = tideY();
    var bs = phys.bodies;
    for (var i = 0; i < bs.length; i++) {
      var b = bs[i];
      if (b.iron || b.frozen > 0) continue; // 礁石沉底不浮起
      var subm = (b.y + b.r - wy) / (2 * b.r);
      if (subm <= 0) continue;
      var f = Math.min(1, subm); // 浸没比：浮力、水的阻力、横向涌动三者共用（浸得越浅浮力越弱、受阻越小）
      var buoy = C.tide.buoyancy * ((ng.active && ng.active.tideToss && tide.phase === 'active') ? ng.active.tideToss : 1); // v339：深渊试炼潮期浮力×tideToss，涌动更猛、更难落位
      // ★ v353：浮力**保留**随浸没比衰减（用户："潮汐的衰减还是保留吧"）。
      // 但严禁再由它推导出两条错误结论（用户已明令删除）：①"平衡位置恒在警戒线下方"
      // ②"不会把水滴托过线"。事实是：完全浸没时浮力 4000 > 重力 1500、净上托 2500，水滴会
      // 冲出水面并越过警戒线——按 v352 裁定属正常机制、**不豁免**，该判负就判负。
      b.vy -= buoy * f * dt;
      // 水的阻力
      var drag = Math.min(0.9, 2.2 * f * dt);
      b.vx *= (1 - drag);
      b.vy *= (1 - drag);
      // 水面轻微晃动推力（制造涌动感）
      b.vx += Math.sin(time * 2.2 + b.y * 0.02) * 14 * f * dt;
    }
  }

  // ---------- 技能 ----------
  // 充能写入（统一入口，v338：超额储备——允许叠到 skillMaxQ 倍 cost，溢出截断不再清零）
  function addCharge(k, n) {
    if (!(k in skillCharge)) return;
    var cap = skillCost(k) * C.skillMaxQ;
    skillCharge[k] = Math.min(cap, (skillCharge[k] || 0) + n);
  }
  // 符文充能：合成带符文的水滴 → 对应技能 +1（v338：可叠到 skillMaxQ 倍，不再满即停）
  function chargeRune(b, mx, my) {
    var k = b.rune;
    if (skillCharge[k] >= skillCost(k) * C.skillMaxQ) return;
    skillCharge[k]++;
    addPopup(mx + (Math.random() * 24 - 12), my - 10, '「' + runeName(k) + '」符文 +1', false, 0);
    audio.blip(880, 0.12, 'sine', 0.10, 1.35);
  }
  function skillCost(key) {
    for (var i = 0; i < C.skills.length; i++) if (C.skills[i].key === key) return C.skills[i].cost;
    return 999;
  }
  function skillBtnIdx(key) {
    for (var i = 0; i < SKILL_BTNS.length; i++) if (SKILL_BTNS[i].key === key) return i;
    return 0;
  }
  function flashSkill(key, text) {
    var b = SKILL_BTNS[skillBtnIdx(key)];
    addPopup(b.cx, b.cy - 46, text, false, 0);
  }
  function useSkill(key) {
    var i;
    if (!skillUnlocked(key)) {
      flashSkill(key, '「' + runeName(key) + '符文」出现后解锁');
      return;
    }
    if (key === 'evap') {
      if (evapMode) { evapMode = false; return; }
      if (skillCharge.evap < skillCost('evap')) { flashSkill('evap', '「' + runeName('evap') + '」符文不足'); return; }
      evapMode = true;
      rippleMode = false;
      flowMode = false; flowPick = null;
      // v357：场上有礁石时明确告知涨价（避免玩家点下去才发现扣 2 次）
      // v366：追加"限涨潮"——退潮时点礁石会被拒绝且不扣充能
      if (ironCount() > 0) addPopup(C.W / 2, C.dangerY + 24, '蒸发礁石需 ' + (skillCost('evap') * C.iron.evapCost) + ' 次充能 · 限涨潮', false, 0);
      return;
    }
    if (key === 'flow') {
      if (flowMode) { flowMode = false; flowPick = null; return; }
      if (skillCharge.flow < skillCost('flow')) { flashSkill('flow', '「' + runeName('flow') + '」符文不足'); return; }
      flowMode = true;
      evapMode = false; rippleMode = false;
      return;
    }
    if (key === 'ripple' && rippleMode) { rippleMode = false; return; } // 再点按钮取消选位
    if (skillCharge[key] < skillCost(key)) {
      flashSkill(key, '「' + runeName(key) + '」符文不足');
      return;
    }
    if (key === 'swap') {
      skillCharge.swap -= skillCost('swap'); // v338：扣一次费用而非清零，支持多次充能连放
      nextTier = rollTier();
      rollNextDrop();
      aimX = clampAim(aimX);
      addPopup(aimX, C.spawnY + 66, '换滴', false, 0); // 移到虚影下方，不压住水滴
      audio.drop();
    } else if (key === 'ripple') {
      // 进入选位模式：点击画布任意位置作为波纹中心释放
      rippleMode = true;
      evapMode = false;
      flowMode = false; flowPick = null;
    }
  }
  // 水流交换：两枚水滴互换位置（布局型道具——把挡路的滴换到它能合的地方）
  function flowSwap(a, b) {
    var tx = a.x, ty = a.y;
    a.x = b.x; a.y = b.y;
    b.x = tx; b.y = ty;
    a.vx = a.vy = b.vx = b.vy = 0;
    a.svx = a.svy = b.svx = b.svy = 0;
    a.trail = []; b.trail = [];
    skillCharge.flow -= skillCost('flow'); // v338：扣一次费用而非清零
    flowMode = false; flowPick = null;
    parts.push({ type: 'ring', x: a.x, y: a.y, r: a.r, life: 0.4, max: 0.4, color: '#7FD4FF' });
    parts.push({ type: 'ring', x: b.x, y: b.y, r: b.r, life: 0.4, max: 0.4, color: '#7FD4FF' });
    addPopup((a.x + b.x) / 2, Math.min(a.y, b.y) - 30, '水流交换！', false, 0);
    audio.pop(3);
  }
  // 在指定位置释放双重波纹（首波强推 + 延迟次波再推）
  function castRipple(x, y) {
    x = Math.max(12, Math.min(C.W - 12, x));
    y = Math.max(C.containerTop + 30, Math.min(FLOORY - 16, y));
    skillCharge.ripple -= skillCost('ripple'); // v338：扣一次费用而非清零
    rippleMode = false;
    applyRipplePush(x, y, C.ripple.power);
    rippleQueue.push({ t: C.ripple.delay, x: x, y: y });
    parts.push({ type: 'ring', x: x, y: y, r: 30, life: 0.5, max: 0.5, color: '#7FD4FF' });
    parts.push({ type: 'ring', x: x, y: y, r: 60, life: 0.55, max: 0.55, color: '#A8DDF5' });
    addShake(2, 0.15);
    audio.pop(5);
  }
  function applyRipplePush(cx, cy, power) {
    var bs = phys.bodies;
    for (var i = 0; i < bs.length; i++) {
      var b = bs[i];
      if (b.iron || b.frozen > 0) continue; // 冻结滴纹丝不动；礁石沉重推不动
      var dx = b.x - cx, dy = b.y - cy;
      var d = Math.sqrt(dx * dx + dy * dy);
      if (d < 1) { dx = 0; dy = -1; d = 1; }
      var f = power * Math.max(0.25, 1 - d / C.ripple.radius);
      b.vx += dx / d * f;
      b.vy += dy / d * f - C.ripple.lift * (power / C.ripple.power);
    }
  }
  function ballAt(p) {
    var bs = phys.bodies;
    for (var i = bs.length - 1; i >= 0; i--) {
      var b = bs[i];
      var dx = p.x - b.x, dy = p.y - b.y;
      var rr = b.r + 5;
      if (dx * dx + dy * dy <= rr * rr) return b;
    }
    return null;
  }
  function evaporate(b) {
    var gain;
    // ★ v366：只有涨潮才能消除礁石（用户要求；水滴无此限制）——退潮时点礁石直接拒绝且不扣充能
    if (b.iron && tide.progress < C.iron.tideNeed) {
      flashSkill('evap', '退潮中 · 需涨潮才能蒸发礁石');
      return;
    }
    var cost = skillCost('evap') * (b.iron ? C.iron.evapCost : 1); // v357：蒸发礁石 2 次充能、水滴仍 1 次
    if (b.iron) {
      gain = C.iron.evaporateScore; // v357：不再给分（原 5）——清除是止损，不是收益
      burstIron(b.x, b.y);
      dailyProgress('iron');        // v357：蒸发也算"消除礁石"（每日任务各途径统一计数）
    } else {
      gain = Math.max(1, Math.round(T[b.tier].score * scoreMult));
      burst(b.x, b.y, b.tier, false);
    }
    score += gain;
    scoreBump = 0.25;
    addPopup(b.x, b.y - b.r - 8, b.iron ? ('礁石移除 · 充能 −' + cost) : ('+' + gain), false, 0);
    phys.remove(b);
    skillCharge.evap -= cost; // v338：扣一次费用而非清零（v357：礁石扣 evapCost 倍）
    evapMode = false;
    audio.blip(900, 0.25, 'sine', 0.15, 0.4);
  }
  function burstIron(x, y) {
    parts.push({ type: 'ring', x: x, y: y, r: 16, life: 0.4, max: 0.4, color: '#8B98A5' });
    for (var i = 0; i < 8; i++) {
      var ang = Math.random() * Math.PI * 2, sp = 70 + Math.random() * 140;
      parts.push({ type: 'dot', x: x, y: y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 30,
        r: 1.5 + Math.random() * 2.5, life: 0.45, max: 0.45,
        color: Math.random() < 0.5 ? '#8B98A5' : '#5A6572' });
    }
  }

  // ---------- 失败判定 ----------
  function checkDanger(dt) {
    // 失败判定：越线即计时、不看速度（v323/v326）。堆叠/微颤柱"明显越线却迟迟不判负"的根因是
    // 速度门把"持续越线"与"瞬时横穿"混为一谈，而后者由三重机制区分（出生宽限 0.6s、引信 1.1s、
    // 出线即清零），故越线滴一律计时。★ v353 更正：v328 定的是"**潮位水面**恒在警戒线下方"
    // （见 tideWaterMax，用户原话"完全是不超过警戒线的"）——那是水面高度规格，**不等于水滴
    // 不会被托过线**。浮力虽随浸没比衰减（v353 用户："潮汐的衰减还是保留吧"），但完全浸没时
    // 净上托仍有 2500（浮力 4000 > 重力 1500），水滴会冲出水面并明显越线。
    // 旧注释写的"潮汐只做水下浮力重排、不再把水滴推越线"是错误结论，已删除（用户多次纠正）。
    // ★ v368：堆高越线缓冲期统一为 C.dangerTime(3s)，不再区分潮汐 ×2 / 首次 ×3 / 容器顶 ×0.55——
    // ★ v352 豁免范围界定（用户明确）：只有「被特殊滴外力拽拉」的水滴豁免（见 C.extGrace）。
    //   深海涌泉(1800)/风暴向心力(2400)/间歇泉(geyserF)/潮汐浮力造成的越线属正常游戏机制，
    //   一律不豁免——它们把水滴顶过线，该判负就判负。
    // 三条豁免：冻结滴(b.frozen)、漩涡/磁石拽拉甩飞(b.vortexGrace)、全部瞬态特殊滴(b.special)不计堆高。
    // 死亡缓冲：越线即显示"死亡缓冲"倒计时(dangerRemain)，每局一次首死延长引信即为缓冲（弹字已移除）。
    // ★ v323：潮汐判负两条修正（用户："涨潮引起的越线好像很难死亡，是判定不对吗？"；
    //   test/sim_danger.js 仿真定位）——① 引信 ×5→×2：漂浮滴均速仅 45~53px/s，却因
    //   初升时一次性 ~7px 回落出线清零、约 3.5s 后才稳定越线，×5 引信最早 ~9s 才攒满，
    //   超过涨潮全长 8s——"一次涨潮内永远攒不满、潮退滴落计时清零"是越线很难死亡的主因；
    //   ② 潮汐期间越线即计时、不看速度：速度门只堵死 10~13% 采样，却把"持续漂浮"与
    //   "被合成反冲弹飞的瞬时横穿"混为一谈——漂浮持续、横穿 <0.5s，2.2s 引信天然区分
    //   （回落出线即清零）。
    // ★ v326：非潮汐路径同潮汐——越线即计时、不看速度（用户："开始游戏时直接叠罗汉
    //   超过警戒线也没有提示？"；test/sim_column.js 仿真定位）。真因：垂直细柱（12 滴
    //   同 x 叠罗汉）在本引擎里永不"静止"——位置稳定在 ±1px（边缘滴 8s 纹丝不动），
    //   但堆内接触解算持续微颤，越线滴均速 162px/s（>速度门 120），dangerT 被速度门
    //   100% 堵死、再被衰减清零 ⇒ 警示条恒 0：无闪烁、无"堆高越线"文字、无判负。
    //   速度门把"持续越线（堆高/微颤柱）"与"瞬时横穿（掉落/反冲/技能推射）"混为一谈，
    //   而后者由三重机制区分、不需要速度门：① 出生宽限 0.6s > 任何容器内穿线时长
    //   （~0.42s，sim_danger.js D 案 / sim_column.js J 案回归：峰速 572px/s 仍判负为无）；
    //   ② 引信 1.1s >> 穿线时长 0.2~0.4s；③ 出线（top≥dangerY）即清零。
    var bs = phys.bodies;
    var worst = 0, minRemain = 99;
    for (var i = 0; i < bs.length; i++) {
      var b = bs[i];
      if (b.frozen > 0) continue;                 // 冻结滴"封存"，不判负
      if (b.special) continue;                     // v328：瞬态特殊滴（漩涡/雨云/冰晶/磁吸/熔岩/间歇泉/虚空/极光/彩虹/雷霆/珍珠/甘霖…）不计堆高
      if (b.grace > 0) { b.dangerT = 0; continue; }
      if (b.vortexGrace > 0) { b.vortexGrace -= dt; b.dangerT = 0; continue; } // v327：漩涡拽拉/甩飞豁免堆高判负
      var top = b.y - b.r;
      if (top >= C.dangerY) { b.dangerT = 0; continue; } // 线下，重置
      var fuse = C.dangerTime; // v368：堆高越线缓冲期统一 3s（潮汐 / 首次越线 / 容器顶一律不再区分）
      b.dangerT += dt;
      var remain = fuse - b.dangerT;
      // v336：倒计时只走一次（用户"堆高越线会倒计时两次！"）——原两段式（首段 3s 走完
      // 重置全体计时、再按常规引信 1.1s 倒数第二遍才结算）观感即"倒计时两次"。现引信到点
      // 直接结算。v368 起缓冲期统一为 C.dangerTime(3s)，首次越线与复活后一致，倒计时只出现一轮。
      if (remain <= 0) { dangerAlert = 0; dangerRemain = 0; gameOver(); return; }
      var w = b.dangerT / fuse;
      if (w > worst) worst = w;
      if (remain < minRemain) minRemain = remain;
    }
    dangerAlert = Math.min(1, worst);                  // 0..1，供警戒线渲染加强警示
    dangerRemain = worst > 0 ? Math.max(0, minRemain) : 0; // 死亡缓冲剩余秒（倒计时）
  }
  function gameOver() {
    state = 'over';
    lifeScore += score - runCounted; runCounted = score; // 累计分只记增量（复活续局不重复计）
    careerPeak = Math.max(careerPeak, lifeScore); // 生涯峰值只涨不跌（图鉴"已抵达"的判定基准）
    saveNum('mg_peak', careerPeak);
    saveNum('mg_life', lifeScore);
    saveNum('mg_best', best);
    checkAchievements();
    saveDex();
    audio.over();
  }

  // 只读探针：供自动化测试读取内部状态（不写入、不影响任何游戏逻辑）
  MG.probe = function () {
    var top = -1;
    for (var i = 0; i < phys.bodies.length; i++) {
      var b = phys.bodies[i];
      if (top < 0 || b.y - b.r < top) top = b.y - b.r;
    }
    var bs = [], i;
    for (i = 0; i < phys.bodies.length; i++) {
      b = phys.bodies[i];
      bs.push({ x: Math.round(b.x), y: Math.round(b.y), r: Math.round(b.r), tier: b.tier, iron: !!b.iron, chest: !!b.chest, special: b.special || null,
                vx: Math.round(b.vx), vy: Math.round(b.vy), dangerT: Math.round((b.dangerT || 0) * 100) / 100, grace: Math.round((b.grace || 0) * 100) / 100 });
    }
    var ui = { book: { cx: bookBtn.cx, cy: bookBtn.cy }, restart: { cx: restartBtn.cx, cy: restartBtn.cy }, skills: [] };
    for (i = 0; i < SKILL_BTNS.length; i++) ui.skills.push({ key: SKILL_BTNS[i].key, cx: SKILL_BTNS[i].cx, cy: SKILL_BTNS[i].cy });
    return {
      state: state, dangerY: C.dangerY, floorY: C.floorY, pileTop: top, n: phys.bodies.length,
      dangerAlert: dangerAlert,
      tide: tide.progress, tideRef: tide, score: score,
      chest: chest ? [Math.round(chest.b.x), Math.round(chest.b.y)] : null,
      chestLife: chest ? Math.round((chest.life - chest.t) * 10) / 10 : null,
      event: seaEvent.type, eventT: seaEvent.type ? Math.round(seaEvent.t * 10) / 10 : null,
      bodies: bs, ui: ui, stats: lifeStats, ach: achDone, dexSp: dexSpecial,
      modes: { evap: evapMode, ripple: rippleMode, flow: flowMode },
      stage: seaStage(), daily: { done: daily.done.slice(), streak: daily.streak }, best: best,
      jellies: jellies.map(function (j) { return { x: Math.round(j.x), y: Math.round(j.y), s: Math.round(j.s) }; }),
      col: colProgress, chestTimer: Math.round(chestTimer * 10) / 10,
      oy: oy, renderOy: renderOy, hudInset: hudInset, VH: VH, floorY: C.floorY, containerTop: C.containerTop, time: time,
      dangerY: C.dangerY, spawnY: C.spawnY,
      layout: { H: C.H, dy: MG.layout.dy, bandH: MG.layout.band.h, btnCy: MG.layout.band.btnCy, decorBase: MG.layout.band.decorBase,
                overY: MG.layout.overRect().y, shareY: MG.layout.shareRect().y, confirmY: MG.layout.confirmRect().y,
                focusCy: MG.layout.panel.focusCy, hudBottom: MG.layout.hud.hudBottom },
      offline: offlineGain ? { mins: offlineGain.mins, gain: offlineGain.gain } : null
    };
  };
  // 测试钩子（仅自动化测试用）：充能 / 成就 / 局面构造 / 加压进度
  MG.debug = {
    give: function (k, n) { addCharge(k, n); },
    setNext: function (opt) {
      opt = opt || {};
      nextIron = !!opt.iron;
      nextSpecial = opt.special || null;
      nextRune = !opt.special && !opt.iron ? (opt.rune || null) : null;
      if (nextRune) seeRune(nextRune); // 与 rollRune 同一不变量：符文出现 ⇒ 道具解锁
      if (opt.tier != null) nextTier = opt.tier;
    },
    chestNow: function (x) {
      if (!chest) spawnChest();
      if (x != null) chest.b.x = x;
    },
    achCheck: function () { checkAchievements(); },
    bump: bumpStat,
    forceEndless: function () {}, // 已无关卡制：开局即无尽（保留空钩子兼容旧测试脚本）
    setRamp: function (t) { endlessT = t; },
    grant: function (id) { achDone[id] = 1; saveDex(); },
    addScore: function (n) { score += n; },
    spawn: function (tier, x, y) { return phys.create(x || C.W / 2, y || C.spawnY, tier, 0, 0); },
    dailyProg: dailyProgress,
    dailyState: function () { return daily; },
    board: friendBoard,
    share: function () { openShare(); return shareText; },
    shareCopy: copyShareText,
    setDrops: function (n) { dropCount = n; },
    tutDone: function () { return tutDone; },
    stage: function () { return { i: seaStage(), name: C.seaStages[seaStage()].name }; },
    tideY: tideY, // 当前潮面 y（测试钩子：潮位随海域上涨验证用）
    setLife: function (n) { lifeScore = n; runCounted = 0; },
    cm: cm,
    // ---- 蒙特卡洛模拟器钩子（无渲染快进，见 test/simulate.js） ----
    headless: false,
    step: function (dt) { update(dt); },
    drop: function (x) { aimX = clampAim(x == null ? Math.random() * C.W : x); tryDrop(); },
    reset: function () { restart(); },
    ngInfo: function () { return { unlocked: ng.unlocked, active: ng.active ? ng.active.id : null }; },
    ngUnlock: function () { ng.unlocked = true; saveFlag('mg_ng', 1); },
    ngStart: function (id) {
      var af = null, k;
      for (k = 0; k < C.ng.affixes.length; k++) if (C.ng.affixes[k].id === id) af = C.ng.affixes[k];
      if (!af) for (k = 0; k < DCHAL_AFFIXES.length; k++) if (DCHAL_AFFIXES[k].id === id) af = DCHAL_AFFIXES[k]; // v369：词缀两份真源，调试启动需同时能解析每日专属词缀（abyss/icereef）
      if (af) ngStartRun(af);
      return af ? af.name : null;
    },
    over: function () { buildOverButtons(); gameOver(); }, // 直达结算页（UI 测试用）
    menuBtn: function () { return menuStartBtn; }, // 开始界面按钮几何（UI 测试用）
    openDex: function () { dexOpen = true; achOpen = false; },
    forceEvent: function (type) { startSeaEvent(type); }, // 直接触发深海事件（UI 测试用：surge/bless/storm）
    addScore: function (n) { score += n; }, // 测试用直接加分（每日挑战达标验证等）
    dexSecTab: function (i) { return dexSecRect(i); }, // 图鉴分节控件几何（UI 测试用）
    closeDex: function () { dexOpen = false; achOpen = false; }
  };

  // ---------- 大宝箱（探索要素） ----------
  function spawnChest() {
    discoverSpecial('chest');
    var b = createIron(C.W * (0.2 + Math.random() * 0.6), C.dangerY + 52); // 警戒线下方开阔水域生成，不压坠落区虚影
    b.chest = true;
    b.r = 17; b.m = b.r * b.r * 6; // 比礁石轻，不会被砸得太凶
    chest = { b: b, t: 0, life: 14 }; // 14 秒内不点就沉走
    // v340：提示跟随宝箱实体（attach=b），宝箱降落时文字同步下移；life 显式 2.5s，跟随弹字也走生命周期（不再永不消失）
    addPopup(b.x, C.dangerY + 10, '沉大宝箱！点它开启', true, 0, 2.5, 'reward', b); // v343：出现提示统一绿色（与图鉴新发现/开启收益同色）
    audio.blip(392, 0.25, 'triangle', 0.14, 1.5);
  }
  function expireChest() {
    if (chest) {
      burstIron(chest.b.x, chest.b.y);
      phys.remove(chest.b);
      addPopup(C.W / 2, FLOORY - 60, '大宝箱沉入深渊…', false, 0, 1.6); // v325：错过提示，1.6s
    }
    chest = null;
    chestTimer = 75 + Math.random() * 40; // v343：错过沉走后重置间隔拉长（原 40+25rand）
  }
  function openChest() {
    var x = chest.b.x, y = chest.b.y;
    phys.remove(chest.b);
    chest = null;
    chestTimer = 85 + Math.random() * 45; // v343：开启后重置间隔拉长（原 45+30rand）
    var r = Math.random();
    var chestBonus = perkOn('chest5') ? 1.5 : 1; // 成就加成：寻宝猎人
    if (r < 0.68) { // v350：分数档 60%→68%（符文档相应压缩到 12%）
      var gain = Math.round((60 + Math.random() * 90) * cm(scoreMult * chestBonus));
      score += gain; scoreBump = 0.4;
      if (score > best) { best = score; saveNum('mg_best', best); }
      addPopup(x, y - 30, '大宝箱开启 +' + gain, true, 0, 0, 'reward'); // v343：'good'不在 PCOLMAP 会回退蓝灰→改 reward 绿
    } else if (r < 0.80) { // v344：35%(0.4~0.75)→18%(0.6~0.78)；v350：→12%(0.68~0.80)，道具获取整体降低
      // v316：只充已解锁技能（符文道具）；v329：未解锁任何技能时不开符文道具，改发积分
      // （用户："宝箱不能开出未出现的道具，例如符文道具还没激活"）——移除旧"全锁兜底充任意"逻辑
      var keys = ['swap', 'ripple', 'evap', 'flow'].filter(function (k) { return skillUnlocked(k); });
      if (keys.length) {
        var k = keys[(Math.random() * keys.length) | 0];
        var cn = perkOn('chest5') ? 2 : 1; // v350：+2/+3 → +1/+2（宝箱符文收益同步降一档）
        addCharge(k, cn);
        addPopup(x, y - 30, '大宝箱开启：' + runeName(k) + ' +' + cn + ' 充能', true, 0, 0, 'reward');
      } else {
        var g2 = Math.round((60 + Math.random() * 90) * cm(scoreMult * chestBonus));
        score += g2; scoreBump = 0.4;
        if (score > best) { best = score; saveNum('mg_best', best); }
        addPopup(x, y - 30, '大宝箱开启 +' + g2, true, 0, 0, 'reward');
      }
    } else {
      // v329：彩虹滴未曾在图鉴出现（dexSpecial）前不开出，改发积分——同理不提前放出未解锁道具
      if (dexSpecial['rainbow']) {
        nextSpecial = 'rainbow'; nextIron = false; nextRune = null;
        addPopup(x, y - 30, '大宝箱开启：下一滴是彩虹滴！', true, 0, 0, 'reward');
      } else {
        var g3 = Math.round((60 + Math.random() * 90) * cm(scoreMult * chestBonus));
        score += g3; scoreBump = 0.4;
        if (score > best) { best = score; saveNum('mg_best', best); }
        addPopup(x, y - 30, '大宝箱开启 +' + g3, true, 0, 0, 'reward');
      }
    }
    for (var i = 0; i < 12; i++) {
      var ang = Math.random() * Math.PI * 2, sp = 60 + Math.random() * 130;
      parts.push({ type: 'dot', x: x, y: y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 50,
        r: 1.5 + Math.random() * 2, life: 0.55, max: 0.55, color: '#F2C14E' });
    }
    addShake(3, 0.2);
    audio.quest();
    bumpStat('chest');
    dailyProgress('chest');
  }
  function updateChest(dt) {
    if (!chest) {
      chestTimer -= dt;
      if (chestTimer <= 0) spawnChest();
    } else {
      chest.t += dt;
      if (chest.t >= chest.life) expireChest();
    }
    // 滞留任务刷新：进度远超任务生成时的基准（连跳 3 档）时换一个跟上难度的任务
    questStaleT -= dt;
    if (questStaleT <= 0) {
      questStaleT = 4;
      if (quest && quest.bornMax != null && questMaxTier() - quest.bornMax >= 3) {
        makeQuest(questDepth);
        addPopup(C.W / 2, 266, '任务已更新', false, 0, 1.6); // v325：任务切换提示，1.6s
      }
    }
  }

  // ---------- 随机深海事件（无尽模式趣味变量） ----------
  function startSeaEvent(force) {
    var pool = ['surge', 'bless', 'storm'];
    seaEvent.type = force || pool[(Math.random() * pool.length) | 0];
    seaEvent.t = 6;
    seaEvent.t0 = 6;
    var names = {
      surge: '深海涌泉！水滴被轻轻托起',
      bless: '海神甘霖！接下来 3 滴同档',
      storm: '漩涡风暴！水滴被卷起'
    };
    addPopup(C.W / 2, C.dangerY + 24, names[seaEvent.type], true, 0);
    if (seaEvent.type === 'bless') {
      var tier = mostCommonTier();
      seaEvent.data = { tier: tier < 0 ? rollTier() : tier, left: 3 };
    }
    if (seaEvent.type === 'storm') {
      seaEvent.x = C.W * (0.25 + Math.random() * 0.5);
      // v194：锚堆叠区中心（layout.body.stackCy = (dangerY+floorY)/2 = 540+dy）。
      // 旧公式"从容器顶往下 45%"在 v184 容器顶改 0 后静默漂移到 344，漩涡盘
      // （半径110、y 轴压扁 0.55）盘顶压过警戒线 31px——用户报"每次都接近警戒线"
      seaEvent.y = MG.layout.body.stackCy;
    }
    audio.tide();
  }
  function applySeaEvent(dt) {
    var bs = phys.bodies, i, b;
    if (seaEvent.type === 'surge') {
      // v307：上托力 1500→2700——原值与重力（1500）恰好抵消，净加速度为零，水滴只是悬停
      // 根本不会被"托起"（用户："施加的力似乎有点小"）；作用区 190→210，涌泉感更明显
      // v308：上托力回调 2700→1900（净上托 400，"轻轻托起"的温和感；v307 的 2700 过猛）
      // v324：抬升高度减半——用户："深海涌泉力太大了，吹起的水滴太高了，可以减少一半的高度"。
      // 作用区 210→105 + 上托力 1900→1700（净上托 400→200）。两个杠杆都必须动：
      // ① 高度 ≈ 作用区×(1+净上托/重力)，作用区是主项——只砍力最多降 11%，砍半作用区
      //    单滴正好减半（实测 252→126px）；
      // ② 但只砍作用区会更糟：底部滴以更集中的速度（出口 410→290px/s）撞上半堆，
      //    同档滴被压紧合成、产物继承撞速+反冲上抛，混合堆堆顶反而 234→316px 变高
      //    （sim_surge.js 实测）。同步把力降到 1700（出口速度 204px/s）让撞堆变缓，
      //    堆叠局面的抬升才真正减半。
      // v329：修复"轻轻托起"失效——净上托 200 在密集堆叠下被挤压抵消、几乎看不出抬升
      // （用户："深海涌泉不能轻轻托起底部水滴"）。恢复可见的温和上托：力 1700→2000
      // （净上托 200→500）、作用区 105→160（更多底部滴被卷入），底部滴明显上飘后回落，
      // 仍远低于 v307 的猛烈上抛，保持"轻轻"手感。
      // v334：回调过冲——用户："深海涌泉（温和托起底部水滴）托起的太高了，不合理！"
      // v329 组合高度 ≈ 160×(1+500/1500) = 213px，超出"温和"区间。回调到 力 2000→1800
      // （净上托 500→300）+ 作用区 160→125：高度 ≈ 125×(1+300/1500) = 150px——
      // 高于 v324 的 119px（看不见）与 v329 的 213px（太高）之间取温和可见档；
      // 出口速度 sqrt(2·300·125) ≈ 274px/s（v329 为 400），撞堆也更缓。
      for (i = 0; i < bs.length; i++) {
        b = bs[i];
        if (b.iron) continue;
        if (b.y + b.r > FLOORY - 125) b.vy -= 1800 * dt;
      }
      if (Math.random() < 0.5) {
        parts.push({ type: 'dot', x: 30 + Math.random() * (C.W - 60), y: FLOORY, vx: 0,
          vy: -120 - Math.random() * 90, r: 1.5 + Math.random() * 2, life: 0.8, max: 0.8,
          color: 'rgba(220,244,255,0.8)' });
      }
    } else if (seaEvent.type === 'storm') {
      // v328：卷力大幅增强（原 430 远小于重力 1500，卷不动水滴；用户"漩涡风暴卷不起水滴"）
      // ——向心吸力 + 切向旋流双分量，核心区力 > 重力，真正把水滴卷入中心、卷起重排
      var R = 360;
      for (i = 0; i < bs.length; i++) {
        b = bs[i];
        if (b.iron) continue; // 礁石沉底，不被卷动
        var dx = seaEvent.x - b.x, dy = seaEvent.y - b.y, d = Math.sqrt(dx * dx + dy * dy);
        if (d > 6 && d < R) {
          var ux = dx / d, uy = dy / d;                 // 指向中心的单位向量（向心）
          var sp = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
          var damp = sp > 900 ? Math.max(0.3, 1 - (sp - 900) / 700) : 1;
          var f = 2400 * Math.pow(1 - d / R, 1.4) * damp; // 核心强(>重力)、边缘弱，平滑衰减
          b.vx += (ux * f - uy * f * 1.15) * dt;          // 向心吸力 + 切向旋流（螺旋卷入）
          b.vy += (uy * f + ux * f * 1.15) * dt;
        }
      }
    }
    // bless 无持续效果：在 tryDrop 里消耗
  }
  function endSeaEvent() {
    seaEvent.type = null;
    seaEvent.data = null;
    seaEvent.timer = 30 + Math.random() * 20;
  }
  var seaWarn = null;     // v372：事件来袭预警（风暴/涌泉前 1.6s 屏幕泛光+文字预警，给反应时间；甘霖为增益即时触发）
  var SEA_WARN_T = 1.6;
  function updateSeaEvent(dt) {
    if (tide.phase === 'active') return; // 保底：涨潮期间冻结事件节奏，避免双重混乱
    if (seaWarn) { // 预警阶段：倒计时结束后正式触发事件
      seaWarn.t -= dt;
      if (seaWarn.t <= 0) { var tp = seaWarn.type; seaWarn = null; startSeaEvent(tp); }
      return;
    }
    if (!seaEvent.type) {
      seaEvent.timer -= dt;
      if (seaEvent.timer <= 0) {
        var pool = ['surge', 'bless', 'storm'];
        var t = pool[(Math.random() * pool.length) | 0];
        if (t === 'bless') startSeaEvent('bless');   // 甘霖是增益，即时触发无需预警
        else seaWarn = { type: t, t: SEA_WARN_T };     // 风暴/涌泉先预警再触发
      }
    } else {
      seaEvent.t -= dt;
      applySeaEvent(dt);
      if (seaEvent.t <= 0) endSeaEvent();
    }
  }
  // 事件视觉（在游戏区坐标系内绘制）
  // v335：荧光浮游粒子池（用户从候选 F-K 中选 F，交互示例 test/storm_designs_demo2.html）——
  // 90 颗发光粒子模块级初始化一次；差速旋转（内快外慢）自然涌现漩涡，不画任何"线条漩涡"。
  var STORM_PS = [];
  for (var spi = 0; spi < 90; spi++) {
    var sr = 0.12 + Math.pow(Math.random(), 0.75) * 0.88;
    STORM_PS.push({ a0: Math.random() * Math.PI * 2, r: sr,
      sp: (2.2 / (0.3 + sr)) * (0.8 + Math.random() * 0.4),
      sz: 1.2 + Math.random() * 2.6, warm: Math.random() < 0.25 });
  }

  function drawEventVfx() {
    if (seaEvent.type === 'storm') {
      // 首尾各 0.8s 淡入淡出，避免漩涡凭空出现/消失
      var fadeK = Math.min(1, (seaEvent.t0 - seaEvent.t) / 0.8, seaEvent.t / 0.8);
      if (fadeK <= 0) return;
      ctx.save();
      ctx.globalAlpha = fadeK;
      ctx.translate(seaEvent.x, seaEvent.y);
      var R = 170;
      // ① 中央幽光（漩涡眼区域微亮）
      ctx.fillStyle = grad('stormPlankton', function () {
        var gg = ctx.createRadialGradient(0, 0, 0, 0, 0, 56);
        gg.addColorStop(0, 'rgba(140,220,230,0.3)');
        gg.addColorStop(1, 'rgba(140,220,230,0)');
        return gg;
      });
      ctx.beginPath(); ctx.arc(0, 0, 56, 0, Math.PI * 2); ctx.fill();
      // ② 荧光浮游：每颗粒子沿自身轨道差速旋转（内快外慢），带 5 影彗尾拖影——
      //    粒子云整体涌现出漩涡形态，零机感线条，纯"活的深海发光水"
      ctx.lineCap = 'round';
      for (var pi = 0; pi < STORM_PS.length; pi++) {
        var p = STORM_PS[pi];
        var rr = p.r * R;
        var aa = p.a0 + time * p.sp;
        for (var k = 0; k < 5; k++) {
          var ba = aa - k * 0.035;
          var x2 = Math.cos(ba) * rr, y2 = Math.sin(ba) * rr * 0.82;
          var pa = (1 - k / 5) * (0.35 + 0.45 * Math.sin(time * 2 + p.a0 * 3));
          ctx.beginPath();
          ctx.fillStyle = p.warm
            ? 'rgba(190,240,250,' + Math.max(0, pa).toFixed(3) + ')'
            : 'rgba(150,225,235,' + Math.max(0, pa).toFixed(3) + ')';
          ctx.arc(x2, y2, p.sz * (1 - k * 0.15), 0, Math.PI * 2);
          ctx.fill();
        }
      }
      // ③ 漩涡眼亮点（微脉动）
      ctx.beginPath();
      ctx.fillStyle = 'rgba(235,250,255,' + (0.5 + 0.15 * Math.sin(time * 2.5)).toFixed(2) + ')';
      ctx.arc(0, 0, 4, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    } else if (seaEvent.type === 'surge') {
      var g = grad('surge' + Math.round(FLOORY), function () {
        var gg = ctx.createLinearGradient(0, FLOORY - 140, 0, FLOORY);
        gg.addColorStop(0, 'rgba(160,230,255,0)');
        gg.addColorStop(1, 'rgba(160,230,255,0.18)');
        return gg;
      });
      ctx.fillStyle = g;
      ctx.fillRect(0, FLOORY - 140, C.W, 140);
    }
  }

  // ---------- 结算 / 重开 ----------
  // v327：复活（原"看广告复活"）已移除——先不做广告（结算页仅保留双倍/分享/重开）
  function doDouble() {
    // 不再看广告：直接双倍（广告占位已按需求移除）
    doubled = true;
    score *= 2;
    if (score > best) { best = score; saveNum('mg_best', best); }
  }
  // 直接复活（v328 恢复：用户"是不要广告，复活动能还在，要直接复活"）——清空越线判负状态、
  // 保留当前局面与得分，给全体短暂宽限让玩家抢救；先不做广告，故无 ads.show 门控。
  // ★ v330：复活清场（用户："复活时要移除适当的水滴！结算页签弹不出来"）——不移滴的话，
  // 越线堆原样留在场上，宽限 1.5s + 引信 1.1s 耗尽后立刻二次判负，玩家视角"复活点了、
  // 结算页马上又弹回来（游戏回不去）"。规则：普通水滴（铁礁/宝箱除外；冰冻/特殊滴也是
  // 水滴照移）自堆顶向下移除，直到剩余堆顶退到「警戒线下方 70px」安全区内才停手；
  // 被移除的水滴化作气泡消散（不给分——复活是抢救不是奖励）。
  function doRevive() {
    state = 'play';
    dangerAlert = 0; dangerRemain = 0; // v369：清缓冲计时（v368 起越线缓冲已统一 3s，首死宽限概念移除）
    var bs = phys.bodies, i, j;
    var drops = [];
    for (i = 0; i < bs.length; i++) { if (!bs[i].iron && !bs[i].chest) drops.push(bs[i]); }
    drops.sort(function (a, c) { return (a.y - a.r) - (c.y - c.r); }); // 堆顶（y 最小）先移
    var keep = C.dangerY + 70; // 复活安全线：剩余堆顶至少低于警戒线 70px（5 的倍数，v191 规范）
    var removed = 0;
    for (i = 0; i < drops.length; i++) {
      var d = drops[i];
      if (d.y - d.r >= keep) break; // 已退到安全区，停止移除
      var idx = bs.indexOf(d);
      if (idx >= 0) bs.splice(idx, 1);
      removed++;
      parts.push({ type: 'ring', x: d.x, y: d.y, r: d.r * 0.6, life: 0.5, max: 0.5, color: '#BFE3F7' });
      for (j = 0; j < 6; j++) {
        var ang = Math.random() * Math.PI * 2, sp = 40 + Math.random() * 90;
        parts.push({ type: 'dot', x: d.x, y: d.y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 60,
          r: 1.5 + Math.random() * 2, life: 0.5, max: 0.5, color: '#CFEAF9' });
      }
    }
    for (i = 0; i < bs.length; i++) { bs[i].dangerT = 0; bs[i].grace = 1.5; } // 全体 1.5s 抢救宽限
    reviveCount++;
    addPopup(C.W / 2, 300, removed > 0 ? '复活！清走 ' + removed + ' 滴 · 继续深潜' : '复活！继续深潜', true, 0);
    audio.blip(660, 0.22, 'sine', 0.12, 1.2);
  }
  // 返回主页（v234 重开确认新增）：局面数据不动（主页「开始游戏」会走 restart() 全量重置），仅切态+收起瞄准；
  // v237：带水域扫屏过渡动画（menuTrans，渲染层消费）
  function goHome() {
    state = 'menu';
    aiming = false;
    confirmOpen = false; // v273：返回主页顺带收起确认弹窗（防跨态残留）
    // v297 整体核查：弹层标志一并收起——局内开着图鉴/三选一/分享面板时返回主页，
    // 若不清理，menu 态会画出 ach 面板、再次开局会带着旧面板（跨态残留）
    dexOpen = false; achOpen = false; ngOpen = false; shareOpen = false;
    // 涟漪从「返回主页」按钮中心荡开（内容层坐标）
    var br = MG.layout.confirmBtnRect(0);
    startTransition('out', C.W / 2, br.y + br.h / 2);
  }

  function restart() {
    ngEndRun(); // 二周目词缀只在单局内生效（普通重开回到常态）
    phys.bodies.length = 0;
    chest = null; // v297 整体核查：清场后宝箱实体必须一并清——否则新局前 14s 显示幽灵宝箱（可白捡奖励）
    confirmOpen = false;
    setOpen = false; setClearOpen = false; // v197/v317：新局关闭设置弹窗与清档确认（防跨局残留）
    // v297 整体核查：图鉴/成就/三选一/分享面板同样跨局清空——局内开着图鉴点重开，
    // 旧面板会原样带进新对局；三选一残留还会让 ngStartRun 用过期词缀开第二局
    dexOpen = false; achOpen = false; ngOpen = false; shareOpen = false;
    score = 0; displayScore = 0; scoreBump = 0;
    if (offlineGain) { // 离线收益：开局自动入账
      score += offlineGain.gain; displayScore = score;
      var om = offlineGain.mins;
      addPopup(C.W / 2, 300, '离线收益 · 离开 ' + (om >= 60 ? Math.floor(om / 60) + ' 时 ' + (om % 60) + ' 分' : om + ' 分钟') + '，深海攒下 ' + offlineGain.gain + ' 分', true, 0);
      parts.push({ type: 'ring', x: C.W / 2, y: annY(300), r: 46, life: 0.9, max: 0.9, color: '#F2C14E' });
      audio.blip(880, 0.16, 'sine', 0.1, 0.5);
      offlineGain = null;
    }
    combo = 0; comboTimer = 0; cooldown = 0; maxCombo = 0;
    doubled = false;
    reviveCount = 0; // 新局重置复活次数（v328）
    dangerAlert = 0; dangerRemain = 0; // v369：新局顺手清（每帧由 checkDanger 重算，避免跨局首帧残留）
    skillCharge = { swap: 0, ripple: 0, evap: 0, flow: 0 };
    reefCountPrev = 0; // v357：礁石税提示计数随局重置
    seaCount = 0; scoreMult = 1;
    // v371：新局清深海事件（风暴/祝福/涌泉…），避免上局残留事件跨局继承（上局死在事件进行中时尤甚）
    seaEvent.type = null; seaEvent.data = null; seaEvent.t = 0; seaEvent.t0 = 6; seaEvent.timer = 24 + Math.random() * 14;
    seaWarn = null; // v372：预警态一并清空，避免残留「X 将至」泛光跨局
    evapMode = false; rippleMode = false; flowMode = false; flowPick = null; rainHint = 0;
    auroraNext = 0; // 极光庇护只在单次合成内生效
    levelElapsed = 0; runCounted = 0;
    nextTier = rollTier();
    rollNextDrop();
    aimX = C.W / 2;
    popups.length = 0; parts.length = 0; rippleQueue.length = 0;
    tide.phase = 'idle'; tide.timer = C.tide.cycleInterval; tide.progress = 0; tide.banner = 0; // v315：同上
    endlessT = 0; rampStage = 0; climaxMark = 0;
    makeQuest(0);
    // 成就加成：深海富豪开局随机技能充能 +1（v350：+2→+1，道具获取整体降低）
    if (perkOn('score2k')) {
      var pk = C.skills[(Math.random() * C.skills.length) | 0];
      addCharge(pk.key, 1);
      addPopup(C.W / 2, 280, '深海富豪：「' + pk.name + '」开局充能 +1', false, 0);
    }
    state = 'play';
  }

  function buildOverButtons() {
    overButtons = [];
    // v299：按钮重设计（用户："按钮大小、间距等重新设计，不要太紧凑"）——
    // 264×48（原 240×40）、间距 14（原 10）；v300 恢复标题行后按钮区从 py+190 起（统计行 py+184 之下）
    var bw = 264, bh = 48, gap = 14, x = (C.W - bw) / 2;
    // 可用区：统计文字之下 → 面板底部留白；按钮组在该区内垂直居中
    // （面板几何走 MG.layout.overRect()，渲染 drawOver 与命中此处同源）
    var ovr = MG.layout.overRect();
    var areaTop = ovr.y + 190, areaBottom = ovr.y + ovr.h - 26;
    var n = (doubled ? 0 : 1) + 1 + 2; // 双倍/复活/分享/重开（v328：复活按钮恢复——直接复活，无广告）
    var groupH = n * bh + (n - 1) * gap;
    var y = areaTop + (areaBottom - areaTop - groupH) / 2;
    if (!doubled) {
      overButtons.push({ x: x, y: y, w: bw, h: bh, label: '结算双倍', action: doDouble });
      y += bh + gap;
    }
    overButtons.push({ x: x, y: y, w: bw, h: bh, label: '复活继续', action: doRevive });
    y += bh + gap;
    overButtons.push({ x: x, y: y, w: bw, h: bh, label: '分享战报', action: openShare });
    y += bh + gap;
    // v274：深渊潜航入口撤出结算页（用户："结算页要删除深渊潜航相关的按钮"）
    overButtons.push({ x: x, y: y, w: bw, h: bh, label: '重新开始', action: restart });
  }

  // ---------- 命中区域（圆形按钮；坐标全部由 layout 派生，与绘制同源）----------
  // ★ v197 第一排重排（用户："图标也太丑了，成就按钮先隐藏掉吧。游戏内这个地方改成设置按钮，
  //   用来弹出设置音效、音乐和震动，右侧的音量按钮移除掉"）：成就按钮（奖杯）与右上角
  //   音量钮整套移除，左上角原位（原奖杯位）新增设置钮——半径引 rowBtnR 真源，
  //   样式/命中与绘制同源（render.js drawSetBtn，白底圆+蓝灰环+齿轮图标）
  var setBtn = { cx: MG.layout.hud.setCx, cy: MG.layout.hud.trophyCy, r: MG.layout.hud.rowBtnR, pressT: 0 };
  // 底部六钮（v195）：圆心/半径一律引 layout.band 真源（btnCx=35+i×(W−70)/5 均匀派生、
  // btnR=20 统一半径）——旧写死 45/115/185/255/325/395 + restart r15：左缘距 25≠右缘距 10
  var bookBtn = { cx: MG.layout.band.btnCx[0], cy: MG.layout.band.btnCy, r: MG.layout.band.btnR, pressT: 0 };
  var restartBtn = { cx: MG.layout.band.btnCx[5], cy: MG.layout.band.btnCy, r: MG.layout.band.btnR, pressT: 0 }; // 游戏内重开（带确认），右下角
  // 「深渊潜航」无局内悬浮钮：入口在结算页按钮组（主流 NG+ 模式选择设计）
  // 底部一排共 6 个按钮（图鉴 + 4 道具 + 重开）：35/105/175/245/315/385 均匀分布、
  // 间距 70、左右缘距各 15（v195，全部由 layout.band 派生，改宽度自动重排）
  var SKILL_BTNS = [
    { key: 'swap',   cx: MG.layout.band.btnCx[1], cy: MG.layout.band.btnCy, r: MG.layout.band.btnR, pressT: 0 },
    { key: 'ripple', cx: MG.layout.band.btnCx[2], cy: MG.layout.band.btnCy, r: MG.layout.band.btnR, pressT: 0 },
    { key: 'evap',   cx: MG.layout.band.btnCx[3], cy: MG.layout.band.btnCy, r: MG.layout.band.btnR, pressT: 0 },
    { key: 'flow',   cx: MG.layout.band.btnCx[4], cy: MG.layout.band.btnCy, r: MG.layout.band.btnR, pressT: 0 }
  ];
  fit(); // 首次适配（按钮已定义，底部元素可同步贴底）

  // 重开确认弹窗（v234 三按钮：返回主页/重新开始/返回游戏）——命中几何唯一真源 layout.confirmBtnRect，不再另存按钮坐标
  var confirmOpen = false;

  // ---------- 设置弹窗（v197：音效/音乐/震动三开关；v317：+清空存档） ----------
  // 旧静音入口（MUTE 钮 + mg_mute 单键）拆除，改为三开关：音效复用旧键 mg_mute（1=静音，
  // 向后兼容）、音乐 mg_music（缺失时继承旧 mute 反值）、震动 mg_vib（默认开）。
  var setOpen = false;
  // v317 清空存档：设置面板第 4 行 → 二级确认（drawSetClear）→ clearSaveData。
  // setClearOpen 只在 setOpen 为真时打开，所有按 setOpen 门禁的输入/更新天然覆盖它
  var setClearOpen = false;
  function toggleSet(i) {
    if (i === 0) { audio.sfxOn = !audio.sfxOn; saveFlag('mg_mute', !audio.sfxOn); }
    else if (i === 1) {
      audio.musicOn = !audio.musicOn; saveFlag('mg_music', audio.musicOn);
      if (audio.musicOn) audio.bgm.start(); else audio.bgm.stop();
    } else { audio.vibOn = !audio.vibOn; saveFlag('mg_vib', audio.vibOn); if (audio.vibOn) hap(20); }
    audio.blip(660, 0.08, 'sine', 0.06, 0.3); // 开关反馈（音效刚开启时即听到，符合直觉）
  }
  // 全部存档键（与 core.js/systems.js 各保存点一一对应；mg_ver 一并清，重启时 migrateSave 重打）
  var SAVE_KEYS = ['mg_rune', 'mg_peak', 'mg_seen', 'mg_best', 'mg_life', 'mg_dex', 'mg_ver',
    'mg_mute', 'mg_music', 'mg_vib', 'mg_tut', 'mg_ng', 'mg_daily', 'mg_dchal', 'mg_friends'];
  // 清空存档 = 重置游戏至初始状态：删键后必须整页重载——各模块的运行时状态（分数/图鉴/
  // 生涯峰/任务…）都是加载时初始化的模块级变量，只删存储会让内存与存档不一致
  function clearSaveData() {
    for (var i = 0; i < SAVE_KEYS.length; i++) MG.platform.remove(SAVE_KEYS[i]);
    setClearOpen = false; setOpen = false;
    MG.platform.reload();
  }

  function inRect(p, r) {
    return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
  }
  function inCircle(p, c) {
    var dx = p.x - c.cx, dy = p.y - c.cy;
    return dx * dx + dy * dy <= (c.r + 5) * (c.r + 5);
  }
  function toLocal(e) {
    var rect = canvas.getBoundingClientRect();
    // 内容层游戏块垂直居中偏移 renderOy（菜单态 0），触摸 y 同量补偿还原块内坐标
    return {
      x: (e.clientX - rect.left) / view.s - BX,
      y: (e.clientY - rect.top) / view.s - renderOy
    };
  }
  function hitButton(p) {
    for (var i = 0; i < overButtons.length; i++) {
      var b = overButtons[i];
      if (p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h) return b;
    }
    return null;
  }
  function tryDrop() {
    if (cooldown > 0) return;
    var nb;
    // 甘霖馈赠：事件期间最多 3 滴使用馈赠档位（仅对普通滴生效）
    var useTier = nextTier;
    if (seaEvent.type === 'bless' && seaEvent.data && seaEvent.data.left > 0) {
      useTier = seaEvent.data.tier;
      seaEvent.data.left--;
      nextIron = false; nextSpecial = null; nextRune = null; // v369：祝福期间不被旧预览标志覆盖（同 2.1 bug）
    }
    if (nextIron && ironCount() < C.iron.maxActive) {
      createIron(clampAim(aimX), C.spawnY);
      addShake(2, 0.15);
    } else {
      nb = phys.create(clampAim(aimX), C.spawnY, useTier, 0, 0);
      if (nextSpecial) { nb.special = nextSpecial; nb.specialT = 0; discoverSpecial(nextSpecial); }
      else if (nextRune) {
        nb.rune = nextRune;
        discoverSpecial('rune');
        if (!runeHintShown) {
          runeHintShown = true;
          addPopup(C.W / 2, 244, '带符文的水滴：合成即可为技能充能', false, 0, 2.0, 'todo'); // v325：一次性教程提示，2.0s 读全；v331 归 todo
        }
      }
      if (ng.active && ng.active.ice && Math.random() < ng.active.ice) nb.ngIce = true; // 二周目「冰封之海」
      unlockTier(useTier); // v371：解锁实际投放档（祝福覆盖后用的是 useTier，而非覆盖前的预览档 nextTier）
    }
    cooldown = C.dropCooldown;
    audio.drop();
    dropCount++;
    if (dropCount >= TUT_STEPS.length && !tutDone) { tutDone = true; saveFlag('mg_tut', 1); }
    nextTier = rollTier();
    rollNextDrop();
    // v369：祝福期间虚影预览显示祝福档位，且不被重新 roll 出的特殊滴/礁石覆盖
    if (seaEvent.type === 'bless' && seaEvent.data && seaEvent.data.left > 0) { nextTier = seaEvent.data.tier; nextIron = false; nextSpecial = null; nextRune = null; }
    aimX = clampAim(aimX);
  }

  // ---------- 输入 ----------
  // 音频解锁兜底：任何手势（按下/抬起/键盘）都尝试恢复 AudioContext
  window.addEventListener('pointerup', function () { audio.ensure(); });
  window.addEventListener('keydown', function () { audio.ensure(); });
  canvas.addEventListener('pointerdown', function (e) {
    e.preventDefault();
    audio.ensure();
    var p = toLocal(e);
    lastPointer = p;
    if (menuTrans.dir && performance.now() / 1000 - menuTrans.t0 < menuTrans.dur) return; // v237：过渡动画期间屏蔽输入
    if (confirmOpen) {
      // 重开确认弹窗（v300 恢复标题栏）：右上 ✕ 关闭；三按钮 返回主页/重新开始/返回游戏；点面板外也视为返回游戏
      if (inRect(p, MG.layout.confirmCloseRect())) { confirmOpen = false; return; }
      if (inRect(p, MG.layout.confirmBtnRect(0))) { confirmOpen = false; goHome(); return; }
      if (inRect(p, MG.layout.confirmBtnRect(1))) { confirmOpen = false; restart(); return; }
      confirmOpen = false;
      return;
    }
    // v317 清空存档二级确认（叠在设置面板之上，优先于 setOpen 分支）：
    // ✕/取消 = 返回设置面板；确认清空 = 执行清档并重载；点面板外 = 取消
    if (setClearOpen) {
      if (inRect(p, MG.layout.setClearCloseRect())) { setClearOpen = false; return; }
      if (inRect(p, MG.layout.setClearBtnRect(0))) { setClearOpen = false; return; }
      if (inRect(p, MG.layout.setClearBtnRect(1))) { clearSaveData(); return; }
      setClearOpen = false;
      return;
    }
    if (setOpen) {
      // v197 设置弹窗：点三个开关行切换，点 ✕ 或面板外关闭（与重开确认同门禁）；
      // v317 第 4 行「清空存档」点行开二级确认（setClearOpen），不直接执行
      if (inRect(p, MG.layout.setCloseRect())) { setOpen = false; return; }
      for (var si = 0; si < 4; si++) {
        if (inRect(p, MG.layout.setRowRect(si))) {
          if (si === 3) { setClearOpen = true; audio.blip(520, 0.1, 'sine', 0.08, 0.7); return; }
          toggleSet(si); return;
        }
      }
      setOpen = false;
      return;
    }
    if (shareOpen) {
      // 战报卡片：复制文案 / 点面板外关闭
      if (inRect(p, shareCopyBtn)) {
        copyShareText();
        return;
      }
      shareOpen = false;
      return;
    }
    // 开始界面：响应「开始游戏」与设置钮（音效/音乐/震动；v197 起菜单也放设置入口——
    // BGM 在菜单就播放，菜单必须有音频入口，否则只剩开始按钮）；
    // 面板打开时放行到下方 dexOpen/achOpen 分支，否则面板内点击会被这里提前吞掉
    if (state === 'menu' && !achOpen && !dexOpen && !setOpen) {
      // 主页功能磁贴（v233）：每日任务/每日挑战/成就/榜单/图鉴/分享
      for (var mtk = 0; mtk < menuTiles.length; mtk++) {
        var mt = menuTiles[mtk];
        if (inRect(p, MG.layout.menuTileRect(mt.side, mt.i))) {
          mt.pressT = 0.16;
          audio.blip(600, 0.1, 'sine', 0.08, 0.5);
          mt.act();
          return;
        }
      }
      // 设置入口（未开局即可调音效/音乐/震动）；命中区与绘制一致 +hudInset
      if (inCircle(p, { cx: setBtn.cx, cy: setBtn.cy + hudInset, r: setBtn.r })) { setBtn.pressT = 0.16; setOpen = true; return; }
      if (inRect(p, menuStartBtn)) {
        menuStartBtn.pressT = 0.2;
        audio.blip(660, 0.12, 'sine', 0.1, 0.4);
        restart();
        // 涟漪从开始按钮中心荡开（内容层坐标）
        startTransition('in', C.W / 2, menuStartBtn.y + menuStartBtn.h / 2);
      }
      return;
    }
    if (dexOpen) {
      if (inRect(p, dexCloseBtn) || !inRect(p, DEX_PANEL)) { dexOpen = false; return; }
      // 分节切换
      for (var sc = 0; sc < 2; sc++) {
        if (inRect(p, dexSecRect(sc))) {
          dexSec = sc; dexSelTier = -1; dexSelStage = -1; dexSelSp = -1;
          audio.blip(520 + sc * 80, 0.08, 'sine', 0.06, 0.3); return;
        }
      }
        if (dexSec === 0) {
          for (var ti2 = 0; ti2 < T.length; ti2++) {
            if (inRect(p, tierCellRect(ti2))) { dexSelTier = ti2; dexSelStage = -1; dexSelSp = -1; audio.blip(620, 0.08, 'sine', 0.06, 0.3); return; }
          }
        } else {
          // 海域演进行：点右侧特殊滴槽位看滴的说明，点行其他区域看海域说明
          for (var st = 0; st < C.seaStages.length; st++) {
            for (var slot = 0; slot < 2; slot++) {
              if (inRect(p, spSlotRect(st, slot))) {
                // 生涯未抵达的海域：槽位是"？？？"悬念位，点击落到整行（显示海域说明），不选中滴
                if (Math.max(totalScore(), careerPeak) < C.seaStages[st].at) break;
                var spKeys = STAGE_SP_SLOTS[st] || STAGE_SP_SLOTS[0];
                dexSelSp = slot === 0 ? spKeys[0] : spKeys[1];
                dexSelTier = -1; dexSelStage = -1;
                audio.blip(620, 0.08, 'sine', 0.06, 0.3); return;
              }
            }
          }
          for (var st2 = 0; st2 < C.seaStages.length; st2++) {
            if (inRect(p, stageRowRect(st2))) { dexSelStage = st2; dexSelTier = -1; dexSelSp = -1; audio.blip(620, 0.08, 'sine', 0.06, 0.3); return; }
          }
        }
      return;
    }
    if (achOpen) {
      if (inRect(p, dexCloseBtn) || !inRect(p, DEX_PANEL)) { achOpen = false; achDrag = null; return; }
      // v241 拆分：页签条已移除，四视图由主页磁贴直达；仅「每日挑战」视图有开始按钮
      if (dexTab === 2 && inRect(p, dchalBtnRect())) { audio.blip(660, 0.1, 'triangle', 0.1, 1.4); dchalStart(); return; }
      // v243 成就视图：单列列表拖拽滚动（成就卡无点击交互，面板内按下即开始拖拽）
      if (dexTab === 0) achDrag = { y: p.y, s0: achScroll };
      return;
    }
    // v197：左上角设置钮（音效/音乐/震动弹窗；原静音/奖杯位）——命中区 +hudInset 与 HUD 平移一致
    if (inCircle(p, { cx: setBtn.cx, cy: setBtn.cy + hudInset, r: setBtn.r })) { setBtn.pressT = 0.16; setOpen = true; return; }
    if (inCircle(p, bookBtn)) {
      bookBtn.pressT = 0.16; dexOpen = true; achOpen = false;
      // 默认选中与分节匹配的条目（说明区开局即有内容，不显"未发现"空态）
      dexSelTier = -1; dexSelSp = -1; dexSelStage = -1;
      if (dexSec === 0) {
        for (var dt = T.length - 1; dt >= 0; dt--) if (dexUnlocked[dt]) { dexSelTier = dt; break; }
        if (dexSelTier < 0) dexSelTier = 0;
      } else {
        dexSelStage = seaStage();
      }
      return;
    }
    // 「深渊潜航」：词缀三选一弹窗（结算页/局内点卡片开跑，点外关闭）
    if (ngOpen) {
      for (var ni = 0; ni < ngPickRects.length; ni++) {
        if (inRect(p, ngPickRects[ni])) { ngStartRun(ngPicks[ni]); return; }
      }
      ngOpen = false;
      return;
    }
    if (state === 'play') {
      if (inCircle(p, restartBtn)) { restartBtn.pressT = 0.16; confirmOpen = true; return; }
      for (var i = 0; i < SKILL_BTNS.length; i++) {
        if (inCircle(p, SKILL_BTNS[i])) { SKILL_BTNS[i].pressT = 0.16; useSkill(SKILL_BTNS[i].key); return; }
      }
      // 宝箱：点击开启（点击范围放宽 14px，手机上好点）
      if (chest) {
        var cdx = p.x - chest.b.x, cdy = p.y - chest.b.y;
        if (cdx * cdx + cdy * cdy <= (chest.b.r + 14) * (chest.b.r + 14)) { openChest(); return; }
      }
    }
    if (state === 'over') {
      var b = hitButton(p);
      if (b) b.action();
      return;
    }
    if (evapMode) {
      var ball = ballAt(p);
      // v366：退潮时点礁石直接拒绝（不扣充能）——只有涨潮才能消除礁石
      if (ball && ball.iron && tide.progress < C.iron.tideNeed) {
        flashSkill('evap', '退潮中 · 需涨潮才能蒸发礁石');
        return;
      }
      // v357：点礁石要 2 次充能，不足时提示而不是硬扣（否则充能会被扣成负数）
      if (ball && ball.iron && skillCharge.evap < skillCost('evap') * C.iron.evapCost) {
        flashSkill('evap', '蒸发礁石需 ' + (skillCost('evap') * C.iron.evapCost) + ' 次充能');
        return;
      }
      if (ball) evaporate(ball);
      else evapMode = false;
      return;
    }
    if (flowMode) {
      var fb = ballAt(p);
      if (fb && !fb.iron && !fb.chest) {
        if (!flowPick) { flowPick = fb; audio.blip(700, 0.08, 'sine', 0.06, 0.3); }
        else if (fb === flowPick) { flowPick = null; } // 点自己 = 取消选择
        else flowSwap(flowPick, fb);
      } else if (!fb) { flowMode = false; flowPick = null; } // 点空白处退出
      return;
    }
    if (rippleMode) {
      castRipple(p.x, p.y);
      return;
    }
    aimX = clampAim(p.x);
    aiming = true;
  });
  canvas.addEventListener('pointermove', function (e) {
    var p = toLocal(e);
    lastPointer = p;
    // v243 成就列表拖拽滚动：优先于瞄准逻辑（面板打开时瞄准本就被门禁挡住）
    if (achDrag && achOpen && dexTab === 0) {
      achScroll = Math.max(0, Math.min(achDrag.s0 + (achDrag.y - p.y), achMaxScroll()));
      return;
    }
    if (state !== 'play' || dexOpen || achOpen || setOpen || ngOpen || shareOpen || confirmOpen || evapMode || flowMode) return;
    aimX = clampAim(p.x);
  });
  canvas.addEventListener('pointerup', function (e) {
    achDrag = null; // v243 成就列表拖拽结束
    if (!aiming || state !== 'play' || dexOpen || achOpen || setOpen || ngOpen || shareOpen || confirmOpen || evapMode || flowMode || rippleMode) { aiming = false; return; }
    aiming = false;
    aimX = clampAim(toLocal(e).x);
    tryDrop();
  });
  canvas.addEventListener('pointercancel', function () { aiming = false; achDrag = null; });
  // v243 成就列表滚轮滚动（桌面调试用，手机走拖拽）
  canvas.addEventListener('wheel', function (e) {
    if (achOpen && dexTab === 0) {
      e.preventDefault();
      achScroll = Math.max(0, Math.min(achScroll + e.deltaY, achMaxScroll()));
    }
  }, { passive: false });

  // ---------- 更新 ----------
  function update(dt) {
    // 海域换色渐变计时：任何状态都推进（面板/结算打开时背景过渡不冻结）
    if (seaFade) { seaFade.t += dt; if (seaFade.t >= seaFade.dur) seaFade = null; }
    if (state === 'menu') { time += dt; updateFx(dt); return; } // 开始界面：只跑视觉动画
    // v327：广告占位整段移除（先不做广告）
    // 弹层暂停（v240）：图鉴/成就殿堂/设置/二周目选择/分享卡/重开确认任一打开时游戏冻结——
    // 潮汐计时、冷却、物理、判负计时全部停走；time 继续推进（水波/气泡等环境动画保持流动），
    // 关闭弹层后自动恢复。menu 态已被上方分支提前返回，主页面板不受影响。
    if (dexOpen || achOpen || setOpen || ngOpen || shareOpen || confirmOpen) {
      time += dt;
      updateFx(dt);
      return;
    }
    if (state !== 'play') { time += dt; updateFx(dt); return; } // 结算页：背景保持流动（仅物理冻结）

    ironN = ironCount(); // v369：每帧重算在场礁石数缓存（reefTax/updateReefHint 读此值）
    time += dt;
    if (rainHint > 0) rainHint -= dt;
    cooldown = Math.max(0, cooldown - dt);

    levelElapsed += dt; // 本局已进行时长（顶部计时显示用）
    checkDexGates();
    // v341：深渊潜航免门槛（unlockScore=0、ng.unlocked 恒 true），移除原 5 万分解锁逻辑
    // 海域演进：累计分跨过里程碑 → 世界换色（1.8s 渐变过渡）+ 弹报
    var stg = seaStage();
    if (stageSeen < 0) stageSeen = stg;
    else if (stg > stageSeen) {
      seaFade = { from: stageSeen, to: stg, t: 0, dur: 1.8 };
      stageSeen = stg;
      addPopup(C.W / 2, 285, '海域演进 · 潜入「' + C.seaStages[stg].name + '」', true, 0);
      parts.push({ type: 'ring', x: C.W / 2, y: annY(285), r: 40, life: 0.9, max: 0.9, color: '#7FD4FF' });
      audio.big();
    }
    achTick -= dt;
    if (achTick <= 0) { achTick = 1; checkAchievements(); checkCollection(); checkDailyChallenge(); }
    if ((seenTick += dt) >= 30) { seenTick = 0; saveNum('mg_seen', Date.now()); } // 离线收益心跳

    updateTide(dt);
    phys.step(dt);
    applyBuoyancy(dt);
    updateReefErode(dt); // v372：礁石接触磨蚀（玩家可控出口）
    updateSpecials(dt);

    var i, b;
    // 变形平滑：维护"变形矢量"（方向×幅度整体插值）——
    // 方向变化时矢量连续过渡（反转时幅度先收敛到圆再转向，角度噪声不可见）；
    // 速度低于死区直接回正圆，停稳后不再残留椭圆
    for (i = 0; i < phys.bodies.length; i++) {
      b = phys.bodies[i];
      // 渲染平滑：物理位置 → 渲染位置指数滤波（移动快时紧贴物理位，慢速时滤掉
      // 碰撞解算带来的亚像素级抖动，视觉上消除"移动不连续/微跳"的生硬感）
      var spd2 = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
      var rrate = spd2 > 260 ? 46 : 20;
      var rk = 1 - Math.exp(-rrate * dt);
      if (b.rx == null) { b.rx = b.x; b.ry = b.y; }
      b.rx += (b.x - b.rx) * rk;
      b.ry += (b.y - b.ry) * rk;
      if (Math.abs(b.x - b.rx) < 0.25 && Math.abs(b.y - b.ry) < 0.25) { b.rx = b.x; b.ry = b.y; }
      var sm = Math.min(1, dt * 6);
      b.svx = (b.svx || 0) + (b.vx - b.svx) * sm;
      b.svy = (b.svy || 0) + (b.vy - b.svy) * sm;
      var spd = Math.sqrt(b.svx * b.svx + b.svy * b.svy);
      var k = spd > 70 ? Math.min(0.14, spd / 3200) : 0; // 速度死区：仅近乎静止（物理微抖）视为正圆，滚动仍会倾斜旋转
      var tx = k > 0 ? (b.svx / spd) * k : 0;
      var ty = k > 0 ? (b.svy / spd) * k : 0;
      var dsm = Math.min(1, dt * 10);
      b.defX = (b.defX || 0) + (tx - b.defX) * dsm;
      b.defY = (b.defY || 0) + (ty - b.defY) * dsm;
      var mag = Math.sqrt(b.defX * b.defX + b.defY * b.defY);
      if (mag < 0.01) { b.defX = 0; b.defY = 0; mag = 0; } // 残余幅度清零，确保完全回圆
      b.defK = mag;
    }
    for (i = 0; i < phys.bodies.length; i++) {
      b = phys.bodies[i];
      if (b.grace > 0) b.grace -= dt;
      if (b.popT > 0) b.popT -= dt;
      // 运动拖尾采样（取渲染平滑位，避免拖尾与球体错位/抖动）
      if (!b.trail) b.trail = [];
      b.trail.push({ x: b.rx != null ? b.rx : b.x, y: b.ry != null ? b.ry : b.y });
      if (b.trail.length > 6) b.trail.shift();
    }

    // 无尽渐进加压计时 + 档位提示 + 高潮时刻
    endlessT += dt;
    var stgR = Math.floor(endlessRamp() * 4);
    if (stgR > rampStage) { rampStage = stgR; addPopup(C.W / 2, C.dangerY + 24, '海域渐深：潮汐更频 · 礁石更多', true, 0); }
    if (score - climaxMark >= C.climaxEvery) doClimax();
    // 声音预警：危险→母线低通收紧；潮汐临近/进行→低频隆隆
    var dg = 0;
    for (i = 0; i < phys.bodies.length; i++) {
      b = phys.bodies[i];
      var ddist = (b.y - b.r) - C.dangerY;
      if (ddist < 90) dg = Math.max(dg, 1 - Math.max(0, ddist) / 90);
    }
    audio.bgm.setDanger(dg);
    audio.bgm.setTide(tide.progress, (tide.phase === 'idle' && tide.timer < C.tide.warnTime) ? 1 : 0);

    updateReefHint();  // v357：礁石税提示（数量变化时才报）；v365：生长机制已移除
    processMerges();
    updateChest(dt);
    updateSeaEvent(dt);
    checkDanger(dt);

    if (comboTimer > 0) { comboTimer -= dt; if (comboTimer <= 0) combo = 0; }
    aimX = clampAim(aimX);
    updateFx(dt);

    if (displayScore < score) {
      displayScore += Math.max(1, (score - displayScore) * Math.min(1, dt * 8));
      if (displayScore > score) displayScore = score;
    }
  }

;
// ===== js/panels.js =====
// 水滴合成深海 - panels：面板几何 + 面板绘制（图鉴 / 成就殿堂 / 每日 / 榜单 / 分享卡）
// 模块加载顺序 3.5/4（systems 之后、render 之前）。四个模块共享全局作用域（经典 script），
// 本文件只有"函数声明 + 纯数据 + 几何常量"，无顶层调用语句，加载序不敏感；
// 绘制函数引用的游戏状态（daily / dexUnlocked / SP_DEFS 等）与工具（grad / roundRect / panel）
// 均在运行期经全局作用域解析，与定义处所在文件解耦。
// 拆分动机：面板几何此前散在 systems（命中判定）与 render（绘制）两处，改布局需全文搜索；
// 现统一收敛到本文件——几何常量与绘制同源，渲染与点击热区天然一致。

  // ---------- 面板几何（渲染与点击热区共用，一处定义）----------
  // 尺寸/锚点走 MG.layout（改比例只改 config C.H，此处自动跟随）；y 为动态值：
  var DEX_PANEL = { x: MG.layout.panel.dex.x, y: 65, w: MG.layout.panel.dex.w, h: MG.layout.panel.dex.h };
  var dexCloseBtn = { x: DEX_PANEL.x + DEX_PANEL.w - 40, y: DEX_PANEL.y + 10, w: 30, h: 30 }; // 右上 × 关闭（中心 +25px，与页头标题文字对齐）
  // 面板垂直居中：菜单态（铺满）以整屏 VH 为基准；局内游戏块高 C.H 为基准（比例旋钮，
  // 居中块=屏幕中心，块内 (C.H-h)/2 + 偏移 renderOy 恰好落在屏幕中央）——每帧绘制前重算
  function layoutDexPanel() {
    // 局内按底部锚定链（layout.panel.dexY = 120+dy，随块底平移）；菜单态铺满全屏按 VH 居中
    DEX_PANEL.y = state === 'menu'
      ? Math.max(10, Math.round((VH - DEX_PANEL.h) / 2))
      : Math.max(10, Math.round(MG.layout.panel.dexY));
    dexCloseBtn.y = DEX_PANEL.y + 8;
  }
  // 设置面板（v197：音效/音乐/震动三开关；v200 起复用本游戏通用面板——页头/关闭走
  // drawPanelHeader，与图鉴/成就同一套视觉，不再单独写一套页头与 ✕）
  var SET_PANEL = { x: 0, y: 0, w: 0, h: 0 };
  var setCloseBtn = { x: 0, y: 0, w: 30, h: 30 }; // 右上 × 关闭（与图鉴同款：圆底 #4A7FA0）
  function layoutSetPanel() {
    var r = MG.layout.setRect();
    SET_PANEL.x = r.x; SET_PANEL.y = r.y; SET_PANEL.w = r.w; SET_PANEL.h = r.h;
    setCloseBtn.x = r.x + r.w - 40; setCloseBtn.y = r.y + 8; // 同 dexCloseBtn 惯例
  }
  var shareCopyBtn = { x: 0, y: 0, w: 150, h: 42 }; // 分享卡片：复制文案按钮（打开时定位）
  function spSlotRect(stg, s) {
    // 海域演进行右侧的特殊滴槽位（s=0/1），宝箱也占一个槽位；与 stageRowRect 同基
    var r = stageRowRect(stg);
    return { x: r.x + r.w - 196 + s * 98, y: r.y + 6, w: 92, h: 32 }; // v279：随行高 44 居中（(44-32)/2）
  }
  function tierCellRect(t) {
    // 合成链分节：3 列 × 3 行（9 档）——v279：水平/垂直均匀分布（面板 w380：左右边距 14=列间距，
    // v289：格高 118→112、行距 136→126——末排底 y+488，与底部说明区（y+518）间距 4→30
    //（用户："最后一排水滴块与底部的水滴说明之间的间距要增大"）；格内三元素间距统一 5px
    return { x: DEX_PANEL.x + 14 + (t % 3) * 122, y: DEX_PANEL.y + 124 + Math.floor(t / 3) * 126, w: 108, h: 112 };
  }
  function stageRowRect(g) {
    // 海域演进分节：8 行纵向列表（由浅入深）——v279：随收集度行下移，内容区 y+126 起、
    // 行距 48 / 行高 44，末行底 y+506，与说明区间距 8（上下留白对称）
    return { x: DEX_PANEL.x + 14, y: DEX_PANEL.y + 126 + g * 48, w: DEX_PANEL.w - 28, h: 44 };
  }
  function dexSecRect(i) {
    // 分节切换：通栏分段控件（合成链 / 海域演进——特殊滴已并入海域行），样式与顶部页签区分
    // v279：收集度行放大下移后页签 y+64→y+84（与收集度行留 8px，与内容区留 6px）
    var segW = Math.floor((DEX_PANEL.w - 30) / 2);
    return { x: DEX_PANEL.x + 15 + i * segW, y: DEX_PANEL.y + 84, w: segW, h: 34 };
  }
  function dchalBtnRect() {
    // 每日挑战「开始挑战」按钮（v245：宽度随文本自适应、高 36，水平居中于面板；合并进今日 Hero 卡内）
    ctx.font = 'bold 15px system-ui, sans-serif';
    var tw = Math.round(ctx.measureText('开始挑战').width);
    var w = tw + 56, h = 36;
    return { x: DEX_PANEL.x + Math.round((DEX_PANEL.w - w) / 2), y: DEX_PANEL.y + 152, w: w, h: h };
  }

  // ---------- 成就视图滚动几何（v243：徽章卡单列，超出面板可拖拽/滚轮滚动）----------
  var ACH_ROW_H = 64, ACH_ROW_GAP = 8;
  function achViewport() {
    // 内容可视区：页头下 52 到面板底上 16
    return { x: DEX_PANEL.x + 10, y: DEX_PANEL.y + 52, w: DEX_PANEL.w - 20, h: DEX_PANEL.h - 68 };
  }
  function achContentH() { return ACH_DEFS.length * (ACH_ROW_H + ACH_ROW_GAP) - ACH_ROW_GAP; }
  function achMaxScroll() { return Math.max(0, achContentH() - (DEX_PANEL.h - 68)); }

  // ---------- 面板绘制 ----------
  // 通用页头：左侧标题 + 右上 × 关闭（图鉴/成就/设置共用；rect+closeBtn 由调用方传入，
  // 使各面板不必各自写一套页头，统一视觉语言；标题为空则不画，避免与页签重名）
  // 通用页头（v275）：可选图标 + 标题 + ✕，三者同一水平中线
  // （中线 = ✕ 按钮几何中心，命中与视觉同源；title 基线改 middle 对准中线，消除错位）
  // v276：icon 支持字符串（emoji）或函数（自定义白字形，画在 accent 圆内、原点=圆心）；
  // noBg=true 时 emoji 直接裸画（不加圆环底），四成就页签用（用户："只要主图标，圆环形背景不需要"）
  function drawPanelHeader(title, rect, closeBtn, icon, accent, noBg) {
    var cy = closeBtn ? closeBtn.y + closeBtn.h / 2 : rect.y + 30;
    ctx.textAlign = 'left';
    var tx = rect.x + 18;
    if (icon) {
      var icx = rect.x + 30;
      if (typeof icon === 'function') {
        // v279：图标圆与来源按钮（drawCircleBtn）同一绘制语言——渐变 accent 底 + 白细内环 + 左上高光弧
        var ac = accent || '#2E86B4';
        var ig = ctx.createLinearGradient(0, cy - 12, 0, cy + 12);
        ig.addColorStop(0, ac);
        ig.addColorStop(1, shade(ac, -0.25));
        ctx.fillStyle = ig;
        ctx.beginPath(); ctx.arc(icx, cy, 12, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(icx, cy, 11.25, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(icx, cy, 8, Math.PI * 1.1, Math.PI * 1.5); ctx.stroke();
        ctx.save(); ctx.translate(icx, cy); icon(); ctx.restore();
      } else if (noBg) {
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = '19px system-ui, sans-serif';
        ctx.fillText(icon, icx, cy + 1);
        ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      } else {
        ctx.fillStyle = accent || '#2E86B4';
        ctx.beginPath(); ctx.arc(icx, cy, 12, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(icx, cy, 9.5, 0, Math.PI * 2); ctx.stroke();
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = '14px system-ui, sans-serif';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(icon, icx, cy + 1);
        ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      }
      tx = rect.x + 50;
    }
    if (title) {
      ctx.fillStyle = '#155A8A';
      ctx.font = 'bold 19px system-ui, sans-serif';
      ctx.textBaseline = 'middle';
      ctx.fillText(title, tx, cy + 1);
      ctx.textBaseline = 'alphabetic';
    }
    if (!closeBtn) return;
    ctx.fillStyle = 'rgba(46,134,180,0.12)';
    ctx.beginPath(); ctx.arc(closeBtn.x + closeBtn.w / 2, closeBtn.y + closeBtn.h / 2, 13, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#4A7FA0'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    var ccx = closeBtn.x + closeBtn.w / 2, ccy = closeBtn.y + closeBtn.h / 2;
    ctx.beginPath();
    ctx.moveTo(ccx - 4, ccy - 4); ctx.lineTo(ccx + 4, ccy + 4);
    ctx.moveTo(ccx + 4, ccy - 4); ctx.lineTo(ccx - 4, ccy + 4);
    ctx.stroke();
    ctx.lineCap = 'butt';
  }
  // 通用分段控件：segRects=[{x,w}...]，活动段浅蓝渐变胶囊芯片（描边+垂直居中文字）
  // 切换时芯片从旧位置平滑滑到新位置（180ms 缓动）；key 区分多套控件各自记忆位置
  // 时钟用 performance.now（渲染帧钟）：面板打开期间 update 冻结 time，但渲染照跑，动画必须能走
  var segAnims = {};
  function drawSegTabs(rects, labels, active, dotIdx, key) {
    var now = performance.now() / 1000;
    var r0 = rects[0], rl = rects[rects.length - 1];
    ctx.fillStyle = 'rgba(21,90,138,0.10)';
    roundRect(r0.x, r0.y, rl.x + rl.w - r0.x, r0.h, r0.h / 2); ctx.fill();
    // 芯片滑动动画
    var st = segAnims[key];
    if (!st) { st = segAnims[key] = { cur: active, fx: rects[active].x, fw: rects[active].w, t0: -9 }; }
    if (active !== st.cur) {
      st.cur = active; st.t0 = now;
    }
    var p = Math.min(1, (now - st.t0) / 0.18);
    p = 1 - (1 - p) * (1 - p) * (1 - p); // easeOutCubic
    var tx0 = st.fx + (rects[active].x - st.fx) * p;
    var tw0 = st.fw + (rects[active].w - st.fw) * p;
    if (p >= 1) { st.fx = rects[active].x; st.fw = rects[active].w; }
    // 芯片
    var tg = ctx.createLinearGradient(0, r0.y + 2, 0, r0.y + r0.h - 2);
    tg.addColorStop(0, '#FFFFFF'); tg.addColorStop(1, '#CFE7F6');
    ctx.fillStyle = tg;
    roundRect(tx0 + 2, r0.y + 2, tw0 - 4, r0.h - 4, (r0.h - 4) / 2); ctx.fill();
    ctx.strokeStyle = 'rgba(46,134,180,0.5)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (var i = 0; i < rects.length; i++) {
      var sr = rects[i];
      ctx.fillStyle = i === active ? '#155A8A' : '#5B7E96';
      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.fillText(labels[i], sr.x + sr.w / 2, sr.y + sr.h / 2 + 1);
      if (i === dotIdx && i !== active) { // 未全勤提醒小红点
        ctx.fillStyle = '#E2705E';
        ctx.beginPath(); ctx.arc(sr.x + sr.w - 11, sr.y + 7, 3, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.textBaseline = 'alphabetic';
  }
  // 图鉴页头收集度徽条：进度条 + 四个里程碑刻度（25/50/75/100%），已达成的点亮金色圆点
  // 纯展示无交互；数据来自 systems 的 colProgress/COL_MILESTONES（运行期全局解析）
  function drawColBadge() {
    // v279：独立行再下移放大（用户：上下间距太挤、太小）——行中线 y+64（页头下留 24px 空隙、
    // 与子页签 y+84 上留 8px），标签 14px 粗体 + 进度条 12px 高 + 计数 15px 粗体
    var cp = colProgress();
    var pct = cp.n / cp.total;
    var full = pct >= 1;
    var rowCy = DEX_PANEL.y + 64;
    var bx = DEX_PANEL.x + 70, bw = DEX_PANEL.w - 136, by = rowCy - 6, bh = 12;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#4A7FA0';
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.fillText('收集度', DEX_PANEL.x + 15, rowCy);
    ctx.fillStyle = 'rgba(21,90,138,0.12)';
    roundRect(bx, by, bw, bh, bh / 2); ctx.fill();
    if (pct > 0) {
      ctx.fillStyle = full ? '#D9A93F' : '#2E86B4';
      roundRect(bx, by, Math.max(bh, bw * pct), bh, bh / 2); ctx.fill();
    }
    for (var i = 0; i < COL_MILESTONES.length; i++) {
      var m = COL_MILESTONES[i];
      var mx = bx + bw * m.pct;
      if (colClaimed[m.id]) {
        ctx.fillStyle = '#F5C542';
        ctx.beginPath(); ctx.arc(mx, by + bh / 2, 3.8, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 1; ctx.stroke();
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.fillRect(mx - 1, by + 2, 2, bh - 4);
      }
    }
    ctx.textAlign = 'right';
    ctx.fillStyle = '#155A8A';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillText(cp.n + '/' + cp.total, DEX_PANEL.x + DEX_PANEL.w - 15, rowCy);
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'center';
  }

  function drawDex() {
    layoutDexPanel();
    // 压暗背景已上移 drawPanelFx 统一绘制（v275）
    panel(DEX_PANEL.x, DEX_PANEL.y, DEX_PANEL.w, DEX_PANEL.h, 14, 0.96);
    // v279：图标 = 图鉴按钮（技能栏书本钮）同款矢量书本——逐笔同代码（16×12 描边框+中缝、线宽1.8）；
    // v283：整体等比缩 0.6——图标圆 r12 = 按钮 r20 的 0.6，缩放后图标/圆的比例与按钮完全一致
    //（用户："内部形状太大了，与原图标比例不一样"）
    drawPanelHeader('图鉴', DEX_PANEL, dexCloseBtn, function () {
      ctx.save(); ctx.scale(0.6, 0.6);
      ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 1.8;
      ctx.strokeRect(-8, -6, 16, 12);
      ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(0, 6); ctx.stroke();
      ctx.restore();
    }, '#4A7FA0');
    drawColBadge();

    // —— 分节切换：通栏分段控件（特殊滴槽位已并入海域演进，不再单列）——
    var secNames = ['合成链', '海域演进'];
    var secRects = [dexSecRect(0), dexSecRect(1)];
    drawSegTabs(secRects, secNames, dexSec, -1, 'dexsec');
    var curStage = seaStage(), tsNow = totalScore(), bestScore = Math.max(tsNow, careerPeak);
    // v316：解锁状态统一按「本局 + 生涯最高」中已抵达的进度渲染——刷新/重开后本局分归零，
    // 但生涯抵达仍在，否则已解锁海域会退化成"累计 X 分解锁"的未解锁文案（用户实测反馈）。
    // nextIdx = 首个未抵达海域（全部抵达则为长度值，即没有任何行命中"下一海域"）
    var nextIdx = C.seaStages.length;
    for (var si = 0; si < C.seaStages.length; si++) {
      if (bestScore < C.seaStages[si].at) { nextIdx = si; break; }
    }
    ctx.textAlign = 'center';

    if (dexSec === 0) {
      // 合成链 3×3 大格（点击条目在底部说明区查看描述）
      for (var t = 0; t < T.length; t++) {
        var tRect = tierCellRect(t);
        var unlocked = !!dexUnlocked[t], sel = dexSelTier === t;
        ctx.fillStyle = sel ? 'rgba(46,134,180,0.16)' : 'rgba(46,134,180,0.07)';
        roundRect(tRect.x, tRect.y, tRect.w, tRect.h, 10); ctx.fill();
        if (sel) {
          ctx.strokeStyle = '#2E86B4'; ctx.lineWidth = 1.5;
          roundRect(tRect.x + 0.5, tRect.y + 0.5, tRect.w - 1, tRect.h - 1, 10); ctx.stroke();
        }
        // v291：格内三元素「分散对齐」到格子（用户："不要都往格子中心挤"）——整组按
        // 等间距铺满格高：上边距 = 元素间距 = 下边距 ≈ 10（格高 112 − 三元素总高 ~73 = 39，四段各 ~10）；
        // v289 的 5px 间距是"挤在中心"的观感来源。名称/分值仍用 middle 基线对准各自字面中心
        var bx = tRect.x + tRect.w / 2, by = tRect.y + 32;
        if (unlocked) {
          drawBall({ x: bx, y: by, r: 22, tier: t, vx: 0, vy: 0 }, 1);
        } else {
          ctx.fillStyle = '#B8CBD8';
          ctx.beginPath(); ctx.arc(bx, by, 22, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#8AA5B8';
          ctx.font = 'bold 20px system-ui, sans-serif';
          ctx.textBaseline = 'middle';
          ctx.fillText('?', bx, by + 1);
          ctx.textBaseline = 'alphabetic';
        }
        ctx.textBaseline = 'middle';
        ctx.fillStyle = unlocked ? '#155A8A' : '#8AA5B8';
        ctx.font = 'bold 16px system-ui, sans-serif';
        ctx.fillText(unlocked ? T[t].name : '？？？', bx, tRect.y + 72);
        ctx.font = '13px system-ui, sans-serif';
        ctx.fillStyle = '#4A7FA0';
        ctx.fillText(unlocked ? ('分值 ' + T[t].score + ' · ×' + (dexCounts[t] || 0)) : '未解锁', bx, tRect.y + 96);
        ctx.textBaseline = 'alphabetic';
      }
    } else if (dexSec === 1) {

      // 海域演进纵向列表（由浅入深）：每行 = 徽章 + 海域名/状态 + 该海域 2 个特殊滴槽位
      // 已抵达：发现的显实际形态，未发现的显"？"；下一海域只显海域名+解锁积分；更深的特殊滴一律"？？？"不剧透
      ctx.textAlign = 'left';
      for (var stg = 0; stg < C.seaStages.length; stg++) {
        var ss = C.seaStages[stg];
        var sRow = stageRowRect(stg);
        var isCur = stg === curStage, reached = bestScore >= ss.at, sel = dexSelStage === stg;
        var isNext = !reached && stg === nextIdx, hiddenStg = !isCur && !reached && !isNext;
        var rowCy = sRow.y + sRow.h / 2;
        if (isCur) {
          // 当前海域行铺该海域背景主题色（bg 渐变中段→深段，与游戏内一致）
          var rowG = ctx.createLinearGradient(sRow.x, 0, sRow.x + sRow.w, 0);
          rowG.addColorStop(0, ss.bg[2]);
          rowG.addColorStop(1, ss.bg[3]);
          ctx.fillStyle = rowG;
        } else if (reached) { // 已抵达：铺该海域背景主题色的浅底
          ctx.globalAlpha = 0.45;
          ctx.fillStyle = ss.bg[1];
          roundRect(sRow.x, sRow.y, sRow.w, sRow.h, 9); ctx.fill();
          ctx.globalAlpha = 1;
        } else {
          ctx.fillStyle = 'rgba(120,145,165,0.10)';
        }
        if (isCur || !reached) { roundRect(sRow.x, sRow.y, sRow.w, sRow.h, 9); ctx.fill(); }
        if (sel) {
          ctx.strokeStyle = '#2E86B4'; ctx.lineWidth = 1.5;
          roundRect(sRow.x + 0.5, sRow.y + 0.5, sRow.w - 1, sRow.h - 1, 9); ctx.stroke();
        }
        // 左侧：海域专属徽章（当前=脉冲环 / 已抵达·下一海域=彩/灰徽 / 更深海域不显示图标）
        var dotX = sRow.x + 20, dotY = rowCy;
        if (isCur) {
          ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(dotX, dotY, 12.5 + Math.sin(time * 4) * 1.2, 0, Math.PI * 2); ctx.stroke();
        }
        if (isCur || reached || isNext) drawSeaBadge(stg, dotX, dotY, reached || isCur);
        var nameTxt = isCur || reached || isNext ? ss.name : '？？？';
        var gateTxt = isCur ? '当前海域' : (reached ? '已抵达' : (isNext ? '下一海域 · 累计' + (ss.at >= 10000 ? (ss.at / 10000) + '万' : ss.at) + '分' : '累计 ' + (ss.at >= 10000 ? (ss.at / 10000) + '万' : ss.at) + ' 分解锁'));
        // v289：两行文本整块按字形像素框（actualBoundingBox）居中于行中线——不再用"下移 3px"凑
        //（用户："请用居中来处理"）。块高 = 首行 asc + 行距 + 末行 desc，块心对齐 rowCy
        // v300：测量改恒等变换（微信端 measureText 受 CTM 影响会把度量放大）
        var mN = measureInk('bold 15px system-ui, sans-serif', nameTxt);
        var mG = measureInk('11px system-ui, sans-serif', gateTxt);
        var aN = mN.has ? mN.a : 15 * 0.84; // v300：无像素框 API（微信）回退 CJK 排印常数
        var dG = mG.has ? mG.d : 11 * 0.06;
        var LINE_GAP = 14;                                  // 两行基线间距
        var yN = rowCy - (aN + LINE_GAP + dG) / 2 + aN;     // 首行基线：块顶 = rowCy - 块高/2
        var yG = yN + LINE_GAP;                             // 第二行基线
        ctx.fillStyle = isCur ? '#FFFFFF' : (reached ? '#155A8A' : '#8AA5B8');
        ctx.font = 'bold 15px system-ui, sans-serif';
        if (isCur) {
          ctx.lineJoin = 'round'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(10,50,80,0.35)';
          ctx.strokeText(nameTxt, dotX + 20, yN);
        }
        ctx.fillText(nameTxt, dotX + 20, yN);
        ctx.font = '11px system-ui, sans-serif';
        ctx.fillStyle = isCur ? 'rgba(255,255,255,0.92)' : (reached ? '#1E7A6F' : (isNext ? '#7A98AC' : '#B0584A'));
        if (isCur) ctx.strokeText(gateTxt, dotX + 20, yG);
        ctx.fillText(gateTxt, dotX + 20, yG);
        // 右侧：该海域的 2 个特殊滴槽位（点击查看说明）
        var slots2 = STAGE_SP_SLOTS[stg] || STAGE_SP_SLOTS[0];
        for (var sl = 0; sl < 2; sl++) {
          var slotR = spSlotRect(stg, sl);
          var spIdx2 = slots2[sl];
          var isChest2 = spIdx2 === SP_DEFS.length;
          var spDef2 = isChest2 ? null : SP_DEFS[spIdx2];
          var found2 = !!dexSpecial[isChest2 ? 'chest' : spDef2.key]; // 宝箱同样以首次沉入场中为发现条件
          if (dexSelSp === spIdx2 && dexSelStage < 0) {
            ctx.fillStyle = 'rgba(46,134,180,0.14)';
            roundRect(slotR.x, slotR.y, slotR.w, slotR.h, 8); ctx.fill();
            ctx.strokeStyle = '#2E86B4'; ctx.lineWidth = 1.2;
            roundRect(slotR.x + 0.5, slotR.y + 0.5, slotR.w - 1, slotR.h - 1, 8); ctx.stroke();
          }
          // v291：图标-文本只要"有点间距"（净距 8→4，用户："搞那么大干什么"）；文本仍在
          // 恒定文本列内居中，图标固定成列不漂移（v290 定版）
          var cx2 = slotR.x + 15, cy2 = rowCy;
          var spName2 = found2 ? (isChest2 ? '大宝箱' : spDef2.name) : '？？？';
          var m2 = measureInk('13px system-ui, sans-serif', spName2); // v300：恒等变换下测量
          var tw2 = m2.w;
          var TXT_COL = 57;                                    // 文本列宽（恒定，跨行同宽）
          var tx2 = slotR.x + 30 + Math.max(0, (TXT_COL - tw2) / 2); // 列内居中（列左缘 = 图标右缘 +4）
          var y2 = cy2 + ((m2.has ? m2.a : 13 * 0.84) - (m2.has ? m2.d : 13 * 0.06)) / 2; // v300：回退 CJK 排印常数
          if ((hiddenStg || isNext) && !reached) { // 生涯未抵达：虚线空位 + "？？？"（特殊滴内容不剧透，海域名/解锁积分仍可见）
            ctx.save();
            ctx.setLineDash([3, 3]);
            ctx.strokeStyle = '#A8BCCB'; ctx.lineWidth = 1;
            roundRect(slotR.x + 0.5, slotR.y + 0.5, slotR.w - 1, slotR.h - 1, 8); ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = '#A8BCCB';
            ctx.font = '13px system-ui, sans-serif';
            ctx.textAlign = 'center';                          // 空位内整组居中
            ctx.fillText('？？？', slotR.x + slotR.w / 2, y2);
            ctx.textAlign = 'left';
            ctx.restore();
            continue;
          }
          if (found2) {
            // v292：统一玻璃底圆（r12）——每格图标共用同一可见包络。礁石/宝箱是深色实体、
            // 多数水滴是浅色球，浅色球的淡边缘在浅底上"看着"比深色图标窄（用户报礁石/漩涡滴
            // 不对齐，实测两者实体左缘同为 242 像素级重合）；有了同尺寸底圆后列对齐一目了然
            ctx.fillStyle = 'rgba(255,255,255,0.30)';
            ctx.beginPath(); ctx.arc(cx2, cy2, 12, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1;
            ctx.stroke();
            drawSpForm(spIdx2, cx2, cy2);
          } else {
            // 未发现：实底浅灰圆 + 虚线圈 + 深色问号（够醒目）
            ctx.fillStyle = 'rgba(196,212,224,0.55)';
            ctx.beginPath(); ctx.arc(cx2, cy2, 9, 0, Math.PI * 2); ctx.fill();
            ctx.setLineDash([2.5, 2.5]);
            ctx.strokeStyle = '#5E7E96'; ctx.lineWidth = 1.2;
            ctx.beginPath(); ctx.arc(cx2, cy2, 10.8, 0, Math.PI * 2); ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = '#3E647E';
            ctx.font = 'bold 14px system-ui, sans-serif';
            ctx.textAlign = 'center';
            var mq = measureInk('bold 14px system-ui, sans-serif', '?'); // v300：恒等变换下测量
            var yq = cy2 + ((mq.has ? mq.a : 14 * 0.72) - (mq.has ? mq.d : 14 * 0.02)) / 2;
            ctx.fillText('?', cx2, yq);
            ctx.textAlign = 'left';
          }
          // 文本：当前海域行用与海域名同款白字+描边（行底是深海渐变，原深蓝 #155A8A 看不清）；
          // 其余行维持深蓝。v289：基线改像素框居中值 y2（与图标共用行中线 cy2）
          if (isCur) {
            ctx.lineJoin = 'round'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(10,50,80,0.35)';
            ctx.strokeText(spName2, tx2, y2);
            ctx.fillStyle = '#FFFFFF';
          } else {
            ctx.fillStyle = found2 ? '#155A8A' : '#4E6E86';
          }
          ctx.fillText(spName2, tx2, y2);
        }
      }
      ctx.textAlign = 'center';
    }

    // —— 说明区：合成链 / 海域 / 特殊滴·宝箱 三类条目通用 ——
    var title, sub, body, known = true;
    if (dexSelTier >= 0) {
      var tu = !!dexUnlocked[dexSelTier];
      known = tu;
      title = tu ? T[dexSelTier].name : '？？？';
      sub = tu ? ('分值 ' + T[dexSelTier].score + ' · 累计合成 ×' + (dexCounts[dexSelTier] || 0)) : '未解锁';
      body = tu ? '与同档水滴相触即合成更高阶。' : '继续合成，遇见它便会点亮。';
    } else if (dexSelStage >= 0) {
      var stgS = C.seaStages[dexSelStage];
      var stgReached = bestScore >= stgS.at, stgCur = dexSelStage === curStage;
      title = stgReached || stgCur ? stgS.name : '？？？';
      // v316：与行内三态词汇统一（当前海域 / 已抵达 / 下一海域 / 累计分解锁）
      sub = stgCur ? '当前海域' : (stgReached ? '已抵达' : (dexSelStage === nextIdx ? '下一海域 · 累计' + (stgS.at >= 10000 ? (stgS.at / 10000) + '万' : stgS.at) + '分' : '累计 ' + (stgS.at >= 10000 ? (stgS.at / 10000) + '万' : stgS.at) + ' 分解锁'));
      body = '越深水色越暗：潮汐更频、礁石更多。';
    } else {
      var CHEST_INFO = { key: 'chest', name: '大宝箱', desc: '沉底木箱，沉走前点开：得分或充能。' };
      var isChestSel = dexSelSp === SP_DEFS.length;
      var dsc = isChestSel ? CHEST_INFO : (SP_DEFS[dexSelSp] || SP_DEFS[0]);
      known = !!dexSpecial[isChestSel ? 'chest' : dsc.key];
      title = known ? dsc.name : '？？？';
      sub = known ? (isChestSel ? '深海随机事件' : '已发现') : '未发现';
      body = known ? dsc.desc : '在海域中发现它即可点亮说明。';
    }
    // 说明区：贴面板底部（消除底部大片空白；v194 随面板 560→600 下移 478→518）
    ctx.fillStyle = 'rgba(46,134,180,0.10)';
    roundRect(DEX_PANEL.x + 12, DEX_PANEL.y + 518, DEX_PANEL.w - 24, 68, 8); ctx.fill();
    ctx.textAlign = 'left';
    ctx.fillStyle = known ? '#155A8A' : '#8AA5B8';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.fillText(title, DEX_PANEL.x + 24, DEX_PANEL.y + 538);
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillStyle = known ? '#1E7A6F' : '#B0584A';
    ctx.fillText(sub, DEX_PANEL.x + 24, DEX_PANEL.y + 556);
    ctx.fillStyle = '#4A7FA0';
    ctx.fillText(body, DEX_PANEL.x + 24, DEX_PANEL.y + 576);
    ctx.textAlign = 'center';
  }

  // 成就殿堂四视图（v241 拆分）：主页四磁贴各自直达——成就 / 每日任务 / 每日挑战 / 榜单；
  // 原三合一页签条已拆分移除，页头标题随视图变化
  function drawAchPanel() {
    layoutDexPanel();
    // 压暗背景已上移 drawPanelFx 统一绘制（v275）
    panel(DEX_PANEL.x, DEX_PANEL.y, DEX_PANEL.w, DEX_PANEL.h, 14, 0.96);
    var titles = ['成就', '每日任务', '每日挑战', '榜单'];
    // 图标与来源主页磁贴同款；v276：裸 emoji（不加圆环底，用户要求）
    drawPanelHeader(titles[dexTab] || '成就', DEX_PANEL, dexCloseBtn, ['🏆', '📋', '🎯', '🥇'][dexTab] || '🏆', null, true);
    if (dexTab === 1) drawDailyTasksTab();
    else if (dexTab === 2) drawDchalCard();
    else if (dexTab === 3) drawRankTab();
    else drawAchTab();
  }

  // 图鉴/海域演进用迷你宝箱图标：与场上宝箱（drawChest）同款金色渐变+铜箍铆钉+缝光+金锁+描金边，缩比复刻
  function drawChestIcon(cx, cy, sc) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(sc || 1, sc || 1);
    var glow = 0.3 + 0.15 * Math.sin(time * 3);
    var gg = ctx.createRadialGradient(0, 0, 2, 0, 0, 22);
    gg.addColorStop(0, 'rgba(255,208,96,' + glow + ')');
    gg.addColorStop(1, 'rgba(255,208,96,0)');
    ctx.fillStyle = gg;
    ctx.beginPath(); ctx.arc(0, 0, 22, 0, Math.PI * 2); ctx.fill();
    // 与场上宝箱同构（w=1.6r, h=1.3r, r=18）：同渐变同细节
    var w = 28.8, h = 23.4, seamY = -h * 0.06;
    ctx.fillStyle = grad('chestLidI', function () {
      var gg2 = ctx.createLinearGradient(0, -h * 0.62, 0, seamY);
      gg2.addColorStop(0, '#F4C866'); gg2.addColorStop(0.55, '#DDA948'); gg2.addColorStop(1, '#B98430');
      return gg2;
    });
    ctx.beginPath();
    ctx.moveTo(-w / 2, seamY);
    ctx.quadraticCurveTo(0, -h * 0.72, w / 2, seamY);
    ctx.closePath(); ctx.fill();
    // 盖顶弧形高光
    ctx.strokeStyle = 'rgba(255,240,190,0.5)'; ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-w * 0.34, -h * 0.30);
    ctx.quadraticCurveTo(0, -h * 0.62, w * 0.34, -h * 0.30);
    ctx.stroke();
    // 箱身（中段受光、底角沉影）
    ctx.fillStyle = grad('chestBodyI', function () {
      var gg2 = ctx.createLinearGradient(0, seamY, 0, h * 0.56);
      gg2.addColorStop(0, '#D8A44C'); gg2.addColorStop(0.5, '#C08A38'); gg2.addColorStop(1, '#8F5E22');
      return gg2;
    });
    roundRect(-w / 2, seamY, w, h * 0.62, 2.5); ctx.fill();
    // 木板竖缝
    ctx.strokeStyle = 'rgba(110,66,20,0.45)'; ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-w * 0.17, seamY + 2); ctx.lineTo(-w * 0.17, h * 0.52);
    ctx.moveTo(w * 0.17, seamY + 2); ctx.lineTo(w * 0.17, h * 0.52);
    ctx.stroke();
    // 铜箍 ×2 + 亮金铆钉
    ctx.fillStyle = '#7A4E1C';
    roundRect(-w * 0.42, -h * 0.36, 3.6, h * 0.9, 1.6); ctx.fill();
    roundRect(w * 0.42 - 3.6, -h * 0.36, 3.6, h * 0.9, 1.6); ctx.fill();
    ctx.fillStyle = '#FFE6A6';
    ctx.beginPath();
    ctx.arc(-w * 0.42 + 1.8, -h * 0.2, 0.9, 0, Math.PI * 2);
    ctx.arc(w * 0.42 - 1.8, -h * 0.2, 0.9, 0, Math.PI * 2);
    ctx.arc(-w * 0.42 + 1.8, h * 0.34, 0.9, 0, Math.PI * 2);
    ctx.arc(w * 0.42 - 1.8, h * 0.34, 0.9, 0, Math.PI * 2);
    ctx.fill();
    // 盖缝透光（呼吸）
    var seamG = 0.26 + 0.24 * Math.sin(time * 3 + 1);
    ctx.fillStyle = 'rgba(255,224,130,' + seamG.toFixed(2) + ')';
    roundRect(-w * 0.4, seamY - 1, w * 0.8, 2, 1); ctx.fill();
    // 金锁 + 锁孔
    ctx.fillStyle = '#FFD873';
    roundRect(-3.6, seamY - 2.5, 7.2, 8, 2); ctx.fill();
    ctx.fillStyle = '#5A3A14';
    ctx.beginPath(); ctx.arc(0, seamY + 1, 1.3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-0.7, seamY + 1.8); ctx.lineTo(0.7, seamY + 1.8);
    ctx.lineTo(0.45, seamY + 4.2); ctx.lineTo(-0.45, seamY + 4.2);
    ctx.closePath(); ctx.fill();
    // 描金边（盖弧 + 箱身）
    ctx.strokeStyle = 'rgba(242,193,78,0.85)'; ctx.lineWidth = 1.1;
    roundRect(-w / 2, seamY, w, h * 0.62, 2.5); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-w / 2, seamY);
    ctx.quadraticCurveTo(0, -h * 0.72, w / 2, seamY);
    ctx.stroke();
    ctx.restore();
  }

  // 海域徽章：每片海域专属颜色 + 图形（图鉴列表用，便于一眼区分）
  var SEA_BADGES = [
    { c: '#3BB8D8', g: 'pool' },    // 潮汐池：波浪
    { c: '#38A98A', g: 'coral' },   // 珊瑚浅海：珊瑚枝（绿=海域主题色，珊瑚也有绿色的）
    { c: '#2E9BD4', g: 'bubbles' }, // 蔚蓝深海：气泡
    { c: '#4A5FB4', g: 'star' },    // 午夜深渊：夜星
    { c: '#647FA8', g: 'moon' },    // 月光环礁：月牙（银蓝=月下海面色，不用金色抢主题）
    { c: '#2A4C8A', g: 'eye' },     // 海沟之眼：海之眼
    { c: '#B85C3A', g: 'vent' },    // 热泉裂谷：热泉火苗（暗锈橙=热泉褐岩色）
    { c: '#8A5FB4', g: 'crown' }    // 深渊王座：王冠
  ];
  function drawSeaBadge(stg, x, y, reached, opaque, r) {
    var ic = SEA_BADGES[stg] || SEA_BADGES[0];
    ctx.save();
    ctx.translate(x, y);
    if (r && r !== 10) ctx.scale(r / 10, r / 10); // v284：可选半径（进度条端点 r15），圆/内纹整体等比缩放
    ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2);
    if (reached) {
      ctx.fillStyle = ic.c; ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 1; ctx.stroke();
    } else {
      // opaque：不透明浅底（用于骑在进度条端点上遮挡条身，否则半透明底会透出进度条）
      ctx.fillStyle = opaque ? '#EFF5FA' : 'rgba(120,145,165,0.16)'; ctx.fill();
      ctx.strokeStyle = '#8AA5B8'; ctx.lineWidth = 1; ctx.stroke();
    }
    var fg = reached ? '#FFFFFF' : '#8AA5B8';
    ctx.strokeStyle = fg; ctx.fillStyle = fg;
    ctx.lineWidth = 1.4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    switch (ic.g) {
      case 'pool': // 双波浪线
        ctx.moveTo(-5.5, -2.5); ctx.quadraticCurveTo(-2.8, -5.5, 0, -2.5); ctx.quadraticCurveTo(2.8, 0.5, 5.5, -2.5);
        ctx.moveTo(-5.5, 3.5); ctx.quadraticCurveTo(-2.8, 0.5, 0, 3.5); ctx.quadraticCurveTo(2.8, 6.5, 5.5, 3.5);
        ctx.stroke(); break;
      case 'coral': // 珊瑚枝
        ctx.moveTo(0, 5); ctx.lineTo(0, -1);
        ctx.moveTo(0, 0); ctx.lineTo(-3.5, -4.5);
        ctx.moveTo(0, 1); ctx.lineTo(3.5, -2.5);
        ctx.moveTo(-3.5, -4.5); ctx.lineTo(-2, -5.5);
        ctx.stroke(); break;
      case 'bubbles': // 三粒气泡
        ctx.arc(-2.5, 3, 1.7, 0, Math.PI * 2);
        ctx.moveTo(1.8, -0.5); ctx.arc(0.8, -0.5, 1.1, 0, Math.PI * 2);
        ctx.moveTo(3.4, -3.8); ctx.arc(3, -3.8, 0.6, 0, Math.PI * 2);
        ctx.stroke(); break;
      case 'star': // 四角夜星
        ctx.moveTo(0, -5); ctx.quadraticCurveTo(0.9, -0.9, 5, 0);
        ctx.quadraticCurveTo(0.9, 0.9, 0, 5);
        ctx.quadraticCurveTo(-0.9, 0.9, -5, 0);
        ctx.quadraticCurveTo(-0.9, -0.9, 0, -5);
        ctx.fill(); break;
      case 'moon': // 月牙（叠圆裁出）
        ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = reached ? ic.c : 'rgba(120,145,165,0.16)'; // 补底圆与徽底同色，未抵达不显彩
        ctx.beginPath(); ctx.arc(2.2, -1.6, 4.4, 0, Math.PI * 2); ctx.fill(); break;
      case 'eye': // 海之眼
        ctx.ellipse(0, 0, 5.2, 3.1, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 0, 1.7, 0, Math.PI * 2); ctx.fill(); break;
      case 'vent': // 热泉火苗
        ctx.moveTo(0, -5.5); ctx.quadraticCurveTo(4.5, -0.5, 2.2, 4.5);
        ctx.lineTo(-2.2, 4.5); ctx.quadraticCurveTo(-4.5, -0.5, 0, -5.5);
        ctx.fill(); break;
      case 'crown': // 王冠
        ctx.moveTo(-5, 3.5); ctx.lineTo(-5, -2); ctx.lineTo(-2.2, 0.2);
        ctx.lineTo(0, -4.2); ctx.lineTo(2.2, 0.2); ctx.lineTo(5, -2);
        ctx.lineTo(5, 3.5); ctx.closePath(); ctx.fill(); break;
    }
    ctx.restore();
  }

  // 图鉴内特殊滴的实际形态（小尺寸）：礁石=珊瑚丛 / 符文滴=水滴+符文牌 / 宝箱=迷你木箱 / 其余=水滴+专属标记
  function drawSpForm(spIdx, x, y) {
    // v292：宝箱 0.55→0.76——实体箱身 15.8→22 逻辑px，与水滴直径（r11×2）同宽，
    // 左右实体缘与各排水滴严格对齐（用户截图实测：水滴实体 380..412、宝箱实体 384..407，
    // 居中绘制导致箱身左缘内缩 3.2px，看起来"宝箱比雨云滴靠右"）
    if (spIdx === SP_DEFS.length) { drawChestIcon(x, y, 0.76); return; }
    var key = SP_DEFS[spIdx].key;
    if (key === 'iron') { drawIronBall({ x: x, y: y, r: 11, vx: 0, vy: 0 }, 1); return; }
    if (key === 'rune') { drawBall({ x: x, y: y, r: 11, tier: 1, vx: 0, vy: 0, rune: 'ripple' }, 1); return; }
    drawBall({ x: x, y: y, r: 11, tier: 1, vx: 0, vy: 0, special: key, frozen: key === 'ice' ? 1 : 0 }, 1);
  }

  // 成就页签（v243 方案 A 徽章卡）：单列勋章卡 + 拖拽/滚轮滚动；勋章颜色表难度（达成转金）
  function drawAchTab() {
    var vp = achViewport();
    achScroll = Math.max(0, Math.min(achScroll, achMaxScroll()));
    ctx.save();
    roundRect(vp.x, vp.y, vp.w, vp.h, 10); ctx.clip();
    ctx.translate(0, -achScroll);
    var w = DEX_PANEL.w - 28;
    for (var i = 0; i < ACH_DEFS.length; i++) {
      var a = ACH_DEFS[i], done = !!achDone[a.id];
      var cur = Math.min(a.target, a.cur());
      var done2 = done || cur >= a.target;
      var x = DEX_PANEL.x + 14, y = DEX_PANEL.y + 52 + i * (ACH_ROW_H + ACH_ROW_GAP), h = ACH_ROW_H;
      // 卡底：达成淡金渐变，未达成白玻璃
      if (done2) {
        var gg = ctx.createLinearGradient(0, y, 0, y + h);
        gg.addColorStop(0, 'rgba(245,197,66,0.20)'); gg.addColorStop(1, 'rgba(217,169,63,0.10)');
        ctx.fillStyle = gg;
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
      }
      roundRect(x, y, w, h, 9); ctx.fill();
      ctx.strokeStyle = done2 ? 'rgba(217,169,63,0.45)' : 'rgba(46,110,150,0.14)';
      ctx.lineWidth = 1;
      roundRect(x + 0.5, y + 0.5, w - 1, h - 1, 9); ctx.stroke();
      // —— 通用成就徽章：大圆勋章 + 双绶带（达成金、未达成灰锁）——
      var mx = x + 30, my = y + 26;
      ctx.fillStyle = done2 ? '#C9922A' : '#AEBEC9';
      ctx.beginPath();
      ctx.moveTo(mx - 7, my + 10); ctx.lineTo(mx - 11, my + 22); ctx.lineTo(mx - 3, my + 18); ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(mx + 7, my + 10); ctx.lineTo(mx + 11, my + 22); ctx.lineTo(mx + 3, my + 18); ctx.closePath(); ctx.fill();
      var mg2 = ctx.createLinearGradient(0, my - 16, 0, my + 16);
      if (done2) { mg2.addColorStop(0, '#FFDE7A'); mg2.addColorStop(1, '#D9A93F'); }
      else { mg2.addColorStop(0, '#D5DFE6'); mg2.addColorStop(1, '#A9BAC6'); }
      ctx.fillStyle = mg2;
      ctx.beginPath(); ctx.arc(mx, my, 16, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 2; ctx.stroke();
      ctx.strokeStyle = done2 ? 'rgba(138,90,24,0.35)' : 'rgba(90,110,125,0.30)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(mx, my, 12.5, 0, Math.PI * 2); ctx.stroke();
      if (done2) {
        // 金星
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        for (var sp = 0; sp < 5; sp++) {
          var sa = -Math.PI / 2 + sp * 2 * Math.PI / 5, sa2 = sa + Math.PI / 5;
          ctx.lineTo(mx + Math.cos(sa) * 7, my + 0.5 + Math.sin(sa) * 7);
          ctx.lineTo(mx + Math.cos(sa2) * 3, my + 0.5 + Math.sin(sa2) * 3);
        }
        ctx.closePath(); ctx.fill();
      } else {
        // 灰锁（锁梁 + 锁体）
        ctx.strokeStyle = '#7E93A2'; ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.arc(mx, my - 2, 3.2, Math.PI, 0); ctx.stroke();
        ctx.fillStyle = '#7E93A2';
        roundRect(mx - 5, my - 2, 10, 8, 2); ctx.fill();
      }
      // —— 文本（名称 / 描述）+ 右上奖励 ——
      var tx = x + 58, tw = w - 58 - 96;
      ctx.textAlign = 'left';
      ctx.font = 'bold 14px system-ui, sans-serif';
      ctx.fillStyle = done2 ? '#B8860B' : '#155A8A';
      ctx.fillText(truncText(a.name, tw), tx, y + 21);
      ctx.font = '10.5px system-ui, sans-serif';
      ctx.fillStyle = done2 ? '#4A7FA0' : '#8AA5B8';
      ctx.fillText(truncText(a.desc, tw), tx, y + 38);
      ctx.textAlign = 'right';
      ctx.font = '9.5px system-ui, sans-serif';
      ctx.fillStyle = done2 ? '#1E7A6F' : '#9AB4C4';
      ctx.fillText(truncText(a.perk, 90), x + w - 12, y + 21);
      // —— 底部进度条 + 计数 ——
      var barX = tx, barW = w - 58 - 14 - 52, barY = y + 48;
      ctx.fillStyle = 'rgba(46,134,180,0.15)';
      roundRect(barX, barY, barW, 6, 3); ctx.fill();
      var fr = Math.min(1, cur / a.target);
      if (fr > 0) {
        ctx.fillStyle = done2 ? '#F5C542' : '#2E86B4';
        roundRect(barX, barY, Math.max(6, barW * fr), 6, 3); ctx.fill();
      }
      ctx.textAlign = 'right';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.fillStyle = done2 ? '#B8860B' : '#4A7FA0';
      ctx.fillText(done2 ? '已达成' : (a.target >= 10000 ? (Math.round(cur / 1000) / 10) + '万/' + (a.target / 10000) + '万' : cur + '/' + a.target), x + w - 12, y + 55);
    }
    ctx.restore();
    // 滚动条（超出可视区才显示）
    var maxS = achMaxScroll();
    if (maxS > 0) {
      var trH = vp.h - 8, thH = Math.max(24, trH * (vp.h / achContentH()));
      ctx.fillStyle = 'rgba(21,90,138,0.10)';
      roundRect(DEX_PANEL.x + DEX_PANEL.w - 9, vp.y + 4, 3, trH, 1.5); ctx.fill();
      ctx.fillStyle = 'rgba(21,90,138,0.28)';
      roundRect(DEX_PANEL.x + DEX_PANEL.w - 9, vp.y + 4 + (trH - thH) * (achScroll / maxS), 3, thH, 1.5); ctx.fill();
    }
    ctx.textAlign = 'center';
  }
  // 文本超宽截断（成就卡单列用；measureText 需已设字体，故先设 font 再调）
  function truncText(s, maxW) {
    if (ctx.measureText(s).width <= maxW) return s;
    while (s.length > 1 && ctx.measureText(s + '…').width > maxW) s = s.slice(0, -1);
    return s + '…';
  }

  // 每日页签：3 个按日期生成的任务（独立说明行已删，卡片上移放大）
  // 每日挑战卡（每日页签顶部）：今日海况词缀 + 目标分 + 开始按钮（热区 dchalBtnRect，systems 处理点击）
  // 菜单态离线收益告知卡（自动入账、无点击）：历史最佳行与开始按钮之间的空档，金色宝箱色系
  function drawOfflineCard() {
    if (state !== 'menu' || !offlineGain) return;
    var mu = MG.layout.menu;
    var w = mu.offlineW, h = mu.offlineH, x = (C.W - w) / 2, y = mu.offlineY;
    ctx.textBaseline = 'alphabetic'; // v299：显式固定——上游（标题艺术字）可能遗留 middle 基线
    var og = ctx.createLinearGradient(0, y, 0, y + h);
    og.addColorStop(0, 'rgba(245,197,66,0.16)');
    og.addColorStop(1, 'rgba(217,169,63,0.08)');
    ctx.fillStyle = og;
    roundRect(x, y, w, h, 10); ctx.fill();
    ctx.strokeStyle = 'rgba(245,197,66,0.55)'; ctx.lineWidth = 1.2;
    roundRect(x, y, w, h, 10); ctx.stroke();
    ctx.textAlign = 'center';
    // v288：卡高 60→80 重排三行（原末行基线 57 贴底边溢出），白字换深金棕（原近白文字
    // 压在浅金底上对比度不足，用户："离线奖励样式异常"）
    var om = offlineGain.mins;
    // v288：卡高 60→80 重排三行（原末行基线 57 贴底边溢出），白字换深金棕（原近白文字
    // 压在浅金底上对比度不足，用户："离线奖励样式异常"）
    // v289：三行按字形像素框垂直居中 + 均匀分散（用户："内部文字请使用垂直居中，均匀分散对齐"）——
    // 段间距 =（卡高 − 三行字面总高）/4，首末与卡上下边留同宽，行间留同宽
    var lines = [
      { t: '大宝箱 · 离线收益', f: 'bold 15px system-ui, sans-serif', c: '#8A6508' },
      { t: '离开 ' + (om >= 60 ? Math.floor(om / 60) + ' 时 ' + (om % 60) + ' 分' : om + ' 分钟') + ' · 深海攒下 ' + offlineGain.gain + ' 分', f: '13px system-ui, sans-serif', c: 'rgba(90,66,20,0.88)' },
      { t: '开始游戏后自动入账', f: '11px system-ui, sans-serif', c: 'rgba(125,100,40,0.62)' }
    ];
    var box = [], tot = 0, li;
    for (li = 0; li < lines.length; li++) {
      var mm = measureInk(lines[li].f, lines[li].t); // v300：恒等变换下测量
      var fp = parseFloat(lines[li].f.replace(/[^0-9.]/g, '').replace(/^[^0-9]*/, ''));
      box.push({
        a: mm.has ? mm.a : fp * 0.86,
        d: mm.has ? mm.d : fp * 0.16
      });
      tot += box[li].a + box[li].d;
    }
    var lgap = Math.max(3, (h - tot) / (lines.length + 1));
    var yy = y + lgap;
    for (li = 0; li < lines.length; li++) {
      ctx.font = lines[li].f;
      ctx.fillStyle = lines[li].c;
      yy += box[li].a;                       // 基线 = 段起点 + 该行字面 ascent
      ctx.fillText(lines[li].t, C.W / 2, yy);
      yy += box[li].d + lgap;                // 下一行段起点 = 本行字面底 + 段间距
    }
    ctx.textAlign = 'center'; // 恢复菜单流的 center——曾误设 left 泄漏给开始按钮，导致小程序文字右移溢出
  }

  // 每日挑战视图（v244 改版）：顶部今日大卡（合并「开始挑战」按钮），下方列出今日未开放的词缀
  function drawDchalCard() {
    var ci = dchalInfo();
    // —— 今日 Hero 大卡（紫色渐变，按钮合并进卡内）——
    var x = DEX_PANEL.x + 14, y = DEX_PANEL.y + 54, w = DEX_PANEL.w - 28, h = 150;
    var hg = ctx.createLinearGradient(0, y, 0, y + h);
    hg.addColorStop(0, '#7B6FD0'); hg.addColorStop(1, '#5A4AA8');
    ctx.fillStyle = hg;
    roundRect(x, y, w, h, 16); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.28)'; ctx.lineWidth = 1.2;
    roundRect(x + 0.5, y + 0.5, w - 1, h - 1, 16); ctx.stroke();
    // 装饰气泡
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.beginPath(); ctx.arc(x + w - 24, y + 20, 16, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + w - 46, y + 38, 7, 0, Math.PI * 2); ctx.fill();
    // 金色奖杯勋章
    var mx = x + 34, my = y + 58;
    ctx.fillStyle = '#FFD873';
    ctx.beginPath(); ctx.arc(mx, my, 15, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1.5; ctx.stroke();
    // 小皇冠
    ctx.fillStyle = '#8A5A18';
    ctx.beginPath();
    ctx.moveTo(mx - 7, my + 4); ctx.lineTo(mx - 7, my - 2); ctx.lineTo(mx - 3.2, my + 0.5);
    ctx.lineTo(mx, my - 5.5); ctx.lineTo(mx + 3.2, my + 0.5); ctx.lineTo(mx + 7, my - 2);
    ctx.lineTo(mx + 7, my + 4); ctx.closePath(); ctx.fill();
    // 文案（左列：标题 / 名称 / 描述）
    ctx.textAlign = 'left';
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.72)';
    ctx.fillText('今日挑战 · 连续 ' + ci.streak + ' 天', x + 58, y + 26);
    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(ci.name, x + 58, y + 50);
    ctx.font = '11.5px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillText(ci.desc, x + 58, y + 72);
    // 右侧目标（已完成转金勾）；v277：目标与挑战芯片同语义——到达最深的海洋
    ctx.textAlign = 'right';
    ctx.font = '10px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText('目标', x + w - 14, y + 36);
    if (ci.done) {
      ctx.font = 'bold 16px system-ui, sans-serif';
      ctx.fillStyle = '#FFD873';
      ctx.fillText('✓ 已完成', x + w - 14, y + 58);
    } else {
      ctx.font = 'bold 14px system-ui, sans-serif';
      ctx.fillStyle = '#FFD873';
      ctx.fillText('到达最深海洋', x + w - 14, y + 57);
    }
    // 合并进卡内的「开始挑战」按钮（金色胶囊，对局中置灰）
    var br = dchalBtnRect();
    var bg = ctx.createLinearGradient(0, br.y, 0, br.y + br.h);
    if (!ci.canStart) { bg.addColorStop(0, '#B9C9D4'); bg.addColorStop(1, '#9DB2C0'); }
    else { bg.addColorStop(0, '#F5C542'); bg.addColorStop(1, '#D9A93F'); }
    ctx.fillStyle = bg;
    roundRect(br.x, br.y, br.w, br.h, br.h / 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1;
    roundRect(br.x + 0.5, br.y + 0.5, br.w - 1, br.h - 1, br.h / 2 - 0.5); ctx.stroke();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText(ci.done ? '再玩一局' : '开始挑战', br.x + br.w / 2, br.y + br.h / 2 + 1);
    ctx.textBaseline = 'alphabetic';
    // —— 下方：深渊潜航今日未开放的词缀列表 ——
    // 分节标题条（v245 美化）：左侧色饰条 + 加粗标题 + 延伸细线 + 右对齐刷新说明
    var labelY = y + h + 26, hy = labelY - 5;
    ctx.fillStyle = '#2E86B4';
    roundRect(x, hy - 6, 3.5, 13, 1.75); ctx.fill();
    ctx.textAlign = 'left';
    ctx.font = 'bold 12.5px system-ui, sans-serif';
    ctx.fillStyle = '#155A8A';
    ctx.fillText('深渊潜航 · 今日未开放', x + 10, labelY);
    var lineX = x + 10 + Math.round(ctx.measureText('深渊潜航 · 今日未开放').width) + 10;
    var lineR = x + w - 100;
    ctx.fillStyle = 'rgba(46,110,150,0.16)';
    ctx.fillRect(lineX, hy, Math.max(0, lineR - lineX), 1);
    ctx.textAlign = 'right';
    ctx.font = '10px system-ui, sans-serif';
    ctx.fillStyle = '#A8BCCB';
    ctx.fillText('每天轮换 · 0 点刷新', x + w, labelY);
    var listY = labelY + 12, rowH = 40, rowGap = 6;
    var shown = 0;
    for (var i = 0; i < ci.list.length; i++) {
      var a = ci.list[i];
      if (a.today) continue; // 今日词缀已在上方大卡展示
      var ry = listY + shown * (rowH + rowGap);
      ctx.fillStyle = 'rgba(255,255,255,0.62)';
      roundRect(x, ry, w, rowH, 10); ctx.fill();
      ctx.strokeStyle = 'rgba(46,110,150,0.10)'; ctx.lineWidth = 1;
      roundRect(x + 0.5, ry + 0.5, w - 1, rowH - 1, 10); ctx.stroke();
      // 灰色锁形徽章
      var bx = x + 24, by = ry + rowH / 2;
      ctx.fillStyle = '#D5DFE6';
      ctx.beginPath(); ctx.arc(bx, by, 9, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#A8BCCB'; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.fillStyle = '#8AA5B8';
      roundRect(bx - 4, by - 1, 8, 6.5, 1.5); ctx.fill();
      ctx.strokeStyle = '#8AA5B8'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(bx, by - 1.5, 2.6, Math.PI, 0); ctx.stroke();
      // 名称 + 描述（灰）
      ctx.textAlign = 'left';
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.fillStyle = '#8AA5B8';
      ctx.fillText(a.name, x + 44, ry + 18);
      ctx.font = '10.5px system-ui, sans-serif';
      ctx.fillStyle = '#A8BCCB';
      ctx.fillText(a.desc + (a.mult ? ' · 得分 ×' + a.mult : ''), x + 44, ry + 33);
      // 右侧状态：v278 不再写"未开放"，改显示该词缀历史完成次数（有完成记录转金）
      ctx.textAlign = 'right';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.fillStyle = a.count > 0 ? '#D9A93F' : '#B9C9D4';
      ctx.fillText('已完成 ' + (a.count || 0) + ' 次', x + w - 12, ry + rowH / 2 + 4);
      shown++;
    }
  }

  // 每日任务视图（v247）：顶部全勤横幅卡（海洋渐变+火焰徽章）+ 5 个类型配色图标任务行
  function drawDailyTasksTab() {
    var doneCnt = 0;
    for (var di0 = 0; di0 < daily.tasks.length; di0++) if (daily.done[di0]) doneCnt++;
    var x = DEX_PANEL.x + 14, w = DEX_PANEL.w - 28;
    // —— 顶部全勤卡（全勤转金，日常为海洋蓝渐变）——
    var fy = DEX_PANEL.y + 54, fh = 80;
    var hgr = ctx.createLinearGradient(0, fy, 0, fy + fh);
    if (daily.allDone) { hgr.addColorStop(0, '#F7CE5B'); hgr.addColorStop(1, '#DFA23C'); }
    else { hgr.addColorStop(0, '#3B97C9'); hgr.addColorStop(1, '#1E6B9E'); }
    ctx.fillStyle = hgr;
    roundRect(x, fy, w, fh, 14); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1.2;
    roundRect(x + 0.5, fy + 0.5, w - 1, fh - 1, 14); ctx.stroke();
    // 装饰气泡
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.beginPath(); ctx.arc(x + w - 30, fy + 20, 18, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + w - 58, fy + 52, 8, 0, Math.PI * 2); ctx.fill();
    // 火焰连击徽章
    var mx = x + 36, my = fy + 40;
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.beginPath(); ctx.arc(mx, my, 21, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.textAlign = 'center';
    ctx.font = '20px system-ui, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('🔥', mx, my + 7);
    // 文案
    ctx.textAlign = 'left';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('今日全勤奖励', x + 66, fy + 30);
    ctx.font = '10.5px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.78)';
    ctx.fillText('已连续 ' + (daily.streak || 0) + ' 天 · 全勤可得分数与充能加成', x + 66, fy + 50);
    ctx.fillText('任务每日 0 点刷新 · 难度随连续天数提升', x + 66, fy + 66);
    // 右侧完成数 + 进度点
    ctx.textAlign = 'right';
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(doneCnt + '/' + daily.tasks.length, x + w - 16, fy + 34);
    var dotGap = 14, dotR = 4, dotX0 = x + w - 16 - (daily.tasks.length - 1) * dotGap;
    for (var di = 0; di < daily.tasks.length; di++) {
      ctx.fillStyle = daily.done[di] ? '#FFD873' : 'rgba(255,255,255,0.28)';
      ctx.beginPath(); ctx.arc(dotX0 + di * dotGap, fy + 56, dotR, 0, Math.PI * 2); ctx.fill();
      if (daily.done[di]) { ctx.strokeStyle = 'rgba(138,90,24,0.4)'; ctx.lineWidth = 1; ctx.stroke(); }
    }
    // —— 5 个任务行（v249 单色极简：统一灰蓝圆形图标块 + 白色简笔图形）——
    var ACCENT = '#8FA9BA', TINT = 'rgba(143,169,186,0.10)';
    var base = fy + fh + 12, rowH = 62, step = 72;
    for (var i = 0; i < daily.tasks.length; i++) {
      var t = daily.tasks[i], done = daily.done[i];
      var frac = Math.min(1, (daily.prog[i] || 0) / t.need);
      var ty0 = base + i * step;
      if (done) {
        var og = ctx.createLinearGradient(0, ty0, 0, ty0 + rowH);
        og.addColorStop(0, 'rgba(245,197,66,0.20)'); og.addColorStop(1, 'rgba(217,169,63,0.10)');
        ctx.fillStyle = og;
      } else {
        ctx.fillStyle = TINT;
      }
      roundRect(x, ty0, w, rowH, 12); ctx.fill();
      ctx.strokeStyle = done ? 'rgba(217,169,63,0.45)' : 'rgba(46,110,150,0.12)';
      ctx.lineWidth = 1;
      roundRect(x + 0.5, ty0 + 0.5, w - 1, rowH - 1, 12); ctx.stroke();
      // 圆形图标底 + 游戏本体现有图标（水滴/技能/宝箱/海域徽章/礁石，不自绘）
      var ix = x + 12, iy = ty0 + (rowH - 40) / 2, icx = ix + 20, icy = iy + 20;
      ctx.fillStyle = done ? 'rgba(217,169,63,0.16)' : 'rgba(143,169,186,0.16)';
      ctx.beginPath(); ctx.arc(icx, icy, 20, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = done ? 'rgba(217,169,63,0.40)' : 'rgba(46,110,150,0.16)';
      ctx.lineWidth = 1; ctx.stroke();
      ctx.save();
      ctx.translate(icx, icy);
      ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI * 2); ctx.clip();
      if (done) {
        ctx.strokeStyle = '#C9922A'; ctx.lineWidth = 2.8; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(-7, 0.5); ctx.lineTo(-2, 5.5); ctx.lineTo(7, -5);
        ctx.stroke();
        ctx.lineCap = 'butt'; ctx.lineJoin = 'miter';
      } else if (t.type === 'merge') {
        drawBall({ x: 0, y: 0, r: 14, tier: t.tier, vx: 0, vy: 0 }, 1); // 任务指定的那颗水滴
      } else if (t.type === 'combo') {
        ctx.scale(1.6, 1.6);
        drawSkillIcon('ripple', 0, 0, '#2FA8A0'); // 连锁波纹（技能图标）
      } else if (t.type === 'chest') {
        drawChestIcon(0, 1, 0.62); // 场上宝箱同款
      } else if (t.type === 'tide') {
        ctx.scale(1.5, 1.5);
        drawSeaBadge(seaStage(), 0, 0, true); // 当前海域徽章
      } else {
        drawIronBall({ x: 0, y: 0, r: 13, vx: 0, vy: 0 }, 1); // 礁石丛（v358 重绘）
      }
      ctx.restore();
      // 标题 + 右上难度星与奖励
      ctx.textAlign = 'left';
      ctx.font = 'bold 13.5px system-ui, sans-serif';
      ctx.fillStyle = done ? '#B8860B' : '#155A8A';
      ctx.fillText(truncText(t.text, w - 58 - 118), x + 62, ty0 + 25);
      ctx.textAlign = 'right';
      var rst = '';
      for (var ds = 0; ds < (t.stars || 1); ds++) rst += '★';
      var rv = Math.round(C.daily.rewardScore * (1 + ((t.stars || 1) - 1) * 0.5));
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.fillStyle = done ? '#B8860B' : '#C99B3F';
      ctx.fillText(rst + ' +' + rv + ' 分', x + w - 12, ty0 + 25);
      // 底部进度条（颜色随任务类型）+ 右侧计数
      var barX = x + 62, barW = w - 62 - 14 - 64;
      ctx.fillStyle = 'rgba(46,134,180,0.15)';
      roundRect(barX, ty0 + 42, barW, 6, 3); ctx.fill();
      if (frac > 0) {
        ctx.fillStyle = done ? '#F5C542' : ACCENT;
        roundRect(barX, ty0 + 42, Math.max(6, barW * frac), 6, 3); ctx.fill();
      }
      ctx.textAlign = 'right';
      ctx.font = 'bold 10.5px system-ui, sans-serif';
      ctx.fillStyle = done ? '#B8860B' : '#4A7FA0';
      var needTxt = t.need >= 10000 ? (Math.round(t.need / 1000) / 10) + '万' : t.need;
      var progTxt = (daily.prog[i] || 0) >= 10000 ? (Math.round((daily.prog[i] || 0) / 1000) / 10) + '万' : (daily.prog[i] || 0);
      ctx.fillText(done ? '已完成' : (progTxt + '/' + needTxt), x + w - 12, ty0 + 50);
    }
    ctx.textAlign = 'center';
  }

  // 榜单页签（v251）：顶部「我的排名」横幅 + 前三名领奖台 + 名次列表
  function drawRankTab() {
    var rows = friendBoard();
    // —— 顶部我的排名横幅（海洋渐变）——
    var meIdx = 0;
    for (var m = 0; m < rows.length; m++) if (rows[m].me) { meIdx = m; break; }
    var bx = DEX_PANEL.x + 14, by = DEX_PANEL.y + 54, bw = DEX_PANEL.w - 28, bh = 60;
    var bgd = ctx.createLinearGradient(0, by, 0, by + bh);
    bgd.addColorStop(0, '#3B97C9'); bgd.addColorStop(1, '#1E6B9E');
    ctx.fillStyle = bgd;
    roundRect(bx, by, bw, bh, 12); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1.2;
    roundRect(bx + 0.5, by + 0.5, bw - 1, bh - 1, 12); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.beginPath(); ctx.arc(bx + bw - 24, by + 16, 14, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(bx + bw - 46, by + 44, 6, 0, Math.PI * 2); ctx.fill();
    // 左侧名次章
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.beginPath(); ctx.arc(bx + 30, by + 30, 18, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.textAlign = 'center';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('#' + (meIdx + 1), bx + 30, by + 35);
    // 中间文案
    ctx.textAlign = 'left';
    ctx.font = '10.5px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fillText('我的最佳成绩', bx + 58, by + 25);
    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(fmtScore(rows[meIdx].score), bx + 58, by + 47);
    // 右侧超越数
    ctx.textAlign = 'right';
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fillText('超越 ' + (rows.length - 1 - meIdx) + ' 位好友', bx + bw - 16, by + 35);
    // —— 前三名领奖台（视觉顺序 2/1/3，第一名更高 + 小皇冠）——
    // v281：整体加高（76/100/64→84/108/72）+ 奖牌上移、名称/分数下移——修复名次章与用户名重叠
    var colW = 108, gap = 14, yBase = DEX_PANEL.y + 236;
    var tops = [rows[1], rows[0], rows[2]];
    var hts = [84, 108, 72], medals = ['#C9D4DC', '#F5C542', '#E0B58A'];
    var grads = [['#DDE6EC', '#AEBEC9'], ['#FFE08A', '#D9A93F'], ['#EFCAA2', '#C29263']];
    for (var p = 0; p < 3; p++) {
      var px0 = DEX_PANEL.x + 14 + p * (colW + gap), ph = hts[p], py0 = yBase - ph;
      var pg = ctx.createLinearGradient(0, py0, 0, yBase);
      pg.addColorStop(0, grads[p][0]); pg.addColorStop(1, grads[p][1]);
      ctx.fillStyle = pg;
      roundRect(px0, py0, colW, ph, 10); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1;
      roundRect(px0 + 0.5, py0 + 0.5, colW - 1, yBase - py0 - 1, 10); ctx.stroke();
      // 奖牌（第一名戴小皇冠；v281：my=py0+20、王冠收小——冠顶 py0+2 在台面内，不再越出领奖台）
      var mx = px0 + colW / 2, my = py0 + 20;
      ctx.fillStyle = medals[p];
      ctx.beginPath(); ctx.arc(mx, my, 12, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 1.5; ctx.stroke();
      if (p === 1) {
        ctx.fillStyle = '#B8860B';
        ctx.beginPath();
        ctx.moveTo(mx - 5, my - 12); ctx.lineTo(mx - 5, my - 16); ctx.lineTo(mx - 2.2, my - 14);
        ctx.lineTo(mx, my - 18); ctx.lineTo(mx + 2.2, my - 14); ctx.lineTo(mx + 5, my - 16);
        ctx.lineTo(mx + 5, my - 12); ctx.closePath(); ctx.fill();
      }
      ctx.textAlign = 'center';
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.fillStyle = '#FFFFFF';
      // v283：名次章标注真实名次 [2,1,3]（左二/中一/右三）——此前按台位顺序误标 1/2/3
      ctx.fillText(String([2, 1, 3][p]), mx, my + 4.5);
      ctx.font = '11.5px system-ui, sans-serif';
      ctx.fillStyle = p === 1 ? '#7A5608' : '#3E647E';
      ctx.fillText(truncText(tops[p].name, colW - 12), mx, py0 + 48);
      ctx.font = 'bold 13.5px system-ui, sans-serif';
      ctx.fillStyle = p === 1 ? '#7A5608' : '#155A8A';
      ctx.fillText(fmtScore(tops[p].score), mx, py0 + 66);
    }
    // 台阶底座
    ctx.fillStyle = 'rgba(46,134,180,0.10)';
    roundRect(DEX_PANEL.x + 14, yBase, DEX_PANEL.w - 28, 8, 4); ctx.fill();
    // —— 第 4 名起列表 ——
    for (var i = 3; i < rows.length; i++) {
      var r = rows[i], ry = DEX_PANEL.y + 262 + (i - 3) * 70;
      ctx.fillStyle = r.me ? 'rgba(245,197,66,0.16)' : 'rgba(46,134,180,0.06)';
      roundRect(DEX_PANEL.x + 14, ry, DEX_PANEL.w - 28, 54, 9); ctx.fill();
      ctx.strokeStyle = r.me ? 'rgba(217,169,63,0.5)' : 'rgba(46,110,150,0.10)';
      ctx.lineWidth = 1;
      roundRect(DEX_PANEL.x + 14.5, ry + 0.5, DEX_PANEL.w - 29, 53, 9); ctx.stroke();
      ctx.textAlign = 'center';
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.fillStyle = '#4A7FA0';
      ctx.fillText(String(i + 1), DEX_PANEL.x + 38, ry + 33);
      ctx.textAlign = 'left';
      ctx.font = (r.me ? 'bold ' : '') + '13px system-ui, sans-serif';
      ctx.fillStyle = r.me ? '#B8860B' : '#155A8A';
      ctx.fillText(r.me ? r.name + '（你）' : r.name, DEX_PANEL.x + 58, ry + 33);
      ctx.textAlign = 'right';
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.fillStyle = r.me ? '#B8860B' : '#3E6E90';
      ctx.fillText(fmtScore(r.score), DEX_PANEL.x + DEX_PANEL.w - 26, ry + 33);
    }
    ctx.textAlign = 'center';
  }
  // 分数千分位省略显示（榜单/挑战用）：≥1 万显示"x.x万"
  function fmtScore(n) {
    if (n >= 10000) return (Math.round(n / 1000) / 10) + '万';
    return String(n);
  }

  // 战报分享卡片（结算页"分享战报"打开；上线后接 wx.shareAppMessage）
  function drawShare() {
    // 压暗背景已上移 drawPanelFx 统一绘制（v275）
    var sr = MG.layout.shareRect(); // 锚定游戏区焦点（v161 定版中心），块高变化不漂流
    var pw = sr.w, ph = sr.h, px = sr.x, py = sr.y;
    panel(px, py, pw, ph, 16, 0.97);
    // 卡片头：深海渐变 + 标题
    var head = ctx.createLinearGradient(0, py, 0, py + 96);
    head.addColorStop(0, '#2E86B4'); head.addColorStop(1, '#155A8A');
    ctx.fillStyle = head;
    roundRect(px, py, pw, 96, 16); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    roundRect(px, py + 80, pw, 16, 8); ctx.fill();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 25px system-ui, sans-serif';
    // v275：页头图标（📤 与分享按钮同款）+ 标题同一水平中线
    var shTw = ctx.measureText('水滴合成深海 · 深海战报').width;
    var shIcX = C.W / 2 - shTw / 2 - 26, shIcY = py + 33;
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.beginPath(); ctx.arc(shIcX, shIcY, 14, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.font = '16px system-ui, sans-serif';
    ctx.fillText('📤', shIcX, shIcY + 6);
    ctx.font = 'bold 25px system-ui, sans-serif';
    ctx.fillText('水滴合成深海 · 深海战报', C.W / 2, py + 40);
    ctx.font = '14px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillText(C.seaStages[seaStage()].name + ' · ' + daily.date, C.W / 2, py + 66);
    // 大分数
    ctx.font = 'bold 58px system-ui, sans-serif';
    ctx.fillStyle = '#0F4C79';
    ctx.fillText(String(score), C.W / 2, py + 168);
    ctx.font = '15px system-ui, sans-serif';
    ctx.fillStyle = '#4A7FA0';
    var isNewBest = score >= best && score > 0;
    ctx.fillText(isNewBest ? '★ 新纪录！' : '最佳 ' + best, C.W / 2, py + 192);
    // 统计格
    var stats = [['最高连击', '×' + Math.max(1, maxCombo)], ['汇入海域', '×' + seaCount], ['当前海域', C.seaStages[seaStage()].name]];
    for (var i = 0; i < stats.length; i++) {
      var sx = px + 30 + i * ((pw - 60) / 3), sw = (pw - 60) / 3;
      ctx.fillStyle = 'rgba(46,134,180,0.08)';
      roundRect(sx, py + 214, sw - 8, 54, 8); ctx.fill();
      ctx.fillStyle = '#155A8A';
      ctx.font = 'bold 18px system-ui, sans-serif';
      ctx.fillText(stats[i][1], sx + (sw - 8) / 2, py + 240);
      ctx.fillStyle = '#4A7FA0';
      ctx.font = '13px system-ui, sans-serif';
      ctx.fillText(stats[i][0], sx + (sw - 8) / 2, py + 258);
    }
    // 分享文案预览（左对齐 + 按行数自适应盒高）
    ctx.textAlign = 'left';
    ctx.font = '14px system-ui, sans-serif';
    var shLines = wrapLines(shareText, pw - 60);
    var shBoxH = Math.max(44, 20 + shLines.length * 16);
    ctx.fillStyle = 'rgba(46,134,180,0.06)';
    roundRect(px + 20, py + 278, pw - 40, shBoxH, 8); ctx.fill();
    ctx.fillStyle = '#3E6E90';
    for (var li = 0; li < shLines.length; li++) ctx.fillText(shLines[li], px + 32, py + 296 + li * 16);
    ctx.textAlign = 'center';
    // 按钮：复制文案 / 关闭（关闭提示放按钮上方，避免贴面板底边被圆角裁切）
    shareCopyBtn.x = px + 20; shareCopyBtn.y = py + ph - 62; shareCopyBtn.w = pw - 40; shareCopyBtn.h = 42;
    ctx.font = '14px system-ui, sans-serif';
    ctx.fillStyle = '#8AA5B8';
    ctx.fillText('点击卡片外任意位置关闭', C.W / 2, shareCopyBtn.y - 12);
    var bg2 = ctx.createLinearGradient(0, shareCopyBtn.y, 0, shareCopyBtn.y + 42);
    bg2.addColorStop(0, '#3B9BD0'); bg2.addColorStop(1, '#2578A8');
    ctx.fillStyle = bg2;
    roundRect(shareCopyBtn.x, shareCopyBtn.y, shareCopyBtn.w, shareCopyBtn.h, 12); ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 19px system-ui, sans-serif';
    ctx.fillText('复制分享文案', C.W / 2, shareCopyBtn.y + 27);
  }
  function wrapLines(text, maxW) {
    var lines = [], line = '';
    for (var i = 0; i < text.length; i++) {
      var test = line + text[i];
      if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = text[i]; }
      else line = test;
    }
    if (line) lines.push(line);
    return lines;
  }

;
// ===== js/render.js =====
// 水滴合成深海 - render：绘制工具与游戏渲染（背景 / 水滴 / 宝箱 / HUD / 结算）；面板绘制见 panels.js
// 模块加载顺序 3/4（依赖 core+systems 的状态与画布上下文；顶层仅有渐变缓存初始化）。
// （面板几何与面板绘制已拆分至 panels.js：DEX_PANEL/页签/分节 rect 与图鉴/成就/每日/榜单/分享卡绘制）
  // ---------- 渲染工具 ----------
  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function panel(x, y, w, h, r, alpha) {
    ctx.fillStyle = 'rgba(255,255,255,' + (alpha || 0.72) + ')';
    roundRect(x, y, w, h, r); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 1;
    roundRect(x + 0.5, y + 0.5, w - 1, h - 1, r - 0.5); ctx.stroke();
    ctx.strokeStyle = 'rgba(46,110,150,0.14)';
    roundRect(x + 0.5, y + 0.5, w - 1, h - 1, r - 0.5); ctx.stroke();
  }
  // ---------- v274：弹出面板通用弹性出入场（用户："弹出页签都要添加弹性入场、弹性出场"）----------
  // 入场 0.34s easeOutBack（放大过冲回弹），出场 0.28s easeInBack（先轻外扩再收拢归零）；
  // 关闭后 flag 已 false 但动画未完仍继续绘制（调用方用 panelFxAlive 判断），k 归零自动清理。
  // 所有弹层（设置/确认/图鉴/成就页签/词缀三选一/分享卡）统一走 drawPanelFx 包裹。
  var _panelFx = {};
  function _fxOutBack(t) { var c1 = 1.70158, c3 = c1 + 1, p = t - 1; return 1 + c3 * p * p * p + c1 * p * p; }
  function _fxInBack(t) { var c1 = 1.70158, c3 = c1 + 1; return c3 * t * t * t - c1 * t * t; }
  function panelFxK(name, open) {
    var now = performance.now() / 1000;
    var a = _panelFx[name];
    if (!a) { a = _panelFx[name] = { open: open, t0: now }; }
    else if (a.open !== open) { a.open = open; a.t0 = now; }
    var t = (now - a.t0) / (open ? 0.34 : 0.28);
    if (open) return t >= 1 ? 1 : _fxOutBack(t);
    if (t >= 1) { delete _panelFx[name]; return 0; }
    return 1 - _fxInBack(t);
  }
  function panelFxAlive(name) { return !!_panelFx[name]; }
  // 围绕面板中心 (cx,cy) 施加弹性变换后调用 fn 绘制页签本体；压暗背景（dimA）在变换外
  // 单独绘制、只做整体淡入淡出——v275：弹性动画只覆盖页签范围，不带动全屏背景缩放
  function drawPanelFx(name, open, cx, cy, dimA, fn) {
    var k = panelFxK(name, open);
    if (k <= 0) return;
    if (dimA > 0) {
      ctx.save();
      ctx.globalAlpha *= Math.max(0, Math.min(1, k * 5));
      ctx.fillStyle = 'rgba(10,40,70,' + dimA + ')';
      ctx.fillRect(-BX, -renderOy, C.W + BX * 2, VH);
      ctx.restore();
    }
    ctx.save();
    ctx.globalAlpha *= Math.max(0, Math.min(1, k * 5));
    var sc = 0.82 + 0.18 * k;
    ctx.translate(cx, cy); ctx.scale(sc, sc); ctx.translate(-cx, -cy);
    fn();
    ctx.restore();
  }
  function shade(hex, amt) {
    var n = parseInt(hex.slice(1), 16);
    var r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    if (amt < 0) { r *= 1 + amt; g *= 1 + amt; b *= 1 + amt; }
    else { r += (255 - r) * amt; g += (255 - g) * amt; b += (255 - b) * amt; }
    r = Math.round(Math.min(255, Math.max(0, r)));
    g = Math.round(Math.min(255, Math.max(0, g)));
    b = Math.round(Math.min(255, Math.max(0, b)));
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }
  // 颜色插值（海域换色渐变用）：支持 '#RRGGBB' 与 'rgb/rgba(...)' 两种写法
  function parseCol(c) {
    if (c.charAt(0) === '#') {
      var n = parseInt(c.slice(1), 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1];
    }
    var m = c.match(/rgba?\(([^)]+)\)/);
    if (m) {
      var p = m[1].split(',');
      return [parseFloat(p[0]), parseFloat(p[1]), parseFloat(p[2]), p.length > 3 ? parseFloat(p[3]) : 1];
    }
    return [0, 0, 0, 1];
  }
  function mixCol(a, b, k) {
    var A = parseCol(a), B = parseCol(b);
    var r = Math.round(A[0] + (B[0] - A[0]) * k),
        g = Math.round(A[1] + (B[1] - A[1]) * k),
        bl = Math.round(A[2] + (B[2] - A[2]) * k),
        al = +(A[3] + (B[3] - A[3]) * k).toFixed(3);
    return 'rgba(' + r + ',' + g + ',' + bl + ',' + al + ')';
  }

  // ---------- 背景：深海渐变（全窗口宽） + 顶部柔光 + 波光 + 气泡 ----------
  // ---------- 渐变缓存（性能：每帧 create 渐变产生对象 churn + GC 压力，按 key 复用） ----------
  // Canvas 渐变坐标在"绘制时"才被 CTM 变换，因此同一局部坐标定义的渐变可跨帧/跨对象复用。
  var _gradCache = {};
  function grad(key, make) {
    var g = _gradCache[key];
    if (!g) {
      if (Object.keys(_gradCache).length > 96) _gradCache = {}; // 简单防膨胀（罕见：pop 缩放等动态 key）
      g = make();
      _gradCache[key] = g;
    }
    return g;
  }
  // v300：恒等变换下的文本测量——规范规定 measureText 不受 CTM 影响，但微信部分基础库的
  // 实现会把返回值（width 与 actualBoundingBoxAscent/Descent）按当前变换放大（真机 dpr×view.s
  // ≈2~3 倍），造成"读秒文字下沉/卡宽虚胖"。统一在恒等变换下测量，两端引擎结果一致。
  function measureInk(font, text) {
    ctx.save();
    try {
      // 恒等变换测量；极老基础库若无 setTransform 则保持原变换（退回旧行为，不致崩溃）
      if (ctx.setTransform) ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.font = font;
      var m = ctx.measureText(text);
      return {
        w: m.width,
        a: m.actualBoundingBoxAscent,
        d: m.actualBoundingBoxDescent,
        has: m.actualBoundingBoxAscent != null
      };
    } finally {
      ctx.restore();
    }
  }

  function drawBackground() {
    // 深海渐变（铺满整个窗口，两侧即延伸海水）；色调随海域里程碑逐级加深，
    // 跨里程碑时在 1.8s 内从旧海域色平滑插值到新海域色（seaBlend 提供进度）
    var stg = seaStage();
    var sb = seaBlend();
    var st;
    if (sb) {
      var sA = C.seaStages[sb.from], sB = C.seaStages[sb.to], k = sb.k;
      st = {
        bg: [mixCol(sA.bg[0], sB.bg[0], k), mixCol(sA.bg[1], sB.bg[1], k), mixCol(sA.bg[2], sB.bg[2], k), mixCol(sA.bg[3], sB.bg[3], k)],
        shade: mixCol(sA.shade, sB.shade, k)
      };
    } else st = C.seaStages[stg];
    // 渐变缓存 key：过渡期按 1/24 步长量化（视觉无级差，缓存不爆炸）
    var sk = sb ? 'F' + sb.from + '_' + sb.to + '_' + Math.round(sb.k * 24) : '' + stg;
    var vk = Math.round(VH), lk = Math.round(LW);
    var bg = grad('bg' + sk + '_' + vk, function () {
      var gg = ctx.createLinearGradient(0, 0, 0, VH);
      gg.addColorStop(0, st.bg[0]);
      gg.addColorStop(0.4, st.bg[1]);
      gg.addColorStop(0.75, st.bg[2]);
      gg.addColorStop(1, st.bg[3]);
      return gg;
    });
    ctx.fillStyle = bg;
    ctx.fillRect(0, -1, LW, VH + 2);

    // 顶部阳光光晕 + 两侧柔光（静态光斑，缓存渐变）
    ctx.fillStyle = grad('sun' + lk, function () {
      var gg = ctx.createRadialGradient(LW * 0.5, -30, 20, LW * 0.5, -30, 300);
      gg.addColorStop(0, 'rgba(255,255,255,0.55)');
      gg.addColorStop(1, 'rgba(255,255,255,0)');
      return gg;
    });
    ctx.fillRect(0, 0, LW, 300);
    ctx.fillStyle = grad('glowL' + lk, function () {
      var gg = ctx.createRadialGradient(LW * 0.22, -50, 10, LW * 0.22, -50, 280);
      gg.addColorStop(0, 'rgba(255,255,255,0.30)'); // v347：与 glowR 对齐，消除左亮右暗的偏侧感
      gg.addColorStop(1, 'rgba(255,255,255,0)');
      return gg;
    });
    ctx.fillRect(0, 0, LW, 300);
    ctx.fillStyle = grad('glowR' + lk, function () {
      var gg = ctx.createRadialGradient(LW * 0.8, -50, 10, LW * 0.8, -50, 280);
      gg.addColorStop(0, 'rgba(255,255,255,0.30)'); // v347：与 glowL 对齐
      gg.addColorStop(1, 'rgba(255,255,255,0)');
      return gg;
    });
    ctx.fillRect(0, 0, LW, 300);

    // 两侧延伸海水柔和压暗（游戏区居中成为视觉焦点，主流 letterbox 质感）
    if (BX > 0) {
      var edge = BX + 26; // 仅轻微溢入游戏区，避免在缸体内形成可见的明暗台阶
      var ek = Math.round(edge);
      ctx.fillStyle = grad('shadeL' + lk + '_' + ek + '_' + sk, function () {
        var gg = ctx.createLinearGradient(0, 0, edge, 0);
        gg.addColorStop(0, st.shade);
        gg.addColorStop(1, 'rgba(16,56,96,0)');
        return gg;
      });
      ctx.fillRect(0, 0, edge, VH);
      ctx.fillStyle = grad('shadeR' + lk + '_' + ek + '_' + sk, function () {
        var gg = ctx.createLinearGradient(LW, 0, LW - edge, 0);
        gg.addColorStop(0, st.shade);
        gg.addColorStop(1, 'rgba(16,56,96,0)');
        return gg;
      });
      ctx.fillRect(LW - edge, 0, edge, VH);
    }

    // 顶部斜射光柱（缓慢摇曳 + 呼吸明暗，营造水下丁达尔效应）
    // v287：光柱 x 锚定游戏块（BX + 块内比例位）——窗口横向缩放时光柱不位移（用户：
    // "雨等背景元素不应该随窗口横向范围的变化而改变位置"），只随块居中平移
    // 性能：渐变只建一次（满 alpha），明暗用 globalAlpha 表达
    var ray = grad('ray' + vk, function () {
      var gg = ctx.createLinearGradient(0, 0, 0, VH * 0.72);
      gg.addColorStop(0, 'rgba(255,255,255,1)');
      gg.addColorStop(1, 'rgba(255,255,255,0)');
      return gg;
    });
    for (var bi = 0; bi < 3; bi++) {
      // v348：三道位置 0.16/0.46/0.76 → 0.18/0.50/0.82（旧组中心 0.46 而非 0.50，整组左偏 17px）
      var bx0 = BX + C.W * (0.18 + bi * 0.32) + Math.sin(time * 0.13 + bi * 2.1) * C.W * 0.04;
      var tilt = Math.sin(time * 0.09 + bi * 1.4) * 0.10 + (bi - 1) * 0.06;
      var bw = 70 - Math.abs(bi - 1) * 18; // v348：中间宽两侧窄（旧 46/70/94 左细右粗，也是不对称）
      var rayA = 0.05 + 0.035 * (0.5 + 0.5 * Math.sin(time * 0.23 + bi * 2.6));
      ctx.save();
      ctx.translate(bx0, -10);
      ctx.rotate(tilt);
      // 边缘软化：4 层递缩宽度叠加（外层淡、内层实），左右两侧形成渐变过渡不再生硬
      var LAYERS = [[1, 0.14], [0.74, 0.2], [0.48, 0.28], [0.24, 0.38]]; // [宽度比, alpha 比]（中心累计≈1）
      for (var li = 0; li < LAYERS.length; li++) {
        ctx.globalAlpha = rayA * LAYERS[li][1];
        ctx.fillStyle = ray;
        var lw = bw * LAYERS[li][0];
        ctx.fillRect(-lw / 2, 0, lw, VH * 0.82);
      }
      ctx.restore();
    }

    // 远处缓慢漂移的水波纹
    // v348：条数随屏宽 + 相位按周期均分（旧版 ri*240 固定偏移，宽屏下三条全落在左半屏，
    // 且 10~22px/s 极慢、聚左状态要持续数十秒——这是"左边比右边丰富"最主要、最持久的来源）
    ctx.strokeStyle = 'rgba(255,255,255,0.10)';
    ctx.lineWidth = 1.5;
    var ripN = Math.min(6, Math.max(3, Math.round(LW / 260)));
    var ripSpan = LW + 300;
    for (var ri = 0; ri < ripN; ri++) {
      var rx = ((time * (10 + (ri % 3) * 6) + ri * (ripSpan / ripN)) % ripSpan) - 150;
      var rp = ripN > 1 ? ri / (ripN - 1) : 0.5;                 // 纵向按条带均分（不随条数挤在顶部）
      var ry = VH * (0.22 + 0.62 * rp);
      ctx.beginPath();
      ctx.ellipse(rx, ry, 90 + (ri % 3) * 24, 12 + (ri % 3) * 4, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 水母（脉动穹顶伞盖 + 波浪裙边 + 内层高光 + 圆头飘带触手）
    var i, jl, tt;
    for (i = 0; i < jellies.length; i++) {
      jl = jellies[i];
      var pulse = 0.85 + 0.15 * Math.sin(time * 1.5 + jl.ph);
      ctx.save();
      ctx.translate(jl.x, jl.y);
      ctx.globalAlpha = 0.32;
      // 触手（5 条，长短错落、摆动相位错开；根部精确落在裙边波浪线上，x 随伞盖脉动同步收张——不再与身子脱节）
      ctx.strokeStyle = 'rgba(' + jl.tint + ',0.55)';
      ctx.lineWidth = 1.6;
      ctx.lineCap = 'round';
      for (tt = -2; tt <= 2; tt++) {
        var tx0 = tt * jl.s * 0.28 * pulse;
        var tu = (tt * 0.28 + 1) / 2; // 与裙边同参数化：u = (x/宽 + 1)/2
        var ty0 = Math.sin(tu * Math.PI * 2 + time * 2 + jl.ph) * jl.s * 0.06;
        var tl = jl.s * (1.8 - Math.abs(tt) * 0.2);
        ctx.beginPath();
        ctx.moveTo(tx0, ty0 + 1);
        ctx.quadraticCurveTo(tx0 + Math.sin(time * 2 + jl.ph + tt * 1.3) * 6, ty0 + tl * 0.55,
                             tx0 + Math.sin(time * 1.3 + tt * 1.7) * 9, ty0 + tl);
        ctx.stroke();
      }
      ctx.lineCap = 'butt';
      // 伞盖（脉动穹顶）
      ctx.fillStyle = 'rgba(' + jl.tint + ',0.6)';
      ctx.beginPath();
      ctx.ellipse(0, 0, jl.s * pulse, jl.s * 0.8 / pulse, 0, Math.PI, Math.PI * 2);
      ctx.closePath(); ctx.fill();
      // 波浪裙边（下缘）
      ctx.strokeStyle = 'rgba(' + jl.tint + ',0.65)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (var sk = 0; sk <= 8; sk++) {
        var sx = -jl.s * pulse + (sk / 8) * 2 * jl.s * pulse;
        var sy = Math.sin((sk / 8) * Math.PI * 2 + time * 2 + jl.ph) * jl.s * 0.06;
        if (sk === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
      }
      ctx.stroke();
      // 内穹顶高光弧
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = 1.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.ellipse(0, -jl.s * 0.05, jl.s * 0.6 * pulse, jl.s * 0.42 / pulse, 0, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
      ctx.lineCap = 'butt';
      ctx.restore();
    }

    // 鱼群剪影（渐变纺锤体 + 贴体叉形尾 + 小背鳍/腹鳍 + 眼点）
    // 每条鱼带 fade（0~1 淡入淡出）与 tint/tintD（海域专属体色）
    for (i = 0; i < fishes.length; i++) {
      var f = fishes[i];
      if (f.fade <= 0.01) continue;
      ctx.save();
      ctx.globalAlpha = Math.min(1, f.fade);
      ctx.translate(f.x, f.y);
      ctx.scale(f.dir, 1);
      var twk = Math.sin(f.tail) * f.s * 0.18;
      // 渐变缓存：坐标在缩放后的局部空间定义，同一鱼的 s 恒定 → 直接复用
      var bodyG = grad('fish' + Math.round(f.s) + '_' + f.tint, function () {
        var gg = ctx.createLinearGradient(0, -f.s * 0.45, 0, f.s * 0.45);
        gg.addColorStop(0, 'rgba(' + f.tint + ',0.32)');
        gg.addColorStop(1, 'rgba(' + f.tintD + ',0.18)');
        return gg;
      });
      ctx.fillStyle = bodyG;
      // 叉形尾鳍（随 tail 摆动）
      ctx.beginPath();
      ctx.moveTo(-f.s * 0.55, twk * 0.3);
      ctx.quadraticCurveTo(-f.s * 0.95, -f.s * 0.12 + twk * 0.4, -f.s * 1.28, -f.s * 0.4 + twk);
      ctx.quadraticCurveTo(-f.s * 1.0, twk * 0.9, -f.s * 1.28, f.s * 0.4 + twk);
      ctx.quadraticCurveTo(-f.s * 0.95, f.s * 0.12 + twk * 0.4, -f.s * 0.55, twk * 0.3);
      ctx.closePath(); ctx.fill();
      // 身体（纺锤轮廓，一笔成形）
      ctx.beginPath();
      ctx.moveTo(f.s, 0);
      ctx.quadraticCurveTo(f.s * 0.72, -f.s * 0.4, f.s * 0.28, -f.s * 0.44);
      ctx.quadraticCurveTo(-f.s * 0.12, -f.s * 0.44, -f.s * 0.42, -f.s * 0.24);
      ctx.quadraticCurveTo(-f.s * 0.58, -f.s * 0.12, -f.s * 0.62, twk * 0.3);
      ctx.quadraticCurveTo(-f.s * 0.58, f.s * 0.12, -f.s * 0.42, f.s * 0.24);
      ctx.quadraticCurveTo(-f.s * 0.12, f.s * 0.44, f.s * 0.28, f.s * 0.44);
      ctx.quadraticCurveTo(f.s * 0.72, f.s * 0.4, f.s, 0);
      ctx.closePath(); ctx.fill();
      // 背鳍（贴背）
      ctx.beginPath();
      ctx.moveTo(-f.s * 0.15, -f.s * 0.42);
      ctx.quadraticCurveTo(f.s * 0.02, -f.s * 0.64, f.s * 0.28, -f.s * 0.4);
      ctx.closePath(); ctx.fill();
      // 腹鳍（小）
      ctx.beginPath();
      ctx.moveTo(f.s * 0.08, f.s * 0.38);
      ctx.quadraticCurveTo(-f.s * 0.02, f.s * 0.58, -f.s * 0.2, f.s * 0.38);
      ctx.closePath(); ctx.fill();
      // 眼点
      ctx.fillStyle = 'rgba(225,244,255,0.6)';
      ctx.beginPath();
      ctx.arc(f.s * 0.6, -f.s * 0.1, Math.max(1, f.s * 0.06), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 微光闪粒
    for (i = 0; i < glitters.length; i++) {
      var gl = glitters[i];
      var ga = 0.12 + 0.22 * Math.max(0, Math.sin(time * gl.sp + gl.ph));
      ctx.fillStyle = 'rgba(255,255,255,' + ga + ')';
      ctx.beginPath(); ctx.arc(gl.x, gl.y, gl.r, 0, Math.PI * 2); ctx.fill();
    }

    // 顶部波光带
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (var x = 0; x <= LW; x += 8) {
      var y = 16 + Math.sin(x * 0.05 + time * 1.6) * 3 + Math.sin(x * 0.11 - time * 1.1) * 2;
      if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.globalAlpha = 0.25;
    ctx.beginPath();
    for (x = 0; x <= LW; x += 8) {
      y = 26 + Math.sin(x * 0.06 - time * 1.2) * 3;
      if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();

    // 上升气泡
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1.2;
    for (i = 0; i < bubbles.length; i++) {
      var b = bubbles[i];
      var bx = b.x + Math.sin(b.sway * 1.4) * 6;
      ctx.beginPath(); ctx.arc(bx, b.y, b.r, 0, Math.PI * 2); ctx.stroke();
    }

    // 两侧剪影植被（海草随水流摆动 + 底部礁石；只画在游戏区两侧的延伸海水里）
    drawFlora(4, BX - 6, 3);
    drawFlora(BX + C.W + 6, LW - 4, 8);
  }

  // 一条侧边栏的水下植被剪影（x0..x1 为侧边栏范围，seed 区分左右两侧形态）
  // v289：定位体系不动（仍为 v287 的块缘锚定：edge = 靠块一侧的边缘，offset 从块缘向外），
  // 只把槽位间距按丛宽重新核算——一丛巨藻含侧叶后实宽约 64px，原 44 间距必然整丛叠压
  //（用户："水草还是不行，都挤到一起了"）。窗口过窄整株跳过、绝不按宽度重排挤压。
  // 样式与主页海草同语言（drawKelp 填充飘带 + drawGrassTuft 圆头草丛 + 圆润礁石）
  function drawFlora(x0, x1, seed) {
    var w = x1 - x0;
    if (w < 26) return; // 手机模式侧边栏宽 0，自动跳过
    var baseY = VH - 3;
    var left = (seed === 3);
    var edge = left ? x1 - 7 : x0 + 7;  // 锚 = 靠块边缘（x1=块左缘-6 / x0=块右缘+6）
    var dir = left ? -1 : 1;            // 槽位延伸方向：从块缘向外
    var sway = left ? 1 : -1;           // 摆动朝屏内（与窗口宽度无关）
    var k;
    ctx.lineCap = 'round';
    // v291：巨藻/草丛已删除（用户："水草太丑了，先删了吧"）——槽位表注释留档备用：
    // 巨藻槽位偏移 [0,82,164,246]、高度档 [118,84,56,94]；草丛槽位 [53,135,217]、高度档 [42,30,34]
    // ---- 底部礁石：固定槽位偏移 4（双层：暗底 + 顶部受光面） ----
    var rx = edge + dir * 4, rr = 13;
    ctx.fillStyle = 'rgba(12,52,88,0.38)';
    ctx.beginPath(); ctx.ellipse(rx, baseY + 4, rr, rr * 0.45, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(rx - rr * 0.5, baseY + 5, rr * 0.6, rr * 0.3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(190,225,250,0.14)';
    ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.ellipse(rx, baseY + 1, rr * 0.8, rr * 0.32, 0, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
  }

  // ---------- 水滴渲染（变形 / 拖尾 / 冻结 / 弹跳） ----------
  function popScale(b) {
    if (!b.popT || b.popT <= 0) return 1;
    var t = b.popT / 0.28;
    if (t > 0.6) return 0.6 + (1.15 - 0.6) * (1 - t) / 0.4;
    return 1.15 - 0.15 * (0.6 - t) / 0.6;
  }

  // 礁石压顶不做压扁/形变：物理层已让礁石与普通滴严格分离（零容差全量修正），保持各自圆形
  function drawBall(b, alpha) {
    if (b.iron) { if (b.chest) drawChest(b, alpha); else drawIronBall(b, alpha); return; }
    var t = T[b.tier];
    var s = popScale(b);
    var r = b.r * s;
    var speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
    // 渲染平滑位（systems 每帧维护；旧存档字段缺失时回退物理位）
    var bx = b.rx != null ? b.rx : b.x, by = b.ry != null ? b.ry : b.y;

    // 落地软阴影（绝对坐标，先画）
    var floorDist = FLOORY - (by + b.r);
    if (floorDist < 30 && floorDist > -b.r) {
      var sa = 0.18 * (1 - Math.max(0, floorDist) / 30);
      ctx.fillStyle = 'rgba(10,40,70,' + sa + ')';
      ctx.beginPath();
      ctx.ellipse(bx, FLOORY - 2, b.r * 0.85, b.r * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.save();
    ctx.globalAlpha = alpha;

    // 运动拖尾
    if (speed > 380 && b.trail && !b.special) {
      for (var ti = 0; ti < b.trail.length; ti++) {
        var tp = b.trail[ti];
        var ta = (ti / b.trail.length) * 0.16;
        ctx.globalAlpha = alpha * ta;
        ctx.fillStyle = t.color;
        ctx.beginPath(); ctx.arc(tp.x, tp.y, r * (0.5 + 0.42 * ti / b.trail.length), 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = alpha;
    }

    // 挤压拉伸：沿平滑变形矢量方向变形（矢量整体插值，方向动态过渡、停稳回圆）
    ctx.translate(bx, by);
    var k = b.defK || 0;
    if (k > 0.012) {
      ctx.rotate(Math.atan2(b.defY || 0, b.defX || 1));
      ctx.scale(1 + k, 1 - k);
    }

    // 主体径向渐变（相对坐标；性能：按 tier+半径缓存，满场时省下 ~150 次/帧的 create）
    var rk = Math.round(r * 2) / 2;
    var g = grad('bM' + b.tier + '_' + rk, function () {
      var gg = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.12, 0, 0, r * 1.05);
      gg.addColorStop(0, '#FFFFFF');
      gg.addColorStop(0.30, t.color);
      gg.addColorStop(1, t.dark);
      return gg;
    });
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();

    // 底部内反光：径向渐变光晕（裁剪扩到球缘 0.995r：反光与球体边缘连续过渡，不再有"内亮外暗"分界环）
    ctx.save();
    ctx.beginPath(); ctx.arc(0, 0, r * 0.995, 0, Math.PI * 2); ctx.clip();
    ctx.globalAlpha = alpha * 0.5;
    ctx.fillStyle = grad('bB' + b.tier + '_' + rk, function () {
      var gg = ctx.createRadialGradient(0, r * 1.55, r * 0.1, 0, r * 1.55, r * 1.35);
      gg.addColorStop(0, 'rgba(223,244,255,0.55)');
      gg.addColorStop(1, 'rgba(223,244,255,0)');
      return gg;
    });
    ctx.fillRect(-r, 0, r * 2, r);
    ctx.restore();

    // 边缘高光：两端渐隐 + 宽度方向也柔和过渡的柔光弧（多层递缩叠加，单层描边两侧会有硬边界）
    ctx.save();
    ctx.strokeStyle = grad('bE' + b.tier + '_' + rk, function () {
      var gg = ctx.createLinearGradient(-r * 0.94, -r * 0.09, r * 0.21, -r * 0.92);
      gg.addColorStop(0, 'rgba(255,255,255,0)');
      gg.addColorStop(0.5, 'rgba(255,255,255,0.8)');
      gg.addColorStop(1, 'rgba(255,255,255,0)');
      return gg;
    });
    ctx.lineCap = 'round';
    var ARC_LAY = [[1, 0.22], [0.6, 0.34], [0.26, 0.5]]; // [宽度比, alpha 比]（中心累计≈1，与原单层峰值一致）
    for (var al = 0; al < ARC_LAY.length; al++) {
      ctx.globalAlpha = alpha * 0.6 * ARC_LAY[al][1];
      ctx.lineWidth = Math.max(1.2, r * 0.055 * ARC_LAY[al][0]);
      ctx.beginPath(); ctx.arc(0, 0, r * 0.94, Math.PI * 1.03, Math.PI * 1.57); ctx.stroke();
    }
    ctx.restore();
    ctx.globalAlpha = alpha;

    // 双高光（径向渐变光斑：中心实、边缘渐隐到 0，无硬边界；随时间柔和淡入淡出，每球错相）
    var hp = (b.id || 0) * 1.13;
    var ha1 = 0.5 + 0.17 * Math.sin(time * 1.7 + hp);
    var hs1 = 1 + 0.06 * Math.sin(time * 1.7 + hp); // 呼吸时轻微缩放
    ctx.save();
    ctx.translate(-r * 0.35, -r * 0.45);
    ctx.rotate(-0.6);
    ctx.scale(r * 0.26 * hs1, r * 0.15 / hs1);
    ctx.globalAlpha = alpha * ha1;
    ctx.fillStyle = grad('bHL' + b.tier + '_' + (Math.round(r * 2) / 2), function () {
      var gg = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
      gg.addColorStop(0, 'rgba(255,255,255,0.95)');
      gg.addColorStop(0.42, 'rgba(255,255,255,0.4)');
      gg.addColorStop(1, 'rgba(255,255,255,0)');
      return gg;
    });
    ctx.beginPath(); ctx.arc(0, 0, 1, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    var ha2 = 0.3 + 0.15 * Math.sin(time * 2.1 + hp + 1.3);
    ctx.save();
    ctx.translate(r * 0.3, -r * 0.55);
    ctx.scale(r * 0.09, r * 0.09);
    ctx.globalAlpha = alpha * ha2;
    ctx.fillStyle = grad('bHLs', function () {
      var gg = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
      gg.addColorStop(0, 'rgba(255,255,255,0.95)');
      gg.addColorStop(1, 'rgba(255,255,255,0)');
      return gg;
    });
    ctx.beginPath(); ctx.arc(0, 0, 1, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    if (b.special === 'vortex') drawVortexMark(r);
    else if (b.special === 'cloud') drawCloudMark(r);
    else if (b.special === 'rainbow') drawRainbowMark(r);
    else if (b.special === 'gale') drawGaleMark(r);
    else if (b.special === 'magnet') drawMagnetMark(r);
    else if (b.special === 'spring') drawSpringMark(r);
    else if (b.special === 'thunder') drawThunderMark(r);
    else if (b.special === 'pearl') drawPearlMark(r);
    else if (b.special === 'magma') drawMagmaMark(r);
    else if (b.special === 'geyser') drawGeyserMark(r);
    else if (b.special === 'void') drawVoidMark(r);
    else if (b.special === 'aurora') drawAuroraMark(r);
    else if (b.special === 'ice') drawIceMark(r); // v340：冰晶滴未冻结时也画雪花标识，与普通水滴区分
    // v337：漩涡/磁石滴画一圈脉动吸附力场环（半径=实际 pullR），让"聚拢"这件事肉眼可见
    else if (b.special === 'vortex' || b.special === 'magnet') {
      var pr = (b.special === 'vortex') ? C.vortex.pullR : C.magnet.pullR;
      var fp = 0.5 + 0.5 * Math.sin(time * 3 + r);
      ctx.save();
      ctx.strokeStyle = hexToRgba(b.special === 'vortex' ? '#8FA8E8' : '#9BC0F0', 0.18 + 0.12 * fp);
      ctx.lineWidth = 2; ctx.setLineDash([10, 12]); ctx.lineDashOffset = -time * 40;
      ctx.beginPath(); ctx.arc(0, 0, pr, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }
    else if (b.tier <= 4) drawFace(r);
    else drawWaves(r);
    // 符文徽记（右上角小圆牌）
    if (b.rune) drawRuneMark(r, b.rune);

    // 冻结外壳
    if (b.frozen > 0) drawFrozenShell(b, r);

    ctx.restore();
  }

  // 礁石（内部名 iron）：岩石球——内部全部径向渐变光效（天光/岩缝暗斑/苔藓绿斑/内壁晕影），无线描无实心填充
  function drawIronBall(b, alpha) {
    var r = b.r;
    var bx = b.rx != null ? b.rx : b.x, by = b.ry != null ? b.ry : b.y;
    // 落地软阴影
    var floorDist = FLOORY - (by + b.r);
    if (floorDist < 30 && floorDist > -b.r) {
      var sa = 0.22 * (1 - Math.max(0, floorDist) / 30);
      ctx.fillStyle = 'rgba(10,20,30,' + sa + ')';
      ctx.beginPath();
      ctx.ellipse(bx, FLOORY - 2, b.r * 0.9, b.r * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(bx, by);
    // 岩石主体（径向渐变：左上受光暖灰 → 右下沉暗，渐变缓存）
    var rk2 = Math.round(r * 2) / 2;
    var g = grad('iron' + rk2, function () {
      var gg = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r * 1.05);
      gg.addColorStop(0, '#D5CFC0');
      gg.addColorStop(0.45, '#999180');
      gg.addColorStop(1, '#5E574A');
      return gg;
    });
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    // 内部光效统一裁剪进岩体，边缘自然收进
    ctx.save();
    ctx.beginPath(); ctx.arc(0, 0, r * 0.99, 0, Math.PI * 2); ctx.clip();
    // ① 左上天光（径向光斑：四周渐隐，替代描边弧高光）
    ctx.save();
    ctx.translate(-r * 0.34, -r * 0.4);
    ctx.rotate(-0.55);
    ctx.scale(r * 0.5, r * 0.3);
    ctx.fillStyle = grad('ironSky' + rk2, function () {
      var gg = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
      gg.addColorStop(0, 'rgba(255,250,235,0.34)');
      gg.addColorStop(0.55, 'rgba(255,250,235,0.13)');
      gg.addColorStop(1, 'rgba(255,250,235,0)');
      return gg;
    });
    ctx.beginPath(); ctx.arc(0, 0, 1, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // ② 岩缝暗斑：三道斜向椭圆暗晕暗示裂缝走向（不描线，柔边过渡）
    var cks = [
      [-0.28, 0.04, 0.44, 0.1, -0.5],
      [0.27, -0.3, 0.36, 0.09, 0.42],
      [0.12, 0.44, 0.3, 0.08, 0.15]
    ];
    for (var ci = 0; ci < cks.length; ci++) {
      var ck = cks[ci];
      ctx.save();
      ctx.translate(ck[0] * r, ck[1] * r);
      ctx.rotate(ck[4]);
      ctx.scale(r * ck[2], r * ck[3]);
      ctx.fillStyle = grad('ironCk' + ci + '_' + rk2, function () {
        var gg = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
        gg.addColorStop(0, 'rgba(46,38,28,0.4)');
        gg.addColorStop(0.5, 'rgba(46,38,28,0.18)');
        gg.addColorStop(1, 'rgba(46,38,28,0)');
        return gg;
      });
      ctx.beginPath(); ctx.arc(0, 0, 1, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    // ③ 苔藓斑（径向渐变绿晕：中心浓边缘透明，大小/纵比错落）
    var mos = [[-0.45, 0.38, 0.2], [0.5, 0.28, 0.17], [0.02, -0.6, 0.13], [-0.22, 0.6, 0.15], [0.38, -0.38, 0.12]];
    for (var mi = 0; mi < mos.length; mi++) {
      var mp = mos[mi];
      ctx.save();
      ctx.translate(mp[0] * r, mp[1] * r);
      ctx.scale(r * mp[2], r * mp[2] * (0.72 + 0.2 * (mi % 2)));
      ctx.fillStyle = grad('ironMo' + mi + '_' + rk2, function () {
        var gg = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
        gg.addColorStop(0, 'rgba(118,146,84,0.5)');
        gg.addColorStop(0.6, 'rgba(118,146,84,0.24)');
        gg.addColorStop(1, 'rgba(118,146,84,0)');
        return gg;
      });
      ctx.beginPath(); ctx.arc(0, 0, 1, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    // ④ 内壁晕影：由内向外轻微加深（体积感 + 所有内容在球壁处统一收边）
    ctx.fillStyle = grad('ironVg' + rk2, function () {
      var gg = ctx.createRadialGradient(0, 0, r * 0.5, 0, 0, r);
      gg.addColorStop(0, 'rgba(20,16,10,0)');
      gg.addColorStop(0.75, 'rgba(20,16,10,0.14)');
      gg.addColorStop(1, 'rgba(20,16,10,0.42)');
      return gg;
    });
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.restore(); // 内部裁剪
    // 可能被冰晶冻住
    if (b.frozen > 0) drawFrozenShell(b, r);
    ctx.restore();
  }

  function drawFace(r) {    var ex = r * 0.32, ey = -r * 0.05;
    // 用最后位置近似视线（变形坐标系里无 vx，简化为固定）
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath(); ctx.arc(-ex, ey, r * 0.14, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(ex, ey, r * 0.14, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#28516E';
    ctx.beginPath(); ctx.arc(-ex, ey, r * 0.085, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(ex, ey, r * 0.085, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath(); ctx.arc(-ex - r * 0.03, ey - r * 0.03, r * 0.03, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(ex - r * 0.03, ey - r * 0.03, r * 0.03, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,150,160,0.4)';
    ctx.beginPath(); ctx.arc(-r * 0.55, r * 0.18, r * 0.11, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(r * 0.55, r * 0.18, r * 0.11, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(30,70,100,0.7)';
    ctx.lineWidth = Math.max(1.2, r * 0.05);
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(0, r * 0.10, r * 0.28, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
    ctx.lineCap = 'butt';
  }

  function drawWaves(r) {
    ctx.save();
    // 内部裁剪扩到球缘（0.995r）：内部暗化与球体边缘连续过渡，避免 0.94r 处出现"内暗外亮"分界环
    ctx.beginPath(); ctx.arc(0, 0, r * 0.995, 0, Math.PI * 2); ctx.clip();
    var wk = Math.round(r * 2) / 2;
    // 设计原则：内部不画任何"线条/实心形状"（硬边贴纸感是丑的根源），
    // 全部用径向渐变光效表达——深度、水面、气泡、光斑皆自然渐隐，边缘永远有过渡。
    // ① 左上天光（径向渐变光斑：四周全部渐隐，替代线性渐变实心椭圆的可见轮廓）
    ctx.save();
    ctx.translate(-r * 0.28, -r * 0.42);
    ctx.rotate(-0.5);
    ctx.scale(r * 0.52, r * 0.3);
    ctx.fillStyle = grad('wvH' + wk, function () {
      var gg = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
      gg.addColorStop(0, 'rgba(255,255,255,0.24)');
      gg.addColorStop(0.55, 'rgba(255,255,255,0.10)');
      gg.addColorStop(1, 'rgba(255,255,255,0)');
      return gg;
    });
    ctx.beginPath(); ctx.arc(0, 0, 1, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // ② 底部深水暗晕：暗调自下而上消散（深度感，全软边）
    ctx.fillStyle = grad('wvDeep' + wk, function () {
      var gg = ctx.createRadialGradient(0, r * 1.18, r * 0.08, 0, r * 1.18, r * 1.1);
      gg.addColorStop(0, 'rgba(3,14,38,0.44)');
      gg.addColorStop(0.55, 'rgba(6,26,64,0.16)');
      gg.addColorStop(1, 'rgba(6,26,64,0)');
      return gg;
    });
    ctx.fillRect(-r, -r, r * 2, r * 2);
    // ③ 水面月光带：水面高度一团横向拉长的柔光椭圆（缓慢漂移呼吸），
    //    不画线，光斑本身即是"水面"的暗示；气泡升到此处即没，语义闭环
    var lv = -r * 0.04 + Math.sin(time * 0.5) * r * 0.03;
    ctx.save();
    ctx.translate(Math.sin(time * 0.23) * r * 0.06, lv);
    ctx.scale(r * 0.6, r * 0.15);
    ctx.fillStyle = grad('wvSheen' + wk, function () {
      var gg = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
      gg.addColorStop(0, 'rgba(235,250,255,0.30)');
      gg.addColorStop(0.55, 'rgba(235,250,255,0.11)');
      gg.addColorStop(1, 'rgba(235,250,255,0)');
      return gg;
    });
    ctx.beginPath(); ctx.arc(0, 0, 1, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // ④ 焦散光斑：3 枚小柔光在水面下缓慢游移闪烁（水面折射的光，软边）
    for (var ci = 0; ci < 3; ci++) {
      var ca = time * (0.3 + ci * 0.12) + ci * 2.4;
      var cx2 = Math.sin(ca * 1.1 + ci * 2.0) * r * 0.4;
      var cy2 = lv + r * (0.16 + 0.05 * Math.sin(ca * 0.9 + ci));
      var cs = r * (0.085 + 0.03 * (ci % 2)) * (0.8 + 0.2 * Math.sin(ca * 2.2));
      ctx.save();
      ctx.translate(cx2, cy2);
      ctx.scale(cs, cs * 0.55);
      ctx.globalAlpha = 0.3 + 0.22 * Math.sin(ca * 1.7 + ci);
      ctx.fillStyle = grad('wvCau', function () {
        var gg = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
        gg.addColorStop(0, 'rgba(240,252,255,0.85)');
        gg.addColorStop(1, 'rgba(240,252,255,0)');
        return gg;
      });
      ctx.beginPath(); ctx.arc(0, 0, 1, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    // ⑤ 柔边气泡：3 枚径向渐变气泡从底部升到水面渐没（抵达光带处淡出，无描边）
    for (var bi = 0; bi < 3; bi++) {
      var ba2 = time * (0.3 + bi * 0.1) + bi * 2.6;
      var prog2 = (ba2 % 1.5) / 1.5;
      var bxx = Math.sin(ba2 * 1.8 + bi * 2.1) * r * 0.18 + (bi - 1) * r * 0.24;
      var topY = lv + r * 0.05;
      var byy = r * 0.8 - prog2 * (r * 0.8 - topY);
      var br2 = r * (0.035 + 0.012 * (bi % 3));
      var bfade = prog2 < 0.82 ? 1 : 1 - (prog2 - 0.82) / 0.18;
      ctx.save();
      ctx.translate(bxx, byy);
      ctx.scale(br2, br2);
      ctx.globalAlpha = 0.5 * bfade;
      ctx.fillStyle = grad('wvBub', function () {
        var gg = ctx.createRadialGradient(-0.3, -0.3, 0, 0, 0, 1);
        gg.addColorStop(0, 'rgba(255,255,255,0.9)');
        gg.addColorStop(0.35, 'rgba(255,255,255,0.28)');
        gg.addColorStop(1, 'rgba(255,255,255,0)');
        return gg;
      });
      ctx.beginPath(); ctx.arc(0, 0, 1, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    // ⑥ 内壁晕影：由内向外轻微加深，一直铺到球缘并与球体边缘色融合——
    //    内部各元素与球壁之间不再有可见分界（过渡由这条连续渐变统一兜底）
    ctx.fillStyle = grad('wvVin' + wk, function () {
      var gg = ctx.createRadialGradient(0, 0, r * 0.52, 0, 0, r * 0.99);
      gg.addColorStop(0, 'rgba(4,16,44,0)');
      gg.addColorStop(0.6, 'rgba(4,16,44,0.07)');
      gg.addColorStop(0.82, 'rgba(4,16,44,0.18)');
      gg.addColorStop(1, 'rgba(4,16,44,0.32)');
      return gg;
    });
    ctx.fillRect(-r, -r, r * 2, r * 2);
    ctx.restore();
  }

  // 符文徽记：浮在水滴右上角的小圆牌（复用技能图标线条）
  function drawRuneMark(r, key) {
    var s = Math.max(6, r * 0.3);
    var bx = r * 0.55, by = -r * 0.55 + Math.sin(time * 3) * r * 0.03;
    ctx.fillStyle = runeColor(key);
    ctx.beginPath(); ctx.arc(bx, by, s, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(bx, by, s, 0, Math.PI * 2); ctx.stroke();
    ctx.save();
    ctx.translate(bx, by);
    var sc = s / 13;
    ctx.scale(sc, sc);
    drawSkillIcon(key, 0, 0, '#FFFFFF');
    ctx.restore();
  }

  // 宝箱：弧顶木盖 + 直壁箱身 + 铜箍铆钉 + 金锁 + 盖缝透光 + 环绕星光 + 剩余时间环（超时会沉走）
  function drawChest(b, alpha) {
    var bob = Math.sin(time * 2.2) * 1.5;
    var bx = b.rx != null ? b.rx : b.x, by = b.ry != null ? b.ry : b.y;
    ctx.save();
    ctx.globalAlpha = alpha;
    // 落地软阴影
    var fd = FLOORY - (by + b.r);
    if (fd < 30 && fd > -b.r) {
      ctx.fillStyle = 'rgba(10,20,30,' + (0.2 * (1 - Math.max(0, fd) / 30)) + ')';
      ctx.beginPath(); ctx.ellipse(bx, FLOORY - 2, b.r * 0.95, b.r * 0.2, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.translate(bx, by);
    // 呼吸金光（渐变缓存；脉动走 globalAlpha，不重建渐变）
    var glow = 0.5 + 0.28 * Math.sin(time * 3);
    ctx.globalAlpha = alpha * glow;
    ctx.fillStyle = grad('chestGlow', function () {
      var gg = ctx.createRadialGradient(0, 0, 3, 0, 0, 44);
      gg.addColorStop(0, 'rgba(255,214,110,0.7)');
      gg.addColorStop(0.55, 'rgba(255,190,80,0.2)');
      gg.addColorStop(1, 'rgba(255,190,80,0)');
      return gg;
    });
    ctx.beginPath(); ctx.arc(0, bob, b.r + 16, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = alpha;
    ctx.translate(0, bob);

    var w = b.r * 1.6, h = b.r * 1.3;
    var seamY = -h * 0.06; // 盖/身分界
    // 盖（弧顶木盖）——暖金木色：顶部受光亮金 → 盖缝处深琥珀
    ctx.fillStyle = grad('chestLid', function () {
      var gg = ctx.createLinearGradient(0, -h * 0.62, 0, seamY);
      gg.addColorStop(0, '#F4C866'); gg.addColorStop(0.55, '#DDA948'); gg.addColorStop(1, '#B98430');
      return gg;
    });
    ctx.beginPath();
    ctx.moveTo(-w / 2, seamY);
    ctx.quadraticCurveTo(0, -h * 0.72, w / 2, seamY);
    ctx.closePath(); ctx.fill();
    // 盖顶弧形高光（受光面）
    ctx.strokeStyle = 'rgba(255,240,190,0.5)'; ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-w * 0.34, -h * 0.30);
    ctx.quadraticCurveTo(0, -h * 0.62, w * 0.34, -h * 0.30);
    ctx.stroke();
    // 身（直壁木箱，底部圆角）：中段受光、底角沉入阴影
    ctx.fillStyle = grad('chestBody', function () {
      var gg = ctx.createLinearGradient(0, seamY, 0, h * 0.56);
      gg.addColorStop(0, '#D8A44C'); gg.addColorStop(0.5, '#C08A38'); gg.addColorStop(1, '#8F5E22');
      return gg;
    });
    roundRect(-w / 2, seamY, w, h * 0.62, 3); ctx.fill();
    // 木板竖缝
    ctx.strokeStyle = 'rgba(110,66,20,0.45)'; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-w * 0.17, seamY + 3); ctx.lineTo(-w * 0.17, h * 0.52);
    ctx.moveTo(w * 0.17, seamY + 3); ctx.lineTo(w * 0.17, h * 0.52);
    ctx.stroke();
    // 铜箍 ×2（贯穿盖与身）——深古铜底 + 亮金铆钉
    ctx.fillStyle = '#7A4E1C';
    roundRect(-w * 0.42, -h * 0.36, 4.5, h * 0.9, 2); ctx.fill();
    roundRect(w * 0.42 - 4.5, -h * 0.36, 4.5, h * 0.9, 2); ctx.fill();
    // 铆钉
    ctx.fillStyle = '#FFE6A6';
    ctx.beginPath();
    ctx.arc(-w * 0.42 + 2.2, -h * 0.2, 1.1, 0, Math.PI * 2);
    ctx.arc(w * 0.42 - 2.3, -h * 0.2, 1.1, 0, Math.PI * 2);
    ctx.arc(-w * 0.42 + 2.2, h * 0.34, 1.1, 0, Math.PI * 2);
    ctx.arc(w * 0.42 - 2.3, h * 0.34, 1.1, 0, Math.PI * 2);
    ctx.fill();
    // 盖缝透光（呼吸）
    var seamG = 0.26 + 0.24 * Math.sin(time * 3 + 1);
    ctx.fillStyle = 'rgba(255,224,130,' + seamG.toFixed(2) + ')';
    roundRect(-w * 0.4, seamY - 1, w * 0.8, 2.2, 1.1); ctx.fill();
    // 金锁 + 锁孔
    ctx.fillStyle = '#FFD873';
    roundRect(-4.5, seamY - 3, 9, 10, 2.5); ctx.fill();
    ctx.fillStyle = '#5A3A14';
    ctx.beginPath(); ctx.arc(0, seamY + 1.2, 1.6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-0.9, seamY + 2.2); ctx.lineTo(0.9, seamY + 2.2);
    ctx.lineTo(0.55, seamY + 5.2); ctx.lineTo(-0.55, seamY + 5.2);
    ctx.closePath(); ctx.fill();
    // 描金边（盖弧 + 箱身）
    ctx.strokeStyle = 'rgba(242,193,78,0.85)'; ctx.lineWidth = 1.4;
    roundRect(-w / 2, seamY, w, h * 0.62, 3); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-w / 2, seamY);
    ctx.quadraticCurveTo(0, -h * 0.72, w / 2, seamY);
    ctx.stroke();
    // 环绕星光（3 颗，闪烁）
    var k;
    for (k = 0; k < 3; k++) {
      var a2 = time * 0.9 + k * 2.09;
      var sx2 = Math.cos(a2) * (b.r + 11), sy2 = -4 + Math.sin(a2) * (b.r * 0.55);
      var tw2 = 0.35 + 0.35 * Math.sin(time * 5 + k * 2.1);
      ctx.strokeStyle = 'rgba(255,240,190,' + tw2.toFixed(2) + ')';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(sx2 - 3, sy2); ctx.lineTo(sx2 + 3, sy2);
      ctx.moveTo(sx2, sy2 - 3); ctx.lineTo(sx2, sy2 + 3);
      ctx.stroke();
    }
    // 剩余时间环：底轨 + 分级变色（充足白 → 偏短金 → 将沉红）
    // v297：加空值守卫——主页轮播绘制宝箱时场上并无真宝箱（chest=null），chest.t 会抛
    // TypeError 使整帧从些中断：既丢按钮/设置钮，又跳过末尾的 ctx.restore()，把
    // globalAlpha 遗留在半透明值上——后续每帧背景/磁贴都以残留 alpha 叠画，逐帧累积
    // 成全屏棋盘噪声（用户："静止一段时间后花屏、轮换到宝箱时不花但按钮消失"的真凶）
    var frac = (chest && chest.life) ? Math.max(0, 1 - chest.t / chest.life) : 1;
    ctx.strokeStyle = 'rgba(20,40,55,0.28)'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(0, 0, b.r + 8, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = frac > 0.5 ? 'rgba(255,255,255,0.85)' : (frac > 0.25 ? '#FFC94D' : '#FF6B52');
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(0, 0, b.r + 8, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2); ctx.stroke();
    ctx.lineCap = 'butt';
    ctx.restore();
  }
  // 彩虹滴徽记：旋转流动的五彩弧 + 游动星光（保留动态效果）。
  // 颜色走 hslToRgba（微信 Canvas 对 hsla 支持不稳定，直接用 hsla 会导致描边偶发失效→视觉「闪烁」）。
  function drawRainbowMark(r) {
    var hue0 = (time * 40) % 360;
    ctx.save();
    ctx.lineWidth = Math.max(2, r * 0.16);
    ctx.lineCap = 'round';
    for (var k = 0; k < 5; k++) {
      ctx.strokeStyle = MG.util.hslToRgba((hue0 + k * 72) % 360, 85, 62, 0.9);
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.72, time * 0.8 + k * Math.PI * 0.4, time * 0.8 + k * Math.PI * 0.4 + Math.PI * 0.28);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    for (k = 0; k < 3; k++) {
      var a2 = time * 1.5 + k * 2.1;
      ctx.beginPath();
      ctx.arc(Math.cos(a2) * r * 0.45, Math.sin(a2) * r * 0.45, Math.max(1, r * 0.07), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  // 疾风滴标记：三条流动风弧
  function drawGaleMark(r) {
    ctx.save();
    ctx.strokeStyle = 'rgba(60,150,110,0.9)';
    ctx.lineWidth = Math.max(2, r * 0.11);
    ctx.lineCap = 'round';
    for (var k = 0; k < 3; k++) {
      var yy = -r * 0.3 + k * r * 0.3;
      var sway = Math.sin(time * 6 + k) * r * 0.08;
      ctx.beginPath();
      ctx.moveTo(-r * 0.45 + sway, yy);
      ctx.quadraticCurveTo(0, yy - r * 0.16, r * 0.45 + sway, yy);
      ctx.stroke();
    }
    ctx.restore();
    ctx.lineCap = 'butt';
  }
  // 磁石滴标记：马蹄磁铁（U 形 + 两极白端）
  function drawMagnetMark(r) {
    ctx.save();
    ctx.strokeStyle = 'rgba(240,248,255,0.95)';
    ctx.lineWidth = Math.max(2.4, r * 0.24);
    ctx.lineCap = 'butt';
    ctx.beginPath(); ctx.arc(0, -r * 0.08, r * 0.4, Math.PI, Math.PI * 2); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-r * 0.4, -r * 0.08); ctx.lineTo(-r * 0.4, r * 0.38);
    ctx.moveTo(r * 0.4, -r * 0.08); ctx.lineTo(r * 0.4, r * 0.38);
    ctx.stroke();
    ctx.strokeStyle = '#FF8FA0';
    ctx.beginPath();
    ctx.moveTo(-r * 0.4, r * 0.26); ctx.lineTo(-r * 0.4, r * 0.38);
    ctx.moveTo(r * 0.4, r * 0.26); ctx.lineTo(r * 0.4, r * 0.38);
    ctx.stroke();
    ctx.restore();
    ctx.lineCap = 'butt';
  }
  // 甘霖滴标记：新芽（茎 + 双叶）
  function drawSpringMark(r) {
    ctx.save();
    ctx.strokeStyle = 'rgba(46,120,80,0.9)';
    ctx.lineWidth = Math.max(1.6, r * 0.09);
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, r * 0.45); ctx.quadraticCurveTo(r * 0.05, 0, 0, -r * 0.2); ctx.stroke();
    ctx.fillStyle = 'rgba(120,200,150,0.95)';
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.1);
    ctx.quadraticCurveTo(-r * 0.55, -r * 0.35, -r * 0.5, -r * 0.62);
    ctx.quadraticCurveTo(-r * 0.05, -r * 0.5, 0, -r * 0.1);
    ctx.moveTo(0, -r * 0.2);
    ctx.quadraticCurveTo(r * 0.5, -r * 0.5, r * 0.55, -r * 0.75);
    ctx.quadraticCurveTo(r * 0.08, -r * 0.65, 0, -r * 0.2);
    ctx.fill();
    ctx.restore();
    ctx.lineCap = 'butt';
  }
  // 雷霆滴标记：闪电
  function drawThunderMark(r) {
    ctx.save();
    ctx.fillStyle = 'rgba(255,244,200,0.98)';
    ctx.beginPath();
    ctx.moveTo(r * 0.14, -r * 0.58);
    ctx.lineTo(-r * 0.28, r * 0.06);
    ctx.lineTo(-r * 0.02, r * 0.06);
    ctx.lineTo(-r * 0.14, r * 0.58);
    ctx.lineTo(r * 0.3, -r * 0.1);
    ctx.lineTo(r * 0.04, -r * 0.1);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  // 珍珠滴标记：贝壳托珠
  function drawPearlMark(r) {
    ctx.save();
    ctx.strokeStyle = 'rgba(210,190,150,0.95)';
    ctx.lineWidth = Math.max(1.6, r * 0.09);
    ctx.beginPath(); ctx.arc(0, r * 0.16, r * 0.42, 0, Math.PI); ctx.stroke(); // 贝壳碗
    ctx.fillStyle = 'rgba(255,255,255,0.98)';
    ctx.beginPath(); ctx.arc(0, r * 0.08, r * 0.2, 0, Math.PI * 2); ctx.fill(); // 珍珠
    ctx.fillStyle = 'rgba(180,160,120,0.9)';
    ctx.beginPath(); ctx.arc(-r * 0.06, r * 0.02, r * 0.05, 0, Math.PI * 2); ctx.fill(); // 珠光
    ctx.restore();
  }
  // 冰晶滴标记：六角雪花（未冻结时也标识，与普通水滴区分）
  function drawIceMark(r) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.97)';
    ctx.lineWidth = Math.max(1.4, r * 0.07);
    ctx.lineCap = 'round';
    for (var i = 0; i < 3; i++) {
      var a = i * Math.PI / 3;
      var dx = Math.cos(a), dy = Math.sin(a);
      var len = r * 0.52;
      ctx.beginPath();
      ctx.moveTo(-dx * len, -dy * len);
      ctx.lineTo(dx * len, dy * len);
      ctx.stroke();
      // 中段两侧小分叉
      var bx = dx * len * 0.58, by = dy * len * 0.58;
      var px = -dy, py = dx;
      var br = len * 0.26;
      ctx.beginPath();
      ctx.moveTo(bx - px * br, by - py * br);
      ctx.lineTo(bx + px * br, by + py * br);
      ctx.stroke();
    }
    ctx.restore();
  }
  // 熔岩滴标记：火苗
  function drawMagmaMark(r) {
    ctx.save();
    ctx.fillStyle = 'rgba(255,236,200,0.95)';
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.52);
    ctx.quadraticCurveTo(r * 0.42, -r * 0.02, r * 0.2, r * 0.42);
    ctx.lineTo(-r * 0.2, r * 0.42);
    ctx.quadraticCurveTo(-r * 0.42, -r * 0.02, 0, -r * 0.52);
    ctx.fill();
    ctx.fillStyle = 'rgba(230,110,50,0.9)';
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.16);
    ctx.quadraticCurveTo(r * 0.18, r * 0.12, 0, r * 0.4);
    ctx.quadraticCurveTo(-r * 0.18, r * 0.12, 0, -r * 0.16);
    ctx.fill();
    ctx.restore();
  }
  // 间歇泉滴标记：三根上冲水柱
  function drawGeyserMark(r) {
    ctx.save();
    ctx.strokeStyle = 'rgba(235,252,255,0.95)';
    ctx.lineWidth = Math.max(1.8, r * 0.11);
    ctx.lineCap = 'round';
    var xs = [-r * 0.38, 0, r * 0.38];
    for (var k = 0; k < 3; k++) {
      var h = (k === 1 ? 0.62 : 0.4) * r, x = xs[k];
      ctx.beginPath();
      ctx.moveTo(x, r * 0.45);
      ctx.lineTo(x, r * 0.45 - h - r * 0.2);
      ctx.moveTo(x - r * 0.12, r * 0.42 - h);
      ctx.lineTo(x, r * 0.28 - h);
      ctx.lineTo(x + r * 0.12, r * 0.42 - h);
      ctx.stroke();
    }
    ctx.restore();
    ctx.lineCap = 'butt';
  }
  // 虚空滴标记：漩涡眼（双螺旋弧）
  function drawVoidMark(r) {
    ctx.save();
    ctx.rotate(time * 2.2);
    ctx.strokeStyle = 'rgba(200,190,240,0.9)';
    ctx.lineWidth = Math.max(1.8, r * 0.1);
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(0, 0, r * 0.42, 0.4, 3.4); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, r * 0.18, 3.6, 6.6); ctx.stroke();
    ctx.restore();
    ctx.lineCap = 'butt';
  }
  // 极光滴标记：双条极光带
  function drawAuroraMark(r) {
    ctx.save();
    ctx.lineCap = 'round';
    var cols = ['rgba(155,232,216,0.95)', 'rgba(200,184,240,0.95)'];
    for (var k = 0; k < 2; k++) {
      ctx.strokeStyle = cols[k];
      ctx.lineWidth = Math.max(2.2, r * 0.16);
      var ox = (k - 0.5) * r * 0.42, sw = Math.sin(time * 5 + k * 2) * r * 0.08;
      ctx.beginPath();
      ctx.moveTo(ox - r * 0.12, r * 0.45);
      ctx.quadraticCurveTo(ox - r * 0.3 + sw, 0, ox + r * 0.08, -r * 0.48);
      ctx.stroke();
    }
    ctx.restore();
    ctx.lineCap = 'butt';
  }
  function drawVortexMark(r) {
    ctx.save();
    // 底盘：径向渐变柔光漩涡盘（静置不转，营造深度）
    // v295：缓存 key 补半径——原 key 未含 r，主页大滴（r52）建立后局内小滴（r30）会复用
    // 按 52 算出的渐变（尺寸/浓淡都不对）
    ctx.fillStyle = grad('vtxDisc' + (Math.round(r * 2) / 2), function () {
      var gg = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.82);
      gg.addColorStop(0, 'rgba(94,110,208,0.30)');
      gg.addColorStop(0.6, 'rgba(94,110,208,0.13)');
      gg.addColorStop(1, 'rgba(94,110,208,0)');
      return gg;
    });
    ctx.beginPath(); ctx.arc(0, 0, r * 0.82, 0, Math.PI * 2); ctx.fill();
    // 三条螺旋臂：整臂单路径连续描边（无接缝），透明度沿臂渐隐，整体缓慢旋转
    ctx.rotate(time * 2.4);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (var arm = 0; arm < 3; arm++) {
      var a0 = arm * Math.PI * 2 / 3;
      var endA = a0 + Math.PI * 1.9;
      (function (a0, endA, arm) {
        // 渐变与臂均从核心内部（0.05r）起：中心与旋臂连成一体，不再分离
        var gx0 = Math.cos(a0) * r * 0.05, gy0 = Math.sin(a0) * r * 0.05;
        var gx1 = Math.cos(endA) * r * 0.66, gy1 = Math.sin(endA) * r * 0.66;
        ctx.strokeStyle = grad('vtxArm' + arm, function () {
          var gg = ctx.createLinearGradient(gx0, gy0, gx1, gy1);
          gg.addColorStop(0, 'rgba(152,166,240,0.9)');
          gg.addColorStop(1, 'rgba(112,128,222,0.10)');
          return gg;
        });
      })(a0, endA, arm);
      ctx.lineWidth = Math.max(1.5, r * 0.085);
      ctx.beginPath();
      for (var i2 = 0; i2 <= 40; i2++) {
        var tt = i2 / 40;
        var aa = a0 + tt * Math.PI * 1.9;
        var rr2 = r * (0.05 + 0.61 * tt);              // 从核心内部起旋，臂与中心相接
        var x2 = Math.cos(aa) * rr2, y2 = Math.sin(aa) * rr2;
        if (i2 === 0) ctx.moveTo(x2, y2); else ctx.lineTo(x2, y2);
      }
      ctx.stroke();
    }
    // 中心亮核（被吸入的光）——核略放大并被旋臂根部穿过，与臂连成一体
    ctx.fillStyle = 'rgba(222,228,255,0.92)';
    ctx.beginPath(); ctx.arc(0, 0, r * 0.11, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  function drawCloudMark(r) {
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.beginPath();
    ctx.arc(-r * 0.25, -r * 0.25, r * 0.26, 0, Math.PI * 2);
    ctx.arc(r * 0.18, -r * 0.3, r * 0.32, 0, Math.PI * 2);
    ctx.arc(r * 0.42, -r * 0.18, r * 0.2, 0, Math.PI * 2);
    ctx.fill();
    var bob = Math.sin(time * 6) * r * 0.05;
    ctx.fillStyle = 'rgba(80,140,200,0.8)';
    ctx.beginPath();
    ctx.moveTo(-r * 0.2, r * 0.1 + bob);
    ctx.lineTo(-r * 0.3, r * 0.32 + bob);
    ctx.lineTo(-r * 0.1, r * 0.32 + bob);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(r * 0.22, r * 0.1 + bob);
    ctx.lineTo(r * 0.12, r * 0.32 + bob);
    ctx.lineTo(r * 0.32, r * 0.32 + bob);
    ctx.closePath(); ctx.fill();
  }
  function drawFrozenShell(b, r) {
    // 半透明冰壳 + 晶面 + 倒计时弧
    ctx.fillStyle = 'rgba(200,238,255,0.42)';
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 1.2;
    // 三条晶面线
    for (var i = 0; i < 3; i++) {
      var ang = i * Math.PI / 3 + 0.4;
      ctx.beginPath();
      ctx.moveTo(Math.cos(ang) * r * 0.8, Math.sin(ang) * r * 0.8);
      ctx.lineTo(-Math.cos(ang) * r * 0.8, -Math.sin(ang) * r * 0.8);
      ctx.stroke();
    }
    // 闪烁
    var tw = 0.5 + 0.5 * Math.sin(time * 6 + b.id);
    ctx.fillStyle = 'rgba(255,255,255,' + (0.5 + tw * 0.5) + ')';
    ctx.beginPath(); ctx.arc(r * 0.3, -r * 0.35, 2, 0, Math.PI * 2); ctx.fill();
    // 倒计时弧
    ctx.strokeStyle = 'rgba(90,170,210,0.9)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, r + 4, -Math.PI / 2, -Math.PI / 2 + (b.frozen / C.ice.freezeTime) * Math.PI * 2);
    ctx.stroke();
  }

  // ---------- 瞄准虚影 ----------
  // v307：落点预测——沿竖直方向找第一接触点（海床 或 任意实体的圆表面），供指示线与预览圈
  function landingYFor(x, r) {
    var y = FLOORY - r;                                  // 默认落在床面
    var bs = phys.bodies, i;
    for (i = 0; i < bs.length; i++) {
      var b = bs[i];
      if (Math.abs(b.vy) > 40) continue;                 // v308：跳过飞行中的水滴（含正在下落的
                                                         // 那颗）——否则预览圈会骑在坠落滴头顶上
      var dx = Math.abs(b.x - x), rr = r + b.r;
      if (dx >= rr) continue;                            // 与本列不相交
      var cy = b.y - Math.sqrt(rr * rr - dx * dx);       // 圆面接触高度
      if (cy < y) y = cy;
    }
    if (y < C.containerTop + r) y = C.containerTop + r;  // 不越容器顶
    return y;
  }
  // v310：指示线与虚影球分离——指示线在实体层"之后"绘制（坠落中的水滴从线上方经过，
  // 线不会被盖在滴上），虚影球保持原位
  // v320：待投虚影"活"起来（用户："水滴没有坠落时，可以加一个合适的效果吗?目前看水滴是虚的
  // 而且看起来呆呆的"）——纵向轻轻漂浮 + 同色系光晕呼吸。虚影球/指示线顶/名称标签同源一个
  // ghostBob()，整组预览作为一个整体呼吸；横向严格钉 aimX 不误导瞄准，只做纵向漂浮与亮度呼吸。
  // 幅度上限 4.2px（3+1.2）：标签与球顶间距恒为 5px，永不相撞
  function ghostBob() { return Math.sin(time * 2.1) * 3 + Math.sin(time * 3.9 + 1.3) * 1.2; }
  function drawGhostGuide(x, tier) {
    var r = nextIron ? C.iron.r : T[tier].r;
    var gy = C.spawnY + ghostBob(); // v320：线顶跟随虚影漂浮，不断连
    // v338：固定长度辅助线（参考主流落子指示：短而明确的瞄准段，不随堆高伸缩）
    // v349：①长度严格恒为 C.guideLen——去掉旧版 maxL 截断（堆高/大滴时会被裁短，"固定"名不副实）；
    //       ②线尾不带任何符号——去掉 v342 保留的落点小箭头（用户："下方不要带任何符号"）
    var topY = gy + r + 2;
    var L = C.guideLen;
    ctx.save();
    // v351：渐变改局部坐标 (0,0)->(0,L) 并配合 translate(0,topY)——原按绝对 topY 建立，
    // 而 topY 随虚影漂浮每帧都在变，导致每帧新建渐变对象；局部化后只与长度有关，可缓存。
    // 主线段：细而淡（比警戒线细），上深下浅——越低越浅（v342）
    ctx.translate(0, topY);
    var lg = grad('ghostGuide' + L, function () {
      var g2 = ctx.createLinearGradient(0, 0, 0, L);
      g2.addColorStop(0, 'rgba(110,195,250,0.85)');   // 顶部：较实
      g2.addColorStop(1, 'rgba(205,242,255,0.32)');   // 底部：更浅更淡（越低越浅）
      return g2;
    });
    ctx.strokeStyle = lg;
    ctx.lineWidth = 1.6;
    ctx.setLineDash([6, 8]);
    ctx.lineDashOffset = -time * 60;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, L);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }
  // v372：落点预览——半透明竖直瞄准列（虚影底→落点） + 落点虚线圈，提升手机落位精度
  function drawLandPreview() {
    var r = nextIron ? C.iron.r : T[nextTier].r;
    var gy = C.spawnY + ghostBob();
    var topY = gy + r + 2;
    ctx.save();
    // 竖直瞄准列（细、淡），与已有短引导线同源，向下延伸到落点
    ctx.strokeStyle = 'rgba(127,206,250,0.16)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 9]);
    ctx.lineDashOffset = -time * 30;
    ctx.beginPath();
    ctx.moveTo(aimX, topY);
    ctx.lineTo(aimX, FLOORY - r);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }
  function drawGhost(x, y, tier, alpha) {
    var r = nextIron ? C.iron.r : T[tier].r;
    var gy = y + ghostBob(); // v320：虚影轻轻漂浮
    // v337：极光庇护（延迟生效的 ×3）在下一滴上画一圈脉动光环 + 徽标，让"已激活"状态可见，
    // 否则玩家落完极光滴没有任何棋盘反馈，根本记不住下一合成会翻倍
    if (auroraNext && !nextIron) {
      var ap = 0.5 + 0.5 * Math.sin(time * 4);
      ctx.save();
      ctx.globalAlpha = alpha;
      var ag = ctx.createRadialGradient(x, gy, r * 0.9, x, gy, r * 1.9);
      ag.addColorStop(0, hexToRgba('#9BE8D8', 0));
      ag.addColorStop(0.7, hexToRgba('#9BE8D8', (0.30 + 0.18 * ap) * (alpha / 0.6)));
      ag.addColorStop(1, hexToRgba('#C8B8F0', 0));
      ctx.fillStyle = ag;
      ctx.beginPath(); ctx.arc(x, gy, r * 1.9, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = hexToRgba('#9BE8D8', 0.85);
      ctx.lineWidth = 3; ctx.setLineDash([6, 7]); ctx.lineDashOffset = -time * 30;
      ctx.beginPath(); ctx.arc(x, gy, r * 1.45, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }
    // 呼吸光晕：滴体同色系（特殊滴/符文取各自识别色），亮度随漂浮相位呼吸——
    // 给"虚影"以形体感，不再是一片平淡的半透明圆（v320）
    var glowC = nextIron ? '#8FA0AE' : (nextSpecial ? specialColor(nextSpecial) : (nextRune ? runeColor(nextRune) : T[tier].color));
    var pulse = 0.5 + 0.5 * Math.sin(time * 2.1 - 0.6);
    var hg = ctx.createRadialGradient(x, gy, r * 0.2, x, gy, r * 1.55);
    hg.addColorStop(0, hexToRgba(glowC, (0.22 + 0.10 * pulse) * (alpha / 0.6)));
    hg.addColorStop(1, hexToRgba(glowC, 0));
    ctx.fillStyle = hg;
    ctx.beginPath(); ctx.arc(x, gy, r * 1.55, 0, Math.PI * 2); ctx.fill();
    if (nextIron) {
      drawIronBall({ x: x, y: gy, r: r, vx: 0, vy: 0 }, alpha);
    } else {
      drawBall({ x: x, y: gy, r: r, tier: tier, vx: 0, vy: 0, special: nextSpecial, rune: nextRune }, alpha);
    }
    // v337：极光庇护徽标（跟随虚影，常驻提示"下一合成 ×N"）
    if (auroraNext && !nextIron) {
      var ly2 = Math.max(C.containerTop + 15, C.spawnY - r - 10 + ghostBob());
      var bx = x, by = ly2 - 40;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.textAlign = 'center';
      ctx.font = 'bold 12px system-ui, sans-serif';
      var txt = '极光庇护 ×' + auroraNext;
      var tw2 = ctx.measureText(txt).width + 16;
      roundRect(Math.round(bx - tw2 / 2), Math.round(by - 14), tw2, 18, 9);
      ctx.fillStyle = 'rgba(155,232,216,0.92)'; ctx.fill();
      ctx.fillStyle = '#0E3B33';
      ctx.fillText(txt, Math.round(bx), Math.round(by - 1));
      ctx.restore();
    }
  }

  // 特殊滴/符文/礁石名称标签：紧贴虚影球顶（在 render 末尾绘制，保证不被 HUD 盖住）
  function drawGhostLabel() {
    if (state !== 'play' || evapMode || flowMode || rippleMode || confirmOpen) return; // v320：补 flowMode，与虚影球同显隐
    var r = nextIron ? C.iron.r : T[nextTier].r;
    var label = nextIron ? '礁石' : (nextSpecial ? specialLabel(nextSpecial) : (nextRune ? runeName(nextRune) + '符文' : null));
    if (!label) return;
    var alpha = cooldown > 0 ? 0.35 : 0.9;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic'; // v276：显式基线，度量与绘制不受前序残留影响
    ctx.font = 'bold 14px system-ui, sans-serif';
    var ink = measureInk('bold 14px system-ui, sans-serif', label); // v300：恒等变换下测量
    var tw = ink.w + 14;
    var ly = Math.max(C.containerTop + 15, C.spawnY - r - 10 + ghostBob()); // v320：标签随虚影同浮（与球顶间距恒 5px）
    ctx.fillStyle = 'rgba(255,255,255,0.88)';
    // v285：胶囊 17→20 高（下缘不动仍距球顶 5px，上缘抬高 3px）——旧 17 高时 14px 粗体字面
    // 距胶囊边只剩 ≈0.7px，字形的不对称留白被放大成"没居中"的观感；20 高给足 ≈3px 呼吸，
    // 视觉重心不再被边距挤压误导；x 全部取整消除亚像素模糊
    roundRect(Math.round(aimX - tw / 2), ly - 15, tw, 20, 10); ctx.fill();
    ctx.fillStyle = nextIron ? '#6B6353' : (nextSpecial ? specialColor(nextSpecial) : runeColor(nextRune));
    // v276：用实际字形边界（actualBoundingBox）精确垂直居中——canvas 'middle' 基线按 em 盒
    // 取中，CJK 字形实际偏上/偏下因字而异；胶囊几何中心 = ly-5，基线补 (asc-desc)/2 修正
    var asc = ink.has ? ink.a : 14 * 0.84, desc = ink.has ? ink.d : 14 * 0.06; // v300：无像素框 API 时用 CJK 排印常数
    ctx.fillText(label, Math.round(aimX), ly - 5 + (asc - desc) / 2);
    ctx.restore();
  }

  // ---------- 容器：玻璃质感 + 底部焦散 ----------
  function drawContainer() {
    var floorY = FLOORY, FH = 12;
    // 底部不带独立海床色块：容器底（FLOORY）以下直接显示全屏背景水色渐变（用户定：
    // 「去掉这个方块，不是变个颜色，直接显示整体的背景」），任何分辨率观感一致。
    // 床面：圆角横条（半透明玻璃质感，透出背景色，不再有硬边界）
    var fg = grad('fg' + Math.round(VH), function () {
      var gg = ctx.createLinearGradient(0, floorY, 0, floorY + FH + 6);
      gg.addColorStop(0, 'rgba(255,255,255,0.6)');
      gg.addColorStop(0.55, 'rgba(228,244,240,0.4)');
      gg.addColorStop(1, 'rgba(200,230,226,0.22)');
      return gg;
    });
    ctx.fillStyle = fg;
    roundRect(-6, floorY, C.W + 12, FH + 6, 6); ctx.fill();
    ctx.strokeStyle = 'rgba(90,150,190,0.22)';
    ctx.lineWidth = 1;
    roundRect(-5.5, floorY + 0.5, C.W + 11, FH + 5, 6); ctx.stroke();

    // 焦散光斑（水底光纹，全宽）
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, floorY - 14, C.W, 14);
    ctx.clip();
    var ca = 0.10 + tide.progress * 0.08;
    ctx.strokeStyle = 'rgba(255,255,255,' + ca + ')';
    ctx.lineWidth = 2;
    for (var i = 0; i < 5; i++) {
      var cx0 = 40 + i * 82 + Math.sin(time * 0.9 + i * 1.7) * 12;
      ctx.beginPath();
      ctx.ellipse(cx0, floorY - 5, 26, 5, Math.sin(time + i) * 0.2, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();

    // 容器底部进深渐变（水底压暗，衬托水滴）
    var dep = grad('dep' + Math.round(FLOORY), function () {
      var gg = ctx.createLinearGradient(0, floorY - 30, 0, floorY);
      gg.addColorStop(0, 'rgba(20,70,120,0)');
      gg.addColorStop(1, 'rgba(20,70,120,0.14)');
      return gg;
    });
    ctx.fillStyle = dep;
    ctx.fillRect(0, floorY - 30, C.W, 30);

    // 底部装饰（无海床基色，直接坐在背景水色上）：沙丘起伏 + 卵石 + 海星 + 扇贝。
    // 坐标全部由 layout.band 派生（钉容器底相对位）：块高/比例变化时装饰不重排（v172 教训）
    var sy0 = MG.layout.band.decorBase;
    // 沙丘（径向渐变柔边：中心实色 → 边缘全透明，消除硬边；scale 把椭圆映射到单位圆，
    // 保证渐变在椭圆各个方向均匀衰减，不会因径向渐变是圆形而被压扁）
    function dune(cx, cy, rx, ry, c, c0) {
      var R = Math.max(rx, ry);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(rx / R, ry / R);
      var g = ctx.createRadialGradient(0, 0, 0, 0, 0, R);
      g.addColorStop(0, c);
      g.addColorStop(0.72, c);
      g.addColorStop(1, c0);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    for (var di = 0; di < MG.layout.band.dunes.length; di++) {
      var du = MG.layout.band.dunes[di];
      dune(du.x, sy0 + du.dy, du.rx, du.ry, du.c, du.c0);
    }
    // 卵石（块内坐标，贴容器底；装饰 y 以 FLOORY=646 时代为基准，随床面整体下移）
    ctx.fillStyle = 'rgba(110,150,168,0.4)';
    var yoff = MG.layout.band.pebbleYOff;
    var peb = MG.layout.band.pebbles;
    for (var pi = 0; pi < peb.length; pi++) {
      ctx.beginPath(); ctx.arc(peb[pi][0], peb[pi][1] + yoff, peb[pi][2], 0, Math.PI * 2); ctx.fill();
    }
    drawStarfish(MG.layout.band.starfish.x, MG.layout.band.starfish.y + yoff, MG.layout.band.starfish.s);
    drawShell(MG.layout.band.shell.x, MG.layout.band.shell.y + yoff, MG.layout.band.shell.s);
  }

  // 海星：五条圆钝臂 + 中心盘 + 亮斑
  function drawStarfish(x, y, s) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.35);
    ctx.fillStyle = 'rgba(232,160,117,0.9)';
    for (var k = 0; k < 5; k++) {
      ctx.save();
      ctx.rotate(k * Math.PI * 2 / 5);
      ctx.beginPath();
      ctx.ellipse(0, -s * 0.55, s * 0.24, s * 0.58, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.beginPath(); ctx.arc(0, 0, s * 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,230,210,0.8)';
    ctx.beginPath(); ctx.arc(-s * 0.08, -s * 0.1, s * 0.09, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(s * 0.12, s * 0.06, s * 0.07, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // 扇贝：半圆壳 + 放射纹
  function drawShell(x, y, s) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(0.2);
    ctx.fillStyle = 'rgba(246,222,208,0.95)';
    ctx.beginPath();
    ctx.moveTo(0, s * 0.55);
    ctx.arc(0, s * 0.55, s, Math.PI, Math.PI * 2);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(205,140,115,0.55)';
    ctx.lineWidth = 1;
    for (var k = 0; k <= 4; k++) {
      var th = Math.PI + (k / 4) * Math.PI;
      ctx.beginPath();
      ctx.moveTo(0, s * 0.55);
      ctx.lineTo(Math.cos(th) * s, s * 0.55 + Math.sin(th) * s);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ---------- 潮汐水体（后层填充 + 前层水面） ----------
  function drawWaterBack() {
    if (tide.progress <= 0.01) return;
    var wy = tideY(), left = C.wall, right = C.W - C.wall;
    var sn = seaStageNow(), st = sn.st; // v231：海域换色过渡期与背景同步插值（不再瞬间跳变）
    var g = grad('wback' + sn.ck + Math.round(wy / 4), function () {
      var gg = ctx.createLinearGradient(0, wy - tideAmp(), 0, FLOORY);
      gg.addColorStop(0, hexToRgba(deepenHex(st.bg[3], 0.25), 0.32)); // 上浅
      gg.addColorStop(1, hexToRgba(deepenHex(st.bg[3], 0.55), 0.62)); // 下深：色相随海域、保证可辨识
      return gg;
    });
    ctx.fillStyle = g;
    // 沿波形路径填充（顶部随波浪起伏，而非平顶矩形）
    ctx.beginPath();
    ctx.moveTo(left, FLOORY + 4);
    for (var x = left; x <= right; x += 6) ctx.lineTo(x, tideCrest(x));
    ctx.lineTo(right, FLOORY + 4);
    ctx.closePath();
    ctx.fill();
  }
  function drawWaterFront() {
    if (tide.progress <= 0.01) return;
    var left = C.wall, right = C.W - C.wall;
    // 半透明覆盖（浸没部分染色，同一条波形）——海域色加深派生，过渡期随 seaStageNow 同步插值
    ctx.fillStyle = hexToRgba(deepenHex(seaStageNow().st.bg[3], 0.4), 0.18);
    ctx.beginPath();
    ctx.moveTo(left, FLOORY + 4);
    for (var x = left; x <= right; x += 6) ctx.lineTo(x, tideCrest(x));
    ctx.lineTo(right, FLOORY + 4);
    ctx.closePath();
    ctx.fill();
    // 水面波浪线（高亮 crest）
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (x = left; x <= right; x += 5) {
      var y = tideCrest(x);
      if (x === left) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    // 波谷暗影（增强立体感）
    ctx.strokeStyle = 'rgba(20,90,160,0.35)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    var first = true;
    for (x = left; x <= right; x += 5) {
      var sy = tideCrest(x) + 4;
      if (first) { ctx.moveTo(x, sy); first = false; } else ctx.lineTo(x, sy);
    }
    ctx.stroke();
    // 浪尖泡沫（骑在 crest 上，涨潮越猛泡沫越亮越多）
    ctx.fillStyle = 'rgba(255,255,255,' + (0.4 + tide.progress * 0.3).toFixed(2) + ')';
    for (x = left; x <= right; x += 26) {
      var fy = tideCrest(x) - 3;
      var fr = 1.4 + Math.sin(x * 0.5 + time * 5) * 0.5;
      ctx.beginPath(); ctx.arc(x, fy, fr, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  // ---------- 道具模式提示（蒸发/涟漪/水流）：与默认弹字同源，不另造位置/样式 ----------
  function drawPropHint(text) {
    var y = MG.layout.body.mirrorCy;   // 默认弹字带（涨潮横幅/公告弹字同一锚点），文本样式保持原样
    ctx.textAlign = 'center';
    ctx.font = 'bold 19px system-ui, sans-serif';
    ctx.strokeStyle = 'rgba(10,40,70,0.6)';
    ctx.lineWidth = 4;
    ctx.strokeText(text, C.W / 2, y);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(text, C.W / 2, y);
  }

  // v372：潮汐浮力致死透明度——被浮力持续顶起、逼近/越过警戒线的水滴套橙色呼吸预警圈，
  // 让玩家理解"被托上去"而非凭空死（沿用 dangerAlert 的橙色警示语言）
  function drawBuoyWarn() {
    if (state !== 'play') return;
    if (tide.progress <= 0.02) return; // 无潮汐浮力不预警
    var wy = tideY();
    for (var i = 0; i < phys.bodies.length; i++) {
      var b = phys.bodies[i];
      if (b.iron || b.frozen > 0 || b.special) continue;
      var top = b.y - b.r;
      if (top > C.dangerY - 72) continue; // 仅关注接近/已越警戒线
      var subm = (b.y + b.r - wy) / (2 * b.r);
      if (subm <= 0.02) continue;        // 需在水面以下（受浮力）
      if (b.vy > -6) continue;           // 需正被向上托举
      var prox = Math.min(1, (C.dangerY - top + 72) / 144);
      var pulse = 0.5 + 0.5 * Math.sin(time * 5);
      var a = (0.22 + 0.4 * prox) * (0.45 + 0.55 * pulse);
      ctx.save();
      ctx.strokeStyle = 'rgba(255,150,90,' + a + ')';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([5, 5]);
      ctx.lineDashOffset = -time * 40;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r + 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }
  }

  // v372：深海事件来袭预警——风暴/涌泉触发前 1.6s 屏幕边缘泛光 + 中央文字预警，给反应时间
  function drawEventWarn() {
    if (!seaWarn) return;
    var w = 1 - Math.max(0, seaWarn.t) / SEA_WARN_T; // 0→1 进度
    var danger = seaWarn.type === 'storm' || seaWarn.type === 'surge';
    var col = danger ? '224,90,70' : '120,185,255';
    var a = (0.10 + 0.16 * (1 - Math.abs(w - 0.5) * 2)) * (0.6 + 0.4 * Math.sin(time * 7));
    var g = ctx.createRadialGradient(C.W / 2, VH / 2, VH * 0.28, C.W / 2, VH / 2, VH * 0.78);
    g.addColorStop(0, 'rgba(' + col + ',0)');
    g.addColorStop(1, 'rgba(' + col + ',' + Math.max(0, a) + ')');
    ctx.fillStyle = g;
    ctx.fillRect(-BX, -renderOy, C.W + BX * 2, VH);
    var label = seaWarn.type === 'storm' ? '漩涡风暴 将至' : seaWarn.type === 'surge' ? '深海涌泉 将至' : '海神甘霖 将至';
    ctx.save();
    ctx.textAlign = 'center';
    ctx.globalAlpha = 0.6 + 0.4 * Math.sin(time * 7);
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.strokeText(label, C.W / 2, C.dangerY - 40);
    ctx.fillStyle = danger ? '#F2614A' : '#7FD4FF';
    ctx.fillText(label, C.W / 2, C.dangerY - 40);
    ctx.restore();
  }

  // v372：连击常驻显示——连击数 + 连击窗口剩余条（顶部居中），强化"我在秀操作"正反馈
  function drawComboMeter() {
    if (state !== 'play') return;
    if (combo < 2 || comboTimer <= 0) return;
    var x = C.W / 2, y = C.dangerY + 55;
    var pulse = 0.5 + 0.5 * Math.sin(time * 8);
    ctx.save();
    ctx.textAlign = 'center';
    var fs = 22 + Math.min(16, combo * 1.2);
    ctx.font = 'bold ' + fs + 'px system-ui, sans-serif';
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.strokeText('连击 ×' + combo, x, y);
    ctx.fillStyle = '#FFD86B';
    ctx.fillText('连击 ×' + combo, x, y);
    var bw = 110, bh = 5, bx = x - bw / 2, by = y + 12;
    var frac = Math.max(0, Math.min(1, comboTimer / C.comboWindow));
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    roundRect(bx, by, bw, bh, 2.5); ctx.fill();
    ctx.fillStyle = 'rgba(255,216,107,' + (0.6 + 0.4 * pulse) + ')';
    roundRect(bx, by, bw * frac, bh, 2.5); ctx.fill();
    ctx.restore();
  }

  // v375：礁石相邻(退潮)提示——两块礁石相触且处于退潮(tide.progress<tideNeed)时，
  // 在每块相邻礁石外圈加一层虚线圆，并在礁石群上方标注「需涨潮相消」（替换原全局弹字）
  function drawReefCancelHint() {
    if (tide.progress >= C.iron.tideNeed) return; // 涨潮可相消，无需提示
    var bs = phys.bodies, i, j, k, n = bs.length, dx, dy, d2, rr;
    var adj = [];
    for (i = 0; i < n; i++) {
      if (!bs[i].iron || bs[i].chest) continue;
      var linked = false;
      for (j = 0; j < n; j++) {
        if (j === i || !bs[j].iron || bs[j].chest) continue;
        dx = bs[j].x - bs[i].x; dy = bs[j].y - bs[i].y;
        rr = bs[i].r + bs[j].r + 8;
        if (dx * dx + dy * dy <= rr * rr) { linked = true; break; }
      }
      if (linked) adj.push(bs[i]);
    }
    if (adj.length < 2) return; // 至少两块相邻才提示
    ctx.save();
    ctx.textAlign = 'center';
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 6]);
    for (k = 0; k < adj.length; k++) {
      ctx.beginPath();
      ctx.arc(adj[k].x, adj[k].y, adj[k].r + 8, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    var cx = 0, topY = 1e9;
    for (k = 0; k < adj.length; k++) { cx += adj[k].x; topY = Math.min(topY, adj[k].y - adj[k].r); }
    cx /= adj.length;
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 3;
    ctx.strokeText('需涨潮相消', cx, topY - 12);
    ctx.fillStyle = '#FFD86B';
    ctx.fillText('需涨潮相消', cx, topY - 12);
    ctx.restore();
  }
  function drawDangerLine() {
    // 危险度：仅当水滴顶逼近警戒线 ≤ dangerWarnH（从下方逼近）才进入「闪烁警示」；
    // 更远时线条保持安静（恒定暗青蓝，不闪），避免无意义常亮。
    var H = C.dangerWarnH;
    var near = 0, i;
    // 复用 checkDanger 的静止判据（sp < dangerSpeed*1.5）：高压堆会持续微颤，阈值过严(如 80)会把
    // 静止堆帧误杀→永远不闪；下落/弹飞的单滴速度远超此值→自然被排除。结果即：
    // 「落单滴（高速）不闪，只有静止堆逼近警戒线才闪」。
    var restSp = C.dangerSpeed * 1.5;    // 与越线判负同一个静止阈值，避免两套标准打架
    for (i = 0; i < phys.bodies.length; i++) {
      var b = phys.bodies[i];
      var sp = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
      if (sp >= restSp) continue;        // 快速下落/弹飞的单滴：不触发预警（速度远超静止阈值）
      var d = (b.y - b.r) - C.dangerY;   // 水滴顶相对警戒线：<0 = 越线(线上方)，≥0 = 线下(安全区)
      if (d < 0) continue;               // 越线由 dangerAlert 强制警示；线下才做「逼近闪烁」
      var prox = 1 - d / H;              // 贴线→≈1，距线 H 处→0；d>H 时为负，下面不入阈
      if (prox > 0) near = Math.max(near, prox);
    }
    near = Math.max(near, dangerAlert * 0.95); // 越线判定进行中：强制进入红色警示态（闪烁）
    var flashing = near > 0.02;
    // 警示节奏：C · 呼吸红光（预览页用户选定）——1.1Hz 大幅正弦，0.08↔1 全程流动，柔和但醒目；
    // 幅度仍随 near 自动缩放（a = (0.3+near*0.6)*blink）：刚进阈值弱呼吸、贴线强呼吸。
    var blink = flashing ? (0.08 + 0.92 * (0.5 + 0.5 * Math.sin(time * 1.1 * 2 * Math.PI))) : 1;
    var glow = near;
    var a = flashing ? (0.3 + glow * 0.6) * blink : 0.2;   // 安静态恒定 0.2，警示态随 blink 呼吸
    // 警戒范围：与深海背景融合的暗色渐晕（危险度越高才越透出暖色警示）
    var dz = ctx.createLinearGradient(0, C.dangerY, 0, C.dangerY + 42);
    dz.addColorStop(0, 'rgba(38,78,108,' + (0.12 + glow * 0.06) + ')');
    dz.addColorStop(1, 'rgba(38,78,108,0)');
    ctx.fillStyle = dz;
    ctx.fillRect(0, C.dangerY, C.W, 42);
    if (glow > 0.05) {
      var wz = ctx.createLinearGradient(0, C.dangerY, 0, C.dangerY + 42);
      wz.addColorStop(0, 'rgba(224,120,80,' + (glow * 0.14 * blink) + ')');
      wz.addColorStop(1, 'rgba(224,120,80,0)');
      ctx.fillStyle = wz;
      ctx.fillRect(0, C.dangerY, C.W, 42);
    }
    // 警戒线：两端渐隐的光带（平静时青蓝，越危险越转红、并随 blink 明灭）
    var lr = Math.round(96 + glow * 130), lgn = Math.round(150 - glow * 60), lb = Math.round(196 - glow * 122);
    var lineG = ctx.createLinearGradient(0, 0, C.W, 0);
    var cCore = 'rgba(' + lr + ',' + lgn + ',' + lb + ',';
    lineG.addColorStop(0, cCore + '0)');
    lineG.addColorStop(0.07, cCore + (a * 0.85) + ')');
    lineG.addColorStop(0.5, cCore + a + ')');
    lineG.addColorStop(0.93, cCore + (a * 0.85) + ')');
    lineG.addColorStop(1, cCore + '0)');
    ctx.strokeStyle = lineG;
    ctx.lineWidth = 2 + glow * 1.4;
    ctx.beginPath();
    ctx.moveTo(2, C.dangerY);
    ctx.lineTo(C.W - 2, C.dangerY);
    ctx.stroke();
    // 叠加一层圆头流动刻度（白色小段向右缓慢滑动；警示时随 blink 提亮）
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,' + ((flashing ? 0.35 + glow * 0.5 : 0.26) * blink) + ')';
    ctx.lineWidth = 1.6 + glow;
    ctx.setLineDash([3, 13]);
    ctx.lineDashOffset = -time * 26;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(2, C.dangerY);
    ctx.lineTo(C.W - 2, C.dangerY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.lineCap = 'butt';
    ctx.restore();
    // 危险时两端亮起端点光珠（与警戒线同色柔光圆点，外圈光晕+内核，随 blink 呼吸）
    if (glow > 0.05) {
      var pa = (0.35 + glow * 0.55) * blink;
      for (var side = 0; side < 2; side++) {
        var ex2 = side ? C.W - 5 : 5;
        // 外圈柔晕（大而淡）
        ctx.fillStyle = cCore + (pa * 0.22) + ')';
        ctx.beginPath(); ctx.arc(ex2, C.dangerY, 10 + glow * 4, 0, Math.PI * 2); ctx.fill();
        // 中层过渡
        ctx.fillStyle = cCore + (pa * 0.4) + ')';
        ctx.beginPath(); ctx.arc(ex2, C.dangerY, 5.5, 0, Math.PI * 2); ctx.fill();
        // 内核亮点
        ctx.fillStyle = 'rgba(255,255,255,' + (pa * 0.85) + ')';
        ctx.beginPath(); ctx.arc(ex2, C.dangerY, 2.2 + glow * 1.2, 0, Math.PI * 2); ctx.fill();
      }
    }
    // 判定进行中的警示文字 v326 起移出本函数（见 drawDangerText）：原随警戒线在实体层
    // 之前绘制，堆高时水滴就盘踞在文字一带、把警示语盖住，玩家看不到任何提示
    // （用户："有些提示信息会叠在水滴下面导致字体被挡（比如死亡倒计时提示）"）。
  }

  // 越线判负提示（v326 从 drawDangerLine 内移出独立函数并改在实体层之后绘制——
  // 堆高时水滴就盘踞在文字一带，画在 bodies 之前必被盖住）
  function drawDangerText() {
    if (dangerAlert <= 0.12) return;
    ctx.textAlign = 'center';
    // v333：合并为一条提示「堆高越线 2.3s」（用户"堆高越线和倒计时合并为一个提示"）——
    // 原 26px 大字 + 34px 秒数两行拆着读，现一行 30px 同色同 alpha；1Hz 同相呼吸保持
    // （共用 pulse，永不熄灭：最低不透明度 ~0.39，危险度只抬高亮度下限）。
    var pulse = 0.5 + 0.5 * Math.sin(time * 2 * Math.PI); // 1Hz 呼吸
    var wa = Math.min(1, 0.55 + dangerAlert * 0.45) * (0.7 + 0.3 * pulse);
    var sec = Math.max(0, dangerRemain);
    ctx.lineJoin = 'round';
    ctx.font = 'bold 30px system-ui, sans-serif';
    ctx.strokeStyle = 'rgba(255,255,255,' + wa + ')';
    ctx.lineWidth = 5;
    ctx.strokeText('堆高越线 ' + sec.toFixed(1) + 's', C.W / 2, C.dangerY - 26);
    ctx.fillStyle = 'rgba(196,48,42,' + wa + ')';
    ctx.fillText('堆高越线 ' + sec.toFixed(1) + 's', C.W / 2, C.dangerY - 26);
  }

  // ---------- 顶部 HUD（无背景板，悬浮文字 + 描边保证可读） ----------
  function drawHUD() {
    ctx.textAlign = 'left';
    ctx.lineJoin = 'round';
    // 第一组（左上）：设置按钮 + 最高分 · 最远海域（历史信息退居角落，实时信息居中）
    // ★ v196：统计只保留"最高 / 最远海域"两项（用户："只统计最大得分和最远海就行了，
    //   其他的统计就不要显示了"）——移除 海域×N / 每日挑战 X/Y / 「NG」×N 三项，
    //   颜色随之固定 #3E6E90（原随每日挑战/NG 变紫的逻辑一并移除）
    var farIdx = 0;
    for (var fi = C.seaStages.length - 1; fi >= 0; fi--) {
      if (careerPeak >= C.seaStages[fi].at) { farIdx = fi; break; }
    }
    farIdx = Math.max(farIdx, seaStage()); // v328：实时——当前海域更深则即时显示（用户："游戏时当前海域超过统计结果也不更新"）
    // 统计最佳结果：沿用原样式（14px/原描边/原色/超宽自适应缩字号），与成就殿堂按钮垂直居中对齐（cy36 → baseline41）
    ctx.font = '14px system-ui, sans-serif';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    var top1 = '最高 ' + best + ' · 最远 ' + C.seaStages[farIdx].name;
    var t1Font = 14;
    while (t1Font > 11 && ctx.measureText(top1).width > 240) { // 右端让位计时文字(x340 起)，不越界
      t1Font--;
      ctx.font = t1Font + 'px system-ui, sans-serif';
    }
    ctx.strokeText(top1, 50, MG.layout.hud.row1Y);
    ctx.fillStyle = '#3E6E90';
    ctx.fillText(top1, 50, MG.layout.hud.row1Y);

    // 第二组（中轴）：当前得分居中 + 正下方海域进度条（分数涨→进度前进，垂直联动）
    var bump = scoreBump > 0 ? 1 + Math.sin((0.35 - scoreBump) / 0.35 * Math.PI) * 0.12 : 1;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.translate(C.W / 2, MG.layout.hud.scoreY);
    ctx.scale(bump, bump);
    ctx.font = 'bold 34px system-ui, sans-serif';
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    var txt = String(Math.round(displayScore));
    ctx.strokeText(txt, 0, 0);
    ctx.fillStyle = '#12517E';
    ctx.fillText(txt, 0, 0);
    ctx.restore();
    ctx.textAlign = 'left';

    // 右上角：计时（下一滴预览已移除——容器内虚影已直观展示下一滴，此处改回计时）
    // 与左侧统计行同排、与设置按钮(cy35)垂直居中对齐
    ctx.textAlign = 'center';
    ctx.lineJoin = 'round';
    // 计时沿用原样式（12px bold / #2E7DA8），与设置按钮(cy35)垂直居中对齐、与左侧统计行同排
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    var em = Math.floor(levelElapsed / 60), es = Math.floor(levelElapsed % 60);
    var etxt = '已进行 ' + em + ':' + (es < 10 ? '0' + es : es);
    ctx.strokeText(etxt, C.W - 80, MG.layout.hud.row1Y);
    ctx.fillStyle = '#2E7DA8';
    ctx.fillText(etxt, C.W - 80, MG.layout.hud.row1Y);

    // 设置按钮（左上角，v197：替代原成就奖杯位；右上角音量钮已移除）——局内与初始界面共用
    drawSetBtn();
  }
  // v200 设置图标候选（重设计，供预览筛选；drawSetBtn 经 setIconStyle 选择）
  // 旧 v199B 用 gs=setBtn.r/13 放大，齿顶达 17.3/18 几乎抵边、发挤发虚；
  // 本版固定半径（tipR=12）留 6px 边距，并给出四种风格供用户筛选。
  var setIconStyle = 'A'; // 'A'实心齿轮 'B'线描齿轮 'C'滑块 'D'表盘
  // 八齿齿轮：平顶齿 + 斜肩（proper cog，非星芒），fill=实心(蓝心孔) / line=线描(中心点)
  function setIconCog(ctx, fill) {
    var tipR = 12, rootR = 7.5, teeth = 8, step = Math.PI * 2 / teeth;
    ctx.beginPath();
    for (var i = 0; i < teeth; i++) {
      var ac = i * step, a0 = ac - step * 0.30, a1 = ac - step * 0.16,
          a2 = ac + step * 0.16, a3 = ac + step * 0.30;
      var pts = [[a0, rootR], [a1, tipR], [a2, tipR], [a3, rootR]];
      for (var k = 0; k < 4; k++) {
        var x = Math.cos(pts[k][0]) * pts[k][1], y = Math.sin(pts[k][0]) * pts[k][1];
        if (i === 0 && k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
    }
    ctx.closePath();
    if (fill) {
      ctx.fillStyle = '#FFFFFF'; ctx.fill();
      ctx.fillStyle = '#2E7DA8'; ctx.beginPath(); ctx.arc(0, 0, 4.2, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2.5; ctx.lineJoin = 'round'; ctx.stroke();
      ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(0, 0, 2, 0, Math.PI * 2); ctx.fill();
    }
  }
  // 三条滑块（现代"设置"语义，清晰不歧义）
  function setIconSliders(ctx) {
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    var ys = [-7, 0, 7], xs = [-4, 5, -3];
    for (var i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.moveTo(-10, ys[i]); ctx.lineTo(10, ys[i]); ctx.stroke();
      ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(xs[i], ys[i], 3, 0, Math.PI * 2); ctx.fill();
    }
    ctx.lineCap = 'butt';
  }
  // 表盘（外环 + 八刻度 + 中心点，极简）
  function setIconDial(ctx) {
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(0, 0, 8.5, 0, Math.PI * 2); ctx.stroke();
    for (var i = 0; i < 8; i++) {
      var a = i * Math.PI / 4;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 8.8, Math.sin(a) * 8.8);
      ctx.lineTo(Math.cos(a) * 11.5, Math.sin(a) * 11.5);
      ctx.stroke();
    }
    ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(0, 0, 2, 0, Math.PI * 2); ctx.fill();
    ctx.lineCap = 'butt';
  }
  // v317 垃圾桶（清空存档语义）：盖沿+提手+上宽下窄箱身+两道竖筋，白色线描
  function setIconTrash(ctx) {
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-7, -4); ctx.lineTo(7, -4); ctx.stroke();       // 盖沿
    ctx.beginPath(); ctx.moveTo(-3, -6.5); ctx.lineTo(3, -6.5); ctx.stroke();   // 提手横梁
    ctx.beginPath(); ctx.moveTo(-2, -6.5); ctx.lineTo(-2, -4); ctx.stroke();    // 提手左
    ctx.beginPath(); ctx.moveTo(2, -6.5); ctx.lineTo(2, -4); ctx.stroke();      // 提手右
    ctx.beginPath();                                                             // 箱身
    ctx.moveTo(-5.5, -4); ctx.lineTo(-4.5, 7); ctx.lineTo(4.5, 7); ctx.lineTo(5.5, -4);
    ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-1.8, -1.5); ctx.lineTo(-1.4, 5); ctx.stroke(); // 竖筋左
    ctx.beginPath(); ctx.moveTo(1.8, -1.5); ctx.lineTo(1.4, 5); ctx.stroke();   // 竖筋右
    ctx.lineCap = 'butt';
  }
  // 设置按钮（v197 新增；v200 图标可切换 A/B/C/D，默认 A）
  // v279：钮体统一为"白边+蓝底"——drawCircleBtn（渐变蓝底+白细内环+左上高光弧），
  // 与技能栏图鉴书本钮同一绘制语言（用户："如同图鉴图标那样"）
  function drawSetBtn() {
    drawCircleBtn(setBtn, '#2E7DA8', 1, false, 0);
    ctx.save();
    ctx.translate(setBtn.cx, setBtn.cy);
    var k = setBtn.r / 18;        // 仅跟随按钮半径，不再过度放大
    ctx.scale(k, k);
    if (setIconStyle === 'A') setIconCog(ctx, true);
    else if (setIconStyle === 'B') setIconCog(ctx, false);
    else if (setIconStyle === 'C') setIconSliders(ctx);
    else setIconDial(ctx);
    ctx.restore();
  }
  // 设置弹窗（v197：音效/音乐/震动三开关；v317：+清空存档一行。几何走 layout.setRect/setRowRect/setCloseRect）
  // 用户要求底部不放说明文本；v317 面板 260→326 容纳第 4 行（行几何不变）
  function drawSettings() {
    layoutSetPanel();                 // 复用本游戏通用面板几何（与图鉴/成就同源）
    // 压暗背景已上移 drawPanelFx 统一绘制（v275）
    // 通用面板容器（与图鉴/成就同一 panel() 白卡）
    panel(SET_PANEL.x, SET_PANEL.y, SET_PANEL.w, SET_PANEL.h, 14, 0.97);
    // 通用页头（图标圆+标题+✕ 同一水平中线）；v283：齿轮等比缩 2/3——设置钮 r18 齿顶 12
    // （占半径 0.667），图标圆 r12 内同比例 → 齿顶 8，与按钮图标比例一致（用户："内部形状太大"）
    drawPanelHeader('设置', SET_PANEL, setCloseBtn, function () {
      ctx.save(); ctx.scale(0.667, 0.667); setIconCog(ctx, true); ctx.restore();
    }, '#2E7DA8');
    // 三行开关（点整行即切换；systems.js toggleSet）
    var names = ['音效', '音乐', '震动'];
    var descs = ['水滴合成与技能音效', '深海氛围背景音乐', '震动反馈']; // v287：去"（马达）"措辞（用户：不用突出是马达震动）
    for (var si = 0; si < 3; si++) {
      var row = MG.layout.setRowRect(si);
      ctx.fillStyle = 'rgba(46,134,180,0.07)';
      roundRect(row.x, row.y, row.w, row.h, 10); ctx.fill();
      ctx.strokeStyle = 'rgba(90,140,180,0.18)'; ctx.lineWidth = 1;
      roundRect(row.x + 0.5, row.y + 0.5, row.w - 1, row.h - 1, 10); ctx.stroke();
      ctx.textAlign = 'left';
      ctx.fillStyle = '#155A8A';
      ctx.font = 'bold 16px system-ui, sans-serif';
      ctx.fillText(names[si], row.x + 18, row.y + 24);
      ctx.fillStyle = '#4A7FA0';
      ctx.font = '12px system-ui, sans-serif';
      ctx.fillText(descs[si], row.x + 18, row.y + 42);
      // 滑块开关（52×30 右侧垂直居中；on 态蓝底白钮右置）
      var on = si === 0 ? audio.sfxOn : (si === 1 ? audio.musicOn : audio.vibOn);
      var sx = row.x + row.w - 18 - 52, sy = row.y + 13;
      ctx.fillStyle = on ? '#2E86B4' : 'rgba(120,150,175,0.35)';
      roundRect(sx, sy, 52, 30, 15); ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath(); ctx.arc(on ? sx + 52 - 15 : sx + 15, sy + 15, 11, 0, Math.PI * 2); ctx.fill();
    }
    // v317 第 4 行：清空存档（独立功能；危险样式与三开关区分——红 accents + 右侧「清空」小钮）。
    // 点整行即开二级确认（systems.js setClearOpen），不直接执行
    var clr = MG.layout.setRowRect(3);
    ctx.fillStyle = 'rgba(176,88,74,0.08)';
    roundRect(clr.x, clr.y, clr.w, clr.h, 10); ctx.fill();
    ctx.strokeStyle = 'rgba(176,88,74,0.35)'; ctx.lineWidth = 1;
    roundRect(clr.x + 0.5, clr.y + 0.5, clr.w - 1, clr.h - 1, 10); ctx.stroke();
    ctx.textAlign = 'left';
    ctx.fillStyle = '#B0584A';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.fillText('清空存档', clr.x + 18, clr.y + 24);
    ctx.fillStyle = '#96736B';
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText('重置游戏至初始状态', clr.x + 18, clr.y + 42);
    // 右侧红色小钮「清空」（64×30，与滑块开关同一垂直中线）
    var bx = clr.x + clr.w - 18 - 64, by = clr.y + 13;
    var bgc = ctx.createLinearGradient(0, by, 0, by + 30);
    bgc.addColorStop(0, '#D0685A'); bgc.addColorStop(1, '#A8443A');
    ctx.fillStyle = bgc;
    roundRect(bx, by, 64, 30, 15); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1.5;
    roundRect(bx + 0.5, by + 0.5, 63, 29, 14.5); ctx.stroke();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('清空', bx + 32, by + 16);
    ctx.textBaseline = 'alphabetic';
  }
  // v317 清空存档二级确认（危险操作）：设置面板之上再叠一层，几何走 layout.setClearRect 系
  function drawSetClear() {
    var cr = MG.layout.setClearRect();
    panel(cr.x, cr.y, cr.w, cr.h, 14, 0.97);
    drawPanelHeader('清空存档', cr, MG.layout.setClearCloseRect(), function () {
      ctx.save(); ctx.scale(0.667, 0.667); setIconTrash(ctx); ctx.restore();
    }, '#B0584A');
    // 说明（两行左对齐小字：清空结果 + 无法撤销警示）
    ctx.textAlign = 'left';
    ctx.fillStyle = '#4A7FA0';
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillText('将清空全部存档，游戏恢复初始状态。', cr.x + 24, cr.y + 64);
    ctx.fillStyle = '#B0584A';
    ctx.fillText('此操作无法撤销。', cr.x + 24, cr.y + 84);
    // 两钮横排：取消（白底蓝描边，轻）/ 确认清空（红渐变，主）
    var labels = ['取消', '确认清空'];
    ctx.font = 'bold 16px system-ui, sans-serif';
    for (var ci = 0; ci < 2; ci++) {
      var br = MG.layout.setClearBtnRect(ci);
      if (ci === 1) {
        var rg = ctx.createLinearGradient(0, br.y, 0, br.y + br.h);
        rg.addColorStop(0, '#D0685A'); rg.addColorStop(1, '#A8443A');
        ctx.fillStyle = rg;
        roundRect(br.x, br.y, br.w, br.h, br.h / 2); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1.5;
        roundRect(br.x + 0.5, br.y + 0.5, br.w - 1, br.h - 1, br.h / 2 - 0.5); ctx.stroke();
        ctx.fillStyle = '#FFFFFF';
      } else {
        ctx.fillStyle = '#FFFFFF';
        roundRect(br.x, br.y, br.w, br.h, br.h / 2); ctx.fill();
        ctx.strokeStyle = '#2E86B4'; ctx.lineWidth = 1.5;
        roundRect(br.x + 0.5, br.y + 0.5, br.w - 1, br.h - 1, br.h / 2 - 0.5); ctx.stroke();
        ctx.fillStyle = '#2E86B4';
      }
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(labels[ci], br.x + br.w / 2, br.y + br.h / 2 + 1);
      ctx.textBaseline = 'alphabetic';
    }
    ctx.textAlign = 'center';
  }
  // 第一排圆钮统一样式（v196 建；★ v199 改：accent 实底 + 白细内环 + 白图标）
  // 用户："设置的图标太难看了，也不协调"——旧为白 0.85 底 + accent 2px 环，细彩线图标
  //   压白底，在 HUD 一众粗元素里发虚；现改"彩底 + 白图标"，与底部道具钮（drawCircleBtn
  //   彩底白图标）同一绘制语言。v197 起唯一调用方 = drawSetBtn（奖杯/音量钮已移除）
  function drawRowBtn(c, accent) {
    var s = c.pressT > 0 ? 1 - 0.1 * (c.pressT / 0.16) : 1;
    ctx.save();
    ctx.translate(c.cx, c.cy);
    ctx.scale(s, s);
    ctx.fillStyle = accent;
    ctx.beginPath(); ctx.arc(0, 0, c.r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, 0, c.r - 1.5, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
  // 潮汐计时器（v202 重设计：灵动·动态，文本与动画合为一体）——整卡即动画：全宽双层流动
  // 水波（迷你海平面随真实 tide.progress 升降，振幅随时间呼吸、涨潮更汹涌、上浮气泡），文字
  // 「潮汐/涨潮 Ns」直接叠在水波之上（白光晕保证可读），倒计时数字轻微脉冲缩放；预警/涨潮
  // 时卡体辉光呼吸、文字随相位脉冲变色。
  // 潮汐计时器（v202 起重设计；v207 协调化）：接入本游戏既有视觉语言——
  // ① 文字＝白描边+深海蓝填充（与分数/统计/计时同款 strokeText+fillText）；
  // ② 水波＝当前海域深水色 C.seaStages[cur].bg[3]（与海域进度条填充同源）；
  // ③ 边框＝白描边（与海域进度条白底轨道同族），预警/涨潮辉光呼吸。
  function drawTideTimer() {
    if (!tide) return;
    var tp = MG.layout.hud.tidePill;
    var ty = tp.ty, th = tp.th;                         // 高度/上沿引 layout；左右锚定由 side 决定
    var active = tide.phase === 'active';
    var warn = !active && tide.timer <= C.tide.warnTime;
    var pulse = 0.5 + 0.5 * Math.sin(time * 6);          // 快脉冲（描边/文字）
    var breath = Math.sin(time * 1.6);                   // 慢呼吸（振幅/辉光）
    function hexA(hex, a) {
      var n = parseInt(hex.slice(1), 16);
      return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
    }

    // 量文本：标签固定 2 字、数字恒 2 位（潮汐间隔 ≤ 40s）。
    // 卡宽按「最大情况」固定（标签 + 间距 + 2 位数的 '99s'），文本仅在卡内居中——
    // 文字变短只影响文字本身，卡宽与位置恒定，不再抖动。
    var label = active ? '涨潮' : '潮汐';
    var ns = Math.ceil(tide.timer) + 's';    // 文本居中，不补空格
    ctx.textAlign = 'left';
    var lw = measureInk('bold 15px system-ui, sans-serif', label).w;      // v300：恒等变换下测量
    var nw = measureInk('bold 22px system-ui, sans-serif', ns).w;         // 当前数字宽度（仅用于卡内居中定位）
    var gap = 5;
    var maxNumW = measureInk('bold 22px system-ui, sans-serif', '99s').w; // 2 位数最大宽，作为固定基准
    var textW = lw + gap + nw;                           // 当前文本宽（仅用于卡内居中定位）
    var fixedTextW = lw + gap + maxNumW;                 // 固定文本区宽
    var padX = 16, cw = fixedTextW + padX * 2;           // 卡宽固定
    var tx = (tp.side === 'right') ? (C.W - tp.margin - cw) : tp.margin; // 右锚定（margin 留白）
    var midY = ty + th / 2;

    var wTop = ty + 6, wBot = ty + th;   // 水波底直接贴元素底边（v205+ 去除底部空隙）

    // 卡体：仅描边（未填充区透明，露游戏背景；v204 要求）——白描边同族；预警/涨潮辉光呼吸
    // （active 白光、warn 橙光呼应预警文字；不另造水色，水色统一为游戏海色）
    if (warn || active) {
      ctx.save();
      ctx.shadowColor = warn ? 'rgba(214,96,40,0.5)' : 'rgba(255,255,255,0.6)';
      ctx.shadowBlur = 9 + pulse * 8;
    }
    ctx.strokeStyle = (warn || active) ? 'rgba(255,255,255,' + (0.6 + pulse * 0.3) + ')'
      : 'rgba(255,255,255,0.4)';
    ctx.lineWidth = (warn || active) ? 1.8 : 1.3;
    roundRect(tx + 0.9, ty + 0.9, cw - 1.8, th - 1.8, 14); ctx.stroke();
    if (warn || active) ctx.restore();

    // 动态水波：与画面潮水完全同源——潮水=「海域色加深一档」（deepenHex，否则与背景 bg[3]
    // 同色隐形），计时器水波随之同步加深；v231 起海域换色过渡期与背景同一套 seaBlend 插值。
    // 前层（贴水面可见）= 潮水表层色 deepen 0.25；后层 = 潮水深处色 deepen 0.55。
    // 透明度结构不变（仅靠 alpha 区分层内前后），idle/active/warn 水色一致。
    var seaC = seaStageNow().st.bg[3];
    var backC = deepenHex(seaC, 0.55), frontC = deepenHex(seaC, 0.25);
    var frontA = warn ? 0.55 : (active ? 0.62 : 0.46);
    var backA = warn ? 0.32 : (active ? 0.34 : 0.26);
    var level = wBot - (wBot - wTop) * Math.max(0, Math.min(1, tide.progress));
    var amp = 3 + breath * 1.3 + (active ? 2 : 0) + (warn ? pulse * 2.0 : 0); // 振幅呼吸
    var spd = active ? 3.4 : 1.7;                                       // 流速：涨潮更快
    ctx.save();
    roundRect(tx + 1, ty + 1, cw - 2, th - 2, 13); ctx.clip();
    // 后层（慢、浅、大振幅）
    ctx.fillStyle = hexA(backC, backA);
    ctx.beginPath(); ctx.moveTo(tx, wBot);
    for (var i = 0; i <= cw; i += 3) {
      ctx.lineTo(tx + i, level + Math.sin((i / cw) * Math.PI * 2 - time * spd * 0.6) * amp * 0.8);
    }
    ctx.lineTo(tx + cw, wBot); ctx.closePath(); ctx.fill();
    // 前层（快、饱和、白高光）
    ctx.fillStyle = hexA(frontC, frontA);
    ctx.beginPath(); ctx.moveTo(tx, wBot);
    for (var k = 0; k <= cw; k += 3) {
      ctx.lineTo(tx + k, level + Math.sin((k / cw) * Math.PI * 3 + time * spd) * amp);
    }
    ctx.lineTo(tx + cw, wBot); ctx.closePath(); ctx.fill();
    // 波纹高光线
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (var j = 0; j <= cw; j += 3) {
      var wy = level + Math.sin((j / cw) * Math.PI * 3 + time * spd) * amp;
      if (j === 0) ctx.moveTo(tx + j, wy); else ctx.lineTo(tx + j, wy);
    }
    ctx.stroke();
    // 涨潮/预警时上浮小气泡（灵动点缀）
    if (active || warn) {
      ctx.fillStyle = 'rgba(255,255,255,' + (0.3 + pulse * 0.3) + ')';
      for (var b = 0; b < 3; b++) {
        var bxp = tx + 10 + ((b * 37 + time * 14) % (cw - 20));
        var byp = wBot - 6 - ((time * (12 + b * 4) + b * 22) % (th - 16));
        ctx.beginPath(); ctx.arc(bxp, byp, 1.6, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();

    // 文本：白描边（同 HUD 分数/统计/计时）+ 深海蓝填充，叠在水波之上；「标签 + 秒数」整体居中于卡内。
    var sx = tx + (cw - textW) / 2;
    ctx.lineJoin = 'round';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.fillStyle = warn ? '#C8501E' : '#12517E';
    // v300：像素框补偿统一在 alphabetic 基线语义下进行——规范里 actualBoundingBoxAscent/Descent
    // 是相对"当前对齐基线"的，个别引擎无论设什么都按 alphabetic 返回；固定 alphabetic 后
    // 「墨心 = 基线 - (asc-desc)/2」的补偿公式跨引擎一致，消除文字与读秒对不齐的隐患
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    // 标签（v286：真·垂直居中——middle 基线按 em 盒取中，中文与数字字形偏差方向不同，
    // 用户："倒计时读秒比潮汐二字靠下"；改按各自字形像素框补偿，两段视觉中心都对齐 midY）
    var lm = measureInk('bold 15px system-ui, sans-serif', label);
    // v301 补充：不支持 actualBoundingBox 的内核（微信部分基础库实测不支持）回退不能取
    // midY——alphabetic 基线压在中线会把整行墨迹顶进上半格（用户真机实测"偏上"）。
    // 按典型墨迹比例给常数：中文墨心 ≈ 基线上方 0.40em、数字（含小写 s）≈ 0.35em
    var lBase = lm.has ? midY + (lm.a - lm.d) / 2 : midY + 15 * 0.40;
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.strokeText(label, sx, lBase); ctx.fillText(label, sx, lBase);
    // 倒计时数字（紧跟标签，整体居中；脉冲缩放；同像素框补偿，视觉中心与标签对齐）
    var sc = 1 + (warn || active ? pulse * 0.06 : 0);
    var nm = measureInk('bold 22px system-ui, sans-serif', ns);
    var nBase = nm.has ? midY + (nm.a - nm.d) / 2 : midY + 22 * 0.35;
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.save();
    ctx.translate(sx + lw + gap + nw / 2, midY);
    ctx.scale(sc, sc);
    var ndy = (nBase - midY) / sc;   // 缩放后仍落在同一视觉中心
    ctx.strokeText(ns, -nw / 2, ndy); ctx.fillText(ns, -nw / 2, ndy);
    ctx.restore();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }
  // v276：深渊潜航/每日挑战局信息芯片——与潮汐计时器完全对称的"孪生"元素。
  // 潮汐卡在右、本卡在左：同一 ty/th/margin 真源、同款"透明卡体+白描边+卡内海水波+白描边文字"
  // 绘制语言。所有模式目标=到达最深的海洋：主行=词缀名+完成海域百分比（最深海 100% 转金），
  // 第二行小字=完整增益（desc；v281 起无得分倍率）；水位即海域进度。
  function drawChalChip() {
    if (!ng || !ng.active) return;
    // v276：所有模式的目标 = 到达最深的海洋（用户）。主行 = 词缀名 + 完成海域百分比
    // （v355 起 = 当前分数在「到达最深海域所需分组」中的位置，档内按分数连续插值，见 systems.seaProgress）；
    // 第二行小字 = 完整增益（与词缀卡介绍一致：desc；v281 起无得分倍率）。两行水平居中、垂直均匀分布。
    var name, pctStr, sub, gold, prog;
    name = ng.active.name;
    // v355：进度引 systems.seaProgress() 唯一真源 = 当前分数在「到达最深海域所需分组」中的位置
    // （每跨过一个海域分组占一档、档内按分数线性插值），不再用 v277 的海域序号粗分档
    // （旧式只在跨档瞬间跳 1/7，一整局可能纹丝不动）。到达最深海域 = 100%，即任务完成。
    prog = seaProgress();
    pctStr = Math.round(prog * 100) + '%';
    gold = prog >= 1;
    sub = ng.active.desc + (ng.active.mult ? ' · 得分 ×' + ng.active.mult : '');
    // 几何镜像潮汐卡：同一行（ty/th 引同一 layout 真源），右锚定→左锚定、margin 相同
    var tp = MG.layout.hud.tidePill;
    var ty = tp.ty, th = tp.th;
    ctx.textAlign = 'left';
    var nw1 = measureInk('bold 16px system-ui, sans-serif', name).w;   // v300：恒等变换下测量
    var pw1 = measureInk('bold 16px system-ui, sans-serif', pctStr).w;
    var gap1 = 7, padX = 14;
    var l1w = nw1 + gap1 + pw1;
    var sw1 = measureInk('11px system-ui, sans-serif', sub).w;
    var cw = padX * 2 + Math.max(l1w, sw1);
    var tx = tp.margin;
    var cx0 = tx + cw / 2;
    // v277：两行垂直分散对齐、均匀分布——按两行行高把卡内剩余空间三等分
    var lh1 = 16, lh2 = 11, vgap = (th - lh1 - lh2) / 3;
    var y1 = ty + vgap + lh1 / 2, y2 = ty + vgap * 2 + lh1 + lh2 / 2;
    var pulse = 0.5 + 0.5 * Math.sin(time * 6);
    var breath = Math.sin(time * 1.6);
    function hexA(hex, a) {
      var n = parseInt(hex.slice(1), 16);
      return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
    }
    // 卡体：透明底 + 白描边（同潮汐卡）；达成态金辉光呼吸
    if (gold) {
      ctx.save();
      ctx.shadowColor = 'rgba(245,197,66,' + (0.5 + pulse * 0.25).toFixed(2) + ')';
      ctx.shadowBlur = 9 + pulse * 7;
    }
    ctx.strokeStyle = gold ? 'rgba(255,236,170,' + (0.75 + pulse * 0.25).toFixed(2) + ')' : 'rgba(255,255,255,0.4)';
    ctx.lineWidth = gold ? 1.8 : 1.3;
    roundRect(tx + 0.9, ty + 0.9, cw - 1.8, th - 1.8, 14); ctx.stroke();
    if (gold) ctx.restore();
    // 卡内海水：与潮汐卡同一片海（seaStageNow 深水色），水位 = 挑战进度；
    // v277：进度 100% 后为满池静水——纯色填满，不再画海浪
    var seaC = seaStageNow().st.bg[3];
    var backC = deepenHex(seaC, 0.55), frontC = deepenHex(seaC, 0.25);
    var wTop = ty + 6, wBot = ty + th;
    var level = wBot - (wBot - wTop) * prog;
    var amp = 2.6 + breath * 1.1 + (gold ? pulse * 1.6 : 0);
    var spd = gold ? 3.2 : 1.9;
    ctx.save();
    roundRect(tx + 1, ty + 1, cw - 2, th - 2, 13); ctx.clip();
    if (prog >= 1) {
      ctx.fillStyle = hexA(frontC, 0.5);
      ctx.fillRect(tx, ty, cw, th);
    } else {
    ctx.fillStyle = hexA(backC, 0.28);
    ctx.beginPath(); ctx.moveTo(tx, wBot);
    for (var i = 0; i <= cw; i += 3) {
      ctx.lineTo(tx + i, level + Math.sin((i / cw) * Math.PI * 2 - time * spd * 0.6) * amp * 0.8);
    }
    ctx.lineTo(tx + cw, wBot); ctx.closePath(); ctx.fill();
    ctx.fillStyle = hexA(frontC, gold ? 0.5 : 0.42);
    ctx.beginPath(); ctx.moveTo(tx, wBot);
    for (var k2 = 0; k2 <= cw; k2 += 3) {
      ctx.lineTo(tx + k2, level + Math.sin((k2 / cw) * Math.PI * 3 + time * spd) * amp);
    }
    ctx.lineTo(tx + cw, wBot); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (var j = 0; j <= cw; j += 3) {
      var wy = level + Math.sin((j / cw) * Math.PI * 3 + time * spd) * amp;
      if (j === 0) ctx.moveTo(tx + j, wy); else ctx.lineTo(tx + j, wy);
    }
    ctx.stroke();
    }
    ctx.restore();
    // 文本：主行（名称+海域百分比）白描边+深海蓝、水平居中；小字行（完整增益）居中；最深海转金
    // v300：微信基础库无像素框 API 且 middle 的 em 盒会让数字比中文低（v286 用户实测）——
    // 改 alphabetic + 排印常数：中文墨心 ≈ 基线上 0.40em、数字 ≈ 0.35em、混排行 ≈ 0.38em
    ctx.lineJoin = 'round';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.fillStyle = gold ? '#B8860B' : '#12517E';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    var nameBase = y1 + 16 * 0.40, pctBase = y1 + 16 * 0.35;
    var nameX = cx0 - l1w / 2 + nw1 / 2;
    var pctX = cx0 + l1w / 2 - pw1 / 2;
    ctx.strokeText(name, nameX, nameBase); ctx.fillText(name, nameX, nameBase);
    ctx.strokeText(pctStr, pctX, pctBase); ctx.fillText(pctStr, pctX, pctBase);
    ctx.lineWidth = 2.5;
    ctx.fillStyle = gold ? '#9A7420' : '#4A7FA0';
    ctx.font = '11px system-ui, sans-serif';
    var subBase = y2 + 11 * 0.38;
    ctx.strokeText(sub, cx0, subBase); ctx.fillText(sub, cx0, subBase);
    ctx.textBaseline = 'alphabetic';
  }
  // 涨潮横幅
  function drawTideBanner() {
    if (tide.banner <= 0) return;
    var t = tide.banner / 2.4; // 1 → 0
    var a = t < 0.2 ? t / 0.2 : (t > 0.85 ? (1 - t) / 0.15 : 1);
    var scale = 1 + (1 - t) * 0.15;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.textAlign = 'center';
    ctx.translate(C.W / 2, MG.layout.body.mirrorCy); // v190：涨潮横幅锚堆叠区镜像位（出生区相对警戒线的镜像）
    ctx.scale(scale, scale);
    ctx.font = 'bold 43px system-ui, sans-serif';
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 6;
    ctx.strokeText('涨 潮', 0, 0);
    ctx.fillStyle = '#12517E'; // 与潮汐计时器「涨潮」文字同色（v227：撤自造渐变 #3FA9E0→#155A8A，统一不自造色）
    ctx.fillText('涨 潮', 0, 0);
    ctx.restore();
  }

  // ---------- 顶部中央计时：本局已进行时长 ----------

  // ---------- 重开确认弹窗 ----------
  // v273 灵动化（用户："重开的弹出页签样式太生硬了"）：① 弹性入场 easeOutBack
  // （0.85→1 过冲回弹）+ 淡入；② 整卡 ±2px 慢呼吸浮动；③ 页头标题左侧加圆形图标
  // （白色循环箭头，与"重新开始"语义呼应）；④ 三按钮加手绘小图标（主页/循环/返回）。
  function drawConfirm() {
    // 压暗背景已上移 drawPanelFx 统一绘制（v275）
    // v276：删整卡慢呼吸浮动（用户："页签好像会动"，弹层应静止）；页头图标改与重开按钮
    // 同款白色弧形循环箭头（accent 同按钮色 #5E90B4）；按钮去手绘小图标，主次分明重设计
    // v299：去标题行与 ✕（用户："这两个页签可以不要标题行吧"）——三按钮放大（42→46 高）、
    // 间距拉开（12→14），面板高度 224→200；关闭走「返回游戏」按钮（✕ 命中也一并移除）
    var cr = MG.layout.confirmRect();
    ctx.save();
    panel(cr.x, cr.y, cr.w, cr.h, 14, 0.97);
    // v300：恢复标题栏（用户："返回、结算页签还是恢复标题栏吧"）——页头图标仍与重开按钮
    // 同款白色循环箭头（v283 比例：scale 0.6），✕ 关闭同步恢复（systems 命中已加回）
    drawPanelHeader('重新开始', cr, MG.layout.confirmCloseRect(), function () {
      ctx.save(); ctx.scale(0.6, 0.6);
      ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, 9, -Math.PI * 0.35, Math.PI * 1.25); ctx.stroke();
      var ax = Math.cos(-Math.PI * 0.35) * 9, ay = Math.sin(-Math.PI * 0.35) * 9;
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.moveTo(ax + 5.5, ay - 1);
      ctx.lineTo(ax - 4.5, ay - 3);
      ctx.lineTo(ax + 1, ay + 6.5);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }, '#5E90B4');
    // 三按钮纵排（v279：三档视觉——重新开始=深蓝渐变胶囊（主）/ 返回主页=白底蓝描边（轻）/
    // 返回游戏=灰蓝实底胶囊（中），背景区分度拉满（用户：太相似））
    // 返回主页 / 重新开始 / 返回游戏，几何走 layout.confirmBtnRect（命中不变）
    var labels = ['返回主页', '重新开始', '返回游戏'];
    ctx.font = 'bold 18px system-ui, sans-serif';
    for (var ci = 0; ci < 3; ci++) {
      var br = MG.layout.confirmBtnRect(ci);
      if (ci === 1) {
        var bg = ctx.createLinearGradient(0, br.y, 0, br.y + br.h);
        bg.addColorStop(0, '#3B9BD0'); bg.addColorStop(1, '#2578A8');
        ctx.fillStyle = bg;
        roundRect(br.x, br.y, br.w, br.h, br.h / 2); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1.5;
        roundRect(br.x + 0.5, br.y + 0.5, br.w - 1, br.h - 1, br.h / 2 - 0.5); ctx.stroke();
        ctx.fillStyle = '#FFFFFF';
      } else if (ci === 2) {
        var rg = ctx.createLinearGradient(0, br.y, 0, br.y + br.h);
        rg.addColorStop(0, '#93AEBF'); rg.addColorStop(1, '#6E88A0');
        ctx.fillStyle = rg;
        roundRect(br.x, br.y, br.w, br.h, br.h / 2); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.5;
        roundRect(br.x + 0.5, br.y + 0.5, br.w - 1, br.h - 1, br.h / 2 - 0.5); ctx.stroke();
        ctx.fillStyle = '#FFFFFF';
      } else {
        ctx.fillStyle = '#FFFFFF';
        roundRect(br.x, br.y, br.w, br.h, br.h / 2); ctx.fill();
        ctx.strokeStyle = '#2E86B4'; ctx.lineWidth = 1.5;
        roundRect(br.x + 0.5, br.y + 0.5, br.w - 1, br.h - 1, br.h / 2 - 0.5); ctx.stroke();
        ctx.fillStyle = '#2E86B4';
      }
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(labels[ci], br.x + br.w / 2, br.y + br.h / 2 + 1);
      ctx.textBaseline = 'alphabetic';
    }
    ctx.textAlign = 'center';
    ctx.restore();
  }

  // 任务卡（v195 重设计，用户："尤其是任务元素（太丑了，请重新设计），让效果更好更合理"）：
  // 旧 205×35 条里塞两行 15/13px 字 → 白底圆角卡 285×60：金色靶心图标 + 标题/星级
  // + 金色进度条（have/need 白字描边骑条居中）+ 奖励；几何全部引 layout.hud.quest
  // v202：任务元素整体隐藏（用户"先隐藏掉任务元素"），仅保留下方潮汐计时器与海域进度条；
  // questHidden 为开关，置 false 即恢复任务卡。潮汐/海域进度条绘制已移出本函数（见帧绘制）。
  var questHidden = true;
  function drawQuest() {
    if (!quest || questHidden) return;
    ctx.save();
    ctx.textAlign = 'center';
    var q = MG.layout.hud.quest;
    var qw = q.qw, qx = q.qx, qy = q.qy, qh = q.qh;
    // 卡体：白底 + 淡蓝描边（与潮汐卡同款，两卡并排同高）
    ctx.fillStyle = 'rgba(255,255,255,0.66)';
    roundRect(qx, qy, qw, qh, 14); ctx.fill();
    ctx.strokeStyle = 'rgba(90,140,180,0.28)'; ctx.lineWidth = 1;
    roundRect(qx + 0.5, qy + 0.5, qw - 1, qh - 1, 14); ctx.stroke();
    // 靶心图标（左）：金圆 + 白色同心环 + 圆心点
    var icx = qx + 25, icy = qy + 30;
    ctx.fillStyle = '#F5C542';
    ctx.beginPath(); ctx.arc(icx, icy, 15, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 1.8; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.arc(icx, icy, 7, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath(); ctx.arc(icx, icy, 2.6, 0, Math.PI * 2); ctx.fill();
    // 标题行：任务名（左，超宽自适应缩字号）+ 星级（右）
    ctx.textAlign = 'left';
    ctx.fillStyle = '#7A5B10';
    var tf = 15;
    ctx.font = 'bold ' + tf + 'px system-ui, sans-serif';
    while (tf > 12 && ctx.measureText(quest.text).width > 170) { // 右端让位星级(≈40px)，不重叠
      tf--;
      ctx.font = 'bold ' + tf + 'px system-ui, sans-serif';
    }
    ctx.fillText(quest.text, qx + 50, qy + 25);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#B8860B';
    ctx.font = '12px system-ui, sans-serif';
    var stars = '★★★'.slice(0, quest.stars || 1);
    ctx.fillText(stars, qx + qw - 15, qy + 25);
    // 进度条（金）+ have/need 骑条 + 奖励
    var prog = Math.min(1, quest.have / quest.need);
    var bx = qx + 50, bw = 170, by = qy + 35, bh = 10;
    ctx.fillStyle = 'rgba(46,134,180,0.12)';
    roundRect(bx, by, bw, bh, 5); ctx.fill();
    if (prog > 0) {
      ctx.fillStyle = '#F5C542';
      roundRect(bx + 1, by + 1, Math.max(8, (bw - 2) * prog), bh - 2, 4); ctx.fill();
    }
    ctx.textAlign = 'center';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(60,40,5,0.45)'; ctx.lineJoin = 'round';
    var hn = quest.have + '/' + quest.need;
    ctx.strokeText(hn, bx + bw / 2, by + 8);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(hn, bx + bw / 2, by + 8);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#B8860B';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.fillText('+' + quest.rewardScore + ' 分', bx + bw + 6, by + 10);
    ctx.restore();
  }
  // 差额分精简：≥1万 缩写为「X万」（省字符，条内不挤）
  function fmtDiff(n) {
    if (n < 10000) return String(n);
    var w = n / 10000;
    return (w >= 10 ? Math.round(w) : Math.round(w * 10) / 10) + '万';
  }
  // hex → rgba 字符串（潮水水体同源海域色用；drawTideTimer 内另有局部 hexA）
  function hexToRgba(hex, a) {
    var n = parseInt(hex.slice(1), 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }
  // 海域色加深：向深海蓝(#0A2E4E，与各海域 shade 同方向)混合 k。
  // 潮水必须比背景深才可见——背景渐变底色就是 bg[3]（render 背景层），直接用 bg[3] 会与背景同色隐形；
  // 加深后色相仍由当前海域色主导（随海域变），只是压暗到可辨识。
  // 经 parseCol 解析：'#RRGGBB' 与海域换色过渡期产生的 'rgba(...)' 串都支持。
  function deepenHex(col, k) {
    var c = parseCol(col);
    var r = Math.round(c[0] + (10 - c[0]) * k);
    var g = Math.round(c[1] + (46 - c[1]) * k);
    var b = Math.round(c[2] + (78 - c[2]) * k);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }
  // 当前海域阶段（含换色过渡）：跨里程碑 1.8s 内与背景同一套 seaBlend 插值——
  // 供潮水/潮汐计时器等"水色"消费方使用，切海域时水色随背景一起渐变，不再瞬间跳变。
  // 返回 { st: 海域阶段对象(bg 在过渡期是 rgba 串), ck: 过渡期缓存键(量化 1/24，防渐变缓存串色) }
  function seaStageNow() {
    var stg = seaStage(), sb = seaBlend();
    if (!sb) return { st: C.seaStages[stg], ck: '' + stg };
    var sA = C.seaStages[sb.from], sB = C.seaStages[sb.to], k = sb.k;
    return {
      st: {
        bg: [mixCol(sA.bg[0], sB.bg[0], k), mixCol(sA.bg[1], sB.bg[1], k), mixCol(sA.bg[2], sB.bg[2], k), mixCol(sA.bg[3], sB.bg[3], k)],
        shade: mixCol(sA.shade, sB.shade, k)
      },
      ck: 'B' + sb.from + '_' + sb.to + '_' + Math.round(k * 24)
    };
  }
  // 海域色作文字色：压暗 20% 保证 13px 小字在浅色条底上的对比度（浅色海域尤其需要）
  function seaTextColor(hex) {
    var n = parseInt(hex.slice(1), 16);
    var r = Math.round(((n >> 16) & 255) * 0.8), g = Math.round(((n >> 8) & 255) * 0.8), b = Math.round((n & 255) * 0.8);
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }
  // 海域进度条：宽松段（当前得分下方、任务条同排区之上；容器开口在条下方 79+dy 空隙）
  // 出生点在条下方，条不压坠落区），显示累计分距下一海域的进度
  // 配色：填充=当前海域深水色（与背景同族），右端小圆点=下一海域徽章色（目的地），左端骑线徽章=当前位置
  function drawSeaProgress() {
    var cur = seaStage(), ts = totalScore();
    var last = C.seaStages.length - 1;
    var maxed = cur >= last;
    var sb = MG.layout.hud.seaBar;
    var sx = sb.sx, sy = sb.sy, sw = sb.sw, sh = sb.sh; // 两侧各留 25：端点徽章圆心压边距线（v284 定版）
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    roundRect(sx, sy, sw, sh, 8); ctx.fill();
    var frac = 1;
    if (!maxed) {
      var lo = C.seaStages[cur].at, hi = C.seaStages[cur + 1].at;
      // v277：去掉 0.02 下限钳制——0 分时进度就是 0%（此前被钳成 2%）
      frac = Math.min(1, Math.max(0, (ts - lo) / (hi - lo)));
    }
    if (frac > 0) {
      // 填充=当前海域的深水色（bg[3]，与当前背景同族不撞色）；目的地用右端下一海域色小圆点表达
      ctx.fillStyle = maxed ? SEA_BADGES[last].c : C.seaStages[cur].bg[3];
      ctx.globalAlpha = 0.85;
      roundRect(sx + 2, sy + 2, Math.max(10, (sw - 4) * frac), sh - 4, 6); ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    // 三段式（v223 用户定版）：左=当前海域（贴左徽章）· 中=完成度% · 右=下一海域（贴右徽章）。
    // 文字与两端徽章语义对齐：左徽章=当前位置、右徽章=目的地；maxed 时右段显示「已达最深」。
    var DEEP = '#2C5A78';
    var GRAY = '#66788A';   // 下一海域：尚未抵达，统一灰调（不预先着色）
    var pct = maxed ? 100 : Math.round(frac * 100);
    var leftSeg = [C.seaStages[cur].name, seaTextColor(SEA_BADGES[cur].c)];
    var midSeg = [pct + '%', DEEP];
    var rightSeg = maxed ? ['已达最深', GRAY] : [C.seaStages[cur + 1].name, GRAY];
    // 徽章让位：两端徽章(r15)骑在条端点上，文字各内缩 26
    var lx = sx + 26, rx = sx + sw - 26;
    var cxBar = sx + sw / 2;
    // 超长自适应缩字号：① 三段总宽放得进可用区；② 百分比固定条正中后，
    // 与左/右海域名之间各留 ≥5px（v284：中段不再"避让式"浮动，严格水平居中）
    var lw2, mw2, rw2;
    var measure3 = function () {
      var f = 'bold ' + lf + 'px system-ui, sans-serif'; // v300：恒等变换下测量
      lw2 = measureInk(f, leftSeg[0]).w;
      mw2 = measureInk(f, midSeg[0]).w;
      rw2 = measureInk(f, rightSeg[0]).w;
    };
    var lf = 13;
    measure3();
    while (lf > 10 && (lw2 + mw2 + rw2 > (rx - lx) - 16 ||
          (cxBar - mw2 / 2) - (lx + lw2) < 5 || (rx - rw2) - (cxBar + mw2 / 2) < 5)) {
      lf--;
      ctx.font = 'bold ' + lf + 'px system-ui, sans-serif';
      measure3();
    }
    // 真·垂直居中：按中文实际像素框算 baseline（textBaseline='middle' 对中文会视觉偏高 1~2px）
    var probe = measureInk('bold ' + lf + 'px system-ui, sans-serif', leftSeg[0]);
    var cyT, vBase;
    if (probe.has) {
      cyT = sy + (sh - (probe.a + probe.d)) / 2 + probe.a;
      vBase = 'alphabetic';
    } else {
      // v300：无像素框 API 的内核（微信）也统一 alphabetic + 排印常数（CJK 墨心 ≈ 基线上 0.39em），
      // 不再退 middle（em 盒中心与视觉中心有差，真机上偏上）
      cyT = sy + (sh - lf * 0.90) / 2 + lf * 0.84;
      vBase = 'alphabetic';
    }
    ctx.save();
    ctx.textBaseline = vBase;
    // 左段（左锚）
    ctx.textAlign = 'left';
    ctx.strokeText(leftSeg[0], lx, cyT);
    ctx.fillStyle = leftSeg[1]; ctx.fillText(leftSeg[0], lx, cyT);
    // 右段（右锚）
    ctx.textAlign = 'right';
    ctx.strokeText(rightSeg[0], rx, cyT);
    ctx.fillStyle = rightSeg[1]; ctx.fillText(rightSeg[0], rx, cyT);
    // 中段：百分比固定在条正中（v284 用户："百分比应当水平居中"）
    ctx.textAlign = 'center';
    ctx.strokeText(midSeg[0], cxBar, cyT);
    ctx.fillStyle = midSeg[1]; ctx.fillText(midSeg[0], cxBar, cyT);
    ctx.restore();
    if (!maxed) {
      // 右端终点标记（v286：半径 15→12，用户"图标有点太大"——圆心仍压条端点=25 边距线，
      // r12 直径 24 恰好与条身高一致，仍能盖住条端；圆心压边距线是用户定版）
      drawSeaBadge(cur + 1, sx + sw, sy + sh / 2, false, true, 12);
    }
    // 左端徽章标注"当前位置"（v286：同上，r12）
    drawSeaBadge(cur, sx, sy + sh / 2, true, false, 12);
  }

  // ---------- 技能栏 ----------
  function drawSkillIcon(key, cx, cy, color) {
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    if (key === 'swap') {
      ctx.beginPath();
      ctx.moveTo(cx - 9, cy - 4); ctx.lineTo(cx + 7, cy - 4);
      ctx.moveTo(cx + 3, cy - 8); ctx.lineTo(cx + 7, cy - 4); ctx.lineTo(cx + 3, cy);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx + 9, cy + 4); ctx.lineTo(cx - 7, cy + 4);
      ctx.moveTo(cx - 3, cy); ctx.lineTo(cx - 7, cy + 4); ctx.lineTo(cx - 3, cy + 8);
      ctx.stroke();
    } else if (key === 'ripple') {
      ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, 8, -0.5, 0.5 + Math.PI * 1.0); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, 12, -0.4, 0.4 + Math.PI * 1.2); ctx.stroke();
    } else if (key === 'evap') {
      ctx.beginPath();
      ctx.moveTo(cx, cy + 7);
      ctx.quadraticCurveTo(cx - 8, cy - 1, cx, cy - 8);
      ctx.quadraticCurveTo(cx + 8, cy - 1, cx, cy + 7);
      ctx.stroke();
    } else if (key === 'flow') {
      // 水流：两枚水滴互换（双圆 + 双弧箭头）
      ctx.beginPath(); ctx.arc(cx - 6, cy - 5, 4, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx + 6, cy + 5, 4, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - 2, cy - 10); ctx.quadraticCurveTo(cx + 9, cy - 10, cx + 10, cy - 2);
      ctx.moveTo(cx + 2, cy + 10); ctx.quadraticCurveTo(cx - 9, cy + 10, cx - 10, cy + 2);
      ctx.stroke();
    }
    ctx.lineCap = 'butt';
  }

  function drawSkillBar() {
    // 道具区不画独立背景（用户要求去掉道具区下方的色块）：按钮直接坐在全屏背景水色上，
    // 无接缝、无突兀色块，任何分辨率观感一致。
    var readyPulse = 0.5 + 0.5 * Math.sin(time * 5);

    drawCircleBtn(bookBtn, '#4A7FA0', 1, false, readyPulse);
    var bx = bookBtn.cx, by = bookBtn.cy;
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 1.8;
    ctx.strokeRect(bx - 8, by - 6, 16, 12);
    ctx.beginPath(); ctx.moveTo(bx, by - 6); ctx.lineTo(bx, by + 6); ctx.stroke();

    // v197：成就殿堂入口（奖杯）已按用户要求隐藏；设置钮移入 HUD 第一排（drawHUD 内绘制）

    // 重开按钮（↻ 循环箭头，点击弹确认）
    drawCircleBtn(restartBtn, '#5E90B4', 0.85, false, 0);
    var rx0 = restartBtn.cx, ry0 = restartBtn.cy;
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(rx0, ry0, 9, -Math.PI * 0.35, Math.PI * 1.25); ctx.stroke();
    // 箭头头部（v195：钮 r15→20，图标半径 8→9 等比放大）
    var ax = Math.cos(-Math.PI * 0.35) * 9, ay = Math.sin(-Math.PI * 0.35) * 9;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(rx0 + ax + 5.5, ry0 + ay - 1);
    ctx.lineTo(rx0 + ax - 4.5, ry0 + ay - 3);
    ctx.lineTo(rx0 + ax + 1, ry0 + ay + 6.5);
    ctx.closePath(); ctx.fill();

    // v342：充能计数角标——右上角简洁小圆牌（深蓝底 + 白数字），仅显示可用次数 q，
    // 不做金/蓝切换、不显示 ch/cost（cost=1 后无意义）
    function drawChargeBadge(btn, q) {
      var bx = btn.cx + btn.r - 2, by = btn.cy - btn.r + 2, bd = 9.5;
      ctx.beginPath(); ctx.arc(bx, by, bd, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(18,40,62,0.92)';
      ctx.fill();
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.stroke();
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.fillText('' + q, bx, by + 4.2);
      ctx.textAlign = 'left';
    }

    ctx.textAlign = 'center';
    for (var i = 0; i < SKILL_BTNS.length; i++) {
      var btn = SKILL_BTNS[i], cfg = C.skills[i];
      var unl = skillUnlocked(cfg.key); // 渐进解锁：未点亮只显示锁
      // v342：cost=1——skillCharge 即为可用次数（消除一个符文滴 = 1 次，可连放）
      var q = skillCharge[cfg.key] || 0;
      // v343：三态——未解锁=灰锁；解锁但充能 0（符文不足）=禁用态(暗灰蓝+暗图标)；充能>=1=可用态(亮蓝+白图标)
      var btnColor, btnAlpha, iconColor;
      if (!unl) { btnColor = '#7E93A3'; btnAlpha = 0.4; iconColor = null; }
      else if (q >= 1) { btnColor = '#3E8DB5'; btnAlpha = 1; iconColor = '#FFFFFF'; }
      else { btnColor = '#5E7180'; btnAlpha = 0.45; iconColor = 'rgba(255,255,255,0.38)'; }
      drawCircleBtn(btn, btnColor, btnAlpha, false, 0);
      if (!unl) {
        // 锁图标（小挂锁）
        ctx.strokeStyle = 'rgba(255,255,255,0.9)';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(btn.cx, btn.cy - 9, 4.5, Math.PI, 0); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        roundRect(btn.cx - 6.5, btn.cy - 9, 13, 10, 2); ctx.fill();
        ctx.fillStyle = 'rgba(230,242,248,0.75)';
        ctx.font = '10px system-ui, sans-serif';
        ctx.fillText('待符文', btn.cx, btn.cy + 13);
      } else {
        if (iconColor) drawSkillIcon(cfg.key, btn.cx, btn.cy, iconColor); // v342：图标垂直居中（去掉 -6 偏移）
        if (q >= 1) drawChargeBadge(btn, q); // 仅充能>=1 显示可用次数角标
      }
      if (unl && ((cfg.key === 'evap' && evapMode) || (cfg.key === 'ripple' && rippleMode) || (cfg.key === 'flow' && flowMode))) {
        // v372：激活态脉冲高亮（呼吸放大 + 透明度呼吸），配合 drawPropHint 的"再点按钮取消"提示
        var pr = (btn.r + 3) + 2 * (0.5 + 0.5 * Math.sin(time * 6));
        ctx.strokeStyle = 'rgba(226,75,74,' + (0.7 + 0.3 * Math.sin(time * 6)) + ')';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(btn.cx, btn.cy, pr, 0, Math.PI * 2); ctx.stroke();
      }
      // 名称标签：圆钮下方居中（v344：画前显式 center——drawChargeBadge 末尾改过 textAlign='left'，会污染此处对齐导致文字右偏）
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(240,250,252,0.95)';
      ctx.font = '13px system-ui, sans-serif';
      ctx.fillText(cfg.name, btn.cx, btn.cy + btn.r + 12);
    }

    // 「深渊潜航」入口已移至结算页按钮组（局内不再挂悬浮钮）
  }
  // 二周目词缀三选一弹窗
  function drawNgPick() {
    // 压暗背景已上移 drawPanelFx 统一绘制（v275）
    var nr = MG.layout.ngRect();
    var pw = nr.w, ph = nr.h, px = nr.x, py = nr.y;
    panel(px, py, pw, ph, 14, 0.97);
    // v275：页头与其他弹层同款（⚓ 图标圆 + 左对齐标题；点外关闭故无 ✕）
    drawPanelHeader('深渊潜航', nr, null, '⚓', '#6B5AA8');
    ctx.textAlign = 'center';
    ctx.font = '14px system-ui, sans-serif';
    ctx.fillStyle = '#4A7FA0';
    ctx.fillText('选一条海况词缀，立即重开一局无尽模式', C.W / 2, py + 58);
    ctx.fillStyle = '#B0584A';
    ctx.fillText(ng.active ? ('当前词缀「' + ng.active.name + '」，重新选择将替换') : '⚠ 当前局面不保留 · 词缀难度更高、得分更高', C.W / 2, py + 76);

    ngPickRects = [];
    for (var i = 0; i < ngPicks.length; i++) {
      var af = ngPicks[i];
      var ry = py + 92 + i * 74, rh = 64;
      var rect = { x: px + 20, y: ry, w: pw - 40, h: rh };
      ngPickRects.push(rect);
      ctx.fillStyle = 'rgba(107,90,168,0.12)';
      roundRect(rect.x, rect.y, rect.w, rect.h, 10); ctx.fill();
      ctx.strokeStyle = 'rgba(107,90,168,0.5)'; ctx.lineWidth = 1.5;
      roundRect(rect.x + 0.5, rect.y + 0.5, rect.w - 1, rect.h - 1, 10); ctx.stroke();
      ctx.textAlign = 'left';
      ctx.fillStyle = '#5B4A94';
      ctx.font = 'bold 19px system-ui, sans-serif';
      ctx.fillText(af.name, rect.x + 18, rect.y + 26);
      ctx.font = '14px system-ui, sans-serif';
      ctx.fillStyle = '#4A7FA0';
      ctx.fillText(af.desc, rect.x + 18, rect.y + 46);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#1E7A6F';
      ctx.font = 'bold 16px system-ui, sans-serif';
      ctx.fillText('高危挑战', rect.x + rect.w - 16, rect.y + 26);
      ctx.font = '13px system-ui, sans-serif';
      ctx.fillStyle = '#8AA5B8';
      ctx.fillText('点击出航', rect.x + rect.w - 16, rect.y + 46);
    }
    ctx.textAlign = 'center';
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillStyle = '#8AA5B8';
    ctx.fillText('点击空白处取消', C.W / 2, py + ph - 14);
  }

  function drawCircleBtn(c, color, alpha, ready, pulse) {
    var s = c.pressT > 0 ? 1 - 0.1 * (c.pressT / 0.16) : 1;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(c.cx, c.cy);
    ctx.scale(s, s);
    if (ready) {
      ctx.fillStyle = 'rgba(46,134,180,' + (0.18 + pulse * 0.14) + ')';
      ctx.beginPath(); ctx.arc(0, 0, c.r + 5 + pulse * 2, 0, Math.PI * 2); ctx.fill();
    }
    var g = grad('cb' + color + (ready ? 'r' : 'n') + c.r, function () {
      var gg = ctx.createLinearGradient(0, -c.r, 0, c.r);
      gg.addColorStop(0, color);
      gg.addColorStop(1, shade(color, ready ? -0.25 : -0.1));
      return gg;
    });
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, c.r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, 0, c.r - 0.75, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, c.r - 4, Math.PI * 1.1, Math.PI * 1.5); ctx.stroke();
    ctx.restore();
  }

  // ---------- 特效绘制 ----------
  function drawFx() {
    var i, p;
    for (i = 0; i < parts.length; i++) {
      p = parts[i];
      var a = Math.max(0, p.life / p.max);
      if (p.type === 'ring') {
        ctx.globalAlpha = a * 0.7;
        ctx.strokeStyle = p.color; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r + (p.max - p.life) * 180, 0, Math.PI * 2); ctx.stroke();
      } else if (p.type === 'suck') {
        ctx.globalAlpha = a * 0.9;
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.globalAlpha = a;
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  // v331：提示分色表（语义类别 → 颜色，用户确认 7 类方案，交互示例 test/popup_kinds_demo.html）
  var PCOLMAP = {
    gain:    '#D4A017',   // 金 — 得分微反馈（+N / 连击后缀）
    burst:   '#8E5AC8',   // 紫 — 效果生效高光（特殊滴 / 大招 / 稀有合成）
    world:   '#0E7C9E',   // 深青 — 海域与潮汐推进（演进 / 渐深 / 深海事件 / 挑战开局）
    reward:  '#1E9E6A',   // 绿 — 奖励与里程碑（图鉴 / 成就 / 任务 / 宝箱 / 复活）
    todo:    '#C9821A',   // 琥珀 — 行动提醒（点宝箱 / 预告 / 教程）
    miss:    '#9E4B47',   // 暗红 — 落空与错失（降饱和，不刺眼）
    neutral: '#6B8AA5'    // 蓝灰 — 操作反馈回执（换滴 / 交换 / 充能不足）
  };
  // 浮动文字（最后绘制，保证不被 HUD 遮挡）
  function drawPopups() {
    // v356：字号越大优先级越高 ⇒ **大字最后画**（压在小字之上，"越不容易被遮挡"）；
    // 小字先画。两趟遍历不排序、不分配数组（popups 每帧都在变，排序是纯浪费）。
    var pass, i, p;
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    for (pass = 0; pass < 2; pass++) {
      var wantBig = pass === 1;
      for (i = 0; i < popups.length; i++) {
        p = popups[i];
        if (!!p.big !== wantBig) continue;
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, p.life / p.max * 1.5));
        // v376：文本越大越靠上、越小越靠下，错开不同大小的公告，避免多条挤在同一行；
        // 大字基础 y 已贴警戒线，故只轻上移 4，小字明显下移 20，两类稳定错开约 24px 且都在线下方
        var yOff = p.big ? -4 : 20;
        ctx.translate(p.x, p.y + yOff);
        ctx.scale(p.scale * (p.baseScale || 1), p.scale * (p.baseScale || 1)); // v372：连击飘字按 baseScale 放大
        ctx.fillStyle = PCOLMAP[p.kind] || PCOLMAP.neutral;
        // v372：分数飘字随连击倍率放大（mult 即连击倍率；上限 1.7 防过大）
        var mscale = Math.min(1.7, 1 + Math.max(0, p.mult - 1) * 0.08);
        ctx.font = 'bold ' + ((p.big ? 20 : 17) * mscale) + 'px system-ui, sans-serif';
        ctx.strokeStyle = 'rgba(255,255,255,0.85)';
        ctx.lineWidth = 3;
        ctx.strokeText(p.text, 0, 0);
        ctx.fillText(p.text, 0, 0);
        if (p.mult > 1) {
          ctx.font = 'bold 18px system-ui, sans-serif';
          ctx.fillStyle = PCOLMAP.gain;
          ctx.strokeStyle = 'rgba(255,255,255,0.85)';
          ctx.lineWidth = 3;
          ctx.strokeText('连击 x' + p.mult, 0, -24);
          ctx.fillText('连击 x' + p.mult, 0, -24);
        }
        ctx.restore();
      }
    }
    ctx.globalAlpha = 1;
  }

  // v327：广告演示层 drawAdOverlay 已移除（先不做广告）

  function drawOver() {
    buildOverButtons();
    ctx.fillStyle = 'rgba(10,40,70,0.55)';
    ctx.fillRect(-BX, -renderOy, C.W + BX * 2, VH);

    // 结算海报：面板加高放宽（436→472、上移至134），统计区与按钮组均拉开呼吸感
    // 几何走 layout.overRect()（锚定游戏区焦点，块高变化不漂流；渲染与命中共用）
    var ovr = MG.layout.overRect();
    var px = ovr.x, py = ovr.y, pw = ovr.w, ph = ovr.h;
    panel(px, py, pw, ph, 16, 0.97);

    ctx.textAlign = 'center';
    // v300：恢复标题行（用户："返回、结算页签还是恢复标题栏吧"）；大分数与统计行回到原位
    ctx.fillStyle = '#155A8A';
    ctx.font = 'bold 28px system-ui, sans-serif';
    ctx.fillText('本局结束', C.W / 2, py + 46);
    ctx.font = 'bold 53px system-ui, sans-serif';
    ctx.fillStyle = '#0F4C79';
    ctx.fillText(String(score), C.W / 2, py + 104);
    ctx.font = '18px system-ui, sans-serif';
    ctx.fillStyle = '#4A7FA0';
    var isNewBest = score >= best && score > 0;
    var statusLine = doubled ? '已双倍结算'
      : (isNewBest ? '★ 新纪录！'
      : ('最佳 ' + best));
    ctx.fillText(statusLine, C.W / 2, py + 136);
    if (maxCombo > 1) {
      ctx.fillText('本局最高连击 ×' + maxCombo + (seaCount > 0 ? ' · 汇入海域 ×' + seaCount : ''), C.W / 2, py + 160);
    }
    // v276：挑战局结果行（与挑战芯片同语义：目标=到达最深海洋，显示海域进度+完整增益倍率）
    if (ng && ng.active) {
      var chalPct = Math.min(100, Math.round(seaProgress() * 100)); // v355：与芯片同真源
      var chalOk = chalPct >= 100;
      var chalText = ng.active.name + ' · 海域进度 ' + chalPct + '%' + (ng.active.mult ? ' · 得分 ×' + ng.active.mult : '');
      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.fillStyle = chalOk ? '#B8860B' : '#8AA5B8';
      ctx.fillText(chalText, C.W / 2, py + 184);
    }

    for (var i = 0; i < overButtons.length; i++) {
      var b = overButtons[i];
      if (b.primary) {
        var g = ctx.createLinearGradient(b.x, b.y, b.x, b.y + b.h);
        g.addColorStop(0, '#3B9BD0');
        g.addColorStop(1, '#2578A8');
        ctx.fillStyle = g;
      } else {
        ctx.fillStyle = '#FFFFFF';
      }
      roundRect(b.x, b.y, b.w, b.h, 12); ctx.fill();
      ctx.strokeStyle = b.primary ? 'rgba(255,255,255,0.5)' : '#2E86B4';
      ctx.lineWidth = 1.5;
      roundRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1, 12); ctx.stroke();
      ctx.fillStyle = b.primary ? '#FFFFFF' : '#2E86B4';
      ctx.font = 'bold 20px system-ui, sans-serif';
      ctx.textBaseline = 'middle';
      ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2 + 1);
      ctx.textBaseline = 'alphabetic';
    }
  }

  // ---------- 首局主动引导（前 5 投分步提示，只出现一次） ----------
  function drawTutorial() {
    if (tutDone || state !== 'play' || dexOpen || confirmOpen) return;
    var step = Math.min(dropCount, TUT_STEPS.length - 1);
    var ty = MG.layout.body.tutY;
    var pulse = 0.5 + 0.5 * Math.sin(time * 4);
    ctx.save();
    ctx.textAlign = 'center';
    // 提示胶囊
    var tw = ctx.measureText(TUT_STEPS[step]).width;
    ctx.font = 'bold 16px system-ui, sans-serif';
    tw = ctx.measureText(TUT_STEPS[step]).width + 44;
    ctx.fillStyle = 'rgba(255,255,255,' + (0.82 + pulse * 0.15).toFixed(2) + ')';
    roundRect(C.W / 2 - tw / 2, ty - 20, tw, 40, 20); ctx.fill();
    ctx.strokeStyle = 'rgba(46,134,180,' + (0.5 + pulse * 0.4).toFixed(2) + ')';
    ctx.lineWidth = 2;
    roundRect(C.W / 2 - tw / 2, ty - 20, tw, 40, 20); ctx.stroke();
    ctx.fillStyle = '#12517E';
    ctx.fillText(TUT_STEPS[step], C.W / 2, ty + 5);
    // 步骤圆点
    for (var i = 0; i < TUT_STEPS.length; i++) {
      ctx.fillStyle = i < dropCount ? '#2E86B4' : 'rgba(46,134,180,0.25)';
      ctx.beginPath(); ctx.arc(C.W / 2 - (TUT_STEPS.length - 1) * 7 + i * 14, ty + 36, 3.2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  // ---------- 开始界面（v237：沉浸式海底环境 + 艺术字标题 + 主页↔游戏涟漪揭幕过渡） ----------
  // 主页↔游戏过渡进度：返回 0~1 或 null（无过渡）。performance.now 时钟（菜单态 time 也在走，但
  // restart 后首帧 time 语义不稳，与 segAnims 同策略用 now）。结束时自动清 dir 并释放快照。
  function menuTransK() {
    if (!menuTrans.dir) return null;
    var k = (performance.now() / 1000 - menuTrans.t0) / menuTrans.dur;
    if (k >= 1) { menuTrans.dir = null; menuTrans.snap = null; return null; }
    return k < 0 ? 0 : k;
  }
  // 涟漪揭幕快照：过渡首帧开头（目标场景尚未绘制、画布上仍是旧场景）截取整屏到离屏画布，
  // 供涟漪扩散时贴在圆外——圆外=旧画面冻结帧，圆内=实时新场景。
  function grabTransSnap() {
    if (!menuTrans.dir || menuTrans.snap) return;
    var cv = document.getElementById('game');
    if (!cv || !cv.width) return;
    var sn = document.createElement('canvas');
    sn.width = cv.width; sn.height = cv.height;
    sn.getContext('2d').drawImage(cv, 0, 0);
    menuTrans.snap = sn;
  }
  // 涟漪揭幕过渡（B 方案定版）：旧画面以涟漪起点为圆心被三重水环荡开，新画面从圆心
  // 以水波圆边界揭示——easeInOutCubic 缓动（起步蓄势-中段扩散-收尾轻缓），
  // 主缘白色泡沫粗线 + 外侧淡蓝光晕 + 三重涟漪环 + 起点溅珠闪环 + 圆内边缘水光。
  // ⚠ 整层在【物理像素坐标系】绘制（setTransform 恒等）：快照 1:1 贴回零失真——
  // 若在内容层逻辑坐标贴回，物理画布宽=C.W*dpr*view.s 仅在 view.s 按宽适配时成立，
  // 窗口更宽时快照会被压缩偏移（v239 的"主页靠左缩"即此 bug）。
  function drawRippleReveal(k) {
    var ek = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; // easeInOutCubic
    var kp = dpr * view.s;                                    // 逻辑→物理缩放因子
    var sn = menuTrans.snap;
    var pw = sn ? sn.width : Math.round(C.W * kp);            // 物理画布尺寸（快照=主画布）
    var ph = sn ? sn.height : Math.round(VH * kp);
    var cpx = (menuTrans.sx + BX) * kp;                       // 圆心：内容层逻辑 → 物理
    var cpy = (menuTrans.sy + renderOy) * kp;
    var maxR = Math.sqrt(Math.pow(Math.max(cpx, pw - cpx), 2) + Math.pow(Math.max(cpy, ph - cpy), 2)) + 30 * kp;
    var r = ek * maxR;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);                       // 物理像素坐标
    // 旧画面贴圆外（even-odd：矩形-圆环差集，1:1 零失真）
    if (sn) {
      ctx.beginPath();
      ctx.rect(-4, -4, pw + 8, ph + 8);
      ctx.arc(cpx, cpy, Math.max(0.1, r), 0, Math.PI * 2);
      ctx.clip('evenodd');
      ctx.drawImage(sn, 0, 0);
    }
    // 圆内边缘水光：新场景边缘被一圈淡白水光洗过（半径 0.9r~r 的柔光环）
    if (r > 8 * kp) {
      var wg = ctx.createRadialGradient(cpx, cpy, r * 0.82, cpx, cpy, r);
      wg.addColorStop(0, 'rgba(255,255,255,0)');
      wg.addColorStop(0.8, 'rgba(210,240,255,' + (0.18 * (1 - ek) + 0.05).toFixed(2) + ')');
      wg.addColorStop(1, 'rgba(255,255,255,' + (0.3 * (1 - ek) + 0.06).toFixed(2) + ')');
      ctx.fillStyle = wg;
      ctx.beginPath(); ctx.arc(cpx, cpy, r, 0, Math.PI * 2); ctx.fill();
    }
    // 三重涟漪环：主缘 + 两道滞后环（线宽/亮度逐级衰减，波形轻微起伏）
    var rings = [
      { rr: r, w: 4.5 - ek * 2.5, a: 0.85 * (1 - ek * 0.55) },
      { rr: r * 0.8, w: 2.6 - ek, a: 0.5 * (1 - ek * 0.7) },
      { rr: r * 0.58, w: 1.8 - ek * 0.6, a: 0.32 * (1 - ek * 0.8) }
    ];
    for (var ri = 0; ri < rings.length; ri++) {
      var rg = rings[ri];
      if (rg.rr < 3 * kp || rg.a <= 0.02) continue;
      ctx.beginPath();
      for (var a = 0; a <= Math.PI * 2 + 0.01; a += Math.PI / 22) {
        var wob = 1 + Math.sin(a * 9 + time * 6 - ri * 1.7) * 0.012; // 环缘微波
        var px = cpx + Math.cos(a) * rg.rr * wob;
        var py = cpy + Math.sin(a) * rg.rr * wob;
        if (a === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.strokeStyle = ri === 0 ? 'rgba(255,255,255,' + rg.a.toFixed(2) + ')'
                                 : 'rgba(190,232,255,' + rg.a.toFixed(2) + ')';
      ctx.lineWidth = Math.max(0.6, rg.w) * kp;
      ctx.stroke();
    }
    // 主缘外侧淡蓝光晕环（水波荡开的体积感）
    if (r > 12 * kp) {
      var og = ctx.createRadialGradient(cpx, cpy, r * 0.96, cpx, cpy, r * 1.12);
      og.addColorStop(0, 'rgba(160,220,250,' + (0.3 * (1 - ek)).toFixed(2) + ')');
      og.addColorStop(1, 'rgba(160,220,250,0)');
      ctx.fillStyle = og;
      ctx.beginPath(); ctx.arc(cpx, cpy, r * 1.12, 0, Math.PI * 2); ctx.fill();
    }
    // 起手溅珠：圆心附近几颗水珠沿抛物线溅起（前 35% 进度）
    if (ek < 0.35) {
      var sp = ek / 0.35;
      for (var di = 0; di < 7; di++) {
        var ang = di * 0.897 + 0.6;
        var dist = (14 + sp * 46 + Math.sin(di * 2.3) * 6) * kp;
        var dy2 = -Math.sin(sp * Math.PI) * 22 * (0.6 + (di % 3) * 0.2) * kp;
        ctx.fillStyle = 'rgba(255,255,255,' + ((1 - sp) * 0.8).toFixed(2) + ')';
        ctx.beginPath();
        ctx.arc(cpx + Math.cos(ang) * dist, cpy + Math.sin(ang) * dist * 0.6 + dy2, (2.4 - sp * 1.4) * kp, 0, Math.PI * 2);
        ctx.fill();
      }
      // 起点闪环（第一圈波纹爆开的亮环）
      var fr = (12 + ek / 0.35 * 34) * kp;
      ctx.strokeStyle = 'rgba(255,255,255,' + ((1 - ek / 0.35) * 0.7).toFixed(2) + ')';
      ctx.lineWidth = 2.4 * kp;
      ctx.beginPath(); ctx.arc(cpx, cpy, fr, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }
  // 海草一株（v287 重设计：丛状巨藻——四片宽飘带叶错落叠层，根宽 9~13px、叶缘正弦波浪、
  // 双色调前后层次 + 中脉高光 + 交错小叶；替代 v279 单根细飘带的"铁丝"观感。
  // h 为高度档 ×26px，dir=摆向）
  function drawKelp(bx, h, dir) {
    var H = h * 26, sd = bx * 0.11 + dir * 3;
    var baseY = VH + 2;
    var segs = 10, i, j;
    // 一条宽飘带：根宽 wRoot→梢宽 wTip，叶缘带正弦波浪（海藻叶），S 弯 + 整体摆动
    function blade(ox, hh, ph, wRoot, wTip, col, lw) {
      var pts = [];
      for (i = 0; i <= segs; i++) {
        var t = i / segs;
        var bend = Math.sin(time * 0.85 + sd + ph) * 9 * dir + Math.sin(t * 2.2 + sd * 3.1 + ph) * hh * 0.09;
        var w = wRoot + (wTip - wRoot) * t;
        var wob = Math.sin(t * 9 + sd * 2 + ph * 2.3) * w * 0.30;  // 叶缘波浪
        pts.push({ x: bend * t * t, y: baseY - hh * t, w: w + wob * 0.5 });
      }
      ctx.beginPath();
      ctx.moveTo(bx + pts[0].x + ox - pts[0].w, pts[0].y);
      for (j = 1; j <= segs; j++) ctx.lineTo(bx + pts[j].x + ox - pts[j].w, pts[j].y);
      for (j = segs; j >= 0; j--) ctx.lineTo(bx + pts[j].x + ox + pts[j].w, pts[j].y);
      ctx.closePath();
      ctx.fillStyle = col;
      ctx.fill();
      if (lw) { // 中脉高光
        ctx.strokeStyle = 'rgba(150,215,240,0.16)';
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(bx + pts[0].x + ox, pts[0].y);
        for (j = 1; j <= segs; j++) ctx.lineTo(bx + pts[j].x + ox, pts[j].y);
        ctx.stroke();
      }
    }
    // 四叶叠层：后排两片暗、中片次暗、前片亮 + 高光——错落高度/相位/左右偏移成一丛
    // v289：收窄整体（偏移 ±8、根宽 7.5~11、摆幅 9）——一丛实宽由 ~92 降到 ~64，
    // 配合 82px 槽位间距才不会整丛叠压（用户："水草还是不行，都挤到一起了"）
    blade(-8, H * 0.60, 1.9, 7.5, 1.2, 'rgba(8,38,66,0.20)', false);
    blade(8, H * 0.76, 3.6, 8.5, 1.2, 'rgba(8,38,66,0.26)', false);
    blade(-3, H * 0.90, 0.8, 9.5, 1.4, 'rgba(10,44,74,0.30)', false);
    blade(2, H, 0, 11, 1.6, 'rgba(10,44,74,0.36)', true);
    // 主茎两侧交错小叶（4 枚，弯月形，随相位微摆）
    for (j = 0; j < 4; j++) {
      var lt = 0.3 + j * 0.18;
      var lb = Math.sin(time * 0.85 + sd) * 9 * dir * lt * lt + Math.sin(lt * 2.2 + sd * 3.1) * H * 0.09 * lt * lt;
      var lx = bx + lb, ly = baseY - H * lt;
      var ldir = j % 2 ? 1 : -1;
      var ll = H * 0.17 * (1 - j * 0.12);
      ctx.fillStyle = 'rgba(10,44,74,0.26)';
      ctx.beginPath();
      ctx.moveTo(lx, ly);
      ctx.quadraticCurveTo(lx + ll * 0.62 * ldir + Math.sin(time * 1.1 + sd + j) * 2, ly - ll * 0.55,
                           lx + ll * ldir, ly - ll * 0.22);
      ctx.quadraticCurveTo(lx + ll * 0.45 * ldir, ly + ll * 0.1, lx, ly);
      ctx.closePath(); ctx.fill();
    }
  }
  // 圆头短叶草丛一丛（v287 重设计：5 叶宽飘带扇形丛——后排暗衬托 2 叶 + 前排亮 3 叶，
  // 叶身渐细带弯头、随水流独立摆动；替代 v279 三细叶"针"状观感）
  function drawGrassTuft(cx0, baseY, chh, dir, sd) {
    var rows = [
      { n: 2, hMul: 0.72, col: 'rgba(13,58,86,0.30)', off: 7 * dir, ph: 2.1 },
      { n: 3, hMul: 1.0,  col: 'rgba(30,104,132,0.36)', off: 0, ph: 0 }
    ];
    for (var rw = 0; rw < rows.length; rw++) {
      var row = rows[rw];
      for (var lf = 0; lf < row.n; lf++) {
        var lh = chh * row.hMul * (lf === 1 ? 1 : 0.76);
        var lx = cx0 + row.off + (lf - (row.n - 1) / 2) * 10;
        var lsway = Math.sin(time * (0.7 + rw * 0.2 + lf * 0.13) + sd + row.ph) * (5 + lh * 0.14);
        var wb2 = 4.6;
        var tipX = lx + lsway, tipY = baseY - lh;
        var tipDir = (lsway >= 0 ? 1 : -1);
        ctx.fillStyle = row.col;
        ctx.beginPath();
        ctx.moveTo(lx - wb2, baseY);
        ctx.quadraticCurveTo(lx - wb2 * 0.4 + lsway * 0.4, baseY - lh * 0.6, tipX - 2.4 * tipDir, tipY);
        // 圆弯叶尖（小弧过渡到另一缘）
        ctx.quadraticCurveTo(tipX + 2.6 * tipDir, tipY - 1.5, tipX + 3 * tipDir, tipY + 2.5);
        ctx.quadraticCurveTo(lx + wb2 * 0.4 + lsway * 0.4, baseY - lh * 0.55, lx + wb2, baseY);
        ctx.closePath(); ctx.fill();
      }
    }
  }
  // 沉浸式海底环境：顶部光柱 / 浮游颗粒 / 上升气泡 / 鱼群剪影 / 暗角
  // 全部 time 驱动程序绘制（无实体、无贴图），叠加在海域背景渐变之上制造纵深
  //（v291 水草删除、v292 海床沙丘删除）
  // v348：菜单层横向均匀播种（必须确定性——菜单每帧重算，用 Math.random 会让元素每帧乱跳）。
  // 第 i 个（共 n 个）落在第 i 条等宽竖带内，抖动取黄金角 sin 保证分散且逐帧稳定。
  // 返回全屏逻辑 x；菜单层在 translate(BX,0) 之后，调用方需再 -BX 折算成内容坐标。
  function menuBandX(i, n) {
    var w = LW / n;
    return (i + 0.5) * w + Math.sin(i * 2.399) * w * 0.36;
  }
  function drawMenuScene() {
    var i;
    var mvk = Math.round(VH);
    // v295：四道斜光共用同一条竖直渐变（几何完全相同，只是多边形在动）——原本每帧新建
    // 4 个渐变对象，GPU 每帧都要重新上传渐变纹理，长时间运行会加剧显存/资源抖动
    var rg = grad('menuRay' + mvk, function () {
      var gg = ctx.createLinearGradient(0, 0, 0, VH * 0.75);
      gg.addColorStop(0, 'rgba(210,240,255,0.13)');
      gg.addColorStop(1, 'rgba(210,240,255,0)');
      return gg;
    });
    // 顶部光柱（god rays）：4 道斜光缓慢摆动
    for (i = 0; i < 4; i++) {
      var rayX = -BX + LW * (0.15 + i * 0.23); // v347：横跨全屏（旧版 60+i*100 只在块内，宽屏两侧空）
      var sway = Math.sin(time * 0.35 + i * 1.7) * 26;
      var topW = 26 + (i % 2) * 14, botW = topW * 2.6;
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.moveTo(rayX - topW / 2 + sway * 0.3, -10);
      ctx.lineTo(rayX + topW / 2 + sway * 0.3, -10);
      ctx.lineTo(rayX + botW / 2 + sway, VH * 0.75);
      ctx.lineTo(rayX - botW / 2 + sway, VH * 0.75);
      ctx.closePath(); ctx.fill();
    }
    // 浮游颗粒：微尘漂移 + 闪烁（v348：数量随屏宽 + 条带均分，宽屏密度一致、不再随机聚一侧）
    var dustN = Math.min(34, Math.max(16, Math.round(16 * LW / C.W)));
    for (i = 0; i < dustN; i++) {
      var sd = i * 137;
      var px = -BX + menuBandX(i, dustN) + Math.sin(time * 0.4 + i) * 8;
      var py = (sd * 13 % VH) + Math.sin(time * 0.25 + i * 2.1) * 14;
      var pa = 0.04 + 0.05 * (0.5 + 0.5 * Math.sin(time * 1.2 + i * 2.3));
      ctx.fillStyle = 'rgba(230,248,255,' + pa.toFixed(2) + ')';
      ctx.beginPath(); ctx.arc(px, py, 1.2 + (i % 3) * 0.7, 0, Math.PI * 2); ctx.fill();
    }
    // 气泡：上升 + 左右轻摆，大小分层（v348：同上，数量随屏宽 + 条带均分）
    var mbN = Math.min(26, Math.max(12, Math.round(12 * LW / C.W)));
    for (i = 0; i < mbN; i++) {
      var seed = i * 97;
      var bx = -BX + menuBandX(i, mbN) + Math.sin(time * 0.8 + i * 1.9) * 10;
      var by = VH + 40 - ((time * (16 + (i % 6) * 3.5) + seed * 3) % (VH + 140));
      var br = 2.5 + (i % 4) * 2.6;
      ctx.beginPath();
      ctx.fillStyle = 'rgba(255,255,255,' + (0.05 + (i % 3) * 0.045).toFixed(2) + ')';
      ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    // 鱼群剪影：3 条小鱼横向游过（不同深度/速度，出屏回绕，转身翻面）
    var menuFishN = 3; // v348：2 条太稀疏，宽屏下容易同时出现在同一侧
    for (i = 0; i < menuFishN; i++) {
      var speed = 22 + i * 14;
      // v347：横跨全屏（旧版按 C.W 巡游，宽屏只在左侧一段来回、右侧全空）+ 翻面严格跟随
      // 运动方向（旧版位移恒向右、flip 却按圈数交替 → 奇数圈朝左却向右移 = "倒着游泳"）
      // v348：起始相位按 span/条数 均分——开局即分散在全屏（原 fd*40 相位接近、容易扎堆）
      var span = LW + 120;
      var trav = time * speed + i * (span / menuFishN);
      var cyc = Math.floor(trav / span), tIn = trav % span;
      var goingRight = (cyc % 2) === 0;   // 偶数趟向右、奇数趟折返回左（来回转身）
      var fx2 = -BX + (goingRight ? (tIn - 60) : (LW + 60 - tIn));
      var fy2 = 205 + i * 110 + Math.sin(time * 0.9 + i * 2.4) * 12;
      var fs2 = 0.8 + i * 0.35;
      var flip = goingRight ? 1 : -1;     // 与位移同向，绝不倒游
      ctx.save();
      ctx.translate(fx2, fy2); ctx.scale(fs2 * flip, fs2);
      ctx.fillStyle = 'rgba(10,44,74,0.20)';
      ctx.beginPath();
      ctx.moveTo(-14, 0);
      ctx.quadraticCurveTo(-4, -8, 10, 0);
      ctx.quadraticCurveTo(-4, 8, -14, 0);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-13, 0); ctx.lineTo(-21, -6); ctx.lineTo(-21, 6); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    // 海草丛：左右各三株巨藻（v283：间距 28→44/46 拉开，叶长 20 不再互相叠压）+ 底角圆头草丛
    // v291：水草全部删除（用户："太丑了，先删了吧"）——主页与局内侧栏不再绘制巨藻/草丛；
    // drawKelp / drawGrassTuft 两个绘制函数保留备用，当前无调用点
    // v292：主页海床沙丘已删除（用户："开始游戏下面靠近底部的深色区域是什么？请删掉"）；
    // 游戏局内的底部装饰（沙丘/卵石/海星/扇贝，layout.band）不受影响
    // 轻遮罩（顶部略深护标题对比度）+ 暗角聚焦（v287：整体减淡约 40%——原 0.34/0.14/0.30
    // 叠 0.36 暗角把主页压得发灰（用户："背景感觉发灰，不太透亮"），现只留轻聚焦）
    // v295：遮罩/暗角同为静态渐变，改走 grad 缓存（原每帧新建 2 个）
    ctx.fillStyle = grad('menuMask' + mvk, function () {
      var gg = ctx.createLinearGradient(0, 0, 0, VH);
      gg.addColorStop(0, 'rgba(6,28,52,0.20)');
      gg.addColorStop(0.45, 'rgba(6,28,52,0.07)');
      gg.addColorStop(1, 'rgba(6,28,52,0.16)');
      return gg;
    });
    ctx.fillRect(-BX, -renderOy, C.W + BX * 2, VH);
    ctx.fillStyle = grad('menuVig' + mvk + '_' + Math.round(BX), function () {
      var gg = ctx.createRadialGradient(C.W / 2, VH * 0.45, VH * 0.40, C.W / 2, VH * 0.45, VH * 0.95);
      gg.addColorStop(0, 'rgba(0,0,0,0)');
      gg.addColorStop(1, 'rgba(4,22,42,0.20)');
      return gg;
    });
    ctx.fillRect(-BX, -renderOy, C.W + BX * 2, VH);
  }
  // 艺术字标题「水滴合成深海」：站酷庆科黄油体（js/titlefont.js 注册到 MG.titleFontFamily）
  // 直接按字体逐字绘制，错落起伏摇摆；同色柔光让边缘柔和融入背景
  function drawTitleArt(ty) {
    var txt = '水滴合成深海';
    var adv = 48;
    // 逐字错落配置（大小/位移/倾角固定，保证每帧一致）
    var CH = [
      { s: 1.00, dy: 1,  rot: -0.035 },
      { s: 0.94, dy: 4,  rot: 0.045 },
      { s: 1.04, dy: -1, rot: -0.03 },
      { s: 0.96, dy: 3,  rot: 0.035 },
      { s: 1.02, dy: -1, rot: -0.04 },
      { s: 0.97, dy: 3,  rot: 0.03 }
    ];
    var x0 = C.W / 2 - adv * (txt.length - 1) / 2;
    // 统一浪相位：整排字 + 装饰共用同一浮动节奏
    var tBob = Math.sin(time * 1.6) * 2.2;
    var i;
    var fam = MG.titleFontFamily || 'system-ui';
    ctx.font = '44px "' + fam + '", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (i = 0; i < txt.length; i++) {
      var ch = CH[i];
      var cy = ty + ch.dy + tBob + Math.sin(time * 1.6 + i * 0.5) * 1.2;
      ctx.save();
      ctx.translate(x0 + i * adv, cy);
      ctx.rotate(ch.rot + Math.sin(time * 1.2 + i) * 0.014);
      ctx.scale(ch.s, ch.s);
      // v278：删同色柔光（shadowBlur 光晕把字面泡得发虚，用户"感觉虚虚的"）——单遍实色绘制，
      // 圆体字本身笔画圆润，硬边即可干净醒目
      ctx.fillStyle = '#2E86B4';
      ctx.fillText(txt[i], 0, -16);
      ctx.restore();
    }
    // —— 装饰三角（复用游戏本体素材）：左下海螺 · 右上五角海星 · 右下微笑水滴 ——
    drawShell(x0 - 34, ty + 8 - tBob * 0.6, 9);
    drawStarfish(x0 + adv * 5 + 38, ty - 46 + tBob, 11);
    // —— 小水滴：直接复用游戏内水滴精灵 drawBall（自带渐变体/表情/高光）——
    ctx.save();
    ctx.translate(x0 + adv * 5 + 38, ty - 6 + tBob * 0.8);
    ctx.rotate(Math.sin(time * 1.6) * 0.06);
    drawBall({ x: 0, y: 0, r: 11, tier: 1, vx: 0, vy: 0, id: 7 }, 1);
    ctx.restore();
    // v299：恢复基线——本函数把 textBaseline 设为 'middle' 且未恢复，主页其后绘制的
    // 离线卡（按 alphabetic 语义算基线）三行被各自顶高不同幅度，排列看起来不居中
    ctx.textBaseline = 'alphabetic';
  }
  // 主页内容层（环境之上）：艺术字标题 / 副标题 / 功能磁贴 / 吉祥物 / 离线卡 / 开始钮
  function drawMenuContent() {
    var mu = MG.layout.menu;
    var pulse = 0.5 + 0.5 * Math.sin(time * 2.4);
    ctx.textAlign = 'center';

    drawTitleArt(mu.titleY);

    // 左右功能磁贴（深海玻璃牌：图标+标签收在块内）
    for (var i = 0; i < menuTiles.length; i++) drawMenuTile(menuTiles[i]);

    // 中央水滴吉祥物（轻轻上下浮动）
    drawMascot(C.W / 2, mu.mascotCy);

    // 离线收益告知卡（有离线收益时显示，开局自动入账）
    drawOfflineCard();

    // 开始按钮：深海蓝大胶囊 + 呼吸光圈
    var b = menuStartBtn;
    ctx.save();
    ctx.strokeStyle = 'rgba(127,212,255,' + (0.22 + pulse * 0.28).toFixed(2) + ')';
    ctx.lineWidth = 3;
    roundRect(b.x - 6 - pulse * 3, b.y - 6 - pulse * 3, b.w + 12 + pulse * 6, b.h + 12 + pulse * 6, b.h / 2 + 6); ctx.stroke();
    ctx.restore();
    var g = ctx.createLinearGradient(0, b.y, 0, b.y + b.h);
    g.addColorStop(0, '#3B9BD0');
    g.addColorStop(1, '#2578A8');
    ctx.fillStyle = g;
    roundRect(b.x, b.y, b.w, b.h, b.h / 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.65)';
    ctx.lineWidth = 2;
    roundRect(b.x + 1, b.y + 1, b.w - 2, b.h - 2, b.h / 2 - 1); ctx.stroke();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('开始游戏', C.W / 2, b.y + b.h / 2 + 1);
    ctx.textBaseline = 'alphabetic';
  }

  // 菜单功能磁贴：深海玻璃牌（与海域牌/历史最佳牌同语言：蓝渐变+白描边）；
  // 图标+标签收在块内（图标上、文字下），不再外溢遮挡下一行；pressT 按压缩放（几何真源 layout.menuTileRect）
  function drawMenuTile(t) {
    var r = MG.layout.menuTileRect(t.side, t.i);
    var sc = 1 - Math.min(0.12, Math.max(0, t.pressT) * 0.75);
    ctx.save();
    ctx.translate(r.x + r.w / 2, r.y + r.h / 2);
    ctx.scale(sc, sc);
    ctx.fillStyle = 'rgba(6,26,48,0.30)';
    roundRect(-r.w / 2, -r.h / 2 + 4, r.w, r.h, 16); ctx.fill(); // 底部投影
    var g = ctx.createLinearGradient(0, -r.h / 2, 0, r.h / 2);
    g.addColorStop(0, '#2E86B4');
    g.addColorStop(1, '#155A8A');
    ctx.fillStyle = g;
    roundRect(-r.w / 2, -r.h / 2, r.w, r.h, 16); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.65)';
    ctx.lineWidth = 2;
    roundRect(-r.w / 2 + 1, -r.h / 2 + 1, r.w - 2, r.h - 2, 15); ctx.stroke();
    // 顶部高光弧（玻璃质感）
    ctx.strokeStyle = 'rgba(255,255,255,0.28)';
    ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, 6, r.h / 2 - 9, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
    ctx.lineCap = 'butt';
    // 图标（上）+ 标签（下），全部收在块内
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '26px system-ui, sans-serif';
    ctx.fillText(t.icon, 0, -10);
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(t.label, 0, 16);
    ctx.textBaseline = 'alphabetic';
    ctx.restore();
  }

  // 水滴吉祥物：大方的水滴角色（上尖下圆 + 高光 + 表情），轻轻浮动
  // 中央展示水滴（v287：弃自绘吉祥物水滴，改轮播游戏内水滴——每秒切换一颗：
  // 普通 1~8 档 → 12 种特殊滴（漩涡/雨云/彩虹/疾风/磁石/泉涌/雷霆/珍珠/熔岩/间歇泉/虚空/极光）
  // → 礁石 → 大宝箱，共 22 颗循环；切换时 easeOutBack 弹出，本体逐笔复用游戏渲染
  // drawBall/drawIronBall/drawChest，与局内完全同款（用户："更换为游戏水滴样式"）
  var MASCOT_SHOWS = null;
  function mascotShows() {
    if (!MASCOT_SHOWS) {
      MASCOT_SHOWS = [];
      var t;
      for (t = 1; t <= 8; t++) MASCOT_SHOWS.push({ tier: t });
      var sp = ['vortex', 'cloud', 'rainbow', 'gale', 'magnet', 'spring', 'thunder', 'pearl', 'magma', 'geyser', 'void', 'aurora'];
      for (t = 0; t < sp.length; t++) MASCOT_SHOWS.push({ tier: 3, special: sp[t] });
      MASCOT_SHOWS.push({ iron: true });
      MASCOT_SHOWS.push({ iron: true, chest: true });
    }
    return MASCOT_SHOWS;
  }
  function drawMascot(cx, cy) {
    var r = 52;
    var list = mascotShows();
    // v289：一颗停留 3s（原 1s，用户："切换太快"）——入 0.72s easeOutBack 弹出、末 0.48s 缓慢
    // 缩小淡出，出入场都放慢，中间 1.8s 静态展示
    var CYC = 3.0;
    var tick = time / CYC;
    var idx = Math.floor(tick) % list.length;
    var ph = tick - Math.floor(tick);        // 本颗内相位 0~1
    var sc = 1, alpha = 1;
    if (ph < 0.24) {                         // 弹入：0.4 → 过冲 1.12 → 1
      var u = ph / 0.24 - 1;
      sc = 0.4 + 0.6 * (1 + 2.70158 * u * u * u + 1.70158 * u * u);
      if (sc > 1.12) sc = 1.12;
    } else if (ph > 0.84) {                  // 淡出：末段缓缩 + 渐隐（easeIn，不突兀）
      var v = (ph - 0.84) / 0.16;
      sc = 1 - 0.4 * v * v;
      alpha = 1 - v * v;
    }
    cy += Math.sin(time * 1.8) * 4;          // 保留原上下浮动
    // 地面柔影（随弹出缩放、退场同步淡出）
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = 'rgba(8,34,60,0.25)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + r + 10, r * 0.7 * sc, 9 * sc, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // 游戏水滴本体：构造假球对象走局内同一条渲染管线（无拖尾/无变形字段即干净呈现）
    var ball = { x: cx, y: cy, r: r * sc, vx: 0, vy: 0, id: 3 };
    var show = list[idx];
    for (var k in show) ball[k] = show[k];
    drawBall(ball, alpha);
  }

  // ---------- 主渲染 ----------
  function render() {
    grabTransSnap(); // 涟漪揭幕：过渡首帧开头截取旧画面（此刻画布上仍是上一帧的源场景）

    // v297：每帧开头强制复位易泄漏的全局状态——任何一次绘制中途异常（如 chest.t）都会
    // 跳过配对的 ctx.restore()，把 globalAlpha/线帽/虚线遗留在中间值上；残留 globalAlpha
    // 会让之后每帧的背景填充都变成半透明叠加（花屏主因之一），这里兜底清零
    ctx.globalAlpha = 1;
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'miter';
    ctx.setLineDash([]);

    // 背景：无偏移全屏变换铺满（刘海/手势条区域为海色延伸，正常区域对待）
    ctx.setTransform(dpr * view.s, 0, 0, dpr * view.s, 0, 0);
    drawBackground();

    // 内容层：游戏块（420×C.H，当前交付 9:18=840）垂直居中——所有态一致居中（oy=(VH-C.H)/2），
    // 高屏多余高度上下均分，块顶上方/块底下方由全屏背景渐变自然延展填充（无留白）。
    // transform y 偏移用 dpr*view.s*renderOy（renderOy 为逻辑 px，与 toLocal 的 -renderOy 同量纲，
    // 修早期漏乘 view.s 导致 view.s≠1 真机上偏移算少、游戏区偏上的问题）。
    renderOy = oy;
    ctx.setTransform(dpr * view.s, 0, 0, dpr * view.s, 0, dpr * view.s * renderOy);
    if (shakeT > 0) {
      var s = shakeAmp * (shakeT / 0.4);
      ctx.translate((Math.random() - 0.5) * 2 * s, (Math.random() - 0.5) * 2 * s);
    }

    // 游戏区（420 逻辑宽）水平居中：整体平移 BX，两侧为延伸海水
    ctx.save();
    ctx.translate(BX, 0);

    if (state === 'menu') {
      var tK = menuTransK();
      drawMenuScene();               // 沉浸式海底环境（全时不透明）
      drawMenuContent();             // 主页内容（'out' 过渡时从涟漪圆心实时露出，无需整体淡入）
      // v273：设置钮属于"新场景内容"，先于涟漪揭示层绘制——否则过渡期间齿轮会浮在
      // 旧画面快照之上（用户："点击返回主页后，设置按钮直接漏到最上方了"），
      // 随涟漪从圆心一起被揭示才合理。
      ctx.save();
      ctx.translate(0, hudInset);
      drawSetBtn();               // 设置入口（音效/音乐/震动弹窗，systems 菜单分支处理）
      ctx.restore();
      if (tK !== null) drawRippleReveal(tK); // 过渡涟漪最后画（圆外贴旧画面快照）
      // v274：弹层统一弹性出入场——flag 关闭后动画未完仍继续绘制，收拢完毕自动停
      // v275：dimA 只淡入淡出，弹性缩放仅作用于页签本体
      if (setOpen || panelFxAlive('set')) { var msR = MG.layout.setRect(); drawPanelFx('set', setOpen, msR.x + msR.w / 2, msR.y + msR.h / 2, 0.55, drawSettings); }
      // v317：清空存档二级确认叠在设置面板之上（同层后画即在上）
      if (setClearOpen || panelFxAlive('setclr')) { var mcR = MG.layout.setClearRect(); drawPanelFx('setclr', setClearOpen, mcR.x + mcR.w / 2, mcR.y + mcR.h / 2, 0.6, drawSetClear); }
      if (achOpen || panelFxAlive('ach')) drawPanelFx('ach', achOpen, DEX_PANEL.x + DEX_PANEL.w / 2, DEX_PANEL.y + DEX_PANEL.h / 2, 0.6, drawAchPanel);
      ctx.restore(); return;
    } // 开始界面：背景之上画菜单 + 设置入口 + 设置弹窗 + 成就殿堂面板

    drawContainer();
    // v333：drawDangerLine 调用点移到实体层之后（用户"警戒线，越界提示等要叠在水滴上面"）——
    // 原在水/实体层之前，堆高时线与警示渐晕被水滴盖住；现随 drawDangerText 同层后画。
    drawWaterBack();
    // v310：指示线在实体层之前绘制（坠落中的水滴盖在线上，线在"水滴后面"）
    if (state === 'play' && !evapMode && !flowMode && !rippleMode && !confirmOpen) {
      drawGhostGuide(aimX, nextTier);
      drawLandPreview(); // v372：竖直瞄准列（落点预览圈已按需求移除）
    }

    var i;
    for (i = 0; i < phys.bodies.length; i++) drawBall(phys.bodies[i], 1);

    drawWaterFront();

    drawBuoyWarn(); // v372：潮汐浮力顶起的预警圈（叠在水滴之上）
    drawTutorial(); // 首局分步引导（前 5 投）

    if (state === 'play' && !evapMode && !flowMode && !rippleMode && !confirmOpen) {
      drawGhost(aimX, C.spawnY, nextTier, cooldown > 0 ? 0.25 : 0.6);
    }

    drawFx();
    drawEventVfx(); // 随机深海事件视觉（漩涡风暴/涌泉）
    drawEventWarn(); // v372：事件来袭预警（风暴/涌泉前泛光+文字）

    if (evapMode) {
      ctx.fillStyle = 'rgba(10,40,70,0.18)';
      ctx.fillRect(-BX, -renderOy, C.W + BX * 2, VH);
      var hb = ballAt(lastPointer);
      if (hb) {
        ctx.save();
        ctx.setLineDash([6, 5]);
        ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(hb.x, hb.y, hb.r + 8, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }
      ctx.textAlign = 'center';
      drawPropHint('蒸发模式：点击要移除的水滴或礁石（再点按钮取消）');
    }

    // 涟漪选位模式：显示波纹中心指示
    if (rippleMode) {
      ctx.fillStyle = 'rgba(10,40,70,0.12)';
      ctx.fillRect(-BX, -renderOy, C.W + BX * 2, VH);
      var rx = Math.max(12, Math.min(C.W - 12, lastPointer.x < 0 ? C.W / 2 : lastPointer.x));
      var ry = Math.max(C.containerTop + 30, Math.min(FLOORY - 16, lastPointer.y < 0 ? (C.containerTop + FLOORY) / 2 : lastPointer.y));
      ctx.save();
      ctx.setLineDash([8, 8]);
      ctx.strokeStyle = 'rgba(127,212,255,0.55)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(rx, ry, C.ripple.radius * 0.5, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = 'rgba(127,212,255,0.85)';
      ctx.beginPath(); ctx.arc(rx, ry, 14, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.moveTo(rx - 22, ry); ctx.lineTo(rx + 22, ry);
      ctx.moveTo(rx, ry - 22); ctx.lineTo(rx, ry + 22);
      ctx.stroke();
      ctx.restore();
      ctx.textAlign = 'center';
      drawPropHint('涟漪模式：点击选择波纹中心（再点按钮取消）');
    }

    // 水流模式：已选水滴高亮 + 操作提示
    if (flowMode) {
      ctx.fillStyle = 'rgba(10,40,70,0.14)';
      ctx.fillRect(-BX, -renderOy, C.W + BX * 2, VH);
      if (flowPick) {
        ctx.save();
        ctx.strokeStyle = '#7FE8F5';
        ctx.lineWidth = 3;
        ctx.setLineDash([7, 5]);
        ctx.lineDashOffset = -time * 30; // 旋转虚线圈：指示当前选中
        ctx.beginPath(); ctx.arc(flowPick.x, flowPick.y, flowPick.r + 9, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }
      ctx.textAlign = 'center';
      var flowHint = flowPick ? '水流模式：再点一枚水滴与之交换（点原滴取消）' : '水流模式：点选第一枚水滴';
      drawPropHint(flowHint);
    }

    // 暗角（纵深）
    var vg = grad('vig' + Math.round(VH) + '_' + Math.round(BX), function () {
      var gg = ctx.createRadialGradient(C.W / 2, VH / 2, VH * 0.34, C.W / 2, VH / 2, VH * 0.74);
      gg.addColorStop(0, 'rgba(0,0,0,0)');
      gg.addColorStop(1, 'rgba(6,28,52,0.16)');
      return gg;
    });
    ctx.fillStyle = vg;
    ctx.fillRect(-BX, -renderOy, C.W + BX * 2, VH);

    // HUD 整体随胶囊避让下挪 hudInset：内容层已随 renderOy 垂直居中，hudInset 仅为「居中后
    // 仍在胶囊下缘之上」的残余量（fit 里算好：高屏居中即避开胶囊→0，矮屏才给 ≤24）；
    // HUD（分数/进度/任务/潮汐胶囊/设置钮）统一 +hudInset 平移；设置钮命中侧同步 +hudInset。
    // 涨潮横幅 v188 起锚堆叠空间中心，不参与平移。
    if (hudInset > 0) { ctx.save(); ctx.translate(0, hudInset); }
    drawHUD();
    if (!questHidden) drawQuest();   // v202：任务元素隐藏时跳过（开关 questHidden）
    drawSeaProgress();               // 海域进度条：原内嵌于 drawQuest，现独立绘制（不受任务隐藏影响）
    drawTideTimer();                // 潮汐计时器：原 drawTidePill，v202 重设计为动态一行
    drawChalChip();                 // v273：深渊潜航/每日挑战局信息芯片（挑战中显示目标与进度）
    if (hudInset > 0) ctx.restore();
    drawDangerLine(); // v333：警戒线（含警示渐晕/光带）叠在水滴之上
    drawDangerText(); // v326：越线警示文字
    drawReefCancelHint(); // v375：礁石相邻+退潮 → 外圈虚线 + 礁石上「需涨潮相消」提示
    drawGhostLabel(); // 最后绘制，保证特殊滴标签浮在最上层且紧贴虚影球
    drawPopups();     // 浮动文字最上层（礁石来袭/任务完成/得分等，不被 HUD 遮挡）
    drawTideBanner(); // v375：涨潮横幅置于最上层（原被弹字/警示文字遮挡）
    drawComboMeter(); // v375：连击常驻显示（警戒线下方居中），置于顶层不被弹字/横幅遮挡
    drawSkillBar();
    // v274：弹层统一弹性出入场（关闭后动画未完仍继续绘制至收拢完毕）
    if (confirmOpen || panelFxAlive('confirm')) { var pcR = MG.layout.confirmRect(); drawPanelFx('confirm', confirmOpen, pcR.x + pcR.w / 2, pcR.y + pcR.h / 2, 0.55, drawConfirm); }
    if (setOpen || panelFxAlive('set')) { var psR = MG.layout.setRect(); drawPanelFx('set', setOpen, psR.x + psR.w / 2, psR.y + psR.h / 2, 0.55, drawSettings); }
    if (setClearOpen || panelFxAlive('setclr')) { var pc2R = MG.layout.setClearRect(); drawPanelFx('setclr', setClearOpen, pc2R.x + pc2R.w / 2, pc2R.y + pc2R.h / 2, 0.6, drawSetClear); }

    if (dexOpen || panelFxAlive('dex')) drawPanelFx('dex', dexOpen, DEX_PANEL.x + DEX_PANEL.w / 2, DEX_PANEL.y + DEX_PANEL.h / 2, 0.6, drawDex);
    else if (achOpen || panelFxAlive('ach')) drawPanelFx('ach', achOpen, DEX_PANEL.x + DEX_PANEL.w / 2, DEX_PANEL.y + DEX_PANEL.h / 2, 0.6, drawAchPanel);
    if (ngOpen || panelFxAlive('ng')) { var pnR = MG.layout.ngRect(); drawPanelFx('ng', ngOpen, pnR.x + pnR.w / 2, pnR.y + pnR.h / 2, 0.66, drawNgPick); }
    if (shareOpen || panelFxAlive('share')) { var pshR = MG.layout.shareRect(); drawPanelFx('share', shareOpen, pshR.x + pshR.w / 2, pshR.y + pshR.h / 2, 0.6, drawShare); }
    // v327：广告演示层调用已移除（先不做广告）
    if (state === 'over') drawOver();

    ctx.restore();

    // 入局涟漪揭幕（restore 后内容层坐标绘制，覆盖含侧延伸的全屏；圆外贴主页快照）
    var tkIn = menuTransK();
    if (tkIn !== null) drawRippleReveal(tkIn);
  }

  // ---------- 文档图标渲染钩子（游戏说明/封面配图用） ----------
  // 在离屏 canvas 上用游戏本体绘制函数渲染图标，返回真透明底 PNG dataURL——
  // 保证文档图标与游戏内实际观感完全一致，且不受主画布 CSS 背景污染。
  MG.debug.iconData = function (kind, id, size) {
    size = size || 192;
    var cv = document.createElement('canvas');
    cv.width = size; cv.height = size;
    var old = ctx;
    ctx = cv.getContext('2d'); // 短暂接管模块画笔，绘制完立即归还
    ctx.save();
    ctx.translate(size / 2, size / 2);
    ctx.scale(size / 96, size / 96);
    if (kind === 'tier') {
      // 合成链水滴：标准球体 + 表情/波纹
      drawBall({ x: 0, y: 0, r: 30, tier: id, vx: 0, vy: 0 }, 1);
    } else if (kind === 'sp') {
      // 特殊滴：与图鉴 drawSpForm 同构（礁石/符文/冰晶特殊处理）
      var r = 26;
      if (id === 'iron') drawIronBall({ x: 0, y: 0, r: r, vx: 0, vy: 0 }, 1);
      else if (id === 'rune') drawBall({ x: 0, y: 0, r: r, tier: 1, vx: 0, vy: 0, rune: 'ripple' }, 1);
      else drawBall({ x: 0, y: 0, r: r, tier: 1, vx: 0, vy: 0, special: id, frozen: id === 'ice' ? 1 : 0 }, 1);
    } else if (kind === 'sea') {
      // 海域徽章：放大 2.4 倍
      ctx.scale(2.4, 2.4);
      drawSeaBadge(id, 0, 0, true);
    } else if (kind === 'skill') {
      // 技能图标：用技能条同款配色
      var col = id === 'swap' ? '#8E6FC0' : (id === 'ripple' ? '#2FA8A0' : (id === 'evap' ? '#E2705E' : '#3FA8B8'));
      ctx.scale(2.2, 2.2);
      drawSkillIcon(id, 0, 0, col);
    } else if (kind === 'chest') {
      // 宝箱
      ctx.scale(1.7, 1.7);
      drawChestIcon(0, 0, 1);
    } else if (kind === 'ng') {
      // 深渊潜航：紫罗兰渐变胶囊（与结算页按钮同风格）
      var ngg = ctx.createLinearGradient(0, -18, 0, 18);
      ngg.addColorStop(0, '#8A67BE'); ngg.addColorStop(1, '#5A3FA2');
      ctx.fillStyle = ngg;
      roundRect(-46, -19, 92, 38, 19); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('深渊潜航', 0, 1);
    }
    ctx.restore();
    ctx = old;
    return cv.toDataURL('image/png');
  };

;
// ===== js/main.js =====
// 水滴合成深海 - main：主循环与启动（模块加载顺序 4/4，最后加载；rAF 从这里起转）
// 主循环修复：原 frame() 中 update 被无条件调用一次、非 headless 又调一次，
// 导致浏览器每帧跑两遍 update（实际 2 倍速），模拟器也被 rAF 干扰。现统一为：
// headless 完全由 MG.debug.step() 驱动（rAF 空转），正常模式每帧 update+render 各一次。
var last = 0;
function frame(ts) {
  requestAnimationFrame(frame);
  if (MG.debug.headless) return; // 模拟器模式：完全由 step() 驱动，rAF 空转
  // v295：页面被隐藏（切标签页 / 预览面板被遮挡 / 窗口最小化）时宿主会节流甚至暂停 rAF，
  // 此时 GPU/合成层可能回收或休眠 canvas 表面；若不立即重绘，回到前台就会呈现花屏
  //（用户："首页静止一段时间后就开始花屏了，但是程序应该是正常的，只是显示花屏了"）
  if (typeof document !== 'undefined' && document.hidden) { last = ts; return; }
  if (!last) last = ts;
  var dt = Math.min((ts - last) / 1000, 1 / 30);
  last = ts;
  // v297：帧级异常兜底——过去 chest.t 空引用曾让每帧画到一半中断、globalAlpha 泄漏成
  // 全屏花屏且无任何报错提示。现捕获后把错误画在画布底部（红条），一眼可见、便于定位
  try {
    update(dt);
    render();
  } catch (err) {
    try {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
      var bh = Math.min(90, canvas.height * 0.1);
      ctx.fillStyle = 'rgba(122,30,30,0.92)';
      ctx.fillRect(0, canvas.height - bh, canvas.width, bh);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '16px monospace';
      ctx.textBaseline = 'top';
      ctx.fillText('ERR ' + String(err && err.message || err).slice(0, 120), 10, canvas.height - bh + 10);
      ctx.font = '12px monospace';
      ctx.fillText(String(err && err.stack || '').replace(/\n/g, ' | ').slice(0, 160), 10, canvas.height - bh + 34);
      ctx.textBaseline = 'alphabetic';
    } catch (e2) {}
    if (typeof console !== 'undefined' && console.error) console.error('[frame]', err);
  }
}
// v295：恢复可见 / 重新获得焦点时立刻补一帧——让损坏或过期的表面被新一帧立即覆盖，
// 不必等到下一个 rAF 节拍（宿主恢复 rAF 有时存在数十毫秒以上的空窗）
// v301：微信端 document 是精简 shim（只有 getElementById/createElement，无 addEventListener），
// 逐个做存在性守卫——否则整包在真机/开发者工具加载即崩（TypeError: document.addEventListener
// is not a function）；focus/pageshow 在微信也无意义，守卫后自然跳过
if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
  var kickRepaint = function () {
    if (document.hidden) return;
    last = 0;                       // 重置时间基准，避免恢复瞬间 dt 过大
    if (typeof render === 'function') render();
  };
  document.addEventListener('visibilitychange', kickRepaint);
}
if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  var kickRepaint2 = function () {
    if (typeof document !== 'undefined' && document.hidden) return;
    last = 0;
    if (typeof render === 'function') render();
  };
  window.addEventListener('focus', kickRepaint2);
  window.addEventListener('pageshow', kickRepaint2);
}

makeQuest(0);
requestAnimationFrame(frame);

