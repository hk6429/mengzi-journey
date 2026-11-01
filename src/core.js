// ================= CORE：共用常數、工具、ctx（整合者維護，各線不要改；需要改請回報） =================
let THREE, OrbitControls, CSS2DRenderer, CSS2DObject, BGU, SimplexNoise, GLTFLoader, MeshoptDecoder;

// 繪本水彩感的低彩度配色；星球與角色優先從這裡取色
const PAL = {
  ink: '#2b2a3a', cream: '#fff6e3', sand: '#e8c98f', dune: '#d9a96a', rose: '#e0506a', leaf: '#7fae6a', leafDk: '#4f7d4a',
  sky: '#9fc3e6', gold: '#f2c14e', scarf: '#f0d34a', coat: '#4f8a5b', hair: '#f4cf4e', skin: '#f6d9bf',
  stone: '#b8aa9a', wood: '#a87a52', purple: '#8a6fb3', red: '#c8473f', blue: '#4a6fa5', lamp: '#ffd37a',
  // 國風潑墨彩色
  paper: '#f3ead6', inkLt: '#9c968a', inkDk: '#2b2622', cinnabar: '#c0392b', rouge: '#b5476b', gamboge: '#e0b13c',
  ochre: '#a0623a', indigo: '#3f6e8c', malachite: '#5c8a6a', azurite: '#2f5d7c', dai: '#3a4a5c'
};

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function seedOf(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

const QS = new URLSearchParams(location.search);
const MOBILE_MQ = '(max-width: 800px), (max-height: 500px) and (pointer: coarse)';
const IS_MOBILE = matchMedia(MOBILE_MQ).matches;
const lsGet = (k, d = null) => { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeInOutCubic = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

// ---------- 星球建造器登記表：parts/planets-*.js 以 LP_BUILD[id] = P => THREE.Group 註冊 ----------
const LP_BUILD = {};

// 材質快取：同色同參數共用一份
// 第四輪：預設 3 階漸層 MeshToonMaterial（水彩紙色塊感）；roughness／metalness 對 toon 無效、直接忽略；{ toon: false } 退回 MeshStandardMaterial
const lpMatCache = new Map();
let lpGrad = null;
function lpMat(hex, o = {}) {
  const k = hex + JSON.stringify(o);
  if (!lpMatCache.has(k)) {
    const { flat, toon = true, roughness = 0.85, metalness = 0, ...rest } = o;
    let m;
    if (toon) {
      if (!lpGrad) { lpGrad = new THREE.DataTexture(new Uint8Array([107, 107, 107, 255, 181, 181, 181, 255, 255, 255, 255, 255]), 3, 1); lpGrad.minFilter = lpGrad.magFilter = THREE.NearestFilter; lpGrad.needsUpdate = true; } // #6b6b6b／#b5b5b5／#ffffff
      m = new THREE.MeshToonMaterial({ color: hex, gradientMap: lpGrad, ...rest });
      m.flatShading = !!flat; // MeshToonMaterial 沒宣告 flatShading 屬性，但 shader 認得這個旗標
    } else m = new THREE.MeshStandardMaterial({ color: hex, roughness, metalness, flatShading: !!flat, ...rest });
    lpMatCache.set(k, m);
  }
  return lpMatCache.get(k);
}
// 第三輪：2 階柔和賽璐珞——亮面＋一道柔邊陰影。gradientMap 8 格（暗 0.3 ×4、亮 1 ×4）用 LinearFilter，明暗交界只剩約 1/8 寬的柔邊
// 搭配 scene 的環境光＋左前上方主光：亮面 ≈ 原色 ×1.08、陰影 ≈ 原色 ×0.75，陰影落在人物側面
// o 同 MeshToonMaterial 參數（transparent、opacity、side、emissive…）；flat:true＝平面著色；roughness／metalness 忽略
const lpCelCache = new Map();
let lpCelGrad = null;
function lpCel(hex, o = {}) {
  const k = hex + JSON.stringify(o);
  if (!lpCelCache.has(k)) {
    if (!lpCelGrad) {
      lpCelGrad = new THREE.DataTexture(new Uint8Array([0, 0, 0, 0, 1, 1, 1, 1].flatMap(b => b ? [255, 255, 255, 255] : [77, 77, 77, 255])), 8, 1);
      lpCelGrad.minFilter = lpCelGrad.magFilter = THREE.LinearFilter; lpCelGrad.generateMipmaps = false; lpCelGrad.needsUpdate = true;
    }
    const { flat, toon, roughness, metalness, ...rest } = o;
    const m = new THREE.MeshToonMaterial({ color: hex, gradientMap: lpCelGrad, ...rest });
    m.flatShading = !!flat;
    lpCelCache.set(k, m);
  }
  return lpCelCache.get(k);
}
// （以下扁球工具屬第二輪，第三輪不再使用；A/B 舊建造器與舊測試仍在呼叫，先保留不刪）
// 星球壓扁成扁球（y 軸 × LP_FLAT），像繪本裡一塊浮在空中的小地面；建造器的地面 mesh 要 scale.y = P.flat
const LP_FLAT = 0.68;
// 把 obj 放到半徑 r 的扁球面上（lat/lon 為度；lat=90 是北極＝主角降落點），lift 為沿法線離地高度，yaw 為繞法線轉角（度）
// obj 的 +Y 會朝向球面外法線
function lpOnSurface(obj, r, lat, lon, lift = 0, yaw = 0) {
  const la = lat * Math.PI / 180, lo = lon * Math.PI / 180;
  const c = Math.cos(la), s = Math.sin(la), f = LP_FLAT;
  const n = new THREE.Vector3(c * Math.sin(lo), s / f, c * Math.cos(lo)).normalize();
  obj.position.set(r * c * Math.sin(lo), r * f * s, r * c * Math.cos(lo)).addScaledVector(n, lift);
  obj.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n);
  if (yaw) obj.rotateY(yaw * Math.PI / 180);
  return obj;
}
// 建造器收到的工具包
function lpKit(d) {
  return {
    id: d.id, radius: d.radius, flat: LP_FLAT, color: d.color, rnd: mulberry32(seedOf(d.id)),
    mat: lpMat, onSurface: (obj, lat, lon, lift, yaw) => lpOnSurface(obj, d.radius, lat, lon, lift, yaw),
    // 標記可點選的元素：elId 必須是 DATA 該星球 elements 裡的 id
    // 第三輪（國風平地舞台）：站點原點＝舞台中心，地面 y=0；x 左右、z 前後（+z 朝鏡頭、−z 朝背景畫）
    at(obj, x, z, yaw = 0, y = 0) { obj.position.set(x, y, z); obj.rotation.set(0, yaw * Math.PI / 180, 0); return obj; },
    chibi: spec => lpChibi(spec),   // 日式 Q 版人物（parts/chibi.js，D 線）
    tag(obj, elId) { obj.userData.pick = { planet: d.id, el: elId }; obj.traverse(o => { if (o.isMesh) o.userData.pick = obj.userData.pick; }); return obj; },
    glb: (name, o) => lpGlb(name, o),   // 第四輪：AI 3D 主物件（先放 fallback，載到 models/<name>.glb 再換）
    anim: []   // 建造器 push (dt, t) => {}；scene 每幀呼叫
  };
}

// ================= 第四輪（C 線）：國畫雲（第二輪拿來當水面薄霧）、GLB 主物件 =================
// 國畫雲（canvas billboard）：上緣幾團大圓弧、下緣一排小圓弧，圍成一朵封閉的祥雲；淡墨勾邊、內部幾道捲雲紋；variant 0–3 各一份快取
const lpCloudTexCache = [];
function lpCloudTex(variant = 0) {
  const k = variant & 3;
  if (lpCloudTexCache[k]) return lpCloudTexCache[k];
  const W = 256, H = 128, c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d'), r = mulberry32(31 + k * 17), puffs = [];
  const n = 4 + Math.floor(r() * 3), x0 = 30, x1 = W - 30, base = H * 0.66;
  for (let i = 0; i < n; i++) { const u = (i + 0.5) / n; puffs.push([x0 + u * (x1 - x0) + (r() - 0.5) * 8, base - 6 - Math.sin(u * Math.PI) * H * (0.14 + r() * 0.1), 15 + Math.sin(u * Math.PI) * 16 + r() * 7]); }
  const nb = 6 + Math.floor(r() * 3);
  for (let i = 0; i <= nb; i++) puffs.push([x0 + 4 + i / nb * (x1 - x0 - 8), base + 4, 9 + r() * 4]);
  const circ = () => { x.beginPath(); puffs.forEach(([px, py, pr]) => { x.moveTo(px + pr, py); x.arc(px, py, pr, 0, Math.PI * 2); }); x.ellipse(W / 2, base - 4, (x1 - x0) / 2, 14, 0, 0, Math.PI * 2); };
  x.strokeStyle = 'rgba(70,58,48,.25)'; x.lineWidth = 1.5; circ(); x.stroke();              // 第六輪：極淡的外緣，像墨暈不像勾邊
  const g = x.createLinearGradient(0, H * 0.15, 0, H * 0.8); g.addColorStop(0, '#fbf6ec'); g.addColorStop(0.6, 'rgba(245,237,222,1)'); g.addColorStop(1, 'rgba(239,228,207,0)'); // 下緣淡出
  x.fillStyle = g; circ(); x.fill();
  x.strokeStyle = 'rgba(120,100,80,.22)'; x.lineWidth = 1.8;
  puffs.slice(0, n).forEach(([px, py, pr], i) => { if (i % 2) return; x.beginPath(); for (let a = 0; a < 5.2; a += 0.2) { const rr = pr * 0.55 * (1 - a / 6.5); x.lineTo(px + Math.cos(a + 2) * rr, py + 3 + Math.sin(a + 2) * rr * 0.7); } x.stroke(); });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return (lpCloudTexCache[k] = t);
}
// solid（預設）：alphaTest 鏤空＋寫深度——擋得住後面的崖體，細墨線後製也不會把被雲蓋住的輪廓描到雲上；false＝半透明（掠過鏡頭的雲）
// 第五輪：半透明的放 layer 1（LP_OVERLAY），scene 在細墨線後製之後才疊上去，雲後面的建物描邊不會透出來
function lpCloudSprite(variant, w, color = '#ffffff', opacity = 1, solid = true) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial(solid ? { map: lpCloudTex(variant), color, alphaTest: 0.25, toneMapped: false, fog: false }
    : { map: lpCloudTex(variant), color, transparent: true, opacity, depthWrite: false, toneMapped: false, fog: false }));
  s.scale.set(w, w / 2, 1); s.raycast = () => {}; if (!solid) s.layers.set(LP_OVERLAY); return s;
}
const LP_OVERLAY = 1;

