import assert from 'node:assert/strict';
import {readFile,stat,mkdir,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {stations} from '../src/data.js';
import {speak} from '../tools/voice-text.mjs';
import {createHash} from 'node:crypto';
const manifest=JSON.parse(await readFile('public/voice/manifest.json','utf8'));
const jobs=stations.flatMap(s=>[{id:`${s.id}-y`,text:s.yuan,speed:1.1},...s.story.map((text,i)=>({id:`${s.id}-${i+1}`,text,speed:1.25}))]),ids=jobs.map(j=>j.id),results=[];
assert.equal(new Set(ids).size,36);
for(const {id,text,speed} of jobs){
 const file=`public/voice/${id}.mp3`;assert.ok((await stat(file)).size>1000,id);assert.match(manifest.files[id]?.hash||'',/^[a-f0-9]{64}$/,id);
 assert.equal(manifest.files[id].hash,createHash('sha256').update(JSON.stringify([speak(text),speed,'opuscar-tts-voxcpm'])).digest('hex'),`${id} 文字或讀音版本不符`);
 const probe=spawnSync('ffprobe',['-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',file],{encoding:'utf8'});assert.equal(probe.status,0,id);const seconds=Number(probe.stdout);assert.ok(seconds>1&&seconds<90,`${id} 時長 ${seconds}`);
 const decode=spawnSync('ffmpeg',['-hide_banner','-i',file,'-af','volumedetect','-f','null','-'],{encoding:'utf8'});assert.equal(decode.status,0,`${id} 解碼`);const max=Number(decode.stderr.match(/max_volume: (-?[\d.]+) dB/)?.[1]);assert.ok(Number.isFinite(max)&&max>-40,`${id} 音量 ${max}`);results.push({id,seconds,maxVolumeDb:max});
}
await mkdir('review',{recursive:true});await writeFile('review/voice-audit.json',JSON.stringify(results,null,2));console.log(`通過：${results.length} 段 MP3、manifest、解碼、時長與音量；尚未人工聽讀。`);
