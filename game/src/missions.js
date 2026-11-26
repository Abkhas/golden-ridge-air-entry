// missions.js — three sorties with different goals, rings, beacons and landings.
// One clear job: what the pilot is asked to do, and whether they did it.

const MISSION_DEFS = [
  {
    id: 1, name: 'RING RUN', short: 'RING RUN',
    objective: 'Fly through all 12 golden rings',
    detail: 'Thread 12 golden rings over the valley. Full throttle is fast; gentle banks keep you lined up.',
    rings: 12, checkpoints: 0, landAt: null,
  },
  {
    id: 2, name: 'ISLAND HOP', short: 'ISLAND HOP',
    objective: 'Land on Lakeshore runway — slow, flaps down, on the strip',
    detail: 'Cross the lake, drop to 500 ft, and put the Kestrel down on Lakeshore runway. Gear down, flaps on.',
    rings: 6, checkpoints: 0, landAt: 'lakeshore',
  },
  {
    id: 3, name: 'RIDGE RESCUE', short: 'RIDGE RESCUE',
    objective: 'Reach 3 mountain beacons, then land at Ridgefield',
    detail: 'Climb to the beacons above the north ridge, tag all three, then bring her home to Ridgefield.',
    rings: 0, checkpoints: 3, landAt: 'ridgefield',
  },
];

const RING_COURSE = [
  { x: 120, z: -420, y: 420 }, { x: 480, z: -760, y: 520 }, { x: 300, z: -1150, y: 640 },
  { x: -320, z: -1300, y: 560 }, { x: -900, z: -1050, y: 480 }, { x: -1250, z: -650, y: 420 },
  { x: -900, z: -200, y: 380 }, { x: -350, z: 260, y: 340 },
  { x: -100, z: 620, y: 360 }, { x: 350, z: 820, y: 420 }, { x: 680, z: 420, y: 480 },
  { x: 520, z: -80, y: 520 },
];
const HOP_RINGS = [
  { x: -500, z: -500, y: 420 }, { x: -950, z: -750, y: 380 }, { x: -1300, z: -880, y: 320 },
  { x: -1550, z: -950, y: 300 }, { x: -1650, z: -750, y: 280 }, { x: -1500, z: -550, y: 300 },
];
const RESCUE_BEACONS = [
  { x: 700, z: -1900, y: 1750 }, { x: 1300, z: -1500, y: 1650 }, { x: 300, z: -2100, y: 1900 },
];

function createMissionRun(def, scene) {
  const run = {
    def, startedAt: performance.now(), score: 0,
    ringsHit: 0, checkpointsHit: 0, done: false, failed: false, endReason: '',
    ringMeshes: [], beaconMeshes: [], nextIndex: 0,
  };
  const spots = def.id === 1 ? RING_COURSE : def.id === 2 ? HOP_RINGS : [];
  spots.forEach((s, i) => {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(46, 5, 10, 28),
      new THREE.MeshBasicMaterial({ color: i === 0 ? 0xffd26e : 0xff9a3c }));
    ring.position.set(s.x, s.y, s.z);
    ring.rotation.y = Math.atan2(s.x - 0, s.z - 0);
    scene.add(ring);
    run.ringMeshes.push(ring);
  });
  if (def.id === 3) {
    RESCUE_BEACONS.forEach((s) => {
      const beacon = new THREE.Group();
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 90, 8),
        new THREE.MeshLambertMaterial({ color: 0xd8432f }));
      pole.position.y = 45;
      const light = new THREE.Mesh(new THREE.SphereGeometry(10, 10, 8),
        new THREE.MeshBasicMaterial({ color: 0xff4040 }));
      light.position.y = 95;
      beacon.add(pole); beacon.add(light);
      beacon.position.set(s.x, ridgeHeight(s.x, s.z), s.z);
      scene.add(beacon);
      run.beaconMeshes.push(beacon);
    });
  }
  return run;
}

function clearMissionRun(run, scene) {
  for (const m of run.ringMeshes) scene.remove(m);
  for (const m of run.beaconMeshes) scene.remove(m);
  run.ringMeshes = []; run.beaconMeshes = [];
}

function missionProgress(run) {
  const total = run.def.rings + run.def.checkpoints;
  const hit = run.ringsHit + run.checkpointsHit;
  if (run.def.landAt) return { hit, total: total + 1, label: hit + ' / ' + (total + 1) };
  return { hit, total, label: hit + ' / ' + total };
}

