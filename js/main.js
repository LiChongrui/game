// 滴水成海 - main：主循环与启动（模块加载顺序 4/4，最后加载；rAF 从这里起转）
// 主循环修复：原 frame() 中 update 被无条件调用一次、非 headless 又调一次，
// 导致浏览器每帧跑两遍 update（实际 2 倍速），模拟器也被 rAF 干扰。现统一为：
// headless 完全由 MG.debug.step() 驱动（rAF 空转），正常模式每帧 update+render 各一次。
var last = 0;
function frame(ts) {
  requestAnimationFrame(frame);
  if (MG.debug.headless) return; // 模拟器模式：完全由 step() 驱动，rAF 空转
  if (!last) last = ts;
  var dt = Math.min((ts - last) / 1000, 1 / 30);
  last = ts;
  update(dt);
  render();
}

makeQuest(0);
requestAnimationFrame(frame);
