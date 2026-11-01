import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const THREE = await import('three');
const BGU = await import('three/examples/jsm/utils/BufferGeometryUtils.js');
const sb = {
  __T: THREE, __B: BGU, console, URLSearchParams,
  location: { search: '' }, matchMedia: () => ({ matches: false }), localStorage: { getItem: () => null, setItem() {} }
};
vm.createContext(sb);
// 和 boot 一樣：檔案先全部載入，THREE 之後才指定（建造器外層不能直接用 THREE）
vm.runInContext(['src/core.js', 'src/data.js', 'parts/chibi.js', 'parts/planets-a.js'].map(f => fs.readFileSync(f, 'utf8')).join('\n') +
  '\nTHREE = __T; BGU = __B;\nglobalThis.R = { LP_BUILD, DATA, lpKit };', sb);
const { LP_BUILD, DATA, lpKit } = sb.R;

const R_MAX = 4.6;            // 崖島平台半徑 5，A/B 的東西放在 4.6 內
const HERO = [0, 2.6], HERO_R = 0.7;   // 主角孟子預設站位與淨空半徑
const OWN_MAX = 220;          // 自建 mesh 上限（不含 chibi）
const DOCK_W = 8, DOCK_R = 4.3;       // 碼頭方向 ±8°、半徑 4.3 以外留給 C 的木碼頭與石階

// 走訪所有頂點（世界座標，含 InstancedMesh 每個實例）
function eachVertex(g, fn) {
  const v = new THREE.Vector3();
  g.traverse(o => {
    if (!o.isMesh) return;
    const pos = o.geometry.attributes.position, mats = [];
    if (o.isInstancedMesh) for (let k = 0; k < o.count; k++) { const im = new THREE.Matrix4(); o.getMatrixAt(k, im); mats.push(im.premultiply(o.matrixWorld)); }
    else mats.push(o.matrixWorld);
    for (const mw of mats) for (let i = 0; i < pos.count; i++) fn(v.fromBufferAttribute(pos, i).applyMatrix4(mw), o);
  });
}
const inChibi = o => { for (let q = o; q; q = q.parent) if (q.userData.isChibi) return true; return false; };
const build = (id, extra = {}) => {
  const d = DATA.planets.find(p => p.id === id), kit = Object.assign(lpKit(d), extra), g = LP_BUILD[id](kit);
  kit.anim.forEach(f => { f(0.016, 1.3); f(0.016, 4.2); });   // 動畫跑得動
  g.updateMatrixWorld(true);
  return { d, kit, g };
};

for (const id of ['fields', 'market', 'road']) {
  test(`站 ${id}：建出完整一站`, () => {
    assert.equal(typeof LP_BUILD[id], 'function');
    const { d, g } = build(id);
    assert.ok(g instanceof THREE.Group, '回傳 Group');

    // 每個 element 都有 tag，tag 都是 DATA 的元素
    const tags = new Set();
    g.traverse(o => { if (o.isMesh && o.userData.pick) tags.add(o.userData.pick.el); });
    d.elements.forEach(e => assert.ok(tags.has(e.id), `元素 ${e.id} 有 tag`));
    for (const t of tags) assert.ok(d.elements.some(e => e.id === t), `tag ${t} 是 DATA 的元素`);

    // 所有頂點在平台半徑 4.6 內；主角站位半徑 0.7 內淨空（貼地 0.03 以下的鋪面可以）
    let far = 0;
    eachVertex(g, (v, o) => {
      const r = Math.hypot(v.x, v.z);
      if (r > R_MAX) assert.fail(`${id} 超出半徑 ${R_MAX}：(${v.x.toFixed(2)}, ${v.y.toFixed(2)}, ${v.z.toFixed(2)}) r=${r.toFixed(2)} ${o.userData.pick?.el || ''}`);
      far = Math.max(far, r);
      if (v.y > 0.03 && Math.hypot(v.x - HERO[0], v.z - HERO[1]) < HERO_R)
        assert.fail(`${id} 主角站位有東西：(${v.x.toFixed(2)}, ${v.y.toFixed(2)}, ${v.z.toFixed(2)}) ${o.userData.pick?.el || ''}`);
    });

    // standSpots：{elId:[x,z]}，在平台內，0.35 內沒有高過 0.3 的東西
    const ss = g.userData.standSpots || {};
    for (const e of d.elements) {
      const s = ss[e.id];
      assert.ok(Array.isArray(s) && s.length === 2, `${id}/${e.id} 有 standSpot [x,z]`);
      assert.ok(Math.hypot(...s) <= R_MAX - 0.3, `${id}/${e.id} standSpot ${s} 在平台內`);
    }
    eachVertex(g, v => {
      if (v.y < 0.3) return;
      for (const [el, s] of Object.entries(ss)) if (Math.hypot(v.x - s[0], v.z - s[1]) < 0.35) assert.fail(`${id}/${el} 站位 ${s} 0.35 內有高物件 (${v.x.toFixed(2)}, ${v.y.toFixed(2)}, ${v.z.toFixed(2)})`);
    });

    // 四面都有東西：右前、右後、左後、左前四個象限都有高過 0.5 的物件（正前方留給主角與鏡頭）
    const quad = [0, 0, 0, 0];
    eachVertex(g, v => { if (v.y > 0.5) quad[Math.floor(((Math.atan2(v.x, v.z) * 180 / Math.PI + 360) % 360) / 90)]++; });
    quad.forEach((n, i) => assert.ok(n > 0, `${id} 第 ${i} 象限有東西`));
    assert.ok(Array.isArray(g.userData.rim), `${id} 有 userData.rim`);

    // mesh 上限：自建（含 fallback，不含 chibi）≤ 220
    let own = 0, chibis = 0;
    g.traverse(o => { if (o.userData.isChibi) chibis++; if (o.isMesh && !inChibi(o)) own++; });
    assert.ok(own <= OWN_MAX, `${id} 自建 mesh ${own} ≤ ${OWN_MAX}`);
    console.log(`${id}: 自建 ${own} mesh（含 fallback）、人物 ${chibis} 個、最遠 r=${far.toFixed(2)}`);
  });

  test(`站 ${id}：碼頭方向與配角朝向`, () => {
    const { g } = build(id);
    const n = g.userData.dock;
    assert.equal(typeof n, 'number', `${id} 有 userData.dock`);
    assert.ok(Math.cos(n * Math.PI / 180) < 0.7, `${id} 碼頭 ${n}° 不在正前方 ±45° 擋鏡頭`);
    assert.ok(!(g.userData.rim || []).some(a => Math.abs((((a - n) % 360) + 540) % 360 - 180) < 20), `${id} rim 避開碼頭`);
    eachVertex(g, v => {
      if (v.y < 0.05) return;
      const r = Math.hypot(v.x, v.z), a = Math.atan2(v.x, v.z) * 180 / Math.PI, da = Math.abs((((a - n) % 360) + 540) % 360 - 180);
      if (r > DOCK_R && da < DOCK_W) assert.fail(`${id} 碼頭 ${n}° 口有東西：(${v.x.toFixed(2)}, ${v.y.toFixed(2)}, ${v.z.toFixed(2)})`);
    });
    // 配角臉朝 +z 鏡頭（cos ≥ 0.5）
    g.traverse(o => {
      if (!o.userData.isChibi) return;
      const f = new THREE.Vector3(0, 0, 1).applyQuaternion(o.getWorldQuaternion(new THREE.Quaternion()));
      assert.ok(f.z >= 0.5, `${id} 配角 ${o.userData.pick?.el} 臉朝鏡頭 cos=${f.z.toFixed(2)}`);
    });
  });
}
