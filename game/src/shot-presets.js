// shot-presets.js — deterministic setups for the game's four screenshots.
// One clear job: put the same save state in front of the camera for every shot.
// These are real game states (same mission, same aircraft, same fuel) — only the
// time of day and the camera angle change between shots.

function applyShotPreset(game, name) {
  const g = game;
  if (name === 'cover') {
    // Golden-hour Ring Run, mid-course: rings ahead, runway behind, full HUD.
    g.startMission(1, 'golden');
    g.state.x = -120; g.state.z = -260; g.state.y = 620;
    g.state.heading = 0; g.state.pitch = 0.03; g.state.roll = 0;
    g.state.speedKnots = 132; g.state.throttle = 0.72; g.state.fuel = 78;
    g.run.ringsHit = 2; g.run.score = 500;
    g.run.ringMeshes[0].material.color.set(0x7ee787);
    g.run.ringMeshes[1].material.color.set(0x7ee787);
    g.run.ringMeshes[2].material.color.set(0xffd26e);
    g.cam.back = 62; g.cam.up = 18; g.paused = true; // frozen: ring 3 stays in frame
    snapChaseCamera(g.cam, g.state);
    showScreen(null);
    return 'cover';
  }
  if (name === 'dusk') {
    // Dusk Island Hop: low over the lake on final to Lakeshore, gear down, flaps on.
    g.startMission(2, 'dusk');
    g.state.x = -1450; g.state.z = -500; g.state.y = 550;
    g.state.heading = 0; g.state.pitch = 0.02; g.state.roll = -0.03;
    g.state.speedKnots = 88; g.state.throttle = 0.38; g.state.fuel = 61;
    g.state.flaps = true; g.state.gearDown = true;
    g.paused = true; // frozen mid-approach: the shot is the approach, not the landing
    g.run.ringsHit = 2; g.run.score = 500;
    g.run.ringMeshes[0].material.color.set(0x7ee787);
    g.run.ringMeshes[1].material.color.set(0x7ee787);
    g.run.ringMeshes[2].material.color.set(0xffd26e);
    g.cam.back = 85; g.cam.up = 26; // pulled back: valley + runway read around the plane
    snapChaseCamera(g.cam, g.state);
    showScreen(null);
    showToast('FINAL APPROACH — LAKESHORE RUNWAY AHEAD', 60000);
    return 'dusk';
  }
  if (name === 'proof') {
    // Pilot log + hangar: the honest totals screen, same mission state behind it.
    g.startMission(1, 'golden');
    g.state.x = 0; g.state.z = 500; g.state.y = 300;
    g.state.heading = 0; g.state.speedKnots = 95; g.state.fuel = 78;
    g.run.ringsHit = 2; g.run.score = 500;
    g.paused = true;
    fillLogScreen(g);
    showScreen('log-screen');
    return 'proof';
  }
  // title (default): the title screen over a slow orbit of the valley.
  g.startMission(1, 'golden');
  g.state.x = 0; g.state.z = 600; g.state.y = 420;
  g.state.heading = 0; g.state.speedKnots = 60; g.state.throttle = 0.4;
  g.cam.mode = 'orbit';
  g.paused = true;
  showScreen('title-screen');
  return 'title';
}

function fillLogScreen(g) {
  const rows = MISSION_DEFS.map((d) => {
    const done = g.record.missionsDone.includes(d.id);
    const cur = g.run && g.run.def.id === d.id;
    const cls = done ? 'done' : cur ? 'cur' : 'lock';
    const mark = done ? '&#10003; DONE' : cur ? '&#9656; FLYING NOW' : 'LOCKED — FLY IT TO UNLOCK';
    return '<div><span class="' + cls + '">' + d.id + ' &mdash; ' + d.name + '</span> &mdash; ' + d.detail + ' <b>' + mark + '</b></div>';
  }).join('');
  document.getElementById('log-missions').innerHTML = rows;
  document.getElementById('log-sortie').textContent =
    'THIS SORTIE — ' + g.run.def.name + ', SCORE ' + g.run.score + ', RINGS ' + g.run.ringsHit +
    '  •  ' + pilotLogLines(g.record);
}
