// 水滴合成深海 - systems：游戏状态 / 输入 / 合成 / 技能 / 潮汐 / 海域事件 / 图鉴数据 / 主更新
// 模块加载顺序 2/4（依赖 core.js：canvas、audio、存储助手）。顶层 var 初始化
// （rollTier 等）调用的函数与本文件同域提升，或来自已加载的 core.js。
// 水滴合成深海 - 游戏主逻辑
// 输入 / 合成 / 技能 / 图鉴 / 海域 / 特殊水滴(漩涡·雨云·冰晶) / 潮汐 / 任务链 / 渲染 / 音效 / 广告占位
// 全部 UI 画在 canvas 内（含按钮命中判定），便于后续原样移植到微信小游戏（无 DOM 环境）
  // ---------- 状态 ----------
  var phys = new MG.Physics();
  var state = 'menu'; // 开机先停在开始界面（主流小游戏设计：标题 + 开始按钮）
  var menuStartBtn = { x: C.W / 2 - MG.layout.menu.startW / 2, y: MG.layout.menu.startY, w: MG.layout.menu.startW, h: MG.layout.menu.startH }; // 「开始游戏」主按钮（x 随 startW 居中）
  // v237 主页↔游戏水域扫屏过渡：dir 'in'=入局 / 'out'=回主页，t0 起始时刻（performance.now 时钟，与 segAnims 同策略），
  // dur 时长；渲染层 drawRippleReveal 消费（涟漪揭幕：圆外旧画面快照、圆内新场景），过渡期内输入屏蔽。
  // sx/sy = 涟漪起点（内容层逻辑坐标，渲染层统一 +BX/+renderOy 转屏幕），由触发点传入。
  var menuTrans = { dir: null, t0: -9, dur: 1.1, sx: 0, sy: 0, snap: null };
  // 统一入口：dir 'in'=主页→游戏 / 'out'=游戏→主页；cx/cy = 涟漪圆心（内容层坐标）
  function startTransition(dir, cx, cy) {
    menuTrans.dir = dir;
    menuTrans.t0 = performance.now() / 1000;
    menuTrans.sx = cx; menuTrans.sy = cy;
    menuTrans.snap = null; // 渲染层首帧开头截取旧画面
  }
  // 主页功能磁贴（v234b：左二右二）——成就殿堂各项独立成钮（页签 0成就/1每日/2榜单 直达）。
  // 图鉴/分享磁贴按用户要求暂撤；命中几何唯一真源 layout.menuTileRect，图标/标签由渲染层画。
  var menuTiles = [
    { side: 'L', i: 0, icon: '📋', label: '每日任务', act: function () { achOpen = true; dexOpen = false; dexTab = 1; } },
    { side: 'L', i: 1, icon: '🎯', label: '每日挑战', act: function () { achOpen = true; dexOpen = false; dexTab = 2; } },
    { side: 'R', i: 0, icon: '🏆', label: '成就', act: function () { achOpen = true; dexOpen = false; dexTab = 0; achScroll = 0; } },
    { side: 'R', i: 1, icon: '🥇', label: '榜单', act: function () { achOpen = true; dexOpen = false; dexTab = 3; } }
  ];
  for (var mti = 0; mti < menuTiles.length; mti++) menuTiles[mti].pressT = 0;
  // ---------- 道具解锁（v316）：对应「符文」首次出现即永久解锁 ----------
  // 解锁条件 = 该技能的符文滴在预览里出现过一次（rollRune 滚出即记录，mg_rune 跨刷新持久）；
  // 未出现前道具保持锁定：底部钮显示挂锁，点击仅提示。充能（符文合成 / 大宝箱 / 图鉴里程碑）
  // 不受锁影响——解锁前照常累积，解锁后即可用。替换旧版"累计分解锁"（C.skillUnlock 已删）。
  // ★ 本块必须在下方首次 rollRune()（next-drop 初始化）之前求值——seeRune 要写 runeSeen。
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
  var best = 0; // 刷新页面即重新计，不跨刷新保留
  var nextTier = rollTier();
  var nextSpecial, nextRune, nextIron;
  rollNextDrop();
  var runeHintShown = false; // 符文玩法一次性提示
  var aimX = C.W / 2;
  var aiming = false;
  var cooldown = 0;
  var combo = 0, comboTimer = 0, maxCombo = 0;
  var doubled = false; // 结算双倍（v161 起去广告门，直接双倍）
  var reviveCount = 0; // 本局复活次数（v328 恢复：直接复活，无广告；先不做广告）
  var runBuffered = false; // 每局一次「深流缓冲」是否已用
  var popups = [], parts = [];
  var rippleQueue = []; // 待发的涟漪次波 { t, x, y }
  var time = 0;
  var overButtons = [];
  var shakeT = 0, shakeAmp = 0;
  var dangerAlert = 0; // 越线判定进度 0..1（checkDanger 每帧写入，警戒线渲染读取）
  var dangerRemain = 0; // 越线死亡缓冲剩余秒数（drawDangerText 倒计时用，v328）

  var skillCharge = { swap: 0, ripple: 0, evap: 0, flow: 0 };
  // 大宝箱（无尽模式）：定期沉入一只，限时点击开启随机奖励
  var chest = null;
  var chestTimer = 45 + Math.random() * 25; // v343：宝箱出现间隔拉长（原 26+20rand），降低出现频率
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
  var dexTab = 0;                  // 成就殿堂视图（v241 拆分）：0=成就 1=每日任务 2=每日挑战 3=榜单
  var achScroll = 0;               // v243 成就列表滚动量（单列超出一屏，拖拽/滚轮滚动）
  var achDrag = null;              // 成就列表拖拽中 { y, s0 }
  var dexSelSp = -1;               // 图鉴页当前选中的特殊滴说明（-1=未选）
  var dexSec = 0;                  // 图鉴主页分节：0=合成链 1=海域演进（特殊滴槽位并入海域行）
  var dexSelTier = -1;             // 选中的合成链档位（-1 未选）
  var dexSelStage = -1;            // 选中的海域阶段（-1 未选）
  // 跨局终身统计（成就进度用）：大宝箱/涨潮/珊瑚礁对/彩虹合成/任务/连击/单局最高分
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
  var tide = { phase: 'idle', timer: C.tide.cycleInterval, progress: 0, banner: 0 }; // v315：首潮倒计时直接用潮汐间隔（用户："首次涨潮倒计时也用潮汐间隔的时间"）
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
    '合成带符文的水滴，可为底部对应技能充能' // v344：原"攒满符文即可点亮"是 cost=1 前的旧措辞，已作废
  ];
  function endlessRamp() {
    return Math.min(1, endlessT / (C.ramp.minutes * 60));
  }
  // 成就永续加成查询（勋章变成长线）
  function perkOn(id) { return !!achDone[id]; }
  function perkMult() { return (achDone.tide12 && tide.progress > 0.2) ? 1.1 : 1; }
  // 数值封顶：所有乘区叠乘后总倍率不超过 C.multCap（防成就/海域加成叠乘导致分数膨胀）
  // v281：词缀不再提供得分倍率收益（用户：倍率太高），只保留难度增益
  function cm(m) { return Math.min(m, C.multCap); }

  // 技能渐进解锁：按累计得分逐个点亮（换滴开局即有，涟漪/蒸发/水流递进）
  // v316：解锁判定 = 对应符文已出现（runeSeen，mg_rune 持久）——替代旧版累计分门槛
  function skillUnlocked(key) { return !!runeSeen[key]; }

  // ---------- 二周目「深渊潜航」（免门槛：带词缀的高危高收益无尽局，经菜单「每日挑战」进入） ----------
  var ng = { unlocked: true, active: null };  // v341：免 5 万解锁门槛，直接进入（入口见菜单「每日挑战」）
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
    addPopup(C.W / 2, 300, (fromDaily ? '每日挑战 ·「' : '深渊潜航 ·「') + affix.name + '」', true, 0, 0, 'world'); // v331：挑战开局公告归 world（词缀名如"重压深潜"不含事件关键词）
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
    // v246：任务 3 → 5（合成 / 连击 + 大宝箱 / 涨潮 / 珊瑚礁三项全给，附加项随机排序）
    // v285：再次整体上调（用户："难度还是太低了，要进一步提高"）——合成 11~17→16~22、
    // 连击 5~8→7~11、大宝箱/珊瑚礁 2→3（封顶 4）、涨潮 3→4
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
      { type: 'iron',  need: Math.min(4, mn(3)), text: '消除珊瑚礁' }
    ];
    for (var i = extras.length - 1; i > 0; i--) { // 洗牌
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
    // ver 不符（任务数量/结构/数值变更）也强制重建当日任务——v285 任务数值再上调，ver 3→4
    if (!d || d.ver !== 4 || d.date !== today) {
      var streak = (d && d.date === yesterdayStr()) ? (d.streak || 0) : 0; // 断签清零
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
    // 全部完成 → 连续天数 +1（每天只涨一次）+ 天数奖励（v246：随任务数量泛化，不再写死三项）
    var allOk = daily.tasks.length > 0;
    for (var ai = 0; ai < daily.tasks.length; ai++) if (!daily.done[ai]) { allOk = false; break; }
    if (!daily.allDone && allOk) {
      daily.allDone = true;
      if (!daily.streakToday) { daily.streakToday = true; daily.streak++; }
      var bonus = C.daily.streakBase + daily.streak * C.daily.streakStep;
      score += bonus;
      scoreBump = 0.4;
      // v345：移除「每日全勤」顺带送的符文充能（原 addCharge(pk.key,2)）——它本是分数/连击奖励，
      // 却额外发符文，属"非符文滴获取符文"的来源之一；现只保留分数奖励本身
      addPopup(C.W / 2, 232, '今日全勤！连续 ' + daily.streak + ' 天 +' + bonus, true, 0);
      parts.push({ type: 'ring', x: C.W / 2, y: annY(232), r: 30, life: 0.7, max: 0.7, color: '#F5C542' });
      audio.quest();
    }
    saveDaily();
  }

  // ---------- 每日挑战（每天一局全服同规则的词缀挑战局：达到目标分即完成） ----------
  // 复用「深渊潜航」词缀管线（重力/潮汐/暗礁/冰冻/倍率全部已实现），另配两条更凶的每日专属词缀；
  // 完成状态持久化（mg_dchal），连续完成天数递增奖励；进行中的挑战局不持久化（刷新即丢，可重试）
  var DCHAL_AFFIXES = [
    { id: 'heavy',   name: '重压深潜', desc: '重力 +80%',              grav: 1.8 },   // v285：词缀再加重（用户：难度还是太低）；v328：+60%→+80%（用户："重压深潜（重力 +80%）"）
    { id: 'storm',   name: '疾风骤雨', desc: '潮汐间隔 -65%',          tideInt: 0.35 },
    { id: 'reef',    name: '暗礁密布', desc: '珊瑚礁概率 ×4',          ironX: 4 },
    { id: 'frost',   name: '寒冰速冻', desc: '水滴 35% 落水即冻',      ice: 0.35 },
    { id: 'abyss',   name: '深渊试炼', desc: '重力 +40% · 潮汐更频且潮期涌动加剧、无宽限',  grav: 1.4, tideInt: 0.35, tideToss: 1.9, tideNoGrace: true },  // v339：原"潮汐 -65%"在正常局实为增益（潮水托离警戒线+潮期引信×2更安全），改为真减益——潮期浮力×1.9涌动更猛、且取消潮期引信宽限（tideNoGrace），靠近警戒线时潮期也是真危险
    { id: 'icereef', name: '冰礁交错', desc: '暗礁 ×5 且 45% 落水即冻', ironX: 5, ice: 0.45 }
  ];
  var dchal = (function () {
    var d = MG.platform.getJSON('mg_dchal', null) || {};
    // v278：counts = 各词缀历史完成次数（跨天保留）
    if (d.date !== todayStr()) d = { date: todayStr(), done: false, streak: d.streak || 0, lastDate: d.lastDate || null, counts: d.counts || {} };
    if (!d.counts) d.counts = {};
    return d;
  })();
  function saveChal() { MG.platform.setJSON('mg_dchal', dchal); }
  var dchalRun = null; // 本局挑战参数 { goal }（仅运行期）
  function dayChalIdx() {
    // v243 深渊潜航每日轮换：按本地日期序号轮转，每天开放一个词缀（不再随机抽取）
    var d = new Date();
    return Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 864e5) % DCHAL_AFFIXES.length;
  }
  function dchalRoll() {
    var affix = DCHAL_AFFIXES[dayChalIdx()];
    var goal = Math.max(C.dailyChal.goalMin, Math.ceil((lifeStats.best || 3000) * C.dailyChal.goalBestRatio / 100) * 100);
    return { affix: affix, goal: goal, idx: dayChalIdx() };
  }
  function dchalStart() {
    if (state !== 'menu' && state !== 'over') return; // 对局中不可发起（防误触清空当前局面）
    var roll = dchalRoll();
    dchalRun = { goal: roll.goal, affixId: roll.affix.id }; // v278：记录词缀 id，完成后累加 counts
    ngStartRun(roll.affix, true);
    achOpen = false;
    // v245：与主页「开始游戏」同款涟漪揭幕（圆心 = 开始挑战按钮中心）
    var br = dchalBtnRect();
    startTransition('in', br.x + br.w / 2, br.y + br.h / 2);
  }
  // 面板/HUD 读取的挑战态（panels/render 经全局解析调用）
  // v243：list = 深渊潜航全部词缀（每天轮换开放一个），todayIdx = 今日开放的下标
  function dchalInfo() {
    var roll = dchalRoll(), list = [];
    for (var i = 0; i < DCHAL_AFFIXES.length; i++) {
      list.push({
        id: DCHAL_AFFIXES[i].id,
        name: DCHAL_AFFIXES[i].name, desc: DCHAL_AFFIXES[i].desc,
        count: (dchal.counts && dchal.counts[DCHAL_AFFIXES[i].id]) || 0, // v278：历史完成次数
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
  // dchalHud() 已移除（v196）：HUD 统计精简为"最高/最远海域"后无调用方（原仅 drawHUD 用）
  function checkDailyChallenge() {
    if (!ng.active || !ng.fromDaily || !dchalRun) return;
    if (dchal.date !== todayStr()) { dchal.date = todayStr(); dchal.done = false; saveChal(); } // 跨天兜底（长时间挂机）
    if (dchal.done) return; // 今日已完成：可继续玩但不重复发奖
    if (score < dchalRun.goal) return;
    dchal.done = true;
    dchal.streak = (dchal.lastDate === yesterdayStr()) ? (dchal.streak || 0) + 1 : 1;
    dchal.lastDate = todayStr();
    // v278：该词缀历史完成次数 +1（挑战页签列表展示"已完成 N 次"）
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

  // v348：横向均匀播种——第 i 个（共 n 个）元素落在第 i 条等宽竖带内（带内抖动保留自然感），
  // 取代旧版 Math.random() * LW 的纯随机：元素数量少时纯随机会整片聚在一侧（用户：
  // "左边元素比右边多"）。循环重生（气泡冒顶/闪粒出屏/水母升顶）也走它，
  // 保证任何时刻都均匀铺满全屏，不会越跑越聚。数量同时随屏宽放大，宽屏两侧不再因
  // 密度不足而显得空。
  function bandX(i, n, pad) {
    var w = LW / n, p = pad || 0;
    var x = (i + 0.5) * w + (Math.random() - 0.5) * w * 0.8;
    return Math.min(LW - p, Math.max(p, x));
  }
  // 数量随屏宽：以块宽 C.W 为密度基准，宽屏同密度铺满（上界防超宽屏过量）
  function scaleN(base, cap) { return Math.min(cap, Math.max(base, Math.round(base * LW / C.W))); }

  // 背景气泡
  var bubbles = [];
  var BUB_N = scaleN(14, 30);
  for (var bi = 0; bi < BUB_N; bi++) {
    bubbles.push({
      x: bandX(bi, BUB_N, 4), y: Math.random() * VH,
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
  function resetFish(f, keepDir) {
    var lk = fishLook();
    f.stg = seaStage();
    // v346：keepDir=true 时保留原游动方向（屏幕环绕用）；仅换海域重生才随机方向
    f.dir = keepDir ? f.dir : (Math.random() < 0.5 ? 1 : -1);
    f.x = f.dir > 0 ? -70 : LW + 70;
    f.y = 110 + Math.random() * Math.max(240, VH - 220);
    f.sp = lk.sp[0] + Math.random() * (lk.sp[1] - lk.sp[0]);
    f.s = lk.s[0] + Math.random() * (lk.s[1] - lk.s[0]);
    f.tint = lk.tint; f.tintD = lk.tintD;
    f.wob = Math.random() * Math.PI * 2;
  }
  // v346：鱼数随屏宽自适应（宽屏更密、分布更均匀，缓解"左右不均"观感）；窄屏保底 5 条
  var FISH_N = Math.max(5, Math.round(LW / 170));
  for (var fi = 0; fi < FISH_N; fi++) {
    var nf = { tail: 0, dir: 1, x: 0, y: 0, sp: 0, s: 0, wob: 0, fade: 0, stg: 0, tint: '', tintD: '' };
    resetFish(nf);
    nf.x = bandX(fi, FISH_N, 0); // v348：开局按条带均匀铺开（原 rand*LW 少量样本会聚一侧）
    nf.fade = 1; // 开局即在场的鱼不做淡入
    fishes.push(nf);
  }

  // 水母
  var jellies = [];
  var JELLY_N = Math.min(4, Math.max(2, Math.round(LW / 300))); // v348：2 只样本太少，瞬时必然偏一侧
  for (var ji = 0; ji < JELLY_N; ji++) {
    jellies.push({
      x: bandX(ji, JELLY_N, 50), // v347：水母画在全屏背景层（无 BX 偏移），旧版按 C.W 会开局全挤在左侧
      y: 240 + (ji * 170) % Math.max(200, VH - 320), // v348：多只时纵向错落且不越界
      s: 13 + Math.random() * 9,
      ph: Math.random() * Math.PI * 2,
      drift: 4 + Math.random() * 5,
      tint: (ji % 2) === 0 ? '255,175,205' : '185,160,255'
    });
  }

  // 微光闪粒
  var glitters = [];
  var GLI_N = scaleN(22, 46);
  for (var gi = 0; gi < GLI_N; gi++) {
    glitters.push({
      x: bandX(gi, GLI_N, 2), y: Math.random() * VH,
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
    if (seaStage() < ((C.specialStage && C.specialStage.iron != null) ? C.specialStage.iron : 0)) return false; // 珊瑚浅海起才落珊瑚礁（注意 0 是合法门槛，不能写 || 兜底）
    if (seaEvent && seaEvent.type === 'storm') return false; // 保底：风暴期间不再落礁石，避免双重失控
    if (ironCount() >= C.iron.maxActive) return false; // 场上已满员：预览不再出礁石，避免落下时被迫转成水滴
    var ch = C.iron.chance + (C.ramp.ironChanceMax - C.iron.chance) * endlessRamp();
    if (ng && ng.active && ng.active.ironX) ch *= ng.active.ironX; // 二周目「暗礁密布」
    return Math.random() < ch;
  } // 礁石概率随渐进加压提升
  // 符文：普通水滴随机附带的道具属性，合成时为对应技能充能
  // v316：① 池子不再按 skillUnlocked 过滤——未解锁技能的符文正是解锁来源（旧过滤下永远解锁不了）；
  //       ② 滚出即 seeRune 记录"已出现"→ 对应道具解锁（预览可见即生效，mg_rune 持久）。
  //       调用方须保证只在"这一滴确实带符文"时调用（礁石/特殊滴占位不滚，见 rollNextDrop）。
  function rollRune() {
    // v340：符文首现海域以配置为准——必须显式判断 number，否则 specialStage.rune=0 会被 `|| 2`
    // 当成 falsy 退回 2（蔚蓝深海），与图鉴 SP_DEFS rune.stage(=0 潮汐池) 不一致（用户核对发现）
    var runeStage = (C.specialStage && typeof C.specialStage.rune === 'number') ? C.specialStage.rune : 2;
    if (seaStage() < runeStage) return null; // 抵达配置海域才带符文（与图鉴一致）
    if (Math.random() >= C.rune.chance) return null;
    var keys = [], ws = [], total = 0, k;
    for (k in C.rune.weights) {
      if (!C.rune.weights.hasOwnProperty(k)) continue;
      keys.push(k); ws.push(C.rune.weights[k]); total += C.rune.weights[k];
    }
    if (!keys.length) return null;
    var r = Math.random() * total, pick = keys[keys.length - 1];
    for (k = 0; k < keys.length; k++) { r -= ws[k]; if (r <= 0) { pick = keys[k]; break; } }
    seeRune(pick); // 符文在预览中出现 → 对应道具解锁（持久）
    return pick;
  }
  // 下一滴预览三连滚（v316 合并原 4 处重复写法：初始化 / 每次投放后 / 换滴 / 重开）：
  // 特殊滴 → 礁石 → 符文。礁石/特殊滴占位的滴不带符文——预览所见即所得，
  // 也保证 rollRune（内含 seeRune 解锁）只在符文真正会出现时被调用。
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
  // 公告类特效锚定（v192）：设计稿 y（保留相对 209 的偏移让多条弹字错开）→ 镜像到
  // 警戒线下方的弹字带 mirrorCy = dangerY + 出生通道（出生区相对警戒线的镜像对称位，v190）。
  // addPopup 的文本映射与伴随 ring 粒子共用此换算——v190 只迁移了文本，7 处公告 ring
  // 遗留 9:16 旧稿坐标（y=150 三处落进 HUD 信息条 hudBottom=165、环与文字分离），
  // 自此公告类特效一律经 annY 派生，禁止再写死旧坐标。
  function annY(y) { return MG.layout.body.mirrorCy + (y - 209); }
  // v331：提示分色 7 类（用户确认方案，交互示例 test/popup_kinds_demo.html）：
  //   gain    金   — 得分微反馈（+N / 连击后缀）
  //   burst   紫   — 效果生效高光（特殊滴 / 大招 / 稀有合成）
  //   world   深青 — 海域与潮汐推进（演进 / 渐深 / 深海事件 / 挑战开局）
  //   reward  绿   — 奖励与里程碑（图鉴 / 成就 / 任务 / 宝箱 / 复活 / 充能）
  //   todo    琥珀 — 行动提醒（点宝箱 / 预告 / 教程）
  //   miss    暗红 — 落空与错失
  //   neutral 蓝灰 — 操作反馈回执（默认兜底）
  // 规则序已对全部调用点逐一核对（miss→todo→neutral→world→burst→gain→reward）；
  // 调用方仍可显式传 kind 覆盖（宝箱/todo、词缀/world、符文教程/todo）。
  function inferKind(t) {
    if (/落空|黯淡|枯了|熄灭|空空如也|沉入深渊|复制失败/.test(t)) return 'miss';
    if (/点它开启|甘霖 · 下一滴|需在潮汐中|带符文的水滴/.test(t)) return 'todo';
    if (/^换滴$|水流交换|符文 \d|出现后解锁|已复制/.test(t)) return 'neutral';
    if (/海域演进|海域渐深|潮位渐深|每日挑战 ·|深渊潜航 ·|深海涌泉|漩涡风暴|海神甘霖/.test(t)) return 'world';
    if (/彩虹合成|雷霆引合|珍珠祝福|虚空吞噬|熔岩灼烧|极光庇护|海神恩泽|汇入海域|海潮高潮|珊瑚礁相消|疾风|雨云化雨|甘霖降临|冰封|间歇泉/.test(t)) return 'burst';
    if (/^\+|珊瑚礁移除/.test(t)) return 'gain';
    if (/图鉴|成就|任务|全勤|挑战达成|大宝箱开启|复活|离线|解锁|充能|充满|符文|富豪|收益|收集|发现/.test(t)) return 'reward';
    return 'neutral';
  }
  function addPopup(x, y, text, isBig, mult, life, kind, attach) {
    // 公告带（居中 + 设计稿 y 180~320）锚定堆叠区镜像位（v190 用户："弹出提示（如涨潮等），
    // 要默认出现在出生区相对于警戒线在堆叠区中的镜像对称位置"）：基准 =
    // layout.body.mirrorCy = dangerY + 出生通道（出生区相对警戒线镜像到警戒线下方），
    // 保留设计稿相对 209 的偏移让多条弹字错开
    if (x === C.W / 2 && y >= 180 && y <= 320) y = annY(y);
    // 防重叠：与仍在显示中的弹字同带（横向接近）时顺移一行，多条同时弹出不再叠字。
    // ★ v326：顺移不得进入底部道具带（用户："有些（提示）则会出现在底部道具区域，
    //   这是不合理的"）——原逻辑只向下顺移，底部连发的微反馈（+分数/移除/合成）
    //   会层层 cascading 涌进六钮区（btnCy-btnR=floorY+10）。改为"贴冲突方跳一行"：
    //   冲突方在上且其下一行仍在容器底之上时下行，否则上行；一步到位收敛（不再
    //   固定 +30 反复往返）。上限 = 容器底 floorY：弹字绘制在实体层之上，压滴不
    //   挡字；底部道具带则一律不占。
    var popMaxY = MG.layout.body.floorY;
    for (var i = 0; i < popups.length; i++) {
      var op = popups[i];
      if (op.life > 0.35 && Math.abs(op.x - x) < 220) {
        while (Math.abs(op.y - y) < 28) {
          if (op.y < y && op.y + 30 <= popMaxY) y = op.y + 30;
          else y = op.y - 30;
        }
      }
    }
    if (y > popMaxY) y = popMaxY; // 双重保险：锚点本身落在道具带内也夹回带上
    // v325：弹字时长参数化——原一律 life=1.0s，而渲染 alpha=life/max×1.5 ⇒ 前 1/3
    // 时长（0.33s）后就开始淡出，海神恩泽/深海事件/成就等公告一闪而过看不清
    // （用户："有些提示信息出现的太短了，比如海神恩泽等，出现时间要稍微长一点！
    // 请梳理一下类似的提示并做出优化！"）。大字号公告默认 2.0s（不透明段 1.33s，
    // 4 倍于原可读时间）；+分数/技能短标签等微反馈仍 1.0s；个别重要小字提示
    // （甘霖预告/符文教程/越线冲走/任务更新/宝箱错过）显式传 life 延长。
    var lf = life || (isBig ? 2.0 : 1.0);
    var p = { x: x, y: y, text: text, life: lf, max: lf, big: !!isBig, mult: mult || 0, scale: 0.4, kind: kind || inferKind(text) };
    // 跟随实体（如大宝箱）：弹字贴着实体走，实体被移除即消失——避免"宝箱降落、文本上升"错位
    if (attach) { p.attach = attach; p.attachOff = { x: x - attach.x, y: y - attach.y }; }
    popups.push(p);
  }
  function addShake(amp, dur) {
    shakeAmp = Math.max(shakeAmp, amp);
    shakeT = Math.max(shakeT, dur);
  }
  function updateFx(dt) {
    var i, p;
    // v351：以下三个队列统一改「正序 write-index 原地压缩」——旧版倒序 splice 每删一个都要搬移
    // 其后全部元素（O(n)），粒子/弹字密集时整段退化成 O(n²)；压缩版一趟 O(n)、零搬移、保序。
    // 涟漪次波（延迟到达的第二推）
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
      if (p.attach) { // 跟随实体：贴着目标移动；目标已不在场上（宝箱开启/沉走）则移除
        if (phys.bodies.indexOf(p.attach) < 0) alive = false;
        else {
          p.x = p.attach.x + p.attachOff.x;
          p.y = p.attach.y + p.attachOff.y;
          p.life -= dt; // v340：跟随弹字也要走生命周期，否则大宝箱提示会一直贴着宝箱不消失
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
      if (p.y < -8) { p.y = VH + 8; p.x = bandX(i, bubbles.length, 4); } // v348：重生也按条带
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
      // v346：平滑环绕——保留游动方向，游出一侧即从对侧同方向续游（不再瞬移+随机反向，
      // 修复"右侧消失后左侧倒着游回来、左右不均衡"的观感）；换海域淡出淡入仍走下方 resetFish(f)
      if (f.dir > 0 && f.x > LW + 70) resetFish(f, true);
      else if (f.dir < 0 && f.x < -70) resetFish(f, true);
    }
    for (i = 0; i < jellies.length; i++) {
      var jl = jellies[i];
      jl.y -= jl.drift * dt;
      jl.x += Math.sin(time * 0.5 + jl.ph) * 9 * dt;
      if (jl.y < 170) { jl.y = VH * 0.88; jl.x = bandX(i, jellies.length, 50); } // v348：重生也按条带
    }
    for (i = 0; i < glitters.length; i++) {
      var gl = glitters[i];
      gl.y -= gl.sp * dt;
      if (gl.y < -6) { gl.y = VH + 6; gl.x = bandX(i, glitters.length, 2); } // v348：重生也按条带
    }
    if (shakeT > 0) { shakeT -= dt; if (shakeT <= 0) shakeAmp = 0; }
    if (scoreBump > 0) scoreBump -= dt;
    // 按钮按压反馈计时
    if (bookBtn.pressT > 0) bookBtn.pressT -= dt;
    for (var mi = 0; mi < menuTiles.length; mi++) if (menuTiles[mi].pressT > 0) menuTiles[mi].pressT -= dt; // v233 主页磁贴按压回弹
    if (setBtn.pressT > 0) setBtn.pressT -= dt; // v197：设置钮（原奖杯×2/静音三处已移除）
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
    // v285：目标再上调一档（用户："难度还是太低了"）；desc 与 target 保持一致（已达成的成就保留不撤）
    { id: 'score2k',  name: '深海富豪', desc: '单局得分达到 65000',        target: 65000,  diff: 1, perk: '永续 · 开局充能 +1', cur: function () { return Math.max(score, best, lifeStats.best || 0); } }, // v350：perk 文案 +2→+1 与实际一致
    { id: 'combo6',   name: '连浪十叠', desc: '达成 10 连击',              target: 10,     diff: 1, perk: '永续 · 连击窗 +0.3s', cur: function () { return Math.max(maxCombo, lifeStats.combo || 0); } },
    { id: 'chest5',   name: '寻宝猎人', desc: '累计开启 25 只大宝箱',  target: 25,     diff: 1, perk: '永续 · 大宝箱奖励 +50%', cur: function () { return lifeStats.chest || 0; } },
    { id: 'tide12',   name: '弄潮儿',   desc: '经历 55 次涨潮',            target: 55,     diff: 2, perk: '永续 · 潮期得分 +10%', cur: function () { return lifeStats.tide || 0; } },
    { id: 'iron5',    name: '珊瑚礁克星', desc: '累计消除 28 对珊瑚礁',  target: 28,     diff: 2, perk: '永续 · 珊瑚礁相消 ×2', cur: function () { return lifeStats.ironPair || 0; } },
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
      // 奖励按难度分级：★ +60/充能1 · ★★ +150/充能2 · ★★★ +400/充能4
      var d = a.diff || 1;
      var base = d === 3 ? 400 : (d === 2 ? 150 : 60);
      var gain = Math.round(base * cm(scoreMult));
      score += gain;
      scoreBump = 0.4;
      var pick = C.skills[(Math.random() * C.skills.length) | 0];
      // v350：成就充能 ★★★ 4→3（★/★★ 的 1/2 已是最低档，保持）
      addCharge(pick.key, d === 3 ? 3 : (d === 2 ? 2 : 1));
      addPopup(C.W / 2, 240, '成就达成 · ' + a.name + ' +' + gain, true, 0);
      addPopup(C.W / 2, 266, '「' + pick.name + '」充能 +' + (d === 3 ? 3 : (d === 2 ? 2 : 1)), false, 0);
      parts.push({ type: 'ring', x: C.W / 2, y: annY(150), r: 26, life: 0.6, max: 0.6, color: '#F5C542' });
      audio.quest();
      saveDex();
    }
  }

  // ---------- 特殊水滴图鉴（发现即点亮；与海域绑定：stage=解锁海域） ----------
  // 每片海域相对上一片恰好新增 2 种（潮汐池=符文滴+大宝箱，大宝箱在图鉴中单列）
  // v317 用户定版：符文滴→潮汐池、珊瑚礁(iron)→珊瑚浅海、漩涡滴→蔚蓝深海
  var SP_DEFS = [
    { key: 'vortex',  stage: 2, name: '漩涡滴', color: '#7B6FD0', desc: '吸附周围水滴后消散，聚拢散滴。' },
    { key: 'cloud',   stage: 1, name: '雨云滴', color: '#8FA8BC', desc: '分裂成两颗雾泡，补充低级滴。' },
    { key: 'iron',    stage: 1, name: '珊瑚礁', color: '#6E7B88', desc: '沉重障碍，两两相消或蒸发移除。' },
    { key: 'ice',     stage: 2, name: '冰晶滴', color: '#A8DFF2', desc: '冻结周围水滴，可当临时平台。' },
    { key: 'rune',    stage: 0, name: '符文滴', color: '#B08FD0', desc: '合成时为对应技能 +1 充能。' },
    { key: 'rainbow', stage: 3, name: '彩虹滴', color: '#E86FA8', desc: '使碰到的水滴跳 2 级，得分双倍。' },
    { key: 'gale',    stage: 3, name: '疾风滴', color: '#7FCDA4', desc: '刮起疾风吹开周围水滴。' },
    { key: 'magnet',  stage: 4, name: '磁石滴', color: '#6A8FD8', desc: '磁场漩涡聚拢大范围水滴。' },
    { key: 'spring',  stage: 4, name: '甘霖滴', color: '#8FD8B8', desc: '下一滴变成场上最多的档位。' },
    { key: 'thunder', stage: 5, name: '雷霆滴', color: '#F2C14E', desc: '引雷让一对同档水滴直接合成。' },
    { key: 'pearl',   stage: 5, name: '珍珠滴', color: '#F0E6D2', desc: '祝福最多的档位全体升 1 级。' },
    { key: 'magma',   stage: 6, name: '熔岩滴', color: '#E2703A', desc: '烧毁周围珊瑚礁与最低两档。' },
    { key: 'geyser',  stage: 6, name: '间歇泉滴', color: '#5FC8D8', desc: '向上喷出水柱，冲开上方水滴。' },
    { key: 'void',    stage: 7, name: '虚空滴', color: '#4A3A6A', desc: '吞噬最低档水滴至多 5 颗。' },
    { key: 'aurora',  stage: 7, name: '极光滴', color: '#9BE8D8', desc: '极光庇护：下次合成得分 ×3。' }
  ];
  function spIndexByKey(key) {
    for (var i = 0; i < SP_DEFS.length; i++) if (SP_DEFS[i].key === key) return i;
    return -1;
  }
  // 海域 → 图鉴两个槽位的 dexSelSp 索引（潮汐池槽 2 = 大宝箱虚拟位 SP_DEFS.length）
  var STAGE_SP_SLOTS = {};
  (function () {
    var per = {}, i;
    for (i = 0; i < SP_DEFS.length; i++) {
      var st = SP_DEFS[i].stage;
      (per[st] = per[st] || []).push(i);
    }
    for (var k in per) if (per.hasOwnProperty(k)) STAGE_SP_SLOTS[k] = [per[k][0], per[k][1]];
    STAGE_SP_SLOTS[0] = [spIndexByKey('rune'), SP_DEFS.length]; // v317：潮汐池 = 符文滴 + 大宝箱
  })();
  function discoverSpecial(sp) {
    if (dexSpecial[sp]) return;
    dexSpecial[sp] = 1;
    saveDex();
    var i = spIndexByKey(sp);
    addPopup(C.W / 2, 240, '图鉴新发现 · ' + (i >= 0 ? SP_DEFS[i].name : '大宝箱'), true, 0);
    checkCollection();
  }

  // ---------- 图鉴收集度（长线收集闭环：水滴 9 档 + 特殊形态 15 种 + 大宝箱 = 25 格） ----------
  // 达成率跨过里程碑即自动发放奖励（对齐成就奖励体系：积分 + 技能充能 + 宝箱贺礼）；
  // 领取记录持久化（mg_dex.col），老存档的既有收集会在下一局开始后 1 秒内自动补发
  var COL_MILESTONES = [
    { id: 'm25',  pct: 0.25, score: 500,  charge: 1, name: '收集 25%' },
    { id: 'm50',  pct: 0.5,  score: 1200, charge: 1, name: '收集 50%', chest: true },  // v350：2→1
    { id: 'm75',  pct: 0.75, score: 2500, charge: 2, name: '收集 75%', chest: true },  // v350：3→2
    { id: 'm100', pct: 1,    score: 6000, charge: 0, name: '集齐图鉴', allCharge: 1 }  // v350：全技能 2→1
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
        // v316：优先充已解锁技能；全部未解锁时兜底充任意技能（充能可预先累积，解锁即用）——
        // 旧版 filter 后 keys 可能为空（开局全锁），keys[random] 会写出 skillCharge[undefined]
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
      if (m.chest && !chest && state === 'play') chestTimer = Math.min(chestTimer, 4); // 稍后沉一只大宝箱贺礼
      parts.push({ type: 'ring', x: C.W / 2, y: annY(150), r: 26, life: 0.6, max: 0.6, color: '#F5C542' });
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
    addCharge(pick.key, pick.cost);
    addPopup(C.W / 2, 240, '任务完成 +' + gain, true, 0);
    addPopup(C.W / 2, 266, '「' + pick.name + '」已充满', false, 0);
    parts.push({ type: 'ring', x: C.W / 2, y: annY(150), r: 20, life: 0.5, max: 0.5, color: '#F5C542' });
    audio.quest();
    if (score > best) { best = score; saveNum('mg_best', best); }
    makeQuest(questDepth + 1);
  }

  // ---------- 合成 ----------
  function processMerges() {
    var bs = phys.bodies, used = {}, merges = [], rainbowPairs = [], i, j;
    // 彩虹滴：接触任意普通水滴 → 目标滴直接跳 2 级（趣味高光时刻，优先于普通合成）
    // v305：扫描与执行分离——原实现边遍历边 doRainbowMerge（内含 phys.remove 的 splice
    // 移位），同帧会漏检移位处的一个实体；改为标记收集、扫描完统一执行
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
      // v305：pop 弹出动画期（popT>0，尺寸 60%~115% 过渡）不参与合成——避免"小水滴跟
      // 正常水滴消除"的观感；pop 结束后下一接触帧立即正常合成，连击链只多 0.28s 步进
      if (used[a.id] || a.special || a.frozen > 0 || a.iron || a.popT > 0) continue;
      for (j = i + 1; j < bs.length; j++) {
        var b = bs[j];
        if (used[b.id] || b.special || b.frozen > 0 || b.iron || b.tier !== a.tier || b.popT > 0) continue;
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
    var gain = Math.round(C.iron.pairScore * cm(scoreMult * (perkOn('iron5') ? 2 : 1))); // 成就加成：珊瑚礁克星翻倍；总倍率封顶
    score += gain;
    scoreBump = 0.3;
    if (score > best) { best = score; saveNum('mg_best', best); }
    addPopup(mx, my - b.r - 12, '珊瑚礁相消', true, 0);
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
        addPopup(C.W / 2, 240, '甘霖 · 下一滴是「' + T[t].name + '」', false, 0, 1.6); // v325：预告类信息，1.6s 够读完
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
            pushNeighbors(b.x, b.y, 185, 260); // v337：加大吹开半径与力度，效果肉眼可见
            burst(b.x, b.y, b.tier, false);
            // v337：三圈扩散风环 + 横向阵风粒子，强化"吹开"的视觉反馈
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
          o.vortexGrace = C.extGrace; // v327：被漩涡拽拉/甩飞的水滴免予堆高判负（用户："漩涡滴带飞的水滴不参与堆高判定"）；v352：0.2s→extGrace(1.2s)——磁石吸力 6200 远大于重力，落回不止 0.2s
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
    // v339：随机分裂 2~3 颗，每颗档位随机 0..maxTier（不大于当前等级，保持"补充低级滴"定位）
    var n = C.cloud.minSplit + ((Math.random() < 0.5) ? 0 : (C.cloud.maxSplit - C.cloud.minSplit));
    var cap = C.cloud.maxTier;
    var spread = (n === 3) ? 1.0 : 0.7;   // 三颗撒得更开
    for (var i = 0; i < n; i++) {
      var tier = (Math.random() * (cap + 1)) | 0;                 // 0..cap 随机档位
      var ang = (i / n - 0.5) * spread * Math.PI;                 // 以虚影为中心左右扇形散开
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
    // v352：消散瞬间再给范围内水滴补一次外力宽限——此刻被拽拉的水滴多半还在空中（正飞向/
    // 围绕原中心），磁石一消失吸力即断，若只剩残余宽限就会在"落回途中"开始攒引信。补满
    // extGrace 让它们从容落回；落定后若仍在越线区，那是真实堆高，照常计时判负。
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
      // v305：升档必须同步半径——此前只改 tier 不改 r，升档滴永远保持旧档的小半径，
      // 却能与新档正常大小的水滴合成（用户："不同大小的相同类型水滴可以消除"）
      o.tier += 1; o.r = T[o.tier].r; o.popT = 0.3; n++;
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
    }
    phys.removeMany(burn); // v351：批量一次删完（逐个 remove 是 indexOf+splice 的 O(k*n)）
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
    }
    phys.removeMany(victims, n); // v351：只吞前 n 个；count 参数避免 slice 分配
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
  // 潮位设计（v328）：满潮水面 = 警戒线→底部(450px)的"填充比例"——浅海最低填 1/4、深海最高填 3/4，
  // 线性、且恒在警戒线下方。fill(sea)=lowFrac+(highFrac-lowFrac)×sea/(n-1)；
  // 满潮水面 y = floorY - zone×fill（zone=floorY-dangerY）。最满 fill=0.75 时水面=427.5，仍在线下 112.5px。
  // 取代 v322 的 overMin/overMax（原深海满潮没过警戒线，违反"不超过警戒线"）。
  function tideWaterMax() {
    var H = FLOORY - C.containerTop;
    var zone = FLOORY - C.dangerY;
    var fill = C.tide.lowFrac + (C.tide.highFrac - C.tide.lowFrac) * (seaStage() / (C.seaStages.length - 1));
    return (zone * fill) / H; // 满潮水面 = FLOORY - H×tideWaterMax = FLOORY - zone×fill（恒 ≥ 警戒线）
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
        // v327：涨潮持续随海域线性拉长（sea0=duration → 深渊王座=durationMax），让深海引信链在退潮前兑现（原写死 duration，深海首潮永不致死）
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
        // v311：潮汐间隔改为随海域推进变短（原为随局内时长 endlessRamp）——
        // 初始 cycleInterval 32s 线性压到深海的 tideIntervalMin 16s；词缀局再乘疾风骤雨系数
        var tiv = C.tide.cycleInterval - (C.tide.cycleInterval - C.ramp.tideIntervalMin) * (seaStage() / (C.seaStages.length - 1));
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
      // v305：同珍珠滴——升档同步半径（否则祝福后全体水滴都小一号，与合成产物大小不一）
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
      if (b.iron || b.frozen > 0) continue; // 礁石沉底不浮起
      var subm = (b.y + b.r - wy) / (2 * b.r);
      if (subm <= 0) continue;
      var f = Math.min(1, subm);
      var buoy = C.tide.buoyancy * ((ng.active && ng.active.tideToss && tide.phase === 'active') ? ng.active.tideToss : 1); // v339：深渊试炼潮期浮力×tideToss，涌动更猛、更难落位
      b.vy -= buoy * f * dt;
      // 水的阻力
      var drag = Math.min(0.9, 2.2 * f * dt);
      b.vx *= (1 - drag);
      b.vy *= (1 - drag);
      // 水面轻微晃动推力（制造涌动感）
      b.vx += Math.sin(time * 2.2 + b.y * 0.02) * 14 * f * dt;
    }
  }

  // ---------- 技能 ----------
  // 充能写入（统一入口，v338：超额储备——允许叠到 skillMaxQ 倍 cost，溢出截断不再清零）
  function addCharge(k, n) {
    if (!(k in skillCharge)) return;
    var cap = skillCost(k) * C.skillMaxQ;
    skillCharge[k] = Math.min(cap, (skillCharge[k] || 0) + n);
  }
  // 符文充能：合成带符文的水滴 → 对应技能 +1（v338：可叠到 skillMaxQ 倍，不再满即停）
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
      return;
    }
    if (key === 'flow') {
      if (flowMode) { flowMode = false; flowPick = null; return; }
      if (skillCharge.flow < skillCost('flow')) { flashSkill('flow', '「' + runeName('flow') + '」符文不足'); return; }
      flowMode = true;
      evapMode = false; rippleMode = false;
      return;
    }
    if (key === 'ripple' && rippleMode) { rippleMode = false; return; } // 再点按钮取消选位
    if (skillCharge[key] < skillCost(key)) {
      flashSkill(key, '「' + runeName(key) + '」符文不足');
      return;
    }
    if (key === 'swap') {
      skillCharge.swap -= skillCost('swap'); // v338：扣一次费用而非清零，支持多次充能连放
      nextTier = rollTier();
      rollNextDrop();
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
    skillCharge.flow -= skillCost('flow'); // v338：扣一次费用而非清零
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
    skillCharge.ripple -= skillCost('ripple'); // v338：扣一次费用而非清零
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
      var rr = b.r + 5;
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
    addPopup(b.x, b.y - b.r - 8, b.iron ? '珊瑚礁移除 +' + gain : '+' + gain, false, 0);
    phys.remove(b);
    skillCharge.evap -= skillCost('evap'); // v338：扣一次费用而非清零
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
    // 失败判定：越线即计时、不看速度（v323/v326）。堆叠/微颤柱"明显越线却迟迟不判负"的根因是
    // 速度门把"持续越线"与"瞬时横穿"混为一谈，而后者由三重机制区分（出生宽限 0.6s、引信 1.1s、
    // 出线即清零），故越线滴一律计时。v328 起潮汐水面恒在警戒线下方（见 tideWaterMax），潮汐只做
    // 水下浮力重排、不再把水滴推越线；潮汐期间引信仍 ×2（水下游动更慢，给足反应）——但深渊试炼(tideNoGrace)取消此宽限。
    // ★ v352 豁免范围界定（用户明确）：只有「被特殊滴外力拽拉」的水滴豁免（见 C.extGrace）。
    //   深海涌泉(1800)/风暴向心力(2400)/间歇泉(geyserF)/潮汐浮力造成的越线属正常游戏机制，
    //   一律不豁免——它们把水滴顶过线，该判负就判负。
    // 三条豁免：冻结滴(b.frozen)、漩涡/磁石拽拉甩飞(b.vortexGrace)、全部瞬态特殊滴(b.special)不计堆高。
    // 死亡缓冲：越线即显示"死亡缓冲"倒计时(dangerRemain)，每局一次首死延长引信即为缓冲（弹字已移除）。
    // ★ v323：潮汐判负两条修正（用户："涨潮引起的越线好像很难死亡，是判定不对吗？"；
    //   test/sim_danger.js 仿真定位）——① 引信 ×5→×2：漂浮滴均速仅 45~53px/s，却因
    //   初升时一次性 ~7px 回落出线清零、约 3.5s 后才稳定越线，×5 引信最早 ~9s 才攒满，
    //   超过涨潮全长 8s——"一次涨潮内永远攒不满、潮退滴落计时清零"是越线很难死亡的主因；
    //   ② 潮汐期间越线即计时、不看速度：速度门只堵死 10~13% 采样，却把"持续漂浮"与
    //   "被合成反冲弹飞的瞬时横穿"混为一谈——漂浮持续、横穿 <0.5s，2.2s 引信天然区分
    //   （回落出线即清零）。
    // ★ v326：非潮汐路径同潮汐——越线即计时、不看速度（用户："开始游戏时直接叠罗汉
    //   超过警戒线也没有提示？"；test/sim_column.js 仿真定位）。真因：垂直细柱（12 滴
    //   同 x 叠罗汉）在本引擎里永不"静止"——位置稳定在 ±1px（边缘滴 8s 纹丝不动），
    //   但堆内接触解算持续微颤，越线滴均速 162px/s（>速度门 120），dangerT 被速度门
    //   100% 堵死、再被衰减清零 ⇒ 警示条恒 0：无闪烁、无"堆高越线"文字、无判负。
    //   速度门把"持续越线（堆高/微颤柱）"与"瞬时横穿（掉落/反冲/技能推射）"混为一谈，
    //   而后者由三重机制区分、不需要速度门：① 出生宽限 0.6s > 任何容器内穿线时长
    //   （~0.42s，sim_danger.js D 案 / sim_column.js J 案回归：峰速 572px/s 仍判负为无）；
    //   ② 引信 1.1s >> 穿线时长 0.2~0.4s；③ 出线（top≥dangerY）即清零。
    var tideOn = tide.progress > 0.15;
    if (ng.active && ng.active.tideNoGrace) tideOn = false; // v339：深渊试炼取消潮期引信宽限——潮期靠近警戒线也是真危险（原潮期×2 反成安全网，是"潮汐更频"实为增益的根因）
    var bs = phys.bodies;
    var worst = 0, minRemain = 99;
    for (var i = 0; i < bs.length; i++) {
      var b = bs[i];
      if (b.frozen > 0) continue;                 // 冻结滴"封存"，不判负
      if (b.special) continue;                     // v328：瞬态特殊滴（漩涡/雨云/冰晶/磁吸/熔岩/间歇泉/虚空/极光/彩虹/雷霆/珍珠/甘霖…）不计堆高
      if (b.grace > 0) { b.dangerT = 0; continue; }
      if (b.vortexGrace > 0) { b.vortexGrace -= dt; b.dangerT = 0; continue; } // v327：漩涡拽拉/甩飞豁免堆高判负
      var top = b.y - b.r;
      if (top >= C.dangerY) { b.dangerT = 0; continue; } // 线下，重置
      var fuse = tideOn ? C.dangerTime * 2 : C.dangerTime * (top < C.containerTop ? 0.55 : 1);
      if (!runBuffered) fuse = Math.max(fuse, C.dangerTime * 3); // 首次越线引信延长至 3s（缓冲），复活后不再延长
      b.dangerT += dt;
      var remain = fuse - b.dangerT;
      // v336：倒计时只走一次（用户"堆高越线会倒计时两次！"）——原两段式（首段 3s 走完
      // 重置全体计时、再按常规引信 1.1s 倒数第二遍才结算）观感即"倒计时两次"。现引信到点
      // 直接结算：首次越线 3s、复活后 1.1s（doRevive 已置 runBuffered），倒计时只出现一轮。
      if (remain <= 0) { dangerAlert = 0; dangerRemain = 0; gameOver(); return; }
      var w = b.dangerT / fuse;
      if (w > worst) worst = w;
      if (remain < minRemain) minRemain = remain;
    }
    dangerAlert = Math.min(1, worst);                  // 0..1，供警戒线渲染加强警示
    dangerRemain = worst > 0 ? Math.max(0, minRemain) : 0; // 死亡缓冲剩余秒（倒计时）
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
  // 测试钩子（仅自动化测试用）：充能 / 成就 / 局面构造 / 加压进度
  MG.debug = {
    give: function (k, n) { addCharge(k, n); },
    setNext: function (opt) {
      opt = opt || {};
      nextIron = !!opt.iron;
      nextSpecial = opt.special || null;
      nextRune = !opt.special && !opt.iron ? (opt.rune || null) : null;
      if (nextRune) seeRune(nextRune); // 与 rollRune 同一不变量：符文出现 ⇒ 道具解锁
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

  // ---------- 大宝箱（探索要素） ----------
  function spawnChest() {
    discoverSpecial('chest');
    var b = createIron(C.W * (0.2 + Math.random() * 0.6), C.dangerY + 52); // 警戒线下方开阔水域生成，不压坠落区虚影
    b.chest = true;
    b.r = 17; b.m = b.r * b.r * 6; // 比礁石轻，不会被砸得太凶
    chest = { b: b, t: 0, life: 14 }; // 14 秒内不点就沉走
    // v340：提示跟随宝箱实体（attach=b），宝箱降落时文字同步下移；life 显式 2.5s，跟随弹字也走生命周期（不再永不消失）
    addPopup(b.x, C.dangerY + 10, '沉大宝箱！点它开启', true, 0, 2.5, 'reward', b); // v343：出现提示统一绿色（与图鉴新发现/开启收益同色）
    audio.blip(392, 0.25, 'triangle', 0.14, 1.5);
  }
  function expireChest() {
    if (chest) {
      burstIron(chest.b.x, chest.b.y);
      phys.remove(chest.b);
      addPopup(C.W / 2, FLOORY - 60, '大宝箱沉入深渊…', false, 0, 1.6); // v325：错过提示，1.6s
    }
    chest = null;
    chestTimer = 75 + Math.random() * 40; // v343：错过沉走后重置间隔拉长（原 40+25rand）
  }
  function openChest() {
    var x = chest.b.x, y = chest.b.y;
    phys.remove(chest.b);
    chest = null;
    chestTimer = 85 + Math.random() * 45; // v343：开启后重置间隔拉长（原 45+30rand）
    var r = Math.random();
    var chestBonus = perkOn('chest5') ? 1.5 : 1; // 成就加成：寻宝猎人
    if (r < 0.68) { // v350：分数档 60%→68%（符文档相应压缩到 12%）
      var gain = Math.round((60 + Math.random() * 90) * cm(scoreMult * chestBonus));
      score += gain; scoreBump = 0.4;
      if (score > best) { best = score; saveNum('mg_best', best); }
      addPopup(x, y - 30, '大宝箱开启 +' + gain, true, 0, 0, 'reward'); // v343：'good'不在 PCOLMAP 会回退蓝灰→改 reward 绿
    } else if (r < 0.80) { // v344：35%(0.4~0.75)→18%(0.6~0.78)；v350：→12%(0.68~0.80)，道具获取整体降低
      // v316：只充已解锁技能（符文道具）；v329：未解锁任何技能时不开符文道具，改发积分
      // （用户："宝箱不能开出未出现的道具，例如符文道具还没激活"）——移除旧"全锁兜底充任意"逻辑
      var keys = ['swap', 'ripple', 'evap', 'flow'].filter(function (k) { return skillUnlocked(k); });
      if (keys.length) {
        var k = keys[(Math.random() * keys.length) | 0];
        var cn = perkOn('chest5') ? 2 : 1; // v350：+2/+3 → +1/+2（宝箱符文收益同步降一档）
        addCharge(k, cn);
        addPopup(x, y - 30, '大宝箱开启：' + runeName(k) + ' +' + cn + ' 充能', true, 0, 0, 'reward');
      } else {
        var g2 = Math.round((60 + Math.random() * 90) * cm(scoreMult * chestBonus));
        score += g2; scoreBump = 0.4;
        if (score > best) { best = score; saveNum('mg_best', best); }
        addPopup(x, y - 30, '大宝箱开启 +' + g2, true, 0, 0, 'reward');
      }
    } else {
      // v329：彩虹滴未曾在图鉴出现（dexSpecial）前不开出，改发积分——同理不提前放出未解锁道具
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
    // 滞留任务刷新：进度远超任务生成时的基准（连跳 3 档）时换一个跟上难度的任务
    questStaleT -= dt;
    if (questStaleT <= 0) {
      questStaleT = 4;
      if (quest && quest.bornMax != null && questMaxTier() - quest.bornMax >= 3) {
        makeQuest(questDepth);
        addPopup(C.W / 2, 266, '任务已更新', false, 0, 1.6); // v325：任务切换提示，1.6s
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
      // v194：锚堆叠区中心（layout.body.stackCy = (dangerY+floorY)/2 = 540+dy）。
      // 旧公式"从容器顶往下 45%"在 v184 容器顶改 0 后静默漂移到 344，漩涡盘
      // （半径110、y 轴压扁 0.55）盘顶压过警戒线 31px——用户报"每次都接近警戒线"
      seaEvent.y = MG.layout.body.stackCy;
    }
    audio.tide();
  }
  function applySeaEvent(dt) {
    var bs = phys.bodies, i, b;
    if (seaEvent.type === 'surge') {
      // v307：上托力 1500→2700——原值与重力（1500）恰好抵消，净加速度为零，水滴只是悬停
      // 根本不会被"托起"（用户："施加的力似乎有点小"）；作用区 190→210，涌泉感更明显
      // v308：上托力回调 2700→1900（净上托 400，"轻轻托起"的温和感；v307 的 2700 过猛）
      // v324：抬升高度减半——用户："深海涌泉力太大了，吹起的水滴太高了，可以减少一半的高度"。
      // 作用区 210→105 + 上托力 1900→1700（净上托 400→200）。两个杠杆都必须动：
      // ① 高度 ≈ 作用区×(1+净上托/重力)，作用区是主项——只砍力最多降 11%，砍半作用区
      //    单滴正好减半（实测 252→126px）；
      // ② 但只砍作用区会更糟：底部滴以更集中的速度（出口 410→290px/s）撞上半堆，
      //    同档滴被压紧合成、产物继承撞速+反冲上抛，混合堆堆顶反而 234→316px 变高
      //    （sim_surge.js 实测）。同步把力降到 1700（出口速度 204px/s）让撞堆变缓，
      //    堆叠局面的抬升才真正减半。
      // v329：修复"轻轻托起"失效——净上托 200 在密集堆叠下被挤压抵消、几乎看不出抬升
      // （用户："深海涌泉不能轻轻托起底部水滴"）。恢复可见的温和上托：力 1700→2000
      // （净上托 200→500）、作用区 105→160（更多底部滴被卷入），底部滴明显上飘后回落，
      // 仍远低于 v307 的猛烈上抛，保持"轻轻"手感。
      // v334：回调过冲——用户："深海涌泉（温和托起底部水滴）托起的太高了，不合理！"
      // v329 组合高度 ≈ 160×(1+500/1500) = 213px，超出"温和"区间。回调到 力 2000→1800
      // （净上托 500→300）+ 作用区 160→125：高度 ≈ 125×(1+300/1500) = 150px——
      // 高于 v324 的 119px（看不见）与 v329 的 213px（太高）之间取温和可见档；
      // 出口速度 sqrt(2·300·125) ≈ 274px/s（v329 为 400），撞堆也更缓。
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
      // v328：卷力大幅增强（原 430 远小于重力 1500，卷不动水滴；用户"漩涡风暴卷不起水滴"）
      // ——向心吸力 + 切向旋流双分量，核心区力 > 重力，真正把水滴卷入中心、卷起重排
      var R = 360;
      for (i = 0; i < bs.length; i++) {
        b = bs[i];
        if (b.iron) continue; // 礁石沉底，不被卷动
        var dx = seaEvent.x - b.x, dy = seaEvent.y - b.y, d = Math.sqrt(dx * dx + dy * dy);
        if (d > 6 && d < R) {
          var ux = dx / d, uy = dy / d;                 // 指向中心的单位向量（向心）
          var sp = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
          var damp = sp > 900 ? Math.max(0.3, 1 - (sp - 900) / 700) : 1;
          var f = 2400 * Math.pow(1 - d / R, 1.4) * damp; // 核心强(>重力)、边缘弱，平滑衰减
          b.vx += (ux * f - uy * f * 1.15) * dt;          // 向心吸力 + 切向旋流（螺旋卷入）
          b.vy += (uy * f + ux * f * 1.15) * dt;
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
  // v335：荧光浮游粒子池（用户从候选 F-K 中选 F，交互示例 test/storm_designs_demo2.html）——
  // 90 颗发光粒子模块级初始化一次；差速旋转（内快外慢）自然涌现漩涡，不画任何"线条漩涡"。
  var STORM_PS = [];
  for (var spi = 0; spi < 90; spi++) {
    var sr = 0.12 + Math.pow(Math.random(), 0.75) * 0.88;
    STORM_PS.push({ a0: Math.random() * Math.PI * 2, r: sr,
      sp: (2.2 / (0.3 + sr)) * (0.8 + Math.random() * 0.4),
      sz: 1.2 + Math.random() * 2.6, warm: Math.random() < 0.25 });
  }

  function drawEventVfx() {
    if (seaEvent.type === 'storm') {
      // 首尾各 0.8s 淡入淡出，避免漩涡凭空出现/消失
      var fadeK = Math.min(1, (seaEvent.t0 - seaEvent.t) / 0.8, seaEvent.t / 0.8);
      if (fadeK <= 0) return;
      ctx.save();
      ctx.globalAlpha = fadeK;
      ctx.translate(seaEvent.x, seaEvent.y);
      var R = 170;
      // ① 中央幽光（漩涡眼区域微亮）
      ctx.fillStyle = grad('stormPlankton', function () {
        var gg = ctx.createRadialGradient(0, 0, 0, 0, 0, 56);
        gg.addColorStop(0, 'rgba(140,220,230,0.3)');
        gg.addColorStop(1, 'rgba(140,220,230,0)');
        return gg;
      });
      ctx.beginPath(); ctx.arc(0, 0, 56, 0, Math.PI * 2); ctx.fill();
      // ② 荧光浮游：每颗粒子沿自身轨道差速旋转（内快外慢），带 5 影彗尾拖影——
      //    粒子云整体涌现出漩涡形态，零机感线条，纯"活的深海发光水"
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
      // ③ 漩涡眼亮点（微脉动）
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

  // ---------- 结算 / 重开 ----------
  // v327：复活（原"看广告复活"）已移除——先不做广告（结算页仅保留双倍/分享/重开）
  function doDouble() {
    // 不再看广告：直接双倍（广告占位已按需求移除）
    doubled = true;
    score *= 2;
    if (score > best) { best = score; saveNum('mg_best', best); }
  }
  // 直接复活（v328 恢复：用户"是不要广告，复活动能还在，要直接复活"）——清空越线判负状态、
  // 保留当前局面与得分，给全体短暂宽限让玩家抢救；先不做广告，故无 ads.show 门控。
  // ★ v330：复活清场（用户："复活时要移除适当的水滴！结算页签弹不出来"）——不移滴的话，
  // 越线堆原样留在场上，宽限 1.5s + 引信 1.1s 耗尽后立刻二次判负，玩家视角"复活点了、
  // 结算页马上又弹回来（游戏回不去）"。规则：普通水滴（铁礁/宝箱除外；冰冻/特殊滴也是
  // 水滴照移）自堆顶向下移除，直到剩余堆顶退到「警戒线下方 70px」安全区内才停手；
  // 被移除的水滴化作气泡消散（不给分——复活是抢救不是奖励）。
  function doRevive() {
    state = 'play';
    dangerAlert = 0; dangerRemain = 0; runBuffered = true; // 直接回到对局；本局缓冲已用（避免再吃一次首死宽限）
    var bs = phys.bodies, i, j;
    var drops = [];
    for (i = 0; i < bs.length; i++) { if (!bs[i].iron && !bs[i].chest) drops.push(bs[i]); }
    drops.sort(function (a, c) { return (a.y - a.r) - (c.y - c.r); }); // 堆顶（y 最小）先移
    var keep = C.dangerY + 70; // 复活安全线：剩余堆顶至少低于警戒线 70px（5 的倍数，v191 规范）
    var removed = 0;
    for (i = 0; i < drops.length; i++) {
      var d = drops[i];
      if (d.y - d.r >= keep) break; // 已退到安全区，停止移除
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
    for (i = 0; i < bs.length; i++) { bs[i].dangerT = 0; bs[i].grace = 1.5; } // 全体 1.5s 抢救宽限
    reviveCount++;
    addPopup(C.W / 2, 300, removed > 0 ? '复活！清走 ' + removed + ' 滴 · 继续深潜' : '复活！继续深潜', true, 0);
    audio.blip(660, 0.22, 'sine', 0.12, 1.2);
  }
  // 返回主页（v234 重开确认新增）：局面数据不动（主页「开始游戏」会走 restart() 全量重置），仅切态+收起瞄准；
  // v237：带水域扫屏过渡动画（menuTrans，渲染层消费）
  function goHome() {
    state = 'menu';
    aiming = false;
    confirmOpen = false; // v273：返回主页顺带收起确认弹窗（防跨态残留）
    // v297 整体核查：弹层标志一并收起——局内开着图鉴/三选一/分享面板时返回主页，
    // 若不清理，menu 态会画出 ach 面板、再次开局会带着旧面板（跨态残留）
    dexOpen = false; achOpen = false; ngOpen = false; shareOpen = false;
    // 涟漪从「返回主页」按钮中心荡开（内容层坐标）
    var br = MG.layout.confirmBtnRect(0);
    startTransition('out', C.W / 2, br.y + br.h / 2);
  }

  function restart() {
    ngEndRun(); // 二周目词缀只在单局内生效（普通重开回到常态）
    phys.bodies.length = 0;
    chest = null; // v297 整体核查：清场后宝箱实体必须一并清——否则新局前 14s 显示幽灵宝箱（可白捡奖励）
    confirmOpen = false;
    setOpen = false; setClearOpen = false; // v197/v317：新局关闭设置弹窗与清档确认（防跨局残留）
    // v297 整体核查：图鉴/成就/三选一/分享面板同样跨局清空——局内开着图鉴点重开，
    // 旧面板会原样带进新对局；三选一残留还会让 ngStartRun 用过期词缀开第二局
    dexOpen = false; achOpen = false; ngOpen = false; shareOpen = false;
    score = 0; displayScore = 0; scoreBump = 0;
    if (offlineGain) { // 离线收益：开局自动入账
      score += offlineGain.gain; displayScore = score;
      var om = offlineGain.mins;
      addPopup(C.W / 2, 300, '离线收益 · 离开 ' + (om >= 60 ? Math.floor(om / 60) + ' 时 ' + (om % 60) + ' 分' : om + ' 分钟') + '，深海攒下 ' + offlineGain.gain + ' 分', true, 0);
      parts.push({ type: 'ring', x: C.W / 2, y: annY(300), r: 46, life: 0.9, max: 0.9, color: '#F2C14E' });
      audio.blip(880, 0.16, 'sine', 0.1, 0.5);
      offlineGain = null;
    }
    combo = 0; comboTimer = 0; cooldown = 0; maxCombo = 0;
    doubled = false;
    reviveCount = 0; // 新局重置复活次数（v328）
    runBuffered = false; // 新局重置深流缓冲
    skillCharge = { swap: 0, ripple: 0, evap: 0, flow: 0 };
    seaCount = 0; scoreMult = 1;
    evapMode = false; rippleMode = false; flowMode = false; flowPick = null; rainHint = 0;
    auroraNext = 0; // 极光庇护只在单次合成内生效
    tideGateHint = false;
    levelElapsed = 0; runCounted = 0;
    nextTier = rollTier();
    rollNextDrop();
    aimX = C.W / 2;
    popups.length = 0; parts.length = 0; rippleQueue.length = 0;
    tide.phase = 'idle'; tide.timer = C.tide.cycleInterval; tide.progress = 0; tide.banner = 0; // v315：同上
    endlessT = 0; rampStage = 0; climaxMark = 0;
    makeQuest(0);
    // 成就加成：深海富豪开局随机技能充能 +1（v350：+2→+1，道具获取整体降低）
    if (perkOn('score2k')) {
      var pk = C.skills[(Math.random() * C.skills.length) | 0];
      addCharge(pk.key, 1);
      addPopup(C.W / 2, 280, '深海富豪：「' + pk.name + '」开局充能 +1', false, 0);
    }
    state = 'play';
  }

  function buildOverButtons() {
    overButtons = [];
    // v299：按钮重设计（用户："按钮大小、间距等重新设计，不要太紧凑"）——
    // 264×48（原 240×40）、间距 14（原 10）；v300 恢复标题行后按钮区从 py+190 起（统计行 py+184 之下）
    var bw = 264, bh = 48, gap = 14, x = (C.W - bw) / 2;
    // 可用区：统计文字之下 → 面板底部留白；按钮组在该区内垂直居中
    // （面板几何走 MG.layout.overRect()，渲染 drawOver 与命中此处同源）
    var ovr = MG.layout.overRect();
    var areaTop = ovr.y + 190, areaBottom = ovr.y + ovr.h - 26;
    var n = (doubled ? 0 : 1) + 1 + 2; // 双倍/复活/分享/重开（v328：复活按钮恢复——直接复活，无广告）
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
    // v274：深渊潜航入口撤出结算页（用户："结算页要删除深渊潜航相关的按钮"）
    overButtons.push({ x: x, y: y, w: bw, h: bh, label: '重新开始', action: restart });
  }

  // ---------- 命中区域（圆形按钮；坐标全部由 layout 派生，与绘制同源）----------
  // ★ v197 第一排重排（用户："图标也太丑了，成就按钮先隐藏掉吧。游戏内这个地方改成设置按钮，
  //   用来弹出设置音效、音乐和震动，右侧的音量按钮移除掉"）：成就按钮（奖杯）与右上角
  //   音量钮整套移除，左上角原位（原奖杯位）新增设置钮——半径引 rowBtnR 真源，
  //   样式/命中与绘制同源（render.js drawSetBtn，白底圆+蓝灰环+齿轮图标）
  var setBtn = { cx: MG.layout.hud.setCx, cy: MG.layout.hud.trophyCy, r: MG.layout.hud.rowBtnR, pressT: 0 };
  // 底部六钮（v195）：圆心/半径一律引 layout.band 真源（btnCx=35+i×(W−70)/5 均匀派生、
  // btnR=20 统一半径）——旧写死 45/115/185/255/325/395 + restart r15：左缘距 25≠右缘距 10
  var bookBtn = { cx: MG.layout.band.btnCx[0], cy: MG.layout.band.btnCy, r: MG.layout.band.btnR, pressT: 0 };
  var restartBtn = { cx: MG.layout.band.btnCx[5], cy: MG.layout.band.btnCy, r: MG.layout.band.btnR, pressT: 0 }; // 游戏内重开（带确认），右下角
  // 「深渊潜航」无局内悬浮钮：入口在结算页按钮组（主流 NG+ 模式选择设计）
  // 底部一排共 6 个按钮（图鉴 + 4 道具 + 重开）：35/105/175/245/315/385 均匀分布、
  // 间距 70、左右缘距各 15（v195，全部由 layout.band 派生，改宽度自动重排）
  var SKILL_BTNS = [
    { key: 'swap',   cx: MG.layout.band.btnCx[1], cy: MG.layout.band.btnCy, r: MG.layout.band.btnR, pressT: 0 },
    { key: 'ripple', cx: MG.layout.band.btnCx[2], cy: MG.layout.band.btnCy, r: MG.layout.band.btnR, pressT: 0 },
    { key: 'evap',   cx: MG.layout.band.btnCx[3], cy: MG.layout.band.btnCy, r: MG.layout.band.btnR, pressT: 0 },
    { key: 'flow',   cx: MG.layout.band.btnCx[4], cy: MG.layout.band.btnCy, r: MG.layout.band.btnR, pressT: 0 }
  ];
  fit(); // 首次适配（按钮已定义，底部元素可同步贴底）

  // 重开确认弹窗（v234 三按钮：返回主页/重新开始/返回游戏）——命中几何唯一真源 layout.confirmBtnRect，不再另存按钮坐标
  var confirmOpen = false;

  // ---------- 设置弹窗（v197：音效/音乐/震动三开关；v317：+清空存档） ----------
  // 旧静音入口（MUTE 钮 + mg_mute 单键）拆除，改为三开关：音效复用旧键 mg_mute（1=静音，
  // 向后兼容）、音乐 mg_music（缺失时继承旧 mute 反值）、震动 mg_vib（默认开）。
  var setOpen = false;
  // v317 清空存档：设置面板第 4 行 → 二级确认（drawSetClear）→ clearSaveData。
  // setClearOpen 只在 setOpen 为真时打开，所有按 setOpen 门禁的输入/更新天然覆盖它
  var setClearOpen = false;
  function toggleSet(i) {
    if (i === 0) { audio.sfxOn = !audio.sfxOn; saveFlag('mg_mute', !audio.sfxOn); }
    else if (i === 1) {
      audio.musicOn = !audio.musicOn; saveFlag('mg_music', audio.musicOn);
      if (audio.musicOn) audio.bgm.start(); else audio.bgm.stop();
    } else { audio.vibOn = !audio.vibOn; saveFlag('mg_vib', audio.vibOn); if (audio.vibOn) hap(20); }
    audio.blip(660, 0.08, 'sine', 0.06, 0.3); // 开关反馈（音效刚开启时即听到，符合直觉）
  }
  // 全部存档键（与 core.js/systems.js 各保存点一一对应；mg_ver 一并清，重启时 migrateSave 重打）
  var SAVE_KEYS = ['mg_rune', 'mg_peak', 'mg_seen', 'mg_best', 'mg_life', 'mg_dex', 'mg_ver',
    'mg_mute', 'mg_music', 'mg_vib', 'mg_tut', 'mg_ng', 'mg_daily', 'mg_dchal', 'mg_friends'];
  // 清空存档 = 重置游戏至初始状态：删键后必须整页重载——各模块的运行时状态（分数/图鉴/
  // 生涯峰/任务…）都是加载时初始化的模块级变量，只删存储会让内存与存档不一致
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
          addPopup(C.W / 2, 244, '带符文的水滴：合成即可为技能充能', false, 0, 2.0, 'todo'); // v325：一次性教程提示，2.0s 读全；v331 归 todo
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
    rollNextDrop();
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
    if (menuTrans.dir && performance.now() / 1000 - menuTrans.t0 < menuTrans.dur) return; // v237：过渡动画期间屏蔽输入
    if (confirmOpen) {
      // 重开确认弹窗（v300 恢复标题栏）：右上 ✕ 关闭；三按钮 返回主页/重新开始/返回游戏；点面板外也视为返回游戏
      if (inRect(p, MG.layout.confirmCloseRect())) { confirmOpen = false; return; }
      if (inRect(p, MG.layout.confirmBtnRect(0))) { confirmOpen = false; goHome(); return; }
      if (inRect(p, MG.layout.confirmBtnRect(1))) { confirmOpen = false; restart(); return; }
      confirmOpen = false;
      return;
    }
    // v317 清空存档二级确认（叠在设置面板之上，优先于 setOpen 分支）：
    // ✕/取消 = 返回设置面板；确认清空 = 执行清档并重载；点面板外 = 取消
    if (setClearOpen) {
      if (inRect(p, MG.layout.setClearCloseRect())) { setClearOpen = false; return; }
      if (inRect(p, MG.layout.setClearBtnRect(0))) { setClearOpen = false; return; }
      if (inRect(p, MG.layout.setClearBtnRect(1))) { clearSaveData(); return; }
      setClearOpen = false;
      return;
    }
    if (setOpen) {
      // v197 设置弹窗：点三个开关行切换，点 ✕ 或面板外关闭（与重开确认同门禁）；
      // v317 第 4 行「清空存档」点行开二级确认（setClearOpen），不直接执行
      if (inRect(p, MG.layout.setCloseRect())) { setOpen = false; return; }
      for (var si = 0; si < 4; si++) {
        if (inRect(p, MG.layout.setRowRect(si))) {
          if (si === 3) { setClearOpen = true; audio.blip(520, 0.1, 'sine', 0.08, 0.7); return; }
          toggleSet(si); return;
        }
      }
      setOpen = false;
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
    // 开始界面：响应「开始游戏」与设置钮（音效/音乐/震动；v197 起菜单也放设置入口——
    // BGM 在菜单就播放，菜单必须有音频入口，否则只剩开始按钮）；
    // 面板打开时放行到下方 dexOpen/achOpen 分支，否则面板内点击会被这里提前吞掉
    if (state === 'menu' && !achOpen && !dexOpen && !setOpen) {
      // 主页功能磁贴（v233）：每日任务/每日挑战/成就/榜单/图鉴/分享
      for (var mtk = 0; mtk < menuTiles.length; mtk++) {
        var mt = menuTiles[mtk];
        if (inRect(p, MG.layout.menuTileRect(mt.side, mt.i))) {
          mt.pressT = 0.16;
          audio.blip(600, 0.1, 'sine', 0.08, 0.5);
          mt.act();
          return;
        }
      }
      // 设置入口（未开局即可调音效/音乐/震动）；命中区与绘制一致 +hudInset
      if (inCircle(p, { cx: setBtn.cx, cy: setBtn.cy + hudInset, r: setBtn.r })) { setBtn.pressT = 0.16; setOpen = true; return; }
      if (inRect(p, menuStartBtn)) {
        menuStartBtn.pressT = 0.2;
        audio.blip(660, 0.12, 'sine', 0.1, 0.4);
        restart();
        // 涟漪从开始按钮中心荡开（内容层坐标）
        startTransition('in', C.W / 2, menuStartBtn.y + menuStartBtn.h / 2);
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
      if (inRect(p, dexCloseBtn) || !inRect(p, DEX_PANEL)) { achOpen = false; achDrag = null; return; }
      // v241 拆分：页签条已移除，四视图由主页磁贴直达；仅「每日挑战」视图有开始按钮
      if (dexTab === 2 && inRect(p, dchalBtnRect())) { audio.blip(660, 0.1, 'triangle', 0.1, 1.4); dchalStart(); return; }
      // v243 成就视图：单列列表拖拽滚动（成就卡无点击交互，面板内按下即开始拖拽）
      if (dexTab === 0) achDrag = { y: p.y, s0: achScroll };
      return;
    }
    // v197：左上角设置钮（音效/音乐/震动弹窗；原静音/奖杯位）——命中区 +hudInset 与 HUD 平移一致
    if (inCircle(p, { cx: setBtn.cx, cy: setBtn.cy + hudInset, r: setBtn.r })) { setBtn.pressT = 0.16; setOpen = true; return; }
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
    // v243 成就列表拖拽滚动：优先于瞄准逻辑（面板打开时瞄准本就被门禁挡住）
    if (achDrag && achOpen && dexTab === 0) {
      achScroll = Math.max(0, Math.min(achDrag.s0 + (achDrag.y - p.y), achMaxScroll()));
      return;
    }
    if (state !== 'play' || dexOpen || achOpen || setOpen || ngOpen || shareOpen || confirmOpen || evapMode || flowMode) return;
    aimX = clampAim(p.x);
  });
  canvas.addEventListener('pointerup', function (e) {
    achDrag = null; // v243 成就列表拖拽结束
    if (!aiming || state !== 'play' || dexOpen || achOpen || setOpen || ngOpen || shareOpen || confirmOpen || evapMode || flowMode || rippleMode) { aiming = false; return; }
    aiming = false;
    aimX = clampAim(toLocal(e).x);
    tryDrop();
  });
  canvas.addEventListener('pointercancel', function () { aiming = false; achDrag = null; });
  // v243 成就列表滚轮滚动（桌面调试用，手机走拖拽）
  canvas.addEventListener('wheel', function (e) {
    if (achOpen && dexTab === 0) {
      e.preventDefault();
      achScroll = Math.max(0, Math.min(achScroll + e.deltaY, achMaxScroll()));
    }
  }, { passive: false });

  // ---------- 更新 ----------
  function update(dt) {
    // 海域换色渐变计时：任何状态都推进（面板/结算打开时背景过渡不冻结）
    if (seaFade) { seaFade.t += dt; if (seaFade.t >= seaFade.dur) seaFade = null; }
    if (state === 'menu') { time += dt; updateFx(dt); return; } // 开始界面：只跑视觉动画
    // v327：广告占位整段移除（先不做广告）
    // 弹层暂停（v240）：图鉴/成就殿堂/设置/二周目选择/分享卡/重开确认任一打开时游戏冻结——
    // 潮汐计时、冷却、物理、判负计时全部停走；time 继续推进（水波/气泡等环境动画保持流动），
    // 关闭弹层后自动恢复。menu 态已被上方分支提前返回，主页面板不受影响。
    if (dexOpen || achOpen || setOpen || ngOpen || shareOpen || confirmOpen) {
      time += dt;
      updateFx(dt);
      return;
    }
    if (state !== 'play') { time += dt; updateFx(dt); return; } // 结算页：背景保持流动（仅物理冻结）

    time += dt;
    if (rainHint > 0) rainHint -= dt;
    cooldown = Math.max(0, cooldown - dt);

    levelElapsed += dt; // 本局已进行时长（顶部计时显示用）
    checkDexGates();
    // v341：深渊潜航免门槛（unlockScore=0、ng.unlocked 恒 true），移除原 5 万分解锁逻辑
    // 海域演进：累计分跨过里程碑 → 世界换色（1.8s 渐变过渡）+ 弹报
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
    if (stgR > rampStage) { rampStage = stgR; addPopup(C.W / 2, 250, '海域渐深：潮汐更频 · 珊瑚礁更多', true, 0); }
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
