// terrain.js — Kestrel Valley: one coherent golden-hour landscape.
// Builds the heightfield, the lake, four named airfields, pine forests, clouds and sky.
// One clear job: the world the plane flies over, plus groundHeightAt() for physics.

const VALLEY = {
  size: 5200,            // world is size x size feet
  peakFt: 5200,          // highest ridge
  waterLevel: 0,
  airfields: [
    { key: 'ridgefield', name: 'RIDGEFIELD', x: 0,    z: 0,    heading: 90,  runway: true  },
    { key: 'lakeshore',  name: 'LAKESHORE',  x: -1450, z: -900, heading: 20,  runway: true  },
    { key: 'northpine',  name: 'NORTHPINE',  x: 1300, z: -1500, heading: 160, runway: true  },
    { key: 'summit',     name: 'SUMMIT PASS', x: 900,  z: 1400, heading: 45,  runway: false },
  ],
};

function ridgeHeight(x, z) {
  // Layered sine ridges + a valley bowl, flattened near every airfield.
  const nx = x / 900, nz = z / 900;
  let h = 420 * Math.sin(nx * 1.7 + 1.3) * Math.cos(nz * 1.3 - 0.6)
        + 260 * Math.sin(nx * 3.1 - nz * 2.2) * Math.cos(nz * 2.7 + 0.9)
        + 120 * Math.sin(nx * 6.3 + nz * 5.1);
  const dist = Math.sqrt(x * x + z * z);
  h += Math.max(0, (dist - 900) / 2600) * 2600;              // rim mountains rise outward
  h += Math.max(0, 1 - dist / 2400) * -160;                   // central valley floor
  for (const f of VALLEY.airfields) {
    const d = Math.hypot(x - f.x, z - f.z);
    const flat = Math.max(0, 1 - d / 420);
    h = h * (1 - flat) + 26 * flat;                           // flat pad at 26 ft
  }
  return Math.max(-40, h);
}

