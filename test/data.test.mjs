import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const s = {}; vm.runInNewContext(fs.readFileSync('src/data.js', 'utf8') + ';globalThis.D=DATA;', s);
const D = s.D;
test('八站、id 唯一、元素 id 站內唯一', () => {
  assert.deepEqual(Array.from(D.planets, p => p.id), ['baihua', 'ju', 'mudan', 'yuni', 'jing', 'xiang', 'pin', 'lianxi']);
  D.planets.forEach(p => assert.equal(new Set(p.elements.map(e => e.id)).size, p.elements.length, p.id));
});
test('每站 yuan 原文非空', () => D.planets.forEach(p => assert.ok(typeof p.yuan === 'string' && p.yuan.length >= 5, p.id)));
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
// 第二輪：騎青蛙在荷葉間跳，段數照契約固定，白話裡不再出現划舟撐篙
test('段數固定、每段 60–130 字', () => {
  const SEGS = { baihua: 5, ju: 6, mudan: 6, yuni: 6, jing: 5, xiang: 6, pin: 6, lianxi: 6 };
  D.planets.forEach(p => { assert.equal(p.story.length, SEGS[p.id], p.id); p.story.forEach((t, i) => assert.ok([...t].length >= 60 && [...t].length <= 130, `${p.id}-${i + 1}`)); });
});
test('白話沒有舟、篙、划、船', () => D.planets.forEach(p => {
  const txt = JSON.stringify([p.story, p.next, p.elements.map(e => e.name + e.desc), p.gloss, D.quiz[p.id]]);
  assert.ok(!/[舟篙划船]/.test(txt), p.id);
}));
// 第三輪：正解不可總是最長（壓在 1/3 以下）、選項字數差 ≤ 3、台灣用字「託物言志」
test('測驗正解不總是最長、選項等長', () => {
  const L = t => [...t].length; let longest = 0;
  Object.entries(D.quiz).forEach(([k, qs]) => qs.forEach((q, i) => {
    const l = q.c.map(L); assert.ok(Math.max(...l) - Math.min(...l) <= 3, `${k}-${i + 1} 選項長短差太多`);
    if (l[0] > Math.max(...l.slice(1))) longest++;
  }));
  assert.ok(longest <= 13, `正解最長 ${longest} 題`);
});
test('用「託物言志」不用「托物」', () => assert.ok(!/托物/.test(JSON.stringify(D))));
