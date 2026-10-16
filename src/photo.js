// Swish Street - Swish Cam photo studio (v0.5).
// A Swish Cam shot is rendered once (session.js) and cropped to a 272 x 286 picture. The studio
// frames it, at 300 x 380, in one of four styles and can add a sticker:
//   Polaroid (the classic), Comic (halftone page with a SFX burst), Neon (glowing night frame) and
//   Trading Card (your name, number and career numbers on the back... well, the front).
// Photos stay on the device (the album in tricks.js). Nothing here is sent anywhere.
(function () {
  'use strict';
  var SS = window.SS, U = SS.U, UI = SS.ui, D = SS.D, t = SS.t;
  var PW = 300, PH = 380, IW = 272, IH = 286;
  var PS = (SS.photoStudio = {});

  function font(c, size, weight) { c.font = (weight || 900) + ' ' + size + 'px ' + SS.FONT; }
  function fit(c, str, maxW, size, weight) {
    font(c, size, weight); var w = c.measureText(str).width;
    if (w > maxW) font(c, Math.max(8, size * maxW / w), weight);
  }
  function rr(c, x, y, w, h, r) { UI.rr(c, x, y, w, h, r); }

  // crop: canvas IW x IH. meta: { cap, nick, court, date, guest, number }
  PS.compose = function (crop, meta, frame, sticker) {
    var pc = document.createElement('canvas'); pc.width = PW; pc.height = PH;
    var c = pc.getContext('2d');
    var box = (FRAMES[frame] || FRAMES.polaroid)(c, crop, meta);
    if (sticker && sticker !== 'none') drawSticker(c, sticker, box.x + box.w - 38, box.y + 38, 30);
    return pc;
  };

  var FRAMES = {
    polaroid: function (c, crop, m) {
      c.fillStyle = '#fffdf7'; c.fillRect(0, 0, PW, PH);
      c.drawImage(crop, 14, 14, IW, IH);
      font(c, 13); c.textAlign = 'right'; c.textBaseline = 'alphabetic'; c.fillStyle = '#fb923c';
      c.fillText(m.date, 14 + IW - 8, 14 + IH - 8);
      c.textAlign = 'center'; c.fillStyle = '#111827'; fit(c, m.cap, PW - 20, 22);
      c.fillText(m.cap, PW / 2, PH - 50);
      fit(c, m.nick + '  •  ' + m.court, PW - 20, 13, 800); c.fillStyle = '#6b7280';
      c.fillText(m.nick + '  •  ' + m.court, PW / 2, PH - 26);
      return { x: 14, y: 14, w: IW, h: IH };
    },
    comic: function (c, crop, m) {
      c.fillStyle = '#fde047'; c.fillRect(0, 0, PW, PH);
      c.fillStyle = 'rgba(234,88,12,0.35)';
      for (var y = 6; y < PH; y += 12) for (var x = (y / 12) % 2 ? 6 : 12; x < PW; x += 12) { c.beginPath(); c.arc(x, y, 2.4, 0, 7); c.fill(); }
      // tilted panel
      c.save(); c.translate(PW / 2, 150); c.rotate(-0.025);
      c.fillStyle = '#111827'; c.fillRect(-IW / 2 - 6, -126, IW + 12, 252 + 12);
      c.drawImage(crop, 0, (IH - 252) / 2, IW, 252, -IW / 2, -120, IW, 252);
      c.restore();
      // caption burst
      var bx = 92, by = 300, n = 14;
      c.beginPath();
      for (var i = 0; i < n * 2; i++) { var a = i / (n * 2) * Math.PI * 2, r = i % 2 ? 44 : 64; c.lineTo(bx + Math.cos(a) * r * 1.35, by + Math.sin(a) * r * 0.62); }
      c.closePath(); c.fillStyle = '#ffffff'; c.fill(); c.lineWidth = 4; c.strokeStyle = '#111827'; c.stroke();
      c.save(); c.translate(bx, by); c.rotate(-0.12);
      c.textAlign = 'center'; c.textBaseline = 'middle'; fit(c, m.cap.toUpperCase(), 130, 24);
      c.lineWidth = 5; c.strokeStyle = '#111827'; c.lineJoin = 'round'; c.strokeText(m.cap.toUpperCase(), 0, 0);
      c.fillStyle = '#ef4444'; c.fillText(m.cap.toUpperCase(), 0, 0);
      c.restore();
      // caption box
      c.fillStyle = '#ffffff'; c.fillRect(170, 318, 118, 50); c.lineWidth = 3; c.strokeStyle = '#111827'; c.strokeRect(170, 318, 118, 50);
      c.fillStyle = '#111827'; c.textAlign = 'center'; c.textBaseline = 'middle';
      fit(c, m.nick, 108, 14); c.fillText(m.nick, 229, 335);
      fit(c, m.court, 108, 11, 800); c.fillText(m.court, 229, 354);
      return { x: PW / 2 - IW / 2, y: 30, w: IW, h: 252 };
    },
    neon: function (c, crop, m) {
      var g = c.createLinearGradient(0, 0, 0, PH); g.addColorStop(0, '#0b1026'); g.addColorStop(1, '#2e1065');
      c.fillStyle = g; c.fillRect(0, 0, PW, PH);
      c.fillStyle = 'rgba(255,255,255,0.7)';
      for (var i = 0; i < 26; i++) { var sx = (i * 97) % PW, sy = (i * 53) % PH; c.fillRect(sx, sy, 1.5, 1.5); }
      c.drawImage(crop, 14, 14, IW, IH);
      // glowing tubes (a one-off picture, so a little blur is fine here)
      c.save(); c.shadowColor = '#22d3ee'; c.shadowBlur = 16; c.strokeStyle = '#67e8f9'; c.lineWidth = 4; rr(c, 10, 10, IW + 8, IH + 8, 10); c.stroke(); c.restore();
      c.save(); c.shadowColor = '#f472b6'; c.shadowBlur = 14; c.strokeStyle = '#f9a8d4'; c.lineWidth = 3; rr(c, 4, 4, PW - 8, PH - 8, 16); c.stroke(); c.restore();
      c.textAlign = 'center'; c.textBaseline = 'alphabetic';
      c.save(); c.shadowColor = '#ec4899'; c.shadowBlur = 12; fit(c, m.cap, PW - 30, 26); c.fillStyle = '#fdf2f8'; c.fillText(m.cap, PW / 2, PH - 46); c.restore();
      fit(c, m.nick + '  •  ' + m.court, PW - 30, 13, 800); c.fillStyle = '#67e8f9'; c.fillText(m.nick + '  •  ' + m.court, PW / 2, PH - 22);
      font(c, 11, 800); c.textAlign = 'right'; c.fillStyle = 'rgba(103,232,249,0.85)'; c.fillText(m.date, 14 + IW - 8, 14 + IH - 8);
      return { x: 14, y: 14, w: IW, h: IH };
    },
    card: function (c, crop, m) {
      var g = c.createLinearGradient(0, 0, PW, PH); g.addColorStop(0, '#fde68a'); g.addColorStop(0.5, '#facc15'); g.addColorStop(1, '#b45309');
      c.fillStyle = g; rr(c, 0, 0, PW, PH, 18); c.fill();
      c.fillStyle = '#1e1b4b'; rr(c, 10, 10, PW - 20, PH - 20, 12); c.fill();
      // name banner and number
      c.fillStyle = '#7c3aed'; c.fillRect(10, 16, PW - 20, 34);
      c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillStyle = '#ffffff'; fit(c, m.nick.toUpperCase(), PW - 90, 18); c.fillText(m.nick.toUpperCase(), 22, 33);
      c.fillStyle = '#facc15'; c.beginPath(); c.arc(PW - 36, 33, 20, 0, 7); c.fill(); c.lineWidth = 3; c.strokeStyle = '#111827'; c.stroke();
      c.fillStyle = '#111827'; c.textAlign = 'center'; font(c, 17); c.fillText('#' + (m.number != null ? m.number : '?'), PW - 36, 34);
      // photo
      var px = 22, py = 58, pw = PW - 44, ph = 196, sh = IW * ph / pw;
      c.drawImage(crop, 0, Math.max(0, (IH - sh) / 2), IW, Math.min(IH, sh), px, py, pw, ph);
      c.lineWidth = 3; c.strokeStyle = '#facc15'; c.strokeRect(px, py, pw, ph);
      // shot name ribbon
      c.fillStyle = '#ef4444'; c.beginPath(); c.moveTo(px - 6, py + ph - 14); c.lineTo(px + pw + 6, py + ph - 14); c.lineTo(px + pw - 4, py + ph + 6); c.lineTo(px + pw + 6, py + ph + 26); c.lineTo(px - 6, py + ph + 26); c.lineTo(px + 4, py + ph + 6); c.closePath(); c.fill();
      c.fillStyle = '#ffffff'; fit(c, m.cap.toUpperCase(), pw - 30, 18); c.fillText(m.cap.toUpperCase(), PW / 2, py + ph + 7);
      // the numbers
      var sy = py + ph + 36, lines;
      if (m.guest || !SS.career) lines = [[t('GUEST STAR'), m.court]];
      else {
        var d = SS.save.data, rk = SS.career.rank();
        lines = [[t('RANK'), t(rk.name)], [t('MAKES'), String(d.stats.makes)], [t('SWISHES'), String(d.stats.swishes)], [t('TRICKS'), SS.save.trickCount() + '/' + D.TRICKS.length]];
      }
      var cw = (PW - 44) / lines.length;
      lines.forEach(function (l, i) {
        var cx = 22 + cw * i + cw / 2;
        c.fillStyle = 'rgba(255,255,255,0.08)'; rr(c, 22 + cw * i + 2, sy, cw - 4, 50, 8); c.fill();
        c.fillStyle = '#c4b5fd'; fit(c, l[0], cw - 8, 10, 800); c.fillText(l[0], cx, sy + 14);
        c.fillStyle = '#fde68a'; fit(c, l[1], cw - 8, 15); c.fillText(l[1], cx, sy + 34);
      });
      c.fillStyle = 'rgba(255,255,255,0.5)'; font(c, 9, 800); c.fillText('SWISH STREET  •  ' + m.date, PW / 2, PH - 18);
      return { x: px, y: py, w: pw, h: ph };
    }
  };

  // Round white stickers, slightly tilted, like real ones.
  function drawSticker(c, id, x, y, r) {
    c.save(); c.translate(x, y); c.rotate(0.18);
    if (id === 'splash') {
      c.fillStyle = 'rgba(0,0,0,0.25)'; rr(c, -r * 1.55 + 2, -r * 0.7 + 3, r * 3.1, r * 1.4, r * 0.6); c.fill();
      c.fillStyle = '#ffffff'; rr(c, -r * 1.55, -r * 0.7, r * 3.1, r * 1.4, r * 0.6); c.fill();
      c.beginPath(); c.moveTo(-r * 0.6, r * 0.6); c.lineTo(-r * 0.9, r * 1.2); c.lineTo(-r * 0.1, r * 0.6); c.fill();
      c.fillStyle = '#2563eb'; c.textAlign = 'center'; c.textBaseline = 'middle'; fit(c, 'SPLASH!', r * 2.8, r * 0.75); c.fillText('SPLASH!', 0, 1);
      c.restore(); return;
    }
    c.fillStyle = 'rgba(0,0,0,0.25)'; c.beginPath(); c.arc(2, 3, r, 0, 7); c.fill();
    c.fillStyle = '#ffffff'; c.beginPath(); c.arc(0, 0, r, 0, 7); c.fill();
    if (id === 'star') UI.star(c, 0, 0, r * 0.72, true, '#facc15');
    else if (id === 'crown') UI.icon(c, 'crown', 0, r * 0.05, r * 1.35, '#eab308');
    else if (id === 'heart') {
      c.fillStyle = '#f43f5e'; c.beginPath(); c.moveTo(0, r * 0.55);
      c.bezierCurveTo(-r * 0.95, -r * 0.05, -r * 0.45, -r * 0.8, 0, -r * 0.3); c.bezierCurveTo(r * 0.45, -r * 0.8, r * 0.95, -r * 0.05, 0, r * 0.55); c.fill();
    } else if (id === 'flame') {
      c.fillStyle = '#f97316'; c.beginPath(); c.moveTo(0, -r * 0.75);
      c.bezierCurveTo(r * 0.7, -r * 0.2, r * 0.55, r * 0.6, 0, r * 0.62); c.bezierCurveTo(-r * 0.55, r * 0.6, -r * 0.7, -r * 0.1, -r * 0.15, -r * 0.35);
      c.quadraticCurveTo(-r * 0.05, -r * 0.05, 0, -r * 0.75); c.fill();
      c.fillStyle = '#facc15'; c.beginPath(); c.moveTo(0, -r * 0.15); c.bezierCurveTo(r * 0.35, r * 0.15, r * 0.25, r * 0.5, 0, r * 0.5); c.bezierCurveTo(-r * 0.25, r * 0.5, -r * 0.3, r * 0.15, 0, -r * 0.15); c.fill();
    }
    c.restore();
  }
  PS.FRAMES = Object.keys(FRAMES);
})();
