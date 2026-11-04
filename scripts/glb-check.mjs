// 第七輪（Dzine 全面換 GLB）接線檢查：逐站截圖＋列出場景裡的 GLB 群組
// node scripts/glb-check.mjs <網址> <輸出資料夾> [假GLB檔 名稱,名稱,...]
//   不給假 GLB：照現況跑（沒有 GLB 的名稱應該全走 fallback、console 無錯誤）
//   給假 GLB：攔截 models/index.json 與 models/<名稱>.glb，用假方塊模擬 Dzine 模型已到位，檢查每個名稱都真的換上（沒被 bake 吃掉）
import { chromium } from 'playwright';
import fs from 'node:fs';
const [base, dir, fake, names = ''] = process.argv.slice(2);
if (!base || !dir) { console.log('用法：node scripts/glb-check.mjs <網址> <輸出資料夾> [假GLB檔 名稱,名稱,...]'); process.exit(1); }
fs.mkdirSync(dir, { recursive: true });
const want = names ? names.split(',') : [];
const b = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu'] });
const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
if (fake) {
  const real = fs.existsSync('public/models/index.json') ? JSON.parse(fs.readFileSync('public/models/index.json', 'utf8')) : [];
  const bytes = fs.readFileSync(fake);
  await p.route('**/models/index.json', r => r.fulfill({ contentType: 'application/json', body: JSON.stringify([...new Set([...real, ...want])]) }));
  for (const n of want) if (!real.includes(n)) await p.route('**/models/' + n + '.glb', r => r.fulfill({ contentType: 'model/gltf-binary', body: bytes }));
}
await p.goto(base); await p.waitForFunction(() => window.__booted, null, { timeout: 30000 });
const ids = await p.evaluate(() => window.__ctx.planets.map(x => x.id));
const seen = {};
for (const id of ids) {
  await p.goto(base + (base.includes('?') ? '&' : '?') + 'planet=' + id);   // ?planet＝直接停在該站（不出封面、不飛行）
  await p.waitForFunction(() => window.__booted, null, { timeout: 30000 });
  await p.waitForTimeout(3500);
  await p.screenshot({ path: `${dir}/${fake ? 'fake' : 'none'}-${id}.png` });
  const r = await p.evaluate(i => { const P = window.__ctx.planetById.get(i), o = {};
    P.group.traverse(g => { if (!g.userData.glbGroup) return; const n = g.name.slice(4); o[n] ||= [0, 0]; o[n][0]++; if (g.userData.glbReady) o[n][1]++; });
    return o; }, id);
  for (const [n, [all, ready]] of Object.entries(r)) { seen[n] ||= [0, 0]; seen[n][0] += all; seen[n][1] += ready; }
  console.log(id, Object.entries(r).map(([n, [a, rd]]) => `${n}×${a}${fake ? '(換上' + rd + ')' : ''}`).join(' '));
}
if (fake) {
  const miss = want.filter(n => !seen[n]), part = want.filter(n => seen[n] && seen[n][1] < seen[n][0]);
  console.log('沒出現在任何站：', miss.join(' ') || '無'); console.log('有群組沒換上：', part.join(' ') || '無');
}
console.log(errs.length ? '錯誤：\n' + [...new Set(errs)].join('\n') : '（console 無錯誤）');
await b.close();
