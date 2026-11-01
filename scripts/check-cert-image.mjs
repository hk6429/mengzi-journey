import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {stations} from '../src/data.js';
const b=await chromium.launch({headless:false});
try{
 const p=await b.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
 await p.addInitScript(ids=>{localStorage.setItem('mengzi-journey-v1',JSON.stringify({station:4,mode:'bai',name:'證書驗收',scores:Object.fromEntries(ids.map(id=>[id,3])),visited:[]}));sessionStorage.setItem('mengzi-intro-seen','1');localStorage.removeItem('mengzi-journey-v1-images')},stations.map(s=>s.id));
 await p.goto('http://127.0.0.1:8899/');await p.waitForFunction(()=>window.__mengzi?.riverInspect()?.scene);
 await p.evaluate(()=>window.__mengzi.riverInspect().character.updateMatrixWorld(true));
 const before=await p.evaluate(()=>({state:JSON.stringify(window.__mengzi.state),hero:window.__mengzi.riverInspect().character.position.toArray(),boat:window.__mengzi.riverInspect().boat.position.toArray()}));
 await p.click('#certificate');await p.waitForFunction(()=>!document.querySelector('#certForm').hidden,{},{timeout:60000});
 const images=await p.evaluate(()=>JSON.parse(localStorage.getItem('mengzi-journey-v1-images')));
 assert.deepEqual(Object.keys(images).sort(),stations.map(s=>s.id).sort());assert.equal(new Set(Object.values(images)).size,6,'六張場景圖應各不相同');
 const imageSizes=await p.evaluate(async images=>Promise.all(Object.values(images).map(src=>new Promise(resolve=>{const i=new Image();i.onload=()=>resolve([i.naturalWidth,i.naturalHeight]);i.src=src}))),images);assert.ok(imageSizes.every(([w,h])=>w===520&&h===245));
 assert.equal(await p.evaluate(()=>JSON.stringify(window.__mengzi.state)),before.state,'截圖不可變更進度');
 assert.deepEqual(await p.evaluate(()=>window.__mengzi.riverInspect().character.position.toArray()),before.hero,'主角位置須復原');
 assert.deepEqual(await p.evaluate(()=>window.__mengzi.riverInspect().boat.position.toArray()),before.boat,'船位置須復原');
 await mkdir('review/certificates',{recursive:true});
 for(const [button,name] of [['#certGu','gu'],['#certBai','bai']]){await p.click(button);await p.waitForFunction(()=>{const i=document.querySelector('#certImage');return i.complete&&i.naturalWidth===2480&&i.naturalHeight===1754});const src=await p.locator('#certImage').getAttribute('src');await writeFile(`review/certificates/${name}.png`,Buffer.from(src.split(',')[1],'base64'))}
 await p.reload();await p.waitForFunction(()=>window.__mengzi);assert.equal(await p.locator('#progress').innerText(),'★');await p.click('#certificate');await p.waitForFunction(()=>!document.querySelector('#certForm').hidden);assert.equal(await p.locator('#certName').inputValue(),'證書驗收');
 console.log('通過：未拜訪六站也可產生六張完整比例場景圖、兩版 A4 證書、成績與姓名保留、重開可領。');
}finally{await b.close()}
