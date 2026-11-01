import test from 'node:test';
import assert from 'node:assert/strict';
import {stations} from '../src/data.js';

test('六站古文、白話與測驗資料完整', () => {
  assert.equal(stations.length, 6);
  assert.equal(new Set(stations.map(s => s.id)).size, 6);
  for (const s of stations) {
    assert.ok(s.yuan && s.think && Object.keys(s.gloss).length);
    assert.equal(s.story.length, 5);
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
