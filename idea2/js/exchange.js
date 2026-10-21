/* Altitude Exchange — Idea 2: the coin-to-miles kiosk with a real coin analyzer (idea2/index.html).
 *
 * Portrait screen, designed at 1080×1414 like the deck's kiosk mock-up and scaled to fit. A camera looks into the
 * tray; on start the kiosk photographs the coins and the coin analyzer (/api/analyze-coins → lib/coin-analyzer.mjs,
 * Claude vision) says which coins are there. The kiosk values them with idea2/js/config.js. Flow, after the deck:
 *   start → scanning → detect (countries) → currencies (amount = pesos) → total (FX cost, Altitude vs other)
 *   → converting → miles → receipt (redemption code) → start
 * No camera? Use a photo (phones offer their camera) or the deck's sample tray — both go through the same analyzer. */
(function () {
  "use strict";
  var C = window.EXCHANGE_CONFIG, X = C.exchange, T = X.timing;
  var stage = document.getElementById("stage"), panel = document.getElementById("panel");
  var heading = document.getElementById("heading"), printer = document.getElementById("printer");
  function $(s, el) { return (el || document).querySelector(s); }
  function $$(s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function now() { return Date.now(); }
  function uid() { return now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function round2(n) { return Math.round(n * 100) / 100; }
  function num(n, d) { return n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d }); }
  function peso(n) { return "₱" + num(n, 2); }
  function pct(f) { return +(f * 100).toFixed(2) + "%"; }
  function amount(code, v) { var c = C.currencies[code]; return ((c && c.sign) || "") + (Number.isInteger(v) ? num(v, 0) : num(v, 2)); }
  function board(s) { return String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase(); }   // no accents on the dot-matrix

  var settings = Store.settings();
  var timers = {};
  function after(k, ms, fn) { clearTimeout(timers[k]); timers[k] = setTimeout(fn, ms); }
  function clearTimers() { Object.keys(timers).forEach(function (k) { clearTimeout(timers[k]); }); timers = {}; }

  // ---------------------------------------------------------------- state
  var scans = 0;                                          // a reply from an abandoned scan is ignored
  function blank() { return { phase: "start", result: null, error: null, code: null, ts: 0, scan: 0 }; }
  var S = blank();

  var NEXT = { detect: "currencies", currencies: "total", total: "converting", converting: "miles" };
  function hold() {
    var R = S.result;
    return { detect: Math.max(1, R.countries.length) * T.row + T.detectHold, currencies: R.groups.length * T.row + T.currenciesHold,
      total: T.totalHold, converting: T.converting }[S.phase];
  }
  function go(phase, patch) {
    clearTimers();
    if (patch) Object.assign(S, patch);
    S.phase = phase;
    render(); armIdle();
    if (NEXT[phase]) after("auto", hold(), advance);
  }
  function reset() { S = blank(); Tray.release(); go("start"); }
  function advance() {
    var next = NEXT[S.phase];
    if (!next) return;
    if (next === "total" && S.result.total <= 0) { SFX.wrong(); go("error", { error: { code: "no_value" } }); return; }
    (next === "miles" ? SFX.fanfare : SFX.tap)();
    go(next);
  }

  // What the analyzer found, grouped per currency in the order it was seen and valued in pesos.
  function value(coins) {
    var groups = [], by = {}, countries = [], seen = {}, total = 0;
    coins.forEach(function (c) {
      var known = c.currency !== "UNKNOWN" && c.value > 0, key = known ? c.currency : "UNKNOWN";
      if (known && c.country && !seen[c.country.toLowerCase()]) { seen[c.country.toLowerCase()] = 1; countries.push(c.country); }
      var g = by[key];
      if (!g) {
        g = by[key] = { code: key, n: 0, face: 0, php: null,
          status: key === "UNKNOWN" ? "unknown" : key === "PHP" ? "local" : C.currencies[key] ? "ok" : "norate" };
        groups.push(g);
      }
      g.n++; g.face = round2(g.face + c.value);
    });
    groups.forEach(function (g) { if (g.status === "ok") { g.php = round2(g.face * C.currencies[g.code].rate); total += g.php; } });
    total = round2(total);
    return { coins: coins, groups: groups, countries: countries, total: total,
      altitude: round2(total * (1 + X.altitudeFxFee)), other: round2(total * (1 + X.otherFxFee)), miles: round2(total / X.pesoPerMile) };
  }

  // ---------------------------------------------------------------- flow
  function start() {
    if (S.phase !== "start") return;
    if (!Tray.ready()) { nudge(); return; }
    SFX.ding();
    var shot = Tray.capture(), token = ++scans, t0 = now();
    Tray.freeze(shot); Tray.scanning(true);
    go("scanning", { scan: token });
    analyze(shot).then(function (out) {
      if (S.scan !== token || S.phase !== "scanning") return;
      after("scanned", Math.max(0, T.minScan - (now() - t0)), function () { scanned(out); });
    }, function (err) {
      if (S.scan !== token || S.phase !== "scanning") return;
      Tray.scanning(false); SFX.wrong();
      go("error", { error: err });
    });
  }
  function analyze(shot) {
    var ctrl = window.AbortController ? new AbortController() : null;
    var to = setTimeout(function () { if (ctrl) ctrl.abort(); }, T.analyzerTimeout);
    return fetch(X.analyzerUrl, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: shot.base64, mediaType: shot.mediaType }), signal: ctrl && ctrl.signal
    }).then(function (r) {
      clearTimeout(to);
      return r.json().catch(function () { return {}; }).then(function (body) {
        if (!r.ok) throw { code: body.code || "http_" + r.status, message: body.error || "" };
        return body;
      });
    }, function (e) {
      clearTimeout(to);
      throw { code: e && e.name === "AbortError" ? "timeout" : "offline", message: "" };
    });
  }
  function scanned(out) {
    Tray.scanning(false);
    var R = value(out.coins || []);
    R.notes = out.notes || ""; R.model = out.model || "";
    if (!R.coins.length) { SFX.wrong(); go("error", { error: { code: "no_coins", message: R.notes } }); return; }
    SFX.correct();
    go("detect", { result: R });
  }
  function redeem() {
    if (S.phase !== "miles") return;
    var R = S.result;
    S.code = Store.newCode(); S.ts = now();
    Store.add({ id: uid(), ts: S.ts, location: settings.location, code: S.code, coins: R.coins, countries: R.countries,
      groups: R.groups, total: R.total, altitude: R.altitude, other: R.other, miles: R.miles, model: R.model, notes: R.notes });
    Tray.release();
    go("receipt");
    SFX.printer();
    if (settings.autoPrint) after("print", 3000, printReceipt);
  }
  function printReceipt() {
    if (!S.code) return;
    var area = $("#print-area");
    area.innerHTML = slipHTML();
    $$(".qr", area).forEach(function (el) { drawQR(el, el.getAttribute("data-url")); });
    window.print();
  }
  function nudge() {
    var h = $("#hint", panel);
    if (h) { h.textContent = "Place your coins in the tray — or use a photo or the sample tray below"; h.classList.remove("nudge"); void h.offsetWidth; h.classList.add("nudge"); }
    var s = $("#sources"); s.classList.remove("nudge"); void s.offsetWidth; s.classList.add("nudge");
  }

  var idleT = 0;
  function armIdle() {
    clearTimeout(idleT);
    var secs = X.idleSeconds[S.phase];
    if (secs) idleT = setTimeout(reset, secs * 1000);
  }

  // ---------------------------------------------------------------- views
  var SPIN = '<svg class="spin" viewBox="0 0 100 100" aria-hidden="true"><defs><linearGradient id="cu" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f0b79b"/><stop offset="1" stop-color="#d4835f"/></linearGradient></defs>' +
    '<g fill="none" stroke="url(#cu)" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"><path d="M16 44a35 35 0 0 1 62-18"/><path d="M84 56a35 35 0 0 1-62 18"/>' +
    '<path d="M80 12v15h-15"/><path d="M20 88v-15h15"/></g></svg>';
  var HEAD = { detect: "DETECTING COINS FROM…", currencies: "CURRENCIES DETECTED" };
  var FRAMED = { detect: 1, currencies: 1, total: 1, miles: 1 };
  function applyLink(code) { var u = settings.applyUrl || C.brand.applyUrl; return u + (u.indexOf("?") >= 0 ? "&" : "?") + "ref=" + encodeURIComponent(code); }

  // Dot pitch so a line fits its bar: a dot-text is (6 × glyphs + 1.8) dots wide.
  function pitch(chars, width, max) { return Math.min(max, width / (6 * Math.max(1, chars) + 1.8)); }
  function dots(v, p, extra) { return '<dot-text unlit="0" style="--dot:' + p.toFixed(2) + 'px"' + (extra || "") + ' value="' + esc(v) + '"></dot-text>'; }
  function rows(n) { var row = n <= 7 ? 66 : Math.max(34, Math.floor((560 - (n - 1) * 10) / n)); return { row: row, gap: n <= 7 ? 17 : 10, dot: row * 0.074 }; }

  function detectView() {
    var list = S.result.countries.length ? S.result.countries.map(board) : ["UNIDENTIFIED"], m = rows(list.length);
    var p = Math.min.apply(null, list.map(function (c) { return pitch(c.length, 547, m.dot); }));
    return '<ol class="rows" style="--row:' + m.row + 'px;--gap:' + m.gap + 'px">' + list.map(function (c, i) {
      return '<li><span class="bar num">' + dots(String(i + 1), Math.min(m.dot, pitch(String(i + 1).length, 57, m.dot))) + '</span><span class="bar name">' + dots(c, p) + "</span></li>";
    }).join("") + "</ol>";
  }
  function currencyLine(g) {
    if (g.status === "ok") return [amount(g.code, g.face), "=", peso(g.php)];
    return [{ local: "NOT EXCHANGED", norate: "NO RATE YET", unknown: "NOT RECOGNIZED" }[g.status]];
  }
  function currenciesView() {
    var gs = S.result.groups, m = rows(gs.length);
    var lines = gs.map(currencyLine);
    var pCode = Math.min(m.dot, pitch(3, 263, m.dot));
    var pVal = Math.min.apply(null, lines.map(function (l) { return pitch(l.join("  ").length, 372, m.dot); }));
    return '<ol class="rows cur" style="--row:' + m.row + 'px;--gap:' + m.gap + 'px">' + gs.map(function (g, i) {
      var l = lines[i];
      return '<li><span class="bar code">' + dots(g.code === "UNKNOWN" ? "???" : g.code, pCode) + "</span>" +
        '<span class="bar val' + (l.length === 1 ? " note" : "") + '">' + l.map(function (part) { return dots(part, pVal); }).join("") + "</span></li>";
    }).join("") + "</ol>";
  }

  var V = {
    start: function () {
      return '<img class="wordmark" src="assets/wordmark.png" alt="Altitude Exchange">' +
        '<button class="ring-btn" data-action="start"><span class="cu">start</span></button>' +
        '<p class="hint" id="hint">Place your coins in the tray, then tap start</p>';
    },
    scanning: function () {
      return '<p class="big cu">Scanning</p><div class="progress"><i></i></div><p class="hint">The coin analyzer is reading your coins</p>';
    },
    detect: detectView,
    currencies: currenciesView,
    total: function () {
      var R = S.result, t = "₱ " + num(R.total, 2);
      return '<p class="title cu">TOTAL COIN VALUE</p><div class="bar screen">' + dots(t, pitch(t.length, 600, 12.5)) + "</div>" +
        '<div class="fx"><div class="fx-box alt"><span>UB ALTITUDE</span><b>' + pct(X.altitudeFxFee) + "</b></div>" +
        '<div class="fx-box other"><span>OTHER CONVERSION</span><b>' + pct(X.otherFxFee) + "</b></div></div>" +
        '<div class="fx-cap"><span>TOTAL WITH FX COST = ' + peso(R.altitude) + "</span><span>TOTAL WITH FX COST = " + peso(R.other) + "</span></div>";
    },
    converting: function () { return '<p class="big cu two">Converting into<br>Altitude miles</p>' + SPIN; },
    miles: function () {
      var m = num(S.result.miles, 2);
      return '<p class="title cu">YOUR TOTAL MILES</p><div class="bar screen">' + dots(m, pitch(m.length, 600, 13.5)) + "</div>" +
        '<button class="redeem" data-action="redeem"><span>Redeem</span></button>' +
        '<p class="fx-cap one">₱' + X.pesoPerMile + " = 1 UB MILES</p>";
    },
    error: function () {
      var e = S.error || {}, R = S.result, title, msg;
      if (e.code === "no_coins") { title = "No coins found"; msg = "Place your coins flat in the tray, face up, and try again."; }
      else if (e.code === "no_value") {
        title = "We can’t convert these";
        msg = R && R.groups.every(function (g) { return g.status === "local"; }) ? "Philippine peso coins stay with you — the exchange takes foreign coins."
          : "We couldn’t value these coins. Try spreading them out or turning them over.";
      }
      else if (e.code === "not_configured") { title = "Coin analyzer offline"; msg = "The kiosk’s coin analyzer isn’t set up yet. Please ask a UnionBank representative."; }
      else if (e.code === "busy") { title = "One moment"; msg = "The coin analyzer is busy. Try again in a few seconds."; }
      else if (e.code === "refusal" || e.code === "bad_request") { title = "Let’s try that again"; msg = "The coin analyzer couldn’t read that picture. Try again."; }
      else { title = "Can’t reach the analyzer"; msg = "Check the kiosk’s internet connection and try again."; }
      return '<p class="big cu small">' + title + '</p><p class="msg">' + esc(msg) + "</p>" +
        (e.message ? '<p class="hint detail">' + esc(e.message) + "</p>" : "") +
        '<button class="ring-btn" data-action="again"><span class="cu">try again</span></button>';
    }
  };

  // Guests applied for the card at the start (Step 1), so the receipt just carries their miles to the giveaway booth.
  function paperHTML() {
    return '<p class="p-label">UB Miles earned</p><p class="p-miles">' + num(S.result.miles, 2) + '</p><p class="p-unit">UB Miles</p><hr>' +
      '<p class="p-cta">Keep your UB Miles</p>' +
      '<p class="p-note">Show this receipt at the UnionBank booth to exchange your UB Miles for giveaway items.</p>';
  }
  function printerHTML() {
    return '<div class="bay"><i class="slot"></i><i class="oval"></i></div>' +
      '<div class="paper-wrap"><div class="paper">' + paperHTML() + "</div></div>" +
      '<button class="ring-btn light" data-action="done"><span>done</span></button>';
  }
  // The paper slip for an 80 mm receipt printer.
  function slipHTML() {
    var R = S.result, d = new Date(S.ts);
    return '<div class="slip"><p class="s-head">ALTITUDE EXCHANGE</p><p class="s-sub">' + esc(settings.location) + " &middot; " + d.toLocaleString("en-PH") + "</p>" +
      "<table>" + R.groups.map(function (g) {
        return "<tr><td>" + esc(g.code) + " &times;" + g.n + "</td><td>" + (g.status === "ok" ? esc(amount(g.code, g.face)) + "</td><td>" + peso(g.php) : "</td><td>&mdash;") + "</td></tr>";
      }).join("") + "</table>" +
      '<p class="s-row"><span>Total coin value</span><span>' + peso(R.total) + "</span></p>" +
      '<p class="s-row"><span>With FX cost (Altitude ' + pct(X.altitudeFxFee) + ")</span><span>" + peso(R.altitude) + "</span></p>" +
      paperHTML() + '<p class="p-note">' + esc(X.ratesNote) + ". Your coins stay yours.</p></div>";
  }

  // ---------------------------------------------------------------- render
  function render() {
    document.body.setAttribute("data-phase", S.phase);
    heading.textContent = HEAD[S.phase] || "";
    heading.hidden = !HEAD[S.phase];
    panel.className = "panel " + S.phase + (FRAMED[S.phase] ? " framed" : "");
    panel.innerHTML = S.phase === "receipt" ? "" : (V[S.phase] || V.start)();
    stage.classList.toggle("printing", S.phase === "receipt");
    printer.innerHTML = S.phase === "receipt" ? printerHTML() : "";
    $$(".qr", printer).forEach(function (el) { drawQR(el, el.getAttribute("data-url")); });
    // board rows flip in one after another, like an airport board
    $$(".rows li", panel).forEach(function (li, k) {
      after("row" + k, 120 + k * T.row, function () {
        li.classList.add("in");
        $$("dot-text", li).forEach(function (d) { d.reveal(d.getAttribute("value"), 700); });
        SFX.tick();
      });
    });
    $$(".bar.screen dot-text", panel).forEach(function (d) { d.reveal(d.getAttribute("value"), 1200); });
  }

  function drawQR(el, url) {
    if (!window.qrcode) { el.textContent = url; return; }
    try { var q = qrcode(0, "M"); q.addData(url); q.make(); el.innerHTML = q.createSvgTag({ cellSize: 4, margin: 2, scalable: true }); }
    catch (e) { el.textContent = url; }
  }

  // ---------------------------------------------------------------- tray sources
  var photoInput = $("#photo-input"), photoUrl = null;
  var sources = $("#sources"), floorMsg = $("#floor-msg");
  Tray.on(function (src, status) {
    $$("[data-src]", sources).forEach(function (b) { b.classList.toggle("on", b.getAttribute("data-src") === src); });
    floorMsg.textContent = src === "none" ? status : "";
    $("#cam-status", sources).textContent = src === "camera" ? "Camera on" : "Camera";
  });
  sources.addEventListener("click", function (e) {
    var b = e.target.closest("[data-src]");
    if (!b || (S.phase !== "start" && S.phase !== "error")) return;
    SFX.unlock();
    var src = b.getAttribute("data-src");
    if (S.phase === "error") reset();
    if (src === "camera") Tray.useCamera(settings.cameraId);
    else if (src === "photo") photoInput.click();
    else if (src === "sample") Tray.useImage("assets/sample-tray.jpg", "sample");
  });
  photoInput.addEventListener("change", function () {
    var f = photoInput.files && photoInput.files[0];
    if (!f) return;
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    photoUrl = URL.createObjectURL(f);
    Tray.useImage(photoUrl, "photo");
    photoInput.value = "";
  });

  // ---------------------------------------------------------------- input
  stage.addEventListener("click", function (e) {
    SFX.unlock();
    var btn = e.target.closest("[data-action]");
    if (btn) {
      switch (btn.getAttribute("data-action")) {
        case "start": start(); break;
        case "redeem": redeem(); break;
        case "again": SFX.tap(); reset(); break;
        case "done": SFX.chime(); reset(); break;
      }
      return;
    }
    if (NEXT[S.phase] && e.target.closest("#panel")) advance();       // tap the board to move on
  });
  document.addEventListener("pointerdown", function () { armIdle(); }, true);

  document.addEventListener("keydown", function (e) {
    if (e.target && /^(input|textarea|select|button)$/i.test(e.target.tagName)) return;   // a focused button handles its own Enter
    if (document.querySelector("dialog[open]")) return;
    var k = e.key;
    if (k === "Escape") { reset(); return; }
    if (k === "s" || k === "S") { e.preventDefault(); openSettings(); return; }   // keep the "s" out of the panel's first field
    if (k === "Enter" || k === " ") {
      e.preventDefault(); SFX.unlock();
      if (S.phase === "start") start();
      else if (NEXT[S.phase]) advance();
      else if (S.phase === "miles") redeem();
      else if (S.phase === "receipt" || S.phase === "error") reset();
    }
  });

  // five taps in the top-left corner open the operator panel (touch screens without a keyboard)
  var taps = [];
  document.addEventListener("pointerdown", function (e) {
    if (e.clientX < 90 && e.clientY < 90) {
      var t = now(); taps = taps.filter(function (x) { return t - x < 2500; }); taps.push(t);
      if (taps.length >= 5) { taps = []; openSettings(); }
    }
  });

  // ---------------------------------------------------------------- operator panel
  var dlg = $("#settings");
  function openSettings() {
    if (!dlg || dlg.open) return;
    settings = Store.settings();
    $("#set-location").value = settings.location || "";
    $("#set-url").value = settings.applyUrl || "";
    $("#set-sound").checked = settings.sound !== false;
    $("#set-print").checked = !!settings.autoPrint;
    var st = Store.stats();
    $("#set-stats").textContent = st.exchanges + (st.exchanges === 1 ? " exchange · " : " exchanges · ") + st.coins + " coins · " +
      peso(st.total) + " · " + num(st.miles, 2) + " UB Miles, stored on this kiosk";
    $("#set-test-out").textContent = "";
    var sel = $("#set-camera");
    Tray.cameras().then(function (cams) {
      sel.innerHTML = '<option value="">Default camera</option>' + cams.map(function (c, i) {
        return '<option value="' + esc(c.deviceId) + '">' + esc(c.label || "Camera " + (i + 1)) + "</option>";
      }).join("");
      sel.value = settings.cameraId || "";
    });
    dlg.showModal();
  }
  function testAnalyzer() {
    var out = $("#set-test-out"), img = new Image(), t0 = now();
    out.textContent = "Sending the sample tray to the coin analyzer…";
    img.onload = function () {
      var cv = document.createElement("canvas");
      cv.width = img.naturalWidth; cv.height = img.naturalHeight;
      cv.getContext("2d").drawImage(img, 0, 0);
      var url = cv.toDataURL("image/jpeg", X.imageQuality);
      analyze({ base64: url.slice(url.indexOf(",") + 1), mediaType: "image/jpeg" }).then(function (r) {
        var R = value(r.coins || []);
        out.textContent = "OK in " + ((now() - t0) / 1000).toFixed(1) + " s · " + R.coins.length + " coins from " + R.countries.join(", ") + " · " + peso(R.total) + " · " + r.model;
      }, function (err) { out.textContent = "Failed: " + err.code + (err.message ? " — " + err.message : ""); });
    };
    img.src = "assets/sample-tray.jpg";
  }
  dlg.addEventListener("click", function (e) {
    var act = e.target.getAttribute("data-set");
    if (!act) return;
    switch (act) {
      case "save":
        var cam = $("#set-camera").value, camChanged = cam !== (settings.cameraId || "");
        settings = Store.saveSettings({
          location: $("#set-location").value.trim() || C.brand.location,
          applyUrl: $("#set-url").value.trim() || C.brand.applyUrl,
          sound: $("#set-sound").checked, autoPrint: $("#set-print").checked, cameraId: cam
        });
        dlg.close();
        if (camChanged || Tray.source() === "camera") Tray.useCamera(settings.cameraId);
        break;
      case "test": testAnalyzer(); break;
      case "csv": Store.download(); break;
      case "clear": if (confirm("Clear all exchange records stored on this kiosk?")) { Store.clear(); dlg.close(); openSettings(); } break;
      case "reset": dlg.close(); reset(); break;
      case "close": dlg.close(); break;
    }
  });

  // ---------------------------------------------------------------- boot
  render();
  Tray.useCamera(settings.cameraId);
  window.EXCHANGE = { state: function () { return S; }, value: value };
})();
