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
//   HUD 钉块顶（0~164）不动；容器/底部带/面板/菜单
//   = 9:16 基准值 + EXTRA 整体下移；底部带高度恒 74。
//   EXTRA = C.H - 747（9:16 基准块高）：9:18(840) → +93；8:18(945) → +198；H=747 → 0（逐像素等于 v171 定版）。
//   ★ v178 附加：警戒线/坠落高度 = 基准 + EXTRA + DANGER_SHIFT(20)（用户："警戒线和坠落区高度增加20"）。
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
    // ★ v178 用户要求：警戒线与坠落高度在基准上再下移 20px（绝对调整量，与比例无关；
    //   堆叠空间相应 419→399，容器/底部带不动）
    var DANGER_SHIFT = 20;
    this.extra = EXTRA;
    this.dangerShift = DANGER_SHIFT; // 暴露：供公告带等"锚警戒线但不随其调整漂移"的组件剥离
    // 同步真源给物理引擎（每帧读 C.*）：容器/警戒线/容器底随 EXTRA 下移，容器高恒 483
    C.containerTop = 190 + EXTRA;      // 容器开口（+EXTRA 下移）
    C.dangerY = 254 + EXTRA + DANGER_SHIFT; // 警戒线（+EXTRA+DANGER_SHIFT 下移）
    C.floorY = 673 + EXTRA;            // 容器底（+EXTRA 下移）
    // 坠落高度 = 最大可投放水滴（tiers 前 5 档中的溪流 r45）底部接触警戒线时的球心位置（公式派生，禁写死）
    C.spawnY = C.dangerY - C.tiers[4].r; // (254+EXTRA+20) - 45 = 209+EXTRA+20

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

    // ---- ② 容器区（核心游戏几何：用户定版；随 EXTRA+DANGER_SHIFT 整体下移，容器 483 高不变）----
    this.body = {
      containerTop: C.containerTop,     // 190+EXTRA 容器开口
      dangerY: C.dangerY,               // 254+EXTRA+20 警戒线（v178 下移 20）
      floorY: C.floorY,                 // 673+EXTRA 容器底
      spawnY: C.spawnY,                 // 209+EXTRA+20 坠落高度（公式派生，禁写死）
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
