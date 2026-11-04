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

// ================= 第二版（C 線，生於憂患）：河中崖島、大河、石階碼頭 =================
// 六站設色：top／top2 平台土色、up／up2 崖上半、low／low2 崖下半、pine 崖柏、mist 水線白沫與水霧色、
//   sky [天頂, 地平線薄霧, 河水色]（沒有全景圖時的淡彩漸層；河水黛青灰綠）、fog 霧量 0–1
const LP_TONE = {
  base:   { top: '#a9a46c', top2: '#8f975a', up: '#8f8a7c', up2: '#7a776c', low: '#8a7a62', low2: '#6f6656', pine: '#4d6a43', mist: '#eef0e2', sky: ['#cfe0e2', '#f3eddc', '#6f8a7e'], fog: 0.35 }
};
Object.assign(LP_TONE, {
  fields: { ...LP_TONE.base, sky: ['#cde3e6', '#f6efdc', '#6f8c7e'], fog: 0.3 },                                                                       // 晨光田綠
  market: { ...LP_TONE.base, top: '#c9a46a', top2: '#b08a54', up: '#a08a6c', up2: '#8a7660', low: '#a07a54', low2: '#86694e', pine: '#5a6440', mist: '#f2e4c8', sky: ['#e4d6ba', '#f6e9d0', '#7a8670'], fog: 0.3 },   // 赭黃熱鬧
  road:   { ...LP_TONE.base, top: '#a8a48e', top2: '#8e8c7a', up: '#7f8688', up2: '#6b7276', low: '#7a7670', low2: '#66645f', pine: '#3f5048', mist: '#dde2e2', sky: ['#c2cbd0', '#e3e6e2', '#647c7c'], fog: 0.55 },   // 冷灰青
  bridge: { ...LP_TONE.base, top: '#b4a874', top2: '#98925e', up: '#8c8a78', up2: '#76766a', low: '#8a7c62', low2: '#726a56', pine: '#55703f', mist: '#e8ecd8', sky: ['#d0dfd2', '#efeedc', '#6c8a7a'], fog: 0.35 },   // 竹木
  study:  { ...LP_TONE.base, top: '#b89a74', top2: '#9c7e5c', up: '#8e8070', up2: '#786b5e', low: '#8c7460', low2: '#74604e', pine: '#4c5a40', mist: '#f0e2cc', sky: ['#e0d2be', '#f4e7d4', '#76806c'], fog: 0.35 },   // 暖褐
  city:   { ...LP_TONE.base, top: '#b88c66', top2: '#9c7050', up: '#8a7470', up2: '#74605e', low: '#8e6a56', low2: '#745448', pine: '#3e4a3c', mist: '#f0d2bc', sky: ['#d2a68e', '#f2cdac', '#6e7062'], fog: 0.4 }      // 暮色赭紅
});
// 給一個幾何上單色頂點色
function lpPaintGeo(g, hex) { const c = new THREE.Color(hex), n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) a.set([c.r, c.g, c.b], i * 3); g.setAttribute('color', new THREE.BufferAttribute(a, 3)); if (g.attributes.uv) g.deleteAttribute('uv'); return g.index ? g.toNonIndexed() : g; }
// 崖體剖面：t=0 平台邊緣 → t=1 河底；入水崖岸比石峰矮胖：上段近直、往下微微外擴
const lpCliffProfile = t => 1 - 0.04 * Math.sin(t * Math.PI) + 0.14 * t * t;
const scSmoothCore = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
// 碼頭尺寸（純函式，scene 的航道計算也用）：R 平台半徑、HT 平台離水高 → 石階頂／底與碼頭端離島心距離、甲板高（相對平台頂）、水線崖岸半徑
function lpDockGeo(R, HT) {
  const H = HT + 1.6, Rw = R * lpCliffProfile((HT - 0.1) / H) * 1.06, deckY = -HT + 0.35, rise = 0.24, run = 0.3;
  const nSt = Math.max(2, Math.ceil(-deckY / rise)), rTop = R - 0.55, rBot = rTop + nSt * run;
  return { H, Rw, deckY, rise, run, nSt, rTop, rBot, rEnd: Math.max(rBot + 1.4, Rw + 1.7) };
}

