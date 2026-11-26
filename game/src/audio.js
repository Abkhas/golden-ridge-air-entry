// audio.js — engine hum, wind and ring chimes, synthesized live with WebAudio.
// One clear job: sound. No audio files, no network; silence until the pilot clicks Fly.

function createFlightAudio() {
  const api = { ctx: null, engine: null, engineGain: null, wind: null, windGain: null, started: false };
  api.start = function () {
    if (api.started) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      api.ctx = new AC();
      api.engine = api.ctx.createOscillator();
      api.engine.type = 'sawtooth';
      api.engine.frequency.value = 70;
      const filter = api.ctx.createBiquadFilter();
      filter.type = 'lowpass'; filter.frequency.value = 420;
      api.engineGain = api.ctx.createGain();
      api.engineGain.gain.value = 0.05;
      api.engine.connect(filter); filter.connect(api.engineGain); api.engineGain.connect(api.ctx.destination);
      api.engine.start();
      const buf = api.ctx.createBuffer(1, api.ctx.sampleRate * 2, api.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      api.wind = api.ctx.createBufferSource();
      api.wind.buffer = buf; api.wind.loop = true;
      const wfilter = api.ctx.createBiquadFilter();
      wfilter.type = 'bandpass'; wfilter.frequency.value = 700;
      api.windGain = api.ctx.createGain();
      api.windGain.gain.value = 0.0;
      api.wind.connect(wfilter); wfilter.connect(api.windGain); api.windGain.connect(api.ctx.destination);
      api.wind.start();
      api.started = true;
    } catch (e) { /* sound is optional; the game flies silent */ }
  };
  api.setFlight = function (throttle, speedKnots) {
    if (!api.started) return;
    api.engine.frequency.value = 55 + throttle * 75 + speedKnots * 0.25;
    api.engineGain.gain.value = 0.03 + throttle * 0.05;
    api.windGain.gain.value = Math.min(0.09, speedKnots / 185 * 0.09);
  };
  api.chime = function () {
    if (!api.started) return;
    const o = api.ctx.createOscillator(), g = api.ctx.createGain();
    o.type = 'sine'; o.frequency.value = 880;
    g.gain.setValueAtTime(0.18, api.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, api.ctx.currentTime + 0.6);
    o.connect(g); g.connect(api.ctx.destination);
    o.start(); o.stop(api.ctx.currentTime + 0.65);
  };
  api.thud = function () {
    if (!api.started) return;
    const o = api.ctx.createOscillator(), g = api.ctx.createGain();
    o.type = 'triangle'; o.frequency.value = 90;
    g.gain.setValueAtTime(0.3, api.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, api.ctx.currentTime + 0.4);
    o.connect(g); g.connect(api.ctx.destination);
    o.start(); o.stop(api.ctx.currentTime + 0.45);
  };
  return api;
}
