import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
import {landmarks} from '../src/landmarks.js';
const shots=process.argv.includes('--shots');
await mkdir('review/scenes',{recursive:true});
const browser=await chromium.launch({headless:false});
try {
  for(const [width,height] of (shots?[[390,844],[1440,900]]:[[390,844],[844,390],[768,1024],[1440,900]])){
    const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'});
    await context.addInitScript(()=>sessionStorage.setItem('mengzi-intro-seen','1'));
    const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:8899/');await page.waitForFunction(()=>window.__mengzi?.riverInspect()?.scene);
    await page.waitForTimeout(1500);
    for(let station=0;station<6;station++){
      await page.evaluate(i=>window.__mengzi.go(i),station);
      await page.locator('#storyPanel').evaluate(el=>el.open=false);
      await page.waitForTimeout(150);
      await page.screenshot({path:`review/scenes/${width}-${height}-station-${station+1}.png`});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`水平溢出 ${width} 第${station+1}站`);
      if(shots)for(const item of landmarks[station]){
        await page.locator('#storyPanel').evaluate(el=>el.open=true);
        await page.getByRole('button',{name:item.name,exact:true}).click();
        await page.locator('#storyPanel').evaluate(el=>el.open=false);
        await page.waitForTimeout(150);
        const heroInFrame=await page.evaluate(async()=>{const T=await import('three');const d=window.__mengzi.riverInspect();const box=new T.Box3().setFromObject(d.character);for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){const p=new T.Vector3(x,y,z).project(d.camera);if(Math.abs(p.x)>.98||Math.abs(p.y)>.98||Math.abs(p.z)>1)return false}return true});
        assert.ok(heroInFrame,`${width} 第${station+1}站 ${item.id} 主角超出畫面`);
        await page.screenshot({path:`review/scenes/${width}-${height}-station-${station+1}-${item.id}.png`});
      }
    }
    await page.locator('#overview').click();assert.ok(await page.locator('#storyPanel').evaluate(el=>el.getBoundingClientRect().height<85),'收合閱讀面板不應遮住場景');await page.screenshot({path:`review/scenes/${width}-${height}-overview.png`});
    assert.deepEqual(errors,[],`${width} JS錯誤`);await context.close();console.log(`通過 ${width}×${height}：六站與全景`);
  }
} finally {await browser.close()}
