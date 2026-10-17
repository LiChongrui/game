// 水滴合成深海 - systems：游戏状态 / 输入 / 合成 / 技能 / 潮汐 / 海域事件 / 图鉴数据 / 主更新
// 模块加载顺序 2/4（依赖 core.js：canvas、audio、存储助手）。顶层 var 初始化
// （rollTier 等）调用的函数与本文件同域提升，或来自已加载的 core.js。
// 水滴合成深海 - 游戏主逻辑
// 输入 / 合成 / 技能 / 图鉴 / 海域 / 特殊水滴(漩涡·雨云·冰晶) / 潮汐 / 任务链 / 渲染 / 音效 / 广告占位
// 全部 UI 画在 canvas 内（含按钮命中判定），便于后续原样移植到微信小游戏（无 DOM 环境）
  // ---------- 状态 ----------
  var phys = new MG.Physics();
  var state = 'menu'; // 开机先停在开始界面（主流小游戏设计：标题 + 开始按钮）
  var menuStartBtn = { x: C.W / 2 - 110, y: 396, w: 220, h: 60 }; // 「开始游戏」主按钮
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
  var reviveCount = 0, doubled = false; // 每局可无限复活（看广告）
  var runBuffered = false; // 每局一次「深流缓冲」是否已用
  var popups = [], parts = [];
  var rippleQueue = []; // 待发的涟漪次波 { t, x, y }
  var time = 0;
  var overButtons = [];
  var shakeT = 0, shakeAmp = 0;
  var dangerAlert = 0; // 越线判定进度 0..1（checkDanger 每帧写入，警戒线渲染读取）

  var skillCharge = { swap: 0, ripple: 0, evap: 0, flow: 0 };
  // 宝箱（无尽模式）：定期沉入一只，限时点击开启随机奖励
  var chest = null;
  var chestTimer = 26 + Math.random() * 20;
  var questStaleT = 4; // 滞留任务检查计时
  // 随机深海事件（无尽模式）：涌泉 / 甘霖 / 漩涡风暴
  var seaEvent = { timer: 24 + Math.random() * 14, type: null, t: 0, t0: 6, x: 0, y: 0, data: null };
  var rippleMode = false; // 涟漪选位模式：点击画布指定波纹中心
  var flowMode = false;   // 水流模式：点选两枚水滴交换位置（布局型道具）
  var flowPick = null;    // 水流模式已选中的第一枚水滴
  var dexLoaded = loadDex();
  var dexUnlocked = dexLoaded.u;
  var dexCounts = dexLoaded.c;
  var dexSpecial = dexLoaded.sp;   // 特殊水滴发现记录 { vortex:1, iron:1, ... }
  // 生涯最高累计分（跨刷新持久）：图鉴"已抵达"按它判定——发现过的收集永不回退；
  // 本局玩法（背景海域/特殊滴池/潮位）仍按会话内 totalScore 重新潜入，两者各司其职
  var careerPeak = parseFloat(MG.platform.get('mg_peak')) || 0;
  var dexTab = 0;                  // 图鉴页签：0=图鉴 1=成就 2=每日 3=榜单
  var dexSelSp = -1;               // 图鉴页当前选中的特殊滴说明（-1=未选）
  var dexSec = 0;                  // 图鉴主页分节：0=合成链 1=海域演进（特殊滴槽位并入海域行）
  var dexSelTier = -1;             // 选中的合成链档位（-1 未选）
  var dexSelStage = -1;            // 选中的海域阶段（-1 未选）
  // 跨局终身统计（成就进度用）：宝箱/涨潮/礁石对/彩虹合成/任务/连击/单局最高分
  var lifeStats = (function () {
    var d = { chest: 0, tide: 0, ironPair: 0, rainbow: 0, quest: 0, combo: 0, best: 0 };
    var s = dexLoaded.stats || {};
    for (var k in d) if (typeof s[k] === 'number' && s[k] > d[k]) d[k] = s[k];
    return d;
  })();
  var achDone = dexLoaded.ach;     // 已达成成就 { id: 1 }
  var colClaimed = dexLoaded.col;  // 图鉴收集里程碑领取记录 { m25:1, m50:1, ... }
  // ---------- 离线收益：按离开时长结算（开局自动入账，走普通过分管线可联动图鉴/收集） ----------
  var offlineGain = (function () {
    var seen = parseInt(MG.platform.get('mg_seen')) || 0;
    var now = Date.now();
    saveNum('mg_seen', now);   // 启动即刷新心跳
    if (!seen) return null;    // 首次游玩无收益
    var rawMins = Math.floor((now - seen) / 60000);
    if (rawMins < C.offline.minMins) return null; // 太短不触发（防刷新页面反复白嫖）
    var mins = Math.min(rawMins, C.offline.capMins);
    var anchor = Math.max(parseInt(MG.platform.get('mg_best')) || 0, lifeStats.best || 0);
    var perMin = C.offline.perMinBase + Math.floor(anchor * C.offline.bestRatio);
    return { mins: rawMins, gain: perMin * mins };
  })();
  var seenTick = 0; // 游玩期心跳计时（30s 刷 mg_seen，防“玩数小时后关页”把旧 seen 算成长离线）
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
  var achOpen = false; // 成就页（成就/每日/榜单）——与图鉴拆分为两个独立入口
  var lastPointer = { x: -100, y: -100 };

  var quest = null, questDepth = 0;

  // 关卡状态：1 = 限时得分关（低难度），2 = 无尽模式（礁石/潮汐齐全，计时改为累计进行时长）
  var levelElapsed = 0;                                  // 本局已进行时长（顶部计时显示用）
  var lifeScore = 0, runCounted = 0; // 累计分（图鉴门槛用）：刷新页面即重新计，不跨刷新保留
  function totalScore() { return lifeScore + (score - runCounted); }

  // 潮汐状态
  var tide = { phase: 'idle', timer: C.tide.firstDelay, progress: 0, banner: 0 };
  var achTick = 0; // 成就周期检查计时
  // 无尽模式渐进加压：随时长线性到满（潮汐更频/礁石更多/投放向高级倾斜）
  var endlessT = 0, rampStage = 0;
  var climaxMark = 0; // 高潮时刻：上次触发时的分数标记
  var tideGateHint = false; // 潮汐限定合成：一次性提示
  var tideKillHint = false; // 潮汐可致死（浮起越线判负）：一次性提示
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
    return Math.min(1, endlessT / (C.ramp.minutes * 60));
  }
  // 成就永续加成查询（勋章变成长线）
  function perkOn(id) { return !!achDone[id]; }
  function perkMult() { return (achDone.tide12 && tide.progress > 0.2) ? 1.1 : 1; }
  // 数值封顶：所有乘区叠乘后总倍率不超过 C.multCap（防成就/海域加成叠乘导致分数膨胀）
  // 二周目词缀的得分倍率并入乘区；词缀局上限额外 +3（高危要有高收益）
  function cm(m) { return Math.min(m * (ng.active ? ng.active.mult : 1), C.multCap + (ng.active ? 3 : 0)); }

  // 技能渐进解锁：按累计得分逐个点亮（换滴开局即有，涟漪/蒸发/水流递进）
  function skillUnlocked(key) { return totalScore() >= (C.skillUnlock[key] || 0); }

  // ---------- 二周目「深渊潜航」（累计 5 万解锁：带词缀的高危高收益无尽局，结算页开启） ----------
  var ng = { unlocked: loadFlag('mg_ng'), active: null };
  var ngOpen = false, ngPicks = [];   // 词缀三选一弹窗
  var ngPickRects = [];               // 三张词缀卡的命中区（draw 时填充）
  var GRAV0 = C.gravity;              // 基准重力（词缀局按倍率改写，重开恢复）
  function ngStartRun(affix, fromDaily) {
    ng.active = affix;
    ng.fromDaily = !!fromDaily;
    C.gravity = GRAV0 * (affix.grav || 1);
    restart();
    ng.active = affix;                 // restart 会清 active，重设
    ng.fromDaily = !!fromDaily;
    C.gravity = GRAV0 * (affix.grav || 1);
    addPopup(C.W / 2, 300, (fromDaily ? '每日挑战 ·「' : '深渊潜航 ·「') + affix.name + '」' + (fromDaily ? '' : '×' + affix.mult), true, 0);
    ngOpen = false;
  }
  function ngEndRun() {
    if (!ng.active) return;
    ng.active = null;
    ng.fromDaily = false;
    C.gravity = GRAV0;
  }
  // 词缀三选一：从词缀池随机抽 3 张
  function openNgPick() {
    var pool = C.ng.affixes.slice(), picks = [];
    while (picks.length < 3 && pool.length) picks.push(pool.splice((Math.random() * pool.length) | 0, 1)[0]);
    ngPicks = picks;
    ngPickRects = [];
    ngOpen = true;
    audio.blip(460, 0.12, 'sine', 0.08, 0.6);
  }

  // 海域演进：累计分跨过里程碑改变世界（背景色调随阶段加深 + 称号）
  var stageSeen = -1; // 已提示过的阶段（会话内）
  var seaFade = null; // 海域换色渐变 { from, to, t, dur }：跨里程碑时背景平滑过渡而非跳变
  function seaStage() {
    var s = 0, ts = totalScore();
    for (var i = C.seaStages.length - 1; i >= 0; i--) { if (ts >= C.seaStages[i].at) { s = i; break; } }
    return s;
  }
  // 渲染层查询当前换色进度：进行中返回 { from, to, k }（k 为缓动后的插值系数），静止返回 null
  function seaBlend() {
    if (!seaFade) return null;
    var p = seaFade.t / seaFade.dur;
    if (p >= 1) return null;
    p = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; // easeInOutQuad
    return { from: seaFade.from, to: seaFade.to, k: p };
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
  function loadDaily() { return MG.platform.getJSON('mg_daily', null); }
  function saveDaily() { MG.platform.setJSON('mg_daily', daily); }
  function buildDailyTasks(date, rnd, streakNow) {
    // 难度随连续天数递进（1x → 3x），星数标记难度，奖励同步分级
    var f = 1 + Math.min(2, (streakNow || 0) * 0.34);
    var stars = f < 1.5 ? 1 : (f < 2.5 ? 2 : 3);
    var mn = function (v) { return Math.max(1, Math.round(v * f)); };
    var t1 = { type: 'merge', tier: 1 + Math.floor(rnd() * 3), need: mn(6 + Math.floor(rnd() * 5)), stars: stars };
    t1.text = '合成 ' + t1.need + ' 个「' + T[t1.tier].name + '」';
    var t2 = { type: 'combo', need: mn(3 + Math.floor(rnd() * 3)), stars: stars };
    t2.text = '达成 ' + t2.need + ' 连击';
    var extras = [
      { type: 'chest', need: Math.min(3, mn(1)), text: '开启宝箱' },
      { type: 'tide',  need: mn(2), text: '经历涨潮' },
      { type: 'iron',  need: Math.min(3, mn(1)), text: '消除礁石' }
    ];
    var ex = extras[Math.floor(rnd() * extras.length)];
    var t3 = { type: ex.type, need: ex.need, stars: stars };
    t3.text = ex.text + ' ×' + t3.need;
    return [t1, t2, t3];
  }
  var daily = (function () {
    var d = loadDaily(), today = todayStr();
    if (!d || d.date !== today) {
      var streak = (d && d.date === yesterdayStr()) ? (d.streak || 0) : 0; // 断签清零
      var rnd = mulberry(dateSeed(today));
      var fresh = { date: today, streak: streak, streakToday: false, tasks: buildDailyTasks(today, rnd, streak), prog: [0, 0, 0], done: [false, false, false], allDone: false };
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
      if (type === 'combo') daily.prog[i] = Math.min(t.need, Math.max(daily.prog[i], n || 0)); // 连击取峰值
      else daily.prog[i] = Math.min(t.need, daily.prog[i] + (n || 1));
      if (daily.prog[i] >= t.need) {
        daily.done[i] = true;
        // 奖励随任务难度星数分级（★ ×1 · ★★ ×1.5 · ★★★ ×2）
        var gain = Math.round(C.daily.rewardScore * (1 + ((t.stars || 1) - 1) * 0.5) * scoreMult);
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

  // ---------- 每日挑战（每天一局全服同规则的词缀挑战局：达到目标分即完成） ----------
  // 复用「深渊潜航」词缀管线（重力/潮汐/暗礁/冰冻/倍率全部已实现），另配两条更凶的每日专属词缀；
  // 完成状态持久化（mg_dchal），连续完成天数递增奖励；进行中的挑战局不持久化（刷新即丢，可重试）
  var DCHAL_AFFIXES = [
    { id: 'heavy',   name: '重压之海', desc: '重力 +25%',              grav: 1.25, mult: 1.5 },
    { id: 'storm',   name: '疾风骤雨', desc: '潮汐间隔 -40%',          tideInt: 0.6, mult: 1.6 },
    { id: 'reef',    name: '暗礁密布', desc: '礁石概率 ×2',            ironX: 2, mult: 1.5 },
    { id: 'frost',   name: '冰封之海', desc: '水滴 15% 落水即冻',      ice: 0.15, mult: 1.4 },
    { id: 'abyss',   name: '深渊试炼', desc: '重力 +25% 且潮汐 -40%',  grav: 1.25, tideInt: 0.6, mult: 1.9 },
    { id: 'icereef', name: '冰礁之海', desc: '暗礁 ×2 且 15% 落水即冻', ironX: 2, ice: 0.15, mult: 1.9 }
  ];
  var dchal = (function () {
    var d = MG.platform.getJSON('mg_dchal', null) || {};
    if (d.date !== todayStr()) d = { date: todayStr(), done: false, streak: d.streak || 0, lastDate: d.lastDate || null };
    return d;
  })();
  function saveChal() { MG.platform.setJSON('mg_dchal', dchal); }
  var dchalRun = null; // 本局挑战参数 { goal }（仅运行期）
  function dchalRoll() {
    var rnd = mulberry(dateSeed('chal-' + todayStr()));
    var affix = DCHAL_AFFIXES[Math.floor(rnd() * DCHAL_AFFIXES.length)];
    var goal = Math.max(C.dailyChal.goalMin, Math.ceil((lifeStats.best || 3000) * C.dailyChal.goalBestRatio / 100) * 100);
    return { affix: affix, goal: goal };
  }
  function dchalStart() {
    if (state !== 'menu' && state !== 'over') return; // 对局中不可发起（防误触清空当前局面）
    var roll = dchalRoll();
    dchalRun = { goal: roll.goal };
    ngStartRun(roll.affix, true);
    achOpen = false;
  }
  // 面板/HUD 读取的挑战态（panels/render 经全局解析调用）
  function dchalInfo() {
    var roll = dchalRoll();
    return {
      name: roll.affix.name, desc: roll.affix.desc, goal: roll.goal,
      done: dchal.done, streak: dchal.streak || 0,
      canStart: state === 'menu' || state === 'over',
      running: !!(ng.active && ng.fromDaily && dchalRun)
    };
  }
  function dchalHud() { return (ng.active && ng.fromDaily && dchalRun) ? { goal: dchalRun.goal, done: dchal.done } : null; }
  function checkDailyChallenge() {
    if (!ng.active || !ng.fromDaily || !dchalRun) return;
    if (dchal.date !== todayStr()) { dchal.date = todayStr(); dchal.done = false; saveChal(); } // 跨天兜底（长时间挂机）
    if (dchal.done) return; // 今日已完成：可继续玩但不重复发奖
    if (score < dchalRun.goal) return;
    dchal.done = true;
    dchal.streak = (dchal.lastDate === yesterdayStr()) ? (dchal.streak || 0) + 1 : 1;
    dchal.lastDate = todayStr();
    var gain = Math.round(Math.min(C.dailyChal.rewardMax, C.dailyChal.rewardBase + (dchal.streak - 1) * C.dailyChal.rewardStep) * cm(scoreMult));
    score += gain;
    scoreBump = 0.5;
    if (score > best) { best = score; saveNum('mg_best', best); }
    var pk = C.skills[(Math.random() * C.skills.length) | 0];
    skillCharge[pk.key] += C.dailyChal.charge;
    addPopup(C.W / 2, 205, '每日挑战达成！+' + gain, true, 0);
    addPopup(C.W / 2, 232, '连续 ' + dchal.streak + ' 天 ·「' + pk.name + '」充能 +' + C.dailyChal.charge, false, 0);
    parts.push({ type: 'ring', x: C.W / 2, y: 205, r: 30, life: 0.7, max: 0.7, color: '#F5C542' });
    audio.quest();
    saveChal();
  }

  // ---------- 好友榜（本地模拟榜：预留微信 wx 接口位，上线后替换数据源） ----------
  var friends = (function () {
    var list = MG.platform.getJSON('mg_friends', null);
    if (!list) {
      var names = ['海风酱', '泡泡鱼', '深蓝船长', '浪里格', '珊瑚酱', '夜航星'];
      var rnd = mulberry(dateSeed('friends-v1'));
      list = [];
      for (var i = 0; i < names.length; i++) list.push({ name: names[i], base: Math.floor(300 + rnd() * 4200) });
      MG.platform.setJSON('mg_friends', list);
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
    return '【水滴合成深海】我在' + C.seaStages[seaStage()].name + '拿下 ' + score + ' 分！' +
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

  // 远景鱼群：按海域分化体色/体型/泳速（每片海域有自己的鱼），换海域时旧鱼慢慢淡出、新鱼慢慢淡入
  var fishes = [];
  // 各海域鱼群外观：tint/tintD 体色（亮/暗）、s 尺寸范围、sp 泳速范围
  var FISH_LOOK = [
    { tint: '158,206,228', tintD: '66,120,168', s: [6, 12],  sp: [26, 56] }, // 潮汐池：浅水银蓝小鱼
    { tint: '122,214,182', tintD: '34,132,110', s: [6, 12],  sp: [28, 58] }, // 珊瑚浅海：青绿雀鲷
    { tint: '96,164,232',  tintD: '30,88,168',  s: [8, 14],  sp: [34, 66] }, // 蔚蓝深海：群游蓝鱼
    { tint: '116,124,214', tintD: '52,56,140',  s: [5, 9],   sp: [18, 40] }, // 午夜深渊：暗紫灯笼鱼（小而慢）
    { tint: '196,212,238', tintD: '110,130,168', s: [10, 16], sp: [22, 44] }, // 月光环礁：银月鱼（大而缓）
    { tint: '92,112,182',  tintD: '36,48,110',  s: [7, 12],  sp: [30, 62] }, // 海沟之眼：深蓝窄影
    { tint: '226,142,96',  tintD: '150,62,36',  s: [8, 13],  sp: [30, 60] }, // 热泉裂谷：暖橙耐热鱼
    { tint: '184,146,236', tintD: '96,62,168',  s: [6, 12],  sp: [24, 50] }  // 深渊王座：幽紫发光鱼
  ];
  function fishLook() { return FISH_LOOK[Math.min(seaStage(), FISH_LOOK.length - 1)]; }
  function resetFish(f) {
    var lk = fishLook();
    f.stg = seaStage();
    f.dir = Math.random() < 0.5 ? 1 : -1;
    f.x = f.dir > 0 ? -70 : C.W + 70;
    f.y = 160 + Math.random() * 400;
    f.sp = lk.sp[0] + Math.random() * (lk.sp[1] - lk.sp[0]);
    f.s = lk.s[0] + Math.random() * (lk.s[1] - lk.s[0]);
    f.tint = lk.tint; f.tintD = lk.tintD;
    f.wob = Math.random() * Math.PI * 2;
  }
  for (var fi = 0; fi < 5; fi++) {
    var nf = { tail: 0, dir: 1, x: 0, y: 0, sp: 0, s: 0, wob: 0, fade: 0, stg: 0, tint: '', tintD: '' };
    resetFish(nf);
    nf.x = Math.random() * LW;
    nf.fade = 1; // 开局即在场的鱼不做淡入
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
    // 投放门槛：累计分未达 spawnGate 的档位不参与投放（达标前静默过滤，不提示数值）
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
    if (Math.random() >= C.specialChance) return null;
    // 与海域绑定：未抵达对应海域的特殊滴静默过滤（越深的海，特殊滴越多越强）
    var pool = [['vortex', 30], ['cloud', 24], ['ice', 20], ['rainbow', 14], ['gale', 12],
      ['magnet', 10], ['spring', 10], ['thunder', 9], ['pearl', 9],
      ['magma', 8], ['geyser', 8], ['void', 6], ['aurora', 6]];
    var cur = seaStage(), keys = [], ws2 = [], total = 0, i;
    for (i = 0; i < pool.length; i++) {
      if (cur < ((C.specialStage && C.specialStage[pool[i][0]]) || 0)) continue;
      keys.push(pool[i][0]); ws2.push(pool[i][1]); total += pool[i][1];
    }
    if (!keys.length) return null;
    var r = Math.random() * total;
    for (i = 0; i < keys.length; i++) { r -= ws2[i]; if (r <= 0) return keys[i]; }
    return keys[keys.length - 1];
  }
  function rollIron() {
    if (seaStage() < ((C.specialStage && C.specialStage.iron != null) ? C.specialStage.iron : 0)) return false; // 潮汐池起就落礁石（注意 0 是合法门槛，不能写 || 兜底）
    if (seaEvent && seaEvent.type === 'storm') return false; // 保底：风暴期间不再落礁石，避免双重失控
    if (ironCount() >= C.iron.maxActive) return false; // 场上已满员：预览不再出礁石，避免落下时被迫转成水滴
    var ch = C.iron.chance + (C.ramp.ironChanceMax - C.iron.chance) * endlessRamp();
    if (ng && ng.active && ng.active.ironX) ch *= ng.active.ironX; // 二周目「暗礁密布」
    return Math.random() < ch;
  } // 礁石概率随渐进加压提升
  // 符文：普通水滴随机附带的道具属性，合成时为对应技能充能（只出已解锁的技能符文）
  function rollRune() {
    if (seaStage() < ((C.specialStage && C.specialStage.rune) || 2)) return null; // 蔚蓝深海起才带符文
    if (Math.random() >= C.rune.chance) return null;
    var keys = [], ws = [], total = 0, k;
    for (k in C.rune.weights) {
      if (!C.rune.weights.hasOwnProperty(k) || !skillUnlocked(k)) continue;
      keys.push(k); ws.push(C.rune.weights[k]); total += C.rune.weights[k];
    }
    if (!keys.length) return null;
    var r = Math.random() * total;
    for (k = 0; k < keys.length; k++) { r -= ws[k]; if (r <= 0) return keys[k]; }
    return keys[keys.length - 1];
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
    // 公告带（居中 + 设计稿 y 180~320）改为底部锚定：跟随警戒线，不随窗口高度漂移
    // 基准 209 = 旧版设计稿警戒线，随 dangerY 平移（容器压缩/警戒线变动时公告带自动跟随）
    if (x === C.W / 2 && y >= 180 && y <= 320) y = C.dangerY + (y - 209);
    // 防重叠：与仍在显示中的弹字同带（横向接近）时向下顺移一行，多条同时弹出不再叠字
    for (var i = 0; i < popups.length; i++) {
      var op = popups[i];
      if (op.life > 0.35 && Math.abs(op.x - x) < 220) {
        while (Math.abs(op.y - y) < 28) y += 30;
      }
    }
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
      // 海域切换：旧鱼 1.6s 缓慢淡出（边游边隐），淡尽后重生为本海域的鱼并 1.6s 淡入
      var curStg = seaStage();
      if (f.fade > 0 && f.stg !== curStg) f.fade -= dt / 1.6;
      else if (f.fade < 1) f.fade += dt / 1.6;
      if (f.fade <= 0) { f.fade = 0; resetFish(f); }
      if (f.fade > 1) f.fade = 1;
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
    if (trophyBtn.pressT > 0) trophyBtn.pressT -= dt;
    if (menuTrophy.pressT > 0) menuTrophy.pressT -= dt;
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
    // 初始几档（无积分门槛）是开局常态，不再弹"图鉴解锁"提示，避免刷屏
    if (C.dexGate[t]) {
      addPopup(px === undefined ? C.W / 2 : px, py === undefined ? 240 : py,
        '图鉴解锁 · ' + T[t].name + ' +' + bonus, true, 0);
    }
    saveDex();
    checkCollection();
  }
  // 累计得分跨过门槛时补解锁（如先合出了高级、后攒够积分）
  function checkDexGates() {
    for (var t = 0; t < T.length; t++) {
      if (!dexUnlocked[t] && totalScore() >= (C.dexGate[t] || 0)) unlockTier(t);
    }
  }

  // ---------- 成就（常驻目标，跨局累计；达成后永久生效的加成见 perk） ----------
  // 成就难度分级：diff 1=★入门 2=★★进阶 3=★★★传说，奖励按难度递增
  var ACH_DEFS = [
    { id: 'score2k',  name: '深海富豪', desc: '单局得分达到 30000',        target: 30000, diff: 1, perk: '永续 · 开局充能 +2', cur: function () { return Math.max(score, best, lifeStats.best || 0); } },
    { id: 'combo6',   name: '连浪六叠', desc: '达成 6 连击',               target: 6,     diff: 1, perk: '永续 · 连击窗 +0.3s', cur: function () { return Math.max(maxCombo, lifeStats.combo || 0); } },
    { id: 'chest5',   name: '寻宝猎人', desc: '累计开启 10 只宝箱',    target: 10,    diff: 1, perk: '永续 · 宝箱奖励 +50%', cur: function () { return lifeStats.chest || 0; } },
    { id: 'tide12',   name: '弄潮儿',   desc: '经历 25 次涨潮',            target: 25,    diff: 2, perk: '永续 · 潮期得分 +10%', cur: function () { return lifeStats.tide || 0; } },
    { id: 'iron5',    name: '礁石克星', desc: '累计消除 12 对礁石',        target: 12,    diff: 2, perk: '永续 · 礁石相消 ×2', cur: function () { return lifeStats.ironPair || 0; } },
    { id: 'rainbow5', name: '虹光使者', desc: '触发 12 次彩虹合成',        target: 12,    diff: 2, perk: '永续 · 彩虹得分 +50%', cur: function () { return lifeStats.rainbow || 0; } },
    { id: 'quest12',  name: '任务大师', desc: '累计完成 30 个任务',        target: 30,    diff: 2, perk: '永续 · 任务奖励 +30%', cur: function () { return lifeStats.quest || 0; } },
    { id: 'canghai',  name: '沧海遗珠', desc: '合成出传说中的「沧海」',    target: 1,     diff: 2, perk: '永续 · 沧海汇入 +50%', cur: function () { return dexCounts[8] || 0; } },
    { id: 'canghai5', name: '沧海成群', desc: '累计合成 5 只「沧海」',     target: 5,     diff: 3, perk: '称号 · 沧海之主', cur: function () { return dexCounts[8] || 0; } },
    { id: 'combo12',  name: '惊涛十二叠', desc: '达成 12 连击',            target: 12,    diff: 3, perk: '称号 · 驭浪者', cur: function () { return Math.max(maxCombo, lifeStats.combo || 0); } },
    { id: 'score10w', name: '海渊传说', desc: '单局得分达到 100000',       target: 100000, diff: 3, perk: '称号 · 海渊传说', cur: function () { return Math.max(score, best, lifeStats.best || 0); } }
  ];
  function checkAchievements() {
    lifeStats.best = Math.max(lifeStats.best || 0, best, score);
    for (var i = 0; i < ACH_DEFS.length; i++) {
      var a = ACH_DEFS[i];
      if (achDone[a.id]) continue;
      if (a.cur() < a.target) continue;
      achDone[a.id] = 1;
      // 奖励按难度分级：★ +60/充能1 · ★★ +150/充能2 · ★★★ +400/充能4
      var d = a.diff || 1;
      var base = d === 3 ? 400 : (d === 2 ? 150 : 60);
      var gain = Math.round(base * cm(scoreMult));
      score += gain;
      scoreBump = 0.4;
      var pick = C.skills[(Math.random() * C.skills.length) | 0];
      skillCharge[pick.key] += d === 3 ? 4 : (d === 2 ? 2 : 1);
      addPopup(C.W / 2, 240, '成就达成 · ' + a.name + ' +' + gain, true, 0);
      addPopup(C.W / 2, 266, '「' + pick.name + '」充能 +' + (d === 3 ? 4 : (d === 2 ? 2 : 1)), false, 0);
      parts.push({ type: 'ring', x: C.W / 2, y: 150, r: 26, life: 0.6, max: 0.6, color: '#F5C542' });
      audio.quest();
      saveDex();
    }
  }

  // ---------- 特殊水滴图鉴（发现即点亮；与海域绑定：stage=解锁海域） ----------
  // 每片海域相对上一片恰好新增 2 种（潮汐池=礁石+宝箱，宝箱在图鉴中单列）
  var SP_DEFS = [
    { key: 'vortex',  stage: 1, name: '漩涡滴', color: '#7B6FD0', desc: '吸附周围水滴后消散，聚拢散滴。' },
    { key: 'cloud',   stage: 1, name: '雨云滴', color: '#8FA8BC', desc: '分裂成两颗雾泡，补充低级滴。' },
    { key: 'iron',    stage: 0, name: '礁石',   color: '#6E7B88', desc: '沉重障碍，两两相消或蒸发移除。' },
    { key: 'ice',     stage: 2, name: '冰晶滴', color: '#A8DFF2', desc: '冻结周围水滴，可当临时平台。' },
    { key: 'rune',    stage: 2, name: '符文滴', color: '#B08FD0', desc: '合成时为对应技能 +1 充能。' },
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
  // 海域 → 图鉴两个槽位的 dexSelSp 索引（潮汐池槽 2 = 宝箱虚拟位 SP_DEFS.length）
  var STAGE_SP_SLOTS = {};
  (function () {
    var per = {}, i;
    for (i = 0; i < SP_DEFS.length; i++) {
      var st = SP_DEFS[i].stage;
      (per[st] = per[st] || []).push(i);
    }
    for (var k in per) if (per.hasOwnProperty(k)) STAGE_SP_SLOTS[k] = [per[k][0], per[k][1]];
    STAGE_SP_SLOTS[0] = [spIndexByKey('iron'), SP_DEFS.length];
  })();
  function discoverSpecial(sp) {
    if (dexSpecial[sp]) return;
    dexSpecial[sp] = 1;
    saveDex();
    var i = spIndexByKey(sp);
    addPopup(C.W / 2, 240, '图鉴新发现 · ' + (i >= 0 ? SP_DEFS[i].name : '宝箱'), true, 0);
    checkCollection();
  }

  // ---------- 图鉴收集度（长线收集闭环：水滴 9 档 + 特殊形态 15 种 + 宝箱 = 25 格） ----------
  // 达成率跨过里程碑即自动发放奖励（对齐成就奖励体系：积分 + 技能充能 + 宝箱贺礼）；
  // 领取记录持久化（mg_dex.col），老存档的既有收集会在下一局开始后 1 秒内自动补发
  var COL_MILESTONES = [
    { id: 'm25',  pct: 0.25, score: 500,  charge: 1, name: '收集 25%' },
    { id: 'm50',  pct: 0.5,  score: 1200, charge: 2, name: '收集 50%', chest: true },
    { id: 'm75',  pct: 0.75, score: 2500, charge: 3, name: '收集 75%', chest: true },
    { id: 'm100', pct: 1,    score: 6000, charge: 0, name: '集齐图鉴', allCharge: 2 }
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
        if (keys.length) {
          var pick = keys[(Math.random() * keys.length) | 0];
          skillCharge[pick.key] += m.charge;
          sub = '「' + pick.name + '」充能 +' + m.charge;
        }
      }
      if (m.allCharge) {
        for (s = 0; s < C.skills.length; s++) skillCharge[C.skills[s].key] += m.allCharge;
        sub = '全技能充能 +' + m.allCharge;
      }
      addPopup(C.W / 2, 240, '图鉴收集达成 · ' + m.name + ' +' + gain, true, 0);
      if (sub) addPopup(C.W / 2, 266, sub, false, 0);
      if (m.id === 'm100') addPopup(C.W / 2, 292, '成就称号 · 深海博物学家', false, 0);
      if (m.chest && !chest && state === 'play') chestTimer = Math.min(chestTimer, 4); // 稍后沉一只宝箱贺礼
      parts.push({ type: 'ring', x: C.W / 2, y: 150, r: 26, life: 0.6, max: 0.6, color: '#F5C542' });
      audio.quest();
      saveDex();
    }
  }

  // ---------- 任务链 ----------
  // 当前已解锁的最高水滴档（任务难度随进度缩放的基准）
  function questMaxTier() {
    var m = 1;
    for (var i = 0; i < T.length; i++) if (dexUnlocked[i]) m = i;
    return m;
  }
  function makeQuest(depth) {
    questDepth = depth;
    var mx = questMaxTier(); // 追随玩家进度：低分时出低档任务，深处出高档任务
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
    q.stars = Math.min(3, 1 + Math.floor(depth / 2)); // 难度星级随任务深度递进 1~3
    q.bornMax = mx; // 记录生成时的进度基准，用于滞留检测
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
    addPopup(C.W / 2, 240, '任务完成 +' + gain, true, 0);
    addPopup(C.W / 2, 266, '「' + pick.name + '」已充满', false, 0);
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

    var gain2 = Math.round(T[nt].score * cm(mult * scoreMult * perkMult() * (auroraNext || 1))); // 成就加成：弄潮儿潮汐期间 +10%；极光庇护 ×3；总倍率封顶
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

    // 甘霖：连击馈赠
    if (combo === C.rainCombo) {
      var t = mostCommonTier();
      if (t >= 0 && t !== nextTier) {
        nextTier = t;
        rainHint = 2.5;
        aimX = clampAim(aimX);
        addPopup(C.W / 2, 240, '甘霖 · 下一滴是「' + T[t].name + '」', false, 0);
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
  var auroraNext = 0; // 极光庇护：下一次合成得分倍数（极光滴设置，用后清零）
  function updateSpecials(dt) {
    var bs = phys.bodies, i;
    for (i = bs.length - 1; i >= 0; i--) {
      var b = bs[i];
      if (!b) continue; // 雷霆/熔岩/虚空会在遍历中移除其他水滴，索引可能位移（最多漏拍一帧，下帧补上）
      if (b.special) {
        b.specialT += dt;
        if (b.special === 'cloud') {
          if (b.specialT >= C.cloud.splitDelay) splitCloud(b);
        } else if (b.special === 'vortex') {
          updateVortex(b, dt, bs, C.vortex, '#8FA8E8');
        } else if (b.special === 'magnet') {
          updateVortex(b, dt, bs, C.magnet, '#9BC0F0'); // 磁石滴：同漩涡逻辑，范围/力度更大
        } else if (b.special === 'ice') {
          updateIce(b, bs);
        } else if (b.special === 'gale') {
          // 疾风滴：落定瞬间吹开周围水滴（腾出空间，防堆高），随后变回普通水滴
          if (b.specialT >= 0.45 || b.y + b.r >= C.floorY - 4) {
            pushNeighbors(b.x, b.y, 130);
            burst(b.x, b.y, b.tier, false);
            parts.push({ type: 'ring', x: b.x, y: b.y, r: 16, life: 0.5, max: 0.5, color: '#BFE8D8' });
            addPopup(b.x, b.y - b.r - 14, '疾风！', false, 0);
            audio.swirl();
            b.special = null;
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
      // 冻结滴：速度清零 + 倒计时 + 解冻
      if (b.frozen > 0) {
        b.frozen -= dt;
        b.vx *= 0.1; b.vy = 0;
        if (b.frozen <= 0) thaw(b);
      }
      // 二周目「冰封之海」：标记滴落底即冻（临时平台，风险与资源并存）
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
    var s1 = phys.create(b.x - 14, b.y - 6, 0, -90, -60);
    var s2 = phys.create(b.x + 14, b.y - 6, 0, 90, -60);
    s1.popT = s2.popT = 0.25;
    addPopup(b.x, b.y - 20, '雨云化雨', false, 0);
    audio.blip(520, 0.2, 'sine', 0.13, 1.8);
  }
  function dissolveVortex(b, P) {
    P = P || C.vortex;
    var gain = Math.round((P.score || C.vortex.score) * scoreMult);
    score += gain;
    scoreBump = 0.25;
    addPopup(b.x, b.y - b.r - 10, '+' + gain, false, 0);
    burst(b.x, b.y, 5, false);
    parts.push({ type: 'ring', x: b.x, y: b.y, r: 16, life: 0.45, max: 0.45, color: '#8FA8E8' });
    phys.remove(b);
    audio.swirl();
  }

  // —— 深海新特殊滴（月光环礁起逐海域解锁，全部"落定即触发"）——
  // 甘霖滴：下一滴变为场上最多的档位
  function triggerSpring(b) {
    var t = mostCommonTier();
    b.special = null;
    if (t >= 0 && t !== nextTier) {
      nextTier = t;
      rainHint = 2.5;
      aimX = clampAim(aimX);
    }
    addPopup(b.x, b.y - b.r - 14, '甘霖降临！', false, 0);
    parts.push({ type: 'ring', x: b.x, y: b.y, r: 18, life: 0.5, max: 0.5, color: '#BFE8D0' });
    audio.quest();
  }
  // 雷霆滴：场上一对同档水滴直接合成（选距离最近的一对）
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
    if (!best) { addPopup(b.x, b.y - b.r - 14, '雷落空了…', false, 0); return; }
    parts.push({ type: 'ring', x: best.a.x, y: best.a.y, r: best.a.r, life: 0.5, max: 0.5, color: '#F2C14E' });
    parts.push({ type: 'ring', x: best.o.x, y: best.o.y, r: best.o.r, life: 0.5, max: 0.5, color: '#F2C14E' });
    addPopup(C.W / 2, 250, '雷霆引合！', true, 0);
    addShake(2, 0.2);
    audio.freeze();
    doMerge(best.a, best.o);
  }
  // 珍珠滴：场上最多的档位全体 +1 级
  function triggerPearl(b) {
    var t = mostCommonTier(), n = 0;
    b.special = null;
    if (t < 0 || t >= T.length - 1) { addPopup(b.x, b.y - b.r - 14, '珍珠黯淡了…', false, 0); return; }
    var bs = phys.bodies;
    for (var i = 0; i < bs.length; i++) {
      var o = bs[i];
      if (o.tier !== t || o.iron || o.chest || o.special || o.frozen > 0) continue;
      o.tier += 1; o.popT = 0.3; n++;
      parts.push({ type: 'ring', x: o.x, y: o.y, r: o.r * 0.6, life: 0.45, max: 0.45, color: '#F0E6D2' });
    }
    addPopup(C.W / 2, 250, '珍珠祝福！「' + T[t].name + '」全体 +1', true, 0);
    audio.quest();
  }
  // 熔岩滴：烧毁周围礁石与最低两档水滴，折算得分
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
      phys.remove(burn[i]);
    }
    score += gain; scoreBump = 0.3;
    addPopup(b.x, b.y - b.r - 14, burn.length ? '熔岩灼烧 ×' + burn.length + ' +' + gain : '熔岩熄灭', burn.length, 0);
    if (burn.length) addShake(3, 0.25);
    parts.push({ type: 'ring', x: b.x, y: b.y, r: R * 0.7, life: 0.5, max: 0.5, color: '#F2A05E' });
    audio.freeze();
  }
  // 间歇泉滴：垂直水柱冲开上方水滴
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
    audio.swirl();
  }
  // 虚空滴：吞噬场上最低档水滴（至多 voidN 颗），折算高分
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
      phys.remove(victims[i]);
    }
    score += gain; scoreBump = 0.3;
    if (gain > 0) addPopup(b.x, b.y - b.r - 14, '虚空吞噬 ×' + n + ' +' + gain, true, 0);
    else addPopup(b.x, b.y - b.r - 14, '虚空空空如也', false, 0);
    phys.remove(b);
    parts.push({ type: 'ring', x: b.x, y: b.y, r: 20, life: 0.55, max: 0.55, color: '#8A7FD4' });
    audio.swirl();
  }
  // 极光滴：下一次合成得分 ×3
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

  // ---------- 潮汐 ----------
  // 潮位设计（几何推导）：满潮水面最矮距容器底 1/4 容器高，最高距警戒线 1/4 容器高，
  // 每推进一个海域在两端之间线性推进——水面永远碰不到警戒线，且随海域可见上涨
  function tideWaterMax() {
    var H = FLOORY - C.containerTop;
    var lo = 1 / 4;
    var hi = (FLOORY - C.dangerY - H / 4) / H;
    return lo + (hi - lo) * (seaStage() / (C.seaStages.length - 1));
  }
  function tideY() {
    return FLOORY - tide.progress * (FLOORY - C.containerTop) * tideWaterMax();
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
        if (!tideKillHint) { tideKillHint = true; addPopup(C.W / 2, 250, '潮位渐深 · 浮起越线同样危险', true, 0); }
        audio.tide();
      }
    } else {
      tide.progress = Math.min(1, tide.progress + dt / 1.3);
      tide.timer -= dt;
      if (tide.timer <= 0) {
        tide.phase = 'idle';
        var tiv = C.tide.cycleInterval - (C.tide.cycleInterval - C.ramp.tideIntervalMin) * endlessRamp(); // 渐进加压：潮汐更频
        if (ng.active && ng.active.tideInt) tiv *= ng.active.tideInt; // 二周目「疾风骤雨」
        tide.timer = tiv;
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
    if (!skillUnlocked(key)) {
      flashSkill(key, '累计 ' + C.skillUnlock[key] + ' 分解锁');
      return;
    }
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
      addPopup(aimX, C.spawnY + 66, '换滴', false, 0); // 移到虚影下方，不压住水滴
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
  function checkDanger(dt) {
    // 潮汐期间照常判负：浮起越线同样致命（深水海域潮峰更高，潮汐本身即威胁）。
    // 但浮力会把整堆水滴像筏子一样整体抬起（堆顶常越过容器口），非玩家堆高——
    // 判负引信放宽 5 倍且不叠加容器口减半，给足反应时间（配合每局一次深流缓冲）。
    var tideOn = tide.progress > 0.15;
    var bs = phys.bodies;
    var worst = 0;
    for (var i = 0; i < bs.length; i++) {
      var b = bs[i];
      if (b.frozen > 0) continue; // 冻结滴视为"封存"，不判负
      if (b.grace > 0) { b.dangerT = 0; continue; }
      var sp = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
      var top = b.y - b.r;
      if (top >= C.dangerY) { b.dangerT = 0; continue; } // 线下，重置
      // 越线即计时，不再要求"有支撑"——高压堆里球体持续微颤导致支撑/速度判定
      // 反复失败、计时永远攒不满，是此前"明显越线却迟迟不判负"的根因。
      var fuse = tideOn ? C.dangerTime * 5 : C.dangerTime * (top < C.containerTop ? 0.55 : 1);
      if (sp < C.dangerSpeed * 1.5) {
        b.dangerT += dt;
        if (b.dangerT > fuse) {
          // 每局一次「深流缓冲」：首次判负改为全局 3 秒宽限，缓解前期暴毙挫败感
          if (!runBuffered) {
            runBuffered = true;
            for (var j = 0; j < bs.length; j++) { bs[j].dangerT = 0; bs[j].grace = 3; }
            addPopup(C.W / 2, 248, '深流缓冲 · 宽限 3 秒', true, 0);
          } else { dangerAlert = 0; gameOver(); return; }
        }
      } else {
        // 被明显扰动（弹飞/合成反冲）：计时缓慢消退而非清零
        b.dangerT = Math.max(0, b.dangerT - dt * 2);
      }
      worst = Math.max(worst, b.dangerT / C.dangerTime);
    }
    dangerAlert = Math.min(1, worst); // 0..1，供警戒线渲染加强警示
  }
  function gameOver() {
    state = 'over';
    lifeScore += score - runCounted; runCounted = score; // 累计分只记增量（复活续局不重复计）
    careerPeak = Math.max(careerPeak, lifeScore); // 生涯峰值只涨不跌（图鉴"已抵达"的判定基准）
    saveNum('mg_peak', careerPeak);
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
      bs.push({ x: Math.round(b.x), y: Math.round(b.y), r: Math.round(b.r), tier: b.tier, iron: !!b.iron, chest: !!b.chest, special: b.special || null });
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
      offline: offlineGain ? { mins: offlineGain.mins, gain: offlineGain.gain } : null
    };
  };
  // 测试钩子（仅自动化测试用）：充能 / 成就 / 局面构造 / 加压进度
  MG.debug = {
    give: function (k, n) { if (k in skillCharge) skillCharge[k] = n; },
    setNext: function (opt) {
      opt = opt || {};
      nextIron = !!opt.iron;
      nextSpecial = opt.special || null;
      nextRune = !opt.special && !opt.iron ? (opt.rune || null) : null;
      if (opt.tier != null) nextTier = opt.tier;
    },
    chestNow: function (x) {
      if (!chest) spawnChest();
      if (x != null) chest.b.x = x;
    },
    achCheck: function () { checkAchievements(); },
    bump: bumpStat,
    forceEndless: function () {}, // 已无关卡制：开局即无尽（保留空钩子兼容旧测试脚本）
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
    tideY: tideY, // 当前潮面 y（测试钩子：潮位随海域上涨验证用）
    setLife: function (n) { lifeScore = n; runCounted = 0; },
    cm: cm,
    // ---- 蒙特卡洛模拟器钩子（无渲染快进，见 test/simulate.js） ----
    headless: false,
    step: function (dt) { update(dt); },
    drop: function (x) { aimX = clampAim(x == null ? Math.random() * C.W : x); tryDrop(); },
    reset: function () { restart(); },
    ngInfo: function () { return { unlocked: ng.unlocked, active: ng.active ? ng.active.id : null }; },
    ngUnlock: function () { ng.unlocked = true; saveFlag('mg_ng', 1); },
    ngStart: function (id) {
      var af = null;
      for (var i = 0; i < C.ng.affixes.length; i++) if (C.ng.affixes[i].id === id) af = C.ng.affixes[i];
      if (af) ngStartRun(af);
      return af ? af.name : null;
    },
    over: function () { buildOverButtons(); gameOver(); }, // 直达结算页（UI 测试用）
    menuBtn: function () { return menuStartBtn; }, // 开始界面按钮几何（UI 测试用）
    openDex: function () { dexOpen = true; achOpen = false; },
    forceEvent: function (type) { startSeaEvent(type); }, // 直接触发深海事件（UI 测试用：surge/bless/storm）
    addScore: function (n) { score += n; }, // 测试用直接加分（每日挑战达标验证等）
    dexSecTab: function (i) { return dexSecRect(i); }, // 图鉴分节控件几何（UI 测试用）
    closeDex: function () { dexOpen = false; achOpen = false; }
  };

  // ---------- 宝箱（探索要素） ----------
  function spawnChest() {
    discoverSpecial('chest');
    var b = createIron(C.W * (0.2 + Math.random() * 0.6), C.dangerY + 52); // 警戒线下方开阔水域生成，不压坠落区虚影
    b.chest = true;
    b.r = 17; b.m = b.r * b.r * 6; // 比礁石轻，不会被砸得太凶
    chest = { b: b, t: 0, life: 14 }; // 14 秒内不点就沉走
    addPopup(b.x, C.dangerY + 10, '沉宝箱！点它开启', true, 0);
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
      var keys = ['swap', 'ripple', 'evap', 'flow'].filter(function (k) { return skillUnlocked(k); });
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
    if (!chest) {
      chestTimer -= dt;
      if (chestTimer <= 0) spawnChest();
    } else {
      chest.t += dt;
      if (chest.t >= chest.life) expireChest();
    }
    // 滞留任务刷新：进度远超任务生成时的基准（连跳 3 档）时换一个跟上难度的任务
    questStaleT -= dt;
    if (questStaleT <= 0) {
      questStaleT = 4;
      if (quest && quest.bornMax != null && questMaxTier() - quest.bornMax >= 3) {
        makeQuest(questDepth);
        addPopup(C.W / 2, 266, '任务已更新', false, 0);
      }
    }
  }

  // ---------- 随机深海事件（无尽模式趣味变量） ----------
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
      // 首尾各 0.8s 淡入淡出，避免漩涡凭空出现/消失
      var fadeK = Math.min(1, (seaEvent.t0 - seaEvent.t) / 0.8, seaEvent.t / 0.8);
      if (fadeK <= 0) return;
      var pulse = 1 + 0.07 * Math.sin(time * 3);
      ctx.save();
      ctx.globalAlpha = fadeK;
      ctx.translate(seaEvent.x, seaEvent.y);
      ctx.scale(pulse, pulse * 0.55); // 椭圆压扁：透视俯视感
      // 柔光漩涡盘（径向渐变，静置营造深度）
      ctx.fillStyle = grad('stormDisc', function () {
        var gg = ctx.createRadialGradient(0, 0, 0, 0, 0, 110);
        gg.addColorStop(0, 'rgba(94,110,208,0.30)');
        gg.addColorStop(0.6, 'rgba(94,110,208,0.13)');
        gg.addColorStop(1, 'rgba(94,110,208,0)');
        return gg;
      });
      ctx.beginPath(); ctx.arc(0, 0, 110, 0, Math.PI * 2); ctx.fill();
      // 三条螺旋臂：整臂单路径连续描边 + 沿臂渐隐（与漩涡滴同款手法，无接缝无硬线）
      ctx.rotate(time * 2.0);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (var k = 0; k < 3; k++) {
        var a0 = k * Math.PI * 2 / 3;
        var endA = a0 + Math.PI * 1.9;
        (function (a0, endA, k) {
          // 渐变与臂均从核心内部（4px）起：中心与旋臂连成一体，不再分离
          var gx0 = Math.cos(a0) * 4, gy0 = Math.sin(a0) * 4;
          var gx1 = Math.cos(endA) * 104, gy1 = Math.sin(endA) * 104;
          ctx.strokeStyle = grad('stormArm' + k, function () {
            var gg = ctx.createLinearGradient(gx0, gy0, gx1, gy1);
            gg.addColorStop(0, 'rgba(152,166,240,0.62)');
            gg.addColorStop(1, 'rgba(112,128,222,0.07)');
            return gg;
          });
        })(a0, endA, k);
        ctx.lineWidth = 7;
        ctx.beginPath();
        for (var i2 = 0; i2 <= 40; i2++) {
          var tt = i2 / 40;
          var aa = a0 + tt * Math.PI * 1.9;
          var rr = 4 + 100 * tt;                       // 从核心内部起旋，臂与中心相接
          var x2 = Math.cos(aa) * rr, y2 = Math.sin(aa) * rr;
          if (i2 === 0) ctx.moveTo(x2, y2); else ctx.lineTo(x2, y2);
        }
        ctx.stroke();
      }
      // 中心亮核（被吸入的光，轻微呼吸）——核略放大并被旋臂根部穿过，与臂连成一体
      ctx.fillStyle = 'rgba(222,228,255,' + (0.55 + 0.2 * Math.sin(time * 4)).toFixed(2) + ')';
      ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    } else if (seaEvent.type === 'surge') {
      var g = grad('surge' + Math.round(FLOORY), function () {
        var gg = ctx.createLinearGradient(0, FLOORY - 90, 0, FLOORY);
        gg.addColorStop(0, 'rgba(160,230,255,0)');
        gg.addColorStop(1, 'rgba(160,230,255,0.18)');
        return gg;
      });
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
      if (removed > 0) addPopup(C.W / 2, 158, '越线水滴被冲走 ×' + removed, false, 0);
      state = 'play';
    });
  }
  function doDouble() {
    // 不再看广告：直接双倍（广告占位已按需求移除）
    doubled = true;
    score *= 2;
    if (score > best) { best = score; saveNum('mg_best', best); }
  }
  function restart() {
    ngEndRun(); // 二周目词缀只在单局内生效（普通重开回到常态）
    phys.bodies.length = 0;
    confirmOpen = false;
    score = 0; displayScore = 0; scoreBump = 0;
    if (offlineGain) { // 离线收益：开局自动入账
      score += offlineGain.gain; displayScore = score;
      var om = offlineGain.mins;
      addPopup(C.W / 2, 300, '离线收益 · 离开 ' + (om >= 60 ? Math.floor(om / 60) + ' 时 ' + (om % 60) + ' 分' : om + ' 分钟') + '，深海攒下 ' + offlineGain.gain + ' 分', true, 0);
      parts.push({ type: 'ring', x: C.W / 2, y: 300, r: 46, life: 0.9, max: 0.9, color: '#F2C14E' });
      audio.blip(880, 0.16, 'sine', 0.1, 0.5);
      offlineGain = null;
    }
    combo = 0; comboTimer = 0; cooldown = 0; maxCombo = 0;
    reviveCount = 0; doubled = false;
    runBuffered = false; // 新局重置深流缓冲
    skillCharge = { swap: 0, ripple: 0, evap: 0, flow: 0 };
    seaCount = 0; scoreMult = 1;
    evapMode = false; rippleMode = false; flowMode = false; flowPick = null; rainHint = 0;
    auroraNext = 0; // 极光庇护只在单次合成内生效
    tideGateHint = false;
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
    var bw = 240, bh = 42, gap = 10, x = (C.W - bw) / 2;
    // 可用区：统计文字之下 → 面板底部留白；按钮组在该区内垂直居中（面板 py134/ph472，见 render.drawOver）
    var areaTop = 134 + 186, areaBottom = 134 + 472 - 22;
    var n = 1 + (doubled ? 0 : 1) + 3; // 复活(无限)/双倍/分享/深渊潜航/重开
    var groupH = n * bh + (n - 1) * gap;
    var y = areaTop + (areaBottom - areaTop - groupH) / 2;
    {
      overButtons.push({ x: x, y: y, w: bw, h: bh, label: '复活继续' + (reviveCount > 0 ? '（已复活 ' + reviveCount + ' 次）' : ''), action: doRevive, primary: true });
      y += bh + gap;
    }
    if (!doubled) {
      overButtons.push({ x: x, y: y, w: bw, h: bh, label: '结算双倍', action: doDouble });
      y += bh + gap;
    }
    overButtons.push({ x: x, y: y, w: bw, h: bh, label: '分享战报', action: openShare });
    y += bh + gap;
    // 深渊潜航：结算页模式入口（主流 NG+ 设计——局末选择下一局模式）
    if (ng.unlocked) {
      overButtons.push({ x: x, y: y, w: bw, h: bh, label: ng.active ? '深渊潜航 · 换词缀再战' : '深渊潜航 · 词缀无尽局', action: openNgPick, variant: 'ng' });
    } else {
      overButtons.push({ x: x, y: y, w: bw, h: bh, label: '深渊潜航 · 累计5万解锁', action: function () { addPopup(C.W / 2, 620, '深渊潜航：累计 5万 分解锁', false, 0); }, variant: 'locked' });
    }
    y += bh + gap;
    overButtons.push({ x: x, y: y, w: bw, h: bh, label: '重新开始', action: restart });
  }

  // ---------- 命中区域（圆形按钮） ----------
  var MUTE = { cx: C.W - 24, cy: 36, r: 16, pressT: 0 };
  var bookBtn = { cx: 46, cy: 688, r: 20, pressT: 0 };
  var trophyBtn = { cx: 24, cy: 36, r: 16, pressT: 0 }; // 成就页入口（奖杯；局内由 fit() 挂到刘海行，cy 为负）——与重开按钮(r16)同径
  var menuTrophy = { cx: 24, cy: 36, r: 16, pressT: 0 }; // 菜单态奖杯固定位（菜单铺满全屏不偏移，与局内刘海行分用）——与重开按钮同径
  var restartBtn = { cx: C.W - 24, cy: 688, r: 16, pressT: 0 }; // 游戏内重开（带确认），右下角
  // 「深渊潜航」无局内悬浮钮：入口在结算页按钮组（主流 NG+ 模式选择设计）
  // 底部一排共 6 个按钮（图鉴 + 4 道具 + 重开），中心等距 70px 均匀排列：46/116/186/256/326/396
  var SKILL_BTNS = [
    { key: 'swap',   cx: 116, cy: 688, r: 20, pressT: 0 },
    { key: 'ripple', cx: 186, cy: 688, r: 20, pressT: 0 },
    { key: 'evap',   cx: 256, cy: 688, r: 20, pressT: 0 },
    { key: 'flow',   cx: 326, cy: 688, r: 20, pressT: 0 }
  ];
  fit(); // 首次适配（按钮已定义，底部元素可同步贴底）

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
  function inMute(p) { var dx = p.x - MUTE.cx, dy = p.y - (MUTE.cy + hudInset); return dx * dx + dy * dy <= (MUTE.r + 6) * (MUTE.r + 6); } // 命中区随按钮半径（与其他圆钮同为 r+6）；+hudInset 与 HUD 平移一致（菜单=oy，游戏态=min(oy,24)）
  function toLocal(e) {
    var rect = canvas.getBoundingClientRect();
    // 内容层游戏块垂直居中偏移 renderOy（菜单态 0），触摸 y 同量补偿还原块内坐标
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
    // 甘霖馈赠：事件期间最多 3 滴使用馈赠档位（仅对普通滴生效）
    var useTier = nextTier;
    if (!nextIron && !nextSpecial && seaEvent.type === 'bless' && seaEvent.data && seaEvent.data.left > 0) {
      useTier = seaEvent.data.tier;
      seaEvent.data.left--;
    }
    if (nextIron && ironCount() < C.iron.maxActive) {
      createIron(clampAim(aimX), C.spawnY);
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
      if (ng.active && ng.active.ice && Math.random() < ng.active.ice) nb.ngIce = true; // 二周目「冰封之海」
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
    // 开始界面：响应「开始游戏」与奖杯（每日挑战从菜单发起，成就殿堂随时可看）；
    // 面板打开时放行到下方 dexOpen/achOpen 分支，否则面板内点击会被这里提前吞掉
    if (state === 'menu' && !achOpen && !dexOpen) {
      // 初始界面静音入口（未开局即可静音，复用局内同一逻辑与存档键）；命中区与绘制一致 +oy
      if (inCircle(p, { cx: MUTE.cx, cy: MUTE.cy + hudInset, r: MUTE.r })) { MUTE.pressT = 0.16; audio.muted = !audio.muted; saveFlag('mg_mute', audio.muted); if (audio.muted) audio.bgm.stop(); else audio.bgm.start(); return; }
      if (inCircle(p, { cx: menuTrophy.cx, cy: menuTrophy.cy + hudInset, r: menuTrophy.r })) { menuTrophy.pressT = 0.16; achOpen = true; dexOpen = false; dexTab = 1; return; }
      if (inRect(p, menuStartBtn)) {
        menuStartBtn.pressT = 0.2;
        audio.blip(660, 0.12, 'sine', 0.1, 0.4);
        restart();
      }
      return;
    }
    if (dexOpen) {
      if (inRect(p, dexCloseBtn) || !inRect(p, DEX_PANEL)) { dexOpen = false; return; }
      // 分节切换
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
          // 海域演进行：点右侧特殊滴槽位看滴的说明，点行其他区域看海域说明
          for (var st = 0; st < C.seaStages.length; st++) {
            for (var slot = 0; slot < 2; slot++) {
              if (inRect(p, spSlotRect(st, slot))) {
                // 生涯未抵达的海域：槽位是"？？？"悬念位，点击落到整行（显示海域说明），不选中滴
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
      if (inRect(p, dexCloseBtn) || !inRect(p, DEX_PANEL)) { achOpen = false; return; }
      for (var at = 0; at < 3; at++) {
        if (inRect(p, achTabRect(at))) { dexTab = at; audio.blip(520 + at * 80, 0.08, 'sine', 0.06, 0.3); return; }
      }
      if (dexTab === 1 && inRect(p, dchalBtnRect())) { audio.blip(660, 0.1, 'triangle', 0.1, 1.4); dchalStart(); return; }
      return;
    }
    if (inMute(p)) { MUTE.pressT = 0.16; audio.muted = !audio.muted; saveFlag('mg_mute', audio.muted); if (audio.muted) audio.bgm.stop(); else audio.bgm.start(); return; }
    if (inCircle(p, bookBtn)) {
      bookBtn.pressT = 0.16; dexOpen = true; achOpen = false;
      // 默认选中与分节匹配的条目（说明区开局即有内容，不显"未发现"空态）
      dexSelTier = -1; dexSelSp = -1; dexSelStage = -1;
      if (dexSec === 0) {
        for (var dt = T.length - 1; dt >= 0; dt--) if (dexUnlocked[dt]) { dexSelTier = dt; break; }
        if (dexSelTier < 0) dexSelTier = 0;
      } else {
        dexSelStage = seaStage();
      }
      return;
    }
    if (inCircle(p, trophyBtn)) { trophyBtn.pressT = 0.16; achOpen = true; dexOpen = false; dexTab = 0; return; }
    // 「深渊潜航」：词缀三选一弹窗（结算页/局内点卡片开跑，点外关闭）
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
      // 宝箱：点击开启（点击范围放宽 14px，手机上好点）
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
    // 海域换色渐变计时：任何状态都推进（面板/结算打开时背景过渡不冻结）
    if (seaFade) { seaFade.t += dt; if (seaFade.t >= seaFade.dur) seaFade = null; }
    if (state === 'menu') { time += dt; updateFx(dt); return; } // 开始界面：只跑视觉动画
    if (adOverlay) {
      time += dt; // 广告演示期间环境动画照常流动（原实现整屏静止 1 秒，观感像卡顿了一下）
      adOverlay.t -= dt;
      if (adOverlay.t <= 0) { var cb = adOverlay.cb; adOverlay = null; if (cb) cb(); }
      updateFx(dt);
      return;
    }
    if (dexOpen || achOpen) { updateFx(dt); return; }
    if (state !== 'play') { time += dt; updateFx(dt); return; } // 结算页：背景保持流动（仅物理冻结）

    time += dt;
    if (rainHint > 0) rainHint -= dt;
    cooldown = Math.max(0, cooldown - dt);

    levelElapsed += dt; // 本局已进行时长（顶部计时显示用）
    checkDexGates();
    // 二周目解锁：累计分抵达最深海域门槛
    if (!ng.unlocked && totalScore() >= C.ng.unlockScore) {
      ng.unlocked = true;
      saveFlag('mg_ng', 1);
      addPopup(C.W / 2, 260, '解锁「深渊潜航」：本局结束后可在结算页开启', true, 0);
      audio.quest();
    }
    // 海域演进：累计分跨过里程碑 → 世界换色（1.8s 渐变过渡）+ 弹报
    var stg = seaStage();
    if (stageSeen < 0) stageSeen = stg;
    else if (stg > stageSeen) {
      seaFade = { from: stageSeen, to: stg, t: 0, dur: 1.8 };
      stageSeen = stg;
      addPopup(C.W / 2, 285, '海域演进 · 潜入「' + C.seaStages[stg].name + '」', true, 0);
      parts.push({ type: 'ring', x: C.W / 2, y: 285, r: 40, life: 0.9, max: 0.9, color: '#7FD4FF' });
      audio.big();
    }
    achTick -= dt;
    if (achTick <= 0) { achTick = 1; checkAchievements(); checkCollection(); checkDailyChallenge(); }
    if ((seenTick += dt) >= 30) { seenTick = 0; saveNum('mg_seen', Date.now()); } // 离线收益心跳

    updateTide(dt);
    phys.step(dt);
    applyBuoyancy(dt);
    updateSpecials(dt);

    var i, b;
    // 变形平滑：维护"变形矢量"（方向×幅度整体插值）——
    // 方向变化时矢量连续过渡（反转时幅度先收敛到圆再转向，角度噪声不可见）；
    // 速度低于死区直接回正圆，停稳后不再残留椭圆
    for (i = 0; i < phys.bodies.length; i++) {
      b = phys.bodies[i];
      // 渲染平滑：物理位置 → 渲染位置指数滤波（移动快时紧贴物理位，慢速时滤掉
      // 碰撞解算带来的亚像素级抖动，视觉上消除"移动不连续/微跳"的生硬感）
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
      // 运动拖尾采样（取渲染平滑位，避免拖尾与球体错位/抖动）
      if (!b.trail) b.trail = [];
      b.trail.push({ x: b.rx != null ? b.rx : b.x, y: b.ry != null ? b.ry : b.y });
      if (b.trail.length > 6) b.trail.shift();
    }

    // 无尽渐进加压计时 + 档位提示 + 高潮时刻
    endlessT += dt;
    var stgR = Math.floor(endlessRamp() * 4);
    if (stgR > rampStage) { rampStage = stgR; addPopup(C.W / 2, 250, '海域渐深：潮汐更频 · 礁石更多', true, 0); }
    if (score - climaxMark >= C.climaxEvery) doClimax();
    // 声音预警：危险→母线低通收紧；潮汐临近/进行→低频隆隆
    var dg = 0;
    for (i = 0; i < phys.bodies.length; i++) {
      b = phys.bodies[i];
      var ddist = (b.y - b.r) - C.dangerY;
      if (ddist < 90) dg = Math.max(dg, 1 - Math.max(0, ddist) / 90);
    }
    audio.bgm.setDanger(dg);
    audio.bgm.setTide(tide.progress, (tide.phase === 'idle' && tide.timer < C.tide.warnTime) ? 1 : 0);

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
