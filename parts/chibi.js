// ================= CHIBI：日式 Q 版人物（頭身 1:1）＝C 線（孟子・憂患之旅） =================
// 介面（整合者定，A/B/C 只透過這個呼叫，不自己捏人）：
//   const c = lpChibi({ who, pose?, face?: 'smile' | 'sad' | 'surprised' | 'worried' | 'calm', scale?: 1, seed?: 0, colors?: { top, bottom, sash, hair, trim } });
//   c 是 THREE.Group：腳底在原點、+z 是臉朝的方向、預設身高約 1.0（頭直徑約 0.5）。
//   c.userData.anim(dt, t)：每幀呼叫（眨眼、呼吸、姿勢小動作）；c.userData.setPose(p)、c.userData.setFace(f)；setOutfit 保留為空操作（一人一套衣服）。
// 角色（戰國；典故人物依其時代）：
//   mengzi 孟子（主角）：束髮小冠、黛青交領右衽寬袖深衣、淺色大帶、布履、Q 版短鬚、持一卷竹簡（不戴襆頭、不拿摺扇）
//   shun 舜（傳說）：束髮、粗麻短衣、赤腳、扶耒耜（預設 pose 'plough'）
//   fuyue 傅說（商，傳說）：短衣束腰、捲褲管、持夯杵（預設 'tamp'）
//   jiaoge 膠鬲（商末）：幅巾短衣、提魚簍（預設 'basket'）
//   guanzhong 管仲（春秋齊）：樸素衣、頸上木枷（預設 'bound'）
//   sunshuao 孫叔敖（春秋楚）：斗笠布衣、短鬚
//   baili 百里奚（春秋秦）：白髮老人、臂上搭羊皮
//   scholar 戰國士人／學生（seed 換衣色）、craftsman 工匠（幅巾短衣）、soldier 守城兵（皮甲＋戈，預設 'spear'）、
//   minister 大臣（高冠寬袖，預設 'bow'）、boatman 船夫（斗笠短褐、撐竹篙，預設 'pole'）
// pose：stand sit walk wave point bow hold surprised read write basket pick reach，本作加 plough（扶耒）tamp（夯土）carry（扛木：雙手上舉托肩上重物，木頭 A/B 自備）
//       bound（戴枷）talk（說話比手勢）spear（持戈）pole（撐篙）
// 補充：
//   - pose 'sit'／'write' 的臀部在 c.userData.seatY（已含 scale），A/B 把人放到座位高度 − seatY 即可。
//   - 'read' 兩手捧著攤開的竹簡；'bow' 拱手（手上東西收起來）；道具跟著姿勢出現（plough 耒耜、tamp 夯杵、spear 戈、pole 竹篙、bound 木枷）。
//   - 臉是 canvas 畫的貼圖（依角色臉型＋表情＋眨眼快取共用）；沒有 canvas（node 測試）時臉部網格隱藏，不會報錯。
//   - 材質用 lpCel（core.js）；還沒有時用本檔的 chCel（2 階柔和賽璐珞）。

let chGrad = null;
const chMatCache = new Map();
function chCel(hex, o = {}) {
  const k = hex + JSON.stringify(o);
  if (!chMatCache.has(k)) {
    if (!chGrad) {   // 亮面＋一道柔邊陰影（2 階，邊緣線性過渡）
      const v = [170, 170, 170, 170, 170, 170, 178, 204, 236, 250, 255, 255, 255, 255, 255, 255], d = new Uint8Array(v.length * 4);
      v.forEach((x, i) => d.set([x, x, x, 255], i * 4));
      chGrad = new THREE.DataTexture(d, v.length, 1); chGrad.minFilter = chGrad.magFilter = THREE.LinearFilter; chGrad.needsUpdate = true;
    }
    chMatCache.set(k, new THREE.MeshToonMaterial({ color: hex, gradientMap: chGrad, ...o }));
  }
  return chMatCache.get(k);
}
const CM = (h, o) => (typeof lpCel === 'function' ? lpCel : chCel)(h, o);

// ---------- 幾何小工具 ----------
const CH_D = Math.PI / 180;
const chV = (x, y, z) => new THREE.Vector3(x, y, z);
// 球面點（度）：th 從頭頂量起，ph=0 在正前方（+z），正值往 +x
const chSph = (r, th, ph) => chV(r * Math.sin(th * CH_D) * Math.sin(ph * CH_D), r * Math.cos(th * CH_D), r * Math.sin(th * CH_D) * Math.cos(ph * CH_D));
function chTf(g, p = [0, 0, 0], r = [0, 0, 0], s = 1) {
  const sv = typeof s === 'number' ? chV(s, s, s) : chV(...s);
  return g.applyMatrix4(new THREE.Matrix4().compose(chV(...p), new THREE.Quaternion().setFromEuler(new THREE.Euler(...r)), sv));
}
// 頂點色：col 是色碼或 (x,y,z)=>THREE.Color
function chPaint(g, col) {
  const pos = g.attributes.position, a = new Float32Array(pos.count * 3), c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const cc = typeof col === 'function' ? col(pos.getX(i), pos.getY(i), pos.getZ(i)) : c.set(col);
    a[i * 3] = cc.r; a[i * 3 + 1] = cc.g; a[i * 3 + 2] = cc.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return g;
}
// 合併成一個網格（只留 position／normal／color）
function chMerge(list) {
  const P = [], N = [], C = [], I = [];
  let vn = 0;
  for (const g of list) {
    if (!g.attributes.normal) g.computeVertexNormals();
    if (!g.attributes.color) chPaint(g, '#ffffff');
    const n = g.attributes.position.count;
    P.push(...g.attributes.position.array); N.push(...g.attributes.normal.array); C.push(...g.attributes.color.array);
    if (g.index) for (const i of g.index.array) I.push(i + vn); else for (let i = 0; i < n; i++) I.push(i + vn);
    vn += n; g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
  out.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
  out.setIndex(I);
  return out;
}
// 弧形束（髮束、領、垂帶、纓）：沿曲線的扁透鏡截面帶子，中間鼓、兩邊收
function chRibbon(pts, o = {}) {
  const cur = new THREE.CatmullRomCurve3(pts), n = o.seg || 14, m = o.m || 6, th = o.th ?? 0.03;
  const wf = typeof o.w === 'function' ? o.w : t => lerp(o.w[0], o.w[1], t);
  const pos = [], idx = [], tan = chV(0, 0, 0), side = chV(0, 0, 0), out = chV(0, 0, 0), q = chV(0, 0, 0);
  for (let layer = 0; layer < 2; layer++) for (let i = 0; i <= n; i++) {
    const t = i / n, p = cur.getPoint(t); cur.getTangent(t, tan);
    out.copy(o.out ? o.out(p, t) : chHairOut(p));
    side.crossVectors(tan, out).normalize(); out.crossVectors(side, tan).normalize();
    const w = wf(t);
    for (let j = 0; j <= m; j++) {
      const s = j / m, b = Math.sin(Math.PI * s);
      q.copy(p).addScaledVector(side, (s - 0.5) * w).addScaledVector(out, layer ? -th * 0.35 * b : th * b);
      pos.push(q.x, q.y, q.z);
    }
  }
  const L = (n + 1) * (m + 1);
  for (let layer = 0; layer < 2; layer++) for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) {
    const a = layer * L + i * (m + 1) + j, b = a + m + 1, c = a + 1, d = b + 1;
    if (layer) idx.push(a, b, c, c, b, d); else idx.push(a, c, b, c, d, b);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  if (o.col) chPaint(g, o.col);
  return g;
}
// 頭髮的「向外」方向：上半顆沿球面法線，下垂的部分轉成水平向外
function chHairOut(p) { return chV(p.x, p.y > 0 ? p.y : p.y * 0.25, p.z + 0.001).normalize(); }
// 車床旋轉體；接縫轉到背後
function chLathe(prof, seg = 28) { if (prof[0][1] > prof[prof.length - 1][1]) prof = [...prof].reverse(); return new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), seg).rotateY(Math.PI); }
function chProfR(prof, y) {
  const p = prof.filter(a => a[0] > 0.01);
  for (let i = 0; i < p.length - 1; i++) {
    const [r0, y0] = p[i], [r1, y1] = p[i + 1];
    if ((y - y0) * (y - y1) <= 0) return y1 === y0 ? r0 : lerp(r0, r1, (y - y0) / (y1 - y0));
  }
  return p[y < p[0][1] ? 0 : p.length - 1][0];
}
const chCol = (a, b, k) => new THREE.Color(a).lerp(new THREE.Color(b), k);

// ---------- 頭髮配色：一道乾淨的天使環（只看 th，寬度均勻、兩端收細）＋圓髻上的小高光 ----------
function chRing(hair, ring) {
  const B = new THREE.Color(hair), H = new THREE.Color(ring), c = new THREE.Color();
  return (x, y, z) => {
    const r = Math.hypot(x, y, z) || 1, th = Math.acos(clamp(y / r, -1, 1)) / CH_D, ph = Math.abs(Math.atan2(x, z)) / CH_D;
    const hw = 4 * Math.sqrt(clamp((112 - ph) / 45, 0, 1));
    return c.copy(B).lerp(H, clamp((hw - Math.abs(th - 52)) / 1.4, 0, 1));
  };
}
// 髮束兩側邊緣壓暗＝片與片之間的深色縫（依 chRibbon 頂點順序取橫向位置 s）
function chEdge(g, m, col, dark) {
  const pos = g.attributes.position, a = new Float32Array(pos.count * 3), D = new THREE.Color(dark), c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const s = (i % (m + 1)) / m, e = clamp((Math.abs(s - 0.5) - 0.3) / 0.2, 0, 1);
    c.copy(col(pos.getX(i), pos.getY(i), pos.getZ(i))).lerp(D, e * 0.9);
    a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return g;
}
function chBallColor(hair, hi, cx, cy, cz) {
  const B = new THREE.Color(hair), H = new THREE.Color(hi), c = new THREE.Color();
  return (x, y, z) => {
    const dx = x - cx, dy = y - cy, dz = z - cz, r = Math.hypot(dx, dy, dz) || 1;
    const th = Math.acos(clamp(dy / r, -1, 1)) / CH_D, k = clamp((1 - Math.abs(th - 42) / 12) * 1.6, 0, 1) * clamp(dz / r + 0.6, 0, 1);
    return c.copy(B).lerp(H, k * 0.7);
  };
}

