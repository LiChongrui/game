// 水滴合成深海 - 微信小游戏 bundle（自动生成，勿手改）
// 由 tools/build_wechat.js 从 js/ 八模块拼接而来；模块间共享作用域，加载顺序与 index.html 一致。
// 头部 var 注入：部分小游戏运行环境的 document/window 是只读全局，垫片赋值会被静默忽略
// （真机实测报 document.getElementById is not a function），故在模块作用域内用 var 显式
// 遮蔽环境全局，取垫片挂到 GameGlobal.__shim 的对象。
var window = GameGlobal.__shim.window;
var document = GameGlobal.__shim.document;
var localStorage = GameGlobal.__shim.localStorage;
var navigator = GameGlobal.__shim.navigator;
var performance = GameGlobal.__shim.performance;
// ===== js/platform.js =====
// 水滴合成深海 - 平台适配层
// 当前为 Web 实现；移植微信小游戏时只需替换本文件内标注 [wx] 的方法体，
// main.js / config.js 不需要任何改动。
window.MG = window.MG || {};

MG.platform = {
  // 是否运行在微信小游戏环境（调试用）
  isWx: (typeof wx !== 'undefined') && !!wx.getSystemInfoSync,

  // ---------- 存储 ----------
  // [wx] 替换为 wx.getStorageSync / wx.setStorageSync（同步接口，签名一致）
  get: function (k) {
    try { return localStorage.getItem(k); } catch (e) { return null; }
  },
  set: function (k, v) {
    try { localStorage.setItem(k, String(v)); } catch (e) {}
  },
  // JSON 便捷读写（存档结构用）
  getJSON: function (k, fallback) {
    try {
      var v = this.get(k);
      return v == null ? fallback : JSON.parse(v);
    } catch (e) { return fallback; }
  },
  setJSON: function (k, v) { this.set(k, JSON.stringify(v)); },

  // ---------- 音频 ----------
  // [wx] WebAudio 在低端安卓可能不稳，替换为 wx.createInnerAudioContext 体系
  //      （届时 audio.ensure/blip 等改为播放预生成音频，见 main.js audio 段注释）
  audioCtxClass: function () {
    return window.AudioContext || window.webkitAudioContext || null;
  },

  // ---------- 分享 ----------
  // payload: { title, desc, score, stage }
  // 返回 true = 平台已接管分享；false = 调用方走自己的 UI（当前 Web 的战报卡片）
  // [wx] 替换为 wx.shareAppMessage({ title, imageUrl })
  share: function (payload) {
    return false;
  },

  // ---------- 榜单 ----------
  // [wx] 替换为 wx.setUserCloudStorage + 开放数据域子域渲染
  submitScore: function (score) { /* Web 版为本地榜，见 main.js 好友榜 */ },

  // ---------- 振动（可选反馈，平台不支持时静默） ----------
  vibrate: function (ms) {
    if (navigator && navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) {} }
  }
};

;
// ===== js/config.js =====
// 水滴合成深海 - 全局配置
// 9 级合成链：雾泡 → 水滴 → 露珠 → 浪花 → 溪流 → 湖泊 → 江河 → 大海 → 沧海
window.MG = window.MG || {};
MG.config = {
  // 逻辑分辨率（画布固定，CSS 等比缩放）
  W: 420,
  H: 840,              // 9:18（420×18/9=840；9:16 为 747。比例 2.0 < 常见手机≈2.16，view.s 按宽适配不变）
  // ★ 比例旋钮：改屏幕比例只改 H 这一处，其余元素位置由 js/layout.js 全部自动派生。
  //   承接地（v177 定版）：多出的高度 EXTRA=H-747 全部垫在「HUD 三组行位」与「坠落高度」之间——
  //   HUD 钉块顶不动，容器/警戒线/坠落高度/底部带 = 9:16 基准 + EXTRA 整体下移，底部带恒 74。
  floorY: 673,         // 容器底 y 基准（9:16 值；实际 = 673+EXTRA，由 layout.build() 回写）

  // 容器（适度压缩给顶部宽松：开口 190、容器 190~673 = 483px；顶部 HUD 区扩至 0~164，
  // 三组（统计/得分+进度条/任务+潮汐）行距舒适，开口上方留 26px 空隙带供水滴出生/虚影悬停）
  wall: 0,             // 侧墙厚（0 = 无边框，水滴铺满画布全宽）
  containerTop: 190,   // 容器顶部开口 y 基准（9:16 值；实际 = 190+EXTRA，由 layout.build() 回写）
  dangerY: 254,        // 危险线 y 基准（9:16 值；实际 = 254+EXTRA。堆积超过此线且静止即失败；堆叠空间 419px）

  // 投放
  // 投放：坠落高度基准（9:16 值；实际 = dangerY-45+EXTRA，由 layout.build() 公式回写）
  spawnY: 209,
  dropCooldown: 0.55,  // 两次投放最小间隔（秒）

  // 物理
  gravity: 1500,       // 重力加速度 px/s^2
  restitution: 0.12,   // 弹性
  friction: 0.10,      // 切向摩擦
  dampPerStep: 0.9995, // 速度阻尼（每子步）
  maxSpeed: 1500,      // 限速
  substeps: 8,         // 每帧物理子步数
  slop: 0.5,           // 允许重叠量（防抖）

  // 失败判定
  dangerTime: 1.1,     // 越线静止持续多久判负
  dangerSpeed: 80,     // 低于此速度视为"静止"
  graceTime: 0.6,      // 新球出生宽限（不参与危险判定）

  // 连击
  comboWindow: 1.1,    // 连击窗口（秒）
  comboMaxMult: 4,     // 连击倍率上限
  rainCombo: 3,        // 甘霖触发：连击达到该次数时馈赠下一滴

  // 技能（充能次数达标后可用；顺序对应底部按钮）
  skills: [
    { key: 'swap',   name: '换滴', cost: 4 },
    { key: 'ripple', name: '涟漪', cost: 6 },
    { key: 'evap',   name: '蒸发', cost: 10 },
    { key: 'flow',   name: '水流', cost: 6 }
  ],

  // 技能渐进解锁：按累计得分（跨局）逐个点亮，压第一分钟认知负荷（0 = 开局即有）
  skillUnlock: { swap: 0, ripple: 1500, evap: 6000, flow: 15000 },

  // 二周目「深渊潜航」：累计 5 万分解锁，结算页选一条海况词缀开高危高收益的无尽局
  ng: {
    unlockScore: 50000,                 // 解锁门槛（= 月光环礁深处，需多局积累）
    affixes: [
      { id: 'heavy', name: '重压之海', desc: '重力 +25%',        grav: 1.25, mult: 1.5 },
      { id: 'storm', name: '疾风骤雨', desc: '潮汐间隔 -40%',    tideInt: 0.6, mult: 1.6 },
      { id: 'reef',  name: '暗礁密布', desc: '礁石概率 ×2',      ironX: 2,   mult: 1.5 },
      { id: 'frost', name: '冰封之海', desc: '水滴 15% 落水即冻', ice: 0.15,  mult: 1.4 }
    ]
  },

  // 每日挑战：每天一局全服同规则的词缀挑战局（词缀按日期种子固定），达到目标分即完成
  dailyChal: {
    goalBestRatio: 0.35,  // 目标分 = 生涯最高分 × 35%（向上取整到百；无生涯分时按 3000 保底）
    goalMin: 3000,        // 目标分保底
    rewardBase: 1800,     // 首通奖励基数
    rewardStep: 200,      // 连续完成天数每 +1 天的奖励增量
    rewardMax: 3200,      // 奖励封顶（乘区前）
    charge: 2             // 完成时随机技能充能
  },

  // 离线收益：按离开时长结算积分（生涯最佳分定速率），开局自动入账
  offline: {
    minMins: 3,           // 离开不足此分钟数不触发（防刷新页面反复白嫖）
    capMins: 480,         // 结算时长封顶（8 小时，过夜一觉正好吃满）
    perMinBase: 30,       // 每分钟保底产出
    bestRatio: 0.0004     // 每分钟额外产出 = 生涯最佳分 × 此系数（5.3 万 → 51/分）
  },

  // 涟漪：以水堆重心为中心的双重波纹推挤
  ripple: {
    power: 300,        // 首波推力
    secondPower: 190,  // 次波推力
    radius: 460,       // 有效半径
    delay: 0.28,       // 次波延迟（秒）
    lift: 90           // 额外向上抬升
  },

  // 特殊水滴（随机混入投放队列）
  specialChance: 0.15,           // 每次投放出现特殊滴的概率
  // 符文水滴（随机附带道具属性）：合成带符文的水滴为对应技能 +1 充能（特殊滴/礁石不带符文）
  rune: {
    chance: 0.30,                                      // 普通投放带符文的概率
    weights: { swap: 0.28, ripple: 0.24, evap: 0.20, flow: 0.28 } // 四种符文的分布权重
  },
  vortex: {                      // 漩涡滴：吸附周围水滴后消散
    pullR: 190,
    pullF: 430,
    delay: 0.35,
    life: 1.6,
    score: 8
  },
  cloud: {                       // 雨云滴：落地后分裂成两个雾泡
    splitDelay: 0.55,
    score: 2
  },
  ice: {                         // 冰晶滴：落定后冻结自己与周围水滴（临时平台）
    freezeTime: 4.5,             // 冻结时长（秒）
    radiusFactor: 2.4,           // 冻结半径 = 自身半径 × 该系数
    score: 5
  },
  iron: {                        // 礁石：障碍物（砸穿水滴堆落底、不浮起、相消或蒸发移除）
    chance: 0.08,                // 每次投放是礁石的概率
    maxActive: 2,                // 场上同时最多几个
    r: 26,                       // 半径
    massMult: 16,                // 质量倍率（远重于水滴，下落时把水滴挤开）
    evaporateScore: 5,           // 用蒸发移除时的得分
    pairScore: 15                // 两个礁石相消时的得分
  },

  // 图鉴积分门槛：累计得分（跨局）达到后才解锁该级图鉴（0 = 无门槛，前 5 级免费）
  dexGate: [0, 0, 0, 0, 0, 500, 3000, 10000, 30000],
  // 投放门槛：直接投放的水滴档位/特殊滴需累计分达标才会刷出（图鉴不显示门槛数值）
  spawnGate: [0, 0, 0, 800, 2500],
  // 特殊滴与海域绑定：抵达该海域后才会刷出（图鉴里未到达海域的特殊滴不显示）
  specialStage: {
    iron: 0, chest: 0,            // 潮汐池
    cloud: 1, vortex: 1,          // 珊瑚浅海
    ice: 2, rune: 2,              // 蔚蓝深海
    rainbow: 3, gale: 3,          // 午夜深渊
    magnet: 4, spring: 4,         // 月光环礁
    thunder: 5, pearl: 5,         // 海沟之眼
    magma: 6, geyser: 6,          // 热泉裂谷
    void: 7, aurora: 7            // 深渊王座
  },
  // 新特殊滴行为参数
  magnet:   { delay: 0.4, life: 1.8, pullR: 210, pullF: 105, score: 150 },
  magmaR: 95, magmaScore: 70,   // 熔岩滴：烧毁半径 / 每个目标折算分
  geyserW: 120, geyserF: 400,   // 间歇泉：水柱半宽 / 上冲力
  voidN: 5, voidScore: 90,      // 虚空滴：吞噬数量上限 / 每颗折算分
  auroraMult: 3,                // 极光滴：下一次合成得分倍数

  // 潮汐系统（周期性涨潮：水滴受浮力上浮重排；浮起越线同样判负）
  // 潮位设计：满潮水面最矮距容器底 1/4 容器高，最高距警戒线 1/4 容器高，
  // 每推进一个海域在两端之间线性推进（由几何推导，水面永远碰不到警戒线）
  tide: {
    firstDelay: 18,      // 首次涨潮倒计时（给新手留学习时间）
    cycleInterval: 26,   // 两次涨潮间隔
    duration: 7,         // 涨潮持续
    buoyancy: 2300,      // 浮力加速度（大于重力才能浮起）
    warnTime: 3          // 涨潮前预警秒数
  },

  // 潮汐组合技：退潮余波有概率引来海神恩泽，全场普通水滴集体升 1 级
  tideBless: {
    chance: 0.4,         // 每次退潮触发概率（防连发：连续两次至多出一次）
    minDrops: 4          // 场上普通水滴少于此数不触发
  },

  // 无尽模式渐进加压（进入无尽后随时长线性到满，坡度平缓）
  ramp: {
    minutes: 14,         // 达到满强度所需分钟数（收紧：压力更早到位）
    tideIntervalMin: 16, // 潮汐间隔下限（秒）
    ironChanceMax: 0.16, // 礁石概率上限
    spawnWeightsMax: [22, 24, 22, 16, 16] // 投放权重演进终点（向高级倾斜）
  },

  // 潮汐限定合成：两枚「江河」只能在涨潮时聚成「大海」（彩虹跳级不受限）
  tidePair: { tier: 6, threshold: 0.15 },

  // 高潮时刻：无尽模式每累计 +500 分，场上最高档的可合成对自发相聚
  climaxEvery: 500,

  // 里程碑任务链
  questScoreBase: 35,
  questScoreStep: 22,

  // 海域图鉴 & 汇入海域
  dexBonusMult: 10,
  seaBonus: 300,
  seaMultStep: 0.25,

  // 数值封顶：所有得分乘区（海域加成×成就加成×连击等）叠乘后的总上限，防后期分数膨胀失真
  multCap: 8,

  // 每日任务（每天按日期种子生成 3 个，跨局累计；全完成涨连续天数）
  daily: {
    rewardScore: 150,     // 单个任务完成奖励
    streakBase: 100,      // 全完成基础奖励
    streakStep: 50        // 连续天数每 +1 的额外奖励
  },

  // 海域演进：累计得分（跨局）里程碑改变世界（背景色调随阶段加深，色相与图鉴徽章一致）
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

  // 随机出生池（只出前 5 级，权重）
  spawnWeights: [30, 26, 22, 14, 8],

  // 合成链（每档一个可辨识色相：雾白→青→青绿→天蓝→宝蓝→靛蓝→紫→海军蓝→深渊墨蓝，明度同步递进）
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
// ===== js/layout.js =====
// 水滴合成深海 - layout：布局几何唯一真源
// 模块加载顺序 1.5/4（config 之后、physics 之前）。经典 script 共享全局作用域，
// 本文件只依赖 MG.config；core/systems/panels/render 运行期经全局作用域解析引用。
//
// ★ 设计目标（v175）：改屏幕比例只改 config 的 C.H 一处，全游戏元素位置自动重排。
// 一切坐标从「基础几何」经公式派生，分四层，层间锚点清晰：
//   ① hud   顶部信息区（0~hudBottom）：手定版行位——★ 钉块顶，块高变化时本区不动（v177）
//   ② body  容器区（containerTop~floorY）：核心游戏几何（用户定版），随 EXTRA 整体下移
//   ③ band  底部带（floorY~H）：★ 高度恒 74 贴块底（v177 改）——内部布局（按钮/装饰）
//            钉 floorY 相对位，随 EXTRA 整体平移，绝不打散重排
//   ④ panel 全屏面板：锚定游戏区焦点（focusCy，随 EXTRA 平移）或块中心，不漂流
//
// ★★ 比例承接地（v177 用户定版，覆盖 v175 的"底部带吸收"方案）：
//   块高多出的全部高度垫在「HUD 三组行位」与「坠落高度」之间的间距里。
//   HUD 钉块顶（0~164）不动；容器/警戒线/坠落高度/底部带/面板/菜单
//   = 9:16 基准值 + EXTRA 整体下移；底部带高度恒 74。
//   EXTRA = C.H - 747（9:16 基准块高）：9:18(840) → +93；8:18(945) → +198；H=747 → 0（逐像素等于 v171 定版）。
//   约束：H ≥ floorY + 74 = 673 + EXTRA + 74 ⇒ H ≥ 747。
// 适配策略（view.s / oy / renderOy / hudInset）由 core.fit() 每帧重算，见其注释。
//
// ★ 使用规范：绘制与命中热区一律引用 MG.layout.xxx，禁止再写死坐标数字；
//   config 改 C.H 后无需改任何其他文件（fit() 每次 resize 会调 build() 重算）。
window.MG = window.MG || {};
MG.layout = {
  hud: null, body: null, band: null, panel: null, menu: null,
  extra: 0,   // 当前比例的多余高度（= C.H - 747），供探针/调试输出

  // 由基础几何重建全部派生坐标（幂等；config 被外部改动后调用即可同步）
  build: function () {
    var C = MG.config, W = C.W, H = C.H;
    // ★ 比例承接地：HUD(0~164) 钉块顶；其余全部 = 9:16 基准值 + EXTRA 整体下移。
    // EXTRA = 块高 - 9:16 基准块高 747（9:18=840 → +93；8:18=945 → +198；H=747 → 0）
    var EXTRA = H - 747;
    this.extra = EXTRA;
    // 同步真源给物理引擎（每帧读 C.*）：容器/警戒线/容器底随 EXTRA 下移，容器高恒 483
    C.containerTop = 190 + EXTRA;      // 容器开口（+EXTRA 下移）
    C.dangerY = 254 + EXTRA;           // 警戒线（+EXTRA 下移）
    C.floorY = 673 + EXTRA;            // 容器底（+EXTRA 下移）
    // 坠落高度 = 最大可投放水滴（tiers 前 5 档中的溪流 r45）底部接触警戒线时的球心位置（公式派生，禁写死）
    C.spawnY = C.dangerY - C.tiers[4].r; // (254+EXTRA) - 45 = 209+EXTRA

    // ---- ① 顶部 HUD 区（v149/v161 定版行位；钉块顶，块高变化时本区不动）----
    this.hud = {
      row1Y: 41,               // 统计最佳结果 / 计时 baseline（与奖杯·静音 cy36 垂直居中对齐同排）
      trophyCy: 36,            // 奖杯 / 静音 / 菜单奖杯圆心（+hudInset 避让胶囊）
      trophyCx: 24, muteCx: W - 24,
      scoreY: 88,              // 当前得分 baseline（translate 锚点）
      seaBar: { sx: 24, sy: 100, sw: W - 48, sh: 20 }, // 海域进度条（v151 定版 100~120）
      quest: { qx: 12, qy: 130, qw: 206, qh: 34 },     // 任务条（v149 定版 130~164）
      tidePill: { tx: W - 122, ty: 130, tw: 92, th: 34 }, // 潮汐胶囊（与任务条同高同排）
      tideBannerY: 250,        // 涨潮横幅锚点
      hudBottom: 164           // HUD 区底沿（任务条底；与容器开口之间为 26+EXTRA px 空隙带）
    };

    // ---- ② 容器区（核心游戏几何：用户定版；随 EXTRA 整体下移，容器 483 高不变）----
    this.body = {
      containerTop: C.containerTop,     // 190+EXTRA 容器开口
      dangerY: C.dangerY,               // 254+EXTRA 警戒线
      floorY: C.floorY,                 // 673+EXTRA 容器底
      spawnY: C.spawnY,                 // 209+EXTRA 坠落高度（公式派生，禁写死）
      tutY: 480 + EXTRA                 // 首局引导胶囊锚点（容器中部，随容器下移）
    };

    // ---- ③ 底部带（floorY~H：高度恒 74 贴块底，内部随 EXTRA 平移，绝不打散）----
    this.band = {
      top: C.floorY,
      h: H - C.floorY,                  // 恒 74（9:16/9:18/8:18 相同：底部带固定不变，v177）
      btnCy: C.floorY + 28,             // 701+EXTRA：底部一排按钮圆心（v163 铁律：与容器底恒距 28）
      labelDy: 12,                      // 按钮名称标签：圆心 + r + 12
      decorBase: C.floorY + 18,         // 691+EXTRA：底部装饰基准线（床面玻璃横条底 FH12 + 6）
      dunes: [                          // 三块沙丘（径向渐变柔边）：相对容器底固定，随 EXTRA 平移不重排
        { xr: 0.20, dy: 12, rx: 95,  ry: 13, c: 'rgba(238,246,240,0.7)', c0: 'rgba(238,246,240,0)' },
        { xr: 0.74, dy: 14, rx: 115, ry: 15, c: 'rgba(238,246,240,0.7)', c0: 'rgba(238,246,240,0)' },
        { xr: 0.47, dy: 18, rx: 85,  ry: 11, c: 'rgba(228,240,234,0.55)', c0: 'rgba(228,240,234,0)' }
      ],
      pebbleYOff: (C.floorY + 18) - 664, // 卵石/海星/扇贝基准随 EXTRA 平移（v136 时代 FLOORY=646 定版位）
      pebbles: [[24, 688, 3], [66, 700, 2], [112, 686, 2.5], [172, 702, 2],
                [246, 690, 2.5], [306, 700, 2], [352, 686, 2.5], [404, 696, 2.2]],
      starfish: { x: 88, y: 700, s: 9 },
      shell: { x: 330, y: 702, s: 9 }
    };

    // ---- ④ 全屏面板（锚定游戏区，随 EXTRA 平移不漂流）----
    this.panel = {
      blockCy: H / 2,                  // 块中心（全屏模态按块居中：NG 词缀/广告遮罩）
      focusCy: 370 + EXTRA,            // 游戏区焦点中心（v161 定版：结算海报 py134/h472 与分享卡 py160/h420 的共同中心，随 EXTRA 平移）
      over: { w: 320, h: 472 },        // 结算海报（v161 排版放松定版）
      share: { w: 300, h: 420 },       // 战报分享卡
      confirm: { w: W - 120, h: 170, dy: 300 + EXTRA, btnDy: 102 }, // 重开确认（py300+EXTRA；按钮 py+102）
      ng: { w: 330, h: 348 },          // 深渊潜航词缀三选一（按块居中）
      dex: { x: 20, w: 380, h: 560 }   // 图鉴/成就（layoutDexPanel 按态居中，y 动态）
    };

    // ---- 菜单（开始界面：随 EXTRA 整体平移，与容器相对关系不变）----
    this.menu = {
      titleY: 218 + EXTRA, titleShadowY: 220 + EXTRA, subY: 252 + EXTRA, bestY: 294 + EXTRA,
      offlineY: 316 + EXTRA, offlineW: 300, offlineH: 62,
      startY: 396 + EXTRA, startW: 220, startH: 60,
      footDy: 56                       // 底部玩法一句话：距块底（VH-56，随块底自动）
    };
  },

  // ---- 面板矩形（渲染与命中共用，一处定义）----
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
    return { x: (W - p.w) / 2, y: p.dy, w: p.w, h: p.h };
  },
  ngRect: function () {
    var p = this.panel.ng, W = MG.config.W;
    return { x: (W - p.w) / 2, y: (MG.config.H - p.h) / 2, w: p.w, h: p.h };
  }
};
MG.layout.build();

