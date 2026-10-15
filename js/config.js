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

  // 里程碑任务链
  questScoreBase: 35,
  questScoreStep: 22,

  // 海域图鉴 & 汇入海域
  dexBonusMult: 10,
  seaBonus: 300,
  seaMultStep: 0.25,

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