// ---------- 臉部貼圖（canvas 程式畫，依臉型＋表情＋眨眼快取） ----------
const CH_FACE_MAT = new Map();
const CH_FW = 512, CH_FH = Math.round(512 * 70 / 110);   // 貼圖覆蓋頭部前方 ph ±55°、th 60–130°
function chFaceMat(st, face, blink) {
  const key = st.key + '|' + face + '|' + (blink ? 1 : 0);
  if (!CH_FACE_MAT.has(key)) {
    let tex = null;
    try {
      if (typeof document !== 'undefined' && document.createElement) {
        const cv = document.createElement('canvas'); cv.width = CH_FW * 2; cv.height = CH_FH * 2;
        const c = cv.getContext && cv.getContext('2d');
        if (c) { c.scale(2, 2); chDrawFace(c, st, face, blink); tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4; }
      }
    } catch (e) { tex = null; }
    // 臉也吃光：同一條 toon 漸層，加一點 emissive 讓五官不被陰影吃掉，但不會比頭亮
    const grad = CM('#ffffff').gradientMap || (chCel('#ffffff'), chGrad);
    CH_FACE_MAT.set(key, tex ? new THREE.MeshToonMaterial({ map: tex, gradientMap: grad, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: 0.08, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }) : null);
  }
  return CH_FACE_MAT.get(key);
}
function chDrawFace(c, st, face, blink) {
  const k = CH_FW / 110, X = ph => (ph + 55) * k, Y = th => (th - 60) * k;
  const sur = face === 'surprised', sad = face === 'sad', wor = face === 'worried', calm = face === 'calm';
  c.lineCap = c.lineJoin = 'round';
  // 腮紅＋三道斜線
  for (const s of [-1, 1]) {
    const cx = X(s * 33), cy = Y(113.5);
    c.save(); c.translate(cx, cy); c.scale(1, 0.55);
    const g = c.createRadialGradient(0, 0, 0, 0, 0, 16 * k);
    g.addColorStop(0, `rgba(238,118,122,${st.blush})`); g.addColorStop(1, 'rgba(238,118,122,0)');
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, 16 * k, 0, Math.PI * 2); c.fill(); c.restore();
    c.strokeStyle = `rgba(212,92,98,${st.blush * 0.85})`; c.lineWidth = 1.6;
    for (let i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(cx + i * 8 - 2.5, cy + 4); c.lineTo(cx + i * 8 + 2.5, cy - 4); c.stroke(); }
  }
  // 眼睛
  for (const s of [-1, 1]) chDrawEye(c, X(s * st.eyeX), Y(103), 10.2 * k * st.eyeS * (st.male ? 0.94 : 1), 12.6 * k * st.eyeS * (st.male ? 0.88 : 1), s, st, face, blink);
  // 細眉
  for (const s of [-1, 1]) {
    const inY = sur ? 80.5 : (sad || wor) ? 82.5 : st.stern ? 87.5 : 86.8, outY = sur ? 81.5 : (sad || wor) ? 88 : st.stern ? 84.5 : 87.3, mid = (sur ? 78 : (sad || wor) ? 84 : st.stern ? 84.5 : 84.6) + st.browArc;
    c.strokeStyle = st.brow; c.lineWidth = st.browW || (st.male ? 4.6 : 2.8);
    c.beginPath(); c.moveTo(X(s * 9), Y(inY)); c.quadraticCurveTo(X(s * 20), Y(mid), X(s * 31), Y(outY)); c.stroke();
  }
  // 皺紋（長輩）
  if (st.old) {
    c.strokeStyle = 'rgba(160,100,80,.55)'; c.lineWidth = 1.5;
    for (const s of [-1, 1]) for (let i = 0; i < 2; i++) { c.beginPath(); c.moveTo(X(s * 32), Y(100 + i * 4)); c.lineTo(X(s * 36), Y(99 + i * 5)); c.stroke(); }
  }
  // 小鼻點
  c.fillStyle = 'rgba(196,118,98,.75)'; c.beginPath(); c.ellipse(X(0), Y(112.5), 2.4, 1.8, 0, 0, Math.PI * 2); c.fill();
  // 嘴
  const mx = X(0), my = Y(121.5);
  c.save(); c.translate(mx, my); c.scale(1.7, 1.7); c.translate(-mx, -my);
  c.strokeStyle = st.lineC; c.lineWidth = 2.4; c.beginPath();
  if (sur) {
    c.ellipse(mx, my + 2, 6.5, 8.5, 0, 0, Math.PI * 2); c.fillStyle = '#9a3a3e'; c.fill(); c.stroke();
  } else if (sad) {
    c.moveTo(mx - 9, my + 4); c.quadraticCurveTo(mx, my - 3, mx + 9, my + 4); c.stroke();
  } else if (wor) {
    c.moveTo(mx - 11, my + 1); c.bezierCurveTo(mx - 5, my - 4, mx + 3, my + 6, mx + 11, my - 1); c.stroke();
  } else if (calm) {
    c.strokeStyle = st.lip; c.lineWidth = 3; c.moveTo(mx - 8, my); c.quadraticCurveTo(mx, my + 5, mx + 8, my); c.stroke();
  } else {
    c.moveTo(mx - 13, my - 3); c.quadraticCurveTo(mx, my + 1.5, mx + 13, my - 3); c.quadraticCurveTo(mx + 6, my + 11, mx, my + 11); c.quadraticCurveTo(mx - 6, my + 11, mx - 13, my - 3); c.closePath();
    c.fillStyle = st.lip; c.fill();
    c.save(); c.clip(); c.fillStyle = '#f19494'; c.beginPath(); c.ellipse(mx, my + 10, 7, 4.5, 0, 0, Math.PI * 2); c.fill(); c.restore();
    c.lineWidth = 2; c.stroke();
  }
  c.restore();
  // 汗滴（擔心）
  if (wor) {
    const sx = X(40), sy = Y(90);
    c.fillStyle = 'rgba(150,200,230,.85)'; c.strokeStyle = 'rgba(70,120,160,.8)'; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(sx, sy - 10); c.quadraticCurveTo(sx + 8, sy + 4, sx, sy + 7); c.quadraticCurveTo(sx - 8, sy + 4, sx, sy - 10); c.fill(); c.stroke();
  }
}
// 眼睛分層：眼白→虹膜兩色漸層→瞳孔→下方反光→上眼瞼陰影→大小高光→眼框（上眼線＋眼尾）→下睫毛
function chDrawEye(c, cx, cy, a, b, s, st, face, blink) {
  const sur = face === 'surprised', L = st.lineC;
  if (blink || (st.old && !sur)) {
    c.strokeStyle = L; c.lineWidth = b * 0.12; c.beginPath();
    if (st.old) { c.moveTo(cx - a * 0.85, cy + b * 0.15); c.quadraticCurveTo(cx, cy - b * 0.5, cx + a * 0.85, cy + b * 0.15); }
    else { c.moveTo(cx - a * 0.95, cy + b * 0.05); c.quadraticCurveTo(cx, cy + b * 0.5, cx + a * 0.95, cy + b * 0.05); }
    c.stroke();
    if (!st.male) { c.lineWidth = b * 0.07; c.beginPath(); c.moveTo(cx + s * a * 0.9, cy + b * 0.08); c.lineTo(cx + s * a * 1.15, cy - b * 0.1); c.stroke(); }
    return;
  }
  if (sur) { a *= 1.05; b *= 1.04; }
  const lid = face === 'calm' ? 0.24 : face === 'sad' ? 0.15 : 0, top = cy - b + 2 * b * lid;
  c.save();
  c.beginPath(); c.ellipse(cx, cy, a, b, 0, 0, Math.PI * 2); c.clip();
  if (lid) { c.beginPath(); c.rect(cx - a - 2, top, 2 * a + 4, 2 * b + 4); c.clip(); }
  let g = c.createLinearGradient(0, cy - b, 0, cy + b);
  g.addColorStop(0, '#d9cbc8'); g.addColorStop(0.35, '#fffaf4'); g.addColorStop(1, '#fffdf8');
  c.fillStyle = g; c.fillRect(cx - a, cy - b, 2 * a, 2 * b);
  const ia = a * (sur ? 0.58 : 0.86), ib = b * (sur ? 0.6 : 0.9), icy = cy + b * (sur ? 0.05 : 0.1);
  g = c.createLinearGradient(0, icy - ib, 0, icy + ib);
  g.addColorStop(0, st.iris[0]); g.addColorStop(0.42, st.iris[0]); g.addColorStop(1, st.iris[1]);
  c.fillStyle = g; c.beginPath(); c.ellipse(cx, icy, ia, ib, 0, 0, Math.PI * 2); c.fill();
  c.strokeStyle = 'rgba(28,16,12,.55)'; c.lineWidth = 2; c.stroke();
  c.fillStyle = 'rgba(24,13,11,.82)'; c.beginPath(); c.ellipse(cx, icy - ib * 0.06, ia * 0.46, ib * 0.5, 0, 0, Math.PI * 2); c.fill();
  g = c.createRadialGradient(cx, icy + ib * 0.7, 0, cx, icy + ib * 0.7, ia * 0.85);
  g.addColorStop(0, st.glow); g.addColorStop(1, 'rgba(255,220,170,0)');
  c.fillStyle = g; c.beginPath(); c.ellipse(cx, icy + ib * 0.6, ia * 0.8, ib * 0.42, 0, 0, Math.PI * 2); c.fill();
  g = c.createLinearGradient(0, top, 0, top + b * 0.6);
  g.addColorStop(0, 'rgba(60,32,30,.5)'); g.addColorStop(1, 'rgba(60,32,30,0)');
  c.fillStyle = g; c.fillRect(cx - a, top, 2 * a, b * 0.6);
  c.fillStyle = '#ffffff';
  c.beginPath(); c.ellipse(cx - a * 0.3, Math.max(cy - b * 0.3, top + b * 0.32), a * 0.27, b * 0.22, -0.35, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.ellipse(cx + a * 0.33, icy + ib * 0.42, a * 0.12, b * 0.1, 0, 0, Math.PI * 2); c.fill();
  c.restore();
  // 眼框
  c.strokeStyle = L; c.lineWidth = b * (st.male ? 0.13 : 0.17); c.beginPath();
  let ex, ey;
  if (!lid) { c.moveTo(cx - a * 1.04, cy - b * 0.3); c.quadraticCurveTo(cx, cy - b * 1.72, cx + a * 1.04, cy - b * 0.3); ex = cx + s * a * 1.04; ey = cy - b * 0.3; }
  else {
    const w = a * Math.sqrt(Math.max(0, 1 - ((top - cy) / b) ** 2)) * 1.06;
    c.moveTo(cx - w, top + b * 0.1); c.quadraticCurveTo(cx, top - b * 0.22, cx + w, top + b * 0.1); ex = cx + s * w; ey = top + b * 0.1;
  }
  c.stroke();
  if (!st.male) { c.lineWidth = b * 0.1; c.beginPath(); c.moveTo(ex - s * a * 0.12, ey - b * 0.02); c.lineTo(ex + s * a * 0.24, ey - b * 0.2); c.stroke(); }
  // 下睫毛一筆
  c.lineWidth = Math.max(1.6, b * 0.05); c.strokeStyle = 'rgba(42,29,26,.75)'; c.beginPath();
  if (s > 0) c.ellipse(cx, cy, a * 1.02, b * 1.02, 0, 0.3, 0.95); else c.ellipse(cx, cy, a * 1.02, b * 1.02, 0, Math.PI - 0.95, Math.PI - 0.3);
  c.stroke();
}

// ---------- 角色設定（北朝服制：女子窄袖短襦＋長裙、男子袴褶、戎裝裲襠甲＋兜鍪；配色取傳統礦物色） ----------
const CH_SKIN = '#f8e0cc', CH_INK = '#2a1d1a';
function chFaceStyle(o) {
  const st = Object.assign({ male: false, old: false, stern: false, eyeS: 1, eyeX: 21.5, browArc: 0, browW: 0, blush: 0.5, iris: ['#2c1b15', '#a1653c'], glow: 'rgba(255,214,160,.55)', brow: '#3b2a24', lineC: CH_INK, lip: '#c4525a' }, o);
  st.key = JSON.stringify(st);
  return st;
}
function chConfig(who, outfit, seed, colors = {}) {
  const r = mulberry32(((seed | 0) + 1) * 7919 + who.length * 131), pick = a => a[Math.floor(r() * a.length) % a.length];
  const male = chFaceStyle({ male: true, eyeS: 0.86, blush: 0.28, iris: ['#2a1d18', '#7a5236'], brow: '#2e2420' });
  const base = { female: false, child: false, cloth: 'kuzhe', sleeve: 'narrow', bangs: 'short', hair: 'knot', hat: null, beard: null, prop: null, fs: male, pose: 'stand', face: 'smile',
    c: { top: '#7a6a58', bottom: '#5f646a', trim: '#f1ece0', sash: '#3a4a5c', hair: '#2b2530', pants: '#5f646a', shoe: '#3a2e28', skin: CH_SKIN } };
  const cf = (o, c) => Object.assign({}, base, o, { c: Object.assign({}, base.c, c, colors) });
  const old = o => chFaceStyle({ male: true, old: true, eyeS: 0.8, blush: 0.25, brow: '#b8b3ab', ...o });
  const M = o => chFaceStyle({ male: true, eyeS: 0.88, blush: 0.36, iris: ['#2a1d18', '#7a5236'], brow: '#2e2420', ...o });
  const sd = seed | 0;
  switch (who) {
    case 'mengzi':  // 主角孟子：束髮小冠、黛青交領右衽寬袖深衣、淺色大帶、布履、短鬚、持竹簡
      return cf({ cloth: 'robe', sleeve: 'wide', hair: 'knot', bangs: 'none', hat: 'xiaoguan', beard: '#2b2530', beardS: 0.55, prop: 'slips', daidai: true,
        fs: M({ eyeS: 0.9, blush: 0.36 }) },
        { top: '#3f5d6a', bottom: '#3f5d6a', trim: '#a0623a', sash: '#e6d8b8', crown: '#2b2622', shoe: '#4a3a2e' });
    case 'shun':    // 舜：束髮、粗麻短衣、赤腳、扶耒耜
      return cf({ cloth: 'kuzhe', hair: 'knot', bangs: 'short', rolled: true, prop: 'plough', pose: 'plough', beard: '#3a3430', beardS: 0.45, fs: M({ blush: 0.45 }) },
        { top: '#c2ad84', pants: '#9a8a68', sash: '#6b5a48', trim: '#e8dcc0', shoe: '#efcfb2', skin: '#efcfb2' });
    case 'fuyue':   // 傅說：短衣束腰、捲褲管、持夯杵
      return cf({ cloth: 'kuzhe', hair: 'knot', bangs: 'short', rolled: true, prop: 'pestle', pose: 'tamp', fs: M({ blush: 0.42, stern: true }) },
        { top: '#9a8462', pants: '#6f6250', sash: '#3a3128', trim: '#e2d4b4', shoe: '#5a4636', skin: '#ecc9a8' });
    case 'jiaoge':  // 膠鬲：販魚鹽的人，幅巾短衣、提魚簍
      return cf({ cloth: 'kuzhe', hat: 'kerchief', hair: 'knot', bangs: 'short', prop: 'fishbasket', pose: 'basket', beard: '#3a3430', beardS: 0.5, fs: M({ blush: 0.4 }) },
        { top: '#7d8c8a', pants: '#5c5a52', sash: '#a0623a', trim: '#e6dcc4', kerchief: '#5a5048', shoe: '#4a3e34' });
    case 'guanzhong': // 管仲：被押的囚徒，衣服樸素、頸上木枷
      return cf({ cloth: 'robe', hair: 'knot', bangs: 'short', prop: 'cangue', pose: 'bound', face: 'calm', beard: '#2b2530', beardS: 0.6, fs: M({ blush: 0.25, eyeS: 0.86 }) },
        { top: '#a49b88', bottom: '#a49b88', trim: '#7d7464', sash: '#5a5048', shoe: '#5a4a3c' });
    case 'sunshuao': // 孫叔敖：海濱隱居，斗笠布衣
      return cf({ cloth: 'kuzhe', hat: 'douli', hair: 'knot', bangs: 'short', beard: '#2b2530', beardS: 0.55, fs: M({ blush: 0.38, eyeS: 0.86 }) },
        { top: '#cdbf98', pants: '#8a8670', sash: '#4f6a6a', trim: '#f1e9d4', shoe: '#6b5a48', hat: '#a58858' });
    case 'baili':   // 百里奚：市集中的老人，白髮白鬚、臂上搭羊皮
      return cf({ cloth: 'robe', hair: 'knot', bangs: 'short', prop: 'sheepskin', pose: 'basket', beard: '#e8e2d6', beardLong: true, old: true, fs: chFaceStyle({ male: true, old: true, eyeS: 0.8, blush: 0.3, brow: '#d8d2c6' }) },
        { top: '#8a7a62', bottom: '#8a7a62', trim: '#d9cdb0', sash: '#4a3e34', hair: '#dcd6cc', shoe: '#4a3e34' });
    case 'craftsman': // 工匠：幅巾、短衣束腰、捲褲管
      return cf({ cloth: 'kuzhe', hat: 'kerchief', hair: 'knot', bangs: 'short', rolled: sd % 2 === 0, beard: sd % 2 ? '#2b2530' : null, beardS: 0.5, fs: M({ blush: 0.45 }) },
        Object.assign(sd % 2 ? { top: '#8a6a4a', pants: '#5f646a' } : { top: '#6f7d6a', pants: '#6a5a48' }, { sash: '#3a3128', trim: '#e6d9bc', kerchief: '#7a6248', shoe: '#4a3e34', skin: '#efcfb2' }));
    case 'soldier': // 守城兵：束髮頭巾、短衣外罩皮甲、持戈（不是明清盔甲）
      return cf({ cloth: 'kuzhe', hat: 'kerchief', hair: 'knot', bangs: 'short', armor: true, prop: 'ge', pose: 'spear', fs: M({ blush: 0.35, stern: true }) },
        { top: '#8a3f32', pants: '#5a5048', sash: '#2b2622', trim: '#c9b48a', kerchief: '#6a2e26', armor: '#6b4a34', shoe: '#3a2e28' });
    case 'minister': // 大臣：高冠、寬袖深衣、拱手
      return cf({ cloth: 'robe', sleeve: 'wide', hair: 'knot', bangs: 'none', hat: 'gaoguan', beard: '#2b2530', beardS: 0.8, pose: 'bow', daidai: true, fs: M({ eyeS: 0.86, blush: 0.3 }) },
        { top: '#6e3a32', bottom: '#6e3a32', trim: '#c9a75a', sash: '#d9c9a0', crown: '#231f1d', shoe: '#231f1d' });
    case 'boatman': // 船夫：斗笠、短褐、捲褲管、撐竹篙
      return cf({ cloth: 'kuzhe', hat: 'douli', hair: 'knot', bangs: 'short', rolled: true, prop: 'pole', pose: 'pole', beard: '#3a3430', beardS: 0.5, fs: M({ blush: 0.5 }) },
        { top: '#7a6a52', pants: '#4f5a64', sash: '#a0623a', trim: '#e9dfc6', shoe: '#efcfb2', skin: '#e9c4a0', hat: '#b08f58' });
    case 'scholar': // 戰國士人／學生：束髮幅巾、交領深衣（seed 換色）
    default:
      return cf({ cloth: 'robe', hat: 'kerchief', hair: 'knot', bangs: 'short', fs: M({ eyeS: 0.92, blush: 0.45 }) },
        Object.assign([{ top: '#6f8a72', trim: '#3f5a46' }, { top: '#9a7a5a', trim: '#5f4a34' }, { top: '#5f7488', trim: '#384a5c' }][sd % 3], { sash: '#2b2622', kerchief: '#3a3430', shoe: '#3a2e28' }, (o => ({ bottom: o.top }))([{ top: '#6f8a72' }, { top: '#9a7a5a' }, { top: '#5f7488' }][sd % 3])));
  }
}

// ---------- 骨架尺寸（成人；小孩整組 ×0.8） ----------
const CH_HIP = 0.2, CH_NECK = 0.5, CH_SKULL = [0.27, 0.24, 0.255];
const CH_TORSO = [[0.001, 0.2], [0.152, 0.2], [0.156, 0.26], [0.155, 0.33], [0.147, 0.42], [0.124, 0.475], [0.078, 0.512], [0.001, 0.524]];
const CH_SKIRT = [[0.001, 0.014], [0.226, 0.014], [0.232, 0.03], [0.2305, 0.054], [0.2295, 0.062], [0.205, 0.13], [0.18, 0.25], [0.167, 0.33], [0.163, 0.368], [0.001, 0.372]];
const CH_HEM = [[0.001, 0.125], [0.188, 0.125], [0.19, 0.14], [0.1875, 0.145], [0.1865, 0.152], [0.172, 0.2], [0.158, 0.25], [0.001, 0.25]];
const CH_ROBE = [[0.001, 0.014], [0.236, 0.014], [0.236, 0.035], [0.234, 0.05], [0.233, 0.06], [0.205, 0.13], [0.172, 0.22], [0.158, 0.27], [0.001, 0.27]];

// 頭部：略扁的大圓，下半臉頰飽滿
function chHeadShape(g) {
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), r = Math.hypot(x, y, z) || 1, u = y / r;
    const f = u < 0.15 ? 1 + 0.085 * Math.sin(Math.min(1, (0.15 - u) / 0.75) * Math.PI * 0.5) * (u > -0.75 ? 1 : Math.max(0, 1 - (-0.75 - u) * 2)) : 1;
    p.setX(i, x * f); p.setZ(i, z * (1 + (f - 1) * 0.5));
  }
  g.computeVertexNormals();
  return g;
}

