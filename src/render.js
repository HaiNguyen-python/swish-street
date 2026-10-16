// Swish Street - world renderer: environments, court, hoop, net, ball, crowd.
(function () {
  'use strict';
  var SS = window.SS, U = SS.U, P = SS.Phys, AV = SS.avatar;
  var R = (SS.render = {});
  var pt = { x: 0, y: 0, s: 0, z: 0 }, pt2 = { x: 0, y: 0, s: 0, z: 0 };

  // ---------- Environments ----------
  var ENVS = R.ENVS = {
    park: {
      sky: ['#5ec8ff', '#c9f0ff'], far: '#5a9e4b', outside: '#69717d', court: '#2f7fd6', key: '#ef5b3f', line: '#ffffff',
      ring: '#2a6fbe', crowd: ['#f43f5e', '#22c55e', '#facc15', '#a855f7', '#0ea5e9', '#fb923c'], tint: null
    },
    gym: {
      indoor: true, sky: ['#d9dde5', '#eef0f4'], far: '#c9874a', outside: '#c9874a', court: '#e2a868', key: '#2563eb', line: '#ffffff',
      ring: '#1d4ed8', crowd: ['#2563eb', '#facc15', '#ffffff', '#ef4444', '#16a34a', '#2563eb'], tint: null, planks: 'rgba(120,70,30,0.16)'
    },
    roof: {
      sky: ['#2b1055', '#ff7e5f'], far: '#3b2a4a', outside: '#5b5566', court: '#a8455e', key: '#f59e0b', line: '#ffe8cc',
      ring: '#8b3a52', crowd: ['#fb7185', '#fbbf24', '#38bdf8', '#c084fc'], tint: 'rgba(255,120,60,0.10)', wind: true
    },
    night: {
      sky: ['#070b24', '#28286b'], far: '#131433', outside: '#24243f', court: '#241f5c', key: '#d6247a', line: '#5ef2ff',
      ring: '#3b2f86', crowd: ['#f472b6', '#22d3ee', '#a3e635', '#facc15', '#c084fc'], tint: null, neon: true
    }
  };
  R.env = ENVS.park; R.envId = 'park';
  var pano = null, panoKey = '';
  // Extension tables so extra courts (src/courts.js) can plug in their own art:
  // PANO[id](c, pw, ph, r, H), PROPS[id](ctx, cam, time, world), CROWD[id](add, r),
  // SURROUND[id](ctx, cam, time), WEATHER[id](ctx, cam, W, H, time), TICK[id](dt, S)
  R.PANO = {}; R.PROPS = {}; R.CROWD = {}; R.SURROUND = {}; R.WEATHER = {}; R.TICK = {};
  R.dyn = {};

  R.setEnv = function (id) {
    R.envId = ENVS[id] ? id : 'park';
    R.env = ENVS[R.envId];
    R.variant = null; R.variantId = null;
    R.crowd = makeCrowd(R.envId);
    R.dyn = {};
    panoKey = '';
  };
  // Court moods (v0.3): a revisit can show the court at golden hour, at night or in the rain.
  // Only the look changes (sky, tint, lights, rain); the physics stay exactly the same.
  R.setVariant = function (id) {
    var v = id && SS.D.VARIANTS[id];
    if (!v) { if (R.variantId) R.setEnv(R.envId); return; }
    R.env = Object.assign({}, ENVS[R.envId], { sky: v.sky, tint: v.tint || ENVS[R.envId].tint });
    R.variant = v; R.variantId = id;
    panoKey = '';
  };
  // Per-frame environment life (trains, gulls, snow). S is the play session or null in menus.
  R.tick = function (dt, S) { if (R.TICK[R.envId]) R.TICK[R.envId](dt, S); };
  var drops = null;
  R.drawWeather = function (ctx, cam, W, H, time) {
    if (R.WEATHER[R.envId]) R.WEATHER[R.envId](ctx, cam, W, H, time);
    var v = R.variant; if (!v) return;
    if (v.lights) {
      // warm lamp glows at the four corners of the court and a few fireflies
      for (var i = 0; i < 4; i++) {
        var lx = (i % 2 ? 1 : -1) * (i < 2 ? 4.6 : 8.2), lz = i < 2 ? 3.2 : -9;
        if (!cam.project(lx, 5.5, lz, pt)) continue;
        ctx.fillStyle = '#fff7d6'; ctx.beginPath(); ctx.arc(pt.x, pt.y, Math.max(2, pt.s * 0.12), 0, 7); ctx.fill();
        var g = ctx.createRadialGradient(pt.x, pt.y, 1, pt.x, pt.y, pt.s * 2.4);
        g.addColorStop(0, 'rgba(255,236,170,0.75)'); g.addColorStop(1, 'rgba(255,220,140,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.s * 2.4, 0, 7); ctx.fill();
      }
      if (!(SS.save && SS.save.data.settings.reduced)) {
        ctx.fillStyle = 'rgba(253,230,138,0.9)';
        for (var f = 0; f < 10; f++) {
          var fx = W * ((f * 0.137 + Math.sin(time * 0.3 + f) * 0.05) % 1), fy = H * (0.45 + 0.35 * ((f * 0.29) % 1)) + Math.sin(time * 1.3 + f * 2) * 14;
          ctx.globalAlpha = 0.4 + 0.4 * Math.sin(time * 3 + f); ctx.beginPath(); ctx.arc(fx, fy, 2.2, 0, 7); ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
    }
    if (v.rain) {
      var n = SS.save && SS.save.data.settings.reduced ? 30 : 90;
      if (!drops || drops.length !== n) { drops = []; var r = U.rng(9); for (var j = 0; j < n; j++) drops.push({ x: r(), y: r(), sp: r.range(0.9, 1.4), l: r.range(10, 22) }); }
      ctx.strokeStyle = 'rgba(210,225,245,0.55)'; ctx.lineWidth = 1.4; ctx.beginPath();
      for (var k = 0; k < drops.length; k++) {
        var d = drops[k], yy = ((d.y + time * d.sp) % 1) * (H + 40) - 20, xx = ((d.x - cam.yaw * 0.3) % 1 + 1) % 1 * W;
        ctx.moveTo(xx, yy); ctx.lineTo(xx - 3, yy + d.l);
      }
      ctx.stroke();
      // splash ripples on the court
      ctx.strokeStyle = 'rgba(220,235,255,0.5)'; ctx.lineWidth = 1;
      for (var s = 0; s < 6; s++) {
        var ph = (time * 1.7 + s * 0.37) % 1, rx = ((s * 3.7) % 9) - 4.5, rz = -1 - ((s * 2.3) % 8);
        if (!cam.project(rx, 0.01, rz, pt)) continue;
        ctx.globalAlpha = 1 - ph; ctx.beginPath(); ctx.ellipse(pt.x, pt.y, pt.s * 0.35 * ph, pt.s * 0.1 * ph, 0, 0, 7); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
  };

  function makeCrowd(id) {
    var list = [], r = U.rng(U.hashStr(id)), e = ENVS[id];
    function add(x, z, y) {
      list.push({ x: x, z: z, y: y || 0, h: r.range(1.25, 1.75), c: r.pick(e.crowd), skin: SS.D.SKINS[(r() * 6) | 0], ph: r() * 6, hair: SS.D.HAIR_COLORS[(r() * 4) | 0], sign: r() < 0.12 });
    }
    var i;
    if (R.CROWD[id]) R.CROWD[id](add, r);
    else if (id === 'park') {
      for (i = 0; i < 7; i++) add(-7.5 + i * 0.7 + r.range(-0.2, 0.2), 3.6 + r.range(-0.3, 0.3));
      for (i = 0; i < 7; i++) add(3.3 + i * 0.7 + r.range(-0.2, 0.2), 3.6 + r.range(-0.3, 0.3));
    } else if (id === 'gym') {
      for (var row = 0; row < 4; row++) for (i = 0; i < 22; i++) {
        var x = -10 + i * 0.95 + r.range(-0.15, 0.15);
        if (r() < 0.25) continue;
        add(x, 5.2 + row * 0.75, 0.45 + row * 0.55);
      }
    } else if (id === 'roof') {
      for (i = 0; i < 4; i++) add(-6.5 + i * 0.8, 2.6 + r.range(-0.4, 0.4));
      for (i = 0; i < 4; i++) add(4.2 + i * 0.8, 2.6 + r.range(-0.4, 0.4));
    } else {
      for (i = 0; i < 9; i++) add(-8.5 + i * 0.75, 3.2 + r.range(-0.3, 0.3));
      for (i = 0; i < 9; i++) add(2.6 + i * 0.75, 3.2 + r.range(-0.3, 0.3));
    }
    // far ones first
    list.sort(function (a, b) { return b.z - a.z; });
    return list;
  }

  // Panorama (sky band art) prerendered for speed. Width wraps.
  function buildPano(W, H) {
    var ps = Math.min(2, R.pixelScale || 1);
    var key = R.envId + W + 'x' + H + '@' + ps;
    if (key === panoKey && pano) return;
    panoKey = key;
    var pw = Math.ceil(W * 3), ph = Math.ceil(H * 0.6);
    ps = Math.min(ps, Math.sqrt(6e6 / (pw * ph))); // keep memory sane on iPad
    pano = document.createElement('canvas'); pano.width = Math.ceil(pw * ps); pano.height = Math.ceil(ph * ps);
    pano.lw = pw; pano.lh = ph;
    var c = pano.getContext('2d'), r = U.rng(U.hashStr(R.envId + 'pano'));
    c.scale(ps, ps);
    var base = ph; // horizon at bottom
    var env = R.env, i, x, w, h;
    if (R.PANO[R.envId]) R.PANO[R.envId](c, pw, ph, r, H);
    else if (R.envId === 'park') {
      // clouds
      c.fillStyle = 'rgba(255,255,255,0.85)';
      for (i = 0; i < 9; i++) {
        x = r() * pw; var y = ph * r.range(0.1, 0.5), s = r.range(30, 70) * (H / 800);
        for (var k = 0; k < 5; k++) { c.beginPath(); c.arc(x + k * s * 0.5, y + Math.sin(k * 2) * s * 0.2, s * r.range(0.4, 0.7), 0, Math.PI * 2); c.fill(); }
      }
      // distant buildings
      for (x = 0; x < pw; x += w) {
        w = r.range(40, 110) * (H / 800); h = r.range(60, 200) * (H / 800);
        c.fillStyle = r.pick(['#9fb6cc', '#a9bfd4', '#b5c8db']); c.fillRect(x, base - h - 40, w - 4, h + 40);
      }
      // trees
      for (x = -20; x < pw + 40; x += r.range(28, 60) * (H / 800)) {
        var tr = r.range(30, 55) * (H / 800);
        c.fillStyle = r.pick(['#3f8f3a', '#4ea446', '#357a31']);
        c.beginPath(); c.arc(x, base - tr * 0.9, tr, 0, Math.PI * 2); c.fill();
      }
      c.fillStyle = '#3d7d35'; c.fillRect(0, base - 18, pw, 18);
    } else if (R.envId === 'roof' || R.envId === 'night') {
      var night = R.envId === 'night';
      if (night) {
        c.fillStyle = '#fff';
        for (i = 0; i < 120; i++) { c.globalAlpha = r.range(0.3, 1); c.fillRect(r() * pw, r() * ph * 0.7, 2, 2); }
        c.globalAlpha = 1;
        c.fillStyle = '#fdf6c8'; c.beginPath(); c.arc(pw * 0.42, ph * 0.22, 26 * H / 800, 0, Math.PI * 2); c.fill();
      } else {
        // sun
        var sg = c.createRadialGradient(pw * 0.4, base - ph * 0.12, 5, pw * 0.4, base - ph * 0.12, ph * 0.5);
        sg.addColorStop(0, 'rgba(255,240,180,1)'); sg.addColorStop(0.15, 'rgba(255,200,120,0.9)'); sg.addColorStop(1, 'rgba(255,140,90,0)');
        c.fillStyle = sg; c.fillRect(0, 0, pw, ph);
        c.fillStyle = '#fff3c4'; c.beginPath(); c.arc(pw * 0.4, base - ph * 0.12, ph * 0.08, 0, Math.PI * 2); c.fill();
      }
      for (var layer = 0; layer < 2; layer++) {
        for (x = 0; x < pw; x += w) {
          w = r.range(30, 90) * (H / 800); h = r.range(80, 330) * (H / 800) * (layer ? 1 : 0.7);
          var col = night ? (layer ? '#0d0f2b' : '#1b1d4a') : (layer ? '#3a2240' : '#6b3a5a');
          c.fillStyle = col; c.fillRect(x, base - h, w - 3, h);
          if (layer && r() < 0.3) { c.fillRect(x + w * 0.4, base - h - 20, 3, 20); }
          if (layer) {
            for (var wy = base - h + 8; wy < base - 6; wy += 11) for (var wx = x + 5; wx < x + w - 8; wx += 9) {
              if (r() < (night ? 0.35 : 0.18)) { c.fillStyle = r() < 0.5 ? '#ffd27a' : '#fff1b8'; c.fillRect(wx, wy, 4, 5); }
            }
          }
        }
      }
      if (!night) {
        // water tower silhouette
        c.fillStyle = '#2a1830';
        var tx = pw * 0.7, ty = base - 150 * H / 800;
        c.fillRect(tx - 22, ty, 44, 34); c.beginPath(); c.moveTo(tx - 26, ty); c.lineTo(tx, ty - 18); c.lineTo(tx + 26, ty); c.fill();
        c.fillRect(tx - 18, ty + 34, 3, 60); c.fillRect(tx + 15, ty + 34, 3, 60);
      }
    }
    // horizon haze
    var hz = c.createLinearGradient(0, base - 60, 0, base);
    hz.addColorStop(0, 'rgba(255,255,255,0)'); hz.addColorStop(1, env.haze || (R.envId === 'night' ? 'rgba(80,60,160,0.35)' : 'rgba(255,255,255,0.25)'));
    c.fillStyle = hz; c.fillRect(0, base - 60, pw, 60);
  }

  // ---------- Court ----------
  var BASE_Z = 1.575; // baseline (rim centre is 1.575 m in from baseline)
  function groundQuad(ctx, cam, x0, z0, x1, z1, fill) {
    if (cam.polyPath(ctx, [[x0, 0, z0], [x1, 0, z0], [x1, 0, z1], [x0, 0, z1]])) { ctx.fillStyle = fill; ctx.fill(); }
  }
  function arcPts(cx, cz, r, a0, a1, n) {
    var out = [];
    for (var i = 0; i <= n; i++) { var a = a0 + (a1 - a0) * i / n; out.push([cx + Math.sin(a) * r, 0, cz - Math.cos(a) * r]); }
    return out;
  }
  function polyline(ctx, cam, pts) {
    for (var i = 0; i < pts.length - 1; i++) cam.line(ctx, pts[i][0], pts[i][1], pts[i][2], pts[i + 1][0], pts[i + 1][1], pts[i + 1][2]);
  }

  R.drawBackground = function (ctx, cam, W, H, time) {
    var env = R.env;
    var hy = cam.horizonY();
    var g = ctx.createLinearGradient(0, hy - H * 0.8, 0, hy);
    g.addColorStop(0, env.sky[0]); g.addColorStop(1, env.sky[1]);
    ctx.fillStyle = g; ctx.fillRect(-20, -20, W + 40, H + 40);
    if (!env.indoor) {
      buildPano(W, H);
      var pw = pano.lw, ph = pano.lh, off = ((-cam.yaw * cam.F * 0.55) % pw + pw) % pw;
      var y = hy - ph;
      ctx.drawImage(pano, -off, y, pw, ph); ctx.drawImage(pano, pw - off, y, pw, ph);
      if (R.envId === 'park') {
        // drifting extra cloud for life
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        var cx = ((time * 8) % (W + 300)) - 150;
        ctx.beginPath(); ctx.arc(cx, hy - H * 0.42, 22, 0, 7); ctx.arc(cx + 24, hy - H * 0.43, 28, 0, 7); ctx.arc(cx + 52, hy - H * 0.42, 20, 0, 7); ctx.fill();
      }
    }
    // far ground
    ctx.fillStyle = env.far; ctx.fillRect(-20, hy, W + 40, H - hy + 40);
  };

  R.drawCourt = function (ctx, cam, time) {
    var env = R.env;
    // surroundings
    if (R.SURROUND[R.envId]) R.SURROUND[R.envId](ctx, cam, time);
    else if (R.envId === 'gym') {
      groundQuad(ctx, cam, -14, 7, 14, -20, env.outside);
      // planks
      ctx.strokeStyle = 'rgba(120,70,30,0.18)'; ctx.lineWidth = 1; ctx.beginPath();
      for (var px = -9; px <= 9; px += 0.6) cam.line(ctx, px, 0, 5, px, 0, -16);
      ctx.stroke();
    } else if (R.envId === 'roof') {
      groundQuad(ctx, cam, -11, 4.2, 11, -20, env.outside);
    } else {
      groundQuad(ctx, cam, -10, 5, 10, -20, env.outside);
    }
    // court
    groundQuad(ctx, cam, -7.5, BASE_Z, 7.5, -12, env.court);
    // key
    groundQuad(ctx, cam, -2.45, BASE_Z, 2.45, BASE_Z - 5.8, env.key);
    if (cam.polyPath(ctx, arcPts(0, BASE_Z - 5.8, 1.8, -Math.PI / 2, Math.PI / 2, 16).concat([[0, 0, BASE_Z - 5.8]]))) {
      ctx.fillStyle = env.key; ctx.fill();
    }
    if (env.planks) {
      // wooden floor boards, over the painted key too
      ctx.strokeStyle = env.planks; ctx.lineWidth = Math.max(1, cam.F * 0.0015); ctx.beginPath();
      for (var pk = -7.2; pk <= 7.4; pk += 0.45) cam.line(ctx, pk, 0, BASE_Z, pk, 0, -12);
      ctx.stroke();
    }
    // lines
    ctx.strokeStyle = env.line; ctx.lineWidth = Math.max(1.5, cam.F * 0.0035);
    ctx.lineCap = 'round';
    if (env.neon) { ctx.shadowColor = env.line; ctx.shadowBlur = 0; }
    ctx.beginPath();
    polyline(ctx, cam, [[-7.5, 0, BASE_Z], [7.5, 0, BASE_Z]]);
    polyline(ctx, cam, [[-7.5, 0, BASE_Z], [-7.5, 0, -12]]);
    polyline(ctx, cam, [[7.5, 0, BASE_Z], [7.5, 0, -12]]);
    polyline(ctx, cam, [[-2.45, 0, BASE_Z], [-2.45, 0, BASE_Z - 5.8], [2.45, 0, BASE_Z - 5.8], [2.45, 0, BASE_Z]]);
    polyline(ctx, cam, arcPts(0, BASE_Z - 5.8, 1.8, -Math.PI / 2, Math.PI / 2, 16));
    // street arc (6.2 m)
    var r3 = 6.2;
    polyline(ctx, cam, [[-r3, 0, BASE_Z], [-r3, 0, 0]]);
    polyline(ctx, cam, [[r3, 0, BASE_Z], [r3, 0, 0]]);
    polyline(ctx, cam, arcPts(0, 0, r3, -Math.PI / 2, Math.PI / 2, 40));
    // centre circle at half court
    polyline(ctx, cam, arcPts(0, -12, 1.8, -Math.PI / 2, Math.PI / 2, 16));
    ctx.stroke();
    // logo in the middle of key
    if (cam.polyPath(ctx, arcPts(0, -8.5, 1.0, 0, Math.PI * 2, 20))) {
      ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fill();
    }
  };

  // Props behind the hoop (fence, walls, parapet, string lights).
  R.drawProps = function (ctx, cam, time, world) {
    var env = R.env, i;
    if (R.PROPS[R.envId]) R.PROPS[R.envId](ctx, cam, time, world);
    else if (R.envId === 'park') {
      // chain-link fence at z = 5
      if (cam.polyPath(ctx, [[-10, 0, 5], [10, 0, 5], [10, 3.2, 5], [-10, 3.2, 5]])) {
        ctx.fillStyle = 'rgba(140,160,170,0.18)'; ctx.fill();
      }
      ctx.strokeStyle = 'rgba(70,85,95,0.35)'; ctx.lineWidth = 1; ctx.beginPath();
      for (i = -10; i <= 10; i += 0.35) { cam.line(ctx, i, 0, 5, i + 0.6, 3.2, 5); cam.line(ctx, i + 0.6, 0, 5, i, 3.2, 5); }
      ctx.stroke();
      ctx.strokeStyle = '#5b6770'; ctx.lineWidth = Math.max(2, cam.F * 0.006); ctx.beginPath();
      for (i = -10; i <= 10; i += 2.5) cam.line(ctx, i, 0, 5, i, 3.25, 5);
      cam.line(ctx, -10, 3.2, 5, 10, 3.2, 5);
      ctx.stroke();
    } else if (R.envId === 'gym') {
      // back wall + bleachers
      if (cam.polyPath(ctx, [[-14, 0, 8.8], [14, 0, 8.8], [14, 9, 8.8], [-14, 9, 8.8]])) { ctx.fillStyle = '#e8e3da'; ctx.fill(); }
      if (cam.polyPath(ctx, [[-14, 3.2, 8.79], [14, 3.2, 8.79], [14, 3.9, 8.79], [-14, 3.9, 8.79]])) { ctx.fillStyle = '#1d4ed8'; ctx.fill(); }
      // banners
      var bc = ['#ef4444', '#facc15', '#22c55e', '#1d4ed8'];
      for (i = 0; i < 4; i++) {
        var bx = -6 + i * 4;
        if (cam.polyPath(ctx, [[bx - 0.7, 7.6, 8.75], [bx + 0.7, 7.6, 8.75], [bx + 0.7, 5.6, 8.75], [bx, 5.1, 8.75], [bx - 0.7, 5.6, 8.75]])) { ctx.fillStyle = bc[i]; ctx.fill(); }
      }
      // side walls
      if (cam.polyPath(ctx, [[-9.5, 0, 8.8], [-9.5, 9, 8.8], [-9.5, 9, -20], [-9.5, 0, -20]])) { ctx.fillStyle = '#d6d0c4'; ctx.fill(); }
      if (cam.polyPath(ctx, [[9.5, 0, 8.8], [9.5, 9, 8.8], [9.5, 9, -20], [9.5, 0, -20]])) { ctx.fillStyle = '#d6d0c4'; ctx.fill(); }
      for (var row = 0; row < 4; row++) {
        var z = 5 + row * 0.75, y = 0.45 + row * 0.55;
        if (cam.polyPath(ctx, [[-10, y - 0.55, z - 0.35], [10, y - 0.55, z - 0.35], [10, y, z - 0.35], [-10, y, z - 0.35]])) { ctx.fillStyle = row % 2 ? '#8b5e34' : '#9a6a3d'; ctx.fill(); }
        if (cam.polyPath(ctx, [[-10, y, z - 0.35], [10, y, z - 0.35], [10, y, z + 0.4], [-10, y, z + 0.4]])) { ctx.fillStyle = '#b07b46'; ctx.fill(); }
      }
      // ceiling lights glow
      for (i = -1; i <= 1; i++) {
        cam.project(i * 5, 8.5, 2, pt);
        if (pt.s > 0) { ctx.fillStyle = 'rgba(255,255,240,0.85)'; ctx.beginPath(); ctx.ellipse(pt.x, pt.y, pt.s * 0.8, pt.s * 0.18, 0, 0, 7); ctx.fill(); }
      }
    } else if (R.envId === 'roof') {
      // parapet wall at z = 4.2 and side rails
      if (cam.polyPath(ctx, [[-11, 0, 4.2], [11, 0, 4.2], [11, 1.0, 4.2], [-11, 1.0, 4.2]])) { ctx.fillStyle = '#6d5f73'; ctx.fill(); }
      if (cam.polyPath(ctx, [[-11, 1.0, 4.2], [11, 1.0, 4.2], [11, 1.0, 4.5], [-11, 1.0, 4.5]])) { ctx.fillStyle = '#8a7b8f'; ctx.fill(); }
      // string lights
      ctx.strokeStyle = 'rgba(40,20,40,0.7)'; ctx.lineWidth = 1; ctx.beginPath();
      var bulbs = [];
      for (var s = -1; s <= 1; s += 2) {
        var last = null;
        for (i = 0; i <= 16; i++) {
          var f = i / 16, x = s * 7, zz = 4 - f * 14, yy = 4.6 - Math.sin(f * Math.PI * 4) * 0.25 - 0.2;
          if (last) cam.line(ctx, last[0], last[1], last[2], x, yy, zz);
          last = [x, yy, zz]; bulbs.push(last);
        }
      }
      ctx.stroke();
      for (i = 0; i < bulbs.length; i++) {
        if (!cam.project(bulbs[i][0], bulbs[i][1] - 0.05, bulbs[i][2], pt)) continue;
        var tw = 0.75 + 0.25 * Math.sin(time * 3 + i);
        ctx.fillStyle = 'rgba(255,214,120,' + (0.25 * tw) + ')';
        ctx.beginPath(); ctx.arc(pt.x, pt.y, Math.max(3, pt.s * 0.14), 0, 7); ctx.fill();
        ctx.fillStyle = '#ffe9a8'; ctx.beginPath(); ctx.arc(pt.x, pt.y, Math.max(1.5, pt.s * 0.045), 0, 7); ctx.fill();
      }
      // wind flag at back-right corner
      drawFlag(ctx, cam, 5.5, 4.0, world ? (world.windShow != null ? world.windShow : world.windX) : 0, time);
    } else if (R.envId === 'night') {
      // light poles with glow
      for (var side = -1; side <= 1; side += 2) {
        var lx = side * 8.5, lz = 3.5;
        ctx.strokeStyle = '#2a2a4a'; ctx.lineWidth = Math.max(2, cam.F * 0.008); ctx.beginPath(); cam.line(ctx, lx, 0, lz, lx, 6.5, lz); ctx.stroke();
        if (cam.project(lx, 6.6, lz, pt)) {
          var gg = ctx.createRadialGradient(pt.x, pt.y, 1, pt.x, pt.y, pt.s * 2.2);
          gg.addColorStop(0, 'rgba(200,240,255,0.9)'); gg.addColorStop(1, 'rgba(120,180,255,0)');
          ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.s * 2.2, 0, 7); ctx.fill();
        }
      }
      // neon fence glow strip
      ctx.strokeStyle = 'rgba(236,72,153,0.7)'; ctx.lineWidth = Math.max(2, cam.F * 0.005);
      ctx.beginPath(); cam.line(ctx, -10, 1.1, 4.6, 10, 1.1, 4.6); ctx.stroke();
      ctx.strokeStyle = 'rgba(34,211,238,0.6)';
      ctx.beginPath(); cam.line(ctx, -10, 0.6, 4.6, 10, 0.6, 4.6); ctx.stroke();
    }
  };

  R.drawFlag = function (ctx, cam, x, z, wind, time, color) { drawFlag(ctx, cam, x, z, wind, time, color); };
  R.groundQuad = groundQuad;
  function drawFlag(ctx, cam, x, z, wind, time, color) {
    ctx.strokeStyle = '#d4d4d8'; ctx.lineWidth = Math.max(1.5, cam.F * 0.004);
    ctx.beginPath(); cam.line(ctx, x, 1, z, x, 4.4, z); ctx.stroke();
    if (!cam.project(x, 4.4, z, pt)) return;
    var dir = wind >= 0 ? 1 : -1, len = (0.4 + Math.min(1, Math.abs(wind) / 2) * 0.6) * pt.s;
    ctx.fillStyle = color || '#ef4444';
    ctx.beginPath(); ctx.moveTo(pt.x, pt.y);
    for (var i = 0; i <= 6; i++) {
      var f = i / 6;
      ctx.lineTo(pt.x + dir * len * f, pt.y + Math.sin(time * 9 + f * 5) * pt.s * 0.05 * f + (1 - Math.min(1, Math.abs(wind))) * f * pt.s * 0.3);
    }
    for (i = 6; i >= 0; i--) {
      var f2 = i / 6;
      ctx.lineTo(pt.x + dir * len * f2, pt.y + pt.s * 0.28 + Math.sin(time * 9 + f2 * 5) * pt.s * 0.05 * f2 + (1 - Math.min(1, Math.abs(wind))) * f2 * pt.s * 0.3);
    }
    ctx.fill();
  }

  // mood: null | 'cheer' (jump, arms up, signs) | 'aww' (hands on heads, slump)
  R.drawCrowd = function (ctx, cam, time, energy, mood) {
    var list = R.crowd || [];
    var aww = mood === 'aww', cheer = mood === 'cheer';
    if (cheer) energy = Math.max(energy, 0.9);
    var arms = aww || energy > 0.25;
    // People are sorted far to near. Each row is drawn in batches (one fill per colour),
    // which keeps a packed arena cheap on phones.
    var row = [], rowZ = null, rowY = null;
    for (var i = 0; i <= list.length; i++) {
      var p = list[i];
      if (!p || (rowZ !== null && (Math.abs(p.z - rowZ) > 0.35 || Math.abs(p.y - rowY) > 0.3))) { drawRow(ctx, row, aww, cheer, arms, time, energy); row.length = 0; rowZ = null; }
      if (!p) break;
      if (!cam.project(p.x, p.y, p.z, pt)) continue;
      var s = pt.s, h = p.h * s;
      if (h < 2) continue;
      var jump = aww ? 0 : Math.max(0, Math.sin(time * 9 + p.ph)) * energy * 0.25 * s;
      var bob = Math.sin(time * 2 + p.ph) * 0.02 * s + (aww ? h * 0.04 : 0);
      row.push({ p: p, x: pt.x, y: pt.y - jump + bob, h: h });
      if (rowZ === null) { rowZ = p.z; rowY = p.y; }
    }
  };
  function batch(ctx, row, key, fn) {
    var done = {};
    for (var i = 0; i < row.length; i++) {
      var c = row[i].p[key];
      if (done[c]) continue; done[c] = 1;
      ctx.beginPath();
      for (var j = i; j < row.length; j++) if (row[j].p[key] === c) fn(row[j]);
      ctx.fillStyle = c; ctx.strokeStyle = c; ctx.fill(); if (fn.stroke) ctx.stroke();
    }
  }
  function drawRow(ctx, row, aww, cheer, arms, time, energy) {
    if (!row.length) return;
    var hAvg = 0; for (var i = 0; i < row.length; i++) hAvg += row[i].h; hAvg /= row.length;
    var small = hAvg < 13;
    // bodies
    batch(ctx, row, 'c', function (e) {
      var x = e.x, y = e.y, h = e.h;
      if (small) ctx.rect(x - h * 0.17, y - h * 0.75, h * 0.34, h * 0.6);
      else { ctx.moveTo(x + h * 0.17, y - h * 0.45); ctx.ellipse(x, y - h * 0.45, h * 0.17, h * 0.3, 0, 0, 7); }
    });
    if (!small && arms) {
      ctx.lineWidth = Math.max(1.5, hAvg * 0.07); ctx.lineCap = 'round';
      var armFn = function (e) {
        var x = e.x, y = e.y, h = e.h;
        if (aww) {
          ctx.moveTo(x - h * 0.13, y - h * 0.62); ctx.lineTo(x - h * 0.2, y - h * 0.78); ctx.lineTo(x - h * 0.08, y - h * 0.95);
          ctx.moveTo(x + h * 0.13, y - h * 0.62); ctx.lineTo(x + h * 0.2, y - h * 0.78); ctx.lineTo(x + h * 0.08, y - h * 0.95);
        } else {
          var wv = Math.sin(time * 12 + e.p.ph) * h * 0.05;
          ctx.moveTo(x - h * 0.13, y - h * 0.62); ctx.lineTo(x - h * 0.22 + wv, y - h * 0.95);
          ctx.moveTo(x + h * 0.13, y - h * 0.62); ctx.lineTo(x + h * 0.22 - wv, y - h * 0.95);
        }
      };
      // strokes only (no fill) for arms
      var done = {};
      for (var a = 0; a < row.length; a++) {
        var c = row[a].p.skin; if (done[c]) continue; done[c] = 1;
        ctx.beginPath();
        for (var b = a; b < row.length; b++) if (row[b].p.skin === c) armFn(row[b]);
        ctx.strokeStyle = c; ctx.stroke();
      }
      if (cheer) {
        for (var k = 0; k < row.length; k++) {
          var e = row[k]; if (!e.p.sign) continue;
          var hh = e.h;
          ctx.fillStyle = '#fff'; ctx.fillRect(e.x - hh * 0.3, e.y - hh * 1.22, hh * 0.6, hh * 0.28);
          ctx.fillStyle = e.p.c; ctx.fillRect(e.x - hh * 0.24, e.y - hh * 1.15, hh * 0.48, hh * 0.06); ctx.fillRect(e.x - hh * 0.24, e.y - hh * 1.06, hh * 0.32, hh * 0.06);
        }
      }
    }
    // heads, then hair
    batch(ctx, row, 'skin', function (e) {
      var x = e.x, y = e.y, h = e.h;
      if (small) ctx.rect(x - h * 0.1, y - h * 0.97, h * 0.2, h * 0.2);
      else { ctx.moveTo(x + h * 0.11, y - h * 0.86); ctx.arc(x, y - h * 0.86, h * 0.11, 0, 7); }
    });
    if (small) return;
    batch(ctx, row, 'hair', function (e) {
      var x = e.x, y = e.y, h = e.h;
      ctx.moveTo(x - h * 0.11, y - h * 0.9); ctx.arc(x, y - h * 0.9, h * 0.11, Math.PI, 0);
    });
    if (hAvg > 26) {
      // tiny faces when close enough to see
      ctx.fillStyle = '#1c1917'; ctx.beginPath();
      for (var f = 0; f < row.length; f++) {
        var q = row[f], x = q.x, y = q.y, h = q.h, d = Math.max(1, h * 0.022);
        ctx.rect(x - h * 0.05, y - h * 0.87, d, d); ctx.rect(x + h * 0.03, y - h * 0.87, d, d);
        ctx.moveTo(x + h * 0.03, y - h * (aww ? 0.79 : 0.83));
        ctx.arc(x, y - h * (aww ? 0.79 : 0.83), h * 0.03, aww ? Math.PI : 0, aww ? 0 : Math.PI);
      }
      ctx.fill();
    }
  }

  // ---------- Hoop ----------
  R.drawHoopBack = function (ctx, cam, w, opts) {
    opts = opts || {};
    var hx = w.hx, bz = P.BOARD_Z, env = R.env;
    // pole
    var poleZ = bz + 1.0;
    ctx.lineCap = 'butt';
    if (cam.project(hx, 0, poleZ, pt)) {
      ctx.strokeStyle = '#2f3542'; ctx.lineWidth = Math.max(3, pt.s * 0.13);
      ctx.beginPath(); cam.line(ctx, hx, 0, poleZ, hx, 3.5, poleZ); ctx.stroke();
      ctx.lineWidth = Math.max(2, pt.s * 0.08);
      ctx.beginPath(); cam.line(ctx, hx, 3.45, poleZ, hx, 3.45, bz + P.BOARD_T); cam.line(ctx, hx, 3.0, poleZ, hx, 3.3, bz + P.BOARD_T); ctx.stroke();
      // pad
      ctx.strokeStyle = env.ring; ctx.lineWidth = Math.max(4, pt.s * 0.2);
      ctx.beginPath(); cam.line(ctx, hx, 0, poleZ, hx, 1.8, poleZ); ctx.stroke();
    }
    // backboard
    var x0 = hx - P.BOARD_HW, x1 = hx + P.BOARD_HW, y0 = P.BOARD_Y0, y1 = P.BOARD_Y1;
    if (cam.polyPath(ctx, [[x0, y0, bz + 0.05], [x1, y0, bz + 0.05], [x1, y1, bz + 0.05], [x0, y1, bz + 0.05]])) {
      ctx.fillStyle = '#9aa3ad'; ctx.fill();
    }
    if (cam.polyPath(ctx, [[x0, y0, bz], [x1, y0, bz], [x1, y1, bz], [x0, y1, bz]])) {
      ctx.fillStyle = 'rgba(245,250,255,0.93)'; ctx.fill();
      ctx.strokeStyle = env.ring; ctx.lineWidth = Math.max(2, cam.F * 0.006); ctx.stroke();
    }
    // shooter square
    if (cam.polyPath(ctx, [[hx - 0.295, 3.1, bz], [hx + 0.295, 3.1, bz], [hx + 0.295, 3.55, bz], [hx - 0.295, 3.55, bz]])) {
      ctx.strokeStyle = '#e8553d'; ctx.lineWidth = Math.max(1.5, cam.F * 0.004); ctx.stroke();
    }
    // flash when hit
    if (opts.boardFlash > 0 && cam.polyPath(ctx, [[x0, y0, bz], [x1, y0, bz], [x1, y1, bz], [x0, y1, bz]])) {
      ctx.fillStyle = 'rgba(255,255,255,' + (opts.boardFlash * 0.6) + ')'; ctx.fill();
    }
    // targets. Colour-blind safe (v0.3): an unlit target is a bright bullseye ring with a number and a
    // dashed outline; a lit one is a solid dark disc with a big tick. Shape and brightness differ, not just hue.
    if (w.targets) {
      for (var i = 0; i < w.targets.length; i++) {
        var tg = w.targets[i], lit = opts.litTargets && opts.litTargets[i];
        if (!cam.project(hx + tg.x, tg.y, bz - 0.005, pt)) continue;
        var pulse = lit ? 1 : 1 + 0.1 * Math.sin(opts.time * 6 + i);
        var rx = pt.s * 0.19 * pulse, ry = pt.s * 0.16 * pulse, lwT = Math.max(1.5, pt.s * 0.025);
        ctx.font = '900 ' + Math.max(9, pt.s * 0.16) + 'px ' + SS.FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        if (lit) {
          ctx.fillStyle = '#1e3a8a'; ctx.beginPath(); ctx.ellipse(pt.x, pt.y, rx, ry, 0, 0, 7); ctx.fill();
          ctx.strokeStyle = '#ffffff'; ctx.lineWidth = lwT; ctx.stroke();
          ctx.fillStyle = '#ffffff'; ctx.fillText('✓', pt.x, pt.y + 1);
        } else {
          ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.beginPath(); ctx.ellipse(pt.x, pt.y, rx, ry, 0, 0, 7); ctx.fill();
          ctx.fillStyle = 'rgba(249,115,22,' + (0.75 + 0.2 * Math.sin(opts.time * 5 + i)) + ')'; ctx.beginPath(); ctx.ellipse(pt.x, pt.y, rx * 0.62, ry * 0.62, 0, 0, 7); ctx.fill();
          ctx.setLineDash([lwT * 2, lwT * 1.5]); ctx.strokeStyle = '#111827'; ctx.lineWidth = lwT; ctx.beginPath(); ctx.ellipse(pt.x, pt.y, rx, ry, 0, 0, 7); ctx.stroke(); ctx.setLineDash([]);
          ctx.fillStyle = '#111827'; ctx.fillText(String(i + 1), pt.x, pt.y + 1);
        }
      }
    }
    // bracket
    ctx.strokeStyle = '#8a2b12'; ctx.lineWidth = Math.max(2, cam.F * 0.006);
    ctx.beginPath(); cam.line(ctx, hx, w.hy - 0.02, w.hz + w.R, hx, w.hy - 0.02, bz); ctx.stroke();
  };

  var RIM_N = 28;
  var rimPts = [];
  for (var ri = 0; ri <= RIM_N; ri++) rimPts.push({ x: 0, y: 0, z: 0 });
  // draw half of rim+net: front=false => far half
  R.drawRimHalf = function (ctx, cam, w, net, front) {
    var cd = cam.depth(w.hx, w.hy, w.hz);
    // net
    if (net) {
      var N = net.nodes, L = net.links;
      ctx.strokeStyle = front ? 'rgba(255,255,255,0.95)' : 'rgba(225,230,235,0.8)';
      cam.project(w.hx, w.hy, w.hz, pt);
      ctx.lineWidth = Math.max(1, pt.s * 0.012);
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (var k = 0; k < L.length; k++) {
        var l = L[k]; if (l.k < 1) continue;
        var A = N[l.a], B = N[l.b];
        var dep = cam.depth((A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2);
        if ((dep < cd) !== front) continue;
        if (!cam.project(A.x, A.y, A.z, pt) || !cam.project(B.x, B.y, B.z, pt2)) continue;
        ctx.moveTo(pt.x, pt.y); ctx.lineTo(pt2.x, pt2.y);
      }
      // bottom ring hint
      ctx.stroke();
    }
    // rim
    cam.project(w.hx, w.hy, w.hz, pt);
    var lw = Math.max(2.5, pt.s * 0.03);
    ctx.lineWidth = lw; ctx.strokeStyle = front ? '#ff5a1f' : '#d1410f'; ctx.lineCap = 'round';
    ctx.beginPath();
    var started = false;
    for (var i = 0; i <= RIM_N; i++) {
      var a = i / RIM_N * Math.PI * 2;
      var x = w.hx + Math.cos(a) * w.R, z = w.hz + Math.sin(a) * w.R;
      var isFront = cam.depth(x, w.hy, z) < cd;
      if (isFront !== front) { started = false; continue; }
      if (!cam.project(x, w.hy, z, pt2)) { started = false; continue; }
      if (!started) { ctx.moveTo(pt2.x, pt2.y); started = true; } else ctx.lineTo(pt2.x, pt2.y);
    }
    ctx.stroke();
    if (front) {
      ctx.lineWidth = Math.max(1, lw * 0.35); ctx.strokeStyle = 'rgba(255,220,180,0.7)';
      ctx.stroke();
    }
  };

  // Ball with shadow. rot = visual spin angle
  R.drawBallShadow = function (ctx, cam, b) {
    if (!cam.project(b.px, 0.005, b.pz, pt)) return;
    var hgt = Math.max(0, b.py - P.R_BALL), a = U.clamp(0.4 - hgt * 0.07, 0.06, 0.4);
    ctx.fillStyle = 'rgba(0,0,0,' + a + ')';
    var r = pt.s * P.R_BALL * (1 + hgt * 0.15);
    ctx.beginPath(); ctx.ellipse(pt.x, pt.y, r, r * 0.35, 0, 0, 7); ctx.fill();
  };
  R.drawBall = function (ctx, cam, b, skin, rot, fire) {
    if (!cam.project(b.px, b.py, b.pz, pt)) return;
    var r = pt.s * P.R_BALL;
    if (fire) {
      var fg = ctx.createRadialGradient(pt.x, pt.y, r * 0.5, pt.x, pt.y, r * 2.2);
      fg.addColorStop(0, 'rgba(255,200,60,0.75)'); fg.addColorStop(1, 'rgba(255,60,0,0)');
      ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(pt.x, pt.y, r * 2.2, 0, 7); ctx.fill();
    }
    AV.drawBall(ctx, pt.x, pt.y, r, skin, rot);
  };

  R.project = function (cam, x, y, z) { var o = {}; cam.project(x, y, z, o); return o; };
  R.tint = function (ctx, W, H) {
    if (R.env.tint) { ctx.fillStyle = R.env.tint; ctx.fillRect(0, 0, W, H); }
  };
})();
