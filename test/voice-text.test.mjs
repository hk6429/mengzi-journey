import test from 'node:test';
import assert from 'node:assert/strict';
import {speak} from '../tools/voice-text.mjs';
test('朗讀替換區分拂亂與拂士，並保留原文字串',()=>{
 const original='行拂亂其所為，入則無法家拂士。';
 assert.equal(speak(original),'行弗亂其所為，入則無法家弼士。');
 assert.equal(original,'行拂亂其所為，入則無法家拂士。');
 assert.equal(speak('傅說、膠鬲、曾益'),'傅悅、膠格、增益');
});
