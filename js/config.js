// 水滴成海 - 全局配置
// 9 级合成链：雾泡 → 水滴 → 露珠 → 浪花 → 溪流 → 湖泊 → 江河 → 大海 → 沧海
window.MG = window.MG || {};
MG.config = {
  // 逻辑分辨率（画布固定，CSS 等比缩放）
  W: 420,
  H: 720,
  floorY: 646,         // 容器底 y（下方保留技能栏区域）

  // 容器
  wall: 0,             // 侧墙厚（0 = 无边框，水滴铺满画布全宽）
  containerTop: 118,   // 容器顶部开口 y
  dangerY: 182,        // 危险线 y（堆积超过此线且静止即失败）

  // 投放
  spawnY: 120,         // 出生点 y（整体在顶部 HUD 之下，最大档水滴也不遮挡任务区）
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
  dangerTime: 1.6,     // 越线静止持续多久判负
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
  skillUnlock: { swap: 0, ripple: 600, evap: 1600, flow: 3000 },

  // 二周目「深渊回响」：达成最深海域后解锁，选一条海况词缀开高危高收益的无尽局
  ng: {
    unlockScore: 20000,                 // 解锁门槛（= 午夜深渊）
    affixes: [
      { id: 'heavy', name: '重压之海', desc: '重力 +25%',        grav: 1.25, mult: 1.5 },
      { id: 'storm', name: '疾风骤雨', desc: '潮汐间隔 -40%',    tideInt: 0.6, mult: 1.6 },
      { id: 'reef',  name: '暗礁密布', desc: '礁石概率 ×2',      ironX: 2,   mult: 1.5 },
      { id: 'frost', name: '冰封之海', desc: '水滴 15% 落水即冻', ice: 0.15,  mult: 1.4 }
    ]
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

  // 关卡：第 1 关限时得分（低难度：无礁石、无潮汐），过关弹出提示后直接进入无尽模式（不清场、不重置）
  level1: {
    target: 500,         // 目标分数
    time: 120,           // 限时（秒）
    timeBonusPerSec: 5   // 过关时间奖励（每剩余 1 秒 +5 分）
  },

  // 图鉴积分门槛：累计得分（跨局）达到后才解锁该级图鉴（0 = 无门槛，前 5 级免费）
  dexGate: [0, 0, 0, 0, 0, 300, 1000, 3500, 10000],

  // 潮汐系统（周期性涨潮：水滴受浮力上浮重排）
  tide: {
    firstDelay: 18,      // 首次涨潮倒计时（给新手留学习时间）
    cycleInterval: 26,   // 两次涨潮间隔
    duration: 7,         // 涨潮持续
    waterMax: 0.62,      // 最高水位占容器高度比例
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
    minutes: 20,         // 达到满强度所需分钟数
    tideIntervalMin: 18, // 潮汐间隔下限（秒）
    ironChanceMax: 0.14, // 礁石概率上限
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

  // 海域演进：累计得分（跨局）里程碑改变世界（背景色调/称号）
  seaStages: [
    { at: 0,     name: '潮汐池', bg: ['#D8F1FD', '#B8E4F8', '#97CDEB', '#7CB6DE'], shade: 'rgba(16,56,96,0.26)' },
    { at: 3000,  name: '珊瑚浅海', bg: ['#D2F3EC', '#AEE9DE', '#84CEC8', '#5FA9B4'], shade: 'rgba(12,64,78,0.26)' },
    { at: 9000,  name: '蔚蓝深海', bg: ['#C4E9F6', '#93CCEC', '#5FA3D4', '#3A7BB4'], shade: 'rgba(10,40,90,0.30)' },
    { at: 20000, name: '午夜深渊', bg: ['#9FC4E8', '#6C9CD0', '#4470AC', '#28488A'], shade: 'rgba(6,22,60,0.34)' }
  ],

  // 随机出生池（只出前 5 级，权重）
  spawnWeights: [30, 26, 22, 14, 8],

  // 合成链（色相从浅青向深海靛蓝递进，拉开等级辨识度）
  tiers: [
    { name: '雾泡', r: 15, color: '#D9F2FB', dark: '#9CCDE3', score: 1 },
    { name: '水滴', r: 21, color: '#AEE0F4', dark: '#6FB3D6', score: 3 },
    { name: '露珠', r: 28, color: '#7FD6E8', dark: '#3F9DBE', score: 6 },
    { name: '浪花', r: 36, color: '#54BCE2', dark: '#2783B2', score: 10 },
    { name: '溪流', r: 45, color: '#3B9FD9', dark: '#1C669C', score: 15 },
    { name: '湖泊', r: 55, color: '#3480C8', dark: '#17497E', score: 21 },
    { name: '江河', r: 66, color: '#2C62B0', dark: '#143868', score: 29 },
    { name: '大海', r: 78, color: '#22499A', dark: '#0E2557', score: 38 },
    { name: '沧海', r: 92, color: '#1B2F6E', dark: '#0A1538', score: 50 }
  ]
};
