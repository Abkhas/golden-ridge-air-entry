// save.js — the pilot's record: career totals kept on this machine, plus the game's own counts.
// One clear job: what persists between sorties, and the honest totals the log screen shows.

const SAVE_KEY = 'golden-ridge-air-pilot-v1';

function loadPilotRecord() {
  const fresh = { flights: 0, rings: 0, landings: 0, crashes: 0, distanceNm: 0, bestScore: 0, missionsDone: [] };
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return fresh;
    const parsed = JSON.parse(raw);
    return Object.assign(fresh, parsed);
  } catch (e) { return fresh; }
}

function storePilotRecord(rec) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(rec)); } catch (e) { /* private mode: fly anyway */ }
}

function recordSortie(rec, run, state) {
  rec.flights += 1;
  rec.rings += run.ringsHit;
  rec.distanceNm = Math.round((rec.distanceNm + state.distanceNm) * 10) / 10;
  rec.bestScore = Math.max(rec.bestScore, run.score);
  if (run.endReason === 'landed' || run.endReason === 'landed-hard') rec.landings += 1;
  if (run.endReason === 'crash') rec.crashes += 1;
  if (run.done && !rec.missionsDone.includes(run.def.id)) rec.missionsDone.push(run.def.id);
  storePilotRecord(rec);
  return rec;
}

function pilotLogLines(rec) {
  return 'CAREER — FLIGHTS ' + rec.flights + '  •  RINGS ' + rec.rings +
    '  •  LANDINGS ' + rec.landings + '  •  BEST SCORE ' + rec.bestScore +
    '  •  DISTANCE ' + rec.distanceNm + ' NM';
}

function gameContentTotals() {
  // Counts straight from the game's own tables — never invented.
  return {
    missions: MISSION_DEFS.length,
    rings: RING_COURSE.length + HOP_RINGS.length,
    airfields: VALLEY.airfields.length,
    aircraft: Object.keys(AIRCRAFT_VARIANTS).length,
    checkpoints: RESCUE_BEACONS.length,
    peakFt: VALLEY.peakFt,
  };
}