// ================= 第二輪（C 線，愛蓮說）：巨大荷葉平台、荷花、浮葉 =================
// 八站設色：leaf 葉面、rim 葉緣深綠、under 葉背灰綠、stem 荷梗、bloom 荷花尖端粉色、sky [天頂, 地平線薄霧, 水色]（沒有全景圖時的淡彩漸層）、mist 霧量
const LP_TONE = {
  base:   { leaf: '#74aa6a', rim: '#4d8452', under: '#a3b89c', stem: '#6f9a5a', bloom: '#eea6b8', sky: ['#cfe0e2', '#f1ece0', '#9cc7bc'], mist: 0.35 },
  baihua: { leaf: '#79ae6c', rim: '#4f8a55', under: '#a4ba9c', stem: '#71a05c', bloom: '#f2a8bf', sky: ['#cde3e8', '#f6efe2', '#a2cec2'], mist: 0.3 },  // 繽紛淡彩：夏日清晨
  ju:     { leaf: '#93a863', rim: '#6c8147', under: '#b4b893', stem: '#7f9258', bloom: '#f0d27a', sky: ['#d9dcd6', '#ece6d6', '#a9c2b6'], mist: 0.75 }, // 秋黃：深秋薄霧
  mudan:  { leaf: '#7caa6a', rim: '#548250', under: '#a9ba9a', stem: '#73995a', bloom: '#e5869e', sky: ['#efd9d6', '#f8ece2', '#b0cfc3'], mist: 0.3 },  // 暖粉：春日霞光
  yuni:   { leaf: '#6eaa72', rim: '#478758', under: '#9fbaa2', stem: '#6c9c5e', bloom: '#f4c6d2', sky: ['#cfe5e2', '#eff2e8', '#93c8bb'], mist: 0.3 },  // 清綠粉白：夏午
  jing:   { leaf: '#70ab70', rim: '#488656', under: '#a0bba0', stem: '#6c9c5e', bloom: '#f4c6d2', sky: ['#d0e6e4', '#f0f2e8', '#95c9bd'], mist: 0.3 },
  xiang:  { leaf: '#74ad74', rim: '#4c885a', under: '#a5bda5', stem: '#6f9e60', bloom: '#f6cbd6', sky: ['#e3e2ea', '#f6f1ec', '#a6d0c6'], mist: 0.35 }, // 粉白微風
  pin:    { leaf: '#85a987', rim: '#5d8466', under: '#adbcac', stem: '#78966a', bloom: '#eee4e2', sky: ['#dee3e0', '#f2eee6', '#a8c6bd'], mist: 0.4 },  // 素雅：午後
  lianxi: { leaf: '#8aa864', rim: '#647f40', under: '#b6b68e', stem: '#7f9456', bloom: '#f3b98a', sky: ['#efcfa4', '#f8e3c4', '#c2c39f'], mist: 0.35 }  // 夕照金
};
const LP_LEAF_GAP = 0; // 荷葉缺口寬（度）：荷（蓮）葉是完整圓盾，有缺口的是睡蓮，所以 0；notch 參數仍保留當上岸方向

