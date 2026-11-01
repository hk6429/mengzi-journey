// 船底位於 y=0；船首朝向 +Z，水位由場景決定。
export function createBoat(THREE) {
  const boat = new THREE.Group();
  boat.name = 'warring-boat';
  const wood = new THREE.MeshStandardMaterial({ color: 0x795032, roughness: 0.88 });
  const trim = new THREE.MeshStandardMaterial({ color: 0x49301e, roughness: 0.9 });
  const plank = new THREE.MeshStandardMaterial({ color: 0x98704a, roughness: 0.85 });
  const hullShape = new THREE.Shape();
  hullShape.moveTo(0, 1.9);
  hullShape.lineTo(-0.8, 1.15);
  hullShape.lineTo(-0.85, -1.25);
  hullShape.lineTo(-0.55, -1.8);
  hullShape.lineTo(0.55, -1.8);
  hullShape.lineTo(0.85, -1.25);
  hullShape.lineTo(0.8, 1.15);
  hullShape.closePath();
  const hull = new THREE.Mesh(new THREE.ExtrudeGeometry(hullShape, { depth: 0.45, bevelEnabled: false }), wood);
  hull.name = 'hull';
  hull.rotation.x = Math.PI / 2;
  hull.position.y = 0.45;
  hull.castShadow = true;
  hull.receiveShadow = true;
  boat.add(hull);

  function box(name, size, position, material) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
    mesh.name = name;
    mesh.position.set(...position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    boat.add(mesh);
    return mesh;
  }
  box('seat', [1.35, 0.13, 0.55], [0, 0.65, -0.05], plank);
  for (const x of [-0.58, 0.58]) {
    box('seat-support', [0.1, 0.2, 0.45], [x, 0.53, -0.05], trim);
    box('gunwale', [0.12, 0.18, 2.45], [x < 0 ? -0.78 : 0.78, 0.53, -0.05], trim);
    const oar = box('oar', [0.08, 0.08, 2.25], [x < 0 ? -0.94 : 0.94, 0.65, -0.15], plank);
    oar.rotation.y = x < 0 ? -0.08 : 0.08;
    box('oar-blade', [0.17, 0.07, 0.55], [x < 0 ? -1.02 : 1.02, 0.65, -1.12], plank);
  }
  box('stern-rail', [1.05, 0.16, 0.1], [0, 0.55, -1.72], trim);
  box('bow-deck', [0.75, 0.08, 0.5], [0, 0.49, 1.25], plank);
  return boat;
}
