// Swish Street - synthesized sound effects and generative music (Web Audio, no files).
(function () {
  'use strict';
  var SS = window.SS, U = SS.U;
  var A = (SS.audio = {});
  var ctx = null, master, sfxBus, musicBus, noiseBuf, comp;

  A.ready = false;
  A.unlock = function () {
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try { ctx = new AC(); } catch (e) { return; }
      comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -14; comp.ratio.value = 4;
      master = ctx.createGain(); master.gain.value = 0.9;
      sfxBus = ctx.createGain(); musicBus = ctx.createGain();
      sfxBus.connect(master); musicBus.connect(master); master.connect(comp); comp.connect(ctx.destination);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      var d = noiseBuf.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      A.ready = true;
      A.applySettings();
      startScheduler();
    }
    if (ctx.state === 'suspended') { try { ctx.resume(); } catch (e) {} }
  };
  A.applySettings = function () {
    if (!ctx) return;
    var s = SS.save.data.settings;
    sfxBus.gain.setTargetAtTime(s.sound ? 1 : 0, ctx.currentTime, 0.02);
    musicBus.gain.setTargetAtTime(s.music ? 0.32 : 0, ctx.currentTime, 0.1);
  };
  // Pause audio when app is hidden (iOS backgrounding)
  document.addEventListener('visibilitychange', function () {
    if (!ctx) return;
    if (document.hidden) { try { ctx.suspend(); } catch (e) {} }
    else { try { ctx.resume(); } catch (e) {} }
  });

  function now() { return ctx.currentTime; }
  function env(g, t, a, peak, dec) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec);
  }
  function osc(type, freq, t, dur, vol, dest, freqEnd) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (freqEnd) o.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
    env(g, t, 0.004, vol, dur);
    o.connect(g); g.connect(dest || sfxBus);
    o.start(t); o.stop(t + dur + 0.05);
    return o;
  }
  function noise(t, dur, vol, type, freq, q, dest, freqEnd) {
    var s = ctx.createBufferSource(); s.buffer = noiseBuf;
    var f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q || 1;
    if (freqEnd) f.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
    var g = ctx.createGain(); env(g, t, 0.005, vol, dur);
    s.connect(f); f.connect(g); g.connect(dest || sfxBus);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
  }
  function ok() { return ctx && A.ready && SS.save.data.settings.sound; }
  var lastPlay = {};
  function throttle(name, ms) {
    var tt = performance.now();
    if (lastPlay[name] && tt - lastPlay[name] < ms) return false;
    lastPlay[name] = tt; return true;
  }

  // ---------- Sound effects ----------
  A.bounce = function (v) {
    if (!ok() || !throttle('bounce', 40)) return;
    v = U.clamp(v, 0.1, 1); var t = now();
    osc('sine', 150 + v * 40, t, 0.18, 0.7 * v, null, 55);
    noise(t, 0.06, 0.25 * v, 'lowpass', 900, 1);
  };
  A.rim = function (v) {
    if (!ok() || !throttle('rim', 50)) return;
    v = U.clamp(v, 0.15, 1); var t = now();
    var base = 520 + Math.random() * 60;
    [1, 2.76, 5.4, 8.9].forEach(function (m, i) {
      osc(i % 2 ? 'triangle' : 'square', base * m, t, 0.25 + v * 0.35 - i * 0.04, (0.16 / (i + 1)) * v);
    });
    noise(t, 0.04, 0.3 * v, 'highpass', 3000, 1);
  };
  A.board = function (v) {
    if (!ok() || !throttle('board', 60)) return;
    v = U.clamp(v, 0.15, 1); var t = now();
    osc('triangle', 210, t, 0.12, 0.5 * v, null, 120);
    noise(t, 0.09, 0.35 * v, 'bandpass', 1200, 2);
  };
  A.swish = function () {
    if (!ok()) return; var t = now();
    noise(t, 0.32, 0.55, 'bandpass', 5200, 0.8, null, 2400);
    noise(t + 0.03, 0.22, 0.25, 'highpass', 7000, 0.7);
  };
  A.net = function () {
    if (!ok() || !throttle('net', 120)) return; var t = now();
    noise(t, 0.2, 0.25, 'bandpass', 3500, 1.2, null, 1800);
  };
  A.whoosh = function (p) {
    if (!ok()) return; var t = now();
    noise(t, 0.3, 0.18 + 0.15 * p, 'bandpass', 600, 1.5, null, 2200);
  };
  A.cheer = function (amt) {
    if (!ok()) return; var t = now();
    amt = U.clamp(amt, 0.2, 1);
    for (var i = 0; i < 3; i++) {
      var s = ctx.createBufferSource(); s.buffer = noiseBuf;
      var f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900 + i * 500; f.Q.value = 0.9;
      var g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.18 * amt, t + 0.25);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9 + amt * 1.2);
      // gentle "wobble" so it sounds like voices
      var lfo = ctx.createOscillator(), lg = ctx.createGain();
      lfo.frequency.value = 5 + i * 2.3; lg.gain.value = 300;
      lfo.connect(lg); lg.connect(f.frequency); lfo.start(t); lfo.stop(t + 2.4);
      s.connect(f); f.connect(g); g.connect(sfxBus);
      s.start(t, Math.random() * 0.4); s.stop(t + 2.4);
    }
  };
  A.aww = function () {
    if (!ok()) return; var t = now();
    var s = ctx.createBufferSource(); s.buffer = noiseBuf;
    var f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 3;
    f.frequency.setValueAtTime(900, t); f.frequency.exponentialRampToValueAtTime(450, t + 0.8);
    var g = ctx.createGain(); env(g, t, 0.15, 0.2, 0.8);
    s.connect(f); f.connect(g); g.connect(sfxBus); s.start(t); s.stop(t + 1.1);
  };
  A.click = function () {
    if (!ok()) return; var t = now();
    osc('sine', 880, t, 0.06, 0.25, null, 660);
  };
  A.tick = function (p) {
    if (!ok() || !throttle('tick', 45)) return; var t = now();
    osc('sine', 600 + p * 900, t, 0.03, 0.08);
  };
  A.perfect = function () {
    if (!ok()) return; var t = now();
    osc('triangle', 1318, t, 0.15, 0.22); osc('triangle', 1760, t + 0.05, 0.2, 0.18);
  };
  A.coin = function () {
    if (!ok() || !throttle('coin', 60)) return; var t = now();
    osc('square', 988, t, 0.06, 0.08); osc('square', 1319, t + 0.06, 0.16, 0.08);
  };
  A.jingle = function (kind) {
    if (!ok()) return; var t = now();
    var notes = kind === 'win' ? [523, 659, 784, 1047, 784, 1047]
      : kind === 'star' ? [784, 988, 1175, 1568]
      : kind === 'letter' ? [392, 330]
      : kind === 'fire' ? [523, 784, 1047, 1319]
      : [659, 784, 988];
    var step = kind === 'letter' ? 0.16 : 0.09;
    notes.forEach(function (f, i) {
      osc('triangle', f, t + i * step, 0.22, 0.2);
      osc('square', f / 2, t + i * step, 0.12, 0.04);
    });
  };
  A.buzzer = function () {
    if (!ok()) return; var t = now();
    osc('sawtooth', 220, t, 0.7, 0.12); osc('square', 223, t, 0.7, 0.08);
  };
  A.countdown = function (go) {
    if (!ok()) return; var t = now();
    osc('sine', go ? 1046 : 523, t, go ? 0.35 : 0.15, 0.3);
  };
  // MC Mic "talking": cute pitched blips instead of a recorded voice.
  A.blabber = function (n) {
    if (!ok() || !throttle('blab', 300)) return; var t = now();
    n = Math.round(U.clamp(n || 5, 2, 10));
    for (var i = 0; i < n; i++) {
      var f = 260 + Math.random() * 160 + (i === n - 1 ? 60 : 0);
      osc('square', f, t + i * 0.065, 0.05, 0.035);
      osc('triangle', f * 2, t + i * 0.065, 0.04, 0.03);
    }
  };
  A.boing = function () {
    if (!ok()) return; var t = now();
    osc('sine', 180, t, 0.35, 0.4, null, 520);
    osc('triangle', 90, t, 0.25, 0.2, null, 260);
  };
  A.squawk = function () {
    if (!ok()) return; var t = now();
    for (var i = 0; i < 2; i++) {
      osc('sawtooth', 1300 - i * 200, t + i * 0.16, 0.12, 0.08, null, 700);
      noise(t + i * 0.16, 0.1, 0.12, 'bandpass', 2200, 3);
    }
  };
  A.train = function () {
    if (!ok()) return; var t = now();
    noise(t, 4.2, 0.22, 'lowpass', 180, 1, null, 120);
    for (var i = 0; i < 8; i++) noise(t + 0.4 + i * 0.42, 0.08, 0.18, 'bandpass', 600, 2); // clackety-clack
    osc('square', 330, t + 0.1, 0.4, 0.05); osc('square', 415, t + 0.1, 0.4, 0.05); // friendly horn
  };
  A.slam = function () {
    if (!ok()) return; var t = now();
    osc('sine', 90, t, 0.4, 0.9, null, 40);
    noise(t, 0.25, 0.5, 'lowpass', 1200, 1);
    A.rim(1);
  };
  A.roar = function () {
    if (!ok()) return; A.cheer(1);
    var t = now();
    noise(t, 2.2, 0.16, 'bandpass', 700, 0.6, null, 1100);
  };
  A.whistle = function () {
    if (!ok()) return; var t = now();
    var o = ctx.createOscillator(), g = ctx.createGain(), l = ctx.createOscillator(), lg = ctx.createGain();
    o.type = 'sine'; o.frequency.value = 2400; l.frequency.value = 28; lg.gain.value = 120;
    l.connect(lg); lg.connect(o.frequency); env(g, t, 0.01, 0.12, 0.5);
    o.connect(g); g.connect(sfxBus); o.start(t); l.start(t); o.stop(t + 0.6); l.stop(t + 0.6);
  };

  // v0.5: birds flapping away (a few soft feather flutters), throttled so a flock is one sound
  A.flap = function () {
    if (!ok() || !throttle('flap', 600)) return; var t = now();
    for (var i = 0; i < 5; i++) noise(t + i * 0.055, 0.045, 0.07, 'bandpass', 1400 + i * 120, 1.5);
  };
  // v0.5: a trophy unlocked
  A.trophy = function () {
    if (!ok()) return; var t = now();
    [523, 659, 784, 1047].forEach(function (f, i) { osc('triangle', f, t + i * 0.09, 0.35, 0.14); });
    osc('sine', 2093, t + 0.36, 0.5, 0.05);
  };
  A.shutter = function () {
    if (!ok()) return; var t = now();
    noise(t, 0.05, 0.35, 'highpass', 3000, 1); noise(t + 0.07, 0.04, 0.25, 'highpass', 4000, 1);
    osc('sine', 1800, t + 0.12, 0.1, 0.06);
  };
  // A sparkly fanfare for a new trick shot.
  A.trick = function () {
    if (!ok()) return; var t = now();
    [784, 988, 1175, 1568, 1976].forEach(function (f, i) { osc('triangle', f, t + i * 0.06, 0.3, 0.16); osc('sine', f * 2, t + i * 0.06 + 0.03, 0.2, 0.05); });
  };
  // Comic page turn.
  A.page = function () {
    if (!ok()) return; var t = now();
    noise(t, 0.12, 0.2, 'bandpass', 2500, 0.7, null, 900);
  };

  // ---------- Generative music ----------
  // 92 BPM street groove: chords vi-IV-I-V, kick/snare/hats, walking bass,
  // and a pentatonic hook that is re-generated every 8 bars so it never gets stale.
  // Each court has its own flavour of the groove (tempo, chords, drums, lead sound).
  var PENTA = [0, 2, 4, 7, 9], MINP = [0, 3, 5, 7, 10];
  var STYLES = {
    park:   { bpm: 92, swing: 0.12, chords: [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]], root: 72, scale: PENTA, lead: 'triangle', kick: [0, 7, 10], snare: [4, 12], hat: 2 },
    gym:    { bpm: 100, swing: 0.08, chords: [[48, 52, 55], [55, 59, 62], [57, 60, 64], [53, 57, 60]], root: 72, scale: PENTA, lead: 'square', kick: [0, 6, 10], snare: [4, 12], hat: 2, clap: [12] },
    roof:   { bpm: 84, swing: 0.18, chords: [[50, 53, 57, 60], [55, 59, 62, 65], [48, 52, 55, 59], [57, 60, 64, 67]], root: 65, scale: PENTA, lead: 'sine', kick: [0, 10], snare: [4, 12], hat: 2, soft: true },
    night:  { bpm: 104, swing: 0.06, chords: [[52, 55, 59], [48, 52, 55], [55, 59, 62], [50, 54, 57]], root: 67, scale: PENTA, lead: 'sawtooth', kick: [0, 4, 8, 12], snare: [4, 12], hat: 1 },
    beach:  { bpm: 96, swing: 0.1, chords: [[48, 52, 55], [53, 57, 60], [55, 59, 62], [48, 52, 55]], root: 72, scale: PENTA, lead: 'steel', kick: [0, 3, 8, 11], snare: [], click: [4, 12], hat: 1, shaker: true },
    subway: { bpm: 88, swing: 0.2, chords: [[48, 51, 55], [44, 48, 51], [51, 55, 58], [46, 50, 53]], root: 72, scale: MINP, lead: 'square', kick: [0, 7, 10], snare: [4, 12], hat: 2, crackle: true },
    snow:   { bpm: 80, swing: 0.1, chords: [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [48, 52, 55, 59]], root: 72, scale: PENTA, lead: 'bell', kick: [0, 8], snare: [], hat: 1, sleigh: true, soft: true },
    arena:  { bpm: 112, swing: 0.0, chords: [[50, 53, 57], [46, 50, 53], [53, 57, 60], [48, 52, 55]], root: 65, scale: PENTA, lead: 'sawtooth', kick: [0, 2, 8, 10], snare: [], clap: [4, 12], hat: 0, power: true }
  };
  var ST = STYLES.park, BPM = ST.bpm, STEP = 60 / BPM / 4;
  var music = { on: false, mode: 'menu', step: 0, nextTime: 0, hook: [], bar: 0, seed: 1, style: 'park' };
  function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function newHook() {
    var r = U.rng(music.seed++ * 7919);
    var hook = [], sc = ST.scale;
    for (var i = 0; i < 32; i++) {
      var play = (i % 4 === 0) ? r() < 0.75 : (i % 2 === 0 ? r() < 0.45 : r() < 0.18);
      hook.push(play ? ST.root + sc[(r() * 5) | 0] + (r() < 0.2 ? 12 : 0) - 12 : 0);
    }
    music.hook = hook;
  }
  // mode: 'menu' (lighter) or 'play' (full); style: a court/env id.
  A.setMusic = function (mode, style) {
    music.mode = mode;
    var s = STYLES[style] ? style : (mode === 'menu' ? 'park' : music.style);
    if (s !== music.style) {
      music.style = s; ST = STYLES[s]; BPM = ST.bpm; STEP = 60 / BPM / 4;
      if (ctx) newHook();
    }
  };
  A.style = function () { return music.style; };
  function startScheduler() {
    newHook();
    music.nextTime = ctx.currentTime + 0.1;
    setInterval(function () {
      if (!ctx || ctx.state !== 'running') return;
      if (!SS.save.data.settings.music) { music.nextTime = ctx.currentTime + 0.05; return; }
      while (music.nextTime < ctx.currentTime + 0.25) {
        scheduleStep(music.step, music.nextTime);
        music.step++;
        music.nextTime += STEP * ((music.step % 2) ? 1 + ST.swing : 1 - ST.swing); // swing
      }
    }, 60);
  }
  function lead(type, f, t, dur) {
    if (type === 'steel') { // steel-drum-ish: bright partials, quick decay
      osc('sine', f, t, 0.32, 0.17, musicBus); osc('sine', f * 2, t, 0.18, 0.06, musicBus); osc('triangle', f * 3.01, t, 0.08, 0.03, musicBus);
    } else if (type === 'bell') {
      osc('triangle', f * 2, t, 0.9, 0.09, musicBus); osc('sine', f * 4.02, t, 0.5, 0.03, musicBus);
    } else {
      osc(type, f, t, dur, type === 'sawtooth' || type === 'square' ? 0.07 : 0.16, musicBus);
    }
  }
  function clap(t) { for (var i = 0; i < 3; i++) noise(t + i * 0.012, 0.09, 0.3, 'bandpass', 1500, 1.2, musicBus); }
  function kick(t) { var o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.14); env(g, t, 0.003, 0.9, 0.22); o.connect(g); g.connect(musicBus); o.start(t); o.stop(t + 0.3); }
  function snare(t) { noise(t, 0.16, 0.45, 'bandpass', 1800, 0.8, musicBus); osc('triangle', 190, t, 0.08, 0.25, musicBus); }
  function hat(t, open) { noise(t, open ? 0.12 : 0.035, open ? 0.12 : 0.09, 'highpass', 8000, 1, musicBus); }
  function scheduleStep(step, t) {
    var s16 = step % 16, bar = Math.floor(step / 16), chord = ST.chords[bar % 4];
    if (s16 === 0 && bar % 8 === 0 && bar > 0) newHook();
    var full = music.mode === 'play';
    // drums
    if (ST.kick.indexOf(s16) >= 0 && (full || s16 === 0 || s16 === 8 || ST.kick.length < 3)) kick(t);
    if (full || bar % 2 === 1) { if (ST.snare.indexOf(s16) >= 0) snare(t); }
    if (ST.clap && ST.clap.indexOf(s16) >= 0 && (full || bar % 2)) clap(t);
    if (ST.click && ST.click.indexOf(s16) >= 0) noise(t, 0.03, 0.2, 'bandpass', 3200, 4, musicBus);
    if (ST.hat) {
      if (full && s16 % ST.hat === 0) hat(t, s16 === 14 && ST.hat === 2);
      else if (!full && s16 % 4 === 2) hat(t, false);
    }
    if (ST.shaker && full) noise(t, 0.05, s16 % 2 ? 0.05 : 0.09, 'highpass', 6000, 1, musicBus);
    if (ST.sleigh && (full || s16 % 2 === 0)) noise(t, 0.06, 0.06, 'bandpass', 9000, 3, musicBus);
    if (ST.crackle && Math.random() < 0.25) noise(t + Math.random() * STEP, 0.01, 0.05, 'highpass', 5000, 1, musicBus);
    // bass
    if (s16 === 0 || s16 === 3 || s16 === 8 || s16 === 11 || (full && s16 === 14)) {
      var root = chord[0] - 24 + (s16 === 11 ? 7 : 0);
      osc('triangle', mtof(root), t, STEP * 1.6, ST.soft ? 0.34 : 0.42, musicBus);
      osc('sine', mtof(root - 12), t, STEP * 1.6, 0.3, musicBus);
    }
    // chord stabs on the off-beat (power chords on the downbeat for the Arena)
    if (s16 === 2 || s16 === 10 || (ST.power && full && s16 === 0)) {
      chord.forEach(function (n) {
        var o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
        o.type = ST.lead === 'steel' || ST.lead === 'bell' ? 'triangle' : 'sawtooth'; o.frequency.value = mtof(n);
        f.type = 'lowpass'; f.frequency.value = ST.soft ? 900 : 1400;
        env(g, t, 0.01, ST.power && s16 === 0 ? 0.07 : 0.05, ST.power && s16 === 0 ? 0.5 : 0.22); o.connect(f); f.connect(g); g.connect(musicBus); o.start(t); o.stop(t + 0.6);
      });
    }
    // hook
    var h = music.hook[(bar % 2) * 16 + s16];
    if (h && (full || bar % 4 >= 2)) {
      lead(ST.lead, mtof(h), t, STEP * 1.5);
      osc('sine', mtof(h + 12), t + STEP * 0.75, STEP, 0.04, musicBus); // echo
    }
  }
})();
