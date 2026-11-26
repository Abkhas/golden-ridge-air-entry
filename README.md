# Golden Ridge Air — Kestrel Valley Flights

A 3D flight game for make.fun's **best-flight-game-20261126-0057** bounty.
Fly the Kestrel prop plane over Kestrel Valley: a golden-hour chase view,
recognisable terrain (ridges, lake, pine forest, four named airfields),
and a full HUD — speed, altitude, vertical speed, heading compass, throttle,
fuel and airframe.

## Missions (3, different goals)

1. **Ring Run** — thread 12 golden rings over the valley.
2. **Island Hop** — cross the lake and land on Lakeshore runway.
3. **Ridge Rescue** — tag 3 mountain beacons, then land at Ridgefield.

Fuel burns faster at full throttle; below stall speed the wing quits.
Landings read as what happened: gentle + slow = good, hard = damaged,
a hard impact = crash. Three aircraft (K-2 Swift, K-4 Hauler, K-7 Dart)
trade speed against fuel. Flaps, gear, three cameras (chase / cockpit / orbit).

## Controls

W/S throttle · Arrow keys pitch & bank · A/D rudder · F flaps · G gear ·
C camera · M pilot log · P pause · R restart · 1/2/3 pick mission · mouse drag steers.

## Play

Serve `game/` with any static server (`node serve.ts` → http://localhost:8080)
and open it in desktop Chrome. No network requests, no build step.
Three.js r160 is vendored at `game/vendor/three.min.js`.

## Structure

- `game/src/flight-model.js` — physics: throttle, pitch, bank, stall, fuel, damage
- `game/src/terrain.js` — Kestrel Valley: heightfield, lake, airfields, pines, clouds, sky
- `game/src/aircraft.js` — the Kestrel prop plane, built from parts
- `game/src/missions.js` — the three sorties, rings, beacons, landings
- `game/src/hud.js` — instruments, compass, minimap, messages
- `game/src/camera.js` — chase / cockpit / orbit camera
- `game/src/audio.js` — synthesized engine hum, wind, chimes (WebAudio, no files)
- `game/src/save.js` — pilot record and honest game totals
- `game/src/shot-presets.js` — deterministic screenshot setups (`?shot=cover|dusk|proof|title`)
- `game/src/main.js` — bootstrap, game loop, input, screens

## Hand-in

`main.ts` copies `game/` + `screenshots/` to `/output` and writes
`/output/dossier.json` (see `LICENSE`, MIT).
