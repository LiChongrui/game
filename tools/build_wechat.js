// 微信小游戏构建脚本：把 js/ 九模块拼接为 wechat/bundle.js
// 经典 script 共享顶层 var 的语义在模块包裹下依然成立——9 个文件拼进同一个
// CommonJS module，内部互相可见；MG 挂在 GameGlobal（垫片已把 window 指过去）。
// js 源码改动后重跑：node tools/build_wechat.js
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const FILES = ['platform', 'config', 'layout', 'physics', 'core', 'systems', 'panels', 'render', 'main'];

const parts = FILES.map(name => {
  const p = path.join(ROOT, 'js', name + '.js');
  return '// ===== js/' + name + '.js =====\n' + fs.readFileSync(p, 'utf8');
});
const banner = [
  '// 水滴合成深海 - 微信小游戏 bundle（自动生成，勿手改）',
  '// 由 tools/build_wechat.js 从 js/ 八模块拼接而来；模块间共享作用域，加载顺序与 index.html 一致。',
  '// 头部 var 注入：部分小游戏运行环境的 document/window 是只读全局，垫片赋值会被静默忽略',
  '// （真机实测报 document.getElementById is not a function），故在模块作用域内用 var 显式',
  '// 遮蔽环境全局，取垫片挂到 GameGlobal.__shim 的对象。',
  'var window = GameGlobal.__shim.window;',
  'var document = GameGlobal.__shim.document;',
  'var localStorage = GameGlobal.__shim.localStorage;',
  'var navigator = GameGlobal.__shim.navigator;',
  'var performance = GameGlobal.__shim.performance;',
  ''
].join('\n');
fs.writeFileSync(path.join(ROOT, 'wechat', 'bundle.js'), banner + parts.join('\n;\n') + '\n');
console.log('wechat/bundle.js written,', (banner + parts.join('\n;\n')).length, 'chars');
