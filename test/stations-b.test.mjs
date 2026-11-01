import test from 'node:test';
import assert from 'node:assert/strict';
import {buildStationsB} from '../src/stations-b.js';

test('後三站使用有效場景元件，並保留各站主要地景', () => {
  for (const station of [3, 4, 5]) {
    const calls = [];
    const P = Object.fromEntries(['box', 'person', 'tree', 'building'].map(name => [name, (...args) => calls.push([name, ...args])]));
    buildStationsB(station, P);
    assert.ok(calls.filter(call => call[0] === 'box').length >= 8);
    for (const [name, ...args] of calls) {
      const count = {box: 7, person: 3, tree: 2, building: 2}[name];
      assert.equal(args.length, count);
      const numeric = name === 'box' ? 6 : name === 'person' ? 2 : count;
      assert.ok(args.slice(0, numeric).every(Number.isFinite));
      if (name === 'box') assert.ok(args.slice(3, 6).every(n => n > 0));
    }
    if (station === 5) assert.ok(calls.some(call => call[0] === 'person'));
  }
});

test('其他站不加入地景', () => {
  const fail = () => assert.fail('不應呼叫場景元件');
  for (const station of [-1, 0, 1, 2, 6]) buildStationsB(station, {box: fail, person: fail, tree: fail, building: fail});
});
