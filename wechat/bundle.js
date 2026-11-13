var window = GameGlobal.__shim.window;
var document = GameGlobal.__shim.document;
var localStorage = GameGlobal.__shim.localStorage;
var navigator = GameGlobal.__shim.navigator;
var performance = GameGlobal.__shim.performance;
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

;
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
  MG.titleFontFamily = FAMILY;
  if (isWx) {
    try {
      var fsm = wx.getFileSystemManager();
      var path = wx.env.USER_DATA_PATH + '/title_font.ttf';
      fsm.writeFileSync(path, b64ToAb(B64), 'binary');
      var fam = wx.loadFont(path);
      if (fam) MG.titleFontFamily = fam;
    } catch (e) {  }
  } else if (typeof FontFace === 'function' && document && document.fonts) {
    try {
      var ff = new FontFace(FAMILY, 'url(data:font/ttf;base64,' + B64 + ')');
      ff.load().then(function (f) { document.fonts.add(f); }).catch(function () {});
    } catch (e) {}
  }
})();

;
window.MG = window.MG || {};
MG.config = {
  W: 420,
  H: 840,
  floorY: 675,

  wall: 0,
  containerTop: 0,
  dangerY: 315,

  spawnY: 260,
  dropCooldown: 0.55,

  gravity: 1500,
  restitution: 0.12,
  friction: 0.10,
  dampPerStep: 0.9995,
  maxSpeed: 1500,
  substeps: 8,
  slop: 0.5,

  dangerTime: 3,
  dangerSpeed: 80,
  graceTime: 0.6,
  extGrace: 1.2,
  dangerWarnH: 120,

  comboWindow: 1.1,
  comboMaxMult: 4,
  rainCombo: 3,

  skills: [
    { key: 'swap',   name: '换滴', cost: 1 },
    { key: 'ripple', name: '涟漪', cost: 1 },
    { key: 'evap',   name: '蒸发', cost: 1 },
    { key: 'flow',   name: '水流', cost: 1 }
  ],

  ng: {
    unlockScore: 0,
    affixes: [
      { id: 'heavy', name: '重压深潜', desc: '重力 +80%',        grav: 1.8 },
      { id: 'storm', name: '疾风骤雨', desc: '潮汐间隔 -65%',    tideInt: 0.35 },
      { id: 'reef',  name: '暗礁密布', desc: '礁石概率 ×4',    ironX: 4 },
      { id: 'frost', name: '寒冰速冻', desc: '水滴 35% 落水即冻', ice: 0.35 }
    ]
  },

  dailyChal: {
    goalBestRatio: 0.35,
    goalMin: 3000,
    rewardBase: 1800,
    rewardStep: 200,
    rewardMax: 3200,
    charge: 1
  },

  offline: {
    minMins: 3,
    capMins: 480,
    perMinBase: 30,
    bestRatio: 0.0004
  },

  ripple: {
    power: 300,
    secondPower: 190,
    radius: 460,
    delay: 0.28,
    lift: 90
  },

  specialChance: 0.15,
  specialChanceMax: 0.34,
  specialStageBoost: 0.5,
  rune: {
    chance: 0.05,
    weights: { swap: 0.28, ripple: 0.24, evap: 0.20, flow: 0.28 }
  },
  skillMaxQ: 5,
  guideLen: 170,
  vortex: {
    pullR: 190,
    pullF: 430,
    delay: 0.35,
    life: 1.6,
    score: 8
  },
  cloud: {
    splitDelay: 0.55,
    minSplit: 2,
    maxSplit: 3,
    maxTier: 2,
    score: 2
  },
  ice: {
    freezeTime: 4.5,
    radiusFactor: 2.4,
    score: 5
  },
  iron: {
    chance: 0.05,
    maxActive: 5,
    cooldownDrops: 5,
    r: 34,
    massMult: 16,
    evaporateScore: 0,
    evapCost: 2,
    hp: 4.0,
    erodeScore: 0,
    pairScore: 15,
    tideNeed: 0.15,
    taxPer: 0.06,
    taxMax: 0.30,
    blastR: 90,
    blastShockR: 230,
    blastShockF: 950,
    gambleShockR: 180,
    gambleShockF: 620
  },

  combo: {
    siphonR: 160,
    siphonF: 25,
    iceR: 95
  },

  dexGate: [0, 0, 0, 0, 0, 500, 3000, 10000, 30000],
  spawnGate: [0, 0, 0, 800, 2500],
  specialStage: {
    rune: 0, chest: 0,
    iron: 1, cloud: 1,
    ice: 2, vortex: 2,
    rainbow: 3, gale: 3,
    magnet: 4, spring: 4,
    thunder: 5, pearl: 5,
    magma: 6, geyser: 6,
    void: 7, aurora: 7
  },
  magnet:   { delay: 0.4, life: 1.8, pullR: 250, pullF: 620, score: 150 },
  magmaR: 95, magmaScore: 70,
  geyserW: 120, geyserF: 400,
  voidN: 5, voidScore: 90,
  auroraMult: 3,

    tide: {
    cycleInterval: 42,
    duration: 7,
    durationMax: 9,
    buoyancy: 4000,
    lowFrac: 0.25,
    highFrac: 0.75,
    warnTime: 3
  },

  tideBless: {
    chance: 0.4,
    minDrops: 4
  },

  seaEvent: {
    interval: 26,
    jitter: 4,
    blessAfterCrisis: true
  },

  ramp: {
    minutes: 14,
    tideIntervalMin: 16,
    ironChanceMax: 0.11,
    spawnWeightsMax: [22, 24, 22, 16, 16]
  },

  climaxEvery: 1500,

  questScoreBase: 35,
  questScoreStep: 22,

  dexBonusMult: 10,
  seaBonus: 300,
  seaMultStep: 0.25,

  multCap: 8,

  daily: {
    rewardScore: 150,
    streakBase: 100,
    streakStep: 50
  },

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

  spawnWeights: [30, 26, 22, 14, 8],

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
window.MG = window.MG || {};
MG.layout = {
  hud: null, body: null, band: null, panel: null, menu: null,
  dy: 0,

  build: function () {
    var C = MG.config, W = C.W, H = C.H;
    var dy = H - 840;
    this.dy = dy;
    C.floorY = H - 75;
    C.containerTop = 0;
    C.dangerY = 315 + dy;
    C.spawnY = 260 + dy;

    this.hud = {
      row1Y: 40,
      trophyCy: 35,
      setCx: 25,
      rowBtnR: 18,
      scoreY: 85,
      seaBar: { sx: 25, sy: 98, sw: W - 50, sh: 24 },
      quest: { qx: 15, qy: 125, qw: 285, qh: 60 },
      tidePill: { side: 'right', margin: 25, ty: 135, th: 44 },
      hudBottom: 190
    };

    this.body = {
      containerTop: C.containerTop,
      dangerY: C.dangerY,
      floorY: C.floorY,
      spawnY: C.spawnY,
      spawnGap: C.dangerY - C.spawnY,
      mirrorCy: C.dangerY + (C.dangerY - C.spawnY),
      stackCy: (C.dangerY + C.floorY) / 2,
      tutY: 535 + dy
    };

    var btnCx = [], bi;
    for (bi = 0; bi < 6; bi++) btnCx.push(35 + bi * (W - 70) / 5);
    this.band = {
      top: C.floorY,
      h: H - C.floorY,
      btnCy: C.floorY + 30,
      btnCx: btnCx,
      btnR: 20,
      labelDy: 10,
      decorBase: C.floorY + 20,
      dunes: [
        { x: 85,  dy: 10, rx: 95,  ry: 15, c: 'rgba(238,246,240,0.7)', c0: 'rgba(238,246,240,0)' },
        { x: 315, dy: 15, rx: 115, ry: 15, c: 'rgba(238,246,240,0.7)', c0: 'rgba(238,246,240,0)' },
        { x: 195, dy: 20, rx: 85,  ry: 10, c: 'rgba(228,240,234,0.55)', c0: 'rgba(228,240,234,0)' }
      ],
      pebbleYOff: (C.floorY + 20) - 665,
      pebbles: [[25, 685, 2.5], [65, 700, 2.5], [110, 685, 2.5], [170, 700, 2.5],
                [245, 690, 2.5], [305, 700, 2.5], [350, 685, 2.5], [405, 695, 2.5]],
      starfish: { x: 90, y: 700, s: 10 },
      shell: { x: 330, y: 700, s: 10 }
    };

    this.panel = {
      focusCy: 465 + dy,
      over: { w: 320, h: 470 },
      share: { w: 300, h: 420 },
      confirm: { w: 300, h: 224, btnH: 42, btnGap: 12, btnTop: 54 },
      ng: { w: 330, h: 350 },
      dex: { x: 20, w: 380, h: 600 },
      dexY: 120 + dy,
      set: { w: 300, h: 260, rowDy: 50, rowGap: 66, rowH: 56, rowW: 260 },
      setClear: { w: 300, h: 180, btnH: 42, btnGap: 12, btnTop: 108 }
    };

    this.menu = {
      titleY: 130 + dy, subY: 148 + dy,
      tileW: 64, tileH: 64,
      tileLX: 55, tileRX: 365,
      tileTop: 246 + dy, tileGap: 78,
      mascotCy: 430 + dy,
      offlineY: 565 + dy, offlineW: 300, offlineH: 80,
      startY: 690 + dy, startW: 260, startH: 65
    };
  },

  menuTileRect: function (side, i) {
    var m = this.menu;
    var cx = side === 'L' ? m.tileLX : m.tileRX;
    return { x: cx - m.tileW / 2, y: m.tileTop + i * m.tileGap, w: m.tileW, h: m.tileH };
  },

  overRect: function () {
    var p = this.panel.over, W = MG.config.W;
    return { x: (W - p.w) / 2, y: this.panel.focusCy - p.h / 2, w: p.w, h: p.h };
  },
  shareRect: function () {
    var p = this.panel.share, W = MG.config.W;
    return { x: (W - p.w) / 2, y: this.panel.focusCy - p.h / 2, w: p.w, h: p.h };
  },
  confirmRect: function () {
    var p = this.panel.confirm, W = MG.config.W;
    return { x: (W - p.w) / 2, y: (840 - p.h) / 2 + this.dy, w: p.w, h: p.h };
  },
  confirmBtnRect: function (i) {
    var r = this.confirmRect(), p = this.panel.confirm;
    return { x: r.x + 24, y: r.y + p.btnTop + i * (p.btnH + p.btnGap), w: r.w - 48, h: p.btnH };
  },
  confirmCloseRect: function () {
    var r = this.confirmRect();
    return { x: r.x + r.w - 40, y: r.y + 8, w: 30, h: 30 };
  },
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
    return { x: r.x + r.w - 40, y: r.y + 8, w: 30, h: 30 };
  },
  setClearRect: function () {
    var p = this.panel.setClear, W = MG.config.W;
    return { x: (W - p.w) / 2, y: (840 - p.h) / 2 + this.dy, w: p.w, h: p.h };
  },
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
  },
};
MG.layout.build();

;
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
      dangerT: 0,
      grace: C.graceTime
    };
    this.bodies.push(b);
    return b;
  };

  Physics.prototype.remove = function (b) {
    var i = this.bodies.indexOf(b);
    if (i >= 0) this.bodies.splice(i, 1);
  };

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

          var ironPair = !!(a.iron || o.iron);
          var overlap = minD - dist - (ironPair ? 0 : C.slop);
          if (overlap <= 0) continue;

          var ma = a.m || a.r * a.r, mo = o.m || o.r * o.r;
          var invA = 1 / ma, invO = 1 / mo, invSum = invA + invO;

          var corr = overlap / invSum * (ironPair ? 1.0 : 0.8);
          a.x -= nx * corr * invA; a.y -= ny * corr * invA;
          o.x += nx * corr * invO; o.y += ny * corr * invO;

          var rvx = o.vx - a.vx, rvy = o.vy - a.vy;
          var vn = rvx * nx + rvy * ny;
          if (vn < 0) {
            var jn = -(1 + e) * vn / invSum;
            a.vx -= jn * nx * invA; a.vy -= jn * ny * invA;
            o.vx += jn * nx * invO; o.vy += jn * ny * invO;

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
  var C = MG.config;
  var T = C.tiers;
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

  var canvas = document.getElementById('game');
  var _qs = '';
  try { _qs = (window.location && window.location.search) || ''; } catch (e) { _qs = ''; }
  var forceCpu = /(\?|&)cpu=1(\b|&)/.test(_qs);
  var ctx = canvas.getContext('2d', { alpha: false, willReadFrequently: forceCpu });
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var VH = C.H;
  var LW = C.W;
  var BX = 0;
  var FLOORY = C.floorY;
  var view = { s: 1 };
  var oy = 0;
  var renderOy = 0;
  var hudInset = 0;

  function fit() {
    var w = window.innerWidth, h = window.innerHeight;
    MG.layout.build();
    view.s = Math.min(w / C.W, h / C.H);
    VH = h / view.s;
    LW = w / view.s;
    BX = (LW - C.W) / 2;
    oy = Math.max(0, (VH - C.H) / 2);
    var capBottom = window.__safeTop ? (window.__safeTop - 10) / view.s : 0;
    hudInset = Math.max(0, Math.min(capBottom - oy - (MG.layout.hud.trophyCy - 16), 25));
    FLOORY = MG.layout.body.floorY;
    var nw = Math.round(w * dpr), nh = Math.round(h * dpr);
    if (canvas.width !== nw) canvas.width = nw;
    if (canvas.height !== nh) canvas.height = nh;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    var cy = MG.layout.band.btnCy;
    if (typeof bookBtn !== 'undefined' && typeof restartBtn !== 'undefined' && typeof SKILL_BTNS !== 'undefined') {
      bookBtn.cy = cy; restartBtn.cy = cy;
      for (var i = 0; i < SKILL_BTNS.length; i++) SKILL_BTNS[i].cy = cy;
    }
  }
  window.addEventListener('resize', fit);
  window.addEventListener('orientationchange', fit);
  if (window.ResizeObserver) {
    new ResizeObserver(fit).observe(document.documentElement);
  }

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

  var SAVE_VERSION = 1;
  function migrateSave() {
    var ver = parseInt(MG.platform.get('mg_ver'), 10);
    if (isNaN(ver)) ver = 0;
    if (ver > SAVE_VERSION) return;
    MG.platform.set('mg_ver', String(SAVE_VERSION));
  }
  migrateSave();

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
      this.blip(110, 0.9, 'sine', 0.14, 2.2);
      this.blip(165, 0.7, 'triangle', 0.07, 2.0);
      hap(40);
    }
  };

  function hap(ms) {}

  audio.bgm = {
    on: false, iv: null, step: 0, _live: [], _flt: null, _masterGain: null, _lfo: null, _amb: null,
    chords: [
      [261.63, 329.63, 392.00, 493.88],
      [220.00, 261.63, 329.63, 392.00],
      [174.61, 220.00, 261.63, 349.23],
      [196.00, 246.94, 293.66, 392.00]
    ],
    arps: [
      [523.25, 659.25, 783.99, 1046.50],
      [440.00, 523.25, 659.25, 880.00],
      [523.25, 698.46, 880.00],
      [587.33, 783.99, 987.77]
    ],
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
          var b = c.createOscillator(), bg = c.createGain();
          b.type = 'triangle'; b.frequency.value = ch[0] / 2;
          bg.gain.setValueAtTime(0.0001, t0);
          bg.gain.linearRampToValueAtTime(0.038, t0 + 1.2);
          bg.gain.setValueAtTime(0.038, t0 + 2.4);
          bg.gain.linearRampToValueAtTime(0.0001, t0 + 4.05);
          b.connect(bg); bg.connect(dst);
          b.start(t0); b.stop(t0 + 4.1);
          self._live.push({ o: b, g: bg });
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
    setDanger: function (x) {
      if (!audio.ctx || !this._flt || !audio.musicOn) return;
      try { this._flt.frequency.setTargetAtTime(1150 - x * 480, audio.ctx.currentTime, 0.5); } catch (e) {}
    },
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
      try { if (this._amb) { this._amb.src.stop(); this._amb.lfo.stop(); } } catch (e) {}
      this._amb = null;
      try { if (this._drone) { this._drone.o.stop(); this._drone = null; } } catch (e) {}
    }
  };

