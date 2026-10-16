// Swish Street - game modes: Tutorial, Quick Play, Daily, Court Challenges, H-O-R-S-E.
(function () {
  'use strict';
  var SS = window.SS, U = SS.U, D = SS.D, UI = SS.ui, A = SS.audio, AV = SS.avatar, R = SS.render, t = SS.t;
  var M = (SS.modes = {});
  function save() { return SS.save.data; }

  // ---------- shared HUD helpers ----------
  function chip(ctx, x, y, label, value, color, align) {
    UI.font(ctx, 22); var vw = ctx.measureText(value).width;
    UI.font(ctx, 11); var lw = ctx.measureText(label).width;
    var w = Math.max(vw, lw) + 28, h = 50;
    var bx = align === 'right' ? x - w : align === 'center' ? x - w / 2 : x;
    ctx.fillStyle = 'rgba(15,23,42,0.72)'; UI.rr(ctx, bx, y, w, h, 16); ctx.fill();
    UI.text(ctx, label, bx + w / 2, y + 13, 11, 'rgba(255,255,255,0.7)', 'center', { weight: 800 });
    UI.text(ctx, value, bx + w / 2, y + 33, 22, color || '#fff');
    return w;
  }
  M.chip = chip;
  function titleChip(ctx, W, text) {
    var y = UI.safe.t + 14;
    UI.text(ctx, text, W / 2, y + 24, Math.min(20, W * 0.05), '#fff', 'center', { stroke: '#111827', strokeW: 6, maxW: W - 220 });
  }
  function fmtTime(s) { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + (s % 60 < 10 ? '0' : '') + (s % 60); }
  function pointsFor(res, onFire, combo) {
    if (!res.made) return 0;
    var p = res.swish || res.bank ? 3 : 2;
    if (combo >= 3) p += 1;
    return onFire ? p * 2 : p;
  }
  function addPoints(S, n, extra) {
    if (n > 0) S.pop('+' + n + (extra || ''), S.onFire ? '#ff9a3d' : '#ffd23f', 0.5, 1);
  }

  // ---------- Tutorial ----------
  M.tutorial = function () {
    var m = {
      id: 'tutorial', env: 'park', window: 0.07, step: 0, tries: 0,
      init: function (S) { m.step = 0; m.tries = 0; m.window = 0.08; S.setSpot('close', true); S.ready(); m.handT = 0; },
      assist: function (S, p, perfect) {
        var dp = Math.abs(p - S.pIdeal());
        if (m.step === 0) return dp < 0.3 ? 1 : 0.6;
        if (m.step === 1) return dp < 0.15 ? 0.7 : 0.3;
        return 0.5;
      },
      onResult: function (S, res) {
        m.tries++;
        S.after(1.1, function () {
          if (m.step === 0 && res.made) { m.step = 1; m.tries = 0; m.window = 0.05; S.setSpot('top'); }
          else if (m.step === 1 && (res.perfect && res.made || m.tries >= 3)) { m.step = 2; m.tries = 0; m.window = 0.05; S.setSpot('rw'); }
          else if (m.step === 2 && (res.made || m.tries >= 4)) { return done(S); }
          if (!res.made && m.step === 0) S.hint = { text: S.lastShot.dp < 0 ? t('A bit longer swipe!') : t('A bit shorter swipe!'), t: 0 };
          S.ready();
        });
      },
      update: function (S, dt) { m.handT += dt; },
      hud: function (ctx, S, W, H) {
        var msgs = [t('Swipe UP and let go to shoot!'), t('Let go when the bar is in the GLOW for a perfect shot!'), t('Tilt your swipe left or right to aim!')];
        var y = UI.safe.t + 78, w = Math.min(W - 40, 420);
        ctx.fillStyle = 'rgba(15,23,42,0.8)'; UI.rr(ctx, (W - w) / 2, y, w, 74, 18); ctx.fill();
        UI.text(ctx, t('COACH') + '  ' + (m.step + 1) + '/3', W / 2, y + 16, 13, '#ffd23f');
        UI.wrap(ctx, msgs[m.step], W / 2, y + 40, w - 30, 18, '#fff');
        if (UI.button(ctx, 'skipTut', W - 100 - UI.safe.r, UI.safe.t + 14, 86, 44, t('Skip'), { color: '#64748b', size: 17 })) done(S, true);
        // ghost hand
        if (S.state === 'ready' && !S.drag) {
          var k = (m.handT % 1.6) / 1.2;
          if (k <= 1) {
            var x = W / 2 + (m.step === 2 ? k * W * 0.08 : 0), y0 = H * 0.82, y1 = H * 0.52, yy = U.lerp(y0, y1, U.easeInOut(k));
            ctx.globalAlpha = Math.sin(k * Math.PI) * 0.9;
            ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(x - 3, yy, 6, y0 - yy);
            ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, yy, 18, 0, 7); ctx.fill();
            ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 3; ctx.stroke();
            ctx.globalAlpha = 1;
          }
        }
      },
      restart: function () { SS.go('play', M.tutorial()); },
      quit: function () { SS.go('title'); }
    };
    function done(S, skipped) {
      var first = !save().tutorialDone;
      save().tutorialDone = true;
      if (first) SS.save.addCoins(50); else SS.save.write();
      S.finish({
        title: skipped ? t('Tutorial skipped') : t("You're ready!"), jingle: 'win',
        sub: t('Flick up, release in the glow, aim with a tilt. That\'s it!'),
        avatar: { look: save().avatar, pose: SS.celebCombo.myPose() }, coins: first ? 50 : 0,
        buttons: [
          { label: t('Start Street Tour'), color: '#22c55e', icon: 'map', action: function () { SS.go('map'); } },
          { label: t('Home'), color: '#64748b', icon: 'back', action: function () { SS.go('title'); } }
        ]
      });
    }
    return m;
  };

  // ---------- Quick Play ----------
  M.quick = function () {
    var SPOTS = ['close', 'top', 'lw', 'rw', 'lelb', 'relb', 'lb', 'rb', 'deep', 'ldeep', 'rdeep'];
    var m = {
      id: 'quick', env: 'night', fire: true, window: 0.04,
      init: function (S) {
        m.score = 0; m.time = 60; m.started = false; m.cd = 3.5; m.lastCd = 4; m.combo = 0; m.makes = 0; m.shots = 0; m.ended = false; m.inFlight = false;
        S.setSpot('top', true); S.ready();
      },
      canShoot: function () { return m.started && m.time > 0 && !m.ended; },
      update: function (S, dt) {
        if (!m.started) {
          m.cd -= dt;
          var c = Math.ceil(m.cd - 0.5);
          if (c !== m.lastCd && c >= 1 && c <= 3) { m.lastCd = c; A.countdown(false); }
          if (m.cd <= 0.5) { m.started = true; A.countdown(true); S.say(t('GO!'), '#7cff6b'); }
          return;
        }
        if (m.time > 0) {
          m.time -= dt;
          S.clutch = m.time < 6;
          if (m.time <= 0) {
            m.time = 0; A.buzzer();
            if (S.state !== 'flight') end(S);
          }
        }
      },
      onLaunch: function () { m.shots++; },
      onResult: function (S, res) {
        if (res.made) {
          m.combo++; m.makes++;
          var p = pointsFor(res, S.onFire, m.combo);
          m.score += p; addPoints(S, p, m.combo >= 3 ? '  ' + t('COMBO x{n}', { n: m.combo }) : '');
        } else m.combo = 0;
        S.after(res.made ? 0.55 : 0.75, function () {
          if (m.time <= 0) return end(S);
          if (res.made) {
            var nxt = S.spotId; while (nxt === S.spotId) nxt = U.pick(m.score > 20 ? SPOTS : SPOTS.slice(0, 8));
            S.setSpot(nxt);
          }
          S.ready();
        });
      },
      hud: function (ctx, S, W, H) {
        var y = UI.safe.t + 12;
        chip(ctx, W - 12 - UI.safe.r, y, t('SCORE'), String(m.score), '#ffd23f', 'right');
        chip(ctx, W / 2, y, t('TIME'), fmtTime(m.time), m.time < 10 ? '#ff6b6b' : '#fff', 'center');
        if (m.combo >= 2) UI.text(ctx, t('COMBO x{n}', { n: m.combo }), W / 2, y + 66, 16, '#7cff6b', 'center', { stroke: '#111827', strokeW: 5 });
        if (S.onFire) UI.text(ctx, t('ON FIRE x2'), W / 2, y + 88, 18, '#ff9a3d', 'center', { stroke: '#111827', strokeW: 5 });
        if (!m.started) {
          var c = Math.ceil(m.cd - 0.5);
          if (c >= 1) UI.text(ctx, String(c), W / 2, H * 0.42, 110, '#fff', 'center', { stroke: '#111827', strokeW: 14 });
          UI.text(ctx, t('Score as much as you can in 60 seconds!'), W / 2, H * 0.55, 18, '#fff', 'center', { stroke: '#111827', strokeW: 5, maxW: W - 30 });
        }
      },
      restart: function () { SS.go('play', M.quick()); },
      quit: function () { SS.go('title'); }
    };
    function end(S) {
      if (m.ended) return; m.ended = true;
      var best = save().quickBest, isBest = m.score > best;
      if (isBest) save().quickBest = m.score;
      var coins = 5 + Math.floor(m.score / 3);
      SS.save.addCoins(coins);
      if (isBest && m.score > 0) S.celebrate(true);
      S.finish({
        title: isBest && m.score > 0 ? t('NEW BEST!') : t('Time!'), jingle: isBest ? 'win' : 'star',
        lines: [t('Score: {n}', { n: m.score }), t('Best: {n}', { n: save().quickBest }), t('Made {a} of {b} shots', { a: m.makes, b: m.shots })],
        coins: coins,
        buttons: [
          { label: t('Play Again'), color: '#22c55e', icon: 'retry', action: function () { SS.go('play', M.quick()); } },
          { label: t('Home'), color: '#64748b', icon: 'back', action: function () { SS.go('title'); } }
        ]
      });
    }
    return m;
  };

  // ---------- Daily Challenge ----------
  M.dailyPlan = function (key) {
    var r = U.rng(U.hashStr('swish-daily-' + key));
    var spots = ['close', 'top', 'lw', 'rw', 'lelb', 'relb', 'lb', 'rb', 'deep', 'ldeep', 'rdeep'];
    var envs = ['night', 'park', 'roof', 'gym', 'beach', 'subway', 'snow'];
    var plan = { env: r.pick(envs), shots: [] };
    for (var i = 0; i < 10; i++) {
      var sp = r.pick(spots), roll = r(), tw = 'normal';
      if (roll < 0.2 && D.BANK_OK[sp]) tw = 'bank'; else if (roll < 0.34) tw = 'swish';
      else if (roll < 0.42) tw = 'blind'; else if (roll < 0.5) tw = 'nolook';
      else if (roll < 0.56 && D.BOUNCE_OK[sp] && plan.env !== 'roof') tw = 'bounce';
      var wind = plan.env === 'roof' ? (r() < 0.5 ? -1 : 1) * r.range(0.4, 1.4) : 0;
      plan.shots.push({ spot: sp, twist: tw, wind: wind });
    }
    return plan;
  };
  M.daily = function () {
    var key = U.todayKey(), plan = M.dailyPlan(key);
    var m = {
      id: 'daily', env: plan.env, window: 0.04,
      init: function (S) {
        m.i = 0; m.score = 0; m.log = [];
        apply(S, true); S.ready();
      },
      onResult: function (S, res) {
        var sh = plan.shots[m.i], pts = 0;
        if (res.made) {
          if (sh.twist === 'normal') pts = 100 + (res.swish ? 50 : 0);
          else pts = res.twistOk ? 150 : 50;
          if (res.perfect) pts += 25;
        }
        m.score += pts; m.log.push(pts);
        if (pts) S.pop('+' + pts, '#ffd23f', 0.5);
        S.after(0.9, function () {
          m.i++;
          if (m.i >= plan.shots.length) return end(S);
          apply(S, false); S.ready();
        });
      },
      hud: function (ctx, S, W, H) {
        var y = UI.safe.t + 12;
        chip(ctx, W - 12 - UI.safe.r, y, t('SCORE'), String(m.score), '#ffd23f', 'right');
        chip(ctx, W / 2, y, t('SHOT'), Math.min(m.i + 1, 10) + '/10', '#fff', 'center');
        var sh = plan.shots[Math.min(m.i, 9)];
        if (sh.twist !== 'normal') twistBadge(ctx, W / 2, y + 74, sh.twist, S.time);
      },
      restart: function () { SS.go('play', M.daily()); },
      quit: function () { SS.go('title'); }
    };
    function apply(S, instant) {
      var sh = plan.shots[m.i];
      S.setSpot(sh.spot, instant); S.setTwist(sh.twist); S.windGoal = sh.wind;
    }
    function end(S) {
      var d = save().daily, first = d.date !== key;
      if (first) { d.date = key; d.best = 0; d.played = 0; }
      d.played++;
      var isBest = m.score > d.best;
      if (isBest) d.best = m.score;
      if (m.score > d.allBest) d.allBest = m.score;
      var coins = first ? 20 + Math.floor(m.score / 40) : Math.floor(m.score / 100);
      SS.save.addCoins(coins);
      S.finish({
        title: isBest ? t("Today's best!") : t('Daily done!'), jingle: isBest ? 'win' : 'star',
        sub: t('A new shot list arrives every day.'),
        lines: [t('Score: {n}', { n: m.score }), t("Today's best: {n}", { n: d.best }), t('All-time best: {n}', { n: d.allBest })],
        coins: coins,
        buttons: [
          { label: t('Try Again'), color: '#22c55e', icon: 'retry', action: function () { SS.go('play', M.daily()); } },
          { label: t('Home'), color: '#64748b', icon: 'back', action: function () { SS.go('title'); } }
        ]
      });
    }
    return m;
  };

  function twistBadge(ctx, x, y, tw, time) {
    var name = t(D.TWISTS[tw].name).toUpperCase();
    UI.font(ctx, 16); var w = ctx.measureText(name).width + 54;
    var k = 1 + 0.04 * Math.sin(time * 6);
    ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
    ctx.fillStyle = tw === 'bank' ? '#7c3aed' : '#0891b2'; UI.rr(ctx, -w / 2, -17, w, 34, 17); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; UI.rr(ctx, -w / 2, -17, w, 34, 17); ctx.stroke();
    UI.icon(ctx, D.TWISTS[tw].icon, -w / 2 + 20, 0, 20, '#fff');
    UI.text(ctx, name, 12, 1, 16, '#fff');
    ctx.restore();
  }
  M.twistBadge = twistBadge;

  // Court moods on revisits: after you have beaten a court's rival, the court sometimes shows up
  // at golden hour, at night or in the rain. Picked by the date, so it changes day to day.
  M.variantFor = function (courtId, salt) {
    var list = D.COURT_VARIANTS[courtId], c = D.courtById(courtId);
    if (!list || !c || SS.save.rivalLevel(c.rival) < 1) return null;
    var r = U.rng(U.hashStr(U.todayKey() + courtId + (salt || '')))();
    return r < 0.35 ? null : list[Math.floor(r * 1000) % list.length];
  };
  function variantLabel(v) { return v ? t(D.VARIANTS[v].name) : ''; }

  // ---------- Court Challenges ----------
  // custom (v0.4): a challenge config that is not on the Street Tour (Street Events use this).
  // Optional hooks: points(S, res, m), beforeShot(S, m), ballSkin(S, m), onEnd(S, m), hud(ctx, S, W, H, m),
  // restart(), quit(), plus variant, fireAt, trainFast and noNeed (no target on the chip).
  M.challenge = function (courtId, idx, custom) {
    var court = D.courtById(courtId), cfg = custom || court.challenges[idx];
    var m = {
      id: custom ? 'event' : 'challenge', env: court.env, window: 0.04, move: cfg.move || null, courtName: court.name, fire: !!cfg.fire,
      variant: custom ? cfg.variant || null : M.variantFor(courtId, cfg.id), courtId: courtId, fireAt: cfg.fireAt || null,
      ballSkin: cfg.ballSkin ? function (S) { return cfg.ballSkin(S, m); } : null,
      init: function (S) {
        m.count = 0; m.points = 0; m.balls = cfg.balls || 0; m.time = cfg.time || 0; m.shotN = 0; m.arcI = 0; m.ended = false;
        m.streak = 0; m.elapsed = 0; m.tide = 0; m.gustT = 2;
        m.lit = cfg.targets ? cfg.targets.map(function () { return false; }) : null;
        S.litTargets = m.lit;
        if (cfg.targets) S.world.targets = cfg.targets;
        S.setTwist(cfg.filter || 'normal');
        if (cfg.gulls) { m.gull = { x: 0, y: 4.3, z: -2, r: 0.38, on: false, hit: false, s: 0, dir: 1, wait: 1.8, flee: 0 }; S.world.obstacles = [m.gull]; }
        nextSpot(S, true); S.ready();
        m.intro = 2.2;
        if (cfg.wind) S.after(2.3, function () { S.hint = { text: t('Windy! Tilt your swipe INTO the wind.'), t: 0 }; });
        if (cfg.filter && D.TWISTS[cfg.filter] && cfg.filter !== 'bank' && cfg.filter !== 'swish') {
          S.after(2.3, function () { S.hint = { text: t(D.TWISTS[cfg.filter].tip), t: 0 }; });
        }
      },
      onObstacle: function (S, i) {
        var g = m.gull; if (!g || g.flee) return;
        g.flee = 0.01; A.squawk(); S.kick(5);
        S.burst(S.screenOf(g.x, g.y, g.z), 16, ['#ffffff', '#e2e8f0', '#cbd5e1'], 'confetti');
      },
      onTrain: function (S) {
        if (!cfg.trains) { S.mcPick('train', null, 0.6); return; }
        var dir = Math.random() < 0.5 ? -1 : 1;
        S.windGoal = dir * 1.5; m.trainGust = 3.2;
        S.pop(t('TRAIN GUST!'), '#a5f3fc', 0.36, 1);
        S.mcPick('train');
      },
      drawFront: cfg.gulls ? function (ctx, S, cam) {
        var g = m.gull; if (!g.on) return;
        R.drawGull(ctx, cam, g.x, g.y, g.z, S.time, g.dir, g.flee ? g.flee * 9 : 0);
      } : null,
      canShoot: function () { return !m.ended && (!cfg.time || m.time > 0); },
      // Trick-shot targets: the "perfect" release aims at the nearest unlit target.
      aimAt: cfg.targets ? function (S) {
        var best = null, bd = 1e9, side = S.pos.x;
        cfg.targets.forEach(function (tg, i) {
          if (m.lit && m.lit[i]) return;
          var d = Math.abs(tg.x - side * 0.15);
          if (d < bd) { bd = d; best = tg; }
        });
        return best ? { x: S.world.hx0 + best.x, y: best.y, z: SS.Phys.BOARD_Z - SS.Phys.R_BALL * 0.9 } : null;
      } : null,
      update: function (S, dt) {
        if (m.intro > 0) m.intro -= dt;
        if (cfg.time && !m.ended && m.intro <= 0.6) {
          m.time -= dt; m.elapsed += dt; S.clutch = m.time < 5;
          if (m.time <= 0) { m.time = 0; A.buzzer(); if (S.state !== 'flight') end(S, false); }
        }
        // sea breeze: the wind keeps changing, even while you aim
        if (cfg.wind && cfg.wind.gust && !m.ended) {
          m.gustT -= dt;
          if (m.gustT <= 0) { m.gustT = U.rand(1.4, 2.4); S.windGoal = (Math.random() < 0.5 ? -1 : 1) * cfg.wind.base * U.rand(0.5, 1.3); }
        }
        if (m.trainGust > 0) { m.trainGust -= dt; if (m.trainGust <= 0) S.windGoal = 0; }
        // Rush Hour Remix: trains come round much more often
        var trn = R.dyn.train;
        if (cfg.trainFast && trn && !trn.on && trn.next > 8) trn.next = U.rand(4, 7);
        if (cfg.order === 'tide') {
          var lv = Math.min(cfg.spots.length - 3, Math.floor(m.elapsed / 9));
          if (lv > m.tide) { m.tide = lv; S.pop(t('The tide pushes you back!'), '#7dd3fc', 0.36, 0.8); }
        }
        if (m.gull) gullUpdate(S, dt);
      },
      onLaunch: function () { if (cfg.balls) m.balls--; m.shotN++; },
      onTarget: function (S, i) {
        if (m.lit && !m.lit[i]) {
          m.lit[i] = true; A.jingle('star'); S.pop(t('TARGET!'), '#7cff6b', 0.34, 1.1);
          var tg = cfg.targets[i];
          S.burst(S.screenOf(S.world.hx + tg.x, tg.y, SS.Phys.BOARD_Z), 18, ['#7cff6b', '#ffffff', '#ffd23f'], 'spark');
          m.count = m.lit.filter(Boolean).length;
        }
      },
      onResult: function (S, res) {
        var counted = false;
        if (cfg.goal === 'makes') { if (res.made && (!cfg.filter || res.twistOk)) { m.count++; counted = true; } }
        else if (cfg.goal === 'arc') { if (res.made) { m.count++; m.arcI++; counted = true; } }
        else if (cfg.goal === 'points') {
          m.combo = res.made ? (m.combo || 0) + 1 : 0;
          var p = cfg.points ? cfg.points(S, res, m) : pointsFor(res, cfg.fire && S.onFire, cfg.fire ? m.combo : 0);
          m.points += p; m.count = m.points; if (!cfg.points) addPoints(S, p); counted = p > 0;
        }
        else if (cfg.goal === 'streak') {
          if (res.made) { m.streak++; counted = true; } else if (m.streak > 0) { S.pop(t('Streak reset'), '#ffffff', 0.42, 0.8); m.streak = 0; }
          m.count = Math.max(m.count, m.streak);
        }
        if (res.made && cfg.filter && !res.twistOk) S.pop(cfg.filter === 'bank' ? t('Needs the glass!') : cfg.filter === 'bounce' ? t('Bounce it first!') : t('Must be a swish!'), '#ffffff', 0.42, 0.8);
        if (cfg.goal === 'streak' && counted) { S.pop(t('{n} in a row!', { n: m.streak }), '#7cff6b', 0.5); counted = false; }
        if (counted && cfg.goal !== 'points') S.pop(m.count + ' / ' + cfg.need, '#7cff6b', 0.5);
        S.after(0.8, function () {
          if (m.count >= cfg.need) return end(S, true);
          if ((cfg.balls && m.balls <= 0) || (cfg.time && m.time <= 0)) return end(S, false);
          nextSpot(S, false); S.ready();
        });
      },
      hud: function (ctx, S, W, H) {
        var y = UI.safe.t + 12;
        var label = cfg.goal === 'points' ? t('POINTS') : cfg.goal === 'targets' ? t('TARGETS') : cfg.goal === 'arc' ? t('SPOTS') : cfg.goal === 'streak' ? t('IN A ROW') : t('MAKES');
        chip(ctx, W - 12 - UI.safe.r, y, label, (cfg.goal === 'streak' ? m.streak : m.count) + (cfg.noNeed ? '' : '/' + cfg.need), '#7cff6b', 'right');
        if (cfg.hud) cfg.hud(ctx, S, W, H, m);
        if (cfg.balls) chip(ctx, W / 2, y, t('BALLS'), String(m.balls), m.balls <= 2 ? '#ff6b6b' : '#fff', 'center');
        if (cfg.time) chip(ctx, W / 2, y, t('TIME'), fmtTime(m.time), m.time < 10 ? '#ff6b6b' : '#fff', 'center');
        if (cfg.filter) twistBadge(ctx, W / 2, y + 74, cfg.filter, S.time);
        if (cfg.order === 'tide') {
          UI.text(ctx, t('TIDE') + ' ' + '~'.repeat(m.tide + 1), W / 2, y + 66, 15, '#7dd3fc', 'center', { stroke: '#0f172a', strokeW: 5 });
        }
        if (S.onFire && cfg.fire) UI.text(ctx, t('ON FIRE x2'), W / 2, y + 88, 18, '#ff9a3d', 'center', { stroke: '#111827', strokeW: 5 });
        if (m.intro > 0) {
          var a = Math.min(1, m.intro * 2);
          ctx.globalAlpha = a;
          var w = Math.min(W - 40, 420);
          ctx.fillStyle = 'rgba(15,23,42,0.85)'; UI.rr(ctx, (W - w) / 2, H * 0.3, w, 96, 20); ctx.fill();
          UI.text(ctx, t(cfg.name), W / 2, H * 0.3 + 30, 26, '#ffd23f', 'center', { maxW: w - 30 });
          UI.wrap(ctx, t(cfg.desc), W / 2, H * 0.3 + 64, w - 30, 16, '#fff');
          if (m.variant) UI.text(ctx, t('Today: {v}', { v: variantLabel(m.variant) }), W / 2, H * 0.3 + 112, 16, '#fde68a', 'center', { stroke: '#111827', strokeW: 5 });
          ctx.globalAlpha = 1;
        }
      },
      restart: function () { if (cfg.restart) cfg.restart(); else SS.go('play', M.challenge(courtId, idx)); },
      quit: function () { if (cfg.quit) cfg.quit(); else SS.go('map', { court: courtId }); }
    };
    function nextSpot(S, instant) {
      nextSpot0(S, instant);
      if (cfg.beforeShot) cfg.beforeShot(S, m);
    }
    function nextSpot0(S, instant) {
      var sp;
      if (cfg.goal === 'arc') sp = cfg.spots[Math.min(m.arcI, cfg.spots.length - 1)];
      else if (cfg.order === 'random') { sp = S.spotId; var g = 0; while ((sp === S.spotId || !sp) && g++ < 10) sp = U.pick(cfg.spots); }
      else if (cfg.order === 'tide') { var pool = cfg.spots.slice(m.tide, m.tide + 3); sp = S.spotId; var g2 = 0; while ((sp === S.spotId || !sp) && g2++ < 10) sp = U.pick(pool); }
      else sp = cfg.spots[m.shotN % cfg.spots.length];
      S.setSpot(sp, instant);
      if (cfg.wind) S.windGoal = (Math.random() < 0.5 ? -1 : 1) * cfg.wind.base * (cfg.wind.vary ? U.rand(0.6, 1.2) : 1);
    }
    // Gull Patrol: a gull glides across the middle of your shot's path every few seconds.
    function gullUpdate(S, dt) {
      var g = m.gull, sp = S.spotPos(S.spotId), wd = S.windDir || { x: 1, z: 0 };
      if (g.flee) {
        g.flee += dt; g.y += dt * 5; g.s += g.dir * dt * 6;
        if (g.flee > 1.4) { g.on = false; g.flee = 0; g.hit = false; g.wait = U.rand(1.5, 2.5); }
      } else if (!g.on) {
        g.wait -= dt;
        if (g.wait <= 0) { g.on = true; g.dir = Math.random() < 0.5 ? 1 : -1; g.s = -g.dir * 7; g.hit = false; g.lane = U.rand(0.42, 0.55); g.alt = U.rand(-0.15, 0.2); g.ph = null; A.squawk(); }
      } else if (g.ph == null) {
        // fly in from the side, then patrol back and forth across your shot
        g.s += g.dir * dt * 3.2;
        if (g.dir * g.s >= -2.6) g.ph = g.dir > 0 ? -Math.PI / 2 : Math.PI / 2;
      } else {
        g.ph += dt * 0.8;
        var ns = Math.sin(g.ph) * 2.6;
        g.dir = ns > g.s ? 1 : -1; g.s = ns;
      }
      // gull sits across the middle of the path, at about the ball's peak height
      var mx = sp.x * (g.lane || 0.5), mz = sp.z * (g.lane || 0.5);
      g.x = mx + wd.x * g.s; g.z = mz + wd.z * g.s;
      if (!g.flee) g.y = 3.2 + sp.d * 0.2 + (g.alt || 0) + Math.sin(S.time * 3) * 0.08;
    }
    function end(S, won) {
      if (m.ended) return; m.ended = true;
      if (cfg.onEnd) return cfg.onEnd(S, m);
      var newStar = false, coins = 0;
      if (won) {
        newStar = SS.save.setStar(courtId, idx);
        coins = newStar ? 30 : 5;
        SS.save.addCoins(coins);
        S.celebrate(true);
        if (newStar && SS.save.starCount(courtId) === 2) UI.toast(t('Rival unlocked: {n}!', { n: D.RIVALS[court.rival].short }), '#7c3aed');
      } else SS.save.write();
      S.finish({
        title: won ? t('Challenge complete!') : t('So close!'), jingle: won ? 'star' : null,
        sub: won ? t(cfg.name) : t('Every shot makes you better. Try again!'),
        stars: won ? 1 : 0, starsMax: 1, coins: coins,
        buttons: [
          won ? { label: t('Continue'), color: '#22c55e', icon: 'map', action: function () { SS.go('map', { court: courtId }); } }
              : { label: t('Try Again'), color: '#22c55e', icon: 'retry', action: function () { SS.go('play', M.challenge(courtId, idx)); } },
          won ? { label: t('Play Again'), color: '#3b82f6', icon: 'retry', action: function () { SS.go('play', M.challenge(courtId, idx)); } }
              : { label: t('Back to Court'), color: '#64748b', icon: 'back', action: function () { SS.go('map', { court: courtId }); } }
        ]
      });
    }
    return m;
  };

  // ---------- H-O-R-S-E ----------
  var WORD = ['H', 'O', 'R', 'S', 'E'];
  M.horse = function (courtId) {
    var court = D.courtById(courtId), rv = D.RIVALS[court.rival];
    var level = SS.save.rivalLevel(rv.id), tierI = Math.min(level, 2), tier = D.TIERS[tierI];
    // twist odds = the rival's style plus the tougher tier's trick twists
    var odds = {}, sum = 0;
    D.TWIST_ORDER.forEach(function (k) { if (k !== 'normal') { odds[k] = (rv.twists[k] || 0) + ((tier.extra && tier.extra[k]) || 0); sum += odds[k]; } });
    if (sum > 0.85) Object.keys(odds).forEach(function (k) { odds[k] *= 0.85 / sum; });
    var m = {
      id: 'horse', env: court.env, window: 0.04, rv: rv, rivalSkillMul: tier.skill, courtName: null, tier: tierI,
      variant: level >= 1 ? M.variantFor(courtId, 'horse') : null, courtId: courtId,
      init: function (S) {
        m.you = 0; m.them = 0; m.phase = 'intro'; m.bubble = null; m.pick = { spot: 'top', twist: 'normal' }; m.ended = false;
        S.rival = { look: rv.look };
        S.setSpot('top', true); S.ready('rival');
        S.hideBall = false;
        m.windy = !!(R.ENVS[court.env] && R.ENVS[court.env].wind);
        m.lastMake = null;
      },
      canShoot: function (S) { return m.phase === 'youMatch' || m.phase === 'youSet'; },
      update: function (S, dt) { if (m.bubble) { m.bubble.t += dt; } if (m.finaleT != null) m.finaleT += dt; },
      onResult: function (S, res) {
        var ph = m.phase;
        if (res.who === 'player' && res.twistOk && S.rec) m.lastMake = S.rec.frames.slice();
        if (ph === 'rivalSet') {
          if (res.twistOk) {
            say(U.pick(rv.lines.make));
            S.after(1.4, function () { m.phase = 'youMatch'; S.clutch = m.you === 4; S.ready('player'); banner(S, t('Your turn: match it!')); });
          } else {
            say(U.pick(rv.lines.miss));
            S.after(1.4, function () { startPick(S); });
          }
        } else if (ph === 'youMatch') {
          if (!res.twistOk) {
            m.you++; A.jingle('letter'); S.pop(t('Letter: {l}', { l: WORD[m.you - 1] }), '#ff6b6b', 0.36, 1.1);
            say(U.pick(rv.lines.youMiss));
          } else say(U.pick(rv.lines.youMake));
          S.after(1.5, function () { if (!checkEnd(S)) startPick(S); });
        } else if (ph === 'youSet') {
          if (res.twistOk) {
            say(U.pick(rv.lines.youMake));
            S.after(1.4, function () { m.phase = 'rivalMatch'; S.rivalShoot(rv, 1.0); banner(S, t('{n} must match it!', { n: rv.short })); });
          } else {
            S.after(1.2, function () { rivalSet(S); });
          }
        } else if (ph === 'rivalMatch') {
          if (!res.twistOk) {
            m.them++; A.jingle('letter'); S.pop(t('{n} gets {l}!', { n: rv.short, l: WORD[m.them - 1] }), '#7cff6b', 0.36, 1.1);
            say(U.pick(rv.lines.miss));
          } else say(U.pick(rv.lines.make));
          S.after(1.5, function () { if (!checkEnd(S)) rivalSet(S); });
        }
      },
      hud: function (ctx, S, W, H) {
        var y = UI.safe.t + 12, x = W - 12 - UI.safe.r;
        letters(ctx, x, y, t('YOU'), m.you, '#ffd23f');
        letters(ctx, x, y + 40, rv.short.toUpperCase(), m.them, '#7cff6b');
        if (S.twist !== 'normal' && (m.phase !== 'youPick' && m.phase !== 'intro')) twistBadge(ctx, W / 2, y + 162, S.twist, S.time);
        if (m.bubble && m.bubble.t < 3.2) bubble(ctx, W, H, m.bubble);
        if (m.ban && m.ban.t < 1.6) {
          m.ban.t += 1 / 60;
          var a = m.ban.t > 1.2 ? 1 - (m.ban.t - 1.2) / 0.4 : 1;
          ctx.globalAlpha = Math.max(0, a);
          UI.text(ctx, m.ban.text, W / 2, H * 0.62, 28, '#fff', 'center', { stroke: '#111827', strokeW: 8, maxW: W - 30 });
          ctx.globalAlpha = 1;
        }
      },
      overlay: function (ctx, S, W, H, dt) {
        if (m.phase === 'intro') introCard(ctx, S, W, H);
        else if (m.phase === 'youPick') picker(ctx, S, W, H);
        else if (m.phase === 'finale') finale(ctx, S, W, H, dt);
      },
      restart: function () { SS.go('play', M.horse(courtId)); },
      quit: function () { SS.go('map', { court: courtId }); }
    };
    function say(text) { m.bubble = { text: t(text), t: 0 }; }
    function banner(S, text) { m.ban = { text: text, t: 0 }; }
    function letters(ctx, x, y, name, n, col) {
      var bw = 26, gap = 4, total = 5 * (bw + gap);
      UI.font(ctx, 14); var nw = Math.min(70, ctx.measureText(name).width + 8);
      ctx.fillStyle = 'rgba(15,23,42,0.75)'; UI.rr(ctx, x - total - nw - 10, y, total + nw + 14, 34, 12); ctx.fill();
      UI.text(ctx, name, x - total - 6, y + 17, 14, col, 'right', { maxW: nw });
      for (var i = 0; i < 5; i++) {
        var bx = x - total + i * (bw + gap);
        ctx.fillStyle = i < n ? '#ef4444' : 'rgba(255,255,255,0.12)'; UI.rr(ctx, bx, y + 4, bw, 26, 7); ctx.fill();
        UI.text(ctx, WORD[i], bx + bw / 2, y + 18, 16, i < n ? '#fff' : 'rgba(255,255,255,0.35)');
      }
    }
    function bubble(ctx, W, H, b) {
      var k = U.easeOutBack(Math.min(1, b.t * 5)), a = b.t > 2.8 ? 1 - (b.t - 2.8) / 0.4 : 1;
      var w = Math.min(W - 40, 360), y = UI.safe.t + 88;
      ctx.globalAlpha = Math.max(0, a);
      ctx.save(); ctx.translate(20 + UI.safe.l, y); ctx.scale(k, k);
      ctx.fillStyle = '#fff'; UI.rr(ctx, 0, 0, w, 62, 18); ctx.fill();
      ctx.strokeStyle = '#111827'; ctx.lineWidth = 3; UI.rr(ctx, 0, 0, w, 62, 18); ctx.stroke();
      // portrait
      ctx.save(); ctx.beginPath(); ctx.arc(34, 31, 25, 0, 7); ctx.fillStyle = '#ffd23f'; ctx.fill(); ctx.clip();
      AV.draw(ctx, rv.look, 34, 31 + 74, 80, { pose: 'idle', t: 0, shadow: false });
      ctx.restore();
      var nl = Math.min(3, UI.countLines(ctx, b.text, w - 84, 15));
      UI.wrap(ctx, b.text, 66 + (w - 76) / 2, 31 - (nl - 1) * 9, w - 84, 15, '#111827', 'center', 18);
      ctx.restore();
      ctx.globalAlpha = 1;
    }
    function introCard(ctx, S, W, H) {
      UI.blocker(ctx, 0.55, 'hIntro');
      var w = Math.min(380, W - 32), h = 430, x = (W - w) / 2, y = Math.max(20, (H - h) / 2);
      UI.panel(ctx, x, y, w, h);
      UI.text(ctx, level >= 1 ? t('REMATCH: {tier} LEVEL', { tier: t(tier.name).toUpperCase() }) : t('RIVAL CHALLENGE'), W / 2, y + 32, 16, tierI === 2 ? '#b45309' : '#7c3aed');
      UI.text(ctx, rv.name, W / 2, y + 62, 24, '#111827', 'center', { maxW: w - 30 });
      respectPips(ctx, W / 2 + 96, y + 160, level);
      ctx.fillStyle = '#fde68a'; UI.rr(ctx, W / 2 - 80, y + 84, 160, 150, 20); ctx.fill();
      AV.draw(ctx, rv.look, W / 2, y + 226, 130, { pose: 'wave', t: S.time });
      UI.wrap(ctx, '"' + t(rv.lines.intro) + '"', W / 2, y + 262, w - 40, 17, '#111827');
      UI.wrap(ctx, t('Make the shot your rival calls. Miss and you get a letter. Spell H-O-R-S-E and the game is over!'), W / 2, y + 316, w - 40, 14, '#4b5563');
      if (UI.button(ctx, 'hGo', x + 30, y + h - 76, w - 60, 58, t("Let's play!"), { color: '#22c55e', icon: 'ball' })) rivalSet(S);
    }
    function rivalSet(S) {
      var r = Math.random(), tw = 'normal', acc = 0;
      D.TWIST_ORDER.forEach(function (k) { if (k !== 'normal' && tw === 'normal') { acc += odds[k]; if (r < acc) tw = k; } });
      // early game: keep it friendly
      if (m.you + m.them === 0 && Math.random() < 0.6) tw = 'normal';
      var spots = D.HORSE_SPOTS.filter(function (s) { return D.twistOkAt(tw, s); });
      var sp = S.spotId, g = 0;
      while ((sp === S.spotId || spots.indexOf(sp) < 0) && g++ < 12) sp = U.pick(spots);
      S.setSpot(sp); S.setTwist(tw);
      // sky-high bounce shots skip the wind (that would be too mean)
      S.windGoal = m.windy && tw !== 'bounce' ? (Math.random() < 0.5 ? -1 : 1) * U.rand(0.4, 1.2) : 0;
      m.phase = 'rivalSet'; S.clutch = false;
      say(U.pick(rv.lines.set) + ' ' + t(D.SPOTS[sp].name) + (tw !== 'normal' ? ', ' + t(D.TWISTS[tw].name).toLowerCase() + '!' : '!'));
      S.rivalShoot(rv, 1.6);
    }
    function startPick(S) {
      m.phase = 'youPick'; S.clutch = false;
      S.ready('player');
      m.pick.spot = D.HORSE_SPOTS.indexOf(S.spotId) >= 0 ? S.spotId : 'top';
      if (!D.twistOkAt(m.pick.twist, m.pick.spot)) m.pick.twist = 'normal';
      S.setSpot(m.pick.spot); S.setTwist('normal');
    }
    function picker(ctx, S, W, H) {
      var w = Math.min(420, W - 20), h = 372, x = (W - w) / 2, y = H - h - 12 - UI.safe.b;
      UI.panel(ctx, x, y, w, h, { color: 'rgba(255,248,236,0.97)' });
      UI.text(ctx, t('Your call! Pick a spot'), W / 2, y + 26, 20, '#111827');
      // mini court (half circle)
      var cx = W / 2, cy = y + 46, sc = Math.min((w - 60) / 13, 112 / 6.2);
      var sx = Math.min(sc * 1.5, (w / 2 - 16) / 6.6);
      ctx.fillStyle = '#e2e8f0'; ctx.beginPath(); ctx.ellipse(cx, cy, 6.6 * sx, 6.6 * sc, 0, 0, Math.PI); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fecaca'; ctx.fillRect(cx - 2.45 * sx, cy, 4.9 * sx, 4.2 * sc);
      ctx.fillStyle = '#ff5a1f'; ctx.beginPath(); ctx.arc(cx, cy + 4, 6, 0, 7); ctx.fill();
      D.HORSE_SPOTS.forEach(function (id) {
        var sp = D.SPOTS[id], a = sp.a * U.deg, px = cx + Math.sin(a) * sp.d * sx, py = cy + Math.cos(a) * sp.d * sc + 4;
        var sel = m.pick.spot === id;
        UI.region('spot_' + id, px - 22, py - 22, 44, 44);
        ctx.fillStyle = sel ? '#ff7a1a' : '#334155'; ctx.beginPath(); ctx.arc(px, py, sel ? 17 : 14, 0, 7); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke();
        if (UI.consume('spot_' + id)) {
          m.pick.spot = id; S.setSpot(id);
          if (!D.twistOkAt(m.pick.twist, id)) m.pick.twist = 'normal';
        }
      });
      UI.text(ctx, t(D.SPOTS[m.pick.spot].name), W / 2, y + 182, 16, '#7c2d12');
      // twists: 4 + 3 chunky buttons with icons, and a one-line tip
      var tw = D.TWIST_ORDER, bw4 = (w - 28 - 18) / 4, bh = 40;
      tw.forEach(function (id, i) {
        var row = i < 4 ? 0 : 1, col = row ? i - 4 : i, n = row ? 3 : 4, bw = row ? (w - 28 - 12) / 3 : bw4;
        var dis = !D.twistOkAt(id, m.pick.spot);
        var sel = m.pick.twist === id;
        if (UI.button(ctx, 'tw_' + id, x + 14 + col * (bw + 6), y + 196 + row * (bh + 8), bw, bh, t(D.TWISTS[id].short),
          { color: sel ? '#7c3aed' : '#94a3b8', size: 13, disabled: dis, icon: D.TWISTS[id].icon })) m.pick.twist = id;
      });
      UI.wrap(ctx, t(D.TWISTS[m.pick.twist].tip), W / 2, y + 300, w - 30, 13, '#4b5563');
      if (UI.button(ctx, 'hShoot', x + 30, y + h - 54, w - 60, 44, t('Set it!'), { color: '#22c55e', size: 20 })) {
        S.setTwist(m.pick.twist);
        m.phase = 'youSet'; S.clutch = false; S.windGoal = m.windy && m.pick.twist !== 'bounce' ? (Math.random() < 0.5 ? -1 : 1) * U.rand(0.4, 1.2) : 0;
        S.ready('player');
        banner(S, t('Set the shot!'));
      }
    }
    function checkEnd(S) {
      if (m.you < 5 && m.them < 5) return false;
      m.ended = true;
      var won = m.them >= 5;
      var first = won && level === 0, coins = 10, reward = null, newLevel = level;
      if (won) {
        newLevel = Math.min(3, level + 1);
        coins = level === 0 ? 100 : level === 1 ? 60 : level === 2 ? 120 : 20;
        save().rivals[rv.id] = newLevel;
        if (level === 2 && rv.reward && SS.save.grant('gear', rv.reward)) reward = D.item('gear', rv.reward);
        if (court.final && level === 0) save().champion = true;
      }
      SS.save.addCoins(coins);
      if (first) {
        var ci = D.COURTS.indexOf(court), nx = D.COURTS[ci + 1];
        if (nx && nx.built) UI.toast(t('New court unlocked: {n}!', { n: t(nx.name) }), '#16a34a');
      }
      if (reward) UI.toast(t('You earned {i}!', { i: t(reward.name) }), '#b45309');
      if (won && newLevel > level && level > 0) UI.toast(t('Respect up: {r}!', { r: t(D.RESPECT[newLevel]) }), '#7c3aed');
      function results() {
        if (won) S.celebrate(true);
        var finalWin = won && court.final && first;
        S.finish({
          title: finalWin ? t('CHAMPION!') : won ? t('You win!') : t('Good game!'), jingle: won ? 'win' : 'star',
          sub: '"' + t(won ? rv.lines.lose : rv.lines.win) + '"',
          avatar: { look: finalWin ? save().avatar : rv.look, pose: finalWin ? 'flex' : won ? 'clap' : 'wave' },
          lines: [t('You: {a}   {n}: {b}', { a: WORD.slice(0, m.you).join('') || '-', n: rv.short, b: WORD.slice(0, m.them).join('') || '-' }),
            t('Respect: {r}', { r: t(D.RESPECT[newLevel]) }) + '  ' + '★'.repeat(newLevel) + '☆'.repeat(3 - newLevel)].concat(reward ? [t('New gear: {i}', { i: t(reward.name) })] : []),
          coins: coins,
          buttons: [
            first && D.story && D.story(rv.id)
              // first win: the rival becomes a friend in a short comic chapter
              ? { label: t('Continue the story'), color: '#22c55e', icon: 'book', action: function () { SS.go('comic', { id: rv.id, next: court.final ? 'crew' : 'map', nextArg: court.final ? null : { court: courtId } }); } }
              : { label: won ? t('Back to Map') : t('Rematch'), color: '#22c55e', icon: won ? 'map' : 'retry', action: function () { if (won) SS.go('map', { court: courtId }); else SS.go('play', M.horse(courtId)); } },
            { label: won ? (newLevel < 3 ? t('Next level: {n}', { n: t(D.TIERS[Math.min(newLevel, 2)].name) }) : t('Friendly rematch')) : t('Back to Map'), color: won ? '#7c3aed' : '#64748b', icon: won ? 'retry' : 'back', action: function () { if (won) SS.go('play', M.horse(courtId)); else SS.go('map', { court: courtId }); } }
          ]
        });
      }
      function afterReplay() {
        if (won && court.final && first) { m.phase = 'finale'; m.finaleT = 0; A.roar(); A.jingle('win'); m.finaleDone = results; S.clutch = false; }
        else results();
      }
      // Game-winning shot? Show the player's last make again in slow motion.
      if (won && m.lastMake) S.startReplay({ frames: m.lastMake, label: t('GAME SHOT'), onDone: afterReplay });
      else afterReplay();
      return true;
    }
    // The Arena Final ceremony: all the rivals cheer, the trophy rises, confetti rains.
    function finale(ctx, S, W, H, dt) {
      var ft = m.finaleT;
      UI.blocker(ctx, Math.min(0.75, ft), 'finBlock');
      if (Math.random() < 0.5 && !SS.save.data.settings.reduced) S.burst({ x: Math.random() * W * (UI.k || 1), y: -10, s: 1 }, 2, ['#ffd23f', '#ff5a1f', '#5ef2ff', '#ff4d6d', '#7cff6b', '#ffffff'], 'confetti');
      var ty = H * 0.3 + (1 - U.easeOutBack(Math.min(1, ft * 0.8))) * H * 0.4;
      // glow and trophy
      var gr = ctx.createRadialGradient(W / 2, ty, 10, W / 2, ty, W * 0.5);
      gr.addColorStop(0, 'rgba(255,214,90,0.55)'); gr.addColorStop(1, 'rgba(255,214,90,0)');
      ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
      ctx.save(); ctx.translate(W / 2, ty); ctx.rotate(Math.sin(ft * 2) * 0.05);
      UI.icon(ctx, 'trophy', 0, 0, Math.min(150, W * 0.35), '#facc15');
      ctx.restore();
      UI.text(ctx, t('CHAMPION OF'), W / 2, H * 0.08 + UI.safe.t + 20, 22, '#fff', 'center', { stroke: '#111827', strokeW: 7 });
      UI.text(ctx, t('SWISH STREET!'), W / 2, H * 0.08 + UI.safe.t + 56, Math.min(44, W * 0.1), '#ffd23f', 'center', { stroke: '#111827', strokeW: 10, maxW: W - 30 });
      // every rival, clapping
      var ids = ['leo', 'priya', 'kofi', 'marina', 'dj', 'anya'], n = ids.length, sw = Math.min(70, (W - 20) / n);
      ids.forEach(function (id, i) {
        var px = W / 2 + (i - (n - 1) / 2) * sw, k2 = U.easeOutBack(U.clamp((ft - 0.6 - i * 0.12) * 3, 0, 1));
        if (k2 > 0) AV.draw(ctx, D.RIVALS[id].look, px, H * 0.74, sw * 1.35 * k2, { pose: 'clap', t: ft + i, shadow: false });
      });
      AV.draw(ctx, Object.assign({}, save().avatar, { gear: 'crown' }), W / 2, H * 0.6, Math.min(120, H * 0.16), { pose: 'pump', t: ft, shadow: false });
      if (ft > 2.2 && UI.button(ctx, 'finGo', W / 2 - 120, H - 90 - UI.safe.b, 240, 60, t('Claim the Crown!'), { color: '#f59e0b', icon: 'crown' })) {
        m.phase = 'done'; m.finaleT = null; m.finaleDone();
      }
    }
    function respectPips(ctx, x, y, lv) {
      for (var i = 0; i < 3; i++) UI.star(ctx, x, y - 30 + i * 30, 11, i < lv, '#a78bfa');
    }
    return m;
  };
  M.respectPips = function (ctx, x, y, lv, size, horizontal) {
    for (var i = 0; i < 3; i++) UI.star(ctx, horizontal ? x + (i - 1) * size * 2.2 : x, horizontal ? y : y - 30 + i * 30, size || 11, i < lv, '#a78bfa');
  };
})();