;
// ===== js/physics.js =====
// 水滴合成深海 - 极简圆形物理引擎
// 纯 JS 实现（无依赖），后续可整体移植到微信小游戏（wx.createCanvas 同为 2D context）
// 策略：固定子步进积分 + 位置修正（含 slop 防抖） + 冲量解算（弹性/切向摩擦）
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
      dangerT: 0,     // 越线静止累计时间
      grace: C.graceTime // 出生宽限
    };
    this.bodies.push(b);
    return b;
  };

  Physics.prototype.remove = function (b) {
    var i = this.bodies.indexOf(b);
    if (i >= 0) this.bodies.splice(i, 1);
  };

  Physics.prototype.step = function (dt) {
    var bs = this.bodies;
    var n = C.substeps, h = dt / n;
    var left = C.wall, right = C.W - C.wall;
    var floorY = C.floorY;
    var g = C.gravity, e = C.restitution;
    var k, s, i, j, b, o;

    for (s = 0; s < n; s++) {
      // --- 积分 + 边界 ---
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

      // --- 圆-圆碰撞（O(n^2)，球数 <= 60，足够快）---
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

          // 礁石（iron）参与的接触：零容差 + 全量位置修正——礁石与普通滴严格分离，
          // 既不重叠（视觉穿模）也不压扁水滴（水滴-水滴仍保留 slop 让堆叠柔软自然）
          var ironPair = !!(a.iron || o.iron);
          var overlap = minD - dist - (ironPair ? 0 : C.slop);
          if (overlap <= 0) continue;

          // 质量 ∝ 面积（b.m 为自定义质量，铁块等障碍用）
          var ma = a.m || a.r * a.r, mo = o.m || o.r * o.r;
          var invA = 1 / ma, invO = 1 / mo, invSum = invA + invO;

          // 位置修正（按反质量分配）；礁石对全量修正，杜绝残余重叠
          var corr = overlap / invSum * (ironPair ? 1.0 : 0.8);
          a.x -= nx * corr * invA; a.y -= ny * corr * invA;
          o.x += nx * corr * invO; o.y += ny * corr * invO;

          // 法向冲量
          var rvx = o.vx - a.vx, rvy = o.vy - a.vy;
          var vn = rvx * nx + rvy * ny;
          if (vn < 0) {
            var jn = -(1 + e) * vn / invSum;
            a.vx -= jn * nx * invA; a.vy -= jn * ny * invA;
            o.vx += jn * nx * invO; o.vy += jn * ny * invO;

            // 切向摩擦
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
// ===== js/core.js =====
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
  // 容器/警戒线/坠落高度随 EXTRA 整体下移（layout.body），底部带恒 74 贴块底（layout.band），
  // 中间水域随窗口高度自适应；画布 CSS 高度恒等于窗口高度，CSS 宽度=游戏区宽度（两侧为页面深海背景）
  var canvas = document.getElementById('game');
  var ctx = canvas.getContext('2d');
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var VH = C.H;           // 当前逻辑高度（全屏：h/view.s，≥C.H）
  var LW = C.W;           // 当前逻辑宽度（≥ C.W，宽窗口下两侧为延伸海水）
  var BX = 0;             // 游戏区（420 逻辑宽）水平居中偏移
  var FLOORY = C.floorY;  // 容器底 y（= layout.body.floorY，随 EXTRA 下移）
  var view = { s: 1 };
  // 游戏块 = 420×C.H 逻辑区（当前交付 9:18=840）。★ 比例承接地（v177 用户定版）：
  // 多出的块高全部垫在「HUD 三组行位(0~164)」与「坠落高度(spawnY)」之间——HUD 钉块顶，
  // 容器/警戒线/坠落高度/底部带 = 9:16 基准 + EXTRA 整体下移，底部带恒 74 贴块底。
  // 坠落高度 = 最大可投放滴底触警戒线时的球心（dangerY - 45）；高屏多余的高度上下均分
  // （oy 为块居中偏移），块外由背景渐变延伸填充。
  // ★ 改比例只改 config 的 C.H 一处：layout.build() 自动重算全部游戏内坐标
  //   （EXTRA=C.H-747 垫到 HUD 与坠落高度之间）；本 fit() 只负责
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
    // 胶囊残余避让：居中后 HUD 顶行（块内 cy36/r16 → 顶缘 20）若仍在胶囊下缘之上才需额外下挪；
    // 高屏居中量已远大于胶囊高度 → hudInset=0（无需再避让）；矮屏(≈块高)才给 ≤24 的残余量。
    var capBottom = window.__safeTop ? (window.__safeTop - 8) / view.s : 0;
    hudInset = Math.max(0, Math.min(capBottom - oy - 20, 24));
    // 容器区（layout.body 单一真源）：容器底/容器顶/警戒线/出生点 = 9:16 基准 + EXTRA
    // 整体下移（EXTRA=C.H-747），容器 420:483 恒定——不同设备游戏区大小比例完全一致
    FLOORY = MG.layout.body.floorY;        // 673+EXTRA（9:16=673 / 9:18=766 / 8:18=871）
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
    if (typeof trophyBtn !== 'undefined' && typeof MUTE !== 'undefined') {
      // 静音在 drawHUD 内、由 render translate(0,hudInset) 下挪残余胶囊量，故 cy 保持 36；
      // 奖杯在 HUD 之外（drawSkillBar 绘制路径）不吃该平移，故 cy 直接含 hudInset 残余偏移。
      trophyBtn.cy = MG.layout.hud.trophyCy + hudInset; MUTE.cy = MG.layout.hud.trophyCy;
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

;
// ===== js/systems.js =====
// 水滴合成深海 - systems：游戏状态 / 输入 / 合成 / 技能 / 潮汐 / 海域事件 / 图鉴数据 / 主更新
// 模块加载顺序 2/4（依赖 core.js：canvas、audio、存储助手）。顶层 var 初始化
// （rollTier 等）调用的函数与本文件同域提升，或来自已加载的 core.js。
// 水滴合成深海 - 游戏主逻辑
// 输入 / 合成 / 技能 / 图鉴 / 海域 / 特殊水滴(漩涡·雨云·冰晶) / 潮汐 / 任务链 / 渲染 / 音效 / 广告占位
// 全部 UI 画在 canvas 内（含按钮命中判定），便于后续原样移植到微信小游戏（无 DOM 环境）
  // ---------- 状态 ----------
  var phys = new MG.Physics();
  var state = 'menu'; // 开机先停在开始界面（主流小游戏设计：标题 + 开始按钮）
  var menuStartBtn = { x: C.W / 2 - 110, y: MG.layout.menu.startY, w: MG.layout.menu.startW, h: MG.layout.menu.startH }; // 「开始游戏」主按钮
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
      layout: { H: C.H, extra: MG.layout.extra, bandH: MG.layout.band.h, btnCy: MG.layout.band.btnCy, decorBase: MG.layout.band.decorBase,
                overY: MG.layout.overRect().y, shareY: MG.layout.shareRect().y, confirmY: MG.layout.confirmRect().y,
                focusCy: MG.layout.panel.focusCy, hudBottom: MG.layout.hud.hudBottom },
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
    // 可用区：统计文字之下 → 面板底部留白；按钮组在该区内垂直居中
    // （面板几何走 MG.layout.overRect()，渲染 drawOver 与命中此处同源）
    var ovr = MG.layout.overRect();
    var areaTop = ovr.y + 186, areaBottom = ovr.y + ovr.h - 22;
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

  // ---------- 命中区域（圆形按钮；坐标全部由 layout 派生，与绘制同源）----------
  var MUTE = { cx: C.W - 24, cy: MG.layout.hud.trophyCy, r: 16, pressT: 0 };
  var bookBtn = { cx: 46, cy: MG.layout.band.btnCy, r: 20, pressT: 0 };
  var trophyBtn = { cx: 24, cy: MG.layout.hud.trophyCy, r: 16, pressT: 0 }; // 成就页入口（奖杯；局内由 fit()/render 挂到刘海行 +hudInset）——与重开按钮(r16)同径
  var menuTrophy = { cx: 24, cy: MG.layout.hud.trophyCy, r: 16, pressT: 0 }; // 菜单态奖杯固定位（菜单铺满全屏不偏移，与局内刘海行分用）——与重开按钮同径
  var restartBtn = { cx: C.W - 24, cy: MG.layout.band.btnCy, r: 16, pressT: 0 }; // 游戏内重开（带确认），右下角
  // 「深渊潜航」无局内悬浮钮：入口在结算页按钮组（主流 NG+ 模式选择设计）
  // 底部一排共 6 个按钮（图鉴 + 4 道具 + 重开），中心等距 70px 均匀排列：46/116/186/256/326/396
  var SKILL_BTNS = [
    { key: 'swap',   cx: 116, cy: MG.layout.band.btnCy, r: 20, pressT: 0 },
    { key: 'ripple', cx: 186, cy: MG.layout.band.btnCy, r: 20, pressT: 0 },
    { key: 'evap',   cx: 256, cy: MG.layout.band.btnCy, r: 20, pressT: 0 },
    { key: 'flow',   cx: 326, cy: MG.layout.band.btnCy, r: 20, pressT: 0 }
  ];
  fit(); // 首次适配（按钮已定义，底部元素可同步贴底）

  // 重开确认弹窗（几何走 layout.confirmRect，渲染/命中共用）
  var confirmOpen = false;
  var confirmYes = { x: C.W / 2 - 106, y: MG.layout.confirmRect().y + MG.layout.panel.confirm.btnDy, w: 94, h: 42 };
  var confirmNo = { x: C.W / 2 + 12, y: MG.layout.confirmRect().y + MG.layout.panel.confirm.btnDy, w: 94, h: 42 };

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

;
// ===== js/panels.js =====
// 水滴合成深海 - panels：面板几何 + 面板绘制（图鉴 / 成就殿堂 / 每日 / 榜单 / 分享卡）
// 模块加载顺序 3.5/4（systems 之后、render 之前）。四个模块共享全局作用域（经典 script），
// 本文件只有"函数声明 + 纯数据 + 几何常量"，无顶层调用语句，加载序不敏感；
// 绘制函数引用的游戏状态（daily / dexUnlocked / SP_DEFS 等）与工具（grad / roundRect / panel）
// 均在运行期经全局作用域解析，与定义处所在文件解耦。
// 拆分动机：面板几何此前散在 systems（命中判定）与 render（绘制）两处，改布局需全文搜索；
// 现统一收敛到本文件——几何常量与绘制同源，渲染与点击热区天然一致。

  // ---------- 面板几何（渲染与点击热区共用，一处定义）----------
  // 尺寸/锚点走 MG.layout（改比例只改 config C.H，此处自动跟随）；y 为动态值：
  var DEX_PANEL = { x: MG.layout.panel.dex.x, y: 64, w: MG.layout.panel.dex.w, h: MG.layout.panel.dex.h };
  var dexCloseBtn = { x: DEX_PANEL.x + DEX_PANEL.w - 42, y: DEX_PANEL.y + 8, w: 28, h: 28 }; // 右上 × 关闭（中心 +22px，与页头标题文字对齐）
  // 面板垂直居中：菜单态（铺满）以整屏 VH 为基准；局内游戏块高 C.H 为基准（比例旋钮，
  // 居中块=屏幕中心，块内 (C.H-h)/2 + 偏移 renderOy 恰好落在屏幕中央）——每帧绘制前重算
  function layoutDexPanel() {
    var base = state === 'menu' ? VH : C.H;
    DEX_PANEL.y = Math.max(10, Math.round((base - DEX_PANEL.h) / 2));
    dexCloseBtn.y = DEX_PANEL.y + 8;
  }
  // 成就页分段页签：成就 / 每日 / 榜单（与图鉴分节同款分段控件样式）
  function achTabRect(i) {
    var segW = Math.floor((DEX_PANEL.w - 30) / 3);
    return { x: DEX_PANEL.x + 15 + i * segW, y: DEX_PANEL.y + 40, w: segW, h: 28 };
  }
  var shareCopyBtn = { x: 0, y: 0, w: 150, h: 42 }; // 分享卡片：复制文案按钮（打开时定位）
  function spSlotRect(stg, s) {
    // 海域演进行右侧的特殊滴槽位（s=0/1），宝箱也占一个槽位；与 stageRowRect 同基
    var r = stageRowRect(stg);
    return { x: r.x + r.w - 196 + s * 98, y: r.y + 4, w: 92, h: 32 };
  }
  function tierCellRect(t) {
    // 合成链分节：3 列 × 3 行（9 档），格高 122 填满说明区以上空间
    return { x: DEX_PANEL.x + 14 + (t % 3) * 118, y: DEX_PANEL.y + 76 + Math.floor(t / 3) * 130, w: 108, h: 122 };
  }
  function stageRowRect(g) {
    // 海域演进分节：8 行纵向列表（由浅入深），行距 48 填满说明区以上空间
    return { x: DEX_PANEL.x + 14, y: DEX_PANEL.y + 80 + g * 48, w: DEX_PANEL.w - 28, h: 40 };
  }
  function dexSecRect(i) {
    // 分节切换：通栏分段控件（合成链 / 海域演进——特殊滴已并入海域行），样式与顶部页签区分
    var segW = Math.floor((DEX_PANEL.w - 30) / 2);
    return { x: DEX_PANEL.x + 15 + i * segW, y: DEX_PANEL.y + 40, w: segW, h: 28 };
  }
  function dchalBtnRect() {
    // 每日页签挑战卡右侧「开始挑战」按钮（systems 点击判定与绘制共用）
    return { x: DEX_PANEL.x + DEX_PANEL.w - 118, y: DEX_PANEL.y + 74 + 26, w: 96, h: 34 };
  }

  // ---------- 面板绘制 ----------
  // 通用页头：左侧标题 + 右上 × 关闭（图鉴/成就共用；标题为空则不画，避免与页签重名）
  function drawPanelHeader(title) {
    ctx.textAlign = 'left';
    if (title) {
      ctx.fillStyle = '#155A8A';
      ctx.font = 'bold 19px system-ui, sans-serif';
      ctx.fillText(title, DEX_PANEL.x + 18, DEX_PANEL.y + 30);
    }
    ctx.fillStyle = 'rgba(46,134,180,0.12)';
    ctx.beginPath(); ctx.arc(dexCloseBtn.x + dexCloseBtn.w / 2, dexCloseBtn.y + dexCloseBtn.h / 2, 13, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#4A7FA0'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    var ccx = dexCloseBtn.x + dexCloseBtn.w / 2, ccy = dexCloseBtn.y + dexCloseBtn.h / 2;
    ctx.beginPath();
    ctx.moveTo(ccx - 4, ccy - 4); ctx.lineTo(ccx + 4, ccy + 4);
    ctx.moveTo(ccx + 4, ccy - 4); ctx.lineTo(ccx - 4, ccy + 4);
    ctx.stroke();
    ctx.lineCap = 'butt';
  }
  // 通用分段控件：segRects=[{x,w}...]，活动段浅蓝渐变胶囊芯片（描边+垂直居中文字）
  // 切换时芯片从旧位置平滑滑到新位置（180ms 缓动）；key 区分多套控件各自记忆位置
  // 时钟用 performance.now（渲染帧钟）：面板打开期间 update 冻结 time，但渲染照跑，动画必须能走
  var segAnims = {};
  function drawSegTabs(rects, labels, active, dotIdx, key) {
    var now = performance.now() / 1000;
    var r0 = rects[0], rl = rects[rects.length - 1];
    ctx.fillStyle = 'rgba(21,90,138,0.10)';
    roundRect(r0.x, r0.y, rl.x + rl.w - r0.x, r0.h, r0.h / 2); ctx.fill();
    // 芯片滑动动画
    var st = segAnims[key];
    if (!st) { st = segAnims[key] = { cur: active, fx: rects[active].x, fw: rects[active].w, t0: -9 }; }
    if (active !== st.cur) {
      st.cur = active; st.t0 = now;
    }
    var p = Math.min(1, (now - st.t0) / 0.18);
    p = 1 - (1 - p) * (1 - p) * (1 - p); // easeOutCubic
    var tx0 = st.fx + (rects[active].x - st.fx) * p;
    var tw0 = st.fw + (rects[active].w - st.fw) * p;
    if (p >= 1) { st.fx = rects[active].x; st.fw = rects[active].w; }
    // 芯片
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
      if (i === dotIdx && i !== active) { // 未全勤提醒小红点
        ctx.fillStyle = '#E2705E';
        ctx.beginPath(); ctx.arc(sr.x + sr.w - 11, sr.y + 7, 3, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.textBaseline = 'alphabetic';
  }
  // 图鉴页头收集度徽条：进度条 + 四个里程碑刻度（25/50/75/100%），已达成的点亮金色圆点
  // 纯展示无交互；数据来自 systems 的 colProgress/COL_MILESTONES（运行期全局解析）
  function drawColBadge() {
    var cp = colProgress();
    var pct = cp.n / cp.total;
    var full = pct >= 1;
    var bx = DEX_PANEL.x + 112, bw = 162, by = DEX_PANEL.y + 19, bh = 8;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#4A7FA0';
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText('收集度', DEX_PANEL.x + 66, DEX_PANEL.y + 28);
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
        ctx.beginPath(); ctx.arc(mx, by + bh / 2, 3.2, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 1; ctx.stroke();
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.fillRect(mx - 1, by + 1.5, 2, bh - 3);
      }
    }
    ctx.textAlign = 'right';
    ctx.fillStyle = '#155A8A';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.fillText(cp.n + '/' + cp.total, DEX_PANEL.x + DEX_PANEL.w - 56, DEX_PANEL.y + 29);
    ctx.textAlign = 'center';
  }

  function drawDex() {
    layoutDexPanel();
    ctx.fillStyle = 'rgba(10,40,70,0.6)';
    ctx.fillRect(-BX, -renderOy, C.W + BX * 2, VH);
    panel(DEX_PANEL.x, DEX_PANEL.y, DEX_PANEL.w, DEX_PANEL.h, 14, 0.96);
    drawPanelHeader('图鉴');
    drawColBadge();

    // —— 分节切换：通栏分段控件（特殊滴槽位已并入海域演进，不再单列）——
    var secNames = ['合成链', '海域演进'];
    var secRects = [dexSecRect(0), dexSecRect(1)];
    drawSegTabs(secRects, secNames, dexSec, -1, 'dexsec');
    var curStage = seaStage(), tsNow = totalScore();
    ctx.textAlign = 'center';

    if (dexSec === 0) {
      // 合成链 3×3 大格（点击条目在底部说明区查看描述）
      for (var t = 0; t < T.length; t++) {
        var tRect = tierCellRect(t);
        var unlocked = !!dexUnlocked[t], sel = dexSelTier === t;
        ctx.fillStyle = sel ? 'rgba(46,134,180,0.16)' : 'rgba(46,134,180,0.07)';
        roundRect(tRect.x, tRect.y, tRect.w, tRect.h, 10); ctx.fill();
        if (sel) {
          ctx.strokeStyle = '#2E86B4'; ctx.lineWidth = 1.5;
          roundRect(tRect.x + 0.5, tRect.y + 0.5, tRect.w - 1, tRect.h - 1, 10); ctx.stroke();
        }
        var bx = tRect.x + tRect.w / 2, by = tRect.y + 44;
        if (unlocked) {
          drawBall({ x: bx, y: by, r: 24, tier: t, vx: 0, vy: 0 }, 1);
        } else {
          ctx.fillStyle = '#B8CBD8';
          ctx.beginPath(); ctx.arc(bx, by, 24, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#8AA5B8';
          ctx.font = 'bold 20px system-ui, sans-serif';
          ctx.fillText('?', bx, by + 6);
        }
        ctx.fillStyle = unlocked ? '#155A8A' : '#8AA5B8';
        ctx.font = 'bold 16px system-ui, sans-serif';
        ctx.fillText(unlocked ? T[t].name : '？？？', bx, tRect.y + 88);
        ctx.font = '13px system-ui, sans-serif';
        ctx.fillStyle = '#4A7FA0';
        ctx.fillText(unlocked ? ('分值 ' + T[t].score + ' · ×' + (dexCounts[t] || 0)) : '未解锁', bx, tRect.y + 108);
      }
    } else if (dexSec === 1) {

      // 海域演进纵向列表（由浅入深）：每行 = 徽章 + 海域名/状态 + 该海域 2 个特殊滴槽位
      // 已抵达：发现的显实际形态，未发现的显"？"；下一海域只显海域名+解锁积分；更深的特殊滴一律"？？？"不剧透
      ctx.textAlign = 'left';
      for (var stg = 0; stg < C.seaStages.length; stg++) {
        var ss = C.seaStages[stg];
        var sRow = stageRowRect(stg);
        var isCur = stg === curStage, reached = Math.max(tsNow, careerPeak) >= ss.at, sel = dexSelStage === stg;
        var isNext = stg === curStage + 1, hiddenStg = !isCur && !reached && !isNext;
        var rowCy = sRow.y + sRow.h / 2;
        if (isCur) {
          // 当前海域行铺该海域背景主题色（bg 渐变中段→深段，与游戏内一致）
          var rowG = ctx.createLinearGradient(sRow.x, 0, sRow.x + sRow.w, 0);
          rowG.addColorStop(0, ss.bg[2]);
          rowG.addColorStop(1, ss.bg[3]);
          ctx.fillStyle = rowG;
        } else if (reached) { // 已抵达：铺该海域背景主题色的浅底
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
        // 左侧：海域专属徽章（当前=脉冲环 / 已抵达·下一海域=彩/灰徽 / 更深海域不显示图标）
        var dotX = sRow.x + 20, dotY = rowCy;
        if (isCur) {
          ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(dotX, dotY, 12.5 + Math.sin(time * 4) * 1.2, 0, Math.PI * 2); ctx.stroke();
        }
        if (isCur || reached || isNext) drawSeaBadge(stg, dotX, dotY, reached || isCur);
        ctx.fillStyle = isCur ? '#FFFFFF' : (reached ? '#155A8A' : '#8AA5B8');
        ctx.font = 'bold 15px system-ui, sans-serif';
        if (isCur) {
          ctx.lineJoin = 'round'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(10,50,80,0.35)';
          ctx.strokeText(isCur || reached || isNext ? ss.name : '？？？', dotX + 15, rowCy - 3);
        }
        ctx.fillText(isCur || reached || isNext ? ss.name : '？？？', dotX + 15, rowCy - 3);
        ctx.font = '11px system-ui, sans-serif';
        ctx.fillStyle = isCur ? 'rgba(255,255,255,0.92)' : (reached ? '#1E7A6F' : (isNext ? '#7A98AC' : '#B0584A'));
        var gateTxt = isCur ? '当前海域' : (isNext ? '下一海域 · 累计' + (ss.at >= 10000 ? (ss.at / 10000) + '万' : ss.at) + '分' : '累计 ' + (ss.at >= 10000 ? (ss.at / 10000) + '万' : ss.at) + ' 分解锁');
        if (isCur) ctx.strokeText(gateTxt, dotX + 15, rowCy + 11);
        ctx.fillText(gateTxt, dotX + 15, rowCy + 11);
        // 右侧：该海域的 2 个特殊滴槽位（点击查看说明）
        var slots2 = STAGE_SP_SLOTS[stg] || STAGE_SP_SLOTS[0];
        for (var sl = 0; sl < 2; sl++) {
          var slotR = spSlotRect(stg, sl);
          var spIdx2 = slots2[sl];
          var isChest2 = spIdx2 === SP_DEFS.length;
          var spDef2 = isChest2 ? null : SP_DEFS[spIdx2];
          var found2 = !!dexSpecial[isChest2 ? 'chest' : spDef2.key]; // 宝箱同样以首次沉入场中为发现条件
          if (dexSelSp === spIdx2 && dexSelStage < 0) {
            ctx.fillStyle = 'rgba(46,134,180,0.14)';
            roundRect(slotR.x, slotR.y, slotR.w, slotR.h, 8); ctx.fill();
            ctx.strokeStyle = '#2E86B4'; ctx.lineWidth = 1.2;
            roundRect(slotR.x + 0.5, slotR.y + 0.5, slotR.w - 1, slotR.h - 1, 8); ctx.stroke();
          }
          var cx2 = slotR.x + 14, cy2 = rowCy;
          if ((hiddenStg || isNext) && !reached) { // 生涯未抵达：虚线空位 + "？？？"（特殊滴内容不剧透，海域名/解锁积分仍可见）
            ctx.save();
            ctx.setLineDash([3, 3]);
            ctx.strokeStyle = '#A8BCCB'; ctx.lineWidth = 1;
            roundRect(slotR.x + 0.5, slotR.y + 0.5, slotR.w - 1, slotR.h - 1, 8); ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = '#A8BCCB';
            ctx.font = '13px system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('？？？', slotR.x + slotR.w / 2, cy2 + 4);
            ctx.textAlign = 'left';
            ctx.restore();
            continue;
          }
          if (found2) {
            drawSpForm(spIdx2, cx2, cy2);
          } else {
            // 未发现：实底浅灰圆 + 虚线圈 + 深色问号（够醒目）
            ctx.fillStyle = 'rgba(196,212,224,0.55)';
            ctx.beginPath(); ctx.arc(cx2, cy2, 9, 0, Math.PI * 2); ctx.fill();
            ctx.setLineDash([2.5, 2.5]);
            ctx.strokeStyle = '#5E7E96'; ctx.lineWidth = 1.2;
            ctx.beginPath(); ctx.arc(cx2, cy2, 10.8, 0, Math.PI * 2); ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = '#3E647E';
            ctx.font = 'bold 14px system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('?', cx2, cy2 + 4);
            ctx.textAlign = 'left';
          }
          ctx.fillStyle = found2 ? '#155A8A' : '#4E6E86';
          ctx.font = '13px system-ui, sans-serif';
          ctx.fillText(found2 ? (isChest2 ? '宝箱' : spDef2.name) : '？？？', slotR.x + 33, cy2 + 4);
        }
      }
      ctx.textAlign = 'center';
    }

    // —— 说明区：合成链 / 海域 / 特殊滴·宝箱 三类条目通用 ——
    var title, sub, body, known = true;
    if (dexSelTier >= 0) {
      var tu = !!dexUnlocked[dexSelTier];
      known = tu;
      title = tu ? T[dexSelTier].name : '？？？';
      sub = tu ? ('分值 ' + T[dexSelTier].score + ' · 累计合成 ×' + (dexCounts[dexSelTier] || 0)) : '未解锁';
      body = tu ? '与同档水滴相触即合成更高阶。' : '继续合成，遇见它便会点亮。';
    } else if (dexSelStage >= 0) {
      var stgS = C.seaStages[dexSelStage];
      var stgReached = Math.max(tsNow, careerPeak) >= stgS.at, stgCur = dexSelStage === curStage;
      title = stgReached || stgCur ? stgS.name : '？？？';
      sub = stgCur ? '当前海域' : (stgReached ? '已抵达' : ('累计 ' + (stgS.at >= 10000 ? (stgS.at / 10000) + '万' : stgS.at) + ' 分解锁'));
      body = '越深水色越暗：潮汐更频、礁石更多。';
    } else {
      var CHEST_INFO = { key: 'chest', name: '宝箱', desc: '沉底木箱，沉走前点开：得分或充能。' };
      var isChestSel = dexSelSp === SP_DEFS.length;
      var dsc = isChestSel ? CHEST_INFO : (SP_DEFS[dexSelSp] || SP_DEFS[0]);
      known = !!dexSpecial[isChestSel ? 'chest' : dsc.key];
      title = known ? dsc.name : '？？？';
      sub = known ? (isChestSel ? '深海随机事件' : '已发现') : '未发现';
      body = known ? dsc.desc : '在海域中发现它即可点亮说明。';
    }
    // 说明区：贴面板底部（消除底部大片空白）
    ctx.fillStyle = 'rgba(46,134,180,0.10)';
    roundRect(DEX_PANEL.x + 12, DEX_PANEL.y + 478, DEX_PANEL.w - 24, 68, 8); ctx.fill();
    ctx.textAlign = 'left';
    ctx.fillStyle = known ? '#155A8A' : '#8AA5B8';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.fillText(title, DEX_PANEL.x + 24, DEX_PANEL.y + 498);
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillStyle = known ? '#1E7A6F' : '#B0584A';
    ctx.fillText(sub, DEX_PANEL.x + 24, DEX_PANEL.y + 516);
    ctx.fillStyle = '#4A7FA0';
    ctx.fillText(body, DEX_PANEL.x + 24, DEX_PANEL.y + 536);
    ctx.textAlign = 'center';
  }

  // 成就页（独立入口，与图鉴拆分）：成就 / 每日 / 榜单
  function drawAchPanel() {
    layoutDexPanel();
    ctx.fillStyle = 'rgba(10,40,70,0.6)';
    ctx.fillRect(-BX, -renderOy, C.W + BX * 2, VH);
    panel(DEX_PANEL.x, DEX_PANEL.y, DEX_PANEL.w, DEX_PANEL.h, 14, 0.96);
    drawPanelHeader('成就殿堂'); // 固定页头标题，不随页签变化
    var dailyDot = !(daily.done[0] && daily.done[1] && daily.done[2]) ? 1 : -1;
    drawSegTabs([achTabRect(0), achTabRect(1), achTabRect(2)], ['成就', '每日', '榜单'], dexTab, dailyDot, 'achtabs');
    if (dexTab === 1) drawDailyTab();
    else if (dexTab === 2) drawRankTab();
    else drawAchTab();
  }

  // 图鉴/海域演进用迷你宝箱图标：与场上宝箱（drawChest）同款金色渐变+铜箍铆钉+缝光+金锁+描金边，缩比复刻
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
    // 与场上宝箱同构（w=1.6r, h=1.3r, r=18）：同渐变同细节
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
    // 盖顶弧形高光
    ctx.strokeStyle = 'rgba(255,240,190,0.5)'; ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-w * 0.34, -h * 0.30);
    ctx.quadraticCurveTo(0, -h * 0.62, w * 0.34, -h * 0.30);
    ctx.stroke();
    // 箱身（中段受光、底角沉影）
    ctx.fillStyle = grad('chestBodyI', function () {
      var gg2 = ctx.createLinearGradient(0, seamY, 0, h * 0.56);
      gg2.addColorStop(0, '#D8A44C'); gg2.addColorStop(0.5, '#C08A38'); gg2.addColorStop(1, '#8F5E22');
      return gg2;
    });
    roundRect(-w / 2, seamY, w, h * 0.62, 2.5); ctx.fill();
    // 木板竖缝
    ctx.strokeStyle = 'rgba(110,66,20,0.45)'; ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-w * 0.17, seamY + 2); ctx.lineTo(-w * 0.17, h * 0.52);
    ctx.moveTo(w * 0.17, seamY + 2); ctx.lineTo(w * 0.17, h * 0.52);
    ctx.stroke();
    // 铜箍 ×2 + 亮金铆钉
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
    // 盖缝透光（呼吸）
    var seamG = 0.26 + 0.24 * Math.sin(time * 3 + 1);
    ctx.fillStyle = 'rgba(255,224,130,' + seamG.toFixed(2) + ')';
    roundRect(-w * 0.4, seamY - 1, w * 0.8, 2, 1); ctx.fill();
    // 金锁 + 锁孔
    ctx.fillStyle = '#FFD873';
    roundRect(-3.6, seamY - 2.5, 7.2, 8, 2); ctx.fill();
    ctx.fillStyle = '#5A3A14';
    ctx.beginPath(); ctx.arc(0, seamY + 1, 1.3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-0.7, seamY + 1.8); ctx.lineTo(0.7, seamY + 1.8);
    ctx.lineTo(0.45, seamY + 4.2); ctx.lineTo(-0.45, seamY + 4.2);
    ctx.closePath(); ctx.fill();
    // 描金边（盖弧 + 箱身）
    ctx.strokeStyle = 'rgba(242,193,78,0.85)'; ctx.lineWidth = 1.1;
    roundRect(-w / 2, seamY, w, h * 0.62, 2.5); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-w / 2, seamY);
    ctx.quadraticCurveTo(0, -h * 0.72, w / 2, seamY);
    ctx.stroke();
    ctx.restore();
  }

  // 海域徽章：每片海域专属颜色 + 图形（图鉴列表用，便于一眼区分）
  var SEA_BADGES = [
    { c: '#3BB8D8', g: 'pool' },    // 潮汐池：波浪
    { c: '#38A98A', g: 'coral' },   // 珊瑚浅海：珊瑚枝（绿=海域主题色，珊瑚也有绿色的）
    { c: '#2E9BD4', g: 'bubbles' }, // 蔚蓝深海：气泡
    { c: '#4A5FB4', g: 'star' },    // 午夜深渊：夜星
    { c: '#647FA8', g: 'moon' },    // 月光环礁：月牙（银蓝=月下海面色，不用金色抢主题）
    { c: '#2A4C8A', g: 'eye' },     // 海沟之眼：海之眼
    { c: '#B85C3A', g: 'vent' },    // 热泉裂谷：热泉火苗（暗锈橙=热泉褐岩色）
    { c: '#8A5FB4', g: 'crown' }    // 深渊王座：王冠
  ];
  function drawSeaBadge(stg, x, y, reached, opaque) {
    var ic = SEA_BADGES[stg] || SEA_BADGES[0];
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2);
    if (reached) {
      ctx.fillStyle = ic.c; ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 1; ctx.stroke();
    } else {
      // opaque：不透明浅底（用于骑在进度条端点上遮挡条身，否则半透明底会透出进度条）
      ctx.fillStyle = opaque ? '#EFF5FA' : 'rgba(120,145,165,0.16)'; ctx.fill();
      ctx.strokeStyle = '#8AA5B8'; ctx.lineWidth = 1; ctx.stroke();
    }
    var fg = reached ? '#FFFFFF' : '#8AA5B8';
    ctx.strokeStyle = fg; ctx.fillStyle = fg;
    ctx.lineWidth = 1.4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    switch (ic.g) {
      case 'pool': // 双波浪线
        ctx.moveTo(-5.5, -2.5); ctx.quadraticCurveTo(-2.8, -5.5, 0, -2.5); ctx.quadraticCurveTo(2.8, 0.5, 5.5, -2.5);
        ctx.moveTo(-5.5, 3.5); ctx.quadraticCurveTo(-2.8, 0.5, 0, 3.5); ctx.quadraticCurveTo(2.8, 6.5, 5.5, 3.5);
        ctx.stroke(); break;
      case 'coral': // 珊瑚枝
        ctx.moveTo(0, 5); ctx.lineTo(0, -1);
        ctx.moveTo(0, 0); ctx.lineTo(-3.5, -4.5);
        ctx.moveTo(0, 1); ctx.lineTo(3.5, -2.5);
        ctx.moveTo(-3.5, -4.5); ctx.lineTo(-2, -5.5);
        ctx.stroke(); break;
      case 'bubbles': // 三粒气泡
        ctx.arc(-2.5, 3, 1.7, 0, Math.PI * 2);
        ctx.moveTo(1.8, -0.5); ctx.arc(0.8, -0.5, 1.1, 0, Math.PI * 2);
        ctx.moveTo(3.4, -3.8); ctx.arc(3, -3.8, 0.6, 0, Math.PI * 2);
        ctx.stroke(); break;
      case 'star': // 四角夜星
        ctx.moveTo(0, -5); ctx.quadraticCurveTo(0.9, -0.9, 5, 0);
        ctx.quadraticCurveTo(0.9, 0.9, 0, 5);
        ctx.quadraticCurveTo(-0.9, 0.9, -5, 0);
        ctx.quadraticCurveTo(-0.9, -0.9, 0, -5);
        ctx.fill(); break;
      case 'moon': // 月牙（叠圆裁出）
        ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = reached ? ic.c : 'rgba(120,145,165,0.16)'; // 补底圆与徽底同色，未抵达不显彩
        ctx.beginPath(); ctx.arc(2.2, -1.6, 4.4, 0, Math.PI * 2); ctx.fill(); break;
      case 'eye': // 海之眼
        ctx.ellipse(0, 0, 5.2, 3.1, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 0, 1.7, 0, Math.PI * 2); ctx.fill(); break;
      case 'vent': // 热泉火苗
        ctx.moveTo(0, -5.5); ctx.quadraticCurveTo(4.5, -0.5, 2.2, 4.5);
        ctx.lineTo(-2.2, 4.5); ctx.quadraticCurveTo(-4.5, -0.5, 0, -5.5);
        ctx.fill(); break;
      case 'crown': // 王冠
        ctx.moveTo(-5, 3.5); ctx.lineTo(-5, -2); ctx.lineTo(-2.2, 0.2);
        ctx.lineTo(0, -4.2); ctx.lineTo(2.2, 0.2); ctx.lineTo(5, -2);
        ctx.lineTo(5, 3.5); ctx.closePath(); ctx.fill(); break;
    }
    ctx.restore();
  }

  // 图鉴内特殊滴的实际形态（小尺寸）：礁石=岩石 / 符文滴=水滴+符文牌 / 宝箱=迷你木箱 / 其余=水滴+专属标记
  function drawSpForm(spIdx, x, y) {
    if (spIdx === SP_DEFS.length) { drawChestIcon(x, y, 0.55); return; }
    var key = SP_DEFS[spIdx].key;
    if (key === 'iron') { drawIronBall({ x: x, y: y, r: 11, vx: 0, vy: 0 }, 1); return; }
    if (key === 'rune') { drawBall({ x: x, y: y, r: 11, tier: 1, vx: 0, vy: 0, rune: 'ripple' }, 1); return; }
    drawBall({ x: x, y: y, r: 11, tier: 1, vx: 0, vy: 0, special: key, frozen: key === 'ice' ? 1 : 0 }, 1);
  }

  // 成就页签：常驻目标列表（跨局累计，达成给分与充能奖励）
  function drawAchTab() {
    ctx.textAlign = 'center';
    // 双列紧凑布局（12 项成就）：难度看星数、奖励看卡片内一行，页首不再放说明行
    var cw = 178, ch = 70, gap = 8;
    for (var i = 0; i < ACH_DEFS.length; i++) {
      var a = ACH_DEFS[i];
      var cx0 = DEX_PANEL.x + 14 + (i % 2) * (cw + gap);
      var ry = DEX_PANEL.y + 86 + Math.floor(i / 2) * (ch + gap);
      var done = !!achDone[a.id];
      var cur = Math.min(a.target, a.cur());
      var d = a.diff || 1;
      ctx.fillStyle = done ? 'rgba(245,197,66,0.14)' : (d === 3 ? 'rgba(150,110,220,0.08)' : 'rgba(46,134,180,0.07)');
      roundRect(cx0, ry, cw, ch, 8); ctx.fill();
      // 难度色左饰条（达成转金）
      ctx.fillStyle = done ? '#F5C542' : (d === 3 ? '#9B7FD0' : (d === 2 ? '#C99B3F' : '#8FB4CC'));
      roundRect(cx0, ry + 10, 3, ch - 20, 1.5); ctx.fill();
      ctx.textAlign = 'left';
      // 名称 + 难度星（达成金色，未达成灰蓝）
      ctx.fillStyle = done ? '#B8860B' : (d === 3 ? '#6B5AA8' : '#155A8A');
      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.fillText((done ? '✓ ' : '') + a.name, cx0 + 10, ry + 16);
      ctx.textAlign = 'right';
      ctx.fillStyle = d === 3 ? '#9B7FD0' : (d === 2 ? '#C99B3F' : '#9AB4C4');
      ctx.font = '11px system-ui, sans-serif';
      var starTxt = '';
      for (var st = 0; st < d; st++) starTxt += '★';
      ctx.fillText(starTxt, cx0 + cw - 10, ry + 15);
      ctx.textAlign = 'left';
      // 描述（一行截断：双列较窄，超宽省略）
      ctx.fillStyle = '#4A7FA0';
      ctx.font = '11px system-ui, sans-serif';
      var desc = a.desc;
      while (ctx.measureText(desc).width > cw - 20 && desc.length > 4) desc = desc.slice(0, -2);
      if (desc !== a.desc) desc += '…';
      ctx.fillText(desc, cx0 + 10, ry + 31);
      // 奖励说明
      ctx.fillStyle = done ? '#1E7A6F' : '#9AB4C4';
      ctx.font = '10px system-ui, sans-serif';
      var perk = a.perk;
      while (ctx.measureText(perk).width > cw - 20 && perk.length > 4) perk = perk.slice(0, -2);
      if (perk !== a.perk) perk += '…';
      ctx.fillText(perk, cx0 + 10, ry + 43);
      // 进度条（左）+ 状态文字（右，同一行垂直居中，不再压在条上）
      var barX = cx0 + 10, barW = cw - 64, barY = ry + 52;
      ctx.fillStyle = 'rgba(46,134,180,0.15)';
      roundRect(barX, barY, barW, 9, 4.5); ctx.fill();
      ctx.fillStyle = done ? '#F5C542' : '#2E86B4';
      if (cur > 0) { roundRect(barX, barY, Math.max(9, barW * cur / a.target), 9, 4.5); ctx.fill(); }
      ctx.textAlign = 'right';
      ctx.fillStyle = done ? '#B8860B' : '#4A7FA0';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.fillText(done ? '已达成' : (cur + '/' + a.target), cx0 + cw - 10, barY + 8);
    }
  }

  // 每日页签：3 个按日期生成的任务（独立说明行已删，卡片上移放大）
  // 每日挑战卡（每日页签顶部）：今日海况词缀 + 目标分 + 开始按钮（热区 dchalBtnRect，systems 处理点击）
  // 菜单态离线收益告知卡（自动入账、无点击）：历史最佳行与开始按钮之间的空档，金色宝箱色系
  function drawOfflineCard() {
    if (state !== 'menu' || !offlineGain) return;
    var mu = MG.layout.menu;
    var w = mu.offlineW, h = mu.offlineH, x = (C.W - w) / 2, y = mu.offlineY;
    var og = ctx.createLinearGradient(0, y, 0, y + h);
    og.addColorStop(0, 'rgba(245,197,66,0.16)');
    og.addColorStop(1, 'rgba(217,169,63,0.08)');
    ctx.fillStyle = og;
    roundRect(x, y, w, h, 10); ctx.fill();
    ctx.strokeStyle = 'rgba(245,197,66,0.55)'; ctx.lineWidth = 1.2;
    roundRect(x, y, w, h, 10); ctx.stroke();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#F5C542';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillText('宝箱 · 离线收益', C.W / 2, y + 22);
    var om = offlineGain.mins;
    ctx.fillStyle = 'rgba(240,250,255,0.92)';
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillText('离开 ' + (om >= 60 ? Math.floor(om / 60) + ' 时 ' + (om % 60) + ' 分' : om + ' 分钟') + ' · 深海攒下 ' + offlineGain.gain + ' 分', C.W / 2, y + 43);
    ctx.fillStyle = 'rgba(200,225,245,0.55)';
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillText('开始游戏后自动入账', C.W / 2, y + 57);
    ctx.textAlign = 'center'; // 恢复菜单流的 center——曾误设 left 泄漏给开始按钮，导致小程序文字右移溢出
  }

  function drawDchalCard() {
    var ci = dchalInfo();
    var cx = DEX_PANEL.x + 14, cy = DEX_PANEL.y + 74, cw = DEX_PANEL.w - 28, chh = 96;
    ctx.fillStyle = ci.done ? 'rgba(245,197,66,0.14)' : 'rgba(123,111,208,0.10)';
    roundRect(cx, cy, cw, chh, 10); ctx.fill();
    if (ci.done) { ctx.fillStyle = '#F5C542'; roundRect(cx, cy + 10, 3, chh - 20, 1.5); ctx.fill(); }
    ctx.textAlign = 'left';
    ctx.fillStyle = ci.done ? '#B8860B' : '#6A5AB8';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.fillText((ci.done ? '✓ ' : '') + '今日挑战 · ' + ci.name, cx + 12, cy + 24);
    ctx.fillStyle = '#4A7FA0';
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillText(ci.desc, cx + 12, cy + 46);
    ctx.fillText('目标 ' + ci.goal + ' 分 · 连续 ' + ci.streak + ' 天', cx + 12, cy + 68);
    ctx.fillText('首通奖励最高 +' + C.dailyChal.rewardMax + ' 分 & 随机充能 +2', cx + 12, cy + 88);
    var br = dchalBtnRect();
    var bg = ctx.createLinearGradient(0, br.y, 0, br.y + br.h);
    if (!ci.canStart) { bg.addColorStop(0, '#B9C9D4'); bg.addColorStop(1, '#9DB2C0'); }
    else if (ci.done) { bg.addColorStop(0, '#F5C542'); bg.addColorStop(1, '#D9A93F'); }
    else { bg.addColorStop(0, '#8B7FD0'); bg.addColorStop(1, '#6A5AB8'); }
    ctx.fillStyle = bg;
    roundRect(br.x, br.y, br.w, br.h, br.h / 2); ctx.fill();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.fillText(ci.done ? '再玩一局' : '开始挑战', br.x + br.w / 2, br.y + 22);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#8AA5B8';
    ctx.font = '12px system-ui, sans-serif';
    if (!ci.canStart) ctx.fillText('对局中不可发起', br.x - 6, br.y + 52);
  }
  function drawDailyTab() {
    drawDchalCard();
    for (var i = 0; i < daily.tasks.length; i++) {
      var t = daily.tasks[i], done = daily.done[i];
      var ry = DEX_PANEL.y + 184 + i * 106;
      ctx.fillStyle = done ? 'rgba(245,197,66,0.14)' : 'rgba(46,134,180,0.07)';
      roundRect(DEX_PANEL.x + 14, ry, DEX_PANEL.w - 28, 84, 10); ctx.fill();
      // 达成金饰条
      if (done) { ctx.fillStyle = '#F5C542'; roundRect(DEX_PANEL.x + 14, ry + 10, 3, 64, 1.5); ctx.fill(); }
      ctx.textAlign = 'left';
      ctx.fillStyle = done ? '#B8860B' : '#155A8A';
      ctx.font = 'bold 16px system-ui, sans-serif';
      ctx.fillText((done ? '✓ ' : '') + t.text, DEX_PANEL.x + 26, ry + 26);
      // 难度星级（右侧）+ 分级奖励
      ctx.textAlign = 'right';
      ctx.fillStyle = (t.stars || 1) === 3 ? '#9B7FD0' : ((t.stars || 1) === 2 ? '#C99B3F' : '#9AB4C4');
      ctx.font = '13px system-ui, sans-serif';
      var dstar = '';
      for (var ds = 0; ds < (t.stars || 1); ds++) dstar += '★';
      ctx.fillText(dstar, DEX_PANEL.x + DEX_PANEL.w - 26, ry + 24);
      ctx.textAlign = 'left';
      ctx.fillStyle = '#4A7FA0';
      ctx.font = '14px system-ui, sans-serif';
      ctx.fillText('奖励 +' + Math.round(C.daily.rewardScore * (1 + ((t.stars || 1) - 1) * 0.5)) + ' 分', DEX_PANEL.x + 26, ry + 50);
      // 进度条
      var barX = DEX_PANEL.x + 26, barW = DEX_PANEL.w - 120, barY = ry + 62;
      ctx.fillStyle = 'rgba(46,134,180,0.15)';
      roundRect(barX, barY, barW, 9, 4.5); ctx.fill();
      if (daily.prog[i] > 0) {
        ctx.fillStyle = done ? '#F5C542' : '#2E86B4';
        roundRect(barX, barY, Math.max(6, barW * daily.prog[i] / t.need), 9, 4.5); ctx.fill();
      }
      ctx.textAlign = 'center';
      ctx.fillStyle = done ? '#B8860B' : '#4A7FA0';
      ctx.font = '13px system-ui, sans-serif';
      ctx.fillText(done ? '已完成' : (daily.prog[i] + '/' + t.need), barX + barW + 34, barY + 9);
      ctx.textAlign = 'left';
    }
  }

  // 榜单页签：本地好友榜（预留微信排行榜接口位）
  function drawRankTab() {
    var rows = friendBoard();
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      var ry = DEX_PANEL.y + 86 + i * 50;
      ctx.fillStyle = r.me ? 'rgba(245,197,66,0.16)' : (i % 2 ? 'rgba(46,134,180,0.05)' : 'rgba(46,134,180,0.09)');
      roundRect(DEX_PANEL.x + 14, ry, DEX_PANEL.w - 28, 42, 9); ctx.fill();
      // 名次徽章（序号必须显式居中：上一轮循环末尾的 textAlign 会污染到这里）
      var badge = ['#F5C542', '#B9C4CC', '#D2955B'][i] || 'rgba(46,134,180,0.35)';
      ctx.fillStyle = badge;
      ctx.beginPath(); ctx.arc(DEX_PANEL.x + 38, ry + 21, 12, 0, Math.PI * 2); ctx.fill();
      ctx.textAlign = 'center';
      ctx.fillStyle = i < 3 ? '#FFFFFF' : '#3E6E90';
      ctx.font = 'bold 14px system-ui, sans-serif';
      ctx.fillText(String(i + 1), DEX_PANEL.x + 38, ry + 26);
      ctx.textAlign = 'left';
      ctx.fillStyle = r.me ? '#B8860B' : '#155A8A';
      ctx.font = (r.me ? 'bold ' : '') + '16px system-ui, sans-serif';
      ctx.fillText(r.me ? r.name + '（你）' : r.name, DEX_PANEL.x + 60, ry + 26);
      ctx.textAlign = 'right';
      ctx.fillStyle = r.me ? '#B8860B' : '#3E6E90';
      ctx.font = 'bold 16px system-ui, sans-serif';
      ctx.fillText(String(r.score), DEX_PANEL.x + DEX_PANEL.w - 26, ry + 26);
      ctx.textAlign = 'left';
    }
  }

  // 战报分享卡片（结算页"分享战报"打开；上线后接 wx.shareAppMessage）
  function drawShare() {
    if (!shareOpen) return;
    ctx.fillStyle = 'rgba(10,40,70,0.6)';
    ctx.fillRect(-BX, -renderOy, C.W + BX * 2, VH);
    var sr = MG.layout.shareRect(); // 锚定游戏区焦点（v161 定版中心），块高变化不漂流
    var pw = sr.w, ph = sr.h, px = sr.x, py = sr.y;
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
    ctx.font = 'bold 25px system-ui, sans-serif';
    ctx.fillText('水滴合成深海 · 深海战报', C.W / 2, py + 40);
    ctx.font = '14px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillText(C.seaStages[seaStage()].name + ' · ' + daily.date, C.W / 2, py + 66);
    // 大分数
    ctx.font = 'bold 58px system-ui, sans-serif';
    ctx.fillStyle = '#0F4C79';
    ctx.fillText(String(score), C.W / 2, py + 168);
    ctx.font = '15px system-ui, sans-serif';
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
      ctx.font = 'bold 18px system-ui, sans-serif';
      ctx.fillText(stats[i][1], sx + (sw - 8) / 2, py + 240);
      ctx.fillStyle = '#4A7FA0';
      ctx.font = '13px system-ui, sans-serif';
      ctx.fillText(stats[i][0], sx + (sw - 8) / 2, py + 258);
    }
    // 分享文案预览（左对齐 + 按行数自适应盒高）
    ctx.textAlign = 'left';
    ctx.font = '14px system-ui, sans-serif';
    var shLines = wrapLines(shareText, pw - 60);
    var shBoxH = Math.max(44, 20 + shLines.length * 16);
    ctx.fillStyle = 'rgba(46,134,180,0.06)';
    roundRect(px + 20, py + 278, pw - 40, shBoxH, 8); ctx.fill();
    ctx.fillStyle = '#3E6E90';
    for (var li = 0; li < shLines.length; li++) ctx.fillText(shLines[li], px + 32, py + 296 + li * 16);
    ctx.textAlign = 'center';
    // 按钮：复制文案 / 关闭（关闭提示放按钮上方，避免贴面板底边被圆角裁切）
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
// ===== js/render.js =====
// 水滴合成深海 - render：绘制工具与游戏渲染（背景 / 水滴 / 宝箱 / HUD / 结算）；面板绘制见 panels.js
// 模块加载顺序 3/4（依赖 core+systems 的状态与画布上下文；顶层仅有渐变缓存初始化）。
// （面板几何与面板绘制已拆分至 panels.js：DEX_PANEL/页签/分节 rect 与图鉴/成就/每日/榜单/分享卡绘制）
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
  // 颜色插值（海域换色渐变用）：支持 '#RRGGBB' 与 'rgb/rgba(...)' 两种写法
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

  // ---------- 背景：深海渐变（全窗口宽） + 顶部柔光 + 波光 + 气泡 ----------
  // ---------- 渐变缓存（性能：每帧 create 渐变产生对象 churn + GC 压力，按 key 复用） ----------
  // Canvas 渐变坐标在"绘制时"才被 CTM 变换，因此同一局部坐标定义的渐变可跨帧/跨对象复用。
  var _gradCache = {};
  function grad(key, make) {
    var g = _gradCache[key];
    if (!g) {
      if (Object.keys(_gradCache).length > 96) _gradCache = {}; // 简单防膨胀（罕见：pop 缩放等动态 key）
      g = make();
      _gradCache[key] = g;
    }
    return g;
  }

  function drawBackground() {
    // 深海渐变（铺满整个窗口，两侧即延伸海水）；色调随海域里程碑逐级加深，
    // 跨里程碑时在 1.8s 内从旧海域色平滑插值到新海域色（seaBlend 提供进度）
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
    // 渐变缓存 key：过渡期按 1/24 步长量化（视觉无级差，缓存不爆炸）
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

    // 顶部阳光光晕 + 两侧柔光（静态光斑，缓存渐变）
    ctx.fillStyle = grad('sun' + lk, function () {
      var gg = ctx.createRadialGradient(LW * 0.5, -30, 20, LW * 0.5, -30, 300);
      gg.addColorStop(0, 'rgba(255,255,255,0.55)');
      gg.addColorStop(1, 'rgba(255,255,255,0)');
      return gg;
    });
    ctx.fillRect(0, 0, LW, 300);
    ctx.fillStyle = grad('glowL' + lk, function () {
      var gg = ctx.createRadialGradient(LW * 0.22, -50, 10, LW * 0.22, -50, 280);
      gg.addColorStop(0, 'rgba(255,255,255,0.34)');
      gg.addColorStop(1, 'rgba(255,255,255,0)');
      return gg;
    });
    ctx.fillRect(0, 0, LW, 300);
    ctx.fillStyle = grad('glowR' + lk, function () {
      var gg = ctx.createRadialGradient(LW * 0.8, -50, 10, LW * 0.8, -50, 280);
      gg.addColorStop(0, 'rgba(255,255,255,0.26)');
      gg.addColorStop(1, 'rgba(255,255,255,0)');
      return gg;
    });
    ctx.fillRect(0, 0, LW, 300);

    // 两侧延伸海水柔和压暗（游戏区居中成为视觉焦点，主流 letterbox 质感）
    if (BX > 0) {
      var edge = BX + 26; // 仅轻微溢入游戏区，避免在缸体内形成可见的明暗台阶
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

    // 顶部斜射光柱（缓慢摇曳 + 呼吸明暗，营造水下丁达尔效应）
    // 性能：渐变只建一次（满 alpha），明暗用 globalAlpha 表达
    var ray = grad('ray' + vk, function () {
      var gg = ctx.createLinearGradient(0, 0, 0, VH * 0.72);
      gg.addColorStop(0, 'rgba(255,255,255,1)');
      gg.addColorStop(1, 'rgba(255,255,255,0)');
      return gg;
    });
    for (var bi = 0; bi < 3; bi++) {
      var bx0 = LW * (0.16 + bi * 0.3) + Math.sin(time * 0.13 + bi * 2.1) * LW * 0.04;
      var tilt = Math.sin(time * 0.09 + bi * 1.4) * 0.10 + (bi - 1) * 0.06;
      var bw = 46 + bi * 24;
      var rayA = 0.05 + 0.035 * (0.5 + 0.5 * Math.sin(time * 0.23 + bi * 2.6));
      ctx.save();
      ctx.translate(bx0, -10);
      ctx.rotate(tilt);
      // 边缘软化：4 层递缩宽度叠加（外层淡、内层实），左右两侧形成渐变过渡不再生硬
      var LAYERS = [[1, 0.14], [0.74, 0.2], [0.48, 0.28], [0.24, 0.38]]; // [宽度比, alpha 比]（中心累计≈1）
      for (var li = 0; li < LAYERS.length; li++) {
        ctx.globalAlpha = rayA * LAYERS[li][1];
        ctx.fillStyle = ray;
        var lw = bw * LAYERS[li][0];
        ctx.fillRect(-lw / 2, 0, lw, VH * 0.82);
      }
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
      // 触手（5 条，长短错落、摆动相位错开；根部精确落在裙边波浪线上，x 随伞盖脉动同步收张——不再与身子脱节）
      ctx.strokeStyle = 'rgba(' + jl.tint + ',0.55)';
      ctx.lineWidth = 1.6;
      ctx.lineCap = 'round';
      for (tt = -2; tt <= 2; tt++) {
        var tx0 = tt * jl.s * 0.28 * pulse;
        var tu = (tt * 0.28 + 1) / 2; // 与裙边同参数化：u = (x/宽 + 1)/2
        var ty0 = Math.sin(tu * Math.PI * 2 + time * 2 + jl.ph) * jl.s * 0.06;
        var tl = jl.s * (1.8 - Math.abs(tt) * 0.2);
        ctx.beginPath();
        ctx.moveTo(tx0, ty0 + 1);
        ctx.quadraticCurveTo(tx0 + Math.sin(time * 2 + jl.ph + tt * 1.3) * 6, ty0 + tl * 0.55,
                             tx0 + Math.sin(time * 1.3 + tt * 1.7) * 9, ty0 + tl);
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
    // 每条鱼带 fade（0~1 淡入淡出）与 tint/tintD（海域专属体色）
    for (i = 0; i < fishes.length; i++) {
      var f = fishes[i];
      if (f.fade <= 0.01) continue;
      ctx.save();
      ctx.globalAlpha = Math.min(1, f.fade);
      ctx.translate(f.x, f.y);
      ctx.scale(f.dir, 1);
      var twk = Math.sin(f.tail) * f.s * 0.18;
      // 渐变缓存：坐标在缩放后的局部空间定义，同一鱼的 s 恒定 → 直接复用
      var bodyG = grad('fish' + Math.round(f.s) + '_' + f.tint, function () {
        var gg = ctx.createLinearGradient(0, -f.s * 0.45, 0, f.s * 0.45);
        gg.addColorStop(0, 'rgba(' + f.tint + ',0.32)');
        gg.addColorStop(1, 'rgba(' + f.tintD + ',0.18)');
        return gg;
      });
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

  // 一条侧边栏的水下植被剪影（x0..x1 为侧边栏范围，seed 区分左右两侧形态）：
  // 后层长飘带巨藻（填充式渐细叶，随水流整条弯曲）+ 前层短叶海草丛 + 圆润礁石
  function drawFlora(x0, x1, seed) {
    var w = x1 - x0;
    if (w < 24) return; // 手机模式侧边栏宽 0，自动跳过
    var baseY = VH - 3;
    var k, i, s2;
    ctx.lineCap = 'round';
    // ---- 后层：巨藻（弯曲主茎 + 两排交互披针叶，整株绕根轻摆） ----
    var nk = Math.max(2, Math.min(3, Math.floor(w / 50)));
    for (k = 0; k < nk; k++) {
      var px = x0 + (k + 0.5) * w / nk + Math.sin(seed * 1.7 + k * 5.3) * w * 0.15;
      var h = 95 + ((k * 53 + seed * 17) % 60) + (VH - C.H) * 0.16; // 侧栏植被随窗口高出块高的量增高
      h = Math.min(h, VH * 0.36);
      var bend = Math.sin(time * (0.45 + (k % 3) * 0.15) + seed + k * 2.2); // -1..1 摆幅
      var tone = k % 2 ? '15,64,94' : '22,84,110';
      ctx.save();
      ctx.translate(px, baseY);
      // 主茎采样点（上段弯得多，模拟水流拖曳）
      var segs = 7, pts = [];
      for (i = 0; i <= segs; i++) {
        var t = i / segs;
        pts.push({ x: bend * h * 0.2 * t * t, y: -h * t });
      }
      // 主茎（分段渐细）
      for (i = 0; i < segs; i++) {
        ctx.strokeStyle = 'rgba(' + tone + ',0.36)';
        ctx.lineWidth = 3.6 * (1 - (i / segs) * 0.7);
        ctx.beginPath();
        ctx.moveTo(pts[i].x, pts[i].y);
        ctx.lineTo(pts[i + 1].x, pts[i + 1].y);
        ctx.stroke();
      }
      // 叶片：沿茎两侧交互生长的披针形，越往上越小、色越淡
      for (i = 1; i <= segs; i++) {
        var t2 = i / segs;
        var leafLen = h * 0.17 * (1 - t2 * 0.72);
        for (s2 = -1; s2 <= 1; s2 += 2) {
          var ang = (s2 > 0 ? -0.55 : Math.PI + 0.55) + pts[i].x * 0.012; // 斜向上，随茎弯微调
          var bx2 = pts[i].x, by2 = pts[i].y;
          var ex2 = bx2 + Math.cos(ang) * leafLen;
          var ey2 = by2 + Math.sin(ang) * leafLen;
          var c1x = bx2 + Math.cos(ang) * leafLen * 0.45 - Math.sin(ang) * leafLen * 0.18;
          var c1y = by2 + Math.sin(ang) * leafLen * 0.45 + Math.cos(ang) * leafLen * 0.18;
          var c2x = bx2 + Math.cos(ang) * leafLen * 0.45 + Math.sin(ang) * leafLen * 0.18;
          var c2y = by2 + Math.sin(ang) * leafLen * 0.45 - Math.cos(ang) * leafLen * 0.18;
          ctx.fillStyle = 'rgba(' + tone + ',' + (0.34 - t2 * 0.1) + ')';
          ctx.beginPath();
          ctx.moveTo(bx2, by2);
          ctx.quadraticCurveTo(c1x, c1y, ex2, ey2);
          ctx.quadraticCurveTo(c2x, c2y, bx2, by2);
          ctx.closePath(); ctx.fill();
        }
      }
      // 顶芽（梢端小亮点）
      var tp = pts[segs];
      ctx.fillStyle = 'rgba(70,132,158,0.42)';
      ctx.beginPath(); ctx.arc(tp.x, tp.y, 2.2, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    // ---- 前层：圆头短叶草丛（后排深色衬托 + 前排亮色，各 3 叶扇形） ----
    var nc = Math.max(2, Math.min(3, Math.floor(w / 52)));
    for (k = 0; k < nc; k++) {
      var cx0 = x0 + (k + 0.5) * w / nc + Math.sin(seed * 2.9 + k * 3.7) * w * 0.12;
      var chh = 26 + ((k * 31 + seed * 11) % 18);
      var rows = [
        { hMul: 0.68, col: 'rgba(13,58,86,0.30)', off: 6, ph: 2.1 },
        { hMul: 1.0, col: 'rgba(30,104,132,0.34)', off: 0, ph: 0 }
      ];
      for (var rw = 0; rw < rows.length; rw++) {
        var row = rows[rw];
        for (var lf = 0; lf < 3; lf++) {
          var lh = chh * row.hMul * (lf === 1 ? 1 : 0.74);
          var lx = cx0 + row.off + (lf - 1) * 9;
          var lsway = Math.sin(time * (0.7 + rw * 0.2 + lf * 0.13) + seed + k * 4 + row.ph) * (4 + lh * 0.12);
          var wb2 = 3.4;
          ctx.fillStyle = row.col;
          ctx.beginPath();
          ctx.moveTo(lx - wb2, baseY);
          ctx.quadraticCurveTo(lx - wb2 * 0.5 + lsway * 0.35, baseY - lh * 0.62, lx + lsway, baseY - lh);
          ctx.quadraticCurveTo(lx + wb2 * 0.5 + lsway * 0.35, baseY - lh * 0.62, lx + wb2, baseY);
          ctx.closePath(); ctx.fill();
          // 圆头梢端
          ctx.beginPath(); ctx.arc(lx + lsway, baseY - lh, wb2 * 0.55, 0, Math.PI * 2); ctx.fill();
        }
      }
    }
    // ---- 底部礁石（双层：暗底 + 顶部受光面，前后错落） ----
    var rn = Math.max(1, Math.floor(w / 64));
    for (k = 0; k < rn; k++) {
      var rx = x0 + (k + 0.5) * w / rn + Math.sin(seed * 3 + k * 5.1) * w * 0.1;
      var rr = 11 + ((k * 53 + seed * 7) % 13);
      // 暗色主体
      ctx.fillStyle = 'rgba(12,52,88,0.38)';
      ctx.beginPath(); ctx.ellipse(rx, baseY + 4, rr, rr * 0.45, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(rx - rr * 0.5, baseY + 5, rr * 0.6, rr * 0.3, 0, 0, Math.PI * 2); ctx.fill();
      // 顶部受光弧
      ctx.strokeStyle = 'rgba(190,225,250,0.14)';
      ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.ellipse(rx, baseY + 1, rr * 0.8, rr * 0.32, 0, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
    }
  }

  // ---------- 水滴渲染（变形 / 拖尾 / 冻结 / 弹跳） ----------
  function popScale(b) {
    if (!b.popT || b.popT <= 0) return 1;
    var t = b.popT / 0.28;
    if (t > 0.6) return 0.6 + (1.15 - 0.6) * (1 - t) / 0.4;
    return 1.15 - 0.15 * (0.6 - t) / 0.6;
  }

  // 礁石压顶不做压扁/形变：物理层已让礁石与普通滴严格分离（零容差全量修正），保持各自圆形
  function drawBall(b, alpha) {
    if (b.iron) { if (b.chest) drawChest(b, alpha); else drawIronBall(b, alpha); return; }
    var t = T[b.tier];
    var s = popScale(b);
    var r = b.r * s;
    var speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
    // 渲染平滑位（systems 每帧维护；旧存档字段缺失时回退物理位）
    var bx = b.rx != null ? b.rx : b.x, by = b.ry != null ? b.ry : b.y;

    // 落地软阴影（绝对坐标，先画）
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
    ctx.translate(bx, by);
    var k = b.defK || 0;
    if (k > 0.012) {
      ctx.rotate(Math.atan2(b.defY || 0, b.defX || 1));
      ctx.scale(1 + k, 1 - k);
    }

    // 主体径向渐变（相对坐标；性能：按 tier+半径缓存，满场时省下 ~150 次/帧的 create）
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

    // 底部内反光：径向渐变光晕（裁剪扩到球缘 0.995r：反光与球体边缘连续过渡，不再有"内亮外暗"分界环）
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

    // 边缘高光：两端渐隐 + 宽度方向也柔和过渡的柔光弧（多层递缩叠加，单层描边两侧会有硬边界）
    ctx.save();
    ctx.strokeStyle = grad('bE' + b.tier + '_' + rk, function () {
      var gg = ctx.createLinearGradient(-r * 0.94, -r * 0.09, r * 0.21, -r * 0.92);
      gg.addColorStop(0, 'rgba(255,255,255,0)');
      gg.addColorStop(0.5, 'rgba(255,255,255,0.8)');
      gg.addColorStop(1, 'rgba(255,255,255,0)');
      return gg;
    });
    ctx.lineCap = 'round';
    var ARC_LAY = [[1, 0.22], [0.6, 0.34], [0.26, 0.5]]; // [宽度比, alpha 比]（中心累计≈1，与原单层峰值一致）
    for (var al = 0; al < ARC_LAY.length; al++) {
      ctx.globalAlpha = alpha * 0.6 * ARC_LAY[al][1];
      ctx.lineWidth = Math.max(1.2, r * 0.055 * ARC_LAY[al][0]);
      ctx.beginPath(); ctx.arc(0, 0, r * 0.94, Math.PI * 1.03, Math.PI * 1.57); ctx.stroke();
    }
    ctx.restore();
    ctx.globalAlpha = alpha;

    // 双高光（径向渐变光斑：中心实、边缘渐隐到 0，无硬边界；随时间柔和淡入淡出，每球错相）
    var hp = (b.id || 0) * 1.13;
    var ha1 = 0.5 + 0.17 * Math.sin(time * 1.7 + hp);
    var hs1 = 1 + 0.06 * Math.sin(time * 1.7 + hp); // 呼吸时轻微缩放
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
    else if (b.tier <= 4) drawFace(r);
    else drawWaves(r);
    // 符文徽记（右上角小圆牌）
    if (b.rune) drawRuneMark(r, b.rune);

    // 冻结外壳
    if (b.frozen > 0) drawFrozenShell(b, r);

    ctx.restore();
  }

  // 礁石（内部名 iron）：岩石球——内部全部径向渐变光效（天光/岩缝暗斑/苔藓绿斑/内壁晕影），无线描无实心填充
  function drawIronBall(b, alpha) {
    var r = b.r;
    var bx = b.rx != null ? b.rx : b.x, by = b.ry != null ? b.ry : b.y;
    // 落地软阴影
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
    // 岩石主体（径向渐变：左上受光暖灰 → 右下沉暗，渐变缓存）
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
    // 内部光效统一裁剪进岩体，边缘自然收进
    ctx.save();
    ctx.beginPath(); ctx.arc(0, 0, r * 0.99, 0, Math.PI * 2); ctx.clip();
    // ① 左上天光（径向光斑：四周渐隐，替代描边弧高光）
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
    // ② 岩缝暗斑：三道斜向椭圆暗晕暗示裂缝走向（不描线，柔边过渡）
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
    // ③ 苔藓斑（径向渐变绿晕：中心浓边缘透明，大小/纵比错落）
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
    // ④ 内壁晕影：由内向外轻微加深（体积感 + 所有内容在球壁处统一收边）
    ctx.fillStyle = grad('ironVg' + rk2, function () {
      var gg = ctx.createRadialGradient(0, 0, r * 0.5, 0, 0, r);
      gg.addColorStop(0, 'rgba(20,16,10,0)');
      gg.addColorStop(0.75, 'rgba(20,16,10,0.14)');
      gg.addColorStop(1, 'rgba(20,16,10,0.42)');
      return gg;
    });
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.restore(); // 内部裁剪
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
    // 内部裁剪扩到球缘（0.995r）：内部暗化与球体边缘连续过渡，避免 0.94r 处出现"内暗外亮"分界环
    ctx.beginPath(); ctx.arc(0, 0, r * 0.995, 0, Math.PI * 2); ctx.clip();
    var wk = Math.round(r * 2) / 2;
    // 设计原则：内部不画任何"线条/实心形状"（硬边贴纸感是丑的根源），
    // 全部用径向渐变光效表达——深度、水面、气泡、光斑皆自然渐隐，边缘永远有过渡。
    // ① 左上天光（径向渐变光斑：四周全部渐隐，替代线性渐变实心椭圆的可见轮廓）
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
    // ② 底部深水暗晕：暗调自下而上消散（深度感，全软边）
    ctx.fillStyle = grad('wvDeep' + wk, function () {
      var gg = ctx.createRadialGradient(0, r * 1.18, r * 0.08, 0, r * 1.18, r * 1.1);
      gg.addColorStop(0, 'rgba(3,14,38,0.44)');
      gg.addColorStop(0.55, 'rgba(6,26,64,0.16)');
      gg.addColorStop(1, 'rgba(6,26,64,0)');
      return gg;
    });
    ctx.fillRect(-r, -r, r * 2, r * 2);
    // ③ 水面月光带：水面高度一团横向拉长的柔光椭圆（缓慢漂移呼吸），
    //    不画线，光斑本身即是"水面"的暗示；气泡升到此处即没，语义闭环
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
    // ④ 焦散光斑：3 枚小柔光在水面下缓慢游移闪烁（水面折射的光，软边）
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
    // ⑤ 柔边气泡：3 枚径向渐变气泡从底部升到水面渐没（抵达光带处淡出，无描边）
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
    // ⑥ 内壁晕影：由内向外轻微加深，一直铺到球缘并与球体边缘色融合——
    //    内部各元素与球壁之间不再有可见分界（过渡由这条连续渐变统一兜底）
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

  // 宝箱：弧顶木盖 + 直壁箱身 + 铜箍铆钉 + 金锁 + 盖缝透光 + 环绕星光 + 剩余时间环（超时会沉走）
  function drawChest(b, alpha) {
    var bob = Math.sin(time * 2.2) * 1.5;
    var bx = b.rx != null ? b.rx : b.x, by = b.ry != null ? b.ry : b.y;
    ctx.save();
    ctx.globalAlpha = alpha;
    // 落地软阴影
    var fd = FLOORY - (by + b.r);
    if (fd < 30 && fd > -b.r) {
      ctx.fillStyle = 'rgba(10,20,30,' + (0.2 * (1 - Math.max(0, fd) / 30)) + ')';
      ctx.beginPath(); ctx.ellipse(bx, FLOORY - 2, b.r * 0.95, b.r * 0.2, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.translate(bx, by);
    // 呼吸金光（渐变缓存；脉动走 globalAlpha，不重建渐变）
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
    var seamY = -h * 0.06; // 盖/身分界
    // 盖（弧顶木盖）——暖金木色：顶部受光亮金 → 盖缝处深琥珀
    ctx.fillStyle = grad('chestLid', function () {
      var gg = ctx.createLinearGradient(0, -h * 0.62, 0, seamY);
      gg.addColorStop(0, '#F4C866'); gg.addColorStop(0.55, '#DDA948'); gg.addColorStop(1, '#B98430');
      return gg;
    });
    ctx.beginPath();
    ctx.moveTo(-w / 2, seamY);
    ctx.quadraticCurveTo(0, -h * 0.72, w / 2, seamY);
    ctx.closePath(); ctx.fill();
    // 盖顶弧形高光（受光面）
    ctx.strokeStyle = 'rgba(255,240,190,0.5)'; ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-w * 0.34, -h * 0.30);
    ctx.quadraticCurveTo(0, -h * 0.62, w * 0.34, -h * 0.30);
    ctx.stroke();
    // 身（直壁木箱，底部圆角）：中段受光、底角沉入阴影
    ctx.fillStyle = grad('chestBody', function () {
      var gg = ctx.createLinearGradient(0, seamY, 0, h * 0.56);
      gg.addColorStop(0, '#D8A44C'); gg.addColorStop(0.5, '#C08A38'); gg.addColorStop(1, '#8F5E22');
      return gg;
    });
    roundRect(-w / 2, seamY, w, h * 0.62, 3); ctx.fill();
    // 木板竖缝
    ctx.strokeStyle = 'rgba(110,66,20,0.45)'; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-w * 0.17, seamY + 3); ctx.lineTo(-w * 0.17, h * 0.52);
    ctx.moveTo(w * 0.17, seamY + 3); ctx.lineTo(w * 0.17, h * 0.52);
    ctx.stroke();
    // 铜箍 ×2（贯穿盖与身）——深古铜底 + 亮金铆钉
    ctx.fillStyle = '#7A4E1C';
    roundRect(-w * 0.42, -h * 0.36, 4.5, h * 0.9, 2); ctx.fill();
    roundRect(w * 0.42 - 4.5, -h * 0.36, 4.5, h * 0.9, 2); ctx.fill();
    // 铆钉
    ctx.fillStyle = '#FFE6A6';
    ctx.beginPath();
    ctx.arc(-w * 0.42 + 2.2, -h * 0.2, 1.1, 0, Math.PI * 2);
    ctx.arc(w * 0.42 - 2.3, -h * 0.2, 1.1, 0, Math.PI * 2);
    ctx.arc(-w * 0.42 + 2.2, h * 0.34, 1.1, 0, Math.PI * 2);
    ctx.arc(w * 0.42 - 2.3, h * 0.34, 1.1, 0, Math.PI * 2);
    ctx.fill();
    // 盖缝透光（呼吸）
    var seamG = 0.26 + 0.24 * Math.sin(time * 3 + 1);
    ctx.fillStyle = 'rgba(255,224,130,' + seamG.toFixed(2) + ')';
    roundRect(-w * 0.4, seamY - 1, w * 0.8, 2.2, 1.1); ctx.fill();
    // 金锁 + 锁孔
    ctx.fillStyle = '#FFD873';
    roundRect(-4.5, seamY - 3, 9, 10, 2.5); ctx.fill();
    ctx.fillStyle = '#5A3A14';
    ctx.beginPath(); ctx.arc(0, seamY + 1.2, 1.6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-0.9, seamY + 2.2); ctx.lineTo(0.9, seamY + 2.2);
    ctx.lineTo(0.55, seamY + 5.2); ctx.lineTo(-0.55, seamY + 5.2);
    ctx.closePath(); ctx.fill();
    // 描金边（盖弧 + 箱身）
    ctx.strokeStyle = 'rgba(242,193,78,0.85)'; ctx.lineWidth = 1.4;
    roundRect(-w / 2, seamY, w, h * 0.62, 3); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-w / 2, seamY);
    ctx.quadraticCurveTo(0, -h * 0.72, w / 2, seamY);
    ctx.stroke();
    // 环绕星光（3 颗，闪烁）
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
    // 剩余时间环：底轨 + 分级变色（充足白 → 偏短金 → 将沉红）
    var frac = Math.max(0, 1 - chest.t / chest.life);
    ctx.strokeStyle = 'rgba(20,40,55,0.28)'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(0, 0, b.r + 8, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = frac > 0.5 ? 'rgba(255,255,255,0.85)' : (frac > 0.25 ? '#FFC94D' : '#FF6B52');
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(0, 0, b.r + 8, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2); ctx.stroke();
    ctx.lineCap = 'butt';
    ctx.restore();
  }
  // 彩虹滴徽记：旋转流动的五彩弧 + 游动星光（保留动态效果）。
  // 颜色走 hslToRgba（微信 Canvas 对 hsla 支持不稳定，直接用 hsla 会导致描边偶发失效→视觉「闪烁」）。
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
  // 疾风滴标记：三条流动风弧
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
  // 磁石滴标记：马蹄磁铁（U 形 + 两极白端）
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
  // 甘霖滴标记：新芽（茎 + 双叶）
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
  // 雷霆滴标记：闪电
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
  // 珍珠滴标记：贝壳托珠
  function drawPearlMark(r) {
    ctx.save();
    ctx.strokeStyle = 'rgba(210,190,150,0.95)';
    ctx.lineWidth = Math.max(1.6, r * 0.09);
    ctx.beginPath(); ctx.arc(0, r * 0.16, r * 0.42, 0, Math.PI); ctx.stroke(); // 贝壳碗
    ctx.fillStyle = 'rgba(255,255,255,0.98)';
    ctx.beginPath(); ctx.arc(0, r * 0.08, r * 0.2, 0, Math.PI * 2); ctx.fill(); // 珍珠
    ctx.fillStyle = 'rgba(180,160,120,0.9)';
    ctx.beginPath(); ctx.arc(-r * 0.06, r * 0.02, r * 0.05, 0, Math.PI * 2); ctx.fill(); // 珠光
    ctx.restore();
  }
  // 熔岩滴标记：火苗
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
  // 间歇泉滴标记：三根上冲水柱
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
  // 虚空滴标记：漩涡眼（双螺旋弧）
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
  // 极光滴标记：双条极光带
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
    // 底盘：径向渐变柔光漩涡盘（静置不转，营造深度）
    ctx.fillStyle = grad('vtxDisc', function () {
      var gg = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.82);
      gg.addColorStop(0, 'rgba(94,110,208,0.30)');
      gg.addColorStop(0.6, 'rgba(94,110,208,0.13)');
      gg.addColorStop(1, 'rgba(94,110,208,0)');
      return gg;
    });
    ctx.beginPath(); ctx.arc(0, 0, r * 0.82, 0, Math.PI * 2); ctx.fill();
    // 三条螺旋臂：整臂单路径连续描边（无接缝），透明度沿臂渐隐，整体缓慢旋转
    ctx.rotate(time * 2.4);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (var arm = 0; arm < 3; arm++) {
      var a0 = arm * Math.PI * 2 / 3;
      var endA = a0 + Math.PI * 1.9;
      (function (a0, endA, arm) {
        // 渐变与臂均从核心内部（0.05r）起：中心与旋臂连成一体，不再分离
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
        var rr2 = r * (0.05 + 0.61 * tt);              // 从核心内部起旋，臂与中心相接
        var x2 = Math.cos(aa) * rr2, y2 = Math.sin(aa) * rr2;
        if (i2 === 0) ctx.moveTo(x2, y2); else ctx.lineTo(x2, y2);
      }
      ctx.stroke();
    }
    // 中心亮核（被吸入的光）——核略放大并被旋臂根部穿过，与臂连成一体
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
    ctx.font = 'bold 14px system-ui, sans-serif';
    var tw = ctx.measureText(label).width + 12;
    var ly = Math.max(C.containerTop + 14, C.spawnY - r - 6); // 紧贴球顶；大档虚影时钳制在容器内，不越过开口顶到 HUD
    ctx.fillStyle = 'rgba(255,255,255,0.88)';
    roundRect(aimX - tw / 2, ly - 12, tw, 17, 8); ctx.fill();
    ctx.fillStyle = nextIron ? '#6B6353' : (nextSpecial ? specialColor(nextSpecial) : runeColor(nextRune));
    ctx.fillText(label, aimX, ly);
    ctx.restore();
  }

  // ---------- 容器：玻璃质感 + 底部焦散 ----------
  function drawContainer() {
    var floorY = FLOORY, FH = 12;
    // 底部不带独立海床色块：容器底（FLOORY）以下直接显示全屏背景水色渐变（用户定：
    // 「去掉这个方块，不是变个颜色，直接显示整体的背景」），任何分辨率观感一致。
    // 床面：圆角横条（半透明玻璃质感，透出背景色，不再有硬边界）
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
    var dep = grad('dep' + Math.round(FLOORY), function () {
      var gg = ctx.createLinearGradient(0, floorY - 30, 0, floorY);
      gg.addColorStop(0, 'rgba(20,70,120,0)');
      gg.addColorStop(1, 'rgba(20,70,120,0.14)');
      return gg;
    });
    ctx.fillStyle = dep;
    ctx.fillRect(0, floorY - 30, C.W, 30);

    // 底部装饰（无海床基色，直接坐在背景水色上）：沙丘起伏 + 卵石 + 海星 + 扇贝。
    // 坐标全部由 layout.band 派生（钉容器底相对位）：块高/比例变化时装饰不重排（v172 教训）
    var sy0 = MG.layout.band.decorBase;
    // 沙丘（径向渐变柔边：中心实色 → 边缘全透明，消除硬边；scale 把椭圆映射到单位圆，
    // 保证渐变在椭圆各个方向均匀衰减，不会因径向渐变是圆形而被压扁）
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
      dune(C.W * du.xr, sy0 + du.dy, du.rx, du.ry, du.c, du.c0);
    }
    // 卵石（块内坐标，贴容器底；装饰 y 以 FLOORY=646 时代为基准，随床面整体下移）
    ctx.fillStyle = 'rgba(110,150,168,0.4)';
    var yoff = MG.layout.band.pebbleYOff;
    var peb = MG.layout.band.pebbles;
    for (var pi = 0; pi < peb.length; pi++) {
      ctx.beginPath(); ctx.arc(peb[pi][0], peb[pi][1] + yoff, peb[pi][2], 0, Math.PI * 2); ctx.fill();
    }
    drawStarfish(MG.layout.band.starfish.x, MG.layout.band.starfish.y + yoff, MG.layout.band.starfish.s);
    drawShell(MG.layout.band.shell.x, MG.layout.band.shell.y + yoff, MG.layout.band.shell.s);
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
    var g = grad('wback' + Math.round(wy / 4), function () {
      var gg = ctx.createLinearGradient(0, wy - tideAmp(), 0, FLOORY);
      gg.addColorStop(0, 'rgba(90,180,235,0.28)');
      gg.addColorStop(1, 'rgba(30,110,190,0.5)');
      return gg;
    });
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
    glow = Math.max(glow, dangerAlert * 0.95); // 越线判定进行中：警戒线强制进入红色警示态
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
    // 危险时两端亮起端点光珠（与警戒线同色的柔光圆点，外圈光晕+内核，随脉动呼吸，
    // 替代生硬的倒三角警示：融入光带本身，不再有突兀的几何形状）
    if (glow > 0.05) {
      var pa = (0.35 + glow * 0.55) * (0.7 + 0.3 * Math.sin(time * 4));
      for (var side = 0; side < 2; side++) {
        var ex2 = side ? C.W - 5 : 5;
        // 外圈柔晕（大而淡）
        ctx.fillStyle = cCore + (pa * 0.22) + ')';
        ctx.beginPath(); ctx.arc(ex2, C.dangerY, 10 + glow * 4, 0, Math.PI * 2); ctx.fill();
        // 中层过渡
        ctx.fillStyle = cCore + (pa * 0.4) + ')';
        ctx.beginPath(); ctx.arc(ex2, C.dangerY, 5.5, 0, Math.PI * 2); ctx.fill();
        // 内核亮点
        ctx.fillStyle = 'rgba(255,255,255,' + (pa * 0.85) + ')';
        ctx.beginPath(); ctx.arc(ex2, C.dangerY, 2.2 + glow * 1.2, 0, Math.PI * 2); ctx.fill();
      }
    }
    // 判定进行中：线上方居中倒计时提示（玩家能看懂"为什么快输了"）
    if (dangerAlert > 0.12) {
      ctx.textAlign = 'center';
      ctx.font = 'bold 15px system-ui, sans-serif';
      var wa = Math.min(1, dangerAlert * 1.5) * (0.65 + 0.35 * Math.sin(time * 8));
      ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(255,255,255,' + wa + ')';
      ctx.lineWidth = 3;
      ctx.strokeText('堆高越线', C.W / 2, C.dangerY - 14);
      ctx.fillStyle = 'rgba(196,48,42,' + wa + ')';
      ctx.fillText('堆高越线', C.W / 2, C.dangerY - 14);
    }
  }

  // ---------- 顶部 HUD（无背景板，悬浮文字 + 描边保证可读） ----------
  function drawHUD() {
    ctx.textAlign = 'left';
    ctx.lineJoin = 'round';
    // 第一组（左上）：成就奖杯图标 + 最高分 · 最远海域（历史信息退居角落，实时信息居中）
    var farIdx = 0;
    for (var fi = C.seaStages.length - 1; fi >= 0; fi--) {
      if (careerPeak >= C.seaStages[fi].at) { farIdx = fi; break; }
    }
    var chal = dchalHud();
    // 统计最佳结果：沿用原样式（14px/原描边/原色/超宽自适应缩字号），与成就殿堂按钮垂直居中对齐（cy36 → baseline41）
    ctx.font = '14px system-ui, sans-serif';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    var top1 = '最高 ' + best + ' · 最远 ' + C.seaStages[farIdx].name +
      (seaCount > 0 ? ' · 海域 ×' + seaCount : '') +
      (chal ? ' · 每日挑战 ' + Math.min(score, chal.goal) + '/' + chal.goal + (chal.done ? ' ✓' : '') : '') +
      (ng.active ? ' · 「' + ng.active.name + '」×' + ng.active.mult : '');
    var t1Font = 14;
    while (t1Font > 11 && ctx.measureText(top1).width > 272) { // 右端让位下一滴预览(x329 起)，不越界
      t1Font--;
      ctx.font = t1Font + 'px system-ui, sans-serif';
    }
    ctx.strokeText(top1, 48, MG.layout.hud.row1Y);
    ctx.fillStyle = chal && !chal.done ? '#7B6FD0' : (ng.active ? '#6B5AA8' : '#3E6E90');
    ctx.fillText(top1, 48, MG.layout.hud.row1Y);

    // 第二组（中轴）：当前得分居中 + 正下方海域进度条（分数涨→进度前进，垂直联动）
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

    // 右上角：计时（下一滴预览已移除——容器内虚影已直观展示下一滴，此处改回计时）
    // 与左侧统计行同排、与静音按钮(cy36)垂直居中对齐
    ctx.textAlign = 'center';
    ctx.lineJoin = 'round';
    // 计时沿用原样式（12px bold / #2E7DA8），与静音按钮(cy36)垂直居中对齐、与左侧统计行同排
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    var em = Math.floor(levelElapsed / 60), es = Math.floor(levelElapsed % 60);
    var etxt = '已进行 ' + em + ':' + (es < 10 ? '0' + es : es);
    ctx.strokeText(etxt, C.W - 78, MG.layout.hud.row1Y);
    ctx.fillStyle = '#2E7DA8';
    ctx.fillText(etxt, C.W - 78, MG.layout.hud.row1Y);

    // 静音按钮（右上角，小号）：局内与初始界面共用同一入口
    drawMuteBtn();
  }
  // 静音按钮（局内 HUD 与初始界面共用；坐标 MUTE.cx/cy 恒定，菜单态铺满时为同一屏幕位置）
  function drawMuteBtn() {
    drawMiniBtn(MUTE);
    ctx.save();
    ctx.translate(MUTE.cx, MUTE.cy);
    var ms = MUTE.r / 13 * 0.8;    // 图标随按钮半径等比缩放（按钮放大后图标同步放大）
    ctx.scale(ms, ms);
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
  // 潮汐信息胶囊（右侧，与任务条同行同高，左右对称）
  function drawTidePill() {
    var tp = MG.layout.hud.tidePill;
    var tx = tp.tx, tw = tp.tw, ty = tp.ty, th = tp.th; // 第三组：与任务条同高同排
    var active = tide.phase === 'active';
    var warn = !active && tide.timer <= C.tide.warnTime;
    var pulse = 0.5 + 0.5 * Math.sin(time * 6);
    ctx.fillStyle = active ? 'rgba(40,130,200,0.25)' : 'rgba(255,255,255,0.6)';
    roundRect(tx, ty, tw, th, 10); ctx.fill();
    ctx.font = 'bold 15px system-ui, sans-serif';
    if (active) {
      ctx.fillStyle = 'rgba(25,105,185,' + (0.75 + pulse * 0.25) + ')';
      ctx.fillText('涨潮 ' + Math.ceil(tide.timer) + 's', tx + tw / 2, ty + 22);
    } else {
      ctx.fillStyle = warn ? 'rgba(200,90,40,' + (0.7 + pulse * 0.3) + ')' : '#4A7FA0';
      ctx.fillText('潮汐 ' + Math.ceil(tide.timer) + 's', tx + tw / 2, ty + 22);
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
    ctx.translate(C.W / 2, MG.layout.hud.tideBannerY);
    ctx.scale(scale, scale);
    ctx.font = 'bold 43px system-ui, sans-serif';
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

  // ---------- 顶部中央计时：本局已进行时长 ----------
  // 成就殿堂入口按钮（🏆 奖杯，每日未全勤显红点）——局内刘海行（trophyBtn）与菜单态（menuTrophy）共用
  function drawTrophyBtn(btn) {
    btn = btn || trophyBtn;
    drawCircleBtn(btn, '#B8912F', 0.9, false, 0);
    var tx = btn.cx, ty = btn.cy;
    // 图标随按钮半径等比缩放（按钮放大后图标同步放大，不留空壳感）
    ctx.save();
    ctx.translate(tx, ty);
    var ts = btn.r / 14;
    ctx.scale(ts, ts);
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 1.8; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(-6, -8); ctx.lineTo(6, -8); ctx.lineTo(5, -1);
    ctx.quadraticCurveTo(0, 4, -5, -1);
    ctx.closePath(); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-6, -6); ctx.quadraticCurveTo(-10, -6, -8, -1);
    ctx.moveTo(6, -6); ctx.quadraticCurveTo(10, -6, 8, -1);
    ctx.moveTo(0, 3); ctx.lineTo(0, 6);
    ctx.moveTo(-4, 7); ctx.lineTo(4, 7);
    ctx.stroke();
    ctx.restore();
    ctx.lineCap = 'butt'; ctx.lineJoin = 'miter';
    if (!(daily.done[0] && daily.done[1] && daily.done[2])) {
      ctx.fillStyle = '#E2705E';
      ctx.beginPath(); ctx.arc(tx + btn.r - 3, ty - btn.r + 3, 3.4, 0, Math.PI * 2); ctx.fill();
    }
  }

  // 顶部计时已移除（休闲合成局内无时间压力，信息价值低于得分/进度）；
  // 每日挑战局的目标进度并入 HUD 第一组第二行（左上角，与最高分同组）

  // ---------- 重开确认弹窗 ----------
  function drawConfirm() {
    if (!confirmOpen) return;
    ctx.fillStyle = 'rgba(10,40,70,0.55)';
    ctx.fillRect(-BX, -renderOy, C.W + BX * 2, VH);
    var cr = MG.layout.confirmRect();
    var px = cr.x, py = cr.y, pw = cr.w, ph = cr.h;
    panel(px, py, pw, ph, 14, 0.97);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#155A8A';
    ctx.font = 'bold 23px system-ui, sans-serif';
    ctx.fillText('确定要重新开始吗？', C.W / 2, py + 42);
    ctx.font = '16px system-ui, sans-serif';
    ctx.fillStyle = '#4A7FA0';
    ctx.fillText('当前得分与局面将全部丢失', C.W / 2, py + 68);
    // 取消
    ctx.fillStyle = '#8AA5B8';
    roundRect(confirmNo.x, confirmNo.y, confirmNo.w, confirmNo.h, 10); ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 19px system-ui, sans-serif';
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

  // ---------- 任务条 + 潮汐胶囊 + 海域进度条 ----------
  function drawQuest() {
    if (!quest) return;
    ctx.save();
    ctx.textAlign = 'center';
    // 任务条：第三组左侧（两行：进度 + 星级/奖励，与任务难度匹配）
    var q = MG.layout.hud.quest;
    var qw = q.qw, qx = q.qx, qy = q.qy, qh = q.qh;
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    roundRect(qx, qy, qw, qh, 10); ctx.fill();
    var prog = Math.min(1, quest.have / quest.need);
    if (prog > 0) {
      ctx.fillStyle = 'rgba(245,197,66,0.35)';
      roundRect(qx + 2, qy + 2, Math.max(10, (qw - 4) * prog), qh - 4, 8); ctx.fill();
    }
    ctx.fillStyle = '#7A5B10';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillText(quest.text + ' ' + quest.have + '/' + quest.need, qx + qw / 2, qy + 14);
    ctx.fillStyle = '#B8860B';
    ctx.font = '13px system-ui, sans-serif';
    var stars = '★★★'.slice(0, quest.stars || 1);
    ctx.fillText(stars + ' · 完成 +' + quest.rewardScore + ' 分', qx + qw / 2, qy + 30);
    drawTidePill();
    drawSeaProgress();
    ctx.restore();
  }
  // 差额分精简：≥1万 缩写为「X万」（省字符，条内不挤）
  function fmtDiff(n) {
    if (n < 10000) return String(n);
    var w = n / 10000;
    return (w >= 10 ? Math.round(w) : Math.round(w * 10) / 10) + '万';
  }
  // 海域色作文字色：压暗 20% 保证 13px 小字在浅色条底上的对比度（浅色海域尤其需要）
  function seaTextColor(hex) {
    var n = parseInt(hex.slice(1), 16);
    var r = Math.round(((n >> 16) & 255) * 0.8), g = Math.round(((n >> 8) & 255) * 0.8), b = Math.round((n & 255) * 0.8);
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }
  // 海域进度条：宽松段（当前得分下方、任务条同排区之上；容器开口在条下方 EXTRA+26px）
  // 出生点在条下方，条不压坠落区），显示累计分距下一海域的进度
  // 配色：填充=当前海域深水色（与背景同族），右端小圆点=下一海域徽章色（目的地），左端骑线徽章=当前位置
  function drawSeaProgress() {
    var cur = seaStage(), ts = totalScore();
    var last = C.seaStages.length - 1;
    var maxed = cur >= last;
    var sb = MG.layout.hud.seaBar;
    var sx = sb.sx, sy = sb.sy, sw = sb.sw, sh = sb.sh; // 两侧各留 24：端点徽章(r10)不顶屏幕边界
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    roundRect(sx, sy, sw, sh, 8); ctx.fill();
    var frac = 1;
    if (!maxed) {
      var lo = C.seaStages[cur].at, hi = C.seaStages[cur + 1].at;
      frac = Math.min(1, Math.max(0.02, (ts - lo) / (hi - lo)));
    }
    if (frac > 0) {
      // 填充=当前海域的深水色（bg[3]，与当前背景同族不撞色）；目的地用右端下一海域色小圆点表达
      ctx.fillStyle = maxed ? SEA_BADGES[last].c : C.seaStages[cur].bg[3];
      ctx.globalAlpha = 0.85;
      roundRect(sx + 2, sy + 2, Math.max(10, (sw - 4) * frac), sh - 4, 6); ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    // 条内文字（精简）：「当前海域 → 下一海域 差额分」，海域名用各自海域色、连接语与数字统一深蓝
    var segs = maxed
      ? [[C.seaStages[last].name, seaTextColor(SEA_BADGES[last].c)], [' · 已达最深', '#2C5A78']]
      : [[C.seaStages[cur].name, seaTextColor(SEA_BADGES[cur].c)], [' → ', '#2C5A78'],
         [C.seaStages[cur + 1].name, seaTextColor(SEA_BADGES[cur + 1].c)],
         [' ' + fmtDiff(C.seaStages[cur + 1].at - ts) + ' 分', '#2C5A78']];
    var segsW = function () {
      var w = 0;
      for (var i = 0; i < segs.length; i++) w += ctx.measureText(segs[i][0]).width;
      return w;
    };
    // 超长自适应缩字号（后期海域名 + 大分数叠加，两端徽章之间不被文字挤占）
    var lf = 13;
    while (lf > 10 && segsW() > sw - 84) {
      lf--;
      ctx.font = 'bold ' + lf + 'px system-ui, sans-serif';
    }
    // 分段绘制（整体居中；描边保证在填充色上仍可读）
    ctx.save();
    ctx.textAlign = 'left';
    var x0 = sx + sw / 2 - segsW() / 2;
    for (var si = 0; si < segs.length; si++) {
      ctx.strokeText(segs[si][0], x0, sy + 15);
      ctx.fillStyle = segs[si][1];
      ctx.fillText(segs[si][0], x0, sy + 15);
      x0 += ctx.measureText(segs[si][0]).width;
    }
    ctx.restore();
    if (!maxed) {
      // 右端终点标记骑在条右端点上（不透明底遮挡条端），与左端当前位置徽章呼应
      drawSeaBadge(cur + 1, sx + sw, sy + sh / 2, false, true);
    }
    // 左端徽章骑在条左端点上——直观标注"当前位置"，并遮住条端
    drawSeaBadge(cur, sx, sy + sh / 2, true);
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
    // 道具区不画独立背景（用户要求去掉道具区下方的色块）：按钮直接坐在全屏背景水色上，
    // 无接缝、无突兀色块，任何分辨率观感一致。
    var readyPulse = 0.5 + 0.5 * Math.sin(time * 5);

    drawCircleBtn(bookBtn, '#4A7FA0', 1, false, readyPulse);
    var bx = bookBtn.cx, by = bookBtn.cy;
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 1.8;
    ctx.strokeRect(bx - 8, by - 6, 16, 12);
    ctx.beginPath(); ctx.moveTo(bx, by - 6); ctx.lineTo(bx, by + 6); ctx.stroke();

    // 成就页入口（🏆 奖杯，图鉴旁；每日未全勤显红点）
    drawTrophyBtn(trophyBtn);

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
      var unl = skillUnlocked(cfg.key); // 渐进解锁：未点亮只显示锁
      var ch = skillCharge[cfg.key], ready = unl && ch >= cfg.cost;
      drawCircleBtn(btn, unl ? (ready ? '#2E86B4' : '#5E90B4') : '#7E93A3', unl ? (ready ? 1 : 0.55) : 0.4, ready, readyPulse);
      if (!unl) {
        // 锁图标（小挂锁）
        ctx.strokeStyle = 'rgba(255,255,255,0.9)';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(btn.cx, btn.cy - 9, 4.5, Math.PI, 0); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        roundRect(btn.cx - 6.5, btn.cy - 9, 13, 10, 2); ctx.fill();
        ctx.fillStyle = 'rgba(230,242,248,0.75)';
        ctx.font = '10px system-ui, sans-serif';
        ctx.fillText('累计', btn.cx, btn.cy + 1); // 门槛分两行：整行放不下（会与相邻钮重叠）
        ctx.font = 'bold 11px system-ui, sans-serif';
        ctx.fillText(C.skillUnlock[cfg.key] + '分', btn.cx, btn.cy + 13);
      } else if (!ready) {
        ctx.strokeStyle = 'rgba(255,255,255,0.85)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(btn.cx, btn.cy, btn.r - 3, -Math.PI / 2, -Math.PI / 2 + (ch / cfg.cost) * Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.font = 'bold 13px system-ui, sans-serif';
        ctx.fillText(ch + '/' + cfg.cost, btn.cx, btn.cy + 13);
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.95)';
        ctx.font = 'bold 13px system-ui, sans-serif';
        ctx.fillText('就绪', btn.cx, btn.cy + 13);
      }
      if (unl) drawSkillIcon(cfg.key, btn.cx, btn.cy - 6, ready ? '#FFFFFF' : 'rgba(255,255,255,0.85)');
      if (unl && ((cfg.key === 'evap' && evapMode) || (cfg.key === 'ripple' && rippleMode) || (cfg.key === 'flow' && flowMode))) {
        ctx.strokeStyle = '#E24B4A'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(btn.cx, btn.cy, btn.r + 3, 0, Math.PI * 2); ctx.stroke();
      }
      // 名称标签：下移到圆钮外（文字顶不再压到道具圆钮）
      ctx.fillStyle = 'rgba(240,250,252,0.95)';
      ctx.font = '13px system-ui, sans-serif';
      ctx.fillText(cfg.name, btn.cx, btn.cy + btn.r + 12);
    }

    // 「深渊潜航」入口已移至结算页按钮组（局内不再挂悬浮钮）
  }
  // 二周目词缀三选一弹窗
  function drawNgPick() {
    ctx.fillStyle = 'rgba(10,40,70,0.66)';
    ctx.fillRect(-BX, -renderOy, C.W + BX * 2, VH);
    var nr = MG.layout.ngRect();
    var pw = nr.w, ph = nr.h, px = nr.x, py = nr.y;
    panel(px, py, pw, ph, 14, 0.97);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#5B4A94';
    ctx.font = 'bold 25px system-ui, sans-serif';
    ctx.fillText('深渊潜航', C.W / 2, py + 36);
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
      ctx.fillText('得分 ×' + af.mult, rect.x + rect.w - 16, rect.y + 26);
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
        ctx.font = 'bold 18px system-ui, sans-serif';
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
    ctx.fillRect(-BX, -renderOy, C.W + BX * 2, VH);
    ctx.strokeStyle = 'rgba(160,220,255,0.25)';
    ctx.lineWidth = 1.2;
    for (var i = 0; i < 8; i++) {
      var bx2 = 40 + i * 48 + Math.sin(time * 1.2 + i * 2.2) * 10;
      var by2 = (VH + 20) - ((time * 46 + i * 97) % (VH + 40));
      ctx.beginPath(); ctx.arc(bx2, by2, 3 + (i % 3), 0, Math.PI * 2); ctx.stroke();
    }
    // 漂流瓶（随水流轻摆）
    ctx.save();
    var bcy = MG.layout.panel.blockCy;
    ctx.translate(C.W / 2, bcy - 64);
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
    ctx.font = 'bold 25px system-ui, sans-serif';
    ctx.fillText('深海漂流瓶 · 激励视频', C.W / 2, bcy + 26);
    ctx.font = '18px system-ui, sans-serif';
    ctx.fillText(adOverlay.label + ' · ' + adOverlay.t.toFixed(1) + 's 后发放奖励', C.W / 2, bcy + 52);
    ctx.font = '14px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillText('（演示占位：上线微信时替换为 wx.createRewardedVideoAd）', C.W / 2, bcy + 78);
  }

  function drawOver() {
    buildOverButtons();
    ctx.fillStyle = 'rgba(10,40,70,0.55)';
    ctx.fillRect(-BX, -renderOy, C.W + BX * 2, VH);

    // 结算海报：面板加高放宽（436→472、上移至134），统计区与按钮组均拉开呼吸感
    // 几何走 layout.overRect()（锚定游戏区焦点，块高变化不漂流；渲染与命中共用）
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

    for (var i = 0; i < overButtons.length; i++) {
      var b = overButtons[i];
      if (b.variant === 'ng') { // 深渊潜航：紫色渐变（区别于普通按钮）
        var ngg = ctx.createLinearGradient(b.x, b.y, b.x, b.y + b.h);
        ngg.addColorStop(0, '#8A6FD0');
        ngg.addColorStop(1, '#6B5AA8');
        ctx.fillStyle = ngg;
      } else if (b.variant === 'locked') { // 未解锁：灰显预告
        ctx.fillStyle = '#C4D2DC';
      } else if (b.primary) {
        var g = ctx.createLinearGradient(b.x, b.y, b.x, b.y + b.h);
        g.addColorStop(0, '#3B9BD0');
        g.addColorStop(1, '#2578A8');
        ctx.fillStyle = g;
      } else {
        ctx.fillStyle = '#FFFFFF';
      }
      roundRect(b.x, b.y, b.w, b.h, 12); ctx.fill();
      ctx.strokeStyle = (b.primary || b.variant === 'ng') ? 'rgba(255,255,255,0.5)' : (b.variant === 'locked' ? '#9AB0C0' : '#2E86B4');
      ctx.lineWidth = 1.5;
      roundRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1, 12); ctx.stroke();
      ctx.fillStyle = b.variant === 'locked' ? '#5E7488' : ((b.primary || b.variant === 'ng') ? '#FFFFFF' : '#2E86B4');
      ctx.font = '19px system-ui, sans-serif';
      ctx.textBaseline = 'middle';
      ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2 + 1);
      ctx.textBaseline = 'alphabetic';
    }
  }

  // ---------- 首局主动引导（前 5 投分步提示，只出现一次） ----------
  function drawTutorial() {
    if (tutDone || state !== 'play' || adOverlay || dexOpen || confirmOpen) return;
    var step = Math.min(dropCount, TUT_STEPS.length - 1);
    var ty = MG.layout.body.tutY;
    var pulse = 0.5 + 0.5 * Math.sin(time * 4);
    ctx.save();
    ctx.textAlign = 'center';
    // 提示胶囊
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
    // 步骤圆点
    for (var i = 0; i < TUT_STEPS.length; i++) {
      ctx.fillStyle = i < dropCount ? '#2E86B4' : 'rgba(46,134,180,0.25)';
      ctx.beginPath(); ctx.arc(C.W / 2 - (TUT_STEPS.length - 1) * 7 + i * 14, ty + 36, 3.2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  // ---------- 开始界面 ----------
  function drawMenu() {
    // 环境气泡：缓慢上升（time 驱动，无实体）
    var i;
    for (i = 0; i < 9; i++) {
      var seed = i * 97;
      var bx = 30 + (seed % (C.W - 60));
      var by = VH + 40 - ((time * (14 + i * 3) + seed * 3) % (VH + 120));
      var br = 3 + (i % 4) * 2.4;
      ctx.beginPath();
      ctx.fillStyle = 'rgba(255,255,255,' + (0.05 + (i % 3) * 0.04).toFixed(2) + ')';
      ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.10)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    ctx.fillStyle = 'rgba(6,28,52,0.42)';
    // 菜单态 VH 已换为整屏逻辑高，遮罩直接盖满全屏（无接缝）
    ctx.fillRect(-BX, -renderOy, C.W + BX * 2, VH);

    ctx.textAlign = 'center';
    var pulse = 0.5 + 0.5 * Math.sin(time * 2.4);

    // 标题（双描层：暗色投影 + 白蓝渐变）
    var mu = MG.layout.menu;
    ctx.font = 'bold 46px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(10,40,70,0.55)';
    ctx.fillText('水滴合成深海', C.W / 2 + 2, mu.titleShadowY);
    var tg = ctx.createLinearGradient(0, 180, 0, 224);
    tg.addColorStop(0, '#FFFFFF');
    tg.addColorStop(1, '#BDE8FF');
    ctx.fillStyle = tg;
    ctx.fillText('水滴合成深海', C.W / 2, mu.titleY);
    ctx.font = '16px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(230,246,255,0.85)';
    ctx.fillText('合成大水滴 · 汇入无垠深海', C.W / 2, mu.subY);

    // 历史最佳
    if (best > 0) {
      ctx.font = '14px system-ui, sans-serif';
      ctx.fillStyle = 'rgba(230,246,255,0.6)';
      ctx.fillText('历史最佳 ' + best, C.W / 2, mu.bestY);
    }

    // 离线收益告知卡（有离线收益时显示，开局自动入账）
    drawOfflineCard();

    // 开始按钮（呼吸光圈 + 主色渐变）
    var b = menuStartBtn;
    ctx.save();
    ctx.strokeStyle = 'rgba(127,212,255,' + (0.22 + pulse * 0.28).toFixed(2) + ')';
    ctx.lineWidth = 3;
    roundRect(b.x - 6 - pulse * 3, b.y - 6 - pulse * 3, b.w + 12 + pulse * 6, b.h + 12 + pulse * 6, 18); ctx.stroke();
    ctx.restore();
    var g = ctx.createLinearGradient(b.x, b.y, b.x, b.y + b.h);
    g.addColorStop(0, '#3B9BD0');
    g.addColorStop(1, '#2578A8');
    ctx.fillStyle = g;
    roundRect(b.x, b.y, b.w, b.h, 14); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1.5;
    roundRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1, 14); ctx.stroke();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.textAlign = 'center'; // 显式声明：离线卡等前置绘制不得改变菜单按钮文字对齐
    ctx.textBaseline = 'middle';
    ctx.fillText('开 始 游 戏', C.W / 2, b.y + b.h / 2 + 1);
    ctx.textBaseline = 'alphabetic';

    // 底部玩法一句话
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(220,240,255,0.5)';
    ctx.fillText('投放水滴 · 同级相融合成 · 小心警戒线', C.W / 2, VH - MG.layout.menu.footDy);
  }

  // ---------- 主渲染 ----------
  function render() {
    // 背景：无偏移全屏变换铺满（刘海/手势条区域为海色延伸，正常区域对待）
    ctx.setTransform(dpr * view.s, 0, 0, dpr * view.s, 0, 0);
    drawBackground();

    // 内容层：游戏块（420×C.H，当前交付 9:18=840）垂直居中——所有态一致居中（oy=(VH-C.H)/2），
    // 高屏多余高度上下均分，块顶上方/块底下方由全屏背景渐变自然延展填充（无留白）。
    // transform y 偏移用 dpr*view.s*renderOy（renderOy 为逻辑 px，与 toLocal 的 -renderOy 同量纲，
    // 修早期漏乘 view.s 导致 view.s≠1 真机上偏移算少、游戏区偏上的问题）。
    renderOy = oy;
    ctx.setTransform(dpr * view.s, 0, 0, dpr * view.s, 0, dpr * view.s * renderOy);
    if (shakeT > 0) {
      var s = shakeAmp * (shakeT / 0.4);
      ctx.translate((Math.random() - 0.5) * 2 * s, (Math.random() - 0.5) * 2 * s);
    }

    // 游戏区（420 逻辑宽）水平居中：整体平移 BX，两侧为延伸海水
    ctx.save();
    ctx.translate(BX, 0);

    if (state === 'menu') {
      drawMenu();
      // 成就/音量按钮与局内同一屏幕位置：内容层已随 renderOy 居中，此处仅补胶囊残余量 hudInset
      ctx.save();
      ctx.translate(0, hudInset);
      drawTrophyBtn(menuTrophy);   // 成就殿堂/每日挑战入口（systems 菜单分支处理，命中区同步 +hudInset）
      drawMuteBtn();               // 初始界面右上角静音入口
      ctx.restore();
      if (achOpen) drawAchPanel(); // 面板盖在菜单之上（点击已放行到 achOpen 分支）
      ctx.restore(); return;
    } // 开始界面：背景之上画菜单 + 奖杯入口 + 音量入口 + 成就殿堂面板

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
      ctx.font = 'bold 19px system-ui, sans-serif';
      ctx.strokeStyle = 'rgba(10,40,70,0.6)';
      ctx.lineWidth = 4;
      ctx.strokeText('蒸发模式：点击要移除的水滴或礁石（再点按钮取消）', C.W / 2, 112);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText('蒸发模式：点击要移除的水滴或礁石（再点按钮取消）', C.W / 2, 112);
    }

    // 涟漪选位模式：显示波纹中心指示
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
      ctx.font = 'bold 19px system-ui, sans-serif';
      ctx.strokeStyle = 'rgba(10,40,70,0.6)';
      ctx.lineWidth = 4;
      ctx.strokeText('涟漪模式：点击选择波纹中心（再点按钮取消）', C.W / 2, 112);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText('涟漪模式：点击选择波纹中心（再点按钮取消）', C.W / 2, 112);
    }

    // 水流模式：已选水滴高亮 + 操作提示
    if (flowMode) {
      ctx.fillStyle = 'rgba(10,40,70,0.14)';
      ctx.fillRect(-BX, -renderOy, C.W + BX * 2, VH);
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
      ctx.font = 'bold 19px system-ui, sans-serif';
      ctx.strokeStyle = 'rgba(10,40,70,0.6)';
      ctx.lineWidth = 4;
      var flowHint = flowPick ? '水流模式：再点一枚水滴与之交换（点原滴取消）' : '水流模式：点选第一枚水滴';
      ctx.strokeText(flowHint, C.W / 2, 112);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(flowHint, C.W / 2, 112);
    }

    // 暗角（纵深）
    var vg = grad('vig' + Math.round(VH) + '_' + Math.round(BX), function () {
      var gg = ctx.createRadialGradient(C.W / 2, VH / 2, VH * 0.34, C.W / 2, VH / 2, VH * 0.74);
      gg.addColorStop(0, 'rgba(0,0,0,0)');
      gg.addColorStop(1, 'rgba(6,28,52,0.16)');
      return gg;
    });
    ctx.fillStyle = vg;
    ctx.fillRect(-BX, -renderOy, C.W + BX * 2, VH);

    // HUD 整体随胶囊避让下挪 hudInset：内容层已随 renderOy 垂直居中，hudInset 仅为「居中后
    // 仍在胶囊下缘之上」的残余量（fit 里算好：高屏居中即避开胶囊→0，矮屏才给 ≤24）；
    // HUD（分数/进度/任务/潮汐/涨潮横幅）统一 +hudInset 平移；奖杯走 drawSkillBar 非平移路径，
    // 其 cy 同步设为 36+hudInset 与静音同高对齐。
    trophyBtn.cy = MG.layout.hud.trophyCy + hudInset;   // 与静音(36+hudInset)同高（奖杯不参与本平移，故直接烤进坐标）
    if (hudInset > 0) { ctx.save(); ctx.translate(0, hudInset); }
    drawHUD();
    drawQuest();
    drawTideBanner();
    if (hudInset > 0) ctx.restore();
    drawGhostLabel(); // 最后绘制，保证特殊滴标签浮在最上层且紧贴虚影球
    drawPopups();     // 浮动文字最上层（礁石来袭/任务完成/得分等，不被 HUD 遮挡）
    drawSkillBar();
    drawConfirm();
    if (adOverlay) drawAdOverlay();
    if (state === 'over') drawOver();
    if (dexOpen) drawDex();
    else if (achOpen) drawAchPanel();
    if (ngOpen) drawNgPick();
    drawShare();

    ctx.restore();
  }

  // ---------- 文档图标渲染钩子（游戏说明/封面配图用） ----------
  // 在离屏 canvas 上用游戏本体绘制函数渲染图标，返回真透明底 PNG dataURL——
  // 保证文档图标与游戏内实际观感完全一致，且不受主画布 CSS 背景污染。
  MG.debug.iconData = function (kind, id, size) {
    size = size || 192;
    var cv = document.createElement('canvas');
    cv.width = size; cv.height = size;
    var old = ctx;
    ctx = cv.getContext('2d'); // 短暂接管模块画笔，绘制完立即归还
    ctx.save();
    ctx.translate(size / 2, size / 2);
    ctx.scale(size / 96, size / 96);
    if (kind === 'tier') {
      // 合成链水滴：标准球体 + 表情/波纹
      drawBall({ x: 0, y: 0, r: 30, tier: id, vx: 0, vy: 0 }, 1);
    } else if (kind === 'sp') {
      // 特殊滴：与图鉴 drawSpForm 同构（礁石/符文/冰晶特殊处理）
      var r = 26;
      if (id === 'iron') drawIronBall({ x: 0, y: 0, r: r, vx: 0, vy: 0 }, 1);
      else if (id === 'rune') drawBall({ x: 0, y: 0, r: r, tier: 1, vx: 0, vy: 0, rune: 'ripple' }, 1);
      else drawBall({ x: 0, y: 0, r: r, tier: 1, vx: 0, vy: 0, special: id, frozen: id === 'ice' ? 1 : 0 }, 1);
    } else if (kind === 'sea') {
      // 海域徽章：放大 2.4 倍
      ctx.scale(2.4, 2.4);
      drawSeaBadge(id, 0, 0, true);
    } else if (kind === 'skill') {
      // 技能图标：用技能条同款配色
      var col = id === 'swap' ? '#8E6FC0' : (id === 'ripple' ? '#2FA8A0' : (id === 'evap' ? '#E2705E' : '#3FA8B8'));
      ctx.scale(2.2, 2.2);
      drawSkillIcon(id, 0, 0, col);
    } else if (kind === 'chest') {
      // 宝箱
      ctx.scale(1.7, 1.7);
      drawChestIcon(0, 0, 1);
    } else if (kind === 'ng') {
      // 深渊潜航：紫罗兰渐变胶囊（与结算页按钮同风格）
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
// ===== js/main.js =====
// 水滴合成深海 - main：主循环与启动（模块加载顺序 4/4，最后加载；rAF 从这里起转）
// 主循环修复：原 frame() 中 update 被无条件调用一次、非 headless 又调一次，
// 导致浏览器每帧跑两遍 update（实际 2 倍速），模拟器也被 rAF 干扰。现统一为：
// headless 完全由 MG.debug.step() 驱动（rAF 空转），正常模式每帧 update+render 各一次。
var last = 0;
function frame(ts) {
  requestAnimationFrame(frame);
  if (MG.debug.headless) return; // 模拟器模式：完全由 step() 驱动，rAF 空转
  if (!last) last = ts;
  var dt = Math.min((ts - last) / 1000, 1 / 30);
  last = ts;
  update(dt);
  render();
}

makeQuest(0);
requestAnimationFrame(frame);

