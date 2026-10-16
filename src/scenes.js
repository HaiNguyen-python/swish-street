// Swish Street - menu scenes: Title, Street Tour map (+ court panel), Locker, Settings, Parental gate.
(function () {
  'use strict';
  var SS = window.SS, U = SS.U, D = SS.D, UI = SS.ui, A = SS.audio, AV = SS.avatar, R = SS.render, P = SS.Phys, t = SS.t;
  var SC = (SS.scenes = {});
  function save() { return SS.save.data; }

  // A shared "attract" court used behind menus.
  var bg = { cam: new SS.Camera(), world: P.makeWorld(), net: null, ball: P.makeBall(), env: 'night', time: 0 };
  function drawCourtBg(ctx, W, H, dt, env, orbit) {
    if (bg.env !== env || R.envId !== env || !bg.net) { bg.env = env; R.setEnv(env); bg.net = P.makeNet(bg.world); }
    bg.time += dt;
    R.tick(dt, null);
    var a = Math.sin(bg.time * 0.12) * 0.35 * (orbit == null ? 1 : orbit), c = bg.cam;
    c.F = Math.max(W, H) * 0.95; c.cx = W / 2; c.cy = H * 0.55;
    c.x = Math.sin(a) * 6.5; c.z = -Math.cos(a) * 6.5; c.y = 2.2; c.tx = 0; c.ty = 2.6; c.tz = 0; c.update();
    bg.ball.px = 99; bg.ball.py = -9;
    P.stepNet(bg.net, bg.world, bg.ball, dt, false);
    R.drawBackground(ctx, c, W, H, bg.time);
    R.drawCourt(ctx, c, bg.time);
    R.drawProps(ctx, c, bg.time, bg.world);
    if (SS.life) { SS.life.tick(dt, null); SS.life.drawBack(ctx, c, bg.time); }
    R.drawCrowd(ctx, c, bg.time, 0.15);
    if (SS.life) SS.life.drawFront(ctx, c, bg.time);
    R.drawHoopBack(ctx, c, bg.world, { time: bg.time });
    R.drawRimHalf(ctx, c, bg.world, bg.net, false);
    R.drawRimHalf(ctx, c, bg.world, bg.net, true);
    R.tint(ctx, W, H);
  }
  SC.drawCourtBg = drawCourtBg;

  function topBar(ctx, W, title, backTo) {
    var y = UI.safe.t + 12;
    var clicked = UI.button(ctx, 'back', 14 + UI.safe.l, y, 52, 48, '', { icon: 'back', color: '#334155', size: 22, radius: 16 });
    if (title) UI.text(ctx, title, W / 2, y + 26, Math.min(28, W * 0.065), '#fff', 'center', { stroke: '#111827', strokeW: 7, maxW: W - 220 });
    UI.coins(ctx, W - 14 - UI.safe.r, y + 4, save().coins, 40);
    return clicked;
  }

  // ---------- Title ----------
  SC.title = {
    id: 'title', t: 0,
    enter: function () { SC.title.t = 0; A.setMusic('menu'); SC.title.settings = false; },
    draw: function (ctx, W, H, dt) {
      var s = SC.title; s.t += dt;
      // the title shows the furthest court you have reached on the Street Tour
      var envT = 'night';
      D.COURTS.forEach(function (c, i) { if (i > 0 && SS.save.courtUnlocked(i)) envT = c.env; });
      drawCourtBg(ctx, W, H, dt, envT);
      ctx.fillStyle = 'rgba(8,10,35,0.35)'; ctx.fillRect(0, 0, W, H);
      var portrait = H >= W;
      // logo
      var ly = portrait ? H * 0.17 + UI.safe.t * 0.5 : H * 0.2, lx = portrait ? W / 2 : W * 0.3;
      var fs = Math.min(W * (portrait ? 0.19 : 0.1), 96), k = U.easeOutBack(Math.min(1, s.t * 1.6));
      ctx.save(); ctx.translate(lx, ly); ctx.rotate(-0.08); ctx.scale(k, k);
      var g = ctx.createLinearGradient(0, -fs, 0, fs * 0.6); g.addColorStop(0, '#ffe066'); g.addColorStop(1, '#ff5a1f');
      UI.text(ctx, t('SWISH'), 0, -fs * 0.45, fs, '#111827', 'center', { stroke: '#111827', strokeW: fs * 0.32 });
      UI.text(ctx, t('SWISH'), 0, -fs * 0.45, fs, g, 'center', { stroke: '#fff', strokeW: fs * 0.1 });
      var g2 = ctx.createLinearGradient(0, 0, 0, fs); g2.addColorStop(0, '#5ef2ff'); g2.addColorStop(1, '#3b82f6');
      UI.text(ctx, t('STREET'), fs * 0.12, fs * 0.45, fs * 0.82, '#111827', 'center', { stroke: '#111827', strokeW: fs * 0.3 });
      UI.text(ctx, t('STREET'), fs * 0.12, fs * 0.45, fs * 0.82, g2, 'center', { stroke: '#fff', strokeW: fs * 0.09 });
      // bouncing ball dot over the I
      var bb = Math.abs(Math.sin(s.t * 3)) * fs * 0.35;
      AV.drawBall(ctx, fs * 1.55, -fs * 0.9 - bb, fs * 0.2, save().avatar.ball, s.t * 4);
      ctx.restore();

      // avatar
      var ah = portrait ? Math.min(H * 0.26, 210) : H * 0.45;
      var ax = portrait ? W / 2 : W * 0.3, ay = portrait ? H * 0.32 + ah + UI.safe.t * 0.3 : H * 0.92;
      AV.draw(ctx, save().avatar, ax, ay, ah, { view: 'front', pose: 'dribble', t: s.t, ball: true, ballSkin: save().avatar.ball });
      UI.text(ctx, save().nick, ax, ay + 18, 16, '#fff', 'center', { stroke: '#111827', strokeW: 5 });
      if (save().champion) {
        var crx = portrait ? ax - ah * 0.42 : ax + ah * 0.42; // landscape: the badges sit on the left
        UI.icon(ctx, 'crown', crx, ay - ah * 0.92, 30, '#facc15');
        UI.text(ctx, t('CHAMPION'), crx, ay - ah * 0.92 + 24, 11, '#fde68a', 'center', { stroke: '#111827', strokeW: 4 });
      }
      // v0.4: the weekly Street Event and 2-player badges stand on either side of your baller
      if (save().tutorialDone) titleBadges(ctx, W, H, ax, ay, ah, portrait, s.t);

      // buttons
      var bw = Math.min(W - 60, 330), bx = portrait ? (W - bw) / 2 : W * 0.56, by = portrait ? ay + 44 : H * 0.12 + UI.safe.t;
      if (!portrait) bw = Math.min(W * 0.38, 330);
      var rowsH = save().tutorialDone ? 6.35 : 7.7;
      var bh = Math.min(66, (H - by - 24 - UI.safe.b) / rowsH), gap = bh * 0.22;
      if (!save().tutorialDone) {
        if (UI.button(ctx, 'tut', bx, by, bw, bh * 1.15, t('PLAY'), { color: '#22c55e', icon: 'play', sub: t('Learn to shoot in 30 seconds') })) SS.go('play', SS.modes.tutorial());
        by += bh * 1.15 + gap;
      }
      if (UI.button(ctx, 'tour', bx, by, bw, bh * 1.1, t('STREET TOUR'), { color: '#ff7a1a', icon: 'map' })) SS.go('map');
      by += bh * 1.1 + gap;
      var half = (bw - gap) / 2;
      if (UI.button(ctx, 'quick', bx, by, half, bh, t('QUICK'), { color: '#e11d48', icon: 'bolt', sub: save().quickBest ? t('Best {n}', { n: save().quickBest }) : t('60 seconds') })) SS.go('play', SS.modes.quick());
      var dailyNew = save().daily.date !== U.todayKey();
      if (UI.button(ctx, 'daily', bx + half + gap, by, half, bh, t('DAILY'), { color: '#7c3aed', icon: 'cal', sub: dailyNew ? t('New today!') : t('Best {n}', { n: save().daily.best }) })) SS.go('play', SS.modes.daily());
      by += bh + gap;
      if (UI.button(ctx, 'dunkfest', bx, by, half, bh, t('DUNK FEST'), { color: '#f59e0b', icon: 'dunk', sub: save().dunkBest ? t('Best {n}', { n: save().dunkBest }) : t('Slam it!') })) SS.go('play', SS.modes.dunk());
      if (UI.button(ctx, 'buzzer', bx + half + gap, by, half, bh, t('BUZZER'), { color: '#0d9488', icon: 'clock', sub: save().buzzerBest ? t('Best {n}/5', { n: save().buzzerBest }) : t('Half court!') })) SS.go('play', SS.modes.buzzer());
      by += bh + gap;
      var tc = SS.save.trickCount();
      if (UI.button(ctx, 'tricks', bx, by, half, bh, t('TRICK SHOTS'), { color: '#c026d3', icon: 'trick', sub: t('{n}/{m} found', { n: tc, m: D.TRICKS.length }) })) SS.go('tricks');
      var teamOn = SS.team && SS.team.unlocked();
      if (UI.button(ctx, 'team', bx + half + gap, by, half, bh, t('TEAM UP'), { color: teamOn ? '#4f46e5' : '#64748b', icon: teamOn ? 'crew' : 'lock', sub: teamOn ? t('Crew relays') : t('Beat the Champ') })) {
        if (teamOn) SS.go('crew'); else UI.toast(t('Beat the Champion in the Arena to unlock Team Up!'), '#475569');
      }
      by += bh + gap;
      if (UI.button(ctx, 'locker', bx, by, half, bh * 0.9, t('LOCKER'), { color: '#0891b2', icon: 'shirt' })) SS.go('locker');
      if (UI.button(ctx, 'howto', bx + half + gap, by, half, bh * 0.9, t('PRACTICE'), { color: '#475569', icon: 'ball', sub: t('Tutorial') })) SS.go('play', SS.modes.tutorial());

      UI.coins(ctx, W - 14 - UI.safe.r, UI.safe.t + 14, save().coins, 40);
      if (UI.button(ctx, 'settings', 14 + UI.safe.l, UI.safe.t + 12, 52, 48, '', { icon: 'gear', color: '#334155', size: 22, radius: 16 })) s.settings = true;
      // v0.5: the Trophy Room, with your career rank under the button
      if (save().tutorialDone && SS.career) {
        var rk = SS.career.rank(), tbx = 14 + UI.safe.l + 60;
        if (UI.button(ctx, 'trophies', tbx, UI.safe.t + 12, 52, 48, '', { icon: 'trophy', color: '#b45309', size: 22, radius: 16,
          aria: t('Trophy Room. Career rank: {r}', { r: t(rk.name) }) })) SS.go('trophies');
        UI.text(ctx, t(rk.name).toUpperCase(), tbx + 26, UI.safe.t + 74, 10, rk.color, 'center', { stroke: '#111827', strokeW: 4, maxW: 70 });
      }
      if (s.settings) SC.settingsModal(ctx, W, H, dt, function () { s.settings = false; });
    }
  };

  function titleBadges(ctx, W, H, ax, ay, ah, portrait, time) {
    var bs = Math.max(70, Math.min(92, ah * 0.5, W * 0.23)), gap = portrait ? Math.min(W / 2 - bs - 10 - UI.safe.l, ah * 0.42 + 26) : ah * 0.3 + 14;
    var by = ay - ah * 0.55 - bs / 2;
    var cur = SS.events.current(), ev = cur.ev, pr = SS.events.progress();
    var lx = ax - gap - bs, rx = ax + gap, bob = Math.sin(time * 3) * 3, ry = by;
    // landscape: the buttons fill the right side, so both badges stack on the left of the baller
    if (!portrait) { bs = Math.min(bs, (ah * 0.9 - 10) / 2); lx = Math.max(10 + UI.safe.l, ax - gap - bs); rx = lx; by = ay - ah * 0.95; ry = by + bs + 12; }
    var sub = pr.played ? (pr.tier ? t(D.TIER_NAMES[pr.tier - 1]) : t('{d} days left', { d: cur.daysLeft })) : t('NEW!');
    if (UI.button(ctx, 'event', lx, by + bob, bs, bs, '', { color: ev.color, radius: 22, aria: t('Street Event: {n}. {s}', { n: t(ev.name), s: sub }) })) SS.go('event');
    UI.icon(ctx, 'cal', lx + bs / 2, by + bob + bs * 0.32, bs * 0.32, '#fff');
    UI.text(ctx, t('EVENT'), lx + bs / 2, by + bob + bs * 0.62, bs * 0.17, '#fff', 'center', { maxW: bs - 8, stroke: 'rgba(0,0,0,0.3)', strokeW: 3, raw: true });
    UI.text(ctx, sub, lx + bs / 2, by + bob + bs * 0.82, bs * 0.13, '#fde68a', 'center', { maxW: bs - 8, raw: true });
    if (!pr.played) { ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(lx + bs - 6, by + bob + 6, 8, 0, 7); ctx.fill(); }
    if (UI.button(ctx, 'versus', rx, ry - bob, bs, bs, '', { color: '#0891b2', radius: 22, aria: t('2 Players: pass and play with a friend') })) SS.go('versus');
    UI.icon(ctx, 'crew', rx + bs / 2, ry - bob + bs * 0.32, bs * 0.36, '#fff');
    UI.text(ctx, t('2 PLAYERS'), rx + bs / 2, ry - bob + bs * 0.64, bs * 0.15, '#fff', 'center', { maxW: bs - 8, stroke: 'rgba(0,0,0,0.3)', strokeW: 3, raw: true });
    UI.text(ctx, t('Pass & play'), rx + bs / 2, ry - bob + bs * 0.83, bs * 0.13, '#cffafe', 'center', { maxW: bs - 8, raw: true });
  }

  // ---------- Settings + Parental gate ----------
  var gate = null;
  SC.settingsModal = function (ctx, W, H, dt, close) {
    if (UI.blocker(ctx, 0.6, 'setBlock')) { /* ignore taps outside */ }
    var w = Math.min(380, W - 32), h = Math.min(H - 20, 630), x = (W - w) / 2, y = Math.max(10, (H - h) / 2);
    UI.panel(ctx, x, y, w, h);
    UI.text(ctx, t('Settings'), W / 2, y + 34, 28, '#111827');
    var st = save().settings, rows = [['assist', t('Aim Assist')], ['sound', t('Sound effects')], ['music', t('Music')], ['reduced', t('Reduced effects')],
      ['lefty', t('Left-handed layout')], ['bigText', t('Larger text')]];
    var rowH = Math.min(58, (h - 280) / rows.length);
    rows.forEach(function (r, i) {
      var ry = y + 64 + i * rowH, bh = Math.min(46, rowH - 8);
      if (r[0] === 'assist') {
        // v0.4: Easy / Normal / Pro. Only this setting changes how shots fly.
        var as = D.ASSIST[st.assist] || D.ASSIST.normal;
        UI.text(ctx, r[1], x + 24, ry + bh / 2 - 6, 18, '#111827', 'left', { maxW: w - 160 });
        UI.text(ctx, t(as.desc), x + 24, ry + bh / 2 + 13, 11, '#6b7280', 'left', { maxW: w - 160, weight: 800 });
        if (UI.button(ctx, 'tg_assist', x + w - 122, ry, 98, bh, t(as.name), { color: as.id === 'easy' ? '#16a34a' : as.id === 'pro' ? '#7c3aed' : '#0891b2', size: 17,
          aria: t('Aim Assist: {a}. {d}', { a: t(as.name), d: t(as.desc) }) })) {
          st.assist = D.ASSIST_ORDER[(D.ASSIST_ORDER.indexOf(st.assist) + 1) % D.ASSIST_ORDER.length]; SS.save.write();
        }
        return;
      }
      UI.text(ctx, r[1], x + 24, ry + 22, 18, '#111827', 'left', { maxW: w - 150 });
      var on = st[r[0]];
      if (UI.button(ctx, 'tg_' + r[0], x + w - 112, ry, 88, bh, on ? t('ON') : t('OFF'), { color: on ? '#22c55e' : '#94a3b8', size: 18 })) {
        st[r[0]] = !on; SS.save.write(); A.applySettings();
      }
    });
    var ny = y + 64 + rows.length * rowH;
    UI.wrap(ctx, t('Swish Street has no ads, no chat and collects no data. It plays fully offline.'), W / 2, ny + 12, w - 50, 13, '#4b5563');
    if (UI.button(ctx, 'reset', x + 28, ny + 52, w - 56, 48, t('Reset progress'), { color: '#ef4444', size: 17, sub: t('Grown-ups only') })) {
      var n = 21 + Math.floor(Math.random() * 79);
      gate = { n: n, typed: '', confirm: false };
    }
    if (UI.button(ctx, 'closeSet', x + 28, y + h - 72, w - 56, 54, t('Done'), { color: '#3b82f6' })) close();
    UI.text(ctx, 'v' + SS.VERSION, x + w - 16, y + h - 12, 11, '#9ca3af', 'right');
    if (gate) drawGate(ctx, W, H);
  };
  var ONES = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
  var TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
  function words(n) { var tn = Math.floor(n / 10), o = n % 10; return TENS[tn] + (o ? '-' + ONES[o] : ''); }
  function drawGate(ctx, W, H) {
    UI.blocker(ctx, 0.7, 'gateBlock');
    var w = Math.min(360, W - 24), h = 470, x = (W - w) / 2, y = Math.max(10, (H - h) / 2);
    UI.panel(ctx, x, y, w, h, { color: '#f1f5f9' });
    if (!gate.confirm) {
      UI.text(ctx, t('Grown-ups only'), W / 2, y + 34, 24, '#111827');
      UI.text(ctx, t('Type this number with the keys:'), W / 2, y + 66, 15, '#374151', 'center', { maxW: w - 30 });
      UI.text(ctx, words(gate.n).toUpperCase(), W / 2, y + 96, 22, '#7c3aed', 'center', { maxW: w - 30 });
      ctx.fillStyle = '#fff'; UI.rr(ctx, W / 2 - 60, y + 116, 120, 44, 12); ctx.fill();
      UI.text(ctx, gate.typed || '_ _', W / 2, y + 139, 26, '#111827');
      var kw = (w - 60) / 3;
      for (var i = 0; i < 10; i++) {
        var d = (i + 1) % 10, col = i === 9 ? 1 : i % 3, row = i === 9 ? 3 : Math.floor(i / 3);
        if (UI.button(ctx, 'key' + d, x + 20 + col * (kw + 10), y + 172 + row * 58, kw, 48, String(d), { color: '#475569', size: 22 })) {
          gate.typed += d;
          if (gate.typed.length >= 2) {
            if (Number(gate.typed) === gate.n) gate.confirm = true;
            else { gate = null; UI.toast(t('That was not right. Ask a grown-up!'), '#475569'); return; }
          }
        }
      }
      if (UI.button(ctx, 'gateX', x + 20, y + h - 60, w - 40, 44, t('Cancel'), { color: '#94a3b8', size: 18 })) gate = null;
    } else {
      UI.text(ctx, t('Erase all progress?'), W / 2, y + 50, 24, '#111827');
      UI.wrap(ctx, t('Coins, stars, rivals and items will be reset. This cannot be undone.'), W / 2, y + 100, w - 40, 16, '#374151');
      if (UI.button(ctx, 'eraseYes', x + 24, y + 180, w - 48, 58, t('Erase everything'), { color: '#ef4444' })) {
        SS.save.reset(); gate = null; UI.toast(t('Progress reset'), '#ef4444'); A.applySettings();
      }
      if (UI.button(ctx, 'eraseNo', x + 24, y + 260, w - 48, 58, t('Keep my progress'), { color: '#22c55e' })) gate = null;
    }
  }

  // ---------- Street Tour map ----------
  SC.map = {
    id: 'map', t: 0, panel: null,
    enter: function (args) {
      SC.map.t = 0; A.setMusic('menu');
      SC.map.panel = args && args.court ? args.court : null;
      SC.map.panelT = 0; SC.map.stories = false;
    },
    draw: function (ctx, W, H, dt) {
      var s = SC.map; s.t += dt; s.panelT += dt;
      drawCity(ctx, W, H, s.t);
      var top = UI.safe.t + 72, bot = H - UI.safe.b - 20, left = 30 + UI.safe.l, right = W - 30 - UI.safe.r;
      // Node size follows the space we have, so small phones (iPhone SE) do not crowd (v0.3).
      var R0 = Math.min(46, W * 0.11, (bot - top) * 0.062), compact = R0 < 38;
      var spread = compact ? 1.3 : 1;
      function nodePos(c) {
        var x = 0.5 + (c.map.x - 0.5) * spread;
        var ny = (c.map.y - 0.08) / 0.76; // the map points span 0.08..0.84: use the full height
        return { x: left + x * (right - left), y: top + R0 + 34 + ny * (bot - top - R0 * 2 - (compact ? 64 : 92)) };
      }
      // path
      ctx.lineCap = 'round';
      for (var i = 0; i < D.COURTS.length - 1; i++) {
        var a = nodePos(D.COURTS[i]), b = nodePos(D.COURTS[i + 1]);
        var unlocked = SS.save.courtUnlocked(i + 1);
        ctx.strokeStyle = '#1f2937'; ctx.lineWidth = 16; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        ctx.strokeStyle = unlocked ? '#ffd23f' : 'rgba(255,255,255,0.5)'; ctx.lineWidth = 5; ctx.setLineDash([2, 14]);
        ctx.lineDashOffset = -s.t * 20;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.setLineDash([]);
      }
      var cur = 0;
      D.COURTS.forEach(function (c, i) { if (SS.save.courtUnlocked(i)) cur = i; });
      D.COURTS.forEach(function (c, i) {
        var p = nodePos(c), un = SS.save.courtUnlocked(i), r = R0;
        UI.region('court_' + c.id, p.x - r, p.y - r, r * 2, r * 2 + 30);
        var bob = un && i === cur ? Math.sin(s.t * 3) * 3 : 0;
        ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.arc(p.x, p.y + 6, r, 0, 7); ctx.fill();
        var col = !c.built ? '#64748b' : un ? envColor(c.env) : '#475569';
        ctx.fillStyle = col; ctx.beginPath(); ctx.arc(p.x, p.y + bob, r, 0, 7); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.stroke();
        // mini hoop icon
        if (un) {
          ctx.fillStyle = '#fff'; ctx.fillRect(p.x - r * 0.42, p.y + bob - r * 0.55, r * 0.84, r * 0.55);
          ctx.strokeStyle = '#ff5a1f'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(p.x, p.y + bob + r * 0.05, r * 0.3, r * 0.1, 0, 0, 7); ctx.stroke();
          ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.beginPath();
          ctx.moveTo(p.x - r * 0.28, p.y + bob + r * 0.08); ctx.lineTo(p.x - r * 0.15, p.y + bob + r * 0.45); ctx.lineTo(p.x + r * 0.15, p.y + bob + r * 0.45); ctx.lineTo(p.x + r * 0.28, p.y + bob + r * 0.08); ctx.stroke();
        } else UI.icon(ctx, 'lock', p.x, p.y, r * 0.8, 'rgba(255,255,255,0.85)');
        // label
        UI.text(ctx, t(c.name), p.x, p.y + r + (compact ? 11 : 16), compact ? 12 : 14, '#fff', 'center', { stroke: '#111827', strokeW: compact ? 4 : 5, maxW: compact ? Math.min(W * 0.46, r * 4.2) : r * 3.2 });
        if (c.built && un) {
          var st = SS.save.courtStars(c.id), ss = compact ? 7 : 9;
          for (var k = 0; k < 3; k++) UI.star(ctx, p.x + (k - 1) * ss * 2, p.y - r - (compact ? 3 : 6) + bob, ss, st[k]);
          var lv = SS.save.rivalLevel(c.rival);
          if (lv) {
            UI.icon(ctx, lv >= 3 ? 'crown' : 'trophy', p.x + r * 0.85, p.y + r * 0.6, compact ? 16 : 20, lv >= 3 ? '#facc15' : '#ffd23f');
            // respect pips sit inside the node on small screens
            if (compact) SS.modes.respectPips(ctx, p.x, p.y + bob + r * 0.68, lv, 4, true);
            else SS.modes.respectPips(ctx, p.x, p.y + r + 32, lv, 6, true);
          }
        } else if (!c.built) {
          UI.text(ctx, t('SOON'), p.x, p.y - r - 6, 12, '#cbd5e1', 'center', { stroke: '#111827', strokeW: 4 });
        }
        if (un && i === cur) {
          // player marker
          var side = compact && c.map.x > 0.5 ? -1 : 1;
          AV.draw(ctx, save().avatar, p.x + side * r * 1.05, p.y + r * 0.4, r * (compact ? 1.2 : 1.4), { pose: 'idle', t: s.t, shadow: false });
        }
        if (UI.consume('court_' + c.id)) {
          if (!c.built) UI.toast(t('{n} is coming soon!', { n: t(c.name) }), '#475569');
          else if (!un) UI.toast(t('Beat {r} to unlock!', { r: D.RIVALS[D.COURTS[i - 1].rival].short }), '#475569');
          else { s.panel = c.id; s.panelT = 0; }
        }
      });
      if (topBar(ctx, W, t('Street Tour'))) SS.go('title');
      // stars total
      var sx0 = 84 + UI.safe.l;
      UI.star(ctx, sx0, UI.safe.t + 90, 11, true);
      var maxStars = D.COURTS.filter(function (c) { return c.built; }).length * 3;
      UI.text(ctx, SS.save.totalStars() + '/' + maxStars, sx0 + 15, UI.safe.t + 91, 15, '#fff', 'left', { stroke: '#111827', strokeW: 5 });
      // story: the intro comic plays on your first visit; chapters can be re-read any time
      if (!SS.save.sawStory('intro') && D.story) SS.go('comic', { id: 'intro', next: 'map' });
      if (UI.button(ctx, 'story', 14 + UI.safe.l, UI.safe.t + 68, 52, 44, '', { icon: 'book', color: '#b45309', size: 22, radius: 14, aria: t('Story chapters') })) s.stories = true;
      if (s.panel) courtPanel(ctx, W, H, D.courtById(s.panel), s.panelT, dt);
      if (s.stories) storyList(ctx, W, H, s);
    }
  };
  function storyList(ctx, W, H, s) {
    if (UI.blocker(ctx, 0.6, 'stBlock')) { s.stories = false; return; }
    var seen = D.STORY.filter(function (c) { return SS.save.sawStory(c.id); });
    var w = Math.min(380, W - 30), rh = Math.min(50, (H - 200) / D.STORY.length), h = 110 + D.STORY.length * rh, x = (W - w) / 2, y = Math.max(10, (H - h) / 2);
    UI.region('stInner', x, y, w, h);
    UI.panel(ctx, x, y, w, h);
    UI.text(ctx, t('Story chapters'), W / 2, y + 30, 22, '#111827');
    D.STORY.forEach(function (c, i) {
      var ok = seen.indexOf(c) >= 0;
      if (UI.button(ctx, 'st_' + c.id, x + 20, y + 54 + i * rh, w - 40, rh - 8, ok ? t(c.title) : t('Locked chapter'), { color: ok ? '#f59e0b' : '#94a3b8', size: 14, disabled: !ok, icon: ok ? 'book' : 'lock' })) {
        s.stories = false; SS.go('comic', { id: c.id, next: 'map' });
      }
    });
    if (UI.button(ctx, 'stClose', x + 20, y + h - 50, w - 40, 40, t('Close'), { color: '#64748b', size: 16 })) s.stories = false;
  }
  function envColor(env) { return { park: '#22c55e', gym: '#3b82f6', roof: '#f97316', beach: '#eab308', subway: '#a855f7', snow: '#38bdf8', arena: '#ef4444' }[env] || '#64748b'; }

  var cityCache = null, cityKey = '';
  function drawCity(ctx, W, H, time) {
    var ps = Math.min(2, R.pixelScale || 1);
    var key = W + 'x' + H + '@' + ps;
    if (key !== cityKey) {
      cityKey = key;
      cityCache = document.createElement('canvas'); cityCache.width = Math.ceil(W * ps); cityCache.height = Math.ceil(H * ps);
      var c = cityCache.getContext('2d'), r = U.rng(42);
      c.scale(ps, ps);
      c.fillStyle = '#8fd16a'; c.fillRect(0, 0, W, H);
      // river along the top
      c.fillStyle = '#4fb3f6'; c.beginPath(); c.moveTo(0, H * 0.14);
      for (var x = 0; x <= W; x += 20) c.lineTo(x, H * 0.14 + Math.sin(x * 0.02) * 14);
      c.lineTo(W, H * 0.22); for (x = W; x >= 0; x -= 20) c.lineTo(x, H * 0.22 + Math.sin(x * 0.02 + 1) * 14); c.closePath(); c.fill();
      // streets grid
      var bs = Math.max(70, Math.min(W, H) / 5);
      c.fillStyle = '#4b5563';
      for (var gy = H * 0.26; gy < H; gy += bs) c.fillRect(0, gy, W, 14);
      for (var gx = bs * 0.4; gx < W; gx += bs) c.fillRect(gx, H * 0.24, 14, H);
      // blocks with buildings
      for (gy = H * 0.26 + 14; gy < H; gy += bs) {
        for (gx = bs * 0.4 + 14; gx < W; gx += bs) {
          var kind = r();
          if (kind < 0.2) { c.fillStyle = '#6cc04a'; c.fillRect(gx + 4, gy + 4, bs - 22, bs - 22); c.fillStyle = '#3f9a2f'; for (var k = 0; k < 4; k++) { c.beginPath(); c.arc(gx + 12 + r() * (bs - 40), gy + 12 + r() * (bs - 40), 8, 0, 7); c.fill(); } }
          else {
            for (var b = 0; b < 4; b++) {
              var bw = (bs - 26) / 2, bx = gx + 4 + (b % 2) * (bw + 4), by = gy + 4 + Math.floor(b / 2) * (bw + 4);
              c.fillStyle = r.pick(['#f4a261', '#e76f51', '#e9c46a', '#a8dadc', '#cdb4db', '#ffafcc', '#bde0fe']);
              c.fillRect(bx, by, bw, bw);
              c.fillStyle = 'rgba(0,0,0,0.15)'; c.fillRect(bx, by + bw - 5, bw, 5);
            }
          }
        }
      }
      // crosswalk dashes
      c.fillStyle = 'rgba(255,255,255,0.5)';
      for (gy = H * 0.26; gy < H; gy += bs) for (x = 0; x < W; x += 26) c.fillRect(x, gy + 6, 12, 2);
      // darken a bit for contrast
      c.fillStyle = 'rgba(15,23,42,0.18)'; c.fillRect(0, 0, W, H);
    }
    ctx.drawImage(cityCache, 0, 0, W, H);
  }

  function courtPanel(ctx, W, H, court, pt, dt) {
    if (UI.blocker(ctx, 0.55, 'cpBlock')) { SC.map.panel = null; return; }
    var w = Math.min(440, W - 20), h = Math.min(H - 40 - UI.safe.t - UI.safe.b, 600), x = (W - w) / 2, y = (H - h) / 2 + (1 - U.easeOutCubic(pt * 4)) * 60;
    UI.region('cpInner', x, y, w, h);
    UI.panel(ctx, x, y, w, h);
    // header band
    ctx.save(); UI.rr(ctx, x, y, w, 74, 24); ctx.clip();
    ctx.fillStyle = envColor(court.env); ctx.fillRect(x, y, w, 74); ctx.restore();
    UI.text(ctx, t(court.name), W / 2, y + 30, 24, '#fff', 'center', { stroke: '#111827', strokeW: 6, maxW: w - 80 });
    UI.text(ctx, t(court.blurb), W / 2, y + 56, 14, '#fff', 'center', { maxW: w - 80, weight: 800 });
    if (UI.button(ctx, 'cpClose', x + w - 52, y + 12, 40, 40, '', { icon: 'close', color: '#334155', size: 18, radius: 14 })) { SC.map.panel = null; return; }
    var st = SS.save.courtStars(court.id);
    var rowH = Math.min(92, (h - 74 - 170) / 3), cy = y + 86;
    court.challenges.forEach(function (ch, i) {
      ctx.fillStyle = i % 2 ? '#fdecd2' : '#fff3df'; UI.rr(ctx, x + 12, cy, w - 24, rowH - 8, 16); ctx.fill();
      UI.star(ctx, x + 40, cy + (rowH - 8) / 2, 16, st[i]);
      UI.text(ctx, t(ch.name), x + 66, cy + 22, 18, '#111827', 'left', { maxW: w - 200 });
      UI.wrap(ctx, t(ch.desc), x + 66, cy + 46, w - 190, 13, '#4b5563', 'left', 16);
      if (UI.button(ctx, 'ch' + i, x + w - 112, cy + (rowH - 8) / 2 - 22, 90, 44, st[i] ? t('Replay') : t('Play'), { color: st[i] ? '#3b82f6' : '#22c55e', size: 17 })) {
        SS.go('play', SS.modes.challenge(court.id, i));
      }
      cy += rowH;
    });
    // rival card
    var rv = D.RIVALS[court.rival], unlocked = SS.save.rivalUnlocked(court.id), lv = SS.save.rivalLevel(rv.id), beaten = lv > 0;
    var ry = cy + 4, rh = y + h - ry - 14;
    ctx.fillStyle = court.final ? '#3b2405' : '#2e1065'; UI.rr(ctx, x + 12, ry, w - 24, rh, 18); ctx.fill();
    ctx.save(); UI.rr(ctx, x + 12, ry, w - 24, rh, 18); ctx.clip();
    AV.draw(ctx, rv.look, x + 70, ry + rh + 12, rh * 0.95, { pose: beaten ? 'clap' : 'idle', t: SC.map.t, shadow: false });
    if (!unlocked) { ctx.fillStyle = 'rgba(46,16,101,0.6)'; ctx.fillRect(x + 12, ry, 120, rh); }
    ctx.restore();
    UI.text(ctx, court.final ? t('FINAL BOSS') : t('RIVAL'), x + 130, ry + 20, 12, '#c4b5fd', 'left');
    // respect meter
    UI.text(ctx, t(D.RESPECT[lv]), x + w - 26, ry + 20, 11, '#ddd6fe', 'right');
    SS.modes.respectPips(ctx, x + w - 46, ry + 38, lv, 7, true);
    UI.text(ctx, rv.name, x + 130, ry + 46, 17, '#fff', 'left', { maxW: w - 160 });
    UI.text(ctx, t(rv.tagline), x + 130, ry + 68, 12, '#ddd6fe', 'left', { maxW: w - 160, weight: 800 });
    var rwd = rv.reward && D.item('gear', rv.reward);
    if (rwd && lv < 3 && rh > 150) UI.text(ctx, t('Legend reward: {i}', { i: t(rwd.name) }), x + 130, ry + 88, 11, '#fde68a', 'left', { maxW: w - 160 });
    var bl = lv === 0 ? t('Play H-O-R-S-E') : lv < 3 ? t('Rematch: {n}', { n: t(D.TIERS[Math.min(lv, 2)].name) }) : t('Friendly game');
    if (unlocked) {
      if (UI.button(ctx, 'horse', x + 130, ry + rh - 60, w - 160, 46, bl, { color: beaten ? '#7c3aed' : '#f59e0b', size: 17, icon: beaten ? 'trophy' : 'ball' })) SS.go('play', SS.modes.horse(court.id));
    } else {
      UI.icon(ctx, 'lock', x + 146, ry + rh - 36, 22, '#c4b5fd');
      UI.text(ctx, t('Earn 2 stars to unlock'), x + 164, ry + rh - 35, 14, '#ddd6fe', 'left', { maxW: w - 190 });
    }
  }

  // ---------- Locker ----------
  var TABS = [
    { id: 'skin', name: 'Skin' }, { id: 'hair', name: 'Hair' }, { id: 'hairColor', name: 'Color' }, { id: 'jersey', name: 'Jersey' },
    { id: 'number', name: 'Number' }, { id: 'shoes', name: 'Shoes' }, { id: 'ball', name: 'Ball' }, { id: 'gear', name: 'Gear' }, { id: 'celebration', name: 'Moves' },
    { id: 'trail', name: 'Trail' }
  ];
  SC.locker = {
    id: 'locker', t: 0, tab: 'hair', confirm: null,
    enter: function () { SC.locker.t = 0; SC.locker.confirm = null; SC.locker.combo = null; A.setMusic('menu'); },
    draw: function (ctx, W, H, dt) {
      var s = SC.locker; s.t += dt;
      var g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1e1b4b'); g.addColorStop(1, '#0e7490');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      // lockers in the background
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      for (var lx = 0; lx < W; lx += 60) { ctx.fillRect(lx + 4, 0, 52, H * 0.42); ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(lx + 12, 20, 36, 4); ctx.fillRect(lx + 12, 30, 36, 4); ctx.fillStyle = 'rgba(255,255,255,0.05)'; }
      var portrait = H >= W * 1.1;
      var top = UI.safe.t + 70;
      var prevH = portrait ? Math.min(H * 0.3, 250) : H - top - 30;
      var px = portrait ? W / 2 : W * 0.22, py = top + prevH;
      var a = save().avatar;
      var pose = s.tab === 'celebration' ? (save().combo.on ? 'signature' : a.celebration) : 'idle';
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(px, py - 4, prevH * 0.3, prevH * 0.06, 0, 0, 7); ctx.fill();
      AV.draw(ctx, a, px, py - 6, prevH * (portrait ? 0.68 : 0.78), { pose: pose, t: s.t, view: 'front', ball: s.tab === 'ball', ballSkin: a.ball });
      // nickname
      var ny = portrait ? top + 4 : py + 2;
      if (!portrait) ny = H - 60 - UI.safe.b;
      UI.font(ctx, 18); var nw = ctx.measureText(save().nick).width + 70;
      if (UI.button(ctx, 'nick', px - nw / 2, ny, nw, 40, save().nick, { color: '#334155', size: 16, icon: 'dice' })) {
        save().nick = U.pick(D.NICK_A) + ' ' + U.pick(D.NICK_B); SS.save.write();
      }
      // panel area
      var ax = portrait ? 10 + UI.safe.l : W * 0.44, aw = portrait ? W - 20 - UI.safe.l - UI.safe.r : W * 0.56 - 14 - UI.safe.r;
      var ay = portrait ? py + 14 : top, ah = H - ay - 12 - UI.safe.b;
      // tabs (2 rows of 5)
      var tw = (aw - 4 * 6) / 5, th = 40;
      TABS.forEach(function (tb, i) {
        var tx = ax + (i % 5) * (tw + 6), ty = ay + Math.floor(i / 5) * (th + 6);
        if (UI.button(ctx, 'tab_' + tb.id, tx, ty, tw, th, t(tb.name), { color: s.tab === tb.id ? '#ff7a1a' : '#475569', size: 14, radius: 12 })) s.tab = tb.id;
      });
      var gy = ay + 2 * (th + 6) + 6, gh = ah - (gy - ay);
      if (s.tab === 'celebration') {
        // v0.4: chain three moves into a signature combo
        var on = save().combo.on;
        if (UI.button(ctx, 'comboEdit', ax, gy, aw, 48, t('My Signature Combo'), { color: '#a855f7', icon: 'star4', size: 16, sub: on ? t('ON: plays after big shots') : t('OFF: tap to build one') })) { s.combo = { t: 0 }; A.click(); }
        gy += 58; gh -= 58;
      }
      drawItems(ctx, s, ax, gy, aw, gh);
      if (topBar(ctx, W, t('Locker'))) SS.go('title');
      if (s.confirm) drawBuy(ctx, W, H, s);
      if (s.combo) SS.celebCombo.drawEditor(ctx, W, H, s.combo, dt, function () { s.combo = null; });
    }
  };
  function itemsFor(tab) {
    if (tab === 'skin') return D.SKINS.map(function (c, i) { return { id: i, name: '', cost: 0, color: c }; });
    if (tab === 'hairColor') return D.HAIR_COLORS.map(function (c, i) { return { id: i, name: '', cost: 0, color: c }; });
    if (tab === 'number') return null;
    return D.ITEMS[tab];
  }
  function drawItems(ctx, s, x, y, w, h) {
    var a = save().avatar, tab = s.tab;
    ctx.fillStyle = 'rgba(15,23,42,0.5)'; UI.rr(ctx, x, y, w, h, 18); ctx.fill();
    if (tab === 'number') {
      UI.text(ctx, '#' + a.number, x + w / 2, y + h * 0.4, Math.min(90, h * 0.35), '#fff', 'center', { stroke: '#111827', strokeW: 10 });
      var bw = Math.min(90, w * 0.25);
      if (UI.button(ctx, 'numDn', x + w / 2 - bw - 70, y + h * 0.4 - 30, bw, 60, '-', { color: '#475569', size: 34 })) { a.number = (a.number + 99) % 100; SS.save.write(); }
      if (UI.button(ctx, 'numUp', x + w / 2 + 70, y + h * 0.4 - 30, bw, 60, '+', { color: '#475569', size: 34 })) { a.number = (a.number + 1) % 100; SS.save.write(); }
      return;
    }
    var items = itemsFor(tab), cols = w > 420 || items.length > 12 ? (items.length > 12 && w > 420 ? 5 : 4) : 3, rows = Math.ceil(items.length / cols);
    var gap = 8, cw = (w - gap * (cols + 1)) / cols, ch = Math.min(110, (h - gap * (rows + 1)) / rows);
    items.forEach(function (it, i) {
      var cx = x + gap + (i % cols) * (cw + gap), cy = y + gap + Math.floor(i / cols) * (ch + gap);
      var equipped = a[tab] === it.id, owned = tab === 'skin' || tab === 'hairColor' || SS.save.owns(tab, it.id);
      ctx.fillStyle = equipped ? '#fff3df' : owned ? '#e2e8f0' : '#94a3b8';
      UI.rr(ctx, cx, cy, cw, ch, 14); ctx.fill();
      if (equipped) { ctx.strokeStyle = '#ff7a1a'; ctx.lineWidth = 4; UI.rr(ctx, cx, cy, cw, ch, 14); ctx.stroke(); }
      UI.region('it_' + tab + '_' + i, cx, cy, cw, ch);
      var mx = cx + cw / 2, my = cy + ch * 0.42, ms = Math.min(cw, ch) * 0.32;
      drawSwatch(ctx, tab, it, mx, my, ms, s.t);
      if (it.name) UI.text(ctx, t(it.name), mx, cy + ch - (owned ? 13 : 30), 12, '#111827', 'center', { maxW: cw - 8, weight: 800 });
      if (!owned && (it.reward || it.court || it.tricks || it.event)) {
        UI.icon(ctx, 'lock', mx - 22, cy + ch - 12, 12, '#4c1d95');
        var why = it.reward ? t('Beat {n} x3', { n: D.RIVALS[it.reward].short }) : it.court ? t('3 stars: {c}', { c: t(D.courtById(it.court).name) })
          : it.event ? t('Event gold') : t('{n} tricks', { n: it.tricks });
        UI.text(ctx, why, mx + 6, cy + ch - 11, 11, '#4c1d95', 'center', { maxW: cw - 34 });
      } else if (!owned) {
        UI.coinIcon(ctx, mx - 16, cy + ch - 12, 8);
        UI.text(ctx, String(it.cost), mx - 4, cy + ch - 11, 14, save().coins >= it.cost ? '#111827' : '#7f1d1d', 'left');
      }
      if (UI.consume('it_' + tab + '_' + i)) {
        if (owned) { a[tab] = it.id; SS.save.write(); A.click(); }
        else if (it.reward) UI.toast(t('Reach Legend respect with {n} to earn this!', { n: D.RIVALS[it.reward].short }), '#6d28d9');
        else if (it.court) UI.toast(t('Get all 3 stars at {c} to earn this jersey!', { c: t(D.courtById(it.court).name) }), '#6d28d9');
        else if (it.tricks) UI.toast(t('Find {n} trick shots in the Trick Shot Hall to unlock!', { n: it.tricks }), '#6d28d9');
        else if (it.event) {
          var evd = null; D.EVENTS.forEach(function (e) { if (e.id === it.event) evd = e; });
          UI.toast(t('Win GOLD in the {e} Street Event!', { e: t(evd ? evd.name : 'Street') }), '#6d28d9');
        }
        else if (save().coins >= it.cost) s.confirm = { tab: tab, it: it };
        else UI.toast(t('Need {n} more coins. Keep playing!', { n: it.cost - save().coins }), '#475569');
      }
    });
  }
  function drawSwatch(ctx, tab, it, x, y, r, time) {
    if (tab === 'skin' || tab === 'hairColor') {
      ctx.fillStyle = it.color; ctx.beginPath(); ctx.arc(x, y + 6, r, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 2; ctx.stroke(); return;
    }
    if (tab === 'ball') { AV.drawBall(ctx, x, y, r, it.id, time); return; }
    if (tab === 'trail') {
      if (it.id !== 'none') {
        ctx.lineCap = 'round';
        for (var k = 0; k < 8; k++) {
          var f = k / 8, px = x - r * 1.3 + f * r * 2.2, py = y + r * 0.6 - Math.sin(f * 2.6) * r * 0.9;
          ctx.globalAlpha = 0.2 + f * 0.7;
          ctx.fillStyle = it.id === 'rainbow' ? 'hsl(' + (k * 45) + ',95%,60%)' : k % 2 ? it.c1 : it.c2;
          ctx.beginPath(); ctx.arc(px, py, r * (0.12 + f * 0.22), 0, 7); ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      AV.drawBall(ctx, x + r * 1.0, y - r * 0.35, r * 0.45, save().avatar.ball, time); return;
    }
    var look = JSON.parse(JSON.stringify(save().avatar));
    if (tab === 'hair') look.hair = it.id;
    if (tab === 'jersey') look.jersey = it.id;
    if (tab === 'gear') {
      look.gear = it.id;
      if (it.kind === 'wrist') { AV.draw(ctx, look, x, y + r * 1.7, r * 2.7, { pose: 'flex', t: 1, shadow: false }); return; }
      ctx.save(); ctx.beginPath(); ctx.rect(x - r * 1.5, y - r * 1.6, r * 3, r * 2.8); ctx.clip();
      AV.draw(ctx, look, x, y + r * 3.6, r * 4, { pose: 'idle', t: 0, shadow: false }); ctx.restore(); return;
    }
    if (tab === 'shoes') { ctx.fillStyle = it.c1; ctx.beginPath(); ctx.ellipse(x, y + 4, r * 1.1, r * 0.6, 0, 0, 7); ctx.fill(); ctx.fillStyle = it.c2; ctx.fillRect(x - r * 1.0, y + r * 0.2, r * 2, r * 0.25); return; }
    if (tab === 'celebration') { AV.draw(ctx, look, x, y + r * 1.4, r * 2.4, { pose: it.id, t: time, shadow: false }); return; }
    if (tab === 'hair') {
      ctx.save(); ctx.beginPath(); ctx.rect(x - r * 1.5, y - r * 1.6, r * 3, r * 2.8); ctx.clip();
      AV.draw(ctx, look, x, y + r * 3.6, r * 4, { pose: 'idle', t: 0, shadow: false }); ctx.restore(); return;
    }
    AV.draw(ctx, look, x, y + r * 1.7, r * 2.7, { pose: 'idle', t: 0, shadow: false });
  }
  function drawBuy(ctx, W, H, s) {
    if (UI.blocker(ctx, 0.6, 'buyBlock')) { s.confirm = null; return; }
    var c = s.confirm, w = Math.min(340, W - 30), h = 250, x = (W - w) / 2, y = (H - h) / 2;
    UI.region('buyInner', x, y, w, h);
    UI.panel(ctx, x, y, w, h);
    UI.text(ctx, t('Get {n}?', { n: t(c.it.name) }), W / 2, y + 40, 22, '#111827', 'center', { maxW: w - 30 });
    UI.coinIcon(ctx, W / 2 - 30, y + 86, 16);
    UI.text(ctx, String(c.it.cost), W / 2 - 8, y + 87, 28, '#b45309', 'left');
    UI.text(ctx, t('You have {n} coins', { n: save().coins }), W / 2, y + 122, 14, '#4b5563');
    if (UI.button(ctx, 'buyYes', x + 20, y + h - 76, (w - 50) / 2, 56, t('Yes!'), { color: '#22c55e' })) {
      if (SS.save.buy(c.tab, c.it.id)) { save().avatar[c.tab] = c.it.id; SS.save.write(); A.jingle('star'); UI.toast(t('Unlocked {n}!', { n: t(c.it.name) }), '#16a34a'); }
      s.confirm = null;
    }
    if (UI.button(ctx, 'buyNo', x + 30 + (w - 50) / 2, y + h - 76, (w - 50) / 2, 56, t('Not now'), { color: '#94a3b8' })) s.confirm = null;
  }
})();
