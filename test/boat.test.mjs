import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createBoat } from '../src/boat.js';

test('戰國木船尺寸、朝向與構件', () => {
  const boat = createBoat(THREE);
  assert.ok(boat instanceof THREE.Group);
  assert.equal(boat.name, 'warring-boat');
  const hull = boat.getObjectByName('hull');
  assert.ok(hull?.isMesh);
  boat.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(hull);
  const size = bounds.getSize(new THREE.Vector3());
  assert.ok(size.x >= 1.5 && size.x <= 2);
  assert.ok(size.z >= 3.5 && size.z <= 4);
  assert.ok(Math.abs(bounds.min.y) < 1e-6);
  assert.ok(bounds.max.z > Math.abs(bounds.min.z));
  for (const name of ['seat', 'seat-support', 'gunwale', 'oar', 'oar-blade', 'stern-rail', 'bow-deck']) {
    assert.ok(boat.getObjectByName(name), `缺少 ${name}`);
  }
  assert.equal(boat.children.filter(child => child.name === 'oar').length, 2);
});
