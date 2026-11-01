// D 線介面驗收：node scripts/d-ui-check.mjs [網址=http://127.0.0.1:8824/]
import { chromium } from 'playwright';
import fs from 'node:fs';
const base = process.argv[2] || 'http://127.0.0.1:8824/';
const b = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu'] });
const errs = [], res = [];
const ok = (name, cond) => { res.push((cond ? '✓ ' : '✗ ') + name); if (!cond) process.exitCode = 1; };
async function page(w, h, url = base, touch = false) {
  const c = await b.newContext({ viewport: { width: w, height: h }, ...(touch ? { isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : {}) });
  const p = await c.newPage();
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && !/cert\//.test(m.location().url || '') && errs.push(m.text()));
  await p.goto(url); await p.waitForFunction(() => window.__booted, null, { timeout: 30000 }); await p.waitForTimeout(500);
  return p;
}
// 封面：沒有 ?planet／?auto 時出現，按「出發」才開始
// 封面「出發」→ 出發前導讀卡 →「騎蛙出發」
const start = async p => { if (await p.isVisible('#ui-cover')) { await p.click('#ui-start'); await p.click('#ui-intro-go'); } await p.waitForTimeout(200); };
const visited = p => p.$$eval('.ui-stop.is-visited', a => a.map(x => x.dataset.id));

// 桌機：讀完水陸百花 → 騎蛙跳往東籬菊園
const p = await page(1440, 900);
await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForFunction(() => window.__booted);
await p.waitForTimeout(300);
ok('封面開場卡出現、故事卡藏起', (await p.isVisible('#ui-cover')) && !(await p.isVisible('#ui-card')));
ok('封面時 viewInsets 歸零', await p.evaluate(() => window.__ctx.viewInsets.right === 0 && window.__ctx.viewInsets.top === 0));
await p.screenshot({ path: 'review/d-check-cover.png' });
await p.evaluate(() => { window.__focus = []; const f = window.__ctx.focusEl; window.__ctx.focusEl = (a, b) => { window.__focus.push(a + ':' + b); return f(a, b); }; });
await p.click('#ui-start');
ok('出發後先出現導讀卡（說的文體、119 字）', (await p.isVisible('#ui-intro')) && (await p.textContent('#ui-intro')).includes('議論文體') && (await p.textContent('#ui-intro')).includes('119') && !(await p.isVisible('#ui-card')));
await p.screenshot({ path: 'review/d-check-intro.png' });
await p.click('#ui-intro-go'); await p.waitForTimeout(200);
ok('按騎蛙出發後故事卡出現、焦點在站名', (await p.isVisible('#ui-card')) && (await p.evaluate(() => document.activeElement.id)) === 'ui-name');
ok('朗讀鈕：有檔的段落顯示', await p.isVisible('#ui-play'));
ok('桌機原文區塊預設展開、顯示本站原文', (await p.getAttribute('#ui-yuan-btn', 'aria-expanded')) === 'true' && (await p.textContent('#ui-yuan-txt')).startsWith('水陸草木'));
await p.click('#ui-yuan-txt .ui-term >> text=蕃');
ok('原文字詞可點看原文註解', (await p.isVisible('#ui-el')) && (await p.textContent('#ui-el-kind')) === '原文註解' && (await p.textContent('#ui-el-desc')).includes('多'));
await p.click('#ui-el-x');
ok('原文字詞不在白話裡標註（蕃、可愛）', await p.$$eval('#ui-para .ui-term', a => a.every(x => !['蕃', '可愛'].includes(x.textContent))));
await p.click('#ui-yuan-btn');
ok('原文區塊可收合成一行', (await p.getAttribute('#ui-yuan-btn', 'aria-expanded')) === 'false' && !(await p.isVisible('#ui-yuan-txt')) && (await p.textContent('#ui-yuan-peek')).startsWith('水陸草木'));
await p.click('#ui-yuan-btn');
await p.keyboard.press('ArrowRight');
ok('→ 鍵換到第 2 段', (await p.textContent('#ui-num')).includes('2／'));
ok('第 2 段鏡頭特寫仙界蓮池', (await p.evaluate(() => window.__focus.at(-1))) === 'baihua:pond');
ok('路線虛線弧與朱印標記', await p.evaluate(() => document.querySelector('#ui-path-svg .all').getAttribute('d').split('C').length === 8 && !document.getElementById('ui-path-seal').hidden));
// 全量朗讀已生成：每段都要有朗讀鈕
ok('朗讀鈕：第 2 段也有', await p.isVisible('#ui-play'));
ok('思考題只在最後一段出現', !(await p.isVisible('#ui-think')));
await p.click('#ui-next');
await p.click('#ui-para .ui-term >> text=萍花');
ok('白話生詞可點看註解', (await p.isVisible('#ui-el')) && (await p.textContent('#ui-el-kind')) === '生詞註解' && (await p.textContent('#ui-el-desc')).includes('浮萍'));
await p.click('#ui-el-x');
// 朗讀節奏：播完接下一段時，等 walked（或 4 秒）才開始念
await p.evaluate(() => { const a = document.getElementById('ui-audio'); window.__plays = 0; a.play = function () { window.__plays++; return Promise.resolve(); }; });
await p.check('#ui-auto');
await p.evaluate(() => document.getElementById('ui-audio').onended());
ok('播完換段後先等走路，不立刻念', (await p.textContent('#ui-num')).includes('4／') && (await p.evaluate(() => window.__plays)) === 0);
await p.evaluate(() => window.__ctx.emit('walked', { planet: 'baihua', el: 'landflower' }));
ok('收到 walked 後開始念', (await p.evaluate(() => window.__plays)) === 1);
await p.evaluate(() => document.getElementById('ui-audio').onended());
await p.waitForTimeout(4300);
ok('沒收到 walked 時 4 秒後照常開始', (await p.evaluate(() => window.__plays)) === 2);
await p.click('#ui-play'); await p.uncheck('#ui-auto');
ok('朗讀鈕名稱固定「朗讀」', (await p.textContent('#ui-play')).trim().endsWith('朗讀'));
while (await p.isEnabled('#ui-next')) await p.click('#ui-next');
ok('最後一段出現前往鈕（騎蛙跳往東籬菊園）與思考題', (await p.textContent('#ui-go')) === '騎蛙跳往東籬菊園' && (await p.isVisible('#ui-think')));
await p.screenshot({ path: 'review/d-check-last.png' });
await p.evaluate(() => { window.__arrived = null; window.__ctx.on('arrive', e => window.__arrived = e.id); });
await p.click('#ui-go');
await p.waitForFunction(() => window.__arrived === 'ju', null, { timeout: 15000 });
ok('arrive 後故事卡換成東籬菊園', (await p.textContent('#ui-name')) === '東籬菊園' && (await p.textContent('#ui-yuan-txt')).startsWith('晉陶淵明'));
ok('路線打勾 baihua＋ju', (await visited(p)).join() === 'baihua,ju');
ok('baihua→ju 那段描亮', await p.evaluate(() => document.querySelector('#ui-path-svg .gold').getAttribute('d').split('C').length === 2));
await p.click('.ui-chip >> nth=0');
ok('點元素顯示小卡', (await p.isVisible('#ui-el')) && (await p.textContent('#ui-el-desc')).length > 5);
await p.evaluate(() => window.__ctx.emit('pick', { planet: 'ju', el: 'tao' }));
ok('pick 事件顯示元素小卡', (await p.textContent('#ui-el-name')) === '陶淵明');
ok('元素小卡開著時 viewInsets 算進去', await p.evaluate(() => { const r = document.getElementById('ui-el').getBoundingClientRect(), v = window.__ctx.viewInsets; return v.right >= innerWidth - r.left - 1; }));
await p.screenshot({ path: 'review/d-check-ju.png' });
await p.evaluate(() => window.__ctx.emit('flight', { from: 'ju', to: 'mudan', t: 0.3 }));
ok('移動中有略過鈕 ≥44px', await p.isVisible('#ui-skip') && (await p.$eval('#ui-skip', x => x.getBoundingClientRect().height)) >= 44);
ok('flight 收起卡片＋過場字幕', (await p.isVisible('#ui-caption')) && (await p.textContent('#ui-caption')).includes('牡丹') && await p.$eval('#ui-card', e => e.classList.contains('is-collapsed')));
await p.screenshot({ path: 'review/d-check-flight.png' });
await p.keyboard.press('Escape');
await p.reload(); await p.waitForFunction(() => window.__booted); await p.waitForTimeout(300); await start(p);
ok('重整後打勾仍在（als-v1）', (await visited(p)).join() === 'baihua,ju' && (await p.evaluate(() => JSON.parse(localStorage.getItem('als-v1')).visited.length)) === 2);
ok('viewInsets.right 已設定', await p.evaluate(() => window.__ctx.viewInsets.right > 300));
ok('頁尾作品島連結', (await p.getAttribute('#ui-works', 'href')).startsWith('https://') && (await p.getAttribute('#ui-works', 'target')) === '_blank');
ok('頁尾原著出處與改寫聲明', /愛蓮說.*公共領域.*重新改寫/.test(await p.textContent('#ui-route .ui-foot')));

// 全景總覽：故事卡收起、viewInsets 只剩頂列；再到站會展開
await p.click('#ui-overview'); await p.waitForTimeout(400);
ok('全景時故事卡收起、viewInsets 右／下歸零（把手算頂列）', await p.evaluate(() => { const v = window.__ctx.viewInsets; return document.getElementById('ui-card').classList.contains('is-collapsed') && v.right === 0 && v.bottom === 0 && v.top < 200; }));
await p.screenshot({ path: 'review/d-check-overview.png' });
await p.evaluate(() => window.__ctx.goPlanet(window.__ctx.current)); await p.waitForTimeout(400);
ok('回到站點故事卡再展開', await p.evaluate(() => !document.getElementById('ui-card').classList.contains('is-collapsed') && window.__ctx.viewInsets.right > 300));

// 最後一站讀完 → ctx.goHome（沒有就直接）→ 旅程結尾
const e = await page(1440, 900, base + '?planet=lianxi');
ok('?planet= 略過封面', !(await e.isVisible('#ui-cover')) && await e.isVisible('#ui-card'));
while (await e.isEnabled('#ui-next')) await e.click('#ui-next');
ok('最後一站的按鈕是回到濂溪書堂', (await e.textContent('#ui-go')).includes('回到濂溪書堂'));
await e.click('#ui-go');
ok('最後一站讀完顯示旅程結尾', await e.waitForSelector('#ui-end', { state: 'visible', timeout: 20000 }).then(() => true, () => false));
ok('結尾有三種花・三種人統整表與讀原文', (await e.$$eval('#ui-adults tr', a => a.length)) === 3 && (await e.textContent('#ui-end')).includes('原文') && (await e.textContent('#ui-end caption')) === '三種花・三種人');
await e.screenshot({ path: 'review/d-check-end.png' });
await e.click('#ui-restart');
ok('再從水陸百花出發', await e.waitForFunction(() => document.getElementById('ui-name').textContent.includes('水陸百花') && !document.getElementById('ui-card').hidden, null, { timeout: 15000 }).then(() => true, () => false));

// 手機：直向 390x844、iPhone SE 375x667、橫向 844x390、iPad 直向 820x1180
const small = p => p.$$eval('#ui button:not([hidden]):not(.ui-term), #ui a.ui-btn', a => a.filter(x => x.offsetParent && x.getBoundingClientRect().height < 44).map(x => x.id || x.textContent));
const tiny = p => p.$$eval('#ui-para, #ui-yuan-txt, .ui-yuan-peek, #ui-el-desc, .ui-cover-sub, #ui-end p, .ui-think', a => a.filter(x => x.offsetParent && parseFloat(getComputedStyle(x).fontSize) < 16).map(x => x.id || x.className));
const outside = p => p.$$eval('#ui button:not([hidden]):not(.ui-chip):not(.ui-term), #ui a.ui-btn', a => a.filter(x => { if (!x.offsetParent) return false; const r = x.getBoundingClientRect(); return r.right > innerWidth + 1 || r.left < -1 || r.bottom > innerHeight + 1 || r.top < -1; }).map(x => x.id || x.textContent.trim()));
for (const [w, h, n] of [[390, 844, '390'], [375, 667, 'se'], [844, 390, 'land'], [820, 1180, 'ipad']]) {
  const m = await page(w, h, base, true);
  await m.screenshot({ path: `review/d-check-m${n}-cover.png` });
  ok(`${n} 封面按鈕在畫面內`, (await outside(m)).length === 0);
  await start(m); await m.waitForTimeout(600);
  await m.screenshot({ path: `review/d-check-m${n}-card.png` });
  const r = await m.$eval('#ui-card', x => { const b = x.getBoundingClientRect(); return { top: b.top, left: b.left, w: b.width, h: b.height }; });
  const area = r.w * r.h / (w * h);
  ok(`${n} 故事卡佔畫面 ≤ 50%（${Math.round(area * 100)}%）`, area <= 0.5);
  ok(`${n} 無水平捲動`, await m.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.body.scrollWidth <= innerWidth));
  const v = await m.evaluate(() => ({ ...window.__ctx.viewInsets }));
  ok(`${n} viewInsets 對到故事卡（${JSON.stringify(v)}）`, w > h ? (r.w > w * 0.7 ? v.bottom > 100 : v.right > 150) : v.bottom > 100);
  const sm = await small(m); ok(`${n} 按鈕 ≥44px` + (sm.length ? '：' + sm.join('、') : ''), sm.length === 0);
  const tn = await tiny(m); ok(`${n} 內文 ≥16px` + (tn.length ? '：' + tn.join('、') : ''), tn.length === 0);
  const os = await outside(m); ok(`${n} 按鈕沒有被切到畫面外` + (os.length ? '：' + os.join('、') : ''), os.length === 0);
  ok(`${n} 上一段/下一段在抽屜可見範圍內`, await m.evaluate(() => { const c = document.getElementById('ui-card').getBoundingClientRect(), b = document.getElementById('ui-next').getBoundingClientRect(); return b.bottom <= c.bottom + 1 && b.top >= c.top; }));
  const land = h <= 500;
  if (!land) {
    // 直向：預設半收合（標題＋第一句），往上滑展開、往下滑收回、把手可用鍵盤
    const st = () => m.evaluate(() => { const c = document.getElementById('ui-card'); return { peek: c.classList.contains('is-peek'), exp: document.getElementById('ui-handle').getAttribute('aria-expanded'), h: c.getBoundingClientRect().height / innerHeight, b: window.__ctx.viewInsets.bottom }; });
    const swipe = dy => m.evaluate(dy => { const c = document.getElementById('ui-card'), r = c.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + 20;
      const T = y2 => new Touch({ identifier: 1, target: c, clientX: x, clientY: y2 });
      c.dispatchEvent(new TouchEvent('touchstart', { touches: [T(y)], changedTouches: [T(y)], bubbles: true }));
      c.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [T(y + dy)], bubbles: true })); }, dy);
    const s0 = await st();
    ok(`${n} 預設半收合、aria-expanded=false、高度 ≤ 35%（${Math.round(s0.h * 100)}%）`, s0.peek && s0.exp === 'false' && s0.h <= 0.35);
    ok(`${n} 半收合露出第一句`, await m.evaluate(() => { const p = document.getElementById('ui-para'); return p.offsetParent && p.getBoundingClientRect().height > 20; }));
    await swipe(-120); await m.waitForTimeout(100); const s1 = await st();
    ok(`${n} 往上滑展開、viewInsets.bottom 變大（${s0.b}→${s1.b}）`, !s1.peek && s1.exp === 'true' && s1.b > s0.b && s1.h <= 0.65);
    await m.screenshot({ path: `review/d-check-m${n}-open.png` });
    ok(`${n} 手機原文區塊預設收合成一行`, (await m.getAttribute('#ui-yuan-btn', 'aria-expanded')) === 'false' && (await m.isVisible('#ui-yuan-peek')) && !(await m.isVisible('#ui-yuan-txt')));
    await m.click('#ui-yuan-btn'); await m.waitForTimeout(100);
    ok(`${n} 點一下展開原文`, (await m.getAttribute('#ui-yuan-btn', 'aria-expanded')) === 'true' && (await m.isVisible('#ui-yuan-txt')));
    await m.screenshot({ path: `review/d-check-m${n}-yuan.png` });
    await m.click('#ui-yuan-btn'); await m.$eval('#ui-card-body', x => { x.scrollTop = 0; });
    await swipe(120); await m.waitForTimeout(100); const s2 = await st();
    ok(`${n} 往下滑收回半收合`, s2.peek && s2.exp === 'false' && Math.abs(s2.b - s0.b) <= 1);
    await m.focus('#ui-handle'); await m.keyboard.press('Enter'); const s3 = await st();
    ok(`${n} 把手 Enter 展開`, s3.exp === 'true');
  } else {
    const fr = () => m.evaluate(() => { const v = window.__ctx.viewInsets; return (innerWidth - v.left - v.right) / innerWidth; });
    const f0 = await fr();
    ok(`${n} 橫向 3D 可視寬 ≥ 55%（${Math.round(f0 * 100)}%）`, f0 >= 0.55);
    await m.click('#ui-handle'); const f1 = await fr();
    ok(`${n} 橫向故事卡可收成窄條（3D ${Math.round(f1 * 100)}%）`, f1 > f0 && (await m.getAttribute('#ui-handle', 'aria-expanded')) === 'false');
    await m.screenshot({ path: `review/d-check-m${n}-collapsed.png` });
    await m.click('#ui-handle');
  }
  await m.click('.ui-chip >> nth=0'); await m.waitForTimeout(800);
  if (land) { const f2 = await m.evaluate(() => { const v = window.__ctx.viewInsets; return (innerWidth - v.left - v.right) / innerWidth; }); ok(`${n} 元素卡開著 3D 仍 ≥ 55%（${Math.round(f2 * 100)}%）`, f2 >= 0.55); }
  await m.screenshot({ path: `review/d-check-m${n}-el.png` });
  await m.click('#ui-el-x');
  if (await m.isVisible('#ui-route')) await m.click('#ui-route-btn');
  await m.click('#ui-route-btn'); await m.waitForTimeout(300);
  await m.screenshot({ path: `review/d-check-m${n}-route.png` });
  if (w <= 900 || h <= 500) { await m.keyboard.press('Escape'); ok(`${n} Esc 關路線面板、焦點回路線鈕`, !(await m.isVisible('#ui-route')) && (await m.evaluate(() => document.activeElement.id)) === 'ui-route-btn'); }
  else await m.click('#ui-route-btn');
  await m.evaluate(() => window.__ctx.emit('flight', { from: 'baihua', to: 'ju', t: 0.3 }));
  await m.waitForTimeout(300);
  ok(`${n} 過場字幕不壓到抽屜把手`, await m.evaluate(() => { const a = document.getElementById('ui-caption').getBoundingClientRect(), b = document.getElementById('ui-handle').getBoundingClientRect(); return a.bottom <= b.top || a.top >= b.bottom || a.right <= b.left || a.left >= b.right; }));
  await m.screenshot({ path: `review/d-check-m${n}-flight.png` });
  await m.goto(base + '?planet=lianxi'); await m.waitForFunction(() => window.__booted); await m.waitForTimeout(500);
  while (await m.isEnabled('#ui-next')) await m.click('#ui-next');
  await m.screenshot({ path: `review/d-check-m${n}-last.png` });
  await m.click('#ui-go'); await m.waitForSelector('#ui-end', { state: 'visible', timeout: 20000 }).catch(() => {}); await m.waitForTimeout(300);
  ok(`${n} 結尾卡在畫面內可捲動`, await m.$eval('#ui-end', x => { const r = x.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight + 1; }));
  await m.screenshot({ path: `review/d-check-m${n}-end.png` });
  if (n === '390') { await m.keyboard.press('Escape'); await m.keyboard.press('Escape'); ok('Esc 收起故事卡', await m.$eval('#ui-card', x => x.classList.contains('is-collapsed'))); }
  await m.context().close();
}

