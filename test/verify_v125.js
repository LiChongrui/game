// v125 微信小游戏垫片验证：node 内 mock wx API + GameGlobal，require(wechat/bundle.js)，
// 端到端过垫片桥接——存储读写、菜单渲染帧、触摸转发（点开始按钮进局）、probe。
const path = require('path');

// ---------- 可调用万能 stub（canvas/ctx/WebAudio 全方法吃掉） ----------
function makeStub() {
  const fn = function () { return proxy; };
  const proxy = new Proxy(fn, {
    get: (t, k) => {
      if (k === Symbol.toPrimitive) return () => 0;
      if (k in t) return t[k]; // 垫片显式赋值的属性（addEventListener 等）真实返回
      if (k === 'width' || k === 'height' || k === 'clientX' || k === 'clientY') return 0;
      return proxy;
    },
    set: (t, k, v) => { t[k] = v; return true; }, // 保存显式赋值
    apply: () => proxy
  });
  return proxy;
}

// ---------- wx mock ----------
const storage = {};
const touchReg = { start: [], move: [], end: [], cancel: [] };
globalThis.wx = {
  getSystemInfoSync: () => ({ windowWidth: 420, windowHeight: 720, pixelRatio: 2 }),
  createCanvas: () => makeStub(),
  getStorageSync: k => (k in storage ? storage[k] : ''),
  setStorageSync: (k, v) => { storage[k] = String(v); },
  removeStorageSync: k => { delete storage[k]; },
  onTouchStart: f => touchReg.start.push(f),
  onTouchMove: f => touchReg.move.push(f),
  onTouchEnd: f => touchReg.end.push(f),
  onTouchCancel: f => touchReg.cancel.push(f),
  createWebAudioContext: () => makeStub(),
  setClipboardData: () => {},
  vibrateShort: () => {}
};

// ---------- GameGlobal 环境 ----------
globalThis.GameGlobal = globalThis;
globalThis.requestAnimationFrame = fn => setTimeout(() => fn(Date.now()), 16);
globalThis.console = console;

// ---------- 加载并驱动 ----------
require(path.resolve(__dirname, '../wechat/wx-shim.js')); // 垫片先于 bundle（同 game.js 顺序）
require(path.resolve(__dirname, '../wechat/bundle.js'));

function tap(x, y) {
  const t = { identifier: 0, clientX: x, clientY: y };
  const e = { changedTouches: [t], touches: [t] };
  touchReg.start.forEach(f => f(e));
  touchReg.end.forEach(f => f(e));
}

const out = { errs: [] };
process.on('uncaughtException', e => out.errs.push(e.message));

setTimeout(() => {
  try {
    out.hasMG = !!globalThis.MG;
    out.hasConfig = !!(globalThis.MG && MG.config);
    out.state0 = MG.probe().state;                 // 期望 menu
    // 点「开始游戏」按钮（菜单中心 210,426）→ 经 wx.onTouchStart/End → canvas pointerdown/up → restart
    tap(210, 426);
    out.state1 = MG.probe().state;                 // 期望 play
    out.score1 = MG.probe().score;
    out.storageKeys = Object.keys(storage).filter(k => k.indexOf('mg_') === 0).slice(0, 8);
    // 步进几秒：让 update/render 各跑几帧（headless 不开，靠 rAF setTimeout 自然跑）
    setTimeout(() => {
      out.finalState = MG.probe().state;
      console.log(JSON.stringify(out));
      process.exit(0);
    }, 1200);
  } catch (e) { out.errs.push(e.message); console.log(JSON.stringify(out)); process.exit(1); }
}, 800);
