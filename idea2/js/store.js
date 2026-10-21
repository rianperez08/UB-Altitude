/* Store — exchange log and operator settings for the Altitude Exchange kiosk (localStorage on the kiosk). */
(function () {
  "use strict";
  var C = window.EXCHANGE_CONFIG;
  var K = { sessions: "exchange.scans", settings: "exchange.settings" };   // "exchange.sessions" held the first, simulated build's log

  function read(k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function write(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function rnd(n, chars) { var s = ""; for (var i = 0; i < n; i++) s += chars[Math.floor(Math.random() * chars.length)]; return s; }

  var DEFAULTS = {
    sound: true,
    autoPrint: false,      // print a paper receipt when the code is issued (receipt printer on the kiosk)
    cameraId: "",          // "" = the default camera (the rear one on phones and tablets)
    location: C.brand.location,
    applyUrl: C.brand.applyUrl
  };

  var Store = {
    settings: function () { return Object.assign({}, DEFAULTS, read(K.settings, {})); },
    saveSettings: function (patch) { var s = Object.assign(this.settings(), patch || {}); write(K.settings, s); return s; },

    sessions: function () { return read(K.sessions, []); },
    add: function (session) { var ss = this.sessions(); ss.push(session); write(K.sessions, ss); },
    clear: function () { write(K.sessions, []); },
    stats: function () {
      var t = { exchanges: 0, coins: 0, miles: 0, total: 0 };
      this.sessions().forEach(function (s) { t.exchanges++; t.coins += s.coins.length; t.miles += s.miles; t.total += s.total; });
      return t;
    },

    // Redemption code in the deck's receipt format: 12 letters and digits (e.g. 7F3K9D2M8Q6V), unique on this kiosk.
    newCode: function () {
      var used = {};
      this.sessions().forEach(function (s) { used[s.code] = 1; });
      var code;
      do { code = rnd(12, "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"); } while (used[code]);
      return code;
    },

    csv: function () {
      var head = ["session", "timestamp", "location", "redemption_code", "coins", "countries", "currencies", "total_php",
        "altitude_with_fx", "other_with_fx", "ub_miles", "breakdown", "analyzer_model", "analyzer_notes"];
      var lines = [head.join(",")];
      var q = function (v) { v = v == null ? "" : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
      this.sessions().forEach(function (s) {
        lines.push([s.id, new Date(s.ts).toISOString(), s.location, s.code, s.coins.length, s.countries.join("; "),
          s.groups.map(function (g) { return g.code; }).join(" "), s.total, s.altitude, s.other, s.miles,
          s.groups.map(function (g) { return g.code + " " + g.face + " (" + g.n + " coins) = PHP " + (g.php == null ? "n/a" : g.php); }).join("; "),
          s.model, s.notes].map(q).join(","));
      });
      return lines.join("\n");
    },
    download: function () {
      var blob = new Blob([this.csv()], { type: "text/csv" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "altitude-exchange-" + new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-") + ".csv";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
    }
  };
  window.Store = Store;
})();
