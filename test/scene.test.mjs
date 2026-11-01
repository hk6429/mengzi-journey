import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// 只載 core＋data＋scene 的頂層（純函式），不碰 THREE／DOM
const sb = { location: { search: '' }, matchMedia: () => ({ matches: false }), URLSearchParams, console };
vm.runInNewContext(['src/core.js', 'src/data.js', 'parts/scene.js'].map(f => fs.readFileSync(f, 'utf8')).join('\n')
  + ';globalThis.D = DATA; globalThis.S = { tone: scToneOf, cam: SC_CAM, isle: SC_ISLE, hero: SC_HERO_AT, frog: SC_FROG_AT, sky: SC_SKY, skyV: scSkyV,'
  + ' hop: SC_HOP, plan: scHopPlan, stones: scStones, chase: scChaseSide, stand: scStandFor, walk: scWalk, dir: scDir, tones: LP_TONE, fdir: scFocusDir, face: scFaceYaw, fpose: scFrogPose };', sb);
const P = sb.D.planets, S = sb.S, ids = P.map(p => p.id);
const d2 = (a, b) => Math.hypot(a[0] - b[0], a[2] - b[2]);
const at = id => P.find(p => p.id === id).pos;

test('蓮池佈局：八片荷葉彼此不相撞、相鄰 16–36、葉高 0.8–3.0；菊園在遠角、蓮叢在中央、濂溪在一側', () => {
  assert.equal(ids.join(), 'baihua,ju,mudan,yuni,jing,xiang,pin,lianxi');
  for (let i = 0; i < 8; i++) for (let j = i + 1; j < 8; j++) assert.ok(d2(P[i].pos, P[j].pos) >= 2 * S.isle.R + 5, `${ids[i]}–${ids[j]} 太近`);
  for (let i = 1; i < 8; i++) { const d = d2(P[i - 1].pos, P[i].pos); assert.ok(d >= 16 && d <= 36, `${ids[i]} ${d}`); }
  P.forEach(p => assert.ok(p.pos[1] >= 0.8 && p.pos[1] <= 3.0, p.id + ' 葉高'));
  assert.ok(new Set(P.map(p => p.pos[1])).size >= 6, '葉高要錯落');
  assert.equal(at('ju')[2], Math.min(...P.slice(0, 4).map(p => p.pos[2])), '菊園在左側遠角（最靠後）');
  const gap = (a, b) => d2(at(a), at(b)), inC = Math.max(gap('yuni', 'jing'), gap('jing', 'xiang'), gap('xiang', 'pin'));
  assert.ok(inC < Math.min(gap('baihua', 'ju'), gap('ju', 'mudan'), gap('mudan', 'yuni'), gap('pin', 'lianxi')), '淤泥／中通／香遠／三花四站擠成中央蓮叢');
  assert.ok(Math.min(...P.filter(p => p.id !== 'lianxi').map(p => d2(p.pos, at('lianxi')))) > 20, '濂溪書堂獨在一側');
});

test('到站鏡頭前方（+z 視錐）沒有別站的荷葉擋著', () => {
  for (const a of P) for (const b of P) { if (a === b) continue;
    const dz = b.pos[2] - a.pos[2], dx = Math.abs(b.pos[0] - a.pos[0]);
    assert.ok(!(dz > 3 && dz < 32 && dx < 6 + dz * 0.5), `${b.id} 擋在 ${a.id} 到站鏡頭前`); }
});

test('荷葉：每站都有設色（沒有就退回 base）；sky 三色＋霧量；菊園霧最濃；主角與青蛙都站在可用半徑內', () => {
  P.forEach(p => { const t = S.tones[S.tone(p.id)]; assert.ok(t && t.sky.length === 3 && t.mist >= 0 && t.mist <= 1, p.id); assert.equal(S.tone(p.id), p.id); });
  assert.equal(S.tone('nope'), 'base');
  assert.equal(Math.max(...ids.map(i => S.tones[i].mist)), S.tones.ju.mist);
  assert.equal(S.isle.R, 5.4); assert.equal(S.isle.use, 4.6);
  assert.deepEqual([...S.hero], [0, 2.6]); assert.ok(Math.hypot(...S.frog) <= S.isle.use - 0.4, '青蛙蹲在葉面上');
  assert.ok(S.frog[0] > 1.5 && S.frog[1] > 1.5, '青蛙在葉前緣右側，不擋主角');
});

test('跳石：相鄰兩站 1–3 片（2–4 跳），每片都在水上、不在任何荷葉範圍內；每跳 3–12', () => {
  const all = P.map(p => p.pos);
  for (let i = 1; i < 8; i++) {
    const A = P[i - 1].pos, B = P[i].pos, st = S.stones(A, B, all), f = S.frog;
    assert.ok(st.length >= 1 && st.length <= 3, `${ids[i]} ${st.length}`);
    st.forEach(q => { assert.equal(q[1], 0); all.forEach(c => assert.ok(d2(q, c) >= S.isle.R + 1.2, `${ids[i]} 跳石在荷葉上`)); });
    const pts = [[A[0] + f[0], 0, A[2] + f[1]], ...st, [B[0] + f[0], 0, B[2] + f[1]]];
    for (let k = 1; k < pts.length; k++) { const d = d2(pts[k - 1], pts[k]); assert.ok(d >= 3 && d <= 12, `${ids[i]} 第 ${k} 跳 ${d.toFixed(1)}`); }
  }
});