function chHairGeo(cf) {
  const hair = cf.c.hair, gray = new THREE.Color(hair).getHSL({}).l > 0.35;
  const hi = chCol(hair, '#c9b8d8', 0.5).getStyle(), seam = chCol(hair, '#000', 0.55).getStyle();
  const col = chRing(hair, gray ? chCol(hair, '#ffffff', 0.4).getStyle() : '#6a5a70'), plain = () => new THREE.Color(hair);
  const list = [], g = [], pre = [];
  const sph = (r, ws, hs, p0, pl, t0, tl) => new THREE.SphereGeometry(r, ws, hs, p0 * CH_D, pl * CH_D, t0 * CH_D, tl * CH_D);
  const hatted = !!cf.hat && !CH_CROWN.includes(cf.hat);   // 冠戴在髻上：底下仍要有梳上去的頭髮
  const backTo = cf.female ? 120 : 108, under = hatted ? 66 : 40;
  if (!hatted || ['kerchief', 'lunjin', 'futou', 'dongpo', 'douli'].includes(cf.hat)) {
    if (!hatted) list.push(sph(1.05, 40, 30, 0, 360, 0, 44));
    list.push(sph(1.045, 40, 40, 152, 236, under, backTo - under));
  }
  // 瀏海底層用深色：片與片之間露出來就是縫
  if (cf.bangs === 'long' || cf.bangs === 'short') pre.push(chPaint(sph(1.035, 24, 8, 90 - 62, 124, 38, 34), seam));
  // 瀏海：5–7 片大髮束，尖端圓潤（寬度在後段以橢圓收掉）
  const tipW = (w, k = 0.55) => t => w * (t < k ? 0.82 + 0.18 * t / k : Math.pow(Math.max(0, 1 - ((t - k) / (1 - k)) ** 2), 0.75));
  const strand = (pts, w, th, seg, out) => pre.push(chEdge(chRibbon(pts, { w: tipW(w), th, seg, m: 8, out }), 8, col, seam));
  const bang = (phC, tip, sw, w, th0 = 6, r0 = 1.055, th = 0.075) => {
    const pts = [];
    for (const t of [0, 0.25, 0.5, 0.72, 0.9, 1]) {
      const thv = lerp(th0, tip, t), ph = phC * Math.min(1, 0.35 + t) + sw * t * t, rr = r0 + 0.025 * Math.sin(Math.PI * t * 0.9) - (t > 0.9 ? 0.012 : 0);
      pts.push(chSph(rr, thv, ph));
    }
    strand(pts, w, th, 44);
  };
  // 相鄰兩片半徑錯開，重疊處不會閃
  const lay = (arr, th0, r0, th) => arr.forEach((a, i) => bang(a[0], a[1], a[2], a[3], th0, r0 + (i % 2 ? 0.012 : 0), th));
  if (cf.bangs === 'long') lay([[-48, 99, -7, 0.5], [-29, 90, -5, 0.5], [-10, 84, -2, 0.48], [10, 84, 2, 0.48], [29, 90, 5, 0.5], [48, 99, 7, 0.5]], 6, 1.055, 0.075);
  if (cf.bangs === 'short') lay([[-42, 91, -7, 0.52], [-21, 85, -4, 0.52], [0, 82, 1, 0.5], [21, 85, 4, 0.52], [42, 91, 7, 0.52]], 6, 1.055, 0.075);
  if (cf.bangs === 'under') lay([[-36, 93, -6, 0.5], [-18, 86, -3, 0.48], [0, 83, 0, 0.48], [18, 86, 3, 0.48], [36, 93, 6, 0.5]], 62, 1.035, 0.06);
  // 鬢髮：尾端收尖收圓
  const side = (pts, w, th, seg, out) => pre.push(chEdge(chRibbon(pts, { w: tipW(w, 0.5), th, seg, m: 8, out }), 8, plain, seam));
  for (const s of [-1, 1]) {
    if (cf.bangs === 'under') { side([chSph(1.04, 74, s * 50), chSph(1.05, 92, s * 54), chSph(1.05, 106, s * 57), chSph(1.04, 116, s * 58)], 0.3, 0.06, 14); continue; }
    if (cf.bangs === 'none') continue;
    const long = cf.female, sp = chSph(1.06, 106, s * 76);
    const pts = [chSph(1.05, 40, s * 60), chSph(1.06, 70, s * 71), chSph(1.06, 92, s * 75), sp];
    if (long) pts.push(chV(sp.x * 0.99, sp.y - 0.38, sp.z + 0.04), chV(sp.x * 0.95, sp.y - 0.7, sp.z + 0.08));
    else pts.push(chV(sp.x, sp.y - 0.12, sp.z + 0.02));
    side(pts, 0.44, 0.08, 24, p => chV(p.x, Math.max(p.y, 0), p.z + 0.7).normalize());
    if (long) {
      const sp2 = chSph(1.05, 104, s * 92);
      side([chSph(1.045, 45, s * 80), chSph(1.05, 80, s * 90), sp2, chV(sp2.x * 0.98, sp2.y - 0.45, sp2.z - 0.02)], 0.42, 0.07, 18, p => chV(p.x, Math.max(p.y, 0), p.z + 0.4).normalize());
    }
  }
  // 後腦外緣的髮束：輪廓不死板
  if (!hatted) for (const ph of [118, 140, 165, 195, 220, 242]) {
    const end = cf.female ? 118 : 104;
    g.push(chRibbon([chSph(1.04, 28, ph), chSph(1.055, 55, ph + 4), chSph(1.06, 85, ph + 6), chSph(1.04, end, ph + 7)], { w: t => 0.5 * (t < 0.7 ? 0.6 + t * 0.57 : (1 - t) / 0.3 + 0.1), th: 0.05, seg: 14 }));
  }
  g.forEach(x => chPaint(x, col)); list.forEach(x => chPaint(x, col));
  list.push(...pre);
  const add = [];
  const ball = (r, p, s = 1) => { const b = chTf(new THREE.SphereGeometry(r, 20, 14), p, [0, 0, 0], s); chPaint(b, chBallColor(cf.c.hair, hi, ...p)); add.push(b); };
  const tie = (r, tube, p, rot, color) => add.push(chPaint(chTf(new THREE.TorusGeometry(r, tube, 8, 20), p, rot), color));
  const pin = (p, rot, len, color, tip) => {
    add.push(chPaint(chTf(new THREE.CylinderGeometry(0.035, 0.03, len, 6), p, rot), color));
    if (tip) { const e = chV(0, len / 2, 0).applyEuler(new THREE.Euler(...rot)).add(chV(...p)); add.push(chPaint(chTf(new THREE.SphereGeometry(0.09, 10, 8), [e.x, e.y, e.z]), tip)); }
  };
  const flower = (p, color) => {
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; add.push(chPaint(chTf(new THREE.SphereGeometry(0.075, 8, 6), [p[0] + Math.cos(a) * 0.09, p[1] + Math.sin(a) * 0.09, p[2]]), color)); }
    add.push(chPaint(chTf(new THREE.SphereGeometry(0.06, 8, 6), [p[0], p[1], p[2] + 0.03]), '#e0b13c'));
  };
  switch (hatted ? 'none' : cf.hair) {
    case 'mulan':   // 高髻＋胭脂髮帶＋金簪（一端綠玉珠）＋小花
      ball(0.42, [0, 1.06, -0.24], [1.08, 0.82, 0.98]);
      tie(0.37, 0.07, [0, 0.9, -0.22], [Math.PI / 2 + 0.12, 0, 0], cf.c.sash);
      pin([0.05, 1.1, -0.2], [0, 0, 1.3], 1.25, '#d9b45a', '#5c8a6a');
      flower([-0.56, 0.95, -0.12], cf.c.sash);
      break;
    case 'low':     // 低圓髻＋木簪
      ball(0.44, [0, -0.02, -1.02], [1.1, 0.9, 0.8]);
      pin([0, 0.05, -1.05], [0, 0, 1.4], 1.2, '#8a5a3a', '#e0b13c');
      break;
    case 'double':  // 雙髻＋紅花簪
      for (const s of [-1, 1]) { ball(0.3, [s * 0.36, 1.02, -0.22]); tie(0.2, 0.05, [s * 0.34, 0.86, -0.2], [Math.PI / 2, 0, 0], cf.c.sash); }
      flower([0.58, 0.78, 0.1], '#c0392b'); flower([-0.6, 0.76, 0.08], '#e8a0b0');
      break;
    case 'knot':    // 男子頭頂小髻
      ball(0.27, [0, 1.02, -0.14], [1, 0.9, 1]);
      tie(0.2, 0.05, [0, 0.9, -0.12], [Math.PI / 2, 0, 0], cf.c.sash);
      pin([0, 1.04, -0.12], [0, 0, Math.PI / 2], 0.8, '#8a5a3a');
      break;
    case 'gaoji':   // 唐代高髻：頭頂兩團大髮髻往上堆、前方一朵花鈿、一支金釵
      ball(0.5, [0, 1.18, -0.12], [1.05, 0.9, 0.9]); ball(0.38, [0.12, 1.62, -0.06], [1, 0.95, 0.85]);
      tie(0.36, 0.06, [0, 0.98, -0.1], [Math.PI / 2 + 0.1, 0, 0], cf.c.sash);
      pin([0.1, 1.3, -0.05], [0, 0, 1.2], 1.3, '#d9b45a', '#e0b13c');
      flower([-0.38, 1.18, 0.32], '#e88aa0');
      break;
    case 'yaji':    // 雙丫髻：頭頂兩側各一個小髻＋紅頭繩
      for (const s of [-1, 1]) { ball(0.3, [s * 0.5, 0.98, -0.1]); tie(0.2, 0.055, [s * 0.46, 0.82, -0.08], [Math.PI / 2, 0, s * 0.35], cf.c.sash); }
      break;
    case 'kids':    // 總角
      for (const s of [-1, 1]) { ball(0.25, [s * 0.62, 0.8, -0.08]); tie(0.17, 0.05, [s * 0.58, 0.66, -0.06], [Math.PI / 2, 0, s * 0.4], cf.c.sash); }
      break;
  }
  if (cf.beard) {   // 鬍鬚：唇上兩撇＋下巴一把（白鬚較長）
    const bc = cf.beard, long = cf.beardLong ?? cf.beard !== '#2b2530', k = cf.beardS || 1;   // beardS：短鬚再縮（主角 Q 版不顯老）
    for (const s of [-1, 1]) add.push(chRibbon([chSph(1.04, 116, s * 3), chSph(1.05, 118, s * 18 * k), chSph(1.04, 124 - 4 * (1 - k), s * 30 * k)], { w: [0.12 * k, 0.03], th: 0.05, seg: 8, m: 4, out: p => p.clone().normalize(), col: bc }));
    add.push(chRibbon([chSph(1.03, 128, 0), chV(0, -0.95, 0.74), chV(0, long ? -1.3 : -0.95 - 0.17 * k, 0.64), chV(0, long ? -1.68 : -0.95 - 0.3 * k, 0.52)], { w: t => (long ? 0.55 : 0.35 * k) * (1 - t * 0.85), th: 0.12, seg: 12, out: () => chV(0, 0.2, 1).normalize(), col: bc }));
    if (cf.old) for (const s of [-1, 1]) add.push(chRibbon([chSph(1.04, 118, s * 42), chV(s * 0.5, -0.82, 0.74), chV(s * 0.36, -1.22, 0.62)], { w: [0.3, 0.05], th: 0.08, seg: 10, out: p => chV(p.x * 0.5, 0.1, 1).normalize(), col: bc }));
  }
  return chMerge([...list, ...g, ...add]);
}

