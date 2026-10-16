// Swish Street - the shooting session: the scene where every mode is played.
// Handles the flick gesture, perfect-release window, launching, physics stepping, net,
// juice (shake, slow-mo, confetti, commentary, crowd) and drawing. Modes plug in rules.
(function () {
  'use strict';
  var SS = window.SS, U = SS.U, P = SS.Phys, R = SS.render, UI = SS.ui, A = SS.audio, D = SS.D, AV = SS.avatar, t = SS.t;

  var S = (SS.play = {
    id: 'play', mode: null, cam: new SS.Camera(), world: P.makeWorld(), ball: P.makeBall(), tr: null, net: null,
    state: 'idle', shooter: 'player', time: 0, simAcc: 0, timeScale: 1, slowT: 0,
    spotId: 'top', twist: 'normal', pos: { x: 0, z: -4 }, posGoal: { x: 0, z: -4 }, camGoal: null,
    drag: null, fx: [], pops: [], call: null, shake: 0, punch: 0, boardFlash: 0, crowdE: 0.1,
    onFire: false, swishStreak: 0, celeb: null, celebCool: 0, paused: false, timers: [],
    ballRot: 0, poseT: 0, pose: 'hold', hideBall: false, results: null, hint: null, clutch: false, lastShot: null,
    litTargets: null, rival: null, windGoal: 0, ballVis: 1,
    hoopVis: 1, strafe: 0, strafeT: 0, strafeV: 0, camLift: 0, rec: null, replay: null, mcLine: null,
    crowdMood: null, makeStreak: 0
  });
  var pt = { x: 0, y: 0, s: 0, z: 0 };
  var HOLD_Y = 1.62, CAM_BACK = 2.9, CAM_H = 2.95;

  function reduced() { return SS.save.data.settings.reduced; }

  // ---------- Setup ----------
  S.start = function (mode) {
    S.mode = mode; S.camZoom = 1;
    if (S.lastW) S.layout(S.lastW, S.lastH);
    S.world = P.makeWorld((R.ENVS[mode.env] || {}).physics || {});
    S.world.hx0 = 0;
    S.hoopVis = 1; S.strafe = 0; S.strafeT = 0; S.strafeV = 0; S.camLift = 0; S.rec = null; S.replay = null;
    S.mcLine = null; S.crowdMood = null; S.makeStreak = 0; S.hideBall = false;
    S.trail = []; S.glowReveal = null; S.trickCard = null; S.snapBtn = null; S.windMul = 1; S.camLens = 1;
    S.net = P.makeNet(S.world);
    S.ball = P.makeBall();
    S.tr = null; S.state = 'idle'; S.shooter = 'player'; S.fx = []; S.pops = []; S.call = null;
    S.onFire = false; S.swishStreak = 0; S.celeb = null; S.paused = false; S.timers = []; S.results = null;
    S.hint = null; S.clutch = false; S.litTargets = null; S.rival = null; S.timeScale = 1; S.slowT = 0;
    S.world.windX = 0; S.windGoal = 0; S.windNow = 0; S.twist = 'normal'; S.time = 0; S.drag = null;
    R.setEnv(mode.env || 'park');
    R.setVariant(mode.variant || null);
    A.setMusic('play', mode.music || mode.env || 'park');
    mode.init(S);
    S.snapCamera();
    if (mode.courtName) S.mc(t(U.pick(D.MC.start), { court: t(mode.courtName) }), 0.6);
  };

  S.layout = function (W, H) {
    var cam = S.cam;
    var portrait = H >= W;
    var aspect = W / H;
    S.lastW = W; S.lastH = H;
    cam.F = portrait ? Math.min(W * 1.6, H * 0.95) : Math.min(H * (aspect > 1.6 ? 1.05 : 1.2), W * 0.9);
    cam.F *= (S.mode && S.mode.zoom) || 1;
    S.baseF = cam.F; cam.F *= S.camZoom || 1;
    cam.cx = W / 2;
    cam.cy = H * (portrait ? 0.5 : 0.45);
  };

  S.spotPos = function (id) {
    var sp = D.SPOTS[id] || D.SPOTS.top, a = sp.a * U.deg;
    return { x: Math.sin(a) * sp.d, z: -Math.cos(a) * sp.d, ux: Math.sin(a), uz: -Math.cos(a), d: sp.d };
  };
  S.setSpot = function (id, instant) {
    S.spotId = id;
    var sp = S.spotPos(id);
    S.posGoal = { x: sp.x, z: sp.z };
    S.windDir = { x: -sp.uz, z: sp.ux }; // right-hand direction for this shooter
    var far = sp.d > 8; // half-court: a higher camera so you still see yourself
    S.camGoal = {
      x: sp.x + sp.ux * CAM_BACK, y: CAM_H + (far ? 0.35 : sp.d > 5 ? 0.25 : 0), z: sp.z + sp.uz * CAM_BACK,
      tx: sp.x * 0.12, ty: far ? 1.6 : 2.25, tz: 0.2
    };
    if (S.mode && S.mode.camAdjust) S.mode.camAdjust(S.camGoal, sp);
    if (instant) S.snapCamera();
  };
  S.snapCamera = function () {
    if (!S.camGoal) S.setSpot(S.spotId);
    var g = S.camGoal, c = S.cam;
    S.camLens = g.zoom || 1;
    if (S.baseF) c.F = S.baseF * (S.camZoom || 1) * S.camLens;
    c.x = g.x; c.y = g.y; c.z = g.z; c.tx = g.tx; c.ty = g.ty; c.tz = g.tz; c.update();
    S.pos.x = S.posGoal.x; S.pos.z = S.posGoal.z;
  };
  S.holdPoint = function () {
    var sp = S.spotPos(S.spotId);
    var dx = -S.pos.x, dz = -S.pos.z, l = Math.sqrt(dx * dx + dz * dz) || 1;
    return { x: S.pos.x + dx / l * 0.14, y: HOLD_Y, z: S.pos.z + dz / l * 0.14 };
  };
  S.setTwist = function (tw) {
    S.twist = tw || 'normal';
    S.world.allowBounce = S.twist === 'bounce';
    S.strafeT = 0;
  };
  S.lefty = function () { return !!SS.save.data.settings.lefty; };
  S.idealFor = function (twist) {
    var h = S.holdPoint();
    var w = { hx: S.world.hx0 || 0, hy: S.world.hy, hz: S.world.hz, R: S.world.R };
    if (S.mode && S.mode.aimAt) {
      var ap = S.mode.aimAt(S);
      if (ap) return { tx: ap.x, ty: ap.y, tz: ap.z, alpha: P.alphaFor(Math.hypot(h.x - ap.x, h.z - ap.z)) - 6, scale: 1, ok: true };
    }
    // Trick Shot mode: at the trick spot, the ideal shot uses the court's signature prop.
    if (S.mode && S.mode.trickProp && S.world.props && S.spotId === S.mode.trickSpot) {
      // moving props (v0.4) are solved at rest, so the ideal shot never jumps around
      w.props = S.mode.solveProps || S.world.props;
      return P.solveTrick(w, h.x, h.y, h.z, S.mode.trickProp);
    }
    return P.solve(w, h.x, h.y, h.z, twist || S.twist);
  };
  S.pIdeal = function () {
    var sp = S.spotPos(S.spotId);
    return U.clamp(0.5 + (sp.d - 2.7) / 3.3 * 0.25, 0.45, 0.8);
  };
  // Aim Assist (v0.4): Easy widens the glow and softens the wind on your own shots, Pro thins
  // the glow. Normal multiplies by exactly 1, so the classic shot is untouched. Rivals never
  // get assist. In pass-and-play each player has their own level (mode.assistFor).
  S.assist = function () {
    var id = S.mode && S.mode.assistFor ? S.mode.assistFor(S) : SS.save.data.settings.assist;
    return D.ASSIST[id] || D.ASSIST.normal;
  };
  S.window = function (who) {
    var w = (S.mode && S.mode.window) || 0.04;
    return who === 'rival' ? w : w * S.assist().win;
  };
  S.windFactor = function () { return S.shooter === 'rival' ? 1 : S.assist().wind; };
  // Who is holding the ball? (pass-and-play swaps in Player 2's look)
  S.look = function () { return (S.mode && S.mode.playerLook && S.mode.playerLook(S)) || SS.save.data.avatar; };
  // A guest (Player 2) never changes the owner's stats or Trick Shot Hall.
  S.isGuest = function () { return !!(S.mode && S.mode.guest && S.mode.guest(S)); };

  // Ball back in hands
  S.ready = function (shooter) {
    S.shooter = shooter || 'player';
    S.state = 'ready'; S.tr = null; S.drag = null; S.pose = 'hold'; S.poseT = 0;
    S.ballVis = 0;
    var h = S.holdPoint();
    var b = S.ball; b.px = h.x; b.py = h.y; b.pz = h.z; b.vx = b.vy = b.vz = 0; b.wx = b.wy = b.wz = 0;
    S.timeScale = 1; S.slowT = 0;
  };
  S.after = function (delay, fn) { S.timers.push({ t: delay, fn: fn }); };

  // ---------- Shooting ----------
  // p: gauge 0..1, aimAng: radians of drag from vertical (right positive)
  S.shoot = function (p, aimAng, who) {
    var ideal = S.idealFor(S.twist);
    var pi = S.pIdeal(), win = S.window(who), dp = p - pi;
    var yawP = Math.abs(aimAng) < 3 * U.deg ? 0 : aimAng * 0.22;
    var perfect = Math.abs(dp) <= win;
    var scale, yaw, windEff = (S.windNow || 0) * (who === 'rival' ? 1 : S.assist().wind);
    // perfect release snaps the power and tidies the aim (but in wind you must still aim into it)
    if (perfect) { scale = ideal.scale; yaw = yawP * (Math.abs(windEff) > 0.15 ? 0.8 : 0.35); }
    else {
      // power error is measured from the edge of the glow, so "nearly perfect" is still good
      var excess = Math.abs(dp) - win, eff = (dp < 0 ? -1 : 1) * excess * (excess < 0.1 ? 0.8 : 1);
      scale = ideal.scale * (1 + 0.62 * eff);
      yaw = yawP * 0.8;
    }
    if (S.mode && S.mode.assist) { var as = S.mode.assist(S, p, perfect); if (as) { scale = U.lerp(scale, ideal.scale, as); yaw *= (1 - as); } }
    if (S.mode && S.mode.aimMul && who !== 'rival') yaw *= S.mode.aimMul(S);
    var h = S.holdPoint();
    var mv = S.mode && S.mode.move;
    if (mv) {
      // Moving hoop: a perfect release leads the target for you; otherwise a little help.
      var D0 = Math.hypot(ideal.tx - h.x, ideal.tz - h.z);
      var vh = Math.sqrt(P.G * D0 * D0 / (2 * Math.pow(Math.cos(ideal.alpha * U.deg), 2) * (D0 * Math.tan(ideal.alpha * U.deg) - (ideal.ty - h.y)))) * Math.cos(ideal.alpha * U.deg);
      var T = D0 / vh;
      var predX = Math.sin(((S.hoopT || 0) + T) * Math.PI * 2 / mv.period) * mv.amp;
      yaw += (perfect ? 1 : 0.35) * predX / D0;
    }
    P.launch(S.ball, h.x, h.y, h.z, ideal.tx, ideal.ty, ideal.tz, ideal.alpha, scale, yaw, ideal.spin);
    // On the move: the ball keeps some of your sideways slide unless the release was perfect.
    if (S.twist === 'moving' && !perfect && S.windDir) {
      var carry = S.strafeV * 0.32;
      S.ball.vx += S.windDir.x * carry; S.ball.vz += S.windDir.z * carry;
    }
    S.tr = P.makeTracker();
    S.state = 'flight'; S.pose = S.twist === 'nolook' ? 'nolook' : 'shoot'; S.poseT = 0; S.ballVis = 1;
    S.lastShot = { p: p, perfect: perfect, who: who || 'player', twist: S.twist, spot: S.spotId, dp: dp, wind: Math.abs(windEff), guest: S.isGuest() };
    // No-Look: once the ball is gone, show where the hidden glow was (and where you let go).
    S.glowReveal = S.twist === 'nolook' && who !== 'rival' ? { pi: pi, win: win, p: p, perfect: perfect, t: 0 } : null;
    S.trail = [];
    S.evQueue = [];
    S.rec = { frames: [], who: who || 'player', twist: S.twist, spot: S.spotId, done: 0 };
    A.whoosh(p);
    if (perfect) {
      A.perfect(); SS.native.haptic('light');
      S.pop(t('PERFECT!'), '#5ef2ff', 0.62);
      S.burst(S.screenOf(h.x, h.y, h.z), 14, ['#5ef2ff', '#ffffff', '#a5f3fc'], 'spark');
    }
    if (who !== 'rival' && !S.lastShot.guest) SS.save.data.stats.shots++;
    if (S.mode.onLaunch) S.mode.onLaunch(S, S.lastShot);
  };

  // Rival takes a shot with their skill. twist uses the rival's ideal for that twist.
  S.rivalShoot = function (rv, delay) {
    S.ready('rival');
    S.pose = 'hold';
    function fire() {
      // On the move, rivals wait for the end of their slide, just like a smart player would.
      if (S.twist === 'moving' && Math.abs(S.strafeV) > 0.4 && fire.waited < 3) { fire.waited += 0.05; S.after(0.05, fire); return; }
      var fav = rv.twists && rv.twists[S.twist] >= 0.3;
      var trick = { bounce: 1.1, blind: 1.15, nolook: 1.15, moving: 1.15 }[S.twist] || 1;
      var sk = rv.skill * (fav ? 0.8 : trick) * (S.mode.rivalSkillMul || 1);
      var p = S.pIdeal() + U.gauss() * sk;
      var aim = U.gauss() * rv.aim * U.deg / 0.32 * 0.5;
      aim += -(S.windNow || 0) * 20 * U.deg; // rivals read the wind too
      S.shoot(U.clamp(p, 0, 1), aim, 'rival');
    }
    fire.waited = 0;
    S.after(delay || 0.9, fire);
  };

  // ---------- Effects ----------
  S.screenOf = function (x, y, z) { var o = {}; S.cam.project(x, y, z, o); return o; };
  S.burst = function (at, n, colors, type) {
    if (!at || !at.s) return;
    if (reduced()) n = Math.ceil(n / 3);
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2, sp = U.rand(120, 420);
      S.fx.push({ x: at.x, y: at.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (type === 'confetti' ? 260 : 80),
        life: 0, max: U.rand(0.6, 1.3), c: U.pick(colors), s: U.rand(3, 7), type: type || 'confetti', rot: Math.random() * 6 });
    }
  };
  S.pop = function (text, color, yFrac, size) {
    S.pops.push({ text: text, c: color || '#fff', t: 0, y: yFrac || 0.4, size: size || 1 });
  };
  S.say = function (text, color, sub) {
    S.call = { text: text, c: color || '#ffd23f', t: 0, sub: sub || '' };
    if (SS.a11y) SS.a11y.say(text);
  };
  S.kick = function (amt) { if (!reduced()) S.shake = Math.max(S.shake, amt); };
  // MC Mic, the commentator: a lower-third pill with a little "voice" blip.
  S.mc = function (text, delay) {
    if (delay) { S.after(delay, function () { S.mc(text); }); return; }
    S.mcLine = { text: text, t: 0 };
    A.blabber(Math.min(9, 3 + text.length / 6));
  };
  S.mcPick = function (key, vars, chance) {
    if (chance != null && Math.random() > chance) return;
    var list = D.MC[key]; if (!list) return;
    S.mc(t(U.pick(list), vars));
  };
  S.celebrate = function (force) {
    if (S.celebCool > 0 && !force) return;
    var look = S.look(), cb = SS.save.data.combo;
    // the signature combo (v0.4) belongs to the save owner; friends use their preset move
    var combo = look === SS.save.data.avatar && cb.on ? SS.celebCombo.get() : null;
    S.celeb = { id: look.celebration || 'pump', t: 0, look: look, combo: combo };
    if (combo) { S.celeb.dur = SS.celebCombo.duration(combo); A.jingle('star'); }
    S.celebCool = 5;
  };

  // ---------- Physics events -> juice ----------
  function handleEvent(ev) {
    var b = S.ball;
    switch (ev.type) {
      case 'rim':
        A.rim(ev.v / 4); S.kick(Math.min(6, ev.v * 1.5)); if (ev.v > 1) SS.native.haptic('light'); break;
      case 'board':
        A.board(ev.v / 4); S.boardFlash = 0.6; S.kick(Math.min(4, ev.v)); if (ev.v > 1) SS.native.haptic('light'); break;
      case 'ground':
        A.bounce(ev.v / 5);
        if (ev.v > 1.5) S.burst(S.screenOf(b.px, 0.02, b.pz), 4, ['rgba(200,200,200,0.8)'], 'dust');
        if (S.tr.bounces === 1 && !S.tr.boing) {
          S.tr.boing = true; A.boing(); S.kick(4);
          S.pop(t('BOING!'), '#a3e635', 0.55, 0.9);
          S.burst(S.screenOf(b.px, 0.02, b.pz), 12, ['#a3e635', '#ffffff', '#5ef2ff'], 'spark');
        }
        break;
      case 'obstacle':
        if (S.mode.onObstacle) S.mode.onObstacle(S, ev.i, ev.v);
        break;
      case 'target':
        if (S.mode.onTarget) S.mode.onTarget(S, ev.i);
        break;
      case 'nudge':
        S.pop(t('Rim roll...'), '#fff', 0.42, 0.7); break;
      case 'prop':
        // trick props: a bouncy pad boings, everything else thuds like the glass
        var bouncy = S.mode.trickProp && S.mode.trickProp.e > 0.85;
        if (bouncy) { A.boing(); S.pop(t('BOING!'), '#a3e635', 0.55, 0.9); } else A.board(ev.v / 4);
        S.kick(Math.min(5, ev.v * 1.2));
        if (ev.v > 1.5) S.burst(S.screenOf(b.px, b.py, b.pz), 10, ['#ffffff', '#fde68a', '#5ef2ff'], 'spark');
        if (S.mode.onProp) S.mode.onProp(S, ev);
        break;
      case 'gate':
        A.perfect(); S.pop(t('THROUGH THE RING!'), '#fdba74', 0.5, 0.85);
        S.burst(S.screenOf(b.px, b.py, b.pz), 16, ['#ffd23f', '#ff7a1a', '#ffffff'], 'spark');
        break;
      case 'score':
        var sw = ev.swish;
        if (sw) { A.swish(); } else { A.net(); }
        SS.native.haptic(sw ? 'success' : 'medium');
        A.cheer(sw ? 1 : 0.7);
        S.crowdE = 1;
        var rimS = S.screenOf(S.world.hx, S.world.hy, S.world.hz);
        S.burst(rimS, sw ? 34 : 22, ['#ffd23f', '#ff5a1f', '#5ef2ff', '#ff4d6d', '#7cff6b', '#ffffff'], 'confetti');
        S.punch = reduced() ? 0 : (sw ? 0.06 : 0.035);
        // instant call-out, right as the ball drops through
        var C = D.CALLS, trk = S.tr, tw0 = S.lastShot && S.lastShot.twist;
        if (S.mode.scoreCall) S.mode.scoreCall(S, sw);
        else if (tw0 === 'bounce' && trk.bounces) S.say(t(U.pick(C.bounceShot)), '#a3e635');
        else if (tw0 === 'blind') S.say(t(U.pick(C.blindShot)), '#c4b5fd');
        else if (tw0 === 'nolook') S.say(t(U.pick(C.noLookShot)), '#fda4af');
        else if (tw0 === 'moving') S.say(t(U.pick(C.movingShot)), '#fdba74');
        else if (sw) S.say(t(U.pick(C.swish)), '#5ef2ff');
        else if (trk.boardBeforeScore > 0) S.say(t(U.pick(C.bank)), '#ffd23f');
        else if (trk.rimAny >= 2) S.say(t(U.pick(C.rattle)), '#ffd23f');
        else S.say(t(U.pick(C.make)), '#7cff6b');
        S.kick(sw ? 5 : 3);
        if (S.timeScale < 1) S.slowT = Math.min(S.slowT, 0.35);
        break;
    }
  }

  function classify(tr) {
    var tw = S.lastShot ? S.lastShot.twist : 'normal';
    var res = {
      made: tr.scored, swish: tr.scored && tr.swish, bank: tr.scored && tr.bank,
      rattle: tr.scored && tr.rimAny >= 2, airball: !tr.scored && tr.rimAny === 0 && tr.board === 0,
      rimOut: !tr.scored && tr.rimAny > 0, perfect: S.lastShot && S.lastShot.perfect, who: S.lastShot ? S.lastShot.who : 'player',
      twist: tw, hitTargets: tr.hitTargets.slice(), spot: S.spotId, deep: (D.SPOTS[S.spotId] || {}).d > 5.5
    };
    res.bounced = tr.scored && tr.bounces > 0;
    res.blocked = tr.obstacle > 0;
    res.twistOk = res.made && (tw === 'bank' ? res.bank : tw === 'swish' ? res.swish : tw === 'bounce' ? res.bounced : true);
    // extra detail for the Trick Shot Hall
    res.maxY = tr.maxY; res.rimAny = tr.rimAny; res.nudged = tr.nudges > 0; res.props = tr.propHits.slice(); res.gates = tr.gates.slice();
    res.dist = (D.SPOTS[S.spotId] || {}).d || 0; res.wind = S.lastShot ? S.lastShot.wind : 0;
    return res;
  }

  function commentary(res) {
    var C = D.CALLS;
    if (!res.made) {
      if (res.blocked) S.say(t('SQUAWK!'), '#ffffff');
      else if (res.airball) S.say(t(U.pick(C.airball)), '#ffffff');
      else if (res.rimOut) S.say(t(U.pick(C.rimOut)), '#ffb4a2');
      else S.say(t(U.pick(C.miss)), '#ffffff');
      A.aww();
      S.crowdMood = { k: 'aww', t: 0 };
      if (res.blocked) S.mcPick('gull');
      else S.mcPick(res.airball ? 'airball' : res.rimOut ? 'rimOut' : 'miss', null, 0.45);
      return;
    }
    S.crowdMood = { k: 'cheer', t: 0 };
    // MC Mic: notable makes always get a line, ordinary ones sometimes.
    if (S.onFire && S.swishStreak === (S.mode.fireAt || 3)) S.mcPick('fire');
    else if (res.deep) S.mcPick('deep');
    else if (S.makeStreak >= 3) S.mcPick('streak', { n: S.makeStreak });
    else if (S.clutch) S.mcPick('clutch');
    else if (res.swish) S.mcPick('swish', null, 0.6);
    else if (res.bank) S.mcPick('bank', null, 0.7);
    else if (res.rattle) S.mcPick('rattle', null, 0.7);
    else S.mcPick('make', null, 0.35);
  }

  function resolve() {
    var res = classify(S.tr);
    S.state = 'after';
    var st = SS.save.data.stats, guest = !!(S.lastShot && S.lastShot.guest);
    if (res.who === 'player') {
      S.makeStreak = res.made ? S.makeStreak + 1 : 0;
      if (res.made && !guest) st.makes++;
      if (res.swish && !guest) st.swishes++;
      if (res.bank && !guest) st.banks++;
      // career best streak (v0.5): your own shots only, never pass-and-play
      if (res.made && !guest && S.mode.id !== 'versus' && S.mode.id !== 'tutorial' && SS.career) SS.career.noteStreak(S.makeStreak);
      // swish streak / ON FIRE (player only)
      if (res.swish) {
        S.swishStreak++;
        if (S.swishStreak === (S.mode.fireAt || 3) && S.mode.fire) {
          S.onFire = true; A.jingle('fire'); S.pop(t("YOU'RE ON FIRE!"), '#ff7a1a', 0.3, 1.3); S.celebrate(true);
        } else if (S.swishStreak >= 2) S.celebrate();
      } else if (!res.made) { S.swishStreak = 0; if (S.onFire) { S.onFire = false; S.pop(t('Fire cooled off'), '#ffffff', 0.35, 0.7); } }
      else S.swishStreak = 0;
      if (res.made && res.deep && res.swish) S.celebrate();
      if (res.made && S.clutch) { S.pop(t(U.pick(D.CALLS.clutch)), '#ffd23f', 0.28, 1.2); S.celebrate(true); }
    }
    if (res.who === 'player') commentary(res);
    if (res.who === 'player' && !guest && SS.tricks && S.mode.id !== 'tutorial') SS.tricks.check(S, res);
    // Swish Cam: big makes can be saved as a photo
    if (res.who === 'player' && res.made && (res.swish || res.bank || res.bounced || res.trick) && S.rec && S.mode.id !== 'tutorial') S.snapBtn = { t: 0 };
    if (S.mode.onResult) S.mode.onResult(S, res);
  }

  // ---------- Update ----------
  S.update = function (dt) {
    if (S.paused || S.results || S.photo) { updateFx(dt); return; }
    if (S.replay) { updateReplay(dt); updateFx(dt); return; }
    S.time += dt;
    R.tick(dt, S);
    if (SS.life) SS.life.tick(dt, S);
    var g = S.camGoal, c = S.cam;
    if (g) {
      // follow sky-high balls (bounce shots, half-court heaves) by tilting up a little
      var lift = 0, zg = 1;
      if ((S.state === 'flight' || S.state === 'after') && !S.mode.noCamLift) {
        // look ahead to the top of the arc, so the camera is ready before the ball gets there
        var bl = S.ball, apex = bl.vy > 0 ? bl.py + bl.vy * bl.vy / (2 * P.G) : bl.py, hy = U.lerp(bl.py, apex, 0.75);
        lift = U.clamp((hy - 4.0) * 0.65, 0, 3.4);
        // sky-high balls (bounce shots, moon balls, heaves): also pull the lens back
        zg = U.clamp(1 - (hy - 4.8) * 0.12, 0.6, 1);
      }
      S.camLift = U.damp(S.camLift, lift, lift > S.camLift ? 3.5 : 1.5, dt);
      S.camZoom = U.damp(S.camZoom || 1, zg, zg < (S.camZoom || 1) ? 4 : 1.4, dt);
      // a spot can ask for a wider lens (v0.4: the Ring of Fire hangs high in the rafters)
      S.camLens = U.damp(S.camLens || 1, g.zoom || 1, 3, dt);
      if (S.baseF) c.F = S.baseF * S.camZoom * S.camLens;
      c.x = U.damp(c.x, g.x, 4.5, dt); c.y = U.damp(c.y, g.y, 4.5, dt); c.z = U.damp(c.z, g.z, 4.5, dt);
      c.tx = U.damp(c.tx, g.tx, 4.5, dt); c.ty = U.damp(c.ty, g.ty + S.camLift, 4.5, dt); c.tz = U.damp(c.tz, g.tz, 4.5, dt);
      if (S.twist === 'moving' && S.state === 'ready' && S.windDir) {
        // slide side to side; the release is cleanest at the ends of the slide
        S.strafeT += dt;
        var ph = S.strafeT * Math.PI * 2 / 2.6, amp = 0.9;
        S.strafeV = Math.cos(ph) * amp * Math.PI * 2 / 2.6;
        S.strafe = Math.sin(ph) * amp;
        S.pos.x = S.posGoal.x + S.windDir.x * S.strafe; S.pos.z = S.posGoal.z + S.windDir.z * S.strafe;
      } else if (S.twist !== 'moving' || S.state === 'ready') {
        S.strafeV = 0; S.strafe = 0;
        S.pos.x = U.damp(S.pos.x, S.posGoal.x, 5, dt); S.pos.z = U.damp(S.pos.z, S.posGoal.z, 5, dt);
      }
    }
    // Eyes closed: the hoop fades away while the shooter gets ready, and returns as the ball drops.
    var hoopGoal = 1;
    if (S.twist === 'blind') {
      if (S.state === 'ready') hoopGoal = S.poseT > 0.9 || (S.drag && S.drag.on) ? 0 : 1;
      else if (S.state === 'flight') hoopGoal = S.ball.vy < 0 && S.ball.py < S.world.hy + 1.2 ? 1 : 0;
    }
    S.hoopVis = U.damp(S.hoopVis, hoopGoal, hoopGoal ? 6 : 2.2, dt);
    // timers
    for (var i = 0; i < S.timers.length; i++) {
      var tm = S.timers[i]; tm.t -= dt;
      if (tm.t <= 0) { S.timers.splice(i, 1); i--; tm.fn(); }
    }
    if (S.mode && S.mode.update) S.mode.update(S, dt);
    if (S.results) return;
    // hoop motion
    var mv = S.mode && S.mode.move;
    S.hoopT = (S.hoopT || 0) + dt * S.timeScale;
    if (mv) S.world.hx = (S.world.hx0 || 0) + Math.sin(S.hoopT * Math.PI * 2 / mv.period) * mv.amp;
    // wind easing. Wind always blows across the shooter's view (screen left/right).
    S.windNow = U.damp(S.windNow || 0, S.windGoal * (S.windMul == null ? 1 : S.windMul), 1.5, dt);
    var wd = S.windDir || { x: 1, z: 0 }, wf = S.windFactor(); // Easy aim assist softens your wind
    S.world.windX = S.windNow * wf * wd.x; S.world.windZ = S.windNow * wf * wd.z; S.world.windShow = S.windNow * wf;

    if (S.state === 'ready') {
      var h = S.holdPoint(), b = S.ball;
      var dip = S.drag && S.drag.on ? S.drag.p * 0.1 : 0;
      b.px = h.x; b.py = h.y - dip; b.pz = h.z;
      S.ballVis = Math.min(1, S.ballVis + dt * 5);
    }
    // slow motion for clutch shots
    if (S.state === 'flight' && S.clutch && !reduced() && S.tr && !S.tr.done) {
      var b2 = S.ball, dx = b2.px - S.world.hx, dy = b2.py - S.world.hy, dz = b2.pz - S.world.hz;
      if (b2.vy < 0 && dx * dx + dy * dy + dz * dz < 2.2 && S.slowT === 0) { S.slowT = 1.1; }
    }
    if (S.slowT > 0) { S.slowT = Math.max(0, S.slowT - dt); S.timeScale = S.slowT > 0 ? 0.3 : 1; if (S.slowT === 0) S.slowT = -1; }
    else S.timeScale = U.damp(S.timeScale, 1, 6, dt);

    if (S.state === 'flight' || S.state === 'after') {
      S.simAcc += dt * S.timeScale;
      var ev = [];
      var steps = 0;
      while (S.simAcc >= P.DT && steps < 40) {
        S.simAcc -= P.DT; steps++;
        P.step(S.world, S.ball, S.tr, P.DT, ev);
        // net drag on ball
        if (S.tr.inNet) {
          var k = Math.exp(-P.DT * 9);
          S.ball.vx *= k; S.ball.vz *= k; S.ball.vy *= Math.exp(-P.DT * 2.5);
        }
      }
      for (var e = 0; e < ev.length; e++) handleEvent(ev[e]);
      if (S.state === 'flight' && S.tr.done) resolve();
      // spin visual (about camera right axis)
      var bw = S.ball;
      S.ballRot += -(bw.wx * S.cam.rx + bw.wz * S.cam.rz) * dt * S.timeScale;
      // record for instant replay (ball, hoop and shooter)
      if (S.rec && S.rec.frames.length < 900 && (S.state === 'flight' || S.rec.done < 0.9)) {
        if (S.state === 'after') S.rec.done += dt * S.timeScale;
        S.rec.frames.push({ x: bw.px, y: bw.py, z: bw.pz, r: S.ballRot, hx: S.world.hx, dt: dt * S.timeScale,
          a: { x: S.pos.x, z: S.pos.z, y: 0, pose: S.pose, t: S.poseT } });
      }
      // ball trail (world points; projected when drawn)
      if (S.trail && (S.state === 'flight' || (S.tr.scored && S.tr.scoreT < 0.25))) {
        S.trail.push({ x: bw.px, y: bw.py, z: bw.pz, t: S.time });
        if (S.trail.length > 30) S.trail.shift();
      }
      if (S.onFire && S.state === 'flight') {
        var bs = S.screenOf(bw.px, bw.py, bw.pz);
        if (bs.s && !reduced()) S.fx.push({ x: bs.x + U.rand(-4, 4), y: bs.y + U.rand(-4, 4), vx: U.rand(-30, 30), vy: U.rand(-90, -30), life: 0, max: 0.45, c: U.pick(['#ffd23f', '#ff7a1a', '#ff3d00']), s: bs.s * 0.07, type: 'fire' });
      }
    }
    // net always simulates (keeps swaying)
    var netSteps = 2;
    for (var n = 0; n < netSteps; n++) {
      var hit = P.stepNet(S.net, S.world, S.ball, dt * S.timeScale / netSteps, S.state === 'flight' || S.state === 'after');
    }
    S.poseT += dt;
    if (S.pose === 'shoot' && S.poseT > 0.9) S.pose = 'idle';
    updateFx(dt);
  };

  function updateFx(dt) {
    S.shake = Math.max(0, S.shake - dt * 30);
    S.punch = Math.max(0, S.punch - dt * 0.18);
    S.boardFlash = Math.max(0, S.boardFlash - dt * 3);
    S.crowdE = U.damp(S.crowdE, S.onFire ? 0.45 : 0.12, 0.9, dt);
    S.celebCool = Math.max(0, S.celebCool - dt);
    for (var i = 0; i < S.fx.length; i++) {
      var f = S.fx[i]; f.life += dt;
      f.x += f.vx * dt; f.y += f.vy * dt;
      if (f.type === 'confetti') { f.vy += 700 * dt; f.vx *= 0.985; f.rot += dt * 8; }
      else if (f.type === 'spark') { f.vx *= 0.9; f.vy *= 0.9; }
      else if (f.type === 'dust') { f.vy += 100 * dt; }
    }
    S.fx = S.fx.filter(function (f) { return f.life < f.max; });
    if (S.fx.length > 400) S.fx.splice(0, S.fx.length - 400);
    for (var j = 0; j < S.pops.length; j++) S.pops[j].t += dt;
    S.pops = S.pops.filter(function (p) { return p.t < 1.3; });
    if (S.call) { S.call.t += dt; if (S.call.t > 1.9) S.call = null; }
    if (S.celeb) {
      S.celeb.t += dt;
      if (S.celeb.combo && !S.celeb.shouted && S.celeb.t > SS.celebCombo.shoutAt) { S.celeb.shouted = true; A.blabber(5); if (SS.a11y) SS.a11y.say(t(D.COMBO_LINES[S.celeb.combo.line] || '')); }
      if (S.celeb.t > (S.celeb.dur || 2.2)) S.celeb = null;
    }
    if (S.mcLine) { S.mcLine.t += dt; if (S.mcLine.t > 3.2) S.mcLine = null; }
    if (S.crowdMood) { S.crowdMood.t += dt; if (S.crowdMood.t > 1.6) S.crowdMood = null; }
    if (S.glowReveal) { S.glowReveal.t += dt; if (S.glowReveal.t > 2.4) S.glowReveal = null; }
    if (S.trickCard) { S.trickCard.t += dt; if (S.trickCard.t > 3.6) S.trickCard = null; }
    if (S.snapBtn) { S.snapBtn.t += dt; if (S.snapBtn.t > 5 || S.state === 'flight') S.snapBtn = null; }
  }

  // ---------- Instant replay ----------
  // Plays back the recorded flight from a dramatic side camera in slow motion.
  // opts: { frames, speed, onDone, label, actor(look) }. Tap anywhere to skip.
  S.startReplay = function (opts) {
    opts = opts || {};
    var rec = opts.frames || (S.rec && S.rec.frames);
    if (!rec || rec.length < 10) { if (opts.onDone) opts.onDone(); return false; }
    var side = rec[0].x > 0.3 ? -1 : rec[0].x < -0.3 ? 1 : (Math.random() < 0.5 ? -1 : 1);
    S.replay = { frames: rec, f: 0, speed: opts.speed || 0.45, onDone: opts.onDone, side: side, t: 0, who: (S.rec && S.rec.who) || 'player',
      label: opts.label || t('REPLAY'), look: opts.look || null, net: P.makeNet(S.world), spin: opts.spin || 0 };
    S.mcPick('replay');
    S.drag = null;
    return true;
  };
  function updateReplay(dt) {
    var rp = S.replay; rp.t += dt;
    var fr = rp.frames, adv = dt * rp.speed;
    // advance through frames by their recorded durations
    while (adv > 0 && rp.f < fr.length - 1) {
      var cur = fr[Math.floor(rp.f)], left = (1 - (rp.f % 1)) * (cur.dt || 1 / 60);
      if (adv >= left) { adv -= left; rp.f = Math.floor(rp.f) + 1; }
      else { rp.f += adv / (cur.dt || 1 / 60); adv = 0; }
    }
    var i = Math.floor(rp.f), k = rp.f - i, A0 = fr[i], B0 = fr[Math.min(fr.length - 1, i + 1)];
    var b = S.ball;
    b.px = U.lerp(A0.x, B0.x, k); b.py = U.lerp(A0.y, B0.y, k); b.pz = U.lerp(A0.z, B0.z, k);
    S.ballRot = U.lerp(A0.r, B0.r, k);
    S.world.hx = A0.hx;
    for (var n = 0; n < 2; n++) P.stepNet(rp.net, S.world, b, dt * rp.speed / 2, true);
    rp.cur = A0;
    if (rp.f >= fr.length - 1 || rp.skip) {
      var done = rp.onDone; S.replay = null; S.snapCamera();
      if (done) done();
    }
  }
  function replayCamera(cam) {
    var rp = S.replay, b = S.ball, w = S.world;
    var tx = U.lerp(b.px, w.hx, 0.45), ty = U.lerp(Math.min(b.py, 6), w.hy, 0.4), tz = U.lerp(b.pz, w.hz, 0.45);
    var orbit = rp.t * 0.12 + rp.spin;
    cam.x = w.hx + rp.side * (4.6 - orbit) ; cam.y = 2.3 + rp.t * 0.15; cam.z = -1.4 - orbit * 1.4;
    cam.tx = tx; cam.ty = ty; cam.tz = tz; cam.update();
  }

  // ---------- Input (flick) ----------
  S.dragLen = function () { return U.clamp(UI.H * 0.36, 190, 360) * ((S.mode && S.mode.dragMul) || 1); };
  S.onDown = function (p) {
    if (S.replay) { S.replay.skip = true; return; }
    if (S.paused || S.results || S.photo) return;
    if (S.mode.onTap && S.mode.onTap(S, p)) return;
    if (S.state !== 'ready' || S.shooter !== 'player') return;
    if (S.mode.canShoot && !S.mode.canShoot(S)) return;
    S.drag = { on: true, x0: p.x, y0: p.y, x: p.x, y: p.y, p: 0, inWin: false, t0: p.t };
    S.pose = 'aim';
    S.hint = null;
  };
  S.onMove = function (p) {
    var d = S.drag; if (!d || !d.on) return;
    d.x = p.x; d.y = p.y;
    d.p = U.clamp((d.y0 - d.y) / S.dragLen(), 0, 1);
    var inWin = Math.abs(d.p - S.pIdeal()) <= S.window();
    if (inWin && !d.inWin && S.twist !== 'nolook') A.tick(1);
    else if (Math.random() < 0.3 && d.p > 0.05) A.tick(d.p * 0.6);
    d.inWin = inWin;
  };
  S.onUp = function (p, cancel) {
    var d = S.drag; if (!d || !d.on) return;
    d.on = false;
    S.onMove(p);
    if (cancel || d.p < 0.1) {
      S.drag = null; S.pose = 'hold';
      if (!cancel) S.hint = { text: t('Drag UP, then let go!'), t: 0 };
      return;
    }
    var aim = Math.atan2(d.x - d.x0, d.y0 - d.y);
    S.drag = null;
    S.shoot(d.p, aim, 'player');
  };
  S.onKey = function (k) {
    if (k === 'Escape' || k === 'p') { if (S.photo) S.photo = null; else if (!S.results) S.paused = !S.paused; }
  };

  // ---------- Results / end ----------
  S.finish = function (r) {
    S.results = r; S.results.t = 0; S.drag = null;
    if (r.jingle) A.jingle(r.jingle);
    if (SS.career) SS.career.check(); // v0.5: trophies earned this round
    if (SS.a11y) SS.a11y.say([r.title].concat(r.lines || []).concat(r.coins ? [t('Coins: +{n}', { n: r.coins })] : []).join('. '));
  };

  // ---------- Draw ----------
  S.draw = function (ctx, W, H, dt) {
    var cam = S.cam, rp = S.replay;
    R.pixelScale = UI.DPR || 1;
    var F0 = cam.F, sv = { x: cam.x, y: cam.y, z: cam.z, tx: cam.tx, ty: cam.ty, tz: cam.tz };
    if (rp) replayCamera(cam);
    // punch zoom (plus a mode zoom, e.g. half-court heaves, and a pull-back for sky-high balls)
    cam.F = F0 * (1 + S.punch) * (rp && S.mode.zoom ? 1 / S.mode.zoom : 1) / (rp ? (S.camZoom || 1) * (S.camLens || 1) : 1);
    cam.update();
    ctx.save();
    if (S.shake > 0) ctx.translate(U.rand(-S.shake, S.shake), U.rand(-S.shake, S.shake));
    drawWorld(ctx, cam, W, H);
    ctx.restore();
    cam.F = F0;
    if (rp) { cam.x = sv.x; cam.y = sv.y; cam.z = sv.z; cam.tx = sv.tx; cam.ty = sv.ty; cam.tz = sv.tz; cam.update(); }
    drawParticles(ctx);
    if (rp) {
      var k0 = UI.k || 1;
      ctx.save(); ctx.scale(k0, k0); drawReplayOverlay(ctx, UI.W, UI.H); ctx.restore();
      return;
    }
    drawHud(ctx, dt);
  };

  // The 3D court, crowd, hoop, ball, trail and shooter. Shared by the live view, replays and Swish Cam photos.
  function drawWorld(ctx, cam, W, H) {
    var rp = S.replay;
    R.drawBackground(ctx, cam, W, H, S.time);
    R.drawCourt(ctx, cam, S.time);
    if (S.mode.drawFloor) S.mode.drawFloor(ctx, S);
    R.drawProps(ctx, cam, S.time, S.world);
    if (SS.life) SS.life.drawBack(ctx, cam, S.time);
    R.drawCrowd(ctx, cam, S.time, rp ? 0.8 : S.crowdE, rp ? 'cheer' : S.crowdMood && S.crowdMood.k);
    if (SS.life) SS.life.drawFront(ctx, cam, S.time);
    if (S.mode.drawWorld) S.mode.drawWorld(ctx, S, cam);

    var b = S.ball, w = S.world, net = rp ? rp.net : S.net;
    var skin = (rp ? rp.who === 'rival' : S.shooter === 'rival') ? 'classic' : (S.mode.ballSkin && S.mode.ballSkin(S)) || S.look().ball || 'classic';
    var showBall = (S.state !== 'idle' && S.ballVis > 0.02 && !S.hideBall) || !!rp;
    var behindBoard = b.pz > P.BOARD_Z + 0.03;
    var rimD = cam.depth(w.hx, w.hy, w.hz), bD = cam.depth(b.px, b.py, b.pz);
    var dxr = b.px - w.hx, dzr = b.pz - w.hz;
    var nearRim = dxr * dxr + dzr * dzr < 0.8 && b.py < w.hy + 0.5 && b.py > w.hy - 1.0;
    var inside = nearRim && bD > rimD - w.R * 0.6;
    var holding = showBall && S.state === 'ready' && !rp;
    // in a replay the shooter may be in front of the hoop on screen
    var ra = rp && rp.cur && rp.cur.a;
    var actorFirst = ra && cam.depth(ra.x, (ra.y || 0) + 1, ra.z) > rimD;
    if (actorFirst) drawShooter(ctx, cam, skin, false);
    if (showBall) R.drawBallShadow(ctx, cam, b);
    if (showBall && behindBoard) R.drawBall(ctx, cam, b, skin, S.ballRot, S.onFire);
    var hv = rp ? 1 : S.hoopVis;
    if (hv < 0.999) ctx.globalAlpha = Math.max(0, hv);
    if (hv > 0.01) {
      R.drawHoopBack(ctx, cam, w, { boardFlash: S.boardFlash, litTargets: S.litTargets, time: S.time });
      R.drawRimHalf(ctx, cam, w, net, false);
    }
    ctx.globalAlpha = 1;
    if (showBall && !behindBoard && inside) R.drawBall(ctx, cam, b, skin, S.ballRot, S.onFire);
    if (hv < 0.999) ctx.globalAlpha = Math.max(0, hv);
    if (hv > 0.01) R.drawRimHalf(ctx, cam, w, net, true);
    ctx.globalAlpha = 1;
    if (showBall && !holding) drawTrail(ctx, cam, rp);
    if (S.mode.drawFront) S.mode.drawFront(ctx, S, cam);
    if (showBall && !behindBoard && !inside && !holding) R.drawBall(ctx, cam, b, skin, S.ballRot, S.onFire);
    if (S.mode.drawOver) S.mode.drawOver(ctx, S, cam);
    // shooter
    if (!actorFirst) {
      if (S.mode.drawActor && !rp) S.mode.drawActor(ctx, S, cam, skin);
      else drawShooter(ctx, cam, skin, holding);
    }
    R.drawWeather(ctx, cam, W, H, S.time);
    R.tint(ctx, W, H);
  }
  S.drawWorld = drawWorld;

  // Ball trails (earned in the Trick Shot Hall). Drawn from the last ~18 positions of the ball.
  var tp = { x: 0, y: 0, s: 0, z: 0 };
  function drawTrail(ctx, cam, rp) {
    var who = rp ? rp.who : S.shooter;
    if (who === 'rival') return;
    var id = S.look().trail;
    if (!id || id === 'none') return;
    var pts = [];
    if (rp) {
      var fi = Math.floor(rp.f);
      for (var j = Math.max(0, fi - 58); j <= fi; j += 2) { var fr = rp.frames[j]; pts.push({ x: fr.x, y: fr.y, z: fr.z }); }
    } else pts = S.trail || [];
    if (pts.length < 3) return;
    var it = D.item('trail', id), scr = [];
    for (var i = 0; i < pts.length; i++) {
      if (!cam.project(pts[i].x, pts[i].y, pts[i].z, tp)) continue;
      scr.push({ x: tp.x, y: tp.y, r: tp.s * P.R_BALL });
    }
    var n = scr.length; if (n < 3) return;
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    var time = S.time;
    for (var k = 1; k < n; k++) {
      var f = k / n, a = scr[k - 1], c = scr[k], r = c.r;
      if (id === 'bubble' || id === 'stars') continue;
      ctx.globalAlpha = f * (id === 'comet' ? 0.85 : 0.75);
      ctx.strokeStyle = id === 'rainbow' ? 'hsl(' + ((k * 14 + time * 120) % 360) + ',95%,60%)'
        : id === 'aurora' ? 'hsl(' + (150 + 110 * (0.5 + 0.5 * Math.sin(k * 0.35 + time * 3))) + ',85%,62%)'
        : id === 'legend' ? (k % 2 ? it.c1 : it.c2) : id === 'galaxy' ? (k % 3 ? it.c1 : it.c2) : it.c1;
      ctx.lineWidth = Math.max(3, r * (id === 'comet' || id === 'legend' ? 2.0 : 1.5) * f);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(c.x, c.y); ctx.stroke();
    }
    // sparkly extras
    for (var q = 0; q < n; q += (id === 'bubble' ? 2 : 1)) {
      var e = scr[q], ff = q / n;
      if (id === 'spark' || id === 'galaxy') {
        if ((q + Math.floor(time * 20)) % 3) continue;
        ctx.globalAlpha = ff; ctx.fillStyle = id === 'galaxy' ? '#ffffff' : it.c2;
        ctx.beginPath(); ctx.arc(e.x + Math.sin(q * 7) * e.r, e.y + Math.cos(q * 5) * e.r, Math.max(1, e.r * 0.25), 0, 7); ctx.fill();
      } else if (id === 'bubble') {
        ctx.globalAlpha = ff * 0.8; ctx.strokeStyle = it.c1; ctx.lineWidth = Math.max(1, e.r * 0.12);
        ctx.beginPath(); ctx.arc(e.x + Math.sin(q * 3 + time * 4) * e.r * 0.6, e.y, Math.max(2, e.r * (0.25 + ff * 0.4)), 0, 7); ctx.stroke();
      } else if (id === 'stars') {
        ctx.globalAlpha = ff; ctx.fillStyle = q % 2 ? it.c1 : it.c2;
        var sr = Math.max(2, e.r * (0.3 + 0.3 * ff)), sx = e.x + Math.sin(q * 5) * e.r * 0.5, sy = e.y;
        ctx.beginPath(); ctx.moveTo(sx, sy - sr); ctx.lineTo(sx + sr * 0.3, sy - sr * 0.3); ctx.lineTo(sx + sr, sy); ctx.lineTo(sx + sr * 0.3, sy + sr * 0.3);
        ctx.lineTo(sx, sy + sr); ctx.lineTo(sx - sr * 0.3, sy + sr * 0.3); ctx.lineTo(sx - sr, sy); ctx.lineTo(sx - sr * 0.3, sy - sr * 0.3); ctx.closePath(); ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawHud(ctx, dt) {
    var W, H;
    // ---- HUD layer, in UI points (scaled up on tablets) ----
    var k = UI.k || 1;
    ctx.save(); ctx.scale(k, k);
    W = UI.W; H = UI.H;
    drawPops(ctx, W, H);
    if (S.mode.hud) S.mode.hud(ctx, S, W, H);
    drawWind(ctx, W, H);
    if (S.state === 'ready' && S.shooter === 'player') drawGauge(ctx, W, H);
    else if (S.glowReveal) drawGlowReveal(ctx, W, H);
    if (S.state === 'flight') drawBallMarker(ctx, W, H);
    drawCall(ctx, W, H);
    if (S.mcLine) drawMc(ctx, W, H - 96 - UI.safe.b);
    drawCeleb(ctx, W, H);
    if (S.trickCard) drawTrickCard(ctx, W, H);
    if (S.snapBtn && !S.results && !S.paused && !S.photo) {
      var sbx = S.lefty() ? W - 74 - UI.safe.r : 14 + UI.safe.l, sby = H - 268 - UI.safe.b;
      var wob = 1 + 0.06 * Math.sin(S.time * 8);
      ctx.save(); ctx.translate(sbx + 30, sby + 30); ctx.scale(wob, wob); ctx.translate(-sbx - 30, -sby - 30);
      if (UI.button(ctx, 'snap', sbx, sby, 60, 60, '', { icon: 'camera', color: '#ec4899', size: 24, radius: 20, aria: t('Swish Cam: save a photo') })) { S.snapBtn = null; S.snapPhoto(); }
      ctx.restore();
      UI.text(ctx, t('SWISH CAM'), sbx + 30, sby + 76, 11, '#fff', 'center', { stroke: '#111827', strokeW: 4 });
    }
    if (S.hint) {
      S.hint.t += dt;
      var a = Math.min(1, S.hint.t * 4) * (S.hint.t > 2 ? Math.max(0, 1 - (S.hint.t - 2) * 2) : 1);
      ctx.globalAlpha = a;
      UI.text(ctx, S.hint.text, W / 2, H * 0.8, 24, '#fff', 'center', { stroke: '#1f2937', strokeW: 6, maxW: W - 24 });
      ctx.globalAlpha = 1;
      if (S.hint.t > 2.5) S.hint = null;
    }
    if (S.mode.overlay) S.mode.overlay(ctx, S, W, H, dt);
    // pause button
    if (!S.results) {
      var sz = 48, px = 14 + UI.safe.l, py = 12 + UI.safe.t;
      if (UI.button(ctx, 'pause', px, py, sz, sz, '', { icon: 'pause', color: '#334155', size: 20, radius: 16 })) { S.paused = true; }
    }
    if (S.paused) drawPause(ctx, W, H);
    if (S.results) drawResults(ctx, W, H, dt);
    if (S.photo) drawPhoto(ctx, W, H, dt);
    ctx.restore();
  }

  // No-Look reveal: the hidden glow fades in on the power bar, with a tick where you let go.
  function drawGlowReveal(ctx, W, H) {
    var g = S.glowReveal, lefty = S.lefty();
    var x = lefty ? 36 + UI.safe.l : W - 36 - UI.safe.r, y1 = H * 0.74, y0 = H * 0.36, h = y1 - y0, w = 22;
    var a = Math.min(1, g.t * 3) * (g.t > 1.9 ? Math.max(0, 1 - (g.t - 1.9) / 0.5) : 1);
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(15,23,42,0.6)'; UI.rr(ctx, x - w / 2 - 4, y0 - 4, w + 8, h + 8, 14); ctx.fill();
    var by0 = y1 - (g.pi + g.win) * h, by1 = y1 - (g.pi - g.win) * h;
    ctx.fillStyle = '#5ef2ff'; ctx.fillRect(x - w / 2 - 6, by0, w + 12, by1 - by0);
    var ry = y1 - U.clamp(g.p, 0, 1) * h;
    ctx.fillStyle = g.perfect ? '#7cff6b' : '#ffd23f';
    ctx.beginPath(); ctx.moveTo(x - w / 2 - 14, ry - 8); ctx.lineTo(x - w / 2 - 2, ry); ctx.lineTo(x - w / 2 - 14, ry + 8); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#111827'; ctx.lineWidth = 2; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2; UI.rr(ctx, x - w / 2, y0, w, h, 10); ctx.stroke();
    var msg = g.perfect ? t('Felt it! Perfect!') : g.p > g.pi ? t('Glow was lower') : t('Glow was higher');
    var tx = lefty ? x + 22 : x - 22;
    UI.text(ctx, t('GLOW WAS HERE'), tx, (by0 + by1) / 2 - 12, 12, '#5ef2ff', lefty ? 'left' : 'right', { stroke: '#0f172a', strokeW: 4 });
    UI.text(ctx, msg, tx, (by0 + by1) / 2 + 8, 14, g.perfect ? '#7cff6b' : '#fde68a', lefty ? 'left' : 'right', { stroke: '#0f172a', strokeW: 4 });
    ctx.globalAlpha = 1;
  }

  // When the ball flies above the top of the screen, a little marker shows where it is.
  function drawBallMarker(ctx, W, H) {
    var b = S.ball, kk = UI.k || 1, o = S.screenOf(b.px, b.py, b.pz);
    if (!o.s) return;
    var y = o.y / kk, x = U.clamp(o.x / kk, 30, W - 30);
    if (y > UI.safe.t + 8) return;
    var my = UI.safe.t + 96, pulse = 1 + 0.1 * Math.sin(S.time * 12);
    ctx.fillStyle = 'rgba(15,23,42,0.7)'; ctx.beginPath(); ctx.arc(x, my, 22, 0, 7); ctx.fill();
    ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.moveTo(x, my - 34 * pulse); ctx.lineTo(x - 9, my - 22); ctx.lineTo(x + 9, my - 22); ctx.closePath(); ctx.fill();
    AV.drawBall(ctx, x, my, 13, S.shooter === 'rival' ? 'classic' : S.look().ball || 'classic', S.ballRot);
    UI.text(ctx, b.py.toFixed(1) + ' m', x, my + 32, 12, '#fff', 'center', { stroke: '#111827', strokeW: 4 });
  }

  // "NEW TRICK SHOT!" card that slides down from the top.
  function drawTrickCard(ctx, W, H) {
    var c = S.trickCard, k = U.easeOutBack(Math.min(1, c.t * 3)), out = c.t > 3.1 ? (c.t - 3.1) / 0.5 : 0;
    var w = Math.min(W - 30, 360), h = 84, x = (W - w) / 2, y = UI.safe.t + 64 - (1 - k + out) * 160;
    ctx.save();
    var g = ctx.createLinearGradient(x, y, x + w, y + h); g.addColorStop(0, '#7c3aed'); g.addColorStop(1, '#ec4899');
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; UI.rr(ctx, x, y + 5, w, h, 20); ctx.fill();
    ctx.fillStyle = g; UI.rr(ctx, x, y, w, h, 20); ctx.fill();
    ctx.strokeStyle = '#fde68a'; ctx.lineWidth = 3; UI.rr(ctx, x, y, w, h, 20); ctx.stroke();
    // shine sweep
    ctx.save(); UI.rr(ctx, x, y, w, h, 20); ctx.clip();
    var sx = x - 80 + ((c.t * 300) % (w + 160));
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.beginPath(); ctx.moveTo(sx, y); ctx.lineTo(sx + 40, y); ctx.lineTo(sx + 10, y + h); ctx.lineTo(sx - 30, y + h); ctx.fill();
    ctx.restore();
    UI.icon(ctx, c.sig ? 'trophy' : 'star4', x + 40, y + h / 2, 34, '#fde68a');
    UI.text(ctx, c.sig ? t('SIGNATURE TRICK!') : t('NEW TRICK SHOT!'), x + 72, y + 22, 13, '#fde68a', 'left', { maxW: w - 150 });
    UI.text(ctx, t(c.name), x + 72, y + 48, 22, '#fff', 'left', { stroke: '#3b0764', strokeW: 5, maxW: w - 150 });
    UI.text(ctx, t('{n} of {m} in the Hall', { n: c.count, m: D.TRICKS.length }), x + 72, y + 70, 11, '#fce7f3', 'left', { maxW: w - 150 });
    if (c.coins) { UI.coinIcon(ctx, x + w - 52, y + h / 2, 11); UI.text(ctx, '+' + c.coins, x + w - 38, y + h / 2 + 1, 18, '#fde68a', 'left'); }
    ctx.restore();
  }

  // ---------- Swish Cam: a slow-motion photo of the ball dropping through the net ----------
  S.snapPhoto = function (caption) {
    var rec = S.rec && S.rec.frames;
    if (!rec || rec.length < 8 || !SS.canvas) return false;
    // the moment the ball is closest to the middle of the rim on the way down
    var w = S.world, bi = 0, bd = 1e9;
    for (var i = 1; i < rec.length; i++) {
      var f = rec[i], dy = f.y - (w.hy - 0.12), d = (f.x - f.hx) * (f.x - f.hx) + dy * dy * 1.5 + (f.z - w.hz) * (f.z - w.hz);
      if (f.y < rec[i - 1].y && d < bd) { bd = d; bi = i; }
    }
    var fr = rec[bi];
    var Wv = S.lastW || 400, Hv = S.lastH || 700;
    var cv = document.createElement('canvas'), sc = Math.min(1, 900 / Math.max(Wv, Hv));
    cv.width = Math.round(Wv * sc); cv.height = Math.round(Hv * sc);
    var c2 = cv.getContext('2d'); c2.scale(sc, sc);
    // a dramatic low side camera, close to the rim
    var cam = new SS.Camera(), side = fr.a && fr.a.x > 0.3 ? -1 : 1;
    cam.F = Math.max(Wv, Hv) * 1.25; cam.cx = Wv / 2; cam.cy = Hv / 2;
    cam.x = fr.hx + side * 2.7; cam.y = 2.35; cam.z = -1.7; cam.tx = fr.hx; cam.ty = w.hy - 0.05; cam.tz = 0; cam.update();
    var save = { rp: S.replay, px: S.ball.px, py: S.ball.py, pz: S.ball.pz, hx: w.hx, crowdMood: S.crowdMood, hv: S.hoopVis };
    // (the shooter is parked out of shot so the photo is all about the ball and the net)
    S.replay = { frames: rec, f: bi, cur: { a: { x: fr.hx, y: -60, z: -40, pose: 'idle', t: 0 } }, who: S.rec.who || 'player', net: S.net, look: null, t: 0 };
    S.ball.px = fr.x; S.ball.py = fr.y; S.ball.pz = fr.z; w.hx = fr.hx; S.crowdMood = { k: 'cheer', t: 0 };
    try { drawWorld(c2, cam, Wv, Hv); } catch (e) { console.error(e); }
    S.replay = save.rp; S.ball.px = save.px; S.ball.py = save.py; S.ball.pz = save.pz; w.hx = save.hx; S.crowdMood = save.crowdMood;
    // the picture: cropped round the ball, with a film-style vignette
    var iw = 272, ih = 286, cw = cv.width, ch = cv.height, cropW = Math.min(cw, ch * iw / ih), cropH = cropW * ih / iw;
    var o = {}; cam.project(fr.x, fr.y, fr.z, o);
    var cx = U.clamp(o.x * sc - cropW / 2, 0, cw - cropW), cy = U.clamp(o.y * sc - cropH * 0.45, 0, ch - cropH);
    var crop = document.createElement('canvas'); crop.width = iw; crop.height = ih;
    var p = crop.getContext('2d');
    p.drawImage(cv, cx, cy, cropW, cropH, 0, 0, iw, ih);
    var vg = p.createRadialGradient(iw / 2, ih / 2, ih * 0.35, iw / 2, ih / 2, ih * 0.8);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.35)');
    p.fillStyle = vg; p.fillRect(0, 0, iw, ih);
    var cap = caption || (S.lastShot && S.lastShot.trickName) || (S.tr && S.tr.swish ? t('SWISH!') : t('Bucket!'));
    var guest = S.isGuest();
    var meta = { cap: cap, nick: S.mode.nickNow ? S.mode.nickNow(S) : SS.save.data.nick, date: U.todayKey(), guest: guest,
      court: t(S.mode.courtName || (D.courtById(S.mode.courtId || '') || {}).name || envCourtName(S.mode.env)), number: S.look().number };
    // v0.5 photo studio: frame it in your favourite style (Polaroid, Comic, Neon, Trading Card)
    var pref = SS.save.data.photo, pc = SS.photoStudio.compose(crop, meta, pref.frame, pref.sticker);
    var saved = SS.album ? SS.album.add(pc, cap) : false;
    if (saved) { SS.save.data.career.photos = Math.min(999999, SS.save.data.career.photos + 1); SS.save.write(); }
    S.photo = { img: pc, crop: crop, meta: meta, t: 0, saved: saved, cap: cap };
    A.shutter && A.shutter();
    return true;
  };
  // Modes without a court name (Quick Play, Daily, H-O-R-S-E...) are captioned with where they are played.
  function envCourtName(env) {
    if (env === 'night') return 'Midnight Court';
    for (var i = 0; i < D.COURTS.length; i++) if (D.COURTS[i].env === env) return D.COURTS[i].name;
    return 'Swish Street';
  }
  // Re-frame the open photo (and the newest album entry) after a frame or sticker change.
  function reframePhoto() {
    var ph = S.photo, pref = SS.save.data.photo;
    ph.img = SS.photoStudio.compose(ph.crop, ph.meta, pref.frame, pref.sticker);
    if (ph.saved && SS.album.replaceLatest) SS.album.replaceLatest(ph.img, ph.cap);
    SS.save.write();
  }
  function drawPhoto(ctx, W, H, dt) {
    var ph = S.photo; ph.t += dt;
    UI.blocker(ctx, Math.min(0.7, ph.t * 3), 'photoBlock');
    if (ph.t < 0.25) { ctx.fillStyle = 'rgba(255,255,255,' + (1 - ph.t / 0.25) + ')'; ctx.fillRect(0, 0, W, H); }
    // v0.5: the photo studio rows (frames, then sticker / done / download) sit under the photo
    var rowsH = 136, wide = W > H * 1.15;
    var iw = Math.min(W - 60, 280, (H - rowsH - 90 - UI.safe.t - UI.safe.b) * 300 / 380), ih = iw * 380 / 300;
    var pcx = W / 2, pcy = UI.safe.t + 30 + ih / 2, bw0 = Math.min(W - 32, 380), bx0 = (W - bw0) / 2, by = pcy + ih / 2 + 38;
    if (wide) { // landscape: photo on the left, studio on the right
      iw = Math.min(280, (H - 60 - UI.safe.t - UI.safe.b) * 300 / 380); ih = iw * 380 / 300;
      pcx = W * 0.3; pcy = H / 2; bw0 = Math.min(W * 0.4, 380); bx0 = W * 0.55; by = H / 2 - rowsH / 2;
    }
    var k = U.easeOutBack(Math.min(1, (ph.t - 0.1) * 2.5));
    if (k > 0) {
      ctx.save(); ctx.translate(pcx, pcy); ctx.rotate(-0.05 + (1 - k) * 0.4); ctx.scale(k, k);
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(-iw / 2 + 6, -ih / 2 + 8, iw, ih);
      ctx.drawImage(ph.img, -iw / 2, -ih / 2, iw, ih);
      ctx.restore();
    }
    var pref = SS.save.data.photo, live = ph.t > 0.4;
    UI.text(ctx, ph.saved ? t('Saved to your Photo Album!') : t('Swish Cam'), bx0 + bw0 / 2, by - 12, 15, '#fde68a', 'center', { stroke: '#111827', strokeW: 4, maxW: bw0 });
    // frame picker
    var fw = (bw0 - 18) / 4;
    D.PHOTO_FRAMES.forEach(function (f, i) {
      var sel = pref.frame === f.id;
      if (UI.button(ctx, 'phf_' + f.id, bx0 + i * (fw + 6), by, fw, 42, t(f.id === 'card' ? 'Card' : f.name), { color: sel ? '#ec4899' : '#475569', size: 13,
        aria: t('Frame: {f}', { f: t(f.name) }) + (sel ? ', ' + t('selected') : '') }) && live && !sel) { pref.frame = f.id; reframePhoto(); A.click(); }
    });
    var y2 = by + 56, canDl = !SS.native.isNative;
    var n = canDl ? 3 : 2, bw = (bw0 - 8 * (n - 1)) / n;
    var si = 0; D.PHOTO_STICKERS.forEach(function (s, i) { if (s.id === pref.sticker) si = i; });
    if (UI.button(ctx, 'phSticker', bx0, y2, bw, 50, t('Sticker'), { color: '#f59e0b', icon: 'star4', size: 15, sub: t(D.PHOTO_STICKERS[si].name),
      aria: t('Sticker: {s}. Tap for the next one.', { s: t(D.PHOTO_STICKERS[si].name) }) }) && live) {
      pref.sticker = D.PHOTO_STICKERS[(si + 1) % D.PHOTO_STICKERS.length].id; reframePhoto(); A.click();
    }
    if (UI.button(ctx, 'photoOk', bx0 + bw + 8, y2, bw, 50, t('Cool!'), { color: '#22c55e', icon: 'check' }) && live) S.photo = null;
    if (canDl && UI.button(ctx, 'photoDl', bx0 + (bw + 8) * 2, y2, bw, 50, t('Save'), { color: '#3b82f6', icon: 'camera', size: 16, aria: t('Download the photo') }) && live) {
      try { var a = document.createElement('a'); a.href = ph.img.toDataURL('image/png'); a.download = 'swish-street-photo.png'; a.click(); } catch (e) {}
    }
  }

  function drawShooter(ctx, cam, skin, holding) {
    var rp = S.replay, who = rp ? rp.who : S.shooter;
    var look = rp && rp.look ? rp.look : who === 'rival' && S.rival ? S.rival.look : S.look();
    var ax = S.pos.x, ay = 0, az = S.pos.z, pose = S.pose, pT = S.time;
    if (rp && rp.cur && rp.cur.a) { ax = rp.cur.a.x; ay = rp.cur.a.y || 0; az = rp.cur.a.z; pose = rp.cur.a.pose || 'idle'; pT = rp.cur.a.t || 0; }
    if (!cam.project(ax, ay, az, pt)) return;
    var feet = { x: pt.x, y: pt.y }, sc = pt.s;
    if (!rp && S.state === 'after' && S.poseT > 0.9) pose = 'idle';
    // the avatar faces the hoop (+z): we see its front when the camera is ahead of it
    var view = rp && cam.z > az ? 'front' : 'back';
    if (holding) {
      // draw ball first so hands wrap it
      R.drawBall(ctx, cam, S.ball, skin, S.ballRot, S.onFire);
    }
    AV.draw(ctx, look, feet.x, feet.y, sc * AV.HEIGHT_M, { view: view, pose: pose, t: pT, shadow: true, holdBall: holding });
  }

  function drawReplayOverlay(ctx, W, H) {
    var rp = S.replay, bar = Math.min(70, H * 0.09) + UI.safe.t * 0.5;
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, bar); ctx.fillRect(0, H - bar, W, bar);
    var blink = Math.floor(rp.t * 2.5) % 2 === 0;
    ctx.fillStyle = blink ? '#ef4444' : '#7f1d1d'; ctx.beginPath(); ctx.arc(26 + UI.safe.l, bar - 26, 9, 0, 7); ctx.fill();
    UI.text(ctx, rp.label, 44 + UI.safe.l, bar - 25, 22, '#fff', 'left');
    UI.text(ctx, t('SLOW-MO'), W - 18 - UI.safe.r, bar - 25, 14, '#fde68a', 'right');
    UI.text(ctx, t('Tap to skip'), W / 2, H - bar / 2 - UI.safe.b * 0.3, 14, 'rgba(255,255,255,0.75)', 'center');
    if (S.mcLine) drawMc(ctx, W, H - bar - 10);
  }

  // MC Mic lower-third pill
  function drawMc(ctx, W, y) {
    var m = S.mcLine, a = Math.min(1, m.t * 5) * (m.t > 2.8 ? Math.max(0, 1 - (m.t - 2.8) / 0.4) : 1);
    var shown = m.text.slice(0, Math.floor(m.t * 45)); // typewriter
    var w = Math.min(W - 40, 380), x = (W - w) / 2, h = 40, sl = (1 - U.easeOutCubic(Math.min(1, m.t * 4))) * 30;
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(15,23,42,0.85)'; UI.rr(ctx, x, y - h / 2 + sl, w, h, 20); ctx.fill();
    ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 2; UI.rr(ctx, x, y - h / 2 + sl, w, h, 20); ctx.stroke();
    ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(x + 20, y + sl, 15, 0, 7); ctx.fill();
    UI.icon(ctx, 'mic', x + 20, y + sl, 18, '#111827');
    UI.text(ctx, shown, x + 42, y + sl + 1, 14, '#fff', 'left', { weight: 800, maxW: w - 52 });
    ctx.globalAlpha = 1;
  }

  function drawGauge(ctx, W, H) {
    var d = S.drag, lefty = S.lefty();
    var x = lefty ? 36 + UI.safe.l : W - 36 - UI.safe.r, y1 = H * 0.74, y0 = H * 0.36, h = y1 - y0, w = 22;
    var pi = S.pIdeal(), win = S.window(), noGlow = S.twist === 'nolook';
    var p = d ? d.p : 0, inWin = d && d.inWin && !noGlow;
    ctx.globalAlpha = d ? 1 : 0.55;
    ctx.fillStyle = 'rgba(15,23,42,0.55)'; UI.rr(ctx, x - w / 2 - 4, y0 - 4, w + 8, h + 8, 14); ctx.fill();
    // sweet band (hidden for the No-Look twist: you have to feel it)
    var by0 = y1 - (pi + win) * h, by1 = y1 - (pi - win) * h;
    var pulse = 0.6 + 0.4 * Math.sin(S.time * 8);
    if (!noGlow) {
      ctx.fillStyle = inWin ? '#5ef2ff' : 'rgba(94,242,255,' + (0.35 + 0.25 * pulse) + ')';
      ctx.fillRect(x - w / 2 - 6, by0, w + 12, by1 - by0);
    } else {
      UI.text(ctx, '?', x, (y0 + y1) / 2, 18, 'rgba(255,255,255,0.35)', 'center');
    }
    // fill
    if (p > 0) {
      var g = ctx.createLinearGradient(0, y1, 0, y0);
      g.addColorStop(0, '#ffd23f'); g.addColorStop(0.6, '#ff7a1a'); g.addColorStop(1, '#ff3d6e');
      ctx.fillStyle = inWin ? '#ffffff' : g;
      UI.rr(ctx, x - w / 2 + 3, y1 - p * h, w - 6, p * h, 8); ctx.fill();
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2; UI.rr(ctx, x - w / 2, y0, w, h, 10); ctx.stroke();
    ctx.globalAlpha = 1;
    // Aim Assist badge under the bar (only when it is not Normal)
    var asst = S.assist();
    if (asst.id !== 'normal') {
      ctx.fillStyle = asst.id === 'easy' ? 'rgba(22,163,74,0.9)' : 'rgba(124,58,237,0.9)';
      UI.rr(ctx, x - 30, y1 + 10, 60, 22, 11); ctx.fill();
      UI.text(ctx, t(asst.name).toUpperCase(), x, y1 + 21, 11, '#fff', 'center', { maxW: 54 });
    }
    if (d && d.on) {
      // aim arrow from ball
      var b = S.ball, bs = S.screenOf(b.px, b.py, b.pz), kk = UI.k || 1;
      bs.x /= kk; bs.y /= kk; bs.s /= kk;
      var ang = Math.atan2(d.x - d.x0, d.y0 - d.y);
      var shown = Math.abs(ang) < 3 * U.deg ? 0 : ang * 0.9;
      var len = 40 + p * 70;
      ctx.save(); ctx.translate(bs.x, bs.y - bs.s * 0.15); ctx.rotate(shown);
      ctx.strokeStyle = inWin ? '#5ef2ff' : 'rgba(255,255,255,0.85)'; ctx.lineWidth = 5; ctx.setLineDash([2, 10]); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, -bs.s * 0.2); ctx.lineTo(0, -bs.s * 0.2 - len); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = ctx.strokeStyle; ctx.beginPath(); ctx.moveTo(-9, -bs.s * 0.2 - len); ctx.lineTo(9, -bs.s * 0.2 - len); ctx.lineTo(0, -bs.s * 0.2 - len - 14); ctx.fill();
      ctx.restore();
      if (inWin) {
        var gr = ctx.createRadialGradient(bs.x, bs.y, 2, bs.x, bs.y, bs.s * 0.4);
        gr.addColorStop(0, 'rgba(94,242,255,0.55)'); gr.addColorStop(1, 'rgba(94,242,255,0)');
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(bs.x, bs.y, bs.s * 0.4, 0, 7); ctx.fill();
        UI.text(ctx, t('RELEASE!'), lefty ? x + 12 : x - 12, by0 - 16, 15, '#5ef2ff', lefty ? 'left' : 'right', { stroke: '#0f172a', strokeW: 4 });
      }
    }
  }

  function drawWind(ctx, W, H) {
    var wv = (S.windNow || 0) * S.windFactor();
    if (Math.abs(S.windGoal) < 0.05 && Math.abs(wv) < 0.05) return;
    var x = S.lefty() ? W - 14 - UI.safe.r - 70 : 14 + UI.safe.l + 70, y = H - 40 - UI.safe.b;
    ctx.fillStyle = 'rgba(15,23,42,0.6)'; UI.rr(ctx, x - 70, y - 18, 140, 36, 18); ctx.fill();
    var dir = wv >= 0 ? 1 : -1, len = 14 + Math.min(1, Math.abs(wv) / 2) * 36;
    ctx.strokeStyle = '#a5f3fc'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    var ax = x - 22;
    ctx.beginPath(); ctx.moveTo(ax - dir * len / 2, y); ctx.lineTo(ax + dir * len / 2, y);
    ctx.moveTo(ax + dir * len / 2, y); ctx.lineTo(ax + dir * len / 2 - dir * 8, y - 7);
    ctx.moveTo(ax + dir * len / 2, y); ctx.lineTo(ax + dir * len / 2 - dir * 8, y + 7); ctx.stroke();
    UI.text(ctx, t('WIND') + ' ' + Math.abs(wv).toFixed(1), x + 30, y + 1, 14, '#e0f2fe', 'center');
  }

  function drawParticles(ctx) {
    for (var i = 0; i < S.fx.length; i++) {
      var f = S.fx[i], a = 1 - f.life / f.max;
      ctx.globalAlpha = Math.max(0, a);
      ctx.fillStyle = f.c;
      if (f.type === 'confetti') {
        ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.rot); ctx.fillRect(-f.s, -f.s * 0.5, f.s * 2, f.s); ctx.restore();
      } else if (f.type === 'fire') {
        ctx.beginPath(); ctx.arc(f.x, f.y, Math.max(1, f.s * (0.5 + a)), 0, 7); ctx.fill();
      } else {
        ctx.beginPath(); ctx.arc(f.x, f.y, f.s * a + 0.5, 0, 7); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }
  function drawPops(ctx, W, H) {
    for (var j = 0; j < S.pops.length; j++) {
      var p = S.pops[j], k = U.easeOutBack(Math.min(1, p.t * 4)), fa = p.t > 0.9 ? 1 - (p.t - 0.9) / 0.4 : 1;
      ctx.globalAlpha = Math.max(0, fa);
      UI.text(ctx, p.text, W / 2, H * p.y - p.t * 40, 30 * p.size * k, p.c, 'center', { stroke: '#111827', strokeW: 7, maxW: W - 30 });
      ctx.globalAlpha = 1;
    }
  }
  function drawCall(ctx, W, H) {
    var c = S.call; if (!c) return;
    var k = U.easeOutBack(Math.min(1, c.t * 5)), a = c.t > 1.5 ? Math.max(0, 1 - (c.t - 1.5) / 0.4) : 1;
    ctx.globalAlpha = a;
    ctx.save(); ctx.translate(W / 2, H * 0.27 + UI.safe.t * 0.5); ctx.rotate(-0.05); ctx.scale(k, k);
    UI.text(ctx, c.text, 0, 0, Math.min(52, W * 0.11), c.c, 'center', { stroke: '#111827', strokeW: 10, maxW: W - 40 });
    ctx.restore();
    ctx.globalAlpha = 1;
  }
  function drawCeleb(ctx, W, H) {
    var c = S.celeb; if (!c) return;
    var dur = c.dur || 2.2;
    var inT = U.easeOutBack(Math.min(1, c.t * 4)), out = c.t > dur - 0.3 ? (c.t - (dur - 0.3)) / 0.3 : 0;
    var w = Math.min(150, W * 0.36), h = w * 1.15;
    var x = 12 + UI.safe.l - (1 - inT + out) * (w + 30), y = H - h - 24 - UI.safe.b;
    if (S.lefty()) x = W - w - 12 - UI.safe.r + (1 - inT + out) * (w + 30);
    if (c.combo) { SS.celebCombo.drawCard(ctx, c.look || S.look(), c.combo, x, y, w, h, c.t); return; }
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; UI.rr(ctx, x, y + 5, w, h, 20); ctx.fill();
    var g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#ffd23f'); g.addColorStop(1, '#ff7a1a');
    ctx.fillStyle = g; UI.rr(ctx, x, y, w, h, 20); ctx.fill();
    ctx.strokeStyle = '#111827'; ctx.lineWidth = 4; UI.rr(ctx, x, y, w, h, 20); ctx.stroke();
    ctx.save(); UI.rr(ctx, x, y, w, h, 20); ctx.clip();
    AV.draw(ctx, c.look || S.look(), x + w / 2, y + h - 10, h * 0.62, { view: 'front', pose: c.id, t: c.t, shadow: false });
    ctx.restore();
    UI.text(ctx, t(D.item('celebration', c.id).name), x + w / 2, y + 16, 14, '#111827', 'center', { maxW: w - 12 });
  }

  function drawPause(ctx, W, H) {
    UI.blocker(ctx, 0.6, 'pauseBlock');
    var w = Math.min(340, W - 40), h = 330, x = (W - w) / 2, y = (H - h) / 2;
    UI.panel(ctx, x, y, w, h);
    UI.text(ctx, t('Paused'), W / 2, y + 44, 34, '#111827');
    if (UI.button(ctx, 'resume', x + 30, y + 84, w - 60, 62, t('Resume'), { color: '#22c55e', icon: 'play' })) S.paused = false;
    if (UI.button(ctx, 'restart', x + 30, y + 162, w - 60, 56, t('Restart'), { color: '#3b82f6', icon: 'retry' })) { S.paused = false; S.mode.restart(); }
    if (UI.button(ctx, 'quit', x + 30, y + 236, w - 60, 56, t('Quit'), { color: '#ef4444', icon: 'back' })) { S.paused = false; S.mode.quit(); }
  }

  function drawResults(ctx, W, H, dt) {
    var r = S.results; r.t += dt;
    UI.blocker(ctx, Math.min(0.6, r.t * 2), 'resBlock');
    var w = Math.min(380, W - 32), lines = r.lines || [];
    var subH = r.sub ? UI.countLines(ctx, r.sub, w - 40, 17) * 21 + 14 : 0;
    var h = 104 + subH + lines.length * 34 + (r.stars != null ? 60 : 0) + (r.coins ? 46 : 0) + (r.buttons.length * 70) + (r.avatar ? 124 : 0);
    h = Math.min(h, H - 40);
    var k = U.easeOutBack(Math.min(1, r.t * 3));
    var x = (W - w) / 2, y = (H - h) / 2;
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(k, k); ctx.translate(-W / 2, -H / 2);
    UI.panel(ctx, x, y, w, h, { color: r.color || '#fff8ec' });
    var cy = y + 46;
    UI.text(ctx, r.title, W / 2, cy, 34, r.titleColor || '#ff5a1f', 'center', { stroke: '#111827', strokeW: 7, maxW: w - 30 });
    cy += 44;
    if (r.sub) { UI.wrap(ctx, r.sub, W / 2, cy, w - 40, 17, '#374151', 'center', 21); cy += subH; }
    if (r.avatar) {
      AV.draw(ctx, r.avatar.look, W / 2, cy + 110, 120, { pose: r.avatar.pose, t: r.t, view: 'front' });
      cy += 124;
    }
    if (r.stars != null) {
      for (var i = 0; i < r.starsMax; i++) {
        var sk = U.easeOutBack(U.clamp((r.t - 0.3 - i * 0.25) * 3, 0, 1));
        UI.star(ctx, W / 2 + (i - (r.starsMax - 1) / 2) * 56, cy + 22, 24 * (i < r.stars ? sk : 1), i < r.stars && sk > 0);
      }
      cy += 60;
    }
    for (var j = 0; j < lines.length; j++) {
      UI.text(ctx, lines[j], W / 2, cy + 6, 20, '#1f2937', 'center', { weight: 800, maxW: w - 30 });
      cy += 34;
    }
    if (r.coins) {
      var shown = Math.min(r.coins, Math.floor(r.coins * U.clamp((r.t - 0.4) / 1.0, 0, 1)));
      if (shown !== r.lastShown) { r.lastShown = shown; if (shown > 0) A.coin(); }
      UI.coinIcon(ctx, W / 2 - 40, cy + 8, 15);
      UI.text(ctx, '+' + shown, W / 2 - 18, cy + 9, 26, '#b45309', 'left');
      cy += 46;
    }
    cy += 10;
    for (var bI = 0; bI < r.buttons.length; bI++) {
      var bt = r.buttons[bI];
      if (UI.button(ctx, 'res' + bI, x + 28, cy, w - 56, 56, bt.label, { color: bt.color || '#ff7a1a', icon: bt.icon })) {
        if (r.t > 0.4) { S.results = null; bt.action(); }
      }
      cy += 70;
    }
    ctx.restore();
  }
})();
