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
