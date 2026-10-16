// 一次性脚本：把 js/main.js（单 IIFE）按行段拆分为 4 个经典 script 模块
// 切分依据：各段顶层语句的加载期依赖（函数声明在各自 script 内提升，跨文件按加载顺序解析）
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const lines = fs.readFileSync(path.join(root, 'js/main.js'), 'utf8').split('\n');
const seg = (a, b) => lines.slice(a - 1, b).join('\n');

const header = lines.slice(0, 3).join('\n'); // 1-3 行：文件头注释

const files = [
  {
    name: 'core.js',
    banner: '// 水滴成海 - core：画布与自适应 / 平台存储封装 / 音效 / 广告占位\n// 模块加载顺序 1/4（无内部依赖）。四个模块共享全局作用域（经典 script），\n// 函数与状态互相可见；加载顺序只约束"顶层初始化语句"的执行先后。\n',
    body: seg(5, 297)
  },
  {
    name: 'systems.js',
    banner: '// 水滴成海 - systems：游戏状态 / 输入 / 合成 / 技能 / 潮汐 / 海域事件 / 图鉴数据 / 主更新\n// 模块加载顺序 2/4（依赖 core.js：canvas、audio、存储助手）。顶层 var 初始化\n// （rollTier 等）调用的函数与本文件同域提升，或来自已加载的 core.js。\n',
    body: seg(298, 2151)
  },
  {
    name: 'render.js',
    banner: '// 水滴成海 - render：绘制工具与全部渲染（背景 / 水滴 / 宝箱 / HUD / 面板 / 结算）\n// 模块加载顺序 3/4（依赖 core+systems 的状态与画布上下文；顶层仅有渐变缓存初始化）。\n',
    body: seg(2152, 4313)
  },
  {
    name: 'main.js',
    banner: '// 水滴成海 - main：主循环与启动（模块加载顺序 4/4，最后加载；rAF 从这里起转）\n',
    body: seg(4315, 4327)
  }
];

for (const f of files) {
  const out = f.banner + header + '\n' + f.body.replace(/^\n+/, '').replace(/\s+$/, '') + '\n';
  fs.writeFileSync(path.join(root, 'js', f.name), out, 'utf8');
  console.log(f.name, out.split('\n').length, 'lines');
}
console.log('SPLIT_OK');
