// Swish Street - Team Up (v0.3). Unlocked by beating the Champion.
// Pick two beaten rivals as your crew. In crew relays they pass you the ball, and the
// crewmate who passed it gives that shot a perk (bigger glow, calmer wind, a rebound...).
//  * Relay Rush: 60 seconds of points.          * Twist Relay: 9 passes, each with the passer's trick.
//  * All-Star Game: your crew against the All-Stars (the Champion + two other rivals), first to 15.
(function () {
  'use strict';
  var SS = window.SS, U = SS.U, D = SS.D, UI = SS.ui, A = SS.audio, AV = SS.avatar, R = SS.render, P = SS.Phys, t = SS.t;
  var M = SS.modes, SC = SS.scenes;
  function save() { return SS.save.data; }
  var pt = { x: 0, y: 0, s: 0, z: 0 };

  SS.team = {
    unlocked: function () { return !!save().champion; },
    // beaten rivals can join the crew
    canJoin: function (id) { return SS.save.rivalLevel(id) > 0; }
  };

  // ---------- Relay modes ----------
  M.relay = function (kind) {
    var cfg = null; D.RELAYS.forEach(function (r) { if (r.id === kind) cfg = r; });
    var crew = save().crew.slice(0, 2);
    var stars = ['leo', 'priya', 'kofi', 'marina', 'dj', 'anya'].filter(function (id) { return crew.indexOf(id) < 0; }).slice(0, 2);
    var allStars = ['champ'].concat(stars);
    var SPOTS = ['close', 'top', 'lw', 'rw', 'lelb', 'relb', 'lb', 'rb', 'deep'];
    var m = {
      id: 'relay', env: kind === 'show' ? 'arena' : kind === 'twist' ? 'gym' : 'night', window: 0.04, fire: kind === 'rush',
      courtName: kind === 'show' ? 'The Arena Final' : null, music: kind === 'show' ? 'arena' : null,
      init: function (S) {
        m.n = 0; m.score = 0; m.them = 0; m.makes = 0; m.time = 60; m.ended = false; m.intro = 2.4; m.combo = 0;
        m.passer = crew[0]; m.passT = 0; m.rebound = false; m.turn = 'you'; m.round = 0;
        S.setSpot('top', true);
        m.cheerT = 0;
        nextPass(S, true);
      },
      canShoot: function () { return !m.ended && m.passT <= 0 && m.intro <= 0 && m.turn === 'you' && (kind !== 'rush' || m.time > 0); },
      aimMul: function () { return m.passer === 'priya' ? 0.5 : 1; },
      update: function (S, dt) {
        if (m.intro > 0) m.intro -= dt;
        if (m.passT > 0) { m.passT -= dt; if (m.passT <= 0 && m.turn === 'you') { S.ready('player'); } }
        if (m.cheerT > 0) m.cheerT -= dt;
        if (kind === 'rush' && m.intro <= 0 && !m.ended && m.time > 0) {
          m.time -= dt; S.clutch = m.time < 6 || m.passer === 'anya';
          if (m.time <= 0) { m.time = 0; A.buzzer(); if (S.state !== 'flight') end(S); }
        }
        // safety net: never leave the player waiting with the clock at zero
        if (kind === 'rush' && m.time <= 0 && !m.ended && (S.state === 'ready' || S.state === 'idle')) end(S);
      },
      onLaunch: function (S, shot) { if (shot.who === 'player') m.n++; },
      onResult: function (S, res) {
        if (res.who === 'rival') return allStarResult(S, res);
        var pts = 0;
        if (kind === 'twist') {
          if (res.twistOk) { m.makes++; pts = 1; S.pop(t('{n} / 9', { n: m.makes }), '#7cff6b', 0.5); }
          else if (res.made) S.pop(t('Needs the {t}!', { t: t(D.TWISTS[S.twist].name) }), '#ffffff', 0.44, 0.8);
        } else if (res.made) {
          m.combo++;
          pts = (res.swish || res.bank || res.deep ? 3 : 2) + (kind === 'rush' && m.combo >= 3 ? 1 : 0);
          if (kind === 'rush' && S.onFire) pts *= 2;
          if (m.passer === 'dj' && res.perfect) { pts += 1; S.pop(t('ON THE BEAT +1'), '#c084fc', 0.6, 0.8); }
          m.score += pts; m.makes++;
          S.pop('+' + pts, '#ffd23f', 0.5);
        } else m.combo = 0;
        if (res.made) { m.cheerT = 1.4; if (Math.random() < 0.5) S.mc(t(U.pick(D.MC.pass), { n: D.RIVALS[m.passer].short })); }
        // Marina's perk: grab the rebound and shoot again
        if (!res.made && m.passer === 'marina' && !m.rebound) {
          m.rebound = true;
          S.pop(t('REBOUND! Shoot again!'), '#5eead4', 0.4, 1);
          S.after(0.9, function () { if (m.ended) return; if (kind === 'rush' && m.time <= 0) return end(S); S.ready('player'); });
          return;
        }
        S.after(res.made ? 0.7 : 0.8, function () {
          if (m.ended) return;
          if (kind === 'rush' && m.time <= 0) return end(S);
          if (kind === 'show') { if (m.score >= 15) return end(S); return allStarTurn(S); }
          nextPass(S, false);
        });
      },
      drawFront: function (ctx, S, cam) { drawCrew(ctx, S, cam); },
      drawOver: function (ctx, S, cam) { if (m.passT > 0) drawPassBall(ctx, S, cam); },
      hud: function (ctx, S, W, H) { hud(ctx, S, W, H); },
      restart: function () { SS.go('play', M.relay(kind)); },
      quit: function () { SS.go('crew'); }
    };
    m.passes = 0;
    function nextPass(S, instant) {
      if (kind === 'twist' && m.passes >= 9) return end(S);
      m.passer = crew[m.passes % crew.length]; m.passes++; m.rebound = false; m.turn = 'you';
      var sp;
      if (kind === 'twist') {
        var tw = D.CREW_TWIST[m.passer] || 'normal', pool = SPOTS.filter(function (s) { return D.twistOkAt(tw, s); });
        sp = U.pick(pool); S.setSpot(sp, instant); S.setTwist(tw);
      } else {
        sp = S.spotId; var g = 0; while (sp === S.spotId && g++ < 10) sp = U.pick(SPOTS);
        S.setSpot(sp, instant); S.setTwist('normal');
      }
      // some passes come with a breeze, so Kofi's calm air matters
      S.windGoal = Math.random() < 0.4 && S.twist !== 'bounce' ? (Math.random() < 0.5 ? -1 : 1) * U.rand(0.6, 1.2) : 0;
      S.windMul = m.passer === 'kofi' ? 0.25 : 1;
      m.window = m.passer === 'leo' ? 0.058 : 0.04;
      m.dragMul = m.passer === 'anya' ? 1.15 : 1;
      if (kind !== 'rush') S.clutch = m.passer === 'anya';
      S.state = 'idle'; S.shooter = 'player'; S.tr = null;
      m.passT = instant ? 0.9 : 0.55; m.passDur = m.passT;
    }
    // the All-Stars answer back in the exhibition
    function allStarTurn(S) {
      m.turn = 'them'; m.round++;
      var id = allStars[(m.round - 1) % allStars.length], rv = D.RIVALS[id];
      S.rival = { look: rv.look }; m.opp = id;
      var sp = S.spotId, g = 0; while (sp === S.spotId && g++ < 10) sp = U.pick(SPOTS);
      S.setSpot(sp); S.setTwist('normal'); S.windGoal = 0; S.windMul = 1;
      S.rivalShoot({ skill: rv.skill * 1.15, aim: rv.aim * 1.1, twists: {} }, 1.1);
      if (Math.random() < 0.5) S.mc(t(U.pick(D.MC.allstar), { n: rv.short }));
    }
    function allStarResult(S, res) {
      if (res.made) { var p = res.swish || res.deep ? 3 : 2; m.them += p; S.pop(t('All-Stars +{n}', { n: p }), '#93c5fd', 0.5); }
      S.after(1.0, function () {
        if (m.ended) return;
        if (m.them >= 15 || m.round >= 30) return end(S);
        nextPass(S, false);
      });
    }
    function end(S) {
      if (m.ended) return; m.ended = true;
      var score = kind === 'twist' ? m.makes : kind === 'show' ? (m.score > m.them ? 1 : 0) : m.score;
      var st = 0;
      if (kind === 'show') { if (score) st = m.them < 6 ? 3 : m.them < 10 ? 2 : 1; }
      else cfg.stars.forEach(function (v, i) { if (score >= v) st = i + 1; });
      var best = save().relay[kind], isBest = kind === 'show' ? m.score - m.them > best : score > best;
      if (isBest) save().relay[kind] = kind === 'show' ? Math.max(0, m.score - m.them) : score;
      var newStars = st > save().relayStars[kind];
      if (newStars) save().relayStars[kind] = st;
      var coins = kind === 'rush' ? 10 + Math.floor(m.score / 2) : kind === 'twist' ? 10 + m.makes * 8 : score ? 80 : 15;
      SS.save.addCoins(coins);
      if (st) S.celebrate(true);
      var lines = kind === 'show' ? [t('Your crew {a} : {b} All-Stars', { a: m.score, b: m.them })]
        : kind === 'twist' ? [t('Made {a} of 9 trick passes', { a: m.makes })] : [t('Score: {n}', { n: m.score })];
      lines.push(t('Crew: {a} and {b}', { a: D.RIVALS[crew[0]].short, b: D.RIVALS[crew[1] || crew[0]].short }));
      S.finish({
        title: kind === 'show' ? (score ? t('ALL-STAR WIN!') : t('Good game!')) : st ? t('Crew power!') : t('Nice try!'), jingle: st ? 'win' : 'star',
        sub: kind === 'show' && !score ? t('The All-Stars got this one. Rematch?') : t(cfg.name),
        stars: st, starsMax: 3, lines: lines, coins: coins,
        buttons: [
          { label: t('Play Again'), color: '#22c55e', icon: 'retry', action: function () { SS.go('play', M.relay(kind)); } },
          { label: t('Crew HQ'), color: '#7c3aed', icon: 'crew', action: function () { SS.go('crew'); } }
        ]
      });
    }
    // crewmates stand beside you: the passer close by, the other one cheering further back
    function crewPos(S, i) {
      var sp = S.spotPos(S.spotId), wd = S.windDir || { x: 1, z: 0 }, side = i === 0 ? 1 : -1;
      // a little ahead of you (toward the hoop) and to the sides, so both stay in the picture
      var d = i === 0 ? 1.35 : 1.55, fwd = i === 0 ? 2.3 : 3.4;
      return { x: S.posGoal.x + wd.x * side * d - sp.ux * fwd, z: S.posGoal.z + wd.z * side * d - sp.uz * fwd };
    }
    function drawCrew(ctx, S, cam) {
      var pi = crew.indexOf(m.passer);
      // draw the farther crewmate first
      var order = [0, 1].filter(function (i) { return crew[i]; }).map(function (i) { var p = crewPos(S, i === pi ? 0 : 1); return { i: i, p: p, d: cam.depth(p.x, 1, p.z) }; });
      order.sort(function (a, b) { return b.d - a.d; });
      order.forEach(function (o) {
        if (!cam.project(o.p.x, 0, o.p.z, pt)) return;
        var passing = o.i === pi && m.passT > 0, pose = passing ? 'shoot' : m.cheerT > 0 ? 'clap' : (S.shooter === 'rival' ? 'idle' : 'idle');
        AV.draw(ctx, D.RIVALS[crew[o.i]].look, pt.x, pt.y, pt.s * AV.HEIGHT_M, { view: 'back', pose: pose, t: passing ? (m.passDur - m.passT) : S.time + o.i, shadow: true });
      });
    }
    function drawPassBall(ctx, S, cam) {
      var pi = crew.indexOf(m.passer), from = crewPos(S, 0), h = S.holdPoint(), k = U.clamp(1 - m.passT / m.passDur, 0, 1);
      if (pi < 0) return;
      var x = U.lerp(from.x, h.x, k), z = U.lerp(from.z, h.z, k), y = U.lerp(1.5, h.y, k) + Math.sin(k * Math.PI) * 0.5;
      if (!cam.project(x, y, z, pt)) return;
      AV.drawBall(ctx, pt.x, pt.y, pt.s * P.R_BALL, save().avatar.ball, k * 9);
    }
    function hud(ctx, S, W, H) {
      var y = UI.safe.t + 12;
      if (kind === 'show') {
        M.chip(ctx, W - 12 - UI.safe.r, y, t('ALL-STARS'), String(m.them), '#93c5fd', 'right');
        M.chip(ctx, W / 2, y, t('YOUR CREW'), String(m.score), '#ffd23f', 'center');
      } else if (kind === 'twist') {
        M.chip(ctx, W - 12 - UI.safe.r, y, t('MADE'), String(m.makes), '#7cff6b', 'right');
        M.chip(ctx, W / 2, y, t('PASS'), Math.min(m.passes, 9) + '/9', '#fff', 'center');
        if (S.twist !== 'normal') M.twistBadge(ctx, W / 2, y + 74, S.twist, S.time);
      } else {
        M.chip(ctx, W - 12 - UI.safe.r, y, t('SCORE'), String(m.score), '#ffd23f', 'right');
        M.chip(ctx, W / 2, y, t('TIME'), Math.ceil(m.time) + 's', m.time < 10 ? '#ff6b6b' : '#fff', 'center');
      }
      // who passed it, and their perk
      if (m.turn === 'you' && m.passer) {
        var pk = D.CREW[m.passer], w = Math.min(W - 24, 300), x = (W - w) / 2, yy = y + (kind === 'twist' && S.twist !== 'normal' ? 100 : 62);
        ctx.fillStyle = 'rgba(46,16,101,0.85)'; UI.rr(ctx, x, yy, w, 44, 22); ctx.fill();
        ctx.save(); ctx.beginPath(); ctx.arc(x + 22, yy + 22, 18, 0, 7); ctx.fillStyle = '#fde68a'; ctx.fill(); ctx.clip();
        AV.draw(ctx, D.RIVALS[m.passer].look, x + 22, yy + 22 + 56, 62, { pose: 'idle', t: 0, shadow: false }); ctx.restore();
        UI.text(ctx, t('{n}\'s pass', { n: D.RIVALS[m.passer].short }), x + 48, yy + 14, 11, '#ddd6fe', 'left', { maxW: w - 60 });
        UI.text(ctx, t(pk.perk) + (m.rebound && m.passer === 'marina' ? ' - ' + t('rebound!') : ''), x + 48, yy + 31, 15, '#fde68a', 'left', { maxW: w - 60 });
      } else if (m.turn === 'them' && m.opp) {
        UI.text(ctx, t('{n} shoots for the All-Stars', { n: D.RIVALS[m.opp].short }), W / 2, y + 80, 16, '#bfdbfe', 'center', { stroke: '#111827', strokeW: 5, maxW: W - 30 });
      }
      if (m.intro > 0) {
        var a = Math.min(1, m.intro * 2), iw = Math.min(W - 40, 420);
        ctx.globalAlpha = a;
        ctx.fillStyle = 'rgba(46,16,101,0.9)'; UI.rr(ctx, (W - iw) / 2, H * 0.32, iw, 100, 20); ctx.fill();
        UI.text(ctx, t(cfg.name), W / 2, H * 0.32 + 30, 26, '#fde68a', 'center', { maxW: iw - 30 });
        UI.wrap(ctx, t(cfg.desc), W / 2, H * 0.32 + 66, iw - 30, 15, '#fff');
        ctx.globalAlpha = 1;
      }
    }
    return m;
  };

  // ---------- Crew HQ ----------
  SC.crew = {
    id: 'crew', t: 0,
    enter: function () { SC.crew.t = 0; A.setMusic('menu', 'arena'); },
    draw: function (ctx, W, H, dt) {
      var s = SC.crew; s.t += dt;
      SC.drawCourtBg(ctx, W, H, dt, 'arena', 0.6);
      ctx.fillStyle = 'rgba(15,10,40,0.62)'; ctx.fillRect(0, 0, W, H);
      var x0 = 12 + UI.safe.l, w = W - 24 - UI.safe.l - UI.safe.r, top = UI.safe.t + 70;
      var crew = save().crew;
      UI.text(ctx, t('Pick 2 crewmates. Their passes give you perks!'), W / 2, top + 4, 14, '#fde68a', 'center', { maxW: w });
      var cols = W > 640 ? 6 : 3, rows = Math.ceil(D.CREW_IDS.length / cols), gap = 8;
      var cw = (w - gap * (cols - 1)) / cols, ch = Math.min(150, (H * 0.5 - 40) / rows);
      D.CREW_IDS.forEach(function (id, i) {
        var cx = x0 + (i % cols) * (cw + gap), cy = top + 20 + Math.floor(i / cols) * (ch + gap);
        var can = SS.team.canJoin(id), sel = crew.indexOf(id) >= 0, rv = D.RIVALS[id], pk = D.CREW[id];
        ctx.fillStyle = sel ? '#fde68a' : can ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.25)'; UI.rr(ctx, cx, cy, cw, ch, 14); ctx.fill();
        if (sel) { ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 4; UI.rr(ctx, cx, cy, cw, ch, 14); ctx.stroke(); }
        ctx.save(); UI.rr(ctx, cx, cy, cw, ch, 14); ctx.clip();
        AV.draw(ctx, rv.look, cx + cw / 2, cy + ch * 0.62, ch * 0.5, { pose: sel ? 'pump' : 'idle', t: s.t + i, shadow: false });
        ctx.restore();
        UI.text(ctx, rv.short, cx + cw / 2, cy + ch * 0.72, 14, '#111827', 'center', { maxW: cw - 8 });
        UI.text(ctx, can ? t(pk.perk) : t('Beat {n} first', { n: rv.short }), cx + cw / 2, cy + ch * 0.87, 11, can ? '#6d28d9' : '#e5e7eb', 'center', { maxW: cw - 8, weight: 800 });
        if (sel) UI.icon(ctx, 'check', cx + cw - 16, cy + 16, 18, '#16a34a');
        UI.region('cr_' + id, cx, cy, cw, ch);
        if (SS.a11y) SS.a11y.note('cr_' + id, rv.short + ': ' + (can ? t(pk.perk) + '. ' + t(pk.desc) + (sel ? ' ' + t('Selected') : '') : t('Beat {n} first', { n: rv.short })), cx, cy, cw, ch);
        if (UI.consume('cr_' + id)) {
          if (!can) UI.toast(t('Beat {n} on the Street Tour to recruit them!', { n: rv.short }), '#475569');
          else if (sel) { crew.splice(crew.indexOf(id), 1); SS.save.write(); }
          else { if (crew.length >= 2) crew.shift(); crew.push(id); SS.save.write(); UI.toast(t('{n}: {p}', { n: rv.short, p: t(pk.desc) }), '#6d28d9'); A.jingle('star'); }
        }
      });
      // relay challenges
      var ry = top + 28 + rows * (ch + gap), ready = crew.length === 2;
      var rh = Math.min(76, (H - ry - 20 - UI.safe.b) / 3 - 8);
      D.RELAYS.forEach(function (r, i) {
        var yy = ry + i * (rh + 8);
        ctx.fillStyle = 'rgba(255,248,236,0.95)'; UI.rr(ctx, x0, yy, w, rh, 16); ctx.fill();
        UI.text(ctx, t(r.name), x0 + 14, yy + rh * 0.3, 17, '#111827', 'left', { maxW: w - 150 });
        UI.text(ctx, t(r.desc), x0 + 14, yy + rh * 0.62, 11, '#4b5563', 'left', { maxW: w - 150, weight: 800 });
        for (var k = 0; k < 3; k++) UI.star(ctx, x0 + 22 + k * 20, yy + rh * 0.86, 7, k < save().relayStars[r.id]);
        if (UI.button(ctx, 'rl_' + r.id, x0 + w - 110, yy + rh / 2 - 21, 96, 42, t('Play'), { color: ready ? '#22c55e' : '#94a3b8', size: 17, icon: 'play', clickDisabled: true })) {
          if (ready) SS.go('play', M.relay(r.id)); else UI.toast(t('Pick 2 crewmates first!'), '#475569');
        }
      });
      var y = UI.safe.t + 12;
      if (UI.button(ctx, 'back', 14 + UI.safe.l, y, 52, 48, '', { icon: 'back', color: '#334155', size: 22, radius: 16 })) SS.go('title');
      UI.text(ctx, t('Team Up'), W / 2, y + 26, Math.min(28, W * 0.065), '#fff', 'center', { stroke: '#111827', strokeW: 7, maxW: W - 220 });
      UI.coins(ctx, W - 14 - UI.safe.r, y + 4, save().coins, 40);
    }
  };
})();