function buildTerrain(scene, skyMode) {
  const group = new THREE.Group();
  const size = VALLEY.size, seg = 150;
  const geo = new THREE.PlaneGeometry(size, size, seg, seg);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colours = new Float32Array(pos.count * 3);
  const cGrass = new THREE.Color(0x5d8a3c), cMeadow = new THREE.Color(0x8aa84f);
  const cRock = new THREE.Color(0x8a7a68), cSnow = new THREE.Color(0xf2f0e8);
  const cSand = new THREE.Color(0xc9b078), cForest = new THREE.Color(0x2f5d2a);
  const tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const h = ridgeHeight(x, z);
    pos.setY(i, h);
    const slope = Math.abs(ridgeHeight(x + 30, z) - h) + Math.abs(ridgeHeight(x, z + 30) - h);
    if (h > 1500) tmp.copy(cSnow).lerp(cRock, Math.min(1, (2600 - h) / 1100));
    else if (slope > 55) tmp.copy(cRock);
    else if (h < 60) tmp.copy(cSand);
    else tmp.copy(cGrass).lerp(cMeadow, 0.5 + 0.5 * Math.sin(x * 0.01 + z * 0.013));
    if (Math.sin(x * 0.05) * Math.cos(z * 0.045) > 0.55 && h > 60 && h < 1100) tmp.lerp(cForest, 0.55);
    colours[i * 3] = tmp.r; colours[i * 3 + 1] = tmp.g; colours[i * 3 + 2] = tmp.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colours, 3));
  geo.computeVertexNormals();
  const ground = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true }));
  group.add(ground);

  // Lake: a still blue disc in the west valley.
  const lake = new THREE.Mesh(
    new THREE.CircleGeometry(620, 40),
    new THREE.MeshLambertMaterial({ color: 0x3f7fb8, transparent: true, opacity: 0.92 }));
  lake.rotation.x = -Math.PI / 2;
  lake.position.set(-1450, 4, -900);
  group.add(lake);

  // River ribbon from the north ridge to the lake.
  const river = new THREE.Mesh(
    new THREE.PlaneGeometry(90, 2400),
    new THREE.MeshLambertMaterial({ color: 0x4a8fc0 }));
  river.rotation.x = -Math.PI / 2; river.rotation.z = 0.5;
  river.position.set(-700, 30, -1600);
  group.add(river);

  // Runways + windsocks at the three paved fields; a dirt strip at Summit Pass.
  for (const f of VALLEY.airfields) {
    const strip = new THREE.Mesh(
      new THREE.PlaneGeometry(f.runway ? 70 : 46, 620),
      new THREE.MeshLambertMaterial({ color: f.runway ? 0x3a3f46 : 0x9a7d54 }));
    strip.rotation.x = -Math.PI / 2;
    strip.rotation.z = -f.heading * Math.PI / 180;
    strip.position.set(f.x, 28.5, f.z);
    group.add(strip);
    const line = new THREE.Mesh(
      new THREE.PlaneGeometry(6, 560),
      new THREE.MeshBasicMaterial({ color: 0xf5d76e }));
    line.rotation.x = -Math.PI / 2; line.rotation.z = -f.heading * Math.PI / 180;
    line.position.set(f.x, 29.5, f.z);
    group.add(line);
    const sock = new THREE.Mesh(
      new THREE.ConeGeometry(7, 26, 8),
      new THREE.MeshLambertMaterial({ color: 0xff7a3c }));
    sock.rotation.z = Math.PI / 2.4;
    sock.position.set(f.x + 60, 48, f.z + 40);
    group.add(sock);
  }

  // Pine forest: instanced cones, scattered where the valley is green.
  const pineGeo = new THREE.ConeGeometry(16, 55, 6);
  const pineMat = new THREE.MeshLambertMaterial({ color: 0x2c5a26 });
  const pines = new THREE.InstancedMesh(pineGeo, pineMat, 900);
  const m = new THREE.Matrix4();
  let placed = 0, guard = 0;
  while (placed < 900 && guard++ < 8000) {
    const x = (Math.random() - 0.5) * 4600, z = (Math.random() - 0.5) * 4600;
    const h = ridgeHeight(x, z);
    if (h < 70 || h > 1150) continue;
    if (Math.hypot(x + 1450, z + 900) < 700) continue; // keep the lake clear
    m.makeTranslation(x, h + 22, z);
    pines.setMatrixAt(placed++, m);
  }
  pines.count = placed;
  group.add(pines);

  // Clouds: soft white billboard clusters drifting over the valley.
  const clouds = new THREE.Group();
  const cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.88 });
  for (let i = 0; i < 26; i++) {
    const puff = new THREE.Group();
    const n = 3 + Math.floor(Math.random() * 3);
    for (let j = 0; j < n; j++) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(60 + Math.random() * 70, 10, 8), cloudMat);
      s.position.set(j * 90 - n * 40, Math.random() * 24, Math.random() * 60 - 30);
      s.scale.y = 0.45;
      puff.add(s);
    }
    puff.position.set((Math.random() - 0.5) * 4600, 1500 + Math.random() * 500, (Math.random() - 0.5) * 4600);
    clouds.add(puff);
  }
  group.add(clouds);

  // Golden-hour sun + warm haze; dusk mode swaps to violet.
  const sun = new THREE.DirectionalLight(0xffd9a0, 2.1);
  sun.position.set(-1800, 1400, -1200);
  group.add(sun);
  group.add(new THREE.AmbientLight(0x8fa8c8, 0.9));
  group.add(new THREE.HemisphereLight(0xffe0b0, 0x5a6a4a, 0.85));
  scene.fog = new THREE.Fog(0xe8c890, 1200, 5200);
  scene.background = new THREE.Color(skyMode === 'dusk' ? 0x5a4480 : 0xf0c078);
  if (skyMode === 'dusk') {
    sun.color.set(0xd8a0ff); sun.intensity = 1.6;
    scene.fog.color.set(0x8a6aa8);
  }
  if (skyMode === 'dusk') group.add(new THREE.HemisphereLight(0xc9a0e8, 0x4a3a5a, 0.6));
  if (skyMode === 'night') {
    sun.intensity = 0.25; sun.color.set(0x8fb0ff);
    scene.fog.color.set(0x1a2436);
    scene.background = new THREE.Color(0x141c2e);
  }
  scene.add(group);
  return { group, clouds, sun, heightAt: ridgeHeight };
}
