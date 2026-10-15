// 生成微信小游戏音效 WAV（22050Hz / 16bit / 单声道）
// 用法：node tools/gen-audio.js   →  输出到 wechat/audio/*.wav
// 说明：小游戏运行时没有 WebAudio，web 版的振荡器合成改为"预生成音效文件 + InnerAudioContext 播放"，
//       本脚本按 web 版 audio.* 的参数（频率/时长/波形/滑音）离线合成同样的声音。
'use strict';
var fs = require('fs');
var path = require('path');

var SR = 22050;

// 单层声音：type(sine|tri|saw|square) f0(Hz) slide(终止频率倍率) dur(s) vol(0-1) delay(s)
function renderLayer(layer, totalN) {
  var n = Math.floor(SR * Math.min(layer.dur, 9.9));
  var start = Math.floor(SR * (layer.delay || 0));
  var slide = layer.slide || 1;
  var logSlide = Math.log(slide);
  var out = new Float32Array(totalN);
  for (var i = 0; i < n; i++) {
    var idx = start + i;
    if (idx >= totalN) break;
    var t = i / SR;
    var p = t / layer.dur; // 0..1
    // 包络：5ms 起音 + 指数衰减
    var env = Math.min(1, t / 0.005) * Math.pow(0.001, p);
    // 频率滑音的相位积分：φ(t) = 2π·f0·dur·(slide^p − 1)/ln(slide)
    var phase;
    if (Math.abs(slide - 1) < 1e-6) phase = 2 * Math.PI * layer.f0 * t;
    else phase = 2 * Math.PI * layer.f0 * layer.dur * (Math.pow(slide, p) - 1) / logSlide;
    var v;
    var type = layer.type || 'sine';
    if (type === 'tri') v = 2 / Math.PI * Math.asin(Math.sin(phase));
    else if (type === 'saw') v = 2 * ((phase / (2 * Math.PI)) % 1) - 1;
    else if (type === 'square') v = (Math.sin(phase) >= 0 ? 1 : -1) * 0.55;
    else v = Math.sin(phase);
    out[idx] += v * env * (layer.vol === undefined ? 1 : layer.vol);
  }
  return out;
}

function synth(def) {
  var totalN = Math.floor(SR * def.dur);
  var mix = new Float32Array(totalN);
  for (var l = 0; l < def.layers.length; l++) {
    var layer = renderLayer(def.layers[l], totalN);
    for (var i = 0; i < totalN; i++) mix[i] += layer[i];
  }
  // 归一化到 0.82 满幅，防止叠层削顶
  var peak = 0;
  for (i = 0; i < totalN; i++) peak = Math.max(peak, Math.abs(mix[i]));
  var gain = peak > 0 ? 0.82 / peak : 0;
  var pcm = new Int16Array(totalN);
  for (i = 0; i < totalN; i++) {
    var v = Math.max(-1, Math.min(1, mix[i] * gain));
    pcm[i] = Math.round(v * 32767);
  }
  return pcm;
}

function wavBytes(pcm) {
  var dataLen = pcm.length * 2;
  var buf = Buffer.alloc(44 + dataLen);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataLen, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);        // fmt 块长
  buf.writeUInt16LE(1, 20);         // PCM
  buf.writeUInt16LE(1, 22);         // 单声道
  buf.writeUInt32LE(SR, 24);        // 采样率
  buf.writeUInt32LE(SR * 2, 28);    // 字节率
  buf.writeUInt16LE(2, 32);         // 块对齐
  buf.writeUInt16LE(16, 34);        // 位深
  buf.write('data', 36);
  buf.writeUInt32LE(dataLen, 40);
  for (var i = 0; i < pcm.length; i++) buf.writeInt16LE(pcm[i], 44 + i * 2);
  return buf;
}

