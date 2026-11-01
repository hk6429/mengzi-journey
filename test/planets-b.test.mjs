import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const THREE = await import('three');
const { SimplexNoise } = await import('three/examples/jsm/math/SimplexNoise.js');
const BGU = await import('three/examples/jsm/utils/BufferGeometryUtils.js');

// core 的 let THREE… 由第二段腳本塞值；data、chibi、planets-b 接著在同一個 context 執行
const c = vm.createContext({
  __T: THREE, __SN: SimplexNoise, __BGU: BGU, URLSearchParams, location: { search: '' },
  matchMedia: () => ({ matches: false }), localStorage: { getItem: () => null, setItem() {} }, console
});
vm.runInContext(fs.readFileSync('src/core.js', 'utf8'), c);
vm.runInContext(fs.readFileSync('src/data.js', 'utf8'), c);
vm.runInContext(fs.readFileSync('parts/chibi.js', 'utf8'), c);
vm.runInContext(fs.readFileSync('parts/planets-b.js', 'utf8'), c);   // 和 boot 一樣：載入時 THREE 還沒到
vm.runInContext('THREE = __T; SimplexNoise = __SN; BGU = __BGU;', c);
const { LP_BUILD, lpKit, DATA } = vm.runInContext('({ LP_BUILD, lpKit, DATA })', c);

const R_MAX = 4.6, HERO = [0, 2.6], HERO_R = 0.7, MESH_MAX = 220;
const inChibi = o => { for (let q = o; q; q = q.parent) if (q.userData.chibi) return true; return false; };
const m4 = new THREE.Matrix4(), v = new THREE.Vector3();
const mats = o => o.isInstancedMesh ? Array.from({ length: o.count }, (_, i) => (o.getMatrixAt(i, m4), m4.clone().premultiply(o.matrixWorld))) : [o.matrixWorld];
// 每個 mesh（Instanced 逐個 instance）的世界 bbox
function boxes(root) {
  const out = []; root.updateMatrixWorld(true);
  root.traverse(o => {
    if (!o.isMesh) return;
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    for (const m of mats(o)) out.push({ o, b: o.geometry.boundingBox.clone().applyMatrix4(m) });
  });
  return out;
}
// 逐頂點量最遠的水平半徑（bbox 角落對圓形物件太保守）
function farthest(root) {
  let worst = { r: 0 }; root.updateMatrixWorld(true);
  root.traverse(o => {
    if (!o.isMesh) return;
    const pos = o.geometry.attributes.position;
    for (const m of mats(o)) for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i).applyMatrix4(m); const r = Math.hypot(v.x, v.z); if (r > worst.r) worst = { r, o }; }
  });
  return worst;
}
const dXZ = (b, x, z) => Math.hypot(Math.max(b.min.x - x, 0, x - b.max.x), Math.max(b.min.z - z, 0, z - b.max.z));
const label = o => { for (let q = o; q; q = q.parent) if (q.userData.pick) return q.userData.pick.el; return o.geometry.type; };

for (const id of ['jing', 'xiang', 'pin', 'lianxi']) {
  test(id, () => {
    const d = DATA.planets.find(p => p.id === id), P = lpKit(d);
    const g = LP_BUILD[id](P);
    assert.ok(g instanceof THREE.Group, '回傳 Group');
    let own = 0, all = 0; const tags = new Set();
    g.traverse(o => { if (o.isMesh) { all++; if (!inChibi(o)) own++; if (o.userData.pick) tags.add(o.userData.pick.el); } });
    assert.ok(own <= MESH_MAX, `B 線自己的 mesh 數 ${own}（不含 chibi）超過 ${MESH_MAX}`);
    assert.deepEqual([...tags].sort(), [...d.elements.map(e => e.id)].sort(), '每個元素都要 tag');

    // 圓形平台：所有頂點（含 chibi）在半徑 4.6 內
    const far = farthest(g);
    assert.ok(far.r <= R_MAX, `超出半徑 ${R_MAX}：${label(far.o)} r=${far.r.toFixed(2)}`);

    const B = boxes(g);
    // 主角站位 (0, 2.6) 半徑 0.7 淨空：只允許貼地 0.04 以下的鋪面
    for (const { o, b } of B) if (b.max.y > 0.04) assert.ok(dXZ(b, ...HERO) >= HERO_R, `主角站位旁有東西：${label(o)} 距離 ${dXZ(b, ...HERO).toFixed(2)}`);

    // standSpots：{elId:[x,z]}，在平台內、離元素 0.3–1.2、腳下 0.2 內沒有低於 1.3 的實體
    const spots = g.userData.standSpots;
    assert.ok(spots, '要有 standSpots');
    const report = [];
    for (const e of d.elements) {
      const s = spots[e.id];
      assert.ok(Array.isArray(s) && s.length === 2, `${e.id} 缺站位`);
      const [x, z] = s;
      assert.ok(Math.hypot(x, z) <= R_MAX - 0.3, `${e.id} 站位超出平台`);
      const near = Math.min(...B.filter(k => k.o.userData.pick?.el === e.id).map(k => dXZ(k.b, x, z)));
      assert.ok(near >= 0.3 && near <= 1.2, `${e.id} 站位離元素 ${near.toFixed(2)}`);
      const hit = B.find(k => k.b.min.y < 1.3 && k.b.max.y > 0.05 && dXZ(k.b, x, z) < 0.2);
      assert.ok(!hit, `${e.id} 站位上有東西：${hit && label(hit.o)}`);
      report.push(e.id + '=' + near.toFixed(2));
    }
    assert.ok(Array.isArray(g.userData.rim) && g.userData.rim.length >= 2 && g.userData.rim.length <= 4, 'rim 給 2–4 個角度');
    console.log(id, `mesh=${own}（含 chibi ${all}）`, `最遠 r=${far.r.toFixed(2)}`, report.join(' '));

    // notch：荷葉缺口方向（度），不對 +z；缺口楔形（±18°、r>3）內沒有高出葉面的東西
    const n = g.userData.notch, an = a => Math.abs(((a % 360) + 540) % 360 - 180);
    assert.ok(typeof n === 'number' && an(n) >= 60, `notch ${n} 太靠近 +z`);
    g.traverse(o => {
      if (!o.isMesh) return; const pos = o.geometry.attributes.position;
      for (const m of mats(o)) for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i).applyMatrix4(m);
        if (v.y > 0.04 && Math.hypot(v.x, v.z) > 3 && an(Math.atan2(v.x, v.z) * 180 / Math.PI - n) < 18) assert.fail(`缺口楔形裡有東西：${label(o)}`);
      }
    });
    assert.ok(P.anim.length > 0, '要有動畫');
    for (const t of [0.5, 1, 15, 29, 31, 45, 59.5]) P.anim.forEach(f => f(0.016, t));
  });

}
