// hud.js — the cockpit instruments: big legible numerals, compass, bars and valley map.
// One clear job: everything the pilot reads, in DOM so it stays sharp at any size.

function hudEl(id) { return document.getElementById(id); }

function updateHUD(state, run, elapsedSec) {
  hudEl('speed').textContent = Math.round(state.speedKnots);
  hudEl('alt').textContent = Math.round(Math.max(0, state.y));
  const vs = Math.round(state.verticalSpeedFpm);
  hudEl('vspeed').textContent = (vs >= 0 ? '+' : '') + vs;
  const hdg = ((Math.round(state.heading * 180 / Math.PI) % 360) + 360) % 360;
  hudEl('heading-deg').innerHTML = String(hdg).padStart(3, '0') + '&deg;';
  hudEl('compass-strip').innerHTML = compassStrip(hdg);
  hudEl('score').textContent = run ? run.score : 0;
  hudEl('clock').textContent = formatClock(elapsedSec);
  hudEl('thr-pct').textContent = Math.round(state.throttle * 100) + '%';
  hudEl('thr-fill').style.width = (state.throttle * 100) + '%';
  hudEl('fuel-pct').textContent = Math.round(state.fuel) + '%';
  hudEl('fuel-fill').style.width = state.fuel + '%';
  hudEl('fuel-fill').style.background = state.fuel < 25 ? '#ff5d5d' : '#ffb340';
  hudEl('dmg-pct').textContent = Math.round(state.airframe) + '%';
  hudEl('dmg-fill').style.width = state.airframe + '%';
  hudEl('dmg-fill').style.background = state.airframe < 55 ? '#ff5d5d' : '#7ee787';
  hudEl('craft-name').textContent = state.variant.name;
  hudEl('hud-warn').style.display = (state.fuel < 25 && !state.onGround) ? 'block' : 'none';
  if (state.stalled) {
    hudEl('hud-warn').style.display = 'block';
    hudEl('hud-warn').textContent = 'STALL — NOSE DOWN, FULL THROTTLE';
    hudEl('hud-warn').style.borderColor = '#ff5d5d';
  } else if (state.fuel < 25) {
    hudEl('hud-warn').textContent = 'LOW FUEL — HEAD FOR AN AIRFIELD';
  }
  if (run) {
    hudEl('mission-name').textContent = run.def.name;
    hudEl('mission-obj').textContent = run.def.objective;
    const p = missionProgress(run);
    let prog = '';
    if (run.def.rings) prog += 'RINGS ' + run.ringsHit + ' / ' + run.def.rings;
    if (run.def.checkpoints) prog += (prog ? '  •  ' : '') + 'BEACONS ' + run.checkpointsHit + ' / ' + run.def.checkpoints;
    if (run.def.landAt) prog += (prog ? '  •  ' : '') + 'LANDING ' + (run.done ? 'DONE' : 'PENDING');
    hudEl('mission-prog').textContent = prog;
    hudEl('mission-next').textContent = missionNextStep(run, state);
    hudEl('stagefill').style.width = (p.total ? Math.round(100 * p.hit / p.total) : 0) + '%';
    const idx = run.def.id;
    hudEl('hud-mission').querySelector('.label').textContent = 'MISSION ' + idx + ' OF 3';
  }
  drawMinimap(state, run);
}

function compassStrip(hdg) {
  // A sliding window of cardinal points around the current heading.
  const pts = [['N', 0], ['030', 30], ['060', 60], ['E', 90], ['120', 120], ['150', 150],
    ['S', 180], ['210', 210], ['240', 240], ['W', 270], ['300', 300], ['330', 330]];
  let out = '';
  for (const [label, deg] of pts) {
    let d = ((deg - hdg + 540) % 360) - 180;
    if (Math.abs(d) > 75) continue;
    if (Math.abs(d) <= 8) out += ' <span class="tick">&#9650; ' + label + ' ' + String(deg).padStart(3, '0') + '</span> &nbsp; ';
    else out += label + ' &nbsp; ';
  }
  return out || 'N';
}

function drawMinimap(state, run) {
  const cv = hudEl('minimap');
  if (!cv) return;
  const ctx = cv.getContext('2d');
  const W = cv.width, H = cv.height;
  ctx.fillStyle = '#0d1a2c'; ctx.fillRect(0, 0, W, H);
  const toMap = (x, z) => [W / 2 + x / 5200 * W, H / 2 + z / 5200 * H];
  // Lake
  ctx.fillStyle = '#2f6db8';
  ctx.beginPath(); ctx.arc(...toMap(-1450, -900), 26, 0, Math.PI * 2); ctx.fill();
  // Airfields as named strips
  ctx.font = 'bold 9px Arial'; ctx.textAlign = 'center';
  for (const f of VALLEY.airfields) {
    const [mx, my] = toMap(f.x, f.z);
    ctx.fillStyle = '#f5d76e';
    ctx.fillRect(mx - 8, my - 2, 16, 4);
    ctx.fillStyle = '#cfe3ff';
    ctx.fillText(f.name, mx, my - 6);
  }
  // Next ring / beacon in gold
  if (run) {
    const spots = run.def.id === 1 ? RING_COURSE : run.def.id === 2 ? HOP_RINGS : [];
    if (run.ringsHit < spots.length) {
      const [mx, my] = toMap(spots[run.ringsHit].x, spots[run.ringsHit].z);
      ctx.strokeStyle = '#ffd26e'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(mx, my, 7, 0, Math.PI * 2); ctx.stroke();
    }
    if (run.def.id === 3 && run.checkpointsHit < RESCUE_BEACONS.length) {
      const s = RESCUE_BEACONS[run.checkpointsHit];
      const [mx, my] = toMap(s.x, s.z);
      ctx.fillStyle = '#ff4040';
      ctx.beginPath(); ctx.arc(mx, my, 6, 0, Math.PI * 2); ctx.fill();
    }
  }
  // The aircraft: a gold arrow that turns with the heading.
  const [px, py] = toMap(state.x, state.z);
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(Math.PI - state.heading);
  ctx.fillStyle = '#ffd26e';
  ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(5, 6); ctx.lineTo(-5, 6); ctx.closePath(); ctx.fill();
  ctx.restore();
}

let toastTimer = null;
function showToast(text, ms) {
  const t = hudEl('toast');
  t.textContent = text;
  t.style.display = 'block';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.style.display = 'none'; }, ms || 2600);
}

function showScreen(id) {
  for (const s of ['title-screen', 'log-screen', 'end-screen']) hudEl(s).style.display = 'none';
  if (id) hudEl(id).style.display = 'flex';
}
