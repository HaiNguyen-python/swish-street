// Swish Street - weekly Street Events (v0.4).
// Every week (Monday to Sunday, from the device clock) one court gets a themed remix: a
// 60-second points round with its own twist. Bronze, silver and gold each pay coins once that
// week, and gold unlocks the event's exclusive item for good. Seven events rotate by themselves;
// there is no network, no countdown pressure beyond "days left", and nothing to buy.
(function () {
  'use strict';
  var SS = window.SS, U = SS.U, D = SS.D, UI = SS.ui, A = SS.audio, AV = SS.avatar, R = SS.render, t = SS.t;
  var M = SS.modes, SC = SS.scenes;
  function save() { return SS.save.data; }
  var DAY = 86400000, EPOCH = Date.UTC(2024, 0, 1); // a Monday
  var SPOTS = ['close', 'top', 'lw', 'rw', 'lelb', 'relb', 'deep'];

  var EV = (SS.events = {});
  function weekInfo(d) {
    d = d || new Date();
    var utc = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
    var idx = Math.floor((utc - EPOCH) / (7 * DAY));
    // ISO-style week label for the save, e.g. 2026-W42
    var dt = new Date(utc), day = dt.getUTCDay() || 7;
    dt.setUTCDate(dt.getUTCDate() + 4 - day);
    var y0 = Date.UTC(dt.getUTCFullYear(), 0, 1), wk = Math.ceil(((dt - y0) / DAY + 1) / 7);
    var dow = (d.getDay() + 6) % 7; // Monday = 0
    return { idx: idx, key: dt.getUTCFullYear() + '-W' + (wk < 10 ? '0' : '') + wk, daysLeft: 7 - dow };
  }
  EV.week = weekInfo;
  // v0.5: ten events. Weeks before PIVOT keep the v0.4 seven-week order (the first seven events),
  // so the event that was running on the update day stays the same until Sunday.
  var PIVOT = Math.floor((Date.UTC(2026, 9, 19) - EPOCH) / (7 * DAY)); // Monday 2026-10-19
  function mod(i, n) { return ((i % n) + n) % n; }
  EV.byIndex = function (i) {
    if (i < PIVOT) return D.EVENTS[mod(i, 7)];
    return D.eventById(D.EVENT_ORDER[mod(i - PIVOT, D.EVENT_ORDER.length)]) || D.EVENTS[0];
  };
  EV.current = function (d) {
    var w = weekInfo(d);
    return { ev: EV.byIndex(w.idx), next: EV.byIndex(w.idx + 1), key: w.key, daysLeft: w.daysLeft };
  };
  // This week's progress (resets itself when a new week starts)
  EV.progress = function () {
    var cur = EV.current(), e = save().event;
    if (e.week !== cur.key) return { best: 0, tier: 0, played: 0 };
    return { best: e.best, tier: e.tier, played: e.played };
  };
  EV.rewardItem = function (ev) { return D.item(ev.reward[0], ev.reward[1]); };
  EV.hasReward = function (ev) { return SS.save.owns(ev.reward[0], ev.reward[1]); };
  EV.isNew = function () { return EV.progress().played === 0; };
  function tierFor(ev, pts) { var k = 0; ev.tiers.forEach(function (th, i) { if (pts >= th) k = i + 1; }); return k; }
  EV.tierFor = tierFor;

  // ---------- The event round ----------
  M.event = function () {
    var cur = EV.current(), ev = cur.ev;
    var cfg = {
      id: 'ev_' + ev.id, name: ev.name, desc: ev.desc, goal: 'points', need: 99999, noNeed: true, time: 60,
      spots: ev.spots || SPOTS, order: 'random', variant: ev.variant || null, move: ev.move || null,
      fire: !!ev.fire, fireAt: ev.fireAt || null, wind: ev.wind || null, gulls: !!ev.gulls, trains: !!ev.trains, trainFast: !!ev.trainFast,
      beforeShot: function (S, m) {
        m.golden = !!(ev.golden && m.shotN % ev.golden === ev.golden - 1);
        if (ev.blindEvery) S.setTwist(m.shotN % ev.blindEvery === ev.blindEvery - 1 ? 'blind' : 'normal');
        if (ev.twistEvery) {
          var on = m.shotN % ev.twistEvery === ev.twistEvery - 1 && D.twistOkAt(ev.twistId, S.spotId);
          S.setTwist(on ? ev.twistId : 'normal');
          if (on) S.after(0.3, function () { S.pop(t(D.TWISTS[ev.twistId].name).toUpperCase() + '!', '#86efac', 0.36, 0.9); });
        }
        if (m.golden) S.after(0.3, function () { S.pop(t('GOLDEN BALL! x3'), '#facc15', 0.36, 1.0); });
      },
      ballSkin: function (S, m) { return m.golden && S.state !== 'idle' ? 'gold' : null; },
      points: function (S, res, m) {
        if (!res.made) return 0;
        var p = res.swish || res.bank ? 3 : 2, extra = [];
        if (ev.streakPts) { p = m.combo + 1 + (res.swish || res.bank ? 1 : 0); if (m.combo >= 2) extra.push(t('{n} IN A ROW!', { n: m.combo })); }
        else if (m.combo >= 3) p += 1;
        if (ev.bankPts && res.bank) { p = ev.bankPts; extra.push(t('GLASS!')); }
        if (ev.deepSwish && res.swish) { p = ev.deepSwish; extra.push(t('DOWNTOWN SWISH!')); }
        if (ev.twistBonus && res.twist === ev.twistId && res.twistOk) { p += ev.twistBonus; extra.push(t('BOING!')); }
        if (ev.windBonus && res.swish && res.wind >= 0.4) { p += ev.windBonus; extra.push(t('WIND SWISH!')); }
        if (ev.gullBonus && S.world.obstacles && S.world.obstacles.some(function (o) { return o.on && !o.hit && !o.flee; })) { p += ev.gullBonus; extra.push(t('GULL DODGE!')); }
        if (ev.blindBonus && res.twist === 'blind') { p += ev.blindBonus; extra.push(t('EYES CLOSED!')); }
        if (ev.trainFast && R.dyn.train && R.dyn.train.on) { p *= 2; extra.push(t('TRAIN x2!')); }
        if (m.golden) { p *= 3; extra.push(t('GOLDEN x3!')); }
        if (S.onFire && ev.fire) { p *= ev.fireMul || 2; extra.push(t('FIRE x{n}', { n: ev.fireMul || 2 })); }
        S.pop('+' + p + (extra.length ? '  ' + extra[0] : ''), m.golden ? '#facc15' : S.onFire ? '#ff9a3d' : '#ffd23f', 0.5, 1);
        return p;
      },
      hud: function (ctx, S, W, H, m) { tierBar(ctx, W / 2, UI.safe.t + 76, Math.min(240, W - 140), ev, m.points, S.time); },
      onEnd: function (S, m) { finish(S, m, ev, cur); },
      restart: function () { SS.go('play', M.event()); },
      quit: function () { SS.go('event'); }
    };
    var mode = M.challenge(ev.court, 0, cfg);
    mode.music = ev.court;
    mode.eventId = ev.id;
    return mode;
  };
  // medal progress bar: bronze / silver / gold marks
  function tierBar(ctx, cx, y, w, ev, pts, time) {
    var max = ev.tiers[2] * 1.12, x = cx - w / 2;
    ctx.fillStyle = 'rgba(15,23,42,0.7)'; UI.rr(ctx, x - 6, y - 6, w + 12, 26, 13); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.15)'; UI.rr(ctx, x, y, w, 14, 7); ctx.fill();
    var f = U.clamp(pts / max, 0, 1), tier = tierFor(ev, pts);
    if (f > 0) { ctx.fillStyle = tier ? D.TIER_COLORS[tier - 1] : '#5ef2ff'; UI.rr(ctx, x, y, Math.max(14, w * f), 14, 7); ctx.fill(); }
    ev.tiers.forEach(function (th, i) {
      var mx = x + w * th / max, got = pts >= th;
      ctx.fillStyle = D.TIER_COLORS[i]; ctx.beginPath(); ctx.arc(mx, y + 7, got ? 9 + Math.sin(time * 8) * 1 : 7, 0, 7); ctx.fill();
      ctx.strokeStyle = '#111827'; ctx.lineWidth = 2; ctx.stroke();
      if (got) UI.icon(ctx, 'check', mx, y + 7, 9, '#111827');
    });
  }
  EV.tierBar = tierBar;
  function finish(S, m, ev, cur) {
    var e = save().event, fresh = e.week !== cur.key;
    if (fresh) { e.week = cur.key; e.best = 0; e.tier = 0; e.played = 0; }
    e.played++;
    var pts = m.points, tier = tierFor(ev, pts), coins = 5, newTiers = [];
    for (var k = e.tier; k < tier; k++) { coins += D.TIER_COINS[k]; newTiers.push(k); }
    // career record (v0.5): lifetime medals and golds for the Trophy Room
    var cr = save().career;
    cr.medals = Math.min(99999, cr.medals + newTiers.length);
    if (newTiers.indexOf(2) >= 0) cr.golds = Math.min(9999, cr.golds + 1);
    if (pts > e.best) e.best = pts;
    if (tier > e.tier) e.tier = tier;
    var item = null;
    if (tier >= 3 && SS.save.grant(ev.reward[0], ev.reward[1])) item = EV.rewardItem(ev);
    SS.save.addCoins(coins);
    if (item) UI.toast(t('Event prize: {i}!', { i: t(item.name) }), '#b45309');
    if (newTiers.length) { S.celebrate(true); A.roar(); }
    var lines = [t('Score: {n}', { n: pts }), t('This week\'s best: {n}', { n: e.best })];
    lines.push(tier ? t('Medal: {m}', { m: t(D.TIER_NAMES[tier - 1]) }) : t('Bronze at {n} points', { n: ev.tiers[0] }));
    if (item) lines.push(t('New: {i}', { i: t(item.name) }));
    S.finish({
      title: newTiers.length ? t('{m} MEDAL!', { m: t(D.TIER_NAMES[tier - 1]).toUpperCase() }) : t('Event round done!'),
      titleColor: tier ? D.TIER_COLORS[tier - 1] : '#ff5a1f', jingle: newTiers.length ? 'win' : 'star',
      sub: t(ev.name), stars: tier, starsMax: 3, lines: lines, coins: coins,
      buttons: [
        { label: t('Play Again'), color: '#22c55e', icon: 'retry', action: function () { SS.go('play', M.event()); } },
        { label: t('Event Board'), color: '#64748b', icon: 'cal', action: function () { SS.go('event'); } }
      ]
    });
  }

  // ---------- Event board scene ----------
  SC.event = {
    id: 'event', t: 0,
    enter: function () { SC.event.t = 0; A.setMusic('menu'); },
    draw: function (ctx, W, H, dt) {
      var s = SC.event; s.t += dt;
      var cur = EV.current(), ev = cur.ev, pr = EV.progress(), court = D.courtById(ev.court);
      SC.drawCourtBg(ctx, W, H, dt, ev.env);
      ctx.fillStyle = 'rgba(8,10,35,0.5)'; ctx.fillRect(0, 0, W, H);
      var wide = W > H * 1.2; // landscape iPad: two columns
      var w = Math.min(wide ? 780 : 440, W - 28 - UI.safe.l - UI.safe.r), cx = W / 2, x = cx - w / 2;
      var top = UI.safe.t + 70, bot = H - UI.safe.b - 14, h = bot - top;
      UI.panel(ctx, x, top, w, h, { color: '#fff8ec' });
      // header ribbon in the event colour
      ctx.save(); UI.rr(ctx, x, top, w, 92, 24); ctx.clip();
      var g = ctx.createLinearGradient(x, top, x + w, top + 92); g.addColorStop(0, ev.color); g.addColorStop(1, U.shade(ev.color, -0.35));
      ctx.fillStyle = g; ctx.fillRect(x, top, w, 92);
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      for (var i = 0; i < 6; i++) { var sx = x + ((i * 97 + s.t * 40) % (w + 80)) - 40; ctx.beginPath(); ctx.moveTo(sx, top); ctx.lineTo(sx + 26, top); ctx.lineTo(sx - 10, top + 92); ctx.lineTo(sx - 36, top + 92); ctx.fill(); }
      ctx.restore();
      UI.text(ctx, t('THIS WEEK\'S STREET EVENT'), cx, top + 20, 12, '#fde68a');
      UI.text(ctx, t(ev.name), cx, top + 48, 26, '#fff', 'center', { stroke: '#111827', strokeW: 6, maxW: w - 30 });
      UI.text(ctx, t('{c}  •  {d} days left', { c: t(court.name), d: cur.daysLeft }), cx, top + 76, 13, '#fff', 'center', { maxW: w - 30, weight: 800 });
      var y = top + 108;
      var lx0 = x + 20, lw = wide ? w / 2 - 30 : w - 40, lcx = lx0 + lw / 2;
      var rx0 = wide ? x + w / 2 + 10 : x + 20, rw = wide ? w / 2 - 30 : w - 40, rcx = rx0 + rw / 2;
      UI.wrap(ctx, t(ev.desc), lcx, y, lw, 16, '#111827');
      y += 50;
      // medals
      var mw = (lw - 16) / 3;
      ev.tiers.forEach(function (th, k) {
        var mx = lx0 + k * (mw + 8), got = pr.tier > k;
        ctx.fillStyle = got ? U.rgba(D.TIER_COLORS[k], 0.25) : '#f1f5f9'; UI.rr(ctx, mx, y, mw, 74, 14); ctx.fill();
        ctx.fillStyle = D.TIER_COLORS[k]; ctx.beginPath(); ctx.arc(mx + mw / 2, y + 24, got ? 16 : 13, 0, 7); ctx.fill();
        ctx.strokeStyle = '#111827'; ctx.lineWidth = 2; ctx.stroke();
        if (got) UI.icon(ctx, 'check', mx + mw / 2, y + 24, 14, '#111827');
        UI.text(ctx, t(D.TIER_NAMES[k]), mx + mw / 2, y + 50, 13, '#111827', 'center', { maxW: mw - 8 });
        UI.text(ctx, t('{n} pts', { n: th }) + (k < 2 ? '' : ''), mx + mw / 2, y + 65, 11, '#6b7280', 'center', { maxW: mw - 8 });
      });
      y += 86;
      UI.text(ctx, pr.played ? t('Your best this week: {n}', { n: pr.best }) : t('Not played yet this week!'), lcx, y, 15, '#7c2d12', 'center', { maxW: lw });
      y += 20;
      y += UI.wrap(ctx, t('Each medal pays coins once a week. Gold wins the prize for keeps!'), lcx, y, lw, 12, '#6b7280') + 6;
      if (wide) y = top + 108;
      // the gold prize
      var it = EV.rewardItem(ev), got = EV.hasReward(ev), cat = ev.reward[0];
      var ph = U.clamp(bot - y - 120, 80, 190), lx = rx0 + Math.min(70, ph * 0.5);
      ctx.fillStyle = '#2e1065'; UI.rr(ctx, rx0, y, rw, ph, 16); ctx.fill();
      var look = Object.assign({}, save().avatar); if (cat === 'jersey') look.jersey = it.id; if (cat === 'gear') look.gear = it.id;
      ctx.save(); UI.rr(ctx, rx0, y, rw, ph, 16); ctx.clip();
      if (cat === 'ball') AV.drawBall(ctx, lx, y + ph / 2, Math.min(40, ph * 0.3), it.id, s.t * 2);
      else if (cat === 'gear') { var gh = ph * 1.7; AV.draw(ctx, look, lx, y + ph * 0.5 + 0.91 * gh, gh, { pose: 'idle', t: s.t, view: 'front', shadow: false }); }
      else AV.draw(ctx, look, lx, y + ph - 6, ph * 0.85, { pose: 'idle', t: s.t, view: 'front', shadow: false });
      ctx.restore();
      var tx0 = lx + Math.min(70, ph * 0.5) + 6;
      UI.text(ctx, t('GOLD PRIZE'), tx0, y + ph * 0.3, 11, '#fde68a', 'left');
      UI.text(ctx, t(it.name), tx0, y + ph * 0.52, 18, '#fff', 'left', { maxW: rx0 + rw - 10 - tx0 });
      UI.text(ctx, got ? t('You have it!') : t('Only from this event'), tx0, y + ph * 0.74, 11, got ? '#86efac' : '#ddd6fe', 'left', { maxW: rx0 + rw - 10 - tx0, weight: 800 });
      y += ph + 12;
      UI.text(ctx, t('Next week: {n}', { n: t(cur.next.name) }), rcx, y + 6, 12, '#6b7280', 'center', { maxW: rw });
      var by = Math.max(y + 22, bot - 72);
      if (UI.button(ctx, 'evGo', rx0 + 4, by, rw - 8, 58, pr.played ? t('Play again') : t('Play the event!'), { color: '#22c55e', icon: 'play', size: 20 })) SS.go('play', M.event());
      // top bar
      var ty = UI.safe.t + 12;
      if (UI.button(ctx, 'back', 14 + UI.safe.l, ty, 52, 48, '', { icon: 'back', color: '#334155', size: 22, radius: 16 })) SS.go('title');
      UI.text(ctx, t('Street Event'), W / 2, ty + 26, Math.min(26, W * 0.06), '#fff', 'center', { stroke: '#111827', strokeW: 7, maxW: W - 200 });
      UI.coins(ctx, W - 14 - UI.safe.r, ty + 4, save().coins, 40);
    }
  };
})();
