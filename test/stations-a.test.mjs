import test from 'node:test';
import assert from 'node:assert/strict';
import {buildStationsA} from '../src/stations-a.js';

test('前三站建立地景，其他站不呼叫 helper', () => {
  for (let station = 0; station < 4; station++) {
    const calls = [];
    const box = (...args) => {
      assert.equal(args.length, 7);
      assert.ok(args.slice(0, 6).every(Number.isFinite));
      assert.ok(args.slice(3, 6).every(n => n > 0));
      assert.match(args[6], /^#[\da-f]{6}$/i);
      calls.push('box');
    };
    const tree = (...args) => {
      assert.equal(args.length, 2);
      assert.ok(args.every(Number.isFinite));
      calls.push('tree');
    };
    buildStationsA(station, {box, tree});
    if (station < 3) assert.ok(calls.includes('box'));
    else assert.equal(calls.length, 0);
  }
});