// 葉面紋理（全部荷葉共用）：底灰 0.84、葉臍一點淺色、向外 20 條淡色主脈（中段分叉）、葉緣壓暗；頂點色乘上它
let lpVeinT = null;
function lpVeinTex() {
  if (lpVeinT) return lpVeinT;
  const N = 1024, c = document.createElement('canvas'); c.width = c.height = N; const x = c.getContext('2d'), r = mulberry32(17), h = N / 2;
  x.fillStyle = 'rgb(214,214,214)'; x.fillRect(0, 0, N, N);
  for (let i = 0; i < 260; i++) { x.fillStyle = `rgba(${r() < 0.5 ? '255,255,240' : '60,80,50'},${0.03 + r() * 0.05})`; x.beginPath(); x.ellipse(r() * N, r() * N, 6 + r() * 30, 4 + r() * 20, r() * 3, 0, 7); x.fill(); }
  x.lineCap = 'round';
  for (let i = 0; i < 20; i++) {
    const a = (i + r() * 0.3) / 20 * Math.PI * 2, wob = (r() - 0.5) * 0.08;
    const pt = (t, da = 0) => [h + Math.sin(a + wob * t + da) * t * h * 0.98, h + Math.cos(a + wob * t + da) * t * h * 0.98];
    x.strokeStyle = 'rgba(255,255,236,.75)'; x.lineWidth = 5;
    x.beginPath(); x.moveTo(...pt(0.04)); for (let t = 0.08; t <= 0.62; t += 0.04) x.lineTo(...pt(t)); x.stroke();
    x.lineWidth = 3;   // 分叉成兩條細脈
    for (const s of [-1, 1]) { x.beginPath(); x.moveTo(...pt(0.62)); for (let t = 0.66; t <= 1.0; t += 0.04) x.lineTo(...pt(t, s * (t - 0.62) * 0.11)); x.stroke(); }
  }
  let g = x.createRadialGradient(h, h, 0, h, h, 42); g.addColorStop(0, 'rgba(255,255,230,1)'); g.addColorStop(1, 'rgba(255,255,230,0)'); x.fillStyle = g; x.fillRect(0, 0, N, N);
  g = x.createRadialGradient(h, h, h * 0.86, h, h, h); g.addColorStop(0, 'rgba(40,60,30,0)'); g.addColorStop(1, 'rgba(40,60,30,.35)'); x.fillStyle = g; x.fillRect(0, 0, N, N);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return (lpVeinT = t);
}
// 荷花幾何（合併、頂點色）：原點＝花托底；open 0＝花苞、1＝盛開；size＝花高約略；tint＝花瓣尖端色
function lpBloomGeo(open = 1, size = 0.5, tint = '#eea6b8') {
  const W = new THREE.Color('#fbf6ef'), T = new THREE.Color(tint), out = [], cc = new THREE.Color();
  const rings = open > 0.3 ? [[6, 0.15 + 0.2 * open, 0.85], [8, 0.35 + 0.5 * open, 1], [8, 0.55 + 0.75 * open, 1.05]] : [[5, 0.12, 1], [5, 0.22, 1.05]];
  rings.forEach(([n, tilt, k], ri) => {
    for (let i = 0; i < n; i++) {
      const g = new THREE.SphereGeometry(1, 10, 8).scale(0.3 * k * (open > 0.3 ? 1 : 0.85), 0.5 * k, 0.11).translate(0, 0.5 * k, 0.04);
      const p = g.attributes.position, col = [];
      for (let j = 0; j < p.count; j++) { const y = p.getY(j) / k; cc.copy(W).lerp(T, clamp((y - 0.45) / 0.55, 0, 1) * 0.85); col.push(cc.r, cc.g, cc.b); }
      g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.deleteAttribute('uv');
      g.rotateX(tilt).rotateY((i + ri * 0.5) / n * Math.PI * 2); out.push(g);
    }
  });
  if (open > 0.3) { const pod = new THREE.CylinderGeometry(0.16, 0.12, 0.14, 12).translate(0, 0.2, 0), pc = [], P = pod.attributes.position;
    for (let j = 0; j < P.count; j++) { cc.set(P.getY(j) > 0.26 ? '#c9c45a' : '#e2cf6a'); pc.push(cc.r, cc.g, cc.b); }
    pod.setAttribute('color', new THREE.Float32BufferAttribute(pc, 3)); pod.deleteAttribute('uv'); out.push(pod); }
  return BGU.mergeGeometries(out.map(g => g.index ? g.toNonIndexed() : g)).scale(size, size, size);
}
// 給一個幾何上單色頂點色
function lpPaintGeo(g, hex) { const c = new THREE.Color(hex), n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) a.set([c.r, c.g, c.b], i * 3); g.setAttribute('color', new THREE.BufferAttribute(a, 3)); if (g.attributes.uv) g.deleteAttribute('uv'); return g.index ? g.toNonIndexed() : g; }
// 浮在水面的小荷葉（平圓、有缺口；頂面 y=0）：回傳頂點色幾何
function lpPadGeo(r = 1, notch = 0, hex = '#76ab6a') {
  const gap = LP_LEAF_GAP * Math.PI / 180, g = new THREE.CylinderGeometry(r, r * 0.97, 0.05, 28, 1, false, notch * Math.PI / 180 + gap / 2, Math.PI * 2 - gap).translate(0, -0.025, 0);
  const p = g.attributes.position, c = new THREE.Color(hex), d = new THREE.Color(hex).multiplyScalar(0.72), l = new THREE.Color(hex).lerp(new THREE.Color('#e6efc2'), 0.45), col = [], cc = new THREE.Color();
  for (let i = 0; i < p.count; i++) { const rr = Math.hypot(p.getX(i), p.getZ(i)) / r; cc.copy(rr < 0.15 ? l : c).lerp(d, clamp((rr - 0.8) / 0.2, 0, 1)); col.push(cc.r, cc.g, cc.b); }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.deleteAttribute('uv');
  return g.toNonIndexed();
}