function missionNextStep(run, state) {
  if (run.done) return 'Mission complete — nice flying.';
  if (run.ringsHit < run.def.rings) {
    const spots = run.def.id === 1 ? RING_COURSE : HOP_RINGS;
    const s = spots[run.ringsHit];
    const dist = state ? Math.round(Math.hypot(s.x - state.x, s.z - state.z)) : Math.round(Math.hypot(s.x, s.z));
    return 'NEXT: Ring ' + (run.ringsHit + 1) + ' — ' + dist + ' ft ahead';
  }
  if (run.checkpointsHit < run.def.checkpoints) {
    return 'NEXT: Beacon ' + (run.checkpointsHit + 1) + ' of ' + run.def.checkpoints + ' — climb north';
  }
  if (run.def.landAt) {
    const f = VALLEY.airfields.find(a => a.key === run.def.landAt);
    return 'NEXT: Land at ' + f.name + ' — gear down, under 95 kt';
  }
  return 'All targets done.';
}

function updateMission(run, state, scene) {
  const events = [];
  if (run.done || run.failed) return events;
  // Rings: passing within the torus plane and radius counts.
  const spots = run.def.id === 1 ? RING_COURSE : run.def.id === 2 ? HOP_RINGS : [];
  if (run.ringsHit < spots.length) {
    const s = spots[run.ringsHit];
    const d = Math.hypot(state.x - s.x, state.y - s.y, state.z - s.z);
    if (d < 52) {
      run.ringsHit++;
      run.score += 250;
      const mesh = run.ringMeshes[run.ringsHit - 1];
      mesh.material.color.set(0x7ee787);
      if (run.ringMeshes[run.ringsHit]) run.ringMeshes[run.ringsHit].material.color.set(0xffd26e);
      events.push({ type: 'ring', text: 'RING ' + run.ringsHit + ' / ' + spots.length + ' — +250' });
    }
  }
  // Beacons: fly within 120 ft of the light.
  if (run.checkpointsHit < RESCUE_BEACONS.length && run.def.id === 3) {
    const s = RESCUE_BEACONS[run.checkpointsHit];
    const by = ridgeHeight(s.x, s.z) + 95;
    if (Math.hypot(state.x - s.x, state.y - by, state.z - s.z) < 130) {
      run.checkpointsHit++;
      run.score += 400;
      events.push({ type: 'beacon', text: 'BEACON ' + run.checkpointsHit + ' / 3 TAGGED — +400' });
    }
  }
  // Landing: on the ground, slow, near the target strip, and actually low —
  // a ridge slope beside the field is not a runway.
  if (run.def.landAt && state.onGround && state.speedKnots < 95 && state.y < 160) {
    const f = VALLEY.airfields.find(a => a.key === run.def.landAt);
    if (Math.hypot(state.x - f.x, state.z - f.z) < 420) {
      const q = flightLandingQuality(state);
      if (q === 'good') {
        run.score += 500;
        run.done = true; run.endReason = 'landed';
        events.push({ type: 'landed', text: 'TOUCHDOWN AT ' + f.name + ' — +500' });
      } else if (q === 'hard') {
        run.score += 200;
        run.done = true; run.endReason = 'landed-hard';
        events.push({ type: 'landed', text: 'HARD LANDING AT ' + f.name + ' — +200, airframe hurt' });
      }
    }
  }
  // Ring Run ends when the last ring is threaded.
  if (run.def.id === 1 && run.ringsHit >= run.def.rings) {
    run.done = true; run.endReason = 'rings';
    events.push({ type: 'complete', text: 'ALL ' + run.def.rings + ' RINGS — COURSE COMPLETE' });
  }
  // Fuel and airframe end a sortie: out of fuel, or the plane breaks.
  if (state.fuel <= 0 && !state.onGround) {
    run.failed = true; run.endReason = 'fuel';
    events.push({ type: 'failed', text: 'OUT OF FUEL — dead-stick landing' });
  }
  if (state.airframe <= 0) {
    run.failed = true; run.endReason = 'crash';
    events.push({ type: 'failed', text: 'AIRFRAME LOST — CRASH' });
  }
  if (state.onGround && state.airframe < 55 && run.def.id !== 2 && run.def.id !== 3) {
    // A hard ground strike outside a landing mission still ends the run.
    if (state._crashReported) {
      run.failed = true; run.endReason = 'crash';
      events.push({ type: 'failed', text: 'HARD IMPACT — AIRFRAME DAMAGED' });
    }
  }
  return events;
}
