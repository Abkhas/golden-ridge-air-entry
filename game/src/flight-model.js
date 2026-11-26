// flight-model.js — the Kestrel's arcade flight physics: throttle, pitch, bank, stall, fuel and damage.
// One clear job: turn pilot input + time into a believable flying state. No rendering here.

const FLIGHT_TUNING = {
  maxSpeedKnots: 185,      // full throttle, clean air
  stallKnots: 42,          // below this the wing stops flying and the nose drops
  accelPerSec: 26,         // knots gained per second at full throttle
  dragPerSec: 14,          // knots lost per second with throttle closed
  pitchRate: 0.55,         // radians per second of pitch authority
  rollRate: 1.9,           // radians per second of roll authority
  turnFromBank: 0.55,      // heading change per second per radian of bank
  climbFactor: 0.9,        // how much of speed becomes vertical speed
  fuelBurnBase: 0.55,      // percent of tank per minute at cruise
  fuelBurnFull: 1.15,      // percent of tank per minute at full throttle
  groundEffectFt: 60,      // cushion that softens the last feet of a landing
};

const AIRCRAFT_VARIANTS = {
  swift:  { key: 'swift',  name: 'KESTREL K-2 SWIFT',  speedMul: 1.00, fuelMul: 1.00, agilityMul: 1.00, colour: 0xd8432f },
  hauler: { key: 'hauler', name: 'KESTREL K-4 HAULER', speedMul: 0.82, fuelMul: 0.55, agilityMul: 0.85, colour: 0x2f6db8 },
  dart:   { key: 'dart',   name: 'KESTREL K-7 DART',   speedMul: 1.22, fuelMul: 1.55, agilityMul: 1.15, colour: 0xe8a13a },
};

function createFlightState(variantKey, startPos, startHeadingDeg) {
  const v = AIRCRAFT_VARIANTS[variantKey] || AIRCRAFT_VARIANTS.swift;
  return {
    variant: v,
    x: startPos.x, y: startPos.y, z: startPos.z,
    heading: startHeadingDeg * Math.PI / 180, // radians, 0 = north (-z)
    pitch: 0, roll: 0,
    speedKnots: 95, throttle: 0.6,
    fuel: 100, airframe: 100, flaps: false, gearDown: true,
    verticalSpeedFpm: 0, stalled: false, onGround: false,
    distanceNm: 0, flightTimeSec: 0,
  };
}

function flightInputFromKeys(keys) {
  return {
    throttleUp: !!keys['KeyW'], throttleDown: !!keys['KeyS'],
    pitchUp: !!keys['ArrowDown'], pitchDown: !!keys['ArrowUp'],
    bankLeft: !!keys['ArrowLeft'], bankRight: !!keys['ArrowRight'],
    rudderLeft: !!keys['KeyA'], rudderRight: !!keys['KeyD'],
  };
}

function updateFlight(state, input, dt, groundHeightAt) {
  const v = state.variant;
  const T = FLIGHT_TUNING;
  // Throttle discipline: fast at full power, thirsty; gentle at cruise, frugal.
  if (input.throttleUp) state.throttle = Math.min(1, state.throttle + dt * 0.45);
  if (input.throttleDown) state.throttle = Math.max(0, state.throttle - dt * 0.45);
  const targetSpeed = state.throttle * T.maxSpeedKnots * v.speedMul * (state.flaps ? 0.82 : 1);
  const rate = targetSpeed > state.speedKnots ? T.accelPerSec : T.dragPerSec;
  state.speedKnots += Math.max(-rate * dt, Math.min(rate * dt, targetSpeed - state.speedKnots));
  // Fuel burn grows with throttle; running dry ends the sortie.
  const burn = (T.fuelBurnBase + state.throttle * (T.fuelBurnFull - T.fuelBurnBase)) * v.fuelMul;
  state.fuel = Math.max(0, state.fuel - burn * dt / 60);
  if (state.fuel <= 0) state.throttle = Math.max(0, state.throttle - dt * 0.3);
  // Pitch and bank answer at every speed, but weakly when slow.
  const authority = Math.min(1, Math.max(0.25, state.speedKnots / 90));
  const agility = v.agilityMul * authority;
  if (input.pitchUp) state.pitch += T.pitchRate * agility * dt;
  if (input.pitchDown) state.pitch -= T.pitchRate * agility * dt;
  if (input.bankLeft) state.roll += T.rollRate * agility * dt;
  if (input.bankRight) state.roll -= T.rollRate * agility * dt;
  if (input.rudderLeft) state.heading += 0.25 * dt;
  if (input.rudderRight) state.heading -= 0.25 * dt;
  // Wings level themselves gently; a banked wing turns the nose.
  state.roll *= Math.max(0, 1 - 0.55 * dt);
  state.roll = Math.max(-1.15, Math.min(1.15, state.roll));
  state.pitch = Math.max(-0.6, Math.min(0.6, state.pitch));
  state.heading -= Math.sin(state.roll) * T.turnFromBank * dt * (state.speedKnots / 100 + 0.2);
  // Stall: below stall speed the wing quits and the nose drops.
  state.stalled = state.speedKnots < T.stallKnots && !state.onGround;
  if (state.stalled) state.pitch = Math.max(-0.5, state.pitch - 0.5 * dt);
  // Move: forward along heading, up/down with pitch.
  const speedFps = state.speedKnots * 1.68781;
  const forwardX = Math.sin(state.heading), forwardZ = -Math.cos(state.heading);
  const climb = Math.sin(state.pitch) * speedFps * T.climbFactor - (state.stalled ? 22 : 0);
  state.x += forwardX * Math.cos(state.pitch) * speedFps * dt;
  state.z += forwardZ * Math.cos(state.pitch) * speedFps * dt;
  state.y += climb * dt;
  state.verticalSpeedFpm = climb * 60;
  state.distanceNm += speedFps * dt / 6076;
  state.flightTimeSec += dt;
  // Terrain: never sink below the ground; a hard hit damages the airframe.
  const ground = groundHeightAt(state.x, state.z);
  const clearance = state.y - ground;
  if (clearance <= 0) {
    state.y = ground;
    state.onGround = true;
    const hitHard = state.verticalSpeedFpm < -420 || state.speedKnots > 130;
    if (hitHard && !state._crashReported) {
      state.airframe = Math.max(0, state.airframe - 34);
      state._crashReported = true;
    }
    if (state.speedKnots > 8) state.speedKnots = Math.max(0, state.speedKnots - 55 * dt);
    else state.speedKnots = 0;
  } else {
    state.onGround = false;
    state._crashReported = false;
  }
  // Ground effect softens the last 60 ft of a gentle descent.
  if (clearance > 0 && clearance < T.groundEffectFt && state.verticalSpeedFpm < 0) {
    state.y -= state.verticalSpeedFpm * dt * 0.4 * (1 - clearance / T.groundEffectFt);
  }
  return state;
}

function flightLandingQuality(state) {
  // A landing reads as what happened: gentle + slow + on the strip = good.
  if (!state.onGround) return 'airborne';
  if (state.airframe < 55) return 'crash';
  if (Math.abs(state.verticalSpeedFpm) < 300 && state.speedKnots < 95) return 'good';
  if (Math.abs(state.verticalSpeedFpm) < 500) return 'hard';
  return 'crash';
}

function formatClock(totalSec) {
  const m = Math.floor(totalSec / 60), s = Math.floor(totalSec % 60);
  return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}
