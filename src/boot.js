// ================= BOOT：載入模組、依序初始化（整合者維護） =================
function bootFail(e) {
  console.error(e);
  const el = document.getElementById('loader'), msg = document.getElementById('loader-msg');
  if (el) el.classList.add('is-error');
  if (msg) msg.textContent = '長卷載入失敗：請確認瀏覽器支援 WebGL 後重新整理，也可以先看文字版故事。' + (e && e.message ? '（' + e.message + '）' : '');
}
function bootYield(msg) {
  const m = document.getElementById('loader-msg');
  if (m && msg) m.textContent = msg;
  return new Promise(r => { let done = false; const go = () => { if (!done) { done = true; setTimeout(r, 0); } }; requestAnimationFrame(go); setTimeout(go, 60); });
}
(async () => {
  try {
    const [m, oc, css2d, bgu, sn, gltf, mo] = await Promise.all([
      import('three'), import('three/addons/controls/OrbitControls.js'), import('three/addons/renderers/CSS2DRenderer.js'),
      import('three/addons/utils/BufferGeometryUtils.js'), import('three/addons/math/SimplexNoise.js'),
      import('three/addons/loaders/GLTFLoader.js'), import('three/addons/libs/meshopt_decoder.module.js')
    ]);
    THREE = m; OrbitControls = oc.OrbitControls; CSS2DRenderer = css2d.CSS2DRenderer; CSS2DObject = css2d.CSS2DObject; BGU = bgu; SimplexNoise = sn.SimplexNoise;
    GLTFLoader = gltf.GLTFLoader; MeshoptDecoder = mo.MeshoptDecoder;
    await bootYield('宣紙緩緩鋪開…');
    DATA.planets.forEach((d, index) => { const p = { id: d.id, data: d, index }; ctx.planets.push(p); ctx.planetById.set(d.id, p); });
    initScene(ctx);
    await bootYield('周敦頤騎蛙出發…');
    if (typeof initUI === 'function') initUI(ctx);
    ctx.start();
    window.__ctx = ctx; window.__booted = true;
    ctx.emit('ready');
    setTimeout(() => { const l = document.getElementById('loader'); if (!l) return; l.classList.add('is-done'); setTimeout(() => { l.hidden = true; }, 600); }, 300); // 淡出後移出 Tab 順序
  } catch (e) { bootFail(e); }
})();