// 帽：小冠（xiaoguan，戰國束髮小冠）、幅巾（kerchief）、綸巾（lunjin＝幅巾＋高起的巾頂）、襆頭（futou）、高冠（gaoguan）、小道冠（daoguan）
const CH_CROWN = ['gaoguan', 'daoguan', 'xiaoguan'];
function chHatGeo(cf) {
  const L = [];
  if (cf.hat === 'kerchief' || cf.hat === 'lunjin') {
    const kc = cf.c.kerchief;
    const kg = new THREE.SphereGeometry(1.075, 40, 14, 0, Math.PI * 2, 0, 68 * CH_D), kp = kg.attributes.position;
    for (let i = 0; i < kp.count; i++) { const x = kp.getX(i), y = kp.getY(i), z = kp.getZ(i), f = 1 + 0.025 * Math.sin(Math.atan2(x, z) * 7 + y * 3) * (1 - y); kp.setXYZ(i, x * f, y + (cf.kerchiefH || 0) * clamp((y - 0.45) / 0.6, 0, 1), z * f); }   // kerchiefH：葛巾頂往上鼓（陶淵明）
    kg.computeVertexNormals();
    L.push(chPaint(kg, (x, y) => chCol(kc, '#000', y < 0.47 ? 0.14 : 0)));
    L.push(chPaint(chTf(new THREE.SphereGeometry(0.22, 12, 10), [0, 0.5, -1.02], [0, 0, 0], [1.3, 0.8, 0.8]), chCol(kc, '#000', 0.08).getStyle()));
    for (const s of [-1, 1]) L.push(chRibbon([chV(s * 0.08, 0.5, -1.1), chV(s * 0.2, 0.2, -1.16), chV(s * 0.28, -0.25, -1.12), chV(s * 0.3, -0.55, -1.05)], { w: [0.2, 0.12], th: 0.04, seg: 8, m: 4, out: () => chV(0, 0, -1), col: kc }));
    if (cf.hat === 'lunjin') {   // 綸巾：頭頂往後高起一片方頂軟巾，前面一道巾邊
      const kd = chCol(kc, '#000', 0.2).getStyle();
      L.push(chPaint(chTf(new THREE.SphereGeometry(0.6, 16, 10), [0, 0.98, -0.25], [-0.25, 0, 0], [1.25, 0.85, 1.05]), (x, y) => chCol(kc, '#ffffff', y > 0.28 ? 0.08 : 0)));   // 巾頂：後方鼓起的方圓頂
      for (const s of [-1, 0, 1]) L.push(chPaint(chTf(new THREE.BoxGeometry(0.06, 0.5, 0.06), [s * 0.32, 1.08, -0.2], [-0.25, 0, s * -0.2]), kd));   // 巾頂的褶
      L.push(chPaint(chTf(new THREE.TorusGeometry(Math.sqrt(1.075 ** 2 - 0.45 ** 2), 0.045, 6, 40), [0, 0.45, 0], [Math.PI / 2, 0, 0]), kd));
    }
  } else if (cf.hat === 'futou') {   // 襆頭：深色軟巾包頭＋後頂高起的巾子＋腦後兩條垂腳
    const fc = '#2e2a2c', fd = chCol(fc, '#000', 0.25).getStyle();
    const hl = chCol(fc, '#8a8fa8', 0.35).getStyle();   // 黑紗的一點反光，帽形才讀得出來
    L.push(chPaint(new THREE.SphereGeometry(1.08, 36, 12, 0, Math.PI * 2, 0, 64 * CH_D), (x, y, z) => (z > 0.3 && y > 0.75 && x < -0.1 ? new THREE.Color(hl) : new THREE.Color(fc))));
    L.push(chPaint(chTf(new THREE.SphereGeometry(0.5, 18, 12), [0, 1.02, -0.2], [-0.35, 0, 0], [1.15, 1.2, 0.9]), (x, y) => (y > 1.25 ? new THREE.Color(hl) : new THREE.Color(fc))));   // 巾子：後頂高起
    L.push(chPaint(chTf(new THREE.TorusGeometry(Math.sqrt(1.08 ** 2 - 0.47 ** 2), 0.06, 6, 40), [0, 0.47, 0], [Math.PI / 2, 0, 0]), fd));
    for (const s of [-1, 1]) L.push(chRibbon([chV(s * 0.12, 0.55, -1.0), chV(s * 0.3, 0.3, -1.14), chV(s * 0.42, -0.2, -1.12), chV(s * 0.48, -0.75, -1.0)], { w: [0.22, 0.16], th: 0.04, seg: 10, m: 4, out: () => chV(0, 0, -1), col: fc }));   // 軟腳垂到肩後
  } else if (cf.hat === 'dongpo') {   // 東坡巾：內層方筒（頂部微收、壓矮）＋外層前後兩片淺一階的巾角（比內筒矮約 0.3，正面看得出階梯）＋巾角黑細邊；正面是「矮梯形疊在方筒前」的階梯剪影，不像高禮帽
    const hc = '#1d1b1d', oc = '#3e3a3c', hd = chCol(hc, '#000', 0.3).getStyle(), hl = chCol(hc, '#8a8fa8', 0.3).getStyle();
    L.push(chPaint(new THREE.SphereGeometry(1.075, 36, 12, 0, Math.PI * 2, 0, 66 * CH_D), (x, y, z) => (z > 0.3 && y > 0.7 && x < -0.1 ? new THREE.Color(hl) : new THREE.Color(hc))));
    // 內筒：四稜（轉 45° 成正面方形）、上窄下寬
    const tube = new THREE.CylinderGeometry(0.58, 0.72, 1.15, 4, 1).rotateY(Math.PI / 4);
    L.push(chPaint(chTf(tube, [0, 1.3, -0.05], [-0.06, 0, 0], [1, 1, 0.92]), (x, y) => (y > 1.72 ? new THREE.Color(hl) : new THREE.Color(hc))));
    L.push(chPaint(chTf(new THREE.BoxGeometry(0.86, 0.05, 0.78), [0, 1.87, -0.08], [-0.06, 0, 0]), hd));   // 頂面一道深色收邊
    // 外層巾角：前後兩片梯形，比內筒矮，往外斜開一點
    for (const sd of [1, -1]) {
      const sh = new THREE.Shape(); sh.moveTo(-0.78, 0); sh.lineTo(0.78, 0); sh.lineTo(0.64, 0.86); sh.lineTo(0, 0.98); sh.lineTo(-0.64, 0.86); sh.closePath();
      const fg = new THREE.ExtrudeGeometry(sh, { depth: 0.06, bevelEnabled: false }).translate(0, 0, -0.03);
      L.push(chPaint(chTf(fg, [0, 0.62, sd * 0.86 - 0.04], [-sd * 0.16, sd > 0 ? 0 : Math.PI, 0]), oc));
      // 黑細邊：同形放大一圈、墊在巾角內側，toon 光下才分得出兩層
      const eg = new THREE.ExtrudeGeometry(sh, { depth: 0.04, bevelEnabled: false }).translate(0, -0.6, -0.06).scale(1.04, 1.04, 1).translate(0, 0.6 - 0.025, 0);
      L.push(chPaint(chTf(eg, [0, 0.62, sd * 0.86 - 0.04], [-sd * 0.16, sd > 0 ? 0 : Math.PI, 0]), '#121012'));
    }
    L.push(chPaint(chTf(new THREE.TorusGeometry(Math.sqrt(1.075 ** 2 - 0.42 ** 2), 0.05, 6, 40), [0, 0.42, 0], [Math.PI / 2, 0, 0]), hd));
  } else if (cf.hat === 'douli') {   // 斗笠：竹編寬錐、笠頂一點尖、內側一圈帽箍、兩條繫帶
    const hc = cf.c.hat, hd = chCol(hc, '#5a4636', 0.35);
    L.push(chPaint(chTf(new THREE.ConeGeometry(1.75, 0.75, 32, 3), [0, 1.08, 0]), (x, y, z) => (y < -0.36 ? hd : Math.round(Math.atan2(x, z) * 10) % 2 ? new THREE.Color(hc) : chCol(hc, '#fff', 0.15))));   // 笠面竹篾＋笠底
    L.push(chPaint(chTf(new THREE.SphereGeometry(0.1, 8, 6), [0, 1.48, 0]), hd));
    L.push(chPaint(chTf(new THREE.TorusGeometry(0.86, 0.06, 6, 32), [0, 0.72, 0], [Math.PI / 2, 0, 0]), hd));
    for (const s of [-1, 1]) L.push(chRibbon([chV(s * 0.86, 0.72, 0.1), chV(s * 0.88, 0.1, 0.35), chV(s * 0.5, -0.6, 0.6)], { w: [0.06, 0.05], th: 0.02, seg: 8, m: 3, out: () => chV(s, 0, 0.3).normalize(), col: '#6b5a48' }));
  } else if (cf.hat === 'gaoguan') {   // 高冠：黑色高冠罩住頭頂髻，冠梁前高後低，一支橫簪
    const hc = cf.c.crown, hd = chCol(hc, '#000', 0.3).getStyle();
    L.push(chPaint(chTf(new THREE.CylinderGeometry(0.34, 0.42, 0.95, 20), [0, 1.3, -0.12], [-0.22, 0, 0], [1, 1, 0.78]), hc));
    L.push(chPaint(chTf(new THREE.CylinderGeometry(0.36, 0.36, 0.06, 20), [0, 1.78, -0.23], [-0.22, 0, 0], [1, 1, 0.78]), hd));
    L.push(chPaint(chTf(new THREE.TorusGeometry(0.44, 0.05, 6, 24), [0, 0.88, -0.03], [Math.PI / 2 - 0.22, 0, 0], [1, 0.8, 1]), hd));
    L.push(chPaint(chTf(new THREE.CylinderGeometry(0.035, 0.035, 1.25, 6), [0, 1.08, -0.08], [0, 0, Math.PI / 2]), '#e0b13c'));
  } else if (cf.hat === 'xiaoguan') {   // 戰國小冠：罩住頭頂髮髻的黑漆小冠＋前後一道冠梁＋橫笄＋兩條冠纓垂到下巴
    const hc = cf.c.crown, hd = chCol(hc, '#000', 0.35).getStyle(), hl = chCol(hc, '#8a8fa8', 0.3).getStyle();
    L.push(chPaint(chTf(new THREE.CylinderGeometry(0.27, 0.33, 0.36, 20), [0, 1.1, -0.12], [-0.12, 0, 0], [1, 1, 0.86]), (x, y) => new THREE.Color(y > 1.22 ? hl : hc)));
    L.push(chPaint(chTf(new THREE.TorusGeometry(0.17, 0.06, 6, 20, Math.PI), [0, 1.27, -0.14], [0, Math.PI / 2, 0], [1, 0.9, 1]), hc));   // 冠梁：前後拱起
    L.push(chPaint(chTf(new THREE.TorusGeometry(0.34, 0.035, 6, 24), [0, 0.93, -0.1], [Math.PI / 2 - 0.12, 0, 0], [1, 0.86, 1]), hd));
    L.push(chPaint(chTf(new THREE.CylinderGeometry(0.03, 0.03, 0.95, 6), [0, 1.1, -0.1], [0, 0, Math.PI / 2]), '#d9c9a0'));          // 橫笄
    for (const s of [-1, 1]) L.push(chRibbon([chV(s * 0.3, 0.94, -0.04), chV(s * 0.78, 0.4, 0.3), chV(s * 0.66, -0.3, 0.62), chV(s * 0.3, -0.72, 0.72)], { w: [0.05, 0.04], th: 0.015, seg: 10, m: 3, out: p => chV(p.x, 0, p.z).normalize(), col: hd }));
  } else if (cf.hat === 'daoguan') {   // 小道冠：髻上一頂木色小冠＋橫簪
    const hc = cf.c.crown;
    L.push(chPaint(chTf(new THREE.CylinderGeometry(0.28, 0.2, 0.3, 14), [0, 1.2, -0.14]), hc));
    L.push(chPaint(chTf(new THREE.SphereGeometry(0.1, 10, 8), [0, 1.38, -0.12]), '#e0b13c'));
    L.push(chPaint(chTf(new THREE.CylinderGeometry(0.03, 0.03, 0.9, 6), [0, 1.18, -0.1], [0, 0, Math.PI / 2]), '#d9cdb0'));
  }
  return L.length ? chMerge(L) : null;
}

