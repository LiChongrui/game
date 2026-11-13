  var DEX_PANEL = { x: MG.layout.panel.dex.x, y: 65, w: MG.layout.panel.dex.w, h: MG.layout.panel.dex.h };
  var dexCloseBtn = { x: DEX_PANEL.x + DEX_PANEL.w - 40, y: DEX_PANEL.y + 10, w: 30, h: 30 };
  function layoutDexPanel() {
    DEX_PANEL.y = state === 'menu'
      ? Math.max(10, Math.round((VH - DEX_PANEL.h) / 2))
      : Math.max(10, Math.round(MG.layout.panel.dexY));
    dexCloseBtn.y = DEX_PANEL.y + 8;
  }
  var SET_PANEL = { x: 0, y: 0, w: 0, h: 0 };
  var setCloseBtn = { x: 0, y: 0, w: 30, h: 30 };
  function layoutSetPanel() {
    var r = MG.layout.setRect();
    SET_PANEL.x = r.x; SET_PANEL.y = r.y; SET_PANEL.w = r.w; SET_PANEL.h = r.h;
    setCloseBtn.x = r.x + r.w - 40; setCloseBtn.y = r.y + 8;
  }
  var shareCopyBtn = { x: 0, y: 0, w: 150, h: 42 };
  function spSlotRect(stg, s) {
    var r = stageRowRect(stg);
    return { x: r.x + r.w - 196 + s * 98, y: r.y + 6, w: 92, h: 32 };
  }
  function tierCellRect(t) {
    return { x: DEX_PANEL.x + 14 + (t % 3) * 122, y: DEX_PANEL.y + 124 + Math.floor(t / 3) * 126, w: 108, h: 112 };
  }
  function stageRowRect(g) {
    return { x: DEX_PANEL.x + 14, y: DEX_PANEL.y + 126 + g * 48, w: DEX_PANEL.w - 28, h: 44 };
  }
  function dexSecRect(i) {
    var segW = Math.floor((DEX_PANEL.w - 30) / 2);
    return { x: DEX_PANEL.x + 15 + i * segW, y: DEX_PANEL.y + 84, w: segW, h: 34 };
  }
  function dchalBtnRect() {
    ctx.font = 'bold 15px system-ui, sans-serif';
    var tw = Math.round(ctx.measureText('开始挑战').width);
    var w = tw + 56, h = 36;
    return { x: DEX_PANEL.x + Math.round((DEX_PANEL.w - w) / 2), y: DEX_PANEL.y + 152, w: w, h: h };
  }

  var ACH_ROW_H = 64, ACH_ROW_GAP = 8;
  function achViewport() {
    return { x: DEX_PANEL.x + 10, y: DEX_PANEL.y + 52, w: DEX_PANEL.w - 20, h: DEX_PANEL.h - 68 };
  }
  function achContentH() { return ACH_DEFS.length * (ACH_ROW_H + ACH_ROW_GAP) - ACH_ROW_GAP; }
  function achMaxScroll() { return Math.max(0, achContentH() - (DEX_PANEL.h - 68)); }

  function drawPanelHeader(title, rect, closeBtn, icon, accent, noBg) {
    var cy = closeBtn ? closeBtn.y + closeBtn.h / 2 : rect.y + 30;
    ctx.textAlign = 'left';
    var tx = rect.x + 18;
    if (icon) {
      var icx = rect.x + 30;
      if (typeof icon === 'function') {
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
  var segAnims = {};
  function drawSegTabs(rects, labels, active, dotIdx, key) {
    var now = performance.now() / 1000;
    var r0 = rects[0], rl = rects[rects.length - 1];
    ctx.fillStyle = 'rgba(21,90,138,0.10)';
    roundRect(r0.x, r0.y, rl.x + rl.w - r0.x, r0.h, r0.h / 2); ctx.fill();
    var st = segAnims[key];
    if (!st) { st = segAnims[key] = { cur: active, fx: rects[active].x, fw: rects[active].w, t0: -9 }; }
    if (active !== st.cur) {
      st.cur = active; st.t0 = now;
    }
    var p = Math.min(1, (now - st.t0) / 0.18);
    p = 1 - (1 - p) * (1 - p) * (1 - p);
    var tx0 = st.fx + (rects[active].x - st.fx) * p;
    var tw0 = st.fw + (rects[active].w - st.fw) * p;
    if (p >= 1) { st.fx = rects[active].x; st.fw = rects[active].w; }
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
      if (i === dotIdx && i !== active) {
        ctx.fillStyle = '#E2705E';
        ctx.beginPath(); ctx.arc(sr.x + sr.w - 11, sr.y + 7, 3, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.textBaseline = 'alphabetic';
  }
  function drawColBadge() {
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
    panel(DEX_PANEL.x, DEX_PANEL.y, DEX_PANEL.w, DEX_PANEL.h, 14, 0.96);
    drawPanelHeader('图鉴', DEX_PANEL, dexCloseBtn, function () {
      ctx.save(); ctx.scale(0.6, 0.6);
      ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 1.8;
      ctx.strokeRect(-8, -6, 16, 12);
      ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(0, 6); ctx.stroke();
      ctx.restore();
    }, '#4A7FA0');
    drawColBadge();

    var secNames = ['合成链', '海域演进'];
    var secRects = [dexSecRect(0), dexSecRect(1)];
    drawSegTabs(secRects, secNames, dexSec, -1, 'dexsec');
    var curStage = seaStage(), tsNow = totalScore(), bestScore = Math.max(tsNow, careerPeak);
    var nextIdx = C.seaStages.length;
    for (var si = 0; si < C.seaStages.length; si++) {
      if (bestScore < C.seaStages[si].at) { nextIdx = si; break; }
    }
    ctx.textAlign = 'center';

    if (dexSec === 0) {
      for (var t = 0; t < T.length; t++) {
        var tRect = tierCellRect(t);
        var unlocked = !!dexUnlocked[t], sel = dexSelTier === t;
        ctx.fillStyle = sel ? 'rgba(46,134,180,0.16)' : 'rgba(46,134,180,0.07)';
        roundRect(tRect.x, tRect.y, tRect.w, tRect.h, 10); ctx.fill();
        if (sel) {
          ctx.strokeStyle = '#2E86B4'; ctx.lineWidth = 1.5;
          roundRect(tRect.x + 0.5, tRect.y + 0.5, tRect.w - 1, tRect.h - 1, 10); ctx.stroke();
        }
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

      ctx.textAlign = 'left';
      for (var stg = 0; stg < C.seaStages.length; stg++) {
        var ss = C.seaStages[stg];
        var sRow = stageRowRect(stg);
        var isCur = stg === curStage, reached = bestScore >= ss.at, sel = dexSelStage === stg;
        var isNext = !reached && stg === nextIdx, hiddenStg = !isCur && !reached && !isNext;
        var rowCy = sRow.y + sRow.h / 2;
        if (isCur) {
          var rowG = ctx.createLinearGradient(sRow.x, 0, sRow.x + sRow.w, 0);
          rowG.addColorStop(0, ss.bg[2]);
          rowG.addColorStop(1, ss.bg[3]);
          ctx.fillStyle = rowG;
        } else if (reached) {
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
        var dotX = sRow.x + 20, dotY = rowCy;
        if (isCur) {
          ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(dotX, dotY, 12.5 + Math.sin(time * 4) * 1.2, 0, Math.PI * 2); ctx.stroke();
        }
        if (isCur || reached || isNext) drawSeaBadge(stg, dotX, dotY, reached || isCur);
        var nameTxt = isCur || reached || isNext ? ss.name : '？？？';
        var gateTxt = isCur ? '当前海域' : (reached ? '已抵达' : (isNext ? '下一海域 · 累计' + (ss.at >= 10000 ? (ss.at / 10000) + '万' : ss.at) + '分' : '累计 ' + (ss.at >= 10000 ? (ss.at / 10000) + '万' : ss.at) + ' 分解锁'));
        var mN = measureInk('bold 15px system-ui, sans-serif', nameTxt);
        var mG = measureInk('11px system-ui, sans-serif', gateTxt);
        var aN = mN.has ? mN.a : 15 * 0.84;
        var dG = mG.has ? mG.d : 11 * 0.06;
        var LINE_GAP = 14;
        var yN = rowCy - (aN + LINE_GAP + dG) / 2 + aN;
        var yG = yN + LINE_GAP;
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
        var slots2 = STAGE_SP_SLOTS[stg] || STAGE_SP_SLOTS[0];
        for (var sl = 0; sl < 2; sl++) {
          var slotR = spSlotRect(stg, sl);
          var spIdx2 = slots2[sl];
          var isChest2 = spIdx2 === SP_DEFS.length;
          var spDef2 = isChest2 ? null : SP_DEFS[spIdx2];
          var found2 = !!dexSpecial[isChest2 ? 'chest' : spDef2.key];
          if (dexSelSp === spIdx2 && dexSelStage < 0) {
            ctx.fillStyle = 'rgba(46,134,180,0.14)';
            roundRect(slotR.x, slotR.y, slotR.w, slotR.h, 8); ctx.fill();
            ctx.strokeStyle = '#2E86B4'; ctx.lineWidth = 1.2;
            roundRect(slotR.x + 0.5, slotR.y + 0.5, slotR.w - 1, slotR.h - 1, 8); ctx.stroke();
          }
          var cx2 = slotR.x + 15, cy2 = rowCy;
          var spName2 = found2 ? (isChest2 ? '大宝箱' : spDef2.name) : '？？？';
          var m2 = measureInk('13px system-ui, sans-serif', spName2);
          var tw2 = m2.w;
          var TXT_COL = 57;
          var tx2 = slotR.x + 30 + Math.max(0, (TXT_COL - tw2) / 2);
          var y2 = cy2 + ((m2.has ? m2.a : 13 * 0.84) - (m2.has ? m2.d : 13 * 0.06)) / 2;
          if ((hiddenStg || isNext) && !reached) {
            ctx.save();
            ctx.setLineDash([3, 3]);
            ctx.strokeStyle = '#A8BCCB'; ctx.lineWidth = 1;
            roundRect(slotR.x + 0.5, slotR.y + 0.5, slotR.w - 1, slotR.h - 1, 8); ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = '#A8BCCB';
            ctx.font = '13px system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('？？？', slotR.x + slotR.w / 2, y2);
            ctx.textAlign = 'left';
            ctx.restore();
            continue;
          }
          if (found2) {
            ctx.fillStyle = 'rgba(255,255,255,0.30)';
            ctx.beginPath(); ctx.arc(cx2, cy2, 12, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1;
            ctx.stroke();
            drawSpForm(spIdx2, cx2, cy2);
          } else {
            ctx.fillStyle = 'rgba(196,212,224,0.55)';
            ctx.beginPath(); ctx.arc(cx2, cy2, 9, 0, Math.PI * 2); ctx.fill();
            ctx.setLineDash([2.5, 2.5]);
            ctx.strokeStyle = '#5E7E96'; ctx.lineWidth = 1.2;
            ctx.beginPath(); ctx.arc(cx2, cy2, 10.8, 0, Math.PI * 2); ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = '#3E647E';
            ctx.font = 'bold 14px system-ui, sans-serif';
            ctx.textAlign = 'center';
            var mq = measureInk('bold 14px system-ui, sans-serif', '?');
            var yq = cy2 + ((mq.has ? mq.a : 14 * 0.72) - (mq.has ? mq.d : 14 * 0.02)) / 2;
            ctx.fillText('?', cx2, yq);
            ctx.textAlign = 'left';
          }
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
      sub = stgCur ? '当前海域' : (stgReached ? '已抵达' : (dexSelStage === nextIdx ? '下一海域 · 累计' + (stgS.at >= 10000 ? (stgS.at / 10000) + '万' : stgS.at) + '分' : '累计 ' + (stgS.at >= 10000 ? (stgS.at / 10000) + '万' : stgS.at) + ' 分解锁'));
      body = '越深水色越暗：潮汐更频、礁石更多。';
    } else {
      var CHEST_INFO = { key: 'chest', name: '大宝箱', desc: '沉底木箱，沉走前点开：得分或充能。' };
      var isChestSel = dexSelSp === SP_DEFS.length;
      var dsc = isChestSel ? CHEST_INFO : (SP_DEFS[dexSelSp] || SP_DEFS[0]);
      known = !!dexSpecial[isChestSel ? 'chest' : dsc.key];
      title = known ? dsc.name : '？？？';
      sub = known ? (isChestSel ? '深海随机事件' : '已发现') : '未发现';
      body = known ? dsc.desc : '在海域中发现它即可点亮说明。';
    }
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

  function drawAchPanel() {
    layoutDexPanel();
    panel(DEX_PANEL.x, DEX_PANEL.y, DEX_PANEL.w, DEX_PANEL.h, 14, 0.96);
    var titles = ['成就', '每日任务', '每日挑战', '榜单'];
    drawPanelHeader(titles[dexTab] || '成就', DEX_PANEL, dexCloseBtn, ['🏆', '📋', '🎯', '🥇'][dexTab] || '🏆', null, true);
    if (dexTab === 1) drawDailyTasksTab();
    else if (dexTab === 2) drawDchalCard();
    else if (dexTab === 3) drawRankTab();
    else drawAchTab();
  }

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
    ctx.strokeStyle = 'rgba(255,240,190,0.5)'; ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-w * 0.34, -h * 0.30);
    ctx.quadraticCurveTo(0, -h * 0.62, w * 0.34, -h * 0.30);
    ctx.stroke();
    ctx.fillStyle = grad('chestBodyI', function () {
      var gg2 = ctx.createLinearGradient(0, seamY, 0, h * 0.56);
      gg2.addColorStop(0, '#D8A44C'); gg2.addColorStop(0.5, '#C08A38'); gg2.addColorStop(1, '#8F5E22');
      return gg2;
    });
    roundRect(-w / 2, seamY, w, h * 0.62, 2.5); ctx.fill();
    ctx.strokeStyle = 'rgba(110,66,20,0.45)'; ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-w * 0.17, seamY + 2); ctx.lineTo(-w * 0.17, h * 0.52);
    ctx.moveTo(w * 0.17, seamY + 2); ctx.lineTo(w * 0.17, h * 0.52);
    ctx.stroke();
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
    var seamG = 0.26 + 0.24 * Math.sin(time * 3 + 1);
    ctx.fillStyle = 'rgba(255,224,130,' + seamG.toFixed(2) + ')';
    roundRect(-w * 0.4, seamY - 1, w * 0.8, 2, 1); ctx.fill();
    ctx.fillStyle = '#FFD873';
    roundRect(-3.6, seamY - 2.5, 7.2, 8, 2); ctx.fill();
    ctx.fillStyle = '#5A3A14';
    ctx.beginPath(); ctx.arc(0, seamY + 1, 1.3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-0.7, seamY + 1.8); ctx.lineTo(0.7, seamY + 1.8);
    ctx.lineTo(0.45, seamY + 4.2); ctx.lineTo(-0.45, seamY + 4.2);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(242,193,78,0.85)'; ctx.lineWidth = 1.1;
    roundRect(-w / 2, seamY, w, h * 0.62, 2.5); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-w / 2, seamY);
    ctx.quadraticCurveTo(0, -h * 0.72, w / 2, seamY);
    ctx.stroke();
    ctx.restore();
  }

  var SEA_BADGES = [
    { c: '#3BB8D8', g: 'pool' },
    { c: '#38A98A', g: 'coral' },
    { c: '#2E9BD4', g: 'bubbles' },
    { c: '#4A5FB4', g: 'star' },
    { c: '#647FA8', g: 'moon' },
    { c: '#2A4C8A', g: 'eye' },
    { c: '#B85C3A', g: 'vent' },
    { c: '#8A5FB4', g: 'crown' }
  ];
  function drawSeaBadge(stg, x, y, reached, opaque, r) {
    var ic = SEA_BADGES[stg] || SEA_BADGES[0];
    ctx.save();
    ctx.translate(x, y);
    if (r && r !== 10) ctx.scale(r / 10, r / 10);
    ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2);
    if (reached) {
      ctx.fillStyle = ic.c; ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 1; ctx.stroke();
    } else {
      ctx.fillStyle = opaque ? '#EFF5FA' : 'rgba(120,145,165,0.16)'; ctx.fill();
      ctx.strokeStyle = '#8AA5B8'; ctx.lineWidth = 1; ctx.stroke();
    }
    var fg = reached ? '#FFFFFF' : '#8AA5B8';
    ctx.strokeStyle = fg; ctx.fillStyle = fg;
    ctx.lineWidth = 1.4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    switch (ic.g) {
      case 'pool':
        ctx.moveTo(-5.5, -2.5); ctx.quadraticCurveTo(-2.8, -5.5, 0, -2.5); ctx.quadraticCurveTo(2.8, 0.5, 5.5, -2.5);
        ctx.moveTo(-5.5, 3.5); ctx.quadraticCurveTo(-2.8, 0.5, 0, 3.5); ctx.quadraticCurveTo(2.8, 6.5, 5.5, 3.5);
        ctx.stroke(); break;
      case 'coral':
        ctx.moveTo(0, 5); ctx.lineTo(0, -1);
        ctx.moveTo(0, 0); ctx.lineTo(-3.5, -4.5);
        ctx.moveTo(0, 1); ctx.lineTo(3.5, -2.5);
        ctx.moveTo(-3.5, -4.5); ctx.lineTo(-2, -5.5);
        ctx.stroke(); break;
      case 'bubbles':
        ctx.arc(-2.5, 3, 1.7, 0, Math.PI * 2);
        ctx.moveTo(1.8, -0.5); ctx.arc(0.8, -0.5, 1.1, 0, Math.PI * 2);
        ctx.moveTo(3.4, -3.8); ctx.arc(3, -3.8, 0.6, 0, Math.PI * 2);
        ctx.stroke(); break;
      case 'star':
        ctx.moveTo(0, -5); ctx.quadraticCurveTo(0.9, -0.9, 5, 0);
        ctx.quadraticCurveTo(0.9, 0.9, 0, 5);
        ctx.quadraticCurveTo(-0.9, 0.9, -5, 0);
        ctx.quadraticCurveTo(-0.9, -0.9, 0, -5);
        ctx.fill(); break;
      case 'moon':
        ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = reached ? ic.c : 'rgba(120,145,165,0.16)';
        ctx.beginPath(); ctx.arc(2.2, -1.6, 4.4, 0, Math.PI * 2); ctx.fill(); break;
      case 'eye':
        ctx.ellipse(0, 0, 5.2, 3.1, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 0, 1.7, 0, Math.PI * 2); ctx.fill(); break;
      case 'vent':
        ctx.moveTo(0, -5.5); ctx.quadraticCurveTo(4.5, -0.5, 2.2, 4.5);
        ctx.lineTo(-2.2, 4.5); ctx.quadraticCurveTo(-4.5, -0.5, 0, -5.5);
        ctx.fill(); break;
      case 'crown':
        ctx.moveTo(-5, 3.5); ctx.lineTo(-5, -2); ctx.lineTo(-2.2, 0.2);
        ctx.lineTo(0, -4.2); ctx.lineTo(2.2, 0.2); ctx.lineTo(5, -2);
        ctx.lineTo(5, 3.5); ctx.closePath(); ctx.fill(); break;
    }
    ctx.restore();
  }

  function drawSpForm(spIdx, x, y) {
    if (spIdx === SP_DEFS.length) { drawChestIcon(x, y, 0.76); return; }
    var key = SP_DEFS[spIdx].key;
    if (key === 'iron') { drawIronBall({ x: x, y: y, r: 11, vx: 0, vy: 0 }, 1); return; }
    if (key === 'rune') { drawBall({ x: x, y: y, r: 11, tier: 1, vx: 0, vy: 0, rune: 'ripple' }, 1); return; }
    drawBall({ x: x, y: y, r: 11, tier: 1, vx: 0, vy: 0, special: key, frozen: key === 'ice' ? 1 : 0 }, 1);
  }

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
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        for (var sp = 0; sp < 5; sp++) {
          var sa = -Math.PI / 2 + sp * 2 * Math.PI / 5, sa2 = sa + Math.PI / 5;
          ctx.lineTo(mx + Math.cos(sa) * 7, my + 0.5 + Math.sin(sa) * 7);
          ctx.lineTo(mx + Math.cos(sa2) * 3, my + 0.5 + Math.sin(sa2) * 3);
        }
        ctx.closePath(); ctx.fill();
      } else {
        ctx.strokeStyle = '#7E93A2'; ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.arc(mx, my - 2, 3.2, Math.PI, 0); ctx.stroke();
        ctx.fillStyle = '#7E93A2';
        roundRect(mx - 5, my - 2, 10, 8, 2); ctx.fill();
      }
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
  function truncText(s, maxW) {
    if (ctx.measureText(s).width <= maxW) return s;
    while (s.length > 1 && ctx.measureText(s + '…').width > maxW) s = s.slice(0, -1);
    return s + '…';
  }

  function drawOfflineCard() {
    if (state !== 'menu' || !offlineGain) return;
    var mu = MG.layout.menu;
    var w = mu.offlineW, h = mu.offlineH, x = (C.W - w) / 2, y = mu.offlineY;
    ctx.textBaseline = 'alphabetic';
    var og = ctx.createLinearGradient(0, y, 0, y + h);
    og.addColorStop(0, 'rgba(245,197,66,0.16)');
    og.addColorStop(1, 'rgba(217,169,63,0.08)');
    ctx.fillStyle = og;
    roundRect(x, y, w, h, 10); ctx.fill();
    ctx.strokeStyle = 'rgba(245,197,66,0.55)'; ctx.lineWidth = 1.2;
    roundRect(x, y, w, h, 10); ctx.stroke();
    ctx.textAlign = 'center';
    var om = offlineGain.mins;
    var lines = [
      { t: '大宝箱 · 离线收益', f: 'bold 15px system-ui, sans-serif', c: '#8A6508' },
      { t: '离开 ' + (om >= 60 ? Math.floor(om / 60) + ' 时 ' + (om % 60) + ' 分' : om + ' 分钟') + ' · 深海攒下 ' + offlineGain.gain + ' 分', f: '13px system-ui, sans-serif', c: 'rgba(90,66,20,0.88)' },
      { t: '开始游戏后自动入账', f: '11px system-ui, sans-serif', c: 'rgba(125,100,40,0.62)' }
    ];
    var box = [], tot = 0, li;
    for (li = 0; li < lines.length; li++) {
      var mm = measureInk(lines[li].f, lines[li].t);
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
      yy += box[li].a;
      ctx.fillText(lines[li].t, C.W / 2, yy);
      yy += box[li].d + lgap;
    }
    ctx.textAlign = 'center';
  }

  function drawDchalCard() {
    var ci = dchalInfo();
    var x = DEX_PANEL.x + 14, y = DEX_PANEL.y + 54, w = DEX_PANEL.w - 28, h = 150;
    var hg = ctx.createLinearGradient(0, y, 0, y + h);
    hg.addColorStop(0, '#7B6FD0'); hg.addColorStop(1, '#5A4AA8');
    ctx.fillStyle = hg;
    roundRect(x, y, w, h, 16); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.28)'; ctx.lineWidth = 1.2;
    roundRect(x + 0.5, y + 0.5, w - 1, h - 1, 16); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.beginPath(); ctx.arc(x + w - 24, y + 20, 16, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + w - 46, y + 38, 7, 0, Math.PI * 2); ctx.fill();
    var mx = x + 34, my = y + 58;
    ctx.fillStyle = '#FFD873';
    ctx.beginPath(); ctx.arc(mx, my, 15, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#8A5A18';
    ctx.beginPath();
    ctx.moveTo(mx - 7, my + 4); ctx.lineTo(mx - 7, my - 2); ctx.lineTo(mx - 3.2, my + 0.5);
    ctx.lineTo(mx, my - 5.5); ctx.lineTo(mx + 3.2, my + 0.5); ctx.lineTo(mx + 7, my - 2);
    ctx.lineTo(mx + 7, my + 4); ctx.closePath(); ctx.fill();
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
      if (a.today) continue;
      var ry = listY + shown * (rowH + rowGap);
      ctx.fillStyle = 'rgba(255,255,255,0.62)';
      roundRect(x, ry, w, rowH, 10); ctx.fill();
      ctx.strokeStyle = 'rgba(46,110,150,0.10)'; ctx.lineWidth = 1;
      roundRect(x + 0.5, ry + 0.5, w - 1, rowH - 1, 10); ctx.stroke();
      var bx = x + 24, by = ry + rowH / 2;
      ctx.fillStyle = '#D5DFE6';
      ctx.beginPath(); ctx.arc(bx, by, 9, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#A8BCCB'; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.fillStyle = '#8AA5B8';
      roundRect(bx - 4, by - 1, 8, 6.5, 1.5); ctx.fill();
      ctx.strokeStyle = '#8AA5B8'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(bx, by - 1.5, 2.6, Math.PI, 0); ctx.stroke();
      ctx.textAlign = 'left';
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.fillStyle = '#8AA5B8';
      ctx.fillText(a.name, x + 44, ry + 18);
      ctx.font = '10.5px system-ui, sans-serif';
      ctx.fillStyle = '#A8BCCB';
      ctx.fillText(a.desc + (a.mult ? ' · 得分 ×' + a.mult : ''), x + 44, ry + 33);
      ctx.textAlign = 'right';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.fillStyle = a.count > 0 ? '#D9A93F' : '#B9C9D4';
      ctx.fillText('已完成 ' + (a.count || 0) + ' 次', x + w - 12, ry + rowH / 2 + 4);
      shown++;
    }
  }

  function drawDailyTasksTab() {
    var doneCnt = 0;
    for (var di0 = 0; di0 < daily.tasks.length; di0++) if (daily.done[di0]) doneCnt++;
    var x = DEX_PANEL.x + 14, w = DEX_PANEL.w - 28;
    var fy = DEX_PANEL.y + 54, fh = 80;
    var hgr = ctx.createLinearGradient(0, fy, 0, fy + fh);
    if (daily.allDone) { hgr.addColorStop(0, '#F7CE5B'); hgr.addColorStop(1, '#DFA23C'); }
    else { hgr.addColorStop(0, '#3B97C9'); hgr.addColorStop(1, '#1E6B9E'); }
    ctx.fillStyle = hgr;
    roundRect(x, fy, w, fh, 14); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1.2;
    roundRect(x + 0.5, fy + 0.5, w - 1, fh - 1, 14); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.beginPath(); ctx.arc(x + w - 30, fy + 20, 18, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + w - 58, fy + 52, 8, 0, Math.PI * 2); ctx.fill();
    var mx = x + 36, my = fy + 40;
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.beginPath(); ctx.arc(mx, my, 21, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.textAlign = 'center';
    ctx.font = '20px system-ui, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('🔥', mx, my + 7);
    ctx.textAlign = 'left';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('今日全勤奖励', x + 66, fy + 30);
    ctx.font = '10.5px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.78)';
    ctx.fillText('已连续 ' + (daily.streak || 0) + ' 天 · 全勤可得分数与充能加成', x + 66, fy + 50);
    ctx.fillText('任务每日 0 点刷新 · 难度随连续天数提升', x + 66, fy + 66);
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
        drawBall({ x: 0, y: 0, r: 14, tier: t.tier, vx: 0, vy: 0 }, 1);
      } else if (t.type === 'combo') {
        ctx.scale(1.6, 1.6);
        drawSkillIcon('ripple', 0, 0, '#2FA8A0');
      } else if (t.type === 'chest') {
        drawChestIcon(0, 1, 0.62);
      } else if (t.type === 'tide') {
        ctx.scale(1.5, 1.5);
        drawSeaBadge(seaStage(), 0, 0, true);
      } else {
        drawIronBall({ x: 0, y: 0, r: 13, vx: 0, vy: 0 }, 1);
      }
      ctx.restore();
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

  function drawRankTab() {
    var rows = recentBoard();
    var colW = 108, gap = 14, yBase = DEX_PANEL.y + 170;
    var tops = [rows[1] || null, rows[0] || null, rows[2] || null];
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
      ctx.fillText(String([2, 1, 3][p]), mx, my + 4.5);
      ctx.font = '11.5px system-ui, sans-serif';
      ctx.fillStyle = p === 1 ? '#7A5608' : '#3E647E';
      ctx.fillText(tops[p] ? truncText(tops[p].name, colW - 12) : '—', mx, py0 + 48);
      ctx.font = 'bold 13.5px system-ui, sans-serif';
      ctx.fillStyle = p === 1 ? '#7A5608' : '#155A8A';
      ctx.fillText(tops[p] ? fmtScore(tops[p].score) : '', mx, py0 + 66);
    }
    ctx.fillStyle = 'rgba(46,134,180,0.10)';
    roundRect(DEX_PANEL.x + 14, yBase, DEX_PANEL.w - 28, 8, 4); ctx.fill();
    for (var i = 3; i < rows.length; i++) {
      var r = rows[i], ry = DEX_PANEL.y + 196 + (i - 3) * 70;
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
      ctx.fillText(r.name + ' · ' + (C.seaStages[r.sea] ? C.seaStages[r.sea].name : ''), DEX_PANEL.x + 58, ry + 33);
      ctx.textAlign = 'right';
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.fillStyle = r.me ? '#B8860B' : '#3E6E90';
      ctx.fillText(fmtScore(r.score), DEX_PANEL.x + DEX_PANEL.w - 26, ry + 33);
    }
    if (!rows.length) {
      ctx.textAlign = 'center';
      ctx.font = '13px system-ui, sans-serif';
      ctx.fillStyle = '#8AA5B8';
      ctx.fillText('完成一局后，这里会记录你的成绩排名', DEX_PANEL.x + DEX_PANEL.w / 2, DEX_PANEL.y + 230);
    }
    ctx.textAlign = 'center';
  }
  function fmtScore(n) {
    if (n >= 10000) return (Math.round(n / 1000) / 10) + '万';
    return String(n);
  }

  function drawShare() {
    var sr = MG.layout.shareRect();
    var pw = sr.w, ph = sr.h, px = sr.x, py = sr.y;
    panel(px, py, pw, ph, 16, 0.97);
    var head = ctx.createLinearGradient(0, py, 0, py + 96);
    head.addColorStop(0, '#2E86B4'); head.addColorStop(1, '#155A8A');
    ctx.fillStyle = head;
    roundRect(px, py, pw, 96, 16); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    roundRect(px, py + 80, pw, 16, 8); ctx.fill();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 25px system-ui, sans-serif';
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
    ctx.font = 'bold 58px system-ui, sans-serif';
    ctx.fillStyle = '#0F4C79';
    ctx.fillText(String(score), C.W / 2, py + 168);
    ctx.font = '15px system-ui, sans-serif';
    ctx.fillStyle = '#4A7FA0';
    var isNewBest = score >= best && score > 0;
    ctx.fillText(isNewBest ? '★ 新纪录！' : '最佳 ' + best, C.W / 2, py + 192);
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
    ctx.textAlign = 'left';
    ctx.font = '14px system-ui, sans-serif';
    var shLines = wrapLines(shareText, pw - 60);
    var shBoxH = Math.max(44, 20 + shLines.length * 16);
    ctx.fillStyle = 'rgba(46,134,180,0.06)';
    roundRect(px + 20, py + 278, pw - 40, shBoxH, 8); ctx.fill();
    ctx.fillStyle = '#3E6E90';
    for (var li = 0; li < shLines.length; li++) ctx.fillText(shLines[li], px + 32, py + 296 + li * 16);
    ctx.textAlign = 'center';
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
