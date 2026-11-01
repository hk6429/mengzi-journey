import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// 只載 core＋data＋scene 的頂層（純函式），不碰 THREE／DOM
const sb = { location: { search: '' }, matchMedia: () => ({ matches: false }), URLSearchParams, console };
vm.runInNewContext(['src/core.js', 'src/data.js', 'parts/scene.js'].map(f => fs.readFileSync(f, 'utf8')).join('\n')
  + ';globalThis.D = DATA; globalThis.S = { tone: scToneOf, cam: SC_CAM, isle: SC_ISLE, hero: SC_HERO_AT, sky: SC_SKY, skyV: scSkyV, dock: SC_DOCK, lane: SC_LANE, boat: SC_BOAT,'
  + ' moor: scMoor, route: scRoute, trip: scTrip, plen: scPathLen, plan: scBoatPlan, chase: scChaseSide, dgeo: lpDockGeo, stand: scStandFor, walk: scWalk, dir: scDir, tones: LP_TONE, fdir: scFocusDir, face: scFaceYaw };', sb);
const P = sb.D.planets, S = sb.S, ids = P.map(p => p.id);
const d2 = (a, b) => Math.hypot(a[0] - b[0], a[2] - b[2]);
const at = id => P.find(p => p.id === id).pos;

// A/B 定的碼頭角度（B：bridge 28、study −68、city 76；A 未給用預設）
const DOCK = { fields: 100, market: 175, road: 250, bridge: 28, study: -68, city: 76 };   // A、B 定的碼頭角度
const moors = P.map(p => S.moor(p.pos, DOCK[p.id] ?? S.dock)), c2 = P.map(p => [p.pos[0], p.pos[2]]);

test('河島佈局：六座崖島彼此不相撞、相鄰 18–34、平台離水 1.0–3.2 錯落；依序由左到右', () => {
  assert.equal(ids.join(), 'fields,market,road,bridge,study,city');
  for (let i = 0; i < 6; i++) for (let j = i + 1; j < 6; j++) assert.ok(d2(P[i].pos, P[j].pos) >= 2 * S.isle.R + 8, `${ids[i]}–${ids[j]} 太近`);
  for (let i = 1; i < 6; i++) { const d = d2(P[i - 1].pos, P[i].pos); assert.ok(d >= 18 && d <= 34, `${ids[i]} ${d}`); assert.ok(P[i].pos[0] > P[i - 1].pos[0]); }
  P.forEach(p => assert.ok(p.pos[1] >= 1.0 && p.pos[1] <= 3.2, p.id + ' 平台高'));
  assert.ok(new Set(P.map(p => p.pos[1])).size >= 5, '平台高要錯落');
});

test('到站鏡頭前方（+z 視錐）沒有別站的島擋著', () => {
  for (const a of P) for (const b of P) { if (a === b) continue;
    const dz = b.pos[2] - a.pos[2], dx = Math.abs(b.pos[0] - a.pos[0]);
    assert.ok(!(dz > 3 && dz < 32 && dx < 6 + dz * 0.5), `${b.id} 擋在 ${a.id} 到站鏡頭前`); }
});

