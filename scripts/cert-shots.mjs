// 證書用照片：node scripts/cert-shots.mjs [網址=http://127.0.0.1:8823/] [輸出資料夾=public/cert]
// 產出 <輸出>/hero.jpg（主角周敦頤正面特寫）與 <輸出>/<pid>.jpg（八片大荷葉斜前方特寫：葉面＋荷花＋青蛙），每張 600×600、≤120KB
// 荷葉平鋪水面，從右前方 30°、仰角 38° 看才看得到葉面
// 畫面：隱藏介面與名牌、viewInsets 歸零，用 window.__ctx 操作鏡頭（不生圖、不用原著插畫）
import { chromium } from 'playwright';
import fs from 'node:fs';
const base = process.argv[2] || 'http://127.0.0.1:8823/', dir = process.argv[3] || 'public/cert';
const ids = ['baihua', 'ju', 'mudan', 'yuni', 'jing', 'xiang', 'pin', 'lianxi'];
fs.mkdirSync(dir, { recursive: true });
const b = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu'] });
// 1000×1000 CSS px（避開 ≤900px 的手機取景偏移）× 0.6 ＝ 600×600 輸出
const c = await b.newContext({ viewport: { width: 1000, height: 1000 }, deviceScaleFactor: 0.6 });
const errs = [];
async function shot(pid, out, hero) {
  const p = await c.newPage();
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && !/cert\/|pano\//.test(m.location().url || '') && errs.push(m.text()));
  await p.goto(base + `?planet=${pid}&quality=0`); await p.waitForFunction(() => window.__booted, null, { timeout: 30000 });
  await p.evaluate(() => {
    document.getElementById('ui').style.display = 'none';
    const x = window.__ctx; x.labelRenderer.domElement.style.display = 'none'; Object.assign(x.viewInsets, { left: 0, right: 0, top: 0, bottom: 0 });
  });
  await p.waitForTimeout(2600); // 等 insets 變動後的重新取景
  if (hero) await p.evaluate(() => { // 主角正面特寫：框住全身、從 +z 仰角 20° 看（同 scene.js 的 SC_CAM.el）
    const x = window.__ctx, V = x.camera.position.constructor, pr = x.scene.getObjectByName('hero');
    if (!pr) return;
    const B = new x.camera.position.constructor(), lo = pr.getWorldPosition(new V()), h = Math.max(1, (() => { let y = 0; pr.traverse(o => { if (o.isMesh && o.geometry) { o.geometry.computeBoundingBox(); y = Math.max(y, o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld).max.y - lo.y); } }); return y; })());
    const tgt = lo.clone().add(B.set(0, h * 0.5, 0)), d = h * 0.78 / Math.tan(x.camera.fov * Math.PI / 360), e = 20 * Math.PI / 180, u = [0, Math.sin(e), Math.cos(e)];
    x.controls.minDistance = 0; // 縮放下限會把特寫夾遠
    x.controls.target.copy(tgt); x.camera.position.copy(tgt).add(B.set(u[0] * d, u[1] * d, u[2] * d)); x.camera.lookAt(tgt); x.controls.update();
  });
  else await p.evaluate(pid => { // 荷葉特寫：整片葉子放進畫面
    const x = window.__ctx, V = x.camera.position.constructor, g = x.planetById.get(pid).group, d = 19, e = 38 * Math.PI / 180, a = 30 * Math.PI / 180;
    const tgt = g.getWorldPosition(new V()).add(new V(0, 0.4, 0.8));
    x.controls.target.copy(tgt); x.camera.position.copy(tgt).add(new V(Math.sin(a) * Math.cos(e) * d, Math.sin(e) * d, Math.cos(a) * Math.cos(e) * d)); x.camera.lookAt(tgt); x.controls.update();
  }, pid);
  await p.waitForTimeout(900);
  await p.screenshot({ path: out, type: 'jpeg', quality: 82 });
  await p.close();
  const kb = fs.statSync(out).size / 1024;
  console.log((kb <= 120 ? '✓ ' : '✗ 超過 120KB ') + out, kb.toFixed(0) + 'KB');
  if (kb > 120) process.exitCode = 1;
}
await shot('baihua', dir + '/hero.jpg', true);
for (const id of ids) await shot(id, `${dir}/${id}.jpg`, false);
console.log(errs.length ? '錯誤：' + errs.join(' | ') : '（無錯誤）');
await b.close();