// 巨大荷葉平台：回傳 Group（name 'lotusleaf'；原點＝葉心，葉面頂 y=0 平坦、半徑 4.6 內可站；外緣 0.8 往上翹 0.15–0.3 並起伏）
//   radius 葉半徑；seed 形狀；tone 見 LP_TONE；notch 缺口方向（度，0＝+z、90＝+x）；rim 葉緣點綴角度（度）；stem 葉面離水高（水面在 y=−stem）
//   附帶：粗荷梗（細刺點）、水面葉影與兩圈漣漪、葉旁 2–4 片浮葉與 1–2 朵荷花／花苞（半徑 6 以外）、rim 角度上的小荷花／蜻蜓、葉面幾顆露珠
function lpLotusLeaf({ radius: R = 5.4, seed = 1, tone = 'base', notch = 200, rim = [], stem = 1.5 } = {}) {
  const T = LP_TONE[tone] || LP_TONE.base, rnd = mulberry32(seed), sn = new SimplexNoise({ random: rnd }), C = h => new THREE.Color(h);
  const g = new THREE.Group(); g.name = 'lotusleaf';
  const D2R = Math.PI / 180, gap = LP_LEAF_GAP * D2R, a0 = notch * D2R + gap / 2, span = Math.PI * 2 - gap, s0 = rnd() * 10;
  const FLAT = 3.9, lift = (r, a) => { const t = Math.max(0, (r - FLAT) / (R - FLAT)); return t * t * (0.30 + 0.18 * (0.5 + 0.5 * Math.sin(a * 11 + s0)) + 0.04 * sn.noise(Math.cos(a) * 3, Math.sin(a) * 3)); };
  const thick = r => 0.05 + 0.32 * Math.pow(1 - r / R, 2);
  // ---- 葉身：上表面（中心→葉緣）＋下表面（葉緣→中心）一圈圈接起來（有缺口時兩側封邊）；外緣翹成 11 道波浪的淺碗 ----
  const NA = 132, NR = 16, rows = [];
  const rOf = j => R * (1 - Math.pow(1 - j / NR, 1.4)); // 葉緣附近環比較密（翹邊才圓順）
  for (let j = 0; j <= NR; j++) rows.push(j);
  const pos = [], col = [], uv = [], idx = [], cTop = C(T.leaf), cRim = C(T.rim), cUnd = C(T.under), cNav = C(T.leaf).lerp(C('#dfe6b0'), 0.6), cc = new THREE.Color(), k = 1 / 0.84;
  const vert = (r, a, y, c) => { pos.push(Math.sin(a) * r, y, Math.cos(a) * r); col.push(c.r, c.g, c.b); uv.push(0.5 + Math.sin(a) * r / (2 * R), 0.5 - Math.cos(a) * r / (2 * R)); };
  // 列 0..NR＝上表面、NR+1..2NR+1＝下表面（葉緣→中心）
  for (let row = 0; row <= 2 * NR + 1; row++) {
    const top = row <= NR, j = top ? row : 2 * NR + 1 - row, r = rOf(j);
    for (let i = 0; i <= NA; i++) {
      const a = a0 + span * i / NA, y = lift(r, a) - (top ? 0 : thick(r));
      if (top) { const rr = r / R; cc.copy(cTop).multiplyScalar(0.96 + 0.08 * sn.noise(Math.sin(a) * r * 0.4 + 7, Math.cos(a) * r * 0.4)).lerp(cRim, clamp((rr - 0.86) / 0.12, 0, 1) * 0.8); if (rr < 0.12) cc.lerp(cNav, 1 - rr / 0.12); cc.multiplyScalar(k); }
      else { cc.copy(cUnd).multiplyScalar(k * (j === NR ? 0.85 : 1)); if (j === NR) cc.copy(cRim).multiplyScalar(k * 0.9); }
      vert(r, a, y, cc);
    }
  }
  const W = NA + 1, id = (row, i) => row * W + i;
  const nx = i => (gap ? i + 1 : (i + 1) % NA); // 整圓：最後一格接回第 0 欄，免接縫
  for (let row = 0; row < 2 * NR + 1; row++) for (let i = 0; i < NA; i++) { const a = id(row, i), b = id(row, nx(i)), c2 = id(row + 1, i), d = id(row + 1, nx(i)); idx.push(a, c2, b, b, c2, d); }
  // 缺口封邊：上表面第 j 環 ↔ 下表面第 j 環
  if (gap) for (const [i, f] of [[0, 1], [NA, 0]]) for (let j = 0; j < NR; j++) {
    const t0 = id(j, i), t1 = id(j + 1, i), b0 = id(2 * NR + 1 - j, i), b1 = id(2 * NR - j, i);
    if (f) idx.push(t0, b1, t1, t0, b0, b1); else idx.push(t0, t1, b1, t0, b1, b0);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx); geo.computeVertexNormals();
  const leafMat = lpCel('#ffffff', { vertexColors: true }).clone(); leafMat.map = lpVeinTex();
  const leaf = new THREE.Mesh(geo, leafMat); leaf.name = 'leaf-body'; g.add(leaf);
  // ---- 荷梗：葉心往下伸進水裡，表面細刺點 ----
  const H = Math.max(0.3, stem), sg = new THREE.CylinderGeometry(0.11, 0.14, H + 0.6, 10, 4).translate(0, -(H + 0.6) / 2 - thick(0) + 0.05, 0);
  const sp = sg.attributes.position; for (let i = 0; i < sp.count; i++) { const y = sp.getY(i); sp.setX(i, sp.getX(i) + 0.12 * Math.sin(y * 0.9 + s0)); }
  sg.computeVertexNormals();
  const stemM = new THREE.Mesh(sg, lpCel(T.stem)); stemM.name = 'leaf-stem'; g.add(stemM);
  const NTh = 36, th = new THREE.InstancedMesh(new THREE.ConeGeometry(0.018, 0.05, 4).rotateZ(-Math.PI / 2).translate(0.13, 0, 0), lpCel(new THREE.Color(T.stem).multiplyScalar(0.7).getStyle()), NTh);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), V = THREE.Vector3, p3 = new V(), sc = new V(1, 1, 1);
  for (let i = 0; i < NTh; i++) { const y = -thick(0) - 0.1 - rnd() * (H - 0.1); m4.compose(p3.set(0.12 * Math.sin(y * 0.9 + s0), y, 0), q.setFromEuler(e.set(0, rnd() * 6.3, 0)), sc); th.setMatrixAt(i, m4); }
  th.name = 'leaf-thorns'; g.add(th);
  // ---- 水面：葉影＋漣漪（水面 y = −H） ----
  const wy = -H + 0.025;
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(R * 0.92, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#2f5a4a', transparent: true, opacity: 0.16, depthWrite: false, toneMapped: false }));
  shadow.position.set(0.5, wy, -0.3); shadow.name = 'leaf-shadow'; shadow.renderOrder = 1; g.add(shadow);
  const rings = [0, 1].map(i => { const m = new THREE.Mesh(new THREE.RingGeometry(0.92, 1, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#f4fbf6', transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
    m.position.y = wy + 0.01; m.name = 'leaf-ripple'; m.renderOrder = 2; g.add(m); return m; });
  // ---- 葉旁點綴：浮葉 2–4 片、荷花／花苞 1–2 朵（半徑 6–8.5，避開正前方 ±35°） ----
  const around = () => { let a; do a = rnd() * Math.PI * 2; while (Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) < 0.62); return a; };
  const pads = [], nP = 2 + Math.floor(rnd() * 3);
  for (let i = 0; i < nP; i++) { const a = around(), rr = 6.2 + rnd() * 2.3; pads.push(lpPadGeo(0.6 + rnd() * 0.6, rnd() * 360, T.leaf).translate(Math.sin(a) * rr, wy + 0.04, Math.cos(a) * rr)); }
  const blooms = [], nB = 1 + Math.floor(rnd() * 2);
  for (let i = 0; i < nB; i++) { const a = around(), rr = 6 + rnd() * 1.6, h = 0.8 + rnd() * 0.8, op = i ? 0 : 1, x0 = Math.sin(a) * rr, z0 = Math.cos(a) * rr;
    blooms.push(lpBloomGeo(op, op ? 0.55 : 0.45, T.bloom).translate(x0, wy + h, z0), lpPaintGeo(new THREE.CylinderGeometry(0.035, 0.045, h, 6).translate(x0, wy + h / 2, z0), T.stem)); }
  // ---- rim：葉緣小荷花（第 1 個）、蜻蜓（第 2 個）；沒給就挑缺口兩側 ----
  const rims = (rim && rim.length ? rim : [notch + 115, notch + 160]).slice(0, 3);
  const vc = lpCel('#ffffff', { vertexColors: true });
  if (rims[0] != null) { const a = rims[0] * D2R, rr = R + 0.15; blooms.push(lpBloomGeo(1, 0.4, T.bloom).translate(Math.sin(a) * rr, wy + 0.9 + H * 0.15, Math.cos(a) * rr), lpPaintGeo(new THREE.CylinderGeometry(0.03, 0.04, 0.9 + H * 0.15, 6).translate(Math.sin(a) * rr, wy + (0.9 + H * 0.15) / 2, Math.cos(a) * rr), T.stem)); }
  // ---- 上岸踏板：notch 方向一片斜靠葉緣的小錢葉（往外斜向水面），下面一根細梗接到水裡 ----
  { const a = notch * D2R, rIn = R - 0.15, y0 = lift(rIn, a) + 0.02, PR = 1.2, th = clamp(Math.asin(Math.min(1, (y0 + H) / (2 * PR))), 0.25, 0.6);
    const cx = rIn + PR * Math.cos(th), cy = y0 - PR * Math.sin(th), sh = cy + H;
    pads.push(lpPadGeo(PR, 0, '#8dbb76').rotateZ(-th).translate(cx, cy, 0).rotateY(a - Math.PI / 2));
    if (sh > 0.05) pads.push(lpPaintGeo(new THREE.CylinderGeometry(0.035, 0.045, sh, 6).translate(cx, cy - sh / 2, 0).rotateY(a - Math.PI / 2), T.stem)); }
  const deco = new THREE.Mesh(BGU.mergeGeometries([...pads, ...blooms]), vc); deco.name = 'leaf-deco'; g.add(deco);
  let fly = null;
  if (rims[1] != null) { // 蜻蜓：細長藍腹、深藍胸、四片透明翅
    fly = new THREE.Group(); fly.name = 'leaf-dragonfly';
    fly.add(new THREE.Mesh(BGU.mergeGeometries([lpPaintGeo(new THREE.CylinderGeometry(0.02, 0.011, 0.38, 6).rotateX(Math.PI / 2).translate(0, 0, -0.13), '#4f86b8'), lpPaintGeo(new THREE.SphereGeometry(0.045, 8, 6).scale(1, 1, 1.3).translate(0, 0, 0.08), '#2f5f8a'),
      lpPaintGeo(new THREE.SphereGeometry(0.024, 6, 4).translate(0.03, 0.01, 0.15), '#1f2a30'), lpPaintGeo(new THREE.SphereGeometry(0.024, 6, 4).translate(-0.03, 0.01, 0.15), '#1f2a30')]), vc));
    const wing = new THREE.PlaneGeometry(0.26, 0.06).rotateX(-Math.PI / 2), wm = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false, toneMapped: false });
    fly.userData.wings = [[0.15, 0.05], [-0.15, 0.05], [0.14, -0.02], [-0.14, -0.02]].map(([x, z]) => { const w = new THREE.Mesh(wing, wm); w.position.set(x, 0.01, z); fly.add(w); return w; });
    // 蛙平時蹲在葉前緣右側（約 +46°）：蜻蜓只停在葉後半（105–255°）且離上岸處 30° 以上，否則改到左後 240°，不再擋蛙臉
    const ad = (x, y) => Math.abs(((x - y) % 360 + 540) % 360 - 180), r1 = ad(rims[1], 180) <= 75 && ad(rims[1], notch) > 30 ? rims[1] : ad(240, notch) > 40 ? 240 : 125;
    const a = r1 * D2R; fly.userData.home = new V(Math.sin(a) * (R - 0.2), 0.75, Math.cos(a) * (R - 0.2)); fly.position.copy(fly.userData.home); fly.rotation.y = a + Math.PI / 2; g.add(fly);
  }
  // ---- 露珠：葉面 3–5 顆（避開主角站位） ----
  const dews = [], nD = 3 + Math.floor(rnd() * 3);
  while (dews.length < nD) { const a = rnd() * Math.PI * 2, rr = 1.4 + rnd() * 3; if (Math.abs(a - a0 + gap / 2) < 0.3) continue; const x = Math.sin(a) * rr, z = Math.cos(a) * rr; if (Math.hypot(x, z - 2.6) < 1.1) continue; dews.push([x, z, 0.05 + rnd() * 0.05]); }
  const dew = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 8), lpCel('#eaf7f4', { transparent: true, opacity: 0.7, emissive: '#ffffff', emissiveIntensity: 0.15 }), dews.length);
  dews.forEach(([x, z, s], i) => { m4.compose(p3.set(x, s * 0.55, z), q.identity(), sc.set(s, s * 0.75, s)); dew.setMatrixAt(i, m4); }); sc.set(1, 1, 1);
  dew.name = 'leaf-dew'; g.add(dew);
  g.userData.water = -H;
  g.userData.anim = (dt, t) => {
    rings.forEach((m, i) => { const u = ((t * 0.28 + i * 0.5 + s0) % 1); m.scale.setScalar(0.5 + u * 3.2); m.material.opacity = 0.32 * Math.sin(Math.PI * u); });
    if (fly) { const h = fly.userData.home; fly.position.set(h.x + 0.25 * Math.sin(t * 0.7 + s0), h.y + 0.08 * Math.sin(t * 2.3), h.z + 0.25 * Math.cos(t * 0.5 + s0)); fly.userData.wings.forEach((w, i) => { w.rotation.z = (i % 2 ? -1 : 1) * 0.35 * Math.sin(t * 40 + i); }); }
  };
  g.traverse(o => { o.raycast = () => {}; }); // 葉身不擋點選與取景
  return g;
}

