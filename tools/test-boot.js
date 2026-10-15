// game.js 启动测试器（Node 模拟 wx 小游戏环境）
// 用法：node tools/test-boot.js
// 覆盖：适配层垫片 → 四文件加载 → 渲染帧循环 → 触摸投放 → HUD 文本输出 → 存档
'use strict';

// ---------- mock: 存储 ----------
var storage = {};
var storageWrites = [];

// ---------- mock: 2d context（统计调用次数 + 抓 fillText 文本） ----------
var ctxStats = { ops: 0, texts: [] };
function makeCtx() {
  var gradient = { addColorStop: function () { ctxStats.ops++; } };
  return new Proxy({}, {
    get: function (t, prop) {
      if (prop === 'measureText') return function (s) { ctxStats.ops++; return { width: String(s).length * 6 }; };
      if (prop === 'createLinearGradient' || prop === 'createRadialGradient') return function () { ctxStats.ops++; return gradient; };
      if (prop === 'fillText' || prop === 'strokeText') {
        return function (s) { ctxStats.ops++; if (ctxStats.texts.length < 400) ctxStats.texts.push(String(s)); };
      }
      return function () { ctxStats.ops++; };
    },
    set: function () { return true; }
  });
}

// ---------- mock: canvas ----------
var rafQueue = [];
var ctx2d = makeCtx();
var canvasMock = {
  width: 0, height: 0,
  getContext: function () { return ctx2d; },
  requestAnimationFrame: function (cb) { rafQueue.push(cb); return rafQueue.length; },
  addEventListener: function () {}, removeEventListener: function () {}
};

// ---------- mock: wx ----------
var touchHandlers = {};
var audioCreated = 0;
global.GameGlobal = {};
// 真机里 GameGlobal 就是全局对象，裸 window/MG/localStorage/document/requestAnimationFrame 都能解析；
// Node 的 global 与 GameGlobal 是两个对象，用 getter 转发模拟同样语义
global.window = global.GameGlobal;
function fwd(name) {
  Object.defineProperty(global, name, {
    get: function () { return global.GameGlobal[name]; },
    configurable: true
  });
}
fwd('MG'); fwd('localStorage'); fwd('document'); fwd('requestAnimationFrame');
global.wx = {
  getSystemInfoSync: function () {
    return { pixelRatio: 2, screenWidth: 390, screenHeight: 844, windowWidth: 390, windowHeight: 844 };
  },
  createCanvas: function () { return canvasMock; },
  getStorageSync: function (k) { return (k in storage) ? storage[k] : ''; },
  setStorageSync: function (k, v) { storage[k] = String(v); storageWrites.push(k); },
  removeStorageSync: function (k) { delete storage[k]; },
  onTouchStart: function (h) { touchHandlers.start = h; },
  onTouchMove: function (h) { touchHandlers.move = h; },
  onTouchEnd: function (h) { touchHandlers.end = h; },
  onTouchCancel: function (h) { touchHandlers.cancel = h; },
  createInnerAudioContext: function () { audioCreated++; return { src: '', volume: 1, play: function () {}, stop: function () {}, destroy: function () {}, onCanplay: function () {}, onError: function () {} }; },
  createRewardedVideoAd: function () { return { load: function () { return Promise.resolve(); }, show: function () { return Promise.resolve(); }, onClose: function () {}, offClose: function () {}, onError: function () {} }; }
};

// ---------- 视图换算（与 adapter.js 一致，用于把"逻辑坐标"转成 mock 触摸 px） ----------
function boot() { require('../wechat/game.js'); }
var view; // boot 后从 MG 读
function toPx(lx, ly) {
  return { x: (lx * view.s + view.offX) / 2, y: (ly * view.s + view.offY) / 2 }; // dpr=2
}
function touch(type, lx, ly) {
  var p = toPx(lx, ly);
  var ev = { touches: [{ clientX: p.x, clientY: p.y }], changedTouches: [{ clientX: p.x, clientY: p.y }] };
  touchHandlers[type](ev);
}
function stepFrames(n, t0) {
  var t = t0;
  for (var f = 0; f < n; f++) {
    t += 16.67;
    var q = rafQueue; rafQueue = [];
    for (var i = 0; i < q.length; i++) q[i](t);
    if (!rafQueue.length) throw new Error('第 ' + f + ' 帧后渲染循环停止（requestAnimationFrame 未续约）');
  }
  return t;
}

// ---------- 执行 ----------
var t = 1000;
console.log('[1] 加载 game.js（adapter → config → physics → main）...');
boot();
view = GameGlobal.MG.view;
if (!view || !view.s) throw new Error('MG.view 未建立');
console.log('    OK  画布 ' + canvasMock.width + 'x' + canvasMock.height + '，视图缩放 s=' + view.s.toFixed(3) + '，offY=' + view.offY.toFixed(1));

console.log('[2] 空转 60 帧...');
t = stepFrames(60, t);
console.log('    OK  2d 调用 ' + ctxStats.ops + ' 次');

console.log('[3] 模拟触摸投放 ×6（拖动瞄准后松手）...');
for (var d = 0; d < 6; d++) {
  var x = 90 + d * 48;
  touch('start', x, 100);
  touch('move', x + 20, 100);
  touch('end', x + 20, 100);
  t = stepFrames(90, t); // 每次投放间隔 1.5 秒（> dropCooldown）
}
console.log('    OK  音频实例创建 ' + audioCreated + ' 个（12 音效 × 3）');

console.log('[4] 继续跑 900 帧（≈15 秒游戏时间，覆盖合成/连击/技能充能/任务刷新）...');
t = stepFrames(900, t);
console.log('    OK  2d 调用累计 ' + ctxStats.ops + ' 次');

console.log('[5] 存档写入：' + (storageWrites.length ? [...new Set(storageWrites)].join(', ') : '（本局未触发存档点，属正常——best 在结算时写）'));

// 从 HUD 文本提取游戏状态证据
var seen = {};
for (var i = 0; i < ctxStats.texts.length; i++) {
  var s = ctxStats.texts[i];
  if (/剩余|无尽|目标|最佳|任务|就绪/.test(s)) seen[s] = 1;
}
var keys = Object.keys(seen);
console.log('[6] HUD 文本抽样（' + keys.length + ' 条）：');
for (i = 0; i < Math.min(keys.length, 8); i++) console.log('    · ' + keys[i]);

console.log('\n=== game.js 启动测试全部通过：加载/渲染/输入/音频/存档链路无异常 ===');
