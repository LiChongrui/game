// 水滴合成深海 - panels：面板几何 + 面板绘制（图鉴 / 成就殿堂 / 每日 / 榜单 / 分享卡）
// 模块加载顺序 3.5/4（systems 之后、render 之前）。四个模块共享全局作用域（经典 script），
// 本文件只有"函数声明 + 纯数据 + 几何常量"，无顶层调用语句，加载序不敏感；
// 绘制函数引用的游戏状态（daily / dexUnlocked / SP_DEFS 等）与工具（grad / roundRect / panel）
// 均在运行期经全局作用域解析，与定义处所在文件解耦。
// 拆分动机：面板几何此前散在 systems（命中判定）与 render（绘制）两处，改布局需全文搜索；
// 现统一收敛到本文件——几何常量与绘制同源，渲染与点击热区天然一致。

  // ---------- 面板几何（渲染与点击热区共用，一处定义）----------
  // 尺寸/锚点走 MG.layout（改比例只改 config C.H，此处自动跟随）；y 为动态值：
  var DEX_PANEL = { x: MG.layout.panel.dex.x, y: 65, w: MG.layout.panel.dex.w, h: MG.layout.panel.dex.h };
  var dexCloseBtn = { x: DEX_PANEL.x + DEX_PANEL.w - 40, y: DEX_PANEL.y + 10, w: 30, h: 30 }; // 右上 × 关闭（中心 +25px，与页头标题文字对齐）
  // 面板垂直居中：菜单态（铺满）以整屏 VH 为基准；局内游戏块高 C.H 为基准（比例旋钮，
  // 居中块=屏幕中心，块内 (C.H-h)/2 + 偏移 renderOy 恰好落在屏幕中央）——每帧绘制前重算
  function layoutDexPanel() {
    // 局内按底部锚定链（layout.panel.dexY = 120+dy，随块底平移）；菜单态铺满全屏按 VH 居中
    DEX_PANEL.y = state === 'menu'
      ? Math.max(10, Math.round((VH - DEX_PANEL.h) / 2))
      : Math.max(10, Math.round(MG.layout.panel.dexY));
    dexCloseBtn.y = DEX_PANEL.y + 8;
  }
  // 设置面板（v197：音效/音乐/震动三开关；v200 起复用本游戏通用面板——页头/关闭走
  // drawPanelHeader，与图鉴/成就同一套视觉，不再单独写一套页头与 ✕）
  var SET_PANEL = { x: 0, y: 0, w: 0, h: 0 };
  var setCloseBtn = { x: 0, y: 0, w: 30, h: 30 }; // 右上 × 关闭（与图鉴同款：圆底 #4A7FA0）
  function layoutSetPanel() {
    var r = MG.layout.setRect();
    SET_PANEL.x = r.x; SET_PANEL.y = r.y; SET_PANEL.w = r.w; SET_PANEL.h = r.h;
    setCloseBtn.x = r.x + r.w - 40; setCloseBtn.y = r.y + 8; // 同 dexCloseBtn 惯例
  }
  var shareCopyBtn = { x: 0, y: 0, w: 150, h: 42 }; // 分享卡片：复制文案按钮（打开时定位）
  function spSlotRect(stg, s) {
    // 海域演进行右侧的特殊滴槽位（s=0/1），宝箱也占一个槽位；与 stageRowRect 同基
    var r = stageRowRect(stg);
    return { x: r.x + r.w - 196 + s * 98, y: r.y + 6, w: 92, h: 32 }; // v279：随行高 44 居中（(44-32)/2）
  }
  function tierCellRect(t) {
    // 合成链分节：3 列 × 3 行（9 档）——v279：水平/垂直均匀分布（面板 w380：左右边距 14=列间距，
    // v289：格高 118→112、行距 136→126——末排底 y+488，与底部说明区（y+518）间距 4→30
    //（用户："最后一排水滴块与底部的水滴说明之间的间距要增大"）；格内三元素间距统一 5px
    return { x: DEX_PANEL.x + 14 + (t % 3) * 122, y: DEX_PANEL.y + 124 + Math.floor(t / 3) * 126, w: 108, h: 112 };
  }
  function stageRowRect(g) {
    // 海域演进分节：8 行纵向列表（由浅入深）——v279：随收集度行下移，内容区 y+126 起、
    // 行距 48 / 行高 44，末行底 y+506，与说明区间距 8（上下留白对称）
    return { x: DEX_PANEL.x + 14, y: DEX_PANEL.y + 126 + g * 48, w: DEX_PANEL.w - 28, h: 44 };
  }
  function dexSecRect(i) {
    // 分节切换：通栏分段控件（合成链 / 海域演进——特殊滴已并入海域行），样式与顶部页签区分
    // v279：收集度行放大下移后页签 y+64→y+84（与收集度行留 8px，与内容区留 6px）
    var segW = Math.floor((DEX_PANEL.w - 30) / 2);
    return { x: DEX_PANEL.x + 15 + i * segW, y: DEX_PANEL.y + 84, w: segW, h: 34 };
  }
  function dchalBtnRect() {
    // 每日挑战「开始挑战」按钮（v245：宽度随文本自适应、高 36，水平居中于面板；合并进今日 Hero 卡内）
    ctx.font = 'bold 15px system-ui, sans-serif';
    var tw = Math.round(ctx.measureText('开始挑战').width);
    var w = tw + 56, h = 36;
    return { x: DEX_PANEL.x + Math.round((DEX_PANEL.w - w) / 2), y: DEX_PANEL.y + 152, w: w, h: h };
  }

  // ---------- 成就视图滚动几何（v243：徽章卡单列，超出面板可拖拽/滚轮滚动）----------
  var ACH_ROW_H = 64, ACH_ROW_GAP = 8;
  function achViewport() {
    // 内容可视区：页头下 52 到面板底上 16
    return { x: DEX_PANEL.x + 10, y: DEX_PANEL.y + 52, w: DEX_PANEL.w - 20, h: DEX_PANEL.h - 68 };
  }
  function achContentH() { return ACH_DEFS.length * (ACH_ROW_H + ACH_ROW_GAP) - ACH_ROW_GAP; }
  function achMaxScroll() { return Math.max(0, achContentH() - (DEX_PANEL.h - 68)); }

  // ---------- 面板绘制 ----------
  // 通用页头：左侧标题 + 右上 × 关闭（图鉴/成就/设置共用；rect+closeBtn 由调用方传入，
  // 使各面板不必各自写一套页头，统一视觉语言；标题为空则不画，避免与页签重名）
  // 通用页头（v275）：可选图标 + 标题 + ✕，三者同一水平中线
  // （中线 = ✕ 按钮几何中心，命中与视觉同源；title 基线改 middle 对准中线，消除错位）
  // v276：icon 支持字符串（emoji）或函数（自定义白字形，画在 accent 圆内、原点=圆心）；
  // noBg=true 时 emoji 直接裸画（不加圆环底），四成就页签用（用户："只要主图标，圆环形背景不需要"）
  function drawPanelHeader(title, rect, closeBtn, icon, accent, noBg) {
    var cy = closeBtn ? closeBtn.y + closeBtn.h / 2 : rect.y + 30;
    ctx.textAlign = 'left';
    var tx = rect.x + 18;
    if (icon) {
      var icx = rect.x + 30;
      if (typeof icon === 'function') {
        // v279：图标圆与来源按钮（drawCircleBtn）同一绘制语言——渐变 accent 底 + 白细内环 + 左上高光弧
        var ac = accent || '#2E86B4';
        var ig = ctx.createLinearGradient(0, cy - 12, 0, cy + 12);
        ig.addColorStop(0, ac);
        ig.addColorStop(1, shade(ac, -0.25));
        ctx.fillStyle = ig;
        ctx.beginPath(); ctx.arc(icx, cy, 12, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(icx, cy, 11.25, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(icx, cy, 8, Math.PI * 1.1, Math.PI * 1.5); ctx.stroke();
        ctx.save(); ctx.translate(icx, cy); icon(); ctx.restore();
      } else if (noBg) {
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = '19px system-ui, sans-serif';
        ctx.fillText(icon, icx, cy + 1);
        ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      } else {
        ctx.fillStyle = accent || '#2E86B4';
        ctx.beginPath(); ctx.arc(icx, cy, 12, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(icx, cy, 9.5, 0, Math.PI * 2); ctx.stroke();
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = '14px system-ui, sans-serif';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(icon, icx, cy + 1);
        ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      }
      tx = rect.x + 50;
    }
    if (title) {
      ctx.fillStyle = '#155A8A';
      ctx.font = 'bold 19px system-ui, sans-serif';
      ctx.textBaseline = 'middle';
      ctx.fillText(title, tx, cy + 1);
      ctx.textBaseline = 'alphabetic';
    }
    if (!closeBtn) return;
    ctx.fillStyle = 'rgba(46,134,180,0.12)';
    ctx.beginPath(); ctx.arc(closeBtn.x + closeBtn.w / 2, closeBtn.y + closeBtn.h / 2, 13, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#4A7FA0'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    var ccx = closeBtn.x + closeBtn.w / 2, ccy = closeBtn.y + closeBtn.h / 2;
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
  // 图鉴页头收集度徽条：进度条 + 四个里程碑刻度（25/50/75/100%），已达成的点亮金色圆点
  // 纯展示无交互；数据来自 systems 的 colProgress/COL_MILESTONES（运行期全局解析）
  function drawColBadge() {
    // v279：独立行再下移放大（用户：上下间距太挤、太小）——行中线 y+64（页头下留 24px 空隙、
    // 与子页签 y+84 上留 8px），标签 14px 粗体 + 进度条 12px 高 + 计数 15px 粗体
    var cp = colProgress();
    var pct = cp.n / cp.total;
    var full = pct >= 1;
    var rowCy = DEX_PANEL.y + 64;
    var bx = DEX_PANEL.x + 70, bw = DEX_PANEL.w - 136, by = rowCy - 6, bh = 12;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#4A7FA0';
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.fillText('收集度', DEX_PANEL.x + 15, rowCy);
    ctx.fillStyle = 'rgba(21,90,138,0.12)';
    roundRect(bx, by, bw, bh, bh / 2); ctx.fill();
    if (pct > 0) {
      ctx.fillStyle = full ? '#D9A93F' : '#2E86B4';
      roundRect(bx, by, Math.max(bh, bw * pct), bh, bh / 2); ctx.fill();
    }
    for (var i = 0; i < COL_MILESTONES.length; i++) {
      var m = COL_MILESTONES[i];
      var mx = bx + bw * m.pct;
      if (colClaimed[m.id]) {
        ctx.fillStyle = '#F5C542';
        ctx.beginPath(); ctx.arc(mx, by + bh / 2, 3.8, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 1; ctx.stroke();
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.fillRect(mx - 1, by + 2, 2, bh - 4);
      }
    }
    ctx.textAlign = 'right';
    ctx.fillStyle = '#155A8A';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillText(cp.n + '/' + cp.total, DEX_PANEL.x + DEX_PANEL.w - 15, rowCy);
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'center';
  }

  function drawDex() {
    layoutDexPanel();
    // 压暗背景已上移 drawPanelFx 统一绘制（v275）
    panel(DEX_PANEL.x, DEX_PANEL.y, DEX_PANEL.w, DEX_PANEL.h, 14, 0.96);
    // v279：图标 = 图鉴按钮（技能栏书本钮）同款矢量书本——逐笔同代码（16×12 描边框+中缝、线宽1.8）；
    // v283：整体等比缩 0.6——图标圆 r12 = 按钮 r20 的 0.6，缩放后图标/圆的比例与按钮完全一致
    //（用户："内部形状太大了，与原图标比例不一样"）
    drawPanelHeader('图鉴', DEX_PANEL, dexCloseBtn, function () {
      ctx.save(); ctx.scale(0.6, 0.6);
      ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 1.8;
      ctx.strokeRect(-8, -6, 16, 12);
      ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(0, 6); ctx.stroke();
      ctx.restore();
    }, '#4A7FA0');
    drawColBadge();

    // —— 分节切换：通栏分段控件（特殊滴槽位已并入海域演进，不再单列）——
    var secNames = ['合成链', '海域演进'];
    var secRects = [dexSecRect(0), dexSecRect(1)];
    drawSegTabs(secRects, secNames, dexSec, -1, 'dexsec');
    var curStage = seaStage(), tsNow = totalScore(), bestScore = Math.max(tsNow, careerPeak);
    // v316：解锁状态统一按「本局 + 生涯最高」中已抵达的进度渲染——刷新/重开后本局分归零，
    // 但生涯抵达仍在，否则已解锁海域会退化成"累计 X 分解锁"的未解锁文案（用户实测反馈）。
    // nextIdx = 首个未抵达海域（全部抵达则为长度值，即没有任何行命中"下一海域"）
    var nextIdx = C.seaStages.length;
    for (var si = 0; si < C.seaStages.length; si++) {
      if (bestScore < C.seaStages[si].at) { nextIdx = si; break; }
    }
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
        // v291：格内三元素「分散对齐」到格子（用户："不要都往格子中心挤"）——整组按
        // 等间距铺满格高：上边距 = 元素间距 = 下边距 ≈ 10（格高 112 − 三元素总高 ~73 = 39，四段各 ~10）；
        // v289 的 5px 间距是"挤在中心"的观感来源。名称/分值仍用 middle 基线对准各自字面中心
        var bx = tRect.x + tRect.w / 2, by = tRect.y + 32;
        if (unlocked) {
          drawBall({ x: bx, y: by, r: 22, tier: t, vx: 0, vy: 0 }, 1);
        } else {
          ctx.fillStyle = '#B8CBD8';
          ctx.beginPath(); ctx.arc(bx, by, 22, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#8AA5B8';
          ctx.font = 'bold 20px system-ui, sans-serif';
          ctx.textBaseline = 'middle';
          ctx.fillText('?', bx, by + 1);
          ctx.textBaseline = 'alphabetic';
        }
        ctx.textBaseline = 'middle';
        ctx.fillStyle = unlocked ? '#155A8A' : '#8AA5B8';
        ctx.font = 'bold 16px system-ui, sans-serif';
        ctx.fillText(unlocked ? T[t].name : '？？？', bx, tRect.y + 72);
        ctx.font = '13px system-ui, sans-serif';
        ctx.fillStyle = '#4A7FA0';
        ctx.fillText(unlocked ? ('分值 ' + T[t].score + ' · ×' + (dexCounts[t] || 0)) : '未解锁', bx, tRect.y + 96);
        ctx.textBaseline = 'alphabetic';
      }
    } else if (dexSec === 1) {

      // 海域演进纵向列表（由浅入深）：每行 = 徽章 + 海域名/状态 + 该海域 2 个特殊滴槽位
      // 已抵达：发现的显实际形态，未发现的显"？"；下一海域只显海域名+解锁积分；更深的特殊滴一律"？？？"不剧透
      ctx.textAlign = 'left';
      for (var stg = 0; stg < C.seaStages.length; stg++) {
        var ss = C.seaStages[stg];
        var sRow = stageRowRect(stg);
        var isCur = stg === curStage, reached = bestScore >= ss.at, sel = dexSelStage === stg;
        var isNext = !reached && stg === nextIdx, hiddenStg = !isCur && !reached && !isNext;
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
        var nameTxt = isCur || reached || isNext ? ss.name : '？？？';
        var gateTxt = isCur ? '当前海域' : (reached ? '已抵达' : (isNext ? '下一海域 · 累计' + (ss.at >= 10000 ? (ss.at / 10000) + '万' : ss.at) + '分' : '累计 ' + (ss.at >= 10000 ? (ss.at / 10000) + '万' : ss.at) + ' 分解锁'));
        // v289：两行文本整块按字形像素框（actualBoundingBox）居中于行中线——不再用"下移 3px"凑
        //（用户："请用居中来处理"）。块高 = 首行 asc + 行距 + 末行 desc，块心对齐 rowCy
        // v300：测量改恒等变换（微信端 measureText 受 CTM 影响会把度量放大）
        var mN = measureInk('bold 15px system-ui, sans-serif', nameTxt);
        var mG = measureInk('11px system-ui, sans-serif', gateTxt);
        var aN = mN.has ? mN.a : 15 * 0.84; // v300：无像素框 API（微信）回退 CJK 排印常数
        var dG = mG.has ? mG.d : 11 * 0.06;
        var LINE_GAP = 14;                                  // 两行基线间距
        var yN = rowCy - (aN + LINE_GAP + dG) / 2 + aN;     // 首行基线：块顶 = rowCy - 块高/2
        var yG = yN + LINE_GAP;                             // 第二行基线
        ctx.fillStyle = isCur ? '#FFFFFF' : (reached ? '#155A8A' : '#8AA5B8');
        ctx.font = 'bold 15px system-ui, sans-serif';
        if (isCur) {
          ctx.lineJoin = 'round'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(10,50,80,0.35)';
          ctx.strokeText(nameTxt, dotX + 20, yN);
        }
        ctx.fillText(nameTxt, dotX + 20, yN);
        ctx.font = '11px system-ui, sans-serif';
        ctx.fillStyle = isCur ? 'rgba(255,255,255,0.92)' : (reached ? '#1E7A6F' : (isNext ? '#7A98AC' : '#B0584A'));
        if (isCur) ctx.strokeText(gateTxt, dotX + 20, yG);
        ctx.fillText(gateTxt, dotX + 20, yG);
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
          // v291：图标-文本只要"有点间距"（净距 8→4，用户："搞那么大干什么"）；文本仍在
          // 恒定文本列内居中，图标固定成列不漂移（v290 定版）
          var cx2 = slotR.x + 15, cy2 = rowCy;
          var spName2 = found2 ? (isChest2 ? '大宝箱' : spDef2.name) : '？？？';
          var m2 = measureInk('13px system-ui, sans-serif', spName2); // v300：恒等变换下测量
          var tw2 = m2.w;
          var TXT_COL = 57;                                    // 文本列宽（恒定，跨行同宽）
          var tx2 = slotR.x + 30 + Math.max(0, (TXT_COL - tw2) / 2); // 列内居中（列左缘 = 图标右缘 +4）
          var y2 = cy2 + ((m2.has ? m2.a : 13 * 0.84) - (m2.has ? m2.d : 13 * 0.06)) / 2; // v300：回退 CJK 排印常数
          if ((hiddenStg || isNext) && !reached) { // 生涯未抵达：虚线空位 + "？？？"（特殊滴内容不剧透，海域名/解锁积分仍可见）
            ctx.save();
            ctx.setLineDash([3, 3]);
            ctx.strokeStyle = '#A8BCCB'; ctx.lineWidth = 1;
            roundRect(slotR.x + 0.5, slotR.y + 0.5, slotR.w - 1, slotR.h - 1, 8); ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = '#A8BCCB';
            ctx.font = '13px system-ui, sans-serif';
            ctx.textAlign = 'center';                          // 空位内整组居中
            ctx.fillText('？？？', slotR.x + slotR.w / 2, y2);
            ctx.textAlign = 'left';
            ctx.restore();
            continue;
          }
          if (found2) {
            // v292：统一玻璃底圆（r12）——每格图标共用同一可见包络。礁石/宝箱是深色实体、
            // 多数水滴是浅色球，浅色球的淡边缘在浅底上"看着"比深色图标窄（用户报礁石/漩涡滴
            // 不对齐，实测两者实体左缘同为 242 像素级重合）；有了同尺寸底圆后列对齐一目了然
            ctx.fillStyle = 'rgba(255,255,255,0.30)';
            ctx.beginPath(); ctx.arc(cx2, cy2, 12, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1;
            ctx.stroke();
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
            var mq = measureInk('bold 14px system-ui, sans-serif', '?'); // v300：恒等变换下测量
            var yq = cy2 + ((mq.has ? mq.a : 14 * 0.72) - (mq.has ? mq.d : 14 * 0.02)) / 2;
            ctx.fillText('?', cx2, yq);
            ctx.textAlign = 'left';
          }
          // 文本：当前海域行用与海域名同款白字+描边（行底是深海渐变，原深蓝 #155A8A 看不清）；
          // 其余行维持深蓝。v289：基线改像素框居中值 y2（与图标共用行中线 cy2）
          if (isCur) {
            ctx.lineJoin = 'round'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(10,50,80,0.35)';
            ctx.strokeText(spName2, tx2, y2);
            ctx.fillStyle = '#FFFFFF';
          } else {
            ctx.fillStyle = found2 ? '#155A8A' : '#4E6E86';
          }
          ctx.fillText(spName2, tx2, y2);
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
      var stgReached = bestScore >= stgS.at, stgCur = dexSelStage === curStage;
      title = stgReached || stgCur ? stgS.name : '？？？';
      // v316：与行内三态词汇统一（当前海域 / 已抵达 / 下一海域 / 累计分解锁）
      sub = stgCur ? '当前海域' : (stgReached ? '已抵达' : (dexSelStage === nextIdx ? '下一海域 · 累计' + (stgS.at >= 10000 ? (stgS.at / 10000) + '万' : stgS.at) + '分' : '累计 ' + (stgS.at >= 10000 ? (stgS.at / 10000) + '万' : stgS.at) + ' 分解锁'));
      body = '越深水色越暗：潮汐更频、珊瑚礁更多。';
    } else {
      var CHEST_INFO = { key: 'chest', name: '大宝箱', desc: '沉底木箱，沉走前点开：得分或充能。' };
      var isChestSel = dexSelSp === SP_DEFS.length;
      var dsc = isChestSel ? CHEST_INFO : (SP_DEFS[dexSelSp] || SP_DEFS[0]);
      known = !!dexSpecial[isChestSel ? 'chest' : dsc.key];
      title = known ? dsc.name : '？？？';
      sub = known ? (isChestSel ? '深海随机事件' : '已发现') : '未发现';
      body = known ? dsc.desc : '在海域中发现它即可点亮说明。';
    }
    // 说明区：贴面板底部（消除底部大片空白；v194 随面板 560→600 下移 478→518）
    ctx.fillStyle = 'rgba(46,134,180,0.10)';
    roundRect(DEX_PANEL.x + 12, DEX_PANEL.y + 518, DEX_PANEL.w - 24, 68, 8); ctx.fill();
    ctx.textAlign = 'left';
    ctx.fillStyle = known ? '#155A8A' : '#8AA5B8';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.fillText(title, DEX_PANEL.x + 24, DEX_PANEL.y + 538);
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillStyle = known ? '#1E7A6F' : '#B0584A';
    ctx.fillText(sub, DEX_PANEL.x + 24, DEX_PANEL.y + 556);
    ctx.fillStyle = '#4A7FA0';
    ctx.fillText(body, DEX_PANEL.x + 24, DEX_PANEL.y + 576);
    ctx.textAlign = 'center';
  }

  // 成就殿堂四视图（v241 拆分）：主页四磁贴各自直达——成就 / 每日任务 / 每日挑战 / 榜单；
  // 原三合一页签条已拆分移除，页头标题随视图变化
  function drawAchPanel() {
    layoutDexPanel();
    // 压暗背景已上移 drawPanelFx 统一绘制（v275）
    panel(DEX_PANEL.x, DEX_PANEL.y, DEX_PANEL.w, DEX_PANEL.h, 14, 0.96);
    var titles = ['成就', '每日任务', '每日挑战', '榜单'];
    // 图标与来源主页磁贴同款；v276：裸 emoji（不加圆环底，用户要求）
    drawPanelHeader(titles[dexTab] || '成就', DEX_PANEL, dexCloseBtn, ['🏆', '📋', '🎯', '🥇'][dexTab] || '🏆', null, true);
    if (dexTab === 1) drawDailyTasksTab();
    else if (dexTab === 2) drawDchalCard();
    else if (dexTab === 3) drawRankTab();
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
  function drawSeaBadge(stg, x, y, reached, opaque, r) {
    var ic = SEA_BADGES[stg] || SEA_BADGES[0];
    ctx.save();
    ctx.translate(x, y);
    if (r && r !== 10) ctx.scale(r / 10, r / 10); // v284：可选半径（进度条端点 r15），圆/内纹整体等比缩放
    ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2);
    if (reached) {
      ctx.fillStyle = ic.c; ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 1; ctx.stroke();
    } else {
      // opaque：不透明浅底（用于骑在进度条端点上遮挡条身，否则半透明底会透出进度条）
      ctx.fillStyle = opaque ? '#EFF5FA' : 'rgba(120,145,165,0.16)'; ctx.fill();
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
    // v292：宝箱 0.55→0.76——实体箱身 15.8→22 逻辑px，与水滴直径（r11×2）同宽，
    // 左右实体缘与各排水滴严格对齐（用户截图实测：水滴实体 380..412、宝箱实体 384..407，
    // 居中绘制导致箱身左缘内缩 3.2px，看起来"宝箱比雨云滴靠右"）
    if (spIdx === SP_DEFS.length) { drawChestIcon(x, y, 0.76); return; }
    var key = SP_DEFS[spIdx].key;
    if (key === 'iron') { drawIronBall({ x: x, y: y, r: 11, vx: 0, vy: 0 }, 1); return; }
    if (key === 'rune') { drawBall({ x: x, y: y, r: 11, tier: 1, vx: 0, vy: 0, rune: 'ripple' }, 1); return; }
    drawBall({ x: x, y: y, r: 11, tier: 1, vx: 0, vy: 0, special: key, frozen: key === 'ice' ? 1 : 0 }, 1);
  }

  // 成就页签（v243 方案 A 徽章卡）：单列勋章卡 + 拖拽/滚轮滚动；勋章颜色表难度（达成转金）
  function drawAchTab() {
    var vp = achViewport();
    achScroll = Math.max(0, Math.min(achScroll, achMaxScroll()));
    ctx.save();
    roundRect(vp.x, vp.y, vp.w, vp.h, 10); ctx.clip();
    ctx.translate(0, -achScroll);
    var w = DEX_PANEL.w - 28;
    for (var i = 0; i < ACH_DEFS.length; i++) {
      var a = ACH_DEFS[i], done = !!achDone[a.id];
      var cur = Math.min(a.target, a.cur());
      var done2 = done || cur >= a.target;
      var x = DEX_PANEL.x + 14, y = DEX_PANEL.y + 52 + i * (ACH_ROW_H + ACH_ROW_GAP), h = ACH_ROW_H;
      // 卡底：达成淡金渐变，未达成白玻璃
      if (done2) {
        var gg = ctx.createLinearGradient(0, y, 0, y + h);
        gg.addColorStop(0, 'rgba(245,197,66,0.20)'); gg.addColorStop(1, 'rgba(217,169,63,0.10)');
        ctx.fillStyle = gg;
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
      }
      roundRect(x, y, w, h, 9); ctx.fill();
      ctx.strokeStyle = done2 ? 'rgba(217,169,63,0.45)' : 'rgba(46,110,150,0.14)';
      ctx.lineWidth = 1;
      roundRect(x + 0.5, y + 0.5, w - 1, h - 1, 9); ctx.stroke();
      // —— 通用成就徽章：大圆勋章 + 双绶带（达成金、未达成灰锁）——
      var mx = x + 30, my = y + 26;
      ctx.fillStyle = done2 ? '#C9922A' : '#AEBEC9';
      ctx.beginPath();
      ctx.moveTo(mx - 7, my + 10); ctx.lineTo(mx - 11, my + 22); ctx.lineTo(mx - 3, my + 18); ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(mx + 7, my + 10); ctx.lineTo(mx + 11, my + 22); ctx.lineTo(mx + 3, my + 18); ctx.closePath(); ctx.fill();
      var mg2 = ctx.createLinearGradient(0, my - 16, 0, my + 16);
      if (done2) { mg2.addColorStop(0, '#FFDE7A'); mg2.addColorStop(1, '#D9A93F'); }
      else { mg2.addColorStop(0, '#D5DFE6'); mg2.addColorStop(1, '#A9BAC6'); }
      ctx.fillStyle = mg2;
      ctx.beginPath(); ctx.arc(mx, my, 16, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 2; ctx.stroke();
      ctx.strokeStyle = done2 ? 'rgba(138,90,24,0.35)' : 'rgba(90,110,125,0.30)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(mx, my, 12.5, 0, Math.PI * 2); ctx.stroke();
      if (done2) {
        // 金星
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        for (var sp = 0; sp < 5; sp++) {
          var sa = -Math.PI / 2 + sp * 2 * Math.PI / 5, sa2 = sa + Math.PI / 5;
          ctx.lineTo(mx + Math.cos(sa) * 7, my + 0.5 + Math.sin(sa) * 7);
          ctx.lineTo(mx + Math.cos(sa2) * 3, my + 0.5 + Math.sin(sa2) * 3);
        }
        ctx.closePath(); ctx.fill();
      } else {
        // 灰锁（锁梁 + 锁体）
        ctx.strokeStyle = '#7E93A2'; ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.arc(mx, my - 2, 3.2, Math.PI, 0); ctx.stroke();
        ctx.fillStyle = '#7E93A2';
        roundRect(mx - 5, my - 2, 10, 8, 2); ctx.fill();
      }
      // —— 文本（名称 / 描述）+ 右上奖励 ——
      var tx = x + 58, tw = w - 58 - 96;
      ctx.textAlign = 'left';
      ctx.font = 'bold 14px system-ui, sans-serif';
      ctx.fillStyle = done2 ? '#B8860B' : '#155A8A';
      ctx.fillText(truncText(a.name, tw), tx, y + 21);
      ctx.font = '10.5px system-ui, sans-serif';
      ctx.fillStyle = done2 ? '#4A7FA0' : '#8AA5B8';
      ctx.fillText(truncText(a.desc, tw), tx, y + 38);
      ctx.textAlign = 'right';
      ctx.font = '9.5px system-ui, sans-serif';
      ctx.fillStyle = done2 ? '#1E7A6F' : '#9AB4C4';
      ctx.fillText(truncText(a.perk, 90), x + w - 12, y + 21);
      // —— 底部进度条 + 计数 ——
      var barX = tx, barW = w - 58 - 14 - 52, barY = y + 48;
      ctx.fillStyle = 'rgba(46,134,180,0.15)';
      roundRect(barX, barY, barW, 6, 3); ctx.fill();
      var fr = Math.min(1, cur / a.target);
      if (fr > 0) {
        ctx.fillStyle = done2 ? '#F5C542' : '#2E86B4';
        roundRect(barX, barY, Math.max(6, barW * fr), 6, 3); ctx.fill();
      }
      ctx.textAlign = 'right';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.fillStyle = done2 ? '#B8860B' : '#4A7FA0';
      ctx.fillText(done2 ? '已达成' : (a.target >= 10000 ? (Math.round(cur / 1000) / 10) + '万/' + (a.target / 10000) + '万' : cur + '/' + a.target), x + w - 12, y + 55);
    }
    ctx.restore();
    // 滚动条（超出可视区才显示）
    var maxS = achMaxScroll();
    if (maxS > 0) {
      var trH = vp.h - 8, thH = Math.max(24, trH * (vp.h / achContentH()));
      ctx.fillStyle = 'rgba(21,90,138,0.10)';
      roundRect(DEX_PANEL.x + DEX_PANEL.w - 9, vp.y + 4, 3, trH, 1.5); ctx.fill();
      ctx.fillStyle = 'rgba(21,90,138,0.28)';
      roundRect(DEX_PANEL.x + DEX_PANEL.w - 9, vp.y + 4 + (trH - thH) * (achScroll / maxS), 3, thH, 1.5); ctx.fill();
    }
    ctx.textAlign = 'center';
  }
  // 文本超宽截断（成就卡单列用；measureText 需已设字体，故先设 font 再调）
  function truncText(s, maxW) {
    if (ctx.measureText(s).width <= maxW) return s;
    while (s.length > 1 && ctx.measureText(s + '…').width > maxW) s = s.slice(0, -1);
    return s + '…';
  }

  // 每日页签：3 个按日期生成的任务（独立说明行已删，卡片上移放大）
  // 每日挑战卡（每日页签顶部）：今日海况词缀 + 目标分 + 开始按钮（热区 dchalBtnRect，systems 处理点击）
  // 菜单态离线收益告知卡（自动入账、无点击）：历史最佳行与开始按钮之间的空档，金色宝箱色系
  function drawOfflineCard() {
    if (state !== 'menu' || !offlineGain) return;
    var mu = MG.layout.menu;
    var w = mu.offlineW, h = mu.offlineH, x = (C.W - w) / 2, y = mu.offlineY;
    ctx.textBaseline = 'alphabetic'; // v299：显式固定——上游（标题艺术字）可能遗留 middle 基线
    var og = ctx.createLinearGradient(0, y, 0, y + h);
    og.addColorStop(0, 'rgba(245,197,66,0.16)');
    og.addColorStop(1, 'rgba(217,169,63,0.08)');
    ctx.fillStyle = og;
    roundRect(x, y, w, h, 10); ctx.fill();
    ctx.strokeStyle = 'rgba(245,197,66,0.55)'; ctx.lineWidth = 1.2;
    roundRect(x, y, w, h, 10); ctx.stroke();
    ctx.textAlign = 'center';
    // v288：卡高 60→80 重排三行（原末行基线 57 贴底边溢出），白字换深金棕（原近白文字
    // 压在浅金底上对比度不足，用户："离线奖励样式异常"）
    var om = offlineGain.mins;
    // v288：卡高 60→80 重排三行（原末行基线 57 贴底边溢出），白字换深金棕（原近白文字
    // 压在浅金底上对比度不足，用户："离线奖励样式异常"）
    // v289：三行按字形像素框垂直居中 + 均匀分散（用户："内部文字请使用垂直居中，均匀分散对齐"）——
    // 段间距 =（卡高 − 三行字面总高）/4，首末与卡上下边留同宽，行间留同宽
    var lines = [
      { t: '大宝箱 · 离线收益', f: 'bold 15px system-ui, sans-serif', c: '#8A6508' },
      { t: '离开 ' + (om >= 60 ? Math.floor(om / 60) + ' 时 ' + (om % 60) + ' 分' : om + ' 分钟') + ' · 深海攒下 ' + offlineGain.gain + ' 分', f: '13px system-ui, sans-serif', c: 'rgba(90,66,20,0.88)' },
      { t: '开始游戏后自动入账', f: '11px system-ui, sans-serif', c: 'rgba(125,100,40,0.62)' }
    ];
    var box = [], tot = 0, li;
    for (li = 0; li < lines.length; li++) {
      var mm = measureInk(lines[li].f, lines[li].t); // v300：恒等变换下测量
      var fp = parseFloat(lines[li].f.replace(/[^0-9.]/g, '').replace(/^[^0-9]*/, ''));
      box.push({
        a: mm.has ? mm.a : fp * 0.86,
        d: mm.has ? mm.d : fp * 0.16
      });
      tot += box[li].a + box[li].d;
    }
    var lgap = Math.max(3, (h - tot) / (lines.length + 1));
    var yy = y + lgap;
    for (li = 0; li < lines.length; li++) {
      ctx.font = lines[li].f;
      ctx.fillStyle = lines[li].c;
      yy += box[li].a;                       // 基线 = 段起点 + 该行字面 ascent
      ctx.fillText(lines[li].t, C.W / 2, yy);
      yy += box[li].d + lgap;                // 下一行段起点 = 本行字面底 + 段间距
    }
    ctx.textAlign = 'center'; // 恢复菜单流的 center——曾误设 left 泄漏给开始按钮，导致小程序文字右移溢出
  }

  // 每日挑战视图（v244 改版）：顶部今日大卡（合并「开始挑战」按钮），下方列出今日未开放的词缀
  function drawDchalCard() {
    var ci = dchalInfo();
    // —— 今日 Hero 大卡（紫色渐变，按钮合并进卡内）——
    var x = DEX_PANEL.x + 14, y = DEX_PANEL.y + 54, w = DEX_PANEL.w - 28, h = 150;
    var hg = ctx.createLinearGradient(0, y, 0, y + h);
    hg.addColorStop(0, '#7B6FD0'); hg.addColorStop(1, '#5A4AA8');
    ctx.fillStyle = hg;
    roundRect(x, y, w, h, 16); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.28)'; ctx.lineWidth = 1.2;
    roundRect(x + 0.5, y + 0.5, w - 1, h - 1, 16); ctx.stroke();
    // 装饰气泡
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.beginPath(); ctx.arc(x + w - 24, y + 20, 16, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + w - 46, y + 38, 7, 0, Math.PI * 2); ctx.fill();
    // 金色奖杯勋章
    var mx = x + 34, my = y + 58;
    ctx.fillStyle = '#FFD873';
    ctx.beginPath(); ctx.arc(mx, my, 15, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1.5; ctx.stroke();
    // 小皇冠
    ctx.fillStyle = '#8A5A18';
    ctx.beginPath();
    ctx.moveTo(mx - 7, my + 4); ctx.lineTo(mx - 7, my - 2); ctx.lineTo(mx - 3.2, my + 0.5);
    ctx.lineTo(mx, my - 5.5); ctx.lineTo(mx + 3.2, my + 0.5); ctx.lineTo(mx + 7, my - 2);
    ctx.lineTo(mx + 7, my + 4); ctx.closePath(); ctx.fill();
    // 文案（左列：标题 / 名称 / 描述）
    ctx.textAlign = 'left';
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.72)';
    ctx.fillText('今日挑战 · 连续 ' + ci.streak + ' 天', x + 58, y + 26);
    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(ci.name, x + 58, y + 50);
    ctx.font = '11.5px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillText(ci.desc, x + 58, y + 72);
    // 右侧目标（已完成转金勾）；v277：目标与挑战芯片同语义——到达最深的海洋
    ctx.textAlign = 'right';
    ctx.font = '10px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText('目标', x + w - 14, y + 36);
    if (ci.done) {
      ctx.font = 'bold 16px system-ui, sans-serif';
      ctx.fillStyle = '#FFD873';
      ctx.fillText('✓ 已完成', x + w - 14, y + 58);
    } else {
      ctx.font = 'bold 14px system-ui, sans-serif';
      ctx.fillStyle = '#FFD873';
      ctx.fillText('到达最深海洋', x + w - 14, y + 57);
    }
    // 合并进卡内的「开始挑战」按钮（金色胶囊，对局中置灰）
    var br = dchalBtnRect();
    var bg = ctx.createLinearGradient(0, br.y, 0, br.y + br.h);
    if (!ci.canStart) { bg.addColorStop(0, '#B9C9D4'); bg.addColorStop(1, '#9DB2C0'); }
    else { bg.addColorStop(0, '#F5C542'); bg.addColorStop(1, '#D9A93F'); }
    ctx.fillStyle = bg;
    roundRect(br.x, br.y, br.w, br.h, br.h / 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1;
    roundRect(br.x + 0.5, br.y + 0.5, br.w - 1, br.h - 1, br.h / 2 - 0.5); ctx.stroke();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText(ci.done ? '再玩一局' : '开始挑战', br.x + br.w / 2, br.y + br.h / 2 + 1);
    ctx.textBaseline = 'alphabetic';
    // —— 下方：深渊潜航今日未开放的词缀列表 ——
    // 分节标题条（v245 美化）：左侧色饰条 + 加粗标题 + 延伸细线 + 右对齐刷新说明
    var labelY = y + h + 26, hy = labelY - 5;
    ctx.fillStyle = '#2E86B4';
    roundRect(x, hy - 6, 3.5, 13, 1.75); ctx.fill();
    ctx.textAlign = 'left';
    ctx.font = 'bold 12.5px system-ui, sans-serif';
    ctx.fillStyle = '#155A8A';
    ctx.fillText('深渊潜航 · 今日未开放', x + 10, labelY);
    var lineX = x + 10 + Math.round(ctx.measureText('深渊潜航 · 今日未开放').width) + 10;
    var lineR = x + w - 100;
    ctx.fillStyle = 'rgba(46,110,150,0.16)';
    ctx.fillRect(lineX, hy, Math.max(0, lineR - lineX), 1);
    ctx.textAlign = 'right';
    ctx.font = '10px system-ui, sans-serif';
    ctx.fillStyle = '#A8BCCB';
    ctx.fillText('每天轮换 · 0 点刷新', x + w, labelY);
    var listY = labelY + 12, rowH = 40, rowGap = 6;
    var shown = 0;
    for (var i = 0; i < ci.list.length; i++) {
      var a = ci.list[i];
      if (a.today) continue; // 今日词缀已在上方大卡展示
      var ry = listY + shown * (rowH + rowGap);
      ctx.fillStyle = 'rgba(255,255,255,0.62)';
      roundRect(x, ry, w, rowH, 10); ctx.fill();
      ctx.strokeStyle = 'rgba(46,110,150,0.10)'; ctx.lineWidth = 1;
      roundRect(x + 0.5, ry + 0.5, w - 1, rowH - 1, 10); ctx.stroke();
      // 灰色锁形徽章
      var bx = x + 24, by = ry + rowH / 2;
      ctx.fillStyle = '#D5DFE6';
      ctx.beginPath(); ctx.arc(bx, by, 9, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#A8BCCB'; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.fillStyle = '#8AA5B8';
      roundRect(bx - 4, by - 1, 8, 6.5, 1.5); ctx.fill();
      ctx.strokeStyle = '#8AA5B8'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(bx, by - 1.5, 2.6, Math.PI, 0); ctx.stroke();
      // 名称 + 描述（灰）
      ctx.textAlign = 'left';
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.fillStyle = '#8AA5B8';
      ctx.fillText(a.name, x + 44, ry + 18);
      ctx.font = '10.5px system-ui, sans-serif';
      ctx.fillStyle = '#A8BCCB';
      ctx.fillText(a.desc + (a.mult ? ' · 得分 ×' + a.mult : ''), x + 44, ry + 33);
      // 右侧状态：v278 不再写"未开放"，改显示该词缀历史完成次数（有完成记录转金）
      ctx.textAlign = 'right';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.fillStyle = a.count > 0 ? '#D9A93F' : '#B9C9D4';
      ctx.fillText('已完成 ' + (a.count || 0) + ' 次', x + w - 12, ry + rowH / 2 + 4);
      shown++;
    }
  }

  // 每日任务视图（v247）：顶部全勤横幅卡（海洋渐变+火焰徽章）+ 5 个类型配色图标任务行
  function drawDailyTasksTab() {
    var doneCnt = 0;
    for (var di0 = 0; di0 < daily.tasks.length; di0++) if (daily.done[di0]) doneCnt++;
    var x = DEX_PANEL.x + 14, w = DEX_PANEL.w - 28;
    // —— 顶部全勤卡（全勤转金，日常为海洋蓝渐变）——
    var fy = DEX_PANEL.y + 54, fh = 80;
    var hgr = ctx.createLinearGradient(0, fy, 0, fy + fh);
    if (daily.allDone) { hgr.addColorStop(0, '#F7CE5B'); hgr.addColorStop(1, '#DFA23C'); }
    else { hgr.addColorStop(0, '#3B97C9'); hgr.addColorStop(1, '#1E6B9E'); }
    ctx.fillStyle = hgr;
    roundRect(x, fy, w, fh, 14); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1.2;
    roundRect(x + 0.5, fy + 0.5, w - 1, fh - 1, 14); ctx.stroke();
    // 装饰气泡
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.beginPath(); ctx.arc(x + w - 30, fy + 20, 18, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + w - 58, fy + 52, 8, 0, Math.PI * 2); ctx.fill();
    // 火焰连击徽章
    var mx = x + 36, my = fy + 40;
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.beginPath(); ctx.arc(mx, my, 21, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.textAlign = 'center';
    ctx.font = '20px system-ui, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('🔥', mx, my + 7);
    // 文案
    ctx.textAlign = 'left';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('今日全勤奖励', x + 66, fy + 30);
    ctx.font = '10.5px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.78)';
    ctx.fillText('已连续 ' + (daily.streak || 0) + ' 天 · 全勤可得分数与充能加成', x + 66, fy + 50);
    ctx.fillText('任务每日 0 点刷新 · 难度随连续天数提升', x + 66, fy + 66);
    // 右侧完成数 + 进度点
    ctx.textAlign = 'right';
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(doneCnt + '/' + daily.tasks.length, x + w - 16, fy + 34);
    var dotGap = 14, dotR = 4, dotX0 = x + w - 16 - (daily.tasks.length - 1) * dotGap;
    for (var di = 0; di < daily.tasks.length; di++) {
      ctx.fillStyle = daily.done[di] ? '#FFD873' : 'rgba(255,255,255,0.28)';
      ctx.beginPath(); ctx.arc(dotX0 + di * dotGap, fy + 56, dotR, 0, Math.PI * 2); ctx.fill();
      if (daily.done[di]) { ctx.strokeStyle = 'rgba(138,90,24,0.4)'; ctx.lineWidth = 1; ctx.stroke(); }
    }
    // —— 5 个任务行（v249 单色极简：统一灰蓝圆形图标块 + 白色简笔图形）——
    var ACCENT = '#8FA9BA', TINT = 'rgba(143,169,186,0.10)';
    var base = fy + fh + 12, rowH = 62, step = 72;
    for (var i = 0; i < daily.tasks.length; i++) {
      var t = daily.tasks[i], done = daily.done[i];
      var frac = Math.min(1, (daily.prog[i] || 0) / t.need);
      var ty0 = base + i * step;
      if (done) {
        var og = ctx.createLinearGradient(0, ty0, 0, ty0 + rowH);
        og.addColorStop(0, 'rgba(245,197,66,0.20)'); og.addColorStop(1, 'rgba(217,169,63,0.10)');
        ctx.fillStyle = og;
      } else {
        ctx.fillStyle = TINT;
      }
      roundRect(x, ty0, w, rowH, 12); ctx.fill();
      ctx.strokeStyle = done ? 'rgba(217,169,63,0.45)' : 'rgba(46,110,150,0.12)';
      ctx.lineWidth = 1;
      roundRect(x + 0.5, ty0 + 0.5, w - 1, rowH - 1, 12); ctx.stroke();
      // 圆形图标底 + 游戏本体现有图标（水滴/技能/宝箱/海域徽章/礁石，不自绘）
      var ix = x + 12, iy = ty0 + (rowH - 40) / 2, icx = ix + 20, icy = iy + 20;
      ctx.fillStyle = done ? 'rgba(217,169,63,0.16)' : 'rgba(143,169,186,0.16)';
      ctx.beginPath(); ctx.arc(icx, icy, 20, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = done ? 'rgba(217,169,63,0.40)' : 'rgba(46,110,150,0.16)';
      ctx.lineWidth = 1; ctx.stroke();
      ctx.save();
      ctx.translate(icx, icy);
      ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI * 2); ctx.clip();
      if (done) {
        ctx.strokeStyle = '#C9922A'; ctx.lineWidth = 2.8; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(-7, 0.5); ctx.lineTo(-2, 5.5); ctx.lineTo(7, -5);
        ctx.stroke();
        ctx.lineCap = 'butt'; ctx.lineJoin = 'miter';
      } else if (t.type === 'merge') {
        drawBall({ x: 0, y: 0, r: 14, tier: t.tier, vx: 0, vy: 0 }, 1); // 任务指定的那颗水滴
      } else if (t.type === 'combo') {
        ctx.scale(1.6, 1.6);
        drawSkillIcon('ripple', 0, 0, '#2FA8A0'); // 连锁波纹（技能图标）
      } else if (t.type === 'chest') {
        drawChestIcon(0, 1, 0.62); // 场上宝箱同款
      } else if (t.type === 'tide') {
        ctx.scale(1.5, 1.5);
        drawSeaBadge(seaStage(), 0, 0, true); // 当前海域徽章
      } else {
        drawIronBall({ x: 0, y: 0, r: 13, vx: 0, vy: 0 }, 1); // 礁石球
      }
      ctx.restore();
      // 标题 + 右上难度星与奖励
      ctx.textAlign = 'left';
      ctx.font = 'bold 13.5px system-ui, sans-serif';
      ctx.fillStyle = done ? '#B8860B' : '#155A8A';
      ctx.fillText(truncText(t.text, w - 58 - 118), x + 62, ty0 + 25);
      ctx.textAlign = 'right';
      var rst = '';
      for (var ds = 0; ds < (t.stars || 1); ds++) rst += '★';
      var rv = Math.round(C.daily.rewardScore * (1 + ((t.stars || 1) - 1) * 0.5));
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.fillStyle = done ? '#B8860B' : '#C99B3F';
      ctx.fillText(rst + ' +' + rv + ' 分', x + w - 12, ty0 + 25);
      // 底部进度条（颜色随任务类型）+ 右侧计数
      var barX = x + 62, barW = w - 62 - 14 - 64;
      ctx.fillStyle = 'rgba(46,134,180,0.15)';
      roundRect(barX, ty0 + 42, barW, 6, 3); ctx.fill();
      if (frac > 0) {
        ctx.fillStyle = done ? '#F5C542' : ACCENT;
        roundRect(barX, ty0 + 42, Math.max(6, barW * frac), 6, 3); ctx.fill();
      }
      ctx.textAlign = 'right';
      ctx.font = 'bold 10.5px system-ui, sans-serif';
      ctx.fillStyle = done ? '#B8860B' : '#4A7FA0';
      var needTxt = t.need >= 10000 ? (Math.round(t.need / 1000) / 10) + '万' : t.need;
      var progTxt = (daily.prog[i] || 0) >= 10000 ? (Math.round((daily.prog[i] || 0) / 1000) / 10) + '万' : (daily.prog[i] || 0);
      ctx.fillText(done ? '已完成' : (progTxt + '/' + needTxt), x + w - 12, ty0 + 50);
    }
    ctx.textAlign = 'center';
  }

  // 榜单页签（v251）：顶部「我的排名」横幅 + 前三名领奖台 + 名次列表
  function drawRankTab() {
    var rows = friendBoard();
    // —— 顶部我的排名横幅（海洋渐变）——
    var meIdx = 0;
    for (var m = 0; m < rows.length; m++) if (rows[m].me) { meIdx = m; break; }
    var bx = DEX_PANEL.x + 14, by = DEX_PANEL.y + 54, bw = DEX_PANEL.w - 28, bh = 60;
    var bgd = ctx.createLinearGradient(0, by, 0, by + bh);
    bgd.addColorStop(0, '#3B97C9'); bgd.addColorStop(1, '#1E6B9E');
    ctx.fillStyle = bgd;
    roundRect(bx, by, bw, bh, 12); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1.2;
    roundRect(bx + 0.5, by + 0.5, bw - 1, bh - 1, 12); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.beginPath(); ctx.arc(bx + bw - 24, by + 16, 14, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(bx + bw - 46, by + 44, 6, 0, Math.PI * 2); ctx.fill();
    // 左侧名次章
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.beginPath(); ctx.arc(bx + 30, by + 30, 18, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.textAlign = 'center';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('#' + (meIdx + 1), bx + 30, by + 35);
    // 中间文案
    ctx.textAlign = 'left';
    ctx.font = '10.5px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fillText('我的最佳成绩', bx + 58, by + 25);
    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(fmtScore(rows[meIdx].score), bx + 58, by + 47);
    // 右侧超越数
    ctx.textAlign = 'right';
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fillText('超越 ' + (rows.length - 1 - meIdx) + ' 位好友', bx + bw - 16, by + 35);
    // —— 前三名领奖台（视觉顺序 2/1/3，第一名更高 + 小皇冠）——
    // v281：整体加高（76/100/64→84/108/72）+ 奖牌上移、名称/分数下移——修复名次章与用户名重叠
    var colW = 108, gap = 14, yBase = DEX_PANEL.y + 236;
    var tops = [rows[1], rows[0], rows[2]];
    var hts = [84, 108, 72], medals = ['#C9D4DC', '#F5C542', '#E0B58A'];
    var grads = [['#DDE6EC', '#AEBEC9'], ['#FFE08A', '#D9A93F'], ['#EFCAA2', '#C29263']];
    for (var p = 0; p < 3; p++) {
      var px0 = DEX_PANEL.x + 14 + p * (colW + gap), ph = hts[p], py0 = yBase - ph;
      var pg = ctx.createLinearGradient(0, py0, 0, yBase);
      pg.addColorStop(0, grads[p][0]); pg.addColorStop(1, grads[p][1]);
      ctx.fillStyle = pg;
      roundRect(px0, py0, colW, ph, 10); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1;
      roundRect(px0 + 0.5, py0 + 0.5, colW - 1, yBase - py0 - 1, 10); ctx.stroke();
      // 奖牌（第一名戴小皇冠；v281：my=py0+20、王冠收小——冠顶 py0+2 在台面内，不再越出领奖台）
      var mx = px0 + colW / 2, my = py0 + 20;
      ctx.fillStyle = medals[p];
      ctx.beginPath(); ctx.arc(mx, my, 12, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 1.5; ctx.stroke();
      if (p === 1) {
        ctx.fillStyle = '#B8860B';
        ctx.beginPath();
        ctx.moveTo(mx - 5, my - 12); ctx.lineTo(mx - 5, my - 16); ctx.lineTo(mx - 2.2, my - 14);
        ctx.lineTo(mx, my - 18); ctx.lineTo(mx + 2.2, my - 14); ctx.lineTo(mx + 5, my - 16);
        ctx.lineTo(mx + 5, my - 12); ctx.closePath(); ctx.fill();
      }
      ctx.textAlign = 'center';
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.fillStyle = '#FFFFFF';
      // v283：名次章标注真实名次 [2,1,3]（左二/中一/右三）——此前按台位顺序误标 1/2/3
      ctx.fillText(String([2, 1, 3][p]), mx, my + 4.5);
      ctx.font = '11.5px system-ui, sans-serif';
      ctx.fillStyle = p === 1 ? '#7A5608' : '#3E647E';
      ctx.fillText(truncText(tops[p].name, colW - 12), mx, py0 + 48);
      ctx.font = 'bold 13.5px system-ui, sans-serif';
      ctx.fillStyle = p === 1 ? '#7A5608' : '#155A8A';
      ctx.fillText(fmtScore(tops[p].score), mx, py0 + 66);
    }
    // 台阶底座
    ctx.fillStyle = 'rgba(46,134,180,0.10)';
    roundRect(DEX_PANEL.x + 14, yBase, DEX_PANEL.w - 28, 8, 4); ctx.fill();
    // —— 第 4 名起列表 ——
    for (var i = 3; i < rows.length; i++) {
      var r = rows[i], ry = DEX_PANEL.y + 262 + (i - 3) * 70;
      ctx.fillStyle = r.me ? 'rgba(245,197,66,0.16)' : 'rgba(46,134,180,0.06)';
      roundRect(DEX_PANEL.x + 14, ry, DEX_PANEL.w - 28, 54, 9); ctx.fill();
      ctx.strokeStyle = r.me ? 'rgba(217,169,63,0.5)' : 'rgba(46,110,150,0.10)';
      ctx.lineWidth = 1;
      roundRect(DEX_PANEL.x + 14.5, ry + 0.5, DEX_PANEL.w - 29, 53, 9); ctx.stroke();
      ctx.textAlign = 'center';
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.fillStyle = '#4A7FA0';
      ctx.fillText(String(i + 1), DEX_PANEL.x + 38, ry + 33);
      ctx.textAlign = 'left';
      ctx.font = (r.me ? 'bold ' : '') + '13px system-ui, sans-serif';
      ctx.fillStyle = r.me ? '#B8860B' : '#155A8A';
      ctx.fillText(r.me ? r.name + '（你）' : r.name, DEX_PANEL.x + 58, ry + 33);
      ctx.textAlign = 'right';
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.fillStyle = r.me ? '#B8860B' : '#3E6E90';
      ctx.fillText(fmtScore(r.score), DEX_PANEL.x + DEX_PANEL.w - 26, ry + 33);
    }
    ctx.textAlign = 'center';
  }
  // 分数千分位省略显示（榜单/挑战用）：≥1 万显示"x.x万"
  function fmtScore(n) {
    if (n >= 10000) return (Math.round(n / 1000) / 10) + '万';
    return String(n);
  }

  // 战报分享卡片（结算页"分享战报"打开；上线后接 wx.shareAppMessage）
  function drawShare() {
    // 压暗背景已上移 drawPanelFx 统一绘制（v275）
    var sr = MG.layout.shareRect(); // 锚定游戏区焦点（v161 定版中心），块高变化不漂流
    var pw = sr.w, ph = sr.h, px = sr.x, py = sr.y;
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
    // v275：页头图标（📤 与分享按钮同款）+ 标题同一水平中线
    var shTw = ctx.measureText('水滴合成深海 · 深海战报').width;
    var shIcX = C.W / 2 - shTw / 2 - 26, shIcY = py + 33;
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.beginPath(); ctx.arc(shIcX, shIcY, 14, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.font = '16px system-ui, sans-serif';
    ctx.fillText('📤', shIcX, shIcY + 6);
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
