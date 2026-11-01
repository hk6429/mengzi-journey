// ================= SCENE（C 線）：仙界蓮池上的八片巨大荷葉＋360 度全景天空＋騎蛙連跳＋細墨線後製（沿用陋室銘第六輪鏡頭） =================
// 介面見 docs/CONTRACT.md「第二輪」。頂層只放純函式與常數（test/scene.test.mjs 用 vm 載入，不碰 THREE／DOM）。
// 每站：原點＝葉心、葉面 y=0、葉半徑 5.4（A/B 內容在 4.6 內）；荷葉本體、荷梗、葉旁點綴由 core.js 的 lpLotusLeaf 生成；水面在世界 y=0。

// 畫質分級：?quality=N 釘死；手機從較低 pixelRatio 起跳；持續掉幀再降一級
const scTiers = [{ pr: IS_MOBILE ? 1.5 : 2 }, { pr: IS_MOBILE ? 1.15 : 1.4 }, { pr: 1 }];
const scSmooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
// 各站荷葉設色：LP_TONE 有以站 id 為鍵的設色，沒有就用 base
const scToneOf = id => Object.prototype.hasOwnProperty.call(LP_TONE, id) ? id : 'base';
// 荷葉：葉半徑、A/B 可用半徑、主角預設站位（葉前緣）；蛙平時蹲在葉前緣右側靠邊（不擋主角與鏡頭）
const SC_ISLE = { R: 5.4, use: 4.6 };
const SC_HERO_AT = [0, 2.6];
const SC_FROG_AT = [2.9, 2.8];
const SC_NOTCH = 200; // A/B 沒給 userData.notch 時的缺口方向（左後方）
// 第三輪（art 6）：青蛙每站待機的位置與姿勢不一樣（相對 SC_FROG_AT 的小偏移 d、臉朝向 yaw、蹲低 crouch、抬頭 pitch）；跳石路線仍以 SC_FROG_AT 計算
const SC_FROG_POSE = { baihua: { d: [0, 0], yaw: -0.35 }, ju: { d: [0.2, -0.45], yaw: -0.75, crouch: 0.3 }, mudan: { d: [-0.35, 0.25], yaw: -0.05, pitch: 0.18 },
  yuni: { d: [0.25, 0.1], yaw: -0.6, crouch: 0.45, pitch: -0.08 }, jing: { d: [0.1, -0.4], yaw: 0.15 }, xiang: { d: [-0.4, 0.2], yaw: -0.5, pitch: 0.25 },
  pin: { d: [0.3, -0.25], yaw: -0.2, crouch: 0.15 }, lianxi: { d: [-0.15, 0.25], yaw: -0.9, crouch: 0.35, pitch: -0.05 } };
const scFrogPose = id => Object.assign({ d: [0, 0], yaw: -0.35, crouch: 0.08, pitch: 0 }, SC_FROG_POSE[id] || {});
// 鏡頭（度）：到站從 +z 仰角 el 看整片荷葉（第三輪 art 2：20→13，地平線壓到畫面上 1/3，全景露出來）；直式手機 elPortrait；拖曳 360 度方位、仰角 5–60°；縮放距離 minD–maxD
// 第三輪（cam P8）：minD 5→6.5（最近不貼 NPC 的臉）、maxD 42→32（最遠不讓鄰站荷葉擠進前景）
const SC_CAM = { el: 11, elPortrait: 24, fov: 38, ovFov: 21, elMin: 5, elMax: 60, focusEl: 18, minD: 6.5, maxD: 32 }; // ovFov：總覽縮窄視角壓平透視（第六輪 cam 4）
// 全景天空：3:1 長卷貼在仰角 bot～top 的一圈帶上，地平線（圖高 52% 處，由下往上量）落在仰角 0°；左右接縫交叉淡化 seam 度
const SC_SKY = { bot: -47, top: 43, seam: 3, R: 450 }; // 第三輪（cam P9）：接縫淡化 7°→3°，減少兩端山影疊成雙重曝光
const scSkyV = el => (el - SC_SKY.bot) / (SC_SKY.top - SC_SKY.bot); // 仰角 → 圖的 v（0＝下緣）
// 騎蛙跳：主角坐上蛙背 mount → 每跳＝蹲低蓄力 crouch（第一跳 crouch0）＋騰空 air(距離)＋落地壓扁 land → 主角滑下 off → end
// 跳躍部分整體縮放，讓總長落在 5.2–8.8 秒
const SC_HOP = { mount: 0.75, crouch0: 0.5, crouch: 0.3, land: 0.24, off: 0.6, end: 0.2, min: 5.2, max: 8.8 };
const scAir = d => 0.6 + d * 0.05;
function scHopPlan(lens) {
  const H = SC_HOP, raw = lens.reduce((s, d, i) => s + (i ? H.crouch : H.crouch0) + scAir(d) + H.land, 0), fix = H.mount + H.off + H.end;
  const k = raw > 0 ? (clamp(raw + fix, H.min, H.max) - fix) / raw : 1;
  const hops = []; let t = H.mount;
  lens.forEach((d, i) => { const c = (i ? H.crouch : H.crouch0) * k, a = scAir(d) * k, l = H.land * k; hops.push({ t0: t, c, a, l, d }); t += c + a + l; });
  return { hops, off: t, dur: t + H.off + H.end };
}
// 荷葉跳石：A 葉上蛙的位置到 B 葉上蛙的位置之間，沿一條往 +z 微鼓的弧線弧長等分出 1–3 片浮在水上的小荷葉（[x, 0, z]）；
// 落在任何一片大荷葉範圍內的推出去
function scStones(A, B, all = [A, B]) {
  const R = SC_ISLE.R, f = SC_FROG_AT, a = [A[0] + f[0], A[2] + f[1]], b = [B[0] + f[0], B[2] + f[1]], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const n = clamp(Math.ceil(L / 8) - 1, 1, 3), c = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + L * 0.15]; // 跳 n+1 次＝2–4 跳；中段往鏡頭方向（+z）鼓出
  const at = t => { const v = 1 - t; return [v * v * a[0] + 2 * v * t * c[0] + t * t * b[0], v * v * a[1] + 2 * v * t * c[1] + t * t * b[1]]; };
  const S = [at(0)], cum = [0]; for (let k = 1; k <= 64; k++) { S.push(at(k / 64)); cum.push(cum[k - 1] + Math.hypot(S[k][0] - S[k - 1][0], S[k][1] - S[k - 1][1])); }
  const st = []; for (let i = 1; i <= n; i++) { const want = cum[64] * i / (n + 1); let k = 1; while (k < 64 && cum[k] < want) k++; st.push(S[k].slice()); } // 弧長等分
  for (let it = 0; it < 3; it++) st.forEach(s => all.forEach(P => { const dx = s[0] - P[0], dz = s[1] - P[2], d = Math.hypot(dx, dz), m = R + 1.3; if (d < m) { const k = m / (d || 1); s[0] = P[0] + dx * k; s[1] = P[2] + dz * k; } }));
  return st.map(s => [s[0], 0, s[1]]);
}
// 跳躍跟拍在哪一側：預設 +z（水面前方）；+z 側鏡頭會飄到別站荷葉上空（離葉心 < R+4）而 −z 側比較空，才換 −z。回傳 ±1
const SC_CHASE = { back: 4, side: 6.5 };
function scChaseSide(a, b, others) {
  let dx = b[0] - a[0], dz = b[2] - a[2]; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
  let sx = -dz, sz = dx; if (sz < 0) { sx = -sx; sz = -sz; }
  const clear = sg => { let m = 99; for (let k = 0; k <= 8; k++) { const x = lerp(a[0], b[0], k / 8) - dx * SC_CHASE.back + sx * SC_CHASE.side * sg, z = lerp(a[2], b[2], k / 8) - dz * SC_CHASE.back + sz * SC_CHASE.side * sg;
    others.forEach(c => { m = Math.min(m, Math.hypot(x - c[0], z - c[2])); }); } return m; };
  return clear(1) >= Math.min(clear(-1), SC_ISLE.R + 4) ? 1 : -1;
}
// 主角走過去站的位置（站內座標 [x,z]）：standSpots 有給就用（夾進可站範圍）；
// 否則（第三輪 cam P3）站在元素「側邊」：元素→葉心方向轉 ±90°、取離主角原位近的那邊——主角、元素、鏡頭排成三角形，不再夾在鏡頭與元素中間
function scStandFor(box, ss) {
  const cl = (x, z) => { const r = Math.hypot(x, z), m = SC_ISLE.use - 0.2; return r > m ? [x * m / r, z * m / r] : [x, z]; };
  if (Array.isArray(ss) && ss.length === 2 && Math.abs(ss[0]) <= 6 && Math.abs(ss[1]) <= 6) return cl(ss[0], ss[1]); // 舊格式 [lat, lon] 數字很大，跳過
  const cx = (box.x0 + box.x1) / 2, cz = (box.z0 + box.z1) / 2, hw = Math.min(1.5, Math.max(box.x1 - box.x0, box.z1 - box.z0) / 2), k = hw + 0.6;
  let dx = -cx, dz = -cz, l = Math.hypot(dx, dz);
  if (l < 0.3) { dx = SC_HERO_AT[0] - cx; dz = SC_HERO_AT[1] - cz; l = Math.hypot(dx, dz) || 1; } // 元素在葉心：改用朝主角原位的方向
  dx /= l; dz /= l;
  const c = [[cx + dz * k, cz - dx * k], [cx - dz * k, cz + dx * k]], far = q => Math.hypot(q[0] - SC_HERO_AT[0], q[1] - SC_HERO_AT[1]);
  return cl(...(far(c[0]) <= far(c[1]) ? c[0] : c[1]));
}
// 特寫鏡頭的水平方向（第三輪 cam P3）：從「元素→主角」方向偏轉約 63°（u×0.5＋垂直向量），取比較朝葉外的那一側；
// 主角面向元素時臉是 3/4 側對鏡頭，也不會擋住元素。el＝元素站內座標 [x,z]、st＝主角站位、out＝葉外方向（[x,z]，可不單位化）。回傳單位向量 [x,z]
function scFocusDir(el, st, out) {
  let ux = st[0] - el[0], uz = st[1] - el[1]; const l = Math.hypot(ux, uz);
  if (l < 0.3) { const o = Math.hypot(out[0], out[1]) || 1; return [out[0] / o, out[1] / o]; }
  ux /= l; uz /= l;
  const c = [-1, 1].map(s => { const x = ux * 0.5 - s * uz, z = uz * 0.5 + s * ux, m = Math.hypot(x, z); return [x / m, z / m]; });
  return c[0][0] * out[0] + c[0][1] * out[1] >= c[1][0] * out[0] + c[1][1] * out[1] ? c[0] : c[1];
}
// 主角停在元素旁的面向（第三輪 cam P3）：從「看元素」往「看鏡頭」轉 60%，再夾到離鏡頭方向 ≤ 70°（至少看得到 3/4 側臉）。弧度
function scFaceYaw(ly, cy) {
  const d = Math.atan2(Math.sin(cy - ly), Math.cos(cy - ly)), w = ly + d * 0.6, e = Math.atan2(Math.sin(w - cy), Math.cos(w - cy)), M = 70 * Math.PI / 180;
  return Math.abs(e) <= M ? w : cy + Math.sign(e) * M;
}
// 平台上直線走路：at(u)→[x,z]；1.05 單位/秒，超過 3.5 秒改小跳步（2 單位/秒）；≤ 3.8 秒（含起步 0.3）：D 線等 walked 4 秒逾時
function scWalk(a, b) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]), hop = len / 1.05 > 3.5;
  return { len, hop, at: u => [lerp(a[0], b[0], clamp(u, 0, 1)), lerp(a[1], b[1], clamp(u, 0, 1))],
    dur: len < 0.12 ? 0 : hop ? Math.min(3.5, len / 2) : Math.max(1.0, len / 1.05) };
}
// 鏡頭方向（單位向量）：仰角 el、方位 az（度；0＝正前方 +z）
const scDir = (el, az = 0) => { const e = el * Math.PI / 180, a = az * Math.PI / 180; return [Math.cos(e) * Math.sin(a), Math.sin(e), Math.cos(e) * Math.cos(a)]; };

// ---------- 程式畫的貼圖 ----------
const SC_KAI = '"BiauKai","TW-Kai","Kaiti TC","STKaiti","DFKai-SB","Noto Serif TC","Songti TC",serif';
function scSealTex() { // 朱印「君子」：朱砂方印、白文，兩字直排
  const N = 256, c = document.createElement('canvas'); c.width = c.height = N; const x = c.getContext('2d'), r = mulberry32(5);
  x.fillStyle = '#c0392b'; x.fillRect(14, 14, N - 28, N - 28);
  x.fillStyle = '#f3ead6'; x.font = `700 100px ${SC_KAI}`; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText('君', N / 2, N * 0.31); x.fillText('子', N / 2, N * 0.7);
  for (let i = 0; i < 260; i++) { x.fillStyle = `rgba(243,234,214,${0.2 + r() * 0.5})`; x.fillRect(r() * N, r() * N, 1 + r() * 3, 1 + r() * 2); } // 印泥斑駁
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function scTitleTex() { // 題簽：米色紙籤＋焦墨直書「愛蓮說」
  const W = 128, H = 384, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
  x.fillStyle = '#efe2c4'; x.fillRect(0, 0, W, H); x.strokeStyle = '#a0623a'; x.lineWidth = 4; x.strokeRect(8, 8, W - 16, H - 16);
  x.fillStyle = '#2b2622'; x.font = `700 84px ${SC_KAI}`; x.textAlign = 'center'; x.textBaseline = 'middle';
  ['愛', '蓮', '說'].forEach((ch, i) => x.fillText(ch, W / 2, 72 + i * 112));
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function scMistTex() { // 水面薄霧：白色柔邊橢圓
  const N = 128, c = document.createElement('canvas'); c.width = c.height = N; const x = c.getContext('2d');
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,.85)'); g.addColorStop(0.5, 'rgba(255,255,255,.4)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, N, N); return new THREE.CanvasTexture(c);
}
function scBlobTex() { // 腳下柔影
  const N = 64, c = document.createElement('canvas'); c.width = c.height = N; const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(40,60,40,.42)'); g.addColorStop(0.6, 'rgba(40,60,40,.18)'); g.addColorStop(1, 'rgba(40,60,40,0)');
  x.fillStyle = g; x.fillRect(0, 0, N, N); return new THREE.CanvasTexture(c);
}