// 与 web 版 audio.* 参数一一对应
var defs = {
  drop:   { dur: 0.10, layers: [{ type: 'tri',   f0: 320,  slide: 0.6 }] },
  pop:    { dur: 0.15, layers: [{ type: 'sine',  f0: 480,  slide: 1.6 }] },
  big:    { dur: 0.45, layers: [{ type: 'sine',  f0: 200,  slide: 2.4 }, { type: 'sine', f0: 100, slide: 2.2, vol: 0.5 }] },
  swirl:  { dur: 0.50, layers: [{ type: 'sine',  f0: 220,  slide: 2.8, vol: 0.7 }] },
  freeze: { dur: 0.12, layers: [{ type: 'sine',  f0: 1250, slide: 1.1 }] },
  thaw:   { dur: 0.20, layers: [{ type: 'sine',  f0: 700,  slide: 1.5 }] },
  over:   { dur: 0.50, layers: [{ type: 'saw',   f0: 300,  slide: 0.3, vol: 0.6 }] },
  quest:  { dur: 0.30, layers: [{ type: 'sine',  f0: 660,  slide: 1, dur: 0.10, vol: 0.8 }, { type: 'sine', f0: 880, slide: 1, dur: 0.16, vol: 0.8, delay: 0.12 }] },
  tide:   { dur: 0.90, layers: [{ type: 'sine',  f0: 110,  slide: 2.2 }, { type: 'tri', f0: 165, slide: 2.0, vol: 0.5 }] },
  iron:   { dur: 0.35, layers: [{ type: 'square', f0: 320, slide: 0.5, vol: 0.6 }, { type: 'sine', f0: 180, slide: 0.55, vol: 0.8 }] },
  chirp:  { dur: 0.20, layers: [{ type: 'sine',  f0: 520,  slide: 1.8 }] },
  vapor:  { dur: 0.25, layers: [{ type: 'sine',  f0: 900,  slide: 0.4 }] }
};

// 背景音乐：深海氛围垫，4 个和弦各 4s（Cmaj7→Am7→Fmaj7→G7），包络在各自小节内收干净 → 16s 无缝循环
function synthBgm() {
  var chordDur = 4.0, bars = 4;
  var totalN = Math.floor(SR * chordDur * bars);
  var mix = new Float32Array(totalN);
  var chords = [
    [261.63, 329.63, 392.00, 493.88], // Cmaj7
    [220.00, 261.63, 329.63, 392.00], // Am7
    [174.61, 220.00, 261.63, 349.23], // Fmaj7
    [196.00, 246.94, 293.66, 392.00]  // G7
  ];
  for (var bar = 0; bar < bars; bar++) {
    var start = Math.floor(SR * bar * chordDur);
    var ch = chords[bar];
    var layers = [];
    for (var i = 0; i < ch.length; i++) {
      layers.push({ f: ch[i], vol: 0.2, type: 'sine' });
      layers.push({ f: ch[i] * 2, vol: 0.05, type: 'sine' }); // 泛音光泽
    }
    layers.push({ f: ch[0] / 2, vol: 0.3, type: 'tri' }); // 低音铺底
    for (i = 0; i < layers.length; i++) {
      var L = layers[i];
      var phase = 0, dPhase = 2 * Math.PI * L.f / SR;
      for (var s = 0; s < totalN - start; s++) {
        var t = s / SR;
        var env;
        if (t < 1.4) env = t / 1.4;
        else if (t < chordDur - 1.6) env = 1;
        else env = Math.max(0, (chordDur - t) / 1.6);
        env = env * env * (3 - 2 * env); // smoothstep 柔化
        var v = (L.type === 'tri') ? (2 / Math.PI * Math.asin(Math.sin(phase))) : Math.sin(phase);
        mix[start + s] += v * env * L.vol;
        phase += dPhase;
      }
    }
  }
  // 归一化到 0.45（BGM 保持低音量，不盖过音效）
  var peak = 0;
  for (i = 0; i < totalN; i++) peak = Math.max(peak, Math.abs(mix[i]));
  var gain = peak > 0 ? 0.45 / peak : 0;
  var pcm = new Int16Array(totalN);
  for (i = 0; i < totalN; i++) pcm[i] = Math.round(Math.max(-1, Math.min(1, mix[i] * gain)) * 32767);
  return pcm;
}

var outDir = path.join(__dirname, '..', 'wechat', 'audio');
fs.mkdirSync(outDir, { recursive: true });
var names = Object.keys(defs);
for (var i = 0; i < names.length; i++) {
  var name = names[i];
  var pcm = synth(defs[name]);
  fs.writeFileSync(path.join(outDir, name + '.wav'), wavBytes(pcm));
  console.log(name + '.wav  ' + (pcm.length / SR).toFixed(2) + 's  ' + (Math.round((44 + pcm.length * 2) / 10.24) / 100) + 'KB');
}
var bgmPcm = synthBgm();
fs.writeFileSync(path.join(outDir, 'bgm.wav'), wavBytes(bgmPcm));
console.log('bgm.wav  ' + (bgmPcm.length / SR).toFixed(2) + 's  ' + (Math.round((44 + bgmPcm.length * 2) / 10.24) / 100) + 'KB');
console.log('done: ' + (names.length + 1) + ' files → ' + outDir);
