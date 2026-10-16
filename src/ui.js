// Swish Street - immediate-mode canvas UI: chunky buttons, panels, text, toasts, icons.
(function () {
  'use strict';
  var SS = window.SS, U = SS.U;
  var UI = (SS.ui = {});
  var rects = [], prevRects = [];
  UI.pressed = null; UI.clicked = null; UI.pressT = 0;
  UI.W = 400; UI.H = 700; UI.u = 4; UI.safe = { t: 0, b: 0, l: 0, r: 0 };

  UI.begin = function () { prevRects = rects; rects = []; };
  UI.hit = function (x, y) {
    for (var i = prevRects.length - 1; i >= 0; i--) {
      var r = prevRects[i];
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return r;
    }
    return null;
  };
  UI.region = function (id, x, y, w, h) { rects.push({ id: id, x: x, y: y, w: w, h: h }); };
  UI.consume = function (id) {
    if (UI.clicked === id) { UI.clicked = null; return true; }
    return false;
  };

  UI.rr = function (ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  };
  UI.font = function (ctx, size, weight) { ctx.font = (weight || 900) + ' ' + Math.round(size) + 'px ' + SS.FONT; };
  // Larger text option: small body text grows (maxW still keeps it inside its box).
  UI.big = false;
  UI.ts = function (size) { return UI.big && size < 20 ? size * (size < 15 ? 1.25 : 1.15) : size; };
  UI.text = function (ctx, str, x, y, size, color, align, opts) {
    opts = opts || {};
    if (!opts.raw) size = UI.ts(size);
    UI.font(ctx, size, opts.weight);
    ctx.textAlign = align || 'center'; ctx.textBaseline = opts.baseline || 'middle';
    if (opts.maxW) {
      var w = ctx.measureText(str).width;
      if (w > opts.maxW) { UI.font(ctx, size * opts.maxW / w, opts.weight); }
    }
    if (opts.stroke) {
      ctx.lineJoin = 'round'; ctx.lineWidth = opts.strokeW || size * 0.22; ctx.strokeStyle = opts.stroke;
      ctx.strokeText(str, x, y);
    }
    if (opts.shadow) { ctx.fillStyle = opts.shadow; ctx.fillText(str, x, y + size * 0.08); }
    ctx.fillStyle = color || '#fff';
    ctx.fillText(str, x, y);
  };
  UI.countLines = function (ctx, str, maxW, size) {
    UI.font(ctx, UI.ts(size), 800);
    var words = String(str).split(' '), n = 1, cur = '';
    for (var i = 0; i < words.length; i++) {
      var test = cur ? cur + ' ' + words[i] : words[i];
      if (ctx.measureText(test).width > maxW && cur) { n++; cur = words[i]; } else cur = test;
    }
    return n;
  };
  // word-wrapped text; returns height used
  UI.wrap = function (ctx, str, x, y, maxW, size, color, align, lineH) {
    var s0 = size; size = UI.ts(size);
    if (lineH) lineH *= size / s0;
    UI.font(ctx, size, 800);
    var words = String(str).split(' '), lines = [], cur = '';
    for (var i = 0; i < words.length; i++) {
      var test = cur ? cur + ' ' + words[i] : words[i];
      if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = words[i]; } else cur = test;
    }
    if (cur) lines.push(cur);
    lineH = lineH || size * 1.25;
    ctx.textAlign = align || 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = color || '#fff';
    for (var j = 0; j < lines.length; j++) ctx.fillText(lines[j], x, y + j * lineH);
    return lines.length * lineH;
  };

  // Chunky 3D button. Returns true when clicked.
  UI.button = function (ctx, id, x, y, w, h, label, opts) {
    opts = opts || {};
    var dis = !!opts.disabled;
    if (!dis || opts.clickDisabled) UI.region(id, x, y, w, h);
    if (SS.a11y) SS.a11y.note(id, opts.aria || (label ? label + (opts.sub ? ', ' + opts.sub : '') : (UI.ICON_NAMES[opts.icon] && SS.t(UI.ICON_NAMES[opts.icon])) || id), x, y, w, h, dis);
    var down = UI.pressed === id;
    var col = dis ? '#9ca3af' : (opts.color || '#ff7a1a');
    var depth = Math.max(4, h * 0.1), off = down ? depth * 0.7 : 0;
    var r = opts.radius != null ? opts.radius : Math.min(h * 0.32, 22);
    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    UI.rr(ctx, x, y + depth + 2, w, h, r); ctx.fill();
    ctx.fillStyle = U.shade(col, -0.32);
    UI.rr(ctx, x, y + depth, w, h, r); ctx.fill();
    ctx.fillStyle = col;
    UI.rr(ctx, x, y + off, w, h, r); ctx.fill();
    // highlight
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    UI.rr(ctx, x + 4, y + off + 3, w - 8, h * 0.42, r * 0.8); ctx.fill();
    if (opts.outline !== false) { ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 2; UI.rr(ctx, x, y + off, w, h, r); ctx.stroke(); }
    var fs = opts.size || Math.min(h * 0.42, w * 0.16 + 6);
    var tx = x + w / 2, ty = y + off + h / 2 + (opts.sub ? -fs * 0.35 : 0);
    if (opts.icon) {
      var iw = fs * 1.2;
      UI.font(ctx, fs); var tw = ctx.measureText(label).width;
      var total = label ? iw + fs * 0.4 + tw : iw;
      var ix = tx - total / 2 + iw / 2;
      UI.icon(ctx, opts.icon, ix, ty, iw, opts.iconColor || '#fff');
      if (label) UI.text(ctx, label, ix + iw / 2 + fs * 0.4, ty, fs, opts.textColor || '#fff', 'left', { stroke: 'rgba(0,0,0,0.25)', strokeW: fs * 0.16, maxW: w - iw - fs, raw: true });
    } else if (label) {
      UI.text(ctx, label, tx, ty, fs, opts.textColor || '#fff', 'center', { stroke: 'rgba(0,0,0,0.25)', strokeW: fs * 0.16, maxW: w - 16, raw: true });
    }
    if (opts.sub) UI.text(ctx, opts.sub, tx, ty + fs * 0.95, fs * 0.55 * (UI.big ? 1.15 : 1), 'rgba(255,255,255,0.92)', 'center', { weight: 800, maxW: w - 12, raw: true });
    if (opts.badge) {
      ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(x + w - 6, y + 6, 11, 0, 7); ctx.fill();
      UI.text(ctx, opts.badge, x + w - 6, y + 6, 12, '#fff');
    }
    return !dis && UI.consume(id);
  };

  UI.panel = function (ctx, x, y, w, h, opts) {
    opts = opts || {};
    var r = opts.radius || 24;
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; UI.rr(ctx, x, y + 6, w, h, r); ctx.fill();
    ctx.fillStyle = opts.color || '#fff8ec'; UI.rr(ctx, x, y, w, h, r); ctx.fill();
    ctx.strokeStyle = opts.border || '#1f2937'; ctx.lineWidth = opts.borderW || 4; UI.rr(ctx, x, y, w, h, r); ctx.stroke();
  };
  // Fullscreen click blocker (for modals)
  UI.blocker = function (ctx, alpha, id) {
    UI.region(id || 'blocker', 0, 0, UI.W, UI.H);
    ctx.fillStyle = 'rgba(10,12,30,' + (alpha == null ? 0.55 : alpha) + ')';
    ctx.fillRect(0, 0, UI.W, UI.H);
    return UI.consume(id || 'blocker');
  };

  UI.coinIcon = function (ctx, x, y, r) {
    ctx.fillStyle = '#b45309'; ctx.beginPath(); ctx.arc(x, y + r * 0.12, r, 0, 7); ctx.fill();
    ctx.fillStyle = '#facc15'; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    ctx.strokeStyle = '#fde68a'; ctx.lineWidth = Math.max(1, r * 0.15); ctx.beginPath(); ctx.arc(x, y, r * 0.65, 0, 7); ctx.stroke();
    UI.text(ctx, 'S', x, y + r * 0.05, r * 1.05, '#b45309');
  };
  UI.star = function (ctx, x, y, r, filled, color) {
    ctx.beginPath();
    for (var i = 0; i < 10; i++) {
      var a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.48 : r;
      if (i) ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); else ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fillStyle = filled ? (color || '#facc15') : 'rgba(0,0,0,0.25)'; ctx.fill();
    ctx.lineWidth = Math.max(1.5, r * 0.16); ctx.strokeStyle = filled ? '#92400e' : 'rgba(255,255,255,0.5)'; ctx.lineJoin = 'round'; ctx.stroke();
  };
  // Simple vector icons
  UI.icon = function (ctx, name, x, y, s, color) {
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = color || '#fff'; ctx.strokeStyle = color || '#fff'; ctx.lineWidth = s * 0.12; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    var h = s / 2;
    switch (name) {
      case 'pause': ctx.fillRect(-h * 0.6, -h * 0.7, h * 0.4, h * 1.4); ctx.fillRect(h * 0.2, -h * 0.7, h * 0.4, h * 1.4); break;
      case 'play': ctx.beginPath(); ctx.moveTo(-h * 0.5, -h * 0.7); ctx.lineTo(h * 0.75, 0); ctx.lineTo(-h * 0.5, h * 0.7); ctx.closePath(); ctx.fill(); break;
      case 'back': ctx.beginPath(); ctx.moveTo(h * 0.5, -h * 0.7); ctx.lineTo(-h * 0.4, 0); ctx.lineTo(h * 0.5, h * 0.7); ctx.stroke(); break;
      case 'gear':
        for (var i = 0; i < 8; i++) { ctx.save(); ctx.rotate(i * Math.PI / 4); ctx.fillRect(-h * 0.17, -h * 0.95, h * 0.34, h * 0.4); ctx.restore(); }
        ctx.beginPath(); ctx.arc(0, 0, h * 0.62, 0, 7); ctx.fill();
        ctx.globalCompositeOperation = 'destination-out'; ctx.beginPath(); ctx.arc(0, 0, h * 0.25, 0, 7); ctx.fill(); ctx.globalCompositeOperation = 'source-over';
        break;
      case 'shirt':
        ctx.beginPath(); ctx.moveTo(-h * 0.45, -h * 0.8); ctx.lineTo(-h * 0.9, -h * 0.4); ctx.lineTo(-h * 0.6, -h * 0.1); ctx.lineTo(-h * 0.55, h * 0.85);
        ctx.lineTo(h * 0.55, h * 0.85); ctx.lineTo(h * 0.6, -h * 0.1); ctx.lineTo(h * 0.9, -h * 0.4); ctx.lineTo(h * 0.45, -h * 0.8);
        ctx.quadraticCurveTo(0, -h * 0.4, -h * 0.45, -h * 0.8); ctx.fill(); break;
      case 'map':
        ctx.beginPath(); ctx.arc(0, -h * 0.25, h * 0.55, Math.PI, 0); ctx.lineTo(0, h * 0.9); ctx.closePath(); ctx.fill();
        ctx.globalCompositeOperation = 'destination-out'; ctx.beginPath(); ctx.arc(0, -h * 0.25, h * 0.22, 0, 7); ctx.fill(); ctx.globalCompositeOperation = 'source-over';
        break;
      case 'bolt':
        ctx.beginPath(); ctx.moveTo(h * 0.2, -h * 0.95); ctx.lineTo(-h * 0.55, h * 0.1); ctx.lineTo(-h * 0.05, h * 0.1); ctx.lineTo(-h * 0.2, h * 0.95); ctx.lineTo(h * 0.55, -h * 0.15); ctx.lineTo(h * 0.05, -h * 0.15); ctx.closePath(); ctx.fill(); break;
      case 'cal':
        ctx.fillRect(-h * 0.8, -h * 0.6, h * 1.6, h * 1.4); ctx.fillRect(-h * 0.5, -h * 0.9, h * 0.2, h * 0.5); ctx.fillRect(h * 0.3, -h * 0.9, h * 0.2, h * 0.5);
        ctx.globalCompositeOperation = 'destination-out'; ctx.fillRect(-h * 0.6, -h * 0.15, h * 1.2, h * 0.75); ctx.globalCompositeOperation = 'source-over';
        ctx.fillRect(-h * 0.4, h * 0.0, h * 0.3, h * 0.25); break;
      case 'retry':
        ctx.beginPath(); ctx.arc(0, 0, h * 0.62, -0.4, Math.PI * 1.5); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(h * 0.15, -h * 0.98); ctx.lineTo(h * 0.55, -h * 0.6); ctx.lineTo(h * 0.0, -h * 0.35); ctx.fill(); break;
      case 'lock':
        ctx.beginPath(); ctx.arc(0, -h * 0.25, h * 0.42, Math.PI, 0); ctx.stroke(); UI.rr(ctx, -h * 0.65, -h * 0.25, h * 1.3, h * 1.05, h * 0.2); ctx.fill(); break;
      case 'ball':
        ctx.beginPath(); ctx.arc(0, 0, h * 0.85, 0, 7); ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = s * 0.07; ctx.beginPath(); ctx.moveTo(-h * 0.85, 0); ctx.lineTo(h * 0.85, 0); ctx.moveTo(0, -h * 0.85); ctx.lineTo(0, h * 0.85);
        ctx.moveTo(-h * 0.55, -h * 0.65); ctx.quadraticCurveTo(-h * 0.2, 0, -h * 0.55, h * 0.65); ctx.moveTo(h * 0.55, -h * 0.65); ctx.quadraticCurveTo(h * 0.2, 0, h * 0.55, h * 0.65); ctx.stroke(); break;
      case 'glass':
        ctx.strokeRect(-h * 0.85, -h * 0.65, h * 1.7, h * 1.2); ctx.strokeRect(-h * 0.3, -h * 0.2, h * 0.6, h * 0.45); break;
      case 'net':
        ctx.beginPath(); ctx.ellipse(0, -h * 0.55, h * 0.8, h * 0.22, 0, 0, 7); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-h * 0.8, -h * 0.55); ctx.lineTo(-h * 0.4, h * 0.8); ctx.lineTo(h * 0.4, h * 0.8); ctx.lineTo(h * 0.8, -h * 0.55);
        ctx.moveTo(-h * 0.4, -h * 0.45); ctx.lineTo(h * 0.1, h * 0.8); ctx.moveTo(h * 0.4, -h * 0.45); ctx.lineTo(-h * 0.1, h * 0.8); ctx.stroke(); break;
      case 'check':
        ctx.lineWidth = s * 0.18; ctx.beginPath(); ctx.moveTo(-h * 0.6, 0); ctx.lineTo(-h * 0.15, h * 0.5); ctx.lineTo(h * 0.65, -h * 0.5); ctx.stroke(); break;
      case 'close':
        ctx.lineWidth = s * 0.16; ctx.beginPath(); ctx.moveTo(-h * 0.5, -h * 0.5); ctx.lineTo(h * 0.5, h * 0.5); ctx.moveTo(h * 0.5, -h * 0.5); ctx.lineTo(-h * 0.5, h * 0.5); ctx.stroke(); break;
      case 'dice':
        UI.rr(ctx, -h * 0.8, -h * 0.8, h * 1.6, h * 1.6, h * 0.3); ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,0.6)'; [[-0.4, -0.4], [0.4, 0.4], [0, 0], [0.4, -0.4], [-0.4, 0.4]].forEach(function (p) { ctx.beginPath(); ctx.arc(p[0] * h, p[1] * h, h * 0.15, 0, 7); ctx.fill(); });
        break;
      case 'bounce':
        ctx.beginPath(); ctx.arc(h * 0.35, -h * 0.45, h * 0.35, 0, 7); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-h * 0.85, -h * 0.75); ctx.lineTo(-h * 0.2, h * 0.65); ctx.lineTo(h * 0.15, -h * 0.05); ctx.stroke();
        ctx.fillRect(-h * 0.9, h * 0.72, h * 1.8, h * 0.16); break;
      case 'eye':
        ctx.beginPath(); ctx.moveTo(-h * 0.9, 0); ctx.quadraticCurveTo(0, h * 0.75, h * 0.9, 0); ctx.stroke();
        for (var e = -2; e <= 2; e++) { ctx.beginPath(); ctx.moveTo(e * h * 0.32, h * 0.3); ctx.lineTo(e * h * 0.42, h * 0.62); ctx.stroke(); }
        break;
      case 'nolook':
        ctx.beginPath(); ctx.moveTo(-h * 0.9, 0); ctx.quadraticCurveTo(0, -h * 0.8, h * 0.9, 0); ctx.quadraticCurveTo(0, h * 0.8, -h * 0.9, 0); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 0, h * 0.28, 0, 7); ctx.fill();
        ctx.lineWidth = s * 0.14; ctx.beginPath(); ctx.moveTo(-h * 0.8, -h * 0.8); ctx.lineTo(h * 0.8, h * 0.8); ctx.stroke(); break;
      case 'move':
        ctx.beginPath(); ctx.moveTo(-h * 0.9, 0); ctx.lineTo(h * 0.9, 0); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-h * 0.9, 0); ctx.lineTo(-h * 0.45, -h * 0.4); ctx.lineTo(-h * 0.45, h * 0.4); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(h * 0.9, 0); ctx.lineTo(h * 0.45, -h * 0.4); ctx.lineTo(h * 0.45, h * 0.4); ctx.closePath(); ctx.fill(); break;
      case 'mic':
        UI.rr(ctx, -h * 0.3, -h * 0.85, h * 0.6, h * 1.0, h * 0.3); ctx.fill();
        ctx.beginPath(); ctx.arc(0, -h * 0.15, h * 0.52, 0.1, Math.PI - 0.1); ctx.stroke();
        ctx.fillRect(-h * 0.06, h * 0.35, h * 0.12, h * 0.4); ctx.fillRect(-h * 0.35, h * 0.7, h * 0.7, h * 0.14); break;
      case 'crown':
        ctx.beginPath(); ctx.moveTo(-h * 0.85, h * 0.55); ctx.lineTo(-h * 0.9, -h * 0.45); ctx.lineTo(-h * 0.4, h * 0.05); ctx.lineTo(0, -h * 0.75);
        ctx.lineTo(h * 0.4, h * 0.05); ctx.lineTo(h * 0.9, -h * 0.45); ctx.lineTo(h * 0.85, h * 0.55); ctx.closePath(); ctx.fill(); break;
      case 'dunk':
        ctx.beginPath(); ctx.ellipse(0, -h * 0.2, h * 0.75, h * 0.22, 0, 0, 7); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, -h * 0.65, h * 0.3, 0, 7); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-h * 0.6, -h * 0.05); ctx.lineTo(-h * 0.35, h * 0.85); ctx.moveTo(h * 0.6, -h * 0.05); ctx.lineTo(h * 0.35, h * 0.85); ctx.moveTo(0, -h * 0.0); ctx.lineTo(0, h * 0.85); ctx.stroke(); break;
      case 'clock':
        ctx.beginPath(); ctx.arc(0, 0, h * 0.8, 0, 7); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -h * 0.5); ctx.moveTo(0, 0); ctx.lineTo(h * 0.38, h * 0.12); ctx.stroke(); break;
      case 'trophy':
        ctx.beginPath(); ctx.moveTo(-h * 0.6, -h * 0.8); ctx.lineTo(h * 0.6, -h * 0.8); ctx.quadraticCurveTo(h * 0.6, h * 0.2, 0, h * 0.25); ctx.quadraticCurveTo(-h * 0.6, h * 0.2, -h * 0.6, -h * 0.8); ctx.fill();
        ctx.fillRect(-h * 0.12, h * 0.2, h * 0.24, h * 0.4); ctx.fillRect(-h * 0.45, h * 0.55, h * 0.9, h * 0.25);
        ctx.beginPath(); ctx.arc(-h * 0.6, -h * 0.4, h * 0.3, Math.PI * 0.5, Math.PI * 1.5); ctx.stroke(); ctx.beginPath(); ctx.arc(h * 0.6, -h * 0.4, h * 0.3, -Math.PI * 0.5, Math.PI * 0.5); ctx.stroke();
        break;
      case 'camera':
        UI.rr(ctx, -h * 0.9, -h * 0.5, h * 1.8, h * 1.25, h * 0.25); ctx.fill(); ctx.fillRect(-h * 0.35, -h * 0.75, h * 0.7, h * 0.3);
        ctx.globalCompositeOperation = 'destination-out'; ctx.beginPath(); ctx.arc(0, h * 0.12, h * 0.42, 0, 7); ctx.fill(); ctx.globalCompositeOperation = 'source-over';
        ctx.beginPath(); ctx.arc(0, h * 0.12, h * 0.24, 0, 7); ctx.fill(); break;
      case 'star4':
        ctx.beginPath(); ctx.moveTo(0, -h); ctx.lineTo(h * 0.28, -h * 0.28); ctx.lineTo(h, 0); ctx.lineTo(h * 0.28, h * 0.28); ctx.lineTo(0, h);
        ctx.lineTo(-h * 0.28, h * 0.28); ctx.lineTo(-h, 0); ctx.lineTo(-h * 0.28, -h * 0.28); ctx.closePath(); ctx.fill(); break;
      case 'book':
        ctx.beginPath(); ctx.moveTo(0, -h * 0.55); ctx.quadraticCurveTo(-h * 0.5, -h * 0.85, -h * 0.95, -h * 0.6); ctx.lineTo(-h * 0.95, h * 0.7); ctx.quadraticCurveTo(-h * 0.5, h * 0.45, 0, h * 0.75);
        ctx.quadraticCurveTo(h * 0.5, h * 0.45, h * 0.95, h * 0.7); ctx.lineTo(h * 0.95, -h * 0.6); ctx.quadraticCurveTo(h * 0.5, -h * 0.85, 0, -h * 0.55); ctx.fill();
        ctx.globalCompositeOperation = 'destination-out'; ctx.fillRect(-h * 0.05, -h * 0.5, h * 0.1, h * 1.2); ctx.globalCompositeOperation = 'source-over'; break;
      case 'crew':
        ctx.beginPath(); ctx.arc(0, -h * 0.35, h * 0.32, 0, 7); ctx.arc(-h * 0.62, -h * 0.15, h * 0.24, 0, 7); ctx.arc(h * 0.62, -h * 0.15, h * 0.24, 0, 7); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-h * 0.5, h * 0.85); ctx.quadraticCurveTo(0, -h * 0.25, h * 0.5, h * 0.85); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-h * 1.0, h * 0.7); ctx.quadraticCurveTo(-h * 0.62, -h * 0.05, -h * 0.25, h * 0.7); ctx.fill();
        ctx.beginPath(); ctx.moveTo(h * 0.25, h * 0.7); ctx.quadraticCurveTo(h * 0.62, -h * 0.05, h * 1.0, h * 0.7); ctx.fill(); break;
      case 'globe':
        ctx.beginPath(); ctx.arc(0, 0, h * 0.82, 0, 7); ctx.stroke();
        ctx.lineWidth = s * 0.08; ctx.beginPath(); ctx.ellipse(0, 0, h * 0.36, h * 0.82, 0, 0, 7); ctx.moveTo(-h * 0.82, 0); ctx.lineTo(h * 0.82, 0);
        ctx.moveTo(-h * 0.7, -h * 0.42); ctx.lineTo(h * 0.7, -h * 0.42); ctx.moveTo(-h * 0.7, h * 0.42); ctx.lineTo(h * 0.7, h * 0.42); ctx.stroke(); break;
      case 'trick':
        ctx.beginPath(); ctx.arc(h * 0.15, h * 0.2, h * 0.55, 0, 7); ctx.fill();
        ctx.lineWidth = s * 0.1; ctx.setLineDash([s * 0.08, s * 0.1]);
        ctx.beginPath(); ctx.moveTo(-h * 0.95, h * 0.9); ctx.quadraticCurveTo(-h * 0.9, -h * 1.0, h * 0.1, -h * 0.5); ctx.stroke(); ctx.setLineDash([]);
        ctx.beginPath(); ctx.moveTo(h * 0.75, -h * 0.95); ctx.lineTo(h * 0.85, -h * 0.65); ctx.lineTo(h * 1.0, -h * 0.75); ctx.fill(); break;
    }
    ctx.restore();
  };

  // Toasts (top-of-screen messages)
  var toasts = [];
  UI.toast = function (msg, color) { toasts.push({ msg: msg, t: 0, color: color || '#1f2937' }); if (SS.a11y) SS.a11y.say(msg); };
  // Spoken names for icon-only buttons (screen readers).
  UI.ICON_NAMES = { pause: 'Pause', back: 'Back', gear: 'Settings', close: 'Close', camera: 'Swish Cam', book: 'Story', play: 'Play', trophy: 'Trophy Room' };
  UI.drawToasts = function (ctx, dt) {
    var y = UI.safe.t + 70;
    for (var i = 0; i < toasts.length; i++) {
      var tt = toasts[i]; tt.t += dt;
      var a = tt.t < 0.25 ? tt.t / 0.25 : tt.t > 2.4 ? Math.max(0, 1 - (tt.t - 2.4) / 0.4) : 1;
      ctx.globalAlpha = a;
      UI.font(ctx, 18); var w = Math.min(UI.W - 32, ctx.measureText(tt.msg).width + 40);
      ctx.fillStyle = tt.color; UI.rr(ctx, UI.W / 2 - w / 2, y - 22 + (1 - a) * -20, w, 44, 22); ctx.fill();
      UI.text(ctx, tt.msg, UI.W / 2, y + (1 - a) * -20, 18, '#fff', 'center', { maxW: w - 24 });
      ctx.globalAlpha = 1;
      y += 54;
    }
    toasts = toasts.filter(function (x) { return x.t < 2.8; });
  };

  // Coins chip
  UI.coins = function (ctx, x, y, n, h) {
    h = h || 40;
    UI.font(ctx, h * 0.5); var tw = ctx.measureText(String(n)).width;
    var w = tw + h * 1.4;
    ctx.fillStyle = 'rgba(15,23,42,0.75)'; UI.rr(ctx, x - w, y, w, h, h / 2); ctx.fill();
    UI.coinIcon(ctx, x - w + h * 0.5, y + h / 2, h * 0.32);
    UI.text(ctx, String(n), x - h * 0.35, y + h / 2 + 1, h * 0.5, '#fde68a', 'right');
    return w;
  };
})();
