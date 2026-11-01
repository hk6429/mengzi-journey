// node scripts/shot.mjs <網址> <輸出.png> [寬x高]  例：npm run shot -- "http://127.0.0.1:8811/?planet=king" review/king.png
import { chromium } from 'playwright';
const [url, out, size = '1440x900'] = process.argv.slice(2);
if (!url || !out) { console.log('用法：node scripts/shot.mjs <網址> <輸出.png> [寬x高]'); process.exit(1); }
const [width, height] = size.split('x').map(Number);
const b = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu'] });
const p = await b.newPage({ viewport: { width, height } });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
await p.goto(url); await p.waitForFunction(() => window.__booted, null, { timeout: 30000 }); await p.waitForTimeout(1500);
await p.screenshot({ path: out });
console.log('截圖', out, errs.length ? '\n錯誤：\n' + errs.join('\n') : '（無錯誤）');
await b.close();
