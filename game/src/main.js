// main.js — Golden Ridge Air: bootstrap, game loop, input, screens and mission flow.
// One clear job: wire the systems together and run the game.

const GoldenRidgeAir = {
  scene: null, renderer: null, camera: null, cam: null,
  terrain: null, aircraft: null, state: null, run: null,
  audio: null, record: null, keys: {},
  mode: 'title', paused: false, elapsedSec: 0, skyMode: 'golden',
  variantKey: 'swift', startTime: 0,

  init: function () {
    const canvas = document.getElementById('scene');
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 1, 9000);
    this.cam = createChaseCamera(this.camera);
    this.audio = createFlightAudio();
    this.record = loadPilotRecord();
    this.terrain = buildTerrain(this.scene, 'golden');
    this.aircraft = buildKestrelAircraft(this.variantKey);
    this.scene.add(this.aircraft.group);
    this.state = createFlightState(this.variantKey, { x: 0, y: 320, z: 500 }, 0);
    this.run = createMissionRun(MISSION_DEFS[0], this.scene);
    this.bindInput();
    this.bindButtons();
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
    // Screenshot presets: ?shot=cover|dusk|proof|title — deterministic, same save state.
    const params = new URLSearchParams(window.location.search);
    const shot = params.get('shot');
    if (shot) {
      applyShotPreset(this, shot);
      this.mode = 'flying';
      this.startTime = performance.now();
    } else {
      showScreen('title-screen');
      this.mode = 'title';
    }
    this.startTime = performance.now();
    this.loop(performance.now());
    document.getElementById('status').textContent =
      'Golden Ridge Air loaded. Mission 1 of 3: Ring Run. 12 golden rings over Kestrel Valley.';
  },

  startMission: function (missionId, skyMode) {
    if (this.run) clearMissionRun(this.run, this.scene);
    if (skyMode && skyMode !== this.skyMode) {
      this.scene.remove(this.terrain.group);
      this.terrain = buildTerrain(this.scene, skyMode);
      this.skyMode = skyMode;
    }
    const def = MISSION_DEFS[missionId - 1];
    this.run = createMissionRun(def, this.scene);
    const field = VALLEY.airfields[0];
    this.state = createFlightState(this.variantKey, { x: field.x, y: 320, z: field.z + 500 }, 0);
    this.state.fuel = 100; this.state.airframe = 100;
    this.elapsedSec = 0;
    this.paused = false;
    this.mode = 'flying';
    this.startTime = performance.now();
    showScreen(null);
    showToast('MISSION ' + def.id + ' — ' + def.name + ': ' + def.objective, 4200);
    document.getElementById('status').textContent = 'Mission ' + def.id + ': ' + def.name + '. ' + def.objective;
  },

  bindInput: function () {
    const self = this;
    window.addEventListener('keydown', (e) => {
      self.keys[e.code] = true;
      if (e.code === 'Enter' && self.mode === 'title') { self.audio.start(); self.startMission(1); }
      if (e.code === 'KeyM') { fillLogScreen(self); showScreen('log-screen'); self.paused = true; }
      if (e.code === 'KeyP') { self.paused = !self.paused; showToast(self.paused ? 'PAUSED' : 'FLYING', 1200); }
      if (e.code === 'KeyR') { self.startMission(self.run.def.id); }
      if (e.code === 'KeyC') { const m = cycleCameraMode(self.cam); showToast('CAMERA: ' + m.toUpperCase(), 1400); }
      if (e.code === 'KeyF') { self.state.flaps = !self.state.flaps; showToast(self.state.flaps ? 'FLAPS DOWN — SLOWER, STEADIER' : 'FLAPS UP', 1400); }
      if (e.code === 'KeyG') { self.state.gearDown = !self.state.gearDown; showToast(self.state.gearDown ? 'GEAR DOWN' : 'GEAR UP', 1400); }
      if (e.code === 'Digit1') self.startMission(1);
      if (e.code === 'Digit2') self.startMission(2);
      if (e.code === 'Digit3') self.startMission(3);
      if (e.code === 'Escape') { showScreen('title-screen'); self.mode = 'title'; self.paused = true; }
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => { self.keys[e.code] = false; });
    // Mouse: drag to look around the aircraft without fighting the chase camera.
    let dragging = false, lastX = 0;
    const cv = document.getElementById('scene');
    cv.addEventListener('mousedown', (e) => { dragging = true; lastX = e.clientX; });
    window.addEventListener('mouseup', () => { dragging = false; });
    window.addEventListener('mousemove', (e) => {
      if (!dragging || self.mode !== 'flying') return;
      self.state.heading -= (e.clientX - lastX) * 0.002;
      lastX = e.clientX;
    });
  },

  bindButtons: function () {
    const self = this;
    document.getElementById('btn-fly').addEventListener('click', () => { self.audio.start(); self.startMission(1); });
    document.getElementById('btn-log').addEventListener('click', () => { fillLogScreen(self); showScreen('log-screen'); });
    document.getElementById('btn-log-close').addEventListener('click', () => {
      showScreen(null); self.paused = false; self.mode = 'flying';
    });
    document.getElementById('btn-craft').addEventListener('click', () => {
      const order = ['swift', 'hauler', 'dart'];
      const next = order[(order.indexOf(self.variantKey) + 1) % 3];
      self.variantKey = next;
      self.scene.remove(self.aircraft.group);
      self.aircraft = buildKestrelAircraft(next);
      self.scene.add(self.aircraft.group);
      document.getElementById('btn-craft').textContent = 'AIRCRAFT: ' + AIRCRAFT_VARIANTS[next].name;
      document.getElementById('craft-name').textContent = AIRCRAFT_VARIANTS[next].name;
    });
    document.getElementById('btn-again').addEventListener('click', () => self.startMission(self.run.def.id));
    document.getElementById('btn-next').addEventListener('click', () => {
      const next = self.run.def.id % 3 + 1;
      self.startMission(next);
    });
  },

  endSortie: function (title, text) {
    recordSortie(this.record, this.run, this.state);
    document.getElementById('end-title').textContent = title;
    document.getElementById('end-text').textContent = text;
    document.getElementById('end-counts').innerHTML =
      '<div class="c"><div class="n">' + this.run.score + '</div><div class="t">SCORE</div></div>' +
      '<div class="c"><div class="n">' + this.run.ringsHit + '</div><div class="t">RINGS</div></div>' +
      '<div class="c"><div class="n">' + formatClock(this.elapsedSec) + '</div><div class="t">TIME</div></div>' +
      '<div class="c"><div class="n">' + Math.round(this.state.distanceNm) + '</div><div class="t">NM FLOWN</div></div>';
    showScreen('end-screen');
    this.mode = 'ended';
    this.paused = true;
  },

  loop: function (now) {
    const self = GoldenRidgeAir;
    requestAnimationFrame((t) => self.loop(t));
    const dt = Math.min(0.05, (now - (self._last || now)) / 1000 || 0.016);
    self._last = now;
    if (!self.paused && self.mode === 'flying') {
      self.elapsedSec += dt;
      const input = flightInputFromKeys(self.keys);
      updateFlight(self.state, input, dt, self.terrain.heightAt);
      const events = updateMission(self.run, self.state, self.scene);
      for (const ev of events) {
        showToast(ev.text, 3000);
        if (ev.type === 'ring' || ev.type === 'beacon') self.audio.chime();
        if (ev.type === 'failed') self.audio.thud();
        if (ev.type === 'landed' || ev.type === 'complete') {
          self.endSortie('MISSION COMPLETE', ev.text + ' — ' + self.run.def.name +
            ' finished in ' + formatClock(self.elapsedSec) + '. Score ' + self.run.score + '.');
        }
        if (ev.type === 'failed') {
          const title = self.run.endReason === 'fuel' ? 'OUT OF FUEL' : 'CRASHED';
          self.endSortie(title, ev.text + ' — score ' + self.run.score +
            '. Fuel and airframe are decisions, not decoration: watch both.');
        }
      }
      self.audio.setFlight(self.state.throttle, self.state.speedKnots);
    }
    updateAircraftPose(self.aircraft, self.state, now / 1000);
    updateChaseCamera(self.cam, self.state, dt);
    // Clouds drift slowly with the wind.
    for (const c of self.terrain.clouds.children) {
      c.position.x += dt * 6;
      if (c.position.x > 2600) c.position.x = -2600;
    }
    updateHUD(self.state, self.run, self.elapsedSec);
    self.renderer.render(self.scene, self.camera);
  },
};

window.addEventListener('DOMContentLoaded', () => GoldenRidgeAir.init());
