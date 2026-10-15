// 水滴成海 - 游戏主逻辑
// 输入 / 合成 / 技能 / 图鉴 / 海域 / 特殊水滴(漩涡·雨云·冰晶) / 潮汐 / 任务链 / 渲染 / 音效 / 广告占位
// 全部 UI 画在 canvas 内（含按钮命中判定），便于后续原样移植到微信小游戏（无 DOM 环境）
(function () {
  var C = MG.config;
  var T = C.tiers;

  // ---------- 画布 ----------
  // 游戏在一张固定 420×720 的离屏画布上绘制；可见画布宽度=游戏区宽度（居中，
  // 两侧是页面深海背景），高度恒等于窗口高度——垂直方向永远铺满。
  // 游戏区底部锚定（海底贴底、警戒线等位置固定），多余高度全部成为顶部延伸带
  // （场景边缘像素拉伸，视觉上水滴滴落区域向上延伸）
  var canvas = document.getElementById('game');
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var scene = document.createElement('canvas'); // 游戏区离屏画布（420×720，尺寸恒定）
  scene.width = C.W * dpr;
  scene.height = C.H * dpr;
  var vctx = canvas.getContext('2d');
  var ctx = scene.getContext('2d');

  var view = { s: 1, dx: 0, dy: 0 }; // 游戏区缩放与垂直偏移
  function fit() {
    var w = window.innerWidth, h = window.innerHeight;
    view.s = Math.min(w / C.W, h / C.H);      // 等比缩放，不变形
    canvas.width = C.W * view.s * dpr;        // 可见画布宽度 = 游戏区宽度（水平两侧留页面背景）
    canvas.height = h * dpr;                  // 高度恒等于窗口高度（垂直铺满）
    canvas.style.width = (C.W * view.s) + 'px';
    canvas.style.height = h + 'px';
    view.dx = 0;
    view.dy = h - C.H * view.s;               // 游戏区锚定窗口底部：海底贴底、警戒线等位置固定，
                                              // 多余高度全部成为顶部延伸带（水滴滴落区域向上延伸）
  }
  window.addEventListener('resize', fit);
  window.addEventListener('orientationchange', fit);
  fit();

  // ---------- 存储（带兜底） ----------
  function saveNum(key, v) { try { localStorage.setItem(key, String(v)); } catch (e) {} }
  function loadFlag(key) { try { return localStorage.getItem(key) === '1'; } catch (e) { return false; } }
  function saveFlag(key, v) { try { localStorage.setItem(key, v ? '1' : '0'); } catch (e) {} }
  function loadDex() {
    try {
      var v = JSON.parse(localStorage.getItem('mg_dex') || '{}');
      return { u: v.u || {}, c: v.c || {} };
    } catch (e) { return { u: {}, c: {} }; }
  }
  function saveDex() {
    try { localStorage.setItem('mg_dex', JSON.stringify({ u: dexUnlocked, c: dexCounts })); } catch (e) {}
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

  // ---------- 背景音乐（深海氛围垫：实时合成，Cmaj7→Am7→Fmaj7→G7 无缝循环 + 水滴点缀） ----------
  audio.bgm = {
    on: false, iv: null, step: 0, _live: [],
    chords: [
      [261.63, 329.63, 392.00, 493.88], // Cmaj7
      [220.00, 261.63, 329.63, 392.00], // Am7
      [174.61, 220.00, 261.63, 349.23], // Fmaj7
      [196.00, 246.94, 293.66, 392.00]  // G7
    ],
    start: function () {
      if (this.on || audio.muted || !audio.ctx) return;
      this.on = true;
      var self = this;
      var playBar = function () {
        try {
          var c = audio.ctx, t0 = c.currentTime;
          var ch = self.chords[self.step % self.chords.length], i;
          // 柔和垫音（缓起缓落，4s 内收干净 → 循环无缝）
          for (i = 0; i < ch.length; i++) {
            var o = c.createOscillator(), g = c.createGain();
            o.type = 'sine'; o.frequency.value = ch[i];
            g.gain.setValueAtTime(0.0001, t0);
            g.gain.linearRampToValueAtTime(0.022, t0 + 1.4);
            g.gain.setValueAtTime(0.022, t0 + 2.4);
            g.gain.linearRampToValueAtTime(0.0001, t0 + 4.0);
            o.connect(g); g.connect(c.destination);
            o.start(t0); o.stop(t0 + 4.05);
            self._live.push({ o: o, g: g });
          }
          // 低音铺底
          var b = c.createOscillator(), bg = c.createGain();
          b.type = 'triangle'; b.frequency.value = ch[0] / 2;
          bg.gain.setValueAtTime(0.0001, t0);
          bg.gain.linearRampToValueAtTime(0.045, t0 + 1.2);
          bg.gain.setValueAtTime(0.045, t0 + 2.4);
          bg.gain.linearRampToValueAtTime(0.0001, t0 + 4.0);
          b.connect(bg); bg.connect(c.destination);
          b.start(t0); b.stop(t0 + 4.05);
          self._live.push({ o: b, g: bg });
          // 水滴点缀（随机高音滑音）
          if (Math.random() < 0.55) {
            var dl = 0.8 + Math.random() * 2.2, f0 = 900 + Math.random() * 700;
            var p = c.createOscillator(), pg = c.createGain();
            p.type = 'sine';
            p.frequency.setValueAtTime(f0, t0 + dl);
            p.frequency.exponentialRampToValueAtTime(f0 * 1.6, t0 + dl + 0.12);
            pg.gain.setValueAtTime(0.0001, t0 + dl);
            pg.gain.linearRampToValueAtTime(0.02, t0 + dl + 0.02);
            pg.gain.exponentialRampToValueAtTime(0.0001, t0 + dl + 0.5);
            p.connect(pg); pg.connect(c.destination);
            p.start(t0 + dl); p.stop(t0 + dl + 0.55);
            self._live.push({ o: p, g: pg });
          }
        } catch (e) {}
        if (self._live.length > 60) self._live.splice(0, self._live.length - 60);
        self.step++;
      };
      playBar();
      this.iv = setInterval(playBar, 4000);
    },
    stop: function () {
      if (this.iv) clearInterval(this.iv);
      this.iv = null; this.on = false;
      // 立即静音所有已排程的音符（否则最后一个小节还会余音最多 4 秒）
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

  var skillCharge = { swap: 0, ripple: 0, evap: 0 };
  var rippleMode = false; // 涟漪选位模式：点击画布指定波纹中心
  var dexLoaded = loadDex();
  var dexUnlocked = dexLoaded.u;
  var dexCounts = dexLoaded.c;
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

  // 背景气泡
  var bubbles = [];
  for (var bi = 0; bi < 14; bi++) {
    bubbles.push({
      x: Math.random() * C.W, y: Math.random() * C.H,
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
    nf.x = Math.random() * C.W;
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
      x: Math.random() * C.W, y: Math.random() * C.H,
      r: 0.8 + Math.random() * 1.5,
      ph: Math.random() * Math.PI * 2, sp: 1.5 + Math.random() * 2.5
    });
  }

  // 海草已按用户要求移除

  function rollTier() {
    var ws = C.spawnWeights, total = 0, i;
    for (i = 0; i < ws.length; i++) total += ws[i];
    var r = Math.random() * total;
    for (i = 0; i < ws.length; i++) { r -= ws[i]; if (r <= 0) return i; }
    return 0;
  }
  function rollSpecial() {
    if (Math.random() >= C.specialChance) return null;
    var r = Math.random();
    if (r < 0.34) return 'vortex';
    if (r < 0.67) return 'cloud';
    return 'ice';
  }
  function rollIron() { return level === 2 && Math.random() < C.iron.chance; } // 礁石仅无尽模式
  // 符文：普通水滴随机附带的道具属性，合成时为对应技能充能
  function rollRune() {
    if (Math.random() >= C.rune.chance) return null;
    var r = Math.random();
    if (r < C.rune.weights.swap) return 'swap';
    if (r < C.rune.weights.swap + C.rune.weights.ripple) return 'ripple';
    return 'evap';
  }
  function runeName(key) {
    for (var i = 0; i < C.skills.length; i++) if (C.skills[i].key === key) return C.skills[i].name;
    return '';
  }
  function runeColor(key) {
    return key === 'swap' ? '#8E6FC0' : (key === 'ripple' ? '#2FA8A0' : '#E2705E');
  }
  function ironCount() {
    var n = 0;
    for (var i = 0; i < phys.bodies.length; i++) if (phys.bodies[i].iron) n++;
    return n;
  }
  function createIron(x, y) {
    var b = phys.create(x, y, 0, 0, 0);
    b.iron = true;
    b.tier = -1;
    b.r = C.iron.r;
    b.m = C.iron.r * C.iron.r * C.iron.massMult; // 大质量 → 下落时把水滴挤开（砸穿效果）
    return b;
  }
  function specialLabel(sp) {
    return sp === 'vortex' ? '漩涡滴' : (sp === 'cloud' ? '雨云滴' : '冰晶滴');
  }
  function specialColor(sp) {
    return sp === 'vortex' ? '#6A46B0' : (sp === 'cloud' ? '#3C6EAA' : '#2E8FB8');
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
      if (p.y < -8) { p.y = C.H + 8; p.x = Math.random() * C.W; }
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
      if (jl.y < 170) { jl.y = C.H * 0.88; jl.x = 50 + Math.random() * (C.W - 100); }
    }
    for (i = 0; i < glitters.length; i++) {
      var gl = glitters[i];
      gl.y -= gl.sp * dt;
      if (gl.y < -6) { gl.y = C.H + 6; gl.x = Math.random() * C.W; }
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
    var gain = Math.round(quest.rewardScore * scoreMult);
    score += gain;
    scoreBump = 0.35;
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
    for (i = 0; i < bs.length; i++) {
      var a = bs[i];
      if (used[a.id] || a.special || a.frozen > 0 || a.iron) continue;
      for (j = i + 1; j < bs.length; j++) {
        var b = bs[j];
        if (used[b.id] || b.special || b.frozen > 0 || b.iron || b.tier !== a.tier) continue;
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
      if (!ia.iron || used[ia.id] || ia.frozen > 0) continue;
      for (j = i + 1; j < bs.length; j++) {
        var ib = bs[j];
        if (!ib.iron || used[ib.id] || ib.frozen > 0) continue;
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
    var gain = Math.round(C.iron.pairScore * scoreMult);
    score += gain;
    scoreBump = 0.3;
    if (score > best) { best = score; saveNum('mg_best', best); }
    addPopup(mx, my - b.r - 12, '礁石相消', true, 0);
    addPopup(mx, my - b.r + 10, '+' + gain, false, 0);
    burstIron(mx, my);
    burstIron(a.x, a.y);
    burstIron(b.x, b.y);
    parts.push({ type: 'ring', x: mx, y: my, r: 22, life: 0.5, max: 0.5, color: '#9AA7B4' });
    addShake(5, 0.3);
    audio.blip(320, 0.3, 'square', 0.12, 0.5);
    audio.blip(180, 0.35, 'sine', 0.15, 0.55);
  }

  function doMerge(a, b) {
    var mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    var vx = (a.vx + b.vx) / 2, vy = (a.vy + b.vy) / 2;
    var tier = a.tier;
    phys.remove(a); phys.remove(b);
    // 符文充能：参与合成的水滴若带符文，为对应技能 +1
    if (a.rune) chargeRune(a, mx, my);
    if (b.rune) chargeRune(b, mx, my);

    combo++; comboTimer = C.comboWindow;
    if (combo > maxCombo) maxCombo = combo;
    var mult = Math.min(combo, C.comboMaxMult);

    // 顶级「沧海」两两相消 → 汇入海域
    if (tier >= T.length - 1) {
      seaCount++;
      scoreMult = 1 + seaCount * C.seaMultStep;
      var gain = Math.round((T[tier].score * 4 + C.seaBonus) * mult * scoreMult);
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

    var gain2 = Math.round(T[nt].score * mult * scoreMult);
    score += gain2;
    scoreBump = 0.3;
    if (score > best) { best = score; saveNum('mg_best', best); }

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
          vx: Math.cos(ang + 2) * 60, vy: Math.sin(ang + 2) * 60, r: 2, life: 0.3, max: 0.3, color: '#9B7FD4' });
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
    parts.push({ type: 'ring', x: b.x, y: b.y, r: 16, life: 0.45, max: 0.45, color: '#9B7FD4' });
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
    return C.floorY - tide.progress * (C.floorY - C.containerTop) * C.tide.waterMax;
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
        tide.timer = C.tide.cycleInterval;
      }
    }
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
  function flashSkill(idx, text) {
    addPopup(SKILL_BTNS[idx].cx, SKILL_BTNS[idx].cy - 46, text, false, 0);
  }
  function useSkill(key) {
    var i;
    if (key === 'evap') {
      if (evapMode) { evapMode = false; return; }
      if (skillCharge.evap < skillCost('evap')) { flashSkill(2, '符文 ' + skillCharge.evap + '/' + skillCost('evap')); return; }
      evapMode = true;
      rippleMode = false;
      return;
    }
    if (key === 'ripple' && rippleMode) { rippleMode = false; return; } // 再点按钮取消选位
    if (skillCharge[key] < skillCost(key)) {
      flashSkill(key === 'swap' ? 0 : 1, '符文 ' + skillCharge[key] + '/' + skillCost(key));
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
    }
  }
  // 在指定位置释放双重波纹（首波强推 + 延迟次波再推）
  function castRipple(x, y) {
    x = Math.max(12, Math.min(C.W - 12, x));
    y = Math.max(C.containerTop + 30, Math.min(C.floorY - 16, y));
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
  function checkDanger(dt) {
    var bs = phys.bodies;
    for (var i = 0; i < bs.length; i++) {
      var b = bs[i];
      if (b.frozen > 0) continue; // 冻结滴视为"封存"，不判负
      if (b.grace > 0) { b.dangerT = 0; continue; }
      var sp = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
      var above = (b.y - b.r) < C.dangerY;
      if (above && sp < C.dangerSpeed * 2) {
        // 越线且基本静止（阈值放宽一倍：堆顶微颤不算"在动"）
        b.dangerT += dt;
        if (b.dangerT > C.dangerTime) { gameOver(); return; }
      } else if (above) {
        // 越线但被明显扰动（滚动/被推）：计时缓慢消退而非清零，避免永远攒不满
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
    saveDex();
    audio.over();
  }

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
    skillCharge = { swap: 0, ripple: 0, evap: 0 };
    seaCount = 0; scoreMult = 1;
    evapMode = false; rippleMode = false; rainHint = 0;
    level = 1; levelTime = C.level1.time; failReason = ''; levelBanner = 0;
    levelElapsed = 0; runCounted = 0;
    nextTier = rollTier();
    nextSpecial = rollSpecial();
    nextRune = nextSpecial ? null : rollRune();
    nextIron = rollIron();
    aimX = C.W / 2;
    popups.length = 0; parts.length = 0; rippleQueue.length = 0;
    tide.phase = 'idle'; tide.timer = C.tide.firstDelay; tide.progress = 0; tide.banner = 0;
    makeQuest(0);
    state = 'play';
  }

  function buildOverButtons() {
    overButtons = [];
    var bw = 240, bh = 48, gap = 14, x = (C.W - bw) / 2;
    // 可用区：统计文字之下 → 面板底部留白；按钮组在该区内垂直居中
    var areaTop = 170 + 170, areaBottom = 170 + 380 - 26;
    var n = (reviveCount < 2 ? 1 : 0) + (doubled ? 0 : 1) + 1;
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
    overButtons.push({ x: x, y: y, w: bw, h: bh, label: '重新开始', action: restart });
  }

  // ---------- 命中区域（圆形按钮） ----------
  var MUTE = { cx: C.W - 24, cy: 36, r: 13, pressT: 0 };
  var bookBtn = { cx: 46, cy: 688, r: 20, pressT: 0 };
  var restartBtn = { cx: C.W - 24, cy: 688, r: 16, pressT: 0 }; // 游戏内重开（带确认），右下角
  var SKILL_BTNS = [
    { key: 'swap',   cx: 140, cy: 688, r: 20, pressT: 0 },
    { key: 'ripple', cx: 210, cy: 688, r: 20, pressT: 0 },
    { key: 'evap',   cx: 280, cy: 688, r: 20, pressT: 0 }
  ];
  var DEX_PANEL = { x: 26, y: 78, w: 368, h: 560 };
  var dexCloseBtn = { x: DEX_PANEL.x + DEX_PANEL.w - 64, y: DEX_PANEL.y + 8, w: 54, h: 26 };

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
      x: (e.clientX - rect.left) * (C.W / rect.width),
      y: (e.clientY - rect.top - view.dy) / view.s // 垂直方向减去延伸带偏移
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
    if (nextIron && ironCount() < C.iron.maxActive) {
      createIron(clampAim(aimX), C.spawnY);
      addPopup(C.W / 2, 210, '礁石来袭！', true, 0); // 居中净空带，避开顶部 HUD
      addShake(2, 0.15);
    } else {
      nb = phys.create(clampAim(aimX), C.spawnY, nextTier, 0, 0);
      if (nextSpecial) { nb.special = nextSpecial; nb.specialT = 0; }
      else if (nextRune) {
        nb.rune = nextRune;
        if (!runeHintShown) {
          runeHintShown = true;
          addPopup(C.W / 2, 244, '带符文的水滴：合成即可为技能充能', false, 0);
        }
      }
      unlockTier(nextTier);
    }
    cooldown = C.dropCooldown;
    audio.drop();
    nextTier = rollTier();
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
    if (dexOpen) {
      if (inRect(p, dexCloseBtn) || !inRect(p, DEX_PANEL)) dexOpen = false;
      return;
    }
    if (inMute(p)) { MUTE.pressT = 0.16; audio.muted = !audio.muted; saveFlag('mg_mute', audio.muted); if (audio.muted) audio.bgm.stop(); else audio.bgm.start(); return; }
    if (inCircle(p, bookBtn)) { bookBtn.pressT = 0.16; dexOpen = true; return; }
    if (state === 'play') {
      if (inCircle(p, restartBtn)) { restartBtn.pressT = 0.16; confirmOpen = true; return; }
      for (var i = 0; i < SKILL_BTNS.length; i++) {
        if (inCircle(p, SKILL_BTNS[i])) { SKILL_BTNS[i].pressT = 0.16; useSkill(SKILL_BTNS[i].key); return; }
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
    if (state !== 'play' || adOverlay || dexOpen || evapMode || confirmOpen) return;
    aimX = clampAim(p.x);
  });
  canvas.addEventListener('pointerup', function (e) {
    if (!aiming || state !== 'play' || adOverlay || dexOpen || evapMode || rippleMode || confirmOpen) { aiming = false; return; }
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

    processMerges();
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

  // ---------- 背景：深海渐变 + 顶部柔光 + 波光 + 气泡 ----------
  function drawBackground() {
    // 深海渐变
    var bg = ctx.createLinearGradient(0, 0, 0, C.H);
    bg.addColorStop(0, '#D8F1FD');
    bg.addColorStop(0.4, '#B8E4F8');
    bg.addColorStop(0.75, '#97CDEB');
    bg.addColorStop(1, '#7CB6DE');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, C.W, C.H);

    // 顶部阳光光晕
    var sun = ctx.createRadialGradient(C.W * 0.5, -30, 20, C.W * 0.5, -30, 300);
    sun.addColorStop(0, 'rgba(255,255,255,0.55)');
    sun.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sun;
    ctx.fillRect(0, 0, C.W, 300);

    // 柔和顶部光感（径向光晕，无生硬斜向条带）
    var glowL = ctx.createRadialGradient(C.W * 0.22, -50, 10, C.W * 0.22, -50, 280);
    glowL.addColorStop(0, 'rgba(255,255,255,0.34)');
    glowL.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = glowL;
    ctx.fillRect(0, 0, C.W, 300);
    var glowR = ctx.createRadialGradient(C.W * 0.8, -50, 10, C.W * 0.8, -50, 280);
    glowR.addColorStop(0, 'rgba(255,255,255,0.26)');
    glowR.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = glowR;
    ctx.fillRect(0, 0, C.W, 300);

    // 远处缓慢漂移的水波纹
    ctx.strokeStyle = 'rgba(255,255,255,0.10)';
    ctx.lineWidth = 1.5;
    for (var ri = 0; ri < 3; ri++) {
      var rx = ((time * (10 + ri * 6) + ri * 240) % (C.W + 300)) - 150;
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
    for (var x = 0; x <= C.W; x += 8) {
      var y = 16 + Math.sin(x * 0.05 + time * 1.6) * 3 + Math.sin(x * 0.11 - time * 1.1) * 2;
      if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.globalAlpha = 0.25;
    ctx.beginPath();
    for (x = 0; x <= C.W; x += 8) {
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
  }

  // ---------- 水滴渲染（变形 / 拖尾 / 冻结 / 弹跳） ----------
  function popScale(b) {
    if (!b.popT || b.popT <= 0) return 1;
    var t = b.popT / 0.28;
    if (t > 0.6) return 0.6 + (1.15 - 0.6) * (1 - t) / 0.4;
    return 1.15 - 0.15 * (0.6 - t) / 0.6;
  }

  function drawBall(b, alpha) {
    if (b.iron) { drawIronBall(b, alpha); return; }
    var t = T[b.tier];
    var s = popScale(b);
    var r = b.r * s;
    var speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);

    // 落地软阴影（绝对坐标，先画）
    var floorDist = C.floorY - (b.y + b.r);
    if (floorDist < 30 && floorDist > -b.r) {
      var sa = 0.18 * (1 - Math.max(0, floorDist) / 30);
      ctx.fillStyle = 'rgba(10,40,70,' + sa + ')';
      ctx.beginPath();
      ctx.ellipse(b.x, C.floorY - 2, b.r * 0.85, b.r * 0.2, 0, 0, Math.PI * 2);
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
    var floorDist = C.floorY - (b.y + b.r);
    if (floorDist < 30 && floorDist > -b.r) {
      var sa = 0.22 * (1 - Math.max(0, floorDist) / 30);
      ctx.fillStyle = 'rgba(10,20,30,' + sa + ')';
      ctx.beginPath();
      ctx.ellipse(b.x, C.floorY - 2, b.r * 0.9, b.r * 0.2, 0, 0, Math.PI * 2);
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

  function drawVortexMark(r) {
    ctx.save();
    ctx.rotate(time * 4);
    ctx.strokeStyle = 'rgba(120,80,190,0.85)';
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
    ctx.lineTo(x, C.floorY);
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
    var floorY = C.floorY, FH = 12;
    // 床面：圆角横条（两端探出画布，营造开放感）
    // （危险区渐晕已并入 drawDangerLine，随危险度动态变化）
    var fg = ctx.createLinearGradient(0, floorY, 0, floorY + FH + 6);
    fg.addColorStop(0, 'rgba(255,255,255,0.92)');
    fg.addColorStop(0.5, 'rgba(168,214,240,0.92)');
    fg.addColorStop(1, 'rgba(108,174,214,0.92)');
    ctx.fillStyle = fg;
    roundRect(-6, floorY, C.W + 12, FH + 6, 6); ctx.fill();
    ctx.strokeStyle = 'rgba(70,130,180,0.4)';
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

    // 海底沙床（底栏下方空档，不进游戏区）
    var sy0 = floorY + FH + 6;
    var sand = ctx.createLinearGradient(0, sy0, 0, C.H);
    sand.addColorStop(0, 'rgba(216,233,224,0.95)');
    sand.addColorStop(1, 'rgba(152,192,200,0.95)');
    ctx.fillStyle = sand;
    ctx.fillRect(0, sy0, C.W, C.H - sy0);
    // 沙丘
    ctx.fillStyle = 'rgba(238,246,240,0.7)';
    ctx.beginPath(); ctx.ellipse(C.W * 0.2, sy0 + 12, 95, 13, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(C.W * 0.74, sy0 + 14, 115, 15, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(228,240,234,0.55)';
    ctx.beginPath(); ctx.ellipse(C.W * 0.47, sy0 + 18, 85, 11, 0, 0, Math.PI * 2); ctx.fill();
    // 卵石
    ctx.fillStyle = 'rgba(110,150,168,0.4)';
    var peb = [[24, 688, 3], [66, 700, 2], [112, 686, 2.5], [172, 702, 2], [246, 690, 2.5], [306, 700, 2], [352, 686, 2.5], [404, 696, 2.2]];
    for (var pi = 0; pi < peb.length; pi++) {
      ctx.beginPath(); ctx.arc(peb[pi][0], peb[pi][1], peb[pi][2], 0, Math.PI * 2); ctx.fill();
    }
    drawStarfish(88, 700, 9);
    drawShell(330, 702, 9);
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
    var g = ctx.createLinearGradient(0, wy, 0, C.floorY);
    g.addColorStop(0, 'rgba(90,180,235,0.28)');
    g.addColorStop(1, 'rgba(30,110,190,0.5)');
    ctx.fillStyle = g;
    ctx.fillRect(left, wy, right - left, C.floorY - wy);
  }
  function drawWaterFront() {
    if (tide.progress <= 0.01) return;
    var wy = tideY(), left = C.wall, right = C.W - C.wall;
    // 半透明覆盖（浸没部分染色）
    ctx.fillStyle = 'rgba(80,170,230,0.15)';
    ctx.fillRect(left, wy, right - left, C.floorY - wy);
    // 水面波浪线
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (var x = left; x <= right; x += 6) {
      var y = wy + Math.sin(x * 0.08 + time * 3) * 2.5 + Math.sin(x * 0.17 - time * 2) * 1.5;
      if (x === left) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    // 浪尖泡沫
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    for (x = left; x <= right; x += 26) {
      var fy = wy + Math.sin(x * 0.08 + time * 3) * 2.5 - 3;
      ctx.beginPath(); ctx.arc(x, fy, 1.6, 0, Math.PI * 2); ctx.fill();
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
    ctx.restore();
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
    ctx.translate(-c.cx, -c.cy);
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
    ctx.fillRect(0, 0, C.W, C.H);
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
    }
    ctx.lineCap = 'butt';
  }

  function drawSkillBar() {
    // 渐变底带从床面之下开始，不遮挡床面图形
    var g = ctx.createLinearGradient(0, 664, 0, 716);
    g.addColorStop(0, 'rgba(255,255,255,0.0)');
    g.addColorStop(0.3, 'rgba(255,255,255,0.55)');
    g.addColorStop(1, 'rgba(255,255,255,0.7)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 664, C.W, 56);

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
      if ((cfg.key === 'evap' && evapMode) || (cfg.key === 'ripple' && rippleMode)) {
        ctx.strokeStyle = '#E24B4A'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(btn.cx, btn.cy, btn.r + 3, 0, Math.PI * 2); ctx.stroke();
      }
      // 名称标签：保持完整可见（y=717，画布 720 内）
      ctx.fillStyle = '#3E6E90';
      ctx.font = '10px system-ui, sans-serif';
      ctx.fillText(cfg.name, btn.cx, btn.cy + btn.r + 9);
    }

    if (seaCount > 0) {
      ctx.save();
      ctx.translate(C.W - 64, 688);
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

  // ---------- 图鉴 ----------
  function drawDex() {
    ctx.fillStyle = 'rgba(10,40,70,0.6)';
    ctx.fillRect(0, 0, C.W, C.H);
    panel(DEX_PANEL.x, DEX_PANEL.y, DEX_PANEL.w, DEX_PANEL.h, 14, 0.96);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#155A8A';
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.fillText('海域图鉴', C.W / 2, DEX_PANEL.y + 34);
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillStyle = '#4A7FA0';
    ctx.fillText('汇入海域 ×' + seaCount + ' · 全局得分 +' + Math.round((scoreMult - 1) * 100) + '% · 累计得分 ' + totalScore(), C.W / 2, DEX_PANEL.y + 54);

    ctx.fillStyle = '#2E86B4';
    roundRect(dexCloseBtn.x, dexCloseBtn.y, dexCloseBtn.w, dexCloseBtn.h, 6); ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillText('关闭', dexCloseBtn.x + dexCloseBtn.w / 2, dexCloseBtn.y + 17);

    for (var t = 0; t < T.length; t++) {
      var col = t % 3, row = Math.floor(t / 3);
      var cx0 = DEX_PANEL.x + 14 + col * 114;
      var cy0 = DEX_PANEL.y + 74 + row * 158;
      ctx.fillStyle = 'rgba(46,134,180,0.08)';
      roundRect(cx0, cy0, 106, 148, 8); ctx.fill();
      var unlocked = !!dexUnlocked[t];
      var bx = cx0 + 53, by = cy0 + 44;
      if (unlocked) {
        drawBall({ x: bx, y: by, r: 26, tier: t, vx: 0, vy: 0 }, 1);
      } else {
        ctx.fillStyle = '#B8CBD8';
        ctx.beginPath(); ctx.arc(bx, by, 26, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#8AA5B8';
        ctx.font = 'bold 18px system-ui, sans-serif';
        ctx.fillText('?', bx, by + 6);
      }
      ctx.fillStyle = unlocked ? '#155A8A' : '#8AA5B8';
      ctx.font = 'bold 14px system-ui, sans-serif';
      ctx.fillText(unlocked ? T[t].name : '？？？', bx, cy0 + 94);
      ctx.font = '12px system-ui, sans-serif';
      ctx.fillStyle = '#4A7FA0';
      ctx.fillText(unlocked ? ('分值 ' + T[t].score + ' · 合成 ' + (dexCounts[t] || 0) + ' 次') : '未解锁', bx, cy0 + 114);
      if (unlocked) {
        ctx.fillStyle = '#1E7A6F';
        ctx.fillText('已收录', bx, cy0 + 134);
      } else if ((C.dexGate[t] || 0) > 0) {
        // 积分门槛提示：已达门槛但未合成出 → "待合成"；未达门槛 → 显示所需累计分
        var gate = C.dexGate[t] || 0;
        ctx.fillStyle = totalScore() >= gate ? '#C97A10' : '#B0584A';
        ctx.fillText(totalScore() >= gate ? '已达标 · 待合成' : ('累计 ' + gate + ' 分解锁'), bx, cy0 + 134);
      }
    }
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
    ctx.fillStyle = 'rgba(0,0,0,0.72)';
    ctx.fillRect(0, 0, C.W, C.H);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillText('广告位演示（激励视频）', C.W / 2, C.H / 2 - 30);
    ctx.font = '15px system-ui, sans-serif';
    ctx.fillText(adOverlay.label + ' · ' + adOverlay.t.toFixed(1) + 's 后发放奖励', C.W / 2, C.H / 2 + 4);
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText('上线微信时替换为 wx.createRewardedVideoAd', C.W / 2, C.H / 2 + 34);
  }

  function drawOver() {
    buildOverButtons();
    ctx.fillStyle = 'rgba(10,40,70,0.55)';
    ctx.fillRect(0, 0, C.W, C.H);

    var pw = 320, ph = 380, px = (C.W - pw) / 2, py = 170;
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

  // ---------- 主渲染 ----------
  function render() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (shakeT > 0) {
      var s = shakeAmp * (shakeT / 0.4);
      ctx.translate((Math.random() - 0.5) * 2 * s, (Math.random() - 0.5) * 2 * s);
    }

    drawBackground();
    drawContainer();
    drawDangerLine();
    drawWaterBack();

    var i;
    for (i = 0; i < phys.bodies.length; i++) drawBall(phys.bodies[i], 1);

    drawWaterFront();

    if (state === 'play' && !adOverlay && !evapMode && !rippleMode && !confirmOpen) {
      drawGhost(aimX, C.spawnY, nextTier, cooldown > 0 ? 0.25 : 0.6);
    }

    drawFx();

    if (evapMode) {
      ctx.fillStyle = 'rgba(10,40,70,0.18)';
      ctx.fillRect(0, 0, C.W, C.H);
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
      ctx.fillRect(0, 0, C.W, C.H);
      var rx = Math.max(12, Math.min(C.W - 12, lastPointer.x < 0 ? C.W / 2 : lastPointer.x));
      var ry = Math.max(C.containerTop + 30, Math.min(C.floorY - 16, lastPointer.y < 0 ? (C.containerTop + C.floorY) / 2 : lastPointer.y));
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

    // 暗角（纵深）
    var vg = ctx.createRadialGradient(C.W / 2, C.H / 2, C.H * 0.34, C.W / 2, C.H / 2, C.H * 0.74);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(6,28,52,0.16)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, C.W, C.H);

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
  }

  // 把游戏区合成到可见画布：宽度上游戏区占满画布，底部锚定（海底贴底、
  // 其他区域位置固定），仅顶部空档用场景最上 2px 拉伸延伸（水滴滴落区域延伸）
  function composite() {
    var w = canvas.width, h = canvas.height;
    var gw = C.W * view.s * dpr, gh = C.H * view.s * dpr;
    var dx = view.dx * dpr, dy = view.dy * dpr;
    var slice = 2 * dpr;
    vctx.imageSmoothingEnabled = true;
    if (dy > 0) vctx.drawImage(scene, 0, 0, scene.width, slice, dx, 0, gw, dy); // 仅顶部延伸
    if (dx > 0) {
      vctx.drawImage(scene, 0, 0, slice, scene.height, 0, dy, dx, gh);
      vctx.drawImage(scene, scene.width - slice, 0, slice, scene.height, dx + gw, dy, w - dx - gw, gh);
    }
    vctx.drawImage(scene, 0, 0, scene.width, scene.height, dx, dy, gw, gh); // 游戏区本体
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
    composite();
  }

  makeQuest(0);
  requestAnimationFrame(frame);
})();
