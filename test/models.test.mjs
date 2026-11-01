import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('Dzine 孟子與書齋模型為完整 GLB，且包含網格',async()=>{
  for(const name of ['mengzi-normal','warring-hall']){
    const file=await readFile(new URL(`../public/models/${name}.glb`,import.meta.url));
    assert.equal(file.subarray(0,4).toString(),'glTF');assert.equal(file.readUInt32LE(4),2);assert.equal(file.readUInt32LE(8),file.length);
    const size=file.readUInt32LE(12),type=file.subarray(16,20).toString();assert.equal(type,'JSON');
    const document=JSON.parse(file.subarray(20,20+size).toString());assert.ok(document.meshes?.length>0);
  }
});
