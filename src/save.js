// Swish Street - save state (localStorage, versioned, defensively validated).
(function () {
  'use strict';
  var SS = window.SS, D = SS.D, U = SS.U;
  var KEY = 'swishstreet.save';
  // v1: first release. v2: rivals store a respect level (0-3) instead of true, gear category,
  // Buzzer Beater / Dunk Fest bests, Champion flag, left-handed and big-text settings.
  // v3: Trick Shot Hall (tricks), ball trails, story chapters seen, Team Up crew and relay bests.
  // v4: Aim Assist setting, signature celebration combo, pass-and-play friend look and versus
  //     setup, weekly Street Event progress (event reward items live in the owned lists).
  // v5: career record for the Trophy Room (trophies already paid, lifetime event medals, best
  //     streak, Around the World trips, photos taken) and the Swish Cam frame and sticker.
  var VERSION = 5;
  var FRAMES = ['polaroid', 'comic', 'neon', 'card'];
  var STICKERS = ['none', 'star', 'crown', 'flame', 'heart', 'splash'];
  var ASSISTS = ['easy', 'normal', 'pro'];
  var CATS = D.GEAR_CATS;
  var RELAY_IDS = ['rush', 'twist', 'show'];

  function defaults() {
    return {
      v: VERSION,
      coins: 0,
      tutorialDone: false,
      nick: 'Swift Comet',
      avatar: { skin: 2, hair: 'short', hairColor: 0, jersey: 'orange', shoes: 'white', ball: 'classic', celebration: 'pump', number: 1, gear: 'none', trail: 'none' },
      owned: { hair: [], jersey: [], shoes: [], ball: [], celebration: [], gear: [], trail: [] },
      tricks: {},       // trickId -> times landed (1+ = discovered)
      story: [],        // story chapter ids already seen
      crew: [],         // up to 2 rival ids picked for Team Up
      relay: { rush: 0, twist: 0, show: 0 },      // best score per relay challenge
      relayStars: { rush: 0, twist: 0, show: 0 },
      stars: {},        // courtId -> [bool,bool,bool]
      rivals: {},       // rivalId -> respect level 1..3 (times beaten on the ladder)
      quickBest: 0,
      buzzerBest: 0,
      dunkBest: 0,
      champion: false,
      daily: { date: '', best: 0, played: 0, allBest: 0 },
      stats: { shots: 0, makes: 0, swishes: 0, banks: 0, dunks: 0, heaves: 0 },
      settings: { sound: true, music: true, reduced: false, lefty: false, bigText: false, assist: 'normal' },
      combo: { on: false, moves: ['pump', 'pump', 'pump'], fx: 'confetti', line: 0 },
      friend: { preset: 0, skin: -1, hair: '', nick: 'Lucky Otter' },
      vs: { game: 'horse', court: 'park', a1: 'normal', a2: 'normal', played: 0 },
      event: { week: '', best: 0, tier: 0, played: 0 },
      career: { seen: [], golds: 0, medals: 0, bestStreak: 0, world: 0, photos: 0 },
      photo: { frame: 'polaroid', sticker: 'none' }
    };
  }

  // Upgrade older saves in place before validation.
  function migrate(raw) {
    if (!raw.v || raw.v < 2) {
      if (raw.rivals && typeof raw.rivals === 'object') {
        Object.keys(raw.rivals).forEach(function (id) { if (raw.rivals[id] === true) raw.rivals[id] = 1; });
      }
      raw.v = 2;
    }
    if (raw.v < 3) {
      // v2 -> v3 only adds new fields; defaults fill them in during validation.
      raw.v = 3;
    }
    if (raw.v < 4) {
      // v3 -> v4: new fields only (assist, combo, friend, vs, event). If a v3 player had a
      // celebration equipped, start their combo with it so the editor feels familiar.
      var cel = raw.avatar && typeof raw.avatar.celebration === 'string' ? raw.avatar.celebration : 'pump';
      if (!raw.combo) raw.combo = { on: false, moves: [cel, cel, cel], fx: 'confetti', line: 0 };
      raw.v = 4;
    }
    if (raw.v < 5) {
      // v4 -> v5: start the career record from what we already know. Every event prize you own
      // was a gold medal, and this week's medals count too.
      var golds = 0, ow = raw.owned || {};
      D.GEAR_CATS.forEach(function (cat) {
        if (!Array.isArray(ow[cat])) return;
        ow[cat].forEach(function (id) { var it = D.item(cat, id); if (it && it.id === id && it.event) golds++; });
      });
      var tier = raw.event && Number(raw.event.tier) > 0 ? Math.min(3, Number(raw.event.tier) | 0) : 0;
      if (!raw.career) raw.career = { seen: [], golds: Math.max(golds, tier >= 3 ? 1 : 0), medals: Math.max(tier, golds * 3), bestStreak: 0, world: 0, photos: 0 };
      raw.v = 5;
    }
    return raw;
  }
  // Items earned by play (court jerseys, ball trails) are owned when their condition is met.
  function earned(d, it) {
    if (it.court) { var s = d.stars[it.court]; return !!(s && s[0] && s[1] && s[2]); }
    if (it.tricks) return trickCount(d) >= it.tricks;
    return false;
  }
  function trickCount(d) { var n = 0; for (var k in d.tricks) if (d.tricks[k] > 0) n++; return n; }
  function ownsIn(d, cat, id) {
    var it = D.item(cat, id);
    if (it.court || it.tricks) return earned(d, it);
    return (it.cost === 0 && !it.reward && !it.event) || d.owned[cat].indexOf(id) >= 0;
  }

  function int(v, lo, hi, dflt) {
    v = Number(v);
    if (!isFinite(v)) return dflt;
    return U.clamp(Math.floor(v), lo, hi);
  }
  function bool(v, dflt) { return typeof v === 'boolean' ? v : dflt; }
  function inList(cat, id, dflt) {
    var list = D.ITEMS[cat];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return id;
    return dflt;
  }

  function validate(raw) {
    var d = defaults();
    if (!raw || typeof raw !== 'object') return d;
    raw = migrate(raw);
    d.coins = int(raw.coins, 0, 9999999, 0);
    d.tutorialDone = bool(raw.tutorialDone, false);
    if (typeof raw.nick === 'string' && raw.nick.length < 40 && /^[A-Za-z ]+$/.test(raw.nick)) d.nick = raw.nick;
    var a = raw.avatar || {};
    d.avatar.skin = int(a.skin, 0, D.SKINS.length - 1, d.avatar.skin);
    d.avatar.hairColor = int(a.hairColor, 0, D.HAIR_COLORS.length - 1, 0);
    d.avatar.number = int(a.number, 0, 99, 1);
    CATS.forEach(function (cat) {
      d.avatar[cat] = inList(cat, a[cat], d.avatar[cat]);
      var o = raw.owned && raw.owned[cat];
      if (Array.isArray(o)) {
        d.owned[cat] = o.filter(function (id, i) {
          return typeof id === 'string' && inList(cat, id, null) === id && o.indexOf(id) === i;
        });
      }
    });
    if (raw.stars && typeof raw.stars === 'object') {
      D.COURTS.forEach(function (c) {
        var s = raw.stars[c.id];
        if (Array.isArray(s)) d.stars[c.id] = [!!s[0], !!s[1], !!s[2]];
      });
    }
    if (raw.tricks && typeof raw.tricks === 'object') {
      D.TRICKS.forEach(function (tk) { var n = int(raw.tricks[tk.id], 0, 999999, 0); if (n > 0) d.tricks[tk.id] = n; });
    }
    // equipped paid, reward or earned items must be owned
    CATS.forEach(function (cat) {
      if (!ownsIn(d, cat, d.avatar[cat])) d.avatar[cat] = D.ITEMS[cat][0].id;
    });
    if (Array.isArray(raw.story)) {
      d.story = raw.story.filter(function (id, i) { return typeof id === 'string' && /^[a-z]{2,10}$/.test(id) && raw.story.indexOf(id) === i; }).slice(0, 20);
    }
    if (raw.rivals && typeof raw.rivals === 'object') {
      Object.keys(D.RIVALS).forEach(function (id) {
        var lv = int(raw.rivals[id], 0, 3, 0);
        if (lv > 0) d.rivals[id] = lv;
      });
    }
    d.quickBest = int(raw.quickBest, 0, 99999, 0);
    d.buzzerBest = int(raw.buzzerBest, 0, 99, 0);
    d.dunkBest = int(raw.dunkBest, 0, 999, 0);
    d.champion = bool(raw.champion, false) && d.rivals.champ > 0;
    if (Array.isArray(raw.crew)) {
      d.crew = raw.crew.filter(function (id, i) { return D.CREW[id] && d.rivals[id] > 0 && raw.crew.indexOf(id) === i; }).slice(0, 2);
    }
    var rl = raw.relay || {}, rs = raw.relayStars || {};
    RELAY_IDS.forEach(function (k) { d.relay[k] = int(rl[k], 0, 9999, 0); d.relayStars[k] = int(rs[k], 0, 3, 0); });
    var dl = raw.daily || {};
    d.daily.date = typeof dl.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dl.date) ? dl.date : '';
    d.daily.best = int(dl.best, 0, 999999, 0);
    d.daily.played = int(dl.played, 0, 999, 0);
    d.daily.allBest = int(dl.allBest, 0, 999999, 0);
    var st = raw.stats || {};
    Object.keys(d.stats).forEach(function (k) { d.stats[k] = int(st[k], 0, 1e9, 0); });
    var se = raw.settings || {};
    d.settings.sound = bool(se.sound, true);
    d.settings.music = bool(se.music, true);
    d.settings.reduced = bool(se.reduced, false);
    d.settings.lefty = bool(se.lefty, false);
    d.settings.bigText = bool(se.bigText, false);
    d.settings.assist = ASSISTS.indexOf(se.assist) >= 0 ? se.assist : 'normal';
    // signature combo: moves must be celebrations you own
    var cb = raw.combo || {};
    d.combo.on = bool(cb.on, false);
    if (Array.isArray(cb.moves)) {
      d.combo.moves = [0, 1, 2].map(function (i) {
        var id = inList('celebration', cb.moves[i], 'pump');
        return ownsIn(d, 'celebration', id) ? id : 'pump';
      });
    }
    d.combo.fx = D.COMBO_FX.some(function (f) { return f.id === cb.fx; }) ? cb.fx : 'confetti';
    d.combo.line = int(cb.line, 0, D.COMBO_LINES.length - 1, 0);
    // pass-and-play friend (presets only, no typed names)
    var fr = raw.friend || {};
    d.friend.preset = int(fr.preset, 0, D.FRIENDS.length - 1, 0);
    d.friend.skin = int(fr.skin, -1, D.SKINS.length - 1, -1);
    d.friend.hair = D.FREE_HAIR.indexOf(fr.hair) >= 0 ? fr.hair : '';
    if (typeof fr.nick === 'string' && fr.nick.length < 40 && /^[A-Za-z ]+$/.test(fr.nick)) d.friend.nick = fr.nick;
    var vs = raw.vs || {};
    d.vs.game = vs.game === 'shoot' || vs.game === 'world' ? vs.game : 'horse';
    d.vs.court = (D.courtById(vs.court) || vs.court === 'night') ? vs.court : 'park';
    d.vs.a1 = ASSISTS.indexOf(vs.a1) >= 0 ? vs.a1 : 'normal';
    d.vs.a2 = ASSISTS.indexOf(vs.a2) >= 0 ? vs.a2 : 'normal';
    d.vs.played = int(vs.played, 0, 1e6, 0);
    // weekly Street Event progress (week key like 2026-W42)
    var ev = raw.event || {};
    d.event.week = typeof ev.week === 'string' && /^\d{4}-W\d{2}$/.test(ev.week) ? ev.week : '';
    d.event.best = int(ev.best, 0, 99999, 0);
    d.event.tier = int(ev.tier, 0, 3, 0);
    d.event.played = int(ev.played, 0, 99999, 0);
    // career record (v5)
    var cr = raw.career || {};
    if (Array.isArray(cr.seen)) {
      d.career.seen = cr.seen.filter(function (id, i) { return typeof id === 'string' && /^[a-z0-9]{2,16}$/.test(id) && cr.seen.indexOf(id) === i; }).slice(0, 64);
    }
    d.career.golds = int(cr.golds, 0, 9999, 0);
    d.career.medals = int(cr.medals, 0, 99999, 0);
    d.career.bestStreak = int(cr.bestStreak, 0, 9999, 0);
    d.career.world = int(cr.world, 0, 99999, 0);
    d.career.photos = int(cr.photos, 0, 999999, 0);
    var ph = raw.photo || {};
    d.photo.frame = FRAMES.indexOf(ph.frame) >= 0 ? ph.frame : 'polaroid';
    d.photo.sticker = STICKERS.indexOf(ph.sticker) >= 0 ? ph.sticker : 'none';
    return d;
  }

  var S = (SS.save = {
    data: defaults(),
    load: function () {
      var raw = null;
      try { raw = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { raw = null; }
      S.data = validate(raw);
      return S.data;
    },
    write: function () {
      var json = JSON.stringify(S.data);
      try { localStorage.setItem(KEY, json); } catch (e) { /* storage full or blocked: keep playing */ }
      if (SS.native) SS.native.persist(KEY, json);
    },
    reset: function () {
      var keepSettings = S.data.settings;
      S.data = defaults();
      S.data.settings = keepSettings;
      S.write();
    },
    addCoins: function (n) { S.data.coins = U.clamp(S.data.coins + Math.max(0, n | 0), 0, 9999999); S.write(); },
    owns: function (cat, id) { return ownsIn(S.data, cat, id); },
    trickCount: function () { return trickCount(S.data); },
    // Record a landed trick. Returns true the first time (a discovery).
    addTrick: function (id) {
      if (!D.trick(id)) return false;
      var first = !S.data.tricks[id];
      S.data.tricks[id] = Math.min(999999, (S.data.tricks[id] || 0) + 1);
      S.write();
      return first;
    },
    sawStory: function (id) { return S.data.story.indexOf(id) >= 0; },
    markStory: function (id) { if (!S.sawStory(id)) { S.data.story.push(id); S.write(); } },
    // Give a reward item (no coins). Returns true if it was new.
    grant: function (cat, id) {
      if (S.data.owned[cat].indexOf(id) >= 0) return false;
      S.data.owned[cat].push(id); S.write(); return true;
    },
    rivalLevel: function (id) { return S.data.rivals[id] || 0; },
    buy: function (cat, id) {
      var it = D.item(cat, id);
      if (S.owns(cat, id)) return true;
      if (it.reward || it.court || it.tricks || it.event) return false;
      if (S.data.coins < it.cost) return false;
      S.data.coins -= it.cost;
      S.data.owned[cat].push(id);
      S.write();
      return true;
    },
    courtStars: function (id) { return S.data.stars[id] || [false, false, false]; },
    starCount: function (id) { var s = S.courtStars(id); return (s[0] ? 1 : 0) + (s[1] ? 1 : 0) + (s[2] ? 1 : 0); },
    totalStars: function () {
      var n = 0; D.COURTS.forEach(function (c) { n += S.starCount(c.id); }); return n;
    },
    setStar: function (courtId, idx) {
      var s = S.courtStars(courtId).slice();
      var was = s[idx];
      s[idx] = true; S.data.stars[courtId] = s; S.write();
      return !was;
    },
    courtUnlocked: function (idx) {
      var c = D.COURTS[idx];
      if (!c || !c.built) return false;
      if (idx === 0) return true;
      var prev = D.COURTS[idx - 1];
      return !!S.data.rivals[prev.rival];
    },
    rivalUnlocked: function (courtId) { return S.starCount(courtId) >= 2; },
    _validate: validate,
    KEY: KEY
  });
})();
