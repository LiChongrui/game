// 水滴合成深海 - main：主循环与启动（模块加载顺序 4/4，最后加载；rAF 从这里起转）
// 主循环修复：原 frame() 中 update 被无条件调用一次、非 headless 又调一次，
// 导致浏览器每帧跑两遍 update（实际 2 倍速），模拟器也被 rAF 干扰。现统一为：
// headless 完全由 MG.debug.step() 驱动（rAF 空转），正常模式每帧 update+render 各一次。
var last = 0;
function frame(ts) {
  requestAnimationFrame(frame);
  if (MG.debug.headless) return; // 模拟器模式：完全由 step() 驱动，rAF 空转
  // v295：页面被隐藏（切标签页 / 预览面板被遮挡 / 窗口最小化）时宿主会节流甚至暂停 rAF，
  // 此时 GPU/合成层可能回收或休眠 canvas 表面；若不立即重绘，回到前台就会呈现花屏
  //（用户："首页静止一段时间后就开始花屏了，但是程序应该是正常的，只是显示花屏了"）
  if (typeof document !== 'undefined' && document.hidden) { last = ts; return; }
  if (!last) last = ts;
  var dt = Math.min((ts - last) / 1000, 1 / 30);
  last = ts;
  // v297：帧级异常兜底——过去 chest.t 空引用曾让每帧画到一半中断、globalAlpha 泄漏成
  // 全屏花屏且无任何报错提示。现捕获后把错误画在画布底部（红条），一眼可见、便于定位
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
// v295：恢复可见 / 重新获得焦点时立刻补一帧——让损坏或过期的表面被新一帧立即覆盖，
// 不必等到下一个 rAF 节拍（宿主恢复 rAF 有时存在数十毫秒以上的空窗）
// v301：微信端 document 是精简 shim（只有 getElementById/createElement，无 addEventListener），
// 逐个做存在性守卫——否则整包在真机/开发者工具加载即崩（TypeError: document.addEventListener
// is not a function）；focus/pageshow 在微信也无意义，守卫后自然跳过
if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
  var kickRepaint = function () {
    if (document.hidden) return;
    last = 0;                       // 重置时间基准，避免恢复瞬间 dt 过大
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
requestAnimationFrame(frame);
