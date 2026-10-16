// Swish Street - the story layer (v0.3): short comic-page cutscenes drawn in code.
// The intro plays before your first Street Tour visit, a chapter plays after you beat each
// rival for the first time (the rival becomes a friend), and the finale opens Team Up.
// Every chapter can be re-read from the Story button on the map.
(function () {
  'use strict';
  var SS = window.SS, U = SS.U, D = SS.D, UI = SS.ui, A = SS.audio, AV = SS.avatar, R = SS.render, t = SS.t;
  var SC = SS.scenes;
  function save() { return SS.save.data; }

  // cast: [who, pose, x (0..1 across the panel), size (1 = normal)]; say: [castIndex, text]
  var ALL6 = ['leo', 'priya', 'kofi', 'marina', 'dj', 'anya'];
  function crowd(ids, pose) { return ids.map(function (id, i) { return [id, pose, 0.12 + i * 0.76 / Math.max(1, ids.length - 1), 0.62]; }); }
  D.STORY = [
    { id: 'intro', title: 'Chapter 1: A Ball and a Dream', panels: [
      { env: 'park', cast: [['you', 'dribble', 0.5, 1.05]], cap: 'This is you. A kid with a ball and a big dream.', sfx: 'BOUNCE!' },
      { env: 'night', cast: crowd(ALL6.concat(['champ']), 'idle'), cap: 'The best ballers in the city play the Street Tour. Seven courts. Seven rivals.' },
      { env: 'park', cast: [['you', 'idle', 0.28, 1], ['leo', 'wave', 0.72, 1]], say: [1, 'Yo, new face! This is MY park. Think you can hang?'], cap: 'First stop: Neighborhood Park.' }
    ] },
    { id: 'leo', title: 'Chapter 2: Hops', panels: [
      { env: 'park', cast: [['you', 'pump', 0.3, 1], ['leo', 'clap', 0.72, 1]], say: [1, 'You got me! That was some real hops.'], sfx: 'RESPECT!' },
      { env: 'park', cast: [['you', 'heart', 0.3, 1], ['leo', 'wave', 0.72, 1]], say: [1, 'Wanna shoot around sometime? Friends?'], cap: 'A rival... or a new friend?' },
      { env: 'gym', cast: [['priya', 'idle', 0.62, 1.05]], say: [0, 'So you beat Leo. Statistically, you will not beat me.'], cap: 'Next stop: School Gym.' }
    ] },
    { id: 'priya', title: 'Chapter 3: The Professor', panels: [
      { env: 'gym', cast: [['you', 'flex', 0.3, 1], ['priya', 'clap', 0.72, 1]], say: [1, 'Well played. You solved me.'], sfx: 'BANK!' },
      { env: 'gym', cast: [['leo', 'clap', 0.22, 0.9], ['you', 'pump', 0.5, 1], ['priya', 'wave', 0.78, 0.9]], say: [0, 'Told you this kid was good!'], cap: 'Your crew is growing.' },
      { env: 'roof', cast: [['kofi', 'idle', 0.62, 1.05]], say: [0, 'Up here, the wind decides. Ready to listen?'], cap: 'Next stop: Rooftop Sunset.' }
    ] },
    { id: 'kofi', title: 'Chapter 4: Breeze', panels: [
      { env: 'roof', cast: [['you', 'pump', 0.3, 1], ['kofi', 'clap', 0.72, 1]], say: [1, 'Respect. You read the wind like a book.'], sfx: 'WHOOSH!' },
      { env: 'roof', cast: crowd(['leo', 'priya', 'kofi'], 'wave'), say: [2, 'We are coming to watch your next game!'], cap: 'Your friends follow you across the city.' },
      { env: 'beach', cast: [['marina', 'wave', 0.62, 1.05]], say: [0, 'Surf\'s up! Can you ride MY waves?'], cap: 'Next stop: Beach Boardwalk.' }
    ] },
    { id: 'marina', title: 'Chapter 5: Wave', panels: [
      { env: 'beach', cast: [['you', 'spin', 0.3, 1], ['marina', 'clap', 0.72, 1]], say: [1, 'Totally tubular! Fair and square.'], sfx: 'SPLASH!' },
      { env: 'beach', cast: crowd(['leo', 'priya', 'kofi', 'marina'], 'clap'), say: [3, 'Next time we surf, you are coming!'], cap: 'The crowd chants your name.' },
      { env: 'subway', cast: [['dj', 'idle', 0.62, 1.05]], say: [0, 'I play to the beat. I never even look at the hoop.'], cap: 'Next stop: Subway Plaza.' }
    ] },
    { id: 'dj', title: 'Chapter 6: Echo', panels: [
      { env: 'subway', cast: [['you', 'robot', 0.3, 1], ['dj', 'clap', 0.72, 1]], say: [1, 'You dropped the mic on me!'], sfx: 'SCRATCH!' },
      { env: 'subway', cast: crowd(['leo', 'priya', 'kofi', 'marina', 'dj'], 'wave'), say: [4, 'Road trip to the snow court!'], cap: 'Every rival you beat joins your side.' },
      { env: 'snow', cast: [['anya', 'idle', 0.62, 1.05]], say: [0, 'Brr. I shoot with my eyes closed. Can you?'], cap: 'Next stop: Snowy Court.' }
    ] },
    { id: 'anya', title: 'Chapter 7: Frost', panels: [
      { env: 'snow', cast: [['you', 'bow', 0.3, 1], ['anya', 'clap', 0.72, 1]], say: [1, 'You are colder than ice. I like it.'], sfx: 'BRRR!' },
      { env: 'snow', cast: crowd(ALL6, 'clap'), say: [5, 'One court left. The Arena!'], cap: 'Your whole crew is here now.' },
      { env: 'arena', cast: [['champ', 'idle', 0.62, 1.1]], say: [0, 'Everyone is talking about you. Come show me.'], cap: 'Final stop: The Arena.' }
    ] },
    { id: 'champ', title: 'Chapter 8: Team Up', panels: [
      { env: 'arena', cast: [['you', 'flex', 0.3, 1.05], ['champ', 'clap', 0.72, 1]], say: [1, 'You did it. YOU are the Champion of Swish Street!'], sfx: 'CROWNED!' },
      { env: 'arena', cast: crowd(ALL6, 'clap'), say: [0, 'Nobody wins alone. We have your back!'], cap: 'Every rival became a friend.' },
      { env: 'arena', cast: [['leo', 'wave', 0.18, 0.85], ['you', 'pump', 0.5, 1], ['priya', 'wave', 0.82, 0.85]], say: [0, 'Pick me! Pick me!'], cap: 'TEAM UP is open! Build a crew and take on the All-Stars.' }
    ] }
  ];
  D.story = function (id) { for (var i = 0; i < D.STORY.length; i++) if (D.STORY[i].id === id) return D.STORY[i]; return null; };

  // Halftone dot pattern for the comic look (built once).
  var dots = null;
  function dotPattern(ctx) {
    if (dots) return dots;
    var c = document.createElement('canvas'); c.width = c.height = 8;
    var g = c.getContext('2d'); g.fillStyle = 'rgba(0,0,0,0.13)'; g.beginPath(); g.arc(2, 2, 1.3, 0, 7); g.arc(6, 6, 1.3, 0, 7); g.fill();
    dots = ctx.createPattern(c, 'repeat');
    return dots;
  }

  SC.comic = {
    id: 'comic', t: 0,
    enter: function (arg) {
      var s = SC.comic;
      s.ch = D.story(arg && arg.id) || D.STORY[0]; s.next = (arg && arg.next) || 'map'; s.nextArg = arg && arg.nextArg;
      s.shown = 1; s.t = 0; s.pt = 0;
      SS.save.markStory(s.ch.id);
      A.setMusic('menu', s.ch.panels[0].env === 'night' ? 'night' : s.ch.panels[0].env);
      A.page();
      speak(s);
    },
    // a tap anywhere reveals the next panel
    onDown: function () {
      var s = SC.comic;
      if (s.pt < 0.35) return;
      if (s.shown < s.ch.panels.length) { s.shown++; s.pt = 0; A.page(); speak(s); }
    },
    draw: function (ctx, W, H, dt) {
      var s = SC.comic; s.t += dt; s.pt += dt;
      ctx.fillStyle = '#fef3c7'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = dotPattern(ctx); ctx.fillRect(0, 0, W, H);
      var top = UI.safe.t + 64, bot = H - UI.safe.b - 76, left = 10 + UI.safe.l, right = W - 10 - UI.safe.r;
      UI.text(ctx, t(s.ch.title), W / 2 - 46, UI.safe.t + 36, Math.min(22, W * 0.055), '#111827', 'center', { maxW: W - 130 });
      var n = s.ch.panels.length, portrait = H >= W * 1.05, gap = 10;
      for (var i = 0; i < Math.min(s.shown, n); i++) {
        var px, py, pw, ph;
        if (portrait) { ph = (bot - top - gap * (n - 1)) / n; pw = right - left; px = left; py = top + i * (ph + gap); }
        else { pw = (right - left - gap * (n - 1)) / n; ph = bot - top; px = left + i * (pw + gap); py = top; }
        var age = i === s.shown - 1 ? s.pt : 9;
        drawPanel(ctx, s.ch.panels[i], px, py, pw, ph, age, s.t, i);
      }
      if (UI.button(ctx, 'cSkip', W - 96 - UI.safe.r, UI.safe.t + 12, 84, 44, t('Skip'), { color: '#64748b', size: 16 })) done(s);
      var bw = Math.min(W - 40, 300), by = H - UI.safe.b - 64;
      if (s.shown < n) {
        if (UI.button(ctx, 'cNext', (W - bw) / 2, by, bw, 52, t('Next'), { color: '#3b82f6', icon: 'play' }) && s.pt > 0.25) SC.comic.onDown();
      } else if (UI.button(ctx, 'cDone', (W - bw) / 2, by, bw, 52, t('Continue'), { color: '#22c55e', icon: 'play' }) && s.pt > 0.3) done(s);
    }
  };
  function speak(s) {
    var p = s.ch.panels[s.shown - 1], txt = [];
    if (p.cap) txt.push(t(p.cap));
    if (p.say) { var who = p.cast[p.say[0]][0]; txt.push((who === 'you' ? save().nick : D.RIVALS[who].short) + ': ' + t(p.say[1])); }
    if (SS.a11y) SS.a11y.say(txt.join(' '));
  }
  function done(s) { SS.go(s.next, s.nextArg); }

  function lookOf(who) { return who === 'you' ? save().avatar : D.RIVALS[who].look; }
  function drawPanel(ctx, p, x, y, w, h, age, time, idx) {
    var k = U.easeOutBack(Math.min(1, age * 3.2)), tilt = (idx % 2 ? 1 : -1) * 0.012;
    ctx.save();
    ctx.translate(x + w / 2, y + h / 2); ctx.rotate(tilt * k); ctx.scale(k, k); ctx.translate(-w / 2, -h / 2);
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(6, 7, w, h);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, w, h); ctx.clip();
    background(ctx, p.env, w, h, time);
    // layout from the top: caption, then the speech bubble, then the characters below them
    var gy = h * 0.93;
    var cw = Math.min(w - 16, 330), capH = p.cap ? UI.countLines(ctx, t(p.cap), cw - 16, 12) * 15 * (UI.big ? 1.25 : 1) + 10 : 0;
    var bw = Math.min(w * 0.62, 260), txt = p.say ? t(p.say[1]) : '';
    var bh = p.say ? UI.countLines(ctx, txt, bw - 20, 13) * 17 * (UI.big ? 1.25 : 1) + 16 : 0;
    var reserve = (p.cap ? capH + 12 : 6) + (p.say ? bh + 22 : 0);
    var chMax = Math.max(h * 0.3, gy - reserve);
    p.cast.forEach(function (c, i) {
      var ch = Math.min(Math.min(h * 0.62, w * 0.42) * c[3], chMax);
      AV.draw(ctx, lookOf(c[0]), c[2] * w, gy, ch, { view: 'front', pose: c[1], t: time + i * 0.7, shadow: true });
    });
    ctx.fillStyle = dotPattern(ctx); ctx.globalAlpha = 0.5; ctx.fillRect(0, 0, w, h); ctx.globalAlpha = 1;
    // speech bubble
    if (p.say) {
      var sp = p.cast[p.say[0]], sx = sp[2] * w, headY = gy - Math.min(Math.min(h * 0.62, w * 0.42) * sp[3], chMax);
      var bx = U.clamp(sx - bw / 2, 8, w - bw - 8), by = p.cap ? capH + 14 : 8;
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#111827'; ctx.lineWidth = 2.5;
      UI.rr(ctx, bx, by, bw, bh, 14); ctx.fill(); ctx.stroke();
      var tx = U.clamp(sx, bx + 18, bx + bw - 18);
      ctx.beginPath(); ctx.moveTo(tx - 8, by + bh - 1); ctx.lineTo(sx + (sx < w / 2 ? 4 : -4), Math.min(headY - 2, by + bh + 16)); ctx.lineTo(tx + 8, by + bh - 1); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(tx - 8, by + bh); ctx.lineTo(sx + (sx < w / 2 ? 4 : -4), Math.min(headY - 2, by + bh + 16)); ctx.lineTo(tx + 8, by + bh); ctx.stroke();
      UI.wrap(ctx, txt, bx + bw / 2, by + 8 + 8.5, bw - 20, 13, '#111827', 'center', 17);
    }
    // caption box
    if (p.cap) {
      var chh = capH;
      ctx.fillStyle = '#fde047'; ctx.strokeStyle = '#111827'; ctx.lineWidth = 2;
      ctx.fillRect(6, 6, cw, chh); ctx.strokeRect(6, 6, cw, chh);
      UI.wrap(ctx, t(p.cap), 6 + cw / 2, 6 + 5 + 7.5, cw - 16, 12, '#111827', 'center', 15);
    }
    // sound effect burst
    if (p.sfx) {
      var duo = p.cast.length > 1, fx = w * (duo ? 0.5 : 0.8), fy = h * (duo ? 0.62 : 0.45), r = Math.min(w, h) * (duo ? 0.15 : 0.2) * (1 + 0.05 * Math.sin(time * 6));
      ctx.save(); ctx.translate(fx, fy); ctx.rotate(-0.2);
      ctx.beginPath();
      for (var j = 0; j < 20; j++) { var a = j / 20 * Math.PI * 2, rr = j % 2 ? r * 0.62 : r; ctx.lineTo(Math.cos(a) * rr * 1.3, Math.sin(a) * rr * 0.8); }
      ctx.closePath(); ctx.fillStyle = '#ef4444'; ctx.fill(); ctx.strokeStyle = '#111827'; ctx.lineWidth = 3; ctx.stroke();
      UI.text(ctx, t(p.sfx), 0, 0, Math.min(22, r * 0.5), '#fde047', 'center', { stroke: '#111827', strokeW: 5, maxW: r * 2 });
      ctx.restore();
    }
    ctx.restore();
    ctx.strokeStyle = '#111827'; ctx.lineWidth = 4; ctx.strokeRect(0, 0, w, h);
    ctx.restore();
  }
  // Flat, comic-style backgrounds per court (cheap: a handful of shapes).
  function background(ctx, env, w, h, time) {
    var e = R.ENVS[env] || R.ENVS.park;
    var g = ctx.createLinearGradient(0, 0, 0, h * 0.7); g.addColorStop(0, e.sky[0]); g.addColorStop(1, e.sky[1]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    var hy = h * 0.66;
    if (e.indoor) {
      ctx.fillStyle = env === 'arena' ? '#1f2937' : '#e8e3da'; ctx.fillRect(0, 0, w, hy);
      if (env === 'arena') { ctx.fillStyle = 'rgba(255,255,220,0.12)'; ctx.beginPath(); ctx.moveTo(w * 0.3, 0); ctx.lineTo(w * 0.4, 0); ctx.lineTo(w * 0.6, hy); ctx.lineTo(w * 0.1, hy); ctx.fill(); }
      else { ctx.fillStyle = '#1d4ed8'; ctx.fillRect(0, hy * 0.55, w, hy * 0.08); }
    } else {
      // skyline / scenery silhouette
      ctx.fillStyle = env === 'snow' ? '#b8c6d8' : env === 'beach' ? '#7fb6a8' : 'rgba(30,27,75,0.35)';
      var r = U.rng(U.hashStr(env));
      for (var x = -10; x < w; ) {
        var bw = 20 + r() * 40, bh = env === 'beach' ? 6 + r() * 14 : 20 + r() * hy * 0.5;
        if (env === 'snow') { ctx.beginPath(); ctx.moveTo(x, hy); ctx.lineTo(x + bw, hy - bh); ctx.lineTo(x + bw * 2, hy); ctx.fill(); }
        else ctx.fillRect(x, hy - bh, bw - 3, bh);
        x += env === 'snow' ? bw * 1.2 : bw;
      }
      if (env === 'park' || env === 'beach') { ctx.fillStyle = '#fff7c2'; ctx.beginPath(); ctx.arc(w * 0.15, h * 0.18, Math.min(w, h) * 0.07, 0, 7); ctx.fill(); }
      if (env === 'night' || env === 'subway') { ctx.fillStyle = '#fdf6c8'; ctx.beginPath(); ctx.arc(w * 0.85, h * 0.16, Math.min(w, h) * 0.05, 0, 7); ctx.fill(); }
    }
    // court floor with perspective lines
    ctx.fillStyle = e.court; ctx.fillRect(0, hy, w, h - hy);
    ctx.strokeStyle = U.rgba(e.line.length === 7 ? e.line : '#ffffff', 0.5); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, hy + (h - hy) * 0.35); ctx.lineTo(w, hy + (h - hy) * 0.35); ctx.moveTo(w * 0.5, hy); ctx.lineTo(w * 0.35, h); ctx.stroke();
    // a hoop on the left
    var hx = w * 0.08, top = hy - h * 0.5;
    ctx.fillStyle = '#2f3542'; ctx.fillRect(hx - 3, top, 6, hy - top);
    ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fillRect(hx, top, w * 0.12, h * 0.14);
    ctx.strokeStyle = '#ff5a1f'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(hx + w * 0.11, top + h * 0.15, w * 0.04, 4, 0, 0, 7); ctx.stroke();
  }
})();
