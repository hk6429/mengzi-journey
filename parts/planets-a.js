// ================= STATIONS A（A 線，孟子第二版：河中崖島）：fields、market、road =================
// 每站一座赭石崖島（C 線畫島本體）：原點＝平台中心、平台頂 y=0、+z 朝預設鏡頭；內容全放半徑 4.6 內。
// 主角孟子預設站位 (0, 0, 2.6)，半徑 0.7 內淨空（只允許貼地 0.03 以下的鋪面）。配角一律 P.chibi()，臉朝 +z 鏡頭。
// userData.dock：碼頭方向（度，0＝+z、90＝+x，即 atan2(x, z)），避開主建築；C 在那裡畫木碼頭＋石階。userData.rim：崖邊點綴角度。
// 時代：戰國（典故人物依其時代）；配色赭石、黛青、竹木、土黃，朱砂點綴；材質一律 lpCel。不做 GLB。包在 IIFE 裡，避免和 planets-b 撞名。
(() => {
  const PI = Math.PI;
  const M = (h, o) => (typeof lpCel === 'function' ? lpCel : lpMat)(h, o);
  const basicCache = new Map();
  const MB = (h, o = {}) => { const k = h + JSON.stringify(o); if (!basicCache.has(k)) basicCache.set(k, new THREE.MeshBasicMaterial({ color: h, ...o })); return basicCache.get(k); };
  const C = {
    ink: '#2b2622', wood: '#8a5a3a', woodDk: '#5e3d27', woodLt: '#b08358', stone: '#9a948a', stoneLt: '#b5aea2',
    earth: '#c2a273', earthDk: '#a88a5c', ochre: '#9a6a3e', cinnabar: '#a8442f',
    straw: '#c4a868', strawDk: '#a08850', bamboo: '#b9b27a', bambooDk: '#8f8a55', leaf: '#7f8a52', leafDk: '#5f6a40',
    sprout: '#8fae5a', soil: '#8a6a44', soilDk: '#6f5235', bark: '#5e4433', salt: '#f1ede4', fish: '#8c98a0',
    sheep: '#ece2cc', water: '#7f9a94', foam: '#f2efe6'
  };
  const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const G = {
    box: (w, h, d) => new THREE.BoxGeometry(w, h, d),
    cyl: (rt, rb, h, s = 8, ...a) => new THREE.CylinderGeometry(rt, rb, h, s, ...a),
    cone: (r, h, s = 8) => new THREE.ConeGeometry(r, h, s),
    sph: (r, w = 10, h = 8, ...a) => new THREE.SphereGeometry(r, w, h, ...a),
    ico: (r, d = 0) => new THREE.IcosahedronGeometry(r, d),
    dod: r => new THREE.DodecahedronGeometry(r, 0),
    tor: (R, r, rs = 6, ts = 16, arc = PI * 2) => new THREE.TorusGeometry(R, r, rs, ts, arc)
  };
  // 加一個 mesh：A(父, 幾何, 材質, [位置], [旋轉], 縮放)
  function A(p, geo, mat, pos = [0, 0, 0], rot = [0, 0, 0], s = 1) {
    const o = new THREE.Mesh(geo, mat); o.position.fromArray(pos); if (rot) o.rotation.set(rot[0], rot[1], rot[2]);
    Array.isArray(s) ? o.scale.fromArray(s) : o.scale.setScalar(s); p.add(o); return o;
  }
  const grp = (p, pos = [0, 0, 0], ry = 0) => { const o = new THREE.Group(); o.position.fromArray(pos); o.rotation.y = ry; if (p) p.add(o); return o; };
  const tube = (pts, r, seg = 20, rs = 6) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), seg, r, rs, false);
  function rod(p, a, b, r, mat, seg = 6) {
    const d = b.clone().sub(a), m = A(p, G.cyl(r, r, d.length(), seg), mat);
    m.position.copy(a).add(b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); return m;
  }
  const flatGeo = (o, mx) => {
    const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone(), uv = o.material && o.material.map;   // 有貼圖（字牌）才留 uv
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'color' && !(uv && k === 'uv')) g.deleteAttribute(k);
    g.clearGroups(); return g.applyMatrix4(mx);
  };
  // 靜態群組：同材質合併成一個 mesh（chibi 不可放進要 bake 的群組）
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
  // 配角：chibi 介面（C 線）；動畫交給 chibi 自己；y＝腳底高度
  function chibi(P, p, spec, x, z, yaw = 0, el, y = 0) {
    const c = P.chibi(spec); P.at(c, x, z, yaw, y); p.add(c);
    c.userData.isChibi = true;
    if (el) P.tag(c, el);
    P.anim.push((dt, t) => c.userData.anim && c.userData.anim(dt, t));
    return c;
  }
  const lathe = (prof, seg = 18) => new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), seg);
  const hash3 = (x, y, z) => { const s = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453; return s - Math.floor(s); };

  // ================= 共用：朝向、散點、地面細節、小道具 =================
  const HERO = [0, 2.6];
  const faceTo = (x, z, tx, tz) => Math.atan2(tx - x, tz - z) * 180 / PI;   // P.at 的 yaw（度）
  const CAMF = (x, z) => faceTo(x, z, x * 0.35, 7);   // 臉朝 +z 鏡頭（略收向中線）
  const RAD = d => d * PI / 180;
  const polar = (a, r) => [Math.sin(a * PI / 180) * r, Math.cos(a * PI / 180) * r];
  const geoCache = {};
  const once = (k, f) => geoCache[k] || (geoCache[k] = f());
  const pick = (rnd, arr) => arr[Math.floor(rnd() * arr.length)];
  // 平台上隨機散點：避開 avoid=[[x,z,r],...]，落在半徑 rMin～rMax 的環內，彼此至少隔 0.22
  function scatter(rnd, n, avoid, rMin = 0.3, rMax = 4.3) {
    const out = [];
    for (let k = 0; out.length < n && k < n * 60; k++) {
      const a = rnd() * PI * 2, r = Math.sqrt(rMin * rMin + rnd() * (rMax * rMax - rMin * rMin)), x = Math.sin(a) * r, z = Math.cos(a) * r;
      if (avoid.some(([ax, az, ar]) => Math.hypot(x - ax, z - az) < ar)) continue;
      if (out.some(([ox, , oz]) => Math.hypot(x - ox, z - oz) < 0.22)) continue;
      out.push([x, 0, z, rnd() * PI * 2, 0.7 + rnd() * 0.6]);
    }
    return out;
  }
  function tufts(p, list, color = C.leaf) {
    const g = once('tuft', () => geoOf(t => { for (let i = 0; i < 5; i++) A(t, G.cone(0.025, 0.22, 4), null, [Math.cos(i * 1.3) * 0.04, 0.1, Math.sin(i * 1.3) * 0.04], [Math.cos(i * 2) * 0.35, 0, Math.sin(i * 2) * 0.35]); }));
    return inst(p, g, M(color), list);
  }
  // 地面細節（四面都有）：兩色草叢、野花、小石子；avoid 之外散佈
  function groundDetail(P, g, avoid, o = {}) {
    const rnd = P.rnd, av = [[HERO[0], HERO[1], 0.95], ...avoid], d = grp(g);
    tufts(d, scatter(rnd, o.tufts ?? 22, av), o.grass || C.leaf);
    tufts(d, scatter(rnd, o.tufts2 ?? 12, av), o.grass2 || '#9a9a62');
    const fl = scatter(rnd, o.flowers ?? 12, av);
    if (fl.length) {
      inst(d, once('fstem', () => geoOf(t => { for (let i = 0; i < 3; i++) A(t, G.cyl(0.006, 0.008, 0.16 + i * 0.03, 4), null, [Math.cos(i * 2.1) * 0.05, 0.08 + i * 0.015, Math.sin(i * 2.1) * 0.05]); })), M(C.leafDk), fl);
      inst(d, once('fhead', () => geoOf(t => { for (let i = 0; i < 3; i++) A(t, G.ico(0.032, 0), null, [Math.cos(i * 2.1) * 0.05, 0.17 + i * 0.03, Math.sin(i * 2.1) * 0.05], 0, [1, 0.6, 1]); })), M('#ffffff'), fl, fl.map(() => pick(rnd, o.blooms || [C.cinnabar, '#d9b45a', C.foam, '#c98a6a'])));
    }
    const pb = scatter(rnd, o.pebbles ?? 14, av, 0.5, 4.35).map(([x, , z, r, s]) => [x, 0.02 * s, z, r, s]);
    inst(d, once('peb', () => G.dod(0.06).scale(1.4, 0.55, 1)), M(o.peb || C.stone, { flat: true }), pb);
    return d;
  }
  // 土路／石板路：沿 pts=[[x,z],...] 鋪貼地小板（頂面 ≤0.02，主角站位也能踩）
  function pavePath(P, g, pts, w = 0.6, mats = [C.stoneLt, '#b9b1a3']) {
    const rnd = P.rnd, a = [], b = [], curve = new THREE.CatmullRomCurve3(pts.map(([x, z]) => V(x, 0, z)));
    const n = Math.max(2, Math.round(curve.getLength() / 0.34)), cols = w > 0.5 ? [-0.16, 0.16] : [0];
    for (let i = 0; i <= n; i++) {
      const p = curve.getPointAt(i / n), t = curve.getTangentAt(i / n), ry = Math.atan2(t.x, t.z);
      cols.forEach((c, j) => ((i + j) % 3 ? a : b).push([p.x + Math.cos(ry) * c + (rnd() - 0.5) * 0.04, 0.008, p.z - Math.sin(ry) * c + (rnd() - 0.5) * 0.04, ry + (rnd() - 0.5) * 0.25, 0.85 + rnd() * 0.2]));
    }
    const geo = once('slab', () => G.box(0.28, 0.016, 0.26));
    inst(g, geo, M(mats[0]), a); inst(g, geo, M(mats[1]), b);
  }
  // 陶罐：圓腹、罐口、木蓋
  function jar(p, x, z, s = 1, c = C.ochre, y = 0) {
    A(p, G.sph(0.17 * s, 12, 10), M(c), [x, y + 0.17 * s, z], 0, [1, 1.08, 1]); A(p, G.cyl(0.08 * s, 0.1 * s, 0.08 * s, 10), M(c), [x, y + 0.36 * s, z]);
    A(p, G.cyl(0.095 * s, 0.095 * s, 0.025 * s, 10), M(C.woodDk), [x, y + 0.41 * s, z]);
  }
  // 竹簍：竹篾筒＋橫編環＋口沿；fill＝簍裡的東西（顏色陣列）
  function basket(p, x, z, o = {}) {
    const { r = 0.2, h = 0.3, flare = 1.15, fill, y = 0 } = o, t = grp(p, [x, y, z]), lt = M('#c8a868'), dk = M('#9a7a45');
    A(t, G.cyl(r * flare, r, h, 12, 1, true), lt, [0, h / 2, 0]);
    A(t, G.cyl(r * 0.98, r * 0.98, 0.02, 12), dk, [0, 0.012, 0]);
    for (let k = 1; k < 5; k++) A(t, G.tor(r * (1 + (flare - 1) * k / 5) + 0.006, 0.008, 4, 9), k % 2 ? dk : lt, [0, h * k / 5, 0], [PI / 2, 0, k * 0.3]);
    A(t, G.tor(r * flare, 0.018, 5, 16), M('#7a5a30'), [0, h, 0], [PI / 2, 0, 0]);
    if (fill) for (let i = 0; i < 6; i++) A(t, G.sph(0.06, 7, 5), M(fill[i % fill.length]), [Math.sin(i * 2.4) * r * 0.55 * (i ? 1 : 0), h - 0.02 + (i % 3) * 0.02, Math.cos(i * 2.4) * r * 0.55 * (i ? 1 : 0)], 0, [1.4, 0.6, 0.8]);
    return t;
  }
  // 茅草頂（車床輪廓＋雜湊擾動，邊緣下垂）
  function thatchGeo(r, h, seed, droop = 0.12) {
    const g = lathe([[0, h], [r * 0.25, h * 0.93], [r * 0.55, h * 0.7], [r * 0.8, h * 0.38], [r * 0.95, h * 0.1], [r, -droop * 0.4], [r * 0.97, -droop]], 18);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = 1 + (hash3(Math.round(x * 50) + seed, Math.round(y * 50), Math.round(z * 50)) - 0.5) * 0.08; p.setXYZ(i, x * k, y + (y < 0.05 ? (hash3(x * 9, seed, z * 9) - 0.5) * 0.06 : 0), z * k); }
    g.computeVertexNormals(); return g;
  }
  // 夯土牆：土色方塊＋一層層夯土層線
  function earthWall(p, x, y, z, w, h, d, mat = M(C.earth), line = M(C.earthDk)) {
    A(p, G.box(w, h, d), mat, [x, y + h / 2, z]);
    for (let yy = 0.12; yy < h - 0.03; yy += 0.12) A(p, G.box(w + 0.006, 0.012, d + 0.006), line, [x, y + yy, z]);
  }
  // 茅舍：夯土矮牆＋木門＋茅草頂（戰國庶民小屋，不做翹角）
  function hut(p, x, z, yaw, s = 1) {
    const t = grp(p, [x, 0, z], yaw); t.scale.setScalar(s);
    earthWall(t, 0, 0, 0, 1.0, 0.62, 0.8);
    A(t, G.box(0.3, 0.46, 0.02), M(C.ink), [-0.18, 0.23, 0.405]);
    A(t, G.box(0.24, 0.44, 0.03), M(C.woodLt), [-0.03, 0.22, 0.43], [0, -0.7, 0]);
    A(t, G.box(0.22, 0.14, 0.02), M(C.ink), [0.26, 0.42, 0.405]);
    A(t, thatchGeo(0.78, 0.5, 5, 0.1), M(C.straw, { side: THREE.DoubleSide }), [0, 0.6, 0], null, [1.2, 1, 1.1]);
    A(t, G.cyl(0.05, 0.09, 0.1, 6), M(C.strawDk), [0, 1.12, 0]);
    return bake(t);
  }
  // 字牌材質（有 canvas 才畫字，直書；node 測試退回素色）
  const texMats = {};
  function signMat(txt, bg = '#d9c49a', fg = C.ink) {
    if (typeof document === 'undefined') return M(bg);
    const key = txt + bg;
    if (texMats[key]) return texMats[key];
    const cv = document.createElement('canvas'); cv.width = 96; cv.height = 96 * txt.length;
    const x = cv.getContext('2d'); x.fillStyle = bg; x.fillRect(0, 0, cv.width, cv.height);
    x.fillStyle = fg; x.font = 'bold 72px "Noto Serif TC","Songti TC","PMingLiU",serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    [...txt].forEach((ch, i) => x.fillText(ch, 48, 50 + i * 96));
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
    const m = M('#ffffff').clone(); m.map = tex;
    return (texMats[key] = m);
  }
  // 魚（側躺）：扁橢球身＋尾鰭；頭朝 +x
  const fishGeo = () => once('fish', () => geoOf(t => {
    A(t, G.sph(0.1, 10, 6), null, [0, 0, 0], null, [1.5, 0.55, 0.42]);
    A(t, G.cone(0.07, 0.1, 4), null, [-0.18, 0, 0], [0, 0, PI / 2], [1, 1, 0.3]);
  }));
  // 樹（田邊的桑／榆）：曲幹＋幾團樹冠
  function tree(p, x, z, s, crown = C.leaf, crown2 = '#93a066') {
    const t = grp(p, [x, 0, z]); t.scale.setScalar(s);
    const bark = M(C.bark);
    A(t, tube([V(0, 0, 0), V(0.08, 0.5, 0), V(-0.04, 1.0, 0.04), V(0.03, 1.3, 0)], 0.09, 12, 6), bark);
    A(t, G.cyl(0.12, 0.2, 0.1, 7), bark, [0, 0.05, 0]);
    [[V(0.03, 1.0, 0), V(0.4, 1.3, 0.08)], [V(0, 0.95, 0), V(-0.38, 1.25, -0.08)], [V(0.03, 1.2, 0), V(0.05, 1.6, 0.15)]].forEach(([a, b]) => rod(t, a, b, 0.04, bark, 5));
    [[0.42, 1.45, 0.1, 0.42], [-0.4, 1.4, -0.05, 0.4], [0.05, 1.75, 0.1, 0.45], [0.0, 1.45, -0.3, 0.38], [0.05, 1.4, 0.32, 0.36]]
      .forEach(([cx, cy, cz, r], i) => A(t, G.ico(r, 1), M(i % 2 ? crown2 : crown, { flat: true }), [cx, cy, cz], null, [1, 0.8, 1]));
    return bake(t);
  }

  // ================= 1. fields 舜發於畎畝之中，傅說舉於版築之間 =================
  // 左：舜扶耒耜耕田（田壟、禾苗）；右後：傅說版築（夾板土牆、夯杵、半築的牆）；右側碼頭邊：渡口木牌；左後：田邊大樹、草垛
  function leisi(p, x, z, yaw) {   // 耒耜：斜插土裡的長柄＋橫把＋踏腳＋雙齒
    const t = grp(p, [x, 0, z], yaw), w = M(C.wood), wd = M(C.woodDk);
    rod(t, V(0, 0.06, 0.2), V(0, 0.64, -0.06), 0.022, w);
    rod(t, V(-0.12, 0.64, -0.06), V(0.12, 0.64, -0.06), 0.02, wd);
    rod(t, V(0, 0.2, 0.14), V(0.11, 0.2, 0.14), 0.016, wd);
    for (const s of [-1, 1]) rod(t, V(0, 0.08, 0.2), V(s * 0.05, -0.01, 0.27), 0.014, wd, 5);
    return t;
  }
  LP_BUILD.fields = P => {
    const g = new THREE.Group(), ss = {}, rnd = P.rnd, DOCK = 100;

    // ---- 舜的田畝 ----
    const fc = [-2.45, -0.15];
    const fd = grp(g, [fc[0], 0, fc[1]], 0.12);
    A(fd, G.box(2.3, 0.02, 3.3), M(C.soil), [0, 0.01, 0]);
    const rx = [-0.84, -0.42, 0, 0.42, 0.84];
    inst(fd, once('ridge', () => G.cyl(0.12, 0.12, 3.1, 8, 1, false, PI / 2, PI).rotateX(PI / 2).scale(1, 0.6, 1)), M(C.soilDk), rx.map(x => [x, 0.02, 0]));
    // 禾苗：左兩壟種滿；右三壟只種後半，前半留給正在翻土的舜
    const sp = [];
    rx.forEach((x, i) => { const n = i >= 2 ? 4 : 8; for (let k = 0; k < n; k++) sp.push([x + (rnd() - 0.5) * 0.04, 0.06, -1.35 + k * 0.38, rnd() * 6, 0.85 + rnd() * 0.3]); });
    inst(fd, once('sprout', () => geoOf(t => { for (let i = 0; i < 4; i++) A(t, G.cone(0.03, 0.26, 3).scale(1, 1, 0.3), null, [Math.cos(i * 1.6) * 0.03, 0.12, Math.sin(i * 1.6) * 0.03], [Math.sin(i * 1.6) * 0.4, i * 1.6, Math.cos(i * 1.6) * 0.4]); })), M(C.sprout), sp);
    // 田頭的木水桶、翻起的土塊、耒耜
    const fp = grp(g);
    A(fp, G.cyl(0.15, 0.13, 0.28, 10, 1, true), M(C.woodLt, { side: THREE.DoubleSide }), [-3.7, 0.14, 1.6]);
    A(fp, G.cyl(0.14, 0.14, 0.02, 10), M(C.water), [-3.7, 0.24, 1.6]);
    for (const y of [0.2, 0.06]) A(fp, G.tor(0.15, 0.012, 4, 12), M(C.woodDk), [-3.7, y, 1.6], [PI / 2, 0, 0]);
    inst(fp, once('clod', () => G.dod(0.08).scale(1.3, 0.6, 1)), M(C.soilDk, { flat: true }), [[-1.6, 0.03, 1.45, 0, 1], [-1.45, 0.03, 1.2, 1, 0.8], [-1.8, 0.03, 1.7, 2, 0.9]]);
    leisi(fp, -2.0, 1.05, 0.25);
    bake(fp);
    const fieldEl = grp(g); fieldEl.add(fd, fp);
    P.tag(fieldEl, 'field');
    chibi(P, g, { who: 'shun', pose: 'plough', face: 'calm' }, -2.35, 0.95, CAMF(-2.35, 0.95), 'field');
    ss.field = [-1.2, 1.8];

    // ---- 傅說的版築 ----
    const bz = grp(g, [1.85, 0, -2.35], -0.38);
    earthWall(bz, 0, 0, 0, 2.3, 0.48, 0.44);                      // 已夯好的下段
    A(bz, G.box(2.1, 0.2, 0.36), M('#cfb183'), [0.05, 0.58, 0]);   // 正在夯的這一層鬆土
    for (const sz of [-1, 1]) {                                   // 兩片長夾板＋木樁＋繩箍
      A(bz, G.box(2.3, 0.26, 0.04), M(C.woodLt), [0, 0.61, sz * 0.21]);
      for (let k = 0; k < 6; k++) A(bz, G.box(0.006, 0.24, 0.01), M(C.wood), [-1.0 + k * 0.4, 0.61, sz * 0.233]);
      for (const sx of [-0.95, 0, 0.95]) {
        A(bz, G.cyl(0.03, 0.035, 1.05, 6), M(C.woodDk), [sx, 0.52, sz * 0.26]);
        A(bz, G.tor(0.05, 0.012, 4, 8), M(C.straw), [sx, 0.8, sz * 0.26], [PI / 2, 0, 0]);
      }
    }
    A(bz, G.box(0.04, 0.26, 0.46), M(C.woodLt), [1.16, 0.61, 0]);   // 端板
    for (const sx of [-0.95, 0.95]) rod(bz, V(sx, 0.9, -0.26), V(sx, 0.9, 0.26), 0.012, M(C.straw), 4);
    // 土堆、裝土的竹簍、靠在牆邊的第二支夯杵
    A(bz, G.sph(0.42, 10, 6, 0, PI * 2, 0, PI / 2), M(C.earth), [-1.55, 0, 0.25], null, [1, 0.55, 0.85]);
    basket(bz, -1.1, 0.75, { r: 0.16, h: 0.24, fill: [C.earth, C.earthDk] });
    rod(bz, V(1.45, 0.02, 0.15), V(1.32, 1.0, -0.05), 0.022, M(C.wood));
    A(bz, G.cyl(0.07, 0.08, 0.2, 8), M(C.woodDk), [1.45, 0.1, 0.15]);
    bake(bz);
    // 傅說腳邊直立的夯杵（下端粗木頭）
    const tp = grp(g, [2.15, 0, -1.15]);
    A(tp, G.cyl(0.022, 0.022, 1.0, 6), M(C.wood), [0, 0.6, 0]);
    A(tp, G.cyl(0.075, 0.085, 0.2, 8), M(C.woodDk), [0, 0.1, 0]);
    bake(tp);
    const bzEl = grp(g); bzEl.add(bz, tp);
    P.tag(bzEl, 'banzhu');
    chibi(P, g, { who: 'fuyue', pose: 'tamp', face: 'smile' }, 1.75, -1.25, CAMF(1.75, -1.25), 'banzhu');
    ss.banzhu = [1.0, -0.55];

    // ---- 河岸渡口：碼頭邊的木牌「渡」＋繫船樁＋一捆繩 ----
    const dk = grp(g);
    const [sx, sz] = polar(88, 3.85);
    const sg = grp(dk, [sx, 0, sz], RAD(CAMF(sx, sz)));
    A(sg, G.cyl(0.04, 0.045, 1.3, 6), M(C.woodDk), [0, 0.65, 0]);
    A(sg, G.box(0.3, 0.56, 0.04), M(C.woodDk), [0, 1.0, 0.03]);
    A(sg, G.box(0.24, 0.48, 0.01), signMat('渡'), [0, 1.0, 0.056]);
    A(sg, G.box(0.36, 0.05, 0.08), M(C.wood), [0, 1.3, 0.03]);
    const [px, pz] = polar(106, 4.05), [cx, cz] = polar(114, 3.7);
    A(dk, G.cyl(0.06, 0.07, 0.55, 7), M(C.wood), [px, 0.27, pz]);
    A(dk, G.tor(0.07, 0.02, 5, 10), M(C.straw), [px, 0.42, pz], [PI / 2, 0, 0]);
    A(dk, G.tor(0.14, 0.035, 5, 14), M(C.straw), [cx, 0.035, cz], [PI / 2, 0, 0]);
    A(dk, G.tor(0.09, 0.03, 5, 12), M(C.strawDk), [cx, 0.08, cz], [PI / 2, 0, 0]);
    bake(dk);
    P.tag(dk, 'dock');
    ss.dock = [2.75, 0.75];

    // ---- 點景：田邊大樹、草垛、往渡口的土路 ----
    const dec = grp(g);
    tree(dec, -0.85, -3.55, 1.05);
    A(dec, G.cone(0.45, 0.75, 9), M(C.straw, { flat: true }), [0.25, 0.37, -3.45]);
    A(dec, G.cyl(0.42, 0.45, 0.25, 9), M(C.strawDk), [0.25, 0.12, -3.45]);
    bake(dec);
    pavePath(P, g, [[0.4, 2.2], [1.4, 1.5], [2.3, 0.9], [3.4, 0.4]], 0.4, ['#b89a70', '#a88a62']);
    groundDetail(P, g, [[fc[0], fc[1], 1.95], [1.85, -2.35, 1.4], [sx, sz, 0.5], [px, pz, 0.4], [cx, cz, 0.4], [-0.85, -3.55, 0.6], [0.25, -3.45, 0.6], ...Object.values(ss).map(([x, z]) => [x, z, 0.45])], { tufts: 26, flowers: 14 });

    g.userData.standSpots = ss;
    g.userData.dock = DOCK;
    g.userData.rim = [30, 160, 215, 320];
    return g;
  };

  // ================= 2. market 膠鬲舉於魚鹽之中，管夷吾舉於士，孫叔敖舉於海，百里奚舉於市 =================
  // 左前：膠鬲的魚鹽攤；左後：管仲的木囚車；右後島緣：孫叔敖的海濱（礁石浪花、茅舍）；右前：百里奚的市集（五張羊皮）
  function bambooStall(p, w, d, h) {   // 四根竹竿＋前低後高的草蓆頂
    const t = grp(p), bb = M(C.bamboo), mat = M(C.straw, { side: THREE.DoubleSide });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const hh = sz < 0 ? h : h - 0.2; A(t, G.cyl(0.03, 0.035, hh, 6), bb, [sx * w / 2, hh / 2, sz * d / 2]); }
    const tilt = Math.atan2(0.2, d), L = Math.hypot(d, 0.2) + 0.25;
    A(t, G.box(w + 0.3, 0.035, L), mat, [0, h - 0.08, 0], [tilt, 0, 0]);
    for (let k = 0; k < 7; k++) A(t, G.box(0.012, 0.04, L), M(C.strawDk), [-w / 2 - 0.1 + k * (w + 0.2) / 6, h - 0.06, 0], [tilt, 0, 0]);
    return t;
  }
  function wheel(p, x, y, z, r = 0.34) {
    const t = grp(p, [x, y, z], PI / 2);
    A(t, G.tor(r, 0.035, 5, 18), M(C.woodDk));
    A(t, G.cyl(0.06, 0.06, 0.12, 8), M(C.wood), [0, 0, 0], [PI / 2, 0, 0]);
    for (let k = 0; k < 8; k++) { const a = k / 8 * PI * 2; rod(t, V(0, 0, 0), V(Math.cos(a) * r, Math.sin(a) * r, 0), 0.016, M(C.wood), 4); }
    return t;
  }
  LP_BUILD.market = P => {
    const g = new THREE.Group(), ss = {}, DOCK = 175;

    // ---- 膠鬲的魚鹽攤 ----
    const fs = grp(g, [-2.75, 0, 0.75], 0.4);
    bambooStall(fs, 1.3, 0.85, 1.45);
    A(fs, G.box(1.1, 0.05, 0.5), M(C.woodLt), [0, 0.46, -0.1]);   // 攤板
    for (const sx of [-0.45, 0.45]) A(fs, G.box(0.06, 0.44, 0.4), M(C.woodDk), [sx, 0.22, -0.1]);
    basket(fs, -0.3, -0.1, { r: 0.16, h: 0.2, y: 0.485, fill: [C.fish, '#a7b2b8', '#7a868e'] });
    A(fs, G.cone(0.2, 0.22, 10), M(C.salt), [0.25, 0.595, -0.12]);                 // 攤上一堆鹽
    A(fs, G.sph(0.14, 8, 6), M(C.salt), [0.5, 0.12, 0.35], null, [1, 0.8, 0.9]);  // 地上兩袋鹽
    A(fs, G.sph(0.12, 8, 6), M('#e2d9c6'), [0.62, 0.1, 0.12], null, [1, 0.8, 0.9]);
    A(fs, G.cyl(0.035, 0.035, 0.05, 6), M(C.straw), [0.5, 0.24, 0.35]);
    A(fs, G.box(1.25, 0.02, 0.03), M(C.bambooDk), [0, 1.25, 0.32]);   // 曬魚竹竿＋四條掛魚
    inst(fs, once('fishV', () => fishGeo().clone().rotateZ(-PI / 2)), M(C.fish), [-0.42, -0.14, 0.14, 0.42].map((x, i) => [x, 1.08, 0.32, 0, 0.9 + (i % 2) * 0.15]));
    inst(fs, fishGeo(), M('#8a96a0'), [[-0.05, 0.52, 0.02, 0.2, 1], [0.05, 0.52, -0.22, -0.3, 0.9]]);
    A(fs, G.box(0.24, 0.44, 0.03), signMat('魚鹽'), [-0.5, 0.95, 0.44]);   // 竹牌「魚鹽」
    A(fs, G.cyl(0.012, 0.012, 0.25, 4), M(C.bambooDk), [-0.5, 1.23, 0.44]);
    bake(fs);
    P.tag(fs, 'fish');
    chibi(P, g, { who: 'jiaoge', pose: 'hold', face: 'smile' }, -1.75, 1.35, CAMF(-1.75, 1.35), 'fish');
    ss.fish = [-1.05, 1.85];

    // ---- 管仲的木囚車（車上是木籠，正面只留兩根柵，看得到臉） ----
    const pc = [-2.05, -2.45], BASE = 0.46, H = 1.05, top = BASE + H;
    const cart = grp(g, [pc[0], 0, pc[1]], 0.45);
    A(cart, G.box(1.1, 0.08, 0.78), M(C.wood), [0, BASE - 0.04, 0]);
    A(cart, G.cyl(0.03, 0.03, 1.4, 6), M(C.woodDk), [0, 0.34, 0], [0, 0, PI / 2]);   // 車軸
    for (const s of [-1, 1]) wheel(cart, s * 0.64, 0.34, 0);
    for (const s of [-1, 1]) rod(cart, V(s * 0.3, BASE - 0.06, -0.38), V(s * 0.3, 0.32, -1.15), 0.025, M(C.wood));   // 車轅往後
    for (const x of [-0.5, 0.5]) for (const z of [-0.34, 0.34]) A(cart, G.box(0.06, H, 0.06), M(C.woodDk), [x, BASE + H / 2, z]);
    for (const z of [-0.34, 0.34]) A(cart, G.box(1.06, 0.06, 0.06), M(C.woodDk), [0, top, z]);
    for (const x of [-0.5, 0.5]) A(cart, G.box(0.06, 0.06, 0.74), M(C.woodDk), [x, top, 0]);
    const bar = M(C.wood);
    for (let k = 1; k < 6; k++) A(cart, G.cyl(0.018, 0.018, H, 5), bar, [-0.5 + k / 6, BASE + H / 2, -0.34]);   // 背面柵欄
    for (const x of [-0.5, 0.5]) for (let k = 1; k < 4; k++) A(cart, G.cyl(0.018, 0.018, H, 5), bar, [x, BASE + H / 2, -0.34 + k * 0.17]);   // 兩側柵欄
    for (const x of [-0.36, 0.36]) A(cart, G.cyl(0.018, 0.018, H, 5), bar, [x, BASE + H / 2, 0.34]);
    A(cart, G.box(1.06, 0.05, 0.06), M(C.woodDk), [0, BASE + 0.2, 0.34]);
    A(cart, G.box(1.2, 0.04, 0.86), M(C.woodLt), [0, top + 0.05, 0]);   // 頂板
    bake(cart);
    P.tag(cart, 'prison');
    chibi(P, g, { who: 'guanzhong', pose: 'bound', face: 'worried', scale: 0.88 }, pc[0], pc[1], CAMF(pc[0], pc[1]), 'prison', BASE);
    ss.prison = [-1.05, -1.25];

    // ---- 孫叔敖的海濱：島緣一灣淺水、礁石浪花、小茅舍 ----
    const co = grp(g);
    const [wx, wz] = polar(150, 3.65);
    A(co, new THREE.CircleGeometry(0.72, 28).rotateX(-PI / 2), M(C.water, { transparent: true, opacity: 0.85, depthWrite: false }), [wx, 0.015, wz]);
    A(co, G.tor(0.72, 0.04, 4, 28), M(C.foam), [wx, 0.02, wz], [PI / 2, 0, 0]);
    inst(co, once('reef', () => G.dod(0.3)), M('#7d827e', { flat: true }), [[128, 4.15, 0.26], [140, 4.28, 0.2], [154, 4.2, 0.27], [163, 4.0, 0.22], [135, 3.95, 0.16]].map(([a, r, s], i) => { const [x, z] = polar(a, r); return [x, s * 0.45, z, i * 1.3, [s / 0.3, s / 0.3 * 0.9, s / 0.3]]; }));
    inst(co, once('foamB', () => G.sph(0.14, 10, 6)), M(C.foam), [[134, 4.3], [147, 4.35], [159, 4.28]].map(([a, r], i) => { const [x, z] = polar(a, r); return [x, 0.05, z, i, [1.3, 0.35, 1]]; }));
    const rip = [0, 1].map(() => A(co, G.tor(0.32, 0.012, 3, 24), MB('#eef3ef', { transparent: true, opacity: 0.6, depthWrite: false }), [wx, 0.03, wz], [PI / 2, 0, 0]));
    P.anim.push((dt, t) => rip.forEach((r, k) => { const u = (t * 0.28 + k * 0.5) % 1; r.scale.set(0.3 + u * 1.7, 0.3 + u * 1.7, 1); r.material.opacity = 0.6 * (1 - u); }));
    const [hx, hz] = polar(122, 3.55);
    hut(co, hx, hz, RAD(faceTo(hx, hz, 0, 1.5)), 0.95);
    P.tag(co, 'coast');
    chibi(P, g, { who: 'sunshuao', pose: 'stand', face: 'calm' }, 1.6, -2.1, CAMF(1.6, -2.1), 'coast');
    ss.coast = [0.95, -1.2];

    // ---- 百里奚的市集：木架上五張羊皮、陶罐、朱紅市旗 ----
    const bzr = grp(g, [3.0, 0, 1.3], -0.6);
    for (const x of [-0.62, 0.62]) A(bzr, G.cyl(0.035, 0.04, 1.25, 6), M(C.woodDk), [x, 0.62, 0]);
    A(bzr, G.cyl(0.025, 0.025, 1.4, 6), M(C.wood), [0, 1.18, 0], [0, 0, PI / 2]);
    const skin = once('sheep', () => geoOf(t => {
      A(t, G.sph(0.2, 10, 6), null, [0, -0.25, 0], null, [0.75, 1.05, 0.12]);
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) A(t, G.sph(0.06, 6, 4), null, [sx * 0.15, -0.25 + sy * 0.18, 0], [0, 0, sx * sy * 0.6], [1.3, 0.6, 0.4]);
    }));
    inst(bzr, skin, M('#ffffff'), [-0.5, -0.25, 0, 0.25, 0.5].map((x, i) => [x, 1.17, (i % 2) * 0.04, 0, 0.9 + (i % 2) * 0.1]), [C.sheep, '#e2d4b8', C.sheep, '#d9c9a8', C.sheep]);
    jar(bzr, -0.95, 0.15, 0.85); jar(bzr, -0.75, 0.42, 0.65, '#7a5a40');
    basket(bzr, 0.95, 0.3, { r: 0.16, h: 0.22, fill: [C.earth, C.ochre] });
    A(bzr, G.cyl(0.02, 0.02, 1.8, 5), M(C.woodDk), [1.05, 0.9, -0.15]);   // 市旗
    A(bzr, G.box(0.3, 0.42, 0.03), signMat('市', C.cinnabar, '#f3e6c8'), [0.88, 1.52, -0.15]);
    bake(bzr);
    P.tag(bzr, 'bazaar');
    chibi(P, g, { who: 'baili', pose: 'stand', face: 'calm' }, 2.2, 2.0, CAMF(2.2, 2.0), 'bazaar');
    ss.bazaar = [1.4, 2.2];

    // ---- 點景：市集裡的土路 ----
    pavePath(P, g, [[-1.9, 2.4], [-0.6, 1.5], [0.6, 1.4], [1.9, 2.5]], 0.5, ['#c2a273', '#b29466']);
    groundDetail(P, g, [[-2.75, 0.75, 1.1], [...pc, 1.25], [wx, wz, 1.0], [hx, hz, 0.8], [3.0, 1.3, 1.1], [...polar(DOCK, 4.2), 0.8], ...Object.values(ss).map(([x, z]) => [x, z, 0.45])], { tufts: 16, flowers: 8, grass: '#8f8a52' });

    g.userData.standSpots = ss;
    g.userData.dock = DOCK;
    g.userData.rim = [25, 95, 250, 320];
    return g;
  };

  // ================= 3. road 天將降大任於是人也，必先苦其心志，勞其筋骨…… =================
  // 後方：崎嶇山路（亂石小山＋盤繞而上的石階）；左：背重行囊、拄竹杖的人在風雨中前行；右：路邊茅亭歇腳（遞水相助）；右後：岔路口路標
  const ROCK = ['#a9b0b0', '#8d969a', '#727c80', '#5f686c'];
  function rockGeo(rx, h, rz, o = {}) {   // 嶙峋石塊：頂點擾動＋依面朝向上色（冷灰青）
    const { seg = 8, rings = 3, top = 0.45, jit = 0.18, seed = 0, x = 0, z = 0 } = o;
    const g = new THREE.CylinderGeometry(top, 1, 1, seg, rings); g.translate(0, 0.5, 0);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const px = p.getX(i), py = p.getY(i), pz = p.getZ(i), a = hash3(px * 3 + seed, py * 5, pz * 3), b = hash3(pz * 3, px * 3 + seed, py * 7);
      const k = 1 + (a - 0.5) * 2 * jit;
      p.setXYZ(i, px * k * rx + x, py * h * (py < 0.001 ? 1 : 1 + (b - 0.5) * jit), pz * rz * k + z);
    }
    const n = g.toNonIndexed(); n.deleteAttribute('uv'); n.computeVertexNormals();
    const nr = n.attributes.normal, col = [], c = new THREE.Color();
    for (let i = 0; i < nr.count; i += 3) { const ny = nr.getY(i), r = hash3(i * 0.37 + seed, 1.3, 2.1); c.set(ny > 0.5 ? ROCK[r < 0.6 ? 0 : 1] : ROCK[r < 0.3 ? 3 : r < 0.7 ? 2 : 1]); for (let k = 0; k < 3; k++) col.push(c.r, c.g, c.b); }
    n.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    return n;
  }
  LP_BUILD.road = P => {
    const g = new THREE.Group(), ss = {}, rnd = P.rnd, DOCK = 250;

    // ---- 崎嶇山路：亂石小山＋石階盤繞而上 ----
    const HC = [-0.35, -3.0];
    const hill = grp(g, [HC[0], 0, HC[1]]);
    A(hill, BGU.mergeGeometries([
      rockGeo(1.05, 0.55, 0.95, { seed: 1, top: 0.85 }),
      rockGeo(0.78, 1.0, 0.7, { seed: 2, top: 0.7, x: -0.05, z: -0.1 }),
      rockGeo(0.5, 1.45, 0.48, { seed: 3, top: 0.55, x: -0.1, z: -0.15 }),
      rockGeo(0.45, 0.7, 0.4, { seed: 4, x: -0.95, z: 0.3 }),
      rockGeo(0.35, 0.5, 0.3, { seed: 5, x: 0.95, z: -0.55 })
    ]), M('#ffffff', { vertexColors: true, flat: true }));
    // 石階：從右前山腳逆時針繞上山頂，每階一塊實心石（越高越內收）
    const steps = [];
    for (let i = 0; i < 11; i++) { const a = RAD(35 - i * 24), r = 1.25 - i * 0.05, h = 0.1 + i * 0.13; steps.push([Math.sin(a) * r, 0, Math.cos(a) * r, a, [1, h / 0.1, 1]]); }
    const stepGeo = once('step', () => G.box(0.42, 0.1, 0.3).translate(0, 0.05, 0));
    inst(hill, stepGeo, M('#b8bcb6'), steps.filter((s, i) => i % 2 === 0));
    inst(hill, stepGeo, M('#a3a8a3'), steps.filter((s, i) => i % 2 === 1));
    // 山頂一棵被風吹斜的小松、山腳亂石
    A(hill, G.cyl(0.03, 0.05, 0.55, 5), M(C.bark), [-0.15, 1.65, -0.15], [0, 0, -0.35]);
    A(hill, G.cone(0.32, 0.42, 7), M('#56685a', { flat: true }), [0.0, 1.95, -0.15], [0, 0, -0.4], [1.2, 1, 0.9]);
    inst(hill, once('boulder', () => G.dod(0.18)), M('#868e90', { flat: true }), [[1.05, 0.08, 0.95, 0, 1], [1.45, 0.1, 0.35, 1, 1.2], [-1.25, 0.08, 0.9, 2, 0.9], [0.6, 0.06, 1.4, 3, 0.7]]);
    bake(hill);
    P.tag(hill, 'road');
    ss.road = [0.75, -1.25];

    // ---- 行囊與風雨：背著大包袱、拄竹杖的人，頭上一朵雨雲斜斜下雨 ----
    const bc = [-2.65, 0.35];
    const bd = grp(g);
    const pack = grp(bd, [bc[0], 0, bc[1]], RAD(CAMF(bc[0], bc[1])));
    A(pack, G.box(0.62, 0.62, 0.3), M('#8a7458'), [0, 0.72, -0.44]);   // 背上大包袱（比頭寬，正面看得到）
    A(pack, G.sph(0.24, 8, 6), M('#a08a6a'), [0, 1.06, -0.46], null, [1.2, 0.6, 0.8]);
    A(pack, G.cone(0.3, 0.16, 12), M(C.straw), [0, 1.27, -0.46]);     // 綁在包上的斗笠
    for (const x of [-0.13, 0.13]) A(pack, G.box(0.04, 0.2, 0.18), M(C.woodDk), [x, 0.52, -0.22]);
    rod(pack, V(0.32, 0.0, 0.14), V(0.28, 1.15, 0.06), 0.018, M(C.bambooDk), 5);   // 竹杖
    for (let k = 1; k < 5; k++) A(pack, G.tor(0.022, 0.006, 3, 6), M(C.bamboo), [0.32 - k * 0.008, k * 0.23, 0.14 - k * 0.016], [PI / 2, 0, 0]);
    const cloud = grp(bd, [bc[0] - 0.1, 2.35, bc[1] - 0.2]);
    [[0, 0, 0, 0.42], [0.38, -0.05, 0.05, 0.32], [-0.4, -0.06, 0, 0.3], [0.1, 0.12, -0.1, 0.3]].forEach(([x, y, z, r]) => A(cloud, G.ico(r, 1), M('#8f979b', { flat: true }), [x, y, z], null, [1.2, 0.6, 0.9]));
    bake(bd);
    // 雨絲：斜線往下飄（一個 InstancedMesh）
    const RN = 46, rm = new THREE.InstancedMesh(once('rain', () => G.cyl(0.006, 0.006, 0.28, 3)), MB('#c9d4d8', { transparent: true, opacity: 0.7 }), RN);
    const drops = Array.from({ length: RN }, () => [bc[0] - 0.75 + rnd() * 1.4, rnd(), bc[1] - 0.7 + rnd() * 1.1]);
    const md = new THREE.Object3D(); md.rotation.set(0, 0, -0.38);
    const upd = t => { drops.forEach(([x, u0, z], i) => { const u = (u0 + t * 0.9) % 1; md.position.set(x + (1 - u) * 0.6 - 0.3, 0.3 + (1 - u) * 1.8, z); md.updateMatrix(); rm.setMatrixAt(i, md.matrix); }); rm.instanceMatrix.needsUpdate = true; };
    upd(0); bd.add(rm);
    P.anim.push((dt, t) => upd(t));
    P.tag(bd, 'burden');
    chibi(P, g, { who: 'scholar', pose: 'carry', face: 'worried' }, bc[0], bc[1], CAMF(bc[0], bc[1]), 'burden');
    ss.burden = [-1.35, 1.35];

    // ---- 路邊歇腳亭：茅亭、長凳、水罐；一人坐著歇、一人遞水 ----
    const rc = [2.35, 1.25];
    const pav = grp(g, [rc[0], 0, rc[1]], 0.3);
    A(pav, G.cyl(0.9, 0.95, 0.1, 10), M(C.stone, { flat: true }), [0, 0.05, 0]);
    for (const x of [-0.62, 0.62]) for (const z of [-0.62, 0.62]) A(pav, G.cyl(0.045, 0.05, 1.3, 6), M(C.woodDk), [x, 0.7, z]);
    for (const z of [-0.62, 0.62]) A(pav, G.box(1.3, 0.06, 0.06), M(C.wood), [0, 1.33, z]);
    for (const x of [-0.62, 0.62]) A(pav, G.box(0.06, 0.06, 1.3), M(C.wood), [x, 1.33, 0]);
    A(pav, thatchGeo(1.15, 0.7, 7, 0.12), M(C.straw, { side: THREE.DoubleSide }), [0, 1.36, 0]);
    A(pav, G.cyl(0.06, 0.1, 0.12, 6), M(C.strawDk), [0, 2.08, 0]);
    A(pav, G.box(0.9, 0.06, 0.28), M(C.woodLt), [0, 0.38, -0.4]);   // 長凳
    for (const x of [-0.38, 0.38]) A(pav, G.box(0.06, 0.28, 0.24), M(C.woodDk), [x, 0.24, -0.4]);
    jar(pav, 0.55, 0.2, 0.9, '#7a6a58', 0.1);
    A(pav, G.cyl(0.05, 0.04, 0.08, 8), M(C.ochre), [0.38, 0.14, 0.38]);   // 小陶碗
    bake(pav);
    P.tag(pav, 'rest');
    pav.updateMatrixWorld(true);
    const seat = V(-0.1, 0, -0.4).applyMatrix4(pav.matrixWorld), hp = V(-0.42, 0, 0.15).applyMatrix4(pav.matrixWorld);
    const sit = chibi(P, g, { who: 'scholar', pose: 'sit', face: 'smile', seed: 3 }, seat.x, seat.z, CAMF(seat.x, seat.z), 'rest');
    sit.position.y = 0.41 - (sit.userData.seatY ?? 0.2);
    chibi(P, g, { who: 'craftsman', pose: 'hold', face: 'smile' }, hp.x, hp.z, CAMF(hp.x, hp.z), 'rest', 0.1);
    ss.rest = [0.85, 2.2];

    // ---- 岔路口：一根路標分出兩塊箭頭木牌，地上的路分成兩條 ----
    const fk = [2.95, -1.6];
    const fork = grp(g, [fk[0], 0, fk[1]], -0.6);
    A(fork, G.cyl(0.05, 0.06, 1.45, 6), M(C.woodDk), [0, 0.72, 0]);
    A(fork, G.cyl(0.14, 0.18, 0.12, 7), M(C.stone, { flat: true }), [0, 0.06, 0]);
    const arrow = once('arrow', () => { const s = new THREE.Shape(); s.moveTo(0, -0.08); s.lineTo(0.42, -0.08); s.lineTo(0.52, 0); s.lineTo(0.42, 0.08); s.lineTo(0, 0.08); s.closePath(); return new THREE.ExtrudeGeometry(s, { depth: 0.03, bevelEnabled: false }).translate(0, 0, -0.015); });
    A(fork, arrow, M(C.woodLt), [0.03, 1.22, 0], [0, 0.55, 0.12]);
    A(fork, arrow, M(C.wood), [-0.03, 1.0, 0], [0, PI - 0.55, -0.1]);
    A(fork, G.cyl(0.07, 0.07, 0.03, 8), M(C.cinnabar), [0, 1.46, 0]);   // 樁頂一抹朱砂
    bake(fork);
    P.tag(fork, 'fork');
    ss.fork = [1.9, -0.8];

    // ---- 路：主角腳下 → 岔路口 → 分成往山路、往島緣兩條；另一條往左通風雨中的旅人 ----
    const PATH = ['#9fa5a2', '#8d9390'];
    pavePath(P, g, [[0.3, 2.0], [0.9, 0.7], [1.8, -0.5], [2.6, -1.3]], 0.6, PATH);
    pavePath(P, g, [[2.55, -1.8], [1.7, -2.25], [0.8, -2.05]], 0.4, PATH);
    pavePath(P, g, [[3.25, -1.25], [3.75, -0.85], [4.1, -0.55]], 0.4, PATH);
    pavePath(P, g, [[-0.3, 2.0], [-1.2, 1.3], [-2.2, 1.1], [-3.6, 0.6]], 0.4, PATH);
    groundDetail(P, g, [[HC[0], HC[1], 1.6], [...bc, 0.9], [...rc, 1.25], [...fk, 0.5], [...polar(DOCK, 4.0), 0.8], ...Object.values(ss).map(([x, z]) => [x, z, 0.45])], { tufts: 22, tufts2: 10, flowers: 4, grass: '#6e7a62', grass2: '#87907a', peb: '#8d969a' });

    g.userData.standSpots = ss;
    g.userData.dock = DOCK;
    g.userData.rim = [30, 130, 200, 315];
    return g;
  };
})();