// 古文模式、測驗、兩版證書：三種尺寸各截圖（review/d-<尺寸>-*.png）
const ALL = { baihua: 5, ju: 4, mudan: 5, yuni: 3, jing: 5, xiang: 5, pin: 4, lianxi: 5 };
for (const [w, h] of [[1440, 900], [390, 844], [820, 1180]]) {
  const n = `${w}x${h}`, m = await page(w, h, base + '?planet=baihua', w < 1000);
  await m.evaluate(() => localStorage.removeItem('als-v1')); await m.reload(); await m.waitForFunction(() => window.__booted); await m.waitForTimeout(500);
  if (w < 1000) { await m.click('#ui-handle'); await m.waitForTimeout(200); }
  await m.screenshot({ path: `review/d-${n}-story.png` });
  await m.click('#ui-mode-gu'); await m.waitForTimeout(200);
  ok(`${n} 古文模式：按鈕 pressed、內文是原文`, (await m.getAttribute('#ui-mode-gu', 'aria-pressed')) === 'true' && (await m.textContent('#ui-card')).includes('水陸草木'));
  await m.screenshot({ path: `review/d-${n}-gu.png` });
  await m.click('#ui-mode-bai');
  while (await m.isEnabled('#ui-next')) await m.click('#ui-next');
  await m.click('#ui-quiz-go'); await m.waitForTimeout(200);
  ok(`${n} 測驗開啟、五題四選項`, (await m.isVisible('#ui-quiz')) && (await m.$$eval('#ui-quiz-form fieldset', a => a.length)) === 5 && (await m.$$eval('#ui-quiz-form input', a => a.length)) === 20);
  await m.screenshot({ path: `review/d-${n}-quiz.png` });
  ok(`${n} 測驗開啟時背景 inert`, await m.evaluate(() => ['.ui-top', '#ui-card', '#app'].every(q => document.querySelector(q).inert)));
  // 先全答錯：未過關、不算完成；再考一次全答對才過關（資料裡正解索引 0 → radio value 0）
  for (let k = 0; k < 5; k++) await m.click(`#ui-quiz-form fieldset >> nth=${k} >> input[value="1"]`);
  await m.click('#ui-quiz-submit');
  ok(`${n} 答對 0／5 未過關、證書數不增加`, (await m.textContent('#ui-quiz-res')).includes('還差') && (await m.textContent('#ui-cert-btn')).includes('0/8'));
  ok(`${n} 交卷後標出 ✓正解／✗你的答案`, await m.evaluate(() => getComputedStyle(document.querySelector('.ui-q-c.is-right'), '::after').content.includes('正解') && getComputedStyle(document.querySelector('.ui-q-c.is-wrong'), '::after').content.includes('你的答案')));
  await m.screenshot({ path: `review/d-${n}-quiz-fail.png` });
  await m.click('#ui-quiz-retry');
  for (let k = 0; k < 5; k++) await m.click(`#ui-quiz-form fieldset >> nth=${k} >> input[value="0"]`);
  await m.click('#ui-quiz-submit');
  ok(`${n} 答對 5／5 過關、記錄到 als-v1`, (await m.textContent('#ui-quiz-res')).includes('本站過關') && (await m.evaluate(() => JSON.parse(localStorage.getItem('als-v1')).quiz.baihua)) === 5);
  await m.screenshot({ path: `review/d-${n}-quiz-done.png` });
  await m.click('#ui-quiz-x');
  ok(`${n} 關閉測驗後背景恢復`, await m.evaluate(() => !document.querySelector('.ui-top').inert));
  await m.evaluate(q => { const v = JSON.parse(localStorage.getItem('als-v1')); v.quiz = q; v.name = '林小蓮'; localStorage.setItem('als-v1', JSON.stringify(v)); }, ALL);
  await m.reload(); await m.waitForFunction(() => window.__booted); await m.waitForTimeout(400);
  await m.click('#ui-cert-btn'); await m.waitForTimeout(300);
  ok(`${n} 八站完成後出現證書表單與兩版選擇`, (await m.isVisible('#ui-cert-form')) && (await m.isVisible('#ui-cert-ver-gu')) && (await m.isVisible('#ui-cert-ver-bai')));
  ok(`${n} 證書表單在統整表前面、顯示總分 36／40、有右上關閉鈕`, await m.evaluate(() => !!(document.getElementById('ui-cert').compareDocumentPosition(document.querySelector('.ui-adults')) & 4)) && (await m.textContent('#ui-cert-score')).includes('36／40') && (await m.isVisible('#ui-end-close')));
  await m.screenshot({ path: `review/d-${n}-end.png` });
  for (const [v, t] of [['gu', '結業狀'], ['bai', '結業證書']]) {
    await m.click(`#ui-cert-ver-${v}`);
    const img = await m.waitForFunction(() => { const i = document.getElementById('ui-cert-img'); return !i.hidden && i.complete && i.naturalWidth === 2480 && i.src; }, null, { timeout: 20000 }).then(x => x.jsonValue(), () => '');
    ok(`${n} ${t}：預覽圖 2480 寬、按鈕 pressed、alt 含版本`, !!img && (await m.getAttribute(`#ui-cert-ver-${v}`, 'aria-pressed')) === 'true' && (await m.getAttribute('#ui-cert-img', 'alt')).includes(t));
    await m.$eval('#ui-cert-img', x => x.scrollIntoView({ block: 'center' })); await m.waitForTimeout(200);
    await m.screenshot({ path: `review/d-${n}-cert-${v}.png` });
    if (w === 1440) {
      const png = await m.evaluate(() => fetch(document.getElementById('ui-cert-img').src).then(r => r.blob()).then(b => new Promise(r => { const f = new FileReader(); f.onload = () => r(f.result); f.readAsDataURL(b); })));
      fs.writeFileSync(`review/d-cert-${v}.png`, Buffer.from(png.split(',')[1], 'base64'));
      const dl = m.waitForEvent('download', { timeout: 10000 }).catch(() => null);
      await m.click('#ui-cert-dl'); const d = await dl;
      ok(`${t}：下載檔名 ${d && d.suggestedFilename()}`, !!d && d.suggestedFilename() === (v === 'gu' ? 'ailianshuo-jieyezhuang.png' : 'ailianshuo-certificate.png'));
    }
  }
  await m.context().close();
}

