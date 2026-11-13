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
  var _panelFx = {};
  function _fxOutBack(t) { var c1 = 1.70158, c3 = c1 + 1, p = t - 1; return 1 + c3 * p * p * p + c1 * p * p; }
  function _fxInBack(t) { var c1 = 1.70158, c3 = c1 + 1; return c3 * t * t * t - c1 * t * t; }
  function panelFxK(name, open) {
    var now = performance.now() / 1000;
    var a = _panelFx[name];
    if (!a) { a = _panelFx[name] = { open: open, t0: now }; }
    else if (a.open !== open) { a.open = open; a.t0 = now; }
    var t = (now - a.t0) / (open ? 0.34 : 0.28);
    if (open) return t >= 1 ? 1 : _fxOutBack(t);
    if (t >= 1) { delete _panelFx[name]; return 0; }
    return 1 - _fxInBack(t);
  }
  function panelFxAlive(name) { return !!_panelFx[name]; }
  function drawPanelFx(name, open, cx, cy, dimA, fn) {
    var k = panelFxK(name, open);
    if (k <= 0) return;
    if (dimA > 0) {
      ctx.save();
      ctx.globalAlpha *= Math.max(0, Math.min(1, k * 5));
      ctx.fillStyle = 'rgba(10,40,70,' + dimA + ')';
      ctx.fillRect(-BX, -renderOy, C.W + BX * 2, VH);
      ctx.restore();
    }
    ctx.save();
    ctx.globalAlpha *= Math.max(0, Math.min(1, k * 5));
    var sc = 0.82 + 0.18 * k;
    ctx.translate(cx, cy); ctx.scale(sc, sc); ctx.translate(-cx, -cy);
    fn();
    ctx.restore();
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

  var _gradCache = {};
  function grad(key, make) {
    var g = _gradCache[key];
    if (!g) {
      if (Object.keys(_gradCache).length > 96) _gradCache = {};
      g = make();
      _gradCache[key] = g;
    }
    return g;
  }
  function measureInk(font, text) {
    ctx.save();
    try {
      if (ctx.setTransform) ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.font = font;
      var m = ctx.measureText(text);
      return {
        w: m.width,
        a: m.actualBoundingBoxAscent,
        d: m.actualBoundingBoxDescent,
        has: m.actualBoundingBoxAscent != null
      };
    } finally {
      ctx.restore();
    }
  }

  function drawBackground() {
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

    ctx.fillStyle = grad('sun' + lk, function () {
      var gg = ctx.createRadialGradient(LW * 0.5, -30, 20, LW * 0.5, -30, 300);
      gg.addColorStop(0, 'rgba(255,255,255,0.55)');
      gg.addColorStop(1, 'rgba(255,255,255,0)');
      return gg;
    });
    ctx.fillRect(0, 0, LW, 300);
    ctx.fillStyle = grad('glowL' + lk, function () {
      var gg = ctx.createRadialGradient(LW * 0.22, -50, 10, LW * 0.22, -50, 280);
      gg.addColorStop(0, 'rgba(255,255,255,0.30)');
      gg.addColorStop(1, 'rgba(255,255,255,0)');
      return gg;
    });
    ctx.fillRect(0, 0, LW, 300);
    ctx.fillStyle = grad('glowR' + lk, function () {
      var gg = ctx.createRadialGradient(LW * 0.8, -50, 10, LW * 0.8, -50, 280);
      gg.addColorStop(0, 'rgba(255,255,255,0.30)');
      gg.addColorStop(1, 'rgba(255,255,255,0)');
      return gg;
    });
    ctx.fillRect(0, 0, LW, 300);

    if (BX > 0) {
      var edge = BX + 26;
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

    var ray = grad('ray' + vk, function () {
      var gg = ctx.createLinearGradient(0, 0, 0, VH * 0.72);
      gg.addColorStop(0, 'rgba(255,255,255,1)');
      gg.addColorStop(1, 'rgba(255,255,255,0)');
      return gg;
    });
    for (var bi = 0; bi < 3; bi++) {
      var bx0 = BX + C.W * (0.18 + bi * 0.32) + Math.sin(time * 0.13 + bi * 2.1) * C.W * 0.04;
      var tilt = Math.sin(time * 0.09 + bi * 1.4) * 0.10 + (bi - 1) * 0.06;
      var bw = 70 - Math.abs(bi - 1) * 18;
      var rayA = 0.05 + 0.035 * (0.5 + 0.5 * Math.sin(time * 0.23 + bi * 2.6));
      ctx.save();
      ctx.translate(bx0, -10);
      ctx.rotate(tilt);
      var LAYERS = [[1, 0.14], [0.74, 0.2], [0.48, 0.28], [0.24, 0.38]];
      for (var li = 0; li < LAYERS.length; li++) {
        ctx.globalAlpha = rayA * LAYERS[li][1];
        ctx.fillStyle = ray;
        var lw = bw * LAYERS[li][0];
        ctx.fillRect(-lw / 2, 0, lw, VH * 0.82);
      }
      ctx.restore();
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.10)';
    ctx.lineWidth = 1.5;
    var ripN = Math.min(6, Math.max(3, Math.round(LW / 260)));
    var ripSpan = LW + 300;
    for (var ri = 0; ri < ripN; ri++) {
      var rx = ((time * (10 + (ri % 3) * 6) + ri * (ripSpan / ripN)) % ripSpan) - 150;
      var rp = ripN > 1 ? ri / (ripN - 1) : 0.5;
      var ry = VH * (0.22 + 0.62 * rp);
      ctx.beginPath();
      ctx.ellipse(rx, ry, 90 + (ri % 3) * 24, 12 + (ri % 3) * 4, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    var i, jl, tt;
    for (i = 0; i < jellies.length; i++) {
      jl = jellies[i];
      var pulse = 0.85 + 0.15 * Math.sin(time * 1.5 + jl.ph);
      ctx.save();
      ctx.translate(jl.x, jl.y);
      ctx.globalAlpha = 0.32;
      ctx.strokeStyle = 'rgba(' + jl.tint + ',0.55)';
      ctx.lineWidth = 1.6;
      ctx.lineCap = 'round';
      for (tt = -2; tt <= 2; tt++) {
        var tx0 = tt * jl.s * 0.28 * pulse;
        var tu = (tt * 0.28 + 1) / 2;
        var ty0 = Math.sin(tu * Math.PI * 2 + time * 2 + jl.ph) * jl.s * 0.06;
        var tl = jl.s * (1.8 - Math.abs(tt) * 0.2);
        ctx.beginPath();
        ctx.moveTo(tx0, ty0 + 1);
        ctx.quadraticCurveTo(tx0 + Math.sin(time * 2 + jl.ph + tt * 1.3) * 6, ty0 + tl * 0.55,
                             tx0 + Math.sin(time * 1.3 + tt * 1.7) * 9, ty0 + tl);
        ctx.stroke();
      }
      ctx.lineCap = 'butt';
      ctx.fillStyle = 'rgba(' + jl.tint + ',0.6)';
      ctx.beginPath();
      ctx.ellipse(0, 0, jl.s * pulse, jl.s * 0.8 / pulse, 0, Math.PI, Math.PI * 2);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(' + jl.tint + ',0.65)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (var sk = 0; sk <= 8; sk++) {
        var sx = -jl.s * pulse + (sk / 8) * 2 * jl.s * pulse;
        var sy = Math.sin((sk / 8) * Math.PI * 2 + time * 2 + jl.ph) * jl.s * 0.06;
        if (sk === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
      }
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = 1.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.ellipse(0, -jl.s * 0.05, jl.s * 0.6 * pulse, jl.s * 0.42 / pulse, 0, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
      ctx.lineCap = 'butt';
      ctx.restore();
    }

    for (i = 0; i < fishes.length; i++) {
      var f = fishes[i];
      if (f.fade <= 0.01) continue;
      ctx.save();
      ctx.globalAlpha = Math.min(1, f.fade);
      ctx.translate(f.x, f.y);
      ctx.scale(f.dir, 1);
      var twk = Math.sin(f.tail) * f.s * 0.18;
      var bodyG = grad('fish' + Math.round(f.s) + '_' + f.tint, function () {
        var gg = ctx.createLinearGradient(0, -f.s * 0.45, 0, f.s * 0.45);
        gg.addColorStop(0, 'rgba(' + f.tint + ',0.32)');
        gg.addColorStop(1, 'rgba(' + f.tintD + ',0.18)');
        return gg;
      });
      ctx.fillStyle = bodyG;
      ctx.beginPath();
      ctx.moveTo(-f.s * 0.55, twk * 0.3);
      ctx.quadraticCurveTo(-f.s * 0.95, -f.s * 0.12 + twk * 0.4, -f.s * 1.28, -f.s * 0.4 + twk);
      ctx.quadraticCurveTo(-f.s * 1.0, twk * 0.9, -f.s * 1.28, f.s * 0.4 + twk);
      ctx.quadraticCurveTo(-f.s * 0.95, f.s * 0.12 + twk * 0.4, -f.s * 0.55, twk * 0.3);
      ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(f.s, 0);
      ctx.quadraticCurveTo(f.s * 0.72, -f.s * 0.4, f.s * 0.28, -f.s * 0.44);
      ctx.quadraticCurveTo(-f.s * 0.12, -f.s * 0.44, -f.s * 0.42, -f.s * 0.24);
      ctx.quadraticCurveTo(-f.s * 0.58, -f.s * 0.12, -f.s * 0.62, twk * 0.3);
      ctx.quadraticCurveTo(-f.s * 0.58, f.s * 0.12, -f.s * 0.42, f.s * 0.24);
      ctx.quadraticCurveTo(-f.s * 0.12, f.s * 0.44, f.s * 0.28, f.s * 0.44);
      ctx.quadraticCurveTo(f.s * 0.72, f.s * 0.4, f.s, 0);
      ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-f.s * 0.15, -f.s * 0.42);
      ctx.quadraticCurveTo(f.s * 0.02, -f.s * 0.64, f.s * 0.28, -f.s * 0.4);
      ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(f.s * 0.08, f.s * 0.38);
      ctx.quadraticCurveTo(-f.s * 0.02, f.s * 0.58, -f.s * 0.2, f.s * 0.38);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(225,244,255,0.6)';
      ctx.beginPath();
      ctx.arc(f.s * 0.6, -f.s * 0.1, Math.max(1, f.s * 0.06), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    for (i = 0; i < glitters.length; i++) {
      var gl = glitters[i];
      var ga = 0.12 + 0.22 * Math.max(0, Math.sin(time * gl.sp + gl.ph));
      ctx.fillStyle = 'rgba(255,255,255,' + ga + ')';
      ctx.beginPath(); ctx.arc(gl.x, gl.y, gl.r, 0, Math.PI * 2); ctx.fill();
    }

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

    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1.2;
    for (i = 0; i < bubbles.length; i++) {
      var b = bubbles[i];
      var bx = b.x + Math.sin(b.sway * 1.4) * 6;
      ctx.beginPath(); ctx.arc(bx, b.y, b.r, 0, Math.PI * 2); ctx.stroke();
    }

    drawFlora(4, BX - 6, 3);
    drawFlora(BX + C.W + 6, LW - 4, 8);
  }

  function drawFlora(x0, x1, seed) {
    var w = x1 - x0;
    if (w < 26) return;
    var baseY = VH - 3;
    var left = (seed === 3);
    var edge = left ? x1 - 7 : x0 + 7;
    var dir = left ? -1 : 1;
    var sway = left ? 1 : -1;
    var k;
    ctx.lineCap = 'round';
    var rx = edge + dir * 4, rr = 13;
    ctx.fillStyle = 'rgba(12,52,88,0.38)';
    ctx.beginPath(); ctx.ellipse(rx, baseY + 4, rr, rr * 0.45, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(rx - rr * 0.5, baseY + 5, rr * 0.6, rr * 0.3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(190,225,250,0.14)';
    ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.ellipse(rx, baseY + 1, rr * 0.8, rr * 0.32, 0, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
  }

  function popScale(b) {
    if (!b.popT || b.popT <= 0) return 1;
    var t = b.popT / 0.28;
    if (t > 0.6) return 0.6 + (1.15 - 0.6) * (1 - t) / 0.4;
    return 1.15 - 0.15 * (0.6 - t) / 0.6;
  }

  function drawBall(b, alpha) {
    if (b.iron) { if (b.chest) drawChest(b, alpha); else drawIronBall(b, alpha); return; }
    var t = T[b.tier];
    var s = popScale(b);
    var r = b.r * s;
    var speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
    var bx = b.rx != null ? b.rx : b.x, by = b.ry != null ? b.ry : b.y;

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

    ctx.translate(bx, by);
    var k = b.defK || 0;
    if (k > 0.012) {
      ctx.rotate(Math.atan2(b.defY || 0, b.defX || 1));
      ctx.scale(1 + k, 1 - k);
    }

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

    ctx.save();
    ctx.strokeStyle = grad('bE' + b.tier + '_' + rk, function () {
      var gg = ctx.createLinearGradient(-r * 0.94, -r * 0.09, r * 0.21, -r * 0.92);
      gg.addColorStop(0, 'rgba(255,255,255,0)');
      gg.addColorStop(0.5, 'rgba(255,255,255,0.8)');
      gg.addColorStop(1, 'rgba(255,255,255,0)');
      return gg;
    });
    ctx.lineCap = 'round';
    var ARC_LAY = [[1, 0.22], [0.6, 0.34], [0.26, 0.5]];
    for (var al = 0; al < ARC_LAY.length; al++) {
      ctx.globalAlpha = alpha * 0.6 * ARC_LAY[al][1];
      ctx.lineWidth = Math.max(1.2, r * 0.055 * ARC_LAY[al][0]);
      ctx.beginPath(); ctx.arc(0, 0, r * 0.94, Math.PI * 1.03, Math.PI * 1.57); ctx.stroke();
    }
    ctx.restore();
    ctx.globalAlpha = alpha;

    var hp = (b.id || 0) * 1.13;
    var ha1 = 0.5 + 0.17 * Math.sin(time * 1.7 + hp);
    var hs1 = 1 + 0.06 * Math.sin(time * 1.7 + hp);
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
    else if (b.special === 'ice') drawIceMark(r);
    else if (b.special === 'vortex' || b.special === 'magnet') {
      var pr = (b.special === 'vortex') ? C.vortex.pullR : C.magnet.pullR;
      var fp = 0.5 + 0.5 * Math.sin(time * 3 + r);
      ctx.save();
      ctx.strokeStyle = hexToRgba(b.special === 'vortex' ? '#8FA8E8' : '#9BC0F0', 0.18 + 0.12 * fp);
      ctx.lineWidth = 2; ctx.setLineDash([10, 12]); ctx.lineDashOffset = -time * 40;
      ctx.beginPath(); ctx.arc(0, 0, pr, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }
    else if (b.tier <= 4) drawFace(r);
    else drawWaves(r);
    if (b.rune) drawRuneMark(r, b.rune);

    if (b.frozen > 0) drawFrozenShell(b, r);

    ctx.restore();
  }

  function drawIronBall(b, alpha) {
    var r = b.r;
    var bx = b.rx != null ? b.rx : b.x, by = b.ry != null ? b.ry : b.y;
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
    ctx.save();
    ctx.beginPath(); ctx.arc(0, 0, r * 0.99, 0, Math.PI * 2); ctx.clip();
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
    ctx.fillStyle = grad('ironVg' + rk2, function () {
      var gg = ctx.createRadialGradient(0, 0, r * 0.5, 0, 0, r);
      gg.addColorStop(0, 'rgba(20,16,10,0)');
      gg.addColorStop(0.75, 'rgba(20,16,10,0.14)');
      gg.addColorStop(1, 'rgba(20,16,10,0.42)');
      return gg;
    });
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    if (b.frozen > 0) drawFrozenShell(b, r);
    ctx.restore();
  }

  function drawFace(r) {    var ex = r * 0.32, ey = -r * 0.05;
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
    ctx.beginPath(); ctx.arc(0, 0, r * 0.995, 0, Math.PI * 2); ctx.clip();
    var wk = Math.round(r * 2) / 2;
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
    ctx.fillStyle = grad('wvDeep' + wk, function () {
      var gg = ctx.createRadialGradient(0, r * 1.18, r * 0.08, 0, r * 1.18, r * 1.1);
      gg.addColorStop(0, 'rgba(3,14,38,0.44)');
      gg.addColorStop(0.55, 'rgba(6,26,64,0.16)');
      gg.addColorStop(1, 'rgba(6,26,64,0)');
      return gg;
    });
    ctx.fillRect(-r, -r, r * 2, r * 2);
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

  function drawChest(b, alpha) {
    var bob = Math.sin(time * 2.2) * 1.5;
    var bx = b.rx != null ? b.rx : b.x, by = b.ry != null ? b.ry : b.y;
    ctx.save();
    ctx.globalAlpha = alpha;
    var fd = FLOORY - (by + b.r);
    if (fd < 30 && fd > -b.r) {
      ctx.fillStyle = 'rgba(10,20,30,' + (0.2 * (1 - Math.max(0, fd) / 30)) + ')';
      ctx.beginPath(); ctx.ellipse(bx, FLOORY - 2, b.r * 0.95, b.r * 0.2, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.translate(bx, by);
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
    var seamY = -h * 0.06;
    ctx.fillStyle = grad('chestLid', function () {
      var gg = ctx.createLinearGradient(0, -h * 0.62, 0, seamY);
      gg.addColorStop(0, '#F4C866'); gg.addColorStop(0.55, '#DDA948'); gg.addColorStop(1, '#B98430');
      return gg;
    });
    ctx.beginPath();
    ctx.moveTo(-w / 2, seamY);
    ctx.quadraticCurveTo(0, -h * 0.72, w / 2, seamY);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,240,190,0.5)'; ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-w * 0.34, -h * 0.30);
    ctx.quadraticCurveTo(0, -h * 0.62, w * 0.34, -h * 0.30);
    ctx.stroke();
    ctx.fillStyle = grad('chestBody', function () {
      var gg = ctx.createLinearGradient(0, seamY, 0, h * 0.56);
      gg.addColorStop(0, '#D8A44C'); gg.addColorStop(0.5, '#C08A38'); gg.addColorStop(1, '#8F5E22');
      return gg;
    });
    roundRect(-w / 2, seamY, w, h * 0.62, 3); ctx.fill();
    ctx.strokeStyle = 'rgba(110,66,20,0.45)'; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-w * 0.17, seamY + 3); ctx.lineTo(-w * 0.17, h * 0.52);
    ctx.moveTo(w * 0.17, seamY + 3); ctx.lineTo(w * 0.17, h * 0.52);
    ctx.stroke();
    ctx.fillStyle = '#7A4E1C';
    roundRect(-w * 0.42, -h * 0.36, 4.5, h * 0.9, 2); ctx.fill();
    roundRect(w * 0.42 - 4.5, -h * 0.36, 4.5, h * 0.9, 2); ctx.fill();
    ctx.fillStyle = '#FFE6A6';
    ctx.beginPath();
    ctx.arc(-w * 0.42 + 2.2, -h * 0.2, 1.1, 0, Math.PI * 2);
    ctx.arc(w * 0.42 - 2.3, -h * 0.2, 1.1, 0, Math.PI * 2);
    ctx.arc(-w * 0.42 + 2.2, h * 0.34, 1.1, 0, Math.PI * 2);
    ctx.arc(w * 0.42 - 2.3, h * 0.34, 1.1, 0, Math.PI * 2);
    ctx.fill();
    var seamG = 0.26 + 0.24 * Math.sin(time * 3 + 1);
    ctx.fillStyle = 'rgba(255,224,130,' + seamG.toFixed(2) + ')';
    roundRect(-w * 0.4, seamY - 1, w * 0.8, 2.2, 1.1); ctx.fill();
    ctx.fillStyle = '#FFD873';
    roundRect(-4.5, seamY - 3, 9, 10, 2.5); ctx.fill();
    ctx.fillStyle = '#5A3A14';
    ctx.beginPath(); ctx.arc(0, seamY + 1.2, 1.6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-0.9, seamY + 2.2); ctx.lineTo(0.9, seamY + 2.2);
    ctx.lineTo(0.55, seamY + 5.2); ctx.lineTo(-0.55, seamY + 5.2);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(242,193,78,0.85)'; ctx.lineWidth = 1.4;
    roundRect(-w / 2, seamY, w, h * 0.62, 3); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-w / 2, seamY);
    ctx.quadraticCurveTo(0, -h * 0.72, w / 2, seamY);
    ctx.stroke();
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
    var frac = (chest && chest.life) ? Math.max(0, 1 - chest.t / chest.life) : 1;
    ctx.strokeStyle = 'rgba(20,40,55,0.28)'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(0, 0, b.r + 8, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = frac > 0.5 ? 'rgba(255,255,255,0.85)' : (frac > 0.25 ? '#FFC94D' : '#FF6B52');
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(0, 0, b.r + 8, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2); ctx.stroke();
    ctx.lineCap = 'butt';
    ctx.restore();
  }
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
  function drawPearlMark(r) {
    ctx.save();
    ctx.strokeStyle = 'rgba(210,190,150,0.95)';
    ctx.lineWidth = Math.max(1.6, r * 0.09);
    ctx.beginPath(); ctx.arc(0, r * 0.16, r * 0.42, 0, Math.PI); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.98)';
    ctx.beginPath(); ctx.arc(0, r * 0.08, r * 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(180,160,120,0.9)';
    ctx.beginPath(); ctx.arc(-r * 0.06, r * 0.02, r * 0.05, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  function drawIceMark(r) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.97)';
    ctx.lineWidth = Math.max(1.4, r * 0.07);
    ctx.lineCap = 'round';
    for (var i = 0; i < 3; i++) {
      var a = i * Math.PI / 3;
      var dx = Math.cos(a), dy = Math.sin(a);
      var len = r * 0.52;
      ctx.beginPath();
      ctx.moveTo(-dx * len, -dy * len);
      ctx.lineTo(dx * len, dy * len);
      ctx.stroke();
      var bx = dx * len * 0.58, by = dy * len * 0.58;
      var px = -dy, py = dx;
      var br = len * 0.26;
      ctx.beginPath();
      ctx.moveTo(bx - px * br, by - py * br);
      ctx.lineTo(bx + px * br, by + py * br);
      ctx.stroke();
    }
    ctx.restore();
  }
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
    ctx.fillStyle = grad('vtxDisc' + (Math.round(r * 2) / 2), function () {
      var gg = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.82);
      gg.addColorStop(0, 'rgba(94,110,208,0.30)');
      gg.addColorStop(0.6, 'rgba(94,110,208,0.13)');
      gg.addColorStop(1, 'rgba(94,110,208,0)');
      return gg;
    });
    ctx.beginPath(); ctx.arc(0, 0, r * 0.82, 0, Math.PI * 2); ctx.fill();
    ctx.rotate(time * 2.4);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (var arm = 0; arm < 3; arm++) {
      var a0 = arm * Math.PI * 2 / 3;
      var endA = a0 + Math.PI * 1.9;
      (function (a0, endA, arm) {
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
        var rr2 = r * (0.05 + 0.61 * tt);
        var x2 = Math.cos(aa) * rr2, y2 = Math.sin(aa) * rr2;
        if (i2 === 0) ctx.moveTo(x2, y2); else ctx.lineTo(x2, y2);
      }
      ctx.stroke();
    }
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
    ctx.fillStyle = 'rgba(200,238,255,0.42)';
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 1.2;
    for (var i = 0; i < 3; i++) {
      var ang = i * Math.PI / 3 + 0.4;
      ctx.beginPath();
      ctx.moveTo(Math.cos(ang) * r * 0.8, Math.sin(ang) * r * 0.8);
      ctx.lineTo(-Math.cos(ang) * r * 0.8, -Math.sin(ang) * r * 0.8);
      ctx.stroke();
    }
    var tw = 0.5 + 0.5 * Math.sin(time * 6 + b.id);
    ctx.fillStyle = 'rgba(255,255,255,' + (0.5 + tw * 0.5) + ')';
    ctx.beginPath(); ctx.arc(r * 0.3, -r * 0.35, 2, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(90,170,210,0.9)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, r + 4, -Math.PI / 2, -Math.PI / 2 + (b.frozen / C.ice.freezeTime) * Math.PI * 2);
    ctx.stroke();
  }

  function landingYFor(x, r) {
    var y = FLOORY - r;
    var bs = phys.bodies, i;
    for (i = 0; i < bs.length; i++) {
      var b = bs[i];
      if (Math.abs(b.vy) > 40) continue;
      var dx = Math.abs(b.x - x), rr = r + b.r;
      if (dx >= rr) continue;
      var cy = b.y - Math.sqrt(rr * rr - dx * dx);
      if (cy < y) y = cy;
    }
    if (y < C.containerTop + r) y = C.containerTop + r;
    return y;
  }
  function ghostBob() { return Math.sin(time * 2.1) * 3 + Math.sin(time * 3.9 + 1.3) * 1.2; }
  function drawGhostGuide(x, tier) {
    var r = nextIron ? C.iron.r : T[tier].r;
    var gy = C.spawnY + ghostBob();
    var topY = gy + r + 2;
    var L = C.guideLen;
    ctx.save();
    ctx.translate(0, topY);
    var lg = grad('ghostGuide' + L, function () {
      var g2 = ctx.createLinearGradient(0, 0, 0, L);
      g2.addColorStop(0, 'rgba(110,195,250,0.85)');
      g2.addColorStop(1, 'rgba(205,242,255,0.32)');
      return g2;
    });
    ctx.strokeStyle = lg;
    ctx.lineWidth = 1.6;
    ctx.setLineDash([6, 8]);
    ctx.lineDashOffset = -time * 60;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, L);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }
  function drawLandPreview() {
    var r = nextIron ? C.iron.r : T[nextTier].r;
    var gy = C.spawnY + ghostBob();
    var topY = gy + r + 2;
    ctx.save();
    ctx.strokeStyle = 'rgba(127,206,250,0.16)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 9]);
    ctx.lineDashOffset = -time * 30;
    ctx.beginPath();
    ctx.moveTo(aimX, topY);
    ctx.lineTo(aimX, FLOORY - r);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }
  function drawGhost(x, y, tier, alpha) {
    var r = nextIron ? C.iron.r : T[tier].r;
    var gy = y + ghostBob();
    if (auroraNext && !nextIron) {
      var ap = 0.5 + 0.5 * Math.sin(time * 4);
      ctx.save();
      ctx.globalAlpha = alpha;
      var ag = ctx.createRadialGradient(x, gy, r * 0.9, x, gy, r * 1.9);
      ag.addColorStop(0, hexToRgba('#9BE8D8', 0));
      ag.addColorStop(0.7, hexToRgba('#9BE8D8', (0.30 + 0.18 * ap) * (alpha / 0.6)));
      ag.addColorStop(1, hexToRgba('#C8B8F0', 0));
      ctx.fillStyle = ag;
      ctx.beginPath(); ctx.arc(x, gy, r * 1.9, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = hexToRgba('#9BE8D8', 0.85);
      ctx.lineWidth = 3; ctx.setLineDash([6, 7]); ctx.lineDashOffset = -time * 30;
      ctx.beginPath(); ctx.arc(x, gy, r * 1.45, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }
    var glowC = nextIron ? '#8FA0AE' : (nextSpecial ? specialColor(nextSpecial) : (nextRune ? runeColor(nextRune) : T[tier].color));
    var pulse = 0.5 + 0.5 * Math.sin(time * 2.1 - 0.6);
    var hg = ctx.createRadialGradient(x, gy, r * 0.2, x, gy, r * 1.55);
    hg.addColorStop(0, hexToRgba(glowC, (0.22 + 0.10 * pulse) * (alpha / 0.6)));
    hg.addColorStop(1, hexToRgba(glowC, 0));
    ctx.fillStyle = hg;
    ctx.beginPath(); ctx.arc(x, gy, r * 1.55, 0, Math.PI * 2); ctx.fill();
    if (nextIron) {
      drawIronBall({ x: x, y: gy, r: r, vx: 0, vy: 0 }, alpha);
    } else {
      drawBall({ x: x, y: gy, r: r, tier: tier, vx: 0, vy: 0, special: nextSpecial, rune: nextRune }, alpha);
    }
    if (auroraNext && !nextIron) {
      var ly2 = Math.max(C.containerTop + 15, C.spawnY - r - 10 + ghostBob());
      var bx = x, by = ly2 - 40;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.textAlign = 'center';
      ctx.font = 'bold 12px system-ui, sans-serif';
      var txt = '极光庇护 ×' + auroraNext;
      var tw2 = ctx.measureText(txt).width + 16;
      roundRect(Math.round(bx - tw2 / 2), Math.round(by - 14), tw2, 18, 9);
      ctx.fillStyle = 'rgba(155,232,216,0.92)'; ctx.fill();
      ctx.fillStyle = '#0E3B33';
      ctx.fillText(txt, Math.round(bx), Math.round(by - 1));
      ctx.restore();
    }
  }

  function drawGhostLabel() {
    if (state !== 'play' || evapMode || flowMode || rippleMode || confirmOpen) return;
    var r = nextIron ? C.iron.r : T[nextTier].r;
    var label = nextIron ? '礁石' : (nextSpecial ? specialLabel(nextSpecial) : (nextRune ? runeName(nextRune) + '符文' : null));
    if (!label) return;
    var alpha = cooldown > 0 ? 0.35 : 0.9;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.font = 'bold 14px system-ui, sans-serif';
    var ink = measureInk('bold 14px system-ui, sans-serif', label);
    var tw = ink.w + 14;
    var ly = Math.max(C.containerTop + 15, C.spawnY - r - 10 + ghostBob());
    ctx.fillStyle = 'rgba(255,255,255,0.88)';
    roundRect(Math.round(aimX - tw / 2), ly - 15, tw, 20, 10); ctx.fill();
    ctx.fillStyle = nextIron ? '#6B6353' : (nextSpecial ? specialColor(nextSpecial) : runeColor(nextRune));
    var asc = ink.has ? ink.a : 14 * 0.84, desc = ink.has ? ink.d : 14 * 0.06;
    ctx.fillText(label, Math.round(aimX), ly - 5 + (asc - desc) / 2);
    ctx.restore();
  }

  function drawContainer() {
    var floorY = FLOORY, FH = 12;
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

    var dep = grad('dep' + Math.round(FLOORY), function () {
      var gg = ctx.createLinearGradient(0, floorY - 30, 0, floorY);
      gg.addColorStop(0, 'rgba(20,70,120,0)');
      gg.addColorStop(1, 'rgba(20,70,120,0.14)');
      return gg;
    });
    ctx.fillStyle = dep;
    ctx.fillRect(0, floorY - 30, C.W, 30);

    var sy0 = MG.layout.band.decorBase;
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
      dune(du.x, sy0 + du.dy, du.rx, du.ry, du.c, du.c0);
    }
    ctx.fillStyle = 'rgba(110,150,168,0.4)';
    var yoff = MG.layout.band.pebbleYOff;
    var peb = MG.layout.band.pebbles;
    for (var pi = 0; pi < peb.length; pi++) {
      ctx.beginPath(); ctx.arc(peb[pi][0], peb[pi][1] + yoff, peb[pi][2], 0, Math.PI * 2); ctx.fill();
    }
    drawStarfish(MG.layout.band.starfish.x, MG.layout.band.starfish.y + yoff, MG.layout.band.starfish.s);
    drawShell(MG.layout.band.shell.x, MG.layout.band.shell.y + yoff, MG.layout.band.shell.s);
  }

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

  function drawWaterBack() {
    if (tide.progress <= 0.01) return;
    var wy = tideY(), left = C.wall, right = C.W - C.wall;
    var sn = seaStageNow(), st = sn.st;
    var g = grad('wback' + sn.ck + Math.round(wy / 4), function () {
      var gg = ctx.createLinearGradient(0, wy - tideAmp(), 0, FLOORY);
      gg.addColorStop(0, hexToRgba(deepenHex(st.bg[3], 0.25), 0.32));
      gg.addColorStop(1, hexToRgba(deepenHex(st.bg[3], 0.55), 0.62));
      return gg;
    });
    ctx.fillStyle = g;
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
    ctx.fillStyle = hexToRgba(deepenHex(seaStageNow().st.bg[3], 0.4), 0.18);
    ctx.beginPath();
    ctx.moveTo(left, FLOORY + 4);
    for (var x = left; x <= right; x += 6) ctx.lineTo(x, tideCrest(x));
    ctx.lineTo(right, FLOORY + 4);
    ctx.closePath();
    ctx.fill();
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (x = left; x <= right; x += 5) {
      var y = tideCrest(x);
      if (x === left) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(20,90,160,0.35)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    var first = true;
    for (x = left; x <= right; x += 5) {
      var sy = tideCrest(x) + 4;
      if (first) { ctx.moveTo(x, sy); first = false; } else ctx.lineTo(x, sy);
    }
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,' + (0.4 + tide.progress * 0.3).toFixed(2) + ')';
    for (x = left; x <= right; x += 26) {
      var fy = tideCrest(x) - 3;
      var fr = 1.4 + Math.sin(x * 0.5 + time * 5) * 0.5;
      ctx.beginPath(); ctx.arc(x, fy, fr, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  function drawPropHint(text) {
    var y = MG.layout.body.mirrorCy;
    ctx.textAlign = 'center';
    ctx.font = 'bold 19px system-ui, sans-serif';
    ctx.strokeStyle = 'rgba(10,40,70,0.6)';
    ctx.lineWidth = 4;
    ctx.strokeText(text, C.W / 2, y);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(text, C.W / 2, y);
  }

  function drawBuoyWarn() {
    if (state !== 'play') return;
    if (tide.progress <= 0.02) return;
    var wy = tideY();
    for (var i = 0; i < phys.bodies.length; i++) {
      var b = phys.bodies[i];
      if (b.iron || b.frozen > 0 || b.special) continue;
      var top = b.y - b.r;
      if (top > C.dangerY - 72) continue;
      var subm = (b.y + b.r - wy) / (2 * b.r);
      if (subm <= 0.02) continue;
      if (b.vy > -6) continue;
      var prox = Math.min(1, (C.dangerY - top + 72) / 144);
      var pulse = 0.5 + 0.5 * Math.sin(time * 5);
      var a = (0.22 + 0.4 * prox) * (0.45 + 0.55 * pulse);
      ctx.save();
      ctx.strokeStyle = 'rgba(255,150,90,' + a + ')';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([5, 5]);
      ctx.lineDashOffset = -time * 40;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r + 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }
  }

  function drawEventWarn() {
    if (!seaWarn) return;
    var w = 1 - Math.max(0, seaWarn.t) / SEA_WARN_T;
    var danger = seaWarn.type === 'storm' || seaWarn.type === 'surge';
    var col = danger ? '224,90,70' : '120,185,255';
    var a = (0.10 + 0.16 * (1 - Math.abs(w - 0.5) * 2)) * (0.6 + 0.4 * Math.sin(time * 7));
    var g = ctx.createRadialGradient(C.W / 2, VH / 2, VH * 0.28, C.W / 2, VH / 2, VH * 0.78);
    g.addColorStop(0, 'rgba(' + col + ',0)');
    g.addColorStop(1, 'rgba(' + col + ',' + Math.max(0, a) + ')');
    ctx.fillStyle = g;
    ctx.fillRect(-BX, -renderOy, C.W + BX * 2, VH);
    var label = seaWarn.type === 'storm' ? '漩涡风暴 将至' : seaWarn.type === 'surge' ? '深海涌泉 将至' : '海神甘霖 将至';
    ctx.save();
    ctx.textAlign = 'center';
    ctx.globalAlpha = 0.6 + 0.4 * Math.sin(time * 7);
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.strokeText(label, C.W / 2, C.dangerY - 40);
    ctx.fillStyle = danger ? '#F2614A' : '#7FD4FF';
    ctx.fillText(label, C.W / 2, C.dangerY - 40);
    ctx.restore();
  }

  function drawComboMeter() {
    if (state !== 'play') return;
    if (combo < 2 || comboTimer <= 0) return;
    var x = C.W / 2, y = C.dangerY + 70;
    var pulse = 0.5 + 0.5 * Math.sin(time * 8);
    ctx.save();
    ctx.textAlign = 'center';
    var fs = 22 + Math.min(16, combo * 1.2);
    ctx.font = 'bold ' + fs + 'px system-ui, sans-serif';
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.strokeText('连击 ×' + combo, x, y);
    ctx.fillStyle = '#FFD86B';
    ctx.fillText('连击 ×' + combo, x, y);
    var bw = 110, bh = 5, bx = x - bw / 2, by = y + 12;
    var frac = Math.max(0, Math.min(1, comboTimer / C.comboWindow));
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    roundRect(bx, by, bw, bh, 2.5); ctx.fill();
    ctx.fillStyle = 'rgba(255,216,107,' + (0.6 + 0.4 * pulse) + ')';
    roundRect(bx, by, bw * frac, bh, 2.5); ctx.fill();
    ctx.restore();
  }

  function drawReefCancelHint() {
    var bs = phys.bodies, i, k, n = bs.length;
    var handled = {}, groups = [];
    for (i = 0; i < n; i++) {
      var b = bs[i];
      if (!b.iron || b.chest || handled[b.id]) continue;
      if (!b._cluster || b._cluster < 2) continue;
      var cl = [], stack = [b]; handled[b.id] = 1;
      while (stack.length) {
        var cur = stack.pop(); cl.push(cur);
        var dx, dy, d, j;
        for (j = 0; j < n; j++) {
          var o = bs[j];
          if (o === cur || !o.iron || o.chest || handled[o.id]) continue;
          dx = o.x - cur.x; dy = o.y - cur.y; d = Math.sqrt(dx * dx + dy * dy);
          if (d < (cur.r + o.r) * 1.3) { handled[o.id] = 1; stack.push(o); }
        }
      }
      groups.push(cl);
    }
    if (!groups.length) return;
    ctx.save();
    ctx.textAlign = 'center';
    for (k = 0; k < groups.length; k++) {
      var c = groups[k], sz = c.length, cx = 0, topY = 1e9, q;
      for (q = 0; q < sz; q++) { cx += c[q].x; topY = Math.min(topY, c[q].y - c[q].r); }
      cx /= sz;
      if (sz === 2 && tide.progress < C.iron.tideNeed) {
        ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2; ctx.setLineDash([5, 6]);
        for (q = 0; q < sz; q++) { ctx.beginPath(); ctx.arc(c[q].x, c[q].y, c[q].r + 8, 0, Math.PI * 2); ctx.stroke(); }
        ctx.setLineDash([]);
        ctx.font = 'bold 15px system-ui, sans-serif';
        ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 3;
        ctx.strokeText('需涨潮相消', cx, topY - 12);
        ctx.fillStyle = '#FFD86B'; ctx.fillText('需涨潮相消', cx, topY - 12);
      } else if (sz >= 3) {
        ctx.strokeStyle = 'rgba(255,90,70,0.95)'; ctx.lineWidth = 2.5; ctx.setLineDash([6, 5]);
        for (q = 0; q < sz; q++) { ctx.beginPath(); ctx.arc(c[q].x, c[q].y, c[q].r + 10, 0, Math.PI * 2); ctx.stroke(); }
        ctx.setLineDash([]);
        ctx.font = 'bold 14px system-ui, sans-serif';
        ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 3;
        ctx.strokeText('⚠ 障碍·换险', cx, topY - 12);
        ctx.fillStyle = '#FF6B5A'; ctx.fillText('⚠ 障碍·换险', cx, topY - 12);
      }
    }
    ctx.restore();
  }
  function drawDangerLine() {
    var H = C.dangerWarnH;
    var near = 0, i;
    var restSp = C.dangerSpeed * 1.5;
    for (i = 0; i < phys.bodies.length; i++) {
      var b = phys.bodies[i];
      var sp = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
      if (sp >= restSp) continue;
      var d = (b.y - b.r) - C.dangerY;
      if (d < 0) continue;
      var prox = 1 - d / H;
      if (prox > 0) near = Math.max(near, prox);
    }
    near = Math.max(near, dangerAlert * 0.95);
    var flashing = near > 0.02;
    var blink = flashing ? (0.08 + 0.92 * (0.5 + 0.5 * Math.sin(time * 1.1 * 2 * Math.PI))) : 1;
    var glow = near;
    var a = flashing ? (0.3 + glow * 0.6) * blink : 0.2;
    var dz = ctx.createLinearGradient(0, C.dangerY, 0, C.dangerY + 42);
    dz.addColorStop(0, 'rgba(38,78,108,' + (0.12 + glow * 0.06) + ')');
    dz.addColorStop(1, 'rgba(38,78,108,0)');
    ctx.fillStyle = dz;
    ctx.fillRect(0, C.dangerY, C.W, 42);
    if (glow > 0.05) {
      var wz = ctx.createLinearGradient(0, C.dangerY, 0, C.dangerY + 42);
      wz.addColorStop(0, 'rgba(224,120,80,' + (glow * 0.14 * blink) + ')');
      wz.addColorStop(1, 'rgba(224,120,80,0)');
      ctx.fillStyle = wz;
      ctx.fillRect(0, C.dangerY, C.W, 42);
    }
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
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,' + ((flashing ? 0.35 + glow * 0.5 : 0.26) * blink) + ')';
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
    if (glow > 0.05) {
      var pa = (0.35 + glow * 0.55) * blink;
      for (var side = 0; side < 2; side++) {
        var ex2 = side ? C.W - 5 : 5;
        ctx.fillStyle = cCore + (pa * 0.22) + ')';
        ctx.beginPath(); ctx.arc(ex2, C.dangerY, 10 + glow * 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = cCore + (pa * 0.4) + ')';
        ctx.beginPath(); ctx.arc(ex2, C.dangerY, 5.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,' + (pa * 0.85) + ')';
        ctx.beginPath(); ctx.arc(ex2, C.dangerY, 2.2 + glow * 1.2, 0, Math.PI * 2); ctx.fill();
      }
    }
  }

  function drawDangerText() {
    if (dangerAlert <= 0.12) return;
    ctx.textAlign = 'center';
    var pulse = 0.5 + 0.5 * Math.sin(time * 2 * Math.PI);
    var wa = Math.min(1, 0.55 + dangerAlert * 0.45) * (0.7 + 0.3 * pulse);
    var sec = Math.max(0, dangerRemain);
    ctx.lineJoin = 'round';
    ctx.font = 'bold 30px system-ui, sans-serif';
    ctx.strokeStyle = 'rgba(255,255,255,' + wa + ')';
    ctx.lineWidth = 5;
    ctx.strokeText('堆高越线 ' + sec.toFixed(1) + 's', C.W / 2, C.dangerY - 26);
    ctx.fillStyle = 'rgba(196,48,42,' + wa + ')';
    ctx.fillText('堆高越线 ' + sec.toFixed(1) + 's', C.W / 2, C.dangerY - 26);
  }

  function drawHeartbeat() {
    if (dangerAlert <= 0.02) return;
    var pulse = 0.5 + 0.5 * Math.sin(time * 2 * Math.PI);
    var a = Math.min(0.42, dangerAlert * (0.20 + 0.18 * pulse));
    var band = 130;
    var gT = ctx.createLinearGradient(0, -renderOy, 0, -renderOy + band);
    gT.addColorStop(0, 'rgba(220,55,45,' + a + ')'); gT.addColorStop(1, 'rgba(220,55,45,0)');
    ctx.fillStyle = gT; ctx.fillRect(-BX, -renderOy, C.W + BX * 2, band);
    var gB = ctx.createLinearGradient(0, VH - renderOy, 0, VH - renderOy - band);
    gB.addColorStop(0, 'rgba(220,55,45,' + a + ')'); gB.addColorStop(1, 'rgba(220,55,45,0)');
    ctx.fillStyle = gB; ctx.fillRect(-BX, VH - renderOy - band, C.W + BX * 2, band);
    var gL = ctx.createLinearGradient(-BX, 0, -BX + band, 0);
    gL.addColorStop(0, 'rgba(220,55,45,' + a + ')'); gL.addColorStop(1, 'rgba(220,55,45,0)');
    ctx.fillStyle = gL; ctx.fillRect(-BX, -renderOy, band, VH);
    var gR = ctx.createLinearGradient(C.W + BX, 0, C.W + BX - band, 0);
    gR.addColorStop(0, 'rgba(220,55,45,' + a + ')'); gR.addColorStop(1, 'rgba(220,55,45,0)');
    ctx.fillStyle = gR; ctx.fillRect(C.W + BX - band, -renderOy, band, VH);
  }

  function drawHUD() {
    ctx.textAlign = 'left';
    ctx.lineJoin = 'round';
    var farIdx = 0;
    for (var fi = C.seaStages.length - 1; fi >= 0; fi--) {
      if (careerPeak >= C.seaStages[fi].at) { farIdx = fi; break; }
    }
    farIdx = Math.max(farIdx, seaStage());
    ctx.font = '14px system-ui, sans-serif';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    var top1 = '最高 ' + best + ' · 最远 ' + C.seaStages[farIdx].name;
    var t1Font = 14;
    while (t1Font > 11 && ctx.measureText(top1).width > 240) {
      t1Font--;
      ctx.font = t1Font + 'px system-ui, sans-serif';
    }
    ctx.strokeText(top1, 50, MG.layout.hud.row1Y);
    ctx.fillStyle = '#3E6E90';
    ctx.fillText(top1, 50, MG.layout.hud.row1Y);

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

    ctx.textAlign = 'center';
    ctx.lineJoin = 'round';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    var em = Math.floor(levelElapsed / 60), es = Math.floor(levelElapsed % 60);
    var etxt = '已进行 ' + em + ':' + (es < 10 ? '0' + es : es);
    ctx.strokeText(etxt, C.W - 80, MG.layout.hud.row1Y);
    ctx.fillStyle = '#2E7DA8';
    ctx.fillText(etxt, C.W - 80, MG.layout.hud.row1Y);

    drawSetBtn();
  }
  var setIconStyle = 'A';
  function setIconCog(ctx, fill) {
    var tipR = 12, rootR = 7.5, teeth = 8, step = Math.PI * 2 / teeth;
    ctx.beginPath();
    for (var i = 0; i < teeth; i++) {
      var ac = i * step, a0 = ac - step * 0.30, a1 = ac - step * 0.16,
          a2 = ac + step * 0.16, a3 = ac + step * 0.30;
      var pts = [[a0, rootR], [a1, tipR], [a2, tipR], [a3, rootR]];
      for (var k = 0; k < 4; k++) {
        var x = Math.cos(pts[k][0]) * pts[k][1], y = Math.sin(pts[k][0]) * pts[k][1];
        if (i === 0 && k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
    }
    ctx.closePath();
    if (fill) {
      ctx.fillStyle = '#FFFFFF'; ctx.fill();
      ctx.fillStyle = '#2E7DA8'; ctx.beginPath(); ctx.arc(0, 0, 4.2, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2.5; ctx.lineJoin = 'round'; ctx.stroke();
      ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(0, 0, 2, 0, Math.PI * 2); ctx.fill();
    }
  }
  function setIconSliders(ctx) {
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    var ys = [-7, 0, 7], xs = [-4, 5, -3];
    for (var i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.moveTo(-10, ys[i]); ctx.lineTo(10, ys[i]); ctx.stroke();
      ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(xs[i], ys[i], 3, 0, Math.PI * 2); ctx.fill();
    }
    ctx.lineCap = 'butt';
  }
  function setIconDial(ctx) {
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(0, 0, 8.5, 0, Math.PI * 2); ctx.stroke();
    for (var i = 0; i < 8; i++) {
      var a = i * Math.PI / 4;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 8.8, Math.sin(a) * 8.8);
      ctx.lineTo(Math.cos(a) * 11.5, Math.sin(a) * 11.5);
      ctx.stroke();
    }
    ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(0, 0, 2, 0, Math.PI * 2); ctx.fill();
    ctx.lineCap = 'butt';
  }
  function setIconTrash(ctx) {
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-7, -4); ctx.lineTo(7, -4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-3, -6.5); ctx.lineTo(3, -6.5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-2, -6.5); ctx.lineTo(-2, -4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(2, -6.5); ctx.lineTo(2, -4); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-5.5, -4); ctx.lineTo(-4.5, 7); ctx.lineTo(4.5, 7); ctx.lineTo(5.5, -4);
    ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-1.8, -1.5); ctx.lineTo(-1.4, 5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(1.8, -1.5); ctx.lineTo(1.4, 5); ctx.stroke();
    ctx.lineCap = 'butt';
  }
  function drawSetBtn() {
    drawCircleBtn(setBtn, '#2E7DA8', 1, false, 0);
    ctx.save();
    ctx.translate(setBtn.cx, setBtn.cy);
    var k = setBtn.r / 18;
    ctx.scale(k, k);
    if (setIconStyle === 'A') setIconCog(ctx, true);
    else if (setIconStyle === 'B') setIconCog(ctx, false);
    else if (setIconStyle === 'C') setIconSliders(ctx);
    else setIconDial(ctx);
    ctx.restore();
  }
  function drawSettings() {
    layoutSetPanel();
    panel(SET_PANEL.x, SET_PANEL.y, SET_PANEL.w, SET_PANEL.h, 14, 0.97);
    drawPanelHeader('设置', SET_PANEL, setCloseBtn, function () {
      ctx.save(); ctx.scale(0.667, 0.667); setIconCog(ctx, true); ctx.restore();
    }, '#2E7DA8');
    var names = ['音效', '音乐'];
    var descs = ['水滴合成与技能音效', '深海氛围背景音乐'];
    for (var si = 0; si < 2; si++) {
      var row = MG.layout.setRowRect(si);
      ctx.fillStyle = 'rgba(46,134,180,0.07)';
      roundRect(row.x, row.y, row.w, row.h, 10); ctx.fill();
      ctx.strokeStyle = 'rgba(90,140,180,0.18)'; ctx.lineWidth = 1;
      roundRect(row.x + 0.5, row.y + 0.5, row.w - 1, row.h - 1, 10); ctx.stroke();
      ctx.textAlign = 'left';
      ctx.fillStyle = '#155A8A';
      ctx.font = 'bold 16px system-ui, sans-serif';
      ctx.fillText(names[si], row.x + 18, row.y + 24);
      ctx.fillStyle = '#4A7FA0';
      ctx.font = '12px system-ui, sans-serif';
      ctx.fillText(descs[si], row.x + 18, row.y + 42);
      var on = si === 0 ? audio.sfxOn : audio.musicOn;
      var sx = row.x + row.w - 18 - 52, sy = row.y + 13;
      ctx.fillStyle = on ? '#2E86B4' : 'rgba(120,150,175,0.35)';
      roundRect(sx, sy, 52, 30, 15); ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath(); ctx.arc(on ? sx + 52 - 15 : sx + 15, sy + 15, 11, 0, Math.PI * 2); ctx.fill();
    }
    var clr = MG.layout.setRowRect(2);
    ctx.fillStyle = 'rgba(176,88,74,0.08)';
    roundRect(clr.x, clr.y, clr.w, clr.h, 10); ctx.fill();
    ctx.strokeStyle = 'rgba(176,88,74,0.35)'; ctx.lineWidth = 1;
    roundRect(clr.x + 0.5, clr.y + 0.5, clr.w - 1, clr.h - 1, 10); ctx.stroke();
    ctx.textAlign = 'left';
    ctx.fillStyle = '#B0584A';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.fillText('清空存档', clr.x + 18, clr.y + 24);
    ctx.fillStyle = '#96736B';
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText('重置游戏至初始状态', clr.x + 18, clr.y + 42);
    var bx = clr.x + clr.w - 18 - 64, by = clr.y + 13;
    var bgc = ctx.createLinearGradient(0, by, 0, by + 30);
    bgc.addColorStop(0, '#D0685A'); bgc.addColorStop(1, '#A8443A');
    ctx.fillStyle = bgc;
    roundRect(bx, by, 64, 30, 15); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1.5;
    roundRect(bx + 0.5, by + 0.5, 63, 29, 14.5); ctx.stroke();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('清空', bx + 32, by + 16);
    ctx.textBaseline = 'alphabetic';
  }
  function drawSetClear() {
    var cr = MG.layout.setClearRect();
    panel(cr.x, cr.y, cr.w, cr.h, 14, 0.97);
    drawPanelHeader('清空存档', cr, MG.layout.setClearCloseRect(), function () {
      ctx.save(); ctx.scale(0.667, 0.667); setIconTrash(ctx); ctx.restore();
    }, '#B0584A');
    ctx.textAlign = 'left';
    ctx.fillStyle = '#4A7FA0';
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillText('将清空全部存档，游戏恢复初始状态。', cr.x + 24, cr.y + 64);
    ctx.fillStyle = '#B0584A';
    ctx.fillText('此操作无法撤销。', cr.x + 24, cr.y + 84);
    var labels = ['取消', '确认清空'];
    ctx.font = 'bold 16px system-ui, sans-serif';
    for (var ci = 0; ci < 2; ci++) {
      var br = MG.layout.setClearBtnRect(ci);
      if (ci === 1) {
        var rg = ctx.createLinearGradient(0, br.y, 0, br.y + br.h);
        rg.addColorStop(0, '#D0685A'); rg.addColorStop(1, '#A8443A');
        ctx.fillStyle = rg;
        roundRect(br.x, br.y, br.w, br.h, br.h / 2); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1.5;
        roundRect(br.x + 0.5, br.y + 0.5, br.w - 1, br.h - 1, br.h / 2 - 0.5); ctx.stroke();
        ctx.fillStyle = '#FFFFFF';
      } else {
        ctx.fillStyle = '#FFFFFF';
        roundRect(br.x, br.y, br.w, br.h, br.h / 2); ctx.fill();
        ctx.strokeStyle = '#2E86B4'; ctx.lineWidth = 1.5;
        roundRect(br.x + 0.5, br.y + 0.5, br.w - 1, br.h - 1, br.h / 2 - 0.5); ctx.stroke();
        ctx.fillStyle = '#2E86B4';
      }
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(labels[ci], br.x + br.w / 2, br.y + br.h / 2 + 1);
      ctx.textBaseline = 'alphabetic';
    }
    ctx.textAlign = 'center';
  }
  function drawRowBtn(c, accent) {
    var s = c.pressT > 0 ? 1 - 0.1 * (c.pressT / 0.16) : 1;
    ctx.save();
    ctx.translate(c.cx, c.cy);
    ctx.scale(s, s);
    ctx.fillStyle = accent;
    ctx.beginPath(); ctx.arc(0, 0, c.r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, 0, c.r - 1.5, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
  function drawTideTimer() {
    if (!tide) return;
    var tp = MG.layout.hud.tidePill;
    var ty = tp.ty, th = tp.th;
    var active = tide.phase === 'active';
    var warn = !active && tide.timer <= C.tide.warnTime;
    var pulse = 0.5 + 0.5 * Math.sin(time * 6);
    var breath = Math.sin(time * 1.6);
    function hexA(hex, a) {
      var n = parseInt(hex.slice(1), 16);
      return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
    }

    var label = active ? '涨潮' : '潮汐';
    var ns = Math.ceil(tide.timer) + 's';
    ctx.textAlign = 'left';
    var lw = measureInk('bold 15px system-ui, sans-serif', label).w;
    var nw = measureInk('bold 22px system-ui, sans-serif', ns).w;
    var gap = 5;
    var maxNumW = measureInk('bold 22px system-ui, sans-serif', '99s').w;
    var textW = lw + gap + nw;
    var fixedTextW = lw + gap + maxNumW;
    var padX = 16, cw = fixedTextW + padX * 2;
    var tx = (tp.side === 'right') ? (C.W - tp.margin - cw) : tp.margin;
    var midY = ty + th / 2;

    var wTop = ty + 6, wBot = ty + th;

    if (warn || active) {
      ctx.save();
      ctx.shadowColor = warn ? 'rgba(214,96,40,0.5)' : 'rgba(255,255,255,0.6)';
      ctx.shadowBlur = 9 + pulse * 8;
    }
    ctx.strokeStyle = (warn || active) ? 'rgba(255,255,255,' + (0.6 + pulse * 0.3) + ')'
      : 'rgba(255,255,255,0.4)';
    ctx.lineWidth = (warn || active) ? 1.8 : 1.3;
    roundRect(tx + 0.9, ty + 0.9, cw - 1.8, th - 1.8, 14); ctx.stroke();
    if (warn || active) ctx.restore();

    var seaC = seaStageNow().st.bg[3];
    var backC = deepenHex(seaC, 0.55), frontC = deepenHex(seaC, 0.25);
    var frontA = warn ? 0.55 : (active ? 0.62 : 0.46);
    var backA = warn ? 0.32 : (active ? 0.34 : 0.26);
    var level = wBot - (wBot - wTop) * Math.max(0, Math.min(1, tide.progress));
    var amp = 3 + breath * 1.3 + (active ? 2 : 0) + (warn ? pulse * 2.0 : 0);
    var spd = active ? 3.4 : 1.7;
    ctx.save();
    roundRect(tx + 1, ty + 1, cw - 2, th - 2, 13); ctx.clip();
    ctx.fillStyle = hexA(backC, backA);
    ctx.beginPath(); ctx.moveTo(tx, wBot);
    for (var i = 0; i <= cw; i += 3) {
      ctx.lineTo(tx + i, level + Math.sin((i / cw) * Math.PI * 2 - time * spd * 0.6) * amp * 0.8);
    }
    ctx.lineTo(tx + cw, wBot); ctx.closePath(); ctx.fill();
    ctx.fillStyle = hexA(frontC, frontA);
    ctx.beginPath(); ctx.moveTo(tx, wBot);
    for (var k = 0; k <= cw; k += 3) {
      ctx.lineTo(tx + k, level + Math.sin((k / cw) * Math.PI * 3 + time * spd) * amp);
    }
    ctx.lineTo(tx + cw, wBot); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (var j = 0; j <= cw; j += 3) {
      var wy = level + Math.sin((j / cw) * Math.PI * 3 + time * spd) * amp;
      if (j === 0) ctx.moveTo(tx + j, wy); else ctx.lineTo(tx + j, wy);
    }
    ctx.stroke();
    if (active || warn) {
      ctx.fillStyle = 'rgba(255,255,255,' + (0.3 + pulse * 0.3) + ')';
      for (var b = 0; b < 3; b++) {
        var bxp = tx + 10 + ((b * 37 + time * 14) % (cw - 20));
        var byp = wBot - 6 - ((time * (12 + b * 4) + b * 22) % (th - 16));
        ctx.beginPath(); ctx.arc(bxp, byp, 1.6, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();

    var sx = tx + (cw - textW) / 2;
    ctx.lineJoin = 'round';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.fillStyle = warn ? '#C8501E' : '#12517E';
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    var lm = measureInk('bold 15px system-ui, sans-serif', label);
    var lBase = lm.has ? midY + (lm.a - lm.d) / 2 : midY + 15 * 0.40;
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.strokeText(label, sx, lBase); ctx.fillText(label, sx, lBase);
    var sc = 1 + (warn || active ? pulse * 0.06 : 0);
    var nm = measureInk('bold 22px system-ui, sans-serif', ns);
    var nBase = nm.has ? midY + (nm.a - nm.d) / 2 : midY + 22 * 0.35;
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.save();
    ctx.translate(sx + lw + gap + nw / 2, midY);
    ctx.scale(sc, sc);
    var ndy = (nBase - midY) / sc;
    ctx.strokeText(ns, -nw / 2, ndy); ctx.fillText(ns, -nw / 2, ndy);
    ctx.restore();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }
  function drawChalChip() {
    if (!ng || !ng.active) return;
    var name, pctStr, sub, gold, prog;
    name = ng.active.name;
    prog = seaProgress();
    pctStr = Math.round(prog * 100) + '%';
    gold = prog >= 1;
    sub = ng.active.desc + (ng.active.mult ? ' · 得分 ×' + ng.active.mult : '');
    var tp = MG.layout.hud.tidePill;
    var ty = tp.ty, th = tp.th;
    ctx.textAlign = 'left';
    var nw1 = measureInk('bold 16px system-ui, sans-serif', name).w;
    var pw1 = measureInk('bold 16px system-ui, sans-serif', pctStr).w;
    var gap1 = 7, padX = 14;
    var l1w = nw1 + gap1 + pw1;
    var sw1 = measureInk('11px system-ui, sans-serif', sub).w;
    var cw = padX * 2 + Math.max(l1w, sw1);
    var tx = tp.margin;
    var cx0 = tx + cw / 2;
    var lh1 = 16, lh2 = 11, vgap = (th - lh1 - lh2) / 3;
    var y1 = ty + vgap + lh1 / 2, y2 = ty + vgap * 2 + lh1 + lh2 / 2;
    var pulse = 0.5 + 0.5 * Math.sin(time * 6);
    var breath = Math.sin(time * 1.6);
    function hexA(hex, a) {
      var n = parseInt(hex.slice(1), 16);
      return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
    }
    if (gold) {
      ctx.save();
      ctx.shadowColor = 'rgba(245,197,66,' + (0.5 + pulse * 0.25).toFixed(2) + ')';
      ctx.shadowBlur = 9 + pulse * 7;
    }
    ctx.strokeStyle = gold ? 'rgba(255,236,170,' + (0.75 + pulse * 0.25).toFixed(2) + ')' : 'rgba(255,255,255,0.4)';
    ctx.lineWidth = gold ? 1.8 : 1.3;
    roundRect(tx + 0.9, ty + 0.9, cw - 1.8, th - 1.8, 14); ctx.stroke();
    if (gold) ctx.restore();
    var seaC = seaStageNow().st.bg[3];
    var backC = deepenHex(seaC, 0.55), frontC = deepenHex(seaC, 0.25);
    var wTop = ty + 6, wBot = ty + th;
    var level = wBot - (wBot - wTop) * prog;
    var amp = 2.6 + breath * 1.1 + (gold ? pulse * 1.6 : 0);
    var spd = gold ? 3.2 : 1.9;
    ctx.save();
    roundRect(tx + 1, ty + 1, cw - 2, th - 2, 13); ctx.clip();
    if (prog >= 1) {
      ctx.fillStyle = hexA(frontC, 0.5);
      ctx.fillRect(tx, ty, cw, th);
    } else {
    ctx.fillStyle = hexA(backC, 0.28);
    ctx.beginPath(); ctx.moveTo(tx, wBot);
    for (var i = 0; i <= cw; i += 3) {
      ctx.lineTo(tx + i, level + Math.sin((i / cw) * Math.PI * 2 - time * spd * 0.6) * amp * 0.8);
    }
    ctx.lineTo(tx + cw, wBot); ctx.closePath(); ctx.fill();
    ctx.fillStyle = hexA(frontC, gold ? 0.5 : 0.42);
    ctx.beginPath(); ctx.moveTo(tx, wBot);
    for (var k2 = 0; k2 <= cw; k2 += 3) {
      ctx.lineTo(tx + k2, level + Math.sin((k2 / cw) * Math.PI * 3 + time * spd) * amp);
    }
    ctx.lineTo(tx + cw, wBot); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (var j = 0; j <= cw; j += 3) {
      var wy = level + Math.sin((j / cw) * Math.PI * 3 + time * spd) * amp;
      if (j === 0) ctx.moveTo(tx + j, wy); else ctx.lineTo(tx + j, wy);
    }
    ctx.stroke();
    }
    ctx.restore();
    ctx.lineJoin = 'round';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.fillStyle = gold ? '#B8860B' : '#12517E';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    var nameBase = y1 + 16 * 0.40, pctBase = y1 + 16 * 0.35;
    var nameX = cx0 - l1w / 2 + nw1 / 2;
    var pctX = cx0 + l1w / 2 - pw1 / 2;
    ctx.strokeText(name, nameX, nameBase); ctx.fillText(name, nameX, nameBase);
    ctx.strokeText(pctStr, pctX, pctBase); ctx.fillText(pctStr, pctX, pctBase);
    ctx.lineWidth = 2.5;
    ctx.fillStyle = gold ? '#9A7420' : '#4A7FA0';
    ctx.font = '11px system-ui, sans-serif';
    var subBase = y2 + 11 * 0.38;
    ctx.strokeText(sub, cx0, subBase); ctx.fillText(sub, cx0, subBase);
    ctx.textBaseline = 'alphabetic';
  }
  function drawTideBanner() {
    if (tide.banner <= 0) return;
    var t = tide.banner / 2.4;
    var a = t < 0.2 ? t / 0.2 : (t > 0.85 ? (1 - t) / 0.15 : 1);
    var scale = 1 + (1 - t) * 0.15;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.textAlign = 'center';
    ctx.translate(C.W / 2, MG.layout.body.mirrorCy);
    ctx.scale(scale, scale);
    ctx.font = 'bold 43px system-ui, sans-serif';
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 6;
    ctx.strokeText('涨 潮', 0, 0);
    ctx.fillStyle = '#12517E';
    ctx.fillText('涨 潮', 0, 0);
    ctx.restore();
  }

  function drawConfirm() {
    var cr = MG.layout.confirmRect();
    ctx.save();
    panel(cr.x, cr.y, cr.w, cr.h, 14, 0.97);
    drawPanelHeader('重新开始', cr, MG.layout.confirmCloseRect(), function () {
      ctx.save(); ctx.scale(0.6, 0.6);
      ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, 9, -Math.PI * 0.35, Math.PI * 1.25); ctx.stroke();
      var ax = Math.cos(-Math.PI * 0.35) * 9, ay = Math.sin(-Math.PI * 0.35) * 9;
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.moveTo(ax + 5.5, ay - 1);
      ctx.lineTo(ax - 4.5, ay - 3);
      ctx.lineTo(ax + 1, ay + 6.5);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }, '#5E90B4');
    var labels = ['返回主页', '重新开始', '返回游戏'];
    ctx.font = 'bold 18px system-ui, sans-serif';
    for (var ci = 0; ci < 3; ci++) {
      var br = MG.layout.confirmBtnRect(ci);
      if (ci === 1) {
        var bg = ctx.createLinearGradient(0, br.y, 0, br.y + br.h);
        bg.addColorStop(0, '#3B9BD0'); bg.addColorStop(1, '#2578A8');
        ctx.fillStyle = bg;
        roundRect(br.x, br.y, br.w, br.h, br.h / 2); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1.5;
        roundRect(br.x + 0.5, br.y + 0.5, br.w - 1, br.h - 1, br.h / 2 - 0.5); ctx.stroke();
        ctx.fillStyle = '#FFFFFF';
      } else if (ci === 2) {
        var rg = ctx.createLinearGradient(0, br.y, 0, br.y + br.h);
        rg.addColorStop(0, '#93AEBF'); rg.addColorStop(1, '#6E88A0');
        ctx.fillStyle = rg;
        roundRect(br.x, br.y, br.w, br.h, br.h / 2); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.5;
        roundRect(br.x + 0.5, br.y + 0.5, br.w - 1, br.h - 1, br.h / 2 - 0.5); ctx.stroke();
        ctx.fillStyle = '#FFFFFF';
      } else {
        ctx.fillStyle = '#FFFFFF';
        roundRect(br.x, br.y, br.w, br.h, br.h / 2); ctx.fill();
        ctx.strokeStyle = '#2E86B4'; ctx.lineWidth = 1.5;
        roundRect(br.x + 0.5, br.y + 0.5, br.w - 1, br.h - 1, br.h / 2 - 0.5); ctx.stroke();
        ctx.fillStyle = '#2E86B4';
      }
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(labels[ci], br.x + br.w / 2, br.y + br.h / 2 + 1);
      ctx.textBaseline = 'alphabetic';
    }
    ctx.textAlign = 'center';
    ctx.restore();
  }

  var questHidden = true;
  function drawQuest() {
    if (!quest || questHidden) return;
    ctx.save();
    ctx.textAlign = 'center';
    var q = MG.layout.hud.quest;
    var qw = q.qw, qx = q.qx, qy = q.qy, qh = q.qh;
    ctx.fillStyle = 'rgba(255,255,255,0.66)';
    roundRect(qx, qy, qw, qh, 14); ctx.fill();
    ctx.strokeStyle = 'rgba(90,140,180,0.28)'; ctx.lineWidth = 1;
    roundRect(qx + 0.5, qy + 0.5, qw - 1, qh - 1, 14); ctx.stroke();
    var icx = qx + 25, icy = qy + 30;
    ctx.fillStyle = '#F5C542';
    ctx.beginPath(); ctx.arc(icx, icy, 15, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 1.8; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.arc(icx, icy, 7, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath(); ctx.arc(icx, icy, 2.6, 0, Math.PI * 2); ctx.fill();
    ctx.textAlign = 'left';
    ctx.fillStyle = '#7A5B10';
    var tf = 15;
    ctx.font = 'bold ' + tf + 'px system-ui, sans-serif';
    while (tf > 12 && ctx.measureText(quest.text).width > 170) {
      tf--;
      ctx.font = 'bold ' + tf + 'px system-ui, sans-serif';
    }
    ctx.fillText(quest.text, qx + 50, qy + 25);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#B8860B';
    ctx.font = '12px system-ui, sans-serif';
    var stars = '★★★'.slice(0, quest.stars || 1);
    ctx.fillText(stars, qx + qw - 15, qy + 25);
    var prog = Math.min(1, quest.have / quest.need);
    var bx = qx + 50, bw = 170, by = qy + 35, bh = 10;
    ctx.fillStyle = 'rgba(46,134,180,0.12)';
    roundRect(bx, by, bw, bh, 5); ctx.fill();
    if (prog > 0) {
      ctx.fillStyle = '#F5C542';
      roundRect(bx + 1, by + 1, Math.max(8, (bw - 2) * prog), bh - 2, 4); ctx.fill();
    }
    ctx.textAlign = 'center';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(60,40,5,0.45)'; ctx.lineJoin = 'round';
    var hn = quest.have + '/' + quest.need;
    ctx.strokeText(hn, bx + bw / 2, by + 8);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(hn, bx + bw / 2, by + 8);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#B8860B';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.fillText('+' + quest.rewardScore + ' 分', bx + bw + 6, by + 10);
    ctx.restore();
  }
  function fmtDiff(n) {
    if (n < 10000) return String(n);
    var w = n / 10000;
    return (w >= 10 ? Math.round(w) : Math.round(w * 10) / 10) + '万';
  }
  function hexToRgba(hex, a) {
    var n = parseInt(hex.slice(1), 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }
  function deepenHex(col, k) {
    var c = parseCol(col);
    var r = Math.round(c[0] + (10 - c[0]) * k);
    var g = Math.round(c[1] + (46 - c[1]) * k);
    var b = Math.round(c[2] + (78 - c[2]) * k);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }
  function seaStageNow() {
    var stg = seaStage(), sb = seaBlend();
    if (!sb) return { st: C.seaStages[stg], ck: '' + stg };
    var sA = C.seaStages[sb.from], sB = C.seaStages[sb.to], k = sb.k;
    return {
      st: {
        bg: [mixCol(sA.bg[0], sB.bg[0], k), mixCol(sA.bg[1], sB.bg[1], k), mixCol(sA.bg[2], sB.bg[2], k), mixCol(sA.bg[3], sB.bg[3], k)],
        shade: mixCol(sA.shade, sB.shade, k)
      },
      ck: 'B' + sb.from + '_' + sb.to + '_' + Math.round(k * 24)
    };
  }
  function seaTextColor(hex) {
    var n = parseInt(hex.slice(1), 16);
    var r = Math.round(((n >> 16) & 255) * 0.8), g = Math.round(((n >> 8) & 255) * 0.8), b = Math.round((n & 255) * 0.8);
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }
  function drawSeaProgress() {
    var cur = seaStage(), ts = totalScore();
    var last = C.seaStages.length - 1;
    var maxed = cur >= last;
    var sb = MG.layout.hud.seaBar;
    var sx = sb.sx, sy = sb.sy, sw = sb.sw, sh = sb.sh;
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    roundRect(sx, sy, sw, sh, 8); ctx.fill();
    var frac = 1;
    if (!maxed) {
      var lo = C.seaStages[cur].at, hi = C.seaStages[cur + 1].at;
      frac = Math.min(1, Math.max(0, (ts - lo) / (hi - lo)));
    }
    if (frac > 0) {
      ctx.fillStyle = maxed ? SEA_BADGES[last].c : C.seaStages[cur].bg[3];
      ctx.globalAlpha = 0.85;
      roundRect(sx + 2, sy + 2, Math.max(10, (sw - 4) * frac), sh - 4, 6); ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    var DEEP = '#2C5A78';
    var GRAY = '#66788A';
    var pct = maxed ? 100 : Math.round(frac * 100);
    var leftSeg = [C.seaStages[cur].name, seaTextColor(SEA_BADGES[cur].c)];
    var midSeg = [pct + '%', DEEP];
    var rightSeg = maxed ? ['已达最深', GRAY] : [C.seaStages[cur + 1].name, GRAY];
    var lx = sx + 26, rx = sx + sw - 26;
    var cxBar = sx + sw / 2;
    var lw2, mw2, rw2;
    var measure3 = function () {
      var f = 'bold ' + lf + 'px system-ui, sans-serif';
      lw2 = measureInk(f, leftSeg[0]).w;
      mw2 = measureInk(f, midSeg[0]).w;
      rw2 = measureInk(f, rightSeg[0]).w;
    };
    var lf = 13;
    measure3();
    while (lf > 10 && (lw2 + mw2 + rw2 > (rx - lx) - 16 ||
          (cxBar - mw2 / 2) - (lx + lw2) < 5 || (rx - rw2) - (cxBar + mw2 / 2) < 5)) {
      lf--;
      ctx.font = 'bold ' + lf + 'px system-ui, sans-serif';
      measure3();
    }
    var probe = measureInk('bold ' + lf + 'px system-ui, sans-serif', leftSeg[0]);
    var cyT, vBase;
    if (probe.has) {
      cyT = sy + (sh - (probe.a + probe.d)) / 2 + probe.a;
      vBase = 'alphabetic';
    } else {
      cyT = sy + (sh - lf * 0.90) / 2 + lf * 0.84;
      vBase = 'alphabetic';
    }
    ctx.save();
    ctx.textBaseline = vBase;
    ctx.textAlign = 'left';
    ctx.strokeText(leftSeg[0], lx, cyT);
    ctx.fillStyle = leftSeg[1]; ctx.fillText(leftSeg[0], lx, cyT);
    ctx.textAlign = 'right';
    ctx.strokeText(rightSeg[0], rx, cyT);
    ctx.fillStyle = rightSeg[1]; ctx.fillText(rightSeg[0], rx, cyT);
    ctx.textAlign = 'center';
    ctx.strokeText(midSeg[0], cxBar, cyT);
    ctx.fillStyle = midSeg[1]; ctx.fillText(midSeg[0], cxBar, cyT);
    ctx.restore();
    if (!maxed) {
      drawSeaBadge(cur + 1, sx + sw, sy + sh / 2, false, true, 12);
    }
    drawSeaBadge(cur, sx, sy + sh / 2, true, false, 12);
  }

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
    var readyPulse = 0.5 + 0.5 * Math.sin(time * 5);

    drawCircleBtn(bookBtn, '#4A7FA0', 1, false, readyPulse);
    var bx = bookBtn.cx, by = bookBtn.cy;
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 1.8;
    ctx.strokeRect(bx - 8, by - 6, 16, 12);
    ctx.beginPath(); ctx.moveTo(bx, by - 6); ctx.lineTo(bx, by + 6); ctx.stroke();

    drawCircleBtn(restartBtn, '#5E90B4', 0.85, false, 0);
    var rx0 = restartBtn.cx, ry0 = restartBtn.cy;
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(rx0, ry0, 9, -Math.PI * 0.35, Math.PI * 1.25); ctx.stroke();
    var ax = Math.cos(-Math.PI * 0.35) * 9, ay = Math.sin(-Math.PI * 0.35) * 9;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(rx0 + ax + 5.5, ry0 + ay - 1);
    ctx.lineTo(rx0 + ax - 4.5, ry0 + ay - 3);
    ctx.lineTo(rx0 + ax + 1, ry0 + ay + 6.5);
    ctx.closePath(); ctx.fill();

    function drawChargeBadge(btn, q) {
      var bx = btn.cx + btn.r - 2, by = btn.cy - btn.r + 2, bd = 9.5;
      ctx.beginPath(); ctx.arc(bx, by, bd, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(18,40,62,0.92)';
      ctx.fill();
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.stroke();
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.fillText('' + q, bx, by + 4.2);
      ctx.textAlign = 'left';
    }

    ctx.textAlign = 'center';
    for (var i = 0; i < SKILL_BTNS.length; i++) {
      var btn = SKILL_BTNS[i], cfg = C.skills[i];
      var unl = skillUnlocked(cfg.key);
      var q = skillCharge[cfg.key] || 0;
      var btnColor, btnAlpha, iconColor;
      if (!unl) { btnColor = '#7E93A3'; btnAlpha = 0.4; iconColor = null; }
      else if (q >= 1) { btnColor = '#3E8DB5'; btnAlpha = 1; iconColor = '#FFFFFF'; }
      else { btnColor = '#5E7180'; btnAlpha = 0.45; iconColor = 'rgba(255,255,255,0.38)'; }
      drawCircleBtn(btn, btnColor, btnAlpha, false, 0);
      if (!unl) {
        ctx.strokeStyle = 'rgba(255,255,255,0.9)';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(btn.cx, btn.cy - 9, 4.5, Math.PI, 0); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        roundRect(btn.cx - 6.5, btn.cy - 9, 13, 10, 2); ctx.fill();
        ctx.fillStyle = 'rgba(230,242,248,0.75)';
        ctx.font = '10px system-ui, sans-serif';
        ctx.fillText('待符文', btn.cx, btn.cy + 13);
      } else {
        if (iconColor) drawSkillIcon(cfg.key, btn.cx, btn.cy, iconColor);
        if (q >= 1) drawChargeBadge(btn, q);
      }
      if (unl && ((cfg.key === 'evap' && evapMode) || (cfg.key === 'ripple' && rippleMode) || (cfg.key === 'flow' && flowMode))) {
        var pr = (btn.r + 3) + 2 * (0.5 + 0.5 * Math.sin(time * 6));
        ctx.strokeStyle = 'rgba(226,75,74,' + (0.7 + 0.3 * Math.sin(time * 6)) + ')';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(btn.cx, btn.cy, pr, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(240,250,252,0.95)';
      ctx.font = '13px system-ui, sans-serif';
      ctx.fillText(cfg.name, btn.cx, btn.cy + btn.r + 12);
    }

  }
  function drawNgPick() {
    var nr = MG.layout.ngRect();
    var pw = nr.w, ph = nr.h, px = nr.x, py = nr.y;
    panel(px, py, pw, ph, 14, 0.97);
    drawPanelHeader('深渊潜航', nr, null, '⚓', '#6B5AA8');
    ctx.textAlign = 'center';
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
      ctx.fillText('高危挑战', rect.x + rect.w - 16, rect.y + 26);
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

  var PCOLMAP = {
    gain:    '#D4A017',
    burst:   '#8E5AC8',
    world:   '#0E7C9E',
    reward:  '#1E9E6A',
    todo:    '#C9821A',
    miss:    '#9E4B47',
    neutral: '#6B8AA5'
  };
  function drawPopups() {
    var pass, i, p;
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    for (pass = 0; pass < 2; pass++) {
      var wantBig = pass === 1;
      for (i = 0; i < popups.length; i++) {
        p = popups[i];
        if (!!p.big !== wantBig) continue;
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, p.life / p.max * 1.5));
        var yOff = p.big ? -4 : 20;
        ctx.translate(p.x, p.y + yOff);
        ctx.scale(p.scale * (p.baseScale || 1), p.scale * (p.baseScale || 1));
        ctx.fillStyle = PCOLMAP[p.kind] || PCOLMAP.neutral;
        var mscale = Math.min(1.7, 1 + Math.max(0, p.mult - 1) * 0.08);
        ctx.font = 'bold ' + ((p.big ? 20 : 17) * mscale) + 'px system-ui, sans-serif';
        ctx.strokeStyle = 'rgba(255,255,255,0.85)';
        ctx.lineWidth = 3;
        ctx.strokeText(p.text, 0, 0);
        ctx.fillText(p.text, 0, 0);
        if (p.mult > 1) {
          ctx.font = 'bold 18px system-ui, sans-serif';
          ctx.fillStyle = PCOLMAP.gain;
          ctx.strokeStyle = 'rgba(255,255,255,0.85)';
          ctx.lineWidth = 3;
          ctx.strokeText('连击 x' + p.mult, 0, -24);
          ctx.fillText('连击 x' + p.mult, 0, -24);
        }
        ctx.restore();
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawOver() {
    buildOverButtons();
    ctx.fillStyle = 'rgba(10,40,70,0.55)';
    ctx.fillRect(-BX, -renderOy, C.W + BX * 2, VH);

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
    if (ng && ng.active) {
      var chalPct = Math.min(100, Math.round(seaProgress() * 100));
      var chalOk = chalPct >= 100;
      var chalText = ng.active.name + ' · 海域进度 ' + chalPct + '%' + (ng.active.mult ? ' · 得分 ×' + ng.active.mult : '');
      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.fillStyle = chalOk ? '#B8860B' : '#8AA5B8';
      ctx.fillText(chalText, C.W / 2, py + 184);
    }

    for (var i = 0; i < overButtons.length; i++) {
      var b = overButtons[i];
      if (b.primary) {
        var g = ctx.createLinearGradient(b.x, b.y, b.x, b.y + b.h);
        g.addColorStop(0, '#3B9BD0');
        g.addColorStop(1, '#2578A8');
        ctx.fillStyle = g;
      } else {
        ctx.fillStyle = '#FFFFFF';
      }
      roundRect(b.x, b.y, b.w, b.h, 12); ctx.fill();
      ctx.strokeStyle = b.primary ? 'rgba(255,255,255,0.5)' : '#2E86B4';
      ctx.lineWidth = 1.5;
      roundRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1, 12); ctx.stroke();
      ctx.fillStyle = b.primary ? '#FFFFFF' : '#2E86B4';
      ctx.font = 'bold 20px system-ui, sans-serif';
      ctx.textBaseline = 'middle';
      ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2 + 1);
      ctx.textBaseline = 'alphabetic';
    }
  }

  function drawTutorial() {
    if (tutDone || state !== 'play' || dexOpen || confirmOpen) return;
    var step = Math.min(dropCount, TUT_STEPS.length - 1);
    var ty = MG.layout.body.tutY;
    var pulse = 0.5 + 0.5 * Math.sin(time * 4);
    ctx.save();
    ctx.textAlign = 'center';
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
    for (var i = 0; i < TUT_STEPS.length; i++) {
      ctx.fillStyle = i < dropCount ? '#2E86B4' : 'rgba(46,134,180,0.25)';
      ctx.beginPath(); ctx.arc(C.W / 2 - (TUT_STEPS.length - 1) * 7 + i * 14, ty + 36, 3.2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  function menuTransK() {
    if (!menuTrans.dir) return null;
    var k = (performance.now() / 1000 - menuTrans.t0) / menuTrans.dur;
    if (k >= 1) { menuTrans.dir = null; menuTrans.snap = null; return null; }
    return k < 0 ? 0 : k;
  }
  function grabTransSnap() {
    if (!menuTrans.dir || menuTrans.snap) return;
    var cv = document.getElementById('game');
    if (!cv || !cv.width) return;
    var sn = document.createElement('canvas');
    sn.width = cv.width; sn.height = cv.height;
    sn.getContext('2d').drawImage(cv, 0, 0);
    menuTrans.snap = sn;
  }
  function drawRippleReveal(k) {
    var ek = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
    var kp = dpr * view.s;
    var sn = menuTrans.snap;
    var pw = sn ? sn.width : Math.round(C.W * kp);
    var ph = sn ? sn.height : Math.round(VH * kp);
    var cpx = (menuTrans.sx + BX) * kp;
    var cpy = (menuTrans.sy + renderOy) * kp;
    var maxR = Math.sqrt(Math.pow(Math.max(cpx, pw - cpx), 2) + Math.pow(Math.max(cpy, ph - cpy), 2)) + 30 * kp;
    var r = ek * maxR;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (sn) {
      ctx.beginPath();
      ctx.rect(-4, -4, pw + 8, ph + 8);
      ctx.arc(cpx, cpy, Math.max(0.1, r), 0, Math.PI * 2);
      ctx.clip('evenodd');
      ctx.drawImage(sn, 0, 0);
    }
    if (r > 8 * kp) {
      var wg = ctx.createRadialGradient(cpx, cpy, r * 0.82, cpx, cpy, r);
      wg.addColorStop(0, 'rgba(255,255,255,0)');
      wg.addColorStop(0.8, 'rgba(210,240,255,' + (0.18 * (1 - ek) + 0.05).toFixed(2) + ')');
      wg.addColorStop(1, 'rgba(255,255,255,' + (0.3 * (1 - ek) + 0.06).toFixed(2) + ')');
      ctx.fillStyle = wg;
      ctx.beginPath(); ctx.arc(cpx, cpy, r, 0, Math.PI * 2); ctx.fill();
    }
    var rings = [
      { rr: r, w: 4.5 - ek * 2.5, a: 0.85 * (1 - ek * 0.55) },
      { rr: r * 0.8, w: 2.6 - ek, a: 0.5 * (1 - ek * 0.7) },
      { rr: r * 0.58, w: 1.8 - ek * 0.6, a: 0.32 * (1 - ek * 0.8) }
    ];
    for (var ri = 0; ri < rings.length; ri++) {
      var rg = rings[ri];
      if (rg.rr < 3 * kp || rg.a <= 0.02) continue;
      ctx.beginPath();
      for (var a = 0; a <= Math.PI * 2 + 0.01; a += Math.PI / 22) {
        var wob = 1 + Math.sin(a * 9 + time * 6 - ri * 1.7) * 0.012;
        var px = cpx + Math.cos(a) * rg.rr * wob;
        var py = cpy + Math.sin(a) * rg.rr * wob;
        if (a === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.strokeStyle = ri === 0 ? 'rgba(255,255,255,' + rg.a.toFixed(2) + ')'
                                 : 'rgba(190,232,255,' + rg.a.toFixed(2) + ')';
      ctx.lineWidth = Math.max(0.6, rg.w) * kp;
      ctx.stroke();
    }
    if (r > 12 * kp) {
      var og = ctx.createRadialGradient(cpx, cpy, r * 0.96, cpx, cpy, r * 1.12);
      og.addColorStop(0, 'rgba(160,220,250,' + (0.3 * (1 - ek)).toFixed(2) + ')');
      og.addColorStop(1, 'rgba(160,220,250,0)');
      ctx.fillStyle = og;
      ctx.beginPath(); ctx.arc(cpx, cpy, r * 1.12, 0, Math.PI * 2); ctx.fill();
    }
    if (ek < 0.35) {
      var sp = ek / 0.35;
      for (var di = 0; di < 7; di++) {
        var ang = di * 0.897 + 0.6;
        var dist = (14 + sp * 46 + Math.sin(di * 2.3) * 6) * kp;
        var dy2 = -Math.sin(sp * Math.PI) * 22 * (0.6 + (di % 3) * 0.2) * kp;
        ctx.fillStyle = 'rgba(255,255,255,' + ((1 - sp) * 0.8).toFixed(2) + ')';
        ctx.beginPath();
        ctx.arc(cpx + Math.cos(ang) * dist, cpy + Math.sin(ang) * dist * 0.6 + dy2, (2.4 - sp * 1.4) * kp, 0, Math.PI * 2);
        ctx.fill();
      }
      var fr = (12 + ek / 0.35 * 34) * kp;
      ctx.strokeStyle = 'rgba(255,255,255,' + ((1 - ek / 0.35) * 0.7).toFixed(2) + ')';
      ctx.lineWidth = 2.4 * kp;
      ctx.beginPath(); ctx.arc(cpx, cpy, fr, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }
  function drawKelp(bx, h, dir) {
    var H = h * 26, sd = bx * 0.11 + dir * 3;
    var baseY = VH + 2;
    var segs = 10, i, j;
    function blade(ox, hh, ph, wRoot, wTip, col, lw) {
      var pts = [];
      for (i = 0; i <= segs; i++) {
        var t = i / segs;
        var bend = Math.sin(time * 0.85 + sd + ph) * 9 * dir + Math.sin(t * 2.2 + sd * 3.1 + ph) * hh * 0.09;
        var w = wRoot + (wTip - wRoot) * t;
        var wob = Math.sin(t * 9 + sd * 2 + ph * 2.3) * w * 0.30;
        pts.push({ x: bend * t * t, y: baseY - hh * t, w: w + wob * 0.5 });
      }
      ctx.beginPath();
      ctx.moveTo(bx + pts[0].x + ox - pts[0].w, pts[0].y);
      for (j = 1; j <= segs; j++) ctx.lineTo(bx + pts[j].x + ox - pts[j].w, pts[j].y);
      for (j = segs; j >= 0; j--) ctx.lineTo(bx + pts[j].x + ox + pts[j].w, pts[j].y);
      ctx.closePath();
      ctx.fillStyle = col;
      ctx.fill();
      if (lw) {
        ctx.strokeStyle = 'rgba(150,215,240,0.16)';
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(bx + pts[0].x + ox, pts[0].y);
        for (j = 1; j <= segs; j++) ctx.lineTo(bx + pts[j].x + ox, pts[j].y);
        ctx.stroke();
      }
    }
    blade(-8, H * 0.60, 1.9, 7.5, 1.2, 'rgba(8,38,66,0.20)', false);
    blade(8, H * 0.76, 3.6, 8.5, 1.2, 'rgba(8,38,66,0.26)', false);
    blade(-3, H * 0.90, 0.8, 9.5, 1.4, 'rgba(10,44,74,0.30)', false);
    blade(2, H, 0, 11, 1.6, 'rgba(10,44,74,0.36)', true);
    for (j = 0; j < 4; j++) {
      var lt = 0.3 + j * 0.18;
      var lb = Math.sin(time * 0.85 + sd) * 9 * dir * lt * lt + Math.sin(lt * 2.2 + sd * 3.1) * H * 0.09 * lt * lt;
      var lx = bx + lb, ly = baseY - H * lt;
      var ldir = j % 2 ? 1 : -1;
      var ll = H * 0.17 * (1 - j * 0.12);
      ctx.fillStyle = 'rgba(10,44,74,0.26)';
      ctx.beginPath();
      ctx.moveTo(lx, ly);
      ctx.quadraticCurveTo(lx + ll * 0.62 * ldir + Math.sin(time * 1.1 + sd + j) * 2, ly - ll * 0.55,
                           lx + ll * ldir, ly - ll * 0.22);
      ctx.quadraticCurveTo(lx + ll * 0.45 * ldir, ly + ll * 0.1, lx, ly);
      ctx.closePath(); ctx.fill();
    }
  }
  function drawGrassTuft(cx0, baseY, chh, dir, sd) {
    var rows = [
      { n: 2, hMul: 0.72, col: 'rgba(13,58,86,0.30)', off: 7 * dir, ph: 2.1 },
      { n: 3, hMul: 1.0,  col: 'rgba(30,104,132,0.36)', off: 0, ph: 0 }
    ];
    for (var rw = 0; rw < rows.length; rw++) {
      var row = rows[rw];
      for (var lf = 0; lf < row.n; lf++) {
        var lh = chh * row.hMul * (lf === 1 ? 1 : 0.76);
        var lx = cx0 + row.off + (lf - (row.n - 1) / 2) * 10;
        var lsway = Math.sin(time * (0.7 + rw * 0.2 + lf * 0.13) + sd + row.ph) * (5 + lh * 0.14);
        var wb2 = 4.6;
        var tipX = lx + lsway, tipY = baseY - lh;
        var tipDir = (lsway >= 0 ? 1 : -1);
        ctx.fillStyle = row.col;
        ctx.beginPath();
        ctx.moveTo(lx - wb2, baseY);
        ctx.quadraticCurveTo(lx - wb2 * 0.4 + lsway * 0.4, baseY - lh * 0.6, tipX - 2.4 * tipDir, tipY);
        ctx.quadraticCurveTo(tipX + 2.6 * tipDir, tipY - 1.5, tipX + 3 * tipDir, tipY + 2.5);
        ctx.quadraticCurveTo(lx + wb2 * 0.4 + lsway * 0.4, baseY - lh * 0.55, lx + wb2, baseY);
        ctx.closePath(); ctx.fill();
      }
    }
  }
  function menuBandX(i, n) {
    var w = LW / n;
    return (i + 0.5) * w + Math.sin(i * 2.399) * w * 0.36;
  }
  function drawMenuScene() {
    var i;
    var mvk = Math.round(VH);
    var rg = grad('menuRay' + mvk, function () {
      var gg = ctx.createLinearGradient(0, 0, 0, VH * 0.75);
      gg.addColorStop(0, 'rgba(210,240,255,0.13)');
      gg.addColorStop(1, 'rgba(210,240,255,0)');
      return gg;
    });
    for (i = 0; i < 4; i++) {
      var rayX = -BX + LW * (0.15 + i * 0.23);
      var sway = Math.sin(time * 0.35 + i * 1.7) * 26;
      var topW = 26 + (i % 2) * 14, botW = topW * 2.6;
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.moveTo(rayX - topW / 2 + sway * 0.3, -10);
      ctx.lineTo(rayX + topW / 2 + sway * 0.3, -10);
      ctx.lineTo(rayX + botW / 2 + sway, VH * 0.75);
      ctx.lineTo(rayX - botW / 2 + sway, VH * 0.75);
      ctx.closePath(); ctx.fill();
    }
    var dustN = Math.min(34, Math.max(16, Math.round(16 * LW / C.W)));
    for (i = 0; i < dustN; i++) {
      var sd = i * 137;
      var px = -BX + menuBandX(i, dustN) + Math.sin(time * 0.4 + i) * 8;
      var py = (sd * 13 % VH) + Math.sin(time * 0.25 + i * 2.1) * 14;
      var pa = 0.04 + 0.05 * (0.5 + 0.5 * Math.sin(time * 1.2 + i * 2.3));
      ctx.fillStyle = 'rgba(230,248,255,' + pa.toFixed(2) + ')';
      ctx.beginPath(); ctx.arc(px, py, 1.2 + (i % 3) * 0.7, 0, Math.PI * 2); ctx.fill();
    }
    var mbN = Math.min(26, Math.max(12, Math.round(12 * LW / C.W)));
    for (i = 0; i < mbN; i++) {
      var seed = i * 97;
      var bx = -BX + menuBandX(i, mbN) + Math.sin(time * 0.8 + i * 1.9) * 10;
      var by = VH + 40 - ((time * (16 + (i % 6) * 3.5) + seed * 3) % (VH + 140));
      var br = 2.5 + (i % 4) * 2.6;
      ctx.beginPath();
      ctx.fillStyle = 'rgba(255,255,255,' + (0.05 + (i % 3) * 0.045).toFixed(2) + ')';
      ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    var menuFishN = 3;
    for (i = 0; i < menuFishN; i++) {
      var speed = 22 + i * 14;
      var span = LW + 120;
      var trav = time * speed + i * (span / menuFishN);
      var cyc = Math.floor(trav / span), tIn = trav % span;
      var goingRight = (cyc % 2) === 0;
      var fx2 = -BX + (goingRight ? (tIn - 60) : (LW + 60 - tIn));
      var fy2 = 205 + i * 110 + Math.sin(time * 0.9 + i * 2.4) * 12;
      var fs2 = 0.8 + i * 0.35;
      var flip = goingRight ? 1 : -1;
      ctx.save();
      ctx.translate(fx2, fy2); ctx.scale(fs2 * flip, fs2);
      ctx.fillStyle = 'rgba(10,44,74,0.20)';
      ctx.beginPath();
      ctx.moveTo(-14, 0);
      ctx.quadraticCurveTo(-4, -8, 10, 0);
      ctx.quadraticCurveTo(-4, 8, -14, 0);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-13, 0); ctx.lineTo(-21, -6); ctx.lineTo(-21, 6); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = grad('menuMask' + mvk, function () {
      var gg = ctx.createLinearGradient(0, 0, 0, VH);
      gg.addColorStop(0, 'rgba(6,28,52,0.20)');
      gg.addColorStop(0.45, 'rgba(6,28,52,0.07)');
      gg.addColorStop(1, 'rgba(6,28,52,0.16)');
      return gg;
    });
    ctx.fillRect(-BX, -renderOy, C.W + BX * 2, VH);
    ctx.fillStyle = grad('menuVig' + mvk + '_' + Math.round(BX), function () {
      var gg = ctx.createRadialGradient(C.W / 2, VH * 0.45, VH * 0.40, C.W / 2, VH * 0.45, VH * 0.95);
      gg.addColorStop(0, 'rgba(0,0,0,0)');
      gg.addColorStop(1, 'rgba(4,22,42,0.20)');
      return gg;
    });
    ctx.fillRect(-BX, -renderOy, C.W + BX * 2, VH);
  }
  function drawTitleArt(ty) {
    var txt = '水滴合成深海';
    var adv = 48;
    var CH = [
      { s: 1.00, dy: 1,  rot: -0.035 },
      { s: 0.94, dy: 4,  rot: 0.045 },
      { s: 1.04, dy: -1, rot: -0.03 },
      { s: 0.96, dy: 3,  rot: 0.035 },
      { s: 1.02, dy: -1, rot: -0.04 },
      { s: 0.97, dy: 3,  rot: 0.03 }
    ];
    var x0 = C.W / 2 - adv * (txt.length - 1) / 2;
    var tBob = Math.sin(time * 1.6) * 2.2;
    var i;
    var fam = MG.titleFontFamily || 'system-ui';
    ctx.font = '44px "' + fam + '", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (i = 0; i < txt.length; i++) {
      var ch = CH[i];
      var cy = ty + ch.dy + tBob + Math.sin(time * 1.6 + i * 0.5) * 1.2;
      ctx.save();
      ctx.translate(x0 + i * adv, cy);
      ctx.rotate(ch.rot + Math.sin(time * 1.2 + i) * 0.014);
      ctx.scale(ch.s, ch.s);
      ctx.fillStyle = '#2E86B4';
      ctx.fillText(txt[i], 0, -16);
      ctx.restore();
    }
    drawShell(x0 - 34, ty + 8 - tBob * 0.6, 9);
    drawStarfish(x0 + adv * 5 + 38, ty - 46 + tBob, 11);
    ctx.save();
    ctx.translate(x0 + adv * 5 + 38, ty - 6 + tBob * 0.8);
    ctx.rotate(Math.sin(time * 1.6) * 0.06);
    drawBall({ x: 0, y: 0, r: 11, tier: 1, vx: 0, vy: 0, id: 7 }, 1);
    ctx.restore();
    ctx.textBaseline = 'alphabetic';
  }
  function drawMenuContent() {
    var mu = MG.layout.menu;
    var pulse = 0.5 + 0.5 * Math.sin(time * 2.4);
    ctx.textAlign = 'center';

    drawTitleArt(mu.titleY);

    for (var i = 0; i < menuTiles.length; i++) drawMenuTile(menuTiles[i]);

    drawMascot(C.W / 2, mu.mascotCy);

    drawOfflineCard();

    var b = menuStartBtn;
    ctx.save();
    ctx.strokeStyle = 'rgba(127,212,255,' + (0.22 + pulse * 0.28).toFixed(2) + ')';
    ctx.lineWidth = 3;
    roundRect(b.x - 6 - pulse * 3, b.y - 6 - pulse * 3, b.w + 12 + pulse * 6, b.h + 12 + pulse * 6, b.h / 2 + 6); ctx.stroke();
    ctx.restore();
    var g = ctx.createLinearGradient(0, b.y, 0, b.y + b.h);
    g.addColorStop(0, '#3B9BD0');
    g.addColorStop(1, '#2578A8');
    ctx.fillStyle = g;
    roundRect(b.x, b.y, b.w, b.h, b.h / 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.65)';
    ctx.lineWidth = 2;
    roundRect(b.x + 1, b.y + 1, b.w - 2, b.h - 2, b.h / 2 - 1); ctx.stroke();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('开始游戏', C.W / 2, b.y + b.h / 2 + 1);
    ctx.textBaseline = 'alphabetic';
  }

  function drawMenuTile(t) {
    var r = MG.layout.menuTileRect(t.side, t.i);
    var sc = 1 - Math.min(0.12, Math.max(0, t.pressT) * 0.75);
    ctx.save();
    ctx.translate(r.x + r.w / 2, r.y + r.h / 2);
    ctx.scale(sc, sc);
    ctx.fillStyle = 'rgba(6,26,48,0.30)';
    roundRect(-r.w / 2, -r.h / 2 + 4, r.w, r.h, 16); ctx.fill();
    var g = ctx.createLinearGradient(0, -r.h / 2, 0, r.h / 2);
    g.addColorStop(0, '#2E86B4');
    g.addColorStop(1, '#155A8A');
    ctx.fillStyle = g;
    roundRect(-r.w / 2, -r.h / 2, r.w, r.h, 16); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.65)';
    ctx.lineWidth = 2;
    roundRect(-r.w / 2 + 1, -r.h / 2 + 1, r.w - 2, r.h - 2, 15); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.28)';
    ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, 6, r.h / 2 - 9, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
    ctx.lineCap = 'butt';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '26px system-ui, sans-serif';
    ctx.fillText(t.icon, 0, -10);
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(t.label, 0, 16);
    ctx.textBaseline = 'alphabetic';
    ctx.restore();
  }

  var MASCOT_SHOWS = null;
  function mascotShows() {
    if (!MASCOT_SHOWS) {
      MASCOT_SHOWS = [];
      var t;
      for (t = 1; t <= 8; t++) MASCOT_SHOWS.push({ tier: t });
      var sp = ['vortex', 'cloud', 'rainbow', 'gale', 'magnet', 'spring', 'thunder', 'pearl', 'magma', 'geyser', 'void', 'aurora'];
      for (t = 0; t < sp.length; t++) MASCOT_SHOWS.push({ tier: 3, special: sp[t] });
      MASCOT_SHOWS.push({ iron: true });
      MASCOT_SHOWS.push({ iron: true, chest: true });
    }
    return MASCOT_SHOWS;
  }
  function drawMascot(cx, cy) {
    var r = 52;
    var list = mascotShows();
    var CYC = 3.0;
    var tick = time / CYC;
    var idx = Math.floor(tick) % list.length;
    var ph = tick - Math.floor(tick);
    var sc = 1, alpha = 1;
    if (ph < 0.24) {
      var u = ph / 0.24 - 1;
      sc = 0.4 + 0.6 * (1 + 2.70158 * u * u * u + 1.70158 * u * u);
      if (sc > 1.12) sc = 1.12;
    } else if (ph > 0.84) {
      var v = (ph - 0.84) / 0.16;
      sc = 1 - 0.4 * v * v;
      alpha = 1 - v * v;
    }
    cy += Math.sin(time * 1.8) * 4;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = 'rgba(8,34,60,0.25)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + r + 10, r * 0.7 * sc, 9 * sc, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    var ball = { x: cx, y: cy, r: r * sc, vx: 0, vy: 0, id: 3 };
    var show = list[idx];
    for (var k in show) ball[k] = show[k];
    drawBall(ball, alpha);
  }

  function render() {
    grabTransSnap();

    ctx.globalAlpha = 1;
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'miter';
    ctx.setLineDash([]);

    ctx.setTransform(dpr * view.s, 0, 0, dpr * view.s, 0, 0);
    drawBackground();

    renderOy = oy;
    ctx.setTransform(dpr * view.s, 0, 0, dpr * view.s, 0, dpr * view.s * renderOy);
    if (shakeT > 0) {
      var s = shakeAmp * (shakeT / 0.4);
      ctx.translate((Math.random() - 0.5) * 2 * s, (Math.random() - 0.5) * 2 * s);
    }

    ctx.save();
    ctx.translate(BX, 0);

    if (state === 'menu') {
      var tK = menuTransK();
      drawMenuScene();
      drawMenuContent();
      ctx.save();
      ctx.translate(0, hudInset);
      drawSetBtn();
      ctx.restore();
      if (tK !== null) drawRippleReveal(tK);
      if (setOpen || panelFxAlive('set')) { var msR = MG.layout.setRect(); drawPanelFx('set', setOpen, msR.x + msR.w / 2, msR.y + msR.h / 2, 0.55, drawSettings); }
      if (setClearOpen || panelFxAlive('setclr')) { var mcR = MG.layout.setClearRect(); drawPanelFx('setclr', setClearOpen, mcR.x + mcR.w / 2, mcR.y + mcR.h / 2, 0.6, drawSetClear); }
      if (achOpen || panelFxAlive('ach')) drawPanelFx('ach', achOpen, DEX_PANEL.x + DEX_PANEL.w / 2, DEX_PANEL.y + DEX_PANEL.h / 2, 0.6, drawAchPanel);
      ctx.restore(); return;
    }

    drawContainer();
    drawWaterBack();
    if (state === 'play' && !evapMode && !flowMode && !rippleMode && !confirmOpen) {
      drawGhostGuide(aimX, nextTier);
      drawLandPreview();
    }

    var i;
    for (i = 0; i < phys.bodies.length; i++) drawBall(phys.bodies[i], 1);

    drawWaterFront();

    drawBuoyWarn();
    drawTutorial();

    if (state === 'play' && !evapMode && !flowMode && !rippleMode && !confirmOpen) {
      drawGhost(aimX, C.spawnY, nextTier, cooldown > 0 ? 0.25 : 0.6);
    }

    drawFx();
    drawEventVfx();
    drawEventWarn();

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
      drawPropHint('蒸发模式：点击要移除的水滴或礁石（再点按钮取消）');
    }

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
      drawPropHint('涟漪模式：点击选择波纹中心（再点按钮取消）');
    }

    if (flowMode) {
      ctx.fillStyle = 'rgba(10,40,70,0.14)';
      ctx.fillRect(-BX, -renderOy, C.W + BX * 2, VH);
      if (flowPick) {
        ctx.save();
        ctx.strokeStyle = '#7FE8F5';
        ctx.lineWidth = 3;
        ctx.setLineDash([7, 5]);
        ctx.lineDashOffset = -time * 30;
        ctx.beginPath(); ctx.arc(flowPick.x, flowPick.y, flowPick.r + 9, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }
      ctx.textAlign = 'center';
      var flowHint = flowPick ? '水流模式：再点一枚水滴与之交换（点原滴取消）' : '水流模式：点选第一枚水滴';
      drawPropHint(flowHint);
    }

    var vg = grad('vig' + Math.round(VH) + '_' + Math.round(BX), function () {
      var gg = ctx.createRadialGradient(C.W / 2, VH / 2, VH * 0.34, C.W / 2, VH / 2, VH * 0.74);
      gg.addColorStop(0, 'rgba(0,0,0,0)');
      gg.addColorStop(1, 'rgba(6,28,52,0.16)');
      return gg;
    });
    ctx.fillStyle = vg;
    ctx.fillRect(-BX, -renderOy, C.W + BX * 2, VH);

    if (hudInset > 0) { ctx.save(); ctx.translate(0, hudInset); }
    drawHUD();
    if (!questHidden) drawQuest();
    drawSeaProgress();
    drawTideTimer();
    drawChalChip();
    if (hudInset > 0) ctx.restore();
    drawDangerLine();
    drawDangerText();
    drawHeartbeat();
    drawReefCancelHint();
    drawGhostLabel();
    drawPopups();
    drawTideBanner();
    drawComboMeter();
    drawSkillBar();
    if (confirmOpen || panelFxAlive('confirm')) { var pcR = MG.layout.confirmRect(); drawPanelFx('confirm', confirmOpen, pcR.x + pcR.w / 2, pcR.y + pcR.h / 2, 0.55, drawConfirm); }
    if (setOpen || panelFxAlive('set')) { var psR = MG.layout.setRect(); drawPanelFx('set', setOpen, psR.x + psR.w / 2, psR.y + psR.h / 2, 0.55, drawSettings); }
    if (setClearOpen || panelFxAlive('setclr')) { var pc2R = MG.layout.setClearRect(); drawPanelFx('setclr', setClearOpen, pc2R.x + pc2R.w / 2, pc2R.y + pc2R.h / 2, 0.6, drawSetClear); }

    if (dexOpen || panelFxAlive('dex')) drawPanelFx('dex', dexOpen, DEX_PANEL.x + DEX_PANEL.w / 2, DEX_PANEL.y + DEX_PANEL.h / 2, 0.6, drawDex);
    else if (achOpen || panelFxAlive('ach')) drawPanelFx('ach', achOpen, DEX_PANEL.x + DEX_PANEL.w / 2, DEX_PANEL.y + DEX_PANEL.h / 2, 0.6, drawAchPanel);
    if (ngOpen || panelFxAlive('ng')) { var pnR = MG.layout.ngRect(); drawPanelFx('ng', ngOpen, pnR.x + pnR.w / 2, pnR.y + pnR.h / 2, 0.66, drawNgPick); }
    if (shareOpen || panelFxAlive('share')) { var pshR = MG.layout.shareRect(); drawPanelFx('share', shareOpen, pshR.x + pshR.w / 2, pshR.y + pshR.h / 2, 0.6, drawShare); }
    if (state === 'over') drawOver();

    ctx.restore();

    var tkIn = menuTransK();
    if (tkIn !== null) drawRippleReveal(tkIn);
  }

  MG.debug.iconData = function (kind, id, size) {
    size = size || 192;
    var cv = document.createElement('canvas');
    cv.width = size; cv.height = size;
    var old = ctx;
    ctx = cv.getContext('2d');
    ctx.save();
    ctx.translate(size / 2, size / 2);
    ctx.scale(size / 96, size / 96);
    if (kind === 'tier') {
      drawBall({ x: 0, y: 0, r: 30, tier: id, vx: 0, vy: 0 }, 1);
    } else if (kind === 'sp') {
      var r = 26;
      if (id === 'iron') drawIronBall({ x: 0, y: 0, r: r, vx: 0, vy: 0 }, 1);
      else if (id === 'rune') drawBall({ x: 0, y: 0, r: r, tier: 1, vx: 0, vy: 0, rune: 'ripple' }, 1);
      else drawBall({ x: 0, y: 0, r: r, tier: 1, vx: 0, vy: 0, special: id, frozen: id === 'ice' ? 1 : 0 }, 1);
    } else if (kind === 'sea') {
      ctx.scale(2.4, 2.4);
      drawSeaBadge(id, 0, 0, true);
    } else if (kind === 'skill') {
      var col = id === 'swap' ? '#8E6FC0' : (id === 'ripple' ? '#2FA8A0' : (id === 'evap' ? '#E2705E' : '#3FA8B8'));
      ctx.scale(2.2, 2.2);
      drawSkillIcon(id, 0, 0, col);
    } else if (kind === 'chest') {
      ctx.scale(1.7, 1.7);
      drawChestIcon(0, 0, 1);
    } else if (kind === 'ng') {
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
