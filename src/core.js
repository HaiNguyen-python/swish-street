// Swish Street - core namespace, translation helper and small utilities.
// Classic script: everything hangs off window.SS.
(function () {
  'use strict';
  var SS = (window.SS = window.SS || {});
  SS.VERSION = '0.5.0';

  // ---------- Translation ----------
  // All player-facing text goes through SS.t(). English only for now:
  // to translate, fill SS.lang[code] = { "English text": "Translated" } and set SS.locale.
  SS.lang = {};
  SS.locale = 'en';
  SS.t = function (str, vars) {
    var table = SS.lang[SS.locale];
    var out = (table && table[str]) || str;
    if (vars) {
      out = out.replace(/\{(\w+)\}/g, function (m, k) {
        return vars[k] !== undefined ? String(vars[k]) : m;
      });
    }
    return out;
  };

  // ---------- Math helpers ----------
  var U = (SS.U = {});
  U.clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  U.lerp = function (a, b, t) { return a + (b - a) * t; };
  U.inv = function (a, b, v) { return b === a ? 0 : (v - a) / (b - a); };
  U.smooth = function (t) { t = U.clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  U.easeOutBack = function (t) {
    t = U.clamp(t, 0, 1); var c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  };
  U.easeOutCubic = function (t) { t = U.clamp(t, 0, 1); return 1 - Math.pow(1 - t, 3); };
  U.easeInOut = function (t) { t = U.clamp(t, 0, 1); return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; };
  U.damp = function (a, b, rate, dt) { return b + (a - b) * Math.exp(-rate * dt); };
  U.rand = function (a, b) { return a + Math.random() * (b - a); };
  U.pick = function (arr) { return arr[(Math.random() * arr.length) | 0]; };
  U.deg = Math.PI / 180;

  // Seeded RNG (mulberry32) - used by Daily Challenge so everyone gets the same day.
  U.rng = function (seed) {
    var a = seed >>> 0;
    var f = function () {
      a = (a + 0x6d2b79f5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    f.range = function (lo, hi) { return lo + f() * (hi - lo); };
    f.pick = function (arr) { return arr[Math.floor(f() * arr.length)]; };
    return f;
  };
  // Gaussian-ish noise (sum of uniforms), mean 0, sd ~1
  U.gauss = function (r) {
    r = r || Math.random;
    return (r() + r() + r() + r() - 2) * 1.7320508;
  };

  U.todayKey = function (d) {
    d = d || new Date();
    var m = d.getMonth() + 1, day = d.getDate();
    return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
  };
  U.hashStr = function (s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  };

  // Colour helpers
  U.shade = function (hex, amt) {
    // amt -1..1 : darken / lighten
    var c = hex.replace('#', '');
    if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
    var r = parseInt(c.substr(0, 2), 16), g = parseInt(c.substr(2, 2), 16), b = parseInt(c.substr(4, 2), 16);
    var tgt = amt < 0 ? 0 : 255, p = Math.abs(amt);
    r = Math.round(r + (tgt - r) * p); g = Math.round(g + (tgt - g) * p); b = Math.round(b + (tgt - b) * p);
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  };
  U.rgba = function (hex, a) {
    var c = hex.replace('#', '');
    if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
    return 'rgba(' + parseInt(c.substr(0, 2), 16) + ',' + parseInt(c.substr(2, 2), 16) + ',' + parseInt(c.substr(4, 2), 16) + ',' + a + ')';
  };

  SS.FONT = '"Arial Rounded MT Bold","Trebuchet MS","Segoe UI",system-ui,-apple-system,sans-serif';
})();
