// Swish Street - signature celebration combos (v0.4).
// Players chain three owned celebration moves, pick a finale effect and a shout-out from a fixed
// list (no free text). When it is switched on, the combo replaces the single celebration card
// after big shots. Also the Locker editor for it.
(function () {
  'use strict';
  var SS = window.SS, U = SS.U, D = SS.D, UI = SS.ui, A = SS.audio, AV = SS.avatar, t = SS.t;
  var MOVE_T = 0.8, INTRO = 0.35, FINALE = 0.75;

  var CB = (SS.celebCombo = {
    MOVE_T: MOVE_T,
    get: function () { var c = SS.save.data.combo; return { moves: c.moves.slice(0, 3), fx: c.fx, line: c.line }; },
    duration: function () { return INTRO + MOVE_T * 3 + FINALE; },
    loop: INTRO + MOVE_T * 3 + FINALE,
    shoutAt: INTRO + MOVE_T * 2,
    // the move playing at time t (with its local time, so each move starts from the top)
    at: function (combo, tm) {
      var i = U.clamp(Math.floor((tm - INTRO) / MOVE_T), 0, 2);
      if (tm < INTRO) return { id: combo.moves[0], t: 0, i: 0 };
      return { id: combo.moves[i], t: tm - INTRO - i * MOVE_T, i: i };
    },
    // the pose to use for results screens: the combo (looping) when it is on
    myPose: function () { return SS.save.data.combo.on ? 'signature' : SS.save.data.avatar.celebration; },
    fx: function (id) { for (var i = 0; i < D.COMBO_FX.length; i++) if (D.COMBO_FX[i].id === id) return D.COMBO_FX[i]; return D.COMBO_FX[0]; }
  });

  // Effects drawn from time alone (no particle state), so they cost almost nothing.
  function drawFx(ctx, fxId, x, y, w, h, tm, k) {
    var fx = CB.fx(fxId), cols = fx.colors, n = SS.save.data.settings.reduced ? 6 : 16, i;
    ctx.save(); UI.rr(ctx, x, y, w, h, 20); ctx.clip();
    for (i = 0; i < n; i++) {
      var seed = (i * 0.618034) % 1, ph = (tm * (0.45 + seed * 0.5) + seed) % 1;
      var px = x + w * ((seed * 7.3) % 1), col = cols[i % cols.length];
      ctx.globalAlpha = Math.min(1, k) * (1 - ph * 0.6);
      ctx.fillStyle = col; ctx.strokeStyle = col;
      if (fxId === 'confetti') {
        ctx.save(); ctx.translate(px + Math.sin(tm * 3 + i) * 8, y + ph * h); ctx.rotate(tm * 5 + i);
        ctx.fillRect(-4, -2, 8, 4); ctx.restore();
      } else if (fxId === 'stars') {
        UI.icon(ctx, 'star4', px, y + h - ph * h, 8 + seed * 8, col);
      } else if (fxId === 'hearts') {
        var hx = px, hy = y + h - ph * h, s = 0.6 + seed * 0.6;
        ctx.save(); ctx.translate(hx, hy); ctx.scale(s, s);
        ctx.beginPath(); ctx.moveTo(0, 4); ctx.bezierCurveTo(-9, -3, -5, -10, 0, -5); ctx.bezierCurveTo(5, -10, 9, -3, 0, 4); ctx.fill(); ctx.restore();
      } else if (fxId === 'bubbles') {
        ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(px + Math.sin(tm * 2 + i) * 6, y + h - ph * h, 3 + seed * 6, 0, 7); ctx.stroke();
      } else if (fxId === 'fireworks') {
        // three bursts that pop in turn
        var b = i % 3, bt = (tm * 0.9 + b * 0.33) % 1, bx = x + w * (0.25 + b * 0.25), by = y + h * (0.22 + (b % 2) * 0.12);
        var a = (i / n) * Math.PI * 2 * 3, r = bt * w * 0.32;
        ctx.globalAlpha = Math.min(1, k) * (1 - bt);
        ctx.beginPath(); ctx.arc(bx + Math.cos(a) * r, by + Math.sin(a) * r, 2.6, 0, 7); ctx.fill();
      } else if (fxId === 'bolts') {
        if (Math.floor(tm * 6 + i) % 5) continue;
        var lx = px, ly = y + 6;
        ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(lx, ly);
        for (var z = 1; z <= 4; z++) ctx.lineTo(lx + (z % 2 ? 7 : -7), ly + z * h * 0.12);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // The celebration card in play (and the preview in the editor).
  CB.drawCard = function (ctx, look, combo, x, y, w, h, tm, opts) {
    opts = opts || {};
    var mv = CB.at(combo, tm), fin = tm > INTRO + MOVE_T * 3 - 0.05;
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; UI.rr(ctx, x, y + 5, w, h, 20); ctx.fill();
    var g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#a855f7'); g.addColorStop(1, '#ec4899');
    ctx.fillStyle = g; UI.rr(ctx, x, y, w, h, 20); ctx.fill();
    drawFx(ctx, combo.fx, x, y, w, h, tm, fin ? 1 : 0.5);
    ctx.strokeStyle = '#fde68a'; ctx.lineWidth = 4; UI.rr(ctx, x, y, w, h, 20); ctx.stroke();
    ctx.save(); UI.rr(ctx, x, y, w, h, 20); ctx.clip();
    // the finale freezes on the last move with a little hop
    var pose = mv.id, pt = mv.t;
    AV.draw(ctx, look, x + w / 2, y + h - 10 - (fin ? Math.abs(Math.sin(tm * 9)) * 6 : 0), h * 0.6, { view: 'front', pose: pose, t: pt, shadow: false });
    ctx.restore();
    // three pips: which move is playing
    for (var i = 0; i < 3; i++) {
      ctx.fillStyle = i < mv.i || (i === mv.i && tm >= INTRO) ? '#fde68a' : 'rgba(255,255,255,0.35)';
      ctx.beginPath(); ctx.arc(x + w / 2 + (i - 1) * 14, y + h - 8, 4, 0, 7); ctx.fill();
    }
    UI.text(ctx, fin ? t('SIGNATURE!') : t(D.item('celebration', pose).name), x + w / 2, y + 16, 13, '#fff', 'center', { maxW: w - 12, stroke: '#4c1d95', strokeW: 4 });
    // the shout-out bubble pops above the card for the last move
    if (tm > CB.shoutAt || opts.alwaysShout) {
      var line = t(D.COMBO_LINES[combo.line] || D.COMBO_LINES[0]);
      var bk = opts.alwaysShout ? 1 : U.easeOutBack(Math.min(1, (tm - CB.shoutAt) * 4));
      UI.font(ctx, 16); var bw = Math.min(UI.W - 20, ctx.measureText(line).width + 28), bx = U.clamp(x + w / 2 - bw / 2, 8, UI.W - bw - 8), by = y - 44;
      ctx.save(); ctx.translate(bx + bw / 2, by + 17); ctx.scale(bk, bk); ctx.translate(-bx - bw / 2, -by - 17);
      ctx.fillStyle = '#fff'; UI.rr(ctx, bx, by, bw, 34, 17); ctx.fill();
      ctx.strokeStyle = '#111827'; ctx.lineWidth = 3; UI.rr(ctx, bx, by, bw, 34, 17); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(x + w / 2 - 8, by + 32); ctx.lineTo(x + w / 2 + 8, by + 32); ctx.lineTo(x + w / 2, by + 44); ctx.closePath(); ctx.fill();
      UI.text(ctx, line, bx + bw / 2, by + 17, 16, '#111827', 'center', { maxW: bw - 16 });
      ctx.restore();
    }
  };

  // ---------- Locker editor ----------
  function owned() { return D.ITEMS.celebration.filter(function (it) { return SS.save.owns('celebration', it.id); }); }
  function cycle(list, cur, dir) { var i = list.indexOf(cur); return list[(i + dir + list.length) % list.length]; }
  CB.drawEditor = function (ctx, W, H, ed, dt, close) {
    if (UI.blocker(ctx, 0.65, 'cbBlock')) { /* taps outside do nothing */ }
    ed.t = (ed.t || 0) + dt;
    var cb = SS.save.data.combo, w = Math.min(400, W - 20), h = Math.min(H - 24 - UI.safe.t - UI.safe.b, 620), x = (W - w) / 2, y = Math.max(10 + UI.safe.t, (H - h) / 2);
    UI.region('cbInner', x, y, w, h);
    UI.panel(ctx, x, y, w, h);
    UI.text(ctx, t('My Signature Combo'), W / 2, y + 28, 22, '#111827', 'center', { maxW: w - 30 });
    var rowH = 48, py = y + 58, ph = U.clamp(h - 58 - 46 - 10 - 5 * rowH - 24 - 76, 96, 178);
    var pw = ph / 1.15;
    // live preview (loops)
    CB.drawCard(ctx, SS.save.data.avatar, CB.get(), W / 2 - pw / 2, py + 40, pw, ph, ed.t % CB.loop);
    var ry = py + 46 + ph + 10;
    var moves = owned().map(function (it) { return it.id; });
    function row(id, label, value, onDir) {
      UI.text(ctx, label, x + 22, ry + rowH / 2 - 2, 14, '#6b7280', 'left', { maxW: 80 });
      var bw = 44, vx0 = x + 104, vx1 = x + w - 18 - bw;
      if (UI.button(ctx, id + 'L', vx0, ry + 2, bw, rowH - 8, '<', { color: '#64748b', size: 20, aria: label + ': ' + t('previous') })) onDir(-1);
      if (UI.button(ctx, id + 'R', vx1, ry + 2, bw, rowH - 8, '>', { color: '#64748b', size: 20, aria: label + ': ' + t('next') })) onDir(1);
      ctx.fillStyle = '#fff3df'; UI.rr(ctx, vx0 + bw + 6, ry + 2, vx1 - vx0 - bw - 12, rowH - 8, 12); ctx.fill();
      UI.text(ctx, value, (vx0 + bw + vx1) / 2, ry + rowH / 2 - 2, 16, '#111827', 'center', { maxW: vx1 - vx0 - bw - 20 });
      ry += rowH;
    }
    [0, 1, 2].forEach(function (i) {
      row('cbM' + i, t('Move {n}', { n: i + 1 }), t(D.item('celebration', cb.moves[i]).name), function (dir) {
        cb.moves[i] = cycle(moves, cb.moves[i], dir); SS.save.write(); ed.t = INTRO + i * MOVE_T - 0.05; A.click();
      });
    });
    row('cbFx', t('Finale'), t(CB.fx(cb.fx).name), function (dir) {
      cb.fx = cycle(D.COMBO_FX.map(function (f) { return f.id; }), cb.fx, dir); SS.save.write(); ed.t = INTRO + 3 * MOVE_T - 0.2;
    });
    row('cbLine', t('Shout'), t(D.COMBO_LINES[cb.line]), function (dir) {
      cb.line = (cb.line + dir + D.COMBO_LINES.length) % D.COMBO_LINES.length; SS.save.write(); ed.t = CB.shoutAt + 0.05;
    });
    UI.text(ctx, moves.length < 3 ? t('Buy more moves in the Locker to mix them up!') : t('Plays after swish streaks, deep swishes, clutch shots and wins.'), W / 2, ry + 10, 12, '#6b7280', 'center', { maxW: w - 30 });
    var by = y + h - 66, hw = (w - 52) / 2;
    if (UI.button(ctx, 'cbOn', x + 20, by, hw, 52, cb.on ? t('Combo ON') : t('Combo OFF'), { color: cb.on ? '#22c55e' : '#94a3b8', size: 17, icon: cb.on ? 'check' : 'close' })) {
      cb.on = !cb.on; SS.save.write(); if (cb.on) A.jingle('star');
    }
    if (UI.button(ctx, 'cbDone', x + 32 + hw, by, hw, 52, t('Done'), { color: '#3b82f6', size: 18 })) close();
  };
})();
