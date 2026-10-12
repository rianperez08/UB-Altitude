/* Store — leaderboard, session log and operator settings (localStorage on the host screen).
 * Results are also broadcast on BUS so leaderboard screens on other PCs get them. */
(function () {
  "use strict";
  var C = window.ALTITUDE_CONFIG;
  var K = { lb: "altitude.leaderboard", sessions: "altitude.sessions", settings: "altitude.settings" };

  function read(k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function write(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function rnd(n, chars) { var s = ""; for (var i = 0; i < n; i++) s += chars[Math.floor(Math.random() * chars.length)]; return s; }

  var DEFAULTS = {
    roundSeconds: C.game.roundSeconds,
    preview: true,        // show the plane-window preview beside the IFE screen (single-screen setups / testing)
    sound: true,
    applyUrl: C.brand.applyUrl
  };

  var Store = {
    settings: function () { return Object.assign({}, DEFAULTS, read(K.settings, {})); },
    saveSettings: function (patch) {
      var s = Object.assign(this.settings(), patch || {});
      write(K.settings, s);
      BUS.emit({ type: "settings", settings: s });
      return s;
    },

    leaderboard: function (limit) {
      var rows = read(K.lb, []).slice().sort(function (a, b) { return (b.miles - a.miles) || (a.ts - b.ts); });
      return limit ? rows.slice(0, limit) : rows;
    },
    sessions: function () { return read(K.sessions, []); },

    addResults: function (session) {
      var lb = read(K.lb, []);
      session.players.forEach(function (p) {
        lb.push({ name: p.name, miles: p.miles, correct: p.correct, code: p.code, ts: session.ts, session: session.id, mode: session.mode });
      });
      write(K.lb, lb);
      var ss = read(K.sessions, []); ss.push(session); write(K.sessions, ss);
      this.broadcast();
    },
    broadcast: function () { BUS.emit({ type: "leaderboard", rows: this.leaderboard(C.game.leaderboardSize) }); },

    clear: function () { write(K.lb, []); write(K.sessions, []); this.broadcast(); },
    seedDemo: function () {
      var lb = read(K.lb, []), now = Date.now();
      C.demoLeaderboard.forEach(function (row, i) {
        lb.push({ name: row[0], miles: row[1], correct: Math.min(C.game.rounds, Math.round(row[1] / (C.game.milesPerCorrect + C.game.speedBonusMax))), code: "DEMO", ts: now - (i + 1) * 60000, session: "demo", mode: "solo" });
      });
      write(K.lb, lb);
      this.broadcast();
    },

    // Referral code in the deck's format: 4 digits, 3 letters, 3 digits (e.g. 1325XRZ512). Unique per device.
    newCode: function () {
      var used = {}; read(K.lb, []).forEach(function (r) { used[r.code] = 1; });
      var code;
      do { code = rnd(4, "0123456789") + rnd(3, "ABCDEFGHJKLMNPQRSTUVWXYZ") + rnd(3, "0123456789"); } while (used[code]);
      return code;
    },

    csv: function () {
      var head = ["session", "timestamp", "mode", "seat", "name", "correct", "miles", "peso_equivalent", "referral_code"];
      for (var r = 1; r <= C.game.rounds; r++) head.push("r" + r + "_city", "r" + r + "_picked", "r" + r + "_correct", "r" + r + "_ms", "r" + r + "_miles");
      var lines = [head.join(",")];
      var q = function (v) { v = v == null ? "" : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
      this.sessions().forEach(function (s) {
        s.players.forEach(function (p) {
          var row = [s.id, new Date(s.ts).toISOString(), s.mode, p.seat, p.name, p.correct, p.miles, p.miles * C.game.pesoPerMile, p.code];
          for (var r = 0; r < C.game.rounds; r++) {
            var a = (p.answers || [])[r] || {};
            row.push(a.city || "", a.picked || "", a.correct ? 1 : 0, a.ms == null ? "" : a.ms, a.miles || 0);
          }
          lines.push(row.map(q).join(","));
        });
      });
      return lines.join("\n");
    },
    download: function () {
      var blob = new Blob([this.csv()], { type: "text/csv" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "altitude-test-" + new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-") + ".csv";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
    }
  };
  window.Store = Store;
})();
