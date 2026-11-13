window.MG = window.MG || {};
MG.config = {
  W: 420,
  H: 840,
  floorY: 675,

  wall: 0,
  containerTop: 0,
  dangerY: 315,

  spawnY: 260,
  dropCooldown: 0.55,

  gravity: 1500,
  restitution: 0.12,
  friction: 0.10,
  dampPerStep: 0.9995,
  maxSpeed: 1500,
  substeps: 8,
  slop: 0.5,

  dangerTime: 3,
  dangerSpeed: 80,
  graceTime: 0.6,
  extGrace: 1.2,
  dangerWarnH: 120,

  comboWindow: 1.1,
  comboMaxMult: 4,
  rainCombo: 3,

  skills: [
    { key: 'swap',   name: '换滴', cost: 1 },
    { key: 'ripple', name: '涟漪', cost: 1 },
    { key: 'evap',   name: '蒸发', cost: 1 },
    { key: 'flow',   name: '水流', cost: 1 }
  ],

  ng: {
    unlockScore: 0,
    affixes: [
      { id: 'heavy', name: '重压深潜', desc: '重力 +80%',        grav: 1.8 },
      { id: 'storm', name: '疾风骤雨', desc: '潮汐间隔 -65%',    tideInt: 0.35 },
      { id: 'reef',  name: '暗礁密布', desc: '礁石概率 ×4',    ironX: 4 },
      { id: 'frost', name: '寒冰速冻', desc: '水滴 35% 落水即冻', ice: 0.35 }
    ]
  },

  dailyChal: {
    goalBestRatio: 0.35,
    goalMin: 3000,
    rewardBase: 1800,
    rewardStep: 200,
    rewardMax: 3200,
    charge: 1
  },

  offline: {
    minMins: 3,
    capMins: 480,
    perMinBase: 30,
    bestRatio: 0.0004
  },

  ripple: {
    power: 300,
    secondPower: 190,
    radius: 460,
    delay: 0.28,
    lift: 90
  },

  specialChance: 0.15,
  specialChanceMax: 0.34,
  specialStageBoost: 0.5,
  rune: {
    chance: 0.05,
    weights: { swap: 0.28, ripple: 0.24, evap: 0.20, flow: 0.28 }
  },
  skillMaxQ: 5,
  guideLen: 170,
  vortex: {
    pullR: 190,
    pullF: 430,
    delay: 0.35,
    life: 1.6,
    score: 8
  },
  cloud: {
    splitDelay: 0.55,
    minSplit: 2,
    maxSplit: 3,
    maxTier: 2,
    score: 2
  },
  ice: {
    freezeTime: 4.5,
    radiusFactor: 2.4,
    score: 5
  },
  iron: {
    chance: 0.05,
    maxActive: 5,
    cooldownDrops: 5,
    r: 34,
    massMult: 16,
    evaporateScore: 0,
    evapCost: 2,
    hp: 4.0,
    erodeScore: 0,
    pairScore: 15,
    tideNeed: 0.15,
    taxPer: 0.06,
    taxMax: 0.30,
    blastR: 90,
    blastShockR: 230,
    blastShockF: 950,
    gambleShockR: 180,
    gambleShockF: 620
  },

  combo: {
    siphonR: 160,
    siphonF: 25,
    iceR: 95
  },

  dexGate: [0, 0, 0, 0, 0, 500, 3000, 10000, 30000],
  spawnGate: [0, 0, 0, 800, 2500],
  specialStage: {
    rune: 0, chest: 0,
    iron: 1, cloud: 1,
    ice: 2, vortex: 2,
    rainbow: 3, gale: 3,
    magnet: 4, spring: 4,
    thunder: 5, pearl: 5,
    magma: 6, geyser: 6,
    void: 7, aurora: 7
  },
  magnet:   { delay: 0.4, life: 1.8, pullR: 250, pullF: 620, score: 150 },
  magmaR: 95, magmaScore: 70,
  geyserW: 120, geyserF: 400,
  voidN: 5, voidScore: 90,
  auroraMult: 3,

    tide: {
    cycleInterval: 42,
    duration: 7,
    durationMax: 9,
    buoyancy: 4000,
    lowFrac: 0.25,
    highFrac: 0.75,
    warnTime: 3
  },

  tideBless: {
    chance: 0.4,
    minDrops: 4
  },

  seaEvent: {
    interval: 26,
    jitter: 4,
    blessAfterCrisis: true
  },

  ramp: {
    minutes: 14,
    tideIntervalMin: 16,
    ironChanceMax: 0.11,
    spawnWeightsMax: [22, 24, 22, 16, 16]
  },

  climaxEvery: 1500,

  questScoreBase: 35,
  questScoreStep: 22,

  dexBonusMult: 10,
  seaBonus: 300,
  seaMultStep: 0.25,

  multCap: 8,

  daily: {
    rewardScore: 150,
    streakBase: 100,
    streakStep: 50
  },

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

  spawnWeights: [30, 26, 22, 14, 8],

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
  ],

  ad: {
    bannerId: '',
    rewardId: '',
    interstitialId: '',
    minBandPx: 90,
    interstitialEvery: 3
  }
};
