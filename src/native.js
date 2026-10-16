// Swish Street - native iOS extras through Capacitor. Every call is a safe no-op in a browser.
(function () {
  'use strict';
  var SS = window.SS;
  var cap = window.Capacitor;
  var isNative = !!(cap && cap.isNativePlatform && cap.isNativePlatform());
  function plugin(name) { return (isNative && cap.Plugins && cap.Plugins[name]) || null; }
  function quiet(p) { if (p && p.catch) p.catch(function () {}); }

  SS.native = {
    isNative: isNative,
    // iOS can clear web storage when space is low, so saves are mirrored in native Preferences.
    restore: function (key) {
      var prefs = plugin('Preferences');
      if (!prefs) return Promise.resolve();
      var has = false;
      try { has = !!localStorage.getItem(key); } catch (e) {}
      if (has) return Promise.resolve();
      return prefs.get({ key: key }).then(function (r) {
        if (r && r.value) { try { localStorage.setItem(key, r.value); } catch (e) {} }
      }).catch(function () {});
    },
    persist: function (key, json) {
      var prefs = plugin('Preferences');
      if (prefs) quiet(prefs.set({ key: key, value: json }));
    },
    // kind: 'light' | 'medium' | 'heavy' | 'success'
    haptic: function (kind) {
      var h = plugin('Haptics');
      if (!h || (SS.save && SS.save.data.settings.reduced)) return;
      try {
        if (kind === 'success') quiet(h.notification({ type: 'SUCCESS' }));
        else quiet(h.impact({ style: kind.toUpperCase() }));
      } catch (e) {}
    },
    ready: function () {
      var s = plugin('SplashScreen');
      if (s) quiet(s.hide({ fadeOutDuration: 300 }));
    }
  };
})();
