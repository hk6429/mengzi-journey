// Run after npm run build and npm run dev. This checks the built site at port 8899.
// Required hook: __mengzi.riverInspect() returns live Three.js references
// {scene,islands:[{index,object,dock}],river,bridges,boat,character,
//  travel:{from,to,arrivals}}. arrivals counts completed trips, not requests.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const browser=await chromium.launch({headless:false});
const scores={s1:4,s2:3};
async function open(reducedMotion){
  const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,reducedMotion});
  await context.addInitScript(scores=>{
    localStorage.setItem('mengzi-journey-v1',JSON.stringify({station:0,mode:'gu',scores,visited:[]}));
    sessionStorage.setItem('mengzi-intro-seen','1');
  },scores);
  const page=await context.newPage();
  await page.goto('http://127.0.0.1:8899/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__mengzi);
  assert.equal(await page.evaluate(()=>typeof window.__mengzi.riverInspect),'function','缺少 riverInspect 實景 hook');
  return {context,page};
}
async function inspect(page){
  return page.evaluate(async()=>{
    const THREE=await import('three');
    const data=window.__mengzi.riverInspect();
    const attached=o=>{for(let n=o;n;n=n.parent)if(n===data.scene)return true;return false};
    const rendered=o=>{let found=false;o?.traverse(n=>{if(n.isMesh&&n.geometry?.attributes?.position?.count&&n.material){let visible=true;for(let p=n;p;p=p.parent)visible&&=p.visible;if(visible)found=true}});return found&&attached(o)};
    const pos=o=>o.getWorldPosition(new THREE.Vector3()).toArray();
    return {
      validScene:!!data.scene?.isScene,
      islands:data.islands.map(i=>({index:i.index,rendered:rendered(i.object),dock:attached(i.dock),position:pos(i.object),dockPosition:pos(i.dock)})),
      river:rendered(data.river),riverBox:new THREE.Box3().setFromObject(data.river).toArray?.() ?? (()=>{const b=new THREE.Box3().setFromObject(data.river);return [b.min.toArray(),b.max.toArray()]})(),
      bridges:data.bridges.map(rendered),boat:rendered(data.boat),character:rendered(data.character),
      boatPosition:pos(data.boat),characterPosition:pos(data.character),travel:{...data.travel}
    };
  });
}
const distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
async function verifyScores(page){assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('mengzi-journey-v1')).scores),scores,'旅行不可改變測驗成績')}
try{
  const {context,page}=await open('no-preference');
  const initial=await inspect(page);
  assert.ok(initial.validScene&&initial.river&&initial.boat&&initial.character,'河道、船與孟子須為附屬實景且有可見網格');
  assert.equal(initial.islands.length,6,'必須有六座實際島嶼');
  assert.deepEqual(initial.islands.map(i=>i.index),[0,1,2,3,4,5]);
  assert.equal(new Set(initial.islands.map(i=>i.position.join(','))).size,6,'六座島不可重疊');
  assert.ok(initial.islands.every(i=>i.rendered&&i.dock),'每座島及碼頭須附屬實景');
  assert.ok(initial.bridges.length>0&&initial.bridges.every(Boolean),'至少一座橋須有可見網格');
  const [min,max]=initial.riverBox;
  assert.ok(initial.islands.every(i=>i.dockPosition[0]>=min[0]&&i.dockPosition[0]<=max[0]&&i.dockPosition[2]>=min[2]&&i.dockPosition[2]<=max[2]),'河道範圍須涵蓋六座碼頭');
  for(let from=0;from<5;from++){
    const before=await inspect(page);
    assert.ok(distance(before.boatPosition,before.islands[from].dockPosition)<4,`第 ${from+1} 站船未停靠碼頭`);
    await page.evaluate(to=>window.__mengzi.go(to),from+1);
    await page.waitForFunction(()=>{const d=window.__mengzi.riverInspect();return d.character.position.distanceTo(d.boat.position)<1},{},{timeout:10000});
    const moving=await inspect(page);
    assert.equal(moving.travel.from,from);assert.equal(moving.travel.to,from+1);
    assert.ok(distance(moving.boatPosition,moving.characterPosition)<3,'孟子須搭乘船隻');
    if(from===1){
      await page.waitForFunction(n=>window.__mengzi.riverInspect().travel.arrivals===n,before.travel.arrivals+1,{timeout:20000});
    }else{
      await page.locator('#skipTravel').tap();
      await page.waitForFunction(n=>window.__mengzi.riverInspect().travel.arrivals===n,before.travel.arrivals+1);
    }
    const arrived=await inspect(page);
    assert.ok(distance(arrived.boatPosition,arrived.islands[from+1].dockPosition)<4,`第 ${from+2} 站船未抵達碼頭`);
    assert.equal(await page.evaluate(()=>window.__mengzi.state.station),from+1);
    await page.waitForTimeout(250);
    assert.equal((await inspect(page)).travel.arrivals,before.travel.arrivals+1,'每次旅行只能抵站一次');
    await verifyScores(page);
  }
  await context.close();
  const reduced=await open('reduce');
  const before=await inspect(reduced.page);
  await reduced.page.evaluate(()=>window.__mengzi.go(1));
  await reduced.page.waitForFunction(n=>window.__mengzi.riverInspect().travel.arrivals===n,before.travel.arrivals+1);
  await reduced.page.waitForTimeout(250);
  const after=await inspect(reduced.page);
  assert.equal(after.travel.arrivals,before.travel.arrivals+1,'減少動態須恰好抵站一次');
  assert.equal(await reduced.page.evaluate(()=>window.__mengzi.state.station),1);
  assert.ok(distance(after.boatPosition,after.islands[1].dockPosition)<4);
  await verifyScores(reduced.page);
  await reduced.context.close();
  console.log('通過：六島、河道、橋、船、各站停靠、觸控略過、一般航行、減少動態與成績保持。');
}finally{await browser.close()}
