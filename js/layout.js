window.MG = window.MG || {};
MG.layout = {
  hud: null, body: null, band: null, panel: null, menu: null,
  dy: 0,

  build: function () {
    var C = MG.config, W = C.W, H = C.H;
    var dy = H - 840;
    this.dy = dy;
    C.floorY = H - 75;
    C.containerTop = 0;
    C.dangerY = 315 + dy;
    C.spawnY = 260 + dy;

    this.hud = {
      row1Y: 40,
      trophyCy: 35,
      setCx: 25,
      rowBtnR: 18,
      scoreY: 85,
      seaBar: { sx: 25, sy: 98, sw: W - 50, sh: 24 },
      quest: { qx: 15, qy: 125, qw: 285, qh: 60 },
      tidePill: { side: 'right', margin: 25, ty: 135, th: 44 },
      hudBottom: 190
    };

    this.body = {
      containerTop: C.containerTop,
      dangerY: C.dangerY,
      floorY: C.floorY,
      spawnY: C.spawnY,
      spawnGap: C.dangerY - C.spawnY,
      mirrorCy: C.dangerY + (C.dangerY - C.spawnY),
      stackCy: (C.dangerY + C.floorY) / 2,
      tutY: 535 + dy
    };

    var btnCx = [], bi;
    for (bi = 0; bi < 6; bi++) btnCx.push(35 + bi * (W - 70) / 5);
    this.band = {
      top: C.floorY,
      h: H - C.floorY,
      btnCy: C.floorY + 30,
      btnCx: btnCx,
      btnR: 20,
      labelDy: 10,
      decorBase: C.floorY + 20,
      dunes: [
        { x: 85,  dy: 10, rx: 95,  ry: 15, c: 'rgba(238,246,240,0.7)', c0: 'rgba(238,246,240,0)' },
        { x: 315, dy: 15, rx: 115, ry: 15, c: 'rgba(238,246,240,0.7)', c0: 'rgba(238,246,240,0)' },
        { x: 195, dy: 20, rx: 85,  ry: 10, c: 'rgba(228,240,234,0.55)', c0: 'rgba(228,240,234,0)' }
      ],
      pebbleYOff: (C.floorY + 20) - 665,
      pebbles: [[25, 685, 2.5], [65, 700, 2.5], [110, 685, 2.5], [170, 700, 2.5],
                [245, 690, 2.5], [305, 700, 2.5], [350, 685, 2.5], [405, 695, 2.5]],
      starfish: { x: 90, y: 700, s: 10 },
      shell: { x: 330, y: 700, s: 10 }
    };

    this.panel = {
      focusCy: 465 + dy,
      over: { w: 320, h: 470 },
      share: { w: 300, h: 420 },
      confirm: { w: 300, h: 224, btnH: 42, btnGap: 12, btnTop: 54 },
      ng: { w: 330, h: 350 },
      dex: { x: 20, w: 380, h: 600 },
      dexY: 120 + dy,
      set: { w: 300, h: 260, rowDy: 50, rowGap: 66, rowH: 56, rowW: 260 },
      setClear: { w: 300, h: 180, btnH: 42, btnGap: 12, btnTop: 108 }
    };

    this.menu = {
      titleY: 130 + dy, subY: 148 + dy,
      tileW: 64, tileH: 64,
      tileLX: 55, tileRX: 365,
      tileTop: 246 + dy, tileGap: 78,
      mascotCy: 430 + dy,
      offlineY: 565 + dy, offlineW: 300, offlineH: 80,
      startY: 690 + dy, startW: 260, startH: 65
    };
  },

  menuTileRect: function (side, i) {
    var m = this.menu;
    var cx = side === 'L' ? m.tileLX : m.tileRX;
    return { x: cx - m.tileW / 2, y: m.tileTop + i * m.tileGap, w: m.tileW, h: m.tileH };
  },

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
    return { x: (W - p.w) / 2, y: (840 - p.h) / 2 + this.dy, w: p.w, h: p.h };
  },
  confirmBtnRect: function (i) {
    var r = this.confirmRect(), p = this.panel.confirm;
    return { x: r.x + 24, y: r.y + p.btnTop + i * (p.btnH + p.btnGap), w: r.w - 48, h: p.btnH };
  },
  confirmCloseRect: function () {
    var r = this.confirmRect();
    return { x: r.x + r.w - 40, y: r.y + 8, w: 30, h: 30 };
  },
  setRect: function () {
    var p = this.panel.set, W = MG.config.W;
    return { x: (W - p.w) / 2, y: (840 - p.h) / 2 + this.dy, w: p.w, h: p.h };
  },
  setRowRect: function (i) {
    var r = this.setRect(), p = this.panel.set;
    return { x: r.x + 20, y: r.y + p.rowDy + i * p.rowGap, w: p.rowW, h: p.rowH };
  },
  setCloseRect: function () {
    var r = this.setRect();
    return { x: r.x + r.w - 40, y: r.y + 8, w: 30, h: 30 };
  },
  setClearRect: function () {
    var p = this.panel.setClear, W = MG.config.W;
    return { x: (W - p.w) / 2, y: (840 - p.h) / 2 + this.dy, w: p.w, h: p.h };
  },
  setClearBtnRect: function (i) {
    var r = this.setClearRect(), p = this.panel.setClear;
    var bw = (r.w - 48 - p.btnGap) / 2;
    return { x: r.x + 24 + i * (bw + p.btnGap), y: r.y + p.btnTop, w: bw, h: p.btnH };
  },
  setClearCloseRect: function () {
    var r = this.setClearRect();
    return { x: r.x + r.w - 40, y: r.y + 8, w: 30, h: 30 };
  },
  ngRect: function () {
    var p = this.panel.ng, W = MG.config.W;
    return { x: (W - p.w) / 2, y: (840 - p.h) / 2 + this.dy, w: p.w, h: p.h };
  },
};
MG.layout.build();
