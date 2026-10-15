// 水滴成海 - 游戏主逻辑
// 输入 / 合成 / 技能 / 图鉴 / 海域 / 特殊水滴(漩涡·雨云·冰晶) / 潮汐 / 任务链 / 渲染 / 音效 / 广告占位
// 全部 UI 画在 canvas 内（含按钮命中判定），便于后续原样移植到微信小游戏（无 DOM 环境）
(function () {
  var C = MG.config;
  var T = C.tiers;

  // ---------- 画布 ----------
  // 逻辑高度动态（VH ≥ 720）：顶部元素（HUD/出生区/警戒线）按顶部坐标绘制，
  // 底部元素（海底/技能栏/按钮）按 VH-偏移 贴底，中间水域随窗口高度自适应；
  // 画布 CSS 高度恒等于窗口高度，CSS 宽度=游戏区宽度（两侧为页面深海背景）
  var canvas = document.getElementById('game');
  var ctx = canvas.getContext('2d');
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var VH = C.H;           // 当前逻辑高度
  var LW = C.W;           // 当前逻辑宽度（≥ C.W，宽窗口下两侧为延伸海水）
  var BX = 0;             // 游戏区（420 逻辑宽）水平居中偏移
  var FLOORY = C.floorY;  // 容器底 y（底部锚定：VH - 74）
  var view = { s: 1 };

  function fit() {
    var w = window.innerWidth, h = window.innerHeight;
    view.s = Math.min(w / C.W, h / C.H);   // 等比缩放，不变形
    VH = h / view.s;
    LW = w / view.s;                       // 逻辑宽度（≥420）
    BX = (LW - C.W) / 2;                   // 游戏区水平居中
    FLOORY = VH - 74;                      // 容器底贴住窗口底部（720-646=74）
    C.floorY = FLOORY;                     // 同步给物理引擎（每帧读取，水滴落到新地板）
    // 警戒线以下区域大小固定（容器高度不变，与 720 标准布局完全一致）：
    // 多出来的高度全部留在警戒线之上（水滴滴落区域拉伸）
    C.dangerY = FLOORY - (646 - 182);      // 警戒线 = 容器底 - 464
    C.containerTop = FLOORY - (646 - 118); // 容器顶开口 = 容器底 - 528
    C.spawnY = FLOORY - (646 - 120);       // 出生点 = 容器底 - 526（掉落位置相对警戒线固定，游戏区高宽比恒定）
    canvas.width = Math.round(w * dpr);    // 画布铺满整个窗口（背景全程由游戏自绘）
    canvas.height = Math.round(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    // 底部按钮/图鉴角标同步贴底（上移 4px 给名称标签留出完整显示空间）
    var cy = VH - 36;
    if (bookBtn) {
      bookBtn.cy = cy; restartBtn.cy = cy;
      for (var i = 0; i < SKILL_BTNS.length; i++) SKILL_BTNS[i].cy = cy;
    }
  }
  window.addEventListener('resize', fit);
  window.addEventListener('orientationchange', fit);
  if (window.ResizeObserver) {
    // 兜底：预览面板/嵌入容器改变尺寸时不一定触发 resize 事件
    new ResizeObserver(fit).observe(document.documentElement);
  }

  // ---------- 存储（带兜底） ----------
  function saveNum(key, v) { try { localStorage.setItem(key, String(v)); } catch (e) {} }
  function loadFlag(key) { try { return localStorage.getItem(key) === '1'; } catch (e) { return false; } }
  function saveFlag(key, v) { try { localStorage.setItem(key, v ? '1' : '0'); } catch (e) {} }
  function loadDex() {
    try {
      var v = JSON.parse(localStorage.getItem('mg_dex') || '{}');
      return { u: v.u || {}, c: v.c || {}, sp: v.sp || {}, stats: v.stats || {}, ach: v.ach || {} };
    } catch (e) { return { u: {}, c: {}, sp: {}, stats: {}, ach: {} }; }
  }
  function saveDex() {
    try { localStorage.setItem('mg_dex', JSON.stringify({ u: dexUnlocked, c: dexCounts, sp: dexSpecial, stats: lifeStats, ach: achDone })); } catch (e) {}
  }

  // ---------- 音效（WebAudio 合成，无素材文件） ----------
  var audio = {
    ctx: null,
    muted: loadFlag('mg_mute'),
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
      if (this.ctx && !this.muted) this.bgm.start();
    },
    blip: function (freq, dur, type, vol, slide) {
      if (this.muted || !this.ctx) return;
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
    drop: function () { this.blip(320, 0.08, 'triangle', 0.12, 0.6); },
    pop: function (tier) { this.blip(480 + tier * 45, 0.14, 'sine', 0.18, 1.6); },
    big: function () { this.blip(200, 0.45, 'sine', 0.22, 2.4); },
    swirl: function () { this.blip(220, 0.5, 'sine', 0.12, 2.8); },
    freeze: function () { this.blip(1250, 0.09, 'sine', 0.12, 1.1); },
    thaw: function () { this.blip(700, 0.18, 'sine', 0.10, 1.5); },
    over: function () { this.blip(300, 0.5, 'sawtooth', 0.10, 0.3) },
    quest: function () {
      if (this.muted) return;
      this.blip(660, 0.10, 'sine', 0.14, 1.2);
      var self = this;
      setTimeout(function () { self.blip(880, 0.16, 'sine', 0.14, 1.2); }, 90);
    },
    tide: function () {
      if (this.muted || !this.ctx) return;
      // 涨潮：低频上滑长音
      this.blip(110, 0.9, 'sine', 0.14, 2.2);
      this.blip(165, 0.7, 'triangle', 0.07, 2.0);
    }
  };

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
      if (this.on || audio.muted || !audio.ctx) return;
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
      if (!audio.ctx || !this._flt || audio.muted) return;
      try { this._flt.frequency.setTargetAtTime(1150 - x * 480, audio.ctx.currentTime, 0.5); } catch (e) {}
    },
    // 声音预警②：潮汐低频隆隆（progress 渐入，预警期脉冲）
    setTide: function (progress, warn) {
      if (!audio.ctx || audio.muted) return;
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

  // ---------- 广告占位（上线微信时替换为 wx.createRewardedVideoAd） ----------
  var adOverlay = null;
  var ads = {
    show: function (label, onReward) {
      adOverlay = { label: label, t: 1.0, cb: onReward };
    }
  };

  // ---------- 状态 ----------
  var phys = new MG.Physics();
  var state = 'play';
  var score = 0, displayScore = 0, scoreBump = 0;
  var best = 0; // 刷新页面即重新计，不跨刷新保留
  var nextTier = rollTier();
  var nextSpecial = rollSpecial();
  var nextRune = nextSpecial ? null : rollRune();
  var nextIron = rollIron();
  var runeHintShown = false; // 符文玩法一次性提示
  var aimX = C.W / 2;
  var aiming = false;
  var cooldown = 0;
  var combo = 0, comboTimer = 0, maxCombo = 0;
  var reviveCount = 0, doubled = false; // 每局复活上限 2 次（看广告）
  var popups = [], parts = [];
  var rippleQueue = []; // 待发的涟漪次波 { t, x, y }
  var time = 0;
  var overButtons = [];
  var shakeT = 0, shakeAmp = 0;

  var skillCharge = { swap: 0, ripple: 0, evap: 0, flow: 0 };
  // 深海宝箱（无尽模式）：定期沉入一只，限时点击开启随机奖励
  var chest = null;
  var chestTimer = 26 + Math.random() * 20;
  // 随机深海事件（无尽模式）：涌泉 / 甘霖 / 漩涡风暴
  var seaEvent = { timer: 24 + Math.random() * 14, type: null, t: 0, x: 0, y: 0, data: null };
  var rippleMode = false; // 涟漪选位模式：点击画布指定波纹中心
  var flowMode = false;   // 水流模式：点选两枚水滴交换位置（布局型道具）
  var flowPick = null;    // 水流模式已选中的第一枚水滴
  var dexLoaded = loadDex();
  var dexUnlocked = dexLoaded.u;
  var dexCounts = dexLoaded.c;
  var dexSpecial = dexLoaded.sp;   // 特殊水滴发现记录 { vortex:1, iron:1, ... }
  var dexTab = 0;                  // 图鉴页签：0=图鉴 1=成就 2=每日 3=榜单
  var dexSelSp = 0;                // 图鉴页当前选中的特殊滴说明
  // 跨局终身统计（成就进度用）：宝箱/涨潮/礁石对/彩虹合成/任务/连击/单局最高分
  var lifeStats = (function () {
    var d = { chest: 0, tide: 0, ironPair: 0, rainbow: 0, quest: 0, combo: 0, best: 0 };
    var s = dexLoaded.stats || {};
    for (var k in d) if (typeof s[k] === 'number' && s[k] > d[k]) d[k] = s[k];
    return d;
  })();
  var achDone = dexLoaded.ach;     // 已达成成就 { id: 1 }
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
  var lastPointer = { x: -100, y: -100 };

  var quest = null, questDepth = 0;

  // 关卡状态：1 = 限时得分关（低难度），2 = 无尽模式（礁石/潮汐齐全，计时改为累计进行时长）
  var level = 1, levelTime = C.level1.time, failReason = '', levelBanner = 0;
  var levelElapsed = 0;                                  // 无尽模式已进行时长
  var lifeScore = 0, runCounted = 0; // 累计分（图鉴门槛用）：刷新页面即重新计，不跨刷新保留
  function totalScore() { return lifeScore + (score - runCounted); }

  // 潮汐状态
  var tide = { phase: 'idle', timer: C.tide.firstDelay, progress: 0, banner: 0 };
  var achTick = 0; // 成就周期检查计时
  // 无尽模式渐进加压：随时长线性到满（潮汐更频/礁石更多/投放向高级倾斜）
  var endlessT = 0, rampStage = 0;
  var climaxMark = 0; // 高潮时刻：上次触发时的分数标记
  var tideGateHint = false; // 潮汐限定合成：一次性提示
  // 首局主动引导：前 5 投分步提示（只出现一次，localStorage 标记）
  var dropCount = 0, tutDone = loadFlag('mg_tut');
  var TUT_STEPS = [
    '按住屏幕左右拖动瞄准，松手投下水滴',
    '低级水滴先垫底，给大水滴留空间',
    '相同水滴碰到一起就会合成升级',
    '水堆漫过警戒线并停住就输了——留意上方白线',
    '攒满符文即可点亮底部技能按钮'
  ];
  function endlessRamp() {
    return level === 2 ? Math.min(1, endlessT / (C.ramp.minutes * 60)) : 0;
  }
  // 成就永续加成查询（勋章变成长线）
  function perkOn(id) { return !!achDone[id]; }
  function perkMult() { return (achDone.tide12 && tide.progress > 0.2) ? 1.1 : 1; }
  // 数值封顶：所有乘区叠乘后总倍率不超过 C.multCap（防成就/海域加成叠乘导致分数膨胀）
  function cm(m) { return Math.min(m, C.multCap); }

  // 海域演进：累计分跨过里程碑改变世界（背景色调随阶段加深 + 称号）
  var stageSeen = -1; // 已提示过的阶段（会话内）
  function seaStage() {
    var s = 0, ts = totalScore();
    for (var i = C.seaStages.length - 1; i >= 0; i--) { if (ts >= C.seaStages[i].at) { s = i; break; } }
    return s;
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
  function loadDaily() {
    try { return JSON.parse(localStorage.getItem('mg_daily') || 'null'); } catch (e) { return null; }
  }
  function saveDaily() { try { localStorage.setItem('mg_daily', JSON.stringify(daily)); } catch (e) {} }
  function buildDailyTasks(date, rnd) {
    var pool = [
      { type: 'merge', tier: 1 + Math.floor(rnd() * 3), need: 6 + Math.floor(rnd() * 5) },
      { type: 'combo', need: 3 + Math.floor(rnd() * 3) },
      { type: 'chest', need: 1 },
      { type: 'tide',  need: 2 },
      { type: 'iron',  need: 1 }
    ];
    // 按种子挑 3 个不同类型：合成/连击固定候选，第三个从宝箱/涨潮/礁石里选
    var t1 = { type: 'merge', tier: 1 + Math.floor(rnd() * 3), need: 6 + Math.floor(rnd() * 5) };
    t1.text = '合成 ' + t1.need + ' 个「' + T[t1.tier].name + '」';
    var t2 = { type: 'combo', need: 3 + Math.floor(rnd() * 3) };
    t2.text = '达成 ' + t2.need + ' 连击';
    var extra = [pool[2], pool[3], pool[4]][Math.floor(rnd() * 3)];
    extra = { type: extra.type, need: extra.need };
    extra.text = extra.type === 'chest' ? '开启 1 只深海宝箱'
      : (extra.type === 'tide' ? '经历 ' + extra.need + ' 次涨潮' : '消除 1 对礁石');
    return [t1, t2, extra];
  }
  var daily = (function () {
    var d = loadDaily(), today = todayStr();
    if (!d || d.date !== today) {
      var streak = (d && d.date === yesterdayStr()) ? (d.streak || 0) : 0; // 断签清零
      var rnd = mulberry(dateSeed(today));
      var fresh = { date: today, streak: streak, streakToday: false, tasks: buildDailyTasks(today, rnd), prog: [0, 0, 0], done: [false, false, false], allDone: false };
      saveDailyFresh(fresh);
      return fresh;
    }
    return d;
  })();
  function saveDailyFresh(d) { try { localStorage.setItem('mg_daily', JSON.stringify(d)); } catch (e) {} }
  function dailyProgress(type, tier, n) {
    for (var i = 0; i < daily.tasks.length; i++) {
      var t = daily.tasks[i];
      if (daily.done[i] || t.type !== type) continue;
      if (type === 'merge' && t.tier !== tier) continue;
      if (type === 'combo') daily.prog[i] = Math.min(t.need, Math.max(daily.prog[i], n || 0)); // 连击取峰值
      else daily.prog[i] = Math.min(t.need, daily.prog[i] + (n || 1));
      if (daily.prog[i] >= t.need) {
        daily.done[i] = true;
        var gain = Math.round(C.daily.rewardScore * scoreMult);
        score += gain;
        scoreBump = 0.35;
        addPopup(C.W / 2, 205, '每日任务完成 +' + gain, true, 0);
        audio.quest();
      }
    }
    // 三项全完成 → 连续天数 +1（每天只涨一次）+ 天数奖励
    if (!daily.allDone && daily.done[0] && daily.done[1] && daily.done[2]) {
      daily.allDone = true;
      if (!daily.streakToday) { daily.streakToday = true; daily.streak++; }
      var bonus = C.daily.streakBase + daily.streak * C.daily.streakStep;
      score += bonus;
      scoreBump = 0.4;
      var pk = C.skills[(Math.random() * C.skills.length) | 0];
      skillCharge[pk.key] += 2;
      addPopup(C.W / 2, 232, '今日全勤！连续 ' + daily.streak + ' 天 +' + bonus, true, 0);
      addPopup(C.W / 2, 258, '「' + pk.name + '」充能 +2', false, 0);
      parts.push({ type: 'ring', x: C.W / 2, y: 232, r: 30, life: 0.7, max: 0.7, color: '#F5C542' });
      audio.quest();
    }
    saveDaily();
  }

  // ---------- 好友榜（本地模拟榜：预留微信 wx 接口位，上线后替换数据源） ----------
  var friends = (function () {
    var list = null;
    try { list = JSON.parse(localStorage.getItem('mg_friends') || 'null'); } catch (e) { list = null; }
    if (!list) {
      var names = ['海风酱', '泡泡鱼', '深蓝船长', '浪里格', '珊瑚酱', '夜航星'];
      var rnd = mulberry(dateSeed('friends-v1'));
      list = [];
      for (var i = 0; i < names.length; i++) list.push({ name: names[i], base: Math.floor(300 + rnd() * 4200) });
      try { localStorage.setItem('mg_friends', JSON.stringify(list)); } catch (e) {}
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
    return '【水滴成海】我在' + C.seaStages[seaStage()].name + '拿下 ' + score + ' 分！' +
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

  // 背景气泡
  var bubbles = [];
  for (var bi = 0; bi < 14; bi++) {
    bubbles.push({
      x: Math.random() * LW, y: Math.random() * VH,
      r: 1.5 + Math.random() * 3.5, sp: 12 + Math.random() * 22,
      sway: Math.random() * Math.PI * 2
    });
  }

  // 远景鱼群
  var fishes = [];
  function resetFish(f) {
    f.dir = Math.random() < 0.5 ? 1 : -1;
    f.x = f.dir > 0 ? -70 : C.W + 70;
    f.y = 160 + Math.random() * 400;
    f.sp = 24 + Math.random() * 34;
    f.s = 7 + Math.random() * 9;
    f.wob = Math.random() * Math.PI * 2;
  }
  for (var fi = 0; fi < 5; fi++) {
    var nf = { tail: 0, dir: 1, x: 0, y: 0, sp: 0, s: 0, wob: 0 };
    resetFish(nf);
    nf.x = Math.random() * LW;
    fishes.push(nf);
  }

  // 水母
  var jellies = [];
  for (var ji = 0; ji < 2; ji++) {
    jellies.push({
      x: 60 + Math.random() * (C.W - 120),
      y: 260 + ji * 170,
      s: 13 + Math.random() * 9,
      ph: Math.random() * Math.PI * 2,
      drift: 4 + Math.random() * 5,
      tint: ji === 0 ? '255,175,205' : '185,160,255'
    });
  }

  // 微光闪粒
  var glitters = [];
  for (var gi = 0; gi < 22; gi++) {
    glitters.push({
      x: Math.random() * LW, y: Math.random() * VH,
      r: 0.8 + Math.random() * 1.5,
      ph: Math.random() * Math.PI * 2, sp: 1.5 + Math.random() * 2.5
    });
  }

  // 海草已按用户要求移除

  function rollTier() {
    // 渐进加压：投放权重随无尽时长向高级演进（线性插值到 spawnWeightsMax）
    var rp = endlessRamp(), ws = [], total = 0, i;
    for (i = 0; i < C.spawnWeights.length; i++) {
      var w = C.spawnWeights[i] + (C.ramp.spawnWeightsMax[i] - C.spawnWeights[i]) * rp;
      ws.push(w); total += w;
    }
    var r = Math.random() * total;
    for (i = 0; i < ws.length; i++) { r -= ws[i]; if (r <= 0) return i; }
    return 0;
  }
  function rollSpecial() {
    if (Math.random() >= C.specialChance) return null;
    var r = Math.random();
    if (r < 0.30) return 'vortex';
    if (r < 0.60) return 'cloud';
    if (r < 0.84) return 'ice';
    return 'rainbow'; // 彩虹滴：碰到任意水滴直接跳 2 级合成
  }
  function rollIron() {
    if (seaEvent && seaEvent.type === 'storm') return false; // 保底：风暴期间不再落礁石，避免双重失控
    return level === 2 && Math.random() < C.iron.chance + (C.ramp.ironChanceMax - C.iron.chance) * endlessRamp();
  } // 礁石仅无尽模式（概率随渐进加压提升）
  // 符文：普通水滴随机附带的道具属性，合成时为对应技能充能
  function rollRune() {
    if (Math.random() >= C.rune.chance) return null;
    var r = Math.random(), w = C.rune.weights;
    if (r < w.swap) return 'swap';
    if (r < w.swap + w.ripple) return 'ripple';
    if (r < w.swap + w.ripple + w.evap) return 'evap';
    return 'flow';
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
    b.m = C.iron.r * C.iron.r * C.iron.massMult; // 大质量 → 下落时把水滴挤开（砸穿效果）
    return b;
  }
  function specialLabel(sp) {
    return sp === 'vortex' ? '漩涡滴' : (sp === 'cloud' ? '雨云滴' : (sp === 'ice' ? '冰晶滴' : '彩虹滴'));
  }
  function specialColor(sp) {
    return sp === 'vortex' ? '#4A5FC8' : (sp === 'cloud' ? '#3C6EAA' : (sp === 'ice' ? '#2E8FB8' : '#9B4FD0'));
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
    for (i = 0; i < C.spawnWeights.length; i++) {
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
  function addPopup(x, y, text, isBig, mult) {
    popups.push({ x: x, y: y, text: text, life: 1.0, max: 1.0, big: !!isBig, mult: mult || 0, scale: 0.4 });
  }
  function addShake(amp, dur) {
    shakeAmp = Math.max(shakeAmp, amp);
    shakeT = Math.max(shakeT, dur);
  }
  function updateFx(dt) {
    var i, p;
    // 涟漪次波（延迟到达的第二推）
    for (i = rippleQueue.length - 1; i >= 0; i--) {
      var rq = rippleQueue[i];
      rq.t -= dt;
      if (rq.t <= 0) {
        applyRipplePush(rq.x, rq.y, C.ripple.secondPower);
        parts.push({ type: 'ring', x: rq.x, y: rq.y, r: 46, life: 0.5, max: 0.5, color: '#A8DDF5' });
        rippleQueue.splice(i, 1);
      }
    }
    for (i = parts.length - 1; i >= 0; i--) {
      p = parts[i];
      p.life -= dt;
      if (p.type === 'dot') { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 400 * dt; }
      else if (p.type === 'suck') {
        var k = Math.min(1, dt * 13);
        p.x += (p.tx - p.x) * k; p.y += (p.ty - p.y) * k;
      }
      if (p.life <= 0) parts.splice(i, 1);
    }
    for (i = popups.length - 1; i >= 0; i--) {
      p = popups[i];
      p.life -= dt; p.y -= 28 * dt;
      if (p.scale < 1) p.scale = Math.min(1, p.scale + dt * 5);
      if (p.life <= 0) popups.splice(i, 1);
    }
    for (i = 0; i < bubbles.length; i++) {
      p = bubbles[i];
      p.y -= p.sp * dt;
      p.sway += dt;
      if (p.y < -8) { p.y = VH + 8; p.x = Math.random() * LW; }
    }
    for (i = 0; i < fishes.length; i++) {
      var f = fishes[i];
      f.x += f.dir * f.sp * dt;
      f.y += Math.sin(time * 0.7 + f.wob) * 8 * dt;
      f.tail += dt * 9;
      if (f.dir > 0 && f.x > C.W + 70) resetFish(f);
      if (f.dir < 0 && f.x < -70) resetFish(f);
    }
    for (i = 0; i < jellies.length; i++) {
      var jl = jellies[i];
      jl.y -= jl.drift * dt;
      jl.x += Math.sin(time * 0.5 + jl.ph) * 9 * dt;
      if (jl.y < 170) { jl.y = VH * 0.88; jl.x = 50 + Math.random() * (LW - 100); }
    }
    for (i = 0; i < glitters.length; i++) {
      var gl = glitters[i];
      gl.y -= gl.sp * dt;
      if (gl.y < -6) { gl.y = VH + 6; gl.x = Math.random() * LW; }
    }
    if (shakeT > 0) { shakeT -= dt; if (shakeT <= 0) shakeAmp = 0; }
    if (scoreBump > 0) scoreBump -= dt;
    // 按钮按压反馈计时
    if (bookBtn.pressT > 0) bookBtn.pressT -= dt;
    if (MUTE.pressT > 0) MUTE.pressT -= dt;
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
    addPopup(px === undefined ? C.W / 2 : px, py === undefined ? 100 : py,
      '图鉴解锁 · ' + T[t].name + ' +' + bonus, true, 0);
    saveDex();
  }
  // 累计得分跨过门槛时补解锁（如先合出了高级、后攒够积分）
  function checkDexGates() {
    for (var t = 0; t < T.length; t++) {
      if (!dexUnlocked[t] && totalScore() >= (C.dexGate[t] || 0)) unlockTier(t);
    }
  }

  // ---------- 成就（常驻目标，跨局累计；达成后永久生效的加成见 perk） ----------
  var ACH_DEFS = [
    { id: 'canghai',  name: '沧海遗珠', desc: '合成出传说中的「沧海」',   target: 1,    perk: '永续：沧海汇入海域得分 +50%', cur: function () { return dexCounts[8] || 0; } },
    { id: 'combo6',   name: '连浪六叠', desc: '达成 6 连击',              target: 6,    perk: '永续：连击窗口 +0.3 秒', cur: function () { return Math.max(maxCombo, lifeStats.combo || 0); } },
    { id: 'chest5',   name: '寻宝猎人', desc: '累计开启 5 只深海宝箱',    target: 5,    perk: '永续：宝箱奖励 +50% · 充能 +3', cur: function () { return lifeStats.chest || 0; } },
    { id: 'tide12',   name: '弄潮儿',   desc: '经历 12 次涨潮',           target: 12,   perk: '永续：潮汐期间合成得分 +10%', cur: function () { return lifeStats.tide || 0; } },
    { id: 'iron5',    name: '礁石克星', desc: '累计消除 5 对礁石',        target: 5,    perk: '永续：礁石相消得分翻倍', cur: function () { return lifeStats.ironPair || 0; } },
    { id: 'rainbow5', name: '虹光使者', desc: '触发 5 次彩虹合成',        target: 5,    perk: '永续：彩虹合成得分 +50%', cur: function () { return lifeStats.rainbow || 0; } },
    { id: 'quest12',  name: '任务大师', desc: '累计完成 12 个任务',       target: 12,   perk: '永续：任务奖励 +30%', cur: function () { return lifeStats.quest || 0; } },
    { id: 'score2k',  name: '深海富豪', desc: '单局得分达到 2000',        target: 2000, perk: '永续：开局随机技能充能 +2', cur: function () { return Math.max(score, best, lifeStats.best || 0); } }
  ];
  function checkAchievements() {
    lifeStats.best = Math.max(lifeStats.best || 0, best, score);
    for (var i = 0; i < ACH_DEFS.length; i++) {
      var a = ACH_DEFS[i];
      if (achDone[a.id]) continue;
      if (a.cur() < a.target) continue;
      achDone[a.id] = 1;
      var gain = Math.round(80 * cm(scoreMult));
      score += gain;
      scoreBump = 0.4;
      var pick = C.skills[(Math.random() * C.skills.length) | 0];
      skillCharge[pick.key] += 2;
      addPopup(C.W / 2, 150, '成就达成 · ' + a.name + ' +' + gain, true, 0);
      addPopup(C.W / 2, 176, '「' + pick.name + '」充能 +2', false, 0);
      parts.push({ type: 'ring', x: C.W / 2, y: 150, r: 26, life: 0.6, max: 0.6, color: '#F5C542' });
      audio.quest();
      saveDex();
    }
  }

  // ---------- 特殊水滴图鉴（发现即点亮） ----------
  var SP_DEFS = [
    { key: 'vortex',  name: '漩涡滴', color: '#7B6FD0', desc: '落地后吸附周围水滴再消散，可用来聚拢散滴。' },
    { key: 'cloud',   name: '雨云滴', color: '#8FA8BC', desc: '落地后分裂成两颗雾泡，快速补充低级水滴。' },
    { key: 'ice',     name: '冰晶滴', color: '#A8DFF2', desc: '落定后冻结周围水滴，冻结滴可以当临时平台。' },
    { key: 'rainbow', name: '彩虹滴', color: '#E86FA8', desc: '碰到任意水滴使其直接跳 2 级，得分双倍。' },
    { key: 'iron',    name: '礁石',   color: '#6E7B88', desc: '沉重障碍，无法合成；两两相消或用蒸发移除。' },
    { key: 'rune',    name: '符文滴', color: '#B08FD0', desc: '带符文的水滴，合成时为对应技能 +1 充能。' },
    { key: 'chest',   name: '深海宝箱', color: '#C98B3E', desc: '限时沉入场中，点击开启随机奖励。' }
  ];
  function discoverSpecial(sp) {
    if (dexSpecial[sp]) return;
    dexSpecial[sp] = 1;
    saveDex();
    for (var i = 0; i < SP_DEFS.length; i++) {
      if (SP_DEFS[i].key === sp) {
        addPopup(C.W / 2, 130, '图鉴新发现 · ' + SP_DEFS[i].name, true, 0);
        break;
      }
    }
  }

  // ---------- 任务链 ----------
  function makeQuest(depth) {
    questDepth = depth;
    var roll = Math.random(), q;
    if (roll < 0.45) {
      q = { type: 'merge', tier: 1 + Math.floor(Math.random() * 3), need: 3 + Math.min(depth, 4), have: 0 };
      q.text = '合成 ' + q.need + ' 个「' + T[q.tier].name + '」';
    } else if (roll < 0.75) {
      q = { type: 'combo', need: Math.min(3 + Math.floor(depth / 2), 6), have: 0 };
      q.text = '达成 ' + q.need + ' 连击';
    } else {
      q = { type: 'tier', tier: 4 + Math.min(Math.floor(depth / 2), 2), need: 1, have: 0 };
      q.text = '合成出「' + T[q.tier].name + '」';
    }
    q.rewardScore = C.questScoreBase + depth * C.questScoreStep;
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
    skillCharge[pick.key] = pick.cost;
    addPopup(C.W / 2, 150, '任务完成 +' + gain, true, 0);
    addPopup(C.W / 2, 176, '「' + pick.name + '」已充满', false, 0);
    parts.push({ type: 'ring', x: C.W / 2, y: 150, r: 20, life: 0.5, max: 0.5, color: '#F5C542' });
    audio.quest();
    if (score > best) { best = score; saveNum('mg_best', best); }
    makeQuest(questDepth + 1);
  }

  // ---------- 合成 ----------
  function processMerges() {
    var bs = phys.bodies, used = {}, merges = [], i, j;
    // 彩虹滴：接触任意普通水滴 → 目标滴直接跳 2 级（趣味高光时刻，优先于普通合成）
    for (i = 0; i < bs.length; i++) {
      var rb = bs[i];
      if (used[rb.id] || rb.special !== 'rainbow' || rb.frozen > 0 || rb.iron) continue;
      for (j = 0; j < bs.length; j++) {
        var tb = bs[j];
        if (tb === rb || used[tb.id] || tb.special || tb.frozen > 0 || tb.iron || tb.tier < 0) continue;
        var rdx = tb.x - rb.x, rdy = tb.y - rb.y;
        var rminD = rb.r + tb.r + 0.5;
        if (rdx * rdx + rdy * rdy <= rminD * rminD) {
          used[rb.id] = used[tb.id] = 1;
          doRainbowMerge(rb, tb);
          break;
        }
      }
    }
    for (i = 0; i < bs.length; i++) {
      var a = bs[i];
      if (used[a.id] || a.special || a.frozen > 0 || a.iron) continue;
      for (j = i + 1; j < bs.length; j++) {
        var b = bs[j];
        if (used[b.id] || b.special || b.frozen > 0 || b.iron || b.tier !== a.tier) continue;
        // 潮汐限定合成：两枚「江河」只能在涨潮时聚成「大海」（彩虹跳级不受限）
        if (a.tier === C.tidePair.tier && tide.progress < C.tidePair.threshold) {
          if (!tideGateHint) {
            tideGateHint = true;
            addPopup(C.W / 2, 250, '两枚「江河」需在潮汐中才能聚成「大海」', true, 0);
          }
          continue;
        }
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

    // 礁石两两相消：接触即互相消除（不靠技能的移除途径）
    for (i = 0; i < bs.length; i++) {
      var ia = bs[i];
      if (!ia.iron || ia.chest || used[ia.id] || ia.frozen > 0) continue;
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
        color: 'hsl(' + Math.floor(Math.random() * 360) + ',80%,65%)' });
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

    var gain2 = Math.round(T[nt].score * cm(mult * scoreMult * perkMult())); // 成就加成：弄潮儿潮汐期间 +10%；总倍率封顶
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

    // 甘霖：连击馈赠
    if (combo === C.rainCombo) {
      var t = mostCommonTier();
      if (t >= 0 && t !== nextTier) {
        nextTier = t;
        rainHint = 2.5;
        aimX = clampAim(aimX);
        addPopup(C.W / 2, 130, '甘霖 · 下一滴是「' + T[t].name + '」', false, 0);
      }
    }
  }

  // 高潮时刻：无尽模式每累计 +500 分，场上最高档的可合成对自发相聚（防后期机械投放）
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
    addPopup(C.W / 2, 250, '海潮高潮！水滴自发相聚', true, 0);
    addShake(2, 0.2);
    audio.quest();
    doMerge(a, b2);
  }

  function pushNeighbors(x, y, R) {
    var bs = phys.bodies;
    for (var i = 0; i < bs.length; i++) {
      var b = bs[i];
      var dx = b.x - x, dy = b.y - y;
      var d = Math.sqrt(dx * dx + dy * dy);
      if (d > 0 && d < R) {
        var f = (1 - d / R) * 140;
        b.vx += dx / d * f; b.vy += dy / d * f;
      }
    }
  }

  // ---------- 特殊水滴 ----------
  function updateSpecials(dt) {
    var bs = phys.bodies, i;
    for (i = bs.length - 1; i >= 0; i--) {
      var b = bs[i];
      if (b.special) {
        b.specialT += dt;
        if (b.special === 'cloud') {
          if (b.specialT >= C.cloud.splitDelay) splitCloud(b);
        } else if (b.special === 'vortex') {
          updateVortex(b, dt, bs);
        } else if (b.special === 'ice') {
          updateIce(b, bs);
        }
      }
      // 冻结滴：速度清零 + 倒计时 + 解冻
      if (b.frozen > 0) {
        b.frozen -= dt;
        b.vx *= 0.1; b.vy = 0;
        if (b.frozen <= 0) thaw(b);
      }
    }
  }
  function updateVortex(b, dt, bs) {
    if (b.specialT >= C.vortex.delay && b.specialT < C.vortex.delay + C.vortex.life) {
      for (var j = 0; j < bs.length; j++) {
        var o = bs[j];
        if (o === b || o.special || o.frozen > 0 || o.iron) continue;
        var dx = b.x - o.x, dy = b.y - o.y;
        var d = Math.sqrt(dx * dx + dy * dy);
        if (d > 1 && d < C.vortex.pullR) {
          var f = C.vortex.pullF * (1 - d / C.vortex.pullR);
          o.vx += dx / d * f * dt * 10;
          o.vy += dy / d * f * dt * 10;
        }
      }
      if (Math.random() < 0.3) {
        var ang = Math.random() * Math.PI * 2;
        parts.push({ type: 'dot', x: b.x + Math.cos(ang) * b.r, y: b.y + Math.sin(ang) * b.r,
          vx: Math.cos(ang + 2) * 60, vy: Math.sin(ang + 2) * 60, r: 2, life: 0.3, max: 0.3, color: '#8FA8E8' });
      }
    }
    if (b.specialT >= C.vortex.delay + C.vortex.life) dissolveVortex(b);
  }
  function updateIce(b, bs) {
    var speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
    if ((b.specialT > 0.2 && speed < 70) || b.specialT > 1.6) freezeAround(b, bs);
  }
  function splitCloud(b) {
    phys.remove(b);
    burst(b.x, b.y, 0, false);
    var s1 = phys.create(b.x - 14, b.y - 6, 0, -90, -60);
    var s2 = phys.create(b.x + 14, b.y - 6, 0, 90, -60);
    s1.popT = s2.popT = 0.25;
    addPopup(b.x, b.y - 20, '雨云化雨', false, 0);
    audio.blip(520, 0.2, 'sine', 0.13, 1.8);
  }
  function dissolveVortex(b) {
    var gain = Math.round(C.vortex.score * scoreMult);
    score += gain;
    scoreBump = 0.25;
    addPopup(b.x, b.y - b.r - 10, '+' + gain, false, 0);
    burst(b.x, b.y, 5, false);
    parts.push({ type: 'ring', x: b.x, y: b.y, r: 16, life: 0.45, max: 0.45, color: '#8FA8E8' });
    phys.remove(b);
    audio.swirl();
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
  function tideY() {
    return FLOORY - tide.progress * (FLOORY - C.containerTop) * C.tide.waterMax;
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
        tide.timer = C.tide.duration;
        tide.banner = 2.4;
        audio.tide();
      }
    } else {
      tide.progress = Math.min(1, tide.progress + dt / 1.3);
      tide.timer -= dt;
      if (tide.timer <= 0) {
        tide.phase = 'idle';
        tide.timer = C.tide.cycleInterval - (C.tide.cycleInterval - C.ramp.tideIntervalMin) * endlessRamp(); // 渐进加压：潮汐更频
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
      b.tier += 1;
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
      var f = Math.min(1, subm);
      b.vy -= C.tide.buoyancy * f * dt;
      // 水的阻力
      var drag = Math.min(0.9, 2.2 * f * dt);
      b.vx *= (1 - drag);
      b.vy *= (1 - drag);
      // 水面轻微晃动推力（制造涌动感）
      b.vx += Math.sin(time * 2.2 + b.y * 0.02) * 14 * f * dt;
    }
  }

  // ---------- 技能 ----------
  // 符文充能：合成带符文的水滴 → 对应技能 +1（充满可用）
  function chargeRune(b, mx, my) {
    var k = b.rune;
    if (skillCharge[k] >= skillCost(k)) return;
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
    if (key === 'evap') {
      if (evapMode) { evapMode = false; return; }
      if (skillCharge.evap < skillCost('evap')) { flashSkill('evap', '符文 ' + skillCharge.evap + '/' + skillCost('evap')); return; }
      evapMode = true;
      rippleMode = false;
      flowMode = false; flowPick = null;
      return;
    }
    if (key === 'flow') {
      if (flowMode) { flowMode = false; flowPick = null; return; }
      if (skillCharge.flow < skillCost('flow')) { flashSkill('flow', '符文 ' + skillCharge.flow + '/' + skillCost('flow')); return; }
      flowMode = true;
      evapMode = false; rippleMode = false;
      return;
    }
    if (key === 'ripple' && rippleMode) { rippleMode = false; return; } // 再点按钮取消选位
    if (skillCharge[key] < skillCost(key)) {
      flashSkill(key, '符文 ' + skillCharge[key] + '/' + skillCost(key));
      return;
    }
    if (key === 'swap') {
      skillCharge.swap = 0;
      nextTier = rollTier();
      nextSpecial = rollSpecial();
      nextRune = nextSpecial ? null : rollRune();
      nextIron = rollIron();
      aimX = clampAim(aimX);
      addPopup(aimX, C.spawnY - 16, '换滴', false, 0);
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
    skillCharge.flow = 0;
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
    skillCharge.ripple = 0;
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
      var rr = b.r + 6;
      if (dx * dx + dy * dy <= rr * rr) return b;
    }
    return null;
  }
  function evaporate(b) {
    var gain;
    if (b.iron) {
      gain = C.iron.evaporateScore;
      burstIron(b.x, b.y);
    } else {
      gain = Math.max(1, Math.round(T[b.tier].score * scoreMult));
      burst(b.x, b.y, b.tier, false);
    }
    score += gain;
    scoreBump = 0.25;
    addPopup(b.x, b.y - b.r - 8, b.iron ? '礁石移除 +' + gain : '+' + gain, false, 0);
    phys.remove(b);
    skillCharge.evap = 0;
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
  // 预计算"有支撑"集合：贴底，或下方紧贴别的球。悬空/被顶起/弹跳中的球不算堆积越线。
  function computeSupported(bs) {
    var sup = [], i, j;
    for (i = 0; i < bs.length; i++) sup.push(false);
    for (i = 0; i < bs.length; i++) {
      var b = bs[i];
      if (b.y + b.r >= C.floorY - 2.5) { sup[i] = true; continue; }
      for (j = 0; j < bs.length; j++) {
        if (j === i) continue;
        var o = bs[j];
        if (o.y <= b.y) continue; // 只认位于下方的支撑
        var dx = o.x - b.x, dy = o.y - b.y;
        var minD = b.r + o.r + 2.5;
        if (dx * dx + dy * dy <= minD * minD) { sup[i] = true; break; }
      }
    }
    return sup;
  }
  function checkDanger(dt) {
    // 潮汐涨落期间豁免：浮力把水滴顶过线不是玩家堆太高，潮退后再重新累计
    if (tide.progress > 0.15) return;
    var bs = phys.bodies;
    var sup = computeSupported(bs);
    for (var i = 0; i < bs.length; i++) {
      var b = bs[i];
      if (b.frozen > 0) continue; // 冻结滴视为"封存"，不判负
      if (b.grace > 0) { b.dangerT = 0; continue; }
      var sp = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
      var above = (b.y - b.r) < C.dangerY;
      if (above && sup[i] && sp < C.dangerSpeed * 2) {
        // 越线 + 有支撑 + 基本静止（阈值放宽一倍：堆顶微颤不算"在动"）
        b.dangerT += dt;
        if (b.dangerT > C.dangerTime) { gameOver(); return; }
      } else if (above) {
        // 越线但悬空/被明显扰动：计时缓慢消退而非清零，避免永远攒不满
        b.dangerT = Math.max(0, b.dangerT - dt * 2);
      } else {
        b.dangerT = 0; // 回到线下，重置
      }
    }
  }
  function gameOver() {
    state = 'over';
    lifeScore += score - runCounted; runCounted = score; // 累计分只记增量（复活续局不重复计）
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
      bs.push({ x: Math.round(b.x), y: Math.round(b.y), r: Math.round(b.r), tier: b.tier, iron: !!b.iron, chest: !!b.chest });
    }
    var ui = { book: { cx: bookBtn.cx, cy: bookBtn.cy }, restart: { cx: restartBtn.cx, cy: restartBtn.cy }, skills: [] };
    for (i = 0; i < SKILL_BTNS.length; i++) ui.skills.push({ key: SKILL_BTNS[i].key, cx: SKILL_BTNS[i].cx, cy: SKILL_BTNS[i].cy });
    return {
      state: state, dangerY: C.dangerY, floorY: C.floorY, pileTop: top, n: phys.bodies.length,
      tide: tide.progress, tideRef: tide, level: level, score: score,
      chest: chest ? [Math.round(chest.b.x), Math.round(chest.b.y)] : null,
      chestLife: chest ? Math.round((chest.life - chest.t) * 10) / 10 : null,
      event: seaEvent.type, eventT: seaEvent.type ? Math.round(seaEvent.t * 10) / 10 : null,
      bodies: bs, ui: ui, stats: lifeStats, ach: achDone, dexSp: dexSpecial,
      modes: { evap: evapMode, ripple: rippleMode, flow: flowMode },
      stage: seaStage(), daily: { done: daily.done.slice(), streak: daily.streak }, best: best
    };
  };
  // 测试钩子（仅自动化测试用）：充能 / 成就 / 局面构造 / 加压进度
  MG.debug = {
    give: function (k, n) { if (k in skillCharge) skillCharge[k] = n; },
    achCheck: function () { checkAchievements(); },
    bump: bumpStat,
    forceEndless: function () { level = 2; },
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
    setLife: function (n) { lifeScore = n; runCounted = 0; },
    cm: cm
  };

  // 第 1 关通过：弹出提示进入无尽模式，不清场、不重置，继续当前局面
  function passLevel1() {
    var bonus = Math.ceil(levelTime) * C.level1.timeBonusPerSec;
    level = 2;
    levelBanner = 3;
    // 潮汐从本关起效：重新计时首次涨潮，给玩家缓冲
    tide.phase = 'idle'; tide.timer = C.tide.firstDelay; tide.progress = 0; tide.banner = 0;
    if (bonus > 0) {
      score += bonus;
      scoreBump = 0.4;
      addPopup(C.W / 2, 296, '时间奖励 +' + bonus, true, 0);
    }
    if (score > best) { best = score; saveNum('mg_best', best); }
    audio.quest();
  }

  // ---------- 深海宝箱（无尽模式探索要素） ----------
  function spawnChest() {
    discoverSpecial('chest');
    var b = createIron(C.W * (0.2 + Math.random() * 0.6), C.spawnY - 40);
    b.chest = true;
    b.r = 17; b.m = b.r * b.r * 6; // 比礁石轻，不会被砸得太凶
    chest = { b: b, t: 0, life: 14 }; // 14 秒内不点就沉走
    addPopup(b.x, C.containerTop + 66, '沉宝箱！点它开启', true, 0);
    audio.blip(392, 0.25, 'triangle', 0.14, 1.5);
  }
  function expireChest() {
    if (chest) {
      burstIron(chest.b.x, chest.b.y);
      phys.remove(chest.b);
      addPopup(C.W / 2, FLOORY - 60, '宝箱沉入深渊…', false, 0);
    }
    chest = null;
    chestTimer = 40 + Math.random() * 25;
  }
  function openChest() {
    var x = chest.b.x, y = chest.b.y;
    phys.remove(chest.b);
    chest = null;
    chestTimer = 45 + Math.random() * 30;
    var r = Math.random();
    var chestBonus = perkOn('chest5') ? 1.5 : 1; // 成就加成：寻宝猎人
    if (r < 0.4) {
      var gain = Math.round((60 + Math.random() * 90) * cm(scoreMult * chestBonus));
      score += gain; scoreBump = 0.4;
      if (score > best) { best = score; saveNum('mg_best', best); }
      addPopup(x, y - 30, '宝箱开启 +' + gain, true, 0);
    } else if (r < 0.75) {
      var keys = ['swap', 'ripple', 'evap', 'flow'];
      var k = keys[(Math.random() * keys.length) | 0];
      skillCharge[k] += perkOn('chest5') ? 3 : 2;
      addPopup(x, y - 30, '宝箱开启：' + runeName(k) + ' +2 充能', true, 0);
    } else {
      nextSpecial = 'rainbow'; nextIron = false; nextRune = null;
      addPopup(x, y - 30, '宝箱开启：下一滴是彩虹滴！', true, 0);
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
    if (level < 2) return;
    if (!chest) {
      chestTimer -= dt;
      if (chestTimer <= 0) spawnChest();
    } else {
      chest.t += dt;
      if (chest.t >= chest.life) expireChest();
    }
  }

  // ---------- 随机深海事件（无尽模式趣味变量） ----------
  function startSeaEvent() {
    var pool = ['surge', 'bless', 'storm'];
    seaEvent.type = pool[(Math.random() * pool.length) | 0];
    seaEvent.t = 6;
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
      seaEvent.y = C.containerTop + (FLOORY - C.containerTop) * 0.45;
    }
    audio.tide();
  }
  function applySeaEvent(dt) {
    var bs = phys.bodies, i, b;
    if (seaEvent.type === 'surge') {
      for (i = 0; i < bs.length; i++) {
        b = bs[i];
        if (b.iron) continue;
        if (b.y + b.r > FLOORY - 190) b.vy -= 1500 * dt;
      }
      if (Math.random() < 0.5) {
        parts.push({ type: 'dot', x: 30 + Math.random() * (C.W - 60), y: FLOORY, vx: 0,
          vy: -120 - Math.random() * 90, r: 1.5 + Math.random() * 2, life: 0.8, max: 0.8,
          color: 'rgba(220,244,255,0.8)' });
      }
    } else if (seaEvent.type === 'storm') {
      for (i = 0; i < bs.length; i++) {
        b = bs[i];
        if (b.iron) continue;
        var dx = seaEvent.x - b.x, dy = seaEvent.y - b.y, d = Math.sqrt(dx * dx + dy * dy);
        if (d > 8 && d < 300) {
          var f = 260 * (1 - d / 300);
          b.vx += ((dx / d) * f - (dy / d) * f * 0.7) * dt;
          b.vy += ((dy / d) * f + (dx / d) * f * 0.7) * dt;
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
  function updateSeaEvent(dt) {
    if (level < 2) return;
    if (tide.phase === 'active') return; // 保底：涨潮期间冻结事件节奏，避免双重混乱
    if (!seaEvent.type) {
      seaEvent.timer -= dt;
      if (seaEvent.timer <= 0) startSeaEvent();
    } else {
      seaEvent.t -= dt;
      applySeaEvent(dt);
      if (seaEvent.t <= 0) endSeaEvent();
    }
  }
  // 事件视觉（在游戏区坐标系内绘制）
  function drawEventVfx() {
    if (seaEvent.type === 'storm') {
      var r0 = 90 + Math.sin(time * 3) * 8;
      ctx.save();
      ctx.translate(seaEvent.x, seaEvent.y);
      for (var k = 0; k < 3; k++) {
        ctx.strokeStyle = 'rgba(96,112,215,' + (0.38 - k * 0.1) + ')';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        for (var a2 = 0; a2 < Math.PI * 3.2; a2 += 0.25) {
          var rr = 6 + (a2 / (Math.PI * 3.2)) * (r0 - 6) + k * 7;
          var aa2 = a2 + time * (2.4 - k * 0.5);
          var x2 = Math.cos(aa2) * rr, y2 = Math.sin(aa2) * rr * 0.55;
          if (a2 === 0) ctx.moveTo(x2, y2); else ctx.lineTo(x2, y2);
        }
        ctx.stroke();
      }
      ctx.restore();
    } else if (seaEvent.type === 'surge') {
      var g = ctx.createLinearGradient(0, FLOORY - 90, 0, FLOORY);
      g.addColorStop(0, 'rgba(160,230,255,0)');
      g.addColorStop(1, 'rgba(160,230,255,0.18)');
      ctx.fillStyle = g;
      ctx.fillRect(0, FLOORY - 90, C.W, 90);
    }
  }

  // ---------- 结算 / 复活 / 重开 ----------
  // 复活：不清空水滴——只冲走已越线的那几滴（否则它们悬在线上会立刻再次判负），其余局面原样保留
  function doRevive() {
    ads.show('复活', function () {
      reviveCount++;
      var bs = phys.bodies.slice(), i, removed = 0;
      for (i = 0; i < bs.length; i++) {
        var b = bs[i];
        if ((b.y - b.r) < C.dangerY) {
          burst(b.x, b.y, Math.max(0, b.tier), false);
          phys.remove(b);
          removed++;
        }
      }
      for (i = 0; i < phys.bodies.length; i++) {
        phys.bodies[i].dangerT = 0;
        phys.bodies[i].grace = 0.8; // 短宽限，稳定局面
      }
      if (removed > 0) addPopup(C.W / 2, C.dangerY - 24, '越线水滴被冲走 ×' + removed, false, 0);
      state = 'play';
    });
  }
  function doDouble() {
    ads.show('结算双倍', function () {
      doubled = true;
      score *= 2;
      if (score > best) { best = score; saveNum('mg_best', best); }
    });
  }
  function restart() {
    phys.bodies.length = 0;
    confirmOpen = false;
    score = 0; displayScore = 0; scoreBump = 0;
    combo = 0; comboTimer = 0; cooldown = 0; maxCombo = 0;
    reviveCount = 0; doubled = false;
    skillCharge = { swap: 0, ripple: 0, evap: 0, flow: 0 };
    seaCount = 0; scoreMult = 1;
    evapMode = false; rippleMode = false; flowMode = false; flowPick = null; rainHint = 0;
    tideGateHint = false;
    level = 1; levelTime = C.level1.time; failReason = ''; levelBanner = 0;
    levelElapsed = 0; runCounted = 0;
    nextTier = rollTier();
    nextSpecial = rollSpecial();
    nextRune = nextSpecial ? null : rollRune();
    nextIron = rollIron();
    aimX = C.W / 2;
    popups.length = 0; parts.length = 0; rippleQueue.length = 0;
    tide.phase = 'idle'; tide.timer = C.tide.firstDelay; tide.progress = 0; tide.banner = 0;
    endlessT = 0; rampStage = 0; climaxMark = 0;
    makeQuest(0);
    // 成就加成：深海富豪开局随机技能充能 +2
    if (perkOn('score2k')) {
      var pk = C.skills[(Math.random() * C.skills.length) | 0];
      skillCharge[pk.key] += 2;
      addPopup(C.W / 2, 280, '深海富豪：「' + pk.name + '」开局充能 +2', false, 0);
    }
    state = 'play';
  }

  function buildOverButtons() {
    overButtons = [];
    var bw = 240, bh = 48, gap = 14, x = (C.W - bw) / 2;
    // 可用区：统计文字之下 → 面板底部留白；按钮组在该区内垂直居中
    var areaTop = 150 + 176, areaBottom = 150 + 436 - 26;
    var n = (reviveCount < 2 ? 1 : 0) + (doubled ? 0 : 1) + 2; // 复活/双倍/分享/重开
    var groupH = n * bh + (n - 1) * gap;
    var y = areaTop + (areaBottom - areaTop - groupH) / 2;
    if (reviveCount < 2) {
      overButtons.push({ x: x, y: y, w: bw, h: bh, label: '复活继续（剩 ' + (2 - reviveCount) + ' 次）', action: doRevive, primary: true });
      y += bh + gap;
    }
    if (!doubled) {
      overButtons.push({ x: x, y: y, w: bw, h: bh, label: '结算双倍（看广告）', action: doDouble });
      y += bh + gap;
    }
    overButtons.push({ x: x, y: y, w: bw, h: bh, label: '分享战报', action: openShare });
    y += bh + gap;
    overButtons.push({ x: x, y: y, w: bw, h: bh, label: '重新开始', action: restart });
  }

  // ---------- 命中区域（圆形按钮） ----------
  var MUTE = { cx: C.W - 24, cy: 36, r: 13, pressT: 0 };
  var bookBtn = { cx: 46, cy: 688, r: 20, pressT: 0 };
  var restartBtn = { cx: C.W - 24, cy: 688, r: 16, pressT: 0 }; // 游戏内重开（带确认），右下角
  var SKILL_BTNS = [
    { key: 'swap',   cx: 116, cy: 688, r: 20, pressT: 0 },
    { key: 'ripple', cx: 178, cy: 688, r: 20, pressT: 0 },
    { key: 'evap',   cx: 240, cy: 688, r: 20, pressT: 0 },
    { key: 'flow',   cx: 302, cy: 688, r: 20, pressT: 0 }
  ];
  fit(); // 首次适配（按钮已定义，底部元素可同步贴底）
  var DEX_PANEL = { x: 20, y: 64, w: 380, h: 624 };
  var dexCloseBtn = { x: DEX_PANEL.x + DEX_PANEL.w - 60, y: DEX_PANEL.y + 10, w: 50, h: 26 };
  var tabDexBtn = { x: DEX_PANEL.x + 14, y: DEX_PANEL.y + 10, w: 66, h: 26 };
  var tabAchBtn = { x: DEX_PANEL.x + 86, y: DEX_PANEL.y + 10, w: 66, h: 26 };
  var tabDailyBtn = { x: DEX_PANEL.x + 158, y: DEX_PANEL.y + 10, w: 66, h: 26 };
  var tabRankBtn = { x: DEX_PANEL.x + 230, y: DEX_PANEL.y + 10, w: 66, h: 26 };
  var shareCopyBtn = { x: 0, y: 0, w: 150, h: 42 }; // 分享卡片：复制文案按钮（打开时定位）
  function spCellRect(i) {
    return { x: DEX_PANEL.x + 12 + i * 50, y: DEX_PANEL.y + 452, w: 48, h: 82 };
  }

  // 重开确认弹窗
  var confirmOpen = false;
  var confirmYes = { x: C.W / 2 - 106, y: 402, w: 94, h: 42 };
  var confirmNo = { x: C.W / 2 + 12, y: 402, w: 94, h: 42 };

  function inRect(p, r) {
    return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
  }
  function inCircle(p, c) {
    var dx = p.x - c.cx, dy = p.y - c.cy;
    return dx * dx + dy * dy <= (c.r + 6) * (c.r + 6);
  }
  function inMute(p) { var dx = p.x - MUTE.cx, dy = p.y - MUTE.cy; return dx * dx + dy * dy <= 18 * 18; } // 命中区略大于视觉（小按钮易点空）
  function toLocal(e) {
    var rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / view.s - BX,
      y: (e.clientY - rect.top) / view.s
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
    if (!nextIron && !nextSpecial && seaEvent.type === 'bless' && seaEvent.data && seaEvent.data.left > 0) {
      useTier = seaEvent.data.tier;
      seaEvent.data.left--;
    }
    if (nextIron && ironCount() < C.iron.maxActive) {
      createIron(clampAim(aimX), C.spawnY);
      addPopup(C.W / 2, 210, '礁石来袭！', true, 0); // 居中净空带，避开顶部 HUD
      addShake(2, 0.15);
    } else {
      nb = phys.create(clampAim(aimX), C.spawnY, useTier, 0, 0);
      if (nextSpecial) { nb.special = nextSpecial; nb.specialT = 0; discoverSpecial(nextSpecial); }
      else if (nextRune) {
        nb.rune = nextRune;
        discoverSpecial('rune');
        if (!runeHintShown) {
          runeHintShown = true;
          addPopup(C.W / 2, 244, '带符文的水滴：合成即可为技能充能', false, 0);
        }
      }
      unlockTier(nextTier);
    }
    cooldown = C.dropCooldown;
    audio.drop();
    dropCount++;
    if (dropCount >= TUT_STEPS.length && !tutDone) { tutDone = true; saveFlag('mg_tut', 1); }
    nextTier = rollTier();
    // 甘霖期间：虚影预览也显示馈赠档位，所见即所得
    if (!nextSpecial && !nextIron && seaEvent.type === 'bless' && seaEvent.data && seaEvent.data.left > 0) nextTier = seaEvent.data.tier;
    nextSpecial = rollSpecial();
    nextRune = nextSpecial ? null : rollRune();
    nextIron = rollIron();
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
    if (adOverlay) return;
    if (confirmOpen) {
      // 重开确认弹窗：点两个按钮之一，点面板外也视为取消
      if (inRect(p, confirmYes)) { confirmOpen = false; restart(); }
      else if (inRect(p, confirmNo)) confirmOpen = false;
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
    if (dexOpen) {
      if (inRect(p, dexCloseBtn) || !inRect(p, DEX_PANEL)) { dexOpen = false; return; }
      if (inRect(p, tabDexBtn)) { dexTab = 0; return; }
      if (inRect(p, tabAchBtn)) { dexTab = 1; return; }
      if (inRect(p, tabDailyBtn)) { dexTab = 2; return; }
      if (inRect(p, tabRankBtn)) { dexTab = 3; return; }
      if (dexTab === 0) {
        for (var si = 0; si < SP_DEFS.length; si++) {
          if (inRect(p, spCellRect(si))) { dexSelSp = si; audio.blip(620, 0.08, 'sine', 0.06, 0.3); return; }
        }
      }
      return;
    }
    if (inMute(p)) { MUTE.pressT = 0.16; audio.muted = !audio.muted; saveFlag('mg_mute', audio.muted); if (audio.muted) audio.bgm.stop(); else audio.bgm.start(); return; }
    if (inCircle(p, bookBtn)) { bookBtn.pressT = 0.16; dexOpen = true; return; }
    if (state === 'play') {
      if (inCircle(p, restartBtn)) { restartBtn.pressT = 0.16; confirmOpen = true; return; }
      for (var i = 0; i < SKILL_BTNS.length; i++) {
        if (inCircle(p, SKILL_BTNS[i])) { SKILL_BTNS[i].pressT = 0.16; useSkill(SKILL_BTNS[i].key); return; }
      }
      // 深海宝箱：点击开启（点击范围放宽 14px，手机上好点）
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
    if (state !== 'play' || adOverlay || dexOpen || evapMode || flowMode || confirmOpen) return;
    aimX = clampAim(p.x);
  });
  canvas.addEventListener('pointerup', function (e) {
    if (!aiming || state !== 'play' || adOverlay || dexOpen || evapMode || flowMode || rippleMode || confirmOpen) { aiming = false; return; }
    aiming = false;
    aimX = clampAim(toLocal(e).x);
    tryDrop();
  });
  canvas.addEventListener('pointercancel', function () { aiming = false; });

  // ---------- 更新 ----------
  function update(dt) {
    if (adOverlay) {
      adOverlay.t -= dt;
      if (adOverlay.t <= 0) { var cb = adOverlay.cb; adOverlay = null; if (cb) cb(); }
      updateFx(dt);
      return;
    }
    if (dexOpen) { updateFx(dt); return; }
    if (state !== 'play') { updateFx(dt); return; }

    time += dt;
    if (rainHint > 0) rainHint -= dt;
    if (levelBanner > 0) levelBanner -= dt;
    cooldown = Math.max(0, cooldown - dt);

    // 关卡计时：第 1 关限时得分，达标过关（不清场续无尽），超时判负；无尽模式计时改为累计进行时长
    if (level === 1) {
      levelTime -= dt;
      if (score >= C.level1.target) passLevel1();
      else if (levelTime <= 0) { levelTime = 0; failReason = 'timeout'; gameOver(); return; }
    }
    levelElapsed += dt; // 从第 1 关开局起连续累计，进入无尽模式后时间无缝接着走
    checkDexGates();
    // 海域演进：累计分跨过里程碑 → 世界换色 + 弹报
    var stg = seaStage();
    if (stageSeen < 0) stageSeen = stg;
    else if (stg > stageSeen) {
      stageSeen = stg;
      addPopup(C.W / 2, 285, '海域演进 · 潜入「' + C.seaStages[stg].name + '」', true, 0);
      parts.push({ type: 'ring', x: C.W / 2, y: 285, r: 40, life: 0.9, max: 0.9, color: '#7FD4FF' });
      audio.big();
    }
    achTick -= dt;
    if (achTick <= 0) { achTick = 1; checkAchievements(); }

    if (level === 2) updateTide(dt); // 潮汐仅无尽模式（第 1 关风平浪静，降低难度）
    phys.step(dt);
    applyBuoyancy(dt);
    updateSpecials(dt);

    var i, b;
    // 变形平滑：维护"变形矢量"（方向×幅度整体插值）——
    // 方向变化时矢量连续过渡（反转时幅度先收敛到圆再转向，角度噪声不可见）；
    // 速度低于死区直接回正圆，停稳后不再残留椭圆
    for (i = 0; i < phys.bodies.length; i++) {
      b = phys.bodies[i];
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
      // 运动拖尾采样
      if (!b.trail) b.trail = [];
      b.trail.push({ x: b.x, y: b.y });
      if (b.trail.length > 6) b.trail.shift();
    }

    // 无尽渐进加压计时 + 档位提示 + 高潮时刻
    if (level === 2) {
      endlessT += dt;
      var stg = Math.floor(endlessRamp() * 4);
      if (stg > rampStage) { rampStage = stg; addPopup(C.W / 2, 250, '海域渐深：潮汐更频 · 礁石更多', true, 0); }
      if (score - climaxMark >= C.climaxEvery) doClimax();
    }
    // 声音预警：危险→母线低通收紧；潮汐临近/进行→低频隆隆
    var dg = 0;
    for (i = 0; i < phys.bodies.length; i++) {
      b = phys.bodies[i];
      var ddist = (b.y - b.r) - C.dangerY;
      if (ddist < 90) dg = Math.max(dg, 1 - Math.max(0, ddist) / 90);
    }
    audio.bgm.setDanger(dg);
    audio.bgm.setTide(tide.progress, (level === 2 && tide.phase === 'idle' && tide.timer < C.tide.warnTime) ? 1 : 0);

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

  // ---------- 背景：深海渐变（全窗口宽） + 顶部柔光 + 波光 + 气泡 ----------
  function drawBackground() {
    // 深海渐变（铺满整个窗口，两侧即延伸海水）；色调随海域里程碑逐级加深
    var st = C.seaStages[seaStage()];
    var bg = ctx.createLinearGradient(0, 0, 0, VH);
    bg.addColorStop(0, st.bg[0]);
    bg.addColorStop(0.4, st.bg[1]);
    bg.addColorStop(0.75, st.bg[2]);
    bg.addColorStop(1, st.bg[3]);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, LW, VH);

    // 顶部阳光光晕
    var sun = ctx.createRadialGradient(LW * 0.5, -30, 20, LW * 0.5, -30, 300);
    sun.addColorStop(0, 'rgba(255,255,255,0.55)');
    sun.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sun;
    ctx.fillRect(0, 0, LW, 300);

    // 柔和顶部光感（径向光晕，无生硬斜向条带）
    var glowL = ctx.createRadialGradient(LW * 0.22, -50, 10, LW * 0.22, -50, 280);
    glowL.addColorStop(0, 'rgba(255,255,255,0.34)');
    glowL.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = glowL;
    ctx.fillRect(0, 0, LW, 300);
    var glowR = ctx.createRadialGradient(LW * 0.8, -50, 10, LW * 0.8, -50, 280);
    glowR.addColorStop(0, 'rgba(255,255,255,0.26)');
    glowR.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = glowR;
    ctx.fillRect(0, 0, LW, 300);

    // 两侧延伸海水柔和压暗（游戏区居中成为视觉焦点，主流 letterbox 质感）
    if (BX > 0) {
      var edge = BX + 26; // 仅轻微溢入游戏区，避免在缸体内形成可见的明暗台阶
      var shadeL = ctx.createLinearGradient(0, 0, edge, 0);
      shadeL.addColorStop(0, st.shade);
      shadeL.addColorStop(1, 'rgba(16,56,96,0)');
      ctx.fillStyle = shadeL;
      ctx.fillRect(0, 0, edge, VH);
      var shadeR = ctx.createLinearGradient(LW, 0, LW - edge, 0);
      shadeR.addColorStop(0, st.shade);
      shadeR.addColorStop(1, 'rgba(16,56,96,0)');
      ctx.fillStyle = shadeR;
      ctx.fillRect(LW - edge, 0, edge, VH);
    }

    // 顶部斜射光柱（缓慢摇曳 + 呼吸明暗，营造水下丁达尔效应）
    for (var bi = 0; bi < 3; bi++) {
      var bx0 = LW * (0.16 + bi * 0.3) + Math.sin(time * 0.13 + bi * 2.1) * LW * 0.04;
      var tilt = Math.sin(time * 0.09 + bi * 1.4) * 0.10 + (bi - 1) * 0.06;
      var bw = 46 + bi * 24;
      var rayA = 0.05 + 0.035 * (0.5 + 0.5 * Math.sin(time * 0.23 + bi * 2.6));
      var ray = ctx.createLinearGradient(0, 0, 0, VH * 0.72);
      ray.addColorStop(0, 'rgba(255,255,255,' + rayA + ')');
      ray.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.save();
      ctx.translate(bx0, -10);
      ctx.rotate(tilt);
      ctx.fillStyle = ray;
      ctx.fillRect(-bw / 2, 0, bw, VH * 0.82);
      ctx.restore();
    }

    // 远处缓慢漂移的水波纹
    ctx.strokeStyle = 'rgba(255,255,255,0.10)';
    ctx.lineWidth = 1.5;
    for (var ri = 0; ri < 3; ri++) {
      var rx = ((time * (10 + ri * 6) + ri * 240) % (LW + 300)) - 150;
      var ry = 210 + ri * 130;
      ctx.beginPath();
      ctx.ellipse(rx, ry, 90 + ri * 24, 12 + ri * 4, 0, 0, Math.PI * 2);
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
      // 触手（5 条，长短错落、摆动相位错开）
      ctx.strokeStyle = 'rgba(' + jl.tint + ',0.55)';
      ctx.lineWidth = 1.6;
      ctx.lineCap = 'round';
      for (tt = -2; tt <= 2; tt++) {
        var tx0 = tt * jl.s * 0.28;
        var tl = jl.s * (1.8 - Math.abs(tt) * 0.2);
        ctx.beginPath();
        ctx.moveTo(tx0, jl.s * 0.1);
        ctx.quadraticCurveTo(tx0 + Math.sin(time * 2 + jl.ph + tt * 1.3) * 6, tl * 0.55,
                             tx0 + Math.sin(time * 1.3 + tt * 1.7) * 9, tl);
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
    for (i = 0; i < fishes.length; i++) {
      var f = fishes[i];
      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.scale(f.dir, 1);
      var twk = Math.sin(f.tail) * f.s * 0.18;
      var bodyG = ctx.createLinearGradient(0, -f.s * 0.45, 0, f.s * 0.45);
      bodyG.addColorStop(0, 'rgba(42,108,160,0.28)');
      bodyG.addColorStop(1, 'rgba(18,66,110,0.16)');
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

  // 一条侧边栏的海草/礁石剪影（x0..x1 为侧边栏范围，seed 区分左右两侧形态）
  function drawFlora(x0, x1, seed) {
    var w = x1 - x0;
    if (w < 24) return; // 手机模式侧边栏宽 0，自动跳过
    var baseY = VH - 3;
    var n = Math.max(3, Math.min(9, Math.floor(w / 26)));
    var k;
    ctx.lineCap = 'round';
    for (k = 0; k < n; k++) {
      var px = x0 + (k + 0.5) * w / n + Math.sin(seed + k * 7.3) * w * 0.12;
      var h = 36 + ((k * 37 + seed * 13) % 60) + (VH - 720) * 0.12;
      h = Math.min(h, VH * 0.28);
      var sway = Math.sin(time * (0.7 + (k % 3) * 0.25) + seed + k) * (6 + h * 0.08);
      ctx.strokeStyle = 'rgba(16,62,102,' + (0.30 + (k % 2) * 0.10) + ')';
      ctx.lineWidth = 2.5 + (k % 3);
      ctx.beginPath();
      ctx.moveTo(px, baseY);
      var cx = px, cy = baseY;
      for (var s2 = 1; s2 <= 3; s2++) {
        var ny = baseY - (h / 3) * s2;
        var nx = px + sway * (s2 / 3) * (s2 / 3);
        ctx.quadraticCurveTo(cx + sway * 0.4, (cy + ny) / 2, nx, ny);
        cx = nx; cy = ny;
      }
      ctx.stroke();
    }
    // 底部礁石
    ctx.fillStyle = 'rgba(12,52,88,0.35)';
    var rn = Math.max(1, Math.floor(w / 70));
    for (k = 0; k < rn; k++) {
      var rx = x0 + (k + 0.5) * w / rn + Math.sin(seed * 3 + k * 5.1) * w * 0.1;
      var rr = 10 + ((k * 53 + seed * 7) % 14);
      ctx.beginPath(); ctx.ellipse(rx, baseY + 4, rr, rr * 0.45, 0, 0, Math.PI * 2); ctx.fill();
    }
  }

  // ---------- 水滴渲染（变形 / 拖尾 / 冻结 / 弹跳） ----------
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

    // 落地软阴影（绝对坐标，先画）
    var floorDist = FLOORY - (b.y + b.r);
    if (floorDist < 30 && floorDist > -b.r) {
      var sa = 0.18 * (1 - Math.max(0, floorDist) / 30);
      ctx.fillStyle = 'rgba(10,40,70,' + sa + ')';
      ctx.beginPath();
      ctx.ellipse(b.x, FLOORY - 2, b.r * 0.85, b.r * 0.2, 0, 0, Math.PI * 2);
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
    ctx.translate(b.x, b.y);
    var k = b.defK || 0;
    if (k > 0.012) {
      ctx.rotate(Math.atan2(b.defY || 0, b.defX || 1));
      ctx.scale(1 + k, 1 - k);
    }

    // 主体径向渐变（相对坐标）
    var g = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.12, 0, 0, r * 1.05);
    g.addColorStop(0, '#FFFFFF');
    g.addColorStop(0.30, t.color);
    g.addColorStop(1, t.dark);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();

    // 底部内反光：径向渐变光晕（无端点痕迹，替代生硬的弧线段）
    ctx.save();
    ctx.beginPath(); ctx.arc(0, 0, r * 0.96, 0, Math.PI * 2); ctx.clip();
    ctx.globalAlpha = alpha * 0.5;
    var bg = ctx.createRadialGradient(0, r * 1.55, r * 0.1, 0, r * 1.55, r * 1.35);
    bg.addColorStop(0, 'rgba(223,244,255,0.55)');
    bg.addColorStop(1, 'rgba(223,244,255,0)');
    ctx.fillStyle = bg;
    ctx.fillRect(-r, 0, r * 2, r);
    ctx.restore();

    // 边缘高光：两端渐隐的柔光弧
    ctx.save();
    ctx.globalAlpha = alpha * 0.6;
    var lg = ctx.createLinearGradient(-r * 0.94, -r * 0.09, r * 0.21, -r * 0.92);
    lg.addColorStop(0, 'rgba(255,255,255,0)');
    lg.addColorStop(0.5, 'rgba(255,255,255,0.8)');
    lg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.strokeStyle = lg;
    ctx.lineWidth = Math.max(1.2, r * 0.055);
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(0, 0, r * 0.94, Math.PI * 1.03, Math.PI * 1.57); ctx.stroke();
    ctx.restore();
    ctx.globalAlpha = alpha;

    // 双高光
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.beginPath();
    ctx.ellipse(-r * 0.35, -r * 0.45, r * 0.24, r * 0.13, -0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.beginPath(); ctx.arc(r * 0.3, -r * 0.55, r * 0.07, 0, Math.PI * 2); ctx.fill();

    if (b.special === 'vortex') drawVortexMark(r);
    else if (b.special === 'cloud') drawCloudMark(r);
    else if (b.special === 'rainbow') drawRainbowMark(r);
    else if (b.tier <= 4) drawFace(r);
    else drawWaves(r);
    // 符文徽记（右上角小圆牌）
    if (b.rune) drawRuneMark(r, b.rune);

    // 冻结外壳
    if (b.frozen > 0) drawFrozenShell(b, r);

    ctx.restore();
  }

  // 礁石（内部名 iron）：岩石球——裂纹 + 苔点（障碍物）
  function drawIronBall(b, alpha) {
    var r = b.r;
    // 落地软阴影
    var floorDist = FLOORY - (b.y + b.r);
    if (floorDist < 30 && floorDist > -b.r) {
      var sa = 0.22 * (1 - Math.max(0, floorDist) / 30);
      ctx.fillStyle = 'rgba(10,20,30,' + sa + ')';
      ctx.beginPath();
      ctx.ellipse(b.x, FLOORY - 2, b.r * 0.9, b.r * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(b.x, b.y);
    // 岩石主体
    var g = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r * 1.05);
    g.addColorStop(0, '#D2CCBC');
    g.addColorStop(0.45, '#9A9282');
    g.addColorStop(1, '#645C4D');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    // 深色外圈
    ctx.strokeStyle = '#4A4437';
    ctx.lineWidth = Math.max(1.5, r * 0.07);
    ctx.beginPath(); ctx.arc(0, 0, r * 0.96, 0, Math.PI * 2); ctx.stroke();
    // 顶部高光
    ctx.globalAlpha = alpha * 0.4;
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = r * 0.1;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(0, 0, r * 0.7, Math.PI * 1.15, Math.PI * 1.5); ctx.stroke();
    ctx.lineCap = 'butt';
    ctx.globalAlpha = alpha;
    // 裂纹
    ctx.strokeStyle = 'rgba(62,54,40,0.5)';
    ctx.lineWidth = Math.max(1, r * 0.05);
    ctx.beginPath();
    ctx.moveTo(-r * 0.55, -r * 0.1);
    ctx.lineTo(-r * 0.2, r * 0.05);
    ctx.lineTo(-r * 0.32, r * 0.35);
    ctx.moveTo(r * 0.15, -r * 0.52);
    ctx.lineTo(r * 0.3, -r * 0.22);
    ctx.lineTo(r * 0.55, -r * 0.1);
    ctx.stroke();
    // 苔点
    ctx.fillStyle = 'rgba(110,135,80,0.5)';
    var mos = [[-0.45, 0.35], [0.5, 0.25], [0.05, -0.62], [-0.2, 0.55], [0.35, -0.4]];
    for (var mi = 0; mi < mos.length; mi++) {
      ctx.beginPath();
      ctx.arc(mos[mi][0] * r, mos[mi][1] * r, r * 0.06, 0, Math.PI * 2);
      ctx.fill();
    }
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
    ctx.beginPath(); ctx.arc(0, 0, r * 0.94, 0, Math.PI * 2); ctx.clip();
    // 底部深海内阴影（增强体积感）
    var sg = ctx.createRadialGradient(0, r * 0.6, r * 0.12, 0, r * 0.6, r * 0.95);
    sg.addColorStop(0, 'rgba(0,18,46,0.30)');
    sg.addColorStop(1, 'rgba(0,18,46,0)');
    ctx.fillStyle = sg;
    ctx.fillRect(-r, -r, r * 2, r * 2);
    // 左上柔光带
    var hg = ctx.createLinearGradient(-r * 0.7, -r * 0.8, r * 0.1, 0);
    hg.addColorStop(0, 'rgba(255,255,255,0.22)');
    hg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = hg;
    ctx.beginPath();
    ctx.ellipse(-r * 0.28, -r * 0.42, r * 0.52, r * 0.3, -0.5, 0, Math.PI * 2);
    ctx.fill();
    // 双层海面波浪（圆头端点，缓慢起伏）
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (var row = 0; row < 2; row++) {
      ctx.strokeStyle = row === 0 ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.26)';
      ctx.lineWidth = Math.max(2, r * (row === 0 ? 0.05 : 0.035));
      var baseY = (row === 0 ? -0.16 : 0.04) * r + Math.sin(time * 1.7 + row * 1.3) * r * 0.025;
      ctx.beginPath();
      for (var x = -r * 0.62; x <= r * 0.62; x += 3) {
        var y = baseY + Math.sin(x * 0.105 + time * 2.1 + row * 1.9) * r * 0.065;
        if (x <= -r * 0.62 + 0.01) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    // 上浮小气泡（带高光点）
    for (var bi = 0; bi < 3; bi++) {
      var ba = time * (0.45 + bi * 0.19) + bi * 2.3;
      var bx = Math.sin(ba * 0.9 + bi) * r * 0.28 + (bi - 1) * r * 0.2;
      var by = r * 0.62 - ((ba * r * 0.16) % (r * 1.1));
      var br = r * (0.04 + 0.016 * (bi % 3));
      ctx.fillStyle = 'rgba(255,255,255,0.30)';
      ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.beginPath(); ctx.arc(bx - br * 0.35, by - br * 0.35, br * 0.32, 0, Math.PI * 2); ctx.fill();
    }
    ctx.lineCap = 'butt';
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

  // 深海宝箱：木箱 + 金边 + 呼吸光晕 + 剩余时间环（超时会沉走）
  function drawChest(b, alpha) {
    var bob = Math.sin(time * 2.2) * 1.5;
    ctx.save();
    ctx.globalAlpha = alpha;
    // 落地软阴影
    var fd = FLOORY - (b.y + b.r);
    if (fd < 30 && fd > -b.r) {
      ctx.fillStyle = 'rgba(10,20,30,' + (0.2 * (1 - Math.max(0, fd) / 30)) + ')';
      ctx.beginPath(); ctx.ellipse(b.x, FLOORY - 2, b.r * 0.9, b.r * 0.2, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.translate(b.x, b.y);
    // 呼吸光晕（吸引点击）
    var glow = 0.25 + 0.15 * Math.sin(time * 3);
    var gg = ctx.createRadialGradient(0, bob, 4, 0, bob, b.r + 14);
    gg.addColorStop(0, 'rgba(255,208,96,' + glow + ')');
    gg.addColorStop(1, 'rgba(255,208,96,0)');
    ctx.fillStyle = gg;
    ctx.beginPath(); ctx.arc(0, bob, b.r + 14, 0, Math.PI * 2); ctx.fill();
    ctx.translate(0, bob);
    var w = b.r * 1.5, h = b.r * 1.2;
    ctx.fillStyle = '#8A5A2B';
    roundRect(-w / 2, -h * 0.15, w, h * 0.65, 3); ctx.fill();
    ctx.fillStyle = '#A96F35';
    ctx.beginPath();
    ctx.moveTo(-w / 2, -h * 0.15);
    ctx.quadraticCurveTo(0, -h * 0.85, w / 2, -h * 0.15);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#F2C14E'; ctx.lineWidth = 1.6;
    roundRect(-w / 2, -h * 0.15, w, h * 0.65, 3); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-w / 2, -h * 0.15); ctx.quadraticCurveTo(0, -h * 0.85, w / 2, -h * 0.15); ctx.stroke();
    ctx.fillStyle = '#F2C14E';
    roundRect(-3.5, -h * 0.22, 7, 8, 2); ctx.fill();
    // 剩余时间环（白色，随时间缩短）
    var frac = Math.max(0, 1 - chest.t / chest.life);
    ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, b.r + 7, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
  // 彩虹滴徽记：旋转的五彩弧 + 游动星光
  function drawRainbowMark(r) {
    var hue0 = (time * 120) % 360;
    ctx.save();
    ctx.lineWidth = Math.max(2, r * 0.16);
    ctx.lineCap = 'round';
    for (var k = 0; k < 5; k++) {
      ctx.strokeStyle = 'hsla(' + ((hue0 + k * 72) % 360) + ',85%,62%,0.9)';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.72, time * 2 + k * Math.PI * 0.4, time * 2 + k * Math.PI * 0.4 + Math.PI * 0.28);
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
  function drawVortexMark(r) {
    ctx.save();
    ctx.rotate(time * 4);
    ctx.strokeStyle = 'rgba(94,110,208,0.85)';
    ctx.lineWidth = Math.max(2, r * 0.09);
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (var a = 0; a < Math.PI * 3.2; a += 0.25) {
      var rr = r * 0.62 * (a / (Math.PI * 3.2));
      var x = Math.cos(a) * rr, y = Math.sin(a) * rr;
      if (a === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
    ctx.lineCap = 'butt';
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
  function drawGhost(x, y, tier, alpha) {
    var r = nextIron ? C.iron.r : T[tier].r;
    if (nextIron) {
      drawIronBall({ x: x, y: y, r: r, vx: 0, vy: 0 }, alpha);
    } else {
      drawBall({ x: x, y: y, r: r, tier: tier, vx: 0, vy: 0, special: nextSpecial, rune: nextRune }, alpha);
    }
    ctx.save();
    ctx.setLineDash([4, 6]);
    ctx.strokeStyle = 'rgba(80,140,180,0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y + r);
    ctx.lineTo(x, FLOORY);
    ctx.stroke();
    ctx.restore();
  }

  // 特殊滴/符文/礁石名称标签：紧贴虚影球顶（在 render 末尾绘制，保证不被 HUD 盖住）
  function drawGhostLabel() {
    if (state !== 'play' || adOverlay || evapMode || rippleMode || confirmOpen) return;
    var r = nextIron ? C.iron.r : T[nextTier].r;
    var label = nextIron ? '礁石' : (nextSpecial ? specialLabel(nextSpecial) : (nextRune ? runeName(nextRune) + '符文' : null));
    if (!label) return;
    var alpha = cooldown > 0 ? 0.35 : 0.9;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.textAlign = 'center';
    ctx.font = 'bold 11px system-ui, sans-serif';
    var tw = ctx.measureText(label).width + 12;
    var ly = C.spawnY - r - 6; // 紧贴球顶，明确归属
    ctx.fillStyle = 'rgba(255,255,255,0.88)';
    roundRect(aimX - tw / 2, ly - 12, tw, 17, 8); ctx.fill();
    ctx.fillStyle = nextIron ? '#6B6353' : (nextSpecial ? specialColor(nextSpecial) : runeColor(nextRune));
    ctx.fillText(label, aimX, ly);
    ctx.restore();
  }

  // ---------- 容器：玻璃质感 + 底部焦散 ----------
  function drawContainer() {
    var floorY = FLOORY, FH = 12;
    // 海底基色：从床面到画布底一条连续渐变（泡沫白 → 青 → 深海青），先铺满
    var bed = ctx.createLinearGradient(0, floorY, 0, VH);
    bed.addColorStop(0, 'rgba(216,236,232,0.95)');
    bed.addColorStop(0.3, 'rgba(170,208,204,0.95)');
    bed.addColorStop(0.62, 'rgba(112,158,174,0.95)');
    bed.addColorStop(1, 'rgba(56,102,130,0.95)');
    ctx.fillStyle = bed;
    ctx.fillRect(0, floorY + 4, C.W, VH - floorY - 4);
    // 床面：圆角横条（半透明玻璃质感，透出海底基色，不再有硬边界）
    var fg = ctx.createLinearGradient(0, floorY, 0, floorY + FH + 6);
    fg.addColorStop(0, 'rgba(255,255,255,0.6)');
    fg.addColorStop(0.55, 'rgba(228,244,240,0.4)');
    fg.addColorStop(1, 'rgba(200,230,226,0.22)');
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
    var dep = ctx.createLinearGradient(0, floorY - 30, 0, floorY);
    dep.addColorStop(0, 'rgba(20,70,120,0)');
    dep.addColorStop(1, 'rgba(20,70,120,0.14)');
    ctx.fillStyle = dep;
    ctx.fillRect(0, floorY - 30, C.W, 30);

    // 海底装饰（基色已由上面的 bed 连续渐变铺满，这里只画沙丘等点缀）
    var sy0 = floorY + FH + 6;
    // 沙丘
    ctx.fillStyle = 'rgba(238,246,240,0.7)';
    ctx.beginPath(); ctx.ellipse(C.W * 0.2, sy0 + 12, 95, 13, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(C.W * 0.74, sy0 + 14, 115, 15, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(228,240,234,0.55)';
    ctx.beginPath(); ctx.ellipse(C.W * 0.47, sy0 + 18, 85, 11, 0, 0, Math.PI * 2); ctx.fill();
    // 卵石（y 相对底部：VH-720 偏移）
    ctx.fillStyle = 'rgba(110,150,168,0.4)';
    var yoff = VH - C.H;
    var peb = [[24, 688, 3], [66, 700, 2], [112, 686, 2.5], [172, 702, 2], [246, 690, 2.5], [306, 700, 2], [352, 686, 2.5], [404, 696, 2.2]];
    for (var pi = 0; pi < peb.length; pi++) {
      ctx.beginPath(); ctx.arc(peb[pi][0], peb[pi][1] + yoff, peb[pi][2], 0, Math.PI * 2); ctx.fill();
    }
    drawStarfish(88, 700 + yoff, 9);
    drawShell(330, 702 + yoff, 9);
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
    var g = ctx.createLinearGradient(0, wy - tideAmp(), 0, FLOORY);
    g.addColorStop(0, 'rgba(90,180,235,0.28)');
    g.addColorStop(1, 'rgba(30,110,190,0.5)');
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
    // 半透明覆盖（浸没部分染色，同一条波形）
    ctx.fillStyle = 'rgba(80,170,230,0.15)';
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

  function drawDangerLine() {
    // 危险度：水堆顶部越接近警戒线越醒目（远离时安静、贴近时脉动）
    var glow = 0, i;
    for (i = 0; i < phys.bodies.length; i++) {
      var d = (phys.bodies[i].y - phys.bodies[i].r) - C.dangerY;
      if (d < 90) glow = Math.max(glow, 1 - Math.max(0, d) / 90);
    }
    var pulse = 0.65 + 0.35 * Math.sin(time * 4);
    var a = 0.22 + glow * 0.6 * pulse;
    // 警戒范围：与深海背景融合的暗色渐晕（危险度越高才越透出暖色警示）
    var dz = ctx.createLinearGradient(0, C.dangerY, 0, C.dangerY + 42);
    dz.addColorStop(0, 'rgba(38,78,108,' + (0.12 + glow * 0.06) + ')');
    dz.addColorStop(1, 'rgba(38,78,108,0)');
    ctx.fillStyle = dz;
    ctx.fillRect(0, C.dangerY, C.W, 42);
    if (glow > 0.05) {
      var wz = ctx.createLinearGradient(0, C.dangerY, 0, C.dangerY + 42);
      wz.addColorStop(0, 'rgba(224,120,80,' + (glow * 0.14 * pulse) + ')');
      wz.addColorStop(1, 'rgba(224,120,80,0)');
      ctx.fillStyle = wz;
      ctx.fillRect(0, C.dangerY, C.W, 42);
    }
    // 警戒线：两端渐隐的光带（平静时青蓝，越危险越转红脉动）
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
    // 叠加一层圆头流动刻度（白色小段向右缓慢滑动）
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,' + (0.28 + glow * 0.45) + ')';
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
    // 危险时两端亮起三角警示
    if (glow > 0.3) {
      var ta = 0.45 + glow * 0.55;
      ctx.fillStyle = 'rgba(226,75,74,' + ta + ')';
      ctx.beginPath();
      ctx.moveTo(4, C.dangerY - 11); ctx.lineTo(14, C.dangerY - 11); ctx.lineTo(9, C.dangerY - 3);
      ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(C.W - 14, C.dangerY - 11); ctx.lineTo(C.W - 4, C.dangerY - 11); ctx.lineTo(C.W - 9, C.dangerY - 3);
      ctx.closePath(); ctx.fill();
    }
  }

  // ---------- 顶部 HUD（无背景板，悬浮文字 + 描边保证可读） ----------
  function drawHUD() {
    // 计分（左上角悬浮）
    ctx.textAlign = 'left';
    var bump = scoreBump > 0 ? 1 + Math.sin((0.35 - scoreBump) / 0.35 * Math.PI) * 0.12 : 1;
    ctx.lineJoin = 'round';
    ctx.save();
    ctx.translate(16, 38);
    ctx.scale(bump, bump);
    ctx.font = 'bold 27px system-ui, sans-serif';
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    var txt = String(Math.round(displayScore));
    ctx.strokeText(txt, 0, 0);
    ctx.fillStyle = '#12517E';
    ctx.fillText(txt, 0, 0);
    ctx.restore();
    // 最佳/海域：紧跟在大分数右侧（同一行，不与下方任务条交叠）
    ctx.font = '11px system-ui, sans-serif';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    var sub = '最佳 ' + best + (seaCount > 0 ? ' · 海域 ×' + seaCount : '');
    var scoreTxt = String(Math.round(displayScore));
    ctx.font = 'bold 27px system-ui, sans-serif';
    var sw = ctx.measureText(scoreTxt).width;
    ctx.font = '11px system-ui, sans-serif';
    var sx = 16 + sw + 10;
    ctx.strokeText(sub, sx, 38);
    ctx.fillStyle = '#3E6E90';
    ctx.fillText(sub, sx, 38);

    // 右上角：下一滴预览 + 静音按钮（主流布局）
    ctx.textAlign = 'center';
    ctx.font = 'bold 10px system-ui, sans-serif';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    // 甘霖激活时标签替换为绿色脉动"甘霖"，避免悬浮文本遮挡出生区水滴
    if (rainHint > 0) {
      ctx.strokeText('甘霖 · 下一滴', C.W - 76, 18);
      ctx.fillStyle = 'rgba(30,122,111,' + (0.55 + 0.45 * Math.sin(time * 8)) + ')';
      ctx.fillText('甘霖 · 下一滴', C.W - 76, 18);
    } else {
      ctx.strokeText('下一个', C.W - 76, 18);
      ctx.fillStyle = '#3E6E90';
      ctx.fillText('下一个', C.W - 76, 18);
    }
    if (nextIron) {
      drawIronBall({ x: C.W - 76, y: 38, r: 14, vx: 0, vy: 0 }, 0.95);
    } else {
      drawBall({ x: C.W - 76, y: 38, r: 15, tier: nextTier, vx: 0, vy: 0, special: nextSpecial, rune: nextRune }, 0.95);
    }

    // 静音按钮（右上角，小号）
    drawMiniBtn(MUTE);
    ctx.save();
    ctx.translate(MUTE.cx, MUTE.cy);
    ctx.scale(0.8, 0.8);
    var mx = 0, my = 0;
    ctx.fillStyle = '#3E6E90';
    ctx.beginPath();
    ctx.moveTo(mx - 7, my - 3); ctx.lineTo(mx - 3, my - 3); ctx.lineTo(mx + 1, my - 7);
    ctx.lineTo(mx + 1, my + 7); ctx.lineTo(mx - 3, my + 3); ctx.lineTo(mx - 7, my + 3);
    ctx.closePath(); ctx.fill();
    if (audio.muted) {
      ctx.strokeStyle = '#C0504D'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(mx + 4, my - 5); ctx.lineTo(mx + 11, my + 5); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(mx + 11, my - 5); ctx.lineTo(mx + 4, my + 5); ctx.stroke();
    } else {
      ctx.strokeStyle = '#3E6E90'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(mx + 3, my, 5, -0.9, 0.9); ctx.stroke();
      ctx.beginPath(); ctx.arc(mx + 3, my, 9, -0.9, 0.9); ctx.stroke();
    }
    ctx.restore();
  }
  function drawMiniBtn(c) {
    var s = c.pressT > 0 ? 1 - 0.1 * (c.pressT / 0.16) : 1;
    ctx.save();
    ctx.translate(c.cx, c.cy);
    ctx.scale(s, s);
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath(); ctx.arc(0, 0, c.r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(90,140,180,0.5)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(0, 0, c.r, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
  // 潮汐信息胶囊（独立放在右上"下一个"预览正下方，不与任务条同排）
  function drawTidePill() {
    if (level === 1) return; // 第 1 关无潮汐，胶囊隐藏
    var tx = C.W - 122, tw = 92, ty = 62, th = 20; // 中心与预览（W-76）对齐
    var active = tide.phase === 'active';
    var warn = !active && tide.timer <= C.tide.warnTime;
    var pulse = 0.5 + 0.5 * Math.sin(time * 6);
    ctx.fillStyle = active ? 'rgba(40,130,200,0.25)' : 'rgba(255,255,255,0.6)';
    roundRect(tx, ty, tw, th, 10); ctx.fill();
    ctx.font = 'bold 12px system-ui, sans-serif';
    if (active) {
      ctx.fillStyle = 'rgba(25,105,185,' + (0.75 + pulse * 0.25) + ')';
      ctx.fillText('涨潮 ' + Math.ceil(tide.timer) + 's', tx + tw / 2, ty + 14);
    } else {
      ctx.fillStyle = warn ? 'rgba(200,90,40,' + (0.7 + pulse * 0.3) + ')' : '#4A7FA0';
      ctx.fillText('潮汐 ' + Math.ceil(tide.timer) + 's', tx + tw / 2, ty + 14);
    }
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
    ctx.translate(C.W / 2, 250);
    ctx.scale(scale, scale);
    ctx.font = 'bold 34px system-ui, sans-serif';
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 6;
    ctx.strokeText('涨 潮', 0, 0);
    var g = ctx.createLinearGradient(0, -26, 0, 8);
    g.addColorStop(0, '#3FA9E0');
    g.addColorStop(1, '#155A8A');
    ctx.fillStyle = g;
    ctx.fillText('涨 潮', 0, 0);
    ctx.restore();
  }

  // ---------- 顶部中央计时：第 1 关显示倒计时+目标进度，无尽模式显示累计进行时长 ----------
  function drawLevelHud() {
    if (level === 2) {
      // 无尽模式：计时继续（向上累计），提示当前难度阶段
      var em = Math.floor(levelElapsed / 60), es = Math.floor(levelElapsed % 60);
      ctx.save();
      ctx.textAlign = 'center';
      ctx.lineJoin = 'round';
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      var etxt = '无尽模式 · 已进行 ' + em + ':' + (es < 10 ? '0' + es : es);
      ctx.strokeText(etxt, C.W / 2, 20);
      ctx.fillStyle = '#2E7DA8';
      ctx.fillText(etxt, C.W / 2, 20);
      ctx.restore();
      return;
    }
    if (level !== 1) return;
    var cx = C.W / 2;
    var m = Math.floor(Math.max(0, levelTime) / 60), s = Math.floor(Math.max(0, levelTime) % 60);
    var low = levelTime <= 15;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.lineJoin = 'round';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    var txt = '目标 ' + C.level1.target + ' · 剩余 ' + m + ':' + (s < 10 ? '0' + s : s);
    ctx.globalAlpha = low ? 0.6 + 0.4 * Math.sin(time * 8) : 1;
    ctx.strokeText(txt, cx, 20);
    ctx.fillStyle = low ? '#C0504D' : '#12517E';
    ctx.fillText(txt, cx, 20);
    ctx.globalAlpha = 1;
    // 目标进度条
    var bw = 150, bx = cx - bw / 2, by = 26;
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    roundRect(bx, by, bw, 7, 3.5); ctx.fill();
    var prog = Math.min(1, score / C.level1.target);
    if (prog > 0) {
      ctx.fillStyle = '#F5A623';
      roundRect(bx, by, Math.max(6, bw * prog), 7, 3.5); ctx.fill();
    }
    ctx.restore();
  }
  // 过关横幅
  function drawLevelBanner() {
    if (levelBanner <= 0) return;
    var t = levelBanner / 3; // 1 → 0
    var a = t < 0.15 ? t / 0.15 : (t > 0.85 ? (1 - t) / 0.15 : 1);
    var scale = 1 + (1 - t) * 0.15;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.textAlign = 'center';
    ctx.translate(C.W / 2, 250);
    ctx.scale(scale, scale);
    ctx.font = 'bold 32px system-ui, sans-serif';
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 6;
    ctx.strokeText('进入无尽模式', 0, 0);
    var g = ctx.createLinearGradient(0, -24, 0, 8);
    g.addColorStop(0, '#F5B93A');
    g.addColorStop(1, '#C97A10');
    ctx.fillStyle = g;
    ctx.fillText('进入无尽模式', 0, 0);
    ctx.restore();
  }

  // ---------- 重开确认弹窗 ----------
  function drawConfirm() {
    if (!confirmOpen) return;
    ctx.fillStyle = 'rgba(10,40,70,0.55)';
    ctx.fillRect(-BX, 0, C.W + BX * 2, VH);
    var px = 60, py = 300, pw = C.W - 120, ph = 170;
    panel(px, py, pw, ph, 14, 0.97);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#155A8A';
    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.fillText('确定要重新开始吗？', C.W / 2, py + 42);
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillStyle = '#4A7FA0';
    ctx.fillText('当前得分与局面将全部丢失', C.W / 2, py + 68);
    // 取消
    ctx.fillStyle = '#8AA5B8';
    roundRect(confirmNo.x, confirmNo.y, confirmNo.w, confirmNo.h, 10); ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillText('取消', confirmNo.x + confirmNo.w / 2, confirmNo.y + 27);
    // 确认重开
    var yg = ctx.createLinearGradient(0, confirmYes.y, 0, confirmYes.y + confirmYes.h);
    yg.addColorStop(0, '#E2705E');
    yg.addColorStop(1, '#C0504D');
    ctx.fillStyle = yg;
    roundRect(confirmYes.x, confirmYes.y, confirmYes.w, confirmYes.h, 10); ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('重新开始', confirmYes.x + confirmYes.w / 2, confirmYes.y + 27);
  }

  // ---------- 任务条 + 潮汐胶囊 ----------
  function drawQuest() {
    if (!quest) return;
    ctx.save();
    ctx.textAlign = 'center';
    // 任务条：第二行左侧（潮汐胶囊独立画在右上预览下方）
    var qw = 206, qx = 12, qy = 44;
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    roundRect(qx, qy, qw, 20, 10); ctx.fill();
    var prog = Math.min(1, quest.have / quest.need);
    if (prog > 0) {
      ctx.fillStyle = 'rgba(245,197,66,0.35)';
      roundRect(qx + 2, qy + 2, Math.max(10, (qw - 4) * prog), 16, 8); ctx.fill();
    }
    ctx.fillStyle = '#7A5B10';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.fillText('任务：' + quest.text + ' ' + quest.have + '/' + quest.need, qx + qw / 2, qy + 14);
    drawTidePill();
    ctx.restore();
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
    // 道具带：海底基色的柔和延续（同色系微加深，方向与渐变一致，不割裂）
    var g = ctx.createLinearGradient(0, VH - 56, 0, VH);
    g.addColorStop(0, 'rgba(56,102,130,0)');
    g.addColorStop(1, 'rgba(36,78,106,0.3)');
    ctx.fillStyle = g;
    ctx.fillRect(0, VH - 56, C.W, 56);

    var readyPulse = 0.5 + 0.5 * Math.sin(time * 5);

    drawCircleBtn(bookBtn, '#4A7FA0', 1, false, readyPulse);
    var bx = bookBtn.cx, by = bookBtn.cy;
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 1.8;
    ctx.strokeRect(bx - 8, by - 6, 16, 12);
    ctx.beginPath(); ctx.moveTo(bx, by - 6); ctx.lineTo(bx, by + 6); ctx.stroke();

    // 重开按钮（↻ 循环箭头，点击弹确认）
    drawCircleBtn(restartBtn, '#5E90B4', 0.85, false, 0);
    var rx0 = restartBtn.cx, ry0 = restartBtn.cy;
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(rx0, ry0, 8, -Math.PI * 0.35, Math.PI * 1.25); ctx.stroke();
    // 箭头头部
    var ax = Math.cos(-Math.PI * 0.35) * 8, ay = Math.sin(-Math.PI * 0.35) * 8;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(rx0 + ax + 5, ry0 + ay - 1);
    ctx.lineTo(rx0 + ax - 4, ry0 + ay - 3);
    ctx.lineTo(rx0 + ax + 1, ry0 + ay + 6);
    ctx.closePath(); ctx.fill();

    ctx.textAlign = 'center';
    for (var i = 0; i < SKILL_BTNS.length; i++) {
      var btn = SKILL_BTNS[i], cfg = C.skills[i];
      var ch = skillCharge[cfg.key], ready = ch >= cfg.cost;
      drawCircleBtn(btn, ready ? '#2E86B4' : '#5E90B4', ready ? 1 : 0.55, ready, readyPulse);
      if (!ready) {
        ctx.strokeStyle = 'rgba(255,255,255,0.85)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(btn.cx, btn.cy, btn.r - 3, -Math.PI / 2, -Math.PI / 2 + (ch / cfg.cost) * Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.font = 'bold 10px system-ui, sans-serif';
        ctx.fillText(ch + '/' + cfg.cost, btn.cx, btn.cy + 13);
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.95)';
        ctx.font = 'bold 10px system-ui, sans-serif';
        ctx.fillText('就绪', btn.cx, btn.cy + 13);
      }
      drawSkillIcon(cfg.key, btn.cx, btn.cy - 6, ready ? '#FFFFFF' : 'rgba(255,255,255,0.85)');
      if ((cfg.key === 'evap' && evapMode) || (cfg.key === 'ripple' && rippleMode) || (cfg.key === 'flow' && flowMode)) {
        ctx.strokeStyle = '#E24B4A'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(btn.cx, btn.cy, btn.r + 3, 0, Math.PI * 2); ctx.stroke();
      }
      // 名称标签：浅色文字，在变深的道具带上保持可读（底边留 6px 余量）
      ctx.fillStyle = 'rgba(240,250,252,0.95)';
      ctx.font = '10px system-ui, sans-serif';
      ctx.fillText(cfg.name, btn.cx, btn.cy + btn.r + 6);
    }

    if (seaCount > 0) {
      ctx.save();
      ctx.translate(C.W - 64, VH - 36);
      ctx.rotate(Math.sin(time * 2) * 0.05);
      ctx.fillStyle = 'rgba(30,122,111,0.9)';
      ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.fillText('海', 0, 4);
      ctx.restore();
    }
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
    var g = ctx.createLinearGradient(0, -c.r, 0, c.r);
    g.addColorStop(0, color);
    g.addColorStop(1, shade(color, ready ? -0.25 : -0.1));
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

  // ---------- 图鉴（页签：图鉴 / 成就） ----------
  function drawDex() {
    ctx.fillStyle = 'rgba(10,40,70,0.6)';
    ctx.fillRect(-BX, 0, C.W + BX * 2, VH);
    panel(DEX_PANEL.x, DEX_PANEL.y, DEX_PANEL.w, DEX_PANEL.h, 14, 0.96);

    // 页签
    var tabs = [
      { r: tabDexBtn, label: '图鉴', on: dexTab === 0 },
      { r: tabAchBtn, label: '成就', on: dexTab === 1 },
      { r: tabDailyBtn, label: '每日', on: dexTab === 2, dot: !(daily.done[0] && daily.done[1] && daily.done[2]) },
      { r: tabRankBtn, label: '榜单', on: dexTab === 3 }
    ];
    for (var ti = 0; ti < tabs.length; ti++) {
      var tb = tabs[ti];
      ctx.fillStyle = tb.on ? '#2E86B4' : 'rgba(46,134,180,0.12)';
      roundRect(tb.r.x, tb.r.y, tb.r.w, tb.r.h, 6); ctx.fill();
      ctx.fillStyle = tb.on ? '#FFFFFF' : '#4A7FA0';
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.fillText(tb.label, tb.r.x + tb.r.w / 2, tb.r.y + 18);
      if (tb.dot && !tb.on) { // 未全勤提醒小红点
        ctx.fillStyle = '#E2705E';
        ctx.beginPath(); ctx.arc(tb.r.x + tb.r.w - 7, tb.r.y + 6, 3.2, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.fillStyle = '#2E86B4';
    roundRect(dexCloseBtn.x, dexCloseBtn.y, dexCloseBtn.w, dexCloseBtn.h, 6); ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillText('关闭', dexCloseBtn.x + dexCloseBtn.w / 2, dexCloseBtn.y + 17);

    if (dexTab === 1) { drawAchTab(); return; }
    if (dexTab === 2) { drawDailyTab(); return; }
    if (dexTab === 3) { drawRankTab(); return; }

    ctx.textAlign = 'center';
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillStyle = '#4A7FA0';
    ctx.fillText('当前海域「' + C.seaStages[seaStage()].name + '」· 汇入海域 ×' + seaCount + ' · 累计得分 ' + totalScore(), C.W / 2, DEX_PANEL.y + 56);

    // 合成链 3×3
    for (var t = 0; t < T.length; t++) {
      var col = t % 3, row = Math.floor(t / 3);
      var cx0 = DEX_PANEL.x + 14 + col * 118;
      var cy0 = DEX_PANEL.y + 66 + row * 130;
      ctx.fillStyle = 'rgba(46,134,180,0.08)';
      roundRect(cx0, cy0, 110, 122, 8); ctx.fill();
      var unlocked = !!dexUnlocked[t];
      var bx = cx0 + 55, by = cy0 + 38;
      if (unlocked) {
        drawBall({ x: bx, y: by, r: 22, tier: t, vx: 0, vy: 0 }, 1);
      } else {
        ctx.fillStyle = '#B8CBD8';
        ctx.beginPath(); ctx.arc(bx, by, 22, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#8AA5B8';
        ctx.font = 'bold 16px system-ui, sans-serif';
        ctx.fillText('?', bx, by + 5);
      }
      ctx.fillStyle = unlocked ? '#155A8A' : '#8AA5B8';
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.fillText(unlocked ? T[t].name : '？？？', bx, cy0 + 76);
      ctx.font = '11px system-ui, sans-serif';
      ctx.fillStyle = '#4A7FA0';
      ctx.fillText(unlocked ? ('分值 ' + T[t].score + ' · ×' + (dexCounts[t] || 0)) : '未解锁', bx, cy0 + 92);
      if (unlocked) {
        ctx.fillStyle = '#1E7A6F';
        ctx.fillText('已收录', bx, cy0 + 108);
      } else if ((C.dexGate[t] || 0) > 0) {
        // 积分门槛提示：已达门槛但未合成出 → "待合成"；未达门槛 → 显示所需累计分
        var gate = C.dexGate[t] || 0;
        ctx.fillStyle = totalScore() >= gate ? '#C97A10' : '#B0584A';
        ctx.fillText(totalScore() >= gate ? '已达标 · 待合成' : ('累计 ' + gate + ' 分'), bx, cy0 + 108);
      }
    }

    // 特殊水滴条（发现即点亮，点选查看说明）
    ctx.textAlign = 'center';
    for (var s = 0; s < SP_DEFS.length; s++) {
      var sp = SP_DEFS[s], rect = spCellRect(s);
      var found = !!dexSpecial[sp.key];
      var sel = dexSelSp === s;
      ctx.fillStyle = sel ? 'rgba(46,134,180,0.18)' : 'rgba(46,134,180,0.06)';
      roundRect(rect.x, rect.y, rect.w, rect.h, 8); ctx.fill();
      if (sel) {
        ctx.strokeStyle = '#2E86B4'; ctx.lineWidth = 1.5;
        roundRect(rect.x + 0.5, rect.y + 0.5, rect.w - 1, rect.h - 1, 8); ctx.stroke();
      }
      var sx = rect.x + rect.w / 2, sy = rect.y + 24;
      if (found) {
        ctx.fillStyle = sp.color;
        ctx.beginPath(); ctx.arc(sx, sy, 13, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.beginPath(); ctx.arc(sx - 4, sy - 4, 4, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.fillStyle = '#C3D2DC';
        ctx.beginPath(); ctx.arc(sx, sy, 13, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#8AA5B8';
        ctx.font = 'bold 13px system-ui, sans-serif';
        ctx.fillText('?', sx, sy + 5);
      }
      ctx.fillStyle = found ? '#155A8A' : '#8AA5B8';
      ctx.font = '9px system-ui, sans-serif';
      ctx.fillText(found ? sp.name : '？？？', sx, rect.y + 54);
      ctx.fillStyle = found ? '#1E7A6F' : '#B0584A';
      ctx.fillText(found ? '已发现' : '未发现', sx, rect.y + 68);
    }

    // 说明框：选中特殊滴的玩法说明
    var dsc = SP_DEFS[dexSelSp] || SP_DEFS[0];
    var known = !!dexSpecial[dsc.key];
    ctx.fillStyle = 'rgba(46,134,180,0.10)';
    roundRect(DEX_PANEL.x + 12, DEX_PANEL.y + 546, DEX_PANEL.w - 24, 62, 8); ctx.fill();
    ctx.fillStyle = known ? '#155A8A' : '#8AA5B8';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(known ? dsc.name : '？？？', DEX_PANEL.x + 24, DEX_PANEL.y + 566);
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillStyle = '#4A7FA0';
    ctx.fillText(known ? dsc.desc : '在海域中发现它即可点亮说明', DEX_PANEL.x + 24, DEX_PANEL.y + 586);
    ctx.textAlign = 'center';
  }

  // 成就页签：常驻目标列表（跨局累计，达成给分与充能奖励）
  function drawAchTab() {
    ctx.textAlign = 'center';
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillStyle = '#4A7FA0';
    ctx.fillText('达成奖励：得分 +80 · 随机技能充能 +2 · 跨局累计', C.W / 2, DEX_PANEL.y + 56);
    for (var i = 0; i < ACH_DEFS.length; i++) {
      var a = ACH_DEFS[i];
      var ry = DEX_PANEL.y + 70 + i * 66;
      var done = !!achDone[a.id];
      var cur = Math.min(a.target, a.cur());
      ctx.fillStyle = done ? 'rgba(245,197,66,0.14)' : 'rgba(46,134,180,0.07)';
      roundRect(DEX_PANEL.x + 14, ry, DEX_PANEL.w - 28, 58, 8); ctx.fill();
      ctx.textAlign = 'left';
      ctx.fillStyle = done ? '#B8860B' : '#155A8A';
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.fillText((done ? '★ ' : '') + a.name + (done ? ' · 已达成' : ''), DEX_PANEL.x + 26, ry + 20);
      ctx.fillStyle = '#4A7FA0';
      ctx.font = '11px system-ui, sans-serif';
      ctx.fillText(a.desc, DEX_PANEL.x + 26, ry + 42);
      // 永续加成说明（名称行右侧，达成后变为海绿色；避开下方进度条）
      ctx.fillStyle = done ? '#1E7A6F' : '#9AB4C4';
      ctx.font = '10px system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(a.perk, DEX_PANEL.x + DEX_PANEL.w - 26, ry + 18);
      ctx.textAlign = 'left';
      // 进度条（右侧）
      var barX = DEX_PANEL.x + DEX_PANEL.w - 150, barW = 116, barY = ry + 24;
      ctx.fillStyle = 'rgba(46,134,180,0.15)';
      roundRect(barX, barY, barW, 9, 4.5); ctx.fill();
      ctx.fillStyle = done ? '#F5C542' : '#2E86B4';
      if (cur > 0) { roundRect(barX, barY, Math.max(6, barW * cur / a.target), 9, 4.5); ctx.fill(); }
      ctx.textAlign = 'center';
      ctx.fillStyle = done ? '#B8860B' : '#4A7FA0';
      ctx.font = '10px system-ui, sans-serif';
      if (!done) ctx.fillText(cur + '/' + a.target, barX + barW / 2, barY + 24);
    }
  }

  // 每日页签：3 个按日期生成的任务 + 连续天数
  function drawDailyTab() {
    ctx.textAlign = 'center';
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillStyle = '#4A7FA0';
    var allDone = daily.done[0] && daily.done[1] && daily.done[2];
    ctx.fillText(daily.date + (allDone ? ' · 今日全勤 ✓' : ' · 完成全部任务涨连续天数'), C.W / 2, DEX_PANEL.y + 56);
    // 连续天数火焰
    var fy = DEX_PANEL.y + 86;
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillStyle = daily.streak > 0 ? '#E2705E' : '#8AA5B8';
    var flame = ''; for (var fi = 0; fi < Math.min(daily.streak, 7); fi++) flame += '🔥';
    ctx.fillText(flame + (daily.streak > 7 ? ' ×' + daily.streak : (daily.streak > 0 ? ' 连续 ' + daily.streak + ' 天' : ' 尚无连续记录')), C.W / 2, fy);
    for (var i = 0; i < daily.tasks.length; i++) {
      var t = daily.tasks[i], done = daily.done[i];
      var ry = DEX_PANEL.y + 110 + i * 86;
      ctx.fillStyle = done ? 'rgba(245,197,66,0.14)' : 'rgba(46,134,180,0.07)';
      roundRect(DEX_PANEL.x + 14, ry, DEX_PANEL.w - 28, 74, 8); ctx.fill();
      ctx.textAlign = 'left';
      ctx.fillStyle = done ? '#B8860B' : '#155A8A';
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.fillText((done ? '✓ ' : '') + t.text, DEX_PANEL.x + 26, ry + 22);
      ctx.fillStyle = '#4A7FA0';
      ctx.font = '11px system-ui, sans-serif';
      ctx.fillText('奖励 +' + C.daily.rewardScore + ' 分', DEX_PANEL.x + 26, ry + 42);
      // 进度条
      var barX = DEX_PANEL.x + 26, barW = DEX_PANEL.w - 120, barY = ry + 54;
      ctx.fillStyle = 'rgba(46,134,180,0.15)';
      roundRect(barX, barY, barW, 9, 4.5); ctx.fill();
      if (daily.prog[i] > 0) {
        ctx.fillStyle = done ? '#F5C542' : '#2E86B4';
        roundRect(barX, barY, Math.max(6, barW * daily.prog[i] / t.need), 9, 4.5); ctx.fill();
      }
      ctx.textAlign = 'center';
      ctx.fillStyle = done ? '#B8860B' : '#4A7FA0';
      ctx.font = '10px system-ui, sans-serif';
      ctx.fillText(done ? '已完成' : (daily.prog[i] + '/' + t.need), barX + barW + 34, barY + 9);
      ctx.textAlign = 'left';
    }
    ctx.textAlign = 'center';
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillStyle = '#4A7FA0';
    ctx.fillText('全勤奖励：+' + (C.daily.streakBase + (daily.streak + 1) * C.daily.streakStep) + ' 分 · 随机技能充能 +2', C.W / 2, DEX_PANEL.y + 400);
  }

  // 榜单页签：本地好友榜（预留微信排行榜接口位）+ 晒成绩
  function drawRankTab() {
    var rows = friendBoard();
    ctx.textAlign = 'center';
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillStyle = '#4A7FA0';
    ctx.fillText('好友深海榜 · 比比谁潜得更深', C.W / 2, DEX_PANEL.y + 56);
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      var ry = DEX_PANEL.y + 76 + i * 46;
      ctx.fillStyle = r.me ? 'rgba(245,197,66,0.16)' : (i % 2 ? 'rgba(46,134,180,0.05)' : 'rgba(46,134,180,0.09)');
      roundRect(DEX_PANEL.x + 14, ry, DEX_PANEL.w - 28, 38, 8); ctx.fill();
      // 名次徽章
      var badge = ['#F5C542', '#B9C4CC', '#D2955B'][i] || 'rgba(46,134,180,0.35)';
      ctx.fillStyle = badge;
      ctx.beginPath(); ctx.arc(DEX_PANEL.x + 38, ry + 19, 11, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = i < 3 ? '#FFFFFF' : '#3E6E90';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.fillText(String(i + 1), DEX_PANEL.x + 38, ry + 23);
      ctx.textAlign = 'left';
      ctx.fillStyle = r.me ? '#B8860B' : '#155A8A';
      ctx.font = (r.me ? 'bold ' : '') + '13px system-ui, sans-serif';
      ctx.fillText(r.me ? r.name + '（你）' : r.name, DEX_PANEL.x + 58, ry + 24);
      ctx.textAlign = 'right';
      ctx.fillStyle = r.me ? '#B8860B' : '#3E6E90';
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.fillText(String(r.score), DEX_PANEL.x + DEX_PANEL.w - 26, ry + 24);
      ctx.textAlign = 'left';
    }
    ctx.textAlign = 'center';
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillStyle = '#8AA5B8';
    ctx.fillText('上线后接入微信好友排行（wx.setUserCloudStorage）', C.W / 2, DEX_PANEL.y + 412);
  }

  // 战报分享卡片（结算页"分享战报"打开；上线后接 wx.shareAppMessage）
  function drawShare() {
    if (!shareOpen) return;
    ctx.fillStyle = 'rgba(10,40,70,0.6)';
    ctx.fillRect(-BX, 0, C.W + BX * 2, VH);
    var pw = 300, ph = 420, px = (C.W - pw) / 2, py = 160;
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
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.fillText('水滴成海 · 深海战报', C.W / 2, py + 40);
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillText(C.seaStages[seaStage()].name + ' · ' + daily.date, C.W / 2, py + 66);
    // 大分数
    ctx.font = 'bold 46px system-ui, sans-serif';
    ctx.fillStyle = '#0F4C79';
    ctx.fillText(String(score), C.W / 2, py + 168);
    ctx.font = '12px system-ui, sans-serif';
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
      ctx.font = 'bold 14px system-ui, sans-serif';
      ctx.fillText(stats[i][1], sx + (sw - 8) / 2, py + 240);
      ctx.fillStyle = '#4A7FA0';
      ctx.font = '10px system-ui, sans-serif';
      ctx.fillText(stats[i][0], sx + (sw - 8) / 2, py + 258);
    }
    // 分享文案预览（左对齐 + 按行数自适应盒高）
    ctx.textAlign = 'left';
    ctx.font = '11px system-ui, sans-serif';
    var shLines = wrapLines(shareText, pw - 60);
    var shBoxH = Math.max(44, 20 + shLines.length * 16);
    ctx.fillStyle = 'rgba(46,134,180,0.06)';
    roundRect(px + 20, py + 278, pw - 40, shBoxH, 8); ctx.fill();
    ctx.fillStyle = '#3E6E90';
    for (var li = 0; li < shLines.length; li++) ctx.fillText(shLines[li], px + 32, py + 296 + li * 16);
    ctx.textAlign = 'center';
    // 按钮：复制文案 / 关闭
    shareCopyBtn.x = px + 20; shareCopyBtn.y = py + ph - 62; shareCopyBtn.w = pw - 40; shareCopyBtn.h = 42;
    var bg2 = ctx.createLinearGradient(0, shareCopyBtn.y, 0, shareCopyBtn.y + 42);
    bg2.addColorStop(0, '#3B9BD0'); bg2.addColorStop(1, '#2578A8');
    ctx.fillStyle = bg2;
    roundRect(shareCopyBtn.x, shareCopyBtn.y, shareCopyBtn.w, shareCopyBtn.h, 12); ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillText('复制分享文案', C.W / 2, shareCopyBtn.y + 27);
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillStyle = '#8AA5B8';
    ctx.fillText('点击卡片外任意位置关闭', C.W / 2, py + ph - 10);
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

  // 浮动文字（最后绘制，保证不被 HUD 遮挡）
  function drawPopups() {
    var i, p;
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    for (i = 0; i < popups.length; i++) {
      p = popups[i];
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life / p.max * 1.5));
      ctx.translate(p.x, p.y);
      ctx.scale(p.scale, p.scale);
      ctx.fillStyle = p.big ? '#D64541' : '#155A8A';
      ctx.font = (p.big ? 'bold 20px' : 'bold 17px') + ' system-ui, sans-serif';
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 3;
      ctx.strokeText(p.text, 0, 0);
      ctx.fillText(p.text, 0, 0);
      if (p.mult > 1) {
        ctx.font = 'bold 14px system-ui, sans-serif';
        ctx.fillStyle = '#E24B4A';
        ctx.strokeStyle = 'rgba(255,255,255,0.85)';
        ctx.lineWidth = 3;
        ctx.strokeText('连击 x' + p.mult, 0, -24);
        ctx.fillText('连击 x' + p.mult, 0, -24);
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  function drawAdOverlay() {
    // 深海主题化广告演示层：暗化海水渐变 + 上浮气泡 + 漂流瓶，替代生硬的纯黑遮罩
    var dim = ctx.createLinearGradient(0, 0, 0, VH);
    dim.addColorStop(0, 'rgba(6,30,56,0.82)');
    dim.addColorStop(1, 'rgba(4,18,36,0.88)');
    ctx.fillStyle = dim;
    ctx.fillRect(-BX, 0, C.W + BX * 2, VH);
    ctx.strokeStyle = 'rgba(160,220,255,0.25)';
    ctx.lineWidth = 1.2;
    for (var i = 0; i < 8; i++) {
      var bx2 = 40 + i * 48 + Math.sin(time * 1.2 + i * 2.2) * 10;
      var by2 = (VH + 20) - ((time * 46 + i * 97) % (VH + 40));
      ctx.beginPath(); ctx.arc(bx2, by2, 3 + (i % 3), 0, Math.PI * 2); ctx.stroke();
    }
    // 漂流瓶（随水流轻摆）
    ctx.save();
    ctx.translate(C.W / 2, VH / 2 - 64);
    ctx.rotate(Math.sin(time * 1.4) * 0.12);
    ctx.fillStyle = 'rgba(150,220,200,0.9)';
    roundRect(-13, -10, 26, 34, 8); ctx.fill();
    ctx.fillStyle = 'rgba(196,238,222,0.95)';
    roundRect(-7, -24, 14, 16, 5); ctx.fill();
    ctx.fillStyle = '#C99046';
    roundRect(-8, -30, 16, 7, 3); ctx.fill();
    ctx.fillStyle = '#F5E9C8';
    roundRect(-8, 0, 16, 12, 2); ctx.fill();
    ctx.restore();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.fillText('深海漂流瓶 · 激励视频', C.W / 2, VH / 2 + 26);
    ctx.font = '14px system-ui, sans-serif';
    ctx.fillText(adOverlay.label + ' · ' + adOverlay.t.toFixed(1) + 's 后发放奖励', C.W / 2, VH / 2 + 52);
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillText('（演示占位：上线微信时替换为 wx.createRewardedVideoAd）', C.W / 2, VH / 2 + 78);
  }

  function drawOver() {
    buildOverButtons();
    ctx.fillStyle = 'rgba(10,40,70,0.55)';
    ctx.fillRect(-BX, 0, C.W + BX * 2, VH);

    var pw = 320, ph = 436, px = (C.W - pw) / 2, py = 150;
    panel(px, py, pw, ph, 16, 0.97);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#155A8A';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillText('本局结束', C.W / 2, py + 44);
    ctx.font = 'bold 42px system-ui, sans-serif';
    ctx.fillStyle = '#0F4C79';
    ctx.fillText(String(score), C.W / 2, py + 98);
    ctx.font = '14px system-ui, sans-serif';
    ctx.fillStyle = '#4A7FA0';
    var isNewBest = score >= best && score > 0;
    var statusLine = doubled ? '已双倍结算'
      : (isNewBest ? '★ 新纪录！'
      : (failReason === 'timeout' ? '时间到 · 距目标还差 ' + (C.level1.target - score) + ' 分'
      : ('最佳 ' + best)));
    ctx.fillText(statusLine, C.W / 2, py + 126);
    if (maxCombo > 1) {
      ctx.fillText('本局最高连击 ×' + maxCombo + (seaCount > 0 ? ' · 汇入海域 ×' + seaCount : ''), C.W / 2, py + 148);
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
      ctx.font = '16px system-ui, sans-serif';
      ctx.textBaseline = 'middle';
      ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2 + 1);
      ctx.textBaseline = 'alphabetic';
    }
  }

  // ---------- 首局主动引导（前 5 投分步提示，只出现一次） ----------
  function drawTutorial() {
    if (tutDone || state !== 'play' || level !== 1 || adOverlay || dexOpen || confirmOpen) return;
    var step = Math.min(dropCount, TUT_STEPS.length - 1);
    var ty = 480;
    var pulse = 0.5 + 0.5 * Math.sin(time * 4);
    ctx.save();
    ctx.textAlign = 'center';
    // 提示胶囊
    var tw = ctx.measureText(TUT_STEPS[step]).width;
    ctx.font = 'bold 13px system-ui, sans-serif';
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

  // ---------- 主渲染 ----------
  function render() {
    // 逻辑坐标 → 设备像素：dpr × view.s（画布铺满窗口后，缩放必须在变换里完成）
    ctx.setTransform(dpr * view.s, 0, 0, dpr * view.s, 0, 0);

    if (shakeT > 0) {
      var s = shakeAmp * (shakeT / 0.4);
      ctx.translate((Math.random() - 0.5) * 2 * s, (Math.random() - 0.5) * 2 * s);
    }

    drawBackground();

    // 游戏区（420 逻辑宽）水平居中：整体平移 BX，两侧为延伸海水
    ctx.save();
    ctx.translate(BX, 0);

    drawContainer();
    drawDangerLine();
    drawWaterBack();

    var i;
    for (i = 0; i < phys.bodies.length; i++) drawBall(phys.bodies[i], 1);

    // 潮汐限定标记：旱期的江河带脉动波纹虚线圈（提示需等潮才能合成大海）
    for (i = 0; i < phys.bodies.length; i++) {
      var tb = phys.bodies[i];
      if (!tb.iron && !tb.chest && tb.tier === C.tidePair.tier && tide.progress < C.tidePair.threshold) {
        ctx.save();
        ctx.strokeStyle = 'rgba(127,212,255,' + (0.32 + 0.25 * Math.sin(time * 3)).toFixed(2) + ')';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 6]);
        ctx.lineDashOffset = -time * 24;
        ctx.beginPath(); ctx.arc(tb.x, tb.y, tb.r + 6, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }
    }

    drawWaterFront();

    drawTutorial(); // 首局分步引导（前 5 投）

    if (state === 'play' && !adOverlay && !evapMode && !flowMode && !rippleMode && !confirmOpen) {
      drawGhost(aimX, C.spawnY, nextTier, cooldown > 0 ? 0.25 : 0.6);
    }

    drawFx();
    drawEventVfx(); // 随机深海事件视觉（漩涡风暴/涌泉）

    if (evapMode) {
      ctx.fillStyle = 'rgba(10,40,70,0.18)';
      ctx.fillRect(-BX, 0, C.W + BX * 2, VH);
      var hb = ballAt(lastPointer);
      if (hb) {
        ctx.save();
        ctx.setLineDash([6, 5]);
        ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(hb.x, hb.y, hb.r + 8, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }
      ctx.textAlign = 'center';
      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.strokeStyle = 'rgba(10,40,70,0.6)';
      ctx.lineWidth = 4;
      ctx.strokeText('蒸发模式：点击要移除的水滴或礁石（再点按钮取消）', C.W / 2, 112);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText('蒸发模式：点击要移除的水滴或礁石（再点按钮取消）', C.W / 2, 112);
    }

    // 涟漪选位模式：显示波纹中心指示
    if (rippleMode) {
      ctx.fillStyle = 'rgba(10,40,70,0.12)';
      ctx.fillRect(-BX, 0, C.W + BX * 2, VH);
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
      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.strokeStyle = 'rgba(10,40,70,0.6)';
      ctx.lineWidth = 4;
      ctx.strokeText('涟漪模式：点击选择波纹中心（再点按钮取消）', C.W / 2, 112);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText('涟漪模式：点击选择波纹中心（再点按钮取消）', C.W / 2, 112);
    }

    // 水流模式：已选水滴高亮 + 操作提示
    if (flowMode) {
      ctx.fillStyle = 'rgba(10,40,70,0.14)';
      ctx.fillRect(-BX, 0, C.W + BX * 2, VH);
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
      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.strokeStyle = 'rgba(10,40,70,0.6)';
      ctx.lineWidth = 4;
      var flowHint = flowPick ? '水流模式：再点一枚水滴与之交换（点原滴取消）' : '水流模式：点选第一枚水滴';
      ctx.strokeText(flowHint, C.W / 2, 112);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(flowHint, C.W / 2, 112);
    }

    // 暗角（纵深）
    var vg = ctx.createRadialGradient(C.W / 2, VH / 2, VH * 0.34, C.W / 2, VH / 2, VH * 0.74);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(6,28,52,0.16)');
    ctx.fillStyle = vg;
    ctx.fillRect(-BX, 0, C.W + BX * 2, VH);

    drawHUD();
    drawLevelHud();
    drawQuest();
    drawGhostLabel(); // 最后绘制，保证特殊滴标签浮在最上层且紧贴虚影球
    drawPopups();     // 浮动文字最上层（礁石来袭/任务完成/得分等，不被 HUD 遮挡）
    drawTideBanner();
    drawLevelBanner();
    drawSkillBar();
    drawConfirm();
    if (adOverlay) drawAdOverlay();
    if (state === 'over') drawOver();
    if (dexOpen) drawDex();
    drawShare();

    ctx.restore();
  }

  // ---------- 主循环 ----------
  var last = 0;
  function frame(ts) {
    requestAnimationFrame(frame);
    if (!last) last = ts;
    var dt = Math.min((ts - last) / 1000, 1 / 30);
    last = ts;
    update(dt);
    render();
  }

  makeQuest(0);
  requestAnimationFrame(frame);
})();
