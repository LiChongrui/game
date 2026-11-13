(function () {
  var G = GameGlobal;
  var sys = wx.getSystemInfoSync();

  var mainCanvas = wx.createCanvas();
  mainCanvas.style = {};
  mainCanvas.getBoundingClientRect = function () {
    return { left: 0, top: 0, width: sys.windowWidth, height: sys.windowHeight };
  };

  G.window = G;
  G.innerWidth = sys.windowWidth;
  G.innerHeight = sys.windowHeight;
  G.devicePixelRatio = Math.min(sys.pixelRatio || 2, 2);
  var perf = G.performance;
  if (!perf) perf = G.performance = { now: function () { return Date.now(); } };
  if (!G.requestAnimationFrame) {
    G.requestAnimationFrame = function (fn) { return setTimeout(function () { fn(Date.now()); }, 16); };
  }

  var ls = G.localStorage = {
    getItem: function (k) {
      try { var v = wx.getStorageSync(String(k)); return (v === '' || v == null) ? null : String(v); }
      catch (e) { return null; }
    },
    setItem: function (k, v) { try { wx.setStorageSync(String(k), String(v)); } catch (e) {} },
    removeItem: function (k) { try { wx.removeStorageSync(String(k)); } catch (e) {} }
  };

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
        if (ms >= 40) {
          wx.vibrateLong({ fail: function () { try { wx.vibrateShort({ type: 'heavy' }); } catch (e2) {} } });
        } else {
          wx.vibrateShort({
            type: ms >= 20 ? 'heavy' : 'medium',
            fail: function () { try { wx.vibrateShort(); } catch (e2) {} }
          });
        }
      } catch (e) {}
    }
  };

  var doc = G.document = {
    getElementById: function () { return mainCanvas; },
    createElement: function (tag) {
      if (tag === 'canvas') { var c = wx.createCanvas(); c.style = {}; return c; }
      return {};
    },
    documentElement: mainCanvas,
    body: { appendChild: function () {}, removeChild: function () {} }
  };

  G.AudioContext = function () { return wx.createWebAudioContext(); };

  var safeTop = 0;
  try {
    var mb = wx.getMenuButtonBoundingClientRect ? wx.getMenuButtonBoundingClientRect() : null;
    if (mb && mb.bottom > 0) safeTop = mb.bottom + 8;
    else if (sys.statusBarHeight) safeTop = sys.statusBarHeight + 44;
  } catch (e) {}
  G.__safeTop = safeTop;

  var handlers = { canvas: {}, window: {} };
  function emit(list, ev) {
    for (var i = 0; i < list.length; i++) {
      try { list[i](ev); } catch (e) { console.error('shim handler error', e); }
    }
  }
  function touchEvent(e) {
    var t = (e.changedTouches && e.changedTouches[0]) || (e.touches && e.touches[0]) || {};
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
    if (type === 'resize' || type === 'orientationchange') return;
    (handlers.window[type] = handlers.window[type] || []).push(fn);
  };
  bindWxTouch(wx.onTouchStart, 'pointerdown');
  bindWxTouch(wx.onTouchMove, 'pointermove');
  bindWxTouch(wx.onTouchEnd, 'pointerup');
  bindWxTouch(wx.onTouchCancel, 'pointercancel');

  G.__shim = { window: G, document: doc, localStorage: ls, navigator: nav, performance: perf };
})();
