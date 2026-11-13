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
  var runRecorded = false;
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
    if (!runRecorded) {
      runRecorded = true;
      recent.push({ score: score, sea: seaStage(), ts: Date.now() });
      if (recent.length > RECENT_MAX) recent = recent.slice(-RECENT_MAX);
      saveRecent();
    }
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
    if (runRecorded) { runRecorded = false; recent = recent.slice(0, -1); saveRecent(); }
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
    runRecorded = false;
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
