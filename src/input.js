// Swish Street - pointer input (touch + mouse). UI buttons get first pick; otherwise the
// active scene receives down/move/up for the shooting gesture.
(function () {
  'use strict';
  var SS = window.SS, UI = SS.ui;
  var IN = (SS.input = { active: null, x: 0, y: 0, down: false });

  function pos(e) {
    var r = SS.canvas.getBoundingClientRect();
    var k = UI.k || 1; // convert to UI points
    return { x: (e.clientX - r.left) / k, y: (e.clientY - r.top) / k, t: performance.now() };
  }
  IN.attach = function (canvas) {
    canvas.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      SS.audio.unlock();
      if (IN.active !== null) return; // one finger at a time
      IN.active = e.pointerId;
      try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
      var p = pos(e); IN.x = p.x; IN.y = p.y; IN.down = true;
      var hit = UI.hit(p.x, p.y);
      if (hit) { UI.pressed = hit.id; UI.pressRect = hit; return; }
      UI.pressed = null;
      var sc = SS.scene;
      if (sc && sc.onDown) sc.onDown(p);
    }, { passive: false });
    canvas.addEventListener('pointermove', function (e) {
      if (e.pointerId !== IN.active) return;
      e.preventDefault();
      var p = pos(e); IN.x = p.x; IN.y = p.y;
      if (UI.pressed) return;
      var sc = SS.scene;
      if (sc && sc.onMove) sc.onMove(p);
    }, { passive: false });
    function up(e, cancel) {
      if (e.pointerId !== IN.active) return;
      IN.active = null; IN.down = false;
      var p = pos(e);
      if (UI.pressed) {
        var r = UI.pressRect;
        if (!cancel && r && p.x >= r.x - 10 && p.x <= r.x + r.w + 10 && p.y >= r.y - 10 && p.y <= r.y + r.h + 10) {
          UI.clicked = UI.pressed;
          if (UI.pressed !== 'blocker') SS.audio.click();
        }
        UI.pressed = null; return;
      }
      var sc = SS.scene;
      if (sc && sc.onUp) sc.onUp(p, cancel);
    }
    canvas.addEventListener('pointerup', function (e) { up(e, false); });
    canvas.addEventListener('pointercancel', function (e) { up(e, true); });
    canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    window.addEventListener('keydown', function (e) {
      var sc = SS.scene;
      if (sc && sc.onKey) sc.onKey(e.key);
    });
  };
})();
