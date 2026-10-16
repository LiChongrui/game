// 水滴合成深海 - 微信小游戏入口
// 加载顺序：垫片（wx→DOM 桥）→ 游戏本体 bundle（八模块拼接，共享作用域）。
// 小游戏包禁用 eval，因此用构建脚本 tools/build_wechat.js 把 js/ 八文件拼成
// bundle.js 后 require——同一个 CommonJS module 内顶层 var 互相可见，
// 与浏览器里八个经典 script 共享全局作用域的语义一致。
require('./wx-shim.js');
require('./bundle.js');
