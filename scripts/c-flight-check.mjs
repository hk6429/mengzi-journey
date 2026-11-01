// node scripts/c-flight-check.mjs [基底網址=http://127.0.0.1:8885/]
// 生於憂患：大河六座河中島＋浮標航道＋木棧碼頭＋扁舟。檢查：全景（沒有 pano 時退回淡彩漸層，404 不算錯）、拖曳限制（360 方位、仰角 5–60°、縮放上下限）、
//         平時扁舟停在碼頭、逐站搭船（board→mount→sail→off→walk，全程 5–9 秒，主角坐在船上，天空交疊，走過的航道浮標點燈，截圖）、
//         鏡頭角速度（峰值 <90°/s）與上下不甩、到站鏡頭（+z 仰角 11°）、Esc 略過、
//         focusEl 從元素外側看＋走到旁邊 emit('walked')、hover／點選 pick、goHome 暮色鳥瞰＋朱印「憂患」、手機 390×844 跟拍船不出畫面、console 零錯誤
import { chromium } from 'playwright';
const base = process.argv[2] || 'http://127.0.0.1:8885/';
const b = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu'] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && !/status of 404/.test(m.text()) && errs.push(m.text()));   // pano 還沒生出來的 404 屬預期
const fail = m => { console.error('失敗：' + m); process.exitCode = 1; };
await p.goto(base + '?planet=fields'); await p.waitForFunction(() => window.__booted, null, { timeout: 30000 }); await p.waitForTimeout(1500);
await p.evaluate(() => { window.__log = []; ['arrive', 'flight', 'pick', 'home', 'walked'].forEach(n => __ctx.on(n, e => __log.push([n, e])));
  // 角速度：每幀鏡頭視線方向（quaternion × -z）與上一幀的夾角 ÷ dt；只在飛渡中記
  window.__ang = []; let prev = null;
  __ctx.onFrame.push(dt => { const c = __ctx.camera, d = c.position.clone().set(0, 0, -1).applyQuaternion(c.quaternion);
    const f = __log.filter(e => e[0] === 'flight').pop()?.[1];
    if (__ctx.flying && prev && dt > 0) __ang.push([f ? f.t : 0, f ? f.phase : '', prev.angleTo(d) * 180 / Math.PI / dt, (c.position.y - prev.y0) / dt]);
    prev = __ctx.flying ? Object.assign(d, { y0: c.position.y }) : null; });
});
const arrived = id => p.waitForFunction(i => __log.some(e => e[0] === 'arrive' && e[1].id === i), id, { timeout: 30000 }).catch(() => fail('沒收到 arrive ' + id));
const ids = await p.evaluate(() => __ctx.planets.map(q => q.id));
const camInfo = () => p.evaluate(() => { const c = __ctx.camera.position, t = __ctx.controls.target, d = c.clone().sub(t);
  return { el: Math.asin(d.y / d.length()) * 180 / Math.PI, az: Math.atan2(d.x, d.z) * 180 / Math.PI, dist: d.length() }; });
const sky = await p.evaluate(() => __ctx.skyState());
console.log('全景', JSON.stringify(sky));
const hasPano = sky.loaded.includes('fields');
if (sky.a !== 'fields') fail('起站天空狀態不對');
if (!hasPano) console.log('（public/pano/fields.jpg 還沒有：退回淡彩漸層）');
const boatAt = id => p.evaluate(i => { const bt = __ctx.scene.getObjectByName('boat'), g = __ctx.planetById.get(i), d = g.isle.userData.dock;
  const m = g.group.position.clone().add(d.end), r = Math.hypot(bt.position.x - g.group.position.x, bt.position.z - g.group.position.z);
  return { vis: bt.visible, r, toDock: Math.hypot(bt.position.x - m.x, bt.position.z - m.z) }; }, id);
