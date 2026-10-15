// 水滴成海 · 微信小游戏入口
// 加载顺序：适配层（先垫环境）→ 配置 → 物理 → 主逻辑
require('./adapter.js');
require('./js/config.js');
require('./js/physics.js');
require('./js/main.js');
