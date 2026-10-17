// 水滴合成深海 - core：画布与自适应 / 平台存储封装 / 音效 / 广告占位
// 模块加载顺序 1/4（无内部依赖）。四个模块共享全局作用域（经典 script），
// 函数与状态互相可见；加载顺序只约束"顶层初始化语句"的执行先后。
  var C = MG.config;
  var T = C.tiers;
  // 跨模块工具：微信 Canvas 对 hsl/hsla 支持不稳定，提供 rgba 兜底
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

  // ---------- 画布 ----------
  // 逻辑高度动态（VH ≥ C.H）：HUD 三组行位钉块顶（layout.hud，0~164），
  // 其余一切按底部定位（layout.body/band/panel/menu = 9:18 定版基准 + dy，随块底平移），
  // 中间水域随窗口高度自适应；画布 CSS 高度恒等于窗口高度，CSS 宽度=游戏区宽度（两侧为页面深海背景）
  var canvas = document.getElementById('game');
  var ctx = canvas.getContext('2d');
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var VH = C.H;           // 当前逻辑高度（全屏：h/view.s，≥C.H）
  var LW = C.W;           // 当前逻辑宽度（≥ C.W，宽窗口下两侧为延伸海水）
  var BX = 0;             // 游戏区（420 逻辑宽）水平居中偏移
  var FLOORY = C.floorY;  // 容器底 y（= layout.body.floorY，随 dy 平移）
  var view = { s: 1 };
  // 游戏块 = 420×C.H 逻辑区（当前交付 9:18=840）。★ 定位语义（v183 用户定版）：
  // HUD 按顶部定位（钉块顶 0~164，绝对定版）；其余一切按底部定位
  // （= 9:18 定版基准 + dy，dy=C.H-840，随块底整体平移）；底部带恒 74 贴块底；
  // HUD 底与容器顶之间空隙 = 79+dy，有多少是多少、不显式分配。
  // 坠落高度 = 最大可投放滴底触警戒线时的球心（dangerY - 45）；高屏多余的高度上下均分
  // （oy 为块居中偏移），块外由背景渐变延伸填充。
  // ★ 改比例只改 config 的 C.H 一处：layout.build() 自动重算全部游戏内坐标
  //   （dy=C.H-840，HUD 不动、其余全部随块底平移）；本 fit() 只负责
  //   「块 → 窗口」适配（view.s / oy / hudInset），不再写死任何游戏内坐标。
  var oy = 0;             // 游戏块顶部偏移（逻辑 px，≥0）
  var renderOy = 0;       // 渲染/点击实际使用的偏移（全态 = oy，垂直居中）
  var hudInset = 0;       // HUD 顶行避让胶囊的实际下挪量（= 居中后残余量，高屏→0，矮屏≤24）

  function fit() {
    var w = window.innerWidth, h = window.innerHeight;
    MG.layout.build();                    // 几何真源重建（config 改 H 后全量自动重排）
    // 全屏铺满：刘海/挖孔、手势条区域都按正常区域对待，不做任何安全区缩进
    view.s = Math.min(w / C.W, h / C.H);   // 等比缩放，不变形
    VH = h / view.s;
    LW = w / view.s;                       // 逻辑宽度（≥420）
    BX = (LW - C.W) / 2;                   // 游戏区水平居中
    // 垂直居中：高屏多余的高度上下均分，游戏块（420×C.H）居中成为视觉焦点；
    // 块顶上方/块底下方由全屏背景渐变（水色）自然延展填充，无留白、无接缝。
    // （__safeTop 由 wx-shim 用 getMenuButtonBoundingClientRect 计算，单位=窗口 CSS px）
    oy = Math.max(0, (VH - C.H) / 2);
    // 胶囊残余避让：居中后 HUD 顶行（块内 trophyCy35/r16 → 顶缘 19）若仍在胶囊下缘之上才需额外下挪；
    // 高屏居中量已远大于胶囊高度 → hudInset=0（无需再避让）；矮屏(≈块高)才给 ≤25 的残余量。
    var capBottom = window.__safeTop ? (window.__safeTop - 10) / view.s : 0;
    hudInset = Math.max(0, Math.min(capBottom - oy - (MG.layout.hud.trophyCy - 16), 25));
    // 容器区（layout.body 单一真源）：容器底/容器顶/警戒线/出生点按底部锚定
    // （floorY = H-75，随块底整体平移）
    FLOORY = MG.layout.body.floorY;        // 765+dy（9:18=765；dy=C.H-840）
    canvas.width = Math.round(w * dpr);    // 画布铺满整个窗口（背景全程由游戏自绘）
    canvas.height = Math.round(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    // 按钮恒贴在容器底下方（cy=layout.band.btnCy=FLOORY+28，与容器底恒距 28，v163 定版）——
    // 块高/比例变化时容器整体下移，按钮随容器走（不钉屏幕、不贴块底，v172 贴底事故的根治）
    var cy = MG.layout.band.btnCy;
    // 注意：模块化后 bookBtn 等声明在 systems.js（后加载），早期触发时用 typeof 守卫
    if (typeof bookBtn !== 'undefined' && typeof restartBtn !== 'undefined' && typeof SKILL_BTNS !== 'undefined') {
      bookBtn.cy = cy; restartBtn.cy = cy;
      for (var i = 0; i < SKILL_BTNS.length; i++) SKILL_BTNS[i].cy = cy;
    }
    // v197：成就/音量按钮已移除，设置钮（setBtn）画在 HUD 平移块内（drawHUD），
    // cy 恒为 layout.hud.trophyCy、命中侧 +hudInset，无需在此烤入坐标。
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
  // ★ v197 音频拆三开关（用户："游戏内这个地方改成设置按钮，用来弹出设置音效、音乐和震动"）：
  //   sfxOn   音效（复用旧静音键 mg_mute：旧值 1=静音 → sfxOn = 旧值反读，向后兼容老存档）
  //   musicOn 音乐（新键 mg_music；存档缺失时继承旧 mute 的反值——曾全局静音的用户
  //            升级后不会突然开唱）
  //   vibOn   震动（新键 mg_vib 默认开；经 hap() 走 MG.platform.vibrate，不支持时静默）
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
        // 部分内嵌 WebView 需要手势结束后再恢复一次
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
    drop: function () { this.blip(320, 0.08, 'triangle', 0.12, 0.6); hap(8); },
    pop: function (tier) { this.blip(480 + tier * 45, 0.14, 'sine', 0.18, 1.6); hap(12); },
    big: function () { this.blip(200, 0.45, 'sine', 0.22, 2.4); hap(30); },
    swirl: function () { this.blip(220, 0.5, 'sine', 0.12, 2.8); hap(20); },
    freeze: function () { this.blip(1250, 0.09, 'sine', 0.12, 1.1); hap(10); },
    thaw: function () { this.blip(700, 0.18, 'sine', 0.10, 1.5); hap(10); },
    over: function () { this.blip(300, 0.5, 'sawtooth', 0.10, 0.3); hap(60); },
    quest: function () {
      if (!this.sfxOn) return;
      this.blip(660, 0.10, 'sine', 0.14, 1.2);
      var self = this;
      setTimeout(function () { self.blip(880, 0.16, 'sine', 0.14, 1.2); }, 90);
      hap(20);
    },
    tide: function () {
      if (!this.sfxOn || !this.ctx) return;
      // 涨潮：低频上滑长音
      this.blip(110, 0.9, 'sine', 0.14, 2.2);
      this.blip(165, 0.7, 'triangle', 0.07, 2.0);
      hap(40);
    }
  };

  // ---------- 震动反馈（v197：设置弹窗"震动"开关；平台不支持时静默） ----------
  // 音效/音乐/震动三开关相互独立：震动只认 vibOn，与静音状态无关。
  function hap(ms) { if (audio.vibOn) MG.platform.vibrate(ms || 20); }

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
      if (!audio.ctx || !this._flt || !audio.musicOn) return;
      try { this._flt.frequency.setTargetAtTime(1150 - x * 480, audio.ctx.currentTime, 0.5); } catch (e) {}
    },
    // 声音预警②：潮汐低频隆隆（progress 渐入，预警期脉冲）
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
