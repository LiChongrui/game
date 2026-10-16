// 滴水成海 - 极简圆形物理引擎
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

          var overlap = minD - dist - C.slop;
          if (overlap <= 0) continue;

          // 质量 ∝ 面积（b.m 为自定义质量，铁块等障碍用）
          var ma = a.m || a.r * a.r, mo = o.m || o.r * o.r;
          var invA = 1 / ma, invO = 1 / mo, invSum = invA + invO;

          // 位置修正（按反质量分配）
          var corr = overlap / invSum * 0.8;
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
