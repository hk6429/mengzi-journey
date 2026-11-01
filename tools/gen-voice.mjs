// 朗讀產生器：node tools/gen-voice.mjs [--voice 1..7] [--only baihua] [--limit N]
// 輸出 public/voice/<planetId>-<段號>.mp3、原文 <planetId>-y.mp3 與 manifest.json（記每段文字雜湊，文字沒變就跳過）
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import os from 'node:os';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
const root = path.resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);
const arg = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
if (args.includes('--help')) { console.log('node tools/gen-voice.mjs [--voice 1..7（預設 7 大乃克隆）] [--only <planetId>] [--limit N]'); process.exit(0); }
// 沿用前作試聽過的 7 種；本作契約選定 7（大乃克隆聲，全域指令 opuscar-tts）
const PRESETS = {
  1: { v: 'zh-TW-HsiaoChenNeural', rate: '-5%', pitch: 0 },
  2: { v: 'zh-TW-HsiaoYuNeural', rate: '-5%', pitch: 0 },
  3: { v: 'zh-TW-YunJheNeural', rate: '-8%', pitch: 0 },
  4: { v: 'zh-TW-YunJheNeural', rate: '-15%', pitch: -3 },
  5: { v: 'zh-TW-HsiaoYuNeural', rate: '-3%', pitch: 18 },
  6: { v: 'zh-TW-HsiaoChenNeural', rate: '-12%', pitch: -4 },
  7: { clone: true }
};
const voice = String(arg('--voice', '7')), only = arg('--only'), limit = Number(arg('--limit', Infinity));
const pre = PRESETS[voice]; if (!pre) throw new Error('未知的 --voice：' + voice + '（可用 1–7）');
const s = {}; vm.runInNewContext(fs.readFileSync(path.join(root, 'src/data.js'), 'utf8') + ';globalThis.D=DATA;', s);
// 數字改中文念法（故事裡目前沒有數字，保險用）；原文難字改同音字，免得克隆聲念錯（蕃ㄈㄢˊ、濯ㄓㄨㄛˊ、褻ㄒㄧㄝˋ、鮮ㄒㄧㄢˇ、噫ㄧ、予ㄩˊ、漣ㄌㄧㄢˊ）
const SAY_AS = { 蕃: '凡', 濯: '卓', 褻: '謝', 鮮: '顯', 噫: '依', 予: '余', 漣: '連' };
const say = t => t.replace(/\d/g, d => '〇一二三四五六七八九'[d]).replace(/[蕃濯褻鮮噫予漣]/g, c => SAY_AS[c]).replace(/ (?=[一-鿿])|(?<=[一-鿿]) /g, '');
const outDir = path.join(root, 'public/voice'); fs.mkdirSync(outDir, { recursive: true });
const mfPath = path.join(outDir, 'manifest.json');
let mf = { voice, files: {} };
try { const old = JSON.parse(fs.readFileSync(mfPath, 'utf8')); if (old.voice === voice) mf = old; } catch {}
const hash = t => crypto.createHash('sha1').update(voice + '|' + t).digest('hex').slice(0, 12);
const jobs = [];
for (const p of s.D.planets) if (!only || p.id === only) {
  p.story.forEach((t, i) => jobs.push({ id: `${p.id}-${i + 1}`, text: t, say: say(t) }));
  jobs.push({ id: `${p.id}-y`, text: p.yuan, say: say(p.yuan) }); // 古文模式朗讀原文
}
const todo = jobs.filter(j => !(mf.files[j.id] && mf.files[j.id].hash === hash(j.text) && fs.existsSync(path.join(outDir, j.id + '.mp3')))).slice(0, limit);
console.log(`聲音 ${voice}：共 ${jobs.length} 段，需產生 ${todo.length} 段`);
const save = () => fs.writeFileSync(mfPath, JSON.stringify(mf, null, 1) + '\n');
if (pre.clone) {
  // 大乃克隆：全域指令 opuscar-tts lines.json outdir/ → wav，再轉 mp3 96k
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'als-voice-'));
  fs.writeFileSync(path.join(tmp, 'lines.json'), JSON.stringify(todo));
  if (todo.length) execFileSync('opuscar-tts', [path.join(tmp, 'lines.json'), path.join(tmp, 'out') + '/'], { stdio: 'inherit' });
  for (const j of todo) {
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', path.join(tmp, 'out', j.id + '.wav'), '-b:a', '96k', path.join(outDir, j.id + '.mp3')]);
    mf.files[j.id] = { hash: hash(j.text) }; save(); console.log('✓', j.id);
  }
  fs.rmSync(tmp, { recursive: true, force: true });
} else {
  for (const j of todo) {
    const out = path.join(outDir, j.id + '.mp3');
    // pitch 負值偶爾 NoAudioReceived：失敗就把 pitch 往 0 靠近重試
    let pitch = pre.pitch, ok = false;
    for (let k = 0; k < 4 && !ok; k++) {
      try {
        execFileSync('uvx', ['edge-tts', '--voice', pre.v, `--rate=${pre.rate}`, `--pitch=${pitch >= 0 ? '+' : ''}${pitch}Hz`, '--text', j.say, '--write-media', out], { stdio: ['ignore', 'ignore', 'pipe'] });
        ok = fs.existsSync(out) && fs.statSync(out).size > 1000;
      } catch (e) { console.warn(`  ${j.id} 失敗（pitch ${pitch}Hz），重試`); }
      if (!ok) pitch = Math.trunc(pitch / 2);
    }
    if (!ok) { console.error('✗', j.id); process.exitCode = 1; continue; }
    mf.files[j.id] = { hash: hash(j.text) }; save(); console.log('✓', j.id, pitch !== pre.pitch ? `(pitch ${pitch}Hz)` : '');
  }
}
