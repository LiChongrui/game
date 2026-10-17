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
    ctx.translate(C.W / 2, MG.layout.body.stackCy); // v188：涨潮横幅锚堆叠空间中心
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
  // 海域进度条：宽松段（当前得分下方、任务条同排区之上；容器开口在条下方 79+dy 空隙）
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
    // HUD（分数/进度/任务/潮汐胶囊）统一 +hudInset 平移；奖杯走 drawSkillBar 非平移路径，
    // 其 cy 同步设为 36+hudInset 与静音同高对齐。涨潮横幅 v188 起锚堆叠空间中心，不参与平移。
    trophyBtn.cy = MG.layout.hud.trophyCy + hudInset;   // 与静音(36+hudInset)同高（奖杯不参与本平移，故直接烤进坐标）
    if (hudInset > 0) { ctx.save(); ctx.translate(0, hudInset); }
    drawHUD();
    drawQuest();
    if (hudInset > 0) ctx.restore();
    drawTideBanner(); // v188：涨潮横幅锚堆叠空间中心（非 HUD 元素，不吃 hudInset 平移）
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