// ---------- Q 版大青蛙：翠綠背、米黃肚、頭頂兩側鼓起的大眼、寬嘴微笑、粉頰、後腿粗壯摺起、前腳小、背上淡色鞍形斑 ----------
// +z 朝前、腳底在原點；體長約 1.8、蹲坐高約 1.1。回傳 Group（name 'frog'）
// userData.set({ crouch 0–1 蹲低, ext 0–1 後腿伸直, reach 0–1 前腳往前伸, squash 落地壓扁, pitch 身體俯仰(+＝抬頭), sac 喉囊 0–1, tongue 0–1, blink })
// userData.seat＝背上座位（Object3D，隨身體俯仰）；userData.mouth＝嘴（舌頭起點）
function scFrog() {
  const mat = lpCel('#ffffff', { vertexColors: true });
  const paint = (g, col) => { const n = g.attributes.position.count, a = new Float32Array(n * 3), c = new THREE.Color(), P = g.attributes.position;
    for (let i = 0; i < n; i++) { const v = typeof col === 'function' ? col(P.getX(i), P.getY(i), P.getZ(i)) : col; c.set(v); a.set([c.r, c.g, c.b], i * 3); }
    g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; };
  const merge = list => BGU.mergeGeometries(list.map(g => { if (g.attributes.uv) g.deleteAttribute('uv'); return g.index ? g.toNonIndexed() : g; }));
  const mesh = (list, parent) => { const m = new THREE.Mesh(merge(list), mat); parent.add(m); return m; };
  const G = '#6aaa58', GD = '#4f8a46', BEL = '#f1e8bc', SAD = '#b6d88a', PK = '#f2a7a2', INK = '#24302a';
  const skin = (cy, saddle) => (x, y, z) => { // 背綠、肚米黃（下半）；鞍形斑在背上；幾點深綠斑
    if (y < cy - 0.02 && z > -0.55) return y < cy - 0.12 ? BEL : '#d9e2a0';
    if (saddle && Math.abs(x) < 0.09 && y > cy + 0.2) return '#d9e2a0';                     // 第三輪（art 6）：背中線，背面剪影一看就是青蛙
    if (saddle && Math.hypot(x / 0.36, (z + 0.12) / 0.42) < 1 && y > cy + 0.3) return SAD;
    if (Math.abs(Math.sin(x * 9 + z * 7) * Math.sin(z * 11 - x * 5)) > 0.88 && y > cy + 0.1) return GD;
    return G; };
  const root = new THREE.Group(); root.name = 'frog';
  const body = new THREE.Group(); root.add(body);            // 身體（可俯仰、壓扁）；原點在後腿根部前一點
  mesh([paint(new THREE.SphereGeometry(1, 30, 20).scale(0.72, 0.5, 0.86).translate(0, 0.55, -0.08), skin(0.55, true)),
    paint(new THREE.SphereGeometry(1, 26, 18).scale(0.64, 0.42, 0.56).translate(0, 0.68, 0.42), skin(0.62, false)),
    ...[-1, 1].map(s => paint(new THREE.SphereGeometry(0.11, 12, 8).scale(1, 0.55, 0.5).translate(s * 0.4, 0.6, 0.84), PK))], body);
  // 寬嘴微笑：一道細細的弧（不要大嘴）
  const smile = new THREE.CatmullRomCurve3([new THREE.Vector3(-0.3, 0.62, 0.8), new THREE.Vector3(-0.14, 0.565, 0.935), new THREE.Vector3(0, 0.555, 0.955), new THREE.Vector3(0.14, 0.565, 0.935), new THREE.Vector3(0.3, 0.62, 0.8)]);
  mesh([paint(new THREE.TubeGeometry(smile, 20, 0.014, 5), INK)], body);
  // 眼睛：頭頂兩側鼓起的綠色眼丘＋白眼球＋黑瞳＋高光（眨眼＝眼球壓扁）
  const eyes = [];
  for (const s of [-1, 1]) {
    // 第三輪（art 6）：眼丘往後拉，再加一片綠色眼瞼包住眼球後半——從背後看是綠眼瞼，不是兩顆乒乓球；正面眼球仍是全圓
    mesh([paint(new THREE.SphereGeometry(0.22, 16, 12).scale(1.05, 1.0, 1.15).translate(s * 0.31, 1.05, 0.40), G),
      paint(new THREE.SphereGeometry(0.2, 16, 12).translate(s * 0.33, 1.17, 0.5), G)], body);
    const e = new THREE.Group(); e.position.set(s * 0.33, 1.17, 0.6); body.add(e);
    mesh([paint(new THREE.SphereGeometry(0.19, 16, 12), '#fbfaf3'), paint(new THREE.SphereGeometry(0.1, 12, 8).translate(s * 0.03, 0.01, 0.12), '#1d1f1c'),
      paint(new THREE.SphereGeometry(0.034, 8, 6).translate(s * 0.03 - 0.035, 0.06, 0.21), '#ffffff')], e);
    eyes.push(e);
  }
  // 喉囊（鼓一下）與舌頭（吐出去捕蟲）
  const sac = new THREE.Group(); sac.position.set(0, 0.44, 0.7); body.add(sac);
  mesh([paint(new THREE.SphereGeometry(0.2, 14, 10).scale(1.1, 0.7, 0.9), '#f4ecc8')], sac); sac.scale.setScalar(0.3);
  const mouth = new THREE.Object3D(); mouth.position.set(0, 0.56, 0.9); body.add(mouth);
  const tongue = new THREE.Group(); mouth.add(tongue);
  mesh([paint(new THREE.CylinderGeometry(0.03, 0.03, 1, 6).rotateX(Math.PI / 2).translate(0, 0, 0.5), '#e58a90'), paint(new THREE.SphereGeometry(0.06, 8, 6).translate(0, 0, 1), '#e8797f')], tongue);
  tongue.scale.set(1, 1, 0.001); tongue.visible = false;
  // 前腳：小小兩支，三趾
  const fronts = [];
  for (const s of [-1, 1]) {
    const f = new THREE.Group(); f.position.set(s * 0.36, 0.42, 0.5); body.add(f);
    mesh([paint(new THREE.CapsuleGeometry(0.1, 0.22, 4, 8).translate(0, -0.2, 0).rotateZ(s * 0.28), G),
      ...[-0.55, 0, 0.55].map(a => paint(new THREE.SphereGeometry(0.065, 8, 6).scale(0.85, 0.45, 1.7).translate(0, 0, 0.09).rotateY(a + s * 0.35).translate(s * 0.11, -0.38, 0.02), GD))], f);
    fronts.push({ s, f });
  }
  // 後腿：粗大腿（往前摺）→ 小腿（往後摺）→ 大蹼腳（平貼地面朝前）；ext 時往後伸直
  const hinds = [];
  for (const s of [-1, 1]) {
    const hip = new THREE.Group(); hip.position.set(s * 0.64, 0.42, -0.42); root.add(hip); // 第三輪（art 6）：大腿加粗外推，側看得到摺起的後腿
    mesh([paint(new THREE.SphereGeometry(1, 16, 12).scale(0.30, 0.32, 0.58).translate(s * 0.08, 0, 0.18), skin(0.0, false))], hip);
    const knee = new THREE.Group(); knee.position.set(s * 0.1, -0.08, 0.5); hip.add(knee);
    mesh([paint(new THREE.SphereGeometry(1, 12, 10).scale(0.13, 0.13, 0.4).translate(0, -0.08, -0.32), G)], knee);
    const ank = new THREE.Group(); ank.position.set(0, -0.2, -0.66); knee.add(ank);
    mesh([paint(new THREE.SphereGeometry(1, 14, 8).scale(0.2, 0.05, 0.3).translate(0, -0.1, 0.18), GD),
      ...[-0.45, 0, 0.45].map(a => paint(new THREE.SphereGeometry(0.06, 8, 6).scale(1, 0.5, 1).translate(0, -0.1, 0.42).rotateY(a), GD))], ank);
    hinds.push({ s, hip, knee, ank });
  }
  const seat = new THREE.Object3D(); seat.position.set(0, 1.08, -0.24); body.add(seat);
  root.userData.seat = seat; root.userData.mouth = mouth; root.userData.tongue = tongue;
  root.userData.set = ({ crouch = 0, ext = 0, reach = 0, squash = 0, pitch = 0, sac: sk = 0, tongue: tg = 0, blink = false } = {}) => {
    body.position.y = -0.14 * crouch - 0.05 * squash; body.rotation.x = -pitch + 0.08 * crouch;
    body.scale.set(1 + 0.08 * squash, 1 - 0.12 * squash + 0.04 * ext, 1 + 0.05 * squash);
    hinds.forEach(h => { h.hip.position.y = 0.42 - 0.12 * crouch; h.hip.rotation.x = 1.2 * ext - 0.05 * crouch; h.knee.rotation.x = -0.5 * ext; h.ank.rotation.x = 0.9 * ext; });
    fronts.forEach(f => { f.f.rotation.x = -1.1 * reach + 0.3 * ext; });
    eyes.forEach(e => { e.scale.y = blink ? 0.15 : 1; });
    sac.scale.setScalar(0.3 + 0.75 * sk); tongue.visible = tg > 0.01; tongue.scale.z = Math.max(0.001, tg);
  };
  root.userData.set({});
  root.traverse(o => { o.raycast = () => {}; });   // 蛙不擋點選
  return root;
}
// 畫舫（小遊船）：朱漆船身＋竹篷＋船頭小燈籠；+z 為船頭
function scBoat(seed) {
  const r = mulberry32(seed + 3), vc = lpCel('#ffffff', { vertexColors: true, side: THREE.DoubleSide }), g = new THREE.Group(); g.name = 'boat';
  const hull = new THREE.SphereGeometry(1, 20, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).scale(0.75, 0.42, 2.1).translate(0, 0.25, 0);
  g.add(new THREE.Mesh(BGU.mergeGeometries([lpPaintGeo(hull, '#9c4a32'),
    lpPaintGeo(new THREE.TorusGeometry(1, 0.05, 6, 32).rotateX(Math.PI / 2).scale(0.75, 1, 2.1).translate(0, 0.26, 0), '#e0b13c'),
    lpPaintGeo(new THREE.CylinderGeometry(0.62, 0.62, 1.4, 14, 1, true, -Math.PI / 2, Math.PI).rotateX(Math.PI / 2).rotateZ(Math.PI / 2).rotateY(Math.PI / 2).translate(0, 0.3, -0.2), r() < 0.5 ? '#d9c39a' : '#cdb487'),
    lpPaintGeo(new THREE.SphereGeometry(0.13, 10, 8).scale(1, 1.25, 1).translate(0, 1.15, 1.35), '#d94b3a'),
    lpPaintGeo(new THREE.CylinderGeometry(0.015, 0.015, 0.8, 4).translate(0, 0.65, 1.35), '#5a4030')]), vc));
  g.traverse(o => { o.raycast = () => {}; });
  return g;
}
// 跳石：浮在水面的小荷葉（＋去過之後開出的小荷花，預設隱藏）；Group 頂面 y≈0.05
function scStonePad(seed, tone) {
  const r = mulberry32(seed), T = LP_TONE[tone] || LP_TONE.base, g = new THREE.Group(); g.name = 'stone-pad';
  const vc = lpCel('#ffffff', { vertexColors: true });
  g.add(new THREE.Mesh(BGU.mergeGeometries([lpPadGeo(1.05 + r() * 0.2, r() * 360, T.leaf).translate(0, 0.05, 0),
    lpPaintGeo(new THREE.CircleGeometry(1.5, 24).rotateX(-Math.PI / 2).translate(0, 0.01, 0), '#8fbfae')]), vc));
  g.children[0].material = vc;
  const a = r() * Math.PI * 2, bloom = new THREE.Mesh(BGU.mergeGeometries([lpBloomGeo(1, 0.32, T.bloom).translate(0, 0.42, 0), lpPaintGeo(new THREE.CylinderGeometry(0.025, 0.03, 0.42, 5).translate(0, 0.21, 0), T.stem)]), vc);
  bloom.position.set(Math.sin(a) * 0.7, 0, Math.cos(a) * 0.7); bloom.visible = false; bloom.name = 'stone-bloom'; g.add(bloom);
  g.userData.bloom = bloom; g.traverse(o => { o.raycast = () => {}; });
  return g;
}

