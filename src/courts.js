// Swish Street - the second half of the Street Tour: Beach Boardwalk, Subway Plaza,
// Snowy Court and The Arena Final. Each plugs into the renderer's extension tables.
(function () {
  'use strict';
  var SS = window.SS, U = SS.U, R = SS.render, P = SS.Phys;
  var E = R.ENVS;
  var pt = { x: 0, y: 0, s: 0, z: 0 };

  function reduced() { return SS.save && SS.save.data.settings.reduced; }
  function quad(ctx, cam, pts, fill) { if (cam.polyPath(ctx, pts)) { ctx.fillStyle = fill; ctx.fill(); } }
  // Axis-aligned box: only the faces that can face the camera are drawn.
  function box(ctx, cam, x0, y0, z0, x1, y1, z1, front, side, top) {
    if (cam.x < x0) quad(ctx, cam, [[x0, y0, z0], [x0, y1, z0], [x0, y1, z1], [x0, y0, z1]], side || front);
    if (cam.x > x1) quad(ctx, cam, [[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]], side || front);
    if (cam.y > y1) quad(ctx, cam, [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], top || front);
    if (cam.z < z0) quad(ctx, cam, [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0]], front);
  }
  R.box = box;
  function blob(ctx, cam, x, y, z, r, fill) {
    if (!cam.project(x, y, z, pt)) return false;
    ctx.fillStyle = fill; ctx.beginPath(); ctx.arc(pt.x, pt.y, Math.max(1, r * pt.s), 0, 7); ctx.fill();
    return true;
  }

  // ======================= BEACH BOARDWALK =======================
  E.beach = {
    sky: ['#38bdf8', '#fef3c7'], far: '#f3d9a4', outside: '#f0d39b', court: '#c68a52', key: '#2bb7c9', line: '#ffffff',
    ring: '#0e7490', crowd: ['#f43f5e', '#facc15', '#22d3ee', '#a3e635', '#fb923c', '#e879f9'], tint: 'rgba(255,220,150,0.06)',
    planks: 'rgba(90,50,20,0.25)', haze: 'rgba(255,255,255,0.45)', wind: true
  };
  R.PANO.beach = function (c, pw, ph, r, H) {
    var base = ph, k = H / 800;
    // sun + glow
    var sx = pw * 0.62, sy = ph * 0.35;
    var g = c.createRadialGradient(sx, sy, 5, sx, sy, ph * 0.6);
    g.addColorStop(0, 'rgba(255,250,210,0.95)'); g.addColorStop(0.2, 'rgba(255,240,180,0.45)'); g.addColorStop(1, 'rgba(255,240,180,0)');
    c.fillStyle = g; c.fillRect(0, 0, pw, ph);
    c.fillStyle = '#fffbe6'; c.beginPath(); c.arc(sx, sy, 34 * k, 0, 7); c.fill();
    // fluffy clouds
    c.fillStyle = 'rgba(255,255,255,0.9)';
    for (var i = 0; i < 8; i++) {
      var x = r() * pw, y = ph * r.range(0.08, 0.45), s = r.range(26, 60) * k;
      for (var j = 0; j < 4; j++) { c.beginPath(); c.arc(x + j * s * 0.6, y + Math.sin(j * 1.7) * s * 0.18, s * r.range(0.45, 0.7), 0, 7); c.fill(); }
    }
    // distant islands and a sailboat
    c.fillStyle = '#7fb6a8';
    for (i = 0; i < 4; i++) {
      var ix = r() * pw, iw = r.range(80, 200) * k, ih = r.range(14, 34) * k;
      c.beginPath(); c.moveTo(ix - iw / 2, base); c.quadraticCurveTo(ix, base - ih * 2, ix + iw / 2, base); c.fill();
    }
    for (i = 0; i < 3; i++) {
      var bx = r() * pw, bs = r.range(10, 16) * k;
      c.fillStyle = '#ffffff'; c.beginPath(); c.moveTo(bx, base - bs * 2.4); c.lineTo(bx + bs, base - bs * 0.5); c.lineTo(bx, base - bs * 0.5); c.fill();
      c.fillStyle = '#ef4444'; c.fillRect(bx - bs * 0.6, base - bs * 0.5, bs * 1.8, bs * 0.4);
    }
  };
  R.SURROUND.beach = function (ctx, cam, time) {
    // sea (beyond the boardwalk) with rolling wave lines, then sand
    quad(ctx, cam, [[-400, 0, 10], [400, 0, 10], [400, 0, 600], [-400, 0, 600]], '#1fa2d6');
    quad(ctx, cam, [[-400, 0, 10], [400, 0, 10], [400, 0, 16], [-400, 0, 16]], '#4cc3e8');
    ctx.strokeStyle = 'rgba(255,255,255,0.65)'; ctx.lineWidth = Math.max(1, cam.F * 0.003); ctx.beginPath();
    for (var w = 0; w < 4; w++) {
      var z = 10.2 + ((time * 0.8 + w * 2.2) % 9);
      cam.line(ctx, -30, 0, z, 30, 0, z);
    }
    ctx.stroke();
    quad(ctx, cam, [[-30, 0, -24], [30, 0, -24], [30, 0, 10.4], [-30, 0, 10.4]], E.beach.outside);
    // foam edge
    var fz = 10.2 + Math.sin(time * 0.9) * 0.35;
    quad(ctx, cam, [[-30, 0, fz - 0.25], [30, 0, fz - 0.25], [30, 0, fz + 0.15], [-30, 0, fz + 0.15]], 'rgba(255,255,255,0.8)');
    // boardwalk deck around the court
    quad(ctx, cam, [[-8.6, 0, 3.6], [8.6, 0, 3.6], [8.6, 0, -13], [-8.6, 0, -13]], '#a8743f');
  };
  function palm(ctx, cam, x, z, time, h) {
    h = h || 6;
    ctx.strokeStyle = '#8b5a2b'; ctx.lineCap = 'round';
    if (!cam.project(x, 0, z, pt)) return;
    ctx.lineWidth = Math.max(2, pt.s * 0.28);
    ctx.beginPath(); cam.line(ctx, x, 0, z, x + 0.3, h * 0.5, z); cam.line(ctx, x + 0.3, h * 0.5, z, x + 0.7, h, z); ctx.stroke();
    if (!cam.project(x + 0.7, h, z, pt)) return;
    var sway = Math.sin(time * 1.3 + x) * 0.08;
    ctx.fillStyle = '#2f9e44';
    for (var i = 0; i < 6; i++) {
      var a = i / 6 * Math.PI * 2 + sway, len = pt.s * 2.1;
      ctx.beginPath(); ctx.moveTo(pt.x, pt.y);
      ctx.quadraticCurveTo(pt.x + Math.cos(a) * len * 0.6, pt.y - len * 0.35, pt.x + Math.cos(a) * len, pt.y + Math.abs(Math.sin(a)) * len * 0.25 + len * 0.15);
      ctx.quadraticCurveTo(pt.x + Math.cos(a) * len * 0.5, pt.y - len * 0.15, pt.x, pt.y + 2);
      ctx.fill();
    }
    ctx.fillStyle = '#6b4423'; ctx.beginPath(); ctx.arc(pt.x, pt.y + pt.s * 0.15, pt.s * 0.18, 0, 7); ctx.fill();
  }
  function umbrella(ctx, cam, x, z, c1, c2) {
    ctx.strokeStyle = '#e5e7eb'; ctx.lineWidth = Math.max(1.5, cam.F * 0.003);
    ctx.beginPath(); cam.line(ctx, x, 0, z, x, 2.1, z); ctx.stroke();
    if (!cam.project(x, 2.1, z, pt)) return;
    var r = pt.s * 1.2;
    for (var i = 0; i < 6; i++) {
      ctx.fillStyle = i % 2 ? c1 : c2;
      ctx.beginPath(); ctx.moveTo(pt.x, pt.y - r * 0.25);
      ctx.lineTo(pt.x - r + i * r / 3, pt.y + r * 0.12); ctx.lineTo(pt.x - r + (i + 1) * r / 3, pt.y + r * 0.12); ctx.fill();
    }
  }
  R.PROPS.beach = function (ctx, cam, time, world) {
    palm(ctx, cam, -7.8, 9.5, time, 6.5);
    palm(ctx, cam, 4.8, 10.5, time, 7);
    palm(ctx, cam, 9.8, 7.5, time, 6.2);
    palm(ctx, cam, -12, -2, time, 6);
    palm(ctx, cam, 12.5, -5, time, 6.5);
    // lifeguard tower (back left): legs, cabin, roof, flag that shows the breeze
    var lx = -4.4, lz = 8.2;
    ctx.strokeStyle = '#f8fafc'; ctx.lineWidth = Math.max(2, cam.F * 0.006); ctx.beginPath();
    cam.line(ctx, lx - 0.9, 0, lz - 0.6, lx - 0.7, 2.6, lz - 0.5); cam.line(ctx, lx + 0.9, 0, lz - 0.6, lx + 0.7, 2.6, lz - 0.5);
    cam.line(ctx, lx - 0.9, 0, lz + 0.6, lx - 0.7, 2.6, lz + 0.5); cam.line(ctx, lx + 0.9, 0, lz + 0.6, lx + 0.7, 2.6, lz + 0.5);
    cam.line(ctx, lx - 0.85, 1.2, lz - 0.6, lx + 0.85, 1.2, lz - 0.6); ctx.stroke();
    box(ctx, cam, lx - 1.0, 2.6, lz - 0.7, lx + 1.0, 3.9, lz + 0.7, '#ef4444', '#b91c1c', '#ef4444');
    quad(ctx, cam, [[lx - 0.7, 3.0, lz - 0.71], [lx + 0.7, 3.0, lz - 0.71], [lx + 0.7, 3.6, lz - 0.71], [lx - 0.7, 3.6, lz - 0.71]], '#fde68a');
    quad(ctx, cam, [[lx - 1.25, 3.9, lz - 0.95], [lx + 1.25, 3.9, lz - 0.95], [lx, 4.6, lz], [lx, 4.6, lz]], '#fbbf24');
    R.drawFlag(ctx, cam, lx + 0.9, lz - 0.4, world ? (world.windShow != null ? world.windShow : world.windX) : 0, time, '#facc15');
    // boardwalk railing behind the hoop
    ctx.strokeStyle = '#7c4a1e'; ctx.lineWidth = Math.max(2, cam.F * 0.005); ctx.beginPath();
    for (var x = -8.5; x <= 8.5; x += 1.7) cam.line(ctx, x, 0, 3.6, x, 1.05, 3.6);
    cam.line(ctx, -8.6, 1.05, 3.6, 8.6, 1.05, 3.6); cam.line(ctx, -8.6, 0.6, 3.6, 8.6, 0.6, 3.6);
    ctx.stroke();
    umbrella(ctx, cam, 2.9, 6.6, '#f43f5e', '#ffffff');
    umbrella(ctx, cam, -7.4, 5.2, '#22d3ee', '#ffffff');
    umbrella(ctx, cam, 10.5, 1.5, '#facc15', '#16a34a');
    // a sandcastle and a beach ball in the sand
    box(ctx, cam, 4.4, 0, 5.0, 5.2, 0.45, 5.6, '#e9c46a', '#d4a94f', '#f4d58d');
    box(ctx, cam, 4.6, 0.45, 5.15, 5.0, 0.75, 5.45, '#e9c46a', '#d4a94f', '#f4d58d');
    if (cam.project(-2.6, 0.32, 5.4, pt)) SS.avatar.drawBall(ctx, pt.x, pt.y, pt.s * 0.32, 'neon', 0.4);
  };
  R.CROWD.beach = function (add, r) {
    var i;
    for (i = 0; i < 6; i++) add(-8.6 + i * 0.75 + r.range(-0.2, 0.2), 4.4 + r.range(-0.3, 0.6));
    for (i = 0; i < 6; i++) add(4.2 + i * 0.75 + r.range(-0.2, 0.2), 4.4 + r.range(-0.3, 0.6));
    for (i = 0; i < 4; i++) add(-10 + r.range(-0.4, 0.4), -1 - i * 1.4);
    for (i = 0; i < 4; i++) add(10 + r.range(-0.4, 0.4), -1 - i * 1.4);
  };
  // decorative gulls circling high above (screen space, cheap)
  R.WEATHER.beach = function (ctx, cam, W, H, time) {
    ctx.strokeStyle = 'rgba(40,40,50,0.8)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    for (var i = 0; i < 3; i++) {
      var a = time * (0.25 + i * 0.07) + i * 2.1;
      var x = W * (0.5 + Math.cos(a) * 0.38), y = H * (0.1 + i * 0.05 + Math.sin(a * 1.3) * 0.03);
      var f = Math.sin(time * 7 + i) * 4, s = 9 - i * 2;
      ctx.beginPath(); ctx.moveTo(x - s, y - f * 0.5); ctx.quadraticCurveTo(x - s * 0.4, y - s * 0.5 - f, x, y); ctx.quadraticCurveTo(x + s * 0.4, y - s * 0.5 - f, x + s, y - f * 0.5); ctx.stroke();
    }
  };

  // A gull drawn in the world (for the Gull Patrol obstacle).
  R.drawGull = function (ctx, cam, x, y, z, time, dir, tumble) {
    if (!cam.project(x, y, z, pt)) return;
    var s = pt.s * 0.42, flap = Math.sin(time * 14) * 0.6;
    ctx.save(); ctx.translate(pt.x, pt.y); ctx.scale(dir < 0 ? -1 : 1, 1);
    if (tumble) ctx.rotate(tumble);
    // shadow-ish outline
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#334155'; ctx.lineWidth = Math.max(1, s * 0.08);
    ctx.beginPath(); ctx.ellipse(0, 0, s * 0.75, s * 0.32, 0, 0, 7); ctx.fill(); ctx.stroke();
    // wings
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath(); ctx.moveTo(-s * 0.2, -s * 0.1); ctx.quadraticCurveTo(-s * 0.5, -s * (0.9 + flap), -s * 1.3, -s * (0.5 + flap)); ctx.quadraticCurveTo(-s * 0.6, -s * 0.15, s * 0.2, -s * 0.05); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(s * 0.1, -s * 0.1); ctx.quadraticCurveTo(s * 0.3, -s * (0.8 + flap), s * 0.9, -s * (0.55 + flap)); ctx.quadraticCurveTo(s * 0.5, -s * 0.12, s * 0.3, -s * 0.05); ctx.fill(); ctx.stroke();
    // head, eye, beak
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(s * 0.72, -s * 0.18, s * 0.24, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#111827'; ctx.beginPath(); ctx.arc(s * 0.8, -s * 0.24, s * 0.05, 0, 7); ctx.fill();
    ctx.fillStyle = '#f59e0b'; ctx.beginPath(); ctx.moveTo(s * 0.92, -s * 0.18); ctx.lineTo(s * 1.25, -s * 0.1); ctx.lineTo(s * 0.92, -s * 0.06); ctx.fill();
    ctx.restore();
  };

  // ======================= SUBWAY PLAZA =======================
  E.subway = {
    sky: ['#1e1b4b', '#fb923c'], far: '#3f3f46', outside: '#57534e', court: '#334155', key: '#7c3aed', line: '#fde047',
    ring: '#6d28d9', crowd: ['#f472b6', '#22d3ee', '#facc15', '#a3e635', '#f97316', '#e5e7eb'], tint: 'rgba(80,40,140,0.07)',
    haze: 'rgba(251,146,60,0.35)'
  };
  R.PANO.subway = function (c, pw, ph, r, H) {
    var base = ph, k = H / 800;
    c.fillStyle = 'rgba(255,255,255,0.7)';
    for (var i = 0; i < 40; i++) c.fillRect(r() * pw, r() * ph * 0.4, 1.5, 1.5);
    for (var layer = 0; layer < 2; layer++) {
      for (var x = 0, w; x < pw; x += w) {
        w = r.range(36, 100) * k; var h = r.range(90, 320) * k * (layer ? 1 : 0.75);
        c.fillStyle = layer ? '#1c1533' : '#3b2b5c'; c.fillRect(x, base - h, w - 3, h);
        if (layer) {
          for (var wy = base - h + 8; wy < base - 6; wy += 12) for (var wx = x + 5; wx < x + w - 8; wx += 9)
            if (r() < 0.3) { c.fillStyle = r() < 0.5 ? '#fcd34d' : '#a5b4fc'; c.fillRect(wx, wy, 4, 5); }
          if (r() < 0.25) { // rooftop billboard
            c.fillStyle = r.pick(['#ec4899', '#22d3ee', '#a3e635']); c.fillRect(x + 4, base - h - 26 * k, w - 12, 18 * k);
          }
        }
      }
    }
  };
  R.SURROUND.subway = function (ctx, cam, time) {
    quad(ctx, cam, [[-30, 0, -24], [30, 0, -24], [30, 0, 9], [-30, 0, 9]], E.subway.outside);
    // paving tiles
    ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 1; ctx.beginPath();
    for (var x = -12; x <= 12; x += 1.2) cam.line(ctx, x, 0, 9, x, 0, -20);
    for (var z = -20; z <= 9; z += 1.2) cam.line(ctx, -12, 0, z, 12, 0, z);
    ctx.stroke();
  };
  var TRAIN_CARS = 4, CAR_L = 7.5;
  R.PROPS.subway = function (ctx, cam, time, world) {
    var tz = 8, deckY = 5.2;
    // pillars and the elevated deck
    for (var x = -12; x <= 12; x += 6) box(ctx, cam, x - 0.35, 0, tz - 0.35, x + 0.35, deckY, tz + 0.35, '#78716c', '#57534e', '#a8a29e');
    // train (behind the deck front so it looks like it runs on top)
    var tr = R.dyn.train;
    if (tr && tr.on) {
      for (var cI = 0; cI < TRAIN_CARS; cI++) {
        var x0 = tr.x - cI * (CAR_L + 0.4) * tr.dir, x1 = x0 - CAR_L * tr.dir;
        var a = Math.min(x0, x1), b = Math.max(x0, x1);
        if (b < -40 || a > 40) continue;
        box(ctx, cam, a, deckY + 0.6, tz - 1.2, b, deckY + 3.4, tz + 1.2, '#cbd5e1', '#94a3b8', '#e2e8f0');
        quad(ctx, cam, [[a, deckY + 2.3, tz - 1.21], [b, deckY + 2.3, tz - 1.21], [b, deckY + 2.55, tz - 1.21], [a, deckY + 2.55, tz - 1.21]], '#7c3aed');
        for (var wI = 0; wI < 5; wI++) {
          var wx = a + 0.6 + wI * (b - a - 1.2) / 5;
          quad(ctx, cam, [[wx, deckY + 1.5, tz - 1.21], [wx + 0.9, deckY + 1.5, tz - 1.21], [wx + 0.9, deckY + 2.2, tz - 1.21], [wx, deckY + 2.2, tz - 1.21]], '#fef3c7');
        }
      }
    }
    box(ctx, cam, -40, deckY, tz - 1.4, 40, deckY + 0.6, tz + 1.4, '#57534e', '#44403c', '#78716c');
    // graffiti wall behind the hoop
    quad(ctx, cam, [[-9, 0, 4.6], [9, 0, 4.6], [9, 2.6, 4.6], [-9, 2.6, 4.6]], '#6b7280');
    var cols = ['#ec4899', '#22d3ee', '#facc15', '#a3e635', '#f97316', '#8b5cf6'];
    var rr = U.rng(77);
    for (var g = 0; g < 14; g++) {
      var gx = -8.5 + rr() * 17, gy = 0.5 + rr() * 1.7, gr = 0.3 + rr() * 0.5;
      if (cam.project(gx, gy, 4.58, pt)) {
        ctx.fillStyle = cols[g % cols.length]; ctx.beginPath(); ctx.ellipse(pt.x, pt.y, gr * pt.s * 1.4, gr * pt.s * 0.7, rr() * 3, 0, 7); ctx.fill();
      }
    }
    if (cam.project(-4.5, 1.4, 4.57, pt)) {
      ctx.font = '900 ' + Math.max(8, pt.s * 0.9) + 'px ' + SS.FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = Math.max(2, pt.s * 0.12); ctx.strokeStyle = '#111827'; ctx.strokeText('SWISH', pt.x, pt.y);
      ctx.fillStyle = '#fde047'; ctx.fillText('SWISH', pt.x, pt.y);
    }
    // station sign with a glowing globe
    ctx.strokeStyle = '#1f2937'; ctx.lineWidth = Math.max(2, cam.F * 0.005); ctx.beginPath(); cam.line(ctx, 6.5, 0, 4.2, 6.5, 3.4, 4.2); ctx.stroke();
    if (cam.project(6.5, 3.6, 4.2, pt)) {
      var gg = ctx.createRadialGradient(pt.x, pt.y, 1, pt.x, pt.y, pt.s * 0.9);
      gg.addColorStop(0, 'rgba(134,239,172,0.9)'); gg.addColorStop(1, 'rgba(134,239,172,0)');
      ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.s * 0.9, 0, 7); ctx.fill();
      ctx.fillStyle = '#4ade80'; ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.s * 0.25, 0, 7); ctx.fill();
    }
    // street lamps
    for (var s = -1; s <= 1; s += 2) {
      var lx = s * 8.6;
      ctx.strokeStyle = '#27272a'; ctx.lineWidth = Math.max(2, cam.F * 0.006); ctx.beginPath(); cam.line(ctx, lx, 0, 2, lx, 4.6, 2); ctx.stroke();
      if (cam.project(lx, 4.7, 2, pt)) {
        var lg = ctx.createRadialGradient(pt.x, pt.y, 1, pt.x, pt.y, pt.s * 1.4);
        lg.addColorStop(0, 'rgba(255,230,160,0.85)'); lg.addColorStop(1, 'rgba(255,200,120,0)');
        ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.s * 1.4, 0, 7); ctx.fill();
      }
    }
  };
  R.CROWD.subway = function (add, r) {
    var i;
    for (i = 0; i < 7; i++) add(-8.2 + i * 0.75 + r.range(-0.2, 0.2), 3.7 + r.range(-0.3, 0.3));
    for (i = 0; i < 7; i++) add(3.4 + i * 0.75 + r.range(-0.2, 0.2), 3.7 + r.range(-0.3, 0.3));
    for (i = 0; i < 3; i++) add(-9.5, -2 - i * 1.5);
    for (i = 0; i < 3; i++) add(9.5, -2 - i * 1.5);
  };
  // Trains run every ~22 s. They rumble, shake the ground and (in some challenges) blow a gust.
  R.TICK.subway = function (dt, S) {
    var d = R.dyn;
    if (!d.train) d.train = { on: false, x: 0, dir: 1, next: S ? 7 : 3 };
    var tr = d.train;
    if (!tr.on) {
      tr.next -= dt;
      if (tr.next <= 0) {
        tr.on = true; tr.dir = Math.random() < 0.5 ? 1 : -1; tr.x = -tr.dir * 45; tr.honked = false;
        if (S) { SS.audio.train(); if (S.mode.onTrain) S.mode.onTrain(S); else S.mcPick('train', null, 0.6); }
      }
    } else {
      tr.x += tr.dir * 26 * dt;
      var tail = tr.x - tr.dir * TRAIN_CARS * (CAR_L + 0.4);
      if (S && Math.abs(tr.x) < 40 && !reduced()) S.shake = Math.max(S.shake, 1.2);
      if (tr.dir * tail > 45) { tr.on = false; tr.next = 20 + Math.random() * 6; }
    }
  };

  // ======================= SNOWY COURT =======================
  E.snow = {
    sky: ['#7fb3e6', '#eef6ff'], far: '#f1f5f9', outside: '#e8eef5', court: '#9ec8ec', key: '#e11d48', line: '#ffffff',
    ring: '#1e40af', crowd: ['#ef4444', '#22c55e', '#f59e0b', '#3b82f6', '#ec4899', '#14b8a6'], tint: 'rgba(200,225,255,0.08)',
    haze: 'rgba(255,255,255,0.55)', physics: { eRim: 0.66, muRim: 0.13 }
  };
  R.PANO.snow = function (c, pw, ph, r, H) {
    var base = ph, k = H / 800;
    // mountains with snow caps
    for (var layer = 0; layer < 2; layer++) {
      for (var x = -100; x < pw + 100;) {
        var w = r.range(180, 360) * k, h = r.range(120, 260) * k * (layer ? 0.7 : 1);
        c.fillStyle = layer ? '#94a3b8' : '#b8c6d8';
        c.beginPath(); c.moveTo(x, base); c.lineTo(x + w / 2, base - h); c.lineTo(x + w, base); c.fill();
        c.fillStyle = '#ffffff';
        c.beginPath(); c.moveTo(x + w / 2, base - h); c.lineTo(x + w / 2 - w * 0.12, base - h * 0.75); c.lineTo(x + w / 2 - w * 0.03, base - h * 0.8);
        c.lineTo(x + w / 2 + w * 0.04, base - h * 0.72); c.lineTo(x + w / 2 + w * 0.12, base - h * 0.76); c.fill();
        x += w * 0.6;
      }
    }
    // pine forest line
    for (x = 0; x < pw; x += r.range(14, 26) * k) {
      var th = r.range(30, 60) * k;
      c.fillStyle = '#1f5f3f'; c.beginPath(); c.moveTo(x, base - th); c.lineTo(x - th * 0.32, base); c.lineTo(x + th * 0.32, base); c.fill();
      c.fillStyle = '#ffffff'; c.beginPath(); c.moveTo(x, base - th); c.lineTo(x - th * 0.12, base - th * 0.62); c.lineTo(x + th * 0.12, base - th * 0.62); c.fill();
    }
  };
  R.SURROUND.snow = function (ctx, cam, time) {
    quad(ctx, cam, [[-30, 0, -24], [30, 0, -24], [30, 0, 40], [-30, 0, 40]], E.snow.outside);
    // cleared border around the court
    quad(ctx, cam, [[-8.3, 0, 2.4], [8.3, 0, 2.4], [8.3, 0, -12.6], [-8.3, 0, -12.6]], '#cbd5e1');
  };
  function pine(ctx, cam, x, z, h) {
    if (!cam.project(x, 0, z, pt)) return;
    for (var i = 0; i < 3; i++) {
      var y0 = h * (0.2 + i * 0.25), y1 = y0 + h * 0.45, w = h * (0.32 - i * 0.07);
      quad(ctx, cam, [[x - w, y0, z], [x + w, y0, z], [x, y1, z]], i % 2 ? '#1f6b45' : '#17573a');
      quad(ctx, cam, [[x - w * 0.35, y1 - h * 0.13, z - 0.01], [x + w * 0.35, y1 - h * 0.13, z - 0.01], [x, y1, z - 0.01]], '#ffffff');
    }
    ctx.strokeStyle = '#5b3a1e'; ctx.lineWidth = Math.max(2, pt.s * 0.18); ctx.beginPath(); cam.line(ctx, x, 0, z, x, h * 0.2, z); ctx.stroke();
  }
  function snowman(ctx, cam, x, z) {
    blob(ctx, cam, x, 0.45, z, 0.48, '#ffffff');
    blob(ctx, cam, x, 1.15, z, 0.34, '#ffffff');
    blob(ctx, cam, x, 1.68, z, 0.24, '#ffffff');
    if (cam.project(x, 1.68, z - 0.2, pt)) {
      ctx.fillStyle = '#111827';
      ctx.beginPath(); ctx.arc(pt.x - pt.s * 0.08, pt.y - pt.s * 0.05, pt.s * 0.03, 0, 7); ctx.arc(pt.x + pt.s * 0.08, pt.y - pt.s * 0.05, pt.s * 0.03, 0, 7); ctx.fill();
      ctx.fillStyle = '#f97316'; ctx.beginPath(); ctx.moveTo(pt.x, pt.y); ctx.lineTo(pt.x + pt.s * 0.22, pt.y + pt.s * 0.03); ctx.lineTo(pt.x, pt.y + pt.s * 0.06); ctx.fill();
      ctx.fillStyle = '#e11d48'; ctx.fillRect(pt.x - pt.s * 0.22, pt.y + pt.s * 0.17, pt.s * 0.44, pt.s * 0.08);
    }
    box(ctx, cam, x - 0.2, 1.88, z - 0.2, x + 0.2, 2.2, z + 0.2, '#111827', '#111827', '#1f2937');
  }
  R.PROPS.snow = function (ctx, cam, time, world) {
    pine(ctx, cam, -8, 8, 5.5); pine(ctx, cam, -4.5, 10, 6.5); pine(ctx, cam, 3.5, 11, 6); pine(ctx, cam, 8.5, 7.5, 5);
    pine(ctx, cam, -11, 2, 5); pine(ctx, cam, 11.5, 0, 5.5); pine(ctx, cam, -12, -6, 6); pine(ctx, cam, 12, -9, 6);
    // snowbanks along the back
    for (var x = -9; x <= 9; x += 1.5) {
      if (cam.project(x, 0.1, 3.4 + Math.sin(x) * 0.3, pt)) {
        ctx.fillStyle = '#f8fafc'; ctx.beginPath(); ctx.ellipse(pt.x, pt.y, pt.s * 1.1, pt.s * 0.45, 0, Math.PI, 0); ctx.fill();
      }
    }
    snowman(ctx, cam, 5.4, 4.2);
    // little cabin with warm windows
    box(ctx, cam, -7.5, 0, 6.5, -4.5, 2.2, 8.5, '#92400e', '#78350f', '#92400e');
    quad(ctx, cam, [[-7.8, 2.2, 6.3], [-4.2, 2.2, 6.3], [-6, 3.4, 7.5], [-6, 3.4, 7.5]], '#ffffff');
    quad(ctx, cam, [[-6.9, 0.9, 6.49], [-6.2, 0.9, 6.49], [-6.2, 1.6, 6.49], [-6.9, 1.6, 6.49]], '#fcd34d');
    quad(ctx, cam, [[-5.6, 0.9, 6.49], [-4.9, 0.9, 6.49], [-4.9, 1.6, 6.49], [-5.6, 1.6, 6.49]], '#fcd34d');
  };
  R.CROWD.snow = function (add, r) {
    var i;
    for (i = 0; i < 6; i++) add(-8 + i * 0.8 + r.range(-0.2, 0.2), 3.0 + r.range(-0.2, 0.3));
    for (i = 0; i < 6; i++) add(3.6 + i * 0.8 + r.range(-0.2, 0.2), 3.0 + r.range(-0.2, 0.3));
  };
  var flakes = null;
  R.WEATHER.snow = function (ctx, cam, W, H, time) {
    var n = reduced() ? 24 : 80;
    if (!flakes || flakes.length !== n) {
      flakes = []; var r = U.rng(5);
      for (var i = 0; i < n; i++) flakes.push({ x: r(), y: r(), s: r.range(1.2, 3.6), sp: r.range(0.04, 0.12), ph: r() * 6 });
    }
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    var yawOff = cam.yaw * 0.3;
    for (var j = 0; j < flakes.length; j++) {
      var f = flakes[j];
      var y = ((f.y + time * f.sp) % 1) * (H + 20) - 10;
      var x = (((f.x - yawOff + Math.sin(time * 0.8 + f.ph) * 0.02) % 1) + 1) % 1 * W;
      ctx.beginPath(); ctx.arc(x, y, f.s, 0, 7); ctx.fill();
    }
    // snow cap on top of the backboard
    var inPlay = SS.sceneName === 'play' && SS.play, w = inPlay ? SS.play.world : null, hx = w ? w.hx : 0;
    var vis = inPlay && !SS.play.replay ? SS.play.hoopVis : 1; // fades with the hoop for "Eyes Closed"
    if (vis > 0.01 && cam.polyPath(ctx, [[hx - P.BOARD_HW - 0.03, P.BOARD_Y1, P.BOARD_Z - 0.03], [hx + P.BOARD_HW + 0.03, P.BOARD_Y1, P.BOARD_Z - 0.03],
      [hx + P.BOARD_HW - 0.1, P.BOARD_Y1 + 0.09, P.BOARD_Z], [hx - P.BOARD_HW + 0.2, P.BOARD_Y1 + 0.11, P.BOARD_Z]])) { ctx.globalAlpha = vis; ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.globalAlpha = 1; }
  };

  // ======================= THE ARENA FINAL =======================
  E.arena = {
    indoor: true, sky: ['#05050f', '#1e1b4b'], far: '#0f172a', outside: '#111827', court: '#d9a066', key: '#b91c1c', line: '#ffffff',
    ring: '#b91c1c', crowd: ['#ef4444', '#facc15', '#ffffff', '#3b82f6', '#a855f7', '#22c55e', '#f97316'], tint: null,
    planks: 'rgba(110,60,20,0.2)'
  };
  R.SURROUND.arena = function (ctx, cam, time) {
    quad(ctx, cam, [[-30, 0, -26], [30, 0, -26], [30, 0, 14], [-30, 0, 14]], '#0b1020');
    quad(ctx, cam, [[-8.8, 0, 3.4], [8.8, 0, 3.4], [8.8, 0, -13.5], [-8.8, 0, -13.5]], '#1e293b');
    // court-side LED board
    quad(ctx, cam, [[-8.8, 0, 3.39], [8.8, 0, 3.39], [8.8, 0.8, 3.39], [-8.8, 0.8, 3.39]], '#111827');
  };
  R.PROPS.arena = function (ctx, cam, time, world) {
    // tiered stands behind the hoop and both sides
    for (var row = 0; row < 7; row++) {
      var z = 4.6 + row * 1.1, y = row * 0.75;
      quad(ctx, cam, [[-20, y, z - 0.5], [20, y, z - 0.5], [20, y + 0.75, z - 0.5], [-20, y + 0.75, z - 0.5]], row % 2 ? '#1f2937' : '#273449');
    }
    for (var s = -1; s <= 1; s += 2) {
      for (var r2 = 0; r2 < 5; r2++) {
        var x = s * (10 + r2 * 1.1), y2 = r2 * 0.75;
        quad(ctx, cam, [[x, y2, 4], [x, y2, -20], [x, y2 + 0.75, -20], [x, y2 + 0.75, 4]], r2 % 2 ? '#1f2937' : '#273449');
      }
    }
    // LED ribbon text along the court-side board (scrolling)
    if (cam.project(0, 0.4, 3.38, pt)) {
      var msg = '  SWISH STREET FINAL  *  ', w = Math.max(10, pt.s * 0.55);
      ctx.save();
      if (cam.polyPath(ctx, [[-8.8, 0.1, 3.38], [8.8, 0.1, 3.38], [8.8, 0.7, 3.38], [-8.8, 0.7, 3.38]])) ctx.clip();
      ctx.font = '900 ' + w + 'px ' + SS.FONT; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
      ctx.fillStyle = Math.floor(time * 2) % 2 ? '#facc15' : '#f97316';
      var tw = ctx.measureText(msg).width, off = (time * pt.s * 1.5) % tw;
      for (var xx = pt.x - pt.s * 9 - off; xx < pt.x + pt.s * 9; xx += tw) ctx.fillText(msg, xx, pt.y);
      ctx.restore();
    }
    // jumbotron above, behind the hoop
    box(ctx, cam, -3.2, 7.2, 9, 3.2, 9.8, 9.6, '#0f172a', '#1f2937', '#334155');
    if (cam.polyPath(ctx, [[-3, 7.4, 8.98], [3, 7.4, 8.98], [3, 9.6, 8.98], [-3, 9.6, 8.98]])) {
      var g = ctx.createLinearGradient(0, 0, 0, cam.cy); g.addColorStop(0, '#1d4ed8'); g.addColorStop(1, '#7c3aed');
      ctx.fillStyle = g; ctx.fill();
    }
    if (cam.project(0, 8.5, 8.97, pt)) {
      ctx.font = '900 ' + Math.max(8, pt.s * 0.8) + 'px ' + SS.FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fff'; ctx.fillText(Math.floor(time) % 4 < 2 ? 'FINAL' : 'SWISH!', pt.x, pt.y);
    }
    // championship banners
    var bc = ['#facc15', '#ef4444', '#3b82f6', '#22c55e', '#a855f7'];
    for (var i = 0; i < 5; i++) {
      var bx = -8 + i * 4;
      quad(ctx, cam, [[bx - 0.6, 11, 12], [bx + 0.6, 11, 12], [bx + 0.6, 9.2, 12], [bx, 8.7, 12], [bx - 0.6, 9.2, 12]], bc[i]);
    }
  };
  R.CROWD.arena = function (add, r) {
    for (var row = 0; row < 6; row++) for (var i = 0; i < 24; i++) {
      if (r() < 0.14) continue;
      add(-12 + i * 1.04 + r.range(-0.2, 0.2), 4.6 + row * 1.1, row * 0.75 + 0.75);
    }
    for (var s = -1; s <= 1; s += 2) for (var r2 = 0; r2 < 3; r2++) for (var j = 0; j < 6; j++) {
      if (r() < 0.2) continue;
      add(s * (10.2 + r2 * 1.1), 2 - j * 2.2, r2 * 0.75 + 0.75);
    }
  };
  // sweeping spotlights and camera flashes
  R.WEATHER.arena = function (ctx, cam, W, H, time) {
    var red = reduced();
    // two soft sweeping spotlight beams (plain alpha fills: cheap on phones)
    ctx.fillStyle = 'rgba(255,255,220,0.07)';
    for (var i = 0; i < 2; i++) {
      var a = Math.sin(time * 0.5 + i * 2.6) * 0.5;
      var sx = W * (0.25 + i * 0.5), len = H * 0.95;
      ctx.beginPath(); ctx.moveTo(sx - 6, -10); ctx.lineTo(sx + 6, -10);
      ctx.lineTo(sx + Math.sin(a) * len + W * 0.13, len); ctx.lineTo(sx + Math.sin(a) * len - W * 0.13, len); ctx.fill();
    }
    if (red) return;
    // flashes in the stands
    var r = U.rng(Math.floor(time * 6));
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    for (var f = 0; f < 3; f++) {
      var p = R.crowd[(r() * R.crowd.length) | 0];
      if (p && cam.project(p.x, p.y + p.h * 0.95, p.z, pt)) { ctx.beginPath(); ctx.arc(pt.x, pt.y, Math.max(1.5, pt.s * 0.08), 0, 7); ctx.fill(); }
    }
  };
})();
