/* BUS — one-line pub/sub between every screen of the installation.
 * Delivers each message over all of:
 *   - BroadcastChannel  (tabs/windows/iframes of the same browser profile)
 *   - localStorage      (fallback for older browsers, same profile)
 *   - the server's SSE relay (/events + POST /bus) when served by server.js —
 *     this is what lets separate Chrome kiosk windows or other PCs on the LAN stay in sync.
 * Messages are de-duplicated by id, so receiving the same one twice is harmless.
 * Add ?sync=local to a page URL to skip the server path. */
(function () {
  "use strict";
  var CH = "altitude-test";
  var id = Math.random().toString(36).slice(2, 10);
  var seq = 0;
  var seen = [], SEEN_MAX = 300;
  var listeners = [];
  var qs = new URLSearchParams(location.search);
  var chan = ("BroadcastChannel" in window) ? new BroadcastChannel(CH) : null;
  var sse = null, sseReady = false;

  function handle(raw) {
    var m = raw;
    if (typeof raw === "string") { try { m = JSON.parse(raw); } catch (e) { return; } }
    if (!m || !m._id || m._src === id) return;
    if (seen.indexOf(m._id) >= 0) return;
    seen.push(m._id); if (seen.length > SEEN_MAX) seen.shift();
    for (var i = 0; i < listeners.length; i++) { try { listeners[i](m); } catch (e) { console.error(e); } }
  }

  if (chan) chan.onmessage = function (e) { handle(e.data); };
  window.addEventListener("storage", function (e) { if (e.key === "altitude.bus" && e.newValue) handle(e.newValue); });

  if (/^https?:$/.test(location.protocol) && qs.get("sync") !== "local" && "EventSource" in window) {
    try {
      sse = new EventSource("/events");
      sse.onopen = function () { sseReady = true; document.documentElement.setAttribute("data-sync", "server"); };
      sse.onmessage = function (e) { handle(e.data); };
      sse.onerror = function () { if (!sseReady && sse) { sse.close(); sse = null; } }; // static host: no relay, stay local
    } catch (e) { sse = null; }
  }

  function emit(msg) {
    msg._id = id + ":" + (++seq); msg._src = id; msg._ts = Date.now();
    var s = JSON.stringify(msg);
    try { if (chan) chan.postMessage(msg); } catch (e) {}
    try { localStorage.setItem("altitude.bus", s); } catch (e) {}
    if (sseReady) {
      try { fetch("/bus", { method: "POST", headers: { "Content-Type": "application/json" }, body: s, keepalive: true }).catch(function () {}); } catch (e) {}
    }
  }

  window.BUS = {
    id: id,
    emit: emit,
    on: function (fn) { listeners.push(fn); return function () { listeners = listeners.filter(function (f) { return f !== fn; }); }; },
    get server() { return sseReady; }
  };
})();
