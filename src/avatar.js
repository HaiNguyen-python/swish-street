// Swish Street - procedural baller avatar (front and back views, poses, celebrations).
// Local units: 100 = full height. Origin at the feet, y grows downward (canvas style).
(function () {
  'use strict';
  var SS = window.SS, D = SS.D, U = SS.U;
  var AV = (SS.avatar = {});
  AV.HEIGHT_M = 1.45; // metres represented by 100 units

  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  // Resolve a look (save avatar or rival look) into colours.
  AV.resolve = function (look) {
    var j = D.item('jersey', look.jersey), s = D.item('shoes', look.shoes);
    var g = look.gear ? D.item('gear', look.gear) : null, kind = g ? g.kind : 'none';
    return {
      skin: D.SKINS[look.skin] || D.SKINS[2], hair: look.hair || 'short',
      hairColor: D.HAIR_COLORS[look.hairColor] || D.HAIR_COLORS[0],
      j1: j.c1, j2: j.c2, fade: !!j.fade, s1: s.c1, s2: s.c2, number: look.number == null ? 1 : look.number,
      headband: look.headband || (kind === 'headband' ? g.c1 : null),
      glasses: !!look.glasses || kind === 'glasses', shades: !!look.shades || kind === 'shades',
      visor: kind === 'visor' ? g.c1 : null, beanie: kind === 'beanie' ? g.c1 : null,
      phones: kind === 'phones' ? g.c1 : null, crown: kind === 'crown', wrist: kind === 'wrist' ? g.c1 : null
    };
  };

  // Arm angles: [upper, bend] per side. Angle 0 = straight down, PI = straight up.
  // legs: [left, right] swing angles (radians, 0 = straight down)
  function armPose(pose, t) {
    var L = [0.18, 0.25], R = [0.18, 0.25], body = { sx: 1, lean: 0, bob: 0, hop: 0, heart: false, flexT: 0, legs: [0, 0], tuck: 0 };
    var s = Math.sin(t * 2.2);
    switch (pose) {
      case 'idle':
        body.bob = s * 1.2; L = [0.16 + s * 0.03, 0.3]; R = [0.16 - s * 0.03, 0.3]; break;
      case 'dribble':
        var d = Math.abs(Math.sin(t * 6));
        body.bob = d * 2; R = [0.5 + d * 0.3, -0.9 + d * 0.5]; L = [0.2, 0.3]; body.legs = [0.08, -0.08]; break;
      case 'hold':
        L = [2.9, 0.75]; R = [2.9, 0.75]; body.legs = [0.06, -0.06]; break;
      case 'aim':
        L = [2.82, 0.82]; R = [2.82, 0.82]; body.bob = 2.5; body.legs = [0.1, -0.1]; break;
      case 'shoot':
        L = [2.45, 0.55]; R = [2.95, 0.12]; body.hop = -4; break;
      case 'nolook':
        // flashy behind-the-head flick, head turned away
        L = [1.2, 0.9]; R = [2.7, -0.9]; body.hop = -3; body.lean = -0.12; body.lookAway = true; break;
      case 'run':
        var rn = Math.sin(t * 13);
        L = [0.5 - rn * 0.7, 1.2]; R = [0.5 + rn * 0.7, 1.2]; body.legs = [rn * 0.55, -rn * 0.55]; body.bob = -Math.abs(rn) * 3; body.lean = 0.08; break;
      case 'dribbleRun':
        var dr = Math.sin(t * 13);
        L = [0.5 - dr * 0.6, 1.2]; R = [0.7, -0.6 + Math.abs(Math.sin(t * 6.5)) * 0.4]; body.legs = [dr * 0.55, -dr * 0.55]; body.bob = -Math.abs(dr) * 3; break;
      case 'jump':
        L = [2.95, 0.3]; R = [2.95, 0.3]; body.legs = [0.35, -0.2]; body.tuck = 0.4; break;
      case 'tomahawk':
        var tk = U.clamp(t, 0, 1);
        L = [2.6, 0.3]; R = [3.1 + tk * 0.5, 0.9 - tk * 0.6]; body.legs = [0.45, -0.3]; body.tuck = 0.6; body.lean = -0.15 * tk; break;
      case 'windmill':
        var wm = t * 9;
        R = [wm % (Math.PI * 2), 0.1]; L = [2.4, 0.4]; body.legs = [0.4, -0.25]; body.tuck = 0.5; break;
      case 'spin360':
        body.sx = Math.cos(t * 11); L = [2.9, 0.3]; R = [2.9, 0.3]; body.legs = [0.3, -0.3]; body.tuck = 0.5; break;
      case 'between':
        var bt = Math.sin(t * 8);
        L = [0.9 + bt * 0.5, 0.6]; R = [0.9 - bt * 0.5, 0.6]; body.legs = [0.9, -0.9]; body.tuck = 0.7; break;
      case 'slam':
        L = [2.95, 0.05]; R = [2.95, 0.05]; body.legs = [0.12, -0.12]; body.tuck = 0.2; break;
      case 'hang':
        var hg = Math.sin(t * 6) * 0.08;
        L = [3.05, 0.0]; R = [3.05, 0.0]; body.legs = [0.25 + hg, -0.25 + hg]; body.tuck = 0.15; break;
      case 'sad':
        L = [0.1, 0.1]; R = [0.1, 0.1]; body.bob = 2; break;
      case 'clap':
        var c = Math.abs(Math.sin(t * 9));
        L = [0.9, 1.2 + c * 0.4]; R = [0.9, 1.2 + c * 0.4]; break;
      case 'wave':
        R = [2.6, 0.3 + Math.sin(t * 8) * 0.5]; L = [0.2, 0.3]; break;
      case 'pump':
        var p = Math.max(0, Math.sin(t * 7));
        R = [2.4 + p * 0.5, 0.2 + (1 - p) * 1.4]; L = [0.3, 0.6]; body.hop = -p * 6; break;
      case 'spin':
        body.sx = Math.cos(t * 9); L = [1.2, 0.4]; R = [1.2, 0.4]; body.hop = -Math.abs(Math.sin(t * 4.5)) * 5; break;
      case 'robot':
        var st = Math.floor(t * 4) % 4;
        var pos = [[1.57, 1.57, 0.2, 0.2], [0.2, 0.2, 1.57, 1.57], [1.57, -1.57, 1.57, 1.57], [0.2, 1.57, 1.57, -1.57]][st];
        L = [pos[0], pos[1]]; R = [pos[2], pos[3]]; break;
      case 'heart':
        L = [0.85, 2.0]; R = [0.85, 2.0]; body.heart = true; body.bob = s; break;
      case 'flex':
        var f = 0.5 + 0.5 * Math.sin(t * 6);
        L = [1.6, 1.4 + f * 0.3]; R = [1.6, 1.4 + f * 0.3]; body.flexT = f; break;
      case 'bow':
        var b = U.smooth((Math.sin(t * 2.5) + 1) / 2);
        body.lean = b * 0.55; R = [0.6 + b * 0.5, 1.6]; L = [0.3 + b * 0.4, 0.3]; break;
      // v0.4 moves for the signature combo
      case 'shimmy':
        var sh = Math.sin(t * 16);
        L = [0.65, 1.45 + sh * 0.15]; R = [0.65, 1.45 - sh * 0.15]; body.lean = sh * 0.09; body.bob = Math.abs(sh) * 1.6; body.legs = [0.12, -0.12]; break;
      case 'dab':
        var dk = U.easeOutBack(U.clamp(t * 5, 0, 1));
        L = [0.3 + (-2.0 - 0.3) * dk, 0.3 + (-0.6 - 0.3) * dk]; R = [0.3 + (2.25 - 0.3) * dk, 0.05]; body.lean = -0.14 * dk; body.bob = Math.sin(t * 5) * 0.8; break;
      // ('hang', the Rim Hang celebration, reuses the Dunk Fest pose above)
    }
    return { L: L, R: R, body: body };
  }

  function drawArm(ctx, side, sh, ang, c, skin, sleeve) {
    var a1 = ang[0], a2 = ang[0] + ang[1];
    var ex = sh.x + side * Math.sin(a1) * 18, ey = sh.y + Math.cos(a1) * 18;
    var hx = ex + side * Math.sin(a2) * 17, hy = ey + Math.cos(a2) * 17;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = U.shade(skin, -0.25); ctx.lineWidth = 9.5;
    ctx.beginPath(); ctx.moveTo(sh.x, sh.y); ctx.lineTo(ex, ey); ctx.lineTo(hx, hy); ctx.stroke();
    ctx.strokeStyle = skin; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(sh.x, sh.y); ctx.lineTo(ex, ey); ctx.lineTo(hx, hy); ctx.stroke();
    // sleeve cap
    ctx.fillStyle = sleeve;
    ctx.beginPath(); ctx.arc(sh.x, sh.y + 1, 5.5, 0, Math.PI * 2); ctx.fill();
    if (c.wrist) {
      ctx.strokeStyle = c.wrist; ctx.lineWidth = 8.5; ctx.lineCap = 'butt';
      var wx0 = ex + (hx - ex) * 0.62, wy0 = ey + (hy - ey) * 0.62, wx1 = ex + (hx - ex) * 0.8, wy1 = ey + (hy - ey) * 0.8;
      ctx.beginPath(); ctx.moveTo(wx0, wy0); ctx.lineTo(wx1, wy1); ctx.stroke(); ctx.lineCap = 'round';
    }
    // hand
    ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(hx, hy, 4.6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.22)'; ctx.lineWidth = 1; ctx.stroke();
    return { x: hx, y: hy };
  }
  function drawLeg(ctx, hipX, ang, len, c, showBack, side) {
    ctx.save(); ctx.translate(hipX, -46); ctx.rotate(ang);
    ctx.fillStyle = c.skin; rr(ctx, -4.5, 0, 9, len, 4.5); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.fillRect(-4.5, len - 10, 9, 5); // sock
    // shoe
    ctx.fillStyle = c.s1; ctx.beginPath(); ctx.ellipse(showBack ? 0 : side * 1.2, len - 1.5, 9.5, 5.2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.fillStyle = c.s2; ctx.fillRect(-8, len - 0.5, 16, 2.4);
    ctx.restore();
  }
  function gearTop(ctx, c, back) {
    if (c.beanie) {
      ctx.fillStyle = c.beanie; ctx.beginPath(); ctx.arc(0, -94, 13.4, Math.PI, Math.PI * 2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = U.shade(c.beanie, -0.2); ctx.fillRect(-13.6, -96, 27.2, 5);
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0, -108, 4.2, 0, Math.PI * 2); ctx.fill();
    }
    if (c.visor) {
      ctx.fillStyle = c.visor; ctx.fillRect(-12.6, -100, 25.2, 4);
      if (!back) { ctx.beginPath(); ctx.ellipse(0, -97, 13, 4, 0, 0, Math.PI); ctx.fill(); }
    }
    if (c.phones) {
      ctx.strokeStyle = '#1f2937'; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.arc(0, -92, 14, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
      ctx.fillStyle = c.phones; rr(ctx, -16.5, -95, 6, 10, 3); ctx.fill(); rr(ctx, 10.5, -95, 6, 10, 3); ctx.fill();
    }
    if (c.crown) {
      ctx.fillStyle = '#facc15'; ctx.strokeStyle = '#a16207'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(-9, -102); ctx.lineTo(-10, -112); ctx.lineTo(-5, -107); ctx.lineTo(0, -115); ctx.lineTo(5, -107); ctx.lineTo(10, -112); ctx.lineTo(9, -102); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(0, -106, 1.6, 0, Math.PI * 2); ctx.fill();
    }
  }

  function hairBack(ctx, st, col, view) {
    ctx.fillStyle = col;
    if (st === 'braids') {
      for (var i = -1; i <= 1; i += 2) { rr(ctx, i * 12 - 4, -96, 8, 30, 4); ctx.fill(); }
      if (view === 'back') { rr(ctx, -10, -98, 20, 32, 8); ctx.fill(); }
    } else if (st === 'ponytail') {
      ctx.beginPath(); ctx.ellipse(view === 'back' ? 0 : 9, -88, 5.5, 13, view === 'back' ? 0 : 0.4, 0, Math.PI * 2); ctx.fill();
    } else if (st === 'afro') {
      ctx.beginPath(); ctx.arc(0, -94, 18.5, 0, Math.PI * 2); ctx.fill();
    } else if (st === 'hijab') {
      ctx.beginPath(); ctx.moveTo(-15, -92); ctx.quadraticCurveTo(-18, -70, -10, -68); ctx.lineTo(10, -68); ctx.quadraticCurveTo(18, -70, 15, -92); ctx.closePath(); ctx.fill();
    } else if (st === 'twists') {
      for (var k = -2; k <= 2; k++) { rr(ctx, k * 6 - 2.5, -96, 5, 20 + Math.abs(k) * -2, 2.5); ctx.fill(); }
    }
  }
  function hairFront(ctx, st, col, view) {
    ctx.fillStyle = col;
    var back = view === 'back';
    switch (st) {
      case 'short':
        ctx.beginPath(); ctx.arc(0, -92, 12.6, Math.PI * 1.02, Math.PI * 1.98); ctx.closePath(); ctx.fill();
        if (back) { ctx.beginPath(); ctx.arc(0, -92, 12.4, Math.PI * 0.9, Math.PI * 2.1); ctx.fill(); }
        else { ctx.beginPath(); ctx.ellipse(-4, -100, 9, 4, -0.3, 0, Math.PI * 2); ctx.fill(); }
        break;
      case 'buzz':
        ctx.globalAlpha = 0.85;
        ctx.beginPath(); ctx.arc(0, -91, 12.3, Math.PI * 1.05, Math.PI * 1.95); ctx.closePath(); ctx.fill();
        if (back) { ctx.beginPath(); ctx.arc(0, -91, 12.2, Math.PI * 0.85, Math.PI * 2.15); ctx.fill(); }
        ctx.globalAlpha = 1; break;
      case 'curly':
        for (var i = 0; i < 7; i++) { var a = Math.PI * (1.05 + i * 0.15); ctx.beginPath(); ctx.arc(Math.cos(a) * 11, -92 + Math.sin(a) * 11, 5.2, 0, Math.PI * 2); ctx.fill(); }
        if (back) { ctx.beginPath(); ctx.arc(0, -91, 12.5, 0, Math.PI * 2); ctx.fill(); }
        break;
      case 'afro':
        if (back) { ctx.beginPath(); ctx.arc(0, -92, 18, 0, Math.PI * 2); ctx.fill(); }
        else { ctx.beginPath(); ctx.arc(0, -98, 16, Math.PI * 0.95, Math.PI * 2.05); ctx.fill(); }
        break;
      case 'ponytail':
      case 'braids':
        ctx.beginPath(); ctx.arc(0, -92, 12.8, Math.PI * 1.0, Math.PI * 2.0); ctx.closePath(); ctx.fill();
        if (back) { ctx.beginPath(); ctx.arc(0, -91, 12.6, 0, Math.PI * 2); ctx.fill(); }
        else { ctx.beginPath(); ctx.ellipse(3, -99, 10, 4, 0.25, 0, Math.PI * 2); ctx.fill(); }
        break;
      case 'bun':
        ctx.beginPath(); ctx.arc(0, -92, 12.8, Math.PI * 1.0, Math.PI * 2.0); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.arc(0, -107, 6.5, 0, Math.PI * 2); ctx.fill();
        if (back) { ctx.beginPath(); ctx.arc(0, -91, 12.6, 0, Math.PI * 2); ctx.fill(); }
        break;
      case 'twists':
        ctx.beginPath(); ctx.arc(0, -93, 13, Math.PI * 1.0, Math.PI * 2.0); ctx.closePath(); ctx.fill();
        for (var k = -2; k <= 2; k++) { ctx.beginPath(); ctx.arc(k * 5, -104 + Math.abs(k) * 1.5, 3.4, 0, Math.PI * 2); ctx.fill(); }
        if (back) { ctx.beginPath(); ctx.arc(0, -91, 12.6, 0, Math.PI * 2); ctx.fill(); }
        break;
      case 'mohawk':
        ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.arc(0, -91, 12.3, Math.PI * 1.05, Math.PI * 1.95); ctx.fill(); ctx.globalAlpha = 1;
        rr(ctx, -3.5, -110, 7, 20, 3); ctx.fill();
        break;
      case 'hijab':
        ctx.beginPath(); ctx.arc(0, -92, 14.5, Math.PI * 0.95, Math.PI * 2.05); ctx.fill();
        if (back) { ctx.beginPath(); ctx.arc(0, -91, 14.3, 0, Math.PI * 2); ctx.fill(); }
        else {
          ctx.beginPath(); ctx.moveTo(-14.5, -92); ctx.lineTo(-13, -80); ctx.lineTo(-9, -88); ctx.closePath(); ctx.fill();
          ctx.beginPath(); ctx.moveTo(14.5, -92); ctx.lineTo(13, -80); ctx.lineTo(9, -88); ctx.closePath(); ctx.fill();
        }
        break;
      case 'cap':
        ctx.fillStyle = '#e11d48';
        ctx.beginPath(); ctx.arc(0, -94, 13, Math.PI, Math.PI * 2); ctx.closePath(); ctx.fill();
        if (!back) { ctx.fillStyle = '#9f1239'; rr(ctx, -6, -110, 12, 6, 3); ctx.fill(); }
        else { ctx.fillStyle = '#9f1239'; rr(ctx, -12, -96, 24, 5, 2.5); ctx.fill(); }
        ctx.fillStyle = col; ctx.beginPath(); ctx.arc(-11, -88, 3, 0, Math.PI * 2); ctx.arc(11, -88, 3, 0, Math.PI * 2); ctx.fill();
        break;
    }
  }

  // Draw avatar. x,y = screen position of feet; h = pixel height of 100 units.
  AV.draw = function (ctx, look, x, y, h, opts) {
    opts = opts || {};
    var c = look.j1 ? look : AV.resolve(look);
    var view = opts.view || 'front', pose = opts.pose || 'idle', t = opts.t || 0;
    // 'signature' plays the owner's celebration combo on a loop (v0.4)
    if (pose === 'signature' && SS.celebCombo) { var cm = SS.celebCombo.at(SS.celebCombo.get(), t % SS.celebCombo.loop); pose = cm.id; t = cm.t; }
    var ap = armPose(pose, t), body = ap.body, k = h / 100;
    ctx.save();
    ctx.translate(x, y + (body.hop + body.bob) * k);
    ctx.scale(k * (body.sx < 0 ? Math.max(0.15, -body.sx) : Math.max(0.15, body.sx)), k);
    var showBack = view === 'back' || body.sx < 0;
    if (opts.shadow !== false) {
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath(); ctx.ellipse(0, 0, 26, 5, 0, 0, Math.PI * 2); ctx.fill();
    }
    // legs (swing for running, tuck when airborne)
    var legLen = 42 * (1 - body.tuck * 0.35);
    drawLeg(ctx, -7.5, body.legs[0], legLen, c, showBack, -1);
    drawLeg(ctx, 7.5, body.legs[1], legLen, c, showBack, 1);
    // torso lean pivot at hips
    ctx.save();
    ctx.translate(0, -46); ctx.rotate(body.lean); ctx.translate(0, 46);
    // shorts
    ctx.fillStyle = c.j1; rr(ctx, -15, -52, 30, 22, 5); ctx.fill();
    ctx.fillStyle = c.j2; ctx.fillRect(-15, -40, 3, 10); ctx.fillRect(12, -40, 3, 10);
    ctx.fillStyle = U.shade(c.j1, -0.3); ctx.fillRect(-1, -42, 2, 12);
    // back hair layer (behind head) when front view
    if (!showBack) hairBack(ctx, c.hair, c.hairColor, 'front');
    // arms behind torso in back view drawn later; jersey
    var g;
    if (c.fade) { g = ctx.createLinearGradient(0, -80, 0, -48); g.addColorStop(0, c.j1); g.addColorStop(1, c.j2); }
    ctx.fillStyle = g || c.j1;
    ctx.beginPath();
    ctx.moveTo(-17, -78); ctx.quadraticCurveTo(-8, -73, 0, -73); ctx.quadraticCurveTo(8, -73, 17, -78);
    ctx.lineTo(16, -50); ctx.quadraticCurveTo(0, -47, -16, -50); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1.4; ctx.stroke();
    // side shading for a rounder torso
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.beginPath(); ctx.moveTo(10, -76); ctx.lineTo(16.5, -77.5); ctx.lineTo(16, -50); ctx.lineTo(10, -49); ctx.closePath(); ctx.fill();
    // trim
    ctx.strokeStyle = c.fade ? '#fff' : c.j2; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-9, -76); ctx.quadraticCurveTo(0, showBack ? -74 : -67, 9, -76); ctx.stroke();
    // number
    ctx.fillStyle = c.fade ? '#fff' : c.j2;
    ctx.font = '900 ' + (showBack ? 17 : 13) + 'px ' + SS.FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(c.number), 0, showBack ? -60 : -59);
    // neck + head
    ctx.fillStyle = U.shade(c.skin, -0.12); ctx.fillRect(-4, -82, 8, 8);
    if (showBack) hairBack(ctx, c.hair, c.hairColor, 'back');
    ctx.fillStyle = c.skin; ctx.beginPath(); ctx.arc(0, -91, 12, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.22)'; ctx.lineWidth = 1.2; ctx.stroke();
    // ears
    ctx.fillStyle = c.skin; ctx.beginPath(); ctx.arc(-12, -90, 3, 0, Math.PI * 2); ctx.arc(12, -90, 3, 0, Math.PI * 2); ctx.fill();
    if (!showBack) {
      // face (turned to the side for a no-look)
      ctx.save(); if (body.lookAway) ctx.translate(-4, 0);
      var blink = (Math.floor(t * 10) % 37) === 0;
      ctx.fillStyle = '#1c1917';
      if (blink) { ctx.fillRect(-6.5, -92, 4, 1.2); ctx.fillRect(2.5, -92, 4, 1.2); }
      else { ctx.beginPath(); ctx.arc(-4.5, -92, 1.9, 0, Math.PI * 2); ctx.arc(4.5, -92, 1.9, 0, Math.PI * 2); ctx.fill(); }
      ctx.strokeStyle = '#1c1917'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
      ctx.beginPath();
      if (pose === 'sad') ctx.arc(0, -82, 4, Math.PI * 1.2, Math.PI * 1.8);
      else ctx.arc(0, -88, 4.2, Math.PI * 0.15, Math.PI * 0.85);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,120,120,0.35)';
      ctx.beginPath(); ctx.arc(-8, -87, 2.2, 0, Math.PI * 2); ctx.arc(8, -87, 2.2, 0, Math.PI * 2); ctx.fill();
      if (c.glasses) {
        ctx.strokeStyle = '#111'; ctx.lineWidth = 1.3;
        ctx.beginPath(); ctx.arc(-4.5, -92, 3.6, 0, Math.PI * 2); ctx.moveTo(8.1, -92); ctx.arc(4.5, -92, 3.6, 0, Math.PI * 2); ctx.moveTo(-1, -92); ctx.lineTo(1, -92); ctx.stroke();
      }
      if (c.shades) {
        ctx.fillStyle = '#111'; rr(ctx, -9, -95, 7.5, 5, 2); ctx.fill(); rr(ctx, 1.5, -95, 7.5, 5, 2); ctx.fill(); ctx.fillRect(-2, -94, 4, 1.4);
        ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(-7.5, -94, 2, 1.2); ctx.fillRect(3, -94, 2, 1.2);
      }
      ctx.restore();
    }
    if (!c.beanie) hairFront(ctx, c.hair, c.hairColor, showBack ? 'back' : 'front');
    if (c.headband) { ctx.fillStyle = c.headband; ctx.fillRect(-12.5, -99, 25, 3.6); }
    gearTop(ctx, c, showBack);
    // arms
    var hl = drawArm(ctx, -1, { x: -15, y: -74 }, ap.L, c, c.skin, c.j1);
    var hr = drawArm(ctx, 1, { x: 15, y: -74 }, ap.R, c, c.skin, c.j1);
    if (body.heart) {
      ctx.fillStyle = '#ff4d6d';
      var hx = 0, hy = (hl.y + hr.y) / 2 - 2, s = 1 + 0.15 * Math.sin(t * 8);
      ctx.save(); ctx.translate(hx, hy); ctx.scale(s, s);
      ctx.beginPath(); ctx.moveTo(0, 4); ctx.bezierCurveTo(-9, -3, -5, -10, 0, -5); ctx.bezierCurveTo(5, -10, 9, -3, 0, 4); ctx.fill();
      ctx.restore();
    }
    if (opts.ball) {
      var bx = (hl.x + hr.x) / 2, by = Math.min(hl.y, hr.y) - 5;
      if (pose === 'dribble') { bx = hr.x + 2; by = -8 - Math.abs(Math.cos(t * 6)) * 32 + 32 - 30; by = hr.y + 6 + (1 - Math.abs(Math.sin(t * 6))) * 28; }
      AV.drawBall(ctx, bx, by, 8.3, opts.ballSkin || 'classic', t * 3);
    }
    ctx.restore();
    ctx.restore();
    var kx = k * Math.max(0.15, Math.abs(body.sx)), oy = y + (body.hop + body.bob) * k;
    return { handY: Math.min(hl.y, hr.y) * k,
      hands: [{ x: x + hl.x * kx, y: oy + hl.y * k }, { x: x + hr.x * kx, y: oy + hr.y * k }] };
  };

  // Basketball (2D) at x,y radius r; rot = seam rotation angle
  AV.drawBall = function (ctx, x, y, r, skinId, rot) {
    var sk = D.item('ball', skinId);
    var g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
    g.addColorStop(0, U.shade(sk.c1, 0.35)); g.addColorStop(0.6, sk.c1); g.addColorStop(1, U.shade(sk.c1, -0.35));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.save();
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.clip();
    if (sk.stripes) {
      ctx.fillStyle = sk.c2;
      ctx.save(); ctx.translate(x, y); ctx.rotate(rot * 0.3);
      ctx.fillRect(-r, -r * 0.25, r * 2, r * 0.5); ctx.restore();
    }
    if (sk.melon) {
      ctx.strokeStyle = sk.c2; ctx.lineWidth = Math.max(1, r * 0.18);
      for (var m = -2; m <= 2; m++) { ctx.beginPath(); ctx.ellipse(x + m * r * 0.45 + Math.sin(rot) * r * 0.2, y, r * 0.15, r * 1.1, 0, 0, Math.PI * 2); ctx.stroke(); }
    }
    if (sk.stars) {
      ctx.fillStyle = sk.c2;
      for (var s = 0; s < 6; s++) {
        var a = rot * 0.5 + s * 1.7, d = r * (0.25 + (s % 3) * 0.25);
        ctx.fillRect(x + Math.cos(a) * d - 1, y + Math.sin(a) * d - 1, Math.max(1.5, r * 0.12), Math.max(1.5, r * 0.12));
      }
    }
    // seams
    ctx.strokeStyle = sk.melon ? 'rgba(0,0,0,0.25)' : sk.c2;
    ctx.lineWidth = Math.max(0.8, r * 0.09);
    var c = Math.cos(rot), sn = Math.sin(rot);
    ctx.beginPath();
    // vertical great circle (rotates)
    ctx.ellipse(x, y, Math.abs(c) * r, r, 0, 0, Math.PI * 2);
    ctx.moveTo(x - r, y + sn * r * 0.15); ctx.lineTo(x + r, y + sn * r * 0.15);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(x - r * 1.05, y, r * 0.55, r * 0.95, 0, -Math.PI / 2, Math.PI / 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(x + r * 1.05, y, r * 0.55, r * 0.95, 0, Math.PI / 2, Math.PI * 1.5);
    ctx.stroke();
    ctx.restore();
    // shine
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.beginPath(); ctx.ellipse(x - r * 0.35, y - r * 0.45, r * 0.32, r * 0.18, -0.6, 0, Math.PI * 2); ctx.fill();
  };
})();
