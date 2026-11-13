const path = require('path');

function makeStub() {
  const fn = function () { return proxy; };
  const proxy = new Proxy(fn, {
    get: (t, k) => {
      if (k === Symbol.toPrimitive) return () => 0;
      if (k in t) return t[k];
      if (k === 'width' || k === 'height' || k === 'clientX' || k === 'clientY') return 0;
      return proxy;
    },
    set: (t, k, v) => { t[k] = v; return true; },
    apply: () => proxy
  });
  return proxy;
}

const storage = {};
const touchReg = { start: [], move: [], end: [], cancel: [] };
const SCREEN_H = 780;
globalThis.wx = {
  getSystemInfoSync: () => ({
    windowWidth: 420, windowHeight: SCREEN_H, pixelRatio: 2, screenHeight: SCREEN_H
  }),
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

globalThis.GameGlobal = globalThis;
globalThis.requestAnimationFrame = fn => setTimeout(() => fn(Date.now()), 16);
globalThis.console = console;

require(path.resolve(__dirname, '../wechat/wx-shim.js'));
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
    out.noSafeInset = globalThis.__safeInset == null;
    out.geo = MG.probe().oy != null ? { oy: MG.probe().oy, VH: MG.probe().VH, floorY: MG.probe().floorY, ct: MG.probe().containerTop } : null;
    out.state0 = MG.probe().state;
    var vs = Math.min(420 / 420, SCREEN_H / 720);
    out.vs = vs;
    tap(210 * vs, 426 * vs);
    out.state1 = MG.probe().state;
    out.score1 = MG.probe().score;
    out.storageKeys = Object.keys(storage).filter(k => k.indexOf('mg_') === 0).slice(0, 8);
    setTimeout(() => {
      out.finalState = MG.probe().state;
      console.log(JSON.stringify(out));
      process.exit(0);
    }, 1200);
  } catch (e) { out.errs.push(e.message); console.log(JSON.stringify(out)); process.exit(1); }
}, 800);