// ---------- 組裝 ----------
function chBuildBody(cf, key, R) {
  const vc = CM('#ffffff', { vertexColors: true });
  const add = (parent, geo, mat, pos) => {
    const m = geo.isMesh ? geo : new THREE.Mesh(geo, mat);
    if (pos) m.position.set(...pos);
    m.castShadow = true; m.userData.outfit = key;
    parent.add(m); R.parts[key].push(m); return m;
  };
  const C = cf.c, trim = C.trim;
  // 頭髮、帽子
  add(R.skull, chHairGeo(cf), vc);
  const hat = chHatGeo(cf);
  if (hat) add(R.skull, hat, vc);

  // 上身＋交領右衽：外襟從穿者左肩（+x）斜下到右腰，內襟一小段，後領一圈
  const T = CH_TORSO;
  add(R.torso, chLathe(T, 28), CM(C.top));
  const lap = (a0, a1, y0, y1, r0) => {
    const pts = [];
    for (let i = 0; i <= 5; i++) { const t = i / 5, y = lerp(y0, y1, t), an = lerp(a0, a1, Math.pow(t, 0.8)) * CH_D, r = chProfR(T, y) + r0; pts.push(chV(r * Math.sin(an), y, r * Math.cos(an))); }
    return pts;
  };
  const radial = p => chV(p.x, 0.15, p.z).normalize();
  const yb = cf.cloth === 'ru' ? 0.37 : 0.27;
  if (cf.collar === 'round') {   // 圓領袍：領口一圈圓領＋右肩一顆紐扣
    const rr = chProfR(T, 0.49) + 0.012;
    add(R.torso, chMerge([chPaint(chTf(new THREE.TorusGeometry(rr, 0.022, 8, 32), [0, 0.49, 0], [Math.PI / 2 + 0.08, 0, 0]), trim),
      chPaint(chTf(new THREE.SphereGeometry(0.016, 8, 6), [-rr * 0.72, 0.485, rr * 0.7]), C.plate || trim)]), vc);
  } else {
    const col = [
      chRibbon(lap(-24, 6, 0.506, 0.44, 0.004), { w: [0.034, 0.03], th: 0.012, seg: 8, m: 4, out: radial, col: trim }),
      chRibbon(lap(24, -50, 0.506, yb, 0.009), { w: [0.036, 0.034], th: 0.013, seg: 12, m: 4, out: radial, col: trim })
    ];
    const back = [];
    for (let i = 0; i <= 8; i++) { const an = lerp(24, 336, i / 8) * CH_D, r = chProfR(T, 0.506) + 0.008; back.push(chV(r * Math.sin(an), 0.506 + Math.sin(i / 8 * Math.PI) * 0.01, r * Math.cos(an))); }
    col.push(chRibbon(back, { w: [0.032, 0.032], th: 0.012, seg: 16, m: 4, out: radial, col: trim }));
    add(R.torso, chMerge(col), vc);
  }

  // 下身：裙（褶＋下襬滾邊＋腰帶垂帶）／衣襬／長袍
  if (cf.cloth === 'ru') {
    const sk = chLathe(CH_SKIRT, 72), p = sk.attributes.position, N = 16;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      if (Math.hypot(x, z) < 0.02) continue;
      const h = clamp((0.36 - y) / 0.34, 0, 1), f = 1 + 0.055 * h * (0.5 + 0.5 * Math.cos(N * Math.atan2(x, z)));
      p.setX(i, x * f); p.setZ(i, z * f);
    }
    sk.computeVertexNormals();
    const B = new THREE.Color(C.bottom), D = chCol(C.bottom, '#1e2a24', 0.35), Tm = new THREE.Color(trim), cc = new THREE.Color();
    chPaint(sk, (x, y, z) => (y < 0.058 ? Tm : cc.copy(B).lerp(D, (0.5 - 0.5 * Math.cos(N * Math.atan2(x, z))) * clamp((0.36 - y) / 0.34, 0, 1) * 0.55)));
    add(R.lower, sk, vc);
    const sash = [chPaint(chTf(new THREE.TorusGeometry(0.172, 0.02, 8, 36), [0, 0.352, 0], [Math.PI / 2, 0, 0]), C.sash)];
    for (const s of [-1, 1]) sash.push(chPaint(chTf(new THREE.TorusGeometry(0.03, 0.012, 6, 12), [s * 0.035, 0.355, 0.188], [0, s * 0.5, s * 0.5]), C.sash));
    sash.push(chPaint(chTf(new THREE.SphereGeometry(0.018, 8, 6), [0, 0.352, 0.192]), chCol(C.sash, '#000', 0.15).getStyle()));
    add(R.lower, chMerge(sash), vc);
    const tails = [];
    for (const s of [-1, 1]) {
      const pts = [];
      for (let i = 0; i <= 4; i++) { const y = lerp(0.345, 0.11, i / 4), r = chProfR(CH_SKIRT, y) * 1.06 + 0.012; pts.push(chV(s * (0.02 + i * 0.006), y - 0.345, Math.sqrt(Math.max(0, r * r - 0.0009)) - 0.19)); }
      tails.push(chRibbon(pts, { w: [0.034, 0.042], th: 0.008, seg: 10, m: 4, out: () => chV(0, 0, 1), col: (x, y) => new THREE.Color(y < -0.2 ? trim : C.sash) }));
    }
    R.tails = add(R.lower, chMerge(tails), vc, [0, 0.345, 0.19]);
  } else if (cf.cloth === 'robe') {
    const Tm = new THREE.Color(trim), B = new THREE.Color(C.bottom);
    add(R.lower, chPaint(chLathe(CH_ROBE, 36), (x, y) => (y < 0.055 ? Tm : B)), vc);
    const belt = [chPaint(chTf(new THREE.TorusGeometry(0.168, cf.daidai ? 0.03 : 0.02, 8, 36), [0, 0.3, 0], [Math.PI / 2, 0, 0], [1, 1, cf.daidai ? 1.5 : 1]), C.sash)];
    if (C.plate) for (let i = -3; i <= 3; i++) { const an = i * 26 * CH_D; belt.push(chPaint(chTf(new THREE.BoxGeometry(0.03, 0.028, 0.012), [0.178 * Math.sin(an), 0.3, 0.178 * Math.cos(an)], [0, an, 0]), C.plate)); }   // 革帶上的金銙
    if (C.panel) belt.push(chPaint(chTf(new THREE.BoxGeometry(0.15, 0.24, 0.012), [0, 0.18, 0.205], [-0.2, 0, 0]), (x, y) => new THREE.Color(Math.abs(x) > 0.06 || y < 0.075 ? C.sash : C.panel)));
    add(R.lower, chMerge(belt), vc);
  } else {
    const Tm = new THREE.Color(trim), B = new THREE.Color(C.top);
    const hem = CH_HEM;
    add(R.lower, chPaint(chLathe(hem, 32), (x, y) => (y < hem[1][1] + 0.022 ? Tm : B)), vc);
    const belt = [chPaint(chTf(new THREE.TorusGeometry(0.163, 0.019, 8, 36), [0, 0.27, 0], [Math.PI / 2, 0, 0]), C.sash),
      chPaint(chTf(new THREE.BoxGeometry(0.05, 0.04, 0.02), [0, 0.27, 0.178]), '#c9a75a')];
    for (const s of [-1, 1]) belt.push(chRibbon([chV(s * 0.05, 0.262, 0.176), chV(s * 0.06, 0.2, 0.19), chV(s * 0.065, 0.15, 0.2)], { w: [0.022, 0.02], th: 0.006, seg: 6, m: 3, out: () => chV(0, 0, 1), col: C.sash }));
    add(R.lower, chMerge(belt), vc);
  }
  // 皮甲（守城兵）：胸腹一圈甲片（橫排甲札、深色編繩），只到腰
  if (cf.armor) {
    const A = chLathe(T.filter(p => p[1] <= 0.47).map(([r, y]) => [r ? r + 0.018 : r, y]).concat([[0.001, 0.47]]), 24), ac = new THREE.Color(C.armor), ad = chCol(C.armor, '#000', 0.35), cc = new THREE.Color();
    chPaint(A, (x, y, z) => cc.copy(Math.abs(((y - 0.2) * 22) % 1) < 0.16 || Math.abs((Math.atan2(x, z) * 5) % 1) < 0.08 ? ad : ac));
    add(R.torso, A, vc);
  }
  if (cf.daidai) {   // 大帶：腰間寬帶在前方打結、兩條帶尾（紳）垂到膝下
    const tails = [];
    for (const s of [-1, 1]) tails.push(chRibbon([chV(s * 0.03, 0.3, 0.19), chV(s * 0.05, 0.2, 0.215), chV(s * 0.06, 0.1, 0.225), chV(s * 0.065, 0.04, 0.215)], { w: [0.045, 0.04], th: 0.008, seg: 8, m: 3, out: () => chV(0, 0, 1), col: C.sash }));
    tails.push(chPaint(chTf(new THREE.SphereGeometry(0.03, 8, 6), [0, 0.302, 0.19], [0, 0, 0], [1.4, 1, 0.7]), C.sash));
    add(R.lower, chMerge(tails), vc);
  }
  // 手臂：袖子（袖口滾邊）
  const wide = cf.sleeve === 'wide';
  const sl = wide ? [[0.001, 0.022], [0.056, 0.016], [0.066, -0.03], [0.082, -0.12], [0.092, -0.16], [0.093, -0.17], [0.097, -0.178], [0.092, -0.196], [0.001, -0.192]]
    : [[0.001, 0.022], [0.05, 0.016], [0.058, -0.02], [0.053, -0.12], [0.0515, -0.15], [0.051, -0.16], [0.05, -0.172], [0.047, -0.186], [0.001, -0.187]];
  for (const s of [-1, 1]) {
    const arm = s > 0 ? R.armL : R.armR, B = new THREE.Color(C.top), Tm = new THREE.Color(trim);
    add(arm, chPaint(chLathe(sl, 18), (x, y) => (y < (wide ? -0.165 : -0.155) ? Tm : B)), vc);
  }
  // 披帛：從左腰繞過背後兩肩、垂到右腰下，兩端飄著
  if (cf.shawl) add(R.torso, chRibbon([chV(0.2, 0.18, 0.08), chV(0.19, 0.38, 0.0), chV(0.12, 0.5, -0.12), chV(-0.12, 0.5, -0.12), chV(-0.19, 0.38, 0.0), chV(-0.22, 0.2, 0.07), chV(-0.24, 0.04, 0.1)],
    { w: [0.07, 0.06], th: 0.008, seg: 30, m: 4, out: p => chV(p.x, 0.4, p.z + 0.02).normalize(), col: C.shawl }), vc);
  // 腿：袴（膝下縛帶）＋靴；或裙下露出的鞋尖
  for (const s of [-1, 1]) {
    const leg = s > 0 ? R.legL : R.legR;
    if (cf.cloth === 'kuzhe') {
      const Pc = new THREE.Color(C.pants), Tc = chCol(C.pants, '#000', 0.3);
      const Sk = new THREE.Color(C.skin);   // rolled：褲管捲到膝上，小腿露出
      add(leg, chPaint(chLathe([[0.001, 0.0], [0.058, 0.0], [0.066, -0.05], [0.07, -0.11], [0.058, -0.14], [0.001, -0.146]], 16), cf.rolled ? (x, y) => (y < -0.085 ? Sk : y < -0.065 ? Tc : Pc) : (x, y) => (y < -0.115 && y > -0.135 ? Tc : Pc)), vc);
      if (cf.rolled) add(leg, chPaint(chTf(new THREE.TorusGeometry(0.064, 0.012, 6, 16), [0, -0.075, 0], [Math.PI / 2, 0, 0]), Pc.getStyle()), vc);
      add(leg, new THREE.SphereGeometry(1, 14, 10).scale(0.05, 0.042, 0.072), CM(C.shoe), [0, -0.158, 0.022]);
    } else {
      add(leg, new THREE.SphereGeometry(1, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55).scale(0.048, 0.045, 0.072), CM(C.shoe), [0, -0.188, cf.cloth === 'robe' ? 0.185 : 0.18]);
    }
  }
}

