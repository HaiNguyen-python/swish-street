// Swish Street - pass-and-play 2 players (v0.4). Fully offline, one device, no accounts.
//  * SS.scenes.versus: setup. Player 1 is your baller; Player 2 builds a look from presets
//    (no typing). Each player picks their own Aim Assist, so a younger sibling can play on Easy.
//  * SS.modes.versus(): H-O-R-S-E (set a shot, your friend must match it) or Shootout
//    (three racks of five, the last ball of each rack is a golden money ball worth 2).
// A "pass the phone" card appears before every turn, so nobody shoots by accident.
// Player 2 never changes the owner's stats or Trick Shot Hall.
(function () {
  'use strict';
  var SS = window.SS, U = SS.U, D = SS.D, UI = SS.ui, A = SS.audio, AV = SS.avatar, R = SS.render, t = SS.t;
  var M = SS.modes, SC = SS.scenes;
  function save() { return SS.save.data; }
  var WORD = ['H', 'O', 'R', 'S', 'E'];
  var RACKS = ['lw', 'top', 'rw'], RACK_BALLS = 5;
  var WORLD = D.WORLD_SPOTS;
  var P_COL = ['#ff7a1a', '#22d3ee'];

  var VS = (SS.versus = {});
  // Player 2's look: a preset, with their own skin tone and hair if they picked one
  VS.friendLook = function () {
    var f = save().friend, base = D.FRIENDS[f.preset] || D.FRIENDS[0], look = Object.assign({}, base.look);
    if (f.skin >= 0) look.skin = f.skin;
    if (f.hair) look.hair = f.hair;
    look.trail = 'none';
    return look;
  };
  VS.courts = function () {
    var out = [{ id: 'night', name: 'Midnight Court', env: 'night' }];
    D.COURTS.forEach(function (c, i) { if (SS.save.courtUnlocked(i)) out.push({ id: c.id, name: c.name, env: c.env }); });
    return out;
  };
  function courtInfo(id) { var l = VS.courts(); for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i]; return l[0]; }

  // ---------- Setup scene ----------
  SC.versus = {
    id: 'versus', t: 0,
    enter: function () { SC.versus.t = 0; A.setMusic('menu'); if (!courtInfo(save().vs.court) || courtInfo(save().vs.court).id !== save().vs.court) save().vs.court = 'night'; },
    draw: function (ctx, W, H, dt) {
      var s = SC.versus; s.t += dt;
      var vs = save().vs, ci = courtInfo(vs.court);
      SC.drawCourtBg(ctx, W, H, dt, ci.env);
      ctx.fillStyle = 'rgba(8,10,35,0.55)'; ctx.fillRect(0, 0, W, H);
      var top = UI.safe.t + 66, bot = H - UI.safe.b - 12, x0 = 12 + UI.safe.l, w = W - 24 - UI.safe.l - UI.safe.r;
      UI.text(ctx, t('Pass the phone after every turn!'), W / 2, top + 4, 14, '#fde68a', 'center', { maxW: w });
      // player cards (landscape iPad: cards on the left, choices on the right)
      var wide = W > H * 1.15, lw = wide ? w * 0.56 : w;
      var cardH = wide ? bot - top - 22 : U.clamp(bot - top - 290, 230, 380), cw = (lw - 10) / 2, cy = top + 22;
      card(ctx, x0, cy, cw, cardH, 0, s.t);
      card(ctx, x0 + cw + 10, cy, cw, cardH, 1, s.t);
      var cx0 = wide ? x0 + lw + 14 : x0, cwid = wide ? w - lw - 14 : w, ccx = cx0 + cwid / 2;
      var y = wide ? cy : cy + cardH + 14, gw = (cwid - 10) / 2;
      // game type (v0.5: three games)
      var g3 = (cwid - 16) / 3;
      D.VS_GAME_ORDER.forEach(function (g, i) {
        var lab = g === 'world' ? t('Around') : t(D.VS_GAMES[g].name), sub = g === 'world' ? t('the World') : g === 'horse' ? t('Copy cat') : t('Money balls');
        if (UI.button(ctx, 'vsg_' + g, cx0 + i * (g3 + 8), y, g3, 52, lab, { color: vs.game === g ? '#7c3aed' : '#475569', size: 16, sub: sub,
          aria: t(D.VS_GAMES[g].name) + (vs.game === g ? ', ' + t('selected') : '') })) { vs.game = g; SS.save.write(); }
      });
      y += 64;
      y += UI.wrap(ctx, t(D.VS_GAMES[vs.game].desc), ccx, y + 6, cwid - 20, 13, '#e0e7ff') + 8;
      // court picker
      var cl = VS.courts(), idx = Math.max(0, cl.map(function (c) { return c.id; }).indexOf(vs.court));
      if (UI.button(ctx, 'vsCL', cx0, y, 48, 46, '<', { color: '#334155', size: 20, aria: t('Previous court') })) { vs.court = cl[(idx + cl.length - 1) % cl.length].id; SS.save.write(); }
      if (UI.button(ctx, 'vsCR', cx0 + cwid - 48, y, 48, 46, '>', { color: '#334155', size: 20, aria: t('Next court') })) { vs.court = cl[(idx + 1) % cl.length].id; SS.save.write(); }
      ctx.fillStyle = 'rgba(15,23,42,0.75)'; UI.rr(ctx, cx0 + 56, y, cwid - 112, 46, 16); ctx.fill();
      UI.text(ctx, t('COURT'), ccx, y + 13, 10, 'rgba(255,255,255,0.7)');
      UI.text(ctx, t(ci.name), ccx, y + 31, 17, '#fff', 'center', { maxW: cwid - 130 });
      y += 58;
      if (wide) y = Math.max(y, bot - 66);
      var ph = Math.max(52, Math.min(66, bot - y));
      if (UI.button(ctx, 'vsGo', cx0 + (wide ? 0 : 20), y, cwid - (wide ? 0 : 40), ph, t('PLAY!'), { color: '#22c55e', icon: 'play', size: 24 })) SS.go('play', M.versus());
      if (topBarV(ctx, W, t('2 Players'))) SS.go('title');
    }
  };
  function topBarV(ctx, W, title) {
    var y = UI.safe.t + 12;
    var c = UI.button(ctx, 'back', 14 + UI.safe.l, y, 52, 48, '', { icon: 'back', color: '#334155', size: 22, radius: 16 });
    UI.text(ctx, title, W / 2, y + 26, Math.min(28, W * 0.065), '#fff', 'center', { stroke: '#111827', strokeW: 7, maxW: W - 150 });
    return c;
  }
  function assistBtn(ctx, id, x, y, w, cur, onPick) {
    var as = D.ASSIST[cur];
    if (UI.button(ctx, id, x, y, w, 40, t('Aim: {a}', { a: t(as.name) }), { color: cur === 'easy' ? '#16a34a' : cur === 'pro' ? '#7c3aed' : '#0891b2', size: 14, aria: t('Aim Assist: {a}. {d}', { a: t(as.name), d: t(as.desc) }) })) {
      onPick(D.ASSIST_ORDER[(D.ASSIST_ORDER.indexOf(cur) + 1) % D.ASSIST_ORDER.length]);
    }
  }
  function card(ctx, x, y, w, h, i, time) {
    var vs = save().vs, f = save().friend;
    ctx.fillStyle = 'rgba(15,23,42,0.82)'; UI.rr(ctx, x, y, w, h, 20); ctx.fill();
    ctx.strokeStyle = P_COL[i]; ctx.lineWidth = 3; UI.rr(ctx, x, y, w, h, 20); ctx.stroke();
    UI.text(ctx, i ? t('PLAYER 2') : t('PLAYER 1'), x + w / 2, y + 18, 14, P_COL[i]);
    var look = i ? VS.friendLook() : save().avatar;
    // laid out from the bottom up: aim button, look buttons, name, then the baller fills the rest
    var ny = y + h - 138, feet = ny - 4, ah = Math.min(feet - y - 34, w * 0.95);
    ctx.save(); UI.rr(ctx, x, y, w, h, 20); ctx.clip();
    AV.draw(ctx, look, x + w / 2, feet, ah * 0.95, { pose: 'idle', t: time + i, view: 'front' });
    ctx.restore();
    if (i === 0) {
      UI.text(ctx, save().nick, x + w / 2, ny + 24, 15, '#fff', 'center', { maxW: w - 16 });
      UI.text(ctx, t('Your baller'), x + w / 2, ny + 46, 11, '#cbd5e1', 'center', { maxW: w - 16 });
    } else {
      UI.font(ctx, 14);
      if (UI.button(ctx, 'vsNick', x + 8, ny, w - 16, 34, f.nick, { color: '#334155', size: 13, icon: 'dice', aria: t('New name for Player 2: {n}', { n: f.nick }) })) {
        f.nick = U.pick(D.NICK_A) + ' ' + U.pick(D.NICK_B); SS.save.write();
      }
      // look controls: preset, skin and hair
      var by = ny + 42, bw = (w - 16 - 8) / 3;
      if (UI.button(ctx, 'vsP2L', x + 8, by - 0, bw, 34, t('Look'), { color: '#475569', size: 12, aria: t('Change Player 2 look') })) { f.preset = (f.preset + 1) % D.FRIENDS.length; f.skin = -1; f.hair = ''; SS.save.write(); }
      if (UI.button(ctx, 'vsP2S', x + 8 + bw + 4, by, bw, 34, t('Skin'), { color: '#475569', size: 12, aria: t('Change Player 2 skin tone') })) { var cs = f.skin >= 0 ? f.skin : (D.FRIENDS[f.preset].look.skin); f.skin = (cs + 1) % D.SKINS.length; SS.save.write(); }
      if (UI.button(ctx, 'vsP2H', x + 8 + (bw + 4) * 2, by, bw, 34, t('Hair'), { color: '#475569', size: 12, aria: t('Change Player 2 hair') })) {
        var ch = f.hair || D.FRIENDS[f.preset].look.hair, hi = D.FREE_HAIR.indexOf(ch); f.hair = D.FREE_HAIR[(hi + 1) % D.FREE_HAIR.length]; SS.save.write();
      }
    }
    assistBtn(ctx, 'vsA' + i, x + 8, y + h - 48, w - 16, i ? vs.a2 : vs.a1, function (n) { if (i) vs.a2 = n; else vs.a1 = n; SS.save.write(); });
  }

  // ---------- The match ----------
  M.versus = function () {
    var vs = save().vs, game = vs.game, ci = courtInfo(vs.court), court = D.courtById(ci.id);
    var windy = !!(R.ENVS[ci.env] && R.ENVS[ci.env].wind);
    var pl = [
      { look: save().avatar, nick: save().nick, assist: vs.a1, letters: 0, score: 0, makes: 0 },
      { look: VS.friendLook(), nick: save().friend.nick, assist: vs.a2, letters: 0, score: 0, makes: 0 }
    ];
    var m = {
      id: 'versus', env: ci.env, window: 0.04, courtName: court ? court.name : 'Midnight Court', fire: false,
      init: function (S) {
        m.cur = 0; m.setter = 0; m.phase = 'start'; m.hand = null; m.ended = false; m.ban = null;
        m.rack = 0; m.ball = 0; m.sd = 0; m.sdRes = [null, null]; m.pick = { spot: 'top', twist: 'normal' };
        m.coins = 0;
        S.setSpot(game === 'shoot' ? RACKS[0] : 'top', true);
        S.ready('player');
        if (game === 'horse') handoff(S, 0, t('Set a shot for {n} to copy!', { n: pl[1].nick }), function () { startPick(S); });
        else if (game === 'world') {
          // the same wind at each spot for both players
          m.spotWind = WORLD.map(function () { return windy ? (Math.random() < 0.5 ? -1 : 1) * U.rand(0.3, 0.9) : 0; });
          pl.forEach(function (p) { p.spot = 0; p.shots = 0; p.done = false; });
          S.setSpot(WORLD[0], true);
          handoff(S, 0, worldText(0), function () { startWorld(S); });
        } else { m.rackWind = RACKS.map(function () { return windy ? (Math.random() < 0.5 ? -1 : 1) * U.rand(0.4, 1.0) : 0; }); handoff(S, 0, rackText(), function () { startRack(S); }); }
      },
      playerLook: function () { return pl[m.cur].look; },
      guest: function () { return m.cur === 1; },
      assistFor: function () { return pl[m.cur].assist; },
      nickNow: function () { return pl[m.cur].nick; },
      ballSkin: function () { return game === 'shoot' && m.phase === 'rack' && m.ball === RACK_BALLS - 1 ? 'gold' : null; },
      canShoot: function () { return !m.hand && !m.ended && (m.phase === 'set' || m.phase === 'match' || m.phase === 'rack' || m.phase === 'sd' || m.phase === 'world'); },
      update: function (S, dt) { if (m.ban) { m.ban.t += dt; if (m.ban.t > 1.8) m.ban = null; } if (m.hand) m.hand.t += dt; },
      onResult: function (S, res) {
        if (game === 'horse') horseResult(S, res);
        else if (game === 'world' && m.phase !== 'sd') worldResult(S, res);
        else shootResult(S, res);
      },
      hud: function (ctx, S, W, H) { hud(ctx, S, W, H); },
      overlay: function (ctx, S, W, H) {
        if (m.phase === 'pick' && !m.hand) picker(ctx, S, W, H);
        if (m.hand) handCard(ctx, S, W, H);
      },
      restart: function () { SS.go('play', M.versus()); },
      quit: function () { SS.go('versus'); }
    };
    function other(i) { return 1 - i; }
    function banner(text, col) { m.ban = { text: text, t: 0, c: col || '#fff' }; }
    function handoff(S, who, sub, then) {
      m.cur = who; m.hand = { who: who, sub: sub, then: then, t: 0 };
      S.ready('player'); S.drag = null;
      if (SS.a11y) SS.a11y.say(t('Pass to {n}! {s}', { n: pl[who].nick, s: sub }));
    }
    // ----- H-O-R-S-E -----
    function startPick(S) {
      m.phase = 'pick'; m.cur = m.setter; S.clutch = false;
      m.pick.spot = D.HORSE_SPOTS.indexOf(S.spotId) >= 0 ? S.spotId : 'top';
      if (!D.twistOkAt(m.pick.twist, m.pick.spot)) m.pick.twist = 'normal';
      S.setSpot(m.pick.spot); S.setTwist('normal'); S.windGoal = 0; S.ready('player');
    }
    function horseResult(S, res) {
      var me = m.cur, them = other(me);
      if (res.made) pl[me].makes++;
      if (m.phase === 'set') {
        if (res.twistOk) {
          banner(t('Nice! Now {n} must match it!', { n: pl[them].nick }), '#7cff6b');
          S.after(1.5, function () {
            handoff(S, them, t('Match it: {s}{w}', { s: t(D.SPOTS[S.spotId].name), w: S.twist !== 'normal' ? ', ' + t(D.TWISTS[S.twist].name) : '' }), function () {
              m.phase = 'match'; S.clutch = pl[them].letters === 4; S.ready('player');
            });
          });
        } else {
          banner(t('Missed! {n} sets next.', { n: pl[them].nick }), '#ffffff');
          S.after(1.4, function () { nextRound(S); });
        }
      } else if (m.phase === 'match') {
        if (!res.twistOk) {
          pl[me].letters++; A.jingle('letter');
          S.pop(t('{n} gets {l}!', { n: pl[me].nick, l: WORD[pl[me].letters - 1] }), '#ff6b6b', 0.36, 1.0);
        } else banner(t('Matched it!'), '#7cff6b');
        S.after(1.5, function () { if (!checkHorse(S)) nextRound(S); });
      }
    }
    function nextRound(S) {
      // house rule: the setter swaps every round, so nobody waits too long
      m.setter = other(m.setter);
      handoff(S, m.setter, t('Your call! Set a shot.'), function () { startPick(S); });
    }
    function checkHorse(S) {
      for (var i = 0; i < 2; i++) if (pl[i].letters >= 5) { finish(S, other(i)); return true; }
      return false;
    }
    function picker(ctx, S, W, H) {
      var w = Math.min(420, W - 20), h = 372, x = (W - w) / 2, y = H - h - 12 - UI.safe.b;
      UI.panel(ctx, x, y, w, h, { color: 'rgba(255,248,236,0.97)' });
      UI.text(ctx, t('{n}: pick a spot', { n: pl[m.cur].nick }), W / 2, y + 26, 20, '#111827', 'center', { maxW: w - 30 });
      var cx = W / 2, cy = y + 46, sc = Math.min((w - 60) / 13, 112 / 6.2);
      var sx = Math.min(sc * 1.5, (w / 2 - 16) / 6.6);
      ctx.fillStyle = '#e2e8f0'; ctx.beginPath(); ctx.ellipse(cx, cy, 6.6 * sx, 6.6 * sc, 0, 0, Math.PI); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fecaca'; ctx.fillRect(cx - 2.45 * sx, cy, 4.9 * sx, 4.2 * sc);
      ctx.fillStyle = '#ff5a1f'; ctx.beginPath(); ctx.arc(cx, cy + 4, 6, 0, 7); ctx.fill();
      D.HORSE_SPOTS.forEach(function (id) {
        var sp = D.SPOTS[id], a = sp.a * U.deg, px = cx + Math.sin(a) * sp.d * sx, py = cy + Math.cos(a) * sp.d * sc + 4;
        var sel = m.pick.spot === id;
        UI.region('vspot_' + id, px - 22, py - 22, 44, 44);
        if (SS.a11y) SS.a11y.note('vspot_' + id, t(sp.name), px - 22, py - 22, 44, 44);
        ctx.fillStyle = sel ? P_COL[m.cur] : '#334155'; ctx.beginPath(); ctx.arc(px, py, sel ? 17 : 14, 0, 7); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke();
        if (UI.consume('vspot_' + id)) {
          m.pick.spot = id; S.setSpot(id);
          if (!D.twistOkAt(m.pick.twist, id)) m.pick.twist = 'normal';
        }
      });
      UI.text(ctx, t(D.SPOTS[m.pick.spot].name), W / 2, y + 182, 16, '#7c2d12');
      var tw = D.TWIST_ORDER, bw4 = (w - 28 - 18) / 4, bh = 40;
      tw.forEach(function (id, i) {
        var row = i < 4 ? 0 : 1, col = row ? i - 4 : i, bw = row ? (w - 28 - 12) / 3 : bw4;
        var dis = !D.twistOkAt(id, m.pick.spot), sel = m.pick.twist === id;
        if (UI.button(ctx, 'vtw_' + id, x + 14 + col * (bw + 6), y + 196 + row * (bh + 8), bw, bh, t(D.TWISTS[id].short),
          { color: sel ? '#7c3aed' : '#94a3b8', size: 13, disabled: dis, icon: D.TWISTS[id].icon })) m.pick.twist = id;
      });
      UI.wrap(ctx, t(D.TWISTS[m.pick.twist].tip), W / 2, y + 300, w - 30, 13, '#4b5563');
      if (UI.button(ctx, 'vSet', x + 30, y + h - 54, w - 60, 44, t('Set it!'), { color: '#22c55e', size: 20 })) {
        S.setTwist(m.pick.twist);
        m.phase = 'set'; S.clutch = false;
        S.windGoal = windy && m.pick.twist !== 'bounce' ? (Math.random() < 0.5 ? -1 : 1) * U.rand(0.4, 1.2) : 0;
        S.ready('player');
        banner(t('Set the shot!'));
      }
    }
    // ----- Shootout -----
    function rackText() {
      return m.phase === 'sd' ? t('Sudden death! {s}.', { s: t(D.SPOTS[sdSpot()].name) }) : t('Rack {r} of {n}: {s}', { r: m.rack + 1, n: RACKS.length, s: t(D.SPOTS[RACKS[m.rack]].name) });
    }
    // v0.5: every tied sudden-death round moves one step further out, so it always ends
    var SD_SPOTS = ['top', 'deep', 'ldeep', 'rdeep', 'half'];
    function sdSpot() { return SD_SPOTS[Math.min(m.sd || 0, SD_SPOTS.length - 1)]; }
    function startRack(S) {
      m.phase = 'rack'; m.ball = 0;
      S.setSpot(RACKS[m.rack]); S.setTwist('normal'); S.windGoal = m.rackWind[m.rack]; S.ready('player');
    }
    function shootResult(S, res) {
      var me = m.cur, p = pl[me];
      if (m.phase === 'sd') {
        m.sdRes[me] = !!res.made;
        if (res.made) { p.makes++; S.pop(t('Made it!'), '#7cff6b', 0.5); }
        S.after(1.2, function () {
          if (me === 0) return handoff(S, 1, rackText(), function () { m.phase = 'sd'; S.ready('player'); });
          if (m.sdRes[0] !== m.sdRes[1]) return finish(S, m.sdRes[0] ? 0 : 1);
          m.sd++; m.sdRes = [null, null]; S.setSpot(sdSpot());
          handoff(S, 0, t('Still tied! One step further back: {s}.', { s: t(D.SPOTS[sdSpot()].name) }), function () { m.phase = 'sd'; S.ready('player'); });
        });
        return;
      }
      var money = m.ball === RACK_BALLS - 1;
      if (res.made) {
        var pts = money ? 2 : 1; p.score += pts; p.makes++;
        S.pop('+' + pts + (money ? '  ' + t('MONEY BALL!') : ''), money ? '#facc15' : '#ffd23f', 0.5, money ? 1.1 : 1);
      }
      m.ball++;
      S.after(res.made ? 0.6 : 0.75, function () {
        if (m.ball < RACK_BALLS) { S.ready('player'); return; }
        // rack done: next player, or the next rack
        if (me === 0) return handoff(S, 1, rackText(), function () { startRack(S); });
        m.rack++;
        if (m.rack < RACKS.length) return handoff(S, 0, rackText(), function () { startRack(S); });
        if (pl[0].score !== pl[1].score) return finish(S, pl[0].score > pl[1].score ? 0 : 1);
        m.phase = 'sd'; S.setSpot('top'); S.windGoal = 0;
        handoff(S, 0, rackText(), function () { m.phase = 'sd'; S.ready('player'); });
      });
    }
    // ----- Around the World (v0.5) -----
    // Make it and you move on to the next spot and shoot again. Miss and the phone passes.
    // Player 1 always starts, so when Player 1 finishes first, Player 2 gets one last turn to
    // catch up (same number of turns). Both round? A sudden-death tie-breaker from the top.
    function worldText(who) {
      var p = pl[who];
      if (p.spot === 0 && !p.shots) return t('Start at the {s}. Make it to move on!', { s: t(D.SPOTS[WORLD[0]].name) });
      return t('Spot {n} of {m}: {s}', { n: p.spot + 1, m: WORLD.length, s: t(D.SPOTS[WORLD[p.spot]].name) });
    }
    function startWorld(S) {
      var p = pl[m.cur];
      m.phase = 'world';
      S.setSpot(WORLD[p.spot]); S.setTwist('normal'); S.windGoal = m.spotWind[p.spot]; S.ready('player');
    }
    function worldResult(S, res) {
      var me = m.cur, them = other(me), p = pl[me];
      p.shots++;
      if (res.made) {
        p.makes++; p.spot++;
        if (p.spot >= WORLD.length) {
          p.done = true; p.spot = WORLD.length;
          if (me === 0) SS.save.data.career.world = Math.min(99999, SS.save.data.career.world + 1);
          banner(t('{n} went all the way round!', { n: p.nick }), '#facc15');
          A.jingle('star'); S.celebrate(true);
          S.after(1.6, function () {
            if (pl[them].done) return tieBreak(S);
            if (me === 0) return handoff(S, 1, t('Last chance! Finish the trip to tie it up!'), function () { startWorld(S); });
            finish(S, 1);
          });
          return;
        }
        S.pop(t('Next: {s}!', { s: t(D.SPOTS[WORLD[p.spot]].name) }), '#7cff6b', 0.5, 0.9);
        // keep shooting from the next spot
        S.after(0.8, function () { startWorld(S); });
        return;
      }
      banner(t('Missed! Pass to {n}.', { n: pl[them].nick }), '#ffffff');
      S.after(1.3, function () {
        if (pl[them].done) return finish(S, them);        // Player 1 finished, Player 2 missed the last chance
        handoff(S, them, worldText(them), function () { startWorld(S); });
      });
    }
    function tieBreak(S) {
      banner(t('Both made it round! Tie-breaker!'), '#facc15');
      m.phase = 'sd'; m.sd = 0; m.sdRes = [null, null]; S.setSpot('top'); S.windGoal = 0;
      handoff(S, 0, rackText(), function () { m.phase = 'sd'; S.ready('player'); });
    }
    // ----- End -----
    function finish(S, win) {
      if (m.ended) return; m.ended = true; m.phase = 'done'; m.cur = win;
      vs.played++;
      var coins = 10; SS.save.addCoins(coins);
      S.celebrate(true); A.roar();
      var wl = pl[win], pose = win === 0 ? SS.celebCombo.myPose() : (wl.look.celebration || 'pump');
      var lines = game === 'horse'
        ? [t('{a}: {x}', { a: pl[0].nick, x: WORD.slice(0, pl[0].letters).join('') || '-' }), t('{a}: {x}', { a: pl[1].nick, x: WORD.slice(0, pl[1].letters).join('') || '-' })]
        : game === 'world'
          ? pl.map(function (p) { return t('{a}: {x}/{m} spots in {s} shots', { a: p.nick, x: Math.min(p.spot, WORLD.length), m: WORLD.length, s: p.shots }); })
          : [t('{a}: {x} pts', { a: pl[0].nick, x: pl[0].score }), t('{a}: {x} pts', { a: pl[1].nick, x: pl[1].score })];
      S.finish({
        title: t('{n} WINS!', { n: wl.nick }), titleColor: P_COL[win], jingle: 'win',
        sub: t('Good game, both of you! High five!'),
        avatar: { look: wl.look, pose: pose }, lines: lines, coins: coins,
        buttons: [
          { label: t('Rematch'), color: '#22c55e', icon: 'retry', action: function () { SS.go('play', M.versus()); } },
          { label: t('Change setup'), color: '#7c3aed', icon: 'crew', action: function () { SS.go('versus'); } },
          { label: t('Home'), color: '#64748b', icon: 'back', action: function () { SS.go('title'); } }
        ]
      });
    }
    // ----- Drawing -----
    function face(ctx, look, x, y, r) {
      ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fillStyle = '#fde68a'; ctx.fill(); ctx.clip();
      AV.draw(ctx, look, x, y + r * 2.95, r * 3.2, { pose: 'idle', t: 0, shadow: false });
      ctx.restore();
    }
    function hud(ctx, S, W, H) {
      var y = UI.safe.t + 12, xr = W - 12 - UI.safe.r, rowW = Math.min(250, W - 90 - UI.safe.l - UI.safe.r);
      for (var i = 0; i < 2; i++) {
        var yy = y + i * 42, on = m.cur === i && !m.ended, x = xr - rowW;
        ctx.fillStyle = on ? 'rgba(15,23,42,0.88)' : 'rgba(15,23,42,0.6)'; UI.rr(ctx, x, yy, rowW, 36, 14); ctx.fill();
        if (on) { ctx.strokeStyle = P_COL[i]; ctx.lineWidth = 2.5; UI.rr(ctx, x, yy, rowW, 36, 14); ctx.stroke(); }
        face(ctx, pl[i].look, x + 18, yy + 18, 13);
        if (game === 'horse') {
          var bw = 22, gap = 3, total = 5 * (bw + gap);
          UI.text(ctx, pl[i].nick, x + 36, yy + 18, 12, P_COL[i], 'left', { maxW: rowW - total - 46 });
          for (var k = 0; k < 5; k++) {
            var bx = xr - 6 - total + k * (bw + gap);
            ctx.fillStyle = k < pl[i].letters ? '#ef4444' : 'rgba(255,255,255,0.12)'; UI.rr(ctx, bx, yy + 6, bw, 24, 6); ctx.fill();
            UI.text(ctx, WORD[k], bx + bw / 2, yy + 18, 14, k < pl[i].letters ? '#fff' : 'rgba(255,255,255,0.35)');
          }
        } else if (game === 'world') {
          // seven pips: the spots you have cleared
          var pw = 13, pg = 3, ptot = WORLD.length * (pw + pg);
          UI.text(ctx, pl[i].nick, x + 36, yy + 18, 12, P_COL[i], 'left', { maxW: rowW - ptot - 46 });
          for (var q = 0; q < WORLD.length; q++) {
            var qx = xr - 6 - ptot + q * (pw + pg) + pw / 2, got = q < pl[i].spot, here = q === pl[i].spot && on;
            ctx.fillStyle = got ? P_COL[i] : here ? '#ffffff' : 'rgba(255,255,255,0.14)';
            ctx.beginPath(); ctx.arc(qx, yy + 18, here ? pw / 2 + Math.sin(S.time * 6) : pw / 2, 0, 7); ctx.fill();
          }
        } else {
          UI.text(ctx, pl[i].nick, x + 36, yy + 18, 12, P_COL[i], 'left', { maxW: rowW - 90 });
          UI.text(ctx, String(pl[i].score), xr - 22, yy + 19, 20, '#ffd23f', 'center');
        }
      }
      var by = y + 92;
      if (game === 'shoot' && (m.phase === 'rack') && !m.hand) {
        // the rack: five balls, the last one golden
        for (var b = 0; b < RACK_BALLS; b++) {
          var gx = W / 2 + (b - 2) * 30, used = b < m.ball;
          ctx.globalAlpha = used ? 0.3 : 1;
          AV.drawBall(ctx, gx, by + 12, 11, b === RACK_BALLS - 1 ? 'gold' : (pl[m.cur].look.ball || 'classic'), 0);
          ctx.globalAlpha = 1;
        }
        UI.text(ctx, t('Rack {r}/{n}', { r: m.rack + 1, n: RACKS.length }), W / 2, by + 38, 12, '#fff', 'center', { stroke: '#111827', strokeW: 4 });
      }
      if (game === 'world' && m.phase === 'world' && !m.hand) worldMap(ctx, W / 2, by + 6, S);
      if ((m.phase === 'set' || m.phase === 'match') && S.twist !== 'normal' && !m.hand) M.twistBadge(ctx, W / 2, by + 14, S.twist, S.time);
      if (m.phase === 'match' && !m.hand) UI.text(ctx, t('Match it!'), W / 2, by + 44, 16, '#7cff6b', 'center', { stroke: '#111827', strokeW: 5 });
      if (m.ban) {
        var a = m.ban.t > 1.4 ? 1 - (m.ban.t - 1.4) / 0.4 : 1;
        ctx.globalAlpha = Math.max(0, a);
        UI.text(ctx, m.ban.text, W / 2, H * 0.62, 26, m.ban.c, 'center', { stroke: '#111827', strokeW: 8, maxW: W - 30 });
        ctx.globalAlpha = 1;
      }
    }
    // Around the World: a little top-down map of the seven spots with both players on it
    function worldMap(ctx, cx, y, S) {
      var sx = 12, sc = 9, hy = y + 8;
      ctx.fillStyle = 'rgba(15,23,42,0.72)'; UI.rr(ctx, cx - 80, y - 4, 160, 94, 14); ctx.fill();
      ctx.fillStyle = '#ff5a1f'; ctx.beginPath(); ctx.arc(cx, hy, 4, 0, 7); ctx.fill();
      function pos(k) { var sp = D.SPOTS[WORLD[Math.min(k, WORLD.length - 1)]], a = sp.a * U.deg; return { x: cx + Math.sin(a) * sp.d * sx, y: hy + Math.cos(a) * sp.d * sc }; }
      for (var k = 0; k < WORLD.length; k++) {
        var p = pos(k); ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, 7); ctx.fill();
      }
      for (var i = 0; i < 2; i++) {
        var q = pos(pl[i].spot), on = i === m.cur;
        ctx.fillStyle = P_COL[i]; ctx.beginPath(); ctx.arc(q.x + (i ? 4 : -4), q.y - (on ? 2 + Math.abs(Math.sin(S.time * 5)) * 3 : 0), on ? 6.5 : 5, 0, 7); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
      }
      var cur = pl[m.cur];
      UI.text(ctx, t('{s}  ({n}/{m})', { s: t(D.SPOTS[WORLD[Math.min(cur.spot, WORLD.length - 1)]].name), n: Math.min(cur.spot + 1, WORLD.length), m: WORLD.length }),
        cx, y + 76, 12, '#fff', 'center', { maxW: 150 });
    }
    // "Pass the phone" card
    function handCard(ctx, S, W, H) {
      var hd = m.hand, p = pl[hd.who];
      UI.blocker(ctx, Math.min(0.72, hd.t * 3), 'vsHand');
      var w = Math.min(360, W - 32), h = Math.min(H - 40, 400), x = (W - w) / 2, y = (H - h) / 2;
      var k = U.easeOutBack(Math.min(1, hd.t * 3));
      ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(k, k); ctx.translate(-W / 2, -H / 2);
      UI.panel(ctx, x, y, w, h, { border: P_COL[hd.who], borderW: 5 });
      UI.text(ctx, t('PASS THE PHONE!'), W / 2, y + 30, 15, '#6b7280');
      UI.text(ctx, t("{n}'s turn", { n: p.nick }), W / 2, y + 60, 26, P_COL[hd.who], 'center', { stroke: '#111827', strokeW: 6, maxW: w - 30 });
      var ah = Math.min(150, h - 230);
      ctx.fillStyle = '#fde68a'; UI.rr(ctx, W / 2 - 70, y + 82, 140, ah + 6, 18); ctx.fill();
      ctx.save(); UI.rr(ctx, W / 2 - 70, y + 82, 140, ah + 6, 18); ctx.clip();
      AV.draw(ctx, p.look, W / 2, y + 82 + ah, ah * 0.92, { pose: 'wave', t: hd.t, view: 'front' });
      ctx.restore();
      UI.wrap(ctx, hd.sub, W / 2, y + 104 + ah, w - 40, 16, '#111827');
      if (p.assist !== 'normal') UI.text(ctx, t('Aim Assist: {a}', { a: t(D.ASSIST[p.assist].name) }), W / 2, y + h - 92, 12, '#16a34a');
      if (UI.button(ctx, 'vsReady', x + 30, y + h - 74, w - 60, 56, t("I'm ready!"), { color: '#22c55e', icon: 'play' }) && hd.t > 0.35) {
        var fn = hd.then; m.hand = null; if (fn) fn();
      }
      ctx.restore();
    }
    return m;
  };
})();