const idle = await boatAt('fields'); console.log('扁舟待機', JSON.stringify(idle));
if (!idle.vis || idle.toDock > 2.2 || idle.r < 5) fail('平時扁舟應停在碼頭外端（島外水面）');
const lim = await p.evaluate(() => { const c = __ctx.controls, k = 180 / Math.PI; return { az: [c.minAzimuthAngle, c.maxAzimuthAngle], el: [90 - c.maxPolarAngle * k, 90 - c.minPolarAngle * k].map(Math.round), d: [c.minDistance, c.maxDistance] }; });
console.log('拖曳限制', JSON.stringify(lim));
if (lim.az[0] !== -Infinity || lim.az[1] !== Infinity) fail('方位應不設限（360 度）');
if (lim.el.join() !== '5,60') fail('仰角應為 5–60°');
if (!(lim.d[0] >= 2 && lim.d[1] <= 60)) fail('縮放應有上下限');
// 360：把鏡頭轉到島的背面，controls.update 後不應被夾回前方
const back = await p.evaluate(() => { const c = __ctx.camera, t = __ctx.controls.target, d = c.position.distanceTo(t), e = 0.4; c.position.set(t.x, t.y + d * Math.sin(e), t.z - d * Math.cos(e)); __ctx.controls.update(); const v = c.position.clone().sub(t); return Math.atan2(v.x, v.z) * 180 / Math.PI; });
if (Math.abs(Math.abs(back) - 180) > 2) fail('轉到背面被夾回 ' + back);
await p.waitForTimeout(400); await p.screenshot({ path: 'review/c-back-fields.png' });
const angAll = [];
for (const to of ids.slice(1)) {
  const from = await p.evaluate(() => __ctx.current);
  await p.evaluate(() => { __log.length = 0; __ang.length = 0; });
  await p.evaluate(i => __ctx.goPlanet(i), to);
  // 依序應經過 board → mount → sail → off → walk；航行一半時截圖、檢查主角坐在船上
  await p.waitForFunction(() => { const f = __log.filter(e => e[0] === 'flight').pop()?.[1]; return f && f.t > 0.5 && f.phase === 'sail'; }, null, { timeout: 30000 }).catch(() => fail(to + ' 沒航行到一半'));
  const mid = await p.evaluate(() => { const h = __ctx.scene.getObjectByName('hero'), c = __ctx.scene.getObjectByName('boat'), s = c.userData.seat.getWorldPosition(c.position.clone()), hp = h.getWorldPosition(c.position.clone());
    return { flying: __ctx.flying, ...__log.filter(e => e[0] === 'flight').pop()?.[1], fs: __ctx.flightState(), sky: __ctx.skyState(), inScene: h.parent === __ctx.scene, seat: hp.distanceTo(s) }; });
  await p.screenshot({ path: `review/c-sail-${to}.png` });
  if (!mid.flying || mid.type !== 'boat' || mid.phase !== 'sail') fail(`${to} 應為搭船航行（sail），實際 ${JSON.stringify(mid)}`);
  if (!(mid.fs.dur >= 5 && mid.fs.dur <= 9)) fail(`${to} 全程應 5–9 秒 ${JSON.stringify(mid.fs)}`);
  if (!mid.inScene || mid.seat > 0.9) fail(`${to} 航行中主角應坐在船上（離座位 ${mid.seat?.toFixed(2)}）`);
  if (!(mid.sky.a === from && mid.sky.b === to && mid.sky.mix > 0.2)) fail(`${to} 中途天空應交疊淡入 ${JSON.stringify(mid.sky)}`);
  const t0 = Date.now(); await arrived(to);
  await p.waitForTimeout(700);
  const st = await p.evaluate(i => { const h = __ctx.scene.getObjectByName('hero'); return { cur: __ctx.current, par: h.parent === __ctx.planetById.get(i).group, x: h.position.x, z: h.position.z, sky: __ctx.skyState() }; }, to);
  const c = await camInfo();
  const av = await p.evaluate(() => { const a = __ang.map(x => x[2]).sort((x, y) => x - y), pk = __ang.reduce((m, x) => (x[2] > m[2] ? x : m), [0, '', 0]);
    const phases = [...new Set(__log.filter(e => e[0] === 'flight').map(e => e[1].phase))];
    const by = {}; __ang.forEach(([, ph, v]) => { by[ph] = Math.max(by[ph] || 0, v); });
    let flips = 0, sg = 0; __ang.forEach(x => { const v = x[3]; if (Math.abs(v) < 0.4) return; const s2 = Math.sign(v); if (sg && s2 !== sg) flips++; sg = s2; }); // 鏡頭高度速度換向（上下甩）
    return { peak: pk[2], at: pk[0], ph: pk[1], p95: a[Math.floor(a.length * 0.95)] || 0, n: a.length, phases, by, flips, vy: Math.max(...__ang.map(x => Math.abs(x[3]))) }; });
  angAll.push([from + '→' + to, av]);
  console.log(to, '飛渡中 t=', mid.t.toFixed(2), '天空交疊', mid.sky.mix.toFixed(2), '鏡頭', c.el.toFixed(1) + '°', c.az.toFixed(1) + '°', c.dist.toFixed(1), '剩', Date.now() - t0, 'ms',
    '| 角速度峰值', av.peak.toFixed(1) + '°/s（t=' + av.at.toFixed(2) + ' ' + av.ph + '）p95', av.p95.toFixed(1), '各段峰值', JSON.stringify(Object.fromEntries(Object.entries(av.by).map(([k, v]) => [k, +v.toFixed(1)]))), '| 鏡頭上下換向', av.flips, '次 最大垂直速度', av.vy.toFixed(2));
  await p.screenshot({ path: `review/c-station-${to}.png` });
  if (av.phases.join() !== 'board,mount,sail,off,walk') fail(to + ' 搭船階段不對 ' + av.phases.join());
  const lit = await p.evaluate(() => __ctx.litLanes()); if (!lit.length) fail(to + ' 走過的航道浮標沒點燈');
  if (av.flips > 2) fail(`${to} 鏡頭上下甩（高度速度換向 ${av.flips} 次）`);
  if (av.peak >= 90) fail(`${to} 鏡頭角速度峰值 ${av.peak.toFixed(1)}°/s ≥ 90`);
  if (st.cur !== to || !st.par || Math.abs(st.x) > 0.05 || Math.abs(st.z - 2.6) > 0.05) fail(to + ' 主角站位不對 ' + JSON.stringify(st));
  if (st.sky.a !== to || (hasPano && !st.sky.loaded.includes(to))) fail(to + ' 到站天空不對 ' + JSON.stringify(st.sky));
  const fa = await boatAt(to); if (fa.toDock > 2.2) fail(to + ' 到站後扁舟應停在碼頭 ' + JSON.stringify(fa));
  if (Math.abs(c.el - 11) > 1.5 || Math.abs(c.az) > 1) fail(`${to} 到站鏡頭應從 +z 仰角 11°（第三輪 art 2），實際 ${c.el.toFixed(1)}° 方位 ${c.az.toFixed(1)}°`);
}
const worst = angAll.reduce((m, x) => (x[1].peak > m[1].peak ? x : m));
console.log('全程鏡頭角速度峰值', worst[1].peak.toFixed(1) + '°/s（' + worst[0] + '，' + worst[1].ph + '）；各趟 p95 最大', Math.max(...angAll.map(x => x[1].p95)).toFixed(1) + '°/s');
console.log('點燈航道', JSON.stringify(await p.evaluate(() => __ctx.litLanes())));
const t0 = Date.now();
await p.evaluate(() => { __log.length = 0; __ctx.goPlanet('study'); }); await p.waitForTimeout(300); await p.keyboard.press('Escape');
await arrived('study'); console.log('Esc 略過用時', Date.now() - t0, 'ms'); if (Date.now() - t0 > 3000) fail('Esc 沒有立即略過');
await p.evaluate(() => { __log.length = 0; __ctx.goPlanet('city'); }); await p.waitForTimeout(300); await p.keyboard.press('Escape'); await arrived('city');
// 塞一個假的元素在島的左後方測 focusEl（從元素外側看、主角走過去 → walked）與 hover／點選 pick
await p.waitForTimeout(500);
await p.evaluate(() => {
  const g = __ctx.planetById.get('city').group, s = __ctx.scene.getObjectByName('seal'), m = new s.constructor(s.geometry, s.material.clone());
  m.material.opacity = 1; m.material.side = 2; m.visible = true; m.scale.setScalar(0.08); m.position.set(-3.2, 2.2, -2.6);
  m.userData.pick = { planet: 'city', el: 'fake' }; g.add(m); window.__fake = m;
  __log.length = 0; __ctx.focusEl('city', 'fake');
});
await p.waitForFunction(() => __log.some(e => e[0] === 'walked' && e[1].el === 'fake'), null, { timeout: 4500 }).catch(() => fail('focusEl 後 4.5 秒內沒有 walked'));
await p.waitForTimeout(1500);
const fc = await camInfo(); console.log('特寫鏡頭', fc.el.toFixed(1) + '°', '方位', fc.az.toFixed(1) + '°', fc.dist.toFixed(1));
const outward = await p.evaluate(() => { const g = __ctx.planetById.get('city').group, c = __ctx.camera.position.clone().sub(g.position).setY(0).normalize(), e = __fake.position.clone().setY(0).normalize(); return c.dot(e); });
console.log('特寫鏡頭方向 · 元素外側方向 =', outward.toFixed(2));
if (fc.el < 5 || fc.el > 60.5) fail('特寫鏡頭仰角超出 5–60°'); if (outward < 0.3) fail('特寫應從元素外側看');
await p.screenshot({ path: 'review/c-focus.png' });
const xy = await p.evaluate(() => { const v = __fake.getWorldPosition(__fake.position.clone()).project(__ctx.camera); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; });
await p.mouse.move(xy[0], xy[1]); await p.waitForTimeout(100);
const cursor = await p.evaluate(() => __ctx.renderer.domElement.style.cursor);
await p.mouse.click(xy[0], xy[1]); await p.waitForTimeout(100);
const picked = await p.evaluate(() => __log.find(e => e[0] === 'pick')?.[1]);
console.log('特寫元素螢幕座標', xy.map(Math.round), '游標', cursor, 'pick', picked);
if (cursor !== 'pointer' || !picked || picked.el !== 'fake') fail('hover／pick 不對');
await p.evaluate(() => { __fake.parent.remove(__fake); __ctx.focusEl('city', null); }); await p.waitForTimeout(2500);
// 結尾：暮色鳥瞰整條大河、蓋朱印，emit('home')
await p.evaluate(() => { __log.length = 0; __ctx.goHome(); });
await p.waitForFunction(() => __log.some(e => e[0] === 'home'), null, { timeout: 30000 }).catch(() => fail('沒收到 home'));
const st = await p.evaluate(() => ({ cur: __ctx.current, flying: __ctx.flying, seal: __ctx.scene.getObjectByName('seal').visible }));
console.log('結尾後', st);
if (st.cur !== 'city' || st.flying || !st.seal) fail('結尾後狀態不對 ' + JSON.stringify(st));
await p.waitForTimeout(1200); await p.screenshot({ path: 'review/c-ending.png' });
const sealPx = await p.evaluate(() => { const s = __ctx.scene.getObjectByName('seal'), V = s.position.constructor, w = s.geometry.parameters.width / 2, a = s.localToWorld(new V(-w, 0, 0)).project(__ctx.camera), c = s.localToWorld(new V(w, 0, 0)).project(__ctx.camera); return (c.x - a.x) / 2 * innerWidth; });
const inView = await p.evaluate(() => __ctx.planets.every(q => { const v = q.group.position.clone().project(__ctx.camera); return Math.abs(v.x) < 1 && Math.abs(v.y) < 1; }));
console.log('朱印寬', Math.round(sealPx), 'px', '六座島都在畫面內', inView); if (sealPx < 60) fail('朱印太小'); if (!inView) fail('結尾應看得到六座島');
await p.evaluate(() => __ctx.overview()); await p.waitForTimeout(2200);
await p.screenshot({ path: 'review/c-overview.png' });
const dusk = await p.evaluate(() => __ctx.scene.getObjectByName('sky').material.uniforms.uDusk.value); console.log('夕陽', dusk.toFixed(2)); if (dusk < 0.5) fail('結尾應是夕陽');
// 手機 390×844：總覽、航行途中（船要一直在畫面內）、到站
{ const m = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  m.on('pageerror', e => errs.push('[手機] ' + e.message)); m.on('console', x => x.type() === 'error' && !/status of 404/.test(x.text()) && errs.push('[手機] ' + x.text()));
  await m.goto(base + '?planet=road'); await m.waitForFunction(() => window.__booted, null, { timeout: 30000 }); await m.waitForTimeout(1500);
  await m.evaluate(() => __ctx.overview()); await m.waitForTimeout(2400); await m.screenshot({ path: 'review/c-m-overview.png' });
  await m.evaluate(() => __ctx.goPlanet('road')); await m.waitForTimeout(2600);
  await m.evaluate(() => { window.__mlog = []; window.__out = 0; window.__nf = 0;
    __ctx.on('flight', e => __mlog.push(e)); __ctx.on('arrive', e => __mlog.push({ arrive: e.id }));
    __ctx.onFrame.push(() => { const f = __mlog[__mlog.length - 1]; if (!f || f.phase !== 'sail') return; __nf++;
      const v = __ctx.scene.getObjectByName('boat').position.clone().project(__ctx.camera); if (Math.abs(v.x) > 0.92 || Math.abs(v.y) > 0.92 || v.z > 1) __out++; });
    __ctx.goPlanet('bridge'); });
  await m.waitForFunction(() => __mlog.some(e => e.t > 0.45 && e.phase === 'sail'), null, { timeout: 20000 }); await m.screenshot({ path: 'review/c-m-sail.png' });
  await m.waitForFunction(() => __mlog.some(e => e.arrive === 'bridge'), null, { timeout: 20000 }); await m.waitForTimeout(800); await m.screenshot({ path: 'review/c-m-station.png' });
  const mo = await m.evaluate(() => [__out, __nf]); console.log('手機跟拍：船出畫面', mo[0], '/', mo[1], '幀');
  if (mo[0] > 0 || mo[1] < 10) fail('手機跟拍時船跑出畫面');
  await m.close(); }
console.log(errs.length ? '錯誤：\n' + errs.join('\n') : '（無 console 錯誤）');
if (errs.length) process.exitCode = 1;
await b.close();
