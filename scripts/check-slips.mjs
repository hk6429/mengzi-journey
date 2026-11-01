import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const b=await chromium.launch({headless:false});
try{
 const p=await b.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
 await p.addInitScript(()=>sessionStorage.setItem('mengzi-intro-seen','1'));
 await p.goto('http://127.0.0.1:8899/');
 await p.waitForFunction(()=>{let count=0;window.__mengzi?.riverInspect()?.scene.traverse(o=>{if(o.userData.asset==='bamboo-slips')count++});return count===2},{},{timeout:60000});
 const sizes=await p.evaluate(async()=>{const T=await import('three'),sizes=[];window.__mengzi.riverInspect().scene.traverse(o=>{if(o.userData.asset==='bamboo-slips'){const size=new T.Box3().setFromObject(o).getSize(new T.Vector3());sizes.push(size.toArray())}});return sizes});
 assert.ok(sizes.every(([x,y,z])=>Math.max(x,z)<=1.36&&y>0),'竹簡須符合書案尺寸');
 for(const [station,name] of [[3,'竹簡與方法'],[4,'書案與竹簡']]){await p.evaluate(i=>window.__mengzi.go(i),station);await p.locator('#storyPanel').evaluate(el=>el.open=true);await p.getByRole('button',{name,exact:true}).click();await p.locator('#storyPanel').evaluate(el=>el.open=false);await p.screenshot({path:`review/scenes/slips-station-${station+1}.png`})}
 console.log('通過：第四、五站已載入真實竹簡模型，尺寸符合書案，已截圖。');
}finally{await b.close()}
