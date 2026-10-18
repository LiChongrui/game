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
  // ---------- v274：弹出面板通用弹性出入场（用户："弹出页签都要添加弹性入场、弹性出场"）----------
  // 入场 0.34s easeOutBack（放大过冲回弹），出场 0.28s easeInBack（先轻外扩再收拢归零）；
  // 关闭后 flag 已 false 但动画未完仍继续绘制（调用方用 panelFxAlive 判断），k 归零自动清理。
  // 所有弹层（设置/确认/图鉴/成就页签/词缀三选一/分享卡）统一走 drawPanelFx 包裹。
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
  // 围绕面板中心 (cx,cy) 施加弹性变换后调用 fn 绘制页签本体；压暗背景（dimA）在变换外
  // 单独绘制、只做整体淡入淡出——v275：弹性动画只覆盖页签范围，不带动全屏背景缩放
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
  // v300：恒等变换下的文本测量——规范规定 measureText 不受 CTM 影响，但微信部分基础库的
  // 实现会把返回值（width 与 actualBoundingBoxAscent/Descent）按当前变换放大（真机 dpr×view.s
  // ≈2~3 倍），造成"读秒文字下沉/卡宽虚胖"。统一在恒等变换下测量，两端引擎结果一致。
  function measureInk(font, text) {
    ctx.save();
    try {
      // 恒等变换测量；极老基础库若无 setTransform 则保持原变换（退回旧行为，不致崩溃）
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
    // v287：光柱 x 锚定游戏块（BX + 块内比例位）——窗口横向缩放时光柱不位移（用户：
    // "雨等背景元素不应该随窗口横向范围的变化而改变位置"），只随块居中平移
    // 性能：渐变只建一次（满 alpha），明暗用 globalAlpha 表达
    var ray = grad('ray' + vk, function () {
      var gg = ctx.createLinearGradient(0, 0, 0, VH * 0.72);
      gg.addColorStop(0, 'rgba(255,255,255,1)');
      gg.addColorStop(1, 'rgba(255,255,255,0)');
      return gg;
    });
    for (var bi = 0; bi < 3; bi++) {
      var bx0 = BX + C.W * (0.16 + bi * 0.3) + Math.sin(time * 0.13 + bi * 2.1) * C.W * 0.04;
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

  // 一条侧边栏的水下植被剪影（x0..x1 为侧边栏范围，seed 区分左右两侧形态）
  // v289：定位体系不动（仍为 v287 的块缘锚定：edge = 靠块一侧的边缘，offset 从块缘向外），
  // 只把槽位间距按丛宽重新核算——一丛巨藻含侧叶后实宽约 64px，原 44 间距必然整丛叠压
  //（用户："水草还是不行，都挤到一起了"）。窗口过窄整株跳过、绝不按宽度重排挤压。
  // 样式与主页海草同语言（drawKelp 填充飘带 + drawGrassTuft 圆头草丛 + 圆润礁石）
  function drawFlora(x0, x1, seed) {
    var w = x1 - x0;
    if (w < 26) return; // 手机模式侧边栏宽 0，自动跳过
    var baseY = VH - 3;
    var left = (seed === 3);
    var edge = left ? x1 - 7 : x0 + 7;  // 锚 = 靠块边缘（x1=块左缘-6 / x0=块右缘+6）
    var dir = left ? -1 : 1;            // 槽位延伸方向：从块缘向外
    var sway = left ? 1 : -1;           // 摆动朝屏内（与窗口宽度无关）
    var k;
    ctx.lineCap = 'round';
    // v291：巨藻/草丛已删除（用户："水草太丑了，先删了吧"）——槽位表注释留档备用：
    // 巨藻槽位偏移 [0,82,164,246]、高度档 [118,84,56,94]；草丛槽位 [53,135,217]、高度档 [42,30,34]
    // ---- 底部礁石：固定槽位偏移 4（双层：暗底 + 顶部受光面） ----
    var rx = edge + dir * 4, rr = 13;
    ctx.fillStyle = 'rgba(12,52,88,0.38)';
    ctx.beginPath(); ctx.ellipse(rx, baseY + 4, rr, rr * 0.45, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(rx - rr * 0.5, baseY + 5, rr * 0.6, rr * 0.3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(190,225,250,0.14)';
    ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.ellipse(rx, baseY + 1, rr * 0.8, rr * 0.32, 0, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
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
    // v297：加空值守卫——主页轮播绘制宝箱时场上并无真宝箱（chest=null），chest.t 会抛
    // TypeError 使整帧从些中断：既丢按钮/设置钮，又跳过末尾的 ctx.restore()，把
    // globalAlpha 遗留在半透明值上——后续每帧背景/磁贴都以残留 alpha 叠画，逐帧累积
    // 成全屏棋盘噪声（用户："静止一段时间后花屏、轮换到宝箱时不花但按钮消失"的真凶）
    var frac = (chest && chest.life) ? Math.max(0, 1 - chest.t / chest.life) : 1;
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
    // v295：缓存 key 补半径——原 key 未含 r，主页大滴（r52）建立后局内小滴（r30）会复用
    // 按 52 算出的渐变（尺寸/浓淡都不对）
    ctx.fillStyle = grad('vtxDisc' + (Math.round(r * 2) / 2), function () {
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
  // v307：落点预测——沿竖直方向找第一接触点（海床 或 任意实体的圆表面），供指示线与预览圈
  function landingYFor(x, r) {
    var y = FLOORY - r;                                  // 默认落在床面
    var bs = phys.bodies, i;
    for (i = 0; i < bs.length; i++) {
      var b = bs[i];
      if (Math.abs(b.vy) > 40) continue;                 // v308：跳过飞行中的水滴（含正在下落的
                                                         // 那颗）——否则预览圈会骑在坠落滴头顶上
      var dx = Math.abs(b.x - x), rr = r + b.r;
      if (dx >= rr) continue;                            // 与本列不相交
      var cy = b.y - Math.sqrt(rr * rr - dx * dx);       // 圆面接触高度
      if (cy < y) y = cy;
    }
    if (y < C.containerTop + r) y = C.containerTop + r;  // 不越容器顶
    return y;
  }
  // v310：指示线与虚影球分离——指示线在实体层"之后"绘制（坠落中的水滴从线上方经过，
  // 线不会被盖在滴上），虚影球保持原位
  // v320：待投虚影"活"起来（用户："水滴没有坠落时，可以加一个合适的效果吗?目前看水滴是虚的
  // 而且看起来呆呆的"）——纵向轻轻漂浮 + 同色系光晕呼吸。虚影球/指示线顶/名称标签同源一个
  // ghostBob()，整组预览作为一个整体呼吸；横向严格钉 aimX 不误导瞄准，只做纵向漂浮与亮度呼吸。
  // 幅度上限 4.2px（3+1.2）：标签与球顶间距恒为 5px，永不相撞
  function ghostBob() { return Math.sin(time * 2.1) * 3 + Math.sin(time * 3.9 + 1.3) * 1.2; }
  function drawGhostGuide(x, tier) {
    var r = nextIron ? C.iron.r : T[tier].r;
    var gy = C.spawnY + ghostBob(); // v320：线顶跟随虚影漂浮，不断连
    var landY = landingYFor(x, r);
    ctx.save();
    if (landY - r > gy + r + 4) {                  // 有可视长度才画线（堆到出生点下时只留短提示）
      var lg = ctx.createLinearGradient(0, gy + r, 0, landY - r);
      lg.addColorStop(0, 'rgba(140,205,245,0.85)');
      lg.addColorStop(1, 'rgba(140,205,245,0.30)');
      ctx.strokeStyle = lg;
      ctx.lineWidth = 2.5;
      ctx.setLineDash([7, 9]);
      ctx.lineDashOffset = -time * 46;
      ctx.beginPath();
      ctx.moveTo(x, gy + r + 2);
      ctx.lineTo(x, landY - r - 2);
      ctx.stroke();
    }
    ctx.restore();
  }
  function drawGhost(x, y, tier, alpha) {
    var r = nextIron ? C.iron.r : T[tier].r;
    var gy = y + ghostBob(); // v320：虚影轻轻漂浮
    // 呼吸光晕：滴体同色系（特殊滴/符文取各自识别色），亮度随漂浮相位呼吸——
    // 给"虚影"以形体感，不再是一片平淡的半透明圆（v320）
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
  }

  // 特殊滴/符文/礁石名称标签：紧贴虚影球顶（在 render 末尾绘制，保证不被 HUD 盖住）
  function drawGhostLabel() {
    if (state !== 'play' || evapMode || flowMode || rippleMode || confirmOpen) return; // v320：补 flowMode，与虚影球同显隐
    var r = nextIron ? C.iron.r : T[nextTier].r;
    var label = nextIron ? '珊瑚礁' : (nextSpecial ? specialLabel(nextSpecial) : (nextRune ? runeName(nextRune) + '符文' : null));
    if (!label) return;
    var alpha = cooldown > 0 ? 0.35 : 0.9;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic'; // v276：显式基线，度量与绘制不受前序残留影响
    ctx.font = 'bold 14px system-ui, sans-serif';
    var ink = measureInk('bold 14px system-ui, sans-serif', label); // v300：恒等变换下测量
    var tw = ink.w + 14;
    var ly = Math.max(C.containerTop + 15, C.spawnY - r - 10 + ghostBob()); // v320：标签随虚影同浮（与球顶间距恒 5px）
    ctx.fillStyle = 'rgba(255,255,255,0.88)';
    // v285：胶囊 17→20 高（下缘不动仍距球顶 5px，上缘抬高 3px）——旧 17 高时 14px 粗体字面
    // 距胶囊边只剩 ≈0.7px，字形的不对称留白被放大成"没居中"的观感；20 高给足 ≈3px 呼吸，
    // 视觉重心不再被边距挤压误导；x 全部取整消除亚像素模糊
    roundRect(Math.round(aimX - tw / 2), ly - 15, tw, 20, 10); ctx.fill();
    ctx.fillStyle = nextIron ? '#6B6353' : (nextSpecial ? specialColor(nextSpecial) : runeColor(nextRune));
    // v276：用实际字形边界（actualBoundingBox）精确垂直居中——canvas 'middle' 基线按 em 盒
    // 取中，CJK 字形实际偏上/偏下因字而异；胶囊几何中心 = ly-5，基线补 (asc-desc)/2 修正
    var asc = ink.has ? ink.a : 14 * 0.84, desc = ink.has ? ink.d : 14 * 0.06; // v300：无像素框 API 时用 CJK 排印常数
    ctx.fillText(label, Math.round(aimX), ly - 5 + (asc - desc) / 2);
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
      dune(du.x, sy0 + du.dy, du.rx, du.ry, du.c, du.c0);
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
    var sn = seaStageNow(), st = sn.st; // v231：海域换色过渡期与背景同步插值（不再瞬间跳变）
    var g = grad('wback' + sn.ck + Math.round(wy / 4), function () {
      var gg = ctx.createLinearGradient(0, wy - tideAmp(), 0, FLOORY);
      gg.addColorStop(0, hexToRgba(deepenHex(st.bg[3], 0.25), 0.32)); // 上浅
      gg.addColorStop(1, hexToRgba(deepenHex(st.bg[3], 0.55), 0.62)); // 下深：色相随海域、保证可辨识
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
    // 半透明覆盖（浸没部分染色，同一条波形）——海域色加深派生，过渡期随 seaStageNow 同步插值
    ctx.fillStyle = hexToRgba(deepenHex(seaStageNow().st.bg[3], 0.4), 0.18);
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

  // ---------- 道具模式提示（蒸发/涟漪/水流）：与默认弹字同源，不另造位置/样式 ----------
  function drawPropHint(text) {
    var y = MG.layout.body.mirrorCy;   // 默认弹字带（涨潮横幅/公告弹字同一锚点），文本样式保持原样
    ctx.textAlign = 'center';
    ctx.font = 'bold 19px system-ui, sans-serif';
    ctx.strokeStyle = 'rgba(10,40,70,0.6)';
    ctx.lineWidth = 4;
    ctx.strokeText(text, C.W / 2, y);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(text, C.W / 2, y);
  }

  function drawDangerLine() {
    // 危险度：仅当水滴顶逼近警戒线 ≤ dangerWarnH（从下方逼近）才进入「闪烁警示」；
    // 更远时线条保持安静（恒定暗青蓝，不闪），避免无意义常亮。
    var H = C.dangerWarnH;
    var near = 0, i;
    // 复用 checkDanger 的静止判据（sp < dangerSpeed*1.5）：高压堆会持续微颤，阈值过严(如 80)会把
    // 静止堆帧误杀→永远不闪；下落/弹飞的单滴速度远超此值→自然被排除。结果即：
    // 「落单滴（高速）不闪，只有静止堆逼近警戒线才闪」。
    var restSp = C.dangerSpeed * 1.5;    // 与越线判负同一个静止阈值，避免两套标准打架
    for (i = 0; i < phys.bodies.length; i++) {
      var b = phys.bodies[i];
      var sp = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
      if (sp >= restSp) continue;        // 快速下落/弹飞的单滴：不触发预警（速度远超静止阈值）
      var d = (b.y - b.r) - C.dangerY;   // 水滴顶相对警戒线：<0 = 越线(线上方)，≥0 = 线下(安全区)
      if (d < 0) continue;               // 越线由 dangerAlert 强制警示；线下才做「逼近闪烁」
      var prox = 1 - d / H;              // 贴线→≈1，距线 H 处→0；d>H 时为负，下面不入阈
      if (prox > 0) near = Math.max(near, prox);
    }
    near = Math.max(near, dangerAlert * 0.95); // 越线判定进行中：强制进入红色警示态（闪烁）
    var flashing = near > 0.02;
    // 警示节奏：C · 呼吸红光（预览页用户选定）——1.1Hz 大幅正弦，0.08↔1 全程流动，柔和但醒目；
    // 幅度仍随 near 自动缩放（a = (0.3+near*0.6)*blink）：刚进阈值弱呼吸、贴线强呼吸。
    var blink = flashing ? (0.08 + 0.92 * (0.5 + 0.5 * Math.sin(time * 1.1 * 2 * Math.PI))) : 1;
    var glow = near;
    var a = flashing ? (0.3 + glow * 0.6) * blink : 0.2;   // 安静态恒定 0.2，警示态随 blink 呼吸
    // 警戒范围：与深海背景融合的暗色渐晕（危险度越高才越透出暖色警示）
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
    // 警戒线：两端渐隐的光带（平静时青蓝，越危险越转红、并随 blink 明灭）
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
    // 叠加一层圆头流动刻度（白色小段向右缓慢滑动；警示时随 blink 提亮）
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
    // 危险时两端亮起端点光珠（与警戒线同色柔光圆点，外圈光晕+内核，随 blink 呼吸）
    if (glow > 0.05) {
      var pa = (0.35 + glow * 0.55) * blink;
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
    // 判定进行中的警示文字 v326 起移出本函数（见 drawDangerText）：原随警戒线在实体层
    // 之前绘制，堆高时水滴就盘踞在文字一带、把警示语盖住，玩家看不到任何提示
    // （用户："有些提示信息会叠在水滴下面导致字体被挡（比如死亡倒计时提示）"）。
  }

  // 越线判负警示文字（v326 从 drawDangerLine 内移出，改在实体层之后绘制——
  // 堆高时水滴就盘踞在文字一带，画在 bodies 之前必被盖住）
  function drawDangerText() {
    if (dangerAlert <= 0.12) return;
    ctx.textAlign = 'center';
    // v328：越线提示放大（用户"越线提示要大一些"）+ 死亡缓冲倒计时（用户"要包含缓冲倒计时"）；
    // 方波 1.2~1.8Hz 平缓（v327 降闪）
    var dHz = 1.2 + dangerAlert * 0.6;            // 警示文字脉动（保持危险感，不变）
    var dsq = Math.pow(0.5 + 0.5 * Math.sin(time * dHz * 2 * Math.PI), 3);
    var wa = Math.min(1, 0.5 + dangerAlert * 0.6) * (0.45 + 0.55 * dsq);
    // 死亡缓冲倒计时：1Hz 缓闪（用户 v329：原随警示文字 1.2~1.8Hz 太快）
    var csq = Math.pow(0.5 + 0.5 * Math.sin(time * 1.0 * 2 * Math.PI), 2);
    var ca = 0.55 + 0.45 * csq;
    ctx.lineJoin = 'round';
    // 大字「堆高越线」
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.strokeStyle = 'rgba(255,255,255,' + wa + ')';
    ctx.lineWidth = 5;
    ctx.strokeText('堆高越线', C.W / 2, C.dangerY - 42);
    ctx.fillStyle = 'rgba(196,48,42,' + wa + ')';
    ctx.fillText('堆高越线', C.W / 2, C.dangerY - 42);
    // 死亡缓冲倒计时（1Hz 缓闪，单独 alpha，不随警示文字快闪）
    var sec = Math.max(0, dangerRemain);
    ctx.font = 'bold 34px system-ui, sans-serif';
    ctx.strokeStyle = 'rgba(255,255,255,' + ca + ')';
    ctx.lineWidth = 6;
    ctx.strokeText(sec.toFixed(1) + 's', C.W / 2, C.dangerY - 4);
    ctx.fillStyle = 'rgba(255,86,40,' + ca + ')';
    ctx.fillText(sec.toFixed(1) + 's', C.W / 2, C.dangerY - 4);
  }

  // ---------- 顶部 HUD（无背景板，悬浮文字 + 描边保证可读） ----------
  function drawHUD() {
    ctx.textAlign = 'left';
    ctx.lineJoin = 'round';
    // 第一组（左上）：设置按钮 + 最高分 · 最远海域（历史信息退居角落，实时信息居中）
    // ★ v196：统计只保留"最高 / 最远海域"两项（用户："只统计最大得分和最远海就行了，
    //   其他的统计就不要显示了"）——移除 海域×N / 每日挑战 X/Y / 「NG」×N 三项，
    //   颜色随之固定 #3E6E90（原随每日挑战/NG 变紫的逻辑一并移除）
    var farIdx = 0;
    for (var fi = C.seaStages.length - 1; fi >= 0; fi--) {
      if (careerPeak >= C.seaStages[fi].at) { farIdx = fi; break; }
    }
    farIdx = Math.max(farIdx, seaStage()); // v328：实时——当前海域更深则即时显示（用户："游戏时当前海域超过统计结果也不更新"）
    // 统计最佳结果：沿用原样式（14px/原描边/原色/超宽自适应缩字号），与成就殿堂按钮垂直居中对齐（cy36 → baseline41）
    ctx.font = '14px system-ui, sans-serif';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    var top1 = '最高 ' + best + ' · 最远 ' + C.seaStages[farIdx].name;
    var t1Font = 14;
    while (t1Font > 11 && ctx.measureText(top1).width > 240) { // 右端让位计时文字(x340 起)，不越界
      t1Font--;
      ctx.font = t1Font + 'px system-ui, sans-serif';
    }
    ctx.strokeText(top1, 50, MG.layout.hud.row1Y);
    ctx.fillStyle = '#3E6E90';
    ctx.fillText(top1, 50, MG.layout.hud.row1Y);

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
    // 与左侧统计行同排、与设置按钮(cy35)垂直居中对齐
    ctx.textAlign = 'center';
    ctx.lineJoin = 'round';
    // 计时沿用原样式（12px bold / #2E7DA8），与设置按钮(cy35)垂直居中对齐、与左侧统计行同排
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    var em = Math.floor(levelElapsed / 60), es = Math.floor(levelElapsed % 60);
    var etxt = '已进行 ' + em + ':' + (es < 10 ? '0' + es : es);
    ctx.strokeText(etxt, C.W - 80, MG.layout.hud.row1Y);
    ctx.fillStyle = '#2E7DA8';
    ctx.fillText(etxt, C.W - 80, MG.layout.hud.row1Y);

    // 设置按钮（左上角，v197：替代原成就奖杯位；右上角音量钮已移除）——局内与初始界面共用
    drawSetBtn();
  }
  // v200 设置图标候选（重设计，供预览筛选；drawSetBtn 经 setIconStyle 选择）
  // 旧 v199B 用 gs=setBtn.r/13 放大，齿顶达 17.3/18 几乎抵边、发挤发虚；
  // 本版固定半径（tipR=12）留 6px 边距，并给出四种风格供用户筛选。
  var setIconStyle = 'A'; // 'A'实心齿轮 'B'线描齿轮 'C'滑块 'D'表盘
  // 八齿齿轮：平顶齿 + 斜肩（proper cog，非星芒），fill=实心(蓝心孔) / line=线描(中心点)
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
  // 三条滑块（现代"设置"语义，清晰不歧义）
  function setIconSliders(ctx) {
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    var ys = [-7, 0, 7], xs = [-4, 5, -3];
    for (var i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.moveTo(-10, ys[i]); ctx.lineTo(10, ys[i]); ctx.stroke();
      ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(xs[i], ys[i], 3, 0, Math.PI * 2); ctx.fill();
    }
    ctx.lineCap = 'butt';
  }
  // 表盘（外环 + 八刻度 + 中心点，极简）
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
  // v317 垃圾桶（清空存档语义）：盖沿+提手+上宽下窄箱身+两道竖筋，白色线描
  function setIconTrash(ctx) {
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-7, -4); ctx.lineTo(7, -4); ctx.stroke();       // 盖沿
    ctx.beginPath(); ctx.moveTo(-3, -6.5); ctx.lineTo(3, -6.5); ctx.stroke();   // 提手横梁
    ctx.beginPath(); ctx.moveTo(-2, -6.5); ctx.lineTo(-2, -4); ctx.stroke();    // 提手左
    ctx.beginPath(); ctx.moveTo(2, -6.5); ctx.lineTo(2, -4); ctx.stroke();      // 提手右
    ctx.beginPath();                                                             // 箱身
    ctx.moveTo(-5.5, -4); ctx.lineTo(-4.5, 7); ctx.lineTo(4.5, 7); ctx.lineTo(5.5, -4);
    ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-1.8, -1.5); ctx.lineTo(-1.4, 5); ctx.stroke(); // 竖筋左
    ctx.beginPath(); ctx.moveTo(1.8, -1.5); ctx.lineTo(1.4, 5); ctx.stroke();   // 竖筋右
    ctx.lineCap = 'butt';
  }
  // 设置按钮（v197 新增；v200 图标可切换 A/B/C/D，默认 A）
  // v279：钮体统一为"白边+蓝底"——drawCircleBtn（渐变蓝底+白细内环+左上高光弧），
  // 与技能栏图鉴书本钮同一绘制语言（用户："如同图鉴图标那样"）
  function drawSetBtn() {
    drawCircleBtn(setBtn, '#2E7DA8', 1, false, 0);
    ctx.save();
    ctx.translate(setBtn.cx, setBtn.cy);
    var k = setBtn.r / 18;        // 仅跟随按钮半径，不再过度放大
    ctx.scale(k, k);
    if (setIconStyle === 'A') setIconCog(ctx, true);
    else if (setIconStyle === 'B') setIconCog(ctx, false);
    else if (setIconStyle === 'C') setIconSliders(ctx);
    else setIconDial(ctx);
    ctx.restore();
  }
  // 设置弹窗（v197：音效/音乐/震动三开关；v317：+清空存档一行。几何走 layout.setRect/setRowRect/setCloseRect）
  // 用户要求底部不放说明文本；v317 面板 260→326 容纳第 4 行（行几何不变）
  function drawSettings() {
    layoutSetPanel();                 // 复用本游戏通用面板几何（与图鉴/成就同源）
    // 压暗背景已上移 drawPanelFx 统一绘制（v275）
    // 通用面板容器（与图鉴/成就同一 panel() 白卡）
    panel(SET_PANEL.x, SET_PANEL.y, SET_PANEL.w, SET_PANEL.h, 14, 0.97);
    // 通用页头（图标圆+标题+✕ 同一水平中线）；v283：齿轮等比缩 2/3——设置钮 r18 齿顶 12
    // （占半径 0.667），图标圆 r12 内同比例 → 齿顶 8，与按钮图标比例一致（用户："内部形状太大"）
    drawPanelHeader('设置', SET_PANEL, setCloseBtn, function () {
      ctx.save(); ctx.scale(0.667, 0.667); setIconCog(ctx, true); ctx.restore();
    }, '#2E7DA8');
    // 三行开关（点整行即切换；systems.js toggleSet）
    var names = ['音效', '音乐', '震动'];
    var descs = ['水滴合成与技能音效', '深海氛围背景音乐', '震动反馈']; // v287：去"（马达）"措辞（用户：不用突出是马达震动）
    for (var si = 0; si < 3; si++) {
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
      // 滑块开关（52×30 右侧垂直居中；on 态蓝底白钮右置）
      var on = si === 0 ? audio.sfxOn : (si === 1 ? audio.musicOn : audio.vibOn);
      var sx = row.x + row.w - 18 - 52, sy = row.y + 13;
      ctx.fillStyle = on ? '#2E86B4' : 'rgba(120,150,175,0.35)';
      roundRect(sx, sy, 52, 30, 15); ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath(); ctx.arc(on ? sx + 52 - 15 : sx + 15, sy + 15, 11, 0, Math.PI * 2); ctx.fill();
    }
    // v317 第 4 行：清空存档（独立功能；危险样式与三开关区分——红 accents + 右侧「清空」小钮）。
    // 点整行即开二级确认（systems.js setClearOpen），不直接执行
    var clr = MG.layout.setRowRect(3);
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
    // 右侧红色小钮「清空」（64×30，与滑块开关同一垂直中线）
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
  // v317 清空存档二级确认（危险操作）：设置面板之上再叠一层，几何走 layout.setClearRect 系
  function drawSetClear() {
    var cr = MG.layout.setClearRect();
    panel(cr.x, cr.y, cr.w, cr.h, 14, 0.97);
    drawPanelHeader('清空存档', cr, MG.layout.setClearCloseRect(), function () {
      ctx.save(); ctx.scale(0.667, 0.667); setIconTrash(ctx); ctx.restore();
    }, '#B0584A');
    // 说明（两行左对齐小字：清空结果 + 无法撤销警示）
    ctx.textAlign = 'left';
    ctx.fillStyle = '#4A7FA0';
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillText('将清空全部存档，游戏恢复初始状态。', cr.x + 24, cr.y + 64);
    ctx.fillStyle = '#B0584A';
    ctx.fillText('此操作无法撤销。', cr.x + 24, cr.y + 84);
    // 两钮横排：取消（白底蓝描边，轻）/ 确认清空（红渐变，主）
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
  // 第一排圆钮统一样式（v196 建；★ v199 改：accent 实底 + 白细内环 + 白图标）
  // 用户："设置的图标太难看了，也不协调"——旧为白 0.85 底 + accent 2px 环，细彩线图标
  //   压白底，在 HUD 一众粗元素里发虚；现改"彩底 + 白图标"，与底部道具钮（drawCircleBtn
  //   彩底白图标）同一绘制语言。v197 起唯一调用方 = drawSetBtn（奖杯/音量钮已移除）
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
  // 潮汐计时器（v202 重设计：灵动·动态，文本与动画合为一体）——整卡即动画：全宽双层流动
  // 水波（迷你海平面随真实 tide.progress 升降，振幅随时间呼吸、涨潮更汹涌、上浮气泡），文字
  // 「潮汐/涨潮 Ns」直接叠在水波之上（白光晕保证可读），倒计时数字轻微脉冲缩放；预警/涨潮
  // 时卡体辉光呼吸、文字随相位脉冲变色。
  // 潮汐计时器（v202 起重设计；v207 协调化）：接入本游戏既有视觉语言——
  // ① 文字＝白描边+深海蓝填充（与分数/统计/计时同款 strokeText+fillText）；
  // ② 水波＝当前海域深水色 C.seaStages[cur].bg[3]（与海域进度条填充同源）；
  // ③ 边框＝白描边（与海域进度条白底轨道同族），预警/涨潮辉光呼吸。
  function drawTideTimer() {
    if (!tide) return;
    var tp = MG.layout.hud.tidePill;
    var ty = tp.ty, th = tp.th;                         // 高度/上沿引 layout；左右锚定由 side 决定
    var active = tide.phase === 'active';
    var warn = !active && tide.timer <= C.tide.warnTime;
    var pulse = 0.5 + 0.5 * Math.sin(time * 6);          // 快脉冲（描边/文字）
    var breath = Math.sin(time * 1.6);                   // 慢呼吸（振幅/辉光）
    function hexA(hex, a) {
      var n = parseInt(hex.slice(1), 16);
      return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
    }

    // 量文本：标签固定 2 字、数字恒 2 位（潮汐间隔 ≤ 40s）。
    // 卡宽按「最大情况」固定（标签 + 间距 + 2 位数的 '99s'），文本仅在卡内居中——
    // 文字变短只影响文字本身，卡宽与位置恒定，不再抖动。
    var label = active ? '涨潮' : '潮汐';
    var ns = Math.ceil(tide.timer) + 's';    // 文本居中，不补空格
    ctx.textAlign = 'left';
    var lw = measureInk('bold 15px system-ui, sans-serif', label).w;      // v300：恒等变换下测量
    var nw = measureInk('bold 22px system-ui, sans-serif', ns).w;         // 当前数字宽度（仅用于卡内居中定位）
    var gap = 5;
    var maxNumW = measureInk('bold 22px system-ui, sans-serif', '99s').w; // 2 位数最大宽，作为固定基准
    var textW = lw + gap + nw;                           // 当前文本宽（仅用于卡内居中定位）
    var fixedTextW = lw + gap + maxNumW;                 // 固定文本区宽
    var padX = 16, cw = fixedTextW + padX * 2;           // 卡宽固定
    var tx = (tp.side === 'right') ? (C.W - tp.margin - cw) : tp.margin; // 右锚定（margin 留白）
    var midY = ty + th / 2;

    var wTop = ty + 6, wBot = ty + th;   // 水波底直接贴元素底边（v205+ 去除底部空隙）

    // 卡体：仅描边（未填充区透明，露游戏背景；v204 要求）——白描边同族；预警/涨潮辉光呼吸
    // （active 白光、warn 橙光呼应预警文字；不另造水色，水色统一为游戏海色）
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

    // 动态水波：与画面潮水完全同源——潮水=「海域色加深一档」（deepenHex，否则与背景 bg[3]
    // 同色隐形），计时器水波随之同步加深；v231 起海域换色过渡期与背景同一套 seaBlend 插值。
    // 前层（贴水面可见）= 潮水表层色 deepen 0.25；后层 = 潮水深处色 deepen 0.55。
    // 透明度结构不变（仅靠 alpha 区分层内前后），idle/active/warn 水色一致。
    var seaC = seaStageNow().st.bg[3];
    var backC = deepenHex(seaC, 0.55), frontC = deepenHex(seaC, 0.25);
    var frontA = warn ? 0.55 : (active ? 0.62 : 0.46);
    var backA = warn ? 0.32 : (active ? 0.34 : 0.26);
    var level = wBot - (wBot - wTop) * Math.max(0, Math.min(1, tide.progress));
    var amp = 3 + breath * 1.3 + (active ? 2 : 0) + (warn ? pulse * 2.0 : 0); // 振幅呼吸
    var spd = active ? 3.4 : 1.7;                                       // 流速：涨潮更快
    ctx.save();
    roundRect(tx + 1, ty + 1, cw - 2, th - 2, 13); ctx.clip();
    // 后层（慢、浅、大振幅）
    ctx.fillStyle = hexA(backC, backA);
    ctx.beginPath(); ctx.moveTo(tx, wBot);
    for (var i = 0; i <= cw; i += 3) {
      ctx.lineTo(tx + i, level + Math.sin((i / cw) * Math.PI * 2 - time * spd * 0.6) * amp * 0.8);
    }
    ctx.lineTo(tx + cw, wBot); ctx.closePath(); ctx.fill();
    // 前层（快、饱和、白高光）
    ctx.fillStyle = hexA(frontC, frontA);
    ctx.beginPath(); ctx.moveTo(tx, wBot);
    for (var k = 0; k <= cw; k += 3) {
      ctx.lineTo(tx + k, level + Math.sin((k / cw) * Math.PI * 3 + time * spd) * amp);
    }
    ctx.lineTo(tx + cw, wBot); ctx.closePath(); ctx.fill();
    // 波纹高光线
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (var j = 0; j <= cw; j += 3) {
      var wy = level + Math.sin((j / cw) * Math.PI * 3 + time * spd) * amp;
      if (j === 0) ctx.moveTo(tx + j, wy); else ctx.lineTo(tx + j, wy);
    }
    ctx.stroke();
    // 涨潮/预警时上浮小气泡（灵动点缀）
    if (active || warn) {
      ctx.fillStyle = 'rgba(255,255,255,' + (0.3 + pulse * 0.3) + ')';
      for (var b = 0; b < 3; b++) {
        var bxp = tx + 10 + ((b * 37 + time * 14) % (cw - 20));
        var byp = wBot - 6 - ((time * (12 + b * 4) + b * 22) % (th - 16));
        ctx.beginPath(); ctx.arc(bxp, byp, 1.6, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();

    // 文本：白描边（同 HUD 分数/统计/计时）+ 深海蓝填充，叠在水波之上；「标签 + 秒数」整体居中于卡内。
    var sx = tx + (cw - textW) / 2;
    ctx.lineJoin = 'round';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.fillStyle = warn ? '#C8501E' : '#12517E';
    // v300：像素框补偿统一在 alphabetic 基线语义下进行——规范里 actualBoundingBoxAscent/Descent
    // 是相对"当前对齐基线"的，个别引擎无论设什么都按 alphabetic 返回；固定 alphabetic 后
    // 「墨心 = 基线 - (asc-desc)/2」的补偿公式跨引擎一致，消除文字与读秒对不齐的隐患
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    // 标签（v286：真·垂直居中——middle 基线按 em 盒取中，中文与数字字形偏差方向不同，
    // 用户："倒计时读秒比潮汐二字靠下"；改按各自字形像素框补偿，两段视觉中心都对齐 midY）
    var lm = measureInk('bold 15px system-ui, sans-serif', label);
    // v301 补充：不支持 actualBoundingBox 的内核（微信部分基础库实测不支持）回退不能取
    // midY——alphabetic 基线压在中线会把整行墨迹顶进上半格（用户真机实测"偏上"）。
    // 按典型墨迹比例给常数：中文墨心 ≈ 基线上方 0.40em、数字（含小写 s）≈ 0.35em
    var lBase = lm.has ? midY + (lm.a - lm.d) / 2 : midY + 15 * 0.40;
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.strokeText(label, sx, lBase); ctx.fillText(label, sx, lBase);
    // 倒计时数字（紧跟标签，整体居中；脉冲缩放；同像素框补偿，视觉中心与标签对齐）
    var sc = 1 + (warn || active ? pulse * 0.06 : 0);
    var nm = measureInk('bold 22px system-ui, sans-serif', ns);
    var nBase = nm.has ? midY + (nm.a - nm.d) / 2 : midY + 22 * 0.35;
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.save();
    ctx.translate(sx + lw + gap + nw / 2, midY);
    ctx.scale(sc, sc);
    var ndy = (nBase - midY) / sc;   // 缩放后仍落在同一视觉中心
    ctx.strokeText(ns, -nw / 2, ndy); ctx.fillText(ns, -nw / 2, ndy);
    ctx.restore();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }
  // v276：深渊潜航/每日挑战局信息芯片——与潮汐计时器完全对称的"孪生"元素。
  // 潮汐卡在右、本卡在左：同一 ty/th/margin 真源、同款"透明卡体+白描边+卡内海水波+白描边文字"
  // 绘制语言。所有模式目标=到达最深的海洋：主行=词缀名+完成海域百分比（最深海 100% 转金），
  // 第二行小字=完整增益（desc；v281 起无得分倍率）；水位即海域进度。
  function drawChalChip() {
    if (!ng || !ng.active) return;
    // v276：所有模式的目标 = 到达最深的海洋（用户）。主行 = 词缀名 + 完成海域百分比
    // （v277：已完成海域数/（总海域-1），初始 0%、每完成一个海域 +1 档、最深海域=100%）；
    // 第二行小字 = 完整增益（与词缀卡介绍一致：desc；v281 起无得分倍率）。两行水平居中、垂直均匀分布。
    var name, pctStr, sub, gold, prog;
    name = ng.active.name;
    var sIdx = seaStage();
    // v277：进度 = 已完成海域数 /（总海域-1）——初始 0%、每完成一个海域 +1 档、到达最深海域 = 100%
    prog = Math.max(0, Math.min(1, sIdx / (C.seaStages.length - 1)));
    pctStr = Math.round(prog * 100) + '%';
    gold = prog >= 1;
    sub = ng.active.desc + (ng.active.mult ? ' · 得分 ×' + ng.active.mult : '');
    // 几何镜像潮汐卡：同一行（ty/th 引同一 layout 真源），右锚定→左锚定、margin 相同
    var tp = MG.layout.hud.tidePill;
    var ty = tp.ty, th = tp.th;
    ctx.textAlign = 'left';
    var nw1 = measureInk('bold 16px system-ui, sans-serif', name).w;   // v300：恒等变换下测量
    var pw1 = measureInk('bold 16px system-ui, sans-serif', pctStr).w;
    var gap1 = 7, padX = 14;
    var l1w = nw1 + gap1 + pw1;
    var sw1 = measureInk('11px system-ui, sans-serif', sub).w;
    var cw = padX * 2 + Math.max(l1w, sw1);
    var tx = tp.margin;
    var cx0 = tx + cw / 2;
    // v277：两行垂直分散对齐、均匀分布——按两行行高把卡内剩余空间三等分
    var lh1 = 16, lh2 = 11, vgap = (th - lh1 - lh2) / 3;
    var y1 = ty + vgap + lh1 / 2, y2 = ty + vgap * 2 + lh1 + lh2 / 2;
    var pulse = 0.5 + 0.5 * Math.sin(time * 6);
    var breath = Math.sin(time * 1.6);
    function hexA(hex, a) {
      var n = parseInt(hex.slice(1), 16);
      return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
    }
    // 卡体：透明底 + 白描边（同潮汐卡）；达成态金辉光呼吸
    if (gold) {
      ctx.save();
      ctx.shadowColor = 'rgba(245,197,66,' + (0.5 + pulse * 0.25).toFixed(2) + ')';
      ctx.shadowBlur = 9 + pulse * 7;
    }
    ctx.strokeStyle = gold ? 'rgba(255,236,170,' + (0.75 + pulse * 0.25).toFixed(2) + ')' : 'rgba(255,255,255,0.4)';
    ctx.lineWidth = gold ? 1.8 : 1.3;
    roundRect(tx + 0.9, ty + 0.9, cw - 1.8, th - 1.8, 14); ctx.stroke();
    if (gold) ctx.restore();
    // 卡内海水：与潮汐卡同一片海（seaStageNow 深水色），水位 = 挑战进度；
    // v277：进度 100% 后为满池静水——纯色填满，不再画海浪
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
    // 文本：主行（名称+海域百分比）白描边+深海蓝、水平居中；小字行（完整增益）居中；最深海转金
    // v300：微信基础库无像素框 API 且 middle 的 em 盒会让数字比中文低（v286 用户实测）——
    // 改 alphabetic + 排印常数：中文墨心 ≈ 基线上 0.40em、数字 ≈ 0.35em、混排行 ≈ 0.38em
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
  // 涨潮横幅
  function drawTideBanner() {
    if (tide.banner <= 0) return;
    var t = tide.banner / 2.4; // 1 → 0
    var a = t < 0.2 ? t / 0.2 : (t > 0.85 ? (1 - t) / 0.15 : 1);
    var scale = 1 + (1 - t) * 0.15;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.textAlign = 'center';
    ctx.translate(C.W / 2, MG.layout.body.mirrorCy); // v190：涨潮横幅锚堆叠区镜像位（出生区相对警戒线的镜像）
    ctx.scale(scale, scale);
    ctx.font = 'bold 43px system-ui, sans-serif';
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 6;
    ctx.strokeText('涨 潮', 0, 0);
    ctx.fillStyle = '#12517E'; // 与潮汐计时器「涨潮」文字同色（v227：撤自造渐变 #3FA9E0→#155A8A，统一不自造色）
    ctx.fillText('涨 潮', 0, 0);
    ctx.restore();
  }

  // ---------- 顶部中央计时：本局已进行时长 ----------

  // ---------- 重开确认弹窗 ----------
  // v273 灵动化（用户："重开的弹出页签样式太生硬了"）：① 弹性入场 easeOutBack
  // （0.85→1 过冲回弹）+ 淡入；② 整卡 ±2px 慢呼吸浮动；③ 页头标题左侧加圆形图标
  // （白色循环箭头，与"重新开始"语义呼应）；④ 三按钮加手绘小图标（主页/循环/返回）。
  function drawConfirm() {
    // 压暗背景已上移 drawPanelFx 统一绘制（v275）
    // v276：删整卡慢呼吸浮动（用户："页签好像会动"，弹层应静止）；页头图标改与重开按钮
    // 同款白色弧形循环箭头（accent 同按钮色 #5E90B4）；按钮去手绘小图标，主次分明重设计
    // v299：去标题行与 ✕（用户："这两个页签可以不要标题行吧"）——三按钮放大（42→46 高）、
    // 间距拉开（12→14），面板高度 224→200；关闭走「返回游戏」按钮（✕ 命中也一并移除）
    var cr = MG.layout.confirmRect();
    ctx.save();
    panel(cr.x, cr.y, cr.w, cr.h, 14, 0.97);
    // v300：恢复标题栏（用户："返回、结算页签还是恢复标题栏吧"）——页头图标仍与重开按钮
    // 同款白色循环箭头（v283 比例：scale 0.6），✕ 关闭同步恢复（systems 命中已加回）
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
    // 三按钮纵排（v279：三档视觉——重新开始=深蓝渐变胶囊（主）/ 返回主页=白底蓝描边（轻）/
    // 返回游戏=灰蓝实底胶囊（中），背景区分度拉满（用户：太相似））
    // 返回主页 / 重新开始 / 返回游戏，几何走 layout.confirmBtnRect（命中不变）
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

  // 任务卡（v195 重设计，用户："尤其是任务元素（太丑了，请重新设计），让效果更好更合理"）：
  // 旧 205×35 条里塞两行 15/13px 字 → 白底圆角卡 285×60：金色靶心图标 + 标题/星级
  // + 金色进度条（have/need 白字描边骑条居中）+ 奖励；几何全部引 layout.hud.quest
  // v202：任务元素整体隐藏（用户"先隐藏掉任务元素"），仅保留下方潮汐计时器与海域进度条；
  // questHidden 为开关，置 false 即恢复任务卡。潮汐/海域进度条绘制已移出本函数（见帧绘制）。
  var questHidden = true;
  function drawQuest() {
    if (!quest || questHidden) return;
    ctx.save();
    ctx.textAlign = 'center';
    var q = MG.layout.hud.quest;
    var qw = q.qw, qx = q.qx, qy = q.qy, qh = q.qh;
    // 卡体：白底 + 淡蓝描边（与潮汐卡同款，两卡并排同高）
    ctx.fillStyle = 'rgba(255,255,255,0.66)';
    roundRect(qx, qy, qw, qh, 14); ctx.fill();
    ctx.strokeStyle = 'rgba(90,140,180,0.28)'; ctx.lineWidth = 1;
    roundRect(qx + 0.5, qy + 0.5, qw - 1, qh - 1, 14); ctx.stroke();
    // 靶心图标（左）：金圆 + 白色同心环 + 圆心点
    var icx = qx + 25, icy = qy + 30;
    ctx.fillStyle = '#F5C542';
    ctx.beginPath(); ctx.arc(icx, icy, 15, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 1.8; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.arc(icx, icy, 7, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath(); ctx.arc(icx, icy, 2.6, 0, Math.PI * 2); ctx.fill();
    // 标题行：任务名（左，超宽自适应缩字号）+ 星级（右）
    ctx.textAlign = 'left';
    ctx.fillStyle = '#7A5B10';
    var tf = 15;
    ctx.font = 'bold ' + tf + 'px system-ui, sans-serif';
    while (tf > 12 && ctx.measureText(quest.text).width > 170) { // 右端让位星级(≈40px)，不重叠
      tf--;
      ctx.font = 'bold ' + tf + 'px system-ui, sans-serif';
    }
    ctx.fillText(quest.text, qx + 50, qy + 25);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#B8860B';
    ctx.font = '12px system-ui, sans-serif';
    var stars = '★★★'.slice(0, quest.stars || 1);
    ctx.fillText(stars, qx + qw - 15, qy + 25);
    // 进度条（金）+ have/need 骑条 + 奖励
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
  // 差额分精简：≥1万 缩写为「X万」（省字符，条内不挤）
  function fmtDiff(n) {
    if (n < 10000) return String(n);
    var w = n / 10000;
    return (w >= 10 ? Math.round(w) : Math.round(w * 10) / 10) + '万';
  }
  // hex → rgba 字符串（潮水水体同源海域色用；drawTideTimer 内另有局部 hexA）
  function hexToRgba(hex, a) {
    var n = parseInt(hex.slice(1), 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }
  // 海域色加深：向深海蓝(#0A2E4E，与各海域 shade 同方向)混合 k。
  // 潮水必须比背景深才可见——背景渐变底色就是 bg[3]（render 背景层），直接用 bg[3] 会与背景同色隐形；
  // 加深后色相仍由当前海域色主导（随海域变），只是压暗到可辨识。
  // 经 parseCol 解析：'#RRGGBB' 与海域换色过渡期产生的 'rgba(...)' 串都支持。
  function deepenHex(col, k) {
    var c = parseCol(col);
    var r = Math.round(c[0] + (10 - c[0]) * k);
    var g = Math.round(c[1] + (46 - c[1]) * k);
    var b = Math.round(c[2] + (78 - c[2]) * k);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }
  // 当前海域阶段（含换色过渡）：跨里程碑 1.8s 内与背景同一套 seaBlend 插值——
  // 供潮水/潮汐计时器等"水色"消费方使用，切海域时水色随背景一起渐变，不再瞬间跳变。
  // 返回 { st: 海域阶段对象(bg 在过渡期是 rgba 串), ck: 过渡期缓存键(量化 1/24，防渐变缓存串色) }
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
    var sx = sb.sx, sy = sb.sy, sw = sb.sw, sh = sb.sh; // 两侧各留 25：端点徽章圆心压边距线（v284 定版）
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    roundRect(sx, sy, sw, sh, 8); ctx.fill();
    var frac = 1;
    if (!maxed) {
      var lo = C.seaStages[cur].at, hi = C.seaStages[cur + 1].at;
      // v277：去掉 0.02 下限钳制——0 分时进度就是 0%（此前被钳成 2%）
      frac = Math.min(1, Math.max(0, (ts - lo) / (hi - lo)));
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
    // 三段式（v223 用户定版）：左=当前海域（贴左徽章）· 中=完成度% · 右=下一海域（贴右徽章）。
    // 文字与两端徽章语义对齐：左徽章=当前位置、右徽章=目的地；maxed 时右段显示「已达最深」。
    var DEEP = '#2C5A78';
    var GRAY = '#66788A';   // 下一海域：尚未抵达，统一灰调（不预先着色）
    var pct = maxed ? 100 : Math.round(frac * 100);
    var leftSeg = [C.seaStages[cur].name, seaTextColor(SEA_BADGES[cur].c)];
    var midSeg = [pct + '%', DEEP];
    var rightSeg = maxed ? ['已达最深', GRAY] : [C.seaStages[cur + 1].name, GRAY];
    // 徽章让位：两端徽章(r15)骑在条端点上，文字各内缩 26
    var lx = sx + 26, rx = sx + sw - 26;
    var cxBar = sx + sw / 2;
    // 超长自适应缩字号：① 三段总宽放得进可用区；② 百分比固定条正中后，
    // 与左/右海域名之间各留 ≥5px（v284：中段不再"避让式"浮动，严格水平居中）
    var lw2, mw2, rw2;
    var measure3 = function () {
      var f = 'bold ' + lf + 'px system-ui, sans-serif'; // v300：恒等变换下测量
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
    // 真·垂直居中：按中文实际像素框算 baseline（textBaseline='middle' 对中文会视觉偏高 1~2px）
    var probe = measureInk('bold ' + lf + 'px system-ui, sans-serif', leftSeg[0]);
    var cyT, vBase;
    if (probe.has) {
      cyT = sy + (sh - (probe.a + probe.d)) / 2 + probe.a;
      vBase = 'alphabetic';
    } else {
      // v300：无像素框 API 的内核（微信）也统一 alphabetic + 排印常数（CJK 墨心 ≈ 基线上 0.39em），
      // 不再退 middle（em 盒中心与视觉中心有差，真机上偏上）
      cyT = sy + (sh - lf * 0.90) / 2 + lf * 0.84;
      vBase = 'alphabetic';
    }
    ctx.save();
    ctx.textBaseline = vBase;
    // 左段（左锚）
    ctx.textAlign = 'left';
    ctx.strokeText(leftSeg[0], lx, cyT);
    ctx.fillStyle = leftSeg[1]; ctx.fillText(leftSeg[0], lx, cyT);
    // 右段（右锚）
    ctx.textAlign = 'right';
    ctx.strokeText(rightSeg[0], rx, cyT);
    ctx.fillStyle = rightSeg[1]; ctx.fillText(rightSeg[0], rx, cyT);
    // 中段：百分比固定在条正中（v284 用户："百分比应当水平居中"）
    ctx.textAlign = 'center';
    ctx.strokeText(midSeg[0], cxBar, cyT);
    ctx.fillStyle = midSeg[1]; ctx.fillText(midSeg[0], cxBar, cyT);
    ctx.restore();
    if (!maxed) {
      // 右端终点标记（v286：半径 15→12，用户"图标有点太大"——圆心仍压条端点=25 边距线，
      // r12 直径 24 恰好与条身高一致，仍能盖住条端；圆心压边距线是用户定版）
      drawSeaBadge(cur + 1, sx + sw, sy + sh / 2, false, true, 12);
    }
    // 左端徽章标注"当前位置"（v286：同上，r12）
    drawSeaBadge(cur, sx, sy + sh / 2, true, false, 12);
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

    // v197：成就殿堂入口（奖杯）已按用户要求隐藏；设置钮移入 HUD 第一排（drawHUD 内绘制）

    // 重开按钮（↻ 循环箭头，点击弹确认）
    drawCircleBtn(restartBtn, '#5E90B4', 0.85, false, 0);
    var rx0 = restartBtn.cx, ry0 = restartBtn.cy;
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(rx0, ry0, 9, -Math.PI * 0.35, Math.PI * 1.25); ctx.stroke();
    // 箭头头部（v195：钮 r15→20，图标半径 8→9 等比放大）
    var ax = Math.cos(-Math.PI * 0.35) * 9, ay = Math.sin(-Math.PI * 0.35) * 9;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(rx0 + ax + 5.5, ry0 + ay - 1);
    ctx.lineTo(rx0 + ax - 4.5, ry0 + ay - 3);
    ctx.lineTo(rx0 + ax + 1, ry0 + ay + 6.5);
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
        // v316：解锁条件改为"对应符文出现"——锁定态提示同步换文案（旧版显示累计分数门槛）
        ctx.fillStyle = 'rgba(230,242,248,0.75)';
        ctx.font = '10px system-ui, sans-serif';
        ctx.fillText('待符文', btn.cx, btn.cy + 13);
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
    // 压暗背景已上移 drawPanelFx 统一绘制（v275）
    var nr = MG.layout.ngRect();
    var pw = nr.w, ph = nr.h, px = nr.x, py = nr.y;
    panel(px, py, pw, ph, 14, 0.97);
    // v275：页头与其他弹层同款（⚓ 图标圆 + 左对齐标题；点外关闭故无 ✕）
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

  // v329：提示分色表（语义类别 → 颜色）
  var PCOLMAP = {
    info:  '#1C5F8C',   // 蓝 — 通用信息 / 中性反馈
    event: '#0E7C9E',   // 青 — 深海事件 / 海域演进 / 机制提示
    good:  '#1E9E6A',   // 绿 — 奖励 / 解锁 / 成就 / 合成
    warn:  '#C9821A',   // 琥珀 — 待操作提醒（点宝箱 / 预告）
    bad:   '#9E4B47'    // 暗红 — 错失 / 失败（降饱和，不再刺眼）
  };
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
      ctx.fillStyle = PCOLMAP[p.kind] || PCOLMAP.info;
      ctx.font = (p.big ? 'bold 20px' : 'bold 17px') + ' system-ui, sans-serif';
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 3;
      ctx.strokeText(p.text, 0, 0);
      ctx.fillText(p.text, 0, 0);
      if (p.mult > 1) {
        ctx.font = 'bold 18px system-ui, sans-serif';
        ctx.fillStyle = PCOLMAP.good;
        ctx.strokeStyle = 'rgba(255,255,255,0.85)';
        ctx.lineWidth = 3;
        ctx.strokeText('连击 x' + p.mult, 0, -24);
        ctx.fillText('连击 x' + p.mult, 0, -24);
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  // v327：广告演示层 drawAdOverlay 已移除（先不做广告）

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
    // v300：恢复标题行（用户："返回、结算页签还是恢复标题栏吧"）；大分数与统计行回到原位
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
    // v276：挑战局结果行（与挑战芯片同语义：目标=到达最深海洋，显示海域进度+完整增益倍率）
    if (ng && ng.active) {
      var chalPct = Math.min(100, Math.round((seaStage() + 1) / C.seaStages.length * 100));
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

  // ---------- 首局主动引导（前 5 投分步提示，只出现一次） ----------
  function drawTutorial() {
    if (tutDone || state !== 'play' || dexOpen || confirmOpen) return;
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

  // ---------- 开始界面（v237：沉浸式海底环境 + 艺术字标题 + 主页↔游戏涟漪揭幕过渡） ----------
  // 主页↔游戏过渡进度：返回 0~1 或 null（无过渡）。performance.now 时钟（菜单态 time 也在走，但
  // restart 后首帧 time 语义不稳，与 segAnims 同策略用 now）。结束时自动清 dir 并释放快照。
  function menuTransK() {
    if (!menuTrans.dir) return null;
    var k = (performance.now() / 1000 - menuTrans.t0) / menuTrans.dur;
    if (k >= 1) { menuTrans.dir = null; menuTrans.snap = null; return null; }
    return k < 0 ? 0 : k;
  }
  // 涟漪揭幕快照：过渡首帧开头（目标场景尚未绘制、画布上仍是旧场景）截取整屏到离屏画布，
  // 供涟漪扩散时贴在圆外——圆外=旧画面冻结帧，圆内=实时新场景。
  function grabTransSnap() {
    if (!menuTrans.dir || menuTrans.snap) return;
    var cv = document.getElementById('game');
    if (!cv || !cv.width) return;
    var sn = document.createElement('canvas');
    sn.width = cv.width; sn.height = cv.height;
    sn.getContext('2d').drawImage(cv, 0, 0);
    menuTrans.snap = sn;
  }
  // 涟漪揭幕过渡（B 方案定版）：旧画面以涟漪起点为圆心被三重水环荡开，新画面从圆心
  // 以水波圆边界揭示——easeInOutCubic 缓动（起步蓄势-中段扩散-收尾轻缓），
  // 主缘白色泡沫粗线 + 外侧淡蓝光晕 + 三重涟漪环 + 起点溅珠闪环 + 圆内边缘水光。
  // ⚠ 整层在【物理像素坐标系】绘制（setTransform 恒等）：快照 1:1 贴回零失真——
  // 若在内容层逻辑坐标贴回，物理画布宽=C.W*dpr*view.s 仅在 view.s 按宽适配时成立，
  // 窗口更宽时快照会被压缩偏移（v239 的"主页靠左缩"即此 bug）。
  function drawRippleReveal(k) {
    var ek = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; // easeInOutCubic
    var kp = dpr * view.s;                                    // 逻辑→物理缩放因子
    var sn = menuTrans.snap;
    var pw = sn ? sn.width : Math.round(C.W * kp);            // 物理画布尺寸（快照=主画布）
    var ph = sn ? sn.height : Math.round(VH * kp);
    var cpx = (menuTrans.sx + BX) * kp;                       // 圆心：内容层逻辑 → 物理
    var cpy = (menuTrans.sy + renderOy) * kp;
    var maxR = Math.sqrt(Math.pow(Math.max(cpx, pw - cpx), 2) + Math.pow(Math.max(cpy, ph - cpy), 2)) + 30 * kp;
    var r = ek * maxR;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);                       // 物理像素坐标
    // 旧画面贴圆外（even-odd：矩形-圆环差集，1:1 零失真）
    if (sn) {
      ctx.beginPath();
      ctx.rect(-4, -4, pw + 8, ph + 8);
      ctx.arc(cpx, cpy, Math.max(0.1, r), 0, Math.PI * 2);
      ctx.clip('evenodd');
      ctx.drawImage(sn, 0, 0);
    }
    // 圆内边缘水光：新场景边缘被一圈淡白水光洗过（半径 0.9r~r 的柔光环）
    if (r > 8 * kp) {
      var wg = ctx.createRadialGradient(cpx, cpy, r * 0.82, cpx, cpy, r);
      wg.addColorStop(0, 'rgba(255,255,255,0)');
      wg.addColorStop(0.8, 'rgba(210,240,255,' + (0.18 * (1 - ek) + 0.05).toFixed(2) + ')');
      wg.addColorStop(1, 'rgba(255,255,255,' + (0.3 * (1 - ek) + 0.06).toFixed(2) + ')');
      ctx.fillStyle = wg;
      ctx.beginPath(); ctx.arc(cpx, cpy, r, 0, Math.PI * 2); ctx.fill();
    }
    // 三重涟漪环：主缘 + 两道滞后环（线宽/亮度逐级衰减，波形轻微起伏）
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
        var wob = 1 + Math.sin(a * 9 + time * 6 - ri * 1.7) * 0.012; // 环缘微波
        var px = cpx + Math.cos(a) * rg.rr * wob;
        var py = cpy + Math.sin(a) * rg.rr * wob;
        if (a === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.strokeStyle = ri === 0 ? 'rgba(255,255,255,' + rg.a.toFixed(2) + ')'
                                 : 'rgba(190,232,255,' + rg.a.toFixed(2) + ')';
      ctx.lineWidth = Math.max(0.6, rg.w) * kp;
      ctx.stroke();
    }
    // 主缘外侧淡蓝光晕环（水波荡开的体积感）
    if (r > 12 * kp) {
      var og = ctx.createRadialGradient(cpx, cpy, r * 0.96, cpx, cpy, r * 1.12);
      og.addColorStop(0, 'rgba(160,220,250,' + (0.3 * (1 - ek)).toFixed(2) + ')');
      og.addColorStop(1, 'rgba(160,220,250,0)');
      ctx.fillStyle = og;
      ctx.beginPath(); ctx.arc(cpx, cpy, r * 1.12, 0, Math.PI * 2); ctx.fill();
    }
    // 起手溅珠：圆心附近几颗水珠沿抛物线溅起（前 35% 进度）
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
      // 起点闪环（第一圈波纹爆开的亮环）
      var fr = (12 + ek / 0.35 * 34) * kp;
      ctx.strokeStyle = 'rgba(255,255,255,' + ((1 - ek / 0.35) * 0.7).toFixed(2) + ')';
      ctx.lineWidth = 2.4 * kp;
      ctx.beginPath(); ctx.arc(cpx, cpy, fr, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }
  // 海草一株（v287 重设计：丛状巨藻——四片宽飘带叶错落叠层，根宽 9~13px、叶缘正弦波浪、
  // 双色调前后层次 + 中脉高光 + 交错小叶；替代 v279 单根细飘带的"铁丝"观感。
  // h 为高度档 ×26px，dir=摆向）
  function drawKelp(bx, h, dir) {
    var H = h * 26, sd = bx * 0.11 + dir * 3;
    var baseY = VH + 2;
    var segs = 10, i, j;
    // 一条宽飘带：根宽 wRoot→梢宽 wTip，叶缘带正弦波浪（海藻叶），S 弯 + 整体摆动
    function blade(ox, hh, ph, wRoot, wTip, col, lw) {
      var pts = [];
      for (i = 0; i <= segs; i++) {
        var t = i / segs;
        var bend = Math.sin(time * 0.85 + sd + ph) * 9 * dir + Math.sin(t * 2.2 + sd * 3.1 + ph) * hh * 0.09;
        var w = wRoot + (wTip - wRoot) * t;
        var wob = Math.sin(t * 9 + sd * 2 + ph * 2.3) * w * 0.30;  // 叶缘波浪
        pts.push({ x: bend * t * t, y: baseY - hh * t, w: w + wob * 0.5 });
      }
      ctx.beginPath();
      ctx.moveTo(bx + pts[0].x + ox - pts[0].w, pts[0].y);
      for (j = 1; j <= segs; j++) ctx.lineTo(bx + pts[j].x + ox - pts[j].w, pts[j].y);
      for (j = segs; j >= 0; j--) ctx.lineTo(bx + pts[j].x + ox + pts[j].w, pts[j].y);
      ctx.closePath();
      ctx.fillStyle = col;
      ctx.fill();
      if (lw) { // 中脉高光
        ctx.strokeStyle = 'rgba(150,215,240,0.16)';
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(bx + pts[0].x + ox, pts[0].y);
        for (j = 1; j <= segs; j++) ctx.lineTo(bx + pts[j].x + ox, pts[j].y);
        ctx.stroke();
      }
    }
    // 四叶叠层：后排两片暗、中片次暗、前片亮 + 高光——错落高度/相位/左右偏移成一丛
    // v289：收窄整体（偏移 ±8、根宽 7.5~11、摆幅 9）——一丛实宽由 ~92 降到 ~64，
    // 配合 82px 槽位间距才不会整丛叠压（用户："水草还是不行，都挤到一起了"）
    blade(-8, H * 0.60, 1.9, 7.5, 1.2, 'rgba(8,38,66,0.20)', false);
    blade(8, H * 0.76, 3.6, 8.5, 1.2, 'rgba(8,38,66,0.26)', false);
    blade(-3, H * 0.90, 0.8, 9.5, 1.4, 'rgba(10,44,74,0.30)', false);
    blade(2, H, 0, 11, 1.6, 'rgba(10,44,74,0.36)', true);
    // 主茎两侧交错小叶（4 枚，弯月形，随相位微摆）
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
  // 圆头短叶草丛一丛（v287 重设计：5 叶宽飘带扇形丛——后排暗衬托 2 叶 + 前排亮 3 叶，
  // 叶身渐细带弯头、随水流独立摆动；替代 v279 三细叶"针"状观感）
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
        // 圆弯叶尖（小弧过渡到另一缘）
        ctx.quadraticCurveTo(tipX + 2.6 * tipDir, tipY - 1.5, tipX + 3 * tipDir, tipY + 2.5);
        ctx.quadraticCurveTo(lx + wb2 * 0.4 + lsway * 0.4, baseY - lh * 0.55, lx + wb2, baseY);
        ctx.closePath(); ctx.fill();
      }
    }
  }
  // 沉浸式海底环境：顶部光柱 / 浮游颗粒 / 上升气泡 / 鱼群剪影 / 暗角
  // 全部 time 驱动程序绘制（无实体、无贴图），叠加在海域背景渐变之上制造纵深
  //（v291 水草删除、v292 海床沙丘删除）
  function drawMenuScene() {
    var i;
    var mvk = Math.round(VH);
    // v295：四道斜光共用同一条竖直渐变（几何完全相同，只是多边形在动）——原本每帧新建
    // 4 个渐变对象，GPU 每帧都要重新上传渐变纹理，长时间运行会加剧显存/资源抖动
    var rg = grad('menuRay' + mvk, function () {
      var gg = ctx.createLinearGradient(0, 0, 0, VH * 0.75);
      gg.addColorStop(0, 'rgba(210,240,255,0.13)');
      gg.addColorStop(1, 'rgba(210,240,255,0)');
      return gg;
    });
    // 顶部光柱（god rays）：4 道斜光缓慢摆动
    for (i = 0; i < 4; i++) {
      var rayX = 60 + i * 100;
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
    // 浮游颗粒：微尘漂移 + 闪烁
    for (i = 0; i < 16; i++) {
      var sd = i * 137;
      var px = 20 + (sd * 7 % (C.W - 40)) + Math.sin(time * 0.4 + i) * 8;
      var py = (sd * 13 % VH) + Math.sin(time * 0.25 + i * 2.1) * 14;
      var pa = 0.04 + 0.05 * (0.5 + 0.5 * Math.sin(time * 1.2 + i * 2.3));
      ctx.fillStyle = 'rgba(230,248,255,' + pa.toFixed(2) + ')';
      ctx.beginPath(); ctx.arc(px, py, 1.2 + (i % 3) * 0.7, 0, Math.PI * 2); ctx.fill();
    }
    // 气泡：上升 + 左右轻摆，大小分层
    for (i = 0; i < 12; i++) {
      var seed = i * 97;
      var bx = 24 + (seed % (C.W - 48)) + Math.sin(time * 0.8 + i * 1.9) * 10;
      var by = VH + 40 - ((time * (16 + i * 3.5) + seed * 3) % (VH + 140));
      var br = 2.5 + (i % 4) * 2.6;
      ctx.beginPath();
      ctx.fillStyle = 'rgba(255,255,255,' + (0.05 + (i % 3) * 0.045).toFixed(2) + ')';
      ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    // 鱼群剪影：2 条小鱼横向游过（不同深度/速度，出屏回绕，转身翻面）
    for (i = 0; i < 2; i++) {
      var fd = i * 53, speed = 22 + i * 14;
      var trav = time * speed + fd * 40;
      var fx2 = (trav % (C.W + 120)) - 60;
      var fy2 = 215 + i * 125 + Math.sin(time * 0.9 + i * 2.4) * 12;
      var fs2 = 0.8 + i * 0.35;
      var flip = (Math.floor(trav / (C.W + 120)) % 2) ? -1 : 1;
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
    // 海草丛：左右各三株巨藻（v283：间距 28→44/46 拉开，叶长 20 不再互相叠压）+ 底角圆头草丛
    // v291：水草全部删除（用户："太丑了，先删了吧"）——主页与局内侧栏不再绘制巨藻/草丛；
    // drawKelp / drawGrassTuft 两个绘制函数保留备用，当前无调用点
    // v292：主页海床沙丘已删除（用户："开始游戏下面靠近底部的深色区域是什么？请删掉"）；
    // 游戏局内的底部装饰（沙丘/卵石/海星/扇贝，layout.band）不受影响
    // 轻遮罩（顶部略深护标题对比度）+ 暗角聚焦（v287：整体减淡约 40%——原 0.34/0.14/0.30
    // 叠 0.36 暗角把主页压得发灰（用户："背景感觉发灰，不太透亮"），现只留轻聚焦）
    // v295：遮罩/暗角同为静态渐变，改走 grad 缓存（原每帧新建 2 个）
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
  // 艺术字标题「水滴合成深海」：站酷庆科黄油体（js/titlefont.js 注册到 MG.titleFontFamily）
  // 直接按字体逐字绘制，错落起伏摇摆；同色柔光让边缘柔和融入背景
  function drawTitleArt(ty) {
    var txt = '水滴合成深海';
    var adv = 48;
    // 逐字错落配置（大小/位移/倾角固定，保证每帧一致）
    var CH = [
      { s: 1.00, dy: 1,  rot: -0.035 },
      { s: 0.94, dy: 4,  rot: 0.045 },
      { s: 1.04, dy: -1, rot: -0.03 },
      { s: 0.96, dy: 3,  rot: 0.035 },
      { s: 1.02, dy: -1, rot: -0.04 },
      { s: 0.97, dy: 3,  rot: 0.03 }
    ];
    var x0 = C.W / 2 - adv * (txt.length - 1) / 2;
    // 统一浪相位：整排字 + 装饰共用同一浮动节奏
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
      // v278：删同色柔光（shadowBlur 光晕把字面泡得发虚，用户"感觉虚虚的"）——单遍实色绘制，
      // 圆体字本身笔画圆润，硬边即可干净醒目
      ctx.fillStyle = '#2E86B4';
      ctx.fillText(txt[i], 0, -16);
      ctx.restore();
    }
    // —— 装饰三角（复用游戏本体素材）：左下海螺 · 右上五角海星 · 右下微笑水滴 ——
    drawShell(x0 - 34, ty + 8 - tBob * 0.6, 9);
    drawStarfish(x0 + adv * 5 + 38, ty - 46 + tBob, 11);
    // —— 小水滴：直接复用游戏内水滴精灵 drawBall（自带渐变体/表情/高光）——
    ctx.save();
    ctx.translate(x0 + adv * 5 + 38, ty - 6 + tBob * 0.8);
    ctx.rotate(Math.sin(time * 1.6) * 0.06);
    drawBall({ x: 0, y: 0, r: 11, tier: 1, vx: 0, vy: 0, id: 7 }, 1);
    ctx.restore();
    // v299：恢复基线——本函数把 textBaseline 设为 'middle' 且未恢复，主页其后绘制的
    // 离线卡（按 alphabetic 语义算基线）三行被各自顶高不同幅度，排列看起来不居中
    ctx.textBaseline = 'alphabetic';
  }
  // 主页内容层（环境之上）：艺术字标题 / 副标题 / 功能磁贴 / 吉祥物 / 离线卡 / 开始钮
  function drawMenuContent() {
    var mu = MG.layout.menu;
    var pulse = 0.5 + 0.5 * Math.sin(time * 2.4);
    ctx.textAlign = 'center';

    drawTitleArt(mu.titleY);

    // 左右功能磁贴（深海玻璃牌：图标+标签收在块内）
    for (var i = 0; i < menuTiles.length; i++) drawMenuTile(menuTiles[i]);

    // 中央水滴吉祥物（轻轻上下浮动）
    drawMascot(C.W / 2, mu.mascotCy);

    // 离线收益告知卡（有离线收益时显示，开局自动入账）
    drawOfflineCard();

    // 开始按钮：深海蓝大胶囊 + 呼吸光圈
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

  // 菜单功能磁贴：深海玻璃牌（与海域牌/历史最佳牌同语言：蓝渐变+白描边）；
  // 图标+标签收在块内（图标上、文字下），不再外溢遮挡下一行；pressT 按压缩放（几何真源 layout.menuTileRect）
  function drawMenuTile(t) {
    var r = MG.layout.menuTileRect(t.side, t.i);
    var sc = 1 - Math.min(0.12, Math.max(0, t.pressT) * 0.75);
    ctx.save();
    ctx.translate(r.x + r.w / 2, r.y + r.h / 2);
    ctx.scale(sc, sc);
    ctx.fillStyle = 'rgba(6,26,48,0.30)';
    roundRect(-r.w / 2, -r.h / 2 + 4, r.w, r.h, 16); ctx.fill(); // 底部投影
    var g = ctx.createLinearGradient(0, -r.h / 2, 0, r.h / 2);
    g.addColorStop(0, '#2E86B4');
    g.addColorStop(1, '#155A8A');
    ctx.fillStyle = g;
    roundRect(-r.w / 2, -r.h / 2, r.w, r.h, 16); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.65)';
    ctx.lineWidth = 2;
    roundRect(-r.w / 2 + 1, -r.h / 2 + 1, r.w - 2, r.h - 2, 15); ctx.stroke();
    // 顶部高光弧（玻璃质感）
    ctx.strokeStyle = 'rgba(255,255,255,0.28)';
    ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, 6, r.h / 2 - 9, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
    ctx.lineCap = 'butt';
    // 图标（上）+ 标签（下），全部收在块内
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

  // 水滴吉祥物：大方的水滴角色（上尖下圆 + 高光 + 表情），轻轻浮动
  // 中央展示水滴（v287：弃自绘吉祥物水滴，改轮播游戏内水滴——每秒切换一颗：
  // 普通 1~8 档 → 12 种特殊滴（漩涡/雨云/彩虹/疾风/磁石/泉涌/雷霆/珍珠/熔岩/间歇泉/虚空/极光）
  // → 珊瑚礁 → 大宝箱，共 22 颗循环；切换时 easeOutBack 弹出，本体逐笔复用游戏渲染
  // drawBall/drawIronBall/drawChest，与局内完全同款（用户："更换为游戏水滴样式"）
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
    // v289：一颗停留 3s（原 1s，用户："切换太快"）——入 0.72s easeOutBack 弹出、末 0.48s 缓慢
    // 缩小淡出，出入场都放慢，中间 1.8s 静态展示
    var CYC = 3.0;
    var tick = time / CYC;
    var idx = Math.floor(tick) % list.length;
    var ph = tick - Math.floor(tick);        // 本颗内相位 0~1
    var sc = 1, alpha = 1;
    if (ph < 0.24) {                         // 弹入：0.4 → 过冲 1.12 → 1
      var u = ph / 0.24 - 1;
      sc = 0.4 + 0.6 * (1 + 2.70158 * u * u * u + 1.70158 * u * u);
      if (sc > 1.12) sc = 1.12;
    } else if (ph > 0.84) {                  // 淡出：末段缓缩 + 渐隐（easeIn，不突兀）
      var v = (ph - 0.84) / 0.16;
      sc = 1 - 0.4 * v * v;
      alpha = 1 - v * v;
    }
    cy += Math.sin(time * 1.8) * 4;          // 保留原上下浮动
    // 地面柔影（随弹出缩放、退场同步淡出）
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = 'rgba(8,34,60,0.25)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + r + 10, r * 0.7 * sc, 9 * sc, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // 游戏水滴本体：构造假球对象走局内同一条渲染管线（无拖尾/无变形字段即干净呈现）
    var ball = { x: cx, y: cy, r: r * sc, vx: 0, vy: 0, id: 3 };
    var show = list[idx];
    for (var k in show) ball[k] = show[k];
    drawBall(ball, alpha);
  }

  // ---------- 主渲染 ----------
  function render() {
    grabTransSnap(); // 涟漪揭幕：过渡首帧开头截取旧画面（此刻画布上仍是上一帧的源场景）

    // v297：每帧开头强制复位易泄漏的全局状态——任何一次绘制中途异常（如 chest.t）都会
    // 跳过配对的 ctx.restore()，把 globalAlpha/线帽/虚线遗留在中间值上；残留 globalAlpha
    // 会让之后每帧的背景填充都变成半透明叠加（花屏主因之一），这里兜底清零
    ctx.globalAlpha = 1;
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'miter';
    ctx.setLineDash([]);

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
      var tK = menuTransK();
      drawMenuScene();               // 沉浸式海底环境（全时不透明）
      drawMenuContent();             // 主页内容（'out' 过渡时从涟漪圆心实时露出，无需整体淡入）
      // v273：设置钮属于"新场景内容"，先于涟漪揭示层绘制——否则过渡期间齿轮会浮在
      // 旧画面快照之上（用户："点击返回主页后，设置按钮直接漏到最上方了"），
      // 随涟漪从圆心一起被揭示才合理。
      ctx.save();
      ctx.translate(0, hudInset);
      drawSetBtn();               // 设置入口（音效/音乐/震动弹窗，systems 菜单分支处理）
      ctx.restore();
      if (tK !== null) drawRippleReveal(tK); // 过渡涟漪最后画（圆外贴旧画面快照）
      // v274：弹层统一弹性出入场——flag 关闭后动画未完仍继续绘制，收拢完毕自动停
      // v275：dimA 只淡入淡出，弹性缩放仅作用于页签本体
      if (setOpen || panelFxAlive('set')) { var msR = MG.layout.setRect(); drawPanelFx('set', setOpen, msR.x + msR.w / 2, msR.y + msR.h / 2, 0.55, drawSettings); }
      // v317：清空存档二级确认叠在设置面板之上（同层后画即在上）
      if (setClearOpen || panelFxAlive('setclr')) { var mcR = MG.layout.setClearRect(); drawPanelFx('setclr', setClearOpen, mcR.x + mcR.w / 2, mcR.y + mcR.h / 2, 0.6, drawSetClear); }
      if (achOpen || panelFxAlive('ach')) drawPanelFx('ach', achOpen, DEX_PANEL.x + DEX_PANEL.w / 2, DEX_PANEL.y + DEX_PANEL.h / 2, 0.6, drawAchPanel);
      ctx.restore(); return;
    } // 开始界面：背景之上画菜单 + 设置入口 + 设置弹窗 + 成就殿堂面板

    drawContainer();
    drawDangerLine();
    drawWaterBack();
    // v310：指示线在实体层之前绘制（坠落中的水滴盖在线上，线在"水滴后面"）
    if (state === 'play' && !evapMode && !flowMode && !rippleMode && !confirmOpen) {
      drawGhostGuide(aimX, nextTier);
    }

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

    if (state === 'play' && !evapMode && !flowMode && !rippleMode && !confirmOpen) {
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
      drawPropHint('蒸发模式：点击要移除的水滴或珊瑚礁（再点按钮取消）');
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
      drawPropHint('涟漪模式：点击选择波纹中心（再点按钮取消）');
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
      var flowHint = flowPick ? '水流模式：再点一枚水滴与之交换（点原滴取消）' : '水流模式：点选第一枚水滴';
      drawPropHint(flowHint);
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
    // HUD（分数/进度/任务/潮汐胶囊/设置钮）统一 +hudInset 平移；设置钮命中侧同步 +hudInset。
    // 涨潮横幅 v188 起锚堆叠空间中心，不参与平移。
    if (hudInset > 0) { ctx.save(); ctx.translate(0, hudInset); }
    drawHUD();
    if (!questHidden) drawQuest();   // v202：任务元素隐藏时跳过（开关 questHidden）
    drawSeaProgress();               // 海域进度条：原内嵌于 drawQuest，现独立绘制（不受任务隐藏影响）
    drawTideTimer();                // 潮汐计时器：原 drawTidePill，v202 重设计为动态一行
    drawChalChip();                 // v273：深渊潜航/每日挑战局信息芯片（挑战中显示目标与进度）
    if (hudInset > 0) ctx.restore();
    drawTideBanner(); // v188：涨潮横幅锚堆叠空间中心（非 HUD 元素，不吃 hudInset 平移）
    drawDangerText(); // v326：越线警示文字改在实体层之后绘制（原在 drawDangerLine 内，堆高越线时被水滴盖住）
    drawGhostLabel(); // 最后绘制，保证特殊滴标签浮在最上层且紧贴虚影球
    drawPopups();     // 浮动文字最上层（礁石来袭/任务完成/得分等，不被 HUD 遮挡）
    drawSkillBar();
    // v274：弹层统一弹性出入场（关闭后动画未完仍继续绘制至收拢完毕）
    if (confirmOpen || panelFxAlive('confirm')) { var pcR = MG.layout.confirmRect(); drawPanelFx('confirm', confirmOpen, pcR.x + pcR.w / 2, pcR.y + pcR.h / 2, 0.55, drawConfirm); }
    if (setOpen || panelFxAlive('set')) { var psR = MG.layout.setRect(); drawPanelFx('set', setOpen, psR.x + psR.w / 2, psR.y + psR.h / 2, 0.55, drawSettings); }
    if (setClearOpen || panelFxAlive('setclr')) { var pc2R = MG.layout.setClearRect(); drawPanelFx('setclr', setClearOpen, pc2R.x + pc2R.w / 2, pc2R.y + pc2R.h / 2, 0.6, drawSetClear); }

    if (dexOpen || panelFxAlive('dex')) drawPanelFx('dex', dexOpen, DEX_PANEL.x + DEX_PANEL.w / 2, DEX_PANEL.y + DEX_PANEL.h / 2, 0.6, drawDex);
    else if (achOpen || panelFxAlive('ach')) drawPanelFx('ach', achOpen, DEX_PANEL.x + DEX_PANEL.w / 2, DEX_PANEL.y + DEX_PANEL.h / 2, 0.6, drawAchPanel);
    if (ngOpen || panelFxAlive('ng')) { var pnR = MG.layout.ngRect(); drawPanelFx('ng', ngOpen, pnR.x + pnR.w / 2, pnR.y + pnR.h / 2, 0.66, drawNgPick); }
    if (shareOpen || panelFxAlive('share')) { var pshR = MG.layout.shareRect(); drawPanelFx('share', shareOpen, pshR.x + pshR.w / 2, pshR.y + pshR.h / 2, 0.6, drawShare); }
    // v327：广告演示层调用已移除（先不做广告）
    if (state === 'over') drawOver();

    ctx.restore();

    // 入局涟漪揭幕（restore 后内容层坐标绘制，覆盖含侧延伸的全屏；圆外贴主页快照）
    var tkIn = menuTransK();
    if (tkIn !== null) drawRippleReveal(tkIn);
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
