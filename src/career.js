// Swish Street - "Rookie to Legend" career and the Trophy Room (v0.5).
//  * SS.career.points() / rank(): your career rank, worked out from your progress every time
//    (nothing extra to keep in sync, and older saves get their rank straight away).
//  * 25 trophies, each a test on the save. A new trophy pays +20 coins once and shows a toast
//    after the round that earned it (save.career.seen remembers which ones were paid).
//  * SS.scenes.trophies: the Trophy Room (Trophies shelf and Career stats tabs).
(function () {
  'use strict';
  var SS = window.SS, U = SS.U, D = SS.D, UI = SS.ui, A = SS.audio, AV = SS.avatar, t = SS.t;
  var SC = SS.scenes;
  function save() { return SS.save.data; }
  var TROPHY_COINS = 20;

  function rivalLevels(d) { var n = 0; for (var k in d.rivals) n += d.rivals[k] || 0; return n; }
  function relayStars(d) { var n = 0; for (var k in d.relayStars) n += d.relayStars[k] || 0; return n; }
  function maxRival(d) { var n = 0; for (var k in d.rivals) n = Math.max(n, d.rivals[k] || 0); return n; }

  // id, name, how to earn it, icon, test(save) -> true when earned, optional progress(save) -> [have, need]
  var TROPHIES = [
    { id: 'first', name: 'First Bucket', desc: 'Make your first shot.', icon: 'ball', need: function (d) { return [d.stats.makes, 1]; } },
    { id: 'makes100', name: 'Hundred Club', desc: 'Make 100 shots.', icon: 'ball', need: function (d) { return [d.stats.makes, 100]; } },
    { id: 'makes1000', name: 'Bucket Machine', desc: 'Make 1,000 shots.', icon: 'ball', need: function (d) { return [d.stats.makes, 1000]; } },
    { id: 'swish50', name: 'Silk Collector', desc: 'Swish 50 shots.', icon: 'net', need: function (d) { return [d.stats.swishes, 50]; } },
    { id: 'swish500', name: 'Nothing but Net', desc: 'Swish 500 shots.', icon: 'net', need: function (d) { return [d.stats.swishes, 500]; } },
    { id: 'bank50', name: 'Glass Master', desc: 'Bank in 50 shots.', icon: 'glass', need: function (d) { return [d.stats.banks, 50]; } },
    { id: 'streak5', name: 'Heating Up', desc: 'Make 5 in a row.', icon: 'bolt', need: function (d) { return [d.career.bestStreak, 5]; } },
    { id: 'streak10', name: 'Unstoppable', desc: 'Make 10 in a row.', icon: 'bolt', need: function (d) { return [d.career.bestStreak, 10]; } },
    { id: 'stars10', name: 'Star Chaser', desc: 'Earn 10 Street Tour stars.', icon: 'star', need: function () { return [SS.save.totalStars(), 10]; } },
    { id: 'stars21', name: 'All the Stars', desc: 'Earn all 21 Street Tour stars.', icon: 'star', need: function () { return [SS.save.totalStars(), 21]; } },
    { id: 'rival1', name: 'New Friend', desc: 'Beat a rival at H-O-R-S-E.', icon: 'crew', need: function (d) { return [Object.keys(d.rivals).length, 1]; } },
    { id: 'legend', name: 'Legend Respect', desc: 'Beat any rival on the Legend tier.', icon: 'crew', need: function (d) { return [maxRival(d), 3]; } },
    { id: 'champ', name: 'Champion', desc: 'Beat the Champion in the Arena.', icon: 'crown', need: function (d) { return [d.champion ? 1 : 0, 1]; } },
    { id: 'trick7', name: 'Trickster', desc: 'Find 7 trick shots.', icon: 'trick', need: function () { return [SS.save.trickCount(), 7]; } },
    { id: 'trick28', name: 'Hall of Fame', desc: 'Find all 28 trick shots.', icon: 'trick', need: function () { return [SS.save.trickCount(), D.TRICKS.length]; } },
    { id: 'quick40', name: 'Quick Hands', desc: 'Score 40 in Quick Play.', icon: 'bolt', need: function (d) { return [d.quickBest, 40]; } },
    { id: 'buzzer3', name: 'Buzzer Beater', desc: 'Make 3 of 5 heaves in Buzzer Beater.', icon: 'clock', need: function (d) { return [d.buzzerBest, 3]; } },
    { id: 'dunk75', name: 'Judges Love It', desc: 'Score 75 in Dunk Fest.', icon: 'dunk', need: function (d) { return [d.dunkBest, 75]; } },
    { id: 'daily', name: 'Daily Star', desc: 'Score 1,500 in a Daily Challenge.', icon: 'cal', need: function (d) { return [d.daily.allBest, 1500]; } },
    { id: 'gold', name: 'Event Gold', desc: 'Win a gold medal in a Street Event.', icon: 'medal', need: function (d) { return [d.career.golds, 1]; } },
    { id: 'medals10', name: 'Medal Rack', desc: 'Win 10 Street Event medals.', icon: 'medal', need: function (d) { return [d.career.medals, 10]; } },
    { id: 'friends', name: 'Good Sport', desc: 'Play 5 games with a friend (2 Players).', icon: 'crew', need: function (d) { return [d.vs.played, 5]; } },
    { id: 'world', name: 'World Traveller', desc: 'Go all the way round in Around the World.', icon: 'globe', need: function (d) { return [d.career.world, 1]; } },
    { id: 'crew6', name: 'Crew Captain', desc: 'Earn 6 Team Up relay stars.', icon: 'crew', need: function (d) { return [relayStars(d), 6]; } },
    { id: 'photo5', name: 'Photographer', desc: 'Take 5 Swish Cam photos.', icon: 'camera', need: function (d) { return [d.career.photos, 5]; } }
  ];
  D.TROPHIES = TROPHIES;

  var CR = (SS.career = {});
  CR.earned = function (tr, d) { var n = tr.need(d || save()); return n[0] >= n[1]; };
  CR.count = function () { var d = save(), n = 0; TROPHIES.forEach(function (tr) { if (CR.earned(tr, d)) n++; }); return n; };
  // Career points: a bit for every make, more for big milestones.
  CR.points = function (d) {
    d = d || save(); var st = d.stats;
    var p = st.makes + st.swishes + st.banks + st.dunks * 3 + st.heaves * 5;
    p += SS.save.totalStars() * 20 + rivalLevels(d) * 40 + SS.save.trickCount() * 25 + relayStars(d) * 15;
    p += (d.champion ? 150 : 0) + d.career.golds * 60 + d.career.medals * 15 + Math.min(d.vs.played, 200) * 5;
    p += CR.count() * 10;
    return Math.max(0, Math.floor(p));
  };
  CR.rank = function (pts) {
    if (pts == null) pts = CR.points();
    var i = 0; while (i + 1 < D.RANKS.length && pts >= D.RANKS[i + 1].pts) i++;
    var r = D.RANKS[i], nx = D.RANKS[i + 1] || null;
    return { i: i, name: r.name, color: r.color, pts: pts, next: nx, frac: nx ? U.clamp((pts - r.pts) / (nx.pts - r.pts), 0, 1) : 1 };
  };
  // Called when a round ends: pay and announce trophies earned since last time.
  CR.check = function () {
    var d = save(), seen = d.career.seen, news = [];
    TROPHIES.forEach(function (tr) { if (seen.indexOf(tr.id) < 0 && CR.earned(tr, d)) news.push(tr); });
    if (!news.length) return [];
    var before = CR.rank().i;
    news.forEach(function (tr) { seen.push(tr.id); });
    SS.save.addCoins(TROPHY_COINS * news.length);
    if (A.trophy) setTimeout(function () { A.trophy(); }, 700);
    UI.toast(news.length === 1 ? t('Trophy: {n}! +{c}', { n: t(news[0].name), c: TROPHY_COINS })
      : t('{n} new trophies! +{c}', { n: news.length, c: TROPHY_COINS * news.length }), '#b45309');
    var after = CR.rank();
    if (after.i > before) UI.toast(t('Career rank up: {r}!', { r: t(after.name) }), '#7c3aed');
    return news;
  };
  // A season of streaks: remember your best run of makes (player shots only, never Player 2).
  CR.noteStreak = function (n) {
    var c = save().career; if (n > c.bestStreak) c.bestStreak = Math.min(9999, n);
  };

  // A rank badge: a shield in the rank colour with stars for the tier.
  CR.badge = function (ctx, x, y, s, rk) {
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = '#111827';
    shield(ctx, s * 1.08); ctx.fill();
    var g = ctx.createLinearGradient(0, -s, 0, s); g.addColorStop(0, U.shade(rk.color, 0.35)); g.addColorStop(1, U.shade(rk.color, -0.25));
    ctx.fillStyle = g; shield(ctx, s); ctx.fill();
    ctx.restore();
    var n = rk.i + 1, sr = s * (n > 4 ? 0.17 : 0.22);
    for (var k = 0; k < n; k++) {
      var row = n > 4 ? (k < 4 ? 0 : 1) : 0, inRow = n > 4 ? (row ? n - 4 : 4) : n, col = row ? k - 4 : k;
      UI.star(ctx, x + (col - (inRow - 1) / 2) * sr * 2.1, y - s * 0.12 + row * sr * 2.2 - (n > 4 ? sr : 0), sr, true, '#fff7ae');
    }
  };
  function shield(ctx, s) {
    ctx.beginPath(); ctx.moveTo(0, -s); ctx.lineTo(s * 0.85, -s * 0.62); ctx.lineTo(s * 0.75, s * 0.25);
    ctx.quadraticCurveTo(s * 0.5, s * 0.8, 0, s); ctx.quadraticCurveTo(-s * 0.5, s * 0.8, -s * 0.75, s * 0.25); ctx.lineTo(-s * 0.85, -s * 0.62); ctx.closePath();
  }

  // ---------- Trophy Room ----------
  SC.trophies = {
    id: 'trophies', t: 0, tab: 'shelf', pick: null,
    enter: function () { var s = SC.trophies; s.t = 0; s.pick = null; A.setMusic('menu'); },
    draw: function (ctx, W, H, dt) {
      var s = SC.trophies; s.t += dt;
      var d = save(), rk = CR.rank();
      SC.drawCourtBg(ctx, W, H, dt, 'arena', 0.5);
      ctx.fillStyle = 'rgba(8,10,35,0.62)'; ctx.fillRect(0, 0, W, H);
      var wide = W > H * 1.15;
      var w = Math.min(wide ? 900 : 460, W - 24 - UI.safe.l - UI.safe.r), x = (W - w) / 2;
      var top = UI.safe.t + 70, bot = H - UI.safe.b - 12;
      // rank card
      var rkH = wide ? bot - top : 112, rkW = wide ? Math.min(300, w * 0.36) : w;
      UI.panel(ctx, x, top, rkW, rkH, { color: '#1e1b4b', border: rk.color, borderW: 4 });
      var bs = wide ? 54 : 38, bcx = wide ? x + rkW / 2 : x + 16 + bs, bcy = wide ? top + 26 + bs : top + rkH / 2;
      CR.badge(ctx, bcx, bcy, bs, rk);
      var tx = wide ? x + rkW / 2 : x + 32 + bs * 2, al = wide ? 'center' : 'left', ty = wide ? bcy + bs + 26 : top + 26, tw = wide ? rkW - 30 : rkW - (tx - x) - 14;
      UI.text(ctx, t('CAREER RANK'), tx, ty, 11, '#c4b5fd', al);
      UI.text(ctx, t(rk.name).toUpperCase(), tx, ty + 26, 26, rk.color, al, { stroke: '#111827', strokeW: 6, maxW: tw });
      var bx = wide ? x + 22 : tx, bw = wide ? rkW - 44 : tw, byy = ty + 48;
      ctx.fillStyle = 'rgba(255,255,255,0.15)'; UI.rr(ctx, bx, byy, bw, 12, 6); ctx.fill();
      ctx.fillStyle = rk.color; UI.rr(ctx, bx, byy, Math.max(12, bw * rk.frac), 12, 6); ctx.fill();
      UI.text(ctx, rk.next ? t('{p} / {n} career points to {r}', { p: rk.pts, n: rk.next.pts, r: t(rk.next.name) }) : t('{p} career points. You are a Legend!', { p: rk.pts }),
        wide ? x + rkW / 2 : bx, byy + 24, 11, '#e0e7ff', wide ? 'center' : 'left', { maxW: bw, weight: 800 });
      if (wide) {
        // the ladder of ranks
        var ly = byy + 50;
        for (var r = D.RANKS.length - 1; r >= 0; r--) {
          var rr = D.RANKS[r], got = rk.i >= r, rowY = ly + (D.RANKS.length - 1 - r) * Math.min(34, (bot - ly - 16) / D.RANKS.length);
          ctx.fillStyle = got ? U.rgba(rr.color, 0.25) : 'rgba(255,255,255,0.05)'; UI.rr(ctx, x + 18, rowY, rkW - 36, 28, 10); ctx.fill();
          UI.text(ctx, t(rr.name), x + 30, rowY + 14, 14, got ? rr.color : 'rgba(255,255,255,0.4)', 'left');
          UI.text(ctx, String(rr.pts), x + rkW - 30, rowY + 14, 12, got ? '#fff' : 'rgba(255,255,255,0.35)', 'right');
        }
      }
      // tabs
      var px = wide ? x + rkW + 14 : x, pw = wide ? w - rkW - 14 : w, py = wide ? top : top + rkH + 12;
      var tabW = (pw - 8) / 2;
      [['shelf', t('Trophies {n}/{m}', { n: CR.count(), m: TROPHIES.length })], ['stats', t('Career stats')]].forEach(function (tb, i) {
        if (UI.button(ctx, 'tr_tab_' + tb[0], px + i * (tabW + 8), py, tabW, 40, tb[1], { color: s.tab === tb[0] ? '#f59e0b' : '#475569', size: 14, radius: 12 })) { s.tab = tb[0]; s.pick = null; }
      });
      var cy = py + 52, ch = bot - cy;
      UI.panel(ctx, px, cy, pw, ch, { color: '#fff8ec' });
      if (s.tab === 'shelf') shelf(ctx, px, cy, pw, ch, d, s);
      else stats(ctx, px, cy, pw, ch, d);
      // top bar
      var tyy = UI.safe.t + 12;
      if (UI.button(ctx, 'back', 14 + UI.safe.l, tyy, 52, 48, '', { icon: 'back', color: '#334155', size: 22, radius: 16 })) SS.go('title');
      UI.text(ctx, t('Trophy Room'), W / 2, tyy + 26, Math.min(28, W * 0.065), '#fff', 'center', { stroke: '#111827', strokeW: 7, maxW: W - 220 });
      UI.coins(ctx, W - 14 - UI.safe.r, tyy + 4, d.coins, 40);
    }
  };
  function shelf(ctx, x, y, w, h, d, s) {
    var cols = 5, rows = Math.ceil(TROPHIES.length / cols), infoH = 58;
    var cw = (w - 20) / cols, chh = Math.min(cw * 1.3, (h - 20 - infoH) / rows);
    TROPHIES.forEach(function (tr, i) {
      var c = i % cols, r = Math.floor(i / cols), cx = x + 10 + c * cw, cy = y + 10 + r * chh;
      var got = CR.earned(tr, d), sel = s.pick === tr.id;
      ctx.fillStyle = sel ? '#fde68a' : got ? '#fef3c7' : '#e5e7eb'; UI.rr(ctx, cx + 3, cy + 3, cw - 6, chh - 6, 12); ctx.fill();
      if (sel) { ctx.strokeStyle = '#b45309'; ctx.lineWidth = 2.5; UI.rr(ctx, cx + 3, cy + 3, cw - 6, chh - 6, 12); ctx.stroke(); }
      var ic = Math.min(cw * 0.3, (chh - 22) * 0.4);
      drawTrophy(ctx, cx + cw / 2, cy + 8 + (chh - 22) * 0.4, ic, got, tr.icon, s.t + i);
      UI.text(ctx, got ? t(tr.name) : '???', cx + cw / 2, cy + chh - 14, 9, got ? '#78350f' : '#9ca3af', 'center', { maxW: cw - 12 });
      UI.region('tr_' + tr.id, cx, cy, cw, chh);
      if (SS.a11y) SS.a11y.note('tr_' + tr.id, t(tr.name) + '. ' + t(tr.desc) + (got ? ' ' + t('Earned!') : ''), cx, cy, cw, chh);
      if (UI.consume('tr_' + tr.id)) { s.pick = tr.id; A.click(); }
    });
    // info strip for the picked trophy
    var iy = y + h - infoH - 6;
    var tr = null; TROPHIES.forEach(function (q) { if (q.id === s.pick) tr = q; });
    if (!tr) { UI.wrap(ctx, t('Tap a trophy to see how to earn it. Each one pays +{c} coins!', { c: TROPHY_COINS }), x + w / 2, iy + 20, w - 30, 13, '#6b7280'); return; }
    var n = tr.need(d), got = n[0] >= n[1];
    UI.text(ctx, t(tr.name), x + w / 2, iy + 12, 17, '#111827', 'center', { maxW: w - 30 });
    UI.text(ctx, t(tr.desc) + '  ' + (got ? t('Earned!') : t('{a} / {b}', { a: Math.min(n[0], n[1]), b: n[1] })), x + w / 2, iy + 36, 13, got ? '#15803d' : '#7c2d12', 'center', { maxW: w - 30, weight: 800 });
  }
  // A cup on a little plinth; silhouettes for trophies you have not earned yet.
  function drawTrophy(ctx, x, y, s, got, icon, time) {
    var gold = got ? '#facc15' : '#9ca3af', dark = got ? '#b45309' : '#6b7280';
    ctx.fillStyle = dark; UI.rr(ctx, x - s * 0.55, y + s * 0.78, s * 1.1, s * 0.3, s * 0.08); ctx.fill();
    ctx.fillStyle = gold;
    ctx.beginPath(); ctx.moveTo(x - s * 0.62, y - s * 0.8); ctx.lineTo(x + s * 0.62, y - s * 0.8);
    ctx.quadraticCurveTo(x + s * 0.62, y + s * 0.25, x, y + s * 0.3); ctx.quadraticCurveTo(x - s * 0.62, y + s * 0.25, x - s * 0.62, y - s * 0.8); ctx.fill();
    ctx.fillRect(x - s * 0.1, y + s * 0.25, s * 0.2, s * 0.4); ctx.fillRect(x - s * 0.35, y + s * 0.6, s * 0.7, s * 0.2);
    ctx.strokeStyle = gold; ctx.lineWidth = s * 0.12;
    ctx.beginPath(); ctx.arc(x - s * 0.62, y - s * 0.42, s * 0.26, Math.PI * 0.5, Math.PI * 1.5); ctx.stroke();
    ctx.beginPath(); ctx.arc(x + s * 0.62, y - s * 0.42, s * 0.26, -Math.PI * 0.5, Math.PI * 0.5); ctx.stroke();
    if (got) {
      ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(x - s * 0.42, y - s * 0.72, s * 0.12, s * 0.6);
      var tw = 0.5 + 0.5 * Math.sin(time * 2.2);
      ctx.globalAlpha = tw; UI.icon(ctx, 'star4', x + s * 0.55, y - s * 0.85, s * 0.35, '#ffffff'); ctx.globalAlpha = 1;
    }
    if (icon === 'medal') { ctx.fillStyle = got ? '#b45309' : '#6b7280'; ctx.beginPath(); ctx.arc(x, y - s * 0.3, s * 0.24, 0, 7); ctx.fill(); }
    else if (icon === 'star') UI.star(ctx, x, y - s * 0.3, s * 0.28, true, got ? '#fff7ae' : '#d1d5db');
    else UI.icon(ctx, icon, x, y - s * 0.3, s * 0.5, got ? '#92400e' : '#6b7280');
  }
  function stats(ctx, x, y, w, h, d) {
    var st = d.stats, acc = st.shots ? Math.round(st.makes / st.shots * 100) : 0;
    var rows = [
      [t('Shots taken'), st.shots], [t('Makes'), st.makes], [t('Accuracy'), acc + '%'], [t('Swishes'), st.swishes], [t('Bank shots'), st.banks],
      [t('Best streak'), t('{n} in a row', { n: d.career.bestStreak })], [t('Dunks'), st.dunks], [t('Half-court heaves'), st.heaves],
      [t('Street Tour stars'), SS.save.totalStars() + ' / 21'], [t('Rival wins (respect)'), rivalLevels(d)], [t('Trick shots found'), SS.save.trickCount() + ' / ' + D.TRICKS.length],
      [t('Event medals'), t('{m}  ({g} gold)', { m: d.career.medals, g: d.career.golds })], [t('Games with friends'), d.vs.played], [t('Swish Cam photos'), d.career.photos],
      [t('Best Quick Play'), d.quickBest], [t('Best Daily'), d.daily.allBest], [t('Best Dunk Fest'), d.dunkBest + ' / 90'], [t('Best Buzzer Beater'), d.buzzerBest + ' / 5']
    ];
    var two = w > 520, perCol = two ? Math.ceil(rows.length / 2) : rows.length;
    var rh = Math.min(30, (h - 20) / perCol), colW = two ? (w - 30) / 2 : w - 20;
    rows.forEach(function (r, i) {
      var c = two && i >= perCol ? 1 : 0, k = c ? i - perCol : i, rx = x + 10 + c * (colW + 10), ry = y + 10 + k * rh;
      if (k % 2 === 0) { ctx.fillStyle = 'rgba(0,0,0,0.04)'; UI.rr(ctx, rx, ry, colW, rh, 8); ctx.fill(); }
      UI.text(ctx, r[0], rx + 10, ry + rh / 2, Math.min(14, rh * 0.5), '#374151', 'left', { maxW: colW * 0.6, weight: 800 });
      UI.text(ctx, String(r[1]), rx + colW - 10, ry + rh / 2, Math.min(15, rh * 0.55), '#111827', 'right', { maxW: colW * 0.38 });
    });
  }
})();