test('設色：六站都有設色（沒有就退回 base）；崖色、河色 sky 三色、霧量', () => {
  for (const id of ids) { assert.equal(S.tone(id), id); const T = S.tones[id];
    for (const k of ['top', 'top2', 'up', 'up2', 'low', 'low2', 'pine', 'mist']) assert.match(T[k], /^#[0-9a-f]{6}$/, id + k);
    assert.equal(T.sky.length, 3); assert.ok(T.fog >= 0 && T.fog <= 1); }
  assert.equal(S.tone('nope'), 'base');
  assert.ok(S.tones.road.fog > S.tones.fields.fog, '古道最冷最霧');
});

test('碼頭：石階從平台邊下到甲板（離水 0.35）、碼頭端伸出水線崖岸外；船頭頂著碼頭端、船身朝外', () => {
  for (const h of [1, 1.6, 2.2, 3.2]) { const g = S.dgeo(5, h);
    assert.ok(g.rBot > g.rTop && g.rEnd >= g.Rw + 1.6, '碼頭端在崖岸外'); assert.ok(Math.abs(g.deckY + h - 0.35) < 1e-9);
    assert.ok(g.nSt * g.rise >= -g.deckY - 1e-9 && g.rise <= 0.3, '每級 ≤ 0.3'); }
  moors.forEach((m, i) => { const r = Math.hypot(m.m[0] - c2[i][0], m.m[1] - c2[i][1]), e = Math.hypot(m.end[0] - c2[i][0], m.end[2] - c2[i][1]);
    assert.ok(r - e > S.boat.half && r - e < S.boat.half + 0.6, ids[i] + ' 船頭頂著碼頭');
    assert.ok(Math.abs(Math.atan2(Math.sin(m.yaw - Math.atan2(-m.out[0], -m.out[1])), 1)) < 1e-9, '船頭朝島'); });
});

test('航道：相鄰站與跨站都繞開每座島（離島心 ≥ R+2.4），起訖在兩站停靠點', () => {
  const chk = (pts, tag) => { pts.forEach((q, k) => c2.forEach((c, j) => { const d = Math.hypot(q[0] - c[0], q[1] - c[1]);
    assert.ok(d >= S.isle.R + 2.4, `${tag} 第 ${k} 點離 ${ids[j]} ${d.toFixed(2)}`); })); };
  for (let i = 0; i + 1 < 6; i++) { const r = S.route(moors[i], moors[i + 1], c2); chk(r, ids[i] + '→' + ids[i + 1]);
    assert.deepEqual(r[0], moors[i].m); assert.deepEqual(r[r.length - 1], moors[i + 1].m); }
  chk(S.trip(moors, c2), '全程'); chk(S.trip([moors[4], moors[3], moors[2]], c2), '倒退跨站');
});

test('行程：走下石階＋上船＋划行＋下船＋走上平台，相鄰與最長跨站都在 5–9 秒', () => {
  const g = S.dgeo(5, 3.2), stair = g.rEnd + 4;
  for (const [a, b] of [[0, 1], [2, 3], [4, 5], [0, 5], [5, 0]]) { const st = a < b ? 1 : -1, ch = []; for (let i = a; i !== b + st; i += st) ch.push(moors[i]);
    const p = S.plan(stair, S.plen(S.trip(ch, c2)), stair); assert.ok(p.dur >= 5 && p.dur <= 9, `${ids[a]}→${ids[b]} ${p.dur}`);
    assert.ok(p.sail >= 3, '划行至少 3 秒'); }
});

test('划行跟拍側：回傳 ±1，且選的那側鏡頭離島比較遠', () => {
  for (let i = 0; i + 1 < 6; i++) { const r = S.route(moors[i], moors[i + 1], c2), s = S.chase(r, c2); assert.ok(s === 1 || s === -1); }
});

test('鏡頭：到站從 +z 仰角 11°（直式較高）；360 度方位、仰角 5–60°；縮放有上下限（最近 ≥ 6.5、最遠 ≤ 32）', () => {
  const C = S.cam;
  assert.equal(C.el, 11); assert.ok(C.elPortrait > C.el && C.elPortrait <= 32); assert.ok(C.minD >= 6.5 && C.maxD <= 32); assert.equal(C.elMin, 5); assert.equal(C.elMax, 60); assert.ok(C.minD > 1 && C.maxD < 80 && C.minD < C.maxD);
  assert.ok(C.focusEl >= C.elMin && C.focusEl <= C.elMax);
  const d = S.dir(C.el); assert.ok(Math.abs(Math.hypot(...d) - 1) < 1e-9); assert.ok(d[2] > 0.9 && Math.abs(d[0]) < 1e-9);
  const s = S.dir(10, 120); assert.ok(Math.abs(Math.atan2(s[0], s[2]) * 180 / Math.PI - 120) < 1e-9);
});

test('全景天空：地平線（圖高 52%）落在仰角 0°附近；帶狀涵蓋 −47°～+43°；接縫淡化 2–8°', () => {
  assert.ok(Math.abs(S.skyV(0) - 0.52) < 0.01);
  assert.equal(S.skyV(S.sky.bot), 0); assert.equal(S.skyV(S.sky.top), 1);
  assert.ok(S.sky.seam >= 2 && S.sky.seam <= 8);
});

test('站位：新格式 [x,z] 夾進平台半徑；沒給（或舊格式）就站在元素側邊（元素→島心方向的垂直方向）、離主角原位近的那邊', () => {
  const box = { x0: 1, x1: 2, z0: -2, z1: -1 }, c0 = [1.5, -1.5];
  assert.deepEqual([...S.stand(box, [1.5, 0.8])], [1.5, 0.8]);
  const c = S.stand(box, [5.5, 3]); assert.ok(Math.hypot(...c) <= S.isle.use - 0.2 + 1e-9, '夾進平台');
  const o = S.stand(box, [70, -30]), v = [o[0] - c0[0], o[1] - c0[1]], toC = [-c0[0], -c0[1]];
  assert.ok(Math.abs(v[0] * toC[0] + v[1] * toC[1]) / Math.hypot(...v) / Math.hypot(...toC) < 0.05, '在側邊（垂直於元素→島心）');
  assert.ok(Math.hypot(o[0] - S.hero[0], o[1] - S.hero[1]) < Math.hypot(2 * c0[0] - o[0] - S.hero[0], 2 * c0[1] - o[1] - S.hero[1]), '取離主角原位近的一側');
  assert.ok(Math.hypot(...o) <= S.isle.use);
  assert.deepEqual([...S.stand(box, null)], [...o]);
  const mid = S.stand({ x0: -0.5, x1: 0.5, z0: -0.5, z1: 0.5 }, null); assert.ok(Math.hypot(...mid) > 1, '元素在島心也站得開');
});

test('特寫方向：從「元素→主角」偏約 63°、取朝島外那側；主角面向至少 3/4 側臉（離鏡頭方向 ≤ 70°）', () => {
  const D = 180 / Math.PI, ang = (a, b) => Math.acos(Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1]))) * D;
  for (const [el, st, out] of [[[0, -1], [1.5, -1], [0.6, 0]], [[1, 1], [1, 2.5], [1, 2]], [[-2, 0], [-2, 1.4], [-1, 0.2]]]) {
    const h = S.fdir(el, st, out), u = [st[0] - el[0], st[1] - el[1]], l = Math.hypot(...u);
    assert.ok(Math.abs(Math.hypot(...h) - 1) < 1e-9);
    assert.ok(Math.abs(ang(h, [u[0] / l, u[1] / l]) - 63.4) < 1, '偏 63°');
    const o = Math.hypot(...out), other = [2 * (u[0] / l) * (h[0] * u[0] / l + h[1] * u[1] / l) - h[0], 2 * (u[1] / l) * (h[0] * u[0] / l + h[1] * u[1] / l) - h[1]];
    assert.ok(h[0] * out[0] / o + h[1] * out[1] / o >= other[0] * out[0] / o + other[1] * out[1] / o - 1e-9, '朝島外那側');
  }
  assert.deepEqual([...S.fdir([0, 0], [0.1, 0], [0, 3])], [0, 1], '主角就在元素上：照島外方向');
  for (let ly = -3; ly <= 3; ly += 0.5) for (let cy = -3; cy <= 3; cy += 0.5) { const w = S.face(ly, cy), e = Math.abs(Math.atan2(Math.sin(w - cy), Math.cos(w - cy))) * D; assert.ok(e <= 70 + 1e-6, `${ly},${cy} → ${e}`); }
  assert.ok(Math.abs(S.face(0, 1) - 0.6) < 1e-9, '小角度照 60% 轉');
});

test('走路：直線、終點準、含起步 0.3 秒不超過 3.8 秒（D 線 walked 4 秒逾時）', () => {
  const R = S.isle.use - 0.2, pts = [[R, 0], [-R, 0], [0, -R], [S.hero[0], S.hero[1]], [0.5, -1]];
  for (const a of pts) for (const b of pts) {
    const w = S.walk(a, b);
    assert.ok(0.3 + w.dur <= 3.8, `${a}→${b} ${w.dur}`);
    const near = (p, q) => Math.abs(p[0] - q[0]) < 1e-9 && Math.abs(p[1] - q[1]) < 1e-9; assert.ok(near(w.at(1), b) && near(w.at(0), a), '端點');
  }
  assert.equal(S.walk([0, 0], [0.05, 0]).dur, 0, '很近就不走');
  assert.ok(S.walk([0, 0], [8, 0]).hop, '太遠改小跳步');
});
