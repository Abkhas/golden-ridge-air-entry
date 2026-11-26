// aircraft.js — the Kestrel: a built-looking single-engine prop plane, assembled from parts.
// One clear job: the aircraft mesh (fuselage, wings, tail, spinning prop, nav lights) and its pose.

function buildKestrelAircraft(variantKey) {
  const v = AIRCRAFT_VARIANTS[variantKey] || AIRCRAFT_VARIANTS.swift;
  const group = new THREE.Group();
  const paint = new THREE.MeshLambertMaterial({ color: v.colour });
  const cream = new THREE.MeshLambertMaterial({ color: 0xf2ead8 });
  const dark = new THREE.MeshLambertMaterial({ color: 0x2a2f38 });
  const glass = new THREE.MeshLambertMaterial({ color: 0x9fd4e8, transparent: true, opacity: 0.85 });

  // Fuselage: a tapered cylinder nose-to-tail, cream belly stripe.
  const body = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 1.1, 15, 12), paint);
  body.rotation.x = Math.PI / 2;
  group.add(body);
  const belly = new THREE.Mesh(new THREE.CylinderGeometry(2.25, 1.15, 15, 12, 1, false, 0, Math.PI), cream);
  belly.rotation.x = Math.PI / 2; belly.rotation.z = Math.PI;
  belly.position.y = -0.15;
  group.add(belly);
  // Canopy: a glass bubble the pilot sits under.
  const canopy = new THREE.Mesh(new THREE.SphereGeometry(1.7, 12, 10), glass);
  canopy.scale.set(1, 0.75, 1.9);
  canopy.position.set(0, 1.6, 1.5);
  group.add(canopy);
  // Main wing + tailplane + fin, all with real thickness.
  const wing = new THREE.Mesh(new THREE.BoxGeometry(26, 0.5, 4.6), paint);
  wing.position.set(0, -0.4, 0.5);
  group.add(wing);
  const wingTipL = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.7, 4.6), cream);
  wingTipL.position.set(-13.2, -0.4, 0.5); group.add(wingTipL);
  const wingTipR = wingTipL.clone(); wingTipR.position.x = 13.2; group.add(wingTipR);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(9, 0.4, 3), paint);
  tail.position.set(0, 0.6, -6.8);
  group.add(tail);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.4, 4.4, 3.4), paint);
  fin.position.set(0, 2.2, -6.6);
  group.add(fin);
  // Propeller: spinner cone + two blades that spin with throttle.
  const spinner = new THREE.Mesh(new THREE.ConeGeometry(1.1, 2.4, 10), dark);
  spinner.rotation.x = Math.PI / 2;
  spinner.position.set(0, 0, 8.4);
  group.add(spinner);
  const prop = new THREE.Group();
  const bladeGeo = new THREE.BoxGeometry(0.7, 6.8, 0.22);
  const blade1 = new THREE.Mesh(bladeGeo, new THREE.MeshLambertMaterial({ color: 0x4a3527 }));
  const blade2 = new THREE.Mesh(bladeGeo, new THREE.MeshLambertMaterial({ color: 0x4a3527 }));
  blade2.rotation.z = Math.PI / 2;
  prop.add(blade1); prop.add(blade2);
  prop.position.set(0, 0, 7.6);
  group.add(prop);
  // Landing gear: three legs with wheels, tucked when retracted.
  const gear = new THREE.Group();
  for (const sx of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 3, 6), dark);
    leg.position.set(sx * 2.6, -2.6, 1.5);
    gear.add(leg);
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.7, 10), dark);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(sx * 2.6, -4, 1.5);
    gear.add(wheel);
  }
  group.add(gear);
  // Nav lights: red port, green starboard, white tail — they read at dusk.
  const mkLight = (color, x, y, z) => {
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6),
      new THREE.MeshBasicMaterial({ color }));
    l.position.set(x, y, z); group.add(l); return l;
  };
  mkLight(0xff2222, -13.6, -0.4, 0.5);
  mkLight(0x22ff66, 13.6, -0.4, 0.5);
  mkLight(0xffffff, 0, 0.8, -7.6);
  group.scale.setScalar(1.35);
  return { group, prop, gear, variant: v };
}

function updateAircraftPose(aircraft, state, timeSec) {
  const g = aircraft.group;
  g.position.set(state.x, state.y, state.z);
  // Yaw from heading, pitch from climb, roll from bank — the plane leans into its turn.
  g.rotation.order = 'YXZ';
  g.rotation.y = state.heading;
  g.rotation.x = -state.pitch;
  g.rotation.z = -state.roll;
  aircraft.prop.rotation.z += (2 + state.throttle * 28) * 0.016;
  aircraft.gear.visible = state.gearDown;
  // Gentle idle bob on the ground so the parked plane feels alive.
  if (state.onGround && state.speedKnots < 5) g.position.y += Math.sin(timeSec * 1.4) * 0.15;
}
