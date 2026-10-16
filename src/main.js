// Swish Street - boot, resize, scene switching and the main loop (steppable for testing).
(function () {
  'use strict';
  var SS = window.SS, UI = SS.ui, U = SS.U;
  var canvas, ctx, W = 0, H = 0, DPR = 1, last = 0;
  var fade = { a: 0, dir: 0, next: null };

  // Play scene wrapper
  var playScene = {
    id: 'play',
    draw: function (c, w, h, dt) { SS.play.update(dt); SS.play.draw(c, w, h, dt); },
    onDown: function (p) { SS.play.onDown(p); },
    onMove: function (p) { SS.play.onMove(p); },
    onUp: function (p, c) { SS.play.onUp(p, c); },
    onKey: function (k) { SS.play.onKey(k); }
  };

  SS.go = function (name, arg) {
    if (fade.dir !== 0) return;
    fade.dir = 1; fade.next = { name: name, arg: arg };
  };
  function switchNow(name, arg) {
    UI.pressed = null; UI.clicked = null;
    if (name === 'play') { SS.scene = playScene; SS.play.layout(W, H); SS.play.start(arg); }
    else {
      SS.scene = SS.scenes[name] || SS.scenes.title;
      if (SS.scene.enter) SS.scene.enter(arg);
    }
    SS.sceneName = name;
    var names = { title: 'Title screen', map: 'Street Tour map', locker: 'Locker', tricks: 'Trick Shot Hall', comic: 'Story', crew: 'Team Up',
      versus: '2 Players setup', event: 'Street Event', trophies: 'Trophy Room' };
    if (SS.a11y) SS.a11y.say(name === 'play' ? SS.t('Game on! Swipe up to shoot.') : SS.t(names[name] || 'Swish Street'));
  }
  SS.goNow = switchNow;

  function readSafe() {
    var p = document.getElementById('safe');
    if (!p) return;
    var cs = getComputedStyle(p);
    UI.safe = { t: parseFloat(cs.paddingTop) || 0, b: parseFloat(cs.paddingBottom) || 0, l: parseFloat(cs.paddingLeft) || 0, r: parseFloat(cs.paddingRight) || 0 };
  }
  function resize() {
    W = Math.max(240, window.innerWidth); H = Math.max(240, window.innerHeight);
    DPR = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    // UI scale: chunky UI grows on tablets. UI coordinates are W/k x H/k "UI points".
    UI.k = U.clamp(Math.min(W, H) / 400, 1, 1.6);
    UI.W = W / UI.k; UI.H = H / UI.k;
    UI.DPR = DPR;
    readSafe();
    var k = UI.k; UI.safe = { t: UI.safe.t / k, b: UI.safe.b / k, l: UI.safe.l / k, r: UI.safe.r / k };
    SS.play.layout(W, H);
    // Trick Shot spots frame their prop by screen shape: re-frame after an iPad rotation
    var S = SS.play;
    if (SS.sceneName === 'play' && S.mode && S.mode.camAdjust && S.state === 'ready') S.setSpot(S.spotId);
  }

  // One frame. Exposed so tests can step the game without requestAnimationFrame.
  SS.frame = function (dt) {
    dt = U.clamp(dt, 0, 0.05);
    UI.begin();
    if (SS.a11y) SS.a11y.begin();
    UI.big = !!SS.save.data.settings.bigText;
    var k = UI.k || 1;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.fillStyle = '#0b1026'; ctx.fillRect(0, 0, W, H);
    try {
      if (SS.scene === playScene) SS.scene.draw(ctx, W, H, dt); // play scales its own HUD
      else if (SS.scene) {
        ctx.setTransform(DPR * k, 0, 0, DPR * k, 0, 0);
        SS.render.pixelScale = DPR * k;
        SS.scene.draw(ctx, UI.W, UI.H, dt);
      }
    } catch (e) {
      if (!SS._errShown) { SS._errShown = true; console.error(e); }
    }
    ctx.setTransform(DPR * k, 0, 0, DPR * k, 0, 0);
    UI.drawToasts(ctx, dt);
    if (fade.dir !== 0) {
      fade.a += dt * (fade.dir > 0 ? 6 : -5);
      if (fade.dir > 0 && fade.a >= 1) { fade.a = 1; switchNow(fade.next.name, fade.next.arg); fade.dir = -1; }
      else if (fade.dir < 0 && fade.a <= 0) { fade.a = 0; fade.dir = 0; }
      ctx.fillStyle = 'rgba(11,16,38,' + U.clamp(fade.a, 0, 1) + ')'; ctx.fillRect(0, 0, UI.W, UI.H);
    }
    if (SS.a11y) SS.a11y.end();
  };
  function loop(now) {
    var dt = last ? (now - last) / 1000 : 1 / 60;
    last = now;
    if (!SS.debug.freeze) SS.frame(dt);
    requestAnimationFrame(loop);
  }

  // ---------- Test / debug hooks (no effect on normal play) ----------
  SS.debug = {
    step: function (n, dt) { for (var i = 0; i < (n || 1); i++) SS.frame(dt || 1 / 60); },
    // Simulate a player flick: p = gauge 0..1, aimDeg = drag angle from vertical
    shot: function (p, aimDeg) { SS.play.shoot(p, (aimDeg || 0) * U.deg, 'player'); },
    // Run a headless shot from a spot with an exact launch, returns outcome
    sim: function (spot, scale, yawDeg, twist, alphaDeg) {
      var Pm = SS.Phys, w = Pm.makeWorld(), sp = SS.play.spotPos(spot);
      w.allowBounce = twist === 'bounce';
      var dx = -sp.x, dz = -sp.z, l = Math.hypot(dx, dz);
      var hx = sp.x + dx / l * 0.14, hz = sp.z + dz / l * 0.14, hy = 1.62;
      var ideal = Pm.solve(w, hx, hy, hz, twist || 'normal');
      var b = Pm.makeBall();
      Pm.launch(b, hx, hy, hz, ideal.tx, ideal.ty, ideal.tz, alphaDeg || ideal.alpha, ideal.scale * (scale || 1), (yawDeg || 0) * U.deg, ideal.spin);
      var tr = Pm.simulate(w, b, 7);
      return { scored: tr.scored, swish: tr.swish, bank: tr.bank, rim: tr.rim, bounces: tr.bounces, maxY: +tr.maxY.toFixed(2), board: tr.board, reason: tr.reason, t: +tr.t.toFixed(2), nudges: tr.nudges, idealOk: ideal.ok, scale: ideal.scale };
    },
    size: function () { return { W: W, H: H, DPR: DPR }; },
    // Auto-player for end-to-end tests: shoots with gaussian error whenever allowed.
    auto: function (pn, an) {
      var S = SS.play;
      if (SS.scene && SS.scene.id === 'play' && S.state === 'ready' && S.shooter === 'player' && !S.results && !S.paused &&
          (!S.mode.canShoot || S.mode.canShoot(S))) {
        S.shoot(U.clamp(S.pIdeal() + U.gauss() * (pn || 0), 0, 1), U.gauss() * (an || 0) * U.deg, 'player');
        return true;
      }
      return false;
    },
    // Shot-feel regression fingerprint (v0.4). Hashes headless solves, a grid of launch errors and
    // the whole gesture -> launch path (S.shoot) in three modes. With Aim Assist on Normal the
    // hash must not change between versions: v0.3 and v0.4 both give -745396852.
    // assist: optional 'easy' | 'normal' | 'pro' to fingerprint another level.
    fingerprint: function (assist) {
      var P = SS.Phys, out = [], st = SS.save.data.settings, keep = st.assist, frz = SS.debug.freeze;
      if (assist) st.assist = assist;
      SS.debug.freeze = true;
      Object.keys(SS.D.SPOTS).forEach(function (sp) {
        ['normal', 'bank', 'bounce'].forEach(function (tw) {
          var r = SS.debug.sim(sp, 1, 0, tw);
          out.push([sp, tw, r.scored, r.swish, r.bank, r.t, r.maxY, (r.scale || 0).toFixed(4)].join(','));
        });
      });
      var six = ['close', 'top', 'lw', 'rb', 'deep', 'rdeep'];
      six.forEach(function (sp) {
        [0.94, 0.97, 0.985, 1, 1.015, 1.03, 1.06].forEach(function (sc) {
          [-2, -1, 0, 1, 2].forEach(function (yw) {
            var r = SS.debug.sim(sp, sc, yw, 'normal');
            out.push([sp, sc, yw, r.scored, r.swish, r.rim, r.t].join(','));
          });
        });
      });
      function shootGrid(mode, wind) {
        SS.goNow('play', mode);
        var S = SS.play;
        six.forEach(function (sp) {
          S.setSpot(sp, true); S.ready('player');
          S.windNow = wind; S.windGoal = wind;
          var pi = S.pIdeal();
          [-0.2, -0.1, -0.05, -0.03, 0, 0.03, 0.05, 0.1, 0.2].forEach(function (dp) {
            [-12, -4, -2, 0, 2, 4, 12].forEach(function (aim) {
              S.ready('player'); S.windNow = wind;
              S.shoot(Math.max(0, Math.min(1, pi + dp)), aim * Math.PI / 180, 'player');
              var b = S.ball;
              var v = [b.vx, b.vy, b.vz, b.wx, b.wz].map(function (x) { return x.toFixed(5); }).join(';');
              var w = P.makeWorld(); w.windX = S.world.windX; w.windZ = S.world.windZ;
              var bb = { px: b.px, py: b.py, pz: b.pz, vx: b.vx, vy: b.vy, vz: b.vz, wx: b.wx, wy: b.wy, wz: b.wz };
              var tr = P.simulate(w, bb, 7);
              out.push(['S', mode.id, sp, dp, aim, v, tr.scored, tr.swish, tr.rimAny].join(','));
            });
          });
        });
      }
      var stats = JSON.stringify(SS.save.data.stats);
      shootGrid(SS.modes.quick(), 0);
      shootGrid(SS.modes.challenge('roof', 0), 1.1);
      shootGrid(SS.modes.horse('park'), 0);
      SS.save.data.stats = JSON.parse(stats);
      var s = out.join('\n'), h = 0;
      for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
      st.assist = keep; SS.debug.freeze = frz;
      SS.goNow('title');
      return { hash: h, lines: out.length, made: out.filter(function (l) { return /,true,/.test(l); }).length };
    },
    run: function (maxFrames, pn, an) {
      var shots = 0, i;
      for (i = 0; i < maxFrames; i++) {
        if (SS.debug.auto(pn, an)) shots++;
        SS.frame(1 / 60);
        if (SS.play.results && SS.scene.id === 'play') break;
      }
      return { frames: i, shots: shots, results: SS.play.results ? { title: SS.play.results.title, lines: SS.play.results.lines, coins: SS.play.results.coins } : null };
    }
  };

  function boot() {
    canvas = document.getElementById('game');
    ctx = canvas.getContext('2d');
    SS.canvas = canvas; SS.ctx = ctx;
    if (SS.a11y) SS.a11y.init();
    SS.save.load();
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', function () { setTimeout(resize, 200); });
    SS.input.attach(canvas);
    // Auto-pause when the app goes to the background.
    document.addEventListener('visibilitychange', function () {
      if (document.hidden && SS.scene === playScene && !SS.play.results) SS.play.paused = true;
    });
    switchNow('title');
    requestAnimationFrame(loop);
    // On iOS, recover the save from native Preferences if web storage was cleared.
    if (SS.native.isNative) {
      SS.native.restore(SS.save.KEY).then(function () { SS.save.load(); SS.native.ready(); });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
