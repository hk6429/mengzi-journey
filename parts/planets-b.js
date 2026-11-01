// ================= STATIONS B（B 線，愛蓮說第二輪：大荷葉平台）：jing、xiang、pin、lianxi =================
// 每站一片大荷葉（C 線 lpLotusLeaf 畫）：原點＝葉心、葉面 y=0、+z 朝預設鏡頭；B 線內容全放半徑 4.6 內。
// 主角周敦頤站 (0, 0, 2.6)，半徑 0.7 只允許貼地鋪面（≤0.04）。主建築放 z<0、背面完整；配角 P.chibi，臉朝 +z（cos≥0.5）。
// userData：standSpots＝{elId:[x,z]}、rim＝葉緣點綴角度、notch＝荷葉缺口方向（度，0＝+z、90＝+x，atan2(x, z)）；缺口楔形內（±18°、r>3）不放東西。
// 宋代淡彩工筆：低彩度、米白紙感。材質一律 lpCel（還沒有時退回 lpMat）；水、香氣絲帶、燈光用 MeshBasic。包在 IIFE 裡，避免和 planets-a 撞名。
(() => {
  const PI = Math.PI, DEG = PI / 180, HERO = [0, 2.6, 0.75];
  const M = (h, o) => (typeof lpCel === 'function' ? lpCel : lpMat)(h, o);
  const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const V2 = (x, y) => new THREE.Vector2(x, y);
  let Y, dummy; // THREE 在 boot 才載入：第一次建站時才建立
  const init = () => { if (!dummy) { Y = V(0, 1, 0); dummy = new THREE.Object3D(); } };
  const COL = { cinnabar: '#9a4a3a', dai: '#3a4a5c', wood: '#8a5a3a', woodDk: '#5e3d27', tile: '#666b70', ink: '#2b2622', stem: '#6d955a' };
  const mat = h => (typeof h === 'string' ? M(h) : h);
  const add = (p, geo, h, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat(h)); m.position.set(x, y, z); p.add(m); return m; };
  const box = (p, w, h, d, c, x = 0, y = 0, z = 0) => add(p, new THREE.BoxGeometry(w, h, d), c, x, y, z); // y＝中心
  const grp = (p, x = 0, y = 0, z = 0, yaw = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = yaw * DEG; if (p) p.add(g); return g; };
  // InstancedMesh：items＝{x,y,z,rx,ry,rz,q,s,sx,sy,sz,c}；有 c 時用白底材質＋instanceColor
  function inst(p, geo, c, items) {
    const colored = items.some(o => o.c), m = new THREE.InstancedMesh(geo, colored ? M('#ffffff') : mat(c), Math.max(1, items.length));
    m.count = items.length;
    items.forEach((o, i) => {
      dummy.position.set(o.x || 0, o.y || 0, o.z || 0);
      if (o.q) dummy.quaternion.copy(o.q); else dummy.rotation.set(o.rx || 0, o.ry || 0, o.rz || 0);
      const s = o.s ?? 1; dummy.scale.set(o.sx ?? s, o.sy ?? s, o.sz ?? s); dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix); if (colored) m.setColorAt(i, new THREE.Color(o.c || c));
    });
    m.instanceMatrix.needsUpdate = true; m.computeBoundingSphere(); m.computeBoundingBox(); p.add(m); return m;
  }
  const merge = gs => BGU.mergeGeometries(gs.map(x => x.index ? x.toNonIndexed() : x));
  const bx = (w, h, d, x = 0, y = 0, z = 0) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
  const basic = (hex, op = 1) => new THREE.MeshBasicMaterial({ color: hex, transparent: op < 1, opacity: op, depthWrite: op >= 1, toneMapped: false });
  const flatDisc = (r = 1, n = 14) => new THREE.CircleGeometry(r, n).rotateX(-PI / 2);
  const lathe = (pts, n = 16) => new THREE.LatheGeometry(pts.map(([r, y]) => V2(r, y)), n);
  const VC = (o = {}) => M('#ffffff', { vertexColors: true, ...o });

  // ---------- 配角：P.chibi（C 線）；anim 交給 scene ----------
  function who(P, p, spec, x, z, yaw = 0, y = 0) {
    const c = P.chibi(spec); P.at(c, x, z, yaw, y); c.userData.chibi = true; p.add(c);
    P.anim.push((dt, t) => c.userData.anim && c.userData.anim(dt, t)); return c;
  }
  const faceTo = (x, z, tx = HERO[0], tz = HERO[1]) => Math.atan2(tx - x, tz - z) / DEG; // 面向 (tx,tz) 的 yaw（度）

  // ================= 屋頂（陋室銘 B 線）：凹曲面＋翹角＋筒瓦（Instanced）＋瓦當＋垂脊＋正脊＋鴟吻；Wr=W 兩坡、Wr 小＝近攢尖 =================
  function roof(p, W, D, H, o = {}) {
    const { Wr = Math.max(0.15, W - D), up = 0.18, t0 = 0, t1 = 1, y = 0, tile = COL.tile, ridgeC = COL.ink, nt = 9, chiwen = true } = o;
    const ax = t => W + (Wr - W) * t, az = t => Math.max(D * (1 - t), 1e-3), yy = t => H * Math.pow(t, 1.7);
    const lift = (x, z, t) => up * Math.pow(Math.min(Math.abs(x) / ax(t), Math.abs(z) / az(t), 1), 4) * (1 - t) * (1 - t);
    const nx = 14, nz = 6, ring = t => {
      const a = ax(t), b = az(t), pts = [];
      for (let i = 0; i < nx; i++) pts.push([-a + 2 * a * i / nx, b]);
      for (let i = 0; i < nz; i++) pts.push([a, b - 2 * b * i / nz]);
      for (let i = 0; i < nx; i++) pts.push([a - 2 * a * i / nx, -b]);
      for (let i = 0; i < nz; i++) pts.push([-a, -b + 2 * b * i / nz]);
      return pts.map(([x, z]) => [x, yy(t) + lift(x, z, t), z]);
    };
    const rings = [ring(t0).map(([x, yv, z]) => [x * 1.01, yv - 0.07, z * 1.01])];
    for (let k = 0; k <= nt; k++) rings.push(ring(t0 + (t1 - t0) * k / nt));
    const N = rings[0].length, pos = [], idx = [];
    rings.forEach(r => r.forEach(v => pos.push(...v)));
    for (let k = 0; k < rings.length - 1; k++) for (let i = 0; i < N; i++) { const a = k * N + i, b = k * N + (i + 1) % N, c = a + N, d = b + N; idx.push(a, c, b, b, c, d); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
    const g = grp(p, 0, y, 0);
    add(g, geo, M(tile, { side: THREE.DoubleSide }));
    const tiles = [], tg = new THREE.CylinderGeometry(0.03, 0.03, 1, 6).rotateX(PI / 2), K = 7;
    const putRow = fp => { for (let k = 0; k < K; k++) { const A = fp(t0 + (t1 - t0) * k / K), B = fp(t0 + (t1 - t0) * (k + 1) / K); if (!A || !B) continue; const mid = A.clone().add(B).multiplyScalar(0.5); mid.y += 0.025; dummy.position.copy(mid); dummy.lookAt(mid.clone().add(B.clone().sub(A))); tiles.push({ x: mid.x, y: mid.y, z: mid.z, q: dummy.quaternion.clone(), sz: A.distanceTo(B) * 1.04 }); } };
    for (let x0 = -W + 0.1; x0 < W - 0.05; x0 += 0.12) for (const s of [1, -1]) putRow(t => Math.abs(x0) < ax(t) * 0.97 ? V(x0, yy(t) + lift(x0, az(t), t), s * az(t)) : null);
    if (Wr < W - 0.05) for (let z0 = -D + 0.1; z0 < D - 0.05; z0 += 0.12) for (const s of [1, -1]) putRow(t => Math.abs(z0) < az(t) * 0.92 ? V(s * ax(t), yy(t) + lift(ax(t), z0, t), z0) : null);
    inst(g, tg, tile, tiles);
    const eaves = []; for (let x0 = -W + 0.1; x0 < W - 0.05; x0 += 0.12) for (const s of [1, -1]) eaves.push({ x: x0, y: yy(t0) + lift(x0, az(t0), t0) - 0.01, z: s * (az(t0) + 0.02), rx: PI / 2 });
    inst(g, new THREE.CylinderGeometry(0.035, 0.035, 0.03, 8), COL.dai, eaves);
    const hips = [];
    for (const sx of [1, -1]) for (const sz of [1, -1]) for (let k = 0; k < 8; k++) {
      const ta = t0 + (t1 - t0) * k / 8, tb = t0 + (t1 - t0) * (k + 1) / 8;
      const A = V(sx * ax(ta), yy(ta) + lift(ax(ta), az(ta), ta) + 0.04, sz * az(ta)), B = V(sx * ax(tb), yy(tb) + lift(ax(tb), az(tb), tb) + 0.04, sz * az(tb));
      const mid = A.clone().add(B).multiplyScalar(0.5); dummy.position.copy(mid); dummy.lookAt(B); hips.push({ x: mid.x, y: mid.y, z: mid.z, q: dummy.quaternion.clone(), sz: A.distanceTo(B) * 1.05 });
    }
    inst(g, new THREE.BoxGeometry(0.07, 0.07, 1), ridgeC, hips);
    if (t1 >= 1) {
      box(g, Wr * 2 + 0.12, 0.13, 0.11, ridgeC, 0, H + 0.04, 0);
      if (chiwen) {
        const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(0.2, 0); s.quadraticCurveTo(0.27, 0.22, 0.14, 0.4); s.quadraticCurveTo(0.04, 0.47, -0.04, 0.38); s.quadraticCurveTo(0.08, 0.33, 0.07, 0.2); s.lineTo(0, 0.14); s.closePath();
        const cg = new THREE.ExtrudeGeometry(s, { depth: 0.07, bevelEnabled: false, curveSegments: 6 }).translate(0, 0, -0.035);
        const k = Math.min(1.0, 0.45 + H * 0.3);
        for (const sx of [1, -1]) add(g, cg, M(COL.dai, { side: THREE.DoubleSide }), sx * (Wr + 0.02), H + 0.08, 0).scale.set(-sx * k, k, k);
      }
    }
    return g;
  }
  // 欄杆：前面留 gap（0＝不留）
  function balustrade(p, bw, bd, y, gap, c = COL.cinnabar) {
    const posts = [], rails = [], st = 0.32;
    const side = (x0, z0, x1, z1) => {
      const n = Math.max(1, Math.round(Math.hypot(x1 - x0, z1 - z0) / st));
      for (let i = 0; i <= n; i++) posts.push({ x: x0 + (x1 - x0) * i / n, y: y + 0.13, z: z0 + (z1 - z0) * i / n });
      [[0.24, 0.035], [0.07, 0.04]].forEach(([h, t]) => rails.push({ x: (x0 + x1) / 2, y: y + h, z: (z0 + z1) / 2, sx: Math.abs(x1 - x0) + t, sy: t, sz: Math.abs(z1 - z0) + t }));
    };
    const a = bw / 2 - 0.06, b = bd / 2 - 0.06, gh = gap / 2;
    if (gap > 0) { side(-a, b, -gh, b); side(gh, b, a, b); } else side(-a, b, a, b);
    side(a, -b, -a, -b); side(a, b, a, -b); side(-a, -b, -a, b);
    inst(p, merge([bx(0.05, 0.26, 0.05), new THREE.SphereGeometry(0.035, 8, 6).translate(0, 0.15, 0)]), c, posts);
    inst(p, new THREE.BoxGeometry(1, 1, 1), c, rails);
  }
  const windowGeo = (w, h) => { const t = 0.03, gs = [bx(w, t, 0.04, 0, h / 2), bx(w, t, 0.04, 0, -h / 2), bx(t, h, 0.04, -w / 2), bx(t, h, 0.04, w / 2)]; for (let i = 1; i < 7; i++) gs.push(bx(0.02, h, 0.03, -w / 2 + w * i / 7)); return merge(gs); }; // 直欞窗

  // 靜態群組烤成一個頂點色 mesh（scene 的擋鏡頭淡出整棟一起淡）；有貼圖或 MeshBasic（燈光）的保留原樣。原地替換 root，回傳新群組
  function bake(root) {
    root.updateMatrixWorld(true);
    const inv = root.matrixWorld.clone().invert(), gs = [], keep = [], m4 = new THREE.Matrix4(), col = new THREE.Color();
    root.traverse(o => {
      if (!o.isMesh) return;
      if (o.material.map || o.material.isMeshBasicMaterial) { keep.push([o, inv.clone().multiply(o.matrixWorld)]); return; }
      const base = inv.clone().multiply(o.matrixWorld), n = o.isInstancedMesh ? o.count : 1;
      for (let i = 0; i < n; i++) {
        if (o.isInstancedMesh) { o.getMatrixAt(i, m4); if (o.instanceColor) col.fromArray(o.instanceColor.array, i * 3); else col.copy(o.material.color); }
        else col.copy(o.material.color);
        const g = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()).applyMatrix4(o.isInstancedMesh ? base.clone().multiply(m4) : base);
        for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
        const c = new Float32Array(g.attributes.position.count * 3); for (let k = 0; k < c.length; k += 3) col.toArray(c, k);
        g.setAttribute('color', new THREE.BufferAttribute(c, 3)); gs.push(g);
      }
    });
    const out = new THREE.Group(); out.position.copy(root.position); out.rotation.copy(root.rotation); out.scale.copy(root.scale);
    out.add(new THREE.Mesh(BGU.mergeGeometries(gs), M('#ffffff', { vertexColors: true, side: THREE.DoubleSide })));
    keep.forEach(([o, m]) => { const w = new THREE.Mesh(o.geometry, o.material); m.decompose(w.position, w.quaternion, w.scale); out.add(w); });
    if (root.parent) { root.parent.add(out); root.parent.remove(root); }
    return out;
  }

  // ---------- 蓮：荷葉、荷花、花苞、蓮蓬（頂點色；第一輪造型） ----------
  const paint = (gm, hex) => { const c = new THREE.Color(hex), n = gm.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) c.toArray(a, i * 3); gm.setAttribute('color', new THREE.BufferAttribute(a, 3)); return gm; };
  function paintY(gm, a, b, y0, y1) {
    const ca = new THREE.Color(a), cb = new THREE.Color(b), p = gm.attributes.position, arr = new Float32Array(p.count * 3), c = new THREE.Color();
    for (let i = 0; i < p.count; i++) { c.copy(ca).lerp(cb, clamp((p.getY(i) - y0) / (y1 - y0), 0, 1)); c.toArray(arr, i * 3); }
    gm.setAttribute('color', new THREE.BufferAttribute(arr, 3)); return gm;
  }
  // 荷葉：扁圓盤、中心微凹、邊緣微翹；中心淺黃綠、邊緣深綠
  function leafGeo(r = 0.2, cup = 0.22) {
    const gm = new THREE.RingGeometry(0.004, r, 20, 4); gm.rotateX(-PI / 2); gm.deleteAttribute('uv');   // 荷葉是整圓（有缺口的是睡蓮）
    const p = gm.attributes.position, col = new Float32Array(p.count * 3), c = new THREE.Color(), a = new THREE.Color('#c2cf94'), b = new THREE.Color('#5f8c58');
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), d = Math.hypot(x, z) / r, an = Math.atan2(z, x);
      p.setY(i, cup * r * d * d + 0.03 * r * Math.sin(an * 6) * d * d); c.copy(a).lerp(b, Math.pow(d, 0.7)); c.offsetHSL(0, 0, 0.03 * Math.cos(an * 9) * d); c.toArray(col, i * 3); }
    gm.setAttribute('color', new THREE.BufferAttribute(col, 3)); gm.computeVertexNormals(); return gm;
  }
  function petalGeo(len, wid, base, tip) {
    const gm = new THREE.SphereGeometry(1, 7, 6), p = gm.attributes.position;
    for (let i = 0; i < p.count; i++) { const k = (p.getY(i) + 1) / 2, x = p.getX(i), z = p.getZ(i);
      p.setXYZ(i, x * wid * (k > 0.5 ? 1 - (k - 0.5) * 1.7 : 1), k * len, z * wid * 0.28 - wid * 0.25 * x * x); }
    gm.deleteAttribute('uv'); paintY(gm, base, tip, len * 0.2, len); gm.computeVertexNormals(); return gm;
  }
  // 荷花（杯狀）：外 8 瓣、內 6 瓣、黃綠蓮蓬
  function lotusGeo(open = 1, tip = '#e98aa2') {
    const parts = [];
    [[8, 0.11, 0.052, 0.62 * open, 0.018], [6, 0.1, 0.045, 0.3 * open, 0.006]].forEach(([n, len, wid, tilt, off], ring) => {
      for (let i = 0; i < n; i++) { const pg = petalGeo(len, wid, '#fdf6f1', tip); pg.rotateX(tilt); pg.translate(0, 0, off); pg.rotateY(i * PI * 2 / n + ring * 0.27); parts.push(pg); }
    });
    const pod = paint(new THREE.CylinderGeometry(0.032, 0.022, 0.035, 9).translate(0, 0.045, 0), '#e2cf62'); pod.deleteAttribute('uv'); parts.push(pod);
    return merge(parts);
  }
  const budGeo = () => { const g = paintY(new THREE.SphereGeometry(0.05, 8, 6).scale(0.75, 1.5, 0.75).translate(0, 0.06, 0), '#f6e9e4', '#e5869e', 0.02, 0.13); g.deleteAttribute('uv'); return g; };
  const podGeo = () => { const g = merge([paint(new THREE.CylinderGeometry(0.065, 0.03, 0.06, 10).translate(0, 0.03, 0), '#a9b86c'), paint(new THREE.CylinderGeometry(0.06, 0.06, 0.004, 10).translate(0, 0.062, 0), '#8a9a52')]); g.deleteAttribute('uv'); return g; };
  // 一叢荷：items＝[[dx, dz, 高, 'f'花|'b'苞|'l'葉|'p'蓮蓬, 大小]]，莖一根到底、不分枝
  function lotusClump(p, x, z, items, k = 1) {
    const g = grp(p, x, 0, z), at = kind => items.filter(i => i[3] === kind);
    inst(g, new THREE.CylinderGeometry(0.022 * k, 0.03 * k, 1, 6).translate(0, 0.5, 0), COL.stem, items.map(([dx, dz, h]) => ({ x: dx, z: dz, sy: h })));
    const put = (kind, geo, s0, o = {}) => { const l = at(kind); if (l.length) inst(g, geo, o.m || VC(), l.map(([dx, dz, h, , s = 1], i) => ({ x: dx, y: h, z: dz, ry: i * 2.1, rx: o.tilt ? (i % 2 ? 0.25 : -0.2) : 0, s: s0 * s * k }))); };
    put('f', lotusGeo(0.95), 2.9);
    put('b', budGeo(), 2.4);
    put('p', podGeo(), 2.3);
    put('l', leafGeo(0.2, 0.45), 3.0, { m: VC({ side: THREE.DoubleSide }), tilt: true });
    return g;
  }
  // 葉面上的一窪淺水（荷葉積水）＋水上小葉片
  function pool(p, x, z, r, { c = '#9cc6c2', edge = '#7fa58c', pads = 0, rnd = Math.random } = {}) {
    const g = grp(p, x, 0, z), wob = n => { const gm = new THREE.CircleGeometry(1, 36), ps = gm.attributes.position; for (let i = 1; i < ps.count; i++) { const a = Math.atan2(ps.getY(i), ps.getX(i)), k = n * (1 + 0.06 * Math.sin(3 * a + 1) + 0.04 * Math.sin(5 * a + 2)); ps.setXY(i, ps.getX(i) * k, ps.getY(i) * k); } return gm.rotateX(-PI / 2); };
    add(g, wob(r * 1.07), edge, 0, 0.008, 0);
    add(g, wob(r), M(c, { transparent: true, opacity: 0.92 }), 0, 0.014, 0);
    if (pads) inst(g, leafGeo(0.2, 0.05), VC({ side: THREE.DoubleSide }), Array.from({ length: pads }, (_, i) => { const a = i * 2.4 + rnd(), rr = r * (0.45 + 0.4 * rnd()); return { x: Math.sin(a) * rr, y: 0.016, z: Math.cos(a) * rr, ry: rnd() * 6, s: 0.9 + rnd() * 0.6 }; }));
    return g;
  }

  // ---------- 葉面點綴：露珠；避開物件、站位、缺口楔形 ----------
  const inNotch = (x, z, notch, pad = 18, r0 = 2.8) => { const a = Math.atan2(x, z) / DEG, d = Math.abs(((a - notch) % 360 + 540) % 360 - 180); return d < pad && Math.hypot(x, z) > r0; };
  function dress(P, G, keep, notch, { dew = 0, rMin = 0.6, rMax = 4.3 } = {}) {
    G.updateMatrixWorld(true);
    const obst = [], m4 = new THREE.Matrix4(), bb = new THREE.Box3();
    G.traverse(o => {
      if (!o.isMesh) return;
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      const ms = o.isInstancedMesh ? Array.from({ length: o.count }, (_, i) => (o.getMatrixAt(i, m4), m4.clone().premultiply(o.matrixWorld))) : [o.matrixWorld];
      for (const m of ms) { bb.copy(o.geometry.boundingBox).applyMatrix4(m); if (bb.max.y > 0.004) obst.push(bb.clone()); }
    });
    const out = [];
    for (let t = 0; t < dew * 20 && out.length < dew; t++) {
      const a = P.rnd() * 2 * PI, r = rMin + Math.sqrt(P.rnd()) * (rMax - rMin), x = Math.sin(a) * r, z = Math.cos(a) * r;
      if (inNotch(x, z, notch, 22, 2.4)) continue;
      if (keep.some(([kx, kz, kr]) => Math.hypot(x - kx, z - kz) < kr)) continue;
      if (obst.some(b => x > b.min.x - 0.1 && x < b.max.x + 0.1 && z > b.min.z - 0.1 && z < b.max.z + 0.1)) continue;
      out.push({ x, y: 0.03, z, s: 0.6 + P.rnd() * 0.9 });
    }
    if (out.length) inst(G, new THREE.SphereGeometry(0.045, 10, 6).scale(1, 0.7, 1), M('#eef7f2', { transparent: true, opacity: 0.75 }), out);
  }
  const keepOf = spots => [[HERO[0], HERO[1], HERO[2] + 0.2], ...Object.values(spots).map(([x, z]) => [x, z, 0.4])];

  // ---------- canvas 字：橫匾、攤開的紙（node 測試沒有 document：素色） ----------
  function hPlaque(p, txt, w, h, x, y, z) {
    if (typeof document === 'undefined') return box(p, w, h, 0.04, COL.ink, x, y, z);
    const c = document.createElement('canvas'); c.width = 64 + txt.length * 88; c.height = 112; const g = c.getContext('2d');
    g.fillStyle = '#2b2622'; g.fillRect(0, 0, c.width, c.height); g.strokeStyle = '#c9a35c'; g.lineWidth = 7; g.strokeRect(8, 8, c.width - 16, c.height - 16);
    g.fillStyle = '#e8d6a8'; g.font = '700 70px "Kaiti TC","BiauKai","Noto Serif TC",serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    [...txt].forEach((ch, i) => g.fillText(ch, c.width - 76 - i * 88, c.height / 2 + 3));   // 傳統橫匾右讀
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, toneMapped: false })); m.position.set(x, y, z); p.add(m); return m;
  }
  function paper(p, lines, w, h, x, y, z) {
    if (typeof document === 'undefined') return box(p, w, 0.004, h, '#f6efdc', x, y, z);
    const cv = document.createElement('canvas'), c2 = cv.getContext('2d'); cv.width = 384; cv.height = Math.round(384 * h / w);
    c2.fillStyle = '#f6efdc'; c2.fillRect(0, 0, cv.width, cv.height); c2.fillStyle = '#2f2c28'; c2.textAlign = 'center'; c2.textBaseline = 'middle';
    const fs = Math.min(cv.height / (Math.max(...lines.map(l => l.length)) + 1), cv.width / (lines.length + 1)); c2.font = `700 ${fs}px "Kaiti TC","BiauKai","Noto Serif TC",serif`;
    lines.forEach((l, i) => [...l].forEach((ch, j) => c2.fillText(ch, cv.width - (i + 0.9) * cv.width / (lines.length + 0.8), (j + 0.9) * fs))); // 直書，由右到左
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })); m.rotation.x = -PI / 2; m.position.set(x, y, z); p.add(m); return m;
  }
  // 竹籃（開口）：籃身、口沿、提把
  function basket(p, x, z, r = 0.2, h = 0.2) {
    const g = grp(p, x, 0, z);
    add(g, lathe([[r * 0.7, 0], [r * 0.85, h * 0.3], [r, h]], 14), M('#b39a62', { side: THREE.DoubleSide }));
    add(g, new THREE.TorusGeometry(r, 0.016, 4, 16), '#8f7748', 0, h, 0).rotation.x = PI / 2;
    add(g, new THREE.TorusGeometry(r * 0.9, 0.012, 4, 12, PI), '#8f7748', 0, h, 0);
    return g;
  }

  // ======================= 05 中通外直：切開的大蓮藕（一圈孔洞）＋採藕人、一窪水裡又高又直的蓮莖、竹架上亂爬分岔的瓜藤 =======================
  LP_BUILD.jing = P => {
    init();
    const G = new THREE.Group(), notch = 145;
    // 切開的蓮藕：竹蓆上一大片藕切面立著面向鏡頭（外皮＋白嫩切面＋九孔一心），後面躺著一節節蓮藕
    const R = grp(G, -2.05, 0, -0.35, 18);
    box(R, 1.7, 0.02, 1.1, '#c8b07a', 0, 0.01, 0);                                                   // 竹蓆
    inst(R, new THREE.BoxGeometry(1.7, 0.006, 0.03), '#a8905c', Array.from({ length: 9 }, (_, i) => ({ y: 0.022, z: -0.5 + i * 0.125 })));
    const sl = grp(R, 0.15, 0.68, 0.05); sl.rotation.x = -0.08;
    add(sl, new THREE.CylinderGeometry(0.62, 0.62, 0.2, 32).rotateX(PI / 2), '#c9ab80');                // 藕皮
    add(sl, new THREE.CylinderGeometry(0.59, 0.59, 0.22, 32).rotateX(PI / 2), '#f3ead3');               // 白嫩切面
    const holes = [{ x: 0, y: 0, s: 0.11 }]; for (let i = 0; i < 9; i++) { const a = i * PI * 2 / 9 + 0.2; holes.push({ x: Math.cos(a) * 0.36, y: Math.sin(a) * 0.36, s: i % 2 ? 0.1 : 0.115 }); }
    inst(sl, new THREE.CylinderGeometry(1, 1, 0.226, 14).rotateX(PI / 2), '#5e5142', holes.map(h => ({ x: h.x, y: h.y, sx: h.s, sy: h.s })));
    inst(sl, new THREE.TorusGeometry(1, 0.08, 3, 14), '#d8c79f', holes.map(h => ({ x: h.x, y: h.y, z: 0.113, s: h.s })));
    box(R, 0.8, 0.1, 0.3, '#7a5a40', 0.15, 0.05, 0.05);                                                  // 木座
    const segG = lathe([0, 0.08, 0.13, 0.155, 0.16, 0.155, 0.13, 0.08, 0].map((r, i) => [Math.max(r, 0.001), i * 0.065]), 12).rotateZ(PI / 2);
    inst(R, segG, '#ead9b8', [0, 1, 2].map(i => ({ x: -0.25 - i * 0.54, y: 0.17, z: -0.35, ry: 0.12 * i })));
    inst(R, new THREE.SphereGeometry(0.06, 8, 6), '#b89a6e', [0, 1].map(i => ({ x: -0.79 - i * 0.54, y: 0.17, z: -0.33, sx: 0.6 })));
    const cut = grp(R, -0.22, 0.17, -0.35); add(cut, new THREE.CylinderGeometry(0.152, 0.152, 0.012, 16).rotateZ(PI / 2), '#f6efdc', 0.005);
    inst(cut, new THREE.CylinderGeometry(0.024, 0.024, 0.016, 8).rotateZ(PI / 2), '#5e5142', [{ y: 0, z: 0 }, ...[0, 1, 2, 3, 4, 5, 6].map(i => ({ y: Math.cos(i * 0.9) * 0.09, z: Math.sin(i * 0.9) * 0.09 }))].map(o => ({ ...o, x: 0.008 })));
    // 採藕人：斗笠短褐，站在蓮藕旁看著主角；腳邊一籃藕
    const fx = -3.0, fz = 0.75, fg = grp(G, fx, 0, fz);
    who(P, fg, { who: 'farmer', pose: 'basket', face: 'smile' }, 0, 0, faceTo(fx, fz));
    const bk = basket(G, -3.25, -0.3, 0.22, 0.22);
    inst(bk, segG, '#ead9b8', [{ x: 0.02, y: 0.2, z: -0.04, rz: 0.5, ry: 0.3, s: 0.75 }, { x: -0.04, y: 0.22, z: 0.06, rz: 0.3, ry: 1.2, s: 0.7 }]);
    P.tag(R, 'root'); P.tag(fg, 'root'); P.tag(bk, 'root');

    // 荷梗剖面（中通外直的正解）：一根大荷梗直立在木座上，前半縱向剖開——外皮筆直帶細刺（外直），剖面上幾條通到底的深色孔道（中通）；
    //   旁邊一截橫切短梗，頂面看得到一圈小孔。teach S5：中通外直寫的是荷梗不是藕
    const SG = grp(G, -0.95, 0, -0.85, 28), SH = 1.75, SR = 0.19, T0 = Math.acos(0.4);   // 前方削掉一條弦（z=0.4R），兩側還看得到綠皮
    box(SG, 0.62, 0.08, 0.42, '#7a5a40', 0, 0.04, 0);
    add(SG, new THREE.CylinderGeometry(SR, SR, SH, 24, 1, false, T0, PI * 2 - 2 * T0), '#6d955a', 0, 0.08 + SH / 2, 0);   // 外皮（筆直）
    add(SG, new THREE.PlaneGeometry(2 * SR * Math.sin(T0), SH), '#e6ead0', 0, 0.08 + SH / 2, SR * 0.4);              // 縱剖面：白綠梗肉
    inst(SG, new THREE.BoxGeometry(1, SH - 0.04, 0.006), '#3f4a32', [[-0.09, 0.055], [0, 0.065], [0.09, 0.055]].map(([x, w]) => ({ x, y: 0.08 + SH / 2, z: SR * 0.4 + 0.004, sx: w })));   // 通到底的孔道
    inst(SG, new THREE.ConeGeometry(0.012, 0.04, 4).rotateX(PI / 2), '#4f7040', Array.from({ length: 22 }, (_, i) => { const a = PI / 2 + 0.2 + (i * 0.618 % 1) * (PI - 0.4); return { x: Math.sin(a) * SR, y: 0.2 + (i / 22) * (SH - 0.2), z: Math.cos(a) * SR, ry: a }; }));   // 細刺
    const cs = grp(SG, 0.45, 0.08, 0.2);   // 橫切短梗：頂面一圈小孔
    add(cs, new THREE.CylinderGeometry(SR, SR, 0.36, 20), '#6d955a', 0, 0.18, 0);
    add(cs, new THREE.CylinderGeometry(SR * 0.9, SR * 0.9, 0.01, 20), '#e6ead0', 0, 0.362, 0);
    inst(cs, new THREE.CylinderGeometry(1, 1, 0.012, 10), '#3f4a32', [[0, 0, 0.045], ...[0, 1, 2, 3, 4, 5].map(i => [Math.cos(i * PI / 3) * 0.1, Math.sin(i * PI / 3) * 0.1, i % 2 ? 0.03 : 0.038])].map(([x, z, r]) => ({ x, y: 0.366, z, sx: r, sz: r })));
    const sgB = bake(SG); add(sgB, leafGeo(0.2, 0.45), VC({ side: THREE.DoubleSide }), 0, 0.08 + SH, -0.05).scale.setScalar(3.2);   // 梗頂撐著荷葉：一看就知道是荷梗
    P.tag(sgB, 'stem');

    // 直挺的蓮莖：一窪淺水裡七枝又高又直的莖，頂上荷花、高舉的荷葉、蓮蓬；沒有一根旁枝
    const S = grp(G, -0.2, 0, -1.9);
    pool(S, 0, 0, 1.05, { pads: 5, rnd: P.rnd });
    const stems = lotusClump(S, 0, -0.05, [[-0.4, 0.05, 2.5, 'f'], [0.05, -0.2, 3.0, 'f', 1.1], [0.42, 0.12, 2.2, 'l'], [-0.08, 0.3, 1.9, 'p'], [-0.5, -0.38, 2.7, 'l'], [0.35, -0.42, 2.6, 'b'], [0.15, 0.4, 1.6, 'f', 0.9]], 1.25);
    inst(S, new THREE.TorusGeometry(1, 0.05, 4, 24), '#b6c9c2', [{ y: 0.016, rx: PI / 2, s: 0.25 }, { x: -0.4, y: 0.016, z: 0.05, rx: PI / 2, s: 0.18 }]);  // 莖腳的小漣漪
    P.tag(S, 'stem');

    // 岸邊的瓜藤：竹架上亂爬、到處分岔、捲鬚亂捲，還有黃花、小瓜
    const Vn = grp(G, 2.45, 0, 0.0, -25);
    inst(Vn, new THREE.CylinderGeometry(0.025, 0.03, 1.15, 5), '#b9a46a', [[-0.6, -0.12], [0, -0.2], [0.6, -0.12]].map(([x, z]) => ({ x, y: 0.575, z })));
    inst(Vn, new THREE.CylinderGeometry(0.018, 0.018, 1.35, 5), '#a8935a', [0.62, 1.0].map(y => ({ y, z: -0.16, rz: PI / 2 })));
    const rr = P.rnd, tubes = [], leafPts = [], tips = [];
    const grow = (p, d, n, w, depth) => {
      const pts = [p.clone()];
      for (let i = 0; i < n; i++) {
        d.add(V((rr() - 0.5) * 1.1, (rr() - 0.5) * 0.7 + (p.y < 0.95 && depth < 2 ? 0.3 : -0.08), (rr() - 0.5) * 0.7)).normalize();
        p = p.clone().addScaledVector(d, 0.11); p.set(clamp(p.x, -0.85, 0.85), clamp(p.y, 0.03, 1.15), clamp(p.z, -0.4, 0.42)); pts.push(p);
        if (i % 2) leafPts.push(p.clone());
        if (depth < 3 && rr() < 0.4) grow(p.clone(), V(rr() - 0.5, rr() - 0.4, rr() - 0.5).normalize(), Math.max(2, Math.round(n * 0.55)), w * 0.75, depth + 1);
      }
      tubes.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), pts.length * 3, w, 4)); tips.push(p.clone());
    };
    [[-0.5, 0.1], [0.05, 0.15], [0.5, 0.05]].forEach(([x, z]) => grow(V(x, 0.02, z), V(0, 1, 0), 10, 0.02, 0));
    [[-0.2, 0.3, -1], [0.3, 0.3, 1]].forEach(([x, z, s]) => grow(V(x, 0.03, z), V(s, 0.05, 0.4), 7, 0.016, 2));   // 在地上亂爬的
    add(Vn, merge(tubes), '#7d8f48');
    const curl = grp(Vn), curls = [];
    tips.forEach((p, i) => { const pts = []; for (let k = 0; k <= 16; k++) { const a = k * 0.75, r = 0.04 * (1 - k / 20); pts.push(V(Math.cos(a) * r, k * 0.007 + Math.sin(a) * r * 0.4, Math.sin(a) * r)); }
      curls.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.005, 3).rotateZ((i % 3 - 1) * 0.8).translate(p.x, p.y, p.z)); });
    add(curl, merge(curls), '#93a456');
    const lv = leafPts.map(p => ({ x: p.x, y: p.y, z: p.z, rx: rr() * 3, ry: rr() * 6, rz: rr() * 3, s: 0.9 + rr() * 0.6 }));
    inst(Vn, new THREE.CircleGeometry(0.085, 7).scale(1, 1.1, 1), M('#6f8f48', { side: THREE.DoubleSide }), lv);
    inst(Vn, new THREE.ConeGeometry(0.05, 0.06, 5).rotateX(PI), '#f0cc4a', lv.filter((_, i) => i % 4 === 1).map(o => ({ ...o, s: 1.1 })));
    inst(Vn, new THREE.SphereGeometry(0.09, 10, 8), '#9db46a', [[0.3, 0.52, 0.12], [-0.42, 0.4, 0.06]].map(([x, y, z]) => ({ x, y, z, sx: 0.85, sy: 1.25, sz: 0.85 })));   // 小瓜
    P.tag(Vn, 'vine');

    const spots = { root: [-1.1, 0.85], stem: [0.55, -0.15], vine: [1.4, 1.15] };
    dress(P, G, keepOf(spots), notch, { dew: 14 });
    P.anim.push((dt, t) => {
      stems.rotation.z = 0.012 * Math.sin(t * 0.8); stems.rotation.x = 0.01 * Math.sin(t * 0.6);   // 整叢輕晃，莖不彎
      curl.rotation.z = 0.03 * Math.sin(t * 1.3); curl.position.y = 0.01 * Math.sin(t * 1.9);
    });
    G.userData.standSpots = spots;
    G.userData.rim = [45, -60, -150];
    G.userData.notch = notch;
    return G;
  };

  // ======================= 06 香遠益清：亭亭荷花立在葉緣水窪、淡香氣波浪帶越飄越淡、站在小荷葉上伸手的孩子、臨水賞荷平台（無頂） =======================
  LP_BUILD.xiang = P => {
    init();
    const G = new THREE.Group(), notch = 150;
    // 葉緣右側的一窪清水：亭亭的荷花一枝枝筆直立著
    pool(G, 2.45, 0.05, 1.35, { pads: 7, rnd: P.rnd });
    const st = lotusClump(G, 2.95, 0.4, [[0, 0, 1.95, 'f', 1.1], [0.38, -0.22, 1.65, 'f'], [-0.32, 0.28, 1.5, 'f'], [0.16, 0.38, 1.2, 'b'], [-0.28, -0.32, 1.35, 'l'], [0.42, 0.26, 1.0, 'l'], [-0.06, -0.48, 1.75, 'b']]);
    P.tag(st, 'standing');

    // 飄遠的清香（國畫畫法）：4 條很淡的波浪帶從花心往左上飄高 2.5–3、越遠越細越淡（寬 0.12→0.04、不透明 0.55→0），帶面始終朝鏡頭不翻轉；沿途 7 顆小白光點順著飄
    const fr = grp(G), RN = 40, CA = new THREE.Color('#f6d9de'), CB = new THREE.Color('#fbf3ea'), Z = V(0, 0, 1);
    const ribMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
    const ribs = [[2.95, 2.25, 0.4, -0.75, 1, -0.25, 3.1], [3.33, 1.95, 0.18, -0.9, 0.85, 0.1, 3.4], [2.63, 1.8, 0.68, -0.6, 1, 0.25, 2.9], [2.95, 2.25, 0.4, -1, 0.75, -0.5, 3.0]].map(([x, y, z, dx, dy, dz, len], i) => {
      const gm = new THREE.BufferGeometry(), col = new Float32Array(RN * 8), idx = [], c = new THREE.Color();
      for (let k = 0; k < RN; k++) { const s = k / (RN - 1), a = 0.55 * (1 - s) * Math.min(1, k / 4); c.copy(CA).lerp(CB, s); for (let j = 0; j < 2; j++) col.set([c.r, c.g, c.b, a], (k * 2 + j) * 4); if (k < RN - 1) idx.push(k * 2, k * 2 + 1, k * 2 + 2, k * 2 + 1, k * 2 + 3, k * 2 + 2); }
      gm.setAttribute('position', new THREE.BufferAttribute(new Float32Array(RN * 6), 3)); gm.setAttribute('color', new THREE.BufferAttribute(col, 4)); gm.setIndex(idx);
      const m = new THREE.Mesh(gm, ribMat); m.frustumCulled = false; m.renderOrder = 2; fr.add(m);
      const d = V(dx, dy, dz).normalize(); return { m, p0: V(x, y, z), d, side: V().crossVectors(d, Z).normalize(), ph: i * 1.9, len };
    });
    const q = V(), wv = V();
    const along = (r, s, t) => { q.copy(r.p0).addScaledVector(r.d, s * r.len).addScaledVector(r.side, 0.28 * Math.sin(s * 5.5 - t * 1.2 + r.ph) * Math.sqrt(s)); return q; };
    const dots = inst(fr, new THREE.SphereGeometry(0.05, 8, 6), basic('#ffffff', 0.8), Array.from({ length: 7 }, () => ({})));
    const ribbon = t => {
      ribs.forEach(r => {
        const a = r.m.geometry.attributes.position;
        for (let k = 0; k < RN; k++) {
          const s = k / (RN - 1), w = 0.06 - 0.04 * s; along(r, s, t);
          wv.copy(r.side).multiplyScalar(w).applyAxisAngle(r.d, 0.3 * Math.sin(s * 3 + t * 0.7 + r.ph));   // 只微微扭，不翻成刮痕
          a.setXYZ(k * 2, q.x - wv.x, q.y - wv.y, q.z - wv.z); a.setXYZ(k * 2 + 1, q.x + wv.x, q.y + wv.y, q.z + wv.z);
        }
        a.needsUpdate = true; r.m.geometry.computeBoundingBox(); r.m.geometry.computeBoundingSphere();
      });
      for (let i = 0; i < 7; i++) { const r = ribs[i % 4], s = (i * 0.37 + t * 0.06) % 1; along(r, s, t); dummy.position.copy(q); dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(Math.max(0.01, Math.sin(PI * s))); dummy.updateMatrix(); dots.setMatrixAt(i, dummy.matrix); }
      dummy.scale.setScalar(1); dots.instanceMatrix.needsUpdate = true;
    };
    ribbon(0); P.tag(fr, 'fragrance');

    // 想摘花的孩子：雙丫髻，踩著一片小荷葉站在水窪裡，伸手向荷花
    const cx = 2.0, cz = -0.38, cg = grp(G, cx, 0, cz);
    add(cg, leafGeo(0.2, 0.08), VC({ side: THREE.DoubleSide }), 0, 0.02, 0).scale.setScalar(2.2);
    who(P, cg, { who: 'child', pose: 'reach', face: 'smile' }, 0, 0, faceTo(cx, cz, 2.95, 0.4), 0.035);
    inst(cg, new THREE.TorusGeometry(1, 0.04, 4, 24), '#b6c9c2', [{ y: 0.018, rx: PI / 2, s: 0.52 }]);
    P.tag(cg, 'child');

    // 臨水賞荷平台（無屋頂，和 07 站的亭子分開剪影）：石台基半伸進一窪清水、木欄杆（前面留口）、賞荷小几＋茶具、兩個蒲團，放在左後方
    pool(G, -2.75, -1.2, 0.85, { pads: 4, rnd: P.rnd });
    const pv = grp(G, -1.75, 0, -2.25, 25);
    box(pv, 1.85, 0.22, 1.85, '#b8b1a2', 0, 0.11, 0); box(pv, 1.9, 0.04, 1.9, '#cfc8b8', 0, 0.23, 0);
    box(pv, 0.7, 0.11, 0.24, '#b8b1a2', 0, 0.055, 1.04);                                               // 踏步
    inst(pv, new THREE.BoxGeometry(1.85, 0.006, 0.03), '#b0a796', Array.from({ length: 5 }, (_, i) => ({ y: 0.253, z: -0.6 + i * 0.3 })));   // 石板縫
    balustrade(pv, 1.62, 1.62, 0.25, 0.62, '#8a5a3a');
    inst(pv, new THREE.BoxGeometry(0.06, 0.12, 0.06), '#8a5a3a', [[1, 1], [1, -1], [-1, 1], [-1, -1]].map(([i, j]) => ({ x: i * 0.75, y: 0.31 + 0.13, z: j * 0.75 })));   // 欄杆角柱頭
    const tb = grp(pv, 0, 0.25, -0.2);   // 賞荷小几：矮案、四腿、茶壺兩杯、一枝插瓶小荷
    box(tb, 0.8, 0.05, 0.46, '#6b4c36', 0, 0.3, 0); inst(tb, new THREE.BoxGeometry(0.05, 0.28, 0.05), '#4e3a2e', [[1, 1], [1, -1], [-1, 1], [-1, -1]].map(([i, j]) => ({ x: i * 0.34, y: 0.14, z: j * 0.18 })));
    add(tb, lathe([[0.001, 0], [0.06, 0], [0.08, 0.05], [0.06, 0.1], [0.025, 0.12], [0.001, 0.12]]), '#d9e2dc', -0.18, 0.325, 0.02);
    inst(tb, new THREE.CylinderGeometry(0.03, 0.022, 0.04, 10), '#e9efe8', [0.02, 0.14].map(x => ({ x, y: 0.345, z: 0.08 })));
    add(tb, lathe([[0.001, 0], [0.04, 0], [0.05, 0.06], [0.025, 0.13], [0.03, 0.15]]), '#f3efe4', 0.25, 0.325, -0.05);
    add(tb, new THREE.CylinderGeometry(0.006, 0.006, 0.35, 4), COL.stem, 0.25, 0.65, -0.05);
    add(tb, budGeo(), VC(), 0.25, 0.82, -0.05).scale.setScalar(1.4);
    inst(pv, new THREE.CylinderGeometry(0.17, 0.18, 0.06, 14), '#b39a62', [-0.45, 0.45].map(x => ({ x, y: 0.28, z: 0.25 })));   // 蒲團
    P.tag(bake(pv), 'pavilion');

    const spots = { standing: [2.3, 1.85], fragrance: [0.15, 0.35], child: [1.15, 0.45], pavilion: [-0.15, -0.35] };
    dress(P, G, keepOf(spots), notch, { dew: 12 });
    P.anim.push((dt, t) => {
      ribbon(t);
      st.rotation.z = 0.015 * Math.sin(t * 0.8); st.rotation.x = 0.012 * Math.sin(t * 0.6);
      cg.position.y = 0.01 * Math.sin(t * 1.4); cg.rotation.z = 0.02 * Math.sin(t * 1.1);   // 小荷葉在水上輕晃
    });
    G.userData.standSpots = spots;
    G.userData.rim = [20, -95, 100];
    G.userData.notch = notch;
    return G;
  };

  // ======================= 07 三花品評：水亭裡長書案，三瓶花一字排開（陶瓶黃菊／青瓷豔紅牡丹／白瓷粉白蓮）＋筆墨紙硯 =======================
  function mumGeo() {
    const parts = [];
    for (let i = 0; i < 26; i++) { const a = i * 2.4, b = 0.25 + (i / 26) * 1.2, c = new THREE.SphereGeometry(1, 6, 4).scale(0.012, 0.045, 0.004).translate(0, 0.045, 0); c.rotateX(b); c.rotateY(a); parts.push(paint(c, '#ffffff')); }   // 扁平細瓣（不用尖錐）
    parts.push(paint(new THREE.IcosahedronGeometry(0.03, 1), '#c9962e'));
    return merge(parts.map(p => { p.deleteAttribute('uv'); return p; }));
  }
  function peonyGeo() {
    const parts = [];
    [[9, 0.11, 1.2], [7, 0.09, 0.75], [5, 0.07, 0.35]].forEach(([n, r, tilt], k) => { for (let i = 0; i < n; i++) {
      const p = new THREE.SphereGeometry(r, 7, 5, 0, PI * 2, 0, PI * 0.55); p.scale(1, 0.45, 0.8); p.translate(0, 0, r * 0.7); p.rotateX(-PI / 2 + tilt); p.rotateY(i * PI * 2 / n + k * 0.4);
      paintY(p, '#ffffff', '#ffe9ee', -0.1, 0.1); parts.push(p); } });
    parts.push(paint(new THREE.IcosahedronGeometry(0.035, 1).translate(0, 0.03, 0), '#f2d36a'));
    return merge(parts.map(p => { p.deleteAttribute('uv'); return p; }));
  }
  // 花枝從瓶口往外斜：heads＝[{x,y,z}]（花頭位置，瓶口在 (0,mouth,0)）
  const sprays = (p, mouth, heads, c, r = 0.008) => inst(p, new THREE.CylinderGeometry(r, r * 1.2, 1, 5).translate(0, 0.5, 0), c, heads.map(h => { const a = V(h.x * 0.25, mouth, h.z * 0.25), d = V(h.x, h.y, h.z).sub(a); return { x: a.x, y: a.y, z: a.z, q: new THREE.Quaternion().setFromUnitVectors(Y, d.clone().normalize()), sy: d.length() }; }));
  LP_BUILD.pin = P => {
    init();
    const G = new THREE.Group(), notch = 115;
    // 水亭（面寬三間）：木地板貼地、六根柱、後面直欞格扇、兩側矮欄、歇山灰瓦頂；簷口高 1.95＞主角頭頂 +0.8，前簷在 z≈0.1，站位都在簷外
    const pv = grp(G, 0, 0, -1.45);
    box(pv, 3.9, 0.03, 2.9, '#a58462', 0, 0.015, 0);
    inst(pv, new THREE.BoxGeometry(3.9, 0.004, 0.02), '#8a6a4c', Array.from({ length: 11 }, (_, i) => ({ y: 0.032, z: -1.35 + i * 0.27 })));
    const cols = [[-1.85, 1.3], [1.85, 1.3], [-1.85, -1.3], [1.85, -1.3], [-0.62, -1.3], [0.62, -1.3]];
    inst(pv, new THREE.CylinderGeometry(0.065, 0.075, 1.92, 10), '#7b4b3b', cols.map(([x, z]) => ({ x, y: 0.96, z })));
    inst(pv, new THREE.CylinderGeometry(0.12, 0.13, 0.08, 10), '#c8c1b4', cols.map(([x, z]) => ({ x, y: 0.04, z })));
    inst(pv, windowGeo(1.12, 0.95), '#7a5236', [-1.24, 0, 1.24].map(x => ({ x, y: 1.05, z: -1.3 })));    // 後面直欞格扇
    inst(pv, new THREE.BoxGeometry(1.15, 0.5, 0.05), '#d8cfb8', [-1.24, 0, 1.24].map(x => ({ x, y: 0.29, z: -1.3 })));   // 檻牆
    inst(pv, new THREE.BoxGeometry(0.05, 0.42, 0.05), '#7a5236', [-1, 1].flatMap(s => Array.from({ length: 6 }, (_, i) => ({ x: s * 1.85, y: 0.21, z: -1.1 + i * 0.44 }))));   // 兩側矮欄
    inst(pv, new THREE.BoxGeometry(0.04, 0.04, 2.5), '#7a5236', [-1, 1].flatMap(s => [0.42, 0.2].map(y => ({ x: s * 1.85, y, z: 0 }))));
    const rf = grp(pv);   // 屋頂＋闌額烤成一體（離地 1.85 以上，不擋站位）
    inst(rf, new THREE.BoxGeometry(1, 1, 1), '#6e4a34', [[0, 1.3, 3.8, 0.12, 0.09], [0, -1.3, 3.8, 0.12, 0.09], [1.85, 0, 0.09, 0.12, 2.7], [-1.85, 0, 0.09, 0.12, 2.7]].map(([x, z, sx, sy, sz]) => ({ x, y: 1.88, z, sx, sy, sz })));
    roof(rf, 2.15, 1.55, 0.85, { Wr: 1.25, up: 0.22, y: 1.95 });
    bake(rf);

    // 長書案：案面、四腿、牙板；筆墨紙硯
    const dk = grp(G, 0, 0, -0.62);
    box(dk, 3.3, 0.07, 0.66, '#5e4434', 0, 0.56, 0); box(dk, 3.2, 0.08, 0.04, '#4e3a2e', 0, 0.48, 0.3);
    inst(dk, new THREE.BoxGeometry(0.07, 0.53, 0.07), '#4e3a2e', [[1, 1], [1, -1], [-1, 1], [-1, -1]].map(([i, j]) => ({ x: i * 1.55, y: 0.265, z: j * 0.27 })));
    box(dk, 0.2, 0.035, 0.14, '#3a3836', -0.55, 0.61, 0.15); box(dk, 0.035, 0.03, 0.11, '#2b2a28', -0.42, 0.61, 0.15);   // 硯、墨條
    box(dk, 0.2, 0.03, 0.05, '#6b4c36', 0.98, 0.61, 0.2); inst(dk, new THREE.BoxGeometry(0.02, 0.07, 0.02), '#6b4c36', [-0.08, 0.08].map(x => ({ x: 0.98 + x, y: 0.64, z: 0.2 })));   // 筆架
    const brush = grp(dk, 0.98, 0.7, 0.2); brush.rotation.z = PI / 2 - 0.1;
    add(brush, new THREE.CylinderGeometry(0.01, 0.01, 0.3, 5), '#8a6a48'); add(brush, new THREE.ConeGeometry(0.015, 0.06, 6).rotateX(PI), COL.ink, 0, -0.18, 0);
    box(dk, 0.66, 0.012, 0.36, '#3a3430', 0.3, 0.593, 0.14);   // 墊氈
    paper(dk, ['菊之隱逸', '牡丹富貴', '蓮之君子'], 0.62, 0.32, 0.3, 0.6, 0.14);
    P.tag(dk, 'desk');

    // 三個大花瓶（原 1.35 倍再放大 1.8）從案上移到亭前三個高矮不同的花几上，菊／牡丹／蓮一字排開，「品評」是畫面主角
    const VZ = 0.7, K = 1.35 * 1.8, VX = 1.65, ST = [0.6, 0.8, 1.0];
    ST.forEach((h, i) => { const x = (i - 1) * VX, sg = grp(G, x, 0, VZ);
      box(sg, 0.5, 0.05, 0.5, '#5e4434', 0, h - 0.025, 0); box(sg, 0.44, 0.06, 0.44, '#4e3a2e', 0, h - 0.08, 0);
      inst(sg, new THREE.BoxGeometry(0.05, h - 0.05, 0.05), '#4e3a2e', [[1, 1], [1, -1], [-1, 1], [-1, -1]].map(([a, b]) => ({ x: a * 0.2, y: (h - 0.05) / 2, z: b * 0.2 })));
      box(sg, 0.46, 0.03, 0.46, '#4e3a2e', 0, 0.12, 0);
      P.tag(bake(sg), ['juvase', 'mudanvase', 'lianvase'][i]); });
    const ju = grp(G, -VX, ST[0], VZ); ju.scale.setScalar(K);
    add(ju, lathe([[0.001, 0], [0.12, 0], [0.17, 0.08], [0.18, 0.17], [0.14, 0.27], [0.08, 0.32], [0.09, 0.36], [0.07, 0.36]]), '#9a7656');
    const mums = [[0, 0.82, 0], [-0.13, 0.7, 0.06], [0.14, 0.74, 0.02], [-0.05, 0.62, 0.13], [0.09, 0.6, -0.08], [-0.17, 0.56, -0.05], [0.18, 0.58, 0.1]].map(([x, y, z]) => ({ x, y, z }));
    sprays(ju, 0.34, mums, '#6b8a4a');
    const mm = inst(ju, mumGeo(), VC(), mums.map(m => ({ ...m, rx: 0.4 * (m.z > 0 ? 1 : -0.4), rz: -m.x * 1.5, s: 1.25 })));
    mums.forEach((_, i) => mm.setColorAt(i, new THREE.Color(i % 3 === 2 ? '#e6b23a' : '#f0cc4a'))); mm.instanceColor.needsUpdate = true;
    inst(ju, new THREE.IcosahedronGeometry(0.05, 0).scale(1.2, 0.3, 0.8), '#5f7f45', [[0.06, 0.48, 0.06], [-0.08, 0.45, -0.04], [0.1, 0.55, -0.06], [-0.1, 0.52, 0.08]].map(([x, y, z], i) => ({ x, y, z, rx: i, ry: i * 2, rz: 0.5 })));
    P.tag(ju, 'juvase');

    const md = grp(G, 0, ST[1], VZ); md.scale.setScalar(K);
    add(md, lathe([[0.001, 0], [0.13, 0], [0.12, 0.03], [0.2, 0.13], [0.22, 0.22], [0.15, 0.36], [0.085, 0.42], [0.09, 0.46], [0.15, 0.5], [0.13, 0.5]]), '#86b39f');
    inst(md, new THREE.TorusGeometry(1, 0.06, 4, 20), '#c9a35c', [[0.22, 0.215], [0.03, 0.125], [0.5, 0.15]].map(([y, r]) => ({ y, rx: PI / 2, s: r })));   // 金邊
    const pe = [[0, 0.82, 0.02, 1.0], [-0.24, 0.7, 0.08, 0.85], [0.25, 0.72, 0.04, 0.85], [0.04, 0.63, 0.22, 0.7]].map(([x, y, z, s]) => ({ x, y, z, s }));
    sprays(md, 0.5, pe, '#4f7a42', 0.01);
    const pm = inst(md, peonyGeo(), VC(), pe.map((o, i) => ({ ...o, rx: 0.5, ry: i, rz: -o.x * 2 })));
    ['#c43a52', '#e88aa2', '#f2b6c4', '#b23a6e'].forEach((h, i) => pm.setColorAt(i, new THREE.Color(h))); pm.instanceColor.needsUpdate = true;   // 白底花瓣×豔紅
    inst(md, new THREE.IcosahedronGeometry(0.075, 0).scale(1.3, 0.25, 0.75), '#5c8a4c', Array.from({ length: 12 }, (_, i) => { const a = i * 2.1; return { x: Math.cos(a) * 0.22, y: 0.55 + (i % 3) * 0.05, z: Math.sin(a) * 0.18, rx: 0.4 + (i % 2) * 0.5, ry: -a, rz: 0.3 }; }));
    P.tag(md, 'mudanvase');

    const lv = grp(G, VX, ST[2], VZ); lv.scale.setScalar(K);
    add(lv, lathe([[0.001, 0], [0.1, 0], [0.09, 0.03], [0.15, 0.13], [0.13, 0.23], [0.055, 0.34], [0.045, 0.43], [0.085, 0.49], [0.075, 0.49]]), '#f6f3ea');
    sprays(lv, 0.48, [{ x: 0, y: 1.05, z: 0 }, { x: 0.17, y: 0.72, z: 0 }, { x: -0.13, y: 0.69, z: 0.01 }], COL.stem, 0.009);
    const lt = grp(lv, 0, 1.05, 0); add(lt, lotusGeo(0.85), VC()).scale.setScalar(2.4);
    const lleaf = grp(lv, 0.17, 0.72, 0); add(lleaf, leafGeo(0.2, 0.5), VC({ side: THREE.DoubleSide })).scale.setScalar(1.3); lleaf.rotation.z = -0.5;
    const lpod = grp(lv, -0.13, 0.69, 0.01); add(lpod, podGeo(), VC()).scale.setScalar(1.4); lpod.rotation.z = 0.3;
    P.tag(lv, 'lianvase');

    // 亭外兩窪淺水，各一叢小荷（點景）
    pool(G, -3.0, 0.75, 0.7, { pads: 3, rnd: P.rnd }); lotusClump(G, -3.1, 0.6, [[0, 0, 0.9, 'f'], [0.25, 0.15, 0.6, 'l'], [-0.2, 0.2, 0.7, 'b']], 0.9);
    pool(G, 2.95, 1.1, 0.65, { pads: 3, rnd: P.rnd }); lotusClump(G, 3.05, 0.95, [[0, 0, 0.8, 'l'], [-0.22, 0.18, 1.0, 'f']], 0.9);

    const spots = { juvase: [-1.65, 1.75], mudanvase: [0, 1.95], lianvase: [1.65, 1.75], desk: [0.85, 0.05] };
    dress(P, G, keepOf(spots), notch, { dew: 10 });
    P.anim.push((dt, t) => { lt.rotation.z = 0.03 * Math.sin(t * 0.8); lleaf.rotation.x = 0.05 * Math.sin(t * 0.9); brush.rotation.y = 0.04 * Math.sin(t * 0.7); });
    G.userData.standSpots = spots;
    G.userData.rim = [-60, 60, -150];
    G.userData.notch = notch;
    return G;
  };

  // ======================= 08 濂溪書堂：葉面後半鋪石板，左後方灰瓦書堂（竹簾、匾、窗燈）、右側流過的濂溪與小木橋、書案與攤開的紙、門前蓮池；夕照 =======================
  // 小溪（陋室銘 B 線）：岸沙、水、亮帶三層＋卵石＋順流漂的亮點
  function stream(P, p, pts, w0 = 0.6, w1 = 0.3) {
    const cv = new THREE.CatmullRomCurve3(pts.map(([x, z]) => V(x, 0, z))), N = 72, hw = (u, k) => (w0 + (w1 - w0) * u) * k / 2 * (1 + 0.12 * Math.sin(u * 17));
    const strip = (k, y) => {
      const pos = [], nor = [], idx = [];
      for (let i = 0; i <= N; i++) {
        const u = i / N, c = cv.getPointAt(u), t = cv.getTangentAt(u), w = hw(u, k);
        pos.push(c.x + t.z * w, y, c.z - t.x * w, c.x - t.z * w, y, c.z + t.x * w); nor.push(0, 1, 0, 0, 1, 0);
        if (i < N) { const a = 2 * i; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
      }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); geo.setIndex(idx); return geo;
    };
    add(p, strip(1.5, 0.008), M('#c7b994', { side: THREE.DoubleSide }));
    add(p, strip(1.0, 0.015), M('#7fb2c0', { side: THREE.DoubleSide }));
    add(p, strip(0.4, 0.018), M('#c4dfdc', { side: THREE.DoubleSide }));
    const peb = [];
    for (let i = 0; i <= 40; i++) { const u = i / 40, c = cv.getPointAt(u), t = cv.getTangentAt(u), s = i % 2 ? 1 : -1, w = hw(u, 1.15) + (i % 3) * 0.04; peb.push({ x: c.x + s * t.z * w, y: 0.012, z: c.z - s * t.x * w, sx: 0.9 + (i % 4) * 0.25, sy: 0.4, sz: 0.8 + (i % 3) * 0.2, ry: i, c: ['#a39a8e', '#bdb4a4', '#8f8a80'][i % 3] }); }
    inst(p, new THREE.DodecahedronGeometry(0.06, 0), '#ffffff', peb);
    const rip = Array.from({ length: 10 }, (_, i) => i / 10), rm = inst(p, flatDisc(1, 10), basic('#ffffff', 0.55), rip.map(() => ({})));
    P.anim.push((dt, t) => {
      rip.forEach((u0, i) => { const u = (u0 + t * 0.018) % 1, c = cv.getPointAt(u), tg = cv.getTangentAt(u), off = Math.sin(i * 2.7) * hw(u, 0.5); dummy.position.set(c.x + tg.z * off, 0.021, c.z - tg.x * off); dummy.rotation.set(0, Math.atan2(tg.x, tg.z), 0); dummy.scale.set(0.035, 1, 0.12 * (1 - Math.abs(u - 0.5))); dummy.updateMatrix(); rm.setMatrixAt(i, dummy.matrix); });
      dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(1); rm.instanceMatrix.needsUpdate = true;
    });
    P.anim[P.anim.length - 1](0, 0);
    return cv;
  }
  function bamboo(P, p, x, z, { n = 7, h = 2.2, r = 0.32, c = '#8aa866', leaf = ['#5c8a6a', '#6f9a5a', '#4f7a5a'] } = {}) {
    const g = grp(p, x, 0, z), culms = [], leaves = [];
    for (let i = 0; i < n; i++) {
      const a = i * 2.4 + P.rnd(), rr = r * Math.sqrt((i + 0.5) / n), x0 = Math.sin(a) * rr, z0 = Math.cos(a) * rr, hh = h * (0.7 + 0.3 * P.rnd());
      const dir = V(Math.sin(a) * 0.07 + (P.rnd() - 0.5) * 0.05, 1, Math.cos(a) * 0.07 + (P.rnd() - 0.5) * 0.05).normalize(), q = new THREE.Quaternion().setFromUnitVectors(Y, dir);
      culms.push({ x: x0 + dir.x * hh / 2, y: dir.y * hh / 2, z: z0 + dir.z * hh / 2, q, sy: hh });
      for (let k = 0; k < 7; k++) { const s = hh * (0.5 + 0.5 * k / 7), b = P.rnd() * 2 * PI; leaves.push({ x: x0 + dir.x * s + Math.sin(b) * 0.14, y: dir.y * s, z: z0 + dir.z * s + Math.cos(b) * 0.14, rx: 0.9, ry: b, rz: (P.rnd() - 0.5) * 0.6, c: leaf[k % leaf.length] }); }
    }
    inst(g, new THREE.CylinderGeometry(0.025, 0.03, 1, 6), c, culms);
    inst(g, new THREE.ConeGeometry(0.035, 0.32, 3).scale(1, 1, 0.25).translate(0, 0.16, 0), '#ffffff', leaves);
    return g;
  }
  LP_BUILD.lianxi = P => {
    init();
    const G = new THREE.Group(), notch = 160;
    const creekPts = [[3.35, -2.05], [2.5, -0.95], [2.2, 0.3], [2.7, 1.5], [3.15, 2.25]];
    const pond = [-2.25, 0.45, 0.72];
    // 葉面後半鋪石板（一塊塊留縫，看得到底下還是荷葉；避開小溪、蓮池、缺口）
    const cpts = new THREE.CatmullRomCurve3(creekPts.map(([x, z]) => V(x, 0, z))).getSpacedPoints(40);
    const slabs = [];
    for (let i = -9; i <= 9; i++) for (let j = -9; j <= 0; j++) {
      const x = i * 0.47 + (j % 2) * 0.2, z = j * 0.47 - 0.45, r = Math.hypot(x, z);
      if (r > 4.1 || inNotch(x, z, notch, 22, 2.4) || P.rnd() < 0.18) continue;
      if (cpts.some(c => Math.hypot(c.x - x, c.z - z) < 0.75) || Math.hypot(x - pond[0], z - pond[1]) < pond[2] + 0.45) continue;
      slabs.push({ x, y: 0.012, z, sx: 0.41 + P.rnd() * 0.04, sz: 0.4 + P.rnd() * 0.05, ry: (P.rnd() - 0.5) * 0.12, c: ['#c2b49a', '#b8aa90', '#cbbfa6'][(i + j + 30) % 3] });
    }
    inst(G, new THREE.BoxGeometry(1, 0.024, 1), '#ffffff', slabs);

    // 濂溪書堂：石台基、木構粉牆、直欞窗透出燈光、正門竹簾半捲、橫匾、兩坡灰瓦頂；放左後方，不擋主角
    const hs = grp(G, -1.65, 0, -2.4, 22);
    box(hs, 2.7, 0.2, 1.75, '#b3a891', 0, 0.1, 0); box(hs, 2.76, 0.04, 1.81, '#c9bfa8', 0, 0.21, 0);
    box(hs, 0.8, 0.1, 0.26, '#b3a891', 0, 0.05, 1.0);
    const ccol = [[-1.12, 0.62], [-0.38, 0.62], [0.38, 0.62], [1.12, 0.62], [-1.12, -0.62], [1.12, -0.62]];
    inst(hs, new THREE.CylinderGeometry(0.06, 0.065, 1.32, 8), '#6e4a34', ccol.map(([x, z]) => ({ x, y: 0.23 + 0.66, z })));
    box(hs, 2.24, 1.32, 0.06, '#e6dccb', 0, 0.89, -0.6); for (const s of [-1, 1]) box(hs, 0.06, 1.32, 1.2, '#e6dccb', s * 1.1, 0.89, 0);
    for (const s of [-1, 1]) { box(hs, 0.72, 0.42, 0.06, '#e6dccb', s * 0.75, 0.44, 0.6); box(hs, 0.72, 0.3, 0.06, '#e6dccb', s * 0.75, 1.42, 0.6); }
    inst(hs, windowGeo(0.66, 0.55), '#6e4a34', [-0.75, 0.75].map(x => ({ x, y: 0.93, z: 0.63 })));
    box(hs, 0.74, 1.08, 0.02, '#2e2a26', 0, 0.77, 0.56);                                                       // 門內暗處
    inst(hs, new THREE.BoxGeometry(1, 1, 1), '#6e4a34', [[0, 0.62, 2.4, 0.12, 0.1, 1.6], [0, -0.62, 2.4, 0.12, 0.1, 1.6], [0, 0.62, 0.76, 0.06, 0.08, 1.3]].map(([x, z, sx, sy, sz, y]) => ({ x, y, z, sx, sy, sz })));
    inst(hs, new THREE.BoxGeometry(0.72, 0.016, 0.012), '#d6c796', Array.from({ length: 13 }, (_, i) => ({ y: 1.25 - i * 0.026, z: 0.66 })));   // 竹簾（上半垂下）
    add(hs, new THREE.CylinderGeometry(0.035, 0.035, 0.78, 8).rotateZ(PI / 2), '#c9b886', 0, 0.9, 0.67);       // 捲起的簾
    roof(hs, 1.5, 1.0, 0.62, { Wr: 0.9, up: 0.05, y: 1.66, tile: '#58686a', chiwen: false });   // 北宋歇山意象：四坡收成平直正脊、屋面平緩、不捲鴟吻（和陋室的兩坡捲角頂分開）
    inst(hs, new THREE.BoxGeometry(1, 1, 1), '#9fb8ae', [[0, 0.95, 2.9, 0.1, 0.04], [0, -0.95, 2.9, 0.1, 0.04], [1.45, 0, 0.04, 0.1, 1.9], [-1.45, 0, 0.04, 0.1, 1.9]].map(([x, z, sx, sy, sz]) => ({ x, y: 1.55, z, sx, sy, sz })));   // 簷下淡青簷板
    const glow = basic('#ffcf7a');
    for (const s of [-1, 1]) add(hs, new THREE.PlaneGeometry(0.6, 0.5), glow, s * 0.75, 0.93, 0.605);
    const study = bake(hs);
    hPlaque(study, '濂溪書堂', 0.64, 0.17, 0, 1.43, 0.67);
    bamboo(P, G, -3.55, -0.85, { n: 7, h: 2.0, r: 0.28 });
    bamboo(P, G, -0.75, -3.6, { n: 5, h: 1.8, r: 0.22 });
    P.tag(study, 'study');

    // 濂溪：從右後方葉緣流進來、繞過書案旁、往右前方流去；溪上一座小木板橋
    const creek = grp(G), cv = stream(P, creek, creekPts, 0.62, 0.34);
    const bc = cv.getPointAt(0.5), bt = cv.getTangentAt(0.5), br = grp(creek, bc.x, 0, bc.z); br.rotation.y = Math.atan2(bt.x, bt.z) + PI / 2;
    inst(br, new THREE.BoxGeometry(0.2, 0.04, 0.5), '#9a7450', [-0.4, -0.2, 0, 0.2, 0.4].map((x, i) => ({ x, y: 0.1 + 0.06 * Math.cos(x * 2.4), z: 0, rz: -x * 0.35, c: ['#9a7450', '#8a6a48'][i % 2] })));
    inst(br, new THREE.BoxGeometry(0.06, 0.36, 0.06), '#7a5a3a', [-0.42, 0.42].flatMap(x => [-0.24, 0.24].map(z => ({ x, y: 0.2, z }))));
    inst(br, new THREE.BoxGeometry(0.9, 0.04, 0.04), '#7a5a3a', [-0.24, 0.24].map(z => ({ y: 0.36, z })));
    P.tag(creek, 'creek');

    // 書案（提筆處）：攤開寫著〈愛蓮說〉句子的紙、硯、筆筒、筆、蒲團
    const bd = grp(G, 0.85, 0, -1.15, -10);
    box(bd, 0.95, 0.05, 0.46, '#5e4434', 0, 0.46, 0);
    inst(bd, new THREE.BoxGeometry(0.05, 0.44, 0.05), '#4e3a2e', [[1, 1], [1, -1], [-1, 1], [-1, -1]].map(([i, j]) => ({ x: i * 0.42, y: 0.22, z: j * 0.18 })));
    box(bd, 0.14, 0.03, 0.1, '#3a3836', 0.33, 0.5, -0.05);
    add(bd, new THREE.CylinderGeometry(0.045, 0.04, 0.12, 10), '#6b5a4a', -0.36, 0.545, -0.08);               // 筆筒
    inst(bd, new THREE.CylinderGeometry(0.007, 0.007, 0.22, 4), '#8a6a48', [[-0.38, -0.06, 0.15], [-0.34, -0.1, -0.12]].map(([x, z, rz]) => ({ x, y: 0.65, z, rz })));
    const pen = grp(bd, 0.22, 0.51, 0.1); pen.rotation.set(0, 0.5, PI / 2 - 0.08);
    add(pen, new THREE.CylinderGeometry(0.008, 0.008, 0.2, 5), '#8a6a48'); add(pen, new THREE.ConeGeometry(0.012, 0.045, 6).rotateX(PI), COL.ink, 0, -0.12, 0);
    paper(bd, ['愛蓮說', '予獨愛蓮'], 0.42, 0.26, -0.05, 0.488, 0.04);
    add(bd, new THREE.CylinderGeometry(0.17, 0.18, 0.06, 14), '#b39a62', 0, 0.03, -0.48);                     // 蒲團
    P.tag(bd, 'brush');

    // 門前蓮池：一圈石砌池岸、清水、荷葉與三朵荷花
    const pg = grp(G, pond[0], 0, pond[1]);
    pool(pg, 0, 0, pond[2], { c: '#97c0bd', edge: '#8d9a88', pads: 5, rnd: P.rnd });
    inst(pg, new THREE.DodecahedronGeometry(0.08, 0), '#ffffff', Array.from({ length: 18 }, (_, i) => { const a = i / 18 * PI * 2; return { x: Math.sin(a) * (pond[2] + 0.06), y: 0.025, z: Math.cos(a) * (pond[2] + 0.06), sx: 1.3, sy: 0.55, sz: 1, ry: a, c: ['#a49d90', '#b8b0a2', '#968f84'][i % 3] }; }));
    const pf = lotusClump(pg, 0.05, -0.05, [[-0.2, 0.1, 0.62, 'f'], [0.18, -0.15, 0.8, 'f'], [0.25, 0.22, 0.5, 'f', 0.85], [-0.1, -0.3, 0.55, 'l'], [0.05, 0.3, 0.42, 'b']], 0.75);
    P.tag(pg, 'pond');

    const spots = { study: [-0.2, -0.3], brush: [0.75, -0.38], creek: [1.4, 1.35], pond: [-1.05, 1.25] };
    dress(P, G, keepOf(spots), notch, { dew: 8 });
    P.anim.push((dt, t) => {
      glow.color.setHSL(0.11, 1, 0.72 + 0.05 * Math.sin(t * 3.1) + 0.03 * Math.sin(t * 7.3));   // 窗裡燈火微微閃
      pf.rotation.z = 0.02 * Math.sin(t * 0.8); pen.position.y = 0.51 + 0.004 * Math.sin(t * 1.5);
    });
    G.userData.standSpots = spots;
    G.userData.rim = [-80, 45, -125];
    G.userData.notch = notch;
    return G;
  };
})();
