// D 線第五輪：三種尺寸逐站截圖＋量測（面板蓋住主角／島心、按鈕 <44px、最小字級）
// node scripts/d-station-shots.mjs [網址=http://127.0.0.1:8824/]  → review/shots/r5-d/<尺寸>-<站>.png
import { chromium } from 'playwright';
import fs from 'node:fs';
const base = process.argv[2] || 'http://127.0.0.1:8824/';
const dir = 'review/shots/r5-d'; fs.mkdirSync(dir, { recursive: true });
const b = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu'] });
const errs = [], rows = [];
for (const [w, h, n] of [[390, 844, 'phone'], [844, 390, 'land'], [820, 1180, 'pad']]) {
  const c = await b.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const p = await c.newPage(); p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.goto(base + '?planet=baihua'); await p.waitForFunction(() => window.__booted, null, { timeout: 30000 });
  const ids = await p.evaluate(() => window.__ctx.planets.map(x => x.id));
  for (const id of ids) {
    await p.evaluate(i => { window.__ctx.goPlanet(i); setTimeout(() => window.__ctx.skipFlight?.(), 300); }, id);
    await p.waitForFunction(i => window.__ctx.current === i && !window.__ctx.flying, id, { timeout: 60000 });
    await p.waitForTimeout(2600);
    await p.screenshot({ path: `${dir}/${n}-${id}.png` });
    rows.push(n + ' ' + id + ' ' + JSON.stringify(await p.evaluate(measure)));
  }
  // 總覽：面板要收起、viewInsets 只剩頂列
  await p.click('#ui-overview'); await p.waitForTimeout(2600);
  await p.screenshot({ path: `${dir}/${n}-overview.png` });
  rows.push(n + ' overview ' + JSON.stringify(await p.evaluate(() => ({ ins: window.__ctx.viewInsets, collapsed: document.getElementById('ui-card').classList.contains('is-collapsed') }))));
  await c.close();
}
function measure() {
  const x = window.__ctx, cam = x.camera, P = x.planets.find(q => q.id === x.current);
  const scr = v => { const q = v.clone().project(cam); return [Math.round((q.x + 1) / 2 * innerWidth), Math.round((1 - q.y) / 2 * innerHeight)]; };
  const at = (lx, ly, lz) => P.group.localToWorld(cam.position.clone().set(lx, ly, lz));
  const hero = scr(at(0, 0.8, 2.6)), mid = scr(at(0, 1.2, 0));
  const panels = ['ui-card', 'ui-el', 'ui-route', 'ui-quiz'].map(i => document.getElementById(i)).filter(e => e && !e.hidden && e.offsetWidth)
    .concat([...document.querySelectorAll('.ui-top')]).map(e => e.getBoundingClientRect());
  const hit = ([sx, sy]) => panels.some(r => sx >= r.left && sx <= r.right && sy >= r.top && sy <= r.bottom);
  const small = [...document.querySelectorAll('#ui button, #ui input, #ui a, #ui label')].filter(e => { const r = e.getBoundingClientRect(); return r.width && r.height && getComputedStyle(e).visibility !== 'hidden' && !e.closest('[hidden]') && (r.width < 44 || r.height < 44) && !e.closest('p, .ui-para, #ui-el-desc, #ui-yuan-txt'); })
    .map(e => (e.id || e.className || e.tagName) + ':' + Math.round(e.getBoundingClientRect().width) + 'x' + Math.round(e.getBoundingClientRect().height));
  let minF = 99, minWho = '';
  document.querySelectorAll('#ui-card *').forEach(e => { if (!e.offsetWidth || ![...e.childNodes].some(t => t.nodeType === 3 && t.textContent.trim())) return; const f = parseFloat(getComputedStyle(e).fontSize); if (f < minF) { minF = f; minWho = e.id || e.className || e.tagName; } });
  return { hero, heroCovered: hit(hero), mid, midCovered: hit(mid), ins: x.viewInsets, small, minF, minWho };
}
fs.writeFileSync(dir + '/measure.txt', rows.join('\n') + '\n');
console.log(rows.join('\n')); console.log(errs.length ? '錯誤：' + errs.join(' | ') : '（無錯誤）'); await b.close();
