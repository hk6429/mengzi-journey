import test from 'node:test';
import assert from 'node:assert/strict';
import {stations} from '../src/data.js';

test('六站古文、白話與測驗資料完整', () => {
  assert.equal(stations.length, 6);
  assert.equal(new Set(stations.map(s => s.id)).size, 6);
  for (const s of stations) {
    assert.ok(s.yuan && s.think && Object.keys(s.gloss).length);
    assert.equal(s.story.length, 5);
    for(const text of s.story)assert.ok(text.length>=60&&text.length<=130,`${s.id} 白話段落長度 ${text.length}`);
    assert.equal(s.quiz.length, 5);
    for (const [q, choices, answer, why] of s.quiz) {
      assert.ok(q && why);
      assert.equal(choices.length, 4);
      assert.equal(new Set(choices).size, 4);
      assert.ok(answer >= 0 && answer < 4);
    }
  }
});

test('每站場景特寫皆可對應白話段落', async () => {
  const {landmarks,shots}=await import('../src/landmarks.js');
  assert.equal(landmarks.length,stations.length);
  assert.equal(shots.length,stations.length);
  stations.forEach((station,i)=>{
    assert.equal(shots[i].length,station.story.length);
    assert.equal(new Set(landmarks[i].map(item=>item.id)).size,landmarks[i].length);
    assert.equal(shots[i][0],null);
    for(const id of shots[i])assert.ok(id===null || landmarks[i].some(item=>item.id===id));
  });
});

test('拂亂與拂士的注音依語境區分',()=>{
  assert.match(stations.find(s=>s.id==='road').gloss['拂'],/^ㄈㄨˊ/);
  assert.match(stations.find(s=>s.id==='city').gloss['拂士'],/^ㄅㄧˋ/);
});

test('六站原文逐字符合國教院來源本文',async()=>{
  const {readFile}=await import('node:fs/promises');
  const reference=await readFile(new URL('./fixtures/mengzi-yuan.txt',import.meta.url),'utf8');
  const normalize=s=>s.replaceAll('恒','恆').replace(/[^\u4e00-\u9fff]/g,'');
  assert.equal(normalize(stations.map(s=>s.yuan).join('')),normalize(reference));
});
