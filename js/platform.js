window.MG = window.MG || {};

MG.platform = {
  isWx: (typeof wx !== 'undefined') && !!wx.getSystemInfoSync,

  get: function (k) {
    try { return localStorage.getItem(k); } catch (e) { return null; }
  },
  set: function (k, v) {
    try { localStorage.setItem(k, String(v)); } catch (e) {}
  },
  getJSON: function (k, fallback) {
    try {
      var v = this.get(k);
      return v == null ? fallback : JSON.parse(v);
    } catch (e) { return fallback; }
  },
  setJSON: function (k, v) { this.set(k, JSON.stringify(v)); },
  remove: function (k) {
    try { localStorage.removeItem(k); } catch (e) {}
  },
  reload: function () {
    try {
      if (this.isWx && typeof wx !== 'undefined' && wx.restartMiniProgram) { wx.restartMiniProgram(); return; }
    } catch (e) {}
    try { location.reload(); } catch (e2) {}
  },

  audioCtxClass: function () {
    return window.AudioContext || window.webkitAudioContext || null;
  },

  share: function (payload) {
    return false;
  },

  submitScore: function (score) {  },

  vibrate: function (ms) {
    if (navigator && navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) {} }
  }
};