// ---------- shader ----------
const SC_NOISE = `float hh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(hh(i), hh(i + vec2(1,0)), f.x), mix(hh(i + vec2(0,1)), hh(i + vec2(1,1)), f.x), f.y); }
float fbm(vec2 p){ float s = 0., a = .5; for (int i = 0; i < 3; i++) { s += a * vn(p); p = p * 2.07 + 5.3; a *= .5; } return s; }`;
// 全景天空球（跟著鏡頭）：兩張全景 A/B 以 uMix 交疊；圖外上方淡進頂色、下方淡進水色；沒圖＝各站淡彩漸層（天頂→地平線薄霧→水色）＋遠山淡影
const scSkyVS = `varying vec3 vD; void main(){ vD = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`;
const scSkyFS = `varying vec3 vD; uniform sampler2D uA, uB; uniform float uHasA, uHasB, uMix, uDusk; uniform vec3 uTopA, uBotA, uTopB, uBotB, uZen, uHor, uWat; uniform vec3 uSky;
${SC_NOISE}
vec3 pano(sampler2D T, vec2 uv){ float w = uSky.z, u = uv.x * (1. - w); vec3 c = texture2D(T, vec2(u, uv.y)).rgb;
  if (u < w) c = mix(texture2D(T, vec2(u + 1. - w, uv.y)).rgb, c, smoothstep(0., 1., u / w)); return c; }
vec3 grad(float el, float az){
  vec3 c = el > 0. ? mix(uHor, uZen, smoothstep(0., 38., el)) : mix(uHor, uWat, smoothstep(0., -7., el));
  float hill = .6 + 3.2 * fbm(vec2(az * 16., 1.7)) * fbm(vec2(az * 5., 3.1));
  if (el > 0.) c = mix(c, mix(uWat, uHor, .45), .32 * (1. - smoothstep(hill - .4, hill, el)));
  return mix(c, uHor, exp(-pow(el / 3.5, 2.)) * (.35 + .4 * fbm(vec2(az * 40., el * .4))));
}
vec3 sky(sampler2D T, float has, vec3 top, vec3 bot, float el, float az){
  if (has < .5) return grad(el, az);
  float v = (el - uSky.x) / (uSky.y - uSky.x);
  vec3 c = pano(T, vec2(az, clamp(v, .003, .997)));
  c = mix(c, top, smoothstep(.9, 1.06, v));
  c = mix(c, mix(bot, uWat, smoothstep(0., -.5, v)), smoothstep(.1, -.04, v));
  return c;
}
void main(){
  vec3 d = normalize(vD); float el = degrees(asin(clamp(d.y, -1., 1.))), az = atan(d.x, -d.z) / 6.2831853 + .5;
  vec3 c = sky(uA, uHasA, uTopA, uBotA, el, az);
  if (uMix > .001) c = mix(c, sky(uB, uHasB, uTopB, uBotB, el, az), uMix);
  vec3 dusk = mix(vec3(.98, .72, .5), vec3(.62, .55, .7), smoothstep(-2., 40., el));          // 夕陽：地平線橘、天頂淡紫
  c = mix(c, c * .55 + dusk * .5, uDusk * .75);
  gl_FragColor = vec4(c, 1.);
  #include <colorspace_fragment>
}`;
// 蓮池水面：世界 xz 上的 fbm 細波→法線；fresnel 混天色倒影＋細碎波光；遠處化進地平線色（水面薄霧）
const scWaterVS = `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const scWaterFS = `varying vec3 vW; uniform vec3 uWat, uHor, uZen, uCam; uniform float uT, uDusk;
${SC_NOISE}
float wv(vec2 p){ return fbm(p * .32 + vec2(uT * .05, uT * .03)) + .5 * fbm(p * 1.1 - vec2(uT * .09, -uT * .04)); }
void main(){
  vec2 p = vW.xz; float h0 = wv(p), hx = wv(p + vec2(.3, 0.)), hz = wv(p + vec2(0., .3));
  vec3 n = normalize(vec3((h0 - hx) * 1.3, 1., (h0 - hz) * 1.3));
  vec3 v = uCam - vW; float dist = length(v); v /= dist;
  float fr = pow(1. - max(dot(n, v), 0.), 3.);
  vec3 c = mix(uWat, mix(uHor, uZen, .3), .18 + .55 * fr);
  c += .18 * pow(max(dot(reflect(-v, n), normalize(vec3(-.45, .75, .5))), 0.), 48.);
  c = mix(c, uWat * 1.06, .25 * smoothstep(.55, .75, fbm(p * .08)));                        // 大片淺色水紋
  c = mix(c, uHor, smoothstep(60., 420., dist) * .85 * pow(1. - v.y, 2.));                    // 斜看才起霧；鳥瞰時水色保留
  c = mix(c, c * vec3(1.05, .95, .9) + vec3(.06, .025, .0), uDusk * .75);                    // 夕照：水面微暖，仍留玉色
  gl_FragColor = vec4(c, 1. - smoothstep(90., 300., dist));                                   // 第三輪（art 3）：遠處淡出，接上全景下半部畫的蓮池，地平線不再是一條硬線
  #include <colorspace_fragment>
}`;
// 後製：OUTLINE（桌機）＝依深度找輪廓畫細墨線（約 1–1.5px；天空不寫深度不會被描）＋紙紋＋暖色邊暈
//       否則（手機 lite）＝只疊紙紋×暖色邊暈（乘法混合）
const scPostVS = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`;
const scPostFS = `varying vec2 vUv; uniform sampler2D tSrc, tDepth; uniform vec2 uPx; uniform vec3 uInk;
${SC_NOISE}
uniform float uNear, uFar;
float iz(vec2 o){ return 1. - texture2D(tDepth, vUv + o * uPx).x; } // 透視深度與 1/z 成仿射關係：平面上的二階差分 ≈ 0
void main(){
  vec2 q = gl_FragCoord.xy;
  float paper = .55 * vn(q * .9) + .3 * vn(q * .23) + .15 * vn(q * .05);
  vec2 c = vUv - .5; float vg = smoothstep(.35, .95, length(c * vec2(1.05, 1.)));
  vec3 mul = vec3(1. - .045 * paper) * mix(vec3(1.), vec3(.86, .74, .58), .38 * vg);
#ifdef OUTLINE
  vec3 s = texture2D(tSrc, vUv).rgb;
  float d0 = iz(vec2(0.)), n = 1. / max(d0, 1e-7);
  float lx = (iz(vec2(-1., 0.)) + iz(vec2(1., 0.)) - 2. * d0) * n, ly = (iz(vec2(0., -1.)) + iz(vec2(0., 1.)) - 2. * d0) * n;
  float dx = (iz(vec2(-1., -1.)) + iz(vec2(1., 1.)) - 2. * d0) * n, dy = (iz(vec2(1., -1.)) + iz(vec2(-1., 1.)) - 2. * d0) * n;
  float z = uNear * uFar / (uFar - (1. - d0) * (uFar - uNear));                     // 線性深度：遠處的島不描
  float e = smoothstep(.025, .09, -min(min(lx, ly), min(dx, dy) * .7)) * (1. - smoothstep(70., 130., z));
  s = mix(s, uInk, e * .82);
  gl_FragColor = linearToOutputTexel(vec4(s, 1.));
  gl_FragColor.rgb *= mul;
  gl_FragDepth = 1. - d0; // 把場景深度寫回螢幕，之後疊上的半透明雲（layer 1）才會被島擋住
#else
  gl_FragColor = vec4(mul, 1.);
#endif
}`;

