// camera.js — the chase camera: it never fights the pilot.
// One clear job: where the camera sits and looks, in chase, cockpit and orbit modes.

function createChaseCamera(camera) {
  return { camera, mode: 'chase', back: 40, up: 13,
    smoothPos: new THREE.Vector3(0, 300, 400), smoothLook: new THREE.Vector3() };
}

function updateChaseCamera(cam, state, dt) {
  const c = cam.camera;
  const back = cam.back, up = cam.up;
  if (cam.mode === 'cockpit') {
    // Nose view: just behind the canopy, looking down the valley.
    const fx = Math.sin(state.heading), fz = -Math.cos(state.heading);
    c.position.set(state.x + fx * 2, state.y + 2.5, state.z + fz * 2);
    c.lookAt(state.x + fx * 300, state.y + Math.sin(state.pitch) * 300 - 20, state.z + fz * 300);
    c.up.set(0, 1, 0);
    return;
  }
  if (cam.mode === 'orbit') {
    const t = performance.now() / 1000;
    const r = 160;
    c.position.set(state.x + Math.sin(t * 0.12) * r, state.y + 55, state.z + Math.cos(t * 0.12) * r);
    c.lookAt(state.x, state.y, state.z);
    return;
  }
  // Chase: behind and above the tail, eased so banks and turns feel smooth, never snappy.
  const fx = Math.sin(state.heading), fz = -Math.cos(state.heading);
  const wantX = state.x - fx * back, wantZ = state.z - fz * back;
  const wantY = state.y + up + Math.max(0, -state.pitch) * 30;
  const k = 1 - Math.exp(-dt * 4.5);
  cam.smoothPos.x += (wantX - cam.smoothPos.x) * k;
  cam.smoothPos.y += (wantY - cam.smoothPos.y) * k;
  cam.smoothPos.z += (wantZ - cam.smoothPos.z) * k;
  c.position.copy(cam.smoothPos);
  cam.smoothLook.x += (state.x + fx * 120 - cam.smoothLook.x) * (1 - Math.exp(-dt * 6));
  cam.smoothLook.y += (state.y + 8 - cam.smoothLook.y) * (1 - Math.exp(-dt * 6));
  cam.smoothLook.z += (state.z + fz * 120 - cam.smoothLook.z) * (1 - Math.exp(-dt * 6));
  c.lookAt(cam.smoothLook);
  // Roll the horizon a little with the bank so the turn reads in the frame.
  c.rotateZ(state.roll * 0.22);
}

function cycleCameraMode(cam) {
  cam.mode = cam.mode === 'chase' ? 'cockpit' : cam.mode === 'cockpit' ? 'orbit' : 'chase';
  return cam.mode;
}

function snapChaseCamera(cam, state) {
  // Put the camera exactly on its chase slot at once (no ease-in): screenshots
  // and restarts must frame the aircraft identically every time.
  const fx = Math.sin(state.heading), fz = -Math.cos(state.heading);
  cam.smoothPos.set(state.x - fx * cam.back, state.y + cam.up, state.z - fz * cam.back);
  cam.smoothLook.set(state.x + fx * 120, state.y + 8, state.z + fz * 120);
  cam.camera.position.copy(cam.smoothPos);
  cam.camera.lookAt(cam.smoothLook);
}
