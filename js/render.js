// 水滴合成深海 - render：绘制工具与全部渲染（背景 / 水滴 / 宝箱 / HUD / 面板 / 结算）
// 模块加载顺序 3/4（依赖 core+systems 的状态与画布上下文；顶层仅有渐变缓存初始化）。
// 全部 UI 画在 canvas 内（含按钮命中判定），便于后续原样移植到微信小游戏（无 DOM 环境）
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
    ctx.fillRect(0, 0, LW, VH);

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
      // 触手（5 条，长短错落、摆动相位错开）
      ctx.strokeStyle = 'rgba(' + jl.tint + ',0.55)';
      ctx.lineWidth = 1.6;
      ctx.lineCap = 'round';
      for (tt = -2; tt <= 2; tt++) {
        var tx0 = tt * jl.s * 0.28;
        var tl = jl.s * (1.8 - Math.abs(tt) * 0.2);
        ctx.beginPath();
        ctx.moveTo(tx0, jl.s * 0.1);
        ctx.quadraticCurveTo(tx0 + Math.sin(time * 2 + jl.ph + tt * 1.3) * 6, tl * 0.55,
                             tx0 + Math.sin(time * 1.3 + tt * 1.7) * 9, tl);
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
    var k;
    ctx.lineCap = 'round';
    // ---- 后层：巨藻飘带（2~4 条，高、窄、渐细，根部固定梢部摆动） ----
    var nk = Math.max(2, Math.min(4, Math.floor(w / 42)));
    for (k = 0; k < nk; k++) {
      var px = x0 + (k + 0.35) * w / nk + Math.sin(seed * 1.7 + k * 5.3) * w * 0.16;
      var h = 70 + ((k * 53 + seed * 17) % 55) + (VH - 720) * 0.16;
      h = Math.min(h, VH * 0.34);
      var sway = Math.sin(time * (0.5 + (k % 3) * 0.18) + seed + k * 2.2) * (9 + h * 0.06);
      var wB = 4.5 + (k % 3) * 1.8; // 根部半宽（梢部收敛到 0）
      var tipX = px + sway, tipY = baseY - h;
      var midX = px + sway * 0.35, midY = baseY - h * 0.55;
      var alpha = 0.16 + (k % 2) * 0.05;
      // 叶片轮廓（左右两条二次曲线在梢部汇合，形成自然渐细）
      ctx.fillStyle = 'rgba(15,64,94,' + alpha + ')';
      ctx.beginPath();
      ctx.moveTo(px - wB, baseY);
      ctx.quadraticCurveTo(midX - wB * 0.5, midY, tipX, tipY);
      ctx.quadraticCurveTo(midX + wB * 0.5, midY, px + wB, baseY);
      ctx.closePath(); ctx.fill();
      // 叶片中脉（细亮线，增加层次）
      ctx.strokeStyle = 'rgba(210,238,255,' + (alpha * 0.35) + ')';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(px, baseY - 2);
      ctx.quadraticCurveTo(midX, midY, tipX, tipY + 3);
      ctx.stroke();
    }
    // ---- 前层：短叶海草丛（簇状圆头叶，2~3 簇，每簇 3 叶） ----
    var nc = Math.max(2, Math.min(3, Math.floor(w / 55)));
    for (k = 0; k < nc; k++) {
      var cx0 = x0 + (k + 0.5) * w / nc + Math.sin(seed * 2.9 + k * 3.7) * w * 0.12;
      var ch = 20 + ((k * 31 + seed * 11) % 16);
      var lf;
      for (lf = -1; lf <= 1; lf++) {
        var lh = ch * (lf === 0 ? 1 : 0.72);
        var lsway = Math.sin(time * (0.8 + (lf + 2) * 0.22) + seed + k * 4 + lf) * (5 + lh * 0.1);
        var lwB = 2.6;
        ctx.fillStyle = 'rgba(22,84,110,' + (0.26 + (lf === 0 ? 0.08 : 0)) + ')';
        ctx.beginPath();
        ctx.moveTo(cx0 + lf * 5 - lwB, baseY);
        ctx.quadraticCurveTo(cx0 + lf * 5 - lwB * 0.4 + lsway * 0.4, baseY - lh * 0.6,
                             cx0 + lf * 5 + lsway, baseY - lh);
        ctx.quadraticCurveTo(cx0 + lf * 5 + lwB * 0.4 + lsway * 0.4, baseY - lh * 0.6,
                             cx0 + lf * 5 + lwB, baseY);
        ctx.closePath(); ctx.fill();
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

    // 边缘高光：两端渐隐的柔光弧
    ctx.save();
    ctx.globalAlpha = alpha * 0.6;
    ctx.strokeStyle = grad('bE' + b.tier + '_' + rk, function () {
      var gg = ctx.createLinearGradient(-r * 0.94, -r * 0.09, r * 0.21, -r * 0.92);
      gg.addColorStop(0, 'rgba(255,255,255,0)');
      gg.addColorStop(0.5, 'rgba(255,255,255,0.8)');
      gg.addColorStop(1, 'rgba(255,255,255,0)');
      return gg;
    });
    ctx.lineWidth = Math.max(1.2, r * 0.055);
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(0, 0, r * 0.94, Math.PI * 1.03, Math.PI * 1.57); ctx.stroke();
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
  // 彩虹滴徽记：旋转的五彩弧 + 游动星光
  function drawRainbowMark(r) {
    var hue0 = (time * 120) % 360;
    ctx.save();
    ctx.lineWidth = Math.max(2, r * 0.16);
    ctx.lineCap = 'round';
    for (var k = 0; k < 5; k++) {
      ctx.strokeStyle = 'hsla(' + ((hue0 + k * 72) % 360) + ',85%,62%,0.9)';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.72, time * 2 + k * Math.PI * 0.4, time * 2 + k * Math.PI * 0.4 + Math.PI * 0.28);
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
  function drawVortexMark(r) {    ctx.save();
    ctx.rotate(time * 4);
    ctx.strokeStyle = 'rgba(94,110,208,0.85)';
    ctx.lineWidth = Math.max(2, r * 0.09);
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (var a = 0; a < Math.PI * 3.2; a += 0.25) {
      var rr = r * 0.62 * (a / (Math.PI * 3.2));
      var x = Math.cos(a) * rr, y = Math.sin(a) * rr;
      if (a === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
    ctx.lineCap = 'butt';
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
    var ly = C.spawnY - r - 6; // 紧贴球顶，明确归属
    ctx.fillStyle = 'rgba(255,255,255,0.88)';
    roundRect(aimX - tw / 2, ly - 12, tw, 17, 8); ctx.fill();
    ctx.fillStyle = nextIron ? '#6B6353' : (nextSpecial ? specialColor(nextSpecial) : runeColor(nextRune));
    ctx.fillText(label, aimX, ly);
    ctx.restore();
  }

  // ---------- 容器：玻璃质感 + 底部焦散 ----------
  function drawContainer() {
    var floorY = FLOORY, FH = 12;
    // 海底基色：从床面到画布底一条连续渐变（泡沫白 → 青 → 深海青），先铺满
    var bed = grad('bed' + Math.round(VH), function () {
      var gg = ctx.createLinearGradient(0, floorY, 0, VH);
      gg.addColorStop(0, 'rgba(216,236,232,0.95)');
      gg.addColorStop(0.3, 'rgba(170,208,204,0.95)');
      gg.addColorStop(0.62, 'rgba(112,158,174,0.95)');
      gg.addColorStop(1, 'rgba(56,102,130,0.95)');
      return gg;
    });
    ctx.fillStyle = bed;
    ctx.fillRect(0, floorY + 4, C.W, VH - floorY - 4);
    // 床面：圆角横条（半透明玻璃质感，透出海底基色，不再有硬边界）
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

    // 海底装饰（基色已由上面的 bed 连续渐变铺满，这里只画沙丘等点缀）
    var sy0 = floorY + FH + 6;
    // 沙丘
    ctx.fillStyle = 'rgba(238,246,240,0.7)';
    ctx.beginPath(); ctx.ellipse(C.W * 0.2, sy0 + 12, 95, 13, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(C.W * 0.74, sy0 + 14, 115, 15, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(228,240,234,0.55)';
    ctx.beginPath(); ctx.ellipse(C.W * 0.47, sy0 + 18, 85, 11, 0, 0, Math.PI * 2); ctx.fill();
    // 卵石（y 相对底部：VH-720 偏移）
    ctx.fillStyle = 'rgba(110,150,168,0.4)';
    var yoff = VH - C.H;
    var peb = [[24, 688, 3], [66, 700, 2], [112, 686, 2.5], [172, 702, 2], [246, 690, 2.5], [306, 700, 2], [352, 686, 2.5], [404, 696, 2.2]];
    for (var pi = 0; pi < peb.length; pi++) {
      ctx.beginPath(); ctx.arc(peb[pi][0], peb[pi][1] + yoff, peb[pi][2], 0, Math.PI * 2); ctx.fill();
    }
    drawStarfish(88, 700 + yoff, 9);
    drawShell(330, 702 + yoff, 9);
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
    // 计分（左上角悬浮；左端让位给奖杯按钮，从 x48 起）
    ctx.textAlign = 'left';
    var bump = scoreBump > 0 ? 1 + Math.sin((0.35 - scoreBump) / 0.35 * Math.PI) * 0.12 : 1;
    ctx.lineJoin = 'round';
    ctx.save();
    ctx.translate(48, 38);
    ctx.scale(bump, bump);
    ctx.font = 'bold 34px system-ui, sans-serif';
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    var txt = String(Math.round(displayScore));
    ctx.strokeText(txt, 0, 0);
    ctx.fillStyle = '#12517E';
    ctx.fillText(txt, 0, 0);
    ctx.restore();
    // 最佳/海域/词缀：独立第二行（与大分数分行，互不挤压；大分数再宽也不碰右侧预览）
    ctx.font = '14px system-ui, sans-serif';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    var sub = '最佳 ' + best + ' · ' + C.seaStages[seaStage()].name + (seaCount > 0 ? ' · 海域 ×' + seaCount : '') +
      (ng.active ? ' · 「' + ng.active.name + '」×' + ng.active.mult : '');
    ctx.strokeText(sub, 48, 58);
    ctx.fillStyle = ng.active ? '#6B5AA8' : '#3E6E90';
    ctx.fillText(sub, 48, 58);

    // 右上角：下一滴预览 + 静音按钮（主流布局）
    ctx.textAlign = 'center';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    // 甘霖激活时标签替换为绿色脉动"甘霖"，避免悬浮文本遮挡出生区水滴
    if (rainHint > 0) {
      ctx.strokeText('甘霖 · 下一滴', C.W - 76, 18);
      ctx.fillStyle = 'rgba(30,122,111,' + (0.55 + 0.45 * Math.sin(time * 8)) + ')';
      ctx.fillText('甘霖 · 下一滴', C.W - 76, 18);
    } else {
      ctx.strokeText('下一个', C.W - 76, 18);
      ctx.fillStyle = '#3E6E90';
      ctx.fillText('下一个', C.W - 76, 18);
    }
    if (nextIron) {
      drawIronBall({ x: C.W - 76, y: 38, r: 14, vx: 0, vy: 0 }, 0.95);
    } else {
      drawBall({ x: C.W - 76, y: 38, r: 15, tier: nextTier, vx: 0, vy: 0, special: nextSpecial, rune: nextRune }, 0.95);
    }

    // 静音按钮（右上角，小号）
    drawMiniBtn(MUTE);
    ctx.save();
    ctx.translate(MUTE.cx, MUTE.cy);
    ctx.scale(0.8, 0.8);
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
    var tx = C.W - 122, tw = 92, ty = 66, th = 34; // 与任务条(qy66/qh34)同高同排
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
    ctx.translate(C.W / 2, 250);
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
  function drawLevelHud() {
    var em = Math.floor(levelElapsed / 60), es = Math.floor(levelElapsed % 60);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.lineJoin = 'round';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    var etxt = '已进行 ' + em + ':' + (es < 10 ? '0' + es : es);
    ctx.strokeText(etxt, C.W / 2, 20);
    ctx.fillStyle = '#2E7DA8';
    ctx.fillText(etxt, C.W / 2, 20);
    ctx.restore();
  }

  // ---------- 重开确认弹窗 ----------
  function drawConfirm() {
    if (!confirmOpen) return;
    ctx.fillStyle = 'rgba(10,40,70,0.55)';
    ctx.fillRect(-BX, 0, C.W + BX * 2, VH);
    var px = 60, py = 300, pw = C.W - 120, ph = 170;
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
    // 任务条：第三行左侧（两行：进度 + 星级/奖励，与任务难度匹配）
    var qw = 206, qx = 12, qy = 66, qh = 34;
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
  // 海域进度条：满宽细条，显示累计分距下一海域的进度
  // 配色：填充=当前海域深水色（与背景同族），右端小圆点=下一海域徽章色（目的地），左端骑线徽章=当前位置
  function drawSeaProgress() {
    var cur = seaStage(), ts = totalScore();
    var last = C.seaStages.length - 1;
    var maxed = cur >= last;
    var sx = 12, sy = 106, sw = C.W - 24, sh = 16;
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
    var label = maxed ? '已达最深海域 · ' + C.seaStages[last].name
      : '距「' + C.seaStages[cur + 1].name + '」还差 ' + (C.seaStages[cur + 1].at - ts) + ' 分';
    var cx = sx + sw / 2;
    ctx.strokeText(label, cx, sy + 13);
    ctx.fillStyle = '#2C5A78';
    ctx.fillText(label, cx, sy + 13);
    if (!maxed) {
      // 右端终点标记：下一海域徽章色小圆点（"要去的地方"），避免整条填充撞色
      var ex = sx + sw - 14, ey = sy + sh / 2;
      ctx.beginPath(); ctx.arc(ex, ey, 5.5, 0, Math.PI * 2);
      ctx.fillStyle = SEA_BADGES[cur + 1].c; ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 1.5; ctx.stroke();
    }
    // 左端骑线放当前海域徽章——直观标注"当前位置"（与图鉴徽章语言一致）
    drawSeaBadge(cur, sx + 16, sy + sh / 2, true);
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
    // 道具带：海底基色的柔和延续（同色系微加深，方向与渐变一致，不割裂）
    var g = grad('skbar' + Math.round(VH), function () {
      var gg = ctx.createLinearGradient(0, VH - 56, 0, VH);
      gg.addColorStop(0, 'rgba(56,102,130,0)');
      gg.addColorStop(1, 'rgba(36,78,106,0.3)');
      return gg;
    });
    ctx.fillStyle = g;
    ctx.fillRect(0, VH - 56, C.W, 56);

    var readyPulse = 0.5 + 0.5 * Math.sin(time * 5);

    drawCircleBtn(bookBtn, '#4A7FA0', 1, false, readyPulse);
    var bx = bookBtn.cx, by = bookBtn.cy;
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 1.8;
    ctx.strokeRect(bx - 8, by - 6, 16, 12);
    ctx.beginPath(); ctx.moveTo(bx, by - 6); ctx.lineTo(bx, by + 6); ctx.stroke();

    // 成就页入口（🏆 奖杯，图鉴旁；每日未全勤显红点）
    drawCircleBtn(trophyBtn, '#B8912F', 0.9, false, 0);
    var tx = trophyBtn.cx, ty = trophyBtn.cy;
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 1.8; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(tx - 6, ty - 8); ctx.lineTo(tx + 6, ty - 8); ctx.lineTo(tx + 5, ty - 1);
    ctx.quadraticCurveTo(tx, ty + 4, tx - 5, ty - 1);
    ctx.closePath(); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(tx - 6, ty - 6); ctx.quadraticCurveTo(tx - 10, ty - 6, tx - 8, ty - 1);
    ctx.moveTo(tx + 6, ty - 6); ctx.quadraticCurveTo(tx + 10, ty - 6, tx + 8, ty - 1);
    ctx.moveTo(tx, ty + 3); ctx.lineTo(tx, ty + 6);
    ctx.moveTo(tx - 4, ty + 7); ctx.lineTo(tx + 4, ty + 7);
    ctx.stroke();
    ctx.lineCap = 'butt'; ctx.lineJoin = 'miter';
    if (!(daily.done[0] && daily.done[1] && daily.done[2])) {
      ctx.fillStyle = '#E2705E';
      ctx.beginPath(); ctx.arc(tx + trophyBtn.r - 3, ty - trophyBtn.r + 3, 3.2, 0, Math.PI * 2); ctx.fill();
    }

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
    ctx.fillRect(-BX, 0, C.W + BX * 2, VH);
    var pw = 330, ph = 348, px = (C.W - pw) / 2, py = (VH - ph) / 2;
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

  // ---------- 图鉴（页签：图鉴 / 成就） ----------
  // 通用页头：左侧标题 + 右上 × 关闭（图鉴/成就共用；标题为空则不画，避免与页签重名）
  function drawPanelHeader(title) {
    ctx.textAlign = 'left';
    if (title) {
      ctx.fillStyle = '#155A8A';
      ctx.font = 'bold 19px system-ui, sans-serif';
      ctx.fillText(title, DEX_PANEL.x + 18, DEX_PANEL.y + 30);
    }
    ctx.fillStyle = 'rgba(46,134,180,0.12)';
    ctx.beginPath(); ctx.arc(dexCloseBtn.x + dexCloseBtn.w / 2, dexCloseBtn.y + dexCloseBtn.h / 2, 13, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#4A7FA0'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    var ccx = dexCloseBtn.x + dexCloseBtn.w / 2, ccy = dexCloseBtn.y + dexCloseBtn.h / 2;
    ctx.beginPath();
    ctx.moveTo(ccx - 4, ccy - 4); ctx.lineTo(ccx + 4, ccy + 4);
    ctx.moveTo(ccx + 4, ccy - 4); ctx.lineTo(ccx - 4, ccy + 4);
    ctx.stroke();
    ctx.lineCap = 'butt';
  }
  // 通用分段控件：segRects=[{x,w}...]，活动段浅蓝渐变胶囊芯片（描边+垂直居中文字）
  // 切换时芯片从旧位置平滑滑到新位置（180ms 缓动）；key 区分多套控件各自记忆位置
  // 时钟用 performance.now（渲染帧钟）：面板打开期间 update 冻结 time，但渲染照跑，动画必须能走
  var segAnims = {};
  function drawSegTabs(rects, labels, active, dotIdx, key) {
    var now = performance.now() / 1000;
    var r0 = rects[0], rl = rects[rects.length - 1];
    ctx.fillStyle = 'rgba(21,90,138,0.10)';
    roundRect(r0.x, r0.y, rl.x + rl.w - r0.x, r0.h, r0.h / 2); ctx.fill();
    // 芯片滑动动画
    var st = segAnims[key];
    if (!st) { st = segAnims[key] = { cur: active, fx: rects[active].x, fw: rects[active].w, t0: -9 }; }
    if (active !== st.cur) {
      st.cur = active; st.t0 = now;
    }
    var p = Math.min(1, (now - st.t0) / 0.18);
    p = 1 - (1 - p) * (1 - p) * (1 - p); // easeOutCubic
    var tx0 = st.fx + (rects[active].x - st.fx) * p;
    var tw0 = st.fw + (rects[active].w - st.fw) * p;
    if (p >= 1) { st.fx = rects[active].x; st.fw = rects[active].w; }
    // 芯片
    var tg = ctx.createLinearGradient(0, r0.y + 2, 0, r0.y + r0.h - 2);
    tg.addColorStop(0, '#FFFFFF'); tg.addColorStop(1, '#CFE7F6');
    ctx.fillStyle = tg;
    roundRect(tx0 + 2, r0.y + 2, tw0 - 4, r0.h - 4, (r0.h - 4) / 2); ctx.fill();
    ctx.strokeStyle = 'rgba(46,134,180,0.5)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (var i = 0; i < rects.length; i++) {
      var sr = rects[i];
      ctx.fillStyle = i === active ? '#155A8A' : '#5B7E96';
      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.fillText(labels[i], sr.x + sr.w / 2, sr.y + sr.h / 2 + 1);
      if (i === dotIdx && i !== active) { // 未全勤提醒小红点
        ctx.fillStyle = '#E2705E';
        ctx.beginPath(); ctx.arc(sr.x + sr.w - 11, sr.y + 7, 3, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.textBaseline = 'alphabetic';
  }

  function drawDex() {
    ctx.fillStyle = 'rgba(10,40,70,0.6)';
    ctx.fillRect(-BX, 0, C.W + BX * 2, VH);
    panel(DEX_PANEL.x, DEX_PANEL.y, DEX_PANEL.w, DEX_PANEL.h, 14, 0.96);
    drawPanelHeader('图鉴');

    // —— 分节切换：通栏分段控件（特殊滴槽位已并入海域演进，不再单列）——
    var secNames = ['合成链', '海域演进'];
    var secRects = [dexSecRect(0), dexSecRect(1)];
    drawSegTabs(secRects, secNames, dexSec, -1, 'dexsec');
    var curStage = seaStage(), tsNow = totalScore();
    ctx.textAlign = 'center';

    if (dexSec === 0) {
      // 合成链 3×3 大格（点击条目在底部说明区查看描述）
      for (var t = 0; t < T.length; t++) {
        var tRect = tierCellRect(t);
        var unlocked = !!dexUnlocked[t], sel = dexSelTier === t;
        ctx.fillStyle = sel ? 'rgba(46,134,180,0.16)' : 'rgba(46,134,180,0.07)';
        roundRect(tRect.x, tRect.y, tRect.w, tRect.h, 10); ctx.fill();
        if (sel) {
          ctx.strokeStyle = '#2E86B4'; ctx.lineWidth = 1.5;
          roundRect(tRect.x + 0.5, tRect.y + 0.5, tRect.w - 1, tRect.h - 1, 10); ctx.stroke();
        }
        var bx = tRect.x + tRect.w / 2, by = tRect.y + 44;
        if (unlocked) {
          drawBall({ x: bx, y: by, r: 24, tier: t, vx: 0, vy: 0 }, 1);
        } else {
          ctx.fillStyle = '#B8CBD8';
          ctx.beginPath(); ctx.arc(bx, by, 24, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#8AA5B8';
          ctx.font = 'bold 20px system-ui, sans-serif';
          ctx.fillText('?', bx, by + 6);
        }
        ctx.fillStyle = unlocked ? '#155A8A' : '#8AA5B8';
        ctx.font = 'bold 16px system-ui, sans-serif';
        ctx.fillText(unlocked ? T[t].name : '？？？', bx, tRect.y + 88);
        ctx.font = '13px system-ui, sans-serif';
        ctx.fillStyle = '#4A7FA0';
        ctx.fillText(unlocked ? ('分值 ' + T[t].score + ' · ×' + (dexCounts[t] || 0)) : '未解锁', bx, tRect.y + 108);
      }
    } else if (dexSec === 1) {

      // 海域演进纵向列表（由浅入深）：每行 = 徽章 + 海域名/状态 + 该海域 2 个特殊滴槽位
      // 已抵达：发现的显实际形态，未发现的显"？"；下一海域只显海域名+解锁积分；更深的特殊滴一律"？？？"不剧透
      ctx.textAlign = 'left';
      for (var stg = 0; stg < C.seaStages.length; stg++) {
        var ss = C.seaStages[stg];
        var sRow = stageRowRect(stg);
        var isCur = stg === curStage, reached = Math.max(tsNow, careerPeak) >= ss.at, sel = dexSelStage === stg;
        var isNext = stg === curStage + 1, hiddenStg = !isCur && !reached && !isNext;
        var rowCy = sRow.y + sRow.h / 2;
        if (isCur) {
          // 当前海域行铺该海域背景主题色（bg 渐变中段→深段，与游戏内一致）
          var rowG = ctx.createLinearGradient(sRow.x, 0, sRow.x + sRow.w, 0);
          rowG.addColorStop(0, ss.bg[2]);
          rowG.addColorStop(1, ss.bg[3]);
          ctx.fillStyle = rowG;
        } else if (reached) { // 已抵达：铺该海域背景主题色的浅底
          ctx.globalAlpha = 0.45;
          ctx.fillStyle = ss.bg[1];
          roundRect(sRow.x, sRow.y, sRow.w, sRow.h, 9); ctx.fill();
          ctx.globalAlpha = 1;
        } else {
          ctx.fillStyle = 'rgba(120,145,165,0.10)';
        }
        if (isCur || !reached) { roundRect(sRow.x, sRow.y, sRow.w, sRow.h, 9); ctx.fill(); }
        if (sel) {
          ctx.strokeStyle = '#2E86B4'; ctx.lineWidth = 1.5;
          roundRect(sRow.x + 0.5, sRow.y + 0.5, sRow.w - 1, sRow.h - 1, 9); ctx.stroke();
        }
        // 左侧：海域专属徽章（当前=脉冲环 / 已抵达·下一海域=彩/灰徽 / 更深海域不显示图标）
        var dotX = sRow.x + 20, dotY = rowCy;
        if (isCur) {
          ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(dotX, dotY, 12.5 + Math.sin(time * 4) * 1.2, 0, Math.PI * 2); ctx.stroke();
        }
        if (isCur || reached || isNext) drawSeaBadge(stg, dotX, dotY, reached || isCur);
        ctx.fillStyle = isCur ? '#FFFFFF' : (reached ? '#155A8A' : '#8AA5B8');
        ctx.font = 'bold 15px system-ui, sans-serif';
        if (isCur) {
          ctx.lineJoin = 'round'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(10,50,80,0.35)';
          ctx.strokeText(isCur || reached || isNext ? ss.name : '？？？', dotX + 15, rowCy - 3);
        }
        ctx.fillText(isCur || reached || isNext ? ss.name : '？？？', dotX + 15, rowCy - 3);
        ctx.font = '11px system-ui, sans-serif';
        ctx.fillStyle = isCur ? 'rgba(255,255,255,0.92)' : (reached ? '#1E7A6F' : (isNext ? '#7A98AC' : '#B0584A'));
        var gateTxt = isCur ? '当前海域' : (isNext ? '下一海域 · 累计' + (ss.at >= 10000 ? (ss.at / 10000) + '万' : ss.at) + '分' : '累计 ' + (ss.at >= 10000 ? (ss.at / 10000) + '万' : ss.at) + ' 分解锁');
        if (isCur) ctx.strokeText(gateTxt, dotX + 15, rowCy + 11);
        ctx.fillText(gateTxt, dotX + 15, rowCy + 11);
        // 右侧：该海域的 2 个特殊滴槽位（点击查看说明）
        var slots2 = STAGE_SP_SLOTS[stg] || STAGE_SP_SLOTS[0];
        for (var sl = 0; sl < 2; sl++) {
          var slotR = spSlotRect(stg, sl);
          var spIdx2 = slots2[sl];
          var isChest2 = spIdx2 === SP_DEFS.length;
          var spDef2 = isChest2 ? null : SP_DEFS[spIdx2];
          var found2 = !!dexSpecial[isChest2 ? 'chest' : spDef2.key]; // 宝箱同样以首次沉入场中为发现条件
          if (dexSelSp === spIdx2 && dexSelStage < 0) {
            ctx.fillStyle = 'rgba(46,134,180,0.14)';
            roundRect(slotR.x, slotR.y, slotR.w, slotR.h, 8); ctx.fill();
            ctx.strokeStyle = '#2E86B4'; ctx.lineWidth = 1.2;
            roundRect(slotR.x + 0.5, slotR.y + 0.5, slotR.w - 1, slotR.h - 1, 8); ctx.stroke();
          }
          var cx2 = slotR.x + 14, cy2 = rowCy;
          if ((hiddenStg || isNext) && !reached) { // 生涯未抵达：虚线空位 + "？？？"（特殊滴内容不剧透，海域名/解锁积分仍可见）
            ctx.save();
            ctx.setLineDash([3, 3]);
            ctx.strokeStyle = '#A8BCCB'; ctx.lineWidth = 1;
            roundRect(slotR.x + 0.5, slotR.y + 0.5, slotR.w - 1, slotR.h - 1, 8); ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = '#A8BCCB';
            ctx.font = '11px system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('？？？', slotR.x + slotR.w / 2, cy2 + 3);
            ctx.textAlign = 'left';
            ctx.restore();
            continue;
          }
          if (found2) {
            drawSpForm(spIdx2, cx2, cy2);
          } else {
            // 未发现：实底浅灰圆 + 虚线圈 + 深色问号（够醒目）
            ctx.fillStyle = 'rgba(196,212,224,0.55)';
            ctx.beginPath(); ctx.arc(cx2, cy2, 9, 0, Math.PI * 2); ctx.fill();
            ctx.setLineDash([2.5, 2.5]);
            ctx.strokeStyle = '#5E7E96'; ctx.lineWidth = 1.2;
            ctx.beginPath(); ctx.arc(cx2, cy2, 10.8, 0, Math.PI * 2); ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = '#3E647E';
            ctx.font = 'bold 14px system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('?', cx2, cy2 + 4);
            ctx.textAlign = 'left';
          }
          ctx.fillStyle = found2 ? '#155A8A' : '#4E6E86';
          ctx.font = '11px system-ui, sans-serif';
          ctx.fillText(found2 ? (isChest2 ? '宝箱' : spDef2.name) : '？？？', slotR.x + 33, cy2 + 3);
        }
      }
      ctx.textAlign = 'center';
    }

    // —— 说明区：合成链 / 海域 / 特殊滴·宝箱 三类条目通用 ——
    var title, sub, body, known = true;
    if (dexSelTier >= 0) {
      var tu = !!dexUnlocked[dexSelTier];
      known = tu;
      title = tu ? T[dexSelTier].name : '？？？';
      sub = tu ? ('分值 ' + T[dexSelTier].score + ' · 累计合成 ×' + (dexCounts[dexSelTier] || 0)) : '未解锁';
      body = tu ? '与同档水滴相触即合成更高阶。' : '继续合成，遇见它便会点亮。';
    } else if (dexSelStage >= 0) {
      var stgS = C.seaStages[dexSelStage];
      var stgReached = Math.max(tsNow, careerPeak) >= stgS.at, stgCur = dexSelStage === curStage;
      title = stgReached || stgCur ? stgS.name : '？？？';
      sub = stgCur ? '当前海域' : (stgReached ? '已抵达' : ('累计 ' + (stgS.at >= 10000 ? (stgS.at / 10000) + '万' : stgS.at) + ' 分解锁'));
      body = '越深水色越暗：潮汐更频、礁石更多。';
    } else {
      var CHEST_INFO = { key: 'chest', name: '宝箱', desc: '沉底木箱，沉走前点开：得分或充能。' };
      var isChestSel = dexSelSp === SP_DEFS.length;
      var dsc = isChestSel ? CHEST_INFO : (SP_DEFS[dexSelSp] || SP_DEFS[0]);
      known = !!dexSpecial[isChestSel ? 'chest' : dsc.key];
      title = known ? dsc.name : '？？？';
      sub = known ? (isChestSel ? '深海随机事件' : '已发现') : '未发现';
      body = known ? dsc.desc : '在海域中发现它即可点亮说明。';
    }
    // 说明区：贴面板底部（消除底部大片空白）
    ctx.fillStyle = 'rgba(46,134,180,0.10)';
    roundRect(DEX_PANEL.x + 12, DEX_PANEL.y + 478, DEX_PANEL.w - 24, 68, 8); ctx.fill();
    ctx.textAlign = 'left';
    ctx.fillStyle = known ? '#155A8A' : '#8AA5B8';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.fillText(title, DEX_PANEL.x + 24, DEX_PANEL.y + 498);
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillStyle = known ? '#1E7A6F' : '#B0584A';
    ctx.fillText(sub, DEX_PANEL.x + 24, DEX_PANEL.y + 516);
    ctx.fillStyle = '#4A7FA0';
    ctx.fillText(body, DEX_PANEL.x + 24, DEX_PANEL.y + 536);
    ctx.textAlign = 'center';
  }

  // 成就页（独立入口，与图鉴拆分）：成就 / 每日 / 榜单
  function drawAchPanel() {
    ctx.fillStyle = 'rgba(10,40,70,0.6)';
    ctx.fillRect(-BX, 0, C.W + BX * 2, VH);
    panel(DEX_PANEL.x, DEX_PANEL.y, DEX_PANEL.w, DEX_PANEL.h, 14, 0.96);
    // 页头标题随页签联动：与页签名错开（页签是入口，标题是场景语境），同图鉴「图鉴」页头的层级感
    var achTitles = ['成就殿堂', '每日任务', '好友排行榜'];
    drawPanelHeader(achTitles[dexTab] || '成就殿堂');
    var dailyDot = !(daily.done[0] && daily.done[1] && daily.done[2]) ? 1 : -1;
    drawSegTabs([achTabRect(0), achTabRect(1), achTabRect(2)], ['成就', '每日', '榜单'], dexTab, dailyDot, 'achtabs');
    if (dexTab === 1) drawDailyTab();
    else if (dexTab === 2) drawRankTab();
    else drawAchTab();
  }

  // 图鉴/海域演进用迷你宝箱图标：与场上宝箱（drawChest）同款金色渐变+铜箍铆钉+缝光+金锁+描金边，缩比复刻
  function drawChestIcon(cx, cy, sc) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(sc || 1, sc || 1);
    var glow = 0.3 + 0.15 * Math.sin(time * 3);
    var gg = ctx.createRadialGradient(0, 0, 2, 0, 0, 22);
    gg.addColorStop(0, 'rgba(255,208,96,' + glow + ')');
    gg.addColorStop(1, 'rgba(255,208,96,0)');
    ctx.fillStyle = gg;
    ctx.beginPath(); ctx.arc(0, 0, 22, 0, Math.PI * 2); ctx.fill();
    // 与场上宝箱同构（w=1.6r, h=1.3r, r=18）：同渐变同细节
    var w = 28.8, h = 23.4, seamY = -h * 0.06;
    ctx.fillStyle = grad('chestLidI', function () {
      var gg2 = ctx.createLinearGradient(0, -h * 0.62, 0, seamY);
      gg2.addColorStop(0, '#F4C866'); gg2.addColorStop(0.55, '#DDA948'); gg2.addColorStop(1, '#B98430');
      return gg2;
    });
    ctx.beginPath();
    ctx.moveTo(-w / 2, seamY);
    ctx.quadraticCurveTo(0, -h * 0.72, w / 2, seamY);
    ctx.closePath(); ctx.fill();
    // 盖顶弧形高光
    ctx.strokeStyle = 'rgba(255,240,190,0.5)'; ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-w * 0.34, -h * 0.30);
    ctx.quadraticCurveTo(0, -h * 0.62, w * 0.34, -h * 0.30);
    ctx.stroke();
    // 箱身（中段受光、底角沉影）
    ctx.fillStyle = grad('chestBodyI', function () {
      var gg2 = ctx.createLinearGradient(0, seamY, 0, h * 0.56);
      gg2.addColorStop(0, '#D8A44C'); gg2.addColorStop(0.5, '#C08A38'); gg2.addColorStop(1, '#8F5E22');
      return gg2;
    });
    roundRect(-w / 2, seamY, w, h * 0.62, 2.5); ctx.fill();
    // 木板竖缝
    ctx.strokeStyle = 'rgba(110,66,20,0.45)'; ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-w * 0.17, seamY + 2); ctx.lineTo(-w * 0.17, h * 0.52);
    ctx.moveTo(w * 0.17, seamY + 2); ctx.lineTo(w * 0.17, h * 0.52);
    ctx.stroke();
    // 铜箍 ×2 + 亮金铆钉
    ctx.fillStyle = '#7A4E1C';
    roundRect(-w * 0.42, -h * 0.36, 3.6, h * 0.9, 1.6); ctx.fill();
    roundRect(w * 0.42 - 3.6, -h * 0.36, 3.6, h * 0.9, 1.6); ctx.fill();
    ctx.fillStyle = '#FFE6A6';
    ctx.beginPath();
    ctx.arc(-w * 0.42 + 1.8, -h * 0.2, 0.9, 0, Math.PI * 2);
    ctx.arc(w * 0.42 - 1.8, -h * 0.2, 0.9, 0, Math.PI * 2);
    ctx.arc(-w * 0.42 + 1.8, h * 0.34, 0.9, 0, Math.PI * 2);
    ctx.arc(w * 0.42 - 1.8, h * 0.34, 0.9, 0, Math.PI * 2);
    ctx.fill();
    // 盖缝透光（呼吸）
    var seamG = 0.26 + 0.24 * Math.sin(time * 3 + 1);
    ctx.fillStyle = 'rgba(255,224,130,' + seamG.toFixed(2) + ')';
    roundRect(-w * 0.4, seamY - 1, w * 0.8, 2, 1); ctx.fill();
    // 金锁 + 锁孔
    ctx.fillStyle = '#FFD873';
    roundRect(-3.6, seamY - 2.5, 7.2, 8, 2); ctx.fill();
    ctx.fillStyle = '#5A3A14';
    ctx.beginPath(); ctx.arc(0, seamY + 1, 1.3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-0.7, seamY + 1.8); ctx.lineTo(0.7, seamY + 1.8);
    ctx.lineTo(0.45, seamY + 4.2); ctx.lineTo(-0.45, seamY + 4.2);
    ctx.closePath(); ctx.fill();
    // 描金边（盖弧 + 箱身）
    ctx.strokeStyle = 'rgba(242,193,78,0.85)'; ctx.lineWidth = 1.1;
    roundRect(-w / 2, seamY, w, h * 0.62, 2.5); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-w / 2, seamY);
    ctx.quadraticCurveTo(0, -h * 0.72, w / 2, seamY);
    ctx.stroke();
    ctx.restore();
  }

  // 海域徽章：每片海域专属颜色 + 图形（图鉴列表用，便于一眼区分）
  var SEA_BADGES = [
    { c: '#3BB8D8', g: 'pool' },    // 潮汐池：波浪
    { c: '#38A98A', g: 'coral' },   // 珊瑚浅海：珊瑚枝（绿=海域主题色，珊瑚也有绿色的）
    { c: '#2E9BD4', g: 'bubbles' }, // 蔚蓝深海：气泡
    { c: '#4A5FB4', g: 'star' },    // 午夜深渊：夜星
    { c: '#647FA8', g: 'moon' },    // 月光环礁：月牙（银蓝=月下海面色，不用金色抢主题）
    { c: '#2A4C8A', g: 'eye' },     // 海沟之眼：海之眼
    { c: '#B85C3A', g: 'vent' },    // 热泉裂谷：热泉火苗（暗锈橙=热泉褐岩色）
    { c: '#8A5FB4', g: 'crown' }    // 深渊王座：王冠
  ];
  function drawSeaBadge(stg, x, y, reached) {
    var ic = SEA_BADGES[stg] || SEA_BADGES[0];
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2);
    if (reached) {
      ctx.fillStyle = ic.c; ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 1; ctx.stroke();
    } else {
      ctx.fillStyle = 'rgba(120,145,165,0.16)'; ctx.fill();
      ctx.strokeStyle = '#8AA5B8'; ctx.lineWidth = 1; ctx.stroke();
    }
    var fg = reached ? '#FFFFFF' : '#8AA5B8';
    ctx.strokeStyle = fg; ctx.fillStyle = fg;
    ctx.lineWidth = 1.4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    switch (ic.g) {
      case 'pool': // 双波浪线
        ctx.moveTo(-5.5, -2.5); ctx.quadraticCurveTo(-2.8, -5.5, 0, -2.5); ctx.quadraticCurveTo(2.8, 0.5, 5.5, -2.5);
        ctx.moveTo(-5.5, 3.5); ctx.quadraticCurveTo(-2.8, 0.5, 0, 3.5); ctx.quadraticCurveTo(2.8, 6.5, 5.5, 3.5);
        ctx.stroke(); break;
      case 'coral': // 珊瑚枝
        ctx.moveTo(0, 5); ctx.lineTo(0, -1);
        ctx.moveTo(0, 0); ctx.lineTo(-3.5, -4.5);
        ctx.moveTo(0, 1); ctx.lineTo(3.5, -2.5);
        ctx.moveTo(-3.5, -4.5); ctx.lineTo(-2, -5.5);
        ctx.stroke(); break;
      case 'bubbles': // 三粒气泡
        ctx.arc(-2.5, 3, 1.7, 0, Math.PI * 2);
        ctx.moveTo(1.8, -0.5); ctx.arc(0.8, -0.5, 1.1, 0, Math.PI * 2);
        ctx.moveTo(3.4, -3.8); ctx.arc(3, -3.8, 0.6, 0, Math.PI * 2);
        ctx.stroke(); break;
      case 'star': // 四角夜星
        ctx.moveTo(0, -5); ctx.quadraticCurveTo(0.9, -0.9, 5, 0);
        ctx.quadraticCurveTo(0.9, 0.9, 0, 5);
        ctx.quadraticCurveTo(-0.9, 0.9, -5, 0);
        ctx.quadraticCurveTo(-0.9, -0.9, 0, -5);
        ctx.fill(); break;
      case 'moon': // 月牙（叠圆裁出）
        ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = reached ? ic.c : 'rgba(120,145,165,0.16)'; // 补底圆与徽底同色，未抵达不显彩
        ctx.beginPath(); ctx.arc(2.2, -1.6, 4.4, 0, Math.PI * 2); ctx.fill(); break;
      case 'eye': // 海之眼
        ctx.ellipse(0, 0, 5.2, 3.1, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 0, 1.7, 0, Math.PI * 2); ctx.fill(); break;
      case 'vent': // 热泉火苗
        ctx.moveTo(0, -5.5); ctx.quadraticCurveTo(4.5, -0.5, 2.2, 4.5);
        ctx.lineTo(-2.2, 4.5); ctx.quadraticCurveTo(-4.5, -0.5, 0, -5.5);
        ctx.fill(); break;
      case 'crown': // 王冠
        ctx.moveTo(-5, 3.5); ctx.lineTo(-5, -2); ctx.lineTo(-2.2, 0.2);
        ctx.lineTo(0, -4.2); ctx.lineTo(2.2, 0.2); ctx.lineTo(5, -2);
        ctx.lineTo(5, 3.5); ctx.closePath(); ctx.fill(); break;
    }
    ctx.restore();
  }

  // 图鉴内特殊滴的实际形态（小尺寸）：礁石=岩石 / 符文滴=水滴+符文牌 / 宝箱=迷你木箱 / 其余=水滴+专属标记
  function drawSpForm(spIdx, x, y) {
    if (spIdx === SP_DEFS.length) { drawChestIcon(x, y, 0.55); return; }
    var key = SP_DEFS[spIdx].key;
    if (key === 'iron') { drawIronBall({ x: x, y: y, r: 11, vx: 0, vy: 0 }, 1); return; }
    if (key === 'rune') { drawBall({ x: x, y: y, r: 11, tier: 1, vx: 0, vy: 0, rune: 'ripple' }, 1); return; }
    drawBall({ x: x, y: y, r: 11, tier: 1, vx: 0, vy: 0, special: key, frozen: key === 'ice' ? 1 : 0 }, 1);
  }

  // 成就页签：常驻目标列表（跨局累计，达成给分与充能奖励）
  function drawAchTab() {
    ctx.textAlign = 'center';
    // 双列紧凑布局（12 项成就）：难度看星数、奖励看卡片内一行，页首不再放说明行
    var cw = 178, ch = 70, gap = 8;
    for (var i = 0; i < ACH_DEFS.length; i++) {
      var a = ACH_DEFS[i];
      var cx0 = DEX_PANEL.x + 14 + (i % 2) * (cw + gap);
      var ry = DEX_PANEL.y + 86 + Math.floor(i / 2) * (ch + gap);
      var done = !!achDone[a.id];
      var cur = Math.min(a.target, a.cur());
      var d = a.diff || 1;
      ctx.fillStyle = done ? 'rgba(245,197,66,0.14)' : (d === 3 ? 'rgba(150,110,220,0.08)' : 'rgba(46,134,180,0.07)');
      roundRect(cx0, ry, cw, ch, 8); ctx.fill();
      // 难度色左饰条（达成转金）
      ctx.fillStyle = done ? '#F5C542' : (d === 3 ? '#9B7FD0' : (d === 2 ? '#C99B3F' : '#8FB4CC'));
      roundRect(cx0, ry + 10, 3, ch - 20, 1.5); ctx.fill();
      ctx.textAlign = 'left';
      // 名称 + 难度星（达成金色，未达成灰蓝）
      ctx.fillStyle = done ? '#B8860B' : (d === 3 ? '#6B5AA8' : '#155A8A');
      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.fillText((done ? '✓ ' : '') + a.name, cx0 + 10, ry + 16);
      ctx.textAlign = 'right';
      ctx.fillStyle = d === 3 ? '#9B7FD0' : (d === 2 ? '#C99B3F' : '#9AB4C4');
      ctx.font = '11px system-ui, sans-serif';
      var starTxt = '';
      for (var st = 0; st < d; st++) starTxt += '★';
      ctx.fillText(starTxt, cx0 + cw - 10, ry + 15);
      ctx.textAlign = 'left';
      // 描述（一行截断：双列较窄，超宽省略）
      ctx.fillStyle = '#4A7FA0';
      ctx.font = '11px system-ui, sans-serif';
      var desc = a.desc;
      while (ctx.measureText(desc).width > cw - 20 && desc.length > 4) desc = desc.slice(0, -2);
      if (desc !== a.desc) desc += '…';
      ctx.fillText(desc, cx0 + 10, ry + 31);
      // 奖励说明
      ctx.fillStyle = done ? '#1E7A6F' : '#9AB4C4';
      ctx.font = '10px system-ui, sans-serif';
      var perk = a.perk;
      while (ctx.measureText(perk).width > cw - 20 && perk.length > 4) perk = perk.slice(0, -2);
      if (perk !== a.perk) perk += '…';
      ctx.fillText(perk, cx0 + 10, ry + 43);
      // 进度条（左）+ 状态文字（右，同一行垂直居中，不再压在条上）
      var barX = cx0 + 10, barW = cw - 64, barY = ry + 52;
      ctx.fillStyle = 'rgba(46,134,180,0.15)';
      roundRect(barX, barY, barW, 9, 4.5); ctx.fill();
      ctx.fillStyle = done ? '#F5C542' : '#2E86B4';
      if (cur > 0) { roundRect(barX, barY, Math.max(9, barW * cur / a.target), 9, 4.5); ctx.fill(); }
      ctx.textAlign = 'right';
      ctx.fillStyle = done ? '#B8860B' : '#4A7FA0';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.fillText(done ? '已达成' : (cur + '/' + a.target), cx0 + cw - 10, barY + 8);
    }
  }

  // 每日页签：3 个按日期生成的任务（独立说明行已删，卡片上移放大）
  function drawDailyTab() {
    for (var i = 0; i < daily.tasks.length; i++) {
      var t = daily.tasks[i], done = daily.done[i];
      var ry = DEX_PANEL.y + 92 + i * 106;
      ctx.fillStyle = done ? 'rgba(245,197,66,0.14)' : 'rgba(46,134,180,0.07)';
      roundRect(DEX_PANEL.x + 14, ry, DEX_PANEL.w - 28, 84, 10); ctx.fill();
      // 达成金饰条
      if (done) { ctx.fillStyle = '#F5C542'; roundRect(DEX_PANEL.x + 14, ry + 10, 3, 64, 1.5); ctx.fill(); }
      ctx.textAlign = 'left';
      ctx.fillStyle = done ? '#B8860B' : '#155A8A';
      ctx.font = 'bold 16px system-ui, sans-serif';
      ctx.fillText((done ? '✓ ' : '') + t.text, DEX_PANEL.x + 26, ry + 26);
      // 难度星级（右侧）+ 分级奖励
      ctx.textAlign = 'right';
      ctx.fillStyle = (t.stars || 1) === 3 ? '#9B7FD0' : ((t.stars || 1) === 2 ? '#C99B3F' : '#9AB4C4');
      ctx.font = '13px system-ui, sans-serif';
      var dstar = '';
      for (var ds = 0; ds < (t.stars || 1); ds++) dstar += '★';
      ctx.fillText(dstar, DEX_PANEL.x + DEX_PANEL.w - 26, ry + 24);
      ctx.textAlign = 'left';
      ctx.fillStyle = '#4A7FA0';
      ctx.font = '14px system-ui, sans-serif';
      ctx.fillText('奖励 +' + Math.round(C.daily.rewardScore * (1 + ((t.stars || 1) - 1) * 0.5)) + ' 分', DEX_PANEL.x + 26, ry + 50);
      // 进度条
      var barX = DEX_PANEL.x + 26, barW = DEX_PANEL.w - 120, barY = ry + 62;
      ctx.fillStyle = 'rgba(46,134,180,0.15)';
      roundRect(barX, barY, barW, 9, 4.5); ctx.fill();
      if (daily.prog[i] > 0) {
        ctx.fillStyle = done ? '#F5C542' : '#2E86B4';
        roundRect(barX, barY, Math.max(6, barW * daily.prog[i] / t.need), 9, 4.5); ctx.fill();
      }
      ctx.textAlign = 'center';
      ctx.fillStyle = done ? '#B8860B' : '#4A7FA0';
      ctx.font = '13px system-ui, sans-serif';
      ctx.fillText(done ? '已完成' : (daily.prog[i] + '/' + t.need), barX + barW + 34, barY + 9);
      ctx.textAlign = 'left';
    }
  }

  // 榜单页签：本地好友榜（预留微信排行榜接口位）
  function drawRankTab() {
    var rows = friendBoard();
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      var ry = DEX_PANEL.y + 86 + i * 50;
      ctx.fillStyle = r.me ? 'rgba(245,197,66,0.16)' : (i % 2 ? 'rgba(46,134,180,0.05)' : 'rgba(46,134,180,0.09)');
      roundRect(DEX_PANEL.x + 14, ry, DEX_PANEL.w - 28, 42, 9); ctx.fill();
      // 名次徽章（序号必须显式居中：上一轮循环末尾的 textAlign 会污染到这里）
      var badge = ['#F5C542', '#B9C4CC', '#D2955B'][i] || 'rgba(46,134,180,0.35)';
      ctx.fillStyle = badge;
      ctx.beginPath(); ctx.arc(DEX_PANEL.x + 38, ry + 21, 12, 0, Math.PI * 2); ctx.fill();
      ctx.textAlign = 'center';
      ctx.fillStyle = i < 3 ? '#FFFFFF' : '#3E6E90';
      ctx.font = 'bold 14px system-ui, sans-serif';
      ctx.fillText(String(i + 1), DEX_PANEL.x + 38, ry + 26);
      ctx.textAlign = 'left';
      ctx.fillStyle = r.me ? '#B8860B' : '#155A8A';
      ctx.font = (r.me ? 'bold ' : '') + '16px system-ui, sans-serif';
      ctx.fillText(r.me ? r.name + '（你）' : r.name, DEX_PANEL.x + 60, ry + 26);
      ctx.textAlign = 'right';
      ctx.fillStyle = r.me ? '#B8860B' : '#3E6E90';
      ctx.font = 'bold 16px system-ui, sans-serif';
      ctx.fillText(String(r.score), DEX_PANEL.x + DEX_PANEL.w - 26, ry + 26);
      ctx.textAlign = 'left';
    }
  }

  // 战报分享卡片（结算页"分享战报"打开；上线后接 wx.shareAppMessage）
  function drawShare() {
    if (!shareOpen) return;
    ctx.fillStyle = 'rgba(10,40,70,0.6)';
    ctx.fillRect(-BX, 0, C.W + BX * 2, VH);
    var pw = 300, ph = 420, px = (C.W - pw) / 2, py = 160;
    panel(px, py, pw, ph, 16, 0.97);
    // 卡片头：深海渐变 + 标题
    var head = ctx.createLinearGradient(0, py, 0, py + 96);
    head.addColorStop(0, '#2E86B4'); head.addColorStop(1, '#155A8A');
    ctx.fillStyle = head;
    roundRect(px, py, pw, 96, 16); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    roundRect(px, py + 80, pw, 16, 8); ctx.fill();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 25px system-ui, sans-serif';
    ctx.fillText('水滴合成深海 · 深海战报', C.W / 2, py + 40);
    ctx.font = '14px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillText(C.seaStages[seaStage()].name + ' · ' + daily.date, C.W / 2, py + 66);
    // 大分数
    ctx.font = 'bold 58px system-ui, sans-serif';
    ctx.fillStyle = '#0F4C79';
    ctx.fillText(String(score), C.W / 2, py + 168);
    ctx.font = '15px system-ui, sans-serif';
    ctx.fillStyle = '#4A7FA0';
    var isNewBest = score >= best && score > 0;
    ctx.fillText(isNewBest ? '★ 新纪录！' : '最佳 ' + best, C.W / 2, py + 192);
    // 统计格
    var stats = [['最高连击', '×' + Math.max(1, maxCombo)], ['汇入海域', '×' + seaCount], ['当前海域', C.seaStages[seaStage()].name]];
    for (var i = 0; i < stats.length; i++) {
      var sx = px + 30 + i * ((pw - 60) / 3), sw = (pw - 60) / 3;
      ctx.fillStyle = 'rgba(46,134,180,0.08)';
      roundRect(sx, py + 214, sw - 8, 54, 8); ctx.fill();
      ctx.fillStyle = '#155A8A';
      ctx.font = 'bold 18px system-ui, sans-serif';
      ctx.fillText(stats[i][1], sx + (sw - 8) / 2, py + 240);
      ctx.fillStyle = '#4A7FA0';
      ctx.font = '13px system-ui, sans-serif';
      ctx.fillText(stats[i][0], sx + (sw - 8) / 2, py + 258);
    }
    // 分享文案预览（左对齐 + 按行数自适应盒高）
    ctx.textAlign = 'left';
    ctx.font = '14px system-ui, sans-serif';
    var shLines = wrapLines(shareText, pw - 60);
    var shBoxH = Math.max(44, 20 + shLines.length * 16);
    ctx.fillStyle = 'rgba(46,134,180,0.06)';
    roundRect(px + 20, py + 278, pw - 40, shBoxH, 8); ctx.fill();
    ctx.fillStyle = '#3E6E90';
    for (var li = 0; li < shLines.length; li++) ctx.fillText(shLines[li], px + 32, py + 296 + li * 16);
    ctx.textAlign = 'center';
    // 按钮：复制文案 / 关闭（关闭提示放按钮上方，避免贴面板底边被圆角裁切）
    shareCopyBtn.x = px + 20; shareCopyBtn.y = py + ph - 62; shareCopyBtn.w = pw - 40; shareCopyBtn.h = 42;
    ctx.font = '14px system-ui, sans-serif';
    ctx.fillStyle = '#8AA5B8';
    ctx.fillText('点击卡片外任意位置关闭', C.W / 2, shareCopyBtn.y - 12);
    var bg2 = ctx.createLinearGradient(0, shareCopyBtn.y, 0, shareCopyBtn.y + 42);
    bg2.addColorStop(0, '#3B9BD0'); bg2.addColorStop(1, '#2578A8');
    ctx.fillStyle = bg2;
    roundRect(shareCopyBtn.x, shareCopyBtn.y, shareCopyBtn.w, shareCopyBtn.h, 12); ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 19px system-ui, sans-serif';
    ctx.fillText('复制分享文案', C.W / 2, shareCopyBtn.y + 27);
  }
  function wrapLines(text, maxW) {
    var lines = [], line = '';
    for (var i = 0; i < text.length; i++) {
      var test = line + text[i];
      if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = text[i]; }
      else line = test;
    }
    if (line) lines.push(line);
    return lines;
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
    ctx.fillRect(-BX, 0, C.W + BX * 2, VH);
    ctx.strokeStyle = 'rgba(160,220,255,0.25)';
    ctx.lineWidth = 1.2;
    for (var i = 0; i < 8; i++) {
      var bx2 = 40 + i * 48 + Math.sin(time * 1.2 + i * 2.2) * 10;
      var by2 = (VH + 20) - ((time * 46 + i * 97) % (VH + 40));
      ctx.beginPath(); ctx.arc(bx2, by2, 3 + (i % 3), 0, Math.PI * 2); ctx.stroke();
    }
    // 漂流瓶（随水流轻摆）
    ctx.save();
    ctx.translate(C.W / 2, VH / 2 - 64);
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
    ctx.fillText('深海漂流瓶 · 激励视频', C.W / 2, VH / 2 + 26);
    ctx.font = '18px system-ui, sans-serif';
    ctx.fillText(adOverlay.label + ' · ' + adOverlay.t.toFixed(1) + 's 后发放奖励', C.W / 2, VH / 2 + 52);
    ctx.font = '14px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillText('（演示占位：上线微信时替换为 wx.createRewardedVideoAd）', C.W / 2, VH / 2 + 78);
  }

  function drawOver() {
    buildOverButtons();
    ctx.fillStyle = 'rgba(10,40,70,0.55)';
    ctx.fillRect(-BX, 0, C.W + BX * 2, VH);

    var pw = 320, ph = 436, px = (C.W - pw) / 2, py = 150;
    panel(px, py, pw, ph, 16, 0.97);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#155A8A';
    ctx.font = 'bold 28px system-ui, sans-serif';
    ctx.fillText('本局结束', C.W / 2, py + 44);
    ctx.font = 'bold 53px system-ui, sans-serif';
    ctx.fillStyle = '#0F4C79';
    ctx.fillText(String(score), C.W / 2, py + 98);
    ctx.font = '18px system-ui, sans-serif';
    ctx.fillStyle = '#4A7FA0';
    var isNewBest = score >= best && score > 0;
    var statusLine = doubled ? '已双倍结算'
      : (isNewBest ? '★ 新纪录！'
      : ('最佳 ' + best));
    ctx.fillText(statusLine, C.W / 2, py + 126);
    if (maxCombo > 1) {
      ctx.fillText('本局最高连击 ×' + maxCombo + (seaCount > 0 ? ' · 汇入海域 ×' + seaCount : ''), C.W / 2, py + 148);
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
    var ty = 480;
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
    ctx.fillRect(-BX, 0, C.W + BX * 2, VH);

    ctx.textAlign = 'center';
    var pulse = 0.5 + 0.5 * Math.sin(time * 2.4);

    // 标题（双描层：暗色投影 + 白蓝渐变）
    ctx.font = 'bold 46px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(10,40,70,0.55)';
    ctx.fillText('水滴合成深海', C.W / 2 + 2, 220);
    var tg = ctx.createLinearGradient(0, 180, 0, 224);
    tg.addColorStop(0, '#FFFFFF');
    tg.addColorStop(1, '#BDE8FF');
    ctx.fillStyle = tg;
    ctx.fillText('水滴合成深海', C.W / 2, 218);
    ctx.font = '16px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(230,246,255,0.85)';
    ctx.fillText('合成大水滴 · 汇入无垠深海', C.W / 2, 252);

    // 历史最佳
    if (best > 0) {
      ctx.font = '14px system-ui, sans-serif';
      ctx.fillStyle = 'rgba(230,246,255,0.6)';
      ctx.fillText('历史最佳 ' + best, C.W / 2, 294);
    }

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
    ctx.textBaseline = 'middle';
    ctx.fillText('开 始 游 戏', C.W / 2, b.y + b.h / 2 + 1);
    ctx.textBaseline = 'alphabetic';

    // 底部玩法一句话
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(220,240,255,0.5)';
    ctx.fillText('投放水滴 · 同级相融合成 · 小心警戒线', C.W / 2, VH - 56);
  }

  // ---------- 主渲染 ----------
  function render() {
    // 逻辑坐标 → 设备像素：dpr × view.s（画布铺满窗口后，缩放必须在变换里完成）
    ctx.setTransform(dpr * view.s, 0, 0, dpr * view.s, 0, 0);

    if (shakeT > 0) {
      var s = shakeAmp * (shakeT / 0.4);
      ctx.translate((Math.random() - 0.5) * 2 * s, (Math.random() - 0.5) * 2 * s);
    }

    drawBackground();

    // 游戏区（420 逻辑宽）水平居中：整体平移 BX，两侧为延伸海水
    ctx.save();
    ctx.translate(BX, 0);

    if (state === 'menu') { drawMenu(); ctx.restore(); return; } // 开始界面：背景之上只画菜单

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
      ctx.fillRect(-BX, 0, C.W + BX * 2, VH);
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
      ctx.fillRect(-BX, 0, C.W + BX * 2, VH);
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
      ctx.fillRect(-BX, 0, C.W + BX * 2, VH);
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
    ctx.fillRect(-BX, 0, C.W + BX * 2, VH);

    drawHUD();
    drawLevelHud();
    drawQuest();
    drawGhostLabel(); // 最后绘制，保证特殊滴标签浮在最上层且紧贴虚影球
    drawPopups();     // 浮动文字最上层（礁石来袭/任务完成/得分等，不被 HUD 遮挡）
    drawTideBanner();
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