function initScene(ctx) {
  const V = THREE.Vector3, app = document.getElementById('app'), ids = ctx.planets.map(p => p.id), D2R = Math.PI / 180;
  const qPin = QS.get('quality') != null ? clamp(parseInt(QS.get('quality'), 10) || 0, 0, scTiers.length - 1) : null;
  let tier = qPin ?? 0;
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, scTiers[tier].pr));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping; // 礦物色照原色呈現，不讓 ACES 壓彩度
  renderer.domElement.style.touchAction = 'none';
  app.appendChild(renderer.domElement);
  const labelRenderer = new CSS2DRenderer();
  Object.assign(labelRenderer.domElement.style, { position: 'absolute', inset: '0', pointerEvents: 'none' });
  labelRenderer.domElement.setAttribute('aria-hidden', 'true'); // 名牌只是畫面裝飾，路線列已有文字
  app.appendChild(labelRenderer.domElement);
  // 後製：桌機＝畫到離屏（含深度）→ 細墨線＋紙紋＋邊暈；手機或 ?post=lite＝直接畫到螢幕再乘上紙紋×邊暈；?post=0 關閉
  const postMode = QS.get('post') === '0' ? 0 : QS.get('post') === 'lite' || IS_MOBILE ? 1 : 2;
  const postScene = new THREE.Scene(), postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), postPx = new THREE.Vector2();
  let rt = null;
  if (postMode === 2) {
    rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: 4 });
    rt.depthTexture = new THREE.DepthTexture(4, 4, THREE.FloatType);
  }
  const postMat = new THREE.ShaderMaterial({ vertexShader: scPostVS, fragmentShader: scPostFS,
    uniforms: { tSrc: { value: rt && rt.texture }, tDepth: { value: rt && rt.depthTexture }, uPx: { value: postPx }, uNear: { value: 0.3 }, uFar: { value: 900 }, uInk: { value: new THREE.Color(PAL.inkDk) } },
    defines: postMode === 2 ? { OUTLINE: 1 } : {}, depthTest: postMode === 2, depthFunc: THREE.AlwaysDepth, depthWrite: postMode === 2, toneMapped: false,
    ...(postMode === 2 ? {} : { blending: THREE.CustomBlending, blendSrc: THREE.ZeroFactor, blendDst: THREE.SrcColorFactor }) });
  const postQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), postMat); postQuad.frustumCulled = false; postScene.add(postQuad);
  function postSize() {
    if (!rt) return; const s = renderer.getDrawingBufferSize(new THREE.Vector2());
    rt.setSize(s.x, s.y); postPx.set(1 / s.x, 1 / s.y).multiplyScalar(Math.max(1, renderer.getPixelRatio() * 0.65)); // 約 1–1.5 CSS px
  }
  // 桌機：layer 0 → 離屏 → 細墨線（並寫回深度）→ 再把 layer 1（半透明雲、瀑布）直接疊到螢幕，雲不參與描邊
  function render() {
    if (postMode === 2) {
      renderer.setRenderTarget(rt); renderer.render(scene, camera); renderer.setRenderTarget(null); renderer.render(postScene, postCam);
      const bg = scene.background; scene.background = null; camera.layers.set(LP_OVERLAY); renderer.autoClear = false;
      renderer.render(scene, camera);
      renderer.autoClear = true; camera.layers.set(0); scene.background = bg; return;
    }
    renderer.render(scene, camera);
    if (postMode === 1) { renderer.autoClear = false; renderer.render(postScene, postCam); renderer.autoClear = true; }
  }
  // 畫面罩：減少動態時的淡出淡入
  const PAPER = '#f1e8d3';
  const fadeEl = document.createElement('div');
  Object.assign(fadeEl.style, { position: 'fixed', inset: '0', background: PAPER, opacity: '0', pointerEvents: 'none', zIndex: '5' }); app.appendChild(fadeEl);
  let veilOp = -1; const setVeil = op => { if (Math.abs(op - veilOp) > 0.004) { veilOp = op; fadeEl.style.opacity = op.toFixed(3); } };

  const scene = new THREE.Scene(); scene.background = new THREE.Color(PAPER);
  const camera = new THREE.PerspectiveCamera(SC_CAM.fov, 1, 0.3, 900);
  if (postMode !== 2) camera.layers.enable(LP_OVERLAY); // 沒有描邊後製就一起畫
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = 0.08; controls.enablePan = false; controls.rotateSpeed = 0.7; controls.zoomSpeed = 1.6; // 第三輪（cam P8）：滾輪一格 5%→約 8%
  controls.minDistance = SC_CAM.minD; controls.maxDistance = SC_CAM.maxD;   // 方位不設限：360 度繞島
  controls.minPolarAngle = (90 - SC_CAM.elMax) * D2R; controls.maxPolarAngle = (90 - SC_CAM.elMin) * D2R;
  Object.assign(ctx, { scene, camera, renderer, labelRenderer, controls, view: 'planet' });

  // ---------- 光：柔和環境光＋左前上方主光 ----------
  const AMB0 = new THREE.Color(0xfff4e6), AMBD = new THREE.Color(0xffe2c8), KEY0 = new THREE.Color(0xfff0dc), KEYD = new THREE.Color(0xffc48a); // 白天／夕陽
  const amb = new THREE.AmbientLight(AMB0.clone(), 1.9); scene.add(amb);
  const key = new THREE.DirectionalLight(KEY0.clone(), 1.5); scene.add(key, key.target);
  const keyOff = new V(-0.6, 1, 0.75).normalize().multiplyScalar(30);
  const aimLight = () => { key.target.position.copy(controls.target); key.position.copy(controls.target).add(keyOff); };

  // ---------- 全景天空球：每站一張 pano/<id>.jpg，換站時兩張交疊淡入淡出；沒圖＝各站淡彩漸層（地平線以下是水色） ----------
  const col = h => new THREE.Color(h);
  const skyU = { uA: { value: null }, uB: { value: null }, uHasA: { value: 0 }, uHasB: { value: 0 }, uMix: { value: 0 },
    uTopA: { value: col('#e8d4a0') }, uBotA: { value: col('#efe6d6') }, uTopB: { value: col('#e8d4a0') }, uBotB: { value: col('#efe6d6') },
    uZen: { value: col('#cfe0e2') }, uHor: { value: col('#f1ece0') }, uWat: { value: col('#9cc7bc') }, uDusk: { value: 0 },
    uSky: { value: new V(SC_SKY.bot, SC_SKY.top, SC_SKY.seam / 360) } };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(SC_SKY.R, 64, 32), new THREE.ShaderMaterial({ vertexShader: scSkyVS, fragmentShader: scSkyFS, uniforms: skyU, side: THREE.BackSide, depthWrite: false, depthTest: false }));
  sky.name = 'sky'; sky.renderOrder = -10; sky.frustumCulled = false; sky.raycast = () => {}; scene.add(sky);
  const texLoader = new THREE.TextureLoader(), panos = new Map(); // id → { tex, top, hor, bot, ok }
  function loadPano(id) {
    if (panos.has(id)) return panos.get(id);
    const e = { tex: null, top: col('#e8d4a0'), hor: col('#f1ece0'), bot: col('#efe6d6'), ok: null }; panos.set(id, e);
    texLoader.load('pano/' + id + '.jpg', t => {
      t.colorSpace = THREE.SRGBColorSpace; t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; // 不做 mipmap：方位角接縫處才不會出現一條細線
      try { // 頂色＝圖最上緣平均、地平線色＝仰角 0° 那一列、底色（水）＝最下緣平均
        const W = 48, H = 24, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'); x.drawImage(t.image, 0, 0, W, H);
        const avg = (y, out) => { const d = x.getImageData(0, y, W, 1).data; let r = 0, g = 0, b = 0; for (let k = 0; k < d.length; k += 4) { r += d[k]; g += d[k + 1]; b += d[k + 2]; } out.setRGB(r / W / 255, g / W / 255, b / W / 255, THREE.SRGBColorSpace); };
        avg(0, e.top); avg(Math.round((1 - scSkyV(0)) * (H - 1)), e.hor); avg(H - 1, e.bot);
      } catch (er) {}
      e.tex = t; e.ok = true; skyApply();
    }, undefined, () => { e.ok = false; console.info('[scene] 還沒有全景圖，用淡彩漸層：' + id); });
    return e;
  }
  const skyS = { a: null, b: null, mix: 0 }, _ca = [col(0), col(0), col(0)], _cb = [col(0), col(0), col(0)];
  const toneCols = (id, out) => { const s = LP_TONE[scToneOf(id)].sky, e = panos.get(id); s.forEach((h, i) => out[i].set(h)); if (e && e.tex) { out[1].copy(e.hor); out[2].copy(e.bot); } };
  function skyApply() {
    const A = skyS.a && panos.get(skyS.a), B = skyS.b && panos.get(skyS.b);
    skyU.uA.value = A && A.tex; skyU.uHasA.value = A && A.tex ? 1 : 0; if (A) { skyU.uTopA.value.copy(A.top); skyU.uBotA.value.copy(A.bot); }
    skyU.uB.value = B && B.tex; skyU.uHasB.value = B && B.tex ? 1 : 0; if (B) { skyU.uTopB.value.copy(B.top); skyU.uBotB.value.copy(B.bot); }
    skyU.uMix.value = B ? skyS.mix : 0;
    if (skyS.a) { toneCols(skyS.a, _ca); if (skyS.b) toneCols(skyS.b, _cb); else _ca.forEach((c, i) => _cb[i].copy(c));
      [skyU.uZen, skyU.uHor, skyU.uWat].forEach((u, i) => u.value.copy(_ca[i]).lerp(_cb[i], skyU.uMix.value)); }
  }
  function skyTo(a, b = null, mix = 0) {
    loadPano(a); if (b) loadPano(b);
    const i = ids.indexOf(b || a); [ids[i - 1], ids[i + 1]].forEach(n => n && loadPano(n)); // 預載前後站
    Object.assign(skyS, { a, b, mix }); skyApply();
  }
  ctx.skyState = () => ({ ...skyS, loaded: ids.filter(i => panos.get(i)?.ok) }); // 給驗收腳本看

  // ---------- 仙界蓮池水面（世界 y=0）：淡玉色＋倒映天色＋細波＋水面薄霧；跟著鏡頭水平移動，遠處化進地平線色 ----------
  const waterU = { uZen: skyU.uZen, uHor: skyU.uHor, uWat: skyU.uWat, uDusk: skyU.uDusk, uCam: { value: new V() }, uT: { value: 0 } };
  // 半透明但照樣寫深度（細墨線與水下荷梗照舊）；renderOrder −1：在半透明物件裡最先畫，葉影、漣漪才疊得上去
  const water = new THREE.Mesh(new THREE.CircleGeometry(SC_SKY.R - 20, 72).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({ vertexShader: scWaterVS, fragmentShader: scWaterFS, uniforms: waterU, transparent: true }));
  water.name = 'water'; water.position.y = -0.03; water.renderOrder = -1; water.frustumCulled = false; water.raycast = () => {}; scene.add(water);

  // ---------- 八片巨大荷葉＋A/B 的站點內容；名牌掛在葉前緣下方、靠近水面 ----------
  const anims = [], labels = [], labObjs = [];
  ctx.planets.forEach(p => {
    const d = p.data, kit = lpKit(d);
    let g = null;
    try { g = LP_BUILD[d.id] ? LP_BUILD[d.id](kit) : null; } catch (e) { console.warn('[scene] 站點建造器失敗，先用空平台：' + d.id, e); g = null; kit.anim.length = 0; }
    if (!g || !g.isObject3D) g = new THREE.Group();
    const isle = lpLotusLeaf({ radius: SC_ISLE.R, seed: seedOf(d.id) % 100000, tone: scToneOf(d.id), notch: g.userData.notch ?? SC_NOTCH, rim: g.userData.rim || [], stem: Math.max(0.5, d.pos[1]) });
    g.add(isle); if (isle.userData.anim) anims.push(isle.userData.anim);
    // 第三輪（cam P10）：葉下漣漪環太像準星——換細環（內徑 0.92→0.96），isle 動畫設完不透明度後再減半（上限 0.32→0.16）
    // shortcut: 在 scene 端改 core.js 畫的漣漪；整合時可直接改 core.js 的 RingGeometry 與 0.32
    const rip = isle.children.filter(o => o.name === 'leaf-ripple');
    if (rip.length) { const rg = new THREE.RingGeometry(0.96, 1, 48).rotateX(-Math.PI / 2); rip.forEach(o => { o.geometry.dispose(); o.geometry = rg; }); anims.push(() => rip.forEach(o => { o.material.opacity *= 0.5; })); }
    g.position.fromArray(d.pos); scene.add(g);
    Object.assign(p, { group: g, kit, ink: 1, isle }); anims.push(...kit.anim);
    const el = document.createElement('div');
    el.innerHTML = `<i style="display:inline-block;width:6px;height:6px;border-radius:50%;border:1px solid #a0623a;background:#2b2622;margin-right:.5em;vertical-align:.08em"></i><b style="color:#c0392b;font-weight:700">${d.num}</b><span style="margin-left:.35em">${d.name}</span>`;
    labels.push(el.lastChild);
    Object.assign(el.style, { font: '500 13px/1.3 "Noto Sans TC","PingFang TC",sans-serif', color: '#2b2622', background: '#f7efdc', padding: '3px 10px 3px 7px', borderRadius: '3px 7px 7px 3px', whiteSpace: 'nowrap', border: '1px solid #a0623a', boxShadow: '0 2px 6px rgba(43,38,34,.25)', letterSpacing: '.03em', pointerEvents: 'none' });
    const lab = new CSS2DObject(el); lab.position.set(d.pos[0], 0.45, d.pos[2] + 6.1); scene.add(lab); labObjs.push([lab, p.id]);
  });
  ctx.inkOf = id => ctx.planetById.has(id) ? 1 : null; // 已建好的站一律全彩
  const centers = ctx.planets.map(p => new V().fromArray(p.data.pos));

  // ---------- 蓮池點綴：遠方浮葉與荷花剪影、水面薄霧（東籬菊園那一角霧最濃）、牡丹苑旁的畫舫 ----------
  const rc = mulberry32(77), vcMat = lpCel('#ffffff', { vertexColors: true });
  const mid0 = centers.reduce((s, c) => s.add(c), new V()).multiplyScalar(1 / centers.length).setY(0);
  const farOk = (x, z, m) => centers.every(c => Math.hypot(x - c.x, z - c.z) > m);
  { const padG = lpPadGeo(1, 200, LP_TONE.base.leaf), blG = BGU.mergeGeometries([lpBloomGeo(0.6, 0.55, LP_TONE.base.bloom).translate(0, 1.1, 0), lpPaintGeo(new THREE.CylinderGeometry(0.04, 0.05, 1.1, 5).translate(0, 0.55, 0), LP_TONE.base.stem)]);
    const NP = 100, NB = 30; // 第三輪（art 3）：遠處交給全景，浮葉荷花減半
    const pads = new THREE.InstancedMesh(padG, vcMat, NP), bl = new THREE.InstancedMesh(blG, vcMat, NB), m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new V();
    let np = 0, nb = 0;
    for (let i = 0; i < 2000 && (np < NP || nb < NB); i++) {
      const a = rc() * Math.PI * 2, r = 14 + Math.pow(rc(), 0.7) * 150, x = mid0.x + Math.cos(a) * r * 1.3, z = mid0.z + Math.sin(a) * r;
      if (!farOk(x, z, SC_ISLE.R + 4) || centers.some(c => z - c.z > 3 && z - c.z < 36 && Math.abs(x - c.x) < 10 + (z - c.z) * 0.45)) continue; // 不擋到站鏡頭
      q.setFromAxisAngle(new V(0, 1, 0), rc() * 6.3);
      if (np < NP) { const k = 0.9 + rc() * 1.8; m.compose(new V(x, 0.02, z), q, s.set(k, 1, k)); pads.setMatrixAt(np++, m); }
      if (nb < NB && rc() < 0.25 && r > 24) { const k = 0.8 + rc() * 0.7; m.compose(new V(x + 1, 0, z), q, s.set(k, k, k)); bl.setMatrixAt(nb++, m); }
    }
    pads.count = np; bl.count = nb; pads.name = 'far-pads'; bl.name = 'far-blooms';
    [pads, bl].forEach(o => { o.raycast = () => {}; o.frustumCulled = false; scene.add(o); }); }
  const mists = [];
  const mistTex = scMistTex();
  ctx.planets.forEach((p, i) => { const T = LP_TONE[scToneOf(p.id)], n = Math.round(2 + T.mist * 10);
    for (let k = 0; k < n; k++) { const a = Math.PI / 2 + 0.9 + rc() * (Math.PI * 2 - 1.8), r = 9 + rc() * 12, w = 14 + rc() * 12 + T.mist * 14; // 避開葉子正前方（到站鏡頭那側）
      // 第三輪（art 4）：水面上那幾條橫貫畫面的硬邊淺色帶＝霧 sprite 下半截插進水面、被水的深度切成一條直線（關霧對照已驗證）→ 整片抬到水面以上、淡一點
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: mistTex, color: '#ffffff', transparent: true, opacity: 0.16 + T.mist * 0.3, depthWrite: false, toneMapped: false, fog: false }));
      s.scale.set(w, w * 0.22, 1); s.layers.set(LP_OVERLAY); s.raycast = () => {}; s.position.set(centers[i].x + Math.cos(a) * r, w * 0.11 + 0.15 + rc() * 0.5, centers[i].z + Math.sin(a) * r); s.userData.op = s.material.opacity; scene.add(s); mists.push(s); } });
  const boats = [];
  { const mu = ctx.planetById.get('mudan'), c = mu ? centers[mu.index] : centers[0];
    [[-7, -8, 0.7], [3, -10, -2.2]].forEach(([dx, dz, yaw], k) => { const b = scBoat(k); b.position.set(c.x + dx, 0, c.z + dz); b.rotation.y = yaw; b.userData.ph = k * 2.1; scene.add(b); boats.push(b); }); }

  // ---------- 荷葉跳石：相鄰兩站之間常駐（總覽看得到路）；跨站跳時臨時鋪一組、到站收起；跳過的小葉開一朵小荷花 ----------
  const segs = new Map(), allPos = ctx.planets.map(p => p.data.pos);
  const frogSpot = p => { const d = scFrogPose(p.id).d; return centers[p.index].clone().add(new V(SC_FROG_AT[0] + d[0], 0, SC_FROG_AT[1] + d[1])); }; // 各站待機點（SC_FROG_AT＋小偏移）
  function segOf(A, B) {
    const [P, Q] = A.index < B.index ? [A, B] : [B, A], key = P.id + '>' + Q.id;
    let s = segs.get(key);
    if (!s) { const tmp = Q.index - P.index !== 1;
      s = { tmp, pads: scStones(P.data.pos, Q.data.pos, allPos).map((q, i) => { const g = scStonePad(seedOf(key) % 9973 + i * 7, scToneOf(Q.id)); g.position.set(q[0], 0, q[2]); g.rotation.y = i * 1.7; g.visible = !tmp; scene.add(g); return g; }) };
      segs.set(key, s); }
    return A.index < B.index ? s.pads : s.pads.slice().reverse();
  }
  const roadPts = [];
  for (let i = 0; i + 1 < ctx.planets.length; i++) { const A = ctx.planets[i], B = ctx.planets[i + 1], pts = [frogSpot(A), ...segOf(A, B).map(g => g.position.clone()), frogSpot(B)];
    pts.forEach((q, k) => { if (k) roadPts.push(pts[k - 1].clone().setY(0.12), q.clone().setY(0.12)); }); }
  const road = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(roadPts), new THREE.LineDashedMaterial({ color: '#4f6b58', transparent: true, opacity: 0.6, dashSize: 1.2, gapSize: 0.9, depthWrite: false, toneMapped: false }));
  road.computeLineDistances(); road.name = 'stone-road'; road.layers.set(LP_OVERLAY); road.visible = false; road.raycast = () => {}; scene.add(road);
  // 落水：水花（幾顆水珠）＋兩圈漣漪；池子裡輪流用
  const splashes = Array.from({ length: 4 }, () => { const g = new THREE.Group(); g.visible = false; scene.add(g);
    const rm = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
    const rings = [0, 1].map(() => { const m = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 40).rotateX(-Math.PI / 2), rm.clone()); m.position.y = 0.03; g.add(m); return m; });
    const drops = Array.from({ length: 7 }, (_, k) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 4), rm.clone()); m.userData.v = [Math.cos(k * 0.9) * 1.4, 2.4 + (k % 3) * 0.5, Math.sin(k * 0.9) * 1.4]; g.add(m); return m; });
    g.userData = { t: 9, rings, drops }; g.traverse(o => { o.raycast = () => {}; }); return g; });
  let spN = 0; const splashAt = p => { const g = splashes[spN++ % splashes.length]; g.position.set(p.x, 0, p.z); g.userData.t = 0; g.visible = true; };
  function stepSplash(dt) { splashes.forEach(g => { const u = g.userData; if (!g.visible) return; u.t += dt; const t = u.t;
    u.rings.forEach((m, i) => { const k = clamp((t - i * 0.18) / 1.1, 0, 1); m.scale.setScalar(0.3 + 1.9 * k); m.material.opacity = 0.55 * (1 - k) * (k > 0 ? 1 : 0); });
    u.drops.forEach(m => { const v = m.userData.v, k = Math.min(t, 0.7); m.position.set(v[0] * k * 0.4, Math.max(0, v[1] * k - 4.9 * k * k), v[2] * k * 0.4); m.material.opacity = t < 0.7 ? 0.85 : 0; });
    if (t > 1.6) g.visible = false; }); }

  // 跳石被踩：往下沉一下再浮回（sink 1→0）；畫舫隨波輕晃
  function stepPads(dt, t) {
    segs.forEach(sg => sg.pads.forEach(g => { const u = g.userData; if (!u.sink) return; u.sink = Math.max(0, u.sink - dt * 1.6); g.position.y = -0.16 * Math.sin(u.sink * Math.PI) * u.sink; }));
    const cp = camera.position; // 鏡頭靠近時霧淡出，免得整片霧糊住畫面
    mists.forEach(m => { const k = THREE.MathUtils.smoothstep(cp.distanceTo(m.position), m.scale.x * 0.5, m.scale.x * 1.2); m.material.opacity = m.userData.op * k; });
    boats.forEach(b => { const ph = b.userData.ph; b.position.y = 0.05 * Math.sin(t * 1.3 + ph); b.rotation.z = 0.03 * Math.sin(t * 1.1 + ph); });
  }
  // 題簽（第一站左前方）與朱印「君子」（末站上空，結尾才蓋上）
  const c0 = centers[0], cN = centers[centers.length - 1];
  const title = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 7.2), new THREE.MeshBasicMaterial({ map: scTitleTex(), toneMapped: false, transparent: true, depthWrite: false }));
  title.position.set(c0.x - 10, c0.y + 4.5, c0.z + 5); title.raycast = () => {}; scene.add(title);
  const seal = new THREE.Mesh(new THREE.PlaneGeometry(13, 13), new THREE.MeshBasicMaterial({ map: scSealTex(), transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
  seal.name = 'seal'; seal.position.set(cN.x - 3, cN.y + 12, cN.z - 4); seal.rotation.z = 0.04; seal.visible = false; seal.raycast = () => {}; scene.add(seal);

  // ---------- 主角周敦頤（lpChibi who:'zhou'） ----------
  const heroC = lpChibi({ who: 'zhou', pose: 'stand', face: 'smile' });
  const hero = new THREE.Group(); hero.name = 'hero'; hero.add(heroC);
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: scBlobTex(), transparent: true, depthWrite: false, toneMapped: false }));
  blob.position.y = 0.01; blob.renderOrder = 1; hero.add(blob);
  hero.traverse(o => { o.raycast = () => {}; }); // 主角不擋點選
  hero.rotation.order = 'YXZ'; // 騎蛙前後仰：先轉方位再俯仰
  const inHero = o => { for (let q = o; q; q = q.parent) if (q === hero) return true; return false; };
  let pose = 'stand'; const setPose = k => { if (k !== pose) { pose = k; heroC.userData.setPose?.(k); } };

  // ---------- Q 版大青蛙：平時蹲在目前這站的葉前緣右側；眨眼、鼓喉囊、偶爾吐舌捕蟲（fg.ride＝跳躍中由 stepFlight 擺位） ----------
  const frog = scFrog(); scene.add(frog);
  const FROG_YAW = -0.35; // 臉朝左前方（主角與鏡頭那側）；各站以 scFrogPose 為準
  // fg.p＝蛙所在的站、fg.away＝讓位中（不在待機點）、fg.mv＝站內小跳 { a, b, t, dur, h, yaw }
  const fg = { ride: false, T: 0, yaw: FROG_YAW, p: null, away: false, hide: false, mv: null, pose: scFrogPose('') };
  const fly = new THREE.Group(); fly.name = 'frog-fly';
  fly.add(new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6).scale(1, 0.8, 1.4), new THREE.MeshBasicMaterial({ color: '#2b2622' })));
  const wingM = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false });
  const wings = [-1, 1].map(s => { const w = new THREE.Mesh(new THREE.CircleGeometry(0.05, 8).scale(1.4, 0.7, 1).translate(s * 0.06, 0, 0), wingM); fly.add(w); return w; });
  fly.traverse(o => { o.raycast = () => {}; }); scene.add(fly);
  const _fly = new V(), _fm = new V(), _fq = new V();
  const placeFrog = p => { fg.pose = scFrogPose(p.id); frog.position.copy(frogSpot(p)).setY(centers[p.index].y); fg.yaw = fg.pose.yaw; frog.rotation.set(0, fg.yaw, 0); Object.assign(fg, { p, away: false, mv: null }); };
  // 站內小跳到 b（世界座標）；落地後臉朝 yaw
  const frogHopTo = (b, yaw) => { const a = frog.position.clone(), d = Math.hypot(b.x - a.x, b.z - a.z); if (d < 0.05) return;
    fg.mv = { a, b: b.clone(), t: 0, dur: ctx.reduced ? 1e-3 : 0.45 + d * 0.05, h: 0.9 + d * 0.15, yaw, dir: Math.atan2(b.x - a.x, b.z - a.z) }; };
  const frogHome = () => { fg.hide = false; if (fg.p && fg.away) { fg.away = false; frogHopTo(frogSpot(fg.p).setY(centers[fg.p.index].y), fg.pose.yaw); } };
  // 第三輪（cam P1）：特寫時青蛙讓位——葉上半徑 3.8 每 45° 一個候選點，挑「在元素背後（離鏡頭最遠）」、離主角站位與元素包圍盒夠遠、
  // 不在鏡頭→主角／元素視線旁、落點沒有道具、去程與回待機點的直線上（蛙跳弧線中段高度）沒有東西擋的那一點
  const _fr = new THREE.Raycaster(), _fo = new V(), _fd = new V();
  const blockedSeg = (p, a, b, y) => { const L = Math.hypot(b.x - a.x, b.z - a.z); if (L < 0.1) return false;
    _fr.set(_fo.set(a.x, y, a.z), _fd.set(b.x - a.x, 0, b.z - a.z).normalize()); _fr.near = 0; _fr.far = L;
    return _fr.intersectObject(p.group, true).some(h => h.object.visible && !inHero(h.object)); };
  const segDist = (q, a, b) => { const ax = b.x - a.x, az = b.z - a.z, l2 = ax * ax + az * az || 1, t = clamp(((q.x - a.x) * ax + (q.z - a.z) * az) / l2, 0, 1); return Math.hypot(q.x - a.x - ax * t, q.z - a.z - az * t); };
  function frogYield(p, box, st, ec, camPos, heads) {
    if (fg.p !== p || fg.ride) return;
    const gp = centers[p.index], home = frogSpot(p).setY(gp.y), from = fg.mv ? fg.mv.b : frog.position, cd = camPos.clone().sub(ec).setY(0).normalize();
    const nearFrog = segs => segs.every(([a, b]) => segDist(frog.position, a, b) > 1.6) && Math.hypot(frog.position.x - st.x, frog.position.z - st.z) > 1.6;
    if (!fg.away && nearFrog(heads.map(h => [camPos, h])) && frog.position.clone().sub(ec).setY(0).dot(cd) < -0.5) return; // 待機點本來就在元素背後、不擋：不動
    const bx = box.clone().expandByScalar(1.2), cands = [];
    // 元素包圍盒蓋滿整片葉（如市集）時，背後的點全被盒子排除：第二輪放寬盒子條件（仍要落點沒有道具）
    for (let pass = 0; pass < 2 && !cands.some(c => c.s < 0); pass++) for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4, q = new V(gp.x + Math.sin(a) * 3.8, gp.y, gp.z + Math.cos(a) * 3.8);
      if (Math.hypot(q.x - st.x, q.z - st.z) < 1.6 || (!pass && q.x > bx.min.x && q.x < bx.max.x && q.z > bx.min.z && q.z < bx.max.z)) continue;
      if (heads.some(h => segDist(q, camPos, h) < 1.6)) continue;
      _fr.set(_fo.set(q.x, gp.y + 4, q.z), _fd.set(0, -1, 0)); _fr.near = 0; _fr.far = 3.7; // 落點上方 0.3–4 有道具＝站不下
      if (_fr.intersectObject(p.group, true).some(h => h.object.visible && !inHero(h.object))) continue;
      cands.push({ q, s: q.clone().sub(ec).setY(0).dot(cd), ok: !blockedSeg(p, from, q, gp.y + 0.9) && !blockedSeg(p, q, home, gp.y + 0.9) }); }
    const pool = cands.some(c => c.ok) ? cands.filter(c => c.ok) : cands; if (!pool.length) return;
    const best = pool.reduce((m, c) => (c.s < m.s ? c : m));
    if (best.s > 0) { fg.away = true; fg.hide = true; return; } // 找不到元素背後的落點：淡出不擋鏡頭（回待機點時再出現）
    fg.away = true; frogHopTo(best.q, Math.atan2(camPos.x - best.q.x, camPos.z - best.q.z)); // 落地後臉朝鏡頭，像在一旁看熱鬧
  }
  function stepFrogMove(dt) {
    const m = fg.mv; m.t = Math.min(1, m.t + dt / m.dur); const k = m.t;
    turnFrog(k < 0.85 ? m.dir : m.yaw, dt, k < 0.85 ? 12 : 6);
    hop(m.a, m.b, scSmooth(0.12, 0.9, k), m.h, frog.position);
    frog.userData.set({ crouch: k < 0.12 ? 0.6 * k / 0.12 : k > 0.9 ? 0.5 * (1 - (k - 0.9) / 0.1) : 0, ext: k > 0.12 && k < 0.5 ? 1 : 0, reach: scSmooth(0.5, 0.85, k), pitch: k > 0.12 && k < 0.9 ? 0.4 * (1 - 2 * (k - 0.12) / 0.78) : 0 });
    if (k >= 1) { fg.mv = null; turnFrog(m.yaw, 1, 1); }
  }
  function stepFrogIdle(dt) {
    if (fg.mv) return stepFrogMove(dt);
    fg.T += dt; const T = fg.T, tp = T % 7.5, sp = T % 4.3;
    // 蟲：在青蛙前方繞小圈；5.0–5.3 秒被舌頭捲走，6.6 秒後再飛回來
    const o = _fq.set(0.5 * Math.sin(T * 1.7), 1.0 + 0.18 * Math.sin(T * 3.1), 1.5 + 0.35 * Math.cos(T * 1.3));
    if (tp > 4.4 && tp < 5.3) o.lerp(_fm.set(0, 0.8, 1.35), scSmooth(4.4, 5.0, tp));
    _fly.copy(o).applyAxisAngle(Yax, frog.rotation.y).add(frog.position);
    fly.position.copy(_fly); fly.visible = !(tp > 5.3 && tp < 6.6) && !fg.ride; wings.forEach((w, i) => { w.rotation.y = (i ? 1 : -1) * 0.6 * Math.sin(T * 60); });
    const tg = tp > 5.0 && tp < 5.5 ? Math.sin((tp - 5.0) / 0.5 * Math.PI) : 0;
    if (tg > 0) { frog.updateMatrixWorld(true); const m = frog.userData.mouth, tn = frog.userData.tongue; m.getWorldPosition(_fm); tn.lookAt(_fly); tg && (tn.userData.len = _fm.distanceTo(_fly)); }
    frog.userData.set({ blink: T % 3.3 < 0.13, sac: sp < 0.9 ? Math.pow(Math.sin(sp / 0.45 * Math.PI), 2) : 0, tongue: tg * (frog.userData.tongue.userData.len || 1),
      crouch: fg.pose.crouch + 0.05 * Math.sin(T * 1.6), pitch: fg.pose.pitch });
  }

  // ---------- 主角在島上走路：pw.at＝目前站位 [x, z]；focusEl 時走到元素旁、null 時走回原位；走到後 emit('walked') ----------
  const pw = { p: null, at: SC_HERO_AT.slice(), path: null, t: 0, look: null, yaw: 0, emit: null, done: null };
  function placeAt(p) {
    p.group.add(hero); hero.visible = true; hero.scale.setScalar(1); hero.rotation.set(0, pw.yaw, 0); blob.visible = true;
    Object.assign(pw, { p, at: SC_HERO_AT.slice(), path: null, look: null, done: null });
    hero.position.set(SC_HERO_AT[0], 0, SC_HERO_AT[1]);
  }
  function walkTo(p, at, el, look) {
    const path = scWalk(pw.at, at), instant = ctx.reduced || !path.dur;
    Object.assign(pw, { path: instant ? null : path, t: -0.3, look, emit: { planet: p.id, el } }); // 朗讀開始 0.3 秒後才起步
    if (instant) { pw.at = at.slice(); pw.done = pw.emit; } // 下一幀才 emit，讓呼叫端先掛好監聽
    return instant ? 0 : path.dur + 0.3;
  }
  const _cl = new V();
  function stepHero(dt, t) {
    const p = pw.p; let mode = 'stand', want = null;
    if (pw.path) {
      pw.t += dt; const u = clamp(pw.t / pw.path.dur, 0, 1), e = easeInOutCubic(u) * 0.85 + u * 0.15, a = pw.path.at(e), b = pw.path.at(Math.min(1, e + 0.03));
      pw.at = a; if (Math.hypot(b[0] - a[0], b[1] - a[1]) > 1e-5) want = Math.atan2(b[0] - a[0], b[1] - a[1]);
      if (u >= 1) { pw.path = null; pw.done = pw.emit; } else if (pw.t > 0) mode = pw.path.hop ? 'hop' : 'walk';
    }
    if (pw.done && !pw.path) { const e = pw.done; pw.done = null; pw.emit = null; ctx.emit('walked', e); }
    const bob = mode === 'stand' ? 0 : Math.abs(Math.sin(t * (mode === 'hop' ? 10 : 8))) * (mode === 'hop' ? 0.08 : 0.025);
    hero.position.set(pw.at[0], bob, pw.at[1]);
    // 面向：走路看前方；停在元素旁轉身面向元素（偏向鏡頭）；原位時臉朝鏡頭 3/4 側
    const cam = p.group.worldToLocal(_cl.copy(camera.position)), cy = Math.atan2(cam.x - pw.at[0], cam.z - pw.at[1]);
    if (mode === 'stand') {
      if (pw.look) want = scFaceYaw(Math.atan2(pw.look.x - pw.at[0], pw.look.z - pw.at[1]), cy); // 第三輪（cam P3）：轉 60% 向鏡頭、至少 3/4 側臉
      else want = cy + 0.3;
    }
    if (want != null) { let dy = want - pw.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); pw.yaw += dy * Math.min(1, dt * (mode !== 'stand' ? 8 : 3)); }
    hero.rotation.y = pw.yaw;
    setPose(mode === 'stand' ? 'stand' : 'walk');
    return mode;
  }

  // ---------- 取景：避開 viewInsets（setViewOffset 讓可視區中心當畫面中心，距離依可視區比例放大） ----------
  const ins = { x: 0, y: 0 };
  // 第三輪（cam P10）：結尾字幕卡（#ui-caption）蓋住朱印——總覽時把看得到的字幕卡當成底部 inset（取 max，B 線若已算進 viewInsets 也不會重複扣）
  // shortcut: 直接量 B 線的 #ui-caption；B 線把字幕卡算進 viewInsets 後可拿掉
  const capCover = () => { if (ctx.view !== 'overview') return 0; const e = document.getElementById('ui-caption'); if (!e || e.hidden) return 0; const r = e.getBoundingClientRect(); return r.height ? Math.max(0, innerHeight - r.top + 8) : 0; };
  const insets = () => { const I = ctx.viewInsets || {}, cb = capCover(); return cb > (I.bottom || 0) ? { ...I, bottom: cb } : I; };
  const free = () => { const W = innerWidth, H = innerHeight, I = insets();
    return { w: clamp((W - (I.left || 0) - (I.right || 0)) / W, 0.22, 1), h: clamp((H - (I.top || 0) - (I.bottom || 0)) / H, 0.3, 1) }; };
  const applyOffset = () => camera.setViewOffset(innerWidth, innerHeight, ins.x, ins.y, innerWidth, innerHeight);
  let fovTo = SC_CAM.fov; // 取景一律用目標 fov 計算（fov 在 render loop 裡漸變過去）
  const tanH = () => Math.tan(fovTo * Math.PI / 360);
  const fitW = hw => hw / (tanH() * camera.aspect * free().w);   // 半寬 hw 放進可視區寬
  const fitH = hh => hh / (tanH() * free().h);
  const Yax = new V(0, 1, 0), occRay = new THREE.Raycaster();
  const isDecor = o => o.isInstancedMesh; // shortcut: 草叢小花等 InstancedMesh 不算遮擋；若 A/B 用它做大樹大石要改成看尺寸
  // 從 tgt 沿 dir 看出去到 dist 之間有東西擋住，就在方位 ±40° 內換、再不行抬高仰角（≤ 60°）
  // 第六輪：方位搜尋擴到 ±70°；froms 可多給幾個起點（例：主角與元素中點＋元素本身），全部看得到才算沒擋
  function clearDir(p, tgt, dir0, dist, ignore, froms = [tgt]) {
    p.group.updateMatrixWorld(true);
    let best = { k: 0, d: dir0 };
    const el0 = Math.asin(clamp(dir0.y, -1, 1)), h0 = new V(dir0.x, 0, dir0.z).normalize();
    for (const el of [el0, el0 + 0.15, el0 + 0.35, SC_CAM.elMax * D2R * 0.8]) for (const a of [0, 0.25, -0.25, 0.5, -0.5, 0.7, -0.7, 0.95, -0.95, 1.22, -1.22]) {
      const d = h0.clone().applyAxisAngle(Yax, a).multiplyScalar(Math.cos(el)).setY(Math.sin(el));
      let k = Infinity;
      for (const o of froms) { occRay.set(o, d); occRay.near = 0.3; occRay.far = dist;
        const h1 = occRay.intersectObject(p.group, true).find(h => !isDecor(h.object) && !ignore(h.object) && h.object.visible);
        if (h1) k = Math.min(k, h1.distance); }
      if (k === Infinity) return { d, dist };
      if (k > best.k) best = { k, d };
    }
    return { d: best.d, dist }; // 擋不掉：照原距離，交給近物淡出
  }
  // 到站：從 +z 仰角 SC_CAM.el 看整片荷葉，主角在前緣；直式手機以主角與葉面中央為主
  // 第三輪：橫式仰角壓低到 11°、注視點抬 1.5（art 2：地平線落在畫面上方約 30%，全景進畫面）；
  //         直式仰角 24°、半寬 4.2→3.6、注視點往前 1.2（cam P6：主角放大、葉子填掉下半部的空水面；仍留一截全景）
  function planetView(p) {
    const portrait = innerWidth * free().w < 560 || camera.aspect < 0.9, c = centers[p.index]; // 桌機兩側面板打開時可視寬約 780px，不可誤判成直式 // 看可視區像素寬，面板寬度微調不會跳分支
    const tgt = c.clone().add(new V(0, portrait ? -0.2 : 1.5, portrait ? 1.2 : 0.3));
    const dist = portrait ? Math.max(fitW(3.6), fitH(4.6)) * 1.15 : Math.max(fitW(6.0), fitH(4.6)); // 整合：桌機改拉近，全景露出上半畫面
    return { pos: tgt.clone().addScaledVector(new V().fromArray(scDir(portrait ? SC_CAM.elPortrait : SC_CAM.el)), dist), tgt };
  }
  const planetEnd = p => () => planetView(p);
  // 總覽：依 viewInsets 算出的可視區（面板收起就用滿寬）試幾個仰角／方位，二分搜尋最近距離讓六座島＋題簽（結尾再加朱印）都落在可視區，
  //       取「各島在畫面上的大小」幾何平均最大的那個；同一組可視區只算一次
  const _ov = new THREE.Matrix4(), _ovp = new V(), ovC = { key: '', v: null };
  function overviewView() {
    const f = free(), withSeal = homeDone || !!(flight && flight.home), key = [f.w.toFixed(3), f.h.toFixed(3), camera.aspect.toFixed(3), withSeal].join();
    if (ovC.key === key) return { pos: ovC.v.pos.clone(), tgt: ovC.v.tgt.clone() };
    const pts = []; centers.forEach(c => { pts.push(c.clone().add(new V(-5, 1, 0)), c.clone().add(new V(5, 1, 0)), c.clone().add(new V(0, 1, -5)), c.clone().add(new V(0, 1, 5)), c.clone().setY(0)); });
    pts.push(title.position.clone().add(new V(0, 3.6, 0)), title.position.clone().add(new V(0, -3.6, 0)), cN.clone().add(new V(11, 1, 0))); // 末站名牌在島右側
    if (withSeal) [[7, 7, 0], [-7, -7, 0], [0, 7, 7], [0, -7, -7], [7, 0, -7], [-7, 0, 7]].forEach(o => pts.push(seal.position.clone().add(new V(...o)))); // 朱印面向鏡頭，三軸都留邊
    const ctr = new THREE.Box3().setFromPoints(pts).getCenter(new V()), tx = tanH() * camera.aspect * f.w * 0.97, ty = tanH() * f.h * 0.93;
    let best = null;
    // 第六輪：直式手機改高俯角（50–60°）、從側面看讓雲路沿畫面縱向排；橫式多試方位與仰角
    const portrait = camera.aspect * f.w < 0.9;
    const els = withSeal ? (portrait ? [55, 62, 70] : [38, 45, 52]) : portrait ? [45, 50, 55, 60] : [10, 14, 19, 26, 32, 40]; // 結尾：夕陽鳥瞰
    const azs = portrait ? [60, 75, 90, 105, 120, -60, -75, -90, -105, -120] : [-20, -10, 0, 10, 20, 35, 45, 55, 65, 75];
    for (const el of els) for (const az of azs) {
      const dir = new V().fromArray(scDir(el, az));
      const fits = d => { const pos = ctr.clone().addScaledVector(dir, d); _ov.lookAt(pos, ctr, Yax).setPosition(pos).invert();
        return pts.every(q => { _ovp.copy(q).applyMatrix4(_ov); return _ovp.z < -1 && Math.abs(_ovp.x / _ovp.z) <= tx && Math.abs(_ovp.y / _ovp.z) <= ty; }); };
      let lo = 10, hi = 600; for (let i = 0; i < 22; i++) { const m = (lo + hi) / 2; if (fits(m)) hi = m; else lo = m; }
      const pos = ctr.clone().addScaledVector(dir, hi); _ov.lookAt(pos, ctr, Yax).setPosition(pos).invert();
      const sp = centers.map(c => { _ovp.copy(c).applyMatrix4(_ov); return [_ovp.x / -_ovp.z, _ovp.y / -_ovp.z, 5 / -_ovp.z]; }); // 畫面座標＋島半徑
      const apart = sp.every((q, i) => !i || Math.hypot(q[0] - sp[i - 1][0], q[1] - sp[i - 1][1]) > 1.5 * (q[2] + sp[i - 1][2]) / 2); // 相鄰兩島不疊在一起
      const rs = sp.map(q => q[2]), score = Math.log(Math.min(...rs)) + 0.1 * rs.reduce((s, r) => s + Math.log(r), 0) / rs.length; // maximin：最小的島盡量大（幾何平均只當平手時的參考）
      if (apart && (!best || score > best.score)) best = { score, pos, tgt: ctr, el, az };
    }
    if (!best) { const pos = ctr.clone().addScaledVector(new V().fromArray(scDir(20, 45)), 260 * SC_CAM.fov / fovTo); best = { pos, tgt: ctr }; } // 理論上不會發生：至少正側面一定分得開
    ovC.key = key; ovC.v = best;
    return { pos: best.pos.clone(), tgt: best.tgt.clone() };
  }
  ctx.overviewView = overviewView; // 給驗收腳本看
  ctx.mkChibi = lpChibi;           // 給驗收腳本排人物造型

  // ---------- 鏡頭狀態：tween（終點可動態）、ride（站點全景／特寫）；移動中在 stepFlight ----------
  const cam = { tw: null, ride: null, end: null, userMoved: false, follow: null };
  const _o0 = new V(), _o1 = new V(), _tq = new THREE.Quaternion(), _tq2 = new THREE.Quaternion();
  function tweenTo(endFn, dur, ease = easeInOutCubic, from) {
    cam.end = endFn; cam.userMoved = false; cam.follow = null;
    const p0 = (from ? from.pos : camera.position).clone(), t0 = (from ? from.tgt : controls.target).clone();
    cam.tw = { endFn, dur: ctx.reduced ? 1e-3 : dur, t: 0, ease, p0, t0 };
    if (from) { camera.position.copy(from.pos); controls.target.copy(from.tgt); }
  }
  controls.addEventListener('start', () => { cam.tw = null; cam.follow = null; cam.userMoved = true; });
  const setZoom = far => { controls.maxDistance = far ? 600 : SC_CAM.maxD; fovTo = far ? SC_CAM.ovFov : SC_CAM.fov; };
  const toPlanetView = (p, dur = 1.6) => { cam.ride = p; ctx.view = 'planet'; setZoom(false); tweenTo(planetEnd(p), dur); };

  // ---------- 換站＝主角騎大青蛙，踩著荷葉跳石一路跳過去（ctx.goPlanet、ctx.goHome） ----------
  let flight = null, homeDone = false;
  const heroWorld = p => centers[p.index].clone().add(new V(SC_HERO_AT[0], 0, SC_HERO_AT[1]));
  ctx.goPlanet = id => {
    const B = ctx.planetById.get(id); if (!B || flight) return;
    const A = ctx.planetById.get(ctx.current);
    if (!A || A === B) { ctx.current = id; placeAt(B); placeFrog(B); skyTo(B.id); toPlanetView(B); ctx.emit('arrive', { id }); return; }
    pw.path = null; pw.done = null; homeDone = false; stepSeal(0); setZoom(false);
    const pads = segOf(A, B); pads.forEach(g => { g.visible = true; });
    const f0 = fg.mv ? fg.mv.b : frog.position.clone(); fg.mv = null; // 讓位中（第三輪 cam P1）：先從讓位點跳回待機點，多一跳
    const pts = [...(fg.away && fg.p === A ? [f0] : []), // 主角可能還站在元素旁：hA 取目前位置上蛙
      frogSpot(A).setY(centers[A.index].y), ...pads.map(g => g.position.clone().setY(0.05)), frogSpot(B).setY(centers[B.index].y)];
    fg.away = false; fg.hide = false; frog.scale.setScalar(1); frog.visible = true;
    const plan = scHopPlan(pts.slice(1).map((q, i) => Math.hypot(q.x - pts[i].x, q.z - pts[i].z)));
    const D = pts[pts.length - 1].clone().sub(pts[0]).setY(0).normalize(), sd = new V().crossVectors(D, Yax).normalize(); if (sd.z < 0) sd.negate();
    const sg = scChaseSide(pts[0].toArray(), pts[pts.length - 1].toArray(), ctx.planets.filter(q => q !== A && q !== B).map(q => q.data.pos));
    flight = { from: A.id, to: B.id, A, B, t: 0, T: 0, dur: ctx.reduced ? 0.6 : plan.dur, skip: false, type: 'frog', home: false, pts, pads, plan, D, side: sd.multiplyScalar(sg), landed: -1,
      hA: hero.getWorldPosition(new V()), hB: heroWorld(B), p0: pts.length - pads.length - 2, v0: { pos: camera.position.clone(), tgt: controls.target.clone() }, eB: planetEnd(B), heroIn: false, cp: null, ct: null, g: pts[0].clone() };
    ctx.flying = true; ctx.view = 'flight'; cam.tw = null; cam.ride = null; cam.follow = null; controls.enabled = false; fg.ride = true;
    skyTo(A.id, B.id, 0);
    ctx.emit('flight', { from: A.id, to: B.id, t: 0, type: 'frog', home: false, phase: 'mount' });
  };
  // 結尾：夕陽西下，鏡頭拉高成鳥瞰整座蓮池，末站上空蓋一方朱印「君子」；完成後 emit('home')
  ctx.goHome = () => {
    if (flight) return;
    const A = ctx.planetById.get(ctx.current) || ctx.planets[ctx.planets.length - 1];
    flight = { from: A.id, to: A.id, A, B: A, t: 0, T: 0, dur: ctx.reduced ? 0.6 : 6, skip: false, type: 'home', home: true };
    ctx.flying = true; controls.enabled = false; cam.ride = null; ctx.view = 'overview'; setZoom(true);
    tweenTo(overviewView, 3.6);
    ctx.emit('flight', { from: A.id, to: A.id, t: 0, type: 'home', home: true });
  };
  function stepSeal(k) { // 0→1：朱印從略大、透明壓下來
    seal.visible = k > 0.001; seal.material.opacity = scSmooth(0, 0.5, k) * 0.95; seal.scale.setScalar(1 + 0.5 * (1 - scSmooth(0, 1, k)));
  }
  function stepHome(f) {
    stepSeal(Math.max(homeDone ? 1 : 0, scSmooth(0.6, 0.85, f.t)));
    if (f.t >= 1) { flight = null; ctx.flying = false; controls.enabled = true; homeDone = true; stepSeal(1); if (cam.tw) cam.tw.t = 1;
      ctx.emit('flight', { from: f.from, to: f.to, t: 1, type: 'home', home: true }); ctx.emit('home', { id: f.to }); return; }
    ctx.emit('flight', { from: f.from, to: f.to, t: f.t, type: 'home', home: true });
  }
  function landFlight(f) {
    ctx.current = f.to; placeAt(f.B); placeFrog(f.B); fg.ride = false; frog.userData.set({});
    hero.rotation.x = 0;
    const s = segs.get((f.A.index < f.B.index ? f.A.id + '>' + f.B.id : f.B.id + '>' + f.A.id));
    f.pads.forEach(g => { g.position.y = 0; g.userData.sink = 0; if (s && s.tmp) g.visible = false; else g.userData.bloom.visible = true; });
    setVeil(0); skyTo(f.B.id);
    const v = f.eB(); camera.position.copy(v.pos); controls.target.copy(v.tgt);
    flight = null; ctx.flying = false; controls.enabled = true; cam.ride = f.B; ctx.view = 'planet'; cam.end = f.eB; cam.userMoved = false;
    ctx.emit('flight', { from: f.from, to: f.to, t: 1, type: f.type, home: false, phase: 'off' });
    ctx.emit('arrive', { id: f.to });
  }
  const _rp = new V(), _rq = new V(), _fp = new V(), _ft = new V(), _side = new V(), _up = new V(), _w = new V(), _sw = new V(), _fa = new V();
  const toWorld = () => { if (hero.parent !== scene) { hero.getWorldPosition(_w); scene.add(hero); hero.position.copy(_w); hero.scale.setScalar(1); } };
  // 跳：從 a 跳到 b（拋物線，最高多 h）
  const hop = (a, b, k, h, out) => out.lerpVectors(a, b, k).add(_up.set(0, h * 4 * k * (1 - k), 0));
  const turnFrog = (want, dt, rate) => { let d = want - fg.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); fg.yaw += d * Math.min(1, dt * rate); frog.rotation.set(0, fg.yaw, 0); };
  const yawTo = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);
  function stepFlight(dt) {
    const f = flight;
    f.T = f.skip ? f.dur : Math.min(f.dur, f.T + dt); f.t = f.T / f.dur;
    if (f.type === 'home') return stepHome(f);
    if (f.t >= 1) return landFlight(f);
    skyS.mix = scSmooth(0.3, 0.75, f.t); skyApply();
    if (ctx.reduced) { // 減少動態：淡出→換位→淡入
      setVeil(f.t < 0.5 ? f.t * 2 : (1 - f.t) * 2);
      if (f.t >= 0.5 && !f.heroIn) { f.heroIn = true; placeAt(f.B); placeFrog(f.B); const v = f.eB(); camera.position.copy(v.pos); controls.target.copy(v.tgt); camera.lookAt(v.tgt); }
      ctx.emit('flight', { from: f.from, to: f.to, t: f.t, type: 'frog', home: false, phase: 'fade' }); return;
    }
    const T = f.T, P = f.plan, H = P.hops, pts = f.pts, fd = frog.userData, last = pts.length - 1;
    const seatW = () => { frog.updateMatrixWorld(true); return fd.seat.getWorldPosition(_sw).addScaledVector(Yax, -heroC.userData.seatY); };
    let phase, lean = 0;
    // 青蛙：上蛙時轉向第一顆跳石、微蹲 → 每跳：蹲低蓄力、騰空（後腿蹬直→前腳前伸）、落地壓扁（小葉被壓沉、水花） → 主角滑下後轉回待機方向
    if (T < H[0].t0) {
      phase = 'mount'; frog.position.copy(pts[0]); turnFrog(yawTo(pts[0], pts[1]), dt, 3); fd.set({ crouch: 0.35 * scSmooth(0.4, 1, T / H[0].t0) });
      f.g.copy(pts[0]);
    } else if (T < P.off) {
      phase = 'hop'; let i = 0; while (i + 1 < H.length && T >= H[i + 1].t0) i++;
      const h = H[i], a = pts[i], b = pts[i + 1], l = T - h.t0;
      if (l < h.c) { const k = l / h.c; frog.position.copy(a); turnFrog(yawTo(a, b), dt, 8); fd.set({ crouch: 0.35 + 0.65 * scSmooth(0, 0.8, k), pitch: 0.12 * k }); lean = -0.1 * k; f.g.copy(a); }
      else if (l < h.c + h.a) {
        const k = (l - h.c) / h.a, arc = 0.9 + h.d * 0.12 + Math.max(0, b.y - a.y) * 0.6;
        frog.position.lerpVectors(a, b, k).add(_up.set(0, arc * 4 * k * (1 - k), 0)); frog.rotation.set(0, fg.yaw, 0);
        fd.set({ ext: k < 0.5 ? scSmooth(0, 0.12, k) : 1 - scSmooth(0.45, 0.8, k), reach: scSmooth(0.5, 0.85, k), pitch: 0.5 * (1 - 2 * k) });
        lean = k < 0.5 ? -0.32 * (1 - scSmooth(0.15, 0.5, k)) : 0.24 * scSmooth(0.6, 0.9, k); // 起跳往後仰、落地前前傾
        f.g.lerpVectors(a, b, k);
      } else {
        const k = (l - h.c - h.a) / h.l, pad = i >= f.p0 && i - f.p0 < f.pads.length ? f.pads[i - f.p0] : null;
        if (f.landed < i) { f.landed = i; if (pad) { splashAt(b); pad.userData.sink = 1; pad.userData.bloom.visible = true; } }
        frog.position.copy(b); if (pad) frog.position.y = b.y + pad.position.y;
        fd.set({ squash: Math.sin(Math.min(1, k * 1.4) * Math.PI) * (1 - 0.4 * k), crouch: 0.5 * (1 - k), reach: 0.3 * (1 - k) }); lean = 0.18 * (1 - k); f.g.copy(b);
      }
    } else { phase = 'off'; frog.position.copy(pts[last]); turnFrog(scFrogPose(f.B.id).yaw, dt, 2.5); fd.set({ crouch: 0.15 }); f.g.copy(pts[last]); }
    // 主角：跳上蛙背坐好 → 跟著跳（起跳後仰、落地前傾） → 滑下站到葉前緣
    if (T < H[0].t0) {
      toWorld(); blob.visible = false; const k = scSmooth(0, 1, T / H[0].t0);
      hop(f.hA, seatW(), k, 0.6, hero.position); pw.yaw = fg.yaw; hero.rotation.set(0, fg.yaw, 0); setPose(k > 0.5 ? 'sit' : 'stand');
    } else if (T < P.off) {
      toWorld(); blob.visible = false; hero.position.copy(seatW()); hero.rotation.set(lean, fg.yaw, 0, 'YXZ'); pw.yaw = fg.yaw; setPose('sit');
    } else {
      toWorld(); const k = scSmooth(0, 1, (T - P.off) / SC_HOP.off);
      hop(seatW(), f.hB, k, 0.35, hero.position); hero.rotation.set(0, pw.yaw, 0); setPose(k > 0.5 ? 'stand' : 'sit'); blob.visible = k >= 1;
    }
    // 鏡頭：起點取景 → 側後方跟拍 → 終點取景。跟拍方向固定＝A→B 水平方向；注視點跟「低通過的地面軌跡」（不含跳躍弧線）→ 鏡頭不上下甩
    const tk = H[0].t0 + H[0].c, tl = P.off;
    const dir = f.D, wk = clamp(0.9 / (camera.aspect * free().w), 1, 1.8); _side.copy(f.side);
    if (!f.gl) f.gl = f.g.clone(); f.gl.lerp(f.g, 1 - Math.exp(-dt * (wk > 1.2 ? 3.2 : 1.8))); // 第三輪（cam P7）：直式畫面窄（半寬約 2.4），地面軌跡跟緊一點，青蛙才不會跑出右緣
    _fa.copy(f.gl).setY(Math.max(0.6, f.gl.y) + 0.6);
    _ft.copy(_fa).addScaledVector(dir, 2.5);
    _fp.copy(_fa).addScaledVector(dir, -SC_CHASE.back * wk).addScaledVector(_side, SC_CHASE.side * wk).add(_up.set(0, 6.5, 0)); // 夠高：視線越過剛離開的荷葉
    const vB = f.eB(), s0 = scSmooth(H[0].t0 * 0.4, tk + 0.9, T), s1 = scSmooth(lerp(tk, tl, 0.62), tl + 0.1, T);
    _fp.lerp(vB.pos, scSmooth(lerp(tk, tl, 0.45), lerp(tk, tl, 0.8), T) * 0.6);
    if (!f.cp) { f.cp = _fp.clone(); f.ct = _ft.clone(); }
    const kk = 1 - Math.exp(-dt * 3); f.cp.lerp(_fp, kk); f.ct.lerp(_ft, kk);
    controls.target.copy(f.v0.tgt).lerp(f.ct, s0).lerp(vB.tgt, s1);
    camera.position.copy(f.v0.pos).lerp(f.cp, s0).lerp(vB.pos, s1);
    if (camera.position.y < 0.6) camera.position.y = 0.6;
    // 視線方向轉速上限 60°/s（直式 75°/s）；最後一跳落地後放寬到 85°/s，保證到站時對準終點取景
    const want = _rp.copy(controls.target).sub(camera.position).normalize();
    if (!f.look) f.look = f.v0.tgt.clone().sub(f.v0.pos).normalize();
    const ang = f.look.angleTo(want), cap = (T > tl ? 85 : wk > 1.2 ? 75 : 60) * D2R * dt; // 直式 75°/s
    f.far ??= f.v0.pos.distanceTo(f.v0.tgt) > 40; // 從全景俯衝下來：俯衝段直接看注視點（限速會讓鏡頭整段看著地平線）
    if (f.far && s0 < 1) f.look.copy(want);
    else if (ang > 1e-5) { _tq.setFromUnitVectors(f.look, want); _tq2.identity().slerp(_tq, Math.min(1, cap / ang)); f.look.applyQuaternion(_tq2).normalize(); }
    camera.lookAt(_rq.copy(camera.position).add(f.look));
    ctx.emit('flight', { from: f.from, to: f.to, t: f.t, type: 'frog', home: false, phase });
  }
  ctx.flightState = () => flight && { type: flight.type, T: flight.T, dur: flight.dur, hops: flight.plan ? flight.plan.hops.length : 0, stones: flight.pads ? flight.pads.length : 0 }; // 給驗收腳本看
  addEventListener('keydown', e => { if (e.key === 'Escape' && flight) flight.skip = true; });
  ctx.skipFlight = () => { if (flight) flight.skip = true; }; // D 線「略過」鈕

  // ---------- 元素特寫：從元素外側（島邊那一面）看向元素，被擋就換方位或抬高 ----------
  ctx.focusEl = (planetId, elId) => {
    const p = ctx.planetById.get(planetId); if (!p || flight) return;
    const here = pw.p === p, gp = p.group.position;
    const roots = []; p.group.traverse(o => { const k = o.userData.pick; if (k && k.el === elId && !(o.parent && o.parent.userData.pick === k)) roots.push(o); });
    if (!elId || !roots.length) { if (here) walkTo(p, SC_HERO_AT.slice(), null, null); frogHome(); toPlanetView(p, here ? 2.2 : 1.6); return; }
    p.group.updateMatrixWorld(true); setZoom(false);
    const box = new THREE.Box3(); roots.forEach(o => box.union(new THREE.Box3().setFromObject(o)));
    const c = box.getCenter(new V()), sz = box.getSize(new V());
    const lb = { x0: box.min.x - gp.x, x1: box.max.x - gp.x, z0: box.min.z - gp.z, z1: box.max.z - gp.z };
    const st = scStandFor(lb, (p.group.userData.standSpots || {})[elId]);
    const lc = new V(c.x - gp.x, 0, c.z - gp.z);
    const dur = here ? walkTo(p, st, elId, lc) : 0;
    const sp = new V(gp.x + st[0], gp.y, gp.z + st[1]), head = sp.clone().setY(gp.y + 0.7);
    const cy = Math.min(c.y, Math.max(gp.y + 1.0, box.min.y + 1.2)); // 高大建築只看下半截（門口、人站的高度）
    // 第三輪（cam P4）：直式手機注視點偏向主角（0.35），距離上限 10→15，主角一定在畫面裡、元素寧可切一點
    const portrait = camera.aspect * free().w < 0.9;
    const ec = c.clone().setY(cy), mid = here ? head.clone().lerp(ec, portrait ? 0.35 : 0.5) : ec;
    // 外側方向：元素（與主角）離島中心的方向；元素在島中央就從主角那側看
    const out = lc.clone().add(new V(st[0], 0, st[1]).multiplyScalar(0.6)); if (out.length() < 0.8) out.set(st[0], 0, st[1] + 1);
    const kind = ((p.data && p.data.elements) || []).find(x => x.id === elId)?.kind;
    if (kind === 'building') out.set(out.x * 0.6, 0, Math.abs(out.z) * 0.3 + 1.5); // 建築門面朝 +z：從前側看，不繞到屋背
    else if (here) { const f = scFocusDir([lc.x, lc.z], st, [out.x, out.z]); out.set(f[0], 0, f[1]); } // 第三輪（cam P3）：從主角斜側方看，主角不背對、不擋元素
    const h = out.normalize(), e = SC_CAM.focusEl * D2R;
    const span = here ? Math.max(sp.distanceTo(new V(c.x, sp.y, c.z)) / 2 + Math.min(Math.max(sz.x, sz.z), 3) * 0.45 + 0.9, 1.6) : Math.max(Math.min(Math.max(sz.x, sz.z), 5) * 0.6, 1.3);
    const want = clamp(Math.max(fitW(span), fitH(Math.max(1.2, Math.min(sz.y, 3) * 0.6))), SC_CAM.minD, portrait ? 15 : 10);
    const mine = o => o.userData.pick && o.userData.pick.el === elId;
    // 第三輪（cam P2）：起點加上主角頭——主角也要看得到，不只元素
    const v = clearDir(p, mid, h.multiplyScalar(Math.cos(e)).setY(Math.sin(e)), want, o => mine(o) || inHero(o), here ? [head, mid, ec] : [mid]);
    frogYield(p, box, sp, ec, mid.clone().addScaledVector(v.d, v.dist), here ? [head, ec] : [ec]);
    ctx.view = 'focus'; cam.ride = p;
    const end = () => ({ pos: mid.clone().addScaledVector(v.d, v.dist), tgt: mid.clone() });
    if (!dur) { tweenTo(end, 1.4); return; }
    cam.tw = null; cam.end = end; cam.userMoved = false;
    const _h = new V();
    cam.follow = { end, look: () => hero.localToWorld(_h.set(0, 0.5, 0)).multiplyScalar(0.6).addScaledVector(ec, 0.4) };
  };
  ctx.overview = () => {
    if (flight) return;
    cam.ride = null; ctx.view = 'overview'; setZoom(true);
    tweenTo(overviewView, 1.8);
  };

  // ---------- 點選與滑鼠手指 ----------
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), groups = ctx.planets.map(p => p.group);
  function pickAt(x, y) {
    ndc.set(x / innerWidth * 2 - 1, -(y / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera);
    const h = ray.intersectObjects(groups, true).find(h => h.object.visible && !(h.object.userData.fadeMat && h.object.userData.fadeA < 0.5));
    return (h && h.object.userData.pick) || null;
  }
  let down = null, hov = null, hovKey = '', hovLit = [], bump = null;
  const elRoots = pk => { const p = pk && ctx.planetById.get(pk.planet), r = []; if (p) p.group.traverse(o => { const k = o.userData.pick; if (k && k.el === pk.el && !(o.parent && o.parent.userData.pick === k)) r.push([o, o.scale.clone()]); }); return r; };
  // 第六輪（cam 9）：hover 時元素材質提亮（emissive +0.15，換成複本，不動共用材質）；淡出中的物件不碰
  function lightUp(roots) {
    roots.forEach(([r]) => r.traverse(o => { if (!o.isMesh || Array.isArray(o.material) || o.userData.fadeMat || !o.material.emissive) return;
      const m = o.material.clone(); m.emissive.addScalar(0.15); o.userData.hovBase = o.material; o.userData.hovMat = m; o.material = m; hovLit.push(o); }));
  }
  function lightOff() {
    hovLit.forEach(o => { const u = o.userData; if (o.material === u.hovMat) o.material = u.hovBase; else if (u.baseMat === u.hovMat) u.baseMat = u.hovBase;
      u.hovMat.dispose(); u.hovMat = u.hovBase = null; }); hovLit = [];
  }
  // shortcut: hover 直接覆寫元素根物件的 scale；若 A/B 的動畫也改根物件 scale 會被蓋掉，到時改成包一層群組
  function setHover(pk) {
    const key = pk ? pk.planet + '/' + pk.el : ''; if (key === hovKey) return; hovKey = key;
    if (hov) hov.forEach(([o, s0]) => o.scale.copy(s0)); hov = null; lightOff();
    if (!pk) return; hov = elRoots(pk); lightUp(hov);
  }
  let holdT = null; // 移動中：長按 0.5 秒才略過（避免手機誤觸），Esc 照舊
  renderer.domElement.addEventListener('pointerdown', e => { if (flight) { clearTimeout(holdT); holdT = setTimeout(() => { if (flight) flight.skip = true; }, 500); down = null; return; } down = [e.clientX, e.clientY]; });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(n => renderer.domElement.addEventListener(n, () => clearTimeout(holdT)));
  renderer.domElement.addEventListener('pointerup', e => {
    if (down && Math.hypot(e.clientX - down[0], e.clientY - down[1]) <= (e.pointerType === 'touch' ? 10 : 6)) {
      const pk = pickAt(e.clientX, e.clientY); if (pk) ctx.emit('pick', { planet: pk.planet, el: pk.el });
      if (pk && e.pointerType !== 'mouse' && !hov) { if (bump) bump.r.forEach(([o, s0]) => o.scale.copy(s0)); bump = { r: elRoots(pk), t: 0 }; } // 觸控：點下放大回彈 0.15 秒
    }
    down = null;
  });
  renderer.domElement.addEventListener('pointermove', e => { if (e.pointerType !== 'mouse' || flight) return; const pk = pickAt(e.clientX, e.clientY); renderer.domElement.style.cursor = pk ? 'pointer' : ''; setHover(pk); });
  renderer.domElement.addEventListener('pointerleave', () => setHover(null));

  // ---------- resize ----------
  const resize = () => {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h); labelRenderer.setSize(w, h); camera.aspect = w / h; applyOffset(); camera.updateProjectionMatrix(); postSize();
    if (cam.end && !cam.userMoved && !flight && !cam.follow) tweenTo(cam.end, 0.5);
  };
  addEventListener('resize', resize); resize();

  // ---------- 起始：?planet 直接停；否則從高空雲中盤旋降到第一站 ----------
  const qp = ctx.planetById.get(QS.get('planet')), first = qp || ctx.planets[0], auto = QS.get('auto') === '1';
  ctx.current = first.id; placeAt(first); placeFrog(first); skyTo(first.id);
  const e0 = planetEnd(first), v0 = e0(); cam.ride = first;
  if (qp || ctx.reduced || QS.get('view') === 'overview') { camera.position.copy(v0.pos); controls.target.copy(v0.tgt); cam.end = e0; }
  else tweenTo(e0, 4.2, x => 1 - Math.pow(1 - x, 3), { pos: v0.tgt.clone().add(new V(-14, 9, 16)), tgt: v0.tgt.clone().add(new V(0, -2, 0)) });
  camera.lookAt(controls.target);
  ctx.on('ready', () => {
    if (QS.get('view') === 'overview') ctx.overview();
    if (auto) { // 截圖驗收：依序走完六站，每站停 2 秒，最後 goHome
      const next = () => { const i = ids.indexOf(ctx.current); if (i >= 0 && i < ids.length - 1) ctx.goPlanet(ids[i + 1]); else if (i === ids.length - 1 && !homeDone) ctx.goHome(); };
      ctx.on('arrive', () => setTimeout(next, 2000)); setTimeout(next, 1500);
    }
  });

  // ---------- 靠近鏡頭的前景物件淡出（特寫或繞島時屋簷、樹不會切邊擋住畫面）；GLB 換上後重建清單 ----------
  const _fs = new THREE.Sphere(), fading = new Set();
  let nearR = 1; const nearW = d => d < nearR * 0.3 ? 0 : d < nearR ? (d - nearR * 0.3) / (nearR * 0.7) : 1;
  const inPlanetGroup = (o, p) => { for (let q = o; q; q = q.parent) if (q === p.group) return true; return false; };
  // 第六輪（cam 7）：鏡頭→主角頭的射線上擋住的物件也淡出（每 6 幀測一次；layers 全開＝已移到 overlay 的也測得到，免得閃爍）
  const occR = new THREE.Raycaster(), occHit = new Set(), _oh = new V(), _od = new V(); occR.layers.enableAll(); let occN = 0;
  function heroOccluders(p) {
    if (++occN % 6) return; occHit.clear();
    if (hero.parent !== p.group || ctx.view === 'overview') return;
    for (const y of [0.45, 1.05]) { // 第三輪（cam P2）：身體與臉各打一條
      hero.localToWorld(_oh.set(0, y, 0)); _od.subVectors(_oh, camera.position); const L = _od.length(); if (L < 0.5) continue;
      occR.set(camera.position, _od.divideScalar(L)); occR.near = 0.2; occR.far = L - 0.4;
      occR.intersectObject(p.group, true).forEach(h => { const o = h.object; if (o.isMesh && !o.isInstancedMesh && !inHero(o) && p.fadeList && p.fadeList.includes(o)) occHit.add(o); }); }
  }
  function fadeNear(dt) {
    const p = cam.ride; if (!p) return;
    nearR = Math.max(1.5, 0.5 * camera.position.distanceTo(controls.target));
    heroOccluders(p);
    // 第三輪（cam P10）：葉旁點綴 leaf-deco（浮葉＋葉緣大荷花，合併成一個半徑約 8 的 mesh）也收進來：特寫時整個淡掉，前景不再被大荷花遮住
    if (!p.fadeList || p.fadeGen !== LP_GLB_GEN) { p.fadeGen = LP_GLB_GEN; p.fadeList = []; p.group.traverse(o => { if (!o.isMesh || o.isInstancedMesh || inHero(o) || Array.isArray(o.material) || (o.parent && o.parent.name === 'lotusleaf' && o.name !== 'leaf-deco')) return;
      if (o.name === 'leaf-deco') o.userData.deco = true;
      if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere(); p.fadeList.push(o); }); }
    p.fadeList.forEach(o => {
      if (!o.parent) return;
      _fs.copy(o.geometry.boundingSphere).applyMatrix4(o.matrixWorld);
      const occ = occHit.has(o) && _fs.radius <= 6; // 第三輪（cam P2）：4→6，合併成一大坨的花樹也淡得掉
      const deco = o.userData.deco && ctx.view === 'focus';
      if (_fs.radius > 3 && !occ && !deco) return;
      const d = _fs.distanceToPoint(camera.position), want = deco ? 0 : occ ? 0.2 : nearW(d);
      // 第六輪（cam 6）：淡出材質不寫深度，淡到 0.9 以下移到 overlay 層（不進細墨線描邊＝不留鬼影）
      const u = o.userData; if (want < 1 && !u.fadeMat) { u.baseMat = o.material; u.fadeMat = o.material.clone(); u.fadeMat.transparent = true; u.fadeMat.depthWrite = false; u.fadeA = 1; o.material = u.fadeMat; fading.add(o); }
    });
    fading.forEach(o => { const u = o.userData;
      _fs.copy(o.geometry.boundingSphere).applyMatrix4(o.matrixWorld);
      const inP = o.parent && cam.ride && inPlanetGroup(o, cam.ride), d = inP ? _fs.distanceToPoint(camera.position) : 99;
      const want = u.deco ? (inP && ctx.view === 'focus' ? 0 : 1) : inP && occHit.has(o) && _fs.radius <= 6 ? Math.min(0.2, nearW(d)) : nearW(d);
      u.fadeA += (want - u.fadeA) * Math.min(1, dt * 5); u.fadeMat.opacity = u.fadeA * (u.baseMat.opacity ?? 1); o.visible = u.fadeA > 0.03;
      o.layers.set(u.fadeA < 0.9 ? LP_OVERLAY : 0);
      if (want === 1 && u.fadeA > 0.98) { o.material = u.baseMat; o.visible = true; o.layers.set(0); u.fadeMat.dispose(); u.fadeMat = null; fading.delete(o); }
    });
  }

  // ---------- 手機：被畫面左右切邊的名牌整個藏起來 ----------
  const _lv = new V(), _hp = new V(), _hu = new V();
  function cutLabels() {
    if (!(IS_MOBILE || innerWidth <= 900)) return;
    labObjs.forEach(([o]) => { const el = o.element; _lv.copy(o.position).project(camera);
      if (el._wk !== labels.short) { el._wk = labels.short; el._w = el.offsetWidth / 2; }
      const x = (_lv.x + 1) / 2 * innerWidth, w = el._w || 60, cut = _lv.z > 1 || x - w < 4 || x + w > innerWidth - 4;
      if (cut !== !!el._cut) { el._cut = cut; el.style.opacity = cut ? '0' : ''; } });
  }

  // ---------- 第六輪（cam 5）總覽 LOD：島在畫面半徑 < 90px 就只留島身＋主建築（kind=building），其餘小物件先藏起來 ----------
  const lodHidden = new Map(); // planet id → 被藏起來的物件
  function lodList(p) {
    if (p.lodList) return p.lodList;
    const keepEl = new Set(((p.data && p.data.elements) || []).filter(e => e.kind === 'building').map(e => e.id)), out = [];
    const keeps = o => { let k = false; o.traverse(q => { if (q.userData.pick && keepEl.has(q.userData.pick.el)) k = true; }); return k; };
    const walk = o => o.children.forEach(c => {
      if (c === hero) return;
      if (c === p.isle) { c.children.forEach(q => { if (/leaf-(deco|dew|thorns|dragonfly)/.test(q.name)) out.push(q); }); return; }
      if (c.userData.pick && keepEl.has(c.userData.pick.el)) return;
      if (keeps(c)) walk(c); else out.push(c);
    });
    walk(p.group); return (p.lodList = out);
  }
  function stepLod() {
    const ov = ctx.view === 'overview', pxk = innerHeight / 2 / Math.tan(camera.fov * Math.PI / 360);
    ctx.planets.forEach((p, i) => {
      // 第三輪（cam P5）：門檻隨視窗高度放大（900 高 → 116px），桌機 1440×900 總覽島半徑 100–140px 也收得到；目標總覽 < 300 calls
      const small = ov && SC_ISLE.R / Math.max(1, camera.position.distanceTo(centers[i])) * pxk < 150 * Math.max(1, innerHeight / 700), hid = lodHidden.get(p.id);
      if (small && !hid) { const h = lodList(p).filter(o => o.visible); h.forEach(o => { o.visible = false; }); lodHidden.set(p.id, h); }
      else if (!small && hid) { hid.forEach(o => { o.visible = true; }); lodHidden.delete(p.id); }
    });
  }

  // ---------- render loop ----------
  const clock = new THREE.Clock(), perf = { n: 0, sum: 0, on: false }; let insKey = '';
  ctx.on('ready', () => setTimeout(() => { perf.on = qPin == null; }, 2500));
  ctx.start = () => renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.1), t = clock.elapsedTime;
    anims.forEach(f => f(dt, t));
    const travel = flight && flight.type !== 'home';
    if (!travel && pw.p && hero.parent === pw.p.group) stepHero(dt, t); else if (!travel) setPose('stand');
    if (!fg.ride) stepFrogIdle(dt);
    if (fg.hide || frog.scale.x < 1) { const k = frog.scale.x + ((fg.hide ? 0 : 1) - frog.scale.x) * Math.min(1, dt * 6); frog.scale.setScalar(k > 0.995 ? 1 : k); frog.visible = k > 0.03; fly.visible &&= frog.visible; } // 讓位找不到背後落點：縮小隱去
    stepSplash(dt); stepPads(dt, t);
    heroC.userData.anim?.(dt, t);
    if (travel) stepFlight(dt);
    else {
      if (flight) stepFlight(dt); // goHome：朱印
      const I = insets(), k2 = [I.left, I.right, I.top, I.bottom].join();
      if (k2 !== insKey) { insKey = k2; if (cam.end && !cam.userMoved && !cam.tw && !cam.follow) tweenTo(cam.end, 0.8); }
      if (cam.tw) {
        const w = cam.tw; w.t = Math.min(1, w.t + dt / w.dur); const e = w.ease(w.t), end = w.endFn();
        controls.target.lerpVectors(w.t0, end.tgt, e);
        const o0 = _o0.subVectors(w.p0, w.t0), o1 = _o1.subVectors(end.pos, end.tgt), l = lerp(o0.length(), o1.length(), e);
        _tq.setFromUnitVectors(o0.normalize(), o1.normalize()); _tq2.identity().slerp(_tq, e);
        camera.position.copy(o0.applyQuaternion(_tq2).multiplyScalar(l)).add(controls.target);
        if (w.t >= 1) { cam.tw = null; cam.push = 0; }
      } else if (cam.follow) { // 主角走路中：target＝主角 60%＋元素 40%，鏡頭臨界阻尼跟上
        const f = cam.follow, end = f.end(), a = 1 - Math.exp(-dt * 2.5);
        controls.target.lerp(f.look(), 1 - Math.exp(-dt * 4));
        const o = _o0.subVectors(camera.position, controls.target), o1 = _o1.subVectors(end.pos, end.tgt), ang = o.angleTo(o1), len = lerp(o.length(), o1.length(), a);
        if (ang > 1e-4) { _tq.setFromUnitVectors(o.clone().normalize(), o1.normalize()); _tq2.identity().slerp(_tq, Math.min(ang * a, 45 * D2R * dt) / ang); o.applyQuaternion(_tq2); }
        camera.position.copy(controls.target).add(o.setLength(len));
        if (!pw.path) tweenTo(f.end, 0.8);
      } else if (cam.ride) {
        if (ctx.view === 'focus' && !cam.userMoved && (cam.push = (cam.push || 0) + dt) < 6) camera.position.lerp(controls.target, dt * 0.02);
      }
      controls.update();
      // 第六輪（cam 1）：鏡頭不鑽進島——在平台（含崖體外鼓）範圍內就不低於頂面 0.6
      if (cam.ride && ctx.view !== 'overview') { const gp = centers[cam.ride.index];
        // 拉近時注視點慢慢抬到平台面上（到站注視點在島體內，近看會只看到地面與裙擺）
        if (cam.userMoved && camera.position.distanceTo(controls.target) < 9 && controls.target.y < gp.y + 0.5) controls.target.y += (gp.y + 0.5 - controls.target.y) * Math.min(1, dt * 3);
        if (Math.hypot(camera.position.x - gp.x, camera.position.z - gp.z) < 6.3 && camera.position.y < gp.y + 0.6) { camera.position.y = gp.y + 0.6; camera.lookAt(controls.target); } }
      if (camera.position.y < 0.5) { camera.position.y = 0.5; camera.lookAt(controls.target); } // 不鑽進水面
    }
    if (Math.abs(camera.fov - fovTo) > 0.01) { camera.fov = ctx.reduced ? fovTo : lerp(camera.fov, fovTo, Math.min(1, dt * 4)); camera.updateProjectionMatrix(); }
    road.visible = ctx.view === 'overview';
    water.position.x = camera.position.x; water.position.z = camera.position.z; waterU.uCam.value.copy(camera.position); waterU.uT.value = t;
    { const dw = homeDone || (flight && flight.home) ? 1 : 0, du = skyU.uDusk; du.value = ctx.reduced ? dw : du.value + (dw - du.value) * Math.min(1, dt * 0.7);
      amb.color.copy(AMB0).lerp(AMBD, du.value); key.color.copy(KEY0).lerp(KEYD, du.value); }
    stepLod();
    sky.position.copy(camera.position);
    // 題簽、朱印永遠正對鏡頭方位（只轉 y）
    title.rotation.y = seal.rotation.y = Math.atan2(camera.position.x - controls.target.x, camera.position.z - controls.target.z);
    title.visible = ctx.view === 'overview'; // 題簽只在總覽出現（站點繞島時會大大擋在左上角）
    // 全景時站與站在畫面上太擠（< 150px）就只留編號
    const shortLab = ctx.view === 'overview' && Math.abs(_lv.copy(centers[1]).project(camera).x - _hu.copy(centers[0]).project(camera).x) / 2 * innerWidth < 150;
    if (shortLab !== labels.short) { labels.short = shortLab; labels.forEach(e => { e.style.display = shortLab ? 'none' : ''; }); }
    if (ctx.view !== 'overview') { // 名牌疊在主角臉上就先藏起來
      hero.getWorldPosition(_hp).add(_hu.set(0, 0.8, 0)).project(camera); const hx = (_hp.x + 1) / 2 * innerWidth, hy = (1 - _hp.y) / 2 * innerHeight;
      labObjs.forEach(([o]) => { _lv.copy(o.position).project(camera); const x = (_lv.x + 1) / 2 * innerWidth, y = (1 - _lv.y) / 2 * innerHeight, hide = Math.abs(x - hx) < 150 && Math.abs(y - hy) < 110;
        if (hide !== !!o.element._face) { o.element._face = hide; o.element.style.clipPath = hide ? 'inset(50%)' : ''; } });
    } else labObjs.forEach(([o]) => { if (o.element._face) { o.element._face = false; o.element.style.clipPath = ''; } });
    // 第六輪（cam 4）：總覽時名牌移到島的畫面右側，不壓在島上；離開總覽放回島前緣下方
    _hu.setFromMatrixColumn(camera.matrixWorld, 0);
    labObjs.forEach(([o], i) => { const c = centers[i]; if (ctx.view === 'overview') o.position.copy(c).addScaledVector(_hu, 7); else o.position.set(c.x, 0.45, c.z + 6.1); });
    const ci = ids.indexOf(flight ? flight.to : ctx.current), labKey = ctx.view === 'overview' ? -1 : ctx.view === 'focus' ? -2 : ci; // 近景只留下一站的名牌；第三輪（cam P10）：特寫時全藏
    if (labKey !== labels.key) { labels.key = labKey; labels.forEach((e, i) => { e.parentNode.style.visibility = labKey === -1 || (labKey >= 0 && (i === ci + 1 || (ci === ids.length - 1 && i === ci - 1))) ? '' : 'hidden'; }); }
    const I = insets(), tx = -((I.left || 0) - (I.right || 0)) / 2, ty = -((I.top || 0) - (I.bottom || 0)) / 2;
    if (Math.abs(tx - ins.x) + Math.abs(ty - ins.y) > 0.3) { const a = 1 - Math.exp(-dt * 6); ins.x += (tx - ins.x) * a; ins.y += (ty - ins.y) * a; applyOffset(); }
    aimLight(); cutLabels();
    if (!flight) fadeNear(dt);
    if (hov) { const k = 1 + 0.035 * (0.5 + 0.5 * Math.sin(t * 7)); hov.forEach(([o, s0]) => o.scale.copy(s0).multiplyScalar(k)); }
    if (bump) { bump.t += dt; const k = bump.t < 0.15 ? 1 + 0.12 * Math.sin(Math.PI * bump.t / 0.15) : 1; bump.r.forEach(([o, s0]) => o.scale.copy(s0).multiplyScalar(k)); if (bump.t >= 0.15) bump = null; }
    ctx.onFrame.forEach(f => f(dt, t));
    render(); labelRenderer.render(scene, camera);
    if (perf.on && tier < scTiers.length - 1) { // 持續掉幀就降一級 pixelRatio
      perf.n++; perf.sum += dt;
      if (perf.n >= 150) {
        if (perf.sum / perf.n > 1 / 38) { tier++; renderer.setPixelRatio(Math.min(devicePixelRatio, scTiers[tier].pr)); resize(); }
        perf.n = 0; perf.sum = 0;
      }
    }
  });
}
