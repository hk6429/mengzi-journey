import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const THREE = await import('three');
const load = (extra = {}) => {
  const sb = {
    __T: THREE, console, URLSearchParams, ...extra,
    location: { search: '' }, matchMedia: () => ({ matches: false }), localStorage: { getItem: () => null, setItem() {} }
  };
  vm.createContext(sb);
  vm.runInContext(fs.readFileSync('src/core.js', 'utf8') + '\nTHREE = __T;\n' + fs.readFileSync('parts/chibi.js', 'utf8') + '\nglobalThis.R = { lpChibi, lpKit };', sb);
  return sb.R;
};
const { lpChibi, lpKit } = load();   // node 沒有 document：臉部貼圖要降級
const WHO = ['mengzi', 'shun', 'fuyue', 'jiaoge', 'guanzhong', 'sunshuao', 'baili', 'scholar', 'craftsman', 'soldier', 'minister', 'boatman'];
const POSES = ['stand', 'sit', 'wave', 'point', 'bow', 'walk', 'surprised', 'hold', 'read', 'write', 'basket', 'pick', 'reach', 'plough', 'tamp', 'carry', 'bound', 'talk', 'spear', 'pole'];
const FACES = ['smile', 'sad', 'surprised', 'worried', 'calm'];
const meshes = g => { let n = 0; g.traverse(o => { if (o.isMesh) n++; }); return n; };
const bounds = (g, body) => { g.updateMatrixWorld(true); const b = new THREE.Box3(); g.traverse(o => { if (o.isMesh && !(body && o.userData.prop)) b.expandByObject(o); }); return b; };   // body：不算道具（竹篙會伸進水裡）

for (const who of WHO) {
  test(`chibi ${who}`, () => {
    const c = lpChibi({ who, pose: 'stand' });
    assert.ok(c instanceof THREE.Group);
    for (const k of ['anim', 'setOutfit', 'setPose', 'setFace']) assert.equal(typeof c.userData[k], 'function');
    const b = bounds(c, true), h = b.max.y - b.min.y;
    assert.ok(Math.abs(b.min.y) < 0.03, `${who} 腳底在原點（min.y=${b.min.y.toFixed(3)}）`);
    assert.ok(h > 0.92 && h < 1.3, `${who} 身高 ${h.toFixed(2)}`);
    // 臉朝 +z：臉部網格在頭的前方
    const face = c.getObjectByName('face'), fp = new THREE.Vector3();
    face.geometry.computeBoundingBox(); face.localToWorld(face.geometry.boundingBox.getCenter(fp));
    assert.ok(fp.z > 0.1, `${who} 臉朝 +z`);
    for (const p of POSES) { c.userData.setPose(p); c.userData.anim(0.016, 1.234); }
    for (const f of FACES) { c.userData.setFace(f); c.userData.anim(0.016, 2.5); }
    c.userData.setOutfit('armor');
    for (let t = 0; t < 8; t += 0.05) c.userData.anim(0.05, t);   // 眨眼、小動作跑得動
    const n = meshes(c);
    assert.ok(n <= 45, `${who} mesh ${n} ≤ 45`);
    console.log(`  ${who}: ${n} meshes, 高 ${h.toFixed(2)}`);
  });
}

test('預設姿勢與道具：孟子捧竹簡、舜扶耒、傅說持杵、膠鬲提魚簍、管仲戴枷、兵持戈、船夫撐篙；拱手收起；sit 座高、scale', () => {
  const shown = c => { const s = []; c.traverse(o => { if (o.isMesh && o.visible && o.userData.prop) s.push(o.userData.prop); }); return s.sort().join(','); };
  const want = { mengzi: 'slips', shun: '', fuyue: '', jiaoge: 'fishbasket', guanzhong: 'cangue', baili: 'sheepskin', soldier: 'ge', boatman: 'pole', minister: '' };
  for (const [who, p] of Object.entries(want)) assert.equal(shown(lpChibi({ who })), p, who);
  const m = lpChibi({ who: 'mengzi' }); m.userData.setPose('talk'); assert.equal(shown(m), 'slips'); m.userData.setPose('bow'); assert.equal(shown(m), '');
  m.userData.setPose('pole'); assert.equal(shown(m), 'pole'); m.userData.setPose('walk'); assert.equal(shown(m), 'slips');
  assert.ok(Math.abs(lpChibi({ who: 'mengzi', scale: 1.5 }).userData.seatY - 0.3) < 1e-6);
  assert.ok(bounds(lpChibi({ who: 'scholar', scale: 2 })).max.y > 1.9);
  assert.equal(lpChibi({}).userData.who, 'mengzi');
});

test('tag 之後換姿勢、換造型，新網格也帶 pick', () => {
  const kit = lpKit({ id: 'loom', radius: 3, color: '#fff' });
  const c = kit.tag(lpChibi({ who: 'jiaoge' }), 'mom');
  c.userData.setPose('read');
  c.traverse(o => { if (o.isMesh) assert.equal(o.userData.pick?.el, 'mom'); });
});

test('canvas 不可用時臉部降級、可用時臉部貼圖快取共用', () => {
  const bad = load({ document: { createElement: () => ({ getContext: () => null }) } });
  const c = bad.lpChibi({ who: 'mengzi' });
  assert.equal(c.getObjectByName('face').visible, false);
  let made = 0;
  const fakeCtx = new Proxy({}, { get: (t, k) => (k in t ? t[k] : () => ({ addColorStop() {} })), set: (t, k, v) => { t[k] = v; return true; } });
  const ok = load({ document: { createElement: () => { made++; return { width: 0, height: 0, getContext: () => fakeCtx }; } } });
  const a = ok.lpChibi({ who: 'craftsman', seed: 1 }), b = ok.lpChibi({ who: 'craftsman', seed: 3 });
  assert.equal(a.getObjectByName('face').visible, true);
  assert.equal(a.getObjectByName('face').material, b.getObjectByName('face').material, '同臉型同表情共用材質');
  const before = made; ok.lpChibi({ who: 'craftsman', seed: 5 }); assert.equal(made, before, '不重畫');
});
