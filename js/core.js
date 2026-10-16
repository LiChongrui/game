// 水滴合成深海 - core：画布与自适应 / 平台存储封装 / 音效 / 广告占位
// 模块加载顺序 1/4（无内部依赖）。四个模块共享全局作用域（经典 script），
// 函数与状态互相可见；加载顺序只约束"顶层初始化语句"的执行先后。
  var C = MG.config;
  var T = C.tiers;

  // ---------- 画布 ----------
  // 逻辑高度动态（VH ≥ 747）：顶部元素（HUD/出生区/警戒线）按顶部坐标绘制，
  // 底部元素（海底/技能栏/按钮）按 VH-偏移 贴底，中间水域随窗口高度自适应；
  // 画布 CSS 高度恒等于窗口高度，CSS 宽度=游戏区宽度（两侧为页面深海背景）
  var canvas = document.getElementById('game');
  var ctx = canvas.getContext('2d');
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var VH = C.H;           // 当前逻辑高度（全屏：h/view.s，≥747）
  var LW = C.W;           // 当前逻辑宽度（≥ C.W，宽窗口下两侧为延伸海水）
  var BX = 0;             // 游戏区（420 逻辑宽）水平居中偏移
  var FLOORY = C.floorY;  // 容器底 y（游戏块内恒定：673）
  var view = { s: 1 };
  // 游戏块 = 420×747 固定逻辑区（9:16；顶部 HUD 0~100 + 出生空隙带 + 容器 528 + 底部 74），
  // 长宽比恒定，所有设备一致；容器高度 528 与出生点距容器底 526 两条核心几何与 720 时代完全一致；
  // 高屏多出的高度上下均分给背景延伸（oy 为块居中偏移，菜单态铺满时为 0）
  var oy = 0;             // 游戏块垂直居中偏移（逻辑 px，≥0）
  var renderOy = 0;       // 渲染/点击实际使用的偏移：菜单态 0（铺满），其余态 oy

  function fit() {
    var w = window.innerWidth, h = window.innerHeight;
    // 全屏铺满：刘海/挖孔、手势条区域都按正常区域对待，不做任何安全区缩进
    view.s = Math.min(w / C.W, h / C.H);   // 等比缩放，不变形
    VH = h / view.s;
    LW = w / view.s;                       // 逻辑宽度（≥420）
    BX = (LW - C.W) / 2;                   // 游戏区水平居中
    oy = Math.max(0, (VH - C.H) / 2);      // 游戏块垂直居中：高屏多出的高度上下均分
    // 游戏块内全部恒定（=config 初始值）：容器底/容器顶/警戒线/出生点不随设备变化，
    // 容器长宽比恒定 420:528（与 720 时代一致）——不同设备游戏区大小比例完全一致
    FLOORY = C.H - 74;                     // 673
    C.floorY = FLOORY;                     // 同步给物理引擎（每帧读取，水滴落到新地板）
    C.containerTop = 145;
    C.dangerY = 209;
    // 坠落高度：最大可投放水滴（tiers 前 5 档中的溪流 r45）底部接触警戒线时的球心位置
    C.spawnY = C.dangerY - C.tiers[4].r;   // 209 - 45 = 164
    canvas.width = Math.round(w * dpr);    // 画布铺满整个窗口（背景全程由游戏自绘）
    canvas.height = Math.round(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    // 按钮全部落在游戏块内恒定位（块内坐标）：道具按钮在容器底~块底带内近似垂直居中
    var cy = C.H - 46;
    // 注意：模块化后 bookBtn 等声明在 systems.js（后加载），早期触发时用 typeof 守卫
    if (typeof bookBtn !== 'undefined' && typeof restartBtn !== 'undefined' && typeof SKILL_BTNS !== 'undefined') {
      bookBtn.cy = cy; restartBtn.cy = cy;
      for (var i = 0; i < SKILL_BTNS.length; i++) SKILL_BTNS[i].cy = cy;
    }
    if (typeof trophyBtn !== 'undefined' && typeof MUTE !== 'undefined') {
      trophyBtn.cy = 36; MUTE.cy = 36;     // 奖杯/静音：块内左上/右上角落（与分数行同排）
    }
  }
  window.addEventListener('resize', fit);
  window.addEventListener('orientationchange', fit);
  if (window.ResizeObserver) {
    // 兜底：预览面板/嵌入容器改变尺寸时不一定触发 resize 事件
    new ResizeObserver(fit).observe(document.documentElement);
  }

  // ---------- 存储（走平台适配层 MG.platform，Web 实现指向 localStorage） ----------
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

  // ---------- 存档版本（迁移机制） ----------
  // 每次发布含破坏性存档改动的版本，SAVE_VERSION +1 并在迁移链里追加一步变换；
  // 读取端（loadNum/loadFlag/loadDex）全部带默认值，因此未知字段天然兼容。
  var SAVE_VERSION = 1;
  function migrateSave() {
    var ver = parseInt(MG.platform.get('mg_ver'), 10);
    if (isNaN(ver)) ver = 0;
    if (ver > SAVE_VERSION) return; // 更高版本存档（回滚到旧客户端）：原样保留，只读不写降级字段
    // ---- 迁移链（从 ver 逐级升到 SAVE_VERSION） ----
    // v0 → v1：v0 时代键名与当前一致（mg_best/mg_peak/mg_life/mg_dex/mg_mute/mg_tut/mg_ng…），
    //          无字段变换，仅补打版本标记，legacy 存档天然兼容。
    // if (ver < 2) { ...未来变换... }
    MG.platform.set('mg_ver', String(SAVE_VERSION));
  }
  migrateSave(); // 必须先于 systems.js 的任何读档执行（core 在 systems 之前加载）


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
