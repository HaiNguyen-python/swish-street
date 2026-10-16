// Swish Street - court life (v0.5): little things that make each court feel lived in.
//  * Birds peck around behind the hoop (pigeons in the park, on the rooftop wall and at the
//    subway, robins in the snow) and flap away when a ball bounces near them or the crowd roars.
//    At the beach two crabs scuttle about and dig in instead.
//  * Passers-by stroll behind the court (a dog walker in the park, commuters at the subway,
//    surfers at the beach, night owls at the Midnight Court). They stop and cheer when you score,
//    and put their hands on their heads when you miss. In the rain they carry umbrellas.
//  * Autumn leaves drift across the park, blown by the wind.
// Purely visual: nothing here touches the ball, the physics or the random numbers the game uses
// (it has its own seeded generator). Reduced effects keeps the walkers and birds but drops the leaves.
(function () {
  'use strict';
  var SS = window.SS, U = SS.U, R = SS.render, D = SS.D;
  var pt = { x: 0, y: 0, s: 0, z: 0 }, pt2 = { x: 0, y: 0, s: 0, z: 0 };
  var rnd = U.rng(20261016);
  function rr(a, b) { return a + rnd() * (b - a); }
  function reduced() { return SS.save && SS.save.data.settings.reduced; }

  // Where things live on each court. Birds: [x, z, ground height]. lane: the walkers' path (z).
  var COURT_LIFE = {
    park: { bird: 'pigeon', birds: [[-2.6, 2.2, 0], [2.3, 1.9, 0], [3.1, 2.7, 0], [-1.7, 2.9, 0]], lane: 4.35, walkers: ['dog', 'plain', 'kid'] },
    roof: { bird: 'pigeon', birds: [[-3.1, 4.35, 1.0], [-1.9, 4.35, 1.0], [2.2, 4.35, 1.0]] },
    subway: { bird: 'pigeon', birds: [[-2.5, 2.4, 0], [2.8, 2.0, 0], [-3.4, 1.4, 0], [1.9, 2.9, 0]], lane: 4.2, walkers: ['case', 'plain', 'case'] },
    snow: { bird: 'robin', birds: [[-2.4, 2.0, 0], [2.6, 1.8, 0], [-1.5, 2.6, 0]] },
    // at the beach the walkers stroll along the boardwalk, in front of the railing and the crowd
    beach: { bird: 'crab', birds: [[-2.6, 2.2, 0], [2.4, 2.0, 0]], lane: 3.05, front: true, walkers: ['surf', 'plain', 'surf'] },
    night: { lane: 4.1, walkers: ['plain', 'kid'] }
  };
  var SHIRTS = ['#ef4444', '#22c55e', '#3b82f6', '#f59e0b', '#a855f7', '#14b8a6', '#ec4899', '#f97316'];
  var PANTS = ['#1e3a8a', '#374151', '#78350f', '#111827', '#475569'];

  var L = (SS.life = { on: true });
  var st = { key: '', birds: [], walkers: [], spawn: 3, mood: null, time: 0 };

  function reset(key) {
    st.key = key; st.birds = []; st.walkers = []; st.spawn = rr(1.5, 4); st.mood = null;
    var cfg = COURT_LIFE[R.envId];
    if (!cfg || !cfg.birds || R.variantId === 'night') return; // birds are asleep at night
    cfg.birds.forEach(function (b) {
      st.birds.push({ kind: cfg.bird, hx: b[0], hz: b[1], gy: b[2], x: b[0], z: b[1], y: b[2], dir: rnd() < 0.5 ? -1 : 1,
        state: 'idle', t: rr(0, 3), peck: 0, next: rr(0.6, 2.5), hop: null, vx: 0, vy: 0, vz: 0, ph: rr(0, 6) });
    });
  }
  function spawnWalker(cfg) {
    var dir = rnd() < 0.5 ? 1 : -1, kind = cfg.walkers[(rnd() * cfg.walkers.length) | 0];
    st.walkers.push({
      kind: kind, dir: dir, x: -dir * 13, z: cfg.lane + rr(-0.15, 0.15), sp: kind === 'kid' ? rr(1.4, 1.8) : rr(1.0, 1.35), ph: rr(0, 6),
      h: kind === 'kid' ? rr(1.15, 1.3) : rr(1.55, 1.8), shirt: SHIRTS[(rnd() * SHIRTS.length) | 0], pants: PANTS[(rnd() * PANTS.length) | 0],
      skin: D.SKINS[(rnd() * D.SKINS.length) | 0], hair: D.HAIR_COLORS[(rnd() * 4) | 0], react: 0, mood: null, dogC: rnd() < 0.5 ? '#a16207' : '#e5e7eb'
    });
  }
  function scare(b, fromX, fromZ) {
    if (b.state !== 'idle') return;
    if (b.kind === 'crab') { b.state = 'hide'; b.t = 0; b.dur = rr(4, 7); return; }
    var dx = b.x - fromX, dz = b.z - fromZ, l = Math.hypot(dx, dz) || 1;
    b.state = 'fly'; b.t = 0; b.vx = dx / l * rr(1.5, 2.6); b.vz = Math.abs(dz / l) * 1.2 + rr(0.8, 1.6); b.vy = rr(2.4, 3.4);
    b.dir = b.vx >= 0 ? 1 : -1;
    if (SS.audio && SS.audio.flap) SS.audio.flap();
  }

  // ---------- Update ----------
  L.tick = function (dt, S) {
    var key = R.envId + '|' + (R.variantId || '');
    if (key !== st.key) reset(key);
    st.time += dt;
    var cfg = COURT_LIFE[R.envId];
    if (!cfg) return;
    // crowd reactions start when the play scene changes the crowd mood (a make or a miss)
    var mood = S && S.crowdMood, fresh = mood && mood !== st.mood;
    st.mood = mood;
    if (fresh) {
      st.walkers.forEach(function (w) { if (Math.abs(w.x) < 10) { w.react = mood.k === 'cheer' ? 1.9 : 1.4; w.mood = mood.k; } });
      if (mood.k === 'cheer' && S.crowdE > 0.6) st.birds.forEach(function (b) { if (rnd() < 0.4) scare(b, 0, 0); });
    }
    // a ball bouncing nearby scares the birds
    var ball = S && (S.state === 'flight' || S.state === 'after') && !S.replay ? S.ball : null;
    for (var i = 0; i < st.birds.length; i++) {
      var b = st.birds[i];
      b.t += dt;
      if (b.state === 'idle') {
        if (ball && ball.py < b.gy + 1.4) {
          var dx = ball.px - b.x, dz = ball.pz - b.z;
          if (dx * dx + dz * dz < 4.4) { scare(b, ball.px, ball.pz); continue; }
        }
        b.next -= dt;
        if (b.hop) {
          b.hop.t += dt;
          var f = Math.min(1, b.hop.t / 0.28);
          b.x = U.lerp(b.hop.x0, b.hop.x1, f); b.z = U.lerp(b.hop.z0, b.hop.z1, f); b.y = b.gy + Math.sin(f * Math.PI) * 0.08;
          if (f >= 1) b.hop = null;
        } else if (b.next <= 0) {
          b.next = rr(0.8, 2.8);
          var r = rnd();
          if (r < 0.45) {
            // hop (or scuttle) a little, but stay near home
            var nx = U.clamp(b.x + rr(-0.35, 0.35), b.hx - 0.6, b.hx + 0.6), nz = b.gy > 0 ? b.z : U.clamp(b.z + rr(-0.25, 0.25), b.hz - 0.5, b.hz + 0.5);
            b.dir = nx >= b.x ? 1 : -1; b.hop = { t: 0, x0: b.x, z0: b.z, x1: nx, z1: nz };
          } else if (r < 0.65) b.dir = -b.dir;
          else b.peck = 0.6;
        }
        if (b.peck > 0) b.peck -= dt;
      } else if (b.state === 'fly') {
        b.vy -= 1.2 * dt; b.x += b.vx * dt; b.y += Math.max(0.6, b.vy) * dt; b.z += b.vz * dt;
        if (b.t > 3) { b.state = 'away'; b.t = 0; b.dur = rr(5, 10); }
      } else if (b.state === 'away') {
        if (b.t > b.dur) { b.state = 'land'; b.t = 0; b.x = b.hx + b.dir * 4; b.y = b.gy + 3; b.z = b.hz + 1.5; }
      } else if (b.state === 'land') {
        var k = Math.min(1, b.t / 1.8), e = U.easeOutCubic(k);
        b.x = U.lerp(b.hx + b.dir * 4, b.hx, e); b.z = U.lerp(b.hz + 1.5, b.hz, e); b.y = b.gy + (1 - e) * 3;
        b.dir = -Math.sign(b.hx + b.dir * 4 - b.hx) || 1;
        if (k >= 1) { b.state = 'idle'; b.y = b.gy; b.next = rr(1, 2); }
      } else if (b.state === 'hide') {
        if (b.t > b.dur) { b.state = 'idle'; b.next = rr(1, 2); }
      }
    }
    // passers-by
    if (cfg.lane != null) {
      st.spawn -= dt;
      if (st.spawn <= 0 && st.walkers.length < 2) { spawnWalker(cfg); st.spawn = rr(6, 13); }
      for (var j = st.walkers.length - 1; j >= 0; j--) {
        var w = st.walkers[j];
        if (w.react > 0) w.react -= dt;
        else { w.x += w.dir * w.sp * dt; w.ph += dt * w.sp * 5.2; }
        if (Math.abs(w.x) > 14) st.walkers.splice(j, 1);
      }
    }
  };

  // ---------- Draw ----------
  // drawBack: things that stand behind the crowd (walkers, birds on the rooftop wall).
  // drawFront: birds on the ground behind the hoop, in front of the crowd.
  function frontWalkers() { var c = COURT_LIFE[R.envId]; return !!(c && c.front); }
  L.drawBack = function (ctx, cam, time) {
    if (!L.on) return;
    if (!frontWalkers()) for (var i = 0; i < st.walkers.length; i++) drawWalker(ctx, cam, st.walkers[i], time);
    for (var k = 0; k < st.birds.length; k++) if (st.birds[k].hz > 3.2) drawBird(ctx, cam, st.birds[k], time);
  };
  L.drawFront = function (ctx, cam, time) {
    if (!L.on) return;
    for (var k = 0; k < st.birds.length; k++) if (st.birds[k].hz <= 3.2) drawBird(ctx, cam, st.birds[k], time);
    if (frontWalkers()) for (var i = 0; i < st.walkers.length; i++) drawWalker(ctx, cam, st.walkers[i], time);
  };

  function drawBird(ctx, cam, b, time) {
    if (b.state === 'away') return;
    if (!cam.project(b.x, b.y, b.z, pt)) return;
    // drawn about 1.6x life size, so they read on a phone screen (cartoon scale)
    var s = pt.s * 1.6, x = pt.x, y = pt.y, d = b.dir;
    if (s < 8) return;
    if (b.kind === 'crab') return drawCrab(ctx, b, x, y, s, time);
    var body = b.kind === 'robin' ? '#7c5c45' : '#8b93a3', head = b.kind === 'robin' ? '#6b4a33' : '#5b6475';
    var L0 = b.kind === 'robin' ? 0.8 : 1;
    s *= L0;
    if (b.state === 'fly' || b.state === 'land') {
      var flap = Math.sin(time * 22 + b.ph);
      ctx.fillStyle = body;
      ctx.beginPath(); ctx.ellipse(x, y, s * 0.13, s * 0.06, 0, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x - s * 0.04, y); ctx.lineTo(x - s * 0.18, y - flap * s * 0.17); ctx.lineTo(x + s * 0.04, y - flap * s * 0.05); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x + s * 0.04, y); ctx.lineTo(x + s * 0.2, y - flap * s * 0.15); ctx.lineTo(x - s * 0.02, y - flap * s * 0.05); ctx.fill();
      ctx.fillStyle = head; ctx.beginPath(); ctx.arc(x + d * s * 0.12, y - s * 0.03, s * 0.045, 0, 7); ctx.fill();
      return;
    }
    // standing: shadow, legs, tail, body, head (bobbing while pecking)
    var pk = b.peck > 0 ? Math.abs(Math.sin(b.peck * 16)) : 0, bob = Math.sin(time * 4 + b.ph) * 0.006 * s;
    ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.beginPath(); ctx.ellipse(x, y, s * 0.11, s * 0.025, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = '#f472b6'; ctx.lineWidth = Math.max(1, s * 0.012); ctx.beginPath();
    ctx.moveTo(x - s * 0.02, y - s * 0.05); ctx.lineTo(x - s * 0.025, y); ctx.moveTo(x + s * 0.02, y - s * 0.05); ctx.lineTo(x + s * 0.025, y); ctx.stroke();
    ctx.fillStyle = head; ctx.beginPath(); ctx.moveTo(x - d * s * 0.08, y - s * 0.1); ctx.lineTo(x - d * s * 0.19, y - s * 0.12); ctx.lineTo(x - d * s * 0.17, y - s * 0.07); ctx.fill();
    ctx.fillStyle = body; ctx.beginPath(); ctx.ellipse(x, y - s * 0.09 + bob, s * 0.11, s * 0.06, d * 0.15, 0, 7); ctx.fill();
    if (b.kind === 'robin') { ctx.fillStyle = '#f97316'; ctx.beginPath(); ctx.ellipse(x + d * s * 0.05, y - s * 0.08 + bob, s * 0.05, s * 0.04, 0, 0, 7); ctx.fill(); }
    else { ctx.fillStyle = '#6ee7b7'; ctx.beginPath(); ctx.ellipse(x + d * s * 0.06, y - s * 0.12 + bob, s * 0.03, s * 0.025, 0, 0, 7); ctx.fill(); }
    var hx = x + d * s * (0.09 + pk * 0.03), hy = y - s * 0.16 + pk * s * 0.1 + bob;
    ctx.fillStyle = head; ctx.beginPath(); ctx.arc(hx, hy, s * 0.04, 0, 7); ctx.fill();
    ctx.fillStyle = '#fbbf24'; ctx.beginPath(); ctx.moveTo(hx + d * s * 0.035, hy - s * 0.008); ctx.lineTo(hx + d * s * 0.075, hy + s * 0.005); ctx.lineTo(hx + d * s * 0.035, hy + s * 0.015); ctx.fill();
    if (s > 30) { ctx.fillStyle = '#111827'; ctx.beginPath(); ctx.arc(hx + d * s * 0.012, hy - s * 0.01, Math.max(0.8, s * 0.008), 0, 7); ctx.fill(); }
  }
  function drawCrab(ctx, b, x, y, s, time) {
    var hide = b.state === 'hide' ? Math.min(1, b.t * 3) * (b.t > b.dur - 0.4 ? (b.dur - b.t) / 0.4 : 1) : 0;
    var sq = 1 - hide * 0.85, walk = b.hop ? Math.sin(time * 30) * s * 0.01 : 0;
    ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.beginPath(); ctx.ellipse(x, y, s * 0.12, s * 0.025, 0, 0, 7); ctx.fill();
    if (hide > 0.1) { ctx.fillStyle = '#e9c46a'; ctx.beginPath(); ctx.ellipse(x, y - s * 0.01, s * 0.12 * hide, s * 0.03 * hide, 0, Math.PI, 0); ctx.fill(); }
    if (sq < 0.2) return;
    ctx.strokeStyle = '#b91c1c'; ctx.lineWidth = Math.max(1, s * 0.012); ctx.beginPath();
    for (var k = -1; k <= 1; k += 2) for (var l = 0; l < 3; l++) {
      ctx.moveTo(x + k * s * 0.04, y - s * 0.03 * sq); ctx.lineTo(x + k * s * (0.1 + l * 0.015), y - s * (0.02 - l * 0.008) + (l % 2 ? walk : -walk));
    }
    ctx.stroke();
    ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.ellipse(x, y - s * 0.04 * sq, s * 0.075, s * 0.045 * sq, 0, Math.PI, 0); ctx.fill();
    // claws, waving a little
    var wv = Math.sin(time * 5 + b.ph) * s * 0.01;
    ctx.beginPath(); ctx.arc(x - s * 0.1, y - s * 0.07 * sq + wv, s * 0.025, 0, 7); ctx.arc(x + s * 0.1, y - s * 0.07 * sq - wv, s * 0.025, 0, 7); ctx.fill();
    ctx.fillStyle = '#111827';
    ctx.beginPath(); ctx.arc(x - s * 0.025, y - s * 0.1 * sq, Math.max(0.8, s * 0.01), 0, 7); ctx.arc(x + s * 0.025, y - s * 0.1 * sq, Math.max(0.8, s * 0.01), 0, 7); ctx.fill();
  }

  function drawWalker(ctx, cam, w, time) {
    if (!cam.project(w.x, 0, w.z, pt)) return;
    var s = pt.s, h = w.h * s, x = pt.x, y = pt.y, d = w.dir;
    if (h < 8) return;
    var cheer = w.react > 0 && w.mood === 'cheer', aww = w.react > 0 && w.mood === 'aww';
    var jump = cheer ? Math.abs(Math.sin(w.react * 9)) * h * 0.06 : 0;
    var sw = w.react > 0 ? 0 : Math.sin(w.ph), lw = Math.max(1.5, h * 0.07);
    y -= jump;
    // the dog trots ahead on a lead
    if (w.kind === 'dog' && cam.project(w.x + d * 0.9, 0, w.z, pt2)) {
      var ds = pt2.s, dx = pt2.x, dy = pt2.y - jump * 0.5 - (cheer ? Math.abs(Math.sin(w.react * 12)) * ds * 0.08 : 0), leg = Math.sin(w.ph * 1.6) * ds * 0.04;
      ctx.strokeStyle = w.dogC; ctx.lineWidth = Math.max(1, ds * 0.04); ctx.lineCap = 'round'; ctx.beginPath();
      ctx.moveTo(dx - ds * 0.12, dy - ds * 0.16); ctx.lineTo(dx - ds * 0.12 + leg, dy); ctx.moveTo(dx + ds * 0.12, dy - ds * 0.16); ctx.lineTo(dx + ds * 0.12 - leg, dy);
      ctx.moveTo(dx - d * ds * 0.18, dy - ds * 0.24); ctx.lineTo(dx - d * ds * 0.3, dy - ds * (0.36 + Math.abs(Math.sin(time * 10)) * 0.06)); ctx.stroke();
      ctx.fillStyle = w.dogC; ctx.beginPath(); ctx.ellipse(dx, dy - ds * 0.22, ds * 0.2, ds * 0.08, 0, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(dx + d * ds * 0.22, dy - ds * 0.32, ds * 0.08, 0, 7); ctx.fill();
      ctx.fillStyle = '#111827'; ctx.beginPath(); ctx.arc(dx + d * ds * 0.29, dy - ds * 0.31, Math.max(0.8, ds * 0.02), 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(30,30,30,0.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(dx + d * ds * 0.15, dy - ds * 0.3); ctx.lineTo(x + d * h * 0.12, y - h * 0.48); ctx.stroke();
    }
    ctx.lineCap = 'round';
    // legs
    ctx.strokeStyle = w.pants; ctx.lineWidth = lw * 1.2; ctx.beginPath();
    ctx.moveTo(x, y - h * 0.47); ctx.lineTo(x + sw * h * 0.12, y);
    ctx.moveTo(x, y - h * 0.47); ctx.lineTo(x - sw * h * 0.12, y); ctx.stroke();
    // surfboard behind the body
    if (w.kind === 'surf') { ctx.fillStyle = '#38bdf8'; ctx.beginPath(); ctx.ellipse(x - d * h * 0.18, y - h * 0.55, h * 0.07, h * 0.42, d * 0.08, 0, 7); ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillRect(x - d * h * 0.18 - 1, y - h * 0.95, 2, h * 0.8); }
    // body
    ctx.fillStyle = w.shirt; SS.ui.rr(ctx, x - h * 0.12, y - h * 0.8, h * 0.24, h * 0.38, h * 0.08); ctx.fill();
    // arms: swinging, up in a cheer, or on the head after a miss
    ctx.strokeStyle = w.skin; ctx.lineWidth = lw; ctx.beginPath();
    if (cheer) {
      var wave = Math.sin(w.react * 14) * h * 0.04;
      ctx.moveTo(x - h * 0.1, y - h * 0.74); ctx.lineTo(x - h * 0.2 + wave, y - h * 1.08);
      ctx.moveTo(x + h * 0.1, y - h * 0.74); ctx.lineTo(x + h * 0.2 - wave, y - h * 1.08);
    } else if (aww) {
      ctx.moveTo(x - h * 0.1, y - h * 0.74); ctx.lineTo(x - h * 0.17, y - h * 0.86); ctx.lineTo(x - h * 0.06, y - h * 0.98);
      ctx.moveTo(x + h * 0.1, y - h * 0.74); ctx.lineTo(x + h * 0.17, y - h * 0.86); ctx.lineTo(x + h * 0.06, y - h * 0.98);
    } else {
      ctx.moveTo(x - h * 0.1, y - h * 0.74); ctx.lineTo(x - h * 0.13 - sw * h * 0.08, y - h * 0.48);
      ctx.moveTo(x + h * 0.1, y - h * 0.74); ctx.lineTo(x + h * 0.13 + sw * h * 0.08, y - h * 0.48);
    }
    ctx.stroke();
    if (w.kind === 'case' && !cheer) { ctx.fillStyle = '#78350f'; ctx.fillRect(x + d * h * 0.13 - h * 0.06, y - h * 0.5, h * 0.13, h * 0.1); }
    // head and hair
    ctx.fillStyle = w.skin; ctx.beginPath(); ctx.arc(x, y - h * 0.9, h * 0.085, 0, 7); ctx.fill();
    ctx.fillStyle = w.hair; ctx.beginPath(); ctx.arc(x, y - h * 0.92, h * 0.088, Math.PI * 1.05, Math.PI * 1.95); ctx.fill();
    // rainy day: an umbrella
    if (R.variant && R.variant.rain && !cheer) {
      ctx.strokeStyle = '#1f2937'; ctx.lineWidth = Math.max(1, lw * 0.5); ctx.beginPath(); ctx.moveTo(x + d * h * 0.1, y - h * 0.6); ctx.lineTo(x + d * h * 0.06, y - h * 1.2); ctx.stroke();
      ctx.fillStyle = w.shirt; ctx.beginPath(); ctx.ellipse(x + d * h * 0.06, y - h * 1.18, h * 0.32, h * 0.16, 0, Math.PI, 0); ctx.fill();
    }
  }

  // Autumn leaves drifting across the park (screen space, cheap). Off with Reduced effects.
  var leaves = null, LEAF_C = ['#f59e0b', '#ea580c', '#b45309', '#facc15', '#dc2626'];
  if (!R.WEATHER.park) R.WEATHER.park = function (ctx, cam, W, H, time) {
    if (reduced() || (R.variant && R.variant.rain)) return;
    if (!leaves) { leaves = []; var r = U.rng(31); for (var i = 0; i < 9; i++) leaves.push({ x: r(), y: r(), sp: r.range(0.035, 0.07), s: r.range(4, 7), ph: r() * 6, c: LEAF_C[i % LEAF_C.length] }); }
    var wind = SS.play && SS.sceneName === 'play' ? (SS.play.world.windX || 0) : 0;
    for (var j = 0; j < leaves.length; j++) {
      var f = leaves[j], yy = ((f.y + time * f.sp) % 1) * (H + 40) - 20;
      var xx = ((((f.x + time * (0.012 + wind * 0.02) - cam.yaw * 0.25 + Math.sin(time * 1.1 + f.ph) * 0.03) % 1) + 1) % 1) * W;
      var rot = time * 2 + f.ph, sx = Math.cos(time * 3 + f.ph);
      ctx.save(); ctx.translate(xx, yy); ctx.rotate(rot); ctx.scale(Math.max(0.25, Math.abs(sx)), 1);
      ctx.fillStyle = f.c; ctx.beginPath(); ctx.moveTo(0, -f.s); ctx.quadraticCurveTo(f.s * 0.8, 0, 0, f.s); ctx.quadraticCurveTo(-f.s * 0.8, 0, 0, -f.s); ctx.fill();
      ctx.restore();
    }
  };

  // test hooks
  L.state = function () { return st; };
  L.scareAll = function () { st.birds.forEach(function (b) { scare(b, 0, 0); }); };
})();
