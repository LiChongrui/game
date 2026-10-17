// 水滴合成深海 - 微信小游戏环境垫片
// 在 bundle.js 之前加载：把 wx API 桥接成游戏源码依赖的最小 DOM 环境，
// 游戏八个模块（platform/config/physics/core/systems/panels/render/main）零改动。
// 依赖面（自源码 grep 全量核对）：
//   window / window.MG / innerWidth/Height / devicePixelRatio / addEventListener(resize|pointerup|keydown)
//   document.getElementById('game') / createElement('canvas') / documentElement / body
//   canvas.style / canvas.addEventListener(pointerdown|move|up|cancel) / toDataURL（仅调试导出用）
//   localStorage（platform.js 存储层）/ navigator.clipboard / navigator.vibrate
//   AudioContext（合成音效，全链路 try/catch，桥失败仅静音）/ performance.now / requestAnimationFrame
(function () {
  var G = GameGlobal;
  var sys = wx.getSystemInfoSync();

  // 主画布：wx.createCanvas 首次调用返回主屏画布，之后调用返回离屏画布
  var mainCanvas = wx.createCanvas();
  mainCanvas.style = {}; // core.js fit() 会写 style.width/height，微信无 style，给空对象接住
  // systems.js toLocal() 用 getBoundingClientRect 把屏幕坐标转逻辑坐标——微信 canvas 没有
  // 该方法；游戏画布恒铺满窗口且从 (0,0) 起，返回恒等矩形（left/top=0）即可
  mainCanvas.getBoundingClientRect = function () {
    return { left: 0, top: 0, width: sys.windowWidth, height: sys.windowHeight };
  };

  // window → GameGlobal（游戏里 window.MG / window.AudioContext 等全部落在这里）
  G.window = G;
  G.innerWidth = sys.windowWidth;
  G.innerHeight = sys.windowHeight;
  G.devicePixelRatio = Math.min(sys.pixelRatio || 2, 2);
  var perf = G.performance;
  if (!perf) perf = G.performance = { now: function () { return Date.now(); } };
  if (!G.requestAnimationFrame) {
    G.requestAnimationFrame = function (fn) { return setTimeout(function () { fn(Date.now()); }, 16); };
  }

  // localStorage → 微信同步存储（platform.js 的 get/set 直接用 localStorage）
  var ls = G.localStorage = {
    getItem: function (k) {
      try { var v = wx.getStorageSync(String(k)); return (v === '' || v == null) ? null : String(v); }
      catch (e) { return null; }
    },
    setItem: function (k, v) { try { wx.setStorageSync(String(k), String(v)); } catch (e) {} },
    removeItem: function (k) { try { wx.removeStorageSync(String(k)); } catch (e) {} }
  };

  // navigator：剪贴板接 wx.setClipboardData（分享文案复制直接成功）；
  // 振动接【手机设备马达】（wx.vibrateShort/vibrateLong）——是硬件震动反馈，
  // 不是画面/窗口抖动（画面摇晃是游戏内 addShake 的独立视觉特效，与此无关）；
  // ms 映射强度（<20 light / <40 medium / ≥40 长震），与 core.js hap() 时长语义一致
  var nav = G.navigator = {
    clipboard: {
      writeText: function (t) {
        try { wx.setClipboardData({ data: String(t) }); } catch (e) {}
        return Promise.resolve();
      }
    },
    vibrate: function (ms) {
      try {
        ms = ms || 20;
        if (ms >= 40) wx.vibrateLong();
        else wx.vibrateShort({ type: ms >= 20 ? 'medium' : 'light' });
      } catch (e) {}
    }
  };

  // document：主画布 getElementById('game')；离屏 canvas createElement('canvas')（iconData 调试用）
  var doc = G.document = {
    getElementById: function () { return mainCanvas; },
    createElement: function (tag) {
      if (tag === 'canvas') { var c = wx.createCanvas(); c.style = {}; return c; }
      return {};
    },
    documentElement: mainCanvas,
    body: { appendChild: function () {}, removeChild: function () {} }
  };

  // AudioContext 桥：微信基础库 2.19+ 的 WebAudioContext。游戏音效全链路
  // try/catch + 空值守卫（core.js audio 段），桥不兼容时只静音不崩。
  G.AudioContext = function () { return wx.createWebAudioContext(); };

  // 顶部保留区：状态栏/手势条仍按正常区域对待（用户定版），但胶囊（···◎）由微信
  // 强制悬浮在右上角，HUD 右上角的静音按钮必须让位。取胶囊下缘 + 8px 供 core.fit()
  // 把游戏块贴到其正下方（oy 顶贴）；Web 无胶囊 → __safeTop=0 → 块直接贴屏顶。
  var safeTop = 0;
  try {
    var mb = wx.getMenuButtonBoundingClientRect ? wx.getMenuButtonBoundingClientRect() : null;
    if (mb && mb.bottom > 0) safeTop = mb.bottom + 8;
    else if (sys.statusBarHeight) safeTop = sys.statusBarHeight + 44;
  } catch (e) {}
  G.__safeTop = safeTop;

  // ---------- 事件桥：pointer* → wx.onTouch* ----------
  // canvas 与 window 各留一张 handler 表；touchend 同时喂 pointerup（canvas 的 tryDrop 与
  // window 的 audio.ensure 各取所需），多点触控取 changedTouches[0]。
  var handlers = { canvas: {}, window: {} };
  function emit(list, ev) {
    for (var i = 0; i < list.length; i++) {
      try { list[i](ev); } catch (e) { console.error('shim handler error', e); }
    }
  }
  function touchEvent(e) {
    var t = (e.changedTouches && e.changedTouches[0]) || (e.touches && e.touches[0]) || {};
    // y 不在垫片补偿：局内渲染下压 safeTop 的补偿在游戏 toLocal 里按 state 区分
    // （菜单态铺满全屏不偏移不补偿，垫片无法感知 state）
    return {
      clientX: t.clientX || 0,
      clientY: t.clientY || 0,
      pointerId: t.identifier || 0,
      preventDefault: function () {}
    };
  }
  function bindWxTouch(wxOn, pointerType) {
    wxOn(function (e) {
      var ev = touchEvent(e);
      emit(handlers.canvas[pointerType] || [], ev);
      emit(handlers.window[pointerType] || [], ev);
    });
  }
  mainCanvas.addEventListener = function (type, fn) {
    (handlers.canvas[type] = handlers.canvas[type] || []).push(fn);
  };
  G.addEventListener = function (type, fn) {
    if (type === 'resize' || type === 'orientationchange') return; // 竖屏固定，不响应
    (handlers.window[type] = handlers.window[type] || []).push(fn);
  };
  bindWxTouch(wx.onTouchStart, 'pointerdown');
  bindWxTouch(wx.onTouchMove, 'pointermove');
  bindWxTouch(wx.onTouchEnd, 'pointerup');
  bindWxTouch(wx.onTouchCancel, 'pointercancel');
  // keydown（audio.ensure 兜底）在触屏上不存在，挂空表即可（无触发方，无害）

  // 显式引用：部分小游戏运行环境的 document/window 是只读全局，直接赋值会被静默忽略
  // （真机实测：document.getElementById is not a function）。构建脚本据此在 bundle 头部
  // 注入 var 声明（模块作用域遮蔽环境全局），引用这里存好的垫片对象。
  G.__shim = { window: G, document: doc, localStorage: ls, navigator: nav, performance: perf };
})();
