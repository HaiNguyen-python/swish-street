// Swish Street - ball physics: gravity, wind, spin, rim (torus), backboard (box), ground,
// swish/bank detection, stuck-ball rescue, headless simulation and the "ideal shot" solver.
// World units are metres. x = right, y = up, z = toward the backboard. Rim centre at (hx, 3.05, 0).
(function () {
  'use strict';
  var SS = window.SS, U = SS.U;
  var P = (SS.Phys = {});
  var G = (P.G = 9.3);
  var R_BALL = (P.R_BALL = 0.12);
  P.RIM_Y = 3.05; P.RIM_R = 0.235; P.TUBE = 0.011;
  P.BOARD_Z = 0.385; P.BOARD_T = 0.05; P.BOARD_HW = 0.9; P.BOARD_Y0 = 2.9; P.BOARD_Y1 = 3.95;
  P.DT = 1 / 240;
  var E_RIM = 0.56, MU_RIM = 0.32, E_BOARD = 0.64, MU_BOARD = 0.22, E_GROUND = 0.72, MU_GROUND = 0.45;
  P.E_BOARD = E_BOARD;

  // World options (all optional): eRim/muRim (icy rim), allowBounce (one floor bounce before
  // scoring is allowed), obstacles [{x,y,z,r}] (e.g. a seagull) the ball bounces off.
  P.makeWorld = function (o) {
    o = o || {};
    return { hx: 0, hy: P.RIM_Y, hz: 0, R: P.RIM_R, windX: o.windX || 0, windZ: 0, targets: o.targets || null,
      eRim: o.eRim || E_RIM, muRim: o.muRim != null ? o.muRim : MU_RIM, allowBounce: false, obstacles: null, props: null };
  };
  P.makeBall = function () {
    return { px: 0, py: 1, pz: 0, vx: 0, vy: 0, vz: 0, wx: 0, wy: 0, wz: 0 };
  };
  P.makeTracker = function () {
    return { t: 0, rim: 0, rimAny: 0, board: 0, ground: 0, scored: false, swish: false, bank: false, fromBelow: false,
      scoreT: 0, done: false, reason: '', stuckT: 0, nudges: 0, lastRimT: -9, maxY: 0, hitTargets: [],
      boardBeforeScore: 0, inNet: false, bounces: 0, obstacle: 0, propHits: [], gates: [], gateSide: {} };
  };

  // Generic sphere contact with restitution, friction and spin coupling (hollow sphere, I = 2/3 m r^2).
  function contact(b, nx, ny, nz, e, mu) {
    var r = R_BALL;
    var rx = -nx * r, ry = -ny * r, rz = -nz * r;
    var vcx = b.vx + (b.wy * rz - b.wz * ry);
    var vcy = b.vy + (b.wz * rx - b.wx * rz);
    var vcz = b.vz + (b.wx * ry - b.wy * rx);
    var vn = vcx * nx + vcy * ny + vcz * nz;
    if (vn >= 0) return 0;
    var jn = -(1 + e) * vn;
    b.vx += jn * nx; b.vy += jn * ny; b.vz += jn * nz;
    var tx = vcx - vn * nx, ty = vcy - vn * ny, tz = vcz - vn * nz;
    var tl = Math.sqrt(tx * tx + ty * ty + tz * tz);
    if (tl > 1e-6) {
      var jt = Math.min(mu * jn, tl / 2.5);
      tx /= tl; ty /= tl; tz /= tl;
      b.vx -= jt * tx; b.vy -= jt * ty; b.vz -= jt * tz;
      var k = -jt / (0.6667 * r * r);
      b.wx += k * (ry * tz - rz * ty);
      b.wy += k * (rz * tx - rx * tz);
      b.wz += k * (rx * ty - ry * tx);
    }
    return -vn;
  }
  P.contact = contact;

  function rim(w, b, tr, ev) {
    var dx = b.px - w.hx, dz = b.pz - w.hz, dh = Math.sqrt(dx * dx + dz * dz);
    var ux = 1, uz = 0;
    if (dh > 1e-6) { ux = dx / dh; uz = dz / dh; }
    var qx = w.hx + ux * w.R, qz = w.hz + uz * w.R, qy = w.hy;
    var nx = b.px - qx, ny = b.py - qy, nz = b.pz - qz;
    var d = Math.sqrt(nx * nx + ny * ny + nz * nz), minD = R_BALL + P.TUBE;
    if (d < minD && d > 1e-6) {
      nx /= d; ny /= d; nz /= d;
      b.px = qx + nx * minD; b.py = qy + ny * minD; b.pz = qz + nz * minD;
      var imp = contact(b, nx, ny, nz, w.eRim || E_RIM, w.muRim != null ? w.muRim : MU_RIM);
      if (imp > 0.25 || tr.t - tr.lastRimT > 0.12) {
        if (imp > 0.25) { tr.rim++; if (ev) ev.push({ type: 'rim', v: imp }); }
      }
      if (tr.t - tr.lastRimT > 0.06) tr.rimAny++;
      tr.lastRimT = tr.t;
      return true;
    }
    return false;
  }
  // Rim-to-board bracket: a short bar along z behind the rim.
  function bracket(w, b, tr, ev) {
    var z0 = w.hz + w.R, z1 = P.BOARD_Z;
    var cz = U.clamp(b.pz, z0, z1), cx = w.hx, cy = w.hy - 0.02;
    var nx = b.px - cx, ny = b.py - cy, nz = b.pz - cz;
    var d = Math.sqrt(nx * nx + ny * ny + nz * nz), minD = R_BALL + 0.02;
    if (d < minD && d > 1e-6) {
      nx /= d; ny /= d; nz /= d;
      b.px = cx + nx * minD; b.py = cy + ny * minD; b.pz = cz + nz * minD;
      var imp = contact(b, nx, ny, nz, 0.45, 0.3);
      if (imp > 0.25) { tr.rim++; if (ev) ev.push({ type: 'rim', v: imp * 0.7 }); }
    }
  }
  function board(w, b, tr, ev) {
    var x0 = w.hx - P.BOARD_HW, x1 = w.hx + P.BOARD_HW;
    var cx = U.clamp(b.px, x0, x1), cy = U.clamp(b.py, P.BOARD_Y0, P.BOARD_Y1), cz = U.clamp(b.pz, P.BOARD_Z, P.BOARD_Z + P.BOARD_T);
    var nx = b.px - cx, ny = b.py - cy, nz = b.pz - cz;
    var d = Math.sqrt(nx * nx + ny * ny + nz * nz);
    if (d < R_BALL) {
      if (d < 1e-6) { nx = 0; ny = 0; nz = -1; d = 0; } else { nx /= d; ny /= d; nz /= d; }
      b.px = cx + nx * R_BALL; b.py = cy + ny * R_BALL; b.pz = cz + nz * R_BALL;
      var imp = contact(b, nx, ny, nz, E_BOARD, MU_BOARD);
      if (imp > 0.2) {
        tr.board++;
        if (!tr.scored) tr.boardBeforeScore++;
        if (ev) ev.push({ type: 'board', v: imp, x: cx - w.hx, y: cy });
        if (w.targets && nz < -0.5) {
          for (var i = 0; i < w.targets.length; i++) {
            var tg = w.targets[i];
            if (Math.abs(cx - w.hx - tg.x) < 0.2 && Math.abs(cy - tg.y) < 0.17 && tr.hitTargets.indexOf(i) < 0) {
              tr.hitTargets.push(i); if (ev) ev.push({ type: 'target', i: i });
            }
          }
        }
      }
    }
  }

  // Moving spheres (a gull, a beach ball...). Their position is driven by the game each frame.
  function obstacles(w, b, tr, ev) {
    for (var i = 0; i < w.obstacles.length; i++) {
      var o = w.obstacles[i];
      if (!o.on) continue;
      var nx = b.px - o.x, ny = b.py - o.y, nz = b.pz - o.z, minD = R_BALL + o.r;
      var d2 = nx * nx + ny * ny + nz * nz;
      if (d2 < minD * minD && d2 > 1e-8) {
        var d = Math.sqrt(d2); nx /= d; ny /= d; nz /= d;
        b.px = o.x + nx * minD; b.py = o.y + ny * minD; b.pz = o.z + nz * minD;
        var imp = contact(b, nx, ny, nz, 0.45, 0.2);
        if (imp > 0.1 && !o.hit) { o.hit = true; tr.obstacle++; if (ev) ev.push({ type: 'obstacle', i: i, v: imp }); }
      }
    }
  }

  // Trick-shot props (v0.3). Static pieces of court furniture the ball can bank or bounce off,
  // and hoop-shaped "gates" it can fly through. Only Trick Shot mode adds them, so normal play
  // (and the core flick) never sees them. Touches only count before the ball scores.
  //   { type: 'box', id, x0, y0, z0, x1, y1, z1, e, mu }       (pillars, benches, trampolines)
  //   { type: 'ring', id, x, y, z, nx, ny, nz, R, tube }       (a ring the ball can pass through)
  function props(w, b, tr, ev) {
    for (var i = 0; i < w.props.length; i++) {
      var p = w.props[i];
      if (p.type === 'box') {
        if (b.px < p.x0 - 0.3 || b.px > p.x1 + 0.3 || b.py < p.y0 - 0.3 || b.py > p.y1 + 0.3 || b.pz < p.z0 - 0.3 || b.pz > p.z1 + 0.3) continue;
        var cx = U.clamp(b.px, p.x0, p.x1), cy = U.clamp(b.py, p.y0, p.y1), cz = U.clamp(b.pz, p.z0, p.z1);
        var nx = b.px - cx, ny = b.py - cy, nz = b.pz - cz, d = Math.sqrt(nx * nx + ny * ny + nz * nz);
        if (d >= R_BALL) continue;
        if (d < 1e-6) { nx = 0; ny = 1; nz = 0; } else { nx /= d; ny /= d; nz /= d; }
        b.px = cx + nx * R_BALL; b.py = cy + ny * R_BALL; b.pz = cz + nz * R_BALL;
        // a moving prop (v0.4 train roof) bounces the ball in its own frame of reference
        var mvx = p.vx || 0;
        if (mvx) b.vx -= mvx;
        var imp = contact(b, nx, ny, nz, p.e || 0.6, p.mu != null ? p.mu : 0.25);
        if (mvx) b.vx += mvx;
        if (imp > 0.2) {
          if (!tr.scored && tr.propHits.indexOf(p.id) < 0) tr.propHits.push(p.id);
          if (ev) ev.push({ type: 'prop', id: p.id, v: imp });
        }
      } else if (p.type === 'ring') {
        var vx = b.px - p.x, vy = b.py - p.y, vz = b.pz - p.z;
        if (vx * vx + vy * vy + vz * vz > (p.R + 0.6) * (p.R + 0.6)) { tr.gateSide[p.id] = 0; continue; }
        var al = vx * p.nx + vy * p.ny + vz * p.nz;
        var rx = vx - al * p.nx, ry = vy - al * p.ny, rz = vz - al * p.nz, rl = Math.sqrt(rx * rx + ry * ry + rz * rz);
        // passing through: the centre crosses the ring plane inside the ring
        var side = al >= 0 ? 1 : -1, prev = tr.gateSide[p.id];
        if (prev && prev !== side && rl < p.R && !tr.scored && tr.gates.indexOf(p.id) < 0) {
          tr.gates.push(p.id); if (ev) ev.push({ type: 'gate', id: p.id });
        }
        tr.gateSide[p.id] = side;
        // the ring tube is solid: the ball can clip it and rattle off
        if (rl < 1e-6) continue;
        var qx = p.x + rx / rl * p.R, qy = p.y + ry / rl * p.R, qz = p.z + rz / rl * p.R;
        var mx = b.px - qx, my = b.py - qy, mz = b.pz - qz, md = Math.sqrt(mx * mx + my * my + mz * mz), minD = R_BALL + p.tube;
        if (md < minD && md > 1e-6) {
          mx /= md; my /= md; mz /= md;
          b.px = qx + mx * minD; b.py = qy + my * minD; b.pz = qz + mz * minD;
          var im2 = contact(b, mx, my, mz, 0.5, 0.3);
          if (im2 > 0.25 && ev) ev.push({ type: 'rim', v: im2 * 0.6 });
        }
      }
    }
  }

  // One fixed physics step.
  P.step = function (w, b, tr, dt, ev) {
    if (tr.done && tr.reason !== 'made' && b.py <= R_BALL + 0.001 && Math.abs(b.vy) < 0.05) {
      // resting: just roll friction
    }
    tr.t += dt;
    b.vy -= G * dt;
    if (b.py > 0.5) { b.vx += w.windX * 0.35 * dt; b.vz += w.windZ * 0.35 * dt; }
    var prevY = b.py;
    b.px += b.vx * dt; b.py += b.vy * dt; b.pz += b.vz * dt;
    if (b.py > tr.maxY) tr.maxY = b.py;

    // only test hoop pieces when nearby (cheap)
    var dxh = b.px - w.hx, dzh = b.pz - w.hz;
    if (Math.abs(b.py - w.hy) < 1.2 && dxh * dxh + dzh * dzh < 2.0) { rim(w, b, tr, ev); bracket(w, b, tr, ev); }
    if (b.pz > P.BOARD_Z - 0.3 && b.pz < P.BOARD_Z + 0.4) board(w, b, tr, ev);
    if (w.obstacles) obstacles(w, b, tr, ev);
    if (w.props) props(w, b, tr, ev);

    if (b.py < R_BALL) {
      b.py = R_BALL;
      var imp = contact(b, 0, 1, 0, E_GROUND, MU_GROUND);
      // Bounce shot: the first hard floor bounce (before touching anything else) is part of the shot.
      var bounceOk = w.allowBounce && !tr.scored && tr.bounces === 0 && tr.rimAny + tr.board === 0;
      if (imp > 0.4) {
        if (bounceOk && imp > 3) tr.bounces = 1; else tr.ground++;
        if (ev) ev.push({ type: 'ground', v: imp });
      } else if (tr.ground === 0) tr.ground = 1;
    }

    // scoring
    var dh = Math.sqrt(dxh * dxh + dzh * dzh);
    if (prevY < w.hy && b.py >= w.hy && dh < w.R) tr.fromBelow = true;
    if (!tr.scored && prevY >= w.hy && b.py < w.hy && dh < w.R - 0.02 && !tr.fromBelow) {
      tr.scored = true;
      tr.swish = tr.rimAny === 0 && tr.board === 0;
      tr.bank = tr.boardBeforeScore > 0;
      if (ev) ev.push({ type: 'score', swish: tr.swish });
    }
    tr.inNet = b.py < w.hy && b.py > w.hy - 0.5 && dh < w.R;

    // stuck on the rim? give it a friendly nudge
    var sp = Math.abs(b.vx) + Math.abs(b.vy) + Math.abs(b.vz);
    if (!tr.scored && b.py > w.hy - 0.05 && tr.t - tr.lastRimT < 0.05 && sp < 1.0) {
      tr.stuckT += dt;
      if (tr.stuckT > 0.7) {
        tr.stuckT = 0; tr.nudges++;
        var inward = tr.nudges === 1 ? (Math.random() < 0.5) : false;
        var ux = dh > 1e-4 ? dxh / dh : 0, uz = dh > 1e-4 ? dzh / dh : 1;
        var s = inward ? -0.9 : 1.1;
        b.vx += ux * s; b.vz += uz * s; b.vy += 0.6;
        if (ev) ev.push({ type: 'nudge' });
      }
    } else tr.stuckT = Math.max(0, tr.stuckT - dt);

    // outcome
    if (!tr.done) {
      if (tr.scored) {
        tr.scoreT += dt;
        if (b.py < 1.6 || tr.scoreT > 1.2) { tr.done = true; tr.reason = 'made'; }
      } else if (tr.ground > 0) { tr.done = true; tr.reason = tr.rimAny + tr.board > 0 ? 'miss' : 'airball'; }
      else if (Math.abs(b.px) > 14 || b.pz < -18 || b.pz > 9) { tr.done = true; tr.reason = 'miss'; }
      else if (tr.t > 7) { tr.done = true; tr.reason = 'miss'; }
    }
  };

  // Compute launch velocity aimed at point (tx,ty,tz) with elevation alpha.
  // spinMul: 1 = normal backspin (default), 0 = no spin, -1 = topspin (used by bounce shots).
  P.launch = function (b, sx, sy, sz, tx, ty, tz, alphaDeg, speedScale, yawOff, spinMul) {
    var hx = tx - sx, hz = tz - sz, D = Math.sqrt(hx * hx + hz * hz), h = ty - sy;
    var al = alphaDeg * U.deg, ca = Math.cos(al);
    var denom = 2 * ca * ca * (D * Math.tan(al) - h);
    if (denom <= 0.01) denom = 0.01;
    var v = Math.sqrt(G * D * D / denom) * speedScale;
    var yaw = Math.atan2(hx, hz) + (yawOff || 0);
    b.px = sx; b.py = sy; b.pz = sz;
    b.vx = v * ca * Math.sin(yaw); b.vz = v * ca * Math.cos(yaw); b.vy = v * Math.sin(al);
    // backspin about the horizontal axis
    var rX = Math.cos(yaw), rZ = -Math.sin(yaw), spin = (13 + v * 0.6) * (spinMul == null ? 1 : spinMul);
    b.wx = -rX * spin; b.wy = 0; b.wz = -rZ * spin;
    return v;
  };

  P.simulate = function (w, b, maxT) {
    var tr = P.makeTracker(), n = Math.ceil((maxT || 6) / P.DT);
    for (var i = 0; i < n && !tr.done; i++) P.step(w, b, tr, P.DT, null);
    return tr;
  };

  // Launch elevation: steep enough that the ball drops in at > 40 degrees (clears the front rim).
  P.alphaFor = function (dist) { return U.clamp(64 - (dist - 2.5) * 1.4, 57, 64); };

  // Ideal shot for a given start position and twist. Returns {tx,ty,tz,alpha,scale} so that
  // launch(...) with yawOff 0 produces a clean make. Cached per spot.
  var cache = {};
  P.solve = function (w, sx, sy, sz, twist) {
    var eR = w.eRim || E_RIM, mR = w.muRim != null ? w.muRim : MU_RIM;
    if (twist !== 'bank' && twist !== 'bounce') twist = 'normal'; // other twists shoot like a normal shot
    var key = [sx.toFixed(2), sy.toFixed(2), sz.toFixed(2), w.hx.toFixed(2), twist, eR, mR].join('|');
    if (cache[key]) return cache[key];
    var dist = Math.sqrt((sx - w.hx) * (sx - w.hx) + (sz - w.hz) * (sz - w.hz));
    var alpha = P.alphaFor(dist);
    var b = P.makeBall(), best = null;
    var ww = { hx: w.hx, hy: w.hy, hz: w.hz, R: w.R, windX: 0, windZ: 0, targets: null, eRim: eR, muRim: mR, allowBounce: twist === 'bounce' };
    function test(tx, ty, tz, al, sc, spin) {
      P.launch(b, sx, sy, sz, tx, ty, tz, al, sc, 0, spin);
      var tr = P.simulate(ww, b, 6);
      return tr;
    }
    if (twist === 'bounce') {
      // A sky-high "moon ball" with topspin: it lands in front of the hoop and kicks up and in.
      // Prefer a clean swish whose neighbours (slightly short/long) also score, so it is fair.
      var alphas = [84, 82, 80, 86, 78], spins = [-1, 0], fallback = null, fbScore = -1;
      outerB:
      for (var ai = 0; ai < alphas.length; ai++) {
        for (var sp = 0; sp < spins.length; sp++) {
          for (var f = 0.4; f <= 0.86; f += 0.02) {
            var gx = sx + (w.hx - sx) * f, gz = sz + (w.hz - sz) * f;
            var trb = test(gx, R_BALL, gz, alphas[ai], 1, spins[sp]);
            if (!(trb.scored && trb.bounces === 1)) continue;
            var nb = 0;
            [0.99, 1.01].forEach(function (s2) { var t2 = test(gx, R_BALL, gz, alphas[ai], s2, spins[sp]); if (t2.scored && t2.bounces === 1) nb++; });
            var cand = { tx: gx, ty: R_BALL, tz: gz, alpha: alphas[ai], scale: 1, spin: spins[sp], ok: true };
            var score = (trb.swish ? 2 : 0) + nb;
            if (score >= 4) { best = cand; break outerB; }
            if (score > fbScore) { fbScore = score; fallback = cand; }
          }
        }
      }
      if (!best) best = fallback;
    } else if (twist === 'bank') {
      var plane = P.BOARD_Z - R_BALL; // ball centre touches the glass here
      var tzM = plane + (plane - w.hz) / E_BOARD;
      var dys = [0.05, 0.15, 0, 0.25, -0.05, 0.35], scales = [];
      for (var s = 0; s <= 30; s++) scales.push(1 + (s % 2 ? 1 : -1) * Math.ceil(s / 2) * 0.006);
      outer:
      for (var a = 0; a < 3; a++) {
        var al = alpha - a * 4;
        for (var i = 0; i < dys.length; i++) {
          for (var j = 0; j < scales.length; j++) {
            var tr = test(w.hx, w.hy + dys[i], tzM, al, scales[j]);
            if (tr.scored && tr.bank && tr.rim <= 1) { best = { tx: w.hx, ty: w.hy + dys[i], tz: tzM, alpha: al, scale: scales[j], ok: true }; break outer; }
          }
        }
      }
    } else {
      var sc0 = [1, 0.995, 1.005, 0.99, 1.01, 0.985, 1.015, 0.98, 1.02];
      for (var k = 0; k < sc0.length; k++) {
        var tr2 = test(w.hx, w.hy, w.hz, alpha, sc0[k]);
        if (tr2.scored && tr2.swish) { best = { tx: w.hx, ty: w.hy, tz: w.hz, alpha: alpha, scale: sc0[k], ok: true }; break; }
      }
    }
    if (!best) best = { tx: w.hx, ty: w.hy, tz: w.hz, alpha: alpha, scale: 1, ok: false };
    cache[key] = best;
    return best;
  };

  // Ideal launch for a signature trick shot: off a prop (box face) or through a ring gate,
  // then in. Searches aim points on the prop's face, launch angles and spin, and prefers a
  // swish whose neighbours (a little long/short, a little left/right) also work, so a
  // perfect release is reliable and near-misses still feel close. Cached per spot and prop.
  // prop.face = { axis: 'x'|'y'|'z', v, a: [lo, hi], b: [lo, hi] } describes where to aim:
  // axis 'x' -> a = y range, b = z range; axis 'y' (top) -> a = x range, b = z range.
  P.trickOk = function (tr, prop) {
    return tr.scored && (prop.type === 'ring' ? tr.gates.indexOf(prop.id) >= 0 : tr.propHits.indexOf(prop.id) >= 0);
  };
  P.solveTrick = function (w, sx, sy, sz, prop) {
    var key = ['trick', prop.id, sx.toFixed(2), sy.toFixed(2), sz.toFixed(2), w.hx.toFixed(2)].join('|');
    if (cache[key]) return cache[key];
    var ww = { hx: w.hx, hy: w.hy, hz: w.hz, R: w.R, windX: 0, windZ: 0, targets: null, eRim: w.eRim || E_RIM,
      muRim: w.muRim != null ? w.muRim : MU_RIM, allowBounce: false, obstacles: null, props: w.props };
    var b = P.makeBall(), best = null, bestScore = -1;
    function run(c, sc, yaw) {
      P.launch(b, sx, sy, sz, c.tx, c.ty, c.tz, c.alpha, sc, yaw || 0, c.spin);
      return P.simulate(ww, b, 7);
    }
    function rate(c) {
      var s0 = c.scale0 || 1, tr = run(c, s0, 0);
      if (!P.trickOk(tr, prop)) return -1;
      var s = tr.swish ? 2 : tr.rimAny <= 1 ? 1 : 0;
      [[0.99, 0], [1.01, 0], [1, -0.5], [1, 0.5]].forEach(function (n) { if (P.trickOk(run(c, s0 * n[0], n[1] * U.deg), prop)) s++; });
      return s;
    }
    var cands = [];
    if (prop.type === 'ring') {
      // the normal clean shot, when the ring sits right on its path...
      var n0 = P.solve(w, sx, sy, sz, 'normal');
      cands.push({ tx: n0.tx, ty: n0.ty, tz: n0.tz, alpha: n0.alpha, spin: 1, scale0: n0.scale });
      // ...or the one parabola through the shooter, the ring centre and the rim centre
      var ux = w.hx - sx, uz = w.hz - sz, dH = Math.sqrt(ux * ux + uz * uz);
      var dC = ((prop.x - sx) * ux + (prop.z - sz) * uz) / dH, yC = prop.y - sy, yH = w.hy - sy;
      var tn = (yC * dH * dH - yH * dC * dC) / (dC * dH * dH - dH * dC * dC);
      var alR = Math.atan(tn) / U.deg;
      [1, 0.997, 1.003, 0.994, 1.006, 0.99, 1.01].forEach(function (s) { cands.push({ tx: w.hx, ty: w.hy, tz: w.hz, alpha: alR, spin: 1, scale0: s }); });
    } else {
      var f = prop.face, alphas = prop.alphas || [40, 46, 52, 58, 64], spins = prop.spins || [1], N = 9;
      for (var i = 0; i < N; i++) for (var j = 0; j < N; j++) {
        var ua = f.a[0] + (f.a[1] - f.a[0]) * (i + 0.5) / N, ub = f.b[0] + (f.b[1] - f.b[0]) * (j + 0.5) / N;
        var p = f.axis === 'x' ? [f.v, ua, ub] : f.axis === 'y' ? [ua, f.v, ub] : [ua, ub, f.v];
        alphas.forEach(function (al) { spins.forEach(function (sp) { cands.push({ tx: p[0], ty: p[1], tz: p[2], alpha: al, spin: sp }); }); });
      }
    }
    for (var k = 0; k < cands.length; k++) {
      var c = cands[k];
      // scale 1 aims the ball right at the point; ring candidates carry their own scale
      var s = rate(c);
      if (s > bestScore) { bestScore = s; best = { tx: c.tx, ty: c.ty, tz: c.tz, alpha: c.alpha, scale: c.scale0 || 1, spin: c.spin, ok: true, score: s }; }
      if (s >= 6) break;
    }
    if (!best) { var nn = P.solve(w, sx, sy, sz, 'normal'); best = { tx: nn.tx, ty: nn.ty, tz: nn.tz, alpha: nn.alpha, scale: nn.scale, spin: 1, ok: false }; }
    cache[key] = best;
    return best;
  };

  // Sample an ideal path (for the coach's chalk line in Trick Shot mode).
  P.path = function (w, sx, sy, sz, ideal, maxT) {
    var b = P.makeBall(), tr = P.makeTracker(), pts = [], n = Math.ceil((maxT || 4) / P.DT);
    var ww = { hx: w.hx, hy: w.hy, hz: w.hz, R: w.R, windX: 0, windZ: 0, targets: null, eRim: w.eRim || E_RIM,
      muRim: w.muRim != null ? w.muRim : MU_RIM, allowBounce: w.allowBounce, obstacles: null, props: w.props };
    P.launch(b, sx, sy, sz, ideal.tx, ideal.ty, ideal.tz, ideal.alpha, ideal.scale, 0, ideal.spin);
    for (var i = 0; i < n && !tr.done; i++) {
      P.step(ww, b, tr, P.DT, null);
      if (i % 10 === 0) pts.push([b.px, b.py, b.pz]);
      if (tr.scored) break;
    }
    return pts;
  };

  // ---------- Verlet net ----------
  P.makeNet = function (w) {
    var rings = 7, per = 14, len = 0.44, nodes = [], links = [];
    for (var i = 0; i < rings; i++) {
      var f = i / (rings - 1), rr = w.R * (1 - 0.4 * f), y = w.hy - f * len;
      for (var j = 0; j < per; j++) {
        var a = (j + (i % 2) * 0.5) / per * Math.PI * 2;
        var x = w.hx + Math.cos(a) * rr, z = w.hz + Math.sin(a) * rr;
        nodes.push({ x: x, y: y, z: z, ox: x, oy: y, oz: z, a: a, ring: i, fixed: i === 0 });
      }
    }
    function idx(i, j) { return i * per + ((j + per) % per); }
    function link(a, b, stiff) {
      var A = nodes[a], B = nodes[b];
      links.push({ a: a, b: b, rest: Math.hypot(A.x - B.x, A.y - B.y, A.z - B.z), k: stiff });
    }
    for (var i2 = 0; i2 < rings - 1; i2++) {
      for (var j2 = 0; j2 < per; j2++) {
        var o = i2 % 2;
        link(idx(i2, j2), idx(i2 + 1, j2 - 1 + o), 1);
        link(idx(i2, j2), idx(i2 + 1, j2 + o), 1);
        link(idx(i2 + 1, j2), idx(i2 + 1, j2 + 1), 0.3);
      }
    }
    return { nodes: nodes, links: links, rings: rings, per: per, hx: w.hx, energy: 0 };
  };
  P.stepNet = function (net, w, b, dt, ballActive) {
    var nodes = net.nodes, i, n;
    var shift = w.hx - net.hx; net.hx = w.hx;
    var damp = 0.965, g = G * dt * dt;
    for (i = 0; i < nodes.length; i++) {
      n = nodes[i];
      if (n.fixed) {
        n.x = w.hx + Math.cos(n.a) * w.R; n.y = w.hy; n.z = w.hz + Math.sin(n.a) * w.R;
        n.ox = n.x; n.oy = n.y; n.oz = n.z; continue;
      }
      if (shift) { n.x += shift * 0.5; n.ox += shift * 0.5; }
      var vx = (n.x - n.ox) * damp, vy = (n.y - n.oy) * damp, vz = (n.z - n.oz) * damp;
      n.ox = n.x; n.oy = n.y; n.oz = n.z;
      n.x += vx; n.y += vy - g; n.z += vz;
    }
    var hit = false;
    for (var it = 0; it < 4; it++) {
      var L = net.links;
      for (var k = 0; k < L.length; k++) {
        var l = L[k], A = nodes[l.a], B = nodes[l.b];
        var dx = B.x - A.x, dy = B.y - A.y, dz = B.z - A.z;
        var d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-6;
        var diff = (d - l.rest) / d * 0.5 * l.k;
        if (d < l.rest && l.k < 1) continue; // ring links only resist stretching
        dx *= diff; dy *= diff; dz *= diff;
        if (!A.fixed) { A.x += dx; A.y += dy; A.z += dz; }
        if (!B.fixed) { B.x -= dx; B.y -= dy; B.z -= dz; }
      }
      if (ballActive) {
        var rr = R_BALL + 0.012, rr2 = rr * rr;
        for (i = 0; i < nodes.length; i++) {
          n = nodes[i]; if (n.fixed) continue;
          var ex = n.x - b.px, ey = n.y - b.py, ez = n.z - b.pz, d2 = ex * ex + ey * ey + ez * ez;
          if (d2 < rr2) {
            var dd = Math.sqrt(d2) || 1e-6, push = (rr - dd) / dd;
            n.x += ex * push; n.y += ey * push; n.z += ez * push;
            hit = true;
          }
        }
      }
    }
    // net energy (for sound + drawing): sum of node motion
    var e = 0;
    for (i = 0; i < nodes.length; i += 3) { n = nodes[i]; e += Math.abs(n.x - n.ox) + Math.abs(n.y - n.oy) + Math.abs(n.z - n.oz); }
    net.energy = e;
    return hit;
  };
})();