;
  var phys = new MG.Physics();
  var state = 'menu';
  var menuStartBtn = { x: C.W / 2 - MG.layout.menu.startW / 2, y: MG.layout.menu.startY, w: MG.layout.menu.startW, h: MG.layout.menu.startH };
  var menuTrans = { dir: null, t0: -9, dur: 1.1, sx: 0, sy: 0, snap: null };
  function startTransition(dir, cx, cy) {
    menuTrans.dir = dir;
    menuTrans.t0 = performance.now() / 1000;
    menuTrans.sx = cx; menuTrans.sy = cy;
    menuTrans.snap = null;
  }
  var menuTiles = [
    { side: 'L', i: 0, icon: '📋', label: '每日任务', act: function () { achOpen = true; dexOpen = false; dexTab = 1; } },
    { side: 'L', i: 1, icon: '🎯', label: '每日挑战', act: function () { achOpen = true; dexOpen = false; dexTab = 2; } },
    { side: 'R', i: 0, icon: '🏆', label: '成就', act: function () { achOpen = true; dexOpen = false; dexTab = 0; achScroll = 0; } },
    { side: 'R', i: 1, icon: '🥇', label: '榜单', act: function () { achOpen = true; dexOpen = false; dexTab = 3; } }
  ];
  for (var mti = 0; mti < menuTiles.length; mti++) menuTiles[mti].pressT = 0;
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
  var best = 0;
  var nextTier = rollTier();
  var nextSpecial, nextRune, nextIron;
  rollNextDrop();
  var runeHintShown = false;
  var aimX = C.W / 2;
  var aiming = false;
  var cooldown = 0;
  var combo = 0, comboTimer = 0, maxCombo = 0;
  var doubled = false;
  var reviveCount = 0;
  var popups = [], parts = [];
  var rippleQueue = [];
  var time = 0;
  var overButtons = [];
  var shakeT = 0, shakeAmp = 0;
  var dangerAlert = 0;
  var dangerRemain = 0;

  var skillCharge = { swap: 0, ripple: 0, evap: 0, flow: 0 };
  var chest = null;
  var chestTimer = 45 + Math.random() * 25;
  var questStaleT = 4;
  var seaEvent = { timer: (C.seaEvent ? C.seaEvent.interval : 26) - 8 + Math.random() * 8, type: null, t: 0, t0: 6, x: 0, y: 0, data: null, nextForced: null };
  var rippleMode = false;
  var flowMode = false;
  var flowPick = null;
  var dexLoaded = loadDex();
  var dexUnlocked = dexLoaded.u;
  var dexCounts = dexLoaded.c;
  var dexSpecial = dexLoaded.sp;
  var careerPeak = parseFloat(MG.platform.get('mg_peak')) || 0;
  var dexTab = 0;
  var achScroll = 0;
  var achDrag = null;
  var dexSelSp = -1;
  var dexSec = 0;
  var dexSelTier = -1;
  var dexSelStage = -1;
  var lifeStats = (function () {
    var d = { chest: 0, tide: 0, ironPair: 0, rainbow: 0, quest: 0, combo: 0, best: 0 };
    var s = dexLoaded.stats || {};
    for (var k in d) if (typeof s[k] === 'number' && s[k] > d[k]) d[k] = s[k];
    return d;
  })();
  var achDone = dexLoaded.ach;
  var colClaimed = dexLoaded.col;
  var offlineGain = (function () {
    var seen = parseInt(MG.platform.get('mg_seen')) || 0;
    var now = Date.now();
    saveNum('mg_seen', now);
    if (!seen) return null;
    var rawMins = Math.floor((now - seen) / 60000);
    if (rawMins < C.offline.minMins) return null;
    var mins = Math.min(rawMins, C.offline.capMins);
    var anchor = Math.max(parseInt(MG.platform.get('mg_best')) || 0, lifeStats.best || 0);
    var perMin = C.offline.perMinBase + Math.floor(anchor * C.offline.bestRatio);
    return { mins: rawMins, gain: perMin * mins };
  })();
  var seenTick = 0;
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
  var achOpen = false;
  var lastPointer = { x: -100, y: -100 };

  var quest = null, questDepth = 0;

  var levelElapsed = 0;
  var lifeScore = 0, runCounted = 0;
  function totalScore() { return lifeScore + (score - runCounted); }

  var tide = { phase: 'idle', timer: C.tide.cycleInterval, progress: 0, banner: 0 };
  var achTick = 0;
  var endlessT = 0, rampStage = 0;
  var climaxMark = 0;
  var tideKillHint = false;
  var dropCount = 0, tutDone = loadFlag('mg_tut');
  var TUT_STEPS = [
    '按住屏幕左右拖动瞄准，松手投下水滴',
    '低级水滴先垫底，给大水滴留空间',
    '相同水滴碰到一起就会合成升级',
    '水堆漫过警戒线并停住就输了——留意上方白线',
    '合成带符文的水滴，可为底部对应技能充能'
  ];
  function endlessRamp() {
    return Math.min(1, endlessT / (C.ramp.minutes * 60));
  }
  function perkOn(id) { return !!achDone[id]; }
  function perkMult() { return (achDone.tide12 && tide.progress > 0.2) ? 1.1 : 1; }
  var ironN = 0;
  function reefTax() {
    var n = ironN;
    if (n <= 0) return 1;
    return Math.max(1 - C.iron.taxMax, 1 - C.iron.taxPer * n);
  }
  function cm(m) { return Math.min(m * reefTax(), C.multCap); }

  function skillUnlocked(key) { return !!runeSeen[key]; }

  var ng = { unlocked: true, active: null };
  var ngOpen = false, ngPicks = [];
  var ngPickRects = [];
  var GRAV0 = C.gravity;
  function ngStartRun(affix, fromDaily) {
    restart();
    ng.active = affix;
    ng.fromDaily = !!fromDaily;
    C.gravity = GRAV0 * (affix.grav || 1);
    addPopup(C.W / 2, 300, (fromDaily ? '每日挑战 ·「' : '深渊潜航 ·「') + affix.name + '」', true, 0, 0, 'world');
    ngOpen = false;
  }
  function ngEndRun() {
    if (!ng.active) return;
    ng.active = null;
    ng.fromDaily = false;
    C.gravity = GRAV0;
  }
  function openNgPick() {
    var pool = C.ng.affixes.slice(), picks = [];
    while (picks.length < 3 && pool.length) picks.push(pool.splice((Math.random() * pool.length) | 0, 1)[0]);
    ngPicks = picks;
    ngPickRects = [];
    ngOpen = true;
    audio.blip(460, 0.12, 'sine', 0.08, 0.6);
  }

  var stageSeen = -1;
  var seaFade = null;
  function seaStage() {
    var s = 0, ts = totalScore();
    for (var i = C.seaStages.length - 1; i >= 0; i--) { if (ts >= C.seaStages[i].at) { s = i; break; } }
    return s;
  }
  function seaBlend() {
    if (!seaFade) return null;
    var p = seaFade.t / seaFade.dur;
    if (p >= 1) return null;
    p = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
    return { from: seaFade.from, to: seaFade.to, k: p };
  }
  function seaProgress() {
    var n = C.seaStages.length, last = n - 1, ts = totalScore();
    if (ts >= C.seaStages[last].at) return 1;
    var i = 0;
    for (var k = last - 1; k >= 0; k--) { if (ts >= C.seaStages[k].at) { i = k; break; } }
    var lo = C.seaStages[i].at, hi = C.seaStages[i + 1].at;
    var f = hi > lo ? (ts - lo) / (hi - lo) : 0;
    return Math.max(0, Math.min(1, (i + f) / last));
  }

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
    for (var i = extras.length - 1; i > 0; i--) {
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
    if (!d || d.ver !== 4 || d.date !== today) {
      var streak = (d && d.date === yesterdayStr()) ? (d.streak || 0) : 0;
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
      if (type === 'combo') daily.prog[i] = Math.min(t.need, Math.max(daily.prog[i], n || 0));
      else daily.prog[i] = Math.min(t.need, daily.prog[i] + (n || 1));
      if (daily.prog[i] >= t.need) {
        daily.done[i] = true;
        var gain = Math.round(C.daily.rewardScore * (1 + ((t.stars || 1) - 1) * 0.5) * scoreMult);
        score += gain;
        scoreBump = 0.35;
        addPopup(C.W / 2, 205, '每日任务完成 +' + gain, true, 0);
        audio.quest();
      }
    }
    var allOk = daily.tasks.length > 0;
    for (var ai = 0; ai < daily.tasks.length; ai++) if (!daily.done[ai]) { allOk = false; break; }
    if (!daily.allDone && allOk) {
      daily.allDone = true;
      if (!daily.streakToday) { daily.streakToday = true; daily.streak++; }
      var bonus = C.daily.streakBase + daily.streak * C.daily.streakStep;
      score += bonus;
      scoreBump = 0.4;
      addPopup(C.W / 2, 232, '今日全勤！连续 ' + daily.streak + ' 天 +' + bonus, true, 0);
      parts.push({ type: 'ring', x: C.W / 2, y: annY(232), r: 30, life: 0.7, max: 0.7, color: '#F5C542' });
      audio.quest();
    }
    saveDaily();
  }

  var DCHAL_AFFIXES = [
    { id: 'heavy',   name: '重压深潜', desc: '重力 +80%',              grav: 1.8 },
    { id: 'storm',   name: '疾风骤雨', desc: '潮汐间隔 -65%',          tideInt: 0.35 },
    { id: 'reef',    name: '暗礁密布', desc: '礁石概率 ×4',          ironX: 4 },
    { id: 'frost',   name: '寒冰速冻', desc: '水滴 35% 落水即冻',      ice: 0.35 },
    { id: 'abyss',   name: '深渊试炼', desc: '重力 +40% · 潮汐更频且潮期涌动加剧',  grav: 1.4, tideInt: 0.35, tideToss: 1.9 },
    { id: 'icereef', name: '冰礁交错', desc: '暗礁 ×5 且 45% 落水即冻', ironX: 5, ice: 0.45 }
  ];
  var dchal = (function () {
    var d = MG.platform.getJSON('mg_dchal', null) || {};
    if (d.date !== todayStr()) d = { date: todayStr(), done: false, streak: d.streak || 0, lastDate: d.lastDate || null, counts: d.counts || {} };
    if (!d.counts) d.counts = {};
    return d;
  })();
  function saveChal() { MG.platform.setJSON('mg_dchal', dchal); }
  var dchalRun = null;
  function dayChalIdx() {
    var d = new Date();
    return Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 864e5) % DCHAL_AFFIXES.length;
  }
  function dchalRoll() {
    var affix = DCHAL_AFFIXES[dayChalIdx()];
    var goal = Math.max(C.dailyChal.goalMin, Math.ceil((lifeStats.best || 3000) * C.dailyChal.goalBestRatio / 100) * 100);
    return { affix: affix, goal: goal, idx: dayChalIdx() };
  }
  function dchalStart() {
    if (state !== 'menu' && state !== 'over') return;
    var roll = dchalRoll();
    dchalRun = { goal: roll.goal, affixId: roll.affix.id };
    ngStartRun(roll.affix, true);
    achOpen = false;
    var br = dchalBtnRect();
    startTransition('in', br.x + br.w / 2, br.y + br.h / 2);
  }
  function dchalInfo() {
    var roll = dchalRoll(), list = [];
    for (var i = 0; i < DCHAL_AFFIXES.length; i++) {
      list.push({
        id: DCHAL_AFFIXES[i].id,
        name: DCHAL_AFFIXES[i].name, desc: DCHAL_AFFIXES[i].desc,
        count: (dchal.counts && dchal.counts[DCHAL_AFFIXES[i].id]) || 0,
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
  function checkDailyChallenge() {
    if (!ng.active || !ng.fromDaily || !dchalRun) return;
    if (dchal.date !== todayStr()) { dchal.date = todayStr(); dchal.done = false; saveChal(); }
    if (dchal.done) return;
    if (score < dchalRun.goal) return;
    dchal.done = true;
    dchal.streak = (dchal.lastDate === yesterdayStr()) ? (dchal.streak || 0) + 1 : 1;
    dchal.lastDate = todayStr();
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

  var RECENT_MAX = 10;
  var recent = MG.platform.getJSON('mg_recent', []) || [];
  function saveRecent() { try { MG.platform.setJSON('mg_recent', recent); } catch (e) {} }
  function recentBoard() {
    var rows = [];
    for (var i = 0; i < recent.length; i++) {
      var d = new Date(recent[i].ts);
      rows.push({ name: (d.getMonth() + 1) + '.' + d.getDate() + ' 局', score: recent[i].score, sea: recent[i].sea || 0, ts: recent[i].ts, me: false });
    }
    rows.sort(function (a, b) { return b.score - a.score; });
    return rows;
  }

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

  function bandX(i, n, pad) {
    var w = LW / n, p = pad || 0;
    var x = (i + 0.5) * w + (Math.random() - 0.5) * w * 0.8;
    return Math.min(LW - p, Math.max(p, x));
  }
  function scaleN(base, cap) { return Math.min(cap, Math.max(base, Math.round(base * LW / C.W))); }

  var bubbles = [];
  var BUB_N = scaleN(14, 30);
  for (var bi = 0; bi < BUB_N; bi++) {
    bubbles.push({
      x: bandX(bi, BUB_N, 4), y: Math.random() * VH,
      r: 1.5 + Math.random() * 3.5, sp: 12 + Math.random() * 22,
      sway: Math.random() * Math.PI * 2
    });
  }

  var fishes = [];
  var FISH_LOOK = [
    { tint: '158,206,228', tintD: '66,120,168', s: [6, 12],  sp: [26, 56] },
    { tint: '122,214,182', tintD: '34,132,110', s: [6, 12],  sp: [28, 58] },
    { tint: '96,164,232',  tintD: '30,88,168',  s: [8, 14],  sp: [34, 66] },
    { tint: '116,124,214', tintD: '52,56,140',  s: [5, 9],   sp: [18, 40] },
    { tint: '196,212,238', tintD: '110,130,168', s: [10, 16], sp: [22, 44] },
    { tint: '92,112,182',  tintD: '36,48,110',  s: [7, 12],  sp: [30, 62] },
    { tint: '226,142,96',  tintD: '150,62,36',  s: [8, 13],  sp: [30, 60] },
    { tint: '184,146,236', tintD: '96,62,168',  s: [6, 12],  sp: [24, 50] }
  ];
  function fishLook() { return FISH_LOOK[Math.min(seaStage(), FISH_LOOK.length - 1)]; }
  function resetFish(f, keepDir) {
    var lk = fishLook();
    f.stg = seaStage();
    f.dir = keepDir ? f.dir : (Math.random() < 0.5 ? 1 : -1);
    f.x = f.dir > 0 ? -70 : LW + 70;
    f.y = 110 + Math.random() * Math.max(240, VH - 220);
    f.sp = lk.sp[0] + Math.random() * (lk.sp[1] - lk.sp[0]);
    f.s = lk.s[0] + Math.random() * (lk.s[1] - lk.s[0]);
    f.tint = lk.tint; f.tintD = lk.tintD;
    f.wob = Math.random() * Math.PI * 2;
  }
  var FISH_N = Math.max(5, Math.round(LW / 170));
  for (var fi = 0; fi < FISH_N; fi++) {
    var nf = { tail: 0, dir: 1, x: 0, y: 0, sp: 0, s: 0, wob: 0, fade: 0, stg: 0, tint: '', tintD: '' };
    resetFish(nf);
    nf.x = bandX(fi, FISH_N, 0);
    nf.fade = 1;
    fishes.push(nf);
  }

  var jellies = [];
  var JELLY_N = Math.min(4, Math.max(2, Math.round(LW / 300)));
  for (var ji = 0; ji < JELLY_N; ji++) {
    jellies.push({
      x: bandX(ji, JELLY_N, 50),
      y: 240 + (ji * 170) % Math.max(200, VH - 320),
      s: 13 + Math.random() * 9,
      ph: Math.random() * Math.PI * 2,
      drift: 4 + Math.random() * 5,
      tint: (ji % 2) === 0 ? '255,175,205' : '185,160,255'
    });
  }

  var glitters = [];
  var GLI_N = scaleN(22, 46);
  for (var gi = 0; gi < GLI_N; gi++) {
    glitters.push({
      x: bandX(gi, GLI_N, 2), y: Math.random() * VH,
      r: 0.8 + Math.random() * 1.5,
      ph: Math.random() * Math.PI * 2, sp: 1.5 + Math.random() * 2.5
    });
  }

  function rollTier() {
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
    var cur = seaStage(), nSea = C.seaStages.length;
    var sf = nSea > 1 ? cur / (nSea - 1) : 0;
    var chance = C.specialChance + (C.specialChanceMax - C.specialChance) * sf;
    if (Math.random() >= chance) return null;
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
    if (seaStage() < ((C.specialStage && C.specialStage.iron != null) ? C.specialStage.iron : 0)) return false;
    if (seaEvent && seaEvent.type === 'storm') return false;
    if (ironCount() >= C.iron.maxActive) return false;
    if (reefCooldown > 0) { reefCooldown--; return false; }
    var ch = C.iron.chance + (C.ramp.ironChanceMax - C.iron.chance) * endlessRamp();
    if (ng && ng.active && ng.active.ironX) ch *= ng.active.ironX;
    ch *= (1 - ironCount() / C.iron.maxActive);
    return Math.random() < ch;
  }
  function rollRune() {
    var runeStage = (C.specialStage && typeof C.specialStage.rune === 'number') ? C.specialStage.rune : 2;
    if (seaStage() < runeStage) return null;
    if (Math.random() >= C.rune.chance) return null;
    var keys = [], ws = [], total = 0, k;
    for (k in C.rune.weights) {
      if (!C.rune.weights.hasOwnProperty(k)) continue;
      keys.push(k); ws.push(C.rune.weights[k]); total += C.rune.weights[k];
    }
    if (!keys.length) return null;
    var r = Math.random() * total, pick = keys[keys.length - 1];
    for (k = 0; k < keys.length; k++) { r -= ws[k]; if (r <= 0) { pick = keys[k]; break; } }
    seeRune(pick);
    return pick;
  }
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
    b.r = C.iron.r;
    b.m = C.iron.r * C.iron.r * C.iron.massMult;
    b.hp = C.iron.hp; b.hpMax = C.iron.hp;
    return b;
  }
  var reefCountPrev = 0;
  var ironGateHintT = -9;
  var reefCooldown = 0;
  function updateReefHint() {
    var n = ironN;
    if (n === reefCountPrev) return;
    if (n >= 2) addPopup(C.W / 2, 250, '礁石 ×' + n + ' · 全局收益 −' + Math.round((1 - reefTax()) * 100) + '%', false, 0);
    else if (n === 0 && reefCountPrev >= 2) addPopup(C.W / 2, 250, '礁石清空 · 收益恢复', false, 0);
    reefCountPrev = n;
  }
  function updateReefErode(dt) {
    if (ironN === 0) return;
    var bs = phys.bodies, i, j, b, o, dx, dy, d;
    for (i = 0; i < bs.length; i++) {
      b = bs[i];
      if (!b.iron || b.hp == null) continue;
      var touching = false;
      for (j = 0; j < bs.length; j++) {
        if (j === i) continue;
        o = bs[j];
        if (o.iron || o.chest || o.special) continue;
        dx = o.x - b.x; dy = o.y - b.y;
        d = Math.sqrt(dx * dx + dy * dy);
        if (d < (b.r + o.r) * 0.98) { touching = true; break; }
      }
      if (!touching) continue;
      b.hp -= dt;
      if (b.hp > 0) continue;
      dailyProgress('iron');
      addPopup(b.x, b.y - b.r - 8, '礁石磨碎', false, 0, 1.4, 'todo');
      for (var k = 0; k < 8; k++) {
        var ang = Math.random() * Math.PI * 2, sp = 40 + Math.random() * 90;
        parts.push({ type: 'dot', x: b.x, y: b.y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
          r: 1.5 + Math.random() * 2, life: 0.5, max: 0.5, color: '#9FB0BC' });
      }
      audio.freeze();
      if (b._cluster === 3) reefGambleBlast(b);
      phys.remove(b);
    }
  }
  function detonateReef(b, frac) {
    frac = (frac == null) ? 1 : frac;
    var cluster = [], stack = [b], seen = {}; seen[b.id] = 1;
    while (stack.length) {
      var cur = stack.pop(); cluster.push(cur);
      var nb = reefNeighbors(cur);
      for (var k = 0; k < nb.length; k++) if (!seen[nb[k].id]) { seen[nb[k].id] = 1; stack.push(nb[k]); }
    }
    var cx = 0, cy = 0;
    for (var c = 0; c < cluster.length; c++) { cx += cluster[c].x; cy += cluster[c].y; }
    cx /= cluster.length; cy /= cluster.length;
    var innerR = C.iron.blastR, shockR = C.iron.blastShockR;
    var shockF = C.iron.blastShockF * (0.6 + frac * 0.4);
    var launch = 0;
    for (var i = 0; i < phys.bodies.length; i++) {
      var o = phys.bodies[i];
      if (o.iron || o.chest) continue;
      var dx = o.x - cx, dy = o.y - cy, d = Math.sqrt(dx * dx + dy * dy);
      if (d >= shockR) continue;
      var f = shockF * (d < innerR ? 1 : 1 - (d - innerR) / (shockR - innerR));
      o.vx += (d > 0 ? dx / d : 0) * f * 0.3;
      o.vy -= f;
      launch++;
    }
    addPopup(cx, cy - 22, '礁石引爆 · 抛飞 ' + launch + ' 滴（当心越线！）', true, 0, 1.6, 'burst');
    addShake(6, 0.4);
    parts.push({ type: 'ring', x: cx, y: cy, r: shockR * 0.6, life: 0.5, max: 0.5, color: '#FFB24A' });
    parts.push({ type: 'ring', x: cx, y: cy, r: shockR, life: 0.6, max: 0.6, color: '#FFD27A' });
    audio.freeze();
    for (var c2 = 0; c2 < cluster.length; c2++) phys.remove(cluster[c2]);
  }
  function reefGambleBlast(b) {
    var shockR = C.iron.gambleShockR, shockF = C.iron.gambleShockF, launch = 0;
    for (var i = 0; i < phys.bodies.length; i++) {
      var o = phys.bodies[i];
      if (o.iron || o.chest) continue;
      var dx = o.x - b.x, dy = o.y - b.y, d = Math.sqrt(dx * dx + dy * dy);
      if (d >= shockR) continue;
      var f = shockF * (1 - d / shockR);
      o.vx += (d > 0 ? dx / d : 0) * f * 0.3;
      o.vy -= f;
      launch++;
    }
    addPopup(b.x, b.y - b.r - 10, '换险！抛飞 ' + launch + ' 滴（当心越线）', true, 0, 1.4, 'burst');
    addShake(4, 0.3);
    parts.push({ type: 'ring', x: b.x, y: b.y, r: shockR * 0.7, life: 0.4, max: 0.4, color: '#FF8A50' });
    audio.freeze();
  }
  function reefNeighbors(b) {
    var bs = phys.bodies, res = [], i, o, dx, dy, d;
    for (i = 0; i < bs.length; i++) {
      o = bs[i];
      if (o === b || !o.iron || o.chest) continue;
      dx = o.x - b.x; dy = o.y - b.y; d = Math.sqrt(dx * dx + dy * dy);
      if (d < (b.r + o.r) * 1.3) res.push(o);
    }
    return res;
  }
  function updateReefClusters() {
    var bs = phys.bodies, i, b;
    for (i = 0; i < bs.length; i++) { if (bs[i].iron) { bs[i]._cluster = 0; bs[i].obstacle = false; } }
    var seen = {}, clusters = [];
    for (i = 0; i < bs.length; i++) {
      b = bs[i];
      if (!b.iron || b.chest || seen[b.id]) continue;
      var cl = [], stack = [b]; seen[b.id] = 1;
      while (stack.length) {
        var cur = stack.pop(); cl.push(cur);
        var nb = reefNeighbors(cur);
        for (var m = 0; m < nb.length; m++) if (!seen[nb[m].id]) { seen[nb[m].id] = 1; stack.push(nb[m]); }
      }
      if (cl.length >= 2) { for (var c = 0; c < cl.length; c++) cl[c]._cluster = cl.length; clusters.push(cl); }
    }
    for (i = 0; i < clusters.length; i++) {
      var sz = clusters[i].length;
      if (sz >= 4) detonateReef(clusters[i][0], 1);
      else if (sz >= 3) for (var o2 = 0; o2 < sz; o2++) clusters[i][o2].obstacle = true;
    }
  }
  var comboDefs = [
    { key: 'siphon', a: 'magnet', b: 'vortex', name: '定向虹吸', on: false },
    { key: 'icefount', a: 'ice', b: 'geyser', name: '冰泉支架', on: false }
  ];
  function findSpecial(t) {
    var bs = phys.bodies;
    for (var i = 0; i < bs.length; i++) if (bs[i].special === t) return bs[i];
    return null;
  }
  function comboHas(t) { return !!findSpecial(t); }
  function updateCombos(dt) {
    for (var i = 0; i < comboDefs.length; i++) {
      var c = comboDefs[i];
      var active = comboHas(c.a) && comboHas(c.b);
      if (active && !c.on) {
        c.on = true;
        addPopup(C.W / 2, 250, '组合技 · ' + c.name + '！', true, 0, 2.0, 'world');
        audio.quest();
      } else if (!active && c.on) {
        c.on = false;
      }
    }
    if (comboDefs[0].on) {
      var ma = findSpecial('magnet'), vo = findSpecial('vortex');
      if (ma && vo) applySiphon(dt, (ma.x + vo.x) / 2);
    }
  }
  function applySiphon(dt, ax) {
    var bs = phys.bodies, R = C.combo.siphonR, F = C.combo.siphonF;
    for (var i = 0; i < bs.length; i++) {
      var o = bs[i];
      if (o.iron || o.chest || o.special || o.frozen > 0) continue;
      var dx = o.x - ax;
      if (Math.abs(dx) < R) o.vx += (-dx / R) * F * dt * 10;
    }
  }
  function comboIceFountain(b, bs) {
    var R = C.combo.iceR;
    for (var j = 0; j < bs.length; j++) {
      var o = bs[j];
      if (o === b || o.special || o.frozen > 0 || o.iron || o.chest) continue;
      var dx = o.x - b.x, dy = o.y - b.y;
      if (dx * dx + dy * dy <= R * R) o.frozen = C.ice.freezeTime * 0.92;
    }
    addPopup(b.x, b.y - b.r - 14, '冰泉支架！', false, 0, 1.6, 'world');
    parts.push({ type: 'ring', x: b.x, y: b.y, r: R, life: 0.5, max: 0.5, color: '#BFEAFF' });
    audio.freeze();
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
  function suckIn(x, y, tier) {
    var r = T[tier].r + 18;
    for (var i = 0; i < 6; i++) {
      var ang = (i / 6) * Math.PI * 2 + Math.random() * 0.5;
      parts.push({ type: 'suck',
        x: x + Math.cos(ang) * r, y: y + Math.sin(ang) * r,
        tx: x, ty: y, r: 2.5, life: 0.28, max: 0.28, color: '#FFFFFF' });
    }
  }
  function annY(y) { return MG.layout.body.mirrorCy + (y - 209); }
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
    if (x === C.W / 2 && y >= 180 && y <= 320) y = annY(y);
    var popMaxY = MG.layout.body.floorY;
    for (var i = 0; i < popups.length; i++) {
      var op = popups[i];
      if (op.life > 0.35 && Math.abs(op.x - x) < 220) {
        while (Math.abs(op.y - y) < 28) {
          if (isBig && !op.big && op.y + 30 <= popMaxY) op.y += 30;
          else if (op.y < y && op.y + 30 <= popMaxY) y = op.y + 30;
          else y = op.y - 30;
        }
      }
    }
    if (y > popMaxY) y = popMaxY;
    var lf = life || (isBig ? 2.0 : 1.0);
    var p = { x: x, y: y, text: text, life: lf, max: lf, big: !!isBig, mult: mult || 0, scale: 0.4, kind: kind || inferKind(text) };
    if (attach) { p.attach = attach; p.attachOff = { x: x - attach.x, y: y - attach.y }; }
    popups.push(p);
  }
  function addShake(amp, dur) {
    shakeAmp = Math.max(shakeAmp, amp);
    shakeT = Math.max(shakeT, dur);
  }
  function updateFx(dt) {
    var i, p;
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
      if (p.attach) {
        if (phys.bodies.indexOf(p.attach) < 0) alive = false;
        else {
          p.x = p.attach.x + p.attachOff.x;
          p.y = p.attach.y + p.attachOff.y;
          p.life -= dt;
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
      if (p.y < -8) { p.y = VH + 8; p.x = bandX(i, bubbles.length, 4); }
    }
    for (i = 0; i < fishes.length; i++) {
      var f = fishes[i];
      f.x += f.dir * f.sp * dt;
      f.y += Math.sin(time * 0.7 + f.wob) * 8 * dt;
      f.tail += dt * 9;
      var curStg = seaStage();
      if (f.fade > 0 && f.stg !== curStg) f.fade -= dt / 1.6;
      else if (f.fade < 1) f.fade += dt / 1.6;
      if (f.fade <= 0) { f.fade = 0; resetFish(f); }
      if (f.fade > 1) f.fade = 1;
      if (f.dir > 0 && f.x > LW + 70) resetFish(f, true);
      else if (f.dir < 0 && f.x < -70) resetFish(f, true);
    }
    for (i = 0; i < jellies.length; i++) {
      var jl = jellies[i];
      jl.y -= jl.drift * dt;
      jl.x += Math.sin(time * 0.5 + jl.ph) * 9 * dt;
      if (jl.y < 170) { jl.y = VH * 0.88; jl.x = bandX(i, jellies.length, 50); }
    }
    for (i = 0; i < glitters.length; i++) {
      var gl = glitters[i];
      gl.y -= gl.sp * dt;
      if (gl.y < -6) { gl.y = VH + 6; gl.x = bandX(i, glitters.length, 2); }
    }
    if (shakeT > 0) { shakeT -= dt; if (shakeT <= 0) shakeAmp = 0; }
    if (scoreBump > 0) scoreBump -= dt;
    if (bookBtn.pressT > 0) bookBtn.pressT -= dt;
    for (var mi = 0; mi < menuTiles.length; mi++) if (menuTiles[mi].pressT > 0) menuTiles[mi].pressT -= dt;
    if (setBtn.pressT > 0) setBtn.pressT -= dt;
    if (restartBtn.pressT > 0) restartBtn.pressT -= dt;
    for (i = 0; i < SKILL_BTNS.length; i++) if (SKILL_BTNS[i].pressT > 0) SKILL_BTNS[i].pressT -= dt;
  }

  function unlockTier(t, px, py) {
    dexCounts[t] = (dexCounts[t] || 0) + 1;
    if (dexUnlocked[t]) return;
    if (totalScore() < (C.dexGate[t] || 0)) return;
    dexUnlocked[t] = 1;
    var bonus = Math.round(T[t].score * C.dexBonusMult * scoreMult);
    score += bonus;
    scoreBump = 0.3;
    if (score > best) { best = score; saveNum('mg_best', best); }
    if (C.dexGate[t]) {
      addPopup(px === undefined ? C.W / 2 : px, py === undefined ? 240 : py,
        '图鉴解锁 · ' + T[t].name + ' +' + bonus, true, 0);
    }
    saveDex();
    checkCollection();
  }
  function checkDexGates() {
    for (var t = 0; t < T.length; t++) {
      if (!dexUnlocked[t] && totalScore() >= (C.dexGate[t] || 0)) unlockTier(t);
    }
  }

  var ACH_DEFS = [
    { id: 'score2k',  name: '深海富豪', desc: '单局得分达到 65000',        target: 65000,  diff: 1, perk: '永续 · 开局充能 +1', cur: function () { return Math.max(score, best, lifeStats.best || 0); } },
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
      var d = a.diff || 1;
      var base = d === 3 ? 400 : (d === 2 ? 150 : 60);
      var gain = Math.round(base * cm(scoreMult));
      score += gain;
      scoreBump = 0.4;
      var pick = C.skills[(Math.random() * C.skills.length) | 0];
      addCharge(pick.key, d === 3 ? 3 : (d === 2 ? 2 : 1));
      addPopup(C.W / 2, 240, '成就达成 · ' + a.name + ' +' + gain, true, 0);
      addPopup(C.W / 2, 266, '「' + pick.name + '」充能 +' + (d === 3 ? 3 : (d === 2 ? 2 : 1)), false, 0);
      parts.push({ type: 'ring', x: C.W / 2, y: annY(150), r: 26, life: 0.6, max: 0.6, color: '#F5C542' });
      audio.quest();
      saveDex();
    }
  }

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
  var STAGE_SP_SLOTS = {};
  (function () {
    var per = {}, i;
    for (i = 0; i < SP_DEFS.length; i++) {
      var st = SP_DEFS[i].stage;
      (per[st] = per[st] || []).push(i);
    }
    for (var k in per) if (per.hasOwnProperty(k)) STAGE_SP_SLOTS[k] = [per[k][0], per[k][1]];
    STAGE_SP_SLOTS[0] = [spIndexByKey('rune'), SP_DEFS.length];
  })();
  function discoverSpecial(sp) {
    if (dexSpecial[sp]) return;
    dexSpecial[sp] = 1;
    saveDex();
    var i = spIndexByKey(sp);
    addPopup(C.W / 2, 240, '图鉴新发现 · ' + (i >= 0 ? SP_DEFS[i].name : '大宝箱'), true, 0);
    if (i >= 0 && SP_DEFS[i].desc) {
      addPopup(C.W / 2, 282, (SP_DEFS[i].name + '：' + SP_DEFS[i].desc), false, 0, 2.8, 'todo');
    }
    checkCollection();
  }

  var COL_MILESTONES = [
    { id: 'm25',  pct: 0.25, score: 500,  charge: 1, name: '收集 25%' },
    { id: 'm50',  pct: 0.5,  score: 1200, charge: 1, name: '收集 50%', chest: true },
    { id: 'm75',  pct: 0.75, score: 2500, charge: 2, name: '收集 75%', chest: true },
    { id: 'm100', pct: 1,    score: 6000, charge: 0, name: '集齐图鉴', allCharge: 1 }
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
      if (m.chest && !chest && state === 'play') chestTimer = Math.min(chestTimer, 4);
      parts.push({ type: 'ring', x: C.W / 2, y: annY(150), r: 26, life: 0.6, max: 0.6, color: '#F5C542' });
      audio.quest();
      saveDex();
    }
  }

  function questMaxTier() {
    var m = 0;
    for (var i = 0; i < T.length; i++) if (dexUnlocked[i]) m = i;
    return m;
  }
  function makeQuest(depth) {
    questDepth = depth;
    var mx = questMaxTier();
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
    q.stars = Math.min(3, 1 + Math.floor(depth / 2));
    q.bornMax = mx;
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
    var gain = Math.round(quest.rewardScore * cm(scoreMult * (perkOn('quest12') ? 1.3 : 1)));
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

  function processMerges() {
    var bs = phys.bodies, used = {}, merges = [], rainbowPairs = [], i, j;
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
      if (used[a.id] || a.special || a.frozen > 0 || a.iron || a.popT > 0) continue;
      for (j = i + 1; j < bs.length; j++) {
        var b = bs[j];
        if (used[b.id] || b.special || b.frozen > 0 || b.iron || b.tier !== a.tier || b.popT > 0) continue;
        var dx = b.x - a.x, dy = b.y - a.y;
        var minD = a.r + b.r + 0.5;
        if (dx * dx + dy * dy <= minD * minD) {
          used[a.id] = used[b.id] = 1;
          merges.push([a, b]);
          break;
        }
      }
    }
    for (i = 0; i < merges.length; i++) doMerge(merges[i][0], merges[i][1]);

    for (i = 0; i < bs.length; i++) {
      var ia = bs[i];
      if (!ia.iron || ia.chest || used[ia.id] || ia.frozen > 0) continue;
      if (tide.progress < C.iron.tideNeed) {
        break;
      }
      for (j = i + 1; j < bs.length; j++) {
        var ib = bs[j];
        if (!ib.iron || ib.chest || used[ib.id] || ib.frozen > 0) continue;
        var idx = ib.x - ia.x, idy = ib.y - ia.y;
        var iminD = ia.r + ib.r + 0.5;
        if (idx * idx + idy * idy <= iminD * iminD) {
          if (ia._cluster < 3 && ib._cluster < 3) {
            used[ia.id] = used[ib.id] = 1;
            ironPairMerge(ia, ib);
          }
          break;
        }
      }
    }
  }

  function ironPairMerge(a, b) {
    var mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    phys.remove(a); phys.remove(b);
    var gain = Math.round(C.iron.pairScore * cm(scoreMult * (perkOn('iron5') ? 2 : 1)));
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
    if (a.rune) chargeRune(a, mx, my);
    if (b.rune) chargeRune(b, mx, my);

    combo++; comboTimer = C.comboWindow + (perkOn('combo6') ? 0.3 : 0);
    if (combo > maxCombo) { maxCombo = combo; if (maxCombo > (lifeStats.combo || 0)) { lifeStats.combo = maxCombo; } }
    dailyProgress('combo', 0, combo);
    if (combo >= 2) hap(Math.min(50, 8 + combo * 3));
    var mult = Math.min(combo, C.comboMaxMult);

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

    var gain2 = Math.round(T[nt].score * cm(mult * scoreMult * perkMult() * (auroraNext || 1)));
    if (auroraNext) { auroraNext = 0; parts.push({ type: 'ring', x: mx, y: my, r: T[nt].r + 8, life: 0.5, max: 0.5, color: '#9BE8D8' }); }
    score += gain2;
    scoreBump = 0.3;
    if (score > best) { best = score; saveNum('mg_best', best); }
    dailyProgress('merge', nt);

    unlockTier(nt, mx, my - T[nt].r - 38);
    addPopup(mx, my - T[nt].r - 12, '+' + gain2, nt >= T.length - 1, mult > 1 ? mult : 0);
    burst(mx, my, nt, nt >= 6);
    suckIn(mx, my, tier);
    pushNeighbors(mx, my, T[nt].r + 30);
    if (nt >= 6) addShake(4, 0.25);
    audio.pop(nt);
    if (nt >= T.length - 1) audio.big();

    questProgress(nt, combo);

    if (combo === C.rainCombo) {
      var t = mostCommonTier();
      if (t >= 0 && t !== nextTier) {
        nextTier = t;
        nextIron = false; nextSpecial = null; nextRune = null;
        rainHint = 2.5;
        aimX = clampAim(aimX);
        addPopup(C.W / 2, 240, '甘霖 · 下一滴是「' + T[t].name + '」', false, 0, 1.6);
      }
    }
  }

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
    climaxMark = score;
    if (!best) return;
    var a = best[0], b2 = best[1];
    parts.push({ type: 'ring', x: a.x, y: a.y, r: a.r, life: 0.6, max: 0.6, color: '#F5D76E' });
    parts.push({ type: 'ring', x: b2.x, y: b2.y, r: b2.r, life: 0.6, max: 0.6, color: '#F5D76E' });
    for (var k = 0; k < 12; k++) {
      parts.push({ type: 'dot', x: (a.x + b2.x) / 2, y: (a.y + b2.y) / 2,
        vx: (Math.random() - 0.5) * 160, vy: -40 - Math.random() * 120,
        r: 1.5 + Math.random() * 2, life: 0.7, max: 0.7, color: '#F5D76E' });
    }
    addPopup(C.W / 2, 250, '海潮高潮！水滴自发相聚', true, 0);
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

  var auroraNext = 0;
  function updateSpecials(dt) {
    var bs = phys.bodies, i;
    for (i = bs.length - 1; i >= 0; i--) {
      var b = bs[i];
      if (!b) continue;
      if (b.special) {
        b.specialT += dt;
        if (b.special === 'cloud') {
          if (b.specialT >= C.cloud.splitDelay) splitCloud(b);
        } else if (b.special === 'vortex') {
          updateVortex(b, dt, bs, C.vortex, '#8FA8E8');
        } else if (b.special === 'magnet') {
          updateVortex(b, dt, bs, C.magnet, '#9BC0F0');
        } else if (b.special === 'ice') {
          updateIce(b, bs);
        } else if (b.special === 'gale') {
          if (b.specialT >= 0.45 || b.y + b.r >= C.floorY - 4) {
            pushNeighbors(b.x, b.y, 185, 260);
            burst(b.x, b.y, b.tier, false);
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
            phys.remove(b);
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
      if (b.frozen > 0) {
        b.frozen -= dt;
        b.vx *= 0.1; b.vy = 0;
        if (b.frozen <= 0) thaw(b);
      }
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
          o.vortexGrace = C.extGrace;
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
    var n = C.cloud.minSplit + ((Math.random() < 0.5) ? 0 : (C.cloud.maxSplit - C.cloud.minSplit));
    var cap = C.cloud.maxTier;
    var spread = (n === 3) ? 1.0 : 0.7;
    for (var i = 0; i < n; i++) {
      var tier = (Math.random() * (cap + 1)) | 0;
      var ang = (i / n - 0.5) * spread * Math.PI;
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

  function triggerSpring(b) {
    var t = mostCommonTier();
    b.special = null;
    if (t >= 0 && t !== nextTier) {
      nextTier = t;
      nextIron = false; nextSpecial = null; nextRune = null;
      rainHint = 2.5;
      aimX = clampAim(aimX);
    }
    addPopup(b.x, b.y - b.r - 14, '甘霖降临！', false, 0);
    parts.push({ type: 'ring', x: b.x, y: b.y, r: 18, life: 0.5, max: 0.5, color: '#BFE8D0' });
    audio.quest();
    phys.remove(b);
  }
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
    addPopup(C.W / 2, 250, '雷霆引合！', true, 0);
    addShake(2, 0.2);
    audio.freeze();
    doMerge(best.a, best.o);
    phys.remove(b);
  }
  function triggerPearl(b) {
    var t = mostCommonTier(), n = 0;
    b.special = null;
    if (t < 0 || t >= T.length - 1) { addPopup(b.x, b.y - b.r - 14, '珍珠黯淡了…', false, 0); phys.remove(b); return; }
    var bs = phys.bodies;
    for (var i = 0; i < bs.length; i++) {
      var o = bs[i];
      if (o.tier !== t || o.iron || o.chest || o.special || o.frozen > 0) continue;
      o.tier += 1; o.r = T[o.tier].r; o.popT = 0.3; n++;
      parts.push({ type: 'ring', x: o.x, y: o.y, r: o.r * 0.6, life: 0.45, max: 0.45, color: '#F0E6D2' });
    }
    addPopup(C.W / 2, 250, '珍珠祝福！「' + T[t].name + '」全体 +1', true, 0);
    audio.quest();
    phys.remove(b);
  }
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
      if (burn[i].iron) dailyProgress('iron');
    }
    phys.removeMany(burn);
    score += gain; scoreBump = 0.3;
    addPopup(b.x, b.y - b.r - 14, burn.length ? '熔岩灼烧 ×' + burn.length + ' +' + gain : '熔岩熄灭', burn.length, 0);
    if (burn.length) addShake(3, 0.25);
    parts.push({ type: 'ring', x: b.x, y: b.y, r: R * 0.7, life: 0.5, max: 0.5, color: '#F2A05E' });
    phys.remove(b);
    audio.freeze();
  }
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
    if (comboHas('ice')) comboIceFountain(b, bs);
    phys.remove(b);
    audio.swirl();
  }
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
    phys.removeMany(victims, n);
    score += gain; scoreBump = 0.3;
    if (gain > 0) addPopup(b.x, b.y - b.r - 14, '虚空吞噬 ×' + n + ' +' + gain, true, 0);
    else addPopup(b.x, b.y - b.r - 14, '虚空空空如也', false, 0);
    phys.remove(b);
    parts.push({ type: 'ring', x: b.x, y: b.y, r: 20, life: 0.55, max: 0.55, color: '#8A7FD4' });
    audio.swirl();
  }
  function triggerAurora(b) {
    b.special = null;
    auroraNext = C.auroraMult;
    for (var k = 0; k < 10; k++) {
      var ang = Math.random() * Math.PI;
      parts.push({ type: 'dot', x: b.x + Math.cos(ang) * 20, y: b.y - Math.random() * 40,
        vx: (Math.random() - 0.5) * 60, vy: -60 - Math.random() * 100,
        r: 2 + Math.random() * 2, life: 0.8, max: 0.8, color: k % 2 ? '#9BE8D8' : '#C8B8F0' });
    }
    addPopup(C.W / 2, 250, '极光庇护！下次合成 ×3', true, 0);
    phys.remove(b);
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

  function tideWaterMax() {
    var H = FLOORY - C.containerTop;
    var zone = FLOORY - C.dangerY;
    var fill = C.tide.lowFrac + (C.tide.highFrac - C.tide.lowFrac) * (seaStage() / (C.seaStages.length - 1));
    return (zone * fill) / H;
  }
  var _tideYKey = -1, _tideYVal = 0;
  function tideY() {
    if (_tideYKey === tide.progress) return _tideYVal;
    _tideYKey = tide.progress;
    _tideYVal = FLOORY - tide.progress * (FLOORY - C.containerTop) * tideWaterMax();
    return _tideYVal;
  }
  function tideAmp() {
    return 2.5 + tide.progress * 5.5;
  }
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
        tide.timer = C.tide.duration + (C.tide.durationMax - C.tide.duration) * seaStage() / (C.seaStages.length - 1);
        tide.banner = 2.4;
        if (!tideKillHint) { tideKillHint = true; addPopup(C.W / 2, 250, '潮位渐深 · 水下浮力增强', true, 0); }
        audio.tide();
      }
    } else {
      tide.progress = Math.min(1, tide.progress + dt / 1.3);
      tide.timer -= dt;
      if (tide.timer <= 0) {
        tide.phase = 'idle';
        var tiv = C.tide.cycleInterval - (C.tide.cycleInterval - C.ramp.tideIntervalMin) * (seaStage() / (C.seaStages.length - 1));
        if (ng.active && ng.active.tideInt) tiv *= ng.active.tideInt;
        tide.timer = tiv;
        bumpStat('tide');
        dailyProgress('tide');
        seaEvent.timer = Math.max(seaEvent.timer, 4);
        tryTideBless();
      }
    }
  }
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
      if (b.iron || b.frozen > 0) continue;
      var subm = (b.y + b.r - wy) / (2 * b.r);
      if (subm <= 0) continue;
      var f = Math.min(1, subm);
      var buoy = C.tide.buoyancy * ((ng.active && ng.active.tideToss && tide.phase === 'active') ? ng.active.tideToss : 1);
      b.vy -= buoy * f * dt;
      var drag = Math.min(0.9, 2.2 * f * dt);
      b.vx *= (1 - drag);
      b.vy *= (1 - drag);
      b.vx += Math.sin(time * 2.2 + b.y * 0.02) * 14 * f * dt;
    }
  }

  function addCharge(k, n) {
    if (!(k in skillCharge)) return;
    var cap = skillCost(k) * C.skillMaxQ;
    skillCharge[k] = Math.min(cap, (skillCharge[k] || 0) + n);
  }
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
      if (ironCount() > 0) addPopup(C.W / 2, 250, '蒸发礁石需 ' + (skillCost('evap') * C.iron.evapCost) + ' 次充能 · 限涨潮', false, 0);
      return;
    }
    if (key === 'flow') {
      if (flowMode) { flowMode = false; flowPick = null; return; }
      if (skillCharge.flow < skillCost('flow')) { flashSkill('flow', '「' + runeName('flow') + '」符文不足'); return; }
      flowMode = true;
      evapMode = false; rippleMode = false;
      return;
    }
    if (key === 'ripple' && rippleMode) { rippleMode = false; return; }
    if (skillCharge[key] < skillCost(key)) {
      flashSkill(key, '「' + runeName(key) + '」符文不足');
      return;
    }
    if (key === 'swap') {
      skillCharge.swap -= skillCost('swap');
      nextTier = rollTier();
      rollNextDrop();
      aimX = clampAim(aimX);
      addPopup(aimX, C.spawnY + 66, '换滴', false, 0);
      audio.drop();
    } else if (key === 'ripple') {
      rippleMode = true;
      evapMode = false;
      flowMode = false; flowPick = null;
    }
  }
  function flowSwap(a, b) {
    var tx = a.x, ty = a.y;
    a.x = b.x; a.y = b.y;
    b.x = tx; b.y = ty;
    a.vx = a.vy = b.vx = b.vy = 0;
    a.svx = a.svy = b.svx = b.svy = 0;
    a.trail = []; b.trail = [];
    skillCharge.flow -= skillCost('flow');
    flowMode = false; flowPick = null;
    parts.push({ type: 'ring', x: a.x, y: a.y, r: a.r, life: 0.4, max: 0.4, color: '#7FD4FF' });
    parts.push({ type: 'ring', x: b.x, y: b.y, r: b.r, life: 0.4, max: 0.4, color: '#7FD4FF' });
    addPopup((a.x + b.x) / 2, Math.min(a.y, b.y) - 30, '水流交换！', false, 0);
    audio.pop(3);
  }
  function castRipple(x, y) {
    x = Math.max(12, Math.min(C.W - 12, x));
    y = Math.max(C.containerTop + 30, Math.min(FLOORY - 16, y));
    skillCharge.ripple -= skillCost('ripple');
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
      if (b.iron || b.frozen > 0) continue;
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
    if (b.iron && tide.progress < C.iron.tideNeed) {
      flashSkill('evap', '退潮中 · 需涨潮才能蒸发礁石');
      return;
    }
    var cost = skillCost('evap') * (b.iron ? C.iron.evapCost : 1);
    if (b.iron) {
      gain = C.iron.evaporateScore;
      burstIron(b.x, b.y);
      dailyProgress('iron');
    } else {
      gain = Math.max(1, Math.round(T[b.tier].score * scoreMult));
      burst(b.x, b.y, b.tier, false);
    }
    score += gain;
    scoreBump = 0.25;
    addPopup(b.x, b.y - b.r - 8, b.iron ? ('礁石移除 · 充能 −' + cost) : ('+' + gain), false, 0);
    if (b.iron && b._cluster === 3) reefGambleBlast(b);
    phys.remove(b);
    skillCharge.evap -= cost;
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

  function checkDanger(dt) {
    var bs = phys.bodies;
    var worst = 0, minRemain = 99;
    for (var i = 0; i < bs.length; i++) {
      var b = bs[i];
      if (b.frozen > 0) continue;
      if (b.special) continue;
      if (b.grace > 0) { b.dangerT = 0; continue; }
      if (b.vortexGrace > 0) { b.vortexGrace -= dt; b.dangerT = 0; continue; }
      var top = b.y - b.r;
      if (top >= C.dangerY) { b.dangerT = 0; continue; }
      var fuse = C.dangerTime;
      b.dangerT += dt;
      var remain = fuse - b.dangerT;
      if (remain <= 0) { dangerAlert = 0; dangerRemain = 0; gameOver(); return; }
      var w = b.dangerT / fuse;
      if (w > worst) worst = w;
      if (remain < minRemain) minRemain = remain;
    }
    dangerAlert = Math.min(1, worst);
    dangerRemain = worst > 0 ? Math.max(0, minRemain) : 0;
  }
  function gameOver() {
    state = 'over';
    lifeScore += score - runCounted; runCounted = score;
    careerPeak = Math.max(careerPeak, lifeScore);
    saveNum('mg_peak', careerPeak);
    saveNum('mg_life', lifeScore);
    saveNum('mg_best', best);
    recent.push({ score: score, sea: seaStage(), ts: Date.now() });
    if (recent.length > RECENT_MAX) recent = recent.slice(-RECENT_MAX);
    saveRecent();
    checkAchievements();
    saveDex();
    audio.over();
  }

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
  MG.debug = {
    give: function (k, n) { addCharge(k, n); },
    setNext: function (opt) {
      opt = opt || {};
      nextIron = !!opt.iron;
      nextSpecial = opt.special || null;
      nextRune = !opt.special && !opt.iron ? (opt.rune || null) : null;
      if (nextRune) seeRune(nextRune);
      if (opt.tier != null) nextTier = opt.tier;
    },
    chestNow: function (x) {
      if (!chest) spawnChest();
      if (x != null) chest.b.x = x;
    },
    achCheck: function () { checkAchievements(); },
    bump: bumpStat,
    forceEndless: function () {},
    setRamp: function (t) { endlessT = t; },
    grant: function (id) { achDone[id] = 1; saveDex(); },
    addScore: function (n) { score += n; },
    spawn: function (tier, x, y) { return phys.create(x || C.W / 2, y || C.spawnY, tier, 0, 0); },
    dailyProg: dailyProgress,
    dailyState: function () { return daily; },
    board: recentBoard,
    share: function () { openShare(); return shareText; },
    shareCopy: copyShareText,
    setDrops: function (n) { dropCount = n; },
    tutDone: function () { return tutDone; },
    stage: function () { return { i: seaStage(), name: C.seaStages[seaStage()].name }; },
    tideY: tideY,
    setLife: function (n) { lifeScore = n; runCounted = 0; },
    cm: cm,
    headless: false,
    step: function (dt) { update(dt); },
    drop: function (x) { aimX = clampAim(x == null ? Math.random() * C.W : x); tryDrop(); },
    reset: function () { restart(); },
    ngInfo: function () { return { unlocked: ng.unlocked, active: ng.active ? ng.active.id : null }; },
    ngUnlock: function () { ng.unlocked = true; saveFlag('mg_ng', 1); },
    ngStart: function (id) {
      var af = null, k;
      for (k = 0; k < C.ng.affixes.length; k++) if (C.ng.affixes[k].id === id) af = C.ng.affixes[k];
      if (!af) for (k = 0; k < DCHAL_AFFIXES.length; k++) if (DCHAL_AFFIXES[k].id === id) af = DCHAL_AFFIXES[k];
      if (af) ngStartRun(af);
      return af ? af.name : null;
    },
    over: function () { buildOverButtons(); gameOver(); },
    menuBtn: function () { return menuStartBtn; },
    openDex: function () { dexOpen = true; achOpen = false; },
    forceEvent: function (type) { startSeaEvent(type); },
    addScore: function (n) { score += n; },
    dexSecTab: function (i) { return dexSecRect(i); },
    closeDex: function () { dexOpen = false; achOpen = false; }
  };

  function spawnChest() {
    discoverSpecial('chest');
    var b = createIron(C.W * (0.2 + Math.random() * 0.6), C.dangerY + 52);
    b.chest = true;
    b.r = 17; b.m = b.r * b.r * 6;
    chest = { b: b, t: 0, life: 14 };
    addPopup(b.x, C.dangerY + 10, '沉大宝箱！点它开启', true, 0, 2.5, 'reward', b);
    audio.blip(392, 0.25, 'triangle', 0.14, 1.5);
  }
  function expireChest() {
    if (chest) {
      burstIron(chest.b.x, chest.b.y);
      phys.remove(chest.b);
      addPopup(C.W / 2, FLOORY - 60, '大宝箱沉入深渊…', false, 0, 1.6);
    }
    chest = null;
    chestTimer = 75 + Math.random() * 40;
  }
  function openChest() {
    var x = chest.b.x, y = chest.b.y;
    phys.remove(chest.b);
    chest = null;
    chestTimer = 85 + Math.random() * 45;
    var r = Math.random();
    var chestBonus = perkOn('chest5') ? 1.5 : 1;
    if (r < 0.68) {
      var gain = Math.round((60 + Math.random() * 90) * cm(scoreMult * chestBonus));
      score += gain; scoreBump = 0.4;
      if (score > best) { best = score; saveNum('mg_best', best); }
      addPopup(x, y - 30, '大宝箱开启 +' + gain, true, 0, 0, 'reward');
    } else if (r < 0.80) {
      var keys = ['swap', 'ripple', 'evap', 'flow'].filter(function (k) { return skillUnlocked(k); });
      if (keys.length) {
        var k = keys[(Math.random() * keys.length) | 0];
        var cn = perkOn('chest5') ? 2 : 1;
        addCharge(k, cn);
        addPopup(x, y - 30, '大宝箱开启：' + runeName(k) + ' +' + cn + ' 充能', true, 0, 0, 'reward');
      } else {
        var g2 = Math.round((60 + Math.random() * 90) * cm(scoreMult * chestBonus));
        score += g2; scoreBump = 0.4;
        if (score > best) { best = score; saveNum('mg_best', best); }
        addPopup(x, y - 30, '大宝箱开启 +' + g2, true, 0, 0, 'reward');
      }
    } else {
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
    questStaleT -= dt;
    if (questStaleT <= 0) {
      questStaleT = 4;
      if (quest && quest.bornMax != null && questMaxTier() - quest.bornMax >= 3) {
        makeQuest(questDepth);
        addPopup(C.W / 2, 266, '任务已更新', false, 0, 1.6);
      }
    }
  }

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
    addPopup(C.W / 2, 250, names[seaEvent.type], true, 0);
    if (seaEvent.type === 'bless') {
      var tier = mostCommonTier();
      seaEvent.data = { tier: tier < 0 ? rollTier() : tier, left: 3 };
    }
    if (seaEvent.type === 'storm') {
      seaEvent.x = C.W * (0.25 + Math.random() * 0.5);
      seaEvent.y = MG.layout.body.stackCy;
    }
    audio.tide();
  }
  function applySeaEvent(dt) {
    var bs = phys.bodies, i, b;
    if (seaEvent.type === 'surge') {
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
      var R = 360;
      for (i = 0; i < bs.length; i++) {
        b = bs[i];
        if (b.iron) continue;
        var dx = seaEvent.x - b.x, dy = seaEvent.y - b.y, d = Math.sqrt(dx * dx + dy * dy);
        if (d > 6 && d < R) {
          var ux = dx / d, uy = dy / d;
          var sp = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
          var damp = sp > 900 ? Math.max(0.3, 1 - (sp - 900) / 700) : 1;
          var f = 2400 * Math.pow(1 - d / R, 1.4) * damp;
          b.vx += (ux * f - uy * f * 1.15) * dt;
          b.vy += (uy * f + ux * f * 1.15) * dt;
        }
      }
    }
  }
  function endSeaEvent() {
    var ended = seaEvent.type;
    seaEvent.type = null;
    seaEvent.data = null;
    seaEvent.timer = C.seaEvent.interval + (Math.random() * 2 - 1) * C.seaEvent.jitter;
    if (C.seaEvent.blessAfterCrisis && (ended === 'storm' || ended === 'surge')) {
      seaEvent.nextForced = 'bless';
    }
  }
  var seaWarn = null;
  var SEA_WARN_T = 1.6;
  function updateSeaEvent(dt) {
    if (tide.phase === 'active') return;
    if (seaWarn) {
      seaWarn.t -= dt;
      if (seaWarn.t <= 0) { var tp = seaWarn.type; seaWarn = null; startSeaEvent(tp); }
      return;
    }
    if (!seaEvent.type) {
      seaEvent.timer -= dt;
      if (seaEvent.timer <= 0) {
        if (seaEvent.nextForced) {
          var fb = seaEvent.nextForced; seaEvent.nextForced = null;
          startSeaEvent(fb);
        } else {
          var pool = ['surge', 'storm'];
          var t = pool[(Math.random() * pool.length) | 0];
          seaWarn = { type: t, t: SEA_WARN_T };
        }
      }
    } else {
      seaEvent.t -= dt;
      applySeaEvent(dt);
      if (seaEvent.t <= 0) endSeaEvent();
    }
  }
  var STORM_PS = [];
  for (var spi = 0; spi < 90; spi++) {
    var sr = 0.12 + Math.pow(Math.random(), 0.75) * 0.88;
    STORM_PS.push({ a0: Math.random() * Math.PI * 2, r: sr,
      sp: (2.2 / (0.3 + sr)) * (0.8 + Math.random() * 0.4),
      sz: 1.2 + Math.random() * 2.6, warm: Math.random() < 0.25 });
  }

  function drawEventVfx() {
    if (seaEvent.type === 'storm') {
      var fadeK = Math.min(1, (seaEvent.t0 - seaEvent.t) / 0.8, seaEvent.t / 0.8);
      if (fadeK <= 0) return;
      ctx.save();
      ctx.globalAlpha = fadeK;
      ctx.translate(seaEvent.x, seaEvent.y);
      var R = 170;
      ctx.fillStyle = grad('stormPlankton', function () {
        var gg = ctx.createRadialGradient(0, 0, 0, 0, 0, 56);
        gg.addColorStop(0, 'rgba(140,220,230,0.3)');
        gg.addColorStop(1, 'rgba(140,220,230,0)');
        return gg;
      });
      ctx.beginPath(); ctx.arc(0, 0, 56, 0, Math.PI * 2); ctx.fill();
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

  function doDouble() {
    doubled = true;
    score *= 2;
    if (recent.length) { recent[recent.length - 1].score = score; saveRecent(); }
    if (score > best) { best = score; saveNum('mg_best', best); }
  }
  function doRevive() {
    state = 'play';
    dangerAlert = 0; dangerRemain = 0;
    var bs = phys.bodies, i, j;
    var drops = [];
    for (i = 0; i < bs.length; i++) { if (!bs[i].iron && !bs[i].chest) drops.push(bs[i]); }
    drops.sort(function (a, c) { return (a.y - a.r) - (c.y - c.r); });
    var keep = C.dangerY + 70;
    var removed = 0;
    for (i = 0; i < drops.length; i++) {
      var d = drops[i];
      if (d.y - d.r >= keep) break;
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
    for (i = 0; i < bs.length; i++) { bs[i].dangerT = 0; bs[i].grace = 1.5; }
    reviveCount++;
    addPopup(C.W / 2, 300, removed > 0 ? '复活！清走 ' + removed + ' 滴 · 继续深潜' : '复活！继续深潜', true, 0);
    audio.blip(660, 0.22, 'sine', 0.12, 1.2);
  }
  function goHome() {
    state = 'menu';
    aiming = false;
    confirmOpen = false;
    dexOpen = false; achOpen = false; ngOpen = false; shareOpen = false;
    var br = MG.layout.confirmBtnRect(0);
    startTransition('out', C.W / 2, br.y + br.h / 2);
  }

  function restart() {
    ngEndRun();
    phys.bodies.length = 0;
    chest = null;
    confirmOpen = false;
    setOpen = false; setClearOpen = false;
    dexOpen = false; achOpen = false; ngOpen = false; shareOpen = false;
    score = 0; displayScore = 0; scoreBump = 0;
    lifeScore = 0;
    stageSeen = -1; seaFade = null;
    if (offlineGain) {
      score += offlineGain.gain; displayScore = score;
      var om = offlineGain.mins;
      addPopup(C.W / 2, 300, '离线收益 · 离开 ' + (om >= 60 ? Math.floor(om / 60) + ' 时 ' + (om % 60) + ' 分' : om + ' 分钟') + '，深海攒下 ' + offlineGain.gain + ' 分', true, 0);
      parts.push({ type: 'ring', x: C.W / 2, y: annY(300), r: 46, life: 0.9, max: 0.9, color: '#F2C14E' });
      audio.blip(880, 0.16, 'sine', 0.1, 0.5);
      offlineGain = null;
    }
    combo = 0; comboTimer = 0; cooldown = 0; maxCombo = 0;
    doubled = false;
    reviveCount = 0;
    dangerAlert = 0; dangerRemain = 0;
    skillCharge = { swap: 0, ripple: 0, evap: 0, flow: 0 };
    reefCountPrev = 0;
    reefCooldown = 0;
    seaCount = 0; scoreMult = 1;
    seaEvent.type = null; seaEvent.data = null; seaEvent.t = 0; seaEvent.t0 = 6; seaEvent.nextForced = null; seaEvent.timer = (C.seaEvent ? C.seaEvent.interval : 26) - 8 + Math.random() * 8;
    seaWarn = null;
    evapMode = false; rippleMode = false; flowMode = false; flowPick = null; rainHint = 0;
    auroraNext = 0;
    levelElapsed = 0; runCounted = 0;
    nextTier = rollTier();
    rollNextDrop();
    aimX = C.W / 2;
    popups.length = 0; parts.length = 0; rippleQueue.length = 0;
    tide.phase = 'idle'; tide.timer = C.tide.cycleInterval; tide.progress = 0; tide.banner = 0;
    endlessT = 0; rampStage = 0; climaxMark = 0;
    makeQuest(0);
    if (perkOn('score2k')) {
      var pk = C.skills[(Math.random() * C.skills.length) | 0];
      addCharge(pk.key, 1);
      addPopup(C.W / 2, 280, '深海富豪：「' + pk.name + '」开局充能 +1', false, 0);
    }
    state = 'play';
  }

  function buildOverButtons() {
    overButtons = [];
    var bw = 264, bh = 48, gap = 14, x = (C.W - bw) / 2;
    var ovr = MG.layout.overRect();
    var areaTop = ovr.y + 190, areaBottom = ovr.y + ovr.h - 26;
    var n = (doubled ? 0 : 1) + 1 + 2;
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
    overButtons.push({ x: x, y: y, w: bw, h: bh, label: '重新开始', action: restart });
  }

  var setBtn = { cx: MG.layout.hud.setCx, cy: MG.layout.hud.trophyCy, r: MG.layout.hud.rowBtnR, pressT: 0 };
  var bookBtn = { cx: MG.layout.band.btnCx[0], cy: MG.layout.band.btnCy, r: MG.layout.band.btnR, pressT: 0 };
  var restartBtn = { cx: MG.layout.band.btnCx[5], cy: MG.layout.band.btnCy, r: MG.layout.band.btnR, pressT: 0 };
  var SKILL_BTNS = [
    { key: 'swap',   cx: MG.layout.band.btnCx[1], cy: MG.layout.band.btnCy, r: MG.layout.band.btnR, pressT: 0 },
    { key: 'ripple', cx: MG.layout.band.btnCx[2], cy: MG.layout.band.btnCy, r: MG.layout.band.btnR, pressT: 0 },
    { key: 'evap',   cx: MG.layout.band.btnCx[3], cy: MG.layout.band.btnCy, r: MG.layout.band.btnR, pressT: 0 },
    { key: 'flow',   cx: MG.layout.band.btnCx[4], cy: MG.layout.band.btnCy, r: MG.layout.band.btnR, pressT: 0 }
  ];
  fit();

  var confirmOpen = false;

  var setOpen = false;
  var setClearOpen = false;
  function toggleSet(i) {
    if (i === 0) { audio.sfxOn = !audio.sfxOn; saveFlag('mg_mute', !audio.sfxOn); }
    else if (i === 1) {
      audio.musicOn = !audio.musicOn; saveFlag('mg_music', audio.musicOn);
      if (audio.musicOn) audio.bgm.start(); else audio.bgm.stop();
    }
    audio.blip(660, 0.08, 'sine', 0.06, 0.3);
  }
  var SAVE_KEYS = ['mg_rune', 'mg_peak', 'mg_seen', 'mg_best', 'mg_life', 'mg_dex', 'mg_ver',
    'mg_mute', 'mg_music', 'mg_vib', 'mg_tut', 'mg_ng', 'mg_daily', 'mg_dchal', 'mg_recent'];
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
    var useTier = nextTier;
    if (seaEvent.type === 'bless' && seaEvent.data && seaEvent.data.left > 0) {
      useTier = seaEvent.data.tier;
      seaEvent.data.left--;
      nextIron = false; nextSpecial = null; nextRune = null;
    }
    if (nextIron && ironCount() < C.iron.maxActive) {
      createIron(clampAim(aimX), C.spawnY);
      addShake(2, 0.15);
      reefCooldown = C.iron.cooldownDrops;
    } else {
      nb = phys.create(clampAim(aimX), C.spawnY, useTier, 0, 0);
      if (nextSpecial) { nb.special = nextSpecial; nb.specialT = 0; discoverSpecial(nextSpecial); }
      else if (nextRune) {
        nb.rune = nextRune;
        discoverSpecial('rune');
        if (!runeHintShown) {
          runeHintShown = true;
          addPopup(C.W / 2, 244, '带符文的水滴：合成即可为技能充能', false, 0, 2.0, 'todo');
        }
      }
      if (ng.active && ng.active.ice && Math.random() < ng.active.ice) nb.ngIce = true;
      unlockTier(useTier);
    }
    cooldown = C.dropCooldown;
    audio.drop();
    dropCount++;
    if (dropCount >= TUT_STEPS.length && !tutDone) { tutDone = true; saveFlag('mg_tut', 1); }
    nextTier = rollTier();
    rollNextDrop();
    if (seaEvent.type === 'bless' && seaEvent.data && seaEvent.data.left > 0) { nextTier = seaEvent.data.tier; nextIron = false; nextSpecial = null; nextRune = null; }
    aimX = clampAim(aimX);
  }

  window.addEventListener('pointerup', function () { audio.ensure(); });
  window.addEventListener('keydown', function () { audio.ensure(); });
  canvas.addEventListener('pointerdown', function (e) {
    e.preventDefault();
    audio.ensure();
    var p = toLocal(e);
    lastPointer = p;
    if (menuTrans.dir && performance.now() / 1000 - menuTrans.t0 < menuTrans.dur) return;
    if (confirmOpen) {
      if (inRect(p, MG.layout.confirmCloseRect())) { confirmOpen = false; return; }
      if (inRect(p, MG.layout.confirmBtnRect(0))) { confirmOpen = false; goHome(); return; }
      if (inRect(p, MG.layout.confirmBtnRect(1))) { confirmOpen = false; restart(); return; }
      confirmOpen = false;
      return;
    }
    if (setClearOpen) {
      if (inRect(p, MG.layout.setClearCloseRect())) { setClearOpen = false; return; }
      if (inRect(p, MG.layout.setClearBtnRect(0))) { setClearOpen = false; return; }
      if (inRect(p, MG.layout.setClearBtnRect(1))) { clearSaveData(); return; }
      setClearOpen = false;
      return;
    }
    if (setOpen) {
      if (inRect(p, MG.layout.setCloseRect())) { setOpen = false; return; }
      for (var si = 0; si < 3; si++) {
        if (inRect(p, MG.layout.setRowRect(si))) {
          if (si === 2) { setClearOpen = true; audio.blip(520, 0.1, 'sine', 0.08, 0.7); return; }
          toggleSet(si); return;
        }
      }
      setOpen = false;
      return;
    }
    if (shareOpen) {
      if (inRect(p, shareCopyBtn)) {
        copyShareText();
        return;
      }
      shareOpen = false;
      return;
    }
    if (state === 'menu' && !achOpen && !dexOpen && !setOpen) {
      for (var mtk = 0; mtk < menuTiles.length; mtk++) {
        var mt = menuTiles[mtk];
        if (inRect(p, MG.layout.menuTileRect(mt.side, mt.i))) {
          mt.pressT = 0.16;
          audio.blip(600, 0.1, 'sine', 0.08, 0.5);
          mt.act();
          return;
        }
      }
      if (inCircle(p, { cx: setBtn.cx, cy: setBtn.cy + hudInset, r: setBtn.r })) { setBtn.pressT = 0.16; setOpen = true; return; }
      if (inRect(p, menuStartBtn)) {
        menuStartBtn.pressT = 0.2;
        audio.blip(660, 0.12, 'sine', 0.1, 0.4);
        restart();
        startTransition('in', C.W / 2, menuStartBtn.y + menuStartBtn.h / 2);
      }
      return;
    }
    if (dexOpen) {
      if (inRect(p, dexCloseBtn) || !inRect(p, DEX_PANEL)) { dexOpen = false; return; }
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
          for (var st = 0; st < C.seaStages.length; st++) {
            for (var slot = 0; slot < 2; slot++) {
              if (inRect(p, spSlotRect(st, slot))) {
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
      if (dexTab === 2 && inRect(p, dchalBtnRect())) { audio.blip(660, 0.1, 'triangle', 0.1, 1.4); dchalStart(); return; }
      if (dexTab === 0) achDrag = { y: p.y, s0: achScroll };
      return;
    }
    if (inCircle(p, { cx: setBtn.cx, cy: setBtn.cy + hudInset, r: setBtn.r })) { setBtn.pressT = 0.16; setOpen = true; return; }
    if (inCircle(p, bookBtn)) {
      bookBtn.pressT = 0.16; dexOpen = true; achOpen = false;
      dexSelTier = -1; dexSelSp = -1; dexSelStage = -1;
      if (dexSec === 0) {
        for (var dt = T.length - 1; dt >= 0; dt--) if (dexUnlocked[dt]) { dexSelTier = dt; break; }
        if (dexSelTier < 0) dexSelTier = 0;
      } else {
        dexSelStage = seaStage();
      }
      return;
    }
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
      if (ball && ball.iron && tide.progress < C.iron.tideNeed) {
        flashSkill('evap', '退潮中 · 需涨潮才能蒸发礁石');
        return;
      }
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
        else if (fb === flowPick) { flowPick = null; }
        else flowSwap(flowPick, fb);
      } else if (!fb) { flowMode = false; flowPick = null; }
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
    if (achDrag && achOpen && dexTab === 0) {
      achScroll = Math.max(0, Math.min(achDrag.s0 + (achDrag.y - p.y), achMaxScroll()));
      return;
    }
    if (state !== 'play' || dexOpen || achOpen || setOpen || ngOpen || shareOpen || confirmOpen || evapMode || flowMode) return;
    aimX = clampAim(p.x);
  });
  canvas.addEventListener('pointerup', function (e) {
    achDrag = null;
    if (!aiming || state !== 'play' || dexOpen || achOpen || setOpen || ngOpen || shareOpen || confirmOpen || evapMode || flowMode || rippleMode) { aiming = false; return; }
    aiming = false;
    aimX = clampAim(toLocal(e).x);
    tryDrop();
  });
  canvas.addEventListener('pointercancel', function () { aiming = false; achDrag = null; });
  canvas.addEventListener('wheel', function (e) {
    if (achOpen && dexTab === 0) {
      e.preventDefault();
      achScroll = Math.max(0, Math.min(achScroll + e.deltaY, achMaxScroll()));
    }
  }, { passive: false });

  function update(dt) {
    if (seaFade) { seaFade.t += dt; if (seaFade.t >= seaFade.dur) seaFade = null; }
    if (state === 'menu') { time += dt; updateFx(dt); return; }
    if (dexOpen || achOpen || setOpen || ngOpen || shareOpen || confirmOpen) {
      time += dt;
      updateFx(dt);
      return;
    }
    if (state !== 'play') { time += dt; updateFx(dt); return; }

    ironN = ironCount();
    updateReefClusters();
    time += dt;
    if (rainHint > 0) rainHint -= dt;
    cooldown = Math.max(0, cooldown - dt);

    levelElapsed += dt;
    checkDexGates();
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
    if ((seenTick += dt) >= 30) { seenTick = 0; saveNum('mg_seen', Date.now()); }

    updateTide(dt);
    phys.step(dt);
    applyBuoyancy(dt);
    updateReefErode(dt);
    updateSpecials(dt);
    updateCombos(dt);

    var i, b;
    for (i = 0; i < phys.bodies.length; i++) {
      b = phys.bodies[i];
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
      var k = spd > 70 ? Math.min(0.14, spd / 3200) : 0;
      var tx = k > 0 ? (b.svx / spd) * k : 0;
      var ty = k > 0 ? (b.svy / spd) * k : 0;
      var dsm = Math.min(1, dt * 10);
      b.defX = (b.defX || 0) + (tx - b.defX) * dsm;
      b.defY = (b.defY || 0) + (ty - b.defY) * dsm;
      var mag = Math.sqrt(b.defX * b.defX + b.defY * b.defY);
      if (mag < 0.01) { b.defX = 0; b.defY = 0; mag = 0; }
      b.defK = mag;
    }
    for (i = 0; i < phys.bodies.length; i++) {
      b = phys.bodies[i];
      if (b.grace > 0) b.grace -= dt;
      if (b.popT > 0) b.popT -= dt;
      if (!b.trail) b.trail = [];
      b.trail.push({ x: b.rx != null ? b.rx : b.x, y: b.ry != null ? b.ry : b.y });
      if (b.trail.length > 6) b.trail.shift();
    }

    endlessT += dt;
    var stgR = Math.floor(endlessRamp() * 4);
    if (stgR > rampStage) { rampStage = stgR; addPopup(C.W / 2, 250, '海域渐深：潮汐更频 · 礁石更多', true, 0); }
    if (score - climaxMark >= C.climaxEvery) doClimax();
    var dg = 0;
    for (i = 0; i < phys.bodies.length; i++) {
      b = phys.bodies[i];
      var ddist = (b.y - b.r) - C.dangerY;
      if (ddist < 90) dg = Math.max(dg, 1 - Math.max(0, ddist) / 90);
    }
    audio.bgm.setDanger(dg);
    audio.bgm.setTide(tide.progress, (tide.phase === 'idle' && tide.timer < C.tide.warnTime) ? 1 : 0);

    updateReefHint();
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
  var DEX_PANEL = { x: MG.layout.panel.dex.x, y: 65, w: MG.layout.panel.dex.w, h: MG.layout.panel.dex.h };
  var dexCloseBtn = { x: DEX_PANEL.x + DEX_PANEL.w - 40, y: DEX_PANEL.y + 10, w: 30, h: 30 };
  function layoutDexPanel() {
    DEX_PANEL.y = state === 'menu'
      ? Math.max(10, Math.round((VH - DEX_PANEL.h) / 2))
      : Math.max(10, Math.round(MG.layout.panel.dexY));
    dexCloseBtn.y = DEX_PANEL.y + 8;
  }
  var SET_PANEL = { x: 0, y: 0, w: 0, h: 0 };
  var setCloseBtn = { x: 0, y: 0, w: 30, h: 30 };
  function layoutSetPanel() {
    var r = MG.layout.setRect();
    SET_PANEL.x = r.x; SET_PANEL.y = r.y; SET_PANEL.w = r.w; SET_PANEL.h = r.h;
    setCloseBtn.x = r.x + r.w - 40; setCloseBtn.y = r.y + 8;
  }
  var shareCopyBtn = { x: 0, y: 0, w: 150, h: 42 };
  function spSlotRect(stg, s) {
    var r = stageRowRect(stg);
    return { x: r.x + r.w - 196 + s * 98, y: r.y + 6, w: 92, h: 32 };
  }
  function tierCellRect(t) {
    return { x: DEX_PANEL.x + 14 + (t % 3) * 122, y: DEX_PANEL.y + 124 + Math.floor(t / 3) * 126, w: 108, h: 112 };
  }
  function stageRowRect(g) {
    return { x: DEX_PANEL.x + 14, y: DEX_PANEL.y + 126 + g * 48, w: DEX_PANEL.w - 28, h: 44 };
  }
  function dexSecRect(i) {
    var segW = Math.floor((DEX_PANEL.w - 30) / 2);
    return { x: DEX_PANEL.x + 15 + i * segW, y: DEX_PANEL.y + 84, w: segW, h: 34 };
  }
  function dchalBtnRect() {
    ctx.font = 'bold 15px system-ui, sans-serif';
    var tw = Math.round(ctx.measureText('开始挑战').width);
    var w = tw + 56, h = 36;
    return { x: DEX_PANEL.x + Math.round((DEX_PANEL.w - w) / 2), y: DEX_PANEL.y + 152, w: w, h: h };
  }

  var ACH_ROW_H = 64, ACH_ROW_GAP = 8;
  function achViewport() {
    return { x: DEX_PANEL.x + 10, y: DEX_PANEL.y + 52, w: DEX_PANEL.w - 20, h: DEX_PANEL.h - 68 };
  }
  function achContentH() { return ACH_DEFS.length * (ACH_ROW_H + ACH_ROW_GAP) - ACH_ROW_GAP; }
  function achMaxScroll() { return Math.max(0, achContentH() - (DEX_PANEL.h - 68)); }

  function drawPanelHeader(title, rect, closeBtn, icon, accent, noBg) {
    var cy = closeBtn ? closeBtn.y + closeBtn.h / 2 : rect.y + 30;
    ctx.textAlign = 'left';
    var tx = rect.x + 18;
    if (icon) {
      var icx = rect.x + 30;
      if (typeof icon === 'function') {
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
  var segAnims = {};
  function drawSegTabs(rects, labels, active, dotIdx, key) {
    var now = performance.now() / 1000;
    var r0 = rects[0], rl = rects[rects.length - 1];
    ctx.fillStyle = 'rgba(21,90,138,0.10)';
    roundRect(r0.x, r0.y, rl.x + rl.w - r0.x, r0.h, r0.h / 2); ctx.fill();
    var st = segAnims[key];
    if (!st) { st = segAnims[key] = { cur: active, fx: rects[active].x, fw: rects[active].w, t0: -9 }; }
    if (active !== st.cur) {
      st.cur = active; st.t0 = now;
    }
    var p = Math.min(1, (now - st.t0) / 0.18);
    p = 1 - (1 - p) * (1 - p) * (1 - p);
    var tx0 = st.fx + (rects[active].x - st.fx) * p;
    var tw0 = st.fw + (rects[active].w - st.fw) * p;
    if (p >= 1) { st.fx = rects[active].x; st.fw = rects[active].w; }
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
      if (i === dotIdx && i !== active) {
        ctx.fillStyle = '#E2705E';
        ctx.beginPath(); ctx.arc(sr.x + sr.w - 11, sr.y + 7, 3, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.textBaseline = 'alphabetic';
  }
  function drawColBadge() {
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
    panel(DEX_PANEL.x, DEX_PANEL.y, DEX_PANEL.w, DEX_PANEL.h, 14, 0.96);
    drawPanelHeader('图鉴', DEX_PANEL, dexCloseBtn, function () {
      ctx.save(); ctx.scale(0.6, 0.6);
      ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 1.8;
      ctx.strokeRect(-8, -6, 16, 12);
      ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(0, 6); ctx.stroke();
      ctx.restore();
    }, '#4A7FA0');
    drawColBadge();

    var secNames = ['合成链', '海域演进'];
    var secRects = [dexSecRect(0), dexSecRect(1)];
    drawSegTabs(secRects, secNames, dexSec, -1, 'dexsec');
    var curStage = seaStage(), tsNow = totalScore(), bestScore = Math.max(tsNow, careerPeak);
    var nextIdx = C.seaStages.length;
    for (var si = 0; si < C.seaStages.length; si++) {
      if (bestScore < C.seaStages[si].at) { nextIdx = si; break; }
    }
    ctx.textAlign = 'center';

    if (dexSec === 0) {
      for (var t = 0; t < T.length; t++) {
        var tRect = tierCellRect(t);
        var unlocked = !!dexUnlocked[t], sel = dexSelTier === t;
        ctx.fillStyle = sel ? 'rgba(46,134,180,0.16)' : 'rgba(46,134,180,0.07)';
        roundRect(tRect.x, tRect.y, tRect.w, tRect.h, 10); ctx.fill();
        if (sel) {
          ctx.strokeStyle = '#2E86B4'; ctx.lineWidth = 1.5;
          roundRect(tRect.x + 0.5, tRect.y + 0.5, tRect.w - 1, tRect.h - 1, 10); ctx.stroke();
        }
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

      ctx.textAlign = 'left';
      for (var stg = 0; stg < C.seaStages.length; stg++) {
        var ss = C.seaStages[stg];
        var sRow = stageRowRect(stg);
        var isCur = stg === curStage, reached = bestScore >= ss.at, sel = dexSelStage === stg;
        var isNext = !reached && stg === nextIdx, hiddenStg = !isCur && !reached && !isNext;
        var rowCy = sRow.y + sRow.h / 2;
        if (isCur) {
          var rowG = ctx.createLinearGradient(sRow.x, 0, sRow.x + sRow.w, 0);
          rowG.addColorStop(0, ss.bg[2]);
          rowG.addColorStop(1, ss.bg[3]);
          ctx.fillStyle = rowG;
        } else if (reached) {
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
        var dotX = sRow.x + 20, dotY = rowCy;
        if (isCur) {
          ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(dotX, dotY, 12.5 + Math.sin(time * 4) * 1.2, 0, Math.PI * 2); ctx.stroke();
        }
        if (isCur || reached || isNext) drawSeaBadge(stg, dotX, dotY, reached || isCur);
        var nameTxt = isCur || reached || isNext ? ss.name : '？？？';
        var gateTxt = isCur ? '当前海域' : (reached ? '已抵达' : (isNext ? '下一海域 · 累计' + (ss.at >= 10000 ? (ss.at / 10000) + '万' : ss.at) + '分' : '累计 ' + (ss.at >= 10000 ? (ss.at / 10000) + '万' : ss.at) + ' 分解锁'));
        var mN = measureInk('bold 15px system-ui, sans-serif', nameTxt);
        var mG = measureInk('11px system-ui, sans-serif', gateTxt);
        var aN = mN.has ? mN.a : 15 * 0.84;
        var dG = mG.has ? mG.d : 11 * 0.06;
        var LINE_GAP = 14;
        var yN = rowCy - (aN + LINE_GAP + dG) / 2 + aN;
        var yG = yN + LINE_GAP;
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
        var slots2 = STAGE_SP_SLOTS[stg] || STAGE_SP_SLOTS[0];
        for (var sl = 0; sl < 2; sl++) {
          var slotR = spSlotRect(stg, sl);
          var spIdx2 = slots2[sl];
          var isChest2 = spIdx2 === SP_DEFS.length;
          var spDef2 = isChest2 ? null : SP_DEFS[spIdx2];
          var found2 = !!dexSpecial[isChest2 ? 'chest' : spDef2.key];
          if (dexSelSp === spIdx2 && dexSelStage < 0) {
            ctx.fillStyle = 'rgba(46,134,180,0.14)';
            roundRect(slotR.x, slotR.y, slotR.w, slotR.h, 8); ctx.fill();
            ctx.strokeStyle = '#2E86B4'; ctx.lineWidth = 1.2;
            roundRect(slotR.x + 0.5, slotR.y + 0.5, slotR.w - 1, slotR.h - 1, 8); ctx.stroke();
          }
          var cx2 = slotR.x + 15, cy2 = rowCy;
          var spName2 = found2 ? (isChest2 ? '大宝箱' : spDef2.name) : '？？？';
          var m2 = measureInk('13px system-ui, sans-serif', spName2);
          var tw2 = m2.w;
          var TXT_COL = 57;
          var tx2 = slotR.x + 30 + Math.max(0, (TXT_COL - tw2) / 2);
          var y2 = cy2 + ((m2.has ? m2.a : 13 * 0.84) - (m2.has ? m2.d : 13 * 0.06)) / 2;
          if ((hiddenStg || isNext) && !reached) {
            ctx.save();
            ctx.setLineDash([3, 3]);
            ctx.strokeStyle = '#A8BCCB'; ctx.lineWidth = 1;
            roundRect(slotR.x + 0.5, slotR.y + 0.5, slotR.w - 1, slotR.h - 1, 8); ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = '#A8BCCB';
            ctx.font = '13px system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('？？？', slotR.x + slotR.w / 2, y2);
            ctx.textAlign = 'left';
            ctx.restore();
            continue;
          }
          if (found2) {
            ctx.fillStyle = 'rgba(255,255,255,0.30)';
            ctx.beginPath(); ctx.arc(cx2, cy2, 12, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1;
            ctx.stroke();
            drawSpForm(spIdx2, cx2, cy2);
          } else {
            ctx.fillStyle = 'rgba(196,212,224,0.55)';
            ctx.beginPath(); ctx.arc(cx2, cy2, 9, 0, Math.PI * 2); ctx.fill();
            ctx.setLineDash([2.5, 2.5]);
            ctx.strokeStyle = '#5E7E96'; ctx.lineWidth = 1.2;
            ctx.beginPath(); ctx.arc(cx2, cy2, 10.8, 0, Math.PI * 2); ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = '#3E647E';
            ctx.font = 'bold 14px system-ui, sans-serif';
            ctx.textAlign = 'center';
            var mq = measureInk('bold 14px system-ui, sans-serif', '?');
            var yq = cy2 + ((mq.has ? mq.a : 14 * 0.72) - (mq.has ? mq.d : 14 * 0.02)) / 2;
            ctx.fillText('?', cx2, yq);
            ctx.textAlign = 'left';
          }
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

  function drawAchPanel() {
    layoutDexPanel();
    panel(DEX_PANEL.x, DEX_PANEL.y, DEX_PANEL.w, DEX_PANEL.h, 14, 0.96);
    var titles = ['成就', '每日任务', '每日挑战', '榜单'];
    drawPanelHeader(titles[dexTab] || '成就', DEX_PANEL, dexCloseBtn, ['🏆', '📋', '🎯', '🥇'][dexTab] || '🏆', null, true);
    if (dexTab === 1) drawDailyTasksTab();
    else if (dexTab === 2) drawDchalCard();
    else if (dexTab === 3) drawRankTab();
    else drawAchTab();
  }

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
    ctx.strokeStyle = 'rgba(255,240,190,0.5)'; ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-w * 0.34, -h * 0.30);
    ctx.quadraticCurveTo(0, -h * 0.62, w * 0.34, -h * 0.30);
    ctx.stroke();
    ctx.fillStyle = grad('chestBodyI', function () {
      var gg2 = ctx.createLinearGradient(0, seamY, 0, h * 0.56);
      gg2.addColorStop(0, '#D8A44C'); gg2.addColorStop(0.5, '#C08A38'); gg2.addColorStop(1, '#8F5E22');
      return gg2;
    });
    roundRect(-w / 2, seamY, w, h * 0.62, 2.5); ctx.fill();
    ctx.strokeStyle = 'rgba(110,66,20,0.45)'; ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-w * 0.17, seamY + 2); ctx.lineTo(-w * 0.17, h * 0.52);
    ctx.moveTo(w * 0.17, seamY + 2); ctx.lineTo(w * 0.17, h * 0.52);
    ctx.stroke();
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
    var seamG = 0.26 + 0.24 * Math.sin(time * 3 + 1);
    ctx.fillStyle = 'rgba(255,224,130,' + seamG.toFixed(2) + ')';
    roundRect(-w * 0.4, seamY - 1, w * 0.8, 2, 1); ctx.fill();
    ctx.fillStyle = '#FFD873';
    roundRect(-3.6, seamY - 2.5, 7.2, 8, 2); ctx.fill();
    ctx.fillStyle = '#5A3A14';
    ctx.beginPath(); ctx.arc(0, seamY + 1, 1.3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-0.7, seamY + 1.8); ctx.lineTo(0.7, seamY + 1.8);
    ctx.lineTo(0.45, seamY + 4.2); ctx.lineTo(-0.45, seamY + 4.2);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(242,193,78,0.85)'; ctx.lineWidth = 1.1;
    roundRect(-w / 2, seamY, w, h * 0.62, 2.5); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-w / 2, seamY);
    ctx.quadraticCurveTo(0, -h * 0.72, w / 2, seamY);
    ctx.stroke();
    ctx.restore();
  }

  var SEA_BADGES = [
    { c: '#3BB8D8', g: 'pool' },
    { c: '#38A98A', g: 'coral' },
    { c: '#2E9BD4', g: 'bubbles' },
    { c: '#4A5FB4', g: 'star' },
    { c: '#647FA8', g: 'moon' },
    { c: '#2A4C8A', g: 'eye' },
    { c: '#B85C3A', g: 'vent' },
    { c: '#8A5FB4', g: 'crown' }
  ];
  function drawSeaBadge(stg, x, y, reached, opaque, r) {
    var ic = SEA_BADGES[stg] || SEA_BADGES[0];
    ctx.save();
    ctx.translate(x, y);
    if (r && r !== 10) ctx.scale(r / 10, r / 10);
    ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2);
    if (reached) {
      ctx.fillStyle = ic.c; ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 1; ctx.stroke();
    } else {
      ctx.fillStyle = opaque ? '#EFF5FA' : 'rgba(120,145,165,0.16)'; ctx.fill();
      ctx.strokeStyle = '#8AA5B8'; ctx.lineWidth = 1; ctx.stroke();
    }
    var fg = reached ? '#FFFFFF' : '#8AA5B8';
    ctx.strokeStyle = fg; ctx.fillStyle = fg;
    ctx.lineWidth = 1.4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    switch (ic.g) {
      case 'pool':
        ctx.moveTo(-5.5, -2.5); ctx.quadraticCurveTo(-2.8, -5.5, 0, -2.5); ctx.quadraticCurveTo(2.8, 0.5, 5.5, -2.5);
        ctx.moveTo(-5.5, 3.5); ctx.quadraticCurveTo(-2.8, 0.5, 0, 3.5); ctx.quadraticCurveTo(2.8, 6.5, 5.5, 3.5);
        ctx.stroke(); break;
      case 'coral':
        ctx.moveTo(0, 5); ctx.lineTo(0, -1);
        ctx.moveTo(0, 0); ctx.lineTo(-3.5, -4.5);
        ctx.moveTo(0, 1); ctx.lineTo(3.5, -2.5);
        ctx.moveTo(-3.5, -4.5); ctx.lineTo(-2, -5.5);
        ctx.stroke(); break;
      case 'bubbles':
        ctx.arc(-2.5, 3, 1.7, 0, Math.PI * 2);
        ctx.moveTo(1.8, -0.5); ctx.arc(0.8, -0.5, 1.1, 0, Math.PI * 2);
        ctx.moveTo(3.4, -3.8); ctx.arc(3, -3.8, 0.6, 0, Math.PI * 2);
        ctx.stroke(); break;
      case 'star':
        ctx.moveTo(0, -5); ctx.quadraticCurveTo(0.9, -0.9, 5, 0);
        ctx.quadraticCurveTo(0.9, 0.9, 0, 5);
        ctx.quadraticCurveTo(-0.9, 0.9, -5, 0);
        ctx.quadraticCurveTo(-0.9, -0.9, 0, -5);
        ctx.fill(); break;
      case 'moon':
        ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = reached ? ic.c : 'rgba(120,145,165,0.16)';
        ctx.beginPath(); ctx.arc(2.2, -1.6, 4.4, 0, Math.PI * 2); ctx.fill(); break;
      case 'eye':
        ctx.ellipse(0, 0, 5.2, 3.1, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 0, 1.7, 0, Math.PI * 2); ctx.fill(); break;
      case 'vent':
        ctx.moveTo(0, -5.5); ctx.quadraticCurveTo(4.5, -0.5, 2.2, 4.5);
        ctx.lineTo(-2.2, 4.5); ctx.quadraticCurveTo(-4.5, -0.5, 0, -5.5);
        ctx.fill(); break;
      case 'crown':
        ctx.moveTo(-5, 3.5); ctx.lineTo(-5, -2); ctx.lineTo(-2.2, 0.2);
        ctx.lineTo(0, -4.2); ctx.lineTo(2.2, 0.2); ctx.lineTo(5, -2);
        ctx.lineTo(5, 3.5); ctx.closePath(); ctx.fill(); break;
    }
    ctx.restore();
  }

  function drawSpForm(spIdx, x, y) {
    if (spIdx === SP_DEFS.length) { drawChestIcon(x, y, 0.76); return; }
    var key = SP_DEFS[spIdx].key;
    if (key === 'iron') { drawIronBall({ x: x, y: y, r: 11, vx: 0, vy: 0 }, 1); return; }
    if (key === 'rune') { drawBall({ x: x, y: y, r: 11, tier: 1, vx: 0, vy: 0, rune: 'ripple' }, 1); return; }
    drawBall({ x: x, y: y, r: 11, tier: 1, vx: 0, vy: 0, special: key, frozen: key === 'ice' ? 1 : 0 }, 1);
  }

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
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        for (var sp = 0; sp < 5; sp++) {
          var sa = -Math.PI / 2 + sp * 2 * Math.PI / 5, sa2 = sa + Math.PI / 5;
          ctx.lineTo(mx + Math.cos(sa) * 7, my + 0.5 + Math.sin(sa) * 7);
          ctx.lineTo(mx + Math.cos(sa2) * 3, my + 0.5 + Math.sin(sa2) * 3);
        }
        ctx.closePath(); ctx.fill();
      } else {
        ctx.strokeStyle = '#7E93A2'; ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.arc(mx, my - 2, 3.2, Math.PI, 0); ctx.stroke();
        ctx.fillStyle = '#7E93A2';
        roundRect(mx - 5, my - 2, 10, 8, 2); ctx.fill();
      }
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
  function truncText(s, maxW) {
    if (ctx.measureText(s).width <= maxW) return s;
    while (s.length > 1 && ctx.measureText(s + '…').width > maxW) s = s.slice(0, -1);
    return s + '…';
  }

  function drawOfflineCard() {
    if (state !== 'menu' || !offlineGain) return;
    var mu = MG.layout.menu;
    var w = mu.offlineW, h = mu.offlineH, x = (C.W - w) / 2, y = mu.offlineY;
    ctx.textBaseline = 'alphabetic';
    var og = ctx.createLinearGradient(0, y, 0, y + h);
    og.addColorStop(0, 'rgba(245,197,66,0.16)');
    og.addColorStop(1, 'rgba(217,169,63,0.08)');
    ctx.fillStyle = og;
    roundRect(x, y, w, h, 10); ctx.fill();
    ctx.strokeStyle = 'rgba(245,197,66,0.55)'; ctx.lineWidth = 1.2;
    roundRect(x, y, w, h, 10); ctx.stroke();
    ctx.textAlign = 'center';
    var om = offlineGain.mins;
    var lines = [
      { t: '大宝箱 · 离线收益', f: 'bold 15px system-ui, sans-serif', c: '#8A6508' },
      { t: '离开 ' + (om >= 60 ? Math.floor(om / 60) + ' 时 ' + (om % 60) + ' 分' : om + ' 分钟') + ' · 深海攒下 ' + offlineGain.gain + ' 分', f: '13px system-ui, sans-serif', c: 'rgba(90,66,20,0.88)' },
      { t: '开始游戏后自动入账', f: '11px system-ui, sans-serif', c: 'rgba(125,100,40,0.62)' }
    ];
    var box = [], tot = 0, li;
    for (li = 0; li < lines.length; li++) {
      var mm = measureInk(lines[li].f, lines[li].t);
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
      yy += box[li].a;
      ctx.fillText(lines[li].t, C.W / 2, yy);
      yy += box[li].d + lgap;
    }
    ctx.textAlign = 'center';
  }

  function drawDchalCard() {
    var ci = dchalInfo();
    var x = DEX_PANEL.x + 14, y = DEX_PANEL.y + 54, w = DEX_PANEL.w - 28, h = 150;
    var hg = ctx.createLinearGradient(0, y, 0, y + h);
    hg.addColorStop(0, '#7B6FD0'); hg.addColorStop(1, '#5A4AA8');
    ctx.fillStyle = hg;
    roundRect(x, y, w, h, 16); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.28)'; ctx.lineWidth = 1.2;
    roundRect(x + 0.5, y + 0.5, w - 1, h - 1, 16); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.beginPath(); ctx.arc(x + w - 24, y + 20, 16, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + w - 46, y + 38, 7, 0, Math.PI * 2); ctx.fill();
    var mx = x + 34, my = y + 58;
    ctx.fillStyle = '#FFD873';
    ctx.beginPath(); ctx.arc(mx, my, 15, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#8A5A18';
    ctx.beginPath();
    ctx.moveTo(mx - 7, my + 4); ctx.lineTo(mx - 7, my - 2); ctx.lineTo(mx - 3.2, my + 0.5);
    ctx.lineTo(mx, my - 5.5); ctx.lineTo(mx + 3.2, my + 0.5); ctx.lineTo(mx + 7, my - 2);
    ctx.lineTo(mx + 7, my + 4); ctx.closePath(); ctx.fill();
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
      if (a.today) continue;
      var ry = listY + shown * (rowH + rowGap);
      ctx.fillStyle = 'rgba(255,255,255,0.62)';
      roundRect(x, ry, w, rowH, 10); ctx.fill();
      ctx.strokeStyle = 'rgba(46,110,150,0.10)'; ctx.lineWidth = 1;
      roundRect(x + 0.5, ry + 0.5, w - 1, rowH - 1, 10); ctx.stroke();
      var bx = x + 24, by = ry + rowH / 2;
      ctx.fillStyle = '#D5DFE6';
      ctx.beginPath(); ctx.arc(bx, by, 9, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#A8BCCB'; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.fillStyle = '#8AA5B8';
      roundRect(bx - 4, by - 1, 8, 6.5, 1.5); ctx.fill();
      ctx.strokeStyle = '#8AA5B8'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(bx, by - 1.5, 2.6, Math.PI, 0); ctx.stroke();
      ctx.textAlign = 'left';
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.fillStyle = '#8AA5B8';
      ctx.fillText(a.name, x + 44, ry + 18);
      ctx.font = '10.5px system-ui, sans-serif';
      ctx.fillStyle = '#A8BCCB';
      ctx.fillText(a.desc + (a.mult ? ' · 得分 ×' + a.mult : ''), x + 44, ry + 33);
      ctx.textAlign = 'right';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.fillStyle = a.count > 0 ? '#D9A93F' : '#B9C9D4';
      ctx.fillText('已完成 ' + (a.count || 0) + ' 次', x + w - 12, ry + rowH / 2 + 4);
      shown++;
    }
  }

  function drawDailyTasksTab() {
    var doneCnt = 0;
    for (var di0 = 0; di0 < daily.tasks.length; di0++) if (daily.done[di0]) doneCnt++;
    var x = DEX_PANEL.x + 14, w = DEX_PANEL.w - 28;
    var fy = DEX_PANEL.y + 54, fh = 80;
    var hgr = ctx.createLinearGradient(0, fy, 0, fy + fh);
    if (daily.allDone) { hgr.addColorStop(0, '#F7CE5B'); hgr.addColorStop(1, '#DFA23C'); }
    else { hgr.addColorStop(0, '#3B97C9'); hgr.addColorStop(1, '#1E6B9E'); }
    ctx.fillStyle = hgr;
    roundRect(x, fy, w, fh, 14); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1.2;
    roundRect(x + 0.5, fy + 0.5, w - 1, fh - 1, 14); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.beginPath(); ctx.arc(x + w - 30, fy + 20, 18, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + w - 58, fy + 52, 8, 0, Math.PI * 2); ctx.fill();
    var mx = x + 36, my = fy + 40;
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.beginPath(); ctx.arc(mx, my, 21, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.textAlign = 'center';
    ctx.font = '20px system-ui, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('🔥', mx, my + 7);
    ctx.textAlign = 'left';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('今日全勤奖励', x + 66, fy + 30);
    ctx.font = '10.5px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.78)';
    ctx.fillText('已连续 ' + (daily.streak || 0) + ' 天 · 全勤可得分数与充能加成', x + 66, fy + 50);
    ctx.fillText('任务每日 0 点刷新 · 难度随连续天数提升', x + 66, fy + 66);
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
        drawBall({ x: 0, y: 0, r: 14, tier: t.tier, vx: 0, vy: 0 }, 1);
      } else if (t.type === 'combo') {
        ctx.scale(1.6, 1.6);
        drawSkillIcon('ripple', 0, 0, '#2FA8A0');
      } else if (t.type === 'chest') {
        drawChestIcon(0, 1, 0.62);
      } else if (t.type === 'tide') {
        ctx.scale(1.5, 1.5);
        drawSeaBadge(seaStage(), 0, 0, true);
      } else {
        drawIronBall({ x: 0, y: 0, r: 13, vx: 0, vy: 0 }, 1);
      }
      ctx.restore();
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

  function drawRankTab() {
    var rows = recentBoard();
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
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.beginPath(); ctx.arc(bx + 30, by + 30, 18, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.textAlign = 'center';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('★', bx + 30, by + 35);
    ctx.textAlign = 'left';
    ctx.font = '10.5px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fillText('我的最佳成绩', bx + 58, by + 25);
    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(fmtScore(best), bx + 58, by + 47);
    ctx.textAlign = 'right';
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fillText('共 ' + recent.length + ' 局记录', bx + bw - 16, by + 35);
    var colW = 108, gap = 14, yBase = DEX_PANEL.y + 236;
    var tops = [rows[1] || null, rows[0] || null, rows[2] || null];
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
      ctx.fillText(String([2, 1, 3][p]), mx, my + 4.5);
      ctx.font = '11.5px system-ui, sans-serif';
      ctx.fillStyle = p === 1 ? '#7A5608' : '#3E647E';
      ctx.fillText(tops[p] ? truncText(tops[p].name, colW - 12) : '—', mx, py0 + 48);
      ctx.font = 'bold 13.5px system-ui, sans-serif';
      ctx.fillStyle = p === 1 ? '#7A5608' : '#155A8A';
      ctx.fillText(tops[p] ? fmtScore(tops[p].score) : '', mx, py0 + 66);
    }
    ctx.fillStyle = 'rgba(46,134,180,0.10)';
    roundRect(DEX_PANEL.x + 14, yBase, DEX_PANEL.w - 28, 8, 4); ctx.fill();
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
      ctx.fillText(r.name + ' · ' + (C.seaStages[r.sea] ? C.seaStages[r.sea].name : ''), DEX_PANEL.x + 58, ry + 33);
      ctx.textAlign = 'right';
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.fillStyle = r.me ? '#B8860B' : '#3E6E90';
      ctx.fillText(fmtScore(r.score), DEX_PANEL.x + DEX_PANEL.w - 26, ry + 33);
    }
    if (!rows.length) {
      ctx.textAlign = 'center';
      ctx.font = '13px system-ui, sans-serif';
      ctx.fillStyle = '#8AA5B8';
      ctx.fillText('完成一局后，这里会记录你的成绩排名', DEX_PANEL.x + DEX_PANEL.w / 2, DEX_PANEL.y + 300);
    }
    ctx.textAlign = 'center';
  }
  function fmtScore(n) {
    if (n >= 10000) return (Math.round(n / 1000) / 10) + '万';
    return String(n);
  }

  function drawShare() {
    var sr = MG.layout.shareRect();
    var pw = sr.w, ph = sr.h, px = sr.x, py = sr.y;
    panel(px, py, pw, ph, 16, 0.97);
    var head = ctx.createLinearGradient(0, py, 0, py + 96);
    head.addColorStop(0, '#2E86B4'); head.addColorStop(1, '#155A8A');
    ctx.fillStyle = head;
    roundRect(px, py, pw, 96, 16); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    roundRect(px, py + 80, pw, 16, 8); ctx.fill();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 25px system-ui, sans-serif';
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
    ctx.font = 'bold 58px system-ui, sans-serif';
    ctx.fillStyle = '#0F4C79';
    ctx.fillText(String(score), C.W / 2, py + 168);
    ctx.font = '15px system-ui, sans-serif';
    ctx.fillStyle = '#4A7FA0';
    var isNewBest = score >= best && score > 0;
    ctx.fillText(isNewBest ? '★ 新纪录！' : '最佳 ' + best, C.W / 2, py + 192);
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
    ctx.textAlign = 'left';
    ctx.font = '14px system-ui, sans-serif';
    var shLines = wrapLines(shareText, pw - 60);
    var shBoxH = Math.max(44, 20 + shLines.length * 16);
    ctx.fillStyle = 'rgba(46,134,180,0.06)';
    roundRect(px + 20, py + 278, pw - 40, shBoxH, 8); ctx.fill();
    ctx.fillStyle = '#3E6E90';
    for (var li = 0; li < shLines.length; li++) ctx.fillText(shLines[li], px + 32, py + 296 + li * 16);
    ctx.textAlign = 'center';
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

  var _gradCache = {};
  function grad(key, make) {
    var g = _gradCache[key];
    if (!g) {
      if (Object.keys(_gradCache).length > 96) _gradCache = {};
      g = make();
      _gradCache[key] = g;
    }
    return g;
  }
  function measureInk(font, text) {
    ctx.save();
    try {
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

    ctx.fillStyle = grad('sun' + lk, function () {
      var gg = ctx.createRadialGradient(LW * 0.5, -30, 20, LW * 0.5, -30, 300);
      gg.addColorStop(0, 'rgba(255,255,255,0.55)');
      gg.addColorStop(1, 'rgba(255,255,255,0)');
      return gg;
    });
    ctx.fillRect(0, 0, LW, 300);
    ctx.fillStyle = grad('glowL' + lk, function () {
      var gg = ctx.createRadialGradient(LW * 0.22, -50, 10, LW * 0.22, -50, 280);
      gg.addColorStop(0, 'rgba(255,255,255,0.30)');
      gg.addColorStop(1, 'rgba(255,255,255,0)');
      return gg;
    });
    ctx.fillRect(0, 0, LW, 300);
    ctx.fillStyle = grad('glowR' + lk, function () {
      var gg = ctx.createRadialGradient(LW * 0.8, -50, 10, LW * 0.8, -50, 280);
      gg.addColorStop(0, 'rgba(255,255,255,0.30)');
      gg.addColorStop(1, 'rgba(255,255,255,0)');
      return gg;
    });
    ctx.fillRect(0, 0, LW, 300);

    if (BX > 0) {
      var edge = BX + 26;
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

    var ray = grad('ray' + vk, function () {
      var gg = ctx.createLinearGradient(0, 0, 0, VH * 0.72);
      gg.addColorStop(0, 'rgba(255,255,255,1)');
      gg.addColorStop(1, 'rgba(255,255,255,0)');
      return gg;
    });
    for (var bi = 0; bi < 3; bi++) {
      var bx0 = BX + C.W * (0.18 + bi * 0.32) + Math.sin(time * 0.13 + bi * 2.1) * C.W * 0.04;
      var tilt = Math.sin(time * 0.09 + bi * 1.4) * 0.10 + (bi - 1) * 0.06;
      var bw = 70 - Math.abs(bi - 1) * 18;
      var rayA = 0.05 + 0.035 * (0.5 + 0.5 * Math.sin(time * 0.23 + bi * 2.6));
      ctx.save();
      ctx.translate(bx0, -10);
      ctx.rotate(tilt);
      var LAYERS = [[1, 0.14], [0.74, 0.2], [0.48, 0.28], [0.24, 0.38]];
      for (var li = 0; li < LAYERS.length; li++) {
        ctx.globalAlpha = rayA * LAYERS[li][1];
        ctx.fillStyle = ray;
        var lw = bw * LAYERS[li][0];
        ctx.fillRect(-lw / 2, 0, lw, VH * 0.82);
      }
      ctx.restore();
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.10)';
    ctx.lineWidth = 1.5;
    var ripN = Math.min(6, Math.max(3, Math.round(LW / 260)));
    var ripSpan = LW + 300;
    for (var ri = 0; ri < ripN; ri++) {
      var rx = ((time * (10 + (ri % 3) * 6) + ri * (ripSpan / ripN)) % ripSpan) - 150;
      var rp = ripN > 1 ? ri / (ripN - 1) : 0.5;
      var ry = VH * (0.22 + 0.62 * rp);
      ctx.beginPath();
      ctx.ellipse(rx, ry, 90 + (ri % 3) * 24, 12 + (ri % 3) * 4, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    var i, jl, tt;
    for (i = 0; i < jellies.length; i++) {
      jl = jellies[i];
      var pulse = 0.85 + 0.15 * Math.sin(time * 1.5 + jl.ph);
      ctx.save();
      ctx.translate(jl.x, jl.y);
      ctx.globalAlpha = 0.32;
      ctx.strokeStyle = 'rgba(' + jl.tint + ',0.55)';
      ctx.lineWidth = 1.6;
      ctx.lineCap = 'round';
      for (tt = -2; tt <= 2; tt++) {
        var tx0 = tt * jl.s * 0.28 * pulse;
        var tu = (tt * 0.28 + 1) / 2;
        var ty0 = Math.sin(tu * Math.PI * 2 + time * 2 + jl.ph) * jl.s * 0.06;
        var tl = jl.s * (1.8 - Math.abs(tt) * 0.2);
        ctx.beginPath();
        ctx.moveTo(tx0, ty0 + 1);
        ctx.quadraticCurveTo(tx0 + Math.sin(time * 2 + jl.ph + tt * 1.3) * 6, ty0 + tl * 0.55,
                             tx0 + Math.sin(time * 1.3 + tt * 1.7) * 9, ty0 + tl);
        ctx.stroke();
      }
      ctx.lineCap = 'butt';
      ctx.fillStyle = 'rgba(' + jl.tint + ',0.6)';
      ctx.beginPath();
      ctx.ellipse(0, 0, jl.s * pulse, jl.s * 0.8 / pulse, 0, Math.PI, Math.PI * 2);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(' + jl.tint + ',0.65)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (var sk = 0; sk <= 8; sk++) {
        var sx = -jl.s * pulse + (sk / 8) * 2 * jl.s * pulse;
        var sy = Math.sin((sk / 8) * Math.PI * 2 + time * 2 + jl.ph) * jl.s * 0.06;
        if (sk === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
      }
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = 1.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.ellipse(0, -jl.s * 0.05, jl.s * 0.6 * pulse, jl.s * 0.42 / pulse, 0, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
      ctx.lineCap = 'butt';
      ctx.restore();
    }

    for (i = 0; i < fishes.length; i++) {
      var f = fishes[i];
      if (f.fade <= 0.01) continue;
      ctx.save();
      ctx.globalAlpha = Math.min(1, f.fade);
      ctx.translate(f.x, f.y);
      ctx.scale(f.dir, 1);
      var twk = Math.sin(f.tail) * f.s * 0.18;
      var bodyG = grad('fish' + Math.round(f.s) + '_' + f.tint, function () {
        var gg = ctx.createLinearGradient(0, -f.s * 0.45, 0, f.s * 0.45);
        gg.addColorStop(0, 'rgba(' + f.tint + ',0.32)');
        gg.addColorStop(1, 'rgba(' + f.tintD + ',0.18)');
        return gg;
      });
      ctx.fillStyle = bodyG;
      ctx.beginPath();
      ctx.moveTo(-f.s * 0.55, twk * 0.3);
      ctx.quadraticCurveTo(-f.s * 0.95, -f.s * 0.12 + twk * 0.4, -f.s * 1.28, -f.s * 0.4 + twk);
      ctx.quadraticCurveTo(-f.s * 1.0, twk * 0.9, -f.s * 1.28, f.s * 0.4 + twk);
      ctx.quadraticCurveTo(-f.s * 0.95, f.s * 0.12 + twk * 0.4, -f.s * 0.55, twk * 0.3);
      ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(f.s, 0);
      ctx.quadraticCurveTo(f.s * 0.72, -f.s * 0.4, f.s * 0.28, -f.s * 0.44);
      ctx.quadraticCurveTo(-f.s * 0.12, -f.s * 0.44, -f.s * 0.42, -f.s * 0.24);
      ctx.quadraticCurveTo(-f.s * 0.58, -f.s * 0.12, -f.s * 0.62, twk * 0.3);
      ctx.quadraticCurveTo(-f.s * 0.58, f.s * 0.12, -f.s * 0.42, f.s * 0.24);
      ctx.quadraticCurveTo(-f.s * 0.12, f.s * 0.44, f.s * 0.28, f.s * 0.44);
      ctx.quadraticCurveTo(f.s * 0.72, f.s * 0.4, f.s, 0);
      ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-f.s * 0.15, -f.s * 0.42);
      ctx.quadraticCurveTo(f.s * 0.02, -f.s * 0.64, f.s * 0.28, -f.s * 0.4);
      ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(f.s * 0.08, f.s * 0.38);
      ctx.quadraticCurveTo(-f.s * 0.02, f.s * 0.58, -f.s * 0.2, f.s * 0.38);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(225,244,255,0.6)';
      ctx.beginPath();
      ctx.arc(f.s * 0.6, -f.s * 0.1, Math.max(1, f.s * 0.06), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    for (i = 0; i < glitters.length; i++) {
      var gl = glitters[i];
      var ga = 0.12 + 0.22 * Math.max(0, Math.sin(time * gl.sp + gl.ph));
      ctx.fillStyle = 'rgba(255,255,255,' + ga + ')';
      ctx.beginPath(); ctx.arc(gl.x, gl.y, gl.r, 0, Math.PI * 2); ctx.fill();
    }

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

    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1.2;
    for (i = 0; i < bubbles.length; i++) {
      var b = bubbles[i];
      var bx = b.x + Math.sin(b.sway * 1.4) * 6;
      ctx.beginPath(); ctx.arc(bx, b.y, b.r, 0, Math.PI * 2); ctx.stroke();
    }

    drawFlora(4, BX - 6, 3);
    drawFlora(BX + C.W + 6, LW - 4, 8);
  }

  function drawFlora(x0, x1, seed) {
    var w = x1 - x0;
    if (w < 26) return;
    var baseY = VH - 3;
    var left = (seed === 3);
    var edge = left ? x1 - 7 : x0 + 7;
    var dir = left ? -1 : 1;
    var sway = left ? 1 : -1;
    var k;
    ctx.lineCap = 'round';
    var rx = edge + dir * 4, rr = 13;
    ctx.fillStyle = 'rgba(12,52,88,0.38)';
    ctx.beginPath(); ctx.ellipse(rx, baseY + 4, rr, rr * 0.45, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(rx - rr * 0.5, baseY + 5, rr * 0.6, rr * 0.3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(190,225,250,0.14)';
    ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.ellipse(rx, baseY + 1, rr * 0.8, rr * 0.32, 0, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
  }

  function popScale(b) {
    if (!b.popT || b.popT <= 0) return 1;
    var t = b.popT / 0.28;
    if (t > 0.6) return 0.6 + (1.15 - 0.6) * (1 - t) / 0.4;
    return 1.15 - 0.15 * (0.6 - t) / 0.6;
  }

  function drawBall(b, alpha) {
    if (b.iron) { if (b.chest) drawChest(b, alpha); else drawIronBall(b, alpha); return; }
    var t = T[b.tier];
    var s = popScale(b);
    var r = b.r * s;
    var speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
    var bx = b.rx != null ? b.rx : b.x, by = b.ry != null ? b.ry : b.y;

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

    ctx.translate(bx, by);
    var k = b.defK || 0;
    if (k > 0.012) {
      ctx.rotate(Math.atan2(b.defY || 0, b.defX || 1));
      ctx.scale(1 + k, 1 - k);
    }

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

    ctx.save();
    ctx.strokeStyle = grad('bE' + b.tier + '_' + rk, function () {
      var gg = ctx.createLinearGradient(-r * 0.94, -r * 0.09, r * 0.21, -r * 0.92);
      gg.addColorStop(0, 'rgba(255,255,255,0)');
      gg.addColorStop(0.5, 'rgba(255,255,255,0.8)');
      gg.addColorStop(1, 'rgba(255,255,255,0)');
      return gg;
    });
    ctx.lineCap = 'round';
    var ARC_LAY = [[1, 0.22], [0.6, 0.34], [0.26, 0.5]];
    for (var al = 0; al < ARC_LAY.length; al++) {
      ctx.globalAlpha = alpha * 0.6 * ARC_LAY[al][1];
      ctx.lineWidth = Math.max(1.2, r * 0.055 * ARC_LAY[al][0]);
      ctx.beginPath(); ctx.arc(0, 0, r * 0.94, Math.PI * 1.03, Math.PI * 1.57); ctx.stroke();
    }
    ctx.restore();
    ctx.globalAlpha = alpha;

    var hp = (b.id || 0) * 1.13;
    var ha1 = 0.5 + 0.17 * Math.sin(time * 1.7 + hp);
    var hs1 = 1 + 0.06 * Math.sin(time * 1.7 + hp);
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
    else if (b.special === 'ice') drawIceMark(r);
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
    if (b.rune) drawRuneMark(r, b.rune);

    if (b.frozen > 0) drawFrozenShell(b, r);

    ctx.restore();
  }

  function drawIronBall(b, alpha) {
    var r = b.r;
    var bx = b.rx != null ? b.rx : b.x, by = b.ry != null ? b.ry : b.y;
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
    ctx.save();
    ctx.beginPath(); ctx.arc(0, 0, r * 0.99, 0, Math.PI * 2); ctx.clip();
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
    ctx.fillStyle = grad('ironVg' + rk2, function () {
      var gg = ctx.createRadialGradient(0, 0, r * 0.5, 0, 0, r);
      gg.addColorStop(0, 'rgba(20,16,10,0)');
      gg.addColorStop(0.75, 'rgba(20,16,10,0.14)');
      gg.addColorStop(1, 'rgba(20,16,10,0.42)');
      return gg;
    });
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    if (b.frozen > 0) drawFrozenShell(b, r);
    ctx.restore();
  }

  function drawFace(r) {    var ex = r * 0.32, ey = -r * 0.05;
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
    ctx.beginPath(); ctx.arc(0, 0, r * 0.995, 0, Math.PI * 2); ctx.clip();
    var wk = Math.round(r * 2) / 2;
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
    ctx.fillStyle = grad('wvDeep' + wk, function () {
      var gg = ctx.createRadialGradient(0, r * 1.18, r * 0.08, 0, r * 1.18, r * 1.1);
      gg.addColorStop(0, 'rgba(3,14,38,0.44)');
      gg.addColorStop(0.55, 'rgba(6,26,64,0.16)');
      gg.addColorStop(1, 'rgba(6,26,64,0)');
      return gg;
    });
    ctx.fillRect(-r, -r, r * 2, r * 2);
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

  function drawChest(b, alpha) {
    var bob = Math.sin(time * 2.2) * 1.5;
    var bx = b.rx != null ? b.rx : b.x, by = b.ry != null ? b.ry : b.y;
    ctx.save();
    ctx.globalAlpha = alpha;
    var fd = FLOORY - (by + b.r);
    if (fd < 30 && fd > -b.r) {
      ctx.fillStyle = 'rgba(10,20,30,' + (0.2 * (1 - Math.max(0, fd) / 30)) + ')';
      ctx.beginPath(); ctx.ellipse(bx, FLOORY - 2, b.r * 0.95, b.r * 0.2, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.translate(bx, by);
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
    var seamY = -h * 0.06;
    ctx.fillStyle = grad('chestLid', function () {
      var gg = ctx.createLinearGradient(0, -h * 0.62, 0, seamY);
      gg.addColorStop(0, '#F4C866'); gg.addColorStop(0.55, '#DDA948'); gg.addColorStop(1, '#B98430');
      return gg;
    });
    ctx.beginPath();
    ctx.moveTo(-w / 2, seamY);
    ctx.quadraticCurveTo(0, -h * 0.72, w / 2, seamY);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,240,190,0.5)'; ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-w * 0.34, -h * 0.30);
    ctx.quadraticCurveTo(0, -h * 0.62, w * 0.34, -h * 0.30);
    ctx.stroke();
    ctx.fillStyle = grad('chestBody', function () {
      var gg = ctx.createLinearGradient(0, seamY, 0, h * 0.56);
      gg.addColorStop(0, '#D8A44C'); gg.addColorStop(0.5, '#C08A38'); gg.addColorStop(1, '#8F5E22');
      return gg;
    });
    roundRect(-w / 2, seamY, w, h * 0.62, 3); ctx.fill();
    ctx.strokeStyle = 'rgba(110,66,20,0.45)'; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-w * 0.17, seamY + 3); ctx.lineTo(-w * 0.17, h * 0.52);
    ctx.moveTo(w * 0.17, seamY + 3); ctx.lineTo(w * 0.17, h * 0.52);
    ctx.stroke();
    ctx.fillStyle = '#7A4E1C';
    roundRect(-w * 0.42, -h * 0.36, 4.5, h * 0.9, 2); ctx.fill();
    roundRect(w * 0.42 - 4.5, -h * 0.36, 4.5, h * 0.9, 2); ctx.fill();
    ctx.fillStyle = '#FFE6A6';
    ctx.beginPath();
    ctx.arc(-w * 0.42 + 2.2, -h * 0.2, 1.1, 0, Math.PI * 2);
    ctx.arc(w * 0.42 - 2.3, -h * 0.2, 1.1, 0, Math.PI * 2);
    ctx.arc(-w * 0.42 + 2.2, h * 0.34, 1.1, 0, Math.PI * 2);
    ctx.arc(w * 0.42 - 2.3, h * 0.34, 1.1, 0, Math.PI * 2);
    ctx.fill();
    var seamG = 0.26 + 0.24 * Math.sin(time * 3 + 1);
    ctx.fillStyle = 'rgba(255,224,130,' + seamG.toFixed(2) + ')';
    roundRect(-w * 0.4, seamY - 1, w * 0.8, 2.2, 1.1); ctx.fill();
    ctx.fillStyle = '#FFD873';
    roundRect(-4.5, seamY - 3, 9, 10, 2.5); ctx.fill();
    ctx.fillStyle = '#5A3A14';
    ctx.beginPath(); ctx.arc(0, seamY + 1.2, 1.6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-0.9, seamY + 2.2); ctx.lineTo(0.9, seamY + 2.2);
    ctx.lineTo(0.55, seamY + 5.2); ctx.lineTo(-0.55, seamY + 5.2);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(242,193,78,0.85)'; ctx.lineWidth = 1.4;
    roundRect(-w / 2, seamY, w, h * 0.62, 3); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-w / 2, seamY);
    ctx.quadraticCurveTo(0, -h * 0.72, w / 2, seamY);
    ctx.stroke();
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
    var frac = (chest && chest.life) ? Math.max(0, 1 - chest.t / chest.life) : 1;
    ctx.strokeStyle = 'rgba(20,40,55,0.28)'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(0, 0, b.r + 8, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = frac > 0.5 ? 'rgba(255,255,255,0.85)' : (frac > 0.25 ? '#FFC94D' : '#FF6B52');
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(0, 0, b.r + 8, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2); ctx.stroke();
    ctx.lineCap = 'butt';
    ctx.restore();
  }
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
  function drawPearlMark(r) {
    ctx.save();
    ctx.strokeStyle = 'rgba(210,190,150,0.95)';
    ctx.lineWidth = Math.max(1.6, r * 0.09);
    ctx.beginPath(); ctx.arc(0, r * 0.16, r * 0.42, 0, Math.PI); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.98)';
    ctx.beginPath(); ctx.arc(0, r * 0.08, r * 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(180,160,120,0.9)';
    ctx.beginPath(); ctx.arc(-r * 0.06, r * 0.02, r * 0.05, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
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
    ctx.fillStyle = grad('vtxDisc' + (Math.round(r * 2) / 2), function () {
      var gg = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.82);
      gg.addColorStop(0, 'rgba(94,110,208,0.30)');
      gg.addColorStop(0.6, 'rgba(94,110,208,0.13)');
      gg.addColorStop(1, 'rgba(94,110,208,0)');
      return gg;
    });
    ctx.beginPath(); ctx.arc(0, 0, r * 0.82, 0, Math.PI * 2); ctx.fill();
    ctx.rotate(time * 2.4);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (var arm = 0; arm < 3; arm++) {
      var a0 = arm * Math.PI * 2 / 3;
      var endA = a0 + Math.PI * 1.9;
      (function (a0, endA, arm) {
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
        var rr2 = r * (0.05 + 0.61 * tt);
        var x2 = Math.cos(aa) * rr2, y2 = Math.sin(aa) * rr2;
        if (i2 === 0) ctx.moveTo(x2, y2); else ctx.lineTo(x2, y2);
      }
      ctx.stroke();
    }
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
    ctx.fillStyle = 'rgba(200,238,255,0.42)';
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 1.2;
    for (var i = 0; i < 3; i++) {
      var ang = i * Math.PI / 3 + 0.4;
      ctx.beginPath();
      ctx.moveTo(Math.cos(ang) * r * 0.8, Math.sin(ang) * r * 0.8);
      ctx.lineTo(-Math.cos(ang) * r * 0.8, -Math.sin(ang) * r * 0.8);
      ctx.stroke();
    }
    var tw = 0.5 + 0.5 * Math.sin(time * 6 + b.id);
    ctx.fillStyle = 'rgba(255,255,255,' + (0.5 + tw * 0.5) + ')';
    ctx.beginPath(); ctx.arc(r * 0.3, -r * 0.35, 2, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(90,170,210,0.9)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, r + 4, -Math.PI / 2, -Math.PI / 2 + (b.frozen / C.ice.freezeTime) * Math.PI * 2);
    ctx.stroke();
  }

  function landingYFor(x, r) {
    var y = FLOORY - r;
    var bs = phys.bodies, i;
    for (i = 0; i < bs.length; i++) {
      var b = bs[i];
      if (Math.abs(b.vy) > 40) continue;
      var dx = Math.abs(b.x - x), rr = r + b.r;
      if (dx >= rr) continue;
      var cy = b.y - Math.sqrt(rr * rr - dx * dx);
      if (cy < y) y = cy;
    }
    if (y < C.containerTop + r) y = C.containerTop + r;
    return y;
  }
  function ghostBob() { return Math.sin(time * 2.1) * 3 + Math.sin(time * 3.9 + 1.3) * 1.2; }
  function drawGhostGuide(x, tier) {
    var r = nextIron ? C.iron.r : T[tier].r;
    var gy = C.spawnY + ghostBob();
    var topY = gy + r + 2;
    var L = C.guideLen;
    ctx.save();
    ctx.translate(0, topY);
    var lg = grad('ghostGuide' + L, function () {
      var g2 = ctx.createLinearGradient(0, 0, 0, L);
      g2.addColorStop(0, 'rgba(110,195,250,0.85)');
      g2.addColorStop(1, 'rgba(205,242,255,0.32)');
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
  function drawLandPreview() {
    var r = nextIron ? C.iron.r : T[nextTier].r;
    var gy = C.spawnY + ghostBob();
    var topY = gy + r + 2;
    ctx.save();
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
    var gy = y + ghostBob();
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

  function drawGhostLabel() {
    if (state !== 'play' || evapMode || flowMode || rippleMode || confirmOpen) return;
    var r = nextIron ? C.iron.r : T[nextTier].r;
    var label = nextIron ? '礁石' : (nextSpecial ? specialLabel(nextSpecial) : (nextRune ? runeName(nextRune) + '符文' : null));
    if (!label) return;
    var alpha = cooldown > 0 ? 0.35 : 0.9;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.font = 'bold 14px system-ui, sans-serif';
    var ink = measureInk('bold 14px system-ui, sans-serif', label);
    var tw = ink.w + 14;
    var ly = Math.max(C.containerTop + 15, C.spawnY - r - 10 + ghostBob());
    ctx.fillStyle = 'rgba(255,255,255,0.88)';
    roundRect(Math.round(aimX - tw / 2), ly - 15, tw, 20, 10); ctx.fill();
    ctx.fillStyle = nextIron ? '#6B6353' : (nextSpecial ? specialColor(nextSpecial) : runeColor(nextRune));
    var asc = ink.has ? ink.a : 14 * 0.84, desc = ink.has ? ink.d : 14 * 0.06;
    ctx.fillText(label, Math.round(aimX), ly - 5 + (asc - desc) / 2);
    ctx.restore();
  }

  function drawContainer() {
    var floorY = FLOORY, FH = 12;
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

    var dep = grad('dep' + Math.round(FLOORY), function () {
      var gg = ctx.createLinearGradient(0, floorY - 30, 0, floorY);
      gg.addColorStop(0, 'rgba(20,70,120,0)');
      gg.addColorStop(1, 'rgba(20,70,120,0.14)');
      return gg;
    });
    ctx.fillStyle = dep;
    ctx.fillRect(0, floorY - 30, C.W, 30);

    var sy0 = MG.layout.band.decorBase;
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
    ctx.fillStyle = 'rgba(110,150,168,0.4)';
    var yoff = MG.layout.band.pebbleYOff;
    var peb = MG.layout.band.pebbles;
    for (var pi = 0; pi < peb.length; pi++) {
      ctx.beginPath(); ctx.arc(peb[pi][0], peb[pi][1] + yoff, peb[pi][2], 0, Math.PI * 2); ctx.fill();
    }
    drawStarfish(MG.layout.band.starfish.x, MG.layout.band.starfish.y + yoff, MG.layout.band.starfish.s);
    drawShell(MG.layout.band.shell.x, MG.layout.band.shell.y + yoff, MG.layout.band.shell.s);
  }

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

  function drawWaterBack() {
    if (tide.progress <= 0.01) return;
    var wy = tideY(), left = C.wall, right = C.W - C.wall;
    var sn = seaStageNow(), st = sn.st;
    var g = grad('wback' + sn.ck + Math.round(wy / 4), function () {
      var gg = ctx.createLinearGradient(0, wy - tideAmp(), 0, FLOORY);
      gg.addColorStop(0, hexToRgba(deepenHex(st.bg[3], 0.25), 0.32));
      gg.addColorStop(1, hexToRgba(deepenHex(st.bg[3], 0.55), 0.62));
      return gg;
    });
    ctx.fillStyle = g;
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
    ctx.fillStyle = hexToRgba(deepenHex(seaStageNow().st.bg[3], 0.4), 0.18);
    ctx.beginPath();
    ctx.moveTo(left, FLOORY + 4);
    for (var x = left; x <= right; x += 6) ctx.lineTo(x, tideCrest(x));
    ctx.lineTo(right, FLOORY + 4);
    ctx.closePath();
    ctx.fill();
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (x = left; x <= right; x += 5) {
      var y = tideCrest(x);
      if (x === left) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(20,90,160,0.35)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    var first = true;
    for (x = left; x <= right; x += 5) {
      var sy = tideCrest(x) + 4;
      if (first) { ctx.moveTo(x, sy); first = false; } else ctx.lineTo(x, sy);
    }
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,' + (0.4 + tide.progress * 0.3).toFixed(2) + ')';
    for (x = left; x <= right; x += 26) {
      var fy = tideCrest(x) - 3;
      var fr = 1.4 + Math.sin(x * 0.5 + time * 5) * 0.5;
      ctx.beginPath(); ctx.arc(x, fy, fr, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  function drawPropHint(text) {
    var y = MG.layout.body.mirrorCy;
    ctx.textAlign = 'center';
    ctx.font = 'bold 19px system-ui, sans-serif';
    ctx.strokeStyle = 'rgba(10,40,70,0.6)';
    ctx.lineWidth = 4;
    ctx.strokeText(text, C.W / 2, y);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(text, C.W / 2, y);
  }

  function drawBuoyWarn() {
    if (state !== 'play') return;
    if (tide.progress <= 0.02) return;
    var wy = tideY();
    for (var i = 0; i < phys.bodies.length; i++) {
      var b = phys.bodies[i];
      if (b.iron || b.frozen > 0 || b.special) continue;
      var top = b.y - b.r;
      if (top > C.dangerY - 72) continue;
      var subm = (b.y + b.r - wy) / (2 * b.r);
      if (subm <= 0.02) continue;
      if (b.vy > -6) continue;
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

  function drawEventWarn() {
    if (!seaWarn) return;
    var w = 1 - Math.max(0, seaWarn.t) / SEA_WARN_T;
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

  function drawComboMeter() {
    if (state !== 'play') return;
    if (combo < 2 || comboTimer <= 0) return;
    var x = C.W / 2, y = C.dangerY + 70;
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

  function drawReefCancelHint() {
    var bs = phys.bodies, i, k, n = bs.length;
    var handled = {}, groups = [];
    for (i = 0; i < n; i++) {
      var b = bs[i];
      if (!b.iron || b.chest || handled[b.id]) continue;
      if (!b._cluster || b._cluster < 2) continue;
      var cl = [], stack = [b]; handled[b.id] = 1;
      while (stack.length) {
        var cur = stack.pop(); cl.push(cur);
        var dx, dy, d, j;
        for (j = 0; j < n; j++) {
          var o = bs[j];
          if (o === cur || !o.iron || o.chest || handled[o.id]) continue;
          dx = o.x - cur.x; dy = o.y - cur.y; d = Math.sqrt(dx * dx + dy * dy);
          if (d < (cur.r + o.r) * 1.3) { handled[o.id] = 1; stack.push(o); }
        }
      }
      groups.push(cl);
    }
    if (!groups.length) return;
    ctx.save();
    ctx.textAlign = 'center';
    for (k = 0; k < groups.length; k++) {
      var c = groups[k], sz = c.length, cx = 0, topY = 1e9, q;
      for (q = 0; q < sz; q++) { cx += c[q].x; topY = Math.min(topY, c[q].y - c[q].r); }
      cx /= sz;
      if (sz === 2 && tide.progress < C.iron.tideNeed) {
        ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2; ctx.setLineDash([5, 6]);
        for (q = 0; q < sz; q++) { ctx.beginPath(); ctx.arc(c[q].x, c[q].y, c[q].r + 8, 0, Math.PI * 2); ctx.stroke(); }
        ctx.setLineDash([]);
        ctx.font = 'bold 15px system-ui, sans-serif';
        ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 3;
        ctx.strokeText('需涨潮相消', cx, topY - 12);
        ctx.fillStyle = '#FFD86B'; ctx.fillText('需涨潮相消', cx, topY - 12);
      } else if (sz >= 3) {
        ctx.strokeStyle = 'rgba(255,90,70,0.95)'; ctx.lineWidth = 2.5; ctx.setLineDash([6, 5]);
        for (q = 0; q < sz; q++) { ctx.beginPath(); ctx.arc(c[q].x, c[q].y, c[q].r + 10, 0, Math.PI * 2); ctx.stroke(); }
        ctx.setLineDash([]);
        ctx.font = 'bold 14px system-ui, sans-serif';
        ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 3;
        ctx.strokeText('⚠ 障碍·换险', cx, topY - 12);
        ctx.fillStyle = '#FF6B5A'; ctx.fillText('⚠ 障碍·换险', cx, topY - 12);
      }
    }
    ctx.restore();
  }
  function drawDangerLine() {
    var H = C.dangerWarnH;
    var near = 0, i;
    var restSp = C.dangerSpeed * 1.5;
    for (i = 0; i < phys.bodies.length; i++) {
      var b = phys.bodies[i];
      var sp = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
      if (sp >= restSp) continue;
      var d = (b.y - b.r) - C.dangerY;
      if (d < 0) continue;
      var prox = 1 - d / H;
      if (prox > 0) near = Math.max(near, prox);
    }
    near = Math.max(near, dangerAlert * 0.95);
    var flashing = near > 0.02;
    var blink = flashing ? (0.08 + 0.92 * (0.5 + 0.5 * Math.sin(time * 1.1 * 2 * Math.PI))) : 1;
    var glow = near;
    var a = flashing ? (0.3 + glow * 0.6) * blink : 0.2;
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
    if (glow > 0.05) {
      var pa = (0.35 + glow * 0.55) * blink;
      for (var side = 0; side < 2; side++) {
        var ex2 = side ? C.W - 5 : 5;
        ctx.fillStyle = cCore + (pa * 0.22) + ')';
        ctx.beginPath(); ctx.arc(ex2, C.dangerY, 10 + glow * 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = cCore + (pa * 0.4) + ')';
        ctx.beginPath(); ctx.arc(ex2, C.dangerY, 5.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,' + (pa * 0.85) + ')';
        ctx.beginPath(); ctx.arc(ex2, C.dangerY, 2.2 + glow * 1.2, 0, Math.PI * 2); ctx.fill();
      }
    }
  }

  function drawDangerText() {
    if (dangerAlert <= 0.12) return;
    ctx.textAlign = 'center';
    var pulse = 0.5 + 0.5 * Math.sin(time * 2 * Math.PI);
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

  function drawHeartbeat() {
    if (dangerAlert <= 0.02) return;
    var pulse = 0.5 + 0.5 * Math.sin(time * 2 * Math.PI);
    var a = Math.min(0.42, dangerAlert * (0.20 + 0.18 * pulse));
    var band = 130;
    var gT = ctx.createLinearGradient(0, -renderOy, 0, -renderOy + band);
    gT.addColorStop(0, 'rgba(220,55,45,' + a + ')'); gT.addColorStop(1, 'rgba(220,55,45,0)');
    ctx.fillStyle = gT; ctx.fillRect(-BX, -renderOy, C.W + BX * 2, band);
    var gB = ctx.createLinearGradient(0, VH - renderOy, 0, VH - renderOy - band);
    gB.addColorStop(0, 'rgba(220,55,45,' + a + ')'); gB.addColorStop(1, 'rgba(220,55,45,0)');
    ctx.fillStyle = gB; ctx.fillRect(-BX, VH - renderOy - band, C.W + BX * 2, band);
    var gL = ctx.createLinearGradient(-BX, 0, -BX + band, 0);
    gL.addColorStop(0, 'rgba(220,55,45,' + a + ')'); gL.addColorStop(1, 'rgba(220,55,45,0)');
    ctx.fillStyle = gL; ctx.fillRect(-BX, -renderOy, band, VH);
    var gR = ctx.createLinearGradient(C.W + BX, 0, C.W + BX - band, 0);
    gR.addColorStop(0, 'rgba(220,55,45,' + a + ')'); gR.addColorStop(1, 'rgba(220,55,45,0)');
    ctx.fillStyle = gR; ctx.fillRect(C.W + BX - band, -renderOy, band, VH);
  }

  function drawHUD() {
    ctx.textAlign = 'left';
    ctx.lineJoin = 'round';
    var farIdx = 0;
    for (var fi = C.seaStages.length - 1; fi >= 0; fi--) {
      if (careerPeak >= C.seaStages[fi].at) { farIdx = fi; break; }
    }
    farIdx = Math.max(farIdx, seaStage());
    ctx.font = '14px system-ui, sans-serif';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    var top1 = '最高 ' + best + ' · 最远 ' + C.seaStages[farIdx].name;
    var t1Font = 14;
    while (t1Font > 11 && ctx.measureText(top1).width > 240) {
      t1Font--;
      ctx.font = t1Font + 'px system-ui, sans-serif';
    }
    ctx.strokeText(top1, 50, MG.layout.hud.row1Y);
    ctx.fillStyle = '#3E6E90';
    ctx.fillText(top1, 50, MG.layout.hud.row1Y);

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

    ctx.textAlign = 'center';
    ctx.lineJoin = 'round';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    var em = Math.floor(levelElapsed / 60), es = Math.floor(levelElapsed % 60);
    var etxt = '已进行 ' + em + ':' + (es < 10 ? '0' + es : es);
    ctx.strokeText(etxt, C.W - 80, MG.layout.hud.row1Y);
    ctx.fillStyle = '#2E7DA8';
    ctx.fillText(etxt, C.W - 80, MG.layout.hud.row1Y);

    drawSetBtn();
  }
  var setIconStyle = 'A';
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
  function setIconSliders(ctx) {
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    var ys = [-7, 0, 7], xs = [-4, 5, -3];
    for (var i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.moveTo(-10, ys[i]); ctx.lineTo(10, ys[i]); ctx.stroke();
      ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(xs[i], ys[i], 3, 0, Math.PI * 2); ctx.fill();
    }
    ctx.lineCap = 'butt';
  }
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
  function setIconTrash(ctx) {
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-7, -4); ctx.lineTo(7, -4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-3, -6.5); ctx.lineTo(3, -6.5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-2, -6.5); ctx.lineTo(-2, -4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(2, -6.5); ctx.lineTo(2, -4); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-5.5, -4); ctx.lineTo(-4.5, 7); ctx.lineTo(4.5, 7); ctx.lineTo(5.5, -4);
    ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-1.8, -1.5); ctx.lineTo(-1.4, 5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(1.8, -1.5); ctx.lineTo(1.4, 5); ctx.stroke();
    ctx.lineCap = 'butt';
  }
  function drawSetBtn() {
    drawCircleBtn(setBtn, '#2E7DA8', 1, false, 0);
    ctx.save();
    ctx.translate(setBtn.cx, setBtn.cy);
    var k = setBtn.r / 18;
    ctx.scale(k, k);
    if (setIconStyle === 'A') setIconCog(ctx, true);
    else if (setIconStyle === 'B') setIconCog(ctx, false);
    else if (setIconStyle === 'C') setIconSliders(ctx);
    else setIconDial(ctx);
    ctx.restore();
  }
  function drawSettings() {
    layoutSetPanel();
    panel(SET_PANEL.x, SET_PANEL.y, SET_PANEL.w, SET_PANEL.h, 14, 0.97);
    drawPanelHeader('设置', SET_PANEL, setCloseBtn, function () {
      ctx.save(); ctx.scale(0.667, 0.667); setIconCog(ctx, true); ctx.restore();
    }, '#2E7DA8');
    var names = ['音效', '音乐'];
    var descs = ['水滴合成与技能音效', '深海氛围背景音乐'];
    for (var si = 0; si < 2; si++) {
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
      var on = si === 0 ? audio.sfxOn : audio.musicOn;
      var sx = row.x + row.w - 18 - 52, sy = row.y + 13;
      ctx.fillStyle = on ? '#2E86B4' : 'rgba(120,150,175,0.35)';
      roundRect(sx, sy, 52, 30, 15); ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath(); ctx.arc(on ? sx + 52 - 15 : sx + 15, sy + 15, 11, 0, Math.PI * 2); ctx.fill();
    }
    var clr = MG.layout.setRowRect(2);
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
  function drawSetClear() {
    var cr = MG.layout.setClearRect();
    panel(cr.x, cr.y, cr.w, cr.h, 14, 0.97);
    drawPanelHeader('清空存档', cr, MG.layout.setClearCloseRect(), function () {
      ctx.save(); ctx.scale(0.667, 0.667); setIconTrash(ctx); ctx.restore();
    }, '#B0584A');
    ctx.textAlign = 'left';
    ctx.fillStyle = '#4A7FA0';
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillText('将清空全部存档，游戏恢复初始状态。', cr.x + 24, cr.y + 64);
    ctx.fillStyle = '#B0584A';
    ctx.fillText('此操作无法撤销。', cr.x + 24, cr.y + 84);
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
  function drawTideTimer() {
    if (!tide) return;
    var tp = MG.layout.hud.tidePill;
    var ty = tp.ty, th = tp.th;
    var active = tide.phase === 'active';
    var warn = !active && tide.timer <= C.tide.warnTime;
    var pulse = 0.5 + 0.5 * Math.sin(time * 6);
    var breath = Math.sin(time * 1.6);
    function hexA(hex, a) {
      var n = parseInt(hex.slice(1), 16);
      return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
    }

    var label = active ? '涨潮' : '潮汐';
    var ns = Math.ceil(tide.timer) + 's';
    ctx.textAlign = 'left';
    var lw = measureInk('bold 15px system-ui, sans-serif', label).w;
    var nw = measureInk('bold 22px system-ui, sans-serif', ns).w;
    var gap = 5;
    var maxNumW = measureInk('bold 22px system-ui, sans-serif', '99s').w;
    var textW = lw + gap + nw;
    var fixedTextW = lw + gap + maxNumW;
    var padX = 16, cw = fixedTextW + padX * 2;
    var tx = (tp.side === 'right') ? (C.W - tp.margin - cw) : tp.margin;
    var midY = ty + th / 2;

    var wTop = ty + 6, wBot = ty + th;

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

    var seaC = seaStageNow().st.bg[3];
    var backC = deepenHex(seaC, 0.55), frontC = deepenHex(seaC, 0.25);
    var frontA = warn ? 0.55 : (active ? 0.62 : 0.46);
    var backA = warn ? 0.32 : (active ? 0.34 : 0.26);
    var level = wBot - (wBot - wTop) * Math.max(0, Math.min(1, tide.progress));
    var amp = 3 + breath * 1.3 + (active ? 2 : 0) + (warn ? pulse * 2.0 : 0);
    var spd = active ? 3.4 : 1.7;
    ctx.save();
    roundRect(tx + 1, ty + 1, cw - 2, th - 2, 13); ctx.clip();
    ctx.fillStyle = hexA(backC, backA);
    ctx.beginPath(); ctx.moveTo(tx, wBot);
    for (var i = 0; i <= cw; i += 3) {
      ctx.lineTo(tx + i, level + Math.sin((i / cw) * Math.PI * 2 - time * spd * 0.6) * amp * 0.8);
    }
    ctx.lineTo(tx + cw, wBot); ctx.closePath(); ctx.fill();
    ctx.fillStyle = hexA(frontC, frontA);
    ctx.beginPath(); ctx.moveTo(tx, wBot);
    for (var k = 0; k <= cw; k += 3) {
      ctx.lineTo(tx + k, level + Math.sin((k / cw) * Math.PI * 3 + time * spd) * amp);
    }
    ctx.lineTo(tx + cw, wBot); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (var j = 0; j <= cw; j += 3) {
      var wy = level + Math.sin((j / cw) * Math.PI * 3 + time * spd) * amp;
      if (j === 0) ctx.moveTo(tx + j, wy); else ctx.lineTo(tx + j, wy);
    }
    ctx.stroke();
    if (active || warn) {
      ctx.fillStyle = 'rgba(255,255,255,' + (0.3 + pulse * 0.3) + ')';
      for (var b = 0; b < 3; b++) {
        var bxp = tx + 10 + ((b * 37 + time * 14) % (cw - 20));
        var byp = wBot - 6 - ((time * (12 + b * 4) + b * 22) % (th - 16));
        ctx.beginPath(); ctx.arc(bxp, byp, 1.6, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();

    var sx = tx + (cw - textW) / 2;
    ctx.lineJoin = 'round';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.fillStyle = warn ? '#C8501E' : '#12517E';
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    var lm = measureInk('bold 15px system-ui, sans-serif', label);
    var lBase = lm.has ? midY + (lm.a - lm.d) / 2 : midY + 15 * 0.40;
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.strokeText(label, sx, lBase); ctx.fillText(label, sx, lBase);
    var sc = 1 + (warn || active ? pulse * 0.06 : 0);
    var nm = measureInk('bold 22px system-ui, sans-serif', ns);
    var nBase = nm.has ? midY + (nm.a - nm.d) / 2 : midY + 22 * 0.35;
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.save();
    ctx.translate(sx + lw + gap + nw / 2, midY);
    ctx.scale(sc, sc);
    var ndy = (nBase - midY) / sc;
    ctx.strokeText(ns, -nw / 2, ndy); ctx.fillText(ns, -nw / 2, ndy);
    ctx.restore();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }
  function drawChalChip() {
    if (!ng || !ng.active) return;
    var name, pctStr, sub, gold, prog;
    name = ng.active.name;
    prog = seaProgress();
    pctStr = Math.round(prog * 100) + '%';
    gold = prog >= 1;
    sub = ng.active.desc + (ng.active.mult ? ' · 得分 ×' + ng.active.mult : '');
    var tp = MG.layout.hud.tidePill;
    var ty = tp.ty, th = tp.th;
    ctx.textAlign = 'left';
    var nw1 = measureInk('bold 16px system-ui, sans-serif', name).w;
    var pw1 = measureInk('bold 16px system-ui, sans-serif', pctStr).w;
    var gap1 = 7, padX = 14;
    var l1w = nw1 + gap1 + pw1;
    var sw1 = measureInk('11px system-ui, sans-serif', sub).w;
    var cw = padX * 2 + Math.max(l1w, sw1);
    var tx = tp.margin;
    var cx0 = tx + cw / 2;
    var lh1 = 16, lh2 = 11, vgap = (th - lh1 - lh2) / 3;
    var y1 = ty + vgap + lh1 / 2, y2 = ty + vgap * 2 + lh1 + lh2 / 2;
    var pulse = 0.5 + 0.5 * Math.sin(time * 6);
    var breath = Math.sin(time * 1.6);
    function hexA(hex, a) {
      var n = parseInt(hex.slice(1), 16);
      return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
    }
    if (gold) {
      ctx.save();
      ctx.shadowColor = 'rgba(245,197,66,' + (0.5 + pulse * 0.25).toFixed(2) + ')';
      ctx.shadowBlur = 9 + pulse * 7;
    }
    ctx.strokeStyle = gold ? 'rgba(255,236,170,' + (0.75 + pulse * 0.25).toFixed(2) + ')' : 'rgba(255,255,255,0.4)';
    ctx.lineWidth = gold ? 1.8 : 1.3;
    roundRect(tx + 0.9, ty + 0.9, cw - 1.8, th - 1.8, 14); ctx.stroke();
    if (gold) ctx.restore();
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
  function drawTideBanner() {
    if (tide.banner <= 0) return;
    var t = tide.banner / 2.4;
    var a = t < 0.2 ? t / 0.2 : (t > 0.85 ? (1 - t) / 0.15 : 1);
    var scale = 1 + (1 - t) * 0.15;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.textAlign = 'center';
    ctx.translate(C.W / 2, MG.layout.body.mirrorCy);
    ctx.scale(scale, scale);
    ctx.font = 'bold 43px system-ui, sans-serif';
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 6;
    ctx.strokeText('涨 潮', 0, 0);
    ctx.fillStyle = '#12517E';
    ctx.fillText('涨 潮', 0, 0);
    ctx.restore();
  }

  function drawConfirm() {
    var cr = MG.layout.confirmRect();
    ctx.save();
    panel(cr.x, cr.y, cr.w, cr.h, 14, 0.97);
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

  var questHidden = true;
  function drawQuest() {
    if (!quest || questHidden) return;
    ctx.save();
    ctx.textAlign = 'center';
    var q = MG.layout.hud.quest;
    var qw = q.qw, qx = q.qx, qy = q.qy, qh = q.qh;
    ctx.fillStyle = 'rgba(255,255,255,0.66)';
    roundRect(qx, qy, qw, qh, 14); ctx.fill();
    ctx.strokeStyle = 'rgba(90,140,180,0.28)'; ctx.lineWidth = 1;
    roundRect(qx + 0.5, qy + 0.5, qw - 1, qh - 1, 14); ctx.stroke();
    var icx = qx + 25, icy = qy + 30;
    ctx.fillStyle = '#F5C542';
    ctx.beginPath(); ctx.arc(icx, icy, 15, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 1.8; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.arc(icx, icy, 7, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath(); ctx.arc(icx, icy, 2.6, 0, Math.PI * 2); ctx.fill();
    ctx.textAlign = 'left';
    ctx.fillStyle = '#7A5B10';
    var tf = 15;
    ctx.font = 'bold ' + tf + 'px system-ui, sans-serif';
    while (tf > 12 && ctx.measureText(quest.text).width > 170) {
      tf--;
      ctx.font = 'bold ' + tf + 'px system-ui, sans-serif';
    }
    ctx.fillText(quest.text, qx + 50, qy + 25);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#B8860B';
    ctx.font = '12px system-ui, sans-serif';
    var stars = '★★★'.slice(0, quest.stars || 1);
    ctx.fillText(stars, qx + qw - 15, qy + 25);
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
  function fmtDiff(n) {
    if (n < 10000) return String(n);
    var w = n / 10000;
    return (w >= 10 ? Math.round(w) : Math.round(w * 10) / 10) + '万';
  }
  function hexToRgba(hex, a) {
    var n = parseInt(hex.slice(1), 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }
  function deepenHex(col, k) {
    var c = parseCol(col);
    var r = Math.round(c[0] + (10 - c[0]) * k);
    var g = Math.round(c[1] + (46 - c[1]) * k);
    var b = Math.round(c[2] + (78 - c[2]) * k);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }
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
  function seaTextColor(hex) {
    var n = parseInt(hex.slice(1), 16);
    var r = Math.round(((n >> 16) & 255) * 0.8), g = Math.round(((n >> 8) & 255) * 0.8), b = Math.round((n & 255) * 0.8);
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }
  function drawSeaProgress() {
    var cur = seaStage(), ts = totalScore();
    var last = C.seaStages.length - 1;
    var maxed = cur >= last;
    var sb = MG.layout.hud.seaBar;
    var sx = sb.sx, sy = sb.sy, sw = sb.sw, sh = sb.sh;
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    roundRect(sx, sy, sw, sh, 8); ctx.fill();
    var frac = 1;
    if (!maxed) {
      var lo = C.seaStages[cur].at, hi = C.seaStages[cur + 1].at;
      frac = Math.min(1, Math.max(0, (ts - lo) / (hi - lo)));
    }
    if (frac > 0) {
      ctx.fillStyle = maxed ? SEA_BADGES[last].c : C.seaStages[cur].bg[3];
      ctx.globalAlpha = 0.85;
      roundRect(sx + 2, sy + 2, Math.max(10, (sw - 4) * frac), sh - 4, 6); ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    var DEEP = '#2C5A78';
    var GRAY = '#66788A';
    var pct = maxed ? 100 : Math.round(frac * 100);
    var leftSeg = [C.seaStages[cur].name, seaTextColor(SEA_BADGES[cur].c)];
    var midSeg = [pct + '%', DEEP];
    var rightSeg = maxed ? ['已达最深', GRAY] : [C.seaStages[cur + 1].name, GRAY];
    var lx = sx + 26, rx = sx + sw - 26;
    var cxBar = sx + sw / 2;
    var lw2, mw2, rw2;
    var measure3 = function () {
      var f = 'bold ' + lf + 'px system-ui, sans-serif';
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
    var probe = measureInk('bold ' + lf + 'px system-ui, sans-serif', leftSeg[0]);
    var cyT, vBase;
    if (probe.has) {
      cyT = sy + (sh - (probe.a + probe.d)) / 2 + probe.a;
      vBase = 'alphabetic';
    } else {
      cyT = sy + (sh - lf * 0.90) / 2 + lf * 0.84;
      vBase = 'alphabetic';
    }
    ctx.save();
    ctx.textBaseline = vBase;
    ctx.textAlign = 'left';
    ctx.strokeText(leftSeg[0], lx, cyT);
    ctx.fillStyle = leftSeg[1]; ctx.fillText(leftSeg[0], lx, cyT);
    ctx.textAlign = 'right';
    ctx.strokeText(rightSeg[0], rx, cyT);
    ctx.fillStyle = rightSeg[1]; ctx.fillText(rightSeg[0], rx, cyT);
    ctx.textAlign = 'center';
    ctx.strokeText(midSeg[0], cxBar, cyT);
    ctx.fillStyle = midSeg[1]; ctx.fillText(midSeg[0], cxBar, cyT);
    ctx.restore();
    if (!maxed) {
      drawSeaBadge(cur + 1, sx + sw, sy + sh / 2, false, true, 12);
    }
    drawSeaBadge(cur, sx, sy + sh / 2, true, false, 12);
  }

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
    var readyPulse = 0.5 + 0.5 * Math.sin(time * 5);

    drawCircleBtn(bookBtn, '#4A7FA0', 1, false, readyPulse);
    var bx = bookBtn.cx, by = bookBtn.cy;
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 1.8;
    ctx.strokeRect(bx - 8, by - 6, 16, 12);
    ctx.beginPath(); ctx.moveTo(bx, by - 6); ctx.lineTo(bx, by + 6); ctx.stroke();

    drawCircleBtn(restartBtn, '#5E90B4', 0.85, false, 0);
    var rx0 = restartBtn.cx, ry0 = restartBtn.cy;
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(rx0, ry0, 9, -Math.PI * 0.35, Math.PI * 1.25); ctx.stroke();
    var ax = Math.cos(-Math.PI * 0.35) * 9, ay = Math.sin(-Math.PI * 0.35) * 9;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(rx0 + ax + 5.5, ry0 + ay - 1);
    ctx.lineTo(rx0 + ax - 4.5, ry0 + ay - 3);
    ctx.lineTo(rx0 + ax + 1, ry0 + ay + 6.5);
    ctx.closePath(); ctx.fill();

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
      var unl = skillUnlocked(cfg.key);
      var q = skillCharge[cfg.key] || 0;
      var btnColor, btnAlpha, iconColor;
      if (!unl) { btnColor = '#7E93A3'; btnAlpha = 0.4; iconColor = null; }
      else if (q >= 1) { btnColor = '#3E8DB5'; btnAlpha = 1; iconColor = '#FFFFFF'; }
      else { btnColor = '#5E7180'; btnAlpha = 0.45; iconColor = 'rgba(255,255,255,0.38)'; }
      drawCircleBtn(btn, btnColor, btnAlpha, false, 0);
      if (!unl) {
        ctx.strokeStyle = 'rgba(255,255,255,0.9)';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(btn.cx, btn.cy - 9, 4.5, Math.PI, 0); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        roundRect(btn.cx - 6.5, btn.cy - 9, 13, 10, 2); ctx.fill();
        ctx.fillStyle = 'rgba(230,242,248,0.75)';
        ctx.font = '10px system-ui, sans-serif';
        ctx.fillText('待符文', btn.cx, btn.cy + 13);
      } else {
        if (iconColor) drawSkillIcon(cfg.key, btn.cx, btn.cy, iconColor);
        if (q >= 1) drawChargeBadge(btn, q);
      }
      if (unl && ((cfg.key === 'evap' && evapMode) || (cfg.key === 'ripple' && rippleMode) || (cfg.key === 'flow' && flowMode))) {
        var pr = (btn.r + 3) + 2 * (0.5 + 0.5 * Math.sin(time * 6));
        ctx.strokeStyle = 'rgba(226,75,74,' + (0.7 + 0.3 * Math.sin(time * 6)) + ')';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(btn.cx, btn.cy, pr, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(240,250,252,0.95)';
      ctx.font = '13px system-ui, sans-serif';
      ctx.fillText(cfg.name, btn.cx, btn.cy + btn.r + 12);
    }

  }
  function drawNgPick() {
    var nr = MG.layout.ngRect();
    var pw = nr.w, ph = nr.h, px = nr.x, py = nr.y;
    panel(px, py, pw, ph, 14, 0.97);
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

  var PCOLMAP = {
    gain:    '#D4A017',
    burst:   '#8E5AC8',
    world:   '#0E7C9E',
    reward:  '#1E9E6A',
    todo:    '#C9821A',
    miss:    '#9E4B47',
    neutral: '#6B8AA5'
  };
  function drawPopups() {
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
        var yOff = p.big ? -4 : 20;
        ctx.translate(p.x, p.y + yOff);
        ctx.scale(p.scale * (p.baseScale || 1), p.scale * (p.baseScale || 1));
        ctx.fillStyle = PCOLMAP[p.kind] || PCOLMAP.neutral;
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

  function drawOver() {
    buildOverButtons();
    ctx.fillStyle = 'rgba(10,40,70,0.55)';
    ctx.fillRect(-BX, -renderOy, C.W + BX * 2, VH);

    var ovr = MG.layout.overRect();
    var px = ovr.x, py = ovr.y, pw = ovr.w, ph = ovr.h;
    panel(px, py, pw, ph, 16, 0.97);

    ctx.textAlign = 'center';
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
    if (ng && ng.active) {
      var chalPct = Math.min(100, Math.round(seaProgress() * 100));
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

  function drawTutorial() {
    if (tutDone || state !== 'play' || dexOpen || confirmOpen) return;
    var step = Math.min(dropCount, TUT_STEPS.length - 1);
    var ty = MG.layout.body.tutY;
    var pulse = 0.5 + 0.5 * Math.sin(time * 4);
    ctx.save();
    ctx.textAlign = 'center';
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
    for (var i = 0; i < TUT_STEPS.length; i++) {
      ctx.fillStyle = i < dropCount ? '#2E86B4' : 'rgba(46,134,180,0.25)';
      ctx.beginPath(); ctx.arc(C.W / 2 - (TUT_STEPS.length - 1) * 7 + i * 14, ty + 36, 3.2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  function menuTransK() {
    if (!menuTrans.dir) return null;
    var k = (performance.now() / 1000 - menuTrans.t0) / menuTrans.dur;
    if (k >= 1) { menuTrans.dir = null; menuTrans.snap = null; return null; }
    return k < 0 ? 0 : k;
  }
  function grabTransSnap() {
    if (!menuTrans.dir || menuTrans.snap) return;
    var cv = document.getElementById('game');
    if (!cv || !cv.width) return;
    var sn = document.createElement('canvas');
    sn.width = cv.width; sn.height = cv.height;
    sn.getContext('2d').drawImage(cv, 0, 0);
    menuTrans.snap = sn;
  }
  function drawRippleReveal(k) {
    var ek = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
    var kp = dpr * view.s;
    var sn = menuTrans.snap;
    var pw = sn ? sn.width : Math.round(C.W * kp);
    var ph = sn ? sn.height : Math.round(VH * kp);
    var cpx = (menuTrans.sx + BX) * kp;
    var cpy = (menuTrans.sy + renderOy) * kp;
    var maxR = Math.sqrt(Math.pow(Math.max(cpx, pw - cpx), 2) + Math.pow(Math.max(cpy, ph - cpy), 2)) + 30 * kp;
    var r = ek * maxR;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (sn) {
      ctx.beginPath();
      ctx.rect(-4, -4, pw + 8, ph + 8);
      ctx.arc(cpx, cpy, Math.max(0.1, r), 0, Math.PI * 2);
      ctx.clip('evenodd');
      ctx.drawImage(sn, 0, 0);
    }
    if (r > 8 * kp) {
      var wg = ctx.createRadialGradient(cpx, cpy, r * 0.82, cpx, cpy, r);
      wg.addColorStop(0, 'rgba(255,255,255,0)');
      wg.addColorStop(0.8, 'rgba(210,240,255,' + (0.18 * (1 - ek) + 0.05).toFixed(2) + ')');
      wg.addColorStop(1, 'rgba(255,255,255,' + (0.3 * (1 - ek) + 0.06).toFixed(2) + ')');
      ctx.fillStyle = wg;
      ctx.beginPath(); ctx.arc(cpx, cpy, r, 0, Math.PI * 2); ctx.fill();
    }
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
        var wob = 1 + Math.sin(a * 9 + time * 6 - ri * 1.7) * 0.012;
        var px = cpx + Math.cos(a) * rg.rr * wob;
        var py = cpy + Math.sin(a) * rg.rr * wob;
        if (a === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.strokeStyle = ri === 0 ? 'rgba(255,255,255,' + rg.a.toFixed(2) + ')'
                                 : 'rgba(190,232,255,' + rg.a.toFixed(2) + ')';
      ctx.lineWidth = Math.max(0.6, rg.w) * kp;
      ctx.stroke();
    }
    if (r > 12 * kp) {
      var og = ctx.createRadialGradient(cpx, cpy, r * 0.96, cpx, cpy, r * 1.12);
      og.addColorStop(0, 'rgba(160,220,250,' + (0.3 * (1 - ek)).toFixed(2) + ')');
      og.addColorStop(1, 'rgba(160,220,250,0)');
      ctx.fillStyle = og;
      ctx.beginPath(); ctx.arc(cpx, cpy, r * 1.12, 0, Math.PI * 2); ctx.fill();
    }
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
      var fr = (12 + ek / 0.35 * 34) * kp;
      ctx.strokeStyle = 'rgba(255,255,255,' + ((1 - ek / 0.35) * 0.7).toFixed(2) + ')';
      ctx.lineWidth = 2.4 * kp;
      ctx.beginPath(); ctx.arc(cpx, cpy, fr, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }
  function drawKelp(bx, h, dir) {
    var H = h * 26, sd = bx * 0.11 + dir * 3;
    var baseY = VH + 2;
    var segs = 10, i, j;
    function blade(ox, hh, ph, wRoot, wTip, col, lw) {
      var pts = [];
      for (i = 0; i <= segs; i++) {
        var t = i / segs;
        var bend = Math.sin(time * 0.85 + sd + ph) * 9 * dir + Math.sin(t * 2.2 + sd * 3.1 + ph) * hh * 0.09;
        var w = wRoot + (wTip - wRoot) * t;
        var wob = Math.sin(t * 9 + sd * 2 + ph * 2.3) * w * 0.30;
        pts.push({ x: bend * t * t, y: baseY - hh * t, w: w + wob * 0.5 });
      }
      ctx.beginPath();
      ctx.moveTo(bx + pts[0].x + ox - pts[0].w, pts[0].y);
      for (j = 1; j <= segs; j++) ctx.lineTo(bx + pts[j].x + ox - pts[j].w, pts[j].y);
      for (j = segs; j >= 0; j--) ctx.lineTo(bx + pts[j].x + ox + pts[j].w, pts[j].y);
      ctx.closePath();
      ctx.fillStyle = col;
      ctx.fill();
      if (lw) {
        ctx.strokeStyle = 'rgba(150,215,240,0.16)';
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(bx + pts[0].x + ox, pts[0].y);
        for (j = 1; j <= segs; j++) ctx.lineTo(bx + pts[j].x + ox, pts[j].y);
        ctx.stroke();
      }
    }
    blade(-8, H * 0.60, 1.9, 7.5, 1.2, 'rgba(8,38,66,0.20)', false);
    blade(8, H * 0.76, 3.6, 8.5, 1.2, 'rgba(8,38,66,0.26)', false);
    blade(-3, H * 0.90, 0.8, 9.5, 1.4, 'rgba(10,44,74,0.30)', false);
    blade(2, H, 0, 11, 1.6, 'rgba(10,44,74,0.36)', true);
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
        ctx.quadraticCurveTo(tipX + 2.6 * tipDir, tipY - 1.5, tipX + 3 * tipDir, tipY + 2.5);
        ctx.quadraticCurveTo(lx + wb2 * 0.4 + lsway * 0.4, baseY - lh * 0.55, lx + wb2, baseY);
        ctx.closePath(); ctx.fill();
      }
    }
  }
  function menuBandX(i, n) {
    var w = LW / n;
    return (i + 0.5) * w + Math.sin(i * 2.399) * w * 0.36;
  }
  function drawMenuScene() {
    var i;
    var mvk = Math.round(VH);
    var rg = grad('menuRay' + mvk, function () {
      var gg = ctx.createLinearGradient(0, 0, 0, VH * 0.75);
      gg.addColorStop(0, 'rgba(210,240,255,0.13)');
      gg.addColorStop(1, 'rgba(210,240,255,0)');
      return gg;
    });
    for (i = 0; i < 4; i++) {
      var rayX = -BX + LW * (0.15 + i * 0.23);
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
    var dustN = Math.min(34, Math.max(16, Math.round(16 * LW / C.W)));
    for (i = 0; i < dustN; i++) {
      var sd = i * 137;
      var px = -BX + menuBandX(i, dustN) + Math.sin(time * 0.4 + i) * 8;
      var py = (sd * 13 % VH) + Math.sin(time * 0.25 + i * 2.1) * 14;
      var pa = 0.04 + 0.05 * (0.5 + 0.5 * Math.sin(time * 1.2 + i * 2.3));
      ctx.fillStyle = 'rgba(230,248,255,' + pa.toFixed(2) + ')';
      ctx.beginPath(); ctx.arc(px, py, 1.2 + (i % 3) * 0.7, 0, Math.PI * 2); ctx.fill();
    }
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
    var menuFishN = 3;
    for (i = 0; i < menuFishN; i++) {
      var speed = 22 + i * 14;
      var span = LW + 120;
      var trav = time * speed + i * (span / menuFishN);
      var cyc = Math.floor(trav / span), tIn = trav % span;
      var goingRight = (cyc % 2) === 0;
      var fx2 = -BX + (goingRight ? (tIn - 60) : (LW + 60 - tIn));
      var fy2 = 205 + i * 110 + Math.sin(time * 0.9 + i * 2.4) * 12;
      var fs2 = 0.8 + i * 0.35;
      var flip = goingRight ? 1 : -1;
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
  function drawTitleArt(ty) {
    var txt = '水滴合成深海';
    var adv = 48;
    var CH = [
      { s: 1.00, dy: 1,  rot: -0.035 },
      { s: 0.94, dy: 4,  rot: 0.045 },
      { s: 1.04, dy: -1, rot: -0.03 },
      { s: 0.96, dy: 3,  rot: 0.035 },
      { s: 1.02, dy: -1, rot: -0.04 },
      { s: 0.97, dy: 3,  rot: 0.03 }
    ];
    var x0 = C.W / 2 - adv * (txt.length - 1) / 2;
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
      ctx.fillStyle = '#2E86B4';
      ctx.fillText(txt[i], 0, -16);
      ctx.restore();
    }
    drawShell(x0 - 34, ty + 8 - tBob * 0.6, 9);
    drawStarfish(x0 + adv * 5 + 38, ty - 46 + tBob, 11);
    ctx.save();
    ctx.translate(x0 + adv * 5 + 38, ty - 6 + tBob * 0.8);
    ctx.rotate(Math.sin(time * 1.6) * 0.06);
    drawBall({ x: 0, y: 0, r: 11, tier: 1, vx: 0, vy: 0, id: 7 }, 1);
    ctx.restore();
    ctx.textBaseline = 'alphabetic';
  }
  function drawMenuContent() {
    var mu = MG.layout.menu;
    var pulse = 0.5 + 0.5 * Math.sin(time * 2.4);
    ctx.textAlign = 'center';

    drawTitleArt(mu.titleY);

    for (var i = 0; i < menuTiles.length; i++) drawMenuTile(menuTiles[i]);

    drawMascot(C.W / 2, mu.mascotCy);

    drawOfflineCard();

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

  function drawMenuTile(t) {
    var r = MG.layout.menuTileRect(t.side, t.i);
    var sc = 1 - Math.min(0.12, Math.max(0, t.pressT) * 0.75);
    ctx.save();
    ctx.translate(r.x + r.w / 2, r.y + r.h / 2);
    ctx.scale(sc, sc);
    ctx.fillStyle = 'rgba(6,26,48,0.30)';
    roundRect(-r.w / 2, -r.h / 2 + 4, r.w, r.h, 16); ctx.fill();
    var g = ctx.createLinearGradient(0, -r.h / 2, 0, r.h / 2);
    g.addColorStop(0, '#2E86B4');
    g.addColorStop(1, '#155A8A');
    ctx.fillStyle = g;
    roundRect(-r.w / 2, -r.h / 2, r.w, r.h, 16); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.65)';
    ctx.lineWidth = 2;
    roundRect(-r.w / 2 + 1, -r.h / 2 + 1, r.w - 2, r.h - 2, 15); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.28)';
    ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, 6, r.h / 2 - 9, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
    ctx.lineCap = 'butt';
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
    var CYC = 3.0;
    var tick = time / CYC;
    var idx = Math.floor(tick) % list.length;
    var ph = tick - Math.floor(tick);
    var sc = 1, alpha = 1;
    if (ph < 0.24) {
      var u = ph / 0.24 - 1;
      sc = 0.4 + 0.6 * (1 + 2.70158 * u * u * u + 1.70158 * u * u);
      if (sc > 1.12) sc = 1.12;
    } else if (ph > 0.84) {
      var v = (ph - 0.84) / 0.16;
      sc = 1 - 0.4 * v * v;
      alpha = 1 - v * v;
    }
    cy += Math.sin(time * 1.8) * 4;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = 'rgba(8,34,60,0.25)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + r + 10, r * 0.7 * sc, 9 * sc, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    var ball = { x: cx, y: cy, r: r * sc, vx: 0, vy: 0, id: 3 };
    var show = list[idx];
    for (var k in show) ball[k] = show[k];
    drawBall(ball, alpha);
  }

  function render() {
    grabTransSnap();

    ctx.globalAlpha = 1;
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'miter';
    ctx.setLineDash([]);

    ctx.setTransform(dpr * view.s, 0, 0, dpr * view.s, 0, 0);
    drawBackground();

    renderOy = oy;
    ctx.setTransform(dpr * view.s, 0, 0, dpr * view.s, 0, dpr * view.s * renderOy);
    if (shakeT > 0) {
      var s = shakeAmp * (shakeT / 0.4);
      ctx.translate((Math.random() - 0.5) * 2 * s, (Math.random() - 0.5) * 2 * s);
    }

    ctx.save();
    ctx.translate(BX, 0);

    if (state === 'menu') {
      var tK = menuTransK();
      drawMenuScene();
      drawMenuContent();
      ctx.save();
      ctx.translate(0, hudInset);
      drawSetBtn();
      ctx.restore();
      if (tK !== null) drawRippleReveal(tK);
      if (setOpen || panelFxAlive('set')) { var msR = MG.layout.setRect(); drawPanelFx('set', setOpen, msR.x + msR.w / 2, msR.y + msR.h / 2, 0.55, drawSettings); }
      if (setClearOpen || panelFxAlive('setclr')) { var mcR = MG.layout.setClearRect(); drawPanelFx('setclr', setClearOpen, mcR.x + mcR.w / 2, mcR.y + mcR.h / 2, 0.6, drawSetClear); }
      if (achOpen || panelFxAlive('ach')) drawPanelFx('ach', achOpen, DEX_PANEL.x + DEX_PANEL.w / 2, DEX_PANEL.y + DEX_PANEL.h / 2, 0.6, drawAchPanel);
      ctx.restore(); return;
    }

    drawContainer();
    drawWaterBack();
    if (state === 'play' && !evapMode && !flowMode && !rippleMode && !confirmOpen) {
      drawGhostGuide(aimX, nextTier);
      drawLandPreview();
    }

    var i;
    for (i = 0; i < phys.bodies.length; i++) drawBall(phys.bodies[i], 1);

    drawWaterFront();

    drawBuoyWarn();
    drawTutorial();

    if (state === 'play' && !evapMode && !flowMode && !rippleMode && !confirmOpen) {
      drawGhost(aimX, C.spawnY, nextTier, cooldown > 0 ? 0.25 : 0.6);
    }

    drawFx();
    drawEventVfx();
    drawEventWarn();

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

    if (flowMode) {
      ctx.fillStyle = 'rgba(10,40,70,0.14)';
      ctx.fillRect(-BX, -renderOy, C.W + BX * 2, VH);
      if (flowPick) {
        ctx.save();
        ctx.strokeStyle = '#7FE8F5';
        ctx.lineWidth = 3;
        ctx.setLineDash([7, 5]);
        ctx.lineDashOffset = -time * 30;
        ctx.beginPath(); ctx.arc(flowPick.x, flowPick.y, flowPick.r + 9, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }
      ctx.textAlign = 'center';
      var flowHint = flowPick ? '水流模式：再点一枚水滴与之交换（点原滴取消）' : '水流模式：点选第一枚水滴';
      drawPropHint(flowHint);
    }

    var vg = grad('vig' + Math.round(VH) + '_' + Math.round(BX), function () {
      var gg = ctx.createRadialGradient(C.W / 2, VH / 2, VH * 0.34, C.W / 2, VH / 2, VH * 0.74);
      gg.addColorStop(0, 'rgba(0,0,0,0)');
      gg.addColorStop(1, 'rgba(6,28,52,0.16)');
      return gg;
    });
    ctx.fillStyle = vg;
    ctx.fillRect(-BX, -renderOy, C.W + BX * 2, VH);

    if (hudInset > 0) { ctx.save(); ctx.translate(0, hudInset); }
    drawHUD();
    if (!questHidden) drawQuest();
    drawSeaProgress();
    drawTideTimer();
    drawChalChip();
    if (hudInset > 0) ctx.restore();
    drawDangerLine();
    drawDangerText();
    drawHeartbeat();
    drawReefCancelHint();
    drawGhostLabel();
    drawPopups();
    drawTideBanner();
    drawComboMeter();
    drawSkillBar();
    if (confirmOpen || panelFxAlive('confirm')) { var pcR = MG.layout.confirmRect(); drawPanelFx('confirm', confirmOpen, pcR.x + pcR.w / 2, pcR.y + pcR.h / 2, 0.55, drawConfirm); }
    if (setOpen || panelFxAlive('set')) { var psR = MG.layout.setRect(); drawPanelFx('set', setOpen, psR.x + psR.w / 2, psR.y + psR.h / 2, 0.55, drawSettings); }
    if (setClearOpen || panelFxAlive('setclr')) { var pc2R = MG.layout.setClearRect(); drawPanelFx('setclr', setClearOpen, pc2R.x + pc2R.w / 2, pc2R.y + pc2R.h / 2, 0.6, drawSetClear); }

    if (dexOpen || panelFxAlive('dex')) drawPanelFx('dex', dexOpen, DEX_PANEL.x + DEX_PANEL.w / 2, DEX_PANEL.y + DEX_PANEL.h / 2, 0.6, drawDex);
    else if (achOpen || panelFxAlive('ach')) drawPanelFx('ach', achOpen, DEX_PANEL.x + DEX_PANEL.w / 2, DEX_PANEL.y + DEX_PANEL.h / 2, 0.6, drawAchPanel);
    if (ngOpen || panelFxAlive('ng')) { var pnR = MG.layout.ngRect(); drawPanelFx('ng', ngOpen, pnR.x + pnR.w / 2, pnR.y + pnR.h / 2, 0.66, drawNgPick); }
    if (shareOpen || panelFxAlive('share')) { var pshR = MG.layout.shareRect(); drawPanelFx('share', shareOpen, pshR.x + pshR.w / 2, pshR.y + pshR.h / 2, 0.6, drawShare); }
    if (state === 'over') drawOver();

    ctx.restore();

    var tkIn = menuTransK();
    if (tkIn !== null) drawRippleReveal(tkIn);
  }

  MG.debug.iconData = function (kind, id, size) {
    size = size || 192;
    var cv = document.createElement('canvas');
    cv.width = size; cv.height = size;
    var old = ctx;
    ctx = cv.getContext('2d');
    ctx.save();
    ctx.translate(size / 2, size / 2);
    ctx.scale(size / 96, size / 96);
    if (kind === 'tier') {
      drawBall({ x: 0, y: 0, r: 30, tier: id, vx: 0, vy: 0 }, 1);
    } else if (kind === 'sp') {
      var r = 26;
      if (id === 'iron') drawIronBall({ x: 0, y: 0, r: r, vx: 0, vy: 0 }, 1);
      else if (id === 'rune') drawBall({ x: 0, y: 0, r: r, tier: 1, vx: 0, vy: 0, rune: 'ripple' }, 1);
      else drawBall({ x: 0, y: 0, r: r, tier: 1, vx: 0, vy: 0, special: id, frozen: id === 'ice' ? 1 : 0 }, 1);
    } else if (kind === 'sea') {
      ctx.scale(2.4, 2.4);
      drawSeaBadge(id, 0, 0, true);
    } else if (kind === 'skill') {
      var col = id === 'swap' ? '#8E6FC0' : (id === 'ripple' ? '#2FA8A0' : (id === 'evap' ? '#E2705E' : '#3FA8B8'));
      ctx.scale(2.2, 2.2);
      drawSkillIcon(id, 0, 0, col);
    } else if (kind === 'chest') {
      ctx.scale(1.7, 1.7);
      drawChestIcon(0, 0, 1);
    } else if (kind === 'ng') {
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
var last = 0;
function frame(ts) {
  requestAnimationFrame(frame);
  if (MG.debug.headless) return;
  if (typeof document !== 'undefined' && document.hidden) { last = ts; return; }
  if (!last) last = ts;
  var dt = Math.min((ts - last) / 1000, 1 / 30);
  last = ts;
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
if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
  var kickRepaint = function () {
    if (document.hidden) return;
    last = 0;
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

