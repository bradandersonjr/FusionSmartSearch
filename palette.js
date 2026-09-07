/* AIW palette runtime: the Fusion bridge, theme, and toast.
 *
 * CANONICAL COPY: _templates/palette/palette.js
 * Vendored per add-in like lib/fusionAddInUtils. Never edit this file inside a
 * project -- change the canonical copy and re-vendor, so drift stays
 * detectable by _tools/palette_check.py.
 *
 * Everything here was extracted from a working palette rather than written
 * fresh. The bridge probe in particular encodes a bug that cost real debugging
 * time; see bridge() below.
 *
 * Provides, as globals:
 *   AIW.send(action, data)      -> Python, returns false if the bridge is down
 *   AIW.onReady(fn)             run fn once Fusion has answered
 *   AIW.toast(message, kind)    'info' | 'success' | 'error'
 *   AIW.setTheme(name)          'light' | 'dark-blue' | 'dark-gray'
 *   AIW.escapeHtml(value)
 *
 * Python reaches JS through sendInfoToHTML(action, json), which invokes
 * window[action](json). Define those handlers in your own script.
 */

'use strict';

var AIW = (function () {
  var readyTimer = null;
  var readyFired = false;
  var readyCallbacks = [];
  var toastTimer = null;

  /* ── Bridge ─────────────────────────────────────────────────────────── */

  /* Fusion injects `adsk` into the page's script scope. It is NOT reliably a
   * property of `window`, so testing window.adsk reports "no bridge" while
   * adsk.fusionSendData is perfectly callable -- a palette that renders fine
   * and can never talk to Python. Probe the bare identifier through typeof,
   * which is the only form that does not throw on an undeclared name. */
  function bridge() {
    try {
      if (typeof adsk !== 'undefined' && adsk && adsk.fusionSendData) {
        return adsk;
      }
    } catch (e) { /* not defined yet */ }

    try {
      if (window.adsk && window.adsk.fusionSendData) { return window.adsk; }
    } catch (e) { /* ignore */ }

    return null;
  }

  function send(action, data) {
    var api = bridge();
    if (!api) { return false; }

    api.fusionSendData(action, JSON.stringify(data || {}));
    return true;
  }

  /* ── Ready handshake ────────────────────────────────────────────────── */

  /* sendInfoToHTML before the page's JS has loaded is silently dropped, so
   * Python waits to be told the page exists. `adsk` can also appear after this
   * script parses, so a single fire-and-forget announcement can be lost with
   * nothing to retry it -- hence the poll. */
  function announceReady() {
    return send('ready', {});
  }

  function stopPolling() {
    if (readyTimer) {
      clearInterval(readyTimer);
      readyTimer = null;
    }
  }

  /* Called by the page once Python answers, which is what proves the bridge
   * is live in both directions. */
  function markReady() {
    if (readyFired) { return; }

    readyFired = true;
    stopPolling();

    while (readyCallbacks.length) {
      try {
        readyCallbacks.shift()();
      } catch (e) {
        /* One bad callback must not strand the rest. */
      }
    }
  }

  function onReady(fn) {
    if (readyFired) {
      fn();
      return;
    }
    readyCallbacks.push(fn);
  }

  function startPolling() {
    if (readyTimer || readyFired) { return; }

    announceReady();
    readyTimer = setInterval(function () {
      if (readyFired) {
        stopPolling();
        return;
      }
      announceReady();
    }, 250);

    /* Give up rather than polling for the life of the palette. A blank panel
     * with no explanation is the worst possible failure, so say so. */
    setTimeout(function () {
      if (readyFired) { return; }

      stopPolling();
      var host = document.querySelector('[data-aiw-content]');
      if (host && !host.innerHTML.trim()) {
        host.innerHTML =
          '<div class="aiw-empty"><b>Could not reach Fusion.</b><br>' +
          'The page loaded but the Fusion bridge never appeared. Close the ' +
          'palette and open it again; if it keeps happening, check ' +
          'View → Show Text Commands.</div>';
      }
    }, 10000);
  }

  /* ── Theme ──────────────────────────────────────────────────────────── */

  /* Python stamps data-theme onto <html> before the page loads, so the first
   * paint is already correct. This is the fallback for a palette that gets its
   * theme in a message instead, and the guarantee that an unstamped page still
   * renders rather than sitting unstyled.
   *
   * Fusion has three themes and all three are distinct: Light Gray, Dark Blue,
   * and the hidden Dark Gray. Collapsing anything non-light to 'dark' makes
   * Dark Gray render with Dark Blue's colours -- a visible mismatch, not a
   * rounding error. */
  var THEMES = ['light', 'dark-blue', 'dark-gray'];
  var DEFAULT_THEME = 'dark-blue';

  function setTheme(name) {
    var theme = (THEMES.indexOf(name) >= 0) ? name : DEFAULT_THEME;
    document.documentElement.setAttribute('data-theme', theme);
    return theme;
  }

  function initTheme() {
    var current = document.documentElement.getAttribute('data-theme');
    if (THEMES.indexOf(current) < 0) {
      setTheme(DEFAULT_THEME);
    }
  }

  /* ── Toast ──────────────────────────────────────────────────────────── */

  function toast(message, kind) {
    var node = document.getElementById('aiw-toast');
    if (!node) { return; }

    node.textContent = message;
    node.className = 'aiw-toast is-shown aiw-toast--' + (kind || 'info');

    if (toastTimer) { clearTimeout(toastTimer); }
    toastTimer = setTimeout(function () {
      node.className = 'aiw-toast aiw-toast--' + (kind || 'info');
    }, 3200);
  }

  /* ── Helpers ────────────────────────────────────────────────────────── */

  function escapeHtml(value) {
    return String(value === null || value === undefined ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ── Wiring ─────────────────────────────────────────────────────────── */

  /* One delegated handler for every external link, so a palette never spells
   * out its own onclick and never navigates away from itself. */
  document.addEventListener('click', function (event) {
    var target = event.target.closest ? event.target.closest('[data-url]') : null;
    if (!target) { return; }

    event.preventDefault();
    var url = target.getAttribute('data-url');
    if (url && url.indexOf('https://') === 0) {
      send('openUrl', { url: url });
    }
  });

  initTheme();

  if (document.readyState === 'complete') {
    startPolling();
  } else {
    window.addEventListener('load', startPolling);
  }

  return {
    send: send,
    bridge: bridge,
    onReady: onReady,
    markReady: markReady,
    setTheme: setTheme,
    toast: toast,
    escapeHtml: escapeHtml
  };
}());

/* Fusion's documented receive hook. Palettes here have historically relied on
 * bare window.<action> globals instead, so both are supported: this routes one
 * into the other. Returning a string is what Fusion expects. */
window.fusionJavaScriptHandler = {
  handle: function (action, data) {
    try {
      var fn = window[action];
      if (typeof fn === 'function') { fn(data); }
    } catch (e) {
      return 'FAILED: ' + e;
    }
    return 'OK';
  }
};
