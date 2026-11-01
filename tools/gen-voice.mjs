import {stations} from '../src/data.js';
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile,stat} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';
const args=process.argv.slice(2);if(args.includes('--help')){console.log('node tools/gen-voice.mjs [--limit N]：產生古文及白話的本機 VoxCPM 語音');process.exit(0)}
const i=args.indexOf('--limit'),limit=i<0?Infinity:Number(args[i+1]);if(!(limit>0))throw new Error('--limit 必須是正數');
const dir=resolve('public/voice'),work=resolve('review/voice-work');await mkdir(dir,{recursive:true});await mkdir(work,{recursive:true});
const fixes=[['傅說','傅悅'],['膠鬲','膠格'],['拂士','弼士'],['行拂','行弼'],['畎畝','犬畝'],['曾益','增益']];
const speak=text=>fixes.reduce((s,[from,to])=>s.replaceAll(from,to),text);
const jobs=stations.flatMap(s=>[{id:`${s.id}-y`,text:s.yuan,speed:1.1},...s.story.map((text,n)=>({id:`${s.id}-${n+1}`,text,speed:1.25}))]).map(j=>({...j,say:speak(j.text)}));
const file=resolve(dir,'manifest.json');let manifest={voice:'opuscar-tts-voxcpm',files:{}};try{manifest=JSON.parse(await readFile(file,'utf8'))}catch{}
const hash=j=>createHash('sha256').update(JSON.stringify([j.say,j.speed,'opuscar-tts-voxcpm'])).digest('hex');
const missing=[];for(const job of jobs){let exists=false;try{exists=(await stat(resolve(dir,job.id+'.mp3'))).size>1000}catch{}if(!exists||manifest.files[job.id]?.hash!==hash(job))missing.push(job)}
const pending=missing.slice(0,limit);console.log(`共 ${jobs.length} 段，待產生 ${missing.length} 段，本次 ${pending.length} 段`);if(!pending.length)process.exit(0);
await writeFile(resolve(work,'lines.json'),JSON.stringify(pending));const synth=spawnSync('opuscar-tts',[resolve(work,'lines.json'),work],{stdio:'inherit'});if(synth.status!==0)throw new Error('語音產生失敗；不登記未完成的音檔');
for(const job of pending){const output=resolve(dir,job.id+'.mp3');const ff=spawnSync('ffmpeg',['-y','-loglevel','error','-i',resolve(work,job.id+'.wav'),'-b:a','96k',output],{stdio:'inherit'});if(ff.status!==0)throw new Error(`轉檔失敗：${job.id}`);if((await stat(output)).size<=1000)throw new Error(`音檔大小異常：${job.id}`);manifest.files[job.id]={hash:hash(job),speed:job.speed};await writeFile(file,JSON.stringify(manifest,null,2)+'\n');console.log('完成',job.id)}
