// 水滴合成深海 - 全局配置
// 9 级合成链：雾泡 → 水滴 → 露珠 → 浪花 → 溪流 → 湖泊 → 江河 → 大海 → 沧海
window.MG = window.MG || {};
MG.config = {
  // 逻辑分辨率（画布固定，CSS 等比缩放）
  W: 420,
  H: 747,              // 9:16（420×16/9≈746.7，取 747，偏差 0.04%）
  floorY: 673,         // 容器底 y（下方保留技能栏区域）

  // 容器（适度压缩给顶部宽松：开口 190、容器 190~673 = 483px；顶部 HUD 区扩至 0~164，
  // 三组（统计/得分+进度条/任务+潮汐）行距舒适，开口上方留 26px 空隙带供水滴出生/虚影悬停）
  wall: 0,             // 侧墙厚（0 = 无边框，水滴铺满画布全宽）
  containerTop: 190,   // 容器顶部开口 y（容器 190~673 = 483px）
  dangerY: 254,        // 危险线 y（堆积超过此线且静止即失败；堆叠空间 254~673 = 419px）

  // 投放
  // 投放：坠落高度 = 最大可投放水滴底部接触警戒线时的球心位置（dangerY254 - 溪流 r45 = 209）
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
