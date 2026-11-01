// ================= STATIONS A（A 線，愛蓮說第二輪：大荷葉平台）：baihua、ju、mudan、yuni =================
// 每站一片大荷葉（C 線畫葉子本體）：原點＝葉心、葉面 y=0、+z 朝預設鏡頭；內容全放半徑 4.6 內。
// 主角周敦頤預設站位 (0, 0, 2.6)，半徑 0.7 內淨空（只允許貼地 0.03 以下的鋪面）。配角一律 P.chibi()，臉朝 +z 鏡頭。
// userData.notch：荷葉楔形缺口方向（度，0＝+z、90＝+x）；缺口 ±14°、半徑 2 以外不放任何東西。userData.rim：葉緣點綴角度。
// 美術：宋代淡彩工筆，低彩度；材質一律 lpCel。不做 GLB。包在 IIFE 裡，避免和 planets-b 撞名。
(() => {
  const PI = Math.PI;
  const M = (h, o) => (typeof lpCel === 'function' ? lpCel : lpMat)(h, o);
  const basicCache = new Map();
  const MB = (h, o = {}) => { const k = h + JSON.stringify(o); if (!basicCache.has(k)) basicCache.set(k, new THREE.MeshBasicMaterial({ color: h, ...o })); return basicCache.get(k); };
  const C = {
    ink: '#2b2622', wood: '#8a5a3a', woodDk: '#5e3d27', woodLt: '#b08358', stone: '#a9a196', stoneLt: '#c8c1b4',
    straw: '#d8bf86', bamboo: '#b9b27a', bambooDk: '#8f8a55', leafDk: '#3f6a52',
    stem: '#6f8f58', bark: '#5e4433', water: '#a6d6cc', mud: '#4a3a2c', mudDk: '#33291f', ou: '#f2ead6'
  };
  const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const G = {
    box: (w, h, d) => new THREE.BoxGeometry(w, h, d),
    cyl: (rt, rb, h, s = 8, ...a) => new THREE.CylinderGeometry(rt, rb, h, s, ...a),
    cone: (r, h, s = 8) => new THREE.ConeGeometry(r, h, s),
    sph: (r, w = 10, h = 8, ...a) => new THREE.SphereGeometry(r, w, h, ...a),
    ico: (r, d = 0) => new THREE.IcosahedronGeometry(r, d),
    tor: (R, r, rs = 6, ts = 16, arc = PI * 2) => new THREE.TorusGeometry(R, r, rs, ts, arc)
  };
  // 加一個 mesh：A(父, 幾何, 材質, [位置], [旋轉], 縮放)
  function A(p, geo, mat, pos = [0, 0, 0], rot = [0, 0, 0], s = 1) {
    const o = new THREE.Mesh(geo, mat); o.position.fromArray(pos); if (rot) o.rotation.set(rot[0], rot[1], rot[2]);
    Array.isArray(s) ? o.scale.fromArray(s) : o.scale.setScalar(s); p.add(o); return o;
  }
  const grp = (p, pos = [0, 0, 0]) => { const o = new THREE.Group(); o.position.fromArray(pos); if (p) p.add(o); return o; };
  const tube = (pts, r, seg = 20, rs = 6) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), seg, r, rs, false);
  function rod(p, a, b, r, mat, seg = 6) {
    const d = b.clone().sub(a), m = A(p, G.cyl(r, r, d.length(), seg), mat);
    m.position.copy(a).add(b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); return m;
  }
  const flatGeo = (o, mx) => {
    const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
    g.clearGroups(); return g.applyMatrix4(mx);
  };
  // 靜態群組：同材質合併成一個 mesh
  function bake(g) {
    g.updateMatrixWorld(true);
    const inv = g.matrixWorld.clone().invert(), by = new Map(), keep = [];
    g.traverse(o => {
      if (o.isInstancedMesh) { keep.push(o); return; }
      if (!o.isMesh) return;
      if (!by.has(o.material)) by.set(o.material, []);
      by.get(o.material).push(flatGeo(o, new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld)));
    });
    g.clear();
    by.forEach((list, mat) => g.add(new THREE.Mesh(BGU.mergeGeometries(list), mat)));
    keep.forEach(o => { new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld).decompose(o.position, o.quaternion, o.scale); g.add(o); });
    return g;
  }
  function geoOf(build) {
    const t = grp(); build(t); t.updateMatrixWorld(true);
    const list = []; t.traverse(o => { if (o.isMesh) list.push(flatGeo(o, o.matrixWorld)); });
    return BGU.mergeGeometries(list);
  }
  function inst(p, geo, mat, list, colors) {   // list: [[x,y,z, ry, s], ...]
    const dummy = new THREE.Object3D(), im = new THREE.InstancedMesh(geo, mat, list.length), col = new THREE.Color();
    list.forEach(([x, y, z, ry = 0, s = 1], i) => { dummy.position.set(x, y, z); dummy.rotation.set(0, ry, 0); Array.isArray(s) ? dummy.scale.fromArray(s) : dummy.scale.setScalar(s); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix); if (colors) im.setColorAt(i, col.set(colors[i % colors.length])); });
    p.add(im); return im;
  }
  function instQ(p, geo, mat, list, colors) {   // list: [[x,y,z, rx(傾),ry(方位),rz, s or [sx,sy,sz]], ...]；先傾再轉方位（YXZ）
    const d = new THREE.Object3D(), im = new THREE.InstancedMesh(geo, mat, list.length), col = new THREE.Color();
    d.rotation.order = 'YXZ';
    list.forEach(([x, y, z, rx = 0, ry = 0, rz = 0, s = 1], i) => {
      d.position.set(x, y, z); d.rotation.set(rx, ry, rz); Array.isArray(s) ? d.scale.fromArray(s) : d.scale.setScalar(s); d.updateMatrix(); im.setMatrixAt(i, d.matrix);
      if (colors) im.setColorAt(i, col.set(colors[i % colors.length]));
    });
    p.add(im); return im;
  }
  // 配角：chibi 介面（C 線）；動畫交給 chibi 自己
  function chibi(P, p, spec, x, z, yaw = 0, el) {
    const c = P.chibi(spec); P.at(c, x, z, yaw); p.add(c);
    c.userData.isChibi = true;
    if (el) P.tag(c, el);
    P.anim.push((dt, t) => c.userData.anim && c.userData.anim(dt, t));
    return c;
  }
  const lathe = (prof, seg = 18) => new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), seg);
  const hash3 = (x, y, z) => { const s = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453; return s - Math.floor(s); };

  // ================= 共用：站位、缺口、散點、葉面小景 =================
  const HERO = [0, 2.6];
  const faceTo = (x, z, tx, tz) => Math.atan2(tx - x, tz - z) * 180 / PI;   // P.at 的 yaw（度）
  const CAMF = (x, z) => faceTo(x, z, x * 0.35, 7);   // 臉朝 +z 鏡頭（略收向中線）
  const polar = (a, r) => [Math.sin(a * PI / 180) * r, Math.cos(a * PI / 180) * r];
  const geoCache = {};
  const once = (k, f) => geoCache[k] || (geoCache[k] = f());
  const pick = (rnd, arr) => arr[Math.floor(rnd() * arr.length)];
  const angDist = (a, b) => Math.abs((((a - b) % 360) + 540) % 360 - 180);
  // 荷葉缺口：方向 n（度）±w、半徑 2 以外不放東西
  const inNotch = (x, z, n, w = 14) => angDist(Math.atan2(x, z) * 180 / PI, n) < w && Math.hypot(x, z) > 2.0;
  function scatter(rnd, n, avoid, rMin = 0.3, rMax = 4.3, notch = null) {
    const out = [];
    for (let k = 0; out.length < n && k < n * 60; k++) {
      const a = rnd() * PI * 2, r = Math.sqrt(rMin * rMin + rnd() * (rMax * rMax - rMin * rMin)), x = Math.sin(a) * r, z = Math.cos(a) * r;
      if (notch !== null && inNotch(x, z, notch, 18)) continue;
      if (avoid.some(([ax, az, ar]) => Math.hypot(x - ax, z - az) < ar)) continue;
      if (out.some(([ox, , oz]) => Math.hypot(x - ox, z - oz) < 0.22)) continue;
      out.push([x, 0, z, rnd() * PI * 2, 0.7 + rnd() * 0.6]);
    }
    return out;
  }
  const dewGeo = () => once('dew', () => G.sph(0.045, 12, 8).scale(1, 0.55, 1));
  const dewMat = () => M('#e9f7f3', { transparent: true, opacity: 0.6 });
  // 露水珠（透明亮點）＋落瓣：葉面還是荷葉的證據
  function leafDetail(P, g, avoid, notch, o = {}) {
    const rnd = P.rnd, av = [[HERO[0], HERO[1], 0.8], ...avoid], d = grp(g);
    const dew = scatter(rnd, o.dew ?? 12, av, 0.9, 4.3, notch).map(([x, , z, r, s]) => [x, 0.022 * s, z, r, s]);
    inst(d, dewGeo(), dewMat(), dew);
    inst(d, once('dewH', () => G.sph(0.012, 6, 4).translate(-0.014, 0.018, 0.014)), MB('#ffffff'), dew);
    if (o.petals) {
      const pl = scatter(rnd, o.nPetals ?? 26, [[HERO[0], HERO[1], 0.3]], 0.5, 4.3, notch).map(([x, , z, r, s]) => [x, 0.006, z, r, s]);
      inst(d, once('petal', () => G.sph(0.05, 8, 4).scale(1, 0.12, 0.6)), M('#ffffff'), pl, pl.map(() => pick(rnd, o.petals)));
    }
    return d;
  }
  // 薄土／石板地：以葉心為圓心、各方向半徑 rf(角度°) 的不規則面（貼地，邊緣看得到荷葉）
  function soil(g, rf, y, color, seg = 72) {
    const s = new THREE.Shape();
    for (let i = 0; i < seg; i++) {
      const a = i / seg * 360, r = rf(a) * (1 + 0.05 * Math.sin(a * 0.31) + 0.03 * Math.sin(a * 1.7));
      const [x, z] = polar(a, r); i ? s.lineTo(x, -z) : s.moveTo(x, -z);
    }
    return A(g, new THREE.ShapeGeometry(s).rotateX(-PI / 2), M(color), [0, y, 0]);
  }
  // 小荷葉（立在梗上的碗形葉）
  const bowlLeaf = () => once('bowlLeaf', () => lathe([[0, 0], [0.12, 0.02], [0.3, 0.06], [0.45, 0.12], [0.52, 0.17], [0.54, 0.2]], 20));
  const stemGeo = () => once('lstem', () => G.cyl(0.016, 0.022, 1, 6).translate(0, 0.5, 0));
  const reedGeo = () => once('reed', () => geoOf(t => { for (let k = 0; k < 8; k++) { const a = k / 8 * PI * 2, h = 0.55 + (k % 3) * 0.15; A(t, G.cone(0.025, h, 3).scale(1, 1, 0.35), null, [Math.cos(a) * 0.05, h / 2, Math.sin(a) * 0.05], [Math.sin(a) * 0.18, 0, -Math.cos(a) * 0.18]); } }));

  // ================= 花：荷、牡丹、菊、各種園花 =================
  // 一層花瓣：n 瓣、往外傾 tilt、瓣長 L（瓣寬 W·L、厚 0.2L）
  const petalLayer = (n, tilt, L, ph = 0, W = 0.45) => geoOf(t => {
    for (let k = 0; k < n; k++) { const yw = grp(t); yw.rotation.y = k / n * PI * 2 + ph; const tl = grp(yw); tl.rotation.x = tilt; A(tl, G.sph(1, 8, 6), null, [0, L * 0.55, 0], null, [L * W, L * 0.55, L * 0.2]); }
  });
  const LOTUS = ['#f6d3dd', '#f2c1d0', '#fae3ea', '#f8d9e2'];
  // 荷花叢：items [x, y0, z, 梗高, 縮放, bud]
  function lotusSet(P, p, items) {
    const fl = items.filter(i => !i[5]), bd = items.filter(i => i[5]);
    instQ(p, stemGeo(), M(C.stem), items.map(([x, y, z, h, s]) => [x, y, z, 0, 0, 0, [s, h, s]]));
    if (fl.length) {
      const at = fl.map(([x, y, z, h, s]) => [x, y + h, z, P.rnd() * 6, s]);
      inst(p, once('lout', () => petalLayer(8, 0.95, 0.22)), M('#ffffff'), at, fl.map(() => pick(P.rnd, LOTUS)));
      inst(p, once('lin', () => petalLayer(7, 0.42, 0.19, 0.4)), M('#fbf3f4'), at);
      inst(p, once('lpod', () => G.cyl(0.055, 0.04, 0.05, 10).translate(0, 0.08, 0)), M('#d9cf6e'), at);
    }
    if (bd.length) inst(p, once('lbud', () => petalLayer(5, 0.14, 0.22, 0, 0.5)), M('#f2c1d0'), bd.map(([x, y, z, h, s]) => [x, y + h, z, 0, s]));
  }
  // 牡丹：三圈層疊花瓣（外攤內收）＋金黃花心；葉叢
  const peonyGeo = () => once('peony', () => geoOf(t => {
    for (const [n, off, tilt, s, ph] of [[8, 0.15, 0.2, 1, 0], [7, 0.11, 0.6, 0.85, 0.45], [6, 0.055, 1.05, 0.7, 0.9]]) for (let k = 0; k < n; k++) {
      const a = k / n * PI * 2 + ph;
      A(t, G.sph(0.13, 8, 5), null, [Math.cos(a) * off, 0.05 + (1 - s) * 0.16, Math.sin(a) * off], [0, -a, tilt], [1.05 * s, 0.4, 0.85 * s]);
    }
  }));
  const peonyCtr = () => once('pctr', () => G.sph(0.05, 8, 6).translate(0, 0.17, 0));
  const bushGeo = () => once('pbush', () => geoOf(t => { [[0, 0.22, 0, 0.3], [0.25, 0.16, 0.08, 0.22], [-0.24, 0.16, -0.06, 0.24], [0.04, 0.17, -0.25, 0.2], [-0.06, 0.15, 0.24, 0.2]].forEach(([x, y, z, r]) => A(t, G.ico(r, 1), null, [x, y, z], null, [1, 0.72, 1])); }));
  const PEONY = ['#c8506a', '#b83a52', '#a8457a', '#e594ad', '#f1c2cf', '#f6ecea', '#d2607c', '#9c2f4a'];
  // 菊：扁平細長瓣兩圈（外圈微微下垂、內圈往上收）＋花心＋葉莖；不用尖錐（近看像海膽）
  const mumGeo = () => once('mum', () => {
    const ps = [G.ico(0.035, 1).translate(0, 0.33, 0)];
    for (const [n, L, droop, ph] of [[16, 0.15, 0.22, 0], [11, 0.1, -0.55, 0.3]]) for (let k = 0; k < n; k++)
      ps.push(G.sph(1, 6, 4).scale(0.02, 0.007, L / 2).translate(0, 0, L / 2 + 0.015).rotateX(droop).rotateY(k / n * PI * 2 + ph).translate(0, 0.32, 0));
    return BGU.mergeGeometries(ps.map(g => { g.deleteAttribute('uv'); return g.index ? g.toNonIndexed() : g; }));
  });
  const mumStem = () => once('mstem', () => geoOf(t => {
    A(t, G.cyl(0.01, 0.013, 0.32, 4), null, [0, 0.16, 0]);
    for (const [y, a] of [[0.08, 0], [0.15, 2.2], [0.22, 4.3], [0.12, 5.4]]) A(t, G.sph(0.05, 6, 4), null, [Math.cos(a) * 0.04, y, Math.sin(a) * 0.04], [0, -a, -0.7], [1, 0.3, 0.6]);
  }));
  const MUMS = ['#e8bf3a', '#f0cf55', '#dca62e', '#f2d873', '#e6b23f', '#f3e3a8'];
  // 小花頭（五瓣平開）
  const blossomGeo = () => once('bls', () => geoOf(t => { for (let k = 0; k < 5; k++) { const a = k / 5 * PI * 2; A(t, G.sph(0.045, 6, 4), null, [Math.cos(a) * 0.045, 0, Math.sin(a) * 0.045], [0, -a, 0], [1, 0.3, 0.7]); } }));
  // 陶盆（車床輪廓）
  const potGeo = () => once('pot', () => lathe([[0, 0], [0.13, 0], [0.15, 0.03], [0.19, 0.2], [0.22, 0.24], [0.2, 0.25]], 14));
  // 開花小樹（桃、李）：曲幹＋花團（實例）
  function blossomTree(p, x, z, s, cols, rnd, leafC = '#7fa66e') {
    const t = grp(p, [x, 0, z]); t.scale.setScalar(s); t.rotation.y = rnd() * PI * 2;
    const br = grp(t), bark = M(C.bark);
    A(br, tube([V(0, 0, 0), V(0.1, 0.5, 0), V(-0.05, 0.95, 0.05), V(0.05, 1.25, 0)], 0.09, 14, 7), bark);
    A(br, G.cyl(0.13, 0.2, 0.1, 8), bark, [0, 0.05, 0]);
    [[V(0.05, 1.0, 0), V(0.45, 1.3, 0.1), V(0.7, 1.55, 0)], [V(0, 0.95, 0), V(-0.4, 1.25, -0.1), V(-0.65, 1.5, 0)], [V(0.05, 1.2, 0), V(0.0, 1.6, 0.2), V(0.1, 1.85, 0.1)], [V(0.05, 1.1, 0), V(0.15, 1.35, -0.4), V(0.2, 1.6, -0.55)]]
      .forEach(l => A(br, tube(l, 0.045, 10, 5), bark));
    bake(br);
    const tips = [[0.7, 1.55, 0], [-0.65, 1.5, 0], [0.1, 1.85, 0.1], [0.2, 1.6, -0.55], [0.35, 1.4, 0.35], [-0.3, 1.45, 0.4], [0, 1.7, -0.2]], fl = [], lv = [];
    tips.forEach(([tx, ty, tz], i) => { for (let k = 0; k < 4; k++) { const a = i * 2.1 + k * 1.6, r = 0.14 + (k % 2) * 0.1; (k === 3 ? lv : fl).push([tx + Math.cos(a) * r, ty + Math.sin(a * 1.3) * 0.1, tz + Math.sin(a) * r, a, 0.75 + ((i + k) % 3) * 0.2]); } });
    inst(t, once('crown', () => G.ico(0.17, 1)), M('#ffffff'), fl, fl.map(() => pick(rnd, cols)));
    inst(t, once('crownL', () => G.ico(0.13, 0)), M(leafC, { flat: true }), lv);
    return t;
  }

  // ================= 1. baihua 水陸草木之花，可愛者甚蕃 =================
  // 左前：葉緣一灣淺水（浮萍、菱花、菖蒲、漣漪）＝水上的花；四周：桃、李、木槿、萱草、蘭草、盆花＝岸上的花；右前：石墩上一卷書
  function hibiscus(p, x, z) {
    const t = grp(p, [x, 0, z]);
    inst(t, once('hbl', () => G.ico(0.22, 1).scale(1, 0.85, 1)), M('#5f8a55'), [[0, 0.4, 0, 0, 1.2], [0.22, 0.32, 0.1, 1, 1], [-0.2, 0.3, -0.05, 2, 1], [0.05, 0.62, -0.05, 3, 0.9], [-0.05, 0.3, 0.22, 4, 0.9], [0.1, 0.35, -0.24, 5, 0.9]]);
    const fl = []; for (let k = 0; k < 12; k++) { const a = k * 2.4, r = 0.24 + (k % 3) * 0.04; fl.push([Math.cos(a) * r, 0.3 + (k % 4) * 0.12, Math.sin(a) * r, a, 1.1]); }
    inst(t, blossomGeo(), M('#ffffff'), fl, ['#c98bc4', '#d9a3d2', '#b874b0']);
    inst(t, once('hctr', () => G.sph(0.02, 6, 4)), M('#7a2a5a'), fl.map(([a, b, c, d]) => [a, b + 0.015, c, d, 1]));
    return t;
  }
  function daylily(p, x, z, s = 1) {
    const t = grp(p, [x, 0, z]); t.scale.setScalar(s);
    const lv = []; for (let k = 0; k < 10; k++) { const a = k / 10 * PI * 2 + 0.3; lv.push([Math.sin(a) * 0.05, 0, Math.cos(a) * 0.05, 0.5 + (k % 3) * 0.15, a, 0, [1, 1 + (k % 2) * 0.25, 1]]); }
    instQ(t, once('dlleaf', () => G.cone(0.035, 0.6, 4).scale(1, 1, 0.3).translate(0, 0.3, 0)), M('#6a9a5a'), lv);
    const st = [[0.05, 0.02], [-0.08, 0.05], [0.02, -0.08]];
    st.forEach(([sx, sz], i) => rod(t, V(sx, 0, sz), V(sx * 3, 0.78 + i * 0.06, sz * 3), 0.01, M(C.stem), 4));
    instQ(t, once('dlfl', () => petalLayer(6, 0.75, 0.13)), M('#e08a3a'), st.map(([sx, sz], i) => [sx * 3, 0.78 + i * 0.06, sz * 3, 0.45, Math.atan2(sx, sz), 0, 1]));
    return t;
  }
  function orchidPot(p, x, z) {
    const t = grp(p, [x, 0, z]);
    A(t, G.cyl(0.2, 0.24, 0.24, 10), M(C.stoneLt), [0, 0.12, 0]);   // 石座
    A(t, lathe([[0, 0], [0.14, 0], [0.17, 0.06], [0.18, 0.2], [0.2, 0.22]], 14), M('#e7e3d6', { side: THREE.DoubleSide }), [0, 0.24, 0]);   // 白瓷盆
    A(t, G.cyl(0.17, 0.17, 0.02, 12), M(C.mudDk), [0, 0.43, 0]);
    const lf = M('#4f7a4a');
    for (let k = 0; k < 9; k++) {
      const a = k / 9 * PI * 2, L = 0.45 + (k % 3) * 0.12;
      A(t, tube([V(0, 0.43, 0), V(Math.sin(a) * L * 0.25, 0.43 + L * 0.65, Math.cos(a) * L * 0.25), V(Math.sin(a) * L * 0.7, 0.43 + L * 0.55, Math.cos(a) * L * 0.7)], 0.012, 10, 3), lf);
    }
    bake(t);
    inst(t, blossomGeo(), M('#d8cde6'), [[0.08, 0.78, 0.05], [-0.06, 0.72, -0.07], [0.02, 0.84, -0.02], [0.12, 0.7, -0.08]].map(([a, b, c], i) => [a, b, c, i, 0.7]));
    return t;
  }
  function stoneStool(p, x, z, r = 0.32, h = 0.42, seed = 1) {
    const g = new THREE.CylinderGeometry(r * 0.92, r, h, 10, 2); g.translate(0, h / 2, 0);
    const pp = g.attributes.position;
    for (let i = 0; i < pp.count; i++) { const k = 1 + (hash3(pp.getX(i) * 7 + seed, pp.getY(i) * 5, pp.getZ(i) * 7) - 0.5) * 0.12; if (pp.getY(i) > 0.001 && pp.getY(i) < h - 0.001) pp.setXYZ(i, pp.getX(i) * k, pp.getY(i), pp.getZ(i) * k); }
    g.computeVertexNormals();
    return A(p, g, M('#a8a094', { flat: true }), [x, 0, z]);
  }
  LP_BUILD.baihua = P => {
    const g = new THREE.Group(), ss = {}, rnd = P.rnd, NOTCH = 145;
    // ---- 水上的花：葉緣一灣淺水 ----
    const PC = [-2.45, 1.15], PR = [1.15, 0.85];
    const pond = grp(g, [PC[0], 0, PC[1]]);
    A(pond, new THREE.CircleGeometry(1, 32).rotateX(-PI / 2), M('#6f9f88'), [0, 0.008, 0], null, [PR[0] * 0.95, 1, PR[1] * 0.95]);
    A(pond, new THREE.CircleGeometry(1, 32).rotateX(-PI / 2), M(C.water, { transparent: true, opacity: 0.72, depthWrite: false }), [0, 0.022, 0], null, [PR[0], 1, PR[1]]);
    A(pond, G.tor(1, 0.05, 5, 40), M('#6f9a5c'), [0, 0.024, 0], [PI / 2, 0, 0], [PR[0], PR[1], 0.5]);
    const rip = [0, 1].map(() => A(pond, G.tor(0.35, 0.008, 3, 28), MB('#eef7f3', { transparent: true, opacity: 0.6, depthWrite: false }), [0.2, 0.028, -0.1], [PI / 2, 0, 0]));
    P.anim.push((dt, t) => rip.forEach((r, k) => { const u = (t * 0.3 + k * 0.5) % 1; r.scale.set(0.4 + u * 1.3, 0.4 + u * 1.0, 1); r.material.opacity = 0.6 * (1 - u); }));
    inst(pond, reedGeo(), M('#6f9a5a'), [[-0.85, 0, -0.35, 0, 1.2], [-0.55, 0, -0.65, 1, 1.0], [-1.0, 0, 0.1, 2, 0.9]]);   // 菖蒲
    P.tag(pond, 'pond');
    const wf = grp(g, [PC[0], 0, PC[1]]);
    const duck = []; for (let k = 0; k < 46; k++) { const a = rnd() * PI * 2, r = Math.sqrt(rnd()) * 0.85; duck.push([Math.cos(a) * r * PR[0], 0.03, Math.sin(a) * r * PR[1], rnd() * 6, 0.7 + rnd() * 0.6]); }
    inst(wf, once('duck', () => new THREE.CircleGeometry(0.04, 7).rotateX(-PI / 2)), M('#ffffff'), duck, ['#7fae5a', '#93bd68', '#6e9e4e']);
    const lingA = [[0.35, 0.2], [-0.25, -0.35], [0.55, -0.4], [-0.15, 0.4], [0.05, -0.05]].map(([x, z], i) => [x, 0.032, z, i * 1.3, 1.3]);
    inst(wf, once('ling', () => geoOf(t => { for (let k = 0; k < 7; k++) A(t, G.box(0.09, 0.008, 0.09), null, [Math.cos(k * 0.9) * 0.09, 0, Math.sin(k * 0.9) * 0.09], [0, -k * 0.9 + PI / 4, 0]); })), M('#5f8a4a'), lingA);
    inst(wf, once('lingF', () => geoOf(t => { for (let k = 0; k < 4; k++) A(t, G.sph(0.03, 6, 4), null, [Math.cos(k * PI / 2) * 0.028, 0.03, Math.sin(k * PI / 2) * 0.028], [0, -k * PI / 2, 0], [1, 0.3, 0.7]); })), M('#fbf7ef'), lingA);
    P.tag(wf, 'waterflower');
    ss.pond = [-1.25, 2.0]; ss.waterflower = [-1.5, 0.15];

    // ---- 岸上的花 ----
    const lf = grp(g);
    blossomTree(lf, -1.55, -2.75, 1.05, ['#f2b9c7', '#eba3b6', '#f6cbd5', '#e793aa'], rnd);   // 桃
    blossomTree(lf, 3.2, -0.45, 0.9, ['#fbf7f1', '#f4efe6', '#f8f1f2'], rnd, '#8fb47a');   // 李
    hibiscus(lf, 3.15, 1.0);
    daylily(lf, 2.45, 2.15, 1.0); daylily(lf, -3.55, -0.6, 0.9); daylily(lf, -0.45, -3.75, 0.85);
    orchidPot(lf, -0.35, -1.55);
    // 盆花一排（矮木几上）
    const bench = grp(lf, [0.55, 0, -3.2]); bench.rotation.y = -0.15;
    A(bench, G.box(1.3, 0.05, 0.4), M(C.wood), [0, 0.32, 0]);
    for (const sx of [-0.55, 0.55]) A(bench, G.box(0.06, 0.32, 0.34), M(C.woodDk), [sx, 0.16, 0]);
    bake(bench); bench.updateMatrix();
    const potAt = [-0.42, 0, 0.42].map(px => V(px, 0.345, 0).applyMatrix4(bench.matrix));
    potAt.push(V(-2.6, 0, -1.6), V(-1.95, 0, -1.15), V(1.75, 0, 0.75));
    inst(lf, potGeo(), M('#ffffff'), potAt.map(v => [v.x, v.y, v.z, 0, 0.9]), ['#8a6a5a', '#7a8a9a', '#a0623a', '#6f8a7a', '#8a6a5a', '#9a8a6a']);
    inst(lf, bushGeo(), M('#5f8a55'), potAt.map(v => [v.x, v.y + 0.2, v.z, 0, 0.55]));
    const potFl = []; potAt.forEach((v, i) => { for (let k = 0; k < 4; k++) { const a = k * 1.7 + i; potFl.push([v.x + Math.cos(a) * 0.12 * (k ? 1 : 0), v.y + 0.42 + (k % 2) * 0.05, v.z + Math.sin(a) * 0.12 * (k ? 1 : 0), a, 1.2]); } });
    inst(lf, blossomGeo(), M('#ffffff'), potFl, ['#d65a5a', '#f2c14e', '#e88aa8', '#f6efe6', '#b874b0']);
    // 葉緣長出的小花叢
    const edge = scatter(rnd, 34, [[...HERO, 1.3], [...PC, 1.6], [-1.55, -2.75, 0.6], [3.2, -0.45, 0.5], [3.15, 1.0, 0.6], [2.45, 2.15, 0.4], [1.45, 1.35, 0.6], [-0.45, -3.75, 0.4], [0.55, -3.2, 0.8], ...potAt.map(v => [v.x, v.z, 0.35])], 3.2, 4.3, NOTCH);
    inst(lf, once('fstem', () => geoOf(t => { for (let i = 0; i < 3; i++) A(t, G.cyl(0.008, 0.01, 0.22 + i * 0.05, 4), null, [Math.cos(i * 2.1) * 0.05, 0.11 + i * 0.025, Math.sin(i * 2.1) * 0.05], [Math.sin(i * 2.1) * 0.2, 0, Math.cos(i * 2.1) * 0.2]); })), M(C.leafDk), edge);
    inst(lf, once('fhead', () => geoOf(t => { for (let i = 0; i < 3; i++) A(t, blossomGeo(), null, [Math.cos(i * 2.1) * 0.07, 0.23 + i * 0.05, Math.sin(i * 2.1) * 0.07], null, 0.8); })), M('#ffffff'), edge, edge.map(() => pick(rnd, ['#e88aa8', '#f2c14e', '#f6efe6', '#c98bc4', '#d65a5a', '#9ab4e0'])));
    P.tag(lf, 'landflower');
    ss.landflower = [1.9, -0.6];

    // ---- 書卷：石墩上一函線裝書＋兩卷書軸 ----
    const bk = grp(g);
    stoneStool(bk, 1.45, 1.35);
    const tp = grp(bk, [1.45, 0.42, 1.35]); tp.rotation.y = -0.5;
    A(tp, G.box(0.3, 0.05, 0.22), M('#3d5a7a'), [0, 0.025, 0]); A(tp, G.box(0.28, 0.035, 0.205), M('#f3ecd9'), [0.005, 0.06, 0]); A(tp, G.box(0.3, 0.012, 0.22), M('#3d5a7a'), [0, 0.083, 0]);
    A(tp, G.box(0.05, 0.005, 0.15), M('#efe4c8'), [-0.09, 0.091, 0]);
    for (const [z, c] of [[0.17, '#e9dcbc'], [-0.15, '#d8c8a0']]) { A(tp, G.cyl(0.035, 0.035, 0.34, 10), M(c), [0.02, 0.035, z], [0, 0, PI / 2]); for (const s of [-1, 1]) A(tp, G.cyl(0.015, 0.015, 0.05, 6), M(C.woodDk), [0.02 + s * 0.19, 0.035, z], [0, 0, PI / 2]); }
    bake(bk);
    P.tag(bk, 'book');
    ss.book = [0.85, 1.9];

    // 蝴蝶兩隻（繞花飛）
    for (const [cx, cz, ph, c] of [[2.3, 0.4, 0, '#f2d27a'], [-1.4, -1.6, 2, '#f1e8f2']]) {
      const b = grp(g), w = [-1, 1].map(s => { const p = grp(b); A(p, G.sph(0.06, 8, 4), M(c, { side: THREE.DoubleSide }), [s * 0.055, 0, 0], null, [1, 0.12, 0.8]); return p; });
      A(b, G.cyl(0.008, 0.008, 0.08, 4), M(C.ink), [0, 0, 0], [PI / 2, 0, 0]);
      P.anim.push((dt, t) => { const a = t * 0.5 + ph; b.position.set(cx + Math.cos(a) * 0.5, 1.0 + Math.sin(t * 1.7 + ph) * 0.15, cz + Math.sin(a) * 0.4); b.rotation.y = -a; w.forEach((p, k) => { p.rotation.z = (k ? -1 : 1) * Math.sin(t * 14 + ph) * 0.8; }); });
    }
    leafDetail(P, g, [[...PC, 1.4], ...Object.values(ss).map(([x, z]) => [x, z, 0.45])], NOTCH, { petals: ['#f2b9c7', '#f6cbd5', '#fbf7f1'], nPetals: 30 });
    g.userData.standSpots = ss;
    g.userData.notch = NOTCH;
    g.userData.rim = [40, 100, 215, 290];
    return g;
  };

  // ================= 2. ju 晉陶淵明獨愛菊 =================
  // 葉面後半一層薄土；後左：多層茅屋；東側：竹籬＋籬下大片黃菊；陶淵明提籃採菊、臉朝鏡頭；左前：柳樹（五柳先生）；後右：淡墨盆景山（南山）
  function thatchGeo(r, h, seed, droop = 0.12) {
    const g = lathe([[0, h], [r * 0.25, h * 0.93], [r * 0.55, h * 0.7], [r * 0.8, h * 0.38], [r * 0.95, h * 0.1], [r, -droop * 0.4], [r * 0.97, -droop]], 18);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = 1 + (hash3(Math.round(x * 50) + seed, Math.round(y * 50), Math.round(z * 50)) - 0.5) * 0.08; p.setXYZ(i, x * k, y + (y < 0.05 ? (hash3(x * 9, seed, z * 9) - 0.5) * 0.06 : 0), z * k); }
    g.computeVertexNormals(); return g;
  }
  function hut(p, x, z, yaw) {
    const t = grp(p, [x, 0, z]); t.rotation.y = yaw;
    const W = 1.6, D = 1.1, WH = 0.85;
    A(t, G.box(W + 0.3, 0.1, D + 0.3), M(C.stone, { flat: true }), [0, 0.05, 0]);
    A(t, G.box(W, WH, D), M('#cdb084'), [0, 0.1 + WH / 2, 0]);
    for (let y = 0.28; y < WH; y += 0.2) A(t, G.box(W + 0.01, 0.015, D + 0.01), M('#b39668'), [0, 0.1 + y, 0]);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) A(t, G.cyl(0.04, 0.045, WH + 0.05, 6), M(C.woodDk), [sx * W / 2, 0.1 + WH / 2, sz * D / 2]);
    // 柴門（半開）＋直欞窗
    A(t, G.box(0.42, 0.62, 0.02), M(C.ink), [-0.3, 0.42, D / 2 + 0.005]);
    const dr = grp(t, [-0.51, 0.11, D / 2 + 0.02]); dr.rotation.y = -0.9;
    for (let k = 0; k < 5; k++) A(dr, G.box(0.075, 0.6, 0.03), M(C.woodLt), [0.045 + k * 0.08, 0.3, 0]);
    A(dr, G.box(0.4, 0.04, 0.035), M(C.woodDk), [0.2, 0.45, 0.01]);
    A(t, G.box(0.42, 0.3, 0.02), M(C.ink), [0.4, 0.6, D / 2 + 0.005]);
    for (let k = 0; k < 6; k++) A(t, G.box(0.025, 0.3, 0.03), M(C.wood), [0.22 + k * 0.072, 0.6, D / 2 + 0.015]);
    A(t, G.box(0.5, 0.04, 0.04), M(C.woodDk), [0.4, 0.77, D / 2 + 0.02]); A(t, G.box(0.5, 0.04, 0.04), M(C.woodDk), [0.4, 0.43, D / 2 + 0.02]);
    // 茅草頂：三層錯位、邊緣下垂；頂上草結
    const sc = [1.3, 1, 1.05];
    A(t, thatchGeo(1.0, 0.7, 1, 0.16), M('#a88d55', { side: THREE.DoubleSide }), [0, 0.92, 0], [0, 0.2, 0], sc);
    A(t, thatchGeo(0.78, 0.55, 2, 0.12), M('#c2a66a', { side: THREE.DoubleSide }), [0.03, 1.12, -0.02], [0, 0.9, 0], sc);
    A(t, thatchGeo(0.52, 0.42, 3, 0.1), M('#b39858', { side: THREE.DoubleSide }), [-0.02, 1.32, 0.01], [0, 1.7, 0], sc);
    A(t, G.cyl(0.07, 0.12, 0.16, 7), M('#8c7444'), [0, 1.78, 0]);
    A(t, G.tor(0.11, 0.02, 4, 10), M(C.ink), [0, 1.72, 0], [PI / 2, 0, 0]);
    bake(t);
    // 簷口垂草（實例）
    const hang = []; for (let k = 0; k < 44; k++) { const a = k / 44 * PI * 2; hang.push([Math.sin(a) * 1.27, 0.84, Math.cos(a) * 1.03, 0, a, 0, [1, 0.8 + hash3(k, 1, 2) * 0.6, 1]]); }
    instQ(t, once('hangS', () => G.cone(0.03, 0.16, 3).rotateX(PI).translate(0, -0.06, 0)), M('#9c834e'), hang);
    return t;
  }
  function willow(P, p, x, z) {
    const t = grp(p, [x, 0, z]), bark = M(C.bark);
    const tr = grp(t);
    A(tr, tube([V(0, 0, 0), V(0.12, 0.6, 0), V(0.0, 1.2, 0.05), V(0.1, 1.6, 0)], 0.12, 14, 7), bark);
    A(tr, G.cyl(0.16, 0.26, 0.12, 8), bark, [0, 0.06, 0]);
    [[V(0.05, 1.3, 0), V(0.5, 1.75, 0.1), V(0.75, 1.95, 0)], [V(0, 1.25, 0), V(-0.45, 1.7, -0.1), V(-0.7, 1.85, 0)], [V(0.1, 1.55, 0), V(0.05, 1.95, 0.25), V(0.2, 2.15, 0.2)], [V(0.1, 1.5, 0), V(0.1, 1.85, -0.4)]].forEach(l => A(tr, tube(l, 0.05, 10, 5), bark));
    bake(tr);
    const str = []; for (let k = 0; k < 46; k++) { const a = k * 2.399, r = 0.25 + (k % 5) * 0.14, top = 2.1 - r * 0.45; str.push([Math.cos(a) * r, top, Math.sin(a) * r, Math.cos(a) * 0.15, 0, -Math.sin(a) * 0.15, [1, 0.7 + (k % 4) * 0.18, 1]]); }
    const im = instQ(t, once('wstr', () => G.cyl(0.035, 0.012, 1.0, 4).scale(1, 1, 0.35).translate(0, -0.5, 0)), M('#9ab874'), str);
    const d = new THREE.Object3D(); d.rotation.order = 'YXZ';
    P.anim.push((dt, tt) => { str.forEach(([sx, sy, sz, rx, , rz, s], i) => { d.position.set(sx, sy, sz); d.rotation.set(rx + Math.sin(tt * 1.3 + i) * 0.06, 0, rz + Math.sin(tt * 1.1 + i * 0.7) * 0.08); d.scale.fromArray(s); d.updateMatrix(); im.setMatrixAt(i, d.matrix); }); im.instanceMatrix.needsUpdate = true; });
    return t;
  }
  // 淡墨假山：嶙峋石峰（頂點雜湊擾動、依面朝向上色）
  const INKROCK = ['#c3c8c2', '#a9b0ab', '#8d9590', '#6e7671'];
  function inkRock(rx, h, rz, o = {}) {
    const { seg = 8, rings = 5, top = 0.25, jit = 0.18, seed = 0, x = 0, z = 0, y = 0 } = o;
    const g = new THREE.CylinderGeometry(top, 1, 1, seg, rings); g.translate(0, 0.5, 0);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const px = p.getX(i), py = p.getY(i), pz = p.getZ(i), a = hash3(px * 3 + seed, py * 5, pz * 3), b = hash3(pz * 3, px * 3 + seed, py * 7);
      const k = 1 + (a - 0.5) * 2 * jit, lean = Math.sin(py * 3 + seed) * 0.12;
      p.setXYZ(i, (px * k + lean * py) * rx + x, py * h * (py < 0.001 ? 1 : 1 + (b - 0.5) * jit) + y, pz * rz * k + z);
    }
    const n = g.toNonIndexed(); n.computeVertexNormals();
    const nr = n.attributes.normal, col = [], c = new THREE.Color();
    for (let i = 0; i < nr.count; i += 3) { const ny = nr.getY(i), r = hash3(i * 0.37 + seed, 1.3, 2.1); c.set(ny > 0.5 ? INKROCK[r < 0.6 ? 0 : 1] : INKROCK[r < 0.3 ? 3 : r < 0.7 ? 2 : 1]); for (let k = 0; k < 3; k++) col.push(c.r, c.g, c.b); }
    n.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    return n;
  }
  function bonsaiMountain(P, p, x, z, yaw) {
    const t = grp(p, [x, 0, z]); t.rotation.y = yaw;
    const st = grp(t);
    A(st, G.box(1.6, 0.08, 0.8), M(C.woodDk), [0, 0.38, 0]);   // 木几
    for (const sx of [-0.7, 0.7]) for (const sz of [-0.32, 0.32]) A(st, G.box(0.08, 0.36, 0.08), M(C.woodDk), [sx, 0.18, sz]);
    A(st, G.box(1.45, 0.1, 0.68), M('#d9d3c4'), [0, 0.47, 0]);   // 白石盆
    A(st, G.box(1.33, 0.02, 0.56), M('#b7cfc6'), [0, 0.52, 0]);   // 盆中淺水
    bake(st);
    A(t, BGU.mergeGeometries([
      inkRock(0.32, 1.35, 0.26, { x: -0.15, z: -0.05, y: 0.5, seed: 1 }),
      inkRock(0.24, 0.95, 0.2, { x: 0.32, z: -0.1, y: 0.5, seed: 2 }),
      inkRock(0.2, 0.7, 0.18, { x: -0.5, z: 0.05, y: 0.5, seed: 3 }),
      inkRock(0.14, 0.4, 0.12, { x: 0.55, z: 0.12, y: 0.5, seed: 4, top: 0.5 })
    ]), M('#ffffff', { vertexColors: true }));
    // 峰腰小松一株、白雲一抹
    const pn = grp(t, [0.12, 1.3, 0.05]);
    A(pn, G.cyl(0.012, 0.018, 0.2, 4), M(C.bark), [0, 0.06, 0], [0, 0, 0.6]);
    A(pn, G.sph(0.09, 8, 4), M('#4f7a5a'), [0.08, 0.14, 0], null, [1.4, 0.4, 1]);
    bake(pn);
    const cl = A(t, G.sph(0.22, 12, 6), M('#f6f3ec', { transparent: true, opacity: 0.85 }), [0.05, 1.05, 0.15], null, [2.2, 0.35, 0.8]);
    P.anim.push((dt, tt) => { cl.position.x = 0.05 + Math.sin(tt * 0.4) * 0.15; });
    return t;
  }
  function bambooFence(p, pts, h = 0.75) {
    const curve = new THREE.CatmullRomCurve3(pts.map(([x, z]) => V(x, 0, z))), n = Math.round(curve.getLength() / 0.12), posts = [];
    for (let i = 0; i <= n; i++) { const q = curve.getPointAt(i / n); posts.push([q.x, 0, q.z, i, [1, 0.9 + (i % 3) * 0.12, 1]]); }
    const t = grp(p);
    inst(t, once('fpost', () => G.cyl(0.025, 0.03, h, 5).translate(0, h / 2, 0)), M('#ffffff'), posts, [C.bamboo, C.bambooDk, '#c4bc86']);
    for (const y of [h * 0.3, h * 0.72]) A(t, tube(curve.getPoints(16).map(v => v.clone().add(V(0, y, 0))), 0.016, 32, 4), M(C.woodLt));
    const d = []; for (let i = 0; i < n; i += 2) { const q = curve.getPointAt(i / n), tg = curve.getTangentAt(i / n); d.push([q.x, h * 0.5, q.z, 0, Math.atan2(tg.x, tg.z) + PI / 2, (i % 4 ? 1 : -1) * 0.7, 1]); }
    instQ(t, once('fdiag', () => G.cyl(0.008, 0.008, 0.5, 3)), M(C.bambooDk), d);   // 斜編竹條
    return t;
  }
  LP_BUILD.ju = P => {
    const g = new THREE.Group(), ss = {}, rnd = P.rnd, NOTCH = 240;
    // 薄土：後半（前方收窄，缺口方向退讓）
    const sl = grp(g);
    soil(sl, a => { const c = Math.cos(a * PI / 180); return Math.min(angDist(a, NOTCH) < 22 ? 1.85 : 9, c > 0.2 ? 1.7 + (1 - c) * 1.2 : 4.2); }, 0.012, '#c4a874');
    soil(sl, a => 1.2 + 0.6 * Math.abs(Math.sin(a * PI / 90)), 0.016, '#b89a68');
    // 茅屋
    P.tag(hut(g, -0.7, -2.5, 0.22), 'tao');
    // 酒甕、柴堆
    const prop = grp(g);
    A(prop, lathe([[0, 0], [0.15, 0], [0.22, 0.12], [0.24, 0.26], [0.16, 0.42], [0.1, 0.46], [0.12, 0.5], [0.1, 0.5]], 14), M('#6f5a48', { side: THREE.DoubleSide }), [0.55, 0, -1.55]);
    A(prop, G.cyl(0.11, 0.11, 0.03, 10), M('#c94a3a'), [0.55, 0.5, -1.55]);
    for (let r = 0; r < 3; r++) for (let i = 0; i < 4 - r; i++) A(prop, G.cyl(0.06, 0.06, 0.55, 7), M(i % 2 ? '#7a5236' : C.woodLt), [-2.95 + i * 0.13 + r * 0.065, 0.06 + r * 0.11, -0.35], [PI / 2, 0, 0.1]);
    bake(prop);
    P.tag(prop, 'tao');
    // 炊煙
    const smoke = grp(g, [-0.72, 1.85, -2.5]), puffs = [];
    for (let k = 0; k < 4; k++) puffs.push(A(smoke, G.ico(0.09, 1), MB('#e6e1d6', { transparent: true, opacity: 0.5, depthWrite: false })));
    P.anim.push((dt, t) => puffs.forEach((p, k) => { const u = (t * 0.18 + k / 4) % 1; p.position.set(Math.sin(u * 5 + k) * 0.08 + u * 0.25, u * 0.9, 0); p.scale.setScalar(0.6 + u * 1.8); p.material.opacity = 0.5 * Math.min(1, u * 6) * (1 - u); }));
    // 竹籬（東側）
    const FP = [[2.15, -3.05], [2.55, -1.85], [2.75, -0.55], [2.65, 0.7], [2.3, 1.75]];
    P.tag(bambooFence(g, FP), 'fence');
    ss.fence = [1.55, 1.75];
    // 籬下黃菊（籬內外兩側）
    const curve = new THREE.CatmullRomCurve3(FP.map(([x, z]) => V(x, 0, z))), mums = [];
    for (let k = 0; k < 120; k++) {
      const u = rnd(), q = curve.getPointAt(u), tg = curve.getTangentAt(u), side = rnd() < 0.62 ? -1 : 1, off = 0.12 + rnd() * (side < 0 ? 0.75 : 0.55);
      const x = q.x - tg.z * off * side, z = q.z + tg.x * off * side;
      if (Math.hypot(x, z) > 4.35 || Math.hypot(x - 1.3, z - 0.5) < 0.55 || Math.hypot(x - 1.55, z - 1.75) < 0.62 || Math.hypot(x - 1.4, z + 0.75) < 0.62 || Math.hypot(x - 1.78, z - 0.95) < 0.3) continue;
      mums.push([x, 0, z, rnd() * 6, 0.85 + rnd() * 0.5]);
    }
    const mm = grp(g);
    inst(mm, mumStem(), M('#5f8a4a'), mums);
    inst(mm, mumGeo(), M('#ffffff'), mums, mums.map(() => pick(rnd, MUMS)));
    P.tag(mm, 'mum');
    ss.mum = [1.4, -0.75];
    // 陶淵明：提竹籃，臉朝鏡頭
    chibi(P, g, { who: 'tao', pose: 'basket', seed: 2 }, 1.3, 0.5, CAMF(1.3, 0.5), 'tao');
    // 地上一隻竹籃，裝著剛採的菊
    const bs = grp(g, [1.78, 0, 0.95]);
    A(bs, G.cyl(0.17, 0.13, 0.17, 12, 1, true), M('#c8a868', { side: THREE.DoubleSide }), [0, 0.085, 0]);
    A(bs, G.cyl(0.13, 0.13, 0.015, 12), M('#9a7a45'), [0, 0.008, 0]);
    A(bs, G.tor(0.17, 0.016, 4, 16), M('#7a5a30'), [0, 0.17, 0], [PI / 2, 0, 0]);
    A(bs, G.tor(0.15, 0.012, 4, 12, PI), M('#7a5a30'), [0, 0.17, 0]);
    for (let k = 0; k < 6; k++) A(bs, mumGeo(), M(MUMS[k % 3]), [Math.cos(k) * 0.07, -0.18 + (k % 2) * 0.02, Math.sin(k) * 0.07], null, 0.9);
    bake(bs);
    P.tag(bs, 'tao');
    ss.tao = [0.55, 1.15];
    // 柳（五柳先生）
    P.tag(willow(P, g, -2.85, 0.85), 'tao');
    // 南山：淡墨盆景山（後右）
    P.tag(bonsaiMountain(P, g, 0.85, -3.55, -0.12), 'nanshan');
    ss.nanshan = [0.9, -2.1];
    // 雁行：三隻小雁飛過南山（淡墨）
    const geese = grp(g);
    for (let k = 0; k < 3; k++) { const b = grp(geese, [k * 0.3, -k * 0.1, k * 0.2]); for (const s of [-1, 1]) A(b, G.box(0.22, 0.01, 0.06), M('#5a5a56'), [s * 0.1, 0, 0], [0, 0, s * 0.3]); }
    P.anim.push((dt, t) => { const u = (t * 0.05) % 1; geese.position.set(-1.6 + u * 3.0, 2.7 + Math.sin(t * 0.7) * 0.1, -3.3 + u * 0.4); geese.children.forEach((b, k) => b.children.forEach((w, j) => { w.rotation.z = (j ? 1 : -1) * (0.3 + Math.sin(t * 4 + k) * 0.25); })); });
    P.tag(geese, 'nanshan');
    // 薄土邊的小草
    const tf = scatter(rnd, 26, [[...HERO, 1.0], [-0.7, -2.5, 1.5], [0.85, -3.55, 1.0], [-2.85, 0.85, 0.6], [1.3, 0.5, 0.5], [-2.75, -0.35, 0.5], [0.55, -1.55, 0.35], ...mums.map(([x, , z]) => [x, z, 0.25]), ...Object.values(ss).map(([x, z]) => [x, z, 0.4])], 0.6, 4.3, NOTCH);
    inst(g, once('tuft', () => geoOf(t => { for (let i = 0; i < 5; i++) A(t, G.cone(0.025, 0.2, 4), null, [Math.cos(i * 1.3) * 0.04, 0.1, Math.sin(i * 1.3) * 0.04], [Math.cos(i * 2) * 0.35, 0, Math.sin(i * 2) * 0.35]); })), M('#9aa66a'), tf);
    leafDetail(P, g, [[-0.7, -2.5, 1.6], ...Object.values(ss).map(([x, z]) => [x, z, 0.45])], NOTCH, { dew: 8, petals: MUMS, nPetals: 22 });
    g.userData.standSpots = ss;
    g.userData.notch = NOTCH;
    g.userData.rim = [45, 120, 200, 300];
    return g;
  };

  // ================= 3. mudan 自李唐來，世人甚愛牡丹 =================
  // 最擠：後方兩座花市竹棚（帷幕、木架盆花、幌子）、中央一叢深色名花花台、左右花圃、右側載花馬車、四位唐代賞花人、飄落花瓣
  function stall(P, p, x, z, o = {}) {
    const s = grp(p, [x, 0, z]), W = o.w || 1.7, D = 1.0, H = 1.55, fr = grp(s);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) A(fr, G.cyl(0.035, 0.04, H + (sz < 0 ? 0.15 : 0), 6), M(C.bamboo), [sx * W / 2, (H + (sz < 0 ? 0.15 : 0)) / 2, sz * D / 2]);
    const rf = A(fr, G.box(W + 0.35, 0.05, D + 0.4), M(o.roof || '#d2bc86'), [0, H + 0.1, 0], [-0.16, 0, 0]);
    for (let k = 0; k < 8; k++) A(rf, G.box(W + 0.36, 0.055, 0.02), M('#a89060'), [0, 0, -0.62 + k * 0.18]);
    for (let k = 0; k < 11; k++) A(fr, G.box(0.14, 0.13, 0.012), M(k % 2 ? (o.valance || '#c0473a') : '#efe0bc'), [-W / 2 + 0.08 + k * (W - 0.16) / 10, H - 0.04, D / 2 + 0.12]);
    for (const [y, zz] of [[0.25, -0.3], [0.65, -0.38]]) { A(fr, G.box(W - 0.12, 0.04, 0.3), M(C.wood), [0, y, zz]); for (const sx of [-1, 1]) A(fr, G.box(0.04, y, 0.04), M(C.woodDk), [sx * (W / 2 - 0.1), y / 2, zz]); }
    A(fr, G.box(W - 0.25, 0.05, 0.36), M('#a07c55'), [0, 0.55, 0.28]);   // 賣花台
    for (const sx of [-1, 1]) A(fr, G.box(0.05, 0.55, 0.05), M(C.woodDk), [sx * (W / 2 - 0.2), 0.275, 0.28]);
    bake(fr);
    const pots = [];
    for (const px of [-0.55, 0, 0.55]) pots.push([x + px * W / 1.7, 0.27, z - 0.3], [x + px * W / 1.7 + 0.15, 0.67, z - 0.38]);
    for (const px of [-0.45, 0.05, 0.45]) pots.push([x + px * W / 1.7, 0.575, z + 0.28]);
    // 帷幕（後一片、兩側半掩，會飄）
    const curt = [];
    const back = grp(s, [0, H + 0.05, -D / 2 - 0.02]); A(back, G.box(W, 0.85, 0.015), M(o.curtain || '#b8574f', { side: THREE.DoubleSide }), [0, -0.42, 0]); curt.push(back);
    for (const sx of [-1, 1]) { const c = grp(s, [sx * (W / 2 + 0.02), H + 0.05, -0.1]); A(c, G.box(0.015, 0.8, 0.55), M(o.curtain2 || '#d9a65a', { side: THREE.DoubleSide }), [0, -0.4, -0.1]); curt.push(c); }
    P.anim.push((dt, t) => curt.forEach((c, k) => { c.rotation[k ? 'z' : 'x'] = Math.sin(t * 1.3 + k + x) * 0.05; }));
    return { g: s, pots };
  }
  function horse(p, x, z) {
    const t = grp(p, [x, 0, z]);
    const body = M('#e9dfcf'), dk = M('#6a5a50'), hoof = M('#3a302a');
    const b = grp(t);
    A(b, G.sph(1, 14, 10), body, [0, 0.66, 0], null, [0.24, 0.24, 0.42]);
    for (const [sx, sz] of [[-0.12, 0.26], [0.12, 0.26], [-0.12, -0.26], [0.12, -0.26]]) { A(b, G.cyl(0.055, 0.045, 0.5, 6), body, [sx, 0.3, sz]); A(b, G.cyl(0.055, 0.06, 0.06, 6), hoof, [sx, 0.03, sz]); }
    A(b, G.cyl(0.11, 0.15, 0.4, 8), body, [0, 0.9, 0.36], [0.6, 0, 0]);
    A(b, G.box(0.06, 0.38, 0.14), dk, [0, 0.95, 0.31], [0.6, 0, 0]);   // 鬃
    A(b, tube([V(0, 0.75, -0.4), V(0, 0.6, -0.55), V(0, 0.35, -0.55)], 0.05, 8, 5), dk);   // 尾
    A(b, G.box(0.5, 0.06, 0.38), M('#b8432f'), [0, 0.86, -0.02]);   // 鞍韉
    A(b, G.box(0.52, 0.04, 0.4), M('#d6a740'), [0, 0.83, -0.02]);
    bake(b);
    const hd = grp(t, [0, 1.1, 0.5]), hb = grp(hd);
    A(hb, G.sph(0.16, 12, 8), body, [0, 0, 0.06], null, [0.9, 0.95, 1.25]);
    A(hb, G.sph(0.11, 10, 8), M('#d9cdb8'), [0, -0.05, 0.22], null, [1, 0.8, 1]);
    for (const s of [-1, 1]) { A(hb, G.cone(0.04, 0.12, 5), body, [s * 0.07, 0.16, -0.02]); A(hb, G.sph(0.025, 6, 5), M(C.ink), [s * 0.12, 0.04, 0.12]); }
    A(hb, G.tor(0.12, 0.012, 4, 14), M('#b8432f'), [0, -0.02, 0.16], [0, PI / 2, 0], [1, 1, 1.3]);   // 籠頭
    bake(hb);
    return hd;
  }
  function carriage(P, p, x, z, yaw) {
    const t = grp(p, [x, 0, z]); t.rotation.y = yaw;
    const c = grp(t);
    A(c, G.box(1.0, 0.08, 1.2), M(C.wood), [0, 0.6, -0.9]);
    for (const sx of [-1, 1]) A(c, G.box(0.05, 0.22, 1.2), M(C.woodDk), [sx * 0.5, 0.75, -0.9]);
    A(c, G.box(1.0, 0.22, 0.05), M(C.woodDk), [0, 0.75, -1.5]);
    for (const sx of [-1, 1]) {
      A(c, G.tor(0.4, 0.04, 6, 20), M(C.woodDk), [sx * 0.6, 0.42, -0.95], [0, PI / 2, 0]);
      A(c, G.cyl(0.07, 0.07, 0.12, 8), M(C.woodLt), [sx * 0.6, 0.42, -0.95], [0, 0, PI / 2]);
      for (let k = 0; k < 8; k++) { const a = k / 8 * PI * 2; rod(c, V(sx * 0.6, 0.42, -0.95), V(sx * 0.6, 0.42 + Math.sin(a) * 0.38, -0.95 + Math.cos(a) * 0.38), 0.014, M(C.wood), 4); }
      rod(c, V(sx * 0.35, 0.62, -0.3), V(sx * 0.22, 0.9, 0.55), 0.03, M(C.woodDk), 5);   // 車轅
    }
    A(c, G.cyl(0.03, 0.03, 0.75, 5), M(C.woodDk), [0, 0.42, -0.95], [0, 0, PI / 2]);
    bake(c);
    // 車上盆牡丹
    const cp = [[-0.25, -0.6], [0.25, -0.6], [-0.25, -1.15], [0.25, -1.15], [0, -0.88]].map(([px, pz]) => [px, 0.64, pz]);
    inst(t, potGeo(), M('#8a5a3a'), cp.map(([a, b, c2]) => [a, b, c2, 0, 0.85]));
    inst(t, bushGeo(), M('#5f8a55'), cp.map(([a, b, c2]) => [a, b + 0.2, c2, 0, 0.5]));
    inst(t, peonyGeo(), M('#ffffff'), cp.map(([a, b, c2], i) => [a, b + 0.45, c2, i * 1.3, 0.75]), PEONY);
    const hd = horse(t, 0, 0.75);
    P.anim.push((dt, tt) => { hd.rotation.x = 0.15 + Math.max(0, Math.sin(tt * 0.8)) * 0.3; });
    return t;
  }
  LP_BUILD.mudan = P => {
    const g = new THREE.Group(), ss = {}, rnd = P.rnd, NOTCH = 240;
    // 地面：夯土廣場＋石板路（邊緣仍看得到葉面）
    const gr = grp(g);
    soil(gr, a => { const c = Math.cos(a * PI / 180); return Math.min(angDist(a, NOTCH) < 22 ? 1.85 : 9, c > 0.3 ? 2.3 + (1 - c) * 1.4 : 4.15); }, 0.012, '#cdb48e');
    const slabs = []; for (let i = 0; i < 9; i++) { const z = 2.1 - i * 0.3; for (const sx of [-0.18, 0.18]) slabs.push([sx + (rnd() - 0.5) * 0.04, 0.02, z, (rnd() - 0.5) * 0.2, 0.9 + rnd() * 0.2]); }
    inst(gr, once('slab', () => G.box(0.32, 0.016, 0.28)), M(C.stoneLt), slabs);
    P.tag(gr, 'market');
    const pots = [];   // 所有盆牡丹（盆、葉叢、花頭各一個實例）
    const sA = stall(P, g, -1.0, -2.85, { valance: '#c0473a', curtain: '#b8574f', curtain2: '#d9a65a' });
    const sB = stall(P, g, 1.35, -2.55, { valance: '#2f6a6a', curtain: '#8a4a7a', curtain2: '#e0b0c0', roof: '#c9b27a' });
    P.tag(sA.g, 'market'); P.tag(sB.g, 'market');
    pots.push(...sA.pots, ...sB.pots);
    // 幌子
    const fl = grp(g, [2.35, 0, -2.0]);
    A(fl, G.cyl(0.025, 0.03, 2.3, 6), M(C.bamboo), [0, 1.15, 0]);
    const banner = grp(fl, [0, 2.15, 0]);
    A(banner, G.box(0.04, 0.04, 0.5), M(C.woodDk), [0, 0, 0.22]);
    const cloth = A(banner, G.box(0.015, 0.75, 0.36), M('#c0473a', { side: THREE.DoubleSide }), [0, -0.42, 0.25]);
    A(cloth, G.box(0.02, 0.08, 0.37), M('#f2e6c8'), [0, 0.33, 0]);
    for (let k = 0; k < 2; k++) A(cloth, G.box(0.02, 0.12, 0.12), M('#f2e6c8'), [0, 0.1 - k * 0.25, 0]);
    P.anim.push((dt, t) => { banner.rotation.y = Math.sin(t * 1.4) * 0.25; cloth.rotation.x = Math.sin(t * 2.1) * 0.05; });
    P.tag(fl, 'market');
    // 地上一列盆牡丹（竹棚前）
    pots.push([-1.55, 0, -1.9], [-1.35, 0, -1.45], [0.1, 0, -2.15], [0.45, 0, -1.95], [2.05, 0, -1.45], [-0.15, 0, -1.65]);
    ss.market = [-0.75, -1.75];
    // ---- 花台、花圃：大叢牡丹（中央花台是一叢深色名花） ----
    const beds = [[0.55, -1.0, 0.75, 0.55, 0.12], [-2.8, 0.25, 0.55, 0.8, 0.3], [1.75, 1.75, 0.6, 0.45, -0.5]];
    const bedG = grp(g), bushes = [], heads = [];
    beds.forEach(([bx, bz, w, d, ry], i) => {
      const b = grp(bedG, [bx, 0, bz]); b.rotation.y = ry;
      A(b, G.box(w * 2 + 0.1, 0.2, d * 2 + 0.1), M(i ? C.stoneLt : '#c9c1b2'), [0, 0.1, 0]);
      A(b, G.box(w * 2 + 0.16, 0.04, d * 2 + 0.16), M(i ? '#b7ae9f' : '#9a8f80'), [0, 0.21, 0]);
      A(b, G.box(w * 2 - 0.04, 0.02, d * 2 - 0.04), M(C.mud), [0, 0.215, 0]);
      bake(b); b.updateMatrix();
      const n = Math.round(w * d * 14);
      for (let k = 0; k < n; k++) {
        const v = V((rnd() - 0.5) * w * 1.6, 0.2, (rnd() - 0.5) * d * 1.6).applyMatrix4(b.matrix);
        bushes.push([v.x, v.y, v.z, rnd() * 6, 0.9 + rnd() * 0.4]);
        for (let j = 0; j < 2; j++) heads.push([v.x + (rnd() - 0.5) * 0.3, v.y + 0.42 + rnd() * 0.12, v.z + (rnd() - 0.5) * 0.3, rnd() * 6, 0.95 + rnd() * 0.35, i ? pick(rnd, PEONY) : pick(rnd, ['#9c2f4a', '#a8457a', '#b83a52'])]);
      }
    });
    pots.forEach(([x, y, z]) => { bushes.push([x, y + 0.22, z, rnd() * 6, 0.55]); heads.push([x, y + 0.5, z, rnd() * 6, 0.75, pick(rnd, PEONY)]); });
    const pk = [
      inst(g, potGeo(), M('#ffffff'), pots.map(([x, y, z]) => [x, y, z, 0, 1]), ['#7a6a8a', '#3d6a8a', '#8a5a3a', '#4f8a6a', '#a07050']),
      inst(g, bushGeo(), M('#5f8a55'), bushes),
      inst(g, peonyGeo(), M('#ffffff'), heads.map(h => h.slice(0, 5)), heads.map(h => h[5])),
      inst(g, peonyCtr(), M('#f2c14e'), heads.map(h => h.slice(0, 5)))
    ];
    P.tag(bedG, 'peony'); pk.forEach(o => P.tag(o, 'peony'));
    ss.peony = [-0.75, 0.75];
    // 飄落的花瓣
    const pf = new THREE.InstancedMesh(once('ppetal', () => G.sph(0.05, 6, 3).scale(1, 0.22, 0.7)), M('#ffffff', { side: THREE.DoubleSide }), 24), pd = [], col = new THREE.Color();
    for (let i = 0; i < 24; i++) { const a = rnd() * PI * 2, q = Math.sqrt(rnd()) * 1.4; pd.push([0.3 + Math.cos(a) * q, -0.6 + Math.sin(a) * q, rnd(), 0.08 + rnd() * 0.08, rnd() * 6]); pf.setColorAt(i, col.set(pick(rnd, PEONY))); }
    const mx = new THREE.Matrix4(), qq = new THREE.Quaternion(), e = new THREE.Euler(), pv = V(), sv = V(1, 1, 1);
    const upd = t => { pd.forEach(([x, z, u0, sp, ph], i) => { const u = (u0 + t * sp) % 1; pv.set(x + Math.sin(t * 1.3 + ph) * 0.15, 0.03 + 1.8 * (1 - u), z + Math.cos(t * 1.1 + ph) * 0.1); qq.setFromEuler(e.set(t * 1.7 + ph, ph, t * 1.2)); sv.setScalar(Math.max(0.001, Math.min(1, u * 8, (1 - u) * 8))); pf.setMatrixAt(i, mx.compose(pv, qq, sv)); }); pf.instanceMatrix.needsUpdate = true; };
    upd(0); g.add(pf); P.anim.push((dt, t) => upd(t));
    P.tag(pf, 'peony');
    // ---- 載花馬車（右側，馬頭朝前） ----
    P.tag(carriage(P, g, 3.0, -0.75, 0.08), 'carriage');
    ss.carriage = [2.1, 0.35];
    // ---- 唐代賞花人（臉朝鏡頭） ----
    [['noble', -1.55, 0.6, 1], ['lady', -0.65, -0.55, 2], ['noble', 1.75, -0.35, 3], ['lady', 2.3, 0.95, 4]]
      .forEach(([who, x, z, seed]) => chibi(P, g, { who, pose: who === 'lady' ? 'point' : 'stand', seed }, x, z, CAMF(x, z), 'noble'));
    ss.noble = [-1.0, 1.35];
    leafDetail(P, g, [[0.55, -1.0, 1.2], [-2.8, 0.25, 1.1], [1.75, 1.75, 1.0], [3.0, -1.3, 1.3], ...Object.values(ss).map(([x, z]) => [x, z, 0.45])], NOTCH, { dew: 6, petals: PEONY, nPetals: 30 });
    g.userData.standSpots = ss;
    g.userData.notch = NOTCH;
    g.userData.rim = [30, 95, 200, 300];
    return g;
  };

  // ================= 4. yuni 予獨愛蓮之出淤泥而不染 =================
  // 葉面中後方一座「蓮塘剖面」：切面朝鏡頭，下層黑泥裡埋著白藕與鬚根，上層清水，荷梗穿出水面開出潔白荷花；
  // 一枝蘆葦斜插進泥裡（白話：探到又黑又軟的淤泥）；水面漣漪；右前一片小荷葉上滾著大水珠；左右兩缸荷花
  LP_BUILD.yuni = P => {
    const g = new THREE.Group(), ss = {}, rnd = P.rnd, NOTCH = 92;   // 剖面放大後後半全滿，上岸方向改正右側
    const DC = [-0.15, -0.55], R = 1.45, MUD = 0.85, WAT = 1.4, SK = 1.6;   // 剖面整體放大 1.6 倍、往前移：泥→水→出水荷花三層要佔畫面三成
    const sec = grp(g, [DC[0], 0, DC[1]]); sec.scale.setScalar(SK);
    // 泥層：後半圓柱＋切面
    const mud = grp(sec);
    A(mud, G.cyl(R, R, MUD, 28, 1, false, PI / 2, PI), M('#5a4632'), [0, MUD / 2, 0]);
    A(mud, new THREE.PlaneGeometry(R * 2, MUD), M('#6b5440', { side: THREE.DoubleSide }), [0, MUD / 2, 0.001]);
    const lumps = []; for (let k = 0; k < 26; k++) lumps.push([(rnd() - 0.5) * R * 1.85, 0.05 + rnd() * (MUD - 0.1), 0.005, rnd() * 6, 0.6 + rnd() * 0.8]);
    inst(mud, once('lump', () => G.sph(0.06, 7, 4).scale(1.4, 0.6, 0.15)), M(C.mudDk), lumps);
    // 白藕：一節節（切面上看得到），節間細，節上長鬚根
    const ou = grp(sec), ouM = M(C.ou);
    const segs = [[-1.05, 0.36, 0.25], [-0.6, 0.4, 0.32], [-0.12, 0.33, 0.3], [0.38, 0.4, 0.32], [0.85, 0.35, 0.28]];
    segs.forEach(([x, y, l]) => { A(ou, G.sph(1, 14, 10), ouM, [x, y, -0.04], [0, 0, 0.08], [l * 0.82, 0.13, 0.13]); A(ou, G.sph(0.07, 8, 6), M('#e2d6b8'), [x + l * 0.8, y + 0.01, -0.04]); });
    const roots = []; segs.forEach(([x, y, l]) => { for (let k = 0; k < 4; k++) roots.push([x + l * 0.8 + (k - 1.5) * 0.03, y - 0.07, -0.02, 0, 0, (k - 1.5) * 0.35, [1, 0.6 + (k % 2) * 0.3, 1]]); });
    instQ(ou, once('root', () => G.cyl(0.006, 0.003, 0.25, 3).translate(0, -0.125, 0)), M('#8a7656'), roots);
    // 切開的藕片（看得到一圈孔）——貼在切面最前
    const slice = grp(ou, [-0.6, 0.4, 0.012]);
    A(slice, G.cyl(0.14, 0.14, 0.02, 16), M('#f6f0e2'), [0, 0, 0], [PI / 2, 0, 0]);
    for (let k = 0; k < 7; k++) A(slice, G.cyl(0.018, 0.018, 0.022, 8), M('#c9b896'), [Math.cos(k / 7 * PI * 2) * 0.08, Math.sin(k / 7 * PI * 2) * 0.08, 0.002], [PI / 2, 0, 0]);
    bake(ou); bake(mud);
    P.tag(mud, 'mud'); P.tag(ou, 'mud');
    // 清水層：半透明（切面也看得透）＋水面
    const wat = grp(sec);
    A(wat, G.cyl(R, R, WAT - MUD, 28, 1, true, PI / 2, PI), M('#a8cfc4', { transparent: true, opacity: 0.68, side: THREE.DoubleSide, depthWrite: false }), [0, (MUD + WAT) / 2, 0]);
    A(wat, new THREE.PlaneGeometry(R * 2, WAT - MUD), M('#a8cfc4', { transparent: true, opacity: 0.68, side: THREE.DoubleSide, depthWrite: false }), [0, (MUD + WAT) / 2, 0.002]);
    A(wat, new THREE.CircleGeometry(R, 28, 0, PI).rotateX(-PI / 2), M('#cbece6', { transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }), [0, WAT, 0]);
    // 剖面框：竹木框（沿口、底圈、兩側立框帶竹節），像田野裡挖開的塘岸斷面，不像水族箱；泥水交界亮線
    A(wat, G.tor(R, 0.045, 5, 28, PI), M('#a0794e'), [0, WAT, 0], [PI / 2, 0, PI]);
    A(wat, G.tor(R, 0.045, 5, 28, PI), M('#7a5a38'), [0, 0.02, 0], [PI / 2, 0, PI]);
    for (const s of [-1, 1]) { A(wat, G.box(0.07, WAT, 0.07), M('#a0794e'), [s * R, WAT / 2, 0]); for (const y of [0.45, 0.95]) A(wat, G.cyl(0.05, 0.05, 0.03, 6), M('#7a5a38'), [s * R, y, 0]); }
    A(wat, G.box(R * 2 + 0.06, 0.035, 0.05), M('#e7f4ef'), [0, MUD, 0.02]);
    P.tag(wat, 'ripple');
    // 漣漪（水面上，留在後半圓內）
    const rip = [0, 1, 2].map(() => A(sec, G.tor(0.3, 0.01, 3, 28), MB('#ffffff', { transparent: true, opacity: 0.6, depthWrite: false }), [0.1, WAT + 0.012, -0.72], [PI / 2, 0, 0]));
    P.anim.push((dt, t) => rip.forEach((r, k) => { const u = (t * 0.25 + k / 3) % 1; r.scale.setScalar(0.3 + u * 1.7); r.material.opacity = 0.65 * (1 - u); }));
    rip.forEach(r => P.tag(r, 'ripple'));
    // 荷梗：從藕節長出，穿過泥與水，開出潔白荷花
    const lot = grp(sec);
    lotusSet(P, lot, [[-0.6, 0.4, -0.3, 2.0, 1.75], [0.38, 0.4, -0.55, 1.75, 1.75], [-0.12, 0.35, -0.85, 1.55, 1.6], [0.85, 0.35, -0.3, 1.4, 1.5, true]]);
    inst(lot, bowlLeaf(), M('#6f9a64', { side: THREE.DoubleSide }), [[-1.0, 1.85, -0.75, 0.3, 1.05], [0.95, 1.7, -0.95, 2, 0.9]]);   // 立葉
    instQ(lot, stemGeo(), M(C.stem), [[-1.0, 0.35, -0.75, 0, 0, 0, [1.2, 1.5, 1.2]], [0.95, 0.35, -0.95, 0, 0, 0, [1.2, 1.35, 1.2]]]);
    inst(lot, once('flatLeaf', () => new THREE.CircleGeometry(0.22, 16).rotateX(-PI / 2)), M('#7faa6a', { side: THREE.DoubleSide }), [[0.6, WAT + 0.01, -0.95, 1, 1], [-0.75, WAT + 0.01, -1.05, 3, 0.8]]);   // 浮葉
    P.tag(lot, 'lotus');
    // 蘆葦：斜插進泥裡
    const reed = grp(sec);
    rod(reed, V(1.2, 1.55, 0.05), V(0.55, 0.45, -0.05), 0.014, M('#b8a86a'), 5);
    A(reed, G.cone(0.035, 0.2, 5), M('#c9b98a'), [1.24, 1.62, 0.05], [0, 0, -0.55]);
    bake(reed); P.tag(reed, 'mud');
    ss.mud = [-0.75, 0.55]; ss.lotus = [-2.05, 0.35]; ss.ripple = [0.9, 0.75];
    // 小荷葉上的大水珠（右前）
    const ld = grp(g, [2.3, 0, 0.95]);
    A(ld, G.cyl(0.02, 0.028, 0.6, 6), M(C.stem), [0, 0.3, 0]);
    A(ld, bowlLeaf(), M('#7aa86a', { side: THREE.DoubleSide }), [0, 0.58, 0], null, 0.95);
    A(ld, G.sph(0.03, 8, 6), M('#e9f0c8'), [0, 0.6, 0]);
    A(ld, G.tor(0.3, 0.004, 3, 24), M('#5f8a55'), [0, 0.66, 0], [PI / 2, 0, 0]);
    const drop = A(ld, G.sph(0.085, 16, 12), M('#eaf8ff', { transparent: true, opacity: 0.55 }), [0, 0.7, 0], null, [1, 0.8, 1]);
    A(drop, G.sph(0.025, 8, 6), MB('#ffffff'), [-0.03, 0.045, 0.03]);
    inst(ld, dewGeo(), dewMat(), [[0.25, 0.73, 0.1, 0, 0.8], [-0.2, 0.72, -0.2, 0, 0.6], [0.1, 0.71, 0.3, 0, 0.7]]);
    P.anim.push((dt, t) => { const a = t * 0.9, r = 0.12 + 0.06 * Math.sin(t * 0.6); drop.position.set(Math.cos(a) * r, 0.7 + r * r * 0.5, Math.sin(a) * r); drop.rotation.y = -a * 3; ld.rotation.z = Math.sin(t * 0.7) * 0.04; });
    P.tag(ld, 'leafdrop');
    ss.leafdrop = [1.6, 1.65];
    // 兩缸荷花（左、右後）
    const vats = grp(g);
    for (const [x, z, s] of [[-3.1, 0.75, 1.0], [2.55, -2.95, 0.9]]) {
      A(vats, lathe([[0, 0], [0.32, 0], [0.45, 0.12], [0.5, 0.32], [0.48, 0.42], [0.52, 0.45], [0.5, 0.47]], 18), M('#6f7f86', { side: THREE.DoubleSide }), [x, 0, z], null, s);
      A(vats, G.cyl(0.47, 0.47, 0.01, 18), M('#9fd0c6'), [x, 0.43 * s, z], null, [s, 1, s]);
    }
    bake(vats);
    lotusSet(P, vats, [[-3.2, 0.4, 0.65, 1.1, 1.1], [-2.95, 0.4, 0.9, 0.85, 1.0], [-3.2, 0.4, 0.95, 0.7, 1, true], [2.55, 0.36, -3.0, 1.0, 1.1], [2.7, 0.36, -2.85, 0.7, 1, true]]);
    inst(vats, bowlLeaf(), M('#6f9a64', { side: THREE.DoubleSide }), [[-2.9, 0.95, 0.5, 0.5, 0.6], [2.4, 0.85, -2.8, 1.5, 0.55]]);
    instQ(vats, stemGeo(), M(C.stem), [[-2.9, 0.4, 0.5, 0, 0, 0, [1, 0.55, 1]], [2.4, 0.36, -2.8, 0, 0, 0, [1, 0.49, 1]]]);
    P.tag(vats, 'lotus');
    // 蘆葦叢（左前）
    const rd = grp(g);
    inst(rd, reedGeo(), M('#8aa266'), [[-2.5, 0, 1.75, 0, 1.5], [-3.55, 0, -0.35, 1, 1.2], [-2.0, 0, 2.3, 2, 1.1]]);
    instQ(rd, once('rhead', () => G.cone(0.04, 0.28, 5).translate(0, 0.14, 0)), M('#c9b98a'), [[-2.48, 1.05, 1.75, 0.2, 0, 0.1, 1], [-3.5, 0.85, -0.32, -0.2, 0, -0.15, 1], [-2.0, 0.82, 2.3, 0.1, 0, 0.2, 1]]);
    P.tag(rd, 'mud');
    leafDetail(P, g, [[...DC, 2.6], [2.3, 0.95, 0.7], [-3.1, 0.75, 0.8], [2.55, -2.95, 0.8], [-2.5, 1.75, 0.8], ...Object.values(ss).map(([x, z]) => [x, z, 0.45])], NOTCH, { dew: 16 });
    g.userData.standSpots = ss;
    g.userData.notch = NOTCH;
    g.userData.rim = [45, 160, 250, 310];
    return g;
  };
})();