test('連跳時間：上蛙＋每跳（蹲、騰空、落地）＋滑下，全程 5.2–8.8 秒；長途也不超過', () => {
  [[3], [6, 6], [6, 6, 6], [8, 8, 8, 8], [30, 30, 30, 30], [1, 1]].forEach(l => {
    const p = S.plan(l); assert.ok(p.dur >= 5.2 - 1e-9 && p.dur <= 8.8 + 1e-9, `${l} → ${p.dur}`);
    assert.equal(p.hops.length, l.length);
    p.hops.forEach((h, i) => { assert.ok(h.c > 0 && h.a > 0 && h.l > 0); if (i) assert.ok(Math.abs(h.t0 - (p.hops[i - 1].t0 + p.hops[i - 1].c + p.hops[i - 1].a + p.hops[i - 1].l)) < 1e-9); });
    assert.ok(Math.abs(p.hops[0].t0 - S.hop.mount) < 1e-9); assert.ok(p.off < p.dur);
  });
  assert.ok(S.plan([4, 4]).hops[0].a < S.plan([10, 10]).hops[0].a, '跳得遠騰空久');
});

test('跳躍跟拍：相鄰站都能從 +z（水面前方）側拍，不飄到別站荷葉上空', () => {
  for (let i = 1; i < 8; i++) { const f = S.frog, A = P[i - 1].pos, B = P[i].pos;
    assert.equal(S.chase([A[0] + f[0], 0, A[2] + f[1]], [B[0] + f[0], 0, B[2] + f[1]], P.filter((_, k) => k !== i && k !== i - 1).map(p => p.pos)), 1, ids[i]); }
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

test('站位：新格式 [x,z] 夾進平台半徑；沒給（或舊格式）就站在元素側邊（元素→葉心方向的垂直方向）、離主角原位近的那邊', () => {
  const box = { x0: 1, x1: 2, z0: -2, z1: -1 }, c0 = [1.5, -1.5];
  assert.deepEqual([...S.stand(box, [1.5, 0.8])], [1.5, 0.8]);
  const c = S.stand(box, [5.5, 3]); assert.ok(Math.hypot(...c) <= S.isle.use - 0.2 + 1e-9, '夾進平台');
  const o = S.stand(box, [70, -30]), v = [o[0] - c0[0], o[1] - c0[1]], toC = [-c0[0], -c0[1]];
  assert.ok(Math.abs(v[0] * toC[0] + v[1] * toC[1]) / Math.hypot(...v) / Math.hypot(...toC) < 0.05, '在側邊（垂直於元素→葉心）');
  assert.ok(Math.hypot(o[0] - S.hero[0], o[1] - S.hero[1]) < Math.hypot(2 * c0[0] - o[0] - S.hero[0], 2 * c0[1] - o[1] - S.hero[1]), '取離主角原位近的一側');
  assert.ok(Math.hypot(...o) <= S.isle.use);
  assert.deepEqual([...S.stand(box, null)], [...o]);
  const mid = S.stand({ x0: -0.5, x1: 0.5, z0: -0.5, z1: 0.5 }, null); assert.ok(Math.hypot(...mid) > 1, '元素在葉心也站得開');
});

test('特寫方向：從「元素→主角」偏約 63°、取朝葉外那側；主角面向至少 3/4 側臉（離鏡頭方向 ≤ 70°）', () => {
  const D = 180 / Math.PI, ang = (a, b) => Math.acos(Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1]))) * D;
  for (const [el, st, out] of [[[0, -1], [1.5, -1], [0.6, 0]], [[1, 1], [1, 2.5], [1, 2]], [[-2, 0], [-2, 1.4], [-1, 0.2]]]) {
    const h = S.fdir(el, st, out), u = [st[0] - el[0], st[1] - el[1]], l = Math.hypot(...u);
    assert.ok(Math.abs(Math.hypot(...h) - 1) < 1e-9);
    assert.ok(Math.abs(ang(h, [u[0] / l, u[1] / l]) - 63.4) < 1, '偏 63°');
    const o = Math.hypot(...out), other = [2 * (u[0] / l) * (h[0] * u[0] / l + h[1] * u[1] / l) - h[0], 2 * (u[1] / l) * (h[0] * u[0] / l + h[1] * u[1] / l) - h[1]];
    assert.ok(h[0] * out[0] / o + h[1] * out[1] / o >= other[0] * out[0] / o + other[1] * out[1] / o - 1e-9, '朝葉外那側');
  }
  assert.deepEqual([...S.fdir([0, 0], [0.1, 0], [0, 3])], [0, 1], '主角就在元素上：照葉外方向');
  for (let ly = -3; ly <= 3; ly += 0.5) for (let cy = -3; cy <= 3; cy += 0.5) { const w = S.face(ly, cy), e = Math.abs(Math.atan2(Math.sin(w - cy), Math.cos(w - cy))) * D; assert.ok(e <= 70 + 1e-6, `${ly},${cy} → ${e}`); }
  assert.ok(Math.abs(S.face(0, 1) - 0.6) < 1e-9, '小角度照 60% 轉');
});

test('青蛙各站待機點：在葉面前緣右側（可用半徑內），八站位置或姿勢不全一樣', () => {
  const ps = ids.map(i => S.fpose(i));
  ps.forEach((q, k) => { const x = S.frog[0] + q.d[0], z = S.frog[1] + q.d[1]; assert.ok(Math.hypot(x, z) <= 4.3 && z > 1.5 && x > 1.5, ids[k]); });
  assert.ok(new Set(ps.map(q => [q.d, q.yaw, q.crouch, q.pitch].join())).size === 8, '八站各不相同');
  assert.deepEqual([...S.fpose('nope').d], [0, 0]);
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