function lpChibi(spec = {}) {
  const who = spec.who || 'mengzi', seed = spec.seed || 0;
  const cf0 = chConfig(who, 'dress', seed, spec.colors), sc = spec.scale || 1;
  const root = new THREE.Group(); root.name = 'chibi-' + who;
  const ksc = sc * (cf0.child ? 0.82 : 1);   // 孩童小一號
  const rig = new THREE.Group(); rig.scale.setScalar(ksc); root.add(rig);
  const R = { parts: { dress: [] }, props: {} };
  // 骨架：lower（裙、衣襬，不隨鞠躬傾斜）、pivot（髖）→ torso → head → skull（扁球縮放）、armL／armR（肩）、legL／legR（髖）
  R.lower = new THREE.Group(); rig.add(R.lower);
  R.pivot = new THREE.Group(); R.pivot.position.y = CH_HIP; rig.add(R.pivot);
  R.torso = new THREE.Group(); R.torso.position.y = -CH_HIP; R.pivot.add(R.torso);
  R.head = new THREE.Group(); R.head.position.y = CH_NECK; R.torso.add(R.head);
  R.skull = new THREE.Group(); R.skull.position.y = 0.24; R.skull.scale.set(...CH_SKULL); R.head.add(R.skull);
  R.armL = new THREE.Group(); R.armL.position.set(0.128, 0.455, 0); R.torso.add(R.armL);
  R.armR = new THREE.Group(); R.armR.position.set(-0.128, 0.455, 0); R.torso.add(R.armR);
  R.legL = new THREE.Group(); R.legL.position.set(0.07, CH_HIP, 0); rig.add(R.legL);
  R.legR = new THREE.Group(); R.legR.position.set(-0.07, CH_HIP, 0); rig.add(R.legR);
  // 共用：頭、臉、手
  const skin = cf0.c.skin;
  const headM = new THREE.Mesh(chHeadShape(new THREE.SphereGeometry(1, 48, 32)), CM(skin)); headM.castShadow = true; R.skull.add(headM);
  const faceM = new THREE.Mesh(chHeadShape(new THREE.SphereGeometry(1.012, 40, 26, 35 * CH_D, 110 * CH_D, 60 * CH_D, 70 * CH_D)), new THREE.MeshBasicMaterial({ visible: false }));
  faceM.name = 'face'; faceM.renderOrder = 1; R.skull.add(faceM);
  for (const arm of [R.armL, R.armR]) { const h = new THREE.Mesh(new THREE.SphereGeometry(0.043, 14, 10), CM(skin)); h.position.y = -0.21; h.castShadow = true; arm.add(h); arm.userData.hand = h; }
  chBuildBody(cf0, 'dress', R);
  if (cf0.plump) { R.torso.scale.set(cf0.plump, 1, cf0.plump); R.lower.scale.set(cf0.plump, 1, cf0.plump); R.head.scale.set(1 / cf0.plump, 1, 1 / cf0.plump); }   // 豐腴：身體加寬，頭不變

  const st = { pose: spec.pose || cf0.pose, face: spec.face || cf0.face, blink: false, phase: mulberry32((seed | 0) + who.length * 17)() * 10 };
  const vcMesh = g => { const m = new THREE.Mesh(g, CM('#ffffff', { vertexColors: true })); m.castShadow = true; return m; };
  // 小道具：用到才建。up＝道具保持直立（抵銷手臂前抬的角度）；hand＝掛在哪隻手
  const inkLines = (x, y, z) => new THREE.Color(Math.abs(((x + 1) * 70) % 1) < 0.12 ? '#9a8452' : Math.abs(x) < 0.12 && Math.round(z * 160) % 3 === 0 ? '#3a3330' : '#e2d2a0');   // 攤開的竹簡：直條竹片＋墨字
  const PROPS = {
    scroll: { hand: 'L', up: true, make: () => chMerge([chPaint(new THREE.CylinderGeometry(0.03, 0.03, 0.22, 12).translate(0, 0.07, 0.035), (x, y) => new THREE.Color(Math.abs(y - 0.07) < 0.012 ? '#c0392b' : '#efe2c4')),   // 直握一卷書，中間一道朱繩
      chPaint(new THREE.CylinderGeometry(0.034, 0.034, 0.014, 12).translate(0, 0.18, 0.035), '#8a5a3a'), chPaint(new THREE.CylinderGeometry(0.034, 0.034, 0.014, 12).translate(0, -0.04, 0.035), '#8a5a3a')]) },
    paper: { hand: 'L', up: true, make: () => chMerge([chPaint(new THREE.BoxGeometry(0.13, 0.17, 0.006, 4, 24, 1).translate(0, 0.07, 0.02), (x, y) => new THREE.Color(Math.abs(x) < 0.05 && ((y * 60) | 0) % 2 && Math.abs(y - 0.07) < 0.07 ? '#5a504a' : '#f6efe0'))]) },
    basket: { hand: 'L', up: true, make: () => { const W = new THREE.Color('#c9a96a'), Wd = new THREE.Color('#9c7c48');
      const body = chPaint(new THREE.CylinderGeometry(0.1, 0.075, 0.1, 16, 3, true).translate(0, -0.11, 0.02), (x, y, z) => ((Math.round(Math.atan2(x, z - 0.02) * 8) + Math.round(y * 60)) % 2 ? W : Wd));
      const bot = chPaint(new THREE.CircleGeometry(0.075, 16).rotateX(Math.PI / 2).translate(0, -0.16, 0.02), Wd.getStyle());
      const rim = chPaint(new THREE.TorusGeometry(0.1, 0.01, 6, 20).rotateX(Math.PI / 2).translate(0, -0.06, 0.02), Wd.getStyle());
      const handle = chPaint(new THREE.TorusGeometry(0.095, 0.009, 6, 16, Math.PI).translate(0, -0.06, 0.02), Wd.getStyle());
      const mums = [[0.03, 0.03], [-0.04, 0.0], [0.0, -0.04], [0.045, -0.035]].map(([x, z]) => chPaint(new THREE.SphereGeometry(0.035, 8, 6).scale(1, 0.6, 1).translate(x, -0.055, 0.02 + z), '#e8b830'));
      return chMerge([body, bot, rim, handle, ...mums]); } },
    brush: { hand: 'R', up: true, make: () => chMerge([chPaint(new THREE.CylinderGeometry(0.008, 0.008, 0.15, 6).translate(0, 0.05, 0), '#8a5a3a'), chPaint(new THREE.ConeGeometry(0.014, 0.04, 8).rotateZ(Math.PI).translate(0, -0.04, 0), '#1f1b19')]) },
    // 竹簡一卷：一捆竹片捲起（直條紋）、兩道編繩
    slips: { hand: 'L', up: true, make: () => chMerge([chPaint(new THREE.CylinderGeometry(0.045, 0.045, 0.2, 16).translate(0, 0.06, 0.04), (x, y, z) => new THREE.Color(Math.abs(y - 0.0) < 0.008 || Math.abs(y - 0.12) < 0.008 ? '#6b4a2e' : Math.round(Math.atan2(x, z - 0.04) * 4.5) % 2 ? '#d8c58e' : '#c2ad74'))]) },
    // 耒耜：木柄斜插地面、下端橫木踏腳、兩根木齒入土；掛在身體前方（不跟手臂轉）
    plough: { hand: 'B', pos: [0.02, 0, 0.3], make: () => chMerge([chPaint(chTf(new THREE.CylinderGeometry(0.016, 0.02, 0.62, 6), [0, 0.32, 0.03], [-0.18, 0, 0]), '#8a6a44'),
      chPaint(chTf(new THREE.CylinderGeometry(0.014, 0.014, 0.2, 6), [0, 0.6, -0.02], [0, 0, Math.PI / 2]), '#8a6a44'),
      chPaint(chTf(new THREE.CylinderGeometry(0.012, 0.012, 0.14, 6), [0, 0.08, 0.1], [0, 0, Math.PI / 2]), '#7a5a38'),
      ...[-1, 1].map(k => chPaint(chTf(new THREE.ConeGeometry(0.014, 0.12, 5), [k * 0.03, 0.062, 0.12], [Math.PI, 0, 0]), '#6b4a2e'))]) },
    // 夯杵：粗木杵直立在身前，下端粗圓、上段兩側把手
    pestle: { hand: 'B', pos: [0, 0.04, 0.24], make: () => chMerge([chPaint(new THREE.CylinderGeometry(0.02, 0.02, 0.62, 8).translate(0, 0.36, 0), '#9a7a50'),
      chPaint(new THREE.CylinderGeometry(0.055, 0.06, 0.12, 12).translate(0, 0.06, 0), '#7a5a38'), chPaint(chTf(new THREE.CylinderGeometry(0.012, 0.012, 0.2, 6), [0, 0.5, 0], [0, 0, Math.PI / 2]), '#7a5a38')]) },
    // 魚簍：竹編窄口簍，口上露兩條魚尾
    fishbasket: { hand: 'L', up: true, make: () => { const W = new THREE.Color('#b89a5e'), Wd = new THREE.Color('#8a6c3e');
      return chMerge([chPaint(chLathe([[0.001, -0.17], [0.06, -0.17], [0.085, -0.12], [0.08, -0.07], [0.055, -0.045], [0.001, -0.045]], 14).translate(0, 0, 0.02), (x, y, z) => ((Math.round(Math.atan2(x, z - 0.02) * 6) + Math.round(y * 50)) % 2 ? W : Wd)),
        chPaint(new THREE.TorusGeometry(0.06, 0.008, 6, 14, Math.PI).translate(0, -0.05, 0.02), Wd.getStyle()),
        ...[[-0.02, 0.4], [0.025, -0.3]].map(([x, r]) => chPaint(chTf(new THREE.ConeGeometry(0.03, 0.07, 4), [x, -0.02, 0.02], [0, 0, r], [1, 1, 0.3]), '#7a8a90'))]); } },
    // 木枷：頸上一塊方木板（中間套頸），兩手在板下
    cangue: { hand: 'N', make: () => chMerge([chPaint(new THREE.BoxGeometry(0.44, 0.04, 0.26), '#9a7a50'), chPaint(new THREE.BoxGeometry(0.44, 0.012, 0.012).translate(0, 0.024, 0), '#6b4a2e')]) },
    // 戈：長木柲直立、頂端橫出青銅戈頭（朝前）
    ge: { hand: 'R', up: true, make: () => chMerge([chPaint(new THREE.CylinderGeometry(0.012, 0.012, 1.2, 6).translate(0, 0.34, 0.0), '#6b4a2e'),
      chPaint(chTf(new THREE.BoxGeometry(0.02, 0.035, 0.2), [0, 0.8, 0.09], [0.15, 0, 0]), '#8a8a6a'), chPaint(new THREE.ConeGeometry(0.018, 0.05, 6).translate(0, 0.9, 0), '#8a8a6a')]) },
    // 竹篙：長竹竿從胸前斜向後下方伸進水裡（竹節一圈深色）；掛在身體上，scene／anim 讓它前後擺
    pole: { hand: 'B', pos: [0.06, 0.42, 0.16], make: () => chPaint(chTf(new THREE.CylinderGeometry(0.014, 0.016, 2.6, 6, 13), [0, -0.95, -0.55], [-0.52, 0, 0]), (x, y) => new THREE.Color(Math.abs(((y + 3) * 5) % 1) < 0.08 ? '#6f7a3e' : '#a8a860')) },
    // 羊皮：搭在左前臂上的一張捲邊羊皮
    sheepskin: { hand: 'L', up: true, make: () => { const g = new THREE.SphereGeometry(1, 14, 10).scale(0.12, 0.13, 0.035), p = g.attributes.position;
      for (let i = 0; i < p.count; i++) p.setZ(i, p.getZ(i) + 0.04 * Math.sin(p.getY(i) * 30) * 0.4);
      g.computeVertexNormals(); return chMerge([chPaint(g.translate(0, -0.05, 0.06), (x, y) => new THREE.Color(Math.sin(x * 90) * Math.sin(y * 80) > 0.5 ? '#d9cdb4' : '#ece4d0'))]); } },
    book: { hand: 'T', make: () => { const sheet = chPaint(new THREE.BoxGeometry(0.3, 0.006, 0.15, 30, 1, 6), inkLines);
      return chMerge([sheet, chPaint(new THREE.CylinderGeometry(0.018, 0.018, 0.17, 10).rotateX(Math.PI / 2).translate(-0.155, 0, 0), '#8a5a3a'), chPaint(new THREE.CylinderGeometry(0.018, 0.018, 0.17, 10).rotateX(Math.PI / 2).translate(0.155, 0, 0), '#8a5a3a')]); } }
  };
  function prop(k) {
    if (R.props[k]) return R.props[k];
    const d = PROPS[k], m = vcMesh(d.make());
    if (d.hand === 'T') { m.position.set(0, 0.34, 0.24); m.rotation.x = 0.75; R.torso.add(m); }   // 捧在胸前、往臉斜
    else if (d.hand === 'B') { m.position.set(...d.pos); rig.add(m); m.userData.base = d.pos.slice(); }   // 長道具掛在身體上，不跟手臂轉
    else if (d.hand === 'N') { m.position.set(0, 0.47, 0.02); R.torso.add(m); }   // 木枷套在頸上
    else { m.position.y = -0.2; (d.hand === 'L' ? R.armL : R.armR).add(m); }
    m.userData.up = !!d.up; m.userData.prop = k; return (R.props[k] = m);
  }
  const tagNew = () => { const pk = root.userData.pick; if (pk) root.traverse(o => { if (o.isMesh) o.userData.pick = pk; }); };

  // 姿勢：臂 [x, z]（x 負＝往前抬；左臂 z 正＝外張、右臂 z 負＝外張）；leg＝坐姿
  const POSES = {
    stand: { L: [0.04, 0.24], R: [0.04, -0.24] },
    walk: { L: [0, 0.2], R: [0, -0.2] },
    sit: { L: [-0.75, 0.15], R: [-0.75, -0.15], leg: [-1.35, 0.42] },
    wave: { L: [0.04, 0.24], R: [0, -2.55] },
    point: { L: [0.04, 0.24], R: [-1.45, -0.18] },
    bow: { L: [-1.25, -0.5], R: [-1.25, 0.5], lean: 0.12, nod: 0.1 },   // 拱手
    surprised: { L: [-0.35, 1.15], R: [-0.35, -1.15] },
    hold: { L: [-0.85, -0.3], R: [-0.85, 0.3] },
    read: { L: [-1.05, -0.25], R: [-1.05, 0.25], nod: 0.16 },
    write: { L: [-0.75, -0.05], R: [-1.0, 0.12], leg: [-1.35, 0.42], lean: 0.08, nod: 0.18 },
    basket: { L: [0.02, 0.3], R: [0.04, -0.24] },                         // 左手提竹籃
    pick: { L: [0.04, 0.24], R: [-1.2, -0.12], lean: 0.16, nod: 0.18 },   // 右手往前下方摘花
    reach: { L: [-0.3, 0.35], R: [-2.0, -0.12], nod: -0.12 },              // 右手往前上方伸
    plough: { L: [-0.95, -0.12], R: [-0.95, 0.12], lean: 0.2, nod: 0.12 },   // 雙手往前下方扶耒、身體前傾
    tamp: { L: [-1.35, -0.32], R: [-1.35, 0.32], nod: 0.06 },               // 雙手握夯杵上段
    carry: { L: [-2.7, 0.32], R: [-2.7, -0.32], lean: -0.04 },               // 雙手上舉托肩上重物
    bound: { L: [-0.75, -0.45], R: [-0.75, 0.45], nod: 0.14 },               // 雙手在木枷下
    talk: { L: [0.04, 0.24], R: [-0.95, -0.35], nod: -0.04 },                // 右手前伸比手勢
    spear: { L: [0.04, 0.24], R: [-0.45, -0.1] },                            // 右手持戈直立
    pole: { L: [-1.0, -0.1], R: [-0.75, 0.2], lean: 0.12 }                   // 雙手握篙、身體前傾使力
  };
  const POSE_PROP = { read: 'book', write: 'brush', basket: cf0.prop === 'fishbasket' || cf0.prop === 'sheepskin' ? cf0.prop : 'basket', bow: null, reach: null, carry: null,
    plough: 'plough', tamp: 'pestle', spear: 'ge', pole: 'pole', bound: 'cangue', talk: cf0.prop === 'slips' ? 'slips' : null };
  function applyPose() {
    const P = POSES[st.pose] || POSES.stand, lg = P.leg || [0, 0], spread = cf0.cloth === 'kuzhe' ? 1 : 0.2;
    R.armL.rotation.set(P.L[0], 0, P.L[1]); R.armR.rotation.set(P.R[0], 0, P.R[1]);
    R.legL.rotation.set(lg[0] * (spread < 1 ? 0.4 : 1), 0, lg[1] * spread); R.legR.rotation.set(lg[0] * (spread < 1 ? 0.4 : 1), 0, -lg[1] * spread);
    R.pivot.rotation.x = P.lean || 0; R.head.rotation.x = P.nod || 0;
    const show = st.pose in POSE_PROP ? POSE_PROP[st.pose] : cf0.prop;
    if ((st.pose === 'stand' || st.pose === 'talk') && (show === 'scroll' || show === 'paper' || show === 'slips')) R.armL.rotation.set(-0.95, 0, -0.12);   // 站著時把書卷／詩稿捧在胸前，正面看得到
    for (const k of new Set([show, ...Object.keys(R.props)])) if (k) prop(k).visible = k === show;
    st.base = { L: R.armL.rotation.clone(), R: R.armR.rotation.clone(), lean: R.pivot.rotation.x };
    rig.position.y = 0;
    upright();
    tagNew();
  }
  function upright() { for (const k in R.props) { const m = R.props[k]; if (m.userData.up) m.rotation.x = -m.parent.rotation.x; } }
  function applyFace() {
    const m = chFaceMat(cf0.fs, st.face, st.blink);
    if (m) { faceM.material = m; faceM.visible = true; } else faceM.visible = false;
  }
  applyPose(); applyFace();

  function anim(dt, t) {
    const ph = st.phase, b = st.base;
    const bl = ((t + ph) % 3.7) < 0.13;
    if (bl !== st.blink) { st.blink = bl; applyFace(); }
    if (typeof ctx !== 'undefined' && ctx.reduced) return;
    R.pivot.position.y = CH_HIP + 0.004 * Math.sin(t * 2.1 + ph);
    R.head.rotation.z = 0.035 * Math.sin(t * 0.8 + ph); R.head.rotation.y = 0.05 * Math.sin(t * 0.5 + ph * 2);
    const sw = Math.sin(t * 1.7 + ph);
    if (R.tails) R.tails.rotation.x = 0.04 * sw;
    switch (st.pose) {
      case 'walk': {
        const w = Math.sin(t * 6);
        R.armL.rotation.x = b.L.x + 0.5 * w; R.armR.rotation.x = b.R.x - 0.5 * w;
        R.legL.rotation.x = -0.4 * w; R.legR.rotation.x = 0.4 * w; rig.position.y = 0.012 * Math.abs(Math.cos(t * 6));
        break;
      }
      case 'wave': R.armR.rotation.z = b.R.z + 0.3 * Math.sin(t * 8); break;
      case 'surprised': rig.position.y = 0.015 * Math.abs(Math.sin(t * 3)); break;
      case 'bow': R.pivot.rotation.x = b.lean + 0.02 * Math.sin(t * 1.5); break;
      case 'reach': R.armR.rotation.x = b.R.x + 0.08 * Math.sin(t * 3 + ph); rig.position.y = 0.006 * Math.abs(Math.sin(t * 3 + ph)); break;   // 踮腳伸手
      case 'pick': R.armR.rotation.x = b.R.x + 0.05 * Math.sin(t * 2 + ph); break;
      case 'write': R.armR.rotation.z = b.R.z + 0.08 * Math.sin(t * 5 + ph); R.armR.rotation.x = b.R.x + 0.04 * Math.sin(t * 3.3); break;
      case 'read': R.head.rotation.x = 0.16 + 0.03 * Math.sin(t * 0.7 + ph); break;
      case 'plough': { const k = Math.sin(t * 2 + ph); R.pivot.rotation.x = b.lean + 0.04 * k; R.armL.rotation.x = b.L.x + 0.06 * k; R.armR.rotation.x = b.R.x + 0.06 * k; break; }
      case 'tamp': { const k = Math.max(0, Math.sin(t * 3.2 + ph)), pr = R.props.pestle;   // 舉起夯杵→落下
        R.armL.rotation.x = b.L.x - 0.35 * k; R.armR.rotation.x = b.R.x - 0.35 * k; if (pr) pr.position.y = pr.userData.base[1] + 0.12 * k; rig.position.y = 0.006 * k; break; }
      case 'carry': rig.position.y = 0.006 * Math.abs(Math.sin(t * 2.4 + ph)); break;
      case 'talk': R.armR.rotation.z = b.R.z + 0.18 * Math.sin(t * 2.6 + ph); R.head.rotation.x = -0.04 + 0.05 * Math.sin(t * 1.3 + ph); break;
      case 'bound': R.head.rotation.x = 0.14 + 0.03 * Math.sin(t * 0.6 + ph); break;
      case 'pole': { const k = Math.sin(t * (st.poleRate || 3) + ph), pr = R.props.pole;   // 撐篙：身體前傾推、回收
        R.pivot.rotation.x = b.lean + 0.12 * k; R.armL.rotation.x = b.L.x + 0.2 * k; R.armR.rotation.x = b.R.x + 0.2 * k;
        if (pr) { pr.rotation.x = 0.12 * k; pr.position.z = pr.userData.base[2] + 0.05 * k; } break; }
    }
    upright();
  }
  Object.assign(root.userData, {
    spec, who, seatY: CH_HIP * ksc, anim,
    setOutfit() {},   // 本作一人一套衣服；保留介面
    setPose(p) { st.pose = POSES[p] ? p : 'stand'; applyPose(); },
    setPoleRate(r) { st.poleRate = r; },   // 撐篙節奏（scene：航行時快、靠岸慢）
    setFace(f) { st.face = ['smile', 'sad', 'surprised', 'worried', 'calm'].includes(f) ? f : 'smile'; applyFace(); }
  });
  return root;
}
