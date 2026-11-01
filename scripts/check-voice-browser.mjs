import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const b=await chromium.launch({headless:false});
try{
 const p=await b.newPage();await p.goto('http://127.0.0.1:8899/audio-review.html');
 assert.equal(await p.locator('audio').count(),36);
 const clips=await p.evaluate(()=>Promise.all([...document.querySelectorAll('audio')].map(a=>new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error(a.src)),15000);a.onloadedmetadata=()=>{clearTimeout(timeout);resolve({src:a.src,duration:a.duration})};a.onerror=()=>{clearTimeout(timeout);reject(Error(a.src))};a.load()}))));
 assert.ok(clips.every(c=>Number.isFinite(c.duration)&&c.duration>1));
 await p.locator('h1').click();await p.evaluate(async()=>{const a=document.querySelector('audio');await a.play();if(a.paused)throw Error('無法開始播放');a.pause()});
 console.log('通過：瀏覽器載入 36 段音訊中繼資料，首段可啟動播放；不代表人工聽讀。');
}finally{await b.close()}
