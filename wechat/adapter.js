// 微信小游戏浏览器环境适配层
// 职责：在无 DOM 的小游戏运行时里，垫出 web 版代码依赖的最小环境
//   - window / document / localStorage / requestAnimationFrame
//   - 触摸事件 → pointer 事件（换算成逻辑坐标 420x720）
//   - 全屏画布 + 等比缩放视图变换（letterbox 居中，MG.view 供渲染层使用）
/* eslint-disable */
var info = wx.getSystemInfoSync();
var dpr = Math.min(info.pixelRatio || 2, 2);

// 逻辑分辨率（与 js/config.js 保持一致）
var LW = 420, LH = 720;

// 主画布：小游戏里第一个 createCanvas 即上屏画布（全屏）
var canvas = wx.createCanvas();
canvas.width = Math.floor(info.screenWidth * dpr);
canvas.height = Math.floor(info.screenHeight * dpr);

// 视图变换：逻辑 420x720 等比缩放并居中，两侧留深海色边
var s = Math.min(canvas.width / LW, canvas.height / LH);
var view = {
  bw: canvas.width, bh: canvas.height,
  s: s,
  offX: (canvas.width - LW * s) / 2,
  offY: (canvas.height - LH * s) / 2
};

// ---- 全局垫片（小游戏的全局对象是 GameGlobal）----
GameGlobal.window = GameGlobal;
GameGlobal.devicePixelRatio = dpr;
GameGlobal.innerWidth = info.windowWidth;
GameGlobal.innerHeight = info.windowHeight;
GameGlobal.addEventListener = function () {}; // resize 等浏览器事件忽略
GameGlobal.document = {
  getElementById: function () { return canvas; }
};
GameGlobal.localStorage = {
  getItem: function (k) {
    var v = wx.getStorageSync(k);
    return (v === '' || v === undefined || v === null) ? null : String(v);
  },
  setItem: function (k, v) { try { wx.setStorageSync(k, String(v)); } catch (e) {} },
  removeItem: function (k) { try { wx.removeStorageSync(k); } catch (e) {} }
};
GameGlobal.requestAnimationFrame = canvas.requestAnimationFrame
  ? canvas.requestAnimationFrame.bind(canvas)
  : function (cb) { setTimeout(function () { cb(Date.now()); }, 1000 / 60); };

// ---- 触摸 → pointer 事件（clientX/Y 已换算为逻辑坐标）----
var listeners = {};
function makeEvent(e) {
  var t = (e.touches && e.touches.length) ? e.touches[0]
        : (e.changedTouches && e.changedTouches.length) ? e.changedTouches[0]
        : null;
  return {
    type: 'pointer',
    preventDefault: function () {},
    clientX: t ? (t.clientX * dpr - view.offX) / view.s : 0,
    clientY: t ? (t.clientY * dpr - view.offY) / view.s : 0
  };
}
function reg(wxHandler) {
  wxHandler(function (e) {
    var hs = listeners._all;
    if (!hs || !hs.length) return;
    var ev = makeEvent(e);
    for (var i = 0; i < hs.length; i++) hs[i].fn(ev);
  });
}
canvas.addEventListener = function (type, fn) {
  (listeners._all = listeners._all || []).push({ type: type, fn: fn });
};
canvas.removeEventListener = function (type, fn) {
  var arr = listeners._all || [];
  for (var i = arr.length - 1; i >= 0; i--) {
    if (arr[i].type === type && arr[i].fn === fn) arr.splice(i, 1);
  }
};
reg(wx.onTouchStart);
reg(wx.onTouchMove);
reg(wx.onTouchEnd);
reg(wx.onTouchCancel);

// 供 game.js / 渲染层使用
GameGlobal.MG = GameGlobal.MG || {};
GameGlobal.MG.view = view;
GameGlobal.MG.canvas = canvas;
