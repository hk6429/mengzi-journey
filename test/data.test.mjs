import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const s = {}; vm.runInNewContext(fs.readFileSync('src/data.js', 'utf8') + ';globalThis.D=DATA;', s);
const D = s.D;
test('六站、id 唯一、元素 id 站內唯一', () => {
  assert.deepEqual(Array.from(D.planets, p => p.id), ['fields', 'market', 'road', 'bridge', 'study', 'city']);
  D.planets.forEach(p => assert.equal(new Set(p.elements.map(e => e.id)).size, p.elements.length, p.id));
});
// 原文不改（公共領域，國教院示例「是人」版本）
test('yuan 原文與第一版逐字相同', () => {
  const y = D.planets.map(p => p.yuan).join('');
  assert.equal(y, '舜發於畎畝之中，傅說舉於版築之間。膠鬲舉於魚鹽之中，管夷吾舉於士，孫叔敖舉於海，百里奚舉於市。故天將降大任於是人也，必先苦其心志，勞其筋骨，餓其體膚，空乏其身，行拂亂其所為。所以動心忍性，曾益其所不能。人恆過，然後能改；困於心，衡於慮，而後作；徵於色，發於聲，而後喻。入則無法家拂士，出則無敵國外患者，國恆亡。然後知生於憂患，而死於安樂也。');
});
// 白話不得直接搬原文：去掉標點後，任一段白話與全部原文不得有連續 8 字相同
test('白話不與原文連續重複 8 字以上', () => {
  const strip = t => t.replace(/[^㐀-鿿]/g, '');
  const yuan = D.planets.map(p => strip(p.yuan)).join('|');
  D.planets.forEach(p => p.story.forEach((t, i) => {
    const c = strip(t);
    for (let k = 0; k + 8 <= c.length; k++) assert.ok(!yuan.includes(c.slice(k, k + 8)), `${p.id}-${i + 1} 與原文重複：${c.slice(k, k + 8)}`);
  }));
});
test('每站 quiz 5 題', () => D.planets.forEach(p => assert.equal((D.quiz[p.id] || []).length, 5, p.id)));
test('沒有（待寫／待改）', () => assert.ok(!/待寫|待改/.test(JSON.stringify(D))));
test('段數固定 5、每段 60–130 字（第一版朗讀已錄，改字要重錄）', () => D.planets.forEach(p => {
  assert.equal(p.story.length, 5, p.id);
  p.story.forEach((t, i) => assert.ok([...t].length >= 60 && [...t].length <= 130, `${p.id}-${i + 1}`));
}));
test('元素說明 40–90 字', () => D.planets.forEach(p => p.elements.forEach(e => { const n = [...e.desc].length; assert.ok(n >= 40 && n <= 90, `${p.id}/${e.id} ${n} 字`); })));
test('next：前五站是乘舟過場，最後一站是結尾', () => D.planets.forEach((p, i) => {
  assert.ok(p.next && [...p.next].length >= 20, p.id);
  if (i < D.planets.length - 1) assert.ok(/舟|船/.test(p.next), p.id + ' next 要寫乘舟／船');
  else assert.ok(p.next.includes('六座島') && p.next.includes('結論'), 'city next 結尾');
}));
test('六個人的起點：順序、傳說標註、欄位長度', () => {
  assert.equal(D.adults.map(a => a.who.replace(/（.*）/, '')).join(), '舜,傅說,膠鬲,管夷吾,孫叔敖,百里奚');
  assert.ok(D.adults[0].who.includes('傳說') && D.adults[1].who.includes('傳說'), '舜、傅說要標傳說');
  D.adults.forEach(a => assert.ok([...a.cares].length >= 6 && [...a.prince].length >= 8, a.who));
});
// 第三輪：正解不可總是最長（壓在 1/3 以下）、選項字數差 ≤ 3
test('測驗正解不總是最長、選項等長', () => {
  const L = t => [...t].length; let longest = 0;
  Object.entries(D.quiz).forEach(([k, qs]) => qs.forEach((q, i) => {
    const l = q.c.map(L); assert.ok(Math.max(...l) - Math.min(...l) <= 3, `${k}-${i + 1} 選項長短差太多`);
    if (l[q.a] > Math.max(...l.filter((_, j) => j !== q.a))) longest++;
  }));
  assert.ok(longest <= 10, `正解最長 ${longest} 題`);
});
