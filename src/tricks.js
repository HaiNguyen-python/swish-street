// Swish Street - Trick Shot Hall (v0.3).
//  * SS.tricks.check(): spots named trick shots after every player shot, in any mode.
//  * SS.album: the Swish Cam photo album (stored locally, never sent anywhere).
//  * SS.modes.trick(courtId): Trick Shot mode, a relaxed sandbox with each court's signature prop.
//  * SS.scenes.tricks: the Hall itself (signature tricks, skill tricks, photos).
(function () {
  'use strict';
  var SS = window.SS, U = SS.U, D = SS.D, UI = SS.ui, A = SS.audio, AV = SS.avatar, R = SS.render, P = SS.Phys, t = SS.t;
  var M = SS.modes, SC = SS.scenes;
  function save() { return SS.save.data; }
  var pt = { x: 0, y: 0, s: 0, z: 0 };

  // ---------- Detection ----------
  var TK = (SS.tricks = {});
  function detect(S, res) {
    var out = [];
    var mp = S.mode.trickProp;
    if (mp && res.made && (mp.type === 'ring' ? res.gates.indexOf(mp.id) >= 0 : res.props.indexOf(mp.id) >= 0)) out.push(mp.id);
    if (!res.made) return out;
    var tw = res.twist;
    if (res.maxY > 7.5) out.push('moon');
    if (res.rimAny >= 4) out.push('dancer');
    if (res.bank && res.rimAny >= 2) out.push('kissroll');
    if (res.swish && res.dist >= 5.5 && res.dist < 10) out.push('downtown');
    if (res.dist >= 10) out.push('halfcourt');
    if (tw === 'nolook' && res.swish) out.push('blindside');
    if (tw === 'blind' && res.bank) out.push('memory');
    if (res.bounced && res.swish) out.push('boingswish');
    if (R.envId === 'subway' && R.dyn.train && R.dyn.train.on) out.push('trainride');
    var obs = S.world.obstacles;
    if (obs && obs.some(function (o) { return o.on && !o.hit && !o.flee; })) out.push('gulldodge');
    if (S.clutch && res.swish && S.mode.id !== 'buzzer') out.push('icecold');
    if (res.nudged) out.push('friendly');
    if (res.wind >= 1.3) out.push('windrider');
    if (tw === 'moving' && res.swish) out.push('driveby');
    return out;
  }
  TK.detect = detect;
  TK.check = function (S, res) {
    var ids = detect(S, res);
    if (!ids.length) return [];
    var before = SS.save.trickCount(), news = [], coins = 0;
    ids.forEach(function (id) {
      if (SS.save.addTrick(id)) { news.push(id); coins += D.trick(id).sig ? 50 : 25; }
    });
    res.trick = ids[0];
    var shown = D.trick(news[0] || ids[0]);
    S.lastShot.trickName = t(shown.name);
    if (coins) SS.save.addCoins(coins);
    if (news.length) {
      var first = D.trick(news[0]);
      S.trickCard = { t: 0, name: first.name, sig: !!first.sig, count: SS.save.trickCount(), coins: coins };
      A.trick(); S.mcPick('trick');
      if (SS.a11y) SS.a11y.say(t('New trick shot: {n}', { n: t(first.name) }));
      // did this unlock a new ball trail?
      var after = SS.save.trickCount();
      D.ITEMS.trail.forEach(function (it) {
        if (it.tricks && it.tricks > before && it.tricks <= after) UI.toast(t('New ball trail: {n}!', { n: t(it.name) }), '#7c3aed');
      });
    } else {
      S.pop(t(shown.name).toUpperCase() + '!', '#f0abfc', 0.46, 0.9);
    }
    if (S.mode.onTrick) S.mode.onTrick(S, ids, news);
    return news;
  };

  // ---------- Photo album (Swish Cam) ----------
  var AKEY = 'swishstreet.album', MAX = 12, thumbs = {};
  function store(a) {
    for (var tries = 0; tries < MAX; tries++) {
      try { localStorage.setItem(AKEY, JSON.stringify(a)); return true; } catch (e) { a.pop(); if (!a.length) return false; }
    }
    return false;
  }
  var AL = (SS.album = {
    KEY: AKEY,
    list: function () {
      var a = [];
      try { a = JSON.parse(localStorage.getItem(AKEY) || '[]'); } catch (e) { a = []; }
      if (!Array.isArray(a)) a = [];
      return a.filter(function (p) { return p && typeof p.img === 'string' && p.img.indexOf('data:image/jpeg;base64,') === 0 && p.img.length < 400000; });
    },
    add: function (canvas, cap) {
      var url;
      try { url = canvas.toDataURL('image/jpeg', 0.82); } catch (e) { return false; }
      var a = AL.list();
      a.unshift({ img: url, cap: String(cap || '').slice(0, 40), date: U.todayKey() });
      while (a.length > MAX) a.pop();
      AL.lastUrl = url;
      return store(a);
    },
    // v0.5 photo studio: swap the newest photo for a re-framed one (only if it is still ours)
    replaceLatest: function (canvas, cap) {
      var a = AL.list(), url;
      if (!a.length || a[0].img !== AL.lastUrl) return false;
      try { url = canvas.toDataURL('image/jpeg', 0.82); } catch (e) { return false; }
      a[0] = { img: url, cap: String(cap || '').slice(0, 40), date: a[0].date };
      AL.lastUrl = url;
      return store(a);
    },
    image: function (p) {
      if (!thumbs[p.img]) { var im = new Image(); im.src = p.img; thumbs[p.img] = im; }
      return thumbs[p.img];
    }
  });

  // ---------- Trick Shot mode ----------
  function buildProp(st) {
    if (typeof st === 'string') st = D.TRICK_SETUPS[st];
    if (st.prop) return Object.assign({ id: st.trick }, st.prop);
    var rg = st.ring, sp = D.SPOTS[st.spot], a = sp.a * U.deg, sx = Math.sin(a) * sp.d, sz = -Math.cos(a) * sp.d;
    if (rg.f != null) {
      var l = Math.hypot(sx, sz);
      return { type: 'ring', id: st.trick, x: sx * (1 - rg.f), y: rg.y, z: sz * (1 - rg.f), nx: -sx / l, ny: 0, nz: -sz / l, R: rg.R, tube: rg.tube || 0.035 };
    }
    return { type: 'ring', id: st.trick, x: rg.x, y: rg.y, z: rg.z, nx: 0, ny: 0, nz: 1, R: rg.R, tube: rg.tube || 0.04 };
  }
  TK.buildProp = buildProp;

  // ---------- Moving props (v0.4) ----------
  // 'swing': a tire on ropes swings gently along the shot line.
  // 'train': the Plaza Express rolls in, stops at the station (the middle of the court) for a
  // moment, rolls out, and comes back from the other side. 12-second cycle.
  var TRAIN = { arrive: 2.4, dwell: 2.4, leave: 2.4, gone: 2.0, far: 11 };
  TRAIN.cycle = TRAIN.arrive + TRAIN.dwell + TRAIN.leave + TRAIN.gone;
  function trainX(tm) {
    var c = TRAIN, ph = ((tm % (c.cycle * 2)) + c.cycle * 2) % (c.cycle * 2), dir = ph >= c.cycle ? -1 : 1, p = ph % c.cycle, u;
    if (p < c.arrive) { u = p / c.arrive; return -dir * c.far * (1 - u) * (1 - u); }
    p -= c.arrive; if (p < c.dwell) return 0;
    p -= c.dwell; if (p < c.leave) { u = p / c.leave; return dir * c.far * u * u; }
    return dir * c.far;
  }
  // Places a live prop for time tm (rest = the solver's resting copy).
  function placeProp(prop, rest, mv, tm) {
    if (mv.kind === 'swing') {
      // sways sideways across the shot line, so you have to time it through the middle
      var off = mv.amp * Math.sin(tm * Math.PI * 2 / mv.period);
      prop.x = rest.x + rest.nz * off; prop.z = rest.z - rest.nx * off;
      prop.y = rest.y + off * off / (2 * 2.8); // a swing rises a little at the ends of its arc
      prop.off = off;
    } else if (mv.kind === 'train') {
      var x = trainX(tm);
      prop.x0 = rest.x0 + x; prop.x1 = rest.x1 + x;
      prop.vx = (trainX(tm + 0.01) - trainX(tm - 0.01)) / 0.02;
      prop.off = x;
    }
  }
  TK.trainX = trainX;
  // For each release moment in the cycle: would a perfect, straight release land the trick?
  // (Simulated with the prop really moving, so the GO light never lies.)
  function timingTable(S, rest, mv, ideal) {
    var cyc = mv.kind === 'train' ? TRAIN.cycle * 2 : mv.period, step = mv.kind === 'train' ? 0.1 : 0.05, out = [];
    var h = S.holdPoint(), live = Object.assign({}, rest), w = P.makeWorld((R.ENVS[S.mode.env] || {}).physics || {});
    w.props = [live];
    var b = P.makeBall();
    // when does the ball reach the prop? (resting prop) - lets us skip hopeless moments quickly
    var tr0 = P.makeTracker(), ta = -1, w0 = Object.assign({}, w, { props: [rest] });
    P.launch(b, h.x, h.y, h.z, ideal.tx, ideal.ty, ideal.tz, ideal.alpha, ideal.scale, 0, ideal.spin);
    for (var j = 0; j < 1800 && !tr0.done && ta < 0; j++) { P.step(w0, b, tr0, P.DT, null); if (tr0.propHits.length || tr0.gates.length) ta = tr0.t; }
    for (var tau = 0; tau < cyc; tau += step) {
      if (mv.kind === 'train' && ta > 0 && Math.abs(trainX(tau + ta)) > 2.5) { out.push(false); continue; }
      var tr = P.makeTracker();
      P.launch(b, h.x, h.y, h.z, ideal.tx, ideal.ty, ideal.tz, ideal.alpha, ideal.scale, 0, ideal.spin);
      for (var i = 0; i < 1800 && !tr.done; i++) {
        if (i % 4 === 0) placeProp(live, rest, mv, tau + tr.t); // the game moves props once a frame
        P.step(w, b, tr, P.DT, null);
        if (ta > 0 && tr.t > ta + 0.4 && !tr.propHits.length && !tr.gates.length) break; // missed the prop
      }
      out.push(P.trickOk(tr, rest));
    }
    return { step: step, cyc: cyc, ok: out };
  }

  // ---------- Art for the v0.4 props ----------
  var RING_ART = { snowman: 1, firering: 1, tire: 1 };
  function poly(ctx, cam, pts, fill, stroke) {
    if (!cam.polyPath(ctx, pts)) return;
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = Math.max(1, cam.F * 0.002); ctx.stroke(); }
  }
  function label(ctx, cam, x, y, z, txt, size, fill, rot) {
    if (!cam.project(x, y, z, pt)) return;
    ctx.save(); ctx.translate(pt.x, pt.y); ctx.rotate(rot || 0);
    ctx.font = '900 ' + Math.max(7, pt.s * size) + 'px ' + SS.FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = Math.max(2, pt.s * size * 0.18); ctx.strokeStyle = '#111827'; ctx.strokeText(txt, 0, 0);
    ctx.fillStyle = fill; ctx.fillText(txt, 0, 0); ctx.restore();
  }
  function circlePts(cx, y, cz, r, n) { var o = []; for (var i = 0; i < n; i++) { var a = i / n * Math.PI * 2; o.push([cx + Math.cos(a) * r, y, cz + Math.sin(a) * r]); } return o; }
  var NEW_ART = {
    // Tire Swing: a tree beside the shot, a rope and a swinging tire
    tire: function (ctx, cam, p, rest, time, ringPass, backPass, drawRing) {
      var sx = -rest.nz, sz = rest.nx, piv = { x: rest.x, y: rest.y + 2.8, z: rest.z };
      var tx = rest.x + sx * 1.65, tz = rest.z + sz * 1.65;
      if (backPass) {
        // a big branch reaches in over the court from a tree just out of view
        ctx.strokeStyle = '#6b4219'; ctx.lineWidth = Math.max(3, cam.F * 0.014); ctx.lineCap = 'round'; ctx.beginPath();
        cam.line(ctx, tx + sx * 2.5, piv.y + 0.5, tz + sz * 2.5, piv.x - sx * 0.7, piv.y + 0.05, piv.z - sz * 0.7); ctx.stroke();
        [[1.2, 0.7, 0, 1.2], [0.2, 0.55, 0.3, 0.9], [-1.0, 0.45, -0.2, 0.8], [2.2, 0.9, 0.2, 1.1]].forEach(function (lf) {
          if (cam.project(tx + sx * lf[0], piv.y + lf[1], tz + sz * lf[0] + lf[2], pt)) {
            ctx.fillStyle = '#2f8f3a'; ctx.beginPath(); ctx.arc(pt.x, pt.y, lf[3] * pt.s, 0, 7); ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.beginPath(); ctx.arc(pt.x - lf[3] * pt.s * 0.3, pt.y - lf[3] * pt.s * 0.3, lf[3] * pt.s * 0.45, 0, 7); ctx.fill();
          }
        });
        return;
      }
      if (!ringPass) return;
      ctx.strokeStyle = '#d6b98c'; ctx.lineWidth = Math.max(1.5, cam.F * 0.004); ctx.beginPath();
      cam.line(ctx, piv.x, piv.y, piv.z, p.x, p.y + p.R + p.tube, p.z); ctx.stroke();
      drawRing(ctx, cam, p, '#1f2937', '#374151', time, false);
    },
    vault: function (ctx, cam, p) {
      R.box(ctx, cam, p.x0, 0, p.z0, p.x1, p.y1 - 0.12, p.z1, '#1d4ed8', '#1e3a8a', '#2563eb');
      R.box(ctx, cam, p.x0 - 0.02, p.y1 - 0.12, p.z0 - 0.02, p.x1 + 0.02, p.y1, p.z1 + 0.02, '#d6a26b', '#b7834f', '#e8b97f');
      poly(ctx, cam, [[p.x0, 0.42, p.z0 - 0.005], [p.x1, 0.42, p.z0 - 0.005], [p.x1, 0.5, p.z0 - 0.005], [p.x0, 0.5, p.z0 - 0.005]], '#ffffff');
      label(ctx, cam, (p.x0 + p.x1) / 2, 0.7, p.z0 - 0.01, t('VAULT'), 0.16, '#fde047');
    },
    watertower: function (ctx, cam, p) {
      var cx = (p.x0 + p.x1) / 2, cz = (p.z0 + p.z1) / 2;
      ctx.strokeStyle = '#4b5563'; ctx.lineWidth = Math.max(2, cam.F * 0.006); ctx.beginPath();
      [[p.x0 + 0.08, p.z0 + 0.08], [p.x1 - 0.08, p.z0 + 0.08], [p.x0 + 0.08, p.z1 - 0.08], [p.x1 - 0.08, p.z1 - 0.08]].forEach(function (l) { cam.line(ctx, l[0], 0, l[1], l[0], p.y0, l[1]); });
      cam.line(ctx, p.x0 + 0.08, 1.2, p.z0 + 0.08, p.x1 - 0.08, 1.2, p.z0 + 0.08); ctx.stroke();
      R.box(ctx, cam, p.x0, p.y0, p.z0, p.x1, p.y1, p.z1, '#a16207', '#854d0e', '#ca8a04');
      // planks and hoops
      ctx.strokeStyle = 'rgba(66,32,6,0.55)'; ctx.lineWidth = 1; ctx.beginPath();
      for (var yy = p.y0 + 0.5; yy < p.y1; yy += 0.55) { cam.line(ctx, p.x0 - 0.005, yy, p.z0, p.x0 - 0.005, yy, p.z1); cam.line(ctx, p.x0, yy, p.z0 - 0.005, p.x1, yy, p.z0 - 0.005); }
      ctx.stroke();
      poly(ctx, cam, [[p.x0 - 0.1, p.y1, p.z0 - 0.1], [p.x1 + 0.1, p.y1, p.z0 - 0.1], [cx, p.y1 + 0.9, cz]], '#7f1d1d');
      poly(ctx, cam, [[p.x0 - 0.1, p.y1, p.z0 - 0.1], [p.x0 - 0.1, p.y1, p.z1 + 0.1], [cx, p.y1 + 0.9, cz]], '#991b1b');
      label(ctx, cam, p.x0 - 0.01, (p.y0 + p.y1) / 2 + 0.3, cz, t('BANK IT'), 0.2, '#fde047', -0.1);
    },
    surfboard: function (ctx, cam, p) {
      var cx = (p.x0 + p.x1) / 2;
      ctx.strokeStyle = '#92400e'; ctx.lineWidth = Math.max(2, cam.F * 0.006); ctx.beginPath();
      [p.z0 + 0.25, p.z1 - 0.25].forEach(function (z) {
        cam.line(ctx, cx - 0.4, 0, z, cx, p.y0, z); cam.line(ctx, cx + 0.4, 0, z, cx, p.y0, z);
      });
      cam.line(ctx, cx, p.y0, p.z0 + 0.25, cx, p.y0, p.z1 - 0.25); ctx.stroke();
      R.box(ctx, cam, p.x0, p.y0, p.z0, p.x1, p.y1, p.z1, '#ec4899', '#be185d', '#f472b6');
      poly(ctx, cam, [[p.x0, p.y1 + 0.003, (p.z0 + p.z1) / 2 - 0.12], [p.x1, p.y1 + 0.003, (p.z0 + p.z1) / 2 - 0.12], [p.x1, p.y1 + 0.003, (p.z0 + p.z1) / 2 + 0.12], [p.x0, p.y1 + 0.003, (p.z0 + p.z1) / 2 + 0.12]], '#22d3ee');
      poly(ctx, cam, [[p.x0, p.y1 + 0.003, p.z1 - 0.2], [p.x1, p.y1 + 0.003, p.z1 - 0.2], [cx, p.y1 + 0.003, p.z1 + 0.15]], '#fde047');
    },
    // Train Roof Hop: the Plaza Express, a little shuttle train that stops at the station
    tram: function (ctx, cam, p, rest) {
      var z0 = p.z0, z1 = p.z1;
      ctx.strokeStyle = 'rgba(148,163,184,0.9)'; ctx.lineWidth = Math.max(2, cam.F * 0.004); ctx.beginPath();
      cam.line(ctx, -14, 0.01, z0 + 0.12, 14, 0.01, z0 + 0.12); cam.line(ctx, -14, 0.01, z1 - 0.12, 14, 0.01, z1 - 0.12); ctx.stroke();
      // the station stop line in the middle of the court
      poly(ctx, cam, [[-0.08, 0.012, z0 - 0.5], [0.08, 0.012, z0 - 0.5], [0.08, 0.012, z1 + 0.3], [-0.08, 0.012, z1 + 0.3]], '#facc15');
      label(ctx, cam, 0, 0.02, z0 - 0.75, t('STATION'), 0.14, '#facc15');
      if (p.x1 < -16 || p.x0 > 16) return;
      R.box(ctx, cam, p.x0, p.y0, z0, p.x1, p.y1 - 0.1, z1, '#14b8a6', '#0f766e', '#2dd4bf');
      R.box(ctx, cam, p.x0 + 0.05, p.y1 - 0.1, z0 + 0.05, p.x1 - 0.05, p.y1, z1 - 0.05, '#e2e8f0', '#94a3b8', '#f1f5f9');
      var fz = z0 - 0.005;
      for (var w = 0; w < 4; w++) {
        var wx = p.x0 + 0.25 + w * (p.x1 - p.x0 - 0.5) / 4;
        poly(ctx, cam, [[wx, p.y0 + 0.65, fz], [wx + 0.55, p.y0 + 0.65, fz], [wx + 0.55, p.y0 + 1.05, fz], [wx, p.y0 + 1.05, fz]], '#fef3c7');
      }
      poly(ctx, cam, [[p.x0, p.y0 + 0.3, fz], [p.x1, p.y0 + 0.3, fz], [p.x1, p.y0 + 0.42, fz], [p.x0, p.y0 + 0.42, fz]], '#facc15');
      label(ctx, cam, (p.x0 + p.x1) / 2, p.y0 + 0.2, fz, t('PLAZA EXPRESS'), 0.1, '#fff');
      [p.x0 + 0.4, p.x1 - 0.4].forEach(function (wx) {
        if (cam.project(wx, 0.16, fz, pt)) { ctx.fillStyle = '#111827'; ctx.beginPath(); ctx.arc(pt.x, pt.y, Math.max(2, pt.s * 0.15), 0, 7); ctx.fill(); }
      });
      var lead = p.vx >= 0 ? p.x1 : p.x0;
      if (Math.abs(p.vx || 0) > 0.2 && cam.project(lead, p.y0 + 0.5, fz, pt)) {
        ctx.fillStyle = '#fef08a'; ctx.beginPath(); ctx.arc(pt.x, pt.y, Math.max(2, pt.s * 0.07), 0, 7); ctx.fill();
      }
    },
    sled: function (ctx, cam, p) {
      var cx = (p.x0 + p.x1) / 2, cz = (p.z0 + p.z1) / 2;
      R.box(ctx, cam, p.x0 - 0.1, 0, p.z0 - 0.1, p.x1 + 0.1, p.y1 - 0.12, p.z1 + 0.1, '#f8fafc', '#e2e8f0', '#ffffff');
      R.box(ctx, cam, p.x0, p.y1 - 0.08, p.z0, p.x1, p.y1, p.z1, '#b45309', '#92400e', '#d97706');
      ctx.strokeStyle = '#dc2626'; ctx.lineWidth = Math.max(2, cam.F * 0.006); ctx.lineCap = 'round'; ctx.beginPath();
      cam.line(ctx, p.x0 + 0.05, p.y1 - 0.12, p.z0 - 0.15, p.x0 + 0.05, p.y1 - 0.12, p.z1);
      cam.line(ctx, p.x1 - 0.05, p.y1 - 0.12, p.z0 - 0.15, p.x1 - 0.05, p.y1 - 0.12, p.z1);
      cam.line(ctx, p.x0 + 0.05, p.y1 - 0.12, p.z0 - 0.15, p.x0 + 0.05, p.y1 + 0.05, p.z0 - 0.25);
      cam.line(ctx, p.x1 - 0.05, p.y1 - 0.12, p.z0 - 0.15, p.x1 - 0.05, p.y1 + 0.05, p.z0 - 0.25);
      ctx.stroke();
      if (cam.project(cx, 0.15, cz, pt)) { ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.beginPath(); ctx.ellipse(pt.x, pt.y, pt.s * 0.7, pt.s * 0.18, 0, 0, 7); ctx.fill(); }
    },
    drum: function (ctx, cam, p) {
      var cx = (p.x0 + p.x1) / 2, cz = (p.z0 + p.z1) / 2, r = (p.x1 - p.x0) / 2, n = 18;
      var top = circlePts(cx, p.y1, cz, r, n), bot = circlePts(cx, 0, cz, r, n);
      for (var i = 0; i < n; i++) {
        var j = (i + 1) % n, mx = (top[i][0] + top[j][0]) / 2 - cx, mz = (top[i][2] + top[j][2]) / 2 - cz;
        // only the sides that face the camera
        if ((cam.x - cx) * mx + (cam.z - cz) * mz <= 0) continue;
        poly(ctx, cam, [bot[i], bot[j], top[j], top[i]], i % 2 ? '#dc2626' : '#b91c1c');
      }
      ctx.strokeStyle = '#facc15'; ctx.lineWidth = Math.max(2, cam.F * 0.006);
      if (cam.polyPath(ctx, top)) { ctx.fillStyle = '#f8fafc'; ctx.fill(); ctx.stroke(); }
      if (cam.project(cx, p.y1 + 0.005, cz, pt)) {
        ctx.save(); ctx.translate(pt.x, pt.y); ctx.scale(1, 0.4);
        UI.icon(ctx, 'star4', 0, 0, pt.s * 0.5, '#ef4444'); ctx.restore();
      }
      ctx.strokeStyle = '#facc15'; ctx.beginPath();
      for (var k = 0; k < n; k += 3) cam.line(ctx, top[k][0], p.y1 - 0.05, top[k][2], bot[k][0], 0.05, bot[k][2]);
      ctx.stroke();
    }
  };

  M.trick = function (courtId, slot) {
    slot = slot ? 1 : 0;
    var court = D.courtById(courtId), st = D.trickSetup(courtId, slot), tk = D.trick(st.trick);
    var mv = st.move || null;
    var rest = buildProp(st), prop = mv ? buildProp(st) : rest;
    var others = ['top', 'lw', 'rw', 'deep', 'close', 'lb', 'rb'].filter(function (s) { return s !== st.spot; });
    var m = {
      id: 'trick', env: court.env, window: 0.045, courtName: court.name, courtId: courtId, fire: true,
      trickProp: rest, trickSpot: st.spot, solveProps: mv ? [rest] : null, slot: slot,
      init: function (S) {
        S.world.props = [prop];
        m.tries = 0; m.lands = 0; m.spotI = 0; m.guide = !save().tricks[tk.id]; m.path = null; m.intro = 2.6;
        // the Plaza Express rolls in just as the intro card fades
        m.mt = mv && mv.kind === 'train' ? -2.4 : 0; m.timing = null; m.go = false;
        if (mv) placeProp(prop, rest, mv, m.mt);
        S.setSpot(st.spot, true); S.ready();
        S.after(2.7, function () { S.hint = { text: mv ? t('Shoot when the light says GO!') : t('Release in the glow and swipe straight!'), t: 0 }; });
      },
      camAdjust: function (g, sp) {
        if (SS.play.spotId !== st.spot) return;
        // frame the prop and the hoop together: look between them and step back a little
        var px = rest.type === 'ring' ? rest.x : (rest.x0 + rest.x1) / 2, pz = rest.type === 'ring' ? rest.z : (rest.z0 + rest.z1) / 2;
        g.tx = U.lerp(g.tx, px, 0.32); g.tz = U.lerp(g.tz, pz, 0.32);
        if (rest.type === 'box' && rest.y1 > 2) { g.x += sp.ux * 0.9; g.z += sp.uz * 0.9; g.y += 0.35; }
        // low props out in front (v0.4 second tricks): a higher camera so your baller does not hide them
        else if (slot && rest.type === 'box' && !mv) { g.x += sp.ux * 0.4; g.z += sp.uz * 0.4; g.y += 0.75; g.ty -= 0.15; }
        // the Ring of Fire hangs high in the rafters: look up and use a wider lens, so the ring
        // sits clear of the score chips and buttons (v0.4 fix) and you still see your baller
        if (rest.type === 'ring' && rest.y > 5) {
          var land = SS.play.lastW > SS.play.lastH; // landscape iPad: the screen is short, look up further
          g.ty += land ? 1.85 : 1.2; g.y -= 0.1; g.zoom = land ? 0.56 : 0.85;
        }
      },
      onLaunch: function () { m.tries++; m.path = null; },
      onTrick: function (S, ids) { if (ids.indexOf(tk.id) >= 0) m.landedNow = true; },
      onResult: function (S, res) {
        if (m.landedNow) {
          m.landedNow = false; m.lands++; m.guide = false;
          S.say(t(tk.name).toUpperCase() + '!', '#f0abfc');
          A.roar(); S.celebrate(true);
          S.after(1.0, function () {
            var frames = S.rec && S.rec.frames ? S.rec.frames.slice() : null;
            S.startReplay({ frames: frames, label: t('TRICK CAM'), speed: 0.45, onDone: function () {
              S.rec = { frames: frames, who: 'player' };
              S.snapPhoto(t(tk.name));
              S.ready();
            } });
          });
          return;
        }
        if (!res.made && S.spotId === st.spot && m.tries === 3 && !m.lands) S.after(0.5, function () { S.hint = { text: t('Follow the chalk line! Swipe straight up.'), t: 0 }; m.guide = true; });
        S.after(res.made ? 1.0 : 0.8, function () { S.ready(); });
      },
      update: function (S, dt) {
        if (m.intro > 0) m.intro -= dt;
        if (!mv) return;
        // the prop moves on the game clock (and slows down with slow-motion)
        m.mt += dt * S.timeScale;
        placeProp(prop, rest, mv, m.mt);
        // GO light: would a perfect release right now land the trick?
        var atSpot = S.spotId === st.spot && S.state === 'ready' && S.shooter === 'player';
        if (atSpot && !m.timing) m.timing = timingTable(S, rest, mv, S.idealFor('normal'));
        var go = false;
        if (atSpot && m.timing) {
          var tb = m.timing, idx = Math.floor((((m.mt % tb.cyc) + tb.cyc) % tb.cyc) / tb.step);
          go = !!tb.ok[Math.min(tb.ok.length - 1, idx)];
        }
        if (go && !m.go && S.drag) A.tick(1);
        m.go = go;
      },
      drawWorld: function (ctx, S, cam) {
        if (!RING_ART[st.art]) drawArt(ctx, cam, S, false);
        else drawArt(ctx, cam, S, false, true); // ropes, trees and snowmen behind everything
        if (m.guide && S.state === 'ready' && S.spotId === st.spot) drawGuide(ctx, S, cam);
      },
      drawFront: function (ctx, S, cam) {
        if (RING_ART[st.art]) {
          // the ring: draw it behind the ball when the ball is nearer to us than the ring
          if (ringFirst(S, cam)) drawArt(ctx, cam, S, true);
        }
      },
      drawOver: function (ctx, S, cam) {
        if (RING_ART[st.art] && !ringFirst(S, cam)) drawArt(ctx, cam, S, true);
      },
      hud: function (ctx, S, W, H) {
        var y = UI.safe.t + 12;
        M.chip(ctx, W - 12 - UI.safe.r, y, t('LANDED'), String(m.lands), '#f0abfc', 'right');
        M.chip(ctx, W / 2, y, t('TRIES'), String(m.tries), '#fff', 'center');
        if (mv && S.spotId === st.spot && S.state === 'ready' && m.timing) goLight(ctx, W - 12 - UI.safe.r, y + 62, m.go, S.time);
        var bw = Math.min(150, W * 0.38), bx = 14 + UI.safe.l, by = UI.safe.t + 72;
        if (S.state === 'ready' && !S.drag && UI.button(ctx, 'trSpot', bx, by, bw, 40, S.spotId === st.spot ? t('Try other spots') : t('Back to trick spot'), { color: '#7c3aed', size: 13, icon: 'map' })) {
          m.spotI = (m.spotI + 1) % (others.length + 1);
          S.setSpot(m.spotI === 0 ? st.spot : others[m.spotI - 1]); S.ready();
        }
        if (S.state === 'ready' && !S.drag && S.spotId === st.spot && UI.button(ctx, 'trGuide', bx, by + 48, bw, 40, m.guide ? t('Hide chalk line') : t('Show chalk line'), { color: '#0891b2', size: 13 })) m.guide = !m.guide;
        if (m.intro > 0) {
          var a = Math.min(1, m.intro * 2), w = Math.min(W - 40, 420);
          ctx.globalAlpha = a;
          ctx.fillStyle = 'rgba(46,16,101,0.9)'; UI.rr(ctx, (W - w) / 2, H * 0.3, w, 104, 20); ctx.fill();
          UI.text(ctx, t('SIGNATURE TRICK'), W / 2, H * 0.3 + 22, 13, '#f0abfc');
          UI.text(ctx, t(tk.name), W / 2, H * 0.3 + 50, 26, '#fde68a', 'center', { maxW: w - 30 });
          UI.wrap(ctx, t(tk.hint), W / 2, H * 0.3 + 80, w - 30, 15, '#fff');
          ctx.globalAlpha = 1;
        }
      },
      restart: function () { SS.go('play', M.trick(courtId, slot)); },
      quit: function () { SS.go('tricks'); }
    };
    function ringFirst(S, cam) {
      var b = S.ball;
      return cam.depth(prop.x, prop.y, prop.z) > cam.depth(b.px, b.py, b.pz) || S.state !== 'flight';
    }
    // traffic light under the LANDED chip for moving props
    function goLight(ctx, xr, y, go, time) {
      var w = 112, x = xr - w, k = go ? 1 + 0.05 * Math.sin(time * 12) : 1;
      ctx.save(); ctx.translate(x + w / 2, y + 20); ctx.scale(k, k); ctx.translate(-x - w / 2, -y - 20);
      ctx.fillStyle = 'rgba(15,23,42,0.8)'; UI.rr(ctx, x, y, w, 40, 20); ctx.fill();
      ctx.fillStyle = go ? '#22c55e' : '#ef4444'; ctx.beginPath(); ctx.arc(x + 20, y + 20, 12, 0, 7); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
      UI.text(ctx, go ? t('GO!') : t('WAIT...'), x + 70, y + 21, go ? 18 : 14, go ? '#86efac' : '#fecaca', 'center', { maxW: w - 44 });
      ctx.restore();
      if (SS.a11y && go) SS.a11y.say(t('GO!'));
    }
    function drawGuide(ctx, S, cam) {
      if (!m.path) {
        var h = S.holdPoint(), ideal = S.idealFor('normal');
        var gw = mv ? Object.assign({}, S.world, { props: [rest] }) : S.world;
        m.path = P.path(gw, h.x, h.y, h.z, ideal, 5);
      }
      // chalk dots that march along the path
      var a = 0.7 + 0.25 * Math.sin(S.time * 4), off = Math.floor(S.time * 8) % 3;
      ctx.strokeStyle = 'rgba(15,23,42,0.6)'; ctx.lineWidth = 1.5;
      for (var i = 2 + off; i < m.path.length; i += 3) {
        var q = m.path[i];
        if (!cam.project(q[0], q[1], q[2], pt)) continue;
        ctx.fillStyle = 'rgba(255,255,255,' + a + ')';
        ctx.beginPath(); ctx.arc(pt.x, pt.y, Math.max(2.5, pt.s * 0.05), 0, 7); ctx.fill(); ctx.stroke();
      }
    }
    function drawArt(ctx, cam, S, ringPass, backPass) {
      var p = prop, time = S.time;
      if (NEW_ART[st.art]) { NEW_ART[st.art](ctx, cam, p, rest, time, ringPass, backPass, drawRing); return; }
      switch (st.art) {
        case 'bench':
          // wooden park bench with green legs
          R.box(ctx, cam, p.x0 + 0.1, 0, p.z0 + 0.1, p.x0 + 0.2, p.y1, p.z1 - 0.1, '#166534', '#14532d', '#166534');
          R.box(ctx, cam, p.x1 - 0.2, 0, p.z0 + 0.1, p.x1 - 0.1, p.y1, p.z1 - 0.1, '#166534', '#14532d', '#166534');
          R.box(ctx, cam, p.x0, p.y1 - 0.08, p.z0, p.x1, p.y1, p.z1, '#b45309', '#92400e', '#d97706');
          R.box(ctx, cam, p.x0, p.y1, p.z1 - 0.06, p.x1, p.y1 + 0.45, p.z1, '#b45309', '#92400e', '#d97706');
          break;
        case 'tramp':
          var ps = [], i, cx = (p.x0 + p.x1) / 2, cz = (p.z0 + p.z1) / 2, rr = (p.x1 - p.x0) / 2;
          for (i = 0; i < 18; i++) { var an = i / 18 * Math.PI * 2; ps.push([cx + Math.cos(an) * rr, p.y1, cz + Math.sin(an) * rr]); }
          ctx.strokeStyle = '#1f2937'; ctx.lineWidth = Math.max(2, cam.F * 0.005); ctx.beginPath();
          [0, 5, 9, 14].forEach(function (k) { var q = ps[k]; cam.line(ctx, q[0], 0, q[2], q[0], p.y1, q[2]); });
          ctx.stroke();
          if (cam.polyPath(ctx, ps)) { ctx.fillStyle = '#111827'; ctx.fill(); ctx.strokeStyle = '#ef4444'; ctx.lineWidth = Math.max(3, cam.F * 0.01); ctx.stroke(); }
          break;
        case 'ac':
          R.box(ctx, cam, p.x0, p.y0, p.z0, p.x1, p.y1, p.z1, '#cbd5e1', '#94a3b8', '#e2e8f0');
          // grille and a spinning fan on top
          ctx.strokeStyle = 'rgba(51,65,85,0.6)'; ctx.lineWidth = 1; ctx.beginPath();
          for (var gy = 0.2; gy < p.y1 - 0.1; gy += 0.12) cam.line(ctx, p.x0 + 0.08, gy, p.z0 - 0.005, p.x1 - 0.08, gy, p.z0 - 0.005);
          ctx.stroke();
          if (cam.project((p.x0 + p.x1) / 2, p.y1 + 0.01, (p.z0 + p.z1) / 2, pt)) {
            ctx.save(); ctx.translate(pt.x, pt.y); ctx.scale(1, 0.35); ctx.rotate(time * 9);
            ctx.fillStyle = '#475569'; for (var bl = 0; bl < 3; bl++) { ctx.rotate(Math.PI * 2 / 3); ctx.beginPath(); ctx.ellipse(pt.s * 0.13, 0, pt.s * 0.13, pt.s * 0.05, 0, 0, 7); ctx.fill(); }
            ctx.restore();
          }
          break;
        case 'tower':
          // lifeguard tower: white legs down to the sand, red cabin, flag
          ctx.strokeStyle = '#f8fafc'; ctx.lineWidth = Math.max(2, cam.F * 0.006); ctx.beginPath();
          cam.line(ctx, p.x0 + 0.05, 0, p.z0 + 0.05, p.x0 + 0.1, p.y0, p.z0 + 0.1); cam.line(ctx, p.x1 - 0.05, 0, p.z0 + 0.05, p.x1 - 0.1, p.y0, p.z0 + 0.1);
          cam.line(ctx, p.x0 + 0.05, 0, p.z1 - 0.05, p.x0 + 0.1, p.y0, p.z1 - 0.1); cam.line(ctx, p.x1 - 0.05, 0, p.z1 - 0.05, p.x1 - 0.1, p.y0, p.z1 - 0.1);
          cam.line(ctx, p.x0 + 0.07, 1.2, p.z0 + 0.07, p.x1 - 0.07, 1.2, p.z0 + 0.07); ctx.stroke();
          R.box(ctx, cam, p.x0, p.y0, p.z0, p.x1, p.y1, p.z1, '#ef4444', '#b91c1c', '#f87171');
          R.box(ctx, cam, p.x0 - 0.15, p.y1, p.z0 - 0.15, p.x1 + 0.15, p.y1 + 0.12, p.z1 + 0.15, '#facc15', '#ca8a04', '#fde047');
          if (cam.project(p.x1 + 0.005, (p.y0 + p.y1) / 2, (p.z0 + p.z1) / 2, pt)) {
            ctx.font = '900 ' + Math.max(8, pt.s * 0.3) + 'px ' + SS.FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillStyle = '#fff'; ctx.fillText('+', pt.x, pt.y);
          }
          R.drawFlag(ctx, cam, (p.x0 + p.x1) / 2, (p.z0 + p.z1) / 2, 0.6, time, '#facc15');
          break;
        case 'pillar':
          R.box(ctx, cam, p.x0, p.y0, p.z0, p.x1, p.y1, p.z1, '#78716c', '#57534e', '#a8a29e');
          // tile bands and a "BANK ME" graffiti tag on the side that faces the court
          var fx = p.x0 - 0.005;
          ['#fde047', '#22d3ee'].forEach(function (col, k2) {
            var yy = 1.0 + k2 * 2.6;
            if (cam.polyPath(ctx, [[fx, yy, p.z0], [fx, yy, p.z1], [fx, yy + 0.18, p.z1], [fx, yy + 0.18, p.z0]])) { ctx.fillStyle = col; ctx.fill(); }
          });
          if (cam.project(fx, 4.0, (p.z0 + p.z1) / 2, pt)) {
            ctx.save(); ctx.translate(pt.x, pt.y); ctx.rotate(-0.15);
            ctx.font = '900 ' + Math.max(8, pt.s * 0.17) + 'px ' + SS.FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.lineWidth = Math.max(2, pt.s * 0.03); ctx.strokeStyle = '#111827'; ctx.strokeText(t('BANK ME'), 0, 0);
            ctx.fillStyle = '#ec4899'; ctx.fillText(t('BANK ME'), 0, 0); ctx.restore();
          }
          break;
        case 'snowman':
          if (!ringPass) break;
          // a big snowman beside the shot, holding the hoop out on a long branch
          var sideX = p.nz, sideZ = -p.nx, smx = p.x + sideX * 1.35 + p.nx * 0.6, smz = p.z + sideZ * 1.35 + p.nz * 0.6;
          [[0.55, 0.55], [1.45, 0.42], [2.2, 0.32]].forEach(function (bb) {
            if (cam.project(smx, bb[0], smz, pt)) { ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(pt.x, pt.y, bb[1] * pt.s, 0, 7); ctx.fill(); ctx.strokeStyle = 'rgba(148,163,184,0.7)'; ctx.lineWidth = 1.5; ctx.stroke(); }
          });
          if (cam.project(smx, 2.25, smz, pt)) {
            ctx.fillStyle = '#111827'; ctx.beginPath(); ctx.arc(pt.x - pt.s * 0.1, pt.y - pt.s * 0.06, pt.s * 0.035, 0, 7); ctx.arc(pt.x + pt.s * 0.1, pt.y - pt.s * 0.06, pt.s * 0.035, 0, 7); ctx.fill();
            ctx.fillStyle = '#f97316'; ctx.beginPath(); ctx.moveTo(pt.x, pt.y); ctx.lineTo(pt.x - pt.s * 0.25, pt.y + pt.s * 0.04); ctx.lineTo(pt.x, pt.y + pt.s * 0.07); ctx.fill();
            ctx.strokeStyle = '#111827'; ctx.lineWidth = Math.max(1, pt.s * 0.02); ctx.beginPath(); ctx.arc(pt.x, pt.y + pt.s * 0.08, pt.s * 0.1, 0.2, Math.PI - 0.2); ctx.stroke();
            ctx.fillStyle = '#e11d48'; ctx.fillRect(pt.x - pt.s * 0.28, pt.y + pt.s * 0.22, pt.s * 0.56, pt.s * 0.09);
          }
          R.box(ctx, cam, smx - 0.24, 2.48, smz - 0.24, smx + 0.24, 2.85, smz + 0.24, '#111827', '#111827', '#1f2937');
          ctx.strokeStyle = '#78350f'; ctx.lineWidth = Math.max(2, cam.F * 0.006); ctx.lineCap = 'round'; ctx.beginPath();
          cam.line(ctx, smx, 1.55, smz, p.x + sideX * p.R, p.y - 0.1, p.z + sideZ * p.R);
          cam.line(ctx, smx, 1.5, smz, smx - sideX * 0.7, 1.9, smz - sideZ * 0.7);
          ctx.stroke();
          drawRing(ctx, cam, p, '#e11d48', '#ffffff', time, false);
          break;
        case 'firering':
          if (!ringPass) break;
          ctx.strokeStyle = 'rgba(148,163,184,0.8)'; ctx.lineWidth = Math.max(1, cam.F * 0.002); ctx.beginPath();
          cam.line(ctx, p.x - p.R, p.y, p.z, p.x - 0.8, 12, p.z); cam.line(ctx, p.x + p.R, p.y, p.z, p.x + 0.8, 12, p.z); ctx.stroke();
          drawRing(ctx, cam, p, '#f97316', '#fde047', time, true);
          break;
      }
    }
    function drawRing(ctx, cam, p, c1, c2, time, fire) {
      // ring axis is horizontal: build it from the axis and the up vector
      var ax = p.nx, az = p.nz, ux = -az, uz = ax, n = 28, pts = [];
      for (var i = 0; i <= n; i++) {
        var a = i / n * Math.PI * 2, x = p.x + ux * Math.cos(a) * p.R, y = p.y + Math.sin(a) * p.R, z = p.z + uz * Math.cos(a) * p.R;
        if (cam.project(x, y, z, pt)) pts.push({ x: pt.x, y: pt.y, s: pt.s });
      }
      if (pts.length < 4) return;
      var lw = Math.max(3, pts[0].s * p.tube * 2.4);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.strokeStyle = '#111827'; ctx.lineWidth = lw + 3; ctx.beginPath();
      pts.forEach(function (q, i) { if (i) ctx.lineTo(q.x, q.y); else ctx.moveTo(q.x, q.y); }); ctx.stroke();
      for (var k = 0; k < pts.length - 1; k++) {
        ctx.strokeStyle = (Math.floor(k / 2) % 2) ? c1 : c2; ctx.lineWidth = lw;
        ctx.beginPath(); ctx.moveTo(pts[k].x, pts[k].y); ctx.lineTo(pts[k + 1].x, pts[k + 1].y); ctx.stroke();
      }
      if (fire && !save().settings.reduced) {
        // flickering flames around the ring (plain fills, cheap)
        for (var f = 0; f < pts.length - 1; f += 2) {
          var q = pts[f], fl = (0.6 + 0.4 * Math.sin(time * 14 + f * 1.7)) * q.s * 0.11;
          ctx.fillStyle = f % 4 ? 'rgba(253,224,71,0.85)' : 'rgba(249,115,22,0.85)';
          ctx.beginPath(); ctx.moveTo(q.x - fl * 0.4, q.y); ctx.quadraticCurveTo(q.x, q.y - fl * 2.2, q.x + fl * 0.4, q.y); ctx.fill();
        }
      }
    }
    return m;
  };

  // ---------- The Hall ----------
  SC.tricks = {
    id: 'tricks', t: 0, tab: 'sig', view: null,
    enter: function () { SC.tricks.t = 0; SC.tricks.view = null; A.setMusic('menu'); },
    draw: function (ctx, W, H, dt) {
      var s = SC.tricks; s.t += dt;
      var g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#2e1065'); g.addColorStop(1, '#831843');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      // spotlight beams
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      for (var b = 0; b < 3; b++) { var sx = W * (0.2 + b * 0.3) + Math.sin(s.t * 0.6 + b) * 30; ctx.beginPath(); ctx.moveTo(sx - 10, 0); ctx.lineTo(sx + 10, 0); ctx.lineTo(sx + 90, H); ctx.lineTo(sx - 90, H); ctx.fill(); }
      var top = UI.safe.t + 66, x0 = 12 + UI.safe.l, w = W - 24 - UI.safe.l - UI.safe.r;
      var n = SS.save.trickCount();
      UI.text(ctx, t('{n} of {m} tricks found', { n: n, m: D.TRICKS.length }), W / 2, top + 6, 15, '#fde68a', 'center', { maxW: w });
      // tabs
      var tabs = [['sig', t('Signature')], ['skill', t('Skill')], ['photo', t('Photos')]], tw = (w - 12) / 3;
      tabs.forEach(function (tb, i) {
        if (UI.button(ctx, 'tt_' + tb[0], x0 + i * (tw + 6), top + 22, tw, 40, tb[1], { color: s.tab === tb[0] ? '#ec4899' : '#4c1d95', size: 15, radius: 12 })) { s.tab = tb[0]; s.view = null; }
      });
      var y0 = top + 74, h = H - y0 - 64 - UI.safe.b;
      if (s.tab === 'sig') drawSig(ctx, s, x0, y0, w, h);
      else if (s.tab === 'skill') drawSkill(ctx, s, x0, y0, w, h);
      else drawPhotos(ctx, s, x0, y0, w, h);
      // trail progress footer
      var next = null;
      D.ITEMS.trail.forEach(function (it) { if (it.tricks && it.tricks > n && !next) next = it; });
      var fy = H - 34 - UI.safe.b;
      ctx.fillStyle = 'rgba(15,23,42,0.6)'; UI.rr(ctx, x0, fy - 20, w, 40, 20); ctx.fill();
      UI.text(ctx, next ? t('Next ball trail: {n} at {k} tricks', { n: t(next.name), k: next.tricks }) : t('Every ball trail unlocked! Legend!'), W / 2, fy, 14, '#fff', 'center', { maxW: w - 20 });
      if (topBarT(ctx, W, t('Trick Shot Hall'))) SS.go('title');
      if (s.view) drawView(ctx, W, H, s);
    }
  };
  function topBarT(ctx, W, title) {
    var y = UI.safe.t + 12;
    var c = UI.button(ctx, 'back', 14 + UI.safe.l, y, 52, 48, '', { icon: 'back', color: '#334155', size: 22, radius: 16 });
    UI.text(ctx, title, W / 2 - 16, y + 26, Math.min(24, W * 0.055), '#fff', 'center', { stroke: '#111827', strokeW: 7, maxW: W - 250 });
    UI.coins(ctx, W - 14 - UI.safe.r, y + 4, save().coins, 40);
    return c;
  }
  // Two signature tricks per court (v0.4). The second one unlocks once the first is landed.
  function drawSig(ctx, s, x, y, w, h) {
    var rows = D.COURTS.length, rh = Math.min(84, h / rows), gap = 6, cw = (w - gap) / 2;
    D.COURTS.forEach(function (c, i) {
      var un = SS.save.courtUnlocked(i), ry = y + i * rh, ch = rh - 6;
      [0, 1].forEach(function (slot) {
        var st = D.trickSetup(c.id, slot), tk = D.trick(st.trick), got = save().tricks[tk.id] || 0;
        var first = D.trick(D.TRICK_SETUPS[c.id].trick), open = un && (slot === 0 || save().tricks[first.id] > 0 || got > 0);
        var cx = x + slot * (cw + gap);
        var sub = !un ? t('Unlock {c}', { c: t(c.name) }) : !open ? t('Land {n} first', { n: t(first.name) })
          : got ? t('Landed {n}x', { n: got }) : t('Try it!');
        var col = got ? '#b45309' : open ? (slot ? '#0e7490' : '#7c3aed') : '#475569';
        if (UI.button(ctx, 'trk_' + c.id + slot, cx, ry, cw, ch, open ? t(tk.name) : '???', {
          color: col, size: Math.min(15, ch * 0.24), sub: sub, icon: got ? 'trophy' : open ? (st.move ? 'move' : 'trick') : 'lock', radius: 14,
          clickDisabled: true, aria: (open ? t(tk.name) + '. ' + t(tk.hint) : t('Locked trick')) + '. ' + sub })) {
          if (open) SS.go('play', M.trick(c.id, slot));
          else UI.toast(un ? t('Land {n} first!', { n: t(first.name) }) : t('Unlock {c} on the Street Tour', { c: t(c.name) }), '#6d28d9');
        }
      });
    });
  }
  function drawSkill(ctx, s, x, y, w, h) {
    var list = D.TRICKS.filter(function (k) { return !k.sig; }), cols = 2, rows = Math.ceil(list.length / cols);
    var gap = 6, cw = (w - gap) / cols, ch = Math.min(70, (h - gap * (rows - 1)) / rows);
    list.forEach(function (tk, i) {
      var cx = x + (i % cols) * (cw + gap), cy = y + Math.floor(i / cols) * (ch + gap), got = save().tricks[tk.id] || 0;
      ctx.fillStyle = got ? 'rgba(253,230,138,0.95)' : 'rgba(255,255,255,0.12)'; UI.rr(ctx, cx, cy, cw, ch, 12); ctx.fill();
      UI.region('sk_' + tk.id, cx, cy, cw, ch);
      if (SS.a11y) SS.a11y.note('sk_' + tk.id, (got ? t(tk.name) : t('Mystery trick')) + '. ' + t(tk.hint), cx, cy, cw, ch);
      UI.icon(ctx, got ? 'star4' : 'trick', cx + 20, cy + ch / 2, Math.min(22, ch * 0.4), got ? '#b45309' : '#c4b5fd');
      UI.text(ctx, got ? t(tk.name) : '???', cx + 38, cy + ch * 0.36, 14, got ? '#111827' : '#fff', 'left', { maxW: cw - 46 });
      UI.text(ctx, got ? t('Landed {n}x', { n: got }) : t('Tap for a hint'), cx + 38, cy + ch * 0.7, 10, got ? '#4b5563' : '#e9d5ff', 'left', { maxW: cw - 46, weight: 800 });
      if (UI.consume('sk_' + tk.id)) UI.toast(t(tk.hint), '#6d28d9');
    });
  }
  function drawPhotos(ctx, s, x, y, w, h) {
    var list = AL.list();
    if (!list.length) {
      UI.icon(ctx, 'camera', x + w / 2, y + h * 0.3, 60, 'rgba(255,255,255,0.5)');
      UI.wrap(ctx, t('No photos yet. After a swish, tap SWISH CAM to snap one. Signature tricks snap one for you!'), x + w / 2, y + h * 0.3 + 60, w - 40, 15, '#f5d0fe');
      return;
    }
    var cols = 3, gap = 8, cw = (w - gap * (cols - 1)) / cols, ch = Math.min(cw * 380 / 300, (h - gap * 3) / 4);
    cw = ch * 300 / 380;
    var ox = x + (w - (cw * cols + gap * (cols - 1))) / 2;
    list.forEach(function (p, i) {
      var cx = ox + (i % cols) * (cw + gap), cy = y + Math.floor(i / cols) * (ch + gap);
      var im = AL.image(p);
      ctx.save(); ctx.translate(cx + cw / 2, cy + ch / 2); ctx.rotate(((i * 37) % 7 - 3) * 0.008);
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(-cw / 2 + 3, -ch / 2 + 4, cw, ch);
      if (im.complete && im.naturalWidth) ctx.drawImage(im, -cw / 2, -ch / 2, cw, ch); else { ctx.fillStyle = '#fffdf7'; ctx.fillRect(-cw / 2, -ch / 2, cw, ch); }
      ctx.restore();
      UI.region('ph_' + i, cx, cy, cw, ch);
      if (SS.a11y) SS.a11y.note('ph_' + i, t('Photo: {c}', { c: p.cap || '' }), cx, cy, cw, ch);
      if (UI.consume('ph_' + i)) s.view = p;
    });
  }
  function drawView(ctx, W, H, s) {
    if (UI.blocker(ctx, 0.75, 'phView')) { s.view = null; return; }
    var im = AL.image(s.view), iw = Math.min(W - 40, (H - 160) * 300 / 380, 360), ih = iw * 380 / 300;
    if (im.complete && im.naturalWidth) ctx.drawImage(im, (W - iw) / 2, (H - ih) / 2 - 20, iw, ih);
    if (UI.button(ctx, 'phClose', W / 2 - 80, (H + ih) / 2 - 4, 160, 50, t('Close'), { color: '#64748b', icon: 'close', size: 18 })) s.view = null;
  }
})();
