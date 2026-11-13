const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const FILES = ['platform', 'titlefont', 'config', 'layout', 'physics', 'core', 'systems', 'panels', 'render', 'main'];

const parts = FILES.map(name => {
  const p = path.join(ROOT, 'js', name + '.js');
  return fs.readFileSync(p, 'utf8');
});
const banner = [
  'var window = GameGlobal.__shim.window;',
  'var document = GameGlobal.__shim.document;',
  'var localStorage = GameGlobal.__shim.localStorage;',
  'var navigator = GameGlobal.__shim.navigator;',
  'var performance = GameGlobal.__shim.performance;',
  ''
].join('\n');
fs.writeFileSync(path.join(ROOT, 'wechat', 'bundle.js'), banner + parts.join('\n;\n') + '\n');
console.log('wechat/bundle.js written,', (banner + parts.join('\n;\n')).length, 'chars');
