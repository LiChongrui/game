var last = 0;
function frame(ts) {
  requestAnimationFrame(frame);
  if (MG.debug.headless) return;
  if (typeof document !== 'undefined' && document.hidden) { last = ts; return; }
  if (!last) last = ts;
  var dt = Math.min((ts - last) / 1000, 1 / 30);
  last = ts;
  try {
    update(dt);
    render();
  } catch (err) {
    try {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
      var bh = Math.min(90, canvas.height * 0.1);
      ctx.fillStyle = 'rgba(122,30,30,0.92)';
      ctx.fillRect(0, canvas.height - bh, canvas.width, bh);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '16px monospace';
      ctx.textBaseline = 'top';
      ctx.fillText('ERR ' + String(err && err.message || err).slice(0, 120), 10, canvas.height - bh + 10);
      ctx.font = '12px monospace';
      ctx.fillText(String(err && err.stack || '').replace(/\n/g, ' | ').slice(0, 160), 10, canvas.height - bh + 34);
      ctx.textBaseline = 'alphabetic';
    } catch (e2) {}
    if (typeof console !== 'undefined' && console.error) console.error('[frame]', err);
  }
}
if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
  var kickRepaint = function () {
    if (document.hidden) return;
    last = 0;
    if (typeof render === 'function') render();
  };
  document.addEventListener('visibilitychange', kickRepaint);
}
if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  var kickRepaint2 = function () {
    if (typeof document !== 'undefined' && document.hidden) return;
    last = 0;
    if (typeof render === 'function') render();
  };
  window.addEventListener('focus', kickRepaint2);
  window.addEventListener('pageshow', kickRepaint2);
}

makeQuest(0);
if (MG.platform && MG.platform.isWx && typeof wx !== 'undefined') {
  try { wx.showShareMenu({ withShareTicket: false, menus: ['shareAppMessage', 'shareTimeline'] }); } catch (e) {}
  try { wx.onShareTimeline(function () { return { title: '水滴合成深海' }; }); } catch (e) {}
}
requestAnimationFrame(frame);
