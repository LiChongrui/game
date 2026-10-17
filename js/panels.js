// 水滴合成深海 - panels：面板几何 + 面板绘制（图鉴 / 成就殿堂 / 每日 / 榜单 / 分享卡）
// 模块加载顺序 3.5/4（systems 之后、render 之前）。四个模块共享全局作用域（经典 script），
// 本文件只有"函数声明 + 纯数据 + 几何常量"，无顶层调用语句，加载序不敏感；
// 绘制函数引用的游戏状态（daily / dexUnlocked / SP_DEFS 等）与工具（grad / roundRect / panel）
// 均在运行期经全局作用域解析，与定义处所在文件解耦。
// 拆分动机：面板几何此前散在 systems（命中判定）与 render（绘制）两处，改布局需全文搜索；
// 现统一收敛到本文件——几何常量与绘制同源，渲染与点击热区天然一致。

  // ---------- 面板几何（渲染与点击热区共用，一处定义） ----------
  var DEX_PANEL = { x: 20, y: 64, w: 380, h: 560 };
  var dexCloseBtn = { x: DEX_PANEL.x + DEX_PANEL.w - 42, y: DEX_PANEL.y + 8, w: 28, h: 28 }; // 右上 × 关闭（中心 +22px，与页头标题文字对齐）
  // 面板垂直居中：菜单态（铺满）以整屏 VH 为基准；局内游戏块为固定 747 逻辑（9:16，居中块=屏幕中心，
  // 块内 (C.H-h)/2 + 偏移 renderOy 恰好落在屏幕中央）——每帧绘制前重算，页签始终处于屏幕中央
  function layoutDexPanel() {
    var base = state === 'menu' ? VH : C.H;
    DEX_PANEL.y = Math.max(10, Math.round((base - DEX_PANEL.h) / 2));
    dexCloseBtn.y = DEX_PANEL.y + 8;
  }
  // 成就页分段页签：成就 / 每日 / 榜单（与图鉴分节同款分段控件样式）
  function achTabRect(i) {
    var segW = Math.floor((DEX_PANEL.w - 30) / 3);
    return { x: DEX_PANEL.x + 15 + i * segW, y: DEX_PANEL.y + 40, w: segW, h: 28 };
  }
  var shareCopyBtn = { x: 0, y: 0, w: 150, h: 42 }; // 分享卡片：复制文案按钮（打开时定位）
  function spSlotRect(stg, s) {
    // 海域演进行右侧的特殊滴槽位（s=0/1），宝箱也占一个槽位；与 stageRowRect 同基
    var r = stageRowRect(stg);
    return { x: r.x + r.w - 196 + s * 98, y: r.y + 4, w: 92, h: 32 };
  }
  function tierCellRect(t) {
    // 合成链分节：3 列 × 3 行（9 档），格高 122 填满说明区以上空间
    return { x: DEX_PANEL.x + 14 + (t % 3) * 118, y: DEX_PANEL.y + 76 + Math.floor(t / 3) * 130, w: 108, h: 122 };
  }
  function stageRowRect(g) {
    // 海域演进分节：8 行纵向列表（由浅入深），行距 48 填满说明区以上空间
    return { x: DEX_PANEL.x + 14, y: DEX_PANEL.y + 80 + g * 48, w: DEX_PANEL.w - 28, h: 40 };
  }
  function dexSecRect(i) {
    // 分节切换：通栏分段控件（合成链 / 海域演进——特殊滴已并入海域行），样式与顶部页签区分
    var segW = Math.floor((DEX_PANEL.w - 30) / 2);
    return { x: DEX_PANEL.x + 15 + i * segW, y: DEX_PANEL.y + 40, w: segW, h: 28 };
  }
  function dchalBtnRect() {
    // 每日页签挑战卡右侧「开始挑战」按钮（systems 点击判定与绘制共用）
    return { x: DEX_PANEL.x + DEX_PANEL.w - 118, y: DEX_PANEL.y + 74 + 26, w: 96, h: 34 };
  }

  // ---------- 面板绘制 ----------
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
  // 图鉴页头收集度徽条：进度条 + 四个里程碑刻度（25/50/75/100%），已达成的点亮金色圆点
  // 纯展示无交互；数据来自 systems 的 colProgress/COL_MILESTONES（运行期全局解析）
  function drawColBadge() {
    var cp = colProgress();
    var pct = cp.n / cp.total;
    var full = pct >= 1;
    var bx = DEX_PANEL.x + 112, bw = 162, by = DEX_PANEL.y + 19, bh = 8;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#4A7FA0';
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText('收集度', DEX_PANEL.x + 66, DEX_PANEL.y + 28);
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
        ctx.beginPath(); ctx.arc(mx, by + bh / 2, 3.2, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 1; ctx.stroke();
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.fillRect(mx - 1, by + 1.5, 2, bh - 3);
      }
    }
    ctx.textAlign = 'right';
    ctx.fillStyle = '#155A8A';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.fillText(cp.n + '/' + cp.total, DEX_PANEL.x + DEX_PANEL.w - 56, DEX_PANEL.y + 29);
    ctx.textAlign = 'center';
  }

  function drawDex() {
    layoutDexPanel();
    ctx.fillStyle = 'rgba(10,40,70,0.6)';
    ctx.fillRect(-BX, -renderOy, C.W + BX * 2, VH);
    panel(DEX_PANEL.x, DEX_PANEL.y, DEX_PANEL.w, DEX_PANEL.h, 14, 0.96);
    drawPanelHeader('图鉴');
    drawColBadge();

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
            ctx.font = '13px system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('？？？', slotR.x + slotR.w / 2, cy2 + 4);
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
          ctx.font = '13px system-ui, sans-serif';
          ctx.fillText(found2 ? (isChest2 ? '宝箱' : spDef2.name) : '？？？', slotR.x + 33, cy2 + 4);
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
    layoutDexPanel();
    ctx.fillStyle = 'rgba(10,40,70,0.6)';
    ctx.fillRect(-BX, -renderOy, C.W + BX * 2, VH);
    panel(DEX_PANEL.x, DEX_PANEL.y, DEX_PANEL.w, DEX_PANEL.h, 14, 0.96);
    drawPanelHeader('成就殿堂'); // 固定页头标题，不随页签变化
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
  function drawSeaBadge(stg, x, y, reached, opaque) {
    var ic = SEA_BADGES[stg] || SEA_BADGES[0];
    ctx.save();
    ctx.translate(x, y);
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
  // 每日挑战卡（每日页签顶部）：今日海况词缀 + 目标分 + 开始按钮（热区 dchalBtnRect，systems 处理点击）
  // 菜单态离线收益告知卡（自动入账、无点击）：历史最佳行与开始按钮之间的空档，金色宝箱色系
  function drawOfflineCard() {
    if (state !== 'menu' || !offlineGain) return;
    var w = 300, h = 62, x = (C.W - w) / 2, y = 316;
    var og = ctx.createLinearGradient(0, y, 0, y + h);
    og.addColorStop(0, 'rgba(245,197,66,0.16)');
    og.addColorStop(1, 'rgba(217,169,63,0.08)');
    ctx.fillStyle = og;
    roundRect(x, y, w, h, 10); ctx.fill();
    ctx.strokeStyle = 'rgba(245,197,66,0.55)'; ctx.lineWidth = 1.2;
    roundRect(x, y, w, h, 10); ctx.stroke();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#F5C542';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillText('宝箱 · 离线收益', C.W / 2, y + 22);
    var om = offlineGain.mins;
    ctx.fillStyle = 'rgba(240,250,255,0.92)';
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillText('离开 ' + (om >= 60 ? Math.floor(om / 60) + ' 时 ' + (om % 60) + ' 分' : om + ' 分钟') + ' · 深海攒下 ' + offlineGain.gain + ' 分', C.W / 2, y + 43);
    ctx.fillStyle = 'rgba(200,225,245,0.55)';
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillText('开始游戏后自动入账', C.W / 2, y + 57);
    ctx.textAlign = 'center'; // 恢复菜单流的 center——曾误设 left 泄漏给开始按钮，导致小程序文字右移溢出
  }

  function drawDchalCard() {
    var ci = dchalInfo();
    var cx = DEX_PANEL.x + 14, cy = DEX_PANEL.y + 74, cw = DEX_PANEL.w - 28, chh = 96;
    ctx.fillStyle = ci.done ? 'rgba(245,197,66,0.14)' : 'rgba(123,111,208,0.10)';
    roundRect(cx, cy, cw, chh, 10); ctx.fill();
    if (ci.done) { ctx.fillStyle = '#F5C542'; roundRect(cx, cy + 10, 3, chh - 20, 1.5); ctx.fill(); }
    ctx.textAlign = 'left';
    ctx.fillStyle = ci.done ? '#B8860B' : '#6A5AB8';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.fillText((ci.done ? '✓ ' : '') + '今日挑战 · ' + ci.name, cx + 12, cy + 24);
    ctx.fillStyle = '#4A7FA0';
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillText(ci.desc, cx + 12, cy + 46);
    ctx.fillText('目标 ' + ci.goal + ' 分 · 连续 ' + ci.streak + ' 天', cx + 12, cy + 68);
    ctx.fillText('首通奖励最高 +' + C.dailyChal.rewardMax + ' 分 & 随机充能 +2', cx + 12, cy + 88);
    var br = dchalBtnRect();
    var bg = ctx.createLinearGradient(0, br.y, 0, br.y + br.h);
    if (!ci.canStart) { bg.addColorStop(0, '#B9C9D4'); bg.addColorStop(1, '#9DB2C0'); }
    else if (ci.done) { bg.addColorStop(0, '#F5C542'); bg.addColorStop(1, '#D9A93F'); }
    else { bg.addColorStop(0, '#8B7FD0'); bg.addColorStop(1, '#6A5AB8'); }
    ctx.fillStyle = bg;
    roundRect(br.x, br.y, br.w, br.h, br.h / 2); ctx.fill();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.fillText(ci.done ? '再玩一局' : '开始挑战', br.x + br.w / 2, br.y + 22);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#8AA5B8';
    ctx.font = '12px system-ui, sans-serif';
    if (!ci.canStart) ctx.fillText('对局中不可发起', br.x - 6, br.y + 52);
  }
  function drawDailyTab() {
    drawDchalCard();
    for (var i = 0; i < daily.tasks.length; i++) {
      var t = daily.tasks[i], done = daily.done[i];
      var ry = DEX_PANEL.y + 184 + i * 106;
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
    ctx.fillRect(-BX, -renderOy, C.W + BX * 2, VH);
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
