// 水滴合成深海 - layout：布局几何唯一真源
// 模块加载顺序 1.5/4（config 之后、physics 之前）。经典 script 共享全局作用域，
// 本文件只依赖 MG.config；core/systems/panels/render 运行期经全局作用域解析引用。
//
// ★ 设计目标（v175）：改屏幕比例只改 config 的 C.H 一处，全游戏元素位置自动重排。
// 一切坐标从「基础几何」经公式派生，分四层：
//   ① hud   顶部信息区（0~hudBottom）：★ 按顶部定位——钉块顶，绝对定版，块高变化不动（v183）
//   ② body  容器区（containerTop~floorY）：★ 按底部定位——= 9:18 定版基准 + dy（v183）
//   ③ band  底部带（floorY~H）：高度恒 74 贴块底；内部（按钮/装饰）钉 floorY 相对位
//   ④ panel 全屏面板：同样按底部定位（= 9:18 定版基准 + dy），不漂流
//   菜单（开始界面）：按底部定位（= 9:18 定版基准 + dy）
//
// ★ 定位语义（v183 用户定版，覆盖 v175~v182 的 EXTRA 分配方案）：
//   "HUD 部分按照顶部定位，其他的按照底部定位，弹性空间不需要设置，有多少是多少。"
//   HUD 钉块顶（0~164）；其余一切 = 9:18 定版基准值 + dy，随块底整体平移；
//   HUD 底与容器顶之间的空隙 = 79 + dy，自然伸缩，不再显式分配。
// ★★ 容器顶不设置（v184 用户定版："容器到HUD顶部，直接到窗口最大位置即可，
//   相当于不设置容器顶；堆叠空间没必要，堆叠区从堆叠底部开始，高度上限不需要设置"）：
//   containerTop = 0——容器从块顶开始长；失败线 dangerY 直接钉绝对基准
//   （387+dy，含 v178/v181 两次+40），"堆叠空间"退为派生量（floorY-dangerY=379 自动守恒），
//   不再是反推参数。dy = C.H - 840（9:18 定版基准块高）：H=840 → 0（= 当前交付逐像素一致）；
//   改比例只改 C.H，HUD 不动、其余全部 +dy。
//   约束：H ≥ 761（容器顶 243+dy 不侵入 HUD 底 164；当前 9:18=840 满足）。
// 适配策略（view.s / oy / renderOy / hudInset）由 core.fit() 每帧重算，见其注释。
//
// ★ 使用规范：绘制与命中热区一律引用 MG.layout.xxx，禁止再写死坐标数字；
//   config 改 C.H 后无需改任何其他文件（fit() 每次 resize 会调 build() 重算）。
window.MG = window.MG || {};
MG.layout = {
  hud: null, body: null, band: null, panel: null, menu: null,
  dy: 0,        // 当前块高相对 9:18 定版基准的底部平移量（= C.H - 840），供探针/调试输出

  // 由基础几何重建全部派生坐标（幂等；config 被外部改动后调用即可同步）
  build: function () {
    var C = MG.config, W = C.W, H = C.H;
    // ★★ 容器顶不设置（v184 用户定版）：containerTop = 0，容器从块顶开始长；
    //   失败线 dangerY 直接钉绝对基准（317+dy，v188 用户"单独给警戒线往下移10"——
    //   在 v187 的 307 基础上下移 10，其余不动），
    //   "堆叠空间"不再作为反推参数——它只是派生量 floorY - dangerY = 449，自动守恒。
    var dy = H - 840;                  // 9:18 定版基准块高 840；H=840 → 0
    this.dy = dy;
    C.floorY = H - 74;                 // 766（9:18）：容器底 = 块底 - 底部带 74
    C.containerTop = 0;                // 容器顶不设置（v184）：容器从块顶（窗口最大位置）开始长
    C.dangerY = 317 + dy;              // 317（9:18）：失败线绝对基准（v187 的 307 下移 10，v188）
    // 坠落高度 = 最大可投放水滴（tiers 前 5 档中的溪流 r45）底部接触警戒线时的球心位置（公式派生，禁写死）
    C.spawnY = C.dangerY - C.tiers[4].r; // 317-45 = 272（9:18；公式自动跟随警戒线的+10）

    // ---- ① 顶部 HUD 区（v149/v161 定版行位；★ 钉块顶，块高变化时本区不动）----
    this.hud = {
      row1Y: 41,               // 统计最佳结果 / 计时 baseline（与奖杯·静音 cy36 垂直居中对齐同排）
      trophyCy: 36,            // 奖杯 / 静音 / 菜单奖杯圆心（+hudInset 避让胶囊）
      trophyCx: 24, muteCx: W - 24,
      scoreY: 88,              // 当前得分 baseline（translate 锚点）
      seaBar: { sx: 24, sy: 100, sw: W - 48, sh: 20 }, // 海域进度条（v151 定版 100~120）
      quest: { qx: 12, qy: 130, qw: 206, qh: 34 },     // 任务条（v149 定版 130~164）
      tidePill: { tx: W - 122, ty: 130, tw: 92, th: 34 }, // 潮汐胶囊（与任务条同高同排）
      hudBottom: 164           // HUD 区底沿（任务条底）；容器顶=0（v184），HUD 直接浮在容器上
    };

    // ---- ② 容器区（核心游戏几何：底部锚定，随 dy 整体平移；容器顶不设置=0，v184）----
    this.body = {
      containerTop: C.containerTop,     // 0：容器顶不设置（容器从块顶开始长，v184 用户定版）
      dangerY: C.dangerY,               // 317+dy 警戒线（绝对基准，v188 下移 10）
      floorY: C.floorY,                 // 766+dy 容器底
      spawnY: C.spawnY,                 // 272+dy 坠落高度（公式派生，禁写死；随警戒线联动）
      stackCy: (C.dangerY + C.floorY) / 2, // 541.5+dy 堆叠空间中心（v188：弹出提示默认锚点）
      tutY: 573 + dy                    // 首局引导胶囊锚点（容器中部，随底部锚定链平移）
    };

    // ---- ③ 底部带（floorY~H：高度恒 74 贴块底，内部钉 floorY 相对位，绝不打散）----
    this.band = {
      top: C.floorY,
      h: H - C.floorY,                  // 恒 74（底部带固定不变，v177 用户定版）
      btnCy: C.floorY + 28,             // 794+dy：底部一排按钮圆心（v163 铁律：与容器底恒距 28）
      labelDy: 12,                      // 按钮名称标签：圆心 + r + 12
      decorBase: C.floorY + 18,         // 784+dy：底部装饰基准线（床面玻璃横条底 FH12 + 6）
      dunes: [                          // 三块沙丘（径向渐变柔边）：相对容器底固定，随 dy 平移不重排
        { xr: 0.20, dy: 12, rx: 95,  ry: 13, c: 'rgba(238,246,240,0.7)', c0: 'rgba(238,246,240,0)' },
        { xr: 0.74, dy: 14, rx: 115, ry: 15, c: 'rgba(238,246,240,0.7)', c0: 'rgba(238,246,240,0)' },
        { xr: 0.47, dy: 18, rx: 85,  ry: 11, c: 'rgba(228,240,234,0.55)', c0: 'rgba(228,240,234,0)' }
      ],
      pebbleYOff: (C.floorY + 18) - 664, // 卵石/海星/扇贝基准随 dy 平移（v136 时代 FLOORY=646 定版位）
      pebbles: [[24, 688, 3], [66, 700, 2], [112, 686, 2.5], [172, 702, 2],
                [246, 690, 2.5], [306, 700, 2], [352, 686, 2.5], [404, 696, 2.2]],
      starfish: { x: 88, y: 700, s: 9 },
      shell: { x: 330, y: 702, s: 9 }
    };

    // ---- ④ 全屏面板（底部锚定：= 9:18 定版基准 + dy，随块底平移不漂流）----
    this.panel = {
      focusCy: 463 + dy,              // 游戏区焦点中心（9:18 定版 463：结算海报 py227/h472 与分享卡 py253/h420 的共同中心）
      over: { w: 320, h: 472 },       // 结算海报（v161 排版放松定版；py = focusCy - 236 = 227+dy）
      share: { w: 300, h: 420 },      // 战报分享卡（py = focusCy - 210 = 253+dy）
      confirm: { w: W - 120, h: 170, dy: 393 + dy, btnDy: 102 }, // 重开确认（py393+dy；按钮 py+102）
      ng: { w: 330, h: 348 },         // 深渊潜航词缀三选一（底部锚定，y = 246+dy）
      dex: { x: 20, w: 380, h: 560 }, // 图鉴/成就（局内 y 由 dexY 派生；菜单态按全屏 VH 居中）
      dexY: 140 + dy                  // 图鉴局内 y（9:18 定版 140 = (840-560)/2，随底部锚定链平移）
    };

    // ---- 菜单（开始界面：底部锚定，= 9:18 定版基准 + dy）----
    this.menu = {
      titleY: 311 + dy, titleShadowY: 313 + dy, subY: 345 + dy, bestY: 387 + dy,
      offlineY: 409 + dy, offlineW: 300, offlineH: 62,
      startY: 489 + dy, startW: 220, startH: 60,
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
    return { x: (W - p.w) / 2, y: (840 - p.h) / 2 + this.dy, w: p.w, h: p.h };
  }
};
MG.layout.build();