// 斧劈皴紋理（崖面）與夯土紋理（平台）：白底灰墨，乘上頂點的礦物色；全島共用一張（移植自空城計）
let lpCunT = null, lpEarthT = null, lpCliffGrad = null, lpFoamT = null;
function lpTexCanvas(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'), r = mulberry32(w * 7 + h);
  draw(x, r, w, h);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
// 一張貼圖＝寬 2 單位 × 一級岩階（rock 的 uv.v＝岩階相位）：上緣一道墨色檐下陰影、下緣岩唇提白、中間斧劈皴
function lpCunTex() {
  return lpCunT || (lpCunT = lpTexCanvas(512, 256, (x, r, w, h) => {
    x.fillStyle = '#f2ede2'; x.fillRect(0, 0, w, h);
    const g = x.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(40,32,26,.55)'); g.addColorStop(0.1, 'rgba(40,32,26,.18)'); g.addColorStop(0.3, 'rgba(40,32,26,0)');
    g.addColorStop(0.82, 'rgba(255,255,248,0)'); g.addColorStop(0.95, 'rgba(255,255,248,.4)'); g.addColorStop(1, 'rgba(60,50,40,.3)');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) { const y0 = r() * 8, L = w * (0.08 + r() * 0.25), x0 = r() * w;
      x.fillStyle = `rgba(38,32,26,${0.15 + r() * 0.3})`; for (const ox of [-w, 0, w]) { x.beginPath(); x.ellipse(x0 + ox, y0 + 4, L / 2, 2 + r() * 5, 0, 0, 7); x.fill(); } }
    const stroke = (x0, y0, L, dx, lw, col) => { for (const ox of [-w, 0, w]) {
      x.beginPath(); x.moveTo(x0 + ox, y0); x.lineTo(x0 + ox + dx, y0 + L); x.lineTo(x0 + ox + dx + lw, y0 + L * 0.85); x.closePath(); x.fillStyle = col; x.fill(); } };
    for (let i = 0; i < 26; i++) { const x0 = r() * w, bw = 30 + r() * 70; x.fillStyle = `rgba(60,50,40,${0.05 + r() * 0.08})`;
      for (const ox of [-w, 0, w]) { x.beginPath(); x.moveTo(x0 + ox, h * 0.12); x.lineTo(x0 + ox + bw, h * 0.12); x.lineTo(x0 + ox + bw * 0.6 + 12, h * 0.9); x.lineTo(x0 + ox - 8, h * 0.8); x.closePath(); x.fill(); } }
    for (let i = 0; i < 150; i++) { const ink = r() < 0.75, y0 = h * (0.1 + r() * 0.55);
      stroke(r() * w, y0, Math.min(h * 0.94 - y0, 40 + r() * 90), 6 + r() * 16, 4 + r() * 10, ink ? `rgba(38,32,26,${0.1 + r() * 0.3})` : `rgba(255,255,250,${0.2 + r() * 0.3})`); }
  }));
}
// 夯土地面：細碎土斑、小石子、幾道乾裂紋
function lpEarthTex() {
  return lpEarthT || (lpEarthT = lpTexCanvas(256, 256, (x, r, w, h) => {
    x.fillStyle = '#ffffff'; x.fillRect(0, 0, w, h);
    const dot = (cx, cy, rx, ry, a, col) => { for (const ox of [-w, 0, w]) for (const oy of [-h, 0, h]) { x.beginPath(); x.ellipse(cx + ox, cy + oy, rx, ry, a, 0, 7); x.fillStyle = col; x.fill(); } };
    for (let i = 0; i < 30; i++) dot(r() * w, r() * h, 12 + r() * 26, 8 + r() * 14, r() * 3, 'rgba(90,70,45,0.06)');
    for (let i = 0; i < 700; i++) dot(r() * w, r() * h, 0.6 + r() * 1.2, 0.5 + r(), 0, r() < 0.7 ? `rgba(70,52,35,${0.12 + r() * 0.25})` : `rgba(255,250,235,${0.3 + r() * 0.4})`);
    for (let i = 0; i < 40; i++) { const cx = r() * w, cy = r() * h, s = 1.5 + r() * 2.5; dot(cx + 0.6, cy + 0.8, s, s * 0.7, 0, 'rgba(60,45,30,.25)'); dot(cx, cy, s, s * 0.7, 0, `rgba(${200 + r() * 40 | 0},${190 + r() * 30 | 0},${170 + r() * 30 | 0},.9)`); }
    x.strokeStyle = 'rgba(70,52,35,.18)'; x.lineWidth = 1;
    for (let i = 0; i < 9; i++) { let px = r() * w, py = r() * h; x.beginPath(); x.moveTo(px, py); for (let k = 0; k < 5; k++) { px += (r() - 0.5) * 22; py += (r() - 0.5) * 22; x.lineTo(px, py); } x.stroke(); }
  }));
}
// 水線：圓形貼圖，中心透明、0.69 處一圈碎白沫、往外一圈淡赭泥沙暈開
function lpFoamTex() {
  if (lpFoamT) return lpFoamT;
  const N = 512, c = document.createElement('canvas'); c.width = c.height = N; const x = c.getContext('2d'), r = mulberry32(29), h = N / 2;
  let g = x.createRadialGradient(h, h, h * 0.62, h, h, h);
  g.addColorStop(0, 'rgba(170,140,90,0)'); g.addColorStop(0.12, 'rgba(170,140,90,.5)'); g.addColorStop(0.45, 'rgba(160,132,86,.22)'); g.addColorStop(1, 'rgba(160,132,86,0)');
  x.fillStyle = g; x.fillRect(0, 0, N, N);
  for (let i = 0; i < 420; i++) { const a = r() * Math.PI * 2, rr = h * (0.67 + Math.pow(r(), 2) * 0.14), s = 2 + r() * 7;
    x.fillStyle = `rgba(255,255,250,${0.35 + r() * 0.5})`; x.beginPath(); x.ellipse(h + Math.cos(a) * rr, h + Math.sin(a) * rr, s * 1.8, s * 0.7, a + Math.PI / 2, 0, 7); x.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return (lpFoamT = t);
}

// 河中崖島：回傳 Group（name 'island'；原點＝平台中心，頂面 y≈0，河面在 y=−height）
//   radius 平台半徑；seed 形狀；tone 見 LP_TONE；rim 要避開崖緣石的角度（度，0＝+z）；height 平台離水高；dock 碼頭角度（度）
//   斧劈皴鋸齒層理崖體往下入河、水線上方濕暗帶、白沫泥沙環＋兩圈漣漪、蘆葦、水中礁石、崖柏；dock 方向一道石階下到木棧碼頭
//   userData：water（河面 y）、depth、dock {deg, out（往外單位向量）, path（本地點：平台內→階頂→階底→碼頭端）, end（碼頭端）, deckY}
function lpIsland({ radius: R = 5, seed = 1, tone = 'base', rim = [], height: HT = 1.6, dock: dockDeg = 50 } = {}) {
  const T = LP_TONE[tone] || LP_TONE.base, rnd = mulberry32(seed), sn = new SimplexNoise({ random: rnd });
  const C = h => new THREE.Color(h), V = THREE.Vector3, g = new THREE.Group(); g.name = 'island';
  const DG = lpDockGeo(R, HT), H = DG.H, D2R = Math.PI / 180, da = dockDeg * D2R, out = new V(Math.sin(da), 0, Math.cos(da));
  const near = (a, d, w) => { let x = a / D2R - d; x = ((x + 540) % 360) - 180; return Math.abs(x) < w; };
  // ---- 平台頂面：極座標網格，中央平、近邊緣微微下彎，土色兩色斑駁 ----
  const top = new THREE.RingGeometry(0.001, R, 72, 10).rotateX(-Math.PI / 2), tp = top.attributes.position, tc = [];
  const cTop = C(T.top), cTop2 = C(T.top2), tmp = new THREE.Color();
  for (let i = 0; i < tp.count; i++) {
    const px = tp.getX(i), pz = tp.getZ(i), rr = Math.hypot(px, pz) / R;
    tp.setY(i, -0.025 + 0.02 * sn.noise(px * 0.5, pz * 0.5) - 0.14 * Math.pow(Math.max(0, rr - 0.9) / 0.1, 2));
    tmp.copy(cTop).lerp(cTop2, 0.5 + 0.5 * sn.noise(px * 0.35 + 9, pz * 0.35)).multiplyScalar(1 - 0.12 * Math.max(0, rr - 0.85) / 0.15); tc.push(tmp.r, tmp.g, tmp.b);
  }
  top.setAttribute('color', new THREE.Float32BufferAttribute(tc, 3)); top.computeVertexNormals();
  const topMat = lpCel('#ffffff', { vertexColors: true }).clone(); topMat.map = lpEarthTex(); topMat.map.repeat.set(3, 3);
  const topM = new THREE.Mesh(top, topMat); topM.name = 'island-top'; g.add(topM);
  // ---- 崖體：一圈圈不規則環往下入河，鋸齒狀層理；朝下＝墨色陰面、朝上岩階＝浮塵；水線上方一道濕暗青苔帶；水下混進河水色 ----
  const cUp = C(T.up), cUp2 = C(T.up2), cLow = C(T.low), cLow2 = C(T.low2), cInk = C('#3a3128'), cDust = C(T.top2), cWet = C('#4a5446'), cRiver = C(T.sky[2]), _c2 = new THREE.Color();
  const _a = new V(), _b = new V(), _n = new V(), CREASE = Math.cos(50 * D2R), s0 = seed % 97, steps = Math.max(3, Math.round(H * 1.1));
  const NS = 56, NJ = Math.max(10, Math.round(H * 4)), ring = [];
  for (let j = 0; j <= NJ; j++) {
    const t = j / NJ, row = [];
    for (let k = 0; k <= NS; k++) {
      const a = (k % NS + (j % 2) * 0.35) / NS * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
      const ph = t * steps + 0.5 * sn.noise(ca * 0.9 + s0, sa * 0.9), saw = ph % 1, amp = Math.min(1, 0.15 + t * 5);
      const rr = R * lpCliffProfile(t) * (1 + amp * (0.1 * sn.noise3d(ca * 1.5 + s0, sa * 1.5, t * 2.4) + 0.05 * sn.noise3d(ca * 4.5, sa * 4.5 + s0, t * 7) + 0.02 * sn.noise3d(ca * 12, sa * 12, t * 20 + s0))) * (1 + amp * 0.1 * saw);
      row.push([sa * rr, -0.1 - t * H + (j ? 0.12 * sn.noise(ca * 2 + s0, sa * 2) : 0), ca * rr, t, k / NS, -ph]);
    }
    ring.push(row);
  }
  const tris = [], ur = Math.max(2, Math.round(R * 1.2));
  for (let j = 0; j < NJ; j++) for (let k = 0; k < NS; k++) { const a = ring[j][k], b = ring[j][k + 1], c = ring[j + 1][k], d = ring[j + 1][k + 1]; tris.push([a, c, b], [b, c, d]); }
  const fn = tris.map(([p, q, r]) => { _a.set(q[0] - p[0], q[1] - p[1], q[2] - p[2]); _b.set(r[0] - p[0], r[1] - p[1], r[2] - p[2]); return new V().crossVectors(_a, _b); });
  const fu = fn.map(n => n.clone().normalize()), key = v => Math.round(v[0] * 1e3) + ',' + Math.round(v[1] * 1e3) + ',' + Math.round(v[2] * 1e3), groups = new Map();
  tris.forEach((tr, f) => tr.forEach(v => { const k = key(v); (groups.get(k) || groups.set(k, []).get(k)).push(f); }));
  const pos = [], col = [], uv = [], nor = [];
  tris.forEach((tr, f) => tr.forEach(v => {
    _n.set(0, 0, 0); for (const gi of groups.get(key(v))) if (fu[gi].dot(fu[f]) > CREASE) _n.add(fn[gi]); _n.normalize();
    pos.push(v[0], v[1], v[2]); nor.push(_n.x, _n.y, _n.z); uv.push(v[4] * ur, v[5]);
    const t = v[3], ang = Math.atan2(v[0], v[2]), f2 = scSmoothCore(0.15, 0.55, t), y = v[1];
    tmp.copy(cUp).lerp(cUp2, 0.5 + 0.5 * sn.noise(ang * 1.3 + s0, t * 3)).lerp(_c2.copy(cLow).lerp(cLow2, 0.5 + 0.5 * sn.noise(ang * 2 + 4, t * 4)), f2);
    tmp.multiplyScalar(0.97 + 0.06 * sn.noise(ang * 6 + s0, t * 9));
    tmp.multiplyScalar(1 - 0.14 * scSmoothCore(0.35, 0.6, sn.noise(ang * 9 + s0, t * 1.5)));
    if (_n.y < -0.2) tmp.lerp(cInk, Math.min(0.35, (-_n.y - 0.2) * 1.1));
    else if (_n.y > 0.3) tmp.lerp(cDust, Math.min(0.45, (_n.y - 0.3) * 1.3));
    if (t < 0.06) tmp.lerp(cDust, 0.4 * (1 - t / 0.06));
    const above = y + HT;                                                             // 離水高
    tmp.lerp(cWet, 0.55 * (1 - scSmoothCore(0, 0.55 + 0.25 * sn.noise(ang * 5 + s0, 3), above)));   // 水線上方濕暗帶（參差）
    if (above < 0) tmp.lerp(cRiver, Math.min(0.85, 0.45 - above * 0.5));              // 水下混進河色
    col.push(tmp.r, tmp.g, tmp.b);
  }));
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  const cliffMat = lpCel('#ffffff', { vertexColors: true }).clone(); cliffMat.map = lpCunTex();
  if (!lpCliffGrad) { lpCliffGrad = new THREE.DataTexture(new Uint8Array([150, 150, 165, 185, 210, 235, 255, 255].flatMap(v => [v, v, v, 255])), 8, 1); lpCliffGrad.minFilter = lpCliffGrad.magFilter = THREE.LinearFilter; lpCliffGrad.needsUpdate = true; }
  cliffMat.gradientMap = lpCliffGrad;
  const cliff = new THREE.Mesh(geo, cliffMat); cliff.name = 'island-cliff'; g.add(cliff);
  const Rw = DG.Rw;                                                                     // 水線處崖岸半徑（約）
  // ---- 石階＋木棧碼頭（dock 方向）：石階從平台邊往外往下，每級一塊石墩到水；碼頭甲板離水 0.35 ----
  const { deckY, rise, run, nSt, rTop, rBot, rEnd } = DG, side = new V(out.z, 0, -out.x), dk = [], cStone = C(T.up).lerp(C('#d8cdb4'), 0.35), cStone2 = C(T.up2);
  const at = (r, y) => new V(out.x * r, y, out.z * r);
  for (let i = 0; i < nSt; i++) {                                                     // 第 i 級頂面 y＝−(i+1)·rise（最後一級＝甲板高）
    const yT = i === nSt - 1 ? deckY : -(i + 1) * rise, hgt = yT + HT + 0.6, c = at(rTop + (i + 0.5) * run, yT - hgt / 2);
    dk.push(lpPaintGeo(new THREE.BoxGeometry(1.15, hgt, run + 0.02).rotateY(da).translate(c.x, c.y, c.z), (i % 2 ? cStone : tmp.copy(cStone).lerp(cStone2, 0.4)).getStyle()));
  }
  for (const s of [-1, 1]) {                                                          // 石階兩側矮石欄（斜）
    const L = Math.hypot(nSt * run, -deckY), m = at((rTop + rBot) / 2, deckY / 2 + 0.12).addScaledVector(side, s * 0.6);
    dk.push(lpPaintGeo(new THREE.BoxGeometry(0.12, 0.16, L).rotateX(Math.atan2(-deckY, nSt * run)).rotateY(da).translate(m.x, m.y, m.z), cStone2.getStyle()));
  }
  const cWood = C('#8a6844'), cWood2 = C('#a07a50'), cPost = C('#5a4430'), nPl = Math.round((rEnd - rBot) / 0.32);
  for (let i = 0; i < nPl; i++) { const c = at(rBot + (i + 0.5) * (rEnd - rBot) / nPl, deckY - 0.05);
    dk.push(lpPaintGeo(new THREE.BoxGeometry(1.3, 0.1, (rEnd - rBot) / nPl - 0.04).rotateY(da).translate(c.x, c.y, c.z), (i % 3 ? cWood : cWood2).getStyle())); }
  for (const u of [0.35, 1]) for (const s of [-1, 1]) { const c = at(rBot + u * (rEnd - rBot) - 0.08, deckY - 0.4).addScaledVector(side, s * 0.58);
    dk.push(lpPaintGeo(new THREE.CylinderGeometry(0.07, 0.08, 1.2, 6).translate(c.x, c.y + (u === 1 ? 0.25 : 0), c.z), cPost.getStyle())); }   // 端柱高出甲板當繫纜樁
  const dockM = new THREE.Mesh(BGU.mergeGeometries(dk), lpCel('#ffffff', { vertexColors: true, flat: true })); dockM.name = 'island-dock'; g.add(dockM);
  // ---- 崖緣碎石與乾草（避開碼頭與 rim） ----
  const avoid = a => near(a, dockDeg, 16) || rim.some(d => near(a, d, 9));
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new V(), p3 = new V();
  const stones = []; for (let i = 0; i < 16; i++) { const a = (i + rnd() * 0.6) / 16 * Math.PI * 2; if (!avoid(a)) stones.push(a); }
  const st = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), lpCel('#ffffff', { flat: true }), stones.length), cS = C(T.up), cS2 = C(T.top2);
  stones.forEach((a, i) => { const rr = R - 0.1 + rnd() * 0.08, s = 0.05 + rnd() * 0.07; st.setColorAt(i, tmp.copy(cS).lerp(cS2, rnd() * 0.6));
    m4.compose(p3.set(Math.sin(a) * rr, -0.06, Math.cos(a) * rr), q.setFromEuler(e.set(rnd() * 3, rnd() * 3, rnd() * 3)), sc.set(s * (1.2 + rnd() * 0.6), s * 0.75, s)); st.setMatrixAt(i, m4); });
  st.name = 'island-rimstones'; g.add(st);
  const blade = []; for (let i = 0; i < 7; i++) { const a = i * 2.4, tilt = 0.25 + (i % 3) * 0.15, L = 0.14 + (i % 4) * 0.035;
    blade.push(new THREE.ConeGeometry(0.016, L, 4).translate(0, L / 2, 0).rotateZ(tilt).rotateY(a).translate(Math.cos(a) * 0.03, 0, Math.sin(a) * 0.03)); }
  const bladeG = BGU.mergeGeometries(blade), tufts = []; for (let i = 0; i < 30; i++) { const a = rnd() * Math.PI * 2; if (!avoid(a)) tufts.push(a); }
  const tuft = new THREE.InstancedMesh(bladeG, lpCel('#ffffff'), tufts.length), cT = C('#8f9a56'), cT2 = C('#6f7a4c');
  tufts.forEach((a, i) => { const rr = R - 0.08 - rnd() * 0.4, s = 0.7 + rnd() * 0.6;
    m4.compose(p3.set(Math.sin(a) * rr, -0.04, Math.cos(a) * rr), q.setFromEuler(e.set(0, rnd() * 6.3, 0)), sc.set(s, s * (0.8 + rnd() * 0.5), s)); tuft.setMatrixAt(i, m4);
    tuft.setColorAt(i, tmp.copy(cT).lerp(cT2, rnd() * 0.5).lerp(cTop, 0.25)); });
  tuft.name = 'island-tufts'; g.add(tuft);
  // ---- 水邊蘆葦：水線一叢叢高草（避開碼頭與正前方鏡頭） ----
  const reeds = []; for (let i = 0; i < 18; i++) { const a = rnd() * Math.PI * 2; if (!near(a, dockDeg, 24) && Math.cos(a) < 0.7) reeds.push(a); }
  const reed = new THREE.InstancedMesh(bladeG, lpCel('#ffffff'), reeds.length), cR = C('#7a8a4a'), cR2 = C('#a8a060');
  reeds.forEach((a, i) => { const rr = Rw + 0.05 + rnd() * 0.35, s = 2.2 + rnd() * 1.6;
    m4.compose(p3.set(Math.sin(a) * rr, -HT - 0.05, Math.cos(a) * rr), q.setFromEuler(e.set(0, rnd() * 6.3, 0)), sc.set(s * 0.8, s * (1.2 + rnd() * 0.6), s * 0.8)); reed.setMatrixAt(i, m4);
    reed.setColorAt(i, tmp.copy(cR).lerp(cR2, rnd())); });
  reed.name = 'island-reeds'; g.add(reed);
  // ---- 水中礁石：島後方 2–3 塊半露出水面的岩塊 ----
  const nRf = 2 + Math.floor(rnd() * 2), reef = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), lpCel(T.up2, { flat: true }), nRf);
  for (let i = 0; i < nRf; i++) { let a = Math.PI * (0.65 + rnd() * 0.7); if (near(a, dockDeg, 40)) a += Math.PI * 0.5; const rr = Rw + 0.9 + rnd() * 1.2, s = 0.35 + rnd() * 0.4;
    m4.compose(p3.set(Math.sin(a) * rr, -HT + s * 0.15, Math.cos(a) * rr), q.setFromEuler(e.set(rnd(), rnd() * 6, rnd())), sc.set(s * 1.4, s * 0.8, s)); reef.setMatrixAt(i, m4); }
  reef.name = 'island-reefs'; g.add(reef);
  // ---- 崖柏：從崖面斜伸出去的虯曲老幹＋扁平葉團（避開碼頭） ----
  const cliffAt = (a, t, o = 0) => { const rr = R * lpCliffProfile(t) * 1.06 + o; return new V(Math.sin(a) * rr, -0.1 - t * H, Math.cos(a) * rr); };
  const trunks = [], leaves = [];
  for (let i = 0; i < 2; i++) {
    let a = (i ? 0.33 : -0.33) * Math.PI * 2 + (rnd() - 0.5) * 0.4; if (near(a, dockDeg, 35)) a += Math.PI * 0.45;
    const t = 0.08 + rnd() * 0.12, base = cliffAt(a, t, -0.4), o = new V(Math.sin(a), 0, Math.cos(a)), L = 0.9 + rnd() * 0.5, dir = o.clone().multiplyScalar(0.9).add(new V(0, 0.35 + rnd() * 0.2, 0)).normalize();
    const mid = base.clone().addScaledVector(dir, L * 0.5).add(new V(0, -0.12, 0)), tip = base.clone().addScaledVector(dir, L);
    trunks.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([base, mid, tip]), 8, 0.06, 5));
    for (let k = 0; k < 4; k++) { const u = 0.45 + k * 0.18, c0 = base.clone().addScaledVector(dir, L * u).addScaledVector(o, (k % 2 ? 0.25 : -0.05)).add(new V((rnd() - 0.5) * 0.4, 0.06, (rnd() - 0.5) * 0.4));
      const sz = 0.26 + rnd() * 0.1 - k * 0.03; leaves.push([c0, sz * 0.8]);
      for (const sd of [-1, 1]) leaves.push([c0.clone().add(new V(sd * sz * 0.5, -0.03 + rnd() * 0.05, (rnd() - 0.5) * sz * 0.5)), sz * (0.45 + rnd() * 0.15)]); }
  }
  const trunkM = new THREE.Mesh(BGU.mergeGeometries(trunks), lpCel('#5a4a3c', { flat: true })); trunkM.name = 'island-pines'; g.add(trunkM);
  const leaf = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 14, 7), lpCel('#ffffff'), leaves.length), cP = C(T.pine);
  leaves.forEach(([c0, s], i) => { m4.compose(c0, q.setFromEuler(e.set(0, rnd() * 3, 0)), sc.set(s * 1.3, s * 0.3, s)); leaf.setMatrixAt(i, m4); leaf.setColorAt(i, tmp.copy(cP).multiplyScalar(0.85 + rnd() * 0.3)); });
  leaf.name = 'island-pineleaves'; g.add(leaf);
  // ---- 水線：白沫泥沙環＋兩圈往外擴的漣漪 ----
  const wy = -HT + 0.02, foam = new THREE.Mesh(new THREE.CircleGeometry(Rw / 0.69, 64).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: lpFoamTex(), color: T.mist, transparent: true, depthWrite: false, toneMapped: false }));
  foam.position.y = wy; foam.name = 'island-foam'; foam.renderOrder = 1; g.add(foam);
  const rings = [0, 1].map(() => { const m = new THREE.Mesh(new THREE.RingGeometry(0.97, 1, 64).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#f4f6ee', transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
    m.position.y = wy + 0.01; m.name = 'island-ripple'; m.renderOrder = 2; g.add(m); return m; });
  const path = [at(Math.min(3.4, rTop - 0.9), 0), at(rTop, 0), at(rBot, deckY), at(rEnd - 0.25, deckY)];
  g.userData.water = -HT; g.userData.depth = H;
  g.userData.dock = { deg: dockDeg, out: out.clone(), side, path, end: path[3].clone(), deckY };
  g.userData.anim = (dt, t) => rings.forEach((m, i) => { const u = (t * 0.12 + i * 0.5 + s0) % 1; m.scale.setScalar(Rw * (1.02 + u * 0.55)); m.material.opacity = 0.4 * Math.sin(Math.PI * u); });
  g.traverse(o => { o.raycast = () => {}; }); // 島身不擋點選與取景
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
// 第七輪縮放（同 daminghu）：等高；但轉 yaw 後的寬／深不超過 fallback 外框的 fit 倍（GLB 比程式建模寬扁時改以底面為準）。
// match：'x'｜'z' 長形物件（船、拒馬）改以該軸長度對齊。
function lpGlbFit(h, fb, ms, yaw, fit, match) {
  const a = yaw * Math.PI / 180, c = Math.abs(Math.cos(a)), n = Math.abs(Math.sin(a));
  const ex = c * ms.x + n * ms.z, ez = n * ms.x + c * ms.z;
  let s = match === 'z' ? fb.z / ez : match === 'x' ? fb.x / ex : h / ms.y;
  if (fit && fb.x > 0 && ex > 0) s = Math.min(s, fit * fb.x / ex);
  if (fit && fb.z > 0 && ez > 0) s = Math.min(s, fit * fb.z / ez);
  return s;
}
// o.front：之後才加的匾額／對聯／告示（函式或陣列，換模當下才取）。GLB 比程式建模厚時會把它們吃進牆裡，
//   換模後沿 obj 的 +z 朝前打射線，把它們往前推到 GLB 表面外 0.006。
function lpGlbFront(obj, w, list) {
  const d = new THREE.Vector3(0, 0, 1).transformDirection(obj.matrixWorld), rc = new THREE.Raycaster(), p = new THREE.Vector3(), L = 50;
  w.updateMatrixWorld(true);
  for (const f of list) {
    f.updateMatrixWorld(true); f.getWorldPosition(p);
    rc.set(p.clone().addScaledVector(d, L), d.clone().negate()); rc.far = L * 2;
    const hit = rc.intersectObject(w, true)[0];
    if (!hit) continue;
    const push = L - hit.distance + 0.006 * obj.getWorldScale(new THREE.Vector3()).z;
    if (push <= 0) continue;
    const a = f.parent.worldToLocal(p.clone()), b = f.parent.worldToLocal(p.clone().addScaledVector(d, push));
    f.position.add(b.sub(a));
  }
}
// 立即回傳 Group：先放 fallback()，載到模型後才換掉（沒有 GLB 就完全不動）。
// o.box（fallback 外框，群組局部座標）有給：lpGlbFit 縮放（fit／match／yaw）、底面貼 box.min.y（或 o.y0）、水平對齊外框中心；
// 沒給：舊行為，等比縮放到 height（width>0 改以水平最大邊長）、腳底貼 y=0、水平置中。補上 P.tag 的 pick。
function lpGlb(name, { height = 1, width = 0, yaw = 0, fallback, box, fit = 1.25, match, y0, front } = {}) {
  const g = new THREE.Group(); g.name = 'glb-' + name; g.userData.glbReady = false; g.userData.glbGroup = true;
  let fb = null;
  try { fb = typeof fallback === 'function' ? fallback() : null; } catch (e) { console.warn('[glb] fallback 失敗 ' + name, e); }
  if (fb && fb.isObject3D) g.add(fb);
  lpGlbLoad(name).then(src => {
    if (!src) return;
    const m = src.clone(true), mb = new THREE.Box3().setFromObject(m), ms = mb.getSize(new THREE.Vector3());
    if (!(ms.y > 0)) { lpGlbWarn(name, '模型沒有高度'); return; }
    const c = mb.getCenter(new THREE.Vector3()), w = new THREE.Group(); w.name = 'glb-model'; w.rotation.y = yaw * Math.PI / 180; w.add(m);
    let s;
    if (box && !box.isEmpty()) {
      const bs = box.getSize(new THREE.Vector3()), bc = box.getCenter(new THREE.Vector3()), by = y0 !== undefined ? y0 : box.min.y;
      s = lpGlbFit(height || box.max.y - by, bs, ms, yaw, fit, match);
      w.position.set(bc.x, by, bc.z);
    } else s = width > 0 ? width / Math.max(ms.x, ms.z) : height / ms.y;
    m.scale.multiplyScalar(s); m.position.set(-c.x * s, -mb.min.y * s, -c.z * s);
    let pk = null; for (let a = g; a && !pk; a = a.parent) pk = a.userData.pick;   // 第七輪：P.tag 可能標在外層（lpGlbSwap）
    m.traverse(o => { if (o.isMesh && pk) o.userData.pick = pk; });
    if (fb) g.remove(fb);
    g.add(w); g.userData.glbReady = true; LP_GLB_GEN++;
    if (front && g.parent) lpGlbFront(g.parent, w, typeof front === 'function' ? front() : front);
  });
  return g;
}

// bake 用的走訪：遇到 GLB 群組（lpGlb 回傳的群組）整棵交給 keep(o)，不拆進合併網格——否則 GLB 載到後換不掉 fallback
function lpBakeWalk(root, f, keep) { const w = o => { if (o !== root && o.userData.glbGroup) { keep(o); return; } f(o); o.children.forEach(w); }; w(root); }
// 第七輪（Dzine 全面換 GLB）：把「已放好位置」的程式建模群組 obj 換成 models/<name>.glb。
// obj 的子物件整批收進 fallback（obj 自己的位置／旋轉／縮放保留），所以沒有 GLB 時畫面與原本完全一樣；
// 有 GLB 就等比縮到 o.height（預設＝程式建模本身的高度 max.y，原點須在底面中心、正面 +z）。obj 須是 Group，且之後不可再被 bake。
// o：fit（預設 1.25；'w'＝扁平物件，改以外框較長的水平軸對齊）、match 'x'｜'z'、yaw、y0、height、front（見 lpGlb）。
function lpGlbSwap(name, obj, o = {}) {
  if (!obj || !obj.isObject3D || obj.isMesh) return obj;
  const fb = new THREE.Group(); fb.name = 'glb-fb-' + name;
  [...obj.children].forEach(c => fb.add(c));
  fb.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(fb);
  if (box.isEmpty()) { obj.add(fb); return obj; }
  const bs = box.getSize(new THREE.Vector3());
  let fit = o.fit === undefined ? 1.25 : o.fit, match = o.match;
  if (fit === 'w') { fit = 1.25; match = match || (bs.x >= bs.z ? 'x' : 'z'); }
  obj.add(lpGlb(name, { box, height: o.height || 0, yaw: o.yaw || 0, fit, match, y0: o.y0, front: o.front, fallback: () => fb }));
  return obj;
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
