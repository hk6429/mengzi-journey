import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {stations} from '../src/data.js';
const browser=await chromium.launch({headless:false});
const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try {
  await page.goto('http://127.0.0.1:8899/',{waitUntil:'domcontentloaded'}); await page.waitForFunction(()=>window.__mengzi);if(await page.locator('#intro').isVisible())await page.click('#startJourney');
  const progress=()=>page.locator('#progress').innerText();
  async function answer(station,correct){
    await page.click('#quizButton');
    for(let i=0;i<5;i++){
      const [q,choices,a]=stations[station].quiz[i]; const answer=choices[i<correct?a:(a+1)%4];
      const field=page.locator('.question').nth(i); assert.equal(await field.locator('legend').innerText(),`${i+1}. ${q}`);
      await field.locator('label').filter({hasText:answer}).locator('input').check();
    }
    await page.click('#submitQuiz');const result=await page.locator('#result h3').innerText();assert.match(result,new RegExp(`答對 ${correct} / 5`));await page.click('#closeQuiz');
  }
  await page.click('#vernacular');assert.equal(await page.locator('#nextStation').isDisabled(),true);for(let i=0;i<4;i++)await page.click('#next');assert.equal(await page.locator('#nextStation').isEnabled(),true);await page.click('#classical');
  await page.click('#quizButton');await page.click('#submitQuiz');assert.match(await page.locator('#result').innerText(),/請先完成/);await page.click('#closeQuiz');
  await answer(0,2);assert.equal(await progress(),'0/6');await answer(0,3);assert.equal(await progress(),'1/6');await answer(0,2);assert.equal(await progress(),'1/6');
  await page.reload();await page.waitForFunction(()=>window.__mengzi);assert.equal(await progress(),'1/6');
  await page.click('#nextStation');assert.equal(await progress(),'1/6');
  for(let i=1;i<6;i++){await answer(i,3);if(i<5)await page.click('#nextStation')}
  assert.equal(await progress(),'★');await page.click('#certificate');await page.waitForFunction(()=>!document.querySelector('#certForm').hidden);assert.equal(await page.locator('#certForm').isVisible(),true);await page.fill('#certName','測試');await page.click('#certBai');await page.waitForFunction(()=>document.querySelector('#certImage').naturalWidth===2480);assert.match(await page.locator('#certImage').getAttribute('src'),/^data:image\/png/);await page.waitForFunction(()=>document.querySelector('#certImage').naturalWidth===2480);const dimensions=await page.locator('#certImage').evaluate(i=>({w:i.naturalWidth,h:i.naturalHeight}));assert.deepEqual(dimensions,{w:2480,h:1754});await page.locator('#cert form button').click();
  await page.reload();await page.waitForFunction(()=>window.__mengzi);assert.equal(await progress(),'★');await page.click('#certificate');assert.equal(await page.locator('#certName').inputValue(),'測試');await page.click('#certGu');await page.waitForFunction(()=>document.querySelector('#certImage').naturalWidth===2480);assert.match(await page.locator('#certImage').getAttribute('src'),/^data:image\/png/);
  assert.deepEqual(errors,[]);console.log('通過：白話到段尾可前往、未答完、2/5、3/5、重考最佳分、拜訪不計完成、六站及重開、兩版證書 2480×1754。');
} finally {await browser.close()}
