// D 線手機效能量測：node scripts/d-perf.mjs [網址=http://127.0.0.1:8824/] [CPU 降速倍數=4]
// 手機模擬（390x844、觸控、DPR 3）＋CDP CPU throttle，requestAnimationFrame 計數 5 秒。
// shortcut: 桌機 GPU 不會被 throttle，只降 CPU；真機 GPU 較弱，數字要再打折，真機實測才算數。
import { chromium } from 'playwright';
const base = process.argv[2] || 'http://127.0.0.1:8824/', rate = Number(process.argv[3] || 4);
const b = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu'] });
const fps = p => p.evaluate(() => new Promise(r => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 5000) requestAnimationFrame(f); else r(+(n * 1000 / (performance.now() - t0)).toFixed(1)); }; requestAnimationFrame(f); }));
async function run(name, q, act) {
  const c = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' });
  const p = await c.newPage();
  await (await c.newCDPSession(p)).send('Emulation.setCPUThrottlingRate', { rate });
  await p.goto(base + q); await p.waitForFunction(() => window.__booted, null, { timeout: 60000 }); await p.waitForTimeout(3000);
  if (act) await p.evaluate(act);
  const v = await fps(p), pr = await p.evaluate(() => window.__ctx.renderer.getPixelRatio());
  console.log(`${name}\t${v} fps\tpixelRatio ${pr}`);
  await c.close(); return v;
}
console.log(`手機模擬 390x844 DPR3，CPU ${rate}x 降速`);
const r = [
  await run('?planet=mudan 靜置', '?planet=mudan'),
  await run('baihua→ju 騎蛙跳躍中', '?planet=baihua', () => window.__ctx.goPlanet('ju')),
  await run('?planet=ju 特寫陶淵明', '?planet=ju', () => window.__ctx.focusEl('ju', 'tao'))
];
if (Math.min(...r) < 30) { console.log('有情境低於 30fps'); process.exitCode = 1; }
await b.close();
