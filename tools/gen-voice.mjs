// 朗讀產生器（大乃克隆聲 VoxCPM2，全域指令 opuscar-tts）：
//   node tools/gen-voice.mjs [--only <planetId>] [--limit N] [--dry]   產生缺的／文字改過的段
//   node tools/gen-voice.mjs --register                                 不錄音：把 public/voice/ 現有 mp3 依目前文字重新登記進 manifest
// 輸出 public/voice/<planetId>-<段號>.mp3（白話 1.25 倍速）、原文 <planetId>-y.mp3（1.1 倍速）與 manifest.json。
// 雜湊沿用第一版格式 sha256([say, speed, 'opuscar-tts-voxcpm'])：文字與念法都沒變就不重錄。
// ⚠️ 跑之前先 pgrep -fl -i voxcpm，有別的 VoxCPM 在跑就等，不可並行。
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import os from 'node:os';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
const root = path.resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);
const arg = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
if (args.includes('--help')) { console.log('node tools/gen-voice.mjs [--only <planetId>] [--limit N] [--dry] | --register'); process.exit(0); }
const only = arg('--only'), limit = Number(arg('--limit', Infinity)), VOICE = 'opuscar-tts-voxcpm';
const s = {}; vm.runInNewContext(fs.readFileSync(path.join(root, 'src/data.js'), 'utf8') + ';globalThis.D=DATA;', s);
// 破音字／罕用字改同音字給克隆聲念（只換整個詞，避免誤傷其他「說」「曾」）：
// 傅說ㄩㄝˋ、膠鬲ㄍㄜˊ、拂士ㄅㄧˋ（通「弼」）、行拂ㄈㄨˊ、畎ㄑㄩㄢˇ、曾益ㄗㄥ（通「增」）。依教育部重編國語辭典與國教院示例；
// 衡ㄏㄥˊ、徵ㄓㄥ、降ㄐㄧㄤˋ 本來就念常用音，不必換。改這張表會讓含這些詞的段落雜湊改變而重錄。
const SAY_AS = [['傅說', '傅悅'], ['膠鬲', '膠格'], ['拂士', '弼士'], ['行拂', '行弗'], ['畎畝', '犬畝'], ['曾益', '增益']];
const say = t => SAY_AS.reduce((x, [a, b]) => x.replaceAll(a, b), t);
const hash = j => crypto.createHash('sha256').update(JSON.stringify([j.say, j.speed, VOICE])).digest('hex');
const outDir = path.join(root, 'public/voice'); fs.mkdirSync(outDir, { recursive: true });
const mfPath = path.join(outDir, 'manifest.json');
let mf = { voice: VOICE, files: {} };
try { const old = JSON.parse(fs.readFileSync(mfPath, 'utf8')); if (old.voice === VOICE && old.files) mf = old; } catch {}
const jobs = [];
for (const p of s.D.planets) if (!only || p.id === only) {
  jobs.push({ id: `${p.id}-y`, text: p.yuan, speed: 1.1 }); // 古文模式朗讀原文
  p.story.forEach((t, i) => jobs.push({ id: `${p.id}-${i + 1}`, text: t, speed: 1.25 }));
}
jobs.forEach(j => { j.say = say(j.text); j.hash = hash(j); });
const has = j => { try { return fs.statSync(path.join(outDir, j.id + '.mp3')).size > 1000; } catch { return false; } };
const fresh = j => has(j) && mf.files[j.id] && mf.files[j.id].hash === j.hash;
const save = () => fs.writeFileSync(mfPath, JSON.stringify(mf, null, 2) + '\n');
if (args.includes('--register')) {
  // 只保留「mp3 在、且舊紀錄的雜湊等於目前文字」的段；其餘列出來待重錄
  const files = {}, stale = [];
  for (const j of jobs) (fresh(j) ? files[j.id] = { hash: j.hash, speed: j.speed } : stale.push(j.id));
  mf = { voice: VOICE, files: only ? { ...mf.files, ...files } : files }; save();
  console.log(`登記 ${Object.keys(files).length} 段；需重錄 ${stale.length} 段${stale.length ? '：' + stale.join(' ') : ''}`);
  process.exit(0);
}
const todo = jobs.filter(j => !fresh(j)).slice(0, limit);
console.log(`共 ${jobs.length} 段，需產生 ${todo.length} 段${todo.length ? '：' + todo.map(j => j.id).join(' ') : ''}`);
if (!todo.length || args.includes('--dry')) process.exit(0);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mengzi-voice-'));
fs.writeFileSync(path.join(tmp, 'lines.json'), JSON.stringify(todo.map(({ id, text, say, speed }) => ({ id, text, say, speed }))));
execFileSync('opuscar-tts', [path.join(tmp, 'lines.json'), path.join(tmp, 'out')], { stdio: 'inherit' });
for (const j of todo) {
  const out = path.join(outDir, j.id + '.mp3');
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', path.join(tmp, 'out', j.id + '.wav'), '-b:a', '96k', out]);
  if (!has(j)) throw new Error('音檔大小異常：' + j.id);
  mf.files[j.id] = { hash: j.hash, speed: j.speed }; save(); console.log('✓', j.id);
}
fs.rmSync(tmp, { recursive: true, force: true });
