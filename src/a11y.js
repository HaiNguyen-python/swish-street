// Swish Street - screen reader support (v0.3).
// The game draws everything on a canvas, which VoiceOver cannot see. This keeps an invisible
// layer of real <button>s positioned over the canvas buttons (labels come from the UI calls),
// plus a polite live region that reads out call-outs, toasts and results.
// The layer never takes touches (pointer-events: none), so normal play is unchanged:
// a VoiceOver double-tap lands on the canvas button underneath, and keyboard / switch
// users can Tab to a button and press Enter.
(function () {
  'use strict';
  var SS = window.SS;
  var AY = (SS.a11y = {});
  var layer = null, live = null, list = [], els = {}, lastSync = 0, lastSaid = '', saidT = 0;

  AY.init = function () {
    layer = document.getElementById('a11y');
    live = document.getElementById('live');
  };
  AY.begin = function () { list = []; };
  AY.note = function (id, label, x, y, w, h, dis) {
    if (!layer || typeof label !== 'string' || !label) return;
    list.push({ id: id, label: label, x: x, y: y, w: w, h: h, dis: dis });
  };
  // Speak a short message (debounced so the same line is not repeated).
  AY.say = function (text) {
    if (!live || !text) return;
    var now = performance.now();
    if (text === lastSaid && now - saidT < 2500) return;
    lastSaid = text; saidT = now;
    live.textContent = String(text);
  };
  AY.end = function () {
    if (!layer) return;
    var now = performance.now();
    if (now - lastSync < 250) return;
    lastSync = now;
    var k = SS.ui.k || 1, seen = {};
    for (var i = 0; i < list.length; i++) {
      var it = list[i], el = els[it.id];
      if (seen[it.id]) continue;
      seen[it.id] = 1;
      if (!el) {
        el = document.createElement('button');
        el.type = 'button';
        el.dataset.id = it.id;
        el.addEventListener('click', onClick);
        layer.appendChild(el);
        els[it.id] = el;
      }
      if (el.getAttribute('aria-label') !== it.label) el.setAttribute('aria-label', it.label);
      el.disabled = !!it.dis;
      var st = el.style;
      st.left = Math.round(it.x * k) + 'px'; st.top = Math.round(it.y * k) + 'px';
      st.width = Math.round(it.w * k) + 'px'; st.height = Math.round(it.h * k) + 'px';
    }
    Object.keys(els).forEach(function (id) {
      if (!seen[id]) { var e = els[id]; if (e.parentNode) e.parentNode.removeChild(e); delete els[id]; }
    });
  };
  function onClick(e) {
    var id = e.currentTarget.dataset.id;
    if (!id) return;
    SS.ui.clicked = id;
    if (SS.audio) SS.audio.click();
  }
  AY.count = function () { return Object.keys(els).length; };
})();