// 第六輪無障礙：loader 不搶焦點、390 工具列一排、手機路線不蓋工具列、站名標題無藍框
{
  const m = await page(390, 844, base + '?planet=baihua', true);
  await m.waitForTimeout(1200); ok('390 #loader 連結不在 Tab 順序', await m.evaluate(() => { const a = document.querySelector('#loader a'); return !a || a.offsetParent === null; }));
  const tb = await m.evaluate(() => { const t = document.querySelector('.ui-top').getBoundingClientRect(), bs = [...document.querySelectorAll('.ui-tools > *')].map(e => e.getBoundingClientRect().top); return { h: t.bottom, rows: new Set(bs.map(Math.round)).size, w: document.querySelector('.ui-tools').scrollWidth <= innerWidth }; });
  ok(`390 工具列一排（${tb.rows} 排、底 ${Math.round(tb.h)}px ≤ 90）`, tb.rows === 1 && tb.h <= 90 && tb.w);
  await m.click('#ui-route-btn'); await m.waitForTimeout(200);
  ok('390 路線面板不蓋工具列', await m.evaluate(() => document.getElementById('ui-route').getBoundingClientRect().top >= document.querySelector('.ui-top').getBoundingClientRect().bottom - 1));
  await m.screenshot({ path: 'review/d-390-route-r6.png' });
  await m.context().close();
  const d = await page(1440, 900, base + '?planet=baihua');
  ok('1440 站名標題沒有藍色外框', await d.evaluate(() => { const h = document.getElementById('ui-name'); h.focus(); const c = getComputedStyle(h); return c.outlineStyle === 'none' || !/47, 9[35]|31, 78/.test(c.outlineColor); }));
  await d.waitForTimeout(1200); ok('1440 #loader 不在 Tab 順序', await d.evaluate(() => { const a = document.querySelector('#loader a'); return !a || a.offsetParent === null; }));
  await d.context().close();
}
// 第三輪無障礙（a11y.md S1–S4、M1–M5）
for (const [w, h] of [[360, 640], [320, 568]]) {
  const m = await page(w, h, base, true), n = `${w}x${h}`;
  await m.click('#ui-start'); await m.waitForTimeout(200);
  const go = await m.$('#ui-intro-go'); await go.scrollIntoViewIfNeeded();
  ok(`${n} 導讀卡可捲到「騎蛙出發」`, await m.$eval('#ui-intro-go', x => { const r = x.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight + 1; }));
  await m.screenshot({ path: `review/b-${n}-intro.png` });
  await go.click(); await m.waitForTimeout(500);
  ok(`${n} 到站焦點在站名（視覺隱藏仍可聚焦）`, (await m.evaluate(() => document.activeElement.id)) === 'ui-name');
  const cut = await m.$$eval('.ui-tools > *', a => a.filter(x => { const r = x.getBoundingClientRect(); return r.right > innerWidth + 1 || r.left < -1; }).map(x => x.textContent.trim()));
  ok(`${n} 工具列沒被切` + (cut.length ? '：' + cut.join('、') : ''), cut.length === 0);
  await m.screenshot({ path: `review/b-${n}-station.png` });
  await m.context().close();
}
{
  const m = await page(390, 844, base + '?planet=baihua', true);
  ok('頁面標題是本作', /周敦頤/.test(await m.title()) && !/陋室|劉禹錫/.test(await m.title()));
  await m.click('#ui-handle'); await m.click('.ui-chip >> nth=0'); await m.click('#ui-route-btn'); await m.waitForTimeout(200);
  ok('390 開路線時收起註解卡、× 按得到', !(await m.isVisible('#ui-el')) && await m.click('#ui-route-x', { timeout: 2000 }).then(() => true, () => false));
  ok('390 #ui-para 沒有 aria-live', (await m.getAttribute('#ui-para', 'aria-live')) === null);
  await m.click('#ui-next'); ok('390 換段時 #ui-sr 報段號', (await m.textContent('#ui-sr')).includes('第 2／'));
  await m.click('#ui-quiz-btn'); await m.waitForTimeout(200);
  ok('停用交卷鈕不透明（對比 ≥4.5）', await m.$eval('#ui-quiz-submit', x => x.disabled && getComputedStyle(x).opacity === '1'));
  await m.screenshot({ path: 'review/b-390-quiz.png' });
  await m.click('#ui-quiz-x');
  await m.evaluate(() => { const v = JSON.parse(localStorage.getItem('als-v1') || '{}'); v.quiz = { baihua: 5, ju: 5, mudan: 5, yuni: 5, jing: 5, xiang: 5, pin: 5, lianxi: 5 }; v.visited = v.visited || []; localStorage.setItem('als-v1', JSON.stringify(v)); });
  await m.reload(); await m.waitForFunction(() => window.__booted); await m.waitForTimeout(400);
  await m.click('#ui-cert-btn'); await m.waitForTimeout(300);
  ok('390 開證書聚焦標題、不聚焦姓名框（不彈鍵盤）', (await m.evaluate(() => document.activeElement.id)) === 'ui-cert-h');
  await m.screenshot({ path: 'review/b-390-cert.png' });
  await m.$eval('#ui-end', x => { x.scrollTop = x.scrollHeight; }); await m.waitForTimeout(100);
  ok('390 證書捲到底有「留在這裡看看」可關閉', await m.$eval('#ui-end-x', x => { const r = x.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; }));
  await m.screenshot({ path: 'review/b-390-cert-bottom.png' });
  await m.context().close();
  const d = await page(1440, 900, base + '?planet=baihua');
  await d.focus('#ui-cert-btn'); await d.keyboard.press('Enter'); await d.waitForTimeout(200); await d.keyboard.press('Escape'); await d.waitForTimeout(100);
  ok('1440 Esc 關證書後焦點回到看得見的元素', await d.evaluate(() => { const a = document.activeElement; return a !== document.body && a.getClientRects().length > 0; }));
  await d.context().close();
}
ok('console 零錯誤' + (errs.length ? '：' + errs.join(' | ') : ''), errs.length === 0);
console.log(res.join('\n'));
await b.close();
