// ================= STATIONS B（B 線，孟子第二版）：bridge 動心忍性、study 知過能改、city 居安思危 =================
// 每站一座河中崖島（C 線畫島本體）：原點＝平台中心、頂面 y=0、+z 朝預設鏡頭；B 線內容全放半徑 4.6 內。
// 主角孟子站 (0, 0, 2.6)，半徑 0.7 只允許貼地鋪面（≤0.04）。主建築放 z<0、背面完整；配角 P.chibi，臉朝 +z（cos≥0.5）。
// userData：standSpots＝{elId:[x,z]}、rim＝崖邊點綴角度、dock＝碼頭方向（度，0＝+z、90＝+x，atan2(x, z)）；碼頭楔形內（±20°、r>3.1）不放高出地面的東西。
// 戰國：夯土台基（層層夯痕）、木構、茅草或板瓦直坡兩坡頂（不起翹、無鴟吻）。赭石、黛青、竹木、土黃，朱砂點綴。材質一律 lpCel（還沒有時退回 lpMat）；火光、煙用 MeshBasic。包在 IIFE 裡，避免和 planets-a 撞名。
(() => {
  const PI = Math.PI, DEG = PI / 180, HERO = [0, 2.6, 0.75];
  const M = (h, o) => (typeof lpCel === 'function' ? lpCel : lpMat)(h, o);
  const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const V2 = (x, y) => new THREE.Vector2(x, y);
  let Y, dummy; // THREE 在 boot 才載入：第一次建站時才建立
  const init = () => { if (!dummy) { Y = V(0, 1, 0); dummy = new THREE.Object3D(); } };
  const COL = { cinnabar: '#9a4a3a', dai: '#3a4a5c', wood: '#8a5a3a', woodDk: '#5e3d27', tile: '#5e5a54', tileDk: '#4a4744', ink: '#2b2622',
    earth: '#b8976a', earthDk: '#a2825a', thatch: '#b49a62', thatchDk: '#8f7646', plaster: '#d2c09a' };   // 赭石、黛青、竹木、土黃，朱砂點綴
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

  // 靜態群組烤成一個頂點色 mesh（scene 的擋鏡頭淡出整棟一起淡）；有貼圖或 MeshBasic（燈光）的保留原樣。原地替換 root，回傳新群組
  function bake(root) {
    root.updateMatrixWorld(true);
    const inv = root.matrixWorld.clone().invert(), gs = [], keep = [], m4 = new THREE.Matrix4(), col = new THREE.Color();
    const kg = [];
    lpBakeWalk(root, o => {
      if (!o.isMesh) return;
      if (o.material.map || o.material.isMeshBasicMaterial) { keep.push([o, inv.clone().multiply(o.matrixWorld)]); return; }
      const base = inv.clone().multiply(o.matrixWorld), n = o.isInstancedMesh ? o.count : 1;
      for (let i = 0; i < n; i++) {
        if (o.isInstancedMesh) { o.getMatrixAt(i, m4); if (o.instanceColor) col.fromArray(o.instanceColor.array, i * 3); else col.copy(o.material.color); }
        else col.copy(o.material.color);
        const g = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()).applyMatrix4(o.isInstancedMesh ? base.clone().multiply(m4) : base);
        const vc = g.attributes.color;   // 頂點色（夯土層紋）乘上材質色
        for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
        const c = new Float32Array(g.attributes.position.count * 3); for (let k = 0; k < c.length; k += 3) { col.toArray(c, k); if (vc) { c[k] *= vc.getX(k / 3); c[k + 1] *= vc.getY(k / 3); c[k + 2] *= vc.getZ(k / 3); } }
        g.setAttribute('color', new THREE.BufferAttribute(c, 3)); gs.push(g);
      }
    }, o => kg.push([o, inv.clone().multiply(o.matrixWorld)]));   // GLB 群組整棵保留
    const out = new THREE.Group(); out.position.copy(root.position); out.rotation.copy(root.rotation); out.scale.copy(root.scale);
    if (gs.length) out.add(new THREE.Mesh(BGU.mergeGeometries(gs), M('#ffffff', { vertexColors: true, side: THREE.DoubleSide })));
    keep.forEach(([o, m]) => { const w = new THREE.Mesh(o.geometry, o.material); m.decompose(w.position, w.quaternion, w.scale); out.add(w); });
    kg.forEach(([o, m]) => { m.decompose(o.position, o.quaternion, o.scale); out.add(o); });
    if (root.parent) { root.parent.add(out); root.parent.remove(root); }
    return out;
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
  // 溪／溝水（陋室銘 B 線）：岸沙、水、亮帶三層＋卵石＋順流漂的亮點
  function stream(P, p, pts, w0 = 0.6, w1 = 0.3, { sand = '#c7b994', water = '#7fb2c0', hi = '#c4dfdc' } = {}) {
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
    add(p, strip(1.5, 0.008), M(sand, { side: THREE.DoubleSide }));
    add(p, strip(1.0, 0.015), M(water, { side: THREE.DoubleSide }));
    add(p, strip(0.4, 0.018), M(hi, { side: THREE.DoubleSide }));
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

  // ---------- 戰國建築零件 ----------
  // 夯土塊：一層層夯痕（每面依高度交替兩色，頂面較亮）；回傳頂點色 geometry，底在 y=0
  function hangtuGeo(w, h, d, a = COL.earth, b = COL.earthDk, band = 0.11) {
    const n = Math.max(1, Math.round(h / band)), g = new THREE.BoxGeometry(w, h, d, 1, n, 1).toNonIndexed(), p = g.attributes.position;
    const col = new Float32Array(p.count * 3), ca = new THREE.Color(a), cb = new THREE.Color(b), top = ca.clone().offsetHSL(0, -0.04, 0.06), c = new THREE.Color();
    for (let i = 0; i < p.count; i += 3) {
      const ys = [p.getY(i), p.getY(i + 1), p.getY(i + 2)], yc = (ys[0] + ys[1] + ys[2]) / 3 + h / 2;
      if (ys.every(y => Math.abs(y - h / 2) < 1e-4)) c.copy(top); else c.copy(Math.min(n - 1, Math.floor(yc / (h / n))) % 2 ? cb : ca);
      for (let k = 0; k < 3; k++) c.toArray(col, (i + k) * 3);
    }
    g.deleteAttribute('uv'); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); return g.translate(0, h / 2, 0);
  }
  const hangtu = (p, w, h, d, x = 0, y = 0, z = 0, a, b) => add(p, hangtuGeo(w, h, d, a, b), VC(), x, y, z);
  // 直坡兩坡頂（懸山，不起翹）：屋脊在 y+H、簷口在 y、前後簷到 ±D；tile＝板瓦頂（加筒瓦壟），否則茅草（厚、加草簷）
  function gable(p, W, D, H, y, { c = COL.thatch, tile = false, over = 0.14, gableC = null } = {}) {
    const L = Math.hypot(D, H) + over, a = Math.atan2(H, D), th = tile ? 0.07 : 0.15, Wx = 2 * W + 2 * over, g = grp(p, 0, y, 0);
    const slab = s => new THREE.BoxGeometry(Wx, th, L).translate(0, th / 2, s * L / 2).rotateX(s * a).translate(0, H, 0);
    add(g, merge([slab(1), slab(-1), new THREE.CylinderGeometry(0.08, 0.08, Wx + 0.06, 8).rotateZ(PI / 2).translate(0, H + th, 0)]), c);
    const dir = s => V(0, -Math.sin(a), s * Math.cos(a));
    if (tile) {
      const ribs = [];
      for (let x = -W - over + 0.1; x < W + over - 0.05; x += 0.16) for (const s of [1, -1]) {
        const q = new THREE.Quaternion().setFromUnitVectors(Y, dir(s)), m = L / 2;
        ribs.push({ x, y: H - m * Math.sin(a) + th + 0.01, z: s * m * Math.cos(a), q, sy: L });
      }
      inst(g, new THREE.CylinderGeometry(0.03, 0.03, 1, 6), COL.tileDk, ribs);
    } else {
      // 草簷：簷口一圈較深的草束
      inst(g, new THREE.BoxGeometry(Wx + 0.04, 0.08, 0.16), COL.thatchDk, [1, -1].map(s => ({ y: H - L * Math.sin(a) + 0.03, z: s * (L * Math.cos(a) - 0.05), rx: s * a })));
    }
    if (gableC) {   // 山牆三角（兩側封起，背面完整）
      const sh = new THREE.Shape(); sh.moveTo(-D, 0); sh.lineTo(D, 0); sh.lineTo(0, H); sh.closePath();
      const tg = new THREE.ShapeGeometry(sh).rotateY(PI / 2);
      for (const s of [1, -1]) add(g, tg, M(gableC, { side: THREE.DoubleSide }), s * (W - 0.02), 0, 0);
    }
    return g;
  }
  // 戈：長柄＋橫出的青銅戈頭
  const geGeo = (h = 1.2) => merge([new THREE.CylinderGeometry(0.014, 0.014, h, 5).translate(0, h / 2, 0), bx(0.2, 0.035, 0.012, 0.09, h - 0.08, 0), new THREE.ConeGeometry(0.02, 0.06, 4).translate(0, h + 0.03, 0)]);
  // 火：外焰＋內焰（MeshBasic，anim 讓它跳）
  function fire(P, p, x, y, z, s = 1) {
    const g = grp(p, x, y, z);
    const o = add(g, new THREE.ConeGeometry(0.11 * s, 0.32 * s, 7).translate(0, 0.16 * s, 0), basic('#f08a3a', 0.9));
    const i = add(g, new THREE.ConeGeometry(0.06 * s, 0.2 * s, 6).translate(0, 0.1 * s, 0), basic('#ffd77a'));
    const ph = P.rnd() * 6;
    P.anim.push((dt, t) => { const k = 1 + 0.18 * Math.sin(t * 9 + ph) + 0.08 * Math.sin(t * 23 + ph); o.scale.set(1, k, 1); i.scale.set(1, 2 - k, 1); o.rotation.y = t * 0.7; });
    return g;
  }
  // 炊煙／烽煙：一串往上飄、越來越淡的煙團（Instanced）
  function smoke(P, p, x, y, z, { n = 8, rise = 1.6, s0 = 0.12, s1 = 0.4, c = '#8f8a82', op = 0.45, drift = [0.25, -0.1] } = {}) {
    const m = inst(p, new THREE.IcosahedronGeometry(1, 1), basic(c, op), Array.from({ length: n }, () => ({})));
    const step = t => {
      for (let i = 0; i < n; i++) { const u = (i / n + t * 0.12) % 1; dummy.position.set(x + drift[0] * u + 0.04 * Math.sin(t + i), y + rise * u, z + drift[1] * u); dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(s0 + (s1 - s0) * u); dummy.updateMatrix(); m.setMatrixAt(i, dummy.matrix); }
      dummy.scale.setScalar(1); m.instanceMatrix.needsUpdate = true;
    };
    step(0); P.anim.push((dt, t) => step(t)); return m;
  }

  // ---------- 地面點綴：草叢、小石；避開物件、站位、碼頭楔形 ----------
  const inWedge = (x, z, deg, pad = 20, r0 = 3.1) => { const a = Math.atan2(x, z) / DEG, d = Math.abs(((a - deg) % 360 + 540) % 360 - 180); return d < pad && Math.hypot(x, z) > r0; };
  function dress(P, G, keep, dock, { grass = 0, stones = 0, grassC = ['#8a8a52', '#9a9258', '#7a8250'], rMin = 0.8, rMax = 4.3 } = {}) {
    G.updateMatrixWorld(true);
    const obst = [], m4 = new THREE.Matrix4(), bb = new THREE.Box3();
    G.traverse(o => {
      if (!o.isMesh) return;
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      const ms = o.isInstancedMesh ? Array.from({ length: o.count }, (_, i) => (o.getMatrixAt(i, m4), m4.clone().premultiply(o.matrixWorld))) : [o.matrixWorld];
      for (const m of ms) { bb.copy(o.geometry.boundingBox).applyMatrix4(m); if (bb.max.y > 0.03) obst.push(bb.clone()); }
    });
    const pick = (n, make) => {
      const out = [];
      for (let t = 0; t < n * 25 && out.length < n; t++) {
        const a = P.rnd() * 2 * PI, r = rMin + Math.sqrt(P.rnd()) * (rMax - rMin), x = Math.sin(a) * r, z = Math.cos(a) * r;
        if (inWedge(x, z, dock, 26, 2.8) || keep.some(([kx, kz, kr]) => Math.hypot(x - kx, z - kz) < kr)) continue;
        if (obst.some(b => x > b.min.x - 0.15 && x < b.max.x + 0.15 && z > b.min.z - 0.15 && z < b.max.z + 0.15)) continue;
        out.push(make(x, z));
      }
      return out;
    };
    const tuft = merge([-0.5, 0, 0.5].map((r, i) => new THREE.ConeGeometry(0.025, 0.2 - i * 0.03, 3).translate(0, 0.1, 0).rotateZ(r * 0.5).rotateY(i * 2.1)));
    const gr = pick(grass, (x, z) => ({ x, z, ry: P.rnd() * 6, s: 0.7 + P.rnd() * 0.6, c: grassC[Math.floor(P.rnd() * grassC.length)] }));
    if (gr.length) inst(G, tuft, '#ffffff', gr);
    const st = pick(stones, (x, z) => ({ x, y: 0.02, z, ry: P.rnd() * 6, sx: 0.8 + P.rnd() * 0.8, sy: 0.4 + P.rnd() * 0.3, sz: 0.7 + P.rnd() * 0.6, c: ['#9a8e7c', '#ad9f88', '#857a6a'][Math.floor(P.rnd() * 3)] }));
    if (st.length) inst(G, new THREE.DodecahedronGeometry(0.07, 0), '#ffffff', st);
  }
  const keepOf = spots => [[HERO[0], HERO[1], HERO[2] + 0.2], ...Object.values(spots).map(([x, z]) => [x, z, 0.45])];
  const rimOf = list => list.map(([x, z]) => Math.round(Math.atan2(x, z) / DEG));

  // ======================= 04 動心忍性：島上一道溝、缺板待修的小木橋；右前方工具與竹簡圖樣；左前方兩位工匠合扛木料 =======================
  LP_BUILD.bridge = P => {
    init();
    const G = new THREE.Group(), DOCK = 28;
    // 溝：從左後斜穿到右側，溝水黛青帶泥色
    const ditch = grp(G), cv = stream(P, ditch, [[-3.0, -2.35], [-1.6, -1.25], [0, -0.6], [1.7, -0.15], [3.4, 0.4]], 0.95, 0.8, { sand: '#b39a6c', water: '#6f857c', hi: '#a9b8a8' });
    // 待修的木橋：木樁、兩根橋梁、橋板缺三塊、一塊斷板斜掛、一側扶手斷了一截；近岸堆著新木板
    const bc = cv.getPointAt(0.5), bt = cv.getTangentAt(0.5);
    const br = grp(G, bc.x, 0, bc.z); br.rotation.y = Math.atan2(bt.x, bt.z);   // 本地 x＝橫跨溝的方向（-x 靠主角這岸）
    inst(br, new THREE.CylinderGeometry(0.05, 0.06, 1, 7), COL.woodDk, [-0.95, -0.45, 0.45, 0.95].flatMap(x => [-0.3, 0.3].map(z => ({ x, y: 0.2, z, sy: 0.42 }))));
    inst(br, new THREE.BoxGeometry(1, 1, 1), COL.wood, [-0.29, 0.29].map(z => ({ y: 0.4, z, sx: 2.1, sy: 0.07, sz: 0.08 })));
    const planks = [];
    for (let i = 0; i < 13; i++) {
      if (i === 4 || i === 5 || i === 8) continue;                                                       // 缺板
      const x = -0.9 + i * 0.15, broken = i === 9;
      planks.push({ x, y: broken ? 0.36 : 0.455, z: broken ? -0.12 : (i % 3 - 1) * 0.02, rz: broken ? 0.5 : 0, rx: broken ? 0.12 : 0, sz: broken ? 0.62 : 1, c: broken ? '#6e6250' : ['#9a7a52', '#8a6c48', '#a08258'][i % 3] });
    }
    inst(br, new THREE.BoxGeometry(0.13, 0.04, 0.7), '#ffffff', planks);
    add(br, new THREE.BoxGeometry(0.13, 0.04, 0.6), '#6e6250', 0.1, 0.03, 0.12).rotation.set(0.1, 0.6, 0.08);   // 掉進溝裡的舊板
    inst(br, new THREE.BoxGeometry(0.06, 0.4, 0.06), COL.woodDk, [-0.95, 0, 0.95].map(x => ({ x, y: 0.62, z: -0.3 })));
    inst(br, new THREE.BoxGeometry(1, 0.045, 0.045), COL.wood, [[-0.95, -0.12], [0.45, 0.95]].map(([a, b]) => ({ x: (a + b) / 2, y: 0.8, z: -0.3, sx: b - a })));   // 扶手斷一截
    inst(br, new THREE.BoxGeometry(0.15, 0.04, 0.72), '#c9a874', [0, 1, 2].map(k => ({ x: -1.45 + k * 0.03, y: 0.02 + k * 0.042, z: 0.55, ry: k * 0.06 })));   // 近岸新木板
    P.tag(br, 'bridge');

    // 工具與方法：木馬架上鋸到一半的原木、插在木樁上的斧、成捆的繩、攤在地上的竹簡圖樣
    const tg = grp(G, 2.3, 0, 1.05, -28);
    inst(tg, new THREE.BoxGeometry(0.045, 0.46, 0.045), COL.woodDk, [-0.42, 0.42].flatMap(x => [-1, 1].map(s => ({ x, y: 0.21, z: s * 0.09, rx: -s * 0.4 }))));
    add(tg, new THREE.CylinderGeometry(0.11, 0.11, 1.25, 10).rotateZ(PI / 2), '#a07a4e', 0, 0.5, 0);
    add(tg, new THREE.CircleGeometry(0.105, 10).rotateY(PI / 2), '#d6b886', 0.626, 0.5, 0);                   // 原木切面
    const saw = grp(tg, 0.18, 0.62, 0);
    add(saw, new THREE.BoxGeometry(0.012, 0.13, 0.5), '#8c9294');                                             // 鋸片卡在鋸口
    add(saw, new THREE.BoxGeometry(0.03, 0.05, 0.14), COL.woodDk, 0, 0.04, 0.3);
    add(tg, new THREE.CylinderGeometry(0.17, 0.19, 0.3, 10), '#8a6a48', -0.8, 0.15, 0.4);                    // 木樁
    const axe = grp(tg, -0.8, 0.32, 0.4); axe.rotation.z = 0.75;
    add(axe, new THREE.CylinderGeometry(0.018, 0.02, 0.5, 6), '#7a5a3a', -0.16, 0.18, 0);
    add(axe, new THREE.BoxGeometry(0.13, 0.09, 0.03), '#6a6e70', 0.02, 0.0, 0);
    inst(tg, new THREE.TorusGeometry(0.13, 0.03, 5, 14), '#b8a070', [0.03, 0.08].map((y, i) => ({ x: 0.6, y, z: 0.45, rx: PI / 2, s: 1 - i * 0.12 })));
    const sp = grp(tg, -0.05, 0, 0.6, 12);                                                                    // 竹簡圖樣
    inst(sp, new THREE.BoxGeometry(0.042, 0.012, 0.36), '#ffffff', Array.from({ length: 10 }, (_, i) => ({ x: -0.2 + i * 0.045, y: 0.01, c: ['#d8c08a', '#cdb47c'][i % 2] })));
    inst(sp, new THREE.BoxGeometry(0.46, 0.016, 0.012), '#6b4a30', [-0.11, 0.11].map(z => ({ y: 0.012, z })));
    paper(sp, ['先量', '再鋸', '後綁'], 0.4, 0.3, 0, 0.02, 0);
    P.tag(tg, 'tools');

    // 一起修橋的人：兩位工匠並肩合抬一根木料往橋走
    const hg = grp(G), mid = [-2.25, 0.85], f = faceTo(...mid), fr = f * DEG, side = [Math.cos(fr), -Math.sin(fr)], fw = [Math.sin(fr), Math.cos(fr)];
    [-1, 1].forEach((s, i) => who(P, hg, { who: 'craftsman', pose: 'carry', face: i ? 'smile' : 'calm', seed: i }, mid[0] + s * 0.42 * side[0], mid[1] + s * 0.42 * side[1], f));
    const lg = add(hg, new THREE.CylinderGeometry(0.065, 0.065, 1.55, 9).rotateZ(PI / 2), '#a8845a', mid[0] + 0.2 * fw[0], 0.33, mid[1] + 0.2 * fw[1]);
    lg.rotation.y = fr;
    P.tag(hg, 'helpers');

    // 遠處木料堆（溝的另一邊）
    inst(G, new THREE.CylinderGeometry(0.09, 0.09, 1.1, 8).rotateZ(PI / 2), '#9a7650', [[0, 0.09], [0.19, 0.09], [0.38, 0.09], [0.1, 0.25], [0.29, 0.25]].map(([o, y]) => ({ x: 1.6 + o * 0.2, y, z: -2.6 + o, ry: 0.5 })));

    const spots = { bridge: [-0.75, 0.85], tools: [1.3, 1.7], helpers: [-1.05, 1.8] };
    dress(P, G, keepOf(spots), DOCK, { grass: 26, stones: 14 });
    G.userData.standSpots = spots;
    G.userData.rim = rimOf([[-4.0, 0.9], [-1.5, -4.0], [3.3, -2.6]]);
    G.userData.dock = DOCK;
    return G;
  };

  // ======================= 05 知過能改：後方夯土台基茅草書齋（竹簡架、半捲竹簾）；前方席上矮几攤開竹簡、筆、硯、豆形燈；來訪學生正在說話 =======================
  LP_BUILD.study = P => {
    init();
    const G = new THREE.Group(), DOCK = -68;
    // 書齋：夯土台基＋台階、木柱、土牆（背面、兩側完整）、正面敞開、竹簾半捲、架上成捆竹簡、茅草兩坡頂
    const hs = grp(G, 0.1, 0, -2.55);
    hangtu(hs, 3.3, 0.36, 1.9); hangtu(hs, 0.9, 0.18, 0.34, 0, 0, 1.1);
    inst(hs, new THREE.CylinderGeometry(0.07, 0.075, 1.3, 8), COL.woodDk, [[-1.45, 0.75], [-0.5, 0.75], [0.5, 0.75], [1.45, 0.75], [-1.45, -0.75], [1.45, -0.75]].map(([x, z]) => ({ x, y: 0.36 + 0.65, z })));
    box(hs, 2.9, 1.3, 0.08, COL.plaster, 0, 1.01, -0.75); for (const s of [-1, 1]) box(hs, 0.08, 1.3, 1.5, COL.plaster, s * 1.45, 1.01, 0);
    inst(hs, new THREE.BoxGeometry(1, 1, 1), COL.wood, [[0, 0.75, 3.0, 0.1, 0.1, 1.68], [0, -0.75, 3.0, 0.1, 0.1, 1.68]].map(([x, z, sx, sy, sz, y]) => ({ x, y, z, sx, sy, sz })));
    box(hs, 2.4, 0.04, 1.3, '#c8b27c', 0, 0.38, -0.05);                                                    // 室內蓆
    inst(hs, new THREE.BoxGeometry(1, 1, 1), COL.wood, [[0, 0.62], [0, 1.0], [0, 1.38]].map(([x, y]) => ({ x: -0.7, y, z: -0.6, sx: 1.2, sy: 0.04, sz: 0.24 })));   // 簡架
    inst(hs, new THREE.CylinderGeometry(0.06, 0.06, 0.22, 8).rotateZ(PI / 2), '#ffffff', [0.66, 1.04, 1.42].flatMap((y, r) => [0, 1, 2, 3, 4].map(k => ({ x: -1.15 + k * 0.22 + (r % 2) * 0.05, y: y + 0.03, z: -0.6, c: ['#d8c08a', '#c9ad72', '#b89a62'][(k + r) % 3] }))));
    inst(hs, new THREE.BoxGeometry(0.8, 0.016, 0.012), '#d6c08a', Array.from({ length: 12 }, (_, i) => ({ x: 0.97, y: 1.6 - i * 0.026, z: 0.78 })));   // 右開間竹簾半垂
    add(hs, new THREE.CylinderGeometry(0.035, 0.035, 0.84, 8).rotateZ(PI / 2), '#c4ac70', 0.97, 1.3, 0.79);
    gable(hs, 1.55, 1.05, 0.72, 1.66, { c: COL.thatch, gableC: COL.plaster });
    const study = lpGlbSwap('study-hall', bake(hs), { fit: 'w' });
    bamboo(P, G, -3.05, -2.05, { n: 8, h: 2.3, r: 0.3, c: '#9aa866' });
    bamboo(P, G, 3.0, -2.2, { n: 6, h: 2.0, r: 0.26, c: '#9aa866' });
    P.tag(study, 'study');

    // 書案：席上一張矮几，攤開的竹簡寫著「人恆過 然後能改」，筆、硯、豆形青銅燈、捲起的竹簡
    const dk = grp(G, 1.05, 0, -0.25, -14);
    box(dk, 1.3, 0.012, 0.95, '#c8b27c', 0, 0.006, 0.05);                                                   // 席
    box(dk, 0.95, 0.05, 0.44, '#6e4a34', 0, 0.3, -0.1);
    inst(dk, new THREE.BoxGeometry(0.06, 0.28, 0.36), '#5e3d27', [-0.4, 0.4].map(x => ({ x, y: 0.14, z: -0.1 })));
    const sl = grp(dk, -0.08, 0.33, -0.1);
    inst(sl, new THREE.BoxGeometry(0.034, 0.008, 0.3), '#ffffff', Array.from({ length: 12 }, (_, i) => ({ x: -0.19 + i * 0.035, c: ['#e0c995', '#d4bb84'][i % 2] })));
    inst(sl, new THREE.BoxGeometry(0.44, 0.01, 0.008), '#6b4a30', [-0.08, 0.08].map(z => ({ y: 0.004, z })));
    paper(sl, ['人恆過', '然後能改'], 0.38, 0.27, 0, 0.007, 0);
    add(dk, new THREE.CylinderGeometry(0.035, 0.035, 0.32, 8).rotateZ(PI / 2), '#c9ad72', 0.3, 0.355, -0.22);   // 捲起的竹簡
    box(dk, 0.12, 0.025, 0.09, '#3a3836', 0.32, 0.337, 0.02); box(dk, 0.07, 0.006, 0.05, '#151312', 0.32, 0.352, 0.02);   // 硯
    const pen = grp(dk, 0.2, 0.336, 0.04); pen.rotation.set(0, 0.4, PI / 2 - 0.05);
    add(pen, new THREE.CylinderGeometry(0.007, 0.007, 0.2, 5), '#8a6a48'); add(pen, new THREE.ConeGeometry(0.011, 0.04, 6).rotateX(PI), COL.ink, 0, -0.12, 0);
    const lamp = grp(dk, -0.42, 0, 0.25);                                                                   // 豆形燈（席上）
    add(lamp, lathe([[0.1, 0], [0.05, 0.03], [0.022, 0.06], [0.02, 0.24], [0.08, 0.27], [0.085, 0.3]], 12), '#5f7a6a');
    fire(P, lamp, 0, 0.29, 0, 0.32);
    add(dk, new THREE.CylinderGeometry(0.16, 0.17, 0.05, 14), '#a38a5a', 0, 0.025, 0.36);                     // 坐墊
    P.tag(dk, 'desk');

    // 來訪的學生：交領短衣，站著向老師說話，手捧一捲竹簡
    const fx = -1.3, fz = 0.25, fg = grp(G, fx, 0, fz);
    who(P, fg, { who: 'scholar', pose: 'talk', face: 'worried' }, 0, 0, faceTo(fx, fz) - 12);
    add(fg, new THREE.CylinderGeometry(0.17, 0.18, 0.05, 14), '#a38a5a', 0.05, 0.025, -0.45);
    P.tag(fg, 'friend');

    // 書齋前的踏石小徑（貼地）
    inst(G, new THREE.CylinderGeometry(1, 1, 0.024, 9), '#ffffff', [[0.15, 1.75], [-0.12, 1.15], [0.12, 0.55], [-0.05, -0.05], [0.12, -0.65]].map(([x, z], i) => ({ x, y: 0.012, z, sx: 0.24, sz: 0.2, ry: i, c: ['#b5a890', '#a89c84'][i % 2] })));

    const spots = { study: [-0.35, -0.8], desk: [0.3, 0.75], friend: [-0.55, 0.95] };
    dress(P, G, keepOf(spots), DOCK, { grass: 22, stones: 12, grassC: ['#7f8a52', '#8f9a5a', '#6f7a4c'] });
    G.userData.standSpots = spots;
    G.userData.rim = rimOf([[3.9, 1.6], [-1.4, -4.0], [3.6, -1.6]]);
    G.userData.dock = DOCK;
    return G;
  };

  // ======================= 06 居安思危：後方弧形夯土城牆與烽火臺（守城兵）、右後城門樓與出城大道、左側議事堂前大臣與敢言的士；暮色，前右開闊 =======================
  LP_BUILD.city = P => {
    init();
    const G = new THREE.Group(), DOCK = 76, WR = 3.75;
    const pt = a => [Math.sin(a * DEG) * WR, Math.cos(a * DEG) * WR];
    const GATE = 150, gx = pt(GATE)[0] * 0.93, gz = pt(GATE)[1] * 0.93, gyaw = faceTo(gx, gz, 0, 0);
    // 城牆：沿後緣一段弧，在城門處斷開；牆頂外側一道矮女牆
    const wall = grp(G), H = 1.0;
    const segs = [[238, 214], [214, 190], [190, 166], [134, 112]];
    for (const [a0, a1] of segs) {
      const [x0, z0] = pt(a0), [x1, z1] = pt(a1), len = Math.hypot(x1 - x0, z1 - z0) + 0.14, yaw = Math.atan2(x1 - x0, z1 - z0);
      const s = grp(wall, (x0 + x1) / 2, 0, (z0 + z1) / 2); s.rotation.y = yaw + PI / 2;   // 本地 x 沿牆
      hangtu(s, len, H, 0.62, 0, 0, 0, '#b08a5c', '#9c7a50');
      const out = Math.sign(Math.sin(yaw + PI / 2) * (x0 + x1) + Math.cos(yaw + PI / 2) * (z0 + z1)) || 1;   // 女牆放外側
      hangtu(s, len, 0.2, 0.12, 0, H, out * 0.25, '#a8825a', '#94744c');
    }
    // 烽火臺：牆西端一座方形夯土高臺，頂上火盆冒煙
    const [bx0, bz0] = pt(214), bt = grp(wall, bx0, 0, bz0, faceTo(bx0, bz0, 0, 0));
    hangtu(bt, 0.95, 1.75, 0.95, 0, 0, 0, '#b08a5c', '#9c7a50');
    add(bt, lathe([[0.04, 0], [0.2, 0.06], [0.24, 0.18]], 12), '#4a4440', 0, 1.75, 0);
    lpGlbSwap('beacon-tower', bt);   // 火與煙在後面另掛
    fire(P, bt, 0, 1.82, 0, 1.1);
    smoke(P, wall, bx0, 2.2, bz0, { n: 9, rise: 2.0, s0: 0.14, s1: 0.5, c: '#7d7670', op: 0.4, drift: [0.5, 0.6] });
    // 守城兵：牆頂、臉朝城內；旁邊一座戈架
    const [sx, sz] = pt(190), sIn = 0.96;
    who(P, wall, { who: 'soldier', pose: 'spear', face: 'calm' }, sx * sIn, sz * sIn, faceTo(sx * sIn, sz * sIn), H);
    const rk = grp(wall, pt(200)[0] * sIn, H, pt(200)[1] * sIn, faceTo(...pt(200), 0, 0));
    inst(rk, geGeo(1.05), '#7a5a3a', [-0.12, 0, 0.12].map(x => ({ x, rz: -x * 0.4 })));
    box(rk, 0.4, 0.05, 0.08, COL.woodDk, 0, 0.55, 0);
    P.tag(wall, 'wall');

    // 城門：兩座夯土門墩、上架木構門樓（板瓦直坡頂）、半開的木門、門墩火把；門前一條出城的土路
    const gt = grp(G, gx, 0, gz, gyaw);
    for (const s of [-1, 1]) hangtu(gt, 0.75, 1.15, 0.95, s * 0.78, 0, 0, '#b08a5c', '#9c7a50');
    box(gt, 2.4, 0.12, 1.0, COL.wood, 0, 1.21, 0);
    inst(gt, new THREE.CylinderGeometry(0.05, 0.05, 0.62, 7), COL.woodDk, [-0.95, -0.32, 0.32, 0.95].flatMap(x => [-0.35, 0.35].map(z => ({ x, y: 1.58, z }))));
    box(gt, 2.0, 0.5, 0.05, '#c9b48a', 0, 1.55, -0.34);
    gable(gt, 1.1, 0.62, 0.42, 1.88, { c: COL.tile, tile: true, gableC: '#c9b48a' });
    for (const s of [-1, 1]) { const d = grp(gt, s * 0.4, 0, 0.3); d.rotation.y = s * 0.9; box(d, 0.4, 1.0, 0.05, '#7a3a2c', -s * 0.2, 0.5, 0); }
    for (const s of [-1, 1]) add(gt, new THREE.CylinderGeometry(0.03, 0.025, 0.3, 6), COL.woodDk, s * 0.8, 1.0, 0.52);
    const city = lpGlbSwap('city-gate', bake(gt));   // 火把、守門兵在烘完後才加（anim 要指著實際 mesh、chibi 不烘）
    for (const s of [-1, 1]) fire(P, city, s * 0.8, 1.14, 0.52, 0.45);
    who(P, city, { who: 'soldier', pose: 'spear', face: 'calm', seed: 2 }, 0.75, 0.75, 0);
    P.tag(city, 'gate');
    const road = add(G, new THREE.PlaneGeometry(0.8, 1.6).rotateX(-PI / 2), '#a89070', gx - 0.9 * Math.sin(GATE * DEG), 0.006, gz - 0.9 * Math.cos(GATE * DEG)); road.rotation.y = gyaw * DEG;   // 出城土路（貼地，不算城門本體）

    // 議事堂：夯土台基、敞開的木構廳、屏風與君席、板瓦直坡頂；堂前一位拱手的大臣與一位直言勸諫的士
    const cx = -2.55, cz = 0.05, ct = grp(G, cx, 0, cz, faceTo(cx, cz) * 0.85);
    const hall = grp(ct, 0, 0, -0.2);
    hangtu(hall, 2.1, 0.3, 1.45); hangtu(hall, 0.7, 0.15, 0.3, 0, 0, 0.86);
    inst(hall, new THREE.CylinderGeometry(0.06, 0.065, 1.1, 8), COL.woodDk, [[-0.9, 0.6], [0.9, 0.6], [-0.9, -0.6], [0.9, -0.6]].map(([x, z]) => ({ x, y: 0.85, z })));
    box(hall, 1.86, 1.1, 0.06, COL.plaster, 0, 0.85, -0.6);
    box(hall, 1.2, 0.7, 0.05, '#3a2e2a', 0, 0.68, -0.5); box(hall, 1.1, 0.6, 0.02, '#8a3a2e', 0, 0.68, -0.47);   // 屏風（黑漆朱心）
    box(hall, 0.8, 0.06, 0.5, '#c8b27c', 0, 0.33, -0.2);                                                     // 君席
    inst(hall, new THREE.BoxGeometry(1, 1, 1), COL.wood, [0.6, -0.6].map(z => ({ y: 1.42, z, sx: 2.0, sy: 0.08, sz: 0.08 })));
    gable(hall, 1.15, 0.85, 0.55, 1.46, { c: COL.tile, tile: true, gableC: COL.plaster });
    lpGlbSwap('council-hall', bake(hall));
    who(P, ct, { who: 'minister', pose: 'bow', face: 'worried' }, 0.42, 1.05, 18);
    who(P, ct, { who: 'scholar', pose: 'talk', face: 'calm', seed: 3 }, -0.45, 1.25, -10);
    P.tag(ct, 'court');

    const spots = { court: [-0.75, 1.75], wall: [-0.85, -2.35], gate: [0.6, -1.4] };
    dress(P, G, keepOf(spots), DOCK, { grass: 18, stones: 16, grassC: ['#8a7a4a', '#9a8550', '#7a6e46'] });
    G.userData.standSpots = spots;
    G.userData.rim = rimOf([[3.6, 2.4], [-4.0, 1.4], [2.8, -3.1]]);
    G.userData.dock = DOCK;
    return G;
  };
})();
