// Swish Street - arcade specials: Buzzer Beater (half-court heaves against the clock)
// and Dunk Fest (a timing-based dunk contest with judges and slow-motion replays).
(function () {
  'use strict';
  var SS = window.SS, U = SS.U, D = SS.D, UI = SS.ui, A = SS.audio, AV = SS.avatar, R = SS.render, P = SS.Phys, t = SS.t;
  var M = SS.modes;
  function save() { return SS.save.data; }
  var pt = { x: 0, y: 0, s: 0, z: 0 };

  // ======================= BUZZER BEATER =======================
  // Five heaves from half court. A 3-second shot clock runs while you aim and keeps
  // running while the ball flies: make it before... or AT the buzzer!
  M.buzzer = function () {
    var SPOTS = ['half', 'lhalf', 'half', 'rhalf', 'half'];
    var m = {
      id: 'buzzer', env: 'night', window: 0.024, zoom: 1.25, music: 'arena',
      init: function (S) {
        m.i = 0; m.makes = 0; m.ended = false; m.clock = 3; m.running = false; m.intro = 2.2; m.log = [];
        S.clutch = true;
        S.setSpot(SPOTS[0], true); S.ready();
      },
      canShoot: function () { return !m.ended && m.intro <= 0 && m.clock > 0; },
      update: function (S, dt) {
        if (m.intro > 0) { m.intro -= dt; if (m.intro <= 0) startClock(); return; }
        if (m.running) {
          var before = Math.ceil(m.clock);
          m.clock -= dt * (S.timeScale || 1);
          if (Math.ceil(m.clock) < before && m.clock > 0) A.countdown(false);
          if (m.clock <= 0) {
            m.clock = 0; m.running = false; A.buzzer();
            if (S.state === 'ready') { // never let go
              S.pop(t('Too late! Let go sooner.'), '#ffffff', 0.42, 0.9);
              m.log.push(0);
              S.after(1.2, next);
            } else m.buzzed = true;
          }
        }
      },
      onLaunch: function (S) { m.releasedAt = m.clock; save().stats.heaves++; },
      onResult: function (S, res) {
        m.log.push(res.made ? 1 : 0);
        if (res.made) {
          m.makes++;
          S.pop(m.buzzed || m.clock <= 0.01 ? t('AT THE BUZZER!') : t('HALF-COURT BUCKET!'), '#ffd23f', 0.32, 1.3);
          S.mcPick('buzzer'); A.roar(); S.celebrate(true);
          S.after(1.0, function () { S.startReplay({ label: t('BUZZER BEATER'), speed: 0.5, onDone: function () { S.after(0.3, next); } }); });
        } else S.after(1.1, next);
      },
      hud: function (ctx, S, W, H) {
        var y = UI.safe.t + 12;
        M.chip(ctx, W - 12 - UI.safe.r, y, t('MADE'), m.makes + '/5', '#ffd23f', 'right');
        M.chip(ctx, W / 2, y, t('HEAVE'), Math.min(m.i + 1, 5) + '/5', '#fff', 'center');
        // big shot clock
        var c = Math.max(0, m.clock), red = c < 1.05;
        var cx = W / 2, cy = y + 104;
        ctx.fillStyle = 'rgba(15,23,42,0.85)'; UI.rr(ctx, cx - 54, cy - 30, 108, 60, 14); ctx.fill();
        ctx.strokeStyle = red ? '#ef4444' : '#facc15'; ctx.lineWidth = 3; UI.rr(ctx, cx - 54, cy - 30, 108, 60, 14); ctx.stroke();
        UI.text(ctx, c.toFixed(1), cx, cy + 2, 40, red ? '#ff6b6b' : '#fde047', 'center');
        if (m.intro > 0) {
          var w = Math.min(W - 40, 420), a = Math.min(1, m.intro * 2);
          ctx.globalAlpha = a;
          ctx.fillStyle = 'rgba(15,23,42,0.88)'; UI.rr(ctx, (W - w) / 2, H * 0.32, w, 100, 20); ctx.fill();
          UI.text(ctx, t('Buzzer Beater'), W / 2, H * 0.32 + 30, 26, '#ffd23f', 'center', { maxW: w - 30 });
          UI.wrap(ctx, t('Shoot from half court before the clock hits zero!'), W / 2, H * 0.32 + 66, w - 30, 16, '#fff');
          ctx.globalAlpha = 1;
        }
      },
      restart: function () { SS.go('play', M.buzzer()); },
      quit: function () { SS.go('title'); }
    };
    function startClock() { m.clock = 3.0; m.running = true; m.buzzed = false; A.countdown(false); }
    function next() {
      var S = SS.play;
      m.i++;
      if (m.i >= SPOTS.length) return end(S);
      S.setSpot(SPOTS[m.i]); S.ready(); startClock();
    }
    function end(S) {
      if (m.ended) return; m.ended = true;
      var best = save().buzzerBest, isBest = m.makes > best;
      if (isBest) save().buzzerBest = m.makes;
      var coins = 5 + m.makes * 15;
      SS.save.addCoins(coins);
      S.finish({
        title: m.makes >= 3 ? t('LEGENDARY!') : m.makes > 0 ? t('Buzzer beater!') : t('Good tries!'), jingle: m.makes ? 'win' : 'star',
        sub: t('Half-court shots are the hardest in basketball. Every make is huge!'),
        lines: [t('Made {a} of 5', { a: m.makes }), t('Best: {n}', { n: save().buzzerBest })],
        coins: coins,
        buttons: [
          { label: t('Play Again'), color: '#22c55e', icon: 'retry', action: function () { SS.go('play', M.buzzer()); } },
          { label: t('Home'), color: '#64748b', icon: 'back', action: function () { SS.go('title'); } }
        ]
      });
    }
    return m;
  };

  // ======================= DUNK FEST =======================
  var DUNKS = [
    { id: 'tomahawk', name: 'Tomahawk', diff: 1, taps: [0.6], pose: 'tomahawk', desc: 'One big arm swing.' },
    { id: 'windmill', name: 'Windmill', diff: 2, taps: [0.4, 0.8], pose: 'windmill', desc: 'Swing the ball all the way around.' },
    { id: 'spin360', name: '360 Spin', diff: 2, taps: [0.35, 0.75], pose: 'spin360', desc: 'Spin a full circle in the air!' },
    { id: 'between', name: 'Between the Legs', diff: 3, taps: [0.3, 0.55, 0.82], pose: 'between', desc: 'Pass it under your legs. Tricky!' }
  ];
  var JUDGES = ['leo', 'priya', 'kofi'];
  var ZT = -2.9, ZAPEX = -0.42, START_Z = -9.5, RUN_V = 6.2, G = 9.3;

  M.dunk = function () {
    var m = {
      id: 'dunk', env: 'gym', window: 0.04, noCamLift: true, music: 'arena',
      init: function (S) {
        m.round = 0; m.total = 0; m.scores = []; m.ended = false;
        S.hideBall = true; S.state = 'idle';
        S.setSpot('top', true);
        newRound(S);
      },
      canShoot: function () { return false; },
      onTap: function (S, p) { tap(S); return true; },
      update: function (S, dt) { step(S, dt); },
      scoreCall: function (S) { S.say(t('SLAM DUNK!'), '#ff7a1a'); },
      onResult: function (S, res) { landed(S, res); },
      drawFloor: function (ctx, S) { drawTrampoline(ctx, S.cam); },
      drawActor: function (ctx, S, cam, skin) { drawActor(ctx, S, cam); },
      hud: function (ctx, S, W, H) { hud(ctx, S, W, H); },
      overlay: function (ctx, S, W, H) { if (m.phase === 'pick') picker(ctx, S, W, H); if (m.phase === 'judges') judges(ctx, S, W, H); },
      restart: function () { SS.go('play', M.dunk()); },
      quit: function () { SS.go('title'); }
    };
    var a = { x: 0, y: 0, z: START_Z, vy: 0, vz: 0, pose: 'idle', t: 0 };
    m.actor = a; m.ZT = ZT; // exposed for automated tests

    function newRound(S) {
      m.phase = 'pick'; m.dunk = null; m.q = 0; m.taps = []; m.slow = 1; m.rec = []; m.msg = null;
      a.x = 0; a.y = 0; a.z = START_Z; a.vy = 0; a.vz = 0; a.pose = 'idle'; a.t = 0;
      S.hideBall = true; S.state = 'idle'; S.timeScale = 1;
      setCam(S, true);
    }
    function setCam(S, snap) {
      var zz = Math.min(a.z, ZAPEX);
      var g = { x: 1.5, y: 2.2 + a.y * 0.45, z: zz - 5.0, tx: 0, ty: 2.4 + a.y * 0.3, tz: Math.min(0, zz + 4) };
      S.camGoal = g;
      if (snap) { var c = S.cam; c.x = g.x; c.y = g.y; c.z = g.z; c.tx = g.tx; c.ty = g.ty; c.tz = g.tz; c.update(); }
    }
    function choose(S, d) {
      m.dunk = d; m.phase = 'ready'; m.readyT = 1.1;
      m.msg = { text: t('Tap when you land on the trampoline!'), t: 0 };
    }
    function tap(S) {
      if (m.phase === 'run') {
        var dz = Math.abs(a.z - ZT);
        m.q = dz <= 0.22 ? 1 : dz <= 0.55 ? 0.72 : 0.38;
        jump(S, m.q === 1 ? t('PERFECT JUMP!') : m.q > 0.5 ? t('Good jump!') : t('Weak jump...'));
      } else if (m.phase === 'air') {
        // grade against the next trick moment
        var d = m.dunk, i = m.taps.length;
        if (i >= d.taps.length) return;
        var target = d.taps[i] * m.ta, err = Math.abs(m.airT - target);
        if (m.airT < target - 0.22 * m.ta) return; // way early: ignore, no penalty
        grade(S, err);
      }
    }
    function grade(S, err) {
      var g = err <= 0.07 ? 'perfect' : err <= 0.15 ? 'good' : 'miss';
      m.taps.push(g);
      var col = g === 'perfect' ? '#5ef2ff' : g === 'good' ? '#7cff6b' : '#ff6b6b';
      S.pop(g === 'perfect' ? t('PERFECT!') : g === 'good' ? t('Nice!') : t('Missed it!'), col, 0.4, 0.8);
      if (g !== 'miss') { A.perfect(); a.pose = m.dunk.pose; a.trickT = 0; }
      else A.tick(0.2);
    }
    function jump(S, label) {
      m.phase = 'air'; m.airT = 0;
      var hA = 1.0 + 0.85 * m.q;
      m.ta = Math.sqrt(2 * hA / G);
      a.vy = G * m.ta; a.vz = (ZAPEX - a.z) / m.ta; a.y = 0;
      a.pose = 'jump'; a.t = 0; a.trickT = 0;
      A.boing(); S.kick(3);
      S.pop(label, m.q === 1 ? '#5ef2ff' : '#ffffff', 0.5, 1);
      m.slow = SS.save.data.settings.reduced ? 0.6 : 0.42;
    }
    function step(S, dt) {
      if (m.msg) m.msg.t += dt;
      if (m.phase === 'ready') {
        m.readyT -= dt; a.pose = 'idle';
        if (m.readyT <= 0) { m.phase = 'run'; a.pose = 'dribbleRun'; A.whistle(); }
      } else if (m.phase === 'run') {
        a.z += RUN_V * dt; a.t += dt;
        if (Math.floor(a.t * 6.5 * 2 / Math.PI) !== Math.floor((a.t - dt) * 6.5 * 2 / Math.PI) && Math.floor(a.t * 4.14) % 2 === 0) A.bounce(0.4);
        if (a.z > ZT + 0.75) { m.q = 0.3; jump(S, t('Too late!')); }
      } else if (m.phase === 'air') {
        var sdt = dt * m.slow;
        m.airT += sdt; a.t += sdt; a.trickT = (a.trickT || 0) + sdt;
        a.y = Math.max(0, a.vy * m.airT - 0.5 * G * m.airT * m.airT);
        a.z = Math.min(ZAPEX, a.z + a.vz * sdt);
        S.timeScale = m.slow;
        // auto-miss trick moments that went by
        var d = m.dunk, i = m.taps.length;
        if (i < d.taps.length && m.airT > d.taps[i] * m.ta + 0.16) grade(S, 1);
        if (m.airT >= m.ta) apex(S);
      } else if (m.phase === 'slam') {
        m.slamT += dt;
        a.t += dt;
        if (m.slamT > 0.22) a.pose = 'hang';
        if (m.rimBend > 0) { m.rimBend = Math.max(0, m.rimBend - dt * 0.6); S.world.hy = P.RIM_Y - m.rimBend; }
        if (m.slamT > 0.9) { a.vy -= G * dt * 1.2; a.y = Math.max(0, a.y + a.vy * dt); a.pose = a.y > 0.05 ? 'jump' : 'idle'; a.z = Math.max(-1.2, a.z - dt * 0.6); }
      } else if (m.phase === 'fall') {
        a.vy -= G * dt; a.y = Math.max(0, a.y + a.vy * dt); a.z = Math.max(-2, a.z - dt * 1.2);
        a.pose = a.y > 0.05 ? 'jump' : 'idle';
      }
      if (m.phase !== 'pick' && m.phase !== 'judges') setCam(S, false);
      // record for the replay
      if (m.phase === 'run' || m.phase === 'air' || m.phase === 'slam') {
        var bp = ballWorld(S);
        m.rec.push({ x: bp.x, y: bp.y, z: bp.z, r: S.ballRot, hx: 0, dt: m.phase === 'air' ? dt * m.slow : dt,
          a: { x: a.x, y: a.y, z: a.z, pose: a.pose, t: a.pose === m.dunk.pose ? a.trickT : a.t } });
      }
    }
    // the ball's world position while in the hands (approximate, for replays)
    function ballWorld(S) {
      if (!S.hideBall) return { x: S.ball.px, y: S.ball.py, z: S.ball.pz };
      if (m.phase === 'run') return { x: a.x + 0.25, y: 0.5 + Math.abs(Math.sin(a.t * 6.5)) * 0.6, z: a.z + 0.1 };
      return { x: a.x, y: a.y + 1.72, z: a.z + 0.12 };
    }
    function apex(S) {
      var misses = m.taps.filter(function (g) { return g === 'miss'; }).length + (m.dunk.taps.length - m.taps.length);
      var good = m.q >= 0.6 && misses < 2;
      S.timeScale = 1;
      S.hideBall = false;
      var b = S.ball;
      b.wx = b.wy = b.wz = 0;
      S.lastShot = { p: 1, perfect: true, who: 'player', twist: 'normal', spot: 'close', dp: 0 };
      S.tr = P.makeTracker();
      S.rec = null;
      S.state = 'flight';
      if (good) {
        m.phase = 'slam'; m.slamT = 0; a.pose = 'slam'; a.vy = 0;
        a.y = Math.max(a.y, 1.5); a.z = ZAPEX;
        b.px = 0; b.py = P.RIM_Y + 0.2; b.pz = -0.02; b.vx = 0; b.vy = -6.5; b.vz = 0.1;
        m.rimBend = 0.07; A.slam(); A.roar(); S.kick(12); SS.native.haptic('heavy');
        S.burst(S.screenOf(0, P.RIM_Y, 0), 40, ['#ffd23f', '#ff5a1f', '#5ef2ff', '#ff4d6d', '#ffffff'], 'confetti');
        save().stats.dunks++;
      } else {
        // rim says no: the ball clanks off the front of the rim
        m.phase = 'fall'; a.vy = 0;
        b.px = U.rand(-0.05, 0.05); b.py = P.RIM_Y + 0.12; b.pz = -0.36; b.vx = U.rand(-0.5, 0.5); b.vy = -1.2; b.vz = 1.8;
        S.say(m.q < 0.6 ? t('Need more bounce!') : t('Fumbled it!'), '#ffffff');
      }
      m.good = good; m.misses = misses;
    }
    function landed(S, res) {
      var d = m.dunk, perfectTaps = m.taps.filter(function (g) { return g === 'perfect'; }).length;
      var made = res.made && m.good;
      var base = made ? 5 + d.diff + m.q * 2 + perfectTaps * 0.5 - m.misses * 1.5 : 0;
      m.cards = JUDGES.map(function (id) {
        var v = made ? U.clamp(Math.round(base + U.rand(-0.6, 0.6)), 4, 10) : 3;
        return { id: id, v: v };
      });
      var sum = m.cards.reduce(function (s, c) { return s + c.v; }, 0);
      m.scores.push(sum); m.total += sum;
      if (made) S.mcPick('dunk');
      else S.mcPick('miss');
      S.after(made ? 1.0 : 0.8, function () {
        if (made) {
          var frames = m.rec.slice();
          S.startReplay({ frames: frames, label: t('SLAM REPLAY'), speed: 0.55, look: save().avatar, spin: 0.3,
            onDone: function () { showJudges(S); } });
        } else showJudges(S);
      });
    }
    function showJudges(S) {
      m.phase = 'judges'; m.judgeT = 0;
      S.hideBall = true; S.state = 'idle'; S.world.hy = P.RIM_Y;
      a.y = 0; a.z = -1.6; a.pose = 'idle';
      A.jingle('star');
    }
    function nextRound(S) {
      m.round++;
      if (m.round >= 3) return end(S);
      newRound(S);
    }
    function end(S) {
      if (m.ended) return; m.ended = true;
      var best = save().dunkBest, isBest = m.total > best;
      if (isBest) save().dunkBest = m.total;
      var coins = 10 + Math.floor(m.total / 3);
      SS.save.addCoins(coins);
      S.celebrate(true);
      S.finish({
        title: isBest && m.total > 0 ? t('NEW BEST!') : t('Dunk Fest done!'), jingle: 'win',
        lines: [t('Total: {n} / 90', { n: m.total }), t('Dunks: {a}', { a: m.scores.join(' + ') }), t('Best: {n}', { n: save().dunkBest })],
        coins: coins,
        avatar: { look: save().avatar, pose: SS.celebCombo.myPose() },
        buttons: [
          { label: t('Play Again'), color: '#22c55e', icon: 'retry', action: function () { SS.go('play', M.dunk()); } },
          { label: t('Home'), color: '#64748b', icon: 'back', action: function () { SS.go('title'); } }
        ]
      });
    }

    // ---------- drawing ----------
    function drawTrampoline(ctx, cam) {
      var pts = [], i;
      for (i = 0; i < 18; i++) { var an = i / 18 * Math.PI * 2; pts.push([Math.cos(an) * 0.6, 0.28, ZT + Math.sin(an) * 0.6]); }
      ctx.strokeStyle = '#1f2937'; ctx.lineWidth = Math.max(2, cam.F * 0.005); ctx.beginPath();
      [0, 4.5, 9, 13.5].forEach(function (k) { var p = pts[Math.round(k)]; cam.line(ctx, p[0], 0, p[2], p[0], 0.28, p[2]); });
      ctx.stroke();
      if (cam.polyPath(ctx, pts)) {
        ctx.fillStyle = '#111827'; ctx.fill();
        ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = Math.max(3, cam.F * 0.01); ctx.stroke();
      }
      // landing glow while running
      if (m.phase === 'run' || m.phase === 'ready') {
        var inner = [];
        for (i = 0; i < 18; i++) { var a2 = i / 18 * Math.PI * 2; inner.push([Math.cos(a2) * 0.3, 0.29, ZT + Math.sin(a2) * 0.3]); }
        if (cam.polyPath(ctx, inner)) { ctx.fillStyle = 'rgba(94,242,255,' + (0.35 + 0.25 * Math.sin(SS.play.time * 10)) + ')'; ctx.fill(); }
      }
    }
    function drawActor(ctx, S, cam) {
      if (!cam.project(a.x, a.y, a.z, pt)) return;
      var pose = a.pose, pt2 = { x: pt.x, y: pt.y, s: pt.s };
      var pT = pose === (m.dunk && m.dunk.pose) ? a.trickT : a.t;
      var res = AV.draw(ctx, save().avatar, pt2.x, pt2.y, pt2.s * AV.HEIGHT_M, { view: 'back', pose: pose, t: pT, shadow: a.y < 0.05 });
      if (a.y > 0.05) { // shadow on the floor
        var fl = {}; if (cam.project(a.x, 0.01, a.z, fl)) { ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.ellipse(fl.x, fl.y, fl.s * 0.35, fl.s * 0.1, 0, 0, 7); ctx.fill(); }
      }
      if (!S.hideBall || m.phase === 'pick' || m.phase === 'judges') return;
      var h = res.hands, r = pt2.s * P.R_BALL, bx, by;
      if (pose === 'dribbleRun' || pose === 'idle') {
        var fy = pt2.y - r, hy = h[1].y + r * 0.6;
        bx = h[1].x + r * 0.4; by = pose === 'idle' ? h[1].y + r : U.lerp(hy, fy, Math.abs(Math.sin(a.t * 6.5)));
      } else if (pose === 'tomahawk' || pose === 'windmill') { bx = h[1].x; by = h[1].y - r * 0.6; }
      else if (pose === 'between') { bx = (h[0].x + h[1].x) / 2; by = (h[0].y + h[1].y) / 2 + r * 0.3; }
      else { bx = (h[0].x + h[1].x) / 2; by = Math.min(h[0].y, h[1].y) - r * 0.7; }
      AV.drawBall(ctx, bx, by, r, save().avatar.ball, a.t * 4);
      m.ballScr = { x: bx, y: by };
    }
    function hud(ctx, S, W, H) {
      var y = UI.safe.t + 12;
      M.chip(ctx, W - 12 - UI.safe.r, y, t('SCORE'), String(m.total), '#ffd23f', 'right');
      M.chip(ctx, W / 2, y, t('DUNK'), Math.min(m.round + 1, 3) + '/3', '#fff', 'center');
      if (m.msg && m.msg.t < 3 && (m.phase === 'ready' || m.phase === 'run')) {
        UI.text(ctx, m.msg.text, W / 2, H * 0.78, 20, '#fff', 'center', { stroke: '#111827', strokeW: 6, maxW: W - 30 });
      }
      if (m.phase === 'run') {
        // approach meter: the marker must be in the glow when you tap
        var w = Math.min(W - 60, 320), x0 = (W - w) / 2, yy = H * 0.86 - UI.safe.b;
        var f = U.clamp((a.z - START_Z) / (ZT + 0.75 - START_Z), 0, 1), fz = (ZT - START_Z) / (ZT + 0.75 - START_Z);
        ctx.fillStyle = 'rgba(15,23,42,0.75)'; UI.rr(ctx, x0 - 6, yy - 16, w + 12, 32, 16); ctx.fill();
        ctx.fillStyle = 'rgba(94,242,255,0.5)'; ctx.fillRect(x0 + w * (fz - 0.022), yy - 12, w * 0.044, 24);
        ctx.fillStyle = 'rgba(124,255,107,0.3)'; ctx.fillRect(x0 + w * (fz - 0.055), yy - 12, w * 0.11, 24);
        ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(x0 + w * f, yy, 11, 0, 7); ctx.fill();
        ctx.strokeStyle = '#111827'; ctx.lineWidth = 3; ctx.stroke();
        UI.text(ctx, t('TAP!'), x0 + w * fz, yy - 30, 16, '#5ef2ff', 'center', { stroke: '#0f172a', strokeW: 4 });
      }
      if (m.phase === 'air' && m.dunk) {
        // trick rings: a ring shrinks onto the ball; tap when it touches
        var d = m.dunk, i = m.taps.length;
        var bpos = m.ballScr || S.screenOf(a.x, a.y + 1.72, a.z), kk = UI.k || 1, bx = bpos.x / kk, by = bpos.y / kk;
        var R0 = 26;
        if (i < d.taps.length) {
          var target = d.taps[i] * m.ta, lead = 0.5 * m.ta, k = U.clamp((target - m.airT) / lead, -0.3, 1);
          ctx.strokeStyle = 'rgba(94,242,255,0.9)'; ctx.lineWidth = 4;
          ctx.beginPath(); ctx.arc(bx, by, R0, 0, 7); ctx.stroke();
          if (k > -0.3) {
            ctx.strokeStyle = k < 0.15 ? '#7cff6b' : '#ffffff'; ctx.lineWidth = 5;
            ctx.beginPath(); ctx.arc(bx, by, R0 + Math.max(0, k) * 90, 0, 7); ctx.stroke();
          }
          UI.text(ctx, t('TAP when the rings meet!'), W / 2, H * 0.8, 18, '#fff', 'center', { stroke: '#111827', strokeW: 6, maxW: W - 30 });
        }
        for (var j = 0; j < d.taps.length; j++) {
          var g = m.taps[j], cx = W / 2 + (j - (d.taps.length - 1) / 2) * 34, cy = UI.safe.t + 84;
          ctx.fillStyle = !g ? 'rgba(255,255,255,0.25)' : g === 'perfect' ? '#5ef2ff' : g === 'good' ? '#7cff6b' : '#ef4444';
          ctx.beginPath(); ctx.arc(cx, cy, 11, 0, 7); ctx.fill();
          ctx.strokeStyle = '#111827'; ctx.lineWidth = 2; ctx.stroke();
          // colour-blind safe: a symbol as well as a colour
          if (g) UI.text(ctx, g === 'perfect' ? '★' : g === 'good' ? '✓' : '✗', cx, cy + 1, 13, '#111827');
        }
      }
    }
    function picker(ctx, S, W, H) {
      var w = Math.min(420, W - 20), h = 392, x = (W - w) / 2, y = H - h - 12 - UI.safe.b;
      UI.panel(ctx, x, y, w, h, { color: 'rgba(255,248,236,0.97)' });
      UI.text(ctx, t('Dunk {n} of 3: pick your dunk!', { n: m.round + 1 }), W / 2, y + 28, 19, '#111827', 'center', { maxW: w - 30 });
      DUNKS.forEach(function (d, i) {
        var bx = x + 14, by = y + 52 + i * 72, bw = w - 28;
        if (UI.button(ctx, 'dk_' + d.id, bx, by, bw, 60, t(d.name), { color: ['#22c55e', '#3b82f6', '#a855f7', '#ef4444'][i], size: 20, sub: t(d.desc) })) choose(S, d);
        for (var s = 0; s < 3; s++) UI.star(ctx, bx + bw - 58 + s * 18, by + 14, 7, s < d.diff);
      });
      UI.wrap(ctx, t('Harder dunks score more with the judges!'), W / 2, y + h - 30, w - 30, 13, '#4b5563');
    }
    function judges(ctx, S, W, H) {
      m.judgeT += 1 / 60;
      UI.blocker(ctx, Math.min(0.55, m.judgeT * 2), 'judgeBlock');
      var w = Math.min(380, W - 24), h = 330, x = (W - w) / 2, y = (H - h) / 2;
      UI.panel(ctx, x, y, w, h);
      UI.text(ctx, m.good ? t('The judges say...') : t('Nice try!'), W / 2, y + 34, 24, '#111827');
      var cw = (w - 40) / 3;
      m.cards.forEach(function (c, i) {
        var k = U.easeOutBack(U.clamp((m.judgeT - 0.3 - i * 0.35) * 3, 0, 1));
        var cx = x + 20 + i * cw + cw / 2;
        ctx.save(); ctx.beginPath(); ctx.arc(cx, y + 92, 30, 0, 7); ctx.fillStyle = '#fde68a'; ctx.fill(); ctx.clip();
        AV.draw(ctx, D.RIVALS[c.id].look, cx, y + 92 + 92, 100, { pose: c.v >= 8 ? 'clap' : 'idle', t: m.judgeT + i, shadow: false });
        ctx.restore();
        if (k > 0) {
          ctx.save(); ctx.translate(cx, y + 170); ctx.scale(k, k);
          ctx.fillStyle = '#fff'; UI.rr(ctx, -cw * 0.4, -34, cw * 0.8, 68, 10); ctx.fill();
          ctx.strokeStyle = '#111827'; ctx.lineWidth = 3; UI.rr(ctx, -cw * 0.4, -34, cw * 0.8, 68, 10); ctx.stroke();
          UI.text(ctx, String(c.v), 0, 2, 38, c.v >= 9 ? '#16a34a' : c.v >= 7 ? '#2563eb' : '#b45309');
          ctx.restore();
        }
        UI.text(ctx, D.RIVALS[c.id].short, cx, y + 222, 14, '#4b5563');
      });
      var sum = m.cards.reduce(function (s, c) { return s + c.v; }, 0);
      if (m.judgeT > 1.4) UI.text(ctx, t('{n} points!', { n: sum }), W / 2, y + 252, 24, '#ff5a1f', 'center', { stroke: '#111827', strokeW: 5 });
      if (m.judgeT > 1.6 && UI.button(ctx, 'jNext', x + 30, y + h - 62, w - 60, 50, m.round >= 2 ? t('See results') : t('Next dunk'), { color: '#22c55e', icon: 'play' })) nextRound(S);
    }
    return m;
  };
  M.DUNKS = DUNKS;
})();