// ---------- GLB 主物件（第四輪；D 線產檔、A/B 呼叫）----------
// models/index.json（build 時產生）列出存在的模型；不在清單上的就不去抓，避免 404 在 console 冒錯誤
let lpGlbList = null, lpGltf = null, LP_GLB_GEN = 0;
const lpGlbSrc = new Map(), lpGlbWarned = new Set();
function lpGlbWarn(name, why) { if (!lpGlbWarned.has(name)) { lpGlbWarned.add(name); console.warn('[glb] ' + name + ' 沿用程式建模：' + why); } }
function lpGlbLoad(name) {
  if (!lpGlbSrc.has(name)) lpGlbSrc.set(name, (async () => {
    if (!GLTFLoader) return null;
    if (!lpGlbList) lpGlbList = fetch('models/index.json').then(r => r.ok ? r.json() : []).catch(() => []);
    const list = await lpGlbList;
    if (!Array.isArray(list) || !list.includes(name)) { lpGlbWarn(name, '沒有 models/' + name + '.glb'); return null; }
    if (!lpGltf) { lpGltf = new GLTFLoader(); if (MeshoptDecoder) lpGltf.setMeshoptDecoder(MeshoptDecoder); }
    try {
      const gl = await lpGltf.loadAsync('models/' + name + '.glb'), src = gl.scene;
      lpCel('#ffffff'); // 確保兩階漸層貼圖已建立
      const conv = new Map();
      src.traverse(o => { if (!o.isMesh) return;
        const toCel = m => { if (!conv.has(m)) { if (m.map) m.map.colorSpace = THREE.SRGBColorSpace;
          conv.set(m, new THREE.MeshToonMaterial({ color: m.color ? m.color.clone() : 0xffffff, map: m.map || null, gradientMap: lpCelGrad, transparent: !!m.transparent, opacity: m.opacity ?? 1, alphaTest: m.alphaTest || 0, side: m.side, vertexColors: !!m.vertexColors })); }
          return conv.get(m); };
        o.material = Array.isArray(o.material) ? o.material.map(toCel) : toCel(o.material); });
      return src;
    } catch (e) { lpGlbWarn(name, '載入失敗 ' + (e && e.message || e)); return null; }
  })());
  return lpGlbSrc.get(name);
}
// 立即回傳 Group：先放 fallback()，載到模型後換掉；等比縮放到 height、腳底貼 y=0、水平置中、yaw 度數旋轉；補上 P.tag 的 pick
function lpGlb(name, { height = 1, yaw = 0, fallback } = {}) {
  const g = new THREE.Group(); g.name = 'glb-' + name; g.userData.glbReady = false;
  let fb = null;
  try { fb = typeof fallback === 'function' ? fallback() : null; } catch (e) { console.warn('[glb] fallback 失敗 ' + name, e); }
  if (fb && fb.isObject3D) g.add(fb);
  lpGlbLoad(name).then(src => {
    if (!src) return;
    const m = src.clone(true), box = new THREE.Box3().setFromObject(m), size = box.getSize(new THREE.Vector3());
    if (!(size.y > 0)) { lpGlbWarn(name, '模型沒有高度'); return; }
    const s = height / size.y, c = box.getCenter(new THREE.Vector3());
    const w = new THREE.Group(); w.name = 'glb-model'; w.rotation.y = yaw * Math.PI / 180; w.add(m);
    m.scale.multiplyScalar(s); m.position.set(-c.x * s, -box.min.y * s, -c.z * s);
    const pk = g.userData.pick; m.traverse(o => { if (o.isMesh && pk) o.userData.pick = pk; });
    if (fb) g.remove(fb);
    g.add(w); g.userData.glbReady = true; LP_GLB_GEN++;
  });
  return g;
}

// ---------- 事件匯流排 ----------
const ctx = {
  _ev: {},
  on(n, f) { (this._ev[n] ||= []).push(f); },
  emit(n, p) { (this._ev[n] || []).forEach(f => { try { f(p); } catch (e) { console.error('[event ' + n + ']', e); } }); },
  onFrame: [],                 // fn(dt, elapsed)
  reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
  planets: [], planetById: new Map(),   // {id, data, index, group, kit}
  current: null,               // 主角目前所在站 id
  flying: false,
  viewInsets: { left: 0, right: 0, top: 0, bottom: 0 }  // UI 佔掉的畫面像素（ui 維護，scene 取景用）
};
